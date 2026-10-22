/* ══════════════════════════════════════════════════════════
   Simulation resume: the exact point of each person in each case.
   Loaded by app-core.js on the simulation pages (roles/*.html).

   workflow.js already snapshots the open case into localStorage
   (sc_wf_state) as the person works, and restores it on a page reload.
   This file does not change that. It copies each snapshot into a copy
   that belongs to this person and this simulation, and sends it to the
   database (simulation_sessions) a moment later, so a case survives a
   closed tab, a reboot or another computer.

   When the person comes back to the simulation, a card offers to
   continue the case. "Continue" puts the snapshot back and reloads the
   page, and workflow.js restores it as it does after any reload.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var PAGES = {
    'transaction-coordinator': 'tc', 'listing-coordinator': 'listing', 'property-manager': 'lc',
    'lead-manager': 'lm', 'cfo-bookkeeper': 'cfo', 'admin-social': 'admin_social'
  };
  var m = location.pathname.match(/roles\/([a-z-]+)\.html$/);
  var role = m && PAGES[m[1]];
  var me = role && window.SCApp && SCApp.currentUser();
  if (!me) return;

  var WF = 'sc_wf_state', PANEL = 'sc_active_panel', AGAIN = 'scc_resume';
  var KEY = 'scc_simcase__' + role + '__' + me.id;

  function read(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function db() { return window.SCDB && SCDB.simCase ? SCDB : null; }
  function reloaded() {
    try { var n = performance.getEntriesByType('navigation')[0]; if (n) return n.type === 'reload'; } catch (e) {}
    try { return performance.navigation.type === 1; } catch (e) { return false; }
  }
  var wasReload = reloaded();

  /* the case open on this page right now, if any (workflow.js globals) */
  function activeCase() { try { return wfActiveScenario || null; } catch (e) { return null; } }

  /* ─────────── save ─────────── */
  var last = null, pushTimer = null;
  function snapshot(now) {
    if (!activeCase()) return;
    if (now && typeof window._wfSaveState === 'function') { try { window._wfSaveState(); } catch (e) {} }
    var raw = localStorage.getItem(WF);
    if (!raw || raw === last) return;
    var state; try { state = JSON.parse(raw); } catch (e) { return; }
    if (!state || typeof state.caseIdx !== 'number' || state.caseIdx < 0) return;
    last = raw;
    try { localStorage.setItem(KEY, JSON.stringify({ state: state, at: Date.now() })); } catch (e) {}
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { if (db()) SCDB.simCase(role, state); }, now ? 0 : 1500);
  }
  function forget() {
    last = null;
    localStorage.removeItem(KEY);
    if (db()) SCDB.simCase(role, null);
  }

  /* workflow.js saves after these events; read its snapshot right after */
  ['input', 'change', 'click', 'drop'].forEach(function (type) {
    document.addEventListener(type, function () { setTimeout(snapshot, 0); }, true);
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') snapshot(true); });
  window.addEventListener('pagehide', function () { snapshot(true); });
  setInterval(function () { snapshot(true); }, 20000);

  /* "Restart case" and finishing a case clear the snapshot: forget it too.
     wfReset also runs when the person steps Back out of a case midway;
     then the case is kept, so they can continue it later. */
  function atLastStep() { try { return !!wfActiveSteps && wfStep >= wfActiveSteps.length - 1; } catch (e) { return false; } }
  function forgetAfter(name, onlyAtEnd) {
    var f = window[name];
    if (typeof f !== 'function') return;
    window[name] = function () {
      var end = atLastStep();
      var r = f.apply(this, arguments);
      if (!localStorage.getItem(WF) && (!onlyAtEnd || end)) forget();
      return r;
    };
  }

  /* ─────────── resume ─────────── */
  function decode(html) { var d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function when(t) {
    var mins = Math.round((Date.now() - t) / 60000);
    if (mins < 1) return 'just now'; if (mins < 60) return mins + ' min ago';
    var h = Math.round(mins / 60); if (h < 24) return h + ' h ago';
    return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function describe(state) {
    var data = window.SIM_STATES && window.SIM_STATES.length ? (window.SIM_DATA || {})[state.city] : window.SIM_DATA;
    var sc = data && data[state.caseIdx];
    var total = sc ? (sc.stepCount || (sc.wfSteps || []).length || (sc.wfLabels || []).length) : 0;
    var label = sc && sc.wfLabels ? decode(sc.wfLabels[state.step || 0]) : '';
    return {
      title: sc && sc.title ? decode(sc.title) : 'Your case',
      step: 'Step ' + ((state.step || 0) + 1) + (total ? ' of ' + total : '') + (label ? ': ' + label : '')
    };
  }

  function offer(saved) {
    var info = describe(saved.state);
    var css = document.createElement('style');
    css.textContent =
      '.sr-card{position:fixed;left:50%;bottom:24px;transform:translate(-50%,16px);opacity:0;z-index:400;width:min(560px,calc(100vw - 32px));' +
      'background:#fff;border:1px solid #bfe9ee;border-radius:18px;box-shadow:0 24px 60px rgba(10,38,71,.22);padding:18px 20px;display:grid;' +
      'grid-template-columns:44px 1fr;gap:4px 14px;font-family:inherit;transition:.25s}' +
      '.sr-card.in{opacity:1;transform:translate(-50%,0)}' +
      '.sr-ico{grid-row:1/4;width:44px;height:44px;border-radius:12px;background:#eefbfc;color:#0fa6b6;display:grid;place-items:center}' +
      '.sr-ico svg{width:22px;height:22px}' +
      '.sr-card b{color:#0a2647;font-size:16px}.sr-card p{margin:0;color:#33465c;font-size:14px;line-height:1.4}' +
      '.sr-card small{color:#8a99ab;font-size:12.5px}' +
      '.sr-act{grid-column:2;display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}' +
      '.sr-act button{border-radius:999px;padding:10px 18px;font:inherit;font-weight:800;font-size:14px;cursor:pointer}' +
      '.sr-go{border:0;background:#17c3d4;color:#0a2647}.sr-new{border:1px solid #e3eaf1;background:#fff;color:#40526a}' +
      '.sr-x{position:absolute;top:10px;right:12px;border:0;background:none;font-size:22px;line-height:1;color:#8a99ab;cursor:pointer}';
    document.head.appendChild(css);
    var card = document.createElement('div');
    card.className = 'sr-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Continue your case');
    card.innerHTML = '<span class="sr-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v4l3 2"/></svg></span>' +
      '<b>Continue where you left off?</b>' +
      '<p>' + esc(info.title) + '<br>' + esc(info.step) + '</p>' +
      '<small>Saved ' + when(saved.at) + '. Your answers and notes come back with it.</small>' +
      '<div class="sr-act"><button type="button" class="sr-go">Continue the case</button><button type="button" class="sr-new">Start over</button></div>' +
      '<button type="button" class="sr-x" aria-label="Not now">&times;</button>';
    document.body.appendChild(card);
    requestAnimationFrame(function () { card.classList.add('in'); });
    function close() { card.classList.remove('in'); setTimeout(function () { card.remove(); }, 260); }
    card.querySelector('.sr-go').onclick = function () {
      try {
        localStorage.setItem(WF, JSON.stringify(saved.state));
        localStorage.setItem(PANEL, 'sim');
        sessionStorage.setItem(AGAIN, role);
      } catch (e) {}
      location.reload();
    };
    card.querySelector('.sr-new').onclick = function () { forget(); close(); };
    card.querySelector('.sr-x').onclick = close;
  }

  function start() {
    forgetAfter('wfRestartCase');
    forgetAfter('wfReset', true);

    var asked = false;
    try { asked = sessionStorage.getItem(AGAIN) === role; sessionStorage.removeItem(AGAIN); } catch (e) {}
    if (wasReload) {
      /* the transaction coordinator page restores on its own; the others
         only when this file asked for it */
      if (asked && typeof window.wfRestoreSession === 'function' && !document.querySelector('#panel-sim.open')) {
        setTimeout(function () { window.wfRestoreSession(); }, 60);
      }
      return;
    }

    /* the newest copy wins: this browser, or the database (another computer) */
    var local = read(KEY);
    var fromDb = window.SCDB && SCDB.simCaseSaved ? SCDB.ready.then(function () { return SCDB.simCaseSaved(role); }).catch(function () { return null; }) : Promise.resolve(null);
    fromDb.then(function (remote) {
      var saved = local;
      if (remote && (!saved || remote.at > saved.at + 2000)) {
        saved = remote;
        try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
      }
      if (!saved || !saved.state) return;
      if (!(saved.state.step > 0 || saved.state.maxStep > 0 || saved.state.caseState)) return;
      if (document.querySelector('#panel-sim.open')) return;
      offer(saved);
    });
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();
