-- ============================================================================
--  2026-10-28 — SECURITY AUDIT FIXES (cross-tenant read + public quota RPC)
--
--  Run in: Supabase Dashboard → SQL Editor → New query → Run.
--  Idempotent — safe to run more than once (REVOKE/GRANT/ALTER are repeatable).
--
--  Neither fix changes app behaviour: every invitations read and every
--  increment_guest_quota_extra call in src/ goes through the service-role admin
--  client, which keeps its own explicit grants. The anon/authenticated clients
--  are only used for auth.getUser() / sessions.
-- ============================================================================


-- ----------------------------------------------------------------------------
--  #1 — Any signed-in account could read every column of every PUBLISHED
--  invitation (owner email, checkin_token, password_hash, payment fields,
--  config). The "public read published invitations" row policy has no TO
--  clause, so it applies to `authenticated` too, and 2026-06-03_security_
--  hardening only narrowed the COLUMNS for `anon`. Permissive policies are
--  OR-ed, so "owners can read their invitation" did not narrow anything.
--
--  Fix: give `authenticated` the same column set as `anon`. The row policies
--  stay as they are (the guestbook/playlist public-read policies only need
--  invitations.id + is_published in their EXISTS subquery).
--
--  checkin_token values may already have been read: rotate them (dashboard →
--  Buku Tamu → ganti QR, or `update invitations set checkin_token = null` and
--  let ensureCheckinToken mint fresh ones) after applying this.
-- ----------------------------------------------------------------------------
revoke select on public.invitations from authenticated;
grant  select (id, is_published) on public.invitations to authenticated;

-- Defense-in-depth: the Data API never uses these, and RLS does not apply to
-- TRUNCATE. 2026-10-25_explicit_table_grants already deliberately omits them.
revoke truncate, trigger, references on public.invitations from anon, authenticated;


-- ----------------------------------------------------------------------------
--  #2 — increment_guest_quota_extra() is SECURITY DEFINER and was callable by
--  anon + authenticated via POST /rest/v1/rpc/increment_guest_quota_extra
--  (advisor lints 0028 + 0029): anyone could add guest quota to any invitation
--  for free, or erase a couple's purchased add-on. Same pattern as rl_hit in
--  2026-06-07_audit_followup. Only the webhook / recheck / admin flows
--  (service_role) may call it.
-- ----------------------------------------------------------------------------
revoke execute on function public.increment_guest_quota_extra(uuid, integer) from public, anon, authenticated;
grant  execute on function public.increment_guest_quota_extra(uuid, integer) to service_role;
alter function public.increment_guest_quota_extra(uuid, integer) set search_path = public;

-- Same lint: mark_invitation_used() is a SECURITY DEFINER trigger function.
-- Triggers check EXECUTE only at CREATE TRIGGER time, so revoking it from API
-- roles does not stop the trigger from firing.
revoke execute on function public.mark_invitation_used() from public, anon, authenticated;


-- ============================================================================
--  VERIFY (each should return ZERO rows after running)
-- ============================================================================
-- 1. authenticated can read only id + is_published on invitations:
--      select privilege_type, column_name from information_schema.column_privileges
--      where table_name = 'invitations' and grantee = 'authenticated'
--        and column_name not in ('id', 'is_published');
--
-- 2. no API role can EXECUTE the quota RPC:
--      select grantee from information_schema.role_routine_grants
--      where routine_name = 'increment_guest_quota_extra'
--        and grantee in ('anon', 'authenticated', 'PUBLIC');
--
-- Then: Dashboard → Advisors → Security should no longer list
-- increment_guest_quota_extra or mark_invitation_used under lints 0028/0029.
-- ============================================================================
