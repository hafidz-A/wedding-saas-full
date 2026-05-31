/* ============================================================
   services/gift.js — gift-confirmation service (SaaS-wired)
   ------------------------------------------------------------
   Posts to the shared /api/gift endpoint, which resolves the slug
   server-side and inserts into the `gift_confirmations` table. Same
   contract & flow as the lovebirds Wedding Gift section.

   Demo / standalone (no real slug) falls back to a simulated success.
   ============================================================ */

function isRealSlug(slug) {
  return !!slug && slug !== "demo";
}

export async function submitGift({ slug = "demo", guest_name, account_used, amount, message }) {
  if (!isRealSlug(slug)) {
    await new Promise((r) => setTimeout(r, 700));
    return { ok: true, simulated: true };
  }

  const res = await fetch("/api/gift", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      guest_name,
      account_used,
      amount: amount || null,
      currency: "IDR",
      message: message || null,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Submission failed");
  }
  return { ok: true };
}
