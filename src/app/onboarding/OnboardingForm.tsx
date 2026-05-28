'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { completeOnboarding, checkSlugAvailable } from './actions'
import { templateCatalog } from '@/config/templateCatalog'

function firstWord(s: string): string {
  return s.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
}

const TEMPLATE_IDS = templateCatalog.map((t) => t.id)

export default function OnboardingForm({ email }: { email: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryTemplate = searchParams.get('template') || ''
  const initialTemplate = TEMPLATE_IDS.includes(queryTemplate) ? queryTemplate : templateCatalog[0].id

  const [pending, startTransition] = useTransition()
  const [template, setTemplate] = useState(initialTemplate)
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [bride, setBride] = useState('')
  const [groom, setGroom] = useState('')
  const [date, setDate] = useState('')
  const [venue, setVenue] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ slug: string; publicUrl: string; dashboardUrl: string } | null>(null)
  const [slugStatus, setSlugStatus] = useState<{ checking?: boolean; available?: boolean; reason?: string }>(
    {},
  )

  // Auto-suggest slug from bride+groom first names until user edits it themselves
  useEffect(() => {
    if (slugTouched) return
    const a = firstWord(bride)
    const b = firstWord(groom)
    if (a && b) setSlug(`${a}-${b}`)
    else if (a) setSlug(a)
    else if (b) setSlug(b)
  }, [bride, groom, slugTouched])

  // Debounced slug availability check
  useEffect(() => {
    if (!slug) {
      setSlugStatus({})
      return
    }
    setSlugStatus({ checking: true })
    const t = setTimeout(async () => {
      const res = await checkSlugAvailable(slug)
      setSlugStatus({ checking: false, ...res })
    }, 400)
    return () => clearTimeout(t)
  }, [slug])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await completeOnboarding({
        slug,
        template,
        brideName: bride,
        groomName: groom,
        weddingDate: date,
        venue,
      })
      if (!result.ok) {
        setError(result.error || 'Gagal membuat undangan')
        return
      }
      setDone({
        slug: result.slug!,
        publicUrl: result.publicUrl!,
        dashboardUrl: result.dashboardUrl!,
      })
    })
  }

  if (done) {
    return (
      <main style={panel}>
        <div style={card}>
          <p style={kicker}>Undangan siap</p>
          <h1 style={h1}>Selamat 🎉</h1>
          <p style={muted}>
            Undangan kamu sudah dibuat di <b>{done.slug}</b>. Buka link berikut:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
            <a href={done.publicUrl} target="_blank" rel="noopener noreferrer" style={primaryLink}>
              Buka preview undangan →
            </a>
            <button
              type="button"
              onClick={() => router.push(done.dashboardUrl)}
              style={ghostBtn}
            >
              Masuk ke dashboard
            </button>
          </div>
          <p style={{ ...muted, fontSize: 13, marginTop: 18 }}>
            Tip: di dashboard kamu bisa edit semua section (foto, jadwal, RSVP, gift, dll).
          </p>
        </div>
      </main>
    )
  }

  const slugOk = slug && slugStatus.available && !slugStatus.checking

  return (
    <main style={panel}>
      <form onSubmit={onSubmit} style={card}>
        <header>
          <p style={kicker}>Setup undangan</p>
          <h1 style={h1}>Data dasar</h1>
          <p style={muted}>
            Login sebagai <b>{email}</b>. Isi 5 data ini, sisanya bisa kamu edit
            kapan saja di dashboard.
          </p>
        </header>

        <div style={field}>
          <span style={lbl}>Pilih template</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {templateCatalog.map((t) => {
              const active = t.id === template
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: active
                      ? `2px solid ${t.accent || '#2A2118'}`
                      : '1px solid rgba(42,33,24,0.18)',
                    background: active ? 'rgba(42,33,24,0.04)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'block', fontWeight: 600, color: '#2A2118', fontSize: 15 }}>
                    {t.label}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: '#5C4A3A', marginTop: 4, lineHeight: 1.4 }}>
                    {t.tags.join(' · ')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <label style={field}>
          <span style={lbl}>Nama mempelai perempuan</span>
          <input
            value={bride}
            onChange={(e) => setBride(e.target.value)}
            placeholder="Apan Teh"
            required
            style={input}
          />
        </label>

        <label style={field}>
          <span style={lbl}>Nama mempelai pria</span>
          <input
            value={groom}
            onChange={(e) => setGroom(e.target.value)}
            placeholder="Apin Toh"
            required
            style={input}
          />
        </label>

        <label style={field}>
          <span style={lbl}>Tanggal & jam acara</span>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={input}
          />
        </label>

        <label style={field}>
          <span style={lbl}>Lokasi / venue</span>
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Mason Pine, Bandung"
            required
            style={input}
          />
        </label>

        <label style={field}>
          <span style={lbl}>URL undangan kamu</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#5C4A3A', fontSize: 14 }}>weddingsite/</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value.toLowerCase())
              }}
              placeholder="apan-apin"
              required
              minLength={3}
              maxLength={40}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              style={{ ...input, flex: 1 }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              color:
                slugStatus.checking
                  ? '#5C4A3A'
                  : slugStatus.available
                  ? '#2D8C4E'
                  : slugStatus.reason
                  ? '#E8553E'
                  : '#5C4A3A',
              marginTop: 4,
            }}
          >
            {slug && slugStatus.checking && 'Mengecek ketersediaan…'}
            {slug && !slugStatus.checking && slugStatus.available && '✓ URL ini tersedia'}
            {slug && !slugStatus.checking && slugStatus.reason && `✗ ${slugStatus.reason}`}
            {!slug && 'Huruf kecil, angka, dan tanda hubung. Contoh: apan-apin'}
          </span>
        </label>

        {error && <p style={errorStyle}>{error}</p>}

        <button type="submit" disabled={pending || !slugOk} style={submitBtn}>
          {pending ? 'Membuat undangan…' : 'Buat undangan & preview'}
        </button>
      </form>
    </main>
  )
}

