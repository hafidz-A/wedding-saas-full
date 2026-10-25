'use client'

/* ============================================================
   Act 2 — ordinary-scroll cards over the night garden (RSVP, wishes, gift,
   closing), plus the cover. Forms post to the shared FinCards APIs:
     • RSVP   → POST /api/rsvp      (rsvps table, feeds Buku Tamu)
     • wishes → POST /api/guestbook (guestbook_notes, shown on the wall)
   Both need the guest's single-use 6-digit invitation code — one code works
   for ONE of them. In the dashboard preview (?preview=1) and on the demo (no
   live slug) both forms simulate success, so no real code is spent.
   ============================================================ */
import React, { useState } from 'react'
import { SCENE } from '../config/assets.js'
import { Portrait } from './Journey.jsx'
import { initials } from '../utils/invite.js'

const CODE_RE = /^\d{6}$/

/** Friendly Indonesian copy for the API's status codes. */
function apiError(status, body) {
  if (status === 403) return 'Kode tidak valid atau sudah dipakai. Minta kode baru ke mempelai.'
  if (status === 409) return 'Kamu sudah mengirim konfirmasi sebelumnya.'
  if (status === 404) return 'Undangan ini belum aktif.'
  if (status === 429) return body?.error || 'Terlalu sering mengirim. Coba lagi sebentar lagi.'
  return 'Gagal mengirim. Periksa koneksi lalu coba lagi.'
}

async function post(url, payload) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(apiError(res.status, body))
  return body
}

const simulate = () => new Promise((r) => setTimeout(r, 700))

function Corners({ bottom = true }) {
  return (
    <>
      <img className="tb-corner tb-tl" src={SCENE.corner} alt="" />
      {bottom && <img className="tb-corner tb-br" src={SCENE.corner} alt="" />}
    </>
  )
}

function CodeField({ id, value, onChange }) {
  return (
    <div className="tb-field">
      <label htmlFor={id}>Kode undangan</label>
      <input
        className="tb-input"
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="6 digit"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />
      <span className="tb-field-hint">Ada di pesan undanganmu. Satu kode hanya bisa dipakai sekali — untuk RSVP atau ucapan.</span>
    </div>
  )
}

