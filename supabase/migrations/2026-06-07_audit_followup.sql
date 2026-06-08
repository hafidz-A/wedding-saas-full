-- ============================================================================
--  2026-06-07 — SECURITY AUDIT FOLLOW-UP
--
--  Run in: Supabase Dashboard → SQL Editor → New query → Run.
--  Idempotent — safe to run more than once (REVOKE/GRANT/ALTER are repeatable).
--
--  Closes three findings from the 2026-06-07 re-audit. None change app behaviour:
--  every privileged operation already runs through the service-role admin client,
--  which keeps its own explicit grants (verified against prod before shipping).
-- ============================================================================


-- ----------------------------------------------------------------------------
--  #2 — rl_hit() is a SECURITY DEFINER rate-limit helper meant ONLY for the
--  server/service-role. Supabase exposed it to anon + authenticated via
--  POST /rest/v1/rpc/rl_hit (advisor lints 0028 + 0029), letting a caller
--  inflate arbitrary rate-limit buckets (e.g. block a victim's RSVP submissions)
--  or pump rows into rate_limits. Revoke public callers; keep service_role.
-- ----------------------------------------------------------------------------
revoke execute on function public.rl_hit(text, timestamptz, integer) from anon, authenticated, public;
-- Explicit grant so a future default-privilege change can't strip the server's access.
grant  execute on function public.rl_hit(text, timestamptz, integer) to service_role;


-- ----------------------------------------------------------------------------
--  #3 — Defense-in-depth. anon + authenticated retained table-level
--  INSERT/UPDATE/DELETE on public.invitations (incl. the is_paid, plan,
--  owner_user_id, password_hash columns). Those writes are currently blocked
--  only because invitations has no write RLS policy — one careless future
--  policy would expose payment-bypass / account-takeover via PostgREST.
--  Revoke the raw privilege; all invitation writes go through service_role
--  (which keeps its own grants) so nothing breaks.
-- ----------------------------------------------------------------------------
revoke insert, update, delete on public.invitations from anon, authenticated;


-- ----------------------------------------------------------------------------
--  Bonus (advisor lint 0011) — pin the search_path on the updated_at trigger
--  function so it can't be hijacked via object shadowing in another schema.
-- ----------------------------------------------------------------------------
alter function public.set_updated_at() set search_path = public;


-- ============================================================================
--  VERIFY (all three should return ZERO rows after running)
-- ============================================================================
-- 1. anon/authenticated can no longer EXECUTE rl_hit:
--      select grantee from information_schema.role_routine_grants
--      where routine_name='rl_hit' and grantee in ('anon','authenticated');
--
-- 2. anon/authenticated have no write grant on invitations:
--      select grantee, privilege_type from information_schema.role_table_grants
--      where table_name='invitations' and grantee in ('anon','authenticated')
--        and privilege_type in ('INSERT','UPDATE','DELETE');
--
-- 3. set_updated_at search_path is pinned:
--      select proname, proconfig from pg_proc where proname='set_updated_at';
--      -- proconfig should contain {search_path=public}
-- ============================================================================
