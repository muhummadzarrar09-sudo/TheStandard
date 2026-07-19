-- 023_community_version.sql
-- PRD §7.5: "Every item has source/date and may include a manually
-- configured external community link when relevant." and
-- "content version" (implied by §7.6 same pattern for reports).
--
-- The community_posts table already has pinned, source_url,
-- published_at. Adding:
--   - version: auto-increments on UPDATE so clients can detect
--     silent content refreshes (same pattern as reports.version).
--   - source_label: optional human-readable source name (e.g.
--     "Cohort lead", "Whop community", "X thread") since
--     source_url alone is not always informative.
--
-- Backfill version=1 for existing rows so the column is not null.

alter table public.community_posts
  add column if not exists version int not null default 1,
  add column if not exists source_label text;

update public.community_posts set version = 1 where version is null;

-- Bump-on-update trigger. Same shape as the reports version
-- trigger, idempotent if it already exists.
create or replace function public.community_posts_bump_version() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    -- Only bump when the body or title actually changed; routine
    -- column writes (e.g. published_at) shouldn't trigger a
    -- version bump.
    if new.title is distinct from old.title or new.body is distinct from old.body then
      new.version := coalesce(old.version, 1) + 1;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists community_posts_version_bump on public.community_posts;
create trigger community_posts_version_bump
  before update on public.community_posts
  for each row execute function public.community_posts_bump_version();
