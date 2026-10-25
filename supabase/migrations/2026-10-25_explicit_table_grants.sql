-- 2026-10-25 — Explicit Data API grants for every public table. Idempotent.
--
-- WHY: from 2026-10-30 Supabase stops auto-granting Data API access
-- (anon / authenticated / service_role) to NEW tables in "public". Existing
-- production tables keep their grants, so production is unaffected — but any
-- database rebuilt from these migrations after that date (new project,
-- preview branch, `supabase db reset`) would create every table WITHOUT them,
-- and supabase-js / PostgREST would answer "permission denied".
--
-- WHAT: this file re-states, table by table, the SELECT/INSERT/UPDATE/DELETE
-- privileges production holds today (read from pg_class.relacl and
-- pg_attribute.attacl on 2026-10-25). It runs after every table-creating and
-- hardening migration, so a rebuild ends in exactly production's state.
-- Re-running it on production is a no-op (GRANT of a held privilege does
-- nothing). Row Level Security remains the row-level guard, as before.
--
-- Deliberately NOT granted (production has them only as Supabase's old
-- blanket defaults, and the Data API never uses them): TRUNCATE, TRIGGER,
-- REFERENCES, MAINTAIN.
--
-- RULE FROM NOW ON: a migration that creates a table must grant it in the same
-- file (see CLAUDE.md → Known gotchas). Keep this file in sync if a later
-- migration changes a table's grants.

-- ── Standard tables: full CRUD for all three roles (RLS decides rows) ──
grant select, insert, update, delete on table public.account_deletion_requests to anon, authenticated, service_role;
grant select, insert, update, delete on table public.admin_actions to anon, authenticated, service_role;
grant select, insert, update, delete on table public.app_settings to anon, authenticated, service_role;
grant select, insert, update, delete on table public.attendances to anon, authenticated, service_role;
grant select, insert, update, delete on table public.guests to anon, authenticated, service_role;
grant select, insert, update, delete on table public.legal_documents to anon, authenticated, service_role;
grant select, insert, update, delete on table public.password_reset_tokens to anon, authenticated, service_role;
grant select, insert, update, delete on table public.plan_upgrades to anon, authenticated, service_role;
grant select, insert, update, delete on table public.quota_addons to anon, authenticated, service_role;
grant select, insert, update, delete on table public.rate_limits to anon, authenticated, service_role;
grant select, insert, update, delete on table public.refund_requests to anon, authenticated, service_role;
grant select, insert, update, delete on table public.refunds to anon, authenticated, service_role;
grant select, insert, update, delete on table public.template_plans to anon, authenticated, service_role;
grant select, insert, update, delete on table public.templates to anon, authenticated, service_role;
grant select, insert, update, delete on table public.testimonials to anon, authenticated, service_role;

-- ── Guest-submitted tables: anon INSERT revoked by 2026-06-03_security_hardening
--    (writes go through the server's admin client). ──
grant select, update, delete on table public.gift_confirmations to anon;
grant select, insert, update, delete on table public.gift_confirmations to authenticated, service_role;
grant select, update, delete on table public.guestbook_notes to anon;
grant select, insert, update, delete on table public.guestbook_notes to authenticated, service_role;
grant select, update, delete on table public.playlist_songs to anon;
grant select, insert, update, delete on table public.playlist_songs to authenticated, service_role;
grant select, update, delete on table public.rsvps to anon;
grant select, insert, update, delete on table public.rsvps to authenticated, service_role;

-- ── invitations: hardened by 2026-06-03_security_hardening ──
--    anon: only the (id, is_published) columns, read-only;
--    authenticated: read-only (owners write through the server);
--    service_role: full CRUD (the server's admin client).
grant select (id, is_published) on table public.invitations to anon;
grant select on table public.invitations to authenticated;
grant select, insert, update, delete on table public.invitations to service_role;
