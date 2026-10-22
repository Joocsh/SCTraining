-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · one email grade per scenario
-- Run after 0011_assigned_only.sql.
--
--   An associate can send the same email scenario more than once. The
--   simulation score now counts the best grade of each scenario once,
--   instead of adding every graded try, and a practice mode never counts
--   above its maximum.
-- ════════════════════════════════════════════════════════════════════

create or replace view public.role_progress with (security_invoker = true) as
with modes as (
  select rms.user_id, rm.role_id, sum(least(rms.score, rm.max_score)) as score, sum(rm.max_score) as max_score
  from public.role_mode_scores rms join public.role_modes rm on rm.id = rms.role_mode_id
  group by rms.user_id, rm.role_id
), best as (
  select es.user_id, es.scenario_id, max(g.score) as score
  from public.email_submissions es
  join public.email_grades g on g.submission_id = es.id
  group by es.user_id, es.scenario_id
), emails as (
  select b.user_id, sc.role_id, sum(least(b.score, sc.max_score)) as score, sum(sc.max_score) as max_score
  from best b join public.email_scenarios sc on sc.id = b.scenario_id
  group by b.user_id, sc.role_id
)
select coalesce(m.user_id, e.user_id) as user_id, coalesce(m.role_id, e.role_id) as role_id,
       coalesce(m.score, 0) + coalesce(e.score, 0)         as score,
       coalesce(m.max_score, 0) + coalesce(e.max_score, 0) as max_score
from modes m full join emails e on e.user_id = m.user_id and e.role_id = m.role_id;
