-- supabase/migrations/2026-07-08_invitation_published_at.sql
-- Sticky "first published" marker for refund eligibility. Set ONCE the first time
-- an invitation is published (never cleared), so publish -> share -> unpublish
-- can't reset the "sudah tayang" signal. The refund verdict measures the grace
-- window from published_at, not from the current (reversible) is_published flag.
-- Idempotent.
alter table public.invitations add column if not exists published_at timestamptz;

create or replace function public.mark_invitation_published()
  returns trigger language plpgsql as $$
begin
  if new.is_published = true and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invitations_published on public.invitations;
create trigger trg_invitations_published before insert or update on public.invitations
  for each row execute function public.mark_invitation_published();

-- Backfill: existing paid invitations were auto-published at payment time, so the
-- earliest known "published" moment is paid_at (a safe stand-in).
update public.invitations set published_at = coalesce(paid_at, now())
where published_at is null and is_paid = true;
