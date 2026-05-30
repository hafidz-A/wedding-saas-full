import Link from 'next/link'
import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'

export default function NotFound() {
  const t = getDict(getLang()).common.invitationNotFound
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
        padding: '40px',
        fontFamily: 'var(--font-body, system-ui)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <p style={{ textTransform: 'uppercase', letterSpacing: '0.36em', fontSize: 12, color: '#E8553E', marginBottom: 12 }}>
          {t.kicker}
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display, serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(40px, 6vw, 64px)',
            color: '#2A2118',
            margin: '0 0 16px',
          }}
        >
          {t.title}
        </h1>
        <p style={{ fontSize: 15, color: '#5C4A3A', lineHeight: 1.6, marginBottom: 28 }}>
          {t.body}
        </p>
        <Link
          href="/"
          style={{
            padding: '14px 26px',
            borderRadius: 999,
            background: '#2A2118',
            color: '#F5EFE3',
            fontSize: 13,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          {t.backHome}
        </Link>
      </div>
    </main>
  )
}
