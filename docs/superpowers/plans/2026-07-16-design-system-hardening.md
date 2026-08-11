# Design-System Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 6 priority findings from the 2026-07-16 design-system audit — modal/dialog accessibility, a shared `<Button>`, one unified DialogProvider, a token guard that also sees inline styles, tokenized danger colors, and naming cleanups.

**Architecture:** Introduce a small `src/components/ui/` layer (hook + Button + unified DialogProvider + shared controls CSS) built from the *existing* most-complete implementation (`dashboardControls.module.css`), then migrate the worst offenders (admin console, profile) onto it. Old provider files become re-export shims so no consumer call sites break. The token guard script is refactored into a testable lib and extended to scan `.tsx` inline styles.

**Tech Stack:** Next.js 14 (App Router), React 18.3, CSS Modules + CSS variables (NO Tailwind/UI libs), vitest (+ new: jsdom + @testing-library/react for component tests).

## Global Constraints

- **No new UI libraries.** Hand-styled CSS Modules + tokens only (project rule).
- **Radius scale:** `--radius-xs 4 / --radius-sm 8 / --radius-md 16 / --radius-lg 24 / --radius-pill 999 / --radius-round 50%`. No off-scale literals.
- **Control heights:** `--ctl-h-sm 36 / --ctl-h 44 / --ctl-h-lg 52` only. Admin/dense surfaces use 36.
- **`'use client'`** on every component/hook file in `src/components/ui/`.
- **Zero visual change** in Tasks 6 (token swap) — hex values must map 1:1 to the new tokens (two deliberate exceptions noted inline).
- **i18n:** UI copy defaults are Bahasa Indonesia (existing admin convention: `'Batal'/'Ya'/'OK'/'Simpan'`); dashboard keeps passing dict labels.
- After every task: `npm run typecheck && npm run test && npm run check:tokens` must pass.
- Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

**Out of scope (documented follow-ups, do NOT do here):** migrating marketing/auth/editor buttons onto `<Button>`; Solary `themes.css` (a deliberate self-contained per-template palette system, exempt like Lovebirds `theme.css`); TutorialTab's local `#8a7866/#fbf7ee` palette; an admin toast system (port of `FeedbackProvider`); focus-trap in dialogs (Escape + roles first, trap later).

## File Structure

```
src/components/ui/                        ← NEW shared layer
├── useEscapeToClose.ts                   ← Esc-key hook (Task 2)
├── controls.module.css                   ← canonical button/input classes (Task 7)
├── Button.tsx                            ← shared <Button> (Task 7)
├── DialogProvider.tsx                    ← unified confirm/alert/form (Task 11)
├── DialogProvider.module.css             ← its styles (Task 11)
└── __tests__/
    ├── useEscapeToClose.test.tsx
    ├── Button.test.tsx
    └── DialogProvider.test.tsx
scripts/lib/token-rules.mjs               ← extracted + extended scan rules (Task 12)
scripts/lib/__tests__/token-rules.test.mjs
```

Modified: vitest.config.ts, tokens.css, dashboardControls.module.css, GuestEditModal/GuestImportModal/WalkInDialog, both old DialogProviders (→ shims), AddSectionMenu, ~11 admin/profile files, check-design-tokens.mjs, PaletteSwitcher.module.css, dashboardTabs.module.css (rename).

---

### Task 1: Component-test infrastructure (jsdom + Testing Library)

**Files:**
- Modify: `vitest.config.ts`
- Modify: `package.json` (devDependencies via npm install)

**Interfaces:**
- Produces: ability to write `*.test.tsx` files with `/** @vitest-environment jsdom */` docblocks; CSS-module classnames resolve to their literal names in tests (`classNameStrategy: 'non-scoped'`).

- [ ] **Step 1: Install dev dependencies**

```powershell
npm i -D jsdom @testing-library/react @testing-library/dom
```

- [ ] **Step 2: Extend vitest config**

Replace the `test:` block in `vitest.config.ts` with:

```ts
  test: {
    environment: 'node',
    include: [
      'src/**/__tests__/**/*.test.ts',
      'src/**/__tests__/**/*.test.js',
      'src/**/__tests__/**/*.test.tsx',
      'scripts/**/__tests__/**/*.test.mjs',
    ],
    globals: false,
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
```

(Default env stays `node` for the existing 20+ API tests; `.test.tsx` files opt into jsdom per-file via `/** @vitest-environment jsdom */`.)

- [ ] **Step 3: Verify nothing broke**

Run: `npm run test`
Expected: same pass count as before (no new tests yet, none lost).

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "test: add jsdom + testing-library infra for component tests"
```

---

### Task 2: `useEscapeToClose` hook (TDD)

**Files:**
- Create: `src/components/ui/useEscapeToClose.ts`
- Test: `src/components/ui/__tests__/useEscapeToClose.test.tsx`

**Interfaces:**
- Produces: `useEscapeToClose(onClose: () => void, enabled?: boolean): void` — window `keydown` listener for `Escape`; no-op when `enabled === false`; cleans up on unmount. Every modal task below consumes this exact signature.

- [ ] **Step 1: Write the failing test**

```tsx
/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useEscapeToClose } from '../useEscapeToClose'

function pressEscape() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}

