# Self Check-in QR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** One venue QR → guest scans, types name, picks themselves from invited/RSVP names → marked Hadir. Token-gated + idempotent with the existing manual check-in. No third-party service.

**Architecture:** New `invitations.checkin_token` (crypto-random, per invitation). Public page `/[template]/[slug]/checkin` validates the token then renders a neutral client form that hits two rate-limited API routes (`/api/checkin/search`, `/api/checkin/confirm`). Confirm re-derives the name server-side and sets `arrived_at` idempotently on the matched `attendances` row. QR rendered locally with the offline `qrcode` library in a dashboard card.

**Tech Stack:** Next 14 route handlers + server actions, Supabase service_role, `crypto.randomBytes`, `qrcode` (offline), vitest.

---

## Conventions

- Test: `npx vitest run <path>` (tests under `__tests__/`). Typecheck: `npx tsc --noEmit` (NOT `npm run lint` — interactive). No dev server.
- **Git:** branch `feat/solary-editor`; unrelated WIP (`docs/legal/*`, `src/components/legal/LegalLayout.tsx`, `src/components/site/SiteFooter.tsx`) MUST stay untouched. Never `git add -A`/`.`/`-a`. Bracketed paths → `GIT_LITERAL_PATHSPECS=1 git add "<path>"`. Commit per task.
- Two crypto modules: `@/lib/guests/crypto` (key for `guests.name_enc`) vs `@/lib/crypto/app` (key for `rsvps.guest_name_enc` + `attendances.name_enc`). Do not mix them up.

## File structure

**New:** `supabase/migrations/2026-06-09_checkin_token.sql`; `src/lib/checkin/match.ts` (+test); `src/app/api/checkin/search/route.ts`; `src/app/api/checkin/confirm/route.ts`; `src/app/[template]/[slug]/checkin/page.tsx`; `src/app/[template]/[slug]/checkin/CheckinForm.tsx`; `src/app/[template]/[slug]/dashboard/guestbook/CheckinQrCard.tsx`
**Modified:** `guestbook/actions.ts`; `GuestbookTab.tsx`; `DashboardClient.tsx`; `lib/i18n/dictionaries/dashboard.ts`; `package.json`

---

## Task 1: Migration + token actions

**Files:** Create `supabase/migrations/2026-06-09_checkin_token.sql`; Modify `src/app/[template]/[slug]/dashboard/guestbook/actions.ts`

- [ ] **Step 1: Migration** (do NOT apply — file only)

```sql
-- 2026-06-09 — Self check-in: one shared secret token per invitation. Idempotent.
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS checkin_token text;
```

- [ ] **Step 2: Add `randomBytes` import** at the top of `actions.ts`

```ts
import { randomBytes } from 'node:crypto'
```

- [ ] **Step 3: Append the two token actions**

```ts
/** Get the invitation's check-in token, generating + storing one on first use. */
export async function ensureCheckinToken(slug: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  try {
    const invitation_id = await authorizeOwnership(slug)
    const admin = createSupabaseAdminClient()
    const { data: row } = (await admin
      .from('invitations').select('checkin_token').eq('id', invitation_id).maybeSingle()) as { data: { checkin_token: string | null } | null }
    if (row?.checkin_token) return { ok: true, token: row.checkin_token }
    const token = randomBytes(16).toString('hex')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin.from('invitations') as any).update({ checkin_token: token }).eq('id', invitation_id)
    if (error) { console.error('[ensureCheckinToken]', error); return { ok: false, error: 'Gagal membuat token.' } }
    revalidatePath('/[template]/[slug]/dashboard', 'page')
    return { ok: true, token }
  } catch (e) { console.error('[ensureCheckinToken]', e); return { ok: false, error: 'Terjadi kesalahan tak terduga.' } }
}

/** Rotate the token, invalidating the old QR. */
export async function regenerateCheckinToken(slug: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  try {
    const invitation_id = await authorizeOwnership(slug)
    const admin = createSupabaseAdminClient()
    const token = randomBytes(16).toString('hex')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin.from('invitations') as any).update({ checkin_token: token }).eq('id', invitation_id)
    if (error) { console.error('[regenerateCheckinToken]', error); return { ok: false, error: 'Gagal mengganti token.' } }
    revalidatePath('/[template]/[slug]/dashboard', 'page')
    return { ok: true, token }
  } catch (e) { console.error('[regenerateCheckinToken]', e); return { ok: false, error: 'Terjadi kesalahan tak terduga.' } }
}
```

