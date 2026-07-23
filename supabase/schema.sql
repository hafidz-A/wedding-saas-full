-- ============================================================================
--  WEDDING SAAS — Supabase schema
--  Run this in: Supabase Dashboard → SQL Editor → New query → Run
--
--  Multi-tenant model: ONE template, MANY couples ("invitations").
--  Each couple gets their own slug + public page + admin dashboard.
--
--    weddinggift.com/template          → marketing/showcase (static)
--    weddinggift.com/<slug>            → public invitation (read-only, per-couple)
--    weddinggift.com/<slug>/dashboard  → admin editor (password-protected)
-- ============================================================================

-- Required extensions
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive slugs

-- ============================================================================
--  TABLE: invitations
--  One row = one couple. The `config` JSONB stores the entire pageConfig
--  for that couple (same shape as src/config/pageConfig.js today).
--  We keep the SAME shape so frontend section components stay unchanged —
--  the only difference is config is loaded from DB instead of imported.
-- ============================================================================
create table if not exists public.invitations (
  id              uuid primary key default gen_random_uuid(),
  slug            citext unique not null,                    -- URL: /<slug>
  password_hash   text not null,                             -- bcrypt/argon2 of admin password
  template_id     text not null default 'classic',           -- 'classic'|'modern'|'garden'
  plan            text not null default 'free',              -- 'free'|'basic'|'premium'
  custom_domain   text unique,                               -- premium feature
  config          jsonb not null default '{}'::jsonb,        -- entire pageConfig for this couple
  is_published    boolean not null default false,
  owner_email     text,                                      -- contact for the couple
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  expires_at      timestamptz,                               -- optional (e.g. 1y after wedding)
  -- Free plan caps (enforced by edge-function policies, not DB):
  constraint slug_length check (char_length(slug) between 3 and 60),
  constraint slug_format check (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$')
);

create index if not exists idx_invitations_slug   on public.invitations (slug);
create index if not exists idx_invitations_plan   on public.invitations (plan);

-- Auto-update `updated_at`
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_invitations_updated on public.invitations;
create trigger trg_invitations_updated
  before update on public.invitations
  for each row execute function public.set_updated_at();

-- ============================================================================
--  TABLE: rsvps
--  Guest responses to a couple's RSVP form.
-- ============================================================================
create table if not exists public.rsvps (
  id              uuid primary key default gen_random_uuid(),
  invitation_id   uuid not null references public.invitations(id) on delete cascade,
  guest_name      text not null,
  attending       boolean not null,                          -- yes/no
  guest_count     int not null default 1 check (guest_count between 1 and 20),
  message         text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_rsvps_invitation on public.rsvps (invitation_id, created_at desc);

-- ============================================================================
--  TABLE: gift_confirmations
--  When guests confirm a money transfer / e-wallet gift, this captures it
--  so the couple can thank them personally. Mirrors rsvps structure.
-- ============================================================================
create table if not exists public.gift_confirmations (
  id              uuid primary key default gen_random_uuid(),
  invitation_id   uuid not null references public.invitations(id) on delete cascade,
  guest_name      text not null,
  account_used    text not null,                             -- e.g. "BCA — Rani Sastrawijaya"
  amount          numeric(14,2),                             -- nullable; guest may skip
  currency        text not null default 'IDR',
  message         text,
  status          text not null default 'pending'
                  check (status in ('pending','verified','thanked')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_gifts_invitation on public.gift_confirmations (invitation_id, created_at desc);

-- ============================================================================
--  TABLE: guestbook_notes (optional — for the Guestbook section)
-- ============================================================================
create table if not exists public.guestbook_notes (
  id              uuid primary key default gen_random_uuid(),
  invitation_id   uuid not null references public.invitations(id) on delete cascade,
  guest_name      text not null,
  message         text not null,
  color           text default 'coral',
  is_approved     boolean not null default true,             -- couple can moderate
  created_at      timestamptz not null default now()
);

create index if not exists idx_notes_invitation on public.guestbook_notes (invitation_id, created_at desc);

-- ============================================================================
--  TABLE: playlist_songs (optional — for the Playlist section)
-- ============================================================================
create table if not exists public.playlist_songs (
  id              uuid primary key default gen_random_uuid(),
  invitation_id   uuid not null references public.invitations(id) on delete cascade,
  song            text not null,
  artist          text,
  suggested_by    text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_playlist_invitation on public.playlist_songs (invitation_id, created_at desc);

-- ============================================================================
--  TABLE: testimonials
--  Customer reviews of the product. One row per PAID invitation. Hidden by
--  default; an admin flips is_visible to publish it on the marketing landing.
--  Body is capped at 4000 chars as a safety net (<=400 words enforced in app).
-- ============================================================================
create table if not exists public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  user_id       uuid not null,                             -- owner (auth.uid) at submit time
  rating        int  not null check (rating between 1 and 5),
  body          text not null check (char_length(body) between 1 and 4000),
  author_name   text not null,                             -- display name snapshot
  is_anonymous  boolean not null default false,            -- couple chose to mask their name
  template_id   text not null,                             -- template snapshot at submit time
  is_visible    boolean not null default false,            -- DEFAULT hidden (moderation gate)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (invitation_id)                                   -- one review per invitation
);

create index if not exists idx_testimonials_visible on public.testimonials (is_visible, created_at desc);

drop trigger if exists trg_testimonials_updated on public.testimonials;
create trigger trg_testimonials_updated
  before update on public.testimonials
  for each row execute function public.set_updated_at();

-- ============================================================================
--  STORAGE BUCKET: invitation-media
--  For photo + GIF uploads from the admin editor. One folder per invitation:
--    invitation-media/<invitation_id>/<filename>
--  Run AFTER the tables exist.
-- ============================================================================
-- file_size_limit is the HARD per-file ceiling (12 MB, == MAX_AUDIO_BYTES in
-- src/lib/upload/media.ts). Since uploads go direct-to-Storage via signed URLs,
-- this bucket limit is the un-bypassable backstop; the app also enforces
-- per-type limits (5 MB image / 12 MB audio) in /api/upload/verify.
insert into storage.buckets (id, name, public, file_size_limit)
values ('invitation-media', 'invitation-media', true, 12582912) -- 12 * 1024 * 1024
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

-- ============================================================================
--  ROW LEVEL SECURITY (RLS)
--  We enable RLS on all tables, then add policies that match the auth pattern:
--
--    • PUBLIC READ on `invitations` rows where is_published = true (so the
--      public page can fetch its config). Password-gated edits happen via
--      a Next.js server action that verifies password_hash and uses the
--      service_role key — RLS does NOT need to know about the password.
--
--    • PUBLIC INSERT on rsvps / gift_confirmations / guestbook / playlist
--      (so guests can submit forms without auth). Reads are restricted.
--
--    • Service role (used by the admin dashboard server actions) bypasses
--      RLS — so the dashboard can read/write anything for its invitation.
-- ============================================================================

alter table public.invitations          enable row level security;
alter table public.rsvps                enable row level security;
alter table public.gift_confirmations   enable row level security;
alter table public.guestbook_notes      enable row level security;
alter table public.playlist_songs       enable row level security;
alter table public.testimonials         enable row level security;

-- Public can SELECT published invitations only
drop policy if exists "public read published invitations" on public.invitations;
create policy "public read published invitations"
  on public.invitations for select
  using (is_published = true);

-- Public can INSERT into form tables (no read)
drop policy if exists "anyone can submit rsvp" on public.rsvps;
create policy "anyone can submit rsvp"
  on public.rsvps for insert
  with check (true);

drop policy if exists "anyone can submit gift" on public.gift_confirmations;
create policy "anyone can submit gift"
  on public.gift_confirmations for insert
  with check (true);

drop policy if exists "anyone can submit note" on public.guestbook_notes;
create policy "anyone can submit note"
  on public.guestbook_notes for insert
  with check (true);

drop policy if exists "anyone can submit song" on public.playlist_songs;
create policy "anyone can submit song"
  on public.playlist_songs for insert
  with check (true);

-- Public can read APPROVED guestbook notes + playlist songs of a published invitation
drop policy if exists "public read approved notes" on public.guestbook_notes;
create policy "public read approved notes"
  on public.guestbook_notes for select
  using (
    is_approved = true
    and exists (
      select 1 from public.invitations i
      where i.id = guestbook_notes.invitation_id and i.is_published = true
    )
  );

drop policy if exists "public read playlist" on public.playlist_songs;
create policy "public read playlist"
  on public.playlist_songs for select
  using (
    exists (
      select 1 from public.invitations i
      where i.id = playlist_songs.invitation_id and i.is_published = true
    )
  );

-- Public can read VISIBLE testimonials (approved by an admin). Writes flow
-- through server actions using the service_role key + ownership checks.
drop policy if exists "public read visible testimonials" on public.testimonials;
create policy "public read visible testimonials"
  on public.testimonials for select
  using (is_visible = true);

-- rsvps + gift_confirmations are NOT publicly readable — only the couple
-- (via service_role / dashboard) can read them. Submission is one-way.

-- ============================================================================
--  SEED ROW — example invitation for development
--  Delete or comment out before going to production.
--  Password is "demo1234" — replace with bcrypt/argon2 hash in real use.
-- ============================================================================
insert into public.invitations (slug, password_hash, template_id, plan, is_published, config, owner_email)
values (
  'adi-rani',
  '$2b$10$REPLACE_WITH_REAL_HASH_OF_demo1234',
  'classic',
  'premium',
  true,
  '{}'::jsonb,
  'demo@example.com'
)
on conflict (slug) do nothing;

-- ============================================================================
--  Done. Next steps:
--   1. Verify all tables exist: Dashboard → Table Editor
--   2. Copy your Project URL + anon key + service_role key from Settings → API
--   3. Drop them into the Next.js project's .env.local:
--        NEXT_PUBLIC_SUPABASE_URL=...
--        NEXT_PUBLIC_SUPABASE_ANON_KEY=...
--        SUPABASE_SERVICE_ROLE_KEY=...    (server-only, never expose)
-- ============================================================================
