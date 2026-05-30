-- ============================================================================
-- 2026-05-30 — template_plans: DB-driven pricing per (template_id, plan_code).
--
-- Source of truth for plan pricing + duration + feature lists. Edited via
-- Supabase Studio → Table Editor, no source-code change required.
--
-- Two plan codes per template:
--   basic   → 1-year active period (duration_days = 365)
--   premium → lifetime (duration_days IS NULL), unlocks the guestbook
--             ("buku tamu") attendance ledger in the dashboard.
--
-- Apply in Supabase: SQL Editor → New query → paste this file → Run.
-- Idempotent (IF NOT EXISTS + ON CONFLICT DO NOTHING), safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_plans (
  template_id   text        NOT NULL,
  plan_code     text        NOT NULL,
  display_name  text        NOT NULL,
  price_idr     numeric(14,0) NOT NULL,
  duration_days int,                                    -- NULL = lifetime
  features      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  sort_order    int         NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (template_id, plan_code),
  CONSTRAINT plan_code_valid CHECK (plan_code IN ('basic', 'premium')),
  CONSTRAINT price_positive  CHECK (price_idr > 0)
);

-- updated_at touch trigger (reuses set_updated_at() from base schema).
DROP TRIGGER IF EXISTS template_plans_set_updated_at ON template_plans;
CREATE TRIGGER template_plans_set_updated_at
  BEFORE UPDATE ON template_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed defaults. ON CONFLICT keeps already-edited prices intact on re-run.
INSERT INTO template_plans
  (template_id, plan_code, display_name, price_idr, duration_days, features, sort_order)
VALUES
  ('lovebirds', 'basic',   'Basic',   149000, 365,
    '["RSVP","Galeri terbatas","Masa aktif 1 tahun"]'::jsonb, 1),
  ('lovebirds', 'premium', 'Premium', 299000, NULL,
    '["Galeri unlimited","Tanpa watermark","Musik","Buku tamu","Seumur hidup"]'::jsonb, 2),
  ('solary',    'basic',   'Basic',   149000, 365,
    '["RSVP","Galeri terbatas","Palette switcher","Masa aktif 1 tahun"]'::jsonb, 1),
  ('solary',    'premium', 'Premium', 299000, NULL,
    '["Galeri unlimited","Palette switcher","Musik","Buku tamu","Seumur hidup"]'::jsonb, 2)
ON CONFLICT (template_id, plan_code) DO NOTHING;

-- RLS: anyone can SELECT (prices are public on /templates), only service
-- role can mutate. The dashboard / checkout / templates page all read; only
-- the operator (you) edits via Supabase Studio with service-role auth.
ALTER TABLE template_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read template_plans" ON template_plans;
CREATE POLICY "public read template_plans"
  ON template_plans FOR SELECT
  TO anon, authenticated
  USING (true);
