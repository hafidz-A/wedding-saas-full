# Wedding SaaS — Claude project context

> This file is loaded automatically into every Claude Code session.
> It captures the architecture decisions made in the previous conversation
> and the planned next sprints, so any new session can resume without recap.

---

## Project goal

Multi-tenant SaaS for premium wedding-invitation websites. One cinematic template, many couples — each couple = one row in the `invitations` table, each with their own slug (`/<slug>`), password-protected admin dashboard (`/<slug>/dashboard`), RSVP database, and gift confirmation database.

**Origin:** This project was scaffolded from `c:\Users\arifi\Downloads\Wedding Website Design new\` (a Vite + React wedding template with 14+ cinematic sections). All section components were copied **byte-identical** here, only the routing/data-loading layer changed. The Vite project remains at that path as a fallback / reference and **should not be edited from here**.

---

## Tech stack (decided, do not re-evaluate without asking)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | Stable for React 18.3.1, supports server components + cookies for auth gate |
| Animation | motion 12 + gsap 3.15 | Existing template depends on both, kept unchanged |
| Backend | Supabase (Postgres + Storage + RLS) | User chose this — credentials in `.env.local` |
| Admin auth | bcryptjs + HTTP-only cookies, per-slug session | One password per couple, no Supabase Auth email login |
| Forms | react-hook-form 7.55 | Existing pattern in Rsvp + WeddingGift |
| Hosting | Vercel | Subdomain in MVP, custom `.com`/`.id` later as Premium tier |

**Do not introduce**: Tailwind, shadcn, MUI, or any UI library — the template is hand-styled with CSS Modules and CSS variables. Adding a UI library would conflict with the existing design system.

---

## Multi-tenant model

```
weddingsite.com/                  → marketing / showcase
weddingsite.com/<slug>            → public invitation (server fetches Supabase, no auth)
weddingsite.com/<slug>/dashboard  → admin editor (password-gated, per-slug cookie)
```

- 1 template, N couples. Each `invitations` row owns its own `config` JSONB (same shape as `src/config/pageConfig.js`).
- Pasangan A's password/session NEVER grants access to Pasangan B's dashboard — session cookie is scoped `path: /<slug>`.
- Bootstrap new couples via `node scripts/create-invitation.mjs <slug> <password> [plan]`.

---

## File map — what lives where

```
src/
├── app/
│   ├── layout.tsx                ← global fonts (Cormorant + DM Sans), <body> bg
│   ├── page.tsx                  ← marketing landing
│   ├── [slug]/
│   │   ├── page.tsx              ← server: fetch invitation by slug, render invite
│   │   ├── InvitationView.tsx    ← client wrapper around the cinematic template
│   │   ├── not-found.tsx         ← unpublished / missing slug
│   │   └── dashboard/
│   │       ├── page.tsx          ← server: auth check + server action `loginAction`
│   │       ├── LoginForm.tsx     ← password input → server action POST
│   │       └── DashboardClient.tsx  ← STUB: overview / rsvps / gifts / editor tabs
│   └── api/
│       ├── rsvp/route.ts         ← POST: insert into `rsvps`
│       └── gift/route.ts         ← POST: insert into `gift_confirmations`
├── lib/
│   ├── supabase/{client,server,admin}.ts
│   └── password.ts               ← bcrypt hash/verify
├── sections/                     ← 16 cinematic sections (copied from Vite, 'use client')
├── components/                   ← ThemeProvider, GlobalBackground, BotanicalBorder, FloatingNavbar, ...
├── config/                       ← pageConfig.js, sectionRegistry.js, themes.js
├── hooks/                        ← useScrollReveal
├── renderers/SectionRenderer.jsx ← maps config.sections → React tree
└── styles/                       ← global.css + tokens.css + ...
```

`scripts/create-invitation.mjs` — CLI to bootstrap a couple's record (bcrypt hashes the password, inserts with `is_published=true`).

---

## Current status (Sprint 0 — complete)

✅ Next.js scaffold (112 files)
✅ Public invitation route fetches from Supabase, falls back to bundled demo config when env vars absent
✅ Dashboard route with per-slug password gate (bcrypt + HTTP-only cookie, session is `password_hash.slice(0, 32)`)
✅ API routes: `POST /api/rsvp`, `POST /api/gift` — resolve slug server-side, insert via service_role
✅ Rsvp + WeddingGift sections POST to those endpoints when `slug` prop present; fall back to simulated success when not
✅ Supabase schema in `../Wedding Website Design new/supabase/schema.sql` (5 tables + RLS + storage bucket)
✅ Bootstrap script `scripts/create-invitation.mjs`

---

## Next sprints (priority order)

### Sprint 1 — Block-based editor (the big one)
The dashboard editor tab is currently a JSON preview stub. Build the real editor:
- Left panel: list of `sections[]` from the invitation's `config`, drag-reorder
- Right panel: live preview iframe of `/<slug>?preview=1`
- Per-section: inline edit text fields (title, subtitle, intro), image upload to `invitation-media/<invitation_id>/...` bucket, GIF support
- "Publish" toggle that flips `is_published`
- Save = upsert `config` JSONB to Supabase via server action (NOT API route — server actions are simpler for auth-gated mutations)
- **Auth**: every save must re-verify the session cookie matches the slug being saved

### Sprint 2 — Dashboard data views
- `DashboardClient.tsx` `rsvps` tab: list of RSVP submissions, total attending count, export to CSV
- `gifts` tab: list with status workflow (`pending` → `verified` → `thanked`), total amount sum
- Server actions for status updates

### Sprint 3 — 3 template color variants
- `themes.js` already has 4 themes (`warmCream`, `darkLuxury`, `emeraldGarden`, `skyEditorial`). Trim/curate to 3 named templates: `classic`, `modern`, `garden`.
- `invitations.template_id` already exists. Wire it: `InvitationView` reads `invitation.template_id` and passes to ThemeProvider as a top-level theme override that supersedes per-section `theme:`.
- Dashboard "Template" tab → switcher with thumbnails.
- **Risk:** sections that hardcode colors instead of using CSS variables will break. Audit: `Rsvp.module.css` uses `var(--color-coral)` ✓ but check Hero gate gradients which currently hardcode `#E8553E`.

