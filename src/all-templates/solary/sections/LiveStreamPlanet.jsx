import React from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";

const PLATFORM_LABEL = { youtube: "YouTube", instagram: "Instagram", zoom: "Zoom", other: "Live" };

export default function LiveStreamPlanet({ sectionLabel, planetName, heading, platform = "youtube", url, scheduledAt, note }) {
  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        <CardChild>
          <h2 className="h-2 center-text" style={{ marginBottom: "1rem" }}>{heading}</h2>
        </CardChild>
        <CardChild>
          <div style={{ textAlign: "center" }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 8 }}>
              {PLATFORM_LABEL[platform] || "Live"}
            </div>
            {scheduledAt && <div style={{ color: "var(--color-fg-mute)", marginBottom: 18, fontSize: 14 }}>{scheduledAt}</div>}
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="form-button" style={{ display: "inline-block", textDecoration: "none" }}>
                Watch Live →
              </a>
            )}
            {note && <p style={{ color: "var(--color-fg-mute)", marginTop: 18, fontSize: 14, lineHeight: 1.6 }}>{note}</p>}
          </div>
        </CardChild>
      </GlassCard>
    </div>
  );
}
