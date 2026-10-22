/* ══════════════════════════════════════════════════════════
   Skill Cloud Academy · database layer (Supabase)
   Loaded by app-core.js on every page. Pages keep reading a local copy
   synchronously (the SCApp functions), and this file keeps that copy
   and Supabase in step:
     · signIn / signOut and the profile (role, coach, access); admins and
       coaches create accounts through the create-user Edge Function
     · pull: after sign in, brings the person's activity into the local
       copy the pages already read (course stores, drafts, scores...)
     · push: every change goes to an outbox in localStorage and is sent
       to Supabase in order, so nothing is lost offline or on a reload
     · notifications: the bell in the nav, live through Realtime
     · simulation cases: the exact point in each case (sim-resume.js)
   Tables and policies: supabase/migrations.
   ══════════════════════════════════════════════════════════ */
(function (window) {
  'use strict';
  var URL = 'https://eagpqzqgzzfmmdbyeoau.supabase.co';
  var KEY = 'sb_publishable_XrVLXVGLzctsilHZiNSH3w_ewNBxkkI';   /* publishable: safe in the browser, RLS protects the data */
  var TOKEN = 'sb-eagpqzqgzzfmmdbyeoau-auth-token';

  /* local store key of each course (the same keys the pages use) */
  var STORES = {
    intro: 'sc_course_intro__', sop: 'sc_va_sop_foundations_v2__', 'ai-ops': 'sc_va_ai_re_ops__',
    asana: 'sc_va_asana__', ops: 'sc_va_ops__'
  };
  var DRAFT_STORES = { 'ai-ops': 'sc_va_ai_re_ops__', ops: 'sc_va_ops__' };

  function read(k, fb) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch (e) { return fb; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var sb = window.supabase.createClient(URL, KEY, { auth: { storageKey: TOKEN, persistSession: true, autoRefreshToken: true } });

  function uid() { var s = read(TOKEN, null); return s && s.user ? s.user.id : null; }

  /* ─────────── catalog: ids behind the slugs the pages use ─────────── */
  var CAT_KEY = 'scc_catalog_v2';
  function loadCatalog(force) {
    var c = read(CAT_KEY, null);
    if (c && !force && Date.now() - c.at < 6 * 3600 * 1000) return Promise.resolve(c);
    return Promise.all([
      sb.from('courses').select('id,slug,title,page_path,is_open'),
      sb.from('lessons').select('id,slug,position,module:course_modules(position,course:courses(slug))'),
      sb.from('questions').select('id,lesson_id,position,type'),
      sb.from('lesson_prompts').select('id,lesson_id,draft_key'),
      sb.from('template_fields').select('id,draft_key'),
      sb.from('sim_roles').select('id,slug,title,page_path,is_open,is_active'),
      sb.from('role_modes').select('id,mode,role:sim_roles(slug)'),
      sb.from('email_scenarios').select('id,slug,prompt,max_score,role:sim_roles(slug)')
    ]).then(function (r) {
      var bad = r.filter(function (x) { return x.error; })[0];
      if (bad) throw bad.error;
      var cat = { at: Date.now(), courses: {}, courseById: {}, lessons: {}, order: {}, lessonById: {}, gates: {}, questions: {},
        prompts: {}, promptCourse: {}, fields: {}, roles: {}, roleById: {}, modes: {}, scenarios: {}, scenarioById: {} };
      r[0].data.forEach(function (c) { cat.courses[c.slug] = c; cat.courseById[c.id] = c.slug; });
      r[1].data.slice().sort(function (a, b) { return (a.module.position - b.module.position) || (a.position - b.position); }).forEach(function (l) {
        var cs = l.module.course.slug;
        cat.lessons[cs + '/' + l.slug] = l.id;
        cat.lessonById[l.id] = { course: cs, slug: l.slug };
        (cat.order[cs] = cat.order[cs] || []).push(l.slug);
      });
      r[2].data.slice().sort(function (a, b) { return a.position - b.position; }).forEach(function (q) {
        (cat.questions[q.lesson_id] = cat.questions[q.lesson_id] || []).push(q);
        if (q.type !== 'poll') cat.gates[q.lesson_id] = (cat.gates[q.lesson_id] || 0) + 1;
      });
      r[3].data.forEach(function (p) { cat.prompts[p.draft_key] = p.id; cat.promptCourse[p.draft_key] = (cat.lessonById[p.lesson_id] || {}).course; });
      r[4].data.forEach(function (f) { cat.fields[f.draft_key] = f.id; });
      r[5].data.forEach(function (s) { cat.roles[s.slug] = s; cat.roleById[s.id] = s.slug; });
      r[6].data.forEach(function (m) { cat.modes[m.role.slug + '.' + m.mode] = m.id; });
      r[7].data.forEach(function (s) { cat.scenarios[s.slug] = s; cat.scenarioById[s.id] = s.slug; });
      write(CAT_KEY, cat);
      return cat;
    });
  }

  /* ─────────── profile and access ─────────── */
  function refreshProfile() {
    var id = uid();
    if (!id) return Promise.resolve(null);
    return Promise.all([
      sb.from('profiles').select('id,full_name,app_role,last_path,onboarded_at,assigned_role:sim_roles!profiles_assigned_role_id_fkey(slug)').eq('id', id).single(),
      sb.from('my_courses').select('slug').eq('user_id', id),
      sb.from('my_simulations').select('slug').eq('user_id', id)
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      var p = r[0].data, s = read(TOKEN, {});
      var prof = { id: p.id, name: p.full_name, email: s.user ? s.user.email : '', appRole: p.app_role,
        role: p.app_role === 'associate' ? 'user' : p.app_role, assignedRole: p.assigned_role ? p.assigned_role.slug : null,
        avatar: (p.full_name || '?').charAt(0).toUpperCase(), onboardedAt: p.onboarded_at };
      write('scc_profile', prof);
      write('scc_my_courses__' + id, (r[1].data || []).map(function (x) { return x.slug; }));
      write('scc_my_sims__' + id, (r[2].data || []).map(function (x) { return x.slug; }));
      if (p.onboarded_at) localStorage.setItem('scc_onboard__' + id, '1');
      return prof;
    });
  }

  /* ─────────── pull: the person's activity into the local copy ─────────── */
  function pull() {
    var id = uid();
    if (!id) return Promise.resolve();
    return loadCatalog().then(function (cat) {
      return Promise.all([
        sb.from('lesson_completions').select('lesson_id').eq('user_id', id),
        sb.from('course_completions').select('course_id,completed_at').eq('user_id', id),
        sb.from('prompt_responses').select('prompt_id,body,prompt:lesson_prompts(draft_key)').eq('user_id', id),
        sb.from('template_responses').select('field_id,body,field:template_fields(draft_key)').eq('user_id', id),
        sb.from('role_mode_scores').select('score,updated_at,mode:role_modes(mode,role:sim_roles(slug),max_score)').eq('user_id', id)
      ]).then(function (r) {
        var bad = r.filter(function (x) { return x.error; })[0];
        if (bad) throw bad.error;
        var sent = read('scc_sent__' + id, {});
        /* completed lessons → each course's local state */
        var byCourse = {};
        r[0].data.forEach(function (x) { var l = cat.lessonById[x.lesson_id]; if (l) (byCourse[l.course] = byCourse[l.course] || []).push({ slug: l.slug, id: x.lesson_id }); sent['L' + x.lesson_id] = 1; });
        var completedAt = {};
        r[1].data.forEach(function (x) { completedAt[cat.courseById[x.course_id]] = Date.parse(x.completed_at); sent['C' + x.course_id] = 1; });
        Object.keys(cat.order).forEach(function (cs) {
          var list = byCourse[cs] || [];
          if (cs === 'marketing') {
            var mt = read('mt3_done', []);
            list.forEach(function (x) { var i = cat.order[cs].indexOf(x.slug); if (i > -1 && mt.indexOf(i) < 0) mt.push(i); });
            write('mt3_done', mt);
            return;
          }
          if (!STORES[cs]) return;
          var key = STORES[cs] + id, st = read(key, {});
          st.done = st.done || []; st.passed = st.passed || {};
          list.forEach(function (x) {
            var i = cat.order[cs].indexOf(x.slug);
            if (i > -1 && st.done.indexOf(i) < 0) st.done.push(i);
            for (var k = 0; k < (cat.gates[x.id] || 0); k++) st.passed[x.slug + ':' + k] = 1;
          });
          if (completedAt[cs] && !st.completedAt) st.completedAt = completedAt[cs];
          if (list.length || st.completedAt) write(key, st);
        });
        if (completedAt.intro) localStorage.setItem('scc_intro_done__' + id, '1');
        /* writing */
        var drafts = {};
        r[2].data.forEach(function (x) { var k = x.prompt.draft_key, cs = cat.promptCourse[k]; if (DRAFT_STORES[cs]) (drafts[cs] = drafts[cs] || {})[k] = x.body; });
        r[3].data.forEach(function (x) { (drafts.ops = drafts.ops || {})[x.field.draft_key] = x.body; });
        Object.keys(drafts).forEach(function (cs) {
          var key = DRAFT_STORES[cs] + 'drafts__' + id, local = read(key, {});
          Object.keys(drafts[cs]).forEach(function (k) { if (!local[k]) local[k] = drafts[cs][k]; sent['D' + k] = drafts[cs][k]; });
          write(key, local);
        });
        /* practice scores → the progress engine the role pages use */
        var prog = read('scc_progress__' + id, { modes: {}, history: [] });
        r[4].data.forEach(function (x) {
          var role = x.mode.role.slug, k = role + '.' + x.mode.mode, cur = prog.modes[k];
          if (!cur || +x.score > cur.score) prog.modes[k] = { role: role, mode: x.mode.mode, score: +x.score, max: +x.mode.max_score, ts: Date.parse(x.updated_at) };
          sent['M' + k] = +x.score;
        });
        write('scc_progress__' + id, prog);
        write('scc_sent__' + id, sent);
        return pullSubmissions().then(function () { localStorage.setItem('scc_pulled__' + id, String(Date.now())); });
      });
    });
  }

  /* emails: the ones this person may see (own, or their associates' for staff) */
  function pullSubmissions() {
    return loadCatalog().then(function (cat) {
      return sb.from('email_submissions')
        .select('id,user_id,body,submitted_at,scenario:email_scenarios(slug,prompt,max_score,role:sim_roles(slug)),grade:email_grades(score,feedback,grader_id,graded_at)')
        .order('submitted_at', { ascending: false });
    }).then(function (r) {
      if (r.error) throw r.error;
      write('scc_submissions', r.data.map(function (s) {
        var g = Array.isArray(s.grade) ? s.grade[0] : s.grade;
        return { id: s.id, userId: s.user_id, role: s.scenario.role.slug, scenarioId: s.scenario.slug, scenarioPrompt: s.scenario.prompt,
          text: s.body, status: g ? 'graded' : 'pending', score: g ? g.score : null, maxScore: s.scenario.max_score,
          feedback: g ? g.feedback || '' : '', gradedBy: g ? g.grader_id : null, ts: Date.parse(s.submitted_at), gradedTs: g ? Date.parse(g.graded_at) : null };
      }));
    });
  }

  /* people this person may see (staff see their associates; admins everyone) */
  function pullPeople() {
    return sb.from('profiles').select('id,full_name,app_role,last_path,created_at,assigned_role:sim_roles!profiles_assigned_role_id_fkey(slug)').order('full_name').then(function (r) {
      if (r.error) throw r.error;
      write('scc_people', r.data.map(function (p) {
        return { id: p.id, name: p.full_name, appRole: p.app_role, role: p.app_role === 'associate' ? 'user' : p.app_role,
          assignedRole: p.assigned_role ? p.assigned_role.slug : null, avatar: (p.full_name || '?').charAt(0).toUpperCase(), lastPath: p.last_path };
      }));
      return r.data;
    });
  }

  /* ─────────── push: the outbox ─────────── */
  var OUT = 'scc_outbox';
  function enqueue(item) {
    if (!uid()) return;
    var q = read(OUT, []);
    item.u = uid(); item.at = new Date().toISOString();
    /* the newest draft or score replaces an older one still waiting */
    if (item.t === 'draft' || item.t === 'mode' || item.t === 'last' || item.t === 'simcase') q = q.filter(function (x) { return !(x.t === item.t && x.k === item.k && x.u === item.u); });
    q.push(item); write(OUT, q);
    flushSoon();
  }
  var flushing = false, timer = null;
  function flushSoon() { clearTimeout(timer); timer = setTimeout(flush, 600); }
  function flush() {
    if (flushing || !uid()) return Promise.resolve();
    var q = read(OUT, []).filter(function (x) { return x.u === uid(); });
    if (!q.length) return Promise.resolve();
    flushing = true;
    return loadCatalog().then(function (cat) {
      var item = q[0];
      return send(item, cat).then(function (res) {
        if (res && res.error && !/duplicate|already exists|23505/i.test(res.error.message + res.error.code)) {
          /* a refusal (no access, bad data) is dropped so it cannot block the queue */
          console.warn('[sc-db] not saved', item.t, res.error.message);
        }
        write(OUT, read(OUT, []).filter(function (x) { return !(x.at === item.at && x.t === item.t && x.k === item.k); }));
      });
    }).catch(function (e) { console.warn('[sc-db] offline, will retry', e && e.message); throw e; })
      .then(function () { flushing = false; return flush(); }, function () { flushing = false; setTimeout(flush, 15000); });
  }
  function send(x, cat) {
    var u = x.u;
    switch (x.t) {
      case 'lesson': {
        var lid = cat.lessons[x.course + '/' + x.lesson];
        if (!lid) return Promise.resolve();
        return sb.from('lesson_completions').upsert({ user_id: u, lesson_id: lid, completed_at: x.at }, { onConflict: 'user_id,lesson_id', ignoreDuplicates: true });
      }
      case 'course': {
        var c = cat.courses[x.course];
        if (!c) return Promise.resolve();
        return sb.from('course_completions').upsert({ user_id: u, course_id: c.id, completed_at: x.at }, { onConflict: 'user_id,course_id', ignoreDuplicates: true });
      }
      case 'attempt': {
        var l2 = cat.lessons[x.course + '/' + x.lesson], qs = cat.questions[l2] || [];
        var gates = qs.filter(function (q) { return q.type !== 'poll'; }), polls = qs.filter(function (q) { return q.type === 'poll'; });
        var q = x.poll != null ? polls[x.poll] : gates[x.index];
        if (!q) return Promise.resolve();
        return sb.from('question_attempts').insert({ user_id: u, question_id: q.id, is_correct: x.poll != null ? null : !!x.correct, response: x.response || null, attempted_at: x.at });
      }
      case 'draft': {
        if (cat.prompts[x.k]) return sb.from('prompt_responses').upsert({ user_id: u, prompt_id: cat.prompts[x.k], body: x.body, updated_at: x.at });
        if (cat.fields[x.k]) return sb.from('template_responses').upsert({ user_id: u, field_id: cat.fields[x.k], body: x.body, updated_at: x.at });
        return Promise.resolve();
      }
      case 'mode': {
        var mid = cat.modes[x.k];
        if (!mid) return Promise.resolve();
        return sb.from('role_mode_scores').upsert({ user_id: u, role_mode_id: mid, score: x.score, updated_at: x.at });
      }
      case 'email': {
        var sc = cat.scenarios[x.scenario];
        if (!sc) return Promise.resolve();
        return sb.from('email_submissions').insert({ user_id: u, scenario_id: sc.id, body: x.body, submitted_at: x.at });
      }
      case 'grade':
        return sb.from('email_grades').upsert({ submission_id: x.submission, grader_id: u, score: x.score, feedback: x.feedback || null, graded_at: x.at });
      case 'last':
        return sb.from('profiles').update({ last_path: x.k }).eq('id', u);
      case 'onboarded':
        return sb.from('profiles').update({ onboarded_at: x.at }).eq('id', u);
      case 'simcase': {
        var role = cat.roles[x.k];
        if (!role) return Promise.resolve();
        if (!x.state) return sb.from('simulation_sessions').delete().eq('user_id', u).eq('role_id', role.id);
        return sb.from('simulation_sessions').upsert({ user_id: u, role_id: role.id, state: x.state, updated_at: x.at });
      }
    }
    return Promise.resolve();
  }

  /* ─────────── what the pages call ─────────── */
  /* course pages: compare the local state with what was already sent */
  function courseState(course, state) {
    var id = uid(); if (!id) return;
    var cat = read(CAT_KEY, null); if (!cat || !cat.order[course]) { loadCatalog().then(function () { courseState(course, state); }); return; }
    var sent = read('scc_sent__' + id, {}), order = cat.order[course];
    (state.done || []).forEach(function (i) {
      var slug = order[i], lid = cat.lessons[course + '/' + slug];
      if (lid && !sent['L' + lid]) { sent['L' + lid] = 1; enqueue({ t: 'lesson', course: course, lesson: slug }); }
    });
    var cid = cat.courses[course] && cat.courses[course].id;
    if (state.completedAt && cid && !sent['C' + cid]) { sent['C' + cid] = 1; enqueue({ t: 'course', course: course }); }
    write('scc_sent__' + id, sent);
  }
  function attempt(course, lesson, index, correct, response) { enqueue({ t: 'attempt', course: course, lesson: lesson, index: index, correct: correct, response: response }); }
  function pollAnswer(course, lesson, n, choice) { enqueue({ t: 'attempt', course: course, lesson: lesson, poll: n, response: { choice: choice } }); }
  function draft(key, body) {
    var id = uid(); if (!id) return;
    var sent = read('scc_sent__' + id, {});
    if (sent['D' + key] === body) return;
    sent['D' + key] = body; write('scc_sent__' + id, sent);
    enqueue({ t: 'draft', k: key, body: body });
  }
  function modeScore(role, mode, score) { enqueue({ t: 'mode', k: role + '.' + mode, score: Math.max(0, +score || 0) }); }
  function submitEmail(scenario, body) { enqueue({ t: 'email', scenario: scenario, body: body }); }
  function grade(submissionId, score, feedback) { enqueue({ t: 'grade', submission: submissionId, score: score, feedback: feedback }); }
  var lastSent = null;
  function lastPath(p) { if (p && p !== lastSent) { lastSent = p; enqueue({ t: 'last', k: p }); } }
  function onboarded() { enqueue({ t: 'onboarded', k: 'x' }); }
  /* where the person is in a simulation case; null forgets it */
  function simCase(role, state) { enqueue({ t: 'simcase', k: role, state: state || null }); }
  function simCaseSaved(role) {
    var id = uid(); if (!id) return Promise.resolve(null);
    return loadCatalog().then(function (cat) {
      var r = cat.roles[role]; if (!r) return null;
      return sb.from('simulation_sessions').select('state,updated_at').eq('user_id', id).eq('role_id', r.id).maybeSingle()
        .then(function (res) { return res.error || !res.data ? null : { state: res.data.state, at: Date.parse(res.data.updated_at) }; });
    });
  }

  /* ─────────── auth ─────────── */
  function signIn(email, password) {
    return sb.auth.signInWithPassword({ email: email, password: password }).then(function (r) {
      if (r.error) throw r.error;
      return refreshProfile().then(function (p) { return pull().then(function () { return p; }); });
    });
  }
  /* Edge Functions for accounts (admins and coaches only; each function checks) */
  function invoke(name, body) {
    return sb.functions.invoke(name, { body: body }).then(function (r) {
      if (r.error) {
        var ctx = r.error.context;
        return (ctx && ctx.json ? ctx.json().catch(function () { return {}; }) : Promise.resolve({})).then(function (b) {
          throw new Error(b.error || r.error.message);
        });
      }
      return r.data;
    });
  }
  /* a coach's new associate joins their team */
  function createUser(person) { return invoke('create-user', person); }
  /* set_password, deactivate, reactivate */
  function manageUser(action, data) { var b = { action: action }; for (var k in data) b[k] = data[k]; return invoke('manage-user', b); }
  function changePassword(password) {
    return sb.auth.updateUser({ password: password }).then(function (r) { if (r.error) throw r.error; });
  }
  function signOut() {
    var id = uid();
    return flush().catch(function () {}).then(function () { return sb.auth.signOut(); }).then(function () {
      ['scc_profile', 'scc_people', 'scc_submissions', OUT, 'sc_wf_state', 'sc_active_panel'].forEach(function (k) { localStorage.removeItem(k); });
      if (id) Object.keys(localStorage).forEach(function (k) { if (k.indexOf('__' + id) > -1 || k === 'mt3_done' || k === 'mt3_scores' || k === 'mt3_idx') localStorage.removeItem(k); });
    });
  }
  function resetPassword(email) {
    return sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname.replace(/[^/]*$/, '') + 'login.html?reset=1' });
  }

  /* ─────────── notifications ─────────── */
  function notifications() {
    return sb.from('notifications')
      .select('id,type,message,created_at,read_at,course:courses(title,page_path),sim:sim_roles(title,page_path),person:profiles!person_id(full_name),submission:email_submissions(scenario:email_scenarios(prompt))')
      .eq('recipient_id', uid()).order('created_at', { ascending: false }).limit(30)
      .then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  function markRead(ids) {
    return sb.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids).is('read_at', null);
  }
  function onNotification(cb) {
    var id = uid(); if (!id) return;
    sb.channel('notifications:' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'recipient_id=eq.' + id }, cb)
      .subscribe();
  }

  /* ─────────── the bell ─────────── */
  function root(p) { return window.SCApp && SCApp.rootUrl ? SCApp.rootUrl(p) : p; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function describe(n) {
    switch (n.type) {
      case 'course_assigned': return { t: 'New training assigned', s: n.course ? n.course.title : '', href: n.course ? root(n.course.page_path) : root('paths.html') };
      case 'simulation_assigned': return { t: 'New simulation available', s: n.sim ? n.sim.title : '', href: n.sim ? root(n.sim.page_path) : root('index.html#simulations') };
      case 'email_graded': return { t: 'Your email was graded', s: n.submission && n.submission.scenario ? n.submission.scenario.prompt : '', href: root('account.html#feedback') };
      case 'coach_assigned': return { t: 'You have a coach', s: n.person ? n.person.full_name + ' will follow your progress.' : '', href: root('account.html') };
      case 'associate_assigned': return { t: 'New associate to coach', s: n.person ? n.person.full_name : '', href: root('coach.html') };
      case 'reminder': {
        var what = n.course ? n.course.title : (n.sim ? n.sim.title : '');
        if (n.person) {
          var me = window.SCApp && SCApp.currentUser();
          return { t: n.person.full_name + ' has not finished ' + what, s: n.message || '', href: root(me && me.role === 'admin' ? 'admin.html' : 'coach.html') };
        }
        return { t: 'Keep going: ' + what, s: n.message || '', href: n.course ? root(n.course.page_path) : (n.sim ? root(n.sim.page_path) : null) };
      }
      default: return { t: 'Announcement', s: n.message || '', href: null };
    }
  }
  function ago(iso) {
    var m = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    return Math.round(h / 24) + ' d ago';
  }
  function mountBell() {
    if (!uid() || document.getElementById('scBell')) return;
    var chip = document.querySelector('.user-chip');
    if (!chip) return;
    var css = document.createElement('style');
    css.textContent =
      '.sc-bell{position:relative;display:inline-flex;align-items:center;margin-right:8px}' +
      '.sc-bell>button{position:relative;width:40px;height:40px;border-radius:50%;border:1px solid #e3eaf1;background:#fff;color:#0a2647;display:grid;place-items:center;cursor:pointer}' +
      '.sc-bell>button:hover{border-color:#17c3d4}' +
      '.sc-bell svg{width:19px;height:19px}' +
      '.sc-bell .dot{position:absolute;top:-3px;right:-3px;min-width:18px;height:18px;border-radius:9px;background:#d2452f;color:#fff;font:800 11px/18px Arial,sans-serif;text-align:center;padding:0 5px}' +
      '.sc-bell .panel{position:absolute;right:0;top:48px;width:min(360px,92vw);max-height:70vh;overflow-y:auto;background:#fff;border:1px solid #e3eaf1;border-radius:16px;box-shadow:0 20px 50px rgba(10,38,71,.18);z-index:200;display:none;text-align:left}' +
      '.sc-bell.open .panel{display:block}' +
      '.sc-bell .hd{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #e3eaf1;font:800 15px "Helvetica Neue",Arial,sans-serif;color:#0a2647}' +
      '.sc-bell .hd button{border:0;background:none;color:#0fa6b6;font-weight:700;font-size:13px;cursor:pointer}' +
      '.sc-bell a.it,.sc-bell div.it{display:block;padding:12px 16px;border-bottom:1px solid #f0f4f8;text-decoration:none;color:#33465c}' +
      '.sc-bell .it.unread{background:#eefbfc}' +
      '.sc-bell .it b{display:block;color:#0a2647;font-size:14.5px}' +
      '.sc-bell .it span{display:block;font-size:13.5px;margin-top:2px}' +
      '.sc-bell .it small{display:block;font-size:12px;color:#8a99ab;margin-top:4px}' +
      '.sc-bell .none{padding:20px 16px;color:#5b6b7e;font-size:14px}';
    document.head.appendChild(css);
    var wrap = document.createElement('div');
    wrap.className = 'sc-bell'; wrap.id = 'scBell';
    wrap.innerHTML = '<button type="button" aria-label="Notifications" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span class="dot" hidden></span></button>' +
      '<div class="panel" role="dialog" aria-label="Notifications"><div class="hd">Notifications<button type="button" data-all>Mark all as read</button></div><div class="list"><p class="none">Loading…</p></div></div>';
    var anchor = chip.closest('.uc-wrap') || chip;   /* the account menu wraps the chip */
    anchor.parentNode.insertBefore(wrap, anchor);
    var list = [], btn = wrap.querySelector('button'), dot = wrap.querySelector('.dot');
    function render() {
      var unread = list.filter(function (n) { return !n.read_at; }).length;
      dot.hidden = !unread; dot.textContent = unread > 9 ? '9+' : unread;
      wrap.querySelector('.list').innerHTML = list.length ? list.map(function (n) {
        var d = describe(n), tag = d.href ? 'a' : 'div';
        return '<' + tag + ' class="it' + (n.read_at ? '' : ' unread') + '" data-id="' + n.id + '"' + (d.href ? ' href="' + esc(d.href) + '"' : '') + '><b>' + esc(d.t) + '</b>' + (d.s ? '<span>' + esc(d.s) + '</span>' : '') + '<small>' + ago(n.created_at) + '</small></' + tag + '>';
      }).join('') : '<p class="none">You are all caught up.</p>';
    }
    function load() { return notifications().then(function (d) { list = d; render(); }).catch(function () {}); }
    btn.onclick = function () { var o = wrap.classList.toggle('open'); btn.setAttribute('aria-expanded', o); };
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) { wrap.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
    wrap.querySelector('[data-all]').onclick = function () {
      var ids = list.filter(function (n) { return !n.read_at; }).map(function (n) { return n.id; });
      if (!ids.length) return;
      markRead(ids).then(function () { list.forEach(function (n) { n.read_at = n.read_at || new Date().toISOString(); }); render(); });
    };
    wrap.querySelector('.list').addEventListener('click', function (e) {
      var it = e.target.closest('.it'); if (!it) return;
      var n = list.filter(function (x) { return String(x.id) === it.dataset.id; })[0];
      if (n && !n.read_at) markRead([n.id]);
    });
    load();
    onNotification(function () { load(); refreshProfile().catch(function () {}); });
  }

  /* ─────────── start ─────────── */
  var ready = (uid() ? sb.auth.getSession().then(function (r) {
    if (!r.data.session) { localStorage.removeItem('scc_profile'); return null; }
    var id = r.data.session.user.id;
    var stale = !localStorage.getItem('scc_pulled__' + id);
    return refreshProfile().then(function (p) { return (stale ? pull() : Promise.resolve()).then(function () { return p; }); });
  }) : Promise.resolve(null)).then(function (p) { flush(); return p; }, function (e) { console.warn('[sc-db]', e && e.message); return null; });

  window.SCDB = {
    client: sb, ready: ready, uid: uid,
    signIn: signIn, signOut: signOut, resetPassword: resetPassword, createUser: createUser, manageUser: manageUser, changePassword: changePassword,
    refreshProfile: refreshProfile, pull: pull, pullPeople: pullPeople, pullSubmissions: pullSubmissions, loadCatalog: loadCatalog, flush: flush,
    courseState: courseState, attempt: attempt, pollAnswer: pollAnswer, draft: draft, modeScore: modeScore,
    submitEmail: submitEmail, grade: grade, lastPath: lastPath, onboarded: onboarded, simCase: simCase, simCaseSaved: simCaseSaved,
    notifications: notifications, markRead: markRead, onNotification: onNotification
  };
  ready.then(function (p) {
    if (!p) return;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBell); else mountBell();
  });
})(window);
