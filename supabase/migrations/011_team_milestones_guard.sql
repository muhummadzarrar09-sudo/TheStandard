-- 011_team_milestones_guard.sql
-- Fix: milestones_member_update allows any team member to rewrite owner_id,
-- due_at, team_id, or title via a direct .from('team_milestones').update(...)
-- because the with check only verified team membership.
--
-- Solution: a BEFORE UPDATE trigger that rejects changes to non-status
-- columns for non-admin callers. The API route only sends status/updated_at,
-- so this guard never blocks the intended path; it only blocks the
-- privilege-escalation path.

create or replace function public.team_milestones_guard_columns() returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() then
    if new.team_id is distinct from old.team_id
       or new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.owner_id is distinct from old.owner_id
       or new.due_at is distinct from old.due_at
       or new.created_at is distinct from old.created_at then
      raise exception 'team_milestones immutable fields cannot be changed by non-admin'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists team_milestones_guard_columns on public.team_milestones;
create trigger team_milestones_guard_columns
  before update on public.team_milestones
  for each row execute function public.team_milestones_guard_columns();
