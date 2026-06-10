# Walk-in Tak Terdaftar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let panitia add a guest who is NOT on the invitation list ("tamu tak terdaftar") to the Buku Tamu, gated by a strong confirmation, with a permanent badge + audit filter.

**Architecture:** No migration — an unlisted entry is `attendances` `source='walkin'` with `guest_id=null`. One pure helper `attendanceCategory()` classifies every row (rsvp / walkin / unlisted) and is the single source of truth for both the badge and the filter. A new `addUnlistedAttendance` server action inserts the row; the existing `WalkInDialog` gains a manual-entry mode with a `useConfirm` gate.

**Tech Stack:** Next.js 14 server actions, React 18, Supabase service_role, vitest. No new deps.

---

## Conventions

- Test: `npx vitest run <path>` (tests live under `__tests__/`). Typecheck: `npx tsc --noEmit` (do NOT use `npm run lint` — interactive in this repo). Don't start the dev server.
- **Git:** branch `feat/solary-editor`; unrelated uncommitted WIP (`docs/legal/*`, `src/components/legal/LegalLayout.tsx`, `src/components/site/SiteFooter.tsx`) MUST stay untouched. Never `git add -A`/`.`/`-a`. Stage explicit paths only; bracketed paths need `GIT_LITERAL_PATHSPECS=1 git add "<path>"`. Commit per task.

## File structure

**New:** `src/lib/guestbook/category.ts` (+ `__tests__/category.test.ts`)
**Modified:** `guestbook/styles.ts`, `guestbook/actions.ts`, `guestbook/LedgerTable.tsx`, `guestbook/WalkInDialog.tsx`, `GuestbookTab.tsx`, `lib/i18n/dictionaries/dashboard.ts`

---

## Task 1: attendanceCategory helper (pure)

**Files:** Create `src/lib/guestbook/category.ts`; Test `src/lib/guestbook/__tests__/category.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { attendanceCategory } from '../category'

describe('attendanceCategory', () => {
  it('classifies an RSVP row', () => {
    expect(attendanceCategory({ source: 'rsvp', guest_id: null })).toBe('rsvp')
    expect(attendanceCategory({ source: 'rsvp', guest_id: 'g1' })).toBe('rsvp')
  })
  it('classifies a listed walk-in (has guest_id)', () => {
    expect(attendanceCategory({ source: 'walkin', guest_id: 'g1' })).toBe('walkin')
  })
  it('classifies an unlisted walk-in (no guest_id)', () => {
    expect(attendanceCategory({ source: 'walkin', guest_id: null })).toBe('unlisted')
  })
})
```

- [ ] **Step 2: Run → fail**

Run: `npx vitest run src/lib/guestbook/__tests__/category.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
export type AttendanceCategory = 'rsvp' | 'walkin' | 'unlisted'

/**
 * Single source of truth for ledger row classification — used by both the
 * badge (LedgerTable) and the source filter (GuestbookTab) so they never drift.
 * An unlisted walk-in is one added at the venue with no guest-list match.
 */
export function attendanceCategory(
  row: { source: 'rsvp' | 'walkin'; guest_id: string | null },
): AttendanceCategory {
  if (row.source === 'rsvp') return 'rsvp'
  return row.guest_id ? 'walkin' : 'unlisted'
}
```

- [ ] **Step 4: Run → pass**

Run: `npx vitest run src/lib/guestbook/__tests__/category.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/guestbook/category.ts src/lib/guestbook/__tests__/category.test.ts
git commit -m "feat(guestbook): attendanceCategory helper"
```

---

## Task 2: badgeUnlisted style

**Files:** Modify `src/app/[template]/[slug]/dashboard/guestbook/styles.ts`

- [ ] **Step 1: Append the style** (after `badgeWalkin`)

```ts
export const badgeUnlisted: React.CSSProperties = { display: 'inline-block', padding: '3px 9px', borderRadius: 999, fontSize: 11, background: 'rgba(180,120,20,0.14)', color: '#9A6A12', whiteSpace: 'nowrap' }
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` → no new errors.

- [ ] **Step 3: Commit**

```bash
GIT_LITERAL_PATHSPECS=1 git add "src/app/[template]/[slug]/dashboard/guestbook/styles.ts"
git commit -m "feat(guestbook): badgeUnlisted style"
```

---

## Task 3: i18n keys (id + en)

**Files:** Modify `src/lib/i18n/dictionaries/dashboard.ts`

