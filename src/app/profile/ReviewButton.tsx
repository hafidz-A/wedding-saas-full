'use client'

import { useEffect, useState } from 'react'
import { submitReview } from './reviewActions'
import { countWords, MAX_REVIEW_WORDS } from '@/lib/testimonials/validate'
import { Button } from '@/components/ui/Button'
import ui from '@/components/ui/controls.module.css'
import { useEscapeToClose } from '@/components/ui/useEscapeToClose'

export interface ReviewExisting { rating: number; body: string; isAnonymous: boolean; isVisible: boolean }

/**
 * Thank-you body tailored to the invitation's category. Heading stays universal;
 * only the closing line changes so a non-wedding invitation (birthday, aqiqah,
 * graduation, corporate) gets a fitting sentiment. Falls back to wedding.
 */
const THANKS_BODY: Record<string, string> = {
  wedding: 'Ulasanmu sudah kami terima dengan senang hati. Cerita sepertimu yang membuat kami terus berbenah — sekaligus membantu pasangan lain menemukan momen indahnya. Selamat berbahagia, ya. 🤍',
  birthday: 'Ulasanmu sudah kami terima dengan senang hati. Cerita sepertimu yang membuat kami terus berbenah — sekaligus membantu orang lain merayakan hari spesialnya. Semoga tahun ini penuh kebahagiaan. 🤍',
  aqiqah: 'Ulasanmu sudah kami terima dengan senang hati. Cerita sepertimu yang membuat kami terus berbenah — sekaligus membantu keluarga lain menyambut buah hatinya dengan hangat. Semoga menjadi keberkahan untuk si kecil. 🤍',
  graduation: 'Ulasanmu sudah kami terima dengan senang hati. Cerita sepertimu yang membuat kami terus berbenah — sekaligus membantu orang lain merayakan pencapaiannya. Selamat atas pencapaianmu, ya! 🤍',
  corporate: 'Ulasanmu sudah kami terima dengan senang hati. Cerita sepertimu yang membuat kami terus berbenah — sekaligus membantu tim lain menyiapkan acaranya dengan lebih matang. Sukses selalu untuk acara dan langkah berikutnya.',
}

export default function ReviewButton({
  invitationId,
  defaultName,
  existing,
  category = 'wedding',
}: {
  invitationId: string
  defaultName: string
  existing: ReviewExisting | null
  category?: string
}) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [body, setBody] = useState(existing?.body ?? '')
  const [name, setName] = useState(defaultName)
  const [anon, setAnon] = useState(existing?.isAnonymous ?? false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [thanks, setThanks] = useState(false)

  const words = countWords(body)
  const over = words > MAX_REVIEW_WORDS
  const invalid = busy || rating === 0 || !body.trim() || over

  // Thank-you popup dismisses itself; the effect also clears if the user
  // closes it early (scrim/×), so we never fire setState on an unmounted timer.
  useEffect(() => {
    if (!thanks) return
    const id = setTimeout(() => setThanks(false), 4500)
    return () => clearTimeout(id)
  }, [thanks])

  useEscapeToClose(() => { if (!busy) setOpen(false) }, open)
  useEscapeToClose(() => setThanks(false), thanks)

  async function submit() {
    setBusy(true); setErr(null)
    const res = await submitReview({ invitationId, rating, body, authorName: name, isAnonymous: anon })
    setBusy(false)
    if (res.ok) { setSaved(true); setOpen(false); setThanks(true) } else setErr(res.error || 'Gagal')
  }

  const hasReviewed = Boolean(existing) || saved

  return (
    <>
      {!open ? (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          {hasReviewed ? 'Ubah Ulasan' : 'Beri Ulasan'}
        </Button>
      ) : (
        <div style={scrim} role="dialog" aria-modal="true" aria-label="Bagikan pengalamanmu" onClick={() => !busy && setOpen(false)}>
          <div style={card} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>Bagikan pengalamanmu</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
              Ceritakan bagaimana undangannya membantu harimu — ulasan yang bagus membantu pasangan lain memutuskan.
            </p>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }} aria-label="Rating bintang">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  aria-label={`${n} bintang`}
                  style={{ ...starBtn, color: (hover || rating) >= n ? 'var(--color-gold, #E0A400)' : 'var(--border-strong, #ccc)' }}
                >★</button>
              ))}
            </div>

            <label style={lbl}>Ulasan
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Tulis pengalamanmu di sini…"
                style={{ ...ctl, height: 'auto', padding: 10, resize: 'vertical', fontStyle: 'normal' }}
              />
            </label>
            <div style={{ fontSize: 12, color: over ? 'var(--status-error)' : 'var(--text-muted)', marginTop: -4, marginBottom: 10 }}>
              {words}/{MAX_REVIEW_WORDS} kata
            </div>

            <label style={lbl}>Nama tampil
              <input value={name} onChange={(e) => setName(e.target.value)} disabled={anon} style={{ ...ctl, opacity: anon ? 0.5 : 1 }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '10px 0 0', cursor: 'pointer' }}>
              <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
              Samarkan nama saya (tampil sebagai “Anonim”)
            </label>

            {err && <p style={{ color: 'var(--status-error)', fontSize: 13, margin: '10px 0 0' }}>{err}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>Batal</Button>
              <Button size="sm" disabled={invalid} onClick={submit}>
                {busy ? 'Menyimpan…' : 'Kirim ulasan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {thanks && (
        <div style={scrim} role="dialog" aria-modal="true" aria-label="Terima kasih" onClick={() => setThanks(false)}>
          <div style={{ ...card, maxWidth: 400, textAlign: 'center', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setThanks(false)} aria-label="Tutup" className={ui.iconBtn} style={closeBtnPos}>×</button>
            <span style={checkCircle} aria-hidden>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <h2 style={{ fontSize: 21, margin: '16px 0 8px' }}>Terima kasih, sungguh</h2>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-secondary)', margin: 0 }}>
              {THANKS_BODY[category] ?? THANKS_BODY.wedding}
            </p>
            <div style={{ marginTop: 16, fontSize: 11, letterSpacing: '0.04em', color: 'var(--text-muted)' }}>menutup otomatis dalam beberapa detik</div>
          </div>
        </div>
      )}
    </>
  )
}

const scrim: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000 }
const card: React.CSSProperties = { width: '100%', maxWidth: 460, background: '#fff', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', boxShadow: '0 20px 60px rgba(42,33,24,0.20)', padding: 22 }
const lbl: React.CSSProperties = { display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-muted)' }
const ctl: React.CSSProperties = { height: 44, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: '#fff', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box', fontStyle: 'normal' }
const starBtn: React.CSSProperties = { background: 'none', border: 'none', fontSize: 30, lineHeight: 1, cursor: 'pointer', padding: 0 }
const closeBtnPos: React.CSSProperties = { position: 'absolute', top: 10, right: 12 }
const checkCircle: React.CSSProperties = { display: 'inline-grid', placeItems: 'center', width: 56, height: 56, borderRadius: 'var(--radius-round)', background: 'var(--color-coral, #E8553E)', color: '#fff', marginTop: 4 }
