import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "motion/react";
import StoryPolaroid from "./StoryPolaroid.jsx";

/* Mobile Experience — scroll-driven, pinned single-photo story (Solary).

   Mirrors the DESKTOP machinery so the galaxy camera HOLDS on the planet while
   the story is told one chapter at a time:
   - Outer container height = items.length × 100vh (no inner scroll). Inner
     sticky 100vh keeps the glass card pinned.
   - One ScrollTrigger maps outer progress → floatPos (continuous) + activeIndex
     (discrete). Continuous values are written straight to DOM refs (no per-frame
     setState): a thin progress BAR fills, and the photo drifts (parallax) so the
     user clearly sees the section is being scrolled.
   - After mount we ScrollTrigger.refresh() + force galacticRhythm.rebuild so the
     custom rhythm probe re-measures this N×100vh section.
   - reduced-motion → outer collapses to flow; all chapters render as a simple
     vertical list (every chapter readable without scroll-pinning).

   The stacked-photo carousel is gone: ONE photo per chapter, no tap/dots. */

gsap.registerPlugin(ScrollTrigger);

const EASE = [0.32, 0.72, 0, 1];

const photoOf = (item) =>
  (item && (item.photo || (Array.isArray(item.photos) ? item.photos[0] : ""))) || "";

export default function StoryMobileExperience({
  sectionLabel,
  planetName,
  heading,
  items = [],
}) {
  const outerRef = useRef(null);
  const stickyRef = useRef(null);
  const shellRef = useRef(null);
  const progressRef = useRef(null);
  const parallaxRef = useRef(null);
  const floatPosRef = useRef(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const total = items.length;

  /* Reduced motion */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  /* ScrollTrigger — progress outer → floatPos + activeIndex + fade-out. */
  useEffect(() => {
    if (reducedMotion) return;
    if (!outerRef.current) return;
    const n = items.length;
    if (n < 1) return;

    const pinnedFraction = n > 1 ? (n - 1) / n : 0.85;

    const trigger = ScrollTrigger.create({
      trigger: outerRef.current,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => {
        const p = self.progress;
        const itemP = Math.min(1, p / pinnedFraction);
        const floatPos = itemP * Math.max(0, n - 1);
        floatPosRef.current = floatPos;

        /* continuous — direct DOM writes */
        if (progressRef.current) {
          progressRef.current.style.transform = `scaleX(${Math.max(0.0001, itemP)})`;
        }
        if (parallaxRef.current) {
          const frac = floatPos - Math.round(floatPos); // [-0.5, 0.5]
          parallaxRef.current.style.transform = `translate3d(0, ${frac * 14}px, 0)`;
        }

        /* discrete — chapter swap only when the integer changes */
        const idx = Math.min(n - 1, Math.max(0, Math.round(floatPos)));
        setActiveIndex((prev) => (prev === idx ? prev : idx));

        /* shell fade-out in the scroll-out phase */
        const shell = shellRef.current;
        if (shell) {
          if (p > pinnedFraction) {
            const fadeP = (p - pinnedFraction) / (1 - pinnedFraction);
            const o = Math.max(0, 1 - fadeP * 1.18);
            shell.style.opacity = String(o);
            shell.style.transform = `translate3d(0, ${(1 - o) * -16}px, 0)`;
          } else {
            shell.style.opacity = "1";
            shell.style.transform = "translate3d(0, 0, 0)";
          }
        }
      },
    });

    const refreshTimer = setTimeout(() => {
      try {
        ScrollTrigger.refresh();
        if (window.galacticRhythm?.rebuildBoundaries) {
          window.galacticRhythm.rebuildBoundaries();
          window.galacticRhythm.applyScroll?.();
        }
      } catch {}
    }, 160);

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

  /* ---- Reduced motion: simple, fully-readable vertical list ---- */
  if (reducedMotion) {
    return (
      <div className="story-mobile" style={{ position: "relative", width: "100%" }}>
        <div className="story-mobile__sticky" style={{ position: "relative", height: "auto" }}>
          <div className="story-mobile__shell glass-card" style={{ maxHeight: "none" }}>
            <div className="story-mobile__head">
              <div className="glass-card__title">
                {sectionLabel} Planet{" "}
                <span style={{ opacity: 0.55, padding: "0 6px" }}>·</span>{" "}
                <strong>{planetName}</strong>
              </div>
              <h2 className="h-2 center-text" style={{ marginTop: 0, marginBottom: 0 }}>{heading}</h2>
            </div>
            <ol className="story-mobile__list">
              {items.map((it, idx) => (
                <li key={idx} className="story-mobile__list-item">
                  <StoryPolaroid photo={photoOf(it)} number={idx + 1} />
                  <div className="story-mobile__desc" style={{ minHeight: 0 }}>
                    {it.year && <div className="story-mobile__year mono">{it.year}</div>}
                    {it.label && <h3 className="h-3" style={{ margin: "0 0 0.5rem" }}>{it.label}</h3>}
                    {it.desc && <p className="p-body" style={{ margin: "0 auto" }}>{it.desc}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const current = items[activeIndex] || items[0];
  const totalVh = Math.max(1, total) * 100;

  return (
    <div
      className="story-mobile"
      ref={outerRef}
      style={{ position: "relative", width: "100%", height: `${totalVh}vh` }}
    >
      <div
        ref={stickyRef}
        className="story-mobile__sticky"
        style={{
          position: "sticky",
          top: 0,
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding:
            "clamp(4.5rem, 12vh, 6rem) clamp(1rem, 5vw, 1.5rem) clamp(1.5rem, 5vh, 2.5rem)",
        }}
      >
        <div
          ref={shellRef}
          className="story-mobile__shell glass-card"
          style={{
            width: "min(560px, 92vw)",
            maxHeight: "calc(100vh - 6rem)",
            willChange: "opacity, transform",
          }}
        >
          {/* Header */}
          <div className="story-mobile__head">
            <div className="glass-card__title">
              {sectionLabel} Planet{" "}
              <span style={{ opacity: 0.55, padding: "0 6px" }}>·</span>{" "}
              <strong>{planetName}</strong>
            </div>
            <h2 className="h-2 center-text" style={{ marginTop: 0, marginBottom: "0.35rem" }}>
              {heading}
            </h2>
            <div className="story-mobile__chapter mono" aria-live="polite">
              Chapter {Math.min(activeIndex + 1, total)} of {total}
            </div>
          </div>

          {/* Scroll progress bar */}
          <div className="story-progress story-progress--h" aria-hidden="true">
            <span className="story-progress__fill" ref={progressRef} />
          </div>

          {/* Stage — single photo, parallax wrapper + cross-fade on chapter change */}
          <div className="story-mobile__stage">
            <div className="story-mobile__parallax" ref={parallaxRef}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`photo-${activeIndex}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.45, ease: EASE, exit: { duration: 0.3 } }}
                >
                  <StoryPolaroid photo={photoOf(current)} number={activeIndex + 1} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Description — active chapter */}
          <div className="story-mobile__desc">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
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
