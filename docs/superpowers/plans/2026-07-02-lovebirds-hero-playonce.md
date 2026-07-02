# Lovebirds Hero Play-Once Entrance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scroll-scrubbed 250vh pinned Hero gate→photoblast with a 100svh play-once GSAP timeline entrance, per `docs/superpowers/specs/2026-07-02-lovebirds-hero-playonce-design.md` (Option B).

**Architecture:** Hero builds one paused `gsap.timeline()` at mount. `useScrollReveal({ once: false })` (existing hook) plays it when Hero enters the viewport and reverses it when Hero leaves. First page load locks scrolling (Lenis stop + temporary non-passive touchmove/wheel preventDefault) until the timeline completes, with a 3.5 s safety unlock. No ScrollTrigger, no pin, no `--gate` CSS var, no dedicated gate photo — `gateImage` becomes a featured (bigger, centered) member of the blast layer.

**Tech Stack:** Next.js 14, gsap 3.15 (core only — no ScrollTrigger in Hero), CSS Modules, existing `useScrollReveal` hook.

## Global Constraints

- No Tailwind/UI libraries; CSS Modules + CSS variables only.
- Radius tokens: snap to `--radius-*` scale; responsive `clamp()` radii allowed; run `npm run check:tokens` after CSS changes.
- `'use client'` stays on the section file. No `import.meta.env`.
- `blastLayout` scatter math stays byte-identical (angle/distance/rotate/scale/delay).
- Data contract unchanged: `gateImage`, `blastPhotos` (≤12), `petals` props as today. No editor/schema changes.
- Do not touch GallerySpringCoil/Schedule ScrollTriggers, SmoothScroll.tsx, or NoOverscroll.tsx.

---

### Task 1: Rewrite `Hero.module.css` for the play-once layout

**Files:**
- Modify: `src/all-templates/lovebirds/sections/Hero/Hero.module.css` (full rewrite)

**Interfaces:**
- Produces class names consumed by Task 2's JSX: `gate`, `stage`, `revealBg`, `decorLayer`, `decorTopLeft`, `decorBottomRight`, `petalLayer`, `petalAnchor`, `petalFloat`, `petalReveal`, `blastLayer`, `blastPhoto`, `blastFeatured`, `gateContent`, `glassCard`, `welcomeLine`, `welcomeMark`, `welcomeText`, `coupleName`, `namePart`, `amp`, `date`, `dot`, `venue`, `countdown`, `countCell`, `countValue`, `countLabel`, `ended`, `monogram`, `decorBottomLeftLineArt`, `flowerClusteredTopLeft`, `flowerBottomRight`, `gateGlow`, `scrollHint`, `scrollText`, `scrollLine`, `scrollChev`.

- [ ] **Step 1: Rewrite the stylesheet**

Key deltas from the current file (everything not listed below is kept verbatim from the current file):

```css
/* Section: one viewport tall, no pin, no custom props */
.gate {
  position: relative;
  height: 100vh;
  height: 100svh;
  background: var(--color-cream);
  overflow: visible;
  overflow-x: clip;
  z-index: 2;
}

/* Renamed from .sticky — nothing sticks anymore, it is just the stage */
.stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-x: clip;
  overflow-y: visible;
  isolation: isolate;
}

/* Rest states: everything the timeline animates starts hidden in CSS so the
   server-rendered first paint has no flash before GSAP takes over. */
.revealBg { /* same gradients; */ opacity: 0; }
.decorLayer { /* same; */ opacity: 0; }
.decorBottomLeftLineArt,
.flowerClusteredTopLeft,
.flowerBottomRight { /* same positioning; */ opacity: 0; }
.gateGlow { /* same gradient; */ opacity: 0; }
.scrollHint { /* same; */ opacity: 0; }

.blastPhoto {
  /* same box styling; rest transform mirrors the tween's from-state */
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.25);
  will-change: transform, opacity;
}

/* Featured center photo — the old gate photo, now the biggest blast card.
   Sizes mirror the old gateCard end-state per breakpoint. */
.blastFeatured {
  width: min(440px, 86vw);
  height: min(580px, 66vh);
  border-width: clamp(6px, 0.8vw, 10px);
  border-radius: var(--radius-lg);
  z-index: 2;
}

.gateContent {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0; /* timeline fades it in */
  /* rest unchanged */
}

/* glassCard::before: replace every var(--gate) expression with its gate=1
   final value — solid full card, no dissolve mask:
     box-shadow: 0 24px 60px rgba(42, 33, 24, 0.12),
                 inset 0 0 0 1px rgba(255, 255, 255, 0.35);
     (delete the -webkit-mask-image / mask-image lines) */
```

