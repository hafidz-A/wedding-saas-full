# Live-preview discoverability — design

**Date:** 2026-07-24
**Status:** Phase B approved and implemented; Phase C recorded, deferred.
**Surface:** marketing landing → `VibeExploration` (section `#vibe`).

---

## Problem

Visitors do not realise they can open a **real, full invitation** before buying. The
capability already exists — every catalog entry has a `demoSlug`, and
`VibeExploration` already links to `/{template}/{demoSlug}` — but nobody finds it.

This is a discoverability failure, not a missing feature.

## Root causes

Three compounding causes, each a distinct design-system violation:

1. **Opaque label.** `landing.vibeExploration.liveReview` was the literal string
   `'Live Review'` in *both* the `id` and `en` dictionaries. To an Indonesian reader
   "review" means *ulasan/testimoni* — someone else's opinion — not "open the actual
   invitation". The label named a mechanism, not an outcome.
   *Violated: recognition over recall; a control must name what happens.*

2. **Inverted visual hierarchy.** The link rendered as `.btnGhost` — transparent
   background, 1.5px outline — immediately beside `.btnPrimary`, which carries a solid
   palette fill, a `box-shadow`, and an animated flipping label (`CinematicCtaText`).
   Fill + shadow + motion outweigh a hairline outline by a wide margin, so attention
   and clicks went to "Beli Undangan" and the exploratory action was never seen.
   *Violated: visual weight should track the value of the action.*

3. **The decoy card.** `PreviewMock` renders an abstract 4:5 card (eyebrow, names,
   rule, date, fake RSVP pill) that recolours with the palette. It is the most
   invitation-looking thing on screen, so visitors read it as *the* preview and
   conclude that is all there is. Nothing signals that a complete cinematic
   invitation sits one click away.
   *Violated: signifiers — the element that looks like the product was not the door
   to the product.*

Underneath all three: for a high-consideration emotional purchase the funnel must run
**see → trust → buy**. Here "buy" shouted and "see" whispered.

---

## Phase B — the card becomes the door (this change)

### B1. Copy

`src/lib/i18n/dictionaries/landing.ts`, `vibeExploration`, both `id` and `en`
(key paths are parity-tested by `src/lib/i18n/__tests__/dict-parity.test.ts`):

| Key | Before | After (id) | After (en) |
|---|---|---|---|
| `liveReview` → `viewLive` | `Live Review` | `Lihat Undangan Asli` | `See the Real Invitation` |
| `previewOpen` *(new)* | — | `Buka undangan lengkap` | `Open the full invitation` |
| `previewHint` *(new)* | — | `Gratis, tanpa perlu daftar.` | `Free, no signup needed.` |

The key itself is renamed `liveReview` → `viewLive`: the old name encoded the very
jargon being removed, and it had exactly two references (the two dictionaries and the
component).

Copy follows the marketing voice rule — impersonal, no personal pronouns.

### B2. The preview card becomes a link

`PreviewMock` is **shared** with the dashboard Palette tab
(`src/app/[template]/[slug]/dashboard/PaletteTab.tsx`), so the component itself stays
presentational and unchanged. The door is built at the `VibeExploration` call site:

- Wrap `<PreviewMock>` in an `<a href={previewHref} target="_blank" rel="noreferrer">`
  with `aria-label={`${t.previewOpen} — ${template.label}`}`.
- The wrapper mirrors `PreviewMock`'s own box constraints (`max-width: 400px`,
  centred, flush-left at ≥1024px) so an overlay pinned to the wrapper aligns with the
  card rather than the grid cell.
- Overlay an **always-visible** pill (`.doorBadge`) carrying a play glyph and
  `t.previewOpen`, tinted with the live palette accent.

**The badge is always visible, never hover-only.** Hover affordances do not exist on
touch, and the majority of this audience shops on a phone — a hover-only signifier
would leave the original problem untouched on the devices that matter most.

Interaction: pointer cursor, a small lift on hover, a palette-accent `focus-visible`
ring for keyboard users, and the lift suppressed under `prefers-reduced-motion`.

### B3. Rebalanced actions

- The view action moves from `.btnGhost` to a new `.btnSecondary`: a translucent
  accent tint plus a 1.5px accent border, keeping `color: palette.fg` so contrast
  holds on both light and dark palettes. It now reads as a real, co-equal action
  without competing with the solid primary.
- `t.previewHint` renders beneath the actions in `palette.fgMuted`, removing the
  unspoken "will this cost me something / do I have to sign up first" hesitation.

`.btnGhost` is left in the stylesheet only if still referenced; otherwise removed.

### Constraints

- Design tokens only — `--radius-md`, `--radius-pill`, `--ctl-h`, `--space-*`. No raw
  `999px`, no off-scale control heights. `npm run check:tokens` must stay green.
- `PreviewMock` and the dashboard Palette tab must not change behaviour.
- id/en dictionary key parity must hold.

### Acceptance criteria

1. The preview card is a link to `/{template}/{demoSlug}`, opens in a new tab, and
   carries a visible affordance without hovering — on desktop and on touch.
2. The card is reachable and operable by keyboard, with a visible focus ring.
3. No control anywhere reads "Live Review".
4. Switching template or palette re-themes the badge and keeps the link correct.
5. The dashboard Palette tab renders exactly as before.
6. `npm run typecheck`, `npm run test`, and `npm run check:tokens` pass.

---

## Phase C — in-page live preview (deferred, not built)

Recorded at the user's request so the option is not lost.

**Idea.** Clicking the preview opens the real demo invitation in a full-screen in-page
drawer — an `<iframe src={`/${template.id}/${template.demoSlug}?embed=1`}>` — instead
of switching tabs. The visitor never leaves the funnel, so the sequence becomes
see → trust → buy in a single continuous motion.

**Why it is attractive.** `?embed=1` already exists and is already used by
`PhoneFrameView`, so the rendering path is proven. Removing the tab switch removes the
main drop-off point between "curious" and "convinced".

**Why it is deferred — the real risks.**

- **Lenis scroll lock.** Overlays on Lenis-scrolled marketing pages must call
  `window.__lenis.stop()` and set `data-lenis-prevent`, or scrolling leaks to the page
  behind the drawer.
- **GSAP pin.** `VibeExploration` is pinned and scrubbed via `ScrollTrigger` on
  desktop. Mounting a full-screen overlay inside a pinned, transformed subtree needs
  care — most likely the drawer must portal out of the pinned container.
- **Performance.** Both demos are heavy (Solary loads three.js). Mounting one inside
  the landing page competes with the landing's own animation budget; the iframe must
  mount lazily on open and unmount on close.
- **Mobile.** On phones the drawer would effectively become the existing phone-frame
  experience, so the two paths need reconciling rather than stacking.

**Sequencing.** Phase C should build on top of Phase B, not replace it: the card stays
the door, and only the door's destination changes from a new tab to an in-page drawer.
Ship B, watch how it performs, then decide whether C is worth the risk.
