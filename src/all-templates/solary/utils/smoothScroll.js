/* ============================================================
   smoothScroll.js — Lenis smooth scroll boot
   ============================================================ */
import Lenis from "lenis";

let rafId = 0;

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
    rafId = requestAnimationFrame(raf);
  }
  rafId = requestAnimationFrame(raf);
  window.__lenis = lenis;
  return lenis;
}

/* Teardown — without this, the rAF loop and Lenis's wheel hijack keep
   running on every OTHER page after a client-side navigation away from
   the Solary route. Shell calls this on unmount. */
export function stopSmoothScroll() {
  if (typeof window === "undefined") return;
  cancelAnimationFrame(rafId);
  rafId = 0;
  try { window.__lenis?.destroy?.(); } catch {}
  delete window.__lenis;
}