- [ ] **Step 4:** `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
GIT_LITERAL_PATHSPECS=1 git add "supabase/migrations/2026-06-09_checkin_token.sql" "src/app/[template]/[slug]/dashboard/guestbook/actions.ts"
git commit -m "feat(checkin): checkin_token migration + ensure/regenerate actions"
```

---

## Task 2: matchCheckinNames helper (pure)

**Files:** Create `src/lib/checkin/match.ts`; Test `src/lib/checkin/__tests__/match.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { matchCheckinNames, type CheckinCandidate } from '../match'

const c = (kind: 'guest' | 'rsvp', id: string, name: string): CheckinCandidate => ({ kind, id, name })

describe('matchCheckinNames', () => {
  it('returns nothing for queries shorter than 3 chars', () => {
    expect(matchCheckinNames('bu', [c('guest', '1', 'Budi')])).toEqual([])
  })
  it('substring-matches case/space-insensitively', () => {
    const out = matchCheckinNames('  BUD ', [c('guest', '1', 'Budi Santoso'), c('guest', '2', 'Ani')])
    expect(out.map((m) => m.id)).toEqual(['1'])
  })
  it('dedupes by normalized name, preferring an rsvp candidate', () => {
    const out = matchCheckinNames('budi', [c('guest', 'g', 'Budi'), c('rsvp', 'r', 'budi')])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ kind: 'rsvp', id: 'r' })
  })
  it('caps results to the limit', () => {
    const many = Array.from({ length: 9 }, (_, i) => c('guest', String(i), `Budiman ${i}`))
    expect(matchCheckinNames('budiman', many, 5)).toHaveLength(5)
  })
})
```

- [ ] **Step 2: Run → fail.** `npx vitest run src/lib/checkin/__tests__/match.test.ts`

- [ ] **Step 3: Implement**

```ts
export interface CheckinCandidate {
  kind: 'guest' | 'rsvp'
  id: string
  name: string
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Filter candidates by a normalized substring query (min 3 chars), dedupe by
 * normalized name (preferring an 'rsvp' candidate, which already has a ledger
 * row), and cap to `limit`. Pure — caller supplies already-decrypted names.
 */
export function matchCheckinNames(
  query: string,
  candidates: CheckinCandidate[],
  limit = 5,
): CheckinCandidate[] {
  const q = norm(query)
  if (q.length < 3) return []
  const seen = new Map<string, CheckinCandidate>()
  for (const cand of candidates) {
    const n = norm(cand.name)
    if (!n.includes(q)) continue
    const existing = seen.get(n)
    if (!existing) seen.set(n, cand)
    else if (existing.kind === 'guest' && cand.kind === 'rsvp') seen.set(n, cand)
  }
  return Array.from(seen.values()).slice(0, limit)
}
```

- [ ] **Step 4: Run → pass.** **Step 5: Commit**

```bash
git add src/lib/checkin/match.ts src/lib/checkin/__tests__/match.test.ts
git commit -m "feat(checkin): matchCheckinNames helper"
```

---

## Task 3: POST /api/checkin/search

**Files:** Create `src/app/api/checkin/search/route.ts`

- [ ] **Step 1: Implement** (mirror the existing `/api/rsvp/route.ts` style)

```ts
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { decryptField as decryptGuest } from '@/lib/guests/crypto'
import { decryptField as decryptApp } from '@/lib/crypto/app'
import { matchCheckinNames, type CheckinCandidate } from '@/lib/checkin/match'

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, 'checkin-search', { windowMs: 60_000, max: 30 })
  if (limited) return limited

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ matches: [] }) }
  const slug = String(body?.slug || '').trim()
  const token = String(body?.token || '').trim()
  const q = String(body?.q || '').trim()
  if (!slug || !token || q.length < 3) return NextResponse.json({ matches: [] })

  const admin = createSupabaseAdminClient()
  const { data: inv } = (await admin
    .from('invitations')
    .select('id, is_published, is_paid, checkin_token')
    .eq('slug', slug)
    .maybeSingle()) as { data: { id: string; is_published: boolean; is_paid: boolean; checkin_token: string | null } | null }
  // Token-gate: no token match → no names, ever.
  if (!inv || !inv.is_published || !inv.is_paid || !inv.checkin_token || inv.checkin_token !== token) {
    return NextResponse.json({ matches: [] })
  }

  const [{ data: guests }, { data: rsvps }] = (await Promise.all([
    admin.from('guests').select('id, name_enc').eq('invitation_id', inv.id),
    admin.from('rsvps').select('id, guest_name_enc').eq('invitation_id', inv.id),
  ])) as any

  const candidates: CheckinCandidate[] = []
  for (const g of guests || []) {
    const name = decryptGuest(g.name_enc) ?? ''
    if (name) candidates.push({ kind: 'guest', id: g.id, name })
  }
  for (const r of rsvps || []) {
    const name = decryptApp(r.guest_name_enc) ?? ''
    if (name) candidates.push({ kind: 'rsvp', id: r.id, name })
  }

  return NextResponse.json({ matches: matchCheckinNames(q, candidates) })
}
```

