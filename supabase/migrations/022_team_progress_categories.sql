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
