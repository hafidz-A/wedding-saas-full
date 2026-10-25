-- ============================================================================
-- 2026-10-25 — Taman Bunga: the third code template (src/all-templates/taman-bunga).
--
-- Two rows the app needs before anyone can buy it:
--   1. public.templates — display metadata + marketing copy. getTemplates()
--      switches to the DB as soon as the table has ANY row, so without this
--      row the template would be missing from the landing, /templates and
--      onboarding even though the code ships it.
--   2. public.template_plans — Basic + Premium. Without them resolvePlan()
--      finds nothing and checkout refuses the template.
--
-- Prices are copied from the Solary rows as they stand in this database (the
-- /admin Plans editor is the source of truth, so we follow whatever the
-- operator set there), falling back to the original seed prices on a fresh
-- database. Feature bullets are copied too; any "ornament" wording is
-- rewritten, because Taman Bunga has no ornament switcher (its painted
-- garden is the decoration — TEMPLATE_ORNAMENTS['taman-bunga'] = []).
-- Adjust the prices afterwards at /admin/templates if they should differ.
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
  ('taman-bunga', true, 'Taman Bunga', 'wedding', array['painterly','garden','cinematic'], '#E9967D',
   '/templates/taman-bunga/thumb.webp', 2,
   'Lukisan & romantis', 'Painterly & romantic',
   'Berjalan menyusuri taman bunga saat senja, lentera menyala di sepanjang jalan, dan setiap ucapan tamu menerbangkan lampion.',
   'Walk a flower garden at dusk, with lanterns lighting up along the path and every guest wish sending a lantern into the sky.')
on conflict (template_id) do nothing;

-- 2a. Copy the live Solary plans (price, period, quota, compare-at, bullets).
insert into public.template_plans
  (template_id, plan_code, display_name, price_idr, duration_days, features, sort_order, base_guest_quota, compare_at_price_idr)
select
  'taman-bunga', p.plan_code, p.display_name, p.price_idr, p.duration_days,
  coalesce(
    (select jsonb_agg(
              case when f::text ilike '%ornament%'
                   then '"Self-edit (palette switcher included) via dashboard"'::jsonb
                   else f end)
       from jsonb_array_elements(p.features) as f),
    '[]'::jsonb),
  p.sort_order, p.base_guest_quota, p.compare_at_price_idr
from public.template_plans p
where p.template_id = 'solary'
on conflict (template_id, plan_code) do nothing;

-- 2b. Fresh database without Solary rows: the original seed defaults.
insert into public.template_plans
  (template_id, plan_code, display_name, price_idr, duration_days, features, sort_order, base_guest_quota)
values
  ('taman-bunga', 'basic',   'Basic',   149000, 365,
    '["RSVP","Galeri foto (sampai 30 foto)","Palette switcher","Kuota tamu 400 orang","Masa aktif 1 tahun"]'::jsonb, 1, 400),
  ('taman-bunga', 'premium', 'Premium', 299000, null,
    '["Galeri foto (sampai 30 foto)","Palette switcher","Musik","Buku tamu","Kuota tamu 500 orang","Seumur hidup"]'::jsonb, 2, 500)
on conflict (template_id, plan_code) do nothing;
