/* ============================================================
   smoothScroll.js — Lenis smooth scroll boot
   ============================================================ */
import Lenis from "lenis";

export function startSmoothScroll(cfg = {}) {
  if (typeof window === "undefined") return null;
  if (window.__lenis) return window.__lenis;

  const lenis = new Lenis({
    duration: cfg.duration ?? 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: cfg.smoothWheel ?? true,
    smoothTouch: false,
  });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  window.__lenis = lenis;
  return lenis;
}
