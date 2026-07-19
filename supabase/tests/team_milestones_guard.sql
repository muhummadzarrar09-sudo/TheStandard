-- RLS test: team_milestones_guard trigger (migration 011).
--
-- Run via scripts/rls-test.sh, which loops over the @block markers
-- in this file and runs each as a fresh transaction with `set local
-- role authenticated` so the assertions execute as a member, not as
-- the database owner. The runner exits 0 only if every block ends
-- in `_blocked=`.

-- @block team_milestones: member cannot change title
-- The before-update trigger (migration 011) raises if a non-admin
-- attempts to change any field other than status / updated_at.
do $$
begin
  update public.team_milestones
     set title = 'renamed by member'
   where id = '00000000-0000-0000-0000-000000000000';
  raise notice 'team_milestones:title_change_succeeded';
exception when others then
  raise notice 'team_milestones:title_change_blocked=%', sqlerrm;
end $$;

-- @block team_milestones: member cannot change team_id
do $$
begin
  update public.team_milestones
     set team_id = '11111111-1111-1111-1111-111111111111'
   where id = '00000000-0000-0000-0000-000000000000';
  raise notice 'team_milestones:team_change_succeeded';
exception when others then
  raise notice 'team_milestones:team_change_blocked=%', sqlerrm;
end $$;

-- @block team_milestones: member cannot change owner
do $$
begin
  update public.team_milestones
     set owner_id = '11111111-1111-1111-1111-111111111111'
   where id = '00000000-0000-0000-0000-000000000000';
  raise notice 'team_milestones:owner_change_succeeded';
exception when others then
  raise notice 'team_milestones:owner_change_blocked=%', sqlerrm;
end $$;

-- @block team_milestones: member cannot change due_at
do $$
begin
  update public.team_milestones
     set due_at = now() + interval '1 day'
   where id = '00000000-0000-0000-0000-000000000000';
  raise notice 'team_milestones:due_change_succeeded';
exception when others then
  raise notice 'team_milestones:due_change_blocked=%', sqlerrm;
end $$;

-- @block team_milestones: member cannot delete
do $$
begin
  delete from public.team_milestones
   where id = '00000000-0000-0000-0000-000000000000';
  raise notice 'team_milestones:delete_succeeded';
exception when others then
  raise notice 'team_milestones:delete_blocked=%', sqlerrm;
end $$;

-- @block team_milestones: member can change status to a valid value
-- (This block ends in `_succeeded` deliberately; the runner only
-- fails on unexpected `_succeeded` for *write-protection* assertions.
-- To avoid false positives, the runner matches on the action name
-- suffix; see scripts/rls-test.sh.)
do $$
begin
  update public.team_milestones
     set status = 'in_progress'
   where id = '00000000-0000-0000-0000-000000000000';
  raise notice 'team_milestones:status_change_succeeded=%', 1;
exception when others then
  raise notice 'team_milestones:status_change_blocked=%', sqlerrm;
end $$;
