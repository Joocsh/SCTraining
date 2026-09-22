/* ══════════════════════════════════════════════════════════
   Learner home
   For a signed in associate the Home opens on "My learning": resume
   where they left off, then the learning path in order (Introduction,
   VA, Simulations) with real progress from each area. Signed out
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
  var introDone = SCApp.isIntroDone(me);
  var introSeen = read('scc_intro_seen__' + me.id, []).length;
  var introPct = introDone ? 100 : Math.round(Math.min(introSeen, 5) / 5 * 100);

  var sop = read('sc_va_sop_foundations_v2__' + me.id, { done: [] });
  var sopDone = (sop.done || []).length, SOP_TOTAL = 11;
  var sopPct = Math.round(sopDone / SOP_TOTAL * 100);

  var roles = SCApp.getRoleBreakdown ? SCApp.getRoleBreakdown(me.id) : {};
  var practiced = Object.keys(roles || {}).length;

  /* ── where to resume ── */
  var NAMES = {
    'ai.html': ['Introduction', 'AI tools you will use every day'],
    'va/sop-foundations.html': ['SOP Foundations', 'VA course'],
    'va.html': ['VA', 'Courses by role'],
    'roles/transaction-coordinator.html': ['Transaction Coordinator', 'Simulation'],
    'roles/listing-coordinator.html': ['Listing Coordinator', 'Simulation'],
    'roles/property-manager.html': ['Property Manager', 'Simulation'],
    'roles/lead-manager.html': ['Lead Manager', 'Simulation'],
    'roles/operations-manager.html': ['Operations Manager', 'Simulation'],
    'roles/cfo-bookkeeper.html': ['CFO & Bookkeeper', 'Simulation'],
    'marketing-training.html': ['Marketing', 'Training']
  };
  var last = SCApp.getLastPage(me.id);
  var resume;
  if (last && NAMES[last]) {
    resume = { href: last, title: NAMES[last][0], kind: NAMES[last][1], cta: 'Resume' };
    if (last === 'va/sop-foundations.html') resume.meta = sopDone + ' of ' + SOP_TOTAL + ' lessons done';
    if (last === 'ai.html') resume.meta = (introDone ? 5 : Math.min(introSeen, 5)) + ' of 5 sections read';
  } else if (!introDone) {
    resume = { href: 'ai.html', title: 'Introduction', kind: 'Start here', cta: 'Start', meta: 'Unlocks the Simulations' };
  } else if (sopPct < 100) {
    resume = { href: 'va/sop-foundations.html', title: 'SOP Foundations', kind: 'Up next in VA', cta: sopDone ? 'Resume' : 'Start', meta: sopDone + ' of ' + SOP_TOTAL + ' lessons done' };
  } else {
    resume = { href: '#simulations', title: 'Simulations', kind: 'Up next', cta: 'Choose a simulation', meta: 'Practice your role on real cases' };
  }

  /* ── path steps ── */
  var steps = [
    { n: 1, title: 'Introduction', desc: 'What Claude, ChatGPT and Manus are, and when to use each one.', pct: introPct,
      meta: introDone ? 'Complete' : (Math.min(introSeen, 5) + ' of 5 sections'), href: 'ai.html', cta: introDone ? 'Review' : (introSeen ? 'Continue' : 'Start') },
    { n: 2, title: 'VA courses', desc: 'Study your role before you simulate it. Start with SOP Foundations.', pct: sopPct,
      meta: sopDone + ' of ' + SOP_TOTAL + ' lessons', href: 'va.html', cta: sopDone ? (sopPct === 100 ? 'Review' : 'Continue') : 'Start' },
    { n: 3, title: 'Simulations', desc: 'Practice real cases for your role with instant feedback.', pct: null, locked: !introDone,
      meta: introDone ? (practiced ? practiced + ' role' + (practiced > 1 ? 's' : '') + ' practiced' : 'Ready to start') : 'Unlocks after the Introduction',
      href: introDone ? '#simulations' : 'ai.html', cta: introDone ? 'Choose a simulation' : 'Finish the Introduction' }
  ];
  var overall = Math.round((introPct + sopPct + (practiced ? 100 : 0)) / 3);

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
      '<div class="ld-path-head"><h2>Your learning path</h2>' +
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
