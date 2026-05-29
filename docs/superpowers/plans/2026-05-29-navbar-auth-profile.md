# Auth-Aware Navbar + Simple Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site navbar react to login state — logged-out shows Login + "Buat Undangan"; logged-in shows a Profile dropdown (Profil, My Template, Reset password, Logout) and a "My Template" CTA — and add a deliberately simple profile page that lists the account's invitations.

**Architecture:** `SiteNav` is already a client component rendered on every marketing/auth page. It detects the session itself via the Supabase browser client (`getUser` + `onAuthStateChange`), so no server page needs to pass props. The profile page is a server component, auth-gated, that reads the account's invitations with the admin client.

**Tech Stack:** Next.js 14 App Router, `@supabase/ssr` browser client, CSS Modules, TypeScript, Vitest.

**Covers roadmap workstreams:** W4 (auth-aware navbar + profile dropdown + rename), W5 (simple profile page).

**Depends on:** none to build. The "My Template" menu item points at `/profile` for now (the profile page lists invitations); roadmap W6 later promotes it to a dedicated `/my-templates`.

**Source roadmap:** `docs/superpowers/plans/2026-05-29-homepage-review-roadmap.md`

---

## File Structure

- Modify: `src/lib/i18n/dictionaries/common.ts` — add `nav.myTemplate`, `profileMenu` block, and `profile` page block (id + en).
- Modify: `src/components/site/SiteNav.tsx` — session detection + conditional right-side + Profile dropdown.
- Modify: `src/components/site/SiteNav.module.css` — dropdown styles.
- Create: `src/app/profile/page.tsx` — auth-gated server component listing the account's invitations.

---

## Task 1 (W4): i18n — nav + profile-menu + profile-page labels

**Files:**
- Modify: `src/lib/i18n/dictionaries/common.ts`

- [ ] **Step 1: Add keys to the Indonesian (`id`) object**

In `src/lib/i18n/dictionaries/common.ts`, change the `id.nav` line to add `myTemplate`, and add `profileMenu` + `profile` blocks after `langToggle`:

```ts
    nav: { experience: 'Pengalaman', templates: 'Template', login: 'Masuk', cta: 'Buat Undangan', myTemplate: 'My Template' },
```

After `langToggle: { label: 'Bahasa' },` add:

```ts
    profileMenu: {
      trigger: 'Profil',
      profile: 'Profil',
      myTemplate: 'My Template',
      resetPassword: 'Reset password',
      logout: 'Keluar',
    },
    profile: {
      title: 'Profil',
      emailLabel: 'Email',
      resetPassword: 'Reset password',
      myTemplatesTitle: 'Undangan saya',
      empty: 'Belum ada undangan.',
      browseTemplates: 'Lihat template',
      viewPublic: 'Lihat undangan',
      openDashboard: 'Buka dashboard',
    },
```

- [ ] **Step 2: Add the same keys to the English (`en`) object**

Change the `en.nav` line:

```ts
    nav: { experience: 'Experience', templates: 'Templates', login: 'Login', cta: 'Create Invitation', myTemplate: 'My Template' },
```

After `langToggle: { label: 'Language' },` add:

```ts
    profileMenu: {
      trigger: 'Profile',
      profile: 'Profile',
      myTemplate: 'My Template',
      resetPassword: 'Reset password',
      logout: 'Logout',
    },
    profile: {
      title: 'Profile',
      emailLabel: 'Email',
      resetPassword: 'Reset password',
      myTemplatesTitle: 'My invitations',
      empty: 'No invitations yet.',
      browseTemplates: 'Browse templates',
      viewPublic: 'View invitation',
      openDashboard: 'Open dashboard',
    },
```

- [ ] **Step 3: Verify parity + typecheck**

