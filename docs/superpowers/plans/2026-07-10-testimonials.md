# Testimoni Pelanggan + Moderasi Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pelanggan (pemilik undangan berbayar) memberi rating+ulasan dari `/profile`; admin menyaring (munculkan/sembunyikan) dari `/admin/testimonials`; ulasan yang di-approve tampil di landing dengan bintang, atau tampil copywriting ajakan bila belum ada.

**Architecture:** Satu tabel `testimonials` (1 baris per undangan). Submit lewat Next server action (verifikasi kepemilikan + `is_paid`, selalu set `is_visible=false`). Moderasi lewat admin server action (toggle/hapus, `requireAdmin`). Landing (server component) fetch baris `is_visible=true` via admin client dan render di komponen client yang sudah ada. Logika murni (validasi kata, mask nama, mapping) diisolasi ke `src/lib/testimonials/*` supaya bisa di-unit-test dengan vitest.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + RLS, service_role via admin client), TypeScript, vitest. CSS Modules + CSS variables (TANPA Tailwind). Auth: Supabase Auth (`owner_user_id`).

Spec sumber: `docs/superpowers/specs/2026-07-10-testimonials-reviews-moderation-design.md`.

## Global Constraints

Berlaku untuk SEMUA task di plan ini (implisit bagian dari setiap task):

- **⛔ ISI/KUTIPAN TESTIMONI TIDAK BOLEH ITALIC.** Body ulasan selalu `font-style: normal` di landing, modal, dan daftar admin. Waspadai default italic pada `<blockquote>`, `<cite>`, `<em>`, dan `var(--font-heading)`/`var(--font-voice)` (serif) yang sering dipakai miring — override eksplisit. Author/label boleh gaya lain; **isi ulasan tegak**. (Catatan: `.quote` di `Testimonials.module.css` saat ini `font-style: italic` — WAJIB diubah ke `normal`.)
- **Default tersembunyi:** setiap tulis/edit → `is_visible = false`. Tidak ada testimoni tampil tanpa admin memunculkan.
- **Edit mengunci ulang:** upsert dari pelanggan selalu men-set `is_visible = false`.
- **Tanpa data palsu:** saat belum ada ulasan tampil, landing memakai copywriting ajakan — bukan testimoni contoh.
- **Batas 400 KATA** (bukan karakter) untuk isi ulasan, ditegakkan di form + server action. DB char cap 4000 sebagai jaring pengaman.
- **Anonimisasi:** kolom `is_anonymous` dipilih pelanggan. Publik lihat "Anonim" bila true; isi tetap tampil. Admin tetap lihat nama asli + penanda.
- **Tanpa UI library** (Tailwind/shadcn/MUI). CSS Modules + CSS variables saja.
- **Rahasia:** `SUPABASE_SERVICE_ROLE_KEY` hanya via `createSupabaseAdminClient()` di server action / server component — jangan diimpor dari file `'use client'`.
- **`'use client'`** di komponen interaktif; server actions pakai `'use server'`; server components hanya `page.tsx`.
- **Token/desain:** pakai skala token (`--radius-*`, tinggi kontrol `--ctl-h` 44 untuk permukaan publik / `--ctl-h-sm` 36 untuk admin & aksi kartu profil). Jalankan `npm run check:tokens` setelah menyentuh CSS.
- Balasan penjelasan Bahasa Indonesia; komentar/kode Bahasa Inggris.

---

## File Structure

**Baru:**
- `supabase/migrations/2026-07-10_testimonials.sql` — tabel + index + RLS.
- `src/lib/testimonials/types.ts` — tipe bersama (`ReviewInput`, `TestimonialRow`, `PublicTestimonial`).
- `src/lib/testimonials/validate.ts` — logika murni (word count, validasi, mask nama, mapper). **Di-unit-test.**
- `src/lib/testimonials/__tests__/validate.test.ts` — vitest.
- `src/app/profile/reviewActions.ts` — server action `submitReview` (owner + is_paid + validate + upsert hidden).
- `src/app/profile/ReviewButton.tsx` — client: tombol + modal (star picker, textarea+word counter, nama, checkbox anonim).
- `src/app/admin/testimonials/page.tsx` — server: daftar + filter Menunggu/Tampil.
- `src/app/admin/testimonials/actions.ts` — server action `setTestimonialVisible`, `deleteTestimonial` (`requireAdmin`).
- `src/app/admin/testimonials/ModerationRow.tsx` — client: aksi munculkan/sembunyikan/hapus via `AdminDialogProvider`.

**Diubah:**
- `supabase/schema.sql` — mirror tabel `testimonials`.
- `src/app/profile/page.tsx` — select `config` + fetch testimoni existing; render `<ReviewButton>` (gated `is_paid`).
- `src/app/admin/layout.tsx` — nav "Testimoni" + badge jumlah `is_visible=false`.
- `src/app/page.tsx` — fetch testimoni tampil, teruskan `items` ke `<Testimonials>`.
- `src/components/marketing/Testimonials.tsx` — DB-driven + bintang + expand + empty-state.
- `src/components/marketing/Testimonials.module.css` — `.quote{font-style:normal}`, `.stars`, empty-state, expand button.
- `src/lib/i18n/dictionaries/landing.ts` — buang `items`; tambah `emptyHeading`, `emptyBody`, `emptyCta` (id + en).

---

## Task 1: Migrasi database `testimonials`

**Files:**
- Create: `supabase/migrations/2026-07-10_testimonials.sql`
- Modify: `supabase/schema.sql` (tambah blok tabel setelah `guestbook_notes`/`playlist_songs`)

