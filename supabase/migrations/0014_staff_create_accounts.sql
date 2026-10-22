-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · admins and coaches create the accounts
-- Run after 0013_resume_reminders_insights.sql.
--
--   Public sign up is off (Authentication > Sign In / Providers > "Allow
--   new users to sign up"). Accounts are created by the create-user Edge
--   Function (supabase/functions/create-user): a coach creates associates
--   for their own team, an admin creates anyone.
--   created_by keeps who created each account.
-- ════════════════════════════════════════════════════════════════════

alter table public.profiles add column created_by uuid references public.profiles (id) on delete set null;
create index on public.profiles (created_by);