const panel: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
  padding: 24,
  fontFamily: 'var(--font-body, system-ui)',
}
const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  padding: 36,
  background: 'rgba(255,255,255,0.95)',
  borderRadius: 20,
  boxShadow: '0 20px 60px rgba(42,33,24,0.12)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}
const kicker: React.CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.32em',
  fontSize: 11,
  color: '#E8553E',
  margin: '0 0 8px',
}
const h1: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontStyle: 'italic',
  fontSize: 32,
  margin: 0,
  color: '#2A2118',
  lineHeight: 1.1,
}
const muted: React.CSSProperties = { margin: '8px 0 0', color: '#5C4A3A', lineHeight: 1.6 }
const field: React.CSSProperties = { display: 'grid', gap: 6 }
const lbl: React.CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  color: 'rgba(42,33,24,0.6)',
}
const input: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(42,33,24,0.18)',
  fontSize: 15,
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
}
const submitBtn: React.CSSProperties = {
  marginTop: 8,
  padding: '14px 24px',
  borderRadius: 999,
  background: '#2A2118',
  color: '#F5EFE3',
  border: 0,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}
const errorStyle: React.CSSProperties = {
  margin: 0,
  padding: '10px 12px',
  background: 'rgba(232,85,62,0.1)',
  color: '#E8553E',
  borderRadius: 10,
  fontSize: 13,
}
const primaryLink: React.CSSProperties = {
  display: 'inline-block',
  padding: '14px 24px',
  background: '#2A2118',
  color: '#F5EFE3',
  borderRadius: 999,
  textDecoration: 'none',
  fontSize: 13,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  textAlign: 'center',
}
const ghostBtn: React.CSSProperties = {
  padding: '14px 24px',
  background: 'transparent',
  color: '#2A2118',
  border: '1px solid rgba(42,33,24,0.3)',
  borderRadius: 999,
  cursor: 'pointer',
  fontSize: 13,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
}
