-- ============================================================================
--  2026-10-28 — ONE CODE = ONE RSVP + ONE UCAPAN
--
--  Run in: Supabase Dashboard → SQL Editor → New query → Run.
--  Idempotent — safe to run more than once. Data only: no schema change, no
--  new table (so no GRANT needed).
--
--  The app now tracks a guest code's two uses separately:
--    • guests.rsvp_submitted_at — the code's one RSVP
--    • guests.token_used_at     — the code's one ucapan (guestbook note)
--  Before, an RSVP ALSO stamped token_used_at, so under the new meaning every
--  guest who RSVP'd reads as "ucapan already sent" and can't leave a wish.
--  Under the old rules an RSVP'd guest's token_used_at came from that RSVP
--  (a wish sent first would have blocked the RSVP), so clear it.
--
--  Safe to skip: without it, those guests just can't send an ucapan until the
--  couple regenerates their code. Safe to run late, too.
-- ============================================================================

update public.guests
   set token_used_at = null
 where rsvp_submitted_at is not null
   and token_used_at is not null;

-- VERIFY (should return 0):
--   select count(*) from public.guests
--   where rsvp_submitted_at is not null and token_used_at is not null;
