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
            style={{ ...thumb, background: thumbGradient(t.accent) }}
            aria-label={`Preview ${t.label}`}
          >
            <span style={thumbLabel}>{t.label}</span>
            <span style={thumbHint}>{tt.thumbHint}</span>
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
