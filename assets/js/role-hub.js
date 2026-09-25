/* ══════════════════════════════════════════════════════════
   SkillCloud · Simulation start screen
   Every role page opens on the same start screen: the person, the role,
   your progress, and the modules in the order to take them. Only the
   next module carries the main button. Picking a module hands the page
   back to its own simulator through the functions it already has, and
   closing that module brings the start screen back.

   Include after the page's own scripts:
     <link rel="stylesheet" href="../assets/css/role-hub.css">
     <script src="../assets/js/role-hub.js" data-role="tc" defer></script>
   Roles: tc, listing, pm, lead, ops, cfo. Operations runs inside the same
   role-shell rail as the others; its sections are panels there.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var me = document.currentScript;
  var ROLE = me && me.getAttribute('data-role');

  var I = {
    sim: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
    mls: '<path d="M4 11.5L12 4l8 7.5"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
    prompt: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
    quiz: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
    tax: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
  };
  function svg(p, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }

  var SHELL = function (sec) { return function () { var b = document.querySelector('#rsNav button[data-sec="' + sec + '"]'); if (b) b.click(); }; };
  var PANEL = function (id) { return function () { if (window.openPanel) window.openPanel(id); }; };
  /* inside the shell, Listing's own start hooks never run; call them here */
  var LISTING = function (id, init) { return function () { SHELL(id)(); if (typeof window[init] === 'function') window[init](); }; };

  var CONFIG = {
    tc: {
      title: 'Transaction Coordinator', key: 'tc', photo: 'role-tc-nathalia.png', kind: 'panels',
      desc: 'Practice contract to close scenarios: EMD, contingency periods, disclosures, and the 3 day Closing Disclosure across 4 markets.',
      modes: [
        { id: 'sim', name: 'Case Simulator', icon: 'sim', total: 4, open: PANEL('sim'), desc: 'Run a real transaction end to end: real emails, real forms and a real repair negotiation, from contract to closing.' },
        { id: 'mls', name: 'MLS Practice', icon: 'mls', total: 10, open: PANEL('mls'), desc: 'Read and enter MLS data for each state market: list price, DOM, contract dates and status changes.' },
        { id: 'prompt', name: 'Prompt Practice', icon: 'prompt', total: 10, open: PANEL('prompt'), desc: 'Draft emails, checklists and contract summaries with Claude, then copy the finished prompt.' },
        { id: 'quiz', name: 'Deadline Quiz', icon: 'quiz', total: 8, open: PANEL('quiz'), desc: 'Race the clock on state deadlines: EMD, contingencies and the Closing Disclosure.' }
      ],
      extras: [
        { name: 'Tax Records', icon: 'tax', open: PANEL('tax'), desc: 'Public records for details the contract leaves out.' },
        { name: 'Reference library', icon: 'book', open: function () { if (window.openResources) window.openResources(); away(); }, desc: 'Prompt library, use cases and a playbook per state.' }
      ]
    },
    listing: {
      title: 'Listing Coordinator', key: 'listing', photo: 'Andrea%20Villalta.png', kind: 'shell',
      desc: 'Practice full listing management: MLS entry and validation, seller updates, price conversations and marketing for active listings.',
      modes: [
        { id: 'sim', name: 'Case Simulator', icon: 'sim', total: 4, open: LISTING('sim', 'simInit'), desc: 'A real listing, by state, from intake to buyer offer: real emails, forms and a real net sheet.' },
        { id: 'mls', name: 'MLS Practice', icon: 'mls', total: 10, open: LISTING('mls', 'mlsInit'), desc: 'Enter listing data for TX, CA, VA and NY, validate it and draft public remarks.' },
        { id: 'prompt', name: 'Prompt Practice', icon: 'prompt', total: 6, open: LISTING('prompt', 'initPromptPlayground'), desc: 'Correspondence, agendas, SOPs, listing captions and content calendars with Claude.' },
        { id: 'quiz', name: 'Deadline Quiz', icon: 'quiz', total: 15, open: LISTING('quiz', 'quizReset'), desc: 'Timed checks on compliance, photography scheduling and MLS entry rules.' }
      ],
      extras: [
        { name: 'Tax Records', icon: 'tax', open: SHELL('tax'), desc: 'Public records for details the contract leaves out.' },
        { name: 'Reference library', icon: 'book', open: SHELL('resources'), desc: 'Training videos and playbooks for the listing workflow.' }
      ]
    },
    pm: {
      title: 'Property Manager', key: 'lc', photo: 'role-pm-josue.png', kind: 'shell',
      desc: 'Run the full tenant lifecycle: screen leads, verify applicants with TurboTenant, close the lease, then coordinate maintenance with vendors.',
      modes: [
        { id: 'sim', name: 'Case Simulator', icon: 'sim', total: 1, open: SHELL('ext0'), desc: 'One real case from lead to lease, then a maintenance emergency with real vendor emails.' },
        { id: 'prompt', name: 'Prompt Practice', icon: 'prompt', total: 8, open: SHELL('prompt'), desc: 'Inquiry replies, approval and denial letters, move in instructions and renewals with Claude.' },
        { id: 'quiz', name: 'Deadline Quiz', icon: 'quiz', total: 6, open: SHELL('quiz'), desc: 'Fair housing, application timelines, adverse action notices and lease compliance.' }
      ],
      extras: [{ name: 'Resources', icon: 'book', open: SHELL('resources'), desc: 'Prompt library and role playbooks.' }]
    },
    lead: {
      title: 'Lead Manager', key: 'lm', photo: 'role-lead.png?v=2', kind: 'shell',
      desc: 'Practice cold lead to booked appointment: outreach scripts, qualification, follow up sequences and clean CRM notes.',
      modes: [
        { id: 'sim', name: 'Case Simulator', icon: 'sim', total: 1, open: SHELL('sim'), desc: 'A real inbound lead from CRM intake to qualification, re engagement and a booked handoff.' },
        { id: 'prompt', name: 'Prompt Practice', icon: 'prompt', total: 8, open: SHELL('prompt'), desc: 'Outreach scripts, call guides, drip sequences and CRM notes with Claude.' },
        { id: 'quiz', name: 'Deadline Quiz', icon: 'quiz', total: 6, open: SHELL('quiz'), desc: 'Follow up timing, CRM update frequency and handoff checklists.' }
      ],
      extras: [{ name: 'Resources', icon: 'book', open: SHELL('resources'), desc: 'Prompt library and role playbooks.' }]
    },
    cfo: {
      title: 'CFO & Bookkeeper', key: 'cfo', photo: 'Carlos%20Flores.png?v=2', kind: 'shell',
      desc: 'Practice month end bookkeeping and reporting: variance memos, AR explanations and vendor emails, with Claude as your writing partner.',
      modes: [
        { id: 'sim', name: 'Case Simulator', icon: 'sim', total: 1, open: SHELL('sim'), desc: 'A real reconciliation with a seeded discrepancy, a P&L narrative and vendor communication.' },
        { id: 'prompt', name: 'Prompt Practice', icon: 'prompt', total: 8, open: SHELL('prompt'), desc: 'Variance memos, bookkeeping checklists and investor updates with Claude.' },
        { id: 'quiz', name: 'Deadline Quiz', icon: 'quiz', total: 6, open: SHELL('quiz'), desc: 'Month end close timelines, AR aging windows and reconciliation checkpoints.' }
      ],
      extras: [{ name: 'Resources', icon: 'book', open: SHELL('resources'), desc: 'Prompt library and role playbooks.' }]
    },
    ops: {
      title: 'Operations Manager', key: 'ops', photo: 'Brandon%20Montenegro.png?v=2', kind: 'shell',
      note: 'Start here: the paths teach the frameworks the simulations then test.',
      desc: 'Fix agency bottlenecks with real decisions: onboarding SOPs, 90 day reviews and client reporting.',
      modes: [
        { id: 'paths', name: 'Learning Paths', icon: 'book', open: SHELL('paths'), desc: 'Six paths built from the Operations Manager Handbook, with practice from real decisions.' },
        { id: 'sims', name: 'Simulations', icon: 'sim', total: 10, open: SHELL('sims'), desc: 'Realistic case studies with no single right answer, judged on your reasoning.' }
      ],
      extras: [
        { name: 'Operations Toolkit', icon: 'tool', open: SHELL('toolkit'), desc: 'Templates from the training that autosave as you fill them in.' },
        { name: 'My Work', icon: 'tax', open: SHELL('work'), desc: 'Everything you have submitted: lessons, simulations and toolkit documents.' },
        { name: 'My Progress', icon: 'chart', open: SHELL('progress'), desc: 'Lessons, simulations and skills so far.' }
      ]
    }
  };
  var C = CONFIG[ROLE];
  if (!C) return;

  /* ── progress, read from what each simulator already saves ── */
  function num(k) { try { return parseInt(localStorage.getItem(k), 10) || 0; } catch (e) { return 0; } }
  function done(m) {
    if (C.key === 'ops') {
      var st = {};
      try { st = JSON.parse(localStorage.getItem('ops-platform-state-v2') || '{}'); } catch (e) {}
      if (m.id === 'paths') return Object.keys(st.completedLessons || {}).length;
      if (m.id === 'sims') return Object.keys(st.completedSims || {}).length;
      return 0;
    }
    return Math.min(num('sc_' + C.key + '_' + m.id), m.total || 0);
  }

  var hub, bar;
  function render() {
    var total = 0, got = 0, cur = null;
    C.modes.forEach(function (m) {
      m.got = done(m);
      m.state = m.total ? (m.got >= m.total ? 'done' : 'todo') : (m.got ? 'started' : 'todo');
      if (m.total) { total += m.total; got += m.got; }
      if (!cur && m.state !== 'done') cur = m;
    });
    if (!cur) cur = C.modes[0];
    var pct = total ? Math.round(got / total * 100) : 0;
    var fresh = got === 0 && !C.modes.some(function (m) { return m.got; });
    var ctaText = fresh ? 'Start with the ' + cur.name : (cur.got ? 'Continue: ' + cur.name : 'Next: ' + cur.name);

    hub.innerHTML =
      '<header class="rh-bar">' +
        '<a class="rh-logo" href="../index.html" aria-label="Skill Cloud Academy home"><img src="../assets/img/skillcloud-navlogo.png" alt="Skill Cloud"></a>' +
        '<span class="rh-title">' + C.title.replace('&', '&amp;') + '</span>' +
        '<a class="rh-back" href="../index.html#simulations">Back to Simulations</a>' +
      '</header>' +
      '<section class="rh-hero"><div class="rh-hero-in">' +
        '<div class="rh-photo"><img src="../assets/img/' + C.photo + '" alt=""></div>' +
        '<div class="rh-copy">' +
          '<h1>' + C.title.replace('&', '&amp;') + '</h1>' +
          '<p>' + C.desc + '</p>' +
          (total ? '<div class="rh-progress"><div class="rh-progress-top"><span>Your progress</span><b>' + got + ' of ' + total + ' exercises · ' + pct + '%</b></div>' +
            '<div class="rh-bar-track"><i style="width:' + pct + '%"></i></div></div>' : '') +
          '<button class="rh-cta" type="button" data-open="' + cur.id + '">' + ctaText + ' &rarr;</button>' +
          (fresh ? '<span class="rh-cta-note">' + (C.note || 'Start here: it shows how a whole file moves. The other modules drill its parts.') + '</span>' : '') +
        '</div>' +
      '</div></section>' +
      '<section class="rh-body">' +
        '<div class="rh-head"><h2>Your modules</h2><p>Take them in order. Each one saves your progress as you go.</p></div>' +
        '<ol class="rh-mods">' + C.modes.map(function (m, i) {
          var state = m === cur ? 'current' : (m.state === 'done' ? 'done' : '');
          var tag = m === cur ? (fresh ? 'Start here' : 'Up next') : (m.state === 'done' ? 'Complete' : '');
          var p = m.total ? Math.round(m.got / m.total * 100) : 0;
          return '<li><button class="rh-mod ' + state + '" type="button" data-open="' + m.id + '">' +
            '<span class="rh-node">' + svg(m.state === 'done' ? I.check : I[m.icon], m.state === 'done' ? 3 : 2) + '</span>' +
            '<span class="rh-mod-body">' +
              '<span class="rh-mod-top"><span class="rh-n">Module ' + (i + 1) + '</span>' + (tag ? '<span class="rh-tag">' + tag + '</span>' : '') + '</span>' +
              '<h3>' + m.name + '</h3><p>' + m.desc + '</p>' +
              '<span class="rh-mod-foot">' +
                (m.total ? '<span class="rh-mini"><i style="width:' + p + '%"></i></span><span class="rh-count">' + m.got + ' of ' + m.total + '</span>'
                         : (m.got ? '<span class="rh-count">' + m.got + ' done</span>' : '')) +
                '<span class="rh-go">' + (m === cur ? (m.got ? 'Continue' : 'Start') : (m.state === 'done' ? 'Review' : 'Open')) + ' &rarr;</span>' +
              '</span>' +
            '</span></button></li>';
        }).join('') + '</ol>' +
        (C.extras && C.extras.length ? '<h3 class="rh-extra-h">Also in this simulation</h3><div class="rh-extras">' + C.extras.map(function (x, i) {
          return '<button class="rh-extra" type="button" data-extra="' + i + '"><span class="rh-node">' + svg(I[x.icon]) + '</span><span><b>' + x.name + '</b><span>' + x.desc + '</span></span></button>';
        }).join('') + '</div>' : '') +
      '</section>';
  }

  /* ── on and off ── */
  function on() { render(); document.documentElement.classList.add('hub-on'); document.body.classList.add('hub-on'); document.body.classList.remove('hub-away'); window.scrollTo(0, 0); }
  function off() { document.documentElement.classList.remove('hub-on'); document.body.classList.remove('hub-on'); }
  function away() { document.body.classList.add('hub-away'); }
  function anyOpen() { return !!document.querySelector('.lc-panel.open, .rd-resources-panel.open, iframe.rs-frame.open'); }
  function backSoon() { setTimeout(function () { if (!anyOpen()) on(); }, 0); }

  function start() {
    hub = document.createElement('div');
    hub.id = 'roleHub';
    document.body.appendChild(hub);
    bar = document.createElement('button');
    bar.className = 'rh-overview';
    bar.type = 'button';
    bar.innerHTML = '&larr; Overview';
    bar.onclick = on;
    document.body.appendChild(bar);

    hub.addEventListener('click', function (e) {
      var t = e.target.closest('[data-open],[data-extra]');
      if (!t) return;
      var fn = t.hasAttribute('data-extra') ? C.extras[+t.getAttribute('data-extra')].open
        : C.modes.filter(function (m) { return m.id === t.getAttribute('data-open'); })[0].open;
      off();
      fn();
    });

    /* coming back: the page's own close calls and the shell's Overview */
    ['closePanel'].forEach(function (name) {
      var orig = window[name];
      if (typeof orig !== 'function') return;
      window[name] = function () { var r = orig.apply(this, arguments); backSoon(); return r; };
    });
    var origOpen = window.openPanel;
    if (typeof origOpen === 'function') window.openPanel = function () { off(); document.body.classList.remove('hub-away'); return origOpen.apply(this, arguments); };
    document.addEventListener('click', function (e) {
      if (e.target.closest('#rsNav button[data-sec="home"]')) setTimeout(on, 0);
    });

    /* a simulator that restores itself after a reload keeps the screen */
    setTimeout(function () { if (!anyOpen()) on(); }, C.kind === 'panels' ? 60 : 0);
  }

  /* role-shell builds its rail on DOMContentLoaded; run after it */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  else setTimeout(start, 0);
})();
