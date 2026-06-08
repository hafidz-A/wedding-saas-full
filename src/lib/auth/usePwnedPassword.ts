'use client'

import { useEffect, useRef, useState } from 'react'
import { pwnedPasswordCount } from './pwnedPassword'
import { isPasswordValid } from './passwordPolicy'

/**
 * Debounced live "has this password leaked?" check for password fields.
 *
 * Only queries HIBP once the password already passes the LOCAL policy, so we
 * don't spam the API on every keystroke of a half-typed password. A monotonic
 * sequence guard discards stale responses when the user keeps typing.
 *
 * Returns { pwned, checking } for live UI feedback. The submit handler should
 * still run its own authoritative `pwnedPasswordCount(password)` await in case
 * the user submits before the debounce settles.
 */
export function usePwnedPassword(
  password: string,
  delayMs = 600,
): { pwned: boolean; checking: boolean } {
  const [pwned, setPwned] = useState(false)
  const [checking, setChecking] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    setPwned(false)
    if (!isPasswordValid(password)) {
      setChecking(false)
      return
    }
    setChecking(true)
    const mySeq = ++seq.current
    const timer = setTimeout(async () => {
      const count = await pwnedPasswordCount(password)
      if (mySeq !== seq.current) return // superseded by a newer keystroke
      setPwned(count > 0)
      setChecking(false)
    }, delayMs)
    return () => clearTimeout(timer)
  }, [password, delayMs])

  return { pwned, checking }
}
