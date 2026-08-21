/* ============================================================================
   APPFOLIO SIMULATOR — PERIPHERAL SECTIONS
   ============================================================================

   Accounting, Communications, Reporting and Settings. They are split from
   appfolio-app.js because they are the sections a trainee visits least and the
   ones that grow largest: the core file should stay about state, routing and
   the entities the course actually turns on.

   Loads AFTER appfolio-app.js and depends on its helpers — afPageHead,
   afEmptyState, afFmtMoney, afConfirm, afDemoAction, the access layer. That
   direction of dependency is deliberate and is why the script order in the
   shell HTML is not arbitrary.

   Prompt 1/3 wires the routes and the empty states. The ledgers that calculate,
   the bank reconciliation and the owner draw arrive in 2/3.
   ============================================================================ */


/* ============================================================================
   ACCOUNTING
   ============================================================================
   The fiduciary boundary is the whole reason this section is hard, so it is the
   first thing the screen shows rather than something discovered later:

     operating         the management company's own money
     trust             money that belongs to owners
     security-deposit  money that belongs to residents

   Moving cash across that line is the mistake the accounting lessons exist to
   prevent. Showing the three balances side by side, permanently, is the cheapest
   way to make the distinction feel real.
   ============================================================================ */

const AF_ACCOUNTING_TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'receipts',     label: 'Receipts' },
  { id: 'payables',     label: 'Payables' },
  { id: 'owner-draws',  label: 'Owner draws' },
  { id: 'statements',   label: 'Owner statements' },
  { id: 'reconcile',    label: 'Bank reconciliation' }
];

function afAccountingTab(tab) {
  afState.accountingTab = tab;
  afRenderRoot();
}

function afAccountTypeLabel(t) {
  return {
    'operating': 'Operating',
    'trust': 'Trust — owner funds',
    'security-deposit': 'Security deposits'
  }[t] || t;
}

function afAccountingHTML() {
  const tab = afState.accountingTab || 'overview';
  const tabs = AF_ACCOUNTING_TABS.map(function (t) {
    return '<button type="button" class="af-tab' + (t.id === tab ? ' on' : '') +
      '" onclick="afAccountingTab(\'' + escAttr(t.id) + '\')">' + esc(t.label) + '</button>';
  }).join('');

  let body;
  if (tab === 'overview') body = afAccountingOverviewHTML();
  else if (tab === 'reconcile') body = afEmptyState({
    title: 'Reconciliation arrives with the portfolio',
    body: 'Matching cleared transactions against a bank statement, and finding the one that does not match, is built in the next stage.',
    actionLabel: 'Back to overview', action: "afAccountingTab('overview')"
  });
  else body = afEmptyState({
    title: 'Nothing posted yet',
    body: 'Receipts, payables, owner draws and statements fill in once the portfolio is loaded.',
    actionLabel: 'Back to overview', action: "afAccountingTab('overview')"
  });

  return afPageHead('Accounting', 'Trust accounting for ' + afAllProperties().length +
      ' propert' + (afAllProperties().length === 1 ? 'y' : 'ies') + ', as of ' + afFmtDate(afToday()) + '.',
      '<button type="button" class="af-btn" onclick="afDemoAction(\'Exporting a general ledger\')">Export</button>') +
    '<div class="af-tabs">' + tabs + '</div>' + body;
}

function afAccountingOverviewHTML() {
  const accounts = afAllBankAccounts();
  if (!accounts.length) {
    return afEmptyState({
      title: 'No bank accounts',
      body: 'A managed portfolio needs at least an operating account, a trust account and a segregated deposit account.',
      actionLabel: 'Open settings', action: "afGoto('settings')"
    });
  }

  const cards = accounts.map(function (a) {
    const txns = afAllTransactions().filter(function (t) { return t.accountId === a.id; });
    const uncleared = txns.filter(function (t) { return !t.cleared; }).length;
    return '<div class="af-acct af-acct-' + escAttr(a.type) + '">' +
      '<span class="af-acct-type">' + esc(afAccountTypeLabel(a.type)) + '</span>' +
      '<b class="af-acct-balance">' + afFmtMoney(a.balance) + '</b>' +
      '<span class="af-acct-name">' + esc(a.name) + ' &middot;&middot;&middot;&middot;' + esc(a.last4) + '</span>' +
      '<span class="af-acct-meta">Last reconciled ' + afFmtDate(a.lastReconciled) +
        (uncleared ? ' · ' + uncleared + ' uncleared' : '') + '</span>' +
      '</div>';
  }).join('');

  const txns = afAllTransactions().slice().sort(function (a, b) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });
  const rows = txns.map(function (t) {
    const acct = afGetBankAccount(t.accountId);
    const prop = t.propertyId ? afGetProperty(t.propertyId) : null;
    return '<tr>' +
      '<td>' + afFmtDate(t.date) + '</td>' +
      '<td><b>' + esc(t.payee) + '</b><div class="af-sub">' + esc(t.glAccount) + '</div></td>' +
      '<td>' + (acct ? esc(afAccountTypeLabel(acct.type)) : '<span class="af-muted">—</span>') + '</td>' +
      '<td>' + (prop ? esc(prop.name) : '<span class="af-muted">—</span>') + '</td>' +
      '<td class="num">' + afFmtMoney(t.amount) + '</td>' +
      '<td>' + (t.cleared ? 'Cleared' : 'Outstanding') + '</td>' +
      '</tr>';
  }).join('');

  return '<div class="af-accts">' + cards + '</div>' +
    '<section class="af-card"><h3>Recent transactions</h3>' +
      (txns.length
        ? '<table class="af-tbl"><thead><tr><th>Date</th><th>Payee</th><th>Account</th><th>Property</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>'
        : afEmptyState({ title: 'No transactions', body: 'Receipts and disbursements appear here as they post.', actionLabel: 'Record a receipt', action: "afDemoAction('Recording a receipt')" })) +
    '</section>';
}


