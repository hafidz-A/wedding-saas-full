'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Dict } from '@/lib/i18n'

interface Plan {
  id: string
  name: string
  price: string
  features: string[]
}
interface TemplateEntry {
  id: string
  label: string
  description: string
  demoSlug: string
  accent: string
  tags: string[]
  plans?: Plan[]
}

export function TemplateCard({ t, tt }: { t: TemplateEntry; tt: Dict['templates'] }) {
  const [flipped, setFlipped] = useState(false)
  const desc = (tt.byTemplate as Record<string, string>)[t.id] ?? t.description
  const plans = t.plans ?? []

  return (
    <div style={{ ...outer, perspective: 1200 }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)',
          transform: flipped ? 'rotateY(180deg)' : 'none',
        }}
      >
        {/* FRONT */}
        <article style={{ ...face, ...card }}>
          <Link
            href={`/${t.id}/${t.demoSlug}`}
            style={{
              ...thumb,
              ...(t.id === 'lovebirds' ? lovebirdsBgStyle : solaryBgStyle),
              position: 'relative',
              overflow: 'hidden',
            }}
            aria-label={`Preview ${t.label}`}
          >
            {/* If lovebirds, show mini botanical borders */}
            {t.id === 'lovebirds' && (
              <>
                <div style={botanicalLeft} />
                <div style={botanicalRight} />
              </>
            )}
            {/* If solary, show orbits */}
            {t.id === 'solary' && (
              <>
                <div style={nebulaStyle} />
                <svg
                  viewBox="0 0 100 100"
                  style={{
                    position: 'absolute',
                    top: '10%',
                    left: '10%',
                    width: '80%',
                    height: '80%',
                    opacity: 0.6,
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                >
                  <circle cx="50" cy="50" r="25" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  <circle cx="50" cy="25" r="2.5" fill="#6B35A8" />
                  <circle cx="50" cy="10" r="1.5" fill="#F5C842" />
                </svg>
              </>
            )}
            <span style={{ ...thumbLabel, zIndex: 3, position: 'relative', color: t.id === 'lovebirds' ? '#2A2118' : '#FFF8EE' }}>{t.label}</span>
            <span style={{ ...thumbHint, zIndex: 3, position: 'relative', color: t.id === 'lovebirds' ? '#5C4A3A' : 'rgba(255, 248, 238, 0.8)' }}>{tt.thumbHint}</span>
          </Link>
          <div style={cardBody}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <h2 style={cardTitle}>{t.label}</h2>
              <span style={{ ...dot, background: t.accent }} />
              <span style={tagRow}>{t.tags.join(' · ')}</span>
            </div>
            <p style={descStyle}>{desc}</p>
            <div style={actions}>
              <Link href={`/${t.id}/${t.demoSlug}`} target="_blank" style={previewBtn}>
                {tt.previewBtn}
              </Link>
              <button type="button" onClick={() => setFlipped(true)} style={{ ...useBtn, background: t.accent }}>
                {tt.flip}
              </button>
            </div>
          </div>
        </article>

        {/* BACK */}
        <article style={{ ...face, ...card, ...backFace }}>
          <div style={{ ...cardBody, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
              <h2 style={cardTitle}>{t.label}</h2>
              <button type="button" onClick={() => setFlipped(false)} style={backBtn}>
                {tt.back}
              </button>
            </div>
            <p style={{ ...descStyle, marginBottom: 16 }}>{desc}</p>
            <p style={plansTitleStyle}>{tt.plansTitle}</p>
            <div style={planListStyle}>
              {plans.map((pl) => (
                <div key={pl.id} style={planCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={planName}>{pl.name}</span>
                    <span style={{ ...planPrice, color: t.accent }}>{pl.price}</span>
                  </div>
                  <ul style={featureList}>
                    {pl.features.map((f) => (
                      <li key={f} style={featureItem}>{f}</li>
                    ))}
                  </ul>
                  <Link
                    href={`/onboarding?template=${t.id}&plan=${pl.id}`}
                    style={{ ...choosePlanBtn, background: t.accent }}
                  >
                    {tt.choosePlan}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}

function thumbGradient(accent: string) {
  return `linear-gradient(135deg, ${accent} 0%, #2A2118 100%)`
}

const outer: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 'clamp(440px, 56vw, 500px)',
}
const face: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.94)',
  borderRadius: 20,
  boxShadow: '0 20px 60px rgba(42,33,24,0.12)',
}
const backFace: React.CSSProperties = { transform: 'rotateY(180deg)' }
const thumb: React.CSSProperties = {
  height: '52%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  gap: 6,
  padding: 24,
  textDecoration: 'none',
  color: '#FFF8EE',
  flex: '0 0 auto',
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
const cardBody: React.CSSProperties = { padding: 24, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }
const cardTitle: React.CSSProperties = { fontSize: 20, fontWeight: 600, margin: 0 }
const dot: React.CSSProperties = { width: 8, height: 8, borderRadius: 999, display: 'inline-block' }
const tagRow: React.CSSProperties = { fontSize: 12, color: 'rgba(42,33,24,0.55)', letterSpacing: '0.04em' }
const descStyle: React.CSSProperties = { fontSize: 14, lineHeight: 1.6, color: '#5C4A3A', margin: '0 0 20px' }
const actions: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 'auto' }
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
  cursor: 'pointer',
  fontFamily: 'inherit',
}
const backBtn: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 999,
  border: '1px solid rgba(42,33,24,0.2)',
  background: 'transparent',
  color: '#2A2118',
  fontSize: 11,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
}
const plansTitleStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  color: 'rgba(42,33,24,0.55)',
  margin: '0 0 10px',
}
const planListStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }
const planCardStyle: React.CSSProperties = {
  border: '1px solid rgba(42,33,24,0.14)',
  borderRadius: 14,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}
