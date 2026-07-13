# PRD — Wedding Invitation SaaS Wrapper

> **Tujuan dokumen ini:** menjelaskan model SaaS multi-tenant untuk bisnis undangan pernikahan digital, lengkap dengan database, autentikasi, dashboard, API, dan kontrak integrasi. Dokumen ini dirancang agar developer yang sudah punya satu web undangan pernikahan standalone bisa **membungkus** web tersebut dengan lapisan SaaS ini tanpa menulis ulang komponen sectionnya.
>
> **Konteks asal:** sudah ada implementasi referensi di `wedding-saas-next` (Next.js 14 App Router + Supabase). PRD ini adalah ringkasan arsitektural agar bisa dibangun ulang di stack lain bila perlu.
>
> **Pembaca:** developer (full-stack) yang akan membangun project SaaS berikutnya dari nol.

---

## 1. Vision & Goal

### Vision
Satu template undangan pernikahan cinematic premium, dijual ke **N** pasangan. Tiap pasangan mendapat:
- URL publik mereka sendiri (`weddingsite.com/<slug>`)
- Dashboard admin terproteksi password (`weddingsite.com/<slug>/dashboard`)
- Database RSVP dan konfirmasi hadiah pribadi
- Editor block-based untuk menyunting konten sendiri tanpa coding

### Non-goals
- Bukan platform membuat template (template diatur oleh operator SaaS, bukan customer)
- Bukan marketplace multi-vendor
- Bukan CMS umum — domain spesifik untuk pernikahan

### Success criteria
1. Operator bisa onboarding pasangan baru dalam < 2 menit lewat CLI script
2. Pasangan bisa login → edit teks → upload foto → preview → publish dalam satu sesi tanpa bantuan teknis
3. Tamu bisa submit RSVP dan konfirmasi hadiah tanpa registrasi
4. Tiap pasangan **TIDAK BISA** mengakses data pasangan lain meskipun sesi browser sama
5. Penambahan pasangan baru tidak butuh deploy ulang aplikasi

---

## 2. User Personas

| Persona | Akses | Yang dilakukan |
|---|---|---|
| **Operator SaaS** (kamu) | Service role key + CLI scripts | Onboarding pasangan baru, set plan, monitor revenue, custom domain setup |
| **Pasangan / Couple** | Password per-slug → dashboard | Edit konten undangan, upload foto, lihat daftar RSVP & gift confirmation, publish/unpublish |
| **Tamu / Guest** | Tanpa auth, akses URL publik | Lihat undangan, submit RSVP, konfirmasi transfer hadiah, isi guestbook |

---

## 3. Multi-tenant Architecture

```
                            ┌──────────────────────────┐
                            │  Supabase (single DB)    │
                            │  ┌────────────────────┐  │
                            │  │ invitations table  │  │
                            │  │  ─ row: couple A   │  │
                            │  │  ─ row: couple B   │  │
                            │  │  ─ row: couple C   │  │
                            │  │  ...               │  │
                            │  └────────────────────┘  │
                            └────────┬─────────────────┘
                                     │ slug lookup
                  ┌──────────────────┼───────────────────┐
                  │                  │                   │
        ┌─────────▼────────┐ ┌───────▼──────┐  ┌─────────▼────────┐
        │ /rani-adi     │ │ /budi-sari   │  │ /faza-rina       │
        │  (public invite) │ │  (public ..) │  │  (public ..)     │
        └──────────────────┘ └──────────────┘  └──────────────────┘
                  │                  │                   │
        ┌─────────▼────────┐ ┌───────▼──────┐  ┌─────────▼────────┐
        │ /rani-adi/    │ │ /budi-sari/  │  │ /faza-rina/      │
        │   dashboard      │ │   dashboard  │  │   dashboard      │
        │ (password A)     │ │ (password B) │  │ (password C)     │
        └──────────────────┘ └──────────────┘  └──────────────────┘
```

**Prinsip kunci:**
1. **Satu codebase, satu deployment, N pasangan.** Tidak perlu deploy per pasangan.
2. **Satu template visual, banyak variasi tema.** Tema dipilih per pasangan via `template_id`.
3. **Slug = tenant identifier.** Setiap query, mutation, dan sesi cookie scoped ke slug.
4. **Isolation by design.** Cookie sesi pasangan A `path=/A`, jadi browser tidak akan mengirim cookie A ke route pasangan B.

---

## 4. URL & Routing Structure

| Route | Render | Auth | Tujuan |
|---|---|---|---|
| `/` | Server | — | Marketing landing page |
| `/<slug>` | Server | — | Public invitation (full cinematic page) |
| `/<slug>?preview=1` | Server | — | Preview mode (untuk iframe di editor) |
| `/<slug>/dashboard` | Server (login form) atau Client (after auth) | Cookie `session_<slug>` | Admin editor |
| `/api/rsvp` | API (POST) | — | Insert RSVP |
| `/api/gift` | API (POST) | — | Insert gift confirmation |
| `/api/auth/logout` | API (POST) | Cookie | Hapus cookie sesi |
| `/forgot-password` | Server | — | Kirim email reset password ke `owner_email` |

