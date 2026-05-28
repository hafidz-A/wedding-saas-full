/**
 * Dashboard route-level loading state — shown by Next.js while the
 * server-side fetches (rsvps + gifts + notes + guests) are pending.
 * Better than a blank screen during cold-start or slow network.
 */
export default function DashboardLoading() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#F5EFE3',
        fontFamily: 'var(--font-body, system-ui)',
        color: '#2A2118',
      }}
    >
      {/* Header skeleton */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 28px',
          borderBottom: '1px solid rgba(42,33,24,0.08)',
          background: 'rgba(255,255,255,0.7)',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={shimmer(80, 11)} />
          <div style={shimmer(180, 22)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={shimmer(80, 28, 999)} />
          <div style={shimmer(100, 30, 999)} />
        </div>
      </header>

      {/* Tab nav skeleton */}
      <nav
        style={{
          display: 'flex',
          gap: 12,
          padding: '0 28px',
          borderBottom: '1px solid rgba(42,33,24,0.06)',
        }}
      >
        {[60, 50, 50, 50, 50, 50, 80].map((w, i) => (
          <div key={i} style={{ ...shimmer(w, 36), borderRadius: 0, margin: '6px 0' }} />
        ))}
      </nav>

      {/* Content skeleton */}
      <section style={{ padding: 28 }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.85)',
            borderRadius: 18,
            padding: 28,
            boxShadow: '0 12px 36px rgba(42,33,24,0.06)',
          }}
        >
          <div style={shimmer(220, 28)} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginTop: 20 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ ...shimmer(0, 70), width: '100%', borderRadius: 12 }} />
            ))}
          </div>
          <div style={{ height: 18 }} />
          <div style={{ ...shimmer(0, 44), width: '100%', borderRadius: 10 }} />
          <div style={{ height: 14 }} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ ...shimmer(0, 52), width: '100%', borderRadius: 8, marginBottom: 8 }} />
          ))}
        </div>
      </section>

      <style>{`
        @keyframes dashboardShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </main>
  )
}

function shimmer(width: number, height: number, radius = 6): React.CSSProperties {
  return {
    width: width || 'auto',
    height,
    borderRadius: radius,
    background:
      'linear-gradient(90deg, rgba(42,33,24,0.06) 0%, rgba(42,33,24,0.12) 50%, rgba(42,33,24,0.06) 100%)',
    backgroundSize: '200% 100%',
    animation: 'dashboardShimmer 1.4s ease-in-out infinite',
  }
}
