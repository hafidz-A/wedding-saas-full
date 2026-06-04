import React, { useMemo } from "react";
import styles from "./FooterPhotoFrames.module.css";

/* Decorative photo cards that flank the closing (Sun) section heading.
   They sit ABOVE the glass-card panel but BEHIND the text — the layer uses a
   negative z-index inside the card's stacking context, so the farewell words
   always stay on top and readable on every theme. Frames reuse the couple's
   gate photos, are styled purely from theme tokens (surface / line / shadow),
   and scale down on tablet + phone. */
const SLOTS = ["a", "b"]; // a = upper-left, b = lower-right (positioned in CSS)

export default function FooterPhotoFrames({ photos = [], reducedMotion = false }) {
  const list = useMemo(
    () => (Array.isArray(photos) ? photos.filter(Boolean) : []),
    [photos]
  );
  if (!list.length) return null;

  const frames = SLOTS.slice(0, Math.min(SLOTS.length, list.length)).map((slot, i) => ({
    slot,
    photo: list[i % list.length],
  }));

  return (
    <div
      className={`${styles.frames} ${reducedMotion ? styles.still : ""}`}
      aria-hidden="true"
    >
      {frames.map((f) => (
        <figure key={f.slot} className={`${styles.frame} ${styles[f.slot]}`}>
          <img src={f.photo} alt="" loading="lazy" decoding="async" />
        </figure>
      ))}
    </div>
  );
}
