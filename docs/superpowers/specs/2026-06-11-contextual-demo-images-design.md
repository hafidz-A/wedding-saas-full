# Contextual Demo Images + Empty-Slot Fallback — Design

**Date:** 2026-06-11
**Status:** Approved by user (chat)

## Problem

Demo/placeholder images across the product are not contextual, and some slots are
plain empty. Prospective buyers viewing the landing page or a live template
preview cannot visualize what photo belongs in each slot.

Current state:

- **Solary** (`src/all-templates/solary/config/pageConfig.js`): every photo is a
  random `picsum.photos` image — gate photos, Aruna & Daksa portraits, story
  memories ("Dress Fitting", "She Said Yes", …), the 18 Saturn-ring photos,
  team avatars, wishlist items. None match their captions.
- **Lovebirds** (`src/all-templates/lovebirds/defaultConfig.js`): Unsplash
  photos, but many don't match their alt/caption ("Birthday surprise",
  "Coffee mornings", "First dance" show generic wedding shots) and several
  photos repeat.
- **Genuinely empty slots**: `editor/schemas/weddingParty.ts` (Maya/Dimas
  `photo: ''`), `editor/schemas/solary/teamPlanet.ts` (avatars `''`),
  `lovebirds/sections/OurStoryStack/OurStory.jsx` demo fallback (5 cards
  `image: ''`).
- **Landing page**: `components/marketing/Features.tsx` hotlinks 2 Unsplash
  photos that loosely match their captions.
- Purchased invitations clone `defaultConfig` (see `lib/onboarding/seed-config.ts`),
  so fixing defaults fixes the buyer starter config too. Editor schemas
  duplicate the same URLs and must stay in sync.

## Decisions (user-approved)

1. **Image source: curated Unsplash hotlinks.** Real photography, picked per
   context key. No local download, no AI generation.
2. **Empty-slot behavior: contextual render-time fallback.** A published
   invitation never renders an empty image slot; empty `src` falls back to the
   same contextual demo photo. An editor-only hint tells the owner a sample
   photo will show until they upload their own.
3. **Architecture: central registry.** One module owns every demo image URL;
   default configs, editor schemas, the landing page, and the fallback logic
   all import from it.

## Design

### 1. Registry — `src/lib/demoImages.ts`

- `DEMO_PHOTOS: Record<DemoImageKey, string>` mapping context keys to Unsplash
  photo IDs (not full URLs). ~35–40 keys, grouped by domain:
  - couple/portraits: `coupleHero`, `bridePortrait`, `groomPortrait`, `coupleDuo`
  - story moments: `storyFirstMeet`, `storyFirstDate`, `storyTrip`,
    `storyProposal`, `storyWedding`, `dressFitting`, `cakeTasting`,
    `firstDance`, `birthday`, `coffeeMorning`, …
  - gallery/misc: beach, city lights, sunset walk, cooking together, …
  - wedding party/team: `maidOfHonor`, `bridesmaid2`, `bridesmaid3`,
    `bestMan`, `groomsman2`, `groomsman3`
  - wishlist/gifts: `wishlistCooking`, `wishlistHoneymoon`
  - landing: keys reused from the above
- `demoImg(key, width)` → `https://images.unsplash.com/photo-<id>?auto=format&fit=crop&w=<width>&q=80`.
  One photo serves multiple sizes without URL duplication.
- Plain TS module, no React. Safe to import from `.js` config files and
  server code alike.

### 2. Replace every demo source

- `lovebirds/defaultConfig.js`: all image URLs from the registry; each photo
  matches its caption/alt; duplicates removed.
- `solary/config/pageConfig.js`: all picsum URLs removed; every slot gets a
  caption-matched registry photo (gate ×3, portraits ×2, story memories,
  Saturn ring ×18, team avatars ×6, wishlist ×2).
- Editor schemas (`hero`, `ourStory`, `brideGroom`, `gallery`, `galleryHelix`,
  `galleryMasonry`, `gallerySpringCoil`, `weddingParty`, `weddingGift`,
  `solary/welcomePlanet`, `solary/giftPlanet`, `solary/teamPlanet`,
  `solary/saturnRing`): `defaults` import from the registry; previously empty
  defaults (Maya, Dimas, Rio, …) get photos. `newItem` templates stay `''` —
  a freshly added item is intentionally empty and is caught by the fallback.
- `components/marketing/Features.tsx`: 2 polaroid photos from the registry,
  matched to "Sweetest Vows" / "Infinite Love".
- `lovebirds/sections/OurStoryStack/OurStory.jsx` demo fallback array: 5 story
  photos filled in.

### 3. Render-time fallback — `src/lib/config/fillEmptyImages.ts`

- `fillEmptyImages(config, template)` walks `config.sections` and fills empty
  image-bearing fields with registry photos chosen by section type + item
  index (cycling when a list is longer than the key pool).
- Wired into the two existing normalization points so **no section component
  changes**:
  - lovebirds: inside/alongside `migrateLovebirdsConfig`
    (`src/lib/config/migrate-lovebirds.ts`, called from
    `app/[template]/[slug]/page.tsx`).
  - solary: inside `normalizeSolaryConfig`
    (`src/all-templates/solary/config/normalizeConfig.js`, called from Shell).
- Editor: `editor/fields/ImageField.tsx` shows a bilingual hint when its value
  is empty — id: "Kosong — contoh foto akan ditampilkan. Ganti dengan fotomu."
  / en equivalent — via the dashboard dictionary (dict-parity applies).
  Dashboard-only; never rendered on the public invitation.

### 4. Verification

- One-shot script `scripts/check-demo-images.mjs`: HEAD/GET every registry URL,
  fail on non-200 (catches dead Unsplash IDs before ship).
- Unit tests in `__tests__/` for `fillEmptyImages` (fills every empty slot on a
  minimal config; leaves non-empty values untouched).
- `npx tsc --noEmit` + `npx vitest run` (no `npm run lint` — interactive).
- Visual check of `/lovebirds/demo-*` and `/solary/demo-*` plus the landing
  page in a browser.

## Out of scope

- Downloading images locally / repo-bundled assets.
- AI-generated consistent fictional couple.
- Tutorial screenshots under `public/tutorial/` (already real screenshots).
- `TemplateShowcase.tsx` (no longer imported by the homepage).
- Caption/copy rewording (captions stay as-is; only photos change).
