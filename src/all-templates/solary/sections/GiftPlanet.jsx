import React, { useEffect, useState } from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";
import { submitGift } from "../services/gift.js";
import { useGuest } from "../contexts/GuestContext.jsx";

/* GiftPlanet — bank accounts + gift-confirmation form.
   Content mirrors the lovebirds Wedding Gift flow (accounts with copy +
   a confirmation form that records to gift_confirmations via /api/gift),
   rendered in Solary's cosmic glass-card style. */
export default function GiftPlanet({ sectionLabel, planetName, heading, accounts = [], confirmationEnabled = true, slug = "demo", registryEnabled = false, registryTitle, registryMessage, wishlist = [] }) {
  const { name } = useGuest();
  const [copied, setCopied] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState({
    name: name || "",
    accountUsed: accounts[0]?.bank || "",
    amount: "",
    message: "",
  });

  useEffect(() => {
    if (name) setDraft((d) => ({ ...d, name }));
  }, [name]);
  useEffect(() => {
    setDraft((d) => (d.accountUsed ? d : { ...d, accountUsed: accounts[0]?.bank || "" }));
  }, [accounts]);

  const copy = (n, k) => {
    navigator.clipboard?.writeText(n);
    setCopied(k);
    setTimeout(() => setCopied(null), 1500);
  };

  const useAccount = (a) => {
    setDraft((d) => ({ ...d, accountUsed: a.bank }));
    setFormOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      setSendError("Mohon isi nama Anda");
      return;
    }
    setSendError(null);
    setSubmitting(true);
    try {
      await submitGift({
        slug,
        guest_name: draft.name,
        account_used: draft.accountUsed || accounts[0]?.bank || "",
        amount: draft.amount,
        message: draft.message,
      });
      setSent(true);
    } catch (err) {
      setSendError(err?.message || "Gagal mengirim. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSent(false);
    setFormOpen(false);
    setDraft({ name: name || "", accountUsed: accounts[0]?.bank || "", amount: "", message: "" });
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
              <div key={i} style={{ position: "relative", padding: "1.25rem", border: "1px solid var(--color-line)", borderRadius: "var(--r-3)", background: "var(--color-surface)", textAlign: "left", display: "flex", flexDirection: "column", gap: 4 }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 8 }}>{a.bank}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, letterSpacing: "0.08em" }}>{a.number}</div>
                <div style={{ color: "var(--color-fg-mute)", marginTop: 4, fontSize: 14 }}>a/n {a.name}</div>
                <button type="button" onClick={() => copy(a.number, i)} style={{ position: "absolute", top: 12, right: 12, padding: "6px 10px", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", borderRadius: 999, border: "1px solid var(--color-line)", color: "var(--color-fg-mute)", background: "transparent", cursor: "pointer" }}>
                  {copied === i ? "Copied" : "Copy"}
                </button>
                {confirmationEnabled && (
                  <button type="button" onClick={() => useAccount(a)} style={{ marginTop: 12, padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", borderRadius: "var(--r-2)", border: "1px solid var(--color-line)", color: "var(--color-fg)", background: "transparent", cursor: "pointer" }}>
                    Confirm Gift Transfer →
                  </button>
                )}
              </div>
            ))}
          </div>
        </CardChild>

        {confirmationEnabled && (
          <CardChild>
            {sent ? (
              <div className="center-text" style={{ marginTop: "1.5rem", padding: "1.5rem", border: "1px solid var(--color-line)", borderRadius: "var(--r-3)", background: "var(--color-surface)" }}>
                <div style={{ fontSize: 28, color: "var(--color-accent)", marginBottom: 8 }}>♥</div>
                <h3 className="h-3" style={{ marginBottom: 6 }}>Terima kasih</h3>
                <p className="p-body" style={{ color: "var(--color-fg-mute)", fontSize: 14, marginBottom: 14 }}>
                  Hadiah Anda telah kami catat. Kami akan menghubungi Anda untuk berterima kasih secara langsung.
                </p>
                <button type="button" className="btn-ghost" onClick={reset}>Kirim konfirmasi lain</button>
              </div>
            ) : !formOpen ? (
              <div className="center-text" style={{ marginTop: "1.5rem" }}>
                <button type="button" className="btn-primary" onClick={() => setFormOpen(true)}>
                  Konfirmasi pemberian hadiah →
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="form-grid" style={{ marginTop: "1.5rem" }}>
                <p className="p-body center-text" style={{ color: "var(--color-fg-mute)", fontSize: 13, marginBottom: 4 }}>
                  Sudah transfer? Bantu kami mencatat hadiah Anda agar kami bisa berterima kasih secara personal.
                </p>
                <div className="form-row">
                  <label className="form-label" htmlFor="gift-name">Nama Anda</label>
                  <input id="gift-name" className="form-input" placeholder="mis. Maya Larasati" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                </div>
                <div className="form-row-2">
                  <div className="form-row">
                    <label className="form-label" htmlFor="gift-account">Transfer ke</label>
                    <select id="gift-account" className="form-input" value={draft.accountUsed} onChange={(e) => setDraft((d) => ({ ...d, accountUsed: e.target.value }))}>
                      {accounts.map((a, i) => (
                        <option key={i} value={a.bank}>{a.bank} — a/n {a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row">
                    <label className="form-label" htmlFor="gift-amount">Nominal (opsional)</label>
                    <input id="gift-amount" className="form-input" inputMode="numeric" placeholder="mis. 500.000" value={draft.amount} onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label" htmlFor="gift-message">Pesan untuk pasangan (opsional)</label>
                  <textarea id="gift-message" rows={3} className="form-input" style={{ resize: "vertical", minHeight: 80 }} placeholder="Doa, ucapan, atau pesan kecil…" value={draft.message} onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))} />
                </div>
                {sendError && <span className="form-error" role="alert">{sendError}</span>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button type="button" className="btn-ghost" onClick={() => { setFormOpen(false); setSendError(null); }}>Batal</button>
                  <button type="submit" className="form-button" disabled={submitting}>{submitting ? "Mengirim…" : "Kirim konfirmasi"}</button>
                </div>
              </form>
            )}
          </CardChild>
        )}

        {registryEnabled !== false && Array.isArray(wishlist) && wishlist.length > 0 && (
          <CardChild>
            <div style={{ marginTop: "2rem", borderTop: "1px solid var(--color-line)", paddingTop: "1.75rem" }}>
              <h3 className="h-3 center-text" style={{ marginBottom: 6 }}>{registryTitle || "Wishlist"}</h3>
              {registryMessage && (
                <p className="p-body center-text" style={{ color: "var(--color-fg-mute)", fontSize: 14, marginBottom: "1.5rem", maxWidth: 520, marginInline: "auto" }}>
                  {registryMessage}
                </p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "clamp(0.8rem, 2vw, 1.2rem)" }}>
                {wishlist.map((w, i) => {
                  const link = w.url && String(w.url).trim() && String(w.url).trim() !== "#" ? String(w.url).trim() : null;
                  const inner = (
                    <>
                      {w.image && (
                        <div style={{ aspectRatio: "4 / 3", overflow: "hidden", background: "var(--color-bg-soft)" }}>
                          <img src={w.image} alt={w.name || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      )}
                      <div style={{ padding: "0.9rem 1rem", display: "flex", flexDirection: "column", gap: 6, flex: 1, textAlign: "left" }}>
                        {w.name && (
                          <div style={{ fontWeight: 600, fontSize: 15 }}>
                            {w.name}{link && <span style={{ color: "var(--color-accent)" }} aria-hidden="true"> →</span>}
                          </div>
                        )}
                        {w.description && <p className="p-body" style={{ fontSize: 13, color: "var(--color-fg-mute)", margin: 0 }}>{w.description}</p>}
                      </div>
                    </>
                  );
                  const cardStyle = { border: "1px solid var(--color-line)", borderRadius: "var(--r-3)", background: "var(--color-surface)", overflow: "hidden", display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit" };
                  return link ? (
                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" style={cardStyle}>{inner}</a>
                  ) : (
                    <div key={i} style={cardStyle}>{inner}</div>
                  );
                })}
              </div>
            </div>
          </CardChild>
        )}
      </GlassCard>
    </div>
  );
}