**Interfaces:**
- Produces: tabel `public.testimonials` dengan kolom `id, invitation_id, user_id, rating, body, author_name, is_anonymous, template_id, is_visible, created_at, updated_at`; unique `(invitation_id)`; RLS select publik untuk `is_visible=true`.

- [ ] **Step 1: Tulis file migrasi**

Create `supabase/migrations/2026-07-10_testimonials.sql`:

```sql
-- supabase/migrations/2026-07-10_testimonials.sql
-- Customer testimonials: one review per PAID invitation, hidden by default,
-- shown publicly only after an admin flips is_visible. Idempotent.
create table if not exists public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  user_id       uuid not null,                  -- owner (auth.uid) at submit time
  rating        int  not null check (rating between 1 and 5),
  body          text not null check (char_length(body) between 1 and 4000), -- safety net; ≤400 words enforced in app
  author_name   text not null,                  -- display name snapshot
  is_anonymous  boolean not null default false, -- couple chose to mask their name
  template_id   text not null,                  -- template snapshot at submit time
  is_visible    boolean not null default false, -- DEFAULT hidden (moderation gate)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (invitation_id)                         -- one review per invitation
);

create index if not exists idx_testimonials_visible
  on public.testimonials (is_visible, created_at desc);

-- Reuse the shared updated_at trigger function (defined in schema.sql).
drop trigger if exists trg_testimonials_updated on public.testimonials;
create trigger trg_testimonials_updated
  before update on public.testimonials
  for each row execute function public.set_updated_at();

alter table public.testimonials enable row level security;

-- Public may read ONLY approved (visible) rows. Writes go through server
-- actions using the service_role key (which bypasses RLS) + ownership checks.
drop policy if exists "public read visible testimonials" on public.testimonials;
create policy "public read visible testimonials"
  on public.testimonials for select
  using (is_visible = true);
```

- [ ] **Step 2: Mirror ke schema.sql**

Di `supabase/schema.sql`, setelah blok `playlist_songs` (sekitar baris 121) dan sebelum blok STORAGE BUCKET, tempel blok CREATE TABLE + index + trigger yang sama (tanpa `drop policy`, samakan gaya file). Lalu di bagian RLS (setelah policy playlist), tambahkan:

```sql
alter table public.testimonials enable row level security;

drop policy if exists "public read visible testimonials" on public.testimonials;
create policy "public read visible testimonials"
  on public.testimonials for select
  using (is_visible = true);
```

- [ ] **Step 3: Verifikasi SQL bisa dibaca (lint ringan)**

Migrasi diterapkan manual di Supabase SQL Editor (pola repo ini — kolom baru disebut "applied manually post-deploy"). Tidak ada test otomatis untuk SQL. Pastikan tidak ada typo dengan membaca ulang file.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/2026-07-10_testimonials.sql supabase/schema.sql
git commit -m "feat(db): testimonials table + RLS (hidden by default)"
```

---

## Task 2: Logika murni testimoni (types + validate) — TDD

**Files:**
- Create: `src/lib/testimonials/types.ts`
- Create: `src/lib/testimonials/validate.ts`
- Test: `src/lib/testimonials/__tests__/validate.test.ts`

**Interfaces:**
- Produces:
  - `MAX_REVIEW_WORDS = 400`, `ANON_LABEL = 'Anonim'`
  - `countWords(s: string): number`
  - `validateReview(input: Partial<ReviewInput>): { ok: true; value: NormalizedReview } | { ok: false; error: string }`
  - `publicAuthorName(t: { authorName: string; isAnonymous: boolean }): string`
  - `toPublicTestimonial(row: TestimonialRow): PublicTestimonial`
  - Types: `ReviewInput`, `NormalizedReview`, `TestimonialRow`, `PublicTestimonial`

- [ ] **Step 1: Tulis tipe bersama**

Create `src/lib/testimonials/types.ts`:

```ts
/** What the client sends when submitting/editing a review. */
export interface ReviewInput {
  rating: number
  body: string
  authorName: string
  isAnonymous: boolean
}

/** Validated + normalized review, safe to persist. */
export interface NormalizedReview {
  rating: number
  body: string
  authorName: string
  isAnonymous: boolean
}

/** Raw DB row shape (subset used by the app). */
export interface TestimonialRow {
  id: string
  rating: number
  body: string
  author_name: string
  is_anonymous: boolean
  template_id: string
  is_visible: boolean
  created_at: string
}

/** Public-facing shape after masking, for the landing cards. */
export interface PublicTestimonial {
  id: string
  rating: number
  body: string
  author: string      // already resolved: real name OR "Anonim"
  templateId: string
}
```

- [ ] **Step 2: Tulis test yang gagal dulu**

Create `src/lib/testimonials/__tests__/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  countWords,
  validateReview,
  publicAuthorName,
  toPublicTestimonial,
  MAX_REVIEW_WORDS,
  ANON_LABEL,
} from '../validate'

describe('countWords', () => {
  it('is 0 for empty / whitespace', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n  ')).toBe(0)
  })
  it('collapses runs of whitespace', () => {
    expect(countWords('hello   world')).toBe(2)
    expect(countWords('  a b   c ')).toBe(3)
  })
})

