# Slug Collision Suggestions — Design

**Date:** 2026-05-29
**Status:** Approved (pending spec review)
**Scope:** Onboarding slug picker — add auto-suggested alternatives when the chosen slug is taken.

---

## Problem

Couple names collide often (common Indonesian names), so the prefilled slug
(`budi-sari`) is frequently already taken. The onboarding form already detects
this and blocks submit, but it only shows `✗ Sudah dipakai` and leaves the user
to invent an alternative themselves. We want to offer ready-to-click
alternatives that are guaranteed available.

## What already exists (do NOT rebuild)

| Capability | Location |
|---|---|
| Prefill slug from bride+groom first names | `OnboardingForm.tsx:36-44` |
| User-editable slug input | `OnboardingForm.tsx:213-225` |
| Debounced real-time availability check | `OnboardingForm.tsx:46-58` + `actions.ts:141-154` |
| Status UI (checking / available / taken) + submit gating | `OnboardingForm.tsx:227-252` |
| Server-side validation + availability re-check on submit | `actions.ts:84-90` |
| `validateSlug` (3–40 chars, `^[a-z0-9]+(-[a-z0-9]+)*$`) | `seed-config.ts:142-151` |
| 1 user = 1 invitation enforcement | `actions.ts:65-82` |

The only gap is **suggesting available alternatives on collision**.

## Goal

When the chosen slug is taken, show up to **3 clickable chips**, each a
**verified-available** alternative, in this order:

1. **Date-based** — `${base}-${weddingYear}` → `budi-sari-2026`
2. **Name-variant** — `${bride}-dan-${groom}` → `budi-dan-sari`
3. **Numbered** — first free `${base}-N` → `budi-sari-2`

Clicking a chip fills the input and the existing check turns it green.

## Approach

**Server-verified suggestions** (chosen over client-side generation): the
server generates candidates and probes each against the DB, returning only
free ones. Rationale: a suggested chip must always work; a client-only guess
could itself be taken (double collision). Cost is a few indexed lookups on the
unique `slug` column within the existing round-trip.

## Design

### 1. Pure generator — `src/lib/onboarding/slug-suggestions.ts` (new)

```ts
export interface SuggestionContext {
  base: string          // the taken slug (already validated/lowercased)
  brideName?: string
  groomName?: string
  weddingDate?: string  // ISO datetime
}

// Build ordered candidate strings (date, name-variant, numbered).
// Pure — no DB. Returns more candidates than needed so the caller can
// filter by availability and still reach 3.
export function buildSlugCandidates(ctx: SuggestionContext): string[]
```

Rules:
- **Date:** parse year from `weddingDate`; skip if absent/invalid.
- **Name-variant:** `${firstWord(bride)}-dan-${firstWord(groom)}`; also a
  no-separator fallback `${bride}${groom}`. Skip any equal to `base`.
- **Numbered:** `${base}-2`, `${base}-3`, … (generate a run, e.g. up to -9).
- Every candidate must pass `validateSlug` (≤40 chars, valid format).
  Candidates that overflow 40 chars are dropped (do not truncate mid-word).
- De-duplicate while preserving order.

### 2. Server action — extend `checkSlugAvailable` (`actions.ts`)

New optional second arg `ctx?: { brideName; groomName; weddingDate }`.
When the slug is taken AND `ctx` is present:
- Call `buildSlugCandidates`, probe each against `invitations.slug` (citext
  unique), collect the first 3 that are free.
- If fewer than 3 free (rare), keep incrementing the numbered strategy until 3
  are found or a hard cap (e.g. -99) is hit.

Return shape:
```ts
{ available: false, reason: 'Sudah dipakai', suggestions: string[] }  // taken
{ available: true }                                                    // free
```
`available: true` path is unchanged (no suggestions needed).

### 3. Client — chips (`OnboardingForm.tsx`)

- Pass `{ brideName, groomName, weddingDate }` into `checkSlugAvailable`.
- `slugStatus` gains `suggestions?: string[]`.
- When taken and `suggestions.length > 0`, render a row of chip buttons under
  the status line. Clicking a chip: `setSlugTouched(true); setSlug(chip)` →
  existing debounced effect re-checks → turns green.

### 4. i18n (`src/lib/i18n/dictionaries/auth.ts` onboarding form section)

Add `try` label: ID `'Coba:'`, EN `'Try:'`.

## Out of scope (unchanged)

Prefill, debounce, submit gating, `completeOnboarding`, DB schema, the broader
self-serve payment flow.

## Testing

Unit-test the pure generator `buildSlugCandidates`:
- base taken, full context → date + name-variant + numbered present, ordered.
- no `weddingDate` → date strategy skipped.
- single-word name → name-variant skipped if it equals base / is invalid.
- long base where `${base}-2026` > 40 chars → date candidate dropped.
- numbered run produces sequential valid candidates.

The DB-probing layer in `checkSlugAvailable` is thin; verify it returns only
free candidates (mock the admin query) and stops at 3.

## Risks

- **Extra DB reads per keystroke-after-debounce when taken.** Bounded (≤ ~5
  probes) and on an indexed unique column; acceptable.
- **All reasonable candidates taken** (pathological). Numbered strategy with a
  cap guarantees termination; worst case shows fewer than 3 chips.
