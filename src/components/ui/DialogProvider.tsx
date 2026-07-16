'use client'

import React, { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { useEscapeToClose } from './useEscapeToClose'
import ui from './controls.module.css'
import styles from './DialogProvider.module.css'

export interface DialogField {
  name: string
  label: string
  type?: 'text' | 'number' | 'textarea' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
  required?: boolean
  defaultValue?: string
  help?: string
  /** If set, the value must equal this exact string to submit (type-to-confirm). */
  mustEqual?: string
}

interface ConfirmOpts { title?: string; message?: string; confirmLabel?: string; cancelLabel?: string; tone?: 'default' | 'danger' }
interface AlertOpts { title?: string; message?: string; okLabel?: string; tone?: 'default' | 'danger' }
interface FormOpts { title?: string; message?: string; fields: DialogField[]; submitLabel?: string; cancelLabel?: string; tone?: 'default' | 'danger' }

type State =
  | { kind: 'confirm'; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: 'alert'; opts: AlertOpts; resolve: (v: boolean) => void }
  | { kind: 'form'; opts: FormOpts; values: Record<string, string>; resolve: (v: Record<string, string> | null) => void }

interface Ctx {
  confirm: (o: ConfirmOpts) => Promise<boolean>
  alert: (o: AlertOpts) => Promise<void>
  form: (o: FormOpts) => Promise<Record<string, string> | null>
}
const DialogCtx = createContext<Ctx | null>(null)

function useCtx(): Ctx {
  const c = useContext(DialogCtx)
  if (!c) throw new Error('useConfirm/useAlert/useForm must be used inside <DialogProvider>')
  return c
}
export const useConfirm = () => useCtx().confirm
export const useAlert = () => useCtx().alert
export const useForm = () => useCtx().form

export interface Labels { confirm: string; cancel: string; ok: string; submit: string }
const DEFAULT_LABELS: Labels = { confirm: 'Ya', cancel: 'Batal', ok: 'OK', submit: 'Simpan' }

/**
 * ONE promise-based confirm/alert/form dialog system for the whole app
 * (unifies the old dashboard DialogProvider and AdminDialogProvider).
 * Escape or scrim-click cancels. Styled with tokens via CSS Module so every
 * button keeps the shared interaction-state matrix.
 */
export function DialogProvider({ children, labels }: { children: ReactNode; labels?: Partial<Labels> }) {
  const L = { ...DEFAULT_LABELS, ...labels }
  const [state, setState] = useState<State | null>(null)

  const confirm = useCallback(
    (opts: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ kind: 'confirm', opts, resolve })),
    [],
  )
  const alert = useCallback(
    (opts: AlertOpts) => new Promise<void>((resolve) => setState({ kind: 'alert', opts, resolve: () => resolve() })),
    [],
  )
  const form = useCallback(
    (opts: FormOpts) =>
      new Promise<Record<string, string> | null>((resolve) => {
        const values: Record<string, string> = {}
        for (const f of opts.fields) values[f.name] = f.defaultValue ?? ''
        setState({ kind: 'form', opts, values, resolve })
      }),
    [],
  )

  function settle(result: boolean | Record<string, string> | null) {
    if (!state) return
    if (state.kind === 'form') state.resolve(result as Record<string, string> | null)
    else state.resolve(result as boolean)
    setState(null)
  }

  useEscapeToClose(() => settle(state?.kind === 'form' ? null : false), state !== null)

  if (!state) return <DialogCtx.Provider value={{ confirm, alert, form }}>{children}</DialogCtx.Provider>

  const tone = (state.opts as ConfirmOpts).tone
  const isForm = state.kind === 'form'
  const isConfirm = state.kind === 'confirm'

  const formValid =
    !isForm ||
    state.opts.fields.every((f) => {
      const v = state.values[f.name] ?? ''
      if (f.mustEqual != null) return v === f.mustEqual
      if (f.required) return v.trim().length > 0
      return true
    })

  return (
    <DialogCtx.Provider value={{ confirm, alert, form }}>
      {children}
      <div
        className={styles.scrim}
        role="dialog"
        aria-modal="true"
        aria-label={state.opts.title || state.opts.message || 'Dialog'}
        onClick={() => settle(isForm ? null : false)}
      >
        <div className={styles.card} onClick={(e) => e.stopPropagation()}>
          {state.opts.title && <h2 className={styles.title}>{state.opts.title}</h2>}
          {state.opts.message && <p className={styles.message}>{state.opts.message}</p>}

          {isForm && (
            <div className={styles.fields}>
              {state.opts.fields.map((f, idx) => {
                const v = state.values[f.name] ?? ''
                const set = (nv: string) =>
                  setState((s) => (s && s.kind === 'form' ? { ...s, values: { ...s.values, [f.name]: nv } } : s))
                return (
                  <label key={f.name} style={{ display: 'grid', gap: 4 }}>
                    <span className={styles.fieldLabel}>
                      {f.label}
                      {f.required && ' *'}
                    </span>
                    {f.type === 'textarea' ? (
                      <textarea
                        className={`${ui.input} ${styles.textarea}`}
                        value={v}
                        placeholder={f.placeholder}
                        onChange={(e) => set(e.target.value)}
                        rows={3}
                      />
                    ) : f.type === 'select' ? (
                      <select className={ui.input} value={v} onChange={(e) => set(e.target.value)}>
                        {(f.options ?? []).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={ui.input}
                        type={f.type === 'number' ? 'number' : 'text'}
                        value={v}
                        placeholder={f.placeholder}
                        onChange={(e) => set(e.target.value)}
                        autoFocus={idx === 0}
                      />
                    )}
                    {f.help && <span className={styles.help}>{f.help}</span>}
                  </label>
                )
              })}
            </div>
          )}

          <div className={styles.actions}>
            {(isForm || isConfirm) && (
              <Button size="sm" variant="ghost" onClick={() => settle(isForm ? null : false)}>
                {(state.opts as ConfirmOpts).cancelLabel || L.cancel}
              </Button>
            )}
            <Button
              size="sm"
              variant={tone === 'danger' ? 'danger' : 'primary'}
              disabled={isForm && !formValid}
              autoFocus={!isForm}
              onClick={() => (isForm ? settle({ ...state.values }) : settle(true))}
            >
              {isForm
                ? (state.opts as FormOpts).submitLabel || L.submit
                : isConfirm
                  ? (state.opts as ConfirmOpts).confirmLabel || L.confirm
                  : (state.opts as AlertOpts).okLabel || L.ok}
            </Button>
          </div>
        </div>
      </div>
    </DialogCtx.Provider>
  )
}
