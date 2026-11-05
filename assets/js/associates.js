/* ══════════════════════════════════════════════════════════
   Associates (associates.html), for coaches and admins, in the nav.
   How the team is doing, in one place:
     Overview           team numbers, who needs attention, one card per
                        associate (each card opens their full profile)
     Leaderboard        who is ahead, who misses more, who is active
     Emails to grade    the simulation emails waiting for a grade
     Question insights  how each checkpoint question does
   A coach sees the associates on their team, an admin sees everyone.
   The sections come from staff.js (SCStaff.settings).
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  var me = SCApp.requireAuth({ staffOnly: true });
  if (!me) return;

  SCDB.ready.then(function (p) {
    if (!p) { location.href = SCApp.loginUrl('associates.html'); return; }
    if (p.role !== 'admin' && p.role !== 'coach') { location.href = 'profile.html'; return; }
    var S = SCStaff.settings(p.role, p);
    var TABS = { team: S.sections.team, board: S.sections.board, emails: S.sections.emails, insights: S.sections.insights };
    $('#asHello').textContent = p.role === 'admin'
      ? 'Every associate: progress, activity and what needs your attention.'
      : 'Your team: progress, activity and what needs your attention.';
    var current = null;
    function show(t) {
      if (!TABS[t]) t = 'team';
      if (t === current) return;
      if (current && !S.leaveOk()) { history.replaceState(null, '', '#' + current); return; }
      current = t;
      $$('.as-hero .st-tabs button').forEach(function (b) { var on = b.dataset.t === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      $$('.as-panel').forEach(function (el) { el.hidden = el.dataset.t !== t; });
      TABS[t]();
      try { history.replaceState(null, '', '#' + t); } catch (e) {}
    }
    $$('.as-hero .st-tabs button').forEach(function (b) { b.onclick = function () { show(b.dataset.t); }; });
    window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });
    show(location.hash.slice(1));
    S.emailsWaiting().then(function (n) {
      var b = $('#asEmailBadge');
      if (n) { b.textContent = n; b.hidden = false; }
    });
  });
})();
