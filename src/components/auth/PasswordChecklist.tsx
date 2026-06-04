'use client'

import { checkPassword } from '@/lib/auth/passwordPolicy'

/**
 * Live password-requirement checklist. Each rule turns green with a check once
 * satisfied, so the user can see exactly what's missing instead of hitting a
 * blanket "invalid password" error. Hidden until the user starts typing.
 *
 * i18n-agnostic: the four labels are passed in (see auth dict `passwordRules`).
 */
export default function PasswordChecklist({
  password,
  labels,
}: {
  password: string
  labels: { len: string; upper: string; number: string; symbol: string }
}) {
  if (!password) return null

  const c = checkPassword(password)
  const items: { ok: boolean; text: string }[] = [
    { ok: c.length, text: labels.len },
    { ok: c.upper, text: labels.upper },
    { ok: c.number, text: labels.number },
    { ok: c.symbol, text: labels.symbol },
  ]

  return (
    <ul style={list}>
      {items.map((it, i) => (
        <li key={i} style={{ ...row, color: it.ok ? '#2D8C4E' : 'rgba(42,33,24,0.5)' }}>
          <span aria-hidden style={{ width: 14, display: 'inline-block' }}>{it.ok ? '✓' : '○'}</span>
          {it.text}
        </li>
      ))}
    </ul>
  )
}

const list: React.CSSProperties = {
  listStyle: 'none',
  margin: '2px 0 0',
  padding: 0,
  display: 'grid',
  gap: 3,
}
const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  lineHeight: 1.4,
  transition: 'color 0.15s ease',
}
