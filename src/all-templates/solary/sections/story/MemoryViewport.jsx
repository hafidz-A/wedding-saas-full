import React, { forwardRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import StoryPolaroid from "./StoryPolaroid.jsx";

/* Memory Viewport — right sticky panel (desktop).
   Shows ONLY the active chapter's single photo, cross-fading on chapter change
   (opacity + translate — no blur). If the active chapter has no photo, the
   panel is blank (no placeholder, no fallback to a previous chapter). */

const EASE = [0.32, 0.72, 0, 1];

const photoOf = (item) =>
  (item && (item.photo || (Array.isArray(item.photos) ? item.photos[0] : ""))) || "";

const MemoryViewport = forwardRef(function MemoryViewport(
  { items = [], activeIndex = 0 },
  ref
) {
  const photo = photoOf(items[activeIndex]);

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
        {photo && (
          <motion.div
            key={`photo-${activeIndex}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.5, ease: EASE, exit: { duration: 0.32 } }}
            style={{ position: "relative" }}
            data-render-index={activeIndex}
          >
            <StoryPolaroid photo={photo} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default MemoryViewport;