**Premium feature — custom domain:**
- Kolom `invitations.custom_domain` boleh diisi dengan domain user (mis. `rani-adi.com`)
- Middleware (`middleware.ts`) deteksi `host` header → kalau cocok dengan `custom_domain`, rewrite URL ke `/<slug>`
- Vercel custom domain setup di luar scope (dilakukan operator secara manual)

---

## 5. Database Schema (Supabase / Postgres)

### Tabel utama: `invitations`
Satu row = satu pasangan. Kolom `config` menyimpan **seluruh** struktur halaman dalam JSONB.

```sql
create extension if not exists "pgcrypto";
create extension if not exists "citext";

create table public.invitations (
  id              uuid primary key default gen_random_uuid(),
  slug            citext unique not null,                  -- URL identifier
  password_hash   text not null,                           -- bcrypt
  template_id     text not null default 'classic',         -- visual theme
  plan            text not null default 'free',            -- free|basic|premium
  custom_domain   text unique,                             -- premium only
  config          jsonb not null default '{}'::jsonb,      -- seluruh pageConfig
  is_published    boolean not null default false,
  owner_email     text,                                    -- untuk reset password
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  expires_at      timestamptz,                             -- opsional
  constraint slug_length check (char_length(slug) between 3 and 60),
  constraint slug_format check (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$')
);

create index idx_invitations_slug on public.invitations (slug);
create index idx_invitations_plan on public.invitations (plan);

-- Trigger: auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_invitations_updated
  before update on public.invitations
  for each row execute function public.set_updated_at();
```

### Tabel data tamu

```sql
-- RSVP
create table public.rsvps (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_name    text not null,
  attending     boolean not null,
  guest_count   int not null default 1 check (guest_count between 1 and 20),
  meal_choice   text,
  message       text,
  created_at    timestamptz not null default now()
);
create index idx_rsvps_invitation on public.rsvps (invitation_id, created_at desc);

-- Konfirmasi hadiah
create table public.gift_confirmations (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_name    text not null,
  account_used  text not null,
  amount        numeric(14,2),
  currency      text not null default 'IDR',
  message       text,
  status        text not null default 'pending'
                check (status in ('pending','verified','thanked')),
  created_at    timestamptz not null default now()
);
create index idx_gifts_invitation on public.gift_confirmations (invitation_id, created_at desc);

-- Buku tamu (optional)
create table public.guestbook_notes (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_name    text not null,
  message       text not null,
  color         text default 'coral',
  is_approved   boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Playlist usulan tamu (optional)
create table public.playlist_songs (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  song          text not null,
  artist        text,
  suggested_by  text,
  created_at    timestamptz not null default now()
);
```

### Storage bucket

```sql
insert into storage.buckets (id, name, public)
values ('invitation-media', 'invitation-media', true)
on conflict (id) do nothing;
```

Struktur folder: `invitation-media/<invitation_id>/<filename>`

### Row Level Security (RLS)

```sql
alter table public.invitations        enable row level security;
alter table public.rsvps              enable row level security;
alter table public.gift_confirmations enable row level security;
alter table public.guestbook_notes    enable row level security;
alter table public.playlist_songs     enable row level security;

-- Public boleh BACA invitation yang sudah dipublish
create policy "public read published invitations"
  on public.invitations for select
  using (is_published = true);

-- Siapapun boleh INSERT ke form (anonymous)
create policy "anyone can submit rsvp"
  on public.rsvps for insert with check (true);
create policy "anyone can submit gift"
  on public.gift_confirmations for insert with check (true);
create policy "anyone can submit note"
  on public.guestbook_notes for insert with check (true);
create policy "anyone can submit song"
  on public.playlist_songs for insert with check (true);

-- Public boleh BACA guestbook approved + playlist dari invitation published
create policy "public read approved notes"
  on public.guestbook_notes for select
  using (
    is_approved = true and exists (
      select 1 from public.invitations i
      where i.id = guestbook_notes.invitation_id and i.is_published = true
    )
  );
create policy "public read playlist"
  on public.playlist_songs for select
  using (exists (
    select 1 from public.invitations i
    where i.id = playlist_songs.invitation_id and i.is_published = true
  ));

-- rsvps & gift_confirmations TIDAK punya policy SELECT publik.
-- Hanya service_role yang bisa baca (untuk dashboard).
```

**Catatan:** `service_role` key bypass RLS. Backend (dashboard, API routes) gunakan service_role untuk operasi yang butuh akses penuh.

---

## 6. Sistem Autentikasi

### Filosofi
- **TIDAK pakai Supabase Auth (email/password registrasi).** Pasangan tidak perlu daftar — operator yang membuat akun untuk mereka.
- **Satu password per slug.** Disimpan sebagai bcrypt hash di `invitations.password_hash`.
- **HTTP-only cookie scoped per-slug.** Cookie pasangan A `path=/<slug-A>` jadi browser tidak akan kirim cookie ke `/<slug-B>`.

