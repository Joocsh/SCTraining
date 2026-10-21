-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · admin functions run with the caller's rights
-- Run after 0005_assignments_notifications.sql.
--
-- The row level security on course_assignments and coach_assignments
-- already lets only admins write, so these functions do not need to be
-- security definer. set_profile_access() stays security definer on
-- purpose: it writes app_role, a column nobody may update directly.
-- ════════════════════════════════════════════════════════════════════
alter function public.assign_course(uuid, smallint, date) security invoker;
alter function public.unassign_course(uuid, smallint) security invoker;
alter function public.assign_coach(uuid, uuid) security invoker;
