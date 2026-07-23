import Link from 'next/link'
import { Logo } from './Logo'
import { LangToggle } from './LangToggle'
import { BRAND_TAGLINE_PARTS, BRAND_INSTAGRAM_HANDLE, BRAND_INSTAGRAM_URL, BRAND_WHATSAPP_URL } from '@/lib/brand'
import type { Dict, Lang } from '@/lib/i18n'
import styles from './SiteFooter.module.css'

export function SiteFooter({ lang, t }: { lang: Lang; t: Dict['common'] }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Logo size="sm" />
          <p className={styles.tagline}>
            {BRAND_TAGLINE_PARTS.lead}
            <span className={styles.taglineAccent}>{BRAND_TAGLINE_PARTS.accent}</span>
            {BRAND_TAGLINE_PARTS.tail}
          </p>
        </div>
        <nav className={styles.links} aria-label="Footer">
          <Link href="/#vibe" className={styles.link}>{t.footer.templates}</Link>
          <Link href="/login" className={styles.link}>{t.footer.login}</Link>
          <Link href="/#vibe" className={styles.link}>{t.footer.signup}</Link>
          <Link href="/terms" className={styles.link}>{t.footer.terms}</Link>
          <Link href="/privacy" className={styles.link}>{t.footer.privacy}</Link>
          <Link href="/refund" className={styles.link}>{t.footer.refund}</Link>
        </nav>
        <div className={styles.social}>
          <a
            href={BRAND_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialLink}
            aria-label={`Instagram @${BRAND_INSTAGRAM_HANDLE}`}
          >
            <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.42.56.21.96.47 1.38.9.43.42.69.82.9 1.38.17.43.37 1.06.42 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.21.56-.47.96-.9 1.38-.42.43-.82.69-1.38.9-.43.17-1.06.37-2.23.42-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.17-.43-.37-1.06-.42-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.42-2.23.21-.56.47-.96.9-1.38.42-.43.82-.69 1.38-.9.43-.17 1.06-.37 2.23-.42C8.42 2.17 8.8 2.16 12 2.16zm0 1.98c-3.15 0-3.52.01-4.76.07-1.15.05-1.77.24-2.19.41-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.17.42-.36 1.04-.41 2.19-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.05 1.15.24 1.77.41 2.19.21.55.47.94.88 1.35.41.41.8.67 1.35.88.42.17 1.04.36 2.19.41 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c1.15-.05 1.77-.24 2.19-.41.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.17-.42.36-1.04.41-2.19.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.05-1.15-.24-1.77-.41-2.19a3.63 3.63 0 0 0-.88-1.35 3.63 3.63 0 0 0-1.35-.88c-.42-.17-1.04-.36-2.19-.41-1.24-.06-1.61-.07-4.76-.07zm0 3.37a4.33 4.33 0 1 1 0 8.66 4.33 4.33 0 0 1 0-8.66zm0 7.14a2.81 2.81 0 1 0 0-5.62 2.81 2.81 0 0 0 0 5.62zm5.5-7.33a1.01 1.01 0 1 1-2.02 0 1.01 1.01 0 0 1 2.02 0z"/>
            </svg>
          </a>
          <a
            href={BRAND_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialLink}
            aria-label="WhatsApp FinCards"
          >
            <svg className={styles.socialIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.79 14.16c-.24.68-1.42 1.31-1.97 1.39-.5.07-1.14.1-1.84-.12-.42-.13-.97-.31-1.66-.61-2.93-1.27-4.84-4.22-4.99-4.42-.15-.2-1.2-1.59-1.2-3.03 0-1.44.76-2.15 1.02-2.44.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.59.82 2.03.89 2.18.07.15.12.32.02.52-.1.2-.15.32-.29.49-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.35 1.45.29.15.46.12.63-.07.17-.2.73-.85.92-1.14.2-.29.39-.24.66-.15.27.1 1.7.8 1.99.95.29.15.48.22.55.34.07.13.07.72-.17 1.4z"/>
            </svg>
          </a>
        </div>
        <LangToggle lang={lang} label={t.langToggle.label} />
      </div>
      <p className={styles.rights}>{t.footer.rights}</p>
    </footer>
  )
}
