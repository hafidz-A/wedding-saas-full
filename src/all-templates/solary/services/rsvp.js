/* ============================================================
   services/rsvp.js — RSVP submission service (SaaS-wired)
   ------------------------------------------------------------
   Posts to the shared /api/rsvp endpoint, which resolves the slug
   server-side and inserts into the `rsvps` table (and auto-populates
   the Buku Tamu ledger). Same contract & flow as the lovebirds RSVP.

   Demo / standalone (no real slug) falls back to a simulated success
   so the bundled showcase still "works" without a DB row.
   ============================================================ */

function isRealSlug(slug) {
  return !!slug && slug !== "demo";
}

export async function submitRSVP({ slug = "demo", guest_name, attending, guest_count, message, token }) {
  if (!isRealSlug(slug)) {
    await new Promise((r) => setTimeout(r, 700));
    return { ok: true, simulated: true };
  }

  const res = await fetch("/api/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      guest_name,
      attending: !!attending,
      guest_count,
      message: message || null,
      token: token || "",
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Submission failed");
  }
  return { ok: true };
}
