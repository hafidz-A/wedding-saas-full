import React, { useEffect, useState } from "react";

/* Tap-to-advance polaroid deck. Shows the active photo as the front card with
   up to two upcoming photos peeking behind it; tapping cycles through ALL of
   the chapter's photos (no zoom/lightbox). Dots indicate position. */

const STACK_PRESETS = [
  { rotate: 0,  x: 0,    y: 0,   z: 3, opacity: 1,    blur: 0 },
  { rotate: -4, x: -24,  y: -16, z: 2, opacity: 0.92, blur: 1 },
  { rotate: 5,  x: 28,   y: -8,  z: 1, opacity: 0.85, blur: 1.5 },
];

const SIZE_PRESETS = {
  md: { width: 280, photoH: 266, padBottom: 24.5 },
  sm: { width: 220, photoH: 206, padBottom: 20 },
};

export default function PolaroidCluster({ photos = [], size = "md" }) {
  const dims = SIZE_PRESETS[size] || SIZE_PRESETS.md;
  const count = photos.length;
  const [idx, setIdx] = useState(0);

  // Reset to the first photo whenever the photo set changes (new chapter).
  useEffect(() => { setIdx(0); }, [photos]);

  if (count === 0) return null;

  const interactive = count > 1;
  const advance = () => { if (interactive) setIdx((i) => (i + 1) % count); };
  const visible = Math.min(count, STACK_PRESETS.length);

  return (
    <div className="polaroid-deck" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div
        className="polaroid-cluster"
        data-interactive={interactive ? "true" : "false"}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? "Lihat foto berikutnya" : undefined}
        onClick={advance}
        onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); advance(); } } : undefined}
        style={{ position: "relative", width: dims.width, height: dims.photoH + dims.padBottom + 14 }}
      >
        {Array.from({ length: visible }).map((_, i) => {
          const preset = STACK_PRESETS[i];
          const src = photos[(idx + i) % count];
          const isFront = i === 0;
          return (
            <div
              key={i}
              className="polaroid"
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: dims.width,
                transform: `translate(-50%, -50%) translate3d(${preset.x}px, ${preset.y}px, 0) rotate(${preset.rotate}deg)`,
                zIndex: preset.z,
                opacity: preset.opacity,
                filter: preset.blur ? `blur(${preset.blur}px)` : "none",
                padding: `12px 12px ${dims.padBottom}px 12px`,
                background: "var(--bg-polaroid)",
                border: "3px solid var(--color-polaroid-border)",
                boxShadow: isFront ? "var(--shadow-polaroid)" : "4px 4px 0 var(--color-line-soft)",
                borderRadius: 4,
              }}
            >
              <img
                key={isFront ? `front-${idx}` : `back-${i}`}
                className={isFront ? "polaroid__img polaroid__img--front" : "polaroid__img"}
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                style={{
                  display: "block",
                  width: "100%",
                  height: dims.photoH,
                  objectFit: "cover",
                  border: "var(--border-thick)",
                  borderRadius: 2,
                  background: "var(--color-bg-soft)",
                }}
              />
            </div>
          );
        })}
      </div>
      {interactive && (
        <div className="story-photo-dots" aria-hidden="true">
          {photos.map((_, i) => <span key={i} data-active={i === idx ? "true" : "false"} />)}
        </div>
      )}
    </div>
  );
}
