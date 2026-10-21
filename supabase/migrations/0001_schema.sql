-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · schema
-- Normalized (3NF) model for the training catalog, the simulations and
-- each associate's activity. Written for Postgres (Supabase), so it runs
-- the same on Supabase cloud and on a self-hosted Supabase (the NAS).
--
-- Rules followed:
--   · every fact lives in one place (email only in auth.users, max scores
--     only in the catalog, "graded" is derived from email_grades);
--   · totals and percentages are views, never stored columns;
--   · row level security: associates see their own activity, admins see all.
-- ════════════════════════════════════════════════════════════════════

-- ─── types ───────────────────────────────────────────────────────────
create type public.app_role as enum ('associate', 'admin');
create type public.question_type as enum ('choice', 'match', 'sort', 'poll');
create type public.field_type as enum ('text', 'textarea', 'list', 'checklist');
create type public.template_kind as enum ('form', 'matrix', 'capacity', 'ai_guide');
create type public.sim_mode as enum ('sim', 'mls', 'prompt', 'quiz');

-- ═════════════════════════ CATALOG ═════════════════════════

-- A department groups trainings (shown as a path on paths.html).
create table public.departments (
  id          smallint generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  description text,
  position    smallint not null unique
);

create table public.courses (
  id            smallint generated always as identity primary key,
  department_id smallint not null references public.departments (id) on delete restrict,
  slug          text not null unique,
  title         text not null,
  description   text,
  page_path     text not null unique,          -- e.g. va/sop-foundations.html
  image_path    text,
  position      smallint not null,
  unique (department_id, position)
);

create table public.course_modules (
  id        integer generated always as identity primary key,
  course_id smallint not null references public.courses (id) on delete cascade,
  position  smallint not null,
  title     text not null,
  summary   text,
  unique (course_id, position)
);

create table public.lessons (
  id        integer generated always as identity primary key,
  module_id integer not null references public.course_modules (id) on delete cascade,
  slug      text not null,                     -- the lesson id used on the page
  title     text not null,
  position  smallint not null,
  unique (module_id, position),
  unique (module_id, slug)
);

-- A graded or reflection question inside a lesson checkpoint.
create table public.questions (
  id        integer generated always as identity primary key,
  lesson_id integer not null references public.lessons (id) on delete cascade,
  position  smallint not null,
  type      public.question_type not null,
  prompt    text not null,
  unique (lesson_id, position)
);

-- A writing prompt inside a lesson (the textareas that save as you type).
create table public.lesson_prompts (
  id        integer generated always as identity primary key,
  lesson_id integer not null references public.lessons (id) on delete cascade,
  position  smallint not null,
  draft_key text not null,                     -- the data-draft key used on the page
  label     text not null,
  unique (lesson_id, position),
  unique (lesson_id, draft_key)
);

create table public.skills (
  id   smallint generated always as identity primary key,
  name text not null unique
);

-- Beginning 0, Developing 1, Proficient 3, Advanced 5 completions.
create table public.skill_levels (
  id              smallint generated always as identity primary key,
  name            text not null unique,
  min_completions smallint not null unique check (min_completions >= 0)
);

create table public.lesson_skills (
  lesson_id integer  not null references public.lessons (id) on delete cascade,
  skill_id  smallint not null references public.skills (id) on delete cascade,
  primary key (lesson_id, skill_id)
);

-- Recommended books (downloads hosted on Google Drive).
create table public.resources (
  id            smallint generated always as identity primary key,
  course_id     smallint not null references public.courses (id) on delete cascade,
  position      smallint not null,
  title         text not null,
  author        text not null,
  summary       text,
  drive_file_id text not null unique,
  unique (course_id, position)
);

create table public.resource_skills (
  resource_id smallint not null references public.resources (id) on delete cascade,
  skill_id    smallint not null references public.skills (id) on delete cascade,
  primary key (resource_id, skill_id)
);

-- Toolkit templates (Operations Manager) and their fields.
create table public.toolkit_templates (
  id          smallint generated always as identity primary key,
  course_id   smallint not null references public.courses (id) on delete cascade,
  position    smallint not null,
  slug        text not null,
  title       text not null,
  kind        public.template_kind not null,
  description text,
  guidance    text,                            -- the principle shown on the AI guide
  unique (course_id, position),
  unique (course_id, slug)
);

