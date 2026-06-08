'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { buildSeedConfig, validateSlug } from '@/lib/onboarding/seed-config'
import { isValidTemplate, getDefaultConfig, DEFAULT_TEMPLATE_ID } from '@/config/templateIndex'
import { resolvePlan, resolveUpgrade } from '@/lib/payments/plans'
import { createXenditInvoice, getXenditInvoice, isPaidStatus } from '@/lib/payments/xendit'
import { publishPaidInvitation, applyPaidUpgrade } from '@/lib/payments/publish'
import { rateLimit } from '@/lib/security/rate-limit'

/** Max unpaid draft invitations a single account may stack up (anti-abuse). */
const MAX_UNPAID_DRAFTS = 10

export interface OnboardingInput {
  slug: string
  template: string
  plan: string
  brideName: string
  groomName: string
  weddingDate: string // ISO datetime e.g. "2026-11-15T16:00:00"
  venue: string
}

export interface OnboardingResult {
  ok: boolean
  slug?: string
  invitationId?: string
  publicUrl?: string
  dashboardUrl?: string
  error?: string
}

/**
 * Create the invitation row for the currently-authenticated user.
 *
 *   - Validates the slug format (3–40 chars, lowercase + digits + hyphens).
 *   - Checks slug availability (rejects if taken by another invitation).
 *   - Caps how many UNPAID drafts one account may stack up (anti-abuse).
 *   - Builds the full 14-section config with the couple's data substituted.
 *   - Inserts the row as an unpaid draft (is_paid=false, is_published=false);
 *     payment publishes it via the Xendit webhook.
 *
 * Returns a structured result object (not throws) so the client UI can
 * display the exact error message — Next.js sanitizes thrown errors in
 * production-like builds, masking the actual cause.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  try {
    // 1. Require an authenticated session.
    const server = createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Tidak ada sesi login — silakan daftar ulang' }

    // 2. Validate inputs.
    let slug: string
    try {
      slug = validateSlug(input.slug)
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Slug tidak valid' }
    }
    const template = isValidTemplate(input.template) ? input.template : DEFAULT_TEMPLATE_ID
    const brideName = input.brideName.trim()
    const groomName = input.groomName.trim()
    const venue = input.venue.trim()
    if (!brideName || !groomName) return { ok: false, error: 'Nama pengantin wajib diisi' }
    if (!venue) return { ok: false, error: 'Lokasi acara wajib diisi' }
    if (!input.weddingDate) return { ok: false, error: 'Tanggal acara wajib diisi' }
    const dateMs = Date.parse(input.weddingDate)
    if (isNaN(dateMs)) return { ok: false, error: 'Tanggal acara tidak valid' }

    // 3. Validate the chosen plan against the template's DB-backed plans
    //    (defaults to 'basic' when missing/invalid).
    const plan = (await resolvePlan(template, input.plan)) ? input.plan : 'basic'

    const admin = createSupabaseAdminClient()

    // 4. Slug availability check. (One account may own many invitations, so
    //    there is no per-user uniqueness check — only slug uniqueness.)
    const { data: taken } = (await admin
      .from('invitations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()) as { data: { id: string } | null }
    if (taken) return { ok: false, error: 'Slug sudah dipakai. Pilih yang lain.' }

    // 4b. Anti-abuse: cap how many UNPAID drafts one account can stack up, so a
    //     single user can't squat slugs / bloat the table with free draft rows.
    const { count: draftCount } = await (admin.from('invitations') as any)
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', user.id)
      .eq('is_paid', false)
    if ((draftCount ?? 0) >= MAX_UNPAID_DRAFTS) {
      return {
        ok: false,
        error: `Kamu punya ${draftCount} undangan yang belum dibayar. Selesaikan pembayaran atau hapus salah satunya dulu sebelum membuat yang baru.`,
      }
    }

    // 5. Build the seeded config. Lovebirds substitutes the couple's data
    //    into its 14-section cinematic config; other templates seed from
    //    their bundled defaultConfig (couple edits content in the dashboard).
    const config =
      template === 'lovebirds'
        ? buildSeedConfig({
            brideName,
            groomName,
            weddingDate: input.weddingDate,
            venue,
          })
        : getDefaultConfig(template)

    // 6. Insert as an UNPAID DRAFT (is_paid=false, is_published=false). Payment
    //    publishes it via the Xendit webhook. Legacy NOT NULL columns (from the
    //    bcrypt-era schema) are set the same way scripts/create-invitation.mjs does.
    const { data: inserted, error } = await (admin.from('invitations') as any)
      .insert({
        slug,
        owner_user_id: user.id,
        email: user.email,
        password_hash: 'supabase-auth-migrated',
        plan,
        template_id: template,
        is_paid: false,
        is_published: false,
        config,
      })
      .select('id')
      .single()
    if (error) {
      console.error('Onboarding insert error:', error)
      return { ok: false, error: 'Gagal menyimpan undangan. Coba lagi sebentar lagi.' }
    }

    revalidatePath('/[template]/[slug]', 'page')
    revalidatePath('/[template]/[slug]/dashboard', 'page')

    return {
      ok: true,
      slug,
      invitationId: (inserted as { id: string }).id,
      publicUrl: `/${template}/${slug}`,
      dashboardUrl: `/${template}/${slug}/dashboard`,
    }
  } catch (e) {
    console.error('Onboarding unexpected error:', e)
    return { ok: false, error: 'Terjadi kesalahan tak terduga. Coba lagi sebentar lagi.' }
  }
}

/**
 * Live slug availability probe — called by the OnboardingForm as the user
 * types so they get instant feedback before submitting.
 */
