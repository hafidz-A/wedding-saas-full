import React, { useEffect, useRef } from "react";
import { useSwipe } from "../utils/useSwipe.js";

/* Headless: keyboard (ArrowUp/Down, PageUp/Down) + swipe untuk jump
   antar section. Tombol visual sekarang ada di FloatingNavbar. */
export default function SectionArrows({ sectionIds = [] }) {
  const rootRef = useRef(typeof document !== "undefined" ? document.body : null);

  const jump = (dir) => {
    const ids = sectionIds.filter(Boolean);
    if (!ids.length) return;
    const vh = window.innerHeight;
    let activeIdx = 0;
    ids.forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top <= vh * 0.45 && r.bottom > 0) activeIdx = i;
    });
    const next = Math.max(0, Math.min(ids.length - 1, activeIdx + dir));
    if (next === activeIdx) return;
    const target = document.getElementById(ids[next]);
    if (!target) return;
    const lenis = window.__lenis;
    /* Mirror FloatingNavbar pattern: page scrolls fast (1.4s) while
       the 3D camera takes a slower GSAP arc (2.6s) — layout lands
       snappy, planet travel stays cinematic. */
    const fromKey = ids[activeIdx];
    const toKey = ids[next];
    window.__rhythmSuspended = true;
    window.dispatchEvent(new CustomEvent("galactic:travel:start", {
      detail: { from: fromKey, to: toKey, planetName: toKey },
    }));
    window.galacticScene?.travelCameraTo?.(toKey, 2.6);
    if (lenis?.scrollTo) {
      lenis.scrollTo(target, {
        duration: 1.4,
        easing: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
      });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setTimeout(() => {
      window.__rhythmSuspended = false;
      window.dispatchEvent(new CustomEvent("galactic:travel:end"));
    }, 2800);
  };

  useSwipe(rootRef, {
    onUp:   () => jump(1),
    onDown: () => jump(-1),
    onLeft:  () => jump(1),
    onRight: () => jump(-1),
    threshold: 60,
  });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); jump(1); }
      if (e.key === "ArrowUp"   || e.key === "PageUp")   { e.preventDefault(); jump(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sectionIds]);

  return null;
}
