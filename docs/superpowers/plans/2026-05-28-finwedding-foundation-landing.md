# finWedding — Plan 1: i18n Foundation + Chrome + Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand to finWedding, build a cookie-based ID/EN i18n foundation, reusable Logo/SiteNav/SiteFooter chrome, and a fully responsive redesigned landing page — all in CSS Modules using existing design tokens.

**Architecture:** A small typed dictionary system (`src/lib/i18n`) read on the server via a `getLang()` cookie helper; each dapur page passes its dict slice as props to (mostly client) components. A `<LangToggle>` sets the `fin_lang` cookie + `document.documentElement.lang` and calls `router.refresh()` so server components re-render in the new language with no flash. The landing is composed in `src/app/page.tsx` (server) from five client section components that reveal on scroll via a template-agnostic `useReveal` hook.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, CSS Modules, `next/font` (Cormorant Garamond + DM Sans), Vitest. No Tailwind, no i18n library.

**Scope of THIS plan:** Spec Milestones A (i18n foundation + brand), B (chrome), C (landing). Milestones D (translate templates/auth/onboarding) and E (dashboard + editor) are separate follow-up plans that reuse this foundation.

**Spec:** `docs/superpowers/specs/2026-05-28-finwedding-landing-i18n-design.md`

---

## File Structure (locked here)

**Create:**
```
src/lib/i18n/config.ts                         Lang type + cookie constants
src/lib/i18n/getLang.ts                         server-only cookie reader
src/lib/i18n/index.ts                           getDict() + Dict type (assembles common + landing)
src/lib/i18n/dictionaries/common.ts             nav + footer + langToggle (id/en)
src/lib/i18n/dictionaries/landing.ts            all landing copy (id/en)
src/lib/i18n/__tests__/dict-parity.test.ts      asserts id/en key parity
src/hooks/useReveal.ts                          IntersectionObserver reveal (app-level)
src/components/site/Logo.tsx + Logo.module.css
src/components/site/LangToggle.tsx + LangToggle.module.css
src/components/site/SiteNav.tsx + SiteNav.module.css
src/components/site/SiteFooter.tsx + SiteFooter.module.css
src/components/marketing/Hero.tsx + Hero.module.css
src/components/marketing/Features.tsx + Features.module.css
src/components/marketing/TemplateShowcase.tsx + TemplateShowcase.module.css
src/components/marketing/HowItWorks.tsx + HowItWorks.module.css
src/components/marketing/FinalCta.tsx + FinalCta.module.css
```

**Modify:**
```
src/app/layout.tsx          finWedding metadata (keep <html lang="id"> static — see Task 6 note)
src/app/page.tsx            full rewrite → composed landing
src/config/templateCatalog.js   (read-only here; descriptions stay, showcase copy comes from dict)
```

**Contract — dict shape (used consistently across all tasks):**
```
common.{id,en}.nav        = { experience, templates, login, cta }
common.{id,en}.footer     = { tagline, templates, login, signup, rights }
common.{id,en}.langToggle = { label }
landing.{id,en}.hero       = { kicker, title, subtitle, ctaPrimary, ctaSecondary }
landing.{id,en}.features   = { heading, subheading, items: [{title, body} × 3] }
landing.{id,en}.showcase   = { heading, subheading, previewCta, useCta,
                               byTemplate: { lovebirds:{tagline,body}, solary:{tagline,body} } }
landing.{id,en}.howItWorks = { heading, steps: [{title, body} × 3] }
landing.{id,en}.finalCta   = { title, subtitle, cta }
```

**Contract — CTA routes (all already exist):**
```
Buat Undangan / Create Invitation  → /signup
Lihat Template / Browse Templates  → /templates
Login                              → /login
Gunakan template / Use this        → /onboarding?template=<id>
Preview                            → /<id>/<demoSlug>
```

**Contract — design tokens (from src/styles/tokens.css, use via var()):**
`--color-coral #E8553E`, `--color-purple #6B35A8`, `--color-cream #FDF6EC`, `--color-cream-deep #F7EBD7`, `--color-charcoal #2A2118`, `--color-charcoal-light #5C4A3A`, `--color-paper #fff`; `--font-display` (Cormorant), `--font-body` (DM Sans); `--container-max 1240px`, `--container-pad clamp(20px,4vw,48px)`, `--spacing-section clamp(64px,9vw,120px)`; `--border-radius-card 16px`, `--border-radius-pill 999px`; `--shadow-card`, `--shadow-card-hover`, `--shadow-soft`; `--transition-default`, `--ease-out`; breakpoints `768px` (tablet), `1024px` (desktop), mobile-first.

---

## Task 1: i18n config + getLang

**Files:**
- Create: `src/lib/i18n/config.ts`
- Create: `src/lib/i18n/getLang.ts`

- [ ] **Step 1: Write `config.ts`**

```ts
export type Lang = 'id' | 'en'

export const LANGS: readonly Lang[] = ['id', 'en'] as const
export const DEFAULT_LANG: Lang = 'id'
export const LANG_COOKIE = 'fin_lang'
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export function normalizeLang(value: string | undefined | null): Lang {
  return value === 'en' ? 'en' : 'id'
}
```

