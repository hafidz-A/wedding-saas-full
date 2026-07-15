-- supabase/migrations/2026-07-15_drop_xendit_index.sql
-- Stale duplicate of idx_invitations_gateway_order (same column, post-rename by
-- 2026-07-14_midtrans_gateway.sql) — the old xendit-named index survived the
-- column rename and now just costs write overhead. Idempotent.
drop index if exists idx_invitations_xendit_external;
