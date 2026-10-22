/* ══════════════════════════════════════════════════════════
   CASE SIMULATOR: Transaction Coordinator, Virginia
   Real case file: 4232 Maplehurst Road, Virginia Beach, VA 23462
   Listing side (Shannon Paschall, AtCoastal Realty). The associate
   works as Shannon's transaction coordinator from the ratified REIN
   contract (02/22/2026) to settlement (03/30/2026): file sheet and
   deadlines, seller summary and distribution, the deposit and
   Addendum #1, the HOA resale certificate (PMA-A08775) and CIC-2,
   the Keff/Spec and Eliminator reports, the PICRA counter with
   Addendum #2, the PAA-1 and FHA Amendatory Clause, the PMA
   financial update, the closing date extension, the walk through,
   the ALTA and the AtCoastal CDA. Every date, amount and name comes
   from the signed file in assets/docs/tc-va/maplehurst/.
   Items marked "simulated" fill the gaps the real file leaves (extra
   emails, replies and decisions); they never change a real date,
   amount, name or the order of events.
   Built on the engine of tc-ca-seller-case.js; uses workflow.js.
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

  /* Developer Mode (Ctrl + Shift + D) is bound once on this page by the
     California case files. Binding it again here would register a second
     listener and the two would cancel each other out, so this file only
     relies on the body.tc-dev-mode class they toggle. */

  var esc = (typeof window !== 'undefined' && typeof window.esc === 'function')
    ? window.esc
    : function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  /* ════════════════ In-Task 3-Tier Hint Engine ════════════════ */
  var TASK_HINTS = {
    'va-sheet': {
      title: 'File Sheet from the Signed Contract',
      l1: 'Copy each term of the deal from the signed pages of the ratified contract, not from an email summary.',
      l2: 'The REIN agreement starts on PDF page 2. Look at line 2 for the buyers, ¶2 for the deposit and escrow agent, ¶3 for price and financing, ¶8 for settlement and ¶13 for the repair cap.',
      l3: '<div class="wf-task-hint-kicker">Values in the file:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Ratified:</strong> <span class="wf-task-hint-chip">02/22/2026</span></li>' +
            '<li><strong>Buyers:</strong> Sergio P Malonzo, Jr. and Jasmin Malonzo</li>' +
            '<li><strong>Price:</strong> <span class="wf-task-hint-chip">$285,000</span>, FHA ($267,500 loan, $17,500 down)</li>' +
            '<li><strong>Deposit:</strong> $500 with BHHS RW Towne Realty</li>' +
            '<li><strong>Settlement:</strong> on or before 03/17/2026</li>' +
            '<li><strong>Repair cap:</strong> 1% of the price, $2,850</li>' +
          '</ul>'
    },
    'va-dates': {
      title: 'Contract Calendar',
      l1: 'Put every contract deadline on the calendar, counted from ratification.',
      l2: 'Ratification was Sunday, Feb 22, so day 1 is Monday, Feb 23. Days are calendar days; business days skip weekends and federal holidays.',
      l3: '<div class="wf-task-hint-kicker">Deadlines:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Deposit (2 business days):</strong> <span class="wf-task-hint-chip">Tue, Feb 24</span></li>' +
            '<li><strong>Loan application, WDI and moisture reports, PICRA (7 days):</strong> <span class="wf-task-hint-chip">Sun, Mar 1</span></li>' +
            '<li><strong>Settlement:</strong> Tue, Mar 17 &middot; <strong>with the 10 day extension:</strong> Fri, Mar 27</li>' +
          '</ul>'
    },
    'va-p-intake': {
      title: 'What the File Still Needs',
      l1: 'Find out what the listing file is missing before you start working it.',
      l2: 'Think about signatures (the seller contact), the payoff (his lender), access (inspections, appraisal, walk through) and the association. Sensitive numbers never travel by email.',
      l3: '<div class="wf-task-hint-kicker">Pick these:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><span class="wf-task-hint-chip">&#10003; Seller contact</span> <span class="wf-task-hint-chip">&#10003; Mortgage holder</span> <span class="wf-task-hint-chip">&#10003; Access</span> <span class="wf-task-hint-chip">&#10003; HOA and manager</span></li>' +
            '<li><span style="color:#dc2626">&#10007; Not:</span> SSN by email, the buyers&rsquo; bank statements, a seller ordered inspection</li>' +
          '</ul>'
    },
    'va-intake': {
      title: 'Writing: Ask Shannon for the Missing Items',
      l1: 'Ask Shannon, internally, for the four items the file needs.',
      l2: 'Shannon in To. Keep Jemal and the buyer side off this one.',
      l3: '<div class="wf-task-hint-kicker">Structure:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Subject:</strong> <span class="wf-task-hint-chip">4232 Maplehurst Road file: a few items I need</span></li>' +
            '<li>Seller contact, mortgage holder, access, HOA and manager</li>' +
          '</ul>'
    },
    'seller': {
      title: 'Writing: Seller Summary for Jemal',
      l1: 'Give the seller a plain language summary on day one: what was agreed, what happens next and what he has to do.',
      l2: 'Write to Jemal and copy Shannon. Keep the buyer side off it. Use the facts from the file sheet and the items to convey.',
      l3: '<div class="wf-task-hint-kicker">Cover these points:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>To:</strong> <span class="wf-task-hint-chip">Jemal O Tamem</span> &middot; <strong>CC:</strong> Shannon Paschall</li>' +
            '<li>$285,000 with FHA financing, settlement on or before Tue, Mar 17</li>' +
            '<li>$500 deposit held by BHHS RW Towne Realty</li>' +
            '<li>Reports and any repair request due Sun, Mar 1: keep the home accessible</li>' +
            '<li>What conveys, and utilities on through the walk through (¶13D)</li>' +
          '</ul>'
    },
    'va-p-dist': {
      title: 'Who Gets the Ratified Contract',
      l1: 'Send the contract to everyone who needs it to do their part, and only to them.',
      l2: 'Check ¶23 for how notices reach the buyers, the CIC-1 for who is copied at title, and ¶6A for the lender. Look at the date on the Pest Heroes reports.',
      l3: '<div class="wf-task-hint-kicker">Recipients:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><span class="wf-task-hint-chip">&#10003; Karen Archbell</span> <span class="wf-task-hint-chip">&#10003; Joel Gueli</span> <span class="wf-task-hint-chip">&#10003; Brad Watts</span> <span class="wf-task-hint-chip">&#10003; Shannon Paschall</span></li>' +
            '<li><span style="color:#dc2626">&#10007; Not:</span> the buyers directly, or Pest Heroes</li>' +
          '</ul>'
    },
    'dist': {
      title: 'Writing: Distribute the Contract',
      l1: 'Send the ratified contract to the selling agent, title and the lender, with the dates that matter to each of them.',
      l2: 'Karen, Joel and Brad in the recipients, Shannon copied. The buyers get their copy through Karen.',
      l3: '<div class="wf-task-hint-kicker">Key data:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Subject:</strong> <span class="wf-task-hint-chip">Ratified contract: 4232 Maplehurst Road (02/22/2026)</span></li>' +
            '<li>Loan application and reports by Mar 1, settlement Mar 17</li>' +
            '<li>Ask everyone to confirm receipt</li>' +
          '</ul>'
    },
    'va-emd': {
      title: 'Log the Deposit',
      l1: 'Check what arrived against the contract and Addendum #1 before you report the deposit as received.',
      l2: 'Open the check and Addendum #1. ¶5A says when the escrow agent has to deposit it.',
      l3: '<div class="wf-task-hint-kicker">Values in the file:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Amount:</strong> $500.00 &middot; <strong>Payable to:</strong> BHHS RW Towne Realty</li>' +
            '<li><strong>Check date:</strong> 02/23/2026 (on time, due Tue, Feb 24)</li>' +
            '<li><strong>Deposited by:</strong> 5 business banking days after receipt</li>' +
          '</ul>'
    },
    'emd': {
      title: 'Writing: Deposit Confirmation',
      l1: 'Confirm to title, the lender and the selling agent that the deposit is with the escrow agent, and share Addendum #1.',
      l2: 'Joel, Brad and Karen in the recipients, Shannon copied. Attach the check and Addendum #1.',
      l3: '<div class="wf-task-hint-kicker">Key data:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li>$500 personal check dated 02/23/2026, held by BHHS RW Towne Realty</li>' +
            '<li>Addendum #1 changed the form of payment to personal check (buyers 02/23, seller 02/24)</li>' +
          '</ul>'
    },
    'va-add1': {
      title: 'Writing: Ask Karen for the Amendment',
      l1: 'Get the change in the form of payment in writing before the deposit is reported as received.',
      l2: '¶2 says Other (Earnest). Karen sent a personal check. The buyers sign through Karen; copy Shannon.',
      l3: '<div class="wf-task-hint-kicker">Key data:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>To:</strong> <span class="wf-task-hint-chip">Karen Archbell</span> &middot; <strong>CC:</strong> Shannon Paschall</li>' +
            '<li>Ask for an addendum changing the form of payment to personal check</li>' +
            '<li>Deposit still due at BHHS RW Towne Realty by Tue, Feb 24</li>' +
          '</ul>'
    },
    'va-app15': {
      title: 'Writing: Share the Appendix 15 Answer',
      l1: 'Give the buyers&rsquo; side the association manager&rsquo;s written answer.',
      l2: 'Karen in To, Shannon and Diana copied. Attach the PMA emails.',
      l3: '<div class="wf-task-hint-kicker">Key data:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li>Appendix 15 said violations were unknown</li>' +
            '<li>David Lukus, Mar 4: placeholder left in by mistake; visual inspection of the front found no issues</li>' +
          '</ul>'
    },
    'va-reports': {
      title: 'Writing: Reports to the Settlement Agent',
      l1: 'Make sure the settlement agent has this contract&rsquo;s WDI and moisture reports by Sun, Mar 1 (¶13B).',
      l2: 'Joel in To, Karen and Shannon copied. Attach the Eliminator reports and the invoice.',
      l3: '<div class="wf-task-hint-kicker">Key data:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li>Eliminator, 02/24/2026: no visible wood destroying insects, no treatment; moisture N/A, slab</li>' +
            '<li>$90.00 invoice for the settlement statement</li>' +
            '<li>The Pest Heroes reports from 01/19/2026 do not apply</li>' +
          '</ul>'
    },
    'va-repairs-q': {
      title: 'Reply: Jemal Asks About the Repairs',
      l1: 'The seller asks for negotiation advice. The TC stays neutral, connects him with Shannon and gives the deadline.',
      l2: 'Pick the template that sends the decision to Shannon, then fill in when the negotiation period ends.',
      l3: '<div class="wf-task-hint-kicker">Recommended:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Template:</strong> &ldquo;Connect him with Shannon; give the timing&rdquo;</li>' +
            '<li><strong>Bracket:</strong> <span class="wf-task-hint-chip">Monday, March 2 at 11:59 PM</span></li>' +
          '</ul>'
    },
    'va-hoa': {
      title: 'Check the Resale Certificate',
      l1: 'Confirm when the buyers received the certificate, how long they can cancel and what the seller owes the association.',
      l2: 'The CIC-2 shows the receipt date. Appendix 4 of the certificate shows the assessment and the balance.',
      l3: '<div class="wf-task-hint-kicker">Values in the file:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Received:</strong> 02/23/2026 &middot; <strong>cancel until:</strong> Thu, Feb 26, 11:59 PM</li>' +
            '<li><strong>Assessment:</strong> $53.80 a month &middot; <strong>balance 01/20/2026:</strong> $56.36</li>' +
          '</ul>'
    },
    'va-p-picra': {
      title: "Review the Buyers' PICRA",
      l1: 'Decide which statements about the repair request are true under the PICRA form and ¶13.',
      l2: 'Compare the delivery date to the Mar 1 deadline. Read what the PICRA form says about the reports, waived items and the repair cap, and what the WDI report found.',
      l3: '<div class="wf-task-hint-kicker">True statements:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><span class="wf-task-hint-chip">&#10003; On time</span> <span class="wf-task-hint-chip">&#10003; Full reports go with it</span> <span class="wf-task-hint-chip">&#10003; Items left off are waived</span></li>' +
            '<li><span style="color:#dc2626">&#10007; Not true:</span> all 15 repairs owed, termite treatment required, agreed repairs count against the cap</li>' +
          '</ul>'
    },
    'va-picra': {
      title: 'Update the File Sheet after the PICRA',
      l1: 'Record the new deal terms from the ratified PICRA.',
      l2: 'Open the seller counter and the ratified PICRA with the Removal Acceptance Date.',
      l3: '<div class="wf-task-hint-kicker">Values in the file:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Price:</strong> $290,000 &middot; <strong>credit:</strong> $5,000 &middot; <strong>repairs:</strong> none, as is</li>' +
            '<li><strong>Removal Acceptance Date:</strong> 03/06/2026 &middot; <strong>appraisal at least:</strong> $290,000</li>' +
          '</ul>'
    },
    'va-fin': {
      title: 'Keep the Dates Straight',
      l1: 'Track the appraisal, the FHA value, the automatic extension and the new settlement date.',
      l2: '¶6A gives the buyers 3 days after PICRA removal (Mar 6) to authorize the appraisal. ¶8 caps the automatic extension at 10 days. The addendum signed Mar 27 sets the new date.',
      l3: '<div class="wf-task-hint-kicker">Values in the file:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Appraisal authorized by:</strong> Mon, Mar 9 &middot; <strong>FHA value:</strong> $290,000</li>' +
            '<li><strong>Extension reaches:</strong> Fri, Mar 27 &middot; <strong>new settlement:</strong> 03/30/2026</li>' +
          '</ul>'
    },
    'va-alta': {
      title: 'Audit the ALTA',
      l1: 'Find each figure on the settlement statement and confirm it matches what you papered.',
      l2: 'Look at the sale price, the seller credit, the deposit, the commission section, the down payment credit and both balance lines.',
      l3: '<div class="wf-task-hint-kicker">Values in the file:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li>$290,000 &middot; credit $5,000 &middot; deposit $500</li>' +
            '<li>AtCoastal $5,800 &middot; BHHS RW Towne $7,250 &middot; FHLBank Atlanta $17,500</li>' +
            '<li>Seller net $171,729.53 &middot; buyers due $500.00</li>' +
          '</ul>'
    },
    'va-cda': {
      title: 'Match the CDA to the ALTA',
      l1: "Tie AtCoastal Realty's commission disbursement authorization to the settlement statement.",
      l2: 'Open the CDA signed by Jon McAchran and the ALTA side by side.',
      l3: '<div class="wf-task-hint-kicker">Values in the file:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Commission:</strong> $5,800 (2% of $290,000)</li>' +
            '<li><strong>Transaction fee:</strong> $595 (LA Admin Fee on the ALTA)</li>' +
            '<li><strong>Net pay:</strong> $6,261.63 to Shannon Paschall, Inc.</li>' +
          '</ul>'
    },
    'close': {
      title: 'Writing: Post Closing Wrap Up',
      l1: 'Confirm the settlement and the CDA amounts to Shannon and close the file.',
      l2: 'Write to Shannon and copy Diana. The CDA is internal: keep the buyer side off it.',
      l3: '<div class="wf-task-hint-kicker">Cover these points:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li>Settled 03/30/2026 at $290,000</li>' +
            '<li>CDA: $5,800 commission, $595 fee, $6,261.63 net</li>' +
            '<li>The full file is archived</li>' +
          '</ul>'
    }
  };

  /* ── Floating-panel integration: show task-specific hints via Ask Shannon ── */
  function renderTaskHintsInPanel(taskId) {
    var h = TASK_HINTS[taskId];
    if (!h) return;
    var panel = document.getElementById('wf-hint-panel');
    if (!panel && typeof wfEnsureHintPanel === 'function') panel = wfEnsureHintPanel();
    if (!panel) return;
    var m = window.WF_HINT_MENTOR || { initials: 'SP', name: 'Shannon Paschall', role: 'Listing Agent' };
    var tiers = [
      { badge: 'Level 1', cls: 'nudge', label: 'The Goal', html: '<p>' + esc(h.l1) + '</p>' },
      { badge: 'Level 2', cls: 'guidance', label: 'Where to Look', html: '<p>' + esc(h.l2) + '</p>' },
      { badge: 'Level 3', cls: 'answer', label: 'Key Facts', html: h.l3 }
    ];
    var out =
      '<div class="wf-hint-panel-header">' +
        '<div class="wf-hint-panel-avatar">' + m.initials + '</div>' +
        '<div>' +
          '<div class="wf-hint-panel-name">' + m.name + '</div>' +
          '<div class="wf-hint-panel-role">' + esc(h.title) + '</div>' +
        '</div>' +
        '<button type="button" class="wf-hint-panel-close" onclick="wfCloseHintPanel()" aria-label="Close">&times;</button>' +
      '</div><div id="wf-hint-tiers">';
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      out +=
        '<div class="wf-hint-tier">' +
          '<button type="button" class="wf-hint-tier-btn" id="wf-hint-btn-' + i + '" onclick="wfRevealHintTier(' + i + ')">' +
            '<span class="wf-hint-tier-badge ' + t.cls + '">' + t.badge + '</span>' +
            '<span>' + t.label + '</span>' +
          '</button>' +
          '<div class="wf-hint-content" id="wf-hint-content-' + i + '">' + t.html + '</div>' +
        '</div>';
    }
    out += '</div>';
    panel.innerHTML = out;
  }

  var origToggleHint = window.wfToggleHintPanel;
  window.wfToggleHintPanel = function () {
    var panel = document.getElementById('wf-hint-panel');
    if (panel && panel.classList.contains('open')) {
      panel.classList.remove('open');
      return;
    }
    var keys = Object.keys(TASK_HINTS);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      /* compose bodies, pickers and decisions use the key as their id; forms use key-0 */
      var target = document.getElementById('wf-' + k + '-body') || document.getElementById(k) || document.getElementById(k + '-0');
      if (target && target.offsetParent !== null) {
        renderTaskHintsInPanel(k);
        if (!panel && typeof wfEnsureHintPanel === 'function') panel = wfEnsureHintPanel();
        if (panel) panel.classList.add('open');
        return;
      }
    }
    if (typeof origToggleHint === 'function') origToggleHint();
  };

  var DIR = '../assets/docs/tc-va/maplehurst/';
  /* Real listing file, 4232 Maplehurst Road (RW Towne Title file 22026-67041) */
  var DOCS = {
    contract:   ['ratified-contract.pdf', 'Ratified purchase agreement', 'REIN, ratified 02/22/2026 · 29 pages'],
    convey:     ['items-to-convey.pdf', 'Items to convey', 'Contract ¶15'],
    add1:       ['addendum-1-emd-form-of-payment.pdf', 'Addendum #1: EMD form of payment', 'Buyers 02/23 · seller 02/24/2026'],
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
    add2:       ['addendum-2-negotiation-extension.pdf', 'Addendum #2: negotiation period', 'Buyers 03/02 · seller 03/03/2026'],
    picraok:    ['picra-ratified.pdf', 'Ratified PICRA', 'Removal Acceptance 03/06/2026'],
    paa1u:      ['paa-1-before-buyer-signatures.pdf', 'PAA-1 before the buyers signed', 'Seller 03/01 · no buyer signatures'],
    paa1:       ['paa-1-price-and-credit.pdf', 'PAA-1: $290,000 and $5,000 credit', 'Buyers signed 03/06/2026'],
    fha:        ['fha-amendatory-clause.pdf', 'FHA Amendatory Clause', 'Loan 202602916 · $290,000'],
    hoaupdate:  ['hoa-financial-update-order.pdf', 'HOA financial update order', 'PMA-A08954 · 03/20 · payment hold'],
    hoapaid:    ['hoa-financial-update-paid.pdf', 'HOA financial update order, paid', 'PMA-A08954 · 03/30 · $72.77'],
    hoaupd:     ['hoa-financial-update.pdf', 'HOA financial update', 'PMA-A08954 · prepared 04/02/2026'],
    extend:     ['addendum-closing-date-extension.pdf', 'Addendum: closing date extension', 'Mar 17 to Mar 30 · signed 03/27'],
    walk:       ['walk-through-report.pdf', 'Walk through report', 'Buyers signed 03/30/2026'],
    alta:       ['alta-settlement-statement.pdf', 'ALTA settlement statement', 'RW Towne Title · 03/30/2026'],
    cda:        ['commission-disbursement-authorization.pdf', 'Commission disbursement (CDA)', 'AtCoastal Realty · 04/01/2026']
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
    if (document.getElementById('wf-eval-container')) wfRenderFinalScore('wf-eval-container', 'tc', 'va', VA_STATE_COUNT);
    if (typeof window.caNewRefresh === 'function') setTimeout(window.caNewRefresh, 0);
    if (typeof _wfSaveState === 'function') _wfSaveState();
  }

  window.caNewOpen = function (key) {
    var d = DOCS[key];
    if (d) {
      wfOpenDoc(DIR + d[0], d[1]);
    }
  };

  /* The file does not name Shannon's transaction coordinator, so the
     associate plays a generic TC persona. Change these two lines to rename it. */
  var TC_NAME = 'Alex Morgan';
  var TC_ADDR = 'alex.morgan@example.com';
  var TC_FIRST = TC_NAME.split(' ')[0];
  var TC_SIGN = TC_NAME + '\nTransaction Coordinator for Shannon Paschall, AtCoastal Realty';
  var CASE_ADDR = '4232 Maplehurst Rd';
  var CASE_YEAR_SPLIT = 2026; /* every email in this file is dated 2026 (Feb to Apr) */

  /* wfRenderFinalScore() takes the number of states on the TC page (va, tx,
     ca, ny) for sim progress, not the number of scored items in this case. */
  var VA_STATE_COUNT = 4;

  function agentSig(o) {
    return '<div class="wf-sig">' +
      '<div class="wf-sig-valediction">' + (o.close || 'Best,') + '</div>' +
      '<div class="wf-sig-card">' +
        '<div class="wf-sig-primary">' +
          '<div class="wf-sig-brand-block">' +
            '<div class="wf-sig-broker-emblem"' + (o.emblemBg ? ' style="background:' + o.emblemBg + ';"' : '') + '>' +
              '<span class="wf-sig-emblem-initials">' + o.emblem + '</span>' +
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

  var SHANNON_SIG = agentSig({
    emblem: 'AC', emblemBg: '#0b4f6c', brand: 'ATCOASTAL', brandSub: 'Realty',
    name: 'Shannon Paschall',
    title: 'Listing Agent',
    firm: 'AtCoastal Realty &middot; Principal Broker Jon McAchran',
    lines: ['<strong>Email:</strong> Shannon@shannonsellsva.com']
  });
  var KAREN_SIG =
    '<p style="margin-top:14px;">Karen Archbell<br>Selling Agent &middot; BHHS RW Towne Realty<br>karen@karenarchbell.com</p>';
  var BRAD_SIG =
    '<p style="margin-top:14px;">Brad Watts<br>Archer Mortgage<br>brad@archermortgagellc.com</p>';
  var JOEL_SIG =
    '<p style="margin-top:14px;">Joel C. Gueli<br>Escrow Officer &middot; RW Towne Title LLC<br>File 22026-67041</p>';
  var DIANA_SIG =
    '<p style="margin-top:14px;">Diana Martinez<br>Operations Manager &middot; Shannon Paschall, AtCoastal Realty<br>Diana@shannonsellsva.com</p>';
  var JEMAL_SIG =
    '<p style="margin-top:14px;">Jemal</p>';

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

  /* Only details that appear in the file: no phone or email is made up */
  var CONTACTS = {
    'tc':      { name: TC_NAME, role: 'Transaction Coordinator (you)', brokerage: 'AtCoastal Realty', email: TC_ADDR, phone: '', initials: TC_NAME.split(' ').map(function (w) { return w.charAt(0); }).join('').toUpperCase(), color: 'linear-gradient(135deg, #1565c0, #17c3d4)' },
    'shannon': { name: 'Shannon Paschall', role: 'Listing Agent', brokerage: 'AtCoastal Realty', email: 'shannon@shannonsellsva.com', phone: '', initials: 'SP', color: 'linear-gradient(135deg, #0b4f6c, #1b7f9e)' },
    'diana':   { name: 'Diana Martinez', role: "Shannon's Operations Manager", brokerage: 'AtCoastal Realty', email: 'diana@shannonsellsva.com', phone: '', initials: 'DM', color: 'linear-gradient(135deg, #334155, #64748b)' },
    'jemal':   { name: 'Jemal O Tamem', role: 'Seller', brokerage: 'Client', email: 'ojemal69@yahoo.com', phone: '', initials: 'JT', color: 'linear-gradient(135deg, #0284c7, #0369a1)' },
    'karen':   { name: 'Karen Archbell', role: "Buyers' Agent (Selling Agent)", brokerage: 'BHHS RW Towne Realty', email: 'karen@karenarchbell.com', phone: '', initials: 'KA', color: 'linear-gradient(135deg, #5b2141, #8a3561)' },
    'buyers':  { name: 'Sergio P Malonzo Jr. & Jasmin Malonzo', role: 'Buyers (FHA loan)', brokerage: 'Represented by Karen Archbell', email: '', phone: '', initials: 'SM', color: 'linear-gradient(135deg, #0e7490, #155e75)' },
    'brad':    { name: 'Brad Watts', role: 'Loan Officer', brokerage: 'Archer Mortgage', email: 'brad@archermortgagellc.com', phone: '', initials: 'BW', color: 'linear-gradient(135deg, #1f2937, #4b5563)' },
    'joel':    { name: 'Joel C. Gueli', role: 'Escrow Officer (Settlement)', brokerage: 'RW Towne Title LLC', email: 'joel.gueli@rwtownetitle.com', phone: '', initials: 'JG', color: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
    'david':   { name: 'David Lukus', role: 'Association Manager', brokerage: 'PMA · Timberlake Community Association', email: '', phone: '757-646-6247', initials: 'DL', color: 'linear-gradient(135deg, #7c3aed, #5b21b6)' },
    'keffer':  { name: 'John Keffer', role: 'Home Inspector', brokerage: 'Keff/Spec LLC', email: '', phone: '', initials: 'JK', color: 'linear-gradient(135deg, #b45309, #92400e)' },
    'eric':    { name: 'Eric Trotter', role: 'WDI & Moisture Inspector', brokerage: 'Eliminator Termite Pest & Moisture Control', email: '', phone: '', initials: 'ET', color: 'linear-gradient(135deg, #15803d, #166534)' },
    'jon':     { name: 'Jon McAchran', role: 'Principal Broker', brokerage: 'AtCoastal Realty', email: '', phone: '', initials: 'JM', color: 'linear-gradient(135deg, #be185d, #9d174d)' }
  };
  var CONTACT_ORDER = ['shannon', 'diana', 'jemal', 'karen', 'buyers', 'brad', 'joel', 'david', 'keffer', 'eric', 'jon'];

  var DOC_TYPES = {};
  (function () {
    var reports = ['check', 'hoamail', 'inspection', 'wdi', 'moisture', 'invoice', 'hoaupdate', 'hoapaid', 'hoaupd', 'walk', 'alta', 'cda'];
    var disclosures = ['hoa', 'cic2'];
    var drafts = ['paa1u'];
    var labels = {
      contract: 'Contract', convey: 'Contract', add1: 'Addendum', check: 'Deposit', hoa: 'HOA', cic2: 'HOA', hoamail: 'HOA',
      inspection: 'Inspection', wdi: 'Inspection', moisture: 'Inspection', invoice: 'Invoice', picra: 'Repair Request',
      counter: 'Counter', add2: 'Addendum', picraok: 'Repair Request', paa1u: 'Addendum', paa1: 'Addendum', fha: 'Loan',
      hoaupdate: 'HOA', hoapaid: 'HOA', hoaupd: 'HOA', extend: 'Addendum', walk: 'Walk-through', alta: 'Closing Stmt.', cda: 'Commission'
    };
    Object.keys(DOCS).forEach(function (k) {
      DOC_TYPES[k] = {
        type: reports.indexOf(k) > -1 ? 'report' : (disclosures.indexOf(k) > -1 ? 'disclosure' : 'contract'),
        badge: drafts.indexOf(k) > -1 ? 'draft' : 'signed',
        label: labels[k] || 'Document'
      };
    });
  })();

/* ══════════════════════════════════════════════════════════
   VA SIMULATED CONTENT for tc-va-case.js (4232 Maplehurst Road)
   Written by agent 2 for agent 1 to paste inside install().

   WHERE TO PASTE: inside install(), AFTER these exist: TC_NAME, TC_ADDR,
   TC_FIRST, TC_SIGN, the *_SIG vars (SHANNON_SIG, KAREN_SIG, BRAD_SIG,
   JOEL_SIG, DIANA_SIG, JEMAL_SIG), toMe() and CONTACTS. Then:
     · Object.assign(CONTACTS, VA_SIM_CONTACTS); CONTACT_ORDER = CONTACT_ORDER.concat(VA_SIM_CONTACT_ORDER)
       ('fake' is NOT in VA_SIM_CONTACT_ORDER on purpose)
     · TC_EMAILS = TC_EMAILS.concat(VA_SIM_EMAILS.map(function (e) { return em(e); }))
       then set onRead: onReadRefresh on every e.arrival === 'reply' item
     · inbox items in a step body: inbox(e.id, e.from, e.html, e.opts)  (use vaSimMail(id))
     · VA_SIM_COMPOSE[i].kind === 'compose'   -> compose(c.compose) + mailTask(c.key, c.task.title, c.task.sub, c.task.sentId) + inbox(reply)
       VA_SIM_COMPOSE[i].kind === 'replyPick' -> replyPick(Object.assign({}, c.compose, c.task, { replyId, replyFrom, replyBody, replyOpts }))
       (vaSimReplyPickArgs(key) builds that object for you)
     · VA_SIM_DECISIONS: mode 'chat' -> chat(id, q, choices, fb, who); mode 'decision' -> decision(id, q, choices, fb)
     · Object.assign(TASK_HINTS, VA_SIM_TASK_HINTS)
     · VA_SIM_STEP_HINTS[0..7] (3 strings each) to merge with STEP_HINTS
     · VA_SIM_PHASE_PLAN: where every item goes relative to agent 1's sub-steps.

   ─── REAL (from the signed file, used as fixed facts) ───
   Ratified 02/22/2026; REIN agreement; buyers Sergio P Malonzo Jr. and
   Jasmin Malonzo; seller Jemal O Tamem; Shannon Paschall (AtCoastal
   Realty, broker Jon McAchran); Diana Martinez; Karen Archbell (BHHS RW
   Towne Realty, escrow agent for the $500 deposit); Brad Watts (Archer
   Mortgage, FHA loan 202602916, FHA case 544-4490289-703); Joel C. Gueli
   (RW Towne Title LLC, file 22026-67041); PMA / Timberlake Community
   Association, David Lukus, certificate PMA-A08775 prepared 01/20,
   CIC-2 receipt 02/23 signed 03/03, Appendix 15 reply 03/04, dues $53.80;
   Keff/Spec home inspection 02/22; Eliminator WDI and moisture reports
   02/24 (no WDI, moisture N/A slab), $90 invoice paid by the buyers;
   PICRA 02/25; counter 02/28 and 03/01 ($290,000, $5,000 credit, as is,
   appraisal at least $290,000); Addendum #2 to 03/06; PAA-1 and ratified
   PICRA 03/06; buyers authorize appraisal by 03/09; FHA Amendatory
   Clause buyers 03/11, seller 03/26 with the Real Estate Certification;
   original settlement 03/17, ¶8 extension limit 03/27; PMA update ordered
   03/20 (PMA-A08954, payment hold, wrong 3/20 date), paid 03/30 8:11 AM
   $72.77, update dated 04/02; extension addendum signed 03/27 to 03/30;
   walk through 11:22 AM 03/30; ALTA 03/30: price $290,000, seller credit
   $5,000, deposit $500, VHDA payoffs $97,149.98, AtCoastal $5,800, BHHS
   $7,250, LA admin fee $595, home warranty $700 and WDI $90 paid by the
   buyers, seller net $171,729.53, buyers' cash $500, FHLBank Atlanta
   $17,500; CDA 04/01 ($6,261.63 net to Shannon Paschall, Inc.).

   ─── SIMULATED (not in the file; fills gaps, never contradicts it) ───
   · Contacts: Megan Ross (Settlement Processor, RW Towne Title), Lauren
     Pike (Loan Processor, Archer Mortgage), PMA Resale Department,
     Eliminator Scheduling, and a fraud sender. All emails use .example
     domains (fraud: a lookalike domain) and phones are 555 numbers.
   · Every email in VA_SIM_EMAILS (bodies, times, subjects). Times sit
     inside the real timeline and never move a real event.
   · Specific simulated facts inside those emails: Joel opening the file
     on 02/23; Archer taking the application on 02/26 with both
     borrowers; the Eliminator appointment Tue 02/24 at 10:00 AM; PMA
     delivering the certificate by email on 02/23 (matches the CIC-2
     receipt date); appraisal back 03/13 supporting $290,000 with no
     FHA required repairs; Brad's 03/16 note that underwriting will not
     make 03/17; Joel asking for the HOA update 03/19; final approval and
     Closing Disclosure 03/25; settlement times on 03/30 (buyers 1:00 PM,
     seller 2:30 PM); the phishing email 03/27; loan funded 03/30; deed
     recorded and funds disbursed 03/31; post-closing handling of the
     04/02 PMA update.
   · All compose tasks, decisions, task hints, step hints and the plan.
   ══════════════════════════════════════════════════════════ */

  /* ════════════════ Contacts (simulated) ════════════════ */
  var VA_SIM_CONTACTS = {
    'megan':  { name: 'Megan Ross', role: 'Settlement Processor (simulated)', brokerage: 'RW Towne Title LLC', email: 'megan.ross@rwtownetitle.example', phone: '(757) 555-0142', initials: 'MR', color: 'linear-gradient(135deg, #4338ca, #6366f1)' },
    'lauren': { name: 'Lauren Pike', role: 'Loan Processor (simulated)', brokerage: 'Archer Mortgage', email: 'lauren.pike@archermortgage.example', phone: '(757) 555-0178', initials: 'LP', color: 'linear-gradient(135deg, #374151, #6b7280)' },
    'pma':    { name: 'PMA Resale Department', label: 'PMA Resale Desk', role: 'Resale certificates (simulated)', brokerage: 'Property Management Associates', email: 'resale@pma.example', phone: '(757) 555-0110', initials: 'PM', color: 'linear-gradient(135deg, #6d28d9, #8b5cf6)' },
    'elim':   { name: 'Eliminator Scheduling', label: 'Eliminator Scheduling', role: 'WDI & moisture scheduling (simulated)', brokerage: 'Eliminator Termite Pest & Moisture Control', email: 'schedule@eliminatorpest.example', phone: '(757) 555-0163', initials: 'EL', color: 'linear-gradient(135deg, #166534, #22c55e)' },
    /* fraud sender: give it a card, keep it OUT of CONTACT_ORDER */
    'fake':   { name: 'Joel Gueli', label: 'Joel Gueli', role: 'Unknown sender', brokerage: 'rwtownetitle-closing.com', email: 'joel.gueli@rwtownetitle-closing.com', phone: '', initials: 'JG', color: 'linear-gradient(135deg, #991b1b, #ef4444)' }
  };
  var VA_SIM_CONTACT_ORDER = ['megan', 'lauren', 'pma', 'elim'];
  /* lowercase substrings that identify each new contact in To/CC fields */
  var VA_SIM_CONTACT_MATCH = {
    megan:  ['megan', 'ross', 'megan.ross@'],
    lauren: ['lauren', 'pike', 'lauren.pike@'],
    pma:    ['pma', 'resale@pma'],
    elim:   ['eliminator', 'schedule@eliminatorpest'],
    /* only the lookalike domain: 'joel'/'gueli' must keep matching the real Joel */
    fake:   ['rwtownetitle-closing']
  };

  var MEGAN_SIG =
    '<p style="margin-top:14px;">Megan Ross<br>Settlement Processor &middot; RW Towne Title LLC<br>File 22026-67041 &middot; (757) 555-0142</p>';
  var LAUREN_SIG =
    '<p style="margin-top:14px;">Lauren Pike<br>Loan Processor &middot; Archer Mortgage<br>Working with Brad Watts &middot; (757) 555-0178</p>';
  var PMA_SIG =
    '<p style="margin-top:14px;">Resale Department<br>Property Management Associates (PMA)<br>Managing agent for Timberlake Community Association</p>';
  var ELIM_SIG =
    '<p style="margin-top:14px;">Scheduling Office<br>Eliminator Termite Pest &amp; Moisture Control<br>(757) 555-0163</p>';

  /* ════════════════ Emails (all simulated) ════════════════
     Shape: em() fields + html (body) + opts ({to, attach}) for inbox().
     Sent items: folder 'sent' + composeKey, snip ''. Replies: arrival 'reply' + afterKey. */
  var VA_SIM_EMAILS = [
    /* ── Phase 2 · Seller & parties ── */
    { id: 'va2_joel_open', step: 2, from: 'joel',
      subject: 'File opened: 4232 Maplehurst Road (22026-67041)', snip: 'We opened settlement file 22026-67041 and ordered title. A few items from the seller side.', time: 'Feb 23 · 1:05 PM',
      html: '<p>Hi ' + TC_FIRST + ',</p>' +
        '<p>Thank you for the ratified contract. RW Towne Title opened settlement file <strong>22026-67041</strong> for 4232 Maplehurst Road and ordered the title search today. Settlement is set for <strong>Tue, Mar 17</strong> per ¶8.</p>' +
        '<p>From the seller side I need:</p>' +
        '<ul>' +
          '<li>Jemal&rsquo;s <strong>seller information sheet</strong> (forwarding address and how he wants his proceeds). He can call our office for anything sensitive. Please do not send ID numbers by email.</li>' +
          '<li>His <strong>VHDA</strong> loan number(s) and a signed payoff authorization, so we can order the payoff</li>' +
          '<li>The resale certificate, once PMA sends it</li>' +
        '</ul>' +
        '<p>The $500 deposit stays with BHHS RW Towne Realty as escrow agent until settlement, when it is credited to the buyers.</p>' + JOEL_SIG,
      opts: { to: 'To: ' + toMe() + ' &middot; CC: Shannon Paschall', attach: ['contract'] } },
    { id: 'va2_sent_jemal_info', step: 2, from: 'tc', folder: 'sent', composeKey: 'va-joel-seller',
      subject: 'What the settlement agent needs from you: 4232 Maplehurst Road', snip: '', time: 'Feb 23 · 1:40 PM' },
    { id: 'va2_jemal_info', step: 2, from: 'jemal', arrival: 'reply', afterKey: 'va-joel-seller',
      subject: 'Re: What the settlement agent needs from you: 4232 Maplehurst Road', snip: 'I will call Joel tomorrow with my VHDA information.', time: 'Feb 23 · 4:15 PM',
      html: '<p>Thanks for laying it out. I will call Joel tomorrow morning with my VHDA loan information and sign the payoff authorization he sends. I did not want to put that in an email anyway.</p>' + JEMAL_SIG,
      opts: { to: 'To: ' + toMe() + ' &middot; CC: Joel C. Gueli, Shannon Paschall' } },
    { id: 'va2_brad_app', step: 2, from: 'brad',
      subject: 'Re: Ratified contract: 4232 Maplehurst Road', snip: 'Application appointment is set for Thursday with both Jasmin and Sergio.', time: 'Feb 24 · 10:20 AM',
      html: '<p>Hi ' + TC_FIRST + ',</p>' +
        '<p>Got the ratified contract, thank you. The buyers&rsquo; full loan application is set for <strong>Thursday, Feb 26</strong>, inside the 7 days in ¶6A. <strong>Both Jasmin Malonzo and Sergio P Malonzo Jr.</strong> will be on the application; the pre approval letter only showed Jasmin because she started the file.</p>' +
        '<p>I will hold the appraisal order until the inspection contingency is resolved, as the buyers asked. My processor, <strong>Lauren Pike</strong>, will send status updates from here.</p>' + BRAD_SIG,
      opts: { to: 'To: ' + toMe() + ' &middot; CC: Karen Archbell, Shannon Paschall' } },

    /* ── Phase 4 · HOA & disclosures ── */
    { id: 'va4_pma_delivery', step: 4, from: 'pma',
      subject: 'Resale certificate delivered: PMA-A08775, 4232 Maplehurst Road', snip: 'Per the CIC-1, the certificate was emailed today to the buyers, Karen Archbell and RW Towne Title.', time: 'Feb 23 · 3:45 PM',
      html: '<p>Hello,</p>' +
        '<p>As instructed on the CIC-1, the resale certificate for <strong>4232 Maplehurst Road</strong> (Timberlake Community Association, order <strong>PMA-A08775</strong>, prepared 01/20/2026) was emailed today to:</p>' +
        '<ul><li>Sergio P Malonzo Jr. and Jasmin Malonzo</li><li>Karen Archbell, BHHS RW Towne Realty</li><li>Joel Gueli, RW Towne Title LLC</li></ul>' +
        '<p>The current assessment is $53.80 a month, due the 1st. For a financial update closer to settlement, place an update order through our portal at least 10 business days ahead.</p>' + PMA_SIG,
      opts: { to: 'To: ' + toMe() + ', Shannon Paschall', attach: ['hoa'] } },

    /* ── Phase 5 · Inspections ── */
    { id: 'va5_elim_schedule', step: 5, from: 'elim',
      subject: 'WDI and moisture inspection: 4232 Maplehurst Road', snip: 'The buyers ordered a WDI and moisture inspection. Can we get in Tuesday at 10:00 AM?', time: 'Feb 23 · 9:10 AM',
      html: '<p>Good morning,</p>' +
        '<p>The buyers&rsquo; agent, Karen Archbell, ordered a <strong>WDI (NPMA-33) and moisture inspection</strong> for 4232 Maplehurst Road. Eric Trotter can be there <strong>Tuesday, Feb 24 at 10:00 AM</strong>. It takes about an hour.</p>' +
        '<p>Please confirm access and let us know of any pets or alarm. We need every room, the utility room and the exterior.</p>' + ELIM_SIG,
      opts: { to: 'To: ' + toMe() + ' &middot; CC: Karen Archbell' } },
    { id: 'va5_sent_elim_access', step: 5, from: 'tc', folder: 'sent', composeKey: 'va-elim-access',
      subject: 'Re: WDI and moisture inspection: 4232 Maplehurst Road', snip: '', time: 'Feb 23 · 9:30 AM' },
    { id: 'va5_elim_confirm', step: 5, from: 'elim', arrival: 'reply', afterKey: 'va-elim-access',
      subject: 'Re: WDI and moisture inspection: 4232 Maplehurst Road', snip: 'Confirmed for Tuesday at 10:00 AM. Reports go to Karen the same day.', time: 'Feb 23 · 10:05 AM',
      html: '<p>Thank you. Confirmed for <strong>Tuesday, Feb 24 at 10:00 AM</strong> through Shannon&rsquo;s showing system. Eric will send the WDI and moisture reports and the invoice to Karen the same day, with a copy to you.</p>' + ELIM_SIG,
      opts: { to: 'To: ' + toMe() + ' &middot; CC: Shannon Paschall, Karen Archbell' } },
    { id: 'va5_elim_reports', step: 5, from: 'elim',
      subject: 'Reports: 4232 Maplehurst Road (WDI and moisture)', snip: 'No visible wood destroying insects. Moisture: N/A, slab. Invoice $90.00.', time: 'Feb 24 · 4:15 PM',
      html: '<p>Hello,</p>' +
        '<p>Attached are today&rsquo;s reports for 4232 Maplehurst Road, inspected by Eric Trotter:</p>' +
        '<ul>' +
          '<li><strong>WDI (NPMA-33):</strong> no visible evidence of wood destroying insects; no treatment recommended</li>' +
          '<li><strong>Moisture:</strong> marked <strong>N/A: foundation slab</strong></li>' +
          '<li><strong>Invoice:</strong> $90.00 for both, ordered by the buyers&rsquo; side</li>' +
        '</ul>' + ELIM_SIG,
      opts: { to: 'To: Karen Archbell &middot; CC: ' + toMe(), attach: ['wdi', 'moisture', 'invoice'] } },
    { id: 'va5_sent_picra_seller', step: 5, from: 'tc', folder: 'sent', composeKey: 'va-picra-seller',
      subject: "The buyers' repair request: 4232 Maplehurst Road", snip: '', time: 'Feb 25 · 5:30 PM' },
    { id: 'va5_jemal_picra', step: 5, from: 'jemal', arrival: 'reply', afterKey: 'va-picra-seller',
      subject: "Re: The buyers' repair request: 4232 Maplehurst Road", snip: 'Got it. I will read the reports tonight and talk to Shannon.', time: 'Feb 25 · 8:10 PM',
      html: '<p>Got it, thank you. Fifteen items is more than I expected. I will read the reports tonight and talk to Shannon before Monday.</p>' + JEMAL_SIG,
      opts: { to: 'To: ' + toMe() + ' &middot; CC: Shannon Paschall' } },

    /* ── Phase 6 · Repairs ── */
    { id: 'va6_sent_lender_picra', step: 6, from: 'tc', folder: 'sent', composeKey: 'va-lender-picra',
      subject: 'Ratified PICRA and PAA-1: 4232 Maplehurst Road ($290,000)', snip: '', time: 'Mar 6 · 5:15 PM' },
    { id: 'va6_brad_picra', step: 6, from: 'brad', arrival: 'reply', afterKey: 'va-lender-picra',
      subject: 'Re: Ratified PICRA and PAA-1: 4232 Maplehurst Road ($290,000)', snip: 'Updating the loan to $290,000. New FHA Amendatory Clause coming.', time: 'Mar 6 · 6:00 PM',
      html: '<p>Thank you, this is exactly what underwriting needs. We are updating the file to <strong>$290,000</strong> with the <strong>$5,000 seller credit</strong>, and I will send a new <strong>FHA Amendatory Clause</strong> at $290,000 for signatures. The appraisal goes out as soon as the buyers authorize it (by Monday, Mar 9).</p>' + BRAD_SIG,
      opts: { to: 'To: ' + toMe() + ' &middot; CC: Joel C. Gueli, Karen Archbell, Shannon Paschall' } },

    /* ── Phase 7 · Pre-closing ── */
    { id: 'va7_lauren_appraisal', step: 7, from: 'lauren',
      subject: 'Appraisal received: 4232 Maplehurst Road (loan 202602916)', snip: 'The appraisal supports the $290,000 price. No FHA required repairs.', time: 'Mar 13 · 2:40 PM',
      html: '<p>Hi ' + TC_FIRST + ',</p>' +
        '<p>The FHA appraisal for 4232 Maplehurst Road (FHA case 544-4490289-703) came back today. It <strong>supports the $290,000 contract price</strong> and lists <strong>no FHA required repairs</strong>. The file is now in underwriting.</p>' + LAUREN_SIG,
      opts: { to: 'To: ' + toMe() + ', Karen Archbell &middot; CC: Brad Watts' } },
    { id: 'va7_brad_timing', step: 7, from: 'brad',
      subject: 'Settlement timing: 4232 Maplehurst Road', snip: 'Underwriting still has conditions. We will not be ready for Tuesday, Mar 17.', time: 'Mar 16 · 9:30 AM',
      html: '<p>Hi ' + TC_FIRST + ',</p>' +
        '<p>Heads up: underwriting issued conditions on Friday and we are still clearing them. We will <strong>not</strong> have a clear to close for <strong>Tuesday, Mar 17</strong>. This is loan processing, so the ¶8 extension applies, but I would rather see a new date in writing than run against it.</p>' + BRAD_SIG,
      opts: { to: 'To: ' + toMe() + ', Karen Archbell &middot; CC: Joel C. Gueli, Shannon Paschall' } },
    { id: 'va7_joel_hoa', step: 7, from: 'joel',
      subject: 'HOA figures for settlement: 4232 Maplehurst Road', snip: 'The certificate is from January. Can the listing side order a financial update from PMA?', time: 'Mar 19 · 11:15 AM',
      html: '<p>Hi ' + TC_FIRST + ',</p>' +
        '<p>The resale certificate we have was prepared on <strong>01/20/2026</strong>. To prorate dues and collect any balance at settlement I need current figures. Could the listing side order a <strong>financial update</strong> from PMA? Please give them the correct settlement date when you order.</p>' + JOEL_SIG,
      opts: { to: 'To: ' + toMe() + ' &middot; CC: Shannon Paschall', attach: ['hoa'] } },
    { id: 'va7_lauren_ctc', step: 7, from: 'lauren',
      subject: 'Final approval: 4232 Maplehurst Road (loan 202602916)', snip: 'Approved. We need the seller to sign the FHA Amendatory Clause and the Real Estate Certification.', time: 'Mar 25 · 10:00 AM',
      html: '<p>Hi ' + TC_FIRST + ',</p>' +
        '<p>Good news: the loan has <strong>final approval</strong>. The Closing Disclosure went to the buyers electronically this morning and they acknowledged it.</p>' +
        '<p>Two items from the seller side before we can release a clear to close:</p>' +
        '<ul><li>The <strong>FHA Amendatory Clause</strong> at $290,000, signed by the seller (the buyers signed on Mar 11)</li><li>The <strong>Real Estate Certification</strong>, signed by buyers, seller and both agents</li></ul>' + LAUREN_SIG,
      opts: { to: 'To: ' + toMe() + ', Karen Archbell &middot; CC: Brad Watts', attach: ['fha'] } },
    { id: 'va7_sent_fha_jemal', step: 7, from: 'tc', folder: 'sent', composeKey: 'va-fha-jemal',
      subject: 'Two lender forms to sign: 4232 Maplehurst Road', snip: '', time: 'Mar 25 · 10:45 AM' },
    { id: 'va7_jemal_fha', step: 7, from: 'jemal', arrival: 'reply', afterKey: 'va-fha-jemal',
      subject: 'Re: Two lender forms to sign: 4232 Maplehurst Road', snip: 'Both are signed and back to Shannon.', time: 'Mar 26 · 3:20 PM',
      html: '<p>Signed both today, the FHA clause and the certification, and sent them back to Shannon. Let me know if anything else is missing.</p>' + JEMAL_SIG,
      opts: { to: 'To: ' + toMe() + ' &middot; CC: Shannon Paschall', attach: ['fha'] } },
    { id: 'va7_megan_schedule', step: 7, from: 'megan',
      subject: 'Settlement scheduled: 4232 Maplehurst Road, Mon Mar 30', snip: 'Buyers at 1:00 PM, seller at 2:30 PM. We need the signed extension today.', time: 'Mar 27 · 10:30 AM',
      html: '<p>Hi ' + TC_FIRST + ',</p>' +
        '<p>Settlement for file 22026-67041 is scheduled at our office on <strong>Monday, Mar 30</strong>: buyers at <strong>1:00 PM</strong> (after their walk through), seller at <strong>2:30 PM</strong>.</p>' +
        '<ul><li>The VHDA payoff is ordered and good through Mar 31</li><li>We still need the HOA financial update from PMA</li><li>We need the <strong>signed addendum moving settlement to Mar 30</strong>. Today is the last day the ¶8 extension reaches.</li></ul>' + MEGAN_SIG,
      opts: { to: 'To: ' + toMe() + ', Karen Archbell &middot; CC: Joel C. Gueli' } },
    { id: 'va7_jemal_phish', step: 7, from: 'jemal',
      subject: 'FW: Proceeds wire form: 22026-67041', snip: 'Title wants my bank details today for the proceeds. Is this OK to send?', time: 'Mar 27 · 6:40 PM',
      html: '<p>Hi, I got this from the title company. Is it OK to send them my bank details? I want my money Monday.</p>' + JEMAL_SIG +
        '<div style="margin-top:14px;padding:14px 16px;border:1px solid #e2e8f0;border-left:4px solid #94a3b8;border-radius:8px;background:#f8fafc;font-size:13px;color:#334155;">' +
          '<div style="font-size:12px;color:#64748b;margin-bottom:8px;">---------- Forwarded message ----------<br>From: <strong>Joel Gueli</strong> &lt;joel.gueli@rwtownetitle-closing.com&gt;<br>Date: Fri, Mar 27, 2026 at 6:12 PM<br>Subject: Proceeds wire form: 22026-67041</div>' +
          '<p>Dear Seller,</p><p>Settlement for 4232 Maplehurst Road is Monday. To wire your proceeds that day, reply tonight with your bank name, routing number and account number. Files without wire details will be <strong>delayed</strong>.</p>' +
          '<p>I am out of the office until Monday, so please do not call. Just reply to this email.</p><p>Joel Gueli, RW Towne Title</p>' +
        '</div>',
      opts: { to: 'To: ' + toMe() + ' &middot; CC: Shannon Paschall' } },
    { id: 'va7_sent_wire', step: 7, from: 'tc', folder: 'sent', composeKey: 'va-wire-jemal',
      subject: 'Do not send your bank details: 4232 Maplehurst Road', snip: '', time: 'Mar 27 · 7:00 PM' },
    { id: 'va7_joel_wire', step: 7, from: 'joel', arrival: 'reply', afterKey: 'va-wire-jemal',
      subject: 'Re: Do not send your bank details: 4232 Maplehurst Road', snip: 'That email is not from us. I will take Jemal’s instructions by phone.', time: 'Mar 27 · 7:35 PM',
      html: '<p>Thank you for catching this. That email did <strong>not</strong> come from RW Towne Title; our domain is rwtownetitle.com. Jemal, I will call you Monday morning at the number in our file to take your proceeds instructions by phone. We never change or collect wire instructions by email.</p>' + JOEL_SIG,
      opts: { to: 'To: ' + toMe() + ', Jemal O Tamem &middot; CC: Shannon Paschall' } },

    /* ── Phase 8 · Closing ── */
    { id: 'va8_brad_funded', step: 8, from: 'brad',
      subject: 'Funded: 4232 Maplehurst Road (loan 202602916)', snip: 'The loan funded and the wire went to RW Towne Title.', time: 'Mar 30 · 3:10 PM',
      html: '<p>The buyers signed and the loan <strong>funded</strong>. Our wire went to RW Towne Title this afternoon. Congratulations to everyone on getting this one across the line.</p>' + BRAD_SIG,
      opts: { to: 'To: ' + toMe() + ', Karen Archbell, Joel C. Gueli &middot; CC: Shannon Paschall' } },
    { id: 'va8_joel_recorded', step: 8, from: 'joel',
      subject: 'Recorded and disbursed: 4232 Maplehurst Road (22026-67041)', snip: 'The deed recorded today. VHDA payoffs, proceeds and commissions are disbursed.', time: 'Mar 31 · 2:00 PM',
      html: '<p>Hi ' + TC_FIRST + ',</p>' +
        '<p>The deed for 4232 Maplehurst Road <strong>recorded today</strong> in the Clerk&rsquo;s Office of the Circuit Court of the City of Virginia Beach. Disbursements went out per the ALTA dated 03/30/2026:</p>' +
        '<ul>' +
          '<li>VHDA payoffs: <strong>$97,149.98</strong></li>' +
          '<li>Seller proceeds: <strong>$171,729.53</strong>, wired per the instructions Jemal gave me by phone</li>' +
          '<li>AtCoastal Realty: $5,800.00 compensation and the $595.00 LA admin fee</li>' +
          '<li>BHHS RW Towne Realty: $7,250.00</li>' +
        '</ul>' +
        '<p>The HOA financial update from PMA has not arrived yet. If it changes anything, I will handle it with both sides.</p>' + JOEL_SIG,
      opts: { to: 'To: ' + toMe() + ', Karen Archbell &middot; CC: Shannon Paschall', attach: ['alta'] } },
    { id: 'va8_sent_jemal_wrap', step: 8, from: 'tc', folder: 'sent', composeKey: 'va-jemal-wrap',
      subject: 'Closed: 4232 Maplehurst Road, your final numbers', snip: '', time: 'Mar 31 · 4:00 PM' },
    { id: 'va8_jemal_wrap', step: 8, from: 'jemal', arrival: 'reply', afterKey: 'va-jemal-wrap',
      subject: 'Re: Closed: 4232 Maplehurst Road, your final numbers', snip: 'The money is in my account. Thank you for catching that fake email.', time: 'Mar 31 · 6:20 PM',
      html: '<p>The proceeds are in my account. Thank you for walking me through every step, and for catching that fake title email. I would have sent my bank details.</p>' + JEMAL_SIG,
      opts: { to: 'To: ' + toMe() + ' &middot; CC: Shannon Paschall' } },
    { id: 'va8_pma_update', step: 8, from: 'pma',
      subject: 'Financial update: PMA-A08954, 4232 Maplehurst Road', snip: 'Your financial update order is complete. The update is attached.', time: 'Apr 2 · 9:30 AM',
      html: '<p>Hello,</p>' +
        '<p>Financial update order <strong>PMA-A08954</strong> for 4232 Maplehurst Road (Timberlake Community Association) is complete. The update, prepared 04/02/2026, is attached. Payment for the order was received on 03/30/2026.</p>' + PMA_SIG,
      opts: { to: 'To: Shannon Paschall &middot; CC: ' + toMe(), attach: ['hoaupd', 'hoapaid'] } },
    { id: 'va8_sent_hoa_forward', step: 8, from: 'tc', folder: 'sent', composeKey: 'va-hoa-forward',
      subject: 'HOA financial update received after settlement: 4232 Maplehurst Road', snip: '', time: 'Apr 2 · 10:00 AM' },
    { id: 'va8_joel_update', step: 8, from: 'joel', arrival: 'reply', afterKey: 'va-hoa-forward',
      subject: 'Re: HOA financial update received after settlement: 4232 Maplehurst Road', snip: 'Thank you. I will compare it with the dues we collected and close our file.', time: 'Apr 2 · 11:00 AM',
      html: '<p>Thank you. I will compare the update with the dues and balance we collected on the ALTA. If anything differs I will settle it with PMA and both sides, and then close file 22026-67041.</p>' + JOEL_SIG,
      opts: { to: 'To: ' + toMe() + ' &middot; CC: Shannon Paschall, Diana Martinez' } }
  ];
  function vaSimMail(id) {
    for (var i = 0; i < VA_SIM_EMAILS.length; i++) if (VA_SIM_EMAILS[i].id === id) return VA_SIM_EMAILS[i];
    return null;
  }

  /* ════════════════ Compose tasks (simulated, graded like every compose) ════════════════
     compose: the exact object for compose(); task: mailTask(key, title, sub, sentId);
     replyId: the reply in VA_SIM_EMAILS. replyPick items also carry choices. */
  var VA_SIM_COMPOSE = [
    { kind: 'compose', step: 2, key: 'va-joel-seller', replyId: 'va2_jemal_info',
      task: { title: 'Tell Jemal what title needs', sub: 'Ask the seller for what Joel listed. Copy Joel and Shannon. Nothing sensitive by email.', sentId: 'va2_sent_jemal_info' },
      compose: {
        key: 'va-joel-seller', scenario: 'tc-va-title-seller-items', prompt: 'Ask the seller for the settlement agent items (seller sheet, VHDA payoff), 4232 Maplehurst Road VA',
        to: 'Jemal O Tamem <ojemal69@yahoo.com>', cc: 'Joel C. Gueli <joel.gueli@rwtownetitle.com>, Shannon Paschall <shannon@shannonsellsva.com>',
        subj: 'What the settlement agent needs from you: 4232 Maplehurst Road',
        inst: 'Introduce Joel Gueli at RW Towne Title, then ask for the seller information sheet and the VHDA loan number(s) with a payoff authorization. Tell him to give anything sensitive to Joel by phone, never by email.',
        rules: {
          need: [['jemal', 'to', 'These items come from the seller: Jemal goes in To.'], ['joel', 'any', 'Copy Joel: he is the one collecting them.'], ['shannon', 'any', 'Copy Shannon.']],
          never: [['karen', 'The seller&rsquo;s loan and proceeds are private. Keep the buyers&rsquo; agent off this email.'], ['brad', 'The buyers&rsquo; lender has no role in the seller&rsquo;s payoff.']],
          subj: ['maplehurst', '4232', 'settlement', 'title']
        },
        ans: "Hi Jemal,\n\nJoel Gueli at RW Towne Title is our settlement agent (file 22026-67041). He has ordered title and will handle your payoff and proceeds at settlement on Tuesday, March 17. He needs two things from you:\n\n1. The seller information sheet (forwarding address and how you want your proceeds)\n2. Your VHDA loan number(s) and the payoff authorization he will send you to sign\n\nPlease give anything sensitive, like ID numbers or bank details, to Joel by phone, never by email. I have copied Joel and Shannon.\n\nBest,\n" + TC_SIGN
      } },

    { kind: 'replyPick', step: 5, key: 'va-elim-access', replyId: 'va5_elim_confirm',
      task: { title: 'Answer Eliminator', sentId: 'va5_sent_elim_access' },
      compose: {
        key: 'va-elim-access', scenario: 'tc-va-wdi-access', prompt: 'Confirm access for the buyers WDI and moisture inspection, 4232 Maplehurst Road VA',
        to: 'Eliminator Scheduling <schedule@eliminatorpest.example>', cc: 'Shannon Paschall <shannon@shannonsellsva.com>, Karen Archbell <karen@karenarchbell.com>',
        subj: 'Re: WDI and moisture inspection: 4232 Maplehurst Road',
        inst: 'Access on this listing runs through Shannon. Choose the reply that confirms the appointment without giving away access, then complete it.',
        rules: {
          need: [['elim', 'to', 'You are answering Eliminator.'], ['shannon', 'any', 'Copy Shannon: access runs through her.'], ['karen', 'any', 'Copy Karen: her buyers ordered it.']],
          subj: ['maplehurst', '4232', 'wdi', 'inspection']
        },
        choices: [
          { ok: true, label: 'Confirm through Shannon',
            preview: 'Book it through the showing system and tell the seller.',
            body: "Hello,\n\n[Day and time] works. Access is through Shannon Paschall's showing system and lockbox, so please book it there; I have copied Shannon. I will let the seller know. No pets or alarm. Please send the reports and invoice to Karen Archbell, with a copy to me, so they reach the settlement agent before the March 1 deadline.\n\nThanks,\n" + TC_SIGN },
          { ok: false, label: 'Email the lockbox code',
            preview: 'Fastest: send the code so Eric can let himself in.',
            fb: 'Never send a lockbox code by email. Access on this listing goes through Shannon&rsquo;s showing system, which logs who enters the home.',
            body: "Hello,\n\nTuesday works. The lockbox code is 1234, Eric can let himself in.\n\nThanks,\n" + TC_SIGN },
          { ok: false, label: 'Ask the seller to let him in',
            preview: 'Have Jemal meet Eric at the house.',
            fb: 'The buyers&rsquo; inspectors should not deal with the seller directly, and the seller does not need to be there. Use the listing agent&rsquo;s access process.',
            body: "Hello,\n\nPlease call the seller, Jemal, and he will meet Eric at the house.\n\nThanks,\n" + TC_SIGN },
          { ok: false, label: 'Push it to next week',
            preview: 'The seller is busy; try after March 1.',
            fb: 'The buyers have 7 days from ratification (until Mar 1) to get these reports under ¶13B. Blocking access would put the seller in the way of the contract.',
            body: "Hello,\n\nThis week is busy. Can we do it after March 1?\n\nThanks,\n" + TC_SIGN }
        ],
        ans: "Hello,\n\nTuesday, February 24 at 10:00 AM works. Access is through Shannon Paschall's showing system and lockbox, so please book it there; I have copied Shannon. I will let the seller know. No pets or alarm. Please send the reports and invoice to Karen Archbell, with a copy to me, so they reach the settlement agent before the March 1 deadline.\n\nThanks,\n" + TC_SIGN
      } },

    { kind: 'compose', step: 5, key: 'va-picra-seller', replyId: 'va5_jemal_picra',
      task: { title: 'Send Jemal the repair request', sub: 'Share the PICRA and the reports, explain the timeline and leave the decision to Jemal and Shannon. Copy Shannon.', sentId: 'va5_sent_picra_seller' },
      compose: {
        key: 'va-picra-seller', scenario: 'tc-va-picra-seller', prompt: 'Send the seller the buyers PICRA and explain the negotiation timeline, 4232 Maplehurst Road VA',
        to: 'Jemal O Tamem <ojemal69@yahoo.com>', cc: 'Shannon Paschall <shannon@shannonsellsva.com>',
        subj: "The buyers' repair request: 4232 Maplehurst Road", attach: ['picra', 'inspection', 'wdi', 'moisture'],
        inst: 'Say what arrived (15 items, delivered Feb 25 with the reports), that it is a request and not an obligation, that the negotiation period runs through Monday, Mar 2, and that Shannon will review his options with him. Do not tell him what to agree to.',
        rules: {
          need: [['jemal', 'to', 'This goes to the seller.'], ['shannon', 'any', 'Copy Shannon: the negotiation is hers to advise on.']],
          never: [['karen', 'Your client email stays on your side. Keep the buyers&rsquo; agent off it.']],
          subj: ['maplehurst', '4232', 'repair', 'picra']
        },
        ans: "Hi Jemal,\n\nThe buyers' agent delivered their repair request (PICRA) today, Wednesday, February 25, with a complete copy of the inspection reports. Both are attached.\n\n• It lists 15 items (roofing, plumbing, electrical and HVAC), each to be done by a licensed contractor\n• It is a request, not an obligation. You can agree, counter or decline\n• The negotiation period runs through Monday, March 2. Anything agreed has to be signed by then or extended in writing\n• The WDI report found no wood destroying insects\n\nShannon will call you to go over your options before you decide.\n\nBest,\n" + TC_SIGN
      } },

    { kind: 'compose', step: 6, key: 'va-lender-picra', replyId: 'va6_brad_picra',
      task: { title: 'Update the lender', sub: 'The PICRA is ratified and the PAA-1 is fully signed. Send both to Brad and copy the settlement agent and both agents.', sentId: 'va6_sent_lender_picra' },
      compose: {
        key: 'va-lender-picra', scenario: 'tc-va-lender-picra', prompt: 'Send the ratified PICRA and fully signed PAA-1 to the lender and settlement agent, 4232 Maplehurst Road VA',
        to: 'Brad Watts <brad@archermortgagellc.com>', cc: 'Joel C. Gueli <joel.gueli@rwtownetitle.com>, Karen Archbell <karen@karenarchbell.com>, Shannon Paschall <shannon@shannonsellsva.com>',
        subj: 'Ratified PICRA and PAA-1: 4232 Maplehurst Road ($290,000)', attach: ['picraok', 'paa1'],
        inst: 'Give the new terms: price $290,000, $5,000 seller credit toward closing costs, prepaids and lender approved expenses, no repairs, appraisal at least $290,000, Removal Acceptance Date 03/06/2026, and the Mar 9 appraisal authorization date.',
        rules: {
          need: [['brad', 'to', 'The loan has to catch up: Brad goes in To.'], ['joel', 'any', 'Copy Joel: the settlement figures change too.'], ['karen', 'any', 'Copy Karen.'], ['shannon', 'any', 'Copy Shannon.']],
          never: [['jemal', 'The lender works through the agents and you. Keep the seller off this one.']],
          subj: ['maplehurst', '4232', 'picra', 'paa']
        },
        ans: "Hi Brad,\n\nNow that the buyers have signed, here are the ratified PICRA and the fully signed PAA-1 for 4232 Maplehurst Road:\n\n• Purchase price: $290,000\n• Seller credit: $5,000 toward closing costs, prepaids and lender approved expenses\n• No repairs: sold as is\n• Appraisal must come in at $290,000 or more\n• Removal Acceptance Date: 03/06/2026, so the buyers authorize the appraisal by Monday, March 9\n\nJoel, please update the settlement figures. Settlement is still on or before March 17.\n\nThanks,\n" + TC_SIGN
      } },

    { kind: 'compose', step: 7, key: 'va-fha-jemal', replyId: 'va7_jemal_fha',
      task: { title: 'Get the seller signatures', sub: 'The lender needs Jemal on two forms before clear to close. Copy Shannon.', sentId: 'va7_sent_fha_jemal' },
      compose: {
        key: 'va-fha-jemal', scenario: 'tc-va-fha-seller', prompt: 'Ask the seller to sign the FHA Amendatory Clause and Real Estate Certification, 4232 Maplehurst Road VA',
        to: 'Jemal O Tamem <ojemal69@yahoo.com>', cc: 'Shannon Paschall <shannon@shannonsellsva.com>',
        subj: 'Two lender forms to sign: 4232 Maplehurst Road', attach: ['fha'],
        inst: 'Explain in plain words what each form is, that the lender cannot clear the loan without them, and ask him to sign right away. Mention the new settlement date being papered for Mar 30.',
        rules: {
          need: [['jemal', 'to', 'The seller signs: Jemal goes in To.'], ['shannon', 'any', 'Copy Shannon.']],
          never: [['karen', 'Keep the buyer side off your client email.']],
          subj: ['maplehurst', '4232', 'fha', 'sign']
        },
        ans: "Hi Jemal,\n\nThe buyers' loan has final approval. Before the lender can clear it to close, they need your signature on two short forms:\n\n1. FHA Amendatory Clause: confirms the price is $290,000 and that the buyers are protected if the appraisal had come in lower. The buyers signed it on March 11.\n2. Real Estate Certification: buyers, seller and both agents confirm the contract terms are complete and true.\n\nPlease sign both today or tomorrow. Settlement is being moved to Monday, March 30 by addendum, and these signatures are the last lender item from our side.\n\nThank you,\n" + TC_SIGN
      } },

    { kind: 'compose', step: 7, key: 'va-wire-jemal', replyId: 'va7_joel_wire',
      task: { title: 'Stop Jemal', sub: 'Warn the seller right away and bring in the real settlement agent and Shannon.', sentId: 'va7_sent_wire' },
      compose: {
        key: 'va-wire-jemal', scenario: 'tc-va-wire-fraud', prompt: 'Warn the seller about a proceeds wire fraud email, 4232 Maplehurst Road VA',
        to: 'Jemal O Tamem <ojemal69@yahoo.com>', cc: 'Joel C. Gueli <joel.gueli@rwtownetitle.com>, Shannon Paschall <shannon@shannonsellsva.com>',
        subj: 'Do not send your bank details: 4232 Maplehurst Road',
        inst: 'Tell him not to reply or send anything, name the red flags, and tell him to give proceeds instructions to Joel by phone using the number he already has, not one from that email. Copy the real Joel.',
        rules: {
          need: [['jemal', 'to', 'Jemal is about to send his bank details: he goes in To.'], ['joel', 'any', 'The real settlement agent has to know: copy Joel at rwtownetitle.com.'], ['shannon', 'any', 'Copy Shannon.']],
          never: [['fake', 'Never write back to the fake address, not even to complain.'], ['karen', 'This is about the seller&rsquo;s money. Keep the buyer side off it.']],
          subj: ['maplehurst', '4232', 'bank', 'wire', 'fraud']
        },
        ans: "Jemal,\n\nPlease do NOT reply to that email or send any bank information. It is a fraud attempt:\n\n• It comes from rwtownetitle-closing.com, not RW Towne Title's real address (rwtownetitle.com)\n• It rushes you and tells you not to call\n• Settlement agents never collect wire instructions by email\n\nCall Joel Gueli at the RW Towne Title number you already have from Shannon or your settlement papers, not any number in that email, and give him your proceeds instructions by phone. I have copied the real Joel and Shannon.\n\n" + TC_SIGN
      } },

    { kind: 'compose', step: 8, key: 'va-jemal-wrap', replyId: 'va8_jemal_wrap',
      task: { title: 'Send Jemal his final numbers', sub: 'Congratulate him, walk through the ALTA and list what happens after settlement. Copy Shannon.', sentId: 'va8_sent_jemal_wrap' },
      compose: {
        key: 'va-jemal-wrap', scenario: 'tc-va-seller-wrapup', prompt: 'Send the seller the post-settlement wrap-up with final numbers, 4232 Maplehurst Road VA',
        to: 'Jemal O Tamem <ojemal69@yahoo.com>', cc: 'Shannon Paschall <shannon@shannonsellsva.com>',
        subj: 'Closed: 4232 Maplehurst Road, your final numbers', attach: ['alta'],
        inst: 'Confirm settlement on Mar 30 and recording, give the key ALTA lines and the net proceeds, and list the after-closing items: keep the ALTA for taxes, the 1099-S from the settlement agent, insurance, utilities and HOA autopay.',
        rules: {
          need: [['jemal', 'to', 'This goes to the seller.'], ['shannon', 'any', 'Copy Shannon.']],
          never: [['karen', 'The seller&rsquo;s numbers are private. Leave the buyer side off.'], ['brad', 'The buyers&rsquo; lender does not get the seller&rsquo;s numbers.']],
          subj: ['maplehurst', '4232', 'closed', 'final']
        },
        ans: "Hi Jemal,\n\nCongratulations: 4232 Maplehurst Road settled on Monday, March 30, 2026, and the deed recorded on March 31.\n\nYour ALTA settlement statement is attached. The main lines:\n• Sale price: $290,000.00\n• Seller credit to the buyers: $5,000.00\n• VHDA payoffs: $97,149.98\n• Compensation: AtCoastal Realty $5,800.00 and BHHS RW Towne Realty $7,250.00, plus the $595.00 LA admin fee\n• Your net proceeds: $171,729.53, wired per the instructions you gave Joel by phone\n\nAfter settlement:\n• Keep the ALTA with your tax records. RW Towne Title reports the sale to the IRS on Form 1099-S\n• Cancel your homeowner's insurance now that the deed has recorded, and close your utility accounts\n• Stop any automatic HOA payment to PMA. Their financial update is still on its way, and Joel will handle any difference\n\nThank you for trusting Shannon and our team.\n\nBest,\n" + TC_SIGN
      } },

    { kind: 'compose', step: 8, key: 'va-hoa-forward', replyId: 'va8_joel_update',
      task: { title: 'Send the update to title', sub: 'The PMA update arrived after settlement. Get it to the settlement agent. Copy Shannon and Diana.', sentId: 'va8_sent_hoa_forward' },
      compose: {
        key: 'va-hoa-forward', scenario: 'tc-va-hoa-update-postclose', prompt: 'Forward the post-settlement HOA financial update to the settlement agent, 4232 Maplehurst Road VA',
        to: 'Joel C. Gueli <joel.gueli@rwtownetitle.com>', cc: 'Shannon Paschall <shannon@shannonsellsva.com>, Diana Martinez <diana@shannonsellsva.com>',
        subj: 'HOA financial update received after settlement: 4232 Maplehurst Road', attach: ['hoaupd', 'hoapaid'],
        inst: 'Explain why it is late (order placed 03/20, on payment hold until the $72.77 was paid on 03/30, prepared 04/02), attach it and ask Joel to compare it with the dues and balance on the ALTA and handle any difference.',
        rules: {
          need: [['joel', 'to', 'The settlement agent reconciles HOA figures: Joel goes in To.'], ['shannon', 'any', 'Copy Shannon.'], ['diana', 'any', 'Copy Diana for the file.']],
          subj: ['maplehurst', '4232', 'hoa', 'update']
        },
        ans: "Hi Joel,\n\nPMA's financial update for 4232 Maplehurst Road (order PMA-A08954) arrived this morning. It is dated 04/02/2026: the order was placed on 03/20, sat on payment hold until the $72.77 was paid on 03/30, and was only prepared after settlement.\n\nBoth the update and the paid order are attached. Could you compare it with the HOA dues and any balance collected on the 03/30 ALTA and let us know if anything needs to be adjusted between the parties?\n\nThanks,\n" + TC_SIGN
      } }
  ];
  /* builds the replyPick() argument for a 'replyPick' item */
  function vaSimReplyPickArgs(key) {
    for (var i = 0; i < VA_SIM_COMPOSE.length; i++) {
      var c = VA_SIM_COMPOSE[i];
      if (c.key !== key) continue;
      var r = vaSimMail(c.replyId) || {};
      var o = {};
      Object.keys(c.compose).forEach(function (k) { o[k] = c.compose[k]; });
      o.title = c.task.title; o.sub = c.task.sub; o.sentId = c.task.sentId;
      o.replyId = c.replyId; o.replyFrom = r.from; o.replyBody = r.html; o.replyOpts = r.opts || {};
      return o;
    }
    return null;
  }

  /* ════════════════ Decisions (simulated) ════════════════
     mode 'chat' -> chat(id, q, choices, fb, who); 'decision' -> decision(id, q, choices, fb). One ok per item. */
  var VA_SIM_DECISIONS = [
    { id: 'va-d-escrowagent', step: 1, mode: 'chat', who: 'shannon',
      q: '¶2 names BHHS RW Towne Realty as escrow agent, and the CIC-1 sends a copy to Joel Gueli at RW Towne Title. Are those the same thing?',
      choices: [
        { t: 'No. BHHS RW Towne Realty is the escrow agent that holds the $500 deposit. RW Towne Title LLC is the settlement agent that runs settlement, prepares the ALTA, records and disburses. The deposit is credited to the buyers at settlement.', ok: true },
        { t: 'Yes. They share a name, so they are one company and one role.', ok: false },
        { t: 'No, and the deposit has to move to the title company the day after ratification.', ok: false },
        { t: 'It does not matter who holds what until closing.', ok: false }
      ],
      fb: 'Two roles, two companies. The escrow agent keeps the deposit under the contract and Virginia escrow rules; the settlement agent closes the file. On the ALTA the $500 shows up as a credit to the buyers, and you will audit that line in Closing.' },

    { id: 'va-d-buyerdirect', step: 2, mode: 'decision',
      q: 'Jasmin Malonzo found your email on the contract and writes to you directly: can she come by this weekend to measure for curtains? What do you do?',
      choices: [
        { t: 'Thank her briefly and loop in Karen: requests from the buyers go through their agent, and Karen sets any visit up with Shannon.', ok: true },
        { t: 'Give her the lockbox details so she can go whenever is convenient.', ok: false },
        { t: 'Ignore the email. Buyers should not write to the listing side.', ok: false },
        { t: 'Call Jemal and have him let her in.', ok: false }
      ],
      fb: 'The buyers are represented, and ¶23 sends notices for them through the Selling Firm. Stay courteous, never give access yourself, and hand it to Karen so the visit is scheduled through Shannon.' },

    { id: 'va-d-emddeposit', step: 3, mode: 'decision',
      q: 'Karen asks if her office can hold the $500 check in the file until the inspection contingency is resolved, in case the buyers walk away. What is the answer?',
      choices: [
        { t: 'No. Under ¶5A the escrow agent deposits it within 5 business banking days after receipt, which is also what Virginia escrow rules expect of a broker.', ok: true },
        { t: 'Yes. Holding a deposit check is normal until contingencies clear.', ok: false },
        { t: 'Yes, as long as the seller agrees by phone.', ok: false },
        { t: 'No. It has to be deposited the same day it is received.', ok: false }
      ],
      fb: 'An undeposited check is not protection for anyone. ¶5A and the Virginia escrow rules call for deposit within 5 business banking days after receipt, so log the deposit date, not just the check date.' },

    { id: 'va-d-emdrelease', step: 3, mode: 'decision',
      q: 'Suppose the buyers terminated under the inspection contingency. Can BHHS RW Towne Realty release the $500 to them because Karen asks?',
      choices: [
        { t: 'Only with a written release signed by buyer and seller, a court order, or as Virginia law otherwise allows after notice to both parties. Never on one side’s request alone.', ok: true },
        { t: 'Yes. The buyers paid it, so their agent can ask for it back.', ok: false },
        { t: 'No. A deposit always goes to the seller when a contract ends.', ok: false },
        { t: 'Yes, if the listing agent does not object within 24 hours.', ok: false }
      ],
      fb: 'Deposit disputes are a common source of complaints. The safe default is a written release signed by both parties. Your job is to make sure the paperwork exists, not to decide who gets the money.' },

    { id: 'va-d-cic2date', step: 4, mode: 'decision',
      q: 'The buyers and Karen signed the CIC-2 on Mar 3, but it records receipt of the certificate on 02/23/2026. Karen asks whether the 3 day cancellation window started on Mar 3. What do you say?',
      choices: [
        { t: 'No. The clock runs from receipt, 02/23, so the window closed at 11:59 PM on Thu, Feb 26. The Mar 3 signature only acknowledges it.', ok: true },
        { t: 'Yes. Nothing counts until the buyers sign the CIC-2.', ok: false },
        { t: 'The window never started, because the certificate is from January.', ok: false },
        { t: 'It started on ratification, Feb 22.', ok: false }
      ],
      fb: 'The Virginia Property Owners&rsquo; Association Act ties the cancellation right to delivery of the certificate. PMA delivered it electronically on Feb 23, the date the CIC-2 records. A late signature on the receipt does not reopen the window.' },

    { id: 'va-d-poaa-end', step: 4, mode: 'decision',
      q: 'For your notes: if PMA had sent the certificate late, say on Mar 10 by email, how long would the buyers have to cancel?',
      choices: [
        { t: 'Three days after they received it (six days after the postmark if it had been mailed), and in any case the right ends at settlement.', ok: true },
        { t: 'Until settlement, no matter when it arrived.', ok: false },
        { t: 'Thirty days from receipt.', ok: false },
        { t: 'They would have no right to cancel once the contract is ratified.', ok: false }
      ],
      fb: 'That is why the delivery date matters to the listing side: a late certificate reopens a short cancellation right, and settlement ends it. Calendar the window the day the certificate goes out.' },

    { id: 'va-d-slab', step: 5, mode: 'decision',
      q: 'The Eliminator moisture report is marked "N/A: foundation slab." Jemal asks if that means something is wrong. What do you tell him?',
      choices: [
        { t: 'Nothing is wrong: the townhome sits on a slab, so there is no crawl space to test. Keep the report in the file; it still had to be delivered under ¶13B.', ok: true },
        { t: 'It means the inspection failed and must be redone before settlement.', ok: false },
        { t: 'It means moisture was found and the seller must treat it.', ok: false },
        { t: 'Remove it from the file, since it has no findings.', ok: false }
      ],
      fb: 'Read the code before you raise an alarm. A moisture inspection looks at crawl space framing; a slab has none. A clean WDI and an N/A moisture report mean no treatment is owed.' },

    { id: 'va-d-wdiinvoice', step: 5, mode: 'decision',
      q: 'Eliminator sent a $90.00 invoice for the WDI and moisture inspection. Who pays it?',
      choices: [
        { t: 'The buyers. ¶13B has them obtain the reports, and the $90 is charged to them on the ALTA.', ok: true },
        { t: 'The seller, because the inspection was done on his property.', ok: false },
        { t: 'AtCoastal Realty, as a listing expense.', ok: false },
        { t: 'Split 50/50 by custom.', ok: false }
      ],
      fb: 'Whoever the contract makes responsible for the report pays for it. You will see the $90 on the buyers&rsquo; side of the ALTA in Closing.' },

    { id: 'va-d-fhaconcession', step: 6, mode: 'decision',
      q: 'The counter raises the price to $290,000 and gives a $5,000 seller credit. Is the credit a problem on an FHA loan?',
      choices: [
        { t: 'No. FHA allows seller concessions up to 6% of the price ($17,400 here). $5,000 is within that, as long as it only pays closing costs, prepaids and lender approved expenses.', ok: true },
        { t: 'Yes. FHA does not allow any seller credit.', ok: false },
        { t: 'No, and any part the buyers do not use is paid to them in cash.', ok: false },
        { t: 'Yes, unless the seller pays the credit before settlement.', ok: false }
      ],
      fb: 'That is why the counter limits the credit to closing costs, prepaids and lender approved expenses. A credit can never be cash back to an FHA borrower, so Brad needs the exact wording.' },

    { id: 'va-d-cd', step: 7, mode: 'decision',
      q: 'The buyers received and acknowledged their Closing Disclosure electronically on Wed, Mar 25. Settlement is Mon, Mar 30. Is that enough time?',
      choices: [
        { t: 'Yes. Buyers must receive the CD at least 3 business days before settlement, and for this rule every day but Sunday and federal holidays counts: Thu 26, Fri 27, Sat 28. Monday works.', ok: true },
        { t: 'No. It has to be 7 calendar days.', ok: false },
        { t: 'No. Saturdays never count, so the earliest date is Tue, Mar 31.', ok: false },
        { t: 'The timing only matters for cash buyers.', ok: false }
      ],
      fb: 'The 3 business day waiting period is the lender&rsquo;s rule, but a TC who knows it can tell when a settlement date is realistic. A big change to the loan after the CD can restart the clock.' },

    { id: 'va-d-wire', step: 7, mode: 'decision',
      q: 'Jemal forwards an email from "Joel Gueli" at rwtownetitle-closing.com asking for his bank details tonight and saying not to call. Is it OK to send?',
      choices: [
        { t: 'No. Tell him not to reply or send anything, point out the lookalike domain and the pressure, and have him call Joel at the number he already has. Copy the real Joel.', ok: true },
        { t: 'Yes. The file number matches, so it is legitimate.', ok: false },
        { t: 'Reply to the sender and ask for proof they work at RW Towne Title.', ok: false },
        { t: 'Tell him to send it, but only the account number.', ok: false }
      ],
      fb: 'Real file details do not make an email real: fraudsters read the same emails you do. The red flags are the domain, the urgency and "do not call." Verify by phone with a number you already trust.' },

    { id: 'va-d-wetsettle', step: 8, mode: 'decision',
      q: 'Monday evening Jemal writes: "I signed at 2:30 and the money is not in my account yet. Is something wrong?" What do you tell him?',
      choices: [
        { t: 'Nothing is wrong. Under Virginia’s wet settlement rules Joel records the deed and disburses after settlement, generally within two business days. I will let you know as soon as he confirms.', ok: true },
        { t: 'Proceeds always arrive the same afternoon. Call your bank.', ok: false },
        { t: 'Ask the buyers’ lender to send the money directly.', ok: false },
        { t: 'Proceeds take 30 days in Virginia.', ok: false }
      ],
      fb: 'Set expectations with facts. Joel confirmed recording and disbursement on Mar 31: VHDA payoffs, the $171,729.53 to Jemal and both commissions.' },

    { id: 'va-d-postupdate', step: 8, mode: 'decision',
      q: 'PMA’s financial update arrives on Apr 2, three days after settlement. What do you do with it?',
      choices: [
        { t: 'Send it to Joel with Shannon and Diana copied, and ask him to compare it with the HOA dues and balance on the ALTA. The settlement agent handles any difference.', ok: true },
        { t: 'Nothing. The file is closed.', ok: false },
        { t: 'Send it to the buyers and ask them to pay any difference.', ok: false },
        { t: 'Ask PMA to change the date on it to before settlement.', ok: false }
      ],
      fb: 'An order on payment hold is how this happened: the $72.77 was only paid on Mar 30. Late paperwork still goes to the settlement agent so the books close clean, and the lesson goes in your notes for the next file.' }
  ];

  /* ════════════════ Task hints (TASK_HINTS shape, keyed by compose key) ════════════════ */
  var VA_SIM_TASK_HINTS = {
    'va-joel-seller': {
      title: 'Email: what the settlement agent needs from Jemal',
      l1: 'Get the seller to give RW Towne Title what it needs to order his payoff and pay his proceeds, without putting anything sensitive in email.',
      l2: 'Read Joel&rsquo;s file opening email. He lists the seller information sheet, the VHDA loan number(s) with a payoff authorization, and the resale certificate (PMA sends that one).',
      l3: '<div class="wf-task-hint-kicker">Requirements:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>To:</strong> <span class="wf-task-hint-chip">Jemal O Tamem</span></li>' +
            '<li><strong>CC:</strong> <span class="wf-task-hint-chip">Joel C. Gueli, Shannon Paschall</span>. <em style="color:#dc2626">Not Karen or Brad.</em></li>' +
            '<li><strong>Body:</strong> who Joel is (file 22026-67041), the seller information sheet, VHDA loan number(s) and payoff authorization, sensitive details by phone only.</li>' +
          '</ul>'
    },
    'va-elim-access': {
      title: 'Reply: access for the WDI and moisture inspection',
      l1: 'Confirm the buyers&rsquo; inspection without handing out access yourself.',
      l2: 'Access on this listing goes through Shannon&rsquo;s showing system and lockbox (her reply in Ratified Contract). The buyers need the reports by Mar 1 under ¶13B.',
      l3: '<div class="wf-task-hint-kicker">Recommended reply:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>Template:</strong> &ldquo;Confirm through Shannon&rdquo;</li>' +
            '<li><strong>Bracket:</strong> replace [Day and time] with <span class="wf-task-hint-chip">Tuesday, February 24 at 10:00 AM</span></li>' +
            '<li><strong>CC:</strong> Shannon and Karen</li>' +
          '</ul>'
    },
    'va-picra-seller': {
      title: 'Email: the buyers&rsquo; repair request to Jemal',
      l1: 'Tell the seller what arrived and how much time there is, and leave the decision to him and Shannon.',
      l2: 'Open the PICRA (delivered Feb 25). The 5 day negotiation period runs through Mon, Mar 2. The WDI report is clean.',
      l3: '<div class="wf-task-hint-kicker">Requirements:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>To:</strong> <span class="wf-task-hint-chip">Jemal O Tamem</span> &middot; <strong>CC:</strong> <span class="wf-task-hint-chip">Shannon Paschall</span></li>' +
            '<li><strong>Attach:</strong> the PICRA and the reports</li>' +
            '<li><strong>Body:</strong> 15 items, a request and not an obligation, deadline <span class="wf-task-hint-chip">Monday, March 2</span>, Shannon will call. No advice on what to accept.</li>' +
          '</ul>'
    },
    'va-lender-picra': {
      title: 'Email: ratified PICRA and PAA-1 to the lender',
      l1: 'Get the new price and credit to the lender and the settlement agent the day they become binding.',
      l2: 'Use the ratified PICRA and the PAA-1 the buyers signed on Mar 6. ¶6A gives the buyers 3 days after PICRA removal to authorize the appraisal.',
      l3: '<div class="wf-task-hint-kicker">Key facts:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>To:</strong> Brad Watts &middot; <strong>CC:</strong> Joel, Karen, Shannon</li>' +
            '<li><span class="wf-task-hint-chip">$290,000</span> price, <span class="wf-task-hint-chip">$5,000</span> credit toward closing costs, prepaids and lender approved expenses, no repairs</li>' +
            '<li>Appraisal at least $290,000; Removal Acceptance <span class="wf-task-hint-chip">03/06/2026</span>; appraisal authorized by <span class="wf-task-hint-chip">Mon, Mar 9</span></li>' +
          '</ul>'
    },
    'va-fha-jemal': {
      title: 'Email: seller signatures for the lender',
      l1: 'Get Jemal to sign the FHA Amendatory Clause and the Real Estate Certification so the loan can clear.',
      l2: 'Read Lauren&rsquo;s Mar 25 email. The buyers signed the clause on Mar 11. Settlement is moving to Mar 30 by addendum.',
      l3: '<div class="wf-task-hint-kicker">Requirements:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>To:</strong> <span class="wf-task-hint-chip">Jemal O Tamem</span> &middot; <strong>CC:</strong> <span class="wf-task-hint-chip">Shannon Paschall</span></li>' +
            '<li><strong>Body:</strong> what each form does in plain words, that it is the last lender item from the seller side, and ask him to sign right away.</li>' +
          '</ul>'
    },
    'va-wire-jemal': {
      title: 'Email: wire fraud alert to Jemal',
      l1: 'Stop the seller from sending his bank details to a fake title company and send him to the real one by phone.',
      l2: 'Compare the sender&rsquo;s domain with Joel&rsquo;s real address. Note the urgency and the &ldquo;do not call.&rdquo;',
      l3: '<div class="wf-task-hint-kicker">Requirements:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>To:</strong> Jemal &middot; <strong>CC:</strong> the real <span class="wf-task-hint-chip">joel.gueli@rwtownetitle.com</span> and Shannon</li>' +
            '<li><em style="color:#dc2626">Never write to rwtownetitle-closing.com.</em></li>' +
            '<li><strong>Body:</strong> do not reply or send anything, the red flags, call Joel at a number he already has.</li>' +
          '</ul>'
    },
    'va-jemal-wrap': {
      title: 'Email: final numbers to Jemal',
      l1: 'Congratulate the seller, confirm settlement and recording, and give him his numbers and his after-closing list.',
      l2: 'Use the ALTA dated 03/30/2026 and Joel&rsquo;s Mar 31 email.',
      l3: '<div class="wf-task-hint-kicker">Numbers from the ALTA:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li>Price <span class="wf-task-hint-chip">$290,000.00</span>, seller credit <span class="wf-task-hint-chip">$5,000.00</span></li>' +
            '<li>VHDA payoffs <span class="wf-task-hint-chip">$97,149.98</span></li>' +
            '<li>AtCoastal $5,800.00, BHHS RW Towne $7,250.00, LA admin fee $595.00</li>' +
            '<li>Net proceeds <span class="wf-task-hint-chip">$171,729.53</span></li>' +
            '<li><strong>After closing:</strong> keep the ALTA, 1099-S, insurance, utilities, HOA autopay. Copy Shannon only.</li>' +
          '</ul>'
    },
    'va-hoa-forward': {
      title: 'Email: late HOA update to the settlement agent',
      l1: 'Get the post-settlement PMA update to the person who can reconcile it.',
      l2: 'The order (PMA-A08954) was placed 03/20, on payment hold until 03/30, and prepared 04/02.',
      l3: '<div class="wf-task-hint-kicker">Requirements:</div>' +
          '<ul class="wf-task-hint-list">' +
            '<li><strong>To:</strong> <span class="wf-task-hint-chip">Joel C. Gueli</span> &middot; <strong>CC:</strong> Shannon, Diana</li>' +
            '<li><strong>Attach:</strong> the update and the paid order</li>' +
            '<li><strong>Body:</strong> why it is late, and ask him to compare it with the dues on the 03/30 ALTA.</li>' +
          '</ul>'
    }
  };

  /* ════════════════ "Ask Shannon" hints for the simulated items (STEP_HINTS shape, 0..7) ════════════════ */
  var VA_SIM_STEP_HINTS = {
    0: [
      'Two RW Townes: BHHS RW Towne Realty is Karen’s brokerage and holds the deposit; RW Towne Title LLC is the settlement agent.',
      'The deposit stays with the escrow agent until settlement, then shows up as a $500 credit to the buyers on the ALTA.',
      'Joel Gueli runs settlement, file 22026-67041. He records the deed and disburses.'
    ],
    1: [
      'Joel needs Jemal’s seller information sheet and his VHDA payoff authorization. Copy Joel, never Karen, on seller money matters.',
      'Nothing sensitive goes by email: ID numbers and bank details go to Joel by phone.',
      'Brad confirmed both Jasmin and Sergio are on the application. If a buyer writes to you directly, send it through Karen.'
    ],
    2: [
      'The escrow agent deposits the check within 5 business banking days after receipt (¶5A).',
      'A deposit is released only with a written release from both sides, a court order, or as Virginia law allows after notice.',
      'Log the check date and the deposit date separately.'
    ],
    3: [
      'PMA delivered the certificate by email on Feb 23, the receipt date on the CIC-2.',
      'The 3 day cancellation window runs from receipt, not from when the buyers sign the CIC-2. It closed Thu, Feb 26 at 11:59 PM.',
      'A late certificate reopens a short window (3 days, 6 if mailed), and settlement ends it.'
    ],
    4: [
      'Access for the buyers’ inspectors goes through my showing system. Never email a lockbox code.',
      'Moisture "N/A: foundation slab" means no crawl space to test, not a problem. The buyers pay the $90 invoice.',
      'Send Jemal the PICRA with the Mon, Mar 2 deadline, and leave the decision to him and me.'
    ],
    5: [
      'FHA allows seller concessions up to 6% of the price. Our $5,000 credit is fine if it only covers closing costs, prepaids and lender approved expenses.',
      'The day the PICRA is ratified, the lender and title get it with the fully signed PAA-1.',
      'The buyers authorize the appraisal by Mon, Mar 9.'
    ],
    6: [
      'Brad warned on Mar 16 that underwriting would not make Mar 17. Get the new date in writing; the ¶8 extension stops at Mar 27.',
      'Lauren needs Jemal on the FHA Amendatory Clause and the Real Estate Certification. He signed both on Mar 26.',
      'The CD went out Mar 25, so Mon, Mar 30 clears the 3 business day wait. The proceeds email from rwtownetitle-closing.com is fake: stop Jemal and copy the real Joel.'
    ],
    7: [
      'Virginia is a wet settlement state: Joel records and disburses after settlement, generally within two business days. He confirmed on Mar 31.',
      'Jemal’s numbers: $290,000 price, $5,000 credit, VHDA $97,149.98, net $171,729.53.',
      'The PMA update arrived Apr 2, after settlement. Send it to Joel to compare with the ALTA.'
    ]
  };

  /* ════════════════ Phase plan ════════════════
     Ordered sub-steps per phase. [REAL] = already in agent 1's deck (keep its label),
     [SIM] = from this file. gate = how the sub-step completes. */
  var VA_SIM_PHASE_PLAN = {
    1: [
      { label: 'Shannon&rsquo;s Email', items: ['[REAL] va1_shannon_contract'], gate: 'read' },
      { label: 'File Sheet', items: ['[REAL] form va-sheet'], gate: 'form' },
      { label: 'Pre-Approval', items: ['[REAL] va-d-jasmin', '[REAL] va-d-preapproval'], gate: 'decisions' },
      { label: 'Ratification', items: ['[REAL] va-d-ratdate'], gate: 'decision' },
      { label: 'Deadlines', items: ['[REAL] form va-dates'], gate: 'form' },
      { label: 'Two RW Townes', items: ['[SIM] chat va-d-escrowagent (shannon)'], gate: 'decOk(va-d-escrowagent)' },
      { label: 'Missing Info', items: ['[REAL deck, SIM content] picker va-p-intake'], gate: 'pick' },
      { label: 'Email Shannon', items: ['[REAL deck, SIM content] compose va-intake'], gate: 'reply' },
      { label: 'File Summary', items: ['[REAL] card'] }
    ],
    2: [
      { label: 'Shannon&rsquo;s Email', items: ['[REAL] va2_shannon_next'], gate: 'read' },
      { label: 'Seller Email', items: ['[REAL] compose seller (graded tc-va-seller-detail)'], gate: 'reply' },
      { label: 'Who Gets It', items: ['[REAL] picker va-p-dist'], gate: 'pick' },
      { label: 'Distribute', items: ['[REAL] compose dist'], gate: 'reply' },
      { label: 'Title Opens', items: ['[SIM] va2_joel_open (show after dist is sent)', '[SIM] compose va-joel-seller -> reply va2_jemal_info'], gate: 'replyOk(va-joel-seller, va2_jemal_info)' },
      { label: 'Lender', items: ['[SIM] va2_brad_app (closes the loop on va-d-jasmin)', '[SIM] chat va-d-buyerdirect (buyers)'], gate: 'readOk(va2_brad_app) && decOk(va-d-buyerdirect)' }
    ],
    3: [
      { label: 'Karen&rsquo;s Email', items: ['[REAL] va3_karen_check'], gate: 'read' },
      { label: 'Form of Payment', items: ['[REAL] va-d-emdform'], gate: 'decision' },
      { label: 'Amendment', items: ['[REAL deck, SIM content] compose va-add1'], gate: 'reply' },
      { label: 'Log the Deposit', items: ['[REAL] form va-emd', '[SIM] va-d-emddeposit (below the form)'], gate: 'formOk(va-emd) && decOk(va-d-emddeposit)' },
      { label: 'Confirm Deposit', items: ['[REAL] compose emd'], gate: 'reply' },
      { label: 'If It Falls Apart', items: ['[SIM] va-d-emdrelease'], gate: 'decOk(va-d-emdrelease)' }
    ],
    4: [
      { label: 'The Association', items: ['[REAL] timeline card'] },
      { label: 'PMA Delivery', items: ['[SIM] va4_pma_delivery (Feb 23, matches the CIC-2 receipt date)'], gate: 'readOk(va4_pma_delivery)' },
      { label: 'Certificate Check', items: ['[REAL] form va-hoa', '[REAL] va4_karen_cic2', '[SIM] va-d-cic2date (below the form)'], gate: 'formOk(va-hoa) && decOk(va-d-cic2date)' },
      { label: 'Cancellation Right', items: ['[SIM] va-d-poaa-end'], gate: 'decOk(va-d-poaa-end)' },
      { label: 'Appendix 15', items: ['[REAL] va-d-app15', '[REAL] va4_diana_app15'], gate: 'decision + read' },
      { label: 'Share with Karen', items: ['[REAL deck, SIM content] compose va-app15'], gate: 'reply' }
    ],
    5: [
      { label: 'Book the WDI', items: ['[SIM] va5_elim_schedule (Feb 23 9:10 AM)', '[SIM] replyPick va-elim-access -> reply va5_elim_confirm'], gate: 'replyOk(va-elim-access, va5_elim_confirm)' },
      { label: 'The Reports', items: ['[REAL] report timeline', '[SIM] va5_elim_reports (Feb 24)', '[SIM] va-d-slab', '[SIM] va-d-wdiinvoice'], gate: 'readOk(va5_elim_reports) && decOk(va-d-slab) && decOk(va-d-wdiinvoice)' },
      { label: 'PICRA Review', items: ['[REAL] va5_karen_picra', '[REAL] picker va-p-picra'], gate: 'pick' },
      { label: 'Old Reports', items: ['[REAL] chat va-d-oldreports'], gate: 'decision' },
      { label: 'Tell Jemal', items: ['[SIM] compose va-picra-seller (Feb 25 5:30 PM) -> reply va5_jemal_picra'], gate: 'replyOk(va-picra-seller, va5_jemal_picra)' },
      { label: 'Reports to Title', items: ['[REAL deck, SIM content] compose va-reports (Feb 25 4:30 PM)'], gate: 'reply' }
    ],
    6: [
      { label: 'Seller Question', items: ['[REAL deck, SIM content] replyPick va-repairs-q (Feb 26)'], gate: 'reply' },
      { label: 'Seller Counter', items: ['[REAL] va6_shannon_counter', '[SIM] va-d-fhaconcession (below the counter)'], gate: 'read + decOk(va-d-fhaconcession)' },
      { label: 'Negotiation Period', items: ['[REAL] va-d-extend', '[REAL] va6_shannon_add2'], gate: 'decision' },
      { label: 'Price Addendum', items: ['[REAL] va6_brad_paa1', '[REAL] va-d-paa1'], gate: 'decision' },
      { label: 'Ratified PICRA', items: ['[REAL] va6_karen_ratified', '[REAL] form va-picra'], gate: 'form' },
      { label: 'Update the Lender', items: ['[SIM] compose va-lender-picra (Mar 6 5:15 PM) -> reply va6_brad_picra'], gate: 'replyOk(va-lender-picra, va6_brad_picra)' }
    ],
    7: [
      { label: 'Lender Update', items: ['[REAL] va7_brad_fha (Mar 11)', '[SIM] va7_lauren_appraisal (Mar 13)'], gate: 'readOk both' },
      { label: 'Settlement Date', items: ['[SIM] va7_brad_timing (Mar 16, show before the decision)', '[REAL] va-d-closing'], gate: 'read + decision' },
      { label: 'HOA Update', items: ['[SIM] va7_joel_hoa (Mar 19, leads to the order)', '[REAL] va7_shannon_pma (Mar 20)', '[REAL] va-d-pmadate', '[REAL] va-d-payhold'], gate: 'read + decisions' },
      { label: 'Seller Signatures', items: ['[SIM] va7_lauren_ctc (Mar 25)', '[SIM] compose va-fha-jemal -> reply va7_jemal_fha (Mar 26, real signing date)', '[SIM] va-d-cd'], gate: 'replyOk(va-fha-jemal, va7_jemal_fha) && decOk(va-d-cd)' },
      { label: 'Extension', items: ['[SIM] va7_megan_schedule (Mar 27 10:30 AM)', '[REAL] va7_karen_extend (Mar 27 5:00 PM)', '[REAL] form va-fin'], gate: 'form' },
      { label: 'Wire Fraud', items: ['[SIM] va7_jemal_phish (Mar 27 6:40 PM)', '[SIM] chat va-d-wire', '[SIM] compose va-wire-jemal -> reply va7_joel_wire'], gate: 'decOk(va-d-wire) && replyOk(va-wire-jemal, va7_joel_wire)' }
    ],
    8: [
      { label: 'Walk Through', items: ['[REAL] va8_karen_walk'], gate: 'read' },
      { label: 'ALTA Audit', items: ['[REAL] va8_joel_alta', '[REAL] form va-alta'], gate: 'form' },
      { label: 'HOA Dues', items: ['[REAL] va-d-hoadues'], gate: 'decision' },
      { label: 'Recording', items: ['[SIM] va8_brad_funded (Mar 30 3:10 PM)', '[SIM] chat va-d-wetsettle', '[SIM] va8_joel_recorded (Mar 31)'], gate: 'decOk(va-d-wetsettle) && readOk(va8_joel_recorded)' },
      { label: 'Seller Wrap-up', items: ['[SIM] compose va-jemal-wrap (Mar 31 4:00 PM) -> reply va8_jemal_wrap'], gate: 'replyOk(va-jemal-wrap, va8_jemal_wrap)' },
      { label: 'Commission', items: ['[REAL] va8_diana_cda (Apr 1)', '[REAL] form va-cda'], gate: 'form' },
      { label: 'Late HOA Update', items: ['[SIM] va8_pma_update (Apr 2 9:30 AM)', '[SIM] va-d-postupdate', '[SIM] compose va-hoa-forward -> reply va8_joel_update'], gate: 'decOk(va-d-postupdate) && replyOk(va-hoa-forward, va8_joel_update)' },
      { label: 'Wrap-up', items: ['[REAL] compose close + final evaluation. Suggest moving va8_sent_close/va8_shannon_close to Apr 2 2:00 PM / 2:30 PM so the archive email comes after the PMA update.'], gate: 'reply' }
    ]
  };

  /* simulated contacts and hints join the real ones */
  Object.keys(VA_SIM_CONTACTS).forEach(function (k) { CONTACTS[k] = VA_SIM_CONTACTS[k]; });
  CONTACT_ORDER = CONTACT_ORDER.concat(VA_SIM_CONTACT_ORDER);
  Object.keys(VA_SIM_TASK_HINTS).forEach(function (k) { TASK_HINTS[k] = VA_SIM_TASK_HINTS[k]; });

  function em(o) {
    var c = CONTACTS[o.from] || {};
    o.senderKey = o.from;
    o.senderName = o.senderName || (o.from === 'tc' ? 'You (' + TC_FIRST + ', TC)' : (c.label || c.name));
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
    /* ── Step 1 · Ratified contract ── */
    em({ id: 'va1_shannon_contract', step: 1, from: 'shannon',
      subject: 'Ratified: 4232 Maplehurst Road', snip: 'We are ratified. The full package is attached. Please open the file.', time: 'Feb 22 · 6:00 PM' }),
    /* simulated: intake email to Shannon and her answer */
    em({ id: 'va1_sent_intake', step: 1, from: 'tc', folder: 'sent', composeKey: 'va-intake',
      subject: '4232 Maplehurst Road file: a few items I need', snip: '', time: 'Feb 22 · 7:30 PM' }),
    em({ id: 'va1_shannon_intake', step: 1, from: 'shannon', arrival: 'reply', afterKey: 'va-intake', onRead: onReadRefresh,
      subject: 'Re: 4232 Maplehurst Road file', snip: 'Here is everything. Jemal prefers email; the loan is with VHDA.', time: 'Feb 22 · 8:05 PM' }),

    /* ── Step 2 · Seller & parties ── */
    em({ id: 'va2_shannon_next', step: 2, from: 'shannon',
      subject: 'Next steps: 4232 Maplehurst Road', snip: 'Please send Jemal his summary today and get the contract to everyone who needs it.', time: 'Feb 23 · 8:30 AM' }),
    em({ id: 'va2_sent_seller', step: 2, from: 'tc', folder: 'sent', composeKey: 'seller',
      subject: 'You are under contract: 4232 Maplehurst Road', snip: '', time: 'Feb 23 · 9:15 AM' }),
    em({ id: 'va2_jemal_ok', step: 2, from: 'jemal', arrival: 'reply', afterKey: 'seller', onRead: onReadRefresh,
      subject: 'Re: You are under contract: 4232 Maplehurst Road', snip: 'Thank you. I will keep the home easy to access and the utilities on.', time: 'Feb 23 · 10:40 AM' }),
    em({ id: 'va2_sent_dist', step: 2, from: 'tc', folder: 'sent', composeKey: 'dist',
      subject: 'Ratified contract: 4232 Maplehurst Road (02/22/2026)', snip: '', time: 'Feb 23 · 11:00 AM' }),
    em({ id: 'va2_karen_dist', step: 2, from: 'karen', arrival: 'reply', afterKey: 'dist', onRead: onReadRefresh,
      subject: 'Re: Ratified contract: 4232 Maplehurst Road', snip: 'Received, thank you. Anything for the buyers can come through me.', time: 'Feb 23 · 11:45 AM' }),

    /* ── Step 3 · Escrow & deposit ── */
    em({ id: 'va3_karen_check', step: 3, from: 'karen',
      subject: 'Deposit: 4232 Maplehurst Road', snip: 'Here is a photo of the buyers’ $500 deposit check.', time: 'Feb 23 · 1:20 PM' }),
    em({ id: 'va3_sent_add1', step: 3, from: 'tc', folder: 'sent', composeKey: 'va-add1',
      subject: 'Deposit form of payment: 4232 Maplehurst Road', snip: '', time: 'Feb 23 · 1:45 PM' }),
    em({ id: 'va3_karen_add1', step: 3, from: 'karen', arrival: 'reply', afterKey: 'va-add1', onRead: onReadRefresh,
      subject: 'Re: Deposit form of payment: 4232 Maplehurst Road', snip: 'Addendum #1 attached, signed by the buyers and me today.', time: 'Feb 23 · 4:10 PM' }),
    em({ id: 'va3_shannon_add1', step: 3, from: 'shannon',
      subject: 'Signed: Addendum #1 (deposit), 4232 Maplehurst Road', snip: 'Addendum #1 is fully signed. Jemal and I signed it today.', time: 'Feb 24 · 4:30 PM' }),
    em({ id: 'va3_sent_emd', step: 3, from: 'tc', folder: 'sent', composeKey: 'emd',
      subject: 'Deposit received: 4232 Maplehurst Road', snip: '', time: 'Feb 24 · 5:00 PM' }),
    em({ id: 'va3_joel_emd', step: 3, from: 'joel', arrival: 'reply', afterKey: 'emd', onRead: onReadRefresh,
      subject: 'Re: Deposit received: 4232 Maplehurst Road', snip: 'Thank you. The deposit details and Addendum #1 are in our file.', time: 'Feb 24 · 5:40 PM' }),

    /* ── Step 4 · HOA & disclosures ── */
    em({ id: 'va4_karen_cic2', step: 4, from: 'karen',
      subject: 'CIC-2 signed: 4232 Maplehurst Road', snip: 'The buyers signed the resale certificate receipt. Copies attached.', time: 'Mar 3 · 10:15 AM' }),
    em({ id: 'va4_diana_app15', step: 4, from: 'diana',
      subject: 'FW: Appendix 15, 4232 Maplehurst Road', snip: 'PMA answered my question about Appendix 15. Please keep it in the file.', time: 'Mar 4 · 2:10 PM' }),
    em({ id: 'va4_sent_app15', step: 4, from: 'tc', folder: 'sent', composeKey: 'va-app15',
      subject: 'Appendix 15 answer from PMA: 4232 Maplehurst Road', snip: '', time: 'Mar 4 · 2:40 PM' }),
    em({ id: 'va4_karen_app15', step: 4, from: 'karen', arrival: 'reply', afterKey: 'va-app15', onRead: onReadRefresh,
      subject: 'Re: Appendix 15 answer from PMA', snip: 'Thank you. I shared the reply with Sergio and Jasmin.', time: 'Mar 4 · 3:30 PM' }),

    /* ── Step 5 · Inspections ── */
    em({ id: 'va5_karen_picra', step: 5, from: 'karen',
      subject: 'Buyers’ PICRA: 4232 Maplehurst Road', snip: 'Attached is the buyers’ repair request with a complete copy of the reports.', time: 'Feb 25 · 3:30 PM' }),
    em({ id: 'va5_sent_reports', step: 5, from: 'tc', folder: 'sent', composeKey: 'va-reports',
      subject: 'WDI and moisture reports: 4232 Maplehurst Road', snip: '', time: 'Feb 25 · 4:30 PM' }),
    em({ id: 'va5_joel_reports', step: 5, from: 'joel', arrival: 'reply', afterKey: 'va-reports', onRead: onReadRefresh,
      subject: 'Re: WDI and moisture reports: 4232 Maplehurst Road', snip: 'Received. The reports and the $90.00 invoice are in our file.', time: 'Feb 25 · 5:00 PM' }),

    /* ── Step 6 · Repairs ── */
    em({ id: 'va6_jemal_q', step: 6, from: 'jemal', replyKey: 'va-repairs-q',
      subject: 'The repair list', snip: 'Should I just agree to all 15 repairs so the deal does not fall apart?', time: 'Feb 26 · 9:00 AM' }),
    em({ id: 'va6_sent_repairs_q', step: 6, from: 'tc', folder: 'sent', composeKey: 'va-repairs-q',
      subject: 'Re: The repair list', snip: '', time: 'Feb 26 · 9:30 AM' }),
    em({ id: 'va6_jemal_q_ok', step: 6, from: 'jemal', arrival: 'reply', afterKey: 'va-repairs-q', onRead: onReadRefresh,
      subject: 'Re: The repair list', snip: 'That makes sense. I will talk it through with Shannon.', time: 'Feb 26 · 10:15 AM' }),
    em({ id: 'va6_shannon_counter', step: 6, from: 'shannon',
      subject: 'Seller counter: 4232 Maplehurst Road', snip: 'Jemal signed the counter: no repairs, $290,000 and a $5,000 credit.', time: 'Mar 1 · 7:45 PM' }),
    em({ id: 'va6_brad_paa1', step: 6, from: 'brad',
      subject: 'Price addendum: 4232 Maplehurst Road', snip: 'Can you send me the price addendum for the file?', time: 'Mar 2 · 2:00 PM' }),
    em({ id: 'va6_shannon_add2', step: 6, from: 'shannon',
      subject: 'Signed: Addendum #2 (negotiation period), 4232 Maplehurst Road', snip: 'Jemal signed Addendum #2 today. The period now runs until March 6.', time: 'Mar 3 · 1:00 PM' }),
    em({ id: 'va6_karen_ratified', step: 6, from: 'karen',
      subject: 'Ratified PICRA: 4232 Maplehurst Road', snip: 'The buyers initialed the counter and signed the PAA-1 today.', time: 'Mar 6 · 4:00 PM' }),

    /* ── Step 7 · Pre-closing ── */
    em({ id: 'va7_brad_fha', step: 7, from: 'brad',
      subject: 'FHA Amendatory Clause: 4232 Maplehurst Road', snip: 'The buyers signed the FHA Amendatory Clause at $290,000.', time: 'Mar 11 · 3:00 PM' }),
    em({ id: 'va7_shannon_pma', step: 7, from: 'shannon',
      subject: 'HOA financial update ordered: 4232 Maplehurst Road', snip: 'I ordered the update of the resale package from PMA. Confirmation attached.', time: 'Mar 20 · 11:00 AM' }),
    em({ id: 'va7_karen_extend', step: 7, from: 'karen',
      subject: 'Signed: closing date extension, 4232 Maplehurst Road', snip: 'Everyone signed the addendum today. Closing moves to March 30, 2026.', time: 'Mar 27 · 5:00 PM' }),

    /* ── Step 8 · Closing ── */
    em({ id: 'va8_karen_walk', step: 8, from: 'karen',
      subject: 'Walk through signed: 4232 Maplehurst Road', snip: 'The buyers signed the walk through report at 11:22 AM.', time: 'Mar 30 · 11:40 AM' }),
    em({ id: 'va8_joel_alta', step: 8, from: 'joel',
      subject: 'ALTA settlement statement: 4232 Maplehurst Road (22026-67041)', snip: 'The ALTA for today’s settlement is attached for your review.', time: 'Mar 30 · 12:30 PM' }),
    em({ id: 'va8_diana_cda', step: 8, from: 'diana',
      subject: 'CDA signed: 4232 Maplehurst Road', snip: 'Jon signed the commission disbursement authorization today.', time: 'Apr 1 · 10:00 AM' }),
    em({ id: 'va8_sent_close', step: 8, from: 'tc', folder: 'sent', composeKey: 'close',
      subject: 'Closed: 4232 Maplehurst Road (03/30/2026)', snip: '', time: 'Apr 2 · 2:00 PM' }),
    em({ id: 'va8_shannon_close', step: 8, from: 'shannon', arrival: 'reply', afterKey: 'close', onRead: onReadRefresh,
      subject: 'Re: Closed: 4232 Maplehurst Road (03/30/2026)', snip: 'Thank you for keeping this file on track from ratification to settlement.', time: 'Apr 2 · 2:30 PM' })
  ];
  /* simulated emails (bodies live in VA_SIM_EMAILS and render through simInbox) */
  /* phases 1 to 4 only for now: later simulated items are not wired into their decks yet */
  VA_SIM_EMAILS.forEach(function (e) {
    if (e.step > 4) return;
    var o = {};
    Object.keys(e).forEach(function (k) { if (k !== 'html' && k !== 'opts') o[k] = e[k]; });
    if (o.arrival === 'reply') o.onRead = onReadRefresh;
    TC_EMAILS.push(em(o));
  });


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
    /* building other steps must not leave their document list in the sidebar */
    var keepDocs = _sideDocsMeta;
    [caNewStep0, caNewStep1, caNewStep2, caNewStep3, caNewStep4, caNewStep5, caNewStep6, caNewStep7].forEach(function (fn) {
      try { fn(); } catch (e) {}
    });
    for (var j = 0; j <= 8; j++) window['_caNewSlide' + j] = keep[j];
    window._caNewCurSlide1 = keepCur;
    _sideDocsMeta = keepDocs;
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
          '<div class="tc-mail-case">Listing file &middot; 4232 Maplehurst Rd &middot; RW Towne Title 22026-67041</div>' +
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
      : '<div class="wf-email-recipient-line"><span>To: <strong>' + TC_NAME + '</strong> &lt;' + TC_ADDR + '&gt;</span></div>';
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
    1: 'Ratified Contract & Deadlines',
    2: 'Seller Summary & Distribution',
    3: 'Escrow & Deposit',
    4: 'HOA Resale Certificate',
    5: 'Inspections & PICRA',
    6: 'Repair Negotiation',
    7: 'Financing, HOA Update & Closing Date',
    8: 'Settlement & After Closing'
  };

  function tcRenderDeadlineBar(n) {
    return '';
  }

  function tcRenderKeyFacts(n, stepFacts) {
    var defaultFacts = [
      ['Property', '4232 Maplehurst Rd, Virginia Beach, VA 23462'],
      ['Seller', 'Jemal O Tamem'],
      ['Buyers', 'Sergio P Malonzo Jr. & Jasmin Malonzo'],
      ['Ratified', 'Sun, Feb 22, 2026'],
      ['Price', n >= 7 ? '$290,000 · FHA (PAA-1, Mar 6)' : (n >= 2 ? '$285,000 · FHA' : 'See the ratified contract')],
      ['Deposit', n >= 2 ? '$500 · BHHS RW Towne Realty' : 'See ¶2'],
      ['Settlement', n >= 8 ? 'Mon, Mar 30, 2026 (addendum)' : (n >= 2 ? 'Tue, Mar 17, 2026' : 'See ¶8')],
      ['Settlement agent', 'RW Towne Title LLC · 22026-67041'],
      ['Seller credit', n >= 7 ? '$5,000' : 'None']
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
    (activeContactKeys || []).forEach(function (k) { activeSet[k] = true; });
    var h = '<div class="tc-contacts-list">';
    CONTACT_ORDER.forEach(function (k) {
      var c = CONTACTS[k];
      if (!c || !activeSet[k]) return;
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
          /* only what the file shows: no email or phone line when the file has none */
          (c.email ? '<div><strong>Email:</strong> <span style="color:var(--v-blue,#1565c0);">' + esc(c.email) + '</span></div>' : '') +
          (c.phone ? '<div><strong>Phone:</strong> ' + esc(c.phone) + '</div>' : '') +
        '</div>' +
      '</div>';
    });
    return h + '</div>';
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
      var docCls = 'tc-doc-item mh-doc';
      var badgeClass = meta.badge;
      var badgeText = badgeClass === 'signed' ? '✅ Signed' : (badgeClass === 'draft' ? '📝 Draft' : '🔒 Locked');

      h += '<button type="button" class="' + docCls + '" data-doc="' + k + '"' + hideStyle +
        ' onclick="caNewOpen(\'' + k + '\')"' +
        ' title="Click to preview ' + esc(d[1]) + '">' +
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
      all: ['Transaction Tools', '4232 Maplehurst Rd &middot; Listing File'],
      inbox: ['Communications', (unreadCount > 0 ? unreadCount + ' new message' + (unreadCount > 1 ? 's' : '') : 'Inbox &amp; Sent')],
      facts: ['Key Transaction Facts', '4232 Maplehurst Rd &middot; Virginia Beach'],
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
                '<span class="tc-mac-sec-badge">4232 Maplehurst</span>' +
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

  var _sideDocsMeta = { step: 0, wanted: [], hideDocs: false };
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
      all: ['Transaction Tools', '4232 Maplehurst Rd &middot; Listing File'],
      inbox: ['Communications', 'Inbox &amp; Sent Messages'],
      facts: ['Key Transaction Facts', '4232 Maplehurst Rd &middot; Virginia Beach'],
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
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = '';
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
    var initials = opts.initials || 'SP';
    var sender = opts.sender || 'Shannon Paschall';
    var role = opts.role || 'Listing Agent · ' + CASE_ADDR;

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
    var initials = opts.initials || 'SP';
    var sender = opts.sender || 'Shannon Paschall';
    var role = opts.role || 'Listing Agent · ' + CASE_ADDR;
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
      h += '<div class="mh-actions"><button class="mh-btn mh-btn-ghost tc-assist" onclick="caNewAutoPick(\'' + id + '\')">Auto-fill</button>' +
           '</div>';
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

  window.caNewShowContacts = function (key, field) {
    caNewFilterContacts(key, field);
  };

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
    /* "shannon" alone would also match Diana's shannonsellsva.com address */
    shannon: ['paschall', 'shannon@'], diana: ['diana', 'martinez'], jemal: ['jemal', 'tamem', 'ojemal69'],
    karen: ['karen', 'archbell'], buyers: ['malonzo', 'sergio', 'jasmin'], brad: ['brad', 'watts', 'archermortgage'],
    joel: ['joel', 'gueli', 'rwtownetitle']
  };
  Object.keys(VA_SIM_CONTACT_MATCH).forEach(function (k) { CONTACT_MATCH[k] = VA_SIM_CONTACT_MATCH[k]; });
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
    var subjKeys = rules.subj || ['maplehurst', '4232'];
    var sl = subjVal.toLowerCase();
    if (!subjKeys.some(function (k) { return sl.indexOf(k) > -1; })) {
      return caNewComposeErr(statusEl, 'Subject too vague:', rules.subjMsg || 'Name the property (4232 Maplehurst Road) so everyone can file it with the right transaction.', subjEl);
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
  function tcRefreshDocs() {
    if (!_sideDocsMeta.wanted.length) return;
    var fresh = sideDocs(_sideDocsMeta.step, _sideDocsMeta.wanted);
    var sec = document.getElementById('tc-sec-docs');
    if (!sec) return;
    var content = sec.querySelector('.tc-sec-content');
    if (content) content.innerHTML = tcRenderDocs(_sideDocsMeta.step, fresh, _sideDocsMeta.hideDocs);
    var badge = sec.querySelector('.tc-mac-sec-badge');
    if (badge) badge.textContent = fresh.length + ' files';
  }

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
    tcRefreshDocs();
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
                (o.addr ? '<span class="wf-email-sender-addr">&lt;' + o.addr + '&gt;</span>' : '') +
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
        to: o.to || ('To: <strong>' + TC_NAME + '</strong> &lt;' + TC_ADDR + '&gt;'),
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
    var byStep = { 1: ['shannon', 'diana', 'jemal', 'karen', 'buyers', 'brad'], 2: ['joel', 'lauren'], 4: ['david', 'pma'], 5: ['keffer', 'eric'], 8: ['jon'] };
    var out = [];
    for (var i = 1; i <= n; i++) out = out.concat(byStep[i] || []);
    return out;
  }

  /* ── Progressive document reveal ──
     Each group lists documents and the condition that "creates" them in the
     case file.  sideDocs(stepNum, wantedKeys) returns only the docs from
     wantedKeys whose trigger has fired (or that belong to a past step). */
  var DOC_GROUPS = [
    { step: 1, docs: ['contract'],
      when: function () { return readOk('va1_shannon_contract'); } },

    { step: 2, docs: ['convey'],
      when: function () { return readOk('va2_shannon_next'); } },

    { step: 3, docs: ['check'],
      when: function () { return readOk('va3_karen_check'); } },
    { step: 3, docs: ['add1'],
      when: function () { return readOk('va3_karen_add1') || readOk('va3_shannon_add1'); } },

    { step: 4, docs: ['hoa'],
      when: function () { return readOk('va4_pma_delivery') || readOk('va4_karen_cic2'); } },
    { step: 4, docs: ['cic2'],
      when: function () { return readOk('va4_karen_cic2'); } },
    { step: 4, docs: ['hoamail'],
      when: function () { return readOk('va4_diana_app15'); } },

    { step: 5, docs: ['wdi', 'moisture', 'invoice'],
      when: function () { return readOk('va5_karen_picra'); } },
    { step: 5, docs: ['inspection', 'picra'],
      when: function () { return readOk('va5_karen_picra'); } },

    { step: 6, docs: ['counter', 'paa1u'],
      when: function () { return readOk('va6_shannon_counter'); } },
    { step: 6, docs: ['add2'],
      when: function () { return readOk('va6_shannon_add2'); } },
    { step: 6, docs: ['picraok', 'paa1'],
      when: function () { return readOk('va6_karen_ratified'); } },

    { step: 7, docs: ['fha'],
      when: function () { return readOk('va7_brad_fha'); } },
    { step: 7, docs: ['hoaupdate'],
      when: function () { return readOk('va7_shannon_pma'); } },
    { step: 7, docs: ['extend'],
      when: function () { return readOk('va7_karen_extend'); } },

    { step: 8, docs: ['walk'],
      when: function () { return readOk('va8_karen_walk'); } },
    { step: 8, docs: ['alta'],
      when: function () { return readOk('va8_joel_alta'); } },
    { step: 8, docs: ['cda'],
      when: function () { return readOk('va8_diana_cda'); } },
    { step: 7, docs: ['hoapaid', 'hoaupd'],
      when: function () { return decOk('va-d-payhold'); } }
  ];

  var _docAvail = {};
  DOC_GROUPS.forEach(function (g) {
    g.docs.forEach(function (k) {
      if (!_docAvail[k]) _docAvail[k] = { step: g.step, when: g.when || null };
    });
  });

  function sideDocs(stepNum, wantedKeys) {
    _sideDocsMeta = { step: stepNum, wanted: wantedKeys, hideDocs: false };
    return wantedKeys.filter(function (k) {
      var a = _docAvail[k];
      if (!a) return true;
      if (a.step < stepNum) return true;
      if (!a.when) return true;
      return a.when();
    });
  }

  /* "To:" lines on the email cards */
  function toMe() { return '<strong>' + TC_NAME + '</strong>'; }

  /* ── Simulated items (VA_SIM_*) rendered with the same helpers as the real ones ── */
  function simInbox(id) { var e = vaSimMail(id); return inbox(e.id, e.from, e.html, e.opts); }
  function simCompose(key) {
    var c = null;
    VA_SIM_COMPOSE.forEach(function (x) { if (x.key === key) c = x; });
    if (c.kind === 'replyPick') return replyPick(vaSimReplyPickArgs(key));
    compose(c.compose);
    return mailTask(c.key, c.task.title, c.task.sub, c.task.sentId) + simInbox(c.replyId);
  }
  function simDec(id) {
    var d = null;
    VA_SIM_DECISIONS.forEach(function (x) { if (x.id === id) d = x; });
    return d.mode === 'chat' ? chat(d.id, d.q, d.choices, d.fb, d.who) : decision(d.id, d.q, d.choices, d.fb);
  }
  function simReplyId(key) { var r = null; VA_SIM_COMPOSE.forEach(function (x) { if (x.key === key) r = x.replyId; }); return r; }
  function simReplyOk(key) { return replyOk(key, simReplyId(key)); }
  var D_MAR1 = [['2026-02-28', 'Sat, Feb 28'], ['2026-03-01', 'Sun, Mar 1'], ['2026-03-02', 'Mon, Mar 2'], ['2026-03-03', 'Tue, Mar 3']];
  function ulist(items) {
    return '<ul style="margin:0;padding-left:18px;font-size:13.5px;line-height:1.7;color:var(--v-ink)">' +
      items.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';
  }

  /* ════════════════ Step 1 · Ratified contract ════════════════ */
  function caNewStep0() {
    var contractMail = inbox('va1_shannon_contract', 'shannon',
      '<p>Hi ' + TC_FIRST + ',</p>' +
      '<p>We are ratified on <strong>4232 Maplehurst Road</strong>. Jemal signed today, so the package is complete. Here is what is in the PDF:</p>' +
      '<ul>' +
        '<li>PDF page 1: Archer Mortgage pre approval letter, dated February 21, 2026</li>' +
        '<li>PDF pages 2 to 17: REIN Standard Purchase Agreement, signed by the buyers and Karen Archbell on 02/21 and by the seller on 02/22</li>' +
        '<li>PDF pages 18 to 25: disclosures, the resale certificate request (CIC-1) and the Property Inspection Contingency Addendum</li>' +
        '<li>PDF pages 26 to 29: a moisture report and a WDI report from Pest Heroes</li>' +
      '</ul>' +
      '<p>Please open the file today. Build the file sheet from the signed pages, not from my email.</p>' + SHANNON_SIG,
      { attach: ['contract'] });

    var sheet = form('va-sheet', 'Build the file sheet', 'Open the ratified purchase agreement and copy each term from the signed pages. The agreement starts on PDF page 2.', [
      { label: 'Ratification date', hint: 'PDF p.2', kind: 'date', ans: '2026-02-22', ph: 'mm/dd/yyyy', show: '02/22/2026 (ratification box, line 41)' },
      { label: 'Buyers', hint: 'line 2', kind: 'text', ans: ['malonzo'], ph: 'Full names', show: 'Sergio P Malonzo, Jr. and Jasmin Malonzo' },
      { label: 'Purchase price', hint: '¶3', kind: 'money', ans: 285000, ph: '$', show: '$285,000' },
      { label: 'Loan type', hint: '¶3', kind: 'text', ans: ['fha'], ph: 'Conventional, FHA, VA...', show: 'FHA, $267,500 loan and $17,500 down' },
      { label: 'Deposit', hint: '¶2', kind: 'money', ans: 500, ph: '$', show: '$500.00' },
      { label: 'Escrow agent', hint: '¶2', kind: 'text', ans: ['rwtowne', 'bhhs', 'berkshire'], ph: 'Who holds the deposit', show: 'BHHS RW Towne Realty' },
      { label: 'Settlement date', hint: '¶8, PDF p.5', kind: 'date', ans: '2026-03-17', ph: 'mm/dd/yyyy', show: 'On or before 03/17/2026' },
      { label: 'Repair cap', hint: '¶13, PDF p.8', kind: 'text', ans: ['1%', '2850', '2,850'], ph: '% or $', show: '1% of the price, $2,850' }
    ]);

    var jasmin = decision('va-d-jasmin',
      'The pre approval letter is addressed only to Jasmin Malonzo. The contract names two buyers, Sergio P Malonzo, Jr. and Jasmin Malonzo. What do you do?',
      [
        { t: 'Ask Brad Watts at Archer Mortgage to confirm who is on the loan application, since ¶6A gives the buyers 7 days to apply. Note the answer in the file.', ok: true },
        { t: 'Nothing. A pre approval for one buyer covers both.', ok: false },
        { t: 'Ask Karen to take Sergio off the contract so it matches the letter.', ok: false }
      ],
      'A pre approval is not a loan commitment, and a missing borrower can change the approval. In this file the FHA Amendatory Clause signed Mar 11 lists both Jasmin Malonzo and Sergio P Malonzo Jr as borrowers, and so does the ALTA. Until you see that, confirm it with the lender instead of assuming.');
    var preapproval = decision('va-d-preapproval',
      'The pre approval letter on PDF page 1 shows a $272,181 loan, but ¶3 of the contract finances $267,500. What do you do with that difference?',
      [
        { t: 'Nothing is wrong. Line 38 lets the FHA upfront mortgage insurance be financed: $267,500 plus 1.75% is $272,181. Note it and move on.', ok: true },
        { t: "Ask the buyer's agent for a corrected contract, because the loan amounts have to match exactly.", ok: false },
        { t: "Change the file sheet to a $272,181 loan, since the lender's letter overrides the contract.", ok: false }
      ],
      "The contract states the base loan. The lender's figure adds the financed FHA upfront premium (1.75% of $267,500 is $4,681). Knowing why two numbers differ keeps you from sending a false alarm to four people on day one.");

    var ratdate = decision('va-d-ratdate',
      'Line 1 of the agreement says it is made 02/19/2026, the buyers signed on 02/21 and the ratification box says 02/22/2026. Which date do the deadlines count from?',
      [
        { t: '02/22/2026. ¶2 defines ratification as the final written acceptance by buyer and seller, and every timeframe runs from it.', ok: true },
        { t: '02/19/2026, because that is the date the agreement was made.', ok: false },
        { t: 'Whichever date gives the buyers more time.', ok: false }
      ],
      'Counting from 02/19 or 02/21 would put every deadline early, and you could end up telling the seller a contingency had expired when it had not.');

    var dates = form('va-dates', 'Put the deadlines on the calendar', 'Count from ratification on Sunday, Feb 22. Day 1 is Monday, Feb 23.', [
      { label: 'Deposit at the escrow agent', hint: '2 business days, ¶2', kind: 'select', ans: '2026-02-24', show: 'Tue, Feb 24',
        options: [['2026-02-23', 'Mon, Feb 23'], ['2026-02-24', 'Tue, Feb 24'], ['2026-02-25', 'Wed, Feb 25'], ['2026-02-26', 'Thu, Feb 26']] },
      { label: 'Loan application at Archer Mortgage', hint: '7 days, ¶6A', kind: 'select', ans: '2026-03-01', show: 'Sun, Mar 1', options: D_MAR1 },
      { label: 'WDI and moisture reports to settlement agent', hint: '7 days, ¶13B', kind: 'select', ans: '2026-03-01', show: 'Sun, Mar 1', options: D_MAR1 },
      { label: 'Inspection reports and PICRA to Listing Firm', hint: '7 days, PAA-7 ¶2A', kind: 'select', ans: '2026-03-01', show: 'Sun, Mar 1', options: D_MAR1 },
      { label: 'Settlement', hint: '¶8', kind: 'select', ans: '2026-03-17', show: 'Tue, Mar 17',
        options: [['2026-03-10', 'Tue, Mar 10'], ['2026-03-17', 'Tue, Mar 17'], ['2026-03-20', 'Fri, Mar 20'], ['2026-03-24', 'Tue, Mar 24']] },
      { label: 'Latest settlement with the 10 day extension', hint: 'loan or title only, ¶8', kind: 'select', ans: '2026-03-27', show: 'Fri, Mar 27',
        options: [['2026-03-24', 'Tue, Mar 24'], ['2026-03-27', 'Fri, Mar 27'], ['2026-03-31', 'Tue, Mar 31'], ['2026-04-01', 'Wed, Apr 1']] }
    ]);
    var dayRule = '<div class="lc-callout-info" style="margin-bottom:16px">In REIN contracts a <strong>day</strong> is any calendar day, a <strong>business day</strong> is Monday to Friday except federal holidays, and a timeframe starts at 12:00 a.m. after the event that triggers it.</div>';

    /* simulated: intake questions to Shannon (not in the real file) */
    var intakePick = picker('va-p-intake', 'What do you still need from Shannon?',
      'The contract gives you the deal. Pick what the listing file is still missing before you start working it.', [
        { t: 'Jemal&rsquo;s preferred contact for signatures', sub: 'Email or phone', ok: true },
        { t: 'Who holds Jemal&rsquo;s mortgage', sub: 'For the payoff at settlement', ok: true },
        { t: 'How the buyers&rsquo; side gets access', sub: 'Inspections, appraisal, walk through', ok: true },
        { t: 'The HOA and its management company', sub: 'Resale certificate and dues', ok: true },
        { t: 'Jemal&rsquo;s Social Security number', sub: 'By email', ok: false },
        { t: 'The buyers&rsquo; bank statements', sub: 'Lender file', ok: false },
        { t: 'A home inspection ordered by the seller', sub: 'Buyer side', ok: false }
      ], 'You need the seller&rsquo;s contact, his lender for the payoff, how access works and who manages the association. Never ask for a Social Security number by email: the settlement agent collects it securely. The buyers&rsquo; finances belong to their lender, and the inspection is the buyers&rsquo; to order.');
    var intakeTask = mailTask('va-intake', 'Email Shannon',
      'Ask Shannon for the items you picked. This one is internal: write to Shannon only.', 'va1_sent_intake');
    compose({
      key: 'va-intake', scenario: 'tc-va-intake', prompt: 'Ask the listing agent for the missing listing file items, 4232 Maplehurst Road VA',
      to: 'Shannon Paschall <shannon@shannonsellsva.com>', subj: '4232 Maplehurst Road file: a few items I need',
      inst: 'Ask for the seller&rsquo;s preferred contact, his mortgage holder, access instructions and the HOA management company.',
      rules: {
        need: [['shannon', 'to', 'This question is for Shannon, the listing agent.']],
        never: [['jemal', 'Keep the seller off this one: it is an internal checklist between you and Shannon.'], ['karen', 'This is an internal checklist. Keep the buyer side off it.']]
      },
      ans: "Hi Shannon,\n\nI opened the file for 4232 Maplehurst Road (ratified 02/22/2026, $285,000 FHA, settlement by 03/17). Before I start working it I need:\n\n1. Jemal's preferred contact for signatures\n2. Who holds his mortgage, for the payoff at settlement\n3. How the buyers' side gets access for the inspections, appraisal and walk through\n4. The HOA and its management company, for the resale certificate and dues\n\nThanks,\n" + TC_SIGN
    });
    var intakeReply = inbox('va1_shannon_intake', 'shannon',
      '<ul>' +
        '<li><strong>Jemal O Tamem:</strong> ojemal69@yahoo.com. He prefers email.</li>' +
        '<li><strong>Loan:</strong> VHDA. Joel Gueli at RW Towne Title will order the payoff.</li>' +
        '<li><strong>Access:</strong> lockbox on the front door. Karen schedules everything through me.</li>' +
        '<li><strong>HOA:</strong> Timberlake Community Association, managed by PMA. The resale certificate (PMA-A08775) was prepared on 01/20, and the CIC-1 tells PMA where to send it.</li>' +
      '</ul>' + SHANNON_SIG);

    var summary = card('File sheet ready', 'The deal and its clock, from the signed pages.',
      timeline([
        ['Feb 21, 2026', 'Buyers and Karen Archbell sign the REIN agreement. Archer Mortgage pre approval letter dated the same day.'],
        ['Feb 22, 2026', 'Jemal O Tamem signs: ratified. Clocks start Monday, Feb 23.'],
        ['Feb 24', '$500 deposit due at BHHS RW Towne Realty.'],
        ['Mar 1', 'Loan application, WDI and moisture reports, inspection reports and any PICRA due.'],
        ['Mar 17', 'Settlement, or no later than Mar 27 with the 10 day extension (loan processing or title only).']
      ]));

    var main = deck(1, [
      { label: 'Shannon&rsquo;s Email', body: contractMail, ok: function () { return readOk('va1_shannon_contract'); }, err: 'Open Shannon&rsquo;s email in Mail first.' },
      { label: 'File Sheet', body: sheet, ok: function () { return formOk('va-sheet'); }, check: function () { caNewCheck('va-sheet'); },
        err: 'Some terms do not match the signed contract. Fix the red rows.' },
      { label: 'Pre-Approval', body: jasmin + preapproval, ok: function () { return decOk('va-d-jasmin') && decOk('va-d-preapproval'); },
        err: 'Answer both decision points about the pre approval letter.' },
      { label: 'Ratification', body: ratdate, ok: function () { return decOk('va-d-ratdate'); }, err: 'Answer the decision point first.' },
      { label: 'Deadlines', body: dayRule + dates, ok: function () { return formOk('va-dates'); }, check: function () { caNewCheck('va-dates'); },
        err: 'Some deadlines are off. Count again from Monday, Feb 23.' },
      { label: 'Two RW Townes', body: simDec('va-d-escrowagent'), ok: function () { return decOk('va-d-escrowagent'); }, err: 'Answer Shannon&rsquo;s question first.' },
      { label: 'Missing Info', body: intakePick, ok: function () { return pickOk('va-p-intake'); }, err: 'Pick what is missing, then press Next. If a pick is wrong, use Try again.' },
      { label: 'Email Shannon', body: intakeTask + intakeReply, ok: function () { return replyOk('va-intake', 'va1_shannon_intake'); }, err: replyErr('Shannon') },
      { label: 'File Summary', body: summary }
    ], 'Continue to Step 2: Seller & Parties');

    return step(1, STEP_TITLES[1], 'Sun, Feb 22, 2026',
      'You coordinate the <strong>listing side</strong> for Shannon Paschall. Every fact you use from here on comes from the signed pages, not from an email summary.',
      main, side([['Legal', 'Timberlake Sec 5, Bk A, Lot 15'], ['Listing agent', 'Shannon Paschall'], ['Selling agent', 'Karen Archbell'], ['Lender', 'Archer Mortgage']],
        sideDocs(1, ['contract']), sideContacts(1)), true);
  }

  /* ════════════════ Step 2 · Seller & parties ════════════════ */
  function caNewStep1() {
    var next = inbox('va2_shannon_next', 'shannon',
      '<p>Good morning ' + TC_FIRST + ',</p>' +
      '<p>Two things for today on Maplehurst:</p>' +
      '<ol>' +
        '<li>Send Jemal a plain language summary: what we agreed, what happens next and what he has to do. Copy me.</li>' +
        '<li>Get the ratified contract to everyone who needs it to do their part, and only to them.</li>' +
      '</ol>' +
      '<p>The items to convey list is attached for Jemal.</p>' + SHANNON_SIG,
      { attach: ['convey', 'contract'] });

    var needs = card('What the seller needs to hear', 'Plain language. The seller does not read contracts for a living.',
      ulist([
        '$285,000 with FHA financing, settlement on or before <b>Tue, Mar 17</b>',
        '$500 deposit held by BHHS RW Towne Realty',
        'The buyers have until Sun, Mar 1 to deliver inspection reports and any repair request, so keep the home accessible',
        'What conveys: electric range, 1 refrigerator, dishwasher, 1 disposal, blinds and hardware, all smoke alarms and ceiling fans, 1 trash and 1 recycling container',
        'Utilities stay on through the walk through (¶13D)'
      ]));
    var sellerTask = mailTask('seller', 'Email Jemal',
      'Write the seller summary in Mail. Copy Shannon. Your supervisor grades this email.', 'va2_sent_seller');
    compose({
      key: 'seller', scenario: 'tc-va-seller-detail', prompt: 'Seller detail email, 4232 Maplehurst Road VA (ratified 02/22/2026)',
      to: 'Jemal O Tamem <ojemal69@yahoo.com>', cc: 'Shannon Paschall <shannon@shannonsellsva.com>',
      subj: 'You are under contract: 4232 Maplehurst Road', attach: ['contract', 'convey'],
      inst: 'Cover the price and settlement date, the deposit, access for inspections, what conveys and keeping utilities on.',
      rules: {
        need: [['jemal', 'to', 'This summary is for the seller: Jemal goes in To.'], ['shannon', 'any', 'Copy Shannon, the listing agent.']],
        never: [['karen', 'This is a client email. Keep the buyer side off it.'], ['buyers', 'This is a client email. Keep the buyer side off it.']]
      },
      ans: "Hi Jemal,\n\nCongratulations: 4232 Maplehurst Road is under contract. The contract was ratified on Sunday, February 22, 2026, and a copy is attached. Here is what was agreed and what comes next:\n\n• Price: $285,000, with FHA financing\n• Settlement: on or before Tuesday, March 17\n• Deposit: $500, held by BHHS RW Towne Realty\n• Inspections: the buyers have until Sunday, March 1 to deliver their inspection reports and any repair request, so please keep the home easy to access\n• What conveys: electric range, 1 refrigerator, dishwasher, 1 disposal, blinds and hardware, all smoke alarms and ceiling fans, 1 trash and 1 recycling container (list attached)\n• Utilities: please keep them on through the buyers' walk through\n\nI will keep you posted at each step. Let me know if you have any questions.\n\nBest,\n" + TC_SIGN
    });
    var sellerReply = inbox('va2_jemal_ok', 'jemal',
      '<p>Thank you for the clear summary. I will keep the home easy to access for the inspections and leave the utilities on through the walk through.</p>' + JEMAL_SIG,
      { to: 'To: ' + toMe() + ' &middot; CC: Shannon Paschall' });

    var distPick = picker('va-p-dist', 'Who gets the ratified contract?', 'Select every party that should receive it today.', [
      { t: 'Karen Archbell', sub: 'Selling agent, BHHS RW Towne Realty', ok: true },
      { t: 'Joel Gueli', sub: 'RW Towne Title, copied on the CIC-1 (PDF page 19)', ok: true },
      { t: 'Brad Watts', sub: 'Archer Mortgage, the lender named in ¶6A', ok: true },
      { t: 'Shannon Paschall', sub: 'Listing agent, AtCoastal Realty (copy)', ok: true },
      { t: 'Sergio and Jasmin Malonzo', sub: 'The buyers, directly', ok: false },
      { t: 'Pest Heroes', sub: 'Reports on PDF pages 26 to 29', ok: false }
    ], 'Notices for the buyers go through the Selling Firm (¶23), so Karen gets their copy. The Pest Heroes reports are dated Jan 19, 2026, before this contract, and Pest Heroes has no role in this sale.');

    var distTask = mailTask('dist', 'Send the ratified contract',
      'Send it to the parties you picked, with the dates that matter to each of them. Copy Shannon.', 'va2_sent_dist');
    compose({
      key: 'dist', scenario: 'tc-va-distribute-contract', prompt: 'Distribute ratified contract email, 4232 Maplehurst Road VA',
      to: 'Karen Archbell <karen@karenarchbell.com>, Joel Gueli <joel.gueli@rwtownetitle.com>, Brad Watts <brad@archermortgagellc.com>',
      cc: 'Shannon Paschall <shannon@shannonsellsva.com>', subj: 'Ratified contract: 4232 Maplehurst Road (02/22/2026)', attach: ['contract'],
      inst: 'Attach the contract, give each party the dates that matter to them (loan application and reports by Mar 1, settlement Mar 17) and ask everyone to confirm receipt.',
      rules: {
        need: [['karen', 'any', 'Karen, the selling agent, needs the contract.'], ['joel', 'any', 'Joel at RW Towne Title needs the contract.'], ['brad', 'any', 'Brad at Archer Mortgage needs the contract.'], ['shannon', 'any', 'Copy Shannon.']],
        never: [['buyers', 'Notices for the buyers go through the Selling Firm (¶23). Karen gets their copy.'], ['jemal', 'Jemal already has his summary. This email is for the other parties.']]
      },
      ans: "Hello all,\n\nAttached is the ratified contract for 4232 Maplehurst Road, Virginia Beach, VA 23462, ratified 02/22/2026. Seller: Jemal O Tamem. Buyers: Sergio P Malonzo, Jr. and Jasmin Malonzo. Price: $285,000, FHA.\n\nThe dates that matter to each of you:\n• Karen: inspection reports and any PICRA to the Listing Firm by Sunday, March 1\n• Brad: loan application by Sunday, March 1 (¶6A)\n• Joel: WDI and moisture reports to the settlement agent by March 1, and settlement on or before Tuesday, March 17\n\nPlease confirm you received it.\n\nThank you,\n" + TC_SIGN
    });
    var distReply = inbox('va2_karen_dist', 'karen',
      '<p>Received, thank you. Anything for Sergio and Jasmin can come through me, as ¶23 says.</p>' + KAREN_SIG,
      { to: 'To: ' + toMe() + ' &middot; CC: Joel Gueli, Brad Watts, Shannon Paschall' });

    var main = deck(2, [
      { label: 'Shannon&rsquo;s Email', body: next, ok: function () { return readOk('va2_shannon_next'); }, err: 'Open Shannon&rsquo;s email in Mail first.' },
      { label: 'Seller Email', body: needs + sellerTask + sellerReply, ok: function () { return replyOk('seller', 'va2_jemal_ok'); }, err: replyErr('Jemal') },
      { label: 'Who Gets It', body: distPick, ok: function () { return pickOk('va-p-dist'); }, err: 'Pick the recipients, then press Next. If a pick is wrong, use Try again.' },
      { label: 'Distribute', body: distTask + distReply, ok: function () { return replyOk('dist', 'va2_karen_dist'); }, err: replyErr('Karen') },
      { label: 'Title Opens', body: simInbox('va2_joel_open') + when('va2joel', function () { return readOk('va2_joel_open'); }, simCompose('va-joel-seller')),
        ok: function () { return simReplyOk('va-joel-seller'); },
        err: function () { return readOk('va2_joel_open') ? replyErr('Jemal') : 'Open Joel&rsquo;s email in Mail first.'; } },
      { label: 'Lender', body: simInbox('va2_brad_app') + when('va2brad', function () { return readOk('va2_brad_app'); }, simDec('va-d-buyerdirect')),
        ok: function () { return readOk('va2_brad_app') && decOk('va-d-buyerdirect'); },
        err: function () { return readOk('va2_brad_app') ? 'Answer the decision point first.' : 'Open Brad&rsquo;s email in Mail first.'; } }
    ], 'Continue to Step 3: Escrow & Deposit');

    return step(2, STEP_TITLES[2], 'Mon, Feb 23, 2026',
      'The seller gets a clear summary on day one: what was agreed, what happens next and what the seller has to do. Then the contract goes to everyone who needs it to do their part, and only to them.',
      main, side([['Settlement', 'Tue, Mar 17'], ['Deposit', '$500'], ['Reports due', 'Sun, Mar 1']], sideDocs(2, ['contract', 'convey']), sideContacts(2)), true,
      { text: 'Inspection reports and any PICRA due to the Listing Firm.', days: 'Sun, Mar 1' });
  }

  /* ════════════════ Step 3 · Escrow & deposit ════════════════ */
  function caNewStep2() {
    var checkMail = inbox('va3_karen_check', 'karen',
      '<p>Hi ' + TC_FIRST + ',</p>' +
      '<p>Here is a photo of the buyers&rsquo; earnest money check for 4232 Maplehurst Road.</p>' + KAREN_SIG,
      { to: 'To: ' + toMe() + ' &middot; CC: Shannon Paschall', attach: ['check'] });

    var form1 = decision('va-d-emdform',
      "¶2 says the deposit is paid by 'other: Earnest'. On Monday the buyer's agent sends a photo of a personal check. What do you do?",
      [
        { t: 'Get the change in writing: an amendment switching the form of payment to personal check, then confirm BHHS RW Towne Realty has the check by Tuesday.', ok: true },
        { t: 'Accept it. The amount is right, so the form of payment does not matter.', ok: false },
        { t: 'Reject the check and tell the buyers they are in breach.', ok: false }
      ],
      'A deposit paid differently than the contract says invites a breach argument later. In this file Addendum #1 changed the form of payment from Other Earnest to personal check. The buyers and Karen signed it on 02/23, Shannon and the seller on 02/24.');

    /* simulated: the TC asks Karen for the amendment; the signatures and dates are the real ones */
    var askTask = mailTask('va-add1', 'Ask Karen for the amendment',
      'The form of payment changed, so the change has to be in writing. Ask Karen for an addendum. Copy Shannon.', 'va3_sent_add1');
    compose({
      key: 'va-add1', scenario: 'tc-va-add1-request', prompt: 'Ask the buyer agent for an addendum changing the EMD form of payment, 4232 Maplehurst Road VA',
      to: 'Karen Archbell <karen@karenarchbell.com>', cc: 'Shannon Paschall <shannon@shannonsellsva.com>',
      subj: 'Deposit form of payment: 4232 Maplehurst Road', attach: ['check', 'contract'],
      inst: 'Thank her for the check, point out that ¶2 says Other (Earnest), and ask for an addendum changing it to personal check. The deposit is still due at BHHS RW Towne Realty by Tuesday, Feb 24.',
      rules: {
        need: [['karen', 'to', 'The buyers sign through their agent: Karen goes in To.'], ['shannon', 'any', 'Copy Shannon.']],
        never: [['buyers', 'The buyers are represented. Everything goes through Karen.'], ['jemal', 'Jemal signs once the buyers have. Keep this between the agents for now.']]
      },
      ans: "Hi Karen,\n\nThank you for the photo of the deposit check for 4232 Maplehurst Road. ¶2 of the contract says the deposit is paid by Other (Earnest), so we need the change in writing. Could you send an addendum changing the form of payment to personal check, signed by Sergio and Jasmin? Shannon and Jemal will sign it right after.\n\nThe deposit is still due at BHHS RW Towne Realty by Tuesday, February 24.\n\nThank you,\n" + TC_SIGN
    });
    var askReply = inbox('va3_karen_add1', 'karen',
      '<p>Good catch, thank you. <strong>Addendum #1</strong> is attached: it changes the form of payment to personal check. Sergio, Jasmin and I signed it today. It is ready for Shannon and Jemal.</p>' + KAREN_SIG,
      { to: 'To: ' + toMe() + ' &middot; CC: Shannon Paschall', attach: ['add1'] });

    var add1Mail = inbox('va3_shannon_add1', 'shannon',
      '<p>Hi ' + TC_FIRST + ',</p>' +
      '<p><strong>Addendum #1</strong> is fully signed. The buyers and Karen signed on 02/23, and Jemal and I signed today. It changes the form of payment for the deposit from Other (Earnest) to personal check.</p>' +
      '<p>Please log the deposit and let everyone know.</p>' + SHANNON_SIG,
      { attach: ['add1', 'check'] });
    var emdForm = form('va-emd', 'Log the deposit', 'Use the check and Addendum #1.', [
      { label: 'Amount', kind: 'money', ans: 500, ph: '$', show: '$500.00' },
      { label: 'Payable to', kind: 'text', ans: ['rwtowne', 'bhhs', 'berkshire'], ph: 'Escrow agent', show: 'BHHS RW Towne Realty' },
      { label: 'Check date', kind: 'date', ans: '2026-02-23', ph: 'mm/dd/yyyy', show: '02/23/2026' },
      { label: 'On time?', hint: 'due Tue, Feb 24', kind: 'select', ans: 'yes', show: 'Yes, the check is dated Mon, Feb 23', options: [['yes', 'Yes'], ['no', 'No']] },
      { label: 'Escrow agent deposits it by', hint: '¶5A', kind: 'select', ans: '5', show: '5 business banking days after receipt',
        options: [['0', 'The same day'], ['5', '5 business banking days after receipt'], ['s', 'At settlement']] }
    ]);

    var emdTask = mailTask('emd', 'Confirm the deposit',
      'Tell title, the lender and Karen that the deposit is in, and share Addendum #1. Copy Shannon.', 'va3_sent_emd');
    compose({
      key: 'emd', scenario: 'tc-va-emd-confirmation', prompt: 'EMD confirmation email, 4232 Maplehurst Road VA ($500 personal check, Addendum #1)',
      to: 'Joel Gueli <joel.gueli@rwtownetitle.com>, Brad Watts <brad@archermortgagellc.com>, Karen Archbell <karen@karenarchbell.com>',
      cc: 'Shannon Paschall <shannon@shannonsellsva.com>', subj: 'Deposit received: 4232 Maplehurst Road', attach: ['check', 'add1'],
      inst: 'Confirm the $500 deposit (check dated 02/23/2026) is with BHHS RW Towne Realty and share Addendum #1.',
      rules: {
        need: [['joel', 'any', 'Title needs the deposit confirmation: add Joel.'], ['brad', 'any', 'The lender needs it too: add Brad.'], ['karen', 'any', 'Add Karen, the selling agent.'], ['shannon', 'any', 'Copy Shannon.']],
        never: [['buyers', 'The buyers are represented. Karen gets their copy.']]
      },
      ans: "Hello all,\n\nConfirming the earnest money deposit for 4232 Maplehurst Road: $500 by personal check #0001 dated 02/23/2026, payable to BHHS RW Towne Realty, the escrow agent under ¶2. The deposit was due by Tuesday, February 24, so it is on time.\n\nAddendum #1 changes the form of payment from Other (Earnest) to personal check. It is fully signed (the buyers and Karen on 02/23, Jemal and Shannon on 02/24). The addendum and a copy of the check are attached.\n\nThank you,\n" + TC_SIGN
    });
    var emdReply = inbox('va3_joel_emd', 'joel',
      '<p>Thank you. The deposit details and Addendum #1 are in our file.</p>' + JOEL_SIG,
      { to: 'To: ' + toMe() + ' &middot; CC: Brad Watts, Karen Archbell, Shannon Paschall' });

    var main = deck(3, [
      { label: 'Karen&rsquo;s Email', body: checkMail, ok: function () { return readOk('va3_karen_check'); }, err: 'Open Karen&rsquo;s email in Mail first.' },
      { label: 'Form of Payment', body: form1, ok: function () { return decOk('va-d-emdform'); }, err: 'Answer the decision point first.' },
      { label: 'Amendment', body: askTask + askReply, ok: function () { return replyOk('va-add1', 'va3_karen_add1'); }, err: replyErr('Karen') },
      { label: 'Log the Deposit', body: add1Mail + when('va3emd', function () { return readOk('va3_shannon_add1'); }, emdForm + simDec('va-d-emddeposit')),
        ok: function () { return formOk('va-emd') && decOk('va-d-emddeposit'); }, check: function () { if (readOk('va3_shannon_add1')) caNewCheck('va-emd'); },
        err: function () {
          if (!readOk('va3_shannon_add1')) return 'Open Shannon&rsquo;s email in Mail first.';
          return formOk('va-emd') ? 'Answer the decision point about the deposit.' : 'Some entries do not match the check and Addendum #1.';
        } },
      { label: 'Confirm Deposit', body: emdTask + emdReply, ok: function () { return replyOk('emd', 'va3_joel_emd'); }, err: replyErr('Joel') },
      { label: 'If It Falls Apart', body: simDec('va-d-emdrelease'), ok: function () { return decOk('va-d-emdrelease'); }, err: 'Answer the decision point first.' }
    ], 'Continue to Step 4: HOA & Disclosures');

    return step(3, STEP_TITLES[3], 'Mon, Feb 23 – Tue, Feb 24, 2026',
      'The deposit is due at <strong>BHHS RW Towne Realty</strong> by Tuesday, Feb 24. Check what arrives against the contract before you report it as received.',
      main, side([['Deposit', '$500'], ['Due', 'Tue, Feb 24'], ['Held by', 'BHHS RW Towne']], sideDocs(3, ['check', 'add1', 'contract']), sideContacts(3)), true,
      { text: 'Deposit due at the escrow agent (2 business days, ¶2).', days: 'Tue, Feb 24' });
  }

  /* ════════════════ Step 4 · HOA & disclosures ════════════════ */
  function caNewStep3() {
    var story = card('What happened', '',
      timeline([
        ['Jan 20', 'PMA prepares resale certificate <b>PMA-A08775</b> for Timberlake Community Association on behalf of the seller.'],
        ['Feb 22', 'The <b>CIC-1</b> in the contract tells PMA to email the certificate to the buyers, to Karen Archbell and to Joel Gueli at RW Towne Title.'],
        ['Feb 23', "The buyers' side receives the certificate. The buyers and Karen sign the <b>CIC-2</b> on Mar 3."],
        ['Mar 3', "Diana Martinez, Shannon's operations manager, writes to PMA about Appendix 15."],
        ['Mar 4', 'David Lukus, association manager, replies in writing.']
      ]));
    var cicMail = inbox('va4_karen_cic2', 'karen',
      '<p>Hi Shannon and ' + TC_FIRST + ',</p>' +
      '<p>Attached is the <strong>CIC-2</strong> the buyers and I signed today, acknowledging receipt of the resale certificate for Timberlake Community Association. A copy of the certificate is attached too.</p>' + KAREN_SIG,
      { to: 'To: Shannon Paschall, ' + toMe(), attach: ['cic2', 'hoa'] });

    var hoaForm = form('va-hoa', 'Check the certificate', 'Open the certificate and the CIC-2.', [
      { label: 'Receipt date on the CIC-2', kind: 'date', ans: '2026-02-23', ph: 'mm/dd/yyyy', show: '02/23/2026' },
      { label: 'Buyers can cancel until 11:59 PM on', hint: '3 days', kind: 'select', ans: '2026-02-26', show: 'Thu, Feb 26',
        options: [['2026-02-25', 'Wed, Feb 25'], ['2026-02-26', 'Thu, Feb 26'], ['2026-02-27', 'Fri, Feb 27'], ['2026-03-02', 'Mon, Mar 2']] },
      { label: 'Monthly assessment', hint: 'Appendix 4', kind: 'money', ans: 53.80, ph: '$', show: '$53.80, due the 1st of each month' },
      { label: "Seller's balance as of 01/20/2026", hint: 'Appendix 4', kind: 'money', ans: 56.36, ph: '$', show: '$56.36 total balance' }
    ]);
    var feeFlag = '<div class="lc-callout-warn" style="margin-top:16px">The contract lists HOA fees of <b>$50.00</b> a month (¶14A). The certificate shows <b>$53.80</b>. Flag it now so the closing figures use the current amount.</div>';

    var app15 = decision('va-d-app15',
      "Appendix 15 says: 'At this time, it is unknown whether or not there are any alterations to the unit that violate the association.' What do you do?",
      [
        { t: "Ask the association manager in writing for a definitive answer on violations, then keep the reply in the file and share it with the buyer's agent.", ok: true },
        { t: 'Ignore it. Every certificate has boilerplate.', ok: false },
        { t: 'Tell the buyers there are no violations, since the seller would have mentioned them.', ok: false }
      ],
      'Unknown is not an answer a buyer can rely on. Here David Lukus replied on Mar 4 that the line was a placeholder left in by mistake and that a visual inspection of the front found no issues. That email now protects everyone.');
    var dianaMail = inbox('va4_diana_app15', 'diana',
      '<p>Hi ' + TC_FIRST + ',</p>' +
      '<p>I wrote to PMA yesterday about Appendix 15 of the resale certificate. <strong>David Lukus</strong>, the association manager, answered in writing today: the line was a placeholder left in by mistake, and a visual inspection of the front found no issues.</p>' +
      '<p>Both emails are attached. Please keep them in the file and share the reply with Karen.</p>' + DIANA_SIG,
      { attach: ['hoamail'] });

    /* simulated: the TC shares PMA's answer with the buyers' side */
    var shareTask = mailTask('va-app15', 'Share the answer with Karen',
      'Send David Lukus&rsquo;s written answer to the buyers&rsquo; agent so the buyers have it in writing. Copy Shannon and Diana.', 'va4_sent_app15');
    compose({
      key: 'va-app15', scenario: 'tc-va-app15-share', prompt: 'Share the HOA manager answer on Appendix 15 with the buyer agent, 4232 Maplehurst Road VA',
      to: 'Karen Archbell <karen@karenarchbell.com>', cc: 'Shannon Paschall <shannon@shannonsellsva.com>, Diana Martinez <diana@shannonsellsva.com>',
      subj: 'Appendix 15 answer from PMA: 4232 Maplehurst Road', attach: ['hoamail', 'hoa'],
      inst: 'Explain what Appendix 15 said, what David Lukus answered on Mar 4, and attach his reply.',
      rules: {
        need: [['karen', 'to', 'The buyers get it through their agent: Karen goes in To.'], ['shannon', 'any', 'Copy Shannon.'], ['diana', 'any', 'Copy Diana, who asked PMA.']],
        never: [['buyers', 'The buyers are represented. Send it to Karen.']]
      },
      ans: "Hi Karen,\n\nAppendix 15 of the Timberlake Community Association resale certificate (PMA-A08775) said it was unknown whether there were any alterations to the unit that violate the association. We asked PMA for a definitive answer.\n\nDavid Lukus, the association manager, replied in writing on March 4: the line was a placeholder left in by mistake, and a visual inspection of the front found no issues. His reply is attached for Sergio and Jasmin.\n\nThank you,\n" + TC_SIGN
    });
    var shareReply = inbox('va4_karen_app15', 'karen',
      '<p>Thank you, that is helpful. I shared David Lukus&rsquo;s reply with Sergio and Jasmin.</p>' + KAREN_SIG,
      { to: 'To: ' + toMe() + ' &middot; CC: Shannon Paschall, Diana Martinez' });

    var main = deck(4, [
      { label: 'The Association', body: story + simInbox('va4_pma_delivery'), ok: function () { return readOk('va4_pma_delivery'); }, err: 'Open PMA&rsquo;s email in Mail first.' },
      { label: 'Certificate Check', body: cicMail + when('va4cic', function () { return readOk('va4_karen_cic2'); }, hoaForm + feeFlag + simDec('va-d-cic2date')),
        ok: function () { return formOk('va-hoa') && decOk('va-d-cic2date'); }, check: function () { if (readOk('va4_karen_cic2')) caNewCheck('va-hoa'); },
        err: function () {
          if (!readOk('va4_karen_cic2')) return 'Open Karen&rsquo;s email in Mail first.';
          return formOk('va-hoa') ? 'Answer Karen&rsquo;s question about the CIC-2 date.' : 'Some entries do not match the certificate and the CIC-2.';
        } },
      { label: 'Cancellation Right', body: simDec('va-d-poaa-end'), ok: function () { return decOk('va-d-poaa-end'); }, err: 'Answer the decision point first.' },
      { label: 'Appendix 15', body: app15 + when('va4app15', function () { return decOk('va-d-app15'); }, dianaMail),
        ok: function () { return decOk('va-d-app15') && readOk('va4_diana_app15'); },
        err: function () { return decOk('va-d-app15') ? 'Open Diana&rsquo;s email in Mail.' : 'Answer the decision point first.'; } },
      { label: 'Share with Karen', body: shareTask + shareReply, ok: function () { return replyOk('va-app15', 'va4_karen_app15'); }, err: replyErr('Karen') }
    ], 'Continue to Step 5: Inspections');

    return step(4, STEP_TITLES[4], 'Mon, Feb 23 – Wed, Mar 4, 2026',
      '4232 Maplehurst is in <strong>Timberlake Community Association</strong>, managed by Property Management Associates (PMA). Virginia gives the buyers 3 days to cancel after they receive the resale certificate, so the delivery date matters.',
      main, side([['Association', 'Timberlake Community Assn'], ['Manager', 'PMA · David Lukus'], ['Phone', '757-646-6247'], ['Order', 'PMA-A08775']],
        sideDocs(4, ['hoa', 'cic2', 'hoamail', 'contract']), sideContacts(4)), true);
  }

  /* ════════════════ Step 5 · Inspections ════════════════ */
  function caNewStep4() {
    var picraMail = inbox('va5_karen_picra', 'karen',
      '<p>Hi Shannon and ' + TC_FIRST + ',</p>' +
      '<p>Attached is the buyers&rsquo; <strong>PICRA (PAA-7A)</strong> with a complete copy of the reports:</p>' +
      '<ul>' +
        '<li>Home inspection, Keff/Spec LLC (John Keffer), 02/22/2026</li>' +
        '<li>WDI and moisture reports, Eliminator Termite Pest &amp; Moisture Control (Eric Trotter), 02/24/2026, with the invoice</li>' +
      '</ul>' +
      '<p>The buyers are asking for 15 repairs, each by a licensed contractor.</p>' + KAREN_SIG,
      { to: 'To: Shannon Paschall, ' + toMe(), attach: ['picra', 'inspection', 'wdi', 'moisture', 'invoice'] });

    var cameBack = card('What came back', '',
      timeline([
        ['Feb 22', '<b>Home inspection</b>, Keff/Spec LLC (John Keffer), 10:00 AM with the buyers and their agent. Townhome built in 1977, 60 page report.'],
        ['Feb 24', '<b>WDI and moisture</b>, Eliminator Termite Pest &amp; Moisture Control (Eric Trotter). No visible wood destroying insects, no treatment recommended. Moisture report marked N/A: foundation slab. One $90.00 invoice for both.'],
        ['Feb 25', "<b>Buyers' PICRA</b> (PAA-7A): 15 repairs, each assigned to a licensed roofing, plumbing, electrical or HVAC contractor."]
      ]) +
      '<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700;font-size:13px;color:var(--v-cyan-d)">See the 15 requested repairs</summary>' +
      '<ul style="margin:8px 0 0;padding-left:18px;font-size:12.5px;line-height:1.6;color:var(--v-ink)">' +
        '<li><b>Roofing:</b> evaluate roof deck staining for leaks; replace missing and loose soffits front and rear; secure loose rake board wrap on the left side</li>' +
        '<li><b>Plumbing:</b> loose toilets in hall and primary bath; missing stop valves at primary and half bath sinks; dripping front hose bib; leaking shower and tub controls; broken gate valve handle in the utility room; loose shower arm in the primary bath; kitchen sprayer; seized disposal and missing dishwasher hose clamp</li>' +
        '<li><b>Electrical:</b> primary bedroom ceiling fan light has no power; GFCI protection within six feet of the kitchen sink; shorted GFCI outlet in the hall bath</li>' +
        '<li><b>HVAC:</b> clean, evaluate and repair the system</li>' +
      '</ul></details>');

    var picraPick = picker('va-p-picra', "Review the buyers' PICRA", 'Select every statement that is true.', [
      { t: 'It arrived on time: Feb 25 is before the Mar 1 deadline.', ok: true },
      { t: 'A complete copy of the inspection reports has to go with it.', ok: true },
      { t: 'Inspection items the buyers left off the list are waived.', ok: true },
      { t: 'The seller now has to make all 15 repairs.', ok: false },
      { t: 'The WDI report requires termite treatment before closing.', ok: false },
      { t: 'Agreed PICRA repairs count against the 1% repair cap.', ok: false }
    ], 'A PICRA is only a request until both sides sign it. The PICRA form itself says agreed repair items are not included in the ¶13 cap, and the clean WDI report means no treatment is owed under ¶13B.');

    var oldReports = chat('va-d-oldreports',
      'Pages 26 to 29 of the ratified contract PDF hold a moisture report and a WDI report from Pest Heroes, both dated Jan 19, 2026, a month before this offer was written. Do those count for this sale?',
      [
        { t: 'No. ¶13B requires the buyers to obtain reports within 7 days of this ratification. Make sure the Eliminator reports from Feb 24 reach the settlement agent by Mar 1.', ok: true },
        { t: 'Yes, a clean report is a clean report.', ok: false },
        { t: 'Yes, as long as they are less than 90 days old.', ok: false }
      ],
      '¶13B has BUYER checked to obtain the reports after ratification. The Pest Heroes reports predate this contract and their buyer signature lines are blank. The buyers ordered their own from Eliminator on Feb 24, which is what the contract asks for.', 'karen');

    /* simulated: the TC makes sure the settlement agent has the WDI and moisture reports by Mar 1 (¶13B) */
    var titleTask = mailTask('va-reports', 'Send the reports to settlement',
      '¶13B needs the WDI and moisture reports at the settlement agent by Sun, Mar 1. Send the Eliminator reports and the invoice to Joel. Copy Karen and Shannon.', 'va5_sent_reports');
    compose({
      key: 'va-reports', scenario: 'tc-va-reports-settlement', prompt: 'Deliver the WDI and moisture reports to the settlement agent, 4232 Maplehurst Road VA',
      to: 'Joel Gueli <joel.gueli@rwtownetitle.com>', cc: 'Karen Archbell <karen@karenarchbell.com>, Shannon Paschall <shannon@shannonsellsva.com>',
      subj: 'WDI and moisture reports: 4232 Maplehurst Road', attach: ['wdi', 'moisture', 'invoice'],
      inst: 'Say what the Eliminator reports found, that the Pest Heroes reports in the contract PDF do not apply, and that the $90.00 invoice needs to go on the settlement statement.',
      rules: {
        need: [['joel', 'to', 'The reports go to the settlement agent: Joel goes in To.'], ['karen', 'any', 'Copy Karen: the buyers ordered the reports.'], ['shannon', 'any', 'Copy Shannon.']],
        never: [['buyers', 'The buyers are represented. Copy Karen instead.']]
      },
      ans: "Hi Joel,\n\nFor 4232 Maplehurst Road (file 22026-67041), attached are the WDI report (NPMA-33) and the moisture report from Eliminator Termite Pest & Moisture Control, both dated 02/24/2026, with their $90.00 invoice:\n\n• WDI: no visible wood destroying insects, no treatment recommended\n• Moisture: N/A, foundation slab\n\nThese are the reports for this contract under ¶13B. Please disregard the Pest Heroes reports from 01/19/2026 on pages 26 to 29 of the contract PDF. Please add the $90.00 invoice to the settlement statement.\n\nThank you,\n" + TC_SIGN
    });
    var titleReply = inbox('va5_joel_reports', 'joel',
      '<p>Received, thank you. The Eliminator reports and the $90.00 invoice are in our file for settlement.</p>' + JOEL_SIG,
      { to: 'To: ' + toMe() + ' &middot; CC: Karen Archbell, Shannon Paschall' });

    var main = deck(5, [
      { label: 'The Reports', body: picraMail + when('va5came', function () { return readOk('va5_karen_picra'); }, cameBack),
        ok: function () { return readOk('va5_karen_picra'); }, err: 'Open Karen&rsquo;s email in Mail first.' },
      { label: 'PICRA Review', body: picraPick, ok: function () { return pickOk('va-p-picra'); }, err: 'Pick the true statements, then press Next. If a pick is wrong, use Try again.' },
      { label: 'Old Reports', body: oldReports, ok: function () { return decOk('va-d-oldreports'); }, err: 'Answer Karen&rsquo;s question first.' },
      { label: 'Reports to Title', body: titleTask + titleReply, ok: function () { return replyOk('va-reports', 'va5_joel_reports'); }, err: replyErr('Joel') }
    ], 'Continue to Step 6: Repairs');

    return step(5, STEP_TITLES[5], 'Sun, Feb 22 – Wed, Feb 25, 2026',
      'The buyers moved fast: the home inspection happened the day of ratification and the WDI and moisture inspection two days later. On Feb 25 Karen delivers the buyers&rsquo; repair request.',
      main, side([['Home inspector', 'Keff/Spec LLC'], ['WDI and moisture', 'Eliminator'], ['PICRA delivered', 'Wed, Feb 25'], ['Negotiation ends', 'Mon, Mar 2']],
        sideDocs(5, ['inspection', 'wdi', 'moisture', 'invoice', 'picra', 'contract']), sideContacts(5)), true,
      { text: 'Inspection reports and any PICRA due to the Listing Firm.', days: 'Sun, Mar 1' });
  }

  /* ════════════════ Step 6 · Repairs ════════════════ */
  function caNewStep5() {
    /* simulated: the seller asks the TC for negotiation advice */
    var jemalAsk = inbox('va6_jemal_q', 'jemal',
      '<p>Hi ' + TC_FIRST + ',</p><p>I saw the buyers&rsquo; list of 15 repairs. Should I just agree to all of them so the deal does not fall apart? What would you do?</p>' + JEMAL_SIG);
    var jemalPick = replyPick({
      key: 'va-repairs-q', sentId: 'va6_sent_repairs_q', replyId: 'va6_jemal_q_ok', title: 'Answer Jemal',
      prompt: 'Answer a seller who asks whether to agree to all the PICRA repairs, 4232 Maplehurst Road VA',
      to: 'Jemal O Tamem <ojemal69@yahoo.com>', cc: 'Shannon Paschall <shannon@shannonsellsva.com>', subj: 'Re: The repair list',
      inst: 'Jemal wants to know whether to agree to the repairs. Choose the reply that fits a TC, then complete it.',
      rules: { need: [['jemal', 'to', 'You are answering Jemal.'], ['shannon', 'any', 'Copy Shannon: the negotiation is hers.']], never: [['karen', 'Keep the buyer side off your client email.']], subj: ['repair', 'maplehurst', '4232', 'picra'] },
      choices: [
        { ok: true, label: 'Connect him with Shannon; give the timing',
          preview: 'How to answer is his decision with Shannon; you give the deadline.',
          body: "Hi Jemal,\n\nI understand you want to keep the deal together. How to answer the buyers' request is a negotiation decision for you and Shannon, and I have asked her to call you today. What I can tell you is the timing: the negotiation period on the PICRA runs until [date and time the negotiation period ends].\n\nBest,\n" + TC_SIGN },
        { ok: false, label: 'Agree to all 15',
          preview: 'It keeps the buyers happy.',
          fb: 'Recommending what to agree to is negotiation advice. That is Shannon&rsquo;s job, not the TC&rsquo;s.',
          body: "Hi Jemal,\n\nI would agree to all 15. It keeps the buyers happy and the deal on track.\n\nBest,\n" + TC_SIGN },
        { ok: false, label: 'Refuse everything',
          preview: 'Buyers usually back down.',
          fb: 'Suggesting a strategy is negotiation advice. The TC connects the seller with his agent and gives the deadlines.',
          body: "Hi Jemal,\n\nRefuse all of them. Buyers usually back down.\n\nBest,\n" + TC_SIGN },
        { ok: false, label: 'Ignore it until settlement',
          preview: 'The request does not matter until closing.',
          fb: 'That is wrong: the PICRA has a negotiation period, and when it ends without agreement either side may be able to terminate.',
          body: "Hi Jemal,\n\nYou can ignore the list for now. It only matters at settlement.\n\nBest,\n" + TC_SIGN }
      ],
      ans: "Hi Jemal,\n\nI understand you want to keep the deal together. How to answer the buyers' request is a negotiation decision for you and Shannon, and I have asked her to call you today. What I can tell you is the timing: the negotiation period on the PICRA runs until Monday, March 2 at 11:59 PM.\n\nBest,\n" + TC_SIGN,
      replyFrom: 'jemal', replyBody: '<p>That makes sense. I will talk it through with Shannon.</p>' + JEMAL_SIG, replyOpts: { to: 'To: ' + toMe() + ' &middot; CC: Shannon Paschall' }
    });

    var counterMail = inbox('va6_shannon_counter', 'shannon',
      '<p>Hi ' + TC_FIRST + ',</p>' +
      '<p>Jemal and I went over the buyers&rsquo; PICRA. He will not do repairs. Instead he countered, signed by me on 02/28 and by Jemal today:</p>' +
      '<ul>' +
        '<li><strong>No repairs</strong>: the home is sold as is</li>' +
        '<li>Price raised to <strong>$290,000</strong></li>' +
        '<li>Seller credit of <strong>$5,000</strong> toward closing costs, prepaids and lender approved expenses</li>' +
        '<li>Subject to an appraisal of at least $290,000</li>' +
      '</ul>' +
      '<p>Jemal and I also signed the PAA-1 for the new price. The buyers have not signed it yet.</p>' + SHANNON_SIG,
      { attach: ['counter', 'paa1u'] });

    var extendDec = decision('va-d-extend',
      'It is Monday, Mar 2. The counter is still being discussed and the negotiation period ends tonight. What do you do?',
      [
        { t: 'Get a written addendum extending the negotiation period, signed by buyers and seller before 11:59 PM.', ok: true },
        { t: 'Nothing. While the parties are still talking, the deadline pauses.', ok: false },
        { t: 'Tell Karen on the phone that the seller will wait a few more days.', ok: false }
      ],
      'When the period ends the buyers get one Additional Day to terminate, and after that either side may terminate (PAA-7 ¶2B). In this file the seller signed Addendum #2 on Mar 3, the Additional Day, so for one day the extension was not fully signed. Chase every signature before 11:59 PM.');
    var add2Mail = inbox('va6_shannon_add2', 'shannon',
      '<p>Hi ' + TC_FIRST + ',</p>' +
      '<p>The buyers, Karen and I signed <strong>Addendum #2</strong> yesterday, and Jemal signed it today. It extends the negotiation period five days, until March 6, 2026.</p>' + SHANNON_SIG,
      { attach: ['add2'] });

    var bradMail = inbox('va6_brad_paa1', 'brad',
      '<p>Hi ' + TC_FIRST + ',</p>' +
      '<p>Can you send me the price addendum for 4232 Maplehurst Road so I can update the loan file?</p>' + BRAD_SIG);
    var paaDec = decision('va-d-paa1',
      'Open the first PAA-1 in the Documents tab: it has the seller and Shannon signatures but no buyer signatures. Brad Watts asks for the price addendum on Mar 2. What do you send?',
      [
        { t: 'Nothing yet. Tell Brad the buyers have not signed, and send the fully signed PAA-1 and ratified PICRA once they do.', ok: true },
        { t: 'The copy you have. The seller agreed, so the new price is final.', ok: false },
        { t: 'The copy you have, and ask the lender to order the appraisal at $290,000 right away.', ok: false }
      ],
      'An addendum binds the parties only once buyer and seller both sign. The buyers signed the PAA-1 and initialed the counter on Mar 6. Check the header too: the buyer line reads "Sergio and Jasmin Malonzo" and "Jasmin Molonzo", a typo worth flagging to Karen.');

    var ratifiedMail = inbox('va6_karen_ratified', 'karen',
      '<p>Hi Shannon and ' + TC_FIRST + ',</p>' +
      '<p>The buyers initialed the counter today: <strong>Removal Acceptance Date 03/06/2026</strong>, verified by me. They also signed the PAA-1 for the new price and credit. Both are attached.</p>' + KAREN_SIG,
      { to: 'To: Shannon Paschall, ' + toMe(), attach: ['picraok', 'paa1'] });
    var trail = card('The paper trail', '',
      timeline([
        ['Feb 25', 'Buyers deliver the PICRA. The 5 day negotiation period runs through <b>Mon, Mar 2</b>.'],
        ['Mar 1', 'Seller counter, signed by Shannon (Feb 28) and the seller (Mar 1): <b>no repairs</b>, sold as is; price raised to <b>$290,000</b>; seller credit of <b>$5,000</b> toward closing costs, prepaids and lender approved expenses; subject to an appraisal of at least $290,000.'],
        ['Mar 2', '<b>Addendum #2</b> extends the negotiation period five days, until March 6, 2026. The buyers, Karen and Shannon sign on Mar 2. The seller signs on <b>Mar 3</b>.'],
        ['Mar 6', 'Buyers initial the counter. <b>Removal Acceptance Date 03/06/2026</b>, verified by Karen Archbell. Buyers sign the PAA-1 for the new price and credit.']
      ]));
    var picraForm = form('va-picra', 'Update the file sheet', 'Use the ratified PICRA and the PAA-1.', [
      { label: 'New purchase price', kind: 'money', ans: 290000, ph: '$', show: '$290,000' },
      { label: 'Seller credit', kind: 'money', ans: 5000, ph: '$', show: '$5,000 toward closing costs and prepaids' },
      { label: 'Repairs the seller will make', kind: 'select', ans: 'none', show: 'None, sold as is',
        options: [['all', 'All 15'], ['some', 'Roof and plumbing only'], ['none', 'None, sold as is']] },
      { label: 'Removal Acceptance Date', kind: 'date', ans: '2026-03-06', ph: 'mm/dd/yyyy', show: '03/06/2026' },
      { label: 'Appraisal must come in at least at', kind: 'money', ans: 290000, ph: '$', show: '$290,000' }
    ]);
    var readClose = '<div class="lc-callout-info" style="margin-top:16px">Read the counter closely: the price goes up $5,000 and the seller credits $5,000 back toward the buyers&rsquo; closing costs, prepaids and lender approved expenses, instead of making any of the 15 repairs. If the property does not appraise at or above $290,000, the appraisal contingency still applies.</div>';

    var main = deck(6, [
      { label: 'Seller Question', body: jemalAsk + when('va6q', function () { return readOk('va6_jemal_q'); }, jemalPick),
        ok: function () { return replyOk('va-repairs-q', 'va6_jemal_q_ok'); },
        err: function () { return readOk('va6_jemal_q') ? replyErr('Jemal') : 'Open Jemal&rsquo;s email in Mail first.'; } },
      { label: 'Seller Counter', body: counterMail, ok: function () { return readOk('va6_shannon_counter'); }, err: 'Open Shannon&rsquo;s email in Mail first.' },
      { label: 'Negotiation Period', body: extendDec + when('va6add2', function () { return decOk('va-d-extend'); }, add2Mail),
        ok: function () { return decOk('va-d-extend') && readOk('va6_shannon_add2'); },
        err: function () { return decOk('va-d-extend') ? 'Open Shannon&rsquo;s email about Addendum #2 in Mail.' : 'Answer the decision point first.'; } },
      { label: 'Price Addendum', body: bradMail + when('va6paa', function () { return readOk('va6_brad_paa1'); }, paaDec),
        ok: function () { return decOk('va-d-paa1'); },
        err: function () { return readOk('va6_brad_paa1') ? 'Answer the decision point first.' : 'Open Brad&rsquo;s email in Mail first.'; } },
      { label: 'Ratified PICRA', body: ratifiedMail + when('va6rat', function () { return readOk('va6_karen_ratified'); }, trail + picraForm + readClose),
        ok: function () { return formOk('va-picra'); }, check: function () { if (readOk('va6_karen_ratified')) caNewCheck('va-picra'); },
        err: function () { return readOk('va6_karen_ratified') ? 'Some entries do not match the ratified PICRA.' : 'Open Karen&rsquo;s email in Mail first.'; } }
    ], 'Continue to Step 7: Pre-Closing');

    return step(6, STEP_TITLES[6], 'Wed, Feb 25 – Fri, Mar 6, 2026',
      'The seller will not do repairs. Instead of a flat no, the seller counters with a different price. Follow the paper and keep the negotiation period alive.',
      main, side([['PICRA delivered', 'Wed, Feb 25'], ['Period ends', 'Mon, Mar 2'], ['Selling agent', 'Karen Archbell'], ['Listing agent', 'Shannon Paschall']],
        sideDocs(6, ['counter', 'paa1u', 'add2', 'picraok', 'paa1', 'picra', 'contract']), sideContacts(6)), true,
      { text: 'PICRA negotiation period ends at 11:59 PM.', days: 'Mon, Mar 2' });
  }

  /* ════════════════ Step 7 · Pre-closing ════════════════ */
  function caNewStep6() {
    var fhaMail = inbox('va7_brad_fha', 'brad',
      '<p>Hi ' + TC_FIRST + ',</p>' +
      '<p>Thank you for the ratified PICRA and the signed PAA-1. The loan and the appraisal now run at <strong>$290,000</strong>.</p>' +
      '<p>The buyers signed the <strong>FHA Amendatory Clause</strong> today at $290,000 (loan 202602916, FHA case 544-4490289-703). Jemal needs to sign it too, along with the Real Estate Certification.</p>' + BRAD_SIG,
      { to: 'To: ' + toMe() + ' &middot; CC: Karen Archbell, Shannon Paschall', attach: ['fha'] });

    var closingDec = decision('va-d-closing',
      'It is Monday, Mar 16, and settlement is not going to happen on Mar 17. What is the right move?',
      [
        { t: 'Tell both agents now and get a signed addendum with a new settlement date. The 10 day extension only covers loan processing or title defects, and it ends Mar 27.', ok: true },
        { t: 'Nothing. The contract extends itself for as long as the loan needs.', ok: false },
        { t: 'Ask title to move the closing on their calendar. That is enough.', ok: false }
      ],
      'In this file the extension was signed on Mar 27, the last day the automatic extension reached. It worked, but push for the signature days earlier: if the date had slipped past Mar 27 without an addendum, the party not at fault could have terminated (¶8).');

    var pmaMail = inbox('va7_shannon_pma', 'shannon',
      '<p>Hi ' + TC_FIRST + ',</p>' +
      '<p>I ordered a <strong>financial update</strong> of the resale package from PMA so title has current HOA figures. The order confirmation for <strong>PMA-A08954</strong> is attached. Status: <strong>Payment Hold</strong>, balance due $70.66, estimated delivery 03/25.</p>' +
      '<p>Please check the order details.</p>' + SHANNON_SIG,
      { attach: ['hoaupdate'] });
    var pmaDate = decision('va-d-pmadate',
      'The PMA order confirmation lists the settlement date as 3/20/2026. What do you do?',
      [
        { t: 'Write to PMA with the real settlement date so the financial update and closing figures are dated correctly.', ok: true },
        { t: 'Nothing. PMA only needs the address.', ok: false },
        { t: 'Move the closing to Mar 20 to match PMA.', ok: false }
      ],
      'The contract said Mar 17 and the addendum moved it to Mar 30. Neither is Mar 20. A wrong date on a third party order is how dues end up prorated to the wrong day.');
    var payHold = decision('va-d-payhold',
      'The Mar 20 PMA order still shows Payment Hold on Mar 27, and closing is Mar 30. What do you do?',
      [
        { t: 'Get the $70.66 paid now and confirm the new delivery date with PMA, so the updated figures reach title before closing.', ok: true },
        { t: 'Nothing. PMA will send it when it is ready.', ok: false },
        { t: 'Cancel the order, since title already has the January certificate.', ok: false }
      ],
      'An order on hold is not being worked. In this file the fee was only paid on Mar 30 at 8:11 AM ($72.77 with the card surcharge), the delivery estimate moved to 04/02 and the update is dated 4/2/26, three days after closing.');

    var extendMail = inbox('va7_karen_extend', 'karen',
      '<p>Hi Shannon and ' + TC_FIRST + ',</p>' +
      '<p>The buyers, Jemal, Shannon and I all signed the <strong>addendum</strong> today. Closing moves from March 17 to <strong>March 30, 2026</strong>.</p>' + KAREN_SIG,
      { to: 'To: Shannon Paschall, ' + toMe(), attach: ['extend'] });
    var story = card('What happened', '',
      timeline([
        ['Mar 6', 'Send Archer Mortgage the ratified PICRA and the PAA-1 so the loan and appraisal run at $290,000.'],
        ['Mar 11', 'Buyers sign the <b>FHA Amendatory Clause</b> at $290,000 (loan 202602916, FHA case 544-4490289-703).'],
        ['Mar 17', 'The original settlement date passes without a closing.'],
        ['Mar 20', 'Shannon orders a <b>financial update</b> of the resale package from PMA (order PMA-A08954). Status: <b>Payment Hold</b>, balance due $70.66, estimated delivery 03/25.'],
        ['Mar 26', 'The seller signs the clause, and buyers, seller, Shannon and Karen sign the Real Estate Certification.'],
        ['Mar 27', '<b>Addendum</b> moves closing from March 17 to <b>March 30, 2026</b>. Buyers, Karen, Shannon and the seller all sign that day.']
      ]));
    var finForm = form('va-fin', 'Keep the dates straight', 'Use ¶6A, ¶8, the FHA Amendatory Clause and the addendum.', [
      { label: 'Buyers authorize the appraisal by', hint: '3 days after PICRA removal, ¶6A', kind: 'select', ans: '2026-03-09', show: 'Mon, Mar 9',
        options: [['2026-03-06', 'Fri, Mar 6'], ['2026-03-09', 'Mon, Mar 9'], ['2026-03-13', 'Fri, Mar 13'], ['2026-03-16', 'Mon, Mar 16']] },
      { label: 'Appraised value the FHA clause requires', kind: 'money', ans: 290000, ph: '$', show: '$290,000' },
      { label: 'Last day the automatic extension reaches', hint: '¶8', kind: 'select', ans: '2026-03-27', show: 'Fri, Mar 27',
        options: [['2026-03-20', 'Fri, Mar 20'], ['2026-03-24', 'Tue, Mar 24'], ['2026-03-27', 'Fri, Mar 27'], ['2026-03-31', 'Tue, Mar 31']] },
      { label: 'New settlement date', kind: 'date', ans: '2026-03-30', ph: 'mm/dd/yyyy', show: '03/30/2026' }
    ]);

    var main = deck(7, [
      { label: 'Lender Update', body: fhaMail, ok: function () { return readOk('va7_brad_fha'); }, err: 'Open Brad&rsquo;s email in Mail first.' },
      { label: 'Settlement Date', body: closingDec, ok: function () { return decOk('va-d-closing'); }, err: 'Answer the decision point first.' },
      { label: 'HOA Update', body: pmaMail + when('va7pma', function () { return readOk('va7_shannon_pma'); }, pmaDate + payHold),
        ok: function () { return decOk('va-d-pmadate') && decOk('va-d-payhold'); },
        err: function () { return readOk('va7_shannon_pma') ? 'Answer both decision points about the PMA order.' : 'Open Shannon&rsquo;s email in Mail first.'; } },
      { label: 'Extension', body: extendMail + when('va7ext', function () { return readOk('va7_karen_extend'); }, story + finForm),
        ok: function () { return formOk('va-fin'); }, check: function () { if (readOk('va7_karen_extend')) caNewCheck('va-fin'); },
        err: function () { return readOk('va7_karen_extend') ? 'Some dates are off. Check ¶6A, ¶8 and the addendum.' : 'Open Karen&rsquo;s email in Mail first.'; } }
    ], 'Continue to Step 8: Closing');

    return step(7, STEP_TITLES[7], 'Fri, Mar 6 – Fri, Mar 27, 2026',
      'A higher price means the lender, the appraisal and the FHA paperwork all have to catch up, and the Mar 17 settlement date starts to look tight.',
      main, side([['Lender', 'Archer Mortgage'], ['Loan officer', 'Brad Watts'], ['PICRA removed', 'Fri, Mar 6'], ['Settlement', 'Tue, Mar 17']],
        sideDocs(7, ['paa1u', 'paa1', 'picraok', 'fha', 'hoaupdate', 'hoapaid', 'hoaupd', 'extend', 'contract']), sideContacts(7)), true,
      { text: 'Settlement date in the contract (¶8).', days: 'Tue, Mar 17' });
  }

  /* ════════════════ Step 8 · Closing ════════════════ */
  function caNewStep7() {
    var walkMail = inbox('va8_karen_walk', 'karen',
      '<p>Hi Shannon and ' + TC_FIRST + ',</p>' +
      '<p>Sergio and Jasmin did the walk through and signed the report at <strong>11:22 AM</strong>. Copy attached.</p>' + KAREN_SIG,
      { to: 'To: Shannon Paschall, ' + toMe(), attach: ['walk'] });
    var walkBanner = '<div class="wf-signed-banner" style="margin-top:14px">&#10003; Walk through signed by both buyers at 11:22 AM: stove, refrigerator, plumbing and water heater checked; property in substantially the same condition, no repairs necessary.</div>';

    var altaMail = inbox('va8_joel_alta', 'joel',
      '<p>Hi ' + TC_FIRST + ',</p>' +
      '<p>Attached is the <strong>ALTA settlement statement</strong> for today&rsquo;s settlement of 4232 Maplehurst Road, RW Towne Title file 22026-67041. Please review it before anyone signs.</p>' + JOEL_SIG,
      { to: 'To: ' + toMe() + ' &middot; CC: Shannon Paschall', attach: ['alta'] });
    var altaForm = form('va-alta', 'Audit the ALTA settlement statement', 'Find each figure on the statement and confirm it matches what you papered.', [
      { label: 'Sale price', kind: 'money', ans: 290000, ph: '$', show: '$290,000.00' },
      { label: 'Seller credit to the buyers', kind: 'money', ans: 5000, ph: '$', show: '$5,000.00' },
      { label: 'Deposit credited to the buyers', kind: 'money', ans: 500, ph: '$', show: '$500.00' },
      { label: 'Compensation to AtCoastal Realty', kind: 'money', ans: 5800, ph: '$', show: '$5,800.00' },
      { label: 'Seller paid compensation to BHHS RW Towne', hint: 'Commission section', kind: 'money', ans: 7250, ph: '$', show: '$7,250.00' },
      { label: 'Who funded the $17,500 down payment credit', kind: 'text', ans: ['fhlbank', 'fhlb', 'atlanta'], ph: 'Name on the ALTA', show: 'FHLBank Atlanta, $17,500.00' },
      { label: "Seller's net proceeds", hint: 'Balance Due TO', kind: 'money', ans: 171729.53, ph: '$', show: '$171,729.53' },
      { label: "Buyers' cash due at closing", hint: 'Balance Due FROM', kind: 'money', ans: 500, ph: '$', show: '$500.00' }
    ]);
    var duesDec = decision('va-d-hoadues',
      'The ALTA charges HOA dues at $53.80 a month, but the contract says $50.00. Do you ask title to change it?',
      [
        { t: 'No. The resale certificate shows the current assessment is $53.80. The contract figure was out of date.', ok: true },
        { t: 'Yes. The contract controls every number on the statement.', ok: false },
        { t: 'Yes, and ask the seller to refund the difference.', ok: false }
      ],
      'Title charges what the association actually bills. $53.80 matches Appendix 4 of the certificate and the March dues line, which is why you flagged the difference back in Step 4.');

    var cdaMail = inbox('va8_diana_cda', 'diana',
      '<p>Hi ' + TC_FIRST + ',</p>' +
      '<p>Jon McAchran, our principal broker, signed the <strong>commission disbursement authorization</strong> for 4232 Maplehurst Road today. Please match it to the ALTA before we file it.</p>' + DIANA_SIG,
      { attach: ['cda', 'alta'] });
    var cdaForm = form('va-cda', 'Match the CDA to the ALTA', "AtCoastal Realty's commission disbursement authorization, signed Apr 1 by principal broker Jon McAchran.", [
      { label: 'Listing commission', kind: 'money', ans: 5800, ph: '$', show: '$5,800.00' },
      { label: 'Commission as a % of $290,000', kind: 'money', ans: 2, ph: '%', show: '2%' },
      { label: 'Transaction fee charged to the seller', kind: 'money', ans: 595, ph: '$', show: '$595.00 (LA Admin Fee on the ALTA)' },
      { label: 'Net pay due to the agent', kind: 'money', ans: 6261.63, ph: '$', show: '$6,261.63 to Shannon Paschall, Inc.' }
    ]);

    var closeTask = mailTask('close', 'Send Shannon the wrap up',
      'Confirm the settlement and the CDA amounts and close the file. Copy Diana.', 'va8_sent_close');
    compose({
      key: 'close', scenario: 'tc-va-post-closing', prompt: 'Post closing confirmation email, 4232 Maplehurst Road VA (settled 03/30/2026)',
      to: 'Shannon Paschall <shannon@shannonsellsva.com>', cc: 'Diana Martinez <diana@shannonsellsva.com>',
      subj: 'Closed: 4232 Maplehurst Road (03/30/2026)', attach: ['alta', 'cda'],
      inst: 'Confirm settlement on 03/30/2026 at $290,000, the CDA amounts, and that the full file is archived.',
      rules: {
        need: [['shannon', 'to', 'The wrap up goes to Shannon.'], ['diana', 'any', 'Copy Diana, who handles the CDA.']],
        never: [['karen', 'The CDA is internal to AtCoastal Realty. Keep the buyer side off this email.'], ['buyers', 'The CDA is internal to AtCoastal Realty. Keep the buyer side off this email.']]
      },
      ans: "Hi Shannon,\n\n4232 Maplehurst Road settled on Monday, March 30, 2026 at RW Towne Title (file 22026-67041) for $290,000, with a $5,000 seller credit.\n\nI matched the CDA Jon signed on April 1 to the ALTA:\n• Listing commission: $5,800 (2% of $290,000)\n• Transaction fee charged to the seller: $595 (LA Admin Fee on the ALTA)\n• Net pay due to Shannon Paschall, Inc.: $6,261.63\n\nThe ALTA and the CDA are attached, and the full file is archived.\n\nBest,\n" + TC_SIGN
    });
    var closeReply = inbox('va8_shannon_close', 'shannon',
      '<p>Thank you, ' + TC_FIRST + '. You kept this file on track from ratification to settlement.</p>' + SHANNON_SIG,
      { to: 'To: ' + toMe() + ' &middot; CC: Diana Martinez' });

    var evalBox = card('Workflow Validation: 4232 Maplehurst Road', 'Listing side, from ratification to settlement.',
      '<div style="margin-bottom:14px;font-size:13.5px;color:var(--v-ink);line-height:1.6;">You took 4232 Maplehurst Road from ratification on Feb 22 to settlement on Mar 30: deadlines, a deposit change, the HOA certificate, an as is counter, a closing date extension and the final numbers.' +
        '<ul style="margin:8px 0 14px;padding-left:22px;">' +
          '<li>Built the file sheet from the signed contract and confirmed both borrowers with the lender</li>' +
          '<li>Calendared every deadline from the 02/22/2026 ratification</li>' +
          '<li>Sent the seller a plain language summary</li>' +
          '<li>Distributed the contract to the right parties only</li>' +
          '<li>Papered the change to a personal check and logged the $500 deposit</li>' +
          '<li>Checked the HOA certificate, the cancellation window and Appendix 15</li>' +
          '<li>Reviewed the reports and the buyers&rsquo; PICRA</li>' +
          '<li>Kept the negotiation alive, held the unsigned PAA-1 and logged $290,000 with a $5,000 credit</li>' +
          '<li>Handled the appraisal, the FHA clause, the PMA date and the move to Mar 30</li>' +
          '<li>Audited the ALTA before signing</li>' +
          '<li>Matched the CDA and archived the file</li>' +
        '</ul></div><div id="wf-eval-container"></div>');

    var main = deck(8, [
      { label: 'Walk Through', body: walkMail + when('va8walk', function () { return readOk('va8_karen_walk'); }, walkBanner),
        ok: function () { return readOk('va8_karen_walk'); }, err: 'Open Karen&rsquo;s email in Mail first.' },
      { label: 'ALTA Audit', body: altaMail + when('va8alta', function () { return readOk('va8_joel_alta'); }, altaForm),
        ok: function () { return formOk('va-alta'); }, check: function () { if (readOk('va8_joel_alta')) caNewCheck('va-alta'); },
        err: function () { return readOk('va8_joel_alta') ? 'Some figures do not match the ALTA.' : 'Open Joel&rsquo;s email in Mail first.'; } },
      { label: 'HOA Dues', body: duesDec, ok: function () { return decOk('va-d-hoadues'); }, err: 'Answer the decision point first.' },
      { label: 'Commission', body: cdaMail + when('va8cda', function () { return readOk('va8_diana_cda'); }, cdaForm),
        ok: function () { return formOk('va-cda'); }, check: function () { if (readOk('va8_diana_cda')) caNewCheck('va-cda'); },
        err: function () { return readOk('va8_diana_cda') ? 'Some figures do not match the CDA and the ALTA.' : 'Open Diana&rsquo;s email in Mail first.'; } },
      { label: 'Wrap-up', body: closeTask + closeReply +
          banner('va8done', function () { return replyOk('close', 'va8_shannon_close'); }, '<strong>Transaction complete:</strong> settled and archived.') +
          when('va8eval', function () { return replyOk('close', 'va8_shannon_close'); }, '<div style="margin-top:18px;">' + evalBox + '</div>' +
          '<div class="tc-finish-bar">' +
            '<div class="tc-finish-text"><strong>Full transaction workflow complete.</strong><span>Go back to the case list to pick another case, or run this one again from the start.</span></div>' +
            '<div class="tc-finish-actions">' +
              '<button type="button" class="tc-finish-btn ghost" onclick="wfRestartCase()">&#8635; Restart case</button>' +
              '<button type="button" class="tc-finish-btn primary" onclick="wfReset()">Exit simulator &rarr;</button>' +
            '</div>' +
          '</div>'),
        ok: function () { return replyOk('close', 'va8_shannon_close'); }, err: replyErr('Shannon') }
    ], null);

    return step(8, STEP_TITLES[8], 'Mon, Mar 30 – Wed, Apr 1, 2026',
      'Walk through signed at 11:22 AM and settlement at <strong>RW Towne Title LLC</strong> (file 22026-67041, escrow officer Joel C. Gueli). Before anyone signs, check the numbers against the file. Then tie the brokerage paperwork to the settlement statement and close the file.',
      main, side([['Settled', 'Mon, Mar 30'], ['Loan', '$283,970 FHA'], ['VHDA payoffs', '$97,149.98'], ['Home warranty', '$700, buyer'], ['WDI invoice', '$90, buyer'], ['Broker', 'Jon McAchran']],
        sideDocs(8, ['walk', 'alta', 'cda', 'paa1', 'hoa']), sideContacts(8)), true);
  }

  window.caNewS8EvalRender = function () {
    if (typeof wfRenderFinalScore === 'function' && document.getElementById('wf-eval-container')) wfRenderFinalScore('wf-eval-container', 'tc', 'va', VA_STATE_COUNT);
  };

  /* ════════════════ Hints ("Ask Shannon") ════════════════ */
  var STEP_HINTS = {
    0: [
      "Work from the signed pages. The agreement starts on PDF page 2; the pre approval letter is page 1.",
      "Ratified 02/22/2026; Sergio P Malonzo, Jr. and Jasmin Malonzo; $285,000 FHA; $500 deposit with BHHS RW Towne Realty; settlement by 03/17/2026; repair cap 1%, $2,850.",
      "Count every deadline from 02/22: deposit Tue, Feb 24; loan application, reports and PICRA Sun, Mar 1; settlement Mar 17, or Mar 27 at the latest with the extension. The $272,181 on the letter is the base loan plus the financed FHA premium."
    ],
    1: [
      "Jemal needs plain language: price, settlement date, deposit, access for inspections, what conveys and utilities.",
      "The contract goes to Karen, Joel at RW Towne Title and Brad at Archer Mortgage, with me copied.",
      "Never send it straight to the buyers: notices go through Karen (¶23). Pest Heroes has no role in this sale."
    ],
    2: [
      "Compare the form of payment in ¶2 with what Karen sent.",
      "A change to the deposit needs a signed amendment. Addendum #1 switched it to personal check.",
      "$500, payable to BHHS RW Towne Realty, check dated 02/23, on time; the escrow agent deposits it within 5 business banking days of receipt."
    ],
    3: [
      "The CIC-2 shows when the buyers received the certificate. Virginia gives them 3 days to cancel after that.",
      "Received 02/23/2026, so they can cancel until 11:59 PM Thu, Feb 26. Appendix 4: $53.80 a month, $56.36 balance as of 01/20/2026.",
      "Unknown is not an answer: get the association manager to say it in writing. The contract's $50.00 fee is out of date."
    ],
    4: [
      "Compare the PICRA delivery date with the Mar 1 deadline.",
      "The PICRA is only a request. Full reports go with it, items left off are waived, and agreed repairs are outside the ¶13 cap.",
      "The WDI report is clean, so no treatment is owed. The Pest Heroes reports from Jan 19 predate this contract and do not count."
    ],
    5: [
      "Watch the negotiation period: it ends Mon, Mar 2 at 11:59 PM unless an addendum extends it.",
      "An unsigned addendum is not a deal. Hold the first PAA-1 until the buyers sign.",
      "Ratified PICRA: $290,000, $5,000 credit, no repairs, Removal Acceptance Date 03/06/2026, appraisal at least $290,000."
    ],
    6: [
      "The automatic extension in ¶8 only covers loan processing or title defects, for 10 days.",
      "If Mar 17 will not happen, get a signed addendum with a new date. Check every date on third party orders like PMA's.",
      "Appraisal authorized by Mon, Mar 9; FHA value $290,000; extension reaches Fri, Mar 27; new settlement 03/30/2026. An order on payment hold is not being worked."
    ],
    7: [
      "Put the ALTA next to the ratified PICRA, the PAA-1 and the resale certificate.",
      "$290,000; credit $5,000; deposit $500; AtCoastal $5,800; BHHS RW Towne $7,250; FHLBank Atlanta $17,500; seller net $171,729.53; buyers due $500.",
      "HOA dues at $53.80 are right. CDA: $5,800 (2%), $595 fee, $6,261.63 net to Shannon Paschall, Inc."
    ]
  };

  /* ════════════════ EXPORT ════════════════ */
  window.WF_HINT_MENTOR = { initials: 'SP', name: 'Shannon Paschall', role: 'Listing Agent &middot; Mentor', fab: 'Ask Shannon' };
  var CASE_EXPORT = {
    getState: function () {
      tcMailSaveDraft();
      // Text fields normally commit on blur; also retain the field being typed.
      document.querySelectorAll('[data-tc-store]').forEach(function (field) {
        run()[field.dataset.tcStore + field.id] = field.value;
      });
      var slides = [];
      for (var i = 0; i <= 8; i++) slides[i] = window['_caNewSlide' + i];
      return { slides: slides, decisions: DEC_LAST };
    },
    restoreState: function (state) {
      for (var i = 0; i <= 8; i++) {
        var slide = state.slides && state.slides[i];
        window['_caNewSlide' + i] = typeof slide === 'number' && slide >= 0 ? slide : 0;
      }
      DEC_LAST = state.decisions || {};
    },
    type: 'workflow',
    usePipeline: true,
    tag: 'Virginia · Seller Side · Real File',
    title: '4232 Maplehurst Road: Listing Side to Settlement',
    headerProp: '4232 Maplehurst Rd · Seller Side',
    headerTitle: 'Virginia TC Simulator',
    guarantee: 'Authentic client emails, REIN contract work &amp; settlement audit trail',
    subtitle: 'Virginia Beach, VA 23462 &middot; Townhome &middot; Seller Side',
    desc: 'A real Virginia Beach townhome sale on the listing side, from ratification on Feb 22 to settlement on Mar 30, 2026: deadlines, a deposit change, the HOA resale certificate, an as is counter with a price increase and seller credit, FHA paperwork, a closing date extension and the final numbers.',
    stepCount: 8,
    specs: [
      { label: 'Sale Price', value: '$290,000' },
      { label: 'Seller', value: 'Jemal O Tamem' },
      { label: 'Buyers', value: 'Sergio & Jasmin Malonzo (FHA)' },
      { label: 'Key TC Scope', value: 'Deadlines, EMD, HOA, PICRA, ALTA' }
    ],
    onReset: function () {
      if (typeof window.caNewResetCase === 'function') window.caNewResetCase();
    },
    wfLabels: ['Ratified Contract', 'Seller & Parties', 'Escrow & Deposit', 'HOA & Disclosures', 'Inspections', 'Repairs', 'Pre-Closing', 'Closing'],
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

  window.TC_VA_CASE = window.tcCaseModule ? window.tcCaseModule(install) : install();
})();
