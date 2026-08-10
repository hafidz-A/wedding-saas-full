'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { buildSeedConfig, validateSlug } from '@/lib/onboarding/seed-config'
import { isValidTemplate, getDefaultConfig, DEFAULT_TEMPLATE_ID } from '@/config/templateIndex'
import { resolvePlan, resolveUpgrade, planBaseQuota } from '@/lib/payments/plans'
import { getTemplatePlans } from '@/lib/payments/template-plans'
import {
  initialPurchaseAmount, clampQuotaExtra, quotaAddonAmount, effectiveQuota,
  QUOTA_CAP, DEFAULT_BASE_QUOTA, BLOCK_SIZE,
} from '@/lib/payments/quota'
import { createSnapTransaction, getTransactionStatus, isPaidStatus, expireTransaction, mintOrderId } from '@/lib/payments/gateway'
import { needsRefundDestination } from '@/lib/payments/refund-channels'
import { publishPaidInvitation, applyPaidUpgrade, extendActivePeriod, applyPaidQuotaAddon } from '@/lib/payments/publish'
import { activePeriodStatus } from '@/lib/payments/active-period'
import { rateLimit } from '@/lib/security/rate-limit'
import { buildUsageSnapshot } from '@/lib/payments/refund-usage'
import { encryptField } from '@/lib/crypto/app'
import { siteBaseUrl } from '@/lib/site-url'

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
  /** Extra guest quota (beyond the plan base) bought at checkout, multiple of 50. */
  guestQuotaExtra?: number
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
 *     payment publishes it via the payment webhook.
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

    // 3b. Sanitize the chosen guest-quota add-on: snap UP to a clean 50-block and
    //     cap so base + extra never exceeds QUOTA_CAP. (Base from the client-safe
    //     constant; enforcement reads the DB base — they match by design.)
    const baseForPlan = DEFAULT_BASE_QUOTA[plan] ?? 200
    const guestQuotaExtra = clampQuotaExtra(baseForPlan, Number(input.guestQuotaExtra ?? 0))

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
    //    publishes it via the payment webhook. Legacy NOT NULL columns (from the
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
        guest_quota_extra: guestQuotaExtra,
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
 * Create a Midtrans Snap transaction for an invitation the caller owns, and
 * persist the gateway order id on the row so the webhook can correlate the
 * PAID callback. Returns the hosted Snap redirect URL for the client to
 * redirect to.
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
      .select('id, slug, plan, template_id, owner_user_id, email, is_paid, gateway_order_id, guest_quota_extra')
      .eq('id', invitationId)
      .maybeSingle()) as {
      data: { id: string; slug: string; plan: string; template_id: string; owner_user_id: string; email: string | null; is_paid: boolean; gateway_order_id: string | null; guest_quota_extra: number | null } | null
    }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan' }
    if (inv.is_paid) return { ok: false, error: 'Undangan ini sudah dibayar' }

    const resolved = await resolvePlan(inv.template_id, inv.plan)
    if (!resolved) return { ok: false, error: 'Plan tidak valid' }

    // Charge the plan price PLUS the guest-quota add-on the owner chose. The
    // webhook computes the same expected amount from guest_quota_extra.
    const amountIDR = initialPurchaseAmount(resolved.amountIDR, Number(inv.guest_quota_extra ?? 0))

    // Expire any prior outstanding transaction so a customer who re-opens checkout
    // can't accidentally pay an old link the webhook would no longer publish
    // against (and to prevent a double-charge across two live transactions).
    if (inv.gateway_order_id) await expireTransaction(inv.gateway_order_id)

    const base = siteBaseUrl()
    const orderId = mintOrderId('inv', inv.id)
    const dash = `${base}/${inv.template_id}/${inv.slug}/dashboard`

    const { redirectUrl } = await createSnapTransaction({
      orderId,
      amountIDR,
      payerEmail: inv.email ?? user.email ?? undefined,
      itemName: `Undangan ${inv.slug} — plan ${inv.plan}`,
      finishUrl: `${dash}?paid=1`,
    })

    // Lock the amount we're charging so the webhook verifies against IT (not a
    // recomputed price) — a price/promo change mid-checkout can't break payment.
    // gateway_txn_id is filled later by the webhook (Midtrans mints it at pay time).
    await (admin.from('invitations') as any)
      .update({ gateway_order_id: orderId, gateway_txn_id: null, expected_amount_idr: amountIDR })
      .eq('id', inv.id)

    return { ok: true, invoiceUrl: redirectUrl }
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
 * Manual fallback for a missed / late Midtrans webhook. The owner clicks
 * "Saya sudah bayar — cek ulang"; we re-query the transaction from Midtrans
 * and, if it is genuinely paid for the correct amount, publish the invitation
 * right away. Safe to call repeatedly — returns early if already paid, and
 * verifies the amount the same way the webhook does.
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
      .select('id, plan, template_id, owner_user_id, is_paid, gateway_order_id, guest_quota_extra, expected_amount_idr')
      .eq('id', invitationId)
      .maybeSingle()) as {
      data: {
        id: string
        plan: string
        template_id: string
        owner_user_id: string
        is_paid: boolean
        gateway_order_id: string | null
        guest_quota_extra: number | null
        expected_amount_idr: number | null
      } | null
    }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan' }
    if (inv.is_paid) return { ok: true, published: true, status: 'PAID' }
    if (!inv.gateway_order_id)
      return { ok: false, error: 'Belum ada transaksi pembayaran untuk undangan ini' }

    const resolved = await resolvePlan(inv.template_id, inv.plan)
    if (!resolved) return { ok: false, error: 'Plan tidak valid' }

    // Verify against the amount LOCKED at checkout (plan + any quota add-on),
    // falling back to a recompute for older checkouts. Using the plan price alone
    // would wrongly reject anyone who bought extra guest quota.
    const expected = inv.expected_amount_idr ?? initialPurchaseAmount(resolved.amountIDR, Number(inv.guest_quota_extra ?? 0))
    const snap = await getTransactionStatus(inv.gateway_order_id)
    if (!isPaidStatus(snap.status, snap.fraudStatus) || snap.grossAmountIDR !== expected) {
      return { ok: true, published: false, status: snap.status }
    }

    await publishPaidInvitation(admin, inv, Date.now(), {
      paidAmountIDR: expected, paidSource: 'midtrans', feeIDR: null,
      paidChannel: snap.paymentType, gatewayTxnId: snap.transactionId,
    })
    revalidatePath('/[template]/[slug]', 'page')
    revalidatePath('/[template]/[slug]/dashboard', 'page')
    revalidatePath('/profile', 'page')
    return { ok: true, published: true, status: snap.status }
  } catch (e) {
    console.error('recheckPayment error:', e)
    return { ok: false, error: 'Gagal mengecek pembayaran. Coba lagi sebentar lagi.' }
  }
}

