/* ============================================================
   services/wishes.js — guestbook/wishes service (mock/local)
   ============================================================ */

const KEY = (slug) => `wishes:${slug}`;

const SEED = [
  { name: "Anya", text: "Selamat menempuh hidup baru, semoga langgeng selamanya ✦", created_at: new Date(Date.now() - 86_400e3 * 3).toISOString() },
  { name: "Bima", text: "Two stars colliding. Beautiful.",                              created_at: new Date(Date.now() - 86_400e3).toISOString() },
];

export async function listWishes({ slug = "demo" } = {}) {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY(slug)) || "null");
    if (stored) return stored;
  } catch {}
  return SEED.slice();
}

export async function submitWish({ slug = "demo", guest_name, message }) {
  const record = {
    slug,
    name: String(guest_name || "Anonymous").slice(0, 80),
    text: String(message || "").slice(0, 280),
    created_at: new Date().toISOString(),
  };
  try {
    const arr = JSON.parse(localStorage.getItem(KEY(slug)) || "null") || SEED.slice();
    arr.unshift(record);
    localStorage.setItem(KEY(slug), JSON.stringify(arr));
  } catch {}
  console.info("[wishes:mock] submitted", record);
  return { ok: true, record };
}
