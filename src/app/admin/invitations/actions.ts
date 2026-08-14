// src/app/admin/invitations/actions.ts
'use server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'
import { logAdminAction } from '@/lib/admin/log'
import { revalidateInvitation } from '@/lib/admin/revalidate'
import { resolvePlan } from '@/lib/payments/plans'
import { BLOCK_SIZE, QUOTA_CAP, clampQuotaExtra, DEFAULT_BASE_QUOTA } from '@/lib/payments/quota'
import { buildSeedConfig, validateSlug } from '@/lib/onboarding/seed-config'
import { isValidTemplate, getDefaultConfig, DEFAULT_TEMPLATE_ID } from '@/config/templateIndex'
import { isPaletteAllowedForTemplate, isOrnamentAllowedForTemplate } from '@/lib/templates/appearance'
import { sendAdminEmail } from '@/lib/email/send'
import { siteBaseUrl } from '@/lib/site-url'
import { compExpiry, type CompPeriod } from './period'
import { deletePrefix } from '@/lib/upload/r2'

type Result = { ok: boolean; error?: string }

/** Sanity cap for an operator-entered offline amount (a wedding invite is ~Rp
 *  100–500k) — blocks a fat-fingered extra zero from inflating revenue. */
const MAX_MANUAL_AMOUNT_IDR = 100_000_000
const clampAmount = (n: number) => Math.min(MAX_MANUAL_AMOUNT_IDR, Math.max(0, Math.round(n || 0)))

async function guard(): Promise<{ email: string } | null> {
  try { return await requireAdmin() } catch { return null }
}

/** Mark an invitation paid without Midtrans (offline/manual money, or a free comp). */
export async function adminComp(id: string, opts: { source: 'manual' | 'comp'; amountIDR: number; period: CompPeriod }): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { data: inv } = (await db.from('invitations').select('id, plan, template_id, suspended_at').eq('id', id).maybeSingle()) as { data: { plan: string; template_id: string; suspended_at: string | null } | null }
  if (!inv) return { ok: false, error: 'Undangan tidak ditemukan' }
  const resolved = await resolvePlan(inv.template_id, inv.plan)
  const nowMs = Date.now()
  const expires = compExpiry(resolved ? resolved.expiresAt(nowMs) : null, opts.period, nowMs)
  // A suspended (taken-down) invitation must NOT auto-publish when comped.
  const { error } = await (db.from('invitations') as any).update({
    is_paid: true, is_published: !inv.suspended_at, paid_at: new Date(nowMs).toISOString(),
    expires_at: expires, paid_source: opts.source, paid_amount_idr: opts.source === 'comp' ? 0 : clampAmount(opts.amountIDR),
  }).eq('id', id)
  if (error) return { ok: false, error: 'Gagal menyimpan' }
  await logAdminAction(admin.email, { action: 'invitation.comp', targetType: 'invitation', targetId: id, meta: { source: opts.source } })
  revalidateInvitation()
  return { ok: true }
}

export async function adminSetPublished(id: string, published: boolean): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  // Suspend beats publish: a taken-down invitation can't be re-published (by
  // admin OR owner) until it's un-suspended first.
  if (published) {
    const { data: inv } = (await db.from('invitations').select('suspended_at').eq('id', id).maybeSingle()) as { data: { suspended_at: string | null } | null }
    if (inv?.suspended_at) return { ok: false, error: 'Undangan sedang diblokir (suspend). Buka blokir dulu sebelum menerbitkan.' }
  }
  const { error } = await (db.from('invitations') as any).update({ is_published: published }).eq('id', id)
  if (error) return { ok: false, error: 'Gagal menyimpan' }
  await logAdminAction(admin.email, { action: published ? 'invitation.publish' : 'invitation.unpublish', targetType: 'invitation', targetId: id })
  revalidateInvitation()
  return { ok: true }
}

export async function adminChangePlan(id: string, plan: string): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  if (!plan.trim()) return { ok: false, error: 'Plan wajib' }
  const db = createSupabaseAdminClient()
  // Reject an unknown plan for this template (a bad string would silently break
  // the invitation's pricing/quota/guestbook resolution downstream).
  const { data: inv } = (await db.from('invitations').select('template_id').eq('id', id).maybeSingle()) as { data: { template_id: string | null } | null }
  if (!inv) return { ok: false, error: 'Undangan tidak ditemukan' }
  if (!(await resolvePlan(inv.template_id ?? '', plan))) return { ok: false, error: `Plan "${plan}" tidak dikenal untuk template ini` }
  const { error } = await (db.from('invitations') as any).update({ plan }).eq('id', id)
  if (error) return { ok: false, error: 'Gagal menyimpan' }
  await logAdminAction(admin.email, { action: 'invitation.change_plan', targetType: 'invitation', targetId: id, meta: { plan } })
  revalidateInvitation()
  return { ok: true }
}

