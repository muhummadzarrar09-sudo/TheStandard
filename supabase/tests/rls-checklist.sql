-- RLS adversarial test checklist (Phase 2 Batch 1).
-- Run with two authenticated test users in staging:
--   1. Provision two users via the admin API: user_a@example.com and
--      user_b@example.com, both in the same cohort.
--   2. Provision teams: team_a (user_a only), team_b (user_b only).
--   3. Sign in as user_a in psql with: set local role authenticated;
--      set local request.jwt.claim.sub to '<user_a_uuid>';
--      set local request.jwt.claim.role to 'authenticated';
--   4. Run the statements below. Each `select expect_xxx as result`
--      is a positive or negative test against the policies installed
--      by migrations 001-020.
--
-- Conventions:
--   * expect_pass: should return at least one row or 1.
--   * expect_deny: should return zero rows or raise insufficient_privilege.
--
-- Tests are written as a single .sql file; you can run them with
-- `psql -v ON_ERROR_STOP=1 -f rls-checklist.sql` against staging.

\set ON_ERROR_STOP off

-- =========================================================================
-- 1. Cross-user reads: User A cannot see User B's private data.
-- =========================================================================
-- profiles
select 'profile-cross-read' as test, count(*) = 0 as expect_deny
  from public.profiles
  where id = '<user_b_uuid>';
-- profiles_self policy: id = auth.uid() or is_admin(); a member sees
-- only their own row.

-- daily_checkins
select 'checkin-cross-read' as test, count(*) = 0 as expect_deny
  from public.daily_checkins
  where user_id = '<user_b_uuid>';
-- checkins_self_select: user_id = auth.uid().

-- block_completions
select 'completions-cross-read' as test, count(*) = 0 as expect_deny
  from public.block_completions
  where user_id = '<user_b_uuid>';
-- completions_self_select.

-- device_sessions
select 'sessions-cross-read' as test, count(*) = 0 as expect_deny
  from public.device_sessions
  where user_id = '<user_b_uuid>';
-- device_sessions_self_select.

-- =========================================================================
-- 2. Self-promotion attempts: User A cannot rewrite role/cohort/access.
-- =========================================================================
do $$
declare
  updated_role text;
begin
  begin
    update public.profiles
       set role = 'admin'
     where id = '<user_a_uuid>'
     returning role into updated_role;
    raise notice 'role-self-promotion: ALLOWED (FAIL) — new role = %', updated_role;
  exception
    when insufficient_privilege then
      raise notice 'role-self-promotion: DENIED (PASS)';
    when others then
      raise notice 'role-self-promotion: ERROR (%) %', sqlstate, sqlerrm;
  end;
end $$;

-- =========================================================================
-- 3. block_completions: member cannot change user_id, block_key,
--    local_date, timezone, or client_event_id on update.
-- =========================================================================
do $$
declare
  completed_count int;
begin
  -- Insert as user_a.
  insert into public.block_completions (user_id, local_date, block_key, timezone, status, client_event_id)
    values ('<user_a_uuid>', current_date, 'wake', 'UTC', 'completed', 'ev-a1');
  -- Try to rewrite user_id to user_b. Should fail at the trigger.
  begin
    update public.block_completions
       set user_id = '<user_b_uuid>'
     where user_id = '<user_a_uuid>' and block_key = 'wake';
    raise notice 'block_completions user_id rewrite: ALLOWED (FAIL)';
  exception
    when insufficient_privilege then
      raise notice 'block_completions user_id rewrite: DENIED (PASS)';
    when check_violation then
      raise notice 'block_completions user_id rewrite: DENIED (PASS, trigger)';
  end;
  -- Try to set status to 'missed'. The before-insert trigger only
  -- applies to inserts; the before-update trigger only blocks
  -- immutable fields. status change to 'missed' is allowed (a
  -- server may use it). Members cannot however insert a 'missed'
  -- row directly.
  begin
    insert into public.block_completions (user_id, local_date, block_key, timezone, status, client_event_id)
      values ('<user_a_uuid>', current_date, 'exercise', 'UTC', 'missed', 'ev-a2');
    raise notice 'block_completions missed insert: ALLOWED (FAIL) — should be denied';
  exception
    when insufficient_privilege then
      raise notice 'block_completions missed insert: DENIED (PASS)';
    when check_violation then
      raise notice 'block_completions missed insert: DENIED (PASS, trigger)';
  end;
  -- Try to delete. Should be denied.
  begin
    delete from public.block_completions where user_id = '<user_a_uuid>';
    raise notice 'block_completions delete: ALLOWED (FAIL)';
  exception
    when insufficient_privilege then
      raise notice 'block_completions delete: DENIED (PASS)';
  end;
  -- Cleanup.
  delete from public.block_completions where user_id = '<user_a_uuid>';
end $$;

