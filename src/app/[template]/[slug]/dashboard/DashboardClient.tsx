'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import RsvpsTab, { type RsvpRow } from './RsvpsTab'
import GiftsTab, { type GiftRow } from './GiftsTab'
import EditorWorkspace, { type EditorSubTab } from './EditorWorkspace'
import TutorialTab from './TutorialTab'
import GuestsTab from './GuestsTab'
import GuestbookTab from './GuestbookTab'
import GuestbookLocked from './GuestbookLocked'
import RefundRequestButton from './RefundRequestButton'
import { type GuestRow } from './guests/types'
import { type AttendanceRow } from './guestbook/types'
import { DashboardI18nProvider } from './DashboardI18nProvider'
import { DialogProvider } from '@/components/dashboard/DialogProvider'
import { FeedbackProvider } from '@/components/dashboard/FeedbackProvider'
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
  quota,
  hasPendingRefund = false,
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
  quota: { used: number; effective: number; invitationId: string }
  hasPendingRefund?: boolean
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

  // Editing surfaces (section editor, palette, music, meta, ornament) are now
  // consolidated UNDER one "Editor" top-tab as sub-tabs — so every editable
  // thing lives in one place. The remaining top tabs are data views + tutorial.
  type TabKey = 'rsvps' | 'gifts' | 'guests' | 'guestbook' | 'editor' | 'tutorial'

  const [tab, setTab] = useState<TabKey>('rsvps')
  const [editorSub, setEditorSub] = useState<EditorSubTab>('section')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Tutorial deep-links can target an editor sub-tab (e.g. 'palette') — route
  // those to the Editor top-tab with the right sub-tab selected.
  const EDITOR_SUBS = ['section', 'palette', 'music', 'meta', 'ornament']
  function openTab(k: string) {
    if (k === 'editor' || EDITOR_SUBS.includes(k)) {
      setTab('editor')
      if (EDITOR_SUBS.includes(k)) setEditorSub(k as EditorSubTab)
    } else {
      setTab(k as TabKey)
    }
  }

  // Buku Tamu (attendance ledger) is a Premium feature. The tab is always shown;
  // non-Premium plans see a locked card with a "pay the difference" upgrade CTA.
  const hasGuestbook = invitation.plan === 'premium'

  const tabKeys: TabKey[] = ['rsvps', 'gifts', 'guests', 'guestbook', 'editor', 'tutorial']

  const actionItems = (
    <>
      <LangToggle lang={lang} label={dict.chrome.language} />
      <span
        style={{
          height: 36,
          padding: '0 16px',
          borderRadius: 'var(--radius-pill)',
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          background: invitation.is_published ? 'var(--color-emerald)' : 'var(--border-strong)',
          color: invitation.is_published ? '#fff' : 'var(--text-primary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          lineHeight: 1,
        }}
      >
        {invitation.is_published ? dict.chrome.published : dict.chrome.draft}
      </span>
      <span
        style={{
          height: 36,
          padding: '0 16px',
          borderRadius: 'var(--radius-pill)',
          fontSize: 11,
          letterSpacing: '0.08em',
          background: 'var(--border-subtle)',
          color: 'var(--text-secondary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          lineHeight: 1,
        }}
      >
        {periodLabel}
      </span>
      <Link href="/" className={styles.ghostBtn} onClick={() => setMobileMenuOpen(false)}>
        {dict.chrome.homepage}
      </Link>
      <Link
        href={`/${template}/${slug}`}
        target="_blank"
        className={styles.solidBtn}
        onClick={() => setMobileMenuOpen(false)}
      >
        {dict.chrome.viewLive}
      </Link>
      <form action="/api/auth/logout" method="post" style={{ display: 'inline' }}>
        <button
          type="submit"
          className={`${styles.ghostBtn} ${styles.ghostBtnSm}`}
          title={dict.chrome.logout}
          style={{ width: '100%' }}
        >
          {dict.chrome.logout}
        </button>
      </form>
    </>
  )

  return (
    <DashboardI18nProvider dict={dict} lang={lang}>
    <DialogProvider labels={dict.chrome.dialog}>
    <FeedbackProvider>
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--surface-warm)',
        fontFamily: 'var(--font-body, system-ui)',
        color: 'var(--text-primary)',
      }}
    >
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <p>{dict.chrome.eyebrow}</p>
          <h1>{slug}</h1>
        </div>
        <div className={styles.headerActions}>
          {actionItems}
        </div>
        <button
          type="button"
          className={styles.mobileMenuBtn}
          onClick={() => setMobileMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Landing page style top dropdown menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                className={styles.mobileDropdownOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                className={styles.mobileDropdownContent}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {actionItems}
              </motion.div>
            </>
          )}
        </AnimatePresence>
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
            borderRadius: 'var(--radius-md)',
            background: 'var(--interactive-primary-soft)',
            border: '1px solid rgba(232,85,62,0.3)',
          }}
        >
          <span style={{ color: 'var(--status-error-dark)', fontSize: 14 }}>{activePeriod.unpaidBanner}</span>
          <button
            type="button"
            onClick={onPay}
            disabled={payPending}
            className={styles.ctaBtn}
          >
            {payPending ? activePeriod.processing : activePeriod.payNow}
          </button>
        </div>
      )}

      {invitation.is_paid && invitation.paid_source !== 'comp' && (
        <RefundRequestButton invitationId={invitation.id} paidSource={invitation.paid_source || 'xendit'} hasPendingRefund={hasPendingRefund} />
      )}

      <nav className={styles.nav}>
        {tabKeys.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-current={tab === t ? 'page' : undefined}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
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
              <EditorWorkspace
                slug={slug}
                template={template}
                invitation={invitation}
                sub={editorSub}
                onSubChange={setEditorSub}
              />
            )}

            {tab === 'rsvps' && <RsvpsTab rsvps={rsvps} />}

            {tab === 'gifts' && <GiftsTab gifts={gifts} />}

            {tab === 'guests' && (
              <GuestsTab
                slug={slug}
                guests={guests}
                quota={quota}
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
                <GuestbookTab
                  slug={slug}
                  template={template}
                  attendances={attendances}
                  souvenirEnabled={(invitation.guestbook_souvenir_enabled as boolean) ?? false}
                />
              ) : (
                <GuestbookLocked invitationId={invitation.id} amountIDR={upgrade?.amountIDR ?? null} />
              ))}

            {tab === 'tutorial' && (
              <TutorialTab
                isPremium={invitation.plan === 'premium'}
                template={template}
                onOpenTab={(k) => openTab(k)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
    </FeedbackProvider>
    </DialogProvider>
    </DashboardI18nProvider>
  )
}

