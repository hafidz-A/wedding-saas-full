// src/app/admin/payments/PaymentModeCard.tsx
'use client'

import { useState, useTransition } from 'react'
import { updatePaymentSettings } from './actions'
// Type-only import — erased at compile time, so this never pulls the
// 'server-only' payment-settings.ts module into the client bundle.
import type { PaymentSettings, PaymentMode } from '@/lib/payments/payment-settings'
import { Button } from '@/components/ui/Button'
import controls from '@/components/ui/controls.module.css'
import { useFeedback } from '@/components/ui/FeedbackProvider'

/**
 * Global gateway|manual payment-mode switch. Gateway keeps today's Midtrans
 * checkout untouched everywhere; Manual reroutes every buy/pay CTA site-wide
 * to a WhatsApp/Email hand-off using the contacts entered here. Saves via
 * `updatePaymentSettings`, which revalidates the cached `getPaymentSettings()`
 * read the moment the operator flips it — no redeploy.
 */
export default function PaymentModeCard({ initial }: { initial: PaymentSettings }) {
  const [mode, setMode] = useState<PaymentMode>(initial.mode)
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp)
  const [email, setEmail] = useState(initial.email)
  const [pending, startTransition] = useTransition()
  const fb = useFeedback()

  function save() {
    startTransition(async () => {
      const res = await updatePaymentSettings({ mode, whatsapp, email })
      res.ok ? fb.ok('Tersimpan') : fb.fail(res.error || 'Gagal')
    })
  }

  return (
    <section
      style={{
        border: '0.5px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: 16,
        margin: '0 0 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 420,
      }}
    >
      <div>
        <h2 style={{ fontSize: 15, margin: '0 0 2px' }}>Mode Pembayaran</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Gateway = checkout Midtrans otomatis (default). Manual = order masuk lewat WhatsApp/Email,
          kamu proses pembayaran dan aktivasi sendiri di admin.
        </p>
      </div>

      <div role="group" aria-label="Mode pembayaran" style={{ display: 'inline-flex', gap: 6 }}>
        <Button
          size="sm"
          variant={mode === 'gateway' ? 'primary' : 'ghost'}
          aria-pressed={mode === 'gateway'}
          onClick={() => setMode('gateway')}
        >
          Gateway (Midtrans)
        </Button>
        <Button
          size="sm"
          variant={mode === 'manual' ? 'primary' : 'ghost'}
          aria-pressed={mode === 'manual'}
          onClick={() => setMode('manual')}
        >
          Manual (WA/Email)
        </Button>
      </div>

      {mode === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nomor WhatsApp</span>
            <input
              className={controls.input}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="0851-1055-3938"
              inputMode="tel"
              required
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Email</span>
            <input
              className={controls.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@domain.com"
              required
            />
          </label>
        </div>
      )}

      <Button size="sm" onClick={save} disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Menyimpan…' : 'Simpan'}
      </Button>
    </section>
  )
}
