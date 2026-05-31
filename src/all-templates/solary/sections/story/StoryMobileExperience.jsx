import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "motion/react";

/* Mobile Experience — scroll-driven, pinned story deck (themed to Solary).

   Mirrors the DESKTOP machinery so the galaxy camera HOLDS on the planet while
   the story is told one chapter at a time, then continues to the next planet:
   - Outer container height = items.length × 100vh (no inner scroll). Page scroll
     advances exactly one chapter per "page".
   - Inner sticky container (100vh) keeps the glass card pinned on screen.
   - A single ScrollTrigger maps outer scroll progress → activeIndex (during the
     pinned phase) + shellOpacity fade-out (during the scroll-out phase).
   - After mount we ScrollTrigger.refresh() and force
     window.galacticRhythm.rebuildBoundaries()/applyScroll() (+ retries) so the
     custom galaxy rhythm probe re-measures this N×100vh section and does NOT
     jump the camera to the next planet too early.
   - reduced-motion → outer collapses to flow, deck renders statically (no pin).

   NO next/prev/pager buttons — scrolling drives chapter advancement.
   Multi-photo chapters: tapping the FRONT card cycles that chapter's photos
   (dots indicator). No-photo chapters render a cosmic placeholder card. */

gsap.registerPlugin(ScrollTrigger);

// Peeking offsets/rotations for the up-to-two cards behind the active one.
const PEEK = [
  { rotate: 0, x: 0, y: 0, scale: 1, opacity: 1, blur: 0 },
  { rotate: 4, x: 18, y: 16, scale: 0.94, opacity: 0.62, blur: 1.2 },
  { rotate: -5, x: -18, y: 30, scale: 0.88, opacity: 0.38, blur: 2 },
];

