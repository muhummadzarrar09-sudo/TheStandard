-- 007_profiles_self_update_lock.sql
-- Fix: profiles_self_update allowed any member to rewrite their own role,
-- cohort_id, and access window because with check only constrained the row id.
-- A member could call .from('profiles').update({role:'admin'}) and get promoted.
--
-- Drop the permissive policy and recreate it with explicit column constraints
-- that match what /api/profile allows members to change: display_name, timezone,
-- theme_preset. role, cohort_id, access_start_at, access_end_at are locked.

drop policy if exists profiles_self_update on public.profiles;

create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and cohort_id is not distinct from (select cohort_id from public.profiles where id = auth.uid())
    and access_start_at is not distinct from (select access_start_at from public.profiles where id = auth.uid())
    and access_end_at   is not distinct from (select access_end_at   from public.profiles where id = auth.uid())
  );

-- Belt and suspenders: a BEFORE UPDATE trigger that rejects any attempt to
-- change role/cohort/access even if the policy is later loosened. This is the
-- last line of defense for admin-only fields.
create or replace function public.profiles_guard_admin_fields() returns trigger
language plpgsql as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role
       or new.cohort_id is distinct from old.cohort_id
       or new.access_start_at is distinct from old.access_start_at
       or new.access_end_at is distinct from old.access_end_at then
      raise exception 'profiles admin fields cannot be changed by non-admin'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_admin_fields on public.profiles;
create trigger profiles_guard_admin_fields
  before update on public.profiles
  for each row execute function public.profiles_guard_admin_fields();
