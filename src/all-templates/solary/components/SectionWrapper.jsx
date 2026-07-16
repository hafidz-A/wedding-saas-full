import React, { useMemo } from "react";

function GrainOverlay({ opacity }) {
  const grainSvg =
    `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter>` +
    `<rect width='100%' height='100%' filter='url(%23n)' opacity='1'/></svg>")`;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: grainSvg,
        opacity: opacity ?? "var(--grain-opacity)",
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
}

function StarfieldPlaceholder({ density = 80 }) {
  const stars = useMemo(() => {
    const out = [];
    let s = 1;
    for (let i = 0; i < density; i++) {
      s = (s * 9301 + 49297) % 233280;
      const x = (s / 233280) * 100;
      s = (s * 9301 + 49297) % 233280;
      const y = (s / 233280) * 100;
      s = (s * 9301 + 49297) % 233280;
      const r = ((s / 233280) * 1.3 + 0.3).toFixed(2);
      out.push(
        `${x.toFixed(2)}% ${y.toFixed(2)}% / ${r}px ${r}px no-repeat radial-gradient(circle, rgba(var(--color-glow)/0.85), transparent 60%)`
      );
    }
    return out.join(", ");
  }, [density]);
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, background: stars, opacity: 0.55 }}
    />
  );
}

function SectionBackground({ bg, revealMode = "scrim" }) {
  const windowMask =
    revealMode === "window"
      ? {
          WebkitMaskImage:
            "linear-gradient(105deg, black 0%, black 50%, transparent 92%)",
          maskImage:
            "linear-gradient(105deg, black 0%, black 50%, transparent 92%)",
        }
      : {};
  const base = {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    ...windowMask,
  };
  switch (bg.type) {
    case "color":
      return <div style={{ ...base, background: bg.value || "var(--color-bg)" }} />;
    case "gradient":
      return (
        <div
          style={{
            ...base,
            background: `linear-gradient(${bg.angle ?? 180}deg, ${bg.from} 0%, ${bg.to} 100%)`,
          }}
        >
          <GrainOverlay />
        </div>
      );
    case "image":
      return (
        <div
          style={{
            ...base,
            backgroundImage: `url(${bg.src})`,
            backgroundSize: "cover",
            backgroundPosition: bg.position || "center",
            opacity: bg.opacity ?? 1,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.85))",
            }}
          />
          <GrainOverlay />
        </div>
      );
    case "starfield":
      return (
        <div
          style={{
            ...base,
            background: `radial-gradient(900px 600px at 20% 10%, rgba(var(--color-glow)/0.08), transparent 60%),
             radial-gradient(700px 500px at 85% 90%, rgba(var(--color-glow)/0.06), transparent 60%),
             var(--color-bg)`,
          }}
        >
          <StarfieldPlaceholder density={bg.density || 80} />
          <GrainOverlay />
        </div>
      );
    case "galaxy":
      return (
        <div
          style={{
            ...base,
            background: `radial-gradient(60% 60% at 50% 45%, rgba(193,155,255,0.18), transparent 70%),
             radial-gradient(100% 100% at 50% 50%, #0a0820, #04030c)`,
          }}
        >
          <StarfieldPlaceholder density={140} />
          <GrainOverlay opacity={0.08} />
        </div>
      );
    default:
      return <div style={{ ...base, background: "var(--color-bg)" }} />;
  }
}

export default function SectionWrapper({ section, index, total, children }) {
  const theme = section.theme || "cosmicDark";
  const bg = section.background || { type: "color" };
  const revealMode = section.revealMode || "scrim";
  const isHidden = revealMode === "hidden";
  return (
    <section
      id={section.id}
      data-theme={theme}
      data-section-type={section.type}
      data-section-index={index}
      data-reveal-mode={revealMode}
      data-screen-label={`${String(index + 1).padStart(2, "0")} ${section.id}`}
      className="section"
      style={{
        position: "relative",
        minHeight: "100vh",
        background: isHidden ? "transparent" : "var(--color-bg)",
        color: "var(--color-fg)",
        paddingBlock: "var(--section-padding-y)",
        isolation: "isolate",
        overflow: "hidden",
      }}
    >
      {!isHidden && <SectionBackground bg={bg} revealMode={revealMode} />}

      <div
        className="container"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "calc(var(--navbar-h) + 1.5rem)",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--color-fg-mute)",
          zIndex: 3,
        }}
      >
        <span
          className="mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 12px",
            border: "1px solid var(--color-line)",
            borderRadius: "var(--radius-pill)",
            background: "color-mix(in oklab, var(--color-bg) 70%, transparent)",
            backdropFilter: "blur(8px)",
            fontSize: 11,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--color-accent)",
              boxShadow: "0 0 12px rgba(var(--color-glow)/0.8)",
            }}
          />
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          <span style={{ opacity: 0.4 }}>·</span>
          {section.id}
        </span>
        <span
          className="mono faint"
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          {section.type}
        </span>
      </div>

      <div className="container" style={{ position: "relative", zIndex: 2 }}>
        {children}
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 1,
          background: "var(--color-line-soft)",
        }}
      />
    </section>
  );
}
