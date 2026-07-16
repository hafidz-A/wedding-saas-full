'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import styles from './DialogProvider.module.css'
import { useEscapeToClose } from '@/components/ui/useEscapeToClose'

interface ConfirmOpts {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}
interface AlertOpts {
  title?: string
  message: string
  okLabel?: string
}

type DialogState =
  | { kind: 'confirm'; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: 'alert'; opts: AlertOpts; resolve: (v: boolean) => void }

interface Ctx {
  confirm: (o: ConfirmOpts) => Promise<boolean>
  alert: (o: AlertOpts) => Promise<void>
}
const DialogCtx = createContext<Ctx | null>(null)

function useDialog(): Ctx {
  const c = useContext(DialogCtx)
  if (!c) throw new Error('useConfirm/useAlert must be used inside <DialogProvider>')
  return c
}
export function useConfirm() {
  return useDialog().confirm
}
export function useAlert() {
  return useDialog().alert
}

interface Labels {
  confirm: string
  cancel: string
  ok: string
}

/**
 * Promise-based themed confirm/alert, replacing native browser dialogs.
 * Mounted once at the dashboard root; `useConfirm()` / `useAlert()` return
 * promises so they drop into the old synchronous `confirm()`/`alert()` call
 * sites (made async). Styled with the landing-page tokens.
 */
export function DialogProvider({ children, labels }: { children: ReactNode; labels: Labels }) {
  const [state, setState] = useState<DialogState | null>(null)

  const confirm = useCallback(
    (opts: ConfirmOpts) =>
      new Promise<boolean>((resolve) => setState({ kind: 'confirm', opts, resolve })),
    [],
  )
  const alert = useCallback(
    (opts: AlertOpts) =>
      new Promise<void>((resolve) => setState({ kind: 'alert', opts, resolve: () => resolve() })),
    [],
  )
  useEscapeToClose(() => close(false), state !== null)

  function close(result: boolean) {
    if (state) state.resolve(result)
    setState(null)
  }

  const isConfirm = state?.kind === 'confirm'

  return (
    <DialogCtx.Provider value={{ confirm, alert }}>
      {children}
      {state && (
        <div className={styles.scrim} role="dialog" aria-modal="true" onClick={() => close(false)}>
          <div className={styles.card} onClick={(e) => e.stopPropagation()}>
            {state.opts.title && <h2 className={styles.title}>{state.opts.title}</h2>}
            <p className={styles.message}>{state.opts.message}</p>
            <div className={styles.actions}>
              {isConfirm && (
                <button className={styles.cancel} onClick={() => close(false)}>
                  {(state.opts as ConfirmOpts).cancelLabel || labels.cancel}
                </button>
              )}
              <button
                className={
                  isConfirm && (state.opts as ConfirmOpts).tone === 'danger'
                    ? styles.danger
                    : styles.primary
                }
                onClick={() => close(true)}
                autoFocus
              >
                {isConfirm
                  ? (state.opts as ConfirmOpts).confirmLabel || labels.confirm
                  : (state.opts as AlertOpts).okLabel || labels.ok}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogCtx.Provider>
  )
}