/**
 * Set palette and/or ornament for ANY invitation (operator helping a client
 * pick, or fixing a confused couple's choice) — the same `config.theme`
 * fields the owner's own Palette/Ornament tabs write, validated against the
 * registry for the invitation's template. Deliberately NOT ownership-scoped
 * and deliberately NOT a lock: the couple can still change it back afterwards,
 * so there's no new column and no read-only state to explain to a client.
 */
export async function adminSetAppearance(
  id: string,
  opts: { palette?: string; ornamentType?: string },
): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const hasPalette = typeof opts.palette === 'string'
  const hasOrnament = typeof opts.ornamentType === 'string'
  if (!hasPalette && !hasOrnament) return { ok: false, error: 'Tidak ada yang diubah' }

  const db = createSupabaseAdminClient()
  const { data: row, error: fetchErr } = await (db.from('invitations') as any)
    .select('config, template_id').eq('id', id).maybeSingle()
  if (fetchErr || !row) return { ok: false, error: 'Undangan tidak ditemukan' }

  if (hasPalette && !isPaletteAllowedForTemplate(row.template_id, opts.palette!)) {
    return { ok: false, error: 'Palet tidak valid untuk template ini' }
  }
  if (hasOrnament && !isOrnamentAllowedForTemplate(row.template_id, opts.ornamentType!)) {
    return { ok: false, error: 'Ornamen tidak valid untuk template ini' }
  }

  // Read-merge-write — same shape as the owner theme route — so no sibling
  // config key (sections, meta, music, couple, …) is ever lost.
  const cfg = { ...(row.config || {}) }
  cfg.theme = { ...(cfg.theme || {}) }
  if (hasPalette) cfg.theme.defaultPalette = opts.palette
  if (hasOrnament) cfg.theme.ornamentType = opts.ornamentType

  const { error } = await (db.from('invitations') as any)
    .update({ config: cfg, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, error: 'Gagal menyimpan' }

  await logAdminAction(admin.email, {
    action: 'invitation.set_appearance', targetType: 'invitation', targetId: id,
    meta: { palette: opts.palette, ornamentType: opts.ornamentType },
  })
  revalidateInvitation()
  return { ok: true }
}

/** Grant extra guest quota for free (multiple of BLOCK_SIZE, within cap). */
export async function adminAddQuota(id: string, qtyGuests: number): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const qty = Math.round(qtyGuests)
  if (qty <= 0 || qty % BLOCK_SIZE !== 0 || qty > QUOTA_CAP) return { ok: false, error: `Kelipatan ${BLOCK_SIZE}, maksimal ${QUOTA_CAP}` }
  const db = createSupabaseAdminClient()
  await (db as any).rpc('increment_guest_quota_extra', { p_invitation_id: id, p_qty: qty })
  await logAdminAction(admin.email, { action: 'invitation.add_quota', targetType: 'invitation', targetId: id, meta: { qty } })
  revalidateInvitation()
  return { ok: true }
}

/**
 * Suspend (hard takedown) or lift it. Suspending sets `suspended_at` AND forces
 * `is_published = false`; the public page + the owner's own re-publish path both
 * honour `suspended_at`, so — unlike a soft unpublish the couple could undo —
 * this stays down until an admin lifts it.
 */
export async function adminSuspend(id: string, on: boolean, reason?: string): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const patch = on
    ? { suspended_at: new Date().toISOString(), is_published: false }
    : { suspended_at: null }
  const { error } = await (db.from('invitations') as any).update(patch).eq('id', id)
  if (error) return { ok: false, error: 'Gagal menyimpan' }
  await logAdminAction(admin.email, {
    action: on ? 'invitation.suspend' : 'invitation.unsuspend',
    targetType: 'invitation', targetId: id,
    meta: on && reason ? { reason } : undefined,
  })
  revalidateInvitation()
  return { ok: true }
}

/**
 * Archive / unarchive a PAID invitation. A paid invitation can't be hard-deleted
 * (its payment history has to survive for bookkeeping), so "delete" on a paid one
 * sets `archived_at` — hidden from the default admin list, row + records kept.
 */
export async function adminArchiveInvitation(id: string, on: boolean): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { error } = await (db.from('invitations') as any)
    .update({ archived_at: on ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) return { ok: false, error: 'Gagal menyimpan' }
  await logAdminAction(admin.email, {
    action: on ? 'invitation.archive' : 'invitation.unarchive',
    targetType: 'invitation', targetId: id,
  })
  revalidateInvitation()
  return { ok: true }
}

/**
 * Hard-delete an UNPAID draft. Irreversible, so the caller must pass the exact
 * slug to confirm. Removes `invitation-media/<id>/` files FIRST (storage does
 * not cascade), then deletes the row (child rows cascade off invitation_id).
 * Never touches the auth user (they may own other invitations). A PAID
 * invitation is refused here — archive it instead.
 */
