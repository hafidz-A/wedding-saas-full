/* ============================================================
   services/rsvp.js — RSVP submission service (mock/local)
   To swap to SaaS backend: replace body of submitRSVP() with
     return fetch('/api/rsvp', { method:'POST', body: JSON.stringify(record) }).then(r=>r.json());
   The shape is already aligned with the SaaS schema.
   ============================================================ */

const KEY = (slug) => `rsvp:${slug}`;

export async function submitRSVP({ slug = "demo", guest_name, attending, guest_count, meal_choice, message }) {
  const record = {
    slug,
    guest_name: String(guest_name || "").slice(0, 120),
    attending: !!attending,
    guest_count: Math.max(1, Math.min(20, Number(guest_count) || 1)),
    meal_choice: String(meal_choice || ""),
    message: String(message || "").slice(0, 600),
    created_at: new Date().toISOString(),
  };
  try {
    const arr = JSON.parse(localStorage.getItem(KEY(slug)) || "[]");
    arr.push(record);
    localStorage.setItem(KEY(slug), JSON.stringify(arr));
  } catch (e) { /* localStorage unavailable */ }
  console.info("[rsvp:mock] submitted", record);
  return { ok: true, record };
}

export async function listRSVP({ slug = "demo" } = {}) {
  try { return JSON.parse(localStorage.getItem(KEY(slug)) || "[]"); }
  catch { return []; }
}
