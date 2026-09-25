/* ══════════════════════════════════════════════════════════
   Learner home
   A signed in associate gets a guided home: one welcome line that says
   where they are, and the three steps in order (Introduction, a training
   path, the Simulations). Only the current step carries a button, done
   steps show a check and a step that is not open yet shows a lock.
   The first visit opens a three screen welcome that explains the site
   and hands off to step 1. Signed out visitors keep the landing page.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (!window.SCApp) return;
  var me = SCApp.currentUser();
  var dash = document.getElementById('my-learning');
  if (!me || !dash) return;

  function esc(s) { return String(s).replace(/&(?!amp;)/g, '&amp;').replace(/</g, '&lt;'); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ── progress from each area ── */
  var C = window.SCCourses;
  var introDone = SCApp.isIntroDone(me);
  var introP = C ? C.progress(C.get('intro'), me.id) : { done: 0, total: 5 };
  var introSeen = introDone ? introP.total : introP.done;

  var trainings = C ? C.list.filter(function (c) { return c.id !== 'intro'; }) : [];
  var tDone = 0, tTotal = 0, tComplete = 0, resumeHref = null;
  trainings.forEach(function (c) {
    var p = C.progress(c, me.id);
    tDone += p.done; tTotal += p.total; if (p.complete) tComplete++;
    if (!resumeHref && p.done && !p.complete) resumeHref = c.href; /* straight back into the training you left open */
  });

  var roles = SCApp.getRoleBreakdown ? SCApp.getRoleBreakdown(me.id) : {};
  var practiced = Object.keys(roles || {}).length;

  /* ── the three steps ── */
  var ICON = {
    learn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>',
    study: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/></svg>',
    practice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'
  };
  var steps = [
    { n: 1, icon: 'learn', title: 'Learn the tools', desc: 'What Claude, ChatGPT and Manus are, and when to use each one.',
      done: introDone, pct: introDone ? 100 : Math.round(introSeen / introP.total * 100),
      meta: introDone ? 'Complete' : (introSeen ? introSeen + ' of ' + introP.total + ' lessons' : introP.total + ' short lessons'),
      href: 'ai.html', go: introSeen ? 'Continue the Introduction' : 'Start the Introduction', again: 'Review' },
    { n: 2, icon: 'study', title: 'Study your role', desc: 'Pick a training path, VA or Marketing, and work through it lesson by lesson.',
      done: tComplete > 0, pct: tTotal ? Math.round(tDone / tTotal * 100) : 0,
      meta: tComplete ? tComplete + ' of ' + trainings.length + ' trainings done' : (tDone ? 'In progress' : (introDone ? 'Not started yet' : 'Open anytime')),
      href: resumeHref || 'paths.html', go: resumeHref ? 'Continue your training' : 'Choose a path', again: 'Open the paths' },
    { n: 3, icon: 'practice', title: 'Practice real cases', desc: 'Run the scenario your role handles every day, with instant feedback.',
      done: practiced > 0, locked: !introDone, pct: null,
      meta: !introDone ? 'Opens after step 1' : (practiced ? practiced + ' simulation' + (practiced > 1 ? 's' : '') + ' practiced' : 'Ready when you are'),
      href: '#simulations', go: 'Choose a simulation', again: 'Practice again' }
  ];
  var cur = steps.filter(function (s) { return !s.done && !s.locked; })[0];
  var allDone = !cur;
  if (allDone) cur = steps[2];

  /* ── the welcome line says where you are ── */
  var first = (me.name || '').split(' ')[0];
  var fresh = !introDone && introSeen === 0 && !tDone && !practiced;
  var hello = fresh ? 'Welcome' + (first ? ', ' + esc(first) : '') : 'Welcome back' + (first ? ', ' + esc(first) : '');
  var line = fresh ? 'Three steps take you from the classroom to your first real case. Start with step 1.'
    : allDone ? 'You have been through all three steps. Keep your skills sharp in the simulations.'
    : 'You are on step ' + cur.n + ': ' + cur.title.toLowerCase() + '.';

  function stepHtml(s) {
    var state = s === cur && !allDone ? 'current' : (s.done ? 'done' : (s.locked ? 'locked' : 'next'));
    var node = state === 'done' ? ICON.check : (state === 'locked' ? ICON.lock : ICON[s.icon]);
    var action = state === 'current'
      ? '<a class="hb cyan gp-go" href="' + s.href + '">' + esc(s.go) + ' &rarr;</a>'
      : state === 'done' ? '<a class="link-go" href="' + s.href + '">' + esc(s.again) + ' &rarr;</a>'
      : state === 'next' ? '<a class="link-go muted" href="' + s.href + '">' + esc(s.go) + ' &rarr;</a>'
      : '';
    return '<li class="gp-step ' + state + '">' +
      '<div class="gp-node">' + node + (state === 'current' ? '<span class="gp-here">' + (fresh ? 'Start here' : 'You are here') + '</span>' : '') + '</div>' +
      '<div class="gp-body"><span class="gp-n">Step ' + s.n + '</span><h3>' + esc(s.title) + '</h3><p>' + esc(s.desc) + '</p>' +
        (s.pct != null && state !== 'locked' ? '<div class="gp-bar"><i style="width:' + s.pct + '%"></i></div>' : '') +
        '<div class="gp-meta">' + esc(s.meta) + '</div>' + action + '</div></li>';
  }

  dash.innerHTML =
    '<div class="ld-top"><div class="ld-inner"><div class="ld-hello">' +
      '<h1>' + hello + '</h1><p>' + line + '</p>' +
    '</div></div></div>' +
    '<div class="ld-path"><div class="ld-inner">' +
      '<ol class="gp" aria-label="Your three steps">' + steps.map(stepHtml).join('') + '</ol>' +
    '</div></div>';

  dash.hidden = false;
  document.body.classList.add('has-dash');

  /* ── first visit: a short welcome that explains the site ── */
  var seenKey = 'scc_onboard__' + me.id;
  if (!fresh || store(seenKey)) return;

  var SLIDES = [
    { t: 'Welcome to Skill Cloud Academy', p: 'This is where you practice your role before your first real day, on real Skill Cloud cases, with no risk to a client.' },
    { t: 'Three steps, in order',
      list: ['<b>Learn the tools.</b> The Introduction to Claude, ChatGPT and Manus.', '<b>Study your role.</b> A training path, VA or Marketing.', '<b>Practice real cases.</b> The simulations, which open after step 1.'] },
    { t: 'Start with step 1', p: 'The Introduction takes you through five short lessons with a quick check after each one. Your progress saves as you go.' }
  ];
  var at = 0;
  document.body.insertAdjacentHTML('beforeend',
    '<div class="ob" id="ob" role="dialog" aria-modal="true" aria-labelledby="obT"><div class="ob-card">' +
      '<button class="ob-x" type="button" aria-label="Close">&times;</button>' +
      '<div class="ob-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg></div>' +
      '<div class="ob-body" id="obBody"></div>' +
      '<div class="ob-dots" id="obDots"></div>' +
      '<div class="ob-actions"><button class="hb line" type="button" id="obBack">Back</button><button class="hb cyan" type="button" id="obNext">Next</button></div>' +
    '</div></div>');
  var ob = document.getElementById('ob');

  function paint() {
    var s = SLIDES[at], last = at === SLIDES.length - 1;
    document.getElementById('obBody').innerHTML = '<h2 id="obT">' + s.t + '</h2>' +
      (s.p ? '<p>' + s.p + '</p>' : '') +
      (s.list ? '<ol class="ob-list">' + s.list.map(function (x, i) { return '<li><span>' + (i + 1) + '</span><div>' + x + '</div></li>'; }).join('') + '</ol>' : '');
    document.getElementById('obDots').innerHTML = SLIDES.map(function (_, i) { return '<i class="' + (i === at ? 'on' : '') + '"></i>'; }).join('');
    var back = document.getElementById('obBack');
    back.textContent = last ? 'Look around first' : 'Back';
    back.style.visibility = at === 0 ? 'hidden' : 'visible';
    document.getElementById('obNext').innerHTML = last ? 'Start the Introduction &rarr;' : 'Next';
  }
  function close() { store(seenKey, '1'); ob.classList.remove('open'); setTimeout(function () { ob.remove(); }, 250); }

  document.getElementById('obNext').onclick = function () {
    if (at === SLIDES.length - 1) { store(seenKey, '1'); location.href = 'ai.html'; return; }
    at++; paint();
  };
  document.getElementById('obBack').onclick = function () { if (at === SLIDES.length - 1) return close(); at = Math.max(0, at - 1); paint(); };
  ob.querySelector('.ob-x').onclick = close;
  ob.addEventListener('click', function (e) { if (e.target === ob) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.getElementById('ob')) close(); });

  paint();
  requestAnimationFrame(function () { ob.classList.add('open'); document.getElementById('obNext').focus(); });
})();
