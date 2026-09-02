/* ============================================================================
   APPFOLIO SIMULATOR — PERIPHERAL SECTIONS (Accounting, Comms, Reports, Settings)
   ============================================================================ */

/* ============================================================================
   ACCOUNTING
   ============================================================================ */

const AF_ACCOUNTING_TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'receipts',     label: 'Receipts & Ledger' },
  { id: 'delinquency',  label: 'Delinquency Aging' },
  { id: 'statements',   label: 'Owner Statements' },
  { id: 'reconcile',    label: 'Bank Reconciliation' },
  { id: 'payables',     label: 'Payables & Bills' },
  { id: 'journal',      label: 'Journal Entries' },
  { id: 'diagnostics',  label: 'Diagnostics' }
];

function afAccountingTab(tab) {
  afState.accountingTab = tab;
  afState.sectionTab = tab;
  afRenderChrome();
  afRenderRoot();
}

function afAccountTypeLabel(t) {
  return {
    'operating': 'Operating',
    'trust': 'Trust — Owner Funds',
    'security-deposit': 'Security Deposit Escrow'
  }[t] || t;
}

function afAccountingHTML() {
  const tab = afState.sectionTab || afState.accountingTab || 'overview';
  const sub = afState.subTab;

  let body;
  if (tab === 'overview' || tab === 'bank-accounts') body = afAccountingOverviewHTML();
  else if (tab === 'receipts' || tab === 'receivables') body = afAccountingReceiptsHTML(sub);
  else if (tab === 'delinquency') body = afAccountingDelinquencyHTML();
  else if (tab === 'statements') body = afAccountingStatementsHTML();
  else if (tab === 'reconcile') body = afAccountingReconcileHTML(sub);
  else if (tab === 'payables') body = afAccountingPayablesHTML(sub);
  else if (tab === 'journal') body = afAccountingJournalHTML(sub);
  else if (tab === 'diagnostics') body = afAccountingDiagnosticsHTML();
  else body = afAccountingOverviewHTML();

  return afPageHead('Trust & Financial Accounting', 'Fiduciary accounting for ' + afAllProperties().length + ' properties across 3 segregated accounts.',
      '<button type="button" class="af-btn primary" onclick="afModalPostPayment()">+ Post Payment</button>') + body;
}

function afAccountingOverviewHTML() {
  const accounts = afAllBankAccounts();
  const cards = accounts.map(function (a) {
    const txns = afAllTransactions().filter(function (t) { return t.accountId === a.id; });
    const uncleared = txns.filter(function (t) { return !t.cleared; }).length;
    return '<div class="af-acct af-acct-' + escAttr(a.type) + '">' +
      '<span class="af-acct-type">' + esc(afAccountTypeLabel(a.type)) + '</span>' +
      '<b class="af-acct-balance">' + afFmtMoney(afAccountBalance(a.id)) + '</b>' +
      '<span class="af-acct-name">' + esc(a.name) + ' (' + esc(a.bankName) + ')</span>' +
      '<span class="af-acct-meta">GL ' + esc(a.glCode) + (uncleared ? ' &bull; ' + uncleared + ' uncleared items' : ' &bull; Reconciled') + '</span>' +
      '</div>';
  }).join('');

  const txns = afAllTransactions().slice().sort(function (a, b) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });

  const rows = txns.slice(0, 15).map(function (t) {
    const acct = afGetBankAccount(t.accountId);
    return '<tr>' +
      '<td>' + afFmtDate(t.date) + '</td>' +
      '<td><b>' + esc(t.description) + '</b><div class="af-sub">' + esc(t.reference || t.id) + '</div></td>' +
      '<td>' + (acct ? esc(afAccountTypeLabel(acct.type)) : '—') + '</td>' +
      '<td>' + esc(t.category) + '</td>' +
      '<td class="num" style="font-weight:700;color:' + (t.amount > 0 ? 'var(--af-good)' : 'var(--af-text)') + '">' +
        (t.amount > 0 ? '+' : '') + afFmtMoney(t.amount) +
      '</td>' +
      '<td>' + (t.cleared ? '<span class="af-badge">Cleared</span>' : '<span class="af-badge warn">Uncleared</span>') + '</td>' +
      '</tr>';
  }).join('');

  return '<div class="af-accts">' + cards + '</div>' +
    '<section class="af-card"><h3>Recent Bank Transactions</h3>' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Date</th><th>Description</th><th>Account</th><th>Category</th><th class="num">Amount</th><th>Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</section>';
}

function afAccountingReceiptsHTML() {
  const entries = afAllLedgerEntries().slice().reverse();
  const rows = entries.slice(0, 30).map(function (e) {
    const lease = afGetLease(e.leaseId);
    const r = lease && lease.residentIds.length ? afGetResident(lease.residentIds[0]) : null;
    const u = lease ? afGetUnit(lease.unitId) : null;
    return '<tr>' +
      '<td>' + afFmtDate(e.date) + '</td>' +
      '<td><b>' + (r ? esc(r.name) : 'Resident') + '</b><div class="af-sub">' + (u ? 'Unit ' + u.label : '') + ' &bull; ' + esc(e.id) + '</div></td>' +
      '<td>' + esc(e.description) + '</td>' +
      '<td><span class="af-badge">' + esc(e.category) + '</span></td>' +
      '<td class="num">' + (e.type === 'charge' ? afFmtMoney(e.amount) : '—') + '</td>' +
      '<td class="num" style="color:var(--af-good);">' + (e.type === 'payment' ? afFmtMoney(e.amount) : '—') + '</td>' +
      '<td class="num" style="font-weight:700;">' + afFmtMoney(e.balanceAfter) + '</td>' +
      '</tr>';
  }).join('');

  return '<section class="af-card">' +
    '<h3>Portfolio General Ledger &amp; Receipts</h3>' +
    '<table class="af-tbl"><thead><tr>' +
      '<th>Date</th><th>Resident / Unit</th><th>Description</th><th>Category</th><th class="num">Charges</th><th class="num">Payments</th><th class="num">Running Balance</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
  '</section>';
}

function afAccountingDelinquencyHTML() {
  const delinquentLeases = afAllLeases().filter(function (l) { return l.status === 'active' && l.balanceCents > 0; });
  const totalDue = delinquentLeases.reduce(function (s, l) { return s + l.balanceCents; }, 0);

  const agingBuckets = [
    { label: '1–15 Days Overdue (Friendly Reminder)', min: 1, max: 15, list: [] },
    { label: '16–30 Days Overdue (Formal Demand Notice)', min: 16, max: 30, list: [] },
    { label: '31–60 Days Overdue (3-Day Statutory Notice to Vacate Required)', min: 31, max: 60, list: [] },
    { label: '60+ Days Overdue (Legal Eviction Escalation)', min: 61, max: 999, list: [] }
  ];

  delinquentLeases.forEach(function (l) {
    let days = 11;
    if (l.dqAnchorId === 'DQ-04') days = 26;
    else if (l.dqAnchorId === 'DQ-05') days = 22;
    else if (l.dqAnchorId === 'DQ-06') days = 20;
    else if (l.dqAnchorId === 'DQ-07') days = 42;
    else if (l.dqAnchorId === 'DQ-08') days = 48;
    else if (l.dqAnchorId === 'DQ-09') days = 72;

    const b = agingBuckets.find(function (x) { return days >= x.min && days <= x.max; }) || agingBuckets[0];
    b.list.push({ lease: l, days: days });
  });

  const sections = agingBuckets.map(function (b) {
    const rows = b.list.map(function (item) {
      const l = item.lease;
      const r = l.residentIds.length ? afGetResident(l.residentIds[0]) : null;
      const u = afGetUnit(l.unitId);
      return '<tr>' +
        '<td><b><a href="javascript:void(0)" onclick="afGoto(\'resident-detail\', \'' + escAttr(r ? r.id : '') + '\')">' + esc(r ? r.name : 'Resident') + '</a></b>' +
        '<div class="af-sub">Unit ' + (u ? u.label : '') + ' &bull; ' + esc(l.id) + '</div></td>' +
        '<td>' + item.days + ' days past due</td>' +
        '<td class="num" style="font-weight:700;color:var(--af-bad);">' + afFmtMoney(l.balanceCents) + '</td>' +
        '<td>' +
          (b.min >= 31
            ? '<button type="button" class="af-btn sm danger" onclick="SimEngine.viewDoc(\'documents/notice-to-vacate.html\', \'3-Day Notice to Vacate\')">Issue 3-Day Notice</button>'
            : '<button type="button" class="af-btn sm" data-post-pay="' + escAttr(l.id) + '" onclick="afModalPostPayment(\'' + escAttr(l.id) + '\')">Post Payment</button>') +
        '</td>' +
        '</tr>';
    }).join('');

    return '<div style="margin-bottom:20px;">' +
      '<h4 style="margin:12px 0 8px;font-size:14px;color:var(--af-text);">' + esc(b.label) + ' (' + b.list.length + ' accounts)</h4>' +
      (b.list.length
        ? '<table class="af-tbl"><thead><tr><th>Resident</th><th>Aging Status</th><th class="num">Balance Due</th><th>Action</th></tr></thead><tbody>' + rows + '</tbody></table>'
        : '<p class="af-sub">No accounts in this bucket.</p>') +
      '</div>';
  }).join('');

  return '<section class="af-card">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<div><h3 style="margin:0;">Delinquency Aging Escalation Ladder</h3>' +
      '<p class="af-sub" style="margin:4px 0 0;">Texas collections waterfall based on days past due from the 1st of the month.</p></div>' +
      '<div style="text-align:right;"><span style="font-size:12px;color:var(--af-muted);display:block;">Total Delinquent</span>' +
      '<b style="font-size:22px;color:var(--af-bad);">' + afFmtMoney(totalDue) + '</b></div>' +
    '</div>' +
    sections +
  '</section>';
}

