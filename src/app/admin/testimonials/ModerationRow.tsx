'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminConfirm } from '@/components/admin/AdminDialogProvider'
import { setTestimonialVisible, deleteTestimonial } from './actions'
import { Button } from '@/components/ui/Button'
import tbl from '@/components/ui/table.module.css'

export interface AdminTestimonial {
  id: string
  rating: number
  body: string
  authorName: string
  isAnonymous: boolean
  templateId: string
  isVisible: boolean
  slug: string | null
  createdAt: string
}

export default function ModerationRow({ t }: { t: AdminTestimonial }) {
  const confirm = useAdminConfirm()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    await setTestimonialVisible(t.id, !t.isVisible)
    setBusy(false)
    router.refresh()
  }
  async function remove() {
    const ok = await confirm({ title: 'Hapus testimoni?', message: 'Testimoni ini akan dihapus permanen.', confirmLabel: 'Hapus', tone: 'danger' })
    if (!ok) return
    setBusy(true)
    await deleteTestimonial(t.id)
    setBusy(false)
    router.refresh()
  }

  return (
    <tr>
      <td data-label="Penulis">
        <div style={{ fontWeight: 500 }}>
          {t.authorName}
          {t.isAnonymous && <span style={badge}>akan tampil Anonim</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.slug ?? '—'} · {t.templateId}</div>
      </td>
      <td data-label="Rating" style={{ whiteSpace: 'nowrap' }} aria-label={`${t.rating} bintang`}>
        <span style={{ color: 'var(--color-gold, #E0A400)' }}>{'★'.repeat(t.rating)}</span>
        <span style={{ color: 'var(--border-strong, #ccc)' }}>{'★'.repeat(5 - t.rating)}</span>
      </td>
      {/* Body: NEVER italic (global constraint). */}
      <td data-label="Ulasan" className={`${tbl.tdEllipsis} ${tbl.tdWide}`} style={{ fontStyle: 'normal' }} title={t.body}>{t.body}</td>
      <td data-label="Aksi" style={{ whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="ghost" disabled={busy} onClick={toggle}>
            {t.isVisible ? 'Sembunyikan' : 'Munculkan'}
          </Button>
          <Button size="sm" variant="ghostDanger" disabled={busy} onClick={remove}>Hapus</Button>
        </div>
      </td>
    </tr>
  )
}

const badge: React.CSSProperties = { marginLeft: 8, fontSize: 11, color: 'var(--text-secondary)', background: 'var(--surface-sunken)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }
