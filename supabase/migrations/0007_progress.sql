-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · simulation access and general progress
-- Run after 0006_invoker_rpcs.sql, in two steps (the new enum value must
-- be committed before it is used).
--
-- General progress of an associate = the Introduction + the trainings
-- they have (open or assigned) + the simulations they have (open or
-- assigned). Test drives are not part of it. Every item counts once:
--   training    lessons done / lessons in the training
--   simulation  points earned / points available (practice modes plus
--               the emails of that role, graded by a coach)
-- Nothing here is stored: it is all computed from the activity tables.
-- ════════════════════════════════════════════════════════════════════

-- ─── step 1 (run on its own) ─────────────────────────────────────────
alter type public.notification_type add value if not exists 'simulation_assigned' after 'course_assigned';

-- ─── step 2 ──────────────────────────────────────────────────────────
-- Simulations are open to everyone by default; an admin can close one
-- and assign it to specific associates instead.
alter table public.sim_roles add column is_open boolean not null default true;

create table public.simulation_assignments (
  associate_id uuid     not null references public.profiles (id) on delete cascade,
  role_id      smallint not null references public.sim_roles (id) on delete cascade,
  assigned_by  uuid     references public.profiles (id) on delete set null,
  assigned_at  timestamptz not null default now(),
  primary key (associate_id, role_id)
);
create index on public.simulation_assignments (role_id);
create index on public.simulation_assignments (assigned_by);

alter table public.simulation_assignments enable row level security;
create policy "Read simulation access you can see" on public.simulation_assignments for select to authenticated
  using (private.can_view(associate_id));
create policy "Admins manage simulation access" on public.simulation_assignments for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create or replace function private.has_simulation(target uuid, role smallint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.sim_roles where id = role and is_active and is_open)
      or exists (select 1 from public.simulation_assignments where associate_id = target and role_id = role);
$$;
revoke all on function private.has_simulation(uuid, smallint) from public, anon;
grant execute on function private.has_simulation(uuid, smallint) to authenticated;

-- Scores and emails can only be recorded in simulations the person has.
drop policy "Own activity" on public.role_mode_scores;
create policy "Own activity" on public.role_mode_scores for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and private.has_simulation(user_id,
    (select role_id from public.role_modes where id = role_mode_id)));

drop policy "Submit own emails" on public.email_submissions;
create policy "Submit own emails" on public.email_submissions for insert to authenticated
  with check (user_id = auth.uid() and private.has_simulation(user_id,
    (select role_id from public.email_scenarios where id = scenario_id)));

create or replace function public.assign_simulation(associate uuid, role smallint)
returns void language plpgsql security invoker set search_path = public as $$
begin
  insert into public.simulation_assignments (associate_id, role_id, assigned_by) values (associate, role, auth.uid())
  on conflict do nothing;
end; $$;
create or replace function public.unassign_simulation(associate uuid, role smallint)
returns void language plpgsql security invoker set search_path = public as $$
begin
  delete from public.simulation_assignments where associate_id = associate and role_id = role;
end; $$;
revoke all on function public.assign_simulation(uuid, smallint) from public, anon;
revoke all on function public.unassign_simulation(uuid, smallint) from public, anon;
grant execute on function public.assign_simulation(uuid, smallint) to authenticated;
grant execute on function public.unassign_simulation(uuid, smallint) to authenticated;

-- Notify the associate when a simulation is assigned.
alter table public.notifications add column sim_role_id smallint references public.sim_roles (id) on delete cascade;
create index on public.notifications (sim_role_id);
do $$
declare c text;
begin
  -- the unnamed check from 0005 that ties each type to its subject
  for c in select conname from pg_constraint
           where conrelid = 'public.notifications'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) like '%announcement%'
  loop
    execute format('alter table public.notifications drop constraint %I', c);
  end loop;
