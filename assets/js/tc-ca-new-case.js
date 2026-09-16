/* ══════════════════════════════════════════════════════════
   CASE SIMULATOR: Transaction Coordinator, California
   Fictional case: 4827 Rolando Blvd, San Diego, CA 92115
   Buyer side (Kevin Tran, Keller Williams).
   A standard conventional purchase from accepted offer through
   close of escrow: a pre-1978 lead disclosure, a foundation
   crack and termite finding, a repair credit negotiation under
   Day 17 pressure, an appraisal gap requiring a price amendment,
   a wire fraud attempt, and the post-closing wrap-up.
   Loaded before the page script; uses workflow.js helpers.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var DIR = '../assets/docs/tc-ca-new/';
  var DOCS = {
    rpa:       ['purchase-agreement.pdf', 'C.A.R. RPA', 'Residential Purchase Agreement · $860,000 · ratified Oct 3'],
    sco:       ['seller-counter-offer.pdf', 'Seller Counter Offer', '$875,000 · Oct 2, 2025'],
    bco:       ['buyer-counter-offer.pdf', 'Buyer Counter Offer', '$860,000 · accepted Oct 3, 2025'],
    tds:       ['tds-disclosure.pdf', 'Transfer Disclosure Statement', 'Completed by Patricia &amp; Raymond Ochoa'],
    spq:       ['spq-questionnaire.pdf', 'Seller Property Questionnaire', 'Completed by sellers'],
    nhd:       ['nhd-report.pdf', 'Natural Hazard Disclosure', 'JCP-LGS · Seismic Hazard Zone (liquefaction)'],
    avid:      ['avid-inspection.pdf', 'Agent Visual Inspection', 'Completed by Maria Gutierrez, Compass'],
    lead:      ['lead-paint-disclosure.pdf', 'Lead-Based Paint Disclosure', 'Required · home built 1961 (pre-1978)'],
    prelim:    ['preliminary-title-report.pdf', 'Preliminary Title Report', 'Fidelity National Title Company'],
    inspect:   ['home-inspection-report.pdf', 'Home Inspection Report', 'Precision Home Inspections · Oct 14'],
    termite:   ['termite-report.pdf', 'Termite / WDO Report', 'Atlas Pest Control · #WDO-2025-4128'],
    foundation:['foundation-assessment.pdf', 'Foundation Assessment', 'Pacific Foundation Engineering · Oct 17'],
    rr:        ['request-for-repair.pdf', 'Request for Repair (C.A.R. RR)', 'Buyer request · $12,550 · Oct 18'],
    sellerRR:  ['seller-response-rr.pdf', 'Seller Response to RR', '$4,500 credit counter · Oct 19'],
    amend1:    ['amendment-1-repair-credit.pdf', 'Amendment #1: Repair Credit', '$4,500 credit at closing · Oct 20'],
    appraisal: ['appraisal-summary.pdf', 'Appraisal Summary', 'Appraised at $845,000 · Oct 23'],
    extAppr:   ['contingency-extension-appraisal.pdf', 'Appraisal Contingency Extension', 'Extended to Oct 27 · signed Oct 21'],
    amend2:    ['amendment-2-price-reduction.pdf', 'Amendment #2: Price Reduction', '$860,000 &rarr; $852,500 · Oct 25'],
    wireFraud: ['wire-fraud-email-screenshot.pdf', 'Wire Fraud Email (Training)', 'Spoofed email from "jwlash@fnf-escrow.com"'],
    settlement:['settlement-statement.pdf', 'Settlement Statement', 'ALTA · Fidelity National Title · Nov 3']
  };

  var ICON_DOC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  var ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';

  function run() {
    var sc = typeof wfActiveScenario !== 'undefined' ? wfActiveScenario : null;
    if (!sc) return {};
    if (sc._mhFor !== sc._decisions) { sc._mh = {}; sc._mhFor = sc._decisions; }
    return sc._mh;
  }
  function record(ok) {
    var sc = typeof wfActiveScenario !== 'undefined' ? wfActiveScenario : null;
    if (sc && sc._decisions) sc._decisions.push({ correct: !!ok });
    if (document.getElementById('wf-eval-container')) wfRenderFinalScore('wf-eval-container', 'tc', 'ca-new', 4);
  }

  window.caNewOpen = function (key) {
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
        h += '<button type="button" class="mh-doc" onclick="caNewOpen(\'' + k + '\')">' + ICON_DOC +
             '<span><b>' + d[1] + '</b><small>' + d[2] + '</small></span></button>';
      });
      h += '</div>';
    }
    return h + '</aside>';
  }

  function step(n, title, date, lead, main, aside, last) {
    var nav = last ? '' : wfNav(n > 1);
    if (last === 'gated') nav = '<div class="wf-nav-gated" style="display:none">' + wfNav(n > 1) + '</div>';
    return '<div class="wf-step-wrap">' +
      '<div class="mh-top"><div class="wf-step-label-row">Step ' + n + ': ' + title + '</div>' +
      (date ? '<span class="mh-date">' + ICON_CAL + date + '</span>' : '') + '</div>' +
      '<p class="mh-lead">' + lead + '</p>' +
      '<div class="mh-grid"><div class="mh-main">' + main + '</div>' + aside + '</div>' +
      nav + '</div>';
  }

  function card(title, sub, body) {
    return '<div class="mh-card"><h4>' + title + '</h4>' + (sub ? '<p class="mh-sub">' + sub + '</p>' : '') + body + '</div>';
  }

  function timeline(items) {
    return '<ul class="mh-tl">' + items.map(function (i) {
      return '<li><span class="d">' + i[0] + '</span><span class="t">' + i[1] + '</span></li>';
    }).join('') + '</ul>';
  }

  /* ---------- decisions ---------- */
  var DEC = {};
  function decision(id, q, choices, fb) {
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
      h += '<button class="' + cls + '"' + (answered ? ' disabled' : '') + ' onclick="caNewDecide(\'' + id + '\',' + i + ')">' + esc(c.t) + '</button>';
    });
    if (answered) {
      var ok = d.choices[a].ok;
      h += '<div class="lc-fb show ' + (ok ? 'good' : 'bad') + '"><strong>' + (ok ? 'Right call.' : 'Worth reconsidering.') + '</strong> ' + esc(d.fb) + '</div>';
    }
    return h + '</div>';
  }
  window.caNewDecide = function (id, i) {
    var st = run();
    if (st['d_' + id] !== undefined) return;
    st['d_' + id] = i;
    record(DEC[id].choices[i].ok);
    var el = document.getElementById(id);
    if (el) el.innerHTML = decisionHtml(id);
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
    h += '</div><div class="mh-actions"><button class="mh-btn" onclick="caNewCheck(\'' + id + '\')">' + (opts.btn || 'Check against the file') + '</button>' +
         '<span class="mh-result' + (res ? (res.indexOf(false) > -1 ? ' bad' : ' good') : '') + '" id="' + id + '-res">' + resultText(rows, res) + '</span>' +
         '<button class="mh-link" id="' + id + '-show" style="' + (res && res.indexOf(false) > -1 ? '' : 'display:none') + '" onclick="caNewShow(\'' + id + '\')">Show what the file says</button></div>';
    return card(title, sub, h);
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
    if (all) { var g = document.querySelector('.wf-nav-gated'); if (g) g.style.display = ''; }
  };
  window.caNewShow = function (id) {
    run()['s_' + id] = 1;
    document.querySelectorAll('[id^="' + id + '-row"] .mh-ans').forEach(function (e) { e.classList.add('show'); });
  };

  /* ---------- chip pickers ---------- */
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
      h += '<button type="button" class="' + cls + '" onclick="caNewToggle(\'' + id + '\',' + i + ')"><i></i><span>' + it.t +
           (it.sub ? '<small>' + it.sub + '</small>' : '') + '</span></button>';
    });
    h += '</div>';
    if (done) {
      var right = p.items.every(function (it, i) { return (on.indexOf(i) > -1) === it.ok; });
      h += '<div class="lc-fb show ' + (right ? 'good' : 'bad') + '" style="margin-top:12px"><strong>' +
           (right ? 'Exactly right.' : 'Green is right, red was picked wrong or missed.') + '</strong> ' + p.fb + '</div>';
    } else {
      h += '<div class="mh-actions"><button class="mh-btn" onclick="caNewPickCheck(\'' + id + '\')">Check</button></div>';
    }
    return h;
  }
  window.caNewToggle = function (id, i) {
    var st = run();
    if (st['pd_' + id]) return;
    var on = st['p_' + id] = st['p_' + id] || [];
    var k = on.indexOf(i);
    if (k > -1) on.splice(k, 1); else on.push(i);
    document.getElementById(id).innerHTML = pickerHtml(id);
  };
  window.caNewPickCheck = function (id) {
    var st = run(), p = PICKS[id], on = st['p_' + id] || [];
    st['pd_' + id] = 1;
    record(p.items.every(function (it, i) { return (on.indexOf(i) > -1) === it.ok; }));
    document.getElementById(id).innerHTML = pickerHtml(id);
  };

  /* ---------- compose emails ---------- */
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

  /* ════════════════ Step 1: Accepted Offer ════════════════ */
  function caNewStep0() {
    var main =
      card('The file you just received', 'Maria Gutierrez (Compass, San Diego) emails you the executed contract package for 4827 Rolando Blvd.',
        '<div class="wf-email">' +
          '<div class="wf-email-header">' +
            '<div class="wf-email-subject">Executed! 4827 Rolando Blvd, San Diego</div>' +
            '<div class="wf-email-meta">' +
              '<div class="wf-email-row"><span class="wf-email-row-lbl">From:</span> Maria Gutierrez &lt;maria.gutierrez@compass.com&gt;</div>' +
              '<div class="wf-email-row"><span class="wf-email-row-lbl">To:</span> Transaction Coordinator</div>' +
              '<div class="wf-email-row"><span class="wf-email-row-lbl">Date:</span> October 3, 2025 &mdash; 5:18 PM</div>' +
            '</div>' +
          '</div>' +
          '<div class="wf-email-body">' +
            '<p>Hi,</p>' +
            '<p>We\'re in contract on Rolando Blvd. Took two rounds to get here:</p>' +
            '<ul>' +
              '<li><strong>Property:</strong> 4827 Rolando Blvd, San Diego, CA 92115 (APN 470-362-18-00)</li>' +
              '<li><strong>Sellers:</strong> Patricia Ochoa &amp; Raymond Ochoa (married, joint tenants)</li>' +
              '<li><strong>Buyers:</strong> Samantha Chen &amp; David Park</li>' +
              '<li><strong>List Price:</strong> $889,000</li>' +
              '<li><strong>Accepted Price:</strong> $860,000 (Seller countered at $875K, buyer came back at $860K, seller accepted)</li>' +
              '<li><strong>Escrow:</strong> Fidelity National Title, escrow #FNT-2025-09184</li>' +
              '<li><strong>Title:</strong> Fidelity National Title Company</li>' +
              '<li><strong>Close of Escrow:</strong> November 3, 2025</li>' +
              '<li><strong>Buyer\'s Agent:</strong> Kevin Tran, Keller Williams</li>' +
              '<li><strong>Financing:</strong> Conventional 20% down through CrossCountry Mortgage</li>' +
            '</ul>' +
            '<p>Heads up: the house was built in 1961, so we\'ll need the Lead-Based Paint disclosure in the package. The sellers are relocating to Phoenix and need this to close on time &mdash; they have a purchase closing there on November 12.</p>' +
            '<div class="wf-sig">' +
              'Maria Gutierrez | Compass, San Diego<br>' +
              '(619) 555-0234 | maria.gutierrez@compass.com' +
            '</div>' +
          '</div>' +
        '</div>') +
      form('ca2-sheet', 'Build the file sheet', 'Use the email and the purchase agreement on the right to fill in the key terms.', [
        { label: 'Acceptance date', kind: 'date', ans: '2025-10-03', ph: 'mm/dd/yyyy', show: '10/03/2025' },
        { label: 'Buyers', kind: 'text', ans: ['chen', 'park'], ph: 'Full names', show: 'Samantha Chen & David Park' },
        { label: 'Purchase price', kind: 'money', ans: 860000, ph: '$', show: '$860,000' },
        { label: 'Loan type', kind: 'text', ans: ['conventional'], ph: 'Conventional, FHA, VA...', show: 'Conventional, 20% down ($172,000)' },
        { label: 'Good faith deposit', kind: 'money', ans: 17200, ph: '$', show: '$17,200 (2% of purchase price)' },
        { label: 'Escrow holder', kind: 'text', ans: ['fidelity'], ph: 'Who holds the deposit', show: 'Fidelity National Title' },
        { label: 'Close of escrow', kind: 'date', ans: '2025-11-03', ph: 'mm/dd/yyyy', show: '11/03/2025' },
        { label: 'Year built', kind: 'text', ans: ['1961'], ph: 'Year', show: '1961 (pre-1978: Lead-Based Paint required)' }
      ]);
    return step(1, 'Accepted Offer', 'Fri, Oct 3, 2025',
      'You coordinate this file for the <strong>buyer side</strong>. Maria Gutierrez is the listing agent. Every fact you use from here on comes from the signed pages and the disclosure documents, not from the email summary.',
      main,
      side([['Property', '4827 Rolando Blvd'], ['APN', '470-362-18-00'], ['Sellers', 'Patricia & Raymond Ochoa'], ['Buyers', 'Samantha Chen & David Park'], ['Listing agent', 'Maria Gutierrez'], ['Buyer\'s agent', 'Kevin Tran']], ['rpa', 'sco', 'bco']),
      'gated');
  }

  /* ════════════════ Step 2: Disclosures Package ════════════════ */
  function caNewStep1() {
    var main =
      card('Statutory disclosure package', 'California requires the most extensive seller disclosure package in the country. Confirm what goes out to the buyers.',
        '<ul style="margin:0;padding-left:18px;font-size:13.5px;line-height:1.7;color:var(--v-ink)">' +
          '<li>Transfer Disclosure Statement (TDS) &mdash; completed by sellers &#10003;</li>' +
          '<li>Seller Property Questionnaire (SPQ) &mdash; completed by sellers &#10003;</li>' +
          '<li>Natural Hazard Disclosure (NHD) &mdash; ordered from JCP-LGS &#10003;</li>' +
          '<li>Agent Visual Inspection Disclosure (AVID) &mdash; completed by listing agent &#10003;</li>' +
          '<li><strong>Lead-Based Paint Disclosure</strong> &mdash; <strong>required, home built 1961 (pre-1978)</strong> &#10003;</li>' +
          '<li>Preliminary Title Report &mdash; ordered from Fidelity National Title &#10003;</li>' +
        '</ul>') +
      decision('ca2-d-lead',
        'The buyers ask if they can skip the 10-day lead inspection period since they want to move quickly. What is the correct response?',
        [
          { t: 'No. Federal law (42 U.S.C. §4852d) requires a 10-day opportunity to conduct a lead inspection for pre-1978 homes. The buyers can waive the inspection itself, but the disclosure and the opportunity must be provided.', ok: true },
          { t: 'Yes, the buyers can verbally agree to skip it and you can note that in the file.', ok: false },
          { t: 'The lead disclosure only applies to homes built before 1950, so this property is exempt.', ok: false }
        ],
        'The Lead-Based Paint Disclosure Act applies to all residential properties built before 1978. The buyer must receive the EPA pamphlet, the seller\'s disclosure of known lead hazards, and a 10-day period to conduct an inspection. The buyer can waive the inspection, but only in writing on the disclosure form.') +
      compose({ key: 'ca2-disc', scenario: 'tc-ca-new-disclosure-delivery', prompt: 'Disclosure package delivery email for 4827 Rolando Blvd San Diego CA',
        to: 'Samantha Chen & David Park <chenparkbuyers@email.com>', cc: 'Kevin Tran <kevin.tran@kw.com>',
        subj: 'Disclosure Package: 4827 Rolando Blvd',
        attach: ['TDS', 'SPQ', 'NHD Report', 'AVID', 'Lead-Based Paint Disclosure', 'Preliminary Title Report'],
        ph: 'Deliver the disclosure package to the buyers. Under California Civil Code §1102.3, inform them of their review period and right to cancel. Mention the lead disclosure specifically since this is a pre-1978 home.' });
    return step(2, 'Disclosures Package', 'Wed, Oct 8, 2025',
      'The disclosure package goes to the buyers via DocuSign on October 8. Missing even one statutory form can restart the buyer\'s cancellation clock or expose the seller to liability after closing.',
      main,
      side([['Acceptance', 'Oct 3, 2025'], ['Year built', '1961 (pre-1978)'], ['Escrow #', 'FNT-2025-09184']], ['tds', 'spq', 'nhd', 'avid', 'lead', 'prelim']));
  }

  /* ════════════════ Step 3: Distribute to Parties ════════════════ */
  function caNewStep2() {
    var main =
      picker('ca2-p-dist', 'Who gets the executed contract today?', 'Select every party that should receive it.', [
        { t: 'Maria Gutierrez', sub: 'Listing agent, Compass, San Diego', ok: true },
        { t: 'Jennifer Walsh', sub: 'Escrow officer, Fidelity National Title', ok: true },
        { t: 'Ryan Mitchell', sub: 'Loan officer, CrossCountry Mortgage', ok: true },
        { t: 'Kevin Tran', sub: 'Buyer\'s agent, Keller Williams (copy)', ok: true },
        { t: 'Patricia & Raymond Ochoa', sub: 'The sellers, directly', ok: false },
        { t: 'Jerry Sandoval', sub: 'Home inspector, Precision Home Inspections', ok: false }
      ], 'Notices for the sellers go through their listing agent (Maria), so she gets their copy. The home inspector has no role at this stage and doesn\'t need the contract.') +
      decision('ca2-d-prelim',
        'Ryan Mitchell at CrossCountry Mortgage asks you to hold off on sending the preliminary title report because "the lender doesn\'t need it until closer to closing." Is this correct?',
        [
          { t: 'He\'s right. The lender only needs the title commitment at closing, not the preliminary report now.', ok: false },
          { t: 'No. The lender needs the preliminary title report early in the process for underwriting. It reveals liens, easements, and title exceptions that could affect loan approval. Send it now.', ok: true },
          { t: 'The TC shouldn\'t send any documents to the lender. That\'s the loan officer\'s job.', ok: false }
        ],
        'The preliminary title report is a critical underwriting document. It discloses existing liens, easements, encumbrances, and ownership chain. Lenders need it early to identify anything that could block the loan. A surprise lien discovered at closing can delay or kill the deal.') +
      '<div class="lc-callout-info">In this case, escrow and title are both handled by Fidelity National Title &mdash; a common California arrangement. When escrow and title are separate companies, always check whether the escrow company has an ownership relationship with any brokerage on the file. If so, the Affiliated Business Arrangement Disclosure is required.</div>';
    return step(3, 'Distribute to Parties', 'Mon, Oct 6, 2025',
      'Send the executed contract to everyone who needs it to do their part, and only to them.',
      main,
      side([['Listing agent', 'Maria Gutierrez'], ['Escrow', 'Jennifer Walsh, FNT'], ['Lender', 'Ryan Mitchell, CrossCountry'], ['Buyer\'s agent', 'Kevin Tran']], ['rpa', 'prelim']));
  }

  /* ════════════════ Step 4: EMD Confirmation ════════════════ */
  function caNewStep3() {
    var main =
      '<div class="wf-signed-banner">&#10003; Good faith deposit of $17,200 confirmed received by Fidelity National Title (Escrow #FNT-2025-09184) on October 7, 2025</div>' +
      form('ca2-emd', 'Log the deposit', 'Use the wire confirmation and the purchase agreement.', [
        { label: 'EMD amount', kind: 'money', ans: 17200, ph: '$', show: '$17,200 (2% of purchase price)' },
        { label: 'Method', kind: 'text', ans: ['wire'], ph: 'Wire, check, etc.', show: 'Wire transfer' },
        { label: 'Held by', kind: 'text', ans: ['fidelity'], ph: 'Escrow holder', show: 'Fidelity National Title, Escrow #FNT-2025-09184' },
        { label: 'Received date', kind: 'date', ans: '2025-10-07', ph: 'mm/dd/yyyy', show: '10/07/2025' },
        { label: 'On time?', hint: 'due within 3 business days of acceptance', kind: 'select', ans: 'yes', show: 'Yes, Oct 7 is within 3 business days of Oct 3 acceptance',
          options: [['yes', 'Yes'], ['no', 'No']] }
      ]) +
      decision('ca2-d-emd',
        'The buyer\'s agent calls on October 8 (day 5) saying the buyers forgot to wire the EMD and asks if they can deposit it next week. What do you do?',
        [
          { t: 'Tell them that\'s fine. There\'s no hard deadline for the EMD in California.', ok: false },
          { t: 'Flag it immediately. Under the C.A.R. RPA, the EMD is due within 3 business days of acceptance (by October 8). Missing this deadline gives the seller grounds to cancel. The wire needs to go out today.', ok: true },
          { t: 'Tell them to just bring a personal check to the next meeting instead of wiring.', ok: false }
        ],
        'Under the standard C.A.R. RPA, the good faith deposit must be delivered to the escrow holder within 3 business days of acceptance. Failure to deposit the EMD on time is a material breach that can give the seller the right to cancel. A TC who spots this and escalates immediately can save the deal.') +
      compose({ key: 'ca2-emd', scenario: 'tc-ca-new-emd-confirmation', prompt: 'EMD confirmation email for 4827 Rolando Blvd San Diego CA',
        to: 'Maria Gutierrez, Kevin Tran, Jennifer Walsh',
        subj: 'EMD Confirmed: 4827 Rolando Blvd',
        attach: ['Wire confirmation'],
        ph: 'Confirm the $17,200 good faith deposit has been received by escrow. Note the contingency period start dates for all parties: inspection and appraisal contingencies expire Oct 20 (Day 17), loan contingency expires Oct 24 (Day 21).' });
    return step(4, 'EMD Confirmation', 'Tue, Oct 7, 2025',
      'The deposit is due at <strong>Fidelity National Title</strong> within 3 business days of acceptance (by October 8). Confirm arrival and log the details.',
      main,
      side([['Deposit', '$17,200'], ['Due by', 'Oct 8 (3 biz days)'], ['Held by', 'Fidelity National Title'], ['Escrow #', 'FNT-2025-09184']], ['rpa']),
      'gated');
  }

  /* ════════════════ Step 5: Inspections ════════════════ */
  function caNewStep4() {
    var main =
      card('What came back', '',
        timeline([
          ['Oct 14', '<b>Home inspection</b>, Precision Home Inspections (Jerry Sandoval). Two significant findings: <b>horizontal foundation crack</b> along south wall, 18 inches long; aging <b>HVAC system</b> (original 1961 unit, past useful life).'],
          ['Oct 15', '<b>Termite / WDO inspection</b>, Atlas Pest Control (report #WDO-2025-4128). Section 1 condition: <b>active subterranean termite infestation</b> in garage framing. Estimated treatment: $1,850.'],
          ['Oct 16', 'Buyer\'s agent orders a <b>foundation specialist assessment</b> from Pacific Foundation Engineering.'],
          ['Oct 17', '<b>Foundation specialist report</b>: crack is consistent with minor cosmetic settling common in San Diego clay soils from the 1960s. Recommended repair: epoxy injection seal ($2,200). <b>No structural deficiency.</b>']
        ])) +
      decision('ca2-d-vendor',
        'The buyer\'s agent asks you to recommend a specific foundation company and schedule the assessment directly. Should you?',
        [
          { t: 'Yes. Recommending vendors and scheduling inspections is a core TC responsibility.', ok: false },
          { t: 'You can help schedule the appointment if the buyer\'s agent requests it, but you should never recommend a specific vendor. Recommending vendors creates liability. Offer a list of licensed contractors if asked, or let the agent choose.', ok: true },
          { t: 'Tell the buyer\'s agent that inspections are entirely their responsibility and the TC has no role in scheduling.', ok: false }
        ],
        'A TC coordinates: they schedule, confirm, and track. But recommending specific vendors puts the TC and their brokerage in a position of liability if the vendor\'s work is later disputed. The safe practice is to offer multiple options or let the agent or buyer select their own.') +
      '<div class="lc-callout-warn">The NHD report shows this property is in a <b>Seismic Hazard Zone</b> (liquefaction). That\'s common in parts of San Diego with alluvial soil. It doesn\'t block the sale, but the buyer must acknowledge it, and the disclosure must be in the file.</div>';
    return step(5, 'Inspections', 'Oct 14 to Oct 17, 2025',
      'A full diligence package was ordered: general home inspection, termite / WDO, and a foundation specialist follow-up. The <strong>inspection contingency deadline is October 20 (Day 17)</strong>.',
      main,
      side([['Home inspector', 'Precision Home Inspections'], ['Termite', 'Atlas Pest Control'], ['Foundation', 'Pacific Foundation Eng.'], ['Contingency deadline', 'Oct 20 (Day 17)']], ['inspect', 'termite', 'foundation', 'nhd']));
  }

  /* ════════════════ Step 6: Repair & Credit Negotiation ════════════════ */
  function caNewStep5() {
    var main =
      card('The negotiation', '',
        timeline([
          ['Oct 18', '<b>Buyer submits Request for Repair</b> (C.A.R. RR): (1) foundation crack repair $2,200, (2) termite treatment $1,850, (3) HVAC replacement $8,500. <b>Total requested: $12,550.</b>'],
          ['Oct 19', '<b>Seller responds:</b> refuses HVAC replacement ("the system is working, it\'s old but functional"), agrees to foundation repair and termite treatment, and offers a <b>$4,500 credit at closing</b> in lieu of doing the repairs themselves.'],
          ['Oct 20', '<b>Day 17 &mdash; inspection contingency deadline.</b> Buyer accepts the $4,500 credit. Amendment #1 signed. Investigation contingency removed.']
        ])) +
      decision('ca2-d-role',
        'During the back-and-forth, the buyer\'s agent asks you: "Do you think the buyers should push harder on the HVAC? It\'s going to cost them $8,500 after closing." What do you say?',
        [
          { t: '"Yes, I\'d push for at least a $6,000 credit. That system is ancient."', ok: false },
          { t: '"No, the seller is being reasonable. Take the $4,500 and move on."', ok: false },
          { t: '"That\'s a business decision between the buyers and their agent. My role is to make sure the paperwork reflects whatever they agree to, and that it\'s signed before the contingency deadline."', ok: true }
        ],
        'A Transaction Coordinator coordinates paperwork and deadlines. They do not advise on business terms. Telling a buyer or their agent to push harder or accept less crosses the line from coordination into negotiation, which is the agent\'s job.') +
      '<div class="lc-callout-warn"><b>Day 17</b> is the default inspection contingency deadline under the C.A.R. RPA. If the buyer doesn\'t remove the contingency OR request an extension by this date, the seller can issue a <b>Notice to Buyer to Perform (NBP)</b>, giving the buyer 2 more days &mdash; after which the seller can cancel. This is the highest-pressure deadline on most California files.</div>';
    return step(6, 'Repair & Credit Negotiation', 'Oct 18 to Oct 20, 2025',
      'The inspection findings feed into a repair request. The seller will not replace the HVAC. Watch the <strong>Day 17 deadline</strong>.',
      main,
      side([['RR total requested', '$12,550'], ['Seller counter', '$4,500 credit'], ['Day 17 deadline', 'Oct 20, 2025'], ['Result', 'Credit accepted']], ['rr', 'sellerRR', 'amend1', 'inspect', 'termite', 'foundation']));
  }

  /* ════════════════ Step 7: Appraisal Gap & Closing Prep ════════════════ */
  function caNewStep6() {
    var main =
      card('Appraisal gap', '',
        timeline([
          ['Oct 20', 'Appraisal contingency deadline. Appraisal not yet completed. Buyer requests extension.'],
          ['Oct 21', '<b>Extension granted</b>: appraisal contingency extended to Oct 27 via signed amendment.'],
          ['Oct 23', '<b>Appraisal completed:</b> appraised value = <b>$845,000</b>. That is <b>$15,000 below</b> the $860,000 contract price.'],
          ['Oct 24', '<b>Loan contingency deadline (Day 21).</b> Lender confirms conditional approval. Buyer removes loan contingency.'],
          ['Oct 25', '<b>Price renegotiation:</b> seller agrees to reduce price to <b>$852,500</b> (splitting the $15,000 gap). Buyer covers the remaining $7,500 in additional down payment. Amendment #2 signed.'],
          ['Oct 27', 'Buyer removes appraisal contingency (extended deadline). <b>All contingencies now removed.</b>']
        ])) +
      decision('ca2-d-ext',
        'The seller\'s agent says: "Extensions are automatic in California. You don\'t need the seller to agree." Is this correct?',
        [
          { t: 'Yes. California contingency extensions are automatic if the buyer sends written notice before the deadline.', ok: false },
          { t: 'No. In California, a contingency extension requires mutual written agreement. Both parties must sign the extension. If the seller refuses, the buyer must either remove the contingency by the original deadline or risk a Notice to Buyer to Perform.', ok: true },
          { t: 'Extensions don\'t exist. The buyer must either remove the contingency or cancel the contract.', ok: false }
        ],
        'California contingency extensions are NOT automatic or unilateral. They require a signed amendment or addendum agreed to by both parties. On this file, the seller agreed because they also need the deal to close on time for their Phoenix purchase.') +
      card('Wire fraud attempt', 'October 29 (Day 26): the buyers forward a suspicious email to you.',
        '<div class="mh-quote">' +
          '<strong>From:</strong> Jennifer Wlash &lt;jwlash@fnf-escrow.com&gt;<br>' +
          '<strong>Subject:</strong> URGENT &mdash; Updated Wire Instructions for 4827 Rolando Blvd<br><br>' +
          'Dear Samantha and David,<br><br>' +
          'Due to a recent system update, our wire instructions have changed. Please use the updated routing and account numbers below for your closing funds:<br><br>' +
          'Bank: First National Trust<br>' +
          'Routing: 021000089<br>' +
          'Account: 8834-2109-7765<br>' +
          'Reference: FNT-2025-09184<br><br>' +
          'Please wire funds immediately to avoid closing delays.<br><br>' +
          'Jennifer Walsh<br>Escrow Officer, Fidelity National Title' +
        '</div>') +
      decision('ca2-d-wire',
        'What do you do with this email?',
        [
          { t: 'Forward the updated instructions to the buyers and confirm they should wire to the new account.', ok: false },
          { t: 'Reply to the email asking Jennifer to confirm the change.', ok: false },
          { t: 'Do NOT forward or act on this email. The sender address is misspelled ("Wlash" not "Walsh") and the domain is wrong ("fnf-escrow.com" not the real Fidelity domain). Call Jennifer Walsh directly on the phone number you already have on file to verify. Alert all parties that a fraud attempt is in progress.', ok: true }
        ],
        'Wire fraud is the #1 financial crime targeting real estate transactions. Red flags on this email: (1) the sender name is misspelled, (2) the email domain doesn\'t match the real company\'s domain, (3) "URGENT" pressure language, (4) instructions changed mid-transaction. Always verify by phone on a known number. A TC who catches this saves the buyers $172,000+.') +
      card('Closing checklist', '', '<ul style="margin:0;padding-left:18px;font-size:13.5px;line-height:1.7;color:var(--v-ink)">' +
        '<li>Price amendment: $852,500 (signed Oct 25) &#10003;</li>' +
        '<li>All contingencies removed: Investigation (Oct 20), Loan (Oct 24), Appraisal (Oct 27) &#10003;</li>' +
        '<li>Loan docs to escrow: Received Oct 28 &#10003;</li>' +
        '<li>Buyer signing: Oct 30, 2025 &#10003;</li>' +
        '<li>Seller signing: Oct 31, 2025 &#10003;</li>' +
        '<li>Final walkthrough: Nov 2, 2025</li>' +
        '<li>Wire closing funds: <strong>Verify instructions by phone with Jennifer Walsh on (619) 555-0412</strong> &#10003;</li>' +
        '<li>Close of escrow target: November 3, 2025</li>' +
      '</ul>');
    return step(7, 'Appraisal Gap & Closing Prep', 'Oct 20 to Nov 2, 2025',
      'The appraisal comes in below contract price. Handle the extension, the price renegotiation, catch the wire fraud attempt, and prepare for closing.',
      main,
      side([['Appraised value', '$845,000'], ['Gap', '$15,000 below'], ['New price', '$852,500'], ['All contingencies', 'Removed Oct 27'], ['COE target', 'Nov 3, 2025']], ['appraisal', 'extAppr', 'amend2', 'wireFraud']));
  }

  /* ════════════════ Step 8: Post-Closing Wrap-Up ════════════════ */
  function caNewStep7() {
    var main =
      '<div class="wf-signed-banner">&#10003; Verification of Property Condition signed by both buyers on November 2, 2025. Recording confirmed November 3. Keys delivered.</div>' +
      compose({ key: 'ca2-close', scenario: 'tc-ca-new-post-closing', prompt: 'Post closing confirmation email for 4827 Rolando Blvd San Diego CA',
        to: 'Maria Gutierrez, Kevin Tran, Jennifer Walsh',
        subj: 'Closed: 4827 Rolando Blvd, San Diego',
        attach: ['Settlement statement'],
        ph: 'Confirm the file closed on November 3, 2025. Note the final sale price of $852,500, the $4,500 repair credit, and confirm all documents are archived.' }) +
      '<div class="wf-score-card">' +
        '<div class="wf-score-header">Workflow Validation: 4827 Rolando Blvd</div>' +
        [
          'Built the file sheet from the acceptance email and confirmed all key terms',
          'Assembled the full California disclosure package including Lead-Based Paint (pre-1978 home)',
          'Distributed the file to escrow, title, both agents, and the lender',
          'Confirmed the good faith deposit in escrow within the 3-business-day deadline',
          'Coordinated home, termite, and foundation specialist inspections and tracked findings',
          'Processed the Request for Repair, seller response, and $4,500 credit amendment before Day 17',
          'Managed the appraisal gap negotiation, contingency extension, and wire fraud attempt',
          'Sent the post-closing wrap-up and archived the file'
        ].map(function (t) { return '<div class="wf-score-row"><div class="wf-score-dot done"></div><span>' + t + '</span></div>'; }).join('') +
      '</div>' +
      '<div id="wf-eval-container"></div>' +
      '<div class="lc-result" style="margin-top:16px">' +
        '<div class="lc-result-pct" style="font-size:36px">&#10003;</div>' +
        '<p><strong>Full Transaction Workflow Complete.</strong></p>' +
        '<p style="font-size:13.5px;color:var(--v-muted)">You guided 4827 Rolando Blvd from accepted offer through close of escrow: a full statutory disclosure package with Lead-Based Paint for a pre-1978 home, a repair credit negotiation under Day 17 deadline pressure, an appraisal gap that required a price amendment, and a wire fraud attempt you had to catch before it cost the buyers their down payment.</p>' +
        '<div class="lc-result-actions">' +
          '<button class="lc-result-btn primary" onclick="wfRestart()">Restart Workflow</button>' +
          '<button class="lc-result-btn outline" onclick="wfReset()">Back to Scenarios</button>' +
        '</div></div>' +
      '<div class="wf-nav"><button class="wf-nav-btn outline" onclick="wfPrev()">&larr; Previous</button></div>';
    return step(8, 'Post-Closing', 'Mon, Nov 3, 2025',
      'The sale closed. Send the wrap-up, confirm the numbers, and close the file.',
      main,
      side([['Closed', 'Nov 3, 2025'], ['Final price', '$852,500'], ['Repair credit', '$4,500']], ['settlement']), true);
  }

  window.TC_CA_NEW_CASE = {
    type: 'workflow', tag: 'California · Standard Purchase', title: '4827 Rolando Blvd: Full Transaction Workflow',
    desc: 'A standard San Diego purchase from accepted offer through close of escrow: a pre-1978 lead disclosure, an inspection repair credit, an appraisal gap, and a wire fraud attempt.',
    stepCount: 8,
    wfLabels: ['Accepted Offer', 'Disclosures Package', 'Distribute to Parties', 'EMD Confirmation', 'Inspections', 'Repair & Credit Negotiation', 'Appraisal Gap & Closing Prep', 'Post-Closing'],
    wfSteps: [caNewStep0, caNewStep1, caNewStep2, caNewStep3, caNewStep4, caNewStep5, caNewStep6, caNewStep7],
    wfAfterRender: { 7: function () { wfRenderFinalScore('wf-eval-container', 'tc', 'ca-new', 4); } }
  };
})();
