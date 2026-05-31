'use client'

import { useState } from 'react'
import { useDashboardDict } from './DashboardI18nProvider'

type Swatch = { key: string; label: string; swatch: string }

const SOLARY_DARK: Swatch[] = [
  { key: 'cosmicDark', label: 'Purple', swatch: '#7D53DE' },
  { key: 'nebulaDark', label: 'Nebula', swatch: '#c19bff' },
  { key: 'roseDark', label: 'Rose', swatch: '#e64980' },
  { key: 'emeraldDark', label: 'Emerald', swatch: '#0f9f8e' },
]
const SOLARY_LIGHT: Swatch[] = [
  { key: 'lavenderLight', label: 'Lavender', swatch: '#b794f6' },
  { key: 'sunburstLight', label: 'Sunburst', swatch: '#f5c518' },
  { key: 'roseLight', label: 'Rose', swatch: '#f43f5e' },
  { key: 'botanicalLight', label: 'Botanical', swatch: '#3f9142' },
]
const LOVEBIRDS_LIGHT: Swatch[] = [
  { key: 'warmCream', label: 'Warm Cream', swatch: '#E8553E' },
  { key: 'emeraldGarden', label: 'Emerald Garden', swatch: '#2D8C4E' },
  { key: 'skyEditorial', label: 'Sky Editorial', swatch: '#3D9BC1' },
  { key: 'blossomVelvet', label: 'Blossom Velvet', swatch: '#E06B7B' },
  { key: 'sunsetClay', label: 'Sunset Clay', swatch: '#C85A32' },
  { key: 'terracottaOasis', label: 'Terracotta Oasis', swatch: '#FBE3A6' },
]
const LOVEBIRDS_DARK: Swatch[] = [
  { key: 'darkLuxury', label: 'Dark Luxury', swatch: '#F5C842' },
  { key: 'midnightStardust', label: 'Midnight Stardust', swatch: '#E3C08D' },
  { key: 'royalPlum', label: 'Royal Plum', swatch: '#F5C842' },
  { key: 'forestMist', label: 'Forest Mist', swatch: '#9EE0B1' },
]

const TEMPLATE_PALETTES: Record<string, { dark: Swatch[]; light: Swatch[]; fallback: string }> = {
  solary: { dark: SOLARY_DARK, light: SOLARY_LIGHT, fallback: 'cosmicDark' },
  lovebirds: { dark: LOVEBIRDS_DARK, light: LOVEBIRDS_LIGHT, fallback: 'warmCream' },
}

export default function PaletteTab({ slug, template, initial }: { slug: string; template?: string; initial?: string }) {
  const t = useDashboardDict().tabs.palette
  const groups = (template && TEMPLATE_PALETTES[template]) || TEMPLATE_PALETTES.lovebirds
  const [palette, setPalette] = useState(initial || groups.fallback)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/invitation/${slug}/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPalette: palette }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        setMsg({ kind: 'err', text: e.error || t.saveFailed })
        return
      }
      setMsg({ kind: 'ok', text: t.savedOk })
    } catch (e: any) {
      setMsg({ kind: 'err', text: e?.message || t.networkError })
    } finally {
      setSaving(false)
    }
  }

  const Group = ({ title, items }: { title: string; items: Swatch[] }) => (
    <section style={section}>
      <h3 style={h3}>{title}</h3>
      <div style={grid}>
        {items.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPalette(p.key)}
            style={{ ...swatchBtn, borderColor: palette === p.key ? '#2A2118' : 'rgba(42,33,24,0.15)', outline: palette === p.key ? '2px solid #2A2118' : 'none' }}
          >
            <span style={{ ...dot, background: p.swatch }} />
            <span style={{ fontSize: 13 }}>{p.label}</span>
          </button>
        ))}
      </div>
    </section>
  )

  return (
    <div style={card}>
      <header><h2 style={h2}>{t.title}</h2><p style={sub}>{t.subtitle}</p></header>
      <Group title={t.groupDark} items={groups.dark} />
      <Group title={t.groupLight} items={groups.light} />
      <footer style={footer}>
        {msg && <span style={msg.kind === 'ok' ? msgOk : msgErr}>{msg.text}</span>}
        <button type="button" style={btnPrimary} onClick={save} disabled={saving}>
          {saving ? t.saving : t.save}
        </button>
      </footer>
    </div>
  )
}

const card: React.CSSProperties = { background: 'rgba(255,255,255,0.85)', borderRadius: 18, padding: 28, boxShadow: '0 12px 36px rgba(42,33,24,0.06)', display: 'grid', gap: 24 }
const h2: React.CSSProperties = { fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 28, margin: 0 }
const sub: React.CSSProperties = { margin: '6px 0 0', fontSize: 13, color: 'rgba(42,33,24,0.6)' }
const section: React.CSSProperties = { display: 'grid', gap: 12, padding: 18, background: '#fff', borderRadius: 12, border: '1px solid rgba(42,33,24,0.08)' }
const h3: React.CSSProperties = { fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(42,33,24,0.6)', margin: 0, fontWeight: 600 }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }
const swatchBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, border: '1px solid', background: '#fff', cursor: 'pointer', color: '#2A2118' }
const dot: React.CSSProperties = { width: 20, height: 20, borderRadius: '50%', display: 'inline-block' }
const footer: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid rgba(42,33,24,0.06)', paddingTop: 16 }
const btnPrimary: React.CSSProperties = { padding: '10px 18px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3', fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }
const msgOk: React.CSSProperties = { fontSize: 12, color: '#2D8C4E', marginRight: 'auto' }
const msgErr: React.CSSProperties = { fontSize: 12, color: '#E8553E', marginRight: 'auto' }
