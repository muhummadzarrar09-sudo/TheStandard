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
      get diagnostics rows_added = rows_added + row_count;
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
