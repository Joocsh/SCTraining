-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · training assignments and notifications
-- Run after 0004_coaches.sql.
--
--   · Trainings in the VA and Marketing paths are assigned per associate
--     by an admin. Open trainings (the Introduction) are for everyone.
--   · The simulations are open to everyone: they need no assignment.
--   · Notifications are created by triggers: a new training, a graded
--     email, a coach assignment. Admins can also post announcements.
--     The text is built by the site from the related row, so nothing
--     (like a course title) is copied into the notification.
-- ════════════════════════════════════════════════════════════════════

-- Open trainings need no assignment.
alter table public.courses add column is_open boolean not null default false;
update public.courses set is_open = true where slug = 'intro';

create table public.course_assignments (
  associate_id uuid     not null references public.profiles (id) on delete cascade,
  course_id    smallint not null references public.courses (id) on delete cascade,
  assigned_by  uuid     references public.profiles (id) on delete set null,
  assigned_at  timestamptz not null default now(),
  due_on       date,
  primary key (associate_id, course_id)
);
create index on public.course_assignments (course_id);
create index on public.course_assignments (assigned_by);

alter table public.course_assignments enable row level security;
create policy "Read assignments you can see" on public.course_assignments for select to authenticated
  using (private.can_view(associate_id));
create policy "Admins manage course assignments" on public.course_assignments for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- True when this user may take the course: it is open, or assigned to them.
create or replace function private.has_course(target uuid, course smallint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.courses where id = course and is_open)
      or exists (select 1 from public.course_assignments where associate_id = target and course_id = course);
$$;
revoke all on function private.has_course(uuid, smallint) from public, anon;
grant execute on function private.has_course(uuid, smallint) to authenticated;

-- Associates can only record progress in trainings they have.
drop policy "Own activity" on public.lesson_completions;
create policy "Own activity" on public.lesson_completions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and private.has_course(user_id,
    (select m.course_id from public.lessons l join public.course_modules m on m.id = l.module_id where l.id = lesson_id)));

drop policy "Own activity" on public.course_completions;
create policy "Own activity" on public.course_completions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and private.has_course(user_id, course_id));

-- Every training each person has, open or assigned, with who assigned it.
create view public.my_courses with (security_invoker = true) as
select p.id as user_id, c.id as course_id, c.slug, c.title, c.page_path,
       ca.assigned_at, ca.assigned_by, ca.due_on, c.is_open
from public.profiles p
join public.courses c on c.is_open
   or exists (select 1 from public.course_assignments x where x.associate_id = p.id and x.course_id = c.id)
left join public.course_assignments ca on ca.associate_id = p.id and ca.course_id = c.id;

-- ─── notifications ───────────────────────────────────────────────────
create type public.notification_type as enum
  ('course_assigned', 'email_graded', 'coach_assigned', 'associate_assigned', 'announcement');

create table public.notifications (
  id            bigint generated always as identity primary key,
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  type          public.notification_type not null,
  course_id     smallint references public.courses (id) on delete cascade,
  submission_id bigint   references public.email_submissions (id) on delete cascade,
  person_id     uuid     references public.profiles (id) on delete cascade,  -- the coach or the associate
  message       text,                                                        -- announcements only
  created_at    timestamptz not null default now(),
  read_at       timestamptz,
  -- each type points to exactly the row it is about
  check (
    (type = 'course_assigned'    and course_id is not null and submission_id is null and person_id is null and message is null) or
    (type = 'email_graded'       and submission_id is not null and course_id is null and person_id is null and message is null) or
    (type in ('coach_assigned', 'associate_assigned') and person_id is not null and course_id is null and submission_id is null and message is null) or
    (type = 'announcement'       and message is not null and course_id is null and submission_id is null and person_id is null)
  )
);
create index on public.notifications (recipient_id, created_at desc);
create index on public.notifications (course_id);
create index on public.notifications (submission_id);
create index on public.notifications (person_id);

alter table public.notifications enable row level security;
create policy "Read own notifications" on public.notifications for select to authenticated
  using (recipient_id = auth.uid());
create policy "Admins read notifications" on public.notifications for select to authenticated
  using (private.is_admin());
create policy "Admins post announcements" on public.notifications for insert to authenticated
  with check (private.is_admin() and type = 'announcement');
create policy "Admins remove notifications" on public.notifications for delete to authenticated
  using (private.is_admin());
-- People can only mark their own notifications as read.
create policy "Mark own as read" on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
revoke update on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

-- Triggers that create the notifications.
create or replace function private.notify_course_assigned()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (recipient_id, type, course_id) values (new.associate_id, 'course_assigned', new.course_id);
  return new;
end; $$;

create or replace function private.notify_email_graded()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (recipient_id, type, submission_id)
  select s.user_id, 'email_graded', s.id from public.email_submissions s where s.id = new.submission_id;
  return new;
end; $$;

create or replace function private.notify_coach_assigned()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (recipient_id, type, person_id) values
    (new.associate_id, 'coach_assigned', new.coach_id),
    (new.coach_id, 'associate_assigned', new.associate_id);
  return new;
end; $$;

revoke all on function private.notify_course_assigned() from public, anon, authenticated;
revoke all on function private.notify_email_graded() from public, anon, authenticated;
revoke all on function private.notify_coach_assigned() from public, anon, authenticated;

create trigger course_assignments_notify after insert on public.course_assignments
  for each row execute function private.notify_course_assigned();
create trigger email_grades_notify after insert on public.email_grades
  for each row execute function private.notify_email_graded();
create trigger coach_assignments_notify after insert on public.coach_assignments
  for each row execute function private.notify_coach_assigned();

-- Admins assign and unassign trainings through these as well as the table.
create or replace function public.assign_course(associate uuid, course smallint, due date default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_admin() then raise exception 'Only admins can assign trainings'; end if;
  insert into public.course_assignments (associate_id, course_id, assigned_by, due_on)
  values (associate, course, auth.uid(), due)
  on conflict (associate_id, course_id) do update set due_on = excluded.due_on;
end; $$;

create or replace function public.unassign_course(associate uuid, course smallint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.is_admin() then raise exception 'Only admins can unassign trainings'; end if;
  delete from public.course_assignments where associate_id = associate and course_id = course;
end; $$;

revoke all on function public.assign_course(uuid, smallint, date) from public, anon;
revoke all on function public.unassign_course(uuid, smallint) from public, anon;
grant execute on function public.assign_course(uuid, smallint, date) to authenticated;
grant execute on function public.unassign_course(uuid, smallint) to authenticated;

-- Live updates for the notification bell.
alter publication supabase_realtime add table public.notifications;
