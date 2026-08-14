// src/app/admin/invitations/new/CreateInvitationForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { adminCreateInvitationForClient, type CreateForClientResult } from '../actions'
import { Button } from '@/components/ui/Button'
import { BLOCK_SIZE } from '@/lib/payments/quota'
import { TEMPLATE_VIBES } from '@/components/marketing/vibeData'
import { templateOrnaments } from '@/lib/templates/appearance'

const TEMPLATES = [
  { id: 'lovebirds', label: 'Lovebirds' },
  { id: 'solary', label: 'Solary' },
]

type PayMode = 'none' | 'comp' | 'manual'
type PeriodKind = 'plan' | 'lifetime' | 'days'

export default function CreateInvitationForm() {
  const [template, setTemplate] = useState('lovebirds')
  const [plan, setPlan] = useState('basic')
  const [quotaExtra, setQuotaExtra] = useState(0)

  // Appearance — palette always offered, ornament only when the selected
  // template actually has ornament options (registry-driven, e.g. Solary
  // has none). Both reset when the template changes so a stale key from the
  // previous template can never be submitted.
  const vibe = TEMPLATE_VIBES.find((v) => v.id === template) ?? TEMPLATE_VIBES[0]
  const palettes = vibe.palettes
  const ornaments = templateOrnaments(template)
  const [palette, setPalette] = useState(palettes[0]?.key ?? '')
  const [ornamentType, setOrnamentType] = useState(ornaments[0]?.key ?? '')
  useEffect(() => {
    const nextVibe = TEMPLATE_VIBES.find((v) => v.id === template) ?? TEMPLATE_VIBES[0]
    setPalette(nextVibe.palettes[0]?.key ?? '')
    setOrnamentType(templateOrnaments(template)[0]?.key ?? '')
  }, [template])
  const [brideName, setBrideName] = useState('')
  const [groomName, setGroomName] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [venue, setVenue] = useState('')
  const [slug, setSlug] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [payMode, setPayMode] = useState<PayMode>('none')
  const [amount, setAmount] = useState(0)
  const [periodKind, setPeriodKind] = useState<PeriodKind>('plan')
  const [days, setDays] = useState(365)

  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CreateForClientResult | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setResult(null)
    const period = periodKind === 'days' ? { kind: 'days' as const, days } : { kind: periodKind }
    const markPaid = payMode === 'none' ? undefined : {
      source: payMode as 'comp' | 'manual',
      amountIDR: payMode === 'manual' ? amount : 0,
      period: period as any,
    }
    const res = await adminCreateInvitationForClient({
      template, plan, guestQuotaExtra: quotaExtra,
      brideName, groomName, weddingDate, venue, slug, clientEmail, markPaid,
      palette: palette || undefined,
      ornamentType: ornaments.length > 0 ? (ornamentType || undefined) : undefined,
    })
    setResult(res)
    setBusy(false)
  }

  if (result?.ok) {
    const dashUrl = `/${template}/${result.slug}/dashboard`
    const pubUrl = `/${template}/${result.slug}`
    return (
      <div style={panel}>
        <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Undangan dibuat ✓</h2>
        <p style={{ fontSize: 14, margin: '0 0 4px' }}>
          <code>{result.slug}</code> — <a href={pubUrl} target="_blank" rel="noreferrer" style={link}>lihat publik</a> · <a href={dashUrl} target="_blank" rel="noreferrer" style={link}>dashboard klien</a>
        </p>
        {result.createdUser ? (
          <div style={{ ...notice, borderColor: 'var(--interactive-primary)' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Akun baru dibuat untuk {result.clientEmail}</p>
            {result.resetOtp ? (
              <>
                <p style={{ margin: '0 0 4px', fontSize: 13 }}>Kirim ini ke klien supaya dia bisa atur password & masuk:</p>
                <ol style={{ margin: '0 0 8px', paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
                  <li>Buka <a href={result.resetUrl} target="_blank" rel="noreferrer" style={link}>{result.resetUrl}</a></li>
                  <li>Email: <strong>{result.clientEmail}</strong></li>
                  <li>Kode: <strong style={{ fontSize: 18, letterSpacing: '0.15em', fontFamily: 'ui-monospace, monospace' }}>{result.resetOtp}</strong></li>
                  <li>Buat password baru</li>
                </ol>
                <p style={{ margin: 0, fontSize: 12, color: result.emailSent ? 'var(--text-secondary)' : 'var(--status-error)' }}>
                  {result.emailSent
                    ? '✓ Email berisi langkah di atas sudah dikirim otomatis ke klien.'
                    : '⚠ Email otomatis belum aktif — salin kode + link di atas dan kirim manual (mis. WhatsApp) ke klien.'}
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13 }}>
                Kode belum bisa dibuat otomatis. Minta klien buka <a href="/forgot-password" style={link}>/forgot-password</a>,
                masukkan email <strong>{result.clientEmail}</strong>, lalu ikuti kode dari email untuk atur password.
              </p>
            )}
          </div>
        ) : (
          <div style={notice}>
            <p style={{ margin: 0, fontSize: 13 }}>
              Ditautkan ke akun yang <strong>sudah ada</strong> ({result.clientEmail}). Klien masuk pakai password lamanya
              (kalau lupa, pakai <a href="/forgot-password" style={link}>/forgot-password</a>).
            </p>
          </div>
        )}
        <Button size="sm" onClick={() => setResult(null)} style={{ marginTop: 14 }}>Buat lagi</Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14, maxWidth: 620 }}>
      <Field label="Email klien">
        <input type="email" required value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="klien@email.com" style={input} />
      </Field>

      <Row>
        <Field label="Template">
          <select value={template} onChange={(e) => setTemplate(e.target.value)} style={input}>
            {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Plan">
          <select value={plan} onChange={(e) => setPlan(e.target.value)} style={input}>
            <option value="basic">basic</option>
            <option value="premium">premium</option>
          </select>
        </Field>
        <Field label={`Kuota tambahan (kelipatan ${BLOCK_SIZE})`}>
          <input type="number" min={0} step={BLOCK_SIZE} value={quotaExtra} onChange={(e) => setQuotaExtra(parseInt(e.target.value || '0', 10) || 0)} style={input} />
        </Field>
      </Row>

      <Row>
        <Field label="Palet">
          <select value={palette} onChange={(e) => setPalette(e.target.value)} style={input}>
            {palettes.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </Field>
        {ornaments.length > 0 && (
          <Field label="Ornamen">
            <select value={ornamentType} onChange={(e) => setOrnamentType(e.target.value)} style={input}>
              {ornaments.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </Field>
        )}
      </Row>

      <Row>
        <Field label="Nama pengantin wanita">
          <input required value={brideName} onChange={(e) => setBrideName(e.target.value)} style={input} />
        </Field>
        <Field label="Nama pengantin pria">
          <input required value={groomName} onChange={(e) => setGroomName(e.target.value)} style={input} />
        </Field>
      </Row>

      <Row>
        <Field label="Tanggal & waktu acara">
          <input type="datetime-local" required value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} style={input} />
        </Field>
        <Field label="Lokasi acara">
          <input required value={venue} onChange={(e) => setVenue(e.target.value)} style={input} />
        </Field>
      </Row>

      <Field label="Slug (alamat undangan — huruf kecil, angka, tanda hubung)">
        <input required value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="adi-rani" style={input} />
      </Field>

      <Field label="Pembayaran">
        <select value={payMode} onChange={(e) => setPayMode(e.target.value as PayMode)} style={input}>
          <option value="none">Biarkan draft (klien bayar sendiri via Midtrans)</option>
          <option value="comp">Comp — gratiskan (Rp 0)</option>
          <option value="manual">Lunas manual — uang diterima offline</option>
        </select>
      </Field>

      {payMode !== 'none' && (
        <Row>
          {payMode === 'manual' && (
            <Field label="Nominal diterima (Rp)">
              <input type="number" min={0} value={amount} onChange={(e) => setAmount(parseInt(e.target.value || '0', 10) || 0)} style={input} />
            </Field>
          )}
          <Field label="Masa aktif">
            <select value={periodKind} onChange={(e) => setPeriodKind(e.target.value as PeriodKind)} style={input}>
              <option value="plan">Ikut durasi plan</option>
              <option value="lifetime">Seumur hidup</option>
              <option value="days">N hari</option>
            </select>
          </Field>
          {periodKind === 'days' && (
            <Field label="Jumlah hari">
              <input type="number" min={1} value={days} onChange={(e) => setDays(parseInt(e.target.value || '1', 10) || 1)} style={input} />
            </Field>
          )}
        </Row>
      )}

      {result && !result.ok && <p style={{ color: 'var(--status-error)', fontSize: 13, margin: 0 }}>{result.error}</p>}

      <div>
        <Button size="sm" type="submit" disabled={busy}>{busy ? 'Membuat…' : 'Buat undangan'}</Button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4, flex: 1, minWidth: 160 }}>
      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </label>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{children}</div>
}

const input: React.CSSProperties = { height: 36, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--surface-raised)', color: 'var(--text-primary)', fontSize: 14, width: '100%', boxSizing: 'border-box' }
const link: React.CSSProperties = { color: 'var(--interactive-primary)' }
const panel: React.CSSProperties = { maxWidth: 620, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 20 }
const notice: React.CSSProperties = { marginTop: 12, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: 14, background: 'var(--surface-sunken, transparent)' }