Run: `npx vitest run src/lib/i18n/__tests__/dict-parity.test.ts`
Expected: PASS (id and en match).

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/dictionaries/common.ts
git commit -m "feat(i18n): nav myTemplate + profile menu/page labels (id/en)"
```

---

## Task 2 (W4): Auth-aware SiteNav with Profile dropdown

**Files:**
- Modify: `src/components/site/SiteNav.tsx` (full rewrite)
- Modify: `src/components/site/SiteNav.module.css` (append dropdown styles)

- [ ] **Step 1: Rewrite SiteNav.tsx**

Replace the entire contents of `src/components/site/SiteNav.tsx`:

```tsx
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
      <Link href="/templates" className={styles.link} onClick={() => setOpen(false)}>{t.nav.templates}</Link>
    </>
  )

  const loggedOutRight = (
    <>
      <Link href="/login" className={styles.link} onClick={() => setOpen(false)}>{t.nav.login}</Link>
      <Link href="/signup" className={styles.cta} onClick={() => setOpen(false)}>{t.nav.cta}</Link>
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
```

- [ ] **Step 2: Append dropdown styles to SiteNav.module.css**

Add to the end of `src/components/site/SiteNav.module.css`:

```css
.profileWrap { position: relative; display: inline-block; }
.profileTrigger {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-body); font-size: 14px; font-weight: 600;
  color: var(--color-charcoal); cursor: pointer;
  padding: 8px 12px; border-radius: var(--border-radius-pill);
  border: 1px solid rgba(42, 33, 24, 0.18); background: rgba(255, 255, 255, 0.5);
  transition: var(--transition-default);
}
.profileTrigger:hover { border-color: var(--color-coral); color: var(--color-coral); }
.caret { font-size: 10px; }
.menu {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 60;
  min-width: 180px; display: flex; flex-direction: column;
  background: rgba(253, 246, 236, 0.98);
  border: 1px solid rgba(42, 33, 24, 0.1); border-radius: 14px;
  box-shadow: var(--shadow-soft); padding: 6px; gap: 2px;
}
.menuItem, .menuItemButton {
  display: block; width: 100%; text-align: left;
  font-family: var(--font-body); font-size: 14px; color: var(--color-charcoal-light);
  padding: 9px 12px; border-radius: 9px; transition: var(--transition-default);
  cursor: pointer; background: transparent; border: 0;
}
.menuItem:hover, .menuItemButton:hover { background: rgba(42, 33, 24, 0.06); color: var(--color-charcoal); }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Manual browser verification**

Run `npm run dev`:
- **Logged out** (`/`): nav shows Pengalaman, Template, LangToggle, Masuk, and the "Buat Undangan" CTA (unchanged).
- **Log in**, return to `/`: nav now shows a "My Template" CTA + a "Profil ▾" dropdown. Open the dropdown → Profil, My Template, Reset password, Keluar. Click outside → it closes. Click Keluar → you are logged out and redirected to `/`, and the nav reverts to logged-out state.
- Resize to mobile: the burger panel shows the same logged-in/out items.

- [ ] **Step 5: Commit**

```bash
git add src/components/site/SiteNav.tsx src/components/site/SiteNav.module.css
git commit -m "feat(nav): auth-aware navbar with profile dropdown + My Template CTA"
```

---

## Task 3 (W5): Simple profile page

**Files:**
- Create: `src/app/profile/page.tsx`

- [ ] **Step 1: Create the profile page**

Create `src/app/profile/page.tsx`:

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isValidTemplate, DEFAULT_TEMPLATE_ID } from '@/config/templateIndex'
import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'
import { SiteNav } from '@/components/site/SiteNav'

/**
 * Deliberately simple profile page. Shows the account email, a reset-password
 * link, and the list of invitations this account owns (interim "My Template").
 * Auth-gated: bounces to /login when there is no session.
 */