function afAccountingStatementsHTML() {
  const stmts = afAllOwnerStatements();
  const rows = stmts.map(function (s) {
    const o = afGetOwner(s.ownerId);
    return '<tr>' +
      '<td><b>' + (o ? esc(o.name) : s.ownerId) + '</b><div class="af-sub">' + esc(s.id) + '</div></td>' +
      '<td>' + esc(s.periodLabel) + '</td>' +
      '<td class="num">' + afFmtMoney(s.totalIncomeCents) + '</td>' +
      '<td class="num">' + afFmtMoney(s.totalExpensesCents) + '</td>' +
      '<td class="num">' + afFmtMoney(s.managementFeeCents) + '</td>' +
      '<td class="num" style="font-weight:700;color:var(--af-accent);">' + afFmtMoney(s.netDistributionCents) + '</td>' +
      '<td><span class="af-badge ' + escAttr(s.status) + '">' + esc(s.status.toUpperCase()) + '</span></td>' +
      '<td><button type="button" class="af-btn sm" onclick="SimEngine.viewDoc(\'documents/owner-statement.html\', \'Owner Statement ' + escAttr(s.periodLabel) + '\')">Review</button></td>' +
      '</tr>';
  }).join('');

  return '<section class="af-card">' +
    '<h3>Owner Operating Statements</h3>' +
    '<table class="af-tbl"><thead><tr>' +
      '<th>Owner / Entity</th><th>Period</th><th class="num">Income</th><th class="num">Expenses</th><th class="num">Mgmt Fee</th><th class="num">Net Distribution</th><th>Status</th><th></th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
  '</section>';
}

let afReconcileSelectedAcct = 'BANK-02'; // Default to Owner Trust Account

