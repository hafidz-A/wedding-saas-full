'use client'

import React, { useEffect } from 'react'
import { TemporaryErrorView } from '@/components/ui/TemporaryErrorView'

/** Invitation, dashboard and check-in pages: an unexpected failure (e.g. the
 *  database is briefly unreachable) shows a retry notice, not a blank page. */
export default function InvitationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[invitation route error]', error.digest ?? '')
  }, [error])
  return <TemporaryErrorView onRetry={reset} />
}
