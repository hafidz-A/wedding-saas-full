import React, { useEffect, useState } from "react";
import GlassCard, { CardChild } from "../components/GlassCard.jsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { submitRSVP } from "../services/rsvp.js";
import { useGuest } from "../contexts/GuestContext.jsx";

const schema = z.object({
  guest_name: z.string().min(2, "Required").max(120),
  attending: z.enum(["yes", "no"]),
  guest_count: z.coerce.number().int().min(1),
  meal_choice: z.string().optional(),
  message: z.string().max(600).optional(),
});

const sentKey = (slug) => `rsvp-sent:${slug}`;
const isRealSlug = (slug) => !!slug && slug !== "demo";

export default function RSVPPlanet({ sectionLabel, planetName, heading, deadline, whatsappNumber, menuOptions = [], slug = "demo" }) {
  const { name } = useGuest();
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { guest_name: name || "", attending: "yes", guest_count: 1, meal_choice: menuOptions[0] || "", message: "" },
  });
  useEffect(() => { if (name) setValue("guest_name", name); }, [name, setValue]);
  const attending = watch("attending");
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState(null);

  // One RSVP per device: a real invitation remembers the submission across
  // reloads. Demo/standalone resets on refresh by design.
  useEffect(() => {
    if (!isRealSlug(slug)) return;
    try {
      if (window.localStorage.getItem(sentKey(slug))) setSent(true);
    } catch { /* storage blocked — fall back to in-session lock */ }
  }, [slug]);

  const onSubmit = async (data) => {
    setSendError(null);
    try {
      await submitRSVP({
        slug,
        guest_name: data.guest_name,
        attending: data.attending === "yes",
        guest_count: data.guest_count,
        meal_choice: data.meal_choice,
        message: data.message,
      });
    } catch (err) {
      setSendError(err?.message || "Gagal mengirim. Coba lagi.");
      return;
    }
    if (isRealSlug(slug)) {
      try {
        window.localStorage.setItem(sentKey(slug), new Date().toISOString());
      } catch { /* storage blocked — in-session lock still applies */ }
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
          <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 14 }}>
            <span>RSVP Form</span>
            {deadline && <span style={{ color: "var(--color-fg-mute)" }}>Deadline · {deadline}</span>}
          </div>
        </CardChild>
        <CardChild>
          {sent ? (
            <div className="center-text" style={{ marginTop: "0.5rem", padding: "1.75rem 1.5rem", border: "1px solid var(--color-line)", borderRadius: "var(--r-3)", background: "var(--color-surface)" }}>
              <div style={{ fontSize: 30, color: "var(--color-accent)", marginBottom: 10 }}>✦</div>
              <h3 className="h-3" style={{ marginBottom: 6 }}>Terima kasih</h3>
              <p className="p-body" style={{ color: "var(--color-fg-mute)", fontSize: 14 }}>
                RSVP Anda telah kami catat. Sampai jumpa di hari bahagia kami.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
              <div className="form-row">
                <label className="form-label" htmlFor="rsvp-name">Your name</label>
                <input id="rsvp-name" className="form-input" placeholder="Full name as on invitation" {...register("guest_name")} />
                {errors.guest_name && <span className="form-error">{errors.guest_name.message}</span>}
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
                          borderColor: attending === v ? "var(--color-accent)" : "var(--color-line)",
                          background: attending === v ? "var(--color-accent-soft)" : "transparent",
                          color: attending === v ? "var(--color-accent)" : "var(--color-fg)",
                        }}>
                        {v === "yes" ? "Joining ✦" : "Regret"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label" htmlFor="rsvp-guests">Total guests</label>
                  <input id="rsvp-guests" type="number" min="1" className="form-input" {...register("guest_count")} />
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
