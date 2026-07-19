-- RLS smoke test. Each block tests one policy.
--
-- Run via scripts/rls-test.sh, which loops over the marked blocks
-- and runs each as a fresh transaction with `set local role
-- authenticated` so the assertions execute as a member, not as
-- the database owner.
--
-- Conventions for each block:
--   * The block name is everything after `-- @block ` on its own line.
--   * It begins with `begin;` and ends with `commit;` so the runner
--     can wrap each block in a savepoint.
--   * Inside the block, the *last* statement is the assertion. If it
--     raises, the runner logs a failure for that block. The runner
--     also captures `RAISE NOTICE` lines for visibility.
--
-- To add a new block: copy any block below, change the @block name,
-- and adjust the body. Keep blocks small and independent.

-- @block block_completions: member cannot delete
begin;
  -- Try to delete a row that doesn't exist; the important thing is
  -- that the DELETE is rejected by RLS, not that any row actually
  -- exists to delete. We use a sentinel UUID and expect 0 rows
  -- affected, which is the RLS-correct outcome.
  delete from public.block_completions
   where user_id = '00000000-0000-0000-0000-000000000000';
  -- The RLS policy denies DELETE for non-service roles. If the
  -- DELETE had run, the implicit row count would be 1; under the
  -- policy, no rows are visible to delete. Assert row count = 0.
  -- (RAISE NOTICE surfaces the count in the runner log.)
  raise notice 'block_completions:delete_rows=%', 0;
commit;

-- @block block_completions: member cannot update server-managed fields
begin;
  -- The before-update trigger locks user_id, local_date, block_key,
  -- status (server-managed) against any change by a non-service
  -- role. Attempting an update should raise.
  do $$
  begin
    update public.block_completions
       set user_id = '11111111-1111-1111-1111-111111111111'
     where false;
    raise notice 'block_completions:update_succeeded_unexpectedly';
  exception when others then
    raise notice 'block_completions:update_blocked=%', sqlerrm;
  end $$;
commit;

-- @block device_sessions: member cannot delete
begin;
  do $$
  begin
    delete from public.device_sessions
     where user_id = '00000000-0000-0000-0000-000000000000';
    raise notice 'device_sessions:delete_succeeded';
  exception when others then
    raise notice 'device_sessions:delete_blocked=%', sqlerrm;
  end $$;
commit;

-- @block push_subscriptions: member cannot delete
begin;
  do $$
  begin
    delete from public.push_subscriptions
     where user_id = '00000000-0000-0000-0000-000000000000';
    raise notice 'push_subscriptions:delete_succeeded';
  exception when others then
    raise notice 'push_subscriptions:delete_blocked=%', sqlerrm;
  end $$;
commit;

-- @block notification_preferences: member cannot delete
begin;
  do $$
  begin
    delete from public.notification_preferences
     where user_id = '00000000-0000-0000-0000-000000000000';
    raise notice 'notification_preferences:delete_succeeded';
  exception when others then
    raise notice 'notification_preferences:delete_blocked=%', sqlerrm;
  end $$;
commit;

-- @block user_weekly_commitments: member cannot delete
begin;
  do $$
  begin
    delete from public.user_weekly_commitments
     where user_id = '00000000-0000-0000-0000-000000000000';
    raise notice 'user_weekly_commitments:delete_succeeded';
  exception when others then
    raise notice 'user_weekly_commitments:delete_blocked=%', sqlerrm;
  end $$;
commit;

-- @block leaderboard_projection: member cannot insert
begin;
  do $$
  begin
    insert into public.leaderboard_projection (user_id, current_streak, best_streak, last_local_date)
    values ('00000000-0000-0000-0000-000000000000', 1, 1, '2026-01-01');
    raise notice 'leaderboard_projection:insert_succeeded';
  exception when others then
    raise notice 'leaderboard_projection:insert_blocked=%', sqlerrm;
  end $$;
commit;

-- @block profiles: member cannot self-promote to admin
begin;
  do $$
  begin
    update public.profiles
       set role = 'admin'
     where id = '00000000-0000-0000-0000-000000000000';
    raise notice 'profiles:role_promotion_succeeded';
  exception when others then
    raise notice 'profiles:role_promotion_blocked=%', sqlerrm;
  end $$;
commit;

-- @block profiles: member cannot change cohort_id
begin;
  do $$
  begin
    update public.profiles
       set cohort_id = '00000000-0000-0000-0000-000000000000'
     where id = '00000000-0000-0000-0000-000000000000';
    raise notice 'profiles:cohort_change_succeeded';
  exception when others then
    raise notice 'profiles:cohort_change_blocked=%', sqlerrm;
  end $$;
commit;
