-- 013_critical_block_reminder.sql
-- Add critical_block_reminder to notification_preferences. PRD 7.7 lists
-- "Optional reminders before critical blocks" as a category, but the table
-- in migration 005 omitted it. Default true so existing rows pick up the
-- new category on their next read.
alter table public.notification_preferences
  add column if not exists critical_block_reminder boolean not null default true;
