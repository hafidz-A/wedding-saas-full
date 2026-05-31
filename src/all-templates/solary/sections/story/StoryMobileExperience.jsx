import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/* Mobile Experience — Lovebirds-style stacked card deck (themed to Solary).
   No GSAP / no scroll pinning (Solary runs Lenis + a custom rhythm scroll;
   a pinned ScrollTrigger here would conflict). The active chapter sits on top
   of the deck, the next two chapters peek behind it. A Next/Prev control
   advances chapters (wraps). The active chapter's description shows below.

   Multi-photo chapters: tapping the FRONT card cycles that chapter's photos
   (dots indicator). No-photo chapters render a cosmic placeholder card. */

// Peeking offsets/rotations for the cards behind the active one.
const PEEK = [
  { rotate: 0, x: 0, y: 0, scale: 1, opacity: 1, blur: 0 },
  { rotate: 4, x: 18, y: 14, scale: 0.95, opacity: 0.7, blur: 1.2 },
  { rotate: -5, x: -18, y: 26, scale: 0.9, opacity: 0.45, blur: 2 },
];

export default function StoryMobileExperience({
  sectionLabel,
  planetName,
  heading,
  items = [],
}) {
  const total = items.length;
  const [active, setActive] = useState(0);
  const [photoIdx, setPhotoIdx] = useState(0);

  if (total === 0) return null;

  const goto = (next) => {
    const idx = ((next % total) + total) % total;
    setActive(idx);
    setPhotoIdx(0); // reset photo index when chapter changes
  };
  const nextChapter = () => goto(active + 1);
  const prevChapter = () => goto(active - 1);

  const current = items[active] || items[0];
  const curPhotos = Array.isArray(current.photos) ? current.photos : [];
  const curMultiPhoto = curPhotos.length > 1;
  const advancePhoto = () => {
    if (curMultiPhoto) setPhotoIdx((i) => (i + 1) % curPhotos.length);
  };

  return (
    <div className="story-deck">
      {/* Header */}
      <header className="story-deck__head">
        <div className="story-deck__kicker mono">
          {sectionLabel} Planet <span aria-hidden="true">·</span>{" "}
          <strong>{planetName}</strong>
        </div>
        <h2 className="h-2" style={{ margin: 0 }}>
          {heading}
        </h2>
      </header>

      {/* Card deck */}
      <div className="story-deck__stage">
        <div className="story-deck__cards">
          {PEEK.map((preset, depth) => {
            const idx = (active + depth) % total;
            const it = items[idx];
            const photos = Array.isArray(it.photos) ? it.photos : [];
            const isFront = depth === 0;
            // Front card honours its own photoIdx; peeking cards show photo 0.
            const src = isFront ? photos[photoIdx] : photos[0];
            const number = String(idx + 1).padStart(2, "0");
            // Render order: deepest first so the front card paints last (top).
            return (
              <div
                key={`${idx}-${depth}`}
                className="story-deck__card"
                aria-hidden={isFront ? undefined : "true"}
                role={isFront && curMultiPhoto ? "button" : undefined}
                tabIndex={isFront && curMultiPhoto ? 0 : undefined}
                aria-label={
                  isFront && curMultiPhoto ? "Lihat foto berikutnya" : undefined
                }
                data-interactive={isFront && curMultiPhoto ? "true" : "false"}
                onClick={isFront ? advancePhoto : undefined}
                onKeyDown={
                  isFront && curMultiPhoto
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          advancePhoto();
                        }
                      }
                    : undefined
                }
                style={{
                  zIndex: PEEK.length - depth,
                  transform: `translate(-50%, -50%) translate3d(${preset.x}px, ${preset.y}px, 0) rotate(${preset.rotate}deg) scale(${preset.scale})`,
                  opacity: preset.opacity,
                  filter: preset.blur ? `blur(${preset.blur}px)` : "none",
                  pointerEvents: isFront ? "auto" : "none",
                }}
              >
                <div className="story-deck__photo">
                  {src ? (
                    <img
                      key={isFront ? `f-${photoIdx}` : `b-${depth}`}
                      className={
                        isFront ? "story-deck__img story-deck__img--front" : "story-deck__img"
                      }
                      src={src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    /* Cosmic placeholder for chapters with no photo */
                    <div className="story-deck__placeholder" aria-hidden="true">
                      <span className="story-deck__placeholder-star">✦</span>
                    </div>
                  )}
                  <span className="story-deck__num">{number}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Next control near the deck (bottom-right) */}
        <button
          type="button"
          className="story-deck__next"
          onClick={nextChapter}
          aria-label="Bab berikutnya"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      {/* Photo dots (active chapter, multi-photo only) */}
      {curMultiPhoto && (
        <div className="story-photo-dots" aria-hidden="true">
          {curPhotos.map((_, i) => (
            <span key={i} data-active={i === photoIdx ? "true" : "false"} />
          ))}
        </div>
      )}

      {/* Description panel */}
      <div className="story-deck__desc">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: [0.25, 0.8, 0.25, 1] }}
          >
            {current.year && (
              <div className="story-deck__year mono">{current.year}</div>
            )}
            {current.label && (
              <h3 className="h-3" style={{ margin: "0 0 0.5rem" }}>
                {current.label}
              </h3>
            )}
            {current.desc && (
              <p className="p-body" style={{ margin: "0 auto" }}>
                {current.desc}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Chapter pager */}
      <div className="story-deck__pager">
        <button
          type="button"
          className="story-deck__pagerbtn"
          onClick={prevChapter}
          aria-label="Bab sebelumnya"
        >
          <span aria-hidden="true">←</span>
        </button>
        <span className="story-deck__count mono" aria-live="polite">
          {String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
        <button
          type="button"
          className="story-deck__pagerbtn"
          onClick={nextChapter}
          aria-label="Bab berikutnya"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
