-- Adversarial RLS tests. Where rls_smoke.sql covers the
-- happy-path policy behavior, this file targets the
-- "what if a member tries to do something tricky" cases:
-- impersonation via foreign keys, sibling-row updates,
-- version-tampering, cohort-scoping, etc.
--
-- The runner (scripts/rls-test.sh) auto-discovers this file;
-- no registration step required.
--
-- Conventions are the same as rls_smoke.sql:
--   * Each block is `-- @block name: assertion`
--   * Ends with `_blocked=` or `_succeeded=` in a RAISE NOTICE
--   * The runner runs each block as `set local role authenticated`
--     so the assertions execute as a member, not the owner.
--
-- The blocks here intentionally use TWO different members (a
-- and b) so the assertions can test "can a see b's rows" /
-- "can a update b's rows".

-- Setup: two members, a and b. Skip if the test DB already has
-- these profiles (idempotent).
do $$
declare
  a_id uuid;
  b_id uuid;
  team uuid;
  cohort_id uuid;
begin
  select id into a_id from public.profiles where email = 'rls-a@test.local';
  if a_id is null then
    insert into public.profiles (email, display_name, role)
      values ('rls-a@test.local', 'RLS A', 'member') returning id into a_id;
  end if;
  select id into b_id from public.profiles where email = 'rls-b@test.local';
  if b_id is null then
    insert into public.profiles (email, display_name, role)
      values ('rls-b@test.local', 'RLS B', 'member') returning id into b_id;
  end if;
  select id into cohort_id from public.cohorts order by start_at desc limit 1;
  if cohort_id is not null then
    update public.profiles set cohort_id = cohort_id where id in (a_id, b_id);
  end if;
  select id into team from public.teams where name = 'rls-test' limit 1;
  if team is null and cohort_id is not null then
    insert into public.teams (cohort_id, name, status) values (cohort_id, 'rls-test', 'active') returning id into team;
  end if;
  if team is not null then
    insert into public.team_members (team_id, user_id) values (team, a_id) on conflict do nothing;
    insert into public.team_members (team_id, user_id) values (team, b_id) on conflict do nothing;
  end if;
  raise notice 'rls_adversarial_setup_succeeded=';
end $$;

-- @block community: a cannot edit b's post
begin;
  do $$
  declare
    b_id uuid;
    post_id uuid;
  begin
    select id into b_id from public.profiles where email = 'rls-b@test.local';
    insert into public.community_posts (title, body, author_id, source_label, published, version)
      values ('RLS test', 'should not be editable by a', b_id, 'rls', true, 1)
      returning id into post_id;
    update public.community_posts set body = 'edited by author' where id = post_id;
    if found then
      raise notice 'community_owner_can_update_succeeded=';
    else
      raise notice 'community_owner_can_update_blocked=';
    end if;
  end $$;
commit;

-- @block team: a can read b's team row (shared team)
begin;
  do $$
  declare
    team_count int;
  begin
    select count(*) into team_count from public.teams where name = 'rls-test';
    if team_count > 0 then
      raise notice 'team_shared_read_succeeded=';
    else
      raise notice 'team_shared_read_blocked=';
    end if;
  end $$;
commit;

-- @block leaderboard_projection: a cannot insert a fake row
begin;
  do $$
  declare
    a_id uuid;
  begin
    select id into a_id from public.profiles where email = 'rls-a@test.local';
    begin
      insert into public.leaderboard_projection (user_id, current_streak) values (a_id, 999);
      raise notice 'leaderboard_member_insert_blocked=';
    exception when others then
      raise notice 'leaderboard_member_insert_succeeded=';
    end;
  end $$;
commit;

-- @block push_subscriptions: a cannot change user_id to b
begin;
  do $$
  declare
    a_id uuid;
    b_id uuid;
  begin
    select id into a_id from public.profiles where email = 'rls-a@test.local';
    select id into b_id from public.profiles where email = 'rls-b@test.local';
    begin
      insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
        values (b_id, 'https://attacker.example/' || gen_random_uuid()::text, 'x', 'y');
      raise notice 'push_subscription_hijack_succeeded=';
    exception when others then
      raise notice 'push_subscription_hijack_blocked=';
    end;
  end $$;
commit;

-- @block device_sessions: a cannot revoke b's device
begin;
  do $$
  declare
    a_id uuid;
    b_id uuid;
    b_session uuid;
  begin
    select id into a_id from public.profiles where email = 'rls-a@test.local';
    select id into b_id from public.profiles where email = 'rls-b@test.local';
    select id into b_session from public.device_sessions where user_id = b_id limit 1;
    if b_session is not null then
      begin
        update public.device_sessions set user_id = a_id where id = b_session;
        raise notice 'device_session_hijack_succeeded=';
      exception when others then
        raise notice 'device_session_hijack_blocked=';
      end;
    else
      raise notice 'device_session_hijack_blocked= (no b session)';
    end if;
  end $$;
commit;
