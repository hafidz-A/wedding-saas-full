import React, { useEffect, useState } from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { submitRSVP } from "../services/rsvp.js";
import { useGuest } from "../contexts/GuestContext.jsx";

const schema = z.object({
  guest_name: z.string().min(2, "Required").max(120),
  token: z.string().regex(/^\d{6}$/, "The code is 6 digits"),
  attending: z.enum(["yes", "no"]),
  guest_count: z.coerce
    .number({ invalid_type_error: "Masukkan jumlah tamu yang valid" })
    .int("Masukkan angka bulat")
    .min(1, "Minimal 1 tamu")
    .max(999, "Maksimal 999 tamu"),
  meal_choice: z.string().optional(),
  message: z.string().max(600).optional(),
});

export default function RSVPPlanet({ sectionLabel, planetName, heading, deadline, menuOptions = [], slug = "demo" }) {
  const { name } = useGuest();

  // Preview iframe loads /<template>/<slug>?preview=1 — simulate so the owner
  // can test the form without consuming a real token. Read in an effect (NOT
  // during render) so SSR and the first client render agree (both false);
  // reading window.location during render causes a hydration mismatch.
  const [isPreview, setIsPreview] = useState(false);
  useEffect(() => {
    setIsPreview(new URLSearchParams(window.location.search).get("preview") === "1");
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { guest_name: name || "", token: "", attending: "yes", guest_count: 1, meal_choice: menuOptions[0] || "", message: "" },
  });
  useEffect(() => { if (name) setValue("guest_name", name); }, [name, setValue]);
  const attending = watch("attending");
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState(null);

  // The thank-you screen only shows after submitting in THIS page view. We do
  // not persist it across reloads — reopening the invitation must always show
  // the form again (a second guest may share the device; the single-use token
  // is what stops a real double-RSVP, enforced server-side).

  const onSubmit = async (data) => {
    setSendError(null);

    // In preview mode, simulate success so the owner can test the form
    // without consuming a real token. The live endpoint has no backdoor.
    if (isPreview) {
      await new Promise((r) => setTimeout(r, 700));
      setSent(true);
      return;
    }

    try {
      await submitRSVP({
        slug,
        guest_name: data.guest_name,
        attending: data.attending === "yes",
        guest_count: data.guest_count,
        meal_choice: data.meal_choice,
        message: data.message,
        token: data.token,
      });
    } catch (err) {
      setSendError(err?.message || "Gagal mengirim. Coba lagi.");
      return;
    }
    setSent(true);
  };

  return (
    <div className="section-stage">
      <GlassCard title={sectionLabel} planetName={planetName}>
        <CardChild>
          <h2 className="h-2 center-text" style={{ marginBottom: 12 }}>{heading}</h2>
        </CardChild>
        <CardChild>
          <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-accent-text)", marginBottom: 14 }}>
            <span>RSVP Form</span>
            {deadline && <span style={{ color: "var(--color-fg-mute)" }}>Deadline · {deadline}</span>}
          </div>
        </CardChild>
        <CardChild>
          {sent ? (
            <div className="center-text" style={{ marginTop: "0.5rem", padding: "1.75rem 1.5rem", border: "1px solid var(--color-line)", borderRadius: "var(--r-3)", background: "var(--color-surface)" }}>
              <div style={{ fontSize: 30, color: "var(--color-accent-text)", marginBottom: 10 }}>✦</div>
              <h3 className="h-3" style={{ marginBottom: 6 }}>
                {name ? `Terima kasih, ${name}` : "Terima kasih sudah mengisi"}
              </h3>
              <p className="p-body" style={{ color: "var(--color-fg-mute)", fontSize: 14, lineHeight: 1.6 }}>
                Kabar darimu sudah kami terima dengan penuh syukur. Doa dan
                restumu sangat berarti bagi kami berdua. ♡
              </p>
              {whatsappNumber && (
                <a
                  className="btn-ghost"
                  style={{ marginTop: 16, display: "inline-flex" }}
                  href={`https://wa.me/${String(whatsappNumber).replace(/\D/g, "")}`}
                  target="_blank" rel="noopener noreferrer"
                >
                  Konfirmasi via WhatsApp ↗
                </a>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
              <div className="form-row">
                <label className="form-label" htmlFor="rsvp-name">Your name</label>
                <input id="rsvp-name" className="form-input" placeholder="Full name as on invitation" {...register("guest_name")} />
                {errors.guest_name && <span className="form-error">{errors.guest_name.message}</span>}
              </div>
              <div className="form-row">
                <label className="form-label" htmlFor="rsvp-token">Invitation code</label>
                <input
                  id="rsvp-token"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="form-input"
                  placeholder={isPreview ? "123456" : "6-digit code"}
                  {...register("token")}
                />
                <span className="form-hint" style={{ fontSize: 11, color: "var(--color-fg-mute)", marginTop: 4, display: "block" }}>The 6-digit code from your invite — it only works once.</span>
                {errors.token && <span className="form-error">{errors.token.message}</span>}
              </div>
              <div className="form-row-2">
                <div className="form-row">
                  <label className="form-label">Attending</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["yes", "no"].map((v) => (
                      <button key={v} type="button" onClick={() => setValue("attending", v, { shouldValidate: true })}
                        style={{
                          flex: 1, padding: "10px 12px",
                          fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase",
                          borderRadius: "var(--r-2)", border: "1px solid",
                          borderColor: attending === v ? "var(--color-accent-text)" : "var(--color-line)",
                          background: attending === v ? "var(--color-accent-soft)" : "transparent",
                          color: attending === v ? "var(--color-accent-text)" : "var(--color-fg)",
                        }}>
                        {v === "yes" ? "Joining ✦" : "Regret"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label" htmlFor="rsvp-guests">Total guests</label>
                  <input id="rsvp-guests" type="number" min="1" max="999" className="form-input" {...register("guest_count")} />
                  {errors.guest_count && <span className="form-error">{errors.guest_count.message}</span>}
                </div>
              </div>
              {menuOptions.length > 0 && (
                <div className="form-row">
                  <label className="form-label" htmlFor="rsvp-menu">Menu preference</label>
                  <select id="rsvp-menu" className="form-input" {...register("meal_choice")}>
                    {menuOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
              <div className="form-row">
                <label className="form-label" htmlFor="rsvp-note">A note for the couple (optional)</label>
                <textarea id="rsvp-note" rows={3} className="form-input" style={{ resize: "vertical", minHeight: 80 }} placeholder="Wishes, allergies, song requests…" {...register("message")} />
              </div>
              {sendError && <span className="form-error" role="alert">{sendError}</span>}
              <button type="submit" className="form-button" disabled={isSubmitting}>
                {isSubmitting ? "Mengirim…" : "Kirim RSVP →"}
              </button>
            </form>
          )}
        </CardChild>
      </GlassCard>
    </div>
  );
}
