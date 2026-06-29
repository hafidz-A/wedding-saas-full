# Solary Navbar — Couple Name Split Implementation Plan

> **⚠️ SUPERSEDED (2026-06-29).** This narrow navbar-split plan was absorbed into the
> larger "couple name single source of truth" design — see spec
> `docs/superpowers/specs/2026-06-29-couple-name-single-source-design.md`. A new plan
> will be written from that spec. Do NOT execute this plan.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the couple's names out of the single Meta "Title" field into two dedicated inputs (Mempelai 1 & Mempelai 2) plus a suffix, auto-compose the SEO title from them, and make the Solary navbar read the structured names instead of parsing the `—` in the title.

**Architecture:** Add three derived-source fields to `config.meta` (`coupleName1`, `coupleName2`, `titleSuffix`); `meta.title` becomes a composed value. A small pure helper module (`src/lib/meta/title.ts`) owns compose/parse/navbar-name logic so the API route, the MetaTab UI, and both Solary render paths share one tested implementation. Backward-compat: when structured fields are absent, parse the legacy `meta.title`.

**Template scope:** The Meta tab (`MetaTab.tsx`), the meta API route, and the helper are **template-agnostic** — every couple, Solary or Lovebirds, gets the two-name inputs and composed SEO title. The **navbar rewire is Solary-only**: Solary's `FloatingNavbar` shows the couple name (and currently parses `meta.title`), whereas Lovebirds' `FloatingNavbar` is a section-pill nav with no couple-name brand and never reads `meta.title`. So there is no Lovebirds navbar to change — Task 6 verifies Lovebirds benefits from the shared MetaTab change and is otherwise untouched.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Vitest, CSS-in-inline-style (existing MetaTab pattern). Solary template files are plain `.jsx` with `'use client'`.

## Global Constraints

- **No new UI library** — inline styles / CSS variables only, matching existing MetaTab.
- **Field names are exactly `coupleName1`, `coupleName2`, `titleSuffix`** (per spec decision).
- **No character limits** on the name/suffix inputs — no `maxLength`, no counter; the derived title is not truncated.
- **Separator is `" & "`** between the two names (matches current navbar behavior).
- **Backward-compat:** the API still accepts a raw `title` string; existing invitations with only `meta.title` must still render a correct navbar name.
- **`'use client'`** stays on MetaTab and all Solary component files. The helper module is framework-agnostic TS (no `'use client'` needed).
- Path alias `@/*` → `src/*` is available repo-wide and may be imported from `.jsx`.
- Spec: `docs/superpowers/specs/2026-06-29-solary-navbar-couple-name-split-design.md`.

---

### Task 1: Title helper module (compose / parse / nav name)

