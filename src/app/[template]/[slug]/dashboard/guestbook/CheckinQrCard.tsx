'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import { useDashboardDict } from '../DashboardI18nProvider'
import { useConfirm, useAlert } from '@/components/dashboard/DialogProvider'
import { ensureCheckinToken, regenerateCheckinToken } from './actions'
import { ghostBtn, primaryBtn, statBox } from './styles'

export default function CheckinQrCard({ slug, template }: { slug: string; template: string }) {
  const t = useDashboardDict().tabs.guestbook
  const confirmDialog = useConfirm()
  const showAlert = useAlert()
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function render(token: string) {
    const url = `${window.location.origin}/${template}/${slug}/checkin?k=${token}`
    setDataUrl(await QRCode.toDataURL(url, { width: 320, margin: 1 }))
  }

  async function show() {
    setBusy(true)
    const res = await ensureCheckinToken(slug)
    if (res.ok && res.token) await render(res.token)
    else await showAlert({ message: res.error || t.networkError })
    setBusy(false)
  }

  async function regen() {
    if (!(await confirmDialog({ message: t.checkinQrRegenerateConfirm, tone: 'danger' }))) return
    setBusy(true)
    const res = await regenerateCheckinToken(slug)
    if (res.ok && res.token) await render(res.token)
    else await showAlert({ message: res.error || t.networkError })
    setBusy(false)
  }

  function print() {
    if (!dataUrl) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<img src="${dataUrl}" style="width:320px;display:block;margin:40px auto" onload="window.print()" />`)
    w.document.close()
  }

  return (
    <div style={{ ...statBox, marginBottom: 16, padding: 18 }}>
      <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 18 }}>{t.checkinQrTitle}</h3>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(42,33,24,0.6)', lineHeight: 1.5 }}>{t.checkinQrDesc}</p>
      {dataUrl ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="QR" style={{ width: 140, height: 140, borderRadius: 8, background: '#fff', padding: 6 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={primaryBtn} onClick={print} disabled={busy}>{t.checkinQrPrint}</button>
            <button type="button" style={ghostBtn} onClick={regen} disabled={busy}>{t.checkinQrRegenerate}</button>
          </div>
        </div>
      ) : (
        <button type="button" style={primaryBtn} onClick={show} disabled={busy}>{busy ? t.checkinQrLoading : t.checkinQrShow}</button>
      )}
    </div>
  )
}
