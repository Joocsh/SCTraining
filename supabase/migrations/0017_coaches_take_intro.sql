-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · coaches take the Introduction too
-- Run after 0016_must_change_password.sql.
--
--   Until now coaches and admins counted as having finished the
--   Introduction. Coaches now finish it like associates do; only admins,
--   who review the whole Academy, are not held by it.
-- ════════════════════════════════════════════════════════════════════

create or replace function private.intro_done(target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.course_completions cc join public.courses c on c.id = cc.course_id
                  where cc.user_id = target and c.slug = 'intro')
      or exists (select 1 from public.profiles where id = target and app_role = 'admin');
$$;
