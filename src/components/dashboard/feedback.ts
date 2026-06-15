// Pure, testable core for the dashboard action-feedback system.
// The React provider (FeedbackProvider.tsx) wires these to the DOM.

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

/** How long the desktop cursor shows the ✓/✗ glyph (ms). */
export const CURSOR_FLASH_MS = 700

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

/** True only on devices with a precise pointer (mouse) — gates the cursor swap. */
export function prefersFinePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(pointer: fine)').matches
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Global (non-scoped) CSS injected once by FeedbackProvider via a <style> tag:
//   - a subtle press scale on every dashboard button (scoped to .fb-root)
//   - the desktop ✓/✗ cursor flash (html-level class + descendant !important, which
//     a CSS module can't express). SVG cursors are inline data URIs, hotspot 14 14.
export const FEEDBACK_GLOBAL_CSS = `
.fb-root button { transition: transform 0.08s ease; }
.fb-root button:active:not(:disabled) { transform: scale(0.97); }
html.fbCursorOk, html.fbCursorOk * {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Ccircle cx='14' cy='14' r='12' fill='%232D8C4E'/%3E%3Cpath d='M8 14.5l4 4 8-8.5' fill='none' stroke='white' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 14 14, auto !important;
}
html.fbCursorFail, html.fbCursorFail * {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Ccircle cx='14' cy='14' r='12' fill='%23D14545'/%3E%3Cpath d='M9.5 9.5l9 9M18.5 9.5l-9 9' fill='none' stroke='white' stroke-width='2.6' stroke-linecap='round'/%3E%3C/svg%3E") 14 14, auto !important;
}
`
