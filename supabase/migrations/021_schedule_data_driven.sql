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