### Sprint 4 — Pricing gates + Vercel deploy
- Plan enforcement (free vs basic vs premium): max RSVPs, custom domain, watermark removal, gallery photo count
- Vercel project + env vars
- Subdomain routing (`<slug>.weddingsite.com`) via `middleware.ts` rewriting to `/<slug>` path

---

## Conventions to preserve

- **Section components stay byte-identical with the Vite project** — when in doubt, diff against `../Wedding Website Design new/src/sections/<Name>/<Name>.jsx`. Animation knobs (`SECTION_HEIGHT_VH`, ease curves, stagger windows) are the result of many iterations — do not "improve" them.
  - **Known intentional divergence:** `sections/WeddingGift/WeddingGift.jsx` renders the folded Gift Registry block (the standalone `registry` section was merged into Wedding Gift). Approved deviation — see `docs/superpowers/specs/2026-05-30-lovebirds-editor-dialogs-design.md` §B.
- **CSS Modules + CSS variables** for all section styling. No Tailwind, no styled-components.
- **Design tokens (unified 2026-06-28, project-wide — templates AND chrome).** Two canonical scales in `src/styles/tokens.css`; snap everything to them, no off-scale literals:
  - **Radius:** `--radius-xs 4 · --radius-sm 8 · --radius-md 16 (the one card/panel radius) · --radius-lg 24 · --radius-pill 999 · --radius-round 50%`. (`--radius-xl 32 / --radius-device 36 / --radius-screen 28` are phone-mockup bezels only.) The old `--border-radius-*` namespace was deleted; Solary's `--r-1/2/3/4` are thin aliases of this scale. Responsive `clamp()` radii and multi-value decorative shapes (polaroid frames, blobs) are the only allowed non-token forms.
  - **Control heights:** `--ctl-h-sm 36 · --ctl-h 44 (DEFAULT for every button/CTA/input; = `--tap-target`) · --ctl-h-lg 52 (hero/gate CTA)`. Public surfaces default 44; dense admin (dashboard/editor tables, icon buttons) use 36. Decorative graphics keep bespoke sizes.
  - **Guardrail:** `npm run check:tokens` fails on the dead `--border-radius-*` namespace, raw `999px`, any single-px radius literal, or an off-scale height on a button selector. Run it after touching control/token CSS.
