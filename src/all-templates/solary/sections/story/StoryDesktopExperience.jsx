import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TimelineRail from "./TimelineRail.jsx";
import MemoryViewport from "./MemoryViewport.jsx";
import ConnectorPipe from "./ConnectorPipe.jsx";

/* Desktop Experience — pinned dual-panel, parallax-in-parallax.

   Mekanika:
   - Outer container tinggi = items.length × 100vh (full content, no inner
     scrollbar). Page scroll alami menyajikan satu item per "halaman".
   - Inner sticky container 100vh menampung 2-column UI.
   - Left rail: filmstrip — semua item di-render bertumpuk vertikal,
     strip di-translateY supaya dot item aktif selalu di TENGAH viewport
     rail. Items di luar fade lewat CSS mask + opacity per-item.
   - ScrollTrigger pemetaan progress scroll outer → activeIndex.
     Reverse scroll (user balik dari planet di bawah) otomatis reverse
     activeIndex karena progress turun dari 1.0 → 0.0.
   - Connector pipa: origin (rail center) & target (cluster center) statis
     → cuma recompute saat resize. Pipa visible kalau active punya foto.
   - reduced-motion → outer collapse ke flow normal, strip render statis. */

gsap.registerPlugin(ScrollTrigger);

export default function StoryDesktopExperience({
  sectionLabel,
  planetName,
  heading,
  items = [],
}) {
  const outerRef = useRef(null);
  const stickyRef = useRef(null);
  const railViewportRef = useRef(null);
  const stripRef = useRef(null);
  const viewportRef = useRef(null);
  const itemRefs = useRef([]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [stripTranslateY, setStripTranslateY] = useState(0);
  const [pipePoints, setPipePoints] = useState(null);
  const [shellOpacity, setShellOpacity] = useState(1);

  const activeItem = items[activeIndex];
  const hasActivePhoto =
    !!activeItem &&
    Array.isArray(activeItem.photos) &&
    activeItem.photos.length > 0;

  const lastPhotoIndex = useMemo(() => {
    for (let i = activeIndex; i >= 0; i--) {
      const p = items[i]?.photos;
      if (Array.isArray(p) && p.length > 0) return i;
    }
    return -1;
  }, [activeIndex, items]);

  /* Reduced motion */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  /* ScrollTrigger — progress outer (FULL section) → activeIndex + fade-out.
     Outer height = items.length × 100vh, sticky height = 100vh.
     - Pinned range = (items.length - 1) × 100vh of scroll (CSS sticky natural).
     - Scroll-out range = 100vh (panel exits viewport naturally).
     - end: "bottom top" → progress 1 right when section bottom = viewport top
       (= section truly ends, transition immediately after).

     activeIndex bergerak di [0, pinnedFraction] dari progress.
     Sisanya [pinnedFraction, 1] dipakai untuk fade-out shell → eliminate
     "dead zone" perception. Saat transisi rhythm.js fire, panel sudah
     ~fully faded + ~scrolled out → transisi terasa intentional. */
  useEffect(() => {
    if (reducedMotion) return;
    if (!outerRef.current) return;
    const n = items.length;
    if (n < 1) return;

    /* Fraction of section where panel is "pinned" (active items shown).
       = (outer_height - sticky_height) / outer_height
       Dengan outer = n × 100vh dan sticky = 100vh → (n-1)/n. */
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
          /* fade slightly aggressive — opacity hits 0 at fadeP ~0.85
             supaya panel benar-benar invisible sebelum transition fire */
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
        /* Force rhythm.js to rebuild boundaries karena section ini sekarang
           N × 100vh, sangat berbeda dari section lain. Tanpa rebuild yang
           akurat, probe rhythm bisa salah deteksi → travel overlay timing off
           dan scene.setActive() bisa lompat ke planet salah. */
        if (window.galacticRhythm?.rebuildBoundaries) {
          window.galacticRhythm.rebuildBoundaries();
          window.galacticRhythm.applyScroll?.();
        }
      } catch {}
    }, 160);

    /* Retry rebuild beberapa kali karena rhythm.js sendiri rebuild
       di 600ms & 1800ms — pastikan kita re-trigger setelahnya juga. */
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

  /* Compute strip translateY supaya dot item aktif (activeIndex) ada
     di vertical center rail viewport. */
  useLayoutEffect(() => {
    if (reducedMotion) {
      setStripTranslateY(0);
      return;
    }
    const itemEl = itemRefs.current[activeIndex];
    const railEl = railViewportRef.current;
    if (!itemEl || !railEl) return;

    /* Cari posisi DOT di dalam item (timeline-dot diposisikan absolute
       di top: 14px relative ke item). */
    const dotEl = itemEl.querySelector(".timeline-dot");
    const itemTopInStrip = itemEl.offsetTop;
    const dotTopInItem = dotEl ? dotEl.offsetTop + (dotEl.offsetHeight / 2) : 14;
    const dotTopInStrip = itemTopInStrip + dotTopInItem;

    const railH = railEl.clientHeight;
    const railCenter = railH / 2;

    const ty = railCenter - dotTopInStrip;
    setStripTranslateY(ty);
  }, [activeIndex, reducedMotion, items]);

  /* Compute pipe endpoints — rail center (left) → cluster center (right).
     Statis relatif ke sticky container, hanya recompute saat resize. */
  useEffect(() => {
    function compute() {
      const container = stickyRef.current;
      const railEl = railViewportRef.current;
      const cluster = viewportRef.current?.querySelector(".polaroid-cluster");
      if (!container || !railEl) { setPipePoints(null); return; }

      const cRect = container.getBoundingClientRect();
      const rRect = railEl.getBoundingClientRect();

      const from = {
        x: rRect.right - cRect.left, /* right edge of rail viewport */
        y: rRect.top + rRect.height / 2 - cRect.top, /* vertical center */
      };

      let to;
      if (cluster) {
        const vRect = cluster.getBoundingClientRect();
        to = {
          x: vRect.left + vRect.width / 2 - cRect.left,
          y: vRect.top + vRect.height / 2 - cRect.top,
        };
      } else {
        /* fallback target — right panel center */
        const viewportEl = viewportRef.current;
        if (!viewportEl) { setPipePoints(null); return; }
        const vRect = viewportEl.getBoundingClientRect();
        to = {
          x: vRect.left + vRect.width / 2 - cRect.left,
          y: vRect.top + vRect.height / 2 - cRect.top,
        };
      }

      setPipePoints({ from, to });
    }

    const raf = requestAnimationFrame(() => requestAnimationFrame(compute));
    window.addEventListener("resize", compute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", compute);
    };
  }, [items.length, hasActivePhoto]);

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
          className="story-desktop__shell glass-card"
          style={{
            width: "min(1080px, 100%)",
            maxHeight: reducedMotion ? "none" : "calc(100vh - 3rem)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            position: "relative",
            overflow: "hidden",
            opacity: reducedMotion ? 1 : shellOpacity,
            transform: reducedMotion
              ? "none"
              : `translate3d(0, ${(1 - shellOpacity) * -16}px, 0)`,
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
                /* soft fade-out top/bottom for filmstrip feel */
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
              }}
            >
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
                  transform: `translate3d(0, ${stripTranslateY}px, 0)`,
                  transition: reducedMotion
                    ? "none"
                    : "transform 800ms cubic-bezier(0.32, 0.72, 0, 1)",
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

            {/* Right: memory viewport (cluster) */}
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
              <MemoryViewport
                items={items}
                activeIndex={activeIndex}
                lastPhotoIndex={lastPhotoIndex}
              />
            </div>

            {/* Connector pipa overlay */}
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
