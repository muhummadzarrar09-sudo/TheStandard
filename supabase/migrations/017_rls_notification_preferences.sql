-- 017_rls_notification_preferences.sql
-- The original policy (005) was "for all" which let a member DELETE
-- their preferences. The API uses upsert, so DELETE is unnecessary.
-- Split per-command, deny DELETE for members.

drop policy if exists notification_preferences_self on public.notification_preferences;

create policy notification_preferences_self_select on public.notification_preferences
  for select to authenticated
  using (user_id = auth.uid());

create policy notification_preferences_self_insert on public.notification_preferences
  for insert to authenticated
  with check (user_id = auth.uid());

create policy notification_preferences_self_update on public.notification_preferences
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No DELETE policy. The API upserts.

-- Defense in depth: explicit deny on DELETE for members.
create or replace function public.notification_preferences_guard_delete() returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return old;
  end if;
  raise exception 'notification_preferences cannot be deleted by member'
    using errcode = '42501';
end $$;

drop trigger if exists notification_preferences_guard_delete on public.notification_preferences;
create trigger notification_preferences_guard_delete
  before delete on public.notification_preferences
  for each row execute function public.notification_preferences_guard_delete();
