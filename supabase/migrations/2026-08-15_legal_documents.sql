-- ============================================================================
-- 2026-08-15 — Legal documents move to data.
--
-- Backs the /admin/legal editor (Task 3 of this branch): terms, privacy, and
-- refund content, per language, become a DB-overridable row instead of a
-- hardcoded React component. No row yet ⇒ the public pages fall back to the
-- committed default in src/lib/legal/defaults.ts (see getLegalDoc()).
--
-- `revised_at` is the PUBLIC "Terakhir diperbarui" date, formatted per
-- language at render (src/lib/legal/format.ts). `updated_at` moves on every
-- save, including a "perbaikan kecil — jangan ubah tanggal" save that leaves
-- `revised_at` untouched — see the 2026-08-15 admin design doc, section A.2.
--
-- RLS is enabled with NO policies: reads/writes go exclusively through the
-- service-role client (getLegalDoc / the admin server actions), same posture
-- as the other admin-owned tables (refund_requests, app_settings, ...).
--
-- Apply in Supabase: SQL Editor → New query → paste this file → Run.
-- Idempotent, safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.legal_documents (
  doc_type     text NOT NULL CHECK (doc_type IN ('terms', 'privacy', 'refund')),
  lang         text NOT NULL CHECK (lang IN ('id', 'en')),
  content_html text NOT NULL,
  revised_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   text,
  PRIMARY KEY (doc_type, lang)
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only.
