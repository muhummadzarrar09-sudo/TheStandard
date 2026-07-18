-- 015_rls_device_sessions.sql
-- Harden device_sessions RLS. The original (001) was "for all" which let a
-- member revoke or un-revoke their own sessions, change device_id, or
-- change user_id.
--
-- Members can only SELECT their own sessions. Writes are server-only
-- (the register-device Edge Function uses the service role, and the
-- /api/devices DELETE handler uses the service role to mark revoked_at).

drop policy if exists sessions_self on public.device_sessions;

create policy device_sessions_self_select on public.device_sessions
  for select to authenticated
  using (user_id = auth.uid());

-- No INSERT, UPDATE, or DELETE policy for members. The service role
-- bypasses RLS and handles all writes via Edge Functions and admin API
-- routes.

-- Defense in depth: a BEFORE UPDATE trigger that rejects any change
-- from a non-service, non-admin caller. Even if a future policy
-- loosening leaves an UPDATE path, the trigger stops the row.
create or replace function public.device_sessions_guard() returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  raise exception 'device_sessions are server-managed; members cannot modify them'
    using errcode = '42501';
end $$;

drop trigger if exists device_sessions_guard_update on public.device_sessions;
create trigger device_sessions_guard_update
  before update on public.device_sessions
  for each row execute function public.device_sessions_guard();

drop trigger if exists device_sessions_guard_delete on public.device_sessions;
create trigger device_sessions_guard_delete
  before delete on public.device_sessions
  for each row execute function public.device_sessions_guard();
