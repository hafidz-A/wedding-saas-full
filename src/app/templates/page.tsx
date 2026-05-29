import Link from 'next/link'
import { templateCatalog } from '@/config/templateCatalog'
import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'
import { SiteNav } from '@/components/site/SiteNav'
import { TemplateCard } from './TemplateCard'

/**
 * Template gallery — browse every available invitation template before
 * signing up. Each card flips to reveal the template's description + the
 * plans available for it.
 *
 * Server component, no auth. The card flip + plan selection is handled by the
 * client component TemplateCard.
 */
export const metadata = {
  title: 'Pilih Template — finWedding',
  description: 'Browse and preview our cinematic wedding invitation templates.',
}

export default function TemplatesPage() {
  const lang = getLang()
  const dict = getDict(lang)
  const tt = dict.templates
  return (
    <>
      <SiteNav lang={lang} t={dict.common} />
      <main style={page}>
      <div style={{ maxWidth: 1080, margin: '0 auto', width: '100%' }}>
        <header style={{ textAlign: 'center', marginBottom: 'clamp(32px, 6vw, 56px)' }}>
          <p style={kicker}>{tt.kicker}</p>
          <h1 style={h1}>{tt.title}</h1>
          <p style={lede}>{tt.lede}</p>
        </header>

        <div style={grid}>
          {templateCatalog.map((t) => (
            <TemplateCard key={t.id} t={t} tt={tt} />
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 40, fontSize: 13, color: 'rgba(42,33,24,0.6)' }}>
          {tt.haveAccount}{' '}
          <Link href="/login" style={{ color: '#2A2118', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 4 }}>
            {tt.loginLink}
          </Link>
        </p>
      </div>
      </main>
    </>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
  padding: 'clamp(32px, 6vw, 72px) clamp(20px, 5vw, 48px)',
  paddingTop: 'clamp(96px, 12vw, 128px)',
  fontFamily: 'var(--font-body, system-ui)',
  color: '#2A2118',
}
const kicker: React.CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.36em',
  fontSize: 12,
  color: '#E8553E',
  marginBottom: 12,
}
const h1: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontStyle: 'italic',
  fontWeight: 500,
  fontSize: 'clamp(36px, 6vw, 64px)',
  lineHeight: 1.05,
  margin: '0 0 16px',
}
const lede: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.7,
  color: '#5C4A3A',
  maxWidth: 560,
  margin: '0 auto',
}
const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 'clamp(20px, 3vw, 32px)',
}
