-- supabase/migrations/2026-07-10_testimonials.sql
-- Customer testimonials: one review per PAID invitation, hidden by default,
-- shown publicly only after an admin flips is_visible. Idempotent.
create table if not exists public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  user_id       uuid not null,                  -- owner (auth.uid) at submit time
  rating        int  not null check (rating between 1 and 5),
  body          text not null check (char_length(body) between 1 and 4000), -- safety net; <=400 words enforced in app
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
