import Link from 'next/link'
import { Logo } from './Logo'
import { LangToggle } from './LangToggle'
import type { Dict, Lang } from '@/lib/i18n'
import styles from './SiteFooter.module.css'

export function SiteFooter({ lang, t }: { lang: Lang; t: Dict['common'] }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Logo size="sm" />
          <p className={styles.tagline}>{t.footer.tagline}</p>
        </div>
        <nav className={styles.links} aria-label="Footer">
          <Link href="/templates" className={styles.link}>{t.footer.templates}</Link>
          <Link href="/login" className={styles.link}>{t.footer.login}</Link>
          <Link href="/signup" className={styles.link}>{t.footer.signup}</Link>
          <Link href="/terms" className={styles.link}>Syarat &amp; Ketentuan</Link>
          <Link href="/privacy" className={styles.link}>Privasi</Link>
          <Link href="/refund" className={styles.link}>Refund</Link>
        </nav>
        <LangToggle lang={lang} label={t.langToggle.label} />
      </div>
      <p className={styles.rights}>{t.footer.rights}</p>
    </footer>
  )
}