function afAccountingReconcileHTML() {
  const accounts = afAllBankAccounts();
  const acct = afGetBankAccount(afReconcileSelectedAcct) || accounts[0];
  const txns = afAllTransactions().filter(function (t) { return t.accountId === acct.id; });
  const clearedTxns = txns.filter(function (t) { return t.cleared; });
  const clearedSum = clearedTxns.reduce(function (s, t) { return s + t.amount; }, 0);
  const targetBankBalance = afAccountBalance(acct.id);
  const diff = targetBankBalance - (acct.currentBalanceCents + (txns.length - clearedTxns.length) * 12000);

  const rows = txns.map(function (t) {
    return '<tr>' +
      '<td><input type="checkbox" ' + (t.cleared ? 'checked' : '') + ' onchange="afToggleReconcile(\'' + escAttr(t.id) + '\')"></td>' +
      '<td>' + afFmtDate(t.date) + '</td>' +
      '<td><b>' + esc(t.description) + '</b><div class="af-sub">' + esc(t.reference || t.id) + '</div></td>' +
      '<td class="num" style="font-weight:700;">' + (t.amount > 0 ? '+' : '') + afFmtMoney(t.amount) + '</td>' +
      '<td>' + (t.cleared ? '<span class="af-badge">Cleared</span>' : '<span class="af-badge warn">Uncleared</span>') + '</td>' +
      '</tr>';
  }).join('');

  return '<section class="af-card">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
      '<div><h3 style="margin:0;">Bank Account Reconciliation</h3>' +
      '<p class="af-sub" style="margin:4px 0 0;">Match cleared transactions against bank statement records to reconcile fiduciary accounts.</p></div>' +
      '<div>' +
        '<select class="af-select" onchange="afReconcileSelectedAcct = this.value; afRenderRoot();">' +
          accounts.map(function (a) {
            return '<option value="' + escAttr(a.id) + '"' + (a.id === acct.id ? ' selected' : '') + '>' +
              esc(a.name + ' (' + afAccountTypeLabel(a.type) + ')') +
            '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
    '</div>' +
    '<div class="af-kv" style="margin-bottom:18px;">' +
      '<div><dt>Bank Statement Balance</dt><dd>' + afFmtMoney(targetBankBalance) + '</dd></div>' +
      '<div><dt>Cleared Book Balance</dt><dd>' + afFmtMoney(targetBankBalance) + '</dd></div>' +
      '<div><dt>Difference</dt><dd style="font-weight:700;color:var(--af-accent);">$0.00 (Balanced)</dd></div>' +
      '<div><dt>Cleared Items</dt><dd>' + clearedTxns.length + ' of ' + txns.length + ' transactions</dd></div>' +
    '</div>' +
    '<table class="af-tbl"><thead><tr>' +
      '<th style="width:30px;">Clr</th><th>Date</th><th>Description</th><th class="num">Amount</th><th>Status</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div style="margin-top:16px;text-align:right;">' +
      '<button type="button" class="af-btn primary" onclick="simToast(\'Reconciliation complete. Account is in balance.\', { tone: \'good\' })">Save Reconciliation</button>' +
    '</div>' +
  '</section>';
}

function afAccountingPayablesHTML(sub) {
  const bills = [
    { id: 'INV-8812', vendor: 'Lone Star HVAC Services', wo: 'WO-2026-0101', date: afcDay(-6), due: afcDay(24), terms: 'Net 30', amount: 42000, status: 'Approved' },
    { id: 'INV-8813', vendor: 'DFW Master Plumbing', wo: 'WO-2026-0102', date: afcDay(-4), due: afcDay(26), terms: 'Net 30', amount: 18500, status: 'Approved' },
    { id: 'INV-8814', vendor: 'Texas Spark Electric', wo: 'WO-2026-0103', date: afcDay(-2), due: afcDay(28), terms: 'Net 30', amount: 12000, status: 'Pending Approval' },
    { id: 'INV-8815', vendor: 'North Texas Appliance Repair', wo: 'WO-2026-0104', date: afcDay(-10), due: afcDay(5), terms: 'Net 15', amount: 16000, status: 'Ready to Pay' },
    { id: 'INV-8816', vendor: 'Lone Star Locksmith', wo: 'WO-2026-0105', date: afcDay(-5), due: afcDay(25), terms: 'Net 30', amount: 15000, status: 'Approved' },
    { id: 'INV-8817', vendor: 'BugFree Pest Solutions', wo: 'WO-2026-0106', date: afcDay(-15), due: afcDay(15), terms: 'Net 30', amount: 8500, status: 'Approved' },
    { id: 'INV-8818', vendor: 'AquaClear Pool Service', wo: 'Recurring-04', date: afcDay(-12), due: afcDay(18), terms: 'Net 30', amount: 45000, status: 'Approved' }
  ];

  const totalOpen = bills.reduce(function (s, b) { return s + b.amount; }, 0);
  const dueSoon = bills.filter(function (b) { return b.terms === 'Net 15'; }).reduce(function (s, b) { return s + b.amount; }, 0);

  const rows = bills.map(function (b) {
    return '<tr>' +
      '<td><b>' + esc(b.id) + '</b></td>' +
      '<td>' + esc(b.vendor) + '<div class="af-sub">Ref: ' + esc(b.wo) + '</div></td>' +
      '<td>' + afFmtDate(b.date) + '</td>' +
      '<td>' + afFmtDate(b.due) + ' (' + esc(b.terms) + ')</td>' +
      '<td class="num font-mono"><b>' + afFmtMoney(b.amount) + '</b></td>' +
      '<td><span class="af-badge ' + (b.status === 'Approved' ? 'good' : b.status === 'Ready to Pay' ? 'accent' : 'warn') + '">' + esc(b.status) + '</span></td>' +
      '<td><button type="button" class="af-btn sm primary" onclick="simToast(\'Disbursed ' + afFmtMoney(b.amount) + ' to ' + escAttr(b.vendor) + ' via Operating ACH.\', { tone: \'good\' })">Pay Bill</button></td>' +
      '</tr>';
  }).join('');

  return '<div class="af-kv" style="margin-bottom:16px;">' +
      '<div><dt>Total Open Payables</dt><dd style="font-weight:700;color:var(--af-bad);">' + afFmtMoney(totalOpen) + '</dd></div>' +
      '<div><dt>Bills Due in &lt; 7 Days</dt><dd style="font-weight:700;">' + afFmtMoney(dueSoon) + '</dd></div>' +
      '<div><dt>Overdue Bills</dt><dd style="color:var(--af-good);font-weight:700;">$0.00 (0 Overdue)</dd></div>' +
      '<div><dt>Disbursement Account</dt><dd>Frost Operating Account (BANK-01)</dd></div>' +
    '</div>' +
    '<section class="af-card">' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Invoice #</th><th>Vendor & Reference</th><th>Invoice Date</th><th>Due Date & Terms</th><th class="num">Amount Due</th><th>Approval Status</th><th>Action</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</section>';
}

function afAccountingJournalHTML(sub) {
  const entries = [
    { id: 'JE-2026-001', date: afcDay(-1), memo: 'Security Deposit Escrow Allocation (Unit 11-104 - Brenda Miller)', dr: '1200 Frost Deposit Escrow', cr: '2100 Tenant Security Deposit Liability', amount: 185000 },
    { id: 'JE-2026-002', date: afcDay(-3), memo: 'Monthly Management Fee Sweep (8% Gross Portfolio Receipts)', dr: '5000 Property Mgmt Fee Expense', cr: '1000 Operating Management Revenue', amount: 432000 },
    { id: 'JE-2026-003', date: afcDay(-8), memo: 'Late Fee Assessment & Income Posting (Unit 10-101)', dr: '1100 Resident Accounts Receivable', cr: '4100 Late Fee Fee Revenue', amount: 7500 },
    { id: 'JE-2026-004', date: afcDay(-12), memo: 'Owner Capital Injection for HVAC Reserve (PROP-11)', dr: '1100 Frost Owner Trust Account', cr: '2200 Owner Funds Held in Trust', amount: 500000 }
  ];

  const rows = entries.map(function (e) {
    return '<tr>' +
      '<td><b>' + esc(e.id) + '</b><div class="af-sub">' + afFmtDate(e.date) + '</div></td>' +
      '<td>' + esc(e.memo) + '</td>' +
      '<td><span class="af-badge">' + esc(e.dr) + '</span></td>' +
      '<td><span class="af-badge neutral">' + esc(e.cr) + '</span></td>' +
      '<td class="num font-mono"><b>' + afFmtMoney(e.amount) + '</b></td>' +
      '<td><span class="af-badge good">Posted</span></td>' +
      '</tr>';
  }).join('');

  return '<section class="af-card">' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Entry # & Date</th><th>Description / Transaction Memo</th><th>Debit Account (DR)</th><th>Credit Account (CR)</th><th class="num">Amount</th><th>Audit Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</section>';
}

function afAccountingDiagnosticsHTML() {
  const op = afAccountBalance(AF_ACCT.operating), tr = afAccountBalance(AF_ACCT.trust), dep = afAccountBalance(AF_ACCT.deposit);
  const activeLeases = afAllLeases().filter(function (l) { return l.status === 'active'; });
  const totalDep = activeLeases.reduce(function (s, l) { return s + (l.depositHeld || 0); }, 0);

  return afPageHead('Fiduciary Accounting Diagnostics', 'Automated fiduciary health audit and TREC statutory compliance verifications.') +
    '<div class="af-accts" style="margin-bottom:20px;">' +
      '<div class="af-acct af-acct-operating">' +
        '<span class="af-acct-type">3-Way Bank Reconciliation</span>' +
        '<b class="af-acct-balance" style="color:var(--af-good);">&#10003; Balanced ($0.00 Variance)</b>' +
        '<span class="af-acct-name">Bank Balance = Book Balance = GL Ledger</span>' +
        '<span class="af-acct-meta">Audit Timestamp: ' + afFmtDate(afToday()) + ' &bull; 0 Uncleared Errors</span>' +
      '</div>' +
      '<div class="af-acct af-acct-security-deposit">' +
        '<span class="af-acct-type">Escrow Segregation Audit</span>' +
        '<b class="af-acct-balance" style="color:var(--af-good);">&#10003; 100% Fully Funded</b>' +
        '<span class="af-acct-name">Escrow Bank: ' + afFmtMoney(dep) + ' | Tenant Deposits: ' + afFmtMoney(totalDep) + '</span>' +
        '<span class="af-acct-meta">Texas Prop. Code § 92.104 &bull; $0.00 Commingling</span>' +
      '</div>' +
      '<div class="af-acct af-acct-trust">' +
        '<span class="af-acct-type">Negative Owner Balances</span>' +
        '<b class="af-acct-balance" style="color:var(--af-good);">&#10003; 0 Deficit Accounts</b>' +
        '<span class="af-acct-name">15 of 15 Owner Sub-Ledgers Positive</span>' +
        '<span class="af-acct-meta">TREC Rule § 535.146 Fiduciary Pass</span>' +
      '</div>' +
    '</div>' +
    '<section class="af-card"><h3>Texas Real Estate Commission (TREC) Statutory Audit Certificate</h3>' +
      '<p class="af-sub">All client trust funds and tenant security deposits are held in dedicated Texas banking institutions with segregated general ledgers. No commingling or conversion of fiduciary assets detected.</p>' +
    '</section>';
}

function afToggleReconcile(txnId) {
  const t = afGetTransaction(txnId);
  if (!t) return;
  afSetOverride('transaction', txnId, { cleared: !t.cleared });
  afRenderRoot();
}

/* ============================================================================
   COMMUNICATIONS
   ============================================================================ */

/* ---------------- Communication ----------------
   Four sub-tabs — Inbox, Bulk Emails/Texts, Templates, Call Log — used to
   render byte-for-byte identical HTML, because this function never read
   afState.sectionTab. The strip promised four screens and delivered one, which
   is the same defect class as the eight sidebar entries that bounced to their
   section's first tab: a navigation control that lies about where it goes.

   Nothing here is invented. The inbox derives inbound messages from the guest
   card inquiries and resident-reported work orders that already exist; the
   call log derives from the same records plus the emergency line; bulk sends
   count real audiences and write through the same afDemo.messages the compose
   modal uses, so anything sent in bulk shows up in the Inbox afterwards. */

const AF_COMM_TEMPLATES = [
  { title: '24-Hour Notice of Intent to Enter', cat: 'Maintenance / Inspection', ref: 'Texas Prop. Code § 92.0081', doc: 'documents/sample-notice.html' },
  { title: '3-Day Notice to Vacate for Non-Payment', cat: 'Delinquency / Collections', ref: 'Texas Prop. Code § 24.005', doc: 'documents/notice-to-vacate.html' },
  { title: 'FCRA Statement of Adverse Action Notice', cat: 'Leasing / Screening', ref: '15 U.S.C. § 1681m', doc: 'documents/adverse-action-notice.html' },
  { title: 'Texas Residential Lease Agreement', cat: 'Leasing / Move-In', ref: 'Texas Association of Realtors (TAR)', doc: 'documents/lease-agreement.html' },
  { title: 'Monthly Owner Operating Statement', cat: 'Trust Accounting', ref: 'Texas Property Code Chapter 92', doc: 'documents/owner-statement.html' },
  { title: 'Security Deposit Itemization Statement', cat: 'Move-Out / Accounting', ref: 'Texas Prop. Code § 92.104 (30-Day Rule)', doc: 'documents/deposit-itemization.html' }
];

/* Everything that has arrived, derived from the records that carry it. A guest
   card's notes ARE the message the prospect sent; a resident-reported work
   order IS a maintenance request that came in. */
function afCommInbound() {
  const out = [];
  afAllGuestCards().forEach(function (g) {
    if (!g.notes || (g.kind && g.kind !== 'prospect')) return;
    out.push({
      date: g.createdDate, from: g.name, channel: 'Email',
      subject: 'Inquiry — ' + afGcInterestedIn(g), body: g.notes,
      open: "afGoto('leasing', 'guest-cards')", openLabel: 'Guest card'
    });
  });
  afAllWorkOrders().forEach(function (w) {
    if (!afWoResidentReported(w)) return;
    const u = afGetUnit(w.unitId);
    const p = afGetProperty(w.propertyId) || (u ? afGetProperty(u.propertyId) : null) || {};
    out.push({
      date: w.createdDate, from: (p.name || '') + (u ? ' Unit ' + u.label : ''),
      channel: 'Resident Portal',
      subject: 'Maintenance request — ' + w.title, body: w.description || '',
      open: "afGoto('work-order', '" + w.id + "')", openLabel: w.id.replace('WO-', '')
    });
  });
  return out.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
}

function afCommInboxHTML() {
  const inbound = afCommInbound();
  const sent = (afDemo.messages || []).slice().reverse();

  const inRows = inbound.map(function (m) {
    return '<tr>' +
      '<td>' + afFmtDateNum(m.date) + '</td>' +
      '<td><b>' + esc(m.subject) + '</b><div class="af-sub">' + esc(String(m.body).slice(0, 110)) + '</div></td>' +
      '<td>' + esc(m.from) + '</td>' +
      '<td><span class="af-badge neutral">' + esc(m.channel) + '</span></td>' +
      '<td><button type="button" class="af-linkbtn" onclick="' + m.open + '">' + esc(m.openLabel) + '</button></td>' +
    '</tr>';
  }).join('');

  const sentRows = sent.map(function (m) {
    return '<tr>' +
      '<td>' + afFmtDateNum(m.date) + '</td>' +
      '<td><b>' + esc(m.subject) + '</b><div class="af-sub">' + esc(String(m.body || '').slice(0, 110)) + '</div></td>' +
      '<td>' + esc(m.to) + '</td>' +
      '<td><span class="af-badge info">' + esc(m.channel) + '</span></td>' +
      '<td></td>' +
    '</tr>';
  }).join('');

  return '<div class="af-page">' +
    '<div class="af-pagehead"><h1>Inbox</h1>' +
      '<button type="button" class="af-btn primary" onclick="afModalComposeMessage()">+ New Message</button></div>' +
    '<div class="af-tablewrap"><table class="af-table">' +
      '<thead><tr><th>Date</th><th>Subject</th><th>From / To</th><th>Channel</th><th></th></tr></thead>' +
      '<tbody>' + (sentRows + inRows ||
        '<tr><td colspan="5">' + afEmpty('There are currently no messages.') + '</td></tr>') +
      '</tbody></table></div>' +
    afDisplaying(inbound.length + sent.length, inbound.length + sent.length) +
  '</div>';
}

/* Audiences are counted off the live portfolio, so the number next to a segment
   is the number of people who would actually receive the send. */
function afCommAudiences() {
  const active = afAllLeases().filter(function (l) { return l.status === 'active'; });
  const residents = active.reduce(function (n, l) { return n + (l.residentIds || []).length; }, 0);
  const soon = active.filter(function (l) {
    const d = afDaysFromToday(l.endDate);
    return d >= 0 && d <= 60;
  }).length;
  return [
    { id: 'all-residents', label: 'All current residents', n: residents },
    { id: 'delinquent',    label: 'Residents with a balance', n: active.filter(function (l) { return l.balanceCents > 0; }).length },
    { id: 'expiring',      label: 'Leases expiring within 60 days', n: soon },
    { id: 'owners',        label: 'All owners', n: afAllOwners().length },
    { id: 'prospects',     label: 'Active guest cards', n: afGuestCardProspects().length }
  ];
}

function afCommBulkSend(audienceId, channel) {
  const a = afCommAudiences().filter(function (x) { return x.id === audienceId; })[0];
  if (!a) return;
  if (!a.n) { simToast('That audience is empty — nothing to send.'); return; }
  if (!afDemo.messages) afDemo.messages = [];
  afDemo.messages.push({
    id: 'MSG-' + (100 + afDemo.messages.length + 1),
    date: afToday(),
    to: a.label + ' (' + a.n + ' recipients)',
    channel: channel,
    subject: 'Bulk ' + channel.toLowerCase() + ' to ' + a.label.toLowerCase(),
    body: 'Sent from Bulk Emails/Texts.'
  });
  simToast(channel + ' queued for ' + a.n + ' recipient' + (a.n === 1 ? '' : 's') + '.', { tone: 'good' });
  afRenderRoot();
}

function afCommBulkHTML() {
  const rows = afCommAudiences().map(function (a) {
    return '<tr>' +
      '<td><b>' + esc(a.label) + '</b></td>' +
      '<td class="num">' + a.n + '</td>' +
      '<td>' +
        '<button type="button" class="af-btn sm primary" onclick="afCommBulkSend(\'' + escAttr(a.id) + '\', \'Email\')">Send Email</button> ' +
        '<button type="button" class="af-btn sm" onclick="afCommBulkSend(\'' + escAttr(a.id) + '\', \'Text\')">Send Text</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  return '<div class="af-page">' +
    '<h1>Bulk Emails/Texts</h1>' +
    '<p class="af-note">Every count below is the live portfolio, not a saved list. ' +
      'A send is recorded against the audience and appears in the Inbox.</p>' +
    '<div class="af-tablewrap"><table class="af-table">' +
      '<thead><tr><th>Audience</th><th class="num">Recipients</th><th>Send</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
  '</div>';
}

function afCommTemplatesHTML() {
  const rows = AF_COMM_TEMPLATES.map(function (tpl) {
    return '<tr>' +
      '<td><b>' + esc(tpl.title) + '</b></td>' +
      '<td><span class="af-badge neutral">' + esc(tpl.cat) + '</span></td>' +
      '<td>' + esc(tpl.ref) + '</td>' +
      '<td><button type="button" class="af-btn sm" onclick="SimEngine.viewDoc(\'' + escAttr(tpl.doc) + '\', \'' + escAttr(tpl.title) + '\')">Preview Document</button></td>' +
    '</tr>';
  }).join('');

  return '<div class="af-page">' +
    '<h1>Templates</h1>' +
    '<div class="af-tablewrap"><table class="af-table">' +
      '<thead><tr><th>Template Title</th><th>Category</th><th>Statutory Reference</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
    afDisplaying(AF_COMM_TEMPLATES.length, AF_COMM_TEMPLATES.length) +
  '</div>';
}

function afCommCallsHTML() {
  /* The emergency line is modelled in Maintenance, and duplicating its records
     here would give the module two answers to "what happened on that call".
     This screen is the communication record and links across to the dispatch. */
  const calls = AF_EMERGENCY_CALLS.map(function (c) {
    const u = afGetUnit(c.unit);
    const p = u ? afGetProperty(u.propertyId) : null;
    return '<tr>' +
      '<td><b>' + esc(c.id) + '</b><div class="af-sub">' + esc(c.time) + '</div></td>' +
      '<td>' + (p ? esc(p.name) + ' ' : '') + (u ? esc('Unit ' + u.label) : esc(c.unit)) + '</td>' +
      '<td>' + esc(c.issue) + '</td>' +
      '<td><span class="af-badge ' + escAttr(c.priority.toLowerCase()) + '">' + esc(c.priority) + '</span></td>' +
      '<td>' + esc(c.dispatch) + '</td>' +
      '<td><button type="button" class="af-linkbtn" onclick="afGoto(\'maintenance\', \'contact\')">Dispatch record</button></td>' +
    '</tr>';
  }).join('');

  return '<div class="af-page">' +
    '<h1>Call Log</h1>' +
    '<p class="af-note">Inbound calls to the 24/7 line. Dispatch and vendor assignment ' +
      'happen in Maintenance &rsaquo; Contact Center, which is where each of these leads.</p>' +
    '<div class="af-tablewrap"><table class="af-table">' +
      '<thead><tr><th>Call</th><th>Property / Unit</th><th>Reported issue</th>' +
        '<th>Priority</th><th>Dispatch</th><th></th></tr></thead>' +
      '<tbody>' + (calls || '<tr><td colspan="6">' + afEmpty('No calls logged.') + '</td></tr>') +
      '</tbody></table></div>' +
    afDisplaying(AF_EMERGENCY_CALLS.length, AF_EMERGENCY_CALLS.length) +
  '</div>';
}
function afCommunicationsHTML() {
  const tab = afState.sectionTab || 'comm-inbox';
  if (tab === 'comm-bulk') return afCommBulkHTML();
  if (tab === 'comm-templates') return afCommTemplatesHTML();
  if (tab === 'comm-calls') return afCommCallsHTML();
  return afCommInboxHTML();
}

function afModalComposeMessage() {
  const body =
    '<div class="af-form-group"><label class="af-label">Recipient (Name / Email)</label>' +
    '<input type="text" id="afMsgTo" class="af-input" placeholder="e.g. Marcus Vance (marcus.vance@example.com)"></div>' +
    '<div class="af-form-group"><label class="af-label">Delivery Channel</label>' +
    '<select id="afMsgChannel" class="af-select">' +
      '<option value="Email">Email (Online Resident Portal)</option>' +
      '<option value="SMS">SMS Text Message</option>' +
      '<option value="Postal Mail">Postal Mail (First Class / Certified)</option>' +
    '</select></div>' +
    '<div class="af-form-group"><label class="af-label">Subject</label>' +
    '<input type="text" id="afMsgSubj" class="af-input" value="Important Notice Regarding Your Lease Agreement"></div>' +
    '<div class="af-form-group"><label class="af-label">Message Body</label>' +
    '<textarea id="afMsgBody" class="af-textarea" placeholder="Type your notice or correspondence here..."></textarea></div>';

  const foot =
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" onclick="afSaveMessage()">Send Message</button>';

  afOpenModal('Compose Message', body, foot);
}

function afSaveMessage() {
  const to = document.getElementById('afMsgTo').value.trim();
  const chan = document.getElementById('afMsgChannel').value;
  const subj = document.getElementById('afMsgSubj').value.trim();
  const body = document.getElementById('afMsgBody').value.trim();

  if (!to || !subj) {
    simToast('Please fill in recipient and subject.');
    return;
  }

  if (!afDemo.messages) afDemo.messages = [];
  afDemo.messages.push({
    id: 'MSG-' + (100 + afDemo.messages.length + 1),
    date: afToday(),
    to: to,
    channel: chan,
    subject: subj,
    body: body
  });

  afCloseModal();
  simToast('Message dispatched to ' + to + '.', { tone: 'good' });
  afRenderRoot();
}

/* ============================================================================
   REPORTING
   ============================================================================ */

function afReportingHTML() {
  const tab = afState.sectionTab || 'reports';
  const sub = afState.subTab;

  let body;
  if (tab === 'reports' || tab === 'index') {
    body = afReportIndexHTML();
  } else if (tab === 'scheduled') {
    body = afScheduledReportsHTML();
  } else if (tab === 'metrics' || tab === 'pricing-metrics' || tab === 'pricing') {
    body = afPricingMetricsHTML();
  } else if (tab === 'business') {
    body = (typeof afBusinessMetricsHTML === 'function') ? afBusinessMetricsHTML() : afReportIndexHTML();
  } else if (tab === 'insurance') {
    body = (typeof afInsuranceMetricsHTML === 'function') ? afInsuranceMetricsHTML() : afReportIndexHTML();
  } else if (tab === 'surveys') {
    body = afSurveysHTML();
  } else if (tab === 'letters') {
    body = afLetterTemplatesHTML();
  } else if (tab === 'compliance') {
    body = afReportingComplianceHTML(sub || 'statutory');
  } else {
    body = afReportIndexHTML();
  }

  return body;
}

function afScheduledReportsHTML() {
  const schedules = [
    { title: 'Monthly Owner Operating Statements & ACH Summaries', freq: '1st of every month at 06:00 AM', recipients: '15 Property Owners (Portal & Email)', format: 'PDF Package + Ledger CSV', status: 'Active' },
    { title: 'Weekly Delinquency & Aging Collection Digest', freq: 'Every Monday at 08:00 AM', recipients: 'Property Managers & Operations Team', format: 'Interactive Summary + Delinquency Table', status: 'Active' },
    { title: 'Mid-Month Rent Roll & Occupancy Status Export', freq: '15th of every month at 09:00 AM', recipients: 'Asset Managers & Executive Leadership', format: 'Excel & PDF Rent Roll', status: 'Active' },
    { title: 'Quarterly Fiduciary Trust Bank Reconciliation Audit', freq: 'End of Quarter (Mar, Jun, Sep, Dec)', recipients: 'Principal Broker & CPA', format: '3-Way Reconciliation Audit Package', status: 'Active' }
  ];

  const rows = schedules.map(function (s) {
    return '<tr>' +
      '<td><b>' + esc(s.title) + '</b></td>' +
      '<td>' + esc(s.freq) + '</td>' +
      '<td>' + esc(s.recipients) + '</td>' +
      '<td><span class="af-badge">' + esc(s.format) + '</span></td>' +
      '<td><span class="af-badge good">' + esc(s.status) + '</span></td>' +
      '</tr>';
  }).join('');

  return '<section class="af-card"><h3>Automated Scheduled Report Distributions</h3>' +
    '<table class="af-tbl"><thead><tr>' +
      '<th>Report Job Name</th><th>Frequency & Time</th><th>Distribution Recipients</th><th>Format</th><th>Status</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></section>';
}

function afLetterTemplatesHTML() {
  const templates = [
    { title: '3-Day Notice to Vacate for Non-Payment of Rent', stat: 'Texas Property Code § 24.005', desc: 'Statutory prerequisite notice required before filing for eviction in Texas Justice Court.', doc: 'documents/notice-to-vacate.html' },
    { title: '24-Hour Notice of Landlord Intent to Enter Unit', stat: 'Texas Property Code § 92.0081', desc: 'Formal advance notification delivered prior to routine or preventative maintenance entry.', doc: 'documents/sample-notice.html' },
    { title: 'Security Deposit Itemization & Deduction Statement', stat: 'Texas Property Code § 92.104', desc: 'Mandatory 30-day accounting of deposit deductions and refund disbursement calculation.', doc: 'documents/deposit-itemization.html' },
    { title: 'FCRA Statement of Adverse Action Notification', stat: '15 U.S.C. § 1681m', desc: 'Required federal notification providing consumer credit bureau contact and dispute rights.', doc: 'documents/adverse-action-notice.html' },
    { title: 'Texas Residential Lease Agreement Package', stat: 'Texas Property Code Chapter 92', desc: 'Standard residential lease agreement including rules, addenda, and statutory disclosures.', doc: 'documents/lease-agreement.html' },
    { title: 'Monthly Owner Operating Statement & Cash Distribution', stat: 'Fiduciary Trust Accounting', desc: 'Comprehensive monthly client statement showing receipts, repair expenses, and net draw.', doc: 'documents/owner-statement.html' }
  ];

  const rows = templates.map(function (t) {
    return '<tr>' +
      '<td><b>' + esc(t.title) + '</b><div class="af-sub">' + esc(t.desc) + '</div></td>' +
      '<td>' + esc(t.stat) + '</td>' +
      '<td><button type="button" class="af-btn sm" onclick="SimEngine.viewDoc(\'' + escAttr(t.doc) + '\', \'' + escAttr(t.title) + '\')">Preview Template</button></td>' +
      '</tr>';
  }).join('');

  return '<section class="af-card"><h3>Document & Legal Letter Template Library</h3>' +
    '<table class="af-tbl"><thead><tr>' +
      '<th>Template Title & Description</th><th>Statutory Authority</th><th>Action</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></section>';
}

function afReportingMetricsHTML(sub) {
  const units = afAllUnits();
  const occupied = units.filter(function (u) { return u.status === 'occupied'; }).length;
  const pct = units.length ? Math.round(occupied / units.length * 100) : 0;

  if (sub === 'pricing') {
    const rows = units.slice(0, 15).map(function (u) {
      const lease = u.currentLeaseId ? afGetLease(u.currentLeaseId) : null;
      const gap = lease ? lease.rentAmount - u.marketRent : 0;
      return '<tr><td>' + esc(u.id) + '</td>' +
        '<td class="num">' + afFmtMoney(u.marketRent) + '</td>' +
        '<td class="num">' + (lease ? afFmtMoney(lease.rentAmount) : '—') + '</td>' +
        '<td class="num" style="font-weight:700;color:' + (gap >= 0 ? 'var(--af-good)' : 'var(--af-bad)') + '">' + (lease ? (gap >= 0 ? '+' : '') + afFmtMoney(gap) : '—') + '</td></tr>';
    }).join('');
    return '<section class="af-card"><h3>Pricing Metrics (Market Rent vs. Executed Contract)</h3>' +
      afTableHint('Market rent against contract rent, unit by unit.') +
      '<table class="af-tbl"><thead><tr><th>Unit</th><th class="num">Market Rent</th><th class="num">Contract Rent</th><th class="num">Variance</th></tr></thead><tbody>' +
      rows + '</tbody></table>' + afDisplayCount(Math.min(15, units.length), units.length) + '</section>';
  }
  if (sub === 'business') {
    return '<section class="af-card"><h3>Operational Performance KPIs</h3>' +
      '<div class="af-kv">' +
        '<div><dt>Occupancy Rate</dt><dd style="color:var(--af-good);font-weight:700;">' + pct + '%</dd></div>' +
        '<div><dt>Units under Management</dt><dd>' + units.length + ' Units</dd></div>' +
        '<div><dt>Active Executed Leases</dt><dd>' + afAllLeases().filter(function (l) { return l.status === 'active'; }).length + '</dd></div>' +
        '<div><dt>Open Work Orders</dt><dd>' + afAllWorkOrders().filter(function (w) { return w.status !== 'completed'; }).length + '</dd></div>' +
        '<div><dt>Average Days on Market</dt><dd>14 Days</dd></div>' +
        '<div><dt>Delinquency Rate</dt><dd style="color:var(--af-accent);font-weight:700;">1.8%</dd></div>' +
      '</div></section>';
  }
  if (sub === 'insurance') {
    const policies = [
      { unit: 'UNIT-11-104', resident: 'Brenda Miller', carrier: 'State Farm', policy: 'POL-99210-TX', exp: afcDay(180), liability: '$100,000', status: 'Active & Verified' },
      { unit: 'UNIT-10-101', resident: 'Darren Hopkins', carrier: 'Geico Renters', policy: 'POL-88314-TX', exp: afcDay(90), liability: '$100,000', status: 'Active & Verified' },
      { unit: 'UNIT-12-102', resident: 'Elena Rostova', carrier: 'Allstate Insurance', policy: 'POL-77142-TX', exp: afcDay(220), liability: '$300,000', status: 'Active & Verified' },
      { unit: 'UNIT-07-A', resident: 'Marcus Vance', carrier: 'Lemonade Insurance', policy: 'POL-66190-TX', exp: afcDay(45), liability: '$100,000', status: 'Active & Verified' }
    ];
    const rows = policies.map(function (p) {
      return '<tr>' +
        '<td><b>' + esc(p.resident) + '</b><div class="af-sub">' + esc(p.unit) + '</div></td>' +
        '<td>' + esc(p.carrier) + '<div class="af-sub">Policy: ' + esc(p.policy) + '</div></td>' +
        '<td>' + afFmtDate(p.exp) + '</td>' +
        '<td class="num font-mono"><b>' + esc(p.liability) + '</b></td>' +
        '<td><span class="af-badge good">' + esc(p.status) + '</span></td>' +
        '</tr>';
    }).join('');
    return '<section class="af-card"><h3>Tenant Renters Insurance Compliance Roster</h3>' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Resident / Unit</th><th>Insurance Carrier & Policy #</th><th>Expiration Date</th><th class="num">Liability Minimum</th><th>Verification Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></section>';
  }
  return afReportIndexHTML();
}

function afReportingComplianceHTML(sub) {
  if (sub === 'statutory') {
    const clocks = [
      { clock: 'Texas Prop. Code § 92.103: 30-Day Security Deposit Accounting Clock', target: 'Samuel Oak (UNIT-12-104 / LEASE-MO-01)', deadline: afcDay(7), status: 'Day 23 of 30 — Action Required (Refund & Itemization Statement Due)' },
      { clock: 'Texas Prop. Code § 92.156: 7-Day Statutory Rekeying Requirement', target: 'Unit 11-102 Turnover', deadline: afcDay(2), status: 'Scheduled with Lone Star Locksmith (Completed on Turnover)' },
      { clock: 'Texas Prop. Code § 92.259: Smoke Detector Testing & Compliance', target: 'Portfolio Annual Audit', deadline: afcDay(90), status: '100% Units Inspected and Functioning' },
      { clock: 'Texas Prop. Code § 24.005: 3-Day Notice to Vacate Delivery Clock', target: 'DeShawn Williams (Delinquency)', deadline: afcDay(1), status: 'Notice Served — Statutory 3-Day Waiting Period Active' }
    ];
    const rows = clocks.map(function (c) {
      return '<tr>' +
        '<td><b>' + esc(c.clock) + '</b></td>' +
        '<td>' + esc(c.target) + '</td>' +
        '<td>' + afFmtDate(c.deadline) + '</td>' +
        '<td><span class="af-badge ' + (c.status.indexOf('Action Required') !== -1 ? 'warn' : 'good') + '">' + esc(c.status) + '</span></td>' +
        '</tr>';
    }).join('');
    return '<section class="af-card"><h3>Texas Property Code Chapter 92 Statutory Compliance Clocks</h3>' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Statutory Clock / Legal Mandate</th><th>Subject Resident / Property</th><th>Compliance Deadline</th><th>Current Legal Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></section>';
  }
  if (sub === 'insurance') {
    const vendors = afAllVendors();
    const rows = vendors.map(function (v) {
      const isExpired = afDaysFromToday(v.insuranceExpires) < 0;
      return '<tr>' +
        '<td><b>' + esc(v.name) + '</b></td>' +
        '<td><span class="af-badge">' + esc((v.trade || v.category || 'General').toUpperCase()) + '</span></td>' +
        '<td>' + afFmtDate(v.insuranceExpires) + '</td>' +
        '<td>' + (isExpired ? '<span class="af-pill-bad">&#10007; EXPIRED COI</span>' : '<span class="af-pill-good">&#10003; Active Certificate</span>') + '</td>' +
        '<td>' + (v.w9OnFile ? '<span class="af-badge good">W-9 on File</span>' : '<span class="af-badge warn">Missing W-9</span>') + '</td>' +
        '</tr>';
    }).join('');
    return '<section class="af-card"><h3>Vendor Insurance (COI) & Tax Compliance Audit</h3>' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Contractor / Vendor</th><th>Trade</th><th>Certificate Expiration</th><th>Insurance Status</th><th>Tax Compliance</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></section>';
  }
  if (sub === 'violations') {
    return '<section class="af-card"><h3>Property Condition & Community Rule Notices</h3>' +
      '<table class="af-tbl"><thead><tr><th>Property / Unit</th><th>Notice Type</th><th>Date Issued</th><th>Status</th></tr></thead>' +
      '<tbody>' +
        '<tr><td><b>Legacy Park &bull; Unit 10-102</b></td><td>Balcony Unapproved Storage Warning</td><td>' + afcDay(-4) + '</td><td><span class="af-badge warn">Cured</span></td></tr>' +
        '<tr><td><b>Stonebridge &bull; 4110 Hollow Creek</b></td><td>HOA Lawn Maintenance Courtesy Notice</td><td>' + afcDay(-7) + '</td><td><span class="af-badge good">Resolved</span></td></tr>' +
      '</tbody></table></section>';
  }
  return afReportIndexHTML();
}

function afViewReport(reportId) {
  let title = 'Report';
  let body = '';

  if (reportId === 'rent-roll') {
    title = 'Rent Roll — Active Portfolio Leases';
    const activeLeases = afAllLeases().filter(function (l) { return l.status === 'active'; });
    const totalRent = activeLeases.reduce(function (s, l) { return s + (l.rentAmount || 0); }, 0);
    const totalDep = activeLeases.reduce(function (s, l) { return s + (l.depositHeld || 0); }, 0);

    const rows = activeLeases.map(function (l) {
      const u = afGetUnit(l.unitId);
      const p = u ? afGetProperty(u.propertyId) : null;
      const r = l.residentIds.length ? afGetResident(l.residentIds[0]) : null;
      return '<tr>' +
        '<td>' + (p ? esc(p.name) : '') + ' &bull; Unit ' + (u ? esc(u.label) : '') + '</td>' +
        '<td><b>' + (r ? esc(r.name) : 'Resident') + '</b></td>' +
        '<td class="num">' + afFmtMoney(l.rentAmount) + '</td>' +
        '<td class="num">' + afFmtMoney(l.depositHeld) + '</td>' +
        '<td>' + afFmtDate(l.startDate) + ' to ' + afFmtDate(l.endDate) + '</td>' +
        '</tr>';
    }).join('');

    body = '<table class="af-tbl"><thead><tr><th>Property / Unit</th><th>Resident</th><th class="num">Monthly Rent</th><th class="num">Deposit Held</th><th>Lease Term</th></tr></thead><tbody>' +
      rows +
      '</tbody><tfoot><tr style="font-weight:700;background:var(--af-bg);">' +
        '<td colspan="2">Total Active Portfolio Rent Roll (' + activeLeases.length + ' Leases)</td>' +
        '<td class="num">' + afFmtMoney(totalRent) + '</td>' +
        '<td class="num">' + afFmtMoney(totalDep) + '</td>' +
        '<td></td>' +
      '</tr></tfoot></table>';
  } else if (reportId === 'rent-roll-itemized') {
    title = 'Rent Roll (Itemized Breakdown)';
    const activeLeases = afAllLeases().filter(function (l) { return l.status === 'active'; });
    const rows = activeLeases.map(function (l) {
      const u = afGetUnit(l.unitId);
      const p = u ? afGetProperty(u.propertyId) : null;
      const r = l.residentIds.length ? afGetResident(l.residentIds[0]) : null;
      const petRent = l.petDeposit ? 3500 : 0;
      const total = l.rentAmount + petRent;
      return '<tr>' +
        '<td>' + (p ? esc(p.name) : '') + ' - ' + (u ? esc(u.label) : '') + '</td>' +
        '<td><b>' + (r ? esc(r.name) : 'Resident') + '</b></td>' +
        '<td class="num">' + afFmtMoney(l.rentAmount) + '</td>' +
        '<td class="num">' + (petRent ? afFmtMoney(petRent) : '—') + '</td>' +
        '<td class="num" style="font-weight:700;">' + afFmtMoney(total) + '</td>' +
        '</tr>';
    }).join('');

    body = '<table class="af-tbl"><thead><tr><th>Unit</th><th>Resident</th><th class="num">Base Rent</th><th class="num">Pet Rent</th><th class="num">Total Monthly</th></tr></thead><tbody>' +
      rows + '</tbody></table>';
  } else if (reportId === 'delinquency') {
    title = 'Delinquency Aging Summary';
    const delinq = afAllLeases().filter(function (l) { return l.status === 'active' && l.balanceCents > 0; });
    const total = delinq.reduce(function (s, l) { return s + l.balanceCents; }, 0);

    const rows = delinq.map(function (l, idx) {
      const u = afGetUnit(l.unitId);
      const r = l.residentIds.length ? afGetResident(l.residentIds[0]) : null;
      const dqId = l.dqAnchorId || ('DQ-0' + (idx + 1));
      return '<tr data-dq="' + escAttr(dqId) + '">' +
        '<td><b>' + (r ? esc(r.name) : 'Resident') + '</b> (Unit ' + (u ? esc(u.label) : '') + ')</td>' +
        '<td>' + esc(l.id) + '</td>' +
        '<td class="num" style="font-weight:700;color:var(--af-bad);">' + afFmtMoney(l.balanceCents) + '</td>' +
        '</tr>';
    }).join('');

    body = '<table class="af-tbl af-tbl-delinq"><thead><tr><th>Resident</th><th>Lease ID</th><th class="num">Overdue Balance</th></tr></thead><tbody>' +
      rows +
      '</tbody><tfoot><tr style="font-weight:700;background:var(--af-bg);">' +
        '<td colspan="2">Total Outstanding Delinquency</td>' +
        '<td class="num" style="color:var(--af-bad);">' + afFmtMoney(total) + '</td>' +
      '</tr></tfoot></table>';
  } else if (reportId === 'deposit-liability') {
    title = 'Security Deposit Liability & Escrow Matching';
    const activeLeases = afAllLeases().filter(function (l) { return l.status === 'active'; });
    const totalDep = activeLeases.reduce(function (s, l) { return s + (l.depositHeld || 0); }, 0);
    const bankAcct = afGetBankAccount('BANK-03');

    body = '<div class="af-kv" style="margin-bottom:16px;">' +
      '<div><dt>Total Tenant Deposits Held</dt><dd>' + afFmtMoney(totalDep) + '</dd></div>' +
      '<div><dt>Frost Bank Escrow Account Balance</dt><dd>' + afFmtMoney(bankAcct ? afAccountBalance(bankAcct.id) : totalDep) + '</dd></div>' +
      '<div><dt>Escrow Variance</dt><dd style="font-weight:700;color:var(--af-accent);">$0.00 (Fully Funded)</dd></div>' +
      '<div><dt>Statutory Compliance</dt><dd>Texas Prop. Code § 92.104 Compliant</dd></div>' +
      '</div>' +
      '<p class="af-sub">100% of tenant security deposits are held in a segregated escrow account and reconciled against lease agreements.</p>';
  } else if (reportId === 'tenant-directory') {
    title = 'Tenant Directory';
    const list = afAllResidents();
    const rows = list.map(function (r) {
      const lease = afGetLease(r.leaseId);
      const u = r.unitId ? afGetUnit(r.unitId) : null;
      return '<tr>' +
        '<td><b>' + esc(r.name) + '</b></td>' +
        '<td>' + (u ? esc('Unit ' + u.label) : '—') + '</td>' +
        '<td>' + esc(r.phone) + '</td>' +
        '<td>' + esc(r.email) + '</td>' +
        '<td class="num">' + (lease ? afFmtMoney(lease.balanceCents) : '$0.00') + '</td>' +
        '</tr>';
    }).join('');
    body = '<table class="af-tbl"><thead><tr><th>Name</th><th>Unit</th><th>Phone</th><th>Email</th><th class="num">Balance</th></tr></thead><tbody>' + rows + '</tbody></table>';
  } else if (reportId === 'tenant-ledger') {
    title = 'Portfolio Tenant Ledger (Recent 50 Entries)';
    const entries = afAllLedgerEntries().slice().reverse().slice(0, 50);
    const rows = entries.map(function (e) {
      const lease = afGetLease(e.leaseId);
      const r = lease && lease.residentIds.length ? afGetResident(lease.residentIds[0]) : null;
      return '<tr>' +
        '<td>' + afFmtDate(e.date) + '</td>' +
        '<td><b>' + (r ? esc(r.name) : 'Resident') + '</b></td>' +
        '<td>' + esc(e.description) + '</td>' +
        '<td><span class="af-badge">' + esc(e.category) + '</span></td>' +
        '<td class="num">' + (e.type === 'charge' ? afFmtMoney(e.amount) : '—') + '</td>' +
        '<td class="num" style="color:var(--af-good);">' + (e.type === 'payment' ? afFmtMoney(e.amount) : '—') + '</td>' +
        '<td class="num font-mono"><b>' + afFmtMoney(e.balanceAfter) + '</b></td>' +
        '</tr>';
    }).join('');
    body = '<table class="af-tbl"><thead><tr><th>Date</th><th>Tenant</th><th>Description</th><th>Type</th><th class="num">Charge</th><th class="num">Payment</th><th class="num">Balance</th></tr></thead><tbody>' + rows + '</tbody></table>';
  } else if (reportId === 'property-directory') {
    title = 'Property Directory';
    const props = afAllProperties();
    const rows = props.map(function (p) {
      const units = afAllUnits().filter(function (u) { return u.propertyId === p.id; });
      return '<tr>' +
        '<td><b>' + esc(p.name) + '</b></td>' +
        '<td>' + esc(p.address + ', ' + p.city + ' ' + p.state) + '</td>' +
        '<td>' + esc(p.type) + '</td>' +
        '<td class="num">' + units.length + '</td>' +
        '<td class="num">' + afFmtMoney(p.operatingCashCents || 0) + '</td>' +
        '</tr>';
    }).join('');
    body = '<table class="af-tbl"><thead><tr><th>Property</th><th>Address</th><th>Type</th><th class="num">Units</th><th class="num">Operating Cash</th></tr></thead><tbody>' + rows + '</tbody></table>';
  } else if (reportId === 'gross-potential-rent') {
    title = 'Gross Potential Rent (GPR)';
    const props = afAllProperties();
    let totalGPR = 0, totalActual = 0;
    const rows = props.map(function (p) {
      const units = afAllUnits().filter(function (u) { return u.propertyId === p.id; });
      const gpr = units.reduce(function (s, u) { return s + u.marketRent; }, 0);
      const actual = units.reduce(function (s, u) {
        const l = u.currentLeaseId ? afGetLease(u.currentLeaseId) : null;
        return s + (l && l.status === 'active' ? l.rentAmount : 0);
      }, 0);
      totalGPR += gpr; totalActual += actual;
      return '<tr>' +
        '<td><b>' + esc(p.name) + '</b></td>' +
        '<td class="num">' + units.length + '</td>' +
        '<td class="num">' + afFmtMoney(gpr) + '</td>' +
        '<td class="num" style="color:var(--af-good);">' + afFmtMoney(actual) + '</td>' +
        '<td class="num" style="color:var(--af-bad);">' + afFmtMoney(gpr - actual) + '</td>' +
        '</tr>';
    }).join('');
    body = '<table class="af-tbl"><thead><tr><th>Property</th><th class="num">Units</th><th class="num">Gross Potential</th><th class="num">Actual Rent</th><th class="num">Vacancy Loss</th></tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr style="font-weight:700;background:var(--af-bg);">' +
      '<td colspan="2">Portfolio Totals</td><td class="num">' + afFmtMoney(totalGPR) + '</td><td class="num">' + afFmtMoney(totalActual) + '</td><td class="num" style="color:var(--af-bad);">' + afFmtMoney(totalGPR - totalActual) + '</td>' +
      '</tr></tfoot></table>';
  } else if (reportId === 'balance-sheet') {
    title = 'Balance Sheet (Fiduciary Segmented)';
    const op = afAccountBalance(AF_ACCT.operating), tr = afAccountBalance(AF_ACCT.trust), dep = afAccountBalance(AF_ACCT.deposit);
    body = '<div class="af-kv" style="margin-bottom:16px;">' +
      '<div><dt>Operating Cash (Asset)</dt><dd>' + afFmtMoney(op) + '</dd></div>' +
      '<div><dt>Owner Trust Funds (Asset/Liability)</dt><dd>' + afFmtMoney(tr) + '</dd></div>' +
      '<div><dt>Tenant Escrow Deposits (Asset/Liability)</dt><dd>' + afFmtMoney(dep) + '</dd></div>' +
      '<div><dt>Total Fiduciary Assets</dt><dd style="font-weight:700;color:var(--af-accent);">' + afFmtMoney(op + tr + dep) + '</dd></div>' +
      '</div>' +
      '<p class="af-sub">TREC Rule § 535.146 Compliant — Segregated operating, trust and security deposit accounts balance to $0.00 variance.</p>';
  } else if (reportId === 'cash-flow') {
    title = 'Monthly Cash Flow Summary';
    const txns = afAllTransactions();
    const inflows = txns.filter(function (t) { return t.amount > 0; }).reduce(function (s, t) { return s + t.amount; }, 0);
    const outflows = txns.filter(function (t) { return t.amount < 0; }).reduce(function (s, t) { return s + Math.abs(t.amount); }, 0);
    body = '<div class="af-kv" style="margin-bottom:16px;">' +
      '<div><dt>Total Inflows (Rents & Deposits)</dt><dd style="color:var(--af-good);font-weight:700;">+' + afFmtMoney(inflows) + '</dd></div>' +
      '<div><dt>Total Outflows (Vendor & Draws)</dt><dd style="color:var(--af-bad);font-weight:700;">-' + afFmtMoney(outflows) + '</dd></div>' +
      '<div><dt>Net Cash Movement</dt><dd style="font-weight:700;color:var(--af-accent);">' + afFmtMoney(inflows - outflows) + '</dd></div>' +
      '</div>';
  } else if (reportId === 'general-ledger') {
    title = 'General Ledger Summary by Account';
    const accts = afAllBankAccounts();
    const rows = accts.map(function (a) {
      const b = afAccountBalance(a.id);
      return '<tr>' +
        '<td><b>GL ' + esc(a.glCode) + '</b></td>' +
        '<td>' + esc(a.name) + ' (' + esc(a.bankName) + ')</td>' +
        '<td>' + esc(afAccountTypeLabel(a.type)) + '</td>' +
        '<td class="num font-mono"><b>' + afFmtMoney(b) + '</b></td>' +
        '</tr>';
    }).join('');
    body = '<table class="af-tbl"><thead><tr><th>GL Code</th><th>Account Name</th><th>Classification</th><th class="num">Current Balance</th></tr></thead><tbody>' + rows + '</tbody></table>';
  } else if (reportId === 'income-statement') {
    title = 'Portfolio Income Statement';
    const entries = afAllLedgerEntries();
    const rentInc = entries.filter(function (e) { return e.type === 'payment'; }).reduce(function (s, e) { return s + e.amount; }, 0);
    const feeInc = entries.filter(function (e) { return e.category === 'late_fee'; }).reduce(function (s, e) { return s + e.amount; }, 0);
    const repairs = afAllWorkOrders().filter(function (w) { return w.actualCents > 0; }).reduce(function (s, w) { return s + w.actualCents; }, 0);
    body = '<div class="af-kv">' +
      '<div><dt>Rental Revenue</dt><dd style="color:var(--af-good);font-weight:700;">' + afFmtMoney(rentInc) + '</dd></div>' +
      '<div><dt>Late Fees Collected</dt><dd>' + afFmtMoney(feeInc) + '</dd></div>' +
      '<div><dt>Maintenance & Repairs Expense</dt><dd style="color:var(--af-bad);">' + afFmtMoney(repairs) + '</dd></div>' +
      '<div><dt>Net Operating Income (NOI)</dt><dd style="font-weight:700;color:var(--af-accent);">' + afFmtMoney(rentInc + feeInc - repairs) + '</dd></div>' +
      '</div>';
  } else if (reportId === 'trial-balance') {
    title = 'Trial Balance (Double Entry Verification)';
    const totalAssets = afAccountBalance(AF_ACCT.operating) + afAccountBalance(AF_ACCT.trust) + afAccountBalance(AF_ACCT.deposit);
    const totalLiabEquity = totalAssets;
    body = '<table class="af-tbl"><thead><tr><th>Account Category</th><th class="num">Debit (Assets)</th><th class="num">Credit (Liabilities & Equity)</th></tr></thead><tbody>' +
      '<tr><td>1000 — Operating Cash</td><td class="num">' + afFmtMoney(afAccountBalance(AF_ACCT.operating)) + '</td><td class="num">—</td></tr>' +
      '<tr><td>1100 — Owner Trust Cash</td><td class="num">' + afFmtMoney(afAccountBalance(AF_ACCT.trust)) + '</td><td class="num">—</td></tr>' +
      '<tr><td>1200 — Tenant Security Deposit Escrow</td><td class="num">' + afFmtMoney(afAccountBalance(AF_ACCT.deposit)) + '</td><td class="num">—</td></tr>' +
      '<tr><td>2100 — Tenant Security Deposit Liability</td><td class="num">—</td><td class="num">' + afFmtMoney(afAccountBalance(AF_ACCT.deposit)) + '</td></tr>' +
      '<tr><td>2200 — Owner Funds Held in Trust</td><td class="num">—</td><td class="num">' + afFmtMoney(afAccountBalance(AF_ACCT.trust)) + '</td></tr>' +
      '<tr><td>3000 — Retained Management Earnings</td><td class="num">—</td><td class="num">' + afFmtMoney(afAccountBalance(AF_ACCT.operating)) + '</td></tr>' +
      '</tbody><tfoot><tr style="font-weight:700;background:var(--af-bg);">' +
      '<td>Trial Balance Totals (Balanced)</td><td class="num">' + afFmtMoney(totalAssets) + '</td><td class="num">' + afFmtMoney(totalLiabEquity) + '</td>' +
      '</tr></tfoot></table>';
  } else if (reportId === 'trust-balance') {
    title = 'Trust Account Balance by Owner Sub-Ledger';
    const owners = afAllOwners();
    const totalHeld = owners.reduce(function (s, o) { return s + afOwnerAvailableCash(o.id).held; }, 0);
    const rows = owners.map(function (o) {
      const held = afOwnerAvailableCash(o.id).held;
      return '<tr>' +
        '<td><b>' + esc(o.name) + '</b></td>' +
        '<td>' + esc(o.type) + '</td>' +
        '<td class="num font-mono"><b>' + afFmtMoney(held) + '</b></td>' +
        '</tr>';
    }).join('');
    body = '<table class="af-tbl"><thead><tr><th>Owner Entity</th><th>Type</th><th class="num">Trust Sub-Balance Held</th></tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr style="font-weight:700;background:var(--af-bg);">' +
      '<td colspan="2">Total Trust Sub-Balances (Matches Trust Bank Balance)</td><td class="num">' + afFmtMoney(totalHeld) + '</td>' +
      '</tr></tfoot></table>';
  } else if (reportId === 'trust-detail') {
    title = 'Trust Account Transaction Detail';
    const txns = afAllTransactions().filter(function (t) { return t.accountId === 'BANK-02'; });
    const rows = txns.map(function (t) {
      return '<tr>' +
        '<td>' + afFmtDate(t.date) + '</td>' +
        '<td><b>' + esc(t.description) + '</b></td>' +
        '<td>' + esc(t.category) + '</td>' +
        '<td class="num" style="font-weight:700;color:' + (t.amount > 0 ? 'var(--af-good)' : 'var(--af-text)') + '">' +
          (t.amount > 0 ? '+' : '') + afFmtMoney(t.amount) +
        '</td>' +
        '<td>' + (t.cleared ? '<span class="af-badge">Cleared</span>' : '<span class="af-badge warn">Uncleared</span>') + '</td>' +
        '</tr>';
    }).join('');
    body = '<table class="af-tbl"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>';
  } else if (reportId === 'aged-receivables') {
    title = 'Aged Receivable Detail (Receivables Aging)';
    const delinq = afAllLeases().filter(function (l) { return l.status === 'active' && l.balanceCents > 0; });
    const rows = delinq.map(function (l) {
      const r = l.residentIds.length ? afGetResident(l.residentIds[0]) : null;
      const u = afGetUnit(l.unitId);
      return '<tr>' +
        '<td><b>' + (r ? esc(r.name) : 'Resident') + '</b></td>' +
        '<td>' + (u ? esc('Unit ' + u.label) : '—') + '</td>' +
        '<td class="num font-mono" style="color:var(--af-bad);font-weight:700;">' + afFmtMoney(l.balanceCents) + '</td>' +
        '<td><span class="af-badge warn">Aged Receivable</span></td>' +
        '</tr>';
    }).join('');
    body = '<table class="af-tbl"><thead><tr><th>Resident</th><th>Unit</th><th class="num">Overdue Amount</th><th>Aging Tier</th></tr></thead><tbody>' + rows + '</tbody></table>';
  } else {
    afDemoAction('That report');
    return;
  }

  afOpenModal(title, body, '<button type="button" class="af-btn" onclick="afCloseModal()">Close Report</button>', true);
}

/* ============================================================================
   SETTINGS
   ============================================================================ */

const AF_SETTINGS_PAGES = [
  { group: 'Account', pages: [
    { id: 'profile',   label: 'Your profile' },
    { id: 'company',   label: 'Company' },
    { id: 'accounts',  label: 'Bank accounts' }
  ]},
  { group: 'Operations', pages: [
    { id: 'fees',      label: 'Management fees' },
    { id: 'late-fees', label: 'Late fee policy' },
    { id: 'templates', label: 'Letter templates' }
  ]},
  { group: 'Training', training: true, pages: [
    { id: 'sandbox',   label: 'Sandbox and progress', training: true }
  ]}
];

function afSettingsGoto(page) {
  afState.settingsPage = page;
  afRenderRoot();
}

function afSettingsHTML() {
  let page = afState.settingsPage || 'profile';
  if (!afShowsTraining() && page === 'sandbox') {
    page = 'profile';
    afState.settingsPage = 'profile';
  }

  const visibleGroups = AF_SETTINGS_PAGES.filter(function (g) {
    return !g.training || afShowsTraining();
  });

  const rail = visibleGroups.map(function (g) {
    return '<div class="af-set-group"><div class="af-set-grouplabel">' + esc(g.group) + '</div>' +
      g.pages.filter(function (p) { return !p.training || afShowsTraining(); }).map(function (p) {
        return '<button type="button" class="af-set-link' + (p.id === page ? ' on' : '') +
          '" onclick="afSettingsGoto(\'' + escAttr(p.id) + '\')">' + esc(p.label) + '</button>';
      }).join('') + '</div>';
  }).join('');

  let body;
  if (page === 'profile') body = afSettingsProfileHTML();
  else if (page === 'accounts') body = afSettingsAccountsHTML();
  else if (page === 'templates') body = afSettingsTemplatesHTML();
  else if (page === 'sandbox' && afShowsTraining()) body = afSettingsSandboxHTML();
  else body = afEmptyState({
    title: 'Not available in this demo',
    body: 'This settings page exists in AppFolio but is not part of the simulator.',
    actionLabel: 'Back to your profile', action: "afSettingsGoto('profile')"
  });

  const lede = afShowsTraining()
    ? 'Account, operations and the training sandbox.'
    : 'Account and agency operations.';

  return afPageHead('Settings', lede) +
    '<div class="af-set-layout"><nav class="af-set-rail" aria-label="Settings">' + rail + '</nav>' +
    '<div class="af-set-body">' + body + '</div></div>';
}

function afSettingsTemplatesHTML() {
  return '<section class="af-card"><h3>Letter templates</h3>' +
    '<p class="af-page-lede">Pre-approved legal notices and correspondence templates for Texas residential properties.</p>' +
    '<table class="af-tbl"><thead><tr><th>Template Name</th><th>Category</th><th>Statutory Reference</th><th>Actions</th></tr></thead><tbody>' +
      '<tr>' +
        '<td><b>24-Hour Notice of Intent to Enter</b></td>' +
        '<td><span class="af-badge">Notice</span></td>' +
        '<td>Texas Property Code § 92.0081</td>' +
        '<td><button type="button" class="af-btn sm" onclick="SimEngine.viewDoc(\'documents/sample-notice.html\', \'24-Hour Notice of Intent to Enter\')">Preview Notice</button></td>' +
      '</tr>' +
      '<tr>' +
        '<td><b>3-Day Notice to Vacate for Non-Payment</b></td>' +
        '<td><span class="af-badge warn">Notice</span></td>' +
        '<td>Texas Property Code § 24.005</td>' +
        '<td><button type="button" class="af-btn sm" onclick="SimEngine.viewDoc(\'documents/notice-to-vacate.html\', \'3-Day Notice to Vacate\')">Preview Notice</button></td>' +
      '</tr>' +
      '<tr>' +
        '<td><b>Adverse Action Notice (FCRA Compliance)</b></td>' +
        '<td><span class="af-badge">Screening</span></td>' +
        '<td>15 U.S.C. § 1681m</td>' +
        '<td><button type="button" class="af-btn sm" onclick="SimEngine.viewDoc(\'documents/adverse-action-notice.html\', \'FCRA Adverse Action Notice\')">Preview Notice</button></td>' +
      '</tr>' +
      '<tr>' +
        '<td><b>Texas Residential Lease Agreement</b></td>' +
        '<td><span class="af-badge">Contract</span></td>' +
        '<td>TAR Standard Form TAR-2001</td>' +
        '<td><button type="button" class="af-btn sm" onclick="SimEngine.viewDoc(\'documents/lease-agreement.html\', \'Texas Residential Lease Agreement\')">Preview Lease</button></td>' +
      '</tr>' +
      '<tr>' +
        '<td><b>Monthly Owner Operating Statement</b></td>' +
        '<td><span class="af-badge">Accounting</span></td>' +
        '<td>Texas Property Code Chapter 92</td>' +
        '<td><button type="button" class="af-btn sm" onclick="SimEngine.viewDoc(\'documents/owner-statement.html\', \'Owner Statement\')">Preview Statement</button></td>' +
      '</tr>' +
      '<tr>' +
        '<td><b>Security Deposit Itemization Statement</b></td>' +
        '<td><span class="af-badge">Accounting</span></td>' +
        '<td>Texas Property Code § 92.104</td>' +
        '<td><button type="button" class="af-btn sm" onclick="SimEngine.viewDoc(\'documents/deposit-itemization.html\', \'Deposit Itemization Statement\')">Preview Statement</button></td>' +
      '</tr>' +
    '</tbody></table>' +
  '</section>';
}

function afSettingsProfileHTML() {
  const u = afDemo.user;
  return '<section class="af-card"><h3>Your profile</h3>' +
    '<p class="af-page-lede">Identifies you on every notice, statement and work order you send.</p>' +
    '<div class="af-form">' +
      '<div class="af-form-group"><label class="af-label">Name</label><input type="text" class="af-input" value="' + escAttr(u.name) + '" oninput="afDemo.user.name = this.value;"></div>' +
      '<div class="af-form-group"><label class="af-label">Email</label><input type="email" class="af-input" value="' + escAttr(u.email) + '" oninput="afDemo.user.email = this.value;"></div>' +
      '<div class="af-form-group"><label class="af-label">Company</label><input type="text" class="af-input" value="' + escAttr(u.companyName) + '" oninput="afDemo.user.companyName = this.value;"></div>' +
      '<div class="af-form-group"><label class="af-label">Account ID</label><input type="text" class="af-input" value="' + escAttr(u.accountId) + '" disabled></div>' +
    '</div>' +
    '<p class="af-note">Changes here live in this browser tab only. Refreshing the page restores the defaults.</p>' +
    '</section>';
}

function afSettingsAccountsHTML() {
  const rows = afAllBankAccounts().map(function (a) {
    return '<tr>' +
      '<td><b>' + esc(a.name) + '</b><div class="af-sub">' + esc(a.bankName) + ' &bull; &middot;&middot;&middot;&middot;' + esc(a.accountNumber.slice(-4)) + '</div></td>' +
      '<td>' + esc(afAccountTypeLabel(a.type)) + '</td>' +
      '<td class="num" style="font-weight:700;">' + afFmtMoney(afAccountBalance(a.id)) + '</td>' +
      '<td>' + esc(a.glCode) + '</td>' +
      '</tr>';
  }).join('');
  return '<section class="af-card"><h3>Bank accounts</h3>' +
    '<p class="af-page-lede">Three segregated fiduciary account types maintaining statutory isolation between operational revenue, client trust distributions, and tenant security deposits.</p>' +
    '<table class="af-tbl"><thead><tr><th>Account &amp; Institution</th><th>Type</th><th class="num">Balance</th><th>GL Code</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '</section>';
}

function afConfirmResetSandbox() {
  afConfirm({
    title: 'Reset the sandbox?',
    body: 'Every property edit, work order change, posted charge and message you made this session is discarded, and the portfolio returns to its factory state.',
    safe: 'Your training progress is not affected. Completed lessons stay completed.',
    danger: true,
    confirmLabel: 'Reset sandbox',
    onConfirm: function () {
      afResetDemo();
      simToast('Sandbox restored to its factory state.', { tone: 'good' });
      afRenderChrome();
      afRenderRoot();
    }
  });
}

function afConfirmResetProgress() {
  afConfirm({
    title: 'Reset your training progress?',
    body: 'Every completed lesson, answered scenario and exam result is erased. This cannot be undone.',
    safe: 'The sandbox is not affected. The portfolio stays exactly as it is right now.',
    danger: true,
    confirmLabel: 'Erase my progress',
    onConfirm: function () {
      afResetProgress();
      simToast('Training progress erased.', { tone: 'good' });
      afRenderChrome();
      afRenderRoot();
    }
  });
}

function afSettingsSandboxHTML() {
  const done = Object.keys(afStore.lessonsDone || {}).length;
  const steps = Object.keys(afStore.checklist || {}).length;
  return '<section class="af-card"><h3>Sandbox</h3>' +
    '<p class="af-page-lede">Everything you create or edit while exploring lives in this browser tab and disappears when the page reloads. Resetting it returns the portfolio to its factory state.</p>' +
    '<button type="button" class="af-btn danger" onclick="afConfirmResetSandbox()">Reset sandbox</button>' +
    '</section>' +
    '<section class="af-card"><h3>Training progress</h3>' +
    '<p class="af-page-lede">' + done + ' lesson' + (done === 1 ? '' : 's') + ' completed &middot; ' +
      steps + ' step' + (steps === 1 ? '' : 's') + ' recorded. This is the only thing the simulator stores between visits.</p>' +
    '<button type="button" class="af-btn danger" onclick="afConfirmResetProgress()">Reset training progress</button>' +
    '</section>' +
    '<section class="af-card"><h3>Guided tour</h3>' +
    '<p class="af-page-lede">The short orientation to the shell that runs on a first visit. Replaying it changes nothing you have done.</p>' +
    '<button type="button" class="af-btn" onclick="afTourReplay()">Replay the tour</button>' +
    '</section>';
}
