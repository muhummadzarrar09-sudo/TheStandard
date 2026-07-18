-- 018_rls_user_weekly_commitments.sql
-- The original policy (006) was "for all" which let a member DELETE
-- their weekly commitment records. The API uses upsert, so DELETE
-- is unnecessary. Split per-command, deny DELETE for members.

drop policy if exists user_commitments_self on public.user_weekly_commitments;

create policy user_weekly_commitments_self_select on public.user_weekly_commitments
  for select to authenticated
  using (user_id = auth.uid());

create policy user_weekly_commitments_self_insert on public.user_weekly_commitments
  for insert to authenticated
  with check (user_id = auth.uid());

create policy user_weekly_commitments_self_update on public.user_weekly_commitments
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No DELETE policy.

create or replace function public.user_weekly_commitments_guard_delete() returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return old;
  end if;
  raise exception 'user_weekly_commitments cannot be deleted by member'
    using errcode = '42501';
end $$;

drop trigger if exists user_weekly_commitments_guard_delete on public.user_weekly_commitments;
create trigger user_weekly_commitments_guard_delete
  before delete on public.user_weekly_commitments
  for each row execute function public.user_weekly_commitments_guard_delete();
