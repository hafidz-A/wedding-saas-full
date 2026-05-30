import React, { useState } from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";

export default function FaqPlanet({ sectionLabel, planetName, heading, items = [] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        <CardChild>
          <h2 className="h-2 center-text" style={{ marginBottom: "1.5rem" }}>{heading}</h2>
        </CardChild>
        <CardChild>
          <div className="stack gap-3">
            {items.map((it, i) => {
              const isOpen = open === i;
              return (
                <div key={i} style={{ borderBottom: "1px solid var(--color-line)" }}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "14px 0", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", color: "var(--color-fg)", fontFamily: "var(--font-display)", fontSize: "1.1rem" }}
                  >
                    <span>{it.q}</span>
                    <span style={{ color: "var(--color-accent)" }}>{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && it.a && (
                    <p style={{ color: "var(--color-fg-mute)", margin: "0 0 16px", fontSize: 14, lineHeight: 1.6 }}>{it.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardChild>
      </GlassCard>
    </div>
  );
}
