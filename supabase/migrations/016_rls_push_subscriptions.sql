-- 016_rls_push_subscriptions.sql
-- Harden push_subscriptions RLS. The original (002) was "for all" which
-- let a member rewrite endpoint, p256dh, or auth, or change user_id.
--
-- Members can SELECT and INSERT their own subscriptions. They can
-- UPDATE only the `enabled` flag (toggle on/off). DELETE is denied
-- for members; the server cleans up invalid endpoints on permanent
-- failure.
--
-- All other fields (endpoint, p256dh, auth, device_session_id,
-- last_success_at, last_failure_at) are server-managed.

drop policy if exists push_self on public.push_subscriptions;

create policy push_subscriptions_self_select on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

create policy push_subscriptions_self_insert on public.push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy push_subscriptions_self_update on public.push_subscriptions
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and enabled in (true, false)
  );

-- No DELETE policy. Subscriptions are cleaned up server-side when the
-- underlying device session is revoked or the endpoint is permanently
-- invalid (410/404 from the push provider).

create or replace function public.push_subscriptions_guard_update() returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  -- A member may only flip the `enabled` flag. Any change to
  -- endpoint, p256dh, auth, device_session_id, last_success_at, or
  -- last_failure_at is rejected.
  if new.endpoint is distinct from old.endpoint
     or new.p256dh is distinct from old.p256dh
     or new.auth is distinct from old.auth
     or new.device_session_id is distinct from old.device_session_id
     or coalesce(new.last_success_at, '1970-01-01'::timestamptz) is distinct from coalesce(old.last_success_at, '1970-01-01'::timestamptz)
     or coalesce(new.last_failure_at, '1970-01-01'::timestamptz) is distinct from coalesce(old.last_failure_at, '1970-01-01'::timestamptz)
  then
    raise exception 'push_subscriptions server-managed fields cannot be changed by member'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists push_subscriptions_guard_update on public.push_subscriptions;
create trigger push_subscriptions_guard_update
  before update on public.push_subscriptions
  for each row execute function public.push_subscriptions_guard_update();

create or replace function public.push_subscriptions_guard_delete() returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return old;
  end if;
  raise exception 'push_subscriptions cannot be deleted by member'
    using errcode = '42501';
end $$;

drop trigger if exists push_subscriptions_guard_delete on public.push_subscriptions;
create trigger push_subscriptions_guard_delete
  before delete on public.push_subscriptions
  for each row execute function public.push_subscriptions_guard_delete();
