-- Rate limiting (abuse protection) for public API routes.
-- Used by src/lib/security/rate-limit.ts via the rl_hit() function below.

create table if not exists public.rate_limits (
  bucket       text        not null,        -- e.g. 'rsvp:203.0.113.5'
  window_start timestamptz not null,        -- start of the fixed window
  count        integer     not null default 0,
  primary key (bucket, window_start)
);

-- No RLS / no policies: this table is only ever touched by the service-role
-- key from server code. Never expose it to the anon client.
alter table public.rate_limits enable row level security;

-- Atomic "increment and tell me if I'm still under the limit". Runs as
-- SECURITY DEFINER so the service role can upsert+increment in one round-trip
-- without a read-modify-write race between concurrent requests.
create or replace function public.rl_hit(p_bucket text, p_window timestamptz, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  c integer;
begin
  insert into public.rate_limits (bucket, window_start, count)
  values (p_bucket, p_window, 1)
  on conflict (bucket, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into c;

  return c <= p_limit;  -- true = request allowed
end;
$$;

-- Optional housekeeping: purge windows older than a day. Schedule via
-- Supabase "Cron" / pg_cron if available, or call manually.
--   delete from public.rate_limits where window_start < now() - interval '1 day';
