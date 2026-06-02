'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import EditorRoot from '@/editor/EditorRoot'
import RsvpsTab, { type RsvpRow } from './RsvpsTab'
import GiftsTab, { type GiftRow } from './GiftsTab'
import MusicTab from './MusicTab'
import OrnamentTab from './OrnamentTab'
import PaletteTab from './PaletteTab'
import TutorialTab from './TutorialTab'
import GuestsTab from './GuestsTab'
import GuestbookTab from './GuestbookTab'
import GuestbookLocked from './GuestbookLocked'
import { type GuestRow } from './guests/types'
import { type AttendanceRow } from './guestbook/types'
import { DashboardI18nProvider } from './DashboardI18nProvider'
import { DialogProvider } from '@/components/dashboard/DialogProvider'
import { LangToggle } from '@/components/site/LangToggle'
import { startCheckout } from '@/app/onboarding/actions'
import { activePeriodStatus } from '@/lib/payments/active-period'
import type { Dict, Lang } from '@/lib/i18n'
import styles from './dashboard.module.css'

/** Client-side dashboard: tab switcher for editor, RSVPs, gifts, guests, music, background. */
export default function DashboardClient({
  slug,
  template,
  invitation,
  rsvps,
  gifts,
  guests = [],
  attendances = [],
  dict,
  activePeriod,
  lang,
  upgrade = null,
}: {
  slug: string
  template: string
  invitation: any
  rsvps: RsvpRow[]
  gifts: GiftRow[]
  guests?: GuestRow[]
  attendances?: AttendanceRow[]
  dict: Dict['dashboard']
  activePeriod: Dict['common']['activePeriod']
  lang: Lang
  upgrade?: { amountIDR: number } | null
}) {
  const [payPending, startPay] = useTransition()
  const period = activePeriodStatus(invitation, Date.now())
  const periodLabel =
    period.status === 'lifetime'
      ? activePeriod.lifetime
      : period.status === 'expired'
      ? activePeriod.expired
      : period.status === 'active' && period.expiresAt
      ? `${activePeriod.activeUntilPrefix} ${new Date(period.expiresAt).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : activePeriod.draft

  function onPay() {
    startPay(async () => {
      const res = await startCheckout(invitation.id)
      if (res.ok && res.invoiceUrl) window.location.href = res.invoiceUrl
    })
  }

  type TabKey =
    | 'rsvps' | 'gifts' | 'guests' | 'guestbook'
    | 'editor' | 'music' | 'ornament' | 'palette' | 'tutorial'

  const [tab, setTab] = useState<TabKey>('rsvps')

  // Buku Tamu (attendance ledger) is a Premium feature. The tab is always shown;
  // non-Premium plans see a locked card with a "pay the difference" upgrade CTA.
  const hasGuestbook = invitation.plan === 'premium'

  const tabKeys: TabKey[] = (() => {
    const keys: TabKey[] = ['rsvps', 'gifts', 'guests']
    keys.push('guestbook')
    keys.push('editor')
    keys.push('palette')
    keys.push('music')
    // The Background (Latar) tab swaps the invitation's background GIF — only
    // meaningful for lovebirds. Solary renders its own Three.js galactic scene,
    // so the tab is hidden there.
    if (template !== 'solary') keys.push('ornament')
    // Tutorial tab — both templates have their own categorized guide + screenshots.
    keys.push('tutorial')
    return keys
  })()

  return (
    <DashboardI18nProvider dict={dict} lang={lang}>
    <DialogProvider labels={dict.chrome.dialog}>
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
          <LangToggle lang={lang} label={dict.chrome.language} />
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
          <span
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 11,
              letterSpacing: '0.08em',
              background: 'rgba(42,33,24,0.06)',
              color: '#5C4A3A',
            }}
          >
            {periodLabel}
          </span>
          <Link
            href="/"
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              background: 'transparent',
              color: 'rgba(42,33,24,0.7)',
              border: '1px solid rgba(42,33,24,0.18)',
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            {dict.chrome.homepage}
          </Link>
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

      {!invitation.is_paid && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            margin: '0 clamp(16px, 4vw, 40px) 16px',
            padding: '14px 18px',
            borderRadius: 14,
            background: 'rgba(232,85,62,0.1)',
            border: '1px solid rgba(232,85,62,0.3)',
          }}
        >
          <span style={{ color: '#B23A28', fontSize: 14 }}>{activePeriod.unpaidBanner}</span>
          <button
            type="button"
            onClick={onPay}
            disabled={payPending}
            style={{
              padding: '10px 20px',
              borderRadius: 999,
              background: '#E8553E',
              color: '#fff',
              border: 0,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {payPending ? activePeriod.processing : activePeriod.payNow}
          </button>
        </div>
      )}

      <nav className={styles.nav}>
        {tabKeys.map((t) => (
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
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
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

            {tab === 'guestbook' &&
              (hasGuestbook ? (
                <GuestbookTab slug={slug} attendances={attendances} />
              ) : (
                <GuestbookLocked invitationId={invitation.id} amountIDR={upgrade?.amountIDR ?? null} />
              ))}

            {tab === 'music' && (
              <MusicTab slug={slug} initial={invitation.config?.music ?? null} />
            )}

            {tab === 'ornament' && (
              <OrnamentTab slug={slug} initial={invitation.config?.theme?.ornamentType} />
            )}

            {tab === 'palette' && (
              <PaletteTab slug={slug} template={template} initial={invitation.config?.theme?.defaultPalette} />
            )}

            {tab === 'tutorial' && (
              <TutorialTab isPremium={invitation.plan === 'premium'} template={template} />
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
    </DialogProvider>
    </DashboardI18nProvider>
  )
}