export default function StoryMobileExperience({
  sectionLabel,
  planetName,
  heading,
  items = [],
}) {
  const outerRef = useRef(null);
  const stickyRef = useRef(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [shellOpacity, setShellOpacity] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);

  const total = items.length;

  /* Reduced motion (same as desktop) */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  /* Reset the per-chapter photo index whenever the chapter changes. */
  useEffect(() => {
    setPhotoIdx(0);
  }, [activeIndex]);

  /* ScrollTrigger — progress outer (FULL section) → activeIndex + fade-out.
     EXACT replica of the desktop machinery (only the refs differ).
     Outer height = items.length × 100vh, sticky height = 100vh. */
  useEffect(() => {
    if (reducedMotion) return;
    if (!outerRef.current) return;
    const n = items.length;
    if (n < 1) return;

    /* Fraction of section where panel is "pinned" (active items shown).
       = (outer_height - sticky_height) / outer_height = (n-1)/n. */
    const pinnedFraction = n > 1 ? (n - 1) / n : 0.85;

    const trigger = ScrollTrigger.create({
      trigger: outerRef.current,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => {
        const p = self.progress;
        /* activeIndex hanya bergerak di pinned phase */
        const itemP = Math.min(1, p / pinnedFraction);
        const idx = Math.min(n - 1, Math.max(0, Math.floor(itemP * n)));
        setActiveIndex((prev) => (prev === idx ? prev : idx));

        /* Fade-out shell di scroll-out phase */
        if (p > pinnedFraction) {
          const fadeP = (p - pinnedFraction) / (1 - pinnedFraction);
          const o = Math.max(0, 1 - fadeP * 1.18);
          setShellOpacity((prev) => (Math.abs(prev - o) < 0.01 ? prev : o));
        } else {
          setShellOpacity((prev) => (prev === 1 ? prev : 1));
        }
      },
    });

    const refreshTimer = setTimeout(() => {
      try {
        ScrollTrigger.refresh();
        /* Force rhythm.js to rebuild boundaries — section is now N×100vh,
           very different from other sections. Without an accurate rebuild the
           rhythm probe can mis-detect → camera jumps to the wrong planet. */
        if (window.galacticRhythm?.rebuildBoundaries) {
          window.galacticRhythm.rebuildBoundaries();
          window.galacticRhythm.applyScroll?.();
        }
      } catch {}
    }, 160);

    /* Retry rebuild — rhythm.js itself rebuilds at 600ms & 1800ms; re-trigger
       after those so our boundaries win. */
    const retryTimers = [400, 900, 2000].map((delay) =>
      setTimeout(() => {
        if (window.galacticRhythm?.rebuildBoundaries) {
          window.galacticRhythm.rebuildBoundaries();
        }
      }, delay)
    );

    return () => {
      clearTimeout(refreshTimer);
      retryTimers.forEach(clearTimeout);
      trigger.kill();
    };
  }, [items.length, reducedMotion]);

  if (total === 0) return null;

  const current = items[activeIndex] || items[0];
  const curPhotos = Array.isArray(current.photos) ? current.photos : [];
  const curMultiPhoto = curPhotos.length > 1;
  const advancePhoto = () => {
    if (curMultiPhoto) setPhotoIdx((i) => (i + 1) % curPhotos.length);
  };

  const totalVh = Math.max(1, total) * 100;

  return (
    <div
      className="story-mobile"
      ref={outerRef}
      style={{
        position: "relative",
        width: "100%",
        height: reducedMotion ? "auto" : `${totalVh}vh`,
      }}
    >
      <div
        ref={stickyRef}
        className="story-mobile__sticky"
        style={{
          position: reducedMotion ? "relative" : "sticky",
          top: 0,
          width: "100%",
          height: reducedMotion ? "auto" : "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          /* top pad clears the floating navbar in portrait + landscape */
          padding:
            "clamp(4.5rem, 12vh, 6rem) clamp(1rem, 5vw, 1.5rem) clamp(1.5rem, 5vh, 2.5rem)",
        }}
      >
        {/* Glass-card shell — opacity + small translateY follow shellOpacity */}
        <div
          className="story-mobile__shell glass-card"
          style={{
            width: "min(560px, 92vw)",
            maxHeight: reducedMotion ? "none" : "calc(100vh - 6rem)",
            opacity: reducedMotion ? 1 : shellOpacity,
            transform: reducedMotion
              ? "none"
              : `translate3d(0, ${(1 - shellOpacity) * -16}px, 0)`,
            willChange: reducedMotion ? "auto" : "opacity, transform",
          }}
        >
          {/* Header */}
          <div className="story-mobile__head">
            <div className="glass-card__title">
              {sectionLabel} Planet{" "}
              <span style={{ opacity: 0.55, padding: "0 6px" }}>·</span>{" "}
              <strong>{planetName}</strong>
            </div>
            <h2
              className="h-2 center-text"
              style={{ margin: 0, marginBottom: "0.35rem" }}
            >
              {heading}
            </h2>
            <div className="story-mobile__chapter mono" aria-live="polite">
              Chapter {Math.min(activeIndex + 1, total)} of {total}
            </div>
          </div>

          {/* Deck — front card = active chapter, next 1-2 peek behind */}
          <div className="story-mobile__stage">
            <div className="story-mobile__cards">
              {PEEK.map((preset, depth) => {
                const idx = (activeIndex + depth) % total;
                const it = items[idx];
                const photos = Array.isArray(it.photos) ? it.photos : [];
                const isFront = depth === 0;
                // Front card honours its own photoIdx; peeking cards show photo 0.
                const src = isFront ? photos[photoIdx] : photos[0];
                const number = String(idx + 1).padStart(2, "0");
                const interactive = isFront && curMultiPhoto;
                return (
                  <div
                    key={`${idx}-${depth}`}
                    className="story-mobile__card"
                    aria-hidden={isFront ? undefined : "true"}
                    role={interactive ? "button" : undefined}
                    tabIndex={interactive ? 0 : undefined}
                    aria-label={
                      interactive ? "Lihat foto berikutnya" : undefined
                    }
                    data-interactive={interactive ? "true" : "false"}
                    onClick={isFront ? advancePhoto : undefined}
                    onKeyDown={
                      interactive
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              advancePhoto();
                            }
                          }
                        : undefined
                    }
                    style={{
                      zIndex: PEEK.length - depth,
                      transform: `translate(-50%, -50%) translate3d(${preset.x}px, ${preset.y}px, 0) rotate(${preset.rotate}deg) scale(${preset.scale})`,
                      opacity: preset.opacity,
                      filter: preset.blur ? `blur(${preset.blur}px)` : "none",
                      pointerEvents: isFront ? "auto" : "none",
                    }}
                  >
                    <div className="story-mobile__photo">
                      {src ? (
                        <img
                          key={isFront ? `f-${photoIdx}` : `b-${depth}`}
                          className={
                            isFront
                              ? "story-mobile__img story-mobile__img--front"
                              : "story-mobile__img"
                          }
                          src={src}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        /* Cosmic placeholder for chapters with no photo */
                        <div
                          className="story-mobile__placeholder"
                          aria-hidden="true"
                        >
                          <span className="story-mobile__placeholder-star">
                            ✦
                          </span>
                        </div>
                      )}
                      <span className="story-mobile__num">{number}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Photo dots (active chapter, multi-photo only) */}
          {curMultiPhoto && (
            <div className="story-photo-dots" aria-hidden="true">
              {curPhotos.map((_, i) => (
                <span key={i} data-active={i === photoIdx ? "true" : "false"} />
              ))}
            </div>
          )}

          {/* Description — active chapter */}
          <div className="story-mobile__desc">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={
                  reducedMotion ? false : { opacity: 0, y: 10 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: [0.25, 0.8, 0.25, 1] }}
              >
                {current.year && (
                  <div className="story-mobile__year mono">{current.year}</div>
                )}
                {current.label && (
                  <h3 className="h-3" style={{ margin: "0 0 0.5rem" }}>
                    {current.label}
                  </h3>
                )}
                {current.desc && (
                  <p className="p-body" style={{ margin: "0 auto" }}>
                    {current.desc}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
