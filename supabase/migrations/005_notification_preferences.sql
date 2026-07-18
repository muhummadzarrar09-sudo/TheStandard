create table if not exists public.notification_preferences(user_id uuid primary key references auth.users(id) on delete cascade,daily_reminder boolean not null default true,report_alerts boolean not null default true,team_messages boolean not null default true,quiet_start time,quiet_end time,updated_at timestamptz not null default now());
alter table public.notification_preferences enable row level security;
create policy notification_preferences_self on public.notification_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
