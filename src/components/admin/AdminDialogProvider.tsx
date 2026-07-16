'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useEscapeToClose } from '@/components/ui/useEscapeToClose'

/**
 * In-app dialogs for the /admin console — replaces native browser
 * prompt()/confirm()/alert() everywhere in admin with themed, promise-based
 * dialogs (a plain confirm/alert, plus a multi-field FORM for reasons, amounts,
 * type-to-confirm, refund destinations, etc.). Mounted once in admin/layout.tsx.
 */

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
const AdminDialogCtx = createContext<Ctx | null>(null)

function useCtx(): Ctx {
  const c = useContext(AdminDialogCtx)
  if (!c) throw new Error('useAdmin{Confirm,Alert,Form} must be used inside <AdminDialogProvider>')
  return c
}
export const useAdminConfirm = () => useCtx().confirm
export const useAdminAlert = () => useCtx().alert
export const useAdminForm = () => useCtx().form

export function AdminDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null)

  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ kind: 'confirm', opts, resolve })), [])
  const alert = useCallback((opts: AlertOpts) => new Promise<void>((resolve) => setState({ kind: 'alert', opts, resolve: () => resolve() })), [])
  const form = useCallback((opts: FormOpts) => new Promise<Record<string, string> | null>((resolve) => {
    const values: Record<string, string> = {}
    for (const f of opts.fields) values[f.name] = f.defaultValue ?? ''
    setState({ kind: 'form', opts, values, resolve })
  }), [])
  useEscapeToClose(() => settle(state?.kind === 'form' ? null : false), state !== null)

  function settle(result: boolean | Record<string, string> | null) {
    if (!state) return
    if (state.kind === 'form') (state.resolve as (v: Record<string, string> | null) => void)(result as any)
    else (state.resolve as (v: boolean) => void)(result as boolean)
    setState(null)
  }

  if (!state) {
    return <AdminDialogCtx.Provider value={{ confirm, alert, form }}>{children}</AdminDialogCtx.Provider>
  }

  const tone = (state.opts as any).tone as 'default' | 'danger' | undefined
  const isForm = state.kind === 'form'
  const isConfirm = state.kind === 'confirm'

  // Basic required / type-to-confirm validation for the form.
  const formValid = !isForm || (state as any).opts.fields.every((f: DialogField) => {
    const v = (state as any).values[f.name] ?? ''
    if (f.mustEqual != null) return v === f.mustEqual
    if (f.required) return v.trim().length > 0
    return true
  })

  return (
    <AdminDialogCtx.Provider value={{ confirm, alert, form }}>
      {children}
      <div style={scrim} role="dialog" aria-modal="true" onClick={() => settle(isForm ? null : false)}>
        <div style={card} onClick={(e) => e.stopPropagation()}>
          {state.opts.title && <h2 style={titleStyle}>{state.opts.title}</h2>}
          {state.opts.message && <p style={msgStyle}>{state.opts.message}</p>}

          {isForm && (
            <div style={{ display: 'grid', gap: 12, margin: '4px 0 8px' }}>
              {(state as any).opts.fields.map((f: DialogField) => {
                const v = (state as any).values[f.name] ?? ''
                const set = (nv: string) => setState((s) => (s && s.kind === 'form' ? { ...s, values: { ...s.values, [f.name]: nv } } : s))
                return (
                  <label key={f.name} style={{ display: 'grid', gap: 4 }}>
                    <span style={labelStyle}>{f.label}{f.required && ' *'}</span>
                    {f.type === 'textarea' ? (
                      <textarea value={v} placeholder={f.placeholder} onChange={(e) => set(e.target.value)} rows={3} style={{ ...input, height: 'auto', padding: 8, resize: 'vertical' }} />
                    ) : f.type === 'select' ? (
                      <select value={v} onChange={(e) => set(e.target.value)} style={input}>
                        {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <input type={f.type === 'number' ? 'number' : 'text'} value={v} placeholder={f.placeholder} onChange={(e) => set(e.target.value)} style={input} autoFocus />
                    )}
                    {f.help && <span style={helpStyle}>{f.help}</span>}
                  </label>
                )
              })}
            </div>
          )}

          <div style={actions}>
            {(isForm || isConfirm) && (
              <button type="button" style={ghostBtn} onClick={() => settle(isForm ? null : false)}>
                {(state.opts as any).cancelLabel || 'Batal'}
              </button>
            )}
            <button
              type="button"
              disabled={isForm && !formValid}
              style={{ ...(tone === 'danger' ? dangerBtn : primaryBtn), opacity: isForm && !formValid ? 0.5 : 1 }}
              onClick={() => {
                if (isForm) settle({ ...(state as any).values }) // button is disabled unless valid
                else settle(true)
              }}
              autoFocus={!isForm}
            >
              {isForm ? ((state.opts as FormOpts).submitLabel || 'Simpan')
                : isConfirm ? ((state.opts as ConfirmOpts).confirmLabel || 'Ya')
                : ((state.opts as AlertOpts).okLabel || 'OK')}
            </button>
          </div>
        </div>
      </div>
    </AdminDialogCtx.Provider>
  )
}

const scrim: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000 }
const card: React.CSSProperties = { width: '100%', maxWidth: 440, maxHeight: 'min(90vh, 90dvh)', overflowY: 'auto', background: 'var(--surface-raised, #fff)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', padding: 20 }
const titleStyle: React.CSSProperties = { fontSize: 17, margin: '0 0 6px' }
const msgStyle: React.CSSProperties = { fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 10px' }
const labelStyle: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }
const helpStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-secondary)' }
const input: React.CSSProperties = { height: 40, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--surface-warm, #fff)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }
const actions: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }
const primaryBtn: React.CSSProperties = { height: 40, padding: '0 18px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const dangerBtn: React.CSSProperties = { ...primaryBtn, background: 'var(--status-error)' }
const ghostBtn: React.CSSProperties = { height: 40, padding: '0 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }
