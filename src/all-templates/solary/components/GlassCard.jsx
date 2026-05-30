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
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    const fallback = setTimeout(() => setVisible(true), 1600);
    return () => { io.disconnect(); clearTimeout(fallback); };
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