/**
 * Start a renewal for an already-paid invitation whose active period has run
 * out. Re-bills the SAME plan (no plan change — that's the separate upgrade
 * flow) via a Midtrans Snap transaction keyed by a `ren_` order id, so the
 * webhook extends the active period instead of treating it as a first
 * purchase (which its `is_paid` guard would reject). Returns the hosted Snap
 * redirect URL.
 */
export async function startRenewal(invitationId: string): Promise<CheckoutResult> {
  try {
    const server = createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Tidak ada sesi login' }

    const { allowed } = await rateLimit(`checkout:${user.id}`, { windowMs: 60_000, max: 6 })
    if (!allowed) return { ok: false, error: 'Terlalu banyak percobaan pembayaran. Coba lagi sebentar lagi.' }

    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations')
      .select('id, slug, plan, template_id, owner_user_id, email, is_paid, expires_at, gateway_order_id')
      .eq('id', invitationId)
      .maybeSingle()) as {
      data: { id: string; slug: string; plan: string; template_id: string; owner_user_id: string; email: string | null; is_paid: boolean; expires_at: string | null; gateway_order_id: string | null } | null
    }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan' }

    const period = activePeriodStatus(inv, Date.now())
    if (period.status !== 'expired') {
      return { ok: false, error: 'Undangan ini masih aktif — belum perlu diperpanjang.' }
    }

    const resolved = await resolvePlan(inv.template_id, inv.plan)
    if (!resolved) return { ok: false, error: 'Plan tidak valid' }

    // Expire the prior transaction so an old link can't be paid against later.
    if (inv.gateway_order_id) await expireTransaction(inv.gateway_order_id)

    const base = siteBaseUrl()
    const orderId = mintOrderId('ren', inv.id)
    const dash = `${base}/${inv.template_id}/${inv.slug}/dashboard`

    const { redirectUrl } = await createSnapTransaction({
      orderId,
      amountIDR: resolved.amountIDR,
      payerEmail: inv.email ?? user.email ?? undefined,
      itemName: `Perpanjang undangan ${inv.slug} — plan ${inv.plan}`,
      finishUrl: `${dash}?renewed=1`,
    })

    await (admin.from('invitations') as any)
      .update({ gateway_order_id: orderId, gateway_txn_id: null })
      .eq('id', inv.id)

    return { ok: true, invoiceUrl: redirectUrl }
  } catch (e) {
    console.error('startRenewal error:', e)
    return { ok: false, error: 'Gagal memulai perpanjangan. Coba lagi sebentar lagi.' }
  }
}

