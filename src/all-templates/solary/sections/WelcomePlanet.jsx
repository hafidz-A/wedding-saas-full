import React from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";
import { useGuest } from "../contexts/GuestContext.jsx";

export default function WelcomePlanet({ sectionLabel, planetName, heading, body, portrait, portraitCaption, layout = "single", portrait2, portraitCaption2 }) {
  const { name } = useGuest();
  const duo = layout === "duo" && (portrait || portrait2);
  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        {name && (
          <CardChild>
            <p className="eyebrow center-text" style={{ marginBottom: 12 }}>
              Dear {name}
            </p>
          </CardChild>
        )}
        <CardChild>
          <h2 className="h-1 center-text" style={{ marginBottom: "0.9rem" }}>{heading}</h2>
        </CardChild>
        {duo ? (
          <CardChild>
            <div className="welcome-duo" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "clamp(0.8rem, 3vw, 1.6rem)", margin: "0.5rem 0 1rem", justifyItems: "center" }}>
              <SafeImage src={portrait} caption={portraitCaption} alt="Portrait one" />
              <SafeImage src={portrait2} caption={portraitCaption2} alt="Portrait two" />
            </div>
          </CardChild>
        ) : portrait ? (
          <CardChild>
            <div style={{ display: "grid", placeItems: "center", margin: "0.5rem 0 1rem" }}>
              <SafeImage src={portrait} caption={portraitCaption} alt="Couple portrait" />
            </div>
          </CardChild>
        ) : null}
        <CardChild>
          <p className="p-body" style={{ marginInline: "auto", textAlign: "center" }}>{body}</p>
        </CardChild>
        <CardChild>
          <div style={{ display: "flex", justifyContent: "center", marginTop: "1.5rem" }}>
            <a className="btn-ghost" href="#uranus" onClick={(e) => { e.preventDefault(); document.getElementById("uranus")?.scrollIntoView({ behavior: "smooth" }); }}>
              Our Story <span>→</span>
            </a>
          </div>
        </CardChild>
      </GlassCard>
    </div>
  );
}

function SafeImage({ src, alt, caption }) {
  const [failed, setFailed] = React.useState(!src);
  return (
    <figure style={{ margin: 0, maxWidth: 360, width: "100%" }}>
      <div style={{
        position: "relative", aspectRatio: "4/5",
        borderRadius: "var(--r-3)", overflow: "hidden",
        border: "1px solid var(--color-line)",
        background: "repeating-linear-gradient(135deg, rgba(var(--color-glow)/0.04) 0 12px, rgba(var(--color-glow)/0.10) 12px 24px)",
      }}>
        {!failed && src && (
          <img src={src} alt={alt || ""} onError={() => setFailed(true)}
               style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        {failed && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 14, textAlign: "center" }}>
            <div className="mono faint" style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase" }}>
              {alt || "[ image placeholder ]"}
            </div>
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="mono faint" style={{ marginTop: 10, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", textAlign: "center" }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
