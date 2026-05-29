# Slug Collision Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an onboarding slug is already taken, show up to 3 clickable, verified-available alternative slugs (date-based, name-variant, numbered).

**Architecture:** A new pure module generates ordered candidate slugs and selects the first N that pass an availability predicate. The existing `checkSlugAvailable` server action wires the real DB predicate and returns suggestions alongside the taken result. The onboarding form renders the suggestions as clickable chips that refill the slug input.

**Tech Stack:** Next.js 14 server actions, Supabase admin client, Vitest (node env, tests in `src/**/__tests__/**/*.test.ts`, `globals: false`), TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-29-slug-collision-suggestions-design.md`

---

## File Structure

- Create: `src/lib/onboarding/slug-suggestions.ts` — pure candidate generator + availability picker. No DB, no React.
- Create: `src/lib/onboarding/__tests__/slug-suggestions.test.ts` — unit tests for the pure module.
- Modify: `src/app/onboarding/actions.ts` — extend `checkSlugAvailable` to accept couple context and return verified suggestions.
- Modify: `src/lib/i18n/dictionaries/onboarding.ts` — add `try` label (id + en).
- Modify: `src/app/onboarding/OnboardingForm.tsx` — pass context to the check, render suggestion chips.

---

## Task 1: Pure slug-candidate generator

**Files:**
- Create: `src/lib/onboarding/slug-suggestions.ts`
- Test: `src/lib/onboarding/__tests__/slug-suggestions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/onboarding/__tests__/slug-suggestions.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildSlugCandidates, pickAvailableSuggestions } from '../slug-suggestions'

describe('buildSlugCandidates', () => {
  it('orders date, name-variant, then numbered', () => {
    const c = buildSlugCandidates({
      base: 'budi-sari',
      brideName: 'Budi Santoso',
      groomName: 'Sari Dewi',
      weddingDate: '2026-11-15T16:00',
    })
    expect(c[0]).toBe('budi-sari-2026')
    expect(c[1]).toBe('budi-dan-sari')
    expect(c[2]).toBe('budisari')
    expect(c).toContain('budi-sari-2')
  })

  it('skips date strategy when weddingDate missing', () => {
    const c = buildSlugCandidates({ base: 'budi-sari', brideName: 'Budi', groomName: 'Sari' })
    expect(c.includes('budi-sari-2026')).toBe(false)
    expect(c[0]).toBe('budi-dan-sari')
  })

  it('skips name-variant when a name is missing', () => {
    const c = buildSlugCandidates({
      base: 'budi-sari',
      brideName: 'Budi',
      weddingDate: '2026-11-15T16:00',
    })
    expect(c.includes('budi-dan-sari')).toBe(false)
    expect(c[0]).toBe('budi-sari-2026')
  })

  it('drops a date candidate that exceeds 40 chars', () => {
    const base = 'a'.repeat(37) // base + '-2026' = 42 chars > 40
    const c = buildSlugCandidates({ base, weddingDate: '2026-11-15T16:00' })
    expect(c.includes(`${base}-2026`)).toBe(false)
  })

  it('never includes the base itself and has no duplicates', () => {
    const c = buildSlugCandidates({
      base: 'budi-sari',
      brideName: 'Budi',
      groomName: 'Sari',
      weddingDate: '2026-11-15T16:00',
    })
    expect(c.includes('budi-sari')).toBe(false)
    expect(new Set(c).size).toBe(c.length)
  })
})

