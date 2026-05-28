import React from "react";

/* Render 1–3 polaroids bertumpuk dengan rotasi + offset preset.
   Foto >3 disilent-cap (sisanya diabaikan untuk jaga komposisi). */

const STACK_PRESETS = [
  /* polaroid utama (terdepan) */
  { rotate: 0,  x: 0,    y: 0,   z: 3, opacity: 1,    blur: 0 },
  /* polaroid kedua (di belakang kiri-atas) */
  { rotate: -4, x: -24,  y: -16, z: 2, opacity: 0.92, blur: 1 },
  /* polaroid ketiga (di belakang kanan-atas) */
  { rotate: 5,  x: 28,   y: -8,  z: 1, opacity: 0.85, blur: 1.5 },
];

const SIZE_PRESETS = {
  md: { width: 280, photoH: 266, padBottom: 24.5 },
  sm: { width: 220, photoH: 206, padBottom: 20 },
};

export default function PolaroidCluster({ photos = [], size = "md" }) {
  const capped = photos.slice(0, 3);
  const dims = SIZE_PRESETS[size] || SIZE_PRESETS.md;

  return (
    <div
      className="polaroid-cluster"
      style={{
        position: "relative",
        width: dims.width,
        height: dims.photoH + dims.padBottom + 14, /* + top padding 7px + small breathing */
      }}
      aria-hidden="false"
    >
      {capped.map((src, i) => {
        const preset = STACK_PRESETS[i];
        return (
          <div
            key={`${src}-${i}`}
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
              boxShadow: i === 0
                ? "var(--shadow-polaroid)"
                : "4px 4px 0 var(--color-line-soft)",
              borderRadius: 4,
            }}
          >
            <img
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
  );
}