const planName: React.CSSProperties = { fontSize: 15, fontWeight: 600 }
const planPrice: React.CSSProperties = { fontSize: 15, fontWeight: 700 }
const featureList: React.CSSProperties = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }
const featureItem: React.CSSProperties = { fontSize: 12, color: '#5C4A3A' }
const choosePlanBtn: React.CSSProperties = {
  marginTop: 2,
  padding: '10px 16px',
  borderRadius: 999,
  color: '#FFF8EE',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  textAlign: 'center',
}

const lovebirdsBgStyle: React.CSSProperties = {
  backgroundColor: '#FDF6EC',
  backgroundImage: `
    radial-gradient(50% 38% at 50% 82%, rgba(232, 85, 62, 0.18), transparent 70%),
    radial-gradient(40% 32% at 12% 18%, rgba(245, 200, 66, 0.18), transparent 70%),
    radial-gradient(40% 32% at 88% 16%, rgba(45, 140, 78, 0.11), transparent 70%),
    radial-gradient(38% 28% at 8%  84%, rgba(107, 53, 168, 0.11), transparent 70%),
    radial-gradient(38% 28% at 92% 82%, rgba(61, 155, 193, 0.11), transparent 70%),
    linear-gradient(180deg, #FDF6EC 0%, #F5EFE3 100%)
  `,
  backgroundSize: '100% 100%',
  backgroundRepeat: 'no-repeat',
}

const solaryBgStyle: React.CSSProperties = {
  backgroundColor: '#06061a',
  backgroundImage: `
    radial-gradient(circle, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
    radial-gradient(circle at 20% 20%, rgba(193, 155, 255, 0.15), transparent 70%)
  `,
  backgroundSize: '18px 18px, 100% 100%',
  backgroundRepeat: 'repeat, no-repeat',
}

const botanicalLeft: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 4,
  width: 24,
  opacity: 0.4,
  backgroundRepeat: 'repeat-y',
  backgroundSize: '100% auto',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 180' fill='none' stroke='%236b5c4a' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 0 C15 30 12 60 18 90 C12 120 15 150 10 180' /%3E%3Cpath d='M14 25 C22 23 25 18 16 16 M15 65 C25 62 29 67 18 69 M15 110 C25 107 29 102 18 100 M13 145 C23 142 27 147 16 149' /%3E%3Cpath d='M8 40 C0 38 -3 33 6 31 M9 85 C-1 82 -5 87 6 89 M9 125 C-1 122 -5 117 6 115 M7 160 C-3 158 -7 163 4 165' /%3E%3C/svg%3E")`,
  pointerEvents: 'none',
  zIndex: 2,
}

const botanicalRight: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  right: 4,
  width: 24,
  opacity: 0.4,
  backgroundRepeat: 'repeat-y',
  backgroundSize: '100% auto',
  transform: 'scaleX(-1)',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 180' fill='none' stroke='%236b5c4a' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 0 C15 30 12 60 18 90 C12 120 15 150 10 180' /%3E%3Cpath d='M14 25 C22 23 25 18 16 16 M15 65 C25 62 29 67 18 69 M15 110 C25 107 29 102 18 100 M13 145 C23 142 27 147 16 149' /%3E%3Cpath d='M8 40 C0 38 -3 33 6 31 M9 85 C-1 82 -5 87 6 89 M9 125 C-1 122 -5 117 6 115 M7 160 C-3 158 -7 163 4 165' /%3E%3C/svg%3E")`,
  pointerEvents: 'none',
  zIndex: 2,
}

const nebulaStyle: React.CSSProperties = {
  position: 'absolute',
  width: '60%',
  height: '60%',
  top: '20%',
  left: '20%',
  background: 'radial-gradient(circle, rgba(107, 53, 168, 0.3) 0%, transparent 70%)',
  filter: 'blur(16px)',
  pointerEvents: 'none',
  zIndex: 1,
}