- [ ] **Step 2: Write `getLang.ts`**

```ts
import 'server-only'
import { cookies } from 'next/headers'
import { LANG_COOKIE, normalizeLang, type Lang } from './config'

/** Server-only. Reads the fin_lang cookie; defaults to 'id'. */
export function getLang(): Lang {
  return normalizeLang(cookies().get(LANG_COOKIE)?.value)
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing these files. (`server-only` ships with Next 14.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/config.ts src/lib/i18n/getLang.ts
git commit -m "feat(i18n): add Lang config + server-only getLang cookie reader"
```

---

## Task 2: Dictionaries (common + landing) + index + parity test

**Files:**
- Create: `src/lib/i18n/dictionaries/common.ts`
- Create: `src/lib/i18n/dictionaries/landing.ts`
- Create: `src/lib/i18n/index.ts`
- Test: `src/lib/i18n/__tests__/dict-parity.test.ts`

- [ ] **Step 1: Write `dictionaries/common.ts`**

```ts
export const common = {
  id: {
    nav: { experience: 'Pengalaman', templates: 'Template', login: 'Masuk', cta: 'Buat Undangan' },
    footer: {
      tagline: 'Undangan pernikahan digital yang sinematik.',
      templates: 'Template', login: 'Masuk', signup: 'Buat Undangan',
      rights: '© 2026 finWedding. Dibuat untuk momen tak terlupakan.',
    },
    langToggle: { label: 'Bahasa' },
  },
  en: {
    nav: { experience: 'Experience', templates: 'Templates', login: 'Login', cta: 'Create Invitation' },
    footer: {
      tagline: 'Cinematic digital wedding invitations.',
      templates: 'Templates', login: 'Login', signup: 'Create Invitation',
      rights: '© 2026 finWedding. Crafted for unforgettable moments.',
    },
    langToggle: { label: 'Language' },
  },
} as const
```

- [ ] **Step 2: Write `dictionaries/landing.ts`**

```ts
export const landing = {
  id: {
    hero: {
      kicker: 'UNDANGAN PERNIKAHAN DIGITAL',
      title: 'Kisah cintamu, dirangkai sinematik.',
      subtitle:
        'Bikin undangan digital premium yang memukau dari scroll pertama sampai RSVP. Pilih template, isi cerita kalian, bagikan link.',
      ctaPrimary: 'Buat Undangan',
      ctaSecondary: 'Lihat Template',
    },
    features: {
      heading: 'Semua yang kalian butuhkan',
      subheading: 'Fitur lengkap untuk undangan yang terasa hangat dan personal.',
      items: [
        { title: 'RSVP & Manajemen Tamu', body: 'Kelola daftar tamu, konfirmasi kehadiran, plus-one, dan ucapan — rapi dalam satu dashboard.' },
        { title: 'Musik Latar', body: 'Setel lagu favorit kalian, otomatis main begitu undangan dibuka.' },
        { title: 'Galeri, Cerita & Amplop Digital', body: 'Timeline kisah, galeri foto, dan amplop digital (transfer bank) — lengkap.' },
      ],
    },
    showcase: {
      heading: 'Dua gaya, dua dunia',
      subheading: 'Pilih karakter undangan kalian. Template baru menyusul.',
      previewCta: 'Lihat preview',
      useCta: 'Gunakan template',
      byTemplate: {
        lovebirds: { tagline: 'Sinematik & hangat', body: 'Kartu foto polaroid, animasi botanical, dan section lengkap (RSVP, gift, galeri, guestbook).' },
        solary: { tagline: 'Futuristik & berani', body: 'Tata surya 3D, perjalanan antar-planet saat scroll, dan palette switcher.' },
      },
    },
    howItWorks: {
      heading: 'Cuma tiga langkah',
      steps: [
        { title: 'Pilih template', body: 'Mulai dari gaya yang paling cocok dengan cerita kalian.' },
        { title: 'Isi cerita & data', body: 'Foto, tanggal, lokasi, dan detail acara lewat dashboard.' },
        { title: 'Bagikan link', body: 'Sebar ke tamu lewat WhatsApp — pantau RSVP real-time.' },
      ],
    },
    finalCta: {
      title: 'Siap bikin undangan kalian?',
      subtitle: 'Bangun dan lihat hasilnya sebelum dipublish.',
      cta: 'Buat Undangan',
    },
  },
  en: {
    hero: {
      kicker: 'DIGITAL WEDDING INVITATIONS',
      title: 'Your love story, told cinematically.',
      subtitle:
        'Craft a premium digital invitation that captivates from the first scroll to the RSVP. Pick a template, add your story, share the link.',
      ctaPrimary: 'Create Invitation',
      ctaSecondary: 'Browse Templates',
    },
    features: {
      heading: 'Everything you need',
      subheading: 'A complete toolkit for an invitation that feels warm and personal.',
      items: [
        { title: 'RSVP & Guest Management', body: 'Manage your guest list, attendance, plus-ones, and wishes — all in one tidy dashboard.' },
        { title: 'Background Music', body: 'Set your favorite song to play the moment the invitation opens.' },
        { title: 'Gallery, Story & Digital Gift', body: 'Story timeline, photo gallery, and digital gift (bank transfer) — all included.' },
      ],
    },
    showcase: {
      heading: 'Two styles, two worlds',
      subheading: 'Pick your invitation’s character. More templates coming soon.',
      previewCta: 'View preview',
      useCta: 'Use template',
      byTemplate: {
        lovebirds: { tagline: 'Cinematic & warm', body: 'Polaroid photo cards, botanical animation, and a full set of sections (RSVP, gift, gallery, guestbook).' },
        solary: { tagline: 'Futuristic & bold', body: 'A 3D solar system, inter-planet scroll journey, and a palette switcher.' },
      },
    },
    howItWorks: {
      heading: 'Just three steps',
      steps: [
        { title: 'Pick a template', body: 'Start from the style that fits your story best.' },
        { title: 'Add your story & details', body: 'Photos, dates, venue, and event details via the dashboard.' },
        { title: 'Share the link', body: 'Send it to guests over WhatsApp — track RSVPs in real time.' },
      ],
    },
    finalCta: {
      title: 'Ready to create yours?',
      subtitle: 'Build it and preview before you publish.',
      cta: 'Create Invitation',
    },
  },
} as const
```

