-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · the admin's list of people
-- Run after 0007_progress.sql.
--
-- Emails live only in auth.users. This function lets an admin read them
-- next to each profile without copying them anywhere.
-- ════════════════════════════════════════════════════════════════════
create or replace function public.admin_people()
returns table (
  id               uuid,
  email            text,
  full_name        text,
  app_role         public.app_role,
  assigned_role    text,
  created_at       timestamptz,
  last_sign_in_at  timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not private.is_admin() then
    raise exception 'Only admins can list people';
  end if;
  return query
  select p.id, u.email::text, p.full_name, p.app_role, r.slug, p.created_at, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.sim_roles r on r.id = p.assigned_role_id
  order by p.full_name;
end;
$$;
revoke all on function public.admin_people() from public, anon;
grant execute on function public.admin_people() to authenticated;
