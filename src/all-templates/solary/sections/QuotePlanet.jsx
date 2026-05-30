import React from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";

export default function QuotePlanet({ sectionLabel, planetName, heading, verse, source, translation }) {
  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        {heading && (
          <CardChild>
            <h2 className="h-2 center-text" style={{ marginBottom: "1.25rem" }}>{heading}</h2>
          </CardChild>
        )}
        <CardChild>
          <blockquote style={{ margin: 0, textAlign: "center", padding: "0 1rem" }}>
            <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--fs-h3)", lineHeight: 1.5, margin: 0 }}>
              "{verse}"
            </p>
            {translation && (
              <p style={{ color: "var(--color-fg-mute)", marginTop: 16, fontSize: 15, lineHeight: 1.6 }}>{translation}</p>
            )}
            {source && (
              <footer className="mono faint" style={{ marginTop: 18, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase" }}>
                — {source}
              </footer>
            )}
          </blockquote>
        </CardChild>
      </GlassCard>
    </div>
  );
}
