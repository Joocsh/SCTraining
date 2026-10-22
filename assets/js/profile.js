/* ══════════════════════════════════════════════════════════
   Associate profile (profile.html?id=<user id>), for coaches and admins.
   Everything about one person in one place, read live from Supabase:
     Overview       progress, key numbers, what they have, recent activity
     Trainings      every lesson with the day it was finished, certificates
     Simulations    practice mode scores, graded emails, the case in progress
     Emails         each simulation email with its grade and feedback
     Checkpoints    right on the first try, and the questions that were not
     Written work   what they wrote in the trainings and the toolkit
     Activity       the full timeline
   Row level security decides who may open whom: a coach sees the
   associates on their team, an admin sees everyone.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function day(t) { return t ? new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; }
  function when(t) {
    if (!t) return '';
    var m = Math.round((Date.now() - Date.parse(t)) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    var d = Math.round(h / 24); if (d < 8) return d + ' day' + (d === 1 ? '' : 's') + ' ago';
    return day(t);
  }
  function bar(p) { return '<div class="st-bar"><i style="width:' + (p || 0) + '%"></i></div>'; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function initials(n) { var w = String(n || '?').trim().split(/\s+/); return esc(((w[0] || '?').charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : '')).toUpperCase()); }
  function hue(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return h; }
  function check(r) { if (r && r.error) throw r.error; return r ? r.data : null; }
  var MODE = { sim: 'Case simulator', mls: 'MLS practice', prompt: 'AI prompts', quiz: 'Quiz', email: 'Emails' };
  var ROLE = { associate: 'Associate', coach: 'Coach', admin: 'Admin' };

  var id = new URLSearchParams(location.search).get('id');
  var me = SCApp.requireAuth({ staffOnly: true });
  if (!me) return;

  SCDB.ready.then(function (p) {
    if (!p) { location.href = SCApp.loginUrl('profile.html' + location.search); return; }
    var sb = SCDB.client;
    if (!id) return notFound();
    var eq = function (q) { return q.eq('user_id', id); };
    return Promise.all([
      sb.rpc('people_directory'),                                                                   // 0
      eq(sb.from('progress_summary').select('category,items,completed_items,percent,last_activity_at')), // 1
      eq(sb.from('progress_items').select('category,item_id,title,percent,completed,last_activity_at')), // 2
      eq(sb.from('lesson_completions').select('lesson_id,completed_at')),                           // 3
      eq(sb.from('course_completions').select('course_id,completed_at')),                           // 4
      sb.from('courses').select('id,slug,title,page_path,is_open'),                                 // 5
      sb.from('course_modules').select('id,course_id,position,title'),                              // 6
      sb.from('lessons').select('id,module_id,position,title'),                                     // 7
      eq(sb.from('question_attempts').select('question_id,is_correct,attempted_at').order('attempted_at')), // 8
      sb.from('questions').select('id,lesson_id,position,type,prompt'),                             // 9
      eq(sb.from('role_mode_scores').select('role_mode_id,score,updated_at')),                      // 10
      sb.from('role_modes').select('id,role_id,mode,max_score'),                                    // 11
      sb.from('sim_roles').select('id,slug,title,page_path'),                                       // 12
      eq(sb.from('email_submissions').select('id,body,submitted_at,scenario:email_scenarios(prompt,max_score,role_id),grade:email_grades(score,feedback,graded_at,grader:profiles!grader_id(full_name))').order('submitted_at', { ascending: false })), // 13
      eq(sb.from('simulation_sessions').select('role_id,state,updated_at')),                        // 14
      sb.from('course_assignments').select('course_id,assigned_at').eq('associate_id', id),         // 15
      sb.from('simulation_assignments').select('role_id,assigned_at').eq('associate_id', id),       // 16
      eq(sb.from('prompt_responses').select('body,updated_at,prompt:lesson_prompts(label,lesson_id,position)')), // 17
      eq(sb.from('template_responses').select('body,updated_at,field:template_fields(label,position,template:toolkit_templates(title,position))')) // 18
    ]).then(function (r) {
      var person = (check(r[0]) || []).filter(function (x) { return x.id === id; })[0];
      if (!person) return notFound();
      var D = {
        p: person, sum: check(r[1]), items: check(r[2]), lc: check(r[3]), cc: check(r[4]),
        courses: check(r[5]), mods: check(r[6]), lessons: check(r[7]), att: check(r[8]), qs: check(r[9]),
        scores: check(r[10]), modes: check(r[11]), roles: check(r[12]), emails: check(r[13]), sessions: check(r[14]),
        ca: check(r[15]), sa: check(r[16]), prompts: check(r[17]), fields: check(r[18])
      };
      index(D);
      render(D);
    });
  }).catch(function (e) { $('#pfMain').innerHTML = '<p class="st-empty">Could not load: ' + esc(e.message) + '</p>'; });

  function notFound() {
    $('#pfHead').innerHTML = '<a class="pf-back" href="settings.html#progress">&larr; Back to Progress</a><h1>Profile not available</h1>';
    $('#pfMain').innerHTML = '<p class="st-empty">' + (me.role === 'coach' ? 'You can only open the associates on your team.' : 'This person does not exist.') + '</p>';
  }

  /* lookups between the catalog and the person's activity */
  function index(D) {
    D.course = {}; D.courses.forEach(function (c) { D.course[c.id] = c; });
    D.mod = {}; D.mods.forEach(function (m) { D.mod[m.id] = m; });
    D.lesson = {}; D.lessons.forEach(function (l) { D.lesson[l.id] = l; l.course = D.mod[l.module_id] ? D.mod[l.module_id].course_id : null; });
    D.done = {}; D.lc.forEach(function (x) { D.done[x.lesson_id] = x.completed_at; });
    D.cert = {}; D.cc.forEach(function (x) { D.cert[x.course_id] = x.completed_at; });
    D.q = {}; D.qs.forEach(function (q) { D.q[q.id] = q; });
    D.role = {}; D.roles.forEach(function (x) { D.role[x.id] = x; });
    D.modeOf = {}; D.modes.forEach(function (m) { D.modeOf[m.id] = m; });
    /* checkpoint attempts per question: first try, tries, right in the end */
    D.byQ = {};
    D.att.forEach(function (a) {
      var q = D.q[a.question_id]; if (!q || q.type === 'poll') return;
      var s = D.byQ[a.question_id] || (D.byQ[a.question_id] = { q: q, first: a.is_correct, tries: 0, right: false, at: a.attempted_at });
      s.tries++; if (a.is_correct) s.right = true; s.last = a.attempted_at;
    });
  }

  /* ─────────── header ─────────── */
  function render(D) {
    var p = D.p, all = D.sum.filter(function (x) { return !x.category; })[0] || { percent: 0, items: 0, completed_items: 0 };
    var off = p.banned_until && Date.parse(p.banned_until) > Date.now();
    document.title = p.full_name + ' · Skill Cloud Academy';
    $('#pfHead').innerHTML = '<a class="pf-back" href="settings.html#progress">&larr; Back to Progress</a>' +
      '<div class="pf-id"><span class="tm-av big pf-av" style="--h:' + hue(p.id) + '">' + initials(p.full_name) + '</span>' +
      '<div class="pf-who"><h1>' + esc(p.full_name) + '</h1><p>' + esc(p.email) + '</p>' +
      '<div class="pf-tags"><span class="pf-tag">' + ROLE[p.app_role] + '</span>' +
        (p.coaches ? '<span class="pf-tag">Coach: ' + esc(p.coaches) + '</span>' : (p.app_role === 'associate' ? '<span class="pf-tag warn">No coach</span>' : '')) +
        (off ? '<span class="pf-tag warn">Deactivated</span>' : '') +
        '<span class="pf-tag">Joined ' + day(p.created_at) + '</span>' +
        '<span class="pf-tag">' + (p.last_sign_in_at ? 'Last sign in ' + when(p.last_sign_in_at) : 'Never signed in') + '</span></div></div>' +
      '<div class="pf-ring" style="--p:' + all.percent + '"><b>' + all.percent + '%</b><span>overall</span></div></div>' +
      '<div class="pf-actions"><a class="pf-btn" href="settings.html?open=' + p.id + '#assign">Assign trainings and simulations</a>' +
        '<a class="pf-btn ghost" href="settings.html#emails">Emails to grade</a></div>' +
      '<div class="st-tabs pf-tabs" role="tablist">' + [['overview', 'Overview'], ['trainings', 'Trainings'], ['sims', 'Simulations'], ['emails', 'Emails'], ['checks', 'Checkpoints'], ['written', 'Written work'], ['activity', 'Activity']]
        .map(function (t) { return '<button type="button" role="tab" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    var TABS = { overview: overview, trainings: trainings, sims: sims, emails: emails, checks: checks, written: written, activity: activity };
    function show(t) {
      if (!TABS[t]) t = 'overview';
      $$('.pf-tabs button').forEach(function (b) { var on = b.dataset.t === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      $('#pfMain').innerHTML = TABS[t](D);
      bind();
      try { history.replaceState(null, '', location.pathname + location.search + '#' + t); } catch (e) {}
    }
    $$('.pf-tabs button').forEach(function (b) { b.onclick = function () { show(b.dataset.t); }; });
    $('#pfMain').addEventListener('click', function (e) { var go = e.target.closest('[data-go]'); if (go) { e.preventDefault(); show(go.dataset.go); window.scrollTo(0, 0); } });
    show(location.hash.slice(1));
  }
  function bind() {
    $$('.pf-fold > button').forEach(function (b) { b.onclick = function () { b.parentNode.classList.toggle('open'); b.setAttribute('aria-expanded', b.parentNode.classList.contains('open')); }; });
  }

  /* ─────────── Overview ─────────── */
  function firstTry(list) {
    var n = list.length, ok = list.filter(function (s) { return s.first; }).length;
    return n ? Math.round(100 * ok / n) : null;
  }
  function overview(D) {
    var trainings = D.items.filter(function (i) { return i.category !== 'simulation'; });
    var simsL = D.items.filter(function (i) { return i.category === 'simulation'; });
    var graded = D.emails.filter(function (e) { return g(e); }), pending = D.emails.length - graded.length;
    var avgEmail = graded.length ? (graded.reduce(function (t, e) { return t + g(e).score; }, 0) / graded.length).toFixed(1) : null;
    var qs = Object.keys(D.byQ).map(function (k) { return D.byQ[k]; }), ft = firstTry(qs);
    var simAvg = simsL.length ? Math.round(simsL.reduce(function (t, i) { return t + i.percent; }, 0) / simsL.length) : null;
    var intro = D.items.filter(function (i) { return i.category === 'introduction'; })[0];
    var tl = timeline(D).slice(0, 8);
    return '<div class="tm-kpis pf-kpis">' +
        kpi(intro ? (intro.completed ? 'Done' : intro.percent + '%') : '&#8212;', 'Introduction', intro && !intro.completed ? 'warn' : '') +
        kpi(trainings.filter(function (i) { return i.completed && i.category === 'training'; }).length + '/' + trainings.filter(function (i) { return i.category === 'training'; }).length, 'Trainings complete') +
        kpi(simAvg == null ? '&#8212;' : simAvg + '%', 'Simulations, average') +
        kpi(avgEmail == null ? '&#8212;' : avgEmail + '/5', 'Email grade, average' + (pending ? ' · ' + pending + ' to grade' : ''), pending ? 'warn' : '') +
        kpi(ft == null ? '&#8212;' : ft + '%', 'Checkpoints right on the first try', ft != null && ft < 60 ? 'warn' : '') +
      '</div>' +
      '<div class="pf-grid"><section class="pf-card"><div class="pf-card-h"><h2>What they have</h2><span>' + plural(D.items.length, 'item') + '</span></div>' +
        (D.items.length ? '<ul class="pf-items">' + D.items.map(function (i) {
          return '<li><em>' + (i.category === 'simulation' ? 'Simulation' : i.category === 'introduction' ? 'Introduction' : 'Training') + '</em><b>' + esc(i.title) + '</b>' + bar(i.percent) +
            '<span class="pf-pct">' + (i.completed ? '&#10003;' : i.percent + '%') + '</span><small>' + (i.last_activity_at ? when(i.last_activity_at) : 'Not started') + '</small></li>';
        }).join('') + '</ul>' : '<p class="st-muted">Nothing assigned yet besides the Introduction.</p>') + '</section>' +
      '<section class="pf-card"><div class="pf-card-h"><h2>Recent activity</h2><a href="#activity" data-go="activity">See all</a></div>' + timelineHtml(tl) + '</section></div>';
  }
  function kpi(v, l, cls) { return '<div class="tm-kpi' + (cls ? ' ' + cls : '') + '"><b>' + v + '</b><span>' + l + '</span></div>'; }
  function g(e) { return Array.isArray(e.grade) ? e.grade[0] : e.grade; }

  /* ─────────── Trainings ─────────── */
  function trainings(D) {
    var have = D.items.filter(function (i) { return i.category !== 'simulation'; });
    if (!have.length) return '<p class="st-empty">No trainings yet.</p>';
    return have.map(function (i) {
      var c = D.course[i.item_id];
      var mods = D.mods.filter(function (m) { return m.course_id === c.id; }).sort(function (a, b) { return a.position - b.position; });
      var total = 0, done = 0;
      var body = mods.map(function (m) {
        var ls = D.lessons.filter(function (l) { return l.module_id === m.id; }).sort(function (a, b) { return a.position - b.position; });
        var md = ls.filter(function (l) { return D.done[l.id]; }).length; total += ls.length; done += md;
        return '<div class="pf-mod"><div class="pf-mod-h"><b>' + esc(m.title) + '</b><span>' + md + '/' + ls.length + '</span></div><ul>' + ls.map(function (l) {
          return '<li class="' + (D.done[l.id] ? 'ok' : '') + '"><span class="pf-dot"></span>' + esc(l.title) + '<small>' + (D.done[l.id] ? day(D.done[l.id]) : '') + '</small></li>';
        }).join('') + '</ul></div>';
      }).join('');
      var qs = Object.keys(D.byQ).map(function (k) { return D.byQ[k]; }).filter(function (s) { var l = D.lesson[s.q.lesson_id]; return l && l.course === c.id; });
      var ft = firstTry(qs);
      return '<section class="pf-card pf-fold' + (i.completed ? '' : ' open') + '"><button type="button" aria-expanded="' + !i.completed + '"><span class="pf-fold-t"><b>' + esc(c.title) + '</b>' +
          '<small>' + done + ' of ' + total + ' lessons' + (D.cert[c.id] ? ' · certificate ' + day(D.cert[c.id]) : '') + (ft != null ? ' · ' + ft + '% right on the first try' : '') + '</small></span>' +
          bar(i.percent) + '<span class="pf-pct">' + (i.completed ? '&#10003;' : i.percent + '%') + '</span><span class="st-chev"></span></button>' +
        '<div class="pf-fold-b">' + body + '</div></section>';
    }).join('');
  }

  /* ─────────── Simulations ─────────── */
  function sims(D) {
    var have = D.items.filter(function (i) { return i.category === 'simulation'; });
    if (!have.length) return '<p class="st-empty">No simulations assigned yet.</p>';
    return have.map(function (i) {
      var role = D.role[i.item_id];
      var modes = D.modes.filter(function (m) { return m.role_id === role.id; });
      var em = D.emails.filter(function (e) { return e.scenario && e.scenario.role_id === role.id; });
      var ses = D.sessions.filter(function (s) { return s.role_id === role.id; })[0];
      var st = ses && ses.state || {};
      return '<section class="pf-card"><div class="pf-card-h"><h2>' + esc(role.title) + '</h2>' + bar(i.percent) + '<span class="pf-pct">' + i.percent + '%</span></div>' +
        (ses ? '<p class="pf-case">&#9654; Case in progress' + (st.city ? ' · ' + esc(String(st.city).toUpperCase()) + ' market' : '') + ' · step ' + ((st.step || 0) + 1) + ' · saved ' + when(ses.updated_at) + '</p>' : '') +
        '<table class="st-table pf-table"><thead><tr><th>Practice</th><th>Score</th><th>Updated</th></tr></thead><tbody>' +
        modes.map(function (m) {
          var s = D.scores.filter(function (x) { return x.role_mode_id === m.id; })[0];
          return '<tr><td>' + (MODE[m.mode] || m.mode) + '</td><td>' + (s ? (+s.score) + ' / ' + (+m.max_score) : '<span class="st-muted">Not yet</span>') + '</td><td>' + (s ? when(s.updated_at) : '') + '</td></tr>';
        }).join('') +
        (em.length ? '<tr><td>Emails</td><td>' + em.filter(g).length + ' graded of ' + em.length + ' sent</td><td>' + when(em[0].submitted_at) + '</td></tr>' : '') +
        '</tbody></table></section>';
    }).join('');
  }

  /* ─────────── Emails ─────────── */
  function emails(D) {
    if (!D.emails.length) return '<p class="st-empty">No simulation emails sent yet.</p>';
    return D.emails.map(function (e) {
      var gr = g(e), role = e.scenario ? D.role[e.scenario.role_id] : null;
      return '<section class="pf-card pf-mail"><div class="pf-card-h"><h2>' + esc(e.scenario ? e.scenario.prompt : 'Email') + '</h2>' +
          (gr ? '<span class="pf-grade">' + gr.score + '/' + (e.scenario ? e.scenario.max_score : 5) + '</span>' : '<a class="pf-tag warn" href="settings.html#emails">To grade</a>') + '</div>' +
        '<p class="st-muted">' + (role ? esc(role.title) + ' · ' : '') + 'sent ' + day(e.submitted_at) + '</p>' +
        '<div class="st-email">' + esc(e.body) + '</div>' +
        (gr ? '<div class="st-fb"><b>Feedback from ' + esc(gr.grader ? gr.grader.full_name : 'the coach') + ', ' + day(gr.graded_at) + '</b><p>' + esc(gr.feedback || 'No comment.') + '</p></div>' : '') +
        '</section>';
    }).join('');
  }

  /* ─────────── Checkpoints ─────────── */
  function checks(D) {
    var qs = Object.keys(D.byQ).map(function (k) { return D.byQ[k]; });
    if (!qs.length) return '<p class="st-empty">No checkpoint answers yet.</p>';
    var byCourse = {};
    qs.forEach(function (s) { var l = D.lesson[s.q.lesson_id]; var c = l && l.course; (byCourse[c] = byCourse[c] || []).push(s); });
    var missed = qs.filter(function (s) { return !s.first; }).sort(function (a, b) { return b.tries - a.tries; });
    return '<section class="pf-card"><div class="pf-card-h"><h2>By training</h2></div><table class="st-table pf-table"><thead><tr><th>Training</th><th>Questions answered</th><th>Right on the first try</th><th>Tries per question</th></tr></thead><tbody>' +
        Object.keys(byCourse).map(function (c) {
          var list = byCourse[c], ft = firstTry(list), tries = list.reduce(function (t, s) { return t + s.tries; }, 0);
          return '<tr><td>' + esc(D.course[c] ? D.course[c].title : 'Other') + '</td><td>' + list.length + '</td><td><div class="st-cell">' + bar(ft) + '<span>' + ft + '%</span></div></td><td>' + (tries / list.length).toFixed(1) + '</td></tr>';
        }).join('') + '</tbody></table></section>' +
      '<section class="pf-card"><div class="pf-card-h"><h2>Not right on the first try</h2><span>' + missed.length + '</span></div>' +
        (missed.length ? '<p class="st-muted">Good topics to go over together.</p><ul class="pf-missed">' + missed.map(function (s) {
          var l = D.lesson[s.q.lesson_id], c = l && D.course[l.course];
          return '<li><b>' + esc(s.q.prompt) + '</b><small>' + esc(c ? c.title : '') + (l ? ' · ' + esc(l.title) : '') + ' · ' + plural(s.tries, 'try') .replace('trys', 'tries') + (s.right ? ', then right' : ', not right yet') + '</small></li>';
        }).join('') + '</ul>' : '<p class="st-muted">Every question was right on the first try.</p>') + '</section>';
  }

  /* ─────────── Written work ─────────── */
  function written(D) {
    if (!D.prompts.length && !D.fields.length) return '<p class="st-empty">Nothing written yet. Writing prompts in the trainings and the Operations toolkit show up here.</p>';
    var groups = {};
    D.prompts.forEach(function (x) {
      var l = x.prompt && D.lesson[x.prompt.lesson_id], c = l && D.course[l.course];
      var k = (c ? c.title : 'Training') + ' · ' + (l ? l.title : '');
      (groups[k] = groups[k] || []).push({ label: x.prompt ? x.prompt.label : '', body: x.body, at: x.updated_at, pos: x.prompt ? x.prompt.position : 0 });
    });
    D.fields.forEach(function (x) {
      var k = 'Operations toolkit · ' + (x.field && x.field.template ? x.field.template.title : 'Template');
      (groups[k] = groups[k] || []).push({ label: x.field ? x.field.label : '', body: x.body, at: x.updated_at, pos: x.field ? x.field.position : 0 });
    });
    return Object.keys(groups).sort().map(function (k) {
      return '<section class="pf-card"><div class="pf-card-h"><h2>' + esc(k) + '</h2></div>' + groups[k].sort(function (a, b) { return a.pos - b.pos; }).map(function (x) {
        return '<div class="pf-answer"><b>' + esc(x.label) + '</b><div class="st-email">' + esc(x.body) + '</div><small>' + day(x.at) + '</small></div>';
      }).join('') + '</section>';
    }).join('');
  }

  /* ─────────── Activity ─────────── */
  function timeline(D) {
    var ev = [];
    D.lc.forEach(function (x) { var l = D.lesson[x.lesson_id], c = l && D.course[l.course]; if (l) ev.push({ at: x.completed_at, k: 'lesson', t: 'Finished a lesson', s: (c ? c.title + ' · ' : '') + l.title }); });
    D.cc.forEach(function (x) { var c = D.course[x.course_id]; ev.push({ at: x.completed_at, k: 'cert', t: 'Completed a training', s: c ? c.title : '' }); });
    D.emails.forEach(function (e) {
      ev.push({ at: e.submitted_at, k: 'mail', t: 'Sent a simulation email', s: e.scenario ? e.scenario.prompt : '' });
      var gr = g(e); if (gr) ev.push({ at: gr.graded_at, k: 'grade', t: 'Email graded ' + gr.score + '/' + (e.scenario ? e.scenario.max_score : 5), s: e.scenario ? e.scenario.prompt : '' });
    });
    D.scores.forEach(function (x) { var m = D.modeOf[x.role_mode_id], r = m && D.role[m.role_id]; if (m) ev.push({ at: x.updated_at, k: 'sim', t: 'Simulation practice', s: (r ? r.title + ' · ' : '') + (MODE[m.mode] || m.mode) + ': ' + (+x.score) + ' / ' + (+m.max_score) }); });
    D.sessions.forEach(function (x) { var r = D.role[x.role_id]; ev.push({ at: x.updated_at, k: 'sim', t: 'Worked on a case', s: r ? r.title : '' }); });
    D.ca.forEach(function (x) { var c = D.course[x.course_id]; ev.push({ at: x.assigned_at, k: 'assign', t: 'Training assigned', s: c ? c.title : '' }); });
    D.sa.forEach(function (x) { var r = D.role[x.role_id]; ev.push({ at: x.assigned_at, k: 'assign', t: 'Simulation assigned', s: r ? r.title : '' }); });
    /* checkpoint answers, one line per training and day */
    var days = {};
    D.att.forEach(function (a) {
      var q = D.q[a.question_id], l = q && D.lesson[q.lesson_id]; if (!l) return;
      var k = l.course + '|' + String(a.attempted_at).slice(0, 10);
      var d = days[k] || (days[k] = { at: a.attempted_at, n: 0, ok: 0, c: D.course[l.course] });
      d.n++; if (a.is_correct) d.ok++; if (a.attempted_at > d.at) d.at = a.attempted_at;
    });
    Object.keys(days).forEach(function (k) { var d = days[k]; ev.push({ at: d.at, k: 'check', t: 'Answered ' + plural(d.n, 'checkpoint question'), s: (d.c ? d.c.title + ' · ' : '') + d.ok + ' right' }); });
    if (D.p.last_sign_in_at) ev.push({ at: D.p.last_sign_in_at, k: 'in', t: 'Signed in', s: '' });
    ev.push({ at: D.p.created_at, k: 'in', t: 'Account created', s: D.p.created_by ? 'By ' + D.p.created_by : '' });
    return ev.filter(function (e) { return e.at; }).sort(function (a, b) { return Date.parse(b.at) - Date.parse(a.at); });
  }
  function timelineHtml(list) {
    if (!list.length) return '<p class="st-muted">No activity yet.</p>';
    return '<ol class="pf-tl">' + list.map(function (e) {
      return '<li class="k-' + e.k + '"><span class="pf-tl-dot"></span><div><b>' + esc(e.t) + '</b>' + (e.s ? '<span>' + esc(e.s) + '</span>' : '') + '</div><small title="' + esc(new Date(e.at).toLocaleString()) + '">' + when(e.at) + '</small></li>';
    }).join('') + '</ol>';
  }
  function activity(D) { return '<section class="pf-card">' + timelineHtml(timeline(D)) + '</section>'; }
})();
