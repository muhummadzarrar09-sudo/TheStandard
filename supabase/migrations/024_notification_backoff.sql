-- 024_notification_backoff.sql
-- Adds next_retry_at + last_error columns to notification_jobs
-- so process-notifications can implement exponential backoff
-- instead of retrying a temporarily-failed job on the next
-- 5-minute tick. Phase 9.
--
-- Backoff schedule (delays after attempt N, in minutes):
--   N=0  -> immediately eligible (next_retry_at = now())
--   N=1  -> 1 minute
--   N=2  -> 5 minutes
--   N=3  -> 30 minutes
--   N=4+ -> permanent (status='failed')
-- 5 attempts is the cap; matches the existing 5-attempt
-- policy. Jitter (+/- 20%) is applied at runtime in the
-- edge function so parallel crons don't synchronize.

alter table public.notification_jobs
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_error text;

-- Backfill: every existing 'queued' row is eligible now.
update public.notification_jobs
  set next_retry_at = coalesce(next_retry_at, scheduled_at)
  where next_retry_at is null;