describe('useEscapeToClose', () => {
  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    renderHook(() => useEscapeToClose(onClose))
    pressEscape()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', () => {
    const onClose = vi.fn()
    renderHook(() => useEscapeToClose(onClose))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does nothing when enabled is false', () => {
    const onClose = vi.fn()
    renderHook(() => useEscapeToClose(onClose, false))
    pressEscape()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('stops listening after unmount', () => {
    const onClose = vi.fn()
    const { unmount } = renderHook(() => useEscapeToClose(onClose))
    unmount()
    pressEscape()
    expect(onClose).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/__tests__/useEscapeToClose.test.tsx`
Expected: FAIL — cannot resolve `../useEscapeToClose`.

- [ ] **Step 3: Implement the hook**

```ts
'use client'

import { useEffect } from 'react'

/**
 * Close-on-Escape for modals/popovers. Listens on window so it works no
 * matter where focus sits inside the dialog. Pass `enabled=false` while the
 * modal is closed (e.g. providers that render conditionally on state).
 */
export function useEscapeToClose(onClose: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, enabled])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/__tests__/useEscapeToClose.test.tsx`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui
git commit -m "feat(ui): useEscapeToClose hook for modal Escape handling"
```

---

### Task 3: A11y wiring — GuestEditModal + GuestImportModal

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/GuestEditModal.tsx:60-62`
- Modify: `src/app/[template]/[slug]/dashboard/GuestImportModal.tsx:42-44`

**Interfaces:**
- Consumes: `useEscapeToClose(onClose)` from Task 2.
- Produces: both modals expose `role="dialog"`, `aria-modal="true"`, `aria-label`, and close on Escape.

- [ ] **Step 1: GuestEditModal — add import + hook + roles**

Add to imports:

```tsx
import { useEscapeToClose } from '@/components/ui/useEscapeToClose'
```

Inside the component body (after the `useState` block, before `onSave`):

```tsx
  useEscapeToClose(onClose)
```

Change the overlay/dialog wrapper (currently `<div style={overlay} onClick={onClose}>` at line 61) to:

```tsx
    <div style={overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={t.title}>
```

- [ ] **Step 2: GuestImportModal — same three edits**

Add to imports:

```tsx
import { useEscapeToClose } from '@/components/ui/useEscapeToClose'
```

Inside the component body (after `const preview = useMemo(...)`):

```tsx
  useEscapeToClose(onClose)
```

Change the wrapper (currently `<div style={overlay} onClick={onClose}>` at line 43) to:

```tsx
    <div style={overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={t.title}>
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[template]/[slug]/dashboard/GuestEditModal.tsx" "src/app/[template]/[slug]/dashboard/GuestImportModal.tsx"
git commit -m "fix(a11y): role=dialog + aria-modal + Escape on guest edit/import modals"
```

---

### Task 4: Escape wiring — WalkInDialog + both dialog providers

**Files:**
- Modify: `src/app/[template]/[slug]/dashboard/guestbook/WalkInDialog.tsx`
- Modify: `src/components/dashboard/DialogProvider.tsx`
- Modify: `src/components/admin/AdminDialogProvider.tsx`

**Interfaces:**
- Consumes: `useEscapeToClose(onClose, enabled)` from Task 2.

- [ ] **Step 1: WalkInDialog** (already has `role="dialog" aria-modal` on its dialog element — only Escape is missing)

Add to imports:

```tsx
import { useEscapeToClose } from '@/components/ui/useEscapeToClose'
```

In the component body, right after the state declarations (after `const confirmDialog = useConfirm()` at line 41):

```tsx
  useEscapeToClose(onClose)
```

- [ ] **Step 2: dashboard DialogProvider** — Escape cancels (resolves `false`)

Add import:

```tsx
import { useEscapeToClose } from '@/components/ui/useEscapeToClose'
```

Inside `DialogProvider`, after the `alert` useCallback (line 65), add:

```tsx
  useEscapeToClose(() => close(false), state !== null)
```

Note: `close` is declared below as a function statement, so it's hoisted — no reorder needed.

- [ ] **Step 3: AdminDialogProvider** — Escape cancels (`null` for form, `false` otherwise)

Add import:

```tsx
import { useEscapeToClose } from '@/components/ui/useEscapeToClose'
```

**Placement matters:** the component early-returns when `!state` (line 68). React hooks must run unconditionally, so add this immediately after the `form` useCallback (line 59), BEFORE the `settle` function and the early return:

```tsx
  useEscapeToClose(() => settle(state?.kind === 'form' ? null : false), state !== null)
```

(`settle` is a hoisted function statement and guards `if (!state) return` itself.)

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run test`
Expected: PASS. Manual spot-check optional: open dashboard → Guests → any confirm dialog → Esc closes it.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[template]/[slug]/dashboard/guestbook/WalkInDialog.tsx" src/components/dashboard/DialogProvider.tsx src/components/admin/AdminDialogProvider.tsx
git commit -m "fix(a11y): Escape-to-close on WalkInDialog and both dialog providers"
```

---

### Task 5: AddSectionMenu — menu ARIA semantics + Escape

**Files:**
- Modify: `src/editor/AddSectionMenu.tsx`

- [ ] **Step 1: Add ARIA attributes, Escape handling, and focus return**

Replace the component's return JSX (lines 42-84) with:

```tsx
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
          border: '1px dashed var(--border-strong)', background: 'transparent',
          color: 'rgba(42,33,24,0.65)', fontSize: 12, letterSpacing: '0.16em',
          textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        {t.addSection}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={t.addSection}
          style={{
            position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0,
            maxHeight: 320, overflow: 'auto', background: 'var(--surface-raised)',
            border: '1px solid rgba(42,33,24,0.15)', borderRadius: 'var(--radius-sm)',
            boxShadow: '0 10px 30px rgba(42,33,24,0.10)', zIndex: 20,
          }}
        >
          {entries.map(([type, schema]) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              onClick={() => { onAdd(type, localizeLabel(schema.label, lang), schema.defaults); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 14px', border: 'none', background: 'transparent',
                fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(42,33,24,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {localizeLabel(schema.label, lang)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
```

Above the return, add the trigger ref and Escape hook (next to the existing `wrapRef`):

```tsx
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEscapeToClose(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, open)
```

And add the import:

```tsx
import { useEscapeToClose } from '@/components/ui/useEscapeToClose'
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS. Manual: editor → "Tambah Section" → menu opens, Esc closes and focus returns to the trigger.

- [ ] **Step 3: Commit**

```bash
git add src/editor/AddSectionMenu.tsx
git commit -m "fix(a11y): menu roles, aria-expanded, Escape + focus return on AddSectionMenu"
```

---

### Task 6: Danger-color tokens + swap in dashboardControls

**Files:**
- Modify: `src/styles/tokens.css` (add tokens next to the existing `--status-error` block at line ~219)
- Modify: `src/app/[template]/[slug]/dashboard/dashboardControls.module.css`

**Interfaces:**
- Produces: `--status-danger`, `--status-danger-strong`, `--status-danger-deep`, `--status-danger-bright`, `--status-danger-soft`, `--shadow-danger`, `--shadow-danger-hover`, `--focus-ring-danger` — consumed verbatim by Task 7's `controls.module.css`.

- [ ] **Step 1: Add tokens to `tokens.css`** (directly below the `--status-error-soft` line):

```css
  /* Destructive-action red scale. Distinct from --status-error (which aliases
     the coral --interactive-primary and is used for inline error text/banners):
     these are the "true red" destructive-button colors previously hardcoded in
     dashboardControls.module.css. Values are 1:1 with the old literals. */
  --status-danger:           #DC2626;
  --status-danger-strong:    #B91C1C; /* hover fill */
  --status-danger-deep:      #991B1B; /* hover border */
  --status-danger-bright:    #EF4444; /* ghost/outline border */
  --status-danger-soft:      rgba(239, 68, 68, 0.08);
  --shadow-danger:           0 4px 14px rgba(220, 38, 38, 0.35);
  --shadow-danger-hover:     0 6px 18px rgba(185, 28, 28, 0.45);
  --focus-ring-danger:       0 0 0 3px rgba(239, 68, 68, 0.25), 0 0 0 1.5px #DC2626;
```

- [ ] **Step 2: Swap every hardcoded red in `dashboardControls.module.css`**

Exact mapping (all 20+ occurrences at lines 80-99, 120-135, 266-289):

| Old literal | New token |
|---|---|
| `#DC2626` | `var(--status-danger)` |
| `#B91C1C` | `var(--status-danger-strong)` |
| `#991B1B` | `var(--status-danger-deep)` |
| `#EF4444` (border) | `var(--status-danger-bright)` |
| `rgba(239, 68, 68, 0.06)` and `rgba(239, 68, 68, 0.08)` | `var(--status-danger-soft)` ⚠ deliberate unification 0.06→0.08 (imperceptible tint change on `.btnGhostDanger` at-rest) |
| `box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35)` | `box-shadow: var(--shadow-danger)` |
| `box-shadow: 0 6px 18px rgba(185, 28, 28, 0.45)` | `box-shadow: var(--shadow-danger-hover)` |
| `box-shadow: 0 4px 16px rgba(185, 28, 28, 0.4)` and `0 4px 14px rgba(185, 28, 28, 0.45)` | `box-shadow: var(--shadow-danger-hover)` ⚠ deliberate unification (blur 16→18/14→18, visually indistinguishable glow) |
| `box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25), 0 0 0 1.5px #DC2626` | `box-shadow: var(--focus-ring-danger)` |
| `#FFFFFF` (danger button text, lines 81, 134, 282) | `#fff` may stay — white-on-red is universal; do NOT invent a token |

- [ ] **Step 3: Verify**

Run: `npm run check:tokens && npm run typecheck`
Expected: both PASS. Then `grep -c "#DC2626\|#B91C1C\|#991B1B\|#EF4444" src/app/[template]/[slug]/dashboard/dashboardControls.module.css` → 0.

- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.css "src/app/[template]/[slug]/dashboard/dashboardControls.module.css"
git commit -m "refactor(tokens): --status-danger scale replaces hardcoded reds in dashboard controls"
```

---

### Task 7: Shared `<Button>` + `controls.module.css` (TDD)

**Files:**
- Create: `src/components/ui/controls.module.css`
- Create: `src/components/ui/Button.tsx`
- Test: `src/components/ui/__tests__/Button.test.tsx`

**Interfaces:**
- Consumes: `--status-danger*` tokens from Task 6.
- Produces: `<Button variant="primary"|"ghost"|"danger"|"ghostDanger" size="sm"|"md" ...nativeButtonProps>` (default `variant="primary" size="md" type="button"`, forwards ref). CSS classes `btn/primary/ghost/danger/ghostDanger/sm/md/input/iconBtn` in `controls.module.css`. Tasks 8-11 consume exactly these.

- [ ] **Step 1: Write the failing test**

```tsx
/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../Button'

describe('<Button>', () => {
  it('renders a native button with type=button by default', () => {
    render(<Button>Simpan</Button>)
    const el = screen.getByRole('button', { name: 'Simpan' })
    expect(el.tagName).toBe('BUTTON')
    expect(el.getAttribute('type')).toBe('button')
  })

  it('applies variant + size classes (primary/md defaults)', () => {
    render(<Button>Simpan</Button>)
    const el = screen.getByRole('button', { name: 'Simpan' })
    expect(el.className).toContain('btn')
    expect(el.className).toContain('primary')
    expect(el.className).toContain('md')
  })

  it('applies danger/sm and merges custom className', () => {
    render(<Button variant="danger" size="sm" className="extra">Hapus</Button>)
    const el = screen.getByRole('button', { name: 'Hapus' })
    expect(el.className).toContain('danger')
    expect(el.className).toContain('sm')
    expect(el.className).toContain('extra')
  })

  it('passes through native props (disabled blocks clicks)', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Hapus</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('allows type=submit override', () => {
    render(<Button type="submit">Kirim</Button>)
    expect(screen.getByRole('button', { name: 'Kirim' }).getAttribute('type')).toBe('submit')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/__tests__/Button.test.tsx`
Expected: FAIL — cannot resolve `../Button`.

- [ ] **Step 3: Create `controls.module.css`**

The canonical interaction matrix, lifted from `dashboardControls.module.css` (state-complete: hover/active/disabled/focus-visible/reduced-motion), generalized to two sizes:

```css
/* Shared control primitives (src/components/ui). The canonical button matrix,
   promoted from the dashboard's dashboardControls.module.css so admin/profile
   (previously inline-styled, state-less) get the same states.
   Sizes: .md = --ctl-h (44, public default) · .sm = --ctl-h-sm (36, dense/admin). */

.btn {
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: 1px 20px 0 20px;
  line-height: 1;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-sm);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background var(--duration-base) var(--ease-out),
    color var(--duration-base) var(--ease-out),
    border-color var(--duration-base) var(--ease-out),
    box-shadow var(--duration-base) var(--ease-out),
    transform var(--duration-fast) var(--ease-in-out);
}
.md { height: var(--ctl-h); }
.sm { height: var(--ctl-h-sm); padding: 1px 16px 0 16px; }

.btn:not(:disabled):active { transform: translateY(1px); }
.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--interactive-primary-soft), 0 0 0 1.5px var(--interactive-primary);
}
.btn:disabled { opacity: 0.5; cursor: default; }

/* Solid: charcoal at rest → coral hover (landing CTA pattern). */
.primary {
  border: 1px solid transparent;
  background: var(--color-charcoal);
  color: var(--surface-warm);
}
.primary:not(:disabled):hover {
  background: var(--color-coral);
  color: #fff;
  box-shadow: var(--shadow-btn-accent);
}

.ghost {
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text-primary);
  letter-spacing: 0.1em;
}
.ghost:not(:disabled):hover {
  border-color: var(--interactive-primary);
  color: var(--interactive-primary-hover);
  background: var(--interactive-primary-soft);
}

.danger {
  border: 1px solid var(--status-danger-strong);
  background: var(--status-danger);
  color: #fff;
  font-weight: 600;
  box-shadow: var(--shadow-danger);
}
.danger:not(:disabled):hover {
  background: var(--status-danger-strong);
  border-color: var(--status-danger-deep);
  box-shadow: var(--shadow-danger-hover);
}
.danger:focus-visible { box-shadow: var(--focus-ring-danger); }

.ghostDanger {
  border: 1.5px solid var(--status-danger-bright);
  background: var(--status-danger-soft);
  color: var(--status-danger);
  font-weight: 600;
}
.ghostDanger:not(:disabled):hover {
  background: var(--status-danger-strong);
  border-color: var(--status-danger-deep);
  color: #fff;
  box-shadow: var(--shadow-danger-hover);
}
.ghostDanger:focus-visible { box-shadow: var(--focus-ring-danger); }

/* Text input — same recipe as dashboardControls .input. */
.input {
  width: 100%;
  height: var(--ctl-h-sm);
  padding: 8px 14px 7px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
  background: var(--surface-raised);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--duration-base) var(--ease-out), box-shadow var(--duration-base) var(--ease-out);
}
.input::placeholder { color: var(--text-muted); }
.input:hover:not(:focus) { border-color: var(--border-strong); }
.input:focus { border-color: var(--interactive-primary); box-shadow: 0 0 0 3px var(--interactive-primary-soft); }

/* Square icon button (×, ↑↓). */
.iconBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--ctl-h-sm);
  height: var(--ctl-h-sm);
  flex: 0 0 auto;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition:
    background var(--duration-base) var(--ease-out),
    border-color var(--duration-base) var(--ease-out),
    color var(--duration-base) var(--ease-out),
    transform var(--duration-fast) var(--ease-in-out);
}
.iconBtn:not(:disabled):hover {
  border-color: var(--interactive-primary);
  color: var(--interactive-primary-hover);
  background: var(--interactive-primary-soft);
}
.iconBtn:not(:disabled):active { transform: translateY(1px); }
.iconBtn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--interactive-primary-soft), 0 0 0 1.5px var(--interactive-primary);
}
.iconBtn:disabled { opacity: 0.4; cursor: default; }

@media (prefers-reduced-motion: reduce) {
  .btn, .input, .iconBtn { transition: none; }
  .btn:active, .iconBtn:active { transform: none; }
}
```

- [ ] **Step 4: Create `Button.tsx`**

```tsx
'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import styles from './controls.module.css'

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'ghostDanger'
export type ButtonSize = 'sm' | 'md'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClass: Record<ButtonVariant, string> = {
  primary: styles.primary,
  ghost: styles.ghost,
  danger: styles.danger,
  ghostDanger: styles.ghostDanger,
}
const sizeClass: Record<ButtonSize, string> = { sm: styles.sm, md: styles.md }

/**
 * Shared pill button — one interaction-state matrix (hover/active/disabled/
 * focus-visible + prefers-reduced-motion) for every surface. Defaults to
 * type="button" so it never accidentally submits a form.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', type = 'button', className, ...rest },
  ref,
) {
  const cls = [styles.btn, variantClass[variant], sizeClass[size], className]
    .filter(Boolean)
    .join(' ')
  return <button ref={ref} type={type} className={cls} {...rest} />
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/ui/__tests__/Button.test.tsx`
Expected: 5 passed.

- [ ] **Step 6: Full check + commit**

Run: `npm run typecheck && npm run test && npm run check:tokens` — all PASS.

```bash
git add src/components/ui
git commit -m "feat(ui): shared Button component + controls.module.css from canonical dashboard matrix"
```

---

### Task 8: Migrate admin console (templates, invitations, testimonials, users) to `<Button>`

**Files:**
- Modify: `src/app/admin/templates/TemplateEditor.tsx` (inline `saveBtn` const, ~line 114)
- Modify: `src/app/admin/templates/PlansEditor.tsx` (inline `btn` const, ~line 63)
- Modify: `src/app/admin/invitations/new/CreateInvitationForm.tsx` (inline `btn` const, ~line 195)
- Modify: `src/app/admin/invitations/InvitationRow.tsx` (inline `ghost` const, ~line 128)
- Modify: `src/app/admin/testimonials/ModerationRow.tsx` (inline `btn` const, ~line 69)
- Modify: `src/app/admin/users/UserExportButton.tsx` (~line 25)
- Modify: `src/app/admin/users/DeletionRequestRow.tsx` (inline `danger`/`ghost` consts, ~lines 66-67)

**Interfaces:**
- Consumes: `Button` from `@/components/ui/Button` (Task 7). Admin is dense → always `size="sm"`.

Migration recipe applied identically in every file (shown once here in full; each file below lists its exact substitutions):

```tsx
import { Button } from '@/components/ui/Button'
```

then replace each inline-styled button

```tsx
// BEFORE
<button type="button" style={saveBtn} onClick={...}>Simpan</button>
// AFTER
<Button size="sm" onClick={...}>Simpan</Button>
```

and DELETE the now-unused `React.CSSProperties` button consts at the bottom of the file. Any layout-only inline props on the button (e.g. `marginTop`) move to `style={{ marginTop: 8 }}` on the `<Button>` — layout style may stay inline, control styling may not.

- [ ] **Step 1: Per-file substitution map**

| File | Old const → usage | New |
|---|---|---|
| `TemplateEditor.tsx` | `saveBtn` (solid, h38) | `<Button size="sm">` |
| `PlansEditor.tsx` | `btn` (solid, h40) | `<Button size="sm">` |
| `CreateInvitationForm.tsx` | `btn` (solid, h40, submit) | `<Button size="sm" type="submit">` |
| `InvitationRow.tsx` | `ghost` (outline, h32) | `<Button size="sm" variant="ghost">`; destructive rows (suspend/hapus) → `variant="ghostDanger"` |
| `ModerationRow.tsx` | `btn` (h36) | show/hide → `<Button size="sm" variant="ghost">`, delete → `variant="ghostDanger"` |
| `UserExportButton.tsx` | inline (h34) | `<Button size="sm" variant="ghost">` |
| `DeletionRequestRow.tsx` | `danger` (h34) / `ghost` (h34) | `<Button size="sm" variant="danger">` / `variant="ghost"` |

Read each file before editing; where a button's label/handler is inside a loop or conditional, keep the JSX structure and swap only the element + class/style.

- [ ] **Step 2: Verify build + behavior**

Run: `npm run typecheck && npm run test`
Expected: PASS. Then `npm run dev`, open `/admin/templates`, `/admin/invitations`, `/admin/testimonials`, `/admin/users` — every button now shows hover + focus-visible ring (Tab through them), heights are uniform 36.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin
git commit -m "refactor(admin): shared Button (states + 36px scale) for templates/invitations/testimonials/users"
```

---

### Task 9: Migrate admin payments cluster to `<Button>` + shared `.input`

**Files:**
- Modify: `src/app/admin/payments/PaymentsClient.tsx` (inline `ctl`/`btn` h34 at ~183-184, `refundBtn` h28 at ~187)
- Modify: `src/app/admin/payments/ReconcilePanel.tsx` (inline `btn` h34 at ~70)
- Modify: `src/app/admin/payments/RefundRequestsPanel.tsx` (inline `solid`/`ghost` h32 at ~123-124)

**Interfaces:**
- Consumes: `Button` from `@/components/ui/Button`; `controls.module.css` `.input` class:

```tsx
import { Button } from '@/components/ui/Button'
import ui from '@/components/ui/controls.module.css'
```

- [ ] **Step 1: Substitution map**

| File | Old | New |
|---|---|---|
| `PaymentsClient.tsx` | `btn` buttons (filter/apply/export/backfill) | `<Button size="sm" variant="ghost">` (secondary) / `<Button size="sm">` (primary apply) |
| `PaymentsClient.tsx` | `refundBtn` (h28, destructive per-row) | `<Button size="sm" variant="ghostDanger">` |
| `PaymentsClient.tsx` | `ctl` inline inputs/selects (h34) | `className={ui.input}` on `<input>`/`<select>`, delete the inline const |
| `ReconcilePanel.tsx` | `btn` (h34) | `<Button size="sm" variant="ghost">` |
| `RefundRequestsPanel.tsx` | `solid` approve | `<Button size="sm">` |
| `RefundRequestsPanel.tsx` | `ghost` reject | `<Button size="sm" variant="ghostDanger">` (it rejects — destructive intent) |

Delete each file's dead style consts after replacement.

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run test`
Expected: PASS. Manual: `/admin/payments` — filter row inputs get a focus ring; table row heights don't jump (row `refundBtn` grows 28→36; confirm the table row still reads fine — this is an intended fix, 28 was off-scale).

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/payments
git commit -m "refactor(admin): payments cluster on shared Button + input (focus states, 36px scale)"
```

---

### Task 10: Migrate profile page one-offs to `<Button>`

**Files:**
- Modify: `src/app/profile/ReviewButton.tsx` (inline `solid`/`ghost`/`triggerBtn` consts ~147-156, `closeBtn` 30×30 ~155)
- Modify: `src/app/profile/AccountDataSection.tsx` (inline `ghost`/`danger` h38 ~87-89)
- Modify: `src/app/profile/ProfileRefundControl.tsx` (inline `ctl`/`solid`/`ghost` h38 ~108-110)
- Modify: `src/app/profile/MfaEnroll.tsx` (inline button h40 ~121)

**Interfaces:**
- Consumes: `Button`, `ui.input`, `ui.iconBtn` from `@/components/ui/` (Task 7); `useEscapeToClose` (Task 2).

- [ ] **Step 1: Substitution map**

| File | Old | New |
|---|---|---|
| `ReviewButton.tsx` | `triggerBtn`, `solid`, `ghost` | `<Button size="sm">` / `<Button size="sm" variant="ghost">` |
| `ReviewButton.tsx` | `closeBtn` 30×30 icon | `<button className={ui.iconBtn} aria-label="Tutup">×</button>` |
| `ReviewButton.tsx` | its inline modal `scrim`/`card` | keep the layout consts BUT add `role="dialog" aria-modal="true" aria-label` to the scrim div and `useEscapeToClose(close)` in the body (same recipe as Task 3) |
| `AccountDataSection.tsx` | `ghost` / `danger` (h38) | `<Button size="sm" variant="ghost">` / `variant="danger"` |
| `ProfileRefundControl.tsx` | `ctl` input, `solid`, `ghost` (h38) | `className={ui.input}`, `<Button size="sm">`, `variant="ghost"` |
| `MfaEnroll.tsx` | inline button (h40) | `<Button size="sm">` |

Delete dead consts after replacement. Note `RenewButton.tsx` / `RecheckPaymentButton.tsx` already use `dashboardControls` classes — leave them; they'll keep working.

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run test`
Expected: PASS. Manual: `/profile` — review modal closes with Esc; buttons show focus rings.

- [ ] **Step 3: Commit**

```bash
git add src/app/profile
git commit -m "refactor(profile): shared Button + a11y modal fixes on profile one-offs"
```

---

### Task 11: Unified DialogProvider (confirm/alert/form) + shims (TDD)

**Files:**
- Create: `src/components/ui/DialogProvider.tsx`
- Create: `src/components/ui/DialogProvider.module.css`
- Test: `src/components/ui/__tests__/DialogProvider.test.tsx`
- Modify (→ shim): `src/components/admin/AdminDialogProvider.tsx`
- Modify (→ shim): `src/components/dashboard/DialogProvider.tsx` (keep `DialogProvider.module.css` deletion for the cleanup step)

**Interfaces:**
- Consumes: `Button` (Task 7), `useEscapeToClose` (Task 2), `ui.input` class.
- Produces (single source of truth):

```ts
export interface DialogField {
  name: string; label: string
  type?: 'text' | 'number' | 'textarea' | 'select'
  placeholder?: string; options?: { value: string; label: string }[]
  required?: boolean; defaultValue?: string; help?: string; mustEqual?: string
}
export interface Labels { confirm: string; cancel: string; ok: string; submit: string }
// <DialogProvider labels?: Partial<Labels>>  — defaults { confirm:'Ya', cancel:'Batal', ok:'OK', submit:'Simpan' }
export function useConfirm(): (o: ConfirmOpts) => Promise<boolean>
export function useAlert(): (o: AlertOpts) => Promise<void>
export function useForm(): (o: FormOpts) => Promise<Record<string, string> | null>
```

ConfirmOpts/AlertOpts/FormOpts keep their current field shapes from the two old providers (superset: `title? message? confirmLabel? cancelLabel? okLabel? submitLabel? tone?: 'default'|'danger'`, form adds `fields: DialogField[]`; `message` optional as in admin).

- [ ] **Step 1: Write the failing test**

```tsx
/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { DialogProvider, useConfirm, useForm } from '../DialogProvider'

function Confirmer({ onResult }: { onResult: (v: boolean) => void }) {
  const confirm = useConfirm()
  return (
    <button onClick={async () => onResult(await confirm({ message: 'Yakin?' }))}>go</button>
  )
}

describe('<DialogProvider>', () => {
  it('confirm resolves true on primary click and renders role=dialog', async () => {
    let result: boolean | null = null
    render(
      <DialogProvider>
        <Confirmer onResult={(v) => (result = v)} />
      </DialogProvider>,
    )
    fireEvent.click(screen.getByText('go'))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ya' }))
    })
    expect(result).toBe(true)
  })

  it('Escape cancels (resolves false)', async () => {
    let result: boolean | null = null
    render(
      <DialogProvider>
        <Confirmer onResult={(v) => (result = v)} />
      </DialogProvider>,
    )
    fireEvent.click(screen.getByText('go'))
    await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(result).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('form mustEqual gates submit until the exact text is typed', async () => {
    let result: Record<string, string> | null | undefined
    function Former() {
      const form = useForm()
      return (
        <button
          onClick={async () =>
            (result = await form({
              title: 'Hapus?',
              fields: [{ name: 'c', label: 'Ketik HAPUS', mustEqual: 'HAPUS' }],
            }))
          }
        >
          go
        </button>
      )
    }
    render(
      <DialogProvider>
        <Former />
      </DialogProvider>,
    )
    fireEvent.click(screen.getByText('go'))
    const submit = (await screen.findByRole('button', { name: 'Simpan' })) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/Ketik HAPUS/), { target: { value: 'HAPUS' } })
    expect(submit.disabled).toBe(false)
    await act(async () => {
      fireEvent.click(submit)
    })
    expect(result).toEqual({ c: 'HAPUS' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/__tests__/DialogProvider.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `DialogProvider.module.css`** (token-driven, no raw hex):

```css
.scrim {
  position: fixed;
  inset: 0;
  background: var(--overlay-dark, rgba(0, 0, 0, 0.45));
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: var(--z-modal);
}
.card {
  width: 100%;
  max-width: 440px;
  max-height: min(90vh, 90dvh);
  overflow-y: auto;
  background: var(--surface-raised);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-dialog, var(--shadow-md));
  padding: 20px;
}
.title { font-size: 17px; margin: 0 0 6px; }
.message { font-size: 13.5px; color: var(--text-secondary); line-height: 1.5; margin: 0 0 10px; }
.fields { display: grid; gap: 12px; margin: 4px 0 8px; }
.fieldLabel {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.help { font-size: 12px; color: var(--text-secondary); }
.textarea { height: auto; padding: 8px; resize: vertical; }
.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
```

- [ ] **Step 4: Create `DialogProvider.tsx`**

```tsx
'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { useEscapeToClose } from './useEscapeToClose'
import ui from './controls.module.css'
import styles from './DialogProvider.module.css'

export interface DialogField {
  name: string
  label: string
  type?: 'text' | 'number' | 'textarea' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
  required?: boolean
  defaultValue?: string
  help?: string
  /** If set, the value must equal this exact string to submit (type-to-confirm). */
  mustEqual?: string
}

interface ConfirmOpts { title?: string; message?: string; confirmLabel?: string; cancelLabel?: string; tone?: 'default' | 'danger' }
interface AlertOpts { title?: string; message?: string; okLabel?: string; tone?: 'default' | 'danger' }
interface FormOpts { title?: string; message?: string; fields: DialogField[]; submitLabel?: string; cancelLabel?: string; tone?: 'default' | 'danger' }

type State =
  | { kind: 'confirm'; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: 'alert'; opts: AlertOpts; resolve: (v: boolean) => void }
  | { kind: 'form'; opts: FormOpts; values: Record<string, string>; resolve: (v: Record<string, string> | null) => void }

interface Ctx {
  confirm: (o: ConfirmOpts) => Promise<boolean>
  alert: (o: AlertOpts) => Promise<void>
  form: (o: FormOpts) => Promise<Record<string, string> | null>
}
const DialogCtx = createContext<Ctx | null>(null)

function useCtx(): Ctx {
  const c = useContext(DialogCtx)
  if (!c) throw new Error('useConfirm/useAlert/useForm must be used inside <DialogProvider>')
  return c
}
export const useConfirm = () => useCtx().confirm
export const useAlert = () => useCtx().alert
export const useForm = () => useCtx().form

export interface Labels { confirm: string; cancel: string; ok: string; submit: string }
const DEFAULT_LABELS: Labels = { confirm: 'Ya', cancel: 'Batal', ok: 'OK', submit: 'Simpan' }

/**
 * ONE promise-based confirm/alert/form dialog system for the whole app
 * (unifies the old dashboard DialogProvider and AdminDialogProvider).
 * Escape or scrim-click cancels. Styled with tokens via CSS Module so every
 * button keeps the shared interaction-state matrix.
 */
export function DialogProvider({ children, labels }: { children: ReactNode; labels?: Partial<Labels> }) {
  const L = { ...DEFAULT_LABELS, ...labels }
  const [state, setState] = useState<State | null>(null)

  const confirm = useCallback(
    (opts: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ kind: 'confirm', opts, resolve })),
    [],
  )
  const alert = useCallback(
    (opts: AlertOpts) => new Promise<void>((resolve) => setState({ kind: 'alert', opts, resolve: () => resolve() })),
    [],
  )
  const form = useCallback(
    (opts: FormOpts) =>
      new Promise<Record<string, string> | null>((resolve) => {
        const values: Record<string, string> = {}
        for (const f of opts.fields) values[f.name] = f.defaultValue ?? ''
        setState({ kind: 'form', opts, values, resolve })
      }),
    [],
  )

  function settle(result: boolean | Record<string, string> | null) {
    if (!state) return
    if (state.kind === 'form') state.resolve(result as Record<string, string> | null)
    else state.resolve(result as boolean)
    setState(null)
  }

  useEscapeToClose(() => settle(state?.kind === 'form' ? null : false), state !== null)

  if (!state) return <DialogCtx.Provider value={{ confirm, alert, form }}>{children}</DialogCtx.Provider>

  const tone = (state.opts as ConfirmOpts).tone
  const isForm = state.kind === 'form'
  const isConfirm = state.kind === 'confirm'

  const formValid =
    !isForm ||
    state.opts.fields.every((f) => {
      const v = state.values[f.name] ?? ''
      if (f.mustEqual != null) return v === f.mustEqual
      if (f.required) return v.trim().length > 0
      return true
    })

  return (
    <DialogCtx.Provider value={{ confirm, alert, form }}>
      {children}
      <div
        className={styles.scrim}
        role="dialog"
        aria-modal="true"
        aria-label={state.opts.title || state.opts.message}
        onClick={() => settle(isForm ? null : false)}
      >
        <div className={styles.card} onClick={(e) => e.stopPropagation()}>
          {state.opts.title && <h2 className={styles.title}>{state.opts.title}</h2>}
          {state.opts.message && <p className={styles.message}>{state.opts.message}</p>}

          {isForm && (
            <div className={styles.fields}>
              {state.opts.fields.map((f) => {
                const v = state.values[f.name] ?? ''
                const set = (nv: string) =>
                  setState((s) => (s && s.kind === 'form' ? { ...s, values: { ...s.values, [f.name]: nv } } : s))
                return (
                  <label key={f.name} style={{ display: 'grid', gap: 4 }}>
                    <span className={styles.fieldLabel}>
                      {f.label}
                      {f.required && ' *'}
                    </span>
                    {f.type === 'textarea' ? (
                      <textarea
                        className={`${ui.input} ${styles.textarea}`}
                        value={v}
                        placeholder={f.placeholder}
                        onChange={(e) => set(e.target.value)}
                        rows={3}
                      />
                    ) : f.type === 'select' ? (
                      <select className={ui.input} value={v} onChange={(e) => set(e.target.value)}>
                        {(f.options ?? []).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={ui.input}
                        type={f.type === 'number' ? 'number' : 'text'}
                        value={v}
                        placeholder={f.placeholder}
                        onChange={(e) => set(e.target.value)}
                        autoFocus
                      />
                    )}
                    {f.help && <span className={styles.help}>{f.help}</span>}
                  </label>
                )
              })}
            </div>
          )}

          <div className={styles.actions}>
            {(isForm || isConfirm) && (
              <Button size="sm" variant="ghost" onClick={() => settle(isForm ? null : false)}>
                {(state.opts as ConfirmOpts).cancelLabel || L.cancel}
              </Button>
            )}
            <Button
              size="sm"
              variant={tone === 'danger' ? 'danger' : 'primary'}
              disabled={isForm && !formValid}
              autoFocus={!isForm}
              onClick={() => (isForm ? settle({ ...state.values }) : settle(true))}
            >
              {isForm
                ? (state.opts as FormOpts).submitLabel || L.submit
                : isConfirm
                  ? (state.opts as ConfirmOpts).confirmLabel || L.confirm
                  : (state.opts as AlertOpts).okLabel || L.ok}
            </Button>
          </div>
        </div>
      </div>
    </DialogCtx.Provider>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/ui/__tests__/DialogProvider.test.tsx`
Expected: 3 passed.

- [ ] **Step 6: Turn the two old providers into shims** (zero consumer churn)

`src/components/admin/AdminDialogProvider.tsx` — replace the entire file with:

```tsx
/**
 * Shim — the admin dialog system was unified into src/components/ui/DialogProvider
 * (2026-07 design-system hardening). Kept so ~6 admin consumers' imports and the
 * useAdmin* hook names keep working unchanged.
 */
export {
  DialogProvider as AdminDialogProvider,
  useConfirm as useAdminConfirm,
  useAlert as useAdminAlert,
  useForm as useAdminForm,
  type DialogField,
} from '@/components/ui/DialogProvider'
```

`src/components/dashboard/DialogProvider.tsx` — replace the entire file with:

```tsx
/**
 * Shim — unified into src/components/ui/DialogProvider (2026-07 design-system
 * hardening). Dashboard callers keep their imports; the dashboard still passes
 * i18n labels via the `labels` prop (now Partial — extra `submit` key optional).
 */
export { DialogProvider, useConfirm, useAlert } from '@/components/ui/DialogProvider'
```

Then delete the now-orphaned `src/components/dashboard/DialogProvider.module.css` and check `DashboardClient.tsx`'s `labels={...}` object still type-checks against `Partial<Labels>` (it passes `{confirm, cancel, ok}` — valid subset).

- [ ] **Step 7: Full verify**

Run: `npm run typecheck && npm run test && npm run check:tokens`
Expected: PASS. Manual: one admin confirm (e.g. testimonial hide) + one dashboard confirm (delete guest) — both render, Esc cancels, danger tone shows the red button.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui src/components/admin/AdminDialogProvider.tsx src/components/dashboard
git commit -m "refactor(ui): one DialogProvider (confirm/alert/form) with Escape; old providers become shims"
```

---

### Task 12: Extend the token guard to inline styles in .tsx (TDD)

**Files:**
- Create: `scripts/lib/token-rules.mjs`
- Test: `scripts/lib/__tests__/token-rules.test.mjs`
- Modify: `scripts/check-design-tokens.mjs` (use the lib, add tsx scan)
- Modify: every `.tsx` file the new rule flags (mechanical `borderRadius: 999` → `'var(--radius-pill)'` swaps; known offenders below)

**Interfaces:**
- Produces: `scanCss(source: string): Offense[]` and `scanTsx(source: string): Offense[]` where `Offense = { line: number, text: string, why: string }`. The CLI aggregates over `src/**` (`.css` → scanCss; `.tsx`/`.jsx` → scanTsx) and exits 1 on any offense.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest'
import { scanCss, scanTsx } from '../token-rules.mjs'

describe('scanCss', () => {
  it('flags raw 999px radius', () => {
    const out = scanCss('.x {\n  border-radius: 999px;\n}')
    expect(out).toHaveLength(1)
    expect(out[0].line).toBe(2)
  })
  it('allows token definition lines', () => {
    expect(scanCss(':root {\n  --radius-pill: 999px;\n}')).toHaveLength(0)
  })
  it('flags off-scale height on a button selector', () => {
    const out = scanCss('.saveBtn {\n  height: 40px;\n}')
    expect(out).toHaveLength(1)
  })
  it('allows 36/44/52 on a button selector', () => {
    expect(scanCss('.saveBtn {\n  height: 44px;\n}')).toHaveLength(0)
  })
})

describe('scanTsx', () => {
  it('flags numeric borderRadius: 999 in inline styles', () => {
    const out = scanTsx("const pill = { borderRadius: 999 }")
    expect(out).toHaveLength(1)
    expect(out[0].why).toContain('radius-pill')
  })
  it("allows borderRadius: 'var(--radius-pill)'", () => {
    expect(scanTsx("const pill = { borderRadius: 'var(--radius-pill)' }")).toHaveLength(0)
  })
  it('flags off-scale height inside a button-named style const', () => {
    const src = 'const saveBtn: React.CSSProperties = {\n  height: 40,\n}'
    const out = scanTsx(src)
    expect(out).toHaveLength(1)
    expect(out[0].line).toBe(2)
  })
  it('allows 36/44/52 heights in button-named consts', () => {
    expect(scanTsx('const saveBtn = {\n  height: 36,\n}')).toHaveLength(0)
  })
  it('ignores heights in non-control consts (layout sizing)', () => {
    expect(scanTsx('const thumb = {\n  height: 120,\n}')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/__tests__/token-rules.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `scripts/lib/token-rules.mjs`**

Move the 4 existing CSS rules out of `check-design-tokens.mjs` verbatim into `scanCss`, and add `scanTsx`:

```js
const CTL_OK = new Set(['36px', '44px', '52px'])
const CTL_OK_NUM = new Set(['36', '44', '52'])
const BUTTON_SEL = /(btn|button|cta|toggle|pill|seg|hamburger|burger)/i
const BUTTON_CONST = /(btn|button|cta|input|ctl)/i

/** CSS rules (unchanged from the original inline implementation). */
export function scanCss(source) {
  const offenses = []
  const lines = source.split('\n')
  let currentSel = ''
  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (trimmed.includes('{')) currentSel = trimmed.replace(/\{.*$/, '').trim()

    if (/var\(\s*--border-radius-/.test(line) || /^--border-radius-[\w-]*\s*:/.test(trimmed)) {
      offenses.push({ line: i + 1, text: trimmed, why: 'dead --border-radius-* namespace; use --radius-*' })
    }
    if (/border-radius\s*:[^;]*\b999px\b/.test(line) && !trimmed.startsWith('--')) {
      offenses.push({ line: i + 1, text: trimmed, why: 'raw 999px; use var(--radius-pill) / --r-pill' })
    }
    if (/border-radius\s*:\s*\d+px\s*;/.test(line) && !trimmed.startsWith('--')) {
      offenses.push({ line: i + 1, text: trimmed, why: 'off-scale radius literal; use a --radius-* token' })
    }
    const lastSeg = currentSel.split(/\s+/).pop() || ''
    if (BUTTON_SEL.test(lastSeg)) {
      const m = line.match(/(?:min-)?(?:width|height)\s*:\s*(\d+px)\s*;/)
      if (m && !CTL_OK.has(m[1])) {
        offenses.push({
          line: i + 1,
          text: `${currentSel} { … ${trimmed} }`,
          why: 'off-scale control size; use --ctl-h-sm/--ctl-h/--ctl-h-lg (36/44/52)',
        })
      }
    }
  })
  return offenses
}

/**
 * Inline-style rules for .tsx/.jsx — the blind spot that let the admin console
 * drift: React.CSSProperties objects are invisible to the CSS scan.
 * 1. numeric `borderRadius: 999` → use 'var(--radius-pill)'
 * 2. off-scale `height:`/`minHeight:` inside a style const whose NAME looks
 *    like a control (btn/button/cta/input/ctl) → 36/44/52 only.
 */
export function scanTsx(source) {
  const offenses = []
  const lines = source.split('\n')
  let currentConst = ''
  lines.forEach((line, i) => {
    const decl = line.match(/(?:const|let)\s+(\w+)\s*(?::\s*React\.CSSProperties)?\s*=\s*\{/)
    if (decl) currentConst = decl[1]

    if (/\bborderRadius:\s*999\b/.test(line)) {
      offenses.push({ line: i + 1, text: line.trim(), why: "raw 999 radius; use 'var(--radius-pill)'" })
    }
    if (BUTTON_CONST.test(currentConst)) {
      const m = line.match(/\b(?:height|minHeight):\s*(\d+)\s*[,}\s]/)
      if (m && !CTL_OK_NUM.has(m[1])) {
        offenses.push({
          line: i + 1,
          text: `${currentConst} { … ${line.trim()} }`,
          why: 'off-scale control size in inline style; use 36/44/52 (--ctl-h scale)',
        })
      }
    }
  })
  return offenses
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/__tests__/token-rules.test.mjs`
Expected: 9 passed.

- [ ] **Step 5: Rewire the CLI**

Replace the scanning body of `scripts/check-design-tokens.mjs` (keep its header comment + file-walk) with:

```js
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanCss, scanTsx } from './lib/token-rules.mjs'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const srcDir = join(root, 'src')

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...walk(p))
    else if (/\.(css|tsx|jsx)$/.test(name)) out.push(p)
  }
  return out
}

const offenses = []
for (const file of walk(srcDir)) {
  const src = readFileSync(file, 'utf8')
  const found = file.endsWith('.css') ? scanCss(src) : scanTsx(src)
  for (const o of found) offenses.push({ ...o, file })
}

if (offenses.length) {
  console.error(`\n✗ design-token drift — ${offenses.length} issue(s):\n`)
  for (const o of offenses) {
    console.error(`  ${relative(root, o.file)}:${o.line}`)
    console.error(`     ${o.text}`)
    console.error(`     → ${o.why}\n`)
  }
  process.exit(1)
}
console.log('✓ design tokens clean (radius + control heights, css + inline tsx)')
```

- [ ] **Step 6: Run the guard and fix everything it flags**

Run: `npm run check:tokens`
Expected: FAILS listing the remaining `borderRadius: 999` inline literals. Known offenders (from the audit — the guard output is the source of truth):
`src/editor/SectionList.tsx:181,182,186` · `src/app/forgot-password/page.tsx:182,183` · `src/app/reset-password/page.tsx:337` · `src/app/verify-signup/page.tsx:235` · dashboard `GuestbookLocked.tsx:99`, `PaymentGate.tsx:141,147,164`, `PaletteTab.tsx:166,174`, `OrnamentTab.tsx:199`, `MusicTab.tsx:317,318`, `MetaTab.tsx:229,230`, `guestbook/LedgerTable.tsx:323` · `src/all-templates/solary/components/FloatingNavbar.jsx:219`, `SectionWrapper.jsx:185` · `src/all-templates/lovebirds/sections/GallerySpringCoil/GallerySpringCoil.jsx:300,398`.

Mechanical fix in each: `borderRadius: 999` → `borderRadius: 'var(--radius-pill)'`. If the guard flags an off-scale height in a genuinely non-control const (false positive), rename the const to something non-button-like (e.g. `previewThumbFrame`) rather than weakening the rule.

Re-run until: `✓ design tokens clean (radius + control heights, css + inline tsx)`.

- [ ] **Step 7: Full verify + commit**

Run: `npm run typecheck && npm run test && npm run check:tokens` — all PASS.

```bash
git add scripts src
git commit -m "feat(guard): token drift check now scans .tsx inline styles; fix all flagged 999-radius literals"
```

---

### Task 13: Verified hex swaps + `dashboardTabs` rename + docs

**Files:**
- Modify: `src/all-templates/lovebirds/components/PaletteSwitcher.module.css` (8× `#2A2118` at lines 40,54,57,68,71,79,82)
- Rename: `src/app/[template]/[slug]/dashboard/dashboardTabs.module.css` → `tabPanels.module.css`
- Modify: every importer of the renamed file
- Modify: `CLAUDE.md` (document the new ui layer + guard scope)

- [ ] **Step 1: PaletteSwitcher swap** — `#2A2118` is byte-identical to `--color-charcoal` (verified in tokens.css:51). Replace all 8 occurrences of `#2A2118` with `var(--color-charcoal)`. Leave the `#fff` occurrences (white-on-dark contrast pair, matches project convention elsewhere).

- [ ] **Step 2: Rename the misleadingly-named stylesheet**

```bash
git mv "src/app/[template]/[slug]/dashboard/dashboardTabs.module.css" "src/app/[template]/[slug]/dashboard/tabPanels.module.css"
```

Then find importers and update each import path:

```bash
grep -rl "dashboardTabs.module.css" src/
```

(Expected importers per audit: `RsvpsTab.tsx`, `GiftsTab.tsx`, `GuestsTab.tsx`, `GuestbookTab.tsx`, `MetaTab.tsx`, guestbook components — trust the grep output over this list.) Update the top comment of the renamed file to say: "Tab PANEL content layout (stats rows, tables, cards) — NOT the ARIA tab-nav widget; that lives in EditorWorkspace.tsx."

- [ ] **Step 3: Update `CLAUDE.md`** — in the "Design tokens & styling conventions" section add two lines:

```markdown
- **Shared controls:** `src/components/ui/` — `<Button variant size>`, unified `DialogProvider`
  (confirm/alert/form + Escape), `useEscapeToClose`, `controls.module.css` (.input/.iconBtn).
  New buttons/dialogs MUST use these; do not hand-roll inline-styled controls.
- `npm run check:tokens` now also scans **inline styles in .tsx/.jsx** (999 radius, off-scale
  control heights on btn/input-named consts) — "clean" covers admin/profile inline styles too.
```

Also add `--status-danger*` to the token list line if tokens are enumerated there.

- [ ] **Step 4: Full verify + commit**

Run: `npm run typecheck && npm run test && npm run check:tokens` — all PASS.

```bash
git add -A
git commit -m "chore(design): tokenize PaletteSwitcher charcoal, rename dashboardTabs→tabPanels, doc ui layer"
```

---

## Final acceptance checklist (after all tasks)

- [ ] `npm run test:all` passes (typecheck + vitest + Playwright e2e).
- [ ] `npm run check:tokens` prints the new dual-scope clean message.
- [ ] Keyboard pass: every admin page — Tab shows focus rings on all buttons; every modal (guest edit, guest import, walk-in, admin confirm/form, dashboard confirm, profile review) closes on Esc.
- [ ] Visual pass: dashboard danger buttons look unchanged (token swap was 1:1); admin buttons uniform 36px.
- [ ] Update `TEST-REPORT.md` with the new suite counts if the project convention expects it.
