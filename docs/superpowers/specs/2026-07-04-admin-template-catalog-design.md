# Admin module 4 — Template & catalog

> Date: 2026-07-04
> Status: Approved decisions, ready for plan
> Depends on: [admin foundation](2026-07-04-admin-foundation-design.md) (gate,
> layout, `logAdminAction`, revalidate conventions) + module 1's landing →
> `VibeExploration` plumbing. Program: memory `admin-console-program`.

## Goal

`/admin/templates` — let the operator manage the **existing** invitation templates
without a deploy: turn each template on/off, edit its display metadata (label,
category assignment, tags, accent colour, thumbnail, sort order) and its **marketing
copy (tagline + blurb, bilingual ID/EN)**. Mirrors the module-1 pattern: a DB table
is the source of truth, marketing reads it (with code as fallback), the editor
writes it + revalidates.

## Why / context (verified)

- **Templates are code-bound.** `templateIndex.js` imports each template's config +
  its render Shell is a client component — so a template **cannot be created from
  the DB**; the editor manages the templates that already exist in code (lovebirds,
  solary).
- Display metadata is static today in `src/config/templateCatalog.js` (label,
  category, description, thumbnail, accent, tags); the marketing **tagline + blurb**
  shown on the card come from the **i18n dictionary** (`landing.vibeExploration.
  byTemplate[id]`), and palettes from `vibeData.ts`.
- Categories live in `src/config/categories.js` (bilingual); a category renders as
  "coming soon" when no template declares it.
- Module 1 already makes the landing server component fetch DB data and pass it to
  `VibeExploration` — module 4 rides the same wire.

## Approved decisions

- **Editable from admin:** enable/disable · label · **category assignment** (from
  the fixed code list) · tags · accent · thumbnail · sort order · **tagline (id +
  en)** · **blurb (id + en)**.
- **Categories list stays in code** — the operator only *assigns* a template to one
  of the existing categories; renaming/adding categories is not in scope (a new
  category needs a new template, which needs code anyway).
- **Thumbnail = upload via the existing `/api/upload`** (stored URL).
- Admin **chrome** is Indonesian-only (module 0), but the tagline/blurb it edits are
  **bilingual public marketing content** (two fields, id + en) — no contradiction.
- **Unified page (merged with module 1):** the price/plan editor and this template
  editor are **one page** `/admin/templates` — each template opens an editor with a
  **Tampilan** (presentation) section + a **Paket & Harga** (plans) section. There is
  **no separate `/admin/pricing`** (operator's mental model: a template = its look +
  its prices).
- **Two states only** (`enabled` on/off) — no per-template "Segera/preview" state;
  "coming soon" stays auto-derived per category.
- **Folded-in improvements (design notes, not questions):** a live card **preview**
  while editing; EN tagline/blurb **pre-seeded** from the current copy (never start
  blank); show **usage + revenue per template** (active invitations from module 2;
  units sold + revenue from module 3) so a popular template isn't disabled by
  mistake; a **draft (unpaid) on a just-disabled template can still finish
  checkout** (disable blocks new picks, not an in-flight purchase); the editable
  **accent is the card accent only**, not the template's internal palettes.

## Data model (module-4 migration)

- New `templates` table (one row per code template):
  `template_id text pk`, `enabled boolean not null default true`, `label text`,
  `category text` (must be a `categories.js` id), `tags text[]`, `accent text`,
  `thumbnail text`, `sort_order int`, `tagline_id text`, `tagline_en text`,
  `blurb_id text`, `blurb_en text`. RLS service-role only (read server-side like
  `template_plans`).
- **Seed** from `templateCatalog.js` (metadata) + the current i18n copy
  (tagline/blurb) so nothing changes visually on day one. Code remains the fallback.

## Architecture

