# Testimoni Pelanggan + Moderasi Admin — Design Spec

- **Tanggal:** 2026-07-10
- **Status:** Disetujui (menunggu review spec) → siap ke writing-plans
- **Topik:** Pelanggan memberi ulasan/rating atas produk yang dibeli; admin menyaring agar tidak ada konten tak pantas tampil di web.

---

## ⛔ Batasan non-negotiable (WAJIB diulang di SETIAP file plan .md)

Aturan ini bukan preferensi — ini kontrak. Setiap plan turunan dari spec ini HARUS mencantumkan ulang batasan ini di dalam file plan-nya sendiri, supaya tidak hilang saat implementasi dipecah per-task:

1. **Isi/kutipan testimoni TIDAK BOLEH miring (italic).** Body text testimoni selalu `font-style: normal` — di kartu landing, di modal review, dan di daftar admin. Hati-hati pada default browser: `<blockquote>`, `<cite>`, dan `<em>` sering italic secara default; `var(--font-voice)` (serif) juga sering dipakai italic pada kutipan. Semua itu WAJIB di-override `font-style: normal`. Author name / label boleh gaya lain, tapi **isi ulasannya tegak**.
2. **Default tersembunyi.** Testimoni baru `is_visible = false`. Tidak ada satu pun testimoni tampil di publik tanpa admin menekan "Munculkan".
3. **Edit mengunci ulang.** Setiap kali pelanggan mengedit testimoninya, `is_visible` otomatis di-set `false` lagi → kembali ke antrean tinjau. Trik "kirim bersih → di-approve → edit jadi kotor" tidak boleh bisa membobol moderasi.
4. **Tidak ada testimoni palsu / seed dummy sebagai fallback.** Saat belum ada ulasan asli yang tampil, section landing menampilkan **copywriting ajakan**, bukan data contoh.

---

## Konteks & masalah

- Section testimoni di landing (`src/components/marketing/Testimonials.tsx`) saat ini **statik** — 3 kutipan hardcoded dari dictionary i18n (`src/lib/i18n/dictionaries/landing.ts`). Bukan dari pelanggan asli.
- Belum ada tabel `testimonials` di database.
- "Pelanggan" = pasangan yang membeli undangan = satu baris `invitations` (punya `owner_user_id`, `is_paid`, `template_id`), dan punya halaman `/profile` yang menampilkan daftar undangannya sebagai kartu.
- Admin console (`/admin/*`) sudah mapan: layout dengan sidebar nav + pola badge "ada notif" (dipakai untuk refund pending), auth via `requireAdmin`, dialog via `AdminDialogProvider` (dilarang popup browser).

Tujuan: pelanggan bisa memberi ulasan+rating atas produk yang dibeli, admin bisa menyaringnya, dan ulasan yang lolos tampil sebagai social proof di landing.

---

## Ringkasan keputusan (sudah dikonfirmasi user)

| Topik | Keputusan |
|---|---|
| Titik masuk submit | Di `/profile`, tombol "Beri Ulasan" pada tiap kartu undangan |
| Siapa boleh menulis | Hanya pemilik undangan yang **sudah bayar** (`is_paid = true`) |
| Isi ulasan | Rating bintang 1–5 + teks ulasan + nama tampil (prefilled dari nama pasangan) |
| Panjang isi | **Maksimal 400 kata** (bukan karakter); divalidasi di form + server action |
| Anonimisasi | Pelanggan bisa memilih **menyamarkan namanya** → tampil sebagai "Anonim". Isi ulasan tetap tampil; hanya nama yang disembunyikan di publik |
| Jumlah ulasan | **Satu per undangan** (`unique(invitation_id)`), boleh diedit |
| Edit | Boleh; konsekuensinya kembali tersembunyi untuk ditinjau ulang |
| Moderasi | Toggle **Munculkan/Sembunyikan** per testimoni oleh admin; default tersembunyi |
| Tampilan publik | **Dengan bintang** (Opsi A), urut terbaru, tampil **6 kartu awal + tombol expand** untuk melihat selebihnya |
| Saat kosong | **Copywriting ajakan** (bukan testimoni palsu) |
| Auto-filter kata kasar | Tidak dibuat (moderasi manual) — YAGNI |

---

## Alur 1 — Pelanggan menulis ulasan (`/profile`)

**Lokasi:** `src/app/profile/page.tsx` — tiap undangan dirender sebagai kartu (`<li>`) dengan deret aksi (Lihat publik, Buka dashboard, Renew/Recheck).

