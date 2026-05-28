import Link from 'next/link'

export default function NotFound() {
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
          Undangan tidak ditemukan
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
          Hmm — link ini belum aktif.
        </h1>
        <p style={{ fontSize: 15, color: '#5C4A3A', lineHeight: 1.6, marginBottom: 28 }}>
          Undangan mungkin belum dipublikasikan oleh pemiliknya, atau alamatnya keliru.
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
          Kembali ke beranda
        </Link>
      </div>
    </main>
  )
}
