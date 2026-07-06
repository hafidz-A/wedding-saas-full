// src/app/admin/templates/validate.ts
// Pure plan-patch validation. NOT a 'use server' file — imported by both the
// server action and the client editor (for the PlanPatch type).
import { BLOCK_SIZE, QUOTA_CAP } from '@/lib/payments/quota'

export interface PlanPatch {
  display_name: string
  price_idr: number
  compare_at_price_idr: number | null
  base_guest_quota: number
  duration_days: number | null
  features: string[]
}

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n)

export function validatePlanPatch(p: PlanPatch): { ok: true } | { ok: false; error: string } {
  if (!p.display_name || !p.display_name.trim()) return { ok: false, error: 'Nama paket wajib diisi' }
  if (!isInt(p.price_idr) || p.price_idr < 0) return { ok: false, error: 'Harga harus angka bulat ≥ 0' }
  if (p.compare_at_price_idr !== null && (!isInt(p.compare_at_price_idr) || p.compare_at_price_idr <= p.price_idr)) {
    return { ok: false, error: 'Harga coret harus lebih besar dari harga jual (atau kosong)' }
  }
  if (!isInt(p.base_guest_quota) || p.base_guest_quota % BLOCK_SIZE !== 0 || p.base_guest_quota < BLOCK_SIZE || p.base_guest_quota > QUOTA_CAP) {
    return { ok: false, error: `Kuota harus kelipatan ${BLOCK_SIZE}, antara ${BLOCK_SIZE} dan ${QUOTA_CAP}` }
  }
  if (p.duration_days !== null && (!isInt(p.duration_days) || p.duration_days <= 0)) {
    return { ok: false, error: 'Masa aktif harus angka hari > 0, atau kosong (seumur hidup)' }
  }
  if (!Array.isArray(p.features) || p.features.length === 0 || p.features.some((f) => !f || !f.trim())) {
    return { ok: false, error: 'Fitur tidak boleh kosong' }
  }
  return { ok: true }
}