- [ ] **Step 2:** `npx tsc --noEmit` clean. **Step 3: Commit**

```bash
GIT_LITERAL_PATHSPECS=1 git add "src/app/api/checkin/search/route.ts"
git commit -m "feat(checkin): token-gated name search endpoint"
```

---

## Task 4: POST /api/checkin/confirm

**Files:** Create `src/app/api/checkin/confirm/route.ts`

- [ ] **Step 1: Implement** (re-derives name server-side; idempotent upsert)

```ts
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/security/rate-limit'
import { decryptField as decryptGuest } from '@/lib/guests/crypto'
import { decryptField as decryptApp, encryptField as encryptApp } from '@/lib/crypto/app'

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, 'checkin-confirm', { windowMs: 60_000, max: 15 })
  if (limited) return limited

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const slug = String(body?.slug || '').trim()
  const token = String(body?.token || '').trim()
  const kind = body?.kind === 'rsvp' ? 'rsvp' : body?.kind === 'guest' ? 'guest' : null
  const id = String(body?.id || '').trim()
  if (!slug || !token || !kind || !id) return NextResponse.json({ error: 'Permintaan tidak lengkap' }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data: inv } = (await admin
    .from('invitations')
    .select('id, is_published, is_paid, checkin_token')
    .eq('slug', slug)
    .maybeSingle()) as { data: { id: string; is_published: boolean; is_paid: boolean; checkin_token: string | null } | null }
  if (!inv || !inv.is_published || !inv.is_paid || !inv.checkin_token || inv.checkin_token !== token) {
    return NextResponse.json({ error: 'Link tidak valid' }, { status: 403 })
  }

  const nowIso = new Date().toISOString()

  if (kind === 'rsvp') {
    const { data: rsvp } = (await admin
      .from('rsvps').select('id, invitation_id, guest_name_enc, guest_count')
      .eq('id', id).maybeSingle()) as { data: { id: string; invitation_id: string; guest_name_enc: string; guest_count: number | null } | null }
    if (!rsvp || rsvp.invitation_id !== inv.id) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    const name = decryptApp(rsvp.guest_name_enc) ?? ''
    const { data: existing } = (await admin
      .from('attendances').select('id').eq('invitation_id', inv.id).eq('rsvp_id', rsvp.id).maybeSingle()) as { data: { id: string } | null }
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from('attendances') as any).update({ arrived_at: nowIso }).eq('id', existing.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from('attendances') as any).insert({
        invitation_id: inv.id, rsvp_id: rsvp.id, guest_id: null,
        name_enc: encryptApp(name), guest_count: rsvp.guest_count ?? 1, source: 'rsvp', arrived_at: nowIso,
      })
    }
    return NextResponse.json({ ok: true, name })
  }

  // kind === 'guest'
  const { data: guest } = (await admin
    .from('guests').select('id, invitation_id, name_enc').eq('id', id).maybeSingle()) as { data: { id: string; invitation_id: string; name_enc: string } | null }
  if (!guest || guest.invitation_id !== inv.id) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  const name = decryptGuest(guest.name_enc) ?? ''
  const { data: existing } = (await admin
    .from('attendances').select('id').eq('invitation_id', inv.id).eq('guest_id', guest.id).maybeSingle()) as { data: { id: string } | null }
  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('attendances') as any).update({ arrived_at: nowIso }).eq('id', existing.id)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('attendances') as any).insert({
      invitation_id: inv.id, guest_id: guest.id, rsvp_id: null,
      name_enc: encryptApp(name), guest_count: 1, source: 'walkin', arrived_at: nowIso,
    })
  }
  return NextResponse.json({ ok: true, name })
}
```

- [ ] **Step 2:** `npx tsc --noEmit` clean. **Step 3: Commit**

```bash
GIT_LITERAL_PATHSPECS=1 git add "src/app/api/checkin/confirm/route.ts"
git commit -m "feat(checkin): idempotent confirm/mark-arrived endpoint"
```

