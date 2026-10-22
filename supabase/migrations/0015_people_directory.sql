-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · the Users section of Settings
-- Run after 0014_staff_create_accounts.sql.
--
--   people_directory()  the accounts a staff member manages: an admin
--                       sees everyone, a coach sees the associates on
--                       their team. Email, last sign in and whether the
--                       account is deactivated come from auth.users,
--                       which the browser cannot read directly.
--   Password resets and deactivation go through the manage-user Edge
--   Function (supabase/functions/manage-user).
-- ════════════════════════════════════════════════════════════════════

create or replace function public.people_directory()
returns table (id uuid, email text, full_name text, app_role public.app_role, assigned_role text, coaches text,
               created_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz, created_by text)
language sql stable security definer set search_path = public
as $$
  select p.id, u.email::text, p.full_name, p.app_role, r.slug,
         (select string_agg(c.full_name, ', ' order by c.full_name)
            from public.coach_assignments ca join public.profiles c on c.id = ca.coach_id
           where ca.associate_id = p.id),
         p.created_at, u.last_sign_in_at, u.banned_until, cb.full_name
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.sim_roles r on r.id = p.assigned_role_id
  left join public.profiles cb on cb.id = p.created_by
  where private.is_admin()
     or (p.app_role = 'associate'
         and exists (select 1 from public.coach_assignments x where x.coach_id = auth.uid() and x.associate_id = p.id))
  order by p.full_name;
$$;
revoke all on function public.people_directory() from public, anon;
grant execute on function public.people_directory() to authenticated;
