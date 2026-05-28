import React from "react";
import BlockRenderer from "../renderers/BlockRenderer.jsx";

export default function RSVPSection({ section }) {
  const blocks = section.blocks || [];
  const formIdx = blocks.findIndex((b) => b.type === "rsvpForm");
  const intro = blocks.filter((_, i) => i !== formIdx);
  const form = formIdx >= 0 ? blocks[formIdx] : null;
  return (
    <div
      style={{
        display: "grid",
        gap: "clamp(2rem, 5vw, 5rem)",
        gridTemplateColumns: form ? "minmax(0, 1fr) minmax(0, 1.1fr)" : "1fr",
        alignItems: "start",
      }}
    >
      <div className="stack gap-5">
        {intro.map((b, i) => (
          <BlockRenderer key={i} block={b} index={i} section={section} />
        ))}
      </div>
      {form && (
        <div>
          <BlockRenderer block={form} index={intro.length} section={section} />
        </div>
      )}
    </div>
  );
}
