-- 020_rls_team_progress_logs.sql
-- Add author-scoped UPDATE and DELETE on team_progress_logs. The
-- original (001) only had a SELECT and an INSERT policy, so a member
-- could never correct a typo.
--
-- Members can update their own log entry within 24 hours of creation.
-- They can also delete their own entry. Admin can do anything. The
-- author_id, team_id, and created_at fields are immutable on update.

create policy progress_team_update on public.team_progress_logs
  for update to authenticated
  using (
    author_id = auth.uid()
    and created_at > now() - interval '24 hours'
  )
  with check (
    author_id = auth.uid()
    and team_id = (select team_id from public.team_progress_logs t2 where t2.id = team_progress_logs.id)
  );

create policy progress_team_delete on public.team_progress_logs
  for delete to authenticated
  using (author_id = auth.uid());

create or replace function public.team_progress_logs_guard_immutable() returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.author_id is distinct from old.author_id
     or new.team_id is distinct from old.team_id
     or new.created_at is distinct from old.created_at
  then
    raise exception 'team_progress_logs immutable fields cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists team_progress_logs_guard_immutable on public.team_progress_logs;
create trigger team_progress_logs_guard_immutable
  before update on public.team_progress_logs
  for each row execute function public.team_progress_logs_guard_immutable();