create table public.template_fields (
  id          integer generated always as identity primary key,
  template_id smallint not null references public.toolkit_templates (id) on delete cascade,
  position    smallint not null,
  draft_key   text not null unique,            -- e.g. tk-root-cause-problem
  label       text not null,
  type        public.field_type not null,
  unique (template_id, position)
);

create table public.checklist_items (
  id       integer generated always as identity primary key,
  field_id integer not null references public.template_fields (id) on delete cascade,
  position smallint not null,
  label    text not null,
  unique (field_id, position)
);

create table public.ai_tool_categories (
  id          smallint generated always as identity primary key,
  template_id smallint not null references public.toolkit_templates (id) on delete cascade,
  position    smallint not null,
  name        text not null,
  unique (template_id, position)
);

create table public.ai_tools (
  id             smallint generated always as identity primary key,
  category_id    smallint not null references public.ai_tool_categories (id) on delete cascade,
  position       smallint not null,
  name           text not null,
  use_case       text not null,
  example_prompt text,
  unique (category_id, position)
);

-- ═════════════════════════ SIMULATIONS ═════════════════════════

create table public.sim_roles (
  id        smallint generated always as identity primary key,
  slug      text not null unique,              -- tc, listing, lc, lm, cfo, admin_social
  title     text not null,
  page_path text not null unique,
  is_active boolean not null default true,
  position  smallint not null unique
);

-- How many points each practice mode of a role is worth.
create table public.role_modes (
  id        smallint generated always as identity primary key,
  role_id   smallint not null references public.sim_roles (id) on delete cascade,
  mode      public.sim_mode not null,
  max_score numeric(6,2) not null check (max_score > 0),
  unique (role_id, mode)
);

create table public.markets (
  id   smallint generated always as identity primary key,
  code char(2) not null unique,                -- CA, NY, TX, VA
  name text not null
);

-- An email the associate drafts inside a case, graded by a supervisor.
create table public.email_scenarios (
  id        smallint generated always as identity primary key,
  role_id   smallint not null references public.sim_roles (id) on delete restrict,
  market_id smallint references public.markets (id) on delete restrict,
  slug      text not null unique,              -- the scenarioId used on the page
  prompt    text not null,
  max_score smallint not null default 5 check (max_score > 0)
);

-- ═════════════════════════ PEOPLE ═════════════════════════

-- One profile per Supabase Auth user. The email lives in auth.users only.
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text not null,
  app_role         public.app_role not null default 'associate',
  assigned_role_id smallint references public.sim_roles (id) on delete set null,
  last_path        text,
  onboarded_at     timestamptz,
  created_at       timestamptz not null default now()
);

-- ═════════════════════════ ACTIVITY ═════════════════════════

create table public.lesson_completions (
  user_id      uuid    not null references public.profiles (id) on delete cascade,
  lesson_id    integer not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- The certificate moment. Kept as a fact: lessons can be added to a
-- course later without taking a certificate away.
create table public.course_completions (
  user_id      uuid     not null references public.profiles (id) on delete cascade,
  course_id    smallint not null references public.courses (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- Every answer to a question. "First try" is the earliest attempt.
-- is_correct is null for reflection (poll) questions.
create table public.question_attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid    not null references public.profiles (id) on delete cascade,
  question_id  integer not null references public.questions (id) on delete cascade,
  is_correct   boolean,
  response     jsonb,
  attempted_at timestamptz not null default now()
);

create table public.prompt_responses (
  user_id    uuid    not null references public.profiles (id) on delete cascade,
  prompt_id  integer not null references public.lesson_prompts (id) on delete cascade,
  body       text    not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, prompt_id)
);

create table public.template_responses (
  user_id    uuid    not null references public.profiles (id) on delete cascade,
  field_id   integer not null references public.template_fields (id) on delete cascade,
  body       text    not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, field_id)
);