describe('validateReview', () => {
  const base = { rating: 5, body: 'Undangannya bagus banget', authorName: 'Aria & Kirana', isAnonymous: false }

  it('rejects rating outside 1..5', () => {
    expect(validateReview({ ...base, rating: 0 }).ok).toBe(false)
    expect(validateReview({ ...base, rating: 6 }).ok).toBe(false)
    expect(validateReview({ ...base, rating: 2.5 }).ok).toBe(false)
  })
  it('rejects empty body', () => {
    expect(validateReview({ ...base, body: '   ' }).ok).toBe(false)
  })
  it(`rejects body over ${MAX_REVIEW_WORDS} words`, () => {
    const tooLong = Array.from({ length: MAX_REVIEW_WORDS + 1 }, () => 'kata').join(' ')
    expect(validateReview({ ...base, body: tooLong }).ok).toBe(false)
  })
  it('accepts a valid review and trims/normalizes', () => {
    const r = validateReview({ ...base, body: '  bagus sekali  ' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.body).toBe('bagus sekali')
      expect(r.value.rating).toBe(5)
      expect(r.value.isAnonymous).toBe(false)
    }
  })
  it('falls back to ANON_LABEL when author name is blank', () => {
    const r = validateReview({ ...base, authorName: '   ' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.authorName).toBe(ANON_LABEL)
  })
})

describe('publicAuthorName', () => {
  it('masks anonymous reviewers', () => {
    expect(publicAuthorName({ authorName: 'Aria & Kirana', isAnonymous: true })).toBe(ANON_LABEL)
  })
  it('shows the name otherwise', () => {
    expect(publicAuthorName({ authorName: 'Aria & Kirana', isAnonymous: false })).toBe('Aria & Kirana')
  })
})

describe('toPublicTestimonial', () => {
  it('masks the author for anonymous rows', () => {
    const pub = toPublicTestimonial({
      id: 'x', rating: 5, body: 'keren', author_name: 'Aria & Kirana',
      is_anonymous: true, template_id: 'solary', is_visible: true, created_at: '2026-07-10',
    })
    expect(pub).toEqual({ id: 'x', rating: 5, body: 'keren', author: ANON_LABEL, templateId: 'solary' })
  })
})
```

- [ ] **Step 3: Jalankan test — pastikan GAGAL**

Run: `npm run test -- src/lib/testimonials`
Expected: FAIL (module `../validate` belum ada).

- [ ] **Step 4: Implementasi minimal**

Create `src/lib/testimonials/validate.ts`:

```ts
import type { ReviewInput, NormalizedReview, TestimonialRow, PublicTestimonial } from './types'

export const MAX_REVIEW_WORDS = 400
export const MAX_REVIEW_CHARS = 4000 // DB safety net
export const ANON_LABEL = 'Anonim'

/** Word count that treats any run of whitespace as one separator. */
export function countWords(s: string): number {
  const t = s.trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

export type ValidateResult =
  | { ok: true; value: NormalizedReview }
  | { ok: false; error: string }

/** Validate + normalize a submitted review. Pure — no I/O. */
export function validateReview(input: Partial<ReviewInput>): ValidateResult {
  const rating = Number(input.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'Beri rating 1–5 bintang dulu.' }
  }
  const body = (input.body ?? '').trim()
  if (!body) return { ok: false, error: 'Isi ulasannya belum ditulis.' }
  if (body.length > MAX_REVIEW_CHARS) {
    return { ok: false, error: 'Ulasannya terlalu panjang.' }
  }
  if (countWords(body) > MAX_REVIEW_WORDS) {
    return { ok: false, error: `Ulasan maksimal ${MAX_REVIEW_WORDS} kata.` }
  }
  const isAnonymous = Boolean(input.isAnonymous)
  const authorName = (input.authorName ?? '').trim().slice(0, 120) || ANON_LABEL
  return { ok: true, value: { rating, body, authorName, isAnonymous } }
}

/** Public display name — masked when the couple chose anonymity. */
export function publicAuthorName(t: { authorName: string; isAnonymous: boolean }): string {
  return t.isAnonymous ? ANON_LABEL : (t.authorName?.trim() || ANON_LABEL)
}

/** Map a DB row to the masked public shape used by the landing cards. */
export function toPublicTestimonial(row: TestimonialRow): PublicTestimonial {
  return {
    id: row.id,
    rating: row.rating,
    body: row.body,
    author: publicAuthorName({ authorName: row.author_name, isAnonymous: row.is_anonymous }),
    templateId: row.template_id,
  }
}
```

- [ ] **Step 5: Jalankan test — pastikan LULUS**

Run: `npm run test -- src/lib/testimonials`
Expected: PASS (semua kasus hijau).

- [ ] **Step 6: Commit**

```bash
git add src/lib/testimonials
git commit -m "feat(testimonials): pure validation + mapping helpers (TDD)"
```

---

## Task 3: Server action submit ulasan (`/profile`)

**Files:**
- Create: `src/app/profile/reviewActions.ts`

**Interfaces:**
- Consumes: `validateReview` dari `@/lib/testimonials/validate`; `createSupabaseServerClient`, `createSupabaseAdminClient`.
- Produces: `submitReview(input): Promise<{ ok: boolean; error?: string }>` — dipakai `ReviewButton` (Task 4).

- [ ] **Step 1: Tulis server action**

Create `src/app/profile/reviewActions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { validateReview } from '@/lib/testimonials/validate'

export interface SubmitReviewResult { ok: boolean; error?: string }

/**
 * Upsert (one per invitation) the caller's review. The invitation must be
 * owned by the session user AND paid. Every write forces is_visible=false so a
 * new or edited review re-enters admin moderation (spec batasan #2 & #3).
 */
export async function submitReview(input: {
  invitationId: string
  rating: number
  body: string
  authorName: string
  isAnonymous: boolean
}): Promise<SubmitReviewResult> {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Kamu harus masuk dulu.' }

    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations')
      .select('id, owner_user_id, is_paid, template_id')
      .eq('id', input.invitationId)
      .maybeSingle()) as {
      data: { id: string; owner_user_id: string | null; is_paid: boolean; template_id: string | null } | null
    }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan.' }
    if (!inv.is_paid) return { ok: false, error: 'Ulasan hanya bisa diberikan setelah undangan dibayar.' }

    const v = validateReview(input)
    if (!v.ok) return { ok: false, error: v.error }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin.from('testimonials') as any).upsert(
      {
        invitation_id: inv.id,
        user_id: user.id,
        rating: v.value.rating,
        body: v.value.body,
        author_name: v.value.authorName,
        is_anonymous: v.value.isAnonymous,
        template_id: inv.template_id ?? 'classic',
        is_visible: false, // always back to the moderation queue
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'invitation_id' },
    )
    if (error) {
      console.error('[submitReview]', error)
      return { ok: false, error: 'Gagal menyimpan ulasan. Coba lagi sebentar lagi.' }
    }

    revalidatePath('/profile')
    revalidatePath('/')
    return { ok: true }
  } catch (e) {
    console.error('[submitReview]', e)
    return { ok: false, error: 'Terjadi kesalahan tak terduga. Coba lagi.' }
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (tidak ada error tipe baru).

- [ ] **Step 3: Commit**

```bash
git add src/app/profile/reviewActions.ts
git commit -m "feat(testimonials): submitReview server action (owner + is_paid, hidden)"
```

---

## Task 4: Tombol + modal ulasan di `/profile`

**Files:**
- Create: `src/app/profile/ReviewButton.tsx`
- Modify: `src/app/profile/page.tsx`

**Interfaces:**
- Consumes: `submitReview` (Task 3); `coupleDisplay`, `deriveCoupleFromConfig` dari `@/lib/meta/couple`.
- Produces: `<ReviewButton invitationId defaultName existing />` dengan `existing: { rating: number; body: string; isAnonymous: boolean; isVisible: boolean } | null`.

- [ ] **Step 1: Tulis komponen tombol + modal**

Create `src/app/profile/ReviewButton.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { submitReview } from './reviewActions'
import { countWords, MAX_REVIEW_WORDS } from '@/lib/testimonials/validate'

interface Existing { rating: number; body: string; isAnonymous: boolean; isVisible: boolean }

export default function ReviewButton({
  invitationId,
  defaultName,
  existing,
}: {
  invitationId: string
  defaultName: string
  existing: Existing | null
}) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [body, setBody] = useState(existing?.body ?? '')
  const [name, setName] = useState(defaultName)
  const [anon, setAnon] = useState(existing?.isAnonymous ?? false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const words = countWords(body)
  const over = words > MAX_REVIEW_WORDS

  async function submit() {
    setBusy(true); setErr(null)
    const res = await submitReview({ invitationId, rating, body, authorName: name, isAnonymous: anon })
    setBusy(false)
    if (res.ok) { setSaved(true); setOpen(false) } else setErr(res.error || 'Gagal')
  }

  const statusChip = existing
    ? (existing.isVisible ? 'Tampil di web' : 'Menunggu ditinjau')
    : null

  if (!open) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <button type="button" onClick={() => setOpen(true)} style={triggerBtn}>
          {existing || saved ? 'Ubah Ulasan' : 'Beri Ulasan'}
        </button>
        {(statusChip || saved) && (
          <span style={chip}>{saved && !existing ? 'Menunggu ditinjau' : statusChip}</span>
        )}
      </span>
    )
  }

  return (
    <div style={scrim} role="dialog" aria-modal="true" onClick={() => !busy && setOpen(false)}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>Bagikan pengalamanmu</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 14px' }}>
          Ceritakan bagaimana undangannya membantu harimu — ulasan yang bagus membantu pasangan lain memutuskan.
        </p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }} aria-label="Rating bintang">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} bintang`}
              style={{ ...starBtn, color: (hover || rating) >= n ? 'var(--color-gold, #E0A400)' : 'var(--border-strong, #ccc)' }}
            >★</button>
          ))}
        </div>

        <label style={lbl}>Ulasan
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Tulis pengalamanmu di sini…"
            style={{ ...ctl, height: 'auto', padding: 10, resize: 'vertical', fontStyle: 'normal' }}
          />
        </label>
        <div style={{ fontSize: 12, color: over ? 'var(--status-error)' : 'var(--text-muted)', marginTop: -4, marginBottom: 10 }}>
          {words}/{MAX_REVIEW_WORDS} kata
        </div>

        <label style={lbl}>Nama tampil
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={anon} style={{ ...ctl, opacity: anon ? 0.5 : 1 }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '10px 0 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
          Samarkan nama saya (tampil sebagai “Anonim”)
        </label>

        {err && <p style={{ color: 'var(--status-error)', fontSize: 13, margin: '10px 0 0' }}>{err}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" disabled={busy} onClick={() => setOpen(false)} style={ghost}>Batal</button>
          <button type="button" disabled={busy || rating === 0 || !body.trim() || over} onClick={submit} style={{ ...solid, opacity: (busy || rating === 0 || !body.trim() || over) ? 0.5 : 1 }}>
            {busy ? 'Menyimpan…' : 'Kirim ulasan'}
          </button>
        </div>
      </div>
    </div>
  )
}