### Flow login
1. User buka `/<slug>/dashboard`
2. Server cek cookie `session_<slug>`:
   - Ada & valid → render dashboard
   - Tidak ada → render `<LoginForm>`
3. User submit password lewat **server action** (`loginAction`)
4. Server:
   - Query `invitations` by slug → ambil `password_hash`
   - `bcrypt.compare(input, password_hash)`
   - Kalau cocok: set cookie `session_<slug>` (value = `password_hash.slice(0, 32)`), HTTP-only, secure, path=`/<slug>`, maxAge 30 hari
   - Redirect ke `/<slug>/dashboard`
   - Kalau salah: redirect ke `/<slug>/dashboard?error=wrongpass`

### Verifikasi sesi (di setiap server action)
```ts
async function requireSession(slug: string) {
  const cookieValue = cookies().get(`session_${slug}`)?.value
  if (!cookieValue) throw new Error('unauthorized')

  const { data } = await supabaseAdmin
    .from('invitations')
    .select('password_hash')
    .eq('slug', slug)
    .single()

  if (!data || cookieValue !== data.password_hash.slice(0, 32)) {
    throw new Error('unauthorized')
  }
}
```

### Logout
- `POST /api/auth/logout` dengan body `{ slug }`
- Server hapus cookie `session_<slug>` (set maxAge=0)

### Hard refresh = force logout (opsional UX)
Untuk mencegah anak kecil/keluarga membuka dashboard tanpa izin:
- Di `DashboardClient.tsx` cek `performance.getEntriesByType('navigation')[0].type === 'reload'`
- Kalau iya, panggil `/api/auth/logout` lalu reload

### Reset password
Tabel tambahan:
```sql
create table public.password_reset_tokens (
  token         text primary key,                          -- random 32 hex
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  expires_at    timestamptz not null,
  used_at       timestamptz,
  created_at    timestamptz not null default now()
);
```

Flow:
1. User submit email di `/forgot-password`
2. Server cari invitation dengan `owner_email = email`
3. Generate token, insert ke `password_reset_tokens` (TTL 1 jam)
4. Kirim email lewat Resend/SendGrid berisi link `https://site/reset?t=<token>`
5. User klik → form password baru → server validasi token belum expired/used → update `password_hash` → mark token used

---

## 7. API Endpoints

Semua route di bawah `app/api/`. Selalu validate payload (zod recommended).

### `POST /api/rsvp`
**Request body:**
```json
{
  "slug": "rani-adi",
  "guest_name": "Budi Santoso",
  "attending": true,
  "guest_count": 2,
  "meal_choice": "beef",
  "message": "Selamat ya!"
}
```

**Server logic:**
1. Look up `invitation_id` from slug
2. Insert ke `rsvps` table (pakai service_role)
3. Return `{ ok: true, id }`

**Edge cases:**
- Slug tidak ada → 404
- Validation gagal → 400 dengan field error
- Plan = free + RSVP count sudah > batas → 403 dengan pesan upgrade

### `POST /api/gift`
Identical pattern, target tabel `gift_confirmations`.

### `POST /api/guestbook` (optional)
Target tabel `guestbook_notes`, set `is_approved=false` kalau couple aktifkan moderasi.

### `POST /api/playlist` (optional)
Target tabel `playlist_songs`.

### `POST /api/auth/logout`
Hapus cookie sesi.

### Server actions (bukan API route)
Untuk operasi yang butuh sesi pasangan, gunakan **Next.js server actions** (lebih simple untuk auth-gated mutations):

- `saveConfigAction(formData)` — upsert `invitations.config`
- `togglePublishAction(formData)` — flip `is_published`
- `uploadAssetAction(formData)` — upload file ke Storage, return public URL
- `updateGiftStatusAction(formData)` — update status `pending → verified → thanked`
- `deleteRsvpAction(formData)` — opsional admin delete

Setiap action **WAJIB** panggil `requireSession(slug)` di awal.

---

## 8. Dashboard

### Layout
```
┌────────────────────────────────────────────────────┐
│ Header: <slug>  [Published/Draft]  [View live →]   │
├────────────────────────────────────────────────────┤
│ Tabs: [Overview] [RSVPs] [Gifts] [Editor]          │
├────────────────────────────────────────────────────┤
│ Tab content                                        │
└────────────────────────────────────────────────────┘
```

### Tab — Overview
- Stat cards: Plan, Template, Custom domain, Created date
- Recent activity (RSVP terbaru, gift terbaru)
- Quick links: View live, Share URL

### Tab — RSVPs
- Stats: Total responses, Attending, Declined, Est. guests
- Search box + filter (All / Attending / Declined)
- Tabel dengan kolom: Name, Attending, Guests, Meal, Message, Received
- Tombol: Refresh, Download CSV
- Sort by created_at desc default

### Tab — Gifts
- Stats: Total confirmations, Total disclosed amount (IDR)
- Search box
- Tabel: Name, Account used, Amount, Message, Received, Status
- Status workflow: `pending → verified → thanked` dengan tombol per row
- Download CSV

