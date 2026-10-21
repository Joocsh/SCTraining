-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · the Introduction is required, plus data safety
-- Run after 0008_admin_people.sql.
--
--   · A new Introduction lesson, "Keep client data safe" (what never goes
--     into an AI tool, anonymizing, client authorization), second in order.
--   · Trainings and simulations only accept progress from people who
--     finished the Introduction. Coaches and admins are not held by it.
-- ════════════════════════════════════════════════════════════════════

-- ─── the new lesson, second in the Introduction ──────────────────────
do $$
declare intro_module integer; new_lesson integer;
begin
  select m.id into intro_module
  from public.course_modules m join public.courses c on c.id = m.course_id
  where c.slug = 'intro' and m.position = 1;

  if exists (select 1 from public.lessons where module_id = intro_module and slug = 'data-safety') then
    return;
  end if;

  -- make room at position 2 (two steps keep the unique positions valid)
  update public.lessons set position = position + 100 where module_id = intro_module and position >= 2;
  update public.lessons set position = position - 99  where module_id = intro_module and position >= 102;

  insert into public.lessons (module_id, position, slug, title)
  values (intro_module, 2, 'data-safety', 'Keep client data safe')
  returning id into new_lesson;

  insert into public.questions (lesson_id, position, type, prompt) values
    (new_lesson, 1, 'choice', 'An agent asks you to analyze a client''s full CRM export, 2,000 leads with names, phones and emails, in ChatGPT. What do you do?'),
    (new_lesson, 2, 'match',  'What can go into an AI tool? Choose for each one.'),
    (new_lesson, 3, 'choice', 'You realize you pasted a client''s bank details into Claude by mistake. What now?');
end $$;

-- ─── the Introduction opens everything else ──────────────────────────
create or replace function private.intro_done(target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.course_completions cc join public.courses c on c.id = cc.course_id
                  where cc.user_id = target and c.slug = 'intro')
      or exists (select 1 from public.profiles where id = target and app_role in ('coach', 'admin'));
$$;
revoke all on function private.intro_done(uuid) from public, anon;
grant execute on function private.intro_done(uuid) to authenticated;

create or replace function private.has_course(target uuid, course smallint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.courses where id = course and is_open)
      or (exists (select 1 from public.course_assignments where associate_id = target and course_id = course)
          and private.intro_done(target));
$$;

create or replace function private.has_simulation(target uuid, role smallint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select private.intro_done(target)
     and (exists (select 1 from public.sim_roles where id = role and is_active and is_open)
          or exists (select 1 from public.simulation_assignments where associate_id = target and role_id = role));
$$;
