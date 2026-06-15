import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TimelineRail from "./TimelineRail.jsx";
import MemoryViewport from "./MemoryViewport.jsx";
import ConnectorPipe from "./ConnectorPipe.jsx";

/* Desktop Experience — pinned dual-panel, SCRUB-CONTINUOUS.

   Mekanika:
   - Outer container tinggi = items.length × 100vh. Inner sticky 100vh menahan
     panel (kamera galaxy HOLD di planet) selama cerita dituturkan.
   - Satu ScrollTrigger memetakan progress scroll → posisi chapter KONTINU
     (floatPos ∈ [0, n-1]). Yang kontinu ditulis LANGSUNG ke DOM lewat ref
     (tanpa setState per-frame) supaya 60fps & terasa "sedang discroll":
       • Filmstrip rail meluncur mulus (translateY di-interpolasi antar dot).
       • Garis progres terisi mengikuti scroll.
       • Shell fade-out di fase scroll-out.
     Yang diskret (teks + foto chapter) hanya berubah saat indeks bulat ganti
     (activeIndex = round(floatPos)) → cross-fade ringan, tanpa filter blur.
   - Connector pipa: origin (rail center) & target (foto) statis → recompute
     saat resize / ganti foto saja.
   - reduced-motion → outer collapse ke flow normal, strip statis. */

gsap.registerPlugin(ScrollTrigger);

const photoOf = (item) =>
  (item && (item.photo || (Array.isArray(item.photos) ? item.photos[0] : ""))) || "";