/**
 * Manual fallback for a missed renewal webhook. Re-fetches the latest `ren_`
 * transaction from Midtrans and, if genuinely paid for the current plan
 * price, extends the active period. Safe to call repeatedly.
 */
export async function recheckRenewal(invitationId: string): Promise<RecheckResult> {
  try {
    const server = createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Tidak ada sesi login' }

    const { allowed } = await rateLimit(`recheck:${user.id}`, { windowMs: 60_000, max: 12 })
    if (!allowed) return { ok: false, error: 'Terlalu banyak permintaan cek pembayaran. Coba lagi sebentar lagi.' }

    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations')
      .select('id, plan, template_id, owner_user_id, is_paid, expires_at, gateway_order_id')
      .eq('id', invitationId)
      .maybeSingle()) as {
      data: { id: string; plan: string; template_id: string; owner_user_id: string; is_paid: boolean; expires_at: string | null; gateway_order_id: string | null } | null
    }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan' }

    const period = activePeriodStatus(inv, Date.now())
    if (period.status !== 'expired') return { ok: true, published: true, status: 'ACTIVE' }

    if (!inv.gateway_order_id?.startsWith('ren_'))
      return { ok: false, error: 'Belum ada transaksi perpanjangan untuk undangan ini' }

    const resolved = await resolvePlan(inv.template_id, inv.plan)
    if (!resolved) return { ok: false, error: 'Plan tidak valid' }

    const snap = await getTransactionStatus(inv.gateway_order_id)
    if (!isPaidStatus(snap.status, snap.fraudStatus) || snap.grossAmountIDR !== resolved.amountIDR) {
      return { ok: true, published: false, status: snap.status }
    }

    await extendActivePeriod(admin, inv)
    revalidatePath('/[template]/[slug]', 'page')
    revalidatePath('/[template]/[slug]/dashboard', 'page')
    revalidatePath('/profile', 'page')
    return { ok: true, published: true, status: snap.status }
  } catch (e) {
    console.error('recheckRenewal error:', e)
    return { ok: false, error: 'Gagal mengecek perpanjangan. Coba lagi sebentar lagi.' }
  }
}

const UPGRADE_TARGET_PLAN = 'premium'