/* ============================================================================
   COMMUNICATIONS
   ============================================================================ */

function afCommunicationsHTML() {
  const sent = afDemo.messages || [];
  const actions = '<button type="button" class="af-btn primary" onclick="afDemoAction(\'Composing a message\')">New message</button>';

  if (!sent.length) {
    return afPageHead('Communications', 'Email, text and letters to residents, owners and vendors.', actions) +
      afEmptyState({
        title: 'No messages yet',
        body: 'Notices, rent reminders and owner updates are sent from here, and every one is recorded against the resident or owner it went to.',
        actionLabel: 'Compose a message',
        action: "afDemoAction('Composing a message')"
      });
  }

  const rows = sent.map(function (m) {
    return '<tr>' +
      '<td>' + afFmtDate(m.date) + '</td>' +
      '<td><b>' + esc(m.subject) + '</b><div class="af-sub">' + esc(m.body || '').slice(0, 90) + '</div></td>' +
      '<td>' + esc(m.to) + '</td>' +
      '<td>' + esc(m.channel) + '</td>' +
      '</tr>';
  }).join('');

  return afPageHead('Communications', sent.length + ' message' + (sent.length === 1 ? '' : 's') + ' sent this session.', actions) +
    '<table class="af-tbl"><thead><tr><th>Date</th><th>Message</th><th>To</th><th>Channel</th></tr></thead><tbody>' + rows + '</tbody></table>';
}


/* ============================================================================
   REPORTING
   ============================================================================
   A catalogue of reports rather than a wall of charts. Every figure a report
   shows will be counted from the entities at render time in 2/3 — nothing on
   this screen is ever a typed number, because a report that disagrees with the
   list it summarises is worse than no report.
   ============================================================================ */

const AFS_REPORT_CATALOG = [
  { id: 'rent-roll',        name: 'Rent Roll',                  group: 'Occupancy',  desc: 'Every unit, its resident, its rent and its lease dates.' },
  { id: 'delinquency',      name: 'Delinquency',                group: 'Occupancy',  desc: 'Outstanding balances by resident, aged.' },
  { id: 'vacancy',          name: 'Vacancy and Turnover',       group: 'Occupancy',  desc: 'Days vacant, turn cost and time to lease.' },
  { id: 'lease-expiration', name: 'Lease Expiration',           group: 'Occupancy',  desc: 'Leases ending in the next 30, 60 and 90 days.' },
  { id: 'owner-statement',  name: 'Owner Statement',            group: 'Financial',  desc: 'Income, expenses, management fee and net distribution per owner.' },
  { id: 'cash-flow',        name: 'Cash Flow',                  group: 'Financial',  desc: 'Receipts against disbursements by property and period.' },
  { id: 'general-ledger',   name: 'General Ledger',             group: 'Financial',  desc: 'Every posting, by GL account.' },
  { id: 'trust-balance',    name: 'Trust Account Balance',      group: 'Financial',  desc: 'Owner funds held, per owner, reconciled to the bank.' },
  { id: 'deposit-liability', name: 'Security Deposit Liability', group: 'Financial', desc: 'Deposits held against the segregated account balance.' },
  { id: 'work-order-aging', name: 'Work Order Aging',           group: 'Operations', desc: 'Open work orders by age, priority and vendor.' },
  { id: 'vendor-spend',     name: 'Vendor Spend',               group: 'Operations', desc: 'What each vendor was paid, by trade and property.' },
  { id: 'leasing-funnel',   name: 'Leasing Funnel',             group: 'Operations', desc: 'Guest cards through applications to signed leases.' }
];