**Perubahan:**
- Tambah tombol **"Beri Ulasan"** di deret aksi, **hanya jika `inv.is_paid === true`**. Kalau sudah pernah menulis, label jadi **"Ubah Ulasan"** dan menampilkan status kecil (mis. "Menunggu ditinjau" / "Tampil di web").
- Tombol membuka **modal review** (client component baru, mis. `ReviewModal.tsx`) berisi:
  - **Star picker 1–5** (wajib).
  - **Textarea** isi ulasan (wajib, **maksimal 400 kata**, dengan penghitung kata langsung + validasi tolak bila lebih). Rendered `font-style: normal`.
  - **Input nama tampil**, prefilled dari nama pasangan di `config` undangan; boleh diubah.
  - **Checkbox "Samarkan nama saya (tampil sebagai Anonim)"** → set `is_anonymous`. Saat dicentang, input nama tampil boleh di-disable/diberi hint bahwa publik akan melihat "Anonim". Isi ulasannya tetap ditampilkan.
  - Tombol Kirim/Simpan + Batal.
- Submit memanggil **server action** (`src/app/profile/reviewActions.ts` atau sejenis) yang:
  1. Ambil user dari session (`supabase.auth.getUser()`).
  2. Verifikasi undangan `invitation_id` dimiliki user (`owner_user_id === user.id`) **dan** `is_paid = true`. Kalau tidak → tolak.
  2b. Validasi isi: **≤ 400 kata** (hitung dengan `body.trim().split(/\s+/).length`), rating 1–5, body tidak kosong. Kalau lebih → tolak dengan pesan.
  3. **Upsert** ke `testimonials` (key `invitation_id`), dengan `is_visible = false` selalu (baik insert maupun update → memenuhi aturan "edit mengunci ulang"), simpan `is_anonymous`, snapshot `template_id` & `author_name`.
  4. `revalidatePath('/profile')` dan `revalidatePath('/')`.

**Catatan model:** satu ulasan per undangan. Kalau satu akun punya beberapa undangan berbayar, dia bisa menulis satu ulasan per undangan.

---

## Alur 2 — Admin menyaring (`/admin/testimonials`)

**Nav:** tambah `['/admin/testimonials', 'Testimoni']` di `src/app/admin/layout.tsx`, dengan **badge** = jumlah testimoni `is_visible = false` (pola sama dengan badge refund pending).

**Halaman `src/app/admin/testimonials/page.tsx` (server component):**
- Ambil semua testimoni via `createSupabaseAdminClient` (join info undangan bila perlu: slug, template).
- Tampilkan sebagai daftar/tabel: nama tampil, template, **bintang**, isi ulasan (tegak, tidak italic), tanggal, status (Menunggu/Tampil). Untuk testimoni `is_anonymous = true`, admin **tetap melihat nama asli** (untuk keperluan moderasi) disertai penanda **"akan tampil Anonim"** — jadi admin bisa menilai, tapi nama tidak bocor ke publik.
- **Filter tab:** Menunggu (`is_visible=false`) / Tampil (`is_visible=true`).
- **Aksi per baris (client component + server action):**
  - **Munculkan / Sembunyikan** → toggle `is_visible`.
  - **Hapus** → hapus baris (untuk spam). Konfirmasi lewat `AdminDialogProvider` (`confirm`), **bukan** `window.confirm`.
- Semua aksi lewat server action yang memanggil `requireAdmin()` lalu mutasi via service_role, kemudian `revalidatePath`.

---

## Alur 3 — Tampil di landing (`Testimonials.tsx`)

**Sumber data:** landing (`src/app/page.tsx`, server component) fetch **semua** testimoni `is_visible = true` (urut `created_at desc`) via admin client / RLS publik, lalu diteruskan ke `Testimonials`. (Kalau nanti jumlahnya besar, tambahkan batas atas mis. 30 — cukup untuk fitur expand.)

**Komponen `Testimonials.tsx`:**
- Kalau **ada** testimoni tampil → render grid kartu **dengan bintang** (Opsi A): baris bintang di atas, kutipan (tegak, `font-style: normal`), footer monogram + nama + label template.
  - **Nama:** kalau `is_anonymous = true` → tampilkan "Anonim" (monogram generik, mis. ikon/"–"); kalau tidak → `author_name` + label template seperti biasa. Isi ulasan tetap tampil di kedua kasus.
  - **Expand:** tampilkan **6 kartu awal**; sisanya disembunyikan di balik tombol **"Lihat lebih banyak"** (state client) yang membuka sisanya. Kalau total ≤ 6, tombol tidak muncul.
- Kalau **kosong** → render **empty-state marketing**: heading + copywriting ajakan ("jadilah salah satu pasangan pertama yang berbagi cerita…") + CTA ke alur buat undangan. **Tidak menampilkan testimoni contoh.**
- Ambang bintang untuk tampil tidak diperlukan di kode publik — kurasi terjadi lewat keputusan admin (admin hanya memunculkan yang layak).

**Dampak i18n:** `landing.testimonials` di `dictionaries/landing.ts` diubah: `items` statik dibuang; ditambah key untuk empty-state (`emptyHeading`, `emptyBody`, `emptyCta`) dalam `id` dan `en`.