**Files:**
- Create: `src/lib/meta/title.ts`
- Test: `src/lib/meta/__tests__/title.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface CoupleNameParts { coupleName1?: string; coupleName2?: string; titleSuffix?: string }`
  - `composeTitle(parts: CoupleNameParts): string`
  - `parseTitle(title: string | null | undefined): { coupleName1: string; coupleName2: string; titleSuffix: string }`
  - `navNameFromMeta(meta: { coupleName1?: string; coupleName2?: string; title?: string } | null | undefined, fallback?: string): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/meta/__tests__/title.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { composeTitle, parseTitle, navNameFromMeta } from '../title'

describe('composeTitle', () => {
  it('joins two names with " & " and appends suffix after " — "', () => {
    expect(composeTitle({ coupleName1: 'Amaraaa', coupleName2: 'Rizky', titleSuffix: 'Our Wedding' }))
      .toBe('Amaraaa & Rizky — Our Wedding')
  })
  it('collapses whitespace and trims', () => {
    expect(composeTitle({ coupleName1: '  Amaraaa  ', coupleName2: ' Rizky ', titleSuffix: '  Our   Wedding ' }))
      .toBe('Amaraaa & Rizky — Our Wedding')
  })
  it('omits the suffix segment when suffix is empty', () => {
    expect(composeTitle({ coupleName1: 'Amaraaa', coupleName2: 'Rizky', titleSuffix: '' }))
      .toBe('Amaraaa & Rizky')
  })
  it('drops a missing name without a dangling " & "', () => {
    expect(composeTitle({ coupleName1: 'Amaraaa', coupleName2: '', titleSuffix: 'Our Wedding' }))
      .toBe('Amaraaa — Our Wedding')
  })
  it('returns just the suffix when both names are empty', () => {
    expect(composeTitle({ coupleName1: '', coupleName2: '', titleSuffix: 'Our Wedding' }))
      .toBe('Our Wedding')
  })
})

describe('parseTitle', () => {
  it('splits "n1 & n2 — suffix" into parts', () => {
    expect(parseTitle('Amaraaa & Rizky — Our Wedding'))
      .toEqual({ coupleName1: 'Amaraaa', coupleName2: 'Rizky', titleSuffix: 'Our Wedding' })
  })
  it('handles a title with no em-dash (no suffix)', () => {
    expect(parseTitle('Amaraaa & Rizky'))
      .toEqual({ coupleName1: 'Amaraaa', coupleName2: 'Rizky', titleSuffix: '' })
  })
  it('keeps a suffix that itself contains an em-dash', () => {
    expect(parseTitle('A & R — Our — Wedding'))
      .toEqual({ coupleName1: 'A', coupleName2: 'R', titleSuffix: 'Our — Wedding' })
  })
  it('folds extra ampersands into coupleName2', () => {
    expect(parseTitle('A & B & C — Day'))
      .toEqual({ coupleName1: 'A', coupleName2: 'B & C', titleSuffix: 'Day' })
  })
  it('returns empty parts for empty/undefined', () => {
    expect(parseTitle('')).toEqual({ coupleName1: '', coupleName2: '', titleSuffix: '' })
    expect(parseTitle(undefined)).toEqual({ coupleName1: '', coupleName2: '', titleSuffix: '' })
  })
})

describe('navNameFromMeta', () => {
  it('prefers structured names joined with " & "', () => {
    expect(navNameFromMeta({ coupleName1: 'Amaraaa', coupleName2: 'Rizky', title: 'ignored — x' }))
      .toBe('Amaraaa & Rizky')
  })
  it('falls back to the part before the em-dash of title', () => {
    expect(navNameFromMeta({ title: 'Amaraaa & Rizky — Our Wedding' }))
      .toBe('Amaraaa & Rizky')
  })
  it('uses the provided fallback when nothing is available', () => {
    expect(navNameFromMeta({}, 'Galactic')).toBe('Galactic')
    expect(navNameFromMeta(null)).toBe('Wedding')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/meta/__tests__/title.test.ts`
