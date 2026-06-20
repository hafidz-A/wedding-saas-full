import React, { useEffect, useMemo, useState } from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";
import { downloadIcs, googleCalUrl } from "../utils/calendar.js";

function diff(target) {
  const t = Math.max(0, target - Date.now());
  const s = Math.floor(t / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    done: t === 0,
  };
}

export default function CountdownPlanet({
  sectionLabel, planetName, heading, subheading,
  targetDate, endDate, venueName, venueAddress,
}) {
  const target = useMemo(() => new Date(targetDate).getTime(), [targetDate]);
  const validDate = Number.isFinite(target);
  const [t, setT] = useState(() => (validDate ? diff(target) : { d: 0, h: 0, m: 0, s: 0, done: false }));
  useEffect(() => {
    if (!validDate) return; // invalid/missing date — don't tick NaN every second
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target, validDate]);

  const cells = [
    { v: t.d, label: "Days" },
    { v: t.h, label: "Hours" },
    { v: t.m, label: "Minutes" },
    { v: t.s, label: "Seconds" },
  ];

  const calEvent = {
    title: "Wedding · " + (planetName ? `Save the date` : "Wedding"),
    description: `${sectionLabel || ""} · ${venueName || ""}`,
    location: `${venueName || ""}${venueAddress ? ", " + venueAddress : ""}`,
    start: targetDate,
    end: endDate,
  };

  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        <CardChild>
          <h2 className="h-display center-text" style={{ marginBottom: 8 }}>{heading}</h2>
        </CardChild>
        {subheading && (
          <CardChild>
            <p className="p-lede center-text" style={{ margin: "0 auto 1.5rem", textAlign: "center" }}>
              {subheading}
            </p>
          </CardChild>
        )}
        <CardChild>
          <div style={{ display: "flex", justifyContent: "center" }}>
            {!validDate ? null : t.done ? (
              <p className="mono" style={{ fontSize: 14, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-accent-text)" }}>
                The alignment has begun ✦
              </p>
            ) : (
              <div className="cd-grid">
                {cells.map((c, i) => (
                  <div key={i} className="cd-cell">
                    <div className="cd-num">{String(c.v).padStart(2, "0")}</div>
                    <div className="cd-lbl">{c.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardChild>
        {validDate && (
          <CardChild>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: "1.75rem", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => downloadIcs(calEvent)}>
                Add to Calendar (.ics) <span>↓</span>
              </button>
              <a className="btn-ghost" href={googleCalUrl(calEvent)} target="_blank" rel="noopener noreferrer">
                Google Calendar <span>↗</span>
              </a>
            </div>
          </CardChild>
        )}
      </GlassCard>
    </div>
  );
}
