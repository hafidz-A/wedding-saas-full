import React from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";

export default function TeamPlanet({ sectionLabel, planetName, heading, groups = [] }) {
  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        <CardChild>
          <h2 className="h-2 center-text" style={{ marginBottom: "1.5rem" }}>{heading}</h2>
        </CardChild>
        <CardChild>
          <div className="stack gap-7">
            {groups.map((g, gi) => {
              // Editor rows can be mid-typing/incomplete — never crash on them.
              const members = Array.isArray(g.members) ? g.members : [];
              return (
                <div key={gi}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                    <h3 className="h-3" style={{ margin: 0 }}>{g.label}</h3>
                    <div style={{ flex: 1, height: 1, background: "var(--color-line)" }} />
                    <span className="mono faint" style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase" }}>
                      {String(members.length).padStart(2, "0")}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "clamp(0.75rem, 2vw, 1.25rem)" }}>
                    {members.map((m, i) => {
                      const name = typeof m?.name === "string" ? m.name : "";
                      return (
                        <div key={i} style={{ textAlign: "center" }}>
                          <div className="avatar">
                            {m?.avatar
                              ? <img src={m.avatar} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                              : null}
                            <div className="avatar-init">{name.split(" ").filter(Boolean).map((s) => s[0]).join("")}</div>
                          </div>
                          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>{name}</div>
                          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-accent-text)", marginTop: 4 }}>{m?.role}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardChild>
      </GlassCard>
    </div>
  );
}
