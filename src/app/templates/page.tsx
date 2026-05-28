import Link from 'next/link'
import { templateCatalog } from '@/config/templateCatalog'

/**
 * Template gallery — browse every available invitation template before
 * signing up. Each card links to a full demo preview (with a real slug)
 * and to onboarding pre-seeded with that template.
 *
 * Server component, no auth.
 */
export const metadata = {
  title: 'Pilih Template — Wedding Invitation',
  description: 'Browse and preview our cinematic wedding invitation templates.',
}

export default function TemplatesPage() {
  return (
    <main style={page}>
      <div style={{ maxWidth: 1080, margin: '0 auto', width: '100%' }}>
        <header style={{ textAlign: 'center', marginBottom: 'clamp(32px, 6vw, 56px)' }}>
          <p style={kicker}>Template Gallery</p>
          <h1 style={h1}>Pilih gaya undangan kamu</h1>
          <p style={lede}>
            Setiap template punya karakter sendiri. Lihat preview lengkapnya dulu,
            lalu pilih yang paling cocok dengan cerita kalian.
          </p>
        </header>

        <div style={grid}>
          {templateCatalog.map((t) => (
            <article key={t.id} style={card}>
              <Link
                href={`/${t.id}/${t.demoSlug}`}
                style={{ ...thumb, background: thumbGradient(t.accent) }}
                aria-label={`Preview ${t.label}`}
              >
                <span style={thumbLabel}>{t.label}</span>
                <span style={thumbHint}>Klik untuk preview →</span>
              </Link>

              <div style={cardBody}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <h2 style={cardTitle}>{t.label}</h2>
                  <span style={{ ...dot, background: t.accent }} />
                  <span style={tagRow}>{t.tags.join(' · ')}</span>
                </div>
                <p style={desc}>{t.description}</p>

                <div style={actions}>
                  <Link href={`/${t.id}/${t.demoSlug}`} target="_blank" style={previewBtn}>
                    Lihat preview ↗
                  </Link>
                  <Link
                    href={`/onboarding?template=${t.id}`}
                    style={{ ...useBtn, background: t.accent }}
                  >
                    Gunakan template ini →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 40, fontSize: 13, color: 'rgba(42,33,24,0.6)' }}>
          Sudah punya akun?{' '}
          <Link href="/login" style={{ color: '#2A2118', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 4 }}>
            Login di sini →
          </Link>
        </p>
      </div>
    </main>
  )
}

function thumbGradient(accent: string) {
  return `linear-gradient(135deg, ${accent} 0%, #2A2118 100%)`
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
  padding: 'clamp(32px, 6vw, 72px) clamp(20px, 5vw, 48px)',
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
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.94)',
  borderRadius: 20,
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(42,33,24,0.12)',
  display: 'flex',
  flexDirection: 'column',
}
const thumb: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  gap: 6,
  aspectRatio: '16 / 10',
  padding: 24,
  textDecoration: 'none',
  color: '#FFF8EE',
}
const thumbLabel: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontStyle: 'italic',
  fontSize: 32,
  lineHeight: 1,
}
const thumbHint: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  opacity: 0.85,
}
const cardBody: React.CSSProperties = { padding: 24, display: 'flex', flexDirection: 'column', flex: 1 }
const cardTitle: React.CSSProperties = { fontSize: 20, fontWeight: 600, margin: 0 }
const dot: React.CSSProperties = { width: 8, height: 8, borderRadius: 999, display: 'inline-block' }
const tagRow: React.CSSProperties = { fontSize: 12, color: 'rgba(42,33,24,0.55)', letterSpacing: '0.04em' }
const desc: React.CSSProperties = { fontSize: 14, lineHeight: 1.6, color: '#5C4A3A', margin: '0 0 20px', flex: 1 }
const actions: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 10 }
const previewBtn: React.CSSProperties = {
  padding: '11px 18px',
  borderRadius: 999,
  border: '1px solid rgba(42,33,24,0.2)',
  background: 'transparent',
  color: '#2A2118',
  fontSize: 12,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  textDecoration: 'none',
}
const useBtn: React.CSSProperties = {
  padding: '11px 18px',
  borderRadius: 999,
  color: '#FFF8EE',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  border: 'none',
}
