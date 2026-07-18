create table if not exists public.team_milestones(id uuid primary key default gen_random_uuid(),team_id uuid not null references public.teams(id) on delete cascade,title text not null,description text,owner_id uuid references auth.users(id),due_at timestamptz,status text not null default 'planned' check(status in('planned','in_progress','blocked','complete')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.team_milestones enable row level security;
create policy milestones_read on public.team_milestones for select to authenticated using(public.is_team_member(team_id) or public.is_admin());
create policy milestones_admin_write on public.team_milestones for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy milestones_member_update on public.team_milestones for update to authenticated using(public.is_team_member(team_id)) with check(public.is_team_member(team_id));
create index if not exists milestones_team_due on public.team_milestones(team_id,due_at);