DELETE these blocks entirely (including their media-query overrides):
`.gateCard`, `.gateCard::after`, `.gateImg`, `.gateOverlay`, and the
`.gateCard { width/height calc(--gate) }` rules inside `@media (max-width: 767.98px)`, `(max-width: 480px)`, `(max-width: 380px)`.

ADD featured sizes to those same media queries:

```css
@media (max-width: 767.98px) { .blastFeatured { width: min(300px, 82vw); height: min(420px, 58vh); } }
@media (max-width: 480px)    { .blastFeatured { width: min(280px, 78vw); height: min(380px, 55vh); } }
@media (max-width: 380px)    { .blastFeatured { width: min(250px, 76vw); height: min(340px, 50vh); } }
```

KEEP verbatim: petal layer block (anchor/float/reveal + keyframes), blast layer, glass card text/typography/countdown blocks, mobile `backdrop-filter: none` overrides, scroll-hint pulse keyframes, reduced-motion animation-none block.

- [ ] **Step 2: Run the token guardrail**

Run: `npm run check:tokens`
Expected: PASS (no dead namespace, no off-scale radii).

### Task 2: Rewrite `Hero.jsx` as a play-once timeline

**Files:**
- Modify: `src/all-templates/lovebirds/sections/Hero/Hero.jsx`

**Interfaces:**
- Consumes: Task 1 class names; `useScrollReveal({ threshold, once })` → `{ ref, isVisible }`; `window.__lenis` exposed by SmoothScroll.
- Produces: same public component API (`Hero(props)` with the DEFAULTS prop shape) — SectionRenderer needs no change.

- [ ] **Step 1: Strip the scroll machinery**

Remove: `ScrollTrigger` import + `gsap.registerPlugin` call + its comment, `clamp01`, `easeOutCubic`, `applyProgress`, `gateImgRef`, `gateContentRef` (replaced by `contentRef`), `vhRef`, `contentShiftVhRef`, `reduceMotion` state + its two matchMedia effects, the ScrollTrigger pin/scrub effect, and the `.gateCard`/`.gateImg`/`.gateOverlay` JSX. Keep `import { gsap } from 'gsap'`.

- [ ] **Step 2: Add the featured-photo blast list**

After the (unchanged) `blastLayout` memo:

```jsx
  // The old fullscreen gate photo is now the hero of the blast itself:
  // biggest card, dead-center, barely tilted, first to appear.
  const blastItems = useMemo(() => {
    const items = blastLayout.map((b) => ({ ...b, featured: false }))
    if (cfg.gateImage) {
      items.unshift({ src: cfg.gateImage, x: 0, y: 0, rotate: -2, scale: 1, delay: 0, featured: true })
    }
    return items
  }, [blastLayout, cfg.gateImage])
```

- [ ] **Step 3: Wire visibility + refs + first-load lock + timeline**

```jsx
  const { ref: sectionRef, isVisible } = useScrollReveal({ threshold: 0.35, once: false })

  const contentRef = useRef(null)
  const revealBgRef = useRef(null)
  const decorRefs = useRef([])
  const hintRef = useRef(null)
  const petalRefs = useRef([])
  const blastRefs = useRef([])
  const tlRef = useRef(null)
  const playedRef = useRef(false)
  const isVisibleRef = useRef(false)
  const unlockRef = useRef(null)
```

First-load lock (mount-only effect):

```jsx
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined

    const lenis = window.__lenis
    lenis?.stop?.()
    const prevent = (e) => { if (e.cancelable) e.preventDefault() }
    document.addEventListener('touchmove', prevent, { passive: false })
    document.addEventListener('wheel', prevent, { passive: false })

    let done = false
    const unlock = () => {
      if (done) return
      done = true
      lenis?.start?.()
      document.removeEventListener('touchmove', prevent)
      document.removeEventListener('wheel', prevent)
    }
    unlockRef.current = unlock
    const safety = setTimeout(unlock, 3500)
    return () => { clearTimeout(safety); unlock() }
  }, [])
```

Timeline build effect (rebuilds when layout inputs change; restores finished state after rebuild):

