'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import EditorRoot from '@/editor/EditorRoot'
import RsvpsTab, { type RsvpRow } from './RsvpsTab'
import GiftsTab, { type GiftRow } from './GiftsTab'
import MusicTab from './MusicTab'
import BackgroundTab from './BackgroundTab'
import NotesTab, { type NoteRow } from './NotesTab'
import GuestsTab from './GuestsTab'
import { type GuestRow } from './guests/types'
import { DashboardI18nProvider } from './DashboardI18nProvider'
import type { Dict } from '@/lib/i18n'
import styles from './dashboard.module.css'

/**
 * Force re-login on a hard refresh (F5 / Ctrl-R) — keeps the dashboard
 * locked when a couple's family member opens the same browser later.
 *
 * Uses Performance Navigation Timing to distinguish 'reload' from
 * 'navigate' / 'back_forward' / 'prerender', so only the genuine F5
 * triggers a logout. Supabase Auth's session is cleared via /api/auth/logout.
 */
function useRefreshLogoutGuard(template: string, slug: string) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('performance' in window)) return
    const entries = performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[]
    const navType = entries[0]?.type
    if (navType !== 'reload') return

    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Accept: 'application/json' },
    }).finally(() => {
      window.location.replace(`/${template}/${slug}/dashboard`)
    })
  }, [template, slug])
}

/**
 * Stub dashboard — shows the invitation status + counts and links to the
 * public view. The full block-based editor will replace this in the next
 * sprint (drag-reorder sections, image/GIF upload, live preview).
 *
 * For now it proves that auth works and the data flows from Supabase.
 */
export default function DashboardClient({
  slug,
  template,
  invitation,
  rsvps,
  gifts,
  notes = [],
  guests = [],
  dict,
}: {
  slug: string
  template: string
  invitation: any
  rsvps: RsvpRow[]
  gifts: GiftRow[]
  notes?: NoteRow[]
  guests?: GuestRow[]
  dict: Dict['dashboard']
}) {
  useRefreshLogoutGuard(template, slug)
  const [tab, setTab] = useState<
    'rsvps' | 'gifts' | 'guests' | 'editor' | 'music' | 'background' | 'notes'
  >('rsvps')

  return (
    <DashboardI18nProvider dict={dict}>
    <main
      style={{
        minHeight: '100vh',
        background: '#F5EFE3',
        fontFamily: 'var(--font-body, system-ui)',
        color: '#2A2118',
      }}
    >
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <p>{dict.chrome.eyebrow}</p>
          <h1>{slug}</h1>
        </div>
        <div className={styles.headerActions}>
          <span
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              background: invitation.is_published ? '#2D8C4E' : 'rgba(42,33,24,0.2)',
              color: invitation.is_published ? '#fff' : '#2A2118',
            }}
          >
            {invitation.is_published ? dict.chrome.published : dict.chrome.draft}
          </span>
          <Link
            href={`/${template}/${slug}`}
            target="_blank"
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              background: '#2A2118',
              color: '#F5EFE3',
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            {dict.chrome.viewLive}
          </Link>
          <form action="/api/auth/logout" method="post" style={{ display: 'inline' }}>
            <button
              type="submit"
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                background: 'transparent',
                color: 'rgba(42,33,24,0.6)',
                border: '1px solid rgba(42,33,24,0.18)',
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
              title={dict.chrome.logout}
            >
              {dict.chrome.logout}
            </button>
          </form>
        </div>
      </header>

      <nav className={styles.nav}>
        {(['rsvps', 'gifts', 'guests', 'notes', 'editor', 'music', 'background'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              color: tab === t ? '#2A2118' : 'rgba(42,33,24,0.55)',
              fontSize: 13,
              fontWeight: tab === t ? 600 : 400,
              letterSpacing: '0.04em',
              textTransform: 'capitalize',
              borderBottom: tab === t ? '2px solid #E8553E' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {dict.chrome.tabs[t]}
          </button>
        ))}
      </nav>

      <section className={styles.content}>
        {tab === 'editor' && (
          <EditorRoot
            slug={slug}
            template={template}
            initialConfig={invitation.config ?? { sections: [] }}
            initialIsPublished={!!invitation.is_published}
          />
        )}

        {tab === 'rsvps' && <RsvpsTab rsvps={rsvps} />}

        {tab === 'gifts' && <GiftsTab gifts={gifts} />}

        {tab === 'guests' && (
          <GuestsTab
            slug={slug}
            guests={guests}
            publicUrl={
              typeof window !== 'undefined'
                ? `${window.location.origin}/${template}/${slug}`
                : `/${template}/${slug}`
            }
            messageTemplate={invitation?.config?.inviteMessageTemplate}
          />
        )}

        {tab === 'music' && (
          <MusicTab slug={slug} initial={invitation.config?.music ?? null} />
        )}

        {tab === 'background' && (
          <BackgroundTab slug={slug} initial={invitation.config?.bgGif} />
        )}

        {tab === 'notes' && <NotesTab slug={slug} notes={notes} />}
      </section>
    </main>
    </DashboardI18nProvider>
  )
}