/**
 * Start a "pay the difference" upgrade to Premium for an already-paid invitation
 * the caller owns. Creates a Midtrans Snap transaction for the price difference
 * (keyed by an `upg_` order id), records a pending plan_upgrades row, and
 * returns the hosted Snap redirect URL. Does NOT change the live invitation —
 * the webhook / recheckUpgrade applies the plan change only after the upgrade
 * is paid.
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

    const base = siteBaseUrl()
    const orderId = mintOrderId('upg', inv.id)
    const dash = `${base}/${inv.template_id}/${inv.slug}/dashboard`

    const { redirectUrl } = await createSnapTransaction({
      orderId,
      amountIDR: resolved.amountIDR,
      payerEmail: inv.email ?? user.email ?? undefined,
      itemName: `Upgrade ${inv.slug} ke Premium`,
      finishUrl: `${dash}?upgraded=1`,
    })

    await (admin.from('plan_upgrades') as any).insert({
      invitation_id: inv.id,
      from_plan: inv.plan,
      to_plan: UPGRADE_TARGET_PLAN,
      amount_idr: resolved.amountIDR,
      gateway_txn_id: null,
      gateway_order_id: orderId,
      status: 'pending',
    })

    return { ok: true, invoiceUrl: redirectUrl }
  } catch (e) {
    console.error('startUpgradeCheckout error:', e)
    return { ok: false, error: 'Gagal memulai upgrade. Coba lagi sebentar lagi.' }
  }
}

/**
 * Manual fallback for a missed upgrade webhook: re-fetch the latest pending
 * upgrade's transaction from Midtrans and, if genuinely paid for the right
 * amount, apply the plan change. Safe to call repeatedly.
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
      .select('id, invitation_id, to_plan, amount_idr, gateway_order_id, status')
      .eq('invitation_id', inv.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()) as {
      data: { id: string; invitation_id: string; to_plan: string; amount_idr: number; gateway_order_id: string | null; status: string } | null
    }
    if (!upg || !upg.gateway_order_id)
      return { ok: false, error: 'Tidak ada upgrade yang menunggu pembayaran' }

    const snap = await getTransactionStatus(upg.gateway_order_id)
    if (!isPaidStatus(snap.status, snap.fraudStatus) || snap.grossAmountIDR !== Number(upg.amount_idr)) {
      return { ok: true, published: false, status: snap.status }
    }

    await applyPaidUpgrade(admin, {
      id: upg.id,
      invitation_id: upg.invitation_id,
      to_plan: upg.to_plan,
      template_id: inv.template_id,
    })
    await (admin.from('plan_upgrades') as any)
      .update({ paid_channel: snap.paymentType ?? null, gateway_txn_id: snap.transactionId ?? null })
      .eq('id', upg.id)
    revalidatePath('/[template]/[slug]/dashboard', 'page')
    revalidatePath('/profile', 'page')
    return { ok: true, published: true, status: snap.status }
  } catch (e) {
    console.error('recheckUpgrade error:', e)
    return { ok: false, error: 'Gagal mengecek upgrade. Coba lagi sebentar lagi.' }
  }
}

/**
 * Start a "buy extra guest quota" checkout for an already-paid invitation the
 * caller owns. Snaps the requested qty UP to a clean 50-block, refuses anything
 * that would push the effective quota over QUOTA_CAP, creates a Midtrans Snap
 * transaction for the add-on (keyed by a `qta_` order id), records a pending
 * quota_addons row, and returns the hosted Snap redirect URL. The webhook /
 * recheckQuotaAddon bumps guest_quota_extra only after the add-on is paid.
 */
