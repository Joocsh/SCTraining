-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · security hardening (Supabase Security Advisor)
-- Run after 0002_seed.sql.
-- ════════════════════════════════════════════════════════════════════

-- Trigger functions run with a fixed search path.
alter function public.check_grade_score() set search_path = public;
alter function public.check_mode_score() set search_path = public;

-- Helpers that should not be callable through the API live in a schema
-- the API does not expose. Policies and triggers keep working because
-- Postgres references functions by id, not by name.
create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.is_admin() set schema private;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

alter function public.handle_new_user() set schema private;
revoke all on function private.handle_new_user() from public, anon, authenticated;

-- set_profile_access is meant to be called by signed in admins (it checks
-- private.is_admin() itself); visitors who are not signed in cannot call it.
create or replace function public.set_profile_access(target uuid, new_role public.app_role, new_assigned_role smallint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not private.is_admin() then
    raise exception 'Only admins can change access';
  end if;
  update public.profiles set app_role = new_role, assigned_role_id = new_assigned_role where id = target;
end;
$$;
revoke all on function public.set_profile_access(uuid, public.app_role, smallint) from public, anon;
grant execute on function public.set_profile_access(uuid, public.app_role, smallint) to authenticated;

-- The function behind "Enable automatic RLS" (created by Supabase) only
-- runs from its event trigger, never through the API.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
