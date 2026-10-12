'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import useReveal from '../hooks/useReveal.js'
import { SectionHead, Corners } from '../components/SectionHead.jsx'
import { readPreviewMode } from '../utils/guestName.js'
import styles from './Interactive.module.css'

const DEFAULTS = { eyebrow: 'Konfirmasi Kehadiran', title: 'Sudikah Hadir?', subtitle: '' }

/**
 * RSVP — same contract as Lovebirds: the 6-digit single-use code from the
 * guest's WhatsApp invite is required; preview + demo simulate success.
 */
export default function Rsvp(props) {
  const { eyebrow, title, subtitle, slug } = { ...DEFAULTS, ...props }
  const { ref, visible } = useReveal()
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [isPreview, setIsPreview] = useState(false)
  useEffect(() => setIsPreview(readPreviewMode()), [])

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: '', token: '', attending: 'yes', guestCount: 1, message: '' },
  })
  const attending = watch('attending')

  const onSubmit = async (data) => {
    setSubmitError(null)
    if (!slug || isPreview) {
      await new Promise((r) => setTimeout(r, 700))
      setSubmitted(true)
      return
    }
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          guest_name: data.name,
          attending: data.attending === 'yes',
          guest_count: Number(data.guestCount) || 1,
          message: data.message || null,
          token: data.token,
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
    <section className="sk-section sk-section--alt sk-texture" aria-label="RSVP">
      <span className="sk-rebung" aria-hidden="true" />
      <div ref={ref} className={`sk-inner sk-reveal ${visible ? 'is-visible' : ''}`}>
        <SectionHead eyebrow={eyebrow} title={title} subtitle={subtitle} />
        <div className={`sk-card ${styles.formCard}`}>
          <Corners />
          {submitted ? (
            <div className={styles.thanks}>
              <h3>Terima kasih</h3>
              <p>Konfirmasi kehadiran Anda sudah kami terima.</p>
              <button type="button" className="sk-btn sk-btn--ghost sk-btn--sm" onClick={() => { reset(); setSubmitted(false) }}>
                Isi untuk tamu lain
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className={styles.form}>
              <label>
                <span className="sk-label">Nama</span>
                <input className="sk-input" placeholder="mis. Siti Aminah" {...register('name', { required: 'Mohon isi nama Anda' })} />
                {errors.name && <span className="sk-error">{errors.name.message}</span>}
              </label>
              <label>
                <span className="sk-label">Kode undangan</span>
                <input
                  className="sk-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder={isPreview ? '123456' : '6 digit dari undangan WhatsApp'}
                  {...register('token', {
                    required: 'Masukkan 6 digit kode dari undangan Anda',
                    pattern: { value: /^\d{6}$/, message: 'Kode terdiri dari 6 angka' },
                  })}
                />
                {errors.token && <span className="sk-error">{errors.token.message}</span>}
              </label>
              <fieldset className={styles.choice}>
                <legend className="sk-label">Kehadiran</legend>
                <label><input type="radio" value="yes" {...register('attending')} /> Insya Allah hadir</label>
                <label><input type="radio" value="no" {...register('attending')} /> Berhalangan hadir</label>
              </fieldset>
              {attending === 'yes' && (
                <label>
                  <span className="sk-label">Jumlah tamu</span>
                  <select className="sk-input" {...register('guestCount')}>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} orang</option>)}
                  </select>
                </label>
              )}
              <label>
                <span className="sk-label">Ucapan & doa (opsional)</span>
                <textarea className="sk-input" rows={3} {...register('message')} />
              </label>
              {submitError && <p className="sk-error" role="alert">{submitError}</p>}
              <button type="submit" className="sk-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Mengirim…' : 'Kirim konfirmasi'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
