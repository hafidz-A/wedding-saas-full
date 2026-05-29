import Link from 'next/link'
import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'
import { SiteNav } from '@/components/site/SiteNav'

export default function NotFound() {
  const lang = getLang()
  const t = getDict(lang)
  const nf = t.common.notFound
  return (
    <>
      <SiteNav lang={lang} t={t.common} />
      <main style={page}>
        <div style={card}>
          <p style={code}>{nf.code}</p>
          <h1 style={h1}>{nf.title}</h1>
          <p style={body}>{nf.body}</p>
          <Link href="/" style={cta}>{nf.backHome}</Link>
        </div>
      </main>
    </>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
  padding: '120px 24px 48px',
  fontFamily: 'var(--font-body, system-ui)',
  color: '#2A2118',
}
const card: React.CSSProperties = { maxWidth: 480, textAlign: 'center' }
const code: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontStyle: 'italic',
  fontSize: 'clamp(64px, 16vw, 120px)',
  lineHeight: 1,
  color: '#E8553E',
  margin: 0,
}
const h1: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontStyle: 'italic',
  fontSize: 'clamp(28px, 5vw, 40px)',
  margin: '8px 0 12px',
}
const body: React.CSSProperties = { fontSize: 16, lineHeight: 1.7, color: '#5C4A3A', margin: '0 0 28px' }
const cta: React.CSSProperties = {
  display: 'inline-block',
  padding: '14px 28px',
  borderRadius: 999,
  background: '#2A2118',
  color: '#F5EFE3',
  fontSize: 13,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  textDecoration: 'none',
}
