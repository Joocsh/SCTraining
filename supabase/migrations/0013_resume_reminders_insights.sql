-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · simulation resume, reminders, question insights
-- Run after 0012_best_email_grade.sql, in two steps (the new enum value
-- must be committed before it is used).
--
--   simulation_sessions  the exact point of each person in each
--                        simulation case, saved as they work, so a case
--                        survives a closed tab, a reboot or a new computer
--   reminders            a daily job notifies associates who stopped
--                        working on something they have, and their coaches
--                        after a longer silence. There are no due dates.
--   question_stats       how each checkpoint question does: people, right
--                        on the first try, attempts
-- ════════════════════════════════════════════════════════════════════

-- ─── step 1 (run on its own) ─────────────────────────────────────────
alter type public.notification_type add value if not exists 'reminder';

-- ─── step 2 ──────────────────────────────────────────────────────────

-- ─── where each person is in each simulation case ────────────────────
-- state is the case snapshot the simulation pages already build
-- (city, case, step, answers, drafts); the database only keeps it.
create table public.simulation_sessions (
  user_id    uuid     not null references public.profiles (id) on delete cascade,
  role_id    smallint not null references public.sim_roles (id) on delete cascade,
  state      jsonb    not null check (pg_column_size(state) < 1000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, role_id)
);
create index on public.simulation_sessions (role_id);

alter table public.simulation_sessions enable row level security;
create policy "Own sessions" on public.simulation_sessions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and private.has_simulation(user_id, role_id));
create policy "Staff read sessions" on public.simulation_sessions for select to authenticated
  using (private.can_view(user_id));

-- ─── reminders ───────────────────────────────────────────────────────
-- A reminder is about one training (course_id) or one simulation
-- (sim_role_id). person_id is set when it goes to a coach, about an
-- associate.
alter table public.notifications drop constraint notifications_one_subject;
alter table public.notifications add constraint notifications_one_subject check (
  (type = 'course_assigned'     and course_id is not null and submission_id is null and person_id is null and sim_role_id is null and message is null) or
  (type = 'simulation_assigned' and sim_role_id is not null and course_id is null and submission_id is null and person_id is null and message is null) or
  (type = 'email_graded'        and submission_id is not null and course_id is null and person_id is null and sim_role_id is null and message is null) or
  (type in ('coach_assigned', 'associate_assigned') and person_id is not null and course_id is null and submission_id is null and sim_role_id is null and message is null) or
  (type = 'announcement'        and message is not null and course_id is null and submission_id is null and person_id is null and sim_role_id is null) or
  (type = 'reminder'            and message is not null and submission_id is null and num_nonnulls(course_id, sim_role_id) = 1)
);

