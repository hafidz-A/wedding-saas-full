'use client'

import { useEditor } from './EditorProvider'
import { coupleDisplay } from '@/lib/meta/couple'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'

export default function CouplePanel() {
  const { config, updateCouple } = useEditor()
  const t = useDashboardDict().editor.couplePanel
  const couple = config.couple || {}
  const display = coupleDisplay(couple)

  return (
    <section style={card}>
      <div style={{ borderLeft: '4px solid var(--interactive-primary)', paddingLeft: 14 }}>
        <h2 style={h2}>{t.heading}</h2>
        <p style={hint}>{t.hint}</p>
      </div>
      <div style={grid}>
        <label style={field}>
          <span style={lbl}>{t.name1}</span>
          <input
            type="text"
            value={couple.name1 ?? ''}
            onChange={(e) => updateCouple('name1', e.target.value)}
            placeholder={t.name1Ph}
            style={input}
          />
        </label>
        <label style={field}>
          <span style={lbl}>{t.name2}</span>
          <input
            type="text"
            value={couple.name2 ?? ''}
            onChange={(e) => updateCouple('name2', e.target.value)}
            placeholder={t.name2Ph}
            style={input}
          />
        </label>
      </div>
      <p style={previewLine}>{t.preview}: <strong style={{ color: 'var(--text-primary)' }}>{display || '—'}</strong></p>
    </section>
  )
}

const card: React.CSSProperties = { background: 'rgba(255,255,255,0.85)', borderRadius: 'var(--radius-md)', padding: 'clamp(14px, 2.5vw, 22px)', boxShadow: 'var(--shadow-sm)', display: 'grid', gap: 14, marginBottom: 16 }
const h2: React.CSSProperties = { fontFamily: 'var(--font-heading)', fontStyle: 'normal', fontSize: 22, margin: 0 }
const hint: React.CSSProperties = { margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)', maxWidth: 620, lineHeight: 1.5 }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
const field: React.CSSProperties = { display: 'grid', gap: 6 }
const lbl: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)' }
const input: React.CSSProperties = { height: 36, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', fontSize: 14, outline: 'none', background: 'var(--surface-raised)', color: 'var(--text-primary)', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
const previewLine: React.CSSProperties = { margin: 0, fontSize: 12, color: 'var(--text-muted)' }