### Tab — Editor (block-based)
Layout: section list (kiri) + field editor (kanan) + preview (bawah, full width).

```
┌─────────────────────────────────────────────────────┐
│ Section list  │  Field editor (current section)    │
│  ─ Hero       │  ┌──────────────────────────────┐  │
│  ─ Countdown  │  │ Title:    [____________]     │  │
│  ─ Story      │  │ Subtitle: [____________]     │  │
│  ─ Events     │  │ Photo 1:  [upload ▼]         │  │
│  ─ RSVP       │  │ Photo 2:  [upload ▼]         │  │
│  ─ Gift       │  │ ...                          │  │
│  + Add        │  └──────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│ Preview                                             │
│  [🖥 Desktop] [⬜ Tablet] [📱 Mobile]   [↻ Refresh] │
│  ┌─────────────────────────────────────────┐        │
│  │ iframe of /<slug>?preview=1             │        │
│  └─────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

**Section list (kiri):**
- List section dari `config.sections`
- Drag-reorder (dnd-kit / react-beautiful-dnd)
- Per row: nama, ikon enabled/disabled, hapus
- Tombol "+ Add section" → menu pilih tipe section (Hero, Story, dst)

**Field editor (kanan):**
- Render dinamis berdasar **schema per type section** (lihat section 9)
- Field types: text, textarea, datetime, boolean, select, image upload, image array, object array (untuk events, FAQ, dll.)
- Auto-save **tidak diaktifkan** (terlalu berat karena cinematic section pakai GSAP) — pakai tombol Save eksplisit
- Save = call server action `saveConfigAction(slug, config)` → upsert JSONB ke `invitations.config`
- "Dirty" indicator: ada perubahan belum disave → highlight tombol Save

**Preview (bawah):**
- iframe `/<slug>?preview=1&v=<lastSavedAt>`
- Cache buster `?v=` agar iframe re-fetch data setelah save
- Device mode selector: Desktop (lebar 100%) / Tablet (lebar 768px) / Mobile (lebar 390px)
- Tombol manual refresh

---

## 9. Block-based Editor: Config Structure

### Bentuk `config` (JSONB di `invitations.config`)
```json
{
  "meta": {
    "title": "Rani & Adi — Our Wedding",
    "description": "Cinematic wedding invitation"
  },
  "sections": [
    {
      "id": "hero",
      "type": "hero",
      "enabled": true,
      "theme": "darkLuxury",
      "navLabel": "Top",
      "navHidden": false,
      "props": {
        "coupleName": "Adi & Rani",
        "brideName": "Rani",
        "groomName": "Adi",
        "weddingDate": "2025-11-15T16:00:00",
        "venue": "The Grand Ballroom, Jakarta",
        "gateImage": "https://...jpg",
        "blastPhotos": ["https://...", "..."]
      }
    },
    {
      "id": "countdown",
      "type": "countdown",
      "enabled": true,
      "props": { ... }
    },
    /* ... more sections ... */
  ]
}
```

**Aturan:**
- `id` unik per section (untuk react key + scroll-to anchor)
- `type` harus match key di `sectionRegistry` (mapping type → React component)
- Order array = order render
- `enabled: false` → section diskip
- `props` shape spesifik per `type`

### Schema definition (untuk field editor render dinamis)
Setiap `type` punya schema yang mendeskripsikan field-fieldnya:

```ts
// editor/schemas/hero.ts
export const heroSchema: SectionSchema = {
  type: 'hero',
  label: 'Hero / Gate',
  defaultProps: {
    coupleName: '',
    brideName: '',
    groomName: '',
    weddingDate: '',
    venue: '',
    gateImage: '',
    blastPhotos: [],
  },
  fields: [
    { key: 'coupleName', label: 'Couple name', kind: 'text' },
    { key: 'brideName',  label: 'Bride name',  kind: 'text' },
    { key: 'groomName',  label: 'Groom name',  kind: 'text' },
    { key: 'weddingDate', label: 'Date & time', kind: 'datetime' },
    { key: 'venue',      label: 'Venue',        kind: 'text' },
    { key: 'gateImage',  label: 'Gate image',   kind: 'image' },
    { key: 'blastPhotos', label: 'Blast photos', kind: 'imageArray', max: 12 },
  ],
}
```

Field kinds yang harus didukung editor:
| Kind | UI |
|---|---|
| `text` | `<input type="text">` |
| `textarea` | `<textarea>` |
| `datetime` | `<input type="datetime-local">` |
| `boolean` | toggle switch |
| `select` | dropdown, options dari schema |
| `image` | upload button → POST ke server action → public URL |
| `imageArray` | array dari image dengan add/remove/reorder |
| `objectArray` | array dari sub-object (mis. events, FAQ entries) dengan field nested |

### Tipe section yang harus didukung
Lihat referensi `wedding-saas-next/src/sections/`. Daftar minimum:
- `hero` — landing + countdown gate
- `countdown` — countdown timer
- `ourStory` — story timeline / polaroid stack
- `eventDetails` — ceremony + reception cards
- `brideGroom` — profil pasangan
- `weddingParty` — bridesmaids/groomsmen
- `gallery` (jenis: masonry, helix, spring-coil)
- `schedule` — timeline acara
- `rsvp` — form RSVP
- `weddingGift` — bank/e-wallet accounts + konfirmasi
- `registry` — gift registry external links
- `accommodations` — hotel rekomendasi
- `faq` — pertanyaan umum
- `guestbook` — form + display notes
- `playlist` — Spotify embed / playlist
- `footer` — monogram, hashtag, socials

---

## 10. Bootstrap & Onboarding

### CLI script: `create-invitation.mjs`
Operator jalankan di lokal untuk daftar pasangan baru. Konek langsung ke Supabase (pakai service_role key), TIDAK lewat aplikasi Next.js.

```bash
node scripts/create-invitation.mjs <slug> <password> \
  --bride="Rani Sastrawijaya" \
  --groom="Adi Pratama" \
  --date=2026-11-15T16:00 \
  --venue="The Grand Ballroom, Jakarta" \
  --email=couple@gmail.com \
  --plan=premium
