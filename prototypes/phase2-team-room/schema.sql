-- Phase 2 Supabase foundation. Run after profiles/teams exist.
create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  client_message_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz,
  unique(team_id, client_message_id)
);
create index if not exists team_messages_team_created on public.team_messages(team_id, created_at desc);
alter table public.team_messages enable row level security;
create or replace function public.is_team_member(target_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.team_members tm where tm.team_id=target_team and tm.user_id=auth.uid());
$$;
create policy "team members can read team messages" on public.team_messages for select to authenticated using (public.is_team_member(team_id));
create policy "team members can send team messages" on public.team_messages for insert to authenticated with check (public.is_team_member(team_id) and author_id=auth.uid());
create policy "authors can edit own messages" on public.team_messages for update to authenticated using (author_id=auth.uid()) with check (author_id=auth.uid());
create table if not exists public.team_message_reads (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_message_id uuid references public.team_messages(id),
  last_read_at timestamptz not null default now(),
  primary key(team_id,user_id)
);
alter table public.team_message_reads enable row level security;
create policy "members manage own read state" on public.team_message_reads for all to authenticated using (user_id=auth.uid() and public.is_team_member(team_id)) with check (user_id=auth.uid() and public.is_team_member(team_id));
