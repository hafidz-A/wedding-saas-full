import React, { useEffect, useState } from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";
import { listWishes, submitWish } from "../services/wishes.js";
import { useGuest } from "../contexts/GuestContext.jsx";

export default function GiftPlanet({ sectionLabel, planetName, heading, accounts = [], wishesEnabled = true, slug = "demo" }) {
  const { name } = useGuest();
  const [copied, setCopied] = useState(null);
  const [wishes, setWishes] = useState([]);
  const [draft, setDraft] = useState({ name: name || "", text: "" });

  useEffect(() => {
    listWishes({ slug }).then(setWishes);
  }, [slug]);
  useEffect(() => {
    if (name) setDraft((d) => ({ ...d, name }));
  }, [name]);

  const copy = (n, k) => {
    navigator.clipboard?.writeText(n);
    setCopied(k);
    setTimeout(() => setCopied(null), 1500);
  };

  const addWish = async (e) => {
    e.preventDefault();
    if (!draft.text.trim()) return;
    const r = await submitWish({ slug, guest_name: draft.name || "Anonymous", message: draft.text });
    setWishes((w) => [r.record, ...w]);
    setDraft({ name: draft.name, text: "" });
    /* Spawn a new star in the 3D scene if available. */
    try { window.galacticScene?.addWishStar?.({ text: r.record.text, name: r.record.name }); } catch {}
  };

  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        <CardChild>
          <h2 className="h-2 center-text" style={{ marginBottom: "1.25rem" }}>{heading}</h2>
        </CardChild>
        <CardChild>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "clamp(0.8rem, 2vw, 1.2rem)" }}>
            {accounts.map((a, i) => (
              <div key={i} style={{ position: "relative", padding: "1.25rem", border: "1px solid var(--color-line)", borderRadius: "var(--r-3)", background: "var(--color-surface)", textAlign: "left" }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 12 }}>{a.bank}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, letterSpacing: "0.08em" }}>{a.number}</div>
                <div style={{ color: "var(--color-fg-mute)", marginTop: 4, fontSize: 14 }}>a/n {a.name}</div>
                <button type="button" onClick={() => copy(a.number, i)} style={{ position: "absolute", top: 12, right: 12, padding: "6px 10px", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", borderRadius: 999, border: "1px solid var(--color-line)", color: "var(--color-fg-mute)" }}>
                  {copied === i ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        </CardChild>
        {wishesEnabled && (
          <>
            <CardChild>
              <h3 className="h-3" style={{ marginTop: "1.75rem", marginBottom: "0.75rem" }}>Send your wishes</h3>
              <p className="p-body" style={{ marginBottom: "0.85rem", color: "var(--color-fg-mute)", fontSize: 13 }}>
                Each wish becomes a new twinkling star in the sky behind us ✦
              </p>
              <form onSubmit={addWish} style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(140px, 200px) 1fr auto" }}>
                <input className="form-input" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Your name" />
                <input className="form-input" value={draft.text} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} placeholder="A wish for the couple…" />
                <button type="submit" className="btn-primary">Send →</button>
              </form>
            </CardChild>
            <CardChild>
              <div className="stack gap-3" style={{ marginTop: 14 }}>
                {wishes.slice(0, 12).map((w, i) => (
                  <div key={i} className="wish-row">
                    <div style={{ fontSize: 14 }}>{w.text}</div>
                    <div className="mono faint" style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 6 }}>— {w.name}</div>
                  </div>
                ))}
              </div>
            </CardChild>
          </>
        )}
      </GlassCard>
    </div>
  );
}
