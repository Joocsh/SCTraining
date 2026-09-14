/* ══════════════════════════════════════════════════════════
   CASE SIMULATOR: Transaction Coordinator, Virginia
   Real case: 4232 Maplehurst Road, Virginia Beach, VA 23462
   Listing side (Shannon Paschall, AtCoastal Realty).
   Every date, amount and name below comes from the signed file:
   ratified REIN contract (02/22/2026), Addendum #1 (EMD), HOA resale
   certificate PMA-A08775 and CIC-2, Keff/Spec home inspection,
   Eliminator WDI and moisture reports, PICRA request, counter and
   ratified PICRA, Addendum #2 (negotiation period), PAA-1 (price and
   credit), FHA Amendatory Clause, closing date extension, walk through
   report, ALTA settlement statement (03/30/2026) and the AtCoastal CDA.
   Loaded before the page script; uses workflow.js helpers.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var DIR = '../assets/docs/tc-va/maplehurst/';
  var DOCS = {
    contract:   ['ratified-contract.pdf', 'Ratified purchase agreement', 'REIN, ratified 02/22/2026 · 29 pages'],
    convey:     ['items-to-convey.pdf', 'Items to convey', 'Contract ¶15'],
    add1:       ['addendum-1-emd-form-of-payment.pdf', 'Addendum #1: EMD form of payment', 'Signed by buyers 02/23/2026'],
    check:      ['emd-check-redacted.pdf', 'EMD check #0001', '$500 · dated 02/23/2026 · bank line redacted'],
    hoa:        ['hoa-resale-certificate.pdf', 'HOA resale certificate', 'PMA-A08775 · prepared 01/20/2026'],
    cic2:       ['cic-2-resale-certificate-receipt.pdf', 'CIC-2 receipt acknowledgement', 'Received 02/23/2026'],
    hoamail:    ['hoa-appendix-15-inquiry.pdf', 'Appendix 15 inquiry and reply', 'PMA emails 03/03 and 03/04'],
    inspection: ['home-inspection-report.pdf', 'Home inspection report', 'Keff/Spec LLC · 02/22/2026 · 60 pages'],
    wdi:        ['wdi-report.pdf', 'WDI report (NPMA-33)', 'Eliminator · 02/24/2026'],
    moisture:   ['moisture-report.pdf', 'Moisture report', 'Eliminator · 02/24/2026'],
    invoice:    ['wdi-moisture-invoice.pdf', 'WDI and moisture invoice', '$90.00'],
    picra:      ['picra-buyer-request.pdf', "Buyers' PICRA request", 'PAA-7A · 02/25/2026'],
    counter:    ['picra-seller-counter.pdf', 'Seller counter', 'Signed 02/28 and 03/01/2026'],
    add2:       ['addendum-2-negotiation-extension.pdf', 'Addendum #2: negotiation period', 'Signed 03/02/2026'],
    picraok:    ['picra-ratified.pdf', 'Ratified PICRA', 'Removal Acceptance 03/06/2026'],
    paa1:       ['paa-1-price-and-credit.pdf', 'PAA-1: $290,000 and $5,000 credit', 'Buyers signed 03/06/2026'],
    fha:        ['fha-amendatory-clause.pdf', 'FHA Amendatory Clause', '$290,000 · Archer Mortgage'],
    hoaupdate:  ['hoa-financial-update-order.pdf', 'HOA financial update order', 'PMA-A08954 · 03/20/2026'],
    extend:     ['addendum-closing-date-extension.pdf', 'Addendum: closing date extension', 'Mar 17 to Mar 30 · signed 03/27'],
    walk:       ['walk-through-report.pdf', 'Walk through report', 'Buyers signed 03/30/2026'],
    alta:       ['alta-settlement-statement.pdf', 'ALTA settlement statement', 'RW Towne Title · 03/30/2026'],
    cda:        ['commission-disbursement-authorization.pdf', 'Commission disbursement (CDA)', 'AtCoastal Realty · 04/01/2026']
  };

  var ICON_DOC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  var ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';

  /* ---------- per run state (reset every time the workflow starts) ---------- */
  function run() {
    var sc = typeof wfActiveScenario !== 'undefined' ? wfActiveScenario : null;
    if (!sc) return {};
    if (sc._mhFor !== sc._decisions) { sc._mh = {}; sc._mhFor = sc._decisions; }
    return sc._mh;
  }
  function record(ok) {
    var sc = typeof wfActiveScenario !== 'undefined' ? wfActiveScenario : null;
    if (sc && sc._decisions) sc._decisions.push({ correct: !!ok });
    /* on the last step the score is already on screen, keep it current */
    if (document.getElementById('wf-eval-container')) wfRenderFinalScore('wf-eval-container', 'tc', 'va', 4);
  }

  /* ---------- building blocks ---------- */
  window.mhOpen = function (key) {
    var d = DOCS[key];
    if (d) wfOpenDoc(DIR + d[0], d[1]);
  };

  function side(facts, docs) {
    var h = '<aside class="mh-side">';
    if (facts && facts.length) {
      h += '<h5>Case file</h5><ul class="mh-facts">';
      facts.forEach(function (f) { h += '<li><span>' + f[0] + '</span><b>' + f[1] + '</b></li>'; });
      h += '</ul>';
    }
    if (docs && docs.length) {
      h += '<h5>Documents</h5><div class="mh-docs">';
      docs.forEach(function (k) {
        var d = DOCS[k];
        h += '<button type="button" class="mh-doc" onclick="mhOpen(\'' + k + '\')">' + ICON_DOC +
             '<span><b>' + d[1] + '</b><small>' + d[2] + '</small></span></button>';
      });
      h += '</div>';
    }
    return h + '</aside>';
  }

  function step(n, title, date, lead, main, aside, last) {
    return '<div class="wf-step-wrap">' +
      '<div class="mh-top"><div class="wf-step-label-row">Step ' + n + ': ' + title + '</div>' +
      (date ? '<span class="mh-date">' + ICON_CAL + date + '</span>' : '') + '</div>' +
      '<p class="mh-lead">' + lead + '</p>' +
      '<div class="mh-grid"><div class="mh-main">' + main + '</div>' + aside + '</div>' +
      (last ? '' : wfNav(n > 1)) +
      '</div>';
  }

  function card(title, sub, body) {
    return '<div class="mh-card"><h4>' + title + '</h4>' + (sub ? '<p class="mh-sub">' + sub + '</p>' : '') + body + '</div>';
  }

  function timeline(items) {
    return '<ul class="mh-tl">' + items.map(function (i) {
      return '<li><span class="d">' + i[0] + '</span><span class="t">' + i[1] + '</span></li>';
    }).join('') + '</ul>';
  }

  /* ---------- decisions (answer kept when you go back and forth) ---------- */
  var DEC = {};
  function decision(id, q, choices, fb) {
    /* the right answer should not always sit in the same spot */
    var k = 0;
    for (var c = 0; c < id.length; c++) k += id.charCodeAt(c);
    k = k % choices.length;
    choices = choices.slice(k).concat(choices.slice(0, k));
    DEC[id] = { q: q, choices: choices, fb: fb };
    return '<div id="' + id + '">' + decisionHtml(id) + '</div>';
  }
  function decisionHtml(id) {
    var d = DEC[id], a = run()['d_' + id];
    var answered = a !== undefined;
    var h = '<div class="lc-scenario-box"><h3>' + esc(d.q) + '</h3>';
    d.choices.forEach(function (c, i) {
      var cls = 'lc-choice';
      if (answered && c.ok) cls += ' correct';
      if (answered && i === a && !c.ok) cls += ' wrong';
      h += '<button class="' + cls + '"' + (answered ? ' disabled' : '') + ' onclick="mhDecide(\'' + id + '\',' + i + ')">' + esc(c.t) + '</button>';
    });
    if (answered) {
      var ok = d.choices[a].ok;
      h += '<div class="lc-fb show ' + (ok ? 'good' : 'bad') + '"><strong>' + (ok ? 'Right call.' : 'Worth reconsidering.') + '</strong> ' + esc(d.fb) + '</div>';
    }
    return h + '</div>';
  }
  window.mhDecide = function (id, i) {
    var st = run();
    if (st['d_' + id] !== undefined) return;
    st['d_' + id] = i;
    record(DEC[id].choices[i].ok);
    var el = document.getElementById(id);
    if (el) el.innerHTML = decisionHtml(id);
  };

  /* ---------- fill in forms, checked against the file ---------- */
  var FORMS = {};
  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toDate(v) {
    v = String(v || '').trim().toLowerCase();
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
    if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    m = /(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{2,4})/.exec(v);
    if (m) { var y = +m[3]; if (y < 100) y += 2000; return y + '-' + pad(+m[1]) + '-' + pad(+m[2]); }
    m = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/.exec(v);
    if (m) return (m[3] || '2026') + '-' + pad(MONTHS[m[1]]) + '-' + pad(+m[2]);
    return '';
  }
  function toMoney(v) {
    var s = String(v || '').replace(/[^0-9.]/g, '');
    return s === '' ? NaN : parseFloat(s);
  }
  function norm(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9%]/g, ''); }

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
        h += '<select id="' + id + '-' + i + '" onchange="mhSave(\'' + id + '\',' + i + ',this.value)"><option value="">Choose</option>';
        r.options.forEach(function (o) { h += '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; });
        h += '</select>';
      } else {
        h += '<input type="text" id="' + id + '-' + i + '" value="' + esc(v) + '" placeholder="' + (r.ph || '') + '" oninput="mhSave(\'' + id + '\',' + i + ',this.value)">';
      }
      h += '<span class="mh-ans' + (st['s_' + id] ? ' show' : '') + '">File says: ' + r.show + '</span></div>';
    });
    h += '</div><div class="mh-actions"><button class="mh-btn" onclick="mhCheck(\'' + id + '\')">' + (opts.btn || 'Check against the file') + '</button>' +
         '<span class="mh-result' + (res ? (res.indexOf(false) > -1 ? ' bad' : ' good') : '') + '" id="' + id + '-res">' + resultText(rows, res) + '</span>' +
         '<button class="mh-link" id="' + id + '-show" style="' + (res && res.indexOf(false) > -1 ? '' : 'display:none') + '" onclick="mhShow(\'' + id + '\')">Show what the file says</button></div>';
    return card(title, sub, h);
  }
  function resultText(rows, res) {
    if (!res) return '';
    var n = res.filter(Boolean).length;
    return n === rows.length ? 'All ' + n + ' match the file.' : n + ' of ' + rows.length + ' match. Fix the red ones.';
  }
  window.mhSave = function (id, i, v) {
    var st = run();
    (st['v_' + id] = st['v_' + id] || [])[i] = v;
  };
  window.mhCheck = function (id) {
    var rows = FORMS[id], st = run();
    var res = rows.map(function (r, i) {
      var el = document.getElementById(id + '-' + i);
      var v = el ? el.value : '';
      mhSave(id, i, v);
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
  };
  window.mhShow = function (id) {
    run()['s_' + id] = 1;
    document.querySelectorAll('[id^="' + id + '-row"] .mh-ans').forEach(function (e) { e.classList.add('show'); });
  };

  /* ---------- pick every item that applies ---------- */
  var PICKS = {};
  function picker(id, title, sub, items, fb) {
    PICKS[id] = { items: items, fb: fb };
    return card(title, sub, '<div id="' + id + '">' + pickerHtml(id) + '</div>');
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
      h += '<button type="button" class="' + cls + '" onclick="mhToggle(\'' + id + '\',' + i + ')"><i></i><span>' + it.t +
           (it.sub ? '<small>' + it.sub + '</small>' : '') + '</span></button>';
    });
    h += '</div>';
    if (done) {
      var right = p.items.every(function (it, i) { return (on.indexOf(i) > -1) === it.ok; });
      h += '<div class="lc-fb show ' + (right ? 'good' : 'bad') + '" style="margin-top:12px"><strong>' +
           (right ? 'Exactly right.' : 'Green is right, red was picked wrong or missed.') + '</strong> ' + p.fb + '</div>';
    } else {
      h += '<div class="mh-actions"><button class="mh-btn" onclick="mhPickCheck(\'' + id + '\')">Check</button></div>';
    }
    return h;
  }
  window.mhToggle = function (id, i) {
    var st = run();
    if (st['pd_' + id]) return;
    var on = st['p_' + id] = st['p_' + id] || [];
    var k = on.indexOf(i);
    if (k > -1) on.splice(k, 1); else on.push(i);
    document.getElementById(id).innerHTML = pickerHtml(id);
  };
  window.mhPickCheck = function (id) {
    var st = run(), p = PICKS[id], on = st['p_' + id] || [];
    st['pd_' + id] = 1;
    record(p.items.every(function (it, i) { return (on.indexOf(i) > -1) === it.ok; }));
    document.getElementById(id).innerHTML = pickerHtml(id);
  };

  /* ---------- graded email (same grading flow as every other case) ---------- */
  function compose(o) {
    return '<div class="wf-compose">' +
      '<div class="wf-compose-header">' +
        '<div class="wf-compose-field"><span class="wf-compose-lbl">To:</span><input type="text" value="' + esc(o.to) + '" readonly></div>' +
        (o.cc ? '<div class="wf-compose-field"><span class="wf-compose-lbl">CC:</span><input type="text" value="' + esc(o.cc) + '" readonly></div>' : '') +
        '<div class="wf-compose-field"><span class="wf-compose-lbl">Subject:</span><input type="text" id="wf-' + o.key + '-subj" value="' + esc(o.subj) + '"></div>' +
      '</div>' +
      (o.attach ? '<div class="mh-attach">' + o.attach.map(function (a) { return '<span>&#128206; ' + a + '</span>'; }).join('') + '</div>' : '') +
      '<div class="wf-compose-body">' +
        '<textarea id="wf-' + o.key + '-body" data-role="tc" data-scenario="' + o.scenario + '" placeholder="' + esc(o.ph) + '"></textarea>' +
        '<div style="margin-top:10px"><button class="btn sm" id="wf-' + o.key + '-body-btn" onclick="SCApp.submitEmailStep({textareaId:\'wf-' + o.key + '-body\', statusElId:\'wf-' + o.key + '-body-status\', btnId:\'wf-' + o.key + '-body-btn\', role:\'tc\', scenarioId:\'' + o.scenario + '\', scenarioPrompt:\'' + o.prompt + '\', maxScore:5})">Submit for grading</button></div>' +
        '<div id="wf-' + o.key + '-body-status" class="small" style="margin-top:6px"></div>' +
      '</div></div>';
  }

  /* shared option lists */
  var D_MAR1 = [['2026-02-28', 'Sat, Feb 28'], ['2026-03-01', 'Sun, Mar 1'], ['2026-03-02', 'Mon, Mar 2'], ['2026-03-03', 'Tue, Mar 3']];

  /* ════════════════ Step 1: Ratified contract ════════════════ */
  function vaStep0() {
    var main =
      '<div class="wf-email">' +
        '<div class="wf-email-header"><div class="wf-email-subject">Ratified! 4232 Maplehurst Road</div>' +
          '<div class="wf-email-meta">' +
            '<div class="wf-email-row"><span class="wf-email-row-lbl">From:</span> Shannon Paschall &lt;Shannon@shannonsellsva.com&gt;</div>' +
            '<div class="wf-email-row"><span class="wf-email-row-lbl">To:</span> Transaction Coordinator</div>' +
            '<div class="wf-email-row"><span class="wf-email-row-lbl">Date:</span> Sunday, February 22, 2026</div>' +
          '</div></div>' +
        '<div class="wf-email-body"><p>Maplehurst is ratified! The buyers are Sergio and Jasmin Malonzo with Karen Archbell at BHHS RW Towne Realty, FHA loan through Archer Mortgage.</p>' +
          '<p>The fully signed contract is in the file. Please set up the deal, get the dates on the calendar and send everything out.</p>' +
          '<div class="wf-sig">Shannon Paschall · AtCoastal Realty</div></div>' +
      '</div>' +
      form('va-sheet', 'Build the file sheet', 'Open the ratified purchase agreement on the right and copy each term from the signed pages. The agreement starts on PDF page 2.', [
        { label: 'Ratification date', hint: 'PDF p.2', kind: 'date', ans: '2026-02-22', ph: 'mm/dd/yyyy', show: '02/22/2026 (ratification box, line 41)' },
        { label: 'Buyers', hint: 'line 2', kind: 'text', ans: ['malonzo'], ph: 'Full names', show: 'Sergio P Malonzo, Jr. and Jasmin Malonzo' },
        { label: 'Purchase price', hint: '¶3', kind: 'money', ans: 285000, ph: '$', show: '$285,000' },
        { label: 'Loan type', hint: '¶3', kind: 'text', ans: ['fha'], ph: 'Conventional, FHA, VA...', show: 'FHA, $267,500 loan and $17,500 down' },
        { label: 'Deposit', hint: '¶2', kind: 'money', ans: 500, ph: '$', show: '$500.00' },
        { label: 'Escrow agent', hint: '¶2', kind: 'text', ans: ['rwtowne', 'bhhs', 'berkshire'], ph: 'Who holds the deposit', show: 'BHHS RW Towne Realty' },
        { label: 'Settlement date', hint: '¶8, PDF p.5', kind: 'date', ans: '2026-03-17', ph: 'mm/dd/yyyy', show: 'On or before 03/17/2026' },
        { label: 'Repair cap', hint: '¶13, PDF p.8', kind: 'text', ans: ['1%', '2850'], ph: '% or $', show: '1% of the price, $2,850' }
      ]) +
      decision('va-d-preapproval',
        'The pre approval letter on PDF page 1 shows a $272,181 loan, but ¶3 of the contract finances $267,500. What do you do with that difference?',
        [
          { t: 'Nothing is wrong. Line 38 lets the FHA upfront mortgage insurance be financed: $267,500 plus 1.75% is $272,181. Note it and move on.', ok: true },
          { t: "Ask the buyer's agent for a corrected contract, because the loan amounts have to match exactly.", ok: false },
          { t: "Change the file sheet to a $272,181 loan, since the lender's letter overrides the contract.", ok: false }
        ],
        "The contract states the base loan. The lender's figure adds the financed FHA upfront premium (1.75% of $267,500 is $4,681). Knowing why two numbers differ keeps you from sending a false alarm to four people on day one.");
    return step(1, 'Ratified Contract', 'Sun, Feb 22, 2026',
      'You coordinate the <strong>listing side</strong> for Shannon Paschall. Every fact you use from here on comes from the signed pages, not from an email summary.',
      main,
      side([['Property', '4232 Maplehurst Rd'], ['Legal', 'Timberlake Sec 5, Bk A, Lot 15'], ['Seller', 'Jemal O Tamem'], ['Listing agent', 'Shannon Paschall'], ['Selling agent', 'Karen Archbell'], ['Lender', 'Archer Mortgage']], ['contract']));
  }

  /* ════════════════ Step 2: Deadlines ════════════════ */
  function vaStep1() {
    var main =
      form('va-dates', 'Put the deadlines on the calendar', 'Count from ratification on Sunday, Feb 22. Day 1 is Monday, Feb 23.', [
        { label: 'Deposit at the escrow agent', hint: '2 business days, ¶2', kind: 'select', ans: '2026-02-24', show: 'Tue, Feb 24',
          options: [['2026-02-23', 'Mon, Feb 23'], ['2026-02-24', 'Tue, Feb 24'], ['2026-02-25', 'Wed, Feb 25'], ['2026-02-26', 'Thu, Feb 26']] },
        { label: 'Loan application at Archer Mortgage', hint: '7 days, ¶6A', kind: 'select', ans: '2026-03-01', show: 'Sun, Mar 1', options: D_MAR1 },
        { label: 'WDI and moisture reports to settlement agent', hint: '7 days, ¶13B', kind: 'select', ans: '2026-03-01', show: 'Sun, Mar 1', options: D_MAR1 },
        { label: 'Inspection reports and PICRA to Listing Firm', hint: '7 days, PAA-7 ¶2A', kind: 'select', ans: '2026-03-01', show: 'Sun, Mar 1', options: D_MAR1 },
        { label: 'Settlement', hint: '¶8', kind: 'select', ans: '2026-03-17', show: 'Tue, Mar 17',
          options: [['2026-03-10', 'Tue, Mar 10'], ['2026-03-17', 'Tue, Mar 17'], ['2026-03-20', 'Fri, Mar 20'], ['2026-03-24', 'Tue, Mar 24']] },
        { label: 'Latest settlement with the 10 day extension', hint: 'loan or title only, ¶8', kind: 'select', ans: '2026-03-27', show: 'Fri, Mar 27',
          options: [['2026-03-24', 'Tue, Mar 24'], ['2026-03-27', 'Fri, Mar 27'], ['2026-03-31', 'Tue, Mar 31'], ['2026-04-01', 'Wed, Apr 1']] }
      ]) +
      decision('va-d-ratdate',
        'The first line of the agreement is dated 02/19/2026, the day the buyers wrote the offer. The ratification box says 02/22/2026. Which date do the deadlines count from?',
        [
          { t: '02/22/2026. ¶2 defines ratification as the final written acceptance by buyer and seller, and every timeframe runs from it.', ok: true },
          { t: '02/19/2026, because that is the date the agreement was made.', ok: false },
          { t: 'Whichever date gives the buyers more time.', ok: false }
        ],
        'Counting from 02/19 would put every deadline three days early, and you could end up telling the seller a contingency had expired when it had not.');
    return step(2, 'Deadlines', 'Sun, Feb 22, 2026',
      'In REIN contracts a <strong>day</strong> is any calendar day, a <strong>business day</strong> is Monday to Friday except federal holidays, and a timeframe starts at 12:00 a.m. after the event that triggers it.',
      main,
      side([['Ratified', 'Sun, Feb 22'], ['Clocks start', 'Mon, Feb 23'], ['Repair cap', '1% · $2,850']], ['contract']));
  }

  /* ════════════════ Step 3: Seller email ════════════════ */
  function vaStep2() {
    var main =
      card('What the seller needs to hear', 'Plain language. The seller does not read contracts for a living.',
        '<ul style="margin:0;padding-left:18px;font-size:13.5px;line-height:1.7;color:var(--v-ink)">' +
          '<li>$285,000 with FHA financing, settlement on or before <b>Tue, Mar 17</b></li>' +
          '<li>$500 deposit held by BHHS RW Towne Realty</li>' +
          '<li>Buyer inspections happen this week, so the home must be accessible</li>' +
          '<li>What conveys: electric range, 1 refrigerator, dishwasher, 1 disposal, blinds and hardware, all smoke alarms and ceiling fans, 1 trash and 1 recycling container</li>' +
          '<li>Utilities stay on through the walk through (¶13D)</li>' +
        '</ul>') +
      compose({ key: 'seller', scenario: 'tc-va-seller-detail', prompt: 'Seller detail email, 4232 Maplehurst Road VA (ratified 02/22/2026)',
        to: 'Jemal O Tamem (seller)', cc: 'Shannon Paschall <Shannon@shannonsellsva.com>', subj: 'You are under contract: 4232 Maplehurst Road',
        attach: ['Ratified contract', 'Items to convey', 'Utility form', 'Walk through form'],
        ph: 'Write the seller email here. Cover the price and settlement date, the deposit, access for inspections, what conveys and keeping utilities on.' });
    return step(3, 'Seller Email', 'Mon, Feb 23, 2026',
      'The seller gets a clear summary on day one: what was agreed, what happens next and what the seller has to do.',
      main,
      side([['Settlement', 'Tue, Mar 17'], ['Deposit', '$500'], ['Reports due', 'Sun, Mar 1']], ['contract', 'convey']));
  }

  /* ════════════════ Step 4: Distribute ════════════════ */
  function vaStep3() {
    var main =
      picker('va-p-dist', 'Who gets the ratified contract?', 'Select every party that should receive it today.', [
        { t: 'Karen Archbell', sub: 'Selling agent, BHHS RW Towne Realty', ok: true },
        { t: 'Joel C. Gueli', sub: 'RW Towne Title LLC, settlement agent', ok: true },
        { t: 'Brad Watts', sub: "Archer Mortgage, the buyers' lender", ok: true },
        { t: 'AtCoastal Realty compliance', sub: 'Ratified file intake', ok: true },
        { t: 'Caplan Law Group', sub: "Seller's deed preparation", ok: true },
        { t: 'Sergio and Jasmin Malonzo', sub: 'The buyers, directly', ok: false },
        { t: 'Bobbi Wood', sub: "Buyer's agent on the January contract", ok: false },
        { t: 'Pest Heroes', sub: 'Inspector hired under the January contract', ok: false }
      ], 'Anything for the buyers goes through their agent (¶23). The January names belong to an earlier contract on this home that did not close; sending them this one shares a new buyer\'s terms with people who have no role in the file.') +
      compose({ key: 'dist', scenario: 'tc-va-distribute-contract', prompt: 'Distribute ratified contract email, 4232 Maplehurst Road VA',
        to: 'Karen Archbell <karen@karenarchbell.com>, Joel Gueli <Joel.Gueli@rwtownetitle.com>, Brad Watts <brad@archermortgagellc.com>, AtCoastal compliance, Caplan Law Group',
        cc: 'Shannon Paschall <Shannon@shannonsellsva.com>', subj: 'Ratified contract: 4232 Maplehurst Road (02/22/2026)',
        attach: ['Ratified contract'],
        ph: 'Attach the contract, give each party the dates that matter to them (loan application and reports by Mar 1, settlement Mar 17) and ask everyone to confirm receipt.' });
    return step(4, 'Distribute to Parties', 'Mon, Feb 23, 2026',
      'Send the contract to everyone who needs it to do their part, and only to them. This home had a contract in January that did not close, so old names are still in the file.',
      main,
      side([['Title', 'RW Towne Title LLC'], ['Escrow officer', 'Joel C. Gueli'], ['Lender', 'Brad Watts'], ['Selling agent', 'Karen Archbell']], ['contract']));
  }

  /* ════════════════ Step 5: EMD ════════════════ */
  function vaStep4() {
    var main =
      decision('va-d-emdform',
        "¶2 says the deposit is paid by 'other: Earnest'. On Monday the buyer's agent sends a photo of a personal check. What do you do?",
        [
          { t: 'Get the change in writing: an amendment switching the form of payment to personal check, then confirm BHHS RW Towne Realty has the check by Tuesday.', ok: true },
          { t: 'Accept it. The amount is right, so the form of payment does not matter.', ok: false },
          { t: 'Reject the check and tell the buyers they are in breach.', ok: false }
        ],
        'A deposit paid differently than the contract says invites a breach argument later. In this file Addendum #1, dated 02/23/2026, changed the form of payment from Other Earnest to personal check, and both buyers signed it that day.') +
      form('va-emd', 'Log the deposit', 'Use the check and Addendum #1.', [
        { label: 'Amount', kind: 'money', ans: 500, ph: '$', show: '$500.00' },
        { label: 'Payable to', kind: 'text', ans: ['rwtowne', 'bhhs', 'berkshire'], ph: 'Escrow agent', show: 'BHHS RW Towne Realty' },
        { label: 'Check date', kind: 'date', ans: '2026-02-23', ph: 'mm/dd/yyyy', show: '02/23/2026' },
        { label: 'On time?', hint: 'due Tue, Feb 24', kind: 'select', ans: 'yes', show: 'Yes, a day early', options: [['yes', 'Yes'], ['no', 'No']] },
        { label: 'Escrow agent deposits it by', hint: '¶5A', kind: 'select', ans: '5', show: '5 business banking days after receipt',
          options: [['0', 'The same day'], ['5', '5 business banking days after receipt'], ['s', 'At settlement']] }
      ]) +
      compose({ key: 'emd', scenario: 'tc-va-emd-confirmation', prompt: 'EMD confirmation email, 4232 Maplehurst Road VA ($500 personal check, Addendum #1)',
        to: 'Joel Gueli <Joel.Gueli@rwtownetitle.com>, Brad Watts <brad@archermortgagellc.com>, Karen Archbell <karen@karenarchbell.com>',
        cc: 'Shannon Paschall <Shannon@shannonsellsva.com>', subj: 'Deposit received: 4232 Maplehurst Road',
        attach: ['EMD check #0001', 'Addendum #1'],
        ph: 'Confirm the $500 deposit (check dated 02/23/2026) is with BHHS RW Towne Realty and share Addendum #1.' });
    return step(5, 'EMD', 'Mon, Feb 23, 2026',
      'The deposit is due at <strong>BHHS RW Towne Realty</strong> by Tuesday, Feb 24. Check what arrives against the contract before you report it as received.',
      main,
      side([['Deposit', '$500'], ['Due', 'Tue, Feb 24'], ['Held by', 'BHHS RW Towne']], ['check', 'add1', 'contract']));
  }

  /* ════════════════ Step 6: HOA resale certificate ════════════════ */
  function vaStep5() {
    var main =
      card('What happened', '',
        timeline([
          ['Jan 20', 'PMA prepares resale certificate <b>PMA-A08775</b> for Timberlake Community Association on behalf of the seller.'],
          ['Feb 23', "The buyer's agent receives the certificate. The buyers acknowledge it on the <b>CIC-2</b>, signed Mar 3."],
          ['Mar 3', "Diana Martinez, Shannon's operations manager, writes to PMA about Appendix 15."],
          ['Mar 4', 'David Lukus, association manager, replies in writing.']
        ])) +
      form('va-hoa', 'Check the certificate', 'Open the certificate and the CIC-2.', [
        { label: 'Receipt date on the CIC-2', kind: 'date', ans: '2026-02-23', ph: 'mm/dd/yyyy', show: '02/23/2026' },
        { label: 'Buyers can cancel until 11:59 PM on', hint: '3 days', kind: 'select', ans: '2026-02-26', show: 'Thu, Feb 26',
          options: [['2026-02-25', 'Wed, Feb 25'], ['2026-02-26', 'Thu, Feb 26'], ['2026-02-27', 'Fri, Feb 27'], ['2026-03-02', 'Mon, Mar 2']] },
        { label: 'Monthly assessment', hint: 'Appendix 4', kind: 'money', ans: 53.80, ph: '$', show: '$53.80, due the 1st of each month' },
        { label: "Seller's balance as of 01/20/2026", hint: 'Appendix 5', kind: 'money', ans: 56.36, ph: '$', show: '$56.36, paid at closing' }
      ]) +
      decision('va-d-app15',
        "Appendix 15 says: 'At this time, it is unknown whether or not there are any alterations to the unit that violate the association.' What do you do?",
        [
          { t: "Ask the association manager in writing for a definitive answer on violations, then keep the reply in the file and share it with the buyer's agent.", ok: true },
          { t: 'Ignore it. Every certificate has boilerplate.', ok: false },
          { t: 'Tell the buyers there are no violations, since the seller would have mentioned them.', ok: false }
        ],
        'Unknown is not an answer a buyer can rely on. Here David Lukus replied on Mar 4 that the line was a placeholder left in by mistake and that a visual inspection of the front found no issues. That email now protects everyone.') +
      '<div class="lc-callout-warn">The contract lists HOA fees of <b>$50.00</b> a month (¶14A). The certificate shows <b>$53.80</b>. Flag it now so the closing figures use the current amount.</div>';
    return step(6, 'HOA Resale Certificate', 'Feb 23 to Mar 4, 2026',
      '4232 Maplehurst is in <strong>Timberlake Community Association</strong>, managed by Property Management Associates (PMA). Virginia gives the buyers 3 days to cancel after they receive the resale certificate, so the delivery date matters.',
      main,
      side([['Association', 'Timberlake Community Assn'], ['Manager', 'PMA · David Lukus'], ['Phone', '757-646-6247'], ['Order', 'PMA-A08775']], ['hoa', 'cic2', 'hoamail']));
  }

  /* ════════════════ Step 7: Inspections ════════════════ */
  function vaStep6() {
    var main =
      card('What came back', '',
        timeline([
          ['Feb 22', '<b>Home inspection</b>, Keff/Spec LLC (John Keffer). Townhome built in 1977, 60 page report.'],
          ['Feb 24', '<b>WDI and moisture</b>, Eliminator Termite Pest &amp; Moisture Control (Eric Trotter). No visible wood destroying insects, no treatment recommended. Slab foundation, so the moisture findings are N/A. Invoice $90, paid by the buyers.'],
          ['Feb 25', "<b>Buyers' PICRA</b> (PAA-7A): 15 repairs, each assigned to a licensed roofing, plumbing, electrical or HVAC contractor."]
        ]) +
        '<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700;font-size:13px;color:var(--v-cyan-d)">See the 15 requested repairs</summary>' +
        '<ul style="margin:8px 0 0;padding-left:18px;font-size:12.5px;line-height:1.6;color:var(--v-ink)">' +
          '<li><b>Roofing:</b> evaluate roof deck staining for leaks; replace missing and loose soffits front and rear; secure loose rake board wrap on the left side</li>' +
          '<li><b>Plumbing:</b> loose toilets in hall and primary bath; missing stop valves at primary and half bath sinks; dripping front hose bib; leaking shower and tub controls; broken gate valve handle in the utility room; loose shower arm in the primary bath; kitchen sprayer; seized disposal and missing dishwasher hose clamp</li>' +
          '<li><b>Electrical:</b> primary bedroom ceiling fan light has no power; GFCI protection within six feet of the kitchen sink; shorted GFCI outlet in the hall bath</li>' +
          '<li><b>HVAC:</b> clean, evaluate and repair the system</li>' +
        '</ul></details>') +
      picker('va-p-picra', "Review the buyers' PICRA", 'Select every statement that is true.', [
        { t: 'It arrived on time: Feb 25 is before the Mar 1 deadline.', ok: true },
        { t: 'A complete copy of the inspection reports has to go with it.', ok: true },
        { t: 'Inspection items the buyers left off the list are waived.', ok: true },
        { t: 'The seller now has to make all 15 repairs.', ok: false },
        { t: 'The WDI report requires termite treatment before closing.', ok: false },
        { t: 'Agreed PICRA repairs count against the 1% repair cap.', ok: false }
      ], 'A PICRA is only a request until both sides sign it. Agreed PICRA repairs sit outside the 1% cap, and the clean WDI report means nothing is owed under ¶13B.') +
      decision('va-d-oldreports',
        'Pages 26 to 29 of the ratified contract PDF hold moisture and WDI reports from Pest Heroes (the WDI is dated Jan 19, 2026), left over from the January contract. Karen asks if those count for this sale. What do you say?',
        [
          { t: 'No. ¶13B requires the buyers to obtain reports within 7 days of this ratification. Make sure the Eliminator reports from Feb 24 reach the settlement agent by Mar 1.', ok: true },
          { t: 'Yes, a clean report is a clean report.', ok: false },
          { t: 'Yes, as long as they are less than 90 days old.', ok: false }
        ],
        'Those reports were ordered for a different buyer under a different contract. The buyers here ordered their own on Feb 24, which is what ¶13B asks for.');
    return step(7, 'Inspections', 'Feb 22 to Feb 25, 2026',
      'The buyers moved fast: the home inspection happened the day of ratification and the WDI and moisture inspection two days later. On Feb 25 Karen delivers the buyers\' repair request.',
      main,
      side([['Home inspector', 'Keff/Spec LLC'], ['WDI and moisture', 'Eliminator'], ['PICRA delivered', 'Wed, Feb 25'], ['Negotiation ends', 'Mon, Mar 2']], ['inspection', 'wdi', 'moisture', 'invoice', 'picra']));
  }

  /* ════════════════ Step 8: PICRA negotiation ════════════════ */
  function vaStep7() {
    var main =
      card('The paper trail', '',
        timeline([
          ['Feb 25', 'Buyers deliver the PICRA. The 5 day negotiation period runs through <b>Mon, Mar 2</b>.'],
          ['Mar 1', 'Seller counter, signed by Shannon (Feb 28) and the seller (Mar 1): <b>no repairs</b>, sold as is; price raised to <b>$290,000</b>; seller credit of <b>$5,000</b> toward closing costs, prepaids and lender approved expenses; subject to an appraisal of at least $290,000.'],
          ['Mar 2', '<b>Addendum #2</b> extends the negotiation period until March 6, 2026.'],
          ['Mar 6', 'Buyers initial the counter. <b>Removal Acceptance Date 03/06/2026</b>, verified by Karen Archbell. Buyers sign the PAA-1 for the new price and credit.']
        ])) +
      decision('va-d-extend',
        'It is Monday, Mar 2. The counter is still being discussed and the negotiation period ends tonight. What do you do?',
        [
          { t: 'Get a written addendum extending the negotiation period, signed by buyers and seller before 11:59 PM.', ok: true },
          { t: 'Nothing. While the parties are still talking, the deadline pauses.', ok: false },
          { t: 'Tell Karen on the phone that the seller will wait a few more days.', ok: false }
        ],
        'When the period ends the buyers get one additional day to terminate, and after that either side may terminate (PAA-7 ¶2B). Only a signed extension keeps the deal safe, and Addendum #2 did exactly that.') +
      form('va-picra', 'Update the file sheet', 'Use the ratified PICRA and the PAA-1.', [
        { label: 'New purchase price', kind: 'money', ans: 290000, ph: '$', show: '$290,000' },
        { label: 'Seller credit', kind: 'money', ans: 5000, ph: '$', show: '$5,000 toward closing costs and prepaids' },
        { label: 'Repairs the seller will make', kind: 'select', ans: 'none', show: 'None, sold as is',
          options: [['all', 'All 15'], ['some', 'Roof and plumbing only'], ['none', 'None, sold as is']] },
        { label: 'Removal Acceptance Date', kind: 'date', ans: '2026-03-06', ph: 'mm/dd/yyyy', show: '03/06/2026' },
        { label: 'Appraisal must come in at least at', kind: 'money', ans: 290000, ph: '$', show: '$290,000' }
      ]) +
      '<div class="lc-callout-info">Why this works for the seller: the $5,000 price increase and the $5,000 credit cancel out on the seller\'s side, while the buyers finance their closing costs instead of paying them in cash. It only holds if the appraisal supports $290,000.</div>';
    return step(8, 'PICRA Negotiation', 'Feb 25 to Mar 6, 2026',
      'The seller will not do repairs. Instead of a flat no, the seller counters with a different price. Follow the paper and keep the negotiation period alive.',
      main,
      side([['PICRA delivered', 'Wed, Feb 25'], ['Period ends', 'Mon, Mar 2'], ['Selling agent', 'Karen Archbell'], ['Listing agent', 'Shannon Paschall']], ['counter', 'add2', 'picraok', 'paa1']));
  }

  /* ════════════════ Step 9: Financing and closing date ════════════════ */
  function vaStep8() {
    var main =
      card('What happened', '',
        timeline([
          ['Mar 6', 'Send Archer Mortgage the ratified PICRA and the PAA-1 so the loan and appraisal run at $290,000.'],
          ['Mar 11', 'Buyers sign the <b>FHA Amendatory Clause</b> at $290,000 on Mar 11 and 12 (loan originator Brad Watts). The seller signs on Mar 26.'],
          ['Mar 17', 'The original settlement date passes without a closing.'],
          ['Mar 20', "Shannon's team orders a <b>financial update</b> of the resale package from PMA (order PMA-A08954)."],
          ['Mar 27', '<b>Addendum</b> moves closing from March 17 to <b>March 30, 2026</b>. Buyers and Shannon sign.']
        ])) +
      form('va-fin', 'Keep the dates straight', '', [
        { label: 'Buyers authorize the appraisal by', hint: '3 days after PICRA removal, ¶6A', kind: 'select', ans: '2026-03-09', show: 'Mon, Mar 9',
          options: [['2026-03-06', 'Fri, Mar 6'], ['2026-03-09', 'Mon, Mar 9'], ['2026-03-13', 'Fri, Mar 13'], ['2026-03-16', 'Mon, Mar 16']] },
        { label: 'Appraised value the FHA clause requires', kind: 'money', ans: 290000, ph: '$', show: '$290,000' },
        { label: 'Last day the automatic extension reaches', hint: '¶8', kind: 'select', ans: '2026-03-27', show: 'Fri, Mar 27',
          options: [['2026-03-20', 'Fri, Mar 20'], ['2026-03-24', 'Tue, Mar 24'], ['2026-03-27', 'Fri, Mar 27'], ['2026-03-31', 'Tue, Mar 31']] },
        { label: 'New settlement date', kind: 'date', ans: '2026-03-30', ph: 'mm/dd/yyyy', show: '03/30/2026' }
      ]) +
      decision('va-d-closing',
        'It is Monday, Mar 16, and settlement is not going to happen on Mar 17. What is the right move?',
        [
          { t: 'Tell both agents now and get a signed addendum with a new settlement date. The 10 day extension only covers loan processing or title defects, and it ends Mar 27.', ok: true },
          { t: 'Nothing. The contract extends itself for as long as the loan needs.', ok: false },
          { t: 'Ask title to move the closing on their calendar. That is enough.', ok: false }
        ],
        'In this file the extension was signed on Mar 27, the last day the automatic extension reached. It worked, but push for the signature days earlier: if the date had slipped past Mar 27 without an addendum, either side could have terminated (¶8).');
    return step(9, 'Financing & Closing Date', 'Mar 6 to Mar 27, 2026',
      'A higher price means the lender, the appraisal and the FHA paperwork all have to catch up, and the Mar 17 settlement date starts to look tight.',
      main,
      side([['Lender', 'Archer Mortgage'], ['Loan officer', 'Brad Watts'], ['PICRA removed', 'Fri, Mar 6'], ['Settlement', 'Tue, Mar 17']], ['fha', 'hoaupdate', 'extend']));
  }

  /* ════════════════ Step 10: Closing day ════════════════ */
  function vaStep9() {
    var main =
      '<div class="wf-signed-banner">&#10003; Walk through signed by the buyers at 11:22 AM: property in substantially the same condition, no repairs necessary.</div>' +
      form('va-alta', 'Audit the ALTA settlement statement', 'Find each figure on the statement and confirm it matches what you papered.', [
        { label: 'Sale price', kind: 'money', ans: 290000, ph: '$', show: '$290,000.00' },
        { label: 'Seller credit to the buyers', kind: 'money', ans: 5000, ph: '$', show: '$5,000.00' },
        { label: 'Deposit credited to the buyers', kind: 'money', ans: 500, ph: '$', show: '$500.00' },
        { label: 'Compensation to AtCoastal Realty', kind: 'money', ans: 5800, ph: '$', show: '$5,800.00' },
        { label: "Seller's net proceeds", hint: 'Balance Due TO', kind: 'money', ans: 171729.53, ph: '$', show: '$171,729.53' },
        { label: "Buyers' cash due at closing", hint: 'Balance Due FROM', kind: 'money', ans: 500, ph: '$', show: '$500.00' }
      ]) +
      decision('va-d-hoadues',
        'The ALTA charges HOA dues at $53.80 a month, but the contract says $50.00. Do you ask title to change it?',
        [
          { t: 'No. The resale certificate shows the current assessment is $53.80. The contract figure was out of date.', ok: true },
          { t: 'Yes. The contract controls every number on the statement.', ok: false },
          { t: 'Yes, and ask the seller to refund the difference.', ok: false }
        ],
        'Title charges what the association actually bills. $53.80 matches Appendix 4 of the certificate and the March dues line, which is why you flagged the difference back in step 6.');
    return step(10, 'Closing Day', 'Mon, Mar 30, 2026',
      'Walk through in the morning, then settlement at <strong>RW Towne Title LLC</strong> (file 22026-67041, escrow officer Joel C. Gueli). Before anyone signs, check the numbers against the file.',
      main,
      side([['Loan', '$283,970 FHA'], ['VHDA payoffs', '$97,149.98'], ['Home warranty', '$700, buyer'], ['WDI invoice', '$90, buyer']], ['walk', 'alta', 'paa1']));
  }

  /* ════════════════ Step 11: After closing ════════════════ */
  function vaStep10() {
    var main =
      form('va-cda', 'Match the CDA to the ALTA', "AtCoastal Realty's commission disbursement authorization, signed Apr 1 by principal broker Jon McAchran.", [
        { label: 'Listing commission', kind: 'money', ans: 5800, ph: '$', show: '$5,800.00' },
        { label: 'Commission as a % of $290,000', kind: 'money', ans: 2, ph: '%', show: '2%' },
        { label: 'Transaction fee charged to the seller', kind: 'money', ans: 595, ph: '$', show: '$595.00 (LA Admin Fee on the ALTA)' },
        { label: 'Net pay due to the agent', kind: 'money', ans: 6261.63, ph: '$', show: '$6,261.63 to Shannon Paschall, Inc.' }
      ]) +
      compose({ key: 'close', scenario: 'tc-va-post-closing', prompt: 'Post closing confirmation email, 4232 Maplehurst Road VA (settled 03/30/2026)',
        to: 'Shannon Paschall <Shannon@shannonsellsva.com>', cc: 'AtCoastal Realty compliance', subj: 'Closed: 4232 Maplehurst Road (03/30/2026)',
        attach: ['ALTA settlement statement', 'CDA'],
        ph: 'Confirm settlement on 03/30/2026 at $290,000, the CDA amounts, and that the full file is archived.' }) +
      '<div class="wf-score-card">' +
        '<div class="wf-score-header">Workflow Validation: 4232 Maplehurst Road</div>' +
        [
          'Built the file sheet from the signed contract and explained the FHA loan difference',
          'Calendared every deadline from the 02/22/2026 ratification',
          'Sent the seller a plain language summary',
          'Distributed the contract to the right parties and left out the January names',
          'Papered the change to a personal check and logged the $500 deposit',
          'Checked the HOA certificate, the cancellation window and Appendix 15',
          "Reviewed the reports and the buyers' PICRA",
          'Kept the negotiation alive with Addendum #2 and logged $290,000 with a $5,000 credit',
          'Handled the appraisal, FHA clause and the move to Mar 30',
          'Audited the ALTA before signing',
          'Matched the CDA and archived the file'
        ].map(function (t) { return '<div class="wf-score-row"><div class="wf-score-dot done"></div><span>' + t + '</span></div>'; }).join('') +
      '</div>' +
      '<div id="wf-eval-container"></div>' +
      '<div class="lc-result" style="margin-top:16px">' +
        '<div class="lc-result-pct" style="font-size:36px">&#10003;</div>' +
        '<p><strong>Full Transaction Workflow Complete.</strong></p>' +
        '<p style="font-size:13.5px;color:var(--v-muted)">You took 4232 Maplehurst Road from ratification on Feb 22 to settlement on Mar 30: deadlines, a deposit change, the HOA certificate, an as is counter, a closing date extension and the final numbers.</p>' +
        '<div class="lc-result-actions">' +
          '<button class="lc-result-btn primary" onclick="wfRestart()">Restart Workflow</button>' +
          '<button class="lc-result-btn outline" onclick="wfReset()">Back to Scenarios</button>' +
        '</div></div>' +
      '<div class="wf-nav"><button class="wf-nav-btn outline" onclick="wfPrev()">&larr; Previous</button></div>';
    return step(11, 'After Closing', 'Wed, Apr 1, 2026',
      'The sale closed. Tie the brokerage paperwork to the settlement statement, send the wrap up and close the file.',
      main,
      side([['Settled', 'Mon, Mar 30'], ['Price', '$290,000'], ['Broker', 'Jon McAchran']], ['cda', 'alta']), true);
  }

  window.TC_VA_CASE = {
    type: 'workflow', tag: 'Virginia · Real Case', title: '4232 Maplehurst Road: Full Transaction Workflow',
    desc: 'A real Virginia Beach townhome sale on the listing side, from ratification on Feb 22 to settlement on Mar 30, 2026: deadlines, a deposit change, the HOA certificate, an as is counter with a price increase and seller credit, and a closing date extension.',
    stepCount: 11,
    wfLabels: ['Ratified Contract', 'Deadlines', 'Seller Email', 'Distribute to Parties', 'EMD', 'HOA Resale Certificate', 'Inspections', 'PICRA Negotiation', 'Financing & Closing Date', 'Closing Day', 'After Closing'],
    wfSteps: [vaStep0, vaStep1, vaStep2, vaStep3, vaStep4, vaStep5, vaStep6, vaStep7, vaStep8, vaStep9, vaStep10],
    wfAfterRender: { 10: function () { wfRenderFinalScore('wf-eval-container', 'tc', 'va', 4); } }
  };
})();
