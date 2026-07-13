# Lovebirds — Master Visual Foundation (Illustrated Edition)

> **Status:** Approved foundation, pending one sign-off (rendering flavor — see §B3).
> **Date:** 2026-06-18
> **Phase:** 2 of a multi-phase image overhaul.
> Phase 1 = template audit (see findings below). Phase 3 = per-asset prompt
> generation, built on the five bibles in this document.
> **Scope:** Lovebirds template only. Does not touch Solary, the shared demo
> registry, editor schemas, or marketing.

This is the locked reference for **all future Lovebirds image generation**. It
supersedes the photographic approach in `docs/lovebirds-character-system.md`'s
*delivery* (the couple/character spec there is carried forward; the medium
changes from AI-photo to illustration).

---

## Why this exists — Phase 1 audit conclusion

The shipped Lovebirds demo photos (`src/all-templates/lovebirds/demoImages.js`
→ `public/templates/lovebirds/demo/`, provenance in that folder's `CREDITS.md`)
failed on two counts:

1. **Our Story was story-empty.** 4 of 5 chapter cards showed *no people*
   (a candlelit table, an empty road, a ring in a box, an empty ceremony tent) —
   the exact failures the brief names. The 5th was an unidentifiable silhouette.
2. **No single couple.** The hero, the two Bride & Groom portraits, and the
   "our wedding" gallery shot were visibly **three different couples**. A guest
   could not answer "who is getting married?"

**The medium decision:** move from curated stock photos → **original
illustration**. Illustration *guarantees* one consistent couple and lets every
milestone actually depict the couple — neither of which stock could.

The template's layout, section order, and copy already describe a clean
5-chapter story; only the imagery failed. Nothing in the narrative is redesigned
or invented here.

---

## A. Master Character Bible

The template has exactly one couple — **Rani** (bride) and **Adi** (groom),
Indonesian, modern, late-20s/early-30s. They are the *only* humans in the
system. Every face-bearing asset is one of them; there is never a third unnamed
couple. (Identity carried from `docs/lovebirds-character-system.md` §1.)

### A1 — Recurring bride: Rani
| Attribute | Locked value |
|---|---|
| Age read | 28 |
| Face | Soft oval-heart; gentle jaw; slightly pointed chin; full soft cheeks |
| Skin | Warm tan (*sawo matang*), golden undertone, even |
| Eyes | Dark almond-brown; full soft natural brows |
| Hair | Dark brown-black, soft waves, past the shoulders |
| **Signature features** | Faint dimple; soft natural asymmetry |
| Build / height | Slim, graceful posture; **165 cm** |
| Wardrobe | Earth-tone — cream, soft coral, emerald; flowy modern kebaya / dress; minimal **gold** jewelry |

### A2 — Recurring groom: Adi
| Attribute | Locked value |
|---|---|
| Age read | 30 |
| Face | Soft-square; defined jaw; strong chin |
| Skin | Warm olive, a touch **deeper than Rani**, golden-olive undertone |
| Eyes | Dark brown; thick brows; calm warm gaze |
| Hair | Black, neat & short; **well-groomed light short beard** |
| **Signature features** | Light short beard (kept neat); thick brows |
| Build / height | Athletic-slim, broad shoulders; **178 cm (~13 cm taller than Rani)** |
| Wardrobe | Earth-tone — cream/emerald blazer, linen shirt, modern beskap (formal); brown leather-strap watch |

### A3 — Physical consistency requirements (non-negotiable)
1. Same face every time — shape, feature placement, proportions identical;
   verified against the two canonical solo portraits, never re-derived.
2. Signature features always consistent (Rani's hair & dimple, Adi's beard,
   thick brows, jaw line) — the fastest "it's them" cues.
3. Skin tone never drifts — no lightening/whitening; Adi stays slightly deeper
   than Rani.
4. Height differential constant (~13 cm) wherever both stand — eye-lines,
   shoulder heights, embrace geometry reflect it.
5. Mature adult proportions (~7–7.5 heads). No chibi / big-head / child-like.
6. Hair identity constant; styling may vary by chapter (e.g. bridal styling),
   identity does not.

### A4 — Visual consistency requirements
1. Wardrobe stays in the earth-tone family (cream / coral / gold / emerald).
2. Jewelry minimal & gold for Rani; Adi's brown leather watch is a recurring
   prop.
3. They appear as a pair — same line weight, render, and lighting on both.
4. Solo slots only where the layout demands one person (2 Bride & Groom portrait
   cards, 2 footer polaroids). Everywhere else they are together and interacting.

---

## B. Visual Style Bible

### B1 — Illustration style
**"Warm editorial storybook."** Refined hand-made wedding illustration: soft,
intimate, nostalgic — a curated stack of remembered moments. Cartoonized *enough*
to feel warm and personal, **mature** enough to feel premium and adult.
Indonesian-modern warmth throughout.

### B2 — Color palette (locked — source of truth: `config/themes.js`)
- **Grounds / neutrals:** cream `#FDF6EC`, cream-deep `#F7EBD7`; ink charcoal
  `#2A2118`, taupe `#5C4A3A`.
- **Five accents (+ soft tint):** coral `#E8553E`/`#F4A38F` · gold
  `#F5C842`/`#FBE3A6` · emerald `#2D8C4E`/`#8FCBA1` · purple `#6B35A8`/`#C9A5E8`
  · sky `#3D9BC1`/`#A8D5E3`.
- **Gold leaf gradient** `#FFEAB0→#EAA220→#C49010` — names/monogram accents only,
  never large fills.
- **Branch / wood** `#8B6F47`, `#5C4A3A` — environment, ornaments, framing.
- **Usage:** cream is the air; charcoal/taupe is line + text; accents are
  seasoning — **one dominant accent per image** (no rainbow). Skin tones live in
  the warm-tan/olive band, not part of the accent rotation.

### B3 — Rendering style  ⚠️ THE ONE OPEN DECISION
**Recommended: line-and-wash + soft gouache** — visible warm-brown ink line +
soft, lightly textured fills, paper grain, bright-and-airy values (no muddy
darks / blown highlights), soft ambient shadow, no hard digital gradients, no
glossy 3-D, no photo-bashing.
**Alternatives presented:** flat vector (cleaner/cooler) · painterly no-line
gouache (softer). Everything else in this doc holds regardless of which is
chosen.

### B4 — Line style
- Warm dark-brown line (`#5C4A3A`→`#2A2118`), **never pure black**.
- Variable weight — tapering, slightly imperfect, hand-drawn; thicker outer
  contours, thin/broken interior detail.
- Faces carry **minimal interior linework**; a few decisive strokes + fills.

### B5 — Composition style (inherits existing layout)
- Story cards: portrait **3:4**, couple in central vertical band, environment
  *suggested* not fully rendered.
- Hero/gate: generous empty space above the couple for the text overlay; faces
  in the central band to survive the cover-crop on mobile *and* desktop.
- Rule-of-thirds, real breathing room, one focal point; the couple is the
  subject, never decoration beside an object.
- Existing framing vocabulary: arched-top "polaroid-arch" frames, tilted memory
  cards (Our Story stack rotations), footer polaroids — compose to sit inside
  these.

### B6 — Wedding-invitation style
Premium Indonesian wedding e-invite: warm, earth-toned, candlelit-but-bright,
personal, nostalgic. Display type **Great Vibes** (Cormorant Garamond serif
fallback) for names/titles; **Plus Jakarta Sans** for body. The **lovebird +
leafy-branch** motif (`config/ornamentThemes.js`) is the recurring decorative
signature — illustrations share its palette and line.

---

## C. Storytelling Bible

### C1 — Emotional continuity
Fixed rising curve the imagery must carry: **reverence → first spark →
deepening intimacy → shared partnership → peak (proposal) → fulfilment (wedding)
→ communal invitation → gratitude.** Each chapter image lands its beat's emotion
on the couple's faces/bodies — the proposal spikes, the wedding glows; never an
empty room or object.

### C2 — Narrative continuity (existing milestones only — no new chapters)
Five Our Story chapters from `defaultConfig.js`:

| # | Chapter (copy cue) | Frame must show |
|---|---|---|
| 01 | The First Meeting — "a quiet evening by the sea" | First encounter, shy spark — both present |
| 02 | Our First Date — "bonfires, salty wind, sky turning gold" | The two on a dusk beach by a small bonfire, intimate |
| 03 | Our Holiday Together — "shared snacks… home is the other person" | Couple together at a scenic spot, arm-in-arm, at ease |
| 04 | The Proposal — "a quiet question… a yes" | Adi kneeling, Rani's genuine emotional reaction |
| 05 | The Wedding Day — "surrounded by the people we love" | Couple at the altar/arch, hands joined |

Cross-chapter: chronological progression legible (subtle wardrobe/season/time
shifts 2020→wedding), wardrobe stays earth-tone, recurring motifs carry through
(lovebirds, palette, Adi's watch, Rani's gold). Same two people age forward
into the wedding.

### C3 — Memory-driven storytelling
Images read as **remembered, hand-printed moments** — candid framing, a caught
in-between instant, slight imperfection — designed to live as the tilted memory
cards in the Our Story stack and the footer polaroids: a couple's curated
keepsakes on a table.

### C4 — Human-interaction requirements
**Every couple/story image shows genuine interaction** — touch, eye contact,
shared action, real reaction. Per chapter: lean toward each other (01), huddled
by the fire (02), arms around facing out (03), kneel + hands-to-face reaction
(04), joined hands under the arch (05). **Banned:** two figures apart staring at
camera; a solo where the story implies a pair; the couple ignoring each other.
Only valid solo frames: the two portrait cards and two footer polaroids.

---

## D. Illustration Rules (pass/fail gates)

- **Cartoonized but mature** — warm, simplified, charming; adult proportions
  (~7 heads), realistic body logic. ✗ chibi, big-head, child-like, sticker-cute.
- **Emotionally authentic** — real micro-expression, natural asymmetry, a
  believable in-between moment. ✗ identical frozen smiles, perfect symmetry.
- **Premium wedding quality** — refined linework, cohesive palette, intentional
  composition, restraint. ✗ clip-art, default-template, busy clutter.
- **Natural body language** — weight shifts, leaning, contrapposto, relaxed
  shoulders, two people sharing space. ✗ bolt-upright facing forward.
- **Natural gestures** — hands doing believable things (holding, touching,
  reaching, covering a happy gasp). ✗ floating/claw/hidden hands.
- **Living characters** — implied breath and motion, light in the eyes, an
  ongoing moment. ✗ waxwork stillness, dead stare.
- **Not stock-photo posing** — no symmetrical "pose for camera," no matching
  catalogue grins, no staged hand-on-shoulder cliché.
- **Not mannequin-like** — no plastic/poreless render, no stiff limbs, no blank
  doll faces, no two faces from the same mold.

---

## E. Consistency Rules (cross-asset contract)

1. **One couple, period.** Rani & Adi in every face-bearing slot. Can't tell
   it's them → fail.
2. **Reference hierarchy.** The two canonical **solo portraits** define the
   faces; generate/lock them first, then carry them as visual reference into
   every scene (text alone drifts).
3. **Identity invariants travel with every prompt:** face shape, skin tone
   (Adi deeper), hair, signature features (Adi's beard / thick brows / jaw),
   ~13 cm height gap.
4. **Palette discipline.** Locked palette only (§B2); one dominant accent per
   image, mapped to the chapter's existing accent where one exists (Our Story
   stack order: coral, emerald, purple, sky, coral-deep).
5. **Line & render discipline.** Same line color/weight and chosen render
   (§B3) on every asset, couple and ornament alike.
6. **Lighting continuity.** Bright-and-airy, warm, soft daylight/candlelight; no
   chapter goes dark/harsh/cold.
7. **Wardrobe continuity.** Earth-tone family always; evolves believably across
   chronological chapters, never leaves the world.
8. **Ornaments unchanged (per user).** The existing SVG lovebird + branch +
   floral ornaments stay exactly as-is — do NOT redraw, restyle, or replace
   them. New illustrations only coexist with them, sharing the palette and line.
9. **Aspect-ratio targets per slot:** hero/gate **4:5** (faces centered for
   cover-crop); solo portraits **4:5**; Our Story cards **3:4**; gallery tiles
   mixed (3:2 / 1:1 / 4:5) per masonry. Compose to target.
10. **QA loop before any image ships:** place candidate beside the two reference
    portraits — same two people? signature marks present? height gap right?
    on-palette? milestone shown with real interaction? emotion matches the beat?
    Any "no" → regenerate.

---

## Slot map (for Phase 3)

Face-bearing (Rani & Adi, interacting unless a designated solo):
`coupleGate` (hero, both faces) · `bridePortrait` / `groomPortrait` (canonical
solos) · `coupleClassic` · `coupleCasual` · `storyFirstMeet` · `storyFirstDate`
· `storyHoliday` · `storyProposal` · `storyWedding` · plus couple-bearing gallery
beats.

Atmosphere/object tiles (no couple — kept as gallery texture, illustrated in the
same palette/line): `galleryCoffee` · `galleryRings` · `gallerySunrise` ·
`galleryBeach` · `galleryRoadTrip` · `galleryCityLights` · `galleryFamilyDinner`.

Full per-placement mapping: `demoImages.js` + `defaultConfig.js`.
