import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'
import { SiteNav } from '@/components/site/SiteNav'
import OnboardingForm from './OnboardingForm'

/**
 * Onboarding wizard — runs after a freshly-verified user lands here from
 * the email verification link. Server-side:
 *
 *   1. Confirm an authenticated session exists. If not → bounce to /signup.
 *   2. Check whether this user already owns an invitation. If yes → redirect
 *      to /<existing-slug>/dashboard (idempotent: refreshing this URL after
 *      onboarding is harmless).
 *   3. Render the 5-field form.
 */
export default async function OnboardingPage() {
  const lang = getLang()
  const t = getDict(lang)
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <>
        <SiteNav lang={lang} t={t.common} />
        <main style={panel}>
        <div style={card}>
          <p style={kicker}>{t.onboarding.noSession.kicker}</p>
          <h1 style={h1}>{t.onboarding.noSession.title}</h1>
          <p style={muted}>{t.onboarding.noSession.body}</p>
          <Link
            href="/signup"
            style={{
              display: 'inline-block',
              marginTop: 16,
              padding: '12px 24px',
              background: '#2A2118',
              color: '#F5EFE3',
              borderRadius: 999,
              textDecoration: 'none',
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {t.onboarding.noSession.backToSignup}
          </Link>
        </div>
        </main>
      </>
    )
  }

  // One account may own many invitations, so onboarding always lets the user
  // create a new one (no redirect to an existing invitation).

  return (
    <>
      <SiteNav lang={lang} t={t.common} />
      <OnboardingForm email={user.email ?? ''} dict={t.onboarding} lang={lang} />
    </>
  )
}

const panel: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
  padding: 24,
  fontFamily: 'var(--font-body, system-ui)',
}
const card: React.CSSProperties = {
  maxWidth: 440,
  padding: 36,
  background: 'rgba(255,255,255,0.95)',
  borderRadius: 20,
  boxShadow: '0 20px 60px rgba(42,33,24,0.12)',
}
const kicker: React.CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.32em',
  fontSize: 11,
  color: '#E8553E',
  margin: '0 0 8px',
}
const h1: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontStyle: 'italic',
  fontSize: 32,
  margin: 0,
  color: '#2A2118',
}
const muted: React.CSSProperties = { margin: '8px 0 0', color: '#5C4A3A', lineHeight: 1.6 }
