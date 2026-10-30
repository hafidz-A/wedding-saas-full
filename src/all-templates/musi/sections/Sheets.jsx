'use client'

/* ============================================================
   The cover, and act 2 — ordinary-scroll glass cards over the night city
   (RSVP, wishes, gift) and the closing under the fireworks. Forms post to the
   shared FinCards APIs:
     • RSVP   → POST /api/rsvp      (rsvps table, feeds Buku Tamu)
     • wishes → POST /api/guestbook (guestbook_notes, shown in the card)
   Both need the guest's single-use 6-digit invitation code — one code covers
   one RSVP and one wish. In the dashboard preview (?preview=1) and on the
   demo (no live slug) both forms simulate success, so no real code is spent.
   ============================================================ */
import React, { useRef, useState } from 'react'
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

function CodeField({ id, value, onChange }) {
  return (
    <div className="mu-field">
      <label htmlFor={id}>Kode undangan</label>
      <input
        className="mu-input"
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="6 digit"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />
      <span className="mu-field-hint">Ada di pesan undanganmu. Satu kode berlaku untuk satu RSVP dan satu ucapan.</span>
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
    <section className="mu-glass mu-sheet" aria-labelledby="mu-rsvp-title">
      {props.label && <span className="mu-label">{props.label}</span>}
      <h2 className="mu-title" id="mu-rsvp-title">{props.title || 'Konfirmasi Kehadiran'}</h2>
      {props.subtitle && <p className="mu-body">{props.subtitle}</p>}
      {state.sent ? (
        <p className="mu-thanks" role="status">
          {name ? `Terima kasih, ${name}!` : 'Terima kasih!'} Konfirmasimu sudah kami terima.
        </p>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="mu-field">
            <label htmlFor="mu-rsvp-name">Nama</label>
            <input className="mu-input" id="mu-rsvp-name" autoComplete="name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {!simulated && <CodeField id="mu-rsvp-code" value={code} onChange={setCode} />}
          <fieldset className="mu-fieldset">
            <legend>Kehadiran</legend>
            <div className="mu-choices">
              {[['yes', 'Hadir'], ['no', 'Tidak hadir']].map(([v, l]) => (
                <label className="mu-choice" key={v}>
                  <input type="radio" name="mu-att" value={v} checked={attending === v} onChange={() => setAttending(v)} />
                  <span>{l}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {attending === 'yes' && (
            <div className="mu-field">
              <label htmlFor="mu-rsvp-count">Jumlah tamu</label>
              <select className="mu-input" id="mu-rsvp-count" value={count} onChange={(e) => setCount(e.target.value)}>
                {Array.from({ length: max }, (_, i) => (
                  <option key={i} value={String(i + 1)}>{i + 1} orang</option>
                ))}
              </select>
            </div>
          )}
          <div className="mu-field">
            <label htmlFor="mu-rsvp-msg">Pesan untuk mempelai (opsional)</label>
            <textarea className="mu-input" id="mu-rsvp-msg" maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <button className="mu-btn mu-solid" type="submit" disabled={state.busy}>
            {state.busy ? 'Mengirim…' : 'Kirim'}
          </button>
          <p className="mu-form-note" role="status">{state.note}</p>
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
      setState({ busy: false, note: 'Terima kasih! Doamu menyalakan satu kembang api di langit Palembang.' })
    } catch (err) {
      setState({ busy: false, note: err.message })
    }
  }

  return (
    <section className="mu-glass mu-sheet" aria-labelledby="mu-wish-title">
      {props.label && <span className="mu-label">{props.label}</span>}
      <h2 className="mu-title" id="mu-wish-title">{props.title || 'Doa untuk Kami'}</h2>
      {props.subtitle && <p className="mu-body">{props.subtitle}</p>}
      <form onSubmit={submit} noValidate>
        <div className="mu-field">
          <label htmlFor="mu-wish-name">Nama</label>
          <input className="mu-input" id="mu-wish-name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="mu-field">
          <label htmlFor="mu-wish-msg">Ucapan &amp; doa</label>
          <textarea className="mu-input" id="mu-wish-msg" maxLength={240} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        {!simulated && <CodeField id="mu-wish-code" value={code} onChange={setCode} />}
        <button className="mu-btn mu-solid" type="submit" disabled={state.busy}>
          {state.busy ? 'Mengirim…' : 'Kirim ucapan'}
        </button>
        <p className="mu-form-note" role="status">{state.note}</p>
      </form>
      <span className="mu-wish-count">{notes.length} ucapan</span>
      {notes.length > 0 && (
        <ul className="mu-wish-list">
          {notes.map((n) => (
            <li className="mu-wish" key={n.id}>
              <span className="mu-wish-name">{n.name}</span>
              <p className="mu-wish-msg">{n.message}</p>
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
    <button className={`mu-btn mu-ghost mu-sm${label === 'Tersalin' ? ' mu-done' : ''}`} type="button" onClick={copy}>
      {label}
    </button>
  )
}

function Account({ bank, value, holder }) {
  const ref = useRef(null)
  return (
    <div className="mu-account">
      <div className="mu-account-info">
        <span className="mu-bank">{bank}</span>
        <span className="mu-acc-no" ref={ref}>{value}</span>
        {holder && <span className="mu-acc-name">{holder}</span>}
      </div>
      <CopyButton text={value} fallbackRef={ref} />
    </div>
  )
}

export function GiftSheet({ props }) {
  const accounts = (Array.isArray(props.accounts) ? props.accounts : []).filter((a) => a && a.accountNumber)
  return (
    <section className="mu-glass mu-sheet" aria-labelledby="mu-gift-title">
      {props.label && <span className="mu-label">{props.label}</span>}
      <h2 className="mu-title" id="mu-gift-title">{props.title || 'Tanda Kasih'}</h2>
      {props.intro && <p className="mu-body">{props.intro}</p>}
      <div className="mu-accounts">
        {accounts.map((a, i) => (
          <Account key={a.id || i} bank={a.name} value={a.accountNumber} holder={a.accountHolder ? `a.n. ${a.accountHolder}` : ''} />
        ))}
        {props.giftAddress && <Account bank="Kirim Kado" value={props.giftAddress} />}
      </div>
    </section>
  )
}

export function Closing({ props, names, onBack, onRsvp, hasRsvp }) {
  return (
    <section className="mu-glass mu-closing" aria-label="Penutup">
      <div className="mu-snap">
        {props.couplePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.couplePhoto} alt={`Foto ${names.join(' dan ')}`} />
        ) : (
          <span className="mu-initials">{initials(names[0], names[1])}</span>
        )}
      </div>
      {props.label && <span className="mu-label">{props.label}</span>}
      {props.text && <p className="mu-body mu-closing-text">{props.text}</p>}
      <h2 className="mu-names mu-names-inline">
        {names[0]}
        {names[1] && <span className="mu-amp">&amp;</span>}
        {names[1]}
      </h2>
      <div className="mu-actions">
        {hasRsvp && (
          <button className="mu-btn mu-solid" type="button" onClick={onRsvp}>
            Konfirmasi Kehadiran
          </button>
        )}
        <button className="mu-btn mu-ghost" type="button" onClick={onBack}>
          Kembali ke awal
        </button>
      </div>
      <span className="mu-credit">Undangan digital · FinCards</span>
    </section>
  )
}

export function Cover({ props, names, dateDots, guest, onOpen }) {
  return (
    <section className="mu-cover" aria-label="Sampul undangan">
      <div className="mu-cover-top mu-shadowed">
        {props.eyebrow && <span className="mu-label">{props.eyebrow}</span>}
        <h1 className="mu-names">
          {names[0]}
          {names[1] && <span className="mu-amp">&amp;</span>}
          {names[1]}
        </h1>
        {dateDots && <span className="mu-date-line">{dateDots}</span>}
      </div>
      <div className="mu-glass mu-cover-bottom">
        {props.greeting && <span className="mu-to">{props.greeting}</span>}
        <p className="mu-guest">{guest || props.guestFallback || 'Tamu Undangan'}</p>
        <button className="mu-btn mu-solid mu-lg" type="button" onClick={onOpen}>
          {props.openLabel || 'Buka Undangan'}
        </button>
      </div>
    </section>
  )
}
