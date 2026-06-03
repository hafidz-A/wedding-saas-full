-- ============================================================================
--  2026-06-03 — SECURITY HARDENING (audit fixes H-1, H-2, L-8)
--
--  Run in: Supabase Dashboard → SQL Editor → New query → Run.
--  Idempotent — safe to run more than once.
--
--  Pairs with app code changes shipped the same day:
--    • src/app/[template]/[slug]/page.tsx now reads invitations + guestbook
--      via the ADMIN (service_role) client, so the public page no longer
--      depends on a broad anon SELECT on `invitations`.
--    • Guest submissions (rsvp / gift / guestbook) already flow exclusively
--      through the service-role API routes — anon no longer needs INSERT.
--
--  ⚠ Apply this AFTER deploying that app code, or logged-out visitors could
--    briefly fail to load public pages.
-- ============================================================================


-- ----------------------------------------------------------------------------
--  H-1 — Stop the anon key from dumping sensitive `invitations` columns.
--
--  The "public read published invitations" RLS policy gates ROWS but not
--  COLUMNS, so anyone with the public anon key could read owner email,
--  owner_user_id, xendit ids, and password_hash for every published row.
--
--  Fix: column-level GRANTs. The row policy stays (the guestbook/playlist
--  public-read policies reference invitations.id + is_published in an EXISTS
--  subquery, which still works with these two columns). Everything sensitive
--  becomes unreadable to anon. The `authenticated` role is untouched — owners
--  still read their own full row via "owners can read their invitation".
-- ----------------------------------------------------------------------------
revoke select on public.invitations from anon;
grant  select (id, is_published) on public.invitations to anon;


-- ----------------------------------------------------------------------------
--  H-2 — Stop anon from writing directly to the form tables.
--
--  The "anyone can submit …" policies used `with check (true)`, letting the
--  anon key INSERT arbitrary rows (any invitation_id, self-approved guestbook
--  notes, no length caps, no rate limit) straight through PostgREST, bypassing
--  the hardened API routes. Since every guest form already POSTs to a
--  service-role API route, anon does not need INSERT at all.
--
--  Belt (drop the permissive policies) + suspenders (revoke the privilege).
--  service_role bypasses RLS and keeps full access, so the API routes are
--  unaffected.
-- ----------------------------------------------------------------------------
drop policy if exists "anyone can submit rsvp" on public.rsvps;
drop policy if exists "anyone can submit gift" on public.gift_confirmations;
drop policy if exists "anyone can submit note" on public.guestbook_notes;
drop policy if exists "anyone can submit song" on public.playlist_songs;

revoke insert on public.rsvps              from anon;
revoke insert on public.gift_confirmations from anon;
revoke insert on public.guestbook_notes    from anon;
revoke insert on public.playlist_songs     from anon;

-- Public READ of approved guestbook notes / playlist (for published rows) is
-- intentionally kept — those policies + their anon SELECT grants remain.


-- ----------------------------------------------------------------------------
--  L-8 — Keep the rate_limits table from growing unbounded.
--  One-off purge now; schedule the recurring job below if pg_cron is enabled.
-- ----------------------------------------------------------------------------
delete from public.rate_limits where window_start < now() - interval '1 day';

-- Optional (requires the pg_cron extension — enable in Database → Extensions):
--   select cron.schedule(
--     'purge-rate-limits',
--     '15 3 * * *',
--     $$delete from public.rate_limits where window_start < now() - interval '1 day'$$
--   );


-- ============================================================================
--  VERIFY
-- ============================================================================
-- 1. anon may read only id + is_published on invitations (expect 2 rows):
--      select grantee, privilege_type, column_name
--      from information_schema.column_privileges
--      where table_name = 'invitations' and grantee = 'anon';
--
-- 2. anon has NO table-level INSERT on the form tables (expect 0 rows):
--      select grantee, privilege_type, table_name
--      from information_schema.role_table_grants
--      where grantee = 'anon'
--        and privilege_type = 'INSERT'
--        and table_name in ('rsvps','gift_confirmations','guestbook_notes','playlist_songs');
--
-- 3. Smoke-test from the app AFTER running:
--      • open a published public invitation while logged OUT  → still loads
--      • submit an RSVP / gift / guestbook note               → still works
--      • dashboard tabs (rsvps/gifts/guests/buku tamu)        → still load
-- ============================================================================
