-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · every training has the same shape
-- Run after 0017_coaches_take_intro.sql.
--
--   Start (welcome) → Module 1 … Module N → Finish (recap, certificate)
--
--   · Introduction: its six lessons now sit in three modules, between a
--     new welcome lesson and a new finish lesson.
--   · SOP Foundations: its recap lesson becomes the Finish module.
--   · Marketing Training: now on the shared course player. Its welcome
--     lesson becomes the Start module, modules are numbered, and a finish
--     lesson closes it.
--   Lesson order does not change, so saved progress keeps its meaning.
--   People who already finished a training get the new lessons too.
-- ════════════════════════════════════════════════════════════════════

do $$
declare c smallint; m1 integer; m_start integer; m2 integer; m3 integer; m_fin integer;
begin
  /* ─── Introduction ─── */
  select id into c from public.courses where slug = 'intro';
  if not exists (select 1 from public.course_modules where course_id = c and title = 'Start') then
    select id into m1 from public.course_modules where course_id = c and position = 1;
    update public.course_modules set position = position + 100 where course_id = c;
    insert into public.course_modules (course_id, position, title) values (c, 1, 'Start') returning id into m_start;
    update public.course_modules set position = 2, title = 'Module 1 · AI basics' where id = m1;
    insert into public.course_modules (course_id, position, title) values (c, 3, 'Module 2 · The three tools') returning id into m2;
    insert into public.course_modules (course_id, position, title) values (c, 4, 'Module 3 · Choose the right tool') returning id into m3;
    insert into public.course_modules (course_id, position, title) values (c, 5, 'Finish') returning id into m_fin;
    update public.lessons set module_id = m2, position = case slug when 'claude' then 1 when 'chatgpt' then 2 else 3 end
     where module_id = m1 and slug in ('claude', 'chatgpt', 'manus');
    update public.lessons set module_id = m3, position = 1 where module_id = m1 and slug = 'compare';
    insert into public.lessons (module_id, slug, title, position) values
      (m_start, 'welcome', 'Welcome', 1),
      (m_fin, 'finish', 'Introduction complete', 1);
  end if;

  /* ─── SOP Foundations ─── */
  select id into c from public.courses where slug = 'sop';
  if not exists (select 1 from public.course_modules where course_id = c and title = 'Finish') then
    insert into public.course_modules (course_id, position, title)
    values (c, (select max(position) + 1 from public.course_modules where course_id = c), 'Finish') returning id into m_fin;
    update public.lessons l set module_id = m_fin, position = 1, title = 'Training complete'
      from public.course_modules m where l.module_id = m.id and m.course_id = c and l.slug = 'recap';
  end if;

  /* ─── Marketing Training ─── */
  select id into c from public.courses where slug = 'marketing';
  if not exists (select 1 from public.course_modules where course_id = c and title = 'Start') then
    update public.course_modules set position = position + 100 where course_id = c;
    update public.course_modules set position = position - 99, title = 'Module ' || (position - 100) || ' · ' || title where course_id = c;
    insert into public.course_modules (course_id, position, title) values (c, 1, 'Start') returning id into m_start;
    update public.lessons l set module_id = m_start, position = 1
      from public.course_modules m where l.module_id = m.id and m.course_id = c and l.slug = 'mt-1';
    insert into public.course_modules (course_id, position, title)
    values (c, (select max(position) + 1 from public.course_modules where course_id = c), 'Finish') returning id into m_fin;
    insert into public.lessons (module_id, slug, title, position) values (m_fin, 'finish', 'Training complete', 1);
  end if;
end $$;

-- whoever already finished a training also gets its new welcome and finish lessons
insert into public.lesson_completions (user_id, lesson_id, completed_at)
select cc.user_id, l.id, cc.completed_at
from public.course_completions cc
join public.course_modules m on m.course_id = cc.course_id
join public.lessons l on l.module_id = m.id
where m.title in ('Start', 'Finish')
on conflict do nothing;
