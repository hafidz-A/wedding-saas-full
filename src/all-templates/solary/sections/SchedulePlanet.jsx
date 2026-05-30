import React from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";

export default function SchedulePlanet({ sectionLabel, planetName, heading, events = [] }) {
  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        <CardChild>
          <h2 className="h-2 center-text" style={{ marginBottom: "1.5rem" }}>{heading}</h2>
        </CardChild>
        <CardChild>
          <div className="stack gap-5">
            {events.map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 16, alignItems: "baseline", borderBottom: "1px solid var(--color-line)", paddingBottom: 14 }}>
                <div className="mono" style={{ minWidth: 96, color: "var(--color-accent)", fontSize: 13, letterSpacing: "0.12em" }}>{e.time}</div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", lineHeight: 1.2 }}>{e.title}</div>
                  {e.desc && <div style={{ color: "var(--color-fg-mute)", fontSize: 14, marginTop: 4 }}>{e.desc}</div>}
                </div>
              </div>
            ))}
          </div>
        </CardChild>
      </GlassCard>
    </div>
  );
}
