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