export function RsvpSheet({ props, slug, simulated, guestName }) {
  const max = Math.max(1, Math.min(10, Number(props.maxGuests) || 2))
  const [name, setName] = useState(guestName || '')
  const [code, setCode] = useState('')
  const [attending, setAttending] = useState('yes')
  const [count, setCount] = useState('1')
  const [message, setMessage] = useState('')
  const [state, setState] = useState({ busy: false, note: '', sent: false })

  async function submit(e) {
    e.preventDefault()
    if (name.trim().length < 2) return setState({ busy: false, note: 'Isi nama dulu ya.', sent: false })
    if (!simulated && !CODE_RE.test(code)) return setState({ busy: false, note: 'Kode undangan harus 6 digit.', sent: false })
    setState({ busy: true, note: '', sent: false })
    try {
      if (simulated) await simulate()
      else {
        await post('/api/rsvp', {
          slug,
          guest_name: name.trim(),
          attending: attending === 'yes',
          guest_count: attending === 'yes' ? Number(count) : 1,
          message: message.trim() || null,
          token: code,
        })
      }
      setState({ busy: false, note: '', sent: true })
    } catch (err) {
      setState({ busy: false, note: err.message, sent: false })
    }
  }

  return (
    <section className="tb-sheet" aria-labelledby="tb-rsvp-title">
      <Corners />
      {props.label && <span className="tb-label">{props.label}</span>}
      <h2 className="tb-script tb-sheet-title" id="tb-rsvp-title">{props.title || 'Konfirmasi Kehadiran'}</h2>
      {props.subtitle && <p className="tb-sheet-sub">{props.subtitle}</p>}
      {state.sent ? (
        <p className="tb-thanks" role="status">
          {name ? `Terima kasih, ${name}!` : 'Terima kasih!'} Konfirmasimu sudah kami terima.
        </p>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="tb-field">
            <label htmlFor="tb-rsvp-name">Nama</label>
            <input className="tb-input" id="tb-rsvp-name" autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {!simulated && <CodeField id="tb-rsvp-code" value={code} onChange={setCode} />}
          <fieldset>
            <legend>Kehadiran</legend>
            <div className="tb-choices">
              {[['yes', 'Hadir'], ['no', 'Tidak hadir']].map(([v, l]) => (
                <label className="tb-choice" key={v}>
                  <input type="radio" name="tb-att" value={v} checked={attending === v} onChange={() => setAttending(v)} />
                  <span>{l}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {attending === 'yes' && (
            <div className="tb-field">
              <label htmlFor="tb-rsvp-count">Jumlah tamu</label>
              <select className="tb-input" id="tb-rsvp-count" value={count} onChange={(e) => setCount(e.target.value)}>
                {Array.from({ length: max }, (_, i) => (
                  <option key={i} value={String(i + 1)}>{i + 1} orang</option>
                ))}
              </select>
            </div>
          )}
          <div className="tb-field">
            <label htmlFor="tb-rsvp-msg">Pesan untuk mempelai (opsional)</label>
            <textarea className="tb-input" id="tb-rsvp-msg" maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <button className="tb-pill-btn tb-solid" type="submit" disabled={state.busy}>
            {state.busy ? 'Mengirim…' : 'Kirim'}
          </button>
          <p className="tb-form-note" role="status">{state.note}</p>
        </form>
      )}
    </section>
  )
}

export function WishesSheet({ props, notes, slug, simulated, guestName, onSent }) {
  const [name, setName] = useState(guestName || '')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState({ busy: false, note: '' })

  async function submit(e) {
    e.preventDefault()
    const n = name.trim()
    const m = message.trim()
    if (!n || n.length > 40) return setState({ busy: false, note: 'Isi nama (maksimal 40 huruf).' })
    if (!m) return setState({ busy: false, note: 'Tulis ucapan atau doa singkat dulu ya.' })
    if (!simulated && !CODE_RE.test(code)) return setState({ busy: false, note: 'Kode undangan harus 6 digit.' })
    setState({ busy: true, note: '' })
    try {
      let note = { id: `local-${Date.now()}`, name: n, message: m, color: 'gold' }
      if (simulated) await simulate()
      else {
        const res = await post('/api/guestbook', { slug, name: n, message: m, color: 'gold', token: code })
        note = { id: res.id, name: res.name, message: res.message, color: res.color }
      }
      onSent(note)
      setMessage('')
      setCode('')
      setState({ busy: false, note: 'Terima kasih! Ucapanmu sudah terbang bersama lampion.' })
    } catch (err) {
      setState({ busy: false, note: err.message })
    }
  }

  return (
    <section className="tb-sheet" aria-labelledby="tb-wish-title">
      <Corners />
      {props.label && <span className="tb-label">{props.label}</span>}
      <h2 className="tb-script tb-sheet-title" id="tb-wish-title">{props.title || 'Doa untuk Kami'}</h2>
      {props.subtitle && <p className="tb-sheet-sub">{props.subtitle}</p>}
      <form onSubmit={submit} noValidate>
        <div className="tb-field">
          <label htmlFor="tb-wish-name">Nama</label>
          <input className="tb-input" id="tb-wish-name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="tb-field">
          <label htmlFor="tb-wish-msg">Ucapan &amp; doa</label>
          <textarea className="tb-input" id="tb-wish-msg" maxLength={240} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        {!simulated && <CodeField id="tb-wish-code" value={code} onChange={setCode} />}
        <button className="tb-pill-btn tb-solid" type="submit" disabled={state.busy}>
          {state.busy ? 'Mengirim…' : 'Kirim ucapan'}
        </button>
        <p className="tb-form-note" role="status">{state.note}</p>
      </form>
      <span className="tb-wish-count">{notes.length} ucapan</span>
      {notes.length > 0 && (
        <ul className="tb-wish-list">
          {notes.map((n) => (
            <li className="tb-wish" key={n.id}>
              <span className="tb-wish-name">{n.name}</span>
              <p className="tb-wish-msg">{n.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CopyButton({ text, fallbackRef }) {
  const [label, setLabel] = useState('Salin')
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setLabel('Tersalin')
    } catch {
      const el = fallbackRef.current
      if (el) {
        const r = document.createRange()
        r.selectNodeContents(el)
        const s = window.getSelection()
        s.removeAllRanges()
        s.addRange(r)
      }
      setLabel('Tekan salin')
    }
    setTimeout(() => setLabel('Salin'), 1800)
  }
  return (
    <button className={`tb-copy-btn${label === 'Tersalin' ? ' tb-done' : ''}`} type="button" onClick={copy}>
      {label}
    </button>
  )
}

function Account({ bank, value, holder }) {
  const ref = React.useRef(null)
  return (
    <div className="tb-account">
      <div className="tb-account-info">
        <span className="tb-bank">{bank}</span>
        <span className="tb-acc-no" ref={ref}>{value}</span>
        {holder && <span className="tb-acc-name">{holder}</span>}
      </div>
      <CopyButton text={value} fallbackRef={ref} />
    </div>
  )
}

export function GiftSheet({ props }) {
  const accounts = (Array.isArray(props.accounts) ? props.accounts : []).filter((a) => a && a.accountNumber)
  return (
    <section className="tb-sheet" aria-labelledby="tb-gift-title">
      <Corners />
      <img className="tb-gift-art" src={SCENE.gift} alt="" />
      {props.label && <span className="tb-label">{props.label}</span>}
      <h2 className="tb-script tb-sheet-title" id="tb-gift-title">{props.title || 'Tanda Kasih'}</h2>
      {props.intro && <p className="tb-sheet-sub">{props.intro}</p>}
      <div className="tb-accounts">
        {accounts.map((a, i) => (
          <Account key={a.id || i} bank={a.name} value={a.accountNumber} holder={a.accountHolder ? `a.n. ${a.accountHolder}` : ''} />
        ))}
        {props.giftAddress && <Account bank="Kirim Kado" value={props.giftAddress} />}
      </div>
    </section>
  )
}

export function Closing({ props, names }) {
  return (
    <section className="tb-closing tb-shadowed" aria-label="Penutup">
      <Portrait src={props.couplePhoto} alt={`Foto ${names.join(' dan ')}`} fallback={initials(names[0], names[1])} small />
      {props.label && <span className="tb-label">{props.label}</span>}
      {props.text && <p className="tb-closing-text">{props.text}</p>}
      <h2 className="tb-script tb-names-inline">
        {names[0]}
        {names[1] && <span className="tb-amp">&amp;</span>}
        {names[1]}
      </h2>
      <span className="tb-credit">Undangan digital · FinCards</span>
    </section>
  )
}

export function Cover({ props, names, dateDots, guest, onOpen }) {
  return (
    <section className="tb-cover tb-shadowed" aria-label="Sampul undangan">
      <div className="tb-cover-top">
        {props.eyebrow && <span className="tb-label">{props.eyebrow}</span>}
        <h1 className="tb-script tb-names">
          {names[0]}
          {names[1] && <span className="tb-amp">&amp;</span>}
          {names[1]}
        </h1>
        {dateDots && <span className="tb-date-line">{dateDots}</span>}
      </div>
      <div className="tb-cover-bottom">
        {props.greeting && <span className="tb-to">{props.greeting}</span>}
        <p className="tb-guest">{guest || props.guestFallback || 'Tamu Undangan'}</p>
        <button className="tb-pill-btn tb-solid tb-lg" type="button" onClick={onOpen}>
          {props.openLabel || 'Buka Undangan'}
        </button>
      </div>
    </section>
  )
}
