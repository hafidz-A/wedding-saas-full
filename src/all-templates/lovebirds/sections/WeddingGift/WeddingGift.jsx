'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { motion, AnimatePresence } from 'motion/react'
import useScrollReveal from '../../hooks/useScrollReveal.js'
import styles from './WeddingGift.module.css'

/* ============================================================================
   WEDDING GIFT — bank accounts + e-wallets + gift confirmation form

   Pattern mirrors Rsvp.jsx so once Supabase is wired in, both sections post
   to their respective tables (rsvps / gift_confirmations) with identical
   submission flow.
   ============================================================================ */

const DEFAULTS = {
  title: 'Wedding Gift',
  subtitle: '',
  intro:
    'Kehadiran Anda adalah hadiah terbesar bagi kami. Namun bila Anda ingin memberikan tanda kasih, kami menyediakan beberapa opsi berikut.',
  accounts: [],
  giftAddress: null,
  confirmationEnabled: true,
}

function BankIcon({ type }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (type === 'ewallet') {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <circle cx="17" cy="15" r="1.2" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M3 10l9-6 9 6" />
      <path d="M5 10v8" />
      <path d="M9 10v8" />
      <path d="M15 10v8" />
      <path d="M19 10v8" />
      <path d="M3 20h18" />
    </svg>
  )
}

function CopyIcon({ copied }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (copied) {
    return <svg {...common}><polyline points="20 6 9 17 4 12" /></svg>
  }
  return (
    <svg {...common}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
    </svg>
  )
}

function AccountCard({ account, index, onUseForConfirmation }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(account.accountNumber)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Fallback for older browsers / non-secure contexts
      const ta = document.createElement('textarea')
      ta.value = account.accountNumber
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* ignore */ }
      document.body.removeChild(ta)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <motion.article
      className={`${styles.card} ${styles[`accent-${account.accent || 'coral'}`]}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
        delay: Math.min(index * 0.08, 0.4),
      }}
    >
      <header className={styles.cardHeader}>
        <span className={styles.cardIcon}><BankIcon type={account.type} /></span>
        <div className={styles.cardHeaderText}>
          <span className={styles.cardKind}>
            {account.type === 'ewallet' ? 'E-Wallet' : 'Bank Transfer'}
          </span>
          <h3 className={styles.cardName}>{account.name}</h3>
        </div>
      </header>

      <div className={styles.cardBody}>
        <span className={styles.cardLabel}>Nomor Rekening</span>
        <div className={styles.cardNumberRow}>
          <span className={styles.cardNumber}>{account.accountNumber}</span>
          <button
            type="button"
            className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ''}`}
            onClick={handleCopy}
            aria-label={`Copy ${account.name} account number`}
          >
            <CopyIcon copied={copied} />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <span className={styles.cardLabel}>Atas Nama</span>
        <span className={styles.cardHolder}>{account.accountHolder}</span>
      </div>

      {onUseForConfirmation && (
        <button
          type="button"
          className={styles.useBtn}
          onClick={() => onUseForConfirmation(account)}
        >
          Konfirmasi transfer ke {account.name} →
        </button>
      )}
    </motion.article>
  )
}

