-- ============================================================================
-- 2026-08-06 — Plan feature accuracy: Solary has no ornament switcher.
--
-- `editorSubTabs()` in src/app/[template]/[slug]/dashboard/EditorWorkspace.tsx
-- pushes the 'ornament' sub-tab only when template !== 'solary' (Solary draws
-- its own three.js backdrop, so there is nothing to swap). The Solary plan rows
-- still advertised an ornament switcher; features[] renders verbatim on the
-- marketing landing (VibePlanCard), so that was a public over-claim.
--
-- Lovebirds keeps the ornament wording — there it is true.
--
-- Apply in Supabase: SQL Editor → New query → paste this file → Run.
-- Idempotent, safe to re-run.
-- ============================================================================

UPDATE public.template_plans
   SET features = (
         SELECT jsonb_agg(
                  CASE WHEN f::text LIKE '%ornament switcher%'
                       THEN '"Self-edit (palette switcher included) via dashboard"'::jsonb
                       ELSE f END)
           FROM jsonb_array_elements(features) AS f)
 WHERE template_id = 'solary'
   AND features::text LIKE '%ornament switcher%';