export async function checkSlugAvailable(slug: string): Promise<{ available: boolean; reason?: string }> {
  try {
    const cleaned = validateSlug(slug)
    const admin = createSupabaseAdminClient()
    const { data } = (await admin
      .from('invitations')
      .select('id')
      .eq('slug', cleaned)
      .maybeSingle()) as { data: { id: string } | null }
    return data ? { available: false, reason: 'Sudah dipakai' } : { available: true }
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : 'Format slug tidak valid' }
  }
}

export interface CheckoutResult {
  ok: boolean
  invoiceUrl?: string
  error?: string
}

/**
 * Create a Xendit invoice for an invitation the caller owns, and persist the
 * Xendit ids on the row so the webhook can correlate the PAID callback.
 * Returns the hosted invoice URL for the client to redirect to.
 */
export async function startCheckout(invitationId: string): Promise<CheckoutResult> {
  try {
    const server = createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Tidak ada sesi login' }

    const { allowed } = await rateLimit(`checkout:${user.id}`, { windowMs: 60_000, max: 6 })
    if (!allowed) return { ok: false, error: 'Terlalu banyak percobaan pembayaran. Coba lagi sebentar lagi.' }

    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations')
      .select('id, slug, plan, template_id, owner_user_id, email')
      .eq('id', invitationId)
      .maybeSingle()) as {
      data: { id: string; slug: string; plan: string; template_id: string; owner_user_id: string; email: string | null } | null
    }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan' }

    const resolved = await resolvePlan(inv.template_id, inv.plan)
    if (!resolved) return { ok: false, error: 'Plan tidak valid' }

    const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
    const externalId = `inv_${inv.id}_${Date.now()}`
    const dash = `${base}/${inv.template_id}/${inv.slug}/dashboard`

    const { id: invoiceId, invoiceUrl } = await createXenditInvoice({
      externalId,
      amountIDR: resolved.amountIDR,
      payerEmail: inv.email ?? user.email ?? undefined,
      description: `Undangan ${inv.slug} — plan ${inv.plan}`,
      successUrl: `${dash}?paid=1`,
      failureUrl: `${dash}?payment=failed`,
    })

    await (admin.from('invitations') as any)
      .update({ xendit_invoice_id: invoiceId, xendit_external_id: externalId })
      .eq('id', inv.id)

    return { ok: true, invoiceUrl }
  } catch (e) {
    console.error('startCheckout error:', e)
    return { ok: false, error: 'Gagal memulai pembayaran. Coba lagi sebentar lagi.' }
  }
}

export interface RecheckResult {
  ok: boolean
  published?: boolean
  status?: string
  error?: string
}

/**
 * Manual fallback for a missed / late Xendit webhook. The owner clicks
 * "Saya sudah bayar — cek ulang"; we re-query the invoice from Xendit and, if
 * it is genuinely paid for the correct amount, publish the invitation right
 * away. Safe to call repeatedly — returns early if already paid, and verifies
 * the amount the same way the webhook does.
 */
export async function recheckPayment(invitationId: string): Promise<RecheckResult> {
  try {
    const server = createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Tidak ada sesi login' }

    const { allowed } = await rateLimit(`recheck:${user.id}`, { windowMs: 60_000, max: 12 })
    if (!allowed) return { ok: false, error: 'Terlalu banyak permintaan cek pembayaran. Coba lagi sebentar lagi.' }

    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations')
      .select('id, plan, template_id, owner_user_id, is_paid, xendit_invoice_id')
      .eq('id', invitationId)
      .maybeSingle()) as {
      data: {
        id: string
        plan: string
        template_id: string
        owner_user_id: string
        is_paid: boolean
        xendit_invoice_id: string | null
      } | null
    }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan' }
    if (inv.is_paid) return { ok: true, published: true, status: 'PAID' }
    if (!inv.xendit_invoice_id)
      return { ok: false, error: 'Belum ada transaksi pembayaran untuk undangan ini' }

    const resolved = await resolvePlan(inv.template_id, inv.plan)
    if (!resolved) return { ok: false, error: 'Plan tidak valid' }

    const snap = await getXenditInvoice(inv.xendit_invoice_id)
    if (!isPaidStatus(snap.status) || snap.amountIDR !== resolved.amountIDR) {
      return { ok: true, published: false, status: snap.status }
    }

    await publishPaidInvitation(admin, inv)
    revalidatePath('/[template]/[slug]', 'page')
    revalidatePath('/[template]/[slug]/dashboard', 'page')
    revalidatePath('/profile', 'page')
    return { ok: true, published: true, status: snap.status }
  } catch (e) {
    console.error('recheckPayment error:', e)
    return { ok: false, error: 'Gagal mengecek pembayaran. Coba lagi sebentar lagi.' }
  }
}

