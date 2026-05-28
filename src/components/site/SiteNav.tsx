'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Logo } from './Logo'
import { LangToggle } from './LangToggle'
import type { Dict, Lang } from '@/lib/i18n'
import styles from './SiteNav.module.css'

export function SiteNav({ lang, t }: { lang: Lang; t: Dict['common'] }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = (
    <>
      <Link href="#features" className={styles.link} onClick={() => setOpen(false)}>{t.nav.experience}</Link>
      <Link href="/templates" className={styles.link} onClick={() => setOpen(false)}>{t.nav.templates}</Link>
      <Link href="/login" className={styles.link} onClick={() => setOpen(false)}>{t.nav.login}</Link>
    </>
  )

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <Logo size="md" />
        <div className={styles.desktop}>
          {links}
          <LangToggle lang={lang} label={t.langToggle.label} />
          <Link href="/signup" className={styles.cta}>{t.nav.cta}</Link>
        </div>
        <button
          type="button"
          className={styles.burger}
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>
      </div>
      {open && (
        <div className={styles.mobilePanel}>
          {links}
          <LangToggle lang={lang} label={t.langToggle.label} />
          <Link href="/signup" className={styles.cta} onClick={() => setOpen(false)}>{t.nav.cta}</Link>
        </div>
      )}
    </nav>
  )
}