- [ ] **Step 3: Write `index.ts`**

```ts
import { common } from './dictionaries/common'
import { landing } from './dictionaries/landing'
import type { Lang } from './config'

const dict = {
  id: { common: common.id, landing: landing.id },
  en: { common: common.en, landing: landing.en },
} as const

export type Dict = (typeof dict)['id']
export function getDict(lang: Lang): Dict {
  return dict[lang]
}
export type { Lang } from './config'
```

- [ ] **Step 4: Write parity test `__tests__/dict-parity.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { common } from '../dictionaries/common'
import { landing } from '../dictionaries/landing'

function keyPaths(obj: unknown, prefix = ''): string[] {
  if (Array.isArray(obj)) {
    return obj.flatMap((v, i) => keyPaths(v, `${prefix}[${i}]`))
  }
  if (obj && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>).flatMap((k) =>
      keyPaths((obj as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k),
    )
  }
  return [prefix]
}

describe('i18n dictionary parity (id ⟷ en)', () => {
  const dicts: Array<[string, { id: unknown; en: unknown }]> = [
    ['common', common],
    ['landing', landing],
  ]
  it.each(dicts)('%s has identical id/en key paths', (_name, d) => {
    expect(keyPaths(d.en).sort()).toEqual(keyPaths(d.id).sort())
  })
})
```

- [ ] **Step 5: Run the parity test — verify it passes**

Run: `npx vitest run src/lib/i18n/__tests__/dict-parity.test.ts`
Expected: PASS (2 cases). If it fails, the failing diff shows which id/en key is missing — fix the dict.

- [ ] **Step 6: Commit**

```bash
git add src/lib/i18n
git commit -m "feat(i18n): add common+landing dictionaries, getDict, and id/en parity test"
```

---

## Task 3: useReveal hook (template-agnostic)

**Files:**
- Create: `src/hooks/useReveal.ts`

- [ ] **Step 1: Write the hook**

```ts
'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Reveals an element on scroll-in. App-level + template-agnostic — do NOT
 * import the Lovebirds-scoped useScrollReveal here (keeps marketing decoupled
 * from any single template). Reduced-motion is handled globally in CSS.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true)
            io.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -50px 0px', threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return { ref, revealed }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useReveal.ts
git commit -m "feat: add template-agnostic useReveal scroll hook"
```

---

## Task 4: Logo component (finWedding wordmark)

**Files:**
- Create: `src/components/site/Logo.tsx`
- Create: `src/components/site/Logo.module.css`

- [ ] **Step 1: Write `Logo.tsx`** (pure presentational — usable in server & client trees)

```tsx
import Link from 'next/link'
import styles from './Logo.module.css'

type LogoProps = { size?: 'sm' | 'md'; withLink?: boolean }

export function Logo({ size = 'md', withLink = true }: LogoProps) {
  const mark = (
    <span className={`${styles.logo} ${size === 'sm' ? styles.sm : styles.md}`}>
      <span className={styles.fin}>fin</span>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.wedding}>Wedding</span>
    </span>
  )
  if (!withLink) return mark
  return (
    <Link href="/" className={styles.link} aria-label="finWedding — beranda">
      {mark}
    </Link>
  )
}
```

- [ ] **Step 2: Write `Logo.module.css`**

```css
.link { display: inline-flex; text-decoration: none; }
.logo { display: inline-flex; align-items: baseline; gap: 0.28em; color: var(--color-charcoal); white-space: nowrap; }
.fin { font-family: var(--font-body); font-weight: 600; letter-spacing: -0.02em; }
.wedding { font-family: var(--font-display); font-style: italic; font-weight: 500; }
.dot {
  align-self: center;
  width: 0.34em; height: 0.34em; border-radius: 999px;
  background: var(--color-coral);
  transition: var(--transition-default);
}
.md { font-size: clamp(22px, 2.4vw, 28px); }
.sm { font-size: 20px; }
.link:hover .dot { box-shadow: 0 0 0 4px rgba(232, 85, 62, 0.18); }
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit` → no errors.
```bash
git add src/components/site/Logo.tsx src/components/site/Logo.module.css
git commit -m "feat(site): add finWedding wordmark Logo component"
```