export async function adminDeleteInvitation(id: string, confirmSlug: string): Promise<Result> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { data: inv } = (await db.from('invitations').select('id, slug, is_paid').eq('id', id).maybeSingle()) as { data: { id: string; slug: string; is_paid: boolean } | null }
  if (!inv) return { ok: false, error: 'Undangan tidak ditemukan' }
  if (inv.is_paid) return { ok: false, error: 'Undangan berbayar tidak bisa dihapus — arsipkan saja (riwayat pembayaran harus disimpan).' }
  if ((confirmSlug || '').trim() !== inv.slug) return { ok: false, error: 'Ketik slug persis untuk konfirmasi hapus.' }
  // Storage first — objects under invitation-media/<id>/ don't cascade off the
  // row. R2 is the only store; the Supabase bucket was emptied after every
  // object was verified present in R2, and nothing writes there any more.
  // Best-effort: a storage blip must not block deleting the row, and anything
  // left behind is still findable via scripts/purge-orphan-media.mjs.
  try {
    await deletePrefix(`${id}/`)
  } catch (e) {
    console.error(`[admin/delete] R2 media cleanup failed for ${id}:`, e)
  }
  const { error } = await (db.from('invitations') as any).delete().eq('id', id)
  if (error) return { ok: false, error: 'Gagal menghapus' }
  await logAdminAction(admin.email, { action: 'invitation.delete', targetType: 'invitation', targetId: id, meta: { slug: inv.slug } })
  revalidateInvitation()
  return { ok: true }
}

export interface CreateForClientInput {
  template: string
  plan: string
  guestQuotaExtra?: number
  brideName: string
  groomName: string
  weddingDate: string
  venue: string
  slug: string
  clientEmail: string
  markPaid?: { source: 'manual' | 'comp'; amountIDR: number; period: CompPeriod }
  /** Operator-picked appearance, seeded into config.theme before insert. */
  palette?: string
  ornamentType?: string
}

export interface CreateForClientResult {
  ok: boolean
  error?: string
  invitationId?: string
  slug?: string
  createdUser?: boolean
  /** 6-digit set-password code for a NEW account (feeds the existing /reset-password flow). */
  resetOtp?: string | null
  resetUrl?: string
  clientEmail?: string
  emailSent?: boolean
}

/** Scan the auth users for one matching `email` (case-insensitive). MVP: first
 *  page only (perPage 1000) — revisit with a filtered lookup past one page. */
async function findAuthUserByEmail(db: any, email: string): Promise<any | null> {
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const target = email.toLowerCase()
  return (data?.users || []).find((u: any) => u.email?.toLowerCase() === target) || null
}

/**
 * Provision an invitation FOR a client — the client ALWAYS owns it (self-serve
 * model). Looks up the client by email; creates a confirmed auth account if none
 * exists; builds the seeded config; inserts the invitation owned by the client;
 * optionally marks it paid now (comp / manual offline money). For a NEW account
 * it returns a 6-digit set-password code that feeds the existing token-based
 * /reset-password page (and best-effort emails it). Rolls back a just-created
 * user if the invitation insert fails, so a failure never leaves an orphan account.
 */
