import React, { useRef, useState, useEffect } from "react";
import { revealVariants } from "../utils/animationPresets.js";

export default function AnimatedReveal({
  variant = "fadeUp",
  delayIndex = 0,
  once = true,
  threshold = 0.18,
  as: Tag = "div",
  className,
  style,
  children,
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      setShown(true);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            if (once) io.disconnect();
          } else if (!once) setShown(false);
        }),
      { threshold, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);

    const fallback = setTimeout(() => setShown(true), 1600);

    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, [once, threshold]);

  const v = revealVariants[variant] || revealVariants.fadeUp;
  const delay = Math.min(delayIndex, 8) * 60;
  const style0 = {
    transition: `opacity 720ms var(--ease-glide) ${delay}ms, transform 720ms var(--ease-glide) ${delay}ms, filter 720ms var(--ease-glide) ${delay}ms`,
    willChange: "opacity, transform, filter",
    opacity: shown ? 1 : v.from.opacity,
    transform: shown ? "none" : v.from.transform,
    filter: shown ? "none" : v.from.filter || "none",
    ...style,
  };
  return (
    <Tag ref={ref} className={className} style={style0}>
      {children}
    </Tag>
  );
}
