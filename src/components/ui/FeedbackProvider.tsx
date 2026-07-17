'use client'

import React, { createContext, useCallback, useContext, useReducer, useRef, type ReactNode } from 'react'
import {
  toastQueueReducer,
  prefersReducedMotion,
  TOAST_TTL_MS,
  type ToastKind,
} from './feedback'
import styles from './FeedbackProvider.module.css'

export interface FeedbackApi {
  /** Success pill (✓). Pass a context message. */
  ok: (message?: string) => void
  /** Failure pill (✗). Pass a context message. */
  fail: (message?: string) => void
}

export interface FeedbackDefaults {
  ok: string
  fail: string
}

const FALLBACK: FeedbackDefaults = { ok: 'Berhasil', fail: 'Gagal' }

const Ctx = createContext<FeedbackApi | null>(null)

export function useFeedback(): FeedbackApi {
  const c = useContext(Ctx)
  if (!c) throw new Error('useFeedback must be used inside <FeedbackProvider>')
  return c
}

/**
 * Shared toast system (top-center stack) — decoupled from dashboard i18n so any
 * surface (dashboard, editor, /admin, …) can mount it directly. Pass `defaults`
 * for the default ok/fail copy when the caller doesn't provide a message; falls
 * back to `{ ok: 'Berhasil', fail: 'Gagal' }` when omitted.
 */
export function FeedbackProvider({
  children,
  defaults,
}: {
  children: ReactNode
  defaults?: FeedbackDefaults
}) {
  const d = defaults ?? FALLBACK
  const [toasts, dispatch] = useReducer(toastQueueReducer, [])
  const idRef = useRef(0)

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++idRef.current
    dispatch({ type: 'add', toast: { id, kind, message } })
    setTimeout(() => dispatch({ type: 'dismiss', id }), TOAST_TTL_MS)
  }, [])

  const ok = useCallback((m?: string) => push('ok', m || d.ok), [push, d.ok])
  const fail = useCallback((m?: string) => push('fail', m || d.fail), [push, d.fail])

  const reduced = prefersReducedMotion()

  return (
    <Ctx.Provider value={{ ok, fail }}>
      {children}
      <div className={styles.toastWrap}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toast} ${t.kind === 'ok' ? styles.ok : styles.fail} ${
              reduced ? styles.reduced : ''
            }`}
            role={t.kind === 'fail' ? 'alert' : 'status'}
            aria-live={t.kind === 'fail' ? 'assertive' : 'polite'}
          >
            <span className={styles.icon} aria-hidden="true">
              {t.kind === 'ok' ? '✓' : '✕'}
            </span>
            <span className={styles.msg}>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
