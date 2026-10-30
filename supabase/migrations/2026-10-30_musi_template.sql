-- ============================================================================
-- 2026-10-30 — Musi: the fourth code template (src/all-templates/musi).
--
-- A three.js journey: the Rumah Limas → the flight over South Sumatra → the
-- boat ride down the Musi (each landmark pops up, then its card shows) →
-- fireworks over Palembang.
--
-- Two rows the app needs before anyone can buy it:
--   1. public.templates — display metadata + marketing copy. getTemplates()
--      switches to the DB as soon as the table has ANY row, so without this
--      row the template would be missing from the landing, /templates and
--      onboarding even though the code ships it.
--   2. public.template_plans — Basic + Premium. Without them resolvePlan()
--      finds nothing and checkout refuses the template.
--
-- Prices are copied from the Taman Bunga rows as they stand in this database
-- (the /admin Plans editor is the source of truth, so we follow whatever the
-- operator set there), falling back to the original seed prices on a fresh
-- database. Feature bullets are copied too; the gallery size becomes 12 and
-- any "ornament" wording is rewritten, because Musi has no ornament switcher (TEMPLATE_ORNAMENTS.musi
-- = []; its palette recolours the 3D scene instead). Adjust the prices
-- afterwards at /admin/templates if they should differ.
--
-- No new table, so no GRANTs needed (both tables are covered by
-- 2026-10-25_explicit_table_grants.sql).
--
-- Apply in Supabase: SQL Editor → New query → paste this file → Run.
-- Idempotent (ON CONFLICT DO NOTHING), safe to re-run; never clobbers edits.
-- ============================================================================

insert into public.templates
  (template_id, enabled, label, category, tags, accent, thumbnail, sort_order, tagline_id, tagline_en, blurb_id, blurb_en)
values
  ('musi', true, 'Musi', 'wedding', array['3D','palembang','cinematic'], '#8F1D21',
   '/templates/musi/thumb.webp', 3,
   'Palembang & sinematik', 'Palembang & cinematic',
   'Dari Rumah Limas, menyusuri Sungai Musi melewati Ampera yang dibangun di depan mata, sampai kembang api di langit Palembang.',
   'From a Rumah Limas, down the Musi river past an Ampera bridge that builds itself, to fireworks over Palembang.')
on conflict (template_id) do nothing;

-- 2a. Copy the live Taman Bunga plans (price, period, quota, compare-at, bullets).
insert into public.template_plans
  (template_id, plan_code, display_name, price_idr, duration_days, features, sort_order, base_guest_quota, compare_at_price_idr)
select
  'musi', p.plan_code, p.display_name, p.price_idr, p.duration_days,
  coalesce(
    (select jsonb_agg(
              case when f::text ilike '%ornament%'
                   then '"Self-edit (palette switcher included) via dashboard"'::jsonb
                   -- Musi's gallery is one swipeable card of up to 12 photos
                   when f::text ilike '%30 foto%'
                   then to_jsonb(replace(f #>> '{}', '30 foto', '12 foto'))
                   else f end)
       from jsonb_array_elements(p.features) as f),
    '[]'::jsonb),
  p.sort_order, p.base_guest_quota, p.compare_at_price_idr
from public.template_plans p
where p.template_id = 'taman-bunga'
on conflict (template_id, plan_code) do nothing;

-- 2b. Fresh database without Taman Bunga rows: the original seed defaults.
insert into public.template_plans
  (template_id, plan_code, display_name, price_idr, duration_days, features, sort_order, base_guest_quota)
values
  ('musi', 'basic',   'Basic',   149000, 365,
    '["RSVP","Galeri foto (sampai 12 foto)","Palette switcher","Kuota tamu 400 orang","Masa aktif 1 tahun"]'::jsonb, 1, 400),
  ('musi', 'premium', 'Premium', 299000, null,
    '["Galeri foto (sampai 12 foto)","Palette switcher","Musik","Buku tamu","Kuota tamu 500 orang","Seumur hidup"]'::jsonb, 2, 500)
on conflict (template_id, plan_code) do nothing;
