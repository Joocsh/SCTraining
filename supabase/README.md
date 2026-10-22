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
| `migrations/0004_coaches.sql` | Coaches (supervisors): the `coach` role, `coach_assignments`, and policies so coaches see and grade only their associates while admins see everything. Run step 1 on its own, then step 2 |
| `migrations/0005_assignments_notifications.sql` | Admins assign VA and Marketing trainings per associate (`course_assignments`, `assign_course()`); the Introduction and the simulations are open to everyone. `notifications` created by triggers (training assigned, email graded, coach assigned) plus admin announcements, live through Realtime |
| `migrations/0006_invoker_rpcs.sql` | The admin functions that the security rules already cover run with the caller's rights |
| `migrations/0007_progress.sql` | Simulation access (open by default, or assigned per associate with a notification) and the general progress views: `progress_items` (Introduction, trainings and simulations each person has) and `progress_summary` (per category and overall). Run step 1 on its own, then step 2 |
| `migrations/0008_admin_people.sql` | `admin_people()`: the admin's list of people with their email (read from auth.users, admins only) |
| `migrations/0009_intro_required.sql` | The Introduction is required before trainings and simulations (enforced in `has_course` and `has_simulation`), and its new lesson "Keep client data safe" |
| `migrations/0010_staff_assignments.sql` | Coaches assign trainings and simulations to their own associates; admins to anyone |
| `migrations/0011_assigned_only.sql` | Simulations are closed by default: nobody starts with trainings or simulations, an admin or the associate's coach assigns them |
| `migrations/0012_best_email_grade.sql` | A simulation counts the best grade of each email scenario once, and a practice mode never above its maximum |
| `migrations/0013_resume_reminders_insights.sql` | `simulation_sessions` (the exact point of each person in each simulation case), daily reminders through `pg_cron` (`private.send_reminders()`: associates after 3 days without activity on something unfinished, their coaches after 7), and the `question_stats` view. Run step 1 on its own, then step 2 |
| `migrations/0014_staff_create_accounts.sql` | `profiles.created_by`. Accounts are created by admins and coaches through the `create-user` Edge Function (`functions/create-user`, deployed with "Verify JWT" off because it checks the caller itself); public sign up is turned off in Authentication |
| `migrations/0015_people_directory.sql` | `people_directory()`: the accounts a staff member manages in Settings > Users (admins: everyone; coaches: their team), with email, last sign in and deactivation from auth.users. Password resets and deactivation go through the `manage-user` Edge Function (`functions/manage-user`, "Verify JWT" off) |
| `migrations/0016_must_change_password.sql` | `profiles.must_change_password`: on when an admin or a coach creates an account or sets someone's password; the site asks the person to choose their own first. A trigger on `auth.users` turns it off when the password really changes |
| `migrations/0017_coaches_take_intro.sql` | Coaches finish the Introduction like associates; only admins are not held by it |

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
`first_attempts`, `skill_progress`, `role_progress`, `my_courses`, `my_simulations`,
`simulation_max_points`, `progress_items`, `progress_summary`.

**General progress** = the Introduction + the trainings a person has + the
simulations a person has, each item weighing the same (test drives do not count).

## Rules

- One fact in one place: totals, percentages, "graded" and skill levels are derived.
- Roles: `associate`, `coach` (sees and grades the associates in `coach_assignments`)
  and `admin` (sees everything). Access changes go through `set_profile_access()`
  and `assign_coach()`, so nobody can promote themselves.
- Never commit the `service_role` key or the database password.

## Moving to the NAS

Self-host Supabase with Docker on the NAS, then `pg_dump` this project and
restore it there. On the site only the project URL and the anon key change.
