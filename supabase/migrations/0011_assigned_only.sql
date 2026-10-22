-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · simulations are assigned, not open
-- Run after 0010_staff_assignments.sql.
--
--   Nobody starts with trainings or simulations: an admin, or the
--   associate's coach, assigns them. The Introduction stays required and
--   open to everyone. An admin can still open a simulation to everyone
--   from the Simulations tab.
-- ════════════════════════════════════════════════════════════════════

alter table public.sim_roles alter column is_open set default false;
update public.sim_roles set is_open = false where is_open;
