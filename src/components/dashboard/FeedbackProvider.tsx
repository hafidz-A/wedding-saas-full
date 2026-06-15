'use client'

import { createContext, useCallback, useContext, useReducer, useRef, type ReactNode } from 'react'
import {
  toastQueueReducer,
  prefersFinePointer,
  prefersReducedMotion,
  TOAST_TTL_MS,
  CURSOR_FLASH_MS,
  FEEDBACK_GLOBAL_CSS,
  type ToastKind,
} from './feedback'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import styles from './FeedbackProvider.module.css'

export interface FeedbackApi {
  /** Success pill (✓) + desktop cursor flash. Pass a context message. */
  ok: (message?: string) => void
  /** Failure pill (✗) + desktop cursor flash. Pass a context message. */
  fail: (message?: string) => void
}

const Ctx = createContext<FeedbackApi | null>(null)

export function useFeedback(): FeedbackApi {
  const c = useContext(Ctx)
  if (!c) throw new Error('useFeedback must be used inside <FeedbackProvider>')
  return c
}

/**
 * Mounted once at the dashboard root (inside DashboardI18nProvider so it can read
 * default copy). Renders a top-center toast stack, flashes a ✓/✗ cursor on desktop,
 * and gives every dashboard button a subtle press scale. Covers both templates +
 * the editor because the whole dashboard tree renders as its children.
 */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const fb = useDashboardDict().feedback
  const [toasts, dispatch] = useReducer(toastQueueReducer, [])
  const idRef = useRef(0)
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flashCursor = useCallback((kind: ToastKind) => {
    if (typeof document === 'undefined' || !prefersFinePointer()) return
    const el = document.documentElement
    el.classList.remove('fbCursorOk', 'fbCursorFail')
    el.classList.add(kind === 'ok' ? 'fbCursorOk' : 'fbCursorFail')
    if (cursorTimer.current) clearTimeout(cursorTimer.current)
    cursorTimer.current = setTimeout(() => {
      el.classList.remove('fbCursorOk', 'fbCursorFail')
    }, CURSOR_FLASH_MS)
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++idRef.current
      dispatch({ type: 'add', toast: { id, kind, message } })
      setTimeout(() => dispatch({ type: 'dismiss', id }), TOAST_TTL_MS)
      flashCursor(kind)
    },
    [flashCursor],
  )

  const ok = useCallback((m?: string) => push('ok', m || fb.ok), [push, fb.ok])
  const fail = useCallback((m?: string) => push('fail', m || fb.fail), [push, fb.fail])

  const reduced = prefersReducedMotion()

  return (
    <Ctx.Provider value={{ ok, fail }}>
      <style dangerouslySetInnerHTML={{ __html: FEEDBACK_GLOBAL_CSS }} />
      <div className="fb-root">{children}</div>
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
