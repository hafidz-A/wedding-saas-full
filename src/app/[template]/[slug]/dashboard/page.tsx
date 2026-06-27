import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isValidTemplate } from '@/config/templateIndex'
import { getLang } from '@/lib/i18n/getLang'
import { getDict, type Dict, type Lang } from '@/lib/i18n'
import { activePeriodStatus } from '@/lib/payments/active-period'
import { resolveUpgrade } from '@/lib/payments/plans'
import LoginForm from './LoginForm'
import DashboardClient from './DashboardClient'
import PaymentGate from './PaymentGate'
import { DashboardI18nProvider } from './DashboardI18nProvider'
import { AuthChrome } from '@/components/site/AuthChrome'
import { fromDbRow } from './guests/types'
import { fromDbRow as attendanceFromDbRow } from './guestbook/types'
import { decryptField as appDecrypt } from '@/lib/crypto/app'
import { decryptConfig } from '@/lib/crypto/config'

interface PageProps {
  params: { template: string; slug: string }
}

/**
 * Admin dashboard for a single invitation. Supabase Auth-gated.
 *
 *   - Anonymous (no Supabase Auth session)        → render <LoginForm>
 *   - Authenticated but NOT the owner of this slug → render <LoginForm> with
 *                                                    a "wrong account" error
 *   - Authenticated as owner                      → render <DashboardClient>
 *
 * Auth model:
 *   • Each invitation has `owner_user_id` referencing auth.users(id)
 *   • Session is the Supabase Auth cookie set by signInWithPassword
 *   • One user owns at most one invitation (enforced at onboarding time)
 */
export default async function DashboardPage({ params }: PageProps) {
  const { template, slug } = params
  const lang = getLang()
  const t = getDict(lang)

  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!hasSupabase) return <SetupPrompt lang={lang} />

  // 1. Look up the invitation. We use the admin client because we need
  //    the row even when no user is authenticated (so we can show the
  //    login form scoped to the right slug).
  const admin = createSupabaseAdminClient()
  const { data: invitation } = (await admin
    .from('invitations')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()) as { data: any | null }

  if (!invitation) return <NoSuchInvitation slug={slug} dict={t.dashboard.page} lang={lang} />

  // 1b. Canonicalise the URL to the invitation's real template_id. The editor
  //     tabs are template-aware (lock rules, palette/meta schema), so a URL with
  //     the wrong template segment must not drive them — redirect to the truth.
  if (
    invitation.template_id &&
    invitation.template_id !== template &&
    isValidTemplate(invitation.template_id)
  ) {
    redirect(`/${invitation.template_id}/${slug}/dashboard`)
  }
  const canonicalTemplate =
    invitation.template_id && isValidTemplate(invitation.template_id)
      ? invitation.template_id
      : template

  // 2. Who is the current user?
  const serverClient = createSupabaseServerClient()
  const { data: { user } } = await serverClient.auth.getUser()

  // 3. Owner check.
  if (!user) {
    return <LoginForm slug={slug} template={template} dict={t.dashboard.login} lang={lang} />
  }
  if (invitation.owner_user_id !== user.id) {
    // Authenticated user is the wrong owner. Sign them out via the form
    // (showing them the error) so they can sign in with the right account.
    return (
      <>
      <AuthChrome lang={lang} />
      <main style={panelStyle}>
        <div style={cardStyle}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontStyle: 'normal', fontSize: 32, margin: '0 0 12px' }}>
            {t.dashboard.page.wrongAccountTitle}
          </h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px' }}>
            {t.dashboard.page.wrongAccountPrefix} <strong>{user.email}</strong> {t.dashboard.page.wrongAccountMid} <code>{slug}</code>{t.dashboard.page.wrongAccountSuffix}
          </p>
          <SignOutButton label={t.dashboard.page.signOut} />
        </div>
      </main>
      </>
    )
  }

  // 3b. Payment gate: dashboard is locked while the invitation is unpaid or
  //     its active period has run out. Owner sees a "bayar / perpanjang"
  //     screen instead of the editor; preview link is offered only in the
  //     unpaid case (expired view is closed for everyone).
  const period = activePeriodStatus(invitation, Date.now())
  if (period.status === 'draft' || period.status === 'expired') {
    // PaymentGate is a client component that reads the dashboard dictionary via
    // useDashboardDict(), so it MUST be wrapped in the provider — otherwise the
    // hook throws and the whole gate (incl. the Perpanjang button) crashes with
    // a client-side exception instead of rendering.
    return (
      <DashboardI18nProvider dict={t.dashboard} lang={lang}>
        <PaymentGate
          invitationId={invitation.id}
          slug={slug}
          template={canonicalTemplate}
          status={period.status}
        />
      </DashboardI18nProvider>
    )
  }

  // 4. Fetch RSVPs + gifts + guests + attendances in parallel.
  //    The attendances query degrades gracefully: if the table doesn't exist
  //    yet (migration not applied), Supabase resolves with error + null data
  //    rather than throwing, so the Buku Tamu tab just shows an empty list.
  const [
    { data: rsvps },
    { data: gifts },
    { data: guestsRaw },
    { data: attendancesRaw },
  ] = await Promise.all([
    admin
      .from('rsvps')
      .select('*')
      .eq('invitation_id', invitation.id)
      .order('created_at', { ascending: false }),
    admin
      .from('gift_confirmations')
      .select('*')
      .eq('invitation_id', invitation.id)
      .order('created_at', { ascending: false }),
    admin
      .from('guests')
      .select('*')
      .eq('invitation_id', invitation.id)
      .order('created_at', { ascending: true }),
    admin
      .from('attendances')
      .select('*')
      .eq('invitation_id', invitation.id)
      .order('created_at', { ascending: false }),
  ])

  // Decrypt guests rows server-side — the client never sees ciphertext.
  // If the guests table doesn't exist yet (migration not applied), guestsRaw
  // will be null and we just render an empty list — Tab shows the empty
  // state with the "+ Import" CTA.
  const guests = (guestsRaw as any[] | null)?.map(fromDbRow) ?? []
  const attendances = (attendancesRaw as any[] | null)?.map(attendanceFromDbRow) ?? []
  const rsvpsDec = (rsvps as any[] | null)?.map(decryptRsvpRow) ?? []
  const giftsDec = (gifts as any[] | null)?.map(decryptGiftRow) ?? []

  // Decrypt the config once, server-side, before it reaches the editor/tabs
  // (account numbers, whatsapp, email, phone). No-op on a plaintext config.
  const invitationDecrypted = { ...invitation, config: decryptConfig(invitation.config) }

  // Resolve the Premium-upgrade price (difference) for a paid, non-premium
  // invitation, so the locked Buku Tamu card can show the amount.
  let upgrade: { amountIDR: number } | null = null
  if (invitation.is_paid && invitation.plan !== 'premium') {
    const u = await resolveUpgrade(invitation.template_id ?? template, invitation.plan, 'premium')
    if (u) upgrade = { amountIDR: u.amountIDR }
  }

  return (
    <DashboardClient
      slug={slug}
      template={canonicalTemplate}
      invitation={invitationDecrypted}
      rsvps={rsvpsDec}
      gifts={giftsDec}
      guests={guests}
      attendances={attendances}
      dict={t.dashboard}
      activePeriod={t.common.activePeriod}
      lang={lang}
      upgrade={upgrade}
    />
  )
}

