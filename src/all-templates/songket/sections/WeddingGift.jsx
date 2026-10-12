'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import useReveal from '../hooks/useReveal.js'
import { SectionHead, Corners } from '../components/SectionHead.jsx'
import { Tenong } from '../components/ornaments.jsx'
import styles from './Interactive.module.css'

const DEFAULTS = {
  eyebrow: 'Tanda Kasih',
  title: 'Hadiah Pernikahan',
  intro: '',
  accounts: [],
  giftAddress: '',
  confirmationEnabled: true,
  openLabel: 'Buka Tenong',
}

/**
 * Hadiah: a lacquered tenong whose lid lifts to reveal the accounts.
 * Account shape is the Lovebirds one ({ name, accountNumber, accountHolder })
 * so crypto/config.ts encrypts the number + holder at rest.
 */
export default function WeddingGift(props) {
  const cfg = { ...DEFAULTS, ...props }
  const { slug } = cfg
  const accounts = Array.isArray(cfg.accounts) ? cfg.accounts : []
  const { ref, visible } = useReveal()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: '', accountUsed: accounts[0]?.name || '', amount: '', message: '' },
  })

  const copy = async (acc, i) => {
    try {
      await navigator.clipboard?.writeText(String(acc.accountNumber ?? ''))
      setCopied(i)
      window.setTimeout(() => setCopied(null), 1800)
    } catch {}
  }

  const onSubmit = async (data) => {
    setSubmitError(null)
    // No DB row (demo) → simulate, never POST a slug the API would 404.
    if (!slug) {
      await new Promise((r) => setTimeout(r, 700))
      setSubmitted(true)
      return
    }
    try {
      const res = await fetch('/api/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          guest_name: data.name,
          account_used: data.accountUsed,
          amount: data.amount || null,
          currency: 'IDR',
          message: data.message || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Gagal mengirim')
      }
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message || 'Gagal mengirim. Coba lagi.')
    }
  }

  return (
    <section className="sk-section sk-texture" aria-label="Hadiah pernikahan">
      <div ref={ref} className={`sk-inner sk-reveal ${visible ? 'is-visible' : ''}`}>
        <SectionHead eyebrow={cfg.eyebrow} title={cfg.title} subtitle={cfg.subtitle} />
        {cfg.intro && <p className={styles.lead}>{cfg.intro}</p>}

        <div className={styles.tenongWrap}>
          <Tenong className={styles.tenong} open={open} />
          {!open && (
            <button type="button" className="sk-btn" onClick={() => setOpen(true)} aria-expanded={open}>
              {cfg.openLabel}
            </button>
          )}
        </div>

        {open && (
          <div className={styles.accounts}>
            {accounts.map((acc, i) => (
              <article key={acc.id ?? i} className={`sk-card ${styles.account}`}>
                <Corners />
                <p className={styles.bank}>{acc.name}</p>
                <p className={styles.number}>{acc.accountNumber}</p>
                <p className={styles.holder}>a.n. {acc.accountHolder}</p>
                <button type="button" className="sk-btn sk-btn--ghost sk-btn--sm" onClick={() => copy(acc, i)}>
                  {copied === i ? 'Tersalin ✓' : 'Salin nomor'}
                </button>
              </article>
            ))}
            {cfg.giftAddress && <p className={styles.address}>{cfg.giftAddress}</p>}
          </div>
        )}

        {open && cfg.confirmationEnabled && accounts.length > 0 && (
          <div className={`sk-card ${styles.formCard}`}>
            {submitted ? (
              <div className={styles.thanks}>
                <h3>Terima kasih atas tanda kasihnya</h3>
                <p>Konfirmasi Anda sudah kami terima.</p>
                <button type="button" className="sk-btn sk-btn--ghost sk-btn--sm" onClick={() => { reset(); setSubmitted(false) }}>
                  Kirim konfirmasi lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className={styles.form}>
                <h3 className={styles.formTitle}>Konfirmasi hadiah</h3>
                <label>
                  <span className="sk-label">Nama</span>
                  <input className="sk-input" {...register('name', { required: 'Mohon isi nama Anda' })} />
                  {errors.name && <span className="sk-error">{errors.name.message}</span>}
                </label>
                <label>
                  <span className="sk-label">Dikirim ke</span>
                  <select className="sk-input" {...register('accountUsed')}>
                    {accounts.map((a, i) => <option key={a.id ?? i} value={a.name}>{a.name}</option>)}
                  </select>
                </label>
                <label>
                  <span className="sk-label">Nominal (opsional)</span>
                  <input className="sk-input" inputMode="numeric" {...register('amount')} />
                </label>
                <label>
                  <span className="sk-label">Pesan (opsional)</span>
                  <textarea className="sk-input" rows={3} {...register('message')} />
                </label>
                {submitError && <p className="sk-error" role="alert">{submitError}</p>}
                <button type="submit" className="sk-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Mengirim…' : 'Kirim konfirmasi'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