end $$;
alter table public.notifications add constraint notifications_one_subject check (
  (type = 'course_assigned'     and course_id is not null and submission_id is null and person_id is null and sim_role_id is null and message is null) or
  (type = 'simulation_assigned' and sim_role_id is not null and course_id is null and submission_id is null and person_id is null and message is null) or
  (type = 'email_graded'        and submission_id is not null and course_id is null and person_id is null and sim_role_id is null and message is null) or
  (type in ('coach_assigned', 'associate_assigned') and person_id is not null and course_id is null and submission_id is null and sim_role_id is null and message is null) or
  (type = 'announcement'        and message is not null and course_id is null and submission_id is null and person_id is null and sim_role_id is null)
);

create or replace function private.notify_simulation_assigned()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (recipient_id, type, sim_role_id) values (new.associate_id, 'simulation_assigned', new.role_id);
  return new;
end; $$;
revoke all on function private.notify_simulation_assigned() from public, anon, authenticated;
create trigger simulation_assignments_notify after insert on public.simulation_assignments
  for each row execute function private.notify_simulation_assigned();

-- ─── progress views ──────────────────────────────────────────────────
-- Simulations each person has.
create view public.my_simulations with (security_invoker = true) as
select p.id as user_id, r.id as role_id, r.slug, r.title, r.page_path, r.is_open, sa.assigned_at, sa.assigned_by
from public.profiles p
join public.sim_roles r on r.is_active
 and (r.is_open or exists (select 1 from public.simulation_assignments x where x.associate_id = p.id and x.role_id = r.id))
left join public.simulation_assignments sa on sa.associate_id = p.id and sa.role_id = r.id;

-- Points available in each simulation: practice modes plus its emails.
create view public.simulation_max_points with (security_invoker = true) as
select r.id as role_id,
       coalesce((select sum(max_score) from public.role_modes where role_id = r.id), 0)
     + coalesce((select sum(max_score) from public.email_scenarios where role_id = r.id), 0) as max_points
from public.sim_roles r;

-- One row per item a person has, with how far they are.
create view public.progress_items with (security_invoker = true) as
select mc.user_id,
       case when mc.is_open then 'introduction' else 'training' end as category,
       mc.course_id::int as item_id, mc.title,
       coalesce(cp.percent, 0) as percent,
       (cc.completed_at is not null or coalesce(cp.percent, 0) >= 100) as completed,
       greatest(cc.completed_at, (select max(lc.completed_at) from public.lesson_completions lc
                                    join public.lessons l on l.id = lc.lesson_id
                                    join public.course_modules m on m.id = l.module_id
                                   where lc.user_id = mc.user_id and m.course_id = mc.course_id)) as last_activity_at
from public.my_courses mc
left join public.course_progress cp on cp.user_id = mc.user_id and cp.course_id = mc.course_id
left join public.course_completions cc on cc.user_id = mc.user_id and cc.course_id = mc.course_id
union all
select ms.user_id, 'simulation', ms.role_id::int, ms.title,
       least(100, round(100.0 * coalesce(rp.score, 0) / nullif(mp.max_points, 0)))::int,
       coalesce(rp.score, 0) >= mp.max_points and mp.max_points > 0,
       greatest((select max(updated_at) from public.role_mode_scores s join public.role_modes rm on rm.id = s.role_mode_id
                  where s.user_id = ms.user_id and rm.role_id = ms.role_id),
                (select max(submitted_at) from public.email_submissions e join public.email_scenarios sc on sc.id = e.scenario_id
                  where e.user_id = ms.user_id and sc.role_id = ms.role_id))
from public.my_simulations ms
join public.simulation_max_points mp on mp.role_id = ms.role_id
left join public.role_progress rp on rp.user_id = ms.user_id and rp.role_id = ms.role_id;

-- General progress per person and per category: every item weighs the same.
create view public.progress_summary with (security_invoker = true) as
select user_id, category,
       count(*)::int                           as items,
       count(*) filter (where completed)::int  as completed_items,
       round(avg(percent))::int                as percent,
       max(last_activity_at)                   as last_activity_at
from public.progress_items
group by grouping sets ((user_id, category), (user_id));
-- category is null on the overall row of each person.
