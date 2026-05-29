# Quick Wins + Motion Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the UI-only Homepage Review items — compact language toggle, styled 404, dashboard "back to homepage" + persistent session, page-transition animation, and a language-toggle micro-animation.

**Architecture:** All UI/JSX/CSS changes plus one root `template.tsx` for route transitions. Uses the existing `motion` (framer-motion 12.23.24) dependency — no new packages. Animations avoid CSS `transform` on global wrappers so they never break GSAP-pinned / `position: fixed` content on the cinematic invitation route.

**Tech Stack:** Next.js 14 App Router, `motion/react`, CSS Modules, Vitest (node env), TypeScript.

**Covers roadmap workstreams:** W1 (toggle layout), W2 (404), W3 (dashboard homepage + session), W8 (page transition), W9 (toggle micro-animation).

**Source roadmap:** `docs/superpowers/plans/2026-05-29-homepage-review-roadmap.md`

---

## File Structure

- Modify: `src/app/onboarding/OnboardingForm.tsx` — make the language field a compact inline row (W1).
- Create: `src/app/not-found.tsx` — styled global 404 (W2).
- Modify: `src/lib/i18n/dictionaries/common.ts` — add `notFound` block (W2).
- Create: `src/lib/auth/idle-timeout.ts` — pure `isIdleExpired` helper + constant (W3).
- Test: `src/lib/auth/__tests__/idle-timeout.test.ts` — unit tests for the helper (W3).
- Create: `src/middleware.ts` — Supabase session refresh + sliding 4-hour idle timeout on protected routes (W3).
- Modify: `src/app/[template]/[slug]/dashboard/DashboardClient.tsx` — add Homepage link, remove F5 reload-logout guard (W3).
- Modify: `src/lib/i18n/dictionaries/dashboard.ts` — add `chrome.homepage` (W3).
- Create: `src/app/template.tsx` — route transition wrapper (W8).
- Create: `src/lib/nav/is-cinematic-route.ts` — pure helper to detect the invitation route (W8).
- Create: `src/lib/nav/__tests__/is-cinematic-route.test.ts` — unit tests for the helper (W8).
- Modify: `src/components/site/LangToggle.tsx` + `LangToggle.module.css` — sliding pill micro-animation (W9).

---

## Task 1 (W1): Compact language field in the onboarding form

**Files:**
- Modify: `src/app/onboarding/OnboardingForm.tsx:159-163`

- [ ] **Step 1: Replace the stacked language field with a compact inline row**

Replace (currently lines 159-163):

```tsx
        <div style={field}>
          <span style={lbl}>{dict.form.language}</span>
          <LangToggle lang={lang} label={dict.form.language} />
          <span style={{ fontSize: 12, color: '#5C4A3A', lineHeight: 1.4 }}>{dict.form.languageHint}</span>
        </div>
```

with:

```tsx
        <div style={{ ...field, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={lbl}>{dict.form.language}</span>
          <LangToggle lang={lang} label={dict.form.language} />
        </div>
```

