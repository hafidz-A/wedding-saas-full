-- 2026-07-19_app_settings.sql — global operator settings (key/value).
create table if not exists app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Payment mode switch: 'gateway' (Midtrans) | 'manual' (WhatsApp/Email hand-off).
-- Seeded 'gateway' so behaviour is unchanged until an operator flips it.
insert into app_settings (key, value) values
  ('payment', jsonb_build_object(
     'mode', 'gateway',
     'whatsapp', '6285110553938',
     'email', 'fincardsland@gmail.com'
  ))
on conflict (key) do nothing;

-- No anon access; reads/writes go through the service-role admin client only.
alter table app_settings enable row level security;
