import Link from 'next/link'
import { Logo } from './Logo'
import { LangToggle } from './LangToggle'
import { BRAND_TAGLINE_PARTS } from '@/lib/brand'
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
        <LangToggle lang={lang} label={t.langToggle.label} />
      </div>
      <p className={styles.rights}>{t.footer.rights}</p>
    </footer>
  )
}