```

Yang dilakukan script:
1. Validate args
2. Hash password (`bcrypt.hash(password, 10)`)
3. Build minimal starter config (Hero + Countdown + Events + RSVP + Gift + Footer)
4. `supabase.from('invitations').upsert({...}, { onConflict: 'slug' })`
5. Print URL publik + URL dashboard

### CLI script: `seed-full-config.mjs`
Setelah row dibuat, populate dengan template lengkap 14 section (Story, Gallery, Schedule, FAQ, dll.). Optional — bisa juga skip dan biarkan pasangan tambah sendiri lewat editor.

### Self-service signup (future)
Sprint berikutnya: ganti CLI dengan form online yang:
1. Pasangan isi slug + email + payment
2. Webhook payment success → trigger row creation
3. Email otomatis berisi password generated

---

## 11. Asset Storage (Supabase Storage)

### Bucket
- Nama: `invitation-media`
- Public: `true` (file URL bisa diakses tanpa auth)
- Folder per invitation: `<invitation_id>/<filename>`

### Upload flow (dari editor)
1. User klik tombol upload di field image
2. File pick → POST ke server action `uploadAssetAction(slug, file)`
3. Server action:
   - `requireSession(slug)`
   - Get `invitation_id` from slug
   - Generate filename: `${Date.now()}-${slugify(file.name)}`
   - Upload via service_role: `supabaseAdmin.storage.from('invitation-media').upload(\`${invitation_id}/${filename}\`, file)`
   - Return public URL: `${SUPABASE_URL}/storage/v1/object/public/invitation-media/${invitation_id}/${filename}`
4. Editor set field value ke URL tersebut, lalu user save

### Format & limit
- Allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Max size: 5MB per file (enforce di client + server)
- Plan free: max 20 images total per invitation
- Plan basic: max 100 images
- Plan premium: unlimited

### Cleanup
Saat invitation dihapus (`cascade delete` di Postgres), file storage **tidak** ikut terhapus otomatis. Bikin cron job mingguan yang:
- List semua folder di storage
- Compare dengan invitation_id yang masih ada
- Delete folder yang yatim

---

## 12. Pricing Plans

| Plan | Harga (Rp) | RSVP cap | Photos cap | Custom domain | Watermark | Multiple gallery types | Analytics |
|---|---|---|---|---|---|---|---|
| **Free** | 0 | 50 | 20 | ❌ | ✓ ("Powered by …") | 1 | basic count |
| **Basic** | 199.000 | 300 | 100 | ❌ | ❌ | 2 | basic count + simple |
| **Premium** | 499.000 | unlimited | unlimited | ✓ | ❌ | all | full + export |

### Penegakan (enforcement)
- **API-level:** Sebelum insert RSVP/gift, count existing rows; kalau over → 403
- **Editor-level:** Disable tombol upload kalau sudah max; tampilkan banner upgrade
- **Render-level:** Watermark muncul di footer kalau plan free
- **Custom domain:** Middleware tolak kalau plan bukan premium

Implementasi:
```ts
// lib/plan-limits.ts
export const PLAN_LIMITS = {
  free:    { rsvps: 50,         photos: 20,         customDomain: false, watermark: true },
  basic:   { rsvps: 300,        photos: 100,        customDomain: false, watermark: false },
  premium: { rsvps: Infinity,   photos: Infinity,   customDomain: true,  watermark: false },
}

export async function assertWithinPlanLimit(slug: string, kind: 'rsvps' | 'photos') {
  const inv = await getInvitation(slug)
  const limit = PLAN_LIMITS[inv.plan][kind]
  const count = await countRows(inv.id, kind)
  if (count >= limit) throw new PlanLimitError(kind, inv.plan, limit)
}
```

---

## 13. Theme / Template System

### Struktur
- Kolom `invitations.template_id` enum: `'classic' | 'modern' | 'garden'`
- Tiap template = preset CSS variables (warna, font, spacing)
- File `src/config/themes.js` definisikan tiap preset
- Provider di app root: `<ThemeProvider value={theme}>` set CSS vars di `:root`

### Contoh `themes.js`
```js
export const themes = {
  classic: {
    '--color-bg':       '#F5EFE3',  // warm cream
    '--color-text':     '#2A2118',
    '--color-accent':   '#E8553E',  // coral
    '--color-gold':     '#D4A24A',
    '--font-display':   "'Cormorant Garamond', serif",
    '--font-body':      "'DM Sans', sans-serif",
  },
  modern: {
    '--color-bg':       '#0D0D0D',
    '--color-text':     '#E8E8E8',
    '--color-accent':   '#C9A961',  // gold on dark
    '--font-display':   "'Playfair Display', serif",
    '--font-body':      "'Inter', sans-serif",
  },
  garden: {
    '--color-bg':       '#EFF2E8',  // sage cream
    '--color-text':     '#2D3E2A',
    '--color-accent':   '#5C8A6E',  // emerald
    '--font-display':   "'Bodoni Moda', serif",
    '--font-body':      "'Manrope', sans-serif",
  },
}
```

### Switching via dashboard
Tab Editor → ada section "Template" → tombol pilih classic/modern/garden → save → update `template_id`.

**Penting:** Section components TIDAK boleh hardcode warna. Selalu pakai CSS variables. Audit semua section sebelum launching multi-template.

---

## 14. Integration Contract — apa yang harus web invitation card sediakan

> **Bagian terpenting** untuk project berikutnya. Kalau web undangannya sudah build standalone, ini checklist apa yang harus diubah agar bisa dibungkus SaaS.

### A. Section components harus "data-driven"
- ❌ Hardcode nama pasangan, tanggal, foto dalam JSX
- ✓ Terima semua data via props
- ✓ Tiap section punya schema (lihat section 9) untuk editor

### B. Halaman utama harus terima `config` external
- Bukan: `import { pageConfig } from './config/pageConfig.js'`
- Tapi: `<InvitationPage config={fetchedConfig} />`

### C. Section renderer dinamis
```jsx
// renderers/SectionRenderer.jsx
const REGISTRY = {
  hero:        lazy(() => import('../sections/Hero')),
  countdown:   lazy(() => import('../sections/Countdown')),
  ourStory:    lazy(() => import('../sections/OurStory')),
  // ...
}

export function SectionRenderer({ sections }) {
  return sections
    .filter((s) => s.enabled)
    .map((s) => {
      const Component = REGISTRY[s.type]
      return Component ? <Component key={s.id} {...s.props} /> : null
    })
}
```

### D. Form sections (RSVP, Gift, Guestbook, Playlist) harus POST ke API
- Terima prop `slug` dari parent
- Submit handler: `fetch('/api/rsvp', { method: 'POST', body: JSON.stringify({ slug, ...formData }) })`
- Tampilkan success state setelah 200, error state setelah 4xx/5xx

### E. Preview mode awareness
- Halaman publik baca query param `?preview=1`
- Kalau `true`: nonaktifkan tracking analytics, jangan kirim notifikasi
- (Sisi server: skip caching jadi data selalu fresh untuk editor)

### F. Asset URL handling
- Jangan asumsi semua image di `/public/`
- Terima URL absolute (Supabase Storage URL) atau relative (`/public/`)
- Image component fallback gracefully kalau URL broken

### G. Theme support
- Semua warna dan font lewat CSS variables di `:root`
- Jangan hardcode color literal di section CSS

### H. Section ID = scroll target
- Tiap section render `<section id={section.id} data-section={section.id}>` 
- Floating navbar pakai ID untuk smooth scroll dan IntersectionObserver

### I. SSR-safe
- Kalau pakai animasi (GSAP, Framer Motion, Three.js), pastikan tidak crash saat SSR
- `'use client'` directive di semua section component (Next.js App Router)
- Window/document access dalam `useEffect`

---

## 15. Tech Stack Requirements

| Layer | Pilihan |
|---|---|
| Framework | Next.js 14+ (App Router) atau Remix |
| Language | TypeScript |
| UI | CSS Modules + CSS variables — **JANGAN** Tailwind/UI library (akan konflik dengan custom theme system) |
| Animation | GSAP + Framer Motion (motion) — sudah optimized untuk cinematic |
| Backend | Supabase (Postgres + Storage + RLS) |
| Hosting | Vercel (recommended) atau Netlify/Cloudflare Pages |
| Auth | bcryptjs + Next.js cookies API (server actions) |
| Form | react-hook-form + zod |
| File upload | Native FormData → Supabase Storage |
| Email | Resend atau SendGrid (untuk reset password) |
| Payment (future) | Midtrans (Indonesia) atau Stripe |

### Environment variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # server-only, NEVER expose
RESEND_API_KEY=re_...                          # optional, untuk email
NEXT_PUBLIC_APP_URL=https://weddingsite.com   # untuk generate absolute URLs
```

---

## 16. Security Checklist

1. ✅ `SUPABASE_SERVICE_ROLE_KEY` HANYA di file server-side. Audit dengan grep: `rg "SUPABASE_SERVICE_ROLE_KEY" src/` — tidak boleh ada di file dengan `'use client'`
2. ✅ Password hashed dengan bcrypt cost ≥ 10
3. ✅ Cookie sesi `httpOnly: true`, `secure: true` di production, `sameSite: 'lax'`
4. ✅ Cookie path scoped ke `/<slug>` (penting!)
5. ✅ RLS enabled di semua tabel
6. ✅ Validate semua input form dengan zod (XSS, injection)
7. ✅ Rate limit API endpoint publik (Vercel Edge Config + Upstash Redis)
8. ✅ CORS strict (hanya allow origin sendiri)
9. ✅ Storage bucket file extension whitelist (image only)
10. ✅ Audit log (optional): log siapa edit apa, kapan

### Threat model — yang HARUS dicegah:
- Pasangan A buka URL `/<slug-B>/dashboard` dengan cookie A → harus 401
- Tamu submit RSVP untuk slug yang `is_published=false` → harus 404
- Anonymous user query `rsvps` table langsung lewat Supabase JS SDK → RLS harus block
- File upload `.exe` atau `.html` (XSS via image src) → reject by mime type
- SQL injection lewat slug input → Postgres prepared statements (Supabase JS sudah handle)

---

## 17. Deployment

### Vercel setup
1. Connect GitHub repo
2. Set environment variables di Vercel project settings
3. Set production branch ke `main`
4. Build command default: `next build`
5. Output: Next.js (server functions)

### Domain setup
- **Default:** subdomain `<your-app>.vercel.app` → tiap slug = `<your-app>.vercel.app/<slug>`
- **Production:** domain sendiri `weddingsite.com` → tiap slug = `weddingsite.com/<slug>`
- **Premium custom domain:**
  - Pasangan beli `rani-adi.com`
  - Pasangan point DNS CNAME ke Vercel
  - Operator add domain di Vercel project + isi `invitations.custom_domain = 'rani-adi.com'`
  - `middleware.ts` rewrite request dengan `host=rani-adi.com` ke path `/rani-adi`

### Middleware sample
```ts
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host')
  if (!host || host.endsWith('weddingsite.com') || host.endsWith('vercel.app')) {
    return NextResponse.next()
  }

  // Custom domain — lookup slug
  const { data } = await supabase
    .from('invitations')
    .select('slug')
    .eq('custom_domain', host)
    .single()

  if (data?.slug) {
    return NextResponse.rewrite(new URL(`/${data.slug}${req.nextUrl.pathname}`, req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|favicon).*)'],
}
```

---

## 18. File Structure Reference

Struktur yang sudah terbukti di `wedding-saas-next`:

```
src/
├── app/
│   ├── layout.tsx                ← Global fonts, body bg
│   ├── page.tsx                  ← Marketing landing
│   ├── [slug]/
│   │   ├── page.tsx              ← Server: fetch invitation, render
│   │   ├── InvitationView.tsx    ← Client wrapper
│   │   ├── not-found.tsx
│   │   └── dashboard/
│   │       ├── page.tsx          ← Server: auth check + loginAction
│   │       ├── LoginForm.tsx
│   │       ├── DashboardClient.tsx
│   │       ├── RsvpsTab.tsx
│   │       ├── GiftsTab.tsx
│   │       └── dashboard.module.css
│   ├── forgot-password/
│   │   └── page.tsx
│   └── api/
│       ├── rsvp/route.ts
│       ├── gift/route.ts
│       └── auth/logout/route.ts
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             ← Public client (anon key, client-side)
│   │   ├── server.ts             ← Server client (anon key, server-side)
│   │   └── admin.ts              ← Service role client (server only!)
│   ├── password.ts               ← bcrypt wrappers
│   └── plan-limits.ts
│
├── sections/                     ← All invitation sections ('use client')
│   ├── Hero/
│   ├── Countdown/
│   ├── OurStory/
│   └── ...
│
├── components/
│   ├── ThemeProvider.tsx
│   ├── FloatingNavbar.jsx
│   ├── BotanicalBorder.tsx
│   └── GlobalBackground.tsx
│
├── config/
│   ├── pageConfig.js             ← Fallback config (untuk demo / dev)
│   ├── sectionRegistry.js        ← Type → React component mapping
│   └── themes.js
│
├── renderers/
│   └── SectionRenderer.jsx       ← Dynamic section render
│
├── editor/
│   ├── EditorRoot.tsx
│   ├── EditorProvider.tsx        ← Context: config state, save, dirty
│   ├── SectionList.tsx
│   ├── FieldEditor.tsx
│   ├── SaveBar.tsx
│   ├── PreviewPane.tsx
│   ├── AddSectionMenu.tsx
│   ├── fields/                   ← Field type components
│   │   ├── TextField.tsx
│   │   ├── TextareaField.tsx
│   │   ├── DatetimeField.tsx
│   │   ├── BooleanField.tsx
│   │   ├── SelectField.tsx
│   │   ├── ImageField.tsx
│   │   ├── ImageArrayField.tsx
│   │   └── ObjectArrayField.tsx
│   ├── schemas/                  ← Schema definition per section type
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── hero.ts
│   │   ├── countdown.ts
│   │   └── ...
│   └── lib/
│       ├── useUpload.ts
│       └── auth.ts
│
└── styles/
    ├── globals.css
    └── tokens.css

scripts/
├── create-invitation.mjs         ← Onboard new couple
├── seed-full-config.mjs          ← Populate row with full template
└── lib/                          ← Shared script helpers

supabase/
└── schema.sql                    ← Database schema (run via SQL Editor)

docs/
└── PRD-saas-wedding-invitations.md   ← This file
```

---

## 19. Sprint Roadmap (suggested order)

### Sprint 0 — Foundation
- Schema setup (Supabase SQL)
- Next.js scaffold
- Public route `/<slug>` baca config dari DB → render
- API rsvp + gift insert
- Auth: password hash + cookie + login form
- Dashboard skeleton (tabs kosong)
- CLI `create-invitation.mjs`

### Sprint 1 — Editor (block-based)
- Section list dengan drag-reorder
- Field editor render dinamis dari schema
- Image upload ke Storage
- Save (server action) + dirty indicator
- Preview iframe dengan device modes (desktop/tablet/mobile)
- Publish toggle

### Sprint 2 — Data views
- RSVP tab: list, filter, search, CSV export
- Gift tab: list, status workflow, total amount
- Refresh button + optimistic updates

### Sprint 3 — Multi-template
- Curate 3 templates: classic, modern, garden
- Theme switcher di dashboard
- Audit semua section pakai CSS variables (tidak hardcode color)

### Sprint 4 — Pricing & limits
- `PLAN_LIMITS` config
- Enforce di API + editor + render
- Stripe / Midtrans integration untuk upgrade
- Webhook payment success → update `invitations.plan`

### Sprint 5 — Premium features
- Custom domain (middleware + Vercel domain setup helper)
- Self-service signup (form online)
- Analytics dashboard (RSVP rate, gift total, visitors)
- Email automation (RSVP confirmation, thank you cards)

### Sprint 6 — Polish & scale
- Audit log (siapa edit apa)
- Rate limiting (Upstash)
- Storage cleanup cron
- SEO meta tags + OG image generation
- Lighthouse performance optimization

---

## 20. Acceptance Checklist (Definition of Done untuk MVP)

- [ ] Operator bisa run `node scripts/create-invitation.mjs ...` dan hasilnya pasangan langsung punya URL aktif
- [ ] Pasangan bisa login dengan password yang diberikan operator
- [ ] Pasangan bisa edit teks Hero, save, lihat perubahan di preview
- [ ] Pasangan bisa upload foto, save, foto muncul di public URL
- [ ] Pasangan bisa publish/unpublish — URL publik 404 saat draft
- [ ] Tamu bisa submit RSVP, data masuk ke tabel `rsvps`
- [ ] Tamu bisa konfirmasi hadiah, data masuk ke `gift_confirmations`
- [ ] Pasangan A buka URL `/<slug-B>/dashboard` → harus tampil login form (cookie A tidak valid untuk B)
- [ ] Pasangan bisa download RSVP list sebagai CSV
- [ ] Email reset password berfungsi
- [ ] Free plan tampilkan watermark di footer
- [ ] Free plan tolak RSVP ke-51

---

## Appendix A — Glossary

| Istilah | Arti |
|---|---|
| **Slug** | URL identifier per pasangan (mis. `rani-adi`) |
| **Tenant** | Satu pasangan = satu tenant |
| **Service role key** | Supabase API key yang bypass RLS (server-only) |
| **Anon key** | Supabase API key untuk client (terbatas RLS) |
| **RLS** | Row Level Security — kebijakan akses per row di Postgres |
| **Config** | JSONB yang menyimpan struktur halaman per pasangan |
| **Section** | Bagian halaman undangan (Hero, RSVP, dll.) |
| **Block** | Sub-komponen dalam section (optional, untuk block-composed sections) |
| **Theme** | Preset CSS variables (warna, font) |
| **Template** | Tema visual yang dipilih per pasangan |
| **Plan** | Tier harga (free/basic/premium) |

---

## Appendix B — Referensi project sumber

Project referensi lengkap ada di:
- **Path lokal:** `c:\Users\arifi\Downloads\wedding-saas-next\`
- **GitHub:** https://github.com/hafidz-A/wedding_invitation_1
- **Schema SQL:** `../Wedding Website Design new/supabase/schema.sql`
- **CLI script:** `scripts/create-invitation.mjs`
- **Editor implementation:** `src/editor/`
- **Section components reference:** `src/sections/`

Untuk project baru: jangan copy-paste seluruh kode — gunakan ini sebagai blueprint dan tulis ulang sesuai stack yang dipilih (bisa juga Next.js lagi tapi lebih clean).

---

**End of PRD.**
