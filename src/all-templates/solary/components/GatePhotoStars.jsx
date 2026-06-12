import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./GatePhotoStars.module.css";

const MAX_CONCURRENT = 6;
const LIFETIME_MS = 4200;
const SPAWN_EVERY_MS = 900;

// Bounded-random position (in %). Bias to the edges so photos avoid the
// center where the gate card text sits.
function randomSpot() {
  const edge = () => (Math.random() < 0.5 ? Math.random() * 24 + 4 : Math.random() * 24 + 72);
  const free = () => Math.random() * 88 + 6;
  return Math.random() < 0.5 ? { x: edge(), y: free() } : { x: free(), y: edge() };
}

export default function GatePhotoStars({ photos = [], reducedMotion = false }) {
  const list = useMemo(() => (Array.isArray(photos) ? photos.filter(Boolean) : []), [photos]);
  const [sparks, setSparks] = useState([]);
  // Counter must survive effect re-runs: when `photos` changes identity the
  // effect restarts, and a reset `let id = 0` would mint key 1 again while
  // old sparks with the same keys are still alive → duplicate React keys.
  const idRef = useRef(0);

  useEffect(() => {
    if (!list.length || reducedMotion) return undefined;
    const spawn = () => {
      const spot = randomSpot();
      const photo = list[Math.floor(Math.random() * list.length)];
      const spark = { key: ++idRef.current, photo, x: spot.x, y: spot.y, rot: Math.random() * 16 - 8 };
      setSparks((s) => [...s, spark].slice(-MAX_CONCURRENT));
      window.setTimeout(() => setSparks((s) => s.filter((k) => k.key !== spark.key)), LIFETIME_MS);
    };
    const iv = window.setInterval(spawn, SPAWN_EVERY_MS);
    spawn();
    return () => window.clearInterval(iv);
  }, [list, reducedMotion]);

  if (!list.length) return null;

  return (
    <div className={styles.layer} aria-hidden="true">
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
