'use client'

import React, { useCallback, type RefObject } from 'react'
import { toggleFormat, parseWaFormatting, type WaMarker, type WaNode } from '@/lib/guests/waFormat'
import { useDashboardDict } from './DashboardI18nProvider'
import ctrl from './dashboardControls.module.css'

/**
 * Word-style B / I / S for the WhatsApp invite message textareas. WhatsApp has
 * no rich text, so these insert/remove its markers (*bold*, _italic_,
 * ~strike~) — see src/lib/guests/waFormat.ts for the rules.
 */
export function useWaFormat(
  ref: RefObject<HTMLTextAreaElement>,
  value: string,
  onChange: (next: string) => void,
) {
  const t = useDashboardDict().tabs.guests

  const apply = useCallback(
    (marker: WaMarker) => {
      const ta = ref.current
      if (!ta) return
      const next = toggleFormat(value, ta.selectionStart, ta.selectionEnd, marker, t.fmtPlaceholder)
      if (next.value === value) return

      // Replace only the changed span through the browser's own editing
      // command, so Ctrl+Z undoes the formatting like any typed edit. React
      // sees it as a normal input event and updates state via onChange.
      let p = 0
      while (p < value.length && p < next.value.length && value[p] === next.value[p]) p++
      let q = 0
      while (
        q < value.length - p &&
        q < next.value.length - p &&
        value[value.length - 1 - q] === next.value[next.value.length - 1 - q]
      ) q++
      const insert = next.value.slice(p, next.value.length - q)

      ta.focus()
      ta.setSelectionRange(p, value.length - q)
      let ok = false
      try {
        ok = insert
          ? document.execCommand('insertText', false, insert)
          : document.execCommand('delete', false)
      } catch {
        ok = false
      }
      if (ok && ta.value === next.value) {
        ta.setSelectionRange(next.start, next.end)
        return
      }
      // Fallback (execCommand unsupported): set state, restore the selection
      // once React has written the new value.
      onChange(next.value)
      requestAnimationFrame(() => {
        ta.focus()
        ta.setSelectionRange(next.start, next.end)
      })
    },
    [ref, value, onChange, t.fmtPlaceholder],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return
      const key = e.key.toLowerCase()
      if (key === 'b' || key === 'i') {
        e.preventDefault()
        apply(key === 'b' ? '*' : '_')
      }
    },
    [apply],
  )

  return { apply, onKeyDown }
}

export function WaFormatToolbar({ onFormat }: { onFormat: (m: WaMarker) => void }) {
  const t = useDashboardDict().tabs.guests
  const buttons: Array<{ m: WaMarker; label: string; glyph: React.ReactNode }> = [
    { m: '*', label: t.fmtBold, glyph: <b>B</b> },
    { m: '_', label: t.fmtItalic, glyph: <i style={{ fontFamily: 'Georgia, serif' }}>I</i> },
    { m: '~', label: t.fmtStrike, glyph: <s>S</s> },
  ]
  return (
    <div role="toolbar" aria-label={t.fmtToolbar} style={bar}>
      {buttons.map((b) => (
        <button
          key={b.m}
          type="button"
          className={ctrl.iconBtn}
          aria-label={b.label}
          title={b.label}
          // Keep focus (and the highlighted text) in the textarea on desktop.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onFormat(b.m)}
        >
          {b.glyph}
        </button>
      ))}
      <span style={hintStyle}>{t.fmtHint}</span>
    </div>
  )
}

/** Render a message the way WhatsApp shows it (bold/italic/strike/mono). */
export function WaFormattedText({ text }: { text: string }) {
  return <>{renderNodes(parseWaFormatting(text))}</>
}

function renderNodes(nodes: WaNode[]): React.ReactNode[] {
  return nodes.map((n, i) => {
    if (typeof n === 'string') return <React.Fragment key={i}>{n}</React.Fragment>
    if (n.type === 'mono') return <code key={i} style={mono}>{n.text}</code>
    const kids = renderNodes(n.children)
    if (n.type === 'bold') return <strong key={i}>{kids}</strong>
    if (n.type === 'italic') return <em key={i}>{kids}</em>
    return <s key={i}>{kids}</s>
  })
}

const bar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }
const hintStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', marginLeft: 4, flex: '1 1 200px' }
const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.95em' }
