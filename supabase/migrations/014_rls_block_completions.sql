-- 014_rls_block_completions.sql
-- Harden block_completions RLS.
-- The original policy (001) was "for all ... using(user_id=auth.uid()) with
-- check(user_id=auth.uid())" — which allowed any operation including DELETE
-- and let a member change the status to 'missed' for their own block.
--
-- Plan:
--   * SELECT: member reads only their own.
--   * INSERT: member can only insert their own row, status must be
--     'completed' (never 'missed' — that is server-only).
--   * UPDATE: still allowed (the API uses upsert for idempotency), but
--     constrained so user_id, local_date, block_key, timezone, and
--     client_event_id cannot change; status may only stay 'completed'
--     or move between 'completed' and the same value (a defense in
--     depth — the trigger below is the real guard).
--   * DELETE: denied for members. Cutoff job and admin can still
--     truncate if needed via the service role.
--   * A BEFORE UPDATE trigger that rejects any change to the immutable
--     columns. Admin and service role bypass via auth.uid() = NULL
--     detection. Even if the policy is later loosened, the trigger still
--     holds.

drop policy if exists completions_self on public.block_completions;

create policy completions_self_select on public.block_completions
  for select to authenticated
  using (user_id = auth.uid());

create policy completions_self_insert on public.block_completions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'completed'
  );

create policy completions_self_update on public.block_completions
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    -- The new row must still belong to the caller. The trigger below
    -- adds the column-level guard (user_id, local_date, block_key,
    -- timezone, client_event_id are immutable on update).
    user_id = auth.uid()
    and status in ('completed', 'missed', 'optional')
  );

-- No DELETE policy. Members cannot delete their completions.

create or replace function public.block_completions_guard_immutable() returns trigger
language plpgsql
as $$
declare
  is_service_role boolean;
begin
  -- auth.uid() returns NULL when called via the service role (no
  -- authenticated user in the JWT). Both admin writes and the cutoff
  -- job run as the service role; bypass the guard for them.
  is_service_role := auth.uid() IS NULL;
  if is_service_role or public.is_admin() then
    return new;
  end if;
  if new.user_id is distinct from old.user_id
     or new.local_date is distinct from old.local_date
     or new.block_key is distinct from old.block_key
     or new.timezone is distinct from old.timezone
     or new.client_event_id is distinct from old.client_event_id
  then
    raise exception 'block_completions immutable fields cannot be changed by member'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists block_completions_guard_immutable on public.block_completions;
create trigger block_completions_guard_immutable
  before update on public.block_completions
  for each row execute function public.block_completions_guard_immutable();

-- Same guard on INSERT: a member cannot insert a row claiming a
-- different user_id (already covered by the policy's with check, but
-- this is defense in depth).
create or replace function public.block_completions_guard_insert() returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.user_id is distinct from auth.uid() then
    raise exception 'block_completions user_id must match caller'
      using errcode = '42501';
  end if;
  if new.status is distinct from 'completed' then
    raise exception 'block_completions status must be completed for member writes'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists block_completions_guard_insert on public.block_completions;
create trigger block_completions_guard_insert
  before insert on public.block_completions
  for each row execute function public.block_completions_guard_insert();
