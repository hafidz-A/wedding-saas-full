import React, { useEffect, useRef, useState } from "react";
import { useGuest } from "../contexts/GuestContext.jsx";

export default function OpeningGate({ eyebrow, coupleName, tagline, ctaLabel = "Get Started" }) {
  const { name } = useGuest();
  const rootRef = useRef(null);
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const t = Math.min(1, Math.max(0, window.scrollY / vh));
      const opacity = 1 - t;
      root.style.opacity = String(opacity);
      const isFaded = opacity < 0.05;
      if (isFaded !== faded) setFaded(isFaded);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [faded]);

  const handleStart = (e) => {
    e.preventDefault();
    const lenis = window.__lenis;
    const target = document.getElementById("neptune");
    if (lenis?.scrollTo && target) {
      lenis.scrollTo(target, { duration: 2.0, easing: (t) => 1 - Math.pow(1 - t, 3) });
    } else if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div ref={rootRef} className="gate-root" data-faded={faded ? "true" : "false"}>
      <div className="gate-card">
        <p className="gate-eyebrow">{eyebrow}</p>
        {name && <p className="gate-greet">Dear {name},</p>}
        <h1 className="gate-couple">{coupleName}</h1>
        <p className="gate-tagline">{tagline}</p>
        <button className="gate-cta" onClick={handleStart}>
          {ctaLabel} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