---

## Task 5: Public check-in page + form

**Files:** Create `src/app/[template]/[slug]/checkin/page.tsx`; Create `src/app/[template]/[slug]/checkin/CheckinForm.tsx`

- [ ] **Step 1: `page.tsx`** (server component — validates token, renders form or notice)

```tsx
import type React from 'react'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import CheckinForm from './CheckinForm'

export const dynamic = 'force-dynamic'

export default async function CheckinPage({
  params,
  searchParams,
}: {
  params: { template: string; slug: string }
  searchParams: { k?: string }
}) {
  const slug = params.slug
  const token = (searchParams.k || '').trim()
  let valid = false
  if (token) {
    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations').select('is_published, is_paid, checkin_token').eq('slug', slug).maybeSingle()) as {
      data: { is_published: boolean; is_paid: boolean; checkin_token: string | null } | null
    }
    valid = !!inv && inv.is_published && inv.is_paid && !!inv.checkin_token && inv.checkin_token === token
  }

  return (
    <main style={wrap}>
      {valid ? (
        <CheckinForm slug={slug} token={token} />
      ) : (
        <div style={card}>
          <h1 style={h1}>Link tidak valid</h1>
          <p style={p}>Silakan minta QR check-in ke panitia.</p>
        </div>
      )}
    </main>
  )
}

const wrap: React.CSSProperties = { minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20, background: '#0f0e13', color: '#f5f5f5', fontFamily: 'system-ui, -apple-system, sans-serif' }
const card: React.CSSProperties = { width: 'min(440px, 100%)', background: '#1b1a22', border: '1px solid #2e2c38', borderRadius: 18, padding: 28, textAlign: 'center' }
const h1: React.CSSProperties = { fontSize: 22, margin: '0 0 8px' }
const p: React.CSSProperties = { color: '#b9b6c6', margin: 0, lineHeight: 1.5 }
```

- [ ] **Step 2: `CheckinForm.tsx`** (client — search/pick/confirm/done)

```tsx
'use client'

import type React from 'react'
import { useEffect, useState } from 'react'

interface Match { kind: 'guest' | 'rsvp'; id: string; name: string }

export default function CheckinForm({ slug, token }: { slug: string; token: string }) {
  const [q, setQ] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<Match | null>(null)
  const [saving, setSaving] = useState(false)
  const [doneName, setDoneName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (picked || doneName) return
    const term = q.trim()
    if (term.length < 3) { setMatches([]); return }
    setSearching(true)
    const h = setTimeout(async () => {
      try {
        const res = await fetch('/api/checkin/search', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, token, q: term }),
        })
        const data = await res.json()
        setMatches(Array.isArray(data.matches) ? data.matches : [])
      } catch { setMatches([]) } finally { setSearching(false) }
    }, 250)
    return () => clearTimeout(h)
  }, [q, slug, token, picked, doneName])

  async function confirm() {
    if (!picked) return
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/checkin/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, token, kind: picked.kind, id: picked.id }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal mencatat kehadiran. Coba lagi.'); setSaving(false); return }
      setDoneName(data.name || picked.name)
    } catch { setError('Gangguan jaringan, coba lagi.'); setSaving(false) }
  }

  if (doneName) {
    return (
      <div style={card}>
        <div style={{ fontSize: 44, marginBottom: 6 }}>✓</div>
        <h1 style={h1}>Selamat datang, {doneName}!</h1>
        <p style={p}>Kehadiran Anda sudah tercatat. Terima kasih 🤍</p>
      </div>
    )
  }

  return (
    <div style={card}>
      <h1 style={h1}>Check-in Tamu</h1>
      {!picked ? (
        <>
          <p style={p}>Ketik nama Anda untuk konfirmasi kehadiran.</p>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama lengkap…" style={input} />
          <div style={{ marginTop: 12 }}>
            {q.trim().length < 3 ? null : searching ? (
              <p style={hint}>Mencari…</p>
            ) : matches.length === 0 ? (
              <p style={hint}>Nama tidak ditemukan — silakan ke meja panitia.</p>
            ) : (
              <ul style={list}>
                {matches.map((m) => (
                  <li key={`${m.kind}-${m.id}`}>
                    <button type="button" style={rowBtn} onClick={() => setPicked(m)}>{m.name}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <>
          <p style={{ ...p, fontSize: 18, color: '#f5f5f5' }}>Anda <strong>{picked.name}</strong>?</p>
          {error && <p style={{ ...hint, color: '#ff8a7a' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="button" style={ghostBtn} onClick={() => { setPicked(null); setError(null) }} disabled={saving}>Bukan</button>
            <button type="button" style={primaryBtn} onClick={confirm} disabled={saving}>{saving ? 'Menyimpan…' : 'Ya, saya hadir'}</button>
          </div>
        </>
      )}
    </div>
  )
}

const card: React.CSSProperties = { width: 'min(440px, 100%)', background: '#1b1a22', border: '1px solid #2e2c38', borderRadius: 18, padding: 28, textAlign: 'center' }
const h1: React.CSSProperties = { fontSize: 22, margin: '0 0 10px' }
const p: React.CSSProperties = { color: '#b9b6c6', margin: '0 0 8px', lineHeight: 1.5 }
const input: React.CSSProperties = { width: '100%', padding: '14px 16px', fontSize: 16, borderRadius: 12, border: '1px solid #3a3847', background: '#12111a', color: '#f5f5f5', outline: 'none' }
const hint: React.CSSProperties = { color: '#9a97a8', fontSize: 14, margin: '4px 0' }
const list: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }
const rowBtn: React.CSSProperties = { width: '100%', padding: '14px 16px', fontSize: 16, borderRadius: 12, border: '1px solid #3a3847', background: '#23212e', color: '#f5f5f5', cursor: 'pointer', textAlign: 'left' }
const ghostBtn: React.CSSProperties = { flex: 1, padding: '13px', borderRadius: 999, border: '1px solid #3a3847', background: 'transparent', color: '#f5f5f5', cursor: 'pointer', fontSize: 15 }
const primaryBtn: React.CSSProperties = { flex: 2, padding: '13px', borderRadius: 999, border: 'none', background: '#e8c46a', color: '#1b1a22', cursor: 'pointer', fontSize: 15, fontWeight: 600 }
```

