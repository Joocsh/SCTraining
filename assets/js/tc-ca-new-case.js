/* ══════════════════════════════════════════════════════════
   CASE SIMULATOR: Transaction Coordinator, California
   Fictional case: 4827 Rolando Blvd, San Diego, CA 92115
   Seller side (Sofia Reyes, Berkshire Hathaway HomeServices).
   Full TC workflow from listing assignment through close of
   escrow: listing agreement preparation, offer negotiation,
   escrow management, inspections, appraisal gap, wire fraud,
   and post-closing.
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

  var esc = (typeof window !== 'undefined' && typeof window.esc === 'function')
    ? window.esc
    : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  var DIR = '../assets/docs/tc-ca-new/';
  var DOCS = {
    rla:        ['listing-agreement.pdf', 'Exclusive Right to Sell Agreement', 'Executed Listing Contract · 4827 Rolando Blvd'],
    ad:         ['agency-disclosure.pdf', 'Agency Representation Disclosure', 'Broker-Client Relationship & Duties · Sep 24, 2025'],
    mlsa:       ['mls-addendum.pdf', 'Multiple Listing Service Addendum', 'San Diego Regional MLS Marketing Authorization'],
    da:         ['dual-agency-disclosure.pdf', 'Consent for Multiple Representation', 'Agency Representation of More Than One Buyer/Seller'],
    dia:        ['disclosure-information-advisory.pdf', 'Statutory Disclosures Advisory', 'Property Disclosures & Information Guidelines for Sellers'],
    bca:        ['broker-compensation-advisory.pdf', 'Broker Compensation & Fee Advisory', 'Commission Structure & Cooperating Terms'],
    fhda:       ['fair-housing-advisory.pdf', 'Fair Housing & Equal Opportunity', 'Non-Discrimination Policy & Federal/State Compliance'],
    sa:         ['sellers-advisory.pdf', 'Statewide Property Seller Advisory', 'Seller Duties, Tax, & Property Disclosures'],
    ccpa:       ['ccpa-advisory.pdf', 'California Consumer Privacy Notice', 'Consumer Privacy Rights & Advisory'],
    wire:       ['wire-fraud-email-screenshot.pdf', 'Wire Fraud Advisory & Defense Notice', 'Critical Advisory Signed by Daniel & Carmen Herrera'],
    tds:        ['tds-disclosure.pdf', 'Transfer Disclosure Statement', 'C.A.R. TDS · Completed by Daniel & Carmen Herrera'],
    spq:        ['spq-questionnaire.pdf', 'Seller Property Questionnaire', 'C.A.R. SPQ · Completed by sellers'],
    nhd:        ['nhd-report.pdf', 'Natural Hazard Disclosure', 'JCP-LGS · Seismic Hazard Zone (liquefaction)'],
    avid:       ['avid-inspection.pdf', 'Agent Visual Inspection', 'C.A.R. AVID · Completed by Sofia Reyes, BHHS'],
    lead:       ['lead-paint-disclosure.pdf', 'Lead-Based Paint Disclosure', 'Required · Home built 1961 (pre-1978)'],
    prelim:     ['preliminary-title-report.pdf', 'Preliminary Title Report', 'Chicago Title Company · $1,200 SDG&E Lien'],
    offer:      ['buyer-offer.pdf', "Buyer's Offer (C.A.R. RPA)", 'Marcus Lee for Jason & Michelle Brooks · $840,000'],
    offer2:     ['buyer-offer-2.pdf', "Buyer's Offer #2 (Cash)", 'Rachel Torres for Kevin & Priya Patel · $855,000 Cash'],
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
    var allBtns = document.querySelectorAll('.mh-doc[data-doc]');
    if (!allBtns || !allBtns.length) return;
    var vis = 0;
    allBtns.forEach(function (btn) {
      if (keys.indexOf(btn.getAttribute('data-doc')) > -1) {
        btn.style.display = '';
        vis++;
      } else {
        btn.style.display = 'none';
      }
    });
    var countEls = document.querySelectorAll('.mh-docs-count, .tc-docs-count');
    countEls.forEach(function (el) { el.textContent = vis; });
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
    'sofia': { name: 'Sofia Reyes', role: 'Listing Agent', brokerage: 'BHHS California Properties', email: 'sofia.reyes@bhhscal.com', phone: '(619) 555-0312', initials: 'SR', color: 'linear-gradient(135deg, #7c1d34, #a82d4a)' },
    'daniel': { name: 'Daniel Herrera', role: 'Seller (Owner)', brokerage: 'Property Owner', email: 'herrera.family@email.com', phone: '(619) 555-0488', initials: 'DH', color: 'linear-gradient(135deg, #0284c7, #0369a1)' },
    'carmen': { name: 'Carmen Herrera', role: 'Seller (Co-Owner)', brokerage: 'Property Owner', email: 'herrera.family@email.com', phone: '(619) 555-0488', initials: 'CH', color: 'linear-gradient(135deg, #0284c7, #0369a1)' },
    'marcus': { name: 'Marcus Lee', role: "Buyer's Agent", brokerage: 'eXp Realty California', email: 'marcus.lee@exprealty.com', phone: '(619) 555-0291', initials: 'ML', color: 'linear-gradient(135deg, #d97706, #b45309)' },
    'rachel': { name: 'Rachel Torres', role: 'Competing Buyer Agent', brokerage: 'Compass California', email: 'rachel.torres@compass.com', phone: '(619) 555-0385', initials: 'RT', color: 'linear-gradient(135deg, #059669, #047857)' },
    'sarah': { name: 'Sarah Nguyen', role: 'Escrow Officer', brokerage: 'Chicago Title Company', email: 'sarah.nguyen@ctt.com', phone: '(619) 555-0144', initials: 'SN', color: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
    'tyler': { name: 'Tyler Adams', role: 'Mortgage Loan Officer', brokerage: 'Pacific Home Lending', email: 'tyler.adams@pacificlending.com', phone: '(619) 555-0277', initials: 'TA', color: 'linear-gradient(135deg, #0891b2, #0e7490)' }
  };

  var DOC_TYPES = {
    rla:        { type: 'contract',   badge: 'signed', label: 'Listing Contract' },
    ad:         { type: 'disclosure', badge: 'signed', label: 'Agency Disclosure' },
    mlsa:       { type: 'contract',   badge: 'signed', label: 'MLS Addendum' },
    da:         { type: 'disclosure', badge: 'signed', label: 'Dual Agency' },
    dia:        { type: 'disclosure', badge: 'signed', label: 'Statutory Advisory' },
    bca:        { type: 'contract',   badge: 'signed', label: 'Broker Comp' },
    fhda:       { type: 'disclosure', badge: 'signed', label: 'Fair Housing' },
    sa:         { type: 'disclosure', badge: 'signed', label: "Seller's Advisory" },
    ccpa:       { type: 'disclosure', badge: 'signed', label: 'Privacy Notice' },
    wire:       { type: 'disclosure', badge: 'signed', label: 'Wire Fraud Adv.' },
    tds:        { type: 'disclosure', badge: 'draft',  label: 'TDS Disclosure' },
    spq:        { type: 'disclosure', badge: 'draft',  label: 'SPQ Questionnaire' },
    nhd:        { type: 'report',     badge: 'draft',  label: 'NHD Report' },
    avid:       { type: 'disclosure', badge: 'draft',  label: 'AVID Inspection' },
    lead:       { type: 'disclosure', badge: 'signed', label: 'Lead Paint' },
    prelim:     { type: 'report',     badge: 'draft',  label: 'Title Report' },
    offer:      { type: 'contract',   badge: 'signed', label: "Buyer's Offer" },
    offer2:     { type: 'contract',   badge: 'signed', label: 'Cash Offer' },
    sco:        { type: 'contract',   badge: 'signed', label: 'Counter Offer #1' },
    bco:        { type: 'contract',   badge: 'signed', label: 'Buyer Counter #1' },
    rpa:        { type: 'contract',   badge: 'signed', label: 'Ratified Purchase' },
    inspect:    { type: 'report',     badge: 'signed', label: 'Home Inspection' },
    termite:    { type: 'report',     badge: 'signed', label: 'WDO Pest Report' },
    foundation: { type: 'report',     badge: 'signed', label: 'Engineering Report' },
    rr:         { type: 'contract',   badge: 'signed', label: 'Request for Repair' },
    sellerRR:   { type: 'contract',   badge: 'signed', label: 'Seller Response' },
    amend1:     { type: 'contract',   badge: 'signed', label: 'Repair Amendment' },
    appraisal:  { type: 'report',     badge: 'signed', label: 'Appraisal Report' },
    extAppr:    { type: 'contract',   badge: 'signed', label: 'Contingency Ext.' },
    amend2:     { type: 'contract',   badge: 'signed', label: 'Price Reduction' },
    wireFraud:  { type: 'report',     badge: 'locked', label: 'Phishing Email' },
    settlement: { type: 'report',     badge: 'signed', label: 'ALTA Settlement' }
  };

  var TC_DEADLINES = [
    {
      id: 'emd',
      name: 'EMD Due: Oct 8',
      desc: '$17,200 (3 business days from acceptance)',
      daysLeft: function (s) {
        if (s <= 3) return { days: 'Due Oct 8 (3d)', cls: 'yellow' };
        if (s === 4) return { days: '2 days left (Oct 8)', cls: 'red' };
        return { met: true, label: 'Met (Oct 8)' };
      }
    },
    {
      id: 'day17',
      name: 'Day 17 Inspections: Oct 20',
      desc: 'Physical, pest & engineering inspections',
      daysLeft: function (s) {
        if (s <= 4) return { days: 'Due Oct 20', cls: 'green' };
        if (s === 5) return { days: '12 days left', cls: 'green' };
        if (s === 6) return { days: 'Due Today (5 PM)', cls: 'red' };
        return { met: true, label: 'Met (Oct 20)' };
      }
    },
    {
      id: 'loan',
      name: 'Day 21 Loan: Oct 24',
      desc: 'Buyer loan commitment contingency',
      daysLeft: function (s) {
        if (s <= 5) return { days: 'Due Oct 24', cls: 'green' };
        if (s === 6) return { days: '4 days left', cls: 'yellow' };
        if (s === 7) return { days: 'Resolved Oct 24', cls: 'yellow' };
        return { met: true, label: 'Met (Oct 24)' };
      }
    },
    {
      id: 'appraisal',
      name: 'Appraisal: Oct 27',
      desc: 'Contingency extended to Oct 27',
      daysLeft: function (s) {
        if (s <= 6) return { days: 'Due Oct 27', cls: 'green' };
        if (s === 7) return { days: 'Resolved ($852.5K)', cls: 'yellow' };
        return { met: true, label: 'Met (Oct 27)' };
      }
    },
    {
      id: 'coe',
      name: 'Close of Escrow: Nov 3',
      desc: 'FIRM contractual closing date',
      daysLeft: function (s) {
        if (s <= 5) return { days: 'Nov 3 (FIRM)', cls: 'green' };
        if (s === 6) return { days: '14 days left', cls: 'green' };
        if (s === 7) return { days: '7 days left', cls: 'yellow' };
        return { met: true, label: 'Closed (Nov 3)' };
      }
    }
  ];

  var TC_EMAILS = [
    // Step 1: New Listing Assignment
    {
      id: 'em_s1_sofia_assign',
      folder: 'inbox',
      stepIdx: 0,
      stepNum: 1,
      senderKey: 'sofia',
      senderName: 'Sofia Reyes',
      avatarInitials: 'SR',
      avatarBg: 'linear-gradient(135deg, #7c1d34, #a82d4a)',
      subject: 'New Listing Assignment: 4827 Rolando Blvd (Herrera Family)',
      snip: 'Welcome to the team! I just signed the listing contract with Daniel & Carmen Herrera...',
      time: 'Sep 22 · 9:15 AM',
      slideIdx: 0,
      unlocked: function (s, r) { return s >= 1; }
    },
    {
      id: 'em_s1_reply_agent',
      folder: 'sent',
      stepIdx: 0,
      stepNum: 1,
      senderKey: 'tc',
      senderName: 'You (TC)',
      avatarInitials: 'TC',
      avatarBg: 'linear-gradient(135deg, #1565c0, #17c3d4)',
      subject: 'Re: New Listing Assignment: 4827 Rolando Blvd — Missing Info',
      snip: 'Hi Sofia, reviewing the file now. Please clarify HOA status, solar lease transfer...',
      time: 'Sep 22 · 10:45 AM',
      slideIdx: 3,
      unlocked: function (s, r) { return (r && r['c_ca2-missing-info']) || s > 1; }
    },
    {
      id: 'em_s1_sofia_followup',
      folder: 'inbox',
      stepIdx: 0,
      stepNum: 1,
      senderKey: 'sofia',
      senderName: 'Sofia Reyes',
      avatarInitials: 'SR',
      avatarBg: 'linear-gradient(135deg, #7c1d34, #a82d4a)',
      subject: 'Re: Missing Information · 4827 Rolando Blvd',
      snip: 'Great catch on the solar lease! The sellers own the panels outright, no lien...',
      time: 'Sep 22 · 11:30 AM',
      slideIdx: 4,
      unlocked: function (s, r) { return (r && r['c_ca2-missing-info']) || s > 1; }
    },

    // Step 2: Listing Agreement & File Setup
    {
      id: 'em_s2_sofia_executed',
      folder: 'inbox',
      stepIdx: 1,
      stepNum: 2,
      senderKey: 'sofia',
      senderName: 'Sofia Reyes',
      avatarInitials: 'SR',
      avatarBg: 'linear-gradient(135deg, #7c1d34, #a82d4a)',
      subject: 'Executed RLA + Complete Listing File: 4827 Rolando Blvd',
      snip: 'Attached is the fully executed RLA package. Please initiate ZipForms and SkySlope...',
      time: 'Sep 25 · 8:45 AM',
      slide1Idx: 0,
      unlocked: function (s, r) { return s >= 2; }
    },
    {
      id: 'em_s2_reply_confirm',
      folder: 'sent',
      stepIdx: 1,
      stepNum: 2,
      senderKey: 'tc',
      senderName: 'You (TC)',
      avatarInitials: 'TC',
      avatarBg: 'linear-gradient(135deg, #1565c0, #17c3d4)',
      subject: 'Re: Executed RLA + Complete Listing File: Setup Complete',
      snip: 'Listing file initialized in SkySlope. ZipForms template applied with all statutory disclosures...',
      time: 'Sep 25 · 10:15 AM',
      slide1Idx: 2,
      unlocked: function (s, r) { return (r && r['c_ca2-listing-confirm']) || s > 2; }
    },
    {
      id: 'em_s2_sofia_thanks',
      folder: 'inbox',
      stepIdx: 1,
      stepNum: 2,
      senderKey: 'sofia',
      senderName: 'Sofia Reyes',
      avatarInitials: 'SR',
      avatarBg: 'linear-gradient(135deg, #7c1d34, #a82d4a)',
      subject: 'Re: Listing File Setup Confirmation — Thank you!',
      snip: 'Outstanding organization! The open house is scheduled for this coming Saturday...',
      time: 'Sep 25 · 11:20 AM',
      slide1Idx: 2,
      unlocked: function (s, r) { return (r && r['c_ca2-listing-confirm']) || s > 2; }
    },

    // Step 3: Offer Review & Acceptance
    {
      id: 'em_s3_marcus_offer',
      folder: 'inbox',
      stepIdx: 2,
      stepNum: 3,
      senderKey: 'marcus',
      senderName: 'Marcus Lee (eXp)',
      avatarInitials: 'ML',
      avatarBg: 'linear-gradient(135deg, #d97706, #b45309)',
      subject: 'OFFER SUBMISSION: 4827 Rolando Blvd — Brooks Family',
      snip: 'Sofia, attached is our buyers’ RPA offer of $840,000 with pre-approval letter from Pacific Home Lending...',
      time: 'Oct 1 · 2:30 PM',
      unlocked: function (s, r) { return s >= 3; }
    },
    {
      id: 'em_s3_rachel_cash',
      folder: 'inbox',
      stepIdx: 2,
      stepNum: 3,
      senderKey: 'rachel',
      senderName: 'Rachel Torres (Compass)',
      avatarInitials: 'RT',
      avatarBg: 'linear-gradient(135deg, #059669, #047857)',
      subject: 'CASH OFFER: 4827 Rolando Blvd — Patel Family',
      snip: 'Please present this all-cash offer of $855,000 from Kevin & Priya Patel with proof of funds...',
      time: 'Oct 1 · 4:15 PM',
      unlocked: function (s, r) { return s >= 3; }
    },
    {
      id: 'em_s3_marcus_ratified',
      folder: 'inbox',
      stepIdx: 2,
      stepNum: 3,
      senderKey: 'marcus',
      senderName: 'Marcus Lee (eXp)',
      avatarInitials: 'ML',
      avatarBg: 'linear-gradient(135deg, #d97706, #b45309)',
      subject: 'ACCEPTED BCO #1: Ratified Purchase Agreement · $860,000',
      snip: 'We have agreement! Buyers signed BCO #1 accepting $860,000 with firm Nov 3 closing...',
      time: 'Oct 3 · 3:30 PM',
      unlocked: function (s, r) { return s >= 3; }
    },

    // Step 4: Escrow & Title Opening
    {
      id: 'em_s4_sofia_ratified',
      folder: 'inbox',
      stepIdx: 3,
      stepNum: 4,
      senderKey: 'sofia',
      senderName: 'Sofia Reyes',
      avatarInitials: 'SR',
      avatarBg: 'linear-gradient(135deg, #7c1d34, #a82d4a)',
      subject: 'Ratified RPA Package: 4827 Rolando Blvd (Brooks Purchase)',
      snip: 'Contract is ratified! Please open escrow with Sarah Nguyen at Chicago Title and loop in lender...',
      time: 'Oct 6 · 8:30 AM',
      unlocked: function (s, r) { return s >= 4; }
    },
    {
      id: 'em_s4_distribute_rpa',
      folder: 'sent',
      stepIdx: 3,
      stepNum: 4,
      senderKey: 'tc',
      senderName: 'You (TC)',
      avatarInitials: 'TC',
      avatarBg: 'linear-gradient(135deg, #1565c0, #17c3d4)',
      subject: 'Executed RPA Package + Opening Information',
      snip: 'Good morning Sarah and Tyler, attaching ratified purchase contract for 4827 Rolando Blvd...',
      time: 'Oct 6 · 9:45 AM',
      unlocked: function (s, r) { return (r && r['c_ca2-ratified-distribute']) || s > 4; }
    },
    {
      id: 'em_s4_sarah_escrow',
      folder: 'inbox',
      stepIdx: 3,
      stepNum: 4,
      senderKey: 'sarah',
      senderName: 'Sarah Nguyen (Escrow)',
      avatarInitials: 'SN',
      avatarBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
      subject: 'Escrow Opened: Order #CTT-2025-07421 (4827 Rolando Blvd)',
      snip: 'Escrow is officially opened under order #CTT-2025-07421. Wiring instructions sent via secure portal...',
      time: 'Oct 6 · 11:15 AM',
      unlocked: function (s, r) { return s >= 4; }
    },
    {
      id: 'em_s4_reply_escrow',
      folder: 'sent',
      stepIdx: 3,
      stepNum: 4,
      senderKey: 'tc',
      senderName: 'You (TC)',
      avatarInitials: 'TC',
      avatarBg: 'linear-gradient(135deg, #1565c0, #17c3d4)',
      subject: 'Re: Escrow Opened #CTT-2025-07421 — Initial Docs & Commission',
      snip: 'Thank you Sarah. Attaching broker commission instructions and preliminary seller info sheet...',
      time: 'Oct 6 · 1:15 PM',
      unlocked: function (s, r) { return (r && r['c_ca2-escrow-package']) || s > 4; }
    },
    {
      id: 'em_s4_tyler_lender',
      folder: 'inbox',
      stepIdx: 3,
      stepNum: 4,
      senderKey: 'tyler',
      senderName: 'Tyler Adams (Lender)',
      avatarInitials: 'TA',
      avatarBg: 'linear-gradient(135deg, #0891b2, #0e7490)',
      subject: 'Loan File Opened & EMD Instructions · 4827 Rolando Blvd',
      snip: 'Loan application in underwriting. Appraisal has been ordered with priority turn time...',
      time: 'Oct 6 · 2:45 PM',
      unlocked: function (s, r) { return s >= 4; }
    },

    // Step 5: Statutory Disclosures & EMD
    {
      id: 'em_s5_sarah_emd',
      folder: 'inbox',
      stepIdx: 4,
      stepNum: 5,
      senderKey: 'sarah',
      senderName: 'Sarah Nguyen (Escrow)',
      avatarInitials: 'SN',
      avatarBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
      subject: 'EMD Receipt Confirmation ($17,200 Received) · Order #CTT-2025-07421',
      snip: 'We have received the $17,200 initial deposit wire into escrow from buyers Jason & Michelle Brooks...',
      time: 'Oct 8 · 3:15 PM',
      unlocked: function (s, r) { return s >= 5; }
    },
    {
      id: 'em_s5_distrib_disclosures',
      folder: 'sent',
      stepIdx: 4,
      stepNum: 5,
      senderKey: 'tc',
      senderName: 'You (TC)',
      avatarInitials: 'TC',
      avatarBg: 'linear-gradient(135deg, #1565c0, #17c3d4)',
      subject: 'Full Seller Disclosure Package Delivered · 4827 Rolando Blvd',
      snip: 'Marcus, delivering fully executed statutory disclosure package: TDS, SPQ, NHD, Lead Paint, and Prelim...',
      time: 'Oct 8 · 4:30 PM',
      unlocked: function (s, r) { return (r && r['c_ca2-disclosure-delivery']) || s > 5; }
    },
    {
      id: 'em_s5_marcus_confirm',
      folder: 'inbox',
      stepIdx: 4,
      stepNum: 5,
      senderKey: 'marcus',
      senderName: 'Marcus Lee (eXp)',
      avatarInitials: 'ML',
      avatarBg: 'linear-gradient(135deg, #d97706, #b45309)',
      subject: 'Receipt of Seller Disclosures Confirmed (5-Day Review Period Begins)',
      snip: 'Confirmed receipt of all statutory disclosures. Buyers are reviewing alongside home inspection...',
      time: 'Oct 9 · 10:20 AM',
      unlocked: function (s, r) { return s >= 5; }
    },

    // Step 6: Buyer Inspections & Repair Requests
    {
      id: 'em_s6_marcus_rr',
      folder: 'inbox',
      stepIdx: 5,
      stepNum: 6,
      senderKey: 'marcus',
      senderName: 'Marcus Lee (eXp)',
      avatarInitials: 'ML',
      avatarBg: 'linear-gradient(135deg, #d97706, #b45309)',
      subject: 'Request for Repair (C.A.R. RR) · 4827 Rolando Blvd ($12,550)',
      snip: 'Attached is buyer’s RR requesting $12,550 credit for foundation reinforcement and subpanel upgrade...',
      time: 'Oct 18 · 1:45 PM',
      unlocked: function (s, r) { return s >= 6; }
    },
    {
      id: 'em_s6_sofia_rrr',
      folder: 'inbox',
      stepIdx: 5,
      stepNum: 6,
      senderKey: 'sofia',
      senderName: 'Sofia Reyes',
      avatarInitials: 'SR',
      avatarBg: 'linear-gradient(135deg, #7c1d34, #a82d4a)',
      subject: 'Seller Response to RR (Agreed to $4,500 Credit) · 4827 Rolando Blvd',
      snip: 'Herreras countered with $4,500 closing cost credit. Buyer accepted! Draft Amendment #1...',
      time: 'Oct 20 · 11:00 AM',
      unlocked: function (s, r) { return s >= 6; }
    },
    {
      id: 'em_s6_distrib_amend1',
      folder: 'sent',
      stepIdx: 5,
      stepNum: 6,
      senderKey: 'tc',
      senderName: 'You (TC)',
      avatarInitials: 'TC',
      avatarBg: 'linear-gradient(135deg, #1565c0, #17c3d4)',
      subject: 'Amendment #1 (Repair Credit) — Executed Copy Distributed',
      snip: 'Sarah and Tyler, distributing fully ratified Amendment #1 granting $4,500 seller closing credit...',
      time: 'Oct 20 · 3:30 PM',
      unlocked: function (s, r) { return (r && r['c_ca2-repair-amend']) || s > 6; }
    },

    // Step 7: Appraisal Shortfall & Wire Fraud Defense
    {
      id: 'em_s7_tyler_appraisal',
      folder: 'inbox',
      stepIdx: 6,
      stepNum: 7,
      senderKey: 'tyler',
      senderName: 'Tyler Adams (Lender)',
      avatarInitials: 'TA',
      avatarBg: 'linear-gradient(135deg, #0891b2, #0e7490)',
      subject: 'Appraisal Received: $845,000 (Shortfall) · 4827 Rolando Blvd',
      snip: 'Appraisal came in at $845,000 ($15,000 under contract price). We need resolution or contingency extension...',
      time: 'Oct 22 · 10:15 AM',
      unlocked: function (s, r) { return s >= 7; }
    },
    {
      id: 'em_s7_sofia_amend2',
      folder: 'inbox',
      stepIdx: 6,
      stepNum: 7,
      senderKey: 'sofia',
      senderName: 'Sofia Reyes',
      avatarInitials: 'SR',
      avatarBg: 'linear-gradient(135deg, #7c1d34, #a82d4a)',
      subject: 'Price Reduction Amendment ($852,500) Agreed · 4827 Rolando Blvd',
      snip: 'Parties agreed to split difference: purchase price adjusted to $852,500. Amendment #2 signed...',
      time: 'Oct 24 · 2:30 PM',
      unlocked: function (s, r) { return s >= 7; }
    },
    {
      id: 'em_s7_cr_distrib',
      folder: 'sent',
      stepIdx: 6,
      stepNum: 7,
      senderKey: 'tc',
      senderName: 'You (TC)',
      avatarInitials: 'TC',
      avatarBg: 'linear-gradient(135deg, #1565c0, #17c3d4)',
      subject: 'Contingency Removal & Price Amendment Distributed',
      snip: 'Distributing executed Amendment #2 ($852,500) and signed Contingency Removal Form...',
      time: 'Oct 24 · 4:45 PM',
      unlocked: function (s, r) { return (r && r['c_ca2-cr-check']) || s > 7; }
    },
    {
      id: 'em_s7_phishing_alert',
      folder: 'inbox',
      stepIdx: 6,
      stepNum: 7,
      senderKey: 'security',
      senderName: '⚠️ Spoofed Wire Phishing Alert',
      avatarInitials: '🚨',
      avatarBg: 'linear-gradient(135deg, #dc2626, #991b1b)',
      subject: 'URGENT WIRE INSTRUCTIONS UPDATE from "Sarah Nquyen"',
      snip: 'ALERT: Suspicious email intercepted with spoofed domain ctt-escrow-update.com attempting wire diversion...',
      time: 'Oct 27 · 9:00 AM',
      unlocked: function (s, r) { return s >= 7; }
    },

    // Step 8: Final Closing & Archive
    {
      id: 'em_s8_sarah_closed',
      folder: 'inbox',
      stepIdx: 7,
      stepNum: 8,
      senderKey: 'sarah',
      senderName: 'Sarah Nguyen (Escrow)',
      avatarInitials: 'SN',
      avatarBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
      subject: 'RECORDING CONFIRMATION: Grant Deed Recorded — Escrow Closed!',
      snip: 'Congratulations! Official recording #2025-049812 confirmed at 2:14 PM with San Diego County Recorder...',
      time: 'Nov 3 · 2:15 PM',
      unlocked: function (s, r) { return s >= 8; }
    },
    {
      id: 'em_s8_closing_wrapup',
      folder: 'sent',
      stepIdx: 7,
      stepNum: 8,
      senderKey: 'tc',
      senderName: 'You (TC)',
      avatarInitials: 'TC',
      avatarBg: 'linear-gradient(135deg, #1565c0, #17c3d4)',
      subject: 'Transaction Complete & Complete File Archive Notice · 4827 Rolando Blvd',
      snip: 'Closing statement verified. Complete audited transaction file archived in compliance with DRE...',
      time: 'Nov 3 · 4:00 PM',
      unlocked: function (s, r) { return (r && r['c_ca2-closing-wrapup']) || s >= 8; }
    }
  ];

  var STEP_TITLES = {
    1: 'New Listing Assignment',
    2: 'Listing Agreement & File Setup',
    3: 'Offer Review & Acceptance',
    4: 'Escrow & Title Opening',
    5: 'Statutory Disclosures & EMD',
    6: 'Buyer Inspections & Repair Requests',
    7: 'Appraisal Shortfall & Wire Fraud Defense',
    8: 'Final Closing & Archive'
  };

  function tcRenderDeadlineBar(n) {
    var h = '<div class="tc-deadline-bar">' +
      '<div class="tc-dl-left">' +
        '<div class="tc-dl-icon">⏱️</div>' +
        '<div class="tc-dl-title-wrap">' +
          '<span class="tc-dl-title">Statutory Deadlines & Contingencies</span>' +
          '<span class="tc-dl-sub">4827 Rolando Blvd &middot; Ratified Oct 3, 2025</span>' +
        '</div>' +
      '</div>' +
      '<div class="tc-dl-items">';

    TC_DEADLINES.forEach(function (dl) {
      var res = dl.daysLeft(n);
      if (res.met) {
        h += '<div class="tc-dl-item met" title="' + esc(dl.desc) + '">' +
          '<span class="tc-dl-check">&#10003;</span> ' +
          '<strong>' + esc(dl.name.split(':')[0]) + ':</strong> ' + esc(res.label) +
        '</div>';
      } else {
        h += '<div class="tc-dl-item ' + (res.cls || 'green') + '" title="' + esc(dl.desc) + '">' +
          '<span class="tc-dl-dot"></span> ' +
          '<strong>' + esc(dl.name.split(':')[0]) + ':</strong> ' + esc(res.days) +
        '</div>';
      }
    });

    h += '</div></div>';
    return h;
  }

  function tcRenderInboxPanel(n, runState) {
    var readMap = (typeof window !== 'undefined' && window._tcReadEmails) ? window._tcReadEmails : {};
    var activeFolder = (typeof window !== 'undefined' && window._tcInboxFolder) ? window._tcInboxFolder : 'inbox';
    var activeEmailId = (typeof window !== 'undefined' && window._tcActiveEmailId) ? window._tcActiveEmailId : null;

    var unlocked = TC_EMAILS.filter(function (e) {
      return typeof e.unlocked === 'function' ? e.unlocked(n, runState) : true;
    });

    var inboxEmails = unlocked.filter(function (e) { return e.folder === 'inbox'; });
    var sentEmails = unlocked.filter(function (e) { return e.folder === 'sent'; });

    var unreadCount = 0;
    inboxEmails.forEach(function (e) {
      if (!readMap[e.id]) unreadCount++;
    });

    var listEmails = activeFolder === 'sent' ? sentEmails : inboxEmails;

    var itemsHtml = '';
    if (!listEmails.length) {
      itemsHtml = '<div style="font-size:11px;color:#94a3b8;padding:16px 8px;text-align:center;">' +
        (activeFolder === 'sent' ? 'No sent messages yet in this phase.' : 'No messages in inbox.') +
        '</div>';
    } else {
      listEmails.forEach(function (e) {
        var isUnread = (e.folder === 'inbox') && !readMap[e.id];
        var isActive = (activeEmailId === e.id) || (!activeEmailId && e.stepNum === n);
        var itemCls = 'tc-inbox-item' + (isUnread ? ' unread' : '') + (isActive ? ' active' : '');

        itemsHtml += '<button type="button" class="' + itemCls + '" data-id="' + e.id + '" onclick="tcSelectEmail(\'' + e.id + '\')">' +
          '<div class="tc-inbox-avatar" style="background:' + e.avatarBg + ';">' + esc(e.avatarInitials) + '</div>' +
          '<div class="tc-inbox-item-body">' +
            '<div class="tc-inbox-item-top">' +
              '<span class="tc-inbox-sender">' +
                (isUnread ? '<span class="tc-unread-dot"></span>' : '') +
                esc(e.senderName) +
              '</span>' +
              '<span class="tc-inbox-time">' + esc(e.time.split('·')[0].trim()) + '</span>' +
            '</div>' +
            '<div class="tc-inbox-subj">' + esc(e.subject) + '</div>' +
            '<div class="tc-inbox-snip">' + esc(e.snip) + '</div>' +
          '</div>' +
        '</button>';
      });
    }

    var isCollapsed = false;
    try {
      isCollapsed = typeof localStorage !== 'undefined' && localStorage.getItem('tc_left_collapsed') === '1';
    } catch (e) {}

    return '<aside class="tc-inbox-panel' + (isCollapsed ? ' collapsed' : '') + '" id="tc-inbox-panel">' +
      '<div class="tc-inbox-header">' +
        '<div class="tc-inbox-title-wrap">' +
          '<span class="tc-inbox-icon">📬</span>' +
          '<span class="tc-inbox-title">Communications</span>' +
          (unreadCount > 0 ? '<span class="tc-inbox-count-badge" id="tc-inbox-unread-count">' + unreadCount + '</span>' : '') +
        '</div>' +
        '<button type="button" class="tc-panel-toggle-btn" onclick="tcTogglePanel(\'left\')" title="Collapse / Expand Inbox">&lsaquo;&rsaquo;</button>' +
      '</div>' +
      '<div class="tc-inbox-tabs">' +
        '<button type="button" class="tc-inbox-tab' + (activeFolder === 'inbox' ? ' active' : '') + '" id="tc-tab-inbox" onclick="tcSwitchInboxFolder(\'inbox\')">' +
          'Inbox (' + inboxEmails.length + ')' +
        '</button>' +
        '<button type="button" class="tc-inbox-tab' + (activeFolder === 'sent' ? ' active' : '') + '" id="tc-tab-sent" onclick="tcSwitchInboxFolder(\'sent\')">' +
          'Sent (' + sentEmails.length + ')' +
        '</button>' +
      '</div>' +
      '<div class="tc-inbox-list" id="tc-inbox-list">' + itemsHtml + '</div>' +
    '</aside>';
  }

  function tcRenderKeyFacts(n, stepFacts) {
    var defaultFacts = [
      ['Property', '4827 Rolando Blvd, San Diego CA 92115'],
      ['Listing Price', '$889,000'],
      ['Contract Price', n >= 7 ? '$852,500 (reduced)' : (n >= 3 ? '$860,000 (ratified)' : '$889,000')],
      ['EMD Amount', n >= 5 ? '$17,200 (received)' : (n >= 4 ? '$17,200 (due Oct 8)' : '$17,200 (2%)')],
      ['Escrow #', n >= 4 ? 'CTT-2025-07421' : 'Pending Opening'],
      ['Title / Escrow', 'Chicago Title (Sarah Nguyen)'],
      ['Lender', n >= 4 ? 'Pacific Home Lending (Tyler Adams)' : 'Pending Buyer Loan'],
      ['COE Date', 'Nov 3, 2025 (FIRM)'],
      ['Repair Credit', n >= 6 ? '$4,500 (agreed)' : 'None ($0)']
    ];

    var rowsHtml = '';
    var displayedLabels = {};

    if (stepFacts && stepFacts.length) {
      stepFacts.forEach(function (f) {
        displayedLabels[f[0].toLowerCase()] = true;
        rowsHtml += '<div class="tc-fact-row"><span class="tc-fact-label">' + esc(f[0]) + '</span><span class="tc-fact-val" style="color:var(--v-blue,#1565c0);">' + esc(f[1]) + '</span></div>';
      });
    }

    defaultFacts.forEach(function (df) {
      if (!displayedLabels[df[0].toLowerCase()]) {
        rowsHtml += '<div class="tc-fact-row"><span class="tc-fact-label">' + esc(df[0]) + '</span><span class="tc-fact-val">' + esc(df[1]) + '</span></div>';
      }
    });

    return '<div class="tc-facts-card">' + rowsHtml + '</div>';
  }

  function tcRenderContacts(n, activeContactKeys) {
    var activeSet = {};
    if (activeContactKeys && activeContactKeys.length) {
      activeContactKeys.forEach(function (k) { activeSet[k] = true; });
    }

    var h = '<div class="tc-contacts-list">';
    var allKeys = ['sofia', 'daniel', 'carmen', 'marcus', 'rachel', 'sarah', 'tyler'];

    allKeys.forEach(function (k) {
      var c = CONTACTS[k];
      if (!c) return;
      var isActive = !!activeSet[k];

      h += '<div class="tc-contact-card' + (isActive ? ' active-step' : '') + '">' +
        '<div class="tc-contact-top">' +
          '<div class="tc-contact-avatar" style="background:' + (c.color || 'var(--v-navy)') + ';">' + esc(c.initials) + '</div>' +
          '<div class="tc-contact-meta">' +
            '<div class="tc-contact-name">' + esc(c.name) + '</div>' +
            '<div class="tc-contact-role">' + esc(c.role) + '</div>' +
          '</div>' +
          '<span class="tc-contact-status-badge ' + (isActive ? 'active' : 'inactive') + '">' +
            (isActive ? '<span style="font-size:8px;">●</span> Active' : '<span style="font-size:8px;">○</span> Idle') +
          '</span>' +
        '</div>' +
        '<div class="tc-contact-links">' +
          '<div><strong>Brokerage:</strong> ' + esc(c.brokerage || 'Real Estate') + '</div>' +
          '<div><strong>Email:</strong> <span style="color:var(--v-blue,#1565c0);">' + esc(c.email) + '</span></div>' +
          '<div><strong>Phone:</strong> ' + esc(c.phone) + '</div>' +
        '</div>' +
      '</div>';
    });

    h += '</div>';
    return h;
  }

  function tcRenderDocs(n, docKeys, hideDocs) {
    if (!docKeys || !docKeys.length) {
      return '<div style="font-size:11px;color:#94a3b8;padding:8px;text-align:center;">No documents assigned to this phase yet.</div>';
    }

    var h = '<div class="tc-docs-list">';
    docKeys.forEach(function (k) {
      var d = DOCS[k];
      if (!d) return;

      var meta = DOC_TYPES[k] || { type: 'contract', badge: 'draft', label: 'Document' };
      var isHidden = !!hideDocs;
      var hideStyle = isHidden ? ' style="display:none"' : '';
      var isAssigned = (typeof SS_STATE !== 'undefined' && !!SS_STATE['ca2-ss_' + k]);

      var docCls = 'tc-doc-item mh-doc' + (isAssigned ? ' is-assigned' : '');
      var dragAttr = isAssigned ? 'draggable="false"' : 'draggable="true"';

      var badgeClass = isAssigned ? 'signed' : meta.badge;
      var badgeText = isAssigned ? '📋 Filed' : (badgeClass === 'signed' ? '✅ Signed' : (badgeClass === 'draft' ? '📝 Draft' : '🔒 Locked'));

      h += '<button type="button" class="' + docCls + '" data-doc="' + k + '"' + hideStyle +
        ' ' + dragAttr +
        ' ondragstart="caNewDocDragStart(event, \'' + k + '\')"' +
        ' ondragend="caNewDocDragEnd(event, \'' + k + '\')"' +
        ' onclick="caNewOpen(\'' + k + '\')"' +
        ' title="Drag to SkySlope slot or click to preview ' + esc(d[1]) + '">' +
        '<div class="tc-doc-icon">' + ICON_DOC + '</div>' +
        '<div class="tc-doc-meta">' +
          '<div class="tc-doc-title">' + esc(d[1]) + '</div>' +
          '<div class="tc-doc-sub">' + esc(meta.label) + ' &middot; ' + esc(d[2]) + '</div>' +
        '</div>' +
        '<span class="tc-doc-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</button>';
    });

    h += '</div>';
    return h;
  }

  function tcRenderResourcesPanel(n, runState, facts, docs, contacts, hideDocs) {
    var isCollapsed = false;
    try {
      isCollapsed = typeof localStorage !== 'undefined' && localStorage.getItem('tc_right_collapsed') === '1';
    } catch (e) {}

    return '<aside class="tc-resources-panel' + (isCollapsed ? ' collapsed' : '') + '" id="tc-resources-panel">' +
      '<div class="tc-res-header">' +
        '<div class="tc-res-title-wrap">' +
          '<span class="tc-res-icon">📁</span>' +
          '<span class="tc-res-title">Transaction Resources</span>' +
        '</div>' +
        '<button type="button" class="tc-panel-toggle-btn" onclick="tcTogglePanel(\'right\')" title="Collapse / Expand Resources">&lsaquo;&rsaquo;</button>' +
      '</div>' +
      '<div class="tc-res-body">' +
        '<div class="tc-res-section">' +
          '<div class="tc-res-section-title"><span>Key Transaction Facts</span><span style="font-size:10px;color:#94a3b8;">4827 Rolando</span></div>' +
          tcRenderKeyFacts(n, facts) +
        '</div>' +
        '<div class="tc-res-section">' +
          '<div class="tc-res-section-title"><span>Parties &amp; Contacts</span><span style="font-size:10px;color:#94a3b8;">' + (contacts ? contacts.length : 0) + ' active</span></div>' +
          tcRenderContacts(n, contacts) +
        '</div>' +
        '<div class="tc-res-section tc-docs-section mh-docs-section open">' +
          '<div class="tc-res-section-title"><span>Documents &amp; Files</span><span class="mh-docs-count tc-docs-count" style="font-size:10px;color:#94a3b8;">' + (docs ? docs.length : 0) + '</span></div>' +
          tcRenderDocs(n, docs, hideDocs) +
        '</div>' +
      '</div>' +
    '</aside>';
  }

  function tcRenderStatusBar(n) {
    var scoreData = (typeof wfScoreSummary === 'function') ? wfScoreSummary() : { correct: 0, total: 0, pct: 100 };
    var scorePct = scoreData.pct;
    var dayMap = { 1: 1, 2: 4, 3: 12, 4: 15, 5: 17, 6: 29, 7: 36, 8: 43 };
    var transDay = dayMap[n] || 1;
    var hintsUsed = (typeof wfActiveScenario !== 'undefined' && wfActiveScenario && wfActiveScenario._hintsUsed) ? wfActiveScenario._hintsUsed : 0;

    return '<div class="tc-status-bar">' +
      '<div class="tc-status-group">' +
        '<span class="tc-status-pill highlight"><strong>Step ' + n + ' of 8</strong> &middot; ' + esc(STEP_TITLES[n] || '') + '</span>' +
        '<span class="tc-status-divider"></span>' +
        '<span class="tc-status-pill">Transaction Day <strong>' + transDay + '</strong> of 43</span>' +
        '<span class="tc-status-divider"></span>' +
        '<span class="tc-status-pill">Property: <strong>4827 Rolando Blvd, San Diego</strong></span>' +
      '</div>' +
      '<div class="tc-status-group">' +
        '<span class="tc-status-pill">Decision Score: <strong id="tc-status-score">' + scorePct + '%</strong></span>' +
        '<span class="tc-status-divider"></span>' +
        '<span class="tc-status-pill">Time: <strong id="tc-status-timer">00:00</strong></span>' +
        '<span class="tc-status-divider"></span>' +
        '<span class="tc-status-pill">Hints: <strong>' + hintsUsed + ' used</strong></span>' +
      '</div>' +
    '</div>';
  }

  function side(facts, docs, contacts, hideDocs) {
    return {
      facts: facts || [],
      docs: docs || [],
      contacts: contacts || [],
      hideDocs: !!hideDocs,
      toString: function () { return ''; }
    };
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
    var facts = (aside && aside.facts) ? aside.facts : [];
    var docs = (aside && aside.docs) ? aside.docs : [];
    var contacts = (aside && aside.contacts) ? aside.contacts : [];
    var hideDocs = (aside && aside.hideDocs) ? aside.hideDocs : false;

    var nav = last === true ? '' : wfNav(n > 1);
    if (last === 'gated') {
      nav = '<div class="wf-nav">' +
        (n > 1 ? '<button class="wf-nav-btn outline" onclick="wfPrev()">&larr; Previous</button>' : '') +
        '<button class="wf-nav-btn primary" onclick="caNewGatedNext()">Continue &rarr;</button></div>';
    }

    var dlBar = tcRenderDeadlineBar(n);
    var inboxPanel = tcRenderInboxPanel(n, run());
    var resourcesPanel = tcRenderResourcesPanel(n, run(), facts, docs, contacts, hideDocs);
    var statusBar = tcRenderStatusBar(n);

    var leftCol = false, rightCol = false;
    try {
      leftCol = typeof localStorage !== 'undefined' && localStorage.getItem('tc_left_collapsed') === '1';
      rightCol = typeof localStorage !== 'undefined' && localStorage.getItem('tc_right_collapsed') === '1';
    } catch (e) {}

    var gridClasses = 'tc-workspace-grid';
    if (leftCol && rightCol) gridClasses += ' both-collapsed';
    else if (leftCol) gridClasses += ' left-collapsed';
    else if (rightCol) gridClasses += ' right-collapsed';

    var dlChip = '';
    if (deadline) {
      dlChip = '<div class="tc-step-contingency-chip' + (deadline.critical ? ' critical' : '') + '">' +
        (deadline.critical ? '🚨 ' : '⚠️ ') + esc(deadline.text) + ' &middot; <strong>' + esc(deadline.days) + '</strong>' +
        '</div>';
    }

    if (typeof window !== 'undefined') {
      setTimeout(function () {
        if (typeof window.tcInitTimer === 'function') window.tcInitTimer();
      }, 50);
    }

    return '<div class="tc-workspace-root">' +
      dlBar +
      '<div class="' + gridClasses + '" id="tc-workspace-grid">' +
        inboxPanel +
        '<main class="tc-main-workspace">' +
          '<div class="tc-step-header-card">' +
            '<div class="tc-step-header-top">' +
              '<span class="tc-step-badge">Step ' + n + ' of 8</span>' +
              '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
                dlChip +
                '<span class="tc-step-date-chip">' + ICON_CAL + ' ' + esc(date) + '</span>' +
              '</div>' +
            '</div>' +
            '<h2 class="tc-step-title">' + esc(title) + '</h2>' +
            '<p class="tc-step-lead">' + lead + '</p>' +
          '</div>' +
          '<div class="tc-main-content">' + main + '</div>' +
          nav +
        '</main>' +
        resourcesPanel +
      '</div>' +
      statusBar +
    '</div>';
  }

  // Interactive Window Handlers
  window.tcTogglePanel = function (side) {
    var grid = document.getElementById('tc-workspace-grid');
    var panel = document.getElementById(side === 'left' ? 'tc-inbox-panel' : 'tc-resources-panel');
    if (!grid || !panel) return;

    panel.classList.toggle('collapsed');
    var isLeftCol = document.getElementById('tc-inbox-panel') && document.getElementById('tc-inbox-panel').classList.contains('collapsed');
    var isRightCol = document.getElementById('tc-resources-panel') && document.getElementById('tc-resources-panel').classList.contains('collapsed');

    grid.classList.remove('left-collapsed', 'right-collapsed', 'both-collapsed');
    if (isLeftCol && isRightCol) grid.classList.add('both-collapsed');
    else if (isLeftCol) grid.classList.add('left-collapsed');
    else if (isRightCol) grid.classList.add('right-collapsed');

    try {
      if (side === 'left') localStorage.setItem('tc_left_collapsed', isLeftCol ? '1' : '0');
      if (side === 'right') localStorage.setItem('tc_right_collapsed', isRightCol ? '1' : '0');
    } catch (e) {}
  };

  window.tcSwitchInboxFolder = function (folder) {
    window._tcInboxFolder = folder;
    var tabIn = document.getElementById('tc-tab-inbox');
    var tabSent = document.getElementById('tc-tab-sent');
    if (tabIn && tabSent) {
      if (folder === 'sent') {
        tabIn.classList.remove('active');
        tabSent.classList.add('active');
      } else {
        tabIn.classList.add('active');
        tabSent.classList.remove('active');
      }
    }
    if (typeof window.tcRefreshInboxList === 'function') {
      window.tcRefreshInboxList();
    }
  };

  window.tcSelectEmail = function (emailId) {
    if (!window._tcReadEmails) window._tcReadEmails = {};
    window._tcReadEmails[emailId] = true;
    window._tcActiveEmailId = emailId;

    var email = null;
    for (var i = 0; i < TC_EMAILS.length; i++) {
      if (TC_EMAILS[i].id === emailId) { email = TC_EMAILS[i]; break; }
    }
    if (!email) return;

    if (typeof wfStep !== 'undefined' && wfStep !== email.stepIdx) {
      wfStep = email.stepIdx;
      if (typeof email.slideIdx === 'number') {
        window._caNewSlide0 = email.slideIdx;
      }
      if (typeof email.slide1Idx === 'number') {
        window._caNewSlide1 = email.slide1Idx;
      }
      if (typeof wfRender === 'function') wfRender();
    } else {
      if (typeof email.slideIdx === 'number' && typeof window.caNewGoSlide === 'function') {
        window.caNewGoSlide(email.slideIdx);
      }
      if (typeof email.slide1Idx === 'number' && typeof window.caNewGoSlide1 === 'function') {
        window.caNewGoSlide1(email.slide1Idx);
      }
      if (email.targetId) {
        var el = document.getElementById(email.targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (typeof window.tcRefreshInboxList === 'function') {
        window.tcRefreshInboxList();
      }
    }
  };

  window.tcRefreshInboxList = function () {
    var curStep = (typeof wfStep !== 'undefined') ? (wfStep + 1) : 1;
    var container = document.getElementById('tc-inbox-list');
    if (!container) return;

    var readMap = window._tcReadEmails || {};
    var activeFolder = window._tcInboxFolder || 'inbox';
    var activeEmailId = window._tcActiveEmailId || null;

    var unlocked = TC_EMAILS.filter(function (e) {
      return typeof e.unlocked === 'function' ? e.unlocked(curStep, run()) : true;
    });

    var inboxEmails = unlocked.filter(function (e) { return e.folder === 'inbox'; });
    var sentEmails = unlocked.filter(function (e) { return e.folder === 'sent'; });

    var unreadCount = 0;
    inboxEmails.forEach(function (e) {
      if (!readMap[e.id]) unreadCount++;
    });

    var unreadBadge = document.getElementById('tc-inbox-unread-count');
    if (unreadBadge) {
      unreadBadge.textContent = unreadCount;
      unreadBadge.style.display = unreadCount > 0 ? '' : 'none';
    }

    var listEmails = activeFolder === 'sent' ? sentEmails : inboxEmails;
    if (!listEmails.length) {
      container.innerHTML = '<div style="font-size:11px;color:#94a3b8;padding:16px 8px;text-align:center;">' +
        (activeFolder === 'sent' ? 'No sent messages yet in this phase.' : 'No messages in inbox.') +
        '</div>';
      return;
    }

    var h = '';
    listEmails.forEach(function (e) {
      var isUnread = (e.folder === 'inbox') && !readMap[e.id];
      var isActive = (activeEmailId === e.id) || (!activeEmailId && e.stepNum === curStep);
      var itemCls = 'tc-inbox-item' + (isUnread ? ' unread' : '') + (isActive ? ' active' : '');

      h += '<button type="button" class="' + itemCls + '" data-id="' + e.id + '" onclick="tcSelectEmail(\'' + e.id + '\')">' +
        '<div class="tc-inbox-avatar" style="background:' + e.avatarBg + ';">' + esc(e.avatarInitials) + '</div>' +
        '<div class="tc-inbox-item-body">' +
          '<div class="tc-inbox-item-top">' +
            '<span class="tc-inbox-sender">' +
              (isUnread ? '<span class="tc-unread-dot"></span>' : '') +
              esc(e.senderName) +
            '</span>' +
            '<span class="tc-inbox-time">' + esc(e.time.split('·')[0].trim()) + '</span>' +
          '</div>' +
          '<div class="tc-inbox-subj">' + esc(e.subject) + '</div>' +
          '<div class="tc-inbox-snip">' + esc(e.snip) + '</div>' +
        '</div>' +
      '</button>';
    });
    container.innerHTML = h;
  };

  window.tcInitTimer = function () {
    if (!window._tcStartTime) {
      window._tcStartTime = Date.now();
    }
    if (!window._tcTimerInterval) {
      window._tcTimerInterval = setInterval(function () {
        var timerEl = document.getElementById('tc-status-timer');
        if (!timerEl) return;
        var elapsed = Math.floor((Date.now() - window._tcStartTime) / 1000);
        var mins = Math.floor(elapsed / 60);
        var secs = elapsed % 60;
        timerEl.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
      }, 1000);
    }
  };


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
    window._caNewSlide2 = null;
    window._caNewSlide3 = null;
    window._caNewSlide4 = null;
    window._caNewSlide5 = null;
    window._caNewSlide6 = null;
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = '';
      var m1 = document.getElementById('ca2-zf-modal');
      if (m1) m1.style.display = 'none';
      var m2 = document.getElementById('ca2-zf-doc-modal');
      if (m2) m2.style.display = 'none';
    }
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
        if (key === 'ca2-listing-confirm') {
          var replyEl = document.getElementById('ca2-s1-herrera-reply');
          if (replyEl) {
            replyEl.style.display = 'block';
            replyEl.classList.add('wf-phase-enter');
          }
        }
        var bannerEl = document.getElementById('ca2-s0-reply-banner');
        if (bannerEl) {
          bannerEl.style.display = 'flex';
          bannerEl.classList.add('wf-phase-enter');
        }
        var nextBtn = document.getElementById('ca2-s0-info-next');
        if (nextBtn) nextBtn.style.display = 'inline-flex';

        if (key === 'ca2-ratification-confirm') {
          var ratConnector = document.getElementById('ca2-s2-rat-connector');
          if (ratConnector) {
            ratConnector.style.display = 'flex';
            ratConnector.classList.add('wf-phase-enter');
          }
          var ratReply = document.getElementById('ca2-s2-sofia-rat-reply');
          if (ratReply) {
            ratReply.style.display = 'block';
            ratReply.classList.add('wf-phase-enter');
          }
          var ratBanner = document.getElementById('ca2-s2-reply-banner');
          if (ratBanner) {
            ratBanner.style.display = 'flex';
            ratBanner.classList.add('wf-phase-enter');
          }
        }
        if (key === 'ca2-escrow-open') {
          var s3Conn = document.getElementById('ca2-s3-escrow-connector');
          if (s3Conn) { s3Conn.style.display = 'flex'; s3Conn.classList.add('wf-phase-enter'); }
          var s3Reply = document.getElementById('ca2-s3-sarah-reply');
          if (s3Reply) { s3Reply.style.display = 'block'; s3Reply.classList.add('wf-phase-enter'); }
          var s3Banner = document.getElementById('ca2-s3-reply-banner');
          if (s3Banner) { s3Banner.style.display = 'flex'; s3Banner.classList.add('wf-phase-enter'); }
        }
        if (key === 'ca2-disc-delivery') {
          var s4Conn = document.getElementById('ca2-s4-disc-connector');
          if (s4Conn) { s4Conn.style.display = 'flex'; s4Conn.classList.add('wf-phase-enter'); }
          var s4Reply = document.getElementById('ca2-s4-marcus-disc-reply');
          if (s4Reply) { s4Reply.style.display = 'block'; s4Reply.classList.add('wf-phase-enter'); }
          var s4Banner = document.getElementById('ca2-s4-reply-banner');
          if (s4Banner) { s4Banner.style.display = 'flex'; s4Banner.classList.add('wf-phase-enter'); }
        }
        if (key === 'ca2-post-close') {
          var s7Conn = document.getElementById('ca2-s7-close-connector');
          if (s7Conn) { s7Conn.style.display = 'flex'; s7Conn.classList.add('wf-phase-enter'); }
          var s7Reply = document.getElementById('ca2-s7-sofia-close-reply');
          if (s7Reply) { s7Reply.style.display = 'block'; s7Reply.classList.add('wf-phase-enter'); }
          var s7Banner = document.getElementById('ca2-s7-reply-banner');
          if (s7Banner) { s7Banner.style.display = 'flex'; s7Banner.classList.add('wf-phase-enter'); }
        }
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

    if (id === 'ca2-s2-p1') { window._caNewSlide2 = 1; }
    else if (id === 'ca2-s2-p2') { window._caNewSlide2 = 2; }
    else if (id === 'ca2-s2-p3') { window._caNewSlide2 = 3; }
    else if (id === 'ca2-s2-p4') { window._caNewSlide2 = 4; }
    else if (id === 'ca2-s2-p5') { window._caNewSlide2 = 5; }
    else if (id === 'ca2-s2-p6') { window._caNewSlide2 = 6; }
    else if (id === 'ca2-s2-p7') { window._caNewSlide2 = 7; }

    if (id === 'ca2-s3-p0') { window._caNewSlide3 = 0; }
    else if (id === 'ca2-s3-p1') { window._caNewSlide3 = 1; }
    else if (id === 'ca2-s3-p2') { window._caNewSlide3 = 2; }
    else if (id === 'ca2-s3-p3') { window._caNewSlide3 = 3; }

    if (id === 'ca2-s4-p0') { window._caNewSlide4 = 0; }
    else if (id === 'ca2-s4-p1') { window._caNewSlide4 = 1; }
    else if (id === 'ca2-s4-p2') { window._caNewSlide4 = 2; }
    else if (id === 'ca2-s4-p3') { window._caNewSlide4 = 3; }

    if (id === 'ca2-s5-p0') { window._caNewSlide5 = 0; }
    else if (id === 'ca2-s5-p1') { window._caNewSlide5 = 1; }
    else if (id === 'ca2-s5-p2') { window._caNewSlide5 = 2; }

    if (id === 'ca2-s6-p0') { window._caNewSlide6 = 0; }
    else if (id === 'ca2-s6-p1') { window._caNewSlide6 = 1; }
    else if (id === 'ca2-s6-p2') { window._caNewSlide6 = 2; }
    else if (id === 'ca2-s6-p3') { window._caNewSlide6 = 3; }
    else if (id === 'ca2-s6-p4') { window._caNewSlide6 = 4; }

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
    if (typeof caNewUpdateStep2Pills === 'function') caNewUpdateStep2Pills();
    if (typeof caNewUpdateStep3Pills === 'function') caNewUpdateStep3Pills();
    if (typeof caNewUpdateStep4Pills === 'function') caNewUpdateStep4Pills();
    if (typeof caNewUpdateStep5Pills === 'function') caNewUpdateStep5Pills();
    if (typeof caNewUpdateStep6Pills === 'function') caNewUpdateStep6Pills();
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
        '<div class="zf-apply-card' + (isSubmitted ? ' is-completed' : '') + '" id="' + id + '-apply-card">' +
          '<div class="zf-apply-card-inner">' +
            (isSubmitted ?
              '<div class="zf-apply-card-badge done">&#10003; RATIFIED</div>' +
              '<h4 class="zf-apply-card-title">C.A.R. Form RLA &mdash; Residential Listing Agreement</h4>' +
              '<p class="zf-apply-card-prop">4827 Rolando Blvd, San Diego, CA 92115 &middot; Executed Sep 24, 2025</p>' +
              '<p class="zf-apply-card-desc" style="color:#15803d;font-weight:600;">&#10003; Listing agreement and 9 pre-listing package documents successfully signed and ratified by Daniel &amp; Carmen Herrera via DocuSign.</p>' +
              '<div class="zf-apply-card-actions">' +
                '<button type="button" class="zf-apply-card-btn secondary" onclick="caNewZfOpenDocFullscreen(\'' + id + '\', false)">&#128065; View Ratified Form RLA (Pop-up)</button>' +
              '</div>' :
              '<div class="zf-apply-card-badge">ZF+</div>' +
              '<h4 class="zf-apply-card-title">C.A.R. Form RLA &mdash; Residential Listing Agreement</h4>' +
              '<p class="zf-apply-card-prop">4827 Rolando Blvd, San Diego, CA 92115 &middot; Prepared Sep 24, 2025</p>' +
              '<p class="zf-apply-card-desc">Review the brokerage listing template, verify commission splits, exclusions (antique chandelier), and execute the C.A.R. Form RLA listing agreement via DocuSign in the ZipForm&reg; pop-up.</p>' +
              '<div class="zf-apply-card-actions">' +
                '<button type="button" class="zf-apply-card-btn primary" onclick="caNewZfOpenDocFullscreen(\'' + id + '\', false)">&#128203; Open Template</button>' +
                '<button type="button" class="zf-apply-card-btn secondary" onclick="caNewZfOpenDocFullscreen(\'' + id + '\', true)">&#9889; Auto-fill &amp; Open Template</button>' +
              '</div>'
            ) +
          '</div>' +
        '</div>' +
      '</div></div></div>' +
      zipformsTemplateModal(id, sections) +
      '<div class="zf-modal-overlay zf-doc-modal-overlay" id="' + id + '-doc-modal" style="display:none;" onclick="if(event.target===this) caNewZfCloseDocFullscreen(\'' + id + '\')">' +
        '<div class="zf-doc-modal-dialog" id="' + id + '-doc-modal-body">' +
          '<div id="' + id + '-doc-full">' +
        '<div class="wf-zf-toolbar">' +
          '<div class="wf-zf-toolbar-left">' +
            '<span class="wf-zf-logo">ZF</span>' +
            '<span class="wf-zf-title">ZipForm&reg; Plus &middot; Transaction Setup: 4827 Rolando Blvd &middot; Form: C.A.R. RLA</span>' +
          '</div>' +
          '<div class="wf-zf-toolbar-right" style="display:flex;align-items:center;gap:8px;">' +
            '<span class="wf-zf-status' + (isSubmitted ? ' done' : '') + '" id="' + id + '-status">' +
              (isSubmitted ? '&#10003; Signed &amp; Ratified' : 'Draft &mdash; In Progress') +
            '</span>' +
            '<button type="button" class="zf-doc-close-btn" id="' + id + '-doc-close-btn" onclick="caNewZfCloseDocFullscreen(\'' + id + '\')" title="Close">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="zf-doc-workspace">' +
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
    '</div>' +
  '</div>';

    return html;
  }

  window.caNewZfScrollTo = function (targetId) {
    var el = document.getElementById(targetId);
    if (el) {
      var ws = el.closest('.zf-doc-workspace');
      if (ws) {
        var wsRect = ws.getBoundingClientRect();
        var elRect = el.getBoundingClientRect();
        var topDiff = elRect.top - wsRect.top;
        ws.scrollTo({
          top: ws.scrollTop + topDiff - 10,
          behavior: 'smooth'
        });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  window.caNewZfToggleSection = function (id, secIdx) {
    // Keep function signature for backward compatibility
  };

  window.caNewZfOpenModal = function (id, tab) {
    var modal = document.getElementById(id + '-modal');
    if (!modal) return;
    if (modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
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
    document.body.style.overflow = '';
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
    caNewZfOpenDocFullscreen(id, false);
  };

  window.caNewZfOpenDocFullscreen = function (id, autoFill) {
    var modal = document.getElementById(id + '-doc-modal');
    if (!modal) return;
    if (modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
    if (autoFill) caNewZfAutoFill(id);

    var closeBtn = document.getElementById(id + '-doc-close-btn');
    if (closeBtn) closeBtn.style.display = 'inline-flex';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Reset scroll positions across all containers so the dialog always starts at the top
    modal.scrollTop = 0;
    var dialog = modal.querySelector('.zf-doc-modal-dialog');
    if (dialog) dialog.scrollTop = 0;
    var full = document.getElementById(id + '-doc-full');
    if (full) full.scrollTop = 0;
    var ws = modal.querySelector('.zf-doc-workspace');
    if (ws) ws.scrollTop = 0;

    // Blur any active element to prevent browser auto-scrolling
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  };

  window.caNewZfCloseDocFullscreen = function (id) {
    var modal = document.getElementById(id + '-doc-modal');
    if (!modal) return;
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
      if (applyCard) {
        applyCard.className = 'zf-apply-card is-completed';
        applyCard.style.display = '';
        applyCard.innerHTML =
          '<div class="zf-apply-card-inner">' +
            '<div class="zf-apply-card-badge done">&#10003; RATIFIED</div>' +
            '<h4 class="zf-apply-card-title">C.A.R. Form RLA &mdash; Residential Listing Agreement</h4>' +
            '<p class="zf-apply-card-prop">4827 Rolando Blvd, San Diego, CA 92115 &middot; Executed Sep 24, 2025</p>' +
            '<p class="zf-apply-card-desc" style="color:#15803d;font-weight:600;">&#10003; Listing agreement and 9 pre-listing package documents successfully signed and ratified by Daniel &amp; Carmen Herrera via DocuSign.</p>' +
            '<div class="zf-apply-card-actions">' +
              '<button type="button" class="zf-apply-card-btn secondary" onclick="caNewZfOpenDocFullscreen(\'' + id + '\', false)">&#128065; View Ratified Form RLA (Pop-up)</button>' +
            '</div>' +
          '</div>';
      }
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
          '<button type="button" class="wf-deck-prev wf-ss-prev-btn" onclick="caNewSsSwitchTab(\'' + id + '\', 0)">&larr; Review Listing Details</button>' +
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
    { key: 'tds', title: 'Transfer Disclosure Statement (TDS)', type: 'pending', pendingText: 'Pending · Step 5' },
    { key: 'spq', title: 'Seller Property Questionnaire (SPQ)', type: 'pending', pendingText: 'Pending · Step 5' },
    { key: 'lead', title: 'Lead-Based Paint Disclosure', type: 'pending', pendingText: 'Pending · Step 5' },
    { key: 'nhd', title: 'Natural Hazard Disclosure (NHD)', type: 'pending', pendingText: 'Pending · Step 5' },
    { key: 'avid', title: 'Agent Visual Inspection (AVID)', type: 'pending', pendingText: 'Pending · Step 5' },
    { key: 'prelim', title: 'Preliminary Title Report', type: 'pending', pendingText: 'Pending · Step 5' }
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

    var herreraReply =
      '<div class="wf-email-card received" id="ca2-s1-herrera-reply" style="display:' + (confirmDone ? 'block' : 'none') + ';margin-bottom:20px;">' +
        '<div class="wf-email-card-header received">' +
          '<div class="wf-email-card-status">' +
            '<div class="wf-email-badge-group">' +
              '<span class="wf-email-type-badge received">&#128233; Inbox &middot; Client Reply</span>' +
              '<span class="wf-email-status-pill success">&#10003; Received &middot; DocuSign Ratified</span>' +
            '</div>' +
            '<div class="wf-email-time-tag">Wed, Sep 24, 2025 at 4:38 PM (just now)</div>' +
          '</div>' +
          '<div class="wf-email-card-profile">' +
            '<div class="wf-email-avatar-wrap">' +
              '<div class="wf-email-avatar" style="background:#0284c7;color:#fff;font-weight:800;">DH</div>' +
              '<span class="wf-email-avatar-status"></span>' +
            '</div>' +
            '<div class="wf-email-sender-info">' +
              '<div class="wf-email-sender-name">Daniel &amp; Carmen Herrera <span class="wf-email-role-tag">Sellers &middot; Clients</span></div>' +
              '<div class="wf-email-sender-address">&lt;herrera.family@email.com&gt; &middot; To: Transaction Coordinator, CC: Sofia Reyes</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email-card-body received">' +
          '<p>Dear Transaction Coordinator,</p>' +
          '<p>Thank you so much for the comprehensive summary and for getting the listing paperwork handled so efficiently. Carmen and I just completed signing the Residential Listing Agreement package via DocuSign!</p>' +
          '<div class="wf-email-content-block">' +
            '<p>We reviewed all the points in your email:</p>' +
            '<ul>' +
              '<li><strong>Listing Terms:</strong> We confirmed the $889,000 price and the listing dates (Sep 24, 2025 to Mar 24, 2026).</li>' +
              '<li><strong>Chandelier Exclusion:</strong> We are especially relieved that Carmen\'s grandmother\'s antique dining room chandelier is officially excluded and noted in writing &mdash; that heirloom means the world to our family.</li>' +
              '<li><strong>Included Items:</strong> We understand the refrigerator, washer, and dryer remain with the home.</li>' +
              '<li><strong>Next Steps:</strong> We received your note about the <strong>TDS</strong>, <strong>SPQ</strong>, and <strong>Lead-Based Paint Disclosure</strong>. Please send those over as soon as they are ready; we will start filling them out immediately so Sofia can launch the MLS listing by September 30.</li>' +
            '</ul>' +
          '</div>' +
          '<p>Thank you for keeping us organized every step of the way!</p>' +
          '<p style="margin-top:14px;">Warm regards,<br><strong>Daniel &amp; Carmen Herrera</strong><br><span style="font-size:12px;color:var(--v-muted);">(619) 555-0488 &middot; 4827 Rolando Blvd</span></p>' +
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
          herreraReply +
          '<div class="wf-deck-nav" style="margin-top:24px;">' +
            '<button type="button" class="wf-deck-prev" onclick="caNewGoStep1Sub(1)">&larr; Back to SkySlope File Setup</button>' +
            '<button type="button" class="wf-nav-btn primary" onclick="wfNext()">Continue to Step 3: Offer Review &amp; Negotiation &rarr;</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    return step(2, 'Listing Agreement & File Setup', 'Wed, Sep 24, 2025',
      'Draft the listing package (9 C.A.R. forms) in Zipforms, upload compliance documents to SkySlope, and confirm the listing terms with the Herreras.',
      main, side([], ['fhda', 'wire', 'sa', 'dia', 'ad', 'ccpa', 'mlsa', 'tds', 'bca', 'rla', 'lead', 'da', 'nhd'], ['sofia', 'daniel', 'carmen'], true), true);
  }

  /* ---------- Sub-step Controller for Step 3 (Offer Review & Negotiation) ---------- */
  window._caNewSlide2 = null;

  window.caNewGoStep2Sub = function (idx) {
    if (idx === undefined || idx === null) idx = 0;
    var cur = (typeof window._caNewSlide2 === 'number') ? window._caNewSlide2 : 0;

    if (idx < cur) {
      window._caNewSlide2 = idx;
      caNewApplyStep2Sub(idx);
      return;
    }

    var e1Res = run()['r_ca2-offer-extract-1'];
    var e1Done = !!(e1Res && e1Res.length && e1Res.indexOf(false) === -1);
    var e2Res = run()['r_ca2-offer-extract-2'];
    var e2Done = !!(e2Res && e2Res.length && e2Res.indexOf(false) === -1);
    var chatDone = !!run()['c_ca2-daniel-reply'];
    var ctrRes = run()['r_ca2-counter'];
    var ctrDone = !!(ctrRes && ctrRes.length && ctrRes.indexOf(false) === -1);

    // Gating: pills 2-3 need e1Done, pill 4 needs e2Done,
    // pills 5-6 need chatDone, pill 7 needs ctrDone
    if (idx >= 2 && idx <= 3 && !e1Done) { window._caNewSlide2 = 0; caNewApplyStep2Sub(0); return; }
    else if (idx === 4 && !e2Done) { window._caNewSlide2 = e1Done ? 2 : 0; caNewApplyStep2Sub(window._caNewSlide2); return; }
    else if (idx >= 5 && idx <= 6 && !chatDone) { window._caNewSlide2 = e2Done ? 4 : (e1Done ? 2 : 0); caNewApplyStep2Sub(window._caNewSlide2); return; }
    else if (idx === 7 && !ctrDone) { window._caNewSlide2 = chatDone ? 5 : (e2Done ? 4 : (e1Done ? 2 : 0)); caNewApplyStep2Sub(window._caNewSlide2); return; }

    window._caNewSlide2 = idx;
    caNewApplyStep2Sub(idx);
  };

  window.caNewApplyStep2Sub = function (idx) {
    var phaseIds = ['ca2-s2-p0', 'ca2-s2-p1', 'ca2-s2-p2', 'ca2-s2-p3', 'ca2-s2-p4', 'ca2-s2-p5', 'ca2-s2-p6', 'ca2-s2-p7'];
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

    caNewUpdateStep2Pills();

    var topEl = document.querySelector('.mh-top');
    if (topEl) topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.caNewUpdateStep2Pills = function () {
    var cur = (typeof window._caNewSlide2 === 'number') ? window._caNewSlide2 : 0;

    var e1Res = run()['r_ca2-offer-extract-1'];
    var e1Done = !!(e1Res && e1Res.length && e1Res.indexOf(false) === -1);
    var e2Res = run()['r_ca2-offer-extract-2'];
    var e2Done = !!(e2Res && e2Res.length && e2Res.indexOf(false) === -1);
    var chatDone = !!run()['c_ca2-daniel-reply'];
    var ctrRes = run()['r_ca2-counter'];
    var ctrDone = !!(ctrRes && ctrRes.length && ctrRes.indexOf(false) === -1);
    var composeDone = !!run()['c_ca2-ratification-confirm'];

    var states = [
      e1Done ? 'done' : 'upcoming',
      e1Done ? 'done' : 'upcoming',
      e2Done ? 'done' : (!e1Done ? 'locked' : 'upcoming'),
      e2Done ? 'done' : (!e1Done ? 'locked' : 'upcoming'),
      chatDone ? 'done' : (!e2Done ? 'locked' : 'upcoming'),
      ctrDone ? 'done' : (!chatDone ? 'locked' : 'upcoming'),
      ctrDone ? 'done' : (!chatDone ? 'locked' : 'upcoming'),
      composeDone ? 'done' : (!ctrDone ? 'locked' : 'upcoming')
    ];

    for (var i = 0; i < 8; i++) {
      var pill = document.getElementById('ca2-s2-pill-' + i);
      if (!pill) continue;
      var base = 'wf-substep-pill wf-pt-item ';
      pill.className = base + (i === cur ? 'active' : states[i]);
    }
  };

  /* ── Step 3 slide-next validators ── */
  window.caNewS2Extract1Next = function () {
    caNewCheck('ca2-offer-extract-1');
    var res = run()['r_ca2-offer-extract-1'];
    var ok = !!(res && res.length && res.indexOf(false) === -1);
    var errEl = document.getElementById('ca2-s2-p1-err');
    if (ok) {
      if (errEl) errEl.style.display = 'none';
      caNewGoStep2Sub(2);
    } else {
      if (errEl) {
        errEl.innerHTML = '<strong>&#9888; Incomplete Extraction:</strong> Please complete all fields correctly from Marcus Lee\'s offer email before proceeding. Check the red fields or use Auto-fill.';
        errEl.style.display = 'block';
        errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  window.caNewS2Extract2Next = function () {
    caNewCheck('ca2-offer-extract-2');
    var res = run()['r_ca2-offer-extract-2'];
    var ok = !!(res && res.length && res.indexOf(false) === -1);
    var errEl = document.getElementById('ca2-s2-p3-err');
    if (ok) {
      if (errEl) errEl.style.display = 'none';
      caNewGoStep2Sub(4);
    } else {
      if (errEl) {
        errEl.innerHTML = '<strong>&#9888; Incomplete Extraction:</strong> Please complete all fields correctly from Rachel Torres\'s offer email before proceeding. Check the red fields or use Auto-fill.';
        errEl.style.display = 'block';
        errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  window.caNewS2CounterNext = function () {
    caNewCheck('ca2-counter');
    var res = run()['r_ca2-counter'];
    var ok = !!(res && res.length && res.indexOf(false) === -1);
    var errEl = document.getElementById('ca2-s2-p6-err');
    if (ok) {
      if (errEl) errEl.style.display = 'none';
      caNewGoStep2Sub(7);
    } else {
      if (errEl) {
        errEl.innerHTML = '<strong>&#9888; Incomplete Counter Terms:</strong> Please complete all fields correctly from Sofia\'s counter instructions before proceeding. Check the red fields or use Auto-fill.';
        errEl.style.display = 'block';
        errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  /* ════════════════ Step 3: Offer Review & Negotiation ════════════════ */
  function caNewStep2() {
    var extract1Res = run()['r_ca2-offer-extract-1'];
    var extract1Done = !!(extract1Res && extract1Res.length && extract1Res.indexOf(false) === -1);
    var extract2Res = run()['r_ca2-offer-extract-2'];
    var extract2Done = !!(extract2Res && extract2Res.length && extract2Res.indexOf(false) === -1);
    var chatDone = !!run()['c_ca2-daniel-reply'];
    var counterRes = run()['r_ca2-counter'];
    var counterDone = !!(counterRes && counterRes.length && counterRes.indexOf(false) === -1);
    var composeDone = !!run()['c_ca2-ratification-confirm'];

    var curActiveIdx = composeDone ? 7 : (counterDone ? 7 : (chatDone ? 5 : (extract2Done ? 4 : (extract1Done ? 2 : 0))));

    if (window._caNewSlide2 === null || window._caNewSlide2 === undefined) {
      window._caNewSlide2 = curActiveIdx;
    }
    var curSlide = (typeof window._caNewSlide2 === 'number') ? window._caNewSlide2 : curActiveIdx;

    /* ── Offer Email 1: Marcus Lee (eXp Realty) — $840,000 Conventional ── */
    var offerCard1 =
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
            '<span class="wf-email-tool-tag" style="background:rgba(224,169,59,.18);color:#d97706;border-color:rgba(224,169,59,.4);">&#128181; Offer #1</span>' +
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

    /* ── Offer Email 2: Rachel Torres (Compass) — $855,000 Cash ── */
    var offerCard2 =
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
            '<span class="wf-email-tool-tag" style="background:rgba(16,185,129,.18);color:#059669;border-color:rgba(16,185,129,.4);">&#128176; Offer #2 &middot; Cash</span>' +
            '<span class="wf-email-time">Wed, Oct 1, 2025 &middot; 3:45 PM</span>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email">' +
          '<div class="wf-email-header">' +
            '<div class="wf-email-subject-bar">' +
              '<h3 class="wf-email-subject">Cash Offer: 4827 Rolando Blvd &mdash; Kevin &amp; Priya Patel</h3>' +
              '<span class="wf-email-priority-badge" style="background:rgba(139,92,246,.1);color:#7c3aed;border-color:rgba(139,92,246,.3);">&#128176; All-Cash &middot; Proof of Funds Attached</span>' +
            '</div>' +
            '<div class="wf-email-sender-profile">' +
              '<div class="wf-email-avatar-wrap">' +
                '<div class="wf-email-avatar" style="background:linear-gradient(135deg, #1a1a2e 0%, #374151 100%);box-shadow:0 0 0 2.5px #6b7280, 0 4px 12px rgba(26,26,46,.25);">RT</div>' +
                '<span class="wf-email-avatar-status" title="Active now"></span>' +
              '</div>' +
              '<div class="wf-email-sender-info">' +
                '<div class="wf-email-sender-line">' +
                  '<span class="wf-email-sender-name">Rachel Torres</span>' +
                  '<span class="wf-email-sender-addr">&lt;rachel.torres@compass.com&gt;</span>' +
                  '<span class="wf-badge-verified">&#10003; Verified Agent</span>' +
                  '<span class="wf-badge-broker" style="color:#1a1a2e;border-color:#374151;">Compass</span>' +
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
            '<p>I\'m submitting an <strong>all-cash purchase offer</strong> on behalf of my buyers, <strong>Kevin and Priya Patel</strong>, for <strong>4827 Rolando Blvd</strong>:</p>' +
            '<div class="wf-email-terms-grid">' +
              '<div class="wf-term-item"><span>Purchase Price</span><b>$855,000 (All Cash)</b></div>' +
              '<div class="wf-term-item"><span>Financing</span><b>None &mdash; Cash purchase, proof of funds attached</b></div>' +
              '<div class="wf-term-item"><span>Initial EMD</span><b>$42,750 (5% deposit) to Chicago Title</b></div>' +
              '<div class="wf-term-item"><span>Close of Escrow</span><b>21 days from acceptance</b></div>' +
              '<div class="wf-term-item"><span>Contingencies</span><b>10-day Inspection only &mdash; No appraisal, no loan contingency</b></div>' +
              '<div class="wf-term-item"><span>Seller Credit</span><b>$12,000 credit for deferred maintenance</b></div>' +
              '<div class="wf-term-item"><span>Home Warranty</span><b>Not requested</b></div>' +
              '<div class="wf-term-item"><span>Acceptance Deadline</span><b>48 hours from presentation to sellers</b></div>' +
            '</div>' +
            '<p style="margin-top:14px">My buyers are relocating from the Bay Area with verified proof of funds through First Republic Private Banking. They are motivated to close quickly. Please present promptly &mdash; the 48-hour acceptance window is firm.</p>' +
            '<div class="wf-sig">' +
              '<div class="wf-sig-valediction">Regards,</div>' +
              '<div class="wf-sig-card" style="border-left-color:#374151;">' +
                '<div class="wf-sig-primary">' +
                  '<div class="wf-sig-brand-block" style="background:linear-gradient(145deg, #1a1a2e 0%, #374151 100%);border-color:rgba(107,114,128,.4);">' +
                    '<div class="wf-sig-broker-emblem" style="border-color:#6b7280;background:rgba(107,114,128,.18);">' +
                      '<span class="wf-sig-emblem-initials" style="color:#ffffff;">&#9678;</span>' +
                    '</div>' +
                    '<div class="wf-sig-brand-title" style="color:#ffffff;">COMPASS</div>' +
                    '<div class="wf-sig-brand-sub" style="color:#9ca3af;">Real Estate</div>' +
                    '<div class="wf-sig-brand-loc">San Diego &middot; Del Mar</div>' +
                    '<div class="wf-sig-brand-seal" style="border-top-color:rgba(107,114,128,.3);color:#d1d5db;">LUXURY DIVISION</div>' +
                  '</div>' +
                  '<div class="wf-sig-divider-v" style="background:linear-gradient(180deg, #6b7280, var(--v-line));"></div>' +
                  '<div class="wf-sig-agent-details">' +
                    '<div class="wf-sig-name-row">' +
                      '<span class="wf-sig-agent-name">Rachel Torres</span>' +
                      '<span class="wf-sig-badge-realtor" style="background:rgba(55,65,81,.1);color:#374151;border-color:rgba(55,65,81,.3);">REALTOR&reg;</span>' +
                      '<span class="wf-sig-badge-dre">CalDRE #02087654</span>' +
                    '</div>' +
                    '<div class="wf-sig-title" style="color:#374151;">Luxury Property Specialist &middot; The Patel Group</div>' +
                    '<div class="wf-sig-brokerage-line">Compass California, Inc. &middot; Corporate DRE #01991628</div>' +
                    '<div class="wf-sig-contact-grid">' +
                      '<div class="wf-sig-contact-item"><span class="wf-sig-icon">&#128222;</span> <strong>Direct:</strong> (619) 555-0385</div>' +
                      '<div class="wf-sig-contact-item"><span class="wf-sig-icon">&#9993;</span> <strong>Email:</strong> rachel.torres@compass.com</div>' +
                      '<div class="wf-sig-contact-item"><span class="wf-sig-icon">&#127760;</span> <strong>Web:</strong> racheltorresrealty.com</div>' +
                      '<div class="wf-sig-contact-item"><span class="wf-sig-icon">&#128205;</span> <strong>Office:</strong> 1250 Prospect St, Suite 100, La Jolla, CA</div>' +
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

    /* ── Context card: Sofia forwards first offer ── */
    var contextCard1 = card('Incoming Offer',
      'Sofia Reyes forwarded Marcus Lee\'s purchase offer package',
      '<p>Sofia writes: <em>"TC &mdash; just received an offer from Marcus Lee at eXp Realty for 4827 Rolando Blvd. Please review his submission, pull the key terms, and organize them for me before I present to Daniel and Carmen tonight. Pay close attention to price, financing, EMD, and contingency timeframes."</em></p>');

    /* ── Context card: Sofia forwards second offer ── */
    var contextCard2 = card('Second Offer Received!',
      'Sofia Reyes forwarded a competing cash offer &mdash; same day',
      '<p>Sofia writes: <em>"TC &mdash; another offer just came in, this one from Rachel Torres at Compass. It\'s an all-cash offer! Please pull the key terms from this one too so I can compare both side by side when I present to the Herreras tonight. Watch for any special conditions &mdash; seller credits, deadlines, anything unusual."</em></p>');

    /* ── Extract Form 1: Marcus Lee ── */
    var extractForm1 = form('ca2-offer-extract-1', 'Extract Offer Terms: Marcus Lee &mdash; eXp Realty', 'From Marcus Lee\'s offer email (use the peek bar above to review), extract the key terms Sofia needs for her presentation to the sellers.', [
      { label: 'Purchase price', kind: 'money', ans: 840000, ph: '$', show: '$840,000' },
      { label: 'Down payment percentage', kind: 'text', ans: ['20', '20%'], ph: '%', show: '20%' },
      { label: 'Financing type', kind: 'select', ans: 'conventional', show: 'Conventional',
        options: [['conventional', 'Conventional'], ['fha', 'FHA'], ['va', 'VA'], ['cash', 'Cash']] },
      { label: 'EMD amount', kind: 'money', ans: 16800, ph: '$', show: '$16,800' },
      { label: 'Lender', kind: 'text', ans: ['pacific home lending', 'tyler adams'], ph: 'Lender / loan officer', show: 'Pacific Home Lending (Tyler Adams)' },
      { label: 'Proposed close of escrow', kind: 'text', ans: ['30', '30 days', '30 days from acceptance'], ph: 'Timeline', show: '30 days from acceptance' },
      { label: 'Inspection contingency', kind: 'text', ans: ['17', '17 days'], ph: 'Days', show: '17 days' },
      { label: 'Appraisal contingency', kind: 'text', ans: ['17', '17 days'], ph: 'Days', show: '17 days' },
      { label: 'Loan contingency', kind: 'text', ans: ['21', '21 days'], ph: 'Days', show: '21 days' },
      { label: 'Home warranty', kind: 'select', ans: 'seller', show: 'Seller pays up to $600',
        options: [['seller', 'Seller pays up to $600'], ['buyer', 'Buyer pays'], ['none', 'No warranty']] }
    ]);

    /* ── Extract Form 2: Rachel Torres ── */
    var extractForm2 = form('ca2-offer-extract-2', 'Extract Offer Terms: Rachel Torres &mdash; Compass', 'From Rachel Torres\'s cash offer email (use the peek bar above to review), extract the key terms. Note the differences from Marcus Lee\'s conventional offer.', [
      { label: 'Purchase price', kind: 'money', ans: 855000, ph: '$', show: '$855,000' },
      { label: 'Financing type', kind: 'select', ans: 'cash', show: 'Cash',
        options: [['conventional', 'Conventional'], ['fha', 'FHA'], ['va', 'VA'], ['cash', 'Cash']] },
      { label: 'EMD amount', kind: 'money', ans: 42750, ph: '$', show: '$42,750' },
      { label: 'Proposed close of escrow', kind: 'text', ans: ['21', '21 days', '21 days from acceptance'], ph: 'Timeline', show: '21 days from acceptance' },
      { label: 'Inspection contingency', kind: 'text', ans: ['10', '10 days'], ph: 'Days', show: '10 days' },
      { label: 'Appraisal contingency', kind: 'select', ans: 'waived', show: 'Waived (Cash &mdash; no lender requirement)',
        options: [['waived', 'Waived (Cash — no lender requirement)'], ['17', '17 days'], ['21', '21 days']] },
      { label: 'Loan contingency', kind: 'select', ans: 'na', show: 'N/A &mdash; Cash offer',
        options: [['na', 'N/A — Cash offer'], ['17', '17 days'], ['21', '21 days']] },
      { label: 'Seller credit requested', kind: 'money', ans: 12000, ph: '$', show: '$12,000' },
      { label: 'Home warranty', kind: 'select', ans: 'none', show: 'Not requested',
        options: [['seller', 'Seller pays up to $600'], ['buyer', 'Buyer pays'], ['none', 'Not requested']] },
      { label: 'Acceptance deadline', kind: 'text', ans: ['48', '48 hours', '48 hrs'], ph: 'Hours', show: '48 hours' }
    ]);

    /* ── Daniel's email asking about the offers ── */
    var danielEmail =
      '<div class="wf-email-inbox-wrap">' +
        '<div class="wf-email-client-bar">' +
          '<div class="wf-email-client-left">' +
            '<div class="wf-email-window-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>' +
            '<div class="wf-email-folder"><span class="wf-folder-icon">&#128233;</span> <strong>Inbox</strong> &rsaquo; Sellers &rsaquo; 4827 Rolando Blvd</div>' +
          '</div>' +
          '<div class="wf-email-client-right">' +
            '<div class="wf-email-actions">' +
              '<button type="button" class="wf-email-action-btn" title="Reply">&#8617; Reply</button>' +
              '<button type="button" class="wf-email-action-btn" title="Star">&#9733;</button>' +
              '<button type="button" class="wf-email-action-btn" title="Print">&#128438;</button>' +
            '</div>' +
            '<span class="wf-email-tool-tag" style="background:rgba(224,169,59,.18);color:#d97706;border-color:rgba(224,169,59,.4);">&#128172; Seller Question</span>' +
            '<span class="wf-email-time">Wed, Oct 1, 2025 &middot; 5:12 PM</span>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email">' +
          '<div class="wf-email-header">' +
            '<div class="wf-email-subject-bar">' +
              '<h3 class="wf-email-subject">Re: Offers on 4827 Rolando &mdash; Quick question before tonight</h3>' +
            '</div>' +
            '<div class="wf-email-sender-profile">' +
              '<div class="wf-email-avatar-wrap">' +
                '<div class="wf-email-avatar" style="background:linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);box-shadow:0 0 0 2.5px #64748b, 0 4px 12px rgba(30,58,95,.2);">DH</div>' +
              '</div>' +
              '<div class="wf-email-sender-info">' +
                '<div class="wf-email-sender-line">' +
                  '<span class="wf-email-sender-name">Daniel Herrera</span>' +
                  '<span class="wf-email-sender-addr">&lt;daniel.herrera@gmail.com&gt;</span>' +
                  '<span class="wf-badge-broker" style="color:#1e3a5f;border-color:#2d5a87;">Seller</span>' +
                '</div>' +
                '<div class="wf-email-recipient-line">' +
                  '<span>To: <strong>TC</strong> &lt;tc@bhhscal.com&gt;</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="wf-email-body">' +
            '<p>Hi,</p>' +
            '<p>Sofia told us we got <strong>two offers today</strong> and she\'s coming over tonight to present them. I\'m really excited &mdash; one is all cash and it\'s higher too!</p>' +
            '<p>Between you and me, I think we should just <strong>go with the cash offer</strong>. It\'s more money, faster close, fewer headaches. Why would we even consider the other one? Can we just <strong>reject the conventional offer</strong> and accept the cash one before tonight so we don\'t waste time?</p>' +
            '<p>What do you think? You\'ve seen both offers &mdash; which one is stronger?</p>' +
            '<p>Thanks,<br>Daniel</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    var danielReplyCompose = compose({
      key: 'ca2-daniel-reply',
      scenario: 'tc-ca-daniel-boundary',
      prompt: 'Reply to Daniel maintaining TC professional boundaries',
      to: 'Daniel Herrera <daniel.herrera@gmail.com>',
      subj: 'Re: Offers on 4827 Rolando — Quick question before tonight',
      inst: 'Daniel is asking you to advise on which offer to accept. As TC, you must NOT give advice on accepting, rejecting, or comparing offers &mdash; that is Sofia\'s fiduciary duty as listing agent. Politely redirect Daniel to Sofia, confirm both offers are organized for tonight\'s presentation, and reassure him that Sofia will walk them through the pros and cons of each.',
      ans: 'Hi Daniel,\n\nThank you for letting me know you\'re excited about the offers — it\'s great news that 4827 Rolando Blvd attracted multiple offers on the first day!\n\nI want to be transparent with you: as the Transaction Coordinator, my role is administrative — I organize documents, track deadlines, and ensure everything is filed correctly. Advising on which offer to accept, reject, or counter is Sofia\'s responsibility as your listing agent. She has the fiduciary duty to analyze each offer\'s full picture, including net-to-seller after credits, buyer reliability, contingency terms, and closing timeline alignment with your Austin move.\n\nWhat I can tell you is that both offers are fully documented and organized for Sofia\'s presentation tonight. She\'ll walk you and Carmen through the pros and cons of each so you can make an informed decision together.\n\nWould you like me to confirm with Sofia that everything is ready for this evening?\n\nBest regards,\nTransaction Coordinator\nBerkshire Hathaway HomeServices California Properties'
    });

    /* ── Sofia's email with offer analysis & counter instructions ── */
    var sofiaEmail =
      '<div class="wf-email-inbox-wrap">' +
        '<div class="wf-email-client-bar">' +
          '<div class="wf-email-client-left">' +
            '<div class="wf-email-window-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>' +
            '<div class="wf-email-folder"><span class="wf-folder-icon">&#128233;</span> <strong>Inbox</strong> &rsaquo; Agents &rsaquo; 4827 Rolando Blvd</div>' +
          '</div>' +
          '<div class="wf-email-client-right">' +
            '<div class="wf-email-actions">' +
              '<button type="button" class="wf-email-action-btn" title="Reply">&#8617; Reply</button>' +
              '<button type="button" class="wf-email-action-btn" title="Star">&#9733;</button>' +
              '<button type="button" class="wf-email-action-btn" title="Print">&#128438;</button>' +
            '</div>' +
            '<span class="wf-email-tool-tag" style="background:rgba(31,158,90,.18);color:#1f9e5a;border-color:rgba(31,158,90,.4);">&#128203; Counter Instructions</span>' +
            '<span class="wf-email-time">Wed, Oct 1, 2025 &middot; 9:48 PM</span>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email">' +
          '<div class="wf-email-header">' +
            '<div class="wf-email-subject-bar">' +
              '<h3 class="wf-email-subject">4827 Rolando Blvd &mdash; Offer Presentation Results &amp; Counter Instructions</h3>' +
              '<span class="wf-email-priority-badge" style="background:rgba(224,169,59,.1);color:#d97706;border-color:rgba(224,169,59,.3);">&#9889; Action Required</span>' +
            '</div>' +
            '<div class="wf-email-sender-profile">' +
              '<div class="wf-email-avatar-wrap">' +
                '<div class="wf-email-avatar" style="background:linear-gradient(135deg, #6d1f3d 0%, #a03060 100%);box-shadow:0 0 0 2.5px #c4507a, 0 4px 12px rgba(109,31,61,.25);">SR</div>' +
                '<span class="wf-email-avatar-status" title="Active now"></span>' +
              '</div>' +
              '<div class="wf-email-sender-info">' +
                '<div class="wf-email-sender-line">' +
                  '<span class="wf-email-sender-name">Sofia Reyes</span>' +
                  '<span class="wf-email-sender-addr">&lt;sofia.reyes@bhhscal.com&gt;</span>' +
                  '<span class="wf-badge-verified">&#10003; Verified Agent</span>' +
                  '<span class="wf-badge-broker" style="color:#6d1f3d;border-color:#a03060;">BHHS</span>' +
                '</div>' +
                '<div class="wf-email-recipient-line">' +
                  '<span>To: <strong>TC</strong> &lt;tc@bhhscal.com&gt;</span>' +
                  '<span class="wf-badge-tls">&#128274; TLS 1.3 Encrypted</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="wf-email-body">' +
            '<p>Hi TC,</p>' +
            '<p>Just left the Herreras\' home &mdash; thanks for organizing both offers so cleanly, it made the presentation much easier. Here\'s the recap:</p>' +
            '<div class="wf-email-terms-grid">' +
              '<div class="wf-term-item" style="grid-column:1/-1;"><span style="font-weight:800;color:#dc2626;">&#10008; Offer #2 &mdash; Rachel Torres (Compass) &mdash; DECLINED</span><b>$855K cash, but $12K seller credit = $843K net. 48-hr deadline felt like a pressure tactic. Daniel didn\'t appreciate it.</b></div>' +
              '<div class="wf-term-item" style="grid-column:1/-1;"><span style="font-weight:800;color:#059669;">&#10004; Offer #1 &mdash; Marcus Lee (eXp) &mdash; COUNTERING</span><b>$840K, no seller credits = $840K net. Brooks wrote a personal letter about raising kids in Rolando Village &mdash; Carmen loved it. Pre-approval with Pacific Home Lending is solid.</b></div>' +
            '</div>' +
            '<p style="margin-top:14px">I\'ll handle the rejection letter to Rachel Torres directly. Please prepare <strong>Seller Counter Offer #1</strong> to Marcus Lee\'s buyers with these terms:</p>' +
            '<div class="wf-email-terms-grid">' +
              '<div class="wf-term-item"><span>Counter Price</span><b>$875,000</b></div>' +
              '<div class="wf-term-item"><span>EMD Amount</span><b>$17,500 (increased from $16,800)</b></div>' +
              '<div class="wf-term-item"><span>Close of Escrow</span><b>November 3, 2025 &mdash; FIRM (non-negotiable, Austin relocation)</b></div>' +
              '<div class="wf-term-item"><span>Inspection Contingency</span><b>Keep at 17 days</b></div>' +
              '<div class="wf-term-item"><span>Home Warranty</span><b>Agree to seller pays up to $600</b></div>' +
            '</div>' +
            '<p style="margin-top:14px">The November 3 close is non-negotiable &mdash; Daniel and Carmen\'s Austin relocation deadline depends on it. Please have the SCO ready for my review first thing tomorrow morning.</p>' +
            '<div class="wf-sig">' +
              '<div class="wf-sig-valediction">Thanks,</div>' +
              '<div class="wf-sig-card" style="border-left-color:#a03060;">' +
                '<div class="wf-sig-primary">' +
                  '<div class="wf-sig-brand-block" style="background:linear-gradient(145deg, #6d1f3d 0%, #a03060 100%);border-color:rgba(196,80,122,.4);">' +
                    '<div class="wf-sig-broker-emblem" style="border-color:#c4507a;background:rgba(196,80,122,.18);">' +
                      '<span class="wf-sig-emblem-initials" style="color:#ffffff;">BH</span>' +
                    '</div>' +
                    '<div class="wf-sig-brand-title" style="color:#ffffff;">BERKSHIRE HATHAWAY</div>' +
                    '<div class="wf-sig-brand-sub" style="color:#e8a0b8;">HomeServices</div>' +
                    '<div class="wf-sig-brand-loc">California Properties</div>' +
                    '<div class="wf-sig-brand-seal" style="border-top-color:rgba(196,80,122,.3);color:#f0c0d0;">SAN DIEGO METRO</div>' +
                  '</div>' +
                  '<div class="wf-sig-divider-v" style="background:linear-gradient(180deg, #c4507a, var(--v-line));"></div>' +
                  '<div class="wf-sig-agent-details">' +
                    '<div class="wf-sig-name-row">' +
                      '<span class="wf-sig-agent-name">Sofia Reyes</span>' +
                      '<span class="wf-sig-badge-realtor" style="background:rgba(109,31,61,.1);color:#6d1f3d;border-color:rgba(109,31,61,.3);">REALTOR&reg;</span>' +
                      '<span class="wf-sig-badge-dre">CalDRE #01987654</span>' +
                    '</div>' +
                    '<div class="wf-sig-title" style="color:#6d1f3d;">Listing Agent &middot; Luxury Properties Division</div>' +
                    '<div class="wf-sig-brokerage-line">Berkshire Hathaway HomeServices California Properties &middot; DRE #01317331</div>' +
                    '<div class="wf-sig-contact-grid">' +
                      '<div class="wf-sig-contact-item"><span class="wf-sig-icon">&#128222;</span> <strong>Direct:</strong> (619) 555-0142</div>' +
                      '<div class="wf-sig-contact-item"><span class="wf-sig-icon">&#9993;</span> <strong>Email:</strong> sofia.reyes@bhhscal.com</div>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    var counterForm = form('ca2-counter', 'Counter offer terms', 'From Sofia\'s counter instructions email (use the peek bar above to review), extract the terms for Seller Counter Offer #1 to Marcus Lee\'s buyers.', [
      { label: 'Counter price', kind: 'money', ans: 875000, ph: '$', show: '$875,000' },
      { label: 'EMD amount', kind: 'money', ans: 17500, ph: '$', show: '$17,500' },
      { label: 'Close of escrow date', kind: 'date', ans: '2025-11-03', ph: 'mm/dd/yyyy', show: '11/03/2025' },
      { label: 'Inspection contingency days', kind: 'text', ans: ['17', '17 days'], ph: 'Days', show: '17' },
      { label: 'Home warranty', kind: 'select', ans: 'seller', show: 'Seller pays up to $600',
        options: [['seller', 'Seller pays up to $600'], ['buyer', 'Buyer pays'], ['none', 'No warranty']] }
    ]);

    /* ── Negotiation timeline ── */
    var negTimeline = card('Negotiation Rounds & Ratification',
      'Track contract counters through mutual agreement.',
      timeline([
        ['Oct 1, 2025', 'Two offers received: Marcus Lee (eXp) at $840,000 conventional &amp; Rachel Torres (Compass) at $855,000 cash'],
        ['Oct 1, 2025', 'Sofia presents both offers to the Herreras. Sellers choose to counter Marcus Lee\'s offer; Rachel Torres\'s offer declined'],
        ['Oct 2, 2025', 'Seller issues Counter Offer #1 to Marcus Lee at $875,000 with firm Nov 3, 2025 closing deadline'],
        ['Oct 3, 2025', 'Buyer responds with Buyer Counter Offer #1 at $860,000; Seller accepts. Contract ratified at $860,000!']
      ]));

    /* ── Compose: Ratification confirmation ── */
    var composeBox = compose({
      key: 'ca2-ratification-confirm',
      scenario: 'tc-ca-ratification-confirm',
      prompt: 'Confirm contract ratification to Sofia Reyes and Marcus Lee',
      to: 'Sofia Reyes <sofia.reyes@bhhscal.com>',
      cc: 'Marcus Lee <marcus.lee@exprealty.com>',
      subj: 'Contract Ratified: 4827 Rolando Blvd — $860,000 (Brooks / Herrera)',
      inst: 'Confirm that the purchase contract has been ratified. Include the final agreed terms: purchase price, close of escrow date, EMD amount, contingency periods, and ask Sofia to confirm the escrow company and officer for opening escrow.',
      ans: 'Hi Sofia and Marcus,\n\nI am pleased to confirm that the purchase contract for 4827 Rolando Blvd has been officially ratified following the sellers\' acceptance of Buyer Counter Offer #1 on October 3, 2025.\n\nFinal Agreed Terms Summary:\n• Property: 4827 Rolando Blvd, San Diego, CA 92115 (APN: 470-362-18-00)\n• Final Purchase Price: $860,000.00\n• Initial Earnest Money Deposit: $17,200.00 (2% deposit due within 3 business days by October 8, 2025)\n• Financing: Conventional 20% down ($172,000) with Tyler Adams at Pacific Home Lending\n• Close of Escrow: November 3, 2025 (FIRM deadline)\n• Contingency Timeframes: 17-day Inspection, 17-day Appraisal, 21-day Loan\n• Home Warranty: Seller pays up to $600.00\n\nSofia, please confirm that we are opening escrow with Sarah Nguyen at Chicago Title Company so I can forward the fully executed agreement package and wire transfer instructions.\n\nBest regards,\nTransaction Coordinator\nBerkshire Hathaway HomeServices California Properties'
    });

    /* ── Sofia's reply after ratification email ── */
    var sofiaRatReply =
      '<div class="wf-email-card received" id="ca2-s2-sofia-rat-reply" style="display:' + (composeDone ? 'block' : 'none') + '">' +
        '<div class="wf-email-card-header received">' +
          '<div class="wf-email-card-status">' +
            '<div class="wf-email-badge-group">' +
              '<span class="wf-email-type-badge received">&#128233; Inbox</span>' +
            '</div>' +
            '<div class="wf-email-time-tag">Fri, Oct 3, 2025 at 4:22 PM (8 mins ago)</div>' +
          '</div>' +
          '<div class="wf-email-card-profile">' +
            '<div class="wf-email-avatar-wrap">' +
              '<div class="wf-email-avatar" style="background:linear-gradient(135deg, #6d1f3d 0%, #a03060 100%);">SR</div>' +
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
                '<div class="wf-email-meta-row"><span class="wf-email-meta-lbl">Subject:</span><span class="wf-email-meta-val"><strong>Re: Contract Ratified: 4827 Rolando Blvd &mdash; $860,000 (Brooks / Herrera)</strong></span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email-card-body received">' +
          '<p>Great work on the ratification summary &mdash; everything looks accurate!</p>' +
          '<p>Confirmed: please open escrow with <strong>Sarah Nguyen</strong> at <strong>Chicago Title Company</strong>. Her direct email is <strong>sarah.nguyen@ctt.com</strong>. Send her the fully executed agreement package (RPA + SCO #1 + BCO #1) and request wire transfer instructions for Marcus Lee\'s buyers to deposit the $17,200 EMD.</p>' +
          '<p>Daniel and Carmen are thrilled. Let\'s keep the momentum going &mdash; the November 3 close is tight but very doable if we stay on top of deadlines.</p>' +
          SOFIA_SIG +
        '</div>' +
      '</div>' +
      '<div class="wf-reply-footer-banner" id="ca2-s2-reply-banner" style="display:' + (composeDone ? 'flex' : 'none') + ';margin-top:14px;">' +
        '<span class="wf-reply-footer-icon">&#10004;</span>' +
        '<span><strong>Offer Negotiation Complete:</strong> Contract ratified at $860,000. Sofia confirmed escrow with Sarah Nguyen at Chicago Title &mdash; proceed to Step 4 to open escrow.</span>' +
      '</div>';

    /* ── REVEAL mapping ── */
    REVEAL['ca2-daniel-reply'] = 'ca2-s2-p5';
    REVEAL['ca2-ratification-confirm'] = 'ca2-s2-nav';

    /* ── Peek bars for reference ── */
    var peekOffer1 =
      '<div class="wf-peek-bar">' +
        '<button type="button" class="wf-peek-btn" onclick="caNewToggleEmailPeek(this)">' +
          '<span class="wf-peek-icon">&#9993;</span>' +
          '<span class="wf-peek-text"><strong>Marcus Lee\'s Offer:</strong> 4827 Rolando Blvd &mdash; $840,000</span>' +
          '<span class="wf-peek-arrow">&#9662;</span>' +
        '</button>' +
      '</div>' +
      '<div class="wf-email-peek-drawer" style="display:none;margin-top:12px;">' +
        offerCard1 +
      '</div>';

    var peekOffer2 =
      '<div class="wf-peek-bar" style="margin-top:8px;">' +
        '<button type="button" class="wf-peek-btn" onclick="caNewToggleEmailPeek(this)">' +
          '<span class="wf-peek-icon">&#9993;</span>' +
          '<span class="wf-peek-text"><strong>Rachel Torres\'s Offer:</strong> 4827 Rolando Blvd &mdash; $855,000 Cash</span>' +
          '<span class="wf-peek-arrow">&#9662;</span>' +
        '</button>' +
      '</div>' +
      '<div class="wf-email-peek-drawer" style="display:none;margin-top:12px;">' +
        offerCard2 +
      '</div>';

    var peekDaniel =
      '<div class="wf-peek-bar" style="margin-top:8px;">' +
        '<button type="button" class="wf-peek-btn" onclick="caNewToggleEmailPeek(this)">' +
          '<span class="wf-peek-icon">&#9993;</span>' +
          '<span class="wf-peek-text"><strong>Daniel\'s Email:</strong> Which offer should we take?</span>' +
          '<span class="wf-peek-arrow">&#9662;</span>' +
        '</button>' +
      '</div>' +
      '<div class="wf-email-peek-drawer" style="display:none;margin-top:12px;">' +
        danielEmail +
      '</div>';

    var peekSofia =
      '<div class="wf-peek-bar" style="margin-top:8px;">' +
        '<button type="button" class="wf-peek-btn" onclick="caNewToggleEmailPeek(this)">' +
          '<span class="wf-peek-icon">&#9993;</span>' +
          '<span class="wf-peek-text"><strong>Sofia\'s Counter Instructions:</strong> $875,000 counter to Marcus Lee</span>' +
          '<span class="wf-peek-arrow">&#9662;</span>' +
        '</button>' +
      '</div>' +
      '<div class="wf-email-peek-drawer" style="display:none;margin-top:12px;">' +
        sofiaEmail +
      '</div>';

    /* ── Substep pills (8 pills) ── */
    var pillCls = [];
    var pillStates = [
      extract1Done ? 'done' : 'upcoming',
      extract1Done ? 'done' : 'upcoming',
      extract2Done ? 'done' : (!extract1Done ? 'locked' : 'upcoming'),
      extract2Done ? 'done' : (!extract1Done ? 'locked' : 'upcoming'),
      chatDone ? 'done' : (!extract2Done ? 'locked' : 'upcoming'),
      counterDone ? 'done' : (!chatDone ? 'locked' : 'upcoming'),
      counterDone ? 'done' : (!chatDone ? 'locked' : 'upcoming'),
      composeDone ? 'done' : (!counterDone ? 'locked' : 'upcoming')
    ];
    for (var pi = 0; pi < 8; pi++) {
      pillCls.push(curSlide === pi ? 'active' : pillStates[pi]);
    }

    var pillLabels = ['Offer #1', 'Extract #1', 'Offer #2', 'Extract #2', 'Seller Reply', 'Counter Email', 'Counter Terms', 'Ratification'];
    var substepper = '<div class="wf-substepper" id="ca2-s2-tracker">';
    for (var pj = 0; pj < 8; pj++) {
      substepper += '<button type="button" class="wf-substep-pill wf-pt-item ' + pillCls[pj] + '" id="ca2-s2-pill-' + pj + '" onclick="caNewGoStep2Sub(' + pj + ')">' +
        '<span class="substep-num">' + (pj + 1) + '</span><span>' + pillLabels[pj] + '</span>' +
      '</button>';
    }
    substepper += '</div>';

    /* ── Phase layout (8 phases) ── */
    var main = substepper +
      /* p0: Offer #1 email (read) */
      '<div class="wf-phase" id="ca2-s2-p0" style="display:' + (curSlide === 0 ? 'block' : 'none') + '">' +
        contextCard1 + offerCard1 +
        '<div class="wf-deck-nav" style="margin-top:18px;">' +
          '<button type="button" class="wf-phase-btn" onclick="caNewGoStep2Sub(1)">Review &amp; extract offer terms &rarr;</button>' +
        '</div>' +
      '</div>' +
      /* p1: Extract form #1 (with peek bar + nav) */
      '<div class="wf-phase" id="ca2-s2-p1" style="display:' + (curSlide === 1 ? 'block' : 'none') + '">' +
        peekOffer1 +
        extractForm1 +
        '<div id="ca2-s2-p1-err" class="wf-slide-err"></div>' +
        '<div class="wf-deck-nav">' +
          '<button type="button" class="wf-deck-prev" onclick="caNewGoStep2Sub(0)">&larr; Back to Email</button>' +
          '<button type="button" class="wf-deck-next" onclick="caNewS2Extract1Next()">Next: Offer #2 &rarr;</button>' +
        '</div>' +
      '</div>' +
      /* p2: Offer #2 email (read) */
      '<div class="wf-phase" id="ca2-s2-p2" style="display:' + (curSlide === 2 ? 'block' : 'none') + '">' +
        contextCard2 + offerCard2 +
        '<div class="wf-deck-nav" style="margin-top:18px;">' +
          '<button type="button" class="wf-phase-btn" onclick="caNewGoStep2Sub(3)">Review &amp; extract offer terms &rarr;</button>' +
        '</div>' +
      '</div>' +
      /* p3: Extract form #2 (with peek bars + nav) */
      '<div class="wf-phase" id="ca2-s2-p3" style="display:' + (curSlide === 3 ? 'block' : 'none') + '">' +
        peekOffer2 + peekOffer1 +
        extractForm2 +
        '<div id="ca2-s2-p3-err" class="wf-slide-err"></div>' +
        '<div class="wf-deck-nav">' +
          '<button type="button" class="wf-deck-prev" onclick="caNewGoStep2Sub(2)">&larr; Back to Email</button>' +
          '<button type="button" class="wf-deck-next" onclick="caNewS2Extract2Next()">Next: Seller Reply &rarr;</button>' +
        '</div>' +
      '</div>' +
      /* p4: Daniel's email + compose reply */
      '<div class="wf-phase" id="ca2-s2-p4" style="display:' + (curSlide === 4 ? 'block' : 'none') + '">' +
        danielEmail + danielReplyCompose +
      '</div>' +
      /* p5: Sofia's counter email (read) */
      '<div class="wf-phase" id="ca2-s2-p5" style="display:' + (curSlide === 5 ? 'block' : 'none') + '">' +
        sofiaEmail +
        '<div class="wf-deck-nav" style="margin-top:18px;">' +
          '<button type="button" class="wf-phase-btn" onclick="caNewGoStep2Sub(6)">Extract counter offer terms &rarr;</button>' +
        '</div>' +
      '</div>' +
      /* p6: Counter form (with peek bar + nav) */
      '<div class="wf-phase" id="ca2-s2-p6" style="display:' + (curSlide === 6 ? 'block' : 'none') + '">' +
        peekSofia +
        counterForm +
        '<div id="ca2-s2-p6-err" class="wf-slide-err"></div>' +
        '<div class="wf-deck-nav">' +
          '<button type="button" class="wf-deck-prev" onclick="caNewGoStep2Sub(5)">&larr; Back to Email</button>' +
          '<button type="button" class="wf-deck-next" onclick="caNewS2CounterNext()">Next: Ratification &rarr;</button>' +
        '</div>' +
      '</div>' +
      /* p7: Ratification (timeline + compose + Sofia reply + nav) */
      '<div class="wf-phase" id="ca2-s2-p7" style="display:' + (curSlide === 7 ? 'block' : 'none') + '">' +
        negTimeline +
        '<div class="wf-email-thread-flow">' +
          composeBox +
          '<div class="wf-thread-gap-connector" id="ca2-s2-rat-connector" style="display:' + (composeDone ? 'flex' : 'none') + '">' +
            '<div class="wf-thread-gap-line"></div>' +
            '<div class="wf-thread-gap-pill">' +
              '<span class="wf-thread-gap-icon">&#9201;</span>' +
              '<span>Sofia Reyes replied 8 minutes later</span>' +
            '</div>' +
            '<div class="wf-thread-gap-line"></div>' +
          '</div>' +
          sofiaRatReply +
        '</div>' +
        '<div id="ca2-s2-nav" style="display:' + (composeDone ? 'block' : 'none') + ';margin-top:20px;">' +
          '<button class="wf-nav-btn primary" onclick="caNewGatedNext()">Continue to Step 4: Open Escrow &rarr;</button>' +
        '</div>' +
      '</div>';

    return step(3, 'Offer Review & Negotiation', 'Wed, Oct 1, 2025',
      'The property went active on the MLS September 30. After a weekend of showings, two competing offers arrive within hours: Marcus Lee at eXp Realty submits a conventional offer, and Rachel Torres at Compass submits an all-cash offer. Sofia forwards both: \'TC &mdash; big day! Please review both offers and organize the terms for me before I present to Daniel and Carmen tonight.\'',
      main, side([], ['offer', 'offer2', 'sco', 'bco'], ['sofia', 'daniel', 'carmen', 'marcus', 'rachel']), true);
  }

  /* ════════════════ Step 4: Open Escrow ════════════════ */
  function caNewStep3() {
    var escrowRes = run()['r_ca2-escrow'];
    var escrowDone = !!(escrowRes && escrowRes.length && escrowRes.indexOf(false) === -1);
    var distDone = !!run()['pd_ca2-p-distribute'];
    var composeDone = !!run()['c_ca2-escrow-open'];
    var curSlide = (typeof window._caNewSlide3 === 'number') ? window._caNewSlide3 : 0;

    /* ── Sofia's escrow instructions email ── */
    var sofiaEscrowEmail =
      '<div class="wf-email-inbox-wrap">' +
        '<div class="wf-email-client-bar">' +
          '<div class="wf-email-client-left">' +
            '<div class="wf-email-window-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>' +
            '<div class="wf-email-folder"><span class="wf-folder-icon">&#128233;</span> <strong>Inbox</strong> &rsaquo; Escrow &rsaquo; 4827 Rolando Blvd</div>' +
          '</div>' +
          '<div class="wf-email-client-right">' +
            '<div class="wf-email-actions">' +
              '<button type="button" class="wf-email-action-btn" title="Reply">&#8617; Reply</button>' +
              '<button type="button" class="wf-email-action-btn" title="Star">&#9733;</button>' +
              '<button type="button" class="wf-email-action-btn" title="Print">&#128438;</button>' +
            '</div>' +
            '<span class="wf-email-tool-tag" style="background:rgba(16,185,129,.15);color:#059669;border-color:rgba(16,185,129,.4);">&#127881; Ratified</span>' +
            '<span class="wf-email-time">Fri, Oct 3, 2025 &middot; 4:30 PM</span>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email">' +
          '<div class="wf-email-header">' +
            '<div class="wf-email-subject-bar">' +
              '<h3 class="wf-email-subject">Contract Ratified &mdash; Open Escrow with Chicago Title (4827 Rolando Blvd)</h3>' +
              '<span class="wf-email-priority-badge" style="background:rgba(16,185,129,.1);color:#059669;border-color:rgba(16,185,129,.3);">&#9889; Action Required</span>' +
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
            '<p>Great news &mdash; the contract is officially <strong>ratified at $860,000!</strong> Buyer Counter Offer #1 was accepted by Daniel &amp; Carmen Herrera this afternoon.</p>' +
            '<p>Please open escrow immediately with the following details:</p>' +
            '<div class="wf-email-terms-grid">' +
              '<div class="wf-term-item"><span>Escrow Company</span><b>Chicago Title Company</b></div>' +
              '<div class="wf-term-item"><span>Escrow Officer</span><b>Sarah Nguyen (sarah.nguyen@ctt.com)</b></div>' +
              '<div class="wf-term-item"><span>Escrow Number</span><b>CTT-2025-07421</b></div>' +
              '<div class="wf-term-item"><span>Purchase Price</span><b>$860,000</b></div>' +
              '<div class="wf-term-item"><span>EMD Amount</span><b>$17,200 (2% &mdash; due within 3 business days by Oct 8)</b></div>' +
              '<div class="wf-term-item"><span>Close of Escrow</span><b>November 3, 2025 (FIRM)</b></div>' +
              '<div class="wf-term-item"><span>Buyer\'s Lender</span><b>Tyler Adams, Pacific Home Lending</b></div>' +
            '</div>' +
            '<p>Send the fully executed agreement package (RPA + SCO #1 + BCO #1) to Sarah and request wire instructions for the $17,200 EMD. Also, distribute copies of the ratified contract to Marcus Lee, Tyler Adams, and our file.</p>' +
            SOFIA_SIG +
          '</div>' +
        '</div>' +
      '</div>';

    var escrowForm = form('ca2-escrow', 'Open escrow', 'From Sofia\'s email (use the peek bar above to review), extract key terms from the ratified contract package to open escrow.', [
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

    /* ── Sarah's reply after escrow opening ── */
    var sarahReply =
      '<div class="wf-email-card received" id="ca2-s3-sarah-reply" style="display:' + (composeDone ? 'block' : 'none') + '">' +
        '<div class="wf-email-card-header received">' +
          '<div class="wf-email-card-status">' +
            '<div class="wf-email-badge-group"><span class="wf-email-type-badge received">&#128233; Inbox</span></div>' +
            '<div class="wf-email-time-tag">Fri, Oct 3, 2025 at 5:15 PM (22 mins later)</div>' +
          '</div>' +
          '<div class="wf-email-card-profile">' +
            '<div class="wf-email-avatar-wrap">' +
              '<div class="wf-email-avatar" style="background:linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);">SN</div>' +
              '<span class="wf-email-avatar-status"></span>' +
            '</div>' +
            '<div class="wf-email-sender-info">' +
              '<div class="wf-email-sender-line">' +
                '<span class="wf-email-sender-name">Sarah Nguyen</span>' +
                '<span class="wf-email-sender-addr">&lt;sarah.nguyen@ctt.com&gt;</span>' +
                '<span class="wf-email-role-chip agent" style="background:rgba(30,64,175,.1);color:#1e40af;">Escrow Officer</span>' +
              '</div>' +
              '<div class="wf-email-meta-grid">' +
                '<div class="wf-email-meta-row"><span class="wf-email-meta-lbl">To:</span><span class="wf-email-meta-val"><strong>You</strong> &lt;tc@bhhscal.com&gt;</span></div>' +
                '<div class="wf-email-meta-row"><span class="wf-email-meta-lbl">Subject:</span><span class="wf-email-meta-val"><strong>Re: Escrow Opening: 4827 Rolando Blvd</strong></span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email-card-body received">' +
          '<p>Thank you for the escrow opening package! Escrow <strong>#CTT-2025-07421</strong> is now officially open.</p>' +
          '<p>I\'ve sent wire transfer instructions directly to buyer\'s agent Marcus Lee for the $17,200 EMD. The deposit is due by <strong>October 8, 2025</strong> (3 business days from ratification).</p>' +
          '<p>I\'ll confirm receipt of the EMD as soon as it clears. Please keep me posted on any contingency deadlines.</p>' +
          '<p>Best,<br>Sarah Nguyen<br>Escrow Officer &middot; Chicago Title Company</p>' +
        '</div>' +
      '</div>' +
      '<div class="wf-reply-footer-banner" id="ca2-s3-reply-banner" style="display:' + (composeDone ? 'flex' : 'none') + ';margin-top:14px;">' +
        '<span class="wf-reply-footer-icon">&#10004;</span>' +
        '<span><strong>Escrow Opened:</strong> Chicago Title #CTT-2025-07421 is active. Wire instructions sent to Marcus Lee for $17,200 EMD due by Oct 8.</span>' +
      '</div>';

    var peekSofiaEscrow =
      '<div class="wf-peek-bar">' +
        '<button type="button" class="wf-peek-btn" onclick="caNewToggleEmailPeek(this)">' +
          '<span class="wf-peek-icon">&#9993;</span>' +
          '<span class="wf-peek-text"><strong>Sofia\'s Email:</strong> Contract Ratified &mdash; Open Escrow</span>' +
          '<span class="wf-peek-arrow">&#9662;</span>' +
        '</button>' +
      '</div>' +
      '<div class="wf-email-peek-drawer" style="display:none;margin-top:12px;">' + sofiaEscrowEmail + '</div>';

    REVEAL['ca2-p-distribute'] = 'ca2-s3-p3';
    REVEAL['ca2-escrow-open'] = 'ca2-s3-nav';

    var s3PillLabels = ['Escrow Email', 'Extract Terms', 'Distribution', 'Open Escrow'];
    var s3PillStates = [
      escrowDone ? 'done' : 'upcoming',
      escrowDone ? 'done' : 'upcoming',
      distDone ? 'done' : (!escrowDone ? 'locked' : 'upcoming'),
      composeDone ? 'done' : (!distDone ? 'locked' : 'upcoming')
    ];
    var substepper3 = '<div class="wf-substepper" id="ca2-s3-tracker">';
    for (var s3i = 0; s3i < 4; s3i++) {
      substepper3 += '<button type="button" class="wf-substep-pill wf-pt-item ' + (curSlide === s3i ? 'active' : s3PillStates[s3i]) + '" id="ca2-s3-pill-' + s3i + '" onclick="caNewGoStep3Sub(' + s3i + ')">' +
        '<span class="substep-num">' + (s3i + 1) + '</span><span>' + s3PillLabels[s3i] + '</span></button>';
    }
    substepper3 += '</div>';

    var main = substepper3 +
      '<div class="wf-phase" id="ca2-s3-p0" style="display:' + (curSlide === 0 ? 'block' : 'none') + '">' +
        sofiaEscrowEmail +
        '<div class="wf-deck-nav" style="margin-top:18px;"><button type="button" class="wf-phase-btn" onclick="caNewGoStep3Sub(1)">Extract escrow terms &rarr;</button></div>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s3-p1" style="display:' + (curSlide === 1 ? 'block' : 'none') + '">' +
        peekSofiaEscrow + escrowForm +
        '<div id="ca2-s3-p1-err" class="wf-slide-err"></div>' +
        '<div class="wf-deck-nav">' +
          '<button type="button" class="wf-deck-prev" onclick="caNewGoStep3Sub(0)">&larr; Back to Email</button>' +
          '<button type="button" class="wf-deck-next" onclick="caNewS3EscrowNext()">Next: Distribution &rarr;</button>' +
        '</div>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s3-p2" style="display:' + (curSlide === 2 ? 'block' : 'none') + '">' + pickerCard + '</div>' +
      '<div class="wf-phase" id="ca2-s3-p3" style="display:' + (curSlide === 3 ? 'block' : 'none') + '">' +
        '<div class="wf-email-thread-flow">' +
          composeBox +
          '<div class="wf-thread-gap-connector" id="ca2-s3-escrow-connector" style="display:' + (composeDone ? 'flex' : 'none') + '">' +
            '<div class="wf-thread-gap-line"></div>' +
            '<div class="wf-thread-gap-pill"><span class="wf-thread-gap-icon">&#9201;</span><span>Sarah Nguyen replied 22 minutes later</span></div>' +
            '<div class="wf-thread-gap-line"></div>' +
          '</div>' +
          sarahReply +
        '</div>' +
        '<div id="ca2-s3-nav" style="display:' + (composeDone ? 'block' : 'none') + ';margin-top:20px;">' +
          '<button class="wf-nav-btn primary" onclick="caNewGatedNext()">Continue to Step 5 &rarr;</button>' +
        '</div>' +
      '</div>';

    return step(4, 'Open Escrow', 'Fri, Oct 3, 2025',
      'Contract ratified at $860,000! Open escrow with Chicago Title, calculate deposit deadlines, and distribute the executed contract to the transaction principals.',
      main, side([['Escrow #', 'CTT-2025-07421']], ['rpa', 'offer', 'sco', 'bco', 'wire'], ['sofia', 'daniel', 'carmen', 'marcus', 'sarah', 'tyler']), true);
  }

  /* ---------- Sub-step Controller for Step 4 (Open Escrow) ---------- */
  window._caNewSlide3 = null;

  window.caNewGoStep3Sub = function (idx) {
    if (idx === undefined || idx === null) idx = 0;
    var cur = (typeof window._caNewSlide3 === 'number') ? window._caNewSlide3 : 0;
    if (idx < cur) { window._caNewSlide3 = idx; caNewApplyStep3Sub(idx); return; }
    var escrowRes = run()['r_ca2-escrow'];
    var escrowDone = !!(escrowRes && escrowRes.length && escrowRes.indexOf(false) === -1);
    var distDone = !!run()['pd_ca2-p-distribute'];
    if (idx >= 2 && !escrowDone) { window._caNewSlide3 = 0; caNewApplyStep3Sub(0); return; }
    if (idx >= 3 && !distDone) { window._caNewSlide3 = escrowDone ? 2 : 0; caNewApplyStep3Sub(window._caNewSlide3); return; }
    window._caNewSlide3 = idx;
    caNewApplyStep3Sub(idx);
  };

  window.caNewApplyStep3Sub = function (idx) {
    var phaseIds = ['ca2-s3-p0', 'ca2-s3-p1', 'ca2-s3-p2', 'ca2-s3-p3'];
    phaseIds.forEach(function (pid, i) {
      var el = document.getElementById(pid);
      if (el) { if (i === idx) { el.style.display = 'block'; el.classList.add('wf-phase-enter'); } else { el.style.display = 'none'; el.classList.remove('wf-phase-enter'); } }
    });
    caNewUpdateStep3Pills();
    var topEl = document.querySelector('.mh-top');
    if (topEl) topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.caNewUpdateStep3Pills = function () {
    var cur = (typeof window._caNewSlide3 === 'number') ? window._caNewSlide3 : 0;
    var escrowRes = run()['r_ca2-escrow'];
    var escrowDone = !!(escrowRes && escrowRes.length && escrowRes.indexOf(false) === -1);
    var distDone = !!run()['pd_ca2-p-distribute'];
    var composeDone = !!run()['c_ca2-escrow-open'];
    var states = [
      escrowDone ? 'done' : 'upcoming',
      escrowDone ? 'done' : 'upcoming',
      distDone ? 'done' : (!escrowDone ? 'locked' : 'upcoming'),
      composeDone ? 'done' : (!distDone ? 'locked' : 'upcoming')
    ];
    for (var i = 0; i < 4; i++) {
      var pill = document.getElementById('ca2-s3-pill-' + i);
      if (pill) pill.className = 'wf-substep-pill wf-pt-item ' + (i === cur ? 'active' : states[i]);
    }
  };

  window.caNewS3EscrowNext = function () {
    caNewCheck('ca2-escrow');
    var res = run()['r_ca2-escrow'];
    var ok = !!(res && res.length && res.indexOf(false) === -1);
    var errEl = document.getElementById('ca2-s3-p1-err');
    if (ok) { if (errEl) errEl.style.display = 'none'; caNewGoStep3Sub(2); }
    else { if (errEl) { errEl.innerHTML = '<strong>&#9888; Incomplete:</strong> Please complete all fields correctly from Sofia\'s email before proceeding.'; errEl.style.display = 'block'; errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }
  };

  /* ════════════════ Step 5: EMD & Disclosure Delivery to Buyers ════════════════ */
  function caNewStep4() {
    var emdRes = run()['r_ca2-emd'];
    var emdDone = !!(emdRes && emdRes.length && emdRes.indexOf(false) === -1);
    var marcusDone = !!run()['c_ca2-marcus-emd-reply'];
    var composeDone = !!run()['c_ca2-disc-delivery'];
    var curSlide = (typeof window._caNewSlide4 === 'number') ? window._caNewSlide4 : 0;

    /* ── Sarah's EMD confirmation email ── */
    var sarahEmdEmail =
      '<div class="wf-email-inbox-wrap">' +
        '<div class="wf-email-client-bar">' +
          '<div class="wf-email-client-left">' +
            '<div class="wf-email-window-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>' +
            '<div class="wf-email-folder"><span class="wf-folder-icon">&#128233;</span> <strong>Inbox</strong> &rsaquo; Escrow &rsaquo; 4827 Rolando Blvd</div>' +
          '</div>' +
          '<div class="wf-email-client-right">' +
            '<div class="wf-email-actions">' +
              '<button type="button" class="wf-email-action-btn" title="Reply">&#8617; Reply</button>' +
              '<button type="button" class="wf-email-action-btn" title="Star">&#9733;</button>' +
              '<button type="button" class="wf-email-action-btn" title="Print">&#128438;</button>' +
            '</div>' +
            '<span class="wf-email-tool-tag" style="background:rgba(16,185,129,.15);color:#059669;border-color:rgba(16,185,129,.4);">&#10004; EMD Received</span>' +
            '<span class="wf-email-time">Tue, Oct 7, 2025 &middot; 2:14 PM</span>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email">' +
          '<div class="wf-email-header">' +
            '<div class="wf-email-subject-bar">' +
              '<h3 class="wf-email-subject">EMD Wire Confirmed &mdash; 4827 Rolando Blvd (Escrow #CTT-2025-07421)</h3>' +
            '</div>' +
            '<div class="wf-email-sender-profile">' +
              '<div class="wf-email-avatar-wrap">' +
                '<div class="wf-email-avatar" style="background:linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);">SN</div>' +
                '<span class="wf-email-avatar-status" title="Active now"></span>' +
              '</div>' +
              '<div class="wf-email-sender-info">' +
                '<div class="wf-email-sender-line">' +
                  '<span class="wf-email-sender-name">Sarah Nguyen</span>' +
                  '<span class="wf-email-sender-addr">&lt;sarah.nguyen@ctt.com&gt;</span>' +
                  '<span class="wf-badge-verified">&#10003; Verified</span>' +
                  '<span class="wf-badge-broker" style="color:#1e40af;border-color:#3b82f6;">Chicago Title Company</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="wf-email-body">' +
            '<p>Hi TC,</p>' +
            '<p>Good news &mdash; the earnest money deposit for 4827 Rolando Blvd has been confirmed received in escrow.</p>' +
            '<div class="wf-email-terms-grid">' +
              '<div class="wf-term-item"><span>EMD Amount</span><b>$17,200.00</b></div>' +
              '<div class="wf-term-item"><span>Method</span><b>Wire transfer</b></div>' +
              '<div class="wf-term-item"><span>Held By</span><b>Chicago Title Company</b></div>' +
              '<div class="wf-term-item"><span>Received Date</span><b>October 7, 2025</b></div>' +
              '<div class="wf-term-item"><span>On Time?</span><b>Yes &mdash; Oct 7 is within 3 business days of Oct 3 acceptance</b></div>' +
            '</div>' +
            '<p>The deposit is now held in our trust account pending close of escrow on November 3, 2025. Please log this in your transaction file.</p>' +
            '<p>Best,<br>Sarah Nguyen<br>Escrow Officer &middot; Chicago Title Company</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    var emdForm = form('ca2-emd', 'Log the deposit', 'From Sarah\'s email (use the peek bar above to review), record the verified earnest money deposit details in the case file.', [
      { label: 'EMD amount', kind: 'money', ans: 17200, ph: '$', show: '$17,200' },
      { label: 'Method', kind: 'text', ans: ['wire'], ph: 'Payment method', show: 'Wire transfer' },
      { label: 'Held by', kind: 'text', ans: ['chicago title'], ph: 'Escrow company', show: 'Chicago Title Company' },
      { label: 'Received date', kind: 'date', ans: '2025-10-07', ph: 'mm/dd/yyyy', show: '10/07/2025' },
      { label: 'On time?', kind: 'select', ans: 'yes', show: 'Yes — Oct 7 is within 3 business days of Oct 3',
        options: [['yes', 'Yes'], ['no', 'No']] }
    ]);

    /* ── Marcus email about late EMD (decision converted to email + compose) ── */
    var marcusEmdEmail =
      '<div class="wf-email-inbox-wrap">' +
        '<div class="wf-email-client-bar">' +
          '<div class="wf-email-client-left">' +
            '<div class="wf-email-window-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>' +
            '<div class="wf-email-folder"><span class="wf-folder-icon">&#128233;</span> <strong>Inbox</strong> &rsaquo; Agents &rsaquo; 4827 Rolando Blvd</div>' +
          '</div>' +
          '<div class="wf-email-client-right">' +
            '<div class="wf-email-actions">' +
              '<button type="button" class="wf-email-action-btn" title="Reply">&#8617; Reply</button>' +
              '<button type="button" class="wf-email-action-btn" title="Star">&#9733;</button>' +
              '<button type="button" class="wf-email-action-btn" title="Print">&#128438;</button>' +
            '</div>' +
            '<span class="wf-email-tool-tag" style="background:rgba(224,169,59,.18);color:#d97706;border-color:rgba(224,169,59,.4);">&#9888; EMD Issue</span>' +
            '<span class="wf-email-time">Wed, Oct 8, 2025 &middot; 10:30 AM</span>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email">' +
          '<div class="wf-email-header">' +
            '<div class="wf-email-subject-bar">' +
              '<h3 class="wf-email-subject">EMD Wire &mdash; 4827 Rolando Blvd (Quick update)</h3>' +
            '</div>' +
            '<div class="wf-email-sender-profile">' +
              '<div class="wf-email-avatar-wrap">' +
                '<div class="wf-email-avatar" style="background:linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);box-shadow:0 0 0 2.5px #38bdf8, 0 4px 12px rgba(3,105,161,.2);">ML</div>' +
              '</div>' +
              '<div class="wf-email-sender-info">' +
                '<div class="wf-email-sender-line">' +
                  '<span class="wf-email-sender-name">Marcus Lee</span>' +
                  '<span class="wf-email-sender-addr">&lt;marcus.lee@exprealty.com&gt;</span>' +
                  '<span class="wf-badge-broker" style="color:#0369a1;border-color:#0ea5e9;">eXp Realty</span>' +
                '</div>' +
                '<div class="wf-email-recipient-line"><span>To: <strong>TC</strong> &lt;tc@bhhscal.com&gt;</span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="wf-email-body">' +
            '<p>Hey TC,</p>' +
            '<p>Quick update on the deposit &mdash; I just talked to Jason and Michelle and they said they <strong>forgot to initiate the EMD wire</strong>. They\'ve been swamped at work and said they\'ll take care of it next week when things calm down.</p>' +
            '<p>It\'s only been a few days so it shouldn\'t be a big deal, right? I told them not to worry about it.</p>' +
            '<p>Let me know if you need anything else.</p>' +
            '<p>Marcus Lee<br>Buyer\'s Agent &middot; eXp Realty</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    var marcusEmdCompose = compose({
      key: 'ca2-marcus-emd-reply',
      scenario: 'tc-ca-emd-late-reply',
      prompt: 'Respond to the late EMD situation — flag the deadline risk to Sofia',
      to: 'Sofia Reyes <sofia.reyes@bhhscal.com>',
      cc: 'Marcus Lee <marcus.lee@exprealty.com>',
      subj: 'URGENT: EMD Deadline Risk — 4827 Rolando Blvd (Brooks / Herrera)',
      inst: 'Marcus Lee informed you that the buyers forgot to wire the $17,200 EMD due today (Oct 8). Under the C.A.R. RPA, the EMD is due within 3 business days of acceptance. This is a material breach risk. Flag this immediately to Sofia as the listing agent — the TC never contacts the buyers directly or reassures Marcus that there is no rush.',
      ans: 'Hi Sofia,\n\nI am flagging an urgent EMD deadline issue. Marcus Lee just informed me that the buyers have not wired the $17,200 earnest money deposit as of today, October 8, 2025.\n\nUnder the C.A.R. RPA, the EMD is due within 3 business days of acceptance, making today the contractual deadline. A missed EMD deadline is a material breach that gives the sellers grounds to issue a Notice to Buyer to Perform (NBP) with a 48-hour cure period, after which the sellers could cancel the agreement.\n\nMarcus, the wire needs to go out today to avoid putting the transaction at risk. Please confirm with your buyers that the transfer has been initiated immediately.\n\nSofia, I wanted to make sure you were aware so you can advise Daniel and Carmen on how they would like to proceed.\n\nBest regards,\nTransaction Coordinator\nBerkshire Hathaway HomeServices California Properties'
    });

    var discComposeBox = compose({
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

    /* ── Marcus confirmation reply after disclosure delivery ── */
    var marcusDiscReply =
      '<div class="wf-email-card received" id="ca2-s4-marcus-disc-reply" style="display:' + (composeDone ? 'block' : 'none') + '">' +
        '<div class="wf-email-card-header received">' +
          '<div class="wf-email-card-status">' +
            '<div class="wf-email-badge-group"><span class="wf-email-type-badge received">&#128233; Inbox</span></div>' +
            '<div class="wf-email-time-tag">Wed, Oct 8, 2025 at 4:45 PM (1 hour later)</div>' +
          '</div>' +
          '<div class="wf-email-card-profile">' +
            '<div class="wf-email-avatar-wrap">' +
              '<div class="wf-email-avatar" style="background:linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);">ML</div>' +
              '<span class="wf-email-avatar-status"></span>' +
            '</div>' +
            '<div class="wf-email-sender-info">' +
              '<div class="wf-email-sender-line">' +
                '<span class="wf-email-sender-name">Marcus Lee</span>' +
                '<span class="wf-email-sender-addr">&lt;marcus.lee@exprealty.com&gt;</span>' +
                '<span class="wf-email-role-chip agent" style="background:rgba(3,105,161,.1);color:#0369a1;">Buyer\'s Agent</span>' +
              '</div>' +
              '<div class="wf-email-meta-grid">' +
                '<div class="wf-email-meta-row"><span class="wf-email-meta-lbl">To:</span><span class="wf-email-meta-val"><strong>You</strong> &lt;tc@bhhscal.com&gt;</span></div>' +
                '<div class="wf-email-meta-row"><span class="wf-email-meta-lbl">Subject:</span><span class="wf-email-meta-val"><strong>Re: Disclosure Package: 4827 Rolando Blvd</strong></span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email-card-body received">' +
          '<p>Received, thank you! I\'ve forwarded the full package to Jason and Michelle. They\'ll review and sign this week.</p>' +
          '<p>Also &mdash; just confirmed the EMD wire went out this morning after Sofia flagged it. Good catch on the deadline.</p>' +
          '<p>Marcus Lee<br>Buyer\'s Agent &middot; eXp Realty</p>' +
        '</div>' +
      '</div>' +
      '<div class="wf-reply-footer-banner" id="ca2-s4-reply-banner" style="display:' + (composeDone ? 'flex' : 'none') + ';margin-top:14px;">' +
        '<span class="wf-reply-footer-icon">&#10004;</span>' +
        '<span><strong>Disclosures Delivered:</strong> Full statutory disclosure package served to buyers. Marcus confirmed receipt and EMD wire sent.</span>' +
      '</div>';

    var peekSarahEmd =
      '<div class="wf-peek-bar">' +
        '<button type="button" class="wf-peek-btn" onclick="caNewToggleEmailPeek(this)">' +
          '<span class="wf-peek-icon">&#9993;</span>' +
          '<span class="wf-peek-text"><strong>Sarah\'s Email:</strong> EMD Wire Confirmed &mdash; $17,200</span>' +
          '<span class="wf-peek-arrow">&#9662;</span>' +
        '</button>' +
      '</div>' +
      '<div class="wf-email-peek-drawer" style="display:none;margin-top:12px;">' + sarahEmdEmail + '</div>';

    REVEAL['ca2-marcus-emd-reply'] = 'ca2-s4-p3';
    REVEAL['ca2-disc-delivery'] = 'ca2-s4-nav';

    var s4PillLabels = ['EMD Email', 'Log Deposit', 'Late EMD', 'Disclosures'];
    var s4PillStates = [
      emdDone ? 'done' : 'upcoming',
      emdDone ? 'done' : 'upcoming',
      marcusDone ? 'done' : (!emdDone ? 'locked' : 'upcoming'),
      composeDone ? 'done' : (!marcusDone ? 'locked' : 'upcoming')
    ];
    var substepper4 = '<div class="wf-substepper" id="ca2-s4-tracker">';
    for (var s4i = 0; s4i < 4; s4i++) {
      substepper4 += '<button type="button" class="wf-substep-pill wf-pt-item ' + (curSlide === s4i ? 'active' : s4PillStates[s4i]) + '" id="ca2-s4-pill-' + s4i + '" onclick="caNewGoStep4Sub(' + s4i + ')">' +
        '<span class="substep-num">' + (s4i + 1) + '</span><span>' + s4PillLabels[s4i] + '</span></button>';
    }
    substepper4 += '</div>';

    var main = substepper4 +
      '<div class="wf-phase" id="ca2-s4-p0" style="display:' + (curSlide === 0 ? 'block' : 'none') + '">' +
        sarahEmdEmail +
        '<div class="wf-deck-nav" style="margin-top:18px;"><button type="button" class="wf-phase-btn" onclick="caNewGoStep4Sub(1)">Log deposit details &rarr;</button></div>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s4-p1" style="display:' + (curSlide === 1 ? 'block' : 'none') + '">' +
        peekSarahEmd + emdForm +
        '<div id="ca2-s4-p1-err" class="wf-slide-err"></div>' +
        '<div class="wf-deck-nav">' +
          '<button type="button" class="wf-deck-prev" onclick="caNewGoStep4Sub(0)">&larr; Back to Email</button>' +
          '<button type="button" class="wf-deck-next" onclick="caNewS4EmdNext()">Next: Late EMD &rarr;</button>' +
        '</div>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s4-p2" style="display:' + (curSlide === 2 ? 'block' : 'none') + '">' +
        marcusEmdEmail + marcusEmdCompose +
      '</div>' +
      '<div class="wf-phase" id="ca2-s4-p3" style="display:' + (curSlide === 3 ? 'block' : 'none') + '">' +
        '<div class="wf-email-thread-flow">' +
          discComposeBox +
          '<div class="wf-thread-gap-connector" id="ca2-s4-disc-connector" style="display:' + (composeDone ? 'flex' : 'none') + '">' +
            '<div class="wf-thread-gap-line"></div>' +
            '<div class="wf-thread-gap-pill"><span class="wf-thread-gap-icon">&#9201;</span><span>Marcus Lee replied 1 hour later</span></div>' +
            '<div class="wf-thread-gap-line"></div>' +
          '</div>' +
          marcusDiscReply +
        '</div>' +
        '<div id="ca2-s4-nav" style="display:' + (composeDone ? 'block' : 'none') + ';margin-top:20px;">' +
          '<button class="wf-nav-btn primary" onclick="caNewGatedNext()">Continue to Step 6 &rarr;</button>' +
        '</div>' +
      '</div>';

    return step(5, 'EMD & Disclosure Delivery to Buyers', 'Tue, Oct 7 – Wed, Oct 8, 2025',
      'Track and verify the buyers\' earnest money wire with Chicago Title, then serve the statutory disclosure package to Jason & Michelle Brooks with formal statutory cancellation notices.',
      main, side([['EMD', '$17,200 (received)'], ['Escrow #', 'CTT-2025-07421']], ['tds', 'spq', 'nhd', 'avid', 'lead', 'prelim', 'wire'], ['sofia', 'daniel', 'carmen', 'marcus', 'sarah', 'tyler']), true);
  }

  /* ---------- Sub-step Controller for Step 5 (EMD & Disclosure) ---------- */
  window._caNewSlide4 = null;

  window.caNewGoStep4Sub = function (idx) {
    if (idx === undefined || idx === null) idx = 0;
    var cur = (typeof window._caNewSlide4 === 'number') ? window._caNewSlide4 : 0;
    if (idx < cur) { window._caNewSlide4 = idx; caNewApplyStep4Sub(idx); return; }
    var emdRes = run()['r_ca2-emd'];
    var emdDone = !!(emdRes && emdRes.length && emdRes.indexOf(false) === -1);
    var marcusDone = !!run()['c_ca2-marcus-emd-reply'];
    if (idx >= 2 && !emdDone) { window._caNewSlide4 = 0; caNewApplyStep4Sub(0); return; }
    if (idx >= 3 && !marcusDone) { window._caNewSlide4 = emdDone ? 2 : 0; caNewApplyStep4Sub(window._caNewSlide4); return; }
    window._caNewSlide4 = idx;
    caNewApplyStep4Sub(idx);
  };

  window.caNewApplyStep4Sub = function (idx) {
    var phaseIds = ['ca2-s4-p0', 'ca2-s4-p1', 'ca2-s4-p2', 'ca2-s4-p3'];
    phaseIds.forEach(function (pid, i) {
      var el = document.getElementById(pid);
      if (el) { if (i === idx) { el.style.display = 'block'; el.classList.add('wf-phase-enter'); } else { el.style.display = 'none'; el.classList.remove('wf-phase-enter'); } }
    });
    caNewUpdateStep4Pills();
    var topEl = document.querySelector('.mh-top');
    if (topEl) topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.caNewUpdateStep4Pills = function () {
    var cur = (typeof window._caNewSlide4 === 'number') ? window._caNewSlide4 : 0;
    var emdRes = run()['r_ca2-emd'];
    var emdDone = !!(emdRes && emdRes.length && emdRes.indexOf(false) === -1);
    var marcusDone = !!run()['c_ca2-marcus-emd-reply'];
    var composeDone = !!run()['c_ca2-disc-delivery'];
    var states = [
      emdDone ? 'done' : 'upcoming',
      emdDone ? 'done' : 'upcoming',
      marcusDone ? 'done' : (!emdDone ? 'locked' : 'upcoming'),
      composeDone ? 'done' : (!marcusDone ? 'locked' : 'upcoming')
    ];
    for (var i = 0; i < 4; i++) {
      var pill = document.getElementById('ca2-s4-pill-' + i);
      if (pill) pill.className = 'wf-substep-pill wf-pt-item ' + (i === cur ? 'active' : states[i]);
    }
  };

  window.caNewS4EmdNext = function () {
    caNewCheck('ca2-emd');
    var res = run()['r_ca2-emd'];
    var ok = !!(res && res.length && res.indexOf(false) === -1);
    var errEl = document.getElementById('ca2-s4-p1-err');
    if (ok) { if (errEl) errEl.style.display = 'none'; caNewGoStep4Sub(2); }
    else { if (errEl) { errEl.innerHTML = '<strong>&#9888; Incomplete:</strong> Please complete all deposit details from Sarah\'s email before proceeding.'; errEl.style.display = 'block'; errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }
  };

  /* ════════════════ Step 6: Inspections & Repair Negotiation ════════════════ */
  function caNewStep5() {
    var vendorDone = !!run()['c_ca2-vendor-reply'];
    var sellerDone = !!run()['c_ca2-seller-reply'];
    var curSlide = (typeof window._caNewSlide5 === 'number') ? window._caNewSlide5 : 0;

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

    /* ── Marcus vendor recommendation email ── */
    var marcusVendorEmail =
      '<div class="wf-email-inbox-wrap">' +
        '<div class="wf-email-client-bar">' +
          '<div class="wf-email-client-left">' +
            '<div class="wf-email-window-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>' +
            '<div class="wf-email-folder"><span class="wf-folder-icon">&#128233;</span> <strong>Inbox</strong> &rsaquo; Inspections &rsaquo; 4827 Rolando Blvd</div>' +
          '</div>' +
          '<div class="wf-email-client-right">' +
            '<div class="wf-email-actions">' +
              '<button type="button" class="wf-email-action-btn" title="Reply">&#8617; Reply</button>' +
              '<button type="button" class="wf-email-action-btn" title="Star">&#9733;</button>' +
              '<button type="button" class="wf-email-action-btn" title="Print">&#128438;</button>' +
            '</div>' +
            '<span class="wf-email-tool-tag" style="background:rgba(224,169,59,.18);color:#d97706;border-color:rgba(224,169,59,.4);">&#128736; Inspection</span>' +
            '<span class="wf-email-time">Thu, Oct 16, 2025 &middot; 9:15 AM</span>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email">' +
          '<div class="wf-email-header">' +
            '<div class="wf-email-subject-bar">' +
              '<h3 class="wf-email-subject">Foundation specialist needed &mdash; 4827 Rolando Blvd</h3>' +
            '</div>' +
            '<div class="wf-email-sender-profile">' +
              '<div class="wf-email-avatar-wrap">' +
                '<div class="wf-email-avatar" style="background:linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);">ML</div>' +
              '</div>' +
              '<div class="wf-email-sender-info">' +
                '<div class="wf-email-sender-line">' +
                  '<span class="wf-email-sender-name">Marcus Lee</span>' +
                  '<span class="wf-email-sender-addr">&lt;marcus.lee@exprealty.com&gt;</span>' +
                  '<span class="wf-badge-broker" style="color:#0369a1;border-color:#0ea5e9;">eXp Realty</span>' +
                '</div>' +
                '<div class="wf-email-recipient-line"><span>To: <strong>TC</strong> &lt;tc@bhhscal.com&gt;</span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="wf-email-body">' +
            '<p>Hey TC,</p>' +
            '<p>Jerry Sandoval\'s home inspection flagged an <strong>18-inch crack on the south foundation</strong>. My buyers want a specialist assessment before we go any further.</p>' +
            '<p>Do you have a <strong>good foundation company you can recommend</strong>? We need someone reliable who can get out there quickly &mdash; the Day 17 deadline is coming up fast.</p>' +
            '<p>Thanks,<br>Marcus Lee<br>Buyer\'s Agent &middot; eXp Realty</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    var vendorCompose = compose({
      key: 'ca2-vendor-reply',
      scenario: 'tc-ca-vendor-boundary',
      prompt: 'Reply to Marcus about the foundation specialist request',
      to: 'Marcus Lee <marcus.lee@exprealty.com>',
      subj: 'Re: Foundation specialist needed — 4827 Rolando Blvd',
      inst: 'Marcus is asking you to recommend a specific foundation company. As TC, you must NOT recommend specific vendors — this creates liability for the brokerage. You CAN offer to help schedule once Marcus selects a company, and you can offer a list of licensed contractors. Politely explain the boundary.',
      ans: 'Hi Marcus,\n\nI\'d be happy to help coordinate the specialist appointment once you\'ve selected a company. I can contact them, schedule the inspection, and make sure access to the property is arranged with Sofia and the sellers.\n\nHowever, I\'m not able to recommend a specific vendor — recommending vendors could create liability for our brokerage. I\'d suggest checking with your broker for a referral list, or I can provide you with a list of licensed foundation contractors in the San Diego area if that would be helpful.\n\nOnce you\'ve chosen a company, just send me their contact info and I\'ll handle the scheduling right away. We want to get this done well before the Day 17 deadline on October 20.\n\nBest regards,\nTransaction Coordinator\nBerkshire Hathaway HomeServices California Properties'
    });

    /* ── Daniel seller advice email ── */
    var danielSellerEmail =
      '<div class="wf-email-inbox-wrap">' +
        '<div class="wf-email-client-bar">' +
          '<div class="wf-email-client-left">' +
            '<div class="wf-email-window-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>' +
            '<div class="wf-email-folder"><span class="wf-folder-icon">&#128233;</span> <strong>Inbox</strong> &rsaquo; Sellers &rsaquo; 4827 Rolando Blvd</div>' +
          '</div>' +
          '<div class="wf-email-client-right">' +
            '<div class="wf-email-actions">' +
              '<button type="button" class="wf-email-action-btn" title="Reply">&#8617; Reply</button>' +
              '<button type="button" class="wf-email-action-btn" title="Star">&#9733;</button>' +
              '<button type="button" class="wf-email-action-btn" title="Print">&#128438;</button>' +
            '</div>' +
            '<span class="wf-email-tool-tag" style="background:rgba(224,169,59,.18);color:#d97706;border-color:rgba(224,169,59,.4);">&#128172; Seller Question</span>' +
            '<span class="wf-email-time">Sun, Oct 19, 2025 &middot; 6:40 PM</span>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email">' +
          '<div class="wf-email-header">' +
            '<div class="wf-email-subject-bar">' +
              '<h3 class="wf-email-subject">Re: Repair Request &mdash; 4827 Rolando Blvd</h3>' +
            '</div>' +
            '<div class="wf-email-sender-profile">' +
              '<div class="wf-email-avatar-wrap">' +
                '<div class="wf-email-avatar" style="background:linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);box-shadow:0 0 0 2.5px #64748b, 0 4px 12px rgba(30,58,95,.2);">DH</div>' +
              '</div>' +
              '<div class="wf-email-sender-info">' +
                '<div class="wf-email-sender-line">' +
                  '<span class="wf-email-sender-name">Daniel Herrera</span>' +
                  '<span class="wf-email-sender-addr">&lt;herrera.family@email.com&gt;</span>' +
                  '<span class="wf-badge-broker" style="color:#1e3a5f;border-color:#2d5a87;">Seller</span>' +
                '</div>' +
                '<div class="wf-email-recipient-line"><span>To: <strong>TC</strong> &lt;tc@bhhscal.com&gt;</span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="wf-email-body">' +
            '<p>Hi,</p>' +
            '<p>I just saw the buyers\' repair request for <strong>$12,550</strong>. That HVAC works perfectly fine &mdash; it cools the house just like it always has. I don\'t want to give them anything for that.</p>' +
            '<p>Carmen and I are thinking we should just <strong>reject the whole thing</strong>. What do you think &mdash; should we reject it all, or do we need to offer something? I want to be done with this before the deadline.</p>' +
            '<p>Daniel</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    var sellerCompose = compose({
      key: 'ca2-seller-reply',
      scenario: 'tc-ca-seller-boundary',
      prompt: 'Reply to Daniel about the repair request maintaining TC boundaries',
      to: 'Daniel Herrera <herrera.family@email.com>',
      cc: 'Sofia Reyes <sofia.reyes@bhhscal.com>',
      subj: 'Re: Repair Request — 4827 Rolando Blvd',
      inst: 'Daniel is asking you for advice on whether to accept, reject, or counter the repair request. As TC, you must NOT advise on negotiation decisions — that is between the seller and their listing agent (Sofia). Redirect Daniel to Sofia, confirm you will handle the paperwork, and remind him of the Day 17 deadline.',
      ans: 'Hi Daniel,\n\nI understand your frustration with the repair request. However, the decision on how to respond — whether to accept, reject, or counter — is a negotiation decision between you, Carmen, and Sofia as your listing agent. It would not be appropriate for me to advise on that.\n\nWhat I can tell you is that the Day 17 deadline (October 20) is tomorrow, and whatever you decide needs to be documented and signed before that date. I will make sure the paperwork is prepared correctly and signed by all parties once you and Sofia determine the response.\n\nWould you like me to connect you with Sofia to discuss your options? She can walk you through the pros and cons of each approach.\n\nBest regards,\nTransaction Coordinator\nBerkshire Hathaway HomeServices California Properties'
    });

    REVEAL['ca2-vendor-reply'] = 'ca2-s5-p2';
    REVEAL['ca2-seller-reply'] = 'ca2-s5-nav';

    var s5PillLabels = ['Inspections', 'Vendor Question', 'Seller Advice'];
    var s5PillStates = [
      vendorDone ? 'done' : 'upcoming',
      vendorDone ? 'done' : 'upcoming',
      sellerDone ? 'done' : (!vendorDone ? 'locked' : 'upcoming')
    ];
    var substepper5 = '<div class="wf-substepper" id="ca2-s5-tracker">';
    for (var s5i = 0; s5i < 3; s5i++) {
      substepper5 += '<button type="button" class="wf-substep-pill wf-pt-item ' + (curSlide === s5i ? 'active' : s5PillStates[s5i]) + '" id="ca2-s5-pill-' + s5i + '" onclick="caNewGoStep5Sub(' + s5i + ')">' +
        '<span class="substep-num">' + (s5i + 1) + '</span><span>' + s5PillLabels[s5i] + '</span></button>';
    }
    substepper5 += '</div>';

    var main = substepper5 +
      '<div class="wf-phase" id="ca2-s5-p0" style="display:' + (curSlide === 0 ? 'block' : 'none') + '">' +
        inspectCard + calloutWarn +
        '<div class="wf-deck-nav" style="margin-top:18px;"><button type="button" class="wf-phase-btn" onclick="caNewGoStep5Sub(1)">Begin inspection review &rarr;</button></div>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s5-p1" style="display:' + (curSlide === 1 ? 'block' : 'none') + '">' +
        marcusVendorEmail + vendorCompose +
      '</div>' +
      '<div class="wf-phase" id="ca2-s5-p2" style="display:' + (curSlide === 2 ? 'block' : 'none') + '">' +
        danielSellerEmail + sellerCompose +
      '</div>' +
      '<div class="wf-phase" id="ca2-s5-nav" style="display:' + (sellerDone ? 'block' : 'none') + '">' +
        '<button class="wf-nav-btn primary" onclick="wfNext()">Continue to Step 7 &rarr;</button>' +
      '</div>';

    return step(6, 'Inspections & Repair Negotiation', 'Oct 14 – Oct 20, 2025',
      'Manage inspection reports, coordinate specialist evaluations, navigate seller repair negotiations under Day 17 pressure, and secure executed Amendment #1.',
      main, side([['Repair credit', '$4,500 (agreed)'], ['Day 17', 'Oct 20, 2025']], ['inspect', 'termite', 'foundation', 'rr', 'sellerRR', 'amend1'], ['sofia', 'daniel', 'carmen', 'marcus', 'sarah', 'tyler']), true,
      { text: 'Physical Inspection Contingency Deadline: Day 17 is Oct 20, 2025. Buyer must submit Request for Repair or remove contingency.', days: '3 days remaining', critical: false });
  }

  /* ---------- Sub-step Controller for Step 6 (Inspections) ---------- */
  window._caNewSlide5 = null;

  window.caNewGoStep5Sub = function (idx) {
    if (idx === undefined || idx === null) idx = 0;
    var cur = (typeof window._caNewSlide5 === 'number') ? window._caNewSlide5 : 0;
    if (idx < cur) { window._caNewSlide5 = idx; caNewApplyStep5Sub(idx); return; }
    var vendorDone = !!run()['c_ca2-vendor-reply'];
    if (idx >= 2 && !vendorDone) { window._caNewSlide5 = 0; caNewApplyStep5Sub(0); return; }
    window._caNewSlide5 = idx;
    caNewApplyStep5Sub(idx);
  };

  window.caNewApplyStep5Sub = function (idx) {
    var phaseIds = ['ca2-s5-p0', 'ca2-s5-p1', 'ca2-s5-p2'];
    phaseIds.forEach(function (pid, i) {
      var el = document.getElementById(pid);
      if (el) { if (i === idx) { el.style.display = 'block'; el.classList.add('wf-phase-enter'); } else { el.style.display = 'none'; el.classList.remove('wf-phase-enter'); } }
    });
    caNewUpdateStep5Pills();
    var topEl = document.querySelector('.mh-top');
    if (topEl) topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.caNewUpdateStep5Pills = function () {
    var cur = (typeof window._caNewSlide5 === 'number') ? window._caNewSlide5 : 0;
    var vendorDone = !!run()['c_ca2-vendor-reply'];
    var sellerDone = !!run()['c_ca2-seller-reply'];
    var states = [
      vendorDone ? 'done' : 'upcoming',
      vendorDone ? 'done' : 'upcoming',
      sellerDone ? 'done' : (!vendorDone ? 'locked' : 'upcoming')
    ];
    for (var i = 0; i < 3; i++) {
      var pill = document.getElementById('ca2-s5-pill-' + i);
      if (pill) pill.className = 'wf-substep-pill wf-pt-item ' + (i === cur ? 'active' : states[i]);
    }
  };

  /* ════════════════ Step 7: Appraisal, Contingencies & Wire Fraud ════════════════ */
  function caNewStep6() {
    var extDone = !!run()['c_ca2-extension-reply'];
    var amend2Res = run()['r_ca2-amend2'];
    var amend2Done = !!(amend2Res && amend2Res.length && amend2Res.indexOf(false) === -1);
    var wireDone = !!run()['c_ca2-wire-reply'];
    var curSlide = (typeof window._caNewSlide6 === 'number') ? window._caNewSlide6 : 0;

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

    /* ── Marcus extension email ── */
    var marcusExtEmail =
      '<div class="wf-email-inbox-wrap">' +
        '<div class="wf-email-client-bar">' +
          '<div class="wf-email-client-left">' +
            '<div class="wf-email-window-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>' +
            '<div class="wf-email-folder"><span class="wf-folder-icon">&#128233;</span> <strong>Inbox</strong> &rsaquo; Contingencies &rsaquo; 4827 Rolando Blvd</div>' +
          '</div>' +
          '<div class="wf-email-client-right">' +
            '<div class="wf-email-actions">' +
              '<button type="button" class="wf-email-action-btn" title="Reply">&#8617; Reply</button>' +
              '<button type="button" class="wf-email-action-btn" title="Star">&#9733;</button>' +
              '<button type="button" class="wf-email-action-btn" title="Print">&#128438;</button>' +
            '</div>' +
            '<span class="wf-email-tool-tag" style="background:rgba(224,169,59,.18);color:#d97706;border-color:rgba(224,169,59,.4);">&#9888; Contingency</span>' +
            '<span class="wf-email-time">Mon, Oct 20, 2025 &middot; 11:30 AM</span>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email">' +
          '<div class="wf-email-header">' +
            '<div class="wf-email-subject-bar">' +
              '<h3 class="wf-email-subject">Appraisal contingency extension &mdash; 4827 Rolando Blvd</h3>' +
            '</div>' +
            '<div class="wf-email-sender-profile">' +
              '<div class="wf-email-avatar-wrap">' +
                '<div class="wf-email-avatar" style="background:linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);">ML</div>' +
              '</div>' +
              '<div class="wf-email-sender-info">' +
                '<div class="wf-email-sender-line">' +
                  '<span class="wf-email-sender-name">Marcus Lee</span>' +
                  '<span class="wf-email-sender-addr">&lt;marcus.lee@exprealty.com&gt;</span>' +
                  '<span class="wf-badge-broker" style="color:#0369a1;border-color:#0ea5e9;">eXp Realty</span>' +
                '</div>' +
                '<div class="wf-email-recipient-line"><span>To: <strong>TC</strong> &lt;tc@bhhscal.com&gt;</span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="wf-email-body">' +
            '<p>Hi TC,</p>' +
            '<p>Just a heads up &mdash; the lender\'s appraiser is running behind and won\'t have the report ready by the <strong>October 20 deadline</strong>. I\'m going to need to extend the appraisal contingency.</p>' +
            '<p>Don\'t worry about getting the seller to sign anything &mdash; <strong>extensions are automatic in California</strong> as long as I send written notice before the deadline. Just log it in the file and we\'ll be good.</p>' +
            '<p>Thanks,<br>Marcus Lee<br>Buyer\'s Agent &middot; eXp Realty</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    var extCompose = compose({
      key: 'ca2-extension-reply',
      scenario: 'tc-ca-extension-reply',
      prompt: 'Correct Marcus about contingency extension requirements',
      to: 'Marcus Lee <marcus.lee@exprealty.com>',
      cc: 'Sofia Reyes <sofia.reyes@bhhscal.com>',
      subj: 'Re: Appraisal contingency extension — 4827 Rolando Blvd',
      inst: 'Marcus incorrectly claims contingency extensions are automatic in California. Correct this misinformation: extensions require MUTUAL written agreement (both parties must sign). If the seller refuses, the buyer must remove the contingency by the original deadline or risk a Notice to Buyer to Perform. CC Sofia so the extension can be coordinated.',
      ans: 'Hi Marcus,\n\nI want to clarify an important point: in California, contingency extensions are NOT automatic or unilateral. A contingency extension requires mutual written agreement — both parties must sign an extension addendum.\n\nIf the seller refuses to extend, the buyer must either remove the appraisal contingency by the original deadline (October 20) or risk the seller issuing a Notice to Buyer to Perform (NBP), which gives 48 hours to remove or face cancellation.\n\nI am copying Sofia so we can coordinate getting an extension agreement drafted and signed by both parties as quickly as possible. Time is critical here.\n\nPlease confirm the new proposed deadline so I can prepare the extension form.\n\nBest regards,\nTransaction Coordinator\nBerkshire Hathaway HomeServices California Properties'
    });

    /* ── Sofia's amendment email ── */
    var sofiaAmendEmail =
      '<div class="wf-email-inbox-wrap">' +
        '<div class="wf-email-client-bar">' +
          '<div class="wf-email-client-left">' +
            '<div class="wf-email-window-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>' +
            '<div class="wf-email-folder"><span class="wf-folder-icon">&#128233;</span> <strong>Inbox</strong> &rsaquo; Amendments &rsaquo; 4827 Rolando Blvd</div>' +
          '</div>' +
          '<div class="wf-email-client-right">' +
            '<div class="wf-email-actions">' +
              '<button type="button" class="wf-email-action-btn" title="Reply">&#8617; Reply</button>' +
              '<button type="button" class="wf-email-action-btn" title="Star">&#9733;</button>' +
              '<button type="button" class="wf-email-action-btn" title="Print">&#128438;</button>' +
            '</div>' +
            '<span class="wf-email-tool-tag" style="background:rgba(31,158,90,.18);color:#1f9e5a;border-color:rgba(31,158,90,.4);">&#128203; Amendment</span>' +
            '<span class="wf-email-time">Sat, Oct 25, 2025 &middot; 3:10 PM</span>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email">' +
          '<div class="wf-email-header">' +
            '<div class="wf-email-subject-bar">' +
              '<h3 class="wf-email-subject">Amendment #2: Price Reduction &mdash; 4827 Rolando Blvd (Appraisal Gap)</h3>' +
              '<span class="wf-email-priority-badge" style="background:rgba(224,169,59,.1);color:#d97706;border-color:rgba(224,169,59,.3);">&#9889; Action Required</span>' +
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
            '<p>The appraisal came back at <strong>$845,000</strong> &mdash; that\'s a <strong>$15,000 shortfall</strong> below our $860,000 contract price. After negotiations with Marcus Lee, we\'ve reached a compromise:</p>' +
            '<div class="wf-email-terms-grid">' +
              '<div class="wf-term-item"><span>Original Price</span><b>$860,000</b></div>' +
              '<div class="wf-term-item"><span>Appraisal Value</span><b>$845,000</b></div>' +
              '<div class="wf-term-item"><span>Gap Amount</span><b>$15,000</b></div>' +
              '<div class="wf-term-item"><span>New Price</span><b>$852,500 (split gap 50/50)</b></div>' +
              '<div class="wf-term-item"><span>Reason</span><b>Appraisal shortfall / split gap compromise</b></div>' +
            '</div>' +
            '<p>Please prepare <strong>Amendment #2</strong> reflecting the price reduction to $852,500. Both parties have agreed and I need signatures ASAP before the appraisal contingency deadline on October 27.</p>' +
            SOFIA_SIG +
          '</div>' +
        '</div>' +
      '</div>';

    var amend2Form = form('ca2-amend2', 'Amendment #2: Price reduction', 'From Sofia\'s email (use the peek bar above to review), record the negotiated price amendment following the appraisal gap compromise.', [
      { label: 'Original price', kind: 'money', ans: 860000, ph: '$', show: '$860,000' },
      { label: 'New price', kind: 'money', ans: 852500, ph: '$', show: '$852,500' },
      { label: 'Reason', kind: 'text', ans: ['appraisal'], ph: 'Reason for price reduction', show: 'Appraisal shortfall / split gap' },
      { label: 'Appraisal value', kind: 'money', ans: 845000, ph: '$', show: '$845,000' },
      { label: 'Gap amount', kind: 'money', ans: 15000, ph: '$', show: '$15,000' }
    ]);

    var peekSofiaAmend =
      '<div class="wf-peek-bar">' +
        '<button type="button" class="wf-peek-btn" onclick="caNewToggleEmailPeek(this)">' +
          '<span class="wf-peek-icon">&#9993;</span>' +
          '<span class="wf-peek-text"><strong>Sofia\'s Email:</strong> Amendment #2 &mdash; Price Reduction to $852,500</span>' +
          '<span class="wf-peek-arrow">&#9662;</span>' +
        '</button>' +
      '</div>' +
      '<div class="wf-email-peek-drawer" style="display:none;margin-top:12px;">' + sofiaAmendEmail + '</div>';

    /* ── Wire fraud phishing email (kept as-is) ── */
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

    var wireFraudCompose = compose({
      key: 'ca2-wire-reply',
      scenario: 'tc-ca-wire-fraud',
      prompt: 'Respond to the wire fraud attempt — alert all parties',
      to: 'Jason & Michelle Brooks <jmbrooks.home@email.com>',
      cc: 'Marcus Lee <marcus.lee@exprealty.com>, Sofia Reyes <sofia.reyes@bhhscal.com>, Sarah Nguyen <sarah.nguyen@ctt.com>',
      subj: 'URGENT: Wire Fraud Alert — DO NOT Wire Funds (4827 Rolando Blvd)',
      inst: 'The buyers forwarded a suspicious email claiming to be from Sarah Nguyen with updated wire instructions. Identify the red flags (misspelled name "Nquyen", wrong domain chicago-titleco.com vs ctt.com, urgency, phone lines "down") and alert ALL parties NOT to wire any funds. Advise verifying wire instructions by phone using known contact information.',
      ans: 'Jason and Michelle,\n\nSTOP — DO NOT wire any funds based on the email you received. This is a wire fraud attempt.\n\nRed flags I identified:\n• The sender name is misspelled ("Nquyen" instead of "Nguyen")\n• The email domain is wrong (chicago-titleco.com instead of ctt.com)\n• The email creates false urgency and demands immediate action\n• The email claims phone lines are down to prevent verification\n• The wire instructions are to an unfamiliar bank and beneficiary\n\nI am alerting all parties immediately. Sarah Nguyen at Chicago Title has been copied — Sarah, please confirm that these wire instructions did NOT come from your office.\n\nCRITICAL: NEVER wire funds based on email instructions alone. Always verify wire instructions by calling the escrow officer directly using the phone number you already have on file, not any number provided in the suspicious email.\n\nI will follow up after speaking directly with Sarah to confirm the legitimate wire instructions.\n\nBest regards,\nTransaction Coordinator\nBerkshire Hathaway HomeServices California Properties'
    });

    REVEAL['ca2-extension-reply'] = 'ca2-s6-p2';
    REVEAL['ca2-wire-reply'] = 'ca2-s6-nav';

    var s6PillLabels = ['Timeline', 'Extension', 'Amendment Email', 'Amendment Terms', 'Wire Fraud'];
    var s6PillStates = [
      extDone ? 'done' : 'upcoming',
      extDone ? 'done' : 'upcoming',
      amend2Done ? 'done' : (!extDone ? 'locked' : 'upcoming'),
      amend2Done ? 'done' : (!extDone ? 'locked' : 'upcoming'),
      wireDone ? 'done' : (!amend2Done ? 'locked' : 'upcoming')
    ];
    var substepper6 = '<div class="wf-substepper" id="ca2-s6-tracker">';
    for (var s6i = 0; s6i < 5; s6i++) {
      substepper6 += '<button type="button" class="wf-substep-pill wf-pt-item ' + (curSlide === s6i ? 'active' : s6PillStates[s6i]) + '" id="ca2-s6-pill-' + s6i + '" onclick="caNewGoStep6Sub(' + s6i + ')">' +
        '<span class="substep-num">' + (s6i + 1) + '</span><span>' + s6PillLabels[s6i] + '</span></button>';
    }
    substepper6 += '</div>';

    var main = substepper6 +
      '<div class="wf-phase" id="ca2-s6-p0" style="display:' + (curSlide === 0 ? 'block' : 'none') + '">' +
        appraisalCard +
        '<div class="wf-deck-nav" style="margin-top:18px;"><button type="button" class="wf-phase-btn" onclick="caNewGoStep6Sub(1)">Review appraisal contingency &rarr;</button></div>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s6-p1" style="display:' + (curSlide === 1 ? 'block' : 'none') + '">' +
        marcusExtEmail + extCompose +
      '</div>' +
      '<div class="wf-phase" id="ca2-s6-p2" style="display:' + (curSlide === 2 ? 'block' : 'none') + '">' +
        sofiaAmendEmail +
        '<div class="wf-deck-nav" style="margin-top:18px;"><button type="button" class="wf-phase-btn" onclick="caNewGoStep6Sub(3)">Extract amendment terms &rarr;</button></div>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s6-p3" style="display:' + (curSlide === 3 ? 'block' : 'none') + '">' +
        peekSofiaAmend + amend2Form +
        '<div id="ca2-s6-p3-err" class="wf-slide-err"></div>' +
        '<div class="wf-deck-nav">' +
          '<button type="button" class="wf-deck-prev" onclick="caNewGoStep6Sub(2)">&larr; Back to Email</button>' +
          '<button type="button" class="wf-deck-next" onclick="caNewS6Amend2Next()">Next: Wire Fraud &rarr;</button>' +
        '</div>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s6-p4" style="display:' + (curSlide === 4 ? 'block' : 'none') + '">' +
        phishCard + wireFraudCompose +
      '</div>' +
      '<div class="wf-phase" id="ca2-s6-nav" style="display:' + (wireDone ? 'block' : 'none') + '">' +
        '<button class="wf-nav-btn primary" onclick="caNewGatedNext()">Continue to Step 8 &rarr;</button>' +
      '</div>';

    return step(7, 'Appraisal, Contingencies & Wire Fraud', 'Oct 20 – Oct 29, 2025',
      'Resolve the $15,000 appraisal shortfall via Amendment #2, confirm contingency removals, and intercept an aggressive cyber wire fraud attempt.',
      main, side([['Original price', '$860,000'], ['Appraisal', '$845,000'], ['New price', '$852,500']], ['appraisal', 'extAppr', 'amend2', 'wireFraud'], ['sofia', 'daniel', 'carmen', 'marcus', 'sarah', 'tyler']), true,
      { text: 'Appraisal Contingency Deadline: Extended to Oct 27, 2025. Lender appraisal completed at $845,000 ($15,000 short of contract price).', days: '2 days remaining', critical: false });
  }

  /* ---------- Sub-step Controller for Step 7 (Appraisal) ---------- */
  window._caNewSlide6 = null;

  window.caNewGoStep6Sub = function (idx) {
    if (idx === undefined || idx === null) idx = 0;
    var cur = (typeof window._caNewSlide6 === 'number') ? window._caNewSlide6 : 0;
    if (idx < cur) { window._caNewSlide6 = idx; caNewApplyStep6Sub(idx); return; }
    var extDone = !!run()['c_ca2-extension-reply'];
    var amend2Res = run()['r_ca2-amend2'];
    var amend2Done = !!(amend2Res && amend2Res.length && amend2Res.indexOf(false) === -1);
    if (idx >= 2 && idx <= 3 && !extDone) { window._caNewSlide6 = 0; caNewApplyStep6Sub(0); return; }
    if (idx >= 4 && !amend2Done) { window._caNewSlide6 = extDone ? 2 : 0; caNewApplyStep6Sub(window._caNewSlide6); return; }
    window._caNewSlide6 = idx;
    caNewApplyStep6Sub(idx);
  };

  window.caNewApplyStep6Sub = function (idx) {
    var phaseIds = ['ca2-s6-p0', 'ca2-s6-p1', 'ca2-s6-p2', 'ca2-s6-p3', 'ca2-s6-p4'];
    phaseIds.forEach(function (pid, i) {
      var el = document.getElementById(pid);
      if (el) { if (i === idx) { el.style.display = 'block'; el.classList.add('wf-phase-enter'); } else { el.style.display = 'none'; el.classList.remove('wf-phase-enter'); } }
    });
    caNewUpdateStep6Pills();
    var topEl = document.querySelector('.mh-top');
    if (topEl) topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.caNewUpdateStep6Pills = function () {
    var cur = (typeof window._caNewSlide6 === 'number') ? window._caNewSlide6 : 0;
    var extDone = !!run()['c_ca2-extension-reply'];
    var amend2Res = run()['r_ca2-amend2'];
    var amend2Done = !!(amend2Res && amend2Res.length && amend2Res.indexOf(false) === -1);
    var wireDone = !!run()['c_ca2-wire-reply'];
    var states = [
      extDone ? 'done' : 'upcoming',
      extDone ? 'done' : 'upcoming',
      amend2Done ? 'done' : (!extDone ? 'locked' : 'upcoming'),
      amend2Done ? 'done' : (!extDone ? 'locked' : 'upcoming'),
      wireDone ? 'done' : (!amend2Done ? 'locked' : 'upcoming')
    ];
    for (var i = 0; i < 5; i++) {
      var pill = document.getElementById('ca2-s6-pill-' + i);
      if (pill) pill.className = 'wf-substep-pill wf-pt-item ' + (i === cur ? 'active' : states[i]);
    }
  };

  window.caNewS6Amend2Next = function () {
    caNewCheck('ca2-amend2');
    var res = run()['r_ca2-amend2'];
    var ok = !!(res && res.length && res.indexOf(false) === -1);
    var errEl = document.getElementById('ca2-s6-p3-err');
    if (ok) { if (errEl) errEl.style.display = 'none'; caNewGoStep6Sub(4); }
    else { if (errEl) { errEl.innerHTML = '<strong>&#9888; Incomplete:</strong> Please complete all amendment fields from Sofia\'s email before proceeding.'; errEl.style.display = 'block'; errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }
  };

  /* ════════════════ Step 8: Closing & Post-Closing ════════════════ */
  function caNewStep7() {
    var composeDone = !!run()['c_ca2-post-close'];
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

    /* ── Sofia's closing congratulations reply ── */
    var sofiaCloseReply =
      '<div class="wf-email-card received" id="ca2-s7-sofia-close-reply" style="display:' + (composeDone ? 'block' : 'none') + '">' +
        '<div class="wf-email-card-header received">' +
          '<div class="wf-email-card-status">' +
            '<div class="wf-email-badge-group"><span class="wf-email-type-badge received">&#128233; Inbox</span></div>' +
            '<div class="wf-email-time-tag">Mon, Nov 3, 2025 at 10:15 AM (12 mins later)</div>' +
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
                '<div class="wf-email-meta-row"><span class="wf-email-meta-lbl">Subject:</span><span class="wf-email-meta-val"><strong>Re: Closed: 4827 Rolando Blvd, San Diego (Recording Confirmed)</strong></span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email-card-body received">' +
          '<p>What an incredible job on this transaction! From the listing setup all the way through close of escrow, you kept everything running like clockwork.</p>' +
          '<p>The Herreras are thrilled &mdash; Carmen even mentioned how smooth the process felt from their end. And catching that wire fraud attempt? That alone saved the Brooks family over $158,000. Outstanding work.</p>' +
          '<p>I\'m looking forward to our next transaction together. You\'ve proven you can handle anything this business throws at you!</p>' +
          SOFIA_SIG +
        '</div>' +
      '</div>' +
      '<div class="wf-reply-footer-banner" id="ca2-s7-reply-banner" style="display:' + (composeDone ? 'flex' : 'none') + ';margin-top:14px;">' +
        '<span class="wf-reply-footer-icon">&#127942;</span>' +
        '<span><strong>Transaction Complete!</strong> 8-step California seller-side transaction from listing to close. Congratulations!</span>' +
      '</div>';

    var evalBox = card('Workflow Validation & Performance Assessment',
      'Comprehensive 8-step transaction lifecycle completed.',
      '<div style="margin-bottom:14px;font-size:13.5px;color:var(--v-ink);line-height:1.6;">' +
        'You have successfully coordinated the seller-side transaction from initial listing assignment through close of escrow:' +
        '<ul style="margin:8px 0 14px;padding-left:22px;">' +
          '<li>Set up the listing file and identified the required California disclosure and compliance package</li>' +
          '<li>Verified 12 essential fields of C.A.R. Form RLA and preserved heirloom fixture exclusion</li>' +
          '<li>Reviewed incoming offer, extracted terms, and prepared counter-offer under seller relocation pressure</li>' +
          '<li>Opened escrow with Chicago Title and distributed ratified contracts to all transaction principals</li>' +
          '<li>Tracked $17,200 EMD wire and delivered full disclosure package with statutory notices</li>' +
          '<li>Coordinated inspection findings and negotiated $4,500 repair credit under Day 17 deadline</li>' +
          '<li>Resolved $15,000 appraisal gap (Amendment #2 at $852,500) and intercepted cyber wire fraud</li>' +
          '<li>Archived compliance file and issued final post-closing accounting wrap-up</li>' +
        '</ul>' +
      '</div>' +
      '<div id="wf-eval-container"></div>');

    var main =
      '<div class="wf-phase" style="display:' + (activeIdx === 0 ? 'block' : 'none') + '">' + checkCard + vpcBanner +
        '<button class="wf-phase-btn" onclick="run()[\'post_close_started\'] = 1; caNewReveal(\'ca2-s7-p1\')">Complete post-closing &rarr;</button>' +
      '</div>' +
      '<div class="wf-phase" id="ca2-s7-p1" style="display:' + (activeIdx === 1 ? 'block' : 'none') + '">' +
        '<div class="wf-email-thread-flow">' +
          composeBox +
          '<div class="wf-thread-gap-connector" id="ca2-s7-close-connector" style="display:' + (composeDone ? 'flex' : 'none') + '">' +
            '<div class="wf-thread-gap-line"></div>' +
            '<div class="wf-thread-gap-pill"><span class="wf-thread-gap-icon">&#9201;</span><span>Sofia Reyes replied 12 minutes later</span></div>' +
            '<div class="wf-thread-gap-line"></div>' +
          '</div>' +
          sofiaCloseReply +
        '</div>' +
        evalBox +
      '</div>';

    return step(8, 'Closing & Post-Closing', 'Mon, Nov 3, 2025',
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
      "Review BOTH offer emails carefully — Marcus Lee's conventional offer and Rachel Torres's cash offer. All terms you need are in each email's body and terms grid: price, financing, EMD, contingency periods, closing timeline, seller credits, and deadlines.",
      "Remember: the TC never advises on which offer to accept, even when one seems obviously better. That's Sofia's fiduciary duty. Your job is to extract and organize ALL offers for the agent to present. Note that Rachel's $855K cash offer has a $12,000 seller credit — the net to sellers is only $843K, comparable to Marcus's $840K with no credits.",
      "Sofia chose Marcus Lee's buyers. Counter at $875,000 with a firm November 3 closing date. The Nov 3 deadline is non-negotiable — it comes from the Herreras' Austin relocation. When buyers counter at $860,000 keeping Nov 3, the deal works for everyone."
    ],
    3: [
      "Escrow opening requires the ratified RPA and all counter offers sent to Chicago Title with earnest money instructions.",
      "Ensure Sarah Nguyen receives the complete ratified agreement package (RPA + SCO #1 + BCO #1). EMD of $17,200 (2% of $860,000) is due within 3 business days — by October 8.",
      "The executed contract goes to escrow (Sarah Nguyen), both agents (Sofia and Marcus), and the lender (Tyler Adams). Seller copies go through Sofia, not directly to the Herreras."
    ],
    4: [
      "California C.A.R. RPA requires Earnest Money Deposit (EMD) within 3 business days of acceptance.",
      "Track receipt of the $17,200 EMD (2% of $860,000) from Chicago Title. Deliver the statutory seller disclosure package within 7 days.",
      "Verify Chicago Title's Escrow Receipt confirming $17,200 wired. Serve the full disclosure packet to Marcus Lee."
    ],
    5: [
      "The buyer's 17-day physical inspection contingency deadline is approaching. Jerry Sandoval's inspection report noted plumbing and electrical issues.",
      "Buyer requested $12,550 in repairs. Daniel and Carmen are willing to offer a $4,500 repair credit at closing instead of doing physical repairs.",
      "Draft C.A.R. Amendment #1 reflecting a $4,500 seller closing cost credit in lieu of repairs, signed by both parties."
    ],
    6: [
      "Lender Western Valuation appraised at $845,000 — $15,000 short of the $860,000 purchase price. Watch out for phishing emails!",
      "Examine the email from 'Sarah Nquyen' (note the 'q' instead of 'g'). Never verify wire instructions via email — always verify in person or via telephone.",
      "Negotiate price compromise: split gap to $852,500. Flag spoofed wire fraud email immediately to listing agent and escrow."
    ],
    7: [
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
    desc: 'A full seller-side TC workflow from listing assignment through close of escrow: listing agreement preparation, offer negotiation, escrow management, inspections, appraisal gap, wire fraud, and post-closing.',
    stepCount: 8,
    specs: [
      { label: 'List Price', value: '$889,000' },
      { label: 'Sellers', value: 'Daniel &amp; Carmen Herrera' },
      { label: 'Escrow Scope', value: '8 End-to-End Steps' },
      { label: 'Key TC Scope', value: 'NAR Split, Offers, Wire Defense' }
    ],
    onReset: function () {
      if (typeof window.caNewResetCase === 'function') {
        window.caNewResetCase();
      }
    },
    wfLabels: [
      'New Listing Assignment',
      'Listing Agreement & File Setup',
      'Offer Review & Negotiation',
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
      caNewStep7
    ],
    wfAfterRender: {
      0: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[0]); },
      1: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[1]); },
      2: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[2]); },
      3: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[3]); },
      4: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[4]); },
      5: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[5]); },
      6: function () { if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[6]); },
      7: function () {
        if (typeof wfSetHints === 'function') wfSetHints(STEP_HINTS[7]);
        if (typeof wfRenderFinalScore === 'function') wfRenderFinalScore('wf-eval-container', 'tc', 'ca-new', 8);
        if (typeof wfConfetti === 'function') wfConfetti();
      }
    }
  };
})();