export default function StoryDesktopExperience({
  sectionLabel,
  planetName,
  heading,
  items = [],
}) {
  const outerRef = useRef(null);
  const stickyRef = useRef(null);
  const shellRef = useRef(null);
  const railViewportRef = useRef(null);
  const stripRef = useRef(null);
  const viewportRef = useRef(null);
  const progressRef = useRef(null);
  const itemRefs = useRef([]);

  /* Continuous geometry — written by the ScrollTrigger, never via setState. */
  const dotOffsetsRef = useRef([]); // dotTopInStrip per item
  const railCenterRef = useRef(0);
  const floatPosRef = useRef(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pipePoints, setPipePoints] = useState(null);

  const activeItem = items[activeIndex];
  const hasActivePhoto = !!photoOf(activeItem);

  /* translateY supaya dot di posisi `fp` (boleh pecahan) jatuh di rail center. */
  function tyForFloat(fp) {
    const offs = dotOffsetsRef.current;
    if (!offs.length) return 0;
    const max = offs.length - 1;
    const clamped = Math.max(0, Math.min(max, fp));
    const lo = Math.floor(clamped);
    const hi = Math.min(max, lo + 1);
    const f = clamped - lo;
    const dot = offs[lo] + (offs[hi] - offs[lo]) * f;
    return railCenterRef.current - dot;
  }
  function writeStrip(fp) {
    const el = stripRef.current;
    if (el) el.style.transform = `translate3d(0, ${tyForFloat(fp)}px, 0)`;
  }

  /* Reduced motion */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  /* Measure each item's dot offset within the strip + rail center so the strip
     can glide continuously. Recompute on items change + resize. */
  useLayoutEffect(() => {
    function measure() {
      const railEl = railViewportRef.current;
      if (!railEl) return;
      railCenterRef.current = railEl.clientHeight / 2;
      dotOffsetsRef.current = items.map((_, i) => {
        const itemEl = itemRefs.current[i];
        if (!itemEl) return 0;
        const dotEl = itemEl.querySelector(".timeline-dot");
        const dotTopInItem = dotEl ? dotEl.offsetTop + dotEl.offsetHeight / 2 : 14;
        return itemEl.offsetTop + dotTopInItem;
      });
      if (!reducedMotion) writeStrip(floatPosRef.current);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, reducedMotion]);

  /* ScrollTrigger — progress outer → floatPos (continuous) + activeIndex
     (discrete) + shell fade. Outer = n×100vh, sticky = 100vh. */
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

        /* continuous — direct DOM writes (no re-render) */
        writeStrip(floatPos);
        if (progressRef.current) {
          progressRef.current.style.transform = `scaleY(${Math.max(0.0001, itemP)})`;
        }

        /* discrete — text + photo swap only when the integer changes */
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
        /* Force rhythm.js to rebuild boundaries — section is now N×100vh, very
           different from other sections. Without an accurate rebuild the rhythm
           probe can mis-detect → travel overlay timing off / camera jumps. */
        if (window.galacticRhythm?.rebuildBoundaries) {
          window.galacticRhythm.rebuildBoundaries();
          window.galacticRhythm.applyScroll?.();
        }
      } catch {}
    }, 160);

    /* Retry rebuild — rhythm.js itself rebuilds at 600ms & 1800ms. */
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

  /* Compute pipe endpoints — rail center (left) → photo center (right).
     Static relative to the sticky container; recompute on resize / photo. */
  useEffect(() => {
    function compute() {
      const container = stickyRef.current;
      const railEl = railViewportRef.current;
      const photo = viewportRef.current?.querySelector(".story-polaroid");
      if (!container || !railEl) {
        setPipePoints(null);
        return;
      }

      const cRect = container.getBoundingClientRect();
      const rRect = railEl.getBoundingClientRect();

      const from = {
        x: rRect.right - cRect.left,
        y: rRect.top + rRect.height / 2 - cRect.top,
      };

      const targetEl = photo || viewportRef.current;
      if (!targetEl) {
        setPipePoints(null);
        return;
      }
      const vRect = targetEl.getBoundingClientRect();
      const to = {
        x: vRect.left + vRect.width / 2 - cRect.left,
        y: vRect.top + vRect.height / 2 - cRect.top,
      };

      setPipePoints({ from, to });
    }

    const raf = requestAnimationFrame(() => requestAnimationFrame(compute));
    window.addEventListener("resize", compute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", compute);
    };
  }, [items.length, hasActivePhoto, activeIndex]);

  const totalVh = Math.max(1, items.length) * 100;

  return (
    <div
      className="story-desktop"
      ref={outerRef}
      style={{
        position: "relative",
        width: "100%",
        height: reducedMotion ? "auto" : `${totalVh}vh`,
      }}
    >
      <div
        ref={stickyRef}
        className="story-desktop__sticky"
        style={{
          position: reducedMotion ? "relative" : "sticky",
          top: 0,
          width: "100%",
          height: reducedMotion ? "auto" : "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(1.5rem, 3vh, 3rem) clamp(1.25rem, 4vw, 3rem)",
        }}
      >
        <div
          ref={shellRef}
          className="story-desktop__shell glass-card"
          style={{
            width: "min(1080px, 100%)",
            maxHeight: reducedMotion ? "none" : "calc(100vh - 3rem)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            position: "relative",
            overflow: "hidden",
            willChange: reducedMotion ? "auto" : "opacity, transform",
          }}
        >
          {/* Header */}
          <div style={{ flex: "0 0 auto" }}>
            <div className="glass-card__title">
              {sectionLabel} Planet{" "}
              <span style={{ opacity: 0.55, padding: "0 8px" }}>·</span>{" "}
              <strong>{planetName}</strong>
            </div>
            <h2
              className="h-2 center-text"
              style={{ margin: 0, marginBottom: "0.25rem" }}
            >
              {heading}
            </h2>
            <div
              className="mono"
              style={{
                textAlign: "center",
                fontSize: 10,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--color-fg-mute)",
                opacity: 0.55,
                marginTop: 4,
              }}
              aria-hidden="true"
            >
              Chapter {Math.min(activeIndex + 1, items.length)} of {items.length}
            </div>
          </div>

          {/* Dual-panel grid */}
          <div
            className="story-desktop__grid"
            style={{
              position: "relative",
              flex: "1 1 auto",
              display: "grid",
              gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.1fr)",
              gap: "clamp(1.5rem, 3vw, 2.5rem)",
              alignItems: "stretch",
              minHeight: 0,
            }}
          >
            {/* Left: filmstrip rail viewport */}
            <div
              ref={railViewportRef}
              className="story-desktop__rail-viewport"
              style={{
                position: "relative",
                overflow: "hidden",
                paddingLeft: "clamp(1rem, 3vw, 2rem)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
              }}
            >
              {/* Scroll progress track — fills as you scroll the section */}
              {!reducedMotion && (
                <div className="story-progress" aria-hidden="true">
                  <span className="story-progress__fill" ref={progressRef} />
                </div>
              )}

              <div
                ref={stripRef}
                className="story-desktop__strip"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  paddingLeft: "clamp(1rem, 3vw, 2rem)",
                  paddingRight: "0.5rem",
                  willChange: "transform",
                }}
              >
                <TimelineRail
                  items={items}
                  activeIndex={activeIndex}
                  itemRefs={itemRefs}
                />
              </div>
            </div>

            {/* Right: memory viewport (single photo) */}
            <div
              ref={viewportRef}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 360,
              }}
            >
              <MemoryViewport items={items} activeIndex={activeIndex} />
            </div>

            {/* Connector pipe overlay */}
            <ConnectorPipe
              fromPoint={pipePoints?.from}
              toPoint={pipePoints?.to}
              visible={hasActivePhoto && !!pipePoints && !reducedMotion}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