- [ ] **Step 3:** `npx tsc --noEmit` clean; `npx vitest run` green.

- [ ] **Step 4: Commit**

```bash
GIT_LITERAL_PATHSPECS=1 git add "src/app/[template]/[slug]/checkin/page.tsx" "src/app/[template]/[slug]/checkin/CheckinForm.tsx"
git commit -m "feat(checkin): public token-gated self check-in page"
```

---

## Task 6: Add `qrcode` dependency

**Files:** Modify `package.json` (+ lockfile)

- [ ] **Step 1: Install** (offline-capable local lib; no service/account)

Run: `npm install qrcode@^1.5.4 && npm install -D @types/qrcode@^1.5.5`
Expected: `qrcode` in dependencies, `@types/qrcode` in devDependencies.

- [ ] **Step 2:** `npx tsc --noEmit` clean.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add offline qrcode lib for check-in QR"
```

---

## Task 7: Dashboard QR card + wiring + i18n

**Files:** Create `src/app/[template]/[slug]/dashboard/guestbook/CheckinQrCard.tsx`; Modify `GuestbookTab.tsx`, `DashboardClient.tsx`, `src/lib/i18n/dictionaries/dashboard.ts`

- [ ] **Step 1: i18n keys** — add the SAME keys to BOTH `tabs.guestbook` blocks (id + en) in `dashboard.ts`:

id:
```ts
        checkinQrTitle: 'QR Check-in',
        checkinQrDesc: 'Cetak & pajang di meja penerima tamu. Tamu scan untuk konfirmasi kehadiran sendiri.',
        checkinQrShow: 'Tampilkan QR Check-in',
        checkinQrPrint: 'Cetak QR',
        checkinQrRegenerate: 'Ganti token',
        checkinQrRegenerateConfirm: 'Ganti token akan membuat QR lama tidak berlaku. Lanjutkan?',
        checkinQrLoading: 'Menyiapkan…',
```
en:
```ts
        checkinQrTitle: 'Check-in QR',
        checkinQrDesc: 'Print & display at the reception desk. Guests scan to self-confirm attendance.',
        checkinQrShow: 'Show check-in QR',
        checkinQrPrint: 'Print QR',
        checkinQrRegenerate: 'Reset token',
        checkinQrRegenerateConfirm: 'Resetting the token invalidates the old QR. Continue?',
        checkinQrLoading: 'Preparing…',
```

- [ ] **Step 2: `CheckinQrCard.tsx`**

```tsx
'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import { useDashboardDict } from '../DashboardI18nProvider'
import { useConfirm, useAlert } from '@/components/dashboard/DialogProvider'
import { ensureCheckinToken, regenerateCheckinToken } from './actions'
import { ghostBtn, primaryBtn, statBox } from './styles'

