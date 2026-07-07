-- supabase/migrations/2026-07-08_templates_catalog.sql
-- Module 4: operator-editable display metadata + marketing copy for the EXISTING
-- code templates (lovebirds, solary). Templates are code-bound (can't be created
-- from the DB); this table only decorates them. Read by marketing with code
-- fallback; edited at /admin/templates. Idempotent seed (does not clobber edits).
create table if not exists public.templates (
  template_id text primary key,
  enabled     boolean not null default true,
  label       text,
  category    text,
  tags        text[],
  accent      text,
  thumbnail   text,
  sort_order  int not null default 0,
  tagline_id  text, tagline_en text,
  blurb_id    text, blurb_en   text,
  updated_at  timestamptz not null default now()
);
alter table public.templates enable row level security; -- service-role only, like template_plans

insert into public.templates
  (template_id, enabled, label, category, tags, accent, thumbnail, sort_order, tagline_id, tagline_en, blurb_id, blurb_en)
values
  ('lovebirds', true, 'Lovebirds', 'wedding', array['cinematic','elegant','botanical'], '#E8553E',
   '/images/templates/lovebirds-thumb.jpg', 0,
   'Sinematik & hangat', 'Cinematic & warm',
   'Kartu foto polaroid, animasi botanical, dan section lengkap — RSVP, gift, galeri, hingga buku tamu.',
   'Polaroid photo cards, botanical animation, and a complete set of sections — RSVP, gift, gallery, and guestbook.'),
  ('solary', true, 'Solary', 'wedding', array['futuristic','space','3D'], '#6B35A8',
   '/images/templates/solary-thumb.jpg', 1,
   'Futuristik & berani', 'Futuristic & bold',
   'Tata surya 3D, perjalanan antar-planet saat scroll, dan palette switcher yang hidup.',
   'A 3D solar system, an inter-planet scroll journey, and a living palette switcher.')
on conflict (template_id) do nothing;