-- Current score per role mode; the maximum comes from role_modes.
create table public.role_mode_scores (
  user_id      uuid     not null references public.profiles (id) on delete cascade,
  role_mode_id smallint not null references public.role_modes (id) on delete cascade,
  score        numeric(6,2) not null check (score >= 0),
  updated_at   timestamptz not null default now(),
  primary key (user_id, role_mode_id)
);

create table public.email_submissions (
  id           bigint generated always as identity primary key,
  user_id      uuid     not null references public.profiles (id) on delete cascade,
  scenario_id  smallint not null references public.email_scenarios (id) on delete restrict,
  body         text not null check (length(btrim(body)) >= 25),
  submitted_at timestamptz not null default now()
);

-- A submission is "graded" when it has a row here; no status column.
create table public.email_grades (
  submission_id bigint   primary key references public.email_submissions (id) on delete cascade,
  grader_id     uuid     not null references public.profiles (id) on delete restrict,
  score         smallint not null check (score >= 0),
  feedback      text,
  graded_at     timestamptz not null default now()
);

-- ─── indexes on foreign keys used for lookups ────────────────────────
create index on public.courses (department_id);
create index on public.lessons (module_id);
create index on public.questions (lesson_id);
create index on public.lesson_prompts (lesson_id);
create index on public.lesson_skills (skill_id);
create index on public.template_fields (template_id);
create index on public.role_modes (role_id);
create index on public.email_scenarios (role_id);
create index on public.profiles (assigned_role_id);
create index on public.lesson_completions (lesson_id);
create index on public.course_completions (course_id);
create index on public.question_attempts (user_id, question_id, attempted_at);
create index on public.prompt_responses (prompt_id);
create index on public.template_responses (field_id);
create index on public.email_submissions (user_id);
create index on public.email_submissions (scenario_id);
create index on public.email_grades (grader_id);

-- ═════════════════════════ FUNCTIONS ═════════════════════════

-- True when the signed in user is an admin. Security definer so the
-- policies below can call it without recursion on profiles.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and app_role = 'admin');
$$;

-- Create the profile when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A grade cannot exceed the scenario's maximum.
create or replace function public.check_grade_score()
returns trigger
language plpgsql
as $$
declare max_allowed smallint;
begin
  select s.max_score into max_allowed
  from public.email_submissions e join public.email_scenarios s on s.id = e.scenario_id
  where e.id = new.submission_id;
  if new.score > max_allowed then
    raise exception 'Score % is above the maximum of %', new.score, max_allowed;
  end if;
  return new;
end;
$$;

create trigger email_grades_score_check
  before insert or update on public.email_grades
  for each row execute function public.check_grade_score();

-- A mode score cannot exceed the mode's maximum.
create or replace function public.check_mode_score()
returns trigger
language plpgsql
as $$
declare max_allowed numeric;
begin
  select max_score into max_allowed from public.role_modes where id = new.role_mode_id;
  if new.score > max_allowed then
    raise exception 'Score % is above the maximum of %', new.score, max_allowed;
  end if;
  return new;
end;
$$;

create trigger role_mode_scores_check
  before insert or update on public.role_mode_scores
  for each row execute function public.check_mode_score();

