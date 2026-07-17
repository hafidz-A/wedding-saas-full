import React from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";
import { safeExternalUrl } from "@/lib/safeUrl";

const ICONS = {
  pin: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>,
  clock: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  sparkle: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><path d="M6 6l3 3M18 18l-3-3M6 18l3-3M18 6l-3 3"/></svg>,
  car: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 13l2-5h12l2 5v5H4v-5Z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>,
};

export default function DetailsPlanet({ sectionLabel, planetName, heading, cards = [], quote, quoteAttribution }) {
  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        <CardChild>
          <h2 className="h-2 center-text" style={{ marginBottom: "1.5rem" }}>{heading}</h2>
        </CardChild>
        <CardChild>
          <div className="detail-grid">
            {cards.map((c, i) => (
              <div key={i} className="detail-card">
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--color-accent-text)", marginBottom: 14 }}>
                  <span style={{ width: 36, height: 36, borderRadius: "var(--radius-round)", display: "grid", placeItems: "center", border: "1px solid var(--color-line)", background: "var(--color-accent-soft)" }}>
                    {ICONS[c.icon] || ICONS.sparkle}
                  </span>
                  <span className="mono" style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase" }}>{c.label}</span>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", lineHeight: 1.2, marginBottom: 4 }}>{c.primary}</div>
                {c.secondary && <div style={{ color: "var(--color-fg-mute)", fontSize: 14 }}>{c.secondary}</div>}
                {c.actionLabel && c.actionHref && c.actionHref !== "#" && (
                  <a
                    href={safeExternalUrl(c.actionHref)}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-accent-text)", borderBottom: "1px solid var(--color-accent)", paddingBottom: 2 }}
                  >
                    {c.actionLabel} <span>↗</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </CardChild>
        {quote && (
          <CardChild>
            <blockquote style={{ margin: "1.5rem 0 0", padding: "1.25rem 0 0.25rem 1.25rem", borderLeft: "1px solid var(--color-accent)" }}>
              <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--fs-h3)", lineHeight: 1.3, margin: 0 }}>“{quote}”</p>
              {quoteAttribution && (
                <footer className="mono faint" style={{ marginTop: 10, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase" }}>— {quoteAttribution}</footer>
              )}
            </blockquote>
          </CardChild>
        )}
      </GlassCard>
    </div>
  );
}
