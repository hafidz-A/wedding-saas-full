// src/components/refund/RefundRequestFields.tsx
'use client'

import type { RefundRequestInput } from '@/app/onboarding/actions'
import ui from '@/components/ui/controls.module.css'

export interface RefundFormValue {
  category: RefundRequestInput['category']
  detail: string
  destType: 'bank' | 'ewallet'
  bank: string
  wallet: string
  accountNo: string
  holder: string
}

export const EMPTY_REFUND_FORM: RefundFormValue = {
  category: 'duplicate_payment', detail: '', destType: 'bank',
  bank: '', wallet: 'GoPay', accountNo: '', holder: '',
}

/** Map the form state to the server contract. E-wallets ride in `bank`
 *  (carries the wallet name) so the server/admin shape never changes. */
export function buildRefundInput(v: RefundFormValue, needsDestination: boolean): RefundRequestInput {
  return {
    category: v.category,
    detail: v.detail || undefined,
    destination: needsDestination
      ? { bank: v.destType === 'ewallet' ? v.wallet : v.bank, account_no: v.accountNo, holder: v.holder }
      : undefined,
  }
}

/**
 * Shared reason/detail/destination fields for both refund forms (dashboard
 * RefundRequestButton + /profile ProfileRefundControl). Destination markup
 * (select-based bank/e-wallet toggle, copy, wallet list, placeholders) is
 * ported verbatim from the dashboard's original inline implementation — that
 * was the more complete/mature version, so it is the single source of truth
 * now instead of two diverging copies.
 */
export default function RefundRequestFields({ value, onChange, needsDestination }: {
  value: RefundFormValue
  onChange: (v: RefundFormValue) => void
  needsDestination: boolean
}) {
  const set = (patch: Partial<RefundFormValue>) => onChange({ ...value, ...patch })
  return (
    <>
      <label style={lbl}>Alasan
        <select value={value.category} onChange={(e) => set({ category: e.target.value as RefundFormValue['category'] })} className={ui.input}>
          <option value="duplicate_payment">Bayar dobel</option>
          <option value="system_failure">Gagal sistem</option>
          <option value="inaccessible">Tidak bisa diakses</option>
          <option value="other">Lainnya</option>
        </select>
      </label>
      <label style={lbl}>Keterangan (opsional)
        <textarea value={value.detail} onChange={(e) => set({ detail: e.target.value })} rows={2} className={ui.input} style={{ height: 'auto', padding: 8 }} />
      </label>
      {needsDestination && (
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
            Metode pembayaranmu tidak mendukung refund otomatis, jadi dana dikembalikan via transfer. Mau dikembalikan ke mana?
          </p>
          <label style={lbl}>Tujuan pengembalian
            <select value={value.destType} onChange={(e) => set({ destType: e.target.value as 'bank' | 'ewallet' })} className={ui.input}>
              <option value="bank">Rekening bank</option>
              <option value="ewallet">E-wallet (GoPay / OVO / DANA / ShopeePay)</option>
            </select>
          </label>
          {value.destType === 'bank' ? (
            <>
              <input placeholder="Bank (contoh: BCA)" value={value.bank} onChange={(e) => set({ bank: e.target.value })} className={ui.input} />
              <input placeholder="Nomor rekening" value={value.accountNo} onChange={(e) => set({ accountNo: e.target.value })} className={ui.input} />
              <input placeholder="Nama pemilik rekening" value={value.holder} onChange={(e) => set({ holder: e.target.value })} className={ui.input} />
            </>
          ) : (
            <>
              <select value={value.wallet} onChange={(e) => set({ wallet: e.target.value })} className={ui.input}>
                <option value="GoPay">GoPay</option>
                <option value="OVO">OVO</option>
                <option value="DANA">DANA</option>
                <option value="ShopeePay">ShopeePay</option>
                <option value="LinkAja">LinkAja</option>
              </select>
              <input placeholder="Nomor HP e-wallet (08xx…)" value={value.accountNo} onChange={(e) => set({ accountNo: e.target.value })} className={ui.input} inputMode="tel" />
              <input placeholder="Nama pemilik akun" value={value.holder} onChange={(e) => set({ holder: e.target.value })} className={ui.input} />
            </>
          )}
        </div>
      )}
    </>
  )
}

const lbl: React.CSSProperties = { display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }
