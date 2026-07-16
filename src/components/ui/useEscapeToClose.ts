'use client'

import { useEffect } from 'react'

/**
 * Close-on-Escape for modals/popovers. Listens on window so it works no
 * matter where focus sits inside the dialog. Pass `enabled=false` while the
 * modal is closed (e.g. providers that render conditionally on state).
 */
export function useEscapeToClose(onClose: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, enabled])
}