-- What each associate has and has not finished, and their last activity
-- on it. The Introduction counts for everyone; trainings and simulations
-- only when assigned.
create or replace function private.unfinished_work()
returns table (user_id uuid, course_id smallint, sim_role_id smallint, title text, last_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select p.id, c.id, null::smallint, c.title,
         greatest(coalesce(ca.assigned_at, p.created_at),
                  (select max(lc.completed_at) from public.lesson_completions lc
                     join public.lessons l on l.id = lc.lesson_id
                     join public.course_modules m on m.id = l.module_id
                    where lc.user_id = p.id and m.course_id = c.id))
  from public.profiles p
  join public.courses c on c.is_open
     or exists (select 1 from public.course_assignments x where x.associate_id = p.id and x.course_id = c.id)
  left join public.course_assignments ca on ca.associate_id = p.id and ca.course_id = c.id
  where p.app_role = 'associate'
    and not exists (select 1 from public.course_completions cc where cc.user_id = p.id and cc.course_id = c.id)
  union all
  select sa.associate_id, null::smallint, r.id, r.title,
         greatest(sa.assigned_at,
                  (select max(s.updated_at) from public.role_mode_scores s join public.role_modes rm on rm.id = s.role_mode_id
                    where s.user_id = sa.associate_id and rm.role_id = r.id),
                  (select max(e.submitted_at) from public.email_submissions e join public.email_scenarios es on es.id = e.scenario_id
                    where e.user_id = sa.associate_id and es.role_id = r.id),
                  (select ss.updated_at from public.simulation_sessions ss where ss.user_id = sa.associate_id and ss.role_id = r.id))
  from public.simulation_assignments sa
  join public.sim_roles r on r.id = sa.role_id and r.is_active
  join public.profiles p on p.id = sa.associate_id and p.app_role = 'associate'
  join public.simulation_max_points mp on mp.role_id = r.id
  left join public.role_progress rp on rp.user_id = sa.associate_id and rp.role_id = r.id
  where not (mp.max_points > 0 and coalesce(rp.score, 0) >= mp.max_points);
$$;
revoke all on function private.unfinished_work() from public, anon, authenticated;

-- Runs once a day. An associate hears about an unfinished item after 3
-- days without activity on it, then at most every 5 days. Their coaches
-- hear after 7 days, then at most every 7 days.
create or replace function private.send_reminders()
returns integer
language plpgsql security definer set search_path = public
as $$
declare to_associates integer; to_coaches integer;
begin
  insert into public.notifications (recipient_id, type, course_id, sim_role_id, message)
  select w.user_id, 'reminder', w.course_id, w.sim_role_id,
         'No activity in ' || extract(day from now() - w.last_at)::int || ' days. Pick it up where you left off.'
  from private.unfinished_work() w
  where w.last_at < now() - interval '3 days'
    and not exists (select 1 from public.notifications n
                     where n.recipient_id = w.user_id and n.type = 'reminder' and n.person_id is null
                       and n.course_id is not distinct from w.course_id and n.sim_role_id is not distinct from w.sim_role_id
                       and n.created_at > now() - interval '5 days');
  get diagnostics to_associates = row_count;

  insert into public.notifications (recipient_id, type, course_id, sim_role_id, person_id, message)
  select ca.coach_id, 'reminder', w.course_id, w.sim_role_id, w.user_id,
         'No activity in ' || extract(day from now() - w.last_at)::int || ' days.'
  from private.unfinished_work() w
  join public.coach_assignments ca on ca.associate_id = w.user_id
  where w.last_at < now() - interval '7 days'
    and not exists (select 1 from public.notifications n
                     where n.recipient_id = ca.coach_id and n.type = 'reminder' and n.person_id = w.user_id
                       and n.course_id is not distinct from w.course_id and n.sim_role_id is not distinct from w.sim_role_id
                       and n.created_at > now() - interval '7 days');
  get diagnostics to_coaches = row_count;

  return to_associates + to_coaches;
end;
$$;
revoke all on function private.send_reminders() from public, anon, authenticated;

-- Every day at 15:00 UTC (9:00 in Central time, 8:00 in winter).
create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname = 'sc-daily-reminders';
select cron.schedule('sc-daily-reminders', '0 15 * * *', $$select private.send_reminders()$$);

-- ─── question insights ───────────────────────────────────────────────
-- One row per checkpoint question. With security_invoker, a coach sees
-- the numbers of their team and an admin of everyone.
create view public.question_stats with (security_invoker = true) as
select q.id as question_id, c.slug as course_slug, c.title as course,
       m.position as module_position, l.position as lesson_position, l.title as lesson,
       q.position, q.type, q.prompt,
       count(fa.user_id)::int                                   as people,
       count(*) filter (where fa.is_correct)::int               as first_try_correct,
       round(100.0 * count(*) filter (where fa.is_correct) / nullif(count(fa.user_id), 0))::int as first_try_rate,
       (select count(*) from public.question_attempts qa where qa.question_id = q.id)::int as attempts
from public.questions q
join public.lessons l on l.id = q.lesson_id
join public.course_modules m on m.id = l.module_id
join public.courses c on c.id = m.course_id
left join public.first_attempts fa on fa.question_id = q.id
where q.type <> 'poll'
group by q.id, c.slug, c.title, m.position, l.position, l.title;
