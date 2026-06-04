-- ============================================================================
--  OWNER CASCADE — delete auth user ⇒ delete their invitation(s) + all data
--
--  Problem this fixes:
--    Login authenticates against Supabase Auth (`auth.users`), NOT the
--    `public.invitations` table. Deleting an invitation row left the auth
--    user alive, so the email could still log in ("not synced").
--
--  Fix:
--    Make `auth.users` the source of truth for an account's existence.
--    Change invitations.owner_user_id FK from ON DELETE SET NULL → CASCADE.
--    Because every child table (rsvps, gift_confirmations, guestbook_notes,
--    playlist_songs, attendances, guests, plan_upgrades, password_reset_tokens)
--    is already ON DELETE CASCADE from invitations, deleting one auth user
--    now tears down the whole tree:
--
--      auth.users  ─cascade→  invitations  ─cascade→  rsvps / gifts / guests / …
--
--  After this, deleting a user in
--    Supabase Dashboard → Authentication → Users → Delete user
--  removes their invitation(s) and all associated data in one shot.
--
--  ⚠  NOTE: one account can own MANY invitations (owner_user_id is not unique).
--     Deleting that user deletes ALL of their invitations. That is the intended
--     "delete account" semantic — be sure before deleting.
--
--  Idempotent. Run in: Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================

do $$
declare
  fk_name text;
begin
  -- Find the existing FK constraint on invitations.owner_user_id (whatever it
  -- was auto-named), regardless of its current ON DELETE action.
  select con.conname
    into fk_name
  from pg_constraint con
  join pg_attribute att
    on att.attrelid = con.conrelid
   and att.attnum   = any(con.conkey)
  where con.conrelid = 'public.invitations'::regclass
    and con.contype  = 'f'
    and att.attname  = 'owner_user_id'
  limit 1;

  if fk_name is not null then
    execute format('alter table public.invitations drop constraint %I', fk_name);
  end if;

  -- Re-add it with ON DELETE CASCADE.
  alter table public.invitations
    add constraint invitations_owner_user_id_fkey
    foreign key (owner_user_id)
    references auth.users(id)
    on delete cascade;
end $$;

-- ============================================================================
--  Verify — should report 'c' (cascade) in confdeltype:
--    select conname, confdeltype
--    from pg_constraint
--    where conrelid = 'public.invitations'::regclass
--      and contype = 'f'
--      and conname = 'invitations_owner_user_id_fkey';
--
--  Optional cleanup — orphaned invitations from PRE-cascade deletes
--  (owner_user_id went NULL when their auth user was removed earlier).
--  Review before running; this deletes invitations that have no owner:
--    -- select id, slug, owner_email from public.invitations where owner_user_id is null;
--    -- delete from public.invitations where owner_user_id is null;
-- ============================================================================