describe('pickAvailableSuggestions', () => {
  it('returns the first N available candidates, in order', async () => {
    const taken = new Set(['budi-sari-2026', 'budi-sari-2'])
    const isAvailable = async (s: string) => !taken.has(s)
    const result = await pickAvailableSuggestions(
      ['budi-sari-2026', 'budi-dan-sari', 'budi-sari-2', 'budi-sari-3', 'budi-sari-4'],
      isAvailable,
      3,
    )
    expect(result).toEqual(['budi-dan-sari', 'budi-sari-3', 'budi-sari-4'])
  })

  it('stops at the limit', async () => {
    const isAvailable = async () => true
    const result = await pickAvailableSuggestions(['a-1', 'a-2', 'a-3', 'a-4'], isAvailable, 3)
    expect(result).toHaveLength(3)
  })

  it('returns fewer than the limit when not enough are available', async () => {
    const isAvailable = async (s: string) => s === 'a-2'
    const result = await pickAvailableSuggestions(['a-1', 'a-2', 'a-3'], isAvailable, 3)
    expect(result).toEqual(['a-2'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/onboarding/__tests__/slug-suggestions.test.ts`
Expected: FAIL — cannot find module `../slug-suggestions` (or `buildSlugCandidates is not a function`).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/onboarding/slug-suggestions.ts`:

```ts
import { validateSlug } from './seed-config'

export interface SuggestionContext {
  base: string // the taken slug (will be lowercased/trimmed)
  brideName?: string
  groomName?: string
  weddingDate?: string // ISO datetime
}

function firstWord(s: string): string {
  return s.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
}

// Returns the validated slug, or null if it fails format/length rules.
function safe(slug: string): string | null {
  try {
    return validateSlug(slug)
  } catch {
    return null
  }
}

/**
 * Build ordered candidate slugs: date-based, then name-variant, then numbered.
 * Pure (no DB). Returns more numbered candidates than typically needed so the
 * caller can filter by availability and still reach its limit.
 */
export function buildSlugCandidates(ctx: SuggestionContext): string[] {
  const base = ctx.base.trim().toLowerCase()
  const out: string[] = []
  const push = (s: string | null) => {
    if (s && s !== base && !out.includes(s)) out.push(s)
  }

  // 1. Date-based
  if (ctx.weddingDate) {
    const year = new Date(ctx.weddingDate).getFullYear()
    if (!Number.isNaN(year)) push(safe(`${base}-${year}`))
  }

  // 2. Name-variant
  const bride = firstWord(ctx.brideName || '')
  const groom = firstWord(ctx.groomName || '')
  if (bride && groom) {
    push(safe(`${bride}-dan-${groom}`))
    push(safe(`${bride}${groom}`))
  }

  // 3. Numbered
  for (let n = 2; n <= 20; n++) {
    push(safe(`${base}-${n}`))
  }

  return out
}

/**
 * Walk candidates in order, returning the first `limit` for which
 * `isAvailable` resolves true. Returns fewer than `limit` if not enough pass.
 */
export async function pickAvailableSuggestions(
  candidates: string[],
  isAvailable: (slug: string) => Promise<boolean>,
  limit = 3,
): Promise<string[]> {
  const picked: string[] = []
  for (const c of candidates) {
    if (picked.length >= limit) break
    if (await isAvailable(c)) picked.push(c)
  }
  return picked
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/onboarding/__tests__/slug-suggestions.test.ts`
Expected: PASS (all 8 tests green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/onboarding/slug-suggestions.ts src/lib/onboarding/__tests__/slug-suggestions.test.ts
git commit -m "feat(onboarding): pure slug-candidate generator + availability picker"
```

---

## Task 2: Return verified suggestions from `checkSlugAvailable`

**Files:**
- Modify: `src/app/onboarding/actions.ts:137-154` (the `checkSlugAvailable` function and its imports)

This task is DB-wiring around the Task 1 pure functions (already unit-tested). Verification is a typecheck, not a new unit test — mocking the Supabase admin client here adds cost without covering logic the unit tests don't already cover.

- [ ] **Step 1: Add the import**

At the top of `src/app/onboarding/actions.ts`, below the existing `seed-config` import (line 6 `import { buildSeedConfig, validateSlug } from '@/lib/onboarding/seed-config'`), add:

```ts
import { buildSlugCandidates, pickAvailableSuggestions } from '@/lib/onboarding/slug-suggestions'
```

- [ ] **Step 2: Replace `checkSlugAvailable`**

Replace the entire existing function (currently `src/app/onboarding/actions.ts:137-154`):

```ts
/**
 * Live slug availability probe — called by the OnboardingForm as the user
 * types so they get instant feedback before submitting.
 */
export async function checkSlugAvailable(slug: string): Promise<{ available: boolean; reason?: string }> {
  try {
    const cleaned = validateSlug(slug)
    const admin = createSupabaseAdminClient()
    const { data } = (await admin
      .from('invitations')
      .select('id')
      .eq('slug', cleaned)
      .maybeSingle()) as { data: { id: string } | null }
    return data ? { available: false, reason: 'Sudah dipakai' } : { available: true }
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : 'Format slug tidak valid' }
  }
}
```

with:

```ts
export interface SlugCheckContext {
  brideName?: string
  groomName?: string
  weddingDate?: string
}

/**
 * Live slug availability probe — called by the OnboardingForm as the user
 * types so they get instant feedback before submitting. When the slug is taken
 * and couple context is provided, also returns up to 3 verified-available
 * alternative slugs to suggest.
 */
export async function checkSlugAvailable(
  slug: string,
  ctx?: SlugCheckContext,
): Promise<{ available: boolean; reason?: string; suggestions?: string[] }> {
  try {
    const cleaned = validateSlug(slug)
    const admin = createSupabaseAdminClient()

    const isTaken = async (s: string): Promise<boolean> => {
      const { data } = (await admin
        .from('invitations')
        .select('id')
        .eq('slug', s)
        .maybeSingle()) as { data: { id: string } | null }
      return !!data
    }

    if (!(await isTaken(cleaned))) return { available: true }

    const candidates = buildSlugCandidates({
      base: cleaned,
      brideName: ctx?.brideName,
      groomName: ctx?.groomName,
      weddingDate: ctx?.weddingDate,
    })
    const suggestions = await pickAvailableSuggestions(
      candidates,
      async (s) => !(await isTaken(s)),
    )
    return { available: false, reason: 'Sudah dipakai', suggestions }
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : 'Format slug tidak valid' }
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors (exit 0).

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/actions.ts
git commit -m "feat(onboarding): checkSlugAvailable returns verified slug suggestions"
```

---

## Task 3: Add the `try` i18n label

**Files:**
- Modify: `src/lib/i18n/dictionaries/onboarding.ts` (id `form` section ~line 27, en `form` section ~line 68)
- Test: `src/lib/i18n/__tests__/dict-parity.test.ts` (existing — enforces id/en key parity)

- [ ] **Step 1: Add the ID label**

In `src/lib/i18n/dictionaries/onboarding.ts`, in the Indonesian (`id`) `form` block, immediately after the `available: '✓ URL ini tersedia',` line, add:

```ts
      try: 'Coba:',
```

- [ ] **Step 2: Add the EN label**

In the same file, in the English (`en`) `form` block, immediately after the `available: '✓ This URL is available',` line, add:

```ts
      try: 'Try:',
```

- [ ] **Step 3: Run the parity + typecheck**

Run: `npx vitest run src/lib/i18n/__tests__/dict-parity.test.ts`
Expected: PASS (id and en keys match — proves `try` was added to both).

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors (exit 0).

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/dictionaries/onboarding.ts
git commit -m "feat(i18n): add onboarding slug-suggestion 'try' label (id/en)"
```

---

## Task 4: Render suggestion chips in the onboarding form

**Files:**
- Modify: `src/app/onboarding/OnboardingForm.tsx` (slug-status state type ~line 32, check effect ~line 46-58, status/chips render ~line 227-246, add a `chip` style constant)

This is a UI task; verification is manual in the browser plus a typecheck. No unit test (the logic it depends on is covered by Task 1).

- [ ] **Step 1: Widen the `slugStatus` state type to carry suggestions**

In `src/app/onboarding/OnboardingForm.tsx`, change the `slugStatus` state declaration (currently ~line 32-34):

```tsx
  const [slugStatus, setSlugStatus] = useState<{ checking?: boolean; available?: boolean; reason?: string }>(
    {},
  )
```

to:

```tsx
  const [slugStatus, setSlugStatus] = useState<{
    checking?: boolean
    available?: boolean
    reason?: string
    suggestions?: string[]
  }>({})
```

- [ ] **Step 2: Pass couple context into the availability check**

Replace the debounced check effect (currently ~line 46-58):

```tsx
  // Debounced slug availability check
  useEffect(() => {
    if (!slug) {
      setSlugStatus({})
      return
    }
    setSlugStatus({ checking: true })
    const t = setTimeout(async () => {
      const res = await checkSlugAvailable(slug)
      setSlugStatus({ checking: false, ...res })
    }, 400)
    return () => clearTimeout(t)
  }, [slug])
```

with:

```tsx
  // Debounced slug availability check (re-runs when slug or couple data changes
  // so taken-slug suggestions use the latest names/date)
  useEffect(() => {
    if (!slug) {
      setSlugStatus({})
      return
    }
    setSlugStatus({ checking: true })
    const t = setTimeout(async () => {
      const res = await checkSlugAvailable(slug, {
        brideName: bride,
        groomName: groom,
        weddingDate: date,
      })
      setSlugStatus({ checking: false, ...res })
    }, 400)
    return () => clearTimeout(t)
  }, [slug, bride, groom, date])
```

- [ ] **Step 3: Render the suggestion chips**

In the slug `<label>` block, immediately after the closing `</span>` of the status message (the `<span>` that ends at ~line 245-246, right before the label's closing `</label>`), insert:

```tsx
          {!slugStatus.checking && slugStatus.reason && slugStatus.suggestions && slugStatus.suggestions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: '#5C4A3A' }}>{dict.form.try}</span>
              {slugStatus.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSlugTouched(true)
                    setSlug(s)
                  }}
                  style={chip}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
```

- [ ] **Step 4: Add the `chip` style constant**

At the bottom of the file, alongside the other style constants (e.g. after `const errorStyle`), add:

```tsx
const chip: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 999,
  border: '1px solid rgba(42,33,24,0.25)',
  background: 'rgba(42,33,24,0.04)',
  color: '#2A2118',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors (exit 0).

- [ ] **Step 6: Manual browser verification**

Run: `npm run dev`, open `http://localhost:3000/onboarding` (requires a logged-in session; if redirected to /signup, log in first).
- Enter bride + groom names and a wedding date so the slug prefills (e.g. `budi-sari`).
- Manually set the slug to one you know is taken (create one first via `node scripts/create-invitation.mjs budi-sari demo1234 --bride=... --groom=... --date=... --venue=... --email=... ` in a separate terminal, or reuse an existing slug).
- Confirm: status shows `✗ Sudah dipakai`, and a `Coba:` row appears with up to 3 chips (e.g. `budi-sari-2026`, `budi-dan-sari`, `budi-sari-2`).
- Click a chip → input fills with it → status flips to green `✓ URL ini tersedia` → submit button enables.

- [ ] **Step 7: Commit**

```bash
git add src/app/onboarding/OnboardingForm.tsx
git commit -m "feat(onboarding): show clickable slug suggestions when slug is taken"
```

---

## Final verification

- [ ] Run the full suite: `npm test` — expected: all tests pass (including the new `slug-suggestions` tests and the existing `dict-parity` test).
- [ ] Run: `npx tsc --noEmit -p tsconfig.json` — expected: clean.

---

## Self-Review notes

- **Spec coverage:** generator (Task 1), server suggestions (Task 2), i18n `try` (Task 3), chips UI (Task 4) — all spec sections mapped. Mixed strategy ordering (date → name-variant → numbered) implemented in `buildSlugCandidates`. Edge cases (no date, single-word name, 40-char overflow, base-exclusion, dedupe) covered by Task 1 tests.
- **Type consistency:** `buildSlugCandidates` / `pickAvailableSuggestions` signatures match between Task 1 (definition), Task 1 tests, and Task 2 (call sites). `checkSlugAvailable` return shape (`{ available, reason?, suggestions? }`) matches the `slugStatus` state type in Task 4. `dict.form.try` added in Task 3 is consumed in Task 4.
- **Simplification vs spec:** the spec mentioned incrementing numbered candidates up to `-99`; the generator uses a fixed `-2..-20` run (19 numbered + date + 2 name-variants = plenty to reach 3 available). Pure and finite; avoids unbounded loops. If 3 suggestions cannot be found (pathological), fewer chips render — acceptable.
