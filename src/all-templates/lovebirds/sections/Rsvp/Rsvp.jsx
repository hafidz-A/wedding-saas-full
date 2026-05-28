'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import useScrollReveal from '../../hooks/useScrollReveal.js'
import styles from './Rsvp.module.css'

const DEFAULTS = {
  title: 'Will You Join Us?',
  subtitle: '',
  mealOptions: [],
  maxGuests: 5,
}

export default function Rsvp(props) {
  const { title, subtitle, mealOptions, maxGuests: rawMaxGuests, slug } = { ...DEFAULTS, ...props }
  // Coerce to a positive integer. Editor stores the field as text so any
  // garbage value ("werwer", "", null) should fall back to the default of 5.
  const parsedMax = Number.parseInt(rawMaxGuests, 10)
  const maxGuests = Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 5
  const { ref, isVisible } = useScrollReveal()
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    defaultValues: {
      name: '',
      attending: 'yes',
      guestCount: 1,
      meal: mealOptions[0]?.value || '',
      message: '',
    },
  })

  const attending = watch('attending')

  const onSubmit = async (data) => {
    setSubmitError(null)
    // Standalone mode (no slug) — simulate success
    if (!slug) {
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
          meal_choice: data.meal || null,
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
    reset()
  }

  return (
    <section
      id="rsvp"
      ref={ref}
      className={`${styles.section} ${isVisible ? styles.visible : ''}`}
      aria-label="RSVP"
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Kindly respond</p>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>

        {!submitted ? (
          <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
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
                      rules={{ min: 1, max: maxGuests }}
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
                            onClick={() =>
                              field.onChange(Math.min(maxGuests, (field.value || 1) + 1))
                            }
                            aria-label="Increase guest count"
                          >+</button>
                          <span className={styles.stepHint}>Max {maxGuests}</span>
                        </div>
                      )}
                    />
                  </fieldset>
                </div>

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
              </>
            )}

            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>A note for us (optional)</span>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  placeholder="Wishes, songs, dietary notes…"
                  {...register('message', { maxLength: 500 })}
                />
              </label>
            </div>

            {submitError && (
              <p className={styles.error} role="alert" style={{ marginTop: 4 }}>{submitError}</p>
            )}

            <button type="submit" className={styles.submit} disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Send my RSVP'}
            </button>
          </form>
        ) : (
          <div className={styles.success} role="status" aria-live="polite">
            <span className={styles.successIcon} aria-hidden="true">♥</span>
            <h3 className={styles.successTitle}>Thank you</h3>
            <p className={styles.successText}>
              Your RSVP has been recorded. We cannot wait to celebrate with you.
            </p>
            <button type="button" className={styles.resetBtn} onClick={handleReset}>
              Submit another response
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
