import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isValidTemplate, DEFAULT_TEMPLATE_ID } from '@/config/templateIndex'
import { activePeriodStatus } from '@/lib/payments/active-period'
import { isAdminEmail } from '@/lib/admin/is-admin'
import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'
import { coupleDisplay, deriveCoupleFromConfig } from '@/lib/meta/couple'
import { SiteNav } from '@/components/site/SiteNav'
import InvitationActions from './InvitationActions'
import MfaEnroll from './MfaEnroll'
import AccountDataSection from './AccountDataSection'
import styles from './profile.module.css'

/**
 * Deliberately simple profile page. Shows the account email, a reset-password
 * link, and the list of invitations this account owns (interim "My Template").
 * Auth-gated: bounces to /login when there is no session.
 */
export default async function ProfilePage() {
  const lang = getLang()
  const t = getDict(lang)
  const p = t.common.profile

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createSupabaseAdminClient()
  const { data: rows } = (await admin
    .from('invitations')
    .select('id, slug, template_id, is_paid, expires_at, config')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: false })) as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { id: string; slug: string; template_id: string | null; is_paid: boolean; expires_at: string | null; config: any }[] | null
  }
  const invitations = rows ?? []

  // Existing review per paid invitation → drives the "Ubah Ulasan" label + status chip.
  const paidIds = invitations.filter((i) => i.is_paid).map((i) => i.id)
  const reviewByInv = new Map<string, { rating: number; body: string; isAnonymous: boolean; isVisible: boolean }>()
  if (paidIds.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: myReviews } = (await (admin.from('testimonials') as any)
      .select('invitation_id, rating, body, is_anonymous, is_visible')
      .in('invitation_id', paidIds)) as {
      data: { invitation_id: string; rating: number; body: string; is_anonymous: boolean; is_visible: boolean }[] | null
    }
    for (const r of myReviews ?? [])
      reviewByInv.set(r.invitation_id, { rating: r.rating, body: r.body, isAnonymous: r.is_anonymous, isVisible: r.is_visible })
  }
  const { data: delReq } = (await admin
    .from('account_deletion_requests')
    .select('scheduled_for').eq('user_id', user.id).eq('status', 'pending').limit(1).maybeSingle()) as { data: { scheduled_for: string | null } | null }
  const pendingDeletion = delReq ? { scheduledFor: delReq.scheduled_for } : null
  const ap = t.common.activePeriod
  const now = Date.now()

  const tmpl = (id: string | null) =>
    id && isValidTemplate(id) ? id : DEFAULT_TEMPLATE_ID

  const periodLabel = (inv: { is_paid: boolean; expires_at: string | null }) => {
    const r = activePeriodStatus(inv, now)
    if (r.status === 'lifetime') return ap.lifetime
    if (r.status === 'expired') return ap.expired
    if (r.status === 'active' && r.expiresAt)
      return `${ap.activeUntilPrefix} ${new Date(r.expiresAt).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`
    return ap.draft
  }

  return (
    <>
      <SiteNav lang={lang} t={t.common} />
      <main style={page}>
        <div style={wrap}>
          <h1 style={h1}>{p.title}</h1>

          {isAdminEmail(user.email) && (
            <section style={cardBox}>
              <p style={rowLabel}>Panel Admin</p>
              <a href="/admin" style={{ fontSize: 14, textDecoration: 'underline', display: 'inline-block', margin: '4px 0 14px' }}>
                Buka panel admin →
              </a>
              <MfaEnroll />
            </section>
          )}

          <section style={cardBox}>
            <p style={rowLabel}>{p.emailLabel}</p>
            <p style={rowValue}>{user.email}</p>
            <Link href="/forgot-password" style={resetLink}>{p.resetPassword}</Link>
          </section>

          <h2 style={h2}>{p.myTemplatesTitle}</h2>
          {invitations.length === 0 ? (
            <div style={emptyCard}>
              <span style={emptyIconBadge} aria-hidden>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M3 9h18" />
                  <path d="M9 9v12" />
                </svg>
              </span>
              <h3 style={emptyTitleStyle}>{p.empty}</h3>
              <p style={emptyBodyStyle}>{p.emptyBody}</p>
              <Link href="/#vibe" className={styles.browseBtn}>
                {p.browseTemplates}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          ) : (
            <ul style={list}>
              {invitations.map((inv) => {
                const tt = tmpl(inv.template_id)
                const periodStatus = activePeriodStatus(inv, now).status
                return (
                  <li key={inv.slug} style={item}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={itemSlug}>{inv.slug}</span>
                      <span style={periodChip}>{periodLabel(inv)}</span>
                    </span>
                    <InvitationActions
                      invitationId={inv.id}
                      viewHref={`/${tt}/${inv.slug}`}
                      dashboardHref={`/${tt}/${inv.slug}/dashboard`}
                      periodStatus={periodStatus}
                      isPaid={inv.is_paid}
                      defaultName={coupleDisplay(deriveCoupleFromConfig(inv.config)) || inv.slug}
                      existingReview={reviewByInv.get(inv.id) ?? null}
                      labels={{
                        viewPublic: p.viewPublic,
                        openDashboard: p.openDashboard,
                        payNow: ap.payNow,
                        renewNow: ap.renewNow,
                        processing: ap.processing,
                        more: p.moreActions,
                        showLess: p.showLess,
                      }}
                    />
                  </li>
                )
              })}
            </ul>
          )}

          <AccountDataSection pending={pendingDeletion} />
        </div>
      </main>
    </>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, var(--surface-warm) 0%, var(--surface-sunken) 100%)',
  padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 48px) 64px',
  fontFamily: 'var(--font-body, system-ui)',
  color: 'var(--text-primary)',
}
const wrap: React.CSSProperties = { maxWidth: 720, margin: '0 auto', width: '100%' }
const h1: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 24px',
}
const h2: React.CSSProperties = { fontSize: 18, fontWeight: 600, margin: '32px 0 12px' }
const cardBox: React.CSSProperties = {
  background: 'rgba(255,255,255,0.94)', borderRadius: 'var(--radius-md)', padding: 24,
  boxShadow: '0 20px 60px rgba(42,33,24,0.10)',
}
const rowLabel: React.CSSProperties = {
  fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em',
  color: 'var(--text-muted)', margin: 0,
}
const rowValue: React.CSSProperties = { fontSize: 16, margin: '4px 0 16px' }
const resetLink: React.CSSProperties = {
  color: 'var(--interactive-primary)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 4, fontSize: 14,
}
const emptyCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14,
  padding: 'clamp(32px, 6vw, 48px) 28px',
  background: 'rgba(255,255,255,0.94)', borderRadius: 'var(--radius-md)',
  border: '1px dashed rgba(232,85,62,0.4)',
  boxShadow: '0 20px 60px rgba(42,33,24,0.08)',
}
const emptyIconBadge: React.CSSProperties = {
  display: 'grid', placeItems: 'center', width: 64, height: 64, borderRadius: 'var(--radius-md)',
  background: 'var(--interactive-primary-soft)', color: 'var(--interactive-primary)', marginBottom: 2,
}
const emptyTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: 'clamp(22px, 4vw, 28px)', margin: 0, color: 'var(--text-primary)',
}
const emptyBodyStyle: React.CSSProperties = {
  fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 6px', maxWidth: 380,
}
const list: React.CSSProperties = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }
const item: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 14,
  background: 'rgba(255,255,255,0.94)', borderRadius: 'var(--radius-md)', padding: '16px 20px',
  boxShadow: '0 10px 30px rgba(42,33,24,0.08)',
}
const itemSlug: React.CSSProperties = { fontWeight: 600, fontSize: 16 }
const periodChip: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
  background: 'var(--border-subtle)',
  padding: '3px 10px',
  borderRadius: 'var(--radius-pill)',
  alignSelf: 'flex-start',
  marginLeft: -10,
}
