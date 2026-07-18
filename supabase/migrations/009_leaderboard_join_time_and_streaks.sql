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
