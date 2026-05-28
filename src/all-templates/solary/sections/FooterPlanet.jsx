import React, { useEffect, useState } from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";

/* The Sun has an easter egg: clicking it (in scene OR via this
   button fallback) opens a hidden message. The scene fires
   `galactic:sunclick` as a CustomEvent which we listen for. */
export default function FooterPlanet({ sectionLabel, planetName, heading, body, easterEggMessage, signature }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onClick = () => setOpen(true);
    window.addEventListener("galactic:sunclick", onClick);
    return () => window.removeEventListener("galactic:sunclick", onClick);
  }, []);

  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        <CardChild>
          <h2 className="h-1 center-text" style={{ marginBottom: "1rem" }}>{heading}</h2>
        </CardChild>
        <CardChild>
          <p className="p-body center-text" style={{ margin: "0 auto" }}>{body}</p>
        </CardChild>
        <CardChild>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: "1.5rem", flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={() => { if (navigator.share) { navigator.share({ url: window.location.href }).catch(() => {}); } else { window.open(`https://wa.me/?text=${encodeURIComponent(window.location.href)}`, "_blank"); } }}>
              Share Invitation →
            </button>
            <button className="btn-ghost" onClick={() => setOpen(true)} title="Try clicking the Sun in the sky too…">
              ✦ A secret
            </button>
          </div>
        </CardChild>
        <CardChild>
          <p className="mono faint center-text" style={{ marginTop: "2rem", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            {signature}
          </p>
        </CardChild>
      </GlassCard>

      {open && easterEggMessage && (
        <div className="easter-modal" onClick={() => setOpen(false)} role="dialog">
          <div className="easter-card" onClick={(e) => e.stopPropagation()}>
            <p style={{ margin: 0 }}>{easterEggMessage}</p>
            <button onClick={() => setOpen(false)} className="btn-ghost" style={{ marginTop: "1.5rem" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