export async function startQuotaAddonCheckout(invitationId: string, qtyGuests: number): Promise<CheckoutResult> {
  try {
    const server = createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Tidak ada sesi login' }

    const { allowed } = await rateLimit(`checkout:${user.id}`, { windowMs: 60_000, max: 6 })
    if (!allowed) return { ok: false, error: 'Terlalu banyak percobaan. Coba lagi sebentar lagi.' }

    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations')
      .select('id, slug, plan, template_id, owner_user_id, email, is_paid, guest_quota_extra')
      .eq('id', invitationId)
      .maybeSingle()) as {
      data: { id: string; slug: string; plan: string; template_id: string; owner_user_id: string; email: string | null; is_paid: boolean; guest_quota_extra: number | null } | null
    }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan' }
    if (!inv.is_paid) return { ok: false, error: 'Selesaikan pembayaran awal undangan dulu' }

    // Snap UP to a clean block; 0 base means "treat the raw qty as the add-on".
    const qty = clampQuotaExtra(0, Number(qtyGuests))
    if (qty <= 0) return { ok: false, error: `Jumlah tambahan minimal ${BLOCK_SIZE} tamu` }

    const plans = await getTemplatePlans(inv.template_id)
    const base = planBaseQuota(plans, inv.plan)
    const current = effectiveQuota(base, Number(inv.guest_quota_extra ?? 0))
    if (current + qty > QUOTA_CAP) {
      return { ok: false, error: `Maksimal ${QUOTA_CAP} tamu. Sisa kuota yang bisa ditambah: ${Math.max(0, QUOTA_CAP - current)}.` }
    }

    const amountIDR = quotaAddonAmount(qty)
    const baseUrl = siteBaseUrl()
    const orderId = mintOrderId('qta', inv.id)
    const dash = `${baseUrl}/${inv.template_id}/${inv.slug}/dashboard`

    const { redirectUrl } = await createSnapTransaction({
      orderId,
      amountIDR,
      payerEmail: inv.email ?? user.email ?? undefined,
      itemName: `Tambah ${qty} kuota tamu — ${inv.slug}`,
      finishUrl: `${dash}?quota=1`,
    })

    await (admin.from('quota_addons') as any).insert({
      invitation_id: inv.id,
      qty_guests: qty,
      amount_idr: amountIDR,
      gateway_txn_id: null,
      gateway_order_id: orderId,
      status: 'pending',
    })

    return { ok: true, invoiceUrl: redirectUrl }
  } catch (e) {
    console.error('startQuotaAddonCheckout error:', e)
    return { ok: false, error: 'Gagal memulai pembelian kuota. Coba lagi sebentar lagi.' }
  }
}

/**
 * Manual fallback for a missed `qta_` webhook: re-fetch the latest pending
 * quota_addons transaction from Midtrans and, if genuinely paid for the
 * recorded amount, apply the extra. Safe to call repeatedly.
 */
