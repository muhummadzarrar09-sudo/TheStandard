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