---

## Task 5: LangToggle component

**Files:**
- Create: `src/components/site/LangToggle.tsx`
- Create: `src/components/site/LangToggle.module.css`

- [ ] **Step 1: Write `LangToggle.tsx`**

```tsx
'use client'
import { useRouter } from 'next/navigation'
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, LANGS, type Lang } from '@/lib/i18n/config'
import styles from './LangToggle.module.css'

export function LangToggle({ lang, label }: { lang: Lang; label: string }) {
  const router = useRouter()

  function switchTo(next: Lang) {
    if (next === lang) return
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`
    document.documentElement.lang = next
    router.refresh()
  }

  return (
    <div className={styles.toggle} role="group" aria-label={label}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={l === lang}
          className={`${styles.btn} ${l === lang ? styles.active : ''}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write `LangToggle.module.css`**

```css
.toggle {
  display: inline-flex; align-items: center;
  border: 1px solid rgba(42, 33, 24, 0.18);
  border-radius: var(--border-radius-pill);
  padding: 2px; gap: 2px; background: rgba(255, 255, 255, 0.5);
}
.btn {
  font-family: var(--font-body); font-size: 12px; font-weight: 600;
  letter-spacing: 0.04em; color: var(--color-charcoal-light);
  padding: 5px 10px; border-radius: var(--border-radius-pill);
  transition: var(--transition-default); min-height: 0;
}
.active { background: var(--color-coral); color: var(--color-paper); }
.btn:not(.active):hover { color: var(--color-charcoal); }
```

> The `.btn { min-height: 0 }` opts these compact chips out of the global 44px tap-floor; they sit inside a larger nav row whose CTA already meets the target.

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit` → no errors.
```bash
git add src/components/site/LangToggle.tsx src/components/site/LangToggle.module.css
git commit -m "feat(site): add ID/EN LangToggle (cookie + router.refresh)"
```

---

## Task 6: Rebrand layout.tsx → finWedding

**Files:**
- Modify: `src/app/layout.tsx` (metadata block)

> **Note (architecture decision):** keep `<html lang="id">` static here. Do NOT call `getLang()` in the root layout — `cookies()` in the root layout would force EVERY route (including cacheable `[template]/[slug]` invitation pages) into dynamic rendering. Per-page content language is read by each dapur page's own `getLang()`; `<LangToggle>` keeps `document.documentElement.lang` in sync client-side. This honors spec §11.6.

- [ ] **Step 1: Update the metadata object**

Replace the existing `metadata` export:
```tsx
export const metadata: Metadata = {
  title: 'finWedding — Undangan Pernikahan Digital',
  description:
    'finWedding — undangan pernikahan digital yang sinematik. Pilih template, isi cerita kalian, bagikan link.',
}
```
Leave the rest of `layout.tsx` (fonts, viewport, `<html lang="en">` → change the literal to `"id"`, body) unchanged otherwise. Change only `<html lang="en"` to `<html lang="id"`.

- [ ] **Step 2: Type-check + build sanity**

Run: `npx tsc --noEmit` → no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "chore(brand): finWedding metadata + default html lang=id"
```

---

## Task 7: SiteNav (sticky, responsive, hamburger)

**Files:**
- Create: `src/components/site/SiteNav.tsx`
- Create: `src/components/site/SiteNav.module.css`

- [ ] **Step 1: Write `SiteNav.tsx`**

```tsx
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
```

- [ ] **Step 2: Write `SiteNav.module.css`** (mobile-first)

```css
.nav {
  position: fixed; top: 0; left: 0; width: 100%; z-index: 50;
  background: rgba(253, 246, 236, 0.6);
  backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(42, 33, 24, 0.08);
  transition: var(--transition-default);
}
.scrolled { background: rgba(253, 246, 236, 0.92); box-shadow: var(--shadow-soft); }
.inner {
  max-width: var(--container-max); margin: 0 auto;
  padding: 14px var(--container-pad);
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.desktop { display: none; }
.link { font-family: var(--font-body); font-size: 14px; font-weight: 500; color: var(--color-charcoal-light); transition: var(--transition-default); }
.link:hover { color: var(--color-coral); }
.cta {
  font-family: var(--font-body); font-size: 14px; font-weight: 600;
  background: var(--color-charcoal); color: var(--color-cream);
  padding: 10px 20px; border-radius: var(--border-radius-pill);
  transition: var(--transition-default); white-space: nowrap;
}
.cta:hover { background: var(--color-coral); }
.burger { display: inline-flex; flex-direction: column; gap: 5px; padding: 8px; }
.burger span { width: 22px; height: 2px; background: var(--color-charcoal); border-radius: 2px; }
.mobilePanel {
  display: flex; flex-direction: column; gap: 16px; align-items: flex-start;
  padding: 12px var(--container-pad) 24px;
  background: rgba(253, 246, 236, 0.98); border-bottom: 1px solid rgba(42, 33, 24, 0.08);
}

@media (min-width: 768px) {
  .desktop { display: flex; align-items: center; gap: 22px; }
  .burger, .mobilePanel { display: none; }
}
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit` → no errors.
```bash
git add src/components/site/SiteNav.tsx src/components/site/SiteNav.module.css
git commit -m "feat(site): add responsive SiteNav with hamburger + lang toggle"
```

---

## Task 8: SiteFooter

**Files:**
- Create: `src/components/site/SiteFooter.tsx`
- Create: `src/components/site/SiteFooter.module.css`

- [ ] **Step 1: Write `SiteFooter.tsx`**

```tsx
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
        </nav>
        <LangToggle lang={lang} label={t.langToggle.label} />
      </div>
      <p className={styles.rights}>{t.footer.rights}</p>
    </footer>
  )
}
```

- [ ] **Step 2: Write `SiteFooter.module.css`**

```css
.footer { background: var(--color-cream-deep); padding: var(--spacing-section) var(--container-pad) 40px; }
.inner {
  max-width: var(--container-max); margin: 0 auto;
  display: flex; flex-direction: column; gap: 24px; align-items: flex-start;
}
.brand { display: flex; flex-direction: column; gap: 10px; }
.tagline { font-family: var(--font-body); font-size: 14px; color: var(--color-charcoal-light); max-width: 30ch; }
.links { display: flex; flex-wrap: wrap; gap: 18px; }
.link { font-family: var(--font-body); font-size: 14px; color: var(--color-charcoal-light); transition: var(--transition-default); }
.link:hover { color: var(--color-coral); }
.rights {
  max-width: var(--container-max); margin: 28px auto 0;
  padding-top: 20px; border-top: 1px solid rgba(42, 33, 24, 0.1);
  font-family: var(--font-body); font-size: 13px; color: rgba(42, 33, 24, 0.55);
}
@media (min-width: 768px) {
  .inner { flex-direction: row; justify-content: space-between; align-items: center; }
}
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit` → no errors.
```bash
git add src/components/site/SiteFooter.tsx src/components/site/SiteFooter.module.css
git commit -m "feat(site): add SiteFooter (valid links only) with lang toggle"
```

---

## Task 9: Hero section

**Files:**
- Create: `src/components/marketing/Hero.tsx`
- Create: `src/components/marketing/Hero.module.css`

- [ ] **Step 1: Write `Hero.tsx`** (CSS-only phone mockup, no external image)

```tsx
'use client'
import Link from 'next/link'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './Hero.module.css'

export function Hero({ t }: { t: Dict['landing']['hero'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <section className={styles.hero}>
      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`} ref={ref}>
        <div className={styles.copy}>
          <p className={styles.kicker}>{t.kicker}</p>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
          <div className={styles.actions}>
            <Link href="/signup" className={styles.primary}>{t.ctaPrimary}</Link>
            <Link href="/templates" className={styles.secondary}>{t.ctaSecondary}</Link>
          </div>
        </div>
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.phone}>
            <div className={styles.phoneCard}>
              <span className={styles.phoneScript}>The Wedding of</span>
              <span className={styles.phoneNames}>Amara &amp; Rizky</span>
              <span className={styles.phoneDate}>11 · 15 · 2026</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Write `Hero.module.css`**

```css
.hero { padding: calc(96px + var(--spacing-section)) var(--container-pad) var(--spacing-section); background: radial-gradient(ellipse at 70% 0%, rgba(231, 185, 216, 0.22), transparent 60%); }
.inner { max-width: var(--container-max); margin: 0 auto; display: grid; gap: 40px; opacity: 0; transform: translateY(28px); transition: opacity .7s var(--ease-out), transform .7s var(--ease-out); }
.revealed { opacity: 1; transform: none; }
.kicker { font-family: var(--font-body); font-size: 12px; letter-spacing: 0.3em; color: var(--color-coral); margin-bottom: 14px; }
.title { font-family: var(--font-display); font-style: italic; font-weight: 500; font-size: clamp(40px, 7vw, 80px); line-height: 1.04; color: var(--color-charcoal); }
.subtitle { font-family: var(--font-body); font-size: clamp(16px, 2vw, 18px); line-height: 1.7; color: var(--color-charcoal-light); max-width: 46ch; margin-top: 20px; }
.actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 32px; }
.primary { font-family: var(--font-body); font-size: 14px; font-weight: 600; background: var(--color-coral); color: var(--color-paper); padding: 14px 28px; border-radius: var(--border-radius-pill); box-shadow: 0 8px 24px rgba(232, 85, 62, 0.25); transition: var(--transition-default); }
.primary:hover { transform: translateY(-2px); }
.secondary { font-family: var(--font-body); font-size: 14px; font-weight: 600; color: var(--color-charcoal); padding: 14px 28px; border-radius: var(--border-radius-pill); border: 1px solid rgba(42, 33, 24, 0.2); transition: var(--transition-default); }
.secondary:hover { background: rgba(42, 33, 24, 0.05); }
.visual { display: flex; justify-content: center; }
.phone { width: clamp(220px, 60vw, 280px); aspect-ratio: 9 / 19; border-radius: 36px; background: var(--color-charcoal); padding: 12px; box-shadow: var(--shadow-card-hover); }
.phoneCard { height: 100%; border-radius: 26px; background: linear-gradient(160deg, var(--color-cream) 0%, var(--color-cream-deep) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; padding: 24px; }
.phoneScript { font-family: var(--font-display); font-style: italic; font-size: 18px; color: var(--color-charcoal-light); }
.phoneNames { font-family: var(--font-display); font-size: 30px; color: var(--color-charcoal); }
.phoneDate { font-family: var(--font-body); font-size: 13px; letter-spacing: 0.2em; color: var(--color-coral); }
@media (min-width: 1024px) {
  .inner { grid-template-columns: 1.1fr 0.9fr; align-items: center; gap: 56px; }
}
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit` → no errors.
```bash
git add src/components/marketing/Hero.tsx src/components/marketing/Hero.module.css
git commit -m "feat(marketing): add Hero with CSS-only phone mockup + reveal"
```

---

## Task 10: Features section

**Files:**
- Create: `src/components/marketing/Features.tsx`
- Create: `src/components/marketing/Features.module.css`

- [ ] **Step 1: Write `Features.tsx`**

```tsx
'use client'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './Features.module.css'

export function Features({ t }: { t: Dict['landing']['features'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <section id="features" className={styles.section}>
      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`} ref={ref}>
        <header className={styles.head}>
          <h2 className={styles.heading}>{t.heading}</h2>
          <p className={styles.subheading}>{t.subheading}</p>
        </header>
        <div className={styles.grid}>
          {t.items.map((item, i) => (
            <article key={i} className={styles.card}>
              <span className={styles.index}>{String(i + 1).padStart(2, '0')}</span>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardBody}>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Write `Features.module.css`**

```css
.section { padding: var(--spacing-section) var(--container-pad); background: var(--color-cream); }
.inner { max-width: var(--container-max); margin: 0 auto; opacity: 0; transform: translateY(28px); transition: opacity .7s var(--ease-out), transform .7s var(--ease-out); }
.revealed { opacity: 1; transform: none; }
.head { max-width: 560px; margin-bottom: 48px; }
.heading { font-family: var(--font-display); font-style: italic; font-size: clamp(30px, 4vw, 44px); color: var(--color-charcoal); }
.subheading { font-family: var(--font-body); font-size: 17px; line-height: 1.7; color: var(--color-charcoal-light); margin-top: 12px; }
.grid { display: grid; gap: 20px; }
.card { background: var(--color-paper); border: 1px solid rgba(42, 33, 24, 0.07); border-radius: var(--border-radius-card); padding: 32px; box-shadow: var(--shadow-soft); transition: var(--transition-default); }
.card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
.index { font-family: var(--font-display); font-style: italic; font-size: 26px; color: var(--color-coral); }
.cardTitle { font-family: var(--font-display); font-size: 22px; color: var(--color-charcoal); margin: 14px 0 10px; }
.cardBody { font-family: var(--font-body); font-size: 15px; line-height: 1.7; color: var(--color-charcoal-light); }
@media (min-width: 768px) { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .grid { grid-template-columns: repeat(3, 1fr); } }
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit` → no errors.
```bash
git add src/components/marketing/Features.tsx src/components/marketing/Features.module.css
git commit -m "feat(marketing): add Features section (1→2→3 col responsive)"
```

---

## Task 11: TemplateShowcase section

**Files:**
- Create: `src/components/marketing/TemplateShowcase.tsx`
- Create: `src/components/marketing/TemplateShowcase.module.css`

- [ ] **Step 1: Write `TemplateShowcase.tsx`** (reads `templateCatalog`, copy from dict)

```tsx
'use client'
import Link from 'next/link'
import { templateCatalog } from '@/config/templateCatalog'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './TemplateShowcase.module.css'

export function TemplateShowcase({ t }: { t: Dict['landing']['showcase'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <section id="templates" className={styles.section}>
      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`} ref={ref}>
        <header className={styles.head}>
          <h2 className={styles.heading}>{t.heading}</h2>
          <p className={styles.subheading}>{t.subheading}</p>
        </header>
        <div className={styles.grid}>
          {templateCatalog.map((tpl) => {
            const copy = t.byTemplate[tpl.id as keyof typeof t.byTemplate]
            return (
              <article key={tpl.id} className={styles.card}>
                <div className={styles.thumb} style={{ background: `linear-gradient(150deg, ${tpl.accent} 0%, var(--color-charcoal) 100%)` }}>
                  <span className={styles.thumbName}>{tpl.label}</span>
                  <span className={styles.thumbTags}>{tpl.tags.join(' · ')}</span>
                </div>
                <div className={styles.body}>
                  <p className={styles.tagline} style={{ color: tpl.accent }}>{copy?.tagline}</p>
                  <p className={styles.desc}>{copy?.body}</p>
                  <div className={styles.actions}>
                    <Link href={`/${tpl.id}/${tpl.demoSlug}`} target="_blank" className={styles.preview}>{t.previewCta} ↗</Link>
                    <Link href={`/onboarding?template=${tpl.id}`} className={styles.use} style={{ background: tpl.accent }}>{t.useCta} →</Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Write `TemplateShowcase.module.css`**

```css
.section { padding: var(--spacing-section) var(--container-pad); background: var(--color-cream-deep); }
.inner { max-width: var(--container-max); margin: 0 auto; opacity: 0; transform: translateY(28px); transition: opacity .7s var(--ease-out), transform .7s var(--ease-out); }
.revealed { opacity: 1; transform: none; }
.head { max-width: 560px; margin-bottom: 48px; }
.heading { font-family: var(--font-display); font-style: italic; font-size: clamp(30px, 4vw, 44px); color: var(--color-charcoal); }
.subheading { font-family: var(--font-body); font-size: 17px; line-height: 1.7; color: var(--color-charcoal-light); margin-top: 12px; }
.grid { display: grid; gap: 28px; }
.card { background: var(--color-paper); border-radius: 20px; overflow: hidden; box-shadow: var(--shadow-card); display: flex; flex-direction: column; transition: var(--transition-default); }
.card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
.thumb { aspect-ratio: 16 / 10; padding: 28px; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; color: var(--color-paper); }
.thumbName { font-family: var(--font-display); font-style: italic; font-size: 34px; }
.thumbTags { font-family: var(--font-body); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; }
.body { padding: 28px; display: flex; flex-direction: column; gap: 12px; }
.tagline { font-family: var(--font-body); font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.desc { font-family: var(--font-body); font-size: 15px; line-height: 1.7; color: var(--color-charcoal-light); }
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
.preview { font-family: var(--font-body); font-size: 13px; font-weight: 600; color: var(--color-charcoal); padding: 11px 18px; border-radius: var(--border-radius-pill); border: 1px solid rgba(42, 33, 24, 0.2); }
.use { font-family: var(--font-body); font-size: 13px; font-weight: 600; color: var(--color-paper); padding: 11px 18px; border-radius: var(--border-radius-pill); }
@media (min-width: 1024px) { .grid { grid-template-columns: repeat(2, 1fr); } }
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit` → no errors.
```bash
git add src/components/marketing/TemplateShowcase.tsx src/components/marketing/TemplateShowcase.module.css
git commit -m "feat(marketing): add TemplateShowcase (Lovebirds + Solary, real preview links)"
```

---

## Task 12: HowItWorks section

**Files:**
- Create: `src/components/marketing/HowItWorks.tsx`
- Create: `src/components/marketing/HowItWorks.module.css`

- [ ] **Step 1: Write `HowItWorks.tsx`**

```tsx
'use client'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './HowItWorks.module.css'

export function HowItWorks({ t }: { t: Dict['landing']['howItWorks'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <section className={styles.section}>
      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`} ref={ref}>
        <h2 className={styles.heading}>{t.heading}</h2>
        <ol className={styles.steps}>
          {t.steps.map((step, i) => (
            <li key={i} className={styles.step}>
              <span className={styles.num}>{i + 1}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Write `HowItWorks.module.css`**

```css
.section { padding: var(--spacing-section) var(--container-pad); background: var(--color-cream); }
.inner { max-width: var(--container-max); margin: 0 auto; opacity: 0; transform: translateY(28px); transition: opacity .7s var(--ease-out), transform .7s var(--ease-out); }
.revealed { opacity: 1; transform: none; }
.heading { font-family: var(--font-display); font-style: italic; font-size: clamp(30px, 4vw, 44px); color: var(--color-charcoal); text-align: center; margin-bottom: 48px; }
.steps { display: grid; gap: 32px; counter-reset: step; }
.step { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.num { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 999px; background: var(--color-coral); color: var(--color-paper); font-family: var(--font-display); font-size: 20px; }
.stepTitle { font-family: var(--font-display); font-size: 22px; color: var(--color-charcoal); }
.stepBody { font-family: var(--font-body); font-size: 15px; line-height: 1.7; color: var(--color-charcoal-light); }
@media (min-width: 768px) { .steps { grid-template-columns: repeat(3, 1fr); gap: 28px; } }
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit` → no errors.
```bash
git add src/components/marketing/HowItWorks.tsx src/components/marketing/HowItWorks.module.css
git commit -m "feat(marketing): add HowItWorks 3-step section"
```

---

## Task 13: FinalCta section

**Files:**
- Create: `src/components/marketing/FinalCta.tsx`
- Create: `src/components/marketing/FinalCta.module.css`

- [ ] **Step 1: Write `FinalCta.tsx`**

```tsx
'use client'
import Link from 'next/link'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './FinalCta.module.css'

export function FinalCta({ t }: { t: Dict['landing']['finalCta'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <section className={styles.section}>
      <div className={`${styles.panel} ${revealed ? styles.revealed : ''}`} ref={ref}>
        <h2 className={styles.title}>{t.title}</h2>
        <p className={styles.subtitle}>{t.subtitle}</p>
        <Link href="/signup" className={styles.cta}>{t.cta}</Link>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Write `FinalCta.module.css`**

```css
.section { padding: var(--spacing-section) var(--container-pad); background: var(--color-cream); }
.panel { position: relative; overflow: hidden; max-width: 960px; margin: 0 auto; background: var(--color-charcoal); border-radius: 28px; padding: clamp(40px, 6vw, 72px); text-align: center; opacity: 0; transform: translateY(28px); transition: opacity .7s var(--ease-out), transform .7s var(--ease-out); }
.revealed { opacity: 1; transform: none; }
.title { font-family: var(--font-display); font-style: italic; font-size: clamp(30px, 5vw, 52px); color: var(--color-cream); }
.subtitle { font-family: var(--font-body); font-size: 17px; line-height: 1.7; color: rgba(253, 246, 236, 0.78); max-width: 44ch; margin: 16px auto 32px; }
.cta { display: inline-block; font-family: var(--font-body); font-size: 15px; font-weight: 600; background: var(--color-coral); color: var(--color-paper); padding: 16px 36px; border-radius: var(--border-radius-pill); transition: var(--transition-default); }
.cta:hover { transform: translateY(-2px); }
```

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit` → no errors.
```bash
git add src/components/marketing/FinalCta.tsx src/components/marketing/FinalCta.module.css
git commit -m "feat(marketing): add FinalCta panel"
```

---

## Task 14: Compose the landing page (rewrite page.tsx)

**Files:**
- Modify (full rewrite): `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx` entirely**

```tsx
import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import { Hero } from '@/components/marketing/Hero'
import { Features } from '@/components/marketing/Features'
import { TemplateShowcase } from '@/components/marketing/TemplateShowcase'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { FinalCta } from '@/components/marketing/FinalCta'

export default function HomePage() {
  const lang = getLang()
  const t = getDict(lang)
  return (
    <>
      <SiteNav lang={lang} t={t.common} />
      <main>
        <Hero t={t.landing.hero} />
        <Features t={t.landing.features} />
        <TemplateShowcase t={t.landing.showcase} />
        <HowItWorks t={t.landing.howItWorks} />
        <FinalCta t={t.landing.finalCta} />
      </main>
      <SiteFooter lang={lang} t={t.common} />
    </>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds; `/` compiles. No type errors, no missing-module errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): compose finWedding landing from i18n + marketing sections"
```

---

## Task 15: Manual verification (dev server)

**Files:** none (verification only)

- [ ] **Step 1: Start dev server**

Run: `npm run dev` → open `http://localhost:3000`

- [ ] **Step 2: Visual + responsive check**

At widths **320px, 768px, 1024px** confirm:
- Nav: hamburger toggles a panel <768; inline links + toggle + CTA ≥768; bg gains shadow after scrolling 20px.
- Hero: copy + CSS phone mockup stack on mobile, two columns ≥1024. Title in Cormorant italic, kicker coral.
- Features: 1 → 2 → 3 columns. Showcase: 1 → 2 columns, two cards (Lovebirds coral, Solary purple). HowItWorks: stacked → 3 across ≥768. FinalCta: dark panel, coral button.
- No horizontal scrollbar at any width.

- [ ] **Step 3: Language toggle behavior**

- Click `EN` in the nav → all landing copy switches to English with no full reload/flash.
- Navigate to `/templates` then back to `/` → still EN (cookie persists). Reload `/` → still EN.
- Switch back to `ID`.

- [ ] **Step 4: CTA wiring**

Click each and confirm the destination:
- Hero "Buat Undangan" / nav CTA / FinalCta → `/signup`
- Hero "Lihat Template" / nav "Template" → `/templates`
- nav "Masuk" → `/login`
- Showcase "Lihat preview" (Lovebirds) → opens `/lovebirds/demo-lovebirds`; (Solary) → `/solary/demo-solary`
- Showcase "Gunakan template" → `/onboarding?template=lovebirds` / `?template=solary`

- [ ] **Step 5: Regression — build + existing tests**

Run: `npm run build` → clean.
Run: `npm test` → existing suite (guests phone/parse/crypto) still passes; new `dict-parity` passes.

- [ ] **Step 6: Reduced motion**

In DevTools → Rendering → emulate `prefers-reduced-motion: reduce`, reload → reveal/hover transitions are effectively disabled (global rule), content still fully visible.

---

## Self-Review (completed during authoring)

**Spec coverage (Milestones A–C):**
- A i18n foundation → Tasks 1–2 (config, getLang, dict, parity test); brand → Task 6; `<html lang>` decision documented (Task 6 note, honors spec §11.6).
- B chrome → Tasks 4,5,7,8 (Logo, LangToggle, SiteNav, SiteFooter).
- C landing → Tasks 3,9–14 (useReveal + 5 sections + page compose).
- Showcase reads only `templateCatalog` data (id/label/accent/tags/demoSlug); copy from dict → satisfies spec §11.9 (marketing stays template-agnostic). ✔
- No dead links (footer lists only valid routes). ✔
- Milestones D (templates/auth/onboarding) and E (dashboard/editor) intentionally deferred to follow-up plans — noted at top.

**Placeholder scan:** none — every code step contains complete code.

**Type/naming consistency:** dict key paths (`t.common.nav.cta`, `t.landing.hero.ctaPrimary`, `t.landing.showcase.byTemplate.lovebirds`, etc.) match between `dictionaries/*`, the parity test, and every consumer. Prop names (`lang`, `t`) consistent. `getDict`/`getLang`/`useReveal`/`Logo`/`LangToggle`/`SiteNav`/`SiteFooter` names consistent across imports.

**Note for executor:** CSS modules here are complete and functional; refine visual polish in-browser (the design-taste/impeccable skills may be applied during Task 15) without changing the prop/dict contracts.