Add the SAME 6 key names to BOTH `tabs.guestbook` blocks (id ~line 188, en ~line 1114). The dict-parity test enforces identical key sets.

- [ ] **Step 1: Indonesian block** — insert into `guestbook: { … }` (id):

```ts
        sourceUnlisted: 'Tak terdaftar',
        filterUnlisted: 'Tak terdaftar',
        addUnlistedBtn: "Tambah '{q}' sebagai tamu tak terdaftar",
        unlistedNameLabel: 'Nama tamu',
        unlistedConfirm: "Tamu ini TIDAK ada di daftar undangan. Tambah '{name}' sebagai tamu tak terdaftar?",
        unlistedNameRequired: 'Nama wajib diisi',
```

- [ ] **Step 2: English block** — insert into `guestbook: { … }` (en):

```ts
        sourceUnlisted: 'Unlisted',
        filterUnlisted: 'Unlisted',
        addUnlistedBtn: "Add '{q}' as an unlisted guest",
        unlistedNameLabel: 'Guest name',
        unlistedConfirm: "This guest is NOT on the invitation list. Add '{name}' as an unlisted guest?",
        unlistedNameRequired: 'Name is required',
```

- [ ] **Step 3: Run full suite (dict-parity)**

Run: `npx vitest run` → all green (dict-parity passes).

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/dictionaries/dashboard.ts
git commit -m "i18n(guestbook): unlisted walk-in keys"
```

---

## Task 4: addUnlistedAttendance server action

**Files:** Modify `src/app/[template]/[slug]/dashboard/guestbook/actions.ts`

The helpers used (`authorizeOwnership`, `createSupabaseAdminClient`, `encryptField`, `fromDbRow`, `revalidatePath`, the `AddWalkInResult` interface, `AttendanceRowDb`) are already in this file — do not re-import.

- [ ] **Step 1: Append the action** (after `addWalkInAttendance`)

```ts
/**
 * Add an UNLISTED walk-in — a guest not in the imported guests list. No guestId;
 * stored as source='walkin' with guest_id=null (distinguished from a listed
 * walk-in by the null guest_id). Name is encrypted like every attendance name.
 */
export async function addUnlistedAttendance(input: {
  slug: string
  name: string
  count: number
  note?: string | null
}): Promise<AddWalkInResult> {
  try {
    const invitation_id = await authorizeOwnership(input.slug)
    const name = String(input.name || '').trim().slice(0, 120)
    if (!name) return { ok: false, code: 'error', error: 'Nama wajib diisi.' }
    const count = Math.min(20, Math.max(1, Number(input.count) || 1))
    const note = input.note?.trim() || null
    const admin = createSupabaseAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = (await (admin.from('attendances') as any)
      .insert({
        invitation_id,
        guest_id: null,
        rsvp_id: null,
        name_enc: encryptField(name),
        guest_count: count,
        source: 'walkin',
        note_enc: encryptField(note),
        arrived_at: new Date().toISOString(),
      })
      .select()
      .single()) as { data: AttendanceRowDb | null; error: { message: string } | null }

    if (error || !data) {
      console.error('[addUnlistedAttendance]', error)
      return { ok: false, code: 'error', error: 'Gagal menambahkan tamu. Coba lagi sebentar lagi.' }
    }

    revalidatePath('/[template]/[slug]/dashboard', 'page')
    return { ok: true, row: fromDbRow(data) }
  } catch (e) {
    console.error('[addUnlistedAttendance]', e)
    return { ok: false, code: 'error', error: 'Terjadi kesalahan tak terduga. Coba lagi sebentar lagi.' }
  }
}
```

- [ ] **Step 2: Typecheck** → `npx tsc --noEmit` clean.

- [ ] **Step 3: Commit**

```bash
GIT_LITERAL_PATHSPECS=1 git add "src/app/[template]/[slug]/dashboard/guestbook/actions.ts"
git commit -m "feat(guestbook): addUnlistedAttendance action"
```

---

## Task 5: LedgerTable — unlisted badge

**Files:** Modify `src/app/[template]/[slug]/dashboard/guestbook/LedgerTable.tsx`

- [ ] **Step 1: Imports** — add `badgeUnlisted` to the styles import and import the helper:

```tsx
import { badgeRsvp, badgeWalkin, badgeUnlisted, deleteBtn } from './styles'
import { attendanceCategory } from '@/lib/guestbook/category'
```

- [ ] **Step 2: Add `sourceUnlisted` to the `Labels` interface** — on the line with `sourceRsvp: string; sourceWalkin: string`, change to:

```tsx
  sourceRsvp: string; sourceWalkin: string; sourceUnlisted: string
