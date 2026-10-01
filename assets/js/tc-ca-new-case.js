/* ══════════════════════════════════════════════════════════
   CASE SIMULATOR: Transaction Coordinator, California
   Real case file: 1634 Benedict Canyon Dr, Beverly Hills, CA 90210
   Buyer side (Ben Belack, The Agency). The associate works as
   Maria Rodriguez, Ben's transaction coordinator, from the buyer
   representation agreement through close of escrow: offer in
   zipForm, escrow and deposit, seller disclosures, inspections,
   request for repair, contingency removal, pre-closing and the
   closing reconciliation. Documents are the real file.
   Loaded before the page script; uses workflow.js helpers.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function install() {

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

  var DIR = '../assets/docs/tc-ca-benedict/';
  /* Real transaction file, 1634 Benedict Canyon Dr (escrow 2064-AS) */
  var DOCS = {
    brbc:       ['brbc.pdf', 'Buyer Representation & Broker Compensation (BRBC)', 'C.A.R. BRBC 12/25 · Signed Jan 20, 2026'],
    aba:        ['agency-aba.pdf', 'Affiliated Business Arrangement Disclosure', 'The Agency · Brokerage disclosure'],
    lad:        ['local-area-disclosures.pdf', 'Local Area Disclosures (East of 405)', 'The Agency · Brokerage disclosure'],
    rpa:        ['rpa.pdf', 'Residential Purchase Agreement (RPA)', 'C.A.R. RPA 12/25 · $3,695,000 · Feb 1, 2026'],
    ad:         ['ad.pdf', 'Agency Relationship Disclosure (AD)', 'C.A.R. AD · Signed with the offer'],
    prbs:       ['prbs.pdf', 'Possible Representation of More Than One Buyer or Seller (PRBS)', 'C.A.R. PRBS · Signed with the offer'],
    bia:        ['bia.pdf', "Buyer's Investigation Advisory (BIA)", 'C.A.R. BIA · Signed with the offer'],
    bhia:       ['bhia.pdf', "Buyer Homeowners' Insurance Advisory (BHIA)", 'C.A.R. BHIA · Signed with the offer'],
    wfa:        ['wfa.pdf', 'Wire Fraud Advisory (WFA)', 'C.A.R. WFA · Signed with the offer'],
    ta:         ['ta.pdf', 'Trust Advisory (TA)', 'C.A.R. TA · Seller is a trust'],
    frr:        ['frr-pa.pdf', 'Federal Reporting Requirement Purchase Addendum (FRR-PA)', 'C.A.R. FRR-PA · Signed with the offer'],
    fhda:       ['fhda.pdf', 'Fair Housing & Discrimination Advisory (FHDA)', 'C.A.R. FHDA · Signed with the offer'],
    ccpa:       ['ccpa.pdf', 'California Consumer Privacy Act Advisory (CCPA)', 'C.A.R. CCPA · Signed with the offer'],
    emd:        ['emd-receipt.pdf', 'Receipt for Funds · Earnest Money Deposit', 'Next Door Escrow · #400131 · $110,850'],
    escrow:     ['escrow-instructions.pdf', 'Escrow Instructions (Supplement)', 'Next Door Escrow · #2064-AS · Feb 9, 2026'],
    carolwoodAba: ['carolwood-aba.pdf', 'Affiliated Business Disclosure (Carolwood)', 'Listing brokerage · Private Escrow affiliation'],
    discPkg:    ['seller-disclosure-package.pdf', 'Seller Disclosure Package (complete)', 'Carolwood Estates · Delivered Feb 6, 2026'],
    tds:        ['tds.pdf', 'Real Estate Transfer Disclosure Statement (TDS)', 'Seller: Michael Cheringal, Trustee'],
    spq:        ['spq.pdf', 'Seller Property Questionnaire (SPQ) + TOA', 'Seller signed Feb 6, 2026'],
    nhd:        ['nhd-report.pdf', 'Natural Hazard Disclosure Report (PropertyID)', 'Report #4140042 · Feb 2, 2026'],
    lead:       ['lead.pdf', 'Lead-Based Paint Disclosure (FLD)', 'Pre-1978 home · built 1936'],
    earthquake: ['earthquake.pdf', 'Residential Earthquake Risk Disclosure', 'Statutory disclosure'],
    envHaz:     ['env-hazards.pdf', 'Environmental Hazards Booklet · Receipt', 'Combined hazards booklet'],
    whsd:       ['whsd.pdf', 'Water Heater & Smoke Detector Statement (WHSD)', 'C.A.R. WHSD'],
    wcmd:       ['wcmd.pdf', 'Water-Conserving Plumbing & CO Detector Notice (WCMD)', 'C.A.R. WCMD'],
    sfls:       ['sfls.pdf', 'Square Footage & Lot Size Advisory (SFLS)', 'C.A.R. SFLS'],
    spt:        ['spt.pdf', 'Notice of Supplemental Property Tax Bill (SPT)', 'C.A.R. SPT'],
    sbsa:       ['sbsa.pdf', 'Statewide Buyer & Seller Advisory (SBSA)', 'C.A.R. SBSA'],
    mca:        ['mca.pdf', 'Market Conditions Advisory (MCA)', 'C.A.R. MCA'],
    aaa:        ['aaa.pdf', 'Additional Agent Acknowledgement (AAA)', 'C.A.R. AAA'],
    rcsd:       ['rcsd.pdf', 'Representative Capacity Signature Disclosure (RCSD-S)', 'Trustee signs for the trust'],
    wfda:       ['wfda.pdf', 'Wildfire Disaster Advisory (WFDA)', 'Very High Fire Hazard Severity Zone'],
    avidLA:     ['avid-listing.pdf', 'AVID · Listing Agent (Jon Adams)', 'Carolwood Estates · Feb 5, 2026'],
    avidBA:     ['avid-buyer.pdf', "AVID · Buyer's Agent (Ben Belack)", 'The Agency · Feb 6, 2026'],
    avidStatus: ['avid-docusign-status.pdf', 'DocuSign Status · AVIDs Buy & Listing Side', 'Waiting for buyers'],
    histAdv:    ['historical-advisory.pdf', 'Historical Documents Advisory & Receipt', 'Documents from the 2021 sale'],
    histInsp:   ['hist-inspection-2021.pdf', 'Historical Home Inspection (2021)', 'Summary pages · Mar 16, 2021'],
    histTermite:['hist-termite-2021.pdf', 'Historical Termite Report (2021)', 'Family Exterminators · #101916'],
    hist9a:     ['hist-9a-2021.pdf', 'Historical City 9A Report (2021)', 'City of LA · Mar 24, 2021'],
    bie:        ['bie.pdf', "Buyer's Investigation Elections (BIE)", 'C.A.R. BIE No. 1'],
    inspect:    ['home-inspection-2026.pdf', 'Home Inspection Report · Executive Summary', 'Home Inspection Experts · Feb 6, 2026'],
    sewer:      ['sewer-invoice.pdf', 'Sewer Line Inspection (2021 report)', 'American Coast Plumbing · Mar 15, 2021'],
    geo:        ['geo-references.pdf', 'Geotechnical Inspection · References', 'Hillside lot'],
    rr:         ['rr1-addendum1.pdf', 'Request for Repair No. 1 + Addendum No. 1', 'C.A.R. RR · $165,700 asked · Seller response Feb 18'],
    crb:        ['crb2.pdf', 'Buyer Contingency Removal No. 2 (CR-B)', 'All contingencies removed · Feb 19, 2026'],
    prelim:     ['prelim.pdf', 'Preliminary Title Report', 'Chicago Title · Order FBSC2601151'],
    prelimOk:   ['prelim-approval.pdf', 'Preliminary Report Receipt & Approval', 'Buyers · Mar 4, 2026'],
    city9a:     ['city-9a-report.pdf', 'City of LA 9A Report (Residential Property Records)', 'Issued Feb 17, 2026'],
    lafd:       ['lafd-lien-release.pdf', 'LAFD Brush Clearance · Lien Release Letter', 'APN 4356-007-010 · Mar 11, 2026'],
    retrofit:   ['retrofit-invoice.pdf', 'RetrofitLA Invoice', 'Water conservation inspection · Mar 2, 2026'],
    coc:        ['ladwp-coc.pdf', 'LADWP Certificate of Compliance', 'Water conservation ordinance · Mar 3, 2026'],
    hw:         ['home-warranty.pdf', 'Home Warranty Order', 'First American Home Warranty'],
    affidavit:  ['seller-affidavit.pdf', "Seller's Affidavit", 'Michael Cheringal · Mar 3, 2026'],
    commission: ['commission-instructions.pdf', 'Compensation Instructions · Selling Agent', 'The Agency · $92,375'],
    commWire:   ['commission-wire.pdf', 'Outgoing Wire · Selling Agent Commission', 'Mar 10, 2026 · $91,975'],
    closing:    ['closing-statement.pdf', "Buyer's Final Closing Statement", 'Next Door Escrow · Closed Mar 4, 2026'],
    firpta:     ['firpta.pdf', 'FIRPTA Seller Affidavit (redacted)', 'Non-foreign seller certification']
  };

  var ICON_DOC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  var ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
  var ICON_ALERT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
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
    if (typeof window.caNewRefresh === 'function') setTimeout(window.caNewRefresh, 0);
    if (typeof _wfSaveState === 'function') _wfSaveState();
  }

  window.caNewOpen = function (key) {
    var d = DOCS[key];
    if (d) {
      wfOpenDoc(DIR + d[0], d[1]);
    }
  };

  var TC_ADDR = 'maria.rodriguez@theagencyre.com';
  var CASE_ADDR = '1634 Benedict Canyon Dr';
  var CASE_YEAR_SPLIT = 2026; /* Oct-Dec emails belong to the year before */

  function agentSig(o) {
    return '<div class="wf-sig">' +
      '<div class="wf-sig-valediction">' + (o.close || 'Best,') + '</div>' +
      '<div class="wf-sig-card">' +
        '<div class="wf-sig-primary">' +
          '<div class="wf-sig-brand-block">' +
            '<div class="wf-sig-broker-emblem"' + (o.emblemBg ? ' style="background:' + o.emblemBg + ';"' : '') + '>' +
              '<span class="wf-sig-emblem-initials">' + o.emblem + '</span>' +
              (o.emblemSub ? '<span class="wf-sig-emblem-sub">' + o.emblemSub + '</span>' : '') +
            '</div>' +
            '<div class="wf-sig-brand-title">' + o.brand + '</div>' +
            (o.brandSub ? '<div class="wf-sig-brand-sub">' + o.brandSub + '</div>' : '') +
          '</div>' +
          '<div class="wf-sig-divider-v"></div>' +
          '<div class="wf-sig-agent-details">' +
            '<div class="wf-sig-name-row">' +
              '<span class="wf-sig-agent-name">' + o.name + '</span>' +
              (o.dre ? '<span class="wf-sig-badge-dre">' + o.dre + '</span>' : '') +
            '</div>' +
            '<div class="wf-sig-title">' + o.title + '</div>' +
            (o.firm ? '<div class="wf-sig-brokerage-line">' + o.firm + '</div>' : '') +
            '<div class="wf-sig-contact-grid">' +
              o.lines.map(function (l) { return '<div class="wf-sig-contact-item">' + l + '</div>'; }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  var BEN_SIG = agentSig({
    emblem: 'TA', emblemBg: '#111', brand: 'THE AGENCY', brandSub: 'Beverly Hills',
    name: 'Ben Belack', dre: 'DRE #01900787',
    title: 'Real Estate Agent &middot; Buyer Representation',
    firm: 'The Agency &middot; Broker DRE #01904054',
    lines: [
      '<strong>Direct:</strong> (424) 233-0922',
      '<strong>Email:</strong> ben.belack@theagencyre.com',
      '<strong>Office:</strong> 331 Foothill Road, Suite 100, Beverly Hills, CA 90210'
    ]
  });
  var JON_SIG = agentSig({
    emblem: 'CE', emblemBg: '#1f3a2e', brand: 'CAROLWOOD', brandSub: 'Estates',
    name: 'Jonathan Adams', dre: 'DRE #02051051',
    title: 'Listing Agent &middot; with Peter Padden',
    firm: 'Carolwood Estates &middot; Broker DRE #01013548',
    lines: ['<strong>Email:</strong> jonathan.adams@carolwoodre.com']
  });
  var ALICIA_SIG =
    '<p style="margin-top:14px;">Alicia Marie Smith<br>Escrow Officer &middot; Next Door Escrow, Inc.<br>' +
    '625 The City Drive South, 400B, Orange, CA 92868<br>' +
    'Tel (714) 264-7964 &middot; Fax (714) 464-4692 &middot; alicia@nextdoorescrow.com<br>' +
    '<span style="font-size:11.5px;color:#64748b;">Licensed by the California DFPI &middot; License 96DBO-185113. We will never change wire instructions by email.</span></p>';

  var MELONY_SIG =
    '<p style="margin-top:14px;">Melony<br><span style="font-size:12.5px;color:#64748b;">Nilanthi Melony Mahaarachchi &middot; (818) 555-0142<br>Sent from my iPhone</span></p>';
  var SENAKA_SIG =
    '<p style="margin-top:14px;">Senaka<br><span style="font-size:12.5px;color:#64748b;">Senaka Mahaarachchi &middot; (818) 555-0187<br>Sent from my iPhone</span></p>';

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
    'tc':       { name: 'Maria Rodriguez', role: 'Transaction Coordinator (you)', brokerage: 'The Agency', email: TC_ADDR, phone: '(424) 555-0148', initials: 'MR', color: 'linear-gradient(135deg, #1565c0, #17c3d4)' },
    'ben':      { name: 'Ben Belack', role: "Buyer's Agent", brokerage: 'The Agency', email: 'ben.belack@theagencyre.com', phone: '(424) 233-0922', initials: 'BB', color: 'linear-gradient(135deg, #111827, #374151)' },
    'melony':   { name: 'Nilanthi Melony Mahaarachchi', label: 'Melony Mahaarachchi', role: 'Buyer (goes by Melony)', brokerage: 'Client', email: 'melony.mahaarachchi@email.com', phone: '(818) 555-0142', initials: 'NM', color: 'linear-gradient(135deg, #0284c7, #0369a1)' },
    'senaka':   { name: 'Senaka Mahaarachchi', role: 'Buyer', brokerage: 'Client', email: 'senaka.mahaarachchi@email.com', phone: '(818) 555-0187', initials: 'SM', color: 'linear-gradient(135deg, #0284c7, #0369a1)' },
    'jonathan': { name: 'Jonathan Adams', role: 'Listing Agent (with Peter Padden)', brokerage: 'Carolwood Estates', email: 'jonathan.adams@carolwoodre.com', phone: '(310) 555-0110', initials: 'JA', color: 'linear-gradient(135deg, #1f3a2e, #2f5d46)' },
    'alicia':   { name: 'Alicia Smith', role: 'Escrow Officer', brokerage: 'Next Door Escrow, Inc.', email: 'alicia@nextdoorescrow.com', phone: '(714) 264-7964', initials: 'AS', color: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
    'david':    { name: 'David Hughes', role: 'Title Officer', brokerage: 'Chicago Title', email: 'david.hughes@ctt.com', phone: '(714) 555-0163', initials: 'DH', color: 'linear-gradient(135deg, #7c3aed, #5b21b6)' },
    'ryan':     { name: 'Ryan Cho', role: 'Loan Officer', brokerage: 'JPMorgan Chase Bank, N.A.', email: 'ryan.cho@chase.com', phone: '(310) 555-0199', initials: 'RC', color: 'linear-gradient(135deg, #0891b2, #0e7490)' },
    'ingrid':   { name: 'Ingrid Mejia', role: 'Transaction Compliance', brokerage: 'The Agency', email: 'ingrid.mejia@theagencyre.com', phone: '(424) 555-0120', initials: 'IM', color: 'linear-gradient(135deg, #be185d, #9d174d)' },
    'phish':    { name: 'Alicia Smith', role: 'Unknown sender', brokerage: 'nextdoor-escrows.com', email: 'alicia.smith@nextdoor-escrows.com', phone: '', initials: 'AS', color: 'linear-gradient(135deg, #6366f1, #4f46e5)' }
  };
  var CONTACT_ORDER = ['ben', 'melony', 'senaka', 'jonathan', 'alicia', 'david', 'ryan', 'ingrid'];

  var DOC_TYPES = {};
  (function () {
    var reports = ['emd', 'nhd', 'inspect', 'sewer', 'geo', 'prelim', 'city9a', 'lafd', 'retrofit', 'closing', 'commWire', 'histInsp', 'histTermite', 'hist9a', 'avidStatus'];
    var disclosures = ['aba', 'lad', 'ad', 'prbs', 'bia', 'bhia', 'wfa', 'ta', 'fhda', 'ccpa', 'carolwoodAba', 'discPkg', 'tds', 'spq', 'lead', 'earthquake', 'envHaz', 'whsd', 'wcmd', 'sfls', 'spt', 'sbsa', 'mca', 'aaa', 'rcsd', 'wfda', 'avidLA', 'avidBA', 'histAdv', 'bie', 'coc', 'affidavit', 'firpta'];
    var labels = {
      brbc: 'Buyer Agreement', aba: 'Brokerage Discl.', lad: 'Brokerage Discl.', rpa: 'Purchase Contract', ad: 'Agency Disclosure',
      prbs: 'Agency Consent', bia: 'Buyer Advisory', bhia: 'Buyer Advisory', wfa: 'Wire Fraud Adv.', ta: 'Trust Advisory',
      frr: 'Addendum', fhda: 'Fair Housing', ccpa: 'Privacy Notice', emd: 'Escrow Receipt', escrow: 'Escrow Instr.',
      carolwoodAba: 'Listing Side', discPkg: 'Seller Package', tds: 'TDS', spq: 'SPQ', nhd: 'NHD Report', lead: 'Lead Paint',
      earthquake: 'Earthquake', envHaz: 'Env. Hazards', whsd: 'WHSD', wcmd: 'WCMD', sfls: 'SFLS', spt: 'Supp. Tax',
      sbsa: 'Advisory', mca: 'Advisory', aaa: 'Acknowledgement', rcsd: 'Trustee Capacity', wfda: 'Wildfire Adv.',
      avidLA: 'AVID', avidBA: 'AVID', avidStatus: 'DocuSign', histAdv: 'Historical', histInsp: 'Historical', histTermite: 'Historical',
      hist9a: 'Historical', bie: 'Buyer Elections', inspect: 'Inspection', sewer: 'Inspection', geo: 'Inspection', rr: 'Repair Request',
      crb: 'Contingency Rmv.', prelim: 'Title Report', prelimOk: 'Title Approval', city9a: 'City Report', lafd: 'City Lien',
      retrofit: 'Invoice', coc: 'Compliance Cert.', hw: 'Home Warranty', affidavit: 'Seller Affidavit', commission: 'Commission',
      commWire: 'Wire Record', closing: 'Closing Stmt.', firpta: 'FIRPTA'
    };
    Object.keys(DOCS).forEach(function (k) {
      DOC_TYPES[k] = {
        type: reports.indexOf(k) > -1 ? 'report' : (disclosures.indexOf(k) > -1 ? 'disclosure' : 'contract'),
        badge: 'signed',
        label: labels[k] || 'Document'
      };
    });
    DOC_TYPES.avidStatus.badge = 'draft';
  })();

  /* One registry entry per email. Inbox mail shown in the center is a
     `slot` (delivered when its phase is on screen); replies arrive a few
     seconds after the associate sends the email they answer. */
  function em(o) {
    var c = CONTACTS[o.from] || {};
    o.senderKey = o.from;
    o.senderName = o.senderName || (o.from === 'tc' ? 'You (Maria, TC)' : (c.label || c.name));
    o.avatarInitials = c.initials;
    o.avatarBg = c.color;
    o.stepIdx = o.step - 1;
    o.stepNum = o.step;
    o.folder = o.folder || 'inbox';
    /* inbox mail only exists once it is delivered: slots when their phase
       is on screen, replies a few seconds after the email they answer */
    if (o.folder === 'inbox') o.slot = true;
    return o;
  }
  function onReadRefresh() { if (typeof window.caNewRefresh === 'function') window.caNewRefresh(); }

  var TC_EMAILS = [
    /* ── Step 1 · New buyer client intake ── */
    em({ id: 'e1_ben_intro', step: 1, from: 'ben', replyKey: 'bc-intake-info', replyWhen: function () { return pickOk('bc-p-missing'); },
      subject: 'New buyer clients: Melony & Senaka Mahaarachchi (buyer rep agreement signed)',
      snip: 'They signed our exclusive buyer representation agreement this afternoon. Can you open their buyer file today?',
      time: 'Jan 20 · 3:42 PM' }),
    em({ id: 'e1_sent_info', step: 1, from: 'tc', folder: 'sent', composeKey: 'bc-intake-info',
      subject: 'Mahaarachchi buyer file: a few items I need', snip: '', time: 'Jan 20 · 4:25 PM' }),
    em({ id: 'e1_ben_info', step: 1, from: 'ben', arrival: 'reply', afterKey: 'bc-intake-info', onRead: onReadRefresh,
      subject: 'Re: Mahaarachchi buyer file', snip: 'Here is everything. Vesting is still open; I will send the pre-approval when we write the offer.',
      time: 'Jan 20 · 4:58 PM' }),

    /* ── Step 2 · Writing the offer ── */
    em({ id: 'e2_ben_offer', step: 2, from: 'ben',
      subject: 'Writing tonight: 1634 Benedict Canyon Dr (Mahaarachchi)',
      snip: 'They want it. Here are the terms for the RPA. Offer has to be in Jonathan’s hands by tomorrow.',
      time: 'Jan 31 · 6:05 PM' }),
    em({ id: 'e2_ben_signed', step: 2, from: 'ben', arrival: 'reply', onRead: onReadRefresh,
      waitWhen: function () { return !!run()['zf_submitted_bc-zf']; },
      waitText: 'Offer package sent to Ben for review and to the buyers through DocuSign&hellip;',
      subject: 'Signed and presented: 1634 Benedict Canyon Dr',
      snip: 'Both buyers signed at 4:08. Jonathan has it and the seller is reviewing tonight.',
      time: 'Feb 1 · 4:15 PM' }),
    em({ id: 'e2_melony_q', step: 2, from: 'melony', replyKey: 'bc-melony-reply',
      subject: 'Quick question before they answer',
      snip: 'Ben mentioned there could be another offer. Should we go higher or drop the appraisal contingency?',
      time: 'Feb 1 · 5:02 PM' }),
    em({ id: 'e2_sent_melony', step: 2, from: 'tc', folder: 'sent', composeKey: 'bc-melony-reply', subject: 'Re: Quick question before they answer', snip: '', time: 'Feb 1 · 5:20 PM' }),
    em({ id: 'e2_melony_ok', step: 2, from: 'melony', arrival: 'reply', afterKey: 'bc-melony-reply', onRead: onReadRefresh,
      subject: 'Re: Quick question before they answer', snip: 'Ben just called us. We are keeping the offer as it is.', time: 'Feb 1 · 5:45 PM' }),

    /* ── Step 3 · Acceptance, escrow and deposit ── */
    em({ id: 'e3_jon_accept', step: 3, from: 'jonathan',
      subject: 'ACCEPTED: 1634 Benedict Canyon Dr (Mahaarachchi / Cheringal Trust)',
      snip: 'Seller signed. Fully executed RPA attached. Escrow with Next Door Escrow, title with Chicago Title.',
      time: 'Feb 2 · 9:12 AM' }),
    em({ id: 'e3_sent_escrow', step: 3, from: 'tc', folder: 'sent', composeKey: 'bc-escrow-open',
      subject: 'Escrow opening: 1634 Benedict Canyon Dr (Mahaarachchi / Cheringal Trust)', snip: '', time: 'Feb 2 · 10:40 AM' }),
    em({ id: 'e3_alicia_open', step: 3, from: 'alicia', arrival: 'reply', afterKey: 'bc-escrow-open', onRead: onReadRefresh,
      subject: 'Re: Escrow opening: 1634 Benedict Canyon Dr', snip: 'Escrow 2064-AS is open. Title is Chicago Title, order FBSC2601151.',
      time: 'Feb 2 · 11:25 AM' }),
    em({ id: 'e3_sent_lender', step: 3, from: 'tc', folder: 'sent', composeKey: 'bc-lender',
      subject: 'Executed contract for Chase: 1634 Benedict Canyon Dr (Mahaarachchi)', snip: '', time: 'Feb 2 · 11:45 AM' }),
    em({ id: 'e3_ryan_lender', step: 3, from: 'ryan', arrival: 'reply', afterKey: 'bc-lender', onRead: onReadRefresh,
      subject: 'Re: Executed contract for Chase: 1634 Benedict Canyon Dr', snip: 'Received. The appraisal is ordered and I am in touch with Alicia.',
      time: 'Feb 2 · 1:15 PM' }),
    em({ id: 'e3_melony_wire', step: 3, from: 'melony', replyKey: 'bc-wire-reply',
      subject: 'Wiring the deposit this morning',
      snip: 'We got the wiring instructions from escrow. Can you just confirm the account number so I can send it?',
      time: 'Feb 3 · 8:47 AM' }),
    em({ id: 'e3_sent_wire', step: 3, from: 'tc', folder: 'sent', composeKey: 'bc-wire-reply', subject: 'Re: Wiring the deposit this morning', snip: '', time: 'Feb 3 · 8:55 AM' }),
    em({ id: 'e3_melony_wire_ok', step: 3, from: 'melony', arrival: 'reply', afterKey: 'bc-wire-reply', onRead: onReadRefresh,
      subject: 'Re: Wiring the deposit this morning', snip: 'I called Alicia and she confirmed everything. Sending it today.', time: 'Feb 3 · 9:30 AM' }),
    em({ id: 'e3_alicia_emd', step: 3, from: 'alicia',
      subject: 'Receipt for Funds: $110,850.00 (Escrow 2064-AS)',
      snip: 'The deposit landed in our trust account Thursday afternoon. Formal receipt attached.',
      time: 'Feb 6 · 10:20 AM' }),

    /* ── Step 4 · Seller disclosure review ── */
    em({ id: 'e4_jon_disc', step: 4, from: 'jonathan',
      subject: 'Seller disclosure package: 1634 Benedict Canyon Dr',
      snip: 'Full package attached through Glide: TDS, SPQ, NHD, advisories and the historical file from 2021.',
      time: 'Feb 6 · 3:30 PM' }),
    em({ id: 'e4_ben_tds', step: 4, from: 'ben', replyKey: 'bc-tds',
      subject: 'Is the TDS just a courtesy?', snip: 'Jonathan says the trust was exempt from the TDS. Is that right?', time: 'Feb 6 · 4:10 PM' }),
    em({ id: 'e4_sent_tds', step: 4, from: 'tc', folder: 'sent', composeKey: 'bc-tds', subject: 'Re: Is the TDS just a courtesy?', snip: '', time: 'Feb 6 · 4:40 PM' }),
    em({ id: 'e4_ben_tds_ok', step: 4, from: 'ben', arrival: 'reply', afterKey: 'bc-tds', onRead: onReadRefresh,
      subject: 'Re: Is the TDS just a courtesy?', snip: 'Perfect, that is what I will tell the buyers.', time: 'Feb 6 · 5:05 PM' }),
    em({ id: 'e4_sent_summary', step: 4, from: 'tc', folder: 'sent', composeKey: 'bc-disc-summary',
      subject: 'Seller disclosures received: 1634 Benedict Canyon Dr', snip: '', time: 'Feb 7 · 10:15 AM' }),
    em({ id: 'e4_ben_reply', step: 4, from: 'ben', arrival: 'reply', afterKey: 'bc-disc-summary', onRead: onReadRefresh,
      subject: 'Re: Seller disclosures received: 1634 Benedict Canyon Dr', snip: 'Good catch on the TDS. Go ahead and send the buyers the DocuSign.',
      time: 'Feb 7 · 10:52 AM' }),
    em({ id: 'e4_sent_buyers', step: 4, from: 'tc', folder: 'sent', composeKey: 'bc-disc-buyers',
      subject: 'Seller disclosures to review and sign: 1634 Benedict Canyon Dr', snip: '', time: 'Feb 7 · 11:00 AM' }),
    em({ id: 'e4_melony_disc', step: 4, from: 'melony', arrival: 'reply', afterKey: 'bc-disc-buyers', onRead: onReadRefresh,
      subject: 'Re: Seller disclosures to review and sign', snip: 'Got it. We will go through everything with Ben tonight and sign after.',
      time: 'Feb 7 · 11:06 AM' }),

    /* ── Step 5 · Buyer investigations ── */
    em({ id: 'e5_ben_insp', step: 5, from: 'ben', replyKey: 'bc-access',
      subject: 'Inspections: 1634 Benedict Canyon Dr',
      snip: 'General inspection is done. Buyers want sewer, chimney, drainage, pool and a geotech. Please line up access.',
      time: 'Feb 7 · 11:10 AM' }),
    em({ id: 'e5_sent_access', step: 5, from: 'tc', folder: 'sent', composeKey: 'bc-access',
      subject: 'Inspection access: 1634 Benedict Canyon Dr', snip: '', time: 'Feb 7 · 11:45 AM' }),
    em({ id: 'e5_jon_access', step: 5, from: 'jonathan', arrival: 'reply', afterKey: 'bc-access', onRead: onReadRefresh,
      subject: 'Re: Inspection access: 1634 Benedict Canyon Dr', snip: 'All approved. The house is vacant; lockbox access through ShowingTime.',
      time: 'Feb 7 · 12:20 PM' }),
    em({ id: 'e5_melony_vendor', step: 5, from: 'melony', replyKey: 'bc-vendor-reply',
      subject: 'Can you pick the geologist for us?',
      snip: 'We don’t know anyone. Whoever you think is best is fine with us.',
      time: 'Feb 8 · 7:30 PM' }),
    em({ id: 'e5_sent_vendor', step: 5, from: 'tc', folder: 'sent', composeKey: 'bc-vendor-reply', subject: 'Re: Can you pick the geologist for us?', snip: '', time: 'Feb 8 · 7:50 PM' }),
    em({ id: 'e5_melony_vendor_ok', step: 5, from: 'melony', arrival: 'reply', afterKey: 'bc-vendor-reply', onRead: onReadRefresh,
      subject: 'Re: Can you pick the geologist for us?', snip: 'Thanks. We will look at the list with Ben tonight.', time: 'Feb 8 · 8:30 PM' }),
    em({ id: 'e5_ben_findings', step: 5, from: 'ben',
      subject: 'Inspection results are in: 1634 Benedict Canyon Dr',
      snip: 'All reports are back. Can you pull the safety items out of the general report for my RR notes?',
      time: 'Feb 11 · 5:05 PM' }),

    /* ── Step 6 · Request for repair and contingency removal ── */
    em({ id: 'e6_ben_rr', step: 6, from: 'ben',
      subject: 'RR No. 1 terms: 1634 Benedict Canyon Dr',
      snip: 'Buyers want a $165,700 credit plus an addendum for the sewer work. Please draft RR No. 1 today.',
      time: 'Feb 12 · 1:20 PM' }),
    em({ id: 'e6_jon_resp', step: 6, from: 'jonathan',
      subject: 'Seller response to RR No. 1: 1634 Benedict Canyon Dr',
      snip: 'Seller agrees to a $95,000 credit and to the addendum, conditioned on the contingency removal.',
      time: 'Feb 18 · 6:45 PM' }),
    em({ id: 'e6_melony_crb', step: 6, from: 'melony', replyKey: 'bc-crb-reply',
      subject: 'Signing the contingency removal?',
      snip: 'Ben says to sign the CR-B removing everything, even the loan and appraisal. Is that safe?',
      time: 'Feb 18 · 8:10 PM' }),
    em({ id: 'e6_sent_crb', step: 6, from: 'tc', folder: 'sent', composeKey: 'bc-crb-reply', subject: 'Re: Signing the contingency removal?', snip: '', time: 'Feb 18 · 8:25 PM' }),
    em({ id: 'e6_melony_crb_ok', step: 6, from: 'melony', arrival: 'reply', afterKey: 'bc-crb-reply', onRead: onReadRefresh,
      subject: 'Re: Signing the contingency removal?', snip: 'Thank you. We talked with Ben and Ryan and we are comfortable signing.', time: 'Feb 18 · 8:50 PM' }),
    em({ id: 'e6_sent_deliver', step: 6, from: 'tc', folder: 'sent', composeKey: 'bc-rr-deliver',
      subject: 'Executed RR No. 1, Addendum No. 1 and CR-B No. 2: 1634 Benedict Canyon Dr', snip: '', time: 'Feb 19 · 11:00 AM' }),
    em({ id: 'e6_alicia_ack', step: 6, from: 'alicia', arrival: 'reply', afterKey: 'bc-rr-deliver', onRead: onReadRefresh,
      subject: 'Re: Executed RR No. 1, Addendum No. 1 and CR-B No. 2', snip: 'Amended instructions go out today with the $95,000 seller credit.',
      time: 'Feb 19 · 11:35 AM' }),

    /* ── Step 7 · Loan, title and pre-closing ── */
    em({ id: 'e7_alicia_title', step: 7, from: 'alicia',
      subject: 'Title and city reports: 1634 Benedict Canyon Dr (2064-AS)',
      snip: 'Updated prelim from Chicago Title and the City 9A report. There is a pending lien warning to clear.',
      time: 'Feb 20 · 9:30 AM' }),
    em({ id: 'e7_ryan_ins', step: 7, from: 'ryan',
      subject: 'Underwriting conditions: Mahaarachchi / 1634 Benedict Canyon Dr',
      snip: 'I need proof of insurance that covers fire before I can clear to close. Also a note on the seller credit.',
      time: 'Feb 24 · 10:05 AM' }),
    em({ id: 'e7_sent_ins', step: 7, from: 'tc', folder: 'sent', composeKey: 'bc-ins',
      subject: 'Insurance needed for Chase: 1634 Benedict Canyon Dr', snip: '', time: 'Feb 24 · 11:00 AM' }),
    em({ id: 'e7_melony_ins', step: 7, from: 'melony', arrival: 'reply', afterKey: 'bc-ins', onRead: onReadRefresh,
      subject: 'Re: Insurance needed for Chase: 1634 Benedict Canyon Dr', snip: 'Our broker bound the FAIR Plan and the Aegis wrap policy.',
      time: 'Feb 24 · 1:40 PM' }),
    em({ id: 'e7_ingrid_audit', step: 7, from: 'ingrid',
      subject: 'SkySlope audit: 1634 Benedict Canyon Dr (2 items)',
      snip: 'Two signature items before I can approve the file for closing.',
      time: 'Feb 27 · 9:00 AM' }),
    em({ id: 'e7_sent_sig', step: 7, from: 'tc', folder: 'sent', composeKey: 'bc-sig',
      subject: 'Signatures needed: 1634 Benedict Canyon Dr', snip: '', time: 'Feb 27 · 9:40 AM' }),
    em({ id: 'e7_senaka_sig', step: 7, from: 'senaka', arrival: 'reply', afterKey: 'bc-sig', onRead: onReadRefresh,
      subject: 'Re: Signatures needed: 1634 Benedict Canyon Dr', snip: 'Done. Sorry, that one got buried in my inbox.',
      time: 'Mar 2 · 4:05 PM' }),
    em({ id: 'e7_sent_vp', step: 7, from: 'tc', folder: 'sent', composeKey: 'bc-vp',
      subject: 'Final verification of property condition: 1634 Benedict Canyon Dr', snip: '', time: 'Feb 27 · 11:30 AM' }),
    em({ id: 'e7_jon_vp', step: 7, from: 'jonathan', arrival: 'reply', afterKey: 'bc-vp', onRead: onReadRefresh,
      subject: 'Re: Final verification of property condition', snip: 'Tuesday 3/3 at 10:00 works. Mr. Speedy finished on 2/25.',
      time: 'Feb 27 · 3:40 PM' }),
    em({ id: 'e7_phish', step: 7, from: 'melony',
      subject: 'FW: Updated wiring instructions: closing funds 2064-AS',
      snip: 'Escrow sent new wiring instructions for the down payment. Should we send the $628,150 today?',
      time: 'Mar 2 · 11:48 AM' }),
    em({ id: 'e7_sent_wire', step: 7, from: 'tc', folder: 'sent', composeKey: 'bc-wire-alert',
      subject: 'STOP: do not wire funds: 1634 Benedict Canyon Dr', snip: '', time: 'Mar 2 · 12:02 PM' }),
    em({ id: 'e7_alicia_wire', step: 7, from: 'alicia', arrival: 'reply', afterKey: 'bc-wire-alert', onRead: onReadRefresh,
      subject: 'Re: STOP: do not wire funds: 1634 Benedict Canyon Dr', snip: 'That email did not come from us. Our instructions have not changed.',
      time: 'Mar 2 · 12:20 PM' }),

    /* ── Step 8 · Closing and reconciliation ── */
    em({ id: 'e8_alicia_closed', step: 8, from: 'alicia',
      subject: 'RECORDED: 1634 Benedict Canyon Dr has closed (2064-AS)',
      snip: 'The grant deed recorded this afternoon. Congratulations to everyone.',
      time: 'Mar 4 · 4:20 PM' }),
    em({ id: 'e8_alicia_final', step: 8, from: 'alicia',
      subject: 'Final closing statement and commission wire (2064-AS)',
      snip: 'Buyer’s final closing statement attached, and the selling agent commission went out today.',
      time: 'Mar 10 · 1:15 PM' }),
    em({ id: 'e8_sent_comm', step: 8, from: 'tc', folder: 'sent', composeKey: 'bc-comm-q',
      subject: 'Commission wire question: 1634 Benedict Canyon Dr (2064-AS)', snip: '', time: 'Mar 10 · 2:00 PM' }),
    em({ id: 'e8_alicia_comm', step: 8, from: 'alicia', arrival: 'reply', afterKey: 'bc-comm-q', onRead: onReadRefresh,
      subject: 'Re: Commission wire question (2064-AS)', snip: 'Good catch. I am pulling the disbursement backup now.',
      time: 'Mar 10 · 2:40 PM' }),
    em({ id: 'e8_sent_wrap', step: 8, from: 'tc', folder: 'sent', composeKey: 'bc-wrapup',
      subject: 'Welcome home: 1634 Benedict Canyon Dr', snip: '', time: 'Mar 10 · 4:30 PM' }),
    em({ id: 'e8_ben_wrap', step: 8, from: 'ben', arrival: 'reply', afterKey: 'bc-wrapup', onRead: onReadRefresh,
      subject: 'Re: Welcome home: 1634 Benedict Canyon Dr', snip: 'Great work on this file, Maria.',
      time: 'Mar 10 · 5:05 PM' })
  ];


  /* ══════════════════ Mail app (Outlook-style inbox) ══════════════════
     Emails live in the mail app. TC_EMAILS is the single registry; the
     center column only shows the *state* of an email through mailSlot():
       · a "new email" notice until the message is opened in Mail,
       · then either the full card or (receipt mode) a compact read receipt.
     Replies (`arrival: 'reply'`) are delivered a few seconds after the
     associate sends the email they answer, and task emails are written
     inside the mail app (tcMailCompose), so Sent holds the real text. */
  var MAIL_HTML = {};
  var SLOT_OPTS = {};
  var COMPOSE_HTML = {};
  var COMPOSE_META = {};
  var MAIL_REPLY_DELAY = 4000;
  var MAIL_MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  var ICON_MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>';
  var ICON_INBOX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>';
  var ICON_SENT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  var ICON_REPLY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>';
  var ICON_SPLIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="14" y1="3" x2="14" y2="21"/></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  function tcMailState() {
    var r = run();
    if (!r.mail) r.mail = { read: {}, delivered: {}, notified: {}, sent: {}, drafts: {} };
    return r.mail;
  }
  function tcMailCurStep() {
    return (typeof wfStep !== 'undefined') ? wfStep + 1 : 1;
  }
  function tcMailFind(id) {
    for (var i = 0; i < TC_EMAILS.length; i++) {
      if (TC_EMAILS[i].id === id) return TC_EMAILS[i];
    }
    return null;
  }
  function tcMailContact(key) {
    return CONTACTS[key] || null;
  }
  function tcMailSentRecord(e) {
    return e && e.composeKey ? tcMailState().sent[e.composeKey] : null;
  }
  /* slot emails arrive when their phase is shown, replies after the send,
     sent items once the associate actually sends them */
  function tcMailIsVisible(e) {
    var n = tcMailCurStep();
    if (e.stepNum < n) return true;
    if (e.composeKey) return !!tcMailState().sent[e.composeKey];
    if (e.slot) return !!tcMailState().delivered[e.id];
    return typeof e.unlocked === 'function' ? !!e.unlocked(n, run()) : true;
  }
  /* anything from an earlier step counts as already read */
  function tcMailIsRead(id) {
    var e = tcMailFind(id);
    if (!e || e.folder !== 'inbox') return true;
    return e.stepNum < tcMailCurStep() || !!tcMailState().read[id];
  }
  function tcMailTime(e) {
    var rec = tcMailSentRecord(e);
    return (rec && rec.time) || e.time || '';
  }
  function tcMailSubject(e) {
    var rec = tcMailSentRecord(e);
    if (rec && rec.subj) return rec.subj;
    if (e.afterKey) {
      var sent = tcMailState().sent[e.afterKey];
      if (sent && sent.subj) return 'Re: ' + sent.subj.replace(/^(re:\s*)+/i, '');
    }
    return e.subject || '';
  }
  function tcMailSnip(e) {
    var rec = tcMailSentRecord(e);
    if (rec && rec.body) return rec.body.replace(/\s+/g, ' ').slice(0, 140);
    return e.snip || '';
  }
  function tcMailTimeValue(e) {
    var m = /^([A-Za-z]{3}) (\d+)\D+(\d+):(\d+) (AM|PM)/.exec(tcMailTime(e));
    if (!m) return 0;
    var h = parseInt(m[3], 10) % 12 + (m[5] === 'PM' ? 12 : 0);
    return new Date((MAIL_MONTHS[m[1]] || 0) >= 9 && CASE_YEAR_SPLIT ? CASE_YEAR_SPLIT - 1 : (CASE_YEAR_SPLIT || 2026), MAIL_MONTHS[m[1]] || 0, parseInt(m[2], 10), h, parseInt(m[4], 10)).getTime();
  }
  function tcMailSortNewest(a, b) {
    return tcMailTimeValue(b) - tcMailTimeValue(a);
  }
  function tcMailList(folder) {
    return TC_EMAILS.filter(function (e) {
      return e.folder === folder && tcMailIsVisible(e);
    }).sort(tcMailSortNewest);
  }
  function tcMailShortTime(e) {
    return String(tcMailTime(e)).split('·')[0].trim();
  }
  function tcMailLongTime(e) {
    var v = tcMailTimeValue(e);
    if (!v) return tcMailTime(e);
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date(v).getDay()] + ', ' + String(tcMailTime(e)).replace(' ·', ', ' + new Date(v).getFullYear() + ' ·');
  }
  function tcMailBody(id) {
    var h = MAIL_HTML[id];
    return typeof h === 'function' ? h() : h;
  }

  /* ── Center-column slot ── */
  function mailSlot(id, html, opts) {
    MAIL_HTML[id] = html;
    SLOT_OPTS[id] = opts || {};
    return '<div class="tc-mail-slot' + tcMailSlotClass(id) + '" data-mail="' + id + '">' + tcMailSlotInner(id) + '</div>';
  }
  function tcMailSlotClass(id) {
    var e = tcMailFind(id) || {};
    var delivered = tcMailIsVisible(e);
    if (tcMailIsRead(id) && delivered) return ' is-read';
    if (!delivered && e.arrival === 'reply') return ' is-pending';
    return '';
  }
  function tcMailSlotInner(id) {
    var e = tcMailFind(id) || {};
    var opts = SLOT_OPTS[id] || {};
    if (!tcMailIsVisible(e) && e.arrival === 'reply') {
      var waiting = e.afterKey ? !!tcMailState().sent[e.afterKey] : (typeof e.waitWhen === 'function' && !!e.waitWhen());
      if (!waiting) return '';
      return '<div class="tc-mail-waiting">' +
          '<span class="tc-mail-waiting-dots"><i></i><i></i><i></i></span>' +
          '<span>' + (e.waitText || ('Waiting for ' + esc((tcMailContact(e.senderKey) || {}).name || e.senderName) + '&rsquo;s reply&hellip;')) + '</span>' +
        '</div>';
    }
    if (!tcMailIsRead(id)) return tcMailNoticeHtml(id);
    return opts.receipt ? tcMailReceiptHtml(id) : tcMailBody(id);
  }
  function tcMailRefreshSlots(id) {
    document.querySelectorAll('.tc-mail-slot[data-mail="' + id + '"]').forEach(function (el) {
      el.className = 'tc-mail-slot' + tcMailSlotClass(id);
      el.innerHTML = tcMailSlotInner(id);
    });
  }
  function tcMailNoticeHtml(id) {
    var e = tcMailFind(id) || {};
    return '<div class="tc-mail-notice">' +
        '<div class="tc-mail-notice-icon">' + ICON_MAIL + '<span class="tc-mail-notice-dot"></span></div>' +
        '<div class="tc-mail-notice-text">' +
          '<span class="tc-mail-notice-kicker">New email &middot; ' + esc(tcMailShortTime(e)) + '</span>' +
          '<strong>' + esc(e.senderName || '') + '</strong>' +
          '<span class="tc-mail-notice-subj">' + esc(tcMailSubject(e)) + '</span>' +
        '</div>' +
        '<button type="button" class="tc-mail-notice-btn" onclick="tcMailOpen(\'' + id + '\')">Open in Mail &rarr;</button>' +
      '</div>' +
      '<p class="tc-mail-notice-hint">Read this email in Mail to continue.</p>';
  }
  function tcMailReceiptHtml(id) {
    var e = tcMailFind(id) || {};
    return '<div class="tc-mail-receipt">' +
        '<span class="tc-mail-receipt-avatar" style="background:' + e.avatarBg + ';">' + esc(e.avatarInitials || '') + '</span>' +
        '<span class="tc-mail-receipt-text">' +
          '<span class="tc-mail-receipt-kicker">' + ICON_CHECK + ' Read &middot; ' + esc(tcMailShortTime(e)) + '</span>' +
          '<strong>' + esc(e.senderName || '') + '</strong>' +
          '<span class="tc-mail-receipt-subj">' + esc(tcMailSubject(e)) + '</span>' +
          (e.snip ? '<span class="tc-mail-receipt-snip">' + esc(e.snip) + '</span>' : '') +
        '</span>' +
        '<span class="tc-mail-receipt-actions">' +
          '<button type="button" class="tc-mail-receipt-btn" onclick="tcMailDock(\'' + id + '\')">' + ICON_SPLIT + ' View side by side</button>' +
          '<button type="button" class="tc-mail-receipt-link" onclick="tcMailOpen(\'' + id + '\')">Open in Mail</button>' +
        '</span>' +
      '</div>';
  }
  /* Compact reference to an email already read, used above forms */
  function tcMailRefChip(id, label) {
    var e = tcMailFind(id) || {};
    return '<button type="button" class="tc-mail-ref" onclick="tcMailDock(\'' + id + '\')">' +
        '<span class="tc-mail-ref-icon">' + ICON_MAIL + '</span>' +
        '<span class="tc-mail-ref-text"><strong>' + esc(label || e.senderName || '') + '</strong><span>' + esc(tcMailSubject(e)) + '</span></span>' +
        '<span class="tc-mail-ref-action">' + ICON_SPLIT + ' View side by side</span>' +
      '</button>';
  }

  /* Email bodies are registered while their step renders; build every
     step once, off-screen, so earlier and later messages have bodies. */
  var _tcMailBuilt = false;
  function tcMailEnsureBodies() {
    if (_tcMailBuilt) return;
    _tcMailBuilt = true;
    var keep = {};
    for (var i = 0; i <= 8; i++) keep[i] = window['_caNewSlide' + i];
    var keepCur = window._caNewCurSlide1;
    [caNewStep0, caNewStep1, caNewStep2, caNewStep3, caNewStep4, caNewStep5, caNewStep6, caNewStep7].forEach(function (fn) {
      try { fn(); } catch (e) {}
    });
    for (var j = 0; j <= 8; j++) window['_caNewSlide' + j] = keep[j];
    window._caNewCurSlide1 = keepCur;
  }

  var _tcMail = { folder: 'inbox', id: null, compose: null, lastFocus: null };

  function tcMailEnsureApp() {
    var app = document.getElementById('tc-mail-app');
    if (app) return app;
    app = document.createElement('div');
    app.id = 'tc-mail-app';
    app.className = 'tc-mail-app';
    app.setAttribute('role', 'dialog');
    app.setAttribute('aria-modal', 'true');
    app.setAttribute('aria-label', 'Mail');
    app.innerHTML =
      '<div class="tc-mail-backdrop" onclick="tcMailClose()"></div>' +
      '<div class="tc-mail-window">' +
        '<header class="tc-mail-topbar">' +
          '<div class="tc-mail-brand"><span class="tc-mail-brand-icon">' + ICON_MAIL + '</span><strong>Mail</strong><span class="tc-mail-account">' + TC_ADDR + '</span></div>' +
          '<div class="tc-mail-case">Buyer file &middot; 1634 Benedict Canyon Dr &middot; Escrow 2064-AS</div>' +
          '<button type="button" class="tc-mail-close" onclick="tcMailClose()" aria-label="Close mail" title="Close (Esc)">&times;</button>' +
        '</header>' +
        '<div class="tc-mail-body">' +
          '<nav class="tc-mail-folders" id="tc-mail-folders" aria-label="Folders"></nav>' +
          '<section class="tc-mail-list" id="tc-mail-list" aria-label="Messages"></section>' +
          '<article class="tc-mail-reader" id="tc-mail-reader" aria-live="polite"></article>' +
        '</div>' +
      '</div>';
    document.body.appendChild(app);
    document.addEventListener('keydown', function (ev) {
      if (!app.classList.contains('open')) return;
      if (ev.key === 'Escape') { tcMailClose(); return; }
      if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && !_tcMail.compose && !/INPUT|TEXTAREA/.test((ev.target && ev.target.tagName) || '')) {
        var list = tcMailList(_tcMail.folder);
        var idx = -1;
        for (var i = 0; i < list.length; i++) { if (list[i].id === _tcMail.id) idx = i; }
        var next = list[idx + (ev.key === 'ArrowDown' ? 1 : -1)];
        if (next) { ev.preventDefault(); window.tcMailSelect(next.id); }
      }
    });
    return app;
  }

  function tcMailMarkRead(id) {
    var e = tcMailFind(id);
    if (!e || e.folder !== 'inbox') return;
    var st = tcMailState();
    if (!e.arrival) st.delivered[id] = true;
    if (st.read[id]) return;
    st.read[id] = true;
    tcMailRefreshSlots(id);
    tcMailDismissToast(id);
    if (typeof e.onRead === 'function') e.onRead();
    if (typeof window.caNewRefresh === 'function') window.caNewRefresh();
    if (typeof window.tcRefreshInboxList === 'function') window.tcRefreshInboxList();
  }

  function tcMailShowApp() {
    var app = tcMailEnsureApp();
    tcMailUndock();
    if (!app.classList.contains('open')) _tcMail.lastFocus = document.activeElement;
    app.classList.add('open');
    document.body.classList.add('tc-mail-is-open');
  }

  window.tcMailOpen = function (id) {
    tcMailEnsureBodies();
    _tcMail.compose = null;
    var e = id ? tcMailFind(id) : null;
    /* opened from its center notice before the slot sync ran */
    if (e && e.slot && !e.arrival && !tcMailIsVisible(e) && e.stepNum === tcMailCurStep()) tcMailState().delivered[e.id] = true;
    if (e && tcMailIsVisible(e)) {
      _tcMail.folder = e.folder;
      _tcMail.id = e.id;
    } else {
      var inbox = tcMailList('inbox');
      var firstUnread = inbox.filter(function (m) { return !tcMailIsRead(m.id); })[0];
      _tcMail.folder = 'inbox';
      _tcMail.id = (firstUnread || inbox[0] || {}).id || null;
    }
    if (_tcMail.id) tcMailMarkRead(_tcMail.id);
    tcMailShowApp();
    tcMailRender();
    var closeBtn = document.querySelector('#tc-mail-app .tc-mail-close');
    if (closeBtn) closeBtn.focus();
  };

  window.tcMailClose = function () {
    var app = document.getElementById('tc-mail-app');
    if (!app) return;
    tcMailSaveDraft();
    app.classList.remove('open');
    document.body.classList.remove('tc-mail-is-open');
    if (_tcMail.lastFocus && _tcMail.lastFocus.focus) {
      try { _tcMail.lastFocus.focus(); } catch (e) {}
    }
  };

  window.tcMailFolder = function (folder) {
    tcMailSaveDraft();
    _tcMail.compose = null;
    _tcMail.folder = folder;
    var list = tcMailList(folder);
    _tcMail.id = list.length ? list[0].id : null;
    if (_tcMail.id) tcMailMarkRead(_tcMail.id);
    tcMailRender();
  };

  window.tcMailSelect = function (id) {
    tcMailSaveDraft();
    _tcMail.compose = null;
    _tcMail.id = id;
    tcMailMarkRead(id);
    tcMailRender();
    var item = document.querySelector('#tc-mail-list .tc-mail-item.active');
    if (item && item.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
  };

  /* ── Writing inside Mail ── */
  function tcMailComposeOpen(key) {
    return !!COMPOSE_HTML[key] && !run()['c_' + key];
  }
  window.tcMailCompose = function (key) {
    tcMailEnsureBodies();
    if (!tcMailComposeOpen(key)) return;
    _tcMail.compose = key;
    tcMailShowApp();
    tcMailRender();
    var first = document.querySelector('#tc-mail-reader input, #tc-mail-reader textarea');
    if (first) setTimeout(function () { first.focus(); }, 60);
  };
  window.tcMailDiscard = function () {
    tcMailSaveDraft();
    _tcMail.compose = null;
    tcMailRender();
  };
  function tcMailComposeFields(key) {
    return {
      to: document.getElementById('wf-' + key + '-to'),
      cc: document.getElementById('wf-' + key + '-cc'),
      subj: document.getElementById('wf-' + key + '-subj'),
      body: document.getElementById('wf-' + key + '-body')
    };
  }
  function tcMailSaveDraft() {
    var key = _tcMail.compose;
    if (!key) return;
    var f = tcMailComposeFields(key);
    if (!f.body) return;
    tcMailState().drafts[key] = {
      to: f.to ? f.to.value : '',
      cc: f.cc ? f.cc.value : '',
      subj: f.subj ? f.subj.value : '',
      body: f.body.value
    };
  }
  function tcMailRestoreDraft(key) {
    if (typeof caNewMarkDraft === 'function') caNewMarkDraft(key);
    var d = tcMailState().drafts[key];
    if (!d) return;
    var f = tcMailComposeFields(key);
    if (f.to && d.to) f.to.value = d.to;
    if (f.cc && d.cc) f.cc.value = d.cc;
    if (f.subj && d.subj) f.subj.value = d.subj;
    if (f.body && d.body) f.body.value = d.body;
  }
  /* Called by caNewSubmitCompose once a mail-app email passes validation */
  window.tcMailAfterSend = function (key, data) {
    var st = tcMailState();
    var sentEntry = null;
    TC_EMAILS.forEach(function (e) { if (e.composeKey === key) sentEntry = e; });
    var meta = COMPOSE_META[key] || {};
    st.sent[key] = {
      to: data.to || meta.to || '',
      cc: data.cc || meta.cc || '',
      subj: data.subj || (sentEntry && sentEntry.subject) || '',
      body: data.body || '',
      time: (sentEntry && sentEntry.time) || ''
    };
    delete st.drafts[key];
    if (_tcMail.compose === key) {
      _tcMail.compose = null;
      if (sentEntry) { _tcMail.folder = 'sent'; _tcMail.id = sentEntry.id; }
      _tcMail.justSent = true;
      if (document.getElementById('tc-mail-app')) tcMailRender();
      _tcMail.justSent = false;
    }
    TC_EMAILS.forEach(function (e) {
      if (e.arrival === 'reply' && e.afterKey === key) window.tcMailScheduleReply(e.id);
    });
    window.tcMailRefreshTask(key);
    var task = MAIL_TASKS[key];
    if (task && typeof task.onSent === 'function') task.onSent();
    if (typeof window.tcRefreshInboxList === 'function') window.tcRefreshInboxList();
    if (typeof _wfSaveState === 'function') _wfSaveState();
  };
  /* Show the waiting state now and deliver the email a few seconds later */
  window.tcMailScheduleReply = function (id, delay) {
    tcMailRefreshSlots(id);
    setTimeout(function () { tcMailDeliver(id, true); }, typeof delay === 'number' ? delay : MAIL_REPLY_DELAY);
  };

  /* Center-column card for an email the associate has to write in Mail */
  var MAIL_TASKS = {};
  function mailTask(key, title, sub, sentId, onSent) {
    MAIL_TASKS[key] = { title: title, sub: sub, sentId: sentId, onSent: onSent };
    return '<div class="mh-card tc-mail-task" data-type="compose" data-mail-task="' + key + '">' + tcMailTaskInner(key) + '</div>';
  }
  function tcMailTaskInner(key) {
    var t = MAIL_TASKS[key] || {};
    var st = tcMailState();
    var sent = st.sent[key];
    var h = '<h4>' + t.title + '</h4><p class="mh-sub">' + t.sub + '</p>';
    if (!sent) {
      return h + '<div class="mh-actions">' +
        '<button type="button" class="mh-btn" onclick="tcMailCompose(\'' + key + '\')">' + ICON_MAIL + (st.drafts[key] ? ' Continue your draft in Mail' : ' Write email in Mail') + ' &rarr;</button>' +
      '</div>';
    }
    return h + '<div class="tc-mail-task-sent">' +
        '<span class="tc-mail-task-sent-icon">' + ICON_CHECK + '</span>' +
        '<span class="tc-mail-task-sent-text"><strong>Sent to ' + esc(sent.to || '') + '</strong><em>' + esc(sent.subj || '') + ' &middot; ' + esc(String(sent.time || '').split('·').pop().trim()) + '</em></span>' +
        (t.sentId ? '<button type="button" class="tc-mail-receipt-link" onclick="tcMailOpen(\'' + t.sentId + '\')">View in Sent</button>' : '') +
      '</div>';
  }
  window.tcMailRefreshTask = function (key) {
    document.querySelectorAll('[data-mail-task="' + key + '"]').forEach(function (el) {
      el.innerHTML = tcMailTaskInner(key);
    });
  };
  function tcMailDeliver(id, toast) {
    var st = tcMailState();
    if (st.delivered[id]) return;
    st.delivered[id] = true;
    var e = tcMailFind(id);
    tcMailRefreshSlots(id);
    if (e && toast && !st.notified[id]) {
      st.notified[id] = true;
      tcMailToast(e);
    }
    var app = document.getElementById('tc-mail-app');
    if (app && app.classList.contains('open')) tcMailRender();
    if (typeof window.tcRefreshInboxList === 'function') window.tcRefreshInboxList();
    if (typeof _wfSaveState === 'function') _wfSaveState();
  }

  /* Legacy Reply for steps whose compose still lives in the center */
  function tcMailReplyTarget(id) {
    var slot = document.querySelector('#wf-body .tc-mail-slot[data-mail="' + id + '"]');
    if (!slot || !slot.offsetParent) return null;
    for (var n = slot.nextElementSibling; n; n = n.nextElementSibling) {
      var ta = n.matches && n.matches('.wf-compose') ? n.querySelector('textarea') : (n.querySelector ? n.querySelector('.wf-compose textarea') : null);
      if (ta) return ta.readOnly ? null : ta;
    }
    return null;
  }
  window.tcMailReply = function (id) {
    var e = tcMailFind(id);
    if (e && e.replyKey && tcMailComposeOpen(e.replyKey) && (!e.replyWhen || e.replyWhen())) {
      window.tcMailCompose(e.replyKey);
      return;
    }
    var ta = tcMailReplyTarget(id);
    window.tcMailClose();
    if (!ta) return;
    ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { try { ta.focus({ preventScroll: true }); } catch (err) { ta.focus(); } }, 450);
  };
  function tcMailCanReply(e) {
    if (e.folder !== 'inbox') return false;
    if (e.replyKey) return tcMailComposeOpen(e.replyKey) && (!e.replyWhen || e.replyWhen());
    return !!tcMailReplyTarget(e.id);
  }

  function tcMailGenericHtml(e) {
    var rec = tcMailSentRecord(e);
    var c = tcMailContact(e.senderKey);
    var addr = e.senderKey === 'tc' ? TC_ADDR : (c ? c.email : '');
    var recipient = e.folder === 'sent'
      ? (rec && rec.to ? '<div class="wf-email-recipient-line"><span>To: ' + esc(rec.to) + (rec.cc ? ' &middot; CC: ' + esc(rec.cc) : '') + '</span></div>' : '')
      : '<div class="wf-email-recipient-line"><span>To: <strong>Maria Rodriguez</strong> &lt;' + TC_ADDR + '&gt;</span></div>';
    var body = rec && rec.body
      ? '<div class="tc-mail-plain">' + esc(rec.body) + '</div>'
      : '<p>' + esc(e.snip) + '</p>';
    return '<div class="wf-email tc-mail-generic">' +
      '<div class="wf-email-header">' +
        '<div class="wf-email-subject-bar"><h3 class="wf-email-subject">' + esc(tcMailSubject(e)) + '</h3></div>' +
        '<div class="wf-email-sender-profile">' +
          '<div class="wf-email-avatar-wrap"><div class="wf-email-avatar" style="background:' + e.avatarBg + ';">' + esc(e.avatarInitials) + '</div></div>' +
          '<div class="wf-email-sender-info">' +
            '<div class="wf-email-sender-line">' +
              '<span class="wf-email-sender-name">' + esc(e.senderKey === 'tc' ? 'You' : e.senderName) + '</span>' +
              (addr ? '<span class="wf-email-sender-addr">&lt;' + addr + '&gt;</span>' : '') +
            '</div>' +
            recipient +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="wf-email-body">' + body + '</div>' +
    '</div>';
  }

  function tcMailReaderHtml(e) {
    if (!e) {
      return '<div class="tc-mail-empty">' + ICON_MAIL + '<strong>No message selected</strong><span>Choose an email from the list to read it.</span></div>';
    }
    var past = e.stepNum < tcMailCurStep();
    var action = tcMailCanReply(e)
      ? '<button type="button" class="tc-mail-reply-btn" onclick="tcMailReply(\'' + e.id + '\')">' + ICON_REPLY + ' Reply</button>'
      : (past ? '<span class="tc-mail-readonly">Earlier message &middot; read-only</span>' : '');
    if (e.folder === 'sent' && _tcMail.justSent) action = '<span class="tc-mail-sent-ok">' + ICON_CHECK + ' Sent &middot; submitted for grading</span>';
    return '<div class="tc-mail-reader-bar">' +
        '<span class="tc-mail-reader-meta">' + (e.folder === 'sent' ? 'Sent' : 'Inbox') + ' &middot; ' + esc(tcMailLongTime(e)) + '</span>' +
        action +
      '</div>' +
      '<div class="tc-mail-reader-content">' + (tcMailBody(e.id) || tcMailGenericHtml(e)) + '</div>';
  }

  function tcMailComposeReaderHtml(key) {
    var target = null;
    TC_EMAILS.forEach(function (e) { if (e.replyKey === key) target = e; });
    return '<div class="tc-mail-reader-bar">' +
        '<span class="tc-mail-reader-meta">New message' + (target ? ' &middot; replying to ' + esc(target.senderName) : '') + '</span>' +
        '<button type="button" class="tc-mail-discard" onclick="tcMailDiscard()">Save draft &amp; close</button>' +
      '</div>' +
      '<div class="tc-mail-reader-content tc-mail-compose-wrap">' + COMPOSE_HTML[key] + '</div>';
  }

  function tcMailRender() {
    var inbox = tcMailList('inbox');
    var sent = tcMailList('sent');
    var unread = inbox.filter(function (m) { return !tcMailIsRead(m.id); }).length;
    var draftKey = null;
    Object.keys(tcMailState().drafts).forEach(function (k) { if (tcMailComposeOpen(k)) draftKey = k; });

    var foldersEl = document.getElementById('tc-mail-folders');
    if (foldersEl) {
      foldersEl.innerHTML =
        '<button type="button" class="tc-mail-folder' + (!_tcMail.compose && _tcMail.folder === 'inbox' ? ' active' : '') + '" onclick="tcMailFolder(\'inbox\')">' +
          ICON_INBOX + '<span>Inbox</span>' + (unread ? '<b class="tc-mail-count">' + unread + '</b>' : '<em>' + inbox.length + '</em>') +
        '</button>' +
        '<button type="button" class="tc-mail-folder' + (!_tcMail.compose && _tcMail.folder === 'sent' ? ' active' : '') + '" onclick="tcMailFolder(\'sent\')">' +
          ICON_SENT + '<span>Sent</span><em>' + sent.length + '</em>' +
        '</button>' +
        (draftKey || _tcMail.compose
          ? '<button type="button" class="tc-mail-folder' + (_tcMail.compose ? ' active' : '') + '" onclick="tcMailCompose(\'' + (_tcMail.compose || draftKey) + '\')">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg><span>Draft</span><em>1</em>' +
            '</button>'
          : '') +
        '<div class="tc-mail-folders-note">New messages arrive as the file moves forward.</div>';
    }

    var list = _tcMail.folder === 'sent' ? sent : inbox;
    var listEl = document.getElementById('tc-mail-list');
    if (listEl) {
      var h = '<div class="tc-mail-list-head"><strong>' + (_tcMail.folder === 'sent' ? 'Sent' : 'Inbox') + '</strong><span>' + list.length + ' message' + (list.length === 1 ? '' : 's') + '</span></div>';
      if (!list.length) {
        h += '<div class="tc-mail-list-empty">' + (_tcMail.folder === 'sent' ? 'Nothing sent yet.' : 'No messages yet.') + '</div>';
      }
      list.forEach(function (m) {
        var isUnread = m.folder === 'inbox' && !tcMailIsRead(m.id);
        var active = !_tcMail.compose && m.id === _tcMail.id;
        h += '<button type="button" class="tc-mail-item' + (isUnread ? ' unread' : '') + (active ? ' active' : '') + '" onclick="tcMailSelect(\'' + m.id + '\')">' +
          '<span class="tc-mail-item-avatar" style="background:' + m.avatarBg + ';">' + esc(m.avatarInitials) + '</span>' +
          '<span class="tc-mail-item-body">' +
            '<span class="tc-mail-item-top"><span class="tc-mail-item-from">' + esc(m.folder === 'sent' ? 'To: ' + String((tcMailSentRecord(m) || {}).to || m.senderName).replace(/\s*<[^>]*>/g, '') : m.senderName) + '</span><span class="tc-mail-item-time">' + esc(tcMailShortTime(m)) + '</span></span>' +
            '<span class="tc-mail-item-subj">' + esc(tcMailSubject(m)) + '</span>' +
            '<span class="tc-mail-item-snip">' + esc(tcMailSnip(m)) + '</span>' +
          '</span>' +
        '</button>';
      });
      listEl.innerHTML = h;
    }

    var readerEl = document.getElementById('tc-mail-reader');
    if (readerEl) {
      if (_tcMail.compose) {
        readerEl.innerHTML = tcMailComposeReaderHtml(_tcMail.compose);
        tcMailRestoreDraft(_tcMail.compose);
      } else {
        readerEl.innerHTML = tcMailReaderHtml(_tcMail.id ? tcMailFind(_tcMail.id) : null);
      }
      readerEl.scrollTop = 0;
    }
  }

  /* ── Side-by-side reference reader ── */
  var _tcDock = { id: null, collapsedSidebar: false };
  window.tcMailDock = function (id) {
    tcMailEnsureBodies();
    var e = tcMailFind(id);
    if (!e) return;
    var dock = document.getElementById('tc-mail-dock');
    if (!dock) {
      dock = document.createElement('aside');
      dock.id = 'tc-mail-dock';
      dock.className = 'tc-mail-dock';
      dock.setAttribute('aria-label', 'Email reference');
      document.body.appendChild(dock);
    }
    _tcDock.id = id;
    dock.innerHTML =
      '<div class="tc-mail-dock-head">' +
        '<span class="tc-mail-dock-kicker">' + ICON_MAIL + ' Reference</span>' +
        '<button type="button" class="tc-mail-dock-link" onclick="tcMailOpen(\'' + id + '\')">Open in Mail</button>' +
        '<button type="button" class="tc-mail-dock-close" onclick="tcMailUndock()" aria-label="Close reference">&times;</button>' +
      '</div>' +
      '<div class="tc-mail-dock-body">' + (tcMailBody(id) || tcMailGenericHtml(e)) + '</div>';
    if (!document.body.classList.contains('tc-mail-docked')) {
      var panel = document.getElementById('tc-sidebar-left');
      _tcDock.collapsedSidebar = !!(panel && !panel.classList.contains('collapsed'));
      if (_tcDock.collapsedSidebar && typeof window.tcToggleSidebar === 'function') window.tcToggleSidebar();
    }
    document.body.classList.add('tc-mail-docked');
    dock.querySelector('.tc-mail-dock-body').scrollTop = 0;
  };
  function tcMailUndock() {
    if (!document.body.classList.contains('tc-mail-docked')) return;
    document.body.classList.remove('tc-mail-docked');
    var panel = document.getElementById('tc-sidebar-left');
    if (_tcDock.collapsedSidebar && panel && panel.classList.contains('collapsed') && typeof window.tcToggleSidebar === 'function') {
      window.tcToggleSidebar();
    }
    _tcDock.collapsedSidebar = false;
    _tcDock.id = null;
  }
  window.tcMailUndock = tcMailUndock;

  /* ── New-mail toasts (replies and other surprise arrivals) ── */
  function tcMailToast(e) {
    var host = document.getElementById('tc-mail-toasts');
    if (!host) {
      host = document.createElement('div');
      host.id = 'tc-mail-toasts';
      host.className = 'tc-mail-toasts';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    if (host.querySelector('[data-mail="' + e.id + '"]')) return;
    var t = document.createElement('div');
    t.className = 'tc-mail-toast';
    t.setAttribute('data-mail', e.id);
    t.innerHTML =
      '<span class="tc-mail-toast-avatar" style="background:' + e.avatarBg + ';">' + esc(e.avatarInitials) + '</span>' +
      '<span class="tc-mail-toast-text">' +
        '<span class="tc-mail-toast-kicker">New email</span>' +
        '<strong>' + esc(e.senderName) + '</strong>' +
        '<span class="tc-mail-toast-subj">' + esc(tcMailSubject(e)) + '</span>' +
      '</span>' +
      '<button type="button" class="tc-mail-toast-open" onclick="tcMailOpen(\'' + e.id + '\')">Open</button>' +
      '<button type="button" class="tc-mail-toast-x" onclick="tcMailDismissToast(\'' + e.id + '\')" aria-label="Dismiss">&times;</button>';
    host.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 20);
    setTimeout(function () { tcMailDismissToast(e.id); }, 9000);
  }
  function tcMailDismissToast(id) {
    var t = document.querySelector('#tc-mail-toasts [data-mail="' + id + '"]');
    if (!t) return;
    t.classList.remove('show');
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 250);
  }
  window.tcMailDismissToast = tcMailDismissToast;

  /* Deliver slot emails whose phase is on screen (the center notice
     already announces them, so no toast here) */
  function tcMailSync() {
    var st = tcMailState();
    var changed = false;
    document.querySelectorAll('#wf-body .tc-mail-slot').forEach(function (el) {
      if (!el.offsetParent) return;
      var id = el.getAttribute('data-mail');
      var e = tcMailFind(id);
      if (!e || e.arrival || st.delivered[id]) return;
      st.delivered[id] = true;
      changed = true;
    });
    if (changed && typeof window.tcRefreshInboxList === 'function') window.tcRefreshInboxList();
  }

  (function () {
    var timer = null;
    var token = {};
    window.__tcCaseToken = token;
    function schedule() {
      if (window.__tcCaseToken !== token) return;
      clearTimeout(timer);
      timer = setTimeout(tcMailSync, 150);
    }
    function init() {
      var body = document.getElementById('wf-body');
      if (!body || !window.MutationObserver) return;
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var t = muts[i].target;
          if (!(t.closest && t.closest('#tc-sidebar-left'))) { schedule(); return; }
        }
      }).observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  })();


  var STEP_TITLES = {
    1: 'New Buyer Client Intake',
    2: 'Writing the Offer',
    3: 'Acceptance, Escrow & Deposit',
    4: 'Seller Disclosure Review',
    5: 'Buyer Investigations',
    6: 'Request for Repair & Contingency Removal',
    7: 'Loan, Title & Pre-Closing',
    8: 'Closing & Wrap-Up'
  };

  function tcRenderDeadlineBar(n) {
    return '';
  }

  function tcRenderKeyFacts(n, stepFacts) {
    var defaultFacts = [
      ['Buyers', 'Nilanthi Melony & Senaka Mahaarachchi'],
      ['Property', n >= 2 ? '1634 Benedict Canyon Dr, Beverly Hills 90210' : 'Searching (Los Angeles County)'],
      ['Purchase Price', n >= 3 ? '$3,695,000 (accepted Feb 2)' : (n === 2 ? '$3,695,000 (offer)' : 'No offer yet')],
      ['Deposit (EMD)', n >= 4 ? '$110,850 (received)' : (n === 3 ? '$110,850 due Feb 5' : 'Set by the offer')],
      ['Loan', 'Chase · $2,956,000 (80%)'],
      ['Escrow #', n >= 3 ? '2064-AS · Next Door Escrow' : 'Not opened'],
      ['Title', n >= 3 ? 'Chicago Title · FBSC2601151' : 'Not opened'],
      ['COE', n >= 3 ? 'Wed, Mar 4, 2026' : '30 days after acceptance'],
      ['Seller credit', n >= 7 ? '$95,000 (RR No. 1)' : 'None']
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
    CONTACT_ORDER.forEach(function (k) {
      var c = CONTACTS[k];
      if (!c) return;
      var isActive = !!activeSet[k];
      if (!isActive) return;

      h += '<div class="tc-contact-card active-step">' +
        '<div class="tc-contact-top">' +
          '<div class="tc-contact-avatar" style="background:' + (c.color || 'var(--v-navy)') + ';">' + esc(c.initials) + '</div>' +
          '<div class="tc-contact-meta">' +
            '<div class="tc-contact-name">' + esc(c.name) + '</div>' +
            '<div class="tc-contact-role">' + esc(c.role) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="tc-contact-links">' +
          '<div><strong>Company:</strong> ' + esc(c.brokerage || '') + '</div>' +
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
      var isAssigned = (typeof SS_STATE !== 'undefined' && !!SS_STATE['bc-ss_' + k]);

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

  /* Messages from earlier steps count as already read; only the
     current step's inbox items show as new until they are opened. */
  function tcIsUnread(e) {
    return e.folder === 'inbox' && tcMailIsVisible(e) && !tcMailIsRead(e.id);
  }

  function tcRenderUnifiedLeftPanel(n, runState, facts, docs, contacts, hideDocs) {
    var readMap = (typeof window !== 'undefined' && window._tcReadEmails) ? window._tcReadEmails : {};
    var activeFolder = (typeof window !== 'undefined' && window._tcInboxFolder) ? window._tcInboxFolder : 'inbox';
    var activeEmailId = (typeof window !== 'undefined' && window._tcActiveEmailId) ? window._tcActiveEmailId : null;

    var unlocked = TC_EMAILS.filter(tcMailIsVisible).sort(tcMailSortNewest);

    var inboxEmails = unlocked.filter(function (e) { return e.folder === 'inbox'; });
    var sentEmails = unlocked.filter(function (e) { return e.folder === 'sent'; });

    var unreadCount = 0;
    inboxEmails.forEach(function (e) {
      if (tcIsUnread(e)) unreadCount++;
    });

    var listEmails = inboxEmails.slice(0, 3);

    var itemsHtml = '';
    if (!listEmails.length) {
      itemsHtml = '<div style="font-size:11px;color:#94a3b8;padding:16px 8px;text-align:center;">' +
        'No messages yet.' +
        '</div>';
    } else {
      listEmails.forEach(function (e) {
        var isUnread = tcIsUnread(e);
        var isActive = false;
        var itemCls = 'tc-inbox-item' + (isUnread ? ' unread' : '') + (isActive ? ' active' : '');

        itemsHtml += '<button type="button" class="' + itemCls + '" data-id="' + e.id + '" onclick="tcSelectEmail(\'' + e.id + '\')">' +
          '<div class="tc-inbox-avatar" style="background:' + e.avatarBg + ';">' + esc(e.avatarInitials) + '</div>' +
          '<div class="tc-inbox-item-body">' +
            '<div class="tc-inbox-item-top">' +
              '<span class="tc-inbox-sender">' +
                (isUnread ? '<span class="tc-unread-dot"></span>' : '') +
                esc(e.senderName) +
              '</span>' +
              '<span class="tc-inbox-time">' + esc(tcMailShortTime(e)) + '</span>' +
            '</div>' +
            '<div class="tc-inbox-subj">' + esc(tcMailSubject(e)) + '</div>' +
            '<div class="tc-inbox-snip">' + esc(tcMailSnip(e)) + '</div>' +
          '</div>' +
        '</button>';
      });
    }

    var isCollapsed = false;
    var activeTab = 'inbox';
    try {
      isCollapsed = typeof localStorage !== 'undefined' && localStorage.getItem('tc_left_collapsed') === '1';
      activeTab = (typeof localStorage !== 'undefined' && localStorage.getItem('tc_left_tab')) || 'inbox';
    } catch (e) {}
    if (['inbox', 'facts', 'contacts', 'docs'].indexOf(activeTab) === -1) activeTab = 'inbox';
    window._tcActiveSidebarTab = activeTab;

    var contactCount = contacts ? contacts.length : 0;
    var docCount = docs ? docs.length : 0;

    var isInboxVis = (activeTab === 'all' || activeTab === 'inbox');
    var isFactsVis = (activeTab === 'all' || activeTab === 'facts');
    var isContactsVis = (activeTab === 'all' || activeTab === 'contacts');
    var isDocsVis = (activeTab === 'all' || activeTab === 'docs');

    var tabInboxCls = isInboxVis ? '' : ' is-hidden';
    var tabFactsCls = isFactsVis ? '' : ' is-hidden';
    var tabContactsCls = isContactsVis ? '' : ' is-hidden';
    var tabDocsCls = isDocsVis ? '' : ' is-hidden';

    var tabInboxDisp = isInboxVis ? '' : 'style="display:none !important;"';
    var tabFactsDisp = isFactsVis ? '' : 'style="display:none !important;"';
    var tabContactsDisp = isContactsVis ? '' : 'style="display:none !important;"';
    var tabDocsDisp = isDocsVis ? '' : 'style="display:none !important;"';

    var titleMap = {
      all: ['Transaction Tools', '1634 Benedict Canyon &middot; Buyer File'],
      inbox: ['Communications', (unreadCount > 0 ? unreadCount + ' new message' + (unreadCount > 1 ? 's' : '') : 'Inbox &amp; Sent')],
      facts: ['Key Transaction Facts', '1634 Benedict Canyon Dr &middot; Beverly Hills'],
      contacts: ['Parties &amp; Contacts', contactCount + ' active participants'],
      docs: ['Documents &amp; Files', docCount + ' phase documents']
    };
    var curTitles = titleMap[activeTab] || titleMap.all;

    return '<aside class="tc-sidebar-left' + (isCollapsed ? ' collapsed' : '') + '" id="tc-sidebar-left">' +
      '<div class="tc-sidebar-rail">' +
        '<button type="button" class="tc-rail-toggle-btn" onclick="tcToggleSidebar()" title="' + (isCollapsed ? 'Expand panel' : 'Collapse panel') + '" aria-label="' + (isCollapsed ? 'Expand panel' : 'Collapse panel') + '" aria-expanded="' + (isCollapsed ? 'false' : 'true') + '">' +
          '<svg class="tc-ico-collapse" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><polyline points="16 15 13 12 16 9"></polyline></svg>' +
          '<svg class="tc-ico-expand" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><polyline points="13 9 16 12 13 15"></polyline></svg>' +
        '</button>' +
        '<div class="tc-rail-divider"></div>' +
        '<button type="button" class="tc-rail-btn' + (activeTab === 'inbox' ? ' active' : '') + '" data-tab="inbox" onclick="tcRailClick(\'inbox\')" title="Communications (' + unreadCount + ' unread)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path><polyline points="22 6 12 13 2 6"></polyline></svg>' +
          '<span class="tc-rail-badge" id="tc-rail-unread-badge"' + (unreadCount > 0 ? '' : ' style="display:none;"') + '></span>' +
        '</button>' +
        '<button type="button" class="tc-rail-btn' + (activeTab === 'facts' ? ' active' : '') + '" data-tab="facts" onclick="tcRailClick(\'facts\')" title="Key Transaction Facts"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1"></rect><line x1="8" y1="11" x2="16" y2="11"></line><line x1="8" y1="15" x2="14" y2="15"></line></svg></button>' +
        '<button type="button" class="tc-rail-btn' + (activeTab === 'contacts' ? ' active' : '') + '" data-tab="contacts" onclick="tcRailClick(\'contacts\')" title="Parties & Contacts (' + contactCount + ')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></button>' +
        '<button type="button" class="tc-rail-btn' + (activeTab === 'docs' ? ' active' : '') + '" data-tab="docs" onclick="tcRailClick(\'docs\')" title="Documents & Files (' + docCount + ')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></button>' +
      '</div>' +

      '<div class="tc-sidebar-content" id="tc-sidebar-content">' +
        '<div class="tc-sidebar-header">' +
          '<div class="tc-sidebar-brand">' +
            '<span class="tc-sidebar-status-dot"></span>' +
            '<div>' +
              '<span class="tc-sidebar-title" id="tc-pane-title">' + curTitles[0] + '</span>' +
              '<span class="tc-sidebar-sub" id="tc-pane-sub">' + curTitles[1] + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="tc-toolbox-body" id="tc-toolbox-body">' +

          '<div class="tc-toolbox-section' + tabInboxCls + '" id="tc-sec-inbox" ' + tabInboxDisp + '>' +
            '<div class="tc-mac-sec-header" onclick="tcToggleSection(\'inbox\')">' +
              '<div class="tc-mac-sec-left">' +
                '<span class="tc-mac-sec-title">Communications</span>' +
                '<span class="tc-mac-count-pill" id="tc-inbox-unread-count"' + (unreadCount > 0 ? '' : ' style="display:none;"') + '>' + unreadCount + ' new</span>' +
              '</div>' +
              '<span class="tc-mac-chevron" id="tc-arrow-inbox">▾</span>' +
            '</div>' +
            '<div class="tc-sec-content">' +
              '<button type="button" class="tc-open-mail-btn" onclick="tcMailOpen()">' + ICON_MAIL + '<span>Open Mail</span>' +
                '<b id="tc-open-mail-count"' + (unreadCount > 0 ? '' : ' style="display:none;"') + '>' + unreadCount + ' new</b></button>' +
              '<div class="tc-inbox-recent-label">Recent messages</div>' +
              '<div class="tc-inbox-list" id="tc-inbox-list">' + itemsHtml + '</div>' +
            '</div>' +
          '</div>' +

          '<div class="tc-toolbox-section' + tabFactsCls + '" id="tc-sec-facts" ' + tabFactsDisp + '>' +
            '<div class="tc-mac-sec-header" onclick="tcToggleSection(\'facts\')">' +
              '<div class="tc-mac-sec-left">' +
                '<span class="tc-mac-sec-title">Key Transaction Facts</span>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;">' +
                '<span class="tc-mac-sec-badge">1634 Benedict</span>' +
                '<span class="tc-mac-chevron" id="tc-arrow-facts">▾</span>' +
              '</div>' +
            '</div>' +
            '<div class="tc-sec-content">' +
              tcRenderKeyFacts(n, facts) +
            '</div>' +
          '</div>' +

          '<div class="tc-toolbox-section' + tabContactsCls + '" id="tc-sec-contacts" ' + tabContactsDisp + '>' +
            '<div class="tc-mac-sec-header" onclick="tcToggleSection(\'contacts\')">' +
              '<div class="tc-mac-sec-left">' +
                '<span class="tc-mac-sec-title">Parties &amp; Contacts</span>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;">' +
                '<span class="tc-mac-sec-badge">' + contactCount + ' active</span>' +
                '<span class="tc-mac-chevron" id="tc-arrow-contacts">▾</span>' +
              '</div>' +
            '</div>' +
            '<div class="tc-sec-content">' +
              tcRenderContacts(n, contacts) +
            '</div>' +
          '</div>' +

          '<div class="tc-toolbox-section tc-docs-section mh-docs-section open' + tabDocsCls + '" id="tc-sec-docs" ' + tabDocsDisp + '>' +
            '<div class="tc-mac-sec-header" onclick="tcToggleSection(\'docs\')">' +
              '<div class="tc-mac-sec-left">' +
                '<span class="tc-mac-sec-title">Documents &amp; Files</span>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;">' +
                '<span class="tc-mac-sec-badge">' + docCount + ' files</span>' +
                '<span class="tc-mac-chevron" id="tc-arrow-docs">▾</span>' +
              '</div>' +
            '</div>' +
            '<div class="tc-sec-content">' +
              tcRenderDocs(n, docs, hideDocs) +
            '</div>' +
          '</div>' +

        '</div>' +
      '</div>' +
    '</aside>';
  }

  function tcRenderInboxPanel() { return ''; }
  function tcRenderResourcesPanel() { return ''; }

  function tcRenderStatusBar(n) {
    return '';
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
    var leftPanel = tcRenderUnifiedLeftPanel(n, run(), facts, docs, contacts, hideDocs);
    var statusBar = tcRenderStatusBar(n);

    var leftCol = false;
    try {
      leftCol = typeof localStorage !== 'undefined' && localStorage.getItem('tc_left_collapsed') === '1';
    } catch (e) {}

    var gridClasses = 'tc-workspace-grid' + (leftCol ? ' left-collapsed' : '');

    var dlChip = '';
    if (deadline) {
      dlChip = '<div class="tc-step-contingency-chip' + (deadline.critical ? ' critical' : '') + '">' +
        '<span class="tc-dl-icon">' + ICON_ALERT + '</span>' +
        '<span class="tc-dl-text">' + esc(deadline.text) + '</span>' +
        '<strong class="tc-dl-days">' + esc(deadline.days) + '</strong>' +
        '</div>';
    }

    /* the step's documents live in the sidebar; point there so nobody misses them */
    var docsChip = (docs.length && !hideDocs)
      ? '<button type="button" class="tc-step-docs-chip" onclick="tcOpenStepDocs()">' +
          '<span class="tc-step-docs-icon">' + ICON_DOC + '</span>' +
          '<span>The documents for this step (' + docs.length + ') are in the <strong>Documents</strong> tab.</span>' +
          '<em>View documents &rarr;</em>' +
        '</button>'
      : '';

    if (typeof window !== 'undefined') {
      setTimeout(function () {
        if (typeof window.tcInitTimer === 'function') window.tcInitTimer();
      }, 50);
    }

    return '<div class="tc-workspace-root">' +
      '<div class="' + gridClasses + '" id="tc-workspace-grid">' +
        leftPanel +
        '<main class="tc-main-workspace">' +
          '<div class="tc-step-header-card">' +
            '<div class="tc-step-header-top">' +
              '<span class="tc-step-badge">Step ' + n + ' of 8</span>' +
              '<span class="tc-step-date-chip">' + ICON_CAL + '<span>' + esc(date) + '</span></span>' +
            '</div>' +
            '<h2 class="tc-step-title">' + esc(title) + '</h2>' +
            '<p class="tc-step-lead">' + lead + '</p>' +
            docsChip +
            dlChip +
          '</div>' +
          '<div class="tc-main-content">' + main + '</div>' +
          nav +
        '</main>' +
      '</div>' +
    '</div>';
  }

  // Interactive Window Handlers
  window.tcToggleSidebar = function () {
    var grid = document.getElementById('tc-workspace-grid');
    var panel = document.getElementById('tc-sidebar-left');
    if (!grid || !panel) return;

    var isCol = panel.classList.toggle('collapsed');
    grid.classList.toggle('left-collapsed', isCol);
    var tgl = panel.querySelector('.tc-rail-toggle-btn');
    if (tgl) {
      tgl.title = isCol ? 'Expand panel' : 'Collapse panel';
      tgl.setAttribute('aria-label', tgl.title);
      tgl.setAttribute('aria-expanded', isCol ? 'false' : 'true');
    }

    try {
      localStorage.setItem('tc_left_collapsed', isCol ? '1' : '0');
    } catch (e) {}
  };

  window.tcTogglePanel = function (side) {
    window.tcToggleSidebar();
  };

  /* Rail icons: open a tool, or retract the panel when its tool is already showing */
  window.tcOpenStepDocs = function () {
    window.tcSwitchSidebarTab('docs');
    var btn = document.querySelector('.tc-rail-btn[data-tab="docs"]');
    if (btn) {
      btn.classList.remove('tc-rail-flash');
      void btn.offsetWidth;
      btn.classList.add('tc-rail-flash');
    }
  };

  window.tcRailClick = function (tab) {
    var panel = document.getElementById('tc-sidebar-left');
    if (panel && !panel.classList.contains('collapsed') && window._tcActiveSidebarTab === tab) {
      window.tcToggleSidebar();
      return;
    }
    window.tcSwitchSidebarTab(tab);
  };

  window.tcSwitchSidebarTab = function (tab) {
    if (['inbox', 'facts', 'contacts', 'docs'].indexOf(tab) === -1) tab = 'inbox';
    window._tcActiveSidebarTab = tab;
    try { localStorage.setItem('tc_left_tab', tab); } catch (e) {}

    var panel = document.getElementById('tc-sidebar-left');
    var grid = document.getElementById('tc-workspace-grid');
    if (panel && panel.classList.contains('collapsed')) {
      panel.classList.remove('collapsed');
      if (grid) grid.classList.remove('left-collapsed');
      try { localStorage.setItem('tc_left_collapsed', '0'); } catch (e) {}
    }

    var btns = document.querySelectorAll('.tc-rail-btn');
    btns.forEach(function (btn) {
      if (btn.getAttribute('data-tab') === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    var titleEl = document.getElementById('tc-pane-title');
    var subEl = document.getElementById('tc-pane-sub');
    var titles = {
      all: ['Transaction Tools', '1634 Benedict Canyon &middot; Buyer File'],
      inbox: ['Communications', 'Inbox &amp; Sent Messages'],
      facts: ['Key Transaction Facts', '1634 Benedict Canyon Dr &middot; Beverly Hills'],
      contacts: ['Parties &amp; Contacts', 'Directory'],
      docs: ['Documents &amp; Files', 'Escrow &amp; Contract Files']
    };
    if (titleEl && titles[tab]) titleEl.innerHTML = titles[tab][0];
    if (subEl && titles[tab]) subEl.innerHTML = titles[tab][1];

    var sections = {
      inbox: document.getElementById('tc-sec-inbox'),
      facts: document.getElementById('tc-sec-facts'),
      contacts: document.getElementById('tc-sec-contacts'),
      docs: document.getElementById('tc-sec-docs')
    };

    Object.keys(sections).forEach(function (secKey) {
      var sec = sections[secKey];
      if (!sec) return;
      var show = (tab === 'all' || tab === secKey);
      if (show) {
        sec.classList.remove('is-hidden');
        if (sec.style && typeof sec.style.setProperty === 'function') {
          sec.style.setProperty('display', 'flex', 'important');
        } else if (sec.style) {
          sec.style.display = 'flex';
        }
        if (tab !== 'all') {
          sec.classList.remove('is-folded');
          var arrow = document.getElementById('tc-arrow-' + secKey);
          if (arrow) arrow.textContent = '▾';
        }
      } else {
        sec.classList.add('is-hidden');
        if (sec.style && typeof sec.style.setProperty === 'function') {
          sec.style.setProperty('display', 'none', 'important');
        } else if (sec.style) {
          sec.style.display = 'none';
        }
      }
    });
  };

  window.tcOpenSidebarWithTab = function (tab) {
    var panel = document.getElementById('tc-sidebar-left');
    var grid = document.getElementById('tc-workspace-grid');
    if (panel && panel.classList.contains('collapsed')) {
      panel.classList.remove('collapsed');
      if (grid) grid.classList.remove('left-collapsed');
      try { localStorage.setItem('tc_left_collapsed', '0'); } catch (e) {}
    }
    window.tcSwitchSidebarTab(tab);
  };

  window.tcToggleSection = function (secId) {
    var sec = document.getElementById('tc-sec-' + secId);
    if (!sec) return;
    sec.classList.toggle('is-folded');
    var arrow = document.getElementById('tc-arrow-' + secId);
    if (arrow) {
      arrow.textContent = sec.classList.contains('is-folded') ? '▶' : '▼';
    }
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

  /* Sidebar inbox rows open the message in the mail app; they never move the case */
  window.tcSelectEmail = function (emailId) {
    window._tcActiveEmailId = emailId;
    window.tcMailOpen(emailId);
  };

  window.tcRefreshInboxList = function () {
    var curStep = (typeof wfStep !== 'undefined') ? (wfStep + 1) : 1;
    var container = document.getElementById('tc-inbox-list');
    if (!container) return;

    var readMap = window._tcReadEmails || {};
    var activeFolder = window._tcInboxFolder || 'inbox';
    var activeEmailId = window._tcActiveEmailId || null;

    var unlocked = TC_EMAILS.filter(tcMailIsVisible).sort(tcMailSortNewest);

    var inboxEmails = unlocked.filter(function (e) { return e.folder === 'inbox'; });
    var sentEmails = unlocked.filter(function (e) { return e.folder === 'sent'; });

    var unreadCount = 0;
    inboxEmails.forEach(function (e) {
      if (tcIsUnread(e)) unreadCount++;
    });

    var tabInboxBtn = document.getElementById('tc-tab-inbox');
    if (tabInboxBtn) tabInboxBtn.textContent = 'Inbox (' + inboxEmails.length + ')';
    var tabSentBtn = document.getElementById('tc-tab-sent');
    if (tabSentBtn) tabSentBtn.textContent = 'Sent (' + sentEmails.length + ')';
    var openMailCount = document.getElementById('tc-open-mail-count');
    if (openMailCount) {
      openMailCount.textContent = unreadCount + ' new';
      openMailCount.style.display = unreadCount > 0 ? '' : 'none';
    }
    var unreadBadge = document.getElementById('tc-inbox-unread-count');
    if (unreadBadge) {
      unreadBadge.textContent = unreadCount + ' new';
      unreadBadge.style.display = unreadCount > 0 ? '' : 'none';
    }

    var unreadTabBadge = document.getElementById('tc-inbox-tab-badge');
    if (unreadTabBadge) {
      unreadTabBadge.textContent = unreadCount;
      unreadTabBadge.style.display = unreadCount > 0 ? '' : 'none';
    }

    var railBadge = document.querySelector('.tc-rail-badge');
    if (railBadge) {
      railBadge.style.display = unreadCount > 0 ? '' : 'none';
    }

    var listEmails = inboxEmails.slice(0, 3);
    if (!listEmails.length) {
      container.innerHTML = '<div style="font-size:11px;color:#94a3b8;padding:16px 8px;text-align:center;">' +
        'No messages yet.' +
        '</div>';
      return;
    }

    var h = '';
    listEmails.forEach(function (e) {
      var isUnread = tcIsUnread(e);
      var isActive = false;
      var itemCls = 'tc-inbox-item' + (isUnread ? ' unread' : '') + (isActive ? ' active' : '');

      h += '<button type="button" class="' + itemCls + '" data-id="' + e.id + '" onclick="tcSelectEmail(\'' + e.id + '\')">' +
        '<div class="tc-inbox-avatar" style="background:' + e.avatarBg + ';">' + esc(e.avatarInitials) + '</div>' +
        '<div class="tc-inbox-item-body">' +
          '<div class="tc-inbox-item-top">' +
            '<span class="tc-inbox-sender">' +
              (isUnread ? '<span class="tc-unread-dot"></span>' : '') +
              esc(e.senderName) +
            '</span>' +
            '<span class="tc-inbox-time">' + esc(tcMailShortTime(e)) + '</span>' +
          '</div>' +
          '<div class="tc-inbox-subj">' + esc(tcMailSubject(e)) + '</div>' +
          '<div class="tc-inbox-snip">' + esc(tcMailSnip(e)) + '</div>' +
        '</div>' +
      '</button>';
    });
    container.innerHTML = h;
  };

  window.tcInitTimer = function () {
    if (!window._tcStartTime) {
      window._tcStartTime = Date.now();
    }
    if (!window._tcTimerInterval && typeof setInterval !== 'undefined') {
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
    return '<div class="mh-card"' + tAttr + '><h4>' + title + '</h4>' + (sub ? '<p class="mh-sub">' + sub + '</p>' : '') + body + '</div>';
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
    window.SS_STATE = window.caNewSsState = SS_STATE;
    _tcMail.compose = null;
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
    window._caNewSlide7 = null;
    window._caNewSlide8 = null;
    window._caNewSsStage = null;
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = '';
      var m1 = document.getElementById('bc-zf-modal');
      if (m1) m1.style.display = 'none';
      var m2 = document.getElementById('bc-zf-doc-modal');
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
    var initials = opts.initials || 'NM';
    var sender = opts.sender || 'Melony Mahaarachchi';
    var role = opts.role || 'Buyer · 1634 Benedict Canyon Dr';

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
        '<a href="javascript:void(0)" onclick="caNewAutoDecide(\'' + id + '\')" class="wf-chat-autofill tc-assist">Skip &rarr; auto-fill correct answer</a>' +
      '</div>' +
    '</div>';
  }
  function chatDecisionAnsweredHtml(id, idx) {
    var d = DEC[id];
    var last = DEC_LAST[id] || { idx: idx, ok: d.choices[idx].ok };
    var opts = (d && d.opts) || {};
    var initials = opts.initials || 'NM';
    var sender = opts.sender || 'Melony Mahaarachchi';
    var role = opts.role || 'Buyer · 1634 Benedict Canyon Dr';
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
      (answered ? '' : '<button class="tc-assist" onclick="event.stopPropagation();caNewAutoDecide(\'' + id + '\')" style="background:#e0e0e0;color:#333;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0">Auto-fill</button>') +
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
    if (m) return (m[3] || '2026') + '-' + pad(MONTHS[m[1]]) + '-' + pad(+m[2]);
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
    /* even columns: 3-5 fields sit on one line, 6 as 3 + 3, 7-8 as 4 + 4 */
    var n = rows.length;
    var cols = n <= 5 ? n : (n === 6 ? 3 : 4);
    var h = '<div class="mh-rows' + (opts.one ? ' one' : ' tc-cols') + '" style="--mh-cols:' + cols + '">';
    rows.forEach(function (r, i) {
      var v = vals[i] !== undefined ? vals[i] : '';
      var cls = 'mh-row' + (res ? (res[i] ? ' ok' : ' no') : '');
      h += '<div class="' + cls + '" id="' + id + '-row' + i + '"><label for="' + id + '-' + i + '">' + r.label + (r.hint ? ' <em>' + r.hint + '</em>' : '') + '</label>';
      if (r.kind === 'select') {
        h += '<select id="' + id + '-' + i + '" onchange="caNewSave(\'' + id + '\',' + i + ',this.value)"><option value="">Choose</option>';
        r.options.forEach(function (o) { h += '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; });
        h += '</select>';
      } else {
        h += '<input ' + tcCaseFieldAttrs(r) + ' id="' + id + '-' + i + '" value="' + esc(tcCaseFieldValue(r, r.kind === 'date' ? toDate(v) : v)) + '" placeholder="' + (r.ph || '') + '" oninput="caNewSave(\'' + id + '\',' + i + ',this.value)">';
      }
      h += '<span class="mh-ans' + (st['s_' + id] ? ' show' : '') + '">File says: ' + r.show + '</span></div>';
    });
    h += '</div><div class="mh-actions">' +
         '<button class="mh-btn mh-btn-ghost tc-assist" onclick="caNewAutoFill(\'' + id + '\')">Auto-fill</button>' +
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
      else if (r.kind === 'date' || r.kind === 'money') { el.value = tcCaseFieldValue(r, r.ans); }
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
             '<button class="mh-btn mh-btn-ghost tc-assist" onclick="caNewAutoPick(\'' + id + '\')">&#9889; Auto-fill</button>' +
             '</div>';
      }
    } else {
      h += '<div class="mh-actions"><button class="mh-btn mh-btn-ghost tc-assist" onclick="caNewAutoPick(\'' + id + '\')">Auto-fill</button></div>';
    }
    return h;
  }
  window.caNewRetryPick = function (id) {
    var st = run();
    delete st['pd_' + id];
    var el = document.getElementById(id);
    if (el) el.innerHTML = pickerHtml(id);
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
    if (REVEAL[id]) caNewReveal(REVEAL[id]);
    if (typeof wfUpdateScore === 'function') wfUpdateScore();
  };

  var COMPOSE_ANS = {};
  var COMPOSE_RULES = {};
  var COMPOSE_CHOICES = {};
  var CASE_DIRECTORY = CONTACT_ORDER.map(function (k) {
    var c = CONTACTS[k];
    return { key: k, name: c.name, role: c.role + ' · ' + c.brokerage, email: c.email, initials: c.initials };
  });

  var _contactDrop = null;
  function getContactDrop() {
    if (!_contactDrop) {
      _contactDrop = document.createElement('div');
      _contactDrop.className = 'wf-contact-dropdown';
      _contactDrop.style.display = 'none';
      document.body.appendChild(_contactDrop);
    }
    return _contactDrop;
  }
  function positionDropdown(input) {
    var drop = getContactDrop();
    var rect = input.getBoundingClientRect();
    drop.style.top = (rect.bottom + 4) + 'px';
    drop.style.left = rect.left + 'px';
    drop.style.width = rect.width + 'px';
  }

  window.caNewShowContacts = function (key, field) {
    caNewFilterContacts(key, field);
  };

  /* The To / CC inputs hold a comma-separated list; suggestions match the
     name being typed after the last comma. */
  window.caNewFilterContacts = function (key, field) {
    var input = document.getElementById('wf-' + key + '-' + field);
    var drop = getContactDrop();
    if (!input) return;

    var parts = String(input.value || '').split(',');
    var q = parts[parts.length - 1].trim().toLowerCase();
    if (!q) { drop.style.display = 'none'; return; }
    var filtered = CASE_DIRECTORY.filter(function (c) {
      if (input.value.toLowerCase().indexOf(c.email) > -1) return false;
      return c.name.toLowerCase().indexOf(q) !== -1 ||
             c.email.toLowerCase().indexOf(q) !== -1 ||
             c.role.toLowerCase().indexOf(q) !== -1;
    });

    if (filtered.length === 0) {
      drop.innerHTML = '<div style="padding:10px 12px;font-size:12px;color:var(--v-muted);">No matching contacts</div>';
      drop.style.display = 'block';
      positionDropdown(input);
      return;
    }

    var html = '';
    filtered.forEach(function (c) {
      html += '<div class="wf-contact-option" onmousedown="caNewSelectContact(\'' + key + '\', \'' + field + '\', \'' + c.name.replace(/'/g, "\\'") + '\', \'' + c.email.replace(/'/g, "\\'") + '\')">' +
        '<div class="wf-contact-opt-avatar">' + c.initials + '</div>' +
        '<div class="wf-contact-opt-info">' +
          '<div class="wf-contact-opt-name">' + esc(c.name) + ' <span class="wf-contact-opt-role">(' + esc(c.role) + ')</span></div>' +
          '<div class="wf-contact-opt-email">' + esc(c.email) + '</div>' +
        '</div>' +
      '</div>';
    });

    drop.innerHTML = html;
    drop.style.display = 'block';
    positionDropdown(input);
  };

  window.caNewSelectContact = function (key, field, name, email) {
    var input = document.getElementById('wf-' + key + '-' + field);
    if (input) {
      var parts = String(input.value || '').split(',');
      parts[parts.length - 1] = ' ' + name + ' <' + email + '>';
      input.value = parts.join(',').replace(/^\s+/, '') + ', ';
      input.focus();
    }
    var drop = getContactDrop();
    drop.style.display = 'none';
    var statusEl = document.getElementById('wf-' + key + '-body-status');
    if (statusEl) statusEl.innerHTML = '';
  };

  window.caNewHideContacts = function () {
    setTimeout(function () {
      var drop = getContactDrop();
      drop.style.display = 'none';
    }, 200);
  };

  /* compose(o)
     o.key, o.to, o.cc, o.subj, o.attach, o.inst, o.ans (model answer)
     o.rules: { need: [[contactKey, 'to'|'any', message]], never: [[contactKey, message]],
                subj: [keywords], subjMsg } */
  function compose(o) {
    if (o.ans) COMPOSE_ANS[o.key] = o.ans;
    COMPOSE_META[o.key] = { to: o.to || '', cc: o.cc || '', subj: o.subj || '' };
    COMPOSE_RULES[o.key] = o.rules || {};
    if (o.choices) {
      /* same fixed shuffle as decision(): the right template is not always first */
      var k = 0;
      for (var c = 0; c < o.key.length; c++) k += o.key.charCodeAt(c);
      k = k % o.choices.length;
      o.choices = o.choices.slice(k).concat(o.choices.slice(0, k));
    }
    COMPOSE_CHOICES[o.key] = o.choices || null;

    var field = function (name, label, ph) {
      return '<div class="wf-compose-field wf-compose-field-interactive">' +
          '<span class="wf-compose-lbl">' + label + '</span>' +
          '<input type="text" id="wf-' + o.key + '-' + name + '" class="wf-compose-input-interactive" placeholder="' + ph + '" autocomplete="off" oninput="caNewFilterContacts(\'' + o.key + '\', \'' + name + '\')" onfocus="caNewShowContacts(\'' + o.key + '\', \'' + name + '\')" onblur="caNewHideContacts(\'' + o.key + '\', \'' + name + '\')">' +
          '<div id="wf-' + o.key + '-' + name + '-suggestions" class="wf-contact-dropdown" style="display:none;"></div>' +
        '</div>';
    };

    COMPOSE_HTML[o.key] = '<div class="wf-compose">' +
      '<div class="wf-compose-topbar">' +
        '<div class="wf-compose-tab"><span class="wf-compose-dot"></span> New Message &middot; Draft</div>' +
        '<div class="wf-compose-audit-badge"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Transaction file audit trail</div>' +
      '</div>' +
      '<div class="wf-compose-header">' +
        field('to', 'To:', 'Type a name or email&hellip;') +
        field('cc', 'CC:', 'Optional&hellip;') +
        '<div class="wf-compose-field"><span class="wf-compose-lbl">Subject:</span><input type="text" id="wf-' + o.key + '-subj" class="wf-compose-input-interactive" value="" placeholder="Property or client and the purpose of the email"></div>' +
      '</div>' +
      (o.attach ? '<div class="mh-attach">' +
        '<div class="mh-attach-lbl">Attachments (' + o.attach.length + '):</div>' +
        /* attachments are real documents: each chip opens its PDF */
        o.attach.map(function (a) {
          return DOCS[a]
            ? '<button type="button" class="mh-attach-chip is-doc" onclick="caNewOpen(\'' + a + '\')" title="Open ' + esc(DOCS[a][1]) + '">&#128206; ' + DOCS[a][1] + '</button>'
            : '<span class="mh-attach-chip">&#128206; ' + a + '</span>';
        }).join('') +
      '</div>' : '') +
      '<div class="wf-compose-body">' +
        (o.inst ? '<div class="wf-compose-prompt-hint"><strong>TC Task:</strong> ' + o.inst + '</div>' : '') +
        (o.choices ? '<div class="tc-draft-pick">' +
          '<label class="tc-draft-pick-title" for="wf-' + o.key + '-tpl">Choose a response approach</label>' +
          '<select id="wf-' + o.key + '-tpl" class="tc-draft-select" onchange="caNewPickDraft(\'' + o.key + '\', this.selectedIndex - 1)">' +
            '<option value="" disabled selected>Select a template&hellip;</option>' +
            o.choices.map(function (c, i) {
              return '<option value="' + i + '">' + esc(c.label) + '</option>';
            }).join('') +
          '</select></div>' : '') +
        '<textarea id="wf-' + o.key + '-body" placeholder="' + (o.choices ? 'Select a template above, then complete the parts in [brackets]&hellip;' : 'Write your email here&hellip;') + '"></textarea>' +
        '<div class="wf-compose-actions">' +
          '<button type="button" class="wf-compose-submit" id="wf-' + o.key + '-body-btn" onclick="caNewSubmitCompose(\'' + o.key + '\', {textareaId:\'wf-' + o.key + '-body\', statusElId:\'wf-' + o.key + '-body-status\', btnId:\'wf-' + o.key + '-body-btn\', role:\'tc\', scenarioId:\'' + (o.scenario || o.key) + '\', scenarioPrompt:\'' + String(o.prompt || '').replace(/'/g, "\\'") + '\', maxScore:5})">Send &amp; Submit for Grading &rarr;</button>' +
          '<button type="button" class="wf-compose-autofill tc-assist" onclick="caNewAutoCompose(\'' + o.key + '\')">&#9889; Load TC Standard Draft</button>' +
        '</div>' +
        '<div id="wf-' + o.key + '-body-status" class="small" style="margin-top:8px"></div>' +
      '</div></div>';
    return COMPOSE_HTML[o.key];
  }

  /* Template reply: fill the draft and remember which approach was chosen */
  function caNewMarkDraft(key) {
    var sel = run()['dsel_' + key];
    var dd = document.getElementById('wf-' + key + '-tpl');
    if (dd && typeof sel === 'number') dd.selectedIndex = sel + 1;
  }
  window.caNewPickDraft = function (key, i) {
    var c = (COMPOSE_CHOICES[key] || [])[i];
    if (!c) return;
    run()['dsel_' + key] = i;
    var meta = COMPOSE_META[key] || {};
    var set = function (name, v) { var el = document.getElementById('wf-' + key + '-' + name); if (el && !el.value) el.value = v || ''; };
    set('to', c.to || meta.to);
    set('cc', c.cc === undefined ? meta.cc : c.cc);
    set('subj', meta.subj);
    var ta = document.getElementById('wf-' + key + '-body');
    if (ta) { ta.value = c.body; ta.focus(); }
    var statusEl = document.getElementById('wf-' + key + '-body-status');
    if (statusEl) statusEl.innerHTML = '';
    caNewMarkDraft(key);
  };

  window.caNewAutoCompose = function (key) {
    var meta = COMPOSE_META[key] || {};
    (COMPOSE_CHOICES[key] || []).forEach(function (c, i) { if (c.ok) { run()['dsel_' + key] = i; caNewMarkDraft(key); } });
    var set = function (name, v) { var el = document.getElementById('wf-' + key + '-' + name); if (el) el.value = v || ''; };
    set('to', meta.to);
    set('cc', meta.cc);
    set('subj', meta.subj);
    var ta = document.getElementById('wf-' + key + '-body');
    if (ta) {
      if (COMPOSE_ANS[key]) ta.value = COMPOSE_ANS[key];
      ta.readOnly = false;
    }
    var statusEl = document.getElementById('wf-' + key + '-body-status');
    if (statusEl) statusEl.innerHTML = '';
  };

  function caNewComposeErr(statusEl, title, msg, focusEl) {
    if (statusEl) statusEl.innerHTML = '<div class="wf-compose-err"><strong>&#9888; ' + title + '</strong> ' + msg + '</div>';
    if (focusEl && focusEl.focus) focusEl.focus();
  }
  var CONTACT_MATCH = {
    ben: ['belack'], melony: ['melony', 'nilanthi'], senaka: ['senaka'], jonathan: ['jonathan', 'adams', 'carolwood'],
    alicia: ['alicia', 'nextdoorescrow'], david: ['hughes', 'ctt.com'], ryan: ['ryan', 'chase.com'], ingrid: ['ingrid', 'mejia']
  };
  function caNewHasContact(text, key) {
    var t = String(text || '').toLowerCase();
    return (CONTACT_MATCH[key] || []).some(function (m) { return t.indexOf(m) > -1; });
  }

  window.caNewSubmitCompose = function (key, opts) {
    var ta = document.getElementById(opts.textareaId);
    var text = (ta && ta.value || '').trim();
    var statusEl = document.getElementById(opts.statusElId);
    var toEl = document.getElementById('wf-' + key + '-to');
    var ccEl = document.getElementById('wf-' + key + '-cc');
    var subjEl = document.getElementById('wf-' + key + '-subj');
    var rules = COMPOSE_RULES[key] || {};
    var toVal = toEl ? toEl.value.trim().replace(/,\s*$/, '') : '';
    var ccVal = ccEl ? ccEl.value.trim().replace(/,\s*$/, '') : '';
    var subjVal = subjEl ? subjEl.value.trim() : '';

    var choices = COMPOSE_CHOICES[key];
    if (choices) {
      var sel = run()['dsel_' + key];
      if (sel === undefined || !choices[sel]) return caNewComposeErr(statusEl, 'Pick a template:', 'Choose the approach you want to take, then complete it.', null);
      if (!choices[sel].ok) {
        if (!run()['dcw_' + key]) { run()['dcw_' + key] = 1; record(false); }
        return caNewComposeErr(statusEl, 'Rethink this reply before you send it.', choices[sel].fb, null);
      }
      if (/\[[^\]]+\]/.test(text)) return caNewComposeErr(statusEl, 'Complete the draft:', 'Replace the parts in [brackets] with the real details before sending.', ta);
    }

    if (!toVal) return caNewComposeErr(statusEl, 'Recipient missing:', 'Add who this email goes to in the <strong>To:</strong> field.', toEl);

    var needs = rules.need || [];
    for (var i = 0; i < needs.length; i++) {
      var n = needs[i];
      var where = n[1] === 'to' ? toVal : toVal + ' ' + ccVal;
      if (!caNewHasContact(where, n[0])) {
        return caNewComposeErr(statusEl, n[1] === 'to' ? 'Check the To: field.' : 'Someone is missing.', n[2], n[1] === 'to' ? toEl : ccEl);
      }
    }
    var nevers = rules.never || [];
    for (var j = 0; j < nevers.length; j++) {
      if (caNewHasContact(toVal + ' ' + ccVal, nevers[j][0])) {
        return caNewComposeErr(statusEl, 'Check the recipients.', nevers[j][1], ccEl);
      }
    }

    if (!subjVal) return caNewComposeErr(statusEl, 'Subject missing:', 'Write a subject that names the file and the purpose of the email.', subjEl);
    var subjKeys = rules.subj || ['benedict', '1634'];
    var sl = subjVal.toLowerCase();
    if (!subjKeys.some(function (k) { return sl.indexOf(k) > -1; })) {
      return caNewComposeErr(statusEl, 'Subject too vague:', rules.subjMsg || 'Name the property (1634 Benedict Canyon Dr) so everyone can file it with the right transaction.', subjEl);
    }

    if (text.length < (opts.minLen || 60)) {
      return caNewComposeErr(statusEl, 'Email body incomplete:', 'Write the full email before sending.', ta);
    }

    if (window.SCApp && typeof SCApp.submitEmailStep === 'function') {
      SCApp.submitEmailStep(opts);
    } else if (statusEl) {
      statusEl.innerHTML = '<span style="color:var(--good);font-weight:700;font-size:13px">&#10003; Submitted for grading.</span>';
    }
    var st = run();
    st['c_' + key] = 1;
    if (!st['dcw_' + key]) record(true);
    if (TC_EMAILS.some(function (m) { return m.composeKey === key; }) && typeof window.tcMailAfterSend === 'function') {
      window.tcMailAfterSend(key, { to: toVal, cc: ccVal, subj: subjVal, body: text });
    }
    if (typeof wfUpdateScore === 'function') wfUpdateScore();
  };

  /* ---------- progressive phase reveal ---------- */
  var REVEAL = {};
  var pendingReveal = null;
  window.caNewReveal = function (id) {
    var el = document.getElementById(id);
    if (!el || el.style.display !== 'none') return;

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
        '<p>Choose the forms that go out with this buyer&rsquo;s offer. Select only what this transaction needs.</p>' +
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
          '<button type="button" class="wf-zf-autofill-btn tc-assist" onclick="caNewZfLpAutoFill(\'' + id + '\')">&#9889; Auto-fill</button>' +
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
        errEl.innerHTML = '<strong>&#9888; Not quite:</strong> ' + wrongPicks.length + ' selection' + (wrongPicks.length === 1 ? ' is' : 's are') + ' off. ' +
          'Think about which forms a buyer signs with an offer on a trust-owned home, and which ones belong to the seller or come later.';
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

  /* ── zipForm: buyer offer package (C.A.R. RPA 12/25) ── */
  var ZF_LAUNCHPAD = [
    { id: 'rpa',  label: 'Residential Purchase Agreement (RPA)', sub: 'C.A.R. RPA 12/25 · The offer itself', ok: true },
    { id: 'ad',   label: 'Agency Relationship Disclosure (AD)', sub: 'C.A.R. AD · Due before the buyer signs an offer', ok: true },
    { id: 'prbs', label: 'Possible Representation of More Than One Buyer or Seller (PRBS)', sub: 'C.A.R. PRBS', ok: true },
    { id: 'bia',  label: "Buyer's Investigation Advisory (BIA)", sub: 'C.A.R. BIA', ok: true },
    { id: 'bhia', label: "Buyer Homeowners' Insurance Advisory (BHIA)", sub: 'C.A.R. BHIA', ok: true },
    { id: 'wfa',  label: 'Wire Fraud Advisory (WFA)', sub: 'C.A.R. WFA', ok: true },
    { id: 'ta',   label: 'Trust Advisory (TA)', sub: 'C.A.R. TA · Property sold by the trustee of a trust', ok: true },
    { id: 'frr',  label: 'Federal Reporting Requirement Purchase Addendum (FRR-PA)', sub: 'C.A.R. FRR-PA', ok: true },
    { id: 'fhda', label: 'Fair Housing & Discrimination Advisory (FHDA)', sub: 'C.A.R. FHDA', ok: true },
    { id: 'ccpa', label: 'California Consumer Privacy Act Advisory (CCPA)', sub: 'C.A.R. CCPA', ok: true },
    { id: 'rla',  label: 'Residential Listing Agreement (RLA)', sub: 'C.A.R. RLA · Seller and listing broker', ok: false },
    { id: 'tds',  label: 'Transfer Disclosure Statement (TDS)', sub: 'C.A.R. TDS · Completed by the seller', ok: false },
    { id: 'sco',  label: 'Seller Counter Offer (SCO)', sub: 'C.A.R. SCO · Written by the seller side', ok: false },
    { id: 'crb',  label: 'Buyer Contingency Removal (CR-B)', sub: 'C.A.R. CR-B · Used after acceptance', ok: false }
  ];

  function zfNum(v) { return parseFloat(String(v || '').replace(/[^0-9.]/g, '')); }
  function zfMoney(n) { return function (v) { return Math.abs(zfNum(v) - n) < 0.5; }; }
  function zfDays(n) { return function (v) { return zfNum(v) === n; }; }

  var ZF_SECTIONS = [
    {
      title: '1. Offer & Property',
      fields: [
        { id: 'buyer1', label: 'Buyer 1', type: 'text', ph: 'Full legal name',
          validate: function (v) { var s = (v || '').toLowerCase(); return s.indexOf('nilanthi') > -1 && s.indexOf('mahaarachchi') > -1; },
          hint: "Use the full legal name from the buyer representation agreement and Ben's Step 1 reply, not the name she goes by.", auto: 'Nilanthi Melony Mahaarachchi' },
        { id: 'buyer2', label: 'Buyer 2', type: 'text', ph: 'Full legal name',
          validate: function (v) { var s = (v || '').toLowerCase(); return s.indexOf('senaka') > -1 && s.indexOf('mahaarachchi') > -1; },
          hint: 'Both buyers go on the offer, with their full legal names.', auto: 'Senaka Mahaarachchi' },
        { id: 'address', label: 'Property address', type: 'text', ph: 'Street address',
          validate: function (v) { return /1634\s+benedict/i.test(v || ''); },
          hint: 'Street address from Ben’s email.', auto: '1634 Benedict Canyon Dr' },
        { id: 'city', label: 'City', type: 'text', ph: 'City',
          validate: function (v) { var s = (v || '').toLowerCase(); return s.indexOf('beverly hills') > -1 || s.indexOf('los angeles') > -1; },
          hint: 'The mailing city is Beverly Hills; the assessor lists the parcel in the City of Los Angeles. The RPA warns that the two can differ.', auto: 'Beverly Hills' },
        { id: 'county', label: 'County', type: 'text', ph: 'County',
          validate: function (v) { return /los angeles/i.test(v || ''); },
          hint: 'County where the parcel sits (see the assessor search).', auto: 'Los Angeles' },
        { id: 'zip', label: 'ZIP', type: 'text', ph: 'ZIP',
          validate: function (v) { return String(v || '').replace(/\D/g, '') === '90210'; },
          hint: 'ZIP code from Ben’s email.', auto: '90210' },
        { id: 'apn', label: 'APN', type: 'text', ph: '0000-000-000',
          validate: function (v) { return String(v || '').replace(/\D/g, '') === '4356007010'; },
          hint: 'Use the APN you found in the Los Angeles County assessor search.', auto: '4356-007-010' }
      ]
    },
    {
      title: '2. Price, Deposit & Loan',
      fields: [
        { id: 'price', label: 'Purchase price', type: 'text', kind: 'money', ph: '$', validate: zfMoney(3695000),
          hint: 'Offer price from Ben’s terms.', auto: '$3,695,000.00' },
        { id: 'deposit', label: 'Initial deposit', type: 'text', kind: 'money', ph: '$', validate: zfMoney(110850),
          hint: 'Ben asked for a 3% deposit. Calculate 3% of the purchase price.', auto: '$110,850.00' },
        { id: 'loan', label: 'First loan amount', type: 'text', kind: 'money', ph: '$', validate: zfMoney(2956000),
          hint: 'The loan is 80% of the purchase price.', auto: '$2,956,000.00' },
        { id: 'rate', label: 'Interest rate not to exceed', type: 'text', ph: '%',
          validate: function (v) { return zfNum(v) === 7; }, hint: 'Rate cap from Ben’s terms.', auto: '7.000' },
        { id: 'coe', label: 'Close of escrow', type: 'text', ph: 'days', validate: zfDays(30),
          hint: 'Days after acceptance, from Ben’s terms.', auto: '30' },
        { id: 'expires', label: 'Offer expires', type: 'text', kind: 'date', ph: 'mm/dd/yyyy',
          validate: function (v) { return toDate(v) === '2026-02-02'; }, hint: 'Ben wants an answer by Monday morning at 10:00 AM.', auto: '02/02/2026' }
      ]
    },
    {
      title: '3. Contingencies',
      fields: [
        { id: 'c_loan', label: 'Loan contingency', type: 'text', ph: 'days', validate: zfDays(21),
          hint: 'Loan contingency days from Ben’s terms.', auto: '21' },
        { id: 'c_appr', label: 'Appraisal contingency', type: 'text', ph: 'days', validate: zfDays(14),
          hint: 'Appraisal contingency days from Ben’s terms.', auto: '14' },
        { id: 'c_inv', label: 'Investigation of property', type: 'text', ph: 'days', validate: zfDays(12),
          hint: 'Ben shortened the investigation period. Check his email.', auto: '12' },
        { id: 'c_docs', label: 'Review of seller documents', type: 'text', ph: 'days', validate: zfDays(7),
          hint: 'Seller documents and the preliminary report both use the shorter period in Ben’s email.', auto: '7' },
        { id: 'c_prelim', label: 'Preliminary (title) report', type: 'text', ph: 'days', validate: zfDays(7),
          hint: 'Seller documents and the preliminary report both use the shorter period in Ben’s email.', auto: '7' }
      ]
    },
    {
      title: '4. Costs & Compensation',
      fields: [
        { id: 'comp', label: "Seller pays Buyer's Broker", type: 'text', ph: '%',
          validate: function (v) { return zfNum(v) === 2.5; },
          hint: 'The buyer representation agreement sets 2.5%. Ben is asking the seller to pay it out of the proceeds (RPA 3G(3)).', auto: '2.500' },
        { id: 'escrow_holder', label: 'Escrow holder', type: 'select',
          options: [['', 'Select...'], ['seller', "Seller's choice"], ['buyer', "Buyer's choice"], ['named', 'Named escrow company']],
          validate: function (v) { return v === 'seller'; }, hint: 'Ben is leaving escrow and title to the seller.', auto: 'seller' },
        { id: 'warranty', label: 'Home warranty', type: 'select',
          options: [['', 'Select...'], ['waived', 'Buyer waives home warranty plan'], ['seller', 'Seller pays'], ['buyer', 'Buyer pays']],
          validate: function (v) { return v === 'waived'; }, hint: 'Check what Ben said about the home warranty.', auto: 'waived' },
        { id: 'nhd', label: 'Natural hazard disclosure report paid by', type: 'select',
          options: [['', 'Select...'], ['seller', 'Seller'], ['buyer', 'Buyer'], ['both', 'Both']],
          validate: function (v) { return v === 'seller'; }, hint: 'Ben kept the standard allocation for the NHD report.', auto: 'seller' }
      ]
    }
  ];

  /* Fast Fill tab: [fast-fill id suffix, label, value, target field] */
  var ZF_FF = [
    ['buyer1', 'Buyer 1 legal name', 'Nilanthi Melony Mahaarachchi', '0-0'],
    ['buyer2', 'Buyer 2 legal name', 'Senaka Mahaarachchi', '0-1'],
    ['address', 'Property address', '1634 Benedict Canyon Dr', '0-2'],
    ['apn', "Assessor's Parcel No. (APN)", '4356-007-010', '0-6'],
    ['price', 'Purchase price', '$3,695,000.00', '1-0'],
    ['deposit', 'Initial deposit', '$110,850.00', '1-1'],
    ['loan', 'First loan amount', '$2,956,000.00', '1-2']
  ];

  function zfDoneCard(id) {
    return '<div class="zf-apply-card-badge done">&#10003; SENT FOR SIGNATURE</div>' +
      '<h4 class="zf-apply-card-title">C.A.R. Form RPA &mdash; Residential Purchase Agreement</h4>' +
      '<p class="zf-apply-card-prop">1634 Benedict Canyon Dr, Beverly Hills, CA 90210 &middot; Sent Feb 1, 2026</p>' +
      '<p class="zf-apply-card-desc" style="color:#15803d;font-weight:600;">&#10003; The RPA and the offer package went to Ben for review and to both buyers through DocuSign.</p>' +
      '<div class="zf-apply-card-actions"><button type="button" class="zf-apply-card-btn secondary" onclick="caNewZfOpenDocFullscreen(\'' + id + '\', false)">View RPA</button></div>';
  }

  function zipformsTemplateModal(id) {
    return '<div class="zf-modal-overlay" id="' + id + '-modal" style="display:none;" onclick="if(event.target===this) caNewZfCloseModal(\'' + id + '\')">' +
      '<div class="zf-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="' + id + '-modal-title">' +
        '<div class="zf-modal-header">' +
          '<div class="zf-modal-header-left">' +
            '<span class="zf-modal-logo-badge">ZF+</span>' +
            '<div>' +
              '<div class="zf-modal-title" id="' + id + '-modal-title">zipForm&reg; Plus &mdash; Template &amp; Fast Fill</div>' +
              '<div class="zf-modal-subtitle">1634 Benedict Canyon Dr, Beverly Hills &middot; C.A.R. Form RPA (Rev. 12/25)</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="zf-modal-close-btn" onclick="caNewZfCloseModal(\'' + id + '\')" aria-label="Close dialog">&times;</button>' +
        '</div>' +
        '<div class="zf-modal-tabs">' +
          '<button type="button" class="zf-modal-tab active" id="' + id + '-tab-btn-template" onclick="caNewZfSwitchModalTab(\'' + id + '\', \'template\')">&#128203; 1. Apply Office Template</button>' +
          '<button type="button" class="zf-modal-tab" id="' + id + '-tab-btn-fastfill" onclick="caNewZfSwitchModalTab(\'' + id + '\', \'fastfill\')">&#9889; 2. Fast Fill</button>' +
        '</div>' +
        '<div class="zf-modal-body">' +
          '<div id="' + id + '-tab-content-template">' +
            '<div style="font-size:13px;color:#475569;margin-bottom:14px;">Apply The Agency&rsquo;s buyer offer template. It fills the brokerage and agent details and the terms Ben sent into the C.A.R. RPA.</div>' +
            '<div class="zf-template-card">' +
              '<div class="zf-template-card-header">' +
                '<div class="zf-template-title-wrap"><div class="zf-template-radio"></div><div class="zf-template-title">The Agency &mdash; Buyer Offer Package (RPA 12/25)</div></div>' +
                '<span class="zf-template-badge">Office Template &middot; Active</span>' +
              '</div>' +
              '<div class="zf-template-desc">Buyer&rsquo;s brokerage The Agency (DRE #01904054) and agent Ben Belack (DRE #01900787). Seller&rsquo;s brokerage Carolwood Estates (DRE #01013548), agents Jonathan Adams / Peter Padden (DRE #02051051).</div>' +
              '<div class="zf-template-features-grid">' +
                '<div class="zf-template-feature-item"><span class="chk">&#10003;</span> Buyers: Nilanthi Melony &amp; Senaka Mahaarachchi</div>' +
                '<div class="zf-template-feature-item"><span class="chk">&#10003;</span> $3,695,000 &middot; 3% deposit &middot; 80% conventional loan</div>' +
                '<div class="zf-template-feature-item"><span class="chk">&#10003;</span> Contingencies 21 / 14 / 12 / 7 / 7 days</div>' +
                '<div class="zf-template-feature-item"><span class="chk">&#10003;</span> Seller pays Buyer&rsquo;s Broker 2.5%</div>' +
              '</div>' +
            '</div>' +
            '<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 14px;font-size:12.5px;color:#92400e;display:flex;gap:8px;align-items:flex-start;">' +
              '<span style="font-size:15px;line-height:1;">&#9888;</span><div><strong>TC Notice:</strong> A template is a starting point. Check every field against Ben&rsquo;s email before the offer goes out.</div>' +
            '</div>' +
          '</div>' +
          '<div id="' + id + '-tab-content-fastfill" style="display:none;">' +
            '<div style="font-size:13px;color:#475569;margin-bottom:14px;">Review the data before it cascades into the RPA.</div>' +
            '<div class="zf-fastfill-grid">' +
              ZF_FF.map(function (f) {
                var target = f[3].split('-');
                var field = ZF_SECTIONS[+target[0]].fields[+target[1]];
                return '<div class="zf-fastfill-field' + (f[0] === 'address' ? ' full' : '') + '">' +
                  '<label class="zf-fastfill-label">' + f[1] + '</label>' +
                  '<input ' + tcCaseFieldAttrs(field) + ' data-tc-store="ff_val_" aria-label="' + esc(f[1]) + '" class="zf-fastfill-input" id="' + id + '-ff-' + f[0] + '" value="' + esc(tcCaseFieldValue(field, run()['ff_val_' + id + '-ff-' + f[0]] !== undefined ? run()['ff_val_' + id + '-ff-' + f[0]] : f[2])) + '">' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="zf-modal-footer">' +
          '<div class="zf-modal-footer-left"><button type="button" class="zf-modal-btn-cancel" onclick="caNewZfCloseModal(\'' + id + '\')">Cancel</button></div>' +
          '<div class="zf-modal-footer-right">' +
            '<button type="button" class="zf-modal-btn-apply" id="' + id + '-btn-apply-action" onclick="caNewZfApplyFromModal(\'' + id + '\')"><span>&#9889; Apply Template &amp; Cascade to RPA</span> &rarr;</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function zipformsApp(id, sections, onSubmit) {
    ZF_APPS[id] = { sections: sections, onSubmit: onSubmit };
    var st = run();
    var isSubmitted = !!st['zf_submitted_' + id];
    var lpDone = !!st['zf_lp_' + id];

    function F(secIdx, fIdx, w) {
      var f = sections[secIdx].fields[fIdx];
      var fieldInputId = id + '-' + secIdx + '-' + fIdx;
      var val = tcCaseFieldValue(f, f.kind === 'date' ? toDate(st['zf_val_' + fieldInputId]) : st['zf_val_' + fieldInputId]);
      var okNow = val ? f.validate(val) : false;
      var style = w ? ' style="width:' + (f.kind === 'date' ? Math.max(w, 160) : w) + 'px;"' : '';
      var out = '<span class="zf-inline-wrap' + (okNow ? ' is-valid' : '') + '" id="' + fieldInputId + '-wrap">';
      if (f.type === 'select') {
        out += '<select class="zf-inline-select" id="' + fieldInputId + '"' + style + ' onchange="caNewZfValidateField(\'' + id + '\',' + secIdx + ',' + fIdx + ')">';
        (f.options || []).forEach(function (opt) {
          out += '<option value="' + esc(opt[0]) + '"' + (val === opt[0] ? ' selected' : '') + '>' + esc(opt[1]) + '</option>';
        });
        out += '</select>';
      } else {
        out += '<input ' + tcCaseFieldAttrs(f) + ' data-tc-store="zf_val_" aria-label="' + esc(f.label) + '" class="zf-inline-input" id="' + fieldInputId + '"' + style + ' value="' + esc(val) + '" placeholder="' + esc(f.ph || '') + '" onchange="caNewZfValidateField(\'' + id + '\',' + secIdx + ',' + fIdx + ')" onblur="caNewZfValidateField(\'' + id + '\',' + secIdx + ',' + fIdx + ')">';
      }
      return out + '<span class="zf-inline-check">&#10003;</span></span>';
    }
    function hints(secIdx) {
      return sections[secIdx].fields.map(function (f, fIdx) {
        return '<div class="wf-zf-hint" id="' + id + '-' + secIdx + '-' + fIdx + '-hint">' + esc(f.label) + ': ' + esc(f.hint) + '</div>';
      }).join('');
    }
    function clause(secIdx, num, title, body, tip) {
      return '<div class="zf-doc-section-block" id="' + id + '-sec-' + secIdx + '">' +
        '<div class="zf-clause-head"><span class="zf-clause-num">' + num + '</span><span class="zf-clause-title">' + title + '</span></div>' +
        '<div class="zf-clause-body">' + body + '</div>' +
        (tip ? '<div class="zf-clause-insight"><span class="zf-clause-insight-icon">&#128161;</span><div>' + tip + '</div></div>' : '') +
        hints(secIdx) +
      '</div>';
    }
    var cardBody = isSubmitted
      ? zfDoneCard(id)
      : '<div class="zf-apply-card-badge">ZF+</div>' +
        '<h4 class="zf-apply-card-title">C.A.R. Form RPA &mdash; Residential Purchase Agreement</h4>' +
        '<p class="zf-apply-card-prop">1634 Benedict Canyon Dr, Beverly Hills, CA 90210 &middot; Prepared Feb 1, 2026</p>' +
        '<p class="zf-apply-card-desc">Open the RPA, fill in Ben&rsquo;s terms and send the offer package for signature.</p>' +
        '<div class="zf-apply-card-actions">' +
          '<button type="button" class="zf-apply-card-btn primary" onclick="caNewZfOpenDocFullscreen(\'' + id + '\', false)">&#128203; Open RPA</button>' +
        '</div>';

    return '<div class="wf-zf-app" id="' + id + '">' +
      '<div class="wf-zf-body">' +
        zipformsLaunchPad(id, ZF_LAUNCHPAD) +
        '<div class="wf-zf-form-area" id="' + id + '-form-area"' + (lpDone ? '' : ' style="display:none"') + '>' +
          '<div class="zf-apply-card' + (isSubmitted ? ' is-completed' : '') + '" id="' + id + '-apply-card"><div class="zf-apply-card-inner">' + cardBody + '</div></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    zipformsTemplateModal(id) +
    '<div class="zf-modal-overlay zf-doc-modal-overlay" id="' + id + '-doc-modal" style="display:none;" onclick="if(event.target===this) caNewZfCloseDocFullscreen(\'' + id + '\')">' +
      '<div class="zf-doc-modal-dialog" id="' + id + '-doc-modal-body">' +
        '<div id="' + id + '-doc-full">' +
          '<div class="wf-zf-toolbar">' +
            '<div class="wf-zf-toolbar-left"><span class="wf-zf-logo">ZF</span><span class="wf-zf-title">zipForm&reg; Plus &middot; 1634 Benedict Canyon Dr &middot; Form: C.A.R. RPA</span></div>' +
            '<div class="wf-zf-toolbar-right" style="display:flex;align-items:center;gap:8px;">' +
              '<span class="wf-zf-status' + (isSubmitted ? ' done' : '') + '" id="' + id + '-status">' + (isSubmitted ? '&#10003; Sent for signature' : 'Draft &mdash; In Progress') + '</span>' +
              '<button type="button" class="zf-doc-close-btn" id="' + id + '-doc-close-btn" onclick="caNewZfCloseDocFullscreen(\'' + id + '\')" title="Close">&times;</button>' +
            '</div>' +
          '</div>' +
          '<div class="zf-doc-workspace"><main class="zf-doc-container"><div class="zf-doc-sheet">' +
            '<div class="zf-doc-header">' +
              '<div class="zf-doc-car-brand"><div class="zf-doc-car-logo"><span class="zf-doc-car-icon">C.A.R.</span><span>CALIFORNIA ASSOCIATION OF REALTORS&reg;</span></div><div class="zf-doc-form-code">FORM RPA (REV. 12/25) &middot; PAGE 1 OF 17</div></div>' +
              '<div class="zf-doc-title-box"><div class="zf-doc-title-main">CALIFORNIA RESIDENTIAL PURCHASE AGREEMENT</div><div class="zf-doc-title-sub">AND JOINT ESCROW INSTRUCTIONS</div></div>' +
              '<div class="zf-doc-meta-row"><div><strong>Date Prepared:</strong> February 1, 2026</div><div><strong>Buyer&rsquo;s Brokerage:</strong> The Agency &middot; Ben Belack</div></div>' +
            '</div>' +
            clause(0, '1', 'OFFER', 'THIS IS AN OFFER FROM ' + F(0, 0, 230) + ', ' + F(0, 1, 190) + ' (&ldquo;Buyer&rdquo;).<br><br>' +
              'THE PROPERTY to be acquired is ' + F(0, 2, 220) + ', situated in ' + F(0, 3, 140) + ' (City), ' + F(0, 4, 130) + ' (County), California, ' + F(0, 5, 80) + ' (Zip Code), ' +
              'Assessor&rsquo;s Parcel No. ' + F(0, 6, 130) + ' (&ldquo;Property&rdquo;).',
              '<strong>TC Pro-Tip (postal vs. city):</strong> The postal city and the city that has jurisdiction can differ. The RPA itself tells the buyer to investigate, and the assessor record shows which city serves the parcel.') +
            clause(1, '3', 'TERMS OF PURCHASE', 'A. Purchase Price ' + F(1, 0, 150) + '<br>' +
              'B. Close Of Escrow ' + F(1, 4, 60) + ' Days after Acceptance<br>' +
              'C. Expiration of Offer: ' + F(1, 5, 120) + ' at 10:00 AM<br>' +
              'D(1). Initial Deposit Amount ' + F(1, 1, 140) + ' within 3 business days after Acceptance, by wire transfer<br>' +
              'E(1). First Loan Amount ' + F(1, 2, 150) + ', conventional, interest rate not to exceed ' + F(1, 3, 70) + ' %',
              '<strong>TC Pro-Tip (deposit):</strong> Check the math: the deposit and the loan are percentages of the price. A wrong digit here changes what the buyers have to wire.') +
            clause(2, '3L', 'CONTINGENCIES &mdash; TIME TO REMOVE', 'L(1) Loan ' + F(2, 0, 60) + ' Days after Acceptance<br>' +
              'L(2) Appraisal ' + F(2, 1, 60) + ' Days after Acceptance<br>' +
              'L(3) Investigation of Property ' + F(2, 2, 60) + ' Days after Acceptance<br>' +
              'L(5) Review of Seller Documents ' + F(2, 3, 60) + ' Days after Acceptance, or 5 Days after Delivery, whichever is later<br>' +
              'L(6) Preliminary (&ldquo;Title&rdquo;) Report ' + F(2, 4, 60) + ' Days after Acceptance, or 5 Days after Delivery, whichever is later',
              '<strong>TC Pro-Tip (shortened periods):</strong> The RPA default is 17 days. Ben wrote shorter periods to make the offer stronger, which also means a tighter calendar for you.') +
            clause(3, '3G/3Q', 'COMPENSATION &amp; ALLOCATION OF COSTS', 'G(3) Seller Payment to Compensate Buyer&rsquo;s Broker: Seller agrees to pay Buyer&rsquo;s Broker, out of transaction proceeds, ' + F(3, 0, 70) + ' % of the final purchase price.<br><br>' +
              'Escrow Holder: ' + F(3, 1, 170) + ' &middot; Title Company: Seller&rsquo;s choice<br>' +
              'Home warranty: ' + F(3, 2, 250) + '<br>' +
              'Natural Hazard Zone Disclosure report paid by: ' + F(3, 3, 110),
              '<strong>TC Pro-Tip (buyer broker compensation):</strong> Since 2024 the offer of compensation cannot appear on the MLS, but the buyer can still ask the seller to pay it in the offer. The buyer representation agreement sets what the buyer owes; anything the seller pays is credited against it.') +
            '<div class="zf-doc-section-block" id="' + id + '-sec-sign">' +
              '<div class="zf-clause-head"><span class="zf-clause-num">32</span><span class="zf-clause-title">BUYER SIGNATURES</span></div>' +
              '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;">' +
                '<div><div style="font-size:11px;color:#64748b;font-weight:700;">BUYER:</div><div style="font-family:\'Courier New\',monospace;font-size:13.5px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #94a3b8;padding:4px 0;">DocuSign &middot; pending</div><div style="font-size:10.5px;color:#64748b;margin-top:2px;">Nilanthi Melony Mahaarachchi</div></div>' +
                '<div><div style="font-size:11px;color:#64748b;font-weight:700;">BUYER:</div><div style="font-family:\'Courier New\',monospace;font-size:13.5px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #94a3b8;padding:4px 0;">DocuSign &middot; pending</div><div style="font-size:10.5px;color:#64748b;margin-top:2px;">Senaka Mahaarachchi</div></div>' +
                '<div><div style="font-size:11px;color:#64748b;font-weight:700;">BUYER&rsquo;S AGENT:</div><div style="font-family:\'Courier New\',monospace;font-size:13.5px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #94a3b8;padding:4px 0;">/s/ Ben Belack</div><div style="font-size:10.5px;color:#64748b;margin-top:2px;">The Agency &middot; DRE #01900787</div></div>' +
              '</div>' +
            '</div>' +
            '<div class="zf-doc-actionbar" id="' + id + '-submit-area">' +
              '<button type="button" class="wf-zf-autofill-btn tc-assist" onclick="caNewZfAutoFill(\'' + id + '\')">&#9889; Auto-fill from Ben&rsquo;s terms</button>' +
              '<button type="button" class="wf-zf-submit-btn" id="' + id + '-submit-btn" ' + (isSubmitted ? 'disabled style="display:none;"' : 'disabled') + ' onclick="caNewZfSubmit(\'' + id + '\')">Send to Ben &amp; Buyers via DocuSign &rarr;</button>' +
            '</div>' +
            '<div id="' + id + '-progress-wrap" style="display:none;margin-top:16px;">' +
              '<div style="font-size:13px;font-weight:700;color:var(--v-blue);margin-bottom:6px;">Sending the offer package to Ben and the buyers through DocuSign&hellip;</div>' +
              '<div class="wf-zf-docusign-bar"><div class="wf-zf-docusign-fill"></div></div>' +
            '</div>' +
            '<div id="' + id + '-success-banner" class="wf-zf-success-banner" style="display:' + (isSubmitted ? 'block' : 'none') + ';margin-top:16px;">&#10003; Offer package sent for review and signature.</div>' +
          '</div></main></div>' +
        '</div>' +
      '</div>' +
    '</div>';
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

  /* Zipforms modals are moved to <body> when opened. A step re-render
     creates a fresh copy inside the workspace, so keep that one and drop
     the stale copy; otherwise getElementById keeps hitting the old,
     hidden fields (Auto-fill and validation filled the wrong form). */
  function zfMountModal(domId) {
    var all = document.querySelectorAll('[id="' + domId + '"]');
    if (!all.length) return null;
    var fresh = null;
    all.forEach(function (el) { if (el.parentElement !== document.body) fresh = el; });
    var keep = fresh || all[all.length - 1];
    all.forEach(function (el) { if (el !== keep && el.parentNode) el.parentNode.removeChild(el); });
    if (keep.parentElement !== document.body) document.body.appendChild(keep);
    return keep;
  }

  window.caNewZfOpenModal = function (id, tab) {
    var modal = zfMountModal(id + '-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    caNewZfSwitchModalTab(id, tab || 'template');
    ZF_FF.forEach(function (f) {
      var target = document.getElementById(id + '-' + f[3]);
      var ff = document.getElementById(id + '-ff-' + f[0]);
      if (target && ff && target.value) ff.value = target.value;
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
    var ffTab = document.getElementById(id + '-tab-content-fastfill');
    if (ffTab && ffTab.style.display !== 'none') {
      zfMountModal(id + '-doc-modal');
      ZF_FF.forEach(function (f) {
        var ff = document.getElementById(id + '-ff-' + f[0]);
        var target = document.getElementById(id + '-' + f[3]);
        if (ff && target) target.value = ff.value;
      });
    }
    caNewZfCloseModal(id);
    run()['zf_applied_' + id] = true;
    caNewZfOpenDocFullscreen(id, true);
  };

  window.caNewZfOpenDocFullscreen = function (id, autoFill) {
    var modal = zfMountModal(id + '-doc-modal');
    if (!modal) return;
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
            el.value = tcCaseFieldValue(f, f.auto);
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
        statusEl.innerHTML = '&#10003; Sent for signature';
      }
      var st = run();
      if (!st['zf_graded_' + id]) { st['zf_graded_' + id] = 1; record(true); }
      st['zf_submitted_' + id] = true;
      st['zf_applied_' + id] = true;
      caNewZfCloseDocFullscreen(id);
      var applyCard = document.getElementById(id + '-apply-card');
      if (applyCard) {
        applyCard.className = 'zf-apply-card is-completed';
        applyCard.innerHTML = '<div class="zf-apply-card-inner">' + zfDoneCard(id) + '</div>';
      }
      var app = ZF_APPS[id];
      if (app && typeof app.onSubmit === 'function') app.onSubmit();
      if (typeof window.caNewRefresh === 'function') window.caNewRefresh();
    }, 1500);
  };

  /* ---------- SkySlope App Component (Step 2: Interactive Drag & Drop) ---------- */
  var SS_APPS = {};
  var SS_STATE = {};
  window.SS_STATE = SS_STATE;
  window.caNewSsState = SS_STATE;

  var SS_SLOT_DOC_MAP = {
    brbc: 'brbc', aba: 'aba', lad: 'lad', rpa: 'rpa', ad: 'ad', prbs: 'prbs',
    bia: 'bia', bhia: 'bhia', wfa: 'wfa', ta: 'ta', frr: 'frr', emd: 'emd'
  };
  function ssRequiredSlots() {
    return SS_CHECKLIST.filter(function (c) { return c.type === 'attach'; }).map(function (c) { return c.key; });
  }

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
      ? 'SkySlope &middot; Buyer Transaction: 1634 Benedict Canyon Dr'
      : 'SkySlope &middot; Create Buyer Transaction: 1634 Benedict Canyon Dr';

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
          '<span>Transaction Details</span>' +
        '</button>' +
        '<button type="button" class="wf-ss-tab' + (curStage === 1 ? ' active' : '') + (!isCreated ? ' locked' : '') + '" id="' + id + '-tab-1" onclick="caNewSsSwitchTab(\'' + id + '\', 1)"' + (!isCreated ? ' title="Create the transaction first to unlock the checklist"' : '') + '>' +
          '<span class="wf-ss-tab-num">2</span>' +
          '<span>Brokerage Compliance Checklist</span>' +
        '</button>' +
      '</div>' +
      '<div class="wf-ss-body">' +

      '<!-- STAGE 0: Listing Information (File Setup) -->' +
      '<div class="wf-ss-stage" id="' + id + '-stage-0" style="display:' + (curStage === 0 ? 'block' : 'none') + ';">' +
        '<div class="wf-ss-part">' +
          '<div class="wf-ss-part-title">1. Transaction Details</div>' +
          '<p class="wf-ss-checklist-sub">Enter the accepted contract details to open the buyer-side transaction in SkySlope.</p>' +
          '<div class="wf-ss-fields-grid">';

    listingFields.forEach(function (f, fIdx) {
      var fieldInputId = id + '-f-' + fIdx;
      var val = tcCaseFieldValue(f, f.kind === 'date' ? toDate(st['ss_val_' + fieldInputId]) : st['ss_val_' + fieldInputId]);
      html += '<div class="wf-zf-field">' +
        '<label for="' + fieldInputId + '">' + esc(f.label) + '</label>' +
        '<div class="wf-zf-input-wrap" id="' + fieldInputId + '-wrap">' +
          '<input ' + tcCaseFieldAttrs(f) + ' data-tc-store="ss_val_" id="' + fieldInputId + '" value="' + esc(val) + '" placeholder="' + esc(f.ph || '') + '" onchange="caNewSsValidateField(\'' + id + '\',' + fIdx + ')" onblur="caNewSsValidateField(\'' + id + '\',' + fIdx + ')">' +
          '<span class="wf-zf-icon">&#10003;</span>' +
        '</div>' +
        '<div class="wf-zf-hint" id="' + fieldInputId + '-hint">' + esc(f.hint) + '</div>' +
      '</div>';
    });

    html += '</div></div>' +
        '<div id="' + id + '-info-err" class="wf-slide-err" style="display:none;margin-top:16px;"></div>' +
        '<div class="wf-ss-submit-area" style="margin-top:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">' +
          '<button type="button" class="wf-ss-autofill-btn tc-assist" onclick="caNewSsAutoFillFields(\'' + id + '\')">&#9889; Auto-fill Details</button>' +
          '<button type="button" class="wf-nav-btn primary" id="' + id + '-create-btn" onclick="caNewSsCreateListing(\'' + id + '\')">' +
            (isCreated ? 'Update &amp; Open Checklist &rarr;' : 'Create Transaction &amp; Open Checklist &rarr;') +
          '</button>' +
        '</div>' +
      '</div>' +

      '<!-- STAGE 1: Brokerage Compliance Checklist -->' +
      '<div class="wf-ss-stage" id="' + id + '-stage-1" style="display:' + (curStage === 1 ? 'block' : 'none') + ';">' +
        '<div class="wf-ss-part">' +
          '<div class="wf-ss-part-title">2. Brokerage Compliance Checklist &mdash; The Agency</div>' +
          '<p class="wf-ss-checklist-sub">Drag each signed document from the sidebar <strong>Documents</strong> panel into its checklist slot. Rows marked Pending are uploaded later in the file.</p>' +
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
          '<button type="button" class="wf-deck-prev wf-ss-prev-btn" onclick="caNewSsSwitchTab(\'' + id + '\', 0)">&larr; Review Details</button>' +
          '<button type="button" class="wf-ss-autofill-btn tc-assist" onclick="caNewSsAutoFillChecklist(\'' + id + '\')">&#9889; Auto-fill Checklist</button>' +
        '</div>' +
        '<button type="button" class="wf-nav-btn primary" id="' + id + '-submit-btn" ' + (isSubmitted ? 'disabled style="display:none;"' : '') + ' onclick="caNewSsSubmit(\'' + id + '\')">Submit File for Compliance Review &rarr;</button>' +
      '</div>' +
      '<div id="' + id + '-success-banner" class="wf-ss-success-banner" style="display:' + (isSubmitted ? 'block' : 'none') + ';margin-top:16px;">' +
        '&#10003; File submitted to The Agency compliance. Pending items are uploaded as the transaction moves forward.' +
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

  window.caNewSsToast = function (msg, isErr) {
    var toast = document.getElementById('bc-ss-toast');
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
        el.value = tcCaseFieldValue(f, f.auto);
        caNewSsValidateField(id, fIdx);
      }
    });
    var errEl = document.getElementById(id + '-info-err');
    if (errEl) errEl.style.display = 'none';
  };

  window.caNewSsAutoFillChecklist = function (id) {
    var requiredSlots = ssRequiredSlots();
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
        errEl.innerHTML = '<strong>&#9888; Transaction not created yet:</strong> Complete the details below and click &ldquo;Create Transaction &amp; Open Checklist&rdquo;.';
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
          errEl.innerHTML = '<strong>&#9888; Incomplete details:</strong> Complete every field correctly before creating the transaction.';
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
        titleEl.innerHTML = 'SkySlope &middot; Buyer Transaction: 1634 Benedict Canyon Dr';
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
        caNewSsToast('✓ Transaction created for 1634 Benedict Canyon Dr. Opening the compliance checklist...', false);
      }
    };

    if (isSilent || SS_STATE[id + '_created']) {
      finishCreation();
    } else {
      if (createBtn) {
        createBtn.disabled = true;
        createBtn.innerHTML = '<span class="wf-ss-uploading-dot"></span> Creating Transaction...';
      }
      caNewSsToast('⏳ Creating the SkySlope transaction...', false);
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
          infoErr.innerHTML = '<strong>&#9888; Incomplete details:</strong> Complete every field correctly.';
          infoErr.style.display = 'block';
          if (typeof infoErr.scrollIntoView === 'function') {
            infoErr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
        return;
      }
    }

    // 2. Validate all 9 listing package documents are attached
    var requiredSlots = ssRequiredSlots();
    var missingDocs = [];
    requiredSlots.forEach(function (slot) {
      if (!SS_STATE[id + '_' + slot]) {
        var item = SS_CHECKLIST.find(function (c) { return c.key === slot; });
        missingDocs.push(item ? item.title : slot.toUpperCase());
      }
    });
    if (missingDocs.length > 0) {
      if (errEl) {
        errEl.innerHTML = '<strong>&#9888; Missing Documents (' + missingDocs.length + '):</strong> The following documents must be attached from the sidebar Documents panel before submitting:<br>' +
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

    if (!st['ss_graded_' + id]) { st['ss_graded_' + id] = 1; record(true); }
    if (typeof window.caNewRefresh === 'function') window.caNewRefresh();
  };

  /* ════════════════ Sub-step engine (all 8 steps) ════════════════
     Each step is a deck of sub-steps. A sub-step has a label, a body
     and an ok() gate; Next checks the gate (running check() first for
     forms) and explains what is missing instead of moving on. */
  var SUBS = {};
  function subCur(n) { var v = window['_caNewSlide' + n]; return typeof v === 'number' ? v : 0; }
  function subOk(n, i) { var s = (SUBS[n] || [])[i]; return !s || !s.ok || !!s.ok(); }
  function subPillState(n, i, cur) {
    if (i === cur) return 'active';
    for (var j = 0; j < i; j++) { if (!subOk(n, j)) return 'locked'; }
    return subOk(n, i) ? 'done' : 'upcoming';
  }
  function deck(n, subs, contLabel) {
    SUBS[n] = subs;
    var cur = Math.min(subCur(n), subs.length - 1);
    var h = '<div class="wf-substepper" id="bc-s' + n + '-tracker">';
    subs.forEach(function (s, i) {
      h += '<button type="button" class="wf-substep-pill wf-pt-item ' + subPillState(n, i, cur) + '" id="bc-s' + n + '-pill-' + i + '" onclick="caNewGoSub(' + n + ',' + i + ')">' +
        '<span class="substep-num">' + (i + 1) + '</span><span>' + s.label + '</span></button>';
    });
    h += '</div>';
    subs.forEach(function (s, i) {
      var last = i === subs.length - 1;
      /* a part that holds an app has its own action button: Next waits until the app is done */
      var nextAttr = ' id="bc-s' + n + '-p' + i + '-next"' + (s.app && !subOk(n, i) ? ' style="display:none"' : '');
      h += '<div class="wf-phase" id="bc-s' + n + '-p' + i + '" style="display:' + (i === cur ? 'block' : 'none') + '">' +
        s.body +
        '<div id="bc-s' + n + '-p' + i + '-err" class="wf-slide-err" style="display:none;margin-top:14px;"></div>' +
        '<div class="wf-deck-nav">' +
          (i > 0 ? '<button type="button" class="wf-deck-prev" onclick="caNewGoSub(' + n + ',' + (i - 1) + ')">&larr; ' + subs[i - 1].label + '</button>' : '<span></span>') +
          (last
            ? (contLabel ? '<button type="button" class="wf-nav-btn primary"' + nextAttr + ' onclick="caNewFinishStep(' + n + ')">' + contLabel + ' &rarr;</button>' : '')
            : '<button type="button" class="wf-deck-next"' + nextAttr + ' onclick="caNewGoSub(' + n + ',' + (i + 1) + ')">Next: ' + subs[i + 1].label + ' &rarr;</button>') +
        '</div>' +
      '</div>';
    });
    return h;
  }
  function subShowErr(n, i, msg) {
    var el = document.getElementById('bc-s' + n + '-p' + i + '-err');
    if (!el) return;
    el.innerHTML = '<strong>&#9888; Not yet:</strong> ' + msg;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function subShow(n, idx) {
    window['_caNewSlide' + n] = idx;
    (SUBS[n] || []).forEach(function (s, i) {
      var el = document.getElementById('bc-s' + n + '-p' + i);
      if (!el) return;
      if (i === idx) { el.style.display = 'block'; el.classList.add('wf-phase-enter'); }
      else { el.style.display = 'none'; el.classList.remove('wf-phase-enter'); }
      var err = document.getElementById('bc-s' + n + '-p' + i + '-err');
      if (err) err.style.display = 'none';
    });
    window.caNewRefresh();
    var top = document.querySelector('#wf-body .tc-step-header-card');
    if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  /* Next checks the forms and pickers of the part on screen */
  function subAutoCheck(n, i) {
    var ph = document.getElementById('bc-s' + n + '-p' + i);
    if (!ph) return;
    Object.keys(FORMS).forEach(function (id) {
      var first = document.getElementById(id + '-0');
      if (first && ph.contains(first) && first.offsetParent) caNewCheck(id);
    });
    Object.keys(PICKS).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && ph.contains(el) && el.offsetParent && !run()['pd_' + id]) caNewPickCheck(id);
    });
  }
  window.caNewGoSub = function (n, idx) {
    var subs = SUBS[n] || [];
    var cur = subCur(n);
    if (idx > cur) {
      for (var i = 0; i < idx; i++) {
        var s = subs[i];
        if (i === cur) subAutoCheck(n, i);
        if (!subOk(n, i)) {
          if (i !== cur) subShow(n, i);
          subShowErr(n, i, (typeof s.err === 'function' ? s.err() : s.err) || 'Finish this part first.');
          window.caNewRefresh();
          return;
        }
      }
    }
    subShow(n, idx);
  };
  window.caNewFinishStep = function (n) {
    var subs = SUBS[n] || [];
    var cur = subCur(n);
    for (var i = 0; i < subs.length; i++) {
      if (i === cur) subAutoCheck(n, i);
      if (!subOk(n, i)) {
        if (i !== cur) subShow(n, i);
        subShowErr(n, i, (typeof subs[i].err === 'function' ? subs[i].err() : subs[i].err) || 'Finish this part first.');
        return;
      }
    }
    wfNext();
  };
  /* Pills and conditional blocks follow the case state */
  var BC_IF = {};
  window.caNewRefresh = function () {
    var n = (typeof wfStep !== 'undefined') ? wfStep + 1 : 1;
    var subs = SUBS[n] || [];
    var cur = subCur(n);
    subs.forEach(function (s, i) {
      var pill = document.getElementById('bc-s' + n + '-pill-' + i);
      if (pill) pill.className = 'wf-substep-pill wf-pt-item ' + subPillState(n, i, cur);
      var next = document.getElementById('bc-s' + n + '-p' + i + '-next');
      if (next && s.app) next.style.display = subOk(n, i) ? '' : 'none';
    });
    document.querySelectorAll('#wf-body [data-bc-if]').forEach(function (el) {
      var fn = BC_IF[el.getAttribute('data-bc-if')];
      var on = typeof fn === 'function' && !!fn();
      var was = el.style.display !== 'none';
      el.style.display = on ? (el.getAttribute('data-bc-display') || 'block') : 'none';
      if (on && !was) el.classList.add('wf-phase-enter');
    });
    if (typeof _wfSaveState === 'function') _wfSaveState();
  };
  function when(key, fn, html, display) {
    BC_IF[key] = fn;
    return '<div data-bc-if="' + key + '"' + (display ? ' data-bc-display="' + display + '"' : '') + ' style="display:' + (fn() ? (display || 'block') : 'none') + '">' + html + '</div>';
  }

  /* ── state checks ── */
  function readOk(id) { var e = tcMailFind(id); return !!e && tcMailIsVisible(e) && tcMailIsRead(id); }
  function replyOk(key, id) { return !!run()['c_' + key] && readOk(id); }
  function formOk(id) { var r = run()['r_' + id]; return !!(r && r.length && r.indexOf(false) === -1); }
  function pickOk(id) {
    var st = run(), p = PICKS[id];
    if (!p || !st['pd_' + id]) return false;
    var on = st['p_' + id] || [];
    return p.items.every(function (it, i) { return (on.indexOf(i) > -1) === it.ok; });
  }
  function decOk(id) { return run()['d_' + id] !== undefined; }
  function replyErr(who) { return 'Write your email in Mail, send it, and open ' + who + '&rsquo;s reply.'; }

  /* ── email card helpers ── */
  function caNewMailCard(o) {
    return '<div class="wf-email-inbox-wrap">' +
      '<div class="wf-email">' +
        '<div class="wf-email-header">' +
          '<div class="wf-email-subject-bar"><h3 class="wf-email-subject">' + esc(o.subject) + '</h3></div>' +
          '<div class="wf-email-sender-profile">' +
            '<div class="wf-email-avatar-wrap"><div class="wf-email-avatar"' + (o.avatarBg ? ' style="background:' + o.avatarBg + ';"' : '') + '>' + o.initials + '</div></div>' +
            '<div class="wf-email-sender-info">' +
              '<div class="wf-email-sender-line">' +
                '<span class="wf-email-sender-name">' + o.from + '</span>' +
                '<span class="wf-email-sender-addr">&lt;' + o.addr + '&gt;</span>' +
                (o.badge ? '<span class="wf-badge-broker">' + o.badge + '</span>' : '') +
              '</div>' +
              '<div class="wf-email-recipient-line"><span>' + o.to + '</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="wf-email-body">' + o.body + '</div>' +
      '</div>' +
    '</div>';
  }
  function caNewMailAttach(label, docs) {
    return '<div class="tc-mail-attach">' +
      '<div class="tc-mail-attach-label">' + label + '</div>' +
      docs.map(function (d) {
        return '<button type="button" class="tc-mail-attach-chip" onclick="caNewOpen(\'' + d[0] + '\')">' + ICON_DOC + '<span>' + d[1] + '</span></button>';
      }).join('') +
    '</div>';
  }
  function att(keys) { return keys.map(function (k) { return [k, DOCS[k] ? DOCS[k][1] : k]; }); }
  function mcard(id, from, body, o) {
    o = o || {};
    return function () {
      var c = CONTACTS[from] || {};
      return caNewMailCard({
        subject: tcMailSubject(tcMailFind(id)),
        from: o.fromName || c.name, addr: o.addr || c.email, initials: c.initials,
        badge: o.badge === undefined ? c.brokerage : o.badge, avatarBg: c.color,
        to: o.to || ('To: <strong>Maria Rodriguez</strong> &lt;' + TC_ADDR + '&gt;'),
        body: body + (o.attach ? caNewMailAttach('Attachments', att(o.attach)) : '')
      });
    };
  }
  function inbox(id, from, body, o) { return mailSlot(id, mcard(id, from, body, o), { receipt: true }); }
  function chat(id, q, choices, fb, who) {
    var c = CONTACTS[who] || {};
    return decision(id, q, choices, fb, { mode: 'chat', sender: c.label || c.name, initials: c.initials, role: c.role + ' · ' + CASE_ADDR });
  }
  function banner(key, fn, text) {
    return when(key, fn, '<div class="wf-reply-footer-banner" style="display:flex;margin-top:14px;"><span class="wf-reply-footer-icon">&#10004;</span><span>' + text + '</span></div>');
  }
  function callout(title, text) {
    return '<div class="lc-callout-warn" style="margin:16px 0;padding:14px 18px;border-radius:10px;background:#fff7ea;border-left:4px solid #f59e0b;color:#92400e;"><strong>' + title + '</strong> ' + text + '</div>';
  }
  /* Reply scenario: a task card that opens a template reply in Mail, plus the answer it gets */
  function replyPick(o) {
    compose({ key: o.key, prompt: o.prompt, to: o.to, cc: o.cc || '', subj: o.subj, inst: o.inst, rules: o.rules, choices: o.choices, ans: o.ans });
    return mailTask(o.key, o.title, o.sub || 'Reply in Mail. Pick the template that fits your role, complete the part in [brackets] and send it.', o.sentId) +
      inbox(o.replyId, o.replyFrom, o.replyBody, o.replyOpts);
  }

  function sideContacts(n) {
    var byStep = { 1: ['ben', 'melony', 'senaka', 'ryan'], 2: ['jonathan'], 3: ['alicia', 'david'], 7: ['ingrid'] };
    var out = [];
    for (var i = 1; i <= n; i++) out = out.concat(byStep[i] || []);
    return out;
  }

  /* ════════════════ Step 1 · New buyer client intake ════════════════ */
  function caNewStep0() {
    var intro = inbox('e1_ben_intro', 'ben',
      '<p>Hi Maria,</p>' +
      '<p>Good news: <strong>Nilanthi Melony Mahaarachchi</strong> and <strong>Senaka Mahaarachchi</strong> signed our <strong>exclusive Buyer Representation and Broker Compensation Agreement</strong> through DocuSign this afternoon. She goes by Melony.</p>' +
      '<p>They are looking for a single-family home in <strong>Los Angeles County</strong>, the canyons above Beverly Hills if we can find the right one, up to about $3.8M. They are financing with <strong>Chase</strong> at around 80%.</p>' +
      '<p>Can you open their buyer file today? Please review the agreement before it goes into SkySlope and send them the Disclosure Regarding Real Estate Agency Relationship. We will probably write an offer within a couple of weeks.</p>' +
      BEN_SIG, { attach: ['brbc'] });

    var brbcForm = form('bc-brbc', 'Review the Buyer Representation Agreement', 'Open the signed agreement and confirm the terms that go into the buyer file.', [
      { label: 'Broker (firm)', ans: ['the agency'], show: 'The Agency', ph: 'Brokerage name' },
      { label: 'Representation begins', kind: 'date', ans: '2026-01-20', show: '01/20/2026', ph: 'mm/dd/yyyy' },
      { label: 'Representation ends', kind: 'date', ans: '2026-02-19', show: '02/19/2026', ph: 'mm/dd/yyyy' },
      { label: 'Type of representation', kind: 'select', ans: 'exclusive', show: 'Exclusive (checked and initialed)', options: [['exclusive', 'Exclusive'], ['nonexclusive', 'Non-exclusive']] },
      { label: 'Location covered', ans: ['los angeles'], show: 'Los Angeles County', ph: 'County or city' },
      { label: 'Broker compensation', ans: ['2.5', '2.500'], show: '2.500% of the acquisition price', ph: '% of price' },
      { label: 'If the seller pays the broker', kind: 'select', ans: 'credit', show: 'Credited against what the buyer owes (BRBC 2G)', options: [['credit', 'It is credited against what the buyers owe'], ['extra', 'The broker is paid by both'], ['refund', 'The buyers get a refund at signing']] },
      { label: 'Longest term for individual buyers', kind: 'select', ans: '90', show: '90 days from the start (BRBC 2A(2))', options: [['30', '30 days'], ['90', '90 days'], ['180', '180 days'], ['none', 'No limit']] }
    ]);

    var intakePick = picker('bc-p-intake', 'What goes into the intake file today?',
      'No property is under contract yet. Pick only the documents that belong in the buyer file at intake.', [
        { t: 'Buyer Representation and Broker Compensation Agreement', sub: 'Signed Jan 20', ok: true },
        { t: 'Disclosure Regarding Real Estate Agency Relationship', sub: 'C.A.R. AD', ok: true },
        { t: 'Affiliated Business Arrangement Disclosure', sub: 'The Agency', ok: false },
        { t: 'Local Area Disclosures', sub: 'The Agency', ok: false },
        { t: 'Residential Purchase Agreement (RPA)', sub: 'C.A.R. RPA', ok: false },
        { t: 'Transfer Disclosure Statement (TDS)', sub: 'Seller form', ok: false },
        { t: 'Preliminary Title Report', sub: 'Title company', ok: false },
        { t: 'Residential Listing Agreement (RLA)', sub: 'Listing side', ok: false },
        { t: 'Natural Hazard Disclosure', sub: 'Property report', ok: false }
      ], 'At intake the file holds the buyer representation agreement and the Disclosure Regarding Real Estate Agency Relationship (C.A.R. AD). The PRBS and the buyer advisories go out with the first offer. The Affiliated Business Arrangement and Local Area Disclosures are brokerage disclosures but do not go into the buyer file at intake. Property documents (RPA, TDS, NHD, prelim) only exist once there is a property.');

    var missingPick = picker('bc-p-missing', 'What do you still need from Ben?',
      'You will write the first offer soon. Pick what is missing from the file.', [
        { t: 'Buyers&rsquo; emails and phones', sub: 'For DocuSign and escrow', ok: true },
        { t: 'Full legal names and how they will take title', sub: 'Vesting', ok: true },
        { t: 'Lender pre-approval letter', sub: 'Ben sends it with the offer', ok: false },
        { t: 'Proof of funds for the deposit and down payment', sub: 'Ben sends it with the offer', ok: false },
        { t: 'The buyers&rsquo; Social Security numbers', sub: 'By email', ok: false },
        { t: 'The seller&rsquo;s loan payoff', sub: 'Seller side', ok: false },
        { t: 'The listing agent&rsquo;s commission split', sub: 'Listing side', ok: false },
        { t: 'HOA documents', sub: 'No property yet', ok: false }
      ], 'Contacts and the full legal names and vesting are what you need for the buyer file. The pre-approval letter and proof of funds go with the offer package: Ben will send those when it is time. Never ask for Social Security numbers by email: escrow collects them securely on the Statement of Information.');

    var infoTask = mailTask('bc-intake-info', 'Email Ben',
      'Ask Ben for the items you picked. This is internal: write to Ben only.', 'e1_sent_info');
    compose({
      key: 'bc-intake-info', prompt: 'Ask Ben for the missing buyer file items',
      to: 'Ben Belack <ben.belack@theagencyre.com>', subj: 'Mahaarachchi buyer file: a few items I need',
      inst: 'Ask for the buyers&rsquo; contact details and their full legal names and vesting. Keep it short and internal.',
      rules: {
        need: [['ben', 'to', 'This question is for Ben, the buyers&rsquo; agent.']],
        never: [['melony', 'Keep the buyers off this one: it is an internal checklist between you and Ben.'], ['senaka', 'Keep the buyers off this one: it is an internal checklist between you and Ben.']],
        subj: ['mahaarachchi', 'buyer file', 'buyer'], subjMsg: 'There is no property yet, so name the clients (Mahaarachchi) in the subject.'
      },
      ans: "Hi Ben,\n\nThanks, I opened the Mahaarachchi buyer file and reviewed the Buyer Representation and Broker Compensation Agreement (exclusive, 01/20/2026 to 02/19/2026, Los Angeles County, 2.5%). I sent the Disclosure Regarding Real Estate Agency Relationship for signature.\n\nFor the file I need:\n1. Melony's and Senaka's emails and cell numbers for DocuSign and escrow\n2. Their full legal names and how they plan to take title\n\nThanks,\nMaria Rodriguez\nTransaction Coordinator, The Agency"
    });
    var infoReply = inbox('e1_ben_info', 'ben',
      '<p>Here you go:</p>' +
      '<ul>' +
        '<li><strong>Melony</strong> (Nilanthi Melony Mahaarachchi): melony.mahaarachchi@email.com &middot; (818) 555-0142</li>' +
        '<li><strong>Senaka Mahaarachchi</strong>: senaka.mahaarachchi@email.com &middot; (818) 555-0187</li>' +
        '<li><strong>Vesting:</strong> not decided yet. They are talking to their CPA. Use the full legal names on everything; escrow will get the vesting before closing.</li>' +
      '</ul>' +
      '<p>I&rsquo;ll send you the Chase pre-approval and proof of funds when we are ready to write the offer.</p>' +
      '<p>Thanks for jumping on this so fast.</p>' + BEN_SIG);

    var summary = card('Buyer file ready', 'Everything you need for the first offer.',
      timeline([
        ['Jan 20, 2026', 'Buyer Representation and Broker Compensation Agreement signed: exclusive, The Agency, Los Angeles County, 2.5%, ends Feb 19, 2026.'],
        ['Jan 20, 2026', 'Disclosure Regarding Real Estate Agency Relationship sent for signature.'],
        ['Jan 20, 2026', 'Contacts and full legal names collected. Vesting still open: escrow needs it before closing. Ben will send the pre-approval and proof of funds with the offer.']
      ]) + callout('Watch the representation end date.', 'The representation period ends Feb 19, 2026. If the buyers are not in contract by then, Ben needs an extension signed.'));

    var main = deck(1, [
      { label: 'Ben&rsquo;s Email', body: intro, ok: function () { return readOk('e1_ben_intro'); }, err: 'Open Ben&rsquo;s email in Mail first.' },
      { label: 'Agreement Review', body: brbcForm, ok: function () { return formOk('bc-brbc'); }, check: function () { caNewCheck('bc-brbc'); }, err: 'Some terms do not match the signed agreement. Fix the red rows.' },
      { label: 'Intake File', body: intakePick, ok: function () { return pickOk('bc-p-intake'); }, err: 'Pick the intake documents. If a pick is wrong, use Try again.' },
      { label: 'Missing Info', body: missingPick, ok: function () { return pickOk('bc-p-missing'); }, err: 'Pick what is missing, then press Next. If a pick is wrong, use Try again.' },
      { label: 'Email Ben', body: infoTask + infoReply, ok: function () { return replyOk('bc-intake-info', 'e1_ben_info'); }, err: replyErr('Ben') },
      { label: 'File Summary', body: summary }
    ], 'Continue to Step 2: Writing the Offer');

    return step(1, STEP_TITLES[1], 'Tue, Jan 20, 2026',
      'Ben Belack has new buyer clients. Open their file, review the buyer representation agreement and collect what you will need for the first offer.',
      main, side([['Stage', 'Buyer representation'], ['Buyer Rep. Agreement', 'Exclusive · ends Feb 19, 2026']], ['brbc', 'ad'], sideContacts(1)), true);
  }

  /* ── Los Angeles County assessor parcel search ── */
  var APN_PARCELS = [
    { addr: '1634 BENEDICT CANYON DR, LOS ANGELES CA 90210', apn: '4356-007-010', owner: 'CHERINGAL MICHAEL TR', use: 'Single Family Residence', built: '1936', city: 'City of Los Angeles' },
    { addr: '1643 BENEDICT CANYON DR, LOS ANGELES CA 90210', apn: '4356-008-022', owner: 'ROSEN FAMILY TRUST', use: 'Single Family Residence', built: '1951', city: 'City of Los Angeles' },
    { addr: '1364 BENEDICT CANYON DR, BEVERLY HILLS CA 90210', apn: '4350-012-015', owner: 'PARK DAVID H', use: 'Single Family Residence', built: '1962', city: 'City of Beverly Hills' }
  ];
  function apnPicked() { var i = run()['apn_sel']; return i === undefined ? null : APN_PARCELS[i] || null; }
  function caNewApnResultsHtml() {
    var q = String(run()['apn_q'] || '').trim();
    if (!q) return '<div class="tc-apn-empty">Enter a street address and press Search.</div>';
    if (q.toLowerCase().indexOf('benedict') === -1) return '<div class="tc-apn-empty">No parcels found for &ldquo;' + esc(q) + '&rdquo;. Check the street name and try again.</div>';
    var sel = run()['apn_sel'];
    var h = '<div class="tc-apn-count">' + APN_PARCELS.length + ' parcels match &ldquo;' + esc(q) + '&rdquo;. Select the one for your property.</div>' +
      '<table class="tc-apn-table"><thead><tr><th>Situs address</th><th>APN</th><th>Owner of record</th><th></th></tr></thead><tbody>' +
      APN_PARCELS.map(function (p, i) {
        return '<tr class="' + (i === sel ? 'on' : '') + '"><td>' + p.addr + '</td><td class="tc-apn-num">' + p.apn + '</td><td>' + p.owner + '</td>' +
          '<td><button type="button" class="tc-apn-pick" onclick="caNewApnPick(' + i + ')">' + (i === sel ? 'Selected' : 'Select') + '</button></td></tr>';
      }).join('') + '</tbody></table>';
    var p = apnPicked();
    if (p) {
      h += '<div class="tc-apn-detail"><div class="tc-apn-detail-title">Parcel record</div><dl>' +
        '<dt>APN</dt><dd class="tc-apn-num">' + p.apn + '</dd>' +
        '<dt>Situs address</dt><dd>' + p.addr + '</dd>' +
        '<dt>Owner of record</dt><dd>' + p.owner + '</dd>' +
        '<dt>Jurisdiction</dt><dd>' + p.city + '</dd>' +
        '<dt>Use</dt><dd>' + p.use + '</dd>' +
        '<dt>Year built</dt><dd>' + p.built + '</dd></dl></div>';
    }
    return h;
  }
  window.caNewApnSearch = function () {
    var inp = document.getElementById('bc-apn-q');
    run()['apn_q'] = inp ? inp.value : '';
    var out = document.getElementById('bc-apn-results');
    if (out) out.innerHTML = caNewApnResultsHtml();
  };
  window.caNewApnPick = function (i) {
    run()['apn_sel'] = i;
    var out = document.getElementById('bc-apn-results');
    if (out) out.innerHTML = caNewApnResultsHtml();
    window.caNewRefresh();
  };
  window.caNewApnAutoFill = function () {
    var addr = APN_PARCELS[0].addr.split(',')[0];
    run()['apn_q'] = addr;
    var inp = document.getElementById('bc-apn-q');
    if (inp) inp.value = addr;
    window.caNewApnPick(0);
  };
  function caNewApnLookupCard() {
    return '<div class="mh-card tc-apn-card" data-type="form">' +
      '<h4>Look up the parcel</h4>' +
      '<p class="mh-sub">Ben did not send the Assessor&rsquo;s Parcel Number. Search the county records, select the parcel that matches the exact address, and use its record for the offer.</p>' +
      '<div class="tc-apn-tool">' +
        '<div class="tc-apn-bar"><span class="tc-apn-seal">LA</span><span><strong>Los Angeles County Assessor</strong> &middot; Property Search</span></div>' +
        '<div class="tc-apn-search">' +
          '<input type="text" id="bc-apn-q" placeholder="Street address, e.g. 123 Main St" value="' + esc(run()['apn_q'] || '') + '" onkeydown="if(event.key===' + "'Enter'" + '){caNewApnSearch();}">' +
          '<button type="button" class="mh-btn" onclick="caNewApnSearch()">Search</button>' +
          '<button type="button" class="mh-btn mh-btn-ghost tc-assist" onclick="caNewApnAutoFill()">Auto-fill</button>' +
        '</div>' +
        '<div class="tc-apn-results" id="bc-apn-results">' + caNewApnResultsHtml() + '</div>' +
      '</div>' +
    '</div>';
  }
  /* the file form opens once a parcel is selected; the wrong parcel shows up as red rows */
  function apnErr(house) {
    var p = apnPicked();
    if (!p) return 'Search the county records and select the parcel that matches the address.';
    if (p !== APN_PARCELS[0]) return 'The parcel you selected is not ' + house + '. Compare the house number and the city, then select the right one.';
    return 'Some rows do not match the county record. Fix the red rows.';
  }

  /* ════════════════ Step 2 · Writing the offer ════════════════ */
  function caNewStep1() {
    if (typeof caNewRevealSideDocs === 'function' && typeof wfStep !== 'undefined' && wfStep === 1) {
      setTimeout(function () { caNewRevealSideDocs(['brbc', 'rpa', 'ad', 'prbs', 'bia', 'bhia', 'wfa', 'ta', 'frr', 'fhda', 'ccpa']); }, 0);
    }
    var terms = inbox('e2_ben_offer', 'ben',
      '<p>Maria,</p>' +
      '<p>They found it: <strong>1634 Benedict Canyon Dr, Beverly Hills 90210</strong>. It is a Carolwood listing (Jonathan Adams and Peter Padden). Please write it up tonight so the buyers can sign tomorrow. Terms:</p>' +
      '<ul>' +
        '<li><strong>Price:</strong> $3,695,000</li>' +
        '<li><strong>Initial deposit:</strong> 3% by wire, within 3 business days of acceptance</li>' +
        '<li><strong>Loan:</strong> conventional, 80%, rate not to exceed 7.000%</li>' +
        '<li><strong>Contingencies:</strong> loan 21 days, appraisal 14, investigation 12, seller documents and prelim 7</li>' +
        '<li><strong>Close of escrow:</strong> 30 days after acceptance</li>' +
        '<li><strong>Compensation:</strong> seller pays our 2.5% out of the proceeds, per the buyer representation agreement</li>' +
        '<li><strong>Escrow and title:</strong> seller&rsquo;s choice</li>' +
        '<li><strong>Home warranty:</strong> buyers waive it. Otherwise standard allocations: seller pays the NHD report.</li>' +
        '<li><strong>Offer expires:</strong> Monday, February 2 at 10:00 AM</li>' +
      '</ul>' +
      '<p>The MLS shows the owner as a <strong>trust</strong>, so include whatever that needs. I don&rsquo;t have the APN handy.</p>' +
      BEN_SIG.replace('Best,', 'Thanks,'));

    var apnForm = form('bc-apn', 'Record what the county shows', 'Copy the details from the parcel record you selected.', [
      { label: 'APN', ans: ['4356-007-010', '4356007010'], show: '4356-007-010', ph: '0000-000-000' },
      { label: 'Owner of record', kind: 'select', ans: 'trust', show: 'CHERINGAL MICHAEL TR (a trust)', options: [['trust', 'A trust (Michael Cheringal, trustee)'], ['individual', 'Michael Cheringal as an individual'], ['llc', 'An LLC']] },
      { label: 'City that serves the parcel', kind: 'select', ans: 'la', show: 'City of Los Angeles (mailing city: Beverly Hills)', options: [['la', 'City of Los Angeles'], ['bh', 'City of Beverly Hills']] }
    ]);

    var zf = zipformsApp('bc-zf', ZF_SECTIONS, function () {
      window.tcMailScheduleReply('e2_ben_signed', 5000);
    });
    var signed = inbox('e2_ben_signed', 'ben',
      '<p>Both buyers signed at 4:08 PM and I presented the offer to Jonathan. He says Michael is reviewing it tonight with his attorney.</p>' +
      '<p>Nice work on the package. You caught the trust: Jonathan mentioned the <strong>Trust Advisory</strong> was already in there.</p>' + BEN_SIG);

    var melonyQ = inbox('e2_melony_q', 'melony',
      '<p>Hi Maria,</p>' +
      '<p>Ben mentioned there might be another offer on Benedict Canyon. We really want this house. Do you think we should <strong>raise the price to $3.8M</strong>, or <strong>drop the appraisal contingency</strong> so ours looks stronger? What would you do?</p>' +
      MELONY_SIG);
    var melonyDec = replyPick({
      key: 'bc-melony-reply', sentId: 'e2_sent_melony', replyId: 'e2_melony_ok', title: 'Answer Melony',
      prompt: 'Answer a buyer who asks for price and contingency strategy', to: 'Melony Mahaarachchi <melony.mahaarachchi@email.com>', cc: 'Ben Belack <ben.belack@theagencyre.com>', subj: 'Re: Quick question before they answer',
      inst: 'Melony wants your opinion on price and the appraisal contingency. Choose the reply that fits a TC.',
      rules: { need: [['melony', 'to', 'You are answering Melony.'], ['ben', 'any', 'Copy Ben: strategy is his call.']], never: [['jonathan', 'Never copy the listing agent on your client&rsquo;s strategy.']], subj: ['question', 'offer', 'benedict', '1634'] },
      choices: [
        { ok: true, label: 'Loop in Ben',
          preview: 'Strategy is Ben&rsquo;s call; you give the timing.',
          body: "Hi Melony,\n\nI understand, you really want this house. Price and contingency strategy are questions for Ben, and I have copied him so he can call you [when Ben will call]. What I can tell you is the timing: your offer is open until Monday at 10:00 AM.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Drop the appraisal contingency',
          preview: 'Sellers love it and your loan is solid.',
          fb: 'Whether to waive a contingency is advice about the buyers&rsquo; risk. That belongs to Ben, their agent.',
          body: "Hi Melony,\n\nDrop the appraisal contingency. Sellers love that and your loan is solid.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Raise to $3.8M',
          preview: 'Play it safe and go higher.',
          fb: 'Suggesting a price is negotiation advice. The TC stays neutral and sends the question to Ben.',
          body: "Hi Melony,\n\nRaise to $3.8M to be safe. You can afford it.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Ask Jonathan about the other offer',
          preview: 'Find out what the competition offered.',
          fb: 'Asking the listing agent about competing offers is Ben&rsquo;s job, and the TC should not negotiate with the other side.',
          body: "Hi Melony,\n\nLet me call Jonathan and ask what the other offer is.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" }
      ],
      ans: "Hi Melony,\n\nI understand, you really want this house. Price and contingency strategy are questions for Ben, and I have copied him so he can call you this evening. What I can tell you is the timing: your offer is open until Monday at 10:00 AM.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency",
      replyFrom: 'melony', replyBody: '<p>Thanks Maria. Ben just called us and we are keeping the offer as it is. Fingers crossed!</p>' + MELONY_SIG, replyOpts: { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack' }
    });

    var main = deck(2, [
      { label: 'Ben&rsquo;s Terms', body: terms, ok: function () { return readOk('e2_ben_offer'); }, err: 'Open Ben&rsquo;s email in Mail first.' },
      { label: 'Find the APN', body: caNewApnLookupCard() + when('bcapn', function () { return !!apnPicked(); }, apnForm), ok: function () { return formOk('bc-apn'); }, check: function () { caNewCheck('bc-apn'); },
        err: function () { return apnErr('1634 Benedict Canyon Dr'); } },
      { label: 'Write the RPA', app: true, body: zf + signed, ok: function () { return readOk('e2_ben_signed'); },
        err: 'Pick the offer package in zipForm, complete the RPA, send it, and read Ben&rsquo;s update.' },
      { label: 'Buyer Question', body: melonyQ + when('s2dec', function () { return readOk('e2_melony_q'); }, melonyDec), ok: function () { return replyOk('bc-melony-reply', 'e2_melony_ok'); }, err: 'Read Melony&rsquo;s email and answer her.' }
    ], 'Continue to Step 3: Acceptance & Escrow');

    return step(2, STEP_TITLES[2], 'Sat, Jan 31 – Sun, Feb 1, 2026',
      'The buyers found their house. Look up the parcel, prepare the offer package in zipForm with Ben&rsquo;s terms and keep the buyers&rsquo; questions with their agent.',
      main, side([['Offer', '$3,695,000'], ['Expires', 'Mon, Feb 2 · 10:00 AM']], ['brbc', 'rpa', 'ad', 'prbs', 'bia', 'bhia', 'wfa', 'ta', 'frr', 'fhda', 'ccpa'], sideContacts(2)), true);
  }

  /* ── SkySlope buyer transaction ── */
  var SS_FIELDS = [
    { id: 'ss_address', label: 'Property address', ph: 'Street address',
      validate: function (v) { return /1634\s+benedict/i.test(v || ''); }, hint: 'Property from the accepted RPA.', auto: '1634 Benedict Canyon Dr, Beverly Hills, CA 90210' },
    { id: 'ss_apn', label: 'APN', ph: '0000-000-000',
      validate: function (v) { return String(v || '').replace(/\D/g, '') === '4356007010'; }, hint: 'The APN from the assessor search.', auto: '4356-007-010' },
    { id: 'ss_price', label: 'Purchase price', kind: 'money', ph: '$',
      validate: function (v) { return Math.abs(toMoney(v) - 3695000) < 0.5; }, hint: 'Accepted price.', auto: '$3,695,000' },
    { id: 'ss_accept', label: 'Acceptance date', kind: 'date', ph: 'mm/dd/yyyy',
      validate: function (v) { return toDate(v) === '2026-02-02'; }, hint: 'Acceptance is when the signed acceptance was delivered.', auto: '02/02/2026' },
    { id: 'ss_coe', label: 'Close of escrow', kind: 'date', ph: 'mm/dd/yyyy',
      validate: function (v) { return toDate(v) === '2026-03-04'; }, hint: '30 days after acceptance.', auto: '03/04/2026' },
    { id: 'ss_escrow', label: 'Escrow company & number', ph: 'Company · #',
      validate: function (v) { var s = (v || '').toLowerCase(); return s.indexOf('2064') > -1 && s.indexOf('next door') > -1; }, hint: 'From Alicia’s opening email.', auto: 'Next Door Escrow · 2064-AS' },
    { id: 'ss_side', label: 'Representation', ph: 'Buyer / Seller',
      validate: function (v) { return /buyer/i.test(v || ''); }, hint: 'Which side does The Agency represent?', auto: 'Buyer side' }
  ];
  var SS_CHECKLIST = [
    { key: 'brbc', title: 'Buyer Representation & Broker Compensation (BRBC)', type: 'attach' },
    { key: 'aba', title: 'Affiliated Business Arrangement Disclosure (The Agency)', type: 'attach' },
    { key: 'lad', title: 'Local Area Disclosures', type: 'attach' },
    { key: 'rpa', title: 'Residential Purchase Agreement (RPA)', type: 'attach' },
    { key: 'ad', title: 'Agency Relationship Disclosure (AD)', type: 'attach' },
    { key: 'prbs', title: 'Possible Representation of More Than One Buyer or Seller (PRBS)', type: 'attach' },
    { key: 'bia', title: "Buyer's Investigation Advisory (BIA)", type: 'attach' },
    { key: 'bhia', title: "Buyer Homeowners' Insurance Advisory (BHIA)", type: 'attach' },
    { key: 'wfa', title: 'Wire Fraud Advisory (WFA)', type: 'attach' },
    { key: 'ta', title: 'Trust Advisory (TA)', type: 'attach' },
    { key: 'frr', title: 'Federal Reporting Requirement Purchase Addendum (FRR-PA)', type: 'attach' },
    { key: 'emd', title: 'Earnest Money Deposit Receipt', type: 'attach' },
    { key: 'p_disc', title: 'Seller Disclosures (TDS, SPQ, NHD, AVID)', type: 'pending', pendingText: 'Pending · Step 4' },
    { key: 'p_insp', title: 'Inspection Reports', type: 'pending', pendingText: 'Pending · Step 5' },
    { key: 'p_rr', title: 'Request for Repair & Contingency Removal', type: 'pending', pendingText: 'Pending · Step 6' },
    { key: 'p_title', title: 'Preliminary Title Report', type: 'pending', pendingText: 'Pending · Step 7' },
    { key: 'p_close', title: 'Final Closing Statement', type: 'pending', pendingText: 'Pending · Step 8' }
  ];

  /* ════════════════ Step 3 · Acceptance, escrow and deposit ════════════════ */
  function caNewStep2() {
    var accept = inbox('e3_jon_accept', 'jonathan',
      '<p>Ben, Maria,</p>' +
      '<p>Michael signed last night and I am delivering the <strong>signed acceptance now (9:12 AM)</strong>, before the 10:00 AM expiration. The fully executed RPA is attached, with no counter.</p>' +
      '<p>The seller is <strong>Michael Cheringal, Trustee of The Michael Cheringal Separate Property Trust dated December 18, 2024</strong>. He signs everything as trustee (RCSD-S coming with the disclosures).</p>' +
      '<p>Seller&rsquo;s choice for escrow is <strong>Next Door Escrow, Alicia Smith</strong>, with title through <strong>Chicago Title</strong>. We will send the disclosure package through Glide this week.</p>' +
      JON_SIG, { to: 'To: Ben Belack &middot; CC: <strong>Maria Rodriguez</strong> &lt;' + TC_ADDR + '&gt;', attach: ['rpa'] });

    var dates = form('bc-dates', 'Build the contract calendar', 'Count from the day the signed acceptance was delivered. If a deadline lands on a Saturday, Sunday or legal holiday, it moves to the next day (Monday, Feb 16 is Presidents&rsquo; Day).', [
      { label: 'Acceptance', kind: 'date', ans: '2026-02-02', show: '02/02/2026 (delivered 9:12 AM)', ph: 'mm/dd/yyyy' },
      { label: 'Deposit due', hint: '3 business days', kind: 'date', ans: '2026-02-05', show: '02/05/2026 (Thu)', ph: 'mm/dd/yyyy' },
      { label: 'Seller delivers documents', hint: '5 days', kind: 'date', ans: '2026-02-09', show: '02/09/2026 (Feb 7 is a Saturday)', ph: 'mm/dd/yyyy' },
      { label: 'Investigation contingency', hint: '12 days', kind: 'date', ans: '2026-02-17', show: '02/17/2026 (Sat 14 → holiday Mon 16 → Tue 17)', ph: 'mm/dd/yyyy' },
      { label: 'Appraisal contingency', hint: '14 days', kind: 'date', ans: '2026-02-17', show: '02/17/2026 (Mon 16 is a holiday)', ph: 'mm/dd/yyyy' },
      { label: 'Loan contingency', hint: '21 days', kind: 'date', ans: '2026-02-23', show: '02/23/2026', ph: 'mm/dd/yyyy' },
      { label: 'Close of escrow', hint: '30 days', kind: 'date', ans: '2026-03-04', show: '03/04/2026 (Wed)', ph: 'mm/dd/yyyy' }
    ]);

    var escrowTask = mailTask('bc-escrow-open', 'Open escrow with Alicia',
      'Send the executed RPA to Next Door Escrow and introduce the file. Copy the two agents.', 'e3_sent_escrow');
    compose({
      key: 'bc-escrow-open', prompt: 'Open escrow with Next Door Escrow for 1634 Benedict Canyon Dr',
      to: 'Alicia Smith <alicia@nextdoorescrow.com>', cc: 'Ben Belack <ben.belack@theagencyre.com>, Jonathan Adams <jonathan.adams@carolwoodre.com>',
      subj: 'Escrow opening: 1634 Benedict Canyon Dr (Mahaarachchi / Cheringal Trust)', attach: ['rpa'],
      inst: 'Include the parties, price, deposit and deadline, the loan and lender, close of escrow, and what you need back from escrow.',
      rules: {
        need: [['alicia', 'to', 'Escrow is opened with the escrow officer: Alicia Smith goes in To.'], ['ben', 'any', 'Copy Ben, your agent.'], ['jonathan', 'any', 'Copy Jonathan, the listing agent.']],
        never: [['melony', 'Escrow will contact the buyers directly with its own secure instructions. Keep them off the opening email.'], ['senaka', 'Escrow will contact the buyers directly with its own secure instructions. Keep them off the opening email.']]
      },
      ans: "Hi Alicia,\n\nPlease open escrow for the attached fully executed RPA:\n\n• Property: 1634 Benedict Canyon Dr, Beverly Hills, CA 90210 (APN 4356-007-010)\n• Buyers: Nilanthi Melony Mahaarachchi and Senaka Mahaarachchi\n• Seller: Michael Cheringal, Trustee of The Michael Cheringal Separate Property Trust dated December 18, 2024\n• Price: $3,695,000\n• Initial deposit: $110,850 by wire, due Thursday 2/5 (3 business days after acceptance on 2/2)\n• Loan: $2,956,000 conventional, JPMorgan Chase (Ryan Cho)\n• Close of escrow: Wednesday 3/4/2026\n• Title: Chicago Title\n\nPlease send me the escrow number, your opening package and the wiring instructions process for the buyers. Buyer contact information to follow through your secure portal.\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var opened = inbox('e3_alicia_open', 'alicia',
      '<p>Thank you, Maria. Escrow is open:</p>' +
      '<ul>' +
        '<li><strong>Escrow No.:</strong> 2064-AS &middot; Next Door Escrow, Inc.</li>' +
        '<li><strong>Title:</strong> Chicago Title, order <strong>FBSC2601151</strong> (title officer David Hughes)</li>' +
        '<li><strong>Deposit:</strong> $110,850 due by Thursday, February 5</li>' +
      '</ul>' +
      '<p>Wiring instructions go to the buyers through our secure portal. They must <strong>call me at (714) 264-7964</strong> to verify before they wire. We never change wiring instructions by email.</p>' +
      '<p>Please ask the buyers to complete the Statement of Information in the portal, and send me Ryan Cho&rsquo;s contact for the loan documents.</p>' +
      ALICIA_SIG, { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack, Jonathan Adams' });

    var lenderTask = mailTask('bc-lender', 'Send the contract to the lender',
      'Your buyers are financing. Send Chase the executed RPA with the escrow details and the loan dates. Alicia asked for Ryan&rsquo;s contact, so connect them.', 'e3_sent_lender');
    compose({
      key: 'bc-lender', prompt: 'Send the executed contract to the buyers&rsquo; lender',
      to: 'Ryan Cho <ryan.cho@chase.com>', cc: 'Alicia Smith <alicia@nextdoorescrow.com>, Ben Belack <ben.belack@theagencyre.com>',
      subj: 'Executed contract for Chase: 1634 Benedict Canyon Dr (Mahaarachchi)', attach: ['rpa'],
      inst: 'Give Ryan the price, loan amount, escrow and title contacts, and the three dates he has to meet: appraisal, loan contingency and close of escrow.',
      rules: {
        need: [['ryan', 'to', 'The loan is with Chase: Ryan goes in To.'], ['alicia', 'any', 'Alicia asked for Ryan&rsquo;s contact: copy her so escrow and the lender connect.'], ['ben', 'any', 'Copy Ben.']],
        never: [['jonathan', 'The buyers&rsquo; loan is not the seller side&rsquo;s business. Leave Jonathan off.']]
      },
      ans: "Hi Ryan,\n\nMelony and Senaka Mahaarachchi are in contract on 1634 Benedict Canyon Dr, Beverly Hills, CA 90210 (APN 4356-007-010). The fully executed RPA is attached.\n\n• Price: $3,695,000; loan $2,956,000 (80%), conventional, rate not to exceed 7.000%\n• Escrow: Next Door Escrow, Alicia Smith, escrow 2064-AS (copied here)\n• Title: Chicago Title, order FBSC2601151\n• Appraisal contingency: Tuesday 2/17\n• Loan contingency: Monday 2/23\n• Close of escrow: Wednesday 3/4/2026\n\nPlease let me know when the appraisal is ordered and send the loan documents to Alicia.\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var lenderReply = inbox('e3_ryan_lender', 'ryan',
      '<p>Received, thank you, Maria. I opened the file with Alicia and the <strong>appraisal is ordered</strong> with the 2/17 date in mind. Loan documents will go to Next Door Escrow.</p>' +
      '<p>I will let you and Ben know as soon as the appraisal is back.</p>' + '<p>Ryan Cho<br>Senior Home Lending Advisor &middot; JPMorgan Chase Bank, N.A.</p>',
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Alicia Smith, Ben Belack' });

    var wireQ = inbox('e3_melony_wire', 'melony',
      '<p>Hi Maria,</p>' +
      '<p>We got the wiring instructions from escrow. It says <strong>Genesis Bank, account ending 8520</strong>. Can you just confirm the account number is right so I can send the $110,850 this morning before work?</p>' +
      '<p>Thanks! Melony</p>');
    var wireDec = replyPick({
      key: 'bc-wire-reply', sentId: 'e3_sent_wire', replyId: 'e3_melony_wire_ok', title: 'Answer Melony',
      prompt: 'Answer a buyer who asks to confirm wire instructions by email', to: 'Melony Mahaarachchi <melony.mahaarachchi@email.com>', cc: 'Ben Belack <ben.belack@theagencyre.com>', subj: 'Re: Wiring the deposit this morning',
      inst: 'Melony wants you to confirm the account number by email. Choose the safe reply.',
      rules: { need: [['melony', 'to', 'You are answering Melony.'], ['ben', 'any', 'Copy Ben.']], subj: ['wir', 'deposit', 'benedict', '1634'] },
      choices: [
        { ok: true, label: 'Verify by phone with Alicia',
          preview: 'Never confirm wire details by email.',
          body: "Hi Melony,\n\nI can't confirm wiring details by email. Please call Alicia at Next Door Escrow at (714) 264-7964, the number in her opening letter, and verify the instructions with her before you send anything. The deposit of $110,850 is due by [deposit deadline].\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Confirm the account',
          preview: 'Genesis Bank ending 8520 is correct.',
          fb: 'A TC never confirms account numbers by email, even when they look right. The buyer must verify by phone with escrow.',
          body: "Hi Melony,\n\nYes, Genesis Bank ending 8520 is correct. Go ahead.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Reply to the instructions email',
          preview: 'Ask escrow to confirm by email.',
          fb: 'If the email were fake, replying goes straight to the scammer. Verification is by phone, using a number you already know.',
          body: "Hi Melony,\n\nJust reply to the email with the instructions and ask them to confirm.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Call the number on the instructions',
          preview: 'Double-check using the phone on the PDF.',
          fb: 'A fake PDF carries a fake phone number. Use the number from the opening letter or the company website.',
          body: "Hi Melony,\n\nCall the phone number printed on the wiring instructions to double-check.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" }
      ],
      ans: "Hi Melony,\n\nI can't confirm wiring details by email. Please call Alicia at Next Door Escrow at (714) 264-7964, the number in her opening letter, and verify the instructions with her before you send anything. The deposit of $110,850 is due by Thursday, February 5.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency",
      replyFrom: 'melony', replyBody: '<p>Good to know! I called Alicia and she confirmed everything by phone. Sending the wire today.</p>' + MELONY_SIG, replyOpts: { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack' }
    });

    var emd = inbox('e3_alicia_emd', 'alicia',
      '<p>Good morning,</p>' +
      '<p>The buyers&rsquo; deposit landed in our trust account on <strong>Thursday afternoon (2/5)</strong>, after Melony verified the instructions with me by phone. The formal <strong>Receipt for Funds</strong> is attached.</p>' +
      ALICIA_SIG, { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack, Jonathan Adams', attach: ['emd'] });
    var emdForm = form('bc-emd', 'Log the deposit', 'Open the receipt and record it in the file.', [
      { label: 'Amount received', kind: 'money', ans: 110850, show: '$110,850.00', ph: '$' },
      { label: 'Receipt number', ans: ['400131'], show: '400131', ph: 'No.' },
      { label: 'Escrow file', ans: ['2064-as', '2064as'], show: '2064-AS', ph: 'File no.' },
      { label: 'Received from', kind: 'select', ans: 'melony', show: 'Nilanthi Melony Mahaarachchi (wire)', options: [['melony', 'Nilanthi Melony Mahaarachchi'], ['senaka', 'Senaka Mahaarachchi'], ['ben', 'The Agency']] },
      { label: 'On time?', kind: 'select', ans: 'yes', show: 'Yes: landed Thu 2/5, the due date (receipt issued 2/6)', options: [['yes', 'Yes'], ['no', 'No, it was late']] }
    ]);

    var ss = skyslopeApp('bc-ss', SS_FIELDS, SS_CHECKLIST);

    var main = deck(3, [
      { label: 'Acceptance', body: accept + when('s3dates', function () { return readOk('e3_jon_accept'); }, dates),
        ok: function () { return readOk('e3_jon_accept') && formOk('bc-dates'); }, check: function () { if (readOk('e3_jon_accept')) caNewCheck('bc-dates'); },
        err: function () { return readOk('e3_jon_accept') ? 'Some dates are off. Count calendar days from Feb 2 and move weekend and holiday deadlines to the next day.' : 'Open Jonathan&rsquo;s email in Mail first.'; } },
      { label: 'Open Escrow', body: escrowTask + opened, ok: function () { return replyOk('bc-escrow-open', 'e3_alicia_open'); }, err: replyErr('Alicia') },
      { label: 'Lender', body: lenderTask + lenderReply, ok: function () { return replyOk('bc-lender', 'e3_ryan_lender'); }, err: replyErr('Ryan') },
      { label: 'Wire Check', body: wireQ + when('s3wire', function () { return readOk('e3_melony_wire'); }, wireDec), ok: function () { return replyOk('bc-wire-reply', 'e3_melony_wire_ok'); }, err: 'Read Melony&rsquo;s email and answer her.' },
      { label: 'Deposit', body: emd + when('s3emd', function () { return readOk('e3_alicia_emd'); }, emdForm), ok: function () { return formOk('bc-emd'); }, check: function () { if (readOk('e3_alicia_emd')) caNewCheck('bc-emd'); },
        err: function () { return readOk('e3_alicia_emd') ? 'Check the receipt again: some entries do not match.' : 'Open Alicia&rsquo;s email in Mail first.'; } },
      { label: 'SkySlope', app: true, body: ss, ok: function () { return !!run()['ss_submitted_bc-ss']; }, err: 'Create the transaction, attach the signed documents and submit the file for compliance review.' }
    ], 'Continue to Step 4: Seller Disclosures');

    return step(3, STEP_TITLES[3], 'Mon, Feb 2 – Fri, Feb 6, 2026',
      'The offer was accepted. Build the calendar, open escrow, send the contract to the lender, keep the deposit wire safe and open the transaction in SkySlope.',
      main, side([['Acceptance', 'Mon, Feb 2 · 9:12 AM'], ['Deposit due', 'Thu, Feb 5']], ['brbc', 'aba', 'lad', 'rpa', 'ad', 'prbs', 'bia', 'bhia', 'wfa', 'ta', 'frr', 'emd', 'fhda', 'ccpa', 'carolwoodAba'], sideContacts(3)), true,
      { text: 'Deposit of $110,850 due 3 business days after acceptance.', days: 'Due Thu, Feb 5' });
  }

  /* ════════════════ Step 4 · Seller disclosure review ════════════════ */
  function caNewStep3() {
    var pkg = inbox('e4_jon_disc', 'jonathan',
      '<p>Ben, Maria,</p>' +
      '<p>Attached is the complete seller disclosure package through Glide, signed by Michael today:</p>' +
      '<ul>' +
        '<li>TDS and SPQ (with the text overflow addendum), Lead-Based Paint Disclosure (built 1936)</li>' +
        '<li>Natural Hazard Disclosure report (PropertyID, 2/2/2026) and the Wildfire Disaster Advisory</li>' +
        '<li>Earthquake and environmental hazards booklets, WHSD, WCMD, SFLS, SPT, SBSA, MCA, AAA</li>' +
        '<li>RCSD-S (Michael signs as trustee) and our affiliated business disclosure</li>' +
        '<li>My AVID from yesterday</li>' +
        '<li>The <strong>historical file</strong> from Michael&rsquo;s 2021 purchase (inspection, termite and City 9A report) with the Historical Documents Advisory</li>' +
      '</ul>' +
      '<p>Please have the buyers sign the receipts. Also, since the seller is a trust he was technically exempt from the TDS, but we gave one anyway.</p>' +
      JON_SIG, { to: 'To: Ben Belack &middot; CC: <strong>Maria Rodriguez</strong>', attach: ['discPkg', 'tds', 'spq', 'nhd', 'wfda', 'avidLA', 'histAdv', 'histInsp'] });

    var tdsAsk = inbox('e4_ben_tds', 'ben', '<p>Quick one: Jonathan says the trust was <strong>exempt from the TDS</strong> and the one they gave us is just a courtesy. Is that right? Can the buyers rely on it the same way?</p>' + BEN_SIG);
    var tdsPick = replyPick({
      key: 'bc-tds', sentId: 'e4_sent_tds', replyId: 'e4_ben_tds_ok', title: 'Answer Ben',
      prompt: 'Explain to the agent whether the trustee owed a TDS', to: 'Ben Belack <ben.belack@theagencyre.com>', cc: '', subj: 'Re: Is the TDS just a courtesy?',
      inst: 'Check the Trust Advisory and the historical file, then choose the reply that is correct.',
      rules: { need: [['ben', 'to', 'Ben asked: answer Ben.']], never: [['melony', 'Answer Ben first; he reviews disclosures with his clients.'], ['jonathan', 'This is internal. Ben decides how to raise it with Jonathan.']], subj: ['tds', 'trust', 'benedict', '1634'] },
      choices: [
        { ok: true, label: 'It was required',
          preview: 'The trustee is a former owner, so the exemption does not apply.',
          body: "Hi Ben,\n\nNot quite. Under the Trust Advisory (TA 1A(2)), a trustee still owes a TDS when the trustee is a natural person, the trust is revocable and the trustee is a former owner or occupant. Michael bought the house in [year Michael bought it] and put it in his own trust in December 2024, so the TDS was required, not a courtesy. The buyers can rely on it as a statutory disclosure.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Yes, trusts are exempt',
          preview: 'Every sale by a trust is exempt.',
          fb: 'Not every trust sale is exempt. Read TA 1A(2): a trustee who owned or lived in the home still owes the TDS.',
          body: "Hi Ben,\n\nYes, every sale by a trust is exempt from the TDS, so it is just a courtesy.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'The AVID replaces it',
          preview: 'Jonathan did an AVID instead.',
          fb: 'An AVID is the agent&rsquo;s own inspection. It never replaces the seller&rsquo;s TDS.',
          body: "Hi Ben,\n\nIt is exempt because Jonathan completed an AVID instead.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Only if the buyers ask',
          preview: 'It depends on whether they request one.',
          fb: 'Whether a TDS is owed depends on the law and the Trust Advisory, not on what the buyers ask.',
          body: "Hi Ben,\n\nIt only matters if the buyers ask for one.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" }
      ],
      ans: "Hi Ben,\n\nNot quite. Under the Trust Advisory (TA 1A(2)), a trustee still owes a TDS when the trustee is a natural person, the trust is revocable and the trustee is a former owner or occupant. Michael bought the house in 2021 and put it in his own trust in December 2024, so the TDS was required, not a courtesy. The buyers can rely on it as a statutory disclosure.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency",
      replyFrom: 'ben', replyBody: '<p>Perfect, that is exactly what I will tell the buyers. Nice work.</p>' + BEN_SIG, replyOpts: {}
    });
    var tdsDec = tdsAsk + when('s4tds', function () { return readOk('e4_ben_tds'); }, tdsPick);

    var flags = picker('bc-p-flags', 'Flag what needs the buyers&rsquo; attention',
      'Read the TDS, SPQ and NHD. Pick the items Ben should walk through with the buyers.', [
        { t: 'Insurance claim: pipe burst in the crawl space', sub: 'SPQ 6.H / 8.A · repaired', ok: true },
        { t: 'Pool heater does not work; fountain may need repair', sub: 'SPQ 13', ok: true },
        { t: 'Very High Fire Hazard Severity Zone and wildland area', sub: 'NHD', ok: true },
        { t: 'Seismic hazard zone: landslide and liquefaction', sub: 'NHD', ok: true },
        { t: 'Beverly Hills mailing address, City of Los Angeles services', sub: 'SPQ 17.K', ok: true },
        { t: 'Reports from 2021 are historical only', sub: 'Historical Documents Advisory', ok: true },
        { t: 'Missing HOA documents', sub: 'Common interest', ok: false },
        { t: 'Solar panel lease to assume', sub: 'Leased items', ok: false },
        { t: 'Death on the property in the last 3 years', sub: 'SPQ 6.A', ok: false },
        { t: 'Seller bought the home less than 18 months ago', sub: 'SPQ 7.F', ok: false }
      ], 'The SPQ answers Yes to an insurance claim (the crawl-space pipe burst) and discloses the broken pool heater. The NHD puts the home in a Very High Fire Hazard Severity Zone and in landslide and liquefaction zones, which will matter for insurance and the geotechnical inspection. The SPQ also notes the Beverly Hills postal address with City of LA services. The 2021 reports are historical. There is no HOA, no solar, no death on the property, and Michael has owned it since 2021.');

    var summaryTask = mailTask('bc-disc-summary', 'Let Ben know the package arrived',
      'Tell Ben the disclosures are in, note the TDS issue you caught, and give the review deadline. Ben reviews the content with his clients.', 'e4_sent_summary');
    compose({
      key: 'bc-disc-summary', prompt: 'Tell Ben the disclosure package arrived and give the review deadline',
      to: 'Ben Belack <ben.belack@theagencyre.com>', subj: 'Seller disclosures received: 1634 Benedict Canyon Dr',
      inst: 'Tell Ben the package arrived, note that the TDS is required even though the seller is a trust, and give the review deadline. You do not analyze the disclosures for the buyers: Ben reviews the content with them.',
      rules: {
        need: [['ben', 'to', 'This goes to Ben.']],
        never: [['melony', 'Send this to Ben first. He goes over the disclosures with his clients.'], ['senaka', 'Send this to Ben first. He goes over the disclosures with his clients.']]
      },
      ans: "Hi Ben,\n\nCarolwood delivered the full disclosure package today (Friday 2/6). I have everything in the file.\n\nOne note: Jonathan said the trust was exempt from the TDS, but Michael owned the home before putting it in his trust, so the TDS is required under the Trust Advisory.\n\nReview of seller documents runs to Wednesday 2/11 (5 days after delivery); investigation contingency ends 2/17. I will send the buyers the DocuSign envelope for their signatures once you are ready to go over the disclosures with them.\n\nThanks,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var benReply = inbox('e4_ben_reply', 'ben',
      '<p>Good catch on the TDS; I will mention it to Jonathan.</p>' +
      '<p>I did my own AVID yesterday at 12:35 PM, it is in DocuSign. Go ahead and send the buyers the disclosure package for their signatures now; I will walk them through everything tonight. Inspection list coming in a minute.</p>' + BEN_SIG);
    var buyersTask = mailTask('bc-disc-buyers', 'Send the package to the buyers',
      'The buyers have to receive and sign the seller disclosures. Tell them what is in the DocuSign envelope and by when. Ben explains the content.', 'e4_sent_buyers');
    compose({
      key: 'bc-disc-buyers', prompt: 'Send the seller disclosure package to the buyers for signature',
      to: 'Melony Mahaarachchi <melony.mahaarachchi@email.com>, Senaka Mahaarachchi <senaka.mahaarachchi@email.com>', cc: 'Ben Belack <ben.belack@theagencyre.com>',
      subj: 'Seller disclosures to review and sign: 1634 Benedict Canyon Dr', attach: ['discPkg'],
      inst: 'List what they are signing, say Ben will go over it with them tonight, and give the review deadline. Do not interpret the disclosures yourself.',
      rules: {
        need: [['melony', 'to', 'The buyers sign the receipts: send it to them.'], ['senaka', 'any', 'Both buyers sign.'], ['ben', 'any', 'Copy Ben: he reviews the content with them.']],
        never: [['jonathan', 'Send the signed receipts back to Jonathan later. This email is between you and your clients.']]
      },
      ans: "Hi Melony and Senaka,\n\nThe seller's disclosure package for 1634 Benedict Canyon Dr is in a DocuSign envelope for both of you: the TDS and SPQ, the Natural Hazard Disclosure report, the lead-based paint disclosure, the hazard booklets and advisories, the listing agent's AVID and the historical reports from 2021.\n\nPlease read everything carefully. Ben will go over it with you tonight, so bring your questions to that call.\n\nYour review period for the seller documents runs to Wednesday 2/11, so please sign the receipts after your call with Ben.\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var buyersReply = inbox('e4_melony_disc', 'melony',
      '<p>Got it, thank you. We will go through everything with Ben tonight and sign after the call.</p>' + MELONY_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Senaka, Ben Belack' });

    var main = deck(4, [
      { label: 'Disclosure Package', body: pkg, ok: function () { return readOk('e4_jon_disc'); }, err: 'Open Jonathan&rsquo;s email in Mail first.' },
      { label: 'Trust & TDS', body: tdsDec, ok: function () { return replyOk('bc-tds', 'e4_ben_tds_ok'); }, err: 'Answer in Mail and read the reply.' },
      { label: 'Notify Ben', body: summaryTask + benReply, ok: function () { return replyOk('bc-disc-summary', 'e4_ben_reply'); }, err: replyErr('Ben') },
      { label: 'Buyers&rsquo; Signatures', body: buyersTask + buyersReply, ok: function () { return replyOk('bc-disc-buyers', 'e4_melony_disc'); }, err: replyErr('Melony') }
    ], 'Continue to Step 5: Inspections');

    return step(4, STEP_TITLES[4], 'Fri, Feb 6 – Sat, Feb 7, 2026',
      'Carolwood delivered the seller disclosures. Check whether the TDS is required, let Ben know the package arrived, and send it to the buyers for signature.',
      main, side([['Disclosures delivered', 'Fri, Feb 6'], ['Review ends', 'Wed, Feb 11']], ['discPkg', 'tds', 'spq', 'nhd', 'lead', 'earthquake', 'envHaz', 'whsd', 'wcmd', 'sfls', 'spt', 'wfda', 'rcsd', 'ta', 'avidLA', 'avidBA', 'histAdv', 'histInsp', 'histTermite', 'hist9a', 'aaa', 'sbsa', 'mca'], sideContacts(4)), true,
      { text: 'Review of seller documents: 7 days after acceptance or 5 days after delivery, whichever is later.', days: 'Wed, Feb 11' });
  }

  /* ════════════════ Step 5 · Buyer investigations ════════════════ */
  function caNewStep4() {
    var plan = inbox('e5_ben_insp', 'ben',
      '<p>Maria,</p>' +
      '<p>The general inspection was Friday with <strong>Home Inspection Experts</strong> (Kraig Gloster). The buyers also want:</p>' +
      '<ul>' +
        '<li>Sewer line scope</li><li>Chimney</li><li>Drainage / foundation</li><li>Pool and spa</li>' +
        '<li>A <strong>geotechnical</strong> review. It is a hillside lot in a landslide zone.</li>' +
      '</ul>' +
      '<p>The house is vacant with a Carolwood lockbox. The investigation contingency runs to <strong>Tuesday 2/17</strong>, but I want our RR out by <strong>Thursday 2/12</strong>, so everything has to happen Monday through Wednesday. Please set up access with Jonathan and copy me. Their elections (BIE) are attached.</p>' +
      BEN_SIG, { attach: ['inspect', 'bie'] });

    var accessTask = mailTask('bc-access', 'Request access from Jonathan',
      'Ask the listing agent for access for each inspection, Monday 2/9 to Wednesday 2/11. Copy Ben.', 'e5_sent_access');
    compose({
      key: 'bc-access', prompt: 'Request inspection access from the listing agent',
      to: 'Jonathan Adams <jonathan.adams@carolwoodre.com>', cc: 'Ben Belack <ben.belack@theagencyre.com>',
      subj: 'Inspection access: 1634 Benedict Canyon Dr',
      inst: 'Give Jonathan a clear schedule (date, time, type of inspection), ask for lockbox access, and confirm the utilities are on.',
      rules: {
        need: [['jonathan', 'to', 'Access to a listed property is requested from the listing agent: Jonathan goes in To.'], ['ben', 'any', 'Copy Ben.']],
        never: [['melony', 'The buyers do not need the access logistics. Keep this between the agents.'], ['senaka', 'The buyers do not need the access logistics. Keep this between the agents.']]
      },
      ans: "Hi Jonathan,\n\nThe buyers' inspections for 1634 Benedict Canyon Dr. Could you approve access for:\n\n• Mon 2/9, 10:00 AM: sewer line scope\n• Mon 2/9, 1:00 PM: chimney\n• Tue 2/10, 9:00 AM: drainage and foundation\n• Tue 2/10, 1:00 PM: pool and spa\n• Wed 2/11, 10:00 AM: geotechnical review\n\nPlease confirm lockbox access and that gas, water and power are on. Let me know if the seller has any restrictions.\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var access = inbox('e5_jon_access', 'jonathan',
      '<p>All approved. Lockbox access is through ShowingTime, and utilities are on.</p>' +
      '<p>Two notes: please have everyone leave the lights off and the doors locked, and tell the plumber there is <strong>no clean-out for the guest house line</strong>, so the scope of that section may be limited.</p>' +
      JON_SIG, { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack' });

    var vendorQ = inbox('e5_melony_vendor', 'melony',
      '<p>Hi Maria,</p><p>We don&rsquo;t know any geologists. Can you just pick one and book it? Whoever you think is best is fine with us.</p>' + MELONY_SIG);
    var vendorDec = replyPick({
      key: 'bc-vendor-reply', sentId: 'e5_sent_vendor', replyId: 'e5_melony_vendor_ok', title: 'Answer Melony',
      prompt: 'Answer a buyer who asks the TC to choose a vendor', to: 'Melony Mahaarachchi <melony.mahaarachchi@email.com>', cc: 'Ben Belack <ben.belack@theagencyre.com>', subj: 'Re: Can you pick the geologist for us?',
      inst: 'Melony wants you to pick the geologist. Choose the reply that keeps the choice with the buyers.',
      rules: { need: [['melony', 'to', 'You are answering Melony.'], ['ben', 'any', 'Copy Ben.']], subj: ['geolog', 'benedict', '1634', 'inspection'] },
      choices: [
        { ok: true, label: 'Send options; they choose',
          preview: 'You share licensed firms and schedule once they pick.',
          body: "Hi Melony,\n\nI can't choose the inspector for you, but I will send you and Ben a list of licensed geotechnical firms [when you will send the list]. Once you pick one, I will schedule it and set up access with the listing agent. The investigation period ends Tuesday, February 17.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Book the office&rsquo;s usual firm',
          preview: 'You book the one the office always uses.',
          fb: 'Choosing vendors for clients creates liability and can look like a conflict of interest. The buyers choose.',
          body: "Hi Melony,\n\nSure, I will book the geologist our office always uses.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Say they don&rsquo;t need one',
          preview: 'The home inspection covers the hillside.',
          fb: 'Advising the buyers to skip an inspection is advice about their risk, and the NHD shows a landslide zone.',
          body: "Hi Melony,\n\nYou don't really need a geologist. The home inspection covers the hillside.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Use the seller&rsquo;s geologist',
          preview: 'Ask Jonathan who the seller used.',
          fb: 'The buyers need their own independent investigation, not the seller&rsquo;s vendor.',
          body: "Hi Melony,\n\nAsk Jonathan which geologist the seller used and hire the same one.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" }
      ],
      ans: "Hi Melony,\n\nI can't choose the inspector for you, but I will send you and Ben a list of licensed geotechnical firms tonight. Once you pick one, I will schedule it and set up access with the listing agent. The investigation period ends Tuesday, February 17.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency",
      replyFrom: 'melony', replyBody: '<p>Thanks, that makes sense. We will look at the list with Ben tonight and let you know.</p>' + MELONY_SIG, replyOpts: { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack' }
    });

    var findings = inbox('e5_ben_findings', 'ben',
      '<p>All the reports are back. The sewer scope confirmed the 2021 report: the main line to the street is original cast iron with heavy scale, and there is no clean-out for the guest house line. The pool equipment leaks, and the geotech had no immediate concerns but wants the drainage fixed.</p>' +
      '<p>For my RR notes, can you pull the <strong>safety items</strong> out of the general inspection summary? I&rsquo;ll deal with the rest by credit.</p>' +
      BEN_SIG, { attach: ['inspect', 'sewer', 'geo'] });
    var safety = picker('bc-p-safety', 'Pull the safety items',
      'Open the inspection summary. Which findings are safety items?', [
        { t: 'No GFCI protection at the exterior and garage outlets', sub: 's-43 / s-98', ok: true },
        { t: 'Pool gates are not self-closing and self-latching', sub: 's-59', ok: true },
        { t: 'Missing smoke detectors in bedrooms, smoke/CO in hallways', sub: 's-192 / s-277', ok: true },
        { t: 'Foil tape on the gas vent pipe', sub: 's-157', ok: true },
        { t: 'Caulking and cleaning in bath #4', sub: 's-258', ok: false },
        { t: 'Calcium deposits at the kitchen sink', sub: 's-291', ok: false },
        { t: 'Efflorescence on the foundation', sub: 's-81', ok: false },
        { t: 'A/C nearing the end of its life', sub: 's-125', ok: false }
      ], 'GFCI protection, pool barriers, smoke and CO detectors and a properly sealed gas vent are life-safety items. Caulking, calcium deposits, efflorescence and an aging A/C are maintenance or cost items. Smoke and CO detectors are also required by state law at sale (see the WHSD and WCMD).');

    var main = deck(5, [
      { label: 'Inspection Plan', body: plan + when('s5task', function () { return readOk('e5_ben_insp'); }, accessTask + access),
        ok: function () { return replyOk('bc-access', 'e5_jon_access'); }, err: function () { return readOk('e5_ben_insp') ? replyErr('Jonathan') : 'Open Ben&rsquo;s email in Mail first.'; } },
      { label: 'Vendor Question', body: vendorQ + when('s5dec', function () { return readOk('e5_melony_vendor'); }, vendorDec), ok: function () { return replyOk('bc-vendor-reply', 'e5_melony_vendor_ok'); }, err: 'Read Melony&rsquo;s email and answer her.' },
      { label: 'Findings', body: findings + when('s5pick', function () { return readOk('e5_ben_findings'); }, safety), ok: function () { return pickOk('bc-p-safety'); },
        err: function () { return readOk('e5_ben_findings') ? 'Pick the safety items. If a pick is wrong, use Try again.' : 'Open Ben&rsquo;s email in Mail first.'; } }
    ], 'Continue to Step 6: Request for Repair');

    return step(5, STEP_TITLES[5], 'Sat, Feb 7 – Wed, Feb 11, 2026',
      'Coordinate the buyers&rsquo; inspections before the RR goes out, keep vendor choices with the buyers and pull the safety items for Ben.',
      main, side([['Inspections', 'Mon 2/9 – Wed 2/11'], ['RR target', 'Thu, Feb 12']], ['inspect', 'bie', 'sewer', 'geo', 'avidBA', 'avidLA', 'spq', 'nhd'], sideContacts(5)), true,
      { text: 'Investigation contingency: 12 days after acceptance, moved past the weekend and Presidents’ Day.', days: 'Tue, Feb 17' });
  }

  /* ════════════════ Step 6 · Request for repair & contingency removal ════════════════ */
  function caNewStep5() {
    var rrTerms = inbox('e6_ben_rr', 'ben',
      '<p>Maria, here is RR No. 1. The buyers sign this afternoon.</p>' +
      '<ul>' +
        '<li><strong>Credit:</strong> $165,700 at close of escrow</li>' +
        '<li><strong>Attach:</strong> physical, termite, drainage/foundation, pool, chimney, plumbing and geotechnical reports</li>' +
        '<li><strong>Addendum No. 1</strong>, at the seller&rsquo;s cost before final verification:' +
          '<ol>' +
            '<li>Retain <strong>Mr. Speedy Plumber</strong> to hydro-jet the main sewer line, with a video scope afterwards and any recommended repairs with permits and paid invoices.</li>' +
            '<li>Have Mr. Speedy install a <strong>sewer clean-out serving the guest house</strong>, with a video scope afterwards.</li>' +
            '<li>Once the buyers remove all contingencies, the seller and Carolwood take all photos and videos of the property offline. If the MLS requires one photo, it can be the powder room.</li>' +
          '</ol></li>' +
        '<li><strong>Expiration:</strong> standard: 5:00 PM on the third day after the buyers sign.</li>' +
      '</ul>' + BEN_SIG);

    var rrForm = form('bc-rr', 'Prepare RR No. 1 and Addendum No. 1', 'Fill in the request exactly as Ben described it.', [
      { label: 'Date prepared', kind: 'date', ans: '2026-02-12', show: '02/12/2026', ph: 'mm/dd/yyyy' },
      { label: 'Credit requested', kind: 'money', ans: 165700, show: '$165,700.00', ph: '$' },
      { label: 'Plumbing company named in the addendum', ans: ['speedy'], show: 'Mr. Speedy Plumber', ph: 'Company' },
      { label: 'Addendum item 2', kind: 'select', ans: 'cleanout', show: 'Sewer clean-out serving the guest house', options: [['cleanout', 'Sewer clean-out serving the guest house'], ['lateral', 'Replace the main sewer lateral'], ['pool', 'Replace the pool heater']] },
      { label: 'Photos come down', kind: 'select', ans: 'removal', show: 'When the buyers remove all contingencies', options: [['removal', 'When the buyers remove all contingencies'], ['close', 'At close of escrow'], ['now', 'Immediately']] },
      { label: 'RR expires', kind: 'select', ans: '3day', show: '5:00 PM on the 3rd day after the buyers sign', options: [['3day', '5:00 PM on the 3rd day after the buyers sign'], ['24h', '24 hours after delivery'], ['coe', 'At close of escrow']] }
    ]);

    var resp = inbox('e6_jon_resp', 'jonathan',
      '<p>Ben, Maria,</p>' +
      '<p>Michael signed his response to RR No. 1 tonight (attached):</p>' +
      '<ul>' +
        '<li>Seller agrees to the buyers&rsquo; requests <strong>except the credit: $95,000 at close</strong> instead of $165,700.</li>' +
        '<li>Seller <strong>approves Addendum No. 1</strong>, including the buyers&rsquo; modification.</li>' +
        '<li>This is <strong>conditioned on the buyers removing their contingencies</strong> on the attached C.A.R. CR-B, signed and delivered.</li>' +
        '<li>The RR expiration is extended until <strong>2/19</strong>.</li>' +
      '</ul>' + JON_SIG, { to: 'To: Ben Belack &middot; CC: <strong>Maria Rodriguez</strong>', attach: ['rr'] });

    var crbQ = inbox('e6_melony_crb', 'melony',
      '<p>Maria,</p><p>Ben says we should sign the contingency removal and remove <strong>everything</strong>, even the loan and the appraisal. Our appraisal isn&rsquo;t back yet. Is that safe? Should we sign?</p>' + MELONY_SIG);
    var crbDec = replyPick({
      key: 'bc-crb-reply', sentId: 'e6_sent_crb', replyId: 'e6_melony_crb_ok', title: 'Answer Melony',
      prompt: 'Answer a buyer who asks whether to remove all contingencies', to: 'Melony Mahaarachchi <melony.mahaarachchi@email.com>', cc: 'Ben Belack <ben.belack@theagencyre.com>', subj: 'Re: Signing the contingency removal?',
      inst: 'Explain the facts, keep the decision with the buyers and Ben.',
      rules: { need: [['melony', 'to', 'You are answering Melony.'], ['ben', 'any', 'Copy Ben: the decision is theirs with him.']], never: [['jonathan', 'Never copy the listing agent on your client&rsquo;s decision.']], subj: ['contingenc', 'cr-b', 'benedict', '1634', 'sign'] },
      choices: [
        { ok: true, label: 'Explain the effect; connect them',
          preview: 'Facts about the deposit; Ben and Ryan help them decide.',
          body: "Hi Melony,\n\nHere is what it means: once every contingency is removed, your $110,850 deposit could be at risk if the loan or the appraisal falls through. Whether to sign is your decision with Ben. I have asked him to call you tonight, and I am checking with Ryan where the loan and appraisal stand. The seller's response expires on [expiration of the seller response].\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Tell her to sign',
          preview: 'Everyone removes contingencies this way.',
          fb: 'Telling clients to sign is advice about their risk. Explain the facts and send them to Ben.',
          body: "Hi Melony,\n\nYes, sign it. Everyone removes contingencies this way.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Tell her not to sign',
          preview: 'It is too risky before the appraisal.',
          fb: 'This is also advice. The TC explains what is at stake, the agent advises.',
          body: "Hi Melony,\n\nDon't sign. Removing the loan contingency before the appraisal is too risky.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" },
        { ok: false, label: 'Leave the loan section blank',
          preview: 'Nobody checks that part.',
          fb: 'Altering what a signed form removes is misleading and could put the deposit at risk.',
          body: "Hi Melony,\n\nSign it but leave the loan section blank; nobody checks that.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency" }
      ],
      ans: "Hi Melony,\n\nHere is what it means: once every contingency is removed, your $110,850 deposit could be at risk if the loan or the appraisal falls through. Whether to sign is your decision with Ben. I have asked him to call you tonight, and I am checking with Ryan where the loan and appraisal stand. The seller's response expires on Thursday, February 19.\n\nBest,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency",
      replyFrom: 'melony', replyBody: '<p>Thank you for explaining it so clearly. We talked with Ben and Ryan and we are comfortable signing in the morning.</p>' + MELONY_SIG, replyOpts: { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack' }
    });

    var crbForm = form('bc-crb', 'Check the signed CR-B', 'The buyers signed on Thursday morning. Open the CR-B and confirm it before you deliver it.', [
      { label: 'CR-B number', ans: ['2'], show: 'No. 2', ph: 'No.' },
      { label: 'What the buyers removed', kind: 'select', ans: 'all', show: 'Any and all buyer contingencies (paragraph 4)', options: [['all', 'Any and all buyer contingencies'], ['inv', 'Only the investigation contingency'], ['except', 'All except loan and appraisal']] },
      { label: 'Date signed', kind: 'date', ans: '2026-02-19', show: '02/19/2026', ph: 'mm/dd/yyyy' },
      { label: 'Seller credit agreed', kind: 'money', ans: 95000, show: '$95,000.00', ph: '$' }
    ]);
    var deliverTask = mailTask('bc-rr-deliver', 'Deliver the executed documents',
      'Send the executed RR No. 1, Addendum No. 1 and CR-B No. 2 to the listing agent and to escrow. Copy Ben.', 'e6_sent_deliver');
    compose({
      key: 'bc-rr-deliver', prompt: 'Deliver the executed RR, addendum and contingency removal',
      to: 'Jonathan Adams <jonathan.adams@carolwoodre.com>, Alicia Smith <alicia@nextdoorescrow.com>', cc: 'Ben Belack <ben.belack@theagencyre.com>',
      subj: 'Executed RR No. 1, Addendum No. 1 and CR-B No. 2: 1634 Benedict Canyon Dr',
      attach: ['rr', 'crb'],
      inst: 'Deliver before the 2/19 deadline. Give escrow the new credit and the work the seller must finish before final verification.',
      rules: {
        need: [['jonathan', 'to', 'Delivery goes to the listing agent: Jonathan in To.'], ['alicia', 'any', 'Escrow needs the executed documents to amend the instructions: add Alicia.'], ['ben', 'any', 'Copy Ben.']]
      },
      ans: "Hi Jonathan and Alicia,\n\nAttached are the fully executed documents for 1634 Benedict Canyon Dr (escrow 2064-AS):\n\n• RR No. 1 with the seller's response: $95,000 credit to the buyers at close\n• Addendum No. 1: Mr. Speedy Plumber to hydro-jet and scope the main sewer line and install a clean-out for the guest house line, with invoices and sign-offs, before final verification; photos come down now that contingencies are removed\n• CR-B No. 2: the buyers removed all contingencies, signed 2/19/2026\n\nAlicia, please amend the instructions for the $95,000 seller credit.\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var ack = inbox('e6_alicia_ack', 'alicia',
      '<p>Received, thank you. Amended instructions with the <strong>$95,000 seller credit</strong> go out today.</p>' +
      '<p>One heads-up: under the RPA, seller credits are limited to what the lender allows (the <strong>Lender Allowable Credit</strong>), usually the buyers&rsquo; actual closing costs. Please make sure Ryan at Chase approves the full $95,000.</p>' +
      ALICIA_SIG, { to: 'To: <strong>Maria Rodriguez</strong>, Jonathan Adams &middot; CC: Ben Belack' });

    var main = deck(6, [
      { label: 'RR No. 1', body: rrTerms + when('s6rr', function () { return readOk('e6_ben_rr'); }, rrForm),
        ok: function () { return formOk('bc-rr'); }, check: function () { if (readOk('e6_ben_rr')) caNewCheck('bc-rr'); },
        err: function () { return readOk('e6_ben_rr') ? 'Some RR terms do not match Ben&rsquo;s instructions.' : 'Open Ben&rsquo;s email in Mail first.'; } },
      { label: 'Seller Response', body: resp + crbQ + when('s6dec', function () { return readOk('e6_melony_crb'); }, crbDec),
        ok: function () { return readOk('e6_jon_resp') && replyOk('bc-crb-reply', 'e6_melony_crb_ok'); }, err: 'Read Jonathan&rsquo;s response and Melony&rsquo;s question, then answer her.' },
      { label: 'CR-B & Delivery', body: crbForm + deliverTask + ack,
        ok: function () { return formOk('bc-crb') && replyOk('bc-rr-deliver', 'e6_alicia_ack'); }, check: function () { caNewCheck('bc-crb'); },
        err: function () { return formOk('bc-crb') ? replyErr('Alicia') : 'Check the CR-B against the signed document.'; } }
    ], 'Continue to Step 7: Pre-Closing');

    return step(6, STEP_TITLES[6], 'Thu, Feb 12 – Thu, Feb 19, 2026',
      'Draft the buyers&rsquo; request for repair, handle the seller&rsquo;s counter and deliver the contingency removal before the extended deadline.',
      main, side([['Asked', '$165,700 credit'], ['Agreed', '$95,000 + Addendum No. 1']], ['rr', 'crb', 'inspect', 'sewer', 'geo', 'bie'], sideContacts(6)), true,
      { text: 'Seller response to RR No. 1 conditioned on contingency removal. Extended expiration:', days: 'Thu, Feb 19' });
  }

  /* ════════════════ Step 7 · Loan, title & pre-closing ════════════════ */
  function caNewStep6() {
    var title = inbox('e7_alicia_title', 'alicia',
      '<p>Good morning Maria,</p>' +
      '<p>Two reports for the file:</p>' +
      '<ol>' +
        '<li><strong>Preliminary report</strong> from Chicago Title (order FBSC2601151, David Hughes). Please look at the vesting, the two deeds of trust we need payoffs for, and what title requires from the trustee.</li>' +
        '<li><strong>City of LA 9A Report</strong> issued 2/17. It shows a <strong>Pending Lien Warning</strong> for LAFD brush clearance. I have asked LAFD for the release.</li>' +
      '</ol>' +
      '<p>Also, the City&rsquo;s water conservation ordinance applies: RetrofitLA will inspect on <strong>3/2</strong> for the <strong>LADWP Certificate of Compliance</strong>, which both sides sign before recording. I still need the buyers&rsquo; vesting.</p>' +
      ALICIA_SIG, { attach: ['prelim', 'city9a'] });
    var prelimForm = form('bc-prelim', 'Review the preliminary report', 'Open the prelim and record what matters for closing.', [
      { label: 'Title is vested in', kind: 'select', ans: 'trustee', show: 'Michael Cheringal, Trustee of The Michael Cheringal Separate Property Trust dated December 18, 2024', options: [['trustee', 'Michael Cheringal, Trustee of his Separate Property Trust'], ['individual', 'Michael J. Cheringal, a single man'], ['llc', 'Cheringal Holdings LLC']] },
      { label: 'Deeds of trust to pay off', kind: 'select', ans: '2', show: '2 (items 9 and 10)', options: [['1', '1'], ['2', '2'], ['3', '3']] },
      { label: 'Their original amounts combined', kind: 'money', ans: 3090000, show: '$3,090,000 ($2,340,000 + $750,000)', ph: '$' },
      { label: 'Title requires from the trustee', kind: 'select', ans: 'cert', show: 'A certification of trust (Probate Code 18100.5) or a copy of the trust', options: [['cert', 'A certification of trust (Probate Code 18100.5)'], ['probate', 'A probate court order'], ['hoa', 'An HOA estoppel letter']] },
      { label: 'Buyers&rsquo; vesting', kind: 'select', ans: 'tbd', show: 'Not decided: escrow needs written vesting instructions before signing', options: [['tbd', 'Still open: escrow needs written instructions before signing'], ['jt', 'Already set as joint tenants on the RPA'], ['none', 'Not needed with a loan']] }
    ]);

    var preclose = picker('bc-p-preclose', 'Build your pre-closing tracker',
      'In practice, start this tracker as soon as escrow opens. Pick what has to be cleared before recording. Several items are the seller side&rsquo;s to deliver: you track them so your buyers get clear title on time.', [
        { t: 'LAFD brush clearance lien release', sub: '9A Pending Lien Warning', ok: true },
        { t: 'LADWP Certificate of Compliance', sub: 'Water conservation · RetrofitLA', ok: true },
        { t: 'Certification of trust from the trustee', sub: 'Title requirement', ok: true },
        { t: 'Payoff demands for both deeds of trust', sub: 'Prelim items 9 and 10', ok: true },
        { t: 'Buyers&rsquo; written vesting instructions', sub: 'Escrow', ok: true },
        { t: 'Mr. Speedy invoices and sewer video', sub: 'Addendum No. 1', ok: true },
        { t: 'HOA estoppel and transfer fee', sub: 'Common interest', ok: false },
        { t: 'Solar lease transfer', sub: 'Leased items', ok: false },
        { t: 'Withhold 15% for FIRPTA', sub: 'Seller signed a non-foreign affidavit', ok: false }
      ], 'The 9A lien warning, the LADWP certificate, the certification of trust, both payoffs, the buyers&rsquo; vesting and the addendum work all stand between you and recording. There is no HOA or solar, and FIRPTA withholding does not apply when the seller gives a non-foreign seller affidavit.');

    var ins = inbox('e7_ryan_ins', 'ryan',
      '<p>Hi Maria,</p>' +
      '<p>Two underwriting items on the Mahaarachchi loan:</p>' +
      '<ol>' +
        '<li><strong>Insurance with fire coverage.</strong> The property is in a Very High Fire Hazard Severity Zone and the buyers&rsquo; Aegis Specialty quote excludes fire. I need a <strong>California FAIR Plan</strong> fire policy plus the Aegis wrap policy, with Chase as mortgagee, by <strong>Friday 2/27</strong> to keep the 3/4 closing.</li>' +
        '<li><strong>Seller credit.</strong> We can only apply credits up to the buyers&rsquo; actual allowable closing costs. On the current estimate that is about <strong>$87,000</strong>, so not all of the $95,000 can be used.</li>' +
      '</ol>' +
      '<p>Ryan Cho<br>Senior Home Lending Advisor &middot; JPMorgan Chase Bank, N.A.</p>');
    var insTask = mailTask('bc-ins', 'Tell the buyers what the lender needs',
      'Explain the insurance condition and deadline to both buyers, and make sure Ben sees Ryan&rsquo;s note about the credit.', 'e7_sent_ins');
    compose({
      key: 'bc-ins', prompt: 'Explain the lender insurance condition to the buyers',
      to: 'Melony Mahaarachchi <melony.mahaarachchi@email.com>, Senaka Mahaarachchi <senaka.mahaarachchi@email.com>', cc: 'Ben Belack <ben.belack@theagencyre.com>, Ryan Cho <ryan.cho@chase.com>',
      subj: 'Insurance needed for Chase: 1634 Benedict Canyon Dr',
      inst: 'State what Chase needs, from whom and by when. Share Ryan&rsquo;s credit note as information for Ben; do not advise on it.',
      rules: {
        need: [['melony', 'to', 'The buyers have to buy the insurance: send this to them.'], ['senaka', 'any', 'Include both buyers.'], ['ben', 'any', 'Copy Ben: the credit note needs his attention.']],
        never: [['jonathan', 'The buyers&rsquo; insurance and loan conditions are not the seller side&rsquo;s business. Leave Jonathan off.']]
      },
      ans: "Hi Melony and Senaka,\n\nChase needs proof of homeowners insurance that covers fire before it can clear your loan to close. Because 1634 Benedict Canyon Dr is in a Very High Fire Hazard Severity Zone, the Aegis quote excludes fire, so Ryan needs:\n\n• A California FAIR Plan fire policy, and\n• The Aegis wrap policy for everything else,\nboth naming JPMorgan Chase as mortgagee.\n\nPlease have your insurance broker send the binders to Ryan Cho and to Alicia at Next Door Escrow by Friday 2/27 so we keep the 3/4 closing.\n\nBen, Ryan also noted that Chase can only apply seller credits up to the buyers' actual allowable closing costs (about $87,000 on the current estimate), so not all of the $95,000 may be usable.\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var insReply = inbox('e7_melony_ins', 'melony',
      '<p>Thanks for explaining it so clearly. Our broker bound the <strong>FAIR Plan</strong> and the <strong>Aegis</strong> wrap this afternoon and is sending both declarations to Ryan and Alicia.</p><p>Ben is calling us about the credit tonight.</p>' + MELONY_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Senaka, Ben Belack, Ryan Cho' });

    var audit = inbox('e7_ingrid_audit', 'ingrid',
      '<p>Hi Maria,</p>' +
      '<p>I reviewed the Benedict Canyon file in SkySlope. Two items before I can approve it for closing:</p>' +
      '<ol>' +
        '<li>The <strong>SPQ text overflow addendum</strong> has Melony&rsquo;s signature (2/17) but <strong>Senaka&rsquo;s signature is missing</strong>.</li>' +
        '<li>The <strong>AVIDs</strong> (Ben&rsquo;s from 2/6 and Jon&rsquo;s from 2/5) still need <strong>both buyers&rsquo; signatures</strong>. The DocuSign envelope is out and waiting.</li>' +
      '</ol>' +
      '<p>Ingrid Mejia<br>Transaction Compliance &middot; The Agency</p>', { attach: ['spq', 'avidStatus'] });
    var sigTask = mailTask('bc-sig', 'Get the missing signatures',
      'Ask Senaka to sign the SPQ addendum and both buyers to sign the AVID envelope. Copy Ben.', 'e7_sent_sig');
    compose({
      key: 'bc-sig', prompt: 'Request missing buyer signatures',
      to: 'Senaka Mahaarachchi <senaka.mahaarachchi@email.com>, Melony Mahaarachchi <melony.mahaarachchi@email.com>', cc: 'Ben Belack <ben.belack@theagencyre.com>',
      subj: 'Signatures needed: 1634 Benedict Canyon Dr',
      inst: 'Say exactly which documents are waiting, where to find them, and that they need to be signed before closing on 3/4.',
      rules: {
        need: [['senaka', 'to', 'Senaka is the one missing a signature: he goes in To.'], ['ben', 'any', 'Copy Ben.']],
        never: [['jonathan', 'This is an internal compliance item with your own clients. Leave the listing agent off.']]
      },
      ans: "Hi Senaka and Melony,\n\nOur compliance review found two items that need your signatures before closing on Wednesday 3/4:\n\n1. Senaka: the Seller Property Questionnaire text overflow addendum (Melony signed it on 2/17)\n2. Both of you: the AVID envelope in DocuSign (Ben's and Jonathan's visual inspection disclosures)\n\nBoth envelopes are in your inboxes from DocuSign. Let me know if you can't find them and I'll resend.\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var sigReply = inbox('e7_senaka_sig', 'senaka',
      '<p>Done: I just signed the SPQ addendum. Sorry, that one got buried in my inbox.</p>' +
      '<p>The AVID envelope won&rsquo;t open on my phone. I&rsquo;ll sign it from my laptop this week.</p>' + SENAKA_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Melony, Ben Belack' });

    var vpTask = mailTask('bc-vp', 'Schedule the final walk-through',
      'Your buyers have the right to a final verification of the property before closing. Set it up with the listing agent and ask for proof that the Addendum No. 1 work is done. Copy Ben.', 'e7_sent_vp');
    compose({
      key: 'bc-vp', prompt: 'Schedule the buyers&rsquo; final verification of property condition',
      to: 'Jonathan Adams <jonathan.adams@carolwoodre.com>', cc: 'Ben Belack <ben.belack@theagencyre.com>',
      subj: 'Final verification of property condition: 1634 Benedict Canyon Dr',
      inst: 'Propose a date and time before closing on 3/4, ask for the Mr. Speedy invoices and the sewer video from Addendum No. 1, and confirm the utilities stay on.',
      rules: {
        need: [['jonathan', 'to', 'Access to the property is through the listing agent: Jonathan in To.'], ['ben', 'any', 'Copy Ben: he walks the house with the buyers.']],
        never: [['melony', 'Confirm the time with Jonathan first, then tell the buyers.'], ['senaka', 'Confirm the time with Jonathan first, then tell the buyers.']]
      },
      ans: "Hi Jonathan,\n\nWe would like to schedule the buyers' final verification of property condition for 1634 Benedict Canyon Dr on Tuesday 3/3 at 10:00 AM, the day before closing.\n\nBefore then, please send the Mr. Speedy invoices and the sewer video for the work in Addendum No. 1 (hydro-jetting the main line and the new guest house clean-out), and confirm that gas, water and power will stay on.\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var vpReply = inbox('e7_jon_vp', 'jonathan',
      '<p>Tuesday 3/3 at 10:00 AM works. <strong>Mr. Speedy</strong> finished the hydro-jetting and the guest house clean-out on 2/25; I will send the invoices and the video link to you and Alicia today.</p>' +
      '<p>Utilities stay on through closing.</p>' + JON_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack' });

    var phish = inbox('e7_phish', 'melony',
      '<p>Maria, we just got this. Should we send the money today? We don&rsquo;t want to delay the closing.</p>' + MELONY_SIG +
      '<div style="margin-top:14px;padding:14px 16px;border:1px solid #e2e8f0;border-left:4px solid #94a3b8;border-radius:8px;background:#f8fafc;font-size:13px;color:#334155;">' +
        '<div style="font-size:12px;color:#64748b;margin-bottom:8px;">---------- Forwarded message ----------<br>' +
          'From: <strong>Alicia Smith</strong> &lt;alicia.smith@nextdoor-escrows.com&gt;<br>Date: Mon, Mar 2, 2026 at 11:31 AM<br>Subject: Updated wiring instructions: closing funds 2064-AS</div>' +
        '<p>Dear Buyers,</p>' +
        '<p>Due to an internal audit, our trust account has changed. Please send your closing funds of <strong>$628,150.00</strong> today to:</p>' +
        '<p>First Coastal Bank &middot; ABA 121000358 &middot; Account 7719 0042 1188<br>Beneficiary: Next Door Settlement Services</p>' +
        '<p>We are in closing meetings all day, so please <strong>do not call</strong>. Reply to this email once the wire is sent.</p>' +
        '<p>Alicia Smith, Escrow Officer</p>' +
      '</div>');
    var wireTask = mailTask('bc-wire-alert', 'Stop the wire',
      'Warn the buyers right away and bring in escrow and Ben.', 'e7_sent_wire');
    compose({
      key: 'bc-wire-alert', prompt: 'Warn the buyers about a wire fraud email',
      to: 'Melony Mahaarachchi <melony.mahaarachchi@email.com>, Senaka Mahaarachchi <senaka.mahaarachchi@email.com>', cc: 'Alicia Smith <alicia@nextdoorescrow.com>, Ben Belack <ben.belack@theagencyre.com>',
      subj: 'STOP: do not wire funds: 1634 Benedict Canyon Dr',
      inst: 'Tell them not to wire, name the red flags, and tell them to call Alicia at the number they already verified.',
      rules: {
        need: [['melony', 'to', 'The buyers are about to wire: they go in To.'], ['senaka', 'any', 'Warn both buyers.'], ['alicia', 'any', 'Escrow must know about the spoofed email: add the real Alicia.'], ['ben', 'any', 'Copy Ben.']]
      },
      ans: "Melony and Senaka,\n\nPlease DO NOT send any money based on that email. It is a fraud attempt:\n\n• It comes from nextdoor-escrows.com, not Next Door Escrow's real address (nextdoorescrow.com)\n• It changes the bank and asks you not to call\n• Next Door Escrow never changes wiring instructions by email\n\nBefore you wire your closing funds, call Alicia at (714) 264-7964, the same number you used for the deposit, and verify the instructions by phone. I have copied Alicia and Ben.\n\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var wireReply = inbox('e7_alicia_wire', 'alicia',
      '<p>Thank you, Maria. That email did <strong>not</strong> come from us. Our domain is nextdoorescrow.com and our wiring instructions have not changed: same bank as the deposit.</p>' +
      '<p>Melony and Senaka, I will call you now at the numbers on file. I have reported the lookalike domain.</p>' + ALICIA_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong>, Melony, Senaka &middot; CC: Ben Belack' });

    var main = deck(7, [
      { label: 'Title & City Reports', body: title + when('s7prelim', function () { return readOk('e7_alicia_title'); }, prelimForm),
        ok: function () { return formOk('bc-prelim'); }, check: function () { if (readOk('e7_alicia_title')) caNewCheck('bc-prelim'); },
        err: function () { return readOk('e7_alicia_title') ? 'Some answers do not match the preliminary report.' : 'Open Alicia&rsquo;s email in Mail first.'; } },
      { label: 'Pre-Closing List', body: preclose, ok: function () { return pickOk('bc-p-preclose'); }, err: 'Pick the pre-closing items. If a pick is wrong, use Try again.' },
      { label: 'Insurance', body: ins + when('s7ins', function () { return readOk('e7_ryan_ins'); }, insTask + insReply),
        ok: function () { return replyOk('bc-ins', 'e7_melony_ins'); }, err: function () { return readOk('e7_ryan_ins') ? replyErr('Melony') : 'Open Ryan&rsquo;s email in Mail first.'; } },
      { label: 'Compliance Audit', body: audit + when('s7sig', function () { return readOk('e7_ingrid_audit'); }, sigTask + sigReply),
        ok: function () { return replyOk('bc-sig', 'e7_senaka_sig'); }, err: function () { return readOk('e7_ingrid_audit') ? replyErr('Senaka') : 'Open Ingrid&rsquo;s email in Mail first.'; } },
      { label: 'Walk-through', body: vpTask + vpReply, ok: function () { return replyOk('bc-vp', 'e7_jon_vp'); }, err: replyErr('Jonathan') },
      { label: 'Wire Fraud', body: phish + when('s7wire', function () { return readOk('e7_phish'); }, wireTask + wireReply),
        ok: function () { return replyOk('bc-wire-alert', 'e7_alicia_wire'); }, err: function () { return readOk('e7_phish') ? replyErr('Alicia') : 'Open Melony&rsquo;s email in Mail first.'; } }
    ], 'Continue to Step 8: Closing');

    return step(7, STEP_TITLES[7], 'Fri, Feb 20 – Mon, Mar 2, 2026',
      'Everything that has to be true before recording: title, city reports, the lender&rsquo;s insurance condition, compliance signatures, the final walk-through and a wire fraud attempt.',
      main, side([['Contingencies', 'All removed Feb 19'], ['Insurance due', 'Fri, Feb 27']], ['prelim', 'city9a', 'lafd', 'retrofit', 'coc', 'spq', 'avidStatus', 'avidBA', 'avidLA', 'wfa', 'escrow'], sideContacts(7)), true,
      { text: 'Close of escrow (30 days after acceptance).', days: 'Wed, Mar 4' });
  }

  /* ════════════════ Step 8 · Closing & reconciliation ════════════════ */
  function caNewStep7() {
    var closed = inbox('e8_alicia_closed', 'alicia',
      '<p>Congratulations everyone: the grant deed for <strong>1634 Benedict Canyon Dr</strong> recorded this afternoon.</p>' +
      '<ul>' +
        '<li>3/2: RetrofitLA inspection. The <strong>LADWP Certificate of Compliance</strong> was signed by the buyers on 3/3 and by the seller on 3/4.</li>' +
        '<li>3/3: <strong>Seller&rsquo;s Affidavit</strong>: property delivered vacant, no leases or liens from its previous use, and photos removed from the sites the seller controls (with a good-faith effort on third-party sites such as Recovery.com).</li>' +
        '<li>3/3: Seller&rsquo;s FIRPTA affidavit (non-foreign seller, no withholding).</li>' +
        '<li>3/3: Buyers&rsquo; final walk-through with Ben; Verification of Property Condition signed.</li>' +
        '<li>3/4: Buyers approved the preliminary report; loan funded; recorded.</li>' +
      '</ul>' +
      '<p>The LAFD lien release letter is still in process; I will forward it as soon as it arrives.</p>' + ALICIA_SIG,
      { to: 'To: Ben Belack, Jonathan Adams &middot; CC: <strong>Maria Rodriguez</strong>', attach: ['coc', 'affidavit', 'firpta', 'prelimOk'] });

    var final = inbox('e8_alicia_final', 'alicia',
      '<p>Hi Maria,</p>' +
      '<p>Attached is the buyers&rsquo; <strong>final closing statement</strong>, plus the selling agent commission wire that went out today to UMRO Realty Corp dba The Agency. The LAFD release letter should arrive tomorrow.</p>' + ALICIA_SIG,
      { attach: ['closing', 'commission', 'commWire'] });
    var closeForm = form('bc-close', 'Reconcile the buyers&rsquo; closing statement', 'Compare the final statement with the contract and the RR.', [
      { label: 'Purchase price', kind: 'money', ans: 3695000, show: '$3,695,000.00', ph: '$' },
      { label: 'Deposit credited', kind: 'money', ans: 110850, show: '$110,850.00', ph: '$' },
      { label: 'New loan', kind: 'money', ans: 2956000, show: '$2,956,000.00', ph: '$' },
      { label: 'Seller credit on the statement', kind: 'money', ans: 87015.79, show: '$87,015.79', ph: '$' },
      { label: 'Credit agreed in RR No. 1 but not applied', kind: 'money', ans: 7984.21, show: '$7,984.21 ($95,000 − $87,015.79)', ph: '$' },
      { label: 'Why is it lower?', kind: 'select', ans: 'cap', show: 'Chase capped the credit at the buyers&rsquo; allowable closing costs (Lender Allowable Credit)', options: [['cap', 'The lender capped it at the buyers’ allowable closing costs'], ['error', 'Escrow made a math error'], ['seller', 'The seller changed the agreement']] },
      { label: 'Due to the buyers at close', kind: 'money', ans: 221.30, show: '$221.30', ph: '$' }
    ]);

    var commForm = form('bc-comm', 'Check the commission', 'Compare the compensation instructions with the outgoing wire.', [
      { label: 'Commission per the instructions', kind: 'money', ans: 92375, show: '$92,375.00', ph: '$' },
      { label: 'That amount is', kind: 'select', ans: '25', show: '2.5% of $3,695,000, as in the RPA and BRBC', options: [['25', '2.5% of the purchase price'], ['3', '3% of the purchase price'], ['flat', 'A flat fee']] },
      { label: 'Amount actually wired', kind: 'money', ans: 91975, show: '$91,975.00 (Mar 10, 2026)', ph: '$' },
      { label: 'Difference', kind: 'money', ans: 400, show: '$400.00', ph: '$' }
    ]);
    var commTask = mailTask('bc-comm-q', 'Ask escrow about the difference',
      'Before you log the commission, ask Alicia to explain the difference. Copy Ben.', 'e8_sent_comm');
    compose({
      key: 'bc-comm-q', prompt: 'Ask escrow about a commission discrepancy',
      to: 'Alicia Smith <alicia@nextdoorescrow.com>', cc: 'Ben Belack <ben.belack@theagencyre.com>',
      subj: 'Commission wire question: 1634 Benedict Canyon Dr (2064-AS)',
      inst: 'Give both amounts and ask for the breakdown or a correction. Stay factual; do not assume whose error it is.',
      rules: {
        need: [['alicia', 'to', 'Escrow disbursed the wire: ask Alicia.'], ['ben', 'any', 'Copy Ben: it is his commission.']],
        never: [['melony', 'Commission questions stay between the brokerage and escrow.'], ['senaka', 'Commission questions stay between the brokerage and escrow.'], ['jonathan', 'This is about our side&rsquo;s compensation only.']]
      },
      ans: "Hi Alicia,\n\nThank you for the final statement. One question on escrow 2064-AS before I log the commission:\n\n• Compensation instructions (2/10): $92,375.00 to The Agency (2.5% of $3,695,000)\n• Outgoing wire (3/10): $91,975.00\n\nThat is a $400.00 difference. Could you send the breakdown for the deduction, or a correction if it was not intended?\n\nThank you,\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var commReply = inbox('e8_alicia_comm', 'alicia',
      '<p>Good catch, Maria. You are right: the instructions say <strong>$92,375.00</strong> and the wire went out for <strong>$91,975.00</strong>.</p>' +
      '<p>I am pulling the disbursement ledger now. I will send you the backup for the $400 today, and if it was not an authorized charge we will wire the difference to UMRO Realty Corp dba The Agency.</p>' + ALICIA_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Ben Belack' });

    var wrapTask = mailTask('bc-wrapup', 'Close the loop with the buyers',
      'Congratulate the buyers and list what happens after closing. Copy Ben.', 'e8_sent_wrap');
    compose({
      key: 'bc-wrapup', prompt: 'Send the post-closing wrap-up to the buyers',
      to: 'Melony Mahaarachchi <melony.mahaarachchi@email.com>, Senaka Mahaarachchi <senaka.mahaarachchi@email.com>', cc: 'Ben Belack <ben.belack@theagencyre.com>',
      subj: 'Welcome home: 1634 Benedict Canyon Dr',
      inst: 'Congratulate them and list the post-closing items: supplemental tax bill, insurance renewals, home warranty, brush clearance, the AVID signature still open, and where their documents are.',
      rules: {
        need: [['melony', 'to', 'This goes to the buyers.'], ['senaka', 'any', 'Include both buyers.'], ['ben', 'any', 'Copy Ben.']]
      },
      ans: "Dear Melony and Senaka,\n\nCongratulations: 1634 Benedict Canyon Dr is officially yours! The deed recorded on Wednesday, March 4, 2026.\n\nA few things after closing:\n• Supplemental property tax bill: the county will reassess the home at the new price and send a supplemental bill (see the SPT notice you signed). It is not paid through your loan impounds.\n• Insurance: keep both the California FAIR Plan and the Aegis wrap policy active, and watch the renewal dates.\n• Home warranty: the seller did not pay for one, but the First American plan you ordered through escrow covers you for one year from closing.\n• Brush clearance: the home is in a Very High Fire Hazard Severity Zone; LAFD inspects every year.\n• Please sign the AVID envelope in DocuSign if you haven't yet. It is the last item for our file.\n\nYour final closing statement and all signed documents are archived in our file. Ask me anytime if you need a copy.\n\nIt was a pleasure working with you.\nMaria Rodriguez\nTransaction Coordinator for Ben Belack, The Agency"
    });
    var wrapReply = inbox('e8_ben_wrap', 'ben',
      '<p>Great work on this file, Maria. You kept a 30-day close with a trust seller, a fire-zone insurance problem, a fraud attempt and a big repair negotiation on schedule.</p>' +
      '<p>Senaka signed the AVIDs this morning, so the file is complete once Alicia sends the $400 backup.</p>' + BEN_SIG,
      { to: 'To: <strong>Maria Rodriguez</strong> &middot; CC: Melony, Senaka' });

    var evalBox = card('Workflow Validation & Performance Assessment',
      'Buyer-side transaction, from representation to recording.',
      '<div style="margin-bottom:14px;font-size:13.5px;color:var(--v-ink);line-height:1.6;">' +
        'You coordinated Ben Belack&rsquo;s buyer file for 1634 Benedict Canyon Dr from the buyer representation agreement to recording:' +
        '<ul style="margin:8px 0 14px;padding-left:22px;">' +
          '<li>Reviewed the Buyer Representation and Broker Compensation Agreement and collected what the file needed</li>' +
          '<li>Found the parcel and prepared the RPA offer package for a trust-owned property</li>' +
          '<li>Built the contract calendar, opened escrow, briefed the lender and kept the deposit wire safe</li>' +
          '<li>Caught that the TDS was required despite the trust, sent the disclosure package to the buyers for signature</li>' +
          '<li>Coordinated inspections without choosing vendors for the buyers</li>' +
          '<li>Drafted RR No. 1 and delivered the $95,000 agreement and the contingency removal on time</li>' +
          '<li>Tracked title, city, insurance and compliance items, set up the final walk-through and stopped a wire fraud attempt</li>' +
        '</ul>' +
      '</div>' +
      '<div id="wf-eval-container"></div>');

    var closeCheck = card('Closing checklist', 'Everything that had to happen before recording.',
      timeline([
        ['Feb 19', 'All contingencies removed (CR-B No. 2); $95,000 credit agreed.'],
        ['Feb 24', 'FAIR Plan + Aegis wrap bound for Chase.'],
        ['Mar 2', 'RetrofitLA inspection; SPQ addendum signed by Senaka; wire fraud email stopped.'],
        ['Mar 3', 'Final walk-through; buyers sign LADWP Certificate of Compliance; Seller&rsquo;s Affidavit and FIRPTA affidavit.'],
        ['Mar 4', 'Prelim approved, loan funded, grant deed recorded.']
      ]));

    var main = deck(8, [
      { label: 'Closing Day', body: closed + closeCheck, ok: function () { return readOk('e8_alicia_closed'); }, err: 'Open Alicia&rsquo;s email in Mail first.' },
      { label: 'Wrap-up', body: wrapTask + wrapReply +
          banner('s8done', function () { return replyOk('bc-wrapup', 'e8_ben_wrap'); }, '<strong>Transaction complete:</strong> buyer file closed and archived.') +
          when('s8eval', function () { return replyOk('bc-wrapup', 'e8_ben_wrap'); }, '<div style="margin-top:18px;">' + evalBox + '</div>' +
          '<div class="tc-finish-bar">' +
            '<div class="tc-finish-text"><strong>You finished the buyer-side case.</strong><span>Go back to the case list to pick another case, or run this one again from the start.</span></div>' +
            '<div class="tc-finish-actions">' +
              '<button type="button" class="tc-finish-btn ghost" onclick="wfRestartCase()">&#8635; Restart case</button>' +
              '<button type="button" class="tc-finish-btn primary" onclick="wfReset()">Exit simulator &rarr;</button>' +
            '</div>' +
          '</div>'),
        ok: function () { return replyOk('bc-wrapup', 'e8_ben_wrap'); }, err: replyErr('Ben') }
    ], null);

    return step(8, STEP_TITLES[8], 'Wed, Mar 4 – Tue, Mar 10, 2026',
      'The deed recorded. Close the loop with the buyers and wrap up the file.',
      main, side([['Status', 'Recorded Mar 4, 2026'], ['Seller credit applied', '$87,015.79']], ['closing', 'commission', 'commWire', 'coc', 'affidavit', 'firpta', 'prelimOk', 'lafd', 'retrofit', 'hw', 'rr'], sideContacts(8)), true);
  }

  window.caNewS8EvalRender = function () {
    if (typeof wfRenderFinalScore === 'function' && document.getElementById('wf-eval-container')) wfRenderFinalScore('wf-eval-container', 'tc', 'ca-new', 8);
  };

  /* ════════════════ Hints ("Ask Ben") ════════════════ */
  var STEP_HINTS = {
    0: [
      "Start with my email, then open the Buyer Representation and Broker Compensation Agreement from the Documents panel. Every term you need is on page 1.",
      "The agreement is exclusive, runs 01/20/2026 to 02/19/2026, covers Los Angeles County and sets 2.5%. Anything a seller pays us is credited against what the buyers owe, and for individual buyers the term can't run past 90 days.",
      "Intake file: the Buyer Representation and Broker Compensation Agreement plus the Disclosure Regarding Real Estate Agency Relationship. From me you need contacts and their full legal names and vesting. I will send the pre-approval and proof of funds when we write the offer. Never ask for Social Security numbers by email."
    ],
    1: [
      "Search the county assessor for 1634 Benedict Canyon and pick the parcel with the exact number. It will also tell you who owns it.",
      "In zipForm the offer package is the RPA, AD, PRBS, BIA, BHIA, WFA, FHDA, CCPA, FRR-PA and the Trust Advisory, because the owner is a trust. No listing, seller or post-acceptance forms.",
      "RPA: $3,695,000; deposit $110,850 (3%); loan $2,956,000 (80%) at up to 7.000%; COE 30 days; expires 02/02/2026; contingencies 21 / 14 / 12 / 7 / 7; seller pays us 2.5%; escrow seller's choice; home warranty waived; seller pays the NHD. APN 4356-007-010."
    ],
    2: [
      "Acceptance is when Jonathan delivered the signed acceptance: Monday, Feb 2. Count from there.",
      "The deposit is 3 business days (Thu Feb 5). Everything else is calendar days, and a deadline on a weekend or legal holiday moves to the next day. Feb 16 is Presidents' Day.",
      "Dates: Feb 5 deposit, Feb 9 seller documents, Feb 17 investigation and appraisal, Feb 23 loan, Mar 4 close. Send Ryan the executed RPA and those loan dates, copying Alicia. Never confirm wire instructions by email: the buyers call Alicia at (714) 264-7964."
    ],
    3: [
      "Read the Trust Advisory before you accept that the trust was exempt. Look at when Michael bought the house and when he created the trust.",
      "The SPQ has a Yes on insurance claims and notes on the pool; the NHD puts the lot in fire and seismic zones; the 2021 reports are historical.",
      "The TDS was required: Michael owned the home before his 2024 trust. Let me know the package arrived and mention the TDS issue. Then send the buyers the DocuSign envelope for their signatures. I will review the content with them."
    ],
    4: [
      "Access to a listed property goes through the listing agent. Give Jonathan a schedule he can approve.",
      "Buyers choose their own inspectors. Offer options, don't pick for them.",
      "Safety items in the summary: GFCI outlets, pool gates, smoke and CO detectors, and the foil tape on the gas vent. The rest is maintenance."
    ],
    5: [
      "RR No. 1 is exactly what I wrote: $165,700, dated 02/12/2026, with the Mr. Speedy addendum.",
      "When Melony asks whether to sign, explain what removing contingencies means and send the decision back to me. Don't tell her yes or no.",
      "CR-B No. 2 removes any and all contingencies, signed 02/19/2026, for a $95,000 credit. Deliver it to Jonathan and Alicia and copy me."
    ],
    6: [
      "The prelim shows who holds title and which loans must be paid off. The trustee has to prove his authority.",
      "Pre-closing: LAFD lien release, LADWP certificate, certification of trust, two payoffs, the buyers' vesting and the addendum invoices. No HOA, no solar, no FIRPTA withholding.",
      "Insurance goes to both buyers (FAIR Plan plus the Aegis wrap by 2/27), the signatures go to Senaka, the final walk-through is set with Jonathan for 3/3 with the Mr. Speedy invoices, and the fake wire email gets a STOP to the buyers with Alicia and me copied."
    ],
    7: [
      "The deed recorded. Send the buyers their post-closing wrap-up: supplemental tax, insurance renewals, brush clearance and the outstanding AVID signature.",
      "Congratulate them but keep it practical: list what they should watch for after closing, and tell them their documents are in our file."
    ]
  };

  /* ════════════════ EXPORT ════════════════ */
  window.WF_HINT_MENTOR = { initials: 'BB', name: 'Ben Belack', role: "Buyer's Agent &middot; Mentor", fab: 'Ask Ben' };
  var CASE_EXPORT = {
    getState: function () {
      tcMailSaveDraft();
      // Text fields normally commit on blur; also retain the field being typed.
      document.querySelectorAll('[data-tc-store]').forEach(function (field) {
        run()[field.dataset.tcStore + field.id] = field.value;
      });
      var slides = [];
      for (var i = 0; i <= 8; i++) slides[i] = window['_caNewSlide' + i];
      return { slides: slides, ss: SS_STATE, ssStage: window._caNewSsStage, decisions: DEC_LAST };
    },
    restoreState: function (state) {
      for (var i = 0; i <= 8; i++) {
        var slide = state.slides && state.slides[i];
        window['_caNewSlide' + i] = typeof slide === 'number' && slide >= 0 ? slide : 0;
      }
      SS_STATE = state.ss || {};
      window.SS_STATE = window.caNewSsState = SS_STATE;
      window._caNewSsStage = typeof state.ssStage === 'number' ? state.ssStage : null;
      DEC_LAST = state.decisions || {};
    },
    type: 'workflow',
    usePipeline: true,
    tag: 'California · Buyer Side · Real File',
    cover: '../assets/img/cases/ca-benedict.jpg',
    title: '1634 Benedict Canyon Dr: Buyer Transaction',
    headerProp: '1634 Benedict Canyon Dr · Buyer Side',
    subtitle: 'Beverly Hills, CA 90210 &middot; Single-Family &middot; Buyer Side',
    desc: 'A real buyer-side file from The Agency: from the buyer representation agreement to recording. Offer on a trust-owned home, escrow and deposit, seller disclosures, inspections, a $165,700 repair request, contingency removal, fire-zone insurance, wire fraud and the closing reconciliation.',
    stepCount: 8,
    specs: [
      { label: 'Purchase Price', value: '$3,695,000' },
      { label: 'Buyers', value: 'Melony &amp; Senaka Mahaarachchi' },
      { label: 'Seller', value: 'Michael Cheringal, Trustee' },
      { label: 'Key TC Scope', value: 'Trust Sale, RR, Fire Zone, Wire Fraud' }
    ],
    onReset: function () {
      if (typeof window.caNewResetCase === 'function') window.caNewResetCase();
    },
    wfLabels: [
      'Buyer Intake',
      'Writing the Offer',
      'Escrow & Deposit',
      'Seller Disclosures',
      'Inspections',
      'Repair & Removal',
      'Pre-Closing',
      'Closing'
    ],
    wfSteps: [caNewStep0, caNewStep1, caNewStep2, caNewStep3, caNewStep4, caNewStep5, caNewStep6, caNewStep7],
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
        window.caNewS8EvalRender();
      }
    }
  };
  return CASE_EXPORT;
  }

  window.TC_CA_NEW_CASE = window.tcCaseModule ? window.tcCaseModule(install) : install();
})();
