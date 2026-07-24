'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { useEscapeToClose } from '@/components/ui/useEscapeToClose'
import { useOverlayLock } from '@/hooks/useOverlayLock'
import styles from './LivePreviewDrawer.module.css'

/** Only the accent is themed here — the surrounding chrome is fixed dark. */
interface Palette {
  accent: string
}

/**
 * Opens the REAL demo invitation over the landing page, so a visitor never has
 * to leave the funnel to answer "is this actually beautiful?".
 *
 * It is a genuine <iframe> of the live route (`?embed=1`), not a mockup: the
 * invitation is a pinned, GSAP/Lenis-driven cinematic page, so it needs its own
 * document and viewport to scroll correctly. `embed=1` is also the recursion
 * guard on the invitation page — without it a phone UA would bounce into
 * PhoneFrameView and we would nest a frame inside a frame.
 *
 * Portalled to <body> deliberately: `VibeExploration` is pinned and transformed
 * by ScrollTrigger on desktop, and a `position: fixed` child of a transformed
 * ancestor is positioned against that ancestor instead of the viewport — the
 * overlay would be dragged along with the pin.
 *
 * The iframe only exists while this component is mounted, so closing the drawer
 * tears down the demo's animation loops (Solary boots three.js) instead of
 * leaving them running behind the landing page.
 */
export function LivePreviewDrawer({
  src,
  href,
  templateLabel,
  palette,
  themePayload,
  closeLabel,
  newTabLabel,
  loadingLabel,
  onClose,
}: {
  src: string
  href: string
  templateLabel: string
  palette: Palette
  /** Theme state to push into the frame — `{ theme }` for Lovebirds,
   *  `{ palette }` for Solary. Shapes are set by each template's embed bridge. */
  themePayload: Record<string, string>
  closeLabel: string
  newTabLabel: string
  loadingLabel: string
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)

  const payloadRef = useRef(themePayload)
  payloadRef.current = themePayload
  const payloadKey = JSON.stringify(themePayload)

  /**
   * Carry the palette the visitor chose in the explorer into the invitation, so
   * clicking through on "Blossom Velvet" opens a Blossom Velvet invitation
   * rather than the template default.
   *
   * Handshake (defined by each template's embed bridge): the framed page posts
   * `ready` once it mounts, and we answer with the theme. Waiting for `ready`
   * rather than firing blind is what makes this reliable — a message sent
   * before the bridge has attached its listener is simply lost.
   */
  useEffect(() => {
    const origin = window.location.origin
    const post = () =>
      iframeRef.current?.contentWindow?.postMessage(
        { source: 'fincards-preview', kind: 'theme', payload: payloadRef.current },
        origin,
      )
    post()
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== origin) return
      if (e.data?.source === 'fincards-preview' && e.data?.kind === 'ready') post()
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [payloadKey])

  useEscapeToClose(onClose)
  useOverlayLock(panelRef)

  if (typeof document === 'undefined') return null

  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const node = (
    <motion.div
      className={styles.overlay}
      onClick={onClose}
      data-lenis-prevent
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`${templateLabel} — ${loadingLabel}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? false : { opacity: 0, y: 18, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <header className={styles.header}>
          <span className={styles.label}>
            <span className={styles.dot} style={{ background: palette.accent }} aria-hidden="true" />
            {templateLabel}
          </span>

          <span className={styles.tools}>
            {/* Escape hatch: some people still want a real tab (bookmark, share,
                browser zoom), and it is the fallback if the frame fails to load. */}
            <a
              className={styles.newTab}
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              {newTabLabel}
              <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                <path
                  d="M6 18 18 6M9 6h9v9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label={closeLabel}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        </header>

        <div className={styles.screen}>
          {!loaded && (
            <div className={styles.loading}>
              <span className={styles.spinner} style={{ borderTopColor: palette.accent }} aria-hidden="true" />
              {loadingLabel}
            </div>
          )}
          <iframe
            ref={iframeRef}
            className={styles.frame}
            src={src}
            title={templateLabel}
            onLoad={(e) => {
              setLoaded(true)
              // Belt and braces: if `ready` fired before this effect's listener
              // was attached, this second push still lands the palette.
              e.currentTarget.contentWindow?.postMessage(
                { source: 'fincards-preview', kind: 'theme', payload: payloadRef.current },
                window.location.origin,
              )
            }}
            data-loaded={loaded ? '' : undefined}
          />
        </div>
      </motion.div>
    </motion.div>
  )

  return createPortal(node, document.body)
}

export default LivePreviewDrawer
