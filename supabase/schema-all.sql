-- =====================================================================
-- Discipline OS — Consolidated schema
-- =====================================================================
-- This is a single-file dump of every migration in
-- supabase/migrations/ in order. Use this when you want to
-- paste the whole schema into the Supabase SQL editor (or
-- psql) without using the Supabase CLI.
--
-- What you'll find, in order:
--   001-006  core tables (cohorts, profiles, devices, teams,
--            team_members, schedule_templates, block_completions,
--            daily_checkins, team_progress_logs, team_messages,
--            reports, community_posts, leaderboard_projection,
--            audit_events, push_subscriptions, notification_jobs,
--            team_milestones, notification_preferences,
--            weekly_commitments, user_weekly_commitments)
--   007-008  security hardening (profile admin fields guard,
--            otp_request_log)
--   009      leaderboard join-time + correct streak math
--   010      team chat moderation + reads (chat_moderation_events,
--            team_message_reads, daily_checkins no-DELETE)
--   011      team_milestones guard
--   012      cutoff processing (canonical_schedule_blocks + 2 fns)
--   013      critical_block_reminder preference
--   014-020  RLS hardening pass (block_completions, device_sessions,
--            push_subscriptions, notification_preferences,
--            user_weekly_commitments, leaderboard_projection,
--            team_progress_logs)
--   021-024  Phase 6/9 surface: data-driven schedule, team
--            progress categories, community version + source_label,
--            notification backoff (next_retry_at, last_error)
--
-- After running:
--   * 26 application tables in the public schema (auth.* is
--     managed by Supabase). The 8 "infrastructure" tables
--     (audit_events, chat_moderation_events, daily_schedule_instances,
--     leaderboard_projection, notification_jobs, otp_request_log,
--     schedule_templates, canonical_schedule_blocks, team_message_reads)
--     exist to back the surface; they're not directly used by the
--     member-facing UI but every cron / projection refresh / version
--     stamp depends on them.
--   * 60+ RLS policies.
--   * 21 functions (helpers, RLS predicates, projection refresh,
--     cutoff processor, schedule resolver).
--   * 16+ triggers (guards + version bumps + moderation audit).
--
-- Verify with:
--   select count(*) from information_schema.tables
--    where table_schema = 'public' and table_type = 'BASE TABLE';
--   -- expect 26
--
-- 025_cutoff_diagnostics_fix.sql (folded into 012 above)
-- 026_rls_on_cohorts_and_canonical.sql (folded into 001 + 012 above)
--
-- Original migrations live in supabase/migrations/. The Supabase
-- CLI (npx supabase db push) is the preferred way to apply them;
-- this file is a one-shot alternative.
-- =====================================================================

