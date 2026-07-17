'use client'

import { useState } from 'react'
import { useEditor } from './EditorProvider'
import ctrl from '@/app/[template]/[slug]/dashboard/dashboardControls.module.css'

interface Props {
  slug: string
  template: string
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile'

const DEVICE_CONFIG: Record<DeviceMode, { label: string; icon: string; width: number | '100%'; height: number }> = {
  desktop: { label: 'Desktop', icon: '🖥', width: '100%', height: 620 },
  tablet:  { label: 'Tablet',  icon: '⬜', width: 768,    height: 680 },
  mobile:  { label: 'Mobile',  icon: '📱', width: 390,    height: 760 },
}

export default function PreviewPane({ slug, template }: Props) {
  const { lastSavedAt, isDirty } = useEditor()
  // Single tick that bumps on ANY interaction (device switch OR refresh).
  // Used as the iframe React `key`, so the iframe fully unmounts +
  // remounts → page reloads from the very top, GSAP timelines reset,
  // music popup re-arms, etc. Clicking the SAME device twice also
  // increments the tick so the user can use it as a "scroll to top".
  const [iframeKey, setIframeKey] = useState(0)
  const [device, setDevice] = useState<DeviceMode>('desktop')
  const v = `${lastSavedAt || 'init'}-${iframeKey}`
  const cfg = DEVICE_CONFIG[device]

  const switchDevice = (d: DeviceMode) => {
    if (d !== device) setDevice(d)
    setIframeKey((n) => n + 1)
  }

  const refreshPreview = () => setIframeKey((n) => n + 1)

  return (
    <section style={wrap}>
      <header style={hdr}>
        <div style={hdrLeft}>
          <p style={kicker}>Preview</p>
          {isDirty && <p style={dirtyHint}>● Unsaved — Save to update</p>}
        </div>
        <div style={deviceToggle}>
          {(Object.keys(DEVICE_CONFIG) as DeviceMode[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => switchDevice(d)}
              style={d === device ? deviceBtnActive : deviceBtn}
              title={`${DEVICE_CONFIG[d].label} — klik untuk refresh preview`}
            >
              <span>{DEVICE_CONFIG[d].icon}</span>
              <span>{DEVICE_CONFIG[d].label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={refreshPreview}
          className={ctrl.iconBtn}
          title="Refresh preview"
        >↻</button>
      </header>

      <div style={{ ...stageWrap, padding: 'clamp(10px, 2vw, 24px)' }}>
        <div
          style={{
            ...deviceFrame,
            width: cfg.width === '100%' ? '100%' : 'min(100%, ' + cfg.width + 'px)',
            maxWidth: '100%',
            height: 'min(' + cfg.height + 'px, 70vh)',
            boxSizing: 'border-box',
          }}
        >
          {cfg.width !== '100%' && (
            <div style={deviceBar}>
              <span style={deviceDot} />
              <span style={{ ...deviceDot, flex: 1, borderRadius: 4 }} />
              <span style={deviceDot} />
            </div>
          )}
          <iframe
            key={v}
            src={`/${template}/${slug}?preview=1&v=${encodeURIComponent(v)}`}
            style={{ ...frame, height: '100%' }}
            title={`Invitation preview — ${cfg.label}`}
          />
        </div>
      </div>
    </section>
  )
}

const wrap: React.CSSProperties = {
  borderTop: '1px solid var(--border-subtle)',
  background: 'var(--surface-warm)',
  display: 'flex',
  flexDirection: 'column',
}

const hdr: React.CSSProperties = {
  padding: '12px 18px',
  borderBottom: '1px solid var(--border-subtle)',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  background: 'rgba(255,255,255,0.6)',
}

const hdrLeft: React.CSSProperties = { flex: 1, minWidth: 120 }

const kicker: React.CSSProperties = {
  margin: 0,
  fontSize: 10,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: 'var(--interactive-primary)',
}

const dirtyHint: React.CSSProperties = {
  margin: '3px 0 0',
  fontSize: 11,
  color: 'rgba(232,85,62,0.85)',
}

const deviceToggle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  background: 'var(--border-subtle)',
  borderRadius: 'var(--radius-pill)',
  padding: 4,
}

const deviceBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 12px',
  borderRadius: 'var(--radius-pill)',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 12,
  color: 'var(--text-muted)',
  letterSpacing: '0.04em',
}

const deviceBtnActive: React.CSSProperties = {
  ...deviceBtn,
  background: 'var(--surface-raised)',
  color: 'var(--text-primary)',
  fontWeight: 600,
  boxShadow: '0 1px 4px rgba(42,33,24,0.1)',
}

const stageWrap: React.CSSProperties = {
  flex: 1,
  padding: '20px 24px 24px',
  display: 'flex',
  justifyContent: 'center',
  overflow: 'auto',
  background: '#ede8dc',
}

const deviceFrame: React.CSSProperties = {
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(42,33,24,0.18), 0 0 0 1px rgba(42,33,24,0.1)',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--surface-raised)',
  flexShrink: 0,
}

const deviceBar: React.CSSProperties = {
  height: 28,
  background: 'var(--border-subtle)',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 12px',
  flexShrink: 0,
}

const deviceDot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 'var(--radius-round)',
  background: 'var(--border-strong)',
  flexShrink: 0,
}

const frame: React.CSSProperties = {
  width: '100%',
  border: 'none',
  display: 'block',
  flex: 1,
}
