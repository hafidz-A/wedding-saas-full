// Pure, testable core for the dashboard action-feedback system.
// The React provider (FeedbackProvider.tsx) wires these to the toast DOM.

export type ToastKind = 'ok' | 'fail'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

export type ToastAction = { type: 'add'; toast: Toast } | { type: 'dismiss'; id: number }

/** Most simultaneous toasts shown — older ones drop off so the screen stays calm. */
export const TOAST_CAP = 3

/** How long each toast stays before auto-dismiss (ms). */
export const TOAST_TTL_MS = 2000

export function toastQueueReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'add': {
      const next = [...state, action.toast]
      return next.length > TOAST_CAP ? next.slice(next.length - TOAST_CAP) : next
    }
    case 'dismiss':
      return state.filter((t) => t.id !== action.id)
    default:
      return state
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