-- Admins change someone's access or assigned role through this function,
-- so associates can never promote themselves.
create or replace function public.set_profile_access(target uuid, new_role public.app_role, new_assigned_role smallint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change access';
  end if;
  update public.profiles set app_role = new_role, assigned_role_id = new_assigned_role where id = target;
end;
$$;

-- ═════════════════════════ VIEWS ═════════════════════════
-- security_invoker: a view only shows what the caller's policies allow.

create view public.course_lesson_counts with (security_invoker = true) as
select m.course_id, count(l.id)::int as lesson_count
from public.course_modules m join public.lessons l on l.module_id = m.id
group by m.course_id;

create view public.course_progress with (security_invoker = true) as
select lc.user_id, m.course_id,
       count(*)::int                                            as lessons_done,
       c.lesson_count                                           as lessons_total,
       round(100.0 * count(*) / c.lesson_count)::int            as percent,
       cc.completed_at
from public.lesson_completions lc
join public.lessons l on l.id = lc.lesson_id
join public.course_modules m on m.id = l.module_id
join public.course_lesson_counts c on c.course_id = m.course_id
left join public.course_completions cc on cc.user_id = lc.user_id and cc.course_id = m.course_id
group by lc.user_id, m.course_id, c.lesson_count, cc.completed_at;

-- The first attempt at each question tells "right on the first try".
create view public.first_attempts with (security_invoker = true) as
select distinct on (user_id, question_id) user_id, question_id, is_correct, attempted_at
from public.question_attempts
order by user_id, question_id, attempted_at, id;

-- Skill level per user: completions of lessons that practice the skill.
create view public.skill_progress with (security_invoker = true) as
select p.id as user_id, s.id as skill_id, s.name as skill,
       count(lc.lesson_id)::int as completions,
       (select sl.name from public.skill_levels sl
        where sl.min_completions <= count(lc.lesson_id)
        order by sl.min_completions desc limit 1) as level
from public.profiles p
cross join public.skills s
left join public.lesson_skills ls on ls.skill_id = s.id
left join public.lesson_completions lc on lc.lesson_id = ls.lesson_id and lc.user_id = p.id
group by p.id, s.id, s.name;

-- Score per role: practice modes plus graded emails.
create view public.role_progress with (security_invoker = true) as
with modes as (
  select rms.user_id, rm.role_id, sum(rms.score) as score, sum(rm.max_score) as max_score
  from public.role_mode_scores rms join public.role_modes rm on rm.id = rms.role_mode_id
  group by rms.user_id, rm.role_id
), emails as (
  select es.user_id, sc.role_id, sum(g.score) as score, sum(sc.max_score) as max_score
  from public.email_submissions es
  join public.email_grades g on g.submission_id = es.id
  join public.email_scenarios sc on sc.id = es.scenario_id
  group by es.user_id, sc.role_id
)
select coalesce(m.user_id, e.user_id) as user_id, coalesce(m.role_id, e.role_id) as role_id,
       coalesce(m.score, 0) + coalesce(e.score, 0)         as score,
       coalesce(m.max_score, 0) + coalesce(e.max_score, 0) as max_score
from modes m full join emails e on e.user_id = m.user_id and e.role_id = m.role_id;

-- ═════════════════════════ ROW LEVEL SECURITY ═════════════════════════

-- Catalog: anyone can read; only admins write.
do $$
declare t text;
begin
  foreach t in array array['departments','courses','course_modules','lessons','questions','lesson_prompts',
    'skills','skill_levels','lesson_skills','resources','resource_skills','toolkit_templates','template_fields',
    'checklist_items','ai_tool_categories','ai_tools','sim_roles','role_modes','markets','email_scenarios']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Catalog is readable" on public.%I for select using (true)', t);
    execute format('create policy "Admins manage the catalog" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Profiles: you see yours, admins see everyone. Access changes go
-- through set_profile_access(); people can only edit their own basics.
alter table public.profiles enable row level security;
create policy "Read own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (full_name, last_path, onboarded_at) on public.profiles to authenticated;

-- Activity: you own your rows; admins can read everyone's.
do $$
declare t text;
begin
  foreach t in array array['lesson_completions','course_completions','question_attempts','prompt_responses',
    'template_responses','role_mode_scores']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Own activity" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "Admins read activity" on public.%I for select to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- Submitted emails cannot be edited after submitting.
alter table public.email_submissions enable row level security;
create policy "Read own submissions" on public.email_submissions for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Submit own emails" on public.email_submissions for insert to authenticated with check (user_id = auth.uid());

-- Grades: the associate reads theirs; admins grade as themselves.
alter table public.email_grades enable row level security;
create policy "Read own grades" on public.email_grades for select to authenticated
  using (public.is_admin() or exists (select 1 from public.email_submissions s where s.id = submission_id and s.user_id = auth.uid()));
create policy "Admins grade" on public.email_grades for insert to authenticated with check (public.is_admin() and grader_id = auth.uid());
create policy "Admins regrade" on public.email_grades for update to authenticated using (public.is_admin()) with check (public.is_admin() and grader_id = auth.uid());
create policy "Admins remove grades" on public.email_grades for delete to authenticated using (public.is_admin());
