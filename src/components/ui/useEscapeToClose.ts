'use client'

import { useEffect, useRef } from 'react'

/**
 * Module-level stack of every currently-enabled useEscapeToClose instance,
 * ordered by mount time (oldest first). Since a dialog always mounts AFTER
 * the modal/dialog that spawned it, mount order === visual stacking order —
 * exactly the semantics we want: Escape should only settle the TOPMOST layer.
 */
const stack: symbol[] = []

/**
 * Close-on-Escape for modals/popovers. Listens on window so it works no
 * matter where focus sits inside the dialog. Pass `enabled=false` while the
 * modal is closed (e.g. providers that render conditionally on state).
 *
 * Stack-aware: when multiple instances are enabled at once (e.g. a confirm()
 * dialog opened from inside another modal), a single Escape press only
 * closes the most-recently-mounted one instead of cascading through every
 * enabled layer and silently discarding whatever the layer underneath had.
 */
export function useEscapeToClose(onClose: () => void, enabled: boolean = true) {
  const id = useRef<symbol>()
  if (!id.current) id.current = Symbol('useEscapeToClose')

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!enabled) return
    const myId = id.current!
    stack.push(myId)
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (stack[stack.length - 1] !== myId) return
      onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      const idx = stack.indexOf(myId)
      if (idx !== -1) stack.splice(idx, 1)
    }
  }, [enabled])
}