**Dampak CSS:** `Testimonials.module.css` — pastikan selector isi kutipan `font-style: normal !important` bila perlu (lihat batasan #1); tambah gaya baris bintang + gaya empty-state.

---

## Data model

Migration baru: `supabase/migrations/2026-07-10_testimonials.sql` (dan mirror di `supabase/schema.sql`).

```sql
create table if not exists public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  user_id       uuid not null,                  -- pemilik (auth.uid) saat submit
  rating        int  not null check (rating between 1 and 5),
  body          text not null check (char_length(body) between 1 and 4000), -- safety net; batas kata (≤400) ditegakkan di app
  author_name   text not null,                  -- nama tampil (snapshot)
  is_anonymous  boolean not null default false, -- pelanggan pilih samarkan nama
  template_id   text not null,                  -- snapshot template saat submit
  is_visible    boolean not null default false, -- DEFAULT sembunyi (batasan #2)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (invitation_id)                         -- satu ulasan per undangan
);

create index if not exists idx_testimonials_visible
  on public.testimonials (is_visible, created_at desc);

drop trigger if exists trg_testimonials_updated on public.testimonials;
create trigger trg_testimonials_updated
  before update on public.testimonials
  for each row execute function public.set_updated_at();

alter table public.testimonials enable row level security;

-- Publik hanya boleh membaca yang sudah tampil
drop policy if exists "public read visible testimonials" on public.testimonials;
create policy "public read visible testimonials"
  on public.testimonials for select
  using (is_visible = true);
-- Tulis (insert/update/delete) hanya lewat server action service_role (bypass RLS)
-- + verifikasi kepemilikan/keadminan di server. Tidak ada policy insert/update publik.
```

**Snapshot `template_id` & `author_name`:** disimpan saat submit supaya query landing murah & stabil walau data undangan berubah kemudian.

---

## Keamanan & anti-abuse

- Submit terautentikasi (Supabase Auth) → penulis terverifikasi sebagai pembeli asli.
- Verifikasi ganda di server action: kepemilikan undangan + `is_paid`.
- `unique(invitation_id)` mencegah spam banyak ulasan.
- Default hidden + edit-re-hide → tidak ada jalan menampilkan konten tanpa persetujuan admin.
- Rahasia service_role tetap hanya di `src/lib/supabase/admin.ts` dan server action (bukan file `'use client'`).

---

## Di luar cakupan (YAGNI, sengaja ditunda)

- Auto-filter kata kasar / daftar kata terlarang (moderasi manual dulu).
- Upload foto/avatar (pakai inisial monogram).
- Email ajakan testimoni pasca-nikah (magic link) — kandidat sprint lanjutan.
- Testimoni per-template di halaman showcase template (cukup di landing dulu).

---

## Daftar perubahan file (peta implementasi)

**Baru:**
- `supabase/migrations/2026-07-10_testimonials.sql` — tabel + RLS.
- `src/app/profile/ReviewModal.tsx` — modal star picker + textarea (client).
- `src/app/profile/reviewActions.ts` — server action submit/upsert (verifikasi owner + is_paid).
- `src/app/admin/testimonials/page.tsx` — daftar + filter (server).
- `src/app/admin/testimonials/ModerationRow.tsx` (atau sejenis) — aksi munculkan/sembunyikan/hapus (client + server action).

**Diubah:**
- `supabase/schema.sql` — mirror tabel baru.
- `src/app/profile/page.tsx` — tombol "Beri Ulasan/Ubah Ulasan" per kartu (gated `is_paid`), muat status ulasan yang ada.
- `src/app/admin/layout.tsx` — nav "Testimoni" + badge jumlah menunggu.
- `src/app/page.tsx` — fetch testimoni tampil, teruskan ke `Testimonials`.
- `src/components/marketing/Testimonials.tsx` — DB-driven + bintang + empty-state marketing (batasan #1 & #4).
- `src/components/marketing/Testimonials.module.css` — baris bintang, empty-state, `font-style: normal` pada isi.
- `src/lib/i18n/dictionaries/landing.ts` — buang `items` statik; tambah key empty-state (id + en).

---

## Keputusan implementasi (sudah dikonfirmasi)

- **Batas panjang isi ulasan: 400 kata** (bukan karakter). DB pakai char cap 4000 sebagai jaring pengaman; batas kata ditegakkan di form (penghitung kata) + server action.
- **Jumlah kartu di landing: 6 awal + expand** ("Lihat lebih banyak") untuk sisanya.
- **Anonimisasi nama:** kolom `is_anonymous` dipilih pelanggan di modal. Publik: nama disamarkan jadi "Anonim" bila true; isi ulasan tetap tampil. Admin tetap melihat nama asli + penanda "akan tampil Anonim".
- **Fetch landing:** server-side via admin client (konsisten dengan `/profile`); policy RLS publik `is_visible = true` tetap dibuat sebagai higiene.
