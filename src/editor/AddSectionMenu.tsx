'use client'

import { useEffect, useRef, useState } from 'react'
import { schemaRegistry } from './schemas'
import { useDashboardDict, useDashboardLang } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { localizeLabel } from './schemas/types'

interface Props {
  onAdd: (sectionType: string, label: string, defaults?: Record<string, unknown>) => void
}

export default function AddSectionMenu({ onAdd }: Props) {
  const t = useDashboardDict().editor
  const lang = useDashboardLang()
  const [open, setOpen] = useState(false)
  const entries = Object.entries(schemaRegistry)

  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10,
          border: '1px dashed rgba(42,33,24,0.25)', background: 'transparent',
          color: 'rgba(42,33,24,0.65)', fontSize: 12, letterSpacing: '0.16em',
          textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        {t.addSection}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0,
            maxHeight: 320, overflow: 'auto', background: '#fff',
            border: '1px solid rgba(42,33,24,0.15)', borderRadius: 10,
            boxShadow: '0 10px 30px rgba(42,33,24,0.10)', zIndex: 20,
          }}
        >
          {entries.map(([type, schema]) => (
            <button
              key={type}
              type="button"
              onClick={() => { onAdd(type, localizeLabel(schema.label, lang), schema.defaults); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px', border: 'none', background: 'transparent',
                fontSize: 13, color: '#2A2118', cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(42,33,24,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {localizeLabel(schema.label, lang)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
