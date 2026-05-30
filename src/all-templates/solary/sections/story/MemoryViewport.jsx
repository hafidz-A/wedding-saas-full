import React, { forwardRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import PolaroidCluster from "./PolaroidCluster.jsx";

/* Memory Viewport — panel kanan sticky.
   Logic hybrid:
   - lastPhotosKey: index terakhir yang punya foto (driving cluster render).
   - Kalau activeItem punya foto → render cluster baru.
   - Kalau activeItem tanpa foto → pertahankan cluster lama (lastPhotosKey).
   - Kalau belum pernah ada foto sama sekali → render placeholder. */

const EASE = [0.32, 0.72, 0, 1];

const MemoryViewport = forwardRef(function MemoryViewport(
  { items = [], activeIndex = 0, lastPhotoIndex = -1 },
  ref
) {
  /* Item yang menentukan cluster yang tampil:
     - kalau activeItem punya foto, pakai dia.
     - kalau tidak, fallback ke last item dengan foto. */
  const renderIndex = useMemo(() => {
    const active = items[activeIndex];
    if (active && Array.isArray(active.photos) && active.photos.length > 0) {
      return activeIndex;
    }
    return lastPhotoIndex;
  }, [items, activeIndex, lastPhotoIndex]);

  const renderItem = renderIndex >= 0 ? items[renderIndex] : null;
  const photos = renderItem?.photos || [];

  return (
    <div
      ref={ref}
      className="memory-viewport"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 360,
      }}
    >
      <AnimatePresence mode="wait">
        {photos.length > 0 ? (
          <motion.div
            key={`cluster-${renderIndex}`}
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -16, filter: "blur(8px)" }}
            transition={{ duration: 0.6, ease: EASE, exit: { duration: 0.4 } }}
            style={{ position: "relative" }}
            data-render-index={renderIndex}
          >
            <PolaroidCluster photos={photos} size="md" />
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: EASE }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 280,
                height: 280 + 24.5 - 7,
                padding: "12px 12px 32px 12px",
                borderRadius: 4,
                background: "var(--color-bg-soft)",
                border: "var(--border-card)",
                borderStyle: "dashed",
                boxShadow: "var(--shadow-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-hidden="true"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.45 }}>
                <path
                  d="M12 2 L13.6 8.5 L20 9.2 L15.2 13.6 L16.8 20 L12 16.3 L7.2 20 L8.8 13.6 L4 9.2 L10.4 8.5 Z"
                  stroke="var(--color-accent)"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 14,
                opacity: 0.5,
                margin: 0,
                color: "var(--color-fg-mute)",
              }}
            >
              the first chapter
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default MemoryViewport;