export async function recheckQuotaAddon(invitationId: string): Promise<RecheckResult> {
  try {
    const server = createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Tidak ada sesi login' }

    const { allowed } = await rateLimit(`recheck:${user.id}`, { windowMs: 60_000, max: 12 })
    if (!allowed) return { ok: false, error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' }

    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations')
      .select('id, owner_user_id')
      .eq('id', invitationId)
      .maybeSingle()) as { data: { id: string; owner_user_id: string } | null }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan' }

    const { data: addon } = (await admin
      .from('quota_addons')
      .select('id, invitation_id, qty_guests, amount_idr, gateway_order_id, status')
      .eq('invitation_id', inv.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()) as {
      data: { id: string; invitation_id: string; qty_guests: number; amount_idr: number; gateway_order_id: string | null; status: string } | null
    }
    if (!addon || !addon.gateway_order_id) return { ok: false, error: 'Tidak ada pembelian kuota yang menunggu pembayaran' }

    const snap = await getTransactionStatus(addon.gateway_order_id)
    if (!isPaidStatus(snap.status, snap.fraudStatus) || snap.grossAmountIDR !== Number(addon.amount_idr)) {
      return { ok: true, published: false, status: snap.status }
    }

    await applyPaidQuotaAddon(admin, { id: addon.id, invitation_id: addon.invitation_id, qty_guests: Number(addon.qty_guests) })
    await (admin.from('quota_addons') as any)
      .update({ paid_channel: snap.paymentType ?? null, gateway_txn_id: snap.transactionId ?? null })
      .eq('id', addon.id)
    revalidatePath('/[template]/[slug]/dashboard', 'page')
    return { ok: true, published: true, status: snap.status }
  } catch (e) {
    console.error('recheckQuotaAddon error:', e)
    return { ok: false, error: 'Gagal mengecek pembelian kuota. Coba lagi sebentar lagi.' }
  }
}

export interface RefundRequestInput {
  category: 'duplicate_payment' | 'system_failure' | 'inaccessible' | 'other'
  detail?: string
  destination?: { bank?: string; account_no?: string; holder?: string }
}

/**
 * Owner files a refund REQUEST (operator decides — never instant self-service).
 * Eligibility pre-check (paid, not comp, no existing pending, rate-limited) + a
 * server-built usage snapshot (published? guests/RSVPs/check-ins, config edited,
 * days since paid) that powers the operator's plain-language verdict. The refund
 * CHANNEL is decided later by paid_source + paid_channel, not chosen here — a
 * manual/offline payment (or a Midtrans channel without API refund) collects a
 * destination account; an API-refundable Midtrans channel doesn't need one.
 */
export async function requestRefund(invitationId: string, input: RefundRequestInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const server = createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Tidak ada sesi login' }

    const { allowed } = await rateLimit(`refundreq:${user.id}`, { windowMs: 60_000, max: 4 })
    if (!allowed) return { ok: false, error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' }

    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin.from('invitations')
      .select('id, owner_user_id, is_paid, paid_source, paid_channel, paid_at, is_published, updated_at, used_at, published_at')
      .eq('id', invitationId).maybeSingle()) as { data: any | null }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan' }
    if (!inv.is_paid) return { ok: false, error: 'Belum ada pembayaran untuk direfund' }
    if (inv.paid_source === 'comp') return { ok: false, error: 'Undangan gratis (comp) tidak bisa direfund' }

    const { data: pending } = await (admin.from('refund_requests') as any)
      .select('id').eq('invitation_id', invitationId).eq('status', 'pending').limit(1)
    if (pending && pending.length) return { ok: false, error: 'Sudah ada permintaan refund yang sedang diproses.' }

    // A destination account is REQUIRED whenever the money can't go back
    // automatically: manual/offline payments, and Midtrans channels without
    // API refund (bank transfer / VA). Collecting it now avoids a second
    // round-trip with the customer at decision time.
    const needsDestination = needsRefundDestination(inv.paid_source, inv.paid_channel)
    const d = input.destination
    if (needsDestination && !(d?.bank?.trim() && d?.account_no?.trim() && d?.holder?.trim())) {
      return { ok: false, error: 'Isi bank, nomor rekening, dan nama pemilik untuk tujuan pengembalian dana.' }
    }

    // Usage snapshot at request time (kept for the record). The admin panel
    // RECOMPUTES this live on every view, so a later edit shows up there.
    const usage = await buildUsageSnapshot(admin, invitationId, inv)
    // Encrypt the refund destination (bank/account/holder) at rest — it's customer
    // PII, same posture as RSVP/gift data. Decrypted only for the operator panel.
    const destination = d
      ? { bank: encryptField(d.bank ?? ''), account_no: encryptField(d.account_no ?? ''), holder: encryptField(d.holder ?? '') }
      : null
    const usage_snapshot = { ...usage, destination }
    const { error } = await (admin.from('refund_requests') as any).insert({
      invitation_id: invitationId, requested_by: user.id, source_type: 'initial', source_id: invitationId,
      reason_category: input.category, reason_text: input.detail ?? null, usage_snapshot, status: 'pending',
    })
    if (error) return { ok: false, error: 'Gagal mengajukan refund. Mungkin sudah ada permintaan berjalan.' }
    return { ok: true }
  } catch (e) {
    console.error('requestRefund error:', e)
    return { ok: false, error: 'Terjadi kesalahan. Coba lagi sebentar lagi.' }
  }
}
