import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Lightbox({ src, caption, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="lightbox-root"
        role="dialog"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button className="lightbox-close" onClick={onClose} aria-label="Close">✕</button>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{ textAlign: "center" }}
        >
          {src
            ? <img className="lightbox-img" src={src} alt={caption || ""} onError={(e) => { e.currentTarget.style.display = "none"; }} />
            : <div style={{ color: "#fff", padding: 40 }}>[ no image ]</div>}
          {caption && <div style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>{caption}</div>}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