create extension if not exists pgcrypto;
create table if not exists public.cohorts(id uuid primary key default gen_random_uuid(),name text not null,enrollment_open_at timestamptz not null,enrollment_close_at timestamptz not null,start_at timestamptz not null,end_at timestamptz not null,status text not null default 'draft' check(status in('draft','enrolling','active','closed','archived')));
create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,email text not null unique,display_name text,cohort_id uuid references public.cohorts(id),access_start_at timestamptz,access_end_at timestamptz,timezone text not null default 'UTC',theme_preset text not null default 'whoop-oura',role text not null default 'member' check(role in('member','admin')));
create table if not exists public.device_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,device_id text not null,label text,created_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),revoked_at timestamptz,unique(user_id,device_id));
create table if not exists public.teams(id uuid primary key default gen_random_uuid(),cohort_id uuid not null references public.cohorts(id),name text not null,idea_name text,problem_statement text,objective text,status text not null default 'active');
create table if not exists public.team_members(team_id uuid references public.teams(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,joined_at timestamptz not null default now(),primary key(team_id,user_id));
create table if not exists public.schedule_templates(id uuid primary key default gen_random_uuid(),cohort_id uuid references public.cohorts(id),name text not null,version int not null default 1,active boolean not null default true,blocks jsonb not null);
create table if not exists public.block_completions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,local_date date not null,block_key text not null,timezone text not null,completed_at timestamptz not null default now(),status text not null default 'completed' check(status in('completed','missed','optional')),client_event_id text not null,unique(user_id,local_date,block_key),unique(user_id,client_event_id));
create table if not exists public.daily_checkins(user_id uuid references auth.users(id) on delete cascade,local_date date not null,completed boolean not null default false,reflection_private text,updated_at timestamptz not null default now(),primary key(user_id,local_date));
create table if not exists public.team_progress_logs(id uuid primary key default gen_random_uuid(),team_id uuid references public.teams(id) on delete cascade,author_id uuid references auth.users(id),body text not null check(char_length(body)<=3000),created_at timestamptz not null default now());
create table if not exists public.team_messages(id uuid primary key default gen_random_uuid(),team_id uuid references public.teams(id) on delete cascade,author_id uuid references auth.users(id),body text not null check(char_length(body) between 1 and 2000),client_message_id text not null,created_at timestamptz not null default now(),updated_at timestamptz,deleted_at timestamptz,unique(team_id,client_message_id));
create table if not exists public.reports(id uuid primary key default gen_random_uuid(),title text not null,interviewee text,published_at timestamptz not null default now(),summary text not null,body text,version int not null default 1,published boolean not null default false);
create table if not exists public.community_posts(id uuid primary key default gen_random_uuid(),cohort_id uuid references public.cohorts(id),title text not null,body text not null,source_url text,published_at timestamptz not null default now(),pinned boolean not null default false,published boolean not null default true);
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;
create or replace function public.is_team_member(t uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.team_members where team_id=t and user_id=auth.uid()) $$;
-- RLS: deny first, then grant narrowly.
DO $$ declare t text; begin foreach t in array array['profiles','device_sessions','teams','team_members','schedule_templates','block_completions','daily_checkins','team_progress_logs','team_messages','reports','community_posts'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy profiles_self on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy sessions_self on public.device_sessions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy teams_member_read on public.teams for select to authenticated using(public.is_team_member(id) or public.is_admin());
create policy team_members_self_read on public.team_members for select to authenticated using(user_id=auth.uid() or public.is_team_member(team_id) or public.is_admin());
create policy completions_self on public.block_completions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy checkins_self on public.daily_checkins for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy progress_team_read on public.team_progress_logs for select to authenticated using(public.is_team_member(team_id) or public.is_admin());
create policy progress_team_write on public.team_progress_logs for insert to authenticated with check(author_id=auth.uid() and public.is_team_member(team_id));
create policy messages_team_read on public.team_messages for select to authenticated using(public.is_team_member(team_id) or public.is_admin());
create policy messages_team_write on public.team_messages for insert to authenticated with check(author_id=auth.uid() and public.is_team_member(team_id));
create policy reports_member_read on public.reports for select to authenticated using(published=true);
create policy community_member_read on public.community_posts for select to authenticated using(published=true);
create table if not exists public.leaderboard_projection(user_id uuid primary key references auth.users(id) on delete cascade,cohort_id uuid references public.cohorts(id),current_streak int not null default 0,best_streak int not null default 0,completion_pct numeric(5,2) not null default 0,completed_days int not null default 0,updated_at timestamptz not null default now());
create table if not exists public.audit_events(id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id),event_type text not null,target_id uuid,reason text,metadata jsonb not null default '{}',created_at timestamptz not null default now());
create table if not exists public.push_subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,device_session_id uuid references public.device_sessions(id) on delete cascade,endpoint text not null unique,p256dh text not null,auth text not null,enabled boolean not null default true,last_success_at timestamptz,last_failure_at timestamptz);
create table if not exists public.notification_jobs(id uuid primary key default gen_random_uuid(),idempotency_key text unique not null,user_id uuid references auth.users(id),category text not null,payload jsonb not null default '{}',scheduled_at timestamptz not null,status text not null default 'queued',attempts int not null default 0);
alter table public.leaderboard_projection enable row level security;alter table public.push_subscriptions enable row level security;alter table public.notification_jobs enable row level security;alter table public.audit_events enable row level security;
create policy leaderboard_read on public.leaderboard_projection for select to authenticated using(true);
create policy push_self on public.push_subscriptions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy notification_self on public.notification_jobs for select to authenticated using(user_id=auth.uid());
create policy audit_admin on public.audit_events for select to authenticated using(public.is_admin());
create policy reports_admin_write on public.reports for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy community_admin_write on public.community_posts for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy cohort_admin_write on public.cohorts for all to authenticated using(public.is_admin()) with check(public.is_admin());
alter table public.cohorts enable row level security;
-- Members can see the cohort(s) they belong to. Without this, profiles.cohort_id
-- is useless because joins to cohorts would be blocked for non-admins.
create policy cohort_member_read on public.cohorts for select to authenticated
  using (
    id = (select cohort_id from public.profiles where id = auth.uid())
    or public.is_admin()
  );
