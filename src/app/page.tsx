import Link from 'next/link'

/**
 * Marketing / template showcase page.
 * Visitors landing on `/` see the pitch + a "View live template" link.
 * Real couples land on `/<slug>` instead.
 */
export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
        padding: '40px',
        fontFamily: 'var(--font-body, system-ui)',
      }}
    >
      <div style={{ maxWidth: 640, textAlign: 'center' }}>
        <p
          style={{
            textTransform: 'uppercase',
            letterSpacing: '0.36em',
            fontSize: 12,
            color: '#E8553E',
            marginBottom: 12,
          }}
        >
          Cinematic wedding invitations
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display, serif)',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 'clamp(48px, 7vw, 88px)',
            lineHeight: 1,
            margin: '0 0 24px',
            color: '#2A2118',
          }}
        >
          Your love story, beautifully told.
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: '#5C4A3A', marginBottom: 32 }}>
          A premium digital wedding invitation, designed cinematic from first scroll to RSVP.
          Pick a template, share your dates, send the link.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          <Link
            href="/templates"
            style={{
              padding: '16px 32px',
              borderRadius: 999,
              background: '#2A2118',
              color: '#F5EFE3',
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Lihat semua template →
          </Link>
          <Link
            href="/signup"
            style={{
              padding: '16px 32px',
              borderRadius: 999,
              background: '#E8553E',
              color: '#FFF8EE',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(232,85,62,0.25)',
            }}
          >
            Book Invitation Wedding →
          </Link>
        </div>
        <p style={{ marginTop: 28, fontSize: 13, color: 'rgba(42,33,24,0.6)' }}>
          Sudah punya akun?{' '}
          <Link
            href="/login"
            style={{
              color: '#2A2118',
              fontWeight: 600,
              textDecoration: 'underline',
              textUnderlineOffset: 4,
            }}
          >
            Login di sini →
          </Link>
        </p>
        <p style={{ marginTop: 16, fontSize: 13, color: 'rgba(42,33,24,0.55)' }}>
          Preview template di <code>/templates</code>
        </p>
      </div>
    </main>
  )
}