const triggerBtn: React.CSSProperties = { height: 36, padding: '0 16px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-primary)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }
const chip: React.CSSProperties = { fontSize: 11, color: 'var(--text-secondary)', background: 'var(--border-subtle)', padding: '3px 8px', borderRadius: 'var(--radius-pill)' }
const scrim: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 1000 }
const card: React.CSSProperties = { width: '100%', maxWidth: 460, background: '#fff', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', boxShadow: '0 20px 60px rgba(42,33,24,0.20)', padding: 22 }
const lbl: React.CSSProperties = { display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-muted)' }
const ctl: React.CSSProperties = { height: 44, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: '#fff', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box', fontStyle: 'normal' }
const solid: React.CSSProperties = { height: 44, padding: '0 20px', borderRadius: 'var(--radius-pill)', border: 'none', background: 'var(--color-charcoal)', color: 'var(--surface-warm)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghost: React.CSSProperties = { height: 44, padding: '0 18px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }
```

- [ ] **Step 2: Wire ke profile page**

Di `src/app/profile/page.tsx`:

(a) Tambah import:
```tsx
import { coupleDisplay, deriveCoupleFromConfig } from '@/lib/meta/couple'
import ReviewButton from './ReviewButton'
import { toPublicTestimonial } from '@/lib/testimonials/validate' // not needed here; remove if unused
```
(Hanya perlu `coupleDisplay`, `deriveCoupleFromConfig`, `ReviewButton`.)

(b) Ubah query invitations untuk ikut ambil `config`:
```tsx
const { data: rows } = (await admin
  .from('invitations')
  .select('id, slug, template_id, is_paid, expires_at, config')
  .eq('owner_user_id', user.id)
  .order('created_at', { ascending: false })) as {
  data: { id: string; slug: string; template_id: string | null; is_paid: boolean; expires_at: string | null; config: any }[] | null
}
```

(c) Setelah `const invitations = rows ?? []`, ambil testimoni existing untuk map status:
```tsx
const paidIds = invitations.filter((i) => i.is_paid).map((i) => i.id)
const reviewByInv = new Map<string, { rating: number; body: string; isAnonymous: boolean; isVisible: boolean }>()
if (paidIds.length) {
  const { data: myReviews } = (await (admin.from('testimonials') as any)
    .select('invitation_id, rating, body, is_anonymous, is_visible')
    .in('invitation_id', paidIds)) as {
    data: { invitation_id: string; rating: number; body: string; is_anonymous: boolean; is_visible: boolean }[] | null
  }
  for (const r of myReviews ?? []) reviewByInv.set(r.invitation_id, { rating: r.rating, body: r.body, isAnonymous: r.is_anonymous, isVisible: r.is_visible })
}
```

(d) Di dalam `.map((inv) => { ... })`, di dalam `<span style={itemActions}>`, setelah tombol "Buka dashboard", tambahkan (hanya untuk yang sudah bayar):
```tsx
{inv.is_paid && (
  <ReviewButton
    invitationId={inv.id}
    defaultName={coupleDisplay(deriveCoupleFromConfig(inv.config)) || inv.slug}
    existing={reviewByInv.get(inv.id) ?? null}
  />
)}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Verifikasi di browser (preview)**

Jalankan dev server. Buka `/profile` sebagai user yang punya undangan **berbayar**:
- Tombol "Beri Ulasan" muncul HANYA pada undangan berbayar.
- Klik → modal terbuka; pilih bintang; ketik ulasan (penghitung kata jalan; tombol nonaktif bila 0 bintang / kosong / >400 kata).
- Centang "Samarkan nama" → input nama redup.
- Kirim → modal tutup, chip "Menunggu ditinjau" muncul, tombol jadi "Ubah Ulasan".
- Konfirmasi isi textarea/preview TIDAK italic.

- [ ] **Step 5: Commit**

```bash
git add src/app/profile/ReviewButton.tsx src/app/profile/page.tsx
git commit -m "feat(testimonials): review button + modal on /profile (paid only)"
```

---

## Task 5: Moderasi admin (`/admin/testimonials`)

**Files:**
- Create: `src/app/admin/testimonials/page.tsx`
- Create: `src/app/admin/testimonials/actions.ts`
- Create: `src/app/admin/testimonials/ModerationRow.tsx`
- Modify: `src/app/admin/layout.tsx`

**Interfaces:**
- Consumes: `requireAdmin`, `createSupabaseAdminClient`, `useAdminConfirm` (dari `@/components/admin/AdminDialogProvider`).
- Produces: `setTestimonialVisible(id, visible): Promise<{ ok; error? }>`, `deleteTestimonial(id): Promise<{ ok; error? }>`.

- [ ] **Step 1: Tulis admin server actions**

Create `src/app/admin/testimonials/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'

type Result = { ok: boolean; error?: string }

async function guard(): Promise<boolean> {
  try { await requireAdmin(); return true } catch { return false }
}

export async function setTestimonialVisible(id: string, visible: boolean): Promise<Result> {
  if (!(await guard())) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('testimonials') as any).update({ is_visible: visible }).eq('id', id)
  if (error) { console.error('[setTestimonialVisible]', error); return { ok: false, error: 'Gagal menyimpan.' } }
  revalidatePath('/admin/testimonials')
  revalidatePath('/')
  return { ok: true }
}

export async function deleteTestimonial(id: string): Promise<Result> {
  if (!(await guard())) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { error } = await db.from('testimonials').delete().eq('id', id)
  if (error) { console.error('[deleteTestimonial]', error); return { ok: false, error: 'Gagal menghapus.' } }
  revalidatePath('/admin/testimonials')
  revalidatePath('/')
  return { ok: true }
}
```

- [ ] **Step 2: Tulis row aksi (client)**

Create `src/app/admin/testimonials/ModerationRow.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminConfirm } from '@/components/admin/AdminDialogProvider'
import { setTestimonialVisible, deleteTestimonial } from './actions'

export interface AdminTestimonial {
  id: string
  rating: number
  body: string
  authorName: string
  isAnonymous: boolean
  templateId: string
  isVisible: boolean
  slug: string | null
  createdAt: string
}

export default function ModerationRow({ t }: { t: AdminTestimonial }) {
  const confirm = useAdminConfirm()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    await setTestimonialVisible(t.id, !t.isVisible)
    setBusy(false)
    router.refresh()
  }
  async function remove() {
    const ok = await confirm({ title: 'Hapus testimoni?', message: 'Testimoni ini akan dihapus permanen.', confirmLabel: 'Hapus', tone: 'danger' })
    if (!ok) return
    setBusy(true)
    await deleteTestimonial(t.id)
    setBusy(false)
    router.refresh()
  }

  return (
    <tr style={{ borderTop: '0.5px solid var(--border-default)' }}>
      <td style={td}>
        <div style={{ fontWeight: 500 }}>
          {t.authorName}
          {t.isAnonymous && <span style={badge}>akan tampil Anonim</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.slug ?? '—'} · {t.templateId}</div>
      </td>
      <td style={{ ...td, whiteSpace: 'nowrap' }} aria-label={`${t.rating} bintang`}>
        <span style={{ color: 'var(--color-gold, #E0A400)' }}>{'★'.repeat(t.rating)}</span>
        <span style={{ color: 'var(--border-strong, #ccc)' }}>{'★'.repeat(5 - t.rating)}</span>
      </td>
      {/* Body: NEVER italic (global constraint). */}
      <td style={{ ...td, fontStyle: 'normal', maxWidth: 380 }}>{t.body}</td>
      <td style={{ ...td, whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" disabled={busy} onClick={toggle} style={btn}>
            {t.isVisible ? 'Sembunyikan' : 'Munculkan'}
          </button>
          <button type="button" disabled={busy} onClick={remove} style={{ ...btn, color: 'var(--status-error)' }}>Hapus</button>
        </div>
      </td>
    </tr>
  )
}

const td: React.CSSProperties = { padding: '12px 10px', fontSize: 14, verticalAlign: 'top' }
const badge: React.CSSProperties = { marginLeft: 8, fontSize: 11, color: 'var(--text-secondary)', background: 'var(--surface-sunken)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }
const btn: React.CSSProperties = { height: 36, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }
```

- [ ] **Step 3: Tulis halaman admin (server)**

Create `src/app/admin/testimonials/page.tsx`:

```tsx
import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import ModerationRow, { type AdminTestimonial } from './ModerationRow'

export default async function AdminTestimonialsPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const filter = searchParams.filter === 'visible' ? 'visible' : searchParams.filter === 'pending' ? 'pending' : 'all'
  const db = createSupabaseAdminClient()
  let query = (db.from('testimonials') as any)
    .select('id, rating, body, author_name, is_anonymous, template_id, is_visible, created_at, invitations(slug)')
    .order('created_at', { ascending: false })
  if (filter === 'pending') query = query.eq('is_visible', false)
  if (filter === 'visible') query = query.eq('is_visible', true)
  const { data } = (await query) as { data: any[] | null }

  const rows: AdminTestimonial[] = (data ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    authorName: r.author_name,
    isAnonymous: r.is_anonymous,
    templateId: r.template_id,
    isVisible: r.is_visible,
    slug: r.invitations?.slug ?? null,
    createdAt: r.created_at,
  }))

  const tab = (key: string, label: string) => (
    <Link
      href={`/admin/testimonials${key === 'all' ? '' : `?filter=${key}`}`}
      style={{ fontSize: 13, padding: '6px 12px', borderRadius: 'var(--radius-pill)', textDecoration: 'none', background: filter === key ? 'var(--color-charcoal)' : 'transparent', color: filter === key ? 'var(--surface-warm)' : 'var(--text-primary)', border: '0.5px solid var(--border-default)' }}
    >{label}</Link>
  )

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Testimoni</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
        Testimoni baru default tersembunyi. Klik “Munculkan” hanya untuk yang layak tampil di landing.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tab('all', 'Semua')}
        {tab('pending', 'Menunggu')}
        {tab('visible', 'Tampil')}
      </div>
      {rows.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Belum ada testimoni.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--text-muted)' }}>
              <th style={{ padding: '0 10px 8px' }}>Penulis</th>
              <th style={{ padding: '0 10px 8px' }}>Rating</th>
              <th style={{ padding: '0 10px 8px' }}>Ulasan</th>
              <th style={{ padding: '0 10px 8px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => <ModerationRow key={t.id} t={t} />)}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Tambah nav + badge di admin layout**

Di `src/app/admin/layout.tsx`:

(a) Setelah blok `pendingRefunds`, tambahkan hitungan menunggu:
```tsx
const { count: pendingTestimonials } = (await (db.from('testimonials') as any)
  .select('id', { count: 'exact', head: true }).eq('is_visible', false)) as { count: number | null }
```
(b) Tambah entri nav (mis. setelah `['/admin/invitations', 'Undangan']`):
```tsx
['/admin/testimonials', 'Testimoni'],
```
(c) Perluas logika badge agar mencakup testimoni:
```tsx
const badge = href === '/admin/payments' ? (pendingRefunds ?? 0)
  : href === '/admin/testimonials' ? (pendingTestimonials ?? 0)
  : 0
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Verifikasi di browser (preview)**

Sebagai admin (MFA/AAL2), buka `/admin/testimonials`:
- Badge "Testimoni" di sidebar menampilkan jumlah menunggu.
- Testimoni yang dikirim di Task 4 muncul dengan status Menunggu.
- Tab Menunggu/Tampil/Semua memfilter.
- "Munculkan" mengubah status → langsung tampil di landing (Task 6).
- "Hapus" memunculkan dialog `AdminDialogProvider` (bukan popup browser).
- Baris anonim menampilkan nama asli + badge "akan tampil Anonim".
- Kolom ulasan TIDAK italic.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/testimonials src/app/admin/layout.tsx
git commit -m "feat(admin): testimonials moderation (show/hide/delete) + nav badge"
```

---

## Task 6: Landing DB-driven + bintang + expand + empty-state

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/marketing/Testimonials.tsx`
- Modify: `src/components/marketing/Testimonials.module.css`
- Modify: `src/lib/i18n/dictionaries/landing.ts`

**Interfaces:**
- Consumes: `toPublicTestimonial` dari `@/lib/testimonials/validate`; `PublicTestimonial` dari `@/lib/testimonials/types`.
- Produces: `<Testimonials t={...} items={PublicTestimonial[]} />`.

- [ ] **Step 1: i18n — buang `items`, tambah empty-state (id + en)**

Di `src/lib/i18n/dictionaries/landing.ts`, pada `id.testimonials` GANTI blok `items: [...]` menjadi tiga key string, sehingga jadi:

```ts
testimonials: {
  heading: 'Kata Mereka Yang Berbahagia',
  subheading: 'Dari pasangan yang undangannya sudah lebih dulu disebar.',
  emptyHeading: 'Ceritamu bisa jadi yang pertama',
  emptyBody: 'Belum ada ulasan yang tayang. Buat undanganmu, rasakan sendiri di hari bahagiamu, lalu jadilah pasangan pertama yang berbagi kesan di sini.',
  emptyCta: 'Mulai Rancang Undangan',
},
```

Dan pada `en.testimonials` samakan strukturnya:

```ts
testimonials: {
  heading: 'Word From the Newlyweds',
  subheading: 'From couples whose invitations are already out in the world.',
  emptyHeading: 'Your story could be the first',
  emptyBody: 'No reviews are live yet. Create your invitation, live your big day with it, then be the first couple to share how it felt.',
  emptyCta: 'Start Designing',
},
```

(Hapus seluruh array `items` di kedua bahasa. Parity test akan memaksa kedua sisi identik.)

- [ ] **Step 2: Jalankan parity test — pastikan tetap hijau**

Run: `npm run test -- src/lib/i18n`
Expected: PASS (key id/en identik).

- [ ] **Step 3: Fetch di landing page**

Di `src/app/page.tsx`:

(a) Tambah import:
```tsx
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { toPublicTestimonial } from '@/lib/testimonials/validate'
import type { PublicTestimonial } from '@/lib/testimonials/types'
```
(b) Di dalam `HomePage`, sebelum `return`, ambil testimoni tampil (aman bila Supabase mati → array kosong):
```tsx
let testimonials: PublicTestimonial[] = []
try {
  const db = createSupabaseAdminClient()
  const { data } = (await (db.from('testimonials') as any)
    .select('id, rating, body, author_name, is_anonymous, template_id, is_visible, created_at')
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(30)) as { data: any[] | null }
  testimonials = (data ?? []).map(toPublicTestimonial)
} catch { testimonials = [] }
```
(c) Teruskan ke komponen:
```tsx
<Testimonials t={t.landing.testimonials} items={testimonials} />
```

- [ ] **Step 4: Komponen Testimonials — bintang, expand, empty-state**

Ganti isi `src/components/marketing/Testimonials.tsx` menjadi:

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import type { Dict } from '@/lib/i18n'
import type { PublicTestimonial } from '@/lib/testimonials/types'
import { useReveal } from '@/hooks/useReveal'
import styles from './Testimonials.module.css'

const INITIAL = 6

function Stars({ n }: { n: number }) {
  return (
    <div className={styles.stars} aria-label={`${n} dari 5 bintang`}>
      {'★★★★★'.split('').map((_, i) => (
        <span key={i} className={i < n ? styles.starOn : styles.starOff}>★</span>
      ))}
    </div>
  )
}

export function Testimonials({ t, items }: { t: Dict['landing']['testimonials']; items: PublicTestimonial[] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? items : items.slice(0, INITIAL)
  const hasItems = items.length > 0

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.ambient} aria-hidden="true"><div className={styles.wash} /></div>

      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`}>
        <header className={styles.head}>
          <span className={styles.kicker}>TESTIMONIALS</span>
          <h2 className={styles.heading}>{hasItems ? t.heading : t.emptyHeading}</h2>
          <p className={styles.subheading}>{hasItems ? t.subheading : t.emptyBody}</p>
        </header>

        {hasItems ? (
          <>
            <div className={styles.grid}>
              {shown.map((item, i) => (
                <motion.article
                  key={item.id}
                  className={styles.card}
                  initial={{ opacity: 0, y: 30 }}
                  animate={revealed ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.9, delay: (i % INITIAL) * 0.15, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Stars n={item.rating} />
                  <span className={styles.quoteMark}>“</span>
                  {/* Body: NEVER italic (global constraint). */}
                  <blockquote className={styles.quote}>{item.body}</blockquote>
                  <footer className={styles.cardFooter}>
                    <div className={styles.authorGroup}>
                      <div className={styles.monogram}>
                        {item.author.split('&')[0].trim().charAt(0)}
                        {item.author.split('&')[1]?.trim().charAt(0)}
                      </div>
                      <div className={styles.authorInfo}>
                        <cite className={styles.author}>{item.author}</cite>
                        <span className={styles.plan}>{item.templateId}</span>
                      </div>
                    </div>
                  </footer>
                </motion.article>
              ))}
            </div>
            {items.length > INITIAL && (
              <div className={styles.expandRow}>
                <button type="button" className={styles.expandBtn} onClick={() => setExpanded((v) => !v)}>
                  {expanded ? 'Tampilkan lebih sedikit' : `Lihat lebih banyak (${items.length - INITIAL})`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={styles.empty}>
            <a href="/#vibe" className={styles.emptyCta}>{t.emptyCta}</a>
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 5: CSS — matikan italic, tambah bintang / expand / empty**

Di `src/components/marketing/Testimonials.module.css`:

(a) Ubah `.quote` — **hilangkan italic**:
```css
.quote {
  font-family: var(--font-heading);
  font-style: normal; /* GLOBAL CONSTRAINT: testimonial body must never be italic */
  font-size: clamp(16px, 1.8vw, 18px);
  line-height: var(--leading-relaxed);
  color: var(--color-charcoal);
  margin: 0;
  font-weight: var(--weight-regular);
  flex: 1;
}
```

(b) Tambahkan di akhir file:
```css
.stars {
  display: flex;
  gap: 3px;
  font-size: 16px;
  line-height: 1;
  letter-spacing: 2px;
}
.starOn { color: var(--color-gold); }
.starOff { color: var(--border-subtle); }

.expandRow {
  display: flex;
  justify-content: center;
  margin-top: clamp(28px, 4vw, 40px);
}
.expandBtn {
  height: 44px;
  padding: 0 24px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--color-charcoal);
  font-family: var(--font-body);
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.3s var(--ease-out), color 0.3s var(--ease-out);
}
.expandBtn:hover { background: var(--color-charcoal); color: var(--color-cream); }

.empty {
  display: flex;
  justify-content: center;
  margin-top: clamp(24px, 4vw, 36px);
}
.emptyCta {
  height: 52px;
  display: inline-flex;
  align-items: center;
  padding: 0 32px;
  border-radius: var(--radius-pill);
  background: var(--color-coral);
  color: var(--color-cream);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: var(--weight-semibold);
  letter-spacing: 0.04em;
  text-decoration: none;
  transition: transform 0.3s var(--ease-out);
}
.emptyCta:hover { transform: translateY(-2px); }
```

(Catatan: `.wash` dirujuk di JSX `ambient`; kelas ini sudah ada di file asli — jangan hapus.)

- [ ] **Step 6: Guardrail token + typecheck + test**

Run: `npm run check:tokens`
Expected: PASS (tak ada radius/height off-scale — `44`/`52`/`--radius-pill` valid).

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run test`
Expected: PASS (parity + validate hijau).

- [ ] **Step 7: Verifikasi di browser (preview)**

Buka landing `/`:
- Saat belum ada testimoni tampil → muncul heading + copy ajakan + tombol CTA (BUKAN testimoni palsu).
- Setelah admin memunculkan 1 testimoni (Task 5) → kartu muncul dengan **bintang**, isi **tegak (tidak italic)**, nama/label template. Yang anonim tampil "Anonim".
- Bila >6 tampil → tombol "Lihat lebih banyak" muncul dan meng-expand sisanya.
- Cek dark/responsive tidak rusak.

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx src/components/marketing/Testimonials.tsx src/components/marketing/Testimonials.module.css src/lib/i18n/dictionaries/landing.ts
git commit -m "feat(landing): DB-driven testimonials with stars, expand + empty-state (no italic body)"
```

---

## Self-Review

**Spec coverage:**
- Submit di /profile gated is_paid → Task 3 + 4. ✓
- Satu ulasan per undangan + editable + edit re-hide → `unique(invitation_id)` (Task 1) + upsert `is_visible=false` (Task 3). ✓
- 400 kata → `validateReview` (Task 2) + counter UI (Task 4). ✓
- Anonimisasi → `is_anonymous` (Task 1), checkbox (Task 4), `publicAuthorName`/`toPublicTestimonial` (Task 2), admin badge (Task 5), masking landing (Task 6). ✓
- Moderasi show/hide + default hidden → Task 5 + default kolom (Task 1). ✓
- Badge nav → Task 5. ✓
- Landing bintang + 6+expand + empty-state marketing (tanpa palsu) → Task 6. ✓
- Isi tidak italic → `.quote{font-style:normal}` (Task 6), `fontStyle:'normal'` di modal (Task 4) & admin row (Task 5). ✓
- RLS publik `is_visible=true` → Task 1. ✓

**Placeholder scan:** tidak ada TBD/TODO; setiap step berisi kode nyata.

**Type consistency:** `PublicTestimonial` (id, rating, body, author, templateId) konsisten dipakai Task 2/6. `submitReview` input konsisten dengan `ReviewButton`. `AdminTestimonial` didefinisikan di `ModerationRow` dan dipakai `page.tsx` Task 5. `setTestimonialVisible`/`deleteTestimonial` konsisten action↔row.

**Catatan penerapan DB:** migrasi (Task 1) diterapkan manual di Supabase sebelum Task 3–6 diuji end-to-end (pola repo: kolom/tabel baru di-apply manual).
