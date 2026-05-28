import { useEffect } from "react";

/* Touch swipe hook — detects dominant-axis swipe.
   Use `onUp/onDown` for vertical sites, `onLeft/onRight` for horizontal. */
export function useSwipe(ref, { onLeft, onRight, onUp, onDown, threshold = 50 } = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0, startY = 0, active = false;
    const onStart = (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      startX = t.clientX; startY = t.clientY; active = true;
    };
    const onEnd = (e) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (ax < threshold && ay < threshold) return;
      if (ay > ax) {
        if (dy > 0) onDown?.();
        else        onUp?.();
      } else {
        if (dx > 0) onRight?.();
        else        onLeft?.();
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, [ref, onLeft, onRight, onUp, onDown, threshold]);
}
