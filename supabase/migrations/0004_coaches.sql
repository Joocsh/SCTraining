-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · coaches (supervisors) and admins
-- Run after 0003_security.sql, in two steps: Postgres needs the new enum
-- value committed before it is used.
--
--   coach   sees and grades the associates assigned to them
--   admin   sees everything, manages access and coach assignments
-- ════════════════════════════════════════════════════════════════════

-- ─── step 1 (run on its own) ─────────────────────────────────────────
alter type public.app_role add value if not exists 'coach' before 'admin';

-- ─── step 2 ──────────────────────────────────────────────────────────
-- Which associates each coach supervises. An associate can have more
-- than one coach; the roles of both people are checked by a trigger.
create table public.coach_assignments (
  coach_id     uuid not null references public.profiles (id) on delete cascade,
  associate_id uuid not null references public.profiles (id) on delete cascade,
  assigned_at  timestamptz not null default now(),
  primary key (coach_id, associate_id),
  check (coach_id <> associate_id)
);
create index on public.coach_assignments (associate_id);

create or replace function private.check_coach_assignment()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = new.coach_id and app_role in ('coach', 'admin')) then
    raise exception 'The coach must have the coach or admin role';
  end if;
  if not exists (select 1 from public.profiles where id = new.associate_id and app_role = 'associate') then
    raise exception 'Only associates can be assigned to a coach';
  end if;
  return new;
end;
$$;
revoke all on function private.check_coach_assignment() from public, anon, authenticated;

create trigger coach_assignments_check
  before insert or update on public.coach_assignments
  for each row execute function private.check_coach_assignment();

-- True when the signed in user may see (and grade) this person's work:
-- the person themselves, an admin, or one of their coaches.
create or replace function private.can_view(target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select target = auth.uid()
      or private.is_admin()
      or exists (select 1 from public.coach_assignments
                 where coach_id = auth.uid() and associate_id = target);
$$;
revoke all on function private.can_view(uuid) from public, anon;
grant execute on function private.can_view(uuid) to authenticated;

-- True for coaches and admins.
create or replace function private.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and app_role in ('coach', 'admin'));
$$;
revoke all on function private.is_staff() from public, anon;
grant execute on function private.is_staff() to authenticated;

alter table public.coach_assignments enable row level security;
create policy "Read own assignments" on public.coach_assignments for select to authenticated
  using (coach_id = auth.uid() or associate_id = auth.uid() or private.is_admin());
create policy "Admins manage assignments" on public.coach_assignments for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Profiles: you, your coaches' view of you, and admins.
drop policy "Read own profile" on public.profiles;
create policy "Read profiles you supervise" on public.profiles for select to authenticated
  using (private.can_view(id)
         or exists (select 1 from public.coach_assignments where associate_id = auth.uid() and coach_id = profiles.id));

-- Activity: coaches read the work of their associates.
do $$
declare t text;
begin
  foreach t in array array['lesson_completions','course_completions','question_attempts','prompt_responses',
    'template_responses','role_mode_scores']
  loop
    execute format('drop policy "Admins read activity" on public.%I', t);
    execute format('create policy "Coaches and admins read activity" on public.%I for select to authenticated using (private.can_view(user_id))', t);
  end loop;
end $$;

drop policy "Read own submissions" on public.email_submissions;
create policy "Read submissions you supervise" on public.email_submissions for select to authenticated
  using (private.can_view(user_id));

-- Grades: coaches grade their associates, admins grade anyone.
drop policy "Read own grades" on public.email_grades;
drop policy "Admins grade" on public.email_grades;
drop policy "Admins regrade" on public.email_grades;
drop policy "Admins remove grades" on public.email_grades;
create policy "Read grades you can see" on public.email_grades for select to authenticated
  using (exists (select 1 from public.email_submissions s where s.id = submission_id and private.can_view(s.user_id)));
create policy "Staff grade" on public.email_grades for insert to authenticated
  with check (private.is_staff() and grader_id = auth.uid()
              and exists (select 1 from public.email_submissions s where s.id = submission_id and s.user_id <> auth.uid() and private.can_view(s.user_id)));
create policy "Staff regrade" on public.email_grades for update to authenticated
  using (private.is_staff() and exists (select 1 from public.email_submissions s where s.id = submission_id and s.user_id <> auth.uid() and private.can_view(s.user_id)))
  with check (grader_id = auth.uid());
create policy "Admins remove grades" on public.email_grades for delete to authenticated using (private.is_admin());

-- Admins assign coaches through this function as well as through the table.
create or replace function public.assign_coach(coach uuid, associate uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not private.is_admin() then
    raise exception 'Only admins can assign coaches';
  end if;
  insert into public.coach_assignments (coach_id, associate_id) values (coach, associate)
  on conflict do nothing;
end;
$$;
revoke all on function public.assign_coach(uuid, uuid) from public, anon;
grant execute on function public.assign_coach(uuid, uuid) to authenticated;
