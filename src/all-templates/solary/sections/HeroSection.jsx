import React from "react";
import BlockRenderer from "../renderers/BlockRenderer.jsx";

export default function HeroSection({ section }) {
  const layout = section.layout || "split-left";
  const blocks = section.blocks || [];
  if (layout === "centered") {
    return (
      <div className="stack gap-5" style={{ alignItems: "center", textAlign: "center" }}>
        {blocks.map((b, i) => (
          <BlockRenderer key={i} block={b} index={i} section={section} />
        ))}
      </div>
    );
  }
  const firstImageIdx = blocks.findIndex((b) => b.type === "image");
  const left = blocks.filter((_, i) => i !== firstImageIdx);
  const right = firstImageIdx >= 0 ? [blocks[firstImageIdx]] : [];
  const reversed = layout === "split-right";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
        gap: "clamp(2rem, 5vw, 5rem)",
        alignItems: "center",
        direction: reversed ? "rtl" : "ltr",
      }}
    >
      <div className="stack gap-5" style={{ direction: "ltr" }}>
        {left.map((b, i) => (
          <BlockRenderer key={`l-${i}`} block={b} index={i} section={section} />
        ))}
      </div>
      <div style={{ direction: "ltr" }}>
        {right.map((b, i) => (
          <BlockRenderer key={`r-${i}`} block={b} index={i} section={section} />
        ))}
      </div>
    </div>
  );
}
