-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · the leaderboard in Settings
-- Run after 0018_consistent_trainings.sql.
--
--   team_leaderboard()  one row per associate the caller may see (a coach:
--                       their team; an admin: everyone) with what the
--                       comparison needs: overall progress, trainings and
--                       lessons done, simulations, checkpoints (first try,
--                       misses, wrong tries), emails and the last activity.
--   It runs with the caller's rights, so row level security still decides
--   whose activity is counted; people_directory() adds the account details.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.team_leaderboard()
returns table (
  user_id uuid, full_name text, email text, coaches text, created_at timestamptz,
  last_sign_in_at timestamptz, banned_until timestamptz,
  overall integer, items integer, items_done integer,
  trainings integer, trainings_done integer, lessons_done integer,
  sims integer, sims_avg integer,
  questions integer, first_try integer, missed_first integer, wrong_tries integer,
  emails_sent integer, emails_graded integer, email_avg numeric,
  last_activity_at timestamptz)
language sql stable security invoker set search_path = public
as $$
  with people as (
    select * from public.people_directory() where app_role = 'associate'
  ), ov as (
    select ps.user_id, ps.percent, ps.items, ps.completed_items, ps.last_activity_at
    from public.progress_summary ps where ps.category is null
  ), it as (
    select pi.user_id,
           count(*) filter (where pi.category = 'training')                   as trainings,
           count(*) filter (where pi.category = 'training' and pi.completed)  as trainings_done,
           count(*) filter (where pi.category = 'simulation')                 as sims,
           round(avg(pi.percent) filter (where pi.category = 'simulation'))   as sims_avg
    from public.progress_items pi group by pi.user_id
  ), lc as (
    select l.user_id, count(*) as n, max(l.completed_at) as last
    from public.lesson_completions l group by l.user_id
  ), fa as (
    select f.user_id, count(*) as n, count(*) filter (where f.is_correct) as ok
    from public.first_attempts f join public.questions q on q.id = f.question_id
    where q.type <> 'poll' group by f.user_id
  ), qa as (
    select a.user_id, count(*) filter (where a.is_correct is false) as wrong, max(a.attempted_at) as last
    from public.question_attempts a join public.questions q on q.id = a.question_id
    where q.type <> 'poll' group by a.user_id
  ), em as (
    select s.user_id, count(*) as sent, count(g.submission_id) as graded,
           round(avg(g.score), 1) as avg, max(s.submitted_at) as last
    from public.email_submissions s left join public.email_grades g on g.submission_id = s.id
    group by s.user_id
  )
  select p.id, p.full_name, p.email, p.coaches, p.created_at, p.last_sign_in_at, p.banned_until,
         coalesce(ov.percent, 0)::int, coalesce(ov.items, 0)::int, coalesce(ov.completed_items, 0)::int,
         coalesce(it.trainings, 0)::int, coalesce(it.trainings_done, 0)::int, coalesce(lc.n, 0)::int,
         coalesce(it.sims, 0)::int, it.sims_avg::int,
         coalesce(fa.n, 0)::int,
         case when fa.n > 0 then round(100.0 * fa.ok / fa.n)::int end,
         coalesce(fa.n - fa.ok, 0)::int, coalesce(qa.wrong, 0)::int,
         coalesce(em.sent, 0)::int, coalesce(em.graded, 0)::int, em.avg,
         greatest(ov.last_activity_at, lc.last, qa.last, em.last)
  from people p
  left join ov on ov.user_id = p.id
  left join it on it.user_id = p.id
  left join lc on lc.user_id = p.id
  left join fa on fa.user_id = p.id
  left join qa on qa.user_id = p.id
  left join em on em.user_id = p.id;
$$;
revoke all on function public.team_leaderboard() from public, anon;
grant execute on function public.team_leaderboard() to authenticated;