Expected: FAIL — cannot resolve `../title` (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/meta/title.ts`:

```ts
/**
 * Couple-name ⇄ meta.title helpers.
 *
 * `config.meta.title` is the SEO/share title (browser tab, og:title). It is
 * composed from the couple's two names + an optional suffix. The Solary navbar
 * reads the structured names directly (falling back to parsing a legacy title).
 */

export interface CoupleNameParts {
  coupleName1?: string
  coupleName2?: string
  titleSuffix?: string
}

const clean = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim()

/** Compose the SEO title: "name1 & name2 — suffix" (segments omitted when empty). */
export function composeTitle(parts: CoupleNameParts): string {
  const names = [parts.coupleName1, parts.coupleName2].map(clean).filter(Boolean).join(' & ')
  const suffix = clean(parts.titleSuffix)
  if (!suffix) return names
  return names ? `${names} — ${suffix}` : suffix
}

/** Best-effort split of a legacy title back into structured parts (for prefill). */
export function parseTitle(title: string | null | undefined): Required<CoupleNameParts> {
  const raw = clean(title)
  const dash = raw.indexOf('—')
  const namesPart = dash >= 0 ? raw.slice(0, dash) : raw
  const titleSuffix = dash >= 0 ? clean(raw.slice(dash + 1)) : ''
  const parts = namesPart.split('&').map((s) => s.trim()).filter(Boolean)
  return {
    coupleName1: parts[0] ?? '',
    coupleName2: parts.slice(1).join(' & '),
    titleSuffix,
  }
}

/** Navbar brand text: structured names first, then legacy-title parse, then fallback. */
export function navNameFromMeta(
  meta: { coupleName1?: string; coupleName2?: string; title?: string } | null | undefined,
  fallback = 'Wedding',
): string {
  const m = meta ?? {}
  const structured = [m.coupleName1, m.coupleName2].map(clean).filter(Boolean).join(' & ')
  if (structured) return structured
  const fromTitle = clean(m.title?.split('—')[0])
  return fromTitle || fallback
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/meta/__tests__/title.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/meta/title.ts src/lib/meta/__tests__/title.test.ts
git commit -m "feat(meta): add couple-name compose/parse/navbar helpers"
```

---

### Task 2: Meta API route — accept name fields & compose title

**Files:**
- Modify: `src/app/api/invitation/[slug]/meta/route.ts`
- Test: `src/app/api/invitation/[slug]/meta/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `composeTitle` from `@/lib/meta/title` (Task 1).
- Produces: `PUT` now also persists `config.meta.coupleName1 / coupleName2 / titleSuffix` and a composed `config.meta.title` when any name field is present; still accepts a raw `title` for backward-compat.

- [ ] **Step 1: Write the failing test**

Add these cases inside the `describe('PUT /api/invitation/[slug]/meta', …)` block in `src/app/api/invitation/[slug]/meta/__tests__/route.test.ts`:

```ts
  it('composes the title from couple-name fields and stores all of them', async () => {
    mockOwner.mockResolvedValue(OWNER)
    const fake = rowFake()
    mockAdmin.mockReturnValue(fake as any)
    const res = await PUT(put({ coupleName1: '  Amaraaa ', coupleName2: 'Rizky', titleSuffix: 'Our Wedding' }), ctx)
    expect(res.status).toBe(200)
    const upd = fake._calls.find((c) => c.kind === 'update' && c.table === 'invitations')!
    expect(upd.value.config.meta.coupleName1).toBe('Amaraaa')
    expect(upd.value.config.meta.coupleName2).toBe('Rizky')
    expect(upd.value.config.meta.titleSuffix).toBe('Our Wedding')
    expect(upd.value.config.meta.title).toBe('Amaraaa & Rizky — Our Wedding')
  })

  it('treats name-only payloads as a valid update (not 400)', async () => {
    mockOwner.mockResolvedValue(OWNER)
    mockAdmin.mockReturnValue(rowFake() as any)
    expect((await PUT(put({ coupleName1: 'Amaraaa' }), ctx)).status).toBe(200)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/api/invitation/[slug]/meta/__tests__/route.test.ts`
Expected: FAIL — composed-title case stores nothing (`config.meta.title` undefined), name-only case returns 400.

- [ ] **Step 3: Write minimal implementation**

In `src/app/api/invitation/[slug]/meta/route.ts`:

Add the import near the top (after the existing imports):

```ts
import { composeTitle } from '@/lib/meta/title'
```

Replace the field-detection + validation block (currently lines ~28-33):

```ts
  const hasTitle = typeof body?.title === 'string'
  const hasDesc = typeof body?.description === 'string'
  const hasImage = typeof body?.ogImage === 'string'
  if (!hasTitle && !hasDesc && !hasImage) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
```

with:

```ts
  const hasName1 = typeof body?.coupleName1 === 'string'
  const hasName2 = typeof body?.coupleName2 === 'string'
  const hasSuffix = typeof body?.titleSuffix === 'string'
  const hasNameFields = hasName1 || hasName2 || hasSuffix
  const hasTitle = typeof body?.title === 'string'
  const hasDesc = typeof body?.description === 'string'
  const hasImage = typeof body?.ogImage === 'string'
  if (!hasNameFields && !hasTitle && !hasDesc && !hasImage) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
```

Then replace the title-derivation line (currently line ~35):

```ts
  const title = hasTitle ? (body.title as string).replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX) : undefined
```

with a small whitespace cleaner reused below (the legacy title still respects `TITLE_MAX`):

```ts
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim()
  const legacyTitle = hasTitle ? clean(body.title as string).slice(0, TITLE_MAX) : undefined
```

Finally replace the meta-assignment block (currently lines ~49-53):

```ts
  const cfg = { ...(row.config || {}) }
  cfg.meta = { ...(cfg.meta || {}) }
  if (hasTitle) cfg.meta.title = title
  if (hasDesc) cfg.meta.description = description
  if (hasImage) cfg.meta.ogImage = rawImage
```

with:

```ts
  const cfg = { ...(row.config || {}) }
  cfg.meta = { ...(cfg.meta || {}) }
  if (hasNameFields) {
    // Structured names are the source of truth; the title is derived (no truncation).
    const coupleName1 = hasName1 ? clean(body.coupleName1 as string) : (cfg.meta.coupleName1 ?? '')
    const coupleName2 = hasName2 ? clean(body.coupleName2 as string) : (cfg.meta.coupleName2 ?? '')
    const titleSuffix = hasSuffix ? clean(body.titleSuffix as string) : (cfg.meta.titleSuffix ?? '')
    cfg.meta.coupleName1 = coupleName1
    cfg.meta.coupleName2 = coupleName2
    cfg.meta.titleSuffix = titleSuffix
    cfg.meta.title = composeTitle({ coupleName1, coupleName2, titleSuffix })
  } else if (hasTitle) {
    cfg.meta.title = legacyTitle
  }
  if (hasDesc) cfg.meta.description = description
  if (hasImage) cfg.meta.ogImage = rawImage
```

Update the response payload line (currently the final `return NextResponse.json(...)`): change `title` to `cfg.meta.title` so the echoed title reflects the composed value:

```ts
  return NextResponse.json({ ok: true, savedAt: updatedRow?.updated_at ?? localNow, title: cfg.meta.title, description, ogImage: rawImage })
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/app/api/invitation/[slug]/meta/__tests__/route.test.ts`
Expected: PASS — new cases green AND the existing `normalizes whitespace and saves the title` (legacy `title` path) still passes.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/invitation/[slug]/meta/route.ts src/app/api/invitation/[slug]/meta/__tests__/route.test.ts
git commit -m "feat(meta): API composes title from couple-name fields"
```

---

### Task 3: Dashboard i18n keys for the name inputs

**Files:**
- Modify: `src/lib/i18n/dictionaries/dashboard.ts` (the `meta:` block in BOTH the `id` locale ~line 176 and the `en` locale ~line 1387)

**Interfaces:**
- Consumes: nothing.
- Produces: `t.fName1`, `t.fName1Placeholder`, `t.fName2`, `t.fName2Placeholder`, `t.fSuffix`, `t.fSuffixPlaceholder`, `t.titlePreviewLabel` under `tabs.meta` for both locales (used by Task 4).

- [ ] **Step 1: Add keys to the Indonesian (`id`) meta block**

In the `id` locale, inside the `meta: {` object (right after the `fTitlePlaceholder` line, ~line 180), insert:

```ts
        fName1: 'Mempelai 1',
        fName1Placeholder: 'mis. Amara',
        fName2: 'Mempelai 2',
        fName2Placeholder: 'mis. Rizky',
        fSuffix: 'Akhiran judul',
        fSuffixPlaceholder: 'mis. Undangan Pernikahan',
        titlePreviewLabel: 'Judul jadi',
```

- [ ] **Step 2: Add keys to the English (`en`) meta block**

In the `en` locale, inside the `meta: {` object (right after its `fTitlePlaceholder` line, ~line 1391), insert:

```ts
        fName1: 'Partner 1',
        fName1Placeholder: 'e.g. Amara',
        fName2: 'Partner 2',
        fName2Placeholder: 'e.g. Rizky',
        fSuffix: 'Title suffix',
        fSuffixPlaceholder: 'e.g. Wedding Invitation',
        titlePreviewLabel: 'Title becomes',
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors (both locales now share the same keys, so the dictionary's structural type stays consistent).

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/dictionaries/dashboard.ts
git commit -m "feat(i18n): add Meta tab couple-name labels (id + en)"
```

---

### Task 4: MetaTab UI — two name inputs + suffix + prefill + derived preview

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/MetaTab.tsx`

**Interfaces:**
- Consumes: `composeTitle`, `parseTitle` from `@/lib/meta/title` (Task 1); i18n keys from Task 3.
- Produces: `save()` now PUTs `{ coupleName1, coupleName2, titleSuffix, description, ogImage }` to the meta route.

- [ ] **Step 1: Import the helpers**

At the top of `src/app/[template]/[slug]/dashboard/MetaTab.tsx`, after the existing imports, add:

```ts
import { composeTitle, parseTitle } from '@/lib/meta/title'
```

- [ ] **Step 2: Extend the settings interface**

Replace the `MetaSettings` interface (currently lines ~9-13):

```ts
interface MetaSettings {
  title?: string
  description?: string
  ogImage?: string
}
```

with:

```ts
interface MetaSettings {
  title?: string
  coupleName1?: string
  coupleName2?: string
  titleSuffix?: string
  description?: string
  ogImage?: string
}
```

- [ ] **Step 3: Replace the title state with structured name state (incl. prefill)**

Replace the `const [title, setTitle] = useState(initial?.title ?? '')` line (~line 29) with:

```ts
  // Structured couple-name fields are the source of truth; the SEO title is
  // derived. Old invitations only have `title`, so prefill by parsing it.
  const initialNames =
    initial?.coupleName1 != null || initial?.coupleName2 != null || initial?.titleSuffix != null
      ? {
          coupleName1: initial?.coupleName1 ?? '',
          coupleName2: initial?.coupleName2 ?? '',
          titleSuffix: initial?.titleSuffix ?? '',
        }
      : parseTitle(initial?.title)
  const [coupleName1, setCoupleName1] = useState(initialNames.coupleName1)
  const [coupleName2, setCoupleName2] = useState(initialNames.coupleName2)
  const [titleSuffix, setTitleSuffix] = useState(initialNames.titleSuffix)
```

- [ ] **Step 4: Derive the title for preview**

Replace the `const previewTitle = title.trim() || t.previewTitleFallback` line (~line 43) with:

```ts
  const derivedTitle = composeTitle({ coupleName1, coupleName2, titleSuffix })
  const previewTitle = derivedTitle.trim() || t.previewTitleFallback
```

- [ ] **Step 5: Send structured fields on save**

In `save()`, replace the body of the fetch (currently `body: JSON.stringify({ title, description, ogImage }),`) with:

```ts
        body: JSON.stringify({ coupleName1, coupleName2, titleSuffix, description, ogImage }),
```

- [ ] **Step 6: Replace the single Title input with the two names + suffix + preview**

Replace the entire title `<label>` block (currently lines ~116-127, the one containing `t.fTitle` and the `maxLength={TITLE_MAX}` input and its counter) with:

```tsx
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={lbl}>{t.fName1}</span>
            <input
              type="text"
              value={coupleName1}
              onChange={(e) => { setCoupleName1(e.target.value); setMsg(null) }}
              placeholder={t.fName1Placeholder}
              style={input}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={lbl}>{t.fName2}</span>
            <input
              type="text"
              value={coupleName2}
              onChange={(e) => { setCoupleName2(e.target.value); setMsg(null) }}
              placeholder={t.fName2Placeholder}
              style={input}
            />
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={lbl}>{t.fSuffix}</span>
          <input
            type="text"
            value={titleSuffix}
            onChange={(e) => { setTitleSuffix(e.target.value); setMsg(null) }}
            placeholder={t.fSuffixPlaceholder}
            style={input}
          />
        </label>

        <p style={help}>{t.titlePreviewLabel}: <strong style={{ color: 'var(--text-primary)' }}>{derivedTitle || '—'}</strong></p>
```

- [ ] **Step 7: Remove the now-unused TITLE_MAX constant**

`TITLE_MAX` is no longer referenced (the title input is gone). Delete its declaration (`const TITLE_MAX = 120` near the top, ~line 22). Leave `DESC_MAX` untouched.

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS — no references to a removed `title`/`setTitle`/`TITLE_MAX` remain.

- [ ] **Step 9: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/solary/<slug>/dashboard` → Meta tab. Verify:
- Two name inputs (Mempelai 1 / Mempelai 2) + an "Akhiran judul" input, no character counters.
- For an invitation whose title was `"X & Y — Our Wedding"`, the boxes are prefilled `X`, `Y`, `Our Wedding`.
- The "Judul jadi: …" line updates live as you type.
- Save → reload → values persist (and `config.meta.title` is the composed string).

- [ ] **Step 10: Commit**

```bash
git add src/app/[template]/[slug]/dashboard/MetaTab.tsx
git commit -m "feat(meta): split Title into two couple-name inputs + suffix"
```

---

### Task 5: Solary navbar reads structured names

**Files:**
- Modify: `src/all-templates/solary/Shell.jsx:128`
- Modify: `src/all-templates/solary/components/InvitationPage.jsx:48`

**Interfaces:**
- Consumes: `navNameFromMeta` from `@/lib/meta/title` (Task 1).
- Produces: navbar `logo` now derived from structured names (fallback to legacy title parse).

- [ ] **Step 1: Update `Shell.jsx`**

Add the import after the existing `import { ThemeProvider } …` import line (~line 22):

```jsx
import { navNameFromMeta } from '@/lib/meta/title'
```

Replace the `logo` prop on `<FloatingNavbar>` (line 128):

```jsx
              logo={config.meta?.title?.split('—')[0]?.trim() || 'Wedding'}
```

with:

```jsx
              logo={navNameFromMeta(config.meta, 'Wedding')}
```

- [ ] **Step 2: Update `InvitationPage.jsx`**

Add the import among the existing imports at the top of `src/all-templates/solary/components/InvitationPage.jsx`:

```jsx
import { navNameFromMeta } from '@/lib/meta/title'
```

Replace the `logo` prop (line 48):

```jsx
              logo={config.meta?.title?.split("—")[0]?.trim() || "Galactic"}
```

with:

```jsx
              logo={navNameFromMeta(config.meta, "Galactic")}
```

- [ ] **Step 3: Type-check / build sanity**

Run: `npx tsc --noEmit`
Expected: PASS — `.jsx` files are not type-checked but the import path resolves; no TS errors elsewhere.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/solary/<slug>`. Verify:
- Navbar brand shows `coupleName1 & coupleName2` for an invitation saved via the new MetaTab.
- An older invitation that only has `meta.title` (e.g. `"X & Y — Our Wedding"`) still shows `X & Y` (fallback path).

- [ ] **Step 5: Commit**

```bash
git add src/all-templates/solary/Shell.jsx src/all-templates/solary/components/InvitationPage.jsx
git commit -m "feat(solary): navbar reads structured couple names"
```

---

### Task 6: Full regression pass

**Files:** none (verification only).

- [ ] **Step 1: Run the whole test suite**

Run: `npm run test`
Expected: PASS — including the existing meta route tests and the new title-helper tests.

- [ ] **Step 2: Token guardrail (touched dashboard/control CSS? none here, but cheap to confirm)**

Run: `npm run check:tokens`
Expected: PASS (no token regressions; this change adds no off-scale literals).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Verify Lovebirds is covered by the shared MetaTab (and its navbar is untouched)**

`MetaTab.tsx` / the meta route / the helper are template-agnostic, so the change must also work for a Lovebirds couple — while the Lovebirds navbar (a section-pill nav with no couple-name brand) must be unaffected.

Run: `npm run dev`, then for a **Lovebirds** invitation:
- Open `http://localhost:3000/lovebirds/<slug>/dashboard` → Meta tab. Verify the two name inputs + suffix appear, prefill from a legacy `meta.title` works, and the "Judul jadi: …" preview updates live.
- Save, then open `http://localhost:3000/lovebirds/<slug>`. Verify the **browser tab title** (and share preview) reflects the composed title.
- Confirm the Lovebirds in-page nav still renders only section pills (no couple name) and is visually unchanged — no regression from this work.

(If you don't have a Lovebirds invitation seeded, create one via `node scripts/create-invitation.mjs <slug> <password>` then `node scripts/seed-full-config.mjs <slug> …` per the root `CLAUDE.md`, or point an existing Lovebirds row at the dashboard.)

- [ ] **Step 5: Commit (if any incidental fixes were needed)**

```bash
git add -A
git commit -m "test(meta): regression pass for couple-name split"
```

---

## Self-Review

**Spec coverage:**
- Data — three new `meta` fields + derived title → Task 1 (compose) + Task 2 (persist). ✓
- MetaTab UI — two name boxes + suffix, no limits, derived-title preview → Task 4. ✓
- API compose + backward-compat raw title → Task 2 (incl. legacy test stays green). ✓
- Navbar structured read + fallback → Task 5 (both render paths). ✓
- Prefill from legacy title → Task 1 (`parseTitle`) + Task 4 (Step 3). ✓
- Tests (compose + backward-compat + parse) → Task 1 & Task 2. ✓
- i18n labels (the UI is dictionary-driven) → Task 3 (added because the spec's UI requires labels). ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `composeTitle` / `parseTitle` / `navNameFromMeta` signatures defined in Task 1 are used verbatim in Tasks 2, 4, 5. Field names `coupleName1` / `coupleName2` / `titleSuffix` consistent across spec, helper, API, UI, and navbar. ✓

**Note:** No character limits anywhere on the name/suffix inputs or the derived title, per Global Constraints (the legacy raw-`title` path keeps its existing `TITLE_MAX` slice only for backward-compat callers — it does not affect the new inputs).

**Lovebirds check (raised during planning):** Verified Lovebirds' `FloatingNavbar` is a section-pill nav with no couple-name brand and never parses `meta.title`, so the navbar coupling is Solary-only — there is no Lovebirds navbar task. The shared `MetaTab.tsx` change does apply to Lovebirds (its browser-tab + share title), covered by Task 6 Step 4.
