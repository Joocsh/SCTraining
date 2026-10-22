-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · coaches assign trainings and simulations too
-- Run after 0009_intro_required.sql.
--
--   admin   assigns trainings and simulations to any associate, and
--           assigns associates to coaches
--   coach   assigns trainings and simulations to their own associates
-- ════════════════════════════════════════════════════════════════════

-- True when the signed in user coaches this associate.
create or replace function private.is_coach_of(target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.coach_assignments where coach_id = auth.uid() and associate_id = target);
$$;
revoke all on function private.is_coach_of(uuid) from public, anon;
grant execute on function private.is_coach_of(uuid) to authenticated;

drop policy "Admins manage course assignments" on public.course_assignments;
create policy "Staff manage course assignments" on public.course_assignments for all to authenticated
  using (private.is_admin() or private.is_coach_of(associate_id))
  with check (private.is_admin() or private.is_coach_of(associate_id));

drop policy "Admins manage simulation access" on public.simulation_assignments;
create policy "Staff manage simulation access" on public.simulation_assignments for all to authenticated
  using (private.is_admin() or private.is_coach_of(associate_id))
  with check (private.is_admin() or private.is_coach_of(associate_id));

-- assign_course() said "only admins"; the policies above now decide.
create or replace function public.assign_course(associate uuid, course smallint, due date default null)
returns void language plpgsql security invoker set search_path = public as $$
begin
  insert into public.course_assignments (associate_id, course_id, assigned_by, due_on)
  values (associate, course, auth.uid(), due)
  on conflict (associate_id, course_id) do update set due_on = excluded.due_on;
end; $$;

create or replace function public.unassign_course(associate uuid, course smallint)
returns void language plpgsql security invoker set search_path = public as $$
begin
  delete from public.course_assignments where associate_id = associate and course_id = course;
end; $$;
