-- 008_otp_request_log.sql
-- Optional server-side audit table for OTP request refusals. The request-otp
-- edge function writes here when it rejects a request (cohort closed, unknown
-- email, etc). The client never sees this; ops reads it to detect enumeration
-- sweeps. Insert-only from the service role; no client access.
create table if not exists public.otp_request_log (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  eligible boolean not null,
  requested_at timestamptz not null default now()
);
create index if not exists otp_request_log_email_time
  on public.otp_request_log (email, requested_at desc);
create index if not exists otp_request_log_ineligible
  on public.otp_request_log (requested_at desc) where eligible = false;
alter table public.otp_request_log enable row level security;
-- No policies: no client role can read or write. Only the service role
-- (used by the edge function) bypasses RLS by default.
