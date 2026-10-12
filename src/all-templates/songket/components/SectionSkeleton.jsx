'use client'

export default function SectionSkeleton({ label = 'section' }) {
  return (
    <div
      role="status"
      aria-label={`Loading ${label}`}
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        padding: '120px 24px',
        background:
          'linear-gradient(135deg, rgba(232,85,62,0.04), rgba(245,200,66,0.04))',
      }}
    >
      <div
        style={{
          width: 'min(540px, 88%)',
          display: 'grid',
          gap: '16px',
        }}
      >
        <div className="skeleton-bar" style={{ height: 18, width: '60%', borderRadius: 'var(--radius-pill)' }} />
        <div className="skeleton-bar" style={{ height: 14, width: '90%', borderRadius: 'var(--radius-pill)' }} />
        <div className="skeleton-bar" style={{ height: 14, width: '80%', borderRadius: 'var(--radius-pill)' }} />
        <div className="skeleton-bar" style={{ height: 14, width: '70%', borderRadius: 'var(--radius-pill)' }} />
      </div>
    </div>
  )
}
