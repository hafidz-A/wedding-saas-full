'use client'
import { Logo } from './Logo'
import { LangToggle } from './LangToggle'
import { NavControls } from './NavControls'
import { getDict, type Lang } from '@/lib/i18n'
import styles from './AuthChrome.module.css'

/**
 * Slim top bar for standalone auth / utility "card" pages that don't render the
 * marketing <SiteNav> — the per-slug dashboard login, the payment gate, the
 * forgot/reset-password pages, and the dashboard error screens. Gives every such
 * page a visible way back/home via <NavControls> (per-route Back + Beranda) plus
 * the EN/ID language toggle.
 */
export function AuthChrome({ lang }: { lang: Lang }) {
  const c = getDict(lang).common
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <Logo size="sm" />
        <NavControls lang={lang} />
      </div>
      <LangToggle lang={lang} label={c.langToggle.label} />
    </header>
  )
}
