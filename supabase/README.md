# Database (Supabase / Postgres)

The academy's data model: the training catalog, the simulations and each
associate's activity. It is plain Postgres plus Supabase Auth, so the same
files run on Supabase cloud (where we test) and on a self-hosted Supabase
on the team's NAS later.

| File | What it does |
| --- | --- |
| `migrations/0001_schema.sql` | Tables, types, functions, views and row level security |
| `migrations/0002_seed.sql` | The catalog the site has today: departments, the 6 trainings with their modules, lessons, questions and writing prompts, skills, books, toolkit templates, simulation roles, modes, markets and email scenarios |
| `migrations/0003_security.sql` | Hardening from the Supabase Security Advisor: fixed search paths, private helper functions, execute rights |

Run them in order in the SQL editor (or with `psql`) on an empty project.

## Model

**Catalog** (readable by everyone, edited by admins)
`departments` → `courses` → `course_modules` → `lessons` → `questions`, `lesson_prompts`.
`skills`, `skill_levels`, `lesson_skills`. `resources` (books) and `resource_skills`.
`toolkit_templates` → `template_fields` → `checklist_items`; `ai_tool_categories` → `ai_tools`.

**Simulations**
`sim_roles` → `role_modes` (max score per practice mode), `markets`, `email_scenarios`.

**People and activity** (each associate sees their own rows, admins see all)
`profiles` (one per Supabase Auth user, created by a trigger; the email lives only in `auth.users`).
`lesson_completions`, `course_completions`, `question_attempts`, `prompt_responses`,
`template_responses`, `role_mode_scores`, `email_submissions` → `email_grades`.

**Views** (computed, never stored): `course_lesson_counts`, `course_progress`,
`first_attempts`, `skill_progress`, `role_progress`.

## Rules

- One fact in one place: totals, percentages, "graded" and skill levels are derived.
- Admins are profiles with `app_role = 'admin'`; access changes go through
  `set_profile_access()`, so nobody can promote themselves.
- Never commit the `service_role` key or the database password.

## Moving to the NAS

Self-host Supabase with Docker on the NAS, then `pg_dump` this project and
restore it there. On the site only the project URL and the anon key change.