function afReportingHTML() {
  const groups = [];
  AFS_REPORT_CATALOG.forEach(function (r) {
    if (groups.indexOf(r.group) === -1) groups.push(r.group);
  });

  const body = groups.map(function (g) {
    const items = AFS_REPORT_CATALOG.filter(function (r) { return r.group === g; });
    return '<section class="af-card"><h3>' + esc(g) + '</h3>' +
      '<div class="af-report-grid">' + items.map(function (r) {
        return '<button type="button" class="af-report" onclick="afDemoAction(\'The ' + escAttr(r.name) + ' report\')">' +
          '<b>' + esc(r.name) + '</b><span>' + esc(r.desc) + '</span></button>';
      }).join('') + '</div></section>';
  }).join('');

  return afPageHead('Reporting', AFS_REPORT_CATALOG.length + ' reports. Every figure is counted from the portfolio, never typed.',
      '<button type="button" class="af-btn" onclick="afDemoAction(\'Scheduling a report\')">Schedule</button>') +
    body;
}


/* ============================================================================
   SETTINGS
   ============================================================================ */

/* Any collection mixing course scaffolding with product carries training: true
   and is filtered via afShowsTraining(). */
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
    '<table class="af-table"><thead><tr><th>Template Name</th><th>Category</th><th>Statutory Reference</th><th>Actions</th></tr></thead><tbody>' +
      '<tr>' +
        '<td><b>24-Hour Notice of Intent to Enter</b></td>' +
        '<td><span class="af-badge">Notice</span></td>' +
        '<td>Texas Property Code § 92.0081</td>' +
        '<td><button type="button" class="af-btn sm primary" onclick="SimEngine.viewDoc(\'documents/sample-notice.html\', \'24-Hour Notice of Intent to Enter\')">Preview Notice</button></td>' +
      '</tr>' +
      '<tr>' +
        '<td><b>3-Day Notice to Vacate for Non-Payment</b></td>' +
        '<td><span class="af-badge warn">Notice</span></td>' +
        '<td>Texas Property Code § 24.005</td>' +
        '<td><button type="button" class="af-btn sm" onclick="afDemoAction(\'Previewing Notice to Vacate\')">Preview Notice</button></td>' +
      '</tr>' +
      '<tr>' +
        '<td><b>Adverse Action Notice (FCRA Compliance)</b></td>' +
        '<td><span class="af-badge">Screening</span></td>' +
        '<td>15 U.S.C. § 1681m</td>' +
        '<td><button type="button" class="af-btn sm" onclick="afDemoAction(\'Previewing Adverse Action\')">Preview Notice</button></td>' +
      '</tr>' +
    '</tbody></table>' +
  '</section>';
}

function afSettingsProfileHTML() {
  const u = afDemo.user;
  /* These three write straight into afDemo, which is why they are real inputs
     rather than disabled ones — and why a refresh discards whatever is typed. */
  return '<section class="af-card"><h3>Your profile</h3>' +
    '<p class="af-page-lede">Identifies you on every notice, statement and work order you send.</p>' +
    '<div class="af-form">' +
      '<label>Name<input type="text" class="af-input" value="' + escAttr(u.name) + '" oninput="afDemo.user.name = this.value;"></label>' +
      '<label>Email<input type="email" class="af-input" value="' + escAttr(u.email) + '" oninput="afDemo.user.email = this.value;"></label>' +
      '<label>Company<input type="text" class="af-input" value="' + escAttr(u.companyName) + '" oninput="afDemo.user.companyName = this.value;"></label>' +
      '<label>Account ID<input type="text" class="af-input" value="' + escAttr(u.accountId) + '" disabled></label>' +
    '</div>' +
    '<p class="af-note">Changes here live in this browser tab only. Refreshing the page restores the defaults.</p>' +
    '</section>';
}

function afSettingsAccountsHTML() {
  const rows = afAllBankAccounts().map(function (a) {
    return '<tr>' +
      '<td><b>' + esc(a.name) + '</b><div class="af-sub">&middot;&middot;&middot;&middot;' + esc(a.last4) + '</div></td>' +
      '<td>' + esc(afAccountTypeLabel(a.type)) + '</td>' +
      '<td class="num">' + afFmtMoney(a.balance) + '</td>' +
      '<td>' + afFmtDate(a.lastReconciled) + '</td>' +
      '</tr>';
  }).join('');
  return '<section class="af-card"><h3>Bank accounts</h3>' +
    '<p class="af-page-lede">Three account types, and the boundary between them is the point. Owner funds and resident deposits are not the management company&rsquo;s money, and the software is what keeps them apart.</p>' +
    '<table class="af-tbl"><thead><tr><th>Account</th><th>Type</th><th class="num">Balance</th><th>Last reconciled</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '</section>';
}

/* The two resets. They are easy to confuse and confusing them is expensive, so
   each confirmation says explicitly what it will NOT touch. */
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