/* Row decryptors — prefer _enc column, fall back to plaintext for un-migrated rows. */

function decryptRsvpRow(r: any) {
  return {
    id: r.id,
    guest_name: r.guest_name_enc != null ? appDecrypt(r.guest_name_enc) ?? '' : r.guest_name ?? '',
    attending: r.attending,
    guest_count: r.guest_count,
    meal_choice: r.meal_choice,
    message: r.message_enc != null ? appDecrypt(r.message_enc) : r.message ?? null,
    created_at: r.created_at,
  }
}

function decryptGiftRow(g: any) {
  const amt = g.amount_enc != null ? appDecrypt(g.amount_enc) : null
  return {
    id: g.id,
    guest_name: g.guest_name_enc != null ? appDecrypt(g.guest_name_enc) ?? '' : g.guest_name ?? '',
    account_used: g.account_used,
    amount: amt != null ? Number(amt) : g.amount ?? null,
    currency: g.currency,
    message: g.message_enc != null ? appDecrypt(g.message_enc) : g.message ?? null,
    created_at: g.created_at,
  }
}

/* ──────────── small server-rendered placeholders ──────────── */

function SetupPrompt({ lang }: { lang: Lang }) {
  return (
    <>
    <AuthChrome lang={lang} />
    <main style={panelStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontStyle: 'normal', fontSize: 40, margin: '0 0 16px' }}>
          Setup needed
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Isi <code>.env.local</code> dengan <code>NEXT_PUBLIC_SUPABASE_URL</code>,
          <code> NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, dan <code>SUPABASE_SERVICE_ROLE_KEY</code>,
          lalu restart dev server.
        </p>
      </div>
    </main>
    </>
  )
}

function NoSuchInvitation({ slug, dict, lang }: { slug: string; dict: Dict['dashboard']['page']; lang: Lang }) {
  return (
    <>
    <AuthChrome lang={lang} />
    <main style={panelStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontStyle: 'normal', fontSize: 40, margin: '0 0 16px' }}>
          {dict.noInvitationPrefix} <code>{slug}</code> {dict.noInvitationSuffix}
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{dict.noInvitationBody}</p>
      </div>
    </main>
    </>
  )
}

function SignOutButton({ label }: { label: string }) {
  // Client component would be cleaner but for a one-off sign-out link a
  // form posting to /api/auth/logout works fine and keeps this file SSR.
  return (
    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        style={{
          padding: '10px 20px',
          borderRadius: 'var(--radius-pill)',
          background: 'var(--color-charcoal)',
          color: 'var(--surface-warm)',
          border: 'none',
          fontSize: 12,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    </form>
  )
}

const panelStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, var(--surface-warm) 0%, var(--surface-sunken) 100%)',
  padding: 40,
  fontFamily: 'var(--font-body, system-ui)',
}

const cardStyle: React.CSSProperties = {
  maxWidth: 520,
  padding: 40,
  background: 'rgba(255,255,255,0.9)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-md)',
}
