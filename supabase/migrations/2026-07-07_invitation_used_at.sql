-- supabase/migrations/2026-07-07_invitation_used_at.sql
-- Sticky "was ever used" marker for refund eligibility. Set ONCE (never cleared)
-- the first time a paid invitation gets a guest / RSVP / check-in, via a trigger
-- so no app path can bypass it. Deleting guests can't restore eligibility — the
-- refund verdict reads used_at, not the current (reversible) counts. Idempotent.
alter table public.invitations add column if not exists used_at timestamptz;

create or replace function public.mark_invitation_used()
  returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.invitations
     set used_at = now()
   where id = new.invitation_id and used_at is null and is_paid = true;
  return new;
end;
$$;

drop trigger if exists trg_guests_mark_used on public.guests;
create trigger trg_guests_mark_used after insert on public.guests
  for each row execute function public.mark_invitation_used();

drop trigger if exists trg_rsvps_mark_used on public.rsvps;
create trigger trg_rsvps_mark_used after insert on public.rsvps
  for each row execute function public.mark_invitation_used();

drop trigger if exists trg_attendances_mark_used on public.attendances;
create trigger trg_attendances_mark_used after insert on public.attendances
  for each row execute function public.mark_invitation_used();

-- Backfill: any already-paid invitation that ALREADY has guests/RSVPs/attendances
-- counts as used (earliest paid_at as a stand-in for the unknown first-use time).
update public.invitations i set used_at = coalesce(i.paid_at, now())
where i.used_at is null and i.is_paid = true and (
  exists (select 1 from public.guests g where g.invitation_id = i.id) or
  exists (select 1 from public.rsvps r where r.invitation_id = i.id) or
  exists (select 1 from public.attendances a where a.invitation_id = i.id)
);
