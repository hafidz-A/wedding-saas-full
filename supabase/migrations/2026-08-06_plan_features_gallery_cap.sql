-- ============================================================================
-- 2026-08-06 — Plan feature accuracy: the gallery is NOT unlimited.
--
-- `template_plans.features` renders verbatim on the marketing landing
-- (VibePlanCard), so a wrong bullet there is a public claim. The gallery is
-- hard-capped at 30 photos in the editor schemas
-- (galleryMasonry / gallerySpringCoil / solary saturnRing → maxItems: 30, and
-- the editor shows an n/30 counter), so "Galeri unlimited" over-promises.
--
-- Apply in Supabase: SQL Editor → New query → paste this file → Run.
-- Idempotent, safe to re-run.
-- ============================================================================

UPDATE public.template_plans
   SET features = (
         SELECT jsonb_agg(
                  CASE WHEN f::text LIKE '%Galeri unlimited%'
                       THEN '"Galeri foto (sampai 30 foto)"'::jsonb
                       ELSE f END)
           FROM jsonb_array_elements(features) AS f)
 WHERE features::text LIKE '%Galeri unlimited%';