- **`/admin/templates/page.tsx`** (server, `requireAdmin()`): the single unified
  template page (no separate `/admin/pricing`). Lists the code templates
  (`TEMPLATE_IDS`); each opens a two-section editor — **Tampilan** (presentation,
  this module) + **Paket & Harga** (plans, via module 1's `updatePlan`) — with a
  live card preview and a usage/revenue line per template.
- **`TemplateEditor.tsx`** (client): per template — enabled toggle, label, category
  dropdown (from `CATEGORIES`), tags, accent (colour), thumbnail (upload via
  `/api/upload`), sort order, and tagline + blurb each with an **ID and EN** field.
- **`app/admin/templates/actions.ts`** — `updateTemplate(templateId, patch)`:
  `requireAdmin()` re-check → validate (category ∈ `CATEGORIES`; both languages
  present for tagline/blurb; accent a valid colour; thumbnail a URL) → upsert into
  `templates` → `logAdminAction` → `revalidateTag('templates')` (+ the landing).
- **Read side:** a client-safe `toTemplateDisplay(row)` mapper + a server fetch
  (`getTemplates()`, cached under tag `templates`, code fallback). The landing
  `page.tsx` passes template display data to `VibeExploration`, which now renders
  **tagline/blurb from the DB** (was i18n) and honours `enabled` + `sort_order`.
  The onboarding template picker also reads it and hides disabled templates.
- **Disable semantics (baked in):** a disabled template is **hidden from the
  marketing carousel + the onboarding picker only** — existing invitations that use
  it keep rendering (public page + their dashboard are unaffected). "Coming soon"
  for a category is still auto-derived (a category with no *enabled* template).

## Cross-module wiring (via module 0)

- Uses `requireAdmin`, `logAdminAction`, and the cache map. Adds the **`templates`
  cache tag** (module 0 already anticipates it).
- Thumbnail reuses the existing `/api/upload` (magic-byte + mime guard already
  there).

## Interfaces

- `toTemplateDisplay(row): TemplateDisplay` (client-safe).
- `getTemplates(): Promise<TemplateDisplay[]>` (server, cached, code fallback).
- `updateTemplate(templateId: string, patch: Partial<{ enabled: boolean; label: string; category: string; tags: string[]; accent: string; thumbnail: string; sort_order: number; tagline_id: string; tagline_en: string; blurb_id: string; blurb_en: string }>): Promise<{ ok: boolean; error?: string }>`.

## Red-team / edge cases

- **Can't create new templates from the DB** (code-bound) — the editor only manages
  existing ones; the list is driven by `TEMPLATE_IDS`.
- **Disable must not break live invitations** — only marketing + new onboarding are
  gated; the public render + owner dashboard for an existing invitation on that
  template keep working.
- **Tagline/blurb move i18n → DB** — seed from the current i18n values so nothing
  regresses; `VibeExploration` falls back to code/i18n if a DB row is missing.
- **Bilingual required** — save rejects a tagline/blurb with only one language
  filled (avoids a blank EN card for English visitors).
- **Category must be a real `categories.js` id**; accent a valid colour; thumbnail a
  valid uploaded URL.
- **All-templates-disabled guard** — if every template is disabled, the marketing
  carousel would be empty; keep at least a graceful empty state (and the operator
  can re-enable).
- Disabling the only template in a category flips that category to "coming soon" —
  expected, but worth noting.

## Testing

- **Unit:** `updateTemplate` validation (category in list, both languages required,
  accent/thumbnail/enabled types); `toTemplateDisplay` (DB → shape; code fallback);
  a disabled template is hidden from the marketing + onboarding lists but an
  existing invitation on it still renders; non-admin rejected.
- **Manual / browser:** toggle a template off → gone from marketing + onboarding,
  its live demo still opens; edit accent/label/tagline (id+en) → reflected after
  save (revalidate), both languages correct; reorder via sort_order.

## Out of scope

- Creating/removing templates (needs code) and editing/adding **categories**
  (code).
- Per-palette editing (palettes stay in `vibeData.ts`).

## Operator steps

- Apply the module-4 migration (`templates` table) + seed from
  `templateCatalog.js` and the current i18n tagline/blurb.