```jsx
  useEffect(() => {
    const rm = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const fades = [revealBgRef.current, ...decorRefs.current].filter(Boolean)

    const tl = gsap.timeline({
      paused: true,
      onComplete: () => { playedRef.current = true; unlockRef.current?.() },
    })

    if (contentRef.current) {
      tl.fromTo(contentRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.0, ease: 'power2.out' }, 0)
    }
    if (fades.length) {
      tl.fromTo(fades, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, ease: 'power1.out' }, 0.25)
    }
    blastItems.forEach((b, i) => {
      const node = blastRefs.current[i]
      if (!node) return
      gsap.set(node, { xPercent: -50, yPercent: -50 })
      tl.fromTo(node,
        { x: 0, y: 0, rotation: 0, scale: 0.25, autoAlpha: 0 },
        { x: b.x, y: b.y, rotation: b.rotate, scale: b.scale, autoAlpha: 1, duration: b.featured ? 0.8 : 0.7, ease: 'power3.out' },
        b.featured ? 0.15 : 0.45 + b.delay * 2)
    })
    petalData.forEach((p, i) => {
      const node = petalRefs.current[i]
      if (!node) return
      tl.fromTo(node,
        { rotation: p.slot.rot - 540 * p.speed, scale: 0, autoAlpha: 0 },
        { rotation: p.slot.rot, scale: p.slot.scale, autoAlpha: 1, duration: 1.0, ease: 'power2.out' },
        0.5 + p.slot.delay)
    })
    if (hintRef.current) {
      tl.fromTo(hintRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power1.out' }, 1.15)
    }

    if (rm) {
      tl.progress(1)
      playedRef.current = true
      unlockRef.current?.()
    } else if (playedRef.current) {
      tl.progress(isVisibleRef.current ? 1 : 0)
    }

    tlRef.current = tl
    return () => { tl.kill(); tlRef.current = null }
  }, [blastItems, petalData])
```

Play/reverse on visibility:

```jsx
  useEffect(() => {
    isVisibleRef.current = isVisible
    const tl = tlRef.current
    if (!tl) return
    if (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    if (isVisible) tl.play()
    else if (playedRef.current) tl.reverse()
  }, [isVisible, blastItems, petalData])
```

- [ ] **Step 4: Update the JSX**

- `<section ref={sectionRef} className={styles.gate} aria-label="Welcome gate">`
- Stage div: `className={styles.stage}` (no separate stage ref needed).
- `revealBg` gets `ref={revealBgRef}`.
- `DecorCorners` becomes `function DecorCorners({ innerRef })` with `<div ref={innerRef} className={styles.decorLayer} …>`; call site passes `innerRef={(el) => { decorRefs.current[0] = el }}`.
- Corner flower cluster / line-art / bottom-right flower / gateGlow get `ref={(el) => { decorRefs.current[1..4] = el }}` respectively.
- Blast layer maps `blastItems`; featured item gets `className={`${styles.blastPhoto} ${styles.blastFeatured}`}`.
- Delete the gateCard/gateImg/gateOverlay JSX block.
- `gateContent` gets `ref={contentRef}`; `scrollHint` gets `ref={hintRef}`.
- Everything else (petals, glass card contents, Countdown, monogram) unchanged.

- [ ] **Step 5: Verify compile**

Run: `npx tsc --noEmit` → expected PASS.
Run: `npm run lint` (if configured) → no new errors in Hero.jsx.

### Task 3: Verify behavior and ship

**Files:** none new.

- [ ] **Step 1: Dev-server verification** on `/lovebirds/demo-lovebirds` (desktop + 390×844 mobile emulation):
  1. First load: entrance plays (~1.7 s); scrolling is blocked during it, released after.
  2. Scroll down past Hero → blast retracts to center (reverse), page keeps scrolling freely.
  3. Scroll back to top → entrance replays, no lock.
  4. Featured (gate) photo is the big centered card behind the glass text; countdown ticks; `?to=` greeting renders.
  5. No console errors; no horizontal overflow.
- [ ] **Step 2: Reduced-motion spot check** — emulate `prefers-reduced-motion: reduce`: final state renders immediately, page scrollable at once.
- [ ] **Step 3: Commit and push**

```bash
git add src/all-templates/lovebirds/sections/Hero/Hero.jsx src/all-templates/lovebirds/sections/Hero/Hero.module.css docs/superpowers/plans/2026-07-02-lovebirds-hero-playonce.md
git commit -m "feat(lovebirds): play-once hero entrance replaces scroll-scrubbed gate"
git push
```

## Self-review

- Spec coverage: no gate photo ✓ (Task 2 step 2), play-once timeline with same scatter math ✓, 100svh ✓, enter/leave replay ✓ (visibility effect), first-load-only lock ✓, reduced motion ✓, decor kept & fades in ✓, petals spin during entrance then rest ✓, scroll hint fades in at end ✓, Option A untouched as documented fallback ✓.
- Placeholders: "keep verbatim" references point at exact existing blocks, all new logic shown in full.
- Type consistency: `blastItems` produced in Task 2 step 2, consumed in steps 3–4; class names produced in Task 1 match Task 2 step 4 usage.
