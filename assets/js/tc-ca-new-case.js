/* ══════════════════════════════════════════════════════════
   CASE SIMULATOR: Transaction Coordinator, California
   Fictional case: 4827 Rolando Blvd, San Diego, CA 92115
   Seller side (Sofia Reyes, Berkshire Hathaway HomeServices).
   Full TC workflow from listing assignment through close of
   escrow: listing agreement preparation, seller disclosures,
   pre-listing review, offer negotiation, escrow management,
   inspections, appraisal gap, wire fraud, and post-closing.
   Loaded before the page script; uses workflow.js helpers.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* inject decision-modal styles so they work even with cached CSS */
  function ensureStyles() {
    if (document.getElementById('wf-dec-css')) return;
    var s = document.createElement('style');
    s.id = 'wf-dec-css';
    s.textContent =
      '.wf-dec-modal{display:none;position:fixed;inset:0;z-index:410;background:rgba(10,38,71,.65);backdrop-filter:blur(5px);align-items:center;justify-content:center;padding:24px}' +
      '.wf-dec-modal.open{display:flex;animation:rd-fade-up .25s both}' +
      '.wf-dec-modal-inner{background:#fff;border-radius:20px;width:100%;max-width:600px;max-height:88vh;overflow-y:auto;box-shadow:0 30px 90px rgba(10,38,71,.4);padding:34px 30px 28px;position:relative}' +
      '.wf-dec-modal-inner h3{font-size:17.5px;font-weight:800;color:var(--v-navy);margin:0 0 22px;line-height:1.45;letter-spacing:-.2px}' +
      '.wf-dec-modal-inner .lc-choice{font-size:14px;border-radius:12px;padding:13px 16px;margin-bottom:10px;border:1.5px solid var(--v-line);transition:all .15s}' +
      '.wf-dec-modal-inner .lc-choice:hover{border-color:var(--v-blue,#1565c0);background:#f4f8fc;transform:translateY(-1px)}' +
      '.wf-dec-modal-close{position:absolute;top:16px;right:20px;background:none;border:none;font-size:24px;line-height:1;color:var(--v-muted);cursor:pointer;z-index:2;transition:color .15s}' +
      '.wf-dec-modal-close:hover{color:var(--v-ink)}' +
      '.wf-dec-trigger{display:flex;align-items:center;gap:14px;background:#fff;border:1.5px solid var(--v-line);border-left:4px solid var(--v-gold,#e0a93b);border-radius:14px;padding:16px 18px;cursor:pointer;transition:all .2s;margin-bottom:18px;box-shadow:0 2px 10px rgba(10,38,71,.03)}' +
      '.wf-dec-trigger:hover{border-color:var(--v-gold,#e0a93b);box-shadow:0 6px 20px rgba(224,169,59,.18);transform:translateY(-1px)}' +
      '.wf-dec-trigger-icon{flex-shrink:0;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800}' +
      '.wf-dec-trigger-icon.pending{background:rgba(224,169,59,.12);color:#b8860b}' +
      '.wf-dec-trigger-icon.correct{background:rgba(31,158,90,.12);color:#1f9e5a}' +
      '.wf-dec-trigger-icon.wrong{background:rgba(210,69,47,.12);color:#d2452f}' +
      '.wf-dec-trigger-text{flex:1;min-width:0}' +
      '.wf-dec-trigger-label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px}' +
      '.wf-dec-trigger-label.pending{color:#b8860b}' +
      '.wf-dec-trigger-label.correct{color:#1f9e5a}' +
      '.wf-dec-trigger-label.wrong{color:#d2452f}' +
      '.wf-dec-trigger-q{font-size:14px;font-weight:600;color:var(--v-ink);line-height:1.45;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}' +
      '.wf-dec-trigger-arrow{flex-shrink:0;font-size:18px;color:var(--v-muted)}' +
      '.wf-dec-trigger.answered{cursor:default;border-left-color:var(--good,#1f9e5a)}' +
      '.wf-dec-trigger.answered:hover{border-color:var(--v-line);border-left-color:var(--good,#1f9e5a);box-shadow:none;transform:none}' +
      '.wf-phase{transition:opacity .4s ease}' +
      '.wf-phase-enter{animation:phaseSlideIn 0.4s cubic-bezier(0.25, 1, 0.5, 1) both}' +
      '@keyframes phaseSlideIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}' +
      '.wf-phase-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--v-blue,#1565c0),var(--v-cyan,#17c3d4));color:#fff;border:none;border-radius:10px;padding:11px 24px;font-size:14px;font-weight:700;cursor:pointer;transition:all .15s,transform .1s}' +
      '.wf-phase-btn:hover{background:linear-gradient(135deg,#104fa0,var(--v-cyan-d,#0fa6b6));transform:translateY(-1px)}';
    document.head.appendChild(s);
  }
  ensureStyles();

  var DIR = '../assets/docs/tc-ca-new/';
  var DOCS = {
    rla:        ['listing-agreement.pdf', 'Residential Listing Agreement', 'C.A.R. RLA · List Price $889,000 · Sep 24, 2025'],
    ad:         ['agency-disclosure.pdf', 'Agency Disclosure', 'C.A.R. AD · Sofia Reyes / BHHS California Properties'],
    mlsa:       ['mls-addendum.pdf', 'MLS Addendum', 'C.A.R. MLSA · San Diego MLS Authorization'],
    da:         ['dual-agency-disclosure.pdf', 'Dual Agency Disclosure', 'C.A.R. DA · Possible Dual Agency Consent'],
    dia:        ['disclosure-information-advisory.pdf', 'Disclosure Information Advisory', 'C.A.R. DIA · Advisory to Sellers'],
    bca:        ['broker-compensation-advisory.pdf', 'Broker Compensation Advisory', 'C.A.R. BCA · 5% Total / 2.5% Cooperating'],
    fhda:       ['fair-housing-advisory.pdf', 'Fair Housing & Discrimination Advisory', 'C.A.R. FHDA · Federal & State Compliance'],
    sa:         ['sellers-advisory.pdf', 'Sellers Advisory', 'C.A.R. SA · Statewide Seller Advisory'],
    ccpa:       ['ccpa-advisory.pdf', 'CCPA Advisory', 'C.A.R. CCPA · California Consumer Privacy Act'],
    wire:       ['wire-fraud-email-screenshot.pdf', 'Wire Fraud Advisory (WFA)', 'C.A.R. WFA · Signed by Daniel & Carmen Herrera'],
    tds:        ['tds-disclosure.pdf', 'Transfer Disclosure Statement', 'C.A.R. TDS · Completed by Daniel & Carmen Herrera'],
    spq:        ['spq-questionnaire.pdf', 'Seller Property Questionnaire', 'C.A.R. SPQ · Completed by sellers'],
    nhd:        ['nhd-report.pdf', 'Natural Hazard Disclosure', 'JCP-LGS · Seismic Hazard Zone (liquefaction)'],
    avid:       ['avid-inspection.pdf', 'Agent Visual Inspection', 'C.A.R. AVID · Completed by Sofia Reyes, BHHS'],
    lead:       ['lead-paint-disclosure.pdf', 'Lead-Based Paint Disclosure', 'Required · Home built 1961 (pre-1978)'],
    prelim:     ['preliminary-title-report.pdf', 'Preliminary Title Report', 'Chicago Title Company · $1,200 SDG&E Lien'],
    offer:      ['buyer-offer.pdf', "Buyer's Offer (C.A.R. RPA)", 'Marcus Lee for Jason & Michelle Brooks · $840,000'],
    sco:        ['seller-counter-offer.pdf', 'Seller Counter Offer #1', 'C.A.R. SCO · $875,000 · Firm Nov 3 closing'],
    bco:        ['buyer-counter-offer.pdf', 'Buyer Counter Offer #1', 'C.A.R. BCO · $860,000 · Accepted Oct 3, 2025'],
    rpa:        ['purchase-agreement-executed.pdf', 'Executed Purchase Agreement', 'C.A.R. RPA Ratified Package · $860,000'],
    inspect:    ['home-inspection-report.pdf', 'Home Inspection Report', 'Precision Home Inspections · Jerry Sandoval · Oct 14'],
    termite:    ['termite-report.pdf', 'Termite / WDO Report', 'Atlas Pest Control · #WDO-2025-4128 · Oct 15'],
    foundation: ['foundation-assessment.pdf', 'Foundation Specialist Assessment', 'Pacific Foundation Engineering · Oct 17'],
    rr:         ['request-for-repair.pdf', 'Request for Repair (C.A.R. RR)', 'Buyer Request · $12,550 total · Oct 18'],
    sellerRR:   ['seller-response-rr.pdf', 'Seller Response to RR', 'C.A.R. RRR · $4,500 credit counter · Oct 19'],
    amend1:     ['amendment-1-repair-credit.pdf', 'Amendment #1: Repair Credit', '$4,500 credit at closing · Oct 20'],
    appraisal:  ['appraisal-summary.pdf', 'Appraisal Summary Report', 'Western Valuation / Pacific Home Lending · $845,000'],
    extAppr:    ['contingency-extension-appraisal.pdf', 'Appraisal Contingency Extension', 'Extended to Oct 27 · Signed Oct 21'],
    amend2:     ['amendment-2-price-reduction.pdf', 'Amendment #2: Price Reduction', '$860,000 → $852,500 · Signed Oct 25'],
    wireFraud:  ['wire-fraud-email-screenshot.pdf', 'Wire Fraud Email (Training)', 'Spoofed phishing email from "Sarah Nquyen"'],
    settlement: ['settlement-statement.pdf', 'Settlement Statement (ALTA)', 'Chicago Title Company · Sarah Nguyen · Nov 3']
  };

  var ICON_DOC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  var ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
  var ICON_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

  function run() {
    var sc = typeof wfActiveScenario !== 'undefined' ? wfActiveScenario : null;
    if (!sc) return {};
    if (sc._mhFor !== sc._decisions) { sc._mh = {}; sc._mhFor = sc._decisions; }
    return sc._mh;
  }
  function record(ok) {
    var sc = typeof wfActiveScenario !== 'undefined' ? wfActiveScenario : null;
    if (sc && sc._decisions) sc._decisions.push({ correct: !!ok });
    if (document.getElementById('wf-eval-container')) wfRenderFinalScore('wf-eval-container', 'tc', 'ca-new', 10);
  }

  window.caNewOpen = function (key) {
    var d = DOCS[key];
    if (d) {
      wfOpenDoc(DIR + d[0], d[1]);
    }
  };

  var SOFIA_SIG =
    '<div class="wf-sig">' +
      '<div class="wf-sig-valediction">Warm regards,</div>' +
      '<div class="wf-sig-card">' +
        '<div class="wf-sig-primary">' +
          '<div class="wf-sig-brand-block">' +
            '<div class="wf-sig-broker-emblem">' +
              '<span class="wf-sig-emblem-initials">BH</span>' +
              '<span class="wf-sig-emblem-sub">HS</span>' +
            '</div>' +
            '<div class="wf-sig-brand-title">BERKSHIRE HATHAWAY</div>' +
            '<div class="wf-sig-brand-sub">HomeServices</div>' +
            '<div class="wf-sig-brand-loc">California Properties</div>' +
          '</div>' +
          '<div class="wf-sig-divider-v"></div>' +
          '<div class="wf-sig-agent-details">' +
            '<div class="wf-sig-name-row">' +
              '<span class="wf-sig-agent-name">Sofia Reyes</span>' +
              '<span class="wf-sig-badge-realtor">REALTOR&reg;</span>' +
              '<span class="wf-sig-badge-dre">CalDRE #02156789</span>' +
            '</div>' +
            '<div class="wf-sig-title">Senior Listing Specialist &middot; San Diego Coastal Group</div>' +
            '<div class="wf-sig-brokerage-line">Berkshire Hathaway HomeServices California Properties &middot; Broker DRE #01317331</div>' +
            '<div class="wf-sig-contact-grid">' +
              '<div class="wf-sig-contact-item"><span class="wf-sig-icon">&#128222;</span> <strong>Direct:</strong> (619) 555-0312</div>' +
              '<div class="wf-sig-contact-item"><span class="wf-sig-icon">&#9993;</span> <strong>Email:</strong> sofia.reyes@bhhscal.com</div>' +
              '<div class="wf-sig-contact-item"><span class="wf-sig-icon">&#127760;</span> <strong>Web:</strong> bhhscalifornia.com/sofiareyes</div>' +
              '<div class="wf-sig-contact-item"><span class="wf-sig-icon">&#128205;</span> <strong>Office:</strong> 1299 Prospect St, Suite 200, La Jolla, CA 92037</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  window.caNewRevealSideDocs = function (keys) {
    var section = document.querySelector('.mh-docs-section');
    if (!section || typeof section.querySelectorAll !== 'function') return;
    var allBtns = section.querySelectorAll('.mh-doc[data-doc]');
    var vis = 0;
    allBtns.forEach(function (btn) {
      if (keys.indexOf(btn.getAttribute('data-doc')) > -1) {
        btn.style.display = '';
        vis++;
      } else {
        btn.style.display = 'none';
      }
    });
    var countEl = typeof section.querySelector === 'function' ? section.querySelector('.mh-docs-count') : null;
    if (countEl) countEl.textContent = vis;
    if (vis > 0 && section.classList && !section.classList.contains('open')) {
      section.classList.add('open');
    }
  };

  window.caNewDocDragStart = function (ev, docKey) {
    if (ev && ev.dataTransfer) {
      ev.dataTransfer.setData('text/plain', docKey);
      ev.dataTransfer.setData('application/x-doc-key', docKey);
      ev.dataTransfer.effectAllowed = 'copyMove';
    }
    var btn = (ev && ev.currentTarget) ? ev.currentTarget : document.querySelector('.mh-doc[data-doc="' + docKey + '"]');
    if (btn) btn.classList.add('is-dragging');
  };

  window.caNewDocDragEnd = function (ev, docKey) {
    var btns = document.querySelectorAll('.mh-doc');
    btns.forEach(function (b) { b.classList.remove('is-dragging'); });
    var zones = document.querySelectorAll('.wf-ss-dropzone');
    zones.forEach(function (z) { z.classList.remove('drag-over'); });
  };

  var CONTACTS = {
    'sofia': { name: 'Sofia Reyes', role: 'Listing Agent · BHHS California Properties', email: 'sofia.reyes@bhhscal.com', phone: '(619) 555-0312', initials: 'SR' },
    'daniel': { name: 'Daniel Herrera', role: 'Seller', email: 'herrera.family@email.com', phone: '(619) 555-0488', initials: 'DH' },
    'carmen': { name: 'Carmen Herrera', role: 'Seller', email: 'herrera.family@email.com', phone: '(619) 555-0488', initials: 'CH' },
    'marcus': { name: 'Marcus Lee', role: 'Buyer Agent · eXp Realty', email: 'marcus.lee@exprealty.com', phone: '(619) 555-0291', initials: 'ML' },
    'sarah': { name: 'Sarah Nguyen', role: 'Escrow Officer · Chicago Title', email: 'sarah.nguyen@ctt.com', phone: '(619) 555-0144', initials: 'SN' },
    'tyler': { name: 'Tyler Adams', role: 'Loan Officer · Pacific Home Lending', email: 'tyler.adams@pacificlending.com', phone: '(619) 555-0277', initials: 'TA' }
  };

  function side(facts, docs, contacts, hideDocs) {
    var h = '<aside class="mh-side">';
    if (facts && facts.length) {
      h += '<h5>Case file</h5><ul class="mh-facts">';
      facts.forEach(function (f) { h += '<li><span>' + f[0] + '</span><b>' + f[1] + '</b></li>'; });
      h += '</ul>';
    }
    if (docs && docs.length) {
      var initCount = 0;
      var docsHtml = '';

      docs.forEach(function (k) {
        var d = DOCS[k];
        if (!d) return;

        var isHidden = hideDocs;
        if (!isHidden) initCount++;

        var hideStyle = isHidden ? ' style="display:none"' : '';
        var isAssigned = (typeof SS_STATE !== 'undefined' && !!SS_STATE['ca2-ss_' + k]);

        var docCls = 'mh-doc' + (isAssigned ? ' is-assigned' : '');
        var dragAttr = isAssigned ? 'draggable="false"' : 'draggable="true"';

        docsHtml += '<button type="button" class="' + docCls + '" data-doc="' + k + '"' + hideStyle +
          ' ' + dragAttr +
          ' ondragstart="caNewDocDragStart(event, \'' + k + '\')"' +
          ' ondragend="caNewDocDragEnd(event, \'' + k + '\')"' +
          ' onclick="caNewOpen(\'' + k + '\')"' +
          ' title="Drag to SkySlope slot or click to preview ' + esc(d[1]) + '">' +
          ICON_DOC +
          '<span><b>' + d[1] + '</b><small>' + d[2] + '</small></span>' +
          '<span class="mh-doc-assigned-badge" style="display:' + (isAssigned ? 'inline-flex' : 'none') + ';">&#10003; Attached</span>' +
          '</button>';
      });

      h += '<div class="mh-docs-section open">' +
        '<button type="button" class="mh-docs-toggle" onclick="this.parentElement.classList.toggle(\'open\')">' +
          '<h5>Documents <span class="mh-docs-count">' + initCount + '</span></h5>' +
          '<span class="mh-docs-arrow">&#9656;</span>' +
        '</button>' +
        '<div class="mh-docs-list">' + docsHtml + '</div></div>';
    }
    if (contacts && contacts.length) {
      h += '<div class="mh-contacts-section">' +
        '<button type="button" class="mh-contacts-toggle" onclick="this.parentElement.classList.toggle(\'open\')">' +
          '<h5>Contacts</h5>' +
          '<span class="mh-contacts-arrow">&#9656;</span>' +
        '</button>' +
        '<div class="mh-contacts-list">';
      contacts.forEach(function (ck) {
        var c = CONTACTS[ck];
        if (!c) return;
        h += '<div class="mh-contact-card">' +
          '<div class="mh-contact-avatar">' + esc(c.initials || '') + '</div>' +
          '<div class="mh-contact-info">' +
            '<div class="mh-contact-name">' + esc(c.name) + '</div>' +
            '<div class="mh-contact-role">' + esc(c.role) + '</div>' +
            '<div class="mh-contact-links">' +
              '<span class="mh-contact-email" title="Email ' + esc(c.email) + '">' + esc(c.email) + '</span> &middot; ' +
              '<span class="mh-contact-phone">' + esc(c.phone) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      });
      h += '</div></div>';
    }
    return h + '</aside>';
  }

  function phaseTracker(id, phases, activeIndex) {
    var cur = typeof activeIndex === 'number' ? activeIndex : 0;
    var h = '<div class="wf-phase-tracker" id="' + id + '">';
    phases.forEach(function (label, i) {
      var cls = 'wf-pt-item';
      if (i < cur) cls += ' done';
      else if (i === cur) cls += ' active';
      h += '<div class="' + cls + '" data-idx="' + i + '">' +
        '<div class="wf-pt-dot"></div>' +
        '<span class="wf-pt-label">' + esc(label) + '</span>' +
      '</div>';
      if (i < phases.length - 1) h += '<div class="wf-pt-line"></div>';
    });
    return h + '</div>';
  }

  window.caNewUpdateTracker = function (trackerId, activeIndex) {
    var el = document.getElementById(trackerId);
    if (!el) return;
    var items = el.querySelectorAll('.wf-pt-item');
    items.forEach(function (item, i) {
      item.classList.remove('active', 'done');
      if (i < activeIndex) {
        item.classList.add('done');
      } else if (i === activeIndex) {
        item.classList.add('active');
      }
    });
  };

  function step(n, title, date, lead, main, aside, last, deadline) {
    var nav = last === true ? '' : wfNav(n > 1);
    if (last === 'gated') {
      nav = '<div class="wf-nav">' +
        (n > 1 ? '<button class="wf-nav-btn outline" onclick="wfPrev()">&larr; Previous</button>' : '') +
        '<button class="wf-nav-btn primary" onclick="caNewGatedNext()">Continue &rarr;</button></div>';
    }
    var dBar = '';
    if (deadline) {
      dBar = '<div class="wf-deadline-bar' + (deadline.critical ? ' critical' : '') + '">' +
        '<span class="wf-deadline-bar-icon">' + (deadline.critical ? '🚨' : '⚠️') + '</span>' +
        '<div class="wf-deadline-bar-text"><strong>Contingency Deadline:</strong> ' + esc(deadline.text) + '</div>' +
        '<span class="wf-deadline-bar-days">' + esc(deadline.days) + '</span>' +
        '</div>';
    }
    return '<div class="wf-step-wrap">' +
      '<div class="mh-top"><div class="wf-step-label-row">Step ' + n + ': ' + title + '</div></div>' +
      '<p class="mh-lead">' + lead + '</p>' +
      dBar +
      '<div class="mh-grid"><div class="mh-main">' + main + '</div>' + aside + '</div>' +
      nav + '</div>';
  }

  function card(title, sub, body, type) {
    var tAttr = type ? ' data-type="' + type + '"' : '';
    var iconMap = {
      form: '📝',
      decision: '⚖️',
      picker: '☑️',
      compose: '✉️',
      info: 'ℹ️'
    };
    var iconBadge = (type && iconMap[type]) ? '<span class="mh-card-type-icon">' + iconMap[type] + '</span> ' : '';
    return '<div class="mh-card"' + tAttr + '><h4>' + iconBadge + title + '</h4>' + (sub ? '<p class="mh-sub">' + sub + '</p>' : '') + body + '</div>';
  }

  function timeline(items) {
    return '<ul class="mh-tl">' + items.map(function (i) {
      return '<li><span class="d">' + i[0] + '</span><span class="t">' + i[1] + '</span></li>';
    }).join('') + '</ul>';
  }

  /* ---------- decisions (popup modal) ---------- */
  var DEC = {}, DEC_LAST = {};
  window.caNewResetCase = function () {
    DEC_LAST = {};
    SS_STATE = {};
    pendingReveal = null;
    window._caNewSlide0 = 0;
    window._caNewSlide1 = 0;
    window._caNewCurSlide1 = 0;
    window._caNewDeckState1 = null;
  };

  function decision(id, q, choices, fb, opts) {
    var k = 0;
    for (var c = 0; c < id.length; c++) k += id.charCodeAt(c);
    k = k % choices.length;
    choices = choices.slice(k).concat(choices.slice(0, k));
    DEC[id] = { q: q, choices: choices, fb: fb, opts: opts };
    if (opts && opts.mode === 'chat') {
      return '<div id="' + id + '">' + chatDecisionHtml(id) + '</div>';
    }
    return '<div id="' + id + '">' + triggerHtml(id) + '</div>';
  }
  function chatDecisionHtml(id) {
    var d = DEC[id];
    var st = run();
    var a = st['d_' + id];
    if (a !== undefined) {
      return chatDecisionAnsweredHtml(id, a);
    }
    var last = DEC_LAST[id];
    if (last && !last.ok) {
      return chatDecisionAnsweredHtml(id, last.idx);
    }
    var opts = (d && d.opts) || {};
    var initials = opts.initials || 'DH';
    var sender = opts.sender || 'Daniel Herrera';
    var role = opts.role || 'Seller · 4827 Rolando Blvd';

    var optionsHtml = d.choices.map(function (c, i) {
      return '<div class="wf-chat-option" onclick="caNewChatPick(\'' + id + '\',' + i + ')">' +
        '<div class="wf-chat-radio"></div>' +
        '<div class="wf-chat-option-text">' + esc(c.t) + '</div>' +
      '</div>';
    }).join('');

    return '<div class="wf-chat-wrap">' +
      '<div class="wf-chat-tag">&#9878; Decision Point</div>' +
      '<div class="wf-chat-header">' +
        '<div class="wf-chat-avatar">' + esc(initials) + '</div>' +
        '<div class="wf-chat-sender-info">' +
          '<div class="wf-chat-sender">' + esc(sender) + '</div>' +
          '<div class="wf-chat-role">' + esc(role) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="wf-chat-bubble">' +
        '&ldquo;' + esc(d.q) + '&rdquo;' +
      '</div>' +
      '<div class="wf-chat-divider"><span>How do you respond?</span></div>' +
      '<div class="wf-chat-options">' +
        optionsHtml +
      '</div>' +
      '<div style="text-align:center;margin-top:12px;">' +
        '<a href="javascript:void(0)" onclick="caNewAutoDecide(\'' + id + '\')" class="wf-chat-autofill">Skip &rarr; auto-fill correct answer</a>' +
      '</div>' +
    '</div>';
  }
  function chatDecisionAnsweredHtml(id, idx) {
    var d = DEC[id];
    var last = DEC_LAST[id] || { idx: idx, ok: d.choices[idx].ok };
    var opts = (d && d.opts) || {};
    var initials = opts.initials || 'DH';
    var sender = opts.sender || 'Daniel Herrera';
    var role = opts.role || 'Seller · 4827 Rolando Blvd';
    var ok = last.ok;

    var optionsHtml = d.choices.map(function (c, i) {
      var cls = 'wf-chat-option';
      var radioContent = '';
      if (ok) {
        if (i === idx) {
          cls += ' selected correct';
          radioContent = '&#10003;';
        } else {
          cls += ' dimmed';
        }
      } else {
        if (i === idx) {
          cls += ' selected wrong';
          radioContent = '&#10007;';
        } else if (c.ok) {
          cls += ' correct';
          radioContent = '&#10003;';
        } else {
          cls += ' dimmed';
        }
      }
      return '<div class="' + cls + '">' +
        '<div class="wf-chat-radio">' + radioContent + '</div>' +
        '<div class="wf-chat-option-text">' + esc(c.t) + '</div>' +
      '</div>';
    }).join('');

    var feedbackHtml = '';
    if (ok) {
      var nextBtn = '';
      feedbackHtml =
        '<div class="wf-chat-feedback good">' +
          '<div class="wf-chat-feedback-header good">&#10003; Correct</div>' +
          '<div class="wf-chat-feedback-body">' + esc(d.fb) + '</div>' +
          nextBtn +
        '</div>';
    } else {
      feedbackHtml =
        '<div class="wf-chat-feedback bad">' +
          '<div class="wf-chat-feedback-header bad">&#10007; Not quite right</div>' +
          '<div class="wf-chat-feedback-body">' + esc(d.fb) + '</div>' +
          '<div class="wf-chat-feedback-actions">' +
            '<button type="button" class="wf-chat-btn-retry" onclick="caNewChatRetry(\'' + id + '\')">Try Again</button>' +
          '</div>' +
        '</div>';
    }

    return '<div class="wf-chat-wrap">' +
      '<div class="wf-chat-tag">&#9878; Decision Point</div>' +
      '<div class="wf-chat-header">' +
        '<div class="wf-chat-avatar">' + esc(initials) + '</div>' +
        '<div class="wf-chat-sender-info">' +
          '<div class="wf-chat-sender">' + esc(sender) + '</div>' +
          '<div class="wf-chat-role">' + esc(role) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="wf-chat-bubble">' +
        '&ldquo;' + esc(d.q) + '&rdquo;' +
      '</div>' +
      '<div class="wf-chat-divider"><span>How do you respond?</span></div>' +
      '<div class="wf-chat-options">' +
        optionsHtml +
      '</div>' +
      feedbackHtml +
    '</div>';
  }
  window.caNewChatPick = function (id, idx) {
    var st = run(), d = DEC[id];
    if (st['d_' + id] !== undefined) return;
    var ok = d.choices[idx].ok;
    DEC_LAST[id] = { idx: idx, ok: ok };
    if (!st['dc_' + id]) {
      st['dc_' + id] = 1;
      record(ok);
    }
    if (ok) {
      st['d_' + id] = idx;
      if (REVEAL[id]) pendingReveal = REVEAL[id];
      var comp = document.getElementById(id + '-complete');
      if (comp) comp.style.display = 'flex';
      var deckNext = document.getElementById('ca2-s0-deck-next');
      if (deckNext) deckNext.style.display = 'inline-flex';
      if (id === 'ca2-d-price') {
        var err3 = document.getElementById('ca2-slide3-err');
        if (err3) err3.style.display = 'none';
        var err5 = document.getElementById('ca2-slide5-err');
        if (err5) err5.style.display = 'none';
        if (typeof caNewUpdatePills === 'function') caNewUpdatePills();
        setTimeout(function () {
          var targetEl = (typeof document.querySelector === 'function' ? document.querySelector('.wf-chat-btn-continue') : null) || comp || deckNext;
          if (targetEl && targetEl.scrollIntoView) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 150);
      }
    }
    var el = document.getElementById(id);
    if (el) el.innerHTML = chatDecisionAnsweredHtml(id, idx);
    if (typeof wfUpdateScore === 'function') wfUpdateScore();
    if (ok && pendingReveal) {
      var target = pendingReveal;
      pendingReveal = null;
      setTimeout(function () { caNewReveal(target); }, 300);
    }
  };
  window.caNewChatRetry = function (id) {
    delete DEC_LAST[id];
    var el = document.getElementById(id);
    if (el) el.innerHTML = chatDecisionHtml(id);
  };
  function triggerHtml(id) {
    var d = DEC[id], a = run()['d_' + id];
    var answered = a !== undefined;
    var ok = answered && d.choices[a].ok;
    var state = answered ? (ok ? 'correct' : 'wrong') : 'pending';
    var icon = answered ? (ok ? '&#10003;' : '&#10007;') : '?';
    var label = answered ? (ok ? 'Answered correctly' : 'Answered incorrectly') : 'Decision point';
    var click = answered ? '' : ' onclick="caNewOpenDec(\'' + id + '\')"';
    return '<div class="wf-dec-trigger' + (answered ? ' answered' : '') + '"' + click + '>' +
      '<div class="wf-dec-trigger-icon ' + state + '">' + icon + '</div>' +
      '<div class="wf-dec-trigger-text">' +
        '<div class="wf-dec-trigger-label ' + state + '">' + label + '</div>' +
        '<div class="wf-dec-trigger-q">' + esc(d.q) + '</div>' +
      '</div>' +
      (answered ? '' : '<button onclick="event.stopPropagation();caNewAutoDecide(\'' + id + '\')" style="background:#e0e0e0;color:#333;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0">Auto-fill</button>') +
      (answered ? '' : '<span class="wf-dec-trigger-arrow">&#8250;</span>') +
    '</div>';
  }
  function modalHtml(id) {
    var d = DEC[id], last = DEC_LAST[id];
    var h = '<button class="wf-dec-modal-close" onclick="caNewCloseDec()">&times;</button>' +
      '<h3>' + esc(d.q) + '</h3>';
    if (last) {
      d.choices.forEach(function (c, i) {
        var cls = 'lc-choice';
        if (c.ok) cls += ' correct';
        if (i === last.idx && !c.ok) cls += ' wrong';
        h += '<button class="' + cls + '" disabled>' + esc(c.t) + '</button>';
      });
      h += '<div class="lc-fb show ' + (last.ok ? 'good' : 'bad') + '"><strong>' + (last.ok ? 'Correct!' : 'Not quite right.') + '</strong> ' + esc(d.fb) + '</div>';
      if (last.ok) {
        h += '<div style="text-align:center;margin-top:18px"><button style="background:var(--v-cyan);color:#fff;border:none;border-radius:10px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer" onclick="caNewCloseDec()">Continue &rarr;</button></div>';
      } else {
        h += '<div style="text-align:center;margin-top:18px"><button style="background:var(--v-ink);color:#fff;border:none;border-radius:10px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer" onclick="caNewRetryDec(\'' + id + '\')">Try again</button></div>';
      }
    } else {
      d.choices.forEach(function (c, i) {
        h += '<button class="lc-choice" onclick="caNewDecide(\'' + id + '\',' + i + ')">' + esc(c.t) + '</button>';
      });
    }
    return h;
  }
  function ensureModal() {
    if (!document.getElementById('wf-dec-modal')) {
      var m = document.createElement('div');
      m.id = 'wf-dec-modal';
      m.className = 'wf-dec-modal';
      m.innerHTML = '<div class="wf-dec-modal-inner" id="wf-dec-modal-inner"></div>';
      m.addEventListener('click', function (e) { if (e.target === m) caNewCloseDec(); });
      document.body.appendChild(m);
    }
  }
  window.caNewOpenDec = function (id) {
    ensureModal();
    var inner = document.getElementById('wf-dec-modal-inner');
    inner.innerHTML = modalHtml(id);
    inner.dataset.decId = id;
    document.getElementById('wf-dec-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  window.caNewCloseDec = function () {
    var m = document.getElementById('wf-dec-modal');
    if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
    var inner = document.getElementById('wf-dec-modal-inner');
    var decId = inner ? inner.dataset.decId : null;
    if (decId && run()['d_' + decId] !== undefined) {
      var comp = document.getElementById(decId + '-complete');
      if (comp) comp.style.display = 'flex';
    }
    if (pendingReveal) {
      var target = pendingReveal;
      pendingReveal = null;
      setTimeout(function () { caNewReveal(target); }, 300);
    }
  };
  window.caNewAutoDecide = function (id) {
    var d = DEC[id];
    for (var i = 0; i < d.choices.length; i++) {
      if (d.choices[i].ok) {
        if (d.opts && d.opts.mode === 'chat') {
          caNewChatPick(id, i);
        } else {
          caNewDecide(id, i);
          var comp = document.getElementById(id + '-complete');
          if (comp) comp.style.display = 'flex';
          if (pendingReveal) {
            var target = pendingReveal;
            pendingReveal = null;
            caNewReveal(target);
          }
        }
        return;
      }
    }
  };
  window.caNewDecide = function (id, i) {
    var st = run(), d = DEC[id];
    if (st['d_' + id] !== undefined) return;
    var ok = d.choices[i].ok;
    DEC_LAST[id] = { idx: i, ok: ok };
    if (!st['dc_' + id]) { st['dc_' + id] = 1; record(ok); }
    if (ok) {
      st['d_' + id] = i;
      var el = document.getElementById(id);
      if (el) {
        if (d.opts && d.opts.mode === 'chat') {
          el.innerHTML = chatDecisionAnsweredHtml(id, i);
        } else {
          el.innerHTML = triggerHtml(id);
        }
      }
      if (REVEAL[id]) pendingReveal = REVEAL[id];
      var comp = document.getElementById(id + '-complete');
      if (comp) comp.style.display = 'flex';
      if (id === 'ca2-d-price') {
        var err3 = document.getElementById('ca2-slide3-err');
        if (err3) err3.style.display = 'none';
        if (typeof caNewUpdatePills === 'function') caNewUpdatePills();
      }
    }
    var inner = document.getElementById('wf-dec-modal-inner');
    if (inner) inner.innerHTML = modalHtml(id);
    if (typeof wfUpdateScore === 'function') wfUpdateScore();
  };
  window.caNewRetryDec = function (id) {
    delete DEC_LAST[id];
    var inner = document.getElementById('wf-dec-modal-inner');
    if (inner) inner.innerHTML = modalHtml(id);
  };

  /* ---------- fill in forms ---------- */
  var FORMS = {};
  function norm(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9$%,.]/g, ''); }
  function toMoney(v) {
    var s = String(v || '').replace(/[^0-9.]/g, '');
    return s === '' ? NaN : parseFloat(s);
  }
  function toDate(v) {
    v = String(v || '').trim().toLowerCase();
    var MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
    if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    m = /(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{2,4})/.exec(v);
    if (m) { var y = +m[3]; if (y < 100) y += 2000; return y + '-' + pad(+m[1]) + '-' + pad(+m[2]); }
    m = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/.exec(v);
    if (m) return (m[3] || '2025') + '-' + pad(MONTHS[m[1]]) + '-' + pad(+m[2]);
    return '';
  }

  function isRight(row, val) {
    if (row.kind === 'select') return val === row.ans;
    if (row.kind === 'date') return toDate(val) === row.ans;
    if (row.kind === 'money') return Math.abs(toMoney(val) - row.ans) < 0.005;
    var n = norm(val);
    if (!n) return false;
    return row.ans.some(function (a) { return n.indexOf(norm(a)) > -1; });
  }

  function form(id, title, sub, rows, opts) {
    opts = opts || {};
    FORMS[id] = rows;
    var st = run();
    var vals = st['v_' + id] || [];
    var res = st['r_' + id];
    var h = '<div class="mh-rows' + (opts.one ? ' one' : '') + '">';
    rows.forEach(function (r, i) {
      var v = vals[i] !== undefined ? vals[i] : '';
      var cls = 'mh-row' + (res ? (res[i] ? ' ok' : ' no') : '');
      h += '<div class="' + cls + '" id="' + id + '-row' + i + '"><label for="' + id + '-' + i + '">' + r.label + (r.hint ? ' <em>' + r.hint + '</em>' : '') + '</label>';
      if (r.kind === 'select') {
        h += '<select id="' + id + '-' + i + '" onchange="caNewSave(\'' + id + '\',' + i + ',this.value)"><option value="">Choose</option>';
        r.options.forEach(function (o) { h += '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; });
        h += '</select>';
      } else {
        h += '<input type="text" id="' + id + '-' + i + '" value="' + esc(v) + '" placeholder="' + (r.ph || '') + '" oninput="caNewSave(\'' + id + '\',' + i + ',this.value)">';
      }
      h += '<span class="mh-ans' + (st['s_' + id] ? ' show' : '') + '">File says: ' + r.show + '</span></div>';
    });
    h += '</div><div class="mh-actions">' +
         '<button class="mh-btn" style="background:#e0e0e0;color:#333" onclick="caNewAutoFill(\'' + id + '\')">Auto-fill</button>' +
         '<span class="mh-result' + (res ? (res.indexOf(false) > -1 ? ' bad' : ' good') : '') + '" id="' + id + '-res">' + resultText(rows, res) + '</span>' +
         '<button class="mh-link" id="' + id + '-show" style="' + (res && res.indexOf(false) > -1 ? '' : 'display:none') + '" onclick="caNewShow(\'' + id + '\')">Show what the file says</button></div>';
    return card(title, sub, h, 'form');
  }
  function resultText(rows, res) {
    if (!res) return '';
    var n = res.filter(Boolean).length;
    return n === rows.length ? 'All ' + n + ' match the file.' : n + ' of ' + rows.length + ' match. Fix the red ones.';
  }
  window.caNewSave = function (id, i, v) {
    var st = run();
    (st['v_' + id] = st['v_' + id] || [])[i] = v;
  };
  window.caNewCheck = function (id) {
    var rows = FORMS[id], st = run();
    var res = rows.map(function (r, i) {
      var el = document.getElementById(id + '-' + i);
      var v = el ? el.value : '';
      caNewSave(id, i, v);
      return isRight(r, v);
    });
    st['r_' + id] = res;
    if (!st['c_' + id]) { st['c_' + id] = 1; record(res.indexOf(false) === -1); }
    res.forEach(function (ok, i) {
      var row = document.getElementById(id + '-row' + i);
      if (row) row.className = 'mh-row ' + (ok ? 'ok' : 'no');
    });
    var out = document.getElementById(id + '-res');
    var all = res.indexOf(false) === -1;
    if (out) { out.textContent = resultText(rows, res); out.className = 'mh-result ' + (all ? 'good' : 'bad'); }
    var show = document.getElementById(id + '-show');
    if (show) show.style.display = all ? 'none' : '';
    if (all) {
      var s1Err = document.getElementById('ca2-slide1-err');
      if (s1Err) s1Err.style.display = 'none';
      if (typeof caNewUpdatePills === 'function') caNewUpdatePills();
      var row0 = document.getElementById(id + '-row0');
      if (row0 && row0.closest) {
        var cardEl = row0.closest('.mh-card');
        if (cardEl) {
          cardEl.classList.remove('wf-success-flash');
          void cardEl.offsetWidth;
          cardEl.classList.add('wf-success-flash');
        }
      }
      if (REVEAL[id]) caNewReveal(REVEAL[id]);
    }
    if (typeof wfUpdateScore === 'function') wfUpdateScore();
  };
  window.caNewAutoFill = function (id) {
    var rows = FORMS[id];
    rows.forEach(function (r, i) {
      var el = document.getElementById(id + '-' + i);
      if (!el) return;
      if (r.kind === 'select') { el.value = r.ans; }
      else if (r.kind === 'date') { el.value = r.ans.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3/$1'); }
      else if (r.kind === 'money') { el.value = r.ans; }
      else { el.value = Array.isArray(r.ans) ? r.show.split('(')[0].trim() : r.ans; }
      caNewSave(id, i, el.value);
    });
    caNewCheck(id);
  };
  window.caNewShow = function (id) {
    run()['s_' + id] = 1;
    document.querySelectorAll('[id^="' + id + '-row"] .mh-ans').forEach(function (e) { e.classList.add('show'); });
  };
  window.caNewGatedNext = function () {
    var allOk = true;
    Object.keys(FORMS).forEach(function (id) {
      if (!document.getElementById(id + '-0')) return;
      caNewCheck(id);
      var res = run()['r_' + id];
      if (!res || res.indexOf(false) > -1) allOk = false;
    });
    if (allOk) wfNext();
  };

  /* ---------- chip pickers ---------- */
  var PICKS = {};
  function picker(id, title, sub, items, fb) {
    PICKS[id] = { items: items, fb: fb };
    return card(title, sub, '<div id="' + id + '">' + pickerHtml(id) + '</div>', 'picker');
  }
  function pickerHtml(id) {
    var p = PICKS[id], st = run();
    var on = st['p_' + id] || [];
    var done = st['pd_' + id];
    var h = '<div class="mh-chips' + (done ? ' locked' : '') + '">';
    p.items.forEach(function (it, i) {
      var sel = on.indexOf(i) > -1;
      var cls = 'mh-chip' + (sel ? ' on' : '');
      if (done) cls += (sel === it.ok) ? ' ok' : ' no';
      h += '<button type="button" class="' + cls + '" onclick="caNewToggle(\'' + id + '\',' + i + ')"><i></i><span>' + it.t +
           (it.sub ? '<small>' + it.sub + '</small>' : '') + '</span></button>';
    });
    h += '</div>';
    if (done) {
      var right = p.items.every(function (it, i) { return (on.indexOf(i) > -1) === it.ok; });
      h += '<div class="lc-fb show ' + (right ? 'good' : 'bad') + '" style="margin-top:12px"><strong>' +
           (right ? 'Exactly right.' : 'Green is right, red was picked wrong or missed.') + '</strong> ' + p.fb + '</div>';
      if (!right) {
        h += '<div class="mh-actions" style="margin-top:12px">' +
             '<button class="mh-btn" onclick="caNewRetryPick(\'' + id + '\')">&#8635; Try again</button>' +
             '<button class="mh-btn" style="background:#e0e0e0;color:#333;margin-left:8px" onclick="caNewAutoPick(\'' + id + '\')">&#9889; Auto-fill</button>' +
             '</div>';
      }
    } else {
      h += '<div class="mh-actions"><button class="mh-btn" onclick="caNewPickCheck(\'' + id + '\')">Check</button>' +
           '<button class="mh-btn" style="background:#e0e0e0;color:#333;margin-left:6px" onclick="caNewAutoPick(\'' + id + '\')">Auto-fill</button></div>';
    }
    return h;
  }
  window.caNewRetryPick = function (id) {
    var st = run();
    delete st['pd_' + id];
    var el = document.getElementById(id);
    if (el) el.innerHTML = pickerHtml(id);
    var errEl = document.getElementById('ca2-slide2-err');
    if (errEl) errEl.style.display = 'none';
    if (typeof caNewUpdatePills === 'function') caNewUpdatePills();
  };
  window.caNewToggle = function (id, i) {
    var st = run();
    if (st['pd_' + id]) return;
    var on = st['p_' + id] = st['p_' + id] || [];
    var k = on.indexOf(i);
    if (k > -1) on.splice(k, 1); else on.push(i);
    document.getElementById(id).innerHTML = pickerHtml(id);
  };
  window.caNewAutoPick = function (id) {
    var st = run(), p = PICKS[id];
    st['p_' + id] = [];
    p.items.forEach(function (it, i) { if (it.ok) st['p_' + id].push(i); });
    document.getElementById(id).innerHTML = pickerHtml(id);
    caNewPickCheck(id);
  };
  window.caNewPickCheck = function (id) {
    var st = run(), p = PICKS[id], on = st['p_' + id] || [];
    st['pd_' + id] = 1;
    var right = p.items.every(function (it, i) { return (on.indexOf(i) > -1) === it.ok; });
    record(right);
    document.getElementById(id).innerHTML = pickerHtml(id);
    if (right) {
      var s2Err = document.getElementById('ca2-slide2-err');
      if (s2Err) s2Err.style.display = 'none';
      var s3Err = document.getElementById('ca2-slide3-err');
      if (s3Err) s3Err.style.display = 'none';
      if (id === 'ca2-p-missing') {
        var s3Next = document.getElementById('ca2-s0-pick-next');
        if (s3Next) {
          s3Next.style.display = 'inline-flex';
          s3Next.classList.add('wf-phase-enter');
        }
      }
      var pEl = document.getElementById(id);
      if (pEl && pEl.closest) {
        var cardEl = pEl.closest('.mh-card');
        if (cardEl) {
          cardEl.classList.remove('wf-success-flash');
          void cardEl.offsetWidth;
          cardEl.classList.add('wf-success-flash');
        }
      }
    }
    if (typeof caNewUpdatePills === 'function') caNewUpdatePills();
    if (REVEAL[id]) caNewReveal(REVEAL[id]);
    if (typeof wfUpdateScore === 'function') wfUpdateScore();
  };

  /* ---------- compose emails ---------- */
  /* ---------- compose emails ---------- */
  var COMPOSE_ANS = {};
  var CASE_DIRECTORY = [
    { key: 'sofia', name: 'Sofia Reyes', role: 'Listing Agent · BHHS California Properties', email: 'sofia.reyes@bhhscal.com', initials: 'SR' },
    { key: 'daniel', name: 'Daniel Herrera', role: 'Seller · Client (Homeowner)', email: 'herrera.family@email.com', initials: 'DH' },
    { key: 'carmen', name: 'Carmen Herrera', role: 'Seller · Client (Homeowner)', email: 'herrera.family@email.com', initials: 'CH' },
    { key: 'sarah', name: 'Sarah Nguyen', role: 'Escrow Officer · Chicago Title', email: 'sarah.nguyen@chicagotitle.com', initials: 'SN' },
    { key: 'marcus', name: 'Marcus Lee', role: 'Buyer Agent · Compass', email: 'marcus.lee@compass.com', initials: 'ML' }
  ];

  window.caNewGetSentEmailHtml = function (toVal, subjVal, sentText) {
    var to = toVal || 'Sofia Reyes <sofia.reyes@bhhscal.com>';
    var subj = subjVal || 'Re: New Listing Assignment: 4827 Rolando Blvd — Need a few details for the RLA';
    var body = sentText || (COMPOSE_ANS['ca2-missing-info'] || '');
    return '<div class="wf-email-card-header sent">' +
      '<div class="wf-email-card-status">' +
        '<div class="wf-email-badge-group">' +
          '<span class="wf-email-type-badge sent">&#128228; Sent Email</span>' +
          '<span class="wf-email-status-pill success">&#10003; Delivered to Sofia Reyes &middot; Logged</span>' +
        '</div>' +
        '<div class="wf-email-time-tag">Mon, Sep 22, 2025 &middot; 10:14 AM</div>' +
      '</div>' +
      '<div class="wf-email-card-profile">' +
        '<div class="wf-email-avatar-wrap">' +
          '<div class="wf-email-avatar tc">TC</div>' +
          '<span class="wf-email-avatar-status"></span>' +
        '</div>' +
        '<div class="wf-email-sender-info">' +
          '<div class="wf-email-sender-line">' +
            '<span class="wf-email-sender-name">You</span>' +
            '<span class="wf-email-sender-addr">&lt;tc@bhhscal.com&gt;</span>' +
            '<span class="wf-email-role-chip">Transaction Coordinator</span>' +
          '</div>' +
          '<div class="wf-email-meta-grid">' +
            '<div class="wf-email-meta-row"><span class="wf-email-meta-lbl">To:</span><span class="wf-email-meta-val">' + to.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></div>' +
            '<div class="wf-email-meta-row"><span class="wf-email-meta-lbl">Subject:</span><span class="wf-email-meta-val"><strong>' + subj.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</strong></span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="wf-email-card-body sent">' +
      '<pre class="wf-thread-sent-text">' + body.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>' +
    '</div>';
  };

  window.caNewShowContacts = function (key, field) {
    caNewFilterContacts(key, field);
  };

  window.caNewFilterContacts = function (key, field) {
    var input = document.getElementById('wf-' + key + '-' + field);
    var drop = document.getElementById('wf-' + key + '-' + field + '-suggestions');
    if (!input || !drop) return;

    var q = (input.value || '').trim().toLowerCase();
    var filtered = CASE_DIRECTORY.filter(function (c) {
      if (!q) return true;
      return c.name.toLowerCase().indexOf(q) !== -1 ||
             c.email.toLowerCase().indexOf(q) !== -1 ||
             c.role.toLowerCase().indexOf(q) !== -1;
    });

    if (filtered.length === 0) {
      drop.innerHTML = '<div style="padding:10px 12px;font-size:12px;color:var(--v-muted);">No matching contacts</div>';
      drop.style.display = 'block';
      return;
    }

    var html = '';
    filtered.forEach(function (c) {
      var escName = esc(c.name);
      var escEmail = esc(c.email);
      html += '<div class="wf-contact-option" onmousedown="caNewSelectContact(\'' + key + '\', \'' + field + '\', \'' + c.name.replace(/'/g, "\\'") + '\', \'' + c.email.replace(/'/g, "\\'") + '\')">' +
        '<div class="wf-contact-opt-avatar">' + c.initials + '</div>' +
        '<div class="wf-contact-opt-info">' +
          '<div class="wf-contact-opt-name">' + escName + ' <span class="wf-contact-opt-role">(' + esc(c.role) + ')</span></div>' +
          '<div class="wf-contact-opt-email">' + escEmail + '</div>' +
        '</div>' +
      '</div>';
    });

    drop.innerHTML = html;
    drop.style.display = 'block';
  };

  window.caNewSelectContact = function (key, field, name, email) {
    var input = document.getElementById('wf-' + key + '-' + field);
    var drop = document.getElementById('wf-' + key + '-' + field + '-suggestions');
    if (input) {
      input.value = name + ' <' + email + '>';
    }
    if (drop) {
      drop.style.display = 'none';
    }
    var statusEl = document.getElementById('wf-' + key + '-body-status');
    if (statusEl) statusEl.innerHTML = '';
  };

  window.caNewHideContacts = function (key, field) {
    setTimeout(function () {
      var drop = document.getElementById('wf-' + key + '-' + field + '-suggestions');
      if (drop) drop.style.display = 'none';
    }, 200);
  };

  function compose(o) {
    if (o.ans) COMPOSE_ANS[o.key] = o.ans;
    var isInteractive = !!o.interactiveRecipients || o.key === 'ca2-missing-info';

    var toHtml = isInteractive
      ? '<div class="wf-compose-field wf-compose-field-interactive">' +
          '<span class="wf-compose-lbl">To:</span>' +
          '<input type="text" id="wf-' + o.key + '-to" class="wf-compose-input-interactive" placeholder="Type contact name or email (e.g. Sofia)..." autocomplete="off" oninput="caNewFilterContacts(\'' + o.key + '\', \'to\')" onfocus="caNewShowContacts(\'' + o.key + '\', \'to\')" onblur="caNewHideContacts(\'' + o.key + '\', \'to\')">' +
          '<div id="wf-' + o.key + '-to-suggestions" class="wf-contact-dropdown" style="display:none;"></div>' +
        '</div>'
      : '<div class="wf-compose-field"><span class="wf-compose-lbl">To:</span><div class="wf-compose-chip-wrap"><span class="wf-compose-chip">' + esc(o.to) + '</span></div></div>';

    var ccHtml = isInteractive
      ? '<div class="wf-compose-field wf-compose-field-interactive">' +
          '<span class="wf-compose-lbl">CC:</span>' +
          '<input type="text" id="wf-' + o.key + '-cc" class="wf-compose-input-interactive" placeholder="Optional CC (leave empty if internal)..." autocomplete="off" oninput="caNewFilterContacts(\'' + o.key + '\', \'cc\')" onfocus="caNewShowContacts(\'' + o.key + '\', \'cc\')" onblur="caNewHideContacts(\'' + o.key + '\', \'cc\')">' +
          '<div id="wf-' + o.key + '-cc-suggestions" class="wf-contact-dropdown" style="display:none;"></div>' +
        '</div>'
      : (o.cc ? '<div class="wf-compose-field"><span class="wf-compose-lbl">CC:</span><div class="wf-compose-chip-wrap"><span class="wf-compose-chip">' + esc(o.cc) + '</span></div></div>' : '');

    var subjHtml = isInteractive
      ? '<div class="wf-compose-field"><span class="wf-compose-lbl">Subject:</span><input type="text" id="wf-' + o.key + '-subj" class="wf-compose-input-interactive" value="" placeholder="Enter clear, professional subject line (e.g. 4827 Rolando Blvd — RLA Details)..."></div>'
      : '<div class="wf-compose-field"><span class="wf-compose-lbl">Subject:</span><input type="text" id="wf-' + o.key + '-subj" value="' + esc(o.subj) + '"></div>';

    return '<div class="wf-compose">' +
      '<div class="wf-compose-topbar">' +
        '<div class="wf-compose-tab"><span class="wf-compose-dot"></span> New Message &middot; Draft</div>' +
        '<div class="wf-compose-audit-badge">&#128274; Escrow Audit Trail Active</div>' +
      '</div>' +
      '<div class="wf-compose-header">' +
        toHtml +
        ccHtml +
        subjHtml +
      '</div>' +
      (o.attach ? '<div class="mh-attach">' +
        '<div class="mh-attach-lbl">Attachments (' + o.attach.length + '):</div>' +
        o.attach.map(function (a) { return '<span class="mh-attach-chip">&#128206; ' + a + '</span>'; }).join('') +
      '</div>' : '') +
      '<div class="wf-compose-body">' +
        (o.inst ? '<div class="wf-compose-prompt-hint"><strong>TC Task:</strong> ' + o.inst + '</div>' : '') +
        '<textarea id="wf-' + o.key + '-body" placeholder="Draft your professional email here..."></textarea>' +
        '<div class="wf-compose-actions">' +
          '<button type="button" class="wf-compose-submit" id="wf-' + o.key + '-body-btn" onclick="caNewSubmitCompose(\'' + o.key + '\', {textareaId:\'wf-' + o.key + '-body\', statusElId:\'wf-' + o.key + '-body-status\', btnId:\'wf-' + o.key + '-body-btn\', role:\'tc\', scenarioId:\'' + o.scenario + '\', scenarioPrompt:\'' + o.prompt + '\', maxScore:5})">Send &amp; Submit for Grading &rarr;</button>' +
          '<button type="button" class="wf-compose-autofill" onclick="caNewAutoCompose(\'' + o.key + '\')">&#9889; Load TC Standard Draft</button>' +
        '</div>' +
        '<div id="wf-' + o.key + '-body-status" class="small" style="margin-top:8px"></div>' +
      '</div></div>';
  }

  window.caNewAutoCompose = function (key) {
    var ta = document.getElementById('wf-' + key + '-body');
    if (ta) {
      if (COMPOSE_ANS[key]) ta.value = COMPOSE_ANS[key];
      if (typeof ta.removeAttribute === 'function') ta.removeAttribute('readonly');
      ta.readOnly = false;
    }
    var sendBtn = document.getElementById('wf-' + key + '-body-btn');
    if (sendBtn) sendBtn.style.display = '';
    if (key === 'ca2-missing-info') {
      var toInput = document.getElementById('wf-' + key + '-to');
      if (toInput) toInput.value = 'Sofia Reyes <sofia.reyes@bhhscal.com>';
      var ccInput = document.getElementById('wf-' + key + '-cc');
      if (ccInput) ccInput.value = '';
      var subjInput = document.getElementById('wf-' + key + '-subj');
      if (subjInput) subjInput.value = 'Re: New Listing Assignment: 4827 Rolando Blvd — Need a few details for the RLA';
      var statusEl = document.getElementById('wf-' + key + '-body-status');
      if (statusEl) statusEl.innerHTML = '';
      var errEl = document.getElementById('ca2-slide4-err');
      if (errEl) errEl.style.display = 'none';
    }
  };

  window.caNewSubmitCompose = function (key, opts) {
    var ta = document.getElementById(opts.textareaId);
    var text = (ta && ta.value || '').trim();
    var minLen = opts.minLen || 25;
    var statusEl = document.getElementById(opts.statusElId);

    // Validate interactive To / CC / Subject fields if present
    var toEl = document.getElementById('wf-' + key + '-to');
    var ccEl = document.getElementById('wf-' + key + '-cc');
    var subjEl = document.getElementById('wf-' + key + '-subj');

    if (toEl) {
      var toVal = toEl.value.trim();
      var toLower = toVal.toLowerCase();
      if (!toVal) {
        if (statusEl) statusEl.innerHTML = '<div class="wf-compose-err"><strong>&#9888; Recipient Missing:</strong> Please specify who you are sending this email to in the <strong>To:</strong> field.</div>';
        toEl.focus();
        return;
      }
      var isSofia = toLower.indexOf('sofia') !== -1 || toLower.indexOf('sofia.reyes') !== -1 || toLower.indexOf('bhhscal.com') !== -1;
      if (!isSofia) {
        if (statusEl) statusEl.innerHTML = '<div class="wf-compose-err"><strong>&#9888; Incorrect Recipient in "To":</strong> You are clarifying internal listing terms, title vesting, lockbox access, and commission splits. These details must be requested directly from your listing agent, <strong>Sofia Reyes</strong>, not the sellers or third parties.</div>';
        toEl.focus();
        return;
      }
    }

    if (ccEl) {
      var ccVal = ccEl.value.trim();
      if (ccVal.length > 0) {
        if (statusEl) statusEl.innerHTML = '<div class="wf-compose-err"><strong>&#9888; "CC" Field Must Be Empty:</strong> This is an internal TC-to-Agent listing preparation consultation. You should <em>not</em> copy the sellers (Daniel & Carmen Herrera) or third parties while clarifying internal agreement terms with Sofia, as asking about missing commission splits or vesting in front of clients creates confusion before terms are finalized. Please remove the CC recipient(s).</div>';
        ccEl.focus();
        return;
      }
    }

    if (subjEl && toEl) {
      var subjVal = subjEl.value.trim();
      var subjLower = subjVal.toLowerCase();
      if (!subjVal) {
        if (statusEl) statusEl.innerHTML = '<div class="wf-compose-err"><strong>&#9888; Subject Line Missing:</strong> Please enter a clear, professional subject line so Sofia knows which transaction and document this pertains to.</div>';
        subjEl.focus();
        return;
      }
      var hasProperty = subjLower.indexOf('rolando') !== -1 || subjLower.indexOf('4827') !== -1;
      var hasMotive = subjLower.indexOf('rla') !== -1 ||
                      subjLower.indexOf('listing') !== -1 ||
                      subjLower.indexOf('detail') !== -1 ||
                      subjLower.indexOf('agreement') !== -1 ||
                      subjLower.indexOf('missing') !== -1 ||
                      subjLower.indexOf('clarif') !== -1 ||
                      subjLower.indexOf('info') !== -1 ||
                      subjLower.indexOf('term') !== -1 ||
                      subjLower.indexOf('question') !== -1 ||
                      subjLower.indexOf('comp') !== -1;
      if (!hasProperty || !hasMotive) {
        if (statusEl) statusEl.innerHTML = '<div class="wf-compose-err"><strong>&#9888; Incomplete Subject Line:</strong> A professional TC subject line must clearly identify the property (e.g. <em>4827 Rolando Blvd</em>) and the purpose of the email (e.g. <em>RLA Details / Missing Information</em>). Current subject is too vague.</div>';
        subjEl.focus();
        return;
      }
    }

    if (text.length < minLen) {
      if (statusEl) statusEl.innerHTML = '<div class="wf-compose-err"><strong>&#9888; Email Body Incomplete:</strong> Please draft a complete email requesting the 4 missing listing items (buyer agent comp split, title vesting, lockbox authorization, yard sign).</div>';
      if (ta) ta.focus();
      return;
    }

    if (window.SCApp && typeof SCApp.submitEmailStep === 'function') {
      SCApp.submitEmailStep(opts);
    } else {
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--good);font-weight:700;font-size:13px">&#10003; Submitted for grading.</span>';
    }
    var st = run();
    st['c_' + key] = 1;
    if (typeof record === 'function') record(true);
    if (typeof caNewUpdatePills === 'function') caNewUpdatePills();
    if (REVEAL[key]) {
      var targetId = REVEAL[key];
      setTimeout(function () {
        // Transform compose into sent email card
        var composeWrap = document.getElementById('ca2-thread-compose');
        if (composeWrap && key === 'ca2-missing-info') {
          var sentText = (ta && ta.value || '');
          var toVal = (toEl && toEl.value || 'Sofia Reyes <sofia.reyes@bhhscal.com>');
          var subjVal = (subjEl && subjEl.value || 'Re: New Listing Assignment: 4827 Rolando Blvd — Need a few details for the RLA');
          composeWrap.innerHTML = caNewGetSentEmailHtml(toVal, subjVal, sentText);
          composeWrap.className = 'wf-email-card sent';
        }

        var connector = document.getElementById('ca2-thread-connector');
        if (connector) {
          connector.style.display = 'flex';
          connector.classList.add('wf-phase-enter');
        }

        var introBar = document.getElementById('ca2-thread-intro-bar');
        if (introBar && typeof introBar.querySelector === 'function') {
          var introText = introBar.querySelector('.wf-thread-divider-text');
          if (introText) introText.textContent = 'Email thread with Sofia Reyes regarding missing RLA details';
        }

        var targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.style.display = 'block';
          targetEl.classList.add('wf-phase-enter');
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        var bannerEl = document.getElementById('ca2-s0-reply-banner');
        if (bannerEl) {
          bannerEl.style.display = 'flex';
          bannerEl.classList.add('wf-phase-enter');
        }
        var nextBtn = document.getElementById('ca2-s0-info-next');
        if (nextBtn) nextBtn.style.display = 'inline-flex';
      }, 1000);
    }
    if (typeof wfUpdateScore === 'function') wfUpdateScore();
  };

  /* ---------- progressive phase reveal ---------- */
  var REVEAL = {};
  var pendingReveal = null;
  window.caNewReveal = function (id) {
    var el = document.getElementById(id);
    if (!el || el.style.display !== 'none') return;

    if (id === 'ca2-s1-p1') { window._caNewSlide1 = 0; window._caNewCurSlide1 = 0; }
    else if (id === 'ca2-s1-p2') { window._caNewSlide1 = 1; window._caNewCurSlide1 = 1; }
    else if (id === 'ca2-s1-p3') { window._caNewSlide1 = 2; window._caNewCurSlide1 = 2; }
    else if (id === 'ca2-s1-p4') { window._caNewSlide1 = 3; window._caNewCurSlide1 = 3; }

    // Hide ALL sibling phases (both before and after the target)
    var sibling = el.parentNode.firstElementChild;
    while (sibling) {
      if (sibling.classList && sibling.classList.contains('wf-phase') && sibling !== el) {
        sibling.style.display = 'none';
        if (sibling.classList.contains('wf-phase-enter')) sibling.classList.remove('wf-phase-enter');
      }
      sibling = sibling.nextElementSibling;
    }

    // Show the target phase with entrance animation
    el.style.display = '';
    el.classList.add('wf-phase-enter');
    if (typeof caNewUpdateStep1Pills === 'function') caNewUpdateStep1Pills();
    setTimeout(function () {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  /* ---------- Zipforms App Component (Step 2) ---------- */
  var ZF_APPS = {};

  function zipformsLaunchPad(id, items) {
    var st = run();
    var lpDone = !!st['zf_lp_' + id];

    var html = '<div class="wf-zf-launchpad" id="' + id + '-lp"' + (lpDone ? ' style="display:none"' : '') + '>' +
      '<div class="wf-zf-lp-header">' +
        '<h4>Launch Pad &mdash; Select Forms for This Transaction</h4>' +
        '<p>Choose the forms required for a new residential listing. Select only what this transaction needs.</p>' +
      '</div>' +
      '<div class="wf-zf-lp-list">';

    items.forEach(function (item, i) {
      var checked = st['zf_lp_sel_' + id + '_' + i] ? ' checked' : '';
      html += '<label class="wf-zf-lp-item" id="' + id + '-lp-item-' + i + '">' +
        '<input type="checkbox" id="' + id + '-lp-cb-' + i + '"' + checked + ' onchange="caNewZfLpChange(\'' + id + '\')">' +
        '<div class="wf-zf-lp-item-text">' +
          '<strong>' + esc(item.label) + '</strong>' +
          '<span>' + esc(item.sub) + '</span>' +
        '</div>' +
      '</label>';
    });

    html += '</div>' +
      '<div class="wf-zf-lp-footer">' +
        '<div class="wf-zf-lp-err" id="' + id + '-lp-err" style="display:none"></div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;width:100%">' +
          '<button type="button" class="wf-zf-autofill-btn" onclick="caNewZfLpAutoFill(\'' + id + '\')">&#9889; Auto-fill</button>' +
          '<button type="button" class="wf-zf-submit-btn" id="' + id + '-lp-btn" onclick="caNewZfLpSubmit(\'' + id + '\')">Add Selected Forms &rarr;</button>' +
        '</div>' +
      '</div>' +
    '</div>';

    return html;
  }

  window.caNewZfLpAutoFill = function (id) {
    var items = ZF_LAUNCHPAD;
    items.forEach(function (item, i) {
      var cb = document.getElementById(id + '-lp-cb-' + i);
      if (cb) cb.checked = item.ok;
    });
  };

  window.caNewZfLpChange = function (id) {
    var errEl = document.getElementById(id + '-lp-err');
    if (errEl) errEl.style.display = 'none';
  };

  window.caNewZfLpSubmit = function (id) {
    var items = ZF_LAUNCHPAD;
    var errEl = document.getElementById(id + '-lp-err');
    var selected = [];
    var wrongPicks = [];

    items.forEach(function (item, i) {
      var cb = document.getElementById(id + '-lp-cb-' + i);
      var isChecked = cb && cb.checked;
      run()['zf_lp_sel_' + id + '_' + i] = isChecked;
      if (isChecked) selected.push(i);
      if (isChecked && !item.ok) wrongPicks.push(item.label);
      if (!isChecked && item.ok) wrongPicks.push(item.label + ' (missing)');
    });

    if (wrongPicks.length > 0) {
      if (errEl) {
        errEl.innerHTML = '<strong>&#9888; Incorrect selection:</strong> Review which forms are needed for a listing transaction. ' +
          'The RPA is a buyer-side form, the CO is for offer negotiation, and the SBSA is typically delivered later. ' +
          'A listing needs: the RLA (employment contract), AD (agency disclosure), and Wire Fraud Advisory (brokerage compliance).';
        errEl.style.display = 'block';
        errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    run()['zf_lp_' + id] = true;
    var lpEl = document.getElementById(id + '-lp');
    if (lpEl) lpEl.style.display = 'none';
    var formEl = document.getElementById(id + '-form-area');
    if (formEl) { formEl.style.display = ''; formEl.classList.add('wf-phase-enter'); }
  };

  function zipformsTemplateModal(id, sections) {
    return '<div class="zf-modal-overlay" id="' + id + '-modal" style="display:none;" onclick="if(event.target===this) caNewZfCloseModal(\'' + id + '\')">' +
      '<div class="zf-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="' + id + '-modal-title">' +
        '<div class="zf-modal-header">' +
          '<div class="zf-modal-header-left">' +
            '<span class="zf-modal-logo-badge">ZF+</span>' +
            '<div>' +
              '<div class="zf-modal-title" id="' + id + '-modal-title">ZipForm&reg; Plus &mdash; Template &amp; Fast Fill Center</div>' +
              '<div class="zf-modal-subtitle">4827 Rolando Blvd, San Diego &middot; C.A.R. Form RLA (Rev. 12/22)</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="zf-modal-close-btn" onclick="caNewZfCloseModal(\'' + id + '\')" aria-label="Close dialog">&times;</button>' +
        '</div>' +
        '<div class="zf-modal-tabs">' +
          '<button type="button" class="zf-modal-tab active" id="' + id + '-tab-btn-template" onclick="caNewZfSwitchModalTab(\'' + id + '\', \'template\')">&#128203; 1. Apply Brokerage Template</button>' +
          '<button type="button" class="zf-modal-tab" id="' + id + '-tab-btn-fastfill" onclick="caNewZfSwitchModalTab(\'' + id + '\', \'fastfill\')">&#9889; 2. Fast Fill &amp; Cover Sheet</button>' +
        '</div>' +
        '<div class="zf-modal-body">' +
          '<!-- TAB 1: APPLY TEMPLATE -->' +
          '<div id="' + id + '-tab-content-template">' +
            '<div style="font-size:13px;color:#475569;margin-bottom:14px;">' +
              'Select a pre-configured brokerage listing template to auto-populate default legal terms, DRE licenses, dispute resolution clauses, and commission splits directly into the C.A.R. Form RLA.' +
            '</div>' +
            '<div class="zf-template-card">' +
              '<div class="zf-template-card-header">' +
                '<div class="zf-template-title-wrap">' +
                  '<div class="zf-template-radio"></div>' +
                  '<div class="zf-template-title">BHHS California &mdash; Standard Residential Listing Package</div>' +
                '</div>' +
                '<span class="zf-template-badge">Office Template &middot; Active</span>' +
              '</div>' +
              '<div class="zf-template-desc">' +
                'Standard California listing package for single-family residential transactions. Automatically pre-configures Berkshire Hathaway HomeServices California Properties (CalDRE #01317331), Sofia Reyes (CalDRE #02156789), 5.0% total commission (2.5% BAC), mediation and arbitration dispute resolution, and statutory C.A.R. compliance terms.' +
              '</div>' +
              '<div class="zf-template-features-grid">' +
                '<div class="zf-template-feature-item"><span class="chk">&#10003;</span> Listing Representation: Exclusive Right to Sell</div>' +
                '<div class="zf-template-feature-item"><span class="chk">&#10003;</span> Compensation: 5.0% Total (2.5% Buyer Agent)</div>' +
                '<div class="zf-template-feature-item"><span class="chk">&#10003;</span> Listing Period: 09/24/2025 to 03/24/2026</div>' +
                '<div class="zf-template-feature-item"><span class="chk">&#10003;</span> Lockbox &amp; MLS Marketing: Authorized</div>' +
                '<div class="zf-template-feature-item"><span class="chk">&#10003;</span> Dispute Resolution: Mediation &amp; Arbitration</div>' +
                '<div class="zf-template-feature-item"><span class="chk">&#10003;</span> Included: Refrigerator, washer, dryer</div>' +
                '<div class="zf-template-feature-item" style="grid-column: 1 / -1;"><span class="chk">&#10003;</span> Fixture Exclusion: Antique dining room chandelier (Carmen Herrera)</div>' +
              '</div>' +
            '</div>' +
            '<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 14px;font-size:12.5px;color:#92400e;display:flex;gap:8px;align-items:flex-start;">' +
              '<span style="font-size:15px;line-height:1;">&#9888;</span>' +
              '<div><strong>TC Notice:</strong> Applying this template will populate all required fields on the C.A.R. Form RLA contract canvas in the background and activate electronic DocuSign signing.</div>' +
            '</div>' +
          '</div>' +
          '<!-- TAB 2: FAST FILL -->' +
          '<div id="' + id + '-tab-content-fastfill" style="display:none;">' +
            '<div style="font-size:13px;color:#475569;margin-bottom:14px;">' +
              'Review or fine-tune transaction data before cascading it to the contract. All fields cascade live into C.A.R. Form RLA clauses.' +
            '</div>' +
            '<div class="zf-fastfill-sec-title">&#128205; Property &amp; Title Information</div>' +
            '<div class="zf-fastfill-grid">' +
              '<div class="zf-fastfill-field full">' +
                '<label class="zf-fastfill-label">Property Address</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-address" value="4827 Rolando Blvd, San Diego, CA 92115" placeholder="Address">' +
              '</div>' +
              '<div class="zf-fastfill-field">' +
                '<label class="zf-fastfill-label">Assessor\'s Parcel No. (APN)</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-apn" value="470-362-18-00" placeholder="APN">' +
              '</div>' +
              '<div class="zf-fastfill-field">' +
                '<label class="zf-fastfill-label">Property Type</label>' +
                '<select class="zf-fastfill-select" id="' + id + '-ff-proptype">' +
                  '<option value="Single Family Residence" selected>Single Family Residence</option>' +
                  '<option value="Condominium">Condominium</option>' +
                  '<option value="Multi-Family">Multi-Family</option>' +
                '</select>' +
              '</div>' +
            '</div>' +
            '<div class="zf-fastfill-sec-title">&#128101; Parties &amp; Brokerage Representation</div>' +
            '<div class="zf-fastfill-grid">' +
              '<div class="zf-fastfill-field">' +
                '<label class="zf-fastfill-label">Seller 1 Legal Name</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-seller1" value="Daniel Herrera">' +
              '</div>' +
              '<div class="zf-fastfill-field">' +
                '<label class="zf-fastfill-label">Seller 2 Legal Name</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-seller2" value="Carmen Herrera">' +
              '</div>' +
              '<div class="zf-fastfill-field">' +
                '<label class="zf-fastfill-label">Listing Brokerage Name</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-broker" value="Berkshire Hathaway HomeServices California Properties">' +
              '</div>' +
              '<div class="zf-fastfill-field">' +
                '<label class="zf-fastfill-label">Broker CalDRE License #</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-broker-dre" value="01317331">' +
              '</div>' +
              '<div class="zf-fastfill-field">' +
                '<label class="zf-fastfill-label">Listing Agent Name</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-agent" value="Sofia Reyes">' +
              '</div>' +
              '<div class="zf-fastfill-field">' +
                '<label class="zf-fastfill-label">Agent CalDRE License #</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-agent-dre" value="02156789">' +
              '</div>' +
            '</div>' +
            '<div class="zf-fastfill-sec-title">&#128197; Listing Period &amp; Financial Terms</div>' +
            '<div class="zf-fastfill-grid">' +
              '<div class="zf-fastfill-field">' +
                '<label class="zf-fastfill-label">Listing Start Date</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-start" value="09/24/2025">' +
              '</div>' +
              '<div class="zf-fastfill-field">' +
                '<label class="zf-fastfill-label">Listing End Date (Expiration)</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-end" value="03/24/2026">' +
              '</div>' +
              '<div class="zf-fastfill-field">' +
                '<label class="zf-fastfill-label">List Price ($)</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-price" value="$889,000">' +
              '</div>' +
              '<div class="zf-fastfill-field">' +
                '<label class="zf-fastfill-label">Total Commission (%)</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-comm" value="5%">' +
              '</div>' +
              '<div class="zf-fastfill-field">' +
                '<label class="zf-fastfill-label">Buyer\'s Broker Split (%)</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-split" value="2.5%">' +
              '</div>' +
              '<div class="zf-fastfill-field">' +
                '<label class="zf-fastfill-label">Listing Representation Type</label>' +
                '<select class="zf-fastfill-select" id="' + id + '-ff-listtype">' +
                  '<option value="Exclusive Right to Sell" selected>Exclusive Right to Sell</option>' +
                  '<option value="Exclusive Agency">Exclusive Agency</option>' +
                '</select>' +
              '</div>' +
            '</div>' +
            '<div class="zf-fastfill-sec-title">&#128230; Personal Property &amp; Fixture Exclusions</div>' +
            '<div class="zf-fastfill-grid">' +
              '<div class="zf-fastfill-field full">' +
                '<label class="zf-fastfill-label">Included Items (Personal Property)</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-included" value="Refrigerator, washer, dryer">' +
              '</div>' +
              '<div class="zf-fastfill-field full">' +
                '<label class="zf-fastfill-label">Excluded Items (Fixtures Not Conveying)</label>' +
                '<input type="text" class="zf-fastfill-input" id="' + id + '-ff-excluded" value="Antique dining room chandelier (family heirloom — seller exclusion)">' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="zf-modal-footer">' +
          '<div class="zf-modal-footer-left">' +
            '<button type="button" class="zf-modal-btn-cancel" onclick="caNewZfCloseModal(\'' + id + '\')">Cancel</button>' +
          '</div>' +
          '<div class="zf-modal-footer-right">' +
            '<button type="button" class="zf-modal-btn-apply" id="' + id + '-btn-apply-action" onclick="caNewZfApplyFromModal(\'' + id + '\')">' +
              '<span>&#9889; Apply Template &amp; Cascade to RLA</span> &rarr;' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function zipformsApp(id, sections) {
    ZF_APPS[id] = { sections: sections };
    var st = run();
    var isSubmitted = !!st['zf_submitted_' + id];
    var lpDone = !!st['zf_lp_' + id];
    var appliedDone = !!st['zf_applied_' + id] || isSubmitted;

    var launchPad = zipformsLaunchPad(id, ZF_LAUNCHPAD);

    function renderDocField(secIdx, fIdx, w) {
      var f = sections[secIdx].fields[fIdx];
      var fieldInputId = id + '-' + secIdx + '-' + fIdx;
      var val = st['zf_val_' + fieldInputId] || '';
      var isValidInitial = val ? f.validate(val) : false;
      var style = w ? ' style="width:' + w + 'px;"' : '';
      var out = '<span class="zf-inline-wrap' + (isValidInitial ? ' is-valid' : '') + '" id="' + fieldInputId + '-wrap">';
      if (f.type === 'select') {
        out += '<select class="zf-inline-select" id="' + fieldInputId + '"' + style + ' onblur="caNewZfValidateField(\'' + id + '\',' + secIdx + ',' + fIdx + ')" onchange="caNewZfValidateField(\'' + id + '\',' + secIdx + ',' + fIdx + ')">';
        (f.options || []).forEach(function (opt) {
          var optVal = opt[0], optLabel = opt[1];
          out += '<option value="' + esc(optVal) + '"' + (val === optVal ? ' selected' : '') + '>' + esc(optLabel) + '</option>';
        });
        out += '</select>';
      } else {
        out += '<input type="text" class="zf-inline-input" id="' + fieldInputId + '"' + style + ' value="' + esc(val) + '" placeholder="' + esc(f.ph || '') + '" onblur="caNewZfValidateField(\'' + id + '\',' + secIdx + ',' + fIdx + ')">';
      }
      out += '<span class="zf-inline-check">&#10003;</span></span>';
      return out;
    }

    function renderFieldHint(secIdx, fIdx) {
      var f = sections[secIdx].fields[fIdx];
      var fieldInputId = id + '-' + secIdx + '-' + fIdx;
      return '<div class="wf-zf-hint" id="' + fieldInputId + '-hint">' + esc(f.hint) + '</div>';
    }

    var html = '<div class="wf-zf-app" id="' + id + '">' +
      '<div class="wf-zf-body">' +
      launchPad +
      '<div class="wf-zf-form-area" id="' + id + '-form-area"' + (lpDone ? '' : ' style="display:none"') + '>' +
        '<div class="zf-apply-card" id="' + id + '-apply-card"' + (appliedDone ? ' style="display:none"' : '') + '>' +
          '<div class="zf-apply-card-inner">' +
            '<div class="zf-apply-card-badge">ZF+</div>' +
            '<h4 class="zf-apply-card-title">C.A.R. Form RLA &mdash; Residential Listing Agreement</h4>' +
            '<p class="zf-apply-card-prop">4827 Rolando Blvd, San Diego, CA 92115 &middot; Prepared Sep 24, 2025</p>' +
            '<p class="zf-apply-card-desc">Apply the brokerage listing template to auto-populate default legal terms, DRE license numbers, commission splits, and compliance clauses into the C.A.R. Form RLA.</p>' +
            '<div class="zf-apply-card-actions">' +
              '<button type="button" class="zf-apply-card-btn primary" onclick="caNewZfOpenDocFullscreen(\'' + id + '\', false)">&#128203; Open Template</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="' + id + '-doc-full"' + (!appliedDone ? ' style="display:none"' : '') + '>' +
        '<div class="wf-zf-toolbar">' +
          '<div class="wf-zf-toolbar-left">' +
            '<span class="wf-zf-logo">ZF</span>' +
            '<span class="wf-zf-title">ZipForm&reg; Plus &middot; Transaction Setup: 4827 Rolando Blvd &middot; Form: C.A.R. RLA</span>' +
          '</div>' +
          '<div class="wf-zf-toolbar-right" style="display:flex;align-items:center;gap:8px;">' +
            '<button type="button" class="wf-zf-tool-btn primary" id="' + id + '-btn-open-template" onclick="caNewZfAutoFill(\'' + id + '\')">&#9889; Auto-fill</button>' +
            '<span class="wf-zf-status' + (isSubmitted ? ' done' : '') + '" id="' + id + '-status">' +
              (isSubmitted ? '&#10003; Signed &amp; Ratified' : 'Draft &mdash; In Progress') +
            '</span>' +
            '<button type="button" class="zf-doc-close-btn" id="' + id + '-doc-close-btn" onclick="caNewZfCloseDocFullscreen(\'' + id + '\')" title="Close">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="zf-doc-workspace">' +
          '<!-- Left Outline Navigator -->' +
          '<aside class="zf-doc-outline" aria-label="RLA Clause Navigation">' +
            '<div class="zf-outline-header">' +
              '<span>Transaction Setup</span>' +
              '<span class="zf-doc-stat-pill" id="' + id + '-global-stat">0/22 Done</span>' +
            '</div>' +
            '<ul class="zf-outline-list">' +
              '<li class="zf-outline-item active" id="zf-nav-' + id + '-sec-0" onclick="caNewZfScrollTo(\'' + id + '-sec-0\')">' +
                '<span class="zf-outline-dot"></span><span>1. Parties &amp; Broker</span>' +
                '<span class="wf-zf-section-counter" id="' + id + '-cnt-0">(0/' + sections[0].fields.length + ')</span>' +
              '</li>' +
              '<li class="zf-outline-item" id="zf-nav-' + id + '-sec-1" onclick="caNewZfScrollTo(\'' + id + '-sec-1\')">' +
                '<span class="zf-outline-dot"></span><span>1(A). Listing Type</span>' +
                '<span class="wf-zf-section-counter" id="' + id + '-cnt-1">(0/' + sections[1].fields.length + ')</span>' +
              '</li>' +
              '<li class="zf-outline-item" id="zf-nav-' + id + '-sec-2" onclick="caNewZfScrollTo(\'' + id + '-sec-2\')">' +
                '<span class="zf-outline-dot"></span><span>2. Listing Period</span>' +
                '<span class="wf-zf-section-counter" id="' + id + '-cnt-2">(0/' + sections[2].fields.length + ')</span>' +
              '</li>' +
              '<li class="zf-outline-item" id="zf-nav-' + id + '-sec-3" onclick="caNewZfScrollTo(\'' + id + '-sec-3\')">' +
                '<span class="zf-outline-dot"></span><span>3. List Price</span>' +
                '<span class="wf-zf-section-counter" id="' + id + '-cnt-3">(0/' + sections[3].fields.length + ')</span>' +
              '</li>' +
              '<li class="zf-outline-item" id="zf-nav-' + id + '-sec-4" onclick="caNewZfScrollTo(\'' + id + '-sec-4\')">' +
                '<span class="zf-outline-dot"></span><span>4. Compensation</span>' +
                '<span class="wf-zf-section-counter" id="' + id + '-cnt-4">(0/' + sections[4].fields.length + ')</span>' +
              '</li>' +
              '<li class="zf-outline-item" id="zf-nav-' + id + '-sec-5" onclick="caNewZfScrollTo(\'' + id + '-sec-5\')">' +
                '<span class="zf-outline-dot"></span><span>5. Ownership &amp; Vesting</span>' +
                '<span class="wf-zf-section-counter" id="' + id + '-cnt-5">(0/' + sections[5].fields.length + ')</span>' +
              '</li>' +
              '<li class="zf-outline-item" id="zf-nav-' + id + '-sec-6" onclick="caNewZfScrollTo(\'' + id + '-sec-6\')">' +
                '<span class="zf-outline-dot"></span><span>6. Inclusions &amp; Excl.</span>' +
                '<span class="wf-zf-section-counter" id="' + id + '-cnt-6">(0/' + sections[6].fields.length + ')</span>' +
              '</li>' +
              '<li class="zf-outline-item" id="zf-nav-' + id + '-sec-7" onclick="caNewZfScrollTo(\'' + id + '-sec-7\')">' +
                '<span class="zf-outline-dot"></span><span>7. MLS &amp; Marketing</span>' +
                '<span class="wf-zf-section-counter" id="' + id + '-cnt-7">(0/' + sections[7].fields.length + ')</span>' +
              '</li>' +
              '<li class="zf-outline-item" id="zf-nav-' + id + '-sec-8" onclick="caNewZfScrollTo(\'' + id + '-sec-8\')">' +
                '<span class="zf-outline-dot"></span><span>8. Security &amp; Lockbox</span>' +
                '<span class="wf-zf-section-counter" id="' + id + '-cnt-8">(0/' + sections[8].fields.length + ')</span>' +
              '</li>' +
              '<li class="zf-outline-item" onclick="caNewZfScrollTo(\'' + id + '-sec-19\')">' +
                '<span class="zf-outline-dot" style="background:#1f9e5a;"></span><span>19. Dispute Resolution</span>' +
              '</li>' +
              '<li class="zf-outline-item" onclick="caNewZfScrollTo(\'' + id + '-sec-21\')">' +
                '<span class="zf-outline-dot" style="background:#1f9e5a;"></span><span>21. Signatures</span>' +
              '</li>' +
            '</ul>' +
          '</aside>' +

          '<!-- Main Legal Document Sheet -->' +
          '<main class="zf-doc-container">' +
            '<div class="zf-doc-sheet">' +
              '<div class="zf-doc-header">' +
                '<div class="zf-doc-car-brand">' +
                  '<div class="zf-doc-car-logo">' +
                    '<span class="zf-doc-car-icon">C.A.R.</span>' +
                    '<span>CALIFORNIA ASSOCIATION OF REALTORS&reg;</span>' +
                  '</div>' +
                  '<div class="zf-doc-form-code">FORM RLA (REV. 12/22) &middot; PAGE 1 OF 5</div>' +
                '</div>' +
                '<div class="zf-doc-title-box">' +
                  '<div class="zf-doc-title-main">RESIDENTIAL LISTING AGREEMENT</div>' +
                  '<div class="zf-doc-title-sub">(Exclusive Authorization and Right to Sell)</div>' +
                '</div>' +
                '<div class="zf-doc-meta-row">' +
                  '<div><strong>Transaction:</strong> 4827 Rolando Blvd, San Diego, CA 92115</div>' +
                  '<div><strong>Date Prepared:</strong> September 24, 2025</div>' +
                '</div>' +
              '</div>' +

              '<!-- Section 0: Parties, Broker & Property -->' +
              '<div class="zf-doc-section-block" id="' + id + '-sec-0">' +
                '<div class="zf-clause-head">' +
                  '<span class="zf-clause-num">1</span>' +
                  '<span class="zf-clause-title">EXCLUSIVE RIGHT TO SELL &amp; PARTIES</span>' +
                '</div>' +
                '<div class="zf-clause-body">' +
                  'Daniel Herrera and Carmen Herrera (<strong>\'Seller\'</strong>) hereby employs and grants ' +
                  renderDocField(0, 8, 300) + ' (<strong>\'Broker\'</strong>), ' +
                  'CalDRE Lic. #' + renderDocField(0, 9, 105) + ', ' +
                  'represented by associate licensee ' +
                  renderDocField(0, 6, 150) + ' (<strong>\'Agent\'</strong>), ' +
                  'CalDRE Lic. #' + renderDocField(0, 7, 105) + ', ' +
                  'the exclusive and irrevocable right to sell or exchange the real property described below.<br><br>' +
                  'Seller 1 Legal Name: ' + renderDocField(0, 4, 160) + '<br>' +
                  'Seller 2 Legal Name: ' + renderDocField(0, 5, 160) + '<br>' +
                  'Real Property situated in the City of San Diego, County of ' + renderDocField(0, 2, 110) + ', California, commonly known as: ' +
                  renderDocField(0, 0, 310) + ', ' +
                  'Assessor\'s Parcel No. (APN): ' + renderDocField(0, 1, 140) + ', ' +
                  'Property Type classification: ' + renderDocField(0, 3, 210) + '.' +
                '</div>' +
                renderFieldHint(0, 8) + renderFieldHint(0, 9) + renderFieldHint(0, 6) + renderFieldHint(0, 7) +
                renderFieldHint(0, 4) + renderFieldHint(0, 5) + renderFieldHint(0, 2) + renderFieldHint(0, 0) +
                renderFieldHint(0, 1) + renderFieldHint(0, 3) +
              '</div>' +

              '<!-- Section 1: Listing Type -->' +
              '<div class="zf-doc-section-block" id="' + id + '-sec-1">' +
                '<div class="zf-clause-head">' +
                  '<span class="zf-clause-num">1(A)</span>' +
                  '<span class="zf-clause-title">TYPE OF LISTING</span>' +
                '</div>' +
                '<div class="zf-clause-body">' +
                  'Listing Representation Type: ' + renderDocField(1, 0, 210) + '. ' +
                  'Under an Exclusive Right to Sell, Broker is entitled to commission if the property sells during the listing term, regardless of who procured the buyer.' +
                '</div>' +
                renderFieldHint(1, 0) +
              '</div>' +

              '<!-- Section 2: Listing Period -->' +
              '<div class="zf-doc-section-block" id="' + id + '-sec-2">' +
                '<div class="zf-clause-head">' +
                  '<span class="zf-clause-num">2</span>' +
                  '<span class="zf-clause-title">LISTING PERIOD</span>' +
                '</div>' +
                '<div class="zf-clause-body">' +
                  'This Agreement begins on ' + renderDocField(2, 0, 130) + ' (Listing Start Date) ' +
                  'and shall terminate at 11:59 PM on ' + renderDocField(2, 1, 130) + ' (Listing End Date).' +
                '</div>' +
                '<div class="zf-clause-insight">' +
                  '<span class="zf-clause-insight-icon">&#128161;</span>' +
                  '<div><strong>TC Pro-Tip (Cal. B&amp;P 10176f):</strong> California law strictly prohibits listing contracts without a definite, predetermined termination date. Auto-renewing listings or writing "until sold" is illegal in California and subjects the broker to license disciplinary action.</div>' +
                '</div>' +
                renderFieldHint(2, 0) + renderFieldHint(2, 1) +
              '</div>' +

              '<!-- Section 3: List Price -->' +
              '<div class="zf-doc-section-block" id="' + id + '-sec-3">' +
                '<div class="zf-clause-head">' +
                  '<span class="zf-clause-num">3</span>' +
                  '<span class="zf-clause-title">LIST PRICE &amp; TERMS</span>' +
                '</div>' +
                '<div class="zf-clause-body">' +
                  'The listing price shall be: ' + renderDocField(3, 0, 140) + ', payable in Cash, Conventional mortgage financing, or on other terms acceptable to Seller.' +
                '</div>' +
                renderFieldHint(3, 0) +
              '</div>' +

              '<!-- Section 4: Compensation -->' +
              '<div class="zf-doc-section-block" id="' + id + '-sec-4">' +
                '<div class="zf-clause-head">' +
                  '<span class="zf-clause-num">4</span>' +
                  '<span class="zf-clause-title">BROKER COMPENSATION</span>' +
                '</div>' +
                '<div class="zf-clause-body">' +
                  '<em>Notice: The amount or rate of real estate commissions is not fixed by law. They are set by each Broker individually and may be negotiable between Seller and Broker.</em><br><br>' +
                  'Seller agrees to pay Broker total compensation of ' + renderDocField(4, 0, 80) + ' of the listing price (or agreed purchase price).<br>' +
                  'Broker is authorized to offer cooperating broker compensation of ' + renderDocField(4, 1, 90) + ' to buyer\'s broker.' +
                '</div>' +
                '<div class="zf-clause-insight">' +
                  '<span class="zf-clause-insight-icon">&#128161;</span>' +
                  '<div><strong>TC Pro-Tip (Post-NAR Settlement Rules):</strong> Offers of compensation to cooperating brokers are no longer permitted to be displayed on California MLS platforms. Commission agreements between the seller and brokerage must be clearly spelled out in Paragraph 4 and documented in seller disclosures.</div>' +
                '</div>' +
                renderFieldHint(4, 0) + renderFieldHint(4, 1) +
              '</div>' +

              '<!-- Section 5: Ownership & Vesting -->' +
              '<div class="zf-doc-section-block" id="' + id + '-sec-5">' +
                '<div class="zf-clause-head">' +
                  '<span class="zf-clause-num">5</span>' +
                  '<span class="zf-clause-title">OWNERSHIP, TITLE &amp; VESTING</span>' +
                '</div>' +
                '<div class="zf-clause-body">' +
                  'Seller warrants that Seller is the owner and title is currently vested as: ' + renderDocField(5, 0, 180) + '.' +
                '</div>' +
                '<div class="zf-clause-insight">' +
                  '<span class="zf-clause-insight-icon">&#128161;</span>' +
                  '<div><strong>TC Pro-Tip (Title &amp; Vesting):</strong> When title is held as Joint Tenants, both spouses hold undivided equal interests with right of survivorship. As a TC, ensure both Daniel and Carmen Herrera sign all agreements and disclosures. A contract missing one co-owner cannot deliver marketable title.</div>' +
                '</div>' +
                renderFieldHint(5, 0) +
              '</div>' +

              '<!-- Section 6: Inclusions & Exclusions -->' +
              '<div class="zf-doc-section-block" id="' + id + '-sec-6">' +
                '<div class="zf-clause-head">' +
                  '<span class="zf-clause-num">6</span>' +
                  '<span class="zf-clause-title">ITEMS INCLUDED AND EXCLUDED IN SALE</span>' +
                '</div>' +
                '<div class="zf-clause-body">' +
                  '<strong>(a) Inclusions:</strong> All existing fixtures and fittings attached to the property are included in the sale. Specifically INCLUDED personal property: ' +
                  renderDocField(6, 0, 260) + '.<br><br>' +
                  '<strong>(b) Exclusions:</strong> Specifically EXCLUDED fixtures or personal property: ' +
                  renderDocField(6, 1, 280) + '.' +
                '</div>' +
                '<div class="zf-clause-insight">' +
                  '<span class="zf-clause-insight-icon">&#128161;</span>' +
                  '<div><strong>TC Pro-Tip (Fixtures vs Excluded Personal Property):</strong> Lighting fixtures are legally part of real estate. When Carmen Herrera requested to keep her antique chandelier, noting it in Paragraph 6 is critical. A missing exclusion note could legally obligate sellers to leave the heirloom behind!</div>' +
                '</div>' +
                renderFieldHint(6, 0) + renderFieldHint(6, 1) +
              '</div>' +

              '<!-- Section 7: MLS & Marketing -->' +
              '<div class="zf-doc-section-block" id="' + id + '-sec-7">' +
                '<div class="zf-clause-head">' +
                  '<span class="zf-clause-num">7</span>' +
                  '<span class="zf-clause-title">MLS &amp; MARKETING AUTHORIZATION</span>' +
                '</div>' +
                '<div class="zf-clause-body">' +
                  'Broker is authorized to submit this listing to the local MLS: ' + renderDocField(7, 0, 130) + '.<br>' +
                  'Seller authorizes Broker to place a \'For Sale\' / marketing sign on the Property: ' + renderDocField(7, 1, 100) + '.' +
                '</div>' +
                renderFieldHint(7, 0) + renderFieldHint(7, 1) +
              '</div>' +

              '<!-- Section 8: Security & Access -->' +
              '<div class="zf-doc-section-block" id="' + id + '-sec-8">' +
                '<div class="zf-clause-head">' +
                  '<span class="zf-clause-num">8</span>' +
                  '<span class="zf-clause-title">SECURITY &amp; ACCESS (LOCKBOX)</span>' +
                '</div>' +
                '<div class="zf-clause-body">' +
                  'Seller authorizes Broker to install an electronic or combination lockbox on the Property to facilitate authorized real estate agent showings: ' +
                  renderDocField(8, 0, 110) + '.' +
                '</div>' +
                renderFieldHint(8, 0) +
              '</div>' +

              '<!-- Section 19: Dispute Resolution -->' +
              '<div class="zf-doc-section-block" id="' + id + '-sec-19">' +
                '<div class="zf-clause-head">' +
                  '<span class="zf-clause-num">19</span>' +
                  '<span class="zf-clause-title">DISPUTE RESOLUTION (MEDIATION &amp; ARBITRATION)</span>' +
                '</div>' +
                '<div class="zf-clause-body" style="font-size:12px;color:#64748b;">' +
                  'Seller and Broker agree to mediate any dispute or claim arising between them out of this Agreement. If mediation does not resolve the dispute, the parties agree to binding neutral arbitration before the American Arbitration Association or JAMS.<br>' +
                  '<div style="margin-top:8px;font-weight:700;color:#0f172a;">' +
                    'Initialed: Seller 1 <span style="background:#e2e8f0;padding:2px 8px;border-radius:4px;">[ DH ]</span> ' +
                    'Seller 2 <span style="background:#e2e8f0;padding:2px 8px;border-radius:4px;">[ CH ]</span> ' +
                    'Listing Broker <span style="background:#e2e8f0;padding:2px 8px;border-radius:4px;">[ SR ]</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              '<!-- Section 21: Signature Execution -->' +
              '<div class="zf-doc-section-block" id="' + id + '-sec-21">' +
                '<div class="zf-clause-head">' +
                  '<span class="zf-clause-num">21</span>' +
                  '<span class="zf-clause-title">SIGNATURES &amp; RATIFICATION</span>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;">' +
                  '<div>' +
                    '<div style="font-size:11px;color:#64748b;font-weight:700;">SELLER 1:</div>' +
                    '<div style="font-family:\'Courier New\',monospace;font-size:13.5px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #94a3b8;padding:4px 0;">/s/ Daniel Herrera</div>' +
                    '<div style="font-size:10.5px;color:#64748b;margin-top:2px;">Date: 09/24/2025 &middot; Verified DocuSign ID</div>' +
                  '</div>' +
                  '<div>' +
                    '<div style="font-size:11px;color:#64748b;font-weight:700;">SELLER 2:</div>' +
                    '<div style="font-family:\'Courier New\',monospace;font-size:13.5px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #94a3b8;padding:4px 0;">/s/ Carmen Herrera</div>' +
                    '<div style="font-size:10.5px;color:#64748b;margin-top:2px;">Date: 09/24/2025 &middot; Verified DocuSign ID</div>' +
                  '</div>' +
                  '<div>' +
                    '<div style="font-size:11px;color:#64748b;font-weight:700;">LISTING AGENT / BROKER:</div>' +
                    '<div style="font-family:\'Courier New\',monospace;font-size:13.5px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #94a3b8;padding:4px 0;">/s/ Sofia Reyes</div>' +
                    '<div style="font-size:10.5px;color:#64748b;margin-top:2px;">Date: 09/24/2025 &middot; Berkshire Hathaway HomeServices</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              '<!-- Action Bar -->' +
              '<div class="zf-doc-actionbar" id="' + id + '-submit-area">' +
                '<button type="button" class="wf-zf-autofill-btn" id="' + id + '-btn-autofill" onclick="caNewZfAutoFill(\'' + id + '\')">&#9889; Auto-fill from Brokerage Template</button>' +
                '<button type="button" class="wf-zf-submit-btn" id="' + id + '-submit-btn" ' + (isSubmitted ? 'disabled style="display:none;"' : 'disabled') + ' onclick="caNewZfSubmit(\'' + id + '\')">Submit &amp; Send for Signature via DocuSign &rarr;</button>' +
              '</div>' +
              '<div id="' + id + '-progress-wrap" style="display:none;margin-top:16px;">' +
                '<div style="font-size:13px;font-weight:700;color:var(--v-blue);margin-bottom:6px;">Sending RLA to Daniel &amp; Carmen Herrera for electronic signature via DocuSign...</div>' +
                '<div class="wf-zf-docusign-bar"><div class="wf-zf-docusign-fill"></div></div>' +
              '</div>' +
              '<div id="' + id + '-success-banner" class="wf-zf-success-banner" style="display:' + (isSubmitted ? 'block' : 'none') + ';margin-top:16px;">' +
                '&#10003; Listing package (9 documents) sent to Daniel &amp; Carmen Herrera for electronic signature via DocuSign. All signatures received &amp; ratified. Documents ready for SkySlope upload.' +
              '</div>' +
            '</div>' +
          '</main>' +
        '</div>' +
      '</div>' +
      '</div></div></div>' +
      zipformsTemplateModal(id, sections) +
      '<div class="zf-modal-overlay zf-doc-modal-overlay" id="' + id + '-doc-modal" style="display:none;" onclick="if(event.target===this) caNewZfCloseDocFullscreen(\'' + id + '\')">' +
        '<div class="zf-doc-modal-dialog" id="' + id + '-doc-modal-body"></div>' +
      '</div>';

    return html;
  }

  window.caNewZfScrollTo = function (targetId) {
    var el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var list = document.querySelectorAll('.zf-outline-item');
      for (var i = 0; i < list.length; i++) {
        list[i].classList.remove('active');
      }
      var navItem = document.getElementById('zf-nav-' + targetId);
      if (navItem) navItem.classList.add('active');
    }
  };

  window.caNewZfToggleSection = function (id, secIdx) {
    // Keep function signature for backward compatibility
  };

  window.caNewZfOpenModal = function (id, tab) {
    var modal = document.getElementById(id + '-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    caNewZfSwitchModalTab(id, tab || 'template');

    // Pre-fill fast-fill inputs with current document values if present
    var mapping = [
      { ff: id + '-ff-address', target: id + '-0-0' },
      { ff: id + '-ff-apn', target: id + '-0-1' },
      { ff: id + '-ff-proptype', target: id + '-0-3' },
      { ff: id + '-ff-seller1', target: id + '-0-4' },
      { ff: id + '-ff-seller2', target: id + '-0-5' },
      { ff: id + '-ff-broker', target: id + '-0-8' },
      { ff: id + '-ff-broker-dre', target: id + '-0-9' },
      { ff: id + '-ff-agent', target: id + '-0-6' },
      { ff: id + '-ff-agent-dre', target: id + '-0-7' },
      { ff: id + '-ff-listtype', target: id + '-1-0' },
      { ff: id + '-ff-start', target: id + '-2-0' },
      { ff: id + '-ff-end', target: id + '-2-1' },
      { ff: id + '-ff-price', target: id + '-3-0' },
      { ff: id + '-ff-comm', target: id + '-4-0' },
      { ff: id + '-ff-split', target: id + '-4-1' },
      { ff: id + '-ff-included', target: id + '-6-0' },
      { ff: id + '-ff-excluded', target: id + '-6-1' }
    ];

    mapping.forEach(function (m) {
      var targetInput = document.getElementById(m.target);
      var ffInput = document.getElementById(m.ff);
      if (targetInput && ffInput && targetInput.value) {
        ffInput.value = targetInput.value;
      }
    });
  };

  window.caNewZfCloseModal = function (id) {
    var modal = document.getElementById(id + '-modal');
    if (modal) modal.style.display = 'none';
  };

  window.caNewZfSwitchModalTab = function (id, tab) {
    var isTemplate = tab === 'template';
    var tabTemplateBtn = document.getElementById(id + '-tab-btn-template');
    var tabFastFillBtn = document.getElementById(id + '-tab-btn-fastfill');
    var contentTemplate = document.getElementById(id + '-tab-content-template');
    var contentFastFill = document.getElementById(id + '-tab-content-fastfill');
    var actionBtn = document.getElementById(id + '-btn-apply-action');

    if (tabTemplateBtn) {
      if (isTemplate) tabTemplateBtn.classList.add('active');
      else tabTemplateBtn.classList.remove('active');
    }
    if (tabFastFillBtn) {
      if (!isTemplate) tabFastFillBtn.classList.add('active');
      else tabFastFillBtn.classList.remove('active');
    }
    if (contentTemplate) contentTemplate.style.display = isTemplate ? 'block' : 'none';
    if (contentFastFill) contentFastFill.style.display = !isTemplate ? 'block' : 'none';

    if (actionBtn) {
      if (isTemplate) {
        actionBtn.innerHTML = '<span>&#9889; Apply Template &amp; Cascade to RLA</span> &rarr;';
      } else {
        actionBtn.innerHTML = '<span>&#10003; Save &amp; Cascade to RLA</span> &rarr;';
      }
    }
  };

  window.caNewZfApplyFromModal = function (id) {
    var ffActive = false;
    var ffTabContent = document.getElementById(id + '-tab-content-fastfill');
    if (ffTabContent && ffTabContent.style.display !== 'none') {
      ffActive = true;
    }

    if (ffActive) {
      var mapping = [
        { ff: id + '-ff-address', target: id + '-0-0' },
        { ff: id + '-ff-apn', target: id + '-0-1' },
        { ff: id + '-ff-proptype', target: id + '-0-3' },
        { ff: id + '-ff-seller1', target: id + '-0-4' },
        { ff: id + '-ff-seller2', target: id + '-0-5' },
        { ff: id + '-ff-broker', target: id + '-0-8' },
        { ff: id + '-ff-broker-dre', target: id + '-0-9' },
        { ff: id + '-ff-agent', target: id + '-0-6' },
        { ff: id + '-ff-agent-dre', target: id + '-0-7' },
        { ff: id + '-ff-listtype', target: id + '-1-0' },
        { ff: id + '-ff-start', target: id + '-2-0' },
        { ff: id + '-ff-end', target: id + '-2-1' },
        { ff: id + '-ff-price', target: id + '-3-0' },
        { ff: id + '-ff-comm', target: id + '-4-0' },
        { ff: id + '-ff-split', target: id + '-4-1' },
        { ff: id + '-ff-included', target: id + '-6-0' },
        { ff: id + '-ff-excluded', target: id + '-6-1' }
      ];

      mapping.forEach(function (m) {
        var ffInput = document.getElementById(m.ff);
        var targetInput = document.getElementById(m.target);
        if (ffInput && targetInput) {
          targetInput.value = ffInput.value;
        }
      });

      caNewZfAutoFill(id);
    } else {
      caNewZfAutoFill(id);
    }

    caNewZfCloseModal(id);

    run()['zf_applied_' + id] = true;
    var applyCard = document.getElementById(id + '-apply-card');
    if (applyCard) applyCard.style.display = 'none';
    var docFull = document.getElementById(id + '-doc-full');
    if (docFull) { docFull.style.display = ''; docFull.classList.add('wf-phase-enter'); }

    var docArea = document.getElementById(id + '-form-area');
    if (docArea && docArea.scrollIntoView) {
      docArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  window.caNewZfOpenDocFullscreen = function (id, autoFill) {
    var docFull = document.getElementById(id + '-doc-full');
    var modalBody = document.getElementById(id + '-doc-modal-body');
    var modal = document.getElementById(id + '-doc-modal');
    if (!docFull || !modalBody || !modal) return;

    docFull.style.display = '';
    if (autoFill) caNewZfAutoFill(id);

    modalBody.appendChild(docFull);
    var closeBtn = document.getElementById(id + '-doc-close-btn');
    if (closeBtn) closeBtn.style.display = 'flex';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  window.caNewZfCloseDocFullscreen = function (id) {
    var docFull = document.getElementById(id + '-doc-full');
    var modal = document.getElementById(id + '-doc-modal');
    var formArea = document.getElementById(id + '-form-area');
    if (!docFull || !modal) return;

    if (formArea) formArea.appendChild(docFull);

    var closeBtn = document.getElementById(id + '-doc-close-btn');
    if (closeBtn) closeBtn.style.display = '';
    if (!run()['zf_applied_' + id] && !run()['zf_submitted_' + id]) {
      docFull.style.display = 'none';
    }

    modal.style.display = 'none';
    document.body.style.overflow = '';
  };

  window.caNewZfAutoFill = function (id) {
    var app = ZF_APPS[id];
    if (!app) return;
    app.sections.forEach(function (sec, secIdx) {
      sec.fields.forEach(function (f, fIdx) {
        var fieldInputId = id + '-' + secIdx + '-' + fIdx;
        var el = document.getElementById(fieldInputId);
        if (el) {
          if (!el.value || el.value.trim() === '') {
            el.value = f.auto || '';
          }
          caNewZfValidateField(id, secIdx, fIdx);
        }
        var wrap = document.getElementById(fieldInputId + '-wrap');
        if (wrap) {
          wrap.classList.add('zf-cascade-flash');
          setTimeout(function () {
            wrap.classList.remove('zf-cascade-flash');
          }, 1400);
        }
      });
    });

    var modal = document.getElementById(id + '-modal');
    if (modal) modal.style.display = 'none';
  };

  window.caNewZfValidateField = function (id, secIdx, fIdx) {
    var app = ZF_APPS[id];
    if (!app) return false;
    var f = app.sections[secIdx].fields[fIdx];
    var fieldInputId = id + '-' + secIdx + '-' + fIdx;
    var el = document.getElementById(fieldInputId);
    var wrap = document.getElementById(fieldInputId + '-wrap');
    var hint = document.getElementById(fieldInputId + '-hint');
    if (!el || !wrap) return false;

    var val = el.value.trim();
    run()['zf_val_' + fieldInputId] = el.value;

    if (!val) {
      wrap.classList.remove('is-valid', 'is-invalid');
      if (hint) hint.style.display = 'none';
      caNewZfUpdateCounters(id);
      return false;
    }

    var ok = f.validate(val);
    if (ok) {
      wrap.classList.remove('is-invalid');
      wrap.classList.add('is-valid');
      if (hint) hint.style.display = 'none';
    } else {
      wrap.classList.remove('is-valid');
      wrap.classList.add('is-invalid');
      if (hint) hint.style.display = 'block';
    }

    caNewZfUpdateCounters(id);
    return ok;
  };

  window.caNewZfUpdateCounters = function (id) {
    var app = ZF_APPS[id];
    if (!app) return;
    var totalFields = 0;
    var totalValid = 0;

    app.sections.forEach(function (sec, secIdx) {
      var validCount = 0;
      sec.fields.forEach(function (f, fIdx) {
        totalFields++;
        var fieldInputId = id + '-' + secIdx + '-' + fIdx;
        var wrap = document.getElementById(fieldInputId + '-wrap');
        if (wrap && wrap.classList.contains('is-valid')) {
          validCount++;
          totalValid++;
        }
      });

      var cntEl = document.getElementById(id + '-cnt-' + secIdx);
      if (cntEl) {
        cntEl.textContent = '(' + validCount + '/' + sec.fields.length + ')';
        if (validCount === sec.fields.length) {
          cntEl.classList.add('done');
        } else {
          cntEl.classList.remove('done');
        }
      }

      var navItem = document.getElementById('zf-nav-' + id + '-sec-' + secIdx);
      if (navItem) {
        if (validCount === sec.fields.length) {
          navItem.classList.add('done');
        } else {
          navItem.classList.remove('done');
        }
      }
    });

    var globalStat = document.getElementById(id + '-global-stat');
    if (globalStat) {
      globalStat.textContent = totalValid + '/' + totalFields + ' Done';
      if (totalValid === totalFields && totalFields > 0) {
        globalStat.classList.add('done');
      } else {
        globalStat.classList.remove('done');
      }
    }

    var subBtn = document.getElementById(id + '-submit-btn');
    if (subBtn) {
      subBtn.disabled = (totalValid < totalFields);
    }
  };

  window.caNewZfSubmit = function (id) {
    var subBtn = document.getElementById(id + '-submit-btn');
    var progWrap = document.getElementById(id + '-progress-wrap');
    var succBanner = document.getElementById(id + '-success-banner');
    var statusEl = document.getElementById(id + '-status');

    if (subBtn) subBtn.disabled = true;
    if (progWrap) progWrap.style.display = 'block';

    setTimeout(function () {
      if (progWrap) progWrap.style.display = 'none';
      if (succBanner) succBanner.style.display = 'block';
      if (subBtn) subBtn.style.display = 'none';
      if (statusEl) {
        statusEl.className = 'wf-zf-status done';
        statusEl.innerHTML = '&#10003; 9 Documents Signed &amp; Ratified';
      }
      run()['zf_submitted_' + id] = true;
      run()['zf_applied_' + id] = true;
      caNewZfCloseDocFullscreen(id);
      var applyCard = document.getElementById(id + '-apply-card');
      if (applyCard) applyCard.style.display = 'none';
      if (typeof caNewRevealSideDocs === 'function') {
        caNewRevealSideDocs(['ad', 'rla', 'mlsa', 'da', 'dia', 'bca', 'fhda', 'sa', 'ccpa', 'tds', 'nhd', 'wire', 'lead']);
      }
      var zfNext = document.getElementById('ca2-s1-zf-next');
      if (zfNext) zfNext.style.display = 'inline-flex';
      if (typeof caNewUpdateTracker === 'function') caNewUpdateTracker('ca2-s1-tracker', 1);
      if (typeof caNewUpdateStep1Pills === 'function') caNewUpdateStep1Pills();
      if (typeof caNewGoStep1Sub === 'function') {
        caNewGoStep1Sub(1);
      } else if (typeof caNewReveal === 'function') {
        caNewReveal('ca2-s1-p2');
      }
    }, 1500);
  };

  /* ---------- SkySlope App Component (Step 2: Interactive Drag & Drop) ---------- */
  var SS_APPS = {};
  var SS_STATE = {};
  window.SS_STATE = SS_STATE;
  window.caNewSsState = SS_STATE;

  var SS_SLOT_DOC_MAP = {
    'ad': 'ad',
    'rla': 'rla',
    'mlsa': 'mlsa',
    'da': 'da',
    'dia': 'dia',
    'bca': 'bca',
    'fhda': 'fhda',
    'sa': 'sa',
    'ccpa': 'ccpa'
  };

  function caNewGetDocInfo(docKey) {
    var d = DOCS[docKey];
    if (!d) return null;
    return {
      id: docKey,
      name: d[1],
      meta: d[2],
      file: d[0]
    };
  }

  function skyslopeApp(id, listingFields, checklistItems) {
    SS_APPS[id] = { fields: listingFields, checklist: checklistItems };
    var st = run();
    var isSubmitted = !!st['ss_submitted_' + id];
    var isCreated = !!st['ss_created_' + id] || !!SS_STATE[id + '_created'] || isSubmitted;

    var curStage = (window._caNewSsStage !== undefined && window._caNewSsStage !== null)
      ? window._caNewSsStage
      : (isCreated ? 1 : 0);

    var titleText = isCreated
      ? 'SkySlope &middot; Listing File: 4827 Rolando Blvd <span style="font-weight:400;opacity:0.85;">(MLS #SD-2025-48271)</span>'
      : 'SkySlope &middot; Create New Listing File: 4827 Rolando Blvd';

    var statusText = isSubmitted
      ? '&#10003; Submitted for Review'
      : (isCreated ? '&#128193; File Created' : '&#9888; Incomplete');
    var statusCls = isSubmitted
      ? ' done'
      : (isCreated ? ' active' : '');

    var html = '<div class="wf-ss-app" id="' + id + '">' +
      '<div class="wf-ss-toolbar">' +
        '<div class="wf-ss-toolbar-left">' +
          '<span class="wf-ss-logo">SS</span>' +
          '<span class="wf-ss-title" id="' + id + '-title">' + titleText + '</span>' +
        '</div>' +
        '<div class="wf-ss-toolbar-right">' +
          '<span class="wf-ss-status' + statusCls + '" id="' + id + '-status">' + statusText + '</span>' +
        '</div>' +
      '</div>' +
      '<!-- SkySlope Internal Tabs -->' +
      '<div class="wf-ss-tabs" id="' + id + '-tabs">' +
        '<button type="button" class="wf-ss-tab' + (curStage === 0 ? ' active' : '') + '" id="' + id + '-tab-0" onclick="caNewSsSwitchTab(\'' + id + '\', 0)">' +
          '<span class="wf-ss-tab-num">1</span>' +
          '<span>Listing Information</span>' +
        '</button>' +
        '<button type="button" class="wf-ss-tab' + (curStage === 1 ? ' active' : '') + (!isCreated ? ' locked' : '') + '" id="' + id + '-tab-1" onclick="caNewSsSwitchTab(\'' + id + '\', 1)"' + (!isCreated ? ' title="Create listing file first to unlock checklist"' : '') + '>' +
          '<span class="wf-ss-tab-num">2</span>' +
          '<span>Brokerage Compliance Checklist</span>' +
        '</button>' +
      '</div>' +
      '<div class="wf-ss-body">' +

      '<!-- STAGE 0: Listing Information (File Setup) -->' +
      '<div class="wf-ss-stage" id="' + id + '-stage-0" style="display:' + (curStage === 0 ? 'block' : 'none') + ';">' +
        '<div class="wf-ss-part">' +
          '<div class="wf-ss-part-title">1. Listing Information</div>' +
          '<p class="wf-ss-checklist-sub">Enter the ratified listing details from your notes and the executed Residential Listing Agreement to initialize the SkySlope transaction file.</p>' +
          '<div class="wf-ss-fields-grid">';

    listingFields.forEach(function (f, fIdx) {
      var fieldInputId = id + '-f-' + fIdx;
      var val = st['ss_val_' + fieldInputId] || '';
      html += '<div class="wf-zf-field">' +
        '<label for="' + fieldInputId + '">' + esc(f.label) + '</label>' +
        '<div class="wf-zf-input-wrap" id="' + fieldInputId + '-wrap">' +
          '<input type="text" id="' + fieldInputId + '" value="' + esc(val) + '" placeholder="' + esc(f.ph || '') + '" onblur="caNewSsValidateField(\'' + id + '\',' + fIdx + ')">' +
          '<span class="wf-zf-icon">&#10003;</span>' +
        '</div>' +
        '<div class="wf-zf-hint" id="' + fieldInputId + '-hint">' + esc(f.hint) + '</div>' +
      '</div>';
    });

    html += '</div></div>' +
        '<div id="' + id + '-info-err" class="wf-slide-err" style="display:none;margin-top:16px;"></div>' +
        '<div class="wf-ss-submit-area" style="margin-top:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">' +
          '<button type="button" class="wf-ss-autofill-btn" onclick="caNewSsAutoFillFields(\'' + id + '\')">&#9889; Auto-fill Listing Info</button>' +
          '<button type="button" class="wf-nav-btn primary" id="' + id + '-create-btn" onclick="caNewSsCreateListing(\'' + id + '\')">' +
            (isCreated ? 'Update &amp; Open Checklist &rarr;' : 'Create Listing File &amp; Open Checklist &rarr;') +
          '</button>' +
        '</div>' +
      '</div>' +

      '<!-- STAGE 1: Brokerage Compliance Checklist -->' +
      '<div class="wf-ss-stage" id="' + id + '-stage-1" style="display:' + (curStage === 1 ? 'block' : 'none') + ';">' +
        '<div class="wf-ss-part">' +
          '<div class="wf-ss-part-title">2. Brokerage Compliance Checklist &mdash; BHHS California Properties</div>' +
          '<p class="wf-ss-checklist-sub">Drag each signed listing package document from the sidebar <strong>Documents</strong> panel into its corresponding checklist slot. All 9 documents from the Zipforms listing package must be uploaded to complete the brokerage compliance file.</p>' +
          '<div class="wf-ss-checklist-table">';

    checklistItems.forEach(function (item) {
      var rowId = id + '-row-' + item.key;
      var isAttached = !!SS_STATE[id + '_' + item.key];
      var attachedDocKey = SS_STATE[id + '_doc_' + item.key];
      var attachedDoc = attachedDocKey ? caNewGetDocInfo(attachedDocKey) : null;

      html += '<div class="wf-ss-row' + (item.type === 'pending' ? ' pending' : '') + '" id="' + rowId + '" data-slot="' + item.key + '">' +
        '<div style="width:100%">' +
          '<div class="wf-ss-row-main">' +
            '<div class="wf-ss-doc-name">' + esc(item.title) + '</div>' +
            '<div class="wf-ss-doc-status">';

      if (item.type === 'attach') {
        html += '<span class="wf-ss-pill ' + (isAttached ? 'attached' : 'required') + '" id="' + id + '-badge-' + item.key + '">' +
          (isAttached ? '&#10003; Attached' : 'Required') +
        '</span>';
      } else if (item.type === 'pending') {
        html += '<span class="wf-ss-pill pending">Required &mdash; Pending</span>';
      } else if (item.type === 'toggle') {
        html += '<span class="wf-ss-pill applicable" id="' + id + '-badge-' + item.key + '">If Applicable</span>';
      }

      html += '</div>'; // close wf-ss-doc-status

      if (item.type === 'toggle') {
        html += '<div class="wf-ss-doc-action">' +
          '<label class="wf-toggle-switch">' +
            '<input type="checkbox" id="' + id + '-toggle-' + item.key + '" onchange="caNewSsToggle(\'' + id + '\',\'' + item.key + '\')">' +
            '<span class="wf-toggle-slider"></span>' +
          '</label>' +
        '</div>';
      } else if (item.type === 'pending') {
        html += '<div class="wf-ss-doc-action">' +
          '<span class="wf-ss-pending-note">' + esc(item.pendingText || 'Pending') + '</span>' +
        '</div>';
      }

      html += '</div>'; // close wf-ss-row-main

      // Dropzone Area for 'attach' items
      if (item.type === 'attach') {
        html += '<div id="' + id + '-slot-container-' + item.key + '" style="margin-top:6px;">';
        if (isAttached && attachedDoc) {
          html += '<div class="wf-ss-dropzone has-file" id="' + id + '-drop-' + item.key + '">' +
            '<div class="wf-ss-drop-attached">' +
              '<div class="wf-ss-attached-info">' +
                '<span class="wf-ss-attached-icon">&#128196;</span>' +
                '<div>' +
                  '<div class="wf-ss-attached-title">' + esc(attachedDoc.name) + '</div>' +
                  '<div class="wf-ss-attached-meta">' + esc(attachedDoc.meta) + '</div>' +
                '</div>' +
              '</div>' +
              '<button type="button" class="wf-ss-detach-btn" onclick="caNewSsDetach(\'' + id + '\',\'' + item.key + '\')" title="Remove document">&times;</button>' +
            '</div>' +
          '</div>';
        } else {
          html += '<div class="wf-ss-dropzone" id="' + id + '-drop-' + item.key + '" data-slot="' + item.key + '" ' +
            'ondragover="caNewSsDragOver(event)" ' +
            'ondragenter="caNewSsDragEnter(event, \'' + id + '\', \'' + item.key + '\')" ' +
            'ondragleave="caNewSsDragLeave(event, \'' + id + '\', \'' + item.key + '\')" ' +
            'ondrop="caNewSsDrop(event, \'' + id + '\', \'' + item.key + '\')">' +
            '<div class="wf-ss-drop-prompt">' +
              '<div class="wf-ss-drop-prompt-left">' +
                '<span class="wf-ss-drop-icon">&#128229;</span>' +
                '<span>Drag <strong>' + esc(item.title) + '</strong> from sidebar Documents</span>' +
              '</div>' +
              '<button type="button" class="wf-ss-link-btn" onclick="caNewSsAssignPrompt(\'' + id + '\',\'' + item.key + '\')">or click to assign</button>' +
            '</div>' +
          '</div>';
        }
        html += '</div>'; // close slot-container
      }

      html += '</div></div>'; // close row
    });

    html += '</div></div>' + // close checklist-table, wf-ss-part
      '<div id="' + id + '-err" class="wf-slide-err" style="display:none;margin-top:16px;"></div>' +
      '<div class="wf-ss-submit-area" style="margin-top:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<button type="button" class="wf-deck-prev" onclick="caNewSsSwitchTab(\'' + id + '\', 0)">&larr; Review Listing Details</button>' +
          '<button type="button" class="wf-ss-autofill-btn" onclick="caNewSsAutoFillChecklist(\'' + id + '\')">&#9889; Auto-fill Checklist</button>' +
        '</div>' +
        '<button type="button" class="wf-nav-btn primary" id="' + id + '-submit-btn" ' + (isSubmitted ? 'disabled style="display:none;"' : '') + ' onclick="caNewSsSubmit(\'' + id + '\')">Submit Listing File for Review &rarr;</button>' +
      '</div>' +
      '<div id="' + id + '-success-banner" class="wf-ss-success-banner" style="display:' + (isSubmitted ? 'block' : 'none') + ';margin-top:16px;">' +
        '&#10003; Listing file submitted to broker compliance! All 9 listing package documents verified and attached. Pending items (TDS, SPQ, NHD, etc.) will be uploaded in future transaction phases.' +
      '</div>' +
      '</div>' + // close stage-1
      '<!-- Toast Container -->' +
      '<div id="' + id + '-toast" class="wf-ss-toast" style="display:none;"></div>' +
    '</div></div>';

    return html;
  }

  /* ---------- Sidebar Drag & Drop Handlers & Validation ---------- */
  window.caNewSsMarkSidebarDocAssigned = function (docKey, isAssigned) {
    if (typeof document === 'undefined' || !document.querySelector) return;
    var btn = document.querySelector('.mh-doc[data-doc="' + docKey + '"]');
    if (!btn) return;
    if (isAssigned) {
      btn.classList.add('is-assigned');
      btn.setAttribute('draggable', 'false');
      var badge = btn.querySelector('.mh-doc-assigned-badge');
      if (badge) badge.style.display = 'inline-flex';
    } else {
      btn.classList.remove('is-assigned');
      btn.setAttribute('draggable', 'true');
      var badge = btn.querySelector('.mh-doc-assigned-badge');
      if (badge) badge.style.display = 'none';
    }
  };

  window.caNewSsDragStart = function (ev, id, docKey) {
    if (ev && ev.dataTransfer) {
      ev.dataTransfer.setData('text/plain', docKey);
      ev.dataTransfer.setData('application/x-doc-key', docKey);
      ev.dataTransfer.effectAllowed = 'copyMove';
    }
    var card = (ev && ev.currentTarget) ? ev.currentTarget : document.querySelector('.mh-doc[data-doc="' + docKey + '"]');
    if (card) card.classList.add('is-dragging');
  };

  window.caNewSsDragEnd = function (ev, id) {
    var btns = document.querySelectorAll('.mh-doc');
    if (btns) btns.forEach(function (b) { b.classList.remove('is-dragging'); });
    var zones = document.querySelectorAll('.wf-ss-dropzone');
    if (zones) zones.forEach(function (z) { z.classList.remove('drag-over'); });
  };

  window.caNewSsDragOver = function (ev) {
    if (ev) {
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
    }
  };

  window.caNewSsDragEnter = function (ev, id, slotKey) {
    if (ev) ev.preventDefault();
    var dropzone = document.getElementById(id + '-drop-' + slotKey);
    if (dropzone) dropzone.classList.add('drag-over');
  };

  window.caNewSsDragLeave = function (ev, id, slotKey) {
    var dropzone = document.getElementById(id + '-drop-' + slotKey);
    if (dropzone) dropzone.classList.remove('drag-over');
  };

  window.caNewSsDrop = function (ev, id, slotKey) {
    if (ev) {
      ev.preventDefault();
      var docKey = '';
      if (ev.dataTransfer) {
        docKey = ev.dataTransfer.getData('application/x-doc-key') || ev.dataTransfer.getData('text/plain') || '';
      }
      var dropzone = document.getElementById(id + '-drop-' + slotKey);
      if (dropzone) dropzone.classList.remove('drag-over');
      if (docKey) caNewSsAssign(id, slotKey, docKey);
    }
  };

  window.caNewSsAssign = function (id, slotKey, docKey) {

    var dropzone = document.getElementById(id + '-drop-' + slotKey);
    var correctDocKey = SS_SLOT_DOC_MAP[slotKey];

    // Wrong-document check: reject drop with shake and feedback without revealing answer
    if (!correctDocKey || docKey !== correctDocKey) {
      caNewSsShowErrorAnimation(dropzone, "⚠️ That document doesn't belong in this slot. Check which compliance document is needed here.");
      return;
    }

    var docInfo = caNewGetDocInfo(docKey);

    // Success: Attach document!
    SS_STATE[id + '_' + slotKey] = true;
    SS_STATE[id + '_doc_' + slotKey] = docKey;

    // Update Checklist Row Badge
    var badge = document.getElementById(id + '-badge-' + slotKey);
    if (badge) {
      badge.className = 'wf-ss-pill attached';
      badge.innerHTML = '&#10003; Attached';
    }

    // Update Dropzone
    var container = document.getElementById(id + '-slot-container-' + slotKey);
    if (container) {
      container.innerHTML = '<div class="wf-ss-dropzone has-file wf-ss-snap" id="' + id + '-drop-' + slotKey + '">' +
        '<div class="wf-ss-drop-attached">' +
          '<div class="wf-ss-attached-info">' +
            '<span class="wf-ss-attached-icon">&#128196;</span>' +
            '<div>' +
              '<div class="wf-ss-attached-title">' + esc(docInfo ? docInfo.name : docKey) + '</div>' +
              '<div class="wf-ss-attached-meta">' + esc(docInfo ? docInfo.meta : '') + '</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="wf-ss-detach-btn" onclick="caNewSsDetach(\'' + id + '\',\'' + slotKey + '\')" title="Remove document">&times;</button>' +
        '</div>' +
      '</div>';
    }

    // Mark sidebar document as assigned (dim it, add checkmark, non-draggable)
    caNewSsMarkSidebarDocAssigned(docKey, true);

    caNewSsToast('&#10003; Attached: ' + (docInfo ? docInfo.name : docKey) + ' assigned to compliance checklist.', false);

    var errEl = document.getElementById(id + '-err');
    if (errEl) errEl.style.display = 'none';
  };

  window.caNewSsDetach = function (id, slotKey) {
    var docKey = SS_STATE[id + '_doc_' + slotKey];
    delete SS_STATE[id + '_' + slotKey];
    delete SS_STATE[id + '_doc_' + slotKey];

    // Reset Badge
    var badge = document.getElementById(id + '-badge-' + slotKey);
    if (badge) {
      badge.className = 'wf-ss-pill required';
      badge.innerHTML = 'Required';
    }

    // Reset Dropzone
    var container = document.getElementById(id + '-slot-container-' + slotKey);
    if (container) {
      var slotItem = SS_CHECKLIST.find(function (c) { return c.key === slotKey; });
      var slotTitle = slotItem ? slotItem.title : slotKey.toUpperCase();
      container.innerHTML = '<div class="wf-ss-dropzone" id="' + id + '-drop-' + slotKey + '" data-slot="' + slotKey + '" ' +
        'ondragover="caNewSsDragOver(event)" ' +
        'ondragenter="caNewSsDragEnter(event, \'' + id + '\', \'' + slotKey + '\')" ' +
        'ondragleave="caNewSsDragLeave(event, \'' + id + '\', \'' + slotKey + '\')" ' +
        'ondrop="caNewSsDrop(event, \'' + id + '\', \'' + slotKey + '\')">' +
        '<div class="wf-ss-drop-prompt">' +
          '<div class="wf-ss-drop-prompt-left">' +
            '<span class="wf-ss-drop-icon">&#128229;</span>' +
            '<span>Drag <strong>' + esc(slotTitle) + '</strong> from sidebar Documents</span>' +
          '</div>' +
          '<button type="button" class="wf-ss-link-btn" onclick="caNewSsAssignPrompt(\'' + id + '\',\'' + slotKey + '\')">or click to assign</button>' +
        '</div>' +
      '</div>';
    }

    // Reset sidebar document state
    if (docKey) {
      caNewSsMarkSidebarDocAssigned(docKey, false);
    }
  };

  window.caNewSsAssignPrompt = function (id, slotKey) {
    var targetDocKey = SS_SLOT_DOC_MAP[slotKey];
    if (targetDocKey) {
      caNewSsAssign(id, slotKey, targetDocKey);
    }
  };

  window.caNewSsAssignFromCard = function (id, docId) {
    var targetSlot = null;
    for (var k in SS_SLOT_DOC_MAP) {
      if (SS_SLOT_DOC_MAP[k] === docId) targetSlot = k;
    }
    if (targetSlot) {
      caNewSsAssign(id, targetSlot, docId);
    } else {
      caNewSsToast("⚠️ That document doesn't belong in this slot. Check which compliance document is needed here.", true);
    }
  };

  window.caNewSsShowErrorAnimation = function (el, msg) {
    if (el) {
      el.classList.add('wf-ss-shake');
      setTimeout(function () { el.classList.remove('wf-ss-shake'); }, 500);
    }
    caNewSsToast(msg, true);
  };

  window.caNewSsOpenRequestModal = function (id, slotKey) {
    var modal = document.getElementById(id + '-req-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.caNewSsCloseRequestModal = function (id) {
    var modal = document.getElementById(id + '-req-modal');
    if (modal) modal.style.display = 'none';
  };

  window.caNewSsSendRequest = function (id, slotKey) {
    var btn = document.getElementById(id + '-btn-send-req');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Sending email...';
    }

    setTimeout(function () {
      SS_STATE[id + '_wire_requested'] = true;
      caNewSsCloseRequestModal(id);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '&#9993; Send Request to Sofia &rarr;';
      }

      // Update WFA dropzone row
      var container = document.getElementById(id + '-slot-container-wire');
      if (container) {
        container.innerHTML = '<div class="wf-ss-dropzone wf-ss-snap" id="' + id + '-drop-wire" data-slot="wire" ' +
          'ondragover="caNewSsDragOver(event)" ' +
          'ondragenter="caNewSsDragEnter(event, \'' + id + '\', \'wire\')" ' +
          'ondragleave="caNewSsDragLeave(event, \'' + id + '\', \'wire\')" ' +
          'ondrop="caNewSsDrop(event, \'' + id + '\', \'wire\')">' +
          '<div class="wf-ss-drop-prompt">' +
            '<div class="wf-ss-drop-prompt-left">' +
              '<span class="wf-ss-drop-icon">&#128229;</span>' +
              '<span>Drag <strong>Signed WFA PDF</strong> from sidebar here</span>' +
            '</div>' +
            '<button type="button" class="wf-ss-link-btn" onclick="caNewSsAssignPrompt(\'' + id + '\',\'wire\')">or click to assign</button>' +
          '</div>' +
        '</div>';
      }

      // Reveal Wire Fraud Advisory in the sidebar!
      var wireBtn = document.querySelector('.mh-doc[data-doc="wire"]');
      if (wireBtn) {
        wireBtn.style.display = '';
        wireBtn.classList.add('wf-ss-snap');
        var section = document.querySelector('.mh-docs-section');
        if (section) {
          var vis = 0;
          var allBtns = section.querySelectorAll('.mh-doc[data-doc]');
          allBtns.forEach(function (b) { if (b.style.display !== 'none') vis++; });
          var countEl = section.querySelector('.mh-docs-count');
          if (countEl) countEl.textContent = vis;
        }
      }

      caNewSsToast('✉️ New Email from Sofia Reyes: "Attached is the signed Wire Fraud Advisory from Daniel & Carmen Herrera!"', false);
    }, 600);
  };

  window.caNewSsToast = function (msg, isErr) {
    var toast = document.getElementById('ca2-ss-toast');
    if (!toast) return;
    toast.className = 'wf-ss-toast' + (isErr ? ' wf-ss-shake' : '');
    if (isErr) {
      toast.style.borderLeftColor = '#ef4444';
    } else {
      toast.style.borderLeftColor = '#4ade80';
    }
    toast.innerHTML = '<span class="wf-ss-toast-icon">' + (isErr ? '&#9888;' : '&#9993;') + '</span>' +
      '<div class="wf-ss-toast-text">' + msg + '</div>';
    toast.style.display = 'flex';

    if (window._ssToastTimer) clearTimeout(window._ssToastTimer);
    window._ssToastTimer = setTimeout(function () {
      toast.style.display = 'none';
    }, 4500);
  };

  window.caNewSsValidateField = function (id, fIdx) {
    var app = SS_APPS[id];
    if (!app) return false;
    var f = app.fields[fIdx];
    var fieldInputId = id + '-f-' + fIdx;
    var el = document.getElementById(fieldInputId);
    var wrap = document.getElementById(fieldInputId + '-wrap');
    var hint = document.getElementById(fieldInputId + '-hint');
    if (!el || !wrap) return false;

    var val = el.value.trim();
    run()['ss_val_' + fieldInputId] = el.value;

    if (!val) {
      wrap.classList.remove('is-valid', 'is-invalid');
      if (hint) hint.style.display = 'none';
      return false;
    }

    var ok = f.validate(val);
    if (ok) {
      wrap.classList.remove('is-invalid');
      wrap.classList.add('is-valid');
      if (hint) hint.style.display = 'none';
    } else {
      wrap.classList.remove('is-valid');
      wrap.classList.add('is-invalid');
      if (hint) hint.style.display = 'block';
    }
    return ok;
  };

  window.caNewSsToggle = function (id, key) {
    var toggle = document.getElementById(id + '-toggle-' + key);
    var badge = document.getElementById(id + '-badge-' + key);
    if (!toggle || !badge) return;

    if (key === 'lead') {
      if (toggle.checked) {
        badge.className = 'wf-ss-pill required';
        badge.textContent = 'Required (Pre-1978)';
      } else {
        badge.className = 'wf-ss-pill applicable';
        badge.textContent = 'If Applicable';
      }
    }
  };

  window.caNewSsAutoFillFields = function (id) {
    var app = SS_APPS[id];
    if (!app) return;
    app.fields.forEach(function (f, fIdx) {
      var fieldInputId = id + '-f-' + fIdx;
      var el = document.getElementById(fieldInputId);
      if (el) {
        el.value = f.auto || '';
        caNewSsValidateField(id, fIdx);
      }
    });
    var errEl = document.getElementById(id + '-info-err');
    if (errEl) errEl.style.display = 'none';
  };

  window.caNewSsAutoFillChecklist = function (id) {
    var requiredSlots = ['ad', 'rla', 'mlsa', 'da', 'dia', 'bca', 'fhda', 'sa', 'ccpa'];
    requiredSlots.forEach(function (slot) {
      if (!SS_STATE[id + '_' + slot]) {
        caNewSsAssign(id, slot, slot);
      }
    });
    var errEl = document.getElementById(id + '-err');
    if (errEl) errEl.style.display = 'none';
  };

  window.caNewSsAutoFill = function (id) {
    caNewSsAutoFillFields(id);
    caNewSsCreateListing(id, true);
    caNewSsAutoFillChecklist(id);
  };

  window.caNewSsSwitchTab = function (id, stageIdx) {
    var st = run();
    var isCreated = !!st['ss_created_' + id] || !!SS_STATE[id + '_created'] || !!st['ss_submitted_' + id];

    if (stageIdx === 1 && !isCreated) {
      var errEl = document.getElementById(id + '-info-err');
      if (errEl) {
        errEl.innerHTML = '<strong>&#9888; Listing File Not Created:</strong> Complete all listing fields below and click &ldquo;Create Listing File &amp; Open Checklist&rdquo; to access compliance documents.';
        errEl.style.display = 'block';
        if (typeof errEl.scrollIntoView === 'function') {
          errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
      return;
    }

    window._caNewSsStage = stageIdx;

    var s0 = document.getElementById(id + '-stage-0');
    var s1 = document.getElementById(id + '-stage-1');
    var t0 = document.getElementById(id + '-tab-0');
    var t1 = document.getElementById(id + '-tab-1');

    if (s0 && s1) {
      if (stageIdx === 0) {
        s0.style.display = 'block';
        s1.style.display = 'none';
        if (t0) t0.classList.add('active');
        if (t1) t1.classList.remove('active');
      } else {
        s0.style.display = 'none';
        s1.style.display = 'block';
        if (t0) t0.classList.remove('active');
        if (t1) t1.classList.add('active');
        var errEl = document.getElementById(id + '-err');
        if (errEl) errEl.style.display = 'none';
      }
    }
  };

  window.caNewSsCreateListing = function (id, isSilent) {
    var app = SS_APPS[id];
    if (!app) return false;
    var errEl = document.getElementById(id + '-info-err');

    // 1. Validate all fields
    for (var i = 0; i < app.fields.length; i++) {
      var ok = caNewSsValidateField(id, i);
      if (!ok) {
        if (errEl) {
          errEl.innerHTML = '<strong>&#9888; Incomplete Listing Info:</strong> Please accurately complete all listing information fields before creating the listing file.';
          errEl.style.display = 'block';
          if (typeof errEl.scrollIntoView === 'function') {
            errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
        return false;
      }
    }

    if (errEl) errEl.style.display = 'none';

    var createBtn = document.getElementById(id + '-create-btn');

    var finishCreation = function () {
      var st = run();
      st['ss_created_' + id] = true;
      SS_STATE[id + '_created'] = true;

      // Update title and status
      var titleEl = document.getElementById(id + '-title');
      if (titleEl) {
        titleEl.innerHTML = 'SkySlope &middot; Listing File: 4827 Rolando Blvd <span style="font-weight:400;opacity:0.85;">(MLS #SD-2025-48271)</span>';
      }
      var statusEl = document.getElementById(id + '-status');
      if (statusEl && !st['ss_submitted_' + id]) {
        statusEl.innerHTML = '&#128193; File Created';
        statusEl.className = 'wf-ss-status active';
      }

      // Unlock tab 1
      var tab1 = document.getElementById(id + '-tab-1');
      if (tab1) {
        tab1.classList.remove('locked');
        tab1.removeAttribute('title');
      }

      if (createBtn) {
        createBtn.disabled = false;
        createBtn.innerHTML = 'Update &amp; Open Checklist &rarr;';
      }

      // Switch to Stage 1 (Checklist)
      caNewSsSwitchTab(id, 1);

      if (!isSilent) {
        caNewSsToast('✓ Listing file created for 4827 Rolando Blvd! Opening Brokerage Compliance Checklist...', false);
      }
    };

    if (isSilent || SS_STATE[id + '_created']) {
      finishCreation();
    } else {
      if (createBtn) {
        createBtn.disabled = true;
        createBtn.innerHTML = '<span class="wf-ss-uploading-dot"></span> Creating Listing File...';
      }
      caNewSsToast('⏳ Creating SkySlope listing file for 4827 Rolando Blvd...', false);
      setTimeout(function () {
        finishCreation();
      }, 1200);
    }

    return true;
  };

  window.caNewSsSubmit = function (id) {
    var app = SS_APPS[id];
    if (!app) return;
    var errEl = document.getElementById(id + '-err');

    // 1. Validate fields if somehow incomplete
    for (var i = 0; i < app.fields.length; i++) {
      var ok = caNewSsValidateField(id, i);
      if (!ok) {
        caNewSsSwitchTab(id, 0);
        var infoErr = document.getElementById(id + '-info-err');
        if (infoErr) {
          infoErr.innerHTML = '<strong>&#9888; Incomplete Listing Info:</strong> Please accurately complete all listing information fields.';
          infoErr.style.display = 'block';
          if (typeof infoErr.scrollIntoView === 'function') {
            infoErr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
        return;
      }
    }

    // 2. Validate all 9 listing package documents are attached
    var requiredSlots = ['ad', 'rla', 'mlsa', 'da', 'dia', 'bca', 'fhda', 'sa', 'ccpa'];
    var missingDocs = [];
    requiredSlots.forEach(function (slot) {
      if (!SS_STATE[id + '_' + slot]) {
        var item = SS_CHECKLIST.find(function (c) { return c.key === slot; });
        missingDocs.push(item ? item.title : slot.toUpperCase());
      }
    });
    if (missingDocs.length > 0) {
      if (errEl) {
        errEl.innerHTML = '<strong>&#9888; Missing Documents (' + missingDocs.length + '):</strong> The following listing package documents must be attached from the sidebar Documents panel before submitting:<br>' +
          missingDocs.map(function (d) { return '&bull; ' + d; }).join('<br>');
        errEl.style.display = 'block';
        if (typeof errEl.scrollIntoView === 'function') {
          errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
      return;
    }

    // All valid!
    if (errEl) errEl.style.display = 'none';

    var st = run();
    requiredSlots.forEach(function (slot) { st['ss_checklist_' + slot] = 'attached'; });
    st['ss_submitted_' + id] = true;

    var statusEl = document.getElementById(id + '-status');
    if (statusEl) {
      statusEl.className = 'wf-ss-status done';
      statusEl.innerHTML = '&#10003; Submitted for Review';
    }
    var subBtn = document.getElementById(id + '-submit-btn');
    if (subBtn) subBtn.style.display = 'none';
    var succBanner = document.getElementById(id + '-success-banner');
    if (succBanner) succBanner.style.display = 'block';

    var ssNext = document.getElementById('ca2-s1-ss-next');
    if (ssNext) ssNext.style.display = 'inline-flex';
    if (typeof caNewUpdateTracker === 'function') caNewUpdateTracker('ca2-s1-tracker', 2);
    if (typeof caNewUpdateStep1Pills === 'function') caNewUpdateStep1Pills();
    if (typeof caNewGoStep1Sub === 'function') {
      caNewGoStep1Sub(2);
    } else if (typeof caNewReveal === 'function') {
      caNewReveal('ca2-s1-p3');
    }
  };

  /* ---------- Slide Controller for Step 1 (Option A) ---------- */
  window._caNewSlide0 = 0;

  window.caNewIsSlide1Ok = function () {
    var res = run()['r_ca2-file'];
    return !!(res && res.length === 6 && res.indexOf(false) === -1);
  };

  window.caNewIsSlide2Ok = function () {
    var st = run(), p = PICKS['ca2-p-predocs'];
    if (!p || !st['pd_ca2-p-predocs']) return false;
    var on = st['p_ca2-p-predocs'] || [];
    return p.items.every(function (it, i) { return (on.indexOf(i) > -1) === it.ok; });
  };

  window.caNewUpdatePills = function () {
    var cur = window._caNewSlide0 || 0;
    var s1Ok = caNewIsSlide1Ok();
    var s2Ok = caNewIsSlide2Ok();
    var s3Ok = caNewIsSlide3Ok();
    var s4Ok = caNewIsSlide4Ok();

    for (var i = 0; i < 6; i++) {
      var pill = document.getElementById('ca2-pill-' + i);
      if (!pill) continue;
      if (i === cur) {
        pill.className = 'wf-substep-pill active';
      } else if (i === 0) {
        pill.className = 'wf-substep-pill done';
      } else if (i === 1) {
        pill.className = 'wf-substep-pill ' + (s1Ok ? 'done' : 'upcoming');
      } else if (i === 2) {
        pill.className = 'wf-substep-pill ' + (s2Ok ? 'done' : (!s1Ok ? 'locked' : 'upcoming'));
      } else if (i === 3) {
        pill.className = 'wf-substep-pill ' + (s3Ok ? 'done' : (!s2Ok ? 'locked' : 'upcoming'));
      } else if (i === 4) {
        pill.className = 'wf-substep-pill ' + (s4Ok ? 'done' : (!s3Ok ? 'locked' : 'upcoming'));
      } else if (i === 5) {
        pill.className = 'wf-substep-pill ' + (s4Ok ? 'done' : (!s3Ok ? 'locked' : 'upcoming'));
      }
    }
  };

  window.caNewApplySlide = function (idx) {
    for (var i = 0; i < 6; i++) {
      var slide = document.getElementById('ca2-deck-s' + i);
      if (slide) {
        if (i === idx) slide.classList.add('active');
        else slide.classList.remove('active');
      }
    }
    if (idx === 3) {
      var s3Done = caNewIsSlide3Ok();
      var pickNext = document.getElementById('ca2-s0-pick-next');
      if (pickNext && s3Done) pickNext.style.display = 'inline-flex';
    }
    if (idx === 4) {
      var s4Done = !!run()['c_ca2-missing-info'];
      var replyEl = document.getElementById('ca2-s0-sofia-reply');
      if (replyEl) replyEl.style.display = s4Done ? 'block' : 'none';
      var bannerEl = document.getElementById('ca2-s0-reply-banner');
      if (bannerEl) bannerEl.style.display = s4Done ? 'flex' : 'none';
      var connector = document.getElementById('ca2-thread-connector');
      if (connector) connector.style.display = s4Done ? 'flex' : 'none';
      var nextBtn = document.getElementById('ca2-s0-info-next');
      if (nextBtn) nextBtn.style.display = s4Done ? 'inline-flex' : 'none';
      var composeWrap = document.getElementById('ca2-thread-compose');
      if (composeWrap && s4Done && !composeWrap.classList.contains('sent')) {
        composeWrap.innerHTML = caNewGetSentEmailHtml();
        composeWrap.className = 'wf-email-card sent';
      }
      if (!s4Done) {
        var sendBtn = document.getElementById('wf-ca2-missing-info-body-btn');
        if (sendBtn) sendBtn.style.display = '';
        var ta = document.getElementById('wf-ca2-missing-info-body');
        if (ta) {
          if (typeof ta.removeAttribute === 'function') ta.removeAttribute('readonly');
          ta.readOnly = false;
        }
      }
    }
    if (typeof wfStep !== 'undefined' && wfStep === 0) {
      caNewRevealSideDocs([]);
    }
    caNewUpdatePills();
    var topEl = document.querySelector('.mh-top');
    if (topEl) topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.caNewGoSlide = function (idx) {
    if (idx === undefined || idx === null) idx = 0;
    var cur = window._caNewSlide0 || 0;

    // Moving backwards is always allowed
    if (idx < cur) {
      window._caNewSlide0 = idx;
      caNewApplySlide(idx);
      return;
    }

    // Moving to Slide 1 (Sofia's Email -> File Setup) is always allowed from Slide 0
    if (idx === 1) {
      window._caNewSlide0 = 1;
      caNewApplySlide(1);
      return;
    }

    // Moving to Slide 2 requires Slide 1 to be completely correct
    if (idx === 2) {
      caNewCheck('ca2-file');
      if (!caNewIsSlide1Ok()) {
        window._caNewSlide0 = 1;
        caNewApplySlide(1);
        var err1 = document.getElementById('ca2-slide1-err');
        if (err1) {
          err1.innerHTML = '<strong>&#9888; Incomplete File Setup:</strong> Please complete all 6 fields correctly before proceeding to Pre-Listing Documents.';
          err1.style.display = 'block';
          err1.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }
      window._caNewSlide0 = 2;
      caNewApplySlide(2);
      return;
    }

    // Moving to Slide 3 requires Slide 1 AND Slide 2 to be completely correct
    if (idx === 3) {
      if (!caNewIsSlide1Ok()) { caNewGoSlide(1); return; }
      if (!run()['pd_ca2-p-predocs']) { caNewPickCheck('ca2-p-predocs'); }
      if (!caNewIsSlide2Ok()) {
        window._caNewSlide0 = 2;
        caNewApplySlide(2);
        var err2 = document.getElementById('ca2-slide2-err');
        if (err2) {
          err2.innerHTML = '<strong>&#9888; Pre-Listing Disclosures Incomplete:</strong> Please select all required statutory disclosures correctly before opening the Missing Information review.';
          err2.style.display = 'block';
          err2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }
      window._caNewSlide0 = 3;
      caNewApplySlide(3);
      return;
    }

    // Moving to Slide 4 requires Slide 1, Slide 2, and Slide 3 (Picker) to be completely correct
    if (idx === 4) {
      if (!caNewIsSlide1Ok()) { caNewGoSlide(1); return; }
      if (!caNewIsSlide2Ok()) { caNewGoSlide(2); return; }
      if (!caNewIsSlide3Ok()) {
        window._caNewSlide0 = 3;
        caNewApplySlide(3);
        var err3 = document.getElementById('ca2-slide3-err');
        if (err3) {
          err3.innerHTML = '<strong>&#9888; Missing Information Incomplete:</strong> Identify the 4 missing listing items before proceeding to draft your email.';
          err3.style.display = 'block';
          err3.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }
      window._caNewSlide0 = 4;
      caNewApplySlide(4);
      return;
    }

    // Moving to Slide 5 requires Slide 1, 2, 3, and 4 (Email) to be completely correct
    if (idx === 5) {
      if (!caNewIsSlide1Ok()) { caNewGoSlide(1); return; }
      if (!caNewIsSlide2Ok()) { caNewGoSlide(2); return; }
      if (!caNewIsSlide3Ok()) { caNewGoSlide(3); return; }
      if (!caNewIsSlide4Ok()) {
        window._caNewSlide0 = 4;
        caNewApplySlide(4);
        var err4 = document.getElementById('ca2-slide4-err');
        if (err4) {
          err4.innerHTML = '<strong>&#9888; Email Clarification Incomplete:</strong> Send your clarification email to Sofia and review her reply before proceeding to the File Review.';
          err4.style.display = 'block';
          err4.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }
      window._caNewSlide0 = 5;
      caNewApplySlide(5);
      return;
    }

    window._caNewSlide0 = idx;
    caNewApplySlide(idx);
  };

  window.caNewSlide1Next = function () {
    caNewCheck('ca2-file');
    var ok = caNewIsSlide1Ok();
    var errEl = document.getElementById('ca2-slide1-err');
    if (ok) {
      if (errEl) errEl.style.display = 'none';
      caNewGoSlide(2);
    } else {
      if (errEl) {
        errEl.innerHTML = '<strong>&#9888; Incomplete File Setup:</strong> Please complete all 6 fields correctly according to Sofia\'s email before proceeding to the next step. (Check the red fields or use Auto-fill).';
        errEl.style.display = 'block';
        errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  window.caNewSlide2Next = function () {
    var st = run();
    if (!st['pd_ca2-p-predocs']) {
      caNewPickCheck('ca2-p-predocs');
    }
    var ok = caNewIsSlide2Ok();
    var errEl = document.getElementById('ca2-slide2-err');
    if (ok) {
      if (errEl) errEl.style.display = 'none';
      caNewGoSlide(3);
    } else {
      if (errEl) {
        errEl.innerHTML = '<strong>&#9888; Pre-Listing Disclosures Incomplete:</strong> You must select all required statutory disclosures for this 1961 home correctly before moving forward. Check the badges above, click "Try again" to adjust, or use Auto-fill.';
        errEl.style.display = 'block';
        errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  window.caNewSlide3Next = function () {
    if (!caNewIsSlide3Ok()) {
      var err = document.getElementById('ca2-slide3-err');
      if (err) {
        err.innerHTML = '<strong>&#9888; Missing Information Incomplete:</strong> Please identify all 4 missing information items before proceeding to draft your email.';
        err.style.display = 'block';
        err.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }
    var errEl = document.getElementById('ca2-slide3-err');
    if (errEl) errEl.style.display = 'none';
    caNewGoSlide(4);
  };

  window.caNewSlide4Next = function () {
    if (!caNewIsSlide4Ok()) {
      var ta = document.getElementById('wf-ca2-missing-info-body');
      var toEl = document.getElementById('wf-ca2-missing-info-to');
      var bodyVal = (ta && ta.value || '').trim();
      var toVal = (toEl && toEl.value || '').trim().toLowerCase();
      var isSofia = toVal.indexOf('sofia') !== -1 || toVal.indexOf('sofia.reyes') !== -1 || toVal.indexOf('bhhscal.com') !== -1;

      // If user has already entered or loaded a draft for Sofia, submit it automatically
      if (bodyVal.length >= 25 && isSofia) {
        caNewSubmitCompose('ca2-missing-info', {
          textareaId: 'wf-ca2-missing-info-body',
          statusElId: 'wf-ca2-missing-info-body-status',
          btnId: 'wf-ca2-missing-info-body-btn',
          role: 'tc',
          scenarioId: 'tc-ca-missing-info',
          scenarioPrompt: 'Request missing listing details from Sofia Reyes',
          maxScore: 5
        });
        if (!caNewIsSlide4Ok()) return;
      } else {
        var err2 = document.getElementById('ca2-slide4-err');
        if (err2) {
          err2.innerHTML = '<strong>&#9888; Action Required:</strong> Please draft your clarification email to Sofia (or click <em>⚡ Load TC Standard Draft</em>) and send it before proceeding to the File Review.';
          err2.style.display = 'block';
          err2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }
    }
    var errEl2 = document.getElementById('ca2-slide4-err');
    if (errEl2) errEl2.style.display = 'none';
    caNewGoSlide(5);
  };

  window.caNewIsSlide3Ok = function () {
    var st = run(), p = PICKS['ca2-p-missing'];
    if (!p || !st['pd_ca2-p-missing']) return false;
    var on = st['p_ca2-p-missing'] || [];
    return p.items.every(function (it, i) { return (on.indexOf(i) > -1) === it.ok; });
  };

  window.caNewIsSlide4Ok = function () {
    return !!run()['c_ca2-missing-info'];
  };

  window.caNewStep0Next = function () {
    if (!caNewIsSlide1Ok()) {
      caNewGoSlide(1);
      var err1 = document.getElementById('ca2-slide1-err');
      if (err1) {
        err1.innerHTML = '<strong>&#9888; Incomplete Step 1:</strong> Please complete all file setup fields before proceeding to Step 2.';
        err1.style.display = 'block';
        err1.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }
    if (!caNewIsSlide2Ok()) {
      caNewGoSlide(2);
      var err2 = document.getElementById('ca2-slide2-err');
      if (err2) {
        err2.innerHTML = '<strong>&#9888; Incomplete Step 1:</strong> Please select all required pre-listing disclosures correctly before proceeding to Step 2.';
        err2.style.display = 'block';
        err2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }
    if (!caNewIsSlide3Ok()) {
      caNewGoSlide(3);
      var err3 = document.getElementById('ca2-slide3-err');
      if (err3) {
        err3.innerHTML = '<strong>&#9888; Incomplete Step 1:</strong> Please identify the missing listing terms before proceeding to Step 2.';
        err3.style.display = 'block';
        err3.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }
    if (!caNewIsSlide4Ok()) {
      caNewGoSlide(4);
      var err4 = document.getElementById('ca2-slide4-err');
      if (err4) {
        err4.innerHTML = '<strong>&#9888; Incomplete Step 1:</strong> Please send your clarification email to Sofia before proceeding to Step 2.';
        err4.style.display = 'block';
        err4.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }
    wfNext();
  };

  window.caNewToggleEmailPeek = function (btn) {
    var bar = btn ? btn.closest('.wf-peek-bar') : document.querySelector('.wf-deck-slide.active .wf-peek-bar');
    if (!bar) return;
    var drawer = bar.nextElementSibling;
    var arrow = bar.querySelector('.wf-peek-arrow');
    if (!drawer) return;
    if (drawer.style.display === 'none') {
      drawer.style.display = 'block';
      if (arrow) arrow.style.transform = 'rotate(180deg)';
      drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      drawer.style.display = 'none';
      if (arrow) arrow.style.transform = 'rotate(0deg)';
    }
  };

  /* ════════════════ Step 1: New Listing Assignment ════════════════ */
  function caNewStep0() {
    var emailCard =
      '<div class="wf-email-inbox-wrap">' +
        '<div class="wf-email-client-bar">' +
          '<div class="wf-email-client-left">' +
            '<div class="wf-email-window-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>' +
            '<div class="wf-email-folder"><span class="wf-folder-icon">&#128233;</span> <strong>Inbox</strong> &rsaquo; Listings &rsaquo; 4827 Rolando Blvd</div>' +
          '</div>' +
          '<div class="wf-email-client-right">' +
            '<div class="wf-email-actions">' +
              '<button type="button" class="wf-email-action-btn" title="Reply">&#8617; Reply</button>' +
              '<button type="button" class="wf-email-action-btn" title="Star">&#9733;</button>' +
              '<button type="button" class="wf-email-action-btn" title="Print">&#128438;</button>' +
            '</div>' +
            '<span class="wf-email-tool-tag">&#128196; Listing File &middot; Active</span>' +
            '<span class="wf-email-time">Mon, Sep 22, 2025 &middot; 8:42 AM</span>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email">' +
          '<div class="wf-email-header">' +
            '<div class="wf-email-subject-bar">' +
              '<h3 class="wf-email-subject">New Listing Assignment: 4827 Rolando Blvd, San Diego (Daniel &amp; Carmen Herrera)</h3>' +
              '<span class="wf-email-priority-badge">&#128680; Immediate &middot; Relo Deadline</span>' +
            '</div>' +
            '<div class="wf-email-sender-profile">' +
              '<div class="wf-email-avatar-wrap">' +
                '<div class="wf-email-avatar">SR</div>' +
                '<span class="wf-email-avatar-status" title="Active now"></span>' +
              '</div>' +
              '<div class="wf-email-sender-info">' +
                '<div class="wf-email-sender-line">' +
                  '<span class="wf-email-sender-name">Sofia Reyes</span>' +
                  '<span class="wf-email-sender-addr">&lt;sofia.reyes@bhhscal.com&gt;</span>' +
                  '<span class="wf-badge-verified">&#10003; Verified Agent</span>' +
                  '<span class="wf-badge-broker">BHHS California Properties</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="wf-email-body">' +
            '<p>Hi TC,</p>' +
            '<p>Excited to kick off our new listing file! I just met with <strong>Daniel &amp; Carmen Herrera</strong> and we are officially representing them on the sale of their home at <strong>4827 Rolando Blvd, San Diego, CA 92115 (APN: 470-362-18-00)</strong>.</p>' +
            '<p>Here is the background on their situation: Daniel received a corporate relocation transfer to Austin, Texas starting on <strong>November 10</strong>. Because of the job transfer and their relocation schedule, they <span class="wf-email-deadline-callout">must close this sale by November 3, 2025 at the absolute latest</span> so they can pack up and travel to Austin. Time is very tight.</p>' +
            '<p>Here are the key listing terms we agreed on:</p>' +
            '<ul style="margin:8px 0 12px 18px;line-height:1.7;font-size:13.5px;">' +
              '<li><strong>List Price:</strong> $889,000</li>' +
              '<li><strong>Listing Period:</strong> September 24, 2025 through March 24, 2026 (6-month term)</li>' +
              '<li><strong>Listing Type:</strong> Exclusive Right to Sell</li>' +
              '<li><strong>Commission:</strong> 5% total</li>' +
              '<li><strong>Included Personal Property:</strong> Refrigerator, washer, dryer</li>' +
              '<li><strong>Exclusion Note:</strong> Carmen mentioned wanting to exclude the antique dining room chandelier &mdash; it&rsquo;s a family heirloom. I&rsquo;ll confirm details at the signing appointment.</li>' +
            '</ul>' +
            '<p>The single-story ranch home was built in <strong>1961</strong> (which triggers the mandatory federal Lead-Based Paint disclosure requirement). We are aiming to have the listing live and active on the MLS by <strong>September 30, 2025</strong>.</p>' +
            '<p>Please open our listing file, verify what statutory seller disclosures we need to queue up for Daniel and Carmen, and prepare our pre-listing package.</p>' +
            SOFIA_SIG +
          '</div>' +
        '</div>' +
      '</div>';

    var fileForm = form('ca2-file', 'Start the file', 'Extract key listing assignment parameters from Sofia\'s email.', [
      { label: 'Property address', kind: 'text', ans: ['4827 rolando', 'rolando blvd'], ph: 'Property address', show: '4827 Rolando Blvd, San Diego, CA 92115' },
      { label: 'APN', kind: 'text', ans: ['470-362-18-00'], ph: 'Assessor Parcel Number', show: '470-362-18-00' },
      { label: 'Seller names', kind: 'text', ans: ['herrera', 'daniel and carmen herrera'], ph: 'Full names of sellers', show: 'Daniel & Carmen Herrera' },
      { label: 'Year built', kind: 'text', ans: ['1961'], ph: 'Year constructed', show: '1961' },
      { label: 'Listing agent', kind: 'text', ans: ['sofia reyes', 'reyes'], ph: 'Listing agent name', show: 'Sofia Reyes' },
      { label: 'Target list date', kind: 'date', ans: '2025-09-30', ph: 'mm/dd/yyyy', show: '09/30/2025' }
    ]);

    var pickerCard = picker('ca2-p-predocs', 'What documents do you need to prepare?', 'Select all documents required for this California pre-listing package.', [
      { t: 'Listing Agreement (RLA)', ok: true },
      { t: 'Agency Disclosure (AD)', sub: 'Required by California Civil Code §2079.16', ok: true },
      { t: 'Broker Compensation Advisory (BCA)', sub: 'Required post-NAR settlement', ok: true },
      { t: 'MLS & Seller Advisory Forms (MLSA, DIA, DA, FHDA, SA, CCPA)', sub: 'Standard C.A.R. listing advisories prepared in Zipforms', ok: true },
      { t: 'Transfer Disclosure Statement (TDS)', sub: 'Completed by sellers', ok: true },
      { t: 'Seller Property Questionnaire (SPQ)', sub: 'Completed by sellers', ok: true },
      { t: 'Natural Hazard Disclosure (NHD) — order from vendor', ok: true },
      { t: 'Lead-Based Paint Disclosure', sub: 'Home built 1961 (pre-1978)', ok: true },
      { t: 'Agent Visual Inspection Disclosure (AVID)', sub: 'Completed by listing agent', ok: true },
      { t: 'Preliminary Title Report — order from title company', ok: true },
      { t: 'Home Warranty', sub: 'Not needed at this stage', ok: false },
      { t: 'Buyer Pre-Approval Letter', sub: 'Not applicable, no buyer yet', ok: false },
      { t: 'Termite Inspection', sub: 'Not needed until under contract', ok: false }
    ], 'The pre-listing package for a California listing includes: the RLA and the full C.A.R. listing advisory package (AD, BCA, MLSA, DIA, DA, FHDA, SA, CCPA) — all prepared by the TC in Zipforms. It also includes seller-completed disclosures (TDS, SPQ), third-party reports to order (NHD from vendor, preliminary title from title company), the Lead-Based Paint disclosure for any pre-1978 home, and the AVID completed by the listing agent. Home warranty, buyer documents, and inspections come later in the process.');

    var missingInfoPicker = picker('ca2-p-missing', 'What information is missing?',
      'Review Sofia\'s email. Before you can complete the Listing Agreement in Zipforms, you need certain details that Sofia did not include. Select ALL items that are missing from the email.',
      [
        { t: 'List price', sub: 'Sofia stated $889,000 in the email', ok: false },
        { t: 'Buyer\'s agent compensation split', sub: 'Email says 5% total but no breakdown', ok: true },
        { t: 'How sellers hold title (vesting)', sub: 'Joint Tenants? Community Property? Not stated', ok: true },
        { t: 'Listing start and end dates', sub: 'Sofia listed Sep 24 through Mar 24', ok: false },
        { t: 'Lockbox authorization for showings', sub: 'No mention of keybox access', ok: true },
        { t: 'Commission rate', sub: 'Sofia stated 5% total commission', ok: false },
        { t: 'Yard sign / marketing sign authorization', sub: 'No mention of signage', ok: true },
        { t: 'Seller names', sub: 'Sofia identified Daniel & Carmen Herrera', ok: false }
      ],
      'A proactive TC reviews the listing assignment and identifies gaps BEFORE starting paperwork. Sofia\'s email states the price, dates, commission total, and seller names — but does not mention how the commission splits to the buyer\'s agent (required post-NAR settlement), how the sellers hold title (vesting), whether they authorize a lockbox for showings, or whether they allow a yard sign. These are all RLA fields you\'ll need to complete.'
    );

    var missingInfoEmail = compose({
      key: 'ca2-missing-info',
      scenario: 'tc-ca-missing-info',
      prompt: 'Request missing listing details from Sofia Reyes',
      to: 'Sofia Reyes <sofia.reyes@bhhscal.com>',
      subj: 'Re: New Listing Assignment: 4827 Rolando Blvd — Need a few details for the RLA',
      inst: 'Email Sofia requesting the 4 missing items you identified: buyer\'s agent compensation split, how the sellers hold title (vesting), lockbox authorization, and sign authorization. Fill in the "To" field (start typing for suggestions), verify whether "CC" is appropriate, write a clear Subject line, and draft your message.',
      ans: 'Hi Sofia,\n\nThank you for the listing assignment! I\'m getting the file started for 4827 Rolando Blvd. Before I can complete the Residential Listing Agreement in Zipforms, I need a few details that weren\'t in your email:\n\n1. Buyer\'s Agent Compensation — You noted 5% total commission. How much of that is being offered to the buyer\'s agent? (This needs to be specified per the new NAR settlement requirements.)\n2. Title Vesting — How do Daniel and Carmen hold title to the property? (Joint Tenants, Community Property, etc.)\n3. Lockbox — Do the sellers authorize a lockbox/keybox for agent showings?\n4. Yard Sign — Do the sellers authorize placing a For Sale sign on the property?\n\nOnce I have these I can finalize the RLA and get it out for signatures. Thanks!\n\nBest,\nTransaction Coordinator',
      interactiveRecipients: true
    });

    REVEAL['ca2-missing-info'] = 'ca2-s0-sofia-reply';

    var s3Done = caNewIsSlide3Ok();
    var s4Done = caNewIsSlide4Ok();

    var sofiaReply =
      '<div class="wf-email-card received" id="ca2-s0-sofia-reply" style="display:' + (s4Done ? 'block' : 'none') + '">' +
        '<div class="wf-email-card-header received">' +
          '<div class="wf-email-card-status">' +
            '<div class="wf-email-badge-group">' +
              '<span class="wf-email-type-badge received">&#128233; Inbox</span>' +
            '</div>' +
            '<div class="wf-email-time-tag">Mon, Sep 22, 2025 at 10:17 AM (3 mins ago)</div>' +
          '</div>' +
          '<div class="wf-email-card-profile">' +
            '<div class="wf-email-avatar-wrap">' +
              '<div class="wf-email-avatar">SR</div>' +
              '<span class="wf-email-avatar-status"></span>' +
            '</div>' +
            '<div class="wf-email-sender-info">' +
              '<div class="wf-email-sender-line">' +
                '<span class="wf-email-sender-name">Sofia Reyes</span>' +
                '<span class="wf-email-sender-addr">&lt;sofia.reyes@bhhscal.com&gt;</span>' +
                '<span class="wf-email-role-chip agent">Listing Agent</span>' +
              '</div>' +
              '<div class="wf-email-meta-grid">' +
                '<div class="wf-email-meta-row"><span class="wf-email-meta-lbl">To:</span><span class="wf-email-meta-val"><strong>You</strong> &lt;tc@bhhscal.com&gt;</span></div>' +
                '<div class="wf-email-meta-row"><span class="wf-email-meta-lbl">Subject:</span><span class="wf-email-meta-val"><strong>Re: New Listing Assignment: 4827 Rolando Blvd — Need a few details for the RLA</strong></span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email-card-body received">' +
          '<p>Hi,</p>' +
          '<p>Great catch! Thanks for following up on these before finalizing the agreement. Here are the specifics from the sellers to get the Residential Listing Agreement completed in Zipforms:</p>' +
          '<div class="wf-email-content-block">' +
            '<p><strong>1. Buyer\'s Agent Compensation:</strong> Offering <strong>2.5%</strong> to the buyer\'s broker (the remaining 2.5% of the 5% total commission is our listing-side split).</p>' +
            '<p><strong>2. Title Vesting:</strong> Daniel and Carmen hold title as <strong>Joint Tenants</strong>.</p>' +
            '<p><strong>3. Lockbox Authorization:</strong> Yes, the sellers authorized placing an electronic Supra lockbox on the property for agent showings.</p>' +
            '<p><strong>4. Yard Sign Authorization:</strong> Yes, they are fine with placing a Berkshire Hathaway For Sale yard sign on the front lawn.</p>' +
          '</div>' +
          '<p>Please go ahead and get the RLA prepared in Zipforms and queue it up for Daniel and Carmen\'s review. Let me know once it is ready for signatures!</p>' +
          SOFIA_SIG +
        '</div>' +
      '</div>' +
      '<div class="wf-reply-footer-banner" id="ca2-s0-reply-banner" style="display:' + (s4Done ? 'flex' : 'none') + ';margin-top:14px;">' +
        '<span class="wf-reply-footer-icon">&#10004;</span>' +
        '<span><strong>Listing Details Complete:</strong> You have gathered all 4 required parameters to complete the Residential Listing Agreement (RLA) in Step 2.</span>' +
      '</div>';

    var curSlide = window._caNewSlide0 || 0;
    var s1Ok = caNewIsSlide1Ok();
    var s2Ok = caNewIsSlide2Ok();
    var s3Ok = caNewIsSlide3Ok();
    var s4Ok = caNewIsSlide4Ok();

    var pill0Cls = curSlide === 0 ? 'active' : (curSlide > 0 ? 'done' : 'upcoming');
    var pill1Cls = curSlide === 1 ? 'active' : (s1Ok ? 'done' : 'upcoming');
    var pill2Cls = curSlide === 2 ? 'active' : (s2Ok ? 'done' : (!s1Ok ? 'locked' : 'upcoming'));
    var pill3Cls = curSlide === 3 ? 'active' : (s3Ok ? 'done' : (!s2Ok ? 'locked' : 'upcoming'));
    var pill4Cls = curSlide === 4 ? 'active' : (s4Ok ? 'done' : (!s3Ok ? 'locked' : 'upcoming'));
    var pill5Cls = curSlide === 5 ? 'active' : (s4Ok ? 'done' : (!s3Ok ? 'locked' : 'upcoming'));

    var substepper =
      '<div class="wf-substepper" id="wf-s0-substepper">' +
        '<button type="button" class="wf-substep-pill ' + pill0Cls + '" id="ca2-pill-0" onclick="caNewGoSlide(0)">' +
          '<span class="substep-num">1</span><span>Sofia\'s Email</span>' +
        '</button>' +
        '<button type="button" class="wf-substep-pill ' + pill1Cls + '" id="ca2-pill-1" onclick="caNewGoSlide(1)">' +
          '<span class="substep-num">2</span><span>File Setup</span>' +
        '</button>' +
        '<button type="button" class="wf-substep-pill ' + pill2Cls + '" id="ca2-pill-2" onclick="caNewGoSlide(2)">' +
          '<span class="substep-num">3</span><span>Pre-Listing Docs</span>' +
        '</button>' +
        '<button type="button" class="wf-substep-pill ' + pill3Cls + '" id="ca2-pill-3" onclick="caNewGoSlide(3)">' +
          '<span class="substep-num">4</span><span>Missing Info</span>' +
        '</button>' +
        '<button type="button" class="wf-substep-pill ' + pill4Cls + '" id="ca2-pill-4" onclick="caNewGoSlide(4)">' +
          '<span class="substep-num">5</span><span>Email Sofia</span>' +
        '</button>' +
        '<button type="button" class="wf-substep-pill ' + pill5Cls + '" id="ca2-pill-5" onclick="caNewGoSlide(5)">' +
          '<span class="substep-num">6</span><span>File Review</span>' +
        '</button>' +
      '</div>';

    var peekBar =
      '<div class="wf-peek-bar">' +
        '<button type="button" class="wf-peek-btn" onclick="caNewToggleEmailPeek(this)">' +
          '<span class="wf-peek-icon">&#9993;</span>' +
          '<span class="wf-peek-text"><strong>Sofia\'s Email:</strong> 4827 Rolando Blvd Assignment</span>' +
          '<span class="wf-peek-arrow">&#9662;</span>' +
        '</button>' +
      '</div>' +
      '<div class="wf-email-peek-drawer" style="display:none">' +
        emailCard +
      '</div>';

    var slide0 =
      '<div class="wf-deck-slide ' + (curSlide === 0 ? 'active' : '') + '" id="ca2-deck-s0">' +
        emailCard +
        '<div class="wf-deck-nav">' +
          '<button type="button" class="wf-deck-next" onclick="caNewGoSlide(1)">Start the File &rarr;</button>' +
        '</div>' +
      '</div>';

    var slide1 =
      '<div class="wf-deck-slide ' + (curSlide === 1 ? 'active' : '') + '" id="ca2-deck-s1">' +
        peekBar +
        fileForm +
        '<div id="ca2-slide1-err" class="wf-slide-err"></div>' +
        '<div class="wf-deck-nav">' +
          '<button type="button" class="wf-deck-prev" onclick="caNewGoSlide(0)">&larr; Back to Email</button>' +
          '<button type="button" class="wf-deck-next" onclick="caNewSlide1Next()">Next: Pre-Listing Documents &rarr;</button>' +
        '</div>' +
      '</div>';

    var slide2 =
      '<div class="wf-deck-slide ' + (curSlide === 2 ? 'active' : '') + '" id="ca2-deck-s2">' +
        peekBar +
        pickerCard +
        '<div id="ca2-slide2-err" class="wf-slide-err"></div>' +
        '<div class="wf-deck-nav">' +
          '<button type="button" class="wf-deck-prev" onclick="caNewGoSlide(1)">&larr; Back to File Form</button>' +
          '<button type="button" class="wf-deck-next" onclick="caNewSlide2Next()">Next: Missing Information &rarr;</button>' +
        '</div>' +
      '</div>';

    var slide3 =
      '<div class="wf-deck-slide ' + (curSlide === 3 ? 'active' : '') + '" id="ca2-deck-s3">' +
        peekBar +
        missingInfoPicker +
        '<div id="ca2-slide3-err" class="wf-slide-err"></div>' +
        '<div class="wf-deck-nav">' +
          '<button type="button" class="wf-deck-prev" onclick="caNewGoSlide(2)">&larr; Back to Documents</button>' +
          '<button type="button" class="wf-deck-next" id="ca2-s0-pick-next" onclick="caNewSlide3Next()">Next: Email Sofia &rarr;</button>' +
        '</div>' +
      '</div>';

    var slide4 =
      '<div class="wf-deck-slide ' + (curSlide === 4 ? 'active' : '') + '" id="ca2-deck-s4">' +
        peekBar +
        '<div class="wf-thread-divider" id="ca2-thread-intro-bar">' +
          '<span class="wf-thread-divider-icon">&#9993;</span>' +
          '<span class="wf-thread-divider-text">' + (s4Done ? 'Email thread with Sofia Reyes regarding missing RLA details' : 'Draft your clarification email to Sofia requesting the missing details') + '</span>' +
        '</div>' +
        '<div class="wf-email-thread-flow">' +
          '<div id="ca2-thread-compose" class="' + (s4Done ? 'wf-email-card sent' : 'wf-email-card draft') + '">' +
            (s4Done ? caNewGetSentEmailHtml() : missingInfoEmail) +
          '</div>' +
          '<div class="wf-thread-gap-connector" id="ca2-thread-connector" style="display:' + (s4Done ? 'flex' : 'none') + '">' +
            '<div class="wf-thread-gap-line"></div>' +
            '<div class="wf-thread-gap-pill">' +
              '<span class="wf-thread-gap-icon">&#9201;</span>' +
              '<span>Sofia Reyes replied 3 minutes later</span>' +
            '</div>' +
            '<div class="wf-thread-gap-line"></div>' +
          '</div>' +
          sofiaReply +
        '</div>' +
        '<div id="ca2-slide4-err" class="wf-slide-err"></div>' +
        '<div class="wf-deck-nav">' +
          '<button type="button" class="wf-deck-prev" onclick="caNewGoSlide(3)">&larr; Back to Missing Info</button>' +
          '<button type="button" class="wf-deck-next" id="ca2-s0-info-next" style="display:' + (s4Done ? 'inline-flex' : 'none') + '" onclick="caNewSlide4Next()">Next: File Review &rarr;</button>' +
        '</div>' +
      '</div>';

    var slide5 =
      '<div class="wf-deck-slide ' + (curSlide === 5 ? 'active' : '') + '" id="ca2-deck-s5">' +
        '<div style="padding:24px 28px;border-radius:14px;border:1.5px solid var(--v-border);background:var(--v-card-bg,#fff);">' +
          '<h3 style="margin:0 0 6px;font-size:16px;font-weight:700;color:var(--v-text);">&#128203; Listing File Summary</h3>' +
          '<p style="margin:0 0 18px;font-size:13px;color:var(--v-muted);">Review the information you gathered before proceeding to the Listing Agreement.</p>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;font-size:13.5px;line-height:1.7;">' +
            '<div><span style="color:var(--v-muted);font-weight:600;">Property</span><br>4827 Rolando Blvd, San Diego, CA 92115</div>' +
            '<div><span style="color:var(--v-muted);font-weight:600;">APN</span><br>470-362-18-00</div>' +
            '<div><span style="color:var(--v-muted);font-weight:600;">Sellers</span><br>Daniel &amp; Carmen Herrera (Joint Tenants)</div>' +
            '<div><span style="color:var(--v-muted);font-weight:600;">Listing Agent</span><br>Sofia Reyes &middot; CalDRE #02156789</div>' +
            '<div><span style="color:var(--v-muted);font-weight:600;">List Price</span><br>$889,000</div>' +
            '<div><span style="color:var(--v-muted);font-weight:600;">Commission</span><br>5% total (2.5% listing / 2.5% buyer&rsquo;s agent)</div>' +
            '<div><span style="color:var(--v-muted);font-weight:600;">Listing Period</span><br>Sep 24, 2025 &ndash; Mar 24, 2026</div>' +
            '<div><span style="color:var(--v-muted);font-weight:600;">Closing Deadline</span><br>Nov 3, 2025 (Relo transfer to Austin)</div>' +
            '<div><span style="color:var(--v-muted);font-weight:600;">Year Built</span><br>1961 (Pre-1978 &mdash; Lead Paint disclosure required)</div>' +
            '<div><span style="color:var(--v-muted);font-weight:600;">Lockbox</span><br>&#10003; Authorized (Supra electronic)</div>' +
            '<div><span style="color:var(--v-muted);font-weight:600;">Yard Sign</span><br>&#10003; Authorized</div>' +
            '<div><span style="color:var(--v-muted);font-weight:600;">Exclusion</span><br>Antique dining room chandelier (confirm at signing)</div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:16px;padding:20px 28px;border-radius:14px;border:1.5px solid var(--v-border);background:var(--v-card-bg,#fff);">' +
          '<h3 style="margin:0 0 12px;font-size:15px;font-weight:700;color:var(--v-text);">&#128196; Pre-Listing Document Package</h3>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-size:13.5px;">' +
            '<div style="color:var(--good,#1f9e5a);">&#10003; Residential Listing Agreement (RLA)</div>' +
            '<div style="color:var(--good,#1f9e5a);">&#10003; Transfer Disclosure Statement (TDS)</div>' +
            '<div style="color:var(--good,#1f9e5a);">&#10003; Seller Property Questionnaire (SPQ)</div>' +
            '<div style="color:var(--good,#1f9e5a);">&#10003; Natural Hazard Disclosure (NHD)</div>' +
            '<div style="color:var(--good,#1f9e5a);">&#10003; Lead-Based Paint Disclosure</div>' +
            '<div style="color:var(--good,#1f9e5a);">&#10003; Agent Visual Inspection (AVID)</div>' +
            '<div style="color:var(--good,#1f9e5a);">&#10003; Preliminary Title Report</div>' +
          '</div>' +
        '</div>' +
        '<div class="wf-step-complete-card" id="ca2-s0-complete-card">' +
          '<div class="wf-step-complete-icon">&#10003;</div>' +
          '<div class="wf-step-complete-info">' +
            '<div class="wf-step-complete-title">Step 1 Complete: Listing File Initialized</div>' +
            '<div class="wf-step-complete-sub">All required listing parameters and disclosure documents have been identified and organized.</div>' +
          '</div>' +
        '</div>' +
        '<div class="wf-deck-nav">' +
          '<button type="button" class="wf-deck-prev" onclick="caNewGoSlide(4)">&larr; Back to Email Thread</button>' +
          '<button type="button" class="wf-deck-next wf-deck-next-navy" id="ca2-s0-deck-next" onclick="caNewStep0Next()">' +
            '<span>Continue to Step 2: Listing Agreement (RLA)</span>' +
            '<span class="wf-btn-arrow">&rarr;</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    var main =
      '<div class="wf-deck-container">' +
        substepper +
        slide0 +
        slide1 +
        slide2 +
        slide3 +
        slide4 +
        slide5 +
      '</div>';

    return step(1, 'New Listing Assignment', 'Mon, Sep 22, 2025',
      'Sofia Reyes assigns you the new listing file for 4827 Rolando Blvd. Set up the file, identify the required disclosure package, gather missing details from the listing agent, and review your completed file before moving to the Listing Agreement.',
      main, side([], ['rla'], ['sofia', 'daniel', 'carmen'], true), true);
  }

  /* ════════════════ Step 2: Listing Agreement & File Setup ════════════════ */

  /* -- Launch Pad: forms the TC must select for a listing transaction -- */
  var ZF_LAUNCHPAD = [
    { id: 'rla',  label: 'Residential Listing Agreement (RLA)',   sub: 'C.A.R. Form RLA — Employment contract between seller and brokerage', ok: true },
    { id: 'ad',   label: 'Agency Disclosure (AD)',                 sub: 'C.A.R. Form AD — Required agency relationship disclosure',           ok: true },
    { id: 'wfa',  label: 'Wire Fraud Advisory',                    sub: 'Brokerage required — Wire transfer warning to all parties',          ok: true },
    { id: 'prds', label: 'Statewide Buyer & Seller Advisory (SBSA)', sub: 'C.A.R. Form SBSA — General advisory for both parties',           ok: false },
    { id: 'rpa',  label: 'Residential Purchase Agreement (RPA)',   sub: 'C.A.R. Form RPA — Buyer-side offer form, not needed for listing',   ok: false },
    { id: 'cr',   label: 'Counter Offer (CO)',                     sub: 'C.A.R. Form CO — Used during offer negotiation, not at listing',    ok: false }
  ];

  var ZF_SECTIONS = [
    {
      title: 'Transaction Setup',
      fields: [
        {
          id: 'address', label: 'Property address', type: 'text', ph: '4827 Rolando Blvd, San Diego, CA 92115',
          validate: function (v) { var s = (v||'').toLowerCase(); return s.includes('4827 rolando') || s.includes('rolando blvd'); },
          hint: "Check Sofia's email — this information was provided in your listing assignment.",
          auto: '4827 Rolando Blvd, San Diego, CA 92115'
        },
        {
          id: 'apn', label: 'APN (Assessor Parcel Number)', type: 'text', ph: '470-362-18-00',
          validate: function (v) { var s = (v||'').trim().replace(/\s+/g, ''); return s === '470-362-18-00' || s === '4703621800'; },
          hint: "Check Sofia's email — look for the Assessor Parcel Number under Property Information.",
          auto: '470-362-18-00'
        },
        {
          id: 'county', label: 'County', type: 'text', ph: 'San Diego',
          validate: function (v) { return (v||'').toLowerCase().includes('san diego'); },
          hint: "Check Sofia's email for the property's local jurisdiction.",
          auto: 'San Diego'
        },
        {
          id: 'prop_type', label: 'Property type', type: 'select',
          options: [['', 'Select type...'], ['sfr', 'Single Family Residence'], ['condo', 'Condominium'], ['pud', 'Planned Unit Development (PUD)'], ['multi', 'Multi-Family (2-4 units)']],
          validate: function (v) { return v === 'sfr'; },
          hint: "What type of dwelling is 4827 Rolando Blvd?",
          auto: 'sfr'
        },
        {
          id: 'seller1', label: 'Seller 1 full legal name', type: 'text', ph: 'Daniel Herrera',
          validate: function (v) { var s = (v||'').toLowerCase(); return s.includes('daniel') && s.includes('herrera'); },
          hint: "Refer to the seller details in Sofia's listing assignment email.",
          auto: 'Daniel Herrera'
        },
        {
          id: 'seller2', label: 'Seller 2 full legal name', type: 'text', ph: 'Carmen Herrera',
          validate: function (v) { var s = (v||'').toLowerCase(); return s.includes('carmen') && s.includes('herrera'); },
          hint: "Both spouses are co-owners on the listing assignment.",
          auto: 'Carmen Herrera'
        },
        {
          id: 'agent', label: 'Listing agent', type: 'text', ph: 'Sofia Reyes',
          validate: function (v) { var s = (v||'').toLowerCase(); return s.includes('sofia reyes') || s.includes('reyes'); },
          hint: "Enter the senior listing specialist assigned to this property.",
          auto: 'Sofia Reyes'
        },
        {
          id: 'agent_dre', label: 'Agent DRE #', type: 'text', ph: '02156789',
          validate: function (v) { return (v||'').replace(/\D/g, '').includes('02156789'); },
          hint: "Found in Sofia's email signature block.",
          auto: '02156789'
        },
        {
          id: 'brokerage', label: 'Brokerage', type: 'text', ph: 'Berkshire Hathaway HomeServices California Properties',
          validate: function (v) { var s = (v||'').toLowerCase(); return s.includes('berkshire') || s.includes('bhhs'); },
          hint: "Enter the brokerage company name from Sofia's signature block.",
          auto: 'Berkshire Hathaway HomeServices California Properties'
        },
        {
          id: 'brokerage_dre', label: 'Brokerage DRE #', type: 'text', ph: '01317331',
          validate: function (v) { return (v||'').replace(/\D/g, '').includes('01317331'); },
          hint: "The brokerage license number — found in Sofia's email signature.",
          auto: '01317331'
        }
      ]
    },
    {
      title: '1. Property & Listing Type',
      fields: [
        {
          id: 'listing_type', label: 'Type of listing', type: 'select',
          options: [['', 'Select type...'], ['ers', 'Exclusive Right to Sell'], ['ea', 'Exclusive Agency'], ['open', 'Open Listing']],
          validate: function (v) { return v === 'ers'; },
          hint: "The standard California C.A.R. RLA agreement is an Exclusive Right to Sell.",
          auto: 'ers'
        }
      ]
    },
    {
      title: '2. Listing Period',
      fields: [
        {
          id: 'start_date', label: 'Listing start date', type: 'date', ph: 'mm/dd/yyyy',
          validate: function (v) { var s = (v||'').trim(); return s === '2025-09-24' || s === '09/24/2025'; },
          hint: "Listing agreement effective start date in Sofia's email.",
          auto: '2025-09-24'
        },
        {
          id: 'end_date', label: 'Listing end date', type: 'date', ph: 'mm/dd/yyyy',
          validate: function (v) { var s = (v||'').trim(); return s === '2026-03-24' || s === '03/24/2026'; },
          hint: "Standard 6-month term ending in March 2026.",
          auto: '2026-03-24'
        }
      ]
    },
    {
      title: '3. List Price',
      fields: [
        {
          id: 'price', label: 'List price', type: 'money', ph: '$889,000',
          validate: function (v) { var n = parseInt(String(v||'').replace(/[^\d]/g, ''), 10); return n === 889000; },
          hint: "Check Sofia's confirmed listing price before any seller inquiries.",
          auto: '$889,000'
        }
      ]
    },
    {
      title: '4. Compensation',
      fields: [
        {
          id: 'commission', label: 'Total commission rate', type: 'text', ph: '5%',
          validate: function (v) { return (v||'').includes('5'); },
          hint: "Check Sofia's email for the agreed total commission rate.",
          auto: '5%'
        },
        {
          id: 'buyer_agent_comp', label: 'Buyer’s agent compensation offered', type: 'text', ph: '2.5%',
          validate: function (v) { return (v||'').includes('2.5'); },
          hint: "Sofia confirmed the split in her reply: 2.5% offered to buyer's agent.",
          auto: '2.5%'
        }
      ]
    },
    {
      title: '5. Ownership & Title',
      fields: [
        {
          id: 'vesting', label: 'How sellers hold title (vesting)', type: 'select',
          options: [['', 'Select vesting...'], ['jt', 'Joint Tenants'], ['tic', 'Tenants in Common'], ['cp', 'Community Property'], ['sole', 'Sole Owner']],
          validate: function (v) { return v === 'jt'; },
          hint: "Refer to Sofia's response to your info request in Step 1.",
          auto: 'jt'
        }
      ]
    },
    {
      title: '6. Items Included / Excluded',
      fields: [
        {
          id: 'included', label: 'Personal property INCLUDED with sale', type: 'text', ph: 'Refrigerator, washer, dryer',
          validate: function (v) { var s = (v||'').toLowerCase(); return s.includes('refrigerator') && (s.includes('washer') || s.includes('dryer')); },
          hint: "Review Sofia's email notes on kitchen and laundry appliances conveying.",
          auto: 'Refrigerator, washer, dryer'
        },
        {
          id: 'excluded', label: 'Personal property EXCLUDED from sale', type: 'text', ph: 'Antique dining room chandelier',
          validate: function (v) { return (v||'').toLowerCase().includes('chandelier'); },
          hint: "What family heirloom fixture did Carmen ask to exclude?",
          auto: 'Antique dining room chandelier'
        }
      ]
    },
    {
      title: '7. MLS & Marketing',
      fields: [
        {
          id: 'mls_auth', label: 'MLS listing authorization', type: 'select',
          options: [['', 'Select...'], ['yes', 'Yes — Authorize MLS listing'], ['no', 'No — Do not list on MLS']],
          validate: function (v) { return v === 'yes'; },
          hint: "Sofia's email confirms they want the listing active on the MLS by September 30.",
          auto: 'yes'
        },
        {
          id: 'sign_auth', label: 'Yard sign / marketing sign authorized', type: 'select',
          options: [['', 'Select...'], ['yes', 'Yes'], ['no', 'No']],
          validate: function (v) { return v === 'yes'; },
          hint: "Refer to Sofia's response to your info request in Step 1.",
          auto: 'yes'
        }
      ]
    },
    {
      title: '8. Security & Access',
      fields: [
        {
          id: 'lockbox', label: 'Lockbox authorized for showings', type: 'select',
          options: [['', 'Select...'], ['yes', 'Yes'], ['no', 'No']],
          validate: function (v) { return v === 'yes'; },
          hint: "Sofia confirmed lockbox authorization in her reply to your info request.",
          auto: 'yes'
        }
      ]
    }
  ];

  var SS_FIELDS = [
    {
      id: 'ss_address', label: 'Property address', ph: '4827 Rolando Blvd',
      validate: function (v) { return (v||'').toLowerCase().includes('4827 rolando'); },
      hint: "Enter property address (4827 Rolando Blvd).",
      auto: '4827 Rolando Blvd, San Diego, CA 92115'
    },
    {
      id: 'ss_mls', label: 'MLS #', ph: 'SD-2025-48271',
      validate: function (v) { return (v||'').trim().length > 0; },
      hint: "Assigned by MLS upon listing activation. For this exercise, enter: SD-2025-48271",
      auto: 'SD-2025-48271'
    },
    {
      id: 'ss_agent', label: 'Listing agent', ph: 'Sofia Reyes',
      validate: function (v) { var s = (v||'').toLowerCase(); return s.includes('sofia reyes') || s.includes('reyes'); },
      hint: "Enter listing agent name (Sofia Reyes).",
      auto: 'Sofia Reyes'
    },
    {
      id: 'ss_seller1', label: 'Seller 1', ph: 'Daniel Herrera',
      validate: function (v) { var s = (v||'').toLowerCase(); return s.includes('daniel') && s.includes('herrera'); },
      hint: "Enter Seller 1 full legal name (Daniel Herrera).",
      auto: 'Daniel Herrera'
    },
    {
      id: 'ss_seller2', label: 'Seller 2', ph: 'Carmen Herrera',
      validate: function (v) { var s = (v||'').toLowerCase(); return s.includes('carmen') && s.includes('herrera'); },
      hint: "Enter Seller 2 full legal name (Carmen Herrera).",
      auto: 'Carmen Herrera'
    },
    {
      id: 'ss_price', label: 'List price', ph: '$889,000',
      validate: function (v) { var n = parseInt(String(v||'').replace(/[^\d]/g, ''), 10); return n === 889000; },
      hint: "Enter the ratified listing price ($889,000).",
      auto: '$889,000'
    },
    {
      id: 'ss_start', label: 'Listing date', ph: '09/24/2025',
      validate: function (v) { var s = (v||'').trim(); return s === '2025-09-24' || s === '09/24/2025'; },
      hint: "Enter listing agreement start date (09/24/2025).",
      auto: '09/24/2025'
    },
    {
      id: 'ss_end', label: 'Expiration date', ph: '03/24/2026',
      validate: function (v) { var s = (v||'').trim(); return s === '2026-03-24' || s === '03/24/2026'; },
      hint: "Enter listing agreement expiration date (03/24/2026).",
      auto: '03/24/2026'
    }
  ];

  var SS_CHECKLIST = [
    { key: 'ad', title: 'Agency Disclosure (AD)', type: 'attach' },
    { key: 'rla', title: 'Residential Listing Agreement (RLA)', type: 'attach' },
    { key: 'mlsa', title: 'MLS Addendum (MLSA)', type: 'attach' },
    { key: 'da', title: 'Dual Agency Disclosure (DA)', type: 'attach' },
    { key: 'dia', title: 'Disclosure Information Advisory (DIA)', type: 'attach' },
    { key: 'bca', title: 'Broker Compensation Advisory (BCA)', type: 'attach' },
    { key: 'fhda', title: 'Fair Housing & Discrimination Advisory (FHDA)', type: 'attach' },
    { key: 'sa', title: 'Sellers Advisory (SA)', type: 'attach' },
    { key: 'ccpa', title: 'CCPA Advisory', type: 'attach' },
    { key: 'tds', title: 'Transfer Disclosure Statement (TDS)', type: 'pending', pendingText: 'Pending · Step 3' },
    { key: 'spq', title: 'Seller Property Questionnaire (SPQ)', type: 'pending', pendingText: 'Pending · Step 3' },
    { key: 'lead', title: 'Lead-Based Paint Disclosure', type: 'pending', pendingText: 'Pending · Step 3' },
    { key: 'nhd', title: 'Natural Hazard Disclosure (NHD)', type: 'pending', pendingText: 'Pending · Step 4' },
    { key: 'avid', title: 'Agent Visual Inspection (AVID)', type: 'pending', pendingText: 'Pending · Step 4' },
    { key: 'prelim', title: 'Preliminary Title Report', type: 'pending', pendingText: 'Pending · Step 4' }
  ];

  /* ---------- Sub-step Controller for Step 2 (Listing Agreement & File Setup) ---------- */
  window._caNewSlide1 = null;

  window.caNewGoStep1Sub = function (idx) {
    if (idx === undefined || idx === null) idx = 0;
    var cur = (typeof window._caNewSlide1 === 'number') ? window._caNewSlide1 : 0;

    if (idx < cur) {
      window._caNewSlide1 = idx;
      caNewApplyStep1Sub(idx);
      return;
    }

    var zfDone = !!run()['zf_submitted_ca2-zf'];
    var ssDone = !!run()['ss_submitted_ca2-ss'];

    if (idx === 1) {
      if (!zfDone) {
        window._caNewSlide1 = 0;
        caNewApplyStep1Sub(0);
        return;
      }
    } else if (idx === 2) {
      if (!zfDone) { caNewGoStep1Sub(0); return; }
      if (!ssDone) {
        window._caNewSlide1 = 1;
        caNewApplyStep1Sub(1);
        return;
      }
    }

    window._caNewSlide1 = idx;
    caNewApplyStep1Sub(idx);
  };

  window.caNewApplyStep1Sub = function (idx) {
    var phaseIds = ['ca2-s1-p1', 'ca2-s1-p2', 'ca2-s1-p3'];
    phaseIds.forEach(function (pid, i) {
      var el = document.getElementById(pid);
      if (el) {
        if (i === idx) {
          el.style.display = 'block';
          el.classList.add('wf-phase-enter');
        } else {
          el.style.display = 'none';
          el.classList.remove('wf-phase-enter');
        }
      }
    });

    var zfDone = !!run()['zf_submitted_ca2-zf'];
    if (typeof caNewRevealSideDocs === 'function' && typeof wfStep !== 'undefined' && wfStep === 1) {
      if (zfDone) {
        caNewRevealSideDocs(['ad', 'rla', 'mlsa', 'da', 'dia', 'bca', 'fhda', 'sa', 'ccpa', 'tds', 'nhd', 'wire', 'lead']);
      }
    }

    var zfNext = document.getElementById('ca2-s1-zf-next');
    if (zfNext) zfNext.style.display = zfDone ? 'inline-flex' : 'none';

    var ssDone = !!run()['ss_submitted_ca2-ss'];
    var ssNext = document.getElementById('ca2-s1-ss-next');
    if (ssNext) ssNext.style.display = ssDone ? 'inline-flex' : 'none';

    caNewUpdateStep1Pills();

    var topEl = document.querySelector('.mh-top');
    if (topEl) topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.caNewUpdateStep1Pills = function () {
    var cur = (typeof window._caNewSlide1 === 'number') ? window._caNewSlide1 : 0;
    var zfDone = !!run()['zf_submitted_ca2-zf'];
    var ssDone = !!run()['ss_submitted_ca2-ss'];

    for (var i = 0; i < 3; i++) {
      var pill = document.getElementById('ca2-s1-pill-' + i);
      if (!pill) continue;
      var base = 'wf-substep-pill wf-pt-item ';
      if (i === cur) {
        pill.className = base + 'active';
      } else if (i === 0) {
        pill.className = base + (zfDone ? 'done' : 'upcoming');
      } else if (i === 1) {
        pill.className = base + (ssDone ? 'done' : (!zfDone ? 'locked' : 'upcoming'));
      } else if (i === 2) {
        pill.className = base + (ssDone ? 'upcoming' : 'locked');
      }
    }

    if (typeof caNewUpdateTracker === 'function') {
      caNewUpdateTracker('ca2-s1-tracker', cur);
    }
  };

  function caNewStep1() {
    var zfDone = !!run()['zf_submitted_ca2-zf'];
    var ssDone = !!run()['ss_submitted_ca2-ss'];
    var curActiveIdx = ssDone ? 2 : (zfDone ? 1 : 0);

    if (window._caNewSlide1 === null || window._caNewSlide1 === undefined) {
      window._caNewSlide1 = curActiveIdx;
    }
    var curSlide = (typeof window._caNewSlide1 === 'number') ? window._caNewSlide1 : curActiveIdx;

    var pill0Cls = curSlide === 0 ? 'active' : (zfDone ? 'done' : 'upcoming');
    var pill1Cls = curSlide === 1 ? 'active' : (ssDone ? 'done' : (!zfDone ? 'locked' : 'upcoming'));
    var pill2Cls = curSlide === 2 ? 'active' : (ssDone ? 'upcoming' : 'locked');

    var substepper =
      '<div class="wf-substepper" id="ca2-s1-tracker">' +
        '<button type="button" class="wf-substep-pill wf-pt-item ' + pill0Cls + '" id="ca2-s1-pill-0" onclick="caNewGoStep1Sub(0)">' +
          '<span class="substep-num">1</span><span>Zipforms (RLA)</span>' +
        '</button>' +
        '<button type="button" class="wf-substep-pill wf-pt-item ' + pill1Cls + '" id="ca2-s1-pill-1" onclick="caNewGoStep1Sub(1)">' +
          '<span class="substep-num">2</span><span>SkySlope</span>' +
        '</button>' +
        '<button type="button" class="wf-substep-pill wf-pt-item ' + pill2Cls + '" id="ca2-s1-pill-2" onclick="caNewGoStep1Sub(2)">' +
          '<span class="substep-num">3</span><span>Confirmation</span>' +
        '</button>' +
      '</div>';

    var introCard = card('Draft the Residential Listing Agreement',
      'Zipforms Plus · New Transaction — Listing',
      '<p>Sofia Reyes has instructed you to prepare the listing package for 4827 Rolando Blvd. The package includes 9 C.A.R. forms (RLA, AD, MLSA, DA, DIA, BCA, FHDA, SA, CCPA). Start by selecting the correct forms in the Launch Pad, then fill in the transaction details and RLA fields. Once signed via DocuSign, all 9 documents will be ready for SkySlope upload.</p>' +
      '<div class="wf-tip-inline"><strong>Tip:</strong> Open your Notepad (&#128221;) if you took notes during Step 1. You\'ll need the property details, seller information, and listing terms.</div>'
    );

    var zfApp = zipformsApp('ca2-zf', ZF_SECTIONS);

    var ssApp = skyslopeApp('ca2-ss', SS_FIELDS, SS_CHECKLIST);

    var composeBox = compose({
      key: 'ca2-listing-confirm',
      scenario: 'tc-ca-listing-confirm',
      prompt: 'Confirm listing agreement details to sellers Daniel & Carmen Herrera',
      to: 'Daniel & Carmen Herrera <herrera.family@email.com>',
      cc: 'Sofia Reyes <sofia.reyes@bhhscal.com>',
      subj: 'Listing Agreement Confirmation: 4827 Rolando Blvd, San Diego',
      inst: 'Send a confirmation email to the sellers summarizing what was agreed in the Listing Agreement. Include bullet points covering: property address, list price, listing dates, commission rate, included and excluded personal property, and the next steps they need to complete (TDS, SPQ, Lead-Based Paint disclosure).',
      ans: 'Dear Daniel and Carmen,\n\nThank you for signing the Residential Listing Agreement for your home at 4827 Rolando Blvd. Here is a summary of the key terms:\n\n• Property: 4827 Rolando Blvd, San Diego, CA 92115 (APN: 470-362-18-00)\n• Property Type: Single Family Residence\n• List Price: $889,000\n• Listing Period: September 24, 2025 through March 24, 2026\n• Listing Type: Exclusive Right to Sell\n• Commission: 5% total (2.5% offered to buyer\'s agent)\n• Included Property: Refrigerator, washer, dryer\n• Excluded Property: Antique dining room chandelier (family heirloom — noted in MLS listing)\n• Lockbox: Authorized for agent showings\n\nNext Steps — Please complete the following documents at your earliest convenience:\n1. Transfer Disclosure Statement (TDS) — I will send this to you shortly\n2. Seller Property Questionnaire (SPQ)\n3. Lead-Based Paint Disclosure (required, as your home was built in 1961)\n\nOur goal is to have the listing active on the MLS by September 30, 2025. Please don\'t hesitate to reach out to Sofia or myself with any questions.\n\nBest regards,\nTransaction Coordinator\nBerkshire Hathaway HomeServices California Properties'
    });

    var confirmDone = !!run()['c_ca2-listing-confirm'];
    REVEAL['ca2-listing-confirm'] = 'ca2-s1-confirm-nav';

    var p0Vis = curSlide === 0;
    var p1Vis = curSlide === 1;
    var p2Vis = curSlide === 2;

    var confirmBanner =
      '<div class="box" style="background:#ecfdf5;border:1.5px solid #10b981;border-radius:12px;padding:16px;margin-bottom:18px;">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<div style="font-size:24px;">&#9993;</div>' +
          '<div>' +
            '<div style="font-size:15px;font-weight:800;color:#065f46;">Confirmation Email Sent</div>' +
            '<div style="font-size:13px;color:#047857;">Listing agreement summary sent to Daniel &amp; Carmen Herrera with next steps for TDS, SPQ, and Lead-Based Paint disclosure. Sofia Reyes CC\'d.</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var main = substepper +
      '<div class="wf-phase" id="ca2-s1-p1" style="display:' + (p0Vis ? 'block' : 'none') + '">' +
        introCard +
        zfApp +
        '<div class="wf-deck-nav" style="margin-top:24px;">' +
          '<button type="button" class="wf-deck-next" id="ca2-s1-zf-next" style="display:' + (zfDone ? 'inline-flex' : 'none') + '" onclick="caNewGoStep1Sub(1)">Next: SkySlope File Setup &rarr;</button>' +
        '</div>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s1-p2" style="display:' + (p1Vis ? 'block' : 'none') + '">' +
        ssApp +
        '<div class="wf-deck-nav" style="margin-top:24px;">' +
          '<button type="button" class="wf-deck-prev" onclick="caNewGoStep1Sub(0)">&larr; Back to Zipforms (RLA)</button>' +
          '<button type="button" class="wf-deck-next" id="ca2-s1-ss-next" style="display:' + (ssDone ? 'inline-flex' : 'none') + '" onclick="caNewGoStep1Sub(2)">Next: Confirmation Email &rarr;</button>' +
        '</div>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s1-p3" style="display:' + (p2Vis ? 'block' : 'none') + '">' +
        composeBox +
        '<div id="ca2-s1-confirm-nav" style="display:' + (confirmDone ? 'block' : 'none') + '">' +
          confirmBanner +
          '<div class="wf-deck-nav" style="margin-top:24px;">' +
            '<button type="button" class="wf-deck-prev" onclick="caNewGoStep1Sub(1)">&larr; Back to SkySlope File Setup</button>' +
            '<button type="button" class="wf-nav-btn primary" onclick="wfNext()">Continue to Step 3: Seller Disclosures &rarr;</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    return step(2, 'Listing Agreement & File Setup', 'Wed, Sep 24, 2025',
      'Draft the listing package (9 C.A.R. forms) in Zipforms, upload compliance documents to SkySlope, and confirm the listing terms with the Herreras.',
      main, side([], ['ad', 'rla', 'mlsa', 'da', 'dia', 'bca', 'fhda', 'sa', 'ccpa', 'tds', 'nhd', 'wire', 'lead'], ['sofia', 'daniel', 'carmen'], true), true);
  }

  /* ════════════════ Step 3: Seller Disclosures Package ════════════════ */
  function caNewStep2() {
    var discDone = !!run()['pd_ca2-p-disclosures'];
    var tdsRes = run()['r_ca2-tds-review'];
    var tdsDone = !!(tdsRes && tdsRes.length && tdsRes.indexOf(false) === -1);
    var decDone = run()['d_ca2-d-tds-incomplete'] !== undefined;
    var activeIdx = decDone ? 4 : (tdsDone ? 3 : (discDone ? 2 : 0));

    var introCard = card('California Disclosure Requirements',
      'California Civil Code §1102 & Federal Lead Hazard Compliance',
      '<p>California requires one of the most comprehensive seller disclosure packages in the nation. Under state law, sellers must disclose all known material facts affecting property value or desirability. Missing or incomplete disclosure documents give buyers statutory rights to cancel and expose sellers to post-closing litigation.</p>');

    var pickerCard = picker('ca2-p-disclosures', 'Required disclosures for this property', 'Select all required disclosures for 4827 Rolando Blvd.', [
      { t: 'Transfer Disclosure Statement (TDS)', sub: 'Sellers must complete', ok: true },
      { t: 'Seller Property Questionnaire (SPQ)', sub: 'Sellers must complete', ok: true },
      { t: 'Natural Hazard Disclosure (NHD)', sub: 'Order from JCP-LGS', ok: true },
      { t: 'Agent Visual Inspection Disclosure (AVID)', sub: 'Sofia completes', ok: true },
      { t: 'Lead-Based Paint Disclosure', sub: 'REQUIRED, home built 1961 (pre-1978)', ok: true },
      { t: 'Strata (Geological Hazard) Report', sub: 'Not required in this area', ok: false },
      { t: 'Mello-Roos Disclosure', sub: 'No Mello-Roos district', ok: false },
      { t: 'HOA Documents', sub: 'No HOA', ok: false }
    ], 'For 4827 Rolando Blvd: TDS and SPQ are mandatory for all California residential sales. NHD is ordered from a third-party vendor. AVID is completed by the listing agent. The Lead-Based Paint Disclosure is federally required for any home built before 1978 — this home was built in 1961. There\'s no HOA and the property is not in a Mello-Roos district.');

    var tdsForm = form('ca2-tds-review', 'Review the TDS', 'Inspect the completed Transfer Disclosure Statement document for completeness.', [
      { label: 'Are all sections completed?', kind: 'select', ans: 'no', show: 'No — Section III is missing the sellers\' signatures',
        options: [['yes', 'Yes'], ['no', 'No']] },
      { label: 'Foundation issues disclosed?', kind: 'select', ans: 'no', show: 'No — sellers didn\'t mention the foundation',
        options: [['yes', 'Yes'], ['no', 'No']] },
      { label: 'Known defects section complete?', kind: 'select', ans: 'yes', show: 'Yes',
        options: [['yes', 'Yes'], ['no', 'No']] },
      { label: 'Roof condition noted?', kind: 'select', ans: 'yes', show: 'Yes',
        options: [['yes', 'Yes'], ['no', 'No']] },
      { label: 'Plumbing issues?', kind: 'select', ans: 'yes', show: 'Yes — noted slow drain in guest bath',
        options: [['yes', 'Yes'], ['no', 'No']] }
    ]);

    var dec = decision('ca2-d-tds-incomplete',
      'You notice the TDS is missing the sellers\' signatures on Section III, and the sellers did not disclose anything about the foundation in the \'Structural\' section — even though the house is from 1961 and foundation settling is common. What do you do?',
      [
        { t: 'Send the TDS to the buyers as-is. The sellers filled it out, and it\'s not the TC\'s job to tell them what to disclose.', ok: false },
        { t: 'Return the TDS to the sellers with a note that Section III needs their signatures. Flag to Sofia that the structural/foundation section may need the sellers\' attention — but do NOT advise them on what to disclose.', ok: true },
        { t: 'Fill in the foundation section yourself based on what you know about the property\'s age.', ok: false }
      ],
      'The TC reviews disclosures for COMPLETENESS (missing signatures, blank sections), not for accuracy of content. You should never advise sellers on what to disclose or fill in disclosure content — that\'s legal liability. But flagging incomplete sections and missing signatures to the listing agent is exactly your job. Sofia can then follow up with the Herreras about whether the foundation section needs attention.'
    );

    var composeBox = compose({
      key: 'ca2-nhd-order',
      scenario: 'tc-ca-nhd-order',
      prompt: 'Order Natural Hazard Disclosure report from JCP-LGS for 4827 Rolando Blvd',
      to: 'orders@jcp-lgs.com',
      cc: 'sofia.reyes@bhhscal.com',
      subj: 'NHD Report Request: 4827 Rolando Blvd, San Diego',
      inst: 'Order the Natural Hazard Disclosure report for this property. Include the property address, APN, seller names, and any relevant details the vendor needs.',
      ans: 'Hi JCP-LGS Orders Team,\n\nPlease prepare a comprehensive California Natural Hazard Disclosure (NHD) statutory report for our new listing:\n\nProperty Address: 4827 Rolando Blvd, San Diego, CA 92115\nAPN: 470-362-18-00\nSellers: Daniel Herrera & Carmen Herrera\nListing Agent: Sofia Reyes, Berkshire Hathaway HomeServices California Properties\nBrokerage DRE: #01317331 | Agent DRE: #02156789\n\nPlease bill through escrow at closing and email the completed PDF report to this address and CC Sofia Reyes (sofia.reyes@bhhscal.com).\n\nThank you,\nTransaction Coordinator\nBerkshire Hathaway HomeServices California Properties'
    });

    REVEAL['ca2-p-disclosures'] = 'ca2-s2-p2';
    REVEAL['ca2-tds-review'] = 'ca2-s2-p3';
    REVEAL['ca2-d-tds-incomplete'] = 'ca2-s2-p4';

    var main =
      '<div class="wf-phase" style="display:' + (activeIdx === 0 ? 'block' : 'none') + '">' + introCard +
        '<button class="wf-phase-btn" onclick="caNewReveal(\'ca2-s2-p1\')">Begin disclosure review &rarr;</button>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s2-p1" style="display:' + (activeIdx === 1 ? 'block' : 'none') + '">' + pickerCard + '</div>' +
      '<div class="wf-phase" id="ca2-s2-p2" style="display:' + (activeIdx === 2 ? 'block' : 'none') + '">' + tdsForm + '</div>' +
      '<div class="wf-phase" id="ca2-s2-p3" style="display:' + (activeIdx === 3 ? 'block' : 'none') + '">' + dec + '</div>' +
      '<div class="wf-phase" id="ca2-s2-p4" style="display:' + (activeIdx === 4 ? 'block' : 'none') + '">' +
        composeBox +
        '<button class="wf-nav-btn primary" onclick="wfNext()">Continue &rarr;</button>' +
      '</div>';

    return step(3, 'Seller Disclosures Package', 'Thu, Sep 25, 2025',
      'Audit the Herreras\' completed disclosure package for statutory compliance, identify missing signatures, and order the third-party Natural Hazard Disclosure report.',
      main, side([], ['tds', 'spq', 'lead'], ['sofia', 'daniel', 'carmen']), true);
  }

  /* ════════════════ Step 4: Pre-Listing Review & Preliminary Title ════════════════ */
  function caNewStep3() {
    var lienDone = run()['d_ca2-d-lien'] !== undefined;
    var seismicDone = run()['d_ca2-d-nhd-seismic'] !== undefined;
    var activeIdx = seismicDone ? 3 : (lienDone ? 2 : 0);

    var recCard = card('Pre-Listing Reports & Title Status',
      'Review third-party findings prior to MLS activation.',
      timeline([
        ['Sep 27, 2025', 'NHD report received from JCP-LGS (Seismic liquefaction hazard reported)'],
        ['Sep 28, 2025', 'Preliminary title report received from Chicago Title (Exception: $1,200 SDG&E lien)'],
        ['Sep 29, 2025', 'Sofia Reyes completes Agent Visual Inspection Disclosure (AVID)']
      ]));

    var decLien = decision('ca2-d-lien',
      'The preliminary title report shows an old utility lien of $1,200 from San Diego Gas & Electric dated 2019. The Herreras say they paid that bill years ago. What do you do?',
      [
        { t: 'Ignore it. If the sellers say it\'s paid, it\'s paid.', ok: false },
        { t: 'Flag it to Sofia and recommend the sellers provide proof of payment so the title company can clear the lien before closing. An unresolved lien will delay or prevent closing.', ok: true },
        { t: 'Contact SDG&E yourself to resolve the lien on behalf of the sellers.', ok: false }
      ],
      'A TC flags title issues to the listing agent, who works with the sellers to resolve them. The seller needs to provide proof of payment so the title company can issue a clear title. An unresolved lien — even a small one — will show up as an exception on the title policy and can delay closing. The TC does NOT contact third parties on behalf of the sellers without authorization.'
    );

    var decSeismic = decision('ca2-d-nhd-seismic',
      'The NHD report shows the property is in a Seismic Hazard Zone (liquefaction). Daniel is worried this will scare off buyers and asks you: "Can we just not mention this to the buyers?" What do you tell him?',
      [
        { t: 'Agree to leave it out. The NHD is just a recommendation, not legally required.', ok: false },
        { t: 'Tell Daniel that the Natural Hazard Disclosure is legally required in California. The seismic hazard zone must be disclosed. This is common in parts of San Diego and most buyers in this area expect it — it\'s not a deal-killer, but it cannot be hidden. Redirect him to Sofia for any concerns.', ok: true },
        { t: 'Tell Daniel you\'ll highlight it in the MLS listing so buyers know upfront.', ok: false }
      ],
      'NHD is legally mandated in California. Concealing a known hazard zone is a violation of state disclosure law and exposes the seller and agents to serious liability. The TC\'s job is to ensure all required disclosures are complete and delivered — never to edit or suppress them. Redirect the seller\'s concerns to their listing agent.'
    );

    var composeBox = compose({
      key: 'ca2-prelisting-ready',
      scenario: 'tc-ca-prelisting-ready',
      prompt: 'Confirm pre-listing package ready for Sofia Reyes',
      to: 'Sofia Reyes <sofia.reyes@bhhscal.com>',
      subj: 'Listing Package Complete: 4827 Rolando Blvd',
      inst: 'Confirm to Sofia that all pre-listing documents are complete and the listing is ready to go active. Note any items that need attention (the utility lien).',
      ans: 'Hi Sofia,\n\nOur pre-listing package for 4827 Rolando Blvd is now assembled and ready for MLS launch on September 30:\n\n1. RLA: Fully executed ($889,000 list price, 5% commission, chandelier excluded).\n2. Seller Disclosures: TDS and SPQ completed by the Herreras (Section III signatures confirmed).\n3. Lead-Based Paint Disclosure: Signed by Daniel & Carmen.\n4. NHD Report: Received from JCP-LGS (identifies Seismic Liquefaction zone, standard for the area).\n5. AVID: Completed by you on Sep 29.\n6. Preliminary Title: Received from Chicago Title. Important flag: There is an old 2019 SDG&E utility lien of $1,200 showing as Schedule B Exception #4. The Herreras stated they paid this previously; please ask them to locate the payment receipt or cancelled check so title officer Sarah Nguyen can clear the lien prior to closing.\n\nPlease let me know once the listing goes active on the MLS!\n\nBest,\nTransaction Coordinator'
    });

    REVEAL['ca2-d-lien'] = 'ca2-s3-p2';
    REVEAL['ca2-d-nhd-seismic'] = 'ca2-s3-p3';

    var main =
      '<div class="wf-phase" style="display:' + (activeIdx === 0 ? 'block' : 'none') + '">' + recCard +
        '<button class="wf-phase-btn" onclick="caNewReveal(\'ca2-s3-p1\')">Review title findings &rarr;</button>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s3-p1" style="display:' + (activeIdx === 1 ? 'block' : 'none') + '">' + decLien + '</div>' +
      '<div class="wf-phase" id="ca2-s3-p2" style="display:' + (activeIdx === 2 ? 'block' : 'none') + '">' + decSeismic + '</div>' +
      '<div class="wf-phase" id="ca2-s3-p3" style="display:' + (activeIdx === 3 ? 'block' : 'none') + '">' +
        composeBox +
        '<button class="wf-nav-btn primary" onclick="wfNext()">Continue &rarr;</button>' +
      '</div>';

    return step(4, 'Pre-Listing Review & Preliminary Title', 'Mon, Sep 29, 2025',
      'Audit the incoming third-party NHD and preliminary title reports, address title exceptions and statutory hazard zones, and notify Sofia when the file is MLS-ready.',
      main, side([], ['nhd', 'prelim', 'avid'], ['sofia', 'daniel', 'carmen']), true);
  }

  /* ════════════════ Step 5: Offer Received & Counter ════════════════ */
  function caNewStep4() {
    var counterRes = run()['r_ca2-counter'];
    var counterDone = !!(counterRes && counterRes.length && counterRes.indexOf(false) === -1);
    var multDone = run()['d_ca2-d-multiple-offers'] !== undefined;
    var activeIdx = multDone ? 3 : (counterDone ? 2 : 0);

    var offerCard =
      '<div class="wf-email-inbox-wrap">' +
        '<div class="wf-email-client-bar">' +
          '<div class="wf-email-client-left">' +
            '<div class="wf-email-window-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>' +
            '<div class="wf-email-folder"><span class="wf-folder-icon">&#128233;</span> <strong>Inbox</strong> &rsaquo; Offers &rsaquo; 4827 Rolando Blvd</div>' +
          '</div>' +
          '<div class="wf-email-client-right">' +
            '<div class="wf-email-actions">' +
              '<button type="button" class="wf-email-action-btn" title="Reply">&#8617; Reply</button>' +
              '<button type="button" class="wf-email-action-btn" title="Star">&#9733;</button>' +
              '<button type="button" class="wf-email-action-btn" title="Print">&#128438;</button>' +
            '</div>' +
            '<span class="wf-email-tool-tag" style="background:rgba(224,169,59,.18);color:#d97706;border-color:rgba(224,169,59,.4);">&#128181; New Offer Received</span>' +
            '<span class="wf-email-time">Wed, Oct 1, 2025 &middot; 11:20 AM</span>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email">' +
          '<div class="wf-email-header">' +
            '<div class="wf-email-subject-bar">' +
              '<h3 class="wf-email-subject">Offer Submission: 4827 Rolando Blvd &mdash; Jason &amp; Michelle Brooks</h3>' +
              '<span class="wf-email-priority-badge" style="background:rgba(16,185,129,.1);color:#059669;border-color:rgba(16,185,129,.3);">&#128196; Full RPA Attached</span>' +
            '</div>' +
            '<div class="wf-email-sender-profile">' +
              '<div class="wf-email-avatar-wrap">' +
                '<div class="wf-email-avatar" style="background:linear-gradient(135deg, #002d62 0%, #00529b 100%);box-shadow:0 0 0 2.5px #f58220, 0 4px 12px rgba(0,45,98,.2);">ML</div>' +
                '<span class="wf-email-avatar-status" title="Active now"></span>' +
              '</div>' +
              '<div class="wf-email-sender-info">' +
                '<div class="wf-email-sender-line">' +
                  '<span class="wf-email-sender-name">Marcus Lee</span>' +
                  '<span class="wf-email-sender-addr">&lt;marcus.lee@exprealty.com&gt;</span>' +
                  '<span class="wf-badge-verified">&#10003; Verified Agent</span>' +
                  '<span class="wf-badge-broker" style="color:#00529b;border-color:#00529b;">eXp Realty</span>' +
                '</div>' +
                '<div class="wf-email-recipient-line">' +
                  '<span>To: <strong>Sofia Reyes</strong> &lt;sofia.reyes@bhhscal.com&gt; &middot; CC: <strong>TC</strong> &lt;tc@bhhscal.com&gt;</span>' +
                  '<span class="wf-badge-tls">&#128274; TLS 1.3 Encrypted</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="wf-email-body">' +
            '<p>Hi Sofia,</p>' +
            '<p>On behalf of my buyers, <strong>Jason and Michelle Brooks</strong>, I am pleased to submit their complete purchase offer for <strong>4827 Rolando Blvd</strong>:</p>' +
            '<div class="wf-email-terms-grid">' +
              '<div class="wf-term-item"><span>Purchase Price</span><b>$840,000 (Below asking $889K)</b></div>' +
              '<div class="wf-term-item"><span>Financing</span><b>Conventional 20% down ($168,000) &middot; Pacific Home Lending</b></div>' +
              '<div class="wf-term-item"><span>Initial EMD</span><b>$16,800 (2% deposit) to Chicago Title</b></div>' +
              '<div class="wf-term-item"><span>Close of Escrow</span><b>30 days from acceptance</b></div>' +
              '<div class="wf-term-item"><span>Contingencies</span><b>17-day Inspection &middot; 17-day Appraisal &middot; 21-day Loan</b></div>' +
              '<div class="wf-term-item"><span>Home Warranty</span><b>Buyer requests seller pay up to $600</b></div>' +
            '</div>' +
            '<p style="margin-top:14px">Please present to the sellers. My buyers love the neighborhood and have strong pre-approval through Tyler Adams at Pacific Home Lending.</p>' +
            '<div class="wf-sig">' +
              '<div class="wf-sig-valediction">Best regards,</div>' +
              '<div class="wf-sig-card" style="border-left-color:#00529b;">' +
                '<div class="wf-sig-primary">' +
                  '<div class="wf-sig-brand-block" style="background:linear-gradient(145deg, #002d62 0%, #00529b 100%);border-color:rgba(245,130,32,.4);">' +
                    '<div class="wf-sig-broker-emblem" style="border-color:#f58220;background:rgba(245,130,32,.18);">' +
                      '<span class="wf-sig-emblem-initials" style="color:#ffffff;">eXp</span>' +
                    '</div>' +
                    '<div class="wf-sig-brand-title" style="color:#ffffff;">eXp REALTY</div>' +
                    '<div class="wf-sig-brand-sub" style="color:#f58220;">California</div>' +
                    '<div class="wf-sig-brand-loc">San Diego Branch</div>' +
                    '<div class="wf-sig-brand-seal" style="border-top-color:rgba(245,130,32,.3);color:#fed7aa;">COASTAL BUYER GROUP</div>' +
                  '</div>' +
                  '<div class="wf-sig-divider-v" style="background:linear-gradient(180deg, #f58220, var(--v-line));"></div>' +
                  '<div class="wf-sig-agent-details">' +
                    '<div class="wf-sig-name-row">' +
                      '<span class="wf-sig-agent-name">Marcus Lee</span>' +
                      '<span class="wf-sig-badge-realtor" style="background:rgba(0,82,155,.1);color:#00529b;border-color:rgba(0,82,155,.3);">REALTOR&reg;</span>' +
                      '<span class="wf-sig-badge-dre">CalDRE #02198340</span>' +
                    '</div>' +
                    '<div class="wf-sig-title" style="color:#00529b;">Buyer Representation Specialist &middot; The Coastal Group</div>' +
                    '<div class="wf-sig-brokerage-line">eXp Realty of California, Inc. &middot; Corporate DRE #01878277</div>' +
                    '<div class="wf-sig-contact-grid">' +
                      '<div class="wf-sig-contact-item"><span class="wf-sig-icon">&#128222;</span> <strong>Direct:</strong> (619) 555-0291</div>' +
                      '<div class="wf-sig-contact-item"><span class="wf-sig-icon">&#9993;</span> <strong>Email:</strong> marcus.lee@exprealty.com</div>' +
                      '<div class="wf-sig-contact-item"><span class="wf-sig-icon">&#127760;</span> <strong>Web:</strong> marcusleerealty.com</div>' +
                      '<div class="wf-sig-contact-item"><span class="wf-sig-icon">&#128205;</span> <strong>Office:</strong> 4250 Executive Square, Suite 200, La Jolla, CA</div>' +
                    '</div>' +
                    '<div class="wf-sig-badges-row">' +
                      '<span class="wf-sig-pill">San Diego Association of REALTORS®</span>' +
                      '<span class="wf-sig-pill">C.A.R. &amp; NAR Member</span>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var counterForm = form('ca2-counter', 'Counter offer terms', 'Sofia instructs you to prepare Seller Counter Offer #1. Enter terms from Sofia\'s negotiation instructions.', [
      { label: 'Counter price', kind: 'money', ans: 875000, ph: '$', show: '$875,000' },
      { label: 'EMD amount', kind: 'money', ans: 17500, ph: '$', show: '$17,500' },
      { label: 'Close of escrow date', kind: 'date', ans: '2025-11-03', ph: 'mm/dd/yyyy', show: '11/03/2025' },
      { label: 'Inspection contingency days', kind: 'text', ans: ['17', '17 days'], ph: 'Days', show: '17' },
      { label: 'Home warranty', kind: 'select', ans: 'seller', show: 'Seller pays up to $600',
        options: [['seller', 'Seller pays up to $600'], ['buyer', 'Buyer pays'], ['none', 'No warranty']] }
    ]);

    var negTimeline = card('Negotiation Rounds & Ratification',
      'Track contract counters through mutual agreement.',
      timeline([
        ['Oct 1, 2025', 'Buyer submits C.A.R. RPA offer at $840,000 with 30-day close'],
        ['Oct 2, 2025', 'Seller issues Counter Offer #1 at $875,000 with firm Nov 3, 2025 closing deadline'],
        ['Oct 3, 2025', 'Buyer responds with Buyer Counter Offer #1 at $860,000; Seller accepts. Contract ratified at $860,000!']
      ]));

    var dec = decision('ca2-d-multiple-offers',
      'On October 1, just hours after Marcus Lee\'s offer comes in, another buyer\'s agent calls Sofia with a verbal offer of $870,000. Sofia tells you about it. What is the TC\'s role here?',
      [
        { t: 'Tell Sofia to reject Marcus Lee\'s offer and wait for the higher one.', ok: false },
        { t: 'Document both offers and present them to Sofia for the sellers\' consideration. The TC does not advise on which offer to accept — that is the agent\'s and sellers\' decision. Ensure all offers are presented in writing.', ok: true },
        { t: 'Contact the second buyer\'s agent and negotiate directly to get them to submit a written offer.', ok: false }
      ],
      'In California, the listing agent has a fiduciary duty to present ALL offers to the seller. The TC\'s role is administrative: ensure offers are received, documented, and organized for the agent to present. The TC never advises on which offer is better, negotiates terms, or rejects offers. And verbal offers should always be requested in writing before any action is taken.'
    );

    REVEAL['ca2-counter'] = 'ca2-s4-p2';
    REVEAL['ca2-d-multiple-offers'] = 'ca2-s4-nav';

    var main =
      '<div class="wf-phase" style="display:' + (activeIdx === 0 ? 'block' : 'none') + '">' + offerCard +
        '<button class="wf-phase-btn" onclick="caNewReveal(\'ca2-s4-p1\')">Prepare counter offer &rarr;</button>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s4-p1" style="display:' + (activeIdx === 1 ? 'block' : 'none') + '">' + counterForm + '</div>' +
      '<div class="wf-phase" id="ca2-s4-p2" style="display:' + (activeIdx === 2 ? 'block' : 'none') + '">' + negTimeline + dec + '</div>' +
      '<div class="wf-phase" id="ca2-s4-nav" style="display:' + (activeIdx === 3 ? 'block' : 'none') + '">' +
        '<button class="wf-nav-btn primary" onclick="caNewGatedNext()">Continue &rarr;</button>' +
      '</div>';

    return step(5, 'Offer Received & Counter', 'Wed, Oct 1, 2025',
      'Evaluate the incoming purchase offer, prepare Seller Counter Offer #1 to protect the Herreras\' firm November 3 closing date, and track negotiation through final ratification.',
      main, side([], ['offer', 'sco', 'bco'], ['sofia', 'daniel', 'carmen', 'marcus']), true);
  }

  /* ════════════════ Step 6: Acceptance & Open Escrow ════════════════ */
  function caNewStep5() {
    var escrowRes = run()['r_ca2-escrow'];
    var escrowDone = !!(escrowRes && escrowRes.length && escrowRes.indexOf(false) === -1);
    var distDone = !!run()['pd_ca2-p-distribute'];
    var activeIdx = distDone ? 2 : (escrowDone ? 1 : 0);

    var escrowForm = form('ca2-escrow', 'Open escrow', 'Extract key terms from the ratified contract package to open escrow.', [
      { label: 'Escrow company', kind: 'text', ans: ['chicago title'], ph: 'Escrow company', show: 'Chicago Title Company' },
      { label: 'Escrow officer', kind: 'text', ans: ['sarah nguyen', 'nguyen'], ph: 'Escrow officer', show: 'Sarah Nguyen' },
      { label: 'Purchase price', kind: 'money', ans: 860000, ph: '$', show: '$860,000' },
      { label: 'EMD amount', kind: 'money', ans: 17200, ph: '$', show: '$17,200' },
      { label: 'EMD due by', kind: 'date', ans: '2025-10-08', ph: 'mm/dd/yyyy', show: '10/08/2025' },
      { label: 'Close of escrow', kind: 'date', ans: '2025-11-03', ph: 'mm/dd/yyyy', show: '11/03/2025' },
      { label: 'Buyer\'s lender', kind: 'text', ans: ['pacific home lending', 'tyler adams'], ph: 'Lending institution / officer', show: 'Pacific Home Lending (Tyler Adams)' }
    ]);

    var pickerCard = picker('ca2-p-distribute', 'Who gets the executed contract?', 'Select all parties who must receive copies of the ratified contract package.', [
      { t: 'Sarah Nguyen, Chicago Title (escrow officer)', ok: true },
      { t: 'Marcus Lee, eXp Realty (buyer\'s agent)', ok: true },
      { t: 'Tyler Adams, Pacific Home Lending (buyer\'s lender)', ok: true },
      { t: 'Sofia Reyes, BHHS (listing agent — for her records)', ok: true },
      { t: 'Daniel & Carmen Herrera (sellers)', sub: 'Notices go through listing agent', ok: false },
      { t: 'Jerry Sandoval, Precision Home Inspections', sub: 'No role yet', ok: false }
    ], 'The executed contract goes to escrow, both agents, and the lender. Seller copies go through the listing agent (Sofia), not directly to the sellers. The home inspector doesn\'t need the contract until an inspection is scheduled.');

    var composeBox = compose({
      key: 'ca2-escrow-open',
      scenario: 'tc-ca-escrow-open',
      prompt: 'Open escrow with Sarah Nguyen at Chicago Title for 4827 Rolando Blvd',
      to: 'Sarah Nguyen, Chicago Title <sarah.nguyen@ctt.com>',
      cc: 'Sofia Reyes <sofia.reyes@bhhscal.com>, Marcus Lee <marcus.lee@exprealty.com>',
      subj: 'Escrow Opening: 4827 Rolando Blvd, San Diego (Brooks / Herrera)',
      inst: 'Open escrow for this transaction. Include the property address, purchase price, both parties\' names, close of escrow date, and attach the executed contract.',
      ans: 'Hi Sarah,\n\nWe are pleased to open escrow on behalf of Sofia Reyes and Berkshire Hathaway HomeServices California Properties for:\n\nProperty: 4827 Rolando Blvd, San Diego, CA 92115 (APN: 470-362-18-00)\nSellers: Daniel Herrera and Carmen Herrera\nBuyers: Jason Brooks and Michelle Brooks\nAgreed Purchase Price: $860,000.00\nInitial Earnest Money Deposit: $17,200.00 (Due within 3 business days, by October 8, 2025)\nClose of Escrow: November 3, 2025 (FIRM)\nBuyer\'s Agent: Marcus Lee, eXp Realty (marcus.lee@exprealty.com)\nBuyer\'s Lender: Tyler Adams, Pacific Home Lending\n\nAttached please find the fully executed Purchase Agreement package, including C.A.R. RPA, Seller Counter Offer #1, and Buyer Counter Offer #1. Please issue escrow instructions and wire transfer routing details to buyer\'s agent Marcus Lee.\n\nThank you,\nTransaction Coordinator\nBerkshire Hathaway HomeServices California Properties'
    });

    REVEAL['ca2-escrow'] = 'ca2-s5-p1';
    REVEAL['ca2-p-distribute'] = 'ca2-s5-p2';

    var main =
      '<div class="wf-phase" style="display:' + (activeIdx === 0 ? 'block' : 'none') + '">' + escrowForm + '</div>' +
      '<div class="wf-phase" id="ca2-s5-p1" style="display:' + (activeIdx === 1 ? 'block' : 'none') + '">' + pickerCard + '</div>' +
      '<div class="wf-phase" id="ca2-s5-p2" style="display:' + (activeIdx === 2 ? 'block' : 'none') + '">' +
        composeBox +
        '<button class="wf-nav-btn primary" onclick="caNewGatedNext()">Continue &rarr;</button>' +
      '</div>';

    return step(6, 'Acceptance & Open Escrow', 'Fri, Oct 3, 2025',
      'Contract ratified at $860,000! Open escrow with Chicago Title, calculate deposit deadlines, and distribute the executed contract to the transaction principals.',
      main, side([['Escrow #', 'CTT-2025-07421']], ['rpa', 'offer', 'sco', 'bco', 'wire'], ['sofia', 'daniel', 'carmen', 'marcus', 'sarah', 'tyler']), true);
  }

  /* ════════════════ Step 7: EMD & Disclosure Delivery to Buyers ════════════════ */
  function caNewStep6() {
    var emdRes = run()['r_ca2-emd'];
    var emdDone = !!(emdRes && emdRes.length && emdRes.indexOf(false) === -1);
    var decDone = run()['d_ca2-d-emd-late'] !== undefined;
    var activeIdx = decDone ? 2 : (emdDone ? 1 : 0);

    var banner =
      '<div class="box" style="background:#ecfdf5;border:1.5px solid #10b981;border-radius:12px;padding:16px;margin-bottom:18px;">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<div style="font-size:24px;">&#10004;</div>' +
          '<div>' +
            '<div style="font-size:15px;font-weight:800;color:#065f46;">Deposit Confirmed Received in Escrow</div>' +
            '<div style="font-size:13px;color:#047857;">Good faith earnest money deposit of <strong>$17,200.00</strong> confirmed received by Chicago Title Company (Escrow #CTT-2025-07421) on <strong>October 7, 2025</strong> via wire transfer.</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var emdForm = form('ca2-emd', 'Log the deposit', 'Record the verified earnest money deposit details in the case file.', [
      { label: 'EMD amount', kind: 'money', ans: 17200, ph: '$', show: '$17,200' },
      { label: 'Method', kind: 'text', ans: ['wire'], ph: 'Payment method', show: 'Wire transfer' },
      { label: 'Held by', kind: 'text', ans: ['chicago title'], ph: 'Escrow company', show: 'Chicago Title Company' },
      { label: 'Received date', kind: 'date', ans: '2025-10-07', ph: 'mm/dd/yyyy', show: '10/07/2025' },
      { label: 'On time?', kind: 'select', ans: 'yes', show: 'Yes — Oct 7 is within 3 business days of Oct 3',
        options: [['yes', 'Yes'], ['no', 'No']] }
    ]);

    var dec = decision('ca2-d-emd-late',
      'It\'s October 8 (day 5 after acceptance) and the EMD still hasn\'t arrived. Marcus Lee says the buyers "forgot" and will wire it next week. What do you do?',
      [
        { t: 'That\'s fine. Tell Marcus there\'s no rush.', ok: false },
        { t: 'Flag it immediately to Sofia. Under the C.A.R. RPA, the EMD is due within 3 business days of acceptance (by October 8). Missing this deadline gives the seller grounds to cancel. The wire needs to go out today.', ok: true },
        { t: 'Contact the buyers directly and tell them to wire the money immediately.', ok: false }
      ],
      'The EMD deadline is one of the most critical in the transaction. Under the C.A.R. RPA, the deposit must be delivered within 3 business days of acceptance. A missed EMD deadline is a material breach. The TC flags this to the listing agent immediately — the agent decides whether to issue a Notice to Buyer to Perform or give more time. The TC never contacts the buyers directly.'
    );

    var composeBox = compose({
      key: 'ca2-disc-delivery',
      scenario: 'tc-ca-disc-delivery',
      prompt: 'Deliver seller statutory disclosure package to buyers Jason & Michelle Brooks',
      to: 'Jason & Michelle Brooks <jmbrooks.home@email.com>',
      cc: 'Marcus Lee <marcus.lee@exprealty.com>, Sofia Reyes <sofia.reyes@bhhscal.com>',
      subj: 'Disclosure Package: 4827 Rolando Blvd, San Diego',
      attach: ['Transfer Disclosure Statement (TDS)', 'Seller Property Questionnaire (SPQ)', 'JCP-LGS NHD Report', 'Agent Visual Inspection (AVID)', 'Lead-Based Paint Disclosure', 'Preliminary Title Report'],
      inst: 'Deliver the disclosure package to the buyers. Under California Civil Code §1102.3, inform them of their review period and right to cancel. Mention the lead disclosure specifically since this is a pre-1978 home.',
      ans: 'Dear Jason and Michelle,\n\nOn behalf of sellers Daniel and Carmen Herrera and listing agent Sofia Reyes, please find attached the complete California seller disclosure package for 4827 Rolando Blvd:\n\n1. Real Estate Transfer Disclosure Statement (TDS)\n2. Seller Property Questionnaire (SPQ)\n3. JCP-LGS Natural Hazard Disclosure (NHD) Statutory Report\n4. Agent Visual Inspection Disclosure (AVID) completed by Sofia Reyes\n5. Federal Lead-Based Paint and Lead Hazard Disclosure (Required: home constructed in 1961)\n6. Preliminary Title Report from Chicago Title (Order #CTT-2025-07421)\n\nPursuant to California Civil Code §1102.3, you have a statutory period of 5 days after electronic delivery (or 3 days after personal delivery) to review these disclosures, during which you have the right to terminate the agreement if desired. In addition, under federal law, you have a 10-day period from receipt to conduct a lead-based paint hazard inspection.\n\nPlease review, initial and sign where indicated, and return signed copies to our office at your earliest convenience.\n\nBest regards,\nTransaction Coordinator\nBerkshire Hathaway HomeServices California Properties'
    });

    REVEAL['ca2-emd'] = 'ca2-s6-p1';
    REVEAL['ca2-d-emd-late'] = 'ca2-s6-p2';

    var main =
      '<div class="wf-phase" style="display:' + (activeIdx === 0 ? 'block' : 'none') + '">' + banner + emdForm + '</div>' +
      '<div class="wf-phase" id="ca2-s6-p1" style="display:' + (activeIdx === 1 ? 'block' : 'none') + '">' + dec + '</div>' +
      '<div class="wf-phase" id="ca2-s6-p2" style="display:' + (activeIdx === 2 ? 'block' : 'none') + '">' +
        composeBox +
        '<button class="wf-nav-btn primary" onclick="caNewGatedNext()">Continue &rarr;</button>' +
      '</div>';

    return step(7, 'EMD & Disclosure Delivery to Buyers', 'Tue, Oct 7 – Wed, Oct 8, 2025',
      'Track and verify the buyers\' earnest money wire with Chicago Title, then serve the statutory disclosure package to Jason & Michelle Brooks with formal statutory cancellation notices.',
      main, side([['EMD', '$17,200 (received)'], ['Escrow #', 'CTT-2025-07421']], ['tds', 'spq', 'nhd', 'avid', 'lead', 'prelim', 'wire'], ['sofia', 'daniel', 'carmen', 'marcus', 'sarah', 'tyler']), true);
  }

  /* ════════════════ Step 8: Inspections & Repair Negotiation ════════════════ */
  function caNewStep7() {
    var vendorDone = run()['d_ca2-d-vendor'] !== undefined;
    var sellerDone = run()['d_ca2-d-seller-advice'] !== undefined;
    var activeIdx = sellerDone ? 3 : (vendorDone ? 2 : 0);

    var inspectCard = card('Property Inspection Findings & Timeline',
      'The buyers conducted physical, pest, and engineering inspections.',
      timeline([
        ['Oct 14, 2025', 'Home Inspection (Jerry Sandoval, Precision Home Inspections): Found 18-inch horizontal crack on south foundation stem wall; original 1961 HVAC past useful design life.'],
        ['Oct 15, 2025', 'Termite Inspection (Atlas Pest Control #WDO-2025-4128): Section 1 active subterranean termites in garage framing ($1,850 treatment estimate).'],
        ['Oct 17, 2025', 'Foundation Specialist (Pacific Foundation Engineering): Confirms crack is cosmetic settling from soil curing, non-structural; recommends $2,200 epoxy seal.'],
        ['Oct 18, 2025', 'Buyer submits Request for Repair (C.A.R. RR) demanding $12,550 total ($2,200 foundation + $1,850 termite + $8,500 HVAC replacement).'],
        ['Oct 19, 2025', 'Seller responds via C.A.R. RRR: Refuses HVAC replacement; offers $4,500 credit toward buyer closing costs.'],
        ['Oct 20, 2025', 'Day 17 Investigation deadline: Buyer accepts $4,500 credit. Amendment #1 signed; physical contingency removed.']
      ]));

    var calloutWarn = '<div class="lc-callout-warn" style="margin:16px 0;padding:14px 18px;border-radius:10px;background:#fff7ea;border-left:4px solid #f59e0b;color:#92400e;">' +
      '<strong>Critical Deadline — Day 17:</strong> Under paragraph 14 of the C.A.R. RPA, Day 17 (October 20) is the default inspection contingency removal deadline. If a buyer does not remove contingencies or submit an agreed extension, the seller has the legal right to issue a <em>Notice to Buyer to Perform (C.A.R. Form NBP)</em> giving the buyer 48 hours to remove or face cancellation.' +
      '</div>';

    var decVendor = decision('ca2-d-vendor',
      'Before the inspection, Marcus Lee asks you to recommend a foundation company for the specialist assessment. Should you?',
      [
        { t: 'Yes. Recommending vendors and scheduling inspections is a core TC responsibility.', ok: false },
        { t: 'You can help schedule the appointment if requested, but never recommend a specific vendor. Recommending vendors creates liability. Offer a list of licensed contractors if asked, or let the agent choose.', ok: true },
        { t: 'Tell Marcus that inspections are the buyer\'s responsibility and the TC has no role.', ok: false }
      ],
      'A TC coordinates — schedules, confirms, tracks. But recommending specific vendors puts the TC and brokerage in a position of liability. The safe practice is to offer multiple options or let the agent select.'
    );

    var decSeller = decision('ca2-d-seller-advice',
      'Daniel Herrera calls you and says: "The HVAC works fine. I don\'t want to give them anything. What do you think — should we reject the whole repair request?" What do you say?',
      [
        { t: '"I agree, reject everything. The HVAC is functional."', ok: false },
        { t: '"You should at least offer something for the foundation and termites, or you might lose the deal."', ok: false },
        { t: '"That\'s a decision between you and Sofia. I\'ll make sure whatever you decide is documented correctly and signed before the Day 17 deadline. Would you like me to connect you with Sofia to discuss the response?"', ok: true }
      ],
      'The TC does not advise sellers on whether to accept, reject, or counter repair requests. This is a business/negotiation decision between the seller and their agent. The TC\'s role is to ensure paperwork is prepared correctly and deadlines are met.'
    );

    REVEAL['ca2-d-vendor'] = 'ca2-s7-p2';
    REVEAL['ca2-d-seller-advice'] = 'ca2-s7-nav';

    var main =
      '<div class="wf-phase" style="display:' + (activeIdx === 0 ? 'block' : 'none') + '">' + inspectCard + calloutWarn +
        '<button class="wf-phase-btn" onclick="caNewReveal(\'ca2-s7-p1\')">Begin inspection review &rarr;</button>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s7-p1" style="display:' + (activeIdx === 1 ? 'block' : 'none') + '">' + decVendor + '</div>' +
      '<div class="wf-phase" id="ca2-s7-p2" style="display:' + (activeIdx === 2 ? 'block' : 'none') + '">' + decSeller + '</div>' +
      '<div class="wf-phase" id="ca2-s7-nav" style="display:' + (activeIdx === 3 ? 'block' : 'none') + '">' +
        '<button class="wf-nav-btn primary" onclick="wfNext()">Continue &rarr;</button>' +
      '</div>';

    return step(8, 'Inspections & Repair Negotiation', 'Oct 14 – Oct 20, 2025',
      'Manage inspection reports, coordinate specialist evaluations, navigate seller repair negotiations under Day 17 pressure, and secure executed Amendment #1.',
      main, side([['Repair credit', '$4,500 (agreed)'], ['Day 17', 'Oct 20, 2025']], ['inspect', 'termite', 'foundation', 'rr', 'sellerRR', 'amend1'], ['sofia', 'daniel', 'carmen', 'marcus', 'sarah', 'tyler']), true,
      { text: 'Physical Inspection Contingency Deadline: Day 17 is Oct 20, 2025. Buyer must submit Request for Repair or remove contingency.', days: '3 days remaining', critical: false });
  }

  /* ════════════════ Step 9: Appraisal, Contingencies & Wire Fraud ════════════════ */
  function caNewStep8() {
    var extDone = run()['d_ca2-d-extension'] !== undefined;
    var amend2Res = run()['r_ca2-amend2'];
    var amend2Done = !!(amend2Res && amend2Res.length && amend2Res.indexOf(false) === -1);
    var wireDone = run()['d_ca2-d-wire'] !== undefined;
    var activeIdx = wireDone ? 4 : (amend2Done ? 3 : (extDone ? 2 : 0));

    var appraisalCard = card('Appraisal Gap Negotiation Timeline',
      'Handling appraisal shortfalls and financing contingencies.',
      timeline([
        ['Oct 20, 2025', 'Appraisal contingency deadline. Lender appraiser delayed; buyer requests written extension.'],
        ['Oct 21, 2025', 'Appraisal contingency extended to October 27 via mutually signed extension agreement.'],
        ['Oct 23, 2025', 'Appraisal delivered: Appraised at $845,000 — $15,000 shortfall below the $860,000 contract price.'],
        ['Oct 24, 2025', 'Day 21 Loan Contingency deadline: Pacific Home Lending issues conditional approval; buyer removes loan contingency.'],
        ['Oct 25, 2025', 'Sofia negotiates compromise: Parties agree to split the $15,000 gap 50/50. Price reduced to $852,500 (Amendment #2 signed).'],
        ['Oct 27, 2025', 'Buyer removes appraisal contingency. ALL contingencies are now fully removed!']
      ]));

    var decExt = decision('ca2-d-extension',
      'Marcus Lee says: "Extensions are automatic in California. You don\'t need the seller to agree — just log it." Is this correct?',
      [
        { t: 'Yes. California contingency extensions are automatic if the buyer sends written notice before the deadline.', ok: false },
        { t: 'No. In California, a contingency extension requires mutual written agreement. Both parties must sign. If the seller refuses, the buyer must remove the contingency by the original deadline or risk a Notice to Buyer to Perform.', ok: true },
        { t: 'Extensions don\'t exist. The buyer must either remove the contingency or cancel.', ok: false }
      ],
      'California contingency extensions are NOT automatic or unilateral. They require a signed amendment agreed to by both parties.'
    );

    var phishCard =
      '<div class="wf-email-inbox-wrap">' +
        '<div class="wf-email-client-bar" style="background:#b91c1c;color:#fff;">' +
          '<div class="wf-email-folder" style="color:#fff;"><span class="wf-folder-icon">&#9888;</span> <strong>FORWARDED SUSPICIOUS EMAIL AUDIT</strong></div>' +
          '<div class="wf-email-tools">' +
            '<span class="wf-email-tool-tag" style="background:rgba(255,255,255,.2);color:#fff;">High Priority Alert</span>' +
            '<span class="wf-email-time" style="color:#fee2e2;">Wed, Oct 29, 2025, 2:42 PM</span>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email wf-email-phish" style="border:2px solid #ef4444;">' +
          '<div class="wf-email-header">' +
            '<div class="wf-email-sender-profile">' +
              '<div class="wf-email-avatar spoof" style="background:#fee2e2;color:#b91c1c;">SN</div>' +
              '<div class="wf-email-sender-info">' +
                '<div class="wf-email-sender-line">' +
                  '<strong style="color:#b91c1c;">Sarah Nquyen</strong> &lt;snguyen@chicago-titleco.com&gt;' +
                  '<span class="wf-badge-broker" style="background:#fee2e2;color:#b91c1c;">SPOOFED DOMAIN</span>' +
                '</div>' +
                '<div class="wf-email-recipient-line">To: jmbrooks.home@email.com &middot; CC: marcus.lee@exprealty.com</div>' +
              '</div>' +
            '</div>' +
            '<div class="wf-email-subject" style="color:#b91c1c;font-weight:800;">URGENT — Updated Wire Instructions for 4827 Rolando Blvd</div>' +
          '</div>' +
          '<div class="wf-email-body">' +
            '<p style="color:#b91c1c;font-weight:700;">URGENT: Our incoming wire system is undergoing emergency server maintenance. Please wire your closing balance of $158,240 immediately to our auxiliary settlement account to avoid deal cancellation.</p>' +
            '<div class="box" style="border:1.5px dashed #b91c1c;background:#fff5f5;">' +
              '<div><strong>Bank:</strong> Metropol Commercial Depository</div>' +
              '<div><strong>Routing:</strong> 121049281 &middot; <strong>Account:</strong> 9940-1284-9182</div>' +
              '<div><strong>Beneficiary:</strong> Escrow Closing Disbursements LLC</div>' +
            '</div>' +
            '<p style="font-size:12px;color:#666;">Do not call our office today as phone lines are currently down for updates. Reply directly to this email with wire receipt.</p>' +
            '<div class="wf-sig">Sarah Nquyen, Escrow Officer &middot; Chicago Title Co.</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var decWire = decision('ca2-d-wire',
      'The buyers forward this email to you asking for confirmation. What do you do?',
      [
        { t: 'Forward the updated instructions to Sofia and confirm they should wire to the new account.', ok: false },
        { t: 'Reply to the email asking Sarah to confirm the change.', ok: false },
        { t: 'Do NOT forward or act on this email. The sender name is misspelled (\'Nquyen\' not \'Nguyen\') and the domain is wrong. Call Sarah Nguyen directly on the phone number you already have on file to verify. Alert all parties that a fraud attempt is in progress.', ok: true }
      ],
      'Wire fraud is the #1 financial crime targeting real estate. Red flags: misspelled name, wrong domain, \'URGENT\' pressure, mid-transaction instruction change. Always verify wire instructions by phone using a known number. A TC who catches this saves the buyers their entire down payment.'
    );

    var amend2Form = form('ca2-amend2', 'Amendment #2: Price reduction', 'Record the negotiated price amendment following the appraisal gap compromise.', [
      { label: 'Original price', kind: 'money', ans: 860000, ph: '$', show: '$860,000' },
      { label: 'New price', kind: 'money', ans: 852500, ph: '$', show: '$852,500' },
      { label: 'Reason', kind: 'text', ans: ['appraisal'], ph: 'Reason for price reduction', show: 'Appraisal shortfall / split gap' },
      { label: 'Appraisal value', kind: 'money', ans: 845000, ph: '$', show: '$845,000' },
      { label: 'Gap amount', kind: 'money', ans: 15000, ph: '$', show: '$15,000' }
    ]);

    REVEAL['ca2-d-extension'] = 'ca2-s8-p2';
    REVEAL['ca2-amend2'] = 'ca2-s8-p3';
    REVEAL['ca2-d-wire'] = 'ca2-s8-nav';

    var main =
      '<div class="wf-phase" style="display:' + (activeIdx === 0 ? 'block' : 'none') + '">' + appraisalCard +
        '<button class="wf-phase-btn" onclick="caNewReveal(\'ca2-s8-p1\')">Review appraisal contingency &rarr;</button>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s8-p1" style="display:' + (activeIdx === 1 ? 'block' : 'none') + '">' + decExt + '</div>' +
      '<div class="wf-phase" id="ca2-s8-p2" style="display:' + (activeIdx === 2 ? 'block' : 'none') + '">' + amend2Form + '</div>' +
      '<div class="wf-phase" id="ca2-s8-p3" style="display:' + (activeIdx === 3 ? 'block' : 'none') + '">' + phishCard + decWire + '</div>' +
      '<div class="wf-phase" id="ca2-s8-nav" style="display:' + (activeIdx === 4 ? 'block' : 'none') + '">' +
        '<button class="wf-nav-btn primary" onclick="caNewGatedNext()">Continue &rarr;</button>' +
      '</div>';

    return step(9, 'Appraisal, Contingencies & Wire Fraud', 'Oct 20 – Oct 29, 2025',
      'Resolve the $15,000 appraisal shortfall via Amendment #2, confirm contingency removals, and intercept an aggressive cyber wire fraud attempt.',
      main, side([['Original price', '$860,000'], ['Appraisal', '$845,000'], ['New price', '$852,500']], ['appraisal', 'extAppr', 'amend2', 'wireFraud'], ['sofia', 'daniel', 'carmen', 'marcus', 'sarah', 'tyler']), true,
      { text: 'Appraisal Contingency Deadline: Extended to Oct 27, 2025. Lender appraisal completed at $845,000 ($15,000 short of contract price).', days: '2 days remaining', critical: false });
  }

  /* ════════════════ Step 10: Closing & Post-Closing ════════════════ */
  function caNewStep9() {
    var activeIdx = run()['post_close_started'] ? 1 : 0;

    var checkCard = card('Closing Readiness Checklist',
      'All pre-closing requirements verified and satisfied.',
      '<div class="check-grid" style="margin:12px 0;">' +
        '<div class="check-item"><span class="check-box checked"></span> <span><strong>Price Amendment:</strong> $852,500 ratified (Amendment #2 signed Oct 25)</span></div>' +
        '<div class="check-item"><span class="check-box checked"></span> <span><strong>Repair Credit:</strong> $4,500 closing credit confirmed (Amendment #1 signed Oct 20)</span></div>' +
        '<div class="check-item"><span class="check-box checked"></span> <span><strong>Contingencies Removed:</strong> Investigation (Oct 20), Loan (Oct 24), Appraisal (Oct 27)</span></div>' +
        '<div class="check-item"><span class="check-box checked"></span> <span><strong>Loan Documents:</strong> Received by Chicago Title from Pacific Home Lending (Oct 28)</span></div>' +
        '<div class="check-item"><span class="check-box checked"></span> <span><strong>Buyer Signing:</strong> Jason &amp; Michelle Brooks signed loan &amp; escrow documents (Oct 30)</span></div>' +
        '<div class="check-item"><span class="check-box checked"></span> <span><strong>Seller Signing:</strong> Daniel &amp; Carmen Herrera executed grant deed with mobile notary (Oct 31)</span></div>' +
        '<div class="check-item"><span class="check-box checked"></span> <span><strong>Final Walkthrough:</strong> Verification of Property Condition signed by buyers (Nov 2)</span></div>' +
        '<div class="check-item"><span class="check-box checked"></span> <span><strong>Closing Wire:</strong> Buyer closing funds verified verbally by phone with Sarah Nguyen (Nov 2)</span></div>' +
        '<div class="check-item"><span class="check-box checked"></span> <span><strong>Lien Cleared:</strong> SDG&amp;E $1,200 utility lien release confirmed by Chicago Title</span></div>' +
        '<div class="check-item"><span class="check-box checked"></span> <span><strong>Recording:</strong> San Diego County Recorder confirms deed recording (Nov 3, 2025)</span></div>' +
      '</div>');

    var vpcBanner =
      '<div class="box" style="background:#f0fdf4;border:1.5px solid #22c55e;border-radius:12px;padding:16px;margin-bottom:18px;">' +
        '<div style="font-size:15px;font-weight:800;color:#15803d;margin-bottom:4px;">&#127968; Verification of Property Condition &amp; Recording Confirmed!</div>' +
        '<div style="font-size:13.5px;color:#166534;line-height:1.6;">' +
          'Verification of Property Condition (C.A.R. Form VP) was completed and signed by Jason &amp; Michelle Brooks on November 2, 2025. Deed recorded in San Diego County Official Records at 8:44 AM on November 3, 2025. Keys delivered. The Herreras have officially closed on schedule for their Austin move!' +
        '</div>' +
      '</div>';

    var composeBox = compose({
      key: 'ca2-post-close',
      scenario: 'tc-ca-post-close',
      prompt: 'Send final closing wrap-up email for 4827 Rolando Blvd',
      to: 'Sofia Reyes <sofia.reyes@bhhscal.com>, Marcus Lee <marcus.lee@exprealty.com>, Sarah Nguyen <sarah.nguyen@ctt.com>',
      cc: 'Daniel & Carmen Herrera <herrera.family@email.com>',
      subj: 'Closed: 4827 Rolando Blvd, San Diego (Recording Confirmed)',
      attach: ['Final ALTA Settlement Statement', 'Recording Confirmation Notice'],
      inst: 'Confirm the file closed on November 3, 2025. Note the final sale price of $852,500, the $4,500 repair credit, and confirm all documents are archived.',
      ans: 'Congratulations Everyone,\n\nWe are thrilled to confirm that the sale of 4827 Rolando Blvd, San Diego, CA 92115 has officially closed escrow today, Monday, November 3, 2025! Recording has been confirmed by the San Diego County Recorder.\n\nFinal Transaction Summary:\n• Final Sale Price: $852,500.00\n• Repair Credit to Buyer: $4,500.00 (Amendment #1)\n• Earnest Money Deposit: $17,200.00 credited\n• Escrow & Title: Chicago Title Company (Sarah Nguyen, Escrow #CTT-2025-07421)\n• Sellers: Daniel & Carmen Herrera — congratulations on your move to Austin!\n• Buyers: Jason & Michelle Brooks — congratulations on your new home!\n\nAll executed documents, disclosures, inspection reports, amendments, and the final ALTA Settlement Statement have been audited and archived in our compliance file.\n\nThank you all for a seamless closing!\n\nWarm regards,\nTransaction Coordinator\nBerkshire Hathaway HomeServices California Properties'
    });

    var evalBox = card('Workflow Validation & Performance Assessment',
      'Comprehensive 10-step transaction lifecycle completed.',
      '<div style="margin-bottom:14px;font-size:13.5px;color:var(--v-ink);line-height:1.6;">' +
        'You have successfully coordinated the seller-side transaction from initial listing assignment through close of escrow:' +
        '<ul style="margin:8px 0 14px;padding-left:22px;">' +
          '<li>Set up the listing file and audited statutory California disclosure requirements</li>' +
          '<li>Verified 12 essential fields of C.A.R. Form RLA and preserved heirloom fixture exclusion</li>' +
          '<li>Audited TDS completeness, caught missing signatures, and ordered NHD report</li>' +
          '<li>Cleared title exception ($1,200 SDG&amp;E lien) and addressed seismic liquefaction zone</li>' +
          '<li>Managed offer negotiation and counters to protect the seller\'s firm closing deadline</li>' +
          '<li>Opened escrow with Chicago Title and distributed ratified contracts</li>' +
          '<li>Tracked $17,200 EMD wire and delivered full disclosure package with statutory notices</li>' +
          '<li>Coordinated inspection findings and negotiated $4,500 repair credit under Day 17 deadline</li>' +
          '<li>Resolved $15,000 appraisal gap (Amendment #2 at $852,500) and intercepted cyber wire fraud</li>' +
          '<li>Archived compliance file and issued final post-closing accounting wrap-up</li>' +
        '</ul>' +
      '</div>' +
      '<div id="wf-eval-container"></div>');

    var main =
      '<div class="wf-phase" style="display:' + (activeIdx === 0 ? 'block' : 'none') + '">' + checkCard + vpcBanner +
        '<button class="wf-phase-btn" onclick="run()[\'post_close_started\'] = 1; caNewReveal(\'ca2-s9-p1\')">Complete post-closing &rarr;</button>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s9-p1" style="display:' + (activeIdx === 1 ? 'block' : 'none') + '">' + composeBox + evalBox + '</div>';

    return step(10, 'Closing & Post-Closing', 'Mon, Nov 3, 2025',
      'Escrow closed and recording confirmed! Complete the post-closing wrap-up, issue the final settlement statement, and review your simulator scorecard.',
      main, side([['Status', 'Closed Nov 3, 2025'], ['Final price', '$852,500'], ['Repair credit', '$4,500']], ['settlement'], ['sofia', 'daniel', 'carmen', 'marcus', 'sarah', 'tyler']), true,
      { text: 'Hard Closing Deadline: Relocation departure for Austin, TX is mandatory by close of business TODAY, Nov 3, 2025.', days: 'CLOSING DAY', critical: true });
  }

  /* ════════════════ HINT SYSTEM DATA ("ASK SOFIA") ════════════════ */
  var STEP_HINTS = {
    0: [
      "Check Sofia's email closely — key details like APN, seller names, year built, list price, and listing dates are explicitly stated.",
      "For the pre-listing package: the TC prepares the RLA and C.A.R. advisory forms (AD, BCA, MLSA, DIA, DA, FHDA, SA, CCPA) in Zipforms. The sellers complete the TDS and SPQ. The TC orders the NHD from a vendor and the prelim title from the title company. AVID is completed by the listing agent. The home was built in 1961 (pre-1978), which triggers the mandatory federal Lead-Based Paint disclosure.",
      "Before preparing the RLA, identify what Sofia DIDN'T include: buyer's agent comp split (post-NAR requirement), how the sellers hold title, lockbox authorization, and sign authorization. A proactive TC catches these gaps early."
    ],
    1: [
      "Start with the Launch Pad: a listing transaction needs the RLA, Agency Disclosure (AD), and Wire Fraud Advisory. The RPA and Counter Offer are buyer-side forms.",
      "For the RLA: property type is SFR, listing type is Exclusive Right to Sell, vesting is Joint Tenants. Commission is 5% total with 2.5% offered to buyer’s agent (post-NAR). Carmen’s chandelier must be excluded in the Items Excluded section.",
      "Property: 4827 Rolando Blvd, APN 470-362-18-00. Sellers: Daniel & Carmen Herrera (Joint Tenants). List price $889,000. Commission 5% (2.5% to buyer agent). Brokerage DRE #01317331. Listing dates Sep 24, 2025 to Mar 24, 2026. Included: refrigerator, washer, dryer. Excluded: antique dining room chandelier."
    ],
    2: [
      "Remember the TC's duty regarding seller disclosures: review for completeness, not content accuracy or legal interpretation.",
      "Check Section III of the TDS for signatures. If any section is blank or unsigned, flag it to Sofia — do not write in answers yourself.",
      "Required: TDS, SPQ, NHD, AVID, Lead-Based Paint. No HOA or Mello-Roos. TDS is missing Section III seller signatures. Return to sellers for signature and flag to Sofia without advising on what to disclose."
    ],
    3: [
      "Examine Sofia's AVID report and the JCP-LGS NHD report for material disclosure requirements.",
      "Notice the NHD flags a Seismic Hazard (liquefaction zone). As TC, ensure this report is included in the statutory package delivered to buyers.",
      "AVID notes water stains and hairline cracks. NHD identifies seismic liquefaction. Ensure both reports are documented in the master disclosure index."
    ],
    4: [
      "Review buyer Jason & Michelle Brooks' purchase offer (C.A.R. RPA) against the sellers' relocation deadline.",
      "Marcus Lee offered $840,000 with a 45-day close. But Daniel and Carmen MUST close by November 3 to relocate to Austin.",
      "Counter at $875,000 with a firm November 3 closing date. When buyers counter at $860,000 keeping Nov 3, recommend acceptance because the date is non-negotiable."
    ],
    5: [
      "Escrow opening requires sending the ratified RPA and counter offers to Chicago Title Company with earnest money instructions.",
      "Ensure Sarah Nguyen receives the complete ratified agreement (RPA + SCO #1 + BCO #1).",
      "Chicago Title escrow officer is Sarah Nguyen. Wire fraud prevention warning must accompany initial escrow opening communications."
    ],
    6: [
      "California C.A.R. RPA requires Earnest Money Deposit (EMD) within 3 business days of acceptance.",
      "Track receipt of the $17,200 EMD (2% of $860,000) from Chicago Title. Deliver the statutory seller disclosure package within 7 days.",
      "Verify Chicago Title's Escrow Receipt confirming $17,200 wired. Serve the full disclosure packet to Marcus Lee."
    ],
    7: [
      "The buyer's 17-day physical inspection contingency deadline is approaching. Jerry Sandoval's inspection report noted plumbing and electrical issues.",
      "Buyer requested $12,550 in repairs. Daniel and Carmen are willing to offer a $4,500 repair credit at closing instead of doing physical repairs.",
      "Draft C.A.R. Amendment #1 reflecting a $4,500 seller closing cost credit in lieu of repairs, signed by both parties."
    ],
    8: [
      "Lender Western Valuation appraised at $845,000 — $15,000 short of the $860,000 purchase price. Watch out for phishing emails!",
      "Examine the email from 'Sarah Nquyen' (note the 'q' instead of 'g'). Never verify wire instructions via email — always verify in person or via telephone.",
      "Negotiate price compromise: split gap to $852,500. Flag spoofed wire fraud email immediately to listing agent and escrow."
    ],
    9: [
      "Review final ALTA settlement statement, recording confirmation, and assemble compliance file.",
      "Verify final price $852,500, repair credit $4,500, recording number, and commission disbursement.",
      "Send congratulatory wrap-up email to Daniel & Carmen Herrera and archive the transaction file for 5-year DRE compliance."
    ]
  };

  /* ════════════════ EXPORT ════════════════ */
  window.TC_CA_NEW_CASE = {
    type: 'workflow',
    usePipeline: true,
    tag: 'California · Full Transaction',
    title: '4827 Rolando Blvd: Full Transaction Workflow',
    desc: 'A full seller-side TC workflow from listing assignment through close of escrow: listing agreement preparation, seller disclosures, pre-listing review, offer negotiation, escrow management, inspections, appraisal gap, wire fraud, and post-closing.',
    stepCount: 10,
    specs: [
      { label: 'List Price', value: '$889,000' },
      { label: 'Sellers', value: 'Daniel &amp; Carmen Herrera' },
      { label: 'Escrow Scope', value: '10 End-to-End Steps' },
      { label: 'Key TC Scope', value: 'NAR Split, Solar, Wire Defense' }
    ],
    onReset: function () {
      if (typeof window.caNewResetCase === 'function') {
        window.caNewResetCase();
      }
    },
    wfLabels: [
      'New Listing Assignment',
      'Listing Agreement & File Setup',
      'Seller Disclosures',
      'Pre-Listing Review',
      'Offer & Counter',
      'Open Escrow',
      'EMD & Disclosures',
      'Inspections & Repairs',
      'Appraisal & Wire Fraud',
      'Closing & Post-Closing'
    ],
    wfSteps: [
      caNewStep0,
      caNewStep1,
      caNewStep2,
      caNewStep3,
      caNewStep4,
      caNewStep5,
      caNewStep6,
      caNewStep7,
      caNewStep8,
      caNewStep9
    ],
    wfAfterRender: {
      0: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[0]); },
      1: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[1]); },
      2: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[2]); },
      3: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[3]); },
      4: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[4]); },
      5: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[5]); },
      6: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[6]); },
      7: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[7]); },
      8: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[8]); },
      9: function () {
        if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[9]);
        if (typeof wfRenderFinalScore === 'function') wfRenderFinalScore('wf-eval-container', 'tc', 'ca-new', 10);
        if (typeof wfConfetti === 'function') wfConfetti();
      }
    }
  };
})();