export default async function ProfilePage() {
  const lang = getLang()
  const t = getDict(lang)
  const p = t.common.profile

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createSupabaseAdminClient()
  const { data: rows } = (await admin
    .from('invitations')
    .select('slug, template_id')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: false })) as {
    data: { slug: string; template_id: string | null }[] | null
  }
  const invitations = rows ?? []

  const tmpl = (id: string | null) =>
    id && isValidTemplate(id) ? id : DEFAULT_TEMPLATE_ID

  return (
    <>
      <SiteNav lang={lang} t={t.common} />
      <main style={page}>
        <div style={wrap}>
          <h1 style={h1}>{p.title}</h1>

          <section style={cardBox}>
            <p style={rowLabel}>{p.emailLabel}</p>
            <p style={rowValue}>{user.email}</p>
            <Link href="/forgot-password" style={resetLink}>{p.resetPassword}</Link>
          </section>

          <h2 style={h2}>{p.myTemplatesTitle}</h2>
          {invitations.length === 0 ? (
            <p style={emptyBox}>
              {p.empty}{' '}
              <Link href="/templates" style={resetLink}>{p.browseTemplates}</Link>
            </p>
          ) : (
            <ul style={list}>
              {invitations.map((inv) => {
                const tt = tmpl(inv.template_id)
                return (
                  <li key={inv.slug} style={item}>
                    <span style={itemSlug}>{inv.slug}</span>
                    <span style={itemActions}>
                      <Link href={`/${tt}/${inv.slug}`} target="_blank" style={ghostLink}>{p.viewPublic}</Link>
                      <Link href={`/${tt}/${inv.slug}/dashboard`} style={solidLink}>{p.openDashboard}</Link>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
  padding: 'clamp(96px, 12vw, 128px) clamp(20px, 5vw, 48px) 64px',
  fontFamily: 'var(--font-body, system-ui)',
  color: '#2A2118',
}
const wrap: React.CSSProperties = { maxWidth: 720, margin: '0 auto', width: '100%' }
const h1: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)', fontStyle: 'italic',
  fontSize: 'clamp(32px, 6vw, 52px)', margin: '0 0 24px',
}
const h2: React.CSSProperties = { fontSize: 18, fontWeight: 600, margin: '32px 0 12px' }
const cardBox: React.CSSProperties = {
  background: 'rgba(255,255,255,0.94)', borderRadius: 16, padding: 24,
  boxShadow: '0 20px 60px rgba(42,33,24,0.10)',
}
const rowLabel: React.CSSProperties = {
  fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em',
  color: 'rgba(42,33,24,0.6)', margin: 0,
}
const rowValue: React.CSSProperties = { fontSize: 16, margin: '4px 0 16px' }
const resetLink: React.CSSProperties = {
  color: '#E8553E', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 4, fontSize: 14,
}
const emptyBox: React.CSSProperties = { fontSize: 15, color: '#5C4A3A' }
const list: React.CSSProperties = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }
const item: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
  background: 'rgba(255,255,255,0.94)', borderRadius: 14, padding: '16px 20px',
  boxShadow: '0 10px 30px rgba(42,33,24,0.08)',
}
const itemSlug: React.CSSProperties = { fontWeight: 600, fontSize: 16 }
const itemActions: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap' }
const ghostLink: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 999, border: '1px solid rgba(42,33,24,0.2)',
  color: '#2A2118', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none',
}
const solidLink: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 999, background: '#2A2118', color: '#F5EFE3',
  fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none',
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

> If TypeScript complains that `created_at` is not orderable / unknown on the
> typed query, drop the `.order(...)` line — it is a nicety, not a requirement.

- [ ] **Step 3: Manual browser verification**

Run `npm run dev`:
- Logged out, open `/profile` → redirected to `/login`.
- Logged in, open `/profile` (or via the Profil dropdown) → see email, a "Reset password" link, and a list of your invitations each with "Lihat undangan" + "Buka dashboard". If the account owns none, see the empty state with a "Lihat template" link.

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat(profile): simple profile page listing the account's invitations"
```

---

## Final verification

- [ ] Run: `npm test` — expected: all tests pass (including `dict-parity`).
- [ ] Run: `npx tsc --noEmit -p tsconfig.json` — expected: clean.
- [ ] Browser smoke test: logged-out nav, logged-in nav + dropdown + logout, profile page (with and without invitations), mobile burger panel.

---

## Self-Review notes

- **Coverage:** W4 = Task 1 (i18n) + Task 2 (nav). W5 = Task 1 (profile i18n) + Task 3 (profile page).
- **No props plumbing:** SiteNav self-detects the session, so the many pages already rendering `<SiteNav lang t>` need no changes. Tradeoff: a brief logged-out flash on first paint before `getUser()` resolves — acceptable; can be upgraded to a server-passed `user` prop later if desired.
- **Type consistency:** `t.profileMenu.*`, `t.nav.myTemplate`, and `t.common.profile.*` are all added in Task 1 before being consumed in Tasks 2–3. Logout uses the existing `POST /api/auth/logout` (form submit → 303 to `/`).
- **Interim My Template link:** points to `/profile` (which lists invitations) until roadmap W6 builds a dedicated `/my-templates`. No dead links.
- **i18n parity** enforced by the existing `dict-parity` test for every added key.
