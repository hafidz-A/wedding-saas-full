import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./SectionPhotoStars.module.css";

/* Subtle sibling of GatePhotoStars: scatters the couple's gate photos as
   faint, twinkling "star" cards behind a section's content. Tuned quieter
   than the gate (fewer concurrent, lower opacity, slower cadence) so the
   GlassCard text stays readable, and only spawns while the section is on
   screen. The gate component is intentionally left untouched. */
const MAX_CONCURRENT = 4;
const LIFETIME_MS = 5200;
const SPAWN_EVERY_MS = 1500;

// Bias spawns toward the edges so photos avoid the center where the card sits.
function randomSpot() {
  const edge = () => (Math.random() < 0.5 ? Math.random() * 22 + 3 : Math.random() * 22 + 75);
  const free = () => Math.random() * 90 + 5;
  return Math.random() < 0.5 ? { x: edge(), y: free() } : { x: free(), y: edge() };
}

export default function SectionPhotoStars({ photos = [], reducedMotion = false }) {
  const list = useMemo(() => (Array.isArray(photos) ? photos.filter(Boolean) : []), [photos]);
  const [sparks, setSparks] = useState([]);
  const rootRef = useRef(null);
  const idRef = useRef(0);
  const [inView, setInView] = useState(false);

  // Only run the spawn loop while the section is visible.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!list.length || reducedMotion || !inView) return undefined;
    const spawn = () => {
      const spot = randomSpot();
      const photo = list[Math.floor(Math.random() * list.length)];
      const spark = { key: ++idRef.current, photo, x: spot.x, y: spot.y, rot: Math.random() * 14 - 7 };
      setSparks((s) => [...s, spark].slice(-MAX_CONCURRENT));
      window.setTimeout(() => setSparks((s) => s.filter((k) => k.key !== spark.key)), LIFETIME_MS);
    };
    const iv = window.setInterval(spawn, SPAWN_EVERY_MS);
    spawn();
    return () => window.clearInterval(iv);
  }, [list, reducedMotion, inView]);

  if (!list.length) return null;

  return (
    <div ref={rootRef} className={styles.layer} aria-hidden="true">
      {sparks.map((s) => (
        <figure
          key={s.key}
          className={styles.spark}
          style={{ left: `${s.x}%`, top: `${s.y}%`, "--rot": `${s.rot}deg` }}
        >
          <img src={s.photo} alt="" loading="lazy" decoding="async" />
        </figure>
      ))}
    </div>
  );
}