export default function CheckinQrCard({ slug, template }: { slug: string; template: string }) {
  const t = useDashboardDict().tabs.guestbook
  const confirmDialog = useConfirm()
  const showAlert = useAlert()
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function render(token: string) {
    const url = `${window.location.origin}/${template}/${slug}/checkin?k=${token}`
    setDataUrl(await QRCode.toDataURL(url, { width: 320, margin: 1 }))
  }

  async function show() {
    setBusy(true)
    const res = await ensureCheckinToken(slug)
    if (res.ok && res.token) await render(res.token)
    else await showAlert({ message: res.error || t.networkError })
    setBusy(false)
  }

  async function regen() {
    if (!(await confirmDialog({ message: t.checkinQrRegenerateConfirm, tone: 'danger' }))) return
    setBusy(true)
    const res = await regenerateCheckinToken(slug)
    if (res.ok && res.token) await render(res.token)
    else await showAlert({ message: res.error || t.networkError })
    setBusy(false)
  }

  function print() {
    if (!dataUrl) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<img src="${dataUrl}" style="width:320px;display:block;margin:40px auto" onload="window.print()" />`)
    w.document.close()
  }

  return (
    <div style={{ ...statBox, marginBottom: 16, padding: 18 }}>
      <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 18 }}>{t.checkinQrTitle}</h3>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(42,33,24,0.6)', lineHeight: 1.5 }}>{t.checkinQrDesc}</p>
      {dataUrl ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="QR" style={{ width: 140, height: 140, borderRadius: 8, background: '#fff', padding: 6 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={primaryBtn} onClick={print} disabled={busy}>{t.checkinQrPrint}</button>
            <button type="button" style={ghostBtn} onClick={regen} disabled={busy}>{t.checkinQrRegenerate}</button>
          </div>
        </div>
      ) : (
        <button type="button" style={primaryBtn} onClick={show} disabled={busy}>{busy ? t.checkinQrLoading : t.checkinQrShow}</button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire `template` through to GuestbookTab** — in `DashboardClient.tsx`, change the `<GuestbookTab …>` render to also pass `template={template}`. In `GuestbookTab.tsx`, add `template: string` to `Props` + destructure it, and render `<CheckinQrCard slug={slug} template={template} />` just above `<StatsRow … />`. Add the import `import CheckinQrCard from './guestbook/CheckinQrCard'`.

- [ ] **Step 4:** `npx tsc --noEmit` clean; `npx vitest run` green (dict-parity passes).

- [ ] **Step 5: Commit**

```bash
GIT_LITERAL_PATHSPECS=1 git add "src/app/[template]/[slug]/dashboard/guestbook/CheckinQrCard.tsx" "src/app/[template]/[slug]/dashboard/GuestbookTab.tsx" "src/app/[template]/[slug]/dashboard/DashboardClient.tsx" "src/lib/i18n/dictionaries/dashboard.ts"
git commit -m "feat(checkin): dashboard QR card + i18n"
```

---

## Task 8: Apply migration + manual smoke

- [ ] **Step 1:** Apply `2026-06-09_checkin_token.sql` (Supabase SQL editor or MCP) — the controller will handle this; the code degrades (token null → check-in simply blocked) until applied.
- [ ] **Step 2:** Dashboard → Buku Tamu → **Tampilkan QR Check-in** → QR renders.
- [ ] **Step 3:** Open the encoded URL `/<template>/<slug>/checkin?k=<token>` on a phone/incognito → type an invited/RSVP name (≥3 chars) → pick → "Ya, saya hadir" → success screen.
- [ ] **Step 4:** Dashboard ledger shows that guest checked-in (arrived time). Tapping manual "Hadir ✓" on the same row does NOT duplicate.
- [ ] **Step 5:** Open `/checkin` with NO `k` (or a wrong one) → "Link tidak valid". Manual mark / walk-in / unlisted still work.
- [ ] **Step 6:** Repeat the URL on a solary invitation.

---

## Self-review (coverage vs spec)

- §3 migration → T1. §5A token actions → T1. §5E match helper → T2. §5D search → T3, confirm (idempotent, name re-derived) → T4. §5C page+form → T5. §5B QR card + `qrcode` → T6,T7. §4 token-gate + rate-limit + published&paid → T3,T4,T5. i18n parity → T7. Smoke → T8. ✓