export default function WeddingGift(props) {
  const config = { ...DEFAULTS, ...props }
  const { title, subtitle, intro, accounts, giftAddress, confirmationEnabled, slug } = config
  const { ref, isVisible } = useScrollReveal()
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [formOpen, setFormOpen] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    defaultValues: {
      name: '',
      accountUsed: accounts[0]?.name || '',
      amount: '',
      message: '',
    },
  })

  const onSubmit = async (data) => {
    setSubmitError(null)
    // Standalone mode (no slug, e.g. local preview) — simulate success
    if (!slug) {
      await new Promise((r) => setTimeout(r, 900))
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
        throw new Error(body.error || 'Submission failed')
      }
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message || 'Gagal mengirim. Coba lagi.')
    }
  }

  const handleReset = () => {
    setSubmitted(false)
    setFormOpen(false)
    reset()
  }

  const handleUseAccount = (account) => {
    setValue('accountUsed', account.name, { shouldDirty: true })
    setFormOpen(true)
    window.requestAnimationFrame(() => {
      document.getElementById('gift-confirm-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  // Keep the select in sync if accounts list changes externally
  useEffect(() => {
    if (accounts[0]?.name) setValue('accountUsed', accounts[0].name)
  }, [accounts, setValue])

  return (
    <section
      id="wedding-gift"
      ref={ref}
      className={`${styles.section} ${isVisible ? styles.visible : ''}`}
      aria-label="Wedding Gift"
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Tanda kasih</p>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          {intro && <p className={styles.intro}>{intro}</p>}
        </header>

        {accounts.length > 0 && (
          <div className={styles.accountGrid}>
            {accounts.map((acc, idx) => (
              <AccountCard
                key={acc.id || idx}
                account={acc}
                index={idx}
                onUseForConfirmation={confirmationEnabled ? handleUseAccount : null}
              />
            ))}
          </div>
        )}

        {giftAddress && (
          <motion.div
            className={styles.addressCard}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={styles.addressLabel}>Alamat untuk Kado Fisik</span>
            <p className={styles.addressText}>{giftAddress}</p>
          </motion.div>
        )}

        {confirmationEnabled && (
          <div className={styles.confirmWrap} id="gift-confirm-form">
            {!formOpen && !submitted && (
              <button
                type="button"
                className={styles.openFormBtn}
                onClick={() => setFormOpen(true)}
              >
                Konfirmasi pemberian hadiah →
              </button>
            )}

            <AnimatePresence mode="wait">
              {formOpen && !submitted && (
                <motion.form
                  key="form"
                  className={styles.form}
                  onSubmit={handleSubmit(onSubmit)}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  noValidate
                >
                  <p className={styles.formIntro}>
                    Sudah transfer? Bantu kami mencatat hadiah Anda — agar kami bisa berterima kasih secara personal.
                  </p>

                  <div className={styles.row}>
                    <label className={styles.field}>
                      <span className={styles.label}>Nama Anda</span>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="mis. Maya Larasati"
                        aria-invalid={errors.name ? 'true' : 'false'}
                        {...register('name', { required: 'Mohon isi nama Anda' })}
                      />
                      {errors.name && <span className={styles.error}>{errors.name.message}</span>}
                    </label>
                  </div>

                  <div className={styles.rowSplit}>
                    <label className={styles.field}>
                      <span className={styles.label}>Transfer ke</span>
                      <div className={styles.selectWrap}>
                        <Controller
                          name="accountUsed"
                          control={control}
                          render={({ field }) => (
                            <select className={styles.select} {...field}>
                              {accounts.map((a) => (
                                <option key={a.id || a.name} value={a.name}>
                                  {a.name} — {a.accountHolder}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                        <span className={styles.selectChevron} aria-hidden="true">▾</span>
                      </div>
                    </label>

                    <label className={styles.field}>
                      <span className={styles.label}>Nominal (opsional)</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={styles.input}
                        placeholder="mis. 500.000"
                        {...register('amount', {
                          pattern: {
                            value: /^[0-9.,\s]*$/,
                            message: 'Hanya angka',
                          },
                        })}
                      />
                      {errors.amount && <span className={styles.error}>{errors.amount.message}</span>}
                    </label>
                  </div>

                  <div className={styles.row}>
                    <label className={styles.field}>
                      <span className={styles.label}>Pesan untuk pasangan (opsional)</span>
                      <textarea
                        className={styles.textarea}
                        rows={4}
                        placeholder="Doa, ucapan, atau pesan kecil…"
                        {...register('message', { maxLength: 500 })}
                      />
                    </label>
                  </div>

                  {submitError && (
                    <p className={styles.error} role="alert">{submitError}</p>
                  )}

                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => { setFormOpen(false); reset() }}
                    >
                      Batal
                    </button>
                    <button type="submit" className={styles.submit} disabled={isSubmitting}>
                      {isSubmitting ? 'Mengirim…' : 'Kirim konfirmasi'}
                    </button>
                  </div>
                </motion.form>
              )}

              {submitted && (
                <motion.div
                  key="success"
                  className={styles.success}
                  role="status"
                  aria-live="polite"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className={styles.successIcon} aria-hidden="true">♥</span>
                  <h3 className={styles.successTitle}>Terima kasih</h3>
                  <p className={styles.successText}>
                    Hadiah Anda telah kami catat. Kami akan menghubungi Anda untuk berterima kasih secara langsung.
                  </p>
                  <button type="button" className={styles.resetBtn} onClick={handleReset}>
                    Kirim konfirmasi lain
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  )
}
