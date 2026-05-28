import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SOLAR_ORDER = {
  sun: 0,
  mercury: 1,
  venus: 2,
  earth: 3,
  mars: 4,
  jupiter: 5,
  saturn: 6,
  uranus: 7,
  neptune: 8,
  andromeda: 9,
  intro: 9,
  gate: 9,
};

export default function TravellingOverlay() {
  const [info, setInfo] = useState(null);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const start = (e) => setInfo(e.detail);
    const end = () => setInfo(null);
    window.addEventListener("galactic:travel:start", start);
    window.addEventListener("galactic:travel:end", end);
    return () => {
      window.removeEventListener("galactic:travel:start", start);
      window.removeEventListener("galactic:travel:end", end);
    };
  }, []);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    return () => window.removeEventListener("resize", checkOrientation);
  }, []);

  const show = !!info;
  const target = info?.planetName || "next planet";

  const layoutClass = (() => {
    if (!info) return "layout-right";
    const fromKey = String(info.from || "").toLowerCase();
    const toKey = String(info.to || "").toLowerCase();
    const fromDist = SOLAR_ORDER[fromKey] !== undefined ? SOLAR_ORDER[fromKey] : 9;
    const toDist = SOLAR_ORDER[toKey] !== undefined ? SOLAR_ORDER[toKey] : 9;

    // Menuju planet yang dekat matahari -> toDist < fromDist -> kanan vertically
    if (toDist < fromDist) return "layout-right";
    // Menjauh matahari -> toDist > fromDist -> kiri vertically
    if (toDist > fromDist) return "layout-left";
    return "layout-right";
  })();

  const isRight = layoutClass === "layout-right";
  const initialX = isPortrait ? 0 : (isRight ? 80 : -80);
  const initialY = isPortrait ? -80 : 0;

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key={layoutClass + "-" + target + "-" + (isPortrait ? "portrait" : "landscape")}
          className={`travel-overlay ${layoutClass}`}
          initial={{ opacity: 0, x: initialX, y: initialY }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: initialX, y: initialY }}
          transition={{ type: "spring", stiffness: 90, damping: 15 }}
        >
          <div className="travel-content">
            <p className="travel-eyebrow">in transit</p>
            <h2 className="travel-title">Travelling to <em>{target}</em></h2>
            <div className="travel-orbit" aria-hidden="true">
              <span className="travel-moon" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
