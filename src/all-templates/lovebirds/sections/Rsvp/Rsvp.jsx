'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import useScrollReveal from '../../hooks/useScrollReveal.js'
import SceneFrame from '../../components/SceneFrame.jsx'
import styles from './Rsvp.module.css'

const DEFAULTS = {
  title: 'Will You Join Us?',
  subtitle: '',
  // Opt-in: the meal picker only renders when the couple turns it on in the
  // editor (default OFF so the RSVP form stays lean unless they want it).
  mealEnabled: false,
  mealOptions: [],
}

export default function Rsvp(props) {
  const { title, subtitle, mealEnabled, mealOptions, slug } = { ...DEFAULTS, ...props }
  const showMeal = mealEnabled && mealOptions.length > 0
  const { ref, isVisible } = useScrollReveal()
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // NOTE: no per-device lock. A personalized link (?to=Name) may be shared by a
  // whole family/household, so the form stays available for the NEXT guest after
  // each submit. Single-use enforcement is per-CODE on the server
  // (consumeGuestTokenForRsvp): an already-used code is rejected (403/409), shown
  // here as submitError — so a new code can still RSVP, a spent one cannot.

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      attending: 'yes',
      guestCount: 1,
      meal: mealOptions[0]?.value || '',
      message: '',
      token: '',
    },
  })

  const attending = watch('attending')

  // Preview iframe loads /<template>/<slug>?preview=1 — in preview we never hit
  // the live API; we simulate so the owner can test the form. 123456 is the
  // demo code (cosmetic only; the live endpoint has no 123456 backdoor).
  // Read in an effect (NOT during render) so SSR and the first client render
  // agree (both false) — otherwise `window.location` makes them diverge and
  // React throws a hydration mismatch on the placeholder.
  const [isPreview, setIsPreview] = useState(false)
  useEffect(() => {
    setIsPreview(new URLSearchParams(window.location.search).get('preview') === '1')
  }, [])

  // Bring the empty form back so another guest (a different code) can RSVP via
  // the same shared link without reloading.
  const rsvpAnother = () => {
    reset()
    setSubmitError(null)
    setSubmitted(false)
  }

  const onSubmit = async (data) => {
    setSubmitError(null)
    // Standalone (no slug) OR preview — simulate success, never call the API.
    if (!slug || isPreview) {
      await new Promise((r) => setTimeout(r, 900))
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
          guest_count: data.guestCount,
          meal_choice: showMeal ? data.meal || null : null,
          message: data.message || null,
          token: data.token,
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

  return (
    <section
      ref={ref}
      className={`${styles.section} ${isVisible ? styles.visible : ''}`}
      aria-label="RSVP"
    >
      <SceneFrame />
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Kindly respond</p>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>

        {!submitted ? (
          <div className={styles.formCard}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span className={styles.label}>Your name</span>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Maya Larasati"
                    aria-invalid={errors.name ? 'true' : 'false'}
                    {...register('name', { required: 'Please enter your name' })}
                  />
                  {errors.name && <span className={styles.error}>{errors.name.message}</span>}
                </label>
              </div>

              <div className={styles.row}>
                <label className={styles.field}>
                  <span className={styles.label}>Invitation code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    className={styles.input}
                    placeholder={isPreview ? '123456' : '6-digit code'}
                    aria-invalid={errors.token ? 'true' : 'false'}
                    {...register('token', {
                      required: 'Enter the 6-digit code from your invite',
                      pattern: { value: /^\d{6}$/, message: 'The code is 6 digits' },
                    })}
                  />
                  <span className={styles.hint}>The 6-digit code from your invite — it only works once.</span>
                  {errors.token && <span className={styles.error}>{errors.token.message}</span>}
                </label>
              </div>

              <div className={styles.row}>
                <fieldset className={styles.field}>
                  <legend className={styles.label}>Will you attend?</legend>
                  <Controller
                    name="attending"
                    control={control}
                    render={({ field }) => (
                      <div className={styles.toggle} role="radiogroup" aria-label="Attendance">
                        {[
                          { value: 'yes', label: 'Joyfully, yes' },
                          { value: 'no', label: 'Regretfully, no' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={field.value === opt.value}
                            className={`${styles.toggleBtn} ${
                              field.value === opt.value ? styles.toggleActive : ''
                            }`}
                            onClick={() => field.onChange(opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </fieldset>
              </div>

              {attending === 'yes' && (
                <>
                  <div className={styles.row}>
                    <fieldset className={styles.field}>
                      <legend className={styles.label}>How many of you?</legend>
                      <Controller
                        name="guestCount"
                        control={control}
                        rules={{ min: 1 }}
                        render={({ field }) => (
                          <div className={styles.stepper}>
                            <button
                              type="button"
                              className={styles.stepBtn}
                              onClick={() => field.onChange(Math.max(1, (field.value || 1) - 1))}
                              aria-label="Decrease guest count"
                            >−</button>
                            <span className={styles.stepValue} aria-live="polite">
                              {field.value}
                            </span>
                            <button
                              type="button"
                              className={styles.stepBtn}
                              onClick={() => field.onChange(Math.min(99, (field.value || 1) + 1))}
                              aria-label="Increase guest count"
                            >+</button>
                          </div>
                        )}
                      />
                    </fieldset>
                  </div>

                  {showMeal && (
                    <div className={styles.row}>
                      <label className={styles.field}>
                        <span className={styles.label}>Meal preference</span>
                        <div className={styles.selectWrap}>
                          <select className={styles.select} {...register('meal')}>
                            {mealOptions.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                          <span className={styles.selectChevron} aria-hidden="true">▾</span>
                        </div>
                      </label>
                    </div>
                  )}
                </>
              )}

              <div className={styles.row}>
                <label className={styles.field}>
                  <span className={styles.label}>A note for us (optional)</span>
                  <textarea
                    className={styles.textarea}
                    rows={4}
                    maxLength={500}
                    placeholder="Wishes, songs, dietary notes…"
                    aria-invalid={errors.message ? 'true' : 'false'}
                    {...register('message', {
                      maxLength: { value: 500, message: 'Maksimal 500 karakter' },
                    })}
                  />
                  {errors.message && <span className={styles.error}>{errors.message.message}</span>}
                </label>
              </div>

              {submitError && (
                <p className={styles.error} role="alert" style={{ marginTop: 4 }}>{submitError}</p>
              )}

              <button
                type="submit"
                className={styles.submit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending…' : 'Send my RSVP'}
              </button>
            </form>
          </div>
        ) : (
          <div className={styles.successCard}>
            <div className={styles.successInner} role="status" aria-live="polite">
              <span className={styles.successIcon} aria-hidden="true">♥</span>
              <h3 className={styles.successTitle}>Thank you</h3>
              <p className={styles.successText}>
                Your RSVP has been recorded. We cannot wait to celebrate with you.
              </p>
              {/* Same link may be shared with other guests — let the next one
                  RSVP with their own code without reloading. */}
              <button type="button" className={styles.another} onClick={rsvpAnother}>
                RSVP for another guest
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
