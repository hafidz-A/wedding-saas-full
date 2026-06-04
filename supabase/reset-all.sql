-- ============================================================================
--  ⚠️  FULL RESET — DESTRUCTIVE, NOT REVERSIBLE  ⚠️
--
--  Wipes EVERYTHING: all public tables + data, all auth users (logins),
--  and all uploaded media. Use to start from a guaranteed-clean state when
--  data/auth has gotten into an inconsistent ("nyangkut") condition.
--
--  HOW TO RUN (Supabase Dashboard → SQL Editor → New query):
--    STEP 1 — run THIS file (reset-all.sql)        ← drops + clears everything
--    STEP 2 — run supabase/schema.sql               ← base tables + RLS + bucket
--    STEP 3 — run the migrations IN THIS ORDER:
--        migrations/20260521_password_reset.sql
--        migrations/20260527_guests.sql
--        migrations/2026-05-29_payments.sql
--        migrations/2026-05-30_attendances.sql
--        migrations/2026-05-30_template_plans.sql
--        migrations/2026-05-31_encrypt_tier1.sql
--        migrations/2026-05-31_encrypt_tier1_drop_plaintext.sql
--        migrations/2026-06-01_rate_limits.sql
--        migrations/2026-06-02_plan_upgrades.sql
--        supabase/migration-auth.sql               ← adds owner_user_id + RLS
--        migrations/2026-06-03_owner_cascade.sql    ← FK → ON DELETE CASCADE
--
--  After that, recreate accounts with:
--    node scripts/create-invitation.mjs <slug> <password> ...
--    node scripts/migrate-to-auth.mjs --apply
--  (and re-seed the dummy screenshot accounts if you use them)
-- ============================================================================

-- ── 1. Drop the entire public schema and recreate it empty ─────────────────
--     This removes every table, view, function, trigger, sequence, and the
--     extensions that schema.sql will recreate (pgcrypto, citext).
drop schema if exists public cascade;
create schema public;

-- Restore the default grants Supabase expects on the public schema.
grant usage  on schema public to postgres, anon, authenticated, service_role;
grant all    on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- ── 2. Wipe all auth users (clears the "email already used" / login state) ──
--     Cascades to auth.identities and auth.sessions automatically.
delete from auth.users;

-- ── 3. Uploaded media — CANNOT be cleared from SQL ─────────────────────────
--     Supabase blocks `delete from storage.objects` (protect_delete trigger).
--     Orphaned files are harmless for this reset, but to remove them:
--       Dashboard → Storage → invitation-media → select all → Delete
--     (the bucket row itself is re-created idempotently by schema.sql)

-- ============================================================================
--  Done. Now run STEP 2 and STEP 3 above. Quick post-rebuild sanity check:
--    select count(*) from public.invitations;   -- expect 0 (or 1 if seed row)
--    select count(*) from auth.users;            -- expect 0
-- ============================================================================
