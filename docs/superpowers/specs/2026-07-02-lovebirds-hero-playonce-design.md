# Lovebirds Hero — play-once entrance (replaces scroll-scrubbed gate→photoblast)

**Date:** 2026-07-02
**Status:** Approved (user chose Option B; Option A preserved below as fallback)

## Problem

The Hero gate→photoblast is scroll-scrubbed: a pinned 250vh section where every
scroll pixel recomputes transforms for the gate card, ≤12 blast photos, 8 petals,
and several `--gate`-driven CSS effects. Deep profiling (see
`hero-scroll-perf-pattern` memory, 2026-06-30) showed the cost is systemic —
the section pays the whole page's scroll machinery every frame. Multiple
optimization passes (paint cuts, driver rewrites, numeric scrub, write-skip)
could not make it smooth on phones. The user chose to replace the concept.

## Decisions (user-confirmed 2026-07-02)

1. **No dedicated gate photo element.** The fullscreen photo that shrank into a
   card is gone. The `gateImage` becomes ONE of the blast photos — rendered
   larger than the others and closest to center, so it stays the focal point.
   No data/schema/editor changes: `gateImage` + `blastPhotos` fields are reused
   as-is.
2. **Play-once, not scroll-scrubbed.** The entrance is a fixed-duration
   animation (~1.2–1.5 s) that runs by itself. Choreography and ordering match
   the current scroll version: glass card (text + countdown) fades in from low
   opacity; blast photos burst from center with the SAME scatter math
   (`blastLayout`: angle/distance/rotate/scale/delay — keep byte-identical);
   petals appear and spin WHILE the entrance plays, then rest at their final
   pose (no infinite spin); corner decor + revealBg gradient fade in and stay.
3. **Section is 100vh** (was 250vh). No ScrollTrigger, no pin, no scrub in Hero.
4. **Replay on viewport exit/enter, event-triggered.** When Hero leaves the
   viewport (scrolling down) → play the timeline in REVERSE (photos retract to
   center, card dims). When Hero re-enters from below → play the entrance
   again. Triggered ONCE per enter/leave via IntersectionObserver — never tied
   to scroll position per-pixel.
5. **Scroll lock only on first load.** On initial page load the entrance plays
   with scrolling locked until it finishes, gate-style. Re-entries never lock;
   the animation plays in the background while the user keeps scrolling.
6. **Reduced motion:** skip the animation entirely, render the final state,
   never lock scroll.

## Architecture — Option B (chosen): GSAP timeline, event-triggered

- Hero builds ONE paused `gsap.timeline()` at mount holding the entire
  choreography (card fade, staggered blast, petal spin-in, decor fades). The
  existing `applyProgress` math is ported into timeline tweens; the scatter
  targets come from the same `blastLayout` memo.
- `useScrollReveal({ once: false, threshold: ~0.35 })` (existing hook, already
  used by 6 sections) reports Hero visibility. `isVisible: true` →
  `tl.play()`; `false` → `tl.reverse()`. GSAP handles mid-flight direction
  changes gracefully (no snap) if the user flicks back quickly.
- First-load lock: on mount (Hero is at page top so it is always visible
  first), lock scroll, `tl.play()`, unlock in `onComplete`. Lock mechanism:
  `window.__lenis?.stop()/start()` for wheel/trackpad plus a temporary
  non-passive `touchmove` preventDefault on `document` for touch — active ONLY
  during the ~1.5 s lock window, then removed. A safety timeout (~3 s) force-
  unlocks if `onComplete` never fires (e.g. tab backgrounded throttles rAF).
- ScrollTrigger import, pin, scrub, `applyProgress`-on-scroll, `--gate` CSS var
  plumbing, vh caches, and the 250vh layout are all removed from Hero. Other
  sections (GallerySpringCoil, Schedule) keep their ScrollTriggers untouched.
- Petal behavior: single spin-in tween per petal (rotate through
  `~540° × speed`, ease out) running the length of the timeline, ending at
  `slot.rot` + full scale. The infinite CSS float (`petalFloat`) stays — it is
  a cheap compositor keyframe.
- The `.gateCard`, `.gateImg`, gate overlay, and the width/height `calc(--gate)`
  CSS are deleted. The featured photo reuses `.blastPhoto` styling with a
  `featured` modifier class (larger clamp sizes, highest z within blast layer,
  minimal rotation, shortest distance from center).

## Option A (fallback, NOT implemented — revisit if B still feels heavy)

Same trigger (`useScrollReveal({ once: false })`) but no GSAP: Hero root gets a
`.visible` class; all motion is CSS transitions/keyframes with per-photo
`transition-delay` (the pattern WeddingParty/Rsvp/Footer use). Cheapest
possible (fully compositor-driven, zero JS per frame), slightly less precise
sequencing control. Switching from B to A means replacing the timeline effect
with the class toggle and moving the tween values into the CSS module — the
DOM structure, blastLayout math, and reveal hook usage are shared by design.

## Not in scope

- No editor/dashboard/schema changes (fields reused as-is).
- No changes to other sections' ScrollTriggers or to SmoothScroll/Lenis config.
- Old scroll-scrubbed Hero is recoverable from git history (pre-this-change);
  it is not kept as a parallel component.

## Testing

- Dev server on `/lovebirds/demo-lovebirds`: first load locks ~1.5 s then
  releases; scroll past Hero → reverse plays without locking; scroll back →
  entrance replays without locking.
- Mobile emulation + real phone: no pinned section jank; native scroll all the
  way through Hero.
- `prefers-reduced-motion`: final state renders immediately, no lock.
- Countdown still ticks; guest-name greeting (`?to=`) still renders.