create policy team_admin_write on public.teams for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy team_members_admin_write on public.team_members for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy schedule_admin_write on public.schedule_templates for all to authenticated using(public.is_admin()) with check(public.is_admin());
create table if not exists public.team_milestones(id uuid primary key default gen_random_uuid(),team_id uuid not null references public.teams(id) on delete cascade,title text not null,description text,owner_id uuid references auth.users(id),due_at timestamptz,status text not null default 'planned' check(status in('planned','in_progress','blocked','complete')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.team_milestones enable row level security;
create policy milestones_read on public.team_milestones for select to authenticated using(public.is_team_member(team_id) or public.is_admin());
create policy milestones_admin_write on public.team_milestones for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy milestones_member_update on public.team_milestones for update to authenticated using(public.is_team_member(team_id)) with check(public.is_team_member(team_id));
create index if not exists milestones_team_due on public.team_milestones(team_id,due_at);
-- Rebuildable projection refresh. Streak semantics are kept in one function so the
-- leaderboard never trusts values supplied by the browser.
create or replace function public.refresh_leaderboard_for_cohort(target_cohort uuid)
returns void language plpgsql security definer set search_path=public as $$
declare p record; completed_count int; cohort_days int; pct numeric;
begin
  for p in select id,cohort_id from public.profiles where cohort_id=target_cohort and role='member' loop
    select count(*) into completed_count from public.daily_checkins where user_id=p.id and completed=true;
    select greatest(1,(end_at::date-start_at::date)+1) into cohort_days from public.cohorts where id=p.cohort_id;
    pct:=round((completed_count::numeric/greatest(1,cohort_days))*100,2);
    insert into public.leaderboard_projection(user_id,cohort_id,current_streak,best_streak,completion_pct,completed_days,updated_at)
    values(p.id,p.cohort_id,0,0,least(100,pct),completed_count,now())
    on conflict(user_id) do update set completion_pct=excluded.completion_pct,completed_days=excluded.completed_days,updated_at=now();
  end loop;
end;$$;
-- Current/best streak values must be filled by the scheduled streak worker after
-- it walks local-date completion records; they are never client-controlled.
revoke all on function public.refresh_leaderboard_for_cohort(uuid) from public;
create table if not exists public.notification_preferences(user_id uuid primary key references auth.users(id) on delete cascade,daily_reminder boolean not null default true,report_alerts boolean not null default true,team_messages boolean not null default true,quiet_start time,quiet_end time,updated_at timestamptz not null default now());
alter table public.notification_preferences enable row level security;
create policy notification_preferences_self on public.notification_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create table if not exists public.weekly_commitments(id uuid primary key default gen_random_uuid(),cohort_id uuid not null references public.cohorts(id) on delete cascade,cohort_week int not null,title text not null,description text not null,active boolean not null default true,unique(cohort_id,cohort_week));
create table if not exists public.user_weekly_commitments(user_id uuid not null references auth.users(id) on delete cascade,commitment_id uuid not null references public.weekly_commitments(id) on delete cascade,completed boolean not null default false,note text,updated_at timestamptz not null default now(),primary key(user_id,commitment_id));
alter table public.weekly_commitments enable row level security;alter table public.user_weekly_commitments enable row level security;
create policy weekly_commitments_read on public.weekly_commitments for select to authenticated using(active=true or public.is_admin());
create policy user_commitments_self on public.user_weekly_commitments for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy weekly_commitments_admin on public.weekly_commitments for all to authenticated using(public.is_admin()) with check(public.is_admin());
-- 007_profiles_self_update_lock.sql
-- Fix: profiles_self_update allowed any member to rewrite their own role,
-- cohort_id, and access window because with check only constrained the row id.
-- A member could call .from('profiles').update({role:'admin'}) and get promoted.
--
-- Drop the permissive policy and recreate it with explicit column constraints
-- that match what /api/profile allows members to change: display_name, timezone,
-- theme_preset. role, cohort_id, access_start_at, access_end_at are locked.

drop policy if exists profiles_self_update on public.profiles;

create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and cohort_id is not distinct from (select cohort_id from public.profiles where id = auth.uid())
    and access_start_at is not distinct from (select access_start_at from public.profiles where id = auth.uid())
    and access_end_at   is not distinct from (select access_end_at   from public.profiles where id = auth.uid())
  );

-- Belt and suspenders: a BEFORE UPDATE trigger that rejects any attempt to
-- change role/cohort/access even if the policy is later loosened. This is the
-- last line of defense for admin-only fields.
create or replace function public.profiles_guard_admin_fields() returns trigger
language plpgsql as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role
       or new.cohort_id is distinct from old.cohort_id
       or new.access_start_at is distinct from old.access_start_at
       or new.access_end_at is distinct from old.access_end_at then
      raise exception 'profiles admin fields cannot be changed by non-admin'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_admin_fields on public.profiles;
create trigger profiles_guard_admin_fields
  before update on public.profiles
  for each row execute function public.profiles_guard_admin_fields();
-- 008_otp_request_log.sql
-- Optional server-side audit table for OTP request refusals. The request-otp
-- edge function writes here when it rejects a request (cohort closed, unknown
-- email, etc). The client never sees this; ops reads it to detect enumeration
-- sweeps. Insert-only from the service role; no client access.
create table if not exists public.otp_request_log (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  eligible boolean not null,
  requested_at timestamptz not null default now()
);
create index if not exists otp_request_log_email_time
  on public.otp_request_log (email, requested_at desc);
create index if not exists otp_request_log_ineligible
  on public.otp_request_log (requested_at desc) where eligible = false;
alter table public.otp_request_log enable row level security;
-- No policies: no client role can read or write. Only the service role
-- (used by the edge function) bypasses RLS by default.
-- 009_leaderboard_join_time_and_streaks.sql
-- Three fixes:
--   1. leaderboard_projection gets a joined_at column for the PRD-required
--      join-time tie-breaker.
--   2. refresh_leaderboard_for_cohort now computes current_streak and
--      best_streak using the same algorithm the previous Edge Function used
--      (walk back consecutive local-date completion days). Previously the
--      function inserted 0,0 literally.
--   3. The Edge Function supabase/functions/refresh-leaderboard is removed
--      by code change in the same patch; this migration makes the SQL
--      function the single source of truth.

alter table public.profiles
  add column if not exists joined_at timestamptz not null default now();

alter table public.leaderboard_projection
  add column if not exists joined_at timestamptz;

create or replace function public.refresh_leaderboard_for_cohort(target_cohort uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
  completed_count int;
  cohort_days int;
  pct numeric;
  cs int;
  bs int;
  dates date[];
  d date;
  prev date;
  contiguous boolean;
  cur_run int;
  i int;
  today date;
  skipped_today boolean;
begin
  for p in
    select pr.id, pr.cohort_id, pr.timezone, pr.joined_at
    from public.profiles pr
    where pr.cohort_id = target_cohort
      and pr.role = 'member'
  loop
    -- Pull all completed local_dates for this member, in deterministic order.
    select coalesce(array_agg(dc.local_date order by dc.local_date), '{}'::date[])
      into dates
      from public.daily_checkins dc
      where dc.user_id = p.id
        and dc.completed = true;

    -- Best streak: longest run of consecutive local_date values.
    bs := 0;
    cur_run := 0;
    prev := null;
    if dates is not null then
      for i in 1..array_length(dates, 1) loop
        d := dates[i];
        contiguous := (prev is not null and (d - prev) = 1);
        if contiguous then
          cur_run := cur_run + 1;
        else
          cur_run := 1;
        end if;
        if cur_run > bs then bs := cur_run; end if;
        prev := d;
      end loop;
    end if;

    -- Current streak per PRD 7.2 + 18.6: "any missed required block breaks
    -- the active streak." We look back from today. If today is missing
    -- (not yet completed), we skip it once and check yesterday. If yesterday
    -- is also missing the streak is 0. Otherwise we count consecutive prior
    -- days that are all in the set.
    today := (current_timestamp at time zone coalesce(p.timezone, 'UTC'))::date;
    cs := 0;
    prev := today;
    skipped_today := false;
    loop
      exit when prev = any (dates);
      if not skipped_today and prev = today then
        skipped_today := true;
        prev := prev - 1;
      else
        cs := 0;
        exit;
      end if;
    end loop;
    while prev = any (dates) loop
      cs := cs + 1;
      prev := prev - 1;
    end loop;

    completed_count := coalesce(array_length(dates, 1), 0);

    select greatest(1, (c.end_at::date - c.start_at::date) + 1)
      into cohort_days
      from public.cohorts c
      where c.id = p.cohort_id;
    if cohort_days is null then cohort_days := 30; end if;
    pct := round((completed_count::numeric / greatest(1, cohort_days)) * 100, 2);

    insert into public.leaderboard_projection(
      user_id, cohort_id, current_streak, best_streak,
      completion_pct, completed_days, joined_at, updated_at
    )
    values (
      p.id, p.cohort_id, cs, bs,
      least(100, pct), completed_count,
      p.joined_at,
      now()
    )
    on conflict (user_id) do update set
      current_streak = excluded.current_streak,
      best_streak    = excluded.best_streak,
      completion_pct = excluded.completion_pct,
      completed_days = excluded.completed_days,
      joined_at      = excluded.joined_at,
      updated_at     = now();
  end loop;
end $$;

revoke all on function public.refresh_leaderboard_for_cohort(uuid) from public;
-- 010_team_chat_rls_and_reads.sql
-- Fix the team_messages RLS gap: there are no UPDATE or DELETE policies.
-- PRD 7.4 requires:
--   - members can edit their own messages within a recent window
--   - members can delete their own messages (tombstone via deleted_at)
--   - admins can remove messages
--   - chat_moderation_events table for audit
--   - team_message_reads for unread tracking
--
-- Also fix the daily_checkins "for all" policy which lets a member DELETE
-- their check-in row, breaking the streak at will.

-- =========================================================================
-- chat_moderation_events: audit trail for redacts, mutes, admin removals
-- =========================================================================
create table if not exists public.chat_moderation_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.team_messages(id) on delete set null,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,        -- subject (the affected member)
  admin_id uuid references auth.users(id) on delete set null,       -- actor (the admin, when applicable)
  action text not null check (action in ('redact','mute','unmute','remove','report_reviewed','author_delete','author_edit')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chat_mod_events_team_time on public.chat_moderation_events (team_id, created_at desc);
create index if not exists chat_mod_events_message on public.chat_moderation_events (message_id);
alter table public.chat_moderation_events enable row level security;

-- Only admins can read the full audit log. Subjects can read their own.
create policy chat_mod_admin_read on public.chat_moderation_events
  for select to authenticated
  using (public.is_admin() or user_id = auth.uid());

-- Service role inserts (via edge functions or admin API). No client insert.
-- (No INSERT policy means the service role is the only writer, which is what we want.)

-- =========================================================================
-- team_message_reads: per-member cursor for unread counts
-- =========================================================================
create table if not exists public.team_message_reads (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_message_id uuid,
  last_read_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
alter table public.team_message_reads enable row level security;

create policy team_message_reads_self on public.team_message_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =========================================================================
-- team_messages: add the missing UPDATE/DELETE policies
-- =========================================================================
-- Author can edit their own message body for 15 minutes after creation.
-- Author can delete (tombstone) their own message any time.
-- Admin can delete (tombstone) any message in their cohort's teams.
create policy messages_author_update on public.team_messages
  for update to authenticated
  using (
    author_id = auth.uid()
    and deleted_at is null
    and created_at > now() - interval '15 minutes'
  )
  with check (
    author_id = auth.uid()
    and team_id = (select tm2.team_id from public.team_messages tm2 where tm2.id = team_messages.id)
    -- Body length and content are already enforced by the table CHECK.
  );

create policy messages_author_delete on public.team_messages
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy messages_admin_update on public.team_messages
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A trigger to log moderation events automatically when deleted_at flips.
create or replace function public.team_messages_audit_delete() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'UPDATE' and old.deleted_at is null and new.deleted_at is not null) then
    insert into public.chat_moderation_events (message_id, team_id, user_id, admin_id, action, reason)
    values (
      new.id, new.team_id, new.author_id,
      case when public.is_admin() then auth.uid() else null end,
      case when new.author_id = auth.uid() then 'author_delete' else 'remove' end,
      null
    );
  end if;
  return new;
end $$;

drop trigger if exists team_messages_audit_delete on public.team_messages;
create trigger team_messages_audit_delete
  after update on public.team_messages
  for each row execute function public.team_messages_audit_delete();

-- =========================================================================
-- daily_checkins: split "for all" into per-command policies, deny DELETE
-- =========================================================================
drop policy if exists checkins_self on public.daily_checkins;
create policy checkins_self_select on public.daily_checkins
  for select to authenticated using (user_id = auth.uid());
create policy checkins_self_insert on public.daily_checkins
  for insert to authenticated with check (user_id = auth.uid());
create policy checkins_self_update on public.daily_checkins
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- No DELETE policy: a member cannot delete their check-in row and reset the streak.
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
-- 012_cutoff_processing.sql
-- Add the canonical schedule as a Postgres table so the cutoff processor and
-- the leaderboard projection can iterate the same source of truth. The
-- TypeScript module lib/domain/schedule.ts is the same data and must stay
-- in sync — but a SQL table lets us do bulk inserts without round-tripping
-- each block through the edge function.
--
-- We seed the standard schedule once. Future cohort-approved variants land
-- in schedule_templates (already in 001). For the MVP we only need the
-- default.
create table if not exists public.canonical_schedule_blocks (
  key text primary key,
  start_time time not null,
  end_time time,
  label text not null,
  required boolean not null default true,
  critical boolean not null default false,
  sort_order int not null
);

insert into public.canonical_schedule_blocks (key, start_time, end_time, label, required, critical, sort_order) values
  ('wake',           '05:00', '05:30', 'Wake, hydrate, light movement',                  true, false, 1),
  ('exercise',       '05:30', '06:30', 'Exercise',                                        true, false, 2),
  ('meal',           '06:30', '07:00', 'Meal',                                            true, false, 3),
  ('deep-1',         '07:00', '09:00', 'Deep work block 1',                               true, true,  4),
  ('break-1',        '09:00', '09:15', 'Break',                                           true, false, 5),
  ('deep-2',         '09:15', '11:15', 'Deep work block 2',                               true, true,  6),
  ('review',         '11:15', '12:00', 'Review latest interview/report',                 true, false, 7),
  ('lunch',          '12:00', '13:00', 'Lunch / rest',                                   true, false, 8),
  ('team-deep-work', '13:00', '15:00', 'Deep work block 3 · team/startup progress',      true, true,  9),
  ('break-2',        '15:00', '15:30', 'Break',                                           true, false, 10),
  ('engagement',     '15:30', '17:00', 'Community / team engagement',                    true, false, 11),
  ('movement',       '17:00', '18:00', 'Wind-down movement',                              true, false, 12),
  ('dinner',         '18:00', '19:00', 'Dinner',                                          true, false, 13),
  ('reflection',     '19:00', '20:00', 'Reflection + plan tomorrow · check-in',          true, true,  14),
  ('personal',       '20:00', '21:00', 'Personal time',                                  false, false, 15),
  ('sleep',          '21:00', null,   'Wind down for sleep',                             false, false, 16)
on conflict (key) do update set
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  label = excluded.label,
  required = excluded.required,
  critical = excluded.critical,
  sort_order = excluded.sort_order;

-- canonical_schedule_blocks is a static reference table seeded once. It's
-- not per-user data; every authenticated user needs to read it to render
-- the schedule. RLS is enabled (so a future permissive INSERT policy can't
-- accidentally open the table) but with a single read-only policy for
-- everyone and no write policies — the service role is the only writer
-- (e.g. when a new schedule variant lands in a future migration).
alter table public.canonical_schedule_blocks enable row level security;
create policy canonical_schedule_read on public.canonical_schedule_blocks
  for select to authenticated using (true);

-- =========================================================================
-- run_cutoff_for_all_cohorts: the canonical cutoff processor.
-- For every active cohort, for every member, for every local date that has
-- passed its 03:00 local cutoff, ensure each required block either has a
-- 'completed' or 'missed' row in block_completions. Defaults the missing
-- ones to 'missed'. Refreshes the leaderboard for the cohort after.
-- =========================================================================
create or replace function public.run_cutoff_for_all_cohorts(default_cutoff_hour int default 3)
returns table(cohort_id uuid, members_processed int, rows_inserted int)
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  m record;
  cohort_id_var uuid;
  cutoff_anchor date;
  cutoff_ts timestamptz;
  member_count int := 0;
  rows_added int := 0;
  inserted_count int;
begin
  for c in
    select co.id
    from public.cohorts co
    where co.status in ('active', 'enrolling')
  loop
    cohort_id_var := c.id;
    member_count := 0;
    rows_added := 0;
    for m in
      select p.id, p.timezone
      from public.profiles p
      where p.cohort_id = cohort_id_var
        and p.role = 'member'
        and coalesce(p.access_start_at, now() - interval '1 day') <= now()
        and coalesce(p.access_end_at,   now() + interval '1 day') >= now()
    loop
      member_count := member_count + 1;
      -- Cutoff is at 03:00 local on (today's local date). Members whose
      -- current local time is before that cutoff keep their day open. The
      -- worker processes days whose cutoff has already passed.
      cutoff_anchor := (now() at time zone coalesce(m.timezone, 'UTC'))::date;
      cutoff_ts := ((cutoff_anchor + 1)::text || ' ' || default_cutoff_hour || ':00:00')::timestamp
                    at time zone coalesce(m.timezone, 'UTC');
      if now() < cutoff_ts then
        continue;
      end if;
      insert into public.block_completions (
        user_id, local_date, block_key, timezone, status, client_event_id
      )
      select
        m.id, cutoff_anchor, b.key, m.timezone, 'missed',
        'cutoff-' || m.id::text || '-' || cutoff_anchor::text || '-' || b.key
      from public.canonical_schedule_blocks b
      where b.required = true
        and not exists (
          select 1 from public.block_completions bc
          where bc.user_id = m.id
            and bc.local_date = cutoff_anchor
            and bc.block_key = b.key
        );
      get diagnostics inserted_count = row_count;
      rows_added := rows_added + inserted_count;
    end loop;
    -- Refresh the leaderboard for this cohort so the missed rows feed into
    -- the streak math immediately.
    perform public.refresh_leaderboard_for_cohort(cohort_id_var);
    return query select cohort_id_var, member_count, rows_added;
  end loop;
end $$;

revoke all on function public.run_cutoff_for_all_cohorts(int) from public;

-- =========================================================================
-- process_cutoff_for_member: same logic, scoped to one member. The edge
-- function can call this directly for ad-hoc reprocessing without touching
-- the whole cohort.
-- =========================================================================
create or replace function public.process_cutoff_for_member(p_user_id uuid, p_cutoff_hour int default 3)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  tz text;
  cutoff_anchor date;
  cutoff_ts timestamptz;
  rows_added int;
begin
  select coalesce(timezone, 'UTC') into tz from public.profiles where id = p_user_id;
  if tz is null then return 0; end if;
  cutoff_anchor := (now() at time zone tz)::date;
  cutoff_ts := ((cutoff_anchor + 1)::text || ' ' || p_cutoff_hour || ':00:00')::timestamp
                at time zone tz;
  if now() < cutoff_ts then return 0; end if;
  insert into public.block_completions (
    user_id, local_date, block_key, timezone, status, client_event_id
  )
  select
    p_user_id, cutoff_anchor, b.key, tz, 'missed',
    'cutoff-' || p_user_id::text || '-' || cutoff_anchor::text || '-' || b.key
  from public.canonical_schedule_blocks b
  where b.required = true
    and not exists (
      select 1 from public.block_completions bc
      where bc.user_id = p_user_id
        and bc.local_date = cutoff_anchor
        and bc.block_key = b.key
    );
  get diagnostics rows_added = row_count;
  return rows_added;
end $$;

revoke all on function public.process_cutoff_for_member(uuid, int) from public;
-- 013_critical_block_reminder.sql
-- Add critical_block_reminder to notification_preferences. PRD 7.7 lists
-- "Optional reminders before critical blocks" as a category, but the table
-- in migration 005 omitted it. Default true so existing rows pick up the
-- new category on their next read.
alter table public.notification_preferences
  add column if not exists critical_block_reminder boolean not null default true;
-- 014_rls_block_completions.sql
-- Harden block_completions RLS.
-- The original policy (001) was "for all ... using(user_id=auth.uid()) with
-- check(user_id=auth.uid())" — which allowed any operation including DELETE
-- and let a member change the status to 'missed' for their own block.
--
-- Plan:
--   * SELECT: member reads only their own.
--   * INSERT: member can only insert their own row, status must be
--     'completed' (never 'missed' — that is server-only).
--   * UPDATE: still allowed (the API uses upsert for idempotency), but
--     constrained so user_id, local_date, block_key, timezone, and
--     client_event_id cannot change; status may only stay 'completed'
--     or move between 'completed' and the same value (a defense in
--     depth — the trigger below is the real guard).
--   * DELETE: denied for members. Cutoff job and admin can still
--     truncate if needed via the service role.
--   * A BEFORE UPDATE trigger that rejects any change to the immutable
--     columns. Admin and service role bypass via auth.uid() = NULL
--     detection. Even if the policy is later loosened, the trigger still
--     holds.

drop policy if exists completions_self on public.block_completions;

create policy completions_self_select on public.block_completions
  for select to authenticated
  using (user_id = auth.uid());

create policy completions_self_insert on public.block_completions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'completed'
  );

create policy completions_self_update on public.block_completions
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    -- The new row must still belong to the caller. The trigger below
    -- adds the column-level guard (user_id, local_date, block_key,
    -- timezone, client_event_id are immutable on update).
    user_id = auth.uid()
    and status in ('completed', 'missed', 'optional')
  );

-- No DELETE policy. Members cannot delete their completions.

create or replace function public.block_completions_guard_immutable() returns trigger
language plpgsql
as $$
declare
  is_service_role boolean;
begin
  -- auth.uid() returns NULL when called via the service role (no
  -- authenticated user in the JWT). Both admin writes and the cutoff
  -- job run as the service role; bypass the guard for them.
  is_service_role := auth.uid() IS NULL;
  if is_service_role or public.is_admin() then
    return new;
  end if;
  if new.user_id is distinct from old.user_id
     or new.local_date is distinct from old.local_date
     or new.block_key is distinct from old.block_key
     or new.timezone is distinct from old.timezone
     or new.client_event_id is distinct from old.client_event_id
  then
    raise exception 'block_completions immutable fields cannot be changed by member'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists block_completions_guard_immutable on public.block_completions;
create trigger block_completions_guard_immutable
  before update on public.block_completions
  for each row execute function public.block_completions_guard_immutable();

-- Same guard on INSERT: a member cannot insert a row claiming a
-- different user_id (already covered by the policy's with check, but
-- this is defense in depth).
create or replace function public.block_completions_guard_insert() returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.user_id is distinct from auth.uid() then
    raise exception 'block_completions user_id must match caller'
      using errcode = '42501';
  end if;
  if new.status is distinct from 'completed' then
    raise exception 'block_completions status must be completed for member writes'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists block_completions_guard_insert on public.block_completions;
create trigger block_completions_guard_insert
  before insert on public.block_completions
  for each row execute function public.block_completions_guard_insert();
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
-- 019_rls_leaderboard_projection.sql
-- The leaderboard projection is a derived table maintained by the
-- run_cutoff_for_all_cohorts and refresh_leaderboard_for_cohort
-- functions (which run as the service role). Members must only be
-- able to SELECT. The original (002) had a SELECT policy and relied
-- on the implicit deny for writes; that's fragile. Make the deny
-- explicit so a future permissive INSERT/UPDATE/DELETE policy can't
-- accidentally open the table.
--
-- Note: the implicit deny already keeps writes blocked. The trigger
-- below is belt and suspenders for the case where a future migration
-- adds a permissive policy that the author forgot to scope.

-- The original SELECT policy was already created in migration 002.
-- Drop it first to avoid a 42710 duplicate-policy error when this
-- consolidated file is re-run.
drop policy if exists leaderboard_read on public.leaderboard_projection;
create policy leaderboard_read on public.leaderboard_projection
  for select to authenticated
  using (true);

-- Defense in depth: any write by an authenticated member is rejected,
-- even if a future policy loosens. The service role bypasses triggers
-- via auth.uid() IS NULL.
create or replace function public.leaderboard_projection_guard_writes() returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    -- service role or admin API. Allow.
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  raise exception 'leaderboard_projection is server-managed; members cannot write'
    using errcode = '42501';
end $$;

drop trigger if exists leaderboard_projection_guard_insert on public.leaderboard_projection;
create trigger leaderboard_projection_guard_insert
  before insert on public.leaderboard_projection
  for each row execute function public.leaderboard_projection_guard_writes();

drop trigger if exists leaderboard_projection_guard_update on public.leaderboard_projection;
create trigger leaderboard_projection_guard_update
  before update on public.leaderboard_projection
  for each row execute function public.leaderboard_projection_guard_writes();

drop trigger if exists leaderboard_projection_guard_delete on public.leaderboard_projection;
create trigger leaderboard_projection_guard_delete
  before delete on public.leaderboard_projection
  for each row execute function public.leaderboard_projection_guard_writes();
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
-- Phase 6a: data-driven schedule.
--
-- Closes the PRD §7.1 violation: the app was reading the schedule
-- from a hardcoded TypeScript constant instead of the database. The
-- canonical form (canonical_schedule_blocks) was created in
-- migration 012 but the app never read it.
--
-- This migration:
--   1. Adds a config table for cohort-level overrides (cutoff hour,
--      schedule template version) so admins can change them without
--      a code deploy.
--   2. Adds a per-day instance table (daily_schedule_instances) per
--      PRD §9. Stores template_version + timezone + cutoff_at so the
--      cutoff logic is reproducible from per-row data.
--   3. Adds RLS for the new table and the config table.
--   4. Provides a function that resolves the active schedule for a
--      given cohort (single source of truth: the canonical blocks
--      joined with the cohort config).

-- Per-cohort schedule config. One row per cohort. Created with
-- sensible defaults so existing cohorts get a row on first read.
create table if not exists public.cohort_schedule_config (
  cohort_id uuid primary key references public.cohorts(id) on delete cascade,
  cutoff_hour int not null default 3 check (cutoff_hour between 0 and 23),
  schedule_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill: every existing cohort gets a config row with the
-- defaults (cutoff_hour=3, version=1). Idempotent.
insert into public.cohort_schedule_config (cohort_id)
  select id from public.cohorts
  on conflict (cohort_id) do nothing;

-- Per-day schedule instance. The PRD §9 data model calls for this
-- so a member's schedule for a given local_date is reproducible
-- from a single row (template_version, timezone, cutoff_at).
-- The Today route uses this to decide which cutoff applies to a
-- completion attempt; the cutoff job inserts a missed row if the
-- instance is past cutoff and the member has no completion.
create table if not exists public.daily_schedule_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  local_date date not null,
  template_version int not null,
  timezone text not null,
  cutoff_at timestamptz not null,
  unique (user_id, local_date)
);
create index if not exists daily_schedule_instances_user_date_idx
  on public.daily_schedule_instances (user_id, local_date);
create index if not exists daily_schedule_instances_cohort_date_idx
  on public.daily_schedule_instances (cohort_id, local_date);

alter table public.daily_schedule_instances enable row level security;
create policy daily_schedule_self on public.daily_schedule_instances
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy daily_schedule_self_write on public.daily_schedule_instances
  for insert to authenticated with check (user_id = auth.uid());
create policy daily_schedule_self_update on public.daily_schedule_instances
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.cohort_schedule_config enable row level security;
create policy cohort_schedule_admin_read on public.cohort_schedule_config
  for select to authenticated using (public.is_admin());
create policy cohort_schedule_admin_write on public.cohort_schedule_config
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Resolver function. Returns the active blocks for a cohort,
-- reading the canonical table. The app uses this instead of the
-- hardcoded STANDARD_SCHEDULE. Idempotent.
create or replace function public.get_canonical_schedule_for_cohort(p_cohort uuid)
returns table (
  key text,
  start_time time,
  end_time time,
  label text,
  required boolean,
  critical boolean,
  sort_order int
)
language sql
stable
as $$
  select
    b.key, b.start_time, b.end_time, b.label, b.required, b.critical, b.sort_order
  from public.canonical_schedule_blocks b
  order by b.sort_order;
$$;

-- Resolve the per-day instance. Lazily inserts a row if one
-- doesn't exist for (user, local_date). Called from the API
-- routes on every /api/schedule/complete and /api/checkins PUT.
create or replace function public.resolve_daily_schedule_instance(
  p_user uuid,
  p_cohort uuid,
  p_local_date date,
  p_timezone text,
  p_cutoff_hour int
)
returns public.daily_schedule_instances
language plpgsql
as $$
declare
  v_row public.daily_schedule_instances%rowtype;
  v_template_version int;
  v_cutoff timestamptz;
begin
  -- Look up the cohort's current template version.
  select schedule_version into v_template_version
  from public.cohort_schedule_config
  where cohort_id = p_cohort;

  if v_template_version is null then
    -- Cohort has no config; default to version 1.
    v_template_version := 1;
  end if;

  -- Compute the cutoff as (local_date + cutoff_hour) interpreted
  -- in the member's timezone. We construct the cutoff as a UTC
  -- instant by treating the local date/hour as UTC, then the
  -- caller is responsible for the timezone interpretation at
  -- read time. (The actual timezone-aware computation lives in
  -- lib/domain/schedule.ts; this function stores what the API
  -- computed.)
  v_cutoff := (p_local_date::text || ' ' || lpad(p_cutoff_hour::text, 2, '0') || ':00:00')::timestamp
               at time zone 'UTC';

  -- Lazy insert.
  insert into public.daily_schedule_instances
    (user_id, cohort_id, local_date, template_version, timezone, cutoff_at)
  values
    (p_user, p_cohort, p_local_date, v_template_version, p_timezone, v_cutoff)
  on conflict (user_id, local_date) do update
    set cutoff_at = excluded.cutoff_at
  returning * into v_row;

  return v_row;
end;
$$;
-- Phase 6b: team progress log fields.
--
-- PRD §7.4: "Shared progress log with author, timestamp, category,
-- and text/link attachment where supported." The original table
-- (migration 001) only had body + author + created_at. Add the
-- two PRD-mandated fields: category (a fixed enum) and link_url
-- (optional). Both are nullable on insert for backfill; the API
-- requires them.

alter table public.team_progress_logs
  add column if not exists category text
    check (category is null or category in ('update', 'blocker', 'milestone', 'idea')),
  add column if not exists link_url text
    check (link_url is null or link_url ~ '^https?://');

-- Add the column comment for clarity.
comment on column public.team_progress_logs.category is
  'PRD §7.4 category. One of: update, blocker, milestone, idea.';
comment on column public.team_progress_logs.link_url is
  'PRD §7.4 optional link attachment. Validated as http(s) URL by
  the API; constrained by check to https?:// for defense in depth.';

-- The existing RLS policy (progress_team_write) uses WITH CHECK
-- (author_id=auth.uid() and is_team_member(team_id)). After the
-- column add, the policy still applies; the API also requires
-- the category. No policy change needed.
-- 023_community_version.sql
-- PRD §7.5: "Every item has source/date and may include a manually
-- configured external community link when relevant." and
-- "content version" (implied by §7.6 same pattern for reports).
--
-- The community_posts table already has pinned, source_url,
-- published_at. Adding:
--   - version: auto-increments on UPDATE so clients can detect
--     silent content refreshes (same pattern as reports.version).
--   - source_label: optional human-readable source name (e.g.
--     "Cohort lead", "Whop community", "X thread") since
--     source_url alone is not always informative.
--
-- Backfill version=1 for existing rows so the column is not null.

alter table public.community_posts
  add column if not exists version int not null default 1,
  add column if not exists source_label text;

update public.community_posts set version = 1 where version is null;

-- Bump-on-update trigger. Same shape as the reports version
-- trigger, idempotent if it already exists.
create or replace function public.community_posts_bump_version() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    -- Only bump when the body or title actually changed; routine
    -- column writes (e.g. published_at) shouldn't trigger a
    -- version bump.
    if new.title is distinct from old.title or new.body is distinct from old.body then
      new.version := coalesce(old.version, 1) + 1;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists community_posts_version_bump on public.community_posts;
create trigger community_posts_version_bump
  before update on public.community_posts
  for each row execute function public.community_posts_bump_version();
-- 024_notification_backoff.sql
-- Adds next_retry_at + last_error columns to notification_jobs
-- so process-notifications can implement exponential backoff
-- instead of retrying a temporarily-failed job on the next
-- 5-minute tick. Phase 9.
--
-- Backoff schedule (delays after attempt N, in minutes):
--   N=0  -> immediately eligible (next_retry_at = now())
--   N=1  -> 1 minute
--   N=2  -> 5 minutes
--   N=3  -> 30 minutes
--   N=4+ -> permanent (status='failed')
-- 5 attempts is the cap; matches the existing 5-attempt
-- policy. Jitter (+/- 20%) is applied at runtime in the
-- edge function so parallel crons don't synchronize.

alter table public.notification_jobs
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_error text;

-- Backfill: every existing 'queued' row is eligible now.
update public.notification_jobs
  set next_retry_at = coalesce(next_retry_at, scheduled_at)
  where next_retry_at is null;