export async function adminCreateInvitationForClient(input: CreateForClientInput): Promise<CreateForClientResult> {
  const admin = await guard(); if (!admin) return { ok: false, error: 'Akses ditolak' }

  // 1. Validate inputs (mirror onboarding).
  let slug: string
  try { slug = validateSlug(input.slug) } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Slug tidak valid' } }
  const template = isValidTemplate(input.template) ? input.template : DEFAULT_TEMPLATE_ID
  const brideName = (input.brideName || '').trim()
  const groomName = (input.groomName || '').trim()
  const venue = (input.venue || '').trim()
  const clientEmail = (input.clientEmail || '').trim().toLowerCase()
  if (!brideName || !groomName) return { ok: false, error: 'Nama pengantin wajib diisi' }
  if (!venue) return { ok: false, error: 'Lokasi acara wajib diisi' }
  if (!input.weddingDate || isNaN(Date.parse(input.weddingDate))) return { ok: false, error: 'Tanggal acara tidak valid' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientEmail)) return { ok: false, error: 'Email klien tidak valid' }
  if (input.palette && !isPaletteAllowedForTemplate(template, input.palette)) {
    return { ok: false, error: 'Palet tidak valid untuk template ini' }
  }
  if (input.ornamentType && !isOrnamentAllowedForTemplate(template, input.ornamentType)) {
    return { ok: false, error: 'Ornamen tidak valid untuk template ini' }
  }

  const db = createSupabaseAdminClient()

  // 2. Resolve plan + clamp quota against the plan base.
  const plan = (await resolvePlan(template, input.plan)) ? input.plan : 'basic'
  const baseForPlan = DEFAULT_BASE_QUOTA[plan] ?? 400
  const guestQuotaExtra = clampQuotaExtra(baseForPlan, Number(input.guestQuotaExtra ?? 0))

  // 3. Slug availability.
  const { data: taken } = (await db.from('invitations').select('id').eq('slug', slug).maybeSingle()) as { data: { id: string } | null }
  if (taken) return { ok: false, error: 'Slug sudah dipakai. Pilih yang lain.' }

  // 4. Find or create the client's auth user (email pre-confirmed).
  let user = await findAuthUserByEmail(db, clientEmail)
  let createdUser = false
  if (!user) {
    const { data: created, error: cErr } = await (db as any).auth.admin.createUser({ email: clientEmail, email_confirm: true })
    if (cErr || !created?.user) return { ok: false, error: `Gagal membuat akun klien: ${cErr?.message || 'tidak diketahui'}` }
    user = created.user
    createdUser = true
  }

  // 5. Build the seeded config + insert the invitation (owned by the client).
  // `getDefaultConfig` returns the template's SHARED module-level object for
  // every non-Lovebirds template (buildSeedConfig already deep-clones its
  // own) — clone before merging the operator's palette/ornament choice into
  // config.theme, or writing into it would corrupt the default for every
  // future invitation created from this template.
  const baseConfig = template === 'lovebirds'
    ? buildSeedConfig({ brideName, groomName, weddingDate: input.weddingDate, venue })
    : getDefaultConfig(template)
  const config = { ...baseConfig, theme: { ...(baseConfig.theme || {}) } }
  if (input.palette) config.theme.defaultPalette = input.palette
  if (input.ornamentType) config.theme.ornamentType = input.ornamentType

  const { data: inserted, error: insErr } = await (db.from('invitations') as any)
    .insert({
      slug, owner_user_id: user.id, email: clientEmail,
      password_hash: 'supabase-auth-migrated',
      plan, template_id: template, is_paid: false, is_published: false,
      guest_quota_extra: guestQuotaExtra, config,
    })
    .select('id')
    .single()
  if (insErr || !inserted) {
    // Roll back a just-created user so a failed insert leaves no orphan account.
    if (createdUser) { try { await (db as any).auth.admin.deleteUser(user.id) } catch {} }
    return { ok: false, error: 'Gagal menyimpan undangan. Coba lagi.' }
  }
  const invitationId = (inserted as { id: string }).id

  // 6. Optional: mark paid now (comp / manual offline money), mirroring adminComp.
  if (input.markPaid) {
    const resolved = await resolvePlan(template, plan)
    const nowMs = Date.now()
    const expires = compExpiry(resolved ? resolved.expiresAt(nowMs) : null, input.markPaid.period, nowMs)
    await (db.from('invitations') as any).update({
      is_paid: true, is_published: true, paid_at: new Date(nowMs).toISOString(),
      expires_at: expires, paid_source: input.markPaid.source,
      paid_amount_idr: input.markPaid.source === 'comp' ? 0 : clampAmount(input.markPaid.amountIDR),
    }).eq('id', invitationId)
  }

  // 7. New account → generate a set-password code (feeds /reset-password). Email
  //    it best-effort, but ALWAYS return the code so the operator can relay it
  //    (Resend domain may be unverified). Existing accounts keep their password.
  let resetOtp: string | null = null
  let emailSent = false
  const resetUrl = `${siteBaseUrl()}/reset-password?email=${encodeURIComponent(clientEmail)}`
  if (createdUser) {
    try {
      const { data: link } = await (db as any).auth.admin.generateLink({ type: 'recovery', email: clientEmail })
      resetOtp = link?.properties?.email_otp ?? null
    } catch { /* operator can fall back to /forgot-password */ }
    if (resetOtp) {
      emailSent = await sendAdminEmail({
        to: clientEmail,
        subject: 'Undangan FinCards kamu sudah dibuat — atur password',
        html: `<p>Halo,</p><p>Undangan <strong>${slug}</strong> sudah dibuatkan untukmu. Untuk masuk & mengeditnya, atur password dulu:</p><ol><li>Buka <a href="${resetUrl}">${resetUrl}</a></li><li>Masukkan email ini + kode <strong>${resetOtp}</strong></li><li>Buat password baru</li></ol><p>Setelah itu kamu bisa langsung membuka dashboard undanganmu. Terima kasih!</p>`,
      })
    }
  }

  await logAdminAction(admin.email, {
    action: 'invitation.create_for_client', targetType: 'invitation', targetId: invitationId,
    meta: { slug, template, plan, createdUser, markPaid: input.markPaid?.source ?? null },
  })
  revalidateInvitation()
  return { ok: true, invitationId, slug, createdUser, resetOtp, resetUrl, clientEmail, emailSent }
}
