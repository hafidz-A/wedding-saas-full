'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Lang } from '@/lib/i18n/config'
import type { LegalDocType } from '@/lib/legal/defaults'

type FetchState =
  | { status: 'loading' }
  | { status: 'ok'; html: string }
  | { status: 'error' }

/**
 * Client-side fetch + render for a legal document, used inside LegalModal
 * on /signup. Backed by GET /api/legal/[doc] so the consent-modal copy can
 * never drift from the published /terms, /privacy, /refund pages (it is the
 * same getLegalDoc() source, DB override or committed default).
 *
 * Content only — no chrome. Renders inside the modal's own `.prose`
 * container, same as the retired *Content.tsx components it replaces.
 * A failed fetch never leaves a blank modal: it shows a short message and a
 * link to the full standalone page instead of throwing.
 */
export default function LegalDocBody({ doc, lang }: { doc: LegalDocType; lang: Lang }) {
  const [state, setState] = useState<FetchState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    fetch(`/api/legal/${doc}?lang=${lang}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: { html?: string }) => {
        if (cancelled) return
        if (typeof data.html !== 'string' || !data.html) throw new Error('Empty response')
        setState({ status: 'ok', html: data.html })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [doc, lang])

  if (state.status === 'loading') {
    return <p>{lang === 'en' ? 'Loading the document…' : 'Memuat dokumen…'}</p>
  }

  if (state.status === 'error') {
    return (
      <p>
        {lang === 'en'
          ? 'The document could not be loaded right now. Read the full version at '
          : 'Dokumen gagal dimuat saat ini. Baca versi lengkapnya di '}
        <Link href={`/${doc}`} target="_blank" rel="noopener noreferrer">
          fincards.land/{doc}
        </Link>
        .
      </p>
    )
  }

  return <div dangerouslySetInnerHTML={{ __html: state.html }} />
}