(The verbose `languageHint` line is dropped — the toggle is self-explanatory, and removing it is what makes the row compact. `field` is the existing style constant; we override its direction inline.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors (exit 0).

- [ ] **Step 3: Manual browser verification**

Run `npm run dev`, log in, open `/onboarding`. Expected: the language label sits on the left and the ID/EN toggle is compact on the right of the same row (no large stacked block, no hint paragraph).

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/OnboardingForm.tsx
git commit -m "feat(onboarding): compact inline language toggle row"
```

> **Note (W1b):** the navbar "Pengalaman" link already points to `/#features`, and the
> `#features` anchor exists in `src/components/marketing/Features.tsx:9`. No change needed.

---

## Task 2 (W2): Styled global 404 page

**Files:**
- Modify: `src/lib/i18n/dictionaries/common.ts` (add `notFound` to both `id` and `en`)
- Create: `src/app/not-found.tsx`

- [ ] **Step 1: Add the `notFound` i18n block**

In `src/lib/i18n/dictionaries/common.ts`, add a `notFound` key to the `id` object (after `langToggle`, line 11):

```ts
    langToggle: { label: 'Bahasa' },
    notFound: {
      code: '404',
      title: 'Halaman tidak ditemukan',
      body: 'Sepertinya tautan yang kamu buka salah atau halamannya sudah dipindahkan.',
      backHome: 'Kembali ke beranda',
    },
```

And to the `en` object (after `langToggle`, line 22):

```ts
    langToggle: { label: 'Language' },
    notFound: {
      code: '404',
      title: 'Page not found',
      body: 'The link you opened looks wrong, or the page has moved.',
      backHome: 'Back to home',
    },
```

- [ ] **Step 2: Create the 404 page**

Create `src/app/not-found.tsx`:

```tsx
import Link from 'next/link'
import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'
import { SiteNav } from '@/components/site/SiteNav'

export default function NotFound() {
  const lang = getLang()
  const t = getDict(lang)
  const nf = t.common.notFound
  return (
    <>
      <SiteNav lang={lang} t={t.common} />
      <main style={page}>
        <div style={card}>
          <p style={code}>{nf.code}</p>
          <h1 style={h1}>{nf.title}</h1>
          <p style={body}>{nf.body}</p>
          <Link href="/" style={cta}>{nf.backHome}</Link>
        </div>
      </main>
    </>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
  padding: '120px 24px 48px',
  fontFamily: 'var(--font-body, system-ui)',
  color: '#2A2118',
}
const card: React.CSSProperties = { maxWidth: 480, textAlign: 'center' }
const code: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontStyle: 'italic',
  fontSize: 'clamp(64px, 16vw, 120px)',
  lineHeight: 1,
  color: '#E8553E',
  margin: 0,
}
const h1: React.CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontStyle: 'italic',
  fontSize: 'clamp(28px, 5vw, 40px)',
  margin: '8px 0 12px',
}
const body: React.CSSProperties = { fontSize: 16, lineHeight: 1.7, color: '#5C4A3A', margin: '0 0 28px' }
const cta: React.CSSProperties = {
  display: 'inline-block',
  padding: '14px 28px',
  borderRadius: 999,
  background: '#2A2118',
  color: '#F5EFE3',
  fontSize: 13,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  textDecoration: 'none',
}
```

- [ ] **Step 3: Verify the i18n parity test + typecheck**

Run: `npx vitest run src/lib/i18n/__tests__/dict-parity.test.ts`
Expected: PASS (proves `notFound` added to both id and en).

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Manual browser verification**

Run `npm run dev`, open any nonexistent path e.g. `http://localhost:3000/does-not-exist`. Expected: styled 404 with the homepage gradient, nav, a big italic "404", and a "Kembali ke beranda" button that returns to `/`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/dictionaries/common.ts src/app/not-found.tsx
git commit -m "feat(404): styled global not-found page (id/en)"
```

---

## Task 3 (W3): Homepage link + sliding 4-hour idle session timeout

**Decision (confirmed 2026-05-29):** Replace the F5-logout behavior with a
**sliding idle timeout of 4 hours**. While the user is active (any request to a
protected route within 4 hours), the session stays alive. After 4 hours of
inactivity, the next protected request logs them out and redirects to `/login`.

**Files:**
- Create: `src/lib/auth/idle-timeout.ts`
- Test: `src/lib/auth/__tests__/idle-timeout.test.ts`
- Create: `src/middleware.ts`
- Modify: `src/lib/i18n/dictionaries/dashboard.ts` (chrome block, id ~line 7 + en ~line 259)
- Modify: `src/app/[template]/[slug]/dashboard/DashboardClient.tsx` (remove guard lines 26-42 + call line 72; add header link ~line 107)

- [ ] **Step 1: Write the failing test for the idle helper**

Create `src/lib/auth/__tests__/idle-timeout.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isIdleExpired, IDLE_TIMEOUT_MS } from '../idle-timeout'

