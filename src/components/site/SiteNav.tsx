'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Logo } from './Logo'
import { LangToggle } from './LangToggle'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Dict, Lang } from '@/lib/i18n'
import styles from './SiteNav.module.css'

export function SiteNav({ lang, t }: { lang: Lang; t: Dict['common'] }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Detect the auth session client-side and keep it in sync.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) =>
      setUser(data.user ? { email: data.user.email ?? '' } : null),
    )
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ? { email: session.user.email ?? '' } : null),
    )
    return () => sub.subscription.unsubscribe()
  }, [])

  // Close the profile dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const baseLinks = (
    <>
      <Link href="/#features" className={styles.link} onClick={() => setOpen(false)}>{t.nav.experience}</Link>
      <Link href="/#vibe" className={styles.link} onClick={() => setOpen(false)}>{t.nav.templates}</Link>
    </>
  )

  const loggedOutRight = (
    <>
      <Link href="/login" className={styles.link} onClick={() => setOpen(false)}>{t.nav.login}</Link>
      <Link href="/#vibe" className={styles.cta} onClick={() => setOpen(false)}>{t.nav.cta}</Link>
    </>
  )

  const profileMenu = (
    <div className={styles.profileWrap} ref={menuRef}>
      <button
        type="button"
        className={styles.profileTrigger}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        {t.profileMenu.trigger}
        <span className={styles.caret} aria-hidden>▾</span>
      </button>
      {menuOpen && (
        <div className={styles.menu} role="menu">
          <Link href="/profile" role="menuitem" className={styles.menuItem} onClick={() => { setMenuOpen(false); setOpen(false) }}>{t.profileMenu.profile}</Link>
          <Link href="/profile" role="menuitem" className={styles.menuItem} onClick={() => { setMenuOpen(false); setOpen(false) }}>{t.profileMenu.myTemplate}</Link>
          <Link href="/forgot-password" role="menuitem" className={styles.menuItem} onClick={() => { setMenuOpen(false); setOpen(false) }}>{t.profileMenu.resetPassword}</Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" role="menuitem" className={styles.menuItemButton}>{t.profileMenu.logout}</button>
          </form>
        </div>
      )}
    </div>
  )

  const loggedInRight = (
    <>
      <Link href="/profile" className={styles.cta} onClick={() => setOpen(false)}>{t.nav.myTemplate}</Link>
      {profileMenu}
    </>
  )

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <Logo size="md" />
        <div className={styles.desktop}>
          {baseLinks}
          <LangToggle lang={lang} label={t.langToggle.label} />
          {user ? loggedInRight : loggedOutRight}
        </div>
        <button
          type="button"
          className={`${styles.burger} ${open ? styles.open : ''}`}
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>
      </div>
      {open && (
        <div className={styles.mobilePanel}>
          {baseLinks}
          <LangToggle lang={lang} label={t.langToggle.label} />
          {user ? (
            <>
              <Link href="/profile" className={styles.link} onClick={() => setOpen(false)}>{t.profileMenu.profile}</Link>
              <Link href="/profile" className={styles.link} onClick={() => setOpen(false)}>{t.profileMenu.myTemplate}</Link>
              <Link href="/forgot-password" className={styles.link} onClick={() => setOpen(false)}>{t.profileMenu.resetPassword}</Link>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className={styles.menuItemButton}>{t.profileMenu.logout}</button>
              </form>
            </>
          ) : (
            loggedOutRight
          )}
        </div>
      )}
    </nav>
  )
}