const UPGRADE_TARGET_PLAN = 'premium'

/**
 * Start a "pay the difference" upgrade to Premium for an already-paid invitation
 * the caller owns. Creates a Xendit invoice for the price difference (keyed by
 * an `upg_` external id), records a pending plan_upgrades row, and returns the
 * hosted invoice URL. Does NOT change the live invitation — the webhook /
 * recheckUpgrade applies the plan change only after the upgrade is paid.
 */
export async function startUpgradeCheckout(invitationId: string): Promise<CheckoutResult> {
  try {
    const server = createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Tidak ada sesi login' }

    const { allowed } = await rateLimit(`checkout:${user.id}`, { windowMs: 60_000, max: 6 })
    if (!allowed) return { ok: false, error: 'Terlalu banyak percobaan upgrade. Coba lagi sebentar lagi.' }

    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations')
      .select('id, slug, plan, template_id, owner_user_id, email, is_paid')
      .eq('id', invitationId)
      .maybeSingle()) as {
      data: { id: string; slug: string; plan: string; template_id: string; owner_user_id: string; email: string | null; is_paid: boolean } | null
    }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan' }
    if (!inv.is_paid) return { ok: false, error: 'Selesaikan pembayaran awal undangan dulu sebelum upgrade' }
    if (inv.plan === UPGRADE_TARGET_PLAN) return { ok: false, error: 'Undangan ini sudah Premium' }

    const resolved = await resolveUpgrade(inv.template_id, inv.plan, UPGRADE_TARGET_PLAN)
    if (!resolved) return { ok: false, error: 'Upgrade tidak tersedia untuk plan ini' }

    const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
    const externalId = `upg_${inv.id}_${Date.now()}`
    const dash = `${base}/${inv.template_id}/${inv.slug}/dashboard`

    const { id: invoiceId, invoiceUrl } = await createXenditInvoice({
      externalId,
      amountIDR: resolved.amountIDR,
      payerEmail: inv.email ?? user.email ?? undefined,
      description: `Upgrade ${inv.slug} ke Premium`,
      successUrl: `${dash}?upgraded=1`,
      failureUrl: `${dash}?upgrade=failed`,
    })

    await (admin.from('plan_upgrades') as any).insert({
      invitation_id: inv.id,
      from_plan: inv.plan,
      to_plan: UPGRADE_TARGET_PLAN,
      amount_idr: resolved.amountIDR,
      xendit_invoice_id: invoiceId,
      xendit_external_id: externalId,
      status: 'pending',
    })

    return { ok: true, invoiceUrl }
  } catch (e) {
    console.error('startUpgradeCheckout error:', e)
    return { ok: false, error: 'Gagal memulai upgrade. Coba lagi sebentar lagi.' }
  }
}

/**
 * Manual fallback for a missed upgrade webhook: re-fetch the latest pending
 * upgrade's invoice from Xendit and, if genuinely paid for the right amount,
 * apply the plan change. Safe to call repeatedly.
 */
export async function recheckUpgrade(invitationId: string): Promise<RecheckResult> {
  try {
    const server = createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Tidak ada sesi login' }

    const { allowed } = await rateLimit(`recheck:${user.id}`, { windowMs: 60_000, max: 12 })
    if (!allowed) return { ok: false, error: 'Terlalu banyak permintaan cek upgrade. Coba lagi sebentar lagi.' }

    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations')
      .select('id, plan, template_id, owner_user_id')
      .eq('id', invitationId)
      .maybeSingle()) as {
      data: { id: string; plan: string; template_id: string; owner_user_id: string } | null
    }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan' }
    if (inv.plan === UPGRADE_TARGET_PLAN) return { ok: true, published: true, status: 'PAID' }

    const { data: upg } = (await admin
      .from('plan_upgrades')
      .select('id, invitation_id, to_plan, amount_idr, xendit_invoice_id, status')
      .eq('invitation_id', inv.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()) as {
      data: { id: string; invitation_id: string; to_plan: string; amount_idr: number; xendit_invoice_id: string | null; status: string } | null
    }
    if (!upg || !upg.xendit_invoice_id)
      return { ok: false, error: 'Tidak ada upgrade yang menunggu pembayaran' }

    const snap = await getXenditInvoice(upg.xendit_invoice_id)
    if (!isPaidStatus(snap.status) || snap.amountIDR !== Number(upg.amount_idr)) {
      return { ok: true, published: false, status: snap.status }
    }

    await applyPaidUpgrade(admin, {
      id: upg.id,
      invitation_id: upg.invitation_id,
      to_plan: upg.to_plan,
      template_id: inv.template_id,
    })
    revalidatePath('/[template]/[slug]/dashboard', 'page')
    revalidatePath('/profile', 'page')
    return { ok: true, published: true, status: snap.status }
  } catch (e) {
    console.error('recheckUpgrade error:', e)
    return { ok: false, error: 'Gagal mengecek upgrade. Coba lagi sebentar lagi.' }
  }
}