- **No `import.meta.env`** — that's Vite. Use `process.env.NODE_ENV` in Next.
- **`'use client'`** lives on all section/component/hook files. Server components are: `src/app/**/page.tsx` and `src/app/api/**/route.ts`. Don't sprinkle 'use server' inside section components.
- **Secrets discipline:** `SUPABASE_SERVICE_ROLE_KEY` only in `src/lib/supabase/admin.ts` and `src/app/api/**`. Never reference it from a `'use client'` file.
- **User language:** the user (`arifinhafidz68@gmail.com`) writes in Bahasa Indonesia, mixed casual register. Reply in Bahasa for explanation, English for code/comments. Indonesian wedding-card domain conventions: bank account info section is critical (already shipped as WeddingGift).

---

## Known gotchas

1. **Demo invitation password hash:** the seed row in `schema.sql` has a placeholder hash (`$2b$10$REPLACE_WITH_REAL_HASH_OF_demo1234`) — login won't work with `demo1234` until replaced. Use `scripts/create-invitation.mjs` instead of relying on the seed row.
2. **Fallback config:** `src/app/[slug]/page.tsx` falls back to bundled `pageConfig.js` if (a) env vars missing, OR (b) invitation row's `config` JSONB is empty `{}`. This is intentional for first-run UX but **must be removed before launching to real customers** — they'd see the demo content if they haven't filled their own.
3. **Lazy section imports + Suspense:** SectionRenderer uses `React.lazy()`. Works in Next 14 but means each section is a separate chunk — that's fine, but be aware that hot-reload during edits can show the SectionSkeleton briefly.
4. **GSAP `gsap.registerPlugin(ScrollTrigger)` at module top:** runs on the client only because the file is `'use client'`. Don't move that call inside a component — pin-spacer recalculation costs increase.
5. **BotanicalBorder.tsx** is the global decorative layer + per-section sketch — heavy DOM. If perf gets bad on mobile, gate behind a `prefers-reduced-motion` query (already partially done in OurStory).

---

## How to test the current scaffold

```powershell
cd c:\Users\arifi\Downloads\wedding-saas-next
npm install                                  # one-time, ~3 min
# Edit .env.local with Supabase URL + 2 keys
# Run supabase/schema.sql in Supabase SQL Editor first

# Step 1 — create the couple row (password-hashes + starter 6-section config)
node scripts/create-invitation.mjs rizky-amara demo1234 `
  --bride="Amara Sastrawijaya" `
  --groom="Rizky Pratama" `
  --date=2025-11-15T16:00 `
  --venue="The Grand Ballroom, Jakarta" `
  --email=demo@example.com `
  --plan=premium

# Step 2 — seed the full 14-section cinematic template into the row
node scripts/seed-full-config.mjs rizky-amara `
  --bride="Amara Sastrawijaya" `
  --groom="Rizky Pratama" `
  --date=2025-11-15T16:00 `
  --venue="The Grand Ballroom, Jakarta"

npm run dev
```

Then:
- http://localhost:3000 → marketing
- http://localhost:3000/rizky-amara → full cinematic invitation (14 sections, all enabled)
- http://localhost:3000/rizky-amara/dashboard → login `demo1234` → dashboard

---

## Reference files in the OLD project (read-only from here)

- `../Wedding Website Design new/supabase/schema.sql` — full DB schema, run this in Supabase
- `../Wedding Website Design new/CLAUDE.md` — original Section 2 (Our Story) polaroid spec — not yet implemented in either project
- `../Wedding Website Design new/README.md` — long-form architecture write-up of the template

Avoid editing these from this session — they belong to the upstream Vite project.
