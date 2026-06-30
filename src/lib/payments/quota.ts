// Pure quota + add-on money math. CLIENT-SAFE — no 'server-only' (the stepper
// imports this). The server re-validates everything; the snap helper is UX only.

export const BLOCK_SIZE = 50
export const BLOCK_PRICE_IDR = 10_000
export const QUOTA_CAP = 5000

/** Plan-derived base quota included in the plan price. DB (`template_plans`) is
 *  the real source of truth; this is the client-safe fallback. */
export const DEFAULT_BASE_QUOTA: Record<string, number> = { basic: 200, premium: 300 }

/** Number of 50-guest blocks in a guest count (rounded UP, never negative —
 *  a partial block is a whole paid block). */
export function blocks(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.ceil(n / BLOCK_SIZE)
}

/** Rupiah for buying `qtyGuests` extra (blocks × Rp10k). */
export function quotaAddonAmount(qtyGuests: number): number {
  return blocks(qtyGuests) * BLOCK_PRICE_IDR
}

export function effectiveQuota(base: number, extra: number): number {
  return base + Math.max(0, extra)
}

/** Initial-purchase total: plan price + add-on for the chosen extra. */
export function initialPurchaseAmount(planPrice: number, extra: number): number {
  return planPrice + quotaAddonAmount(Math.max(0, extra))
}

/** Clamp a chosen `extra` to a clean block within [0, QUOTA_CAP - base] (round UP). */
export function clampQuotaExtra(base: number, extra: number): number {
  const maxExtra = Math.max(0, QUOTA_CAP - base)
  const snapped = Math.ceil((Number.isFinite(extra) && extra > 0 ? extra : 0) / BLOCK_SIZE) * BLOCK_SIZE
  return Math.min(Math.max(0, snapped), maxExtra)
}

/** Snap a typed value UP to the next 50, clamped to [min, max]. */
export function snapQuotaToBlock(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  const snapped = Math.ceil(value / BLOCK_SIZE) * BLOCK_SIZE
  return Math.min(Math.max(snapped, min), max)
}

/** Format an IDR amount as "Rp 149.000". Client-safe (no server-only). */
export function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}