describe('isIdleExpired', () => {
  const now = 1_000_000_000_000

  it('is false when activity is within the window', () => {
    expect(isIdleExpired(now - (IDLE_TIMEOUT_MS - 1000), now)).toBe(false)
  })

  it('is true when idle longer than the window', () => {
    expect(isIdleExpired(now - (IDLE_TIMEOUT_MS + 1000), now)).toBe(true)
  })

  it('is false when there is no recorded activity (0)', () => {
    expect(isIdleExpired(0, now)).toBe(false)
  })

  it('uses the 4-hour default', () => {
    expect(IDLE_TIMEOUT_MS).toBe(4 * 60 * 60 * 1000)
  })

  it('honors a custom window', () => {
    expect(isIdleExpired(now - 5000, now, 4000)).toBe(true)
    expect(isIdleExpired(now - 3000, now, 4000)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/__tests__/idle-timeout.test.ts`
Expected: FAIL — cannot find module `../idle-timeout`.

- [ ] **Step 3: Implement the helper**

Create `src/lib/auth/idle-timeout.ts`:

```ts
export const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000 // 4 hours
export const ACTIVITY_COOKIE = 'last_activity'

/**
 * True when the last recorded activity is older than the idle window.
 * A lastActivityMs of 0 (no record yet) is treated as not-expired so a fresh
 * session is initialized rather than immediately logged out.
 */
export function isIdleExpired(
  lastActivityMs: number,
  nowMs: number,
  idleMs: number = IDLE_TIMEOUT_MS,
): boolean {
  return lastActivityMs > 0 && nowMs - lastActivityMs > idleMs
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth/__tests__/idle-timeout.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Create the middleware (session refresh + idle timeout)**

Create `src/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isIdleExpired, ACTIVITY_COOKIE } from '@/lib/auth/idle-timeout'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refreshes the session (also keeps Supabase tokens fresh — there was no
  // middleware before, so this is the canonical place for it).
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const now = Date.now()
    const last = Number(request.cookies.get(ACTIVITY_COOKIE)?.value ?? '0')

    if (isIdleExpired(last, now)) {
      await supabase.auth.signOut() // clears auth cookies onto `response` via setAll
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const redirect = NextResponse.redirect(url)
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c)) // carry the cleared auth cookies
      redirect.cookies.set(ACTIVITY_COOKIE, '', { maxAge: 0, path: '/' })
      return redirect
    }

    // Slide the window forward.
    response.cookies.set(ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
  }

  return response
}

export const config = {
  matcher: [
    '/profile',
    '/onboarding',
    '/my-templates',
    '/:template/:slug/dashboard/:path*',
  ],
}
```

- [ ] **Step 6: Add the `homepage` chrome label**

In `src/lib/i18n/dictionaries/dashboard.ts`, in the Indonesian `chrome` block, after `viewLive: 'Lihat live →',` add:

```ts
      homepage: '← Beranda',
```

In the English `chrome` block, after `viewLive: 'View live →',` add:

```ts
      homepage: '← Home',
```

- [ ] **Step 7: Remove the F5 reload-logout guard**

In `src/app/[template]/[slug]/dashboard/DashboardClient.tsx`, delete the entire `useRefreshLogoutGuard` function (lines 26-42, from `function useRefreshLogoutGuard(` through its closing `}`) AND delete its call `useRefreshLogoutGuard(template, slug)` (line 72). Also remove the doc comment above it (lines ~16-25) since it only describes the removed guard. (The idle timeout now governs session length, so F5 must NOT log out.)

- [ ] **Step 8: Add the Homepage link to the dashboard header**

In the same file, inside `<div className={styles.headerActions}>`, immediately before the existing `<Link href={`/${template}/${slug}`} target="_blank" ...>` (~line 107), insert:

```tsx
          <Link
            href="/"
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              background: 'transparent',
              color: 'rgba(42,33,24,0.7)',
              border: '1px solid rgba(42,33,24,0.18)',
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            {dict.chrome.homepage}
          </Link>
```

(`Link` is already imported in this file.)

- [ ] **Step 9: Verify tests + parity + typecheck**

Run: `npx vitest run src/lib/auth/__tests__/idle-timeout.test.ts src/lib/i18n/__tests__/dict-parity.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors (no "useRefreshLogoutGuard is defined but never used").

- [ ] **Step 10: Manual browser verification**

Run `npm run dev`, log in, open the dashboard. Expected:
- A "← Beranda" button in the header → goes to `/`, still logged in.
- Press F5 on the dashboard → **stays logged in** (no auto-logout).
- Idle-timeout smoke test: temporarily set `IDLE_TIMEOUT_MS` to `60 * 1000` (1 min) in `idle-timeout.ts`, rebuild, leave the dashboard untouched > 1 min, then navigate within it → redirected to `/login`. Restore `IDLE_TIMEOUT_MS` to 4 hours afterward.

- [ ] **Step 11: Commit**

```bash
git add src/lib/auth/idle-timeout.ts src/lib/auth/__tests__/idle-timeout.test.ts src/middleware.ts src/lib/i18n/dictionaries/dashboard.ts "src/app/[template]/[slug]/dashboard/DashboardClient.tsx"
git commit -m "feat(auth): 4h sliding idle timeout via middleware; dashboard homepage link"
```

---

## Task 4 (W8): Page-transition animation

**Files:**
- Create: `src/lib/nav/is-cinematic-route.ts`
- Test: `src/lib/nav/__tests__/is-cinematic-route.test.ts`
- Create: `src/app/template.tsx`

> **Why opacity-only:** a global wrapper must not apply CSS `transform` — a
> transformed ancestor breaks `position: fixed` and GSAP ScrollTrigger pin-spacers
> used by the cinematic invitation. We fade opacity only, and additionally skip the
> wrapper entirely on the public invitation route (it has its own intro).

- [ ] **Step 1: Write the failing test for the route helper**

Create `src/lib/nav/__tests__/is-cinematic-route.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isCinematicRoute } from '../is-cinematic-route'

describe('isCinematicRoute', () => {
  it('is true for a public invitation path (/<template>/<slug>)', () => {
    expect(isCinematicRoute('/lovebirds/budi-sari', ['lovebirds', 'solary'])).toBe(true)
    expect(isCinematicRoute('/solary/ahmad-rahma', ['lovebirds', 'solary'])).toBe(true)
  })

  it('is false for the dashboard sub-route', () => {
    expect(isCinematicRoute('/lovebirds/budi-sari/dashboard', ['lovebirds', 'solary'])).toBe(false)
  })

  it('is false for marketing/auth routes', () => {
    for (const p of ['/', '/templates', '/login', '/signup', '/onboarding', '/profile']) {
      expect(isCinematicRoute(p, ['lovebirds', 'solary'])).toBe(false)
    }
  })

  it('is false when the first segment is not a known template id', () => {
    expect(isCinematicRoute('/blog/post', ['lovebirds', 'solary'])).toBe(false)
  })

  it('tolerates a trailing slash', () => {
    expect(isCinematicRoute('/lovebirds/budi-sari/', ['lovebirds', 'solary'])).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/nav/__tests__/is-cinematic-route.test.ts`
Expected: FAIL — cannot find module `../is-cinematic-route`.

- [ ] **Step 3: Implement the helper**

Create `src/lib/nav/is-cinematic-route.ts`:

```ts
/**
 * True when the path is a public invitation page (`/<template>/<slug>`), which
 * owns its own cinematic intro and GSAP pinning. The page-transition wrapper
 * must skip these paths. `/<template>/<slug>/dashboard` is NOT cinematic.
 */
export function isCinematicRoute(pathname: string, templateIds: string[]): boolean {
  const seg = pathname.split('/').filter(Boolean)
  return seg.length === 2 && templateIds.includes(seg[0])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/nav/__tests__/is-cinematic-route.test.ts`
Expected: PASS (all 5 tests).

- [ ] **Step 5: Create the transition wrapper**

Create `src/app/template.tsx`:

```tsx
'use client'

import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { templateCatalog } from '@/config/templateCatalog'
import { isCinematicRoute } from '@/lib/nav/is-cinematic-route'

const TEMPLATE_IDS = templateCatalog.map((t: { id: string }) => t.id)

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Public invitation pages own their intro + GSAP pinning — don't wrap them.
  if (isCinematicRoute(pathname, TEMPLATE_IDS)) return <>{children}</>

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 7: Manual browser verification**

Run `npm run dev`:
- Navigate `/` → `/templates` → `/login`. Expected: each page fades in smoothly (~0.28s), not an abrupt swap.
- Open a public invitation `/lovebirds/<demoSlug>`. Expected: the cinematic intro/scroll behaves exactly as before (no fade wrapper, no broken pinning).

- [ ] **Step 8: Commit**

```bash
git add src/lib/nav/is-cinematic-route.ts src/lib/nav/__tests__/is-cinematic-route.test.ts src/app/template.tsx
git commit -m "feat(motion): opacity page-transition wrapper (skips cinematic route)"
```

---

## Task 5 (W9): Language-toggle micro-animation

**Files:**
- Modify: `src/components/site/LangToggle.tsx`
- Modify: `src/components/site/LangToggle.module.css`

> **Per-instance layoutId:** several `LangToggle`s can render on one page (nav,
> form, dashboard). Each needs a UNIQUE `layoutId` or `motion` will animate the
> active pill *between different toggles*. We derive it from `useId()`.

- [ ] **Step 1: Rewrite LangToggle with a sliding pill**

Replace the entire contents of `src/components/site/LangToggle.tsx`:

```tsx
'use client'
import { useId } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, LANGS, type Lang } from '@/lib/i18n/config'
import styles from './LangToggle.module.css'

export function LangToggle({ lang, label }: { lang: Lang; label: string }) {
  const router = useRouter()
  const pillId = useId()

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
          {l === lang && (
            <motion.span
              layoutId={`langPill-${pillId}`}
              className={styles.pill}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className={styles.btnLabel}>{l.toUpperCase()}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update the CSS for the pill**

Replace the contents of `src/components/site/LangToggle.module.css`:

```css
.toggle {
  display: inline-flex; align-items: center;
  border: 1px solid rgba(42, 33, 24, 0.18);
  border-radius: var(--border-radius-pill);
  padding: 2px; gap: 2px; background: rgba(255, 255, 255, 0.5);
}
.btn {
  position: relative;
  font-family: var(--font-body); font-size: 12px; font-weight: 600;
  letter-spacing: 0.04em; color: var(--color-charcoal-light);
  padding: 5px 10px; border-radius: var(--border-radius-pill);
  transition: color var(--transition-default); min-height: 0;
}
.pill {
  position: absolute; inset: 0;
  background: var(--color-coral);
  border-radius: var(--border-radius-pill);
  z-index: 0;
}
.btnLabel { position: relative; z-index: 1; }
.active { color: var(--color-paper); }
.btn:not(.active):hover { color: var(--color-charcoal); }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Manual browser verification**

Run `npm run dev`, open `/` (toggle in the nav). Click between ID and EN. Expected:
- The coral pill **slides** smoothly from one option to the other (spring), label colors swap, and the page content crossfades (from `router.refresh()`).
- Open `/onboarding` (a second toggle on the page) and confirm switching there animates its OWN pill only — the nav toggle's pill does not jump.

- [ ] **Step 5: Commit**

```bash
git add src/components/site/LangToggle.tsx src/components/site/LangToggle.module.css
git commit -m "feat(i18n): sliding pill micro-animation on language toggle"
```

---

## Final verification

- [ ] Run the full suite: `npm test` — expected: all tests pass (new `is-cinematic-route` tests + existing `dict-parity`).
- [ ] Run: `npx tsc --noEmit -p tsconfig.json` — expected: clean.
- [ ] Smoke test in browser: navigate across `/`, `/templates`, `/login`, `/onboarding`, dashboard, and one public invitation — transitions feel smooth, toggle animates, invitation cinematic intact, 404 styled.

---

## Self-Review notes

- **Coverage:** W1 (Task 1), W2 (Task 2), W3 (Task 3), W8 (Task 4), W9 (Task 5). W1b verified as no-op (anchor exists).
- **No transform on global wrapper** (Task 4) — opacity only + cinematic-route skip, so GSAP pinning / `position: fixed` are safe.
- **Unique layoutId per toggle** (Task 5) via `useId()` — prevents cross-instance pill animation.
- **i18n parity:** `notFound` (Task 2) and `chrome.homepage` (Task 3) added to both id and en; the existing `dict-parity` test enforces this.
- **Type consistency:** `isCinematicRoute(pathname, templateIds)` signature matches between helper, test, and `template.tsx` call site.
- **Session model (Task 3):** F5 reload-logout guard removed; replaced by a sliding
  4-hour idle timeout enforced in new `src/middleware.ts` (pure `isIdleExpired`
  helper is unit-tested). Middleware also becomes the canonical Supabase token-refresh
  point (none existed before). Matcher scopes it to `/profile`, `/onboarding`,
  `/my-templates`, and the dashboard sub-route — public invitation pages are untouched.
