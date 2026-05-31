import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const EASE = [0.16, 1, 0.3, 1];

/* GlassCard appears (scale 0.92→1, opacity, translateY) once it
   enters the viewport, then reverses on exit. Children get a
   stagger via the `data-card-child` selector — wrap items in
   <CardChild>…</CardChild>. */
export default function GlassCard({ title, planetName, children, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Each card belongs to a <section id>. We reveal it exactly when the
    // rhythm reports that section as the active planet (and hide it during
    // transit), so the card and the 3D camera stay in sync no matter how the
    // sections are ordered, swapped, or replaced. The IntersectionObserver is
    // only a fallback for when the scene/rhythm isn't running.
    const myId = el.closest("section[id]")?.id || null;
    let gotSignal = false;

    const onSection = (e) => {
      gotSignal = true;
      setVisible(e.detail?.id === myId);
    };
    const onTravelStart = () => {
      gotSignal = true;
      setVisible(false);
    };
    window.addEventListener("solary:section", onSection);
    window.addEventListener("galactic:travel:start", onTravelStart);

    // Initial sync if the rhythm already knows the active section.
    if (typeof window !== "undefined" && window.__activeSolarySectionId != null) {
      gotSignal = true;
      setVisible(window.__activeSolarySectionId === myId);
    }

    const io = new IntersectionObserver(
      ([entry]) => { if (!gotSignal) setVisible(entry.isIntersecting); },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    const fallback = setTimeout(() => { if (!gotSignal) setVisible(true); }, 1800);

    return () => {
      io.disconnect();
      clearTimeout(fallback);
      window.removeEventListener("solary:section", onSection);
      window.removeEventListener("galactic:travel:start", onTravelStart);
    };
  }, []);

  const titleText = title && planetName
    ? <>{title} Planet <span style={{ opacity: 0.55, padding: "0 8px" }}>·</span> <strong>{planetName}</strong></>
    : title;

  return (
    <div ref={ref} style={{ width: "min(720px, 100%)" }}>
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key="card"
            className={`glass-card ${className}`}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            {titleText && (
              <motion.div
                className="glass-card__title"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
              >
                {titleText}
              </motion.div>
            )}
            <div className="glass-card__body">
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.08, delayChildren: 0.22 } },
                }}
              >
                {children}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CardChild({ children, as: Tag = "div", style }) {
  return (
    <motion.div
      style={style}
      variants={{
        hidden: { opacity: 0, y: 14 },
        show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
      }}
    >
      {React.createElement(Tag, {}, children)}
    </motion.div>
  );
}
