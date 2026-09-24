/* ══════════════════════════════════════════════════════════
   Learner home
   For a signed in associate the Home opens on "My learning": resume
   where they left off, then the three steps in order (Introduction,
   training paths, Simulations) with real progress. Signed out
   visitors keep the original landing hero.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (!window.SCApp) return;
  var me = SCApp.currentUser();
  var dash = document.getElementById('my-learning');
  if (!me || !dash) return;

  function read(key, fb) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fb : v; } catch (e) { return fb; } }

  /* ── progress from each area ── */
  var C = window.SCCourses;
  var introDone = SCApp.isIntroDone(me);
  var introP = C ? C.progress(C.get('intro'), me.id) : { done: 0, total: 5 };
  var introSeen = introDone ? introP.total : introP.done;
  var introPct = introDone ? 100 : Math.round(introP.done / introP.total * 100);

  var vaCourses = C ? C.list.filter(function (c) { return c.id !== 'intro'; }) : [];
  var vaDone = 0, vaTotal = 0, vaComplete = 0;
  vaCourses.forEach(function (c) { var p = C.progress(c, me.id); vaDone += p.done; vaTotal += p.total; if (p.complete) vaComplete++; });
  var trainPct = vaTotal ? Math.round(vaDone / vaTotal * 100) : 0;

  var roles = SCApp.getRoleBreakdown ? SCApp.getRoleBreakdown(me.id) : {};
  var practiced = Object.keys(roles || {}).length;

  /* ── where to resume ──
     The Home never names a single training: a training belongs to its path
     and is opened from there, so a page inside a path resumes as the path. */
  var NAMES = {
    'ai.html': ['Introduction', 'AI tools you will use every day'],
    'roles/transaction-coordinator.html': ['Transaction Coordinator', 'Simulation'],
    'roles/listing-coordinator.html': ['Listing Coordinator', 'Simulation'],
    'roles/property-manager.html': ['Property Manager', 'Simulation'],
    'roles/lead-manager.html': ['Lead Manager', 'Simulation'],
    'roles/operations-manager.html': ['Operations Manager', 'Simulation'],
    'roles/cfo-bookkeeper.html': ['CFO & Bookkeeper', 'Simulation']
  };
  var INSIDE = {};
  if (C) {
    C.tracks.forEach(function (t) { INSIDE[t.href] = t.id; });
    C.list.forEach(function (c) { if (c.track && c.track !== 'intro') INSIDE[c.href] = c.track; });
  }
  function pathCard(id) {
    var t = C.tracks.filter(function (x) { return x.id === id; })[0] || C.tracks[0];
    var inside = C.byTrack(t.id), done = 0, total = 0;
    inside.forEach(function (c) { var p = C.progress(c, me.id); done += p.done; total += p.total; });
    return {
      href: t.href, title: t.title, kind: 'Up next in your training',
      meta: done ? done + ' of ' + total + ' lessons done' : inside.length + ' training' + (inside.length === 1 ? '' : 's') + ' in this path',
      cta: done ? 'Continue' : 'Open the path'
    };
  }

  var last = SCApp.getLastPage(me.id);
  var resume;
  if (last && C && INSIDE[last]) {
    resume = pathCard(INSIDE[last]);
  } else if (last && NAMES[last]) {
    resume = { href: last, title: NAMES[last][0], kind: NAMES[last][1], cta: 'Resume' };
    if (last === 'ai.html') resume.meta = introSeen + ' of 5 lessons done';
  } else if (!introDone) {
    resume = { href: 'ai.html', title: 'Introduction', kind: 'Start here', cta: 'Start', meta: 'Unlocks the Simulations' };
  } else if (trainPct < 100 && C) {
    var open = C.tracks.filter(function (t) {
      return C.byTrack(t.id).some(function (c) { return C.progress(c, me.id).done > 0; });
    })[0];
    resume = open ? pathCard(open.id)
      : { href: '#paths', title: 'Training paths', kind: 'Up next', cta: 'Choose a path', meta: C.tracks.map(function (t) { return t.title; }).join(' and ') };
  } else {
    resume = { href: '#simulations', title: 'Simulations', kind: 'Up next', cta: 'Choose a simulation', meta: 'Practice your role on real cases' };
  }

  /* ── path steps ── */
  var steps = [
    { n: 1, title: 'Introduction', desc: 'What Claude, ChatGPT and Manus are, and when to use each one.', pct: introPct,
      meta: introDone ? 'Complete' : (introSeen + ' of 5 lessons'), href: 'ai.html', cta: introDone ? 'Review' : (introSeen ? 'Continue' : 'Start') },
    { n: 2, title: 'Training paths', desc: 'Study your role before you simulate it. Two paths: ' + (C ? C.tracks.map(function (t) { return t.title; }).join(' and ') : 'VA') + '.', pct: trainPct,
      meta: vaComplete + ' of ' + vaCourses.length + ' trainings done', href: '#paths', cta: vaDone ? (trainPct === 100 ? 'Review' : 'Continue') : 'Choose a path' },
    { n: 3, title: 'Simulations', desc: 'Practice real cases for your role with instant feedback.', pct: null, locked: !introDone,
      meta: introDone ? (practiced ? practiced + ' role' + (practiced > 1 ? 's' : '') + ' practiced' : 'Ready to start') : 'Unlocks after the Introduction',
      href: introDone ? '#simulations' : 'ai.html', cta: introDone ? 'Choose a simulation' : 'Finish the Introduction' }
  ];
  var overall = Math.round((introPct + trainPct + (practiced ? 100 : 0)) / 3);

  function esc(s) { return String(s).replace(/&(?!amp;)/g, '&amp;').replace(/</g, '&lt;'); }
  var first = (me.name || '').split(' ')[0];

  dash.innerHTML =
    '<div class="ld-top"><div class="ld-inner">' +
      '<div class="ld-hello">' +
        '<span class="ld-kick">My learning</span>' +
        '<h1>Welcome back' + (first ? ', ' + esc(first) : '') + '</h1>' +
        '<p>Pick up where you left off, or follow the path below.</p>' +
      '</div>' +
      '<a class="ld-resume" href="' + resume.href + '">' +
        '<span class="ld-resume-kind">' + esc(resume.kind) + '</span>' +
        '<b>' + esc(resume.title) + '</b>' +
        (resume.meta ? '<span class="ld-resume-meta">' + esc(resume.meta) + '</span>' : '') +
        '<span class="ld-resume-cta">' + esc(resume.cta) + ' <span aria-hidden="true">&rarr;</span></span>' +
      '</a>' +
    '</div></div>' +
    '<div class="ld-path"><div class="ld-inner">' +
      '<div class="ld-path-head"><h2>Your next steps</h2>' +
        '<div class="ld-overall"><div class="ld-bar"><i style="width:' + overall + '%"></i></div><span>' + overall + '% overall</span></div></div>' +
      '<ol class="ld-steps">' + steps.map(function (s) {
        var state = s.locked ? 'locked' : (s.pct === 100 ? 'done' : ((s.pct || (s.n === 3 && practiced)) ? 'active' : 'todo'));
        return '<li class="ld-step ' + state + '">' +
          '<div class="ld-num">' + (state === 'done' ? '&#10003;' : (s.locked ? '&#128274;' : s.n)) + '</div>' +
          '<div class="ld-body"><span class="ld-step-kick">Step ' + s.n + '</span><h3>' + esc(s.title) + '</h3><p>' + esc(s.desc) + '</p>' +
            (s.pct != null ? '<div class="ld-bar sm"><i style="width:' + s.pct + '%"></i></div>' : '') +
            '<div class="ld-foot"><span>' + esc(s.meta) + '</span><a href="' + s.href + '">' + esc(s.cta) + ' &rarr;</a></div>' +
          '</div></li>';
      }).join('') + '</ol>' +
    '</div></div>';

  dash.hidden = false;
  document.body.classList.add('has-dash');
})();
