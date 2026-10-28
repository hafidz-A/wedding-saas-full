'use client'

import React, { useEffect } from 'react'
import { TemporaryErrorView } from '@/components/ui/TemporaryErrorView'

/** Every other page: a retry notice instead of Next's bare error screen. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[route error]', error.digest ?? '')
  }, [error])
  return <TemporaryErrorView onRetry={reset} />
}