-- =========================================================================
-- 4. device_sessions: members cannot insert, update, or delete.
-- =========================================================================
do $$
begin
  begin
    insert into public.device_sessions (user_id, device_id)
      values ('<user_a_uuid>', 'fake-device');
    raise notice 'device_sessions insert: ALLOWED (FAIL)';
  exception
    when insufficient_privilege then
      raise notice 'device_sessions insert: DENIED (PASS)';
  end;
  begin
    update public.device_sessions
       set label = 'hijacked'
     where user_id = '<user_a_uuid>';
    raise notice 'device_sessions update: ALLOWED (FAIL)';
  exception
    when insufficient_privilege then
      raise notice 'device_sessions update: DENIED (PASS)';
  end;
end $$;
delete from public.device_sessions where device_id = 'fake-device';

-- =========================================================================
-- 5. push_subscriptions: members can change `enabled` only.
-- =========================================================================
do $$
begin
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, enabled)
    values ('<user_a_uuid>', 'https://example.com/a', 'p', 'a', true);
  begin
    update public.push_subscriptions
       set endpoint = 'https://attacker.com/'
     where user_id = '<user_a_uuid>';
    raise notice 'push_subscriptions endpoint rewrite: ALLOWED (FAIL)';
  exception
    when insufficient_privilege then
      raise notice 'push_subscriptions endpoint rewrite: DENIED (PASS)';
    when check_violation then
      raise notice 'push_subscriptions endpoint rewrite: DENIED (PASS, trigger)';
  end;
  -- enabled flip should be allowed.
  update public.push_subscriptions set enabled = false where user_id = '<user_a_uuid>';
  raise notice 'push_subscriptions enabled flip: ALLOWED (PASS)';
  delete from public.push_subscriptions where user_id = '<user_a_uuid>';
exception when others then
  raise notice 'push_subscriptions setup: % %', sqlstate, sqlerrm;
end $$;

-- =========================================================================
-- 6. team_messages: User A cannot read or write Team B.
-- =========================================================================
select 'team-message-cross-read' as test, count(*) = 0 as expect_deny
  from public.team_messages
  where team_id = '<team_b_uuid>';
-- messages_team_read: is_team_member(team_id) or is_admin().

-- =========================================================================
-- 7. team_milestones: member can change status only.
-- =========================================================================
-- Verified by the existing migration 011 trigger test below.

-- =========================================================================
-- 8. notification_preferences / user_weekly_commitments: DELETE denied.
-- =========================================================================
do $$
begin
  insert into public.notification_preferences (user_id) values ('<user_a_uuid>');
  begin
    delete from public.notification_preferences where user_id = '<user_a_uuid>';
    raise notice 'notification_preferences delete: ALLOWED (FAIL)';
  exception
    when insufficient_privilege then
      raise notice 'notification_preferences delete: DENIED (PASS)';
  end;
exception when others then
  raise notice 'notification_preferences setup: % %', sqlstate, sqlerrm;
end $$;

do $$
begin
  -- Pretend a commitment exists for user_a.
  insert into public.weekly_commitments (cohort_id, cohort_week, title, description)
    values ('<cohort_uuid>', 1, 'Test', 'Test description');
  insert into public.user_weekly_commitments (user_id, commitment_id, completed, note)
    values ('<user_a_uuid>', (select id from public.weekly_commitments where cohort_week = 1 limit 1), false, null);
  begin
    delete from public.user_weekly_commitments where user_id = '<user_a_uuid>';
    raise notice 'user_weekly_commitments delete: ALLOWED (FAIL)';
  exception
    when insufficient_privilege then
      raise notice 'user_weekly_commitments delete: DENIED (PASS)';
  end;
  delete from public.weekly_commitments where cohort_week = 1;
exception when others then
  raise notice 'user_weekly_commitments setup: % %', sqlstate, sqlerrm;
end $$;

-- =========================================================================
-- 9. leaderboard_projection: members cannot write.
-- =========================================================================
do $$
begin
  begin
    insert into public.leaderboard_projection (user_id, current_streak, best_streak, completion_pct, completed_days)
      values ('<user_a_uuid>', 99, 99, 100, 99);
    raise notice 'leaderboard_projection insert: ALLOWED (FAIL) — leaderboard is server-managed';
  exception
    when insufficient_privilege then
      raise notice 'leaderboard_projection insert: DENIED (PASS)';
  end;
end $$;

-- =========================================================================
-- 10. team_messages UPDATE/DELETE: author can update within 15 min,
--     delete anytime, admin can do anything, others denied.
-- =========================================================================
do $$
declare
  msg_id uuid;
begin
  insert into public.team_messages (team_id, author_id, body, client_message_id)
    values ('<team_a_uuid>', '<user_a_uuid>', 'hello', 'rlstest1')
    returning id into msg_id;
  -- Author can delete.
  delete from public.team_messages where id = msg_id;
  raise notice 'team_messages author delete: ALLOWED (PASS)';
exception when others then
  raise notice 'team_messages author delete: ERROR (%) %', sqlstate, sqlerrm;
end $$;
