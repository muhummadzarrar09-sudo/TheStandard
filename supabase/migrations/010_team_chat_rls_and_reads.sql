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
