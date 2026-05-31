import React, { forwardRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import PolaroidCluster from "./PolaroidCluster.jsx";

/* Memory Viewport — right sticky panel.
   Shows ONLY the active chapter's photos. If the active chapter has no photo,
   the panel is blank (no placeholder, no fallback to a previous chapter). */

const EASE = [0.32, 0.72, 0, 1];

const MemoryViewport = forwardRef(function MemoryViewport(
  { items = [], activeIndex = 0 },
  ref
) {
  const active = items[activeIndex];
  const photos = active && Array.isArray(active.photos) ? active.photos : [];

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
        {photos.length > 0 && (
          <motion.div
            key={`cluster-${activeIndex}`}
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -16, filter: "blur(8px)" }}
            transition={{ duration: 0.6, ease: EASE, exit: { duration: 0.4 } }}
            style={{ position: "relative" }}
            data-render-index={activeIndex}
          >
            <PolaroidCluster photos={photos} size="md" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default MemoryViewport;