```

- [ ] **Step 3: Compute the category per row** — in the `rows.map((r) => {` body, next to `const arrived = !!r.arrived_at`, add:

```tsx
            const cat = attendanceCategory(r)
```

- [ ] **Step 4: Replace the source cell** — swap the existing `<td data-label={t.colSource}>…</td>` for:

```tsx
                <td data-label={t.colSource}>
                  <span style={cat === 'unlisted' ? badgeUnlisted : cat === 'walkin' ? badgeWalkin : badgeRsvp}>
                    {cat === 'unlisted' ? t.sourceUnlisted : cat === 'walkin' ? t.sourceWalkin : t.sourceRsvp}
                  </span>
                </td>
```

- [ ] **Step 5: Typecheck** → `npx tsc --noEmit` (will still error until GuestbookTab passes `sourceUnlisted`; that's Task 6 — acceptable to commit together. If you want a clean intermediate, do Task 6 before typechecking). Proceed to Task 6, then typecheck.

- [ ] **Step 6: Commit** (after Task 6 typechecks clean, or stage both files in one commit at end of Task 6)

```bash
GIT_LITERAL_PATHSPECS=1 git add "src/app/[template]/[slug]/dashboard/guestbook/LedgerTable.tsx"
git commit -m "feat(guestbook): unlisted badge in LedgerTable"
```

---

## Task 6: GuestbookTab — unlisted filter + pass label

**Files:** Modify `src/app/[template]/[slug]/dashboard/GuestbookTab.tsx`

- [ ] **Step 1: Import the helper**

```tsx
import { attendanceCategory } from '@/lib/guestbook/category'
```

- [ ] **Step 2: Widen the filter state type** — change:

```tsx
  const [filter, setFilter] = useState<'all' | 'rsvp' | 'walkin'>('all')
```

to:

```tsx
  const [filter, setFilter] = useState<'all' | 'rsvp' | 'walkin' | 'unlisted'>('all')
```

- [ ] **Step 3: Update the filter predicate** — in the `filtered` useMemo, change:

```tsx
        if (filter !== 'all' && r.source !== filter) return false
```

to:

```tsx
        if (filter !== 'all' && attendanceCategory(r) !== filter) return false
```

- [ ] **Step 4: Update the source-filter chips** — change the chip array + labels to:

```tsx
          {(['all', 'rsvp', 'walkin', 'unlisted'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={filter === f ? filterBtnActive : filterBtn}
            >
              {f === 'all' ? t.filterAll : f === 'rsvp' ? t.filterRsvp : f === 'walkin' ? t.filterWalkin : t.filterUnlisted}
            </button>
          ))}
```

- [ ] **Step 5: Pass `sourceUnlisted` to LedgerTable** — in the `labels={{ … }}` prop, on the line with `sourceRsvp: t.sourceRsvp, sourceWalkin: t.sourceWalkin,` add `sourceUnlisted: t.sourceUnlisted,`.

- [ ] **Step 6: Typecheck + tests**

Run: `npx tsc --noEmit` → clean. `npx vitest run` → green.

- [ ] **Step 7: Commit** (stage both LedgerTable + GuestbookTab if not already committed)

```bash
GIT_LITERAL_PATHSPECS=1 git add "src/app/[template]/[slug]/dashboard/GuestbookTab.tsx" "src/app/[template]/[slug]/dashboard/guestbook/LedgerTable.tsx"
git commit -m "feat(guestbook): unlisted filter + badge wiring"
```

---

## Task 7: WalkInDialog — manual-entry mode + strong confirm

**Files:** Modify `src/app/[template]/[slug]/dashboard/guestbook/WalkInDialog.tsx`

- [ ] **Step 1: Imports** — add the confirm hook and the new action:

```tsx
import { useConfirm } from '@/components/dashboard/DialogProvider'
```

and add `addUnlistedAttendance` to the existing `./actions` import:

```tsx
import { addWalkInAttendance, addUnlistedAttendance, searchWalkInGuests, type WalkInGuestHit } from './actions'
```

- [ ] **Step 2: New state + hook** — after the existing `useState` declarations, add:

```tsx
  const [manualMode, setManualMode] = useState(false)
  const [manualName, setManualName] = useState('')
  const confirmDialog = useConfirm()
```

- [ ] **Step 3: Pause the typeahead in manual mode** — change the debounce guard:

```tsx
    if (picked || manualMode) return
```

- [ ] **Step 4: Add the enter-manual + save handlers** — after the existing `onSave`:

```tsx
  function startManual() {
    setManualName(q.trim())
    setError(null)
    setManualMode(true)
  }

  async function onSaveUnlisted() {
    const name = manualName.trim()
    if (!name) { setError(t.unlistedNameRequired); return }
    const ok = await confirmDialog({ message: t.unlistedConfirm.replace('{name}', name), tone: 'danger' })
    if (!ok) return
    setSaving(true)
    setError(null)
    try {
      const res = await addUnlistedAttendance({ slug, name, count, note })
      if (res.ok && res.row) {
        onAdded(res.row)
        return
      }
      setError(res.error || t.errGeneric)
    } catch (e: any) {
      setError(e?.message || t.errGeneric)
    } finally {
      setSaving(false)
    }
  }
```

- [ ] **Step 5: Restructure the body to three modes** — replace the `{!picked ? ( …search… ) : ( …picked… )}` block with `{picked ? ( …picked… ) : manualMode ? ( …manual… ) : ( …search… )}`.

  The **picked** branch is the existing picked-panel JSX, unchanged.

  The **manual** branch:

```tsx
        ) : manualMode ? (
          <>
            <label style={fieldLabel}>{t.unlistedNameLabel}</label>
            <input
              autoFocus
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              maxLength={120}
              style={{ ...searchInput, width: '100%' }}
            />

            <label style={fieldLabel}>{t.dialogCountLabel}</label>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
              style={{ ...searchInput, width: 120 }}
            />

            <label style={fieldLabel}>{t.dialogNoteLabel}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.dialogNotePlaceholder}
              rows={2}
              style={{ ...searchInput, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
            />

            {error && <p style={errorText}>{error}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <button type="button" style={ghostBtn} onClick={() => { setManualMode(false); setError(null) }} disabled={saving}>
                {t.dialogCancel}
              </button>
              <button type="button" style={primaryBtn} onClick={onSaveUnlisted} disabled={saving}>
                {saving ? t.dialogSaving : t.dialogSave}
              </button>
            </div>
          </>
        ) : (
```

- [ ] **Step 6: Add the affordance button to the search branch** — in the search branch, immediately AFTER the `<div style={{ marginTop: 10 }}>…results…</div>` block, add:

```tsx
            {q.trim() !== '' && !searching && (
              <button
                type="button"
                style={{ ...ghostBtn, width: '100%', marginTop: 10 }}
                onClick={startManual}
              >
                {t.addUnlistedBtn.replace('{q}', q.trim())}
              </button>
            )}
```

- [ ] **Step 7: Typecheck + tests**

Run: `npx tsc --noEmit` → clean. `npx vitest run` → green.

- [ ] **Step 8: Commit**

```bash
GIT_LITERAL_PATHSPECS=1 git add "src/app/[template]/[slug]/dashboard/guestbook/WalkInDialog.tsx"
git commit -m "feat(guestbook): WalkInDialog unlisted-guest mode with confirm gate"
```

---

## Task 8: Manual smoke test

- [ ] Open a premium dashboard (e.g. `/lovebirds/dummy-lovebirds/dashboard`) → Buku Tamu → **+ Tamu Datang**.
- [ ] Type a name NOT in the guest list → the **"Tambah '…' sebagai tamu tak terdaftar"** button appears → click it.
- [ ] Manual panel: name prefilled + editable, set count + note → **Tambah** → the strong confirm dialog appears → confirm.
- [ ] Row appears with the **Tak terdaftar** badge + a check-in time; stats reflect it.
- [ ] The **Tak terdaftar** filter isolates unlisted rows; **Walk-in** filter now shows only listed walk-ins; delete works.
- [ ] Repeat on `/solary/dummy-solary/dashboard` — identical behaviour.

---

## Self-review (coverage vs spec)

- §4 action → Task 4. §5 dialog + confirm → Task 7. §6 badge → Tasks 2,5; filter → Task 6. §3 classification helper → Task 1. §8 i18n → Task 3. §9 testing → Task 1 unit + Task 8 smoke. No migration (correct). ✓
