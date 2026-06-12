import { useEffect } from "react";

/* Headless keyboard navigation (ArrowUp/Down, PageUp/Down) between sections.
   Visual buttons live in FloatingNavbar.

   NOTE: the old body-wide swipe-to-jump was removed deliberately — with a
   60px threshold every natural touch flick triggered a full-section jump on
   top of the native scroll (and sideways flicks did too), which hijacked
   mobile scrolling and skipped Story chapters. Natural scroll + rhythm.js
   already advance sections on touch. */

/* Don't hijack arrow keys while the guest is typing or a dialog is open. */
function shouldIgnoreKey(e) {
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) {
    return true;
  }
  return !!document.querySelector(".lightbox-root, .easter-modal");
}

export default function SectionArrows({ allSections = [] }) {
  useEffect(() => {
    const jump = (dir) => {
      const list = allSections.filter((s) => s && s.id);
      if (!list.length) return;
      const vh = window.innerHeight;
      let activeIdx = 0;
      list.forEach((s, i) => {
        const el = document.getElementById(s.id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top <= vh * 0.45 && r.bottom > 0) activeIdx = i;
      });
      const next = Math.max(0, Math.min(list.length - 1, activeIdx + dir));
      if (next === activeIdx) return;
      const from = list[activeIdx];
      const dest = list[next];
      const target = document.getElementById(dest.id);
      if (!target) return;

      const fromKey = from.planetKey || "andromeda";
      const destKey = dest.planetKey || "andromeda";
      const destName = dest.planetName || dest.navLabel || dest.id;

      /* Token-based suspend: only the LATEST jump's timeout may release the
         rhythm, so rapid keypresses can't un-suspend a jump still in flight. */
      const token = Symbol("jump");
      window.__rhythmSuspended = true;
      window.__rhythmSuspendToken = token;
      window.dispatchEvent(new CustomEvent("galactic:travel:start", {
        detail: { from: fromKey, to: destKey, planetName: destName },
      }));
      window.galacticScene?.travelCameraTo?.(destKey, 2.6);
      const lenis = window.__lenis;
      if (lenis?.scrollTo) {
        lenis.scrollTo(target, {
          duration: 1.4,
          easing: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
        });
      } else {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setTimeout(() => {
        if (window.__rhythmSuspendToken !== token) return; // a newer jump owns the suspend
        window.__rhythmSuspended = false;
        delete window.__rhythmSuspendToken;
        /* Rhythm was suspended during the arc — announce the destination so
           its GlassCard reveals on arrival (rhythm only fires on scroll). */
        window.__activeSolarySectionId = dest.id;
        window.dispatchEvent(new CustomEvent("solary:section", { detail: { id: dest.id, key: destKey } }));
        window.dispatchEvent(new CustomEvent("galactic:travel:end"));
      }, 2800);
    };

    const onKey = (e) => {
      if (e.key !== "ArrowDown" && e.key !== "PageDown" && e.key !== "ArrowUp" && e.key !== "PageUp") return;
      if (shouldIgnoreKey(e)) return;
      e.preventDefault();
      jump(e.key === "ArrowDown" || e.key === "PageDown" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [allSections]);

  return null;
}
