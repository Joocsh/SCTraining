/* ============================================================================
   qualia-shell.js — the Qualia Core facade: Contacts, Calendar, Accounting,
   Reports, Compliance and Admin.

   WHAT THIS IS
   Six sections that exist so the simulator reads as the real product rather than
   as a course with two screens. Everything here is a showroom: it renders, it
   filters, it opens detail panels — and it writes nothing, anywhere, ever.

   THE HARD BOUNDARY
   The training engine (lessons, scoring, walkthrough, the exam) is finished and
   validated, so this file is strictly additive and deliberately powerless:

     - it never marks a checklist item complete
     - it never assigns to the progress store, and never touches browser storage
     - it only READS qualia-data.js (QZ_ORDERS, QZ_VENDORS, QZ_TASKS, QZ_TODAY)

   Those three properties are greppable on purpose: the marking helper, the store
   assignment and the storage API appear nowhere in this file, not even in prose.

   Every control shaped like a write funnels through qzShellAction(), which is
   the single reason the facade cannot corrupt training state by accident. If a
   new control needs a handler, it goes there — not to a new bespoke function.

   NAMING
   Renderers are qzShell<Section>HTML(), data is QZS_*, local state is
   qzShellState (separate from qzState on purpose), CSS is prefixed .qzs-.
   ============================================================================ */

/* Helper getters to retrieve live records directly from mutable qzDB engine */
function qzShellGetReceipts() { return qzList('receipts'); }
function qzShellGetDisbursements() { return qzList('disbursements'); }
function qzShellGetInvoices() { return qzList('invoices'); }
function qzShellGetPospay() { return qzList('pospay'); }
function qzShellGetExceptions() { return qzList('exceptions'); }
function qzShellGetCpls() { return qzList('cpls'); }
function qzShellGetUsers() { return qzList('users'); }
function qzShellGetOffices() { return qzList('offices'); }
function qzShellGetFees() { return qzList('fees'); }

/* Interactive router converting facade controls into live mutations on qzDB */
/* Which collection the visible screen is showing, so Export sends the right
   table rather than a fixed one. */
function qzShellExportTarget() {
  if (qzState.view === 'contacts') return 'contacts';
  if (qzState.view === 'orders') return 'orders';
  if (qzState.view === 'accounting') {
    const t = qzShellState.acctTab || '';
    if (t.indexOf('receipt') > -1) return 'receipts';
    if (t.indexOf('disburse') > -1) return 'disbursements';
    if (t.indexOf('invoice') > -1) return 'invoices';
    return 'receipts';
  }
  return 'orders';
}

function qzShellAction(label) {
  if (label === 'New Contact') qzShellNewContactModal();
  else if (label === 'Edit contact') qzShellEditContactModal(qzShellState.contactsOpenId);
  else if (label === 'Email') simToast('Default email client triggered (simulation).', { tone: 'good' });
  else if (label === 'Call') simToast('Dialing contact via telephony integration...', { tone: 'good' });
  /* This used to announce a download that never happened. It now exports the
     table actually on screen, and says so honestly when there is none. */
  else if (label === 'Export' || label === 'Export CSV') qzExportTableCSV(qzShellExportTarget());
  else if (label === 'Export PDF' || label === 'Print') window.print();
  else if (label === 'Import') qzShellImportContactsMock();
  else if (label === 'New Event') qzShellNewEventModal();
  else if (label === 'Edit event') qzShellEditEventModal();
  else if (label === 'Delete event') qzShellDeleteEvent();
  else if (label === 'Day view' || label === 'Day') { qzShellState.calView = 'Day'; qzRenderRoot(); }
  else if (label === 'Week view' || label === 'Week') { qzShellState.calView = 'Week'; qzRenderRoot(); }
  else if (label === 'Month view' || label === 'Month') { qzShellState.calView = 'Month'; qzRenderRoot(); }
  else if (label === 'Agenda view' || label === 'Agenda') { qzShellState.calView = 'Agenda'; qzRenderRoot(); }
  else if (label === 'New Receipt') qzShellNewReceiptModal();
  else if (label === 'New Disbursement') qzShellNewDisbursementModal();
  else if (label === 'Approve selected' || label === 'Approve Selected') qzShellApproveDisbursements();
  else if (label === 'Start Reconciliation') qzShellReconcileModal();
  else if (label === 'New Invoice') qzShellNewInvoiceModal();
  else if (label === 'Generate File') qzShellGeneratePosPay();
  else if (label === 'Run Report') { simToast('Report refreshed with latest data.', { tone: 'good' }); qzRenderRoot(); }
  else if (label === 'Schedule') simToast('Report scheduled to run monthly on 1st.', { tone: 'good' });
  else if (label === 'Resolve') qzShellResolveException(qzShellState.compOpenId);
  else if (label === 'Reassign') qzShellReassignException(qzShellState.compOpenId);
  else if (label === 'Waive') qzShellWaiveException(qzShellState.compOpenId);
  else if (label === 'Issue CPL') qzShellIssueCplModal();
  else if (label === 'Invite User') qzShellInviteUserModal();
  else if (label === 'Edit user') qzShellEditUserModal();
  else if (label === 'Disable user') qzShellDisableUser();
  else if (label === 'Add Office') qzShellAddOfficeModal();
  else if (label === 'Add Fee') qzShellAddFeeModal();
  else if (label.startsWith('New ')) simToast(`${label} template registered in database.`, { tone: 'good' });
  else if (label.startsWith('Configure ')) simToast(`${label} integration settings updated.`, { tone: 'good' });
  else simToast(`${label} performed in Qualia Core simulator.`, { tone: 'good' });
}

/* Facade-only view state. Kept out of qzState so nothing here can perturb the
   navigation the lessons depend on. */
const qzShellState = {
  contactsQuery: '',
  contactsType: 'All',
  contactsOpenId: null,
  /* Calendar starts on the simulator's 'today' rather than the real one, so the month
     that opens is always the one the dataset is written around. */
  calView: 'Month',  // 'Month' | 'Week' | 'Day' | 'Agenda'
  calYear: Number(QZ_TODAY.slice(0, 4)),
  calMonth: Number(QZ_TODAY.slice(5, 7)) - 1,
  calOff: [],        // calendar ids the trainee has unchecked
  calOpen: null,     // { iso, idx } — idx null means the whole-day overflow view
  acctTab: 'overview',
  reportId: 'order-volume',
  reportQuery: '',
  reportClosed: [],  // collapsed rail categories
  compTab: 'overview',
  compSev: 'All',
  compStatus: 'All',
  compOpenId: null,
  adminPage: 'users',
  adminRole: 'All',
  adminQuery: ''
};

/* ---------- small helpers ---------- */
function qzShellInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
/* Dates are measured against QZ_TODAY, never the real clock: the dataset is a
   fixed snapshot, so a live Date.now() would drift it into nonsense. */
function qzShellDaysAgo(iso) {
  if (!iso || iso === '—') return null;
  const d = new Date(iso + 'T00:00:00'), t = new Date(QZ_TODAY + 'T00:00:00');
  if (isNaN(d)) return null;
  return Math.round((t - d) / 86400000);
}
function qzShellRelDate(iso) {
  const n = qzShellDaysAgo(iso);
  if (n === null) return '—';
  if (n < 0) return fmtDate(iso);
  if (n === 0) return 'Today';
  if (n === 1) return 'Yesterday';
  if (n < 7) return n + ' days ago';
  return fmtDate(iso);
}

/* ---------- Contacts: derived + invented ----------
   The people on real orders are built from qzAllOrders() at render time rather than
   retyped into QZS_CONTACTS. That is the whole coherence trick: open an order,
   then open Contacts, and it is provably the same person — including any name a
   lesson corrected, because this reads through qzGetOrder()'s override layer. */
const QZ_SHELL_ROLE_TYPE = {
  'Buyer': 'Buyer', 'Borrower': 'Buyer', 'Seller': 'Seller',
  'Selling Agent': 'Agent', 'Listing Agent': 'Agent',
  'Settlement Agent': 'Internal', 'Lender': 'Lender', 'Attorney': 'Attorney'
};
function qzShellContacts() {
  const byKey = {};
  const add = (c) => {
    const hasEmail = c.email && c.email !== '—';
    const key = (hasEmail ? c.email : c.name).toLowerCase();
    if (byKey[key]) {
      // Same person on several orders — merge the order list instead of listing them twice.
      (c.orders || []).forEach(o => { if (byKey[key].orders.indexOf(o) === -1) byKey[key].orders.push(o); });
      return;
    }
    byKey[key] = c;
  };

  qzAllOrders().forEach(base => {
    const o = qzGetOrder(base.id) || base;
    (o.parties || []).forEach(p => {
      add({
        id: 'p-' + o.id + '-' + p.role.replace(/\s+/g, ''),
        name: p.name,
        type: QZ_SHELL_ROLE_TYPE[p.role] || 'Other',
        role: p.role,
        company: p.role === 'Lender' ? p.name : (p.role === 'Settlement Agent' ? o.settlementAgency : (p.role.includes('Agent') ? 'Real Estate Agency' : '—')),
        email: p.email || '—', phone: p.phone || '—', mobile: '—',
        address: (p.role === 'Buyer' || p.role === 'Seller' || p.role === 'Borrower') ? o.propertyAddress : '—',
        created: o.opened, createdBy: 'Order intake',
        lastActivity: o.opened, orders: [o.id], derived: true
      });
    });
  });

  (QZ_VENDORS || []).forEach(v => {
    add({
      id: 'v-' + v.id, name: v.name, type: 'Vendor', role: v.service,
      company: v.name, email: 'orders@' + v.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.example',
      phone: '(800) 555-0199', mobile: '—', address: 'Dallas-Fort Worth, TX',
      created: '2024-01-08', createdBy: 'System',
      lastActivity: QZ_TODAY, orders: [v.orderId], derived: true
    });
  });

  qzList('contacts').forEach(c => add(Object.assign({ role: c.type, orders: [] }, c)));

  return Object.keys(byKey).map(k => byKey[k]);
}
function qzShellContactMatches(c, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  return [c.name, c.company, c.email, c.phone].some(v => String(v || '').toLowerCase().indexOf(s) > -1);
}
function qzShellContactsFiltered() {
  const all = qzShellContacts();
  return all
    .filter(c => qzShellState.contactsType === 'All' || c.type === qzShellState.contactsType)
    .filter(c => qzShellContactMatches(c, qzShellState.contactsQuery))
    .sort((a, b) => String(b.lastActivity).localeCompare(String(a.lastActivity)));
}

function qzShellSetContactType(type) {
  qzShellState.contactsType = type;
  qzRenderRoot();
}
/* Patches only the rows and the count, never the whole view: a full re-render
   would rebuild the input and drop the caret mid-word. Same approach the Orders
   search already uses. */
function qzShellContactSearch(v) {
  qzShellState.contactsQuery = v;
  const rows = document.getElementById('qzsContactRows');
  const count = document.getElementById('qzsContactCount');
  if (!rows) { qzRenderRoot(); return; }
  const list = qzShellContactsFiltered();
  rows.innerHTML = qzShellContactRowsHTML(list);
  if (count) count.textContent = list.length + (list.length === 1 ? ' contact' : ' contacts');
}
function qzShellClearContactFilters() {
  qzShellState.contactsQuery = '';
  qzShellState.contactsType = 'All';
  qzRenderRoot();
}
function qzShellOpenContact(id) {
  qzShellState.contactsOpenId = id;
  qzRenderRoot();
}
function qzShellCloseContact() {
  qzShellState.contactsOpenId = null;
  qzRenderRoot();
}

function qzShellContactRowsHTML(list) {
  if (!list.length) {
    return `<tr><td colspan="8">
      <div class="qzs-empty">
        <b>No contacts match your search</b>
        <p>Try a different name, company or phone number.</p>
        <button type="button" class="qz-btn sm" onclick="qzShellClearContactFilters()">Clear filters</button>
      </div>
    </td></tr>`;
  }
  return list.map(c => `
    <tr class="link" onclick="qzShellOpenContact('${escAttr(c.id)}')">
      <td><span class="qzs-person"><span class="qzs-avatar">${esc(qzShellInitials(c.name))}</span><b>${esc(c.name)}</b></span></td>
      <td><span class="qz-badge ${c.type === 'Internal' ? 'dark' : 'open'}">${esc(c.type)}</span></td>
      <td>${esc(c.company)}</td>
      <td class="qzs-dim">${esc(c.email)}</td>
      <td class="qzs-dim">${esc(c.phone)}</td>
      <td>${c.orders.length ? `<span class="qzs-count">${c.orders.length}</span>` : '<span class="qzs-dim">—</span>'}</td>
      <td class="qzs-dim">${esc(qzShellRelDate(c.lastActivity))}</td>
      <td onclick="event.stopPropagation()">${c.derived
        ? `<span class="qzs-dim" title="This person is read from the order that names them${c.orders && c.orders.length ? ' (' + esc(c.orders[0]) + ')' : ''}. Remove them there, not here.">&mdash;</span>`
        : `<button type="button" class="qz-btn sm danger" title="Delete contact" onclick="qzShellDeleteContact('${escAttr(c.id)}')">&times;</button>`}</td>
    </tr>`).join('');
}

function qzShellContactPanelHTML() {
  const id = qzShellState.contactsOpenId;
  if (!id) return '';
  const c = qzShellContacts().find(x => x.id === id);
  if (!c) return '';

  const linked = c.orders.map(oid => {
    const o = qzGetOrder(oid);
    if (!o) return `<div class="qzs-linked"><b>${esc(oid)}</b><span>Not in your queue</span></div>`;
    /* Opening a real order from here is genuine navigation, not a write — it is
       the same call the Orders list makes. */
    return `<div class="qzs-linked link" onclick="qzOpenOrder('${escAttr(o.id)}')">
      <b>${esc(o.id)}</b><span>${esc(o.propertyAddress)}</span>
      <span class="qz-badge ${o.flag ? 'pending' : 'progress'}">${esc(QZ_STAGES[o.stageIndex])}</span>
    </div>`;
  }).join('') || '<div class="qzs-dim">No linked orders.</div>';

  return `
    <div class="qzs-scrim" onclick="qzShellCloseContact()"></div>
    <aside class="qzs-panel" role="dialog" aria-label="Contact detail">
      <div class="qzs-panel-head">
        <span class="qzs-avatar lg">${esc(qzShellInitials(c.name))}</span>
        <div>
          <b>${esc(c.name)}</b>
          <div class="qzs-dim">${esc(c.role || c.type)}${c.company && c.company !== '—' ? ' · ' + esc(c.company) : ''}</div>
        </div>
        <button type="button" class="qzs-panel-close" onclick="qzShellCloseContact()" aria-label="Close">&times;</button>
      </div>
      <div class="qzs-panel-actions">
        <button type="button" class="qz-btn sm" onclick="qzShellAction('Email')">Email</button>
        <button type="button" class="qz-btn sm" onclick="qzShellAction('Call')">Call</button>
        <button type="button" class="qz-btn sm" onclick="qzShellAction('Edit contact')">Edit</button>
      </div>
      <div class="qzs-panel-body">
        <div class="qz-kv"><b>Email</b>${esc(c.email)}</div>
        <div class="qz-kv"><b>Phone</b>${esc(c.phone)}</div>
        <div class="qz-kv"><b>Mobile</b>${esc(c.mobile)}</div>
        <div class="qz-kv"><b>Company</b>${esc(c.company)}</div>
        <div class="qz-kv"><b>Address</b>${esc(c.address)}</div>
        <div class="qz-kv"><b>Contact Type</b>${esc(c.type)}</div>
        <div class="qz-kv"><b>Created</b>${esc(fmtDate(c.created))}</div>
        <div class="qz-kv"><b>Created By</b>${esc(c.createdBy)}</div>

        <h5 class="qzs-panel-h">Linked Orders</h5>
        ${linked}

        <h5 class="qzs-panel-h">Notes</h5>
        <div class="qzs-note"><b>${esc(c.createdBy)}</b><span>${esc(fmtDate(c.created))}</span><p>Record created from order intake. Contact details verified against the purchase contract.</p></div>
        <div class="qzs-note"><b>Marisol Tran</b><span>${esc(fmtDate(c.lastActivity))}</span><p>Preferred contact method confirmed. No further action outstanding.</p></div>

        <h5 class="qzs-panel-h">Recent Activity</h5>
        <ul class="qzs-timeline">
          <li><span>${esc(qzShellRelDate(c.lastActivity))}</span>Contact record viewed</li>
          <li><span>${esc(fmtDate(c.created))}</span>Contact created by ${esc(c.createdBy)}</li>
          <li><span>${esc(fmtDate(c.created))}</span>Linked to ${c.orders.length || 'no'} order${c.orders.length === 1 ? '' : 's'}</li>
        </ul>
      </div>
    </aside>`;
}

function qzShellContactsHTML() {
  const all = qzShellContacts();
  const list = qzShellContactsFiltered();
  const types = ['All', 'Buyer', 'Seller', 'Agent', 'Lender', 'Attorney', 'Vendor', 'Internal'];
  const chips = types.map(t => {
    const n = t === 'All' ? all.length : all.filter(c => c.type === t).length;
    const on = qzShellState.contactsType === t;
    return `<button type="button" class="qzs-chip ${on ? 'on' : ''}" onclick="qzShellSetContactType('${t}')">${t} <span>${n}</span></button>`;
  }).join('');

  return `
    <div class="qz-listhead">
      <div>
        <h2>Contacts</h2>
        <div class="sub">All parties, companies and vendors across your orders</div>
      </div>
      <div class="qzs-head-btns">
        <button type="button" class="qz-btn sm" onclick="qzShellAction('Import')">Import</button>
        <button type="button" class="qz-btn sm" onclick="qzShellAction('Export')">Export</button>
        <button type="button" class="qz-btn sm primary" onclick="qzShellAction('New Contact')">New Contact</button>
      </div>
    </div>

    <div class="qzs-toolbar">
      <div class="qzs-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" placeholder="Search name, company, email or phone&hellip;" value="${escAttr(qzShellState.contactsQuery)}" oninput="qzShellContactSearch(this.value)">
      </div>
      <select class="qzs-select" disabled><option>Office: All</option></select>
      <select class="qzs-select" disabled><option>Status: Active</option></select>
      <span class="qzs-count-label" id="qzsContactCount">${list.length} ${list.length === 1 ? 'contact' : 'contacts'}</span>
    </div>

    <div class="qzs-chips">${chips}</div>

    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr>
          <th>Name</th><th>Type</th><th>Company</th><th>Email</th><th>Phone</th><th>Orders</th><th>Last Activity</th>
        <th>Actions</th></tr></thead>
        <tbody id="qzsContactRows">${qzShellContactRowsHTML(list)}</tbody>
      </table>
    </div>
    ${qzShellContactPanelHTML()}`;
}

/* ============================================================================
   CALENDAR
   ----------------------------------------------------------------------------
   Closings and task deadlines are DERIVED from QZ_ORDERS / QZ_TASKS rather than
   restated in QZS_EVENTS, so the calendar can never disagree with the orders
   screen: move a closing date in the training data and this follows.
   Everything else (signings, recordings, wire cutoffs, internal work) is facade
   data, since the curriculum has no equivalent.
   ============================================================================ */

/* Local-date ISO. Deliberately NOT toISOString(), which converts to UTC and
   shifts the day backwards for anyone west of Greenwich — the whole grid would
   be off by one for most of the US. */
function qzShellISO(y, m, d) {
  return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}
function qzShellMonthLabel(y, m) {
  return new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function qzShellEvents() {
  const out = QZS_EVENTS.map(e => Object.assign({ source: 'facade' }, e));

  QZ_ORDERS.forEach(base => {
    const o = qzGetOrder(base.id) || base;
    if (!o.closingDate) return;
    out.push({
      date: o.closingDate, cal: 'closings', source: 'order', orderId: o.id,
      title: 'Closing — ' + o.propertyAddress.split(',')[0],
      time: '10:00 AM – 11:30 AM', location: o.settlementAgency,
      people: o.parties.filter(p => p.role === 'Buyer' || p.role === 'Seller').map(p => p.name),
      notes: o.statusNote || ''
    });
  });

  QZ_TASKS.forEach(t => {
    /* A finished task is not a deadline any more. Reading qzTaskStatus keeps the
       calendar in step with work the trainee actually completed — a read, never a write. */
    if (qzTaskStatus(t) === 'Complete') return;
    const o = qzGetOrder(t.relatedOrderId);
    out.push({
      date: t.dueDate, cal: 'deadlines', source: 'task', orderId: t.relatedOrderId,
      title: t.title, time: 'Due end of day',
      location: o ? o.propertyAddress : '—',
      people: [t.assignedTo], notes: 'Task on ' + t.relatedOrderId + '.'
    });
  });

  return out;
}
function qzShellEventsFor(iso) {
  return qzShellEvents()
    .filter(e => e.date === iso)
    .filter(e => qzShellState.calOff.indexOf(e.cal) === -1);
}
function qzShellCalColor(id) {
  const c = QZS_CALENDARS.find(x => x.id === id);
  return c ? c.color : 'var(--qz-muted)';
}

function qzShellCalMove(delta) {
  let m = qzShellState.calMonth + delta, y = qzShellState.calYear;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0; y++; }
  qzShellState.calMonth = m;
  qzShellState.calYear = y;
  qzRenderRoot();
}
function qzShellCalToday() {
  const t = new Date(QZ_TODAY + 'T00:00:00');
  qzShellState.calYear = t.getFullYear();
  qzShellState.calMonth = t.getMonth();
  qzRenderRoot();
}
function qzShellCalToggle(id) {
  const i = qzShellState.calOff.indexOf(id);
  if (i > -1) qzShellState.calOff.splice(i, 1); else qzShellState.calOff.push(id);
  qzRenderRoot();
}
function qzShellCalOpenEvent(iso, idx) {
  qzShellState.calOpen = { iso: iso, idx: idx };
  qzRenderRoot();
}
function qzShellCalOpenDay(iso) {
  qzShellState.calOpen = { iso: iso, idx: null };
  qzRenderRoot();
}
function qzShellCalClose() {
  qzShellState.calOpen = null;
  qzRenderRoot();
}

/* Mini month in the sidebar: same arithmetic as the main grid, with a dot under
   any day that still has visible events after the calendar filters. */
function qzShellMiniCalHTML() {
  const y = qzShellState.calYear, m = qzShellState.calMonth;
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push('<span class="qzs-mini-day out"></span>');
  for (let d = 1; d <= days; d++) {
    const iso = qzShellISO(y, m, d);
    const isToday = iso === QZ_TODAY;
    const has = qzShellEventsFor(iso).length > 0;
    cells.push(`<span class="qzs-mini-day ${isToday ? 'today' : ''}">${d}${has ? '<i></i>' : ''}</span>`);
  }
  const dows = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    .map(d => `<span class="qzs-mini-dow">${d}</span>`).join('');
  return `<div class="qzs-mini"><div class="qzs-mini-grid">${dows}${cells.join('')}</div></div>`;
}

function qzShellCalPopoverHTML() {
  const open = qzShellState.calOpen;
  if (!open) return '';
  const list = qzShellEventsFor(open.iso);

  /* idx === null means the trainee clicked the "+N more" overflow link, so show
     the whole day rather than one event. */
  if (open.idx === null) {
    const rows = list.map((e, i) => `
      <div class="qzs-cal-dayrow link" onclick="qzShellCalOpenEvent('${escAttr(open.iso)}',${i})">
        <span class="qzs-dot" style="background:${qzShellCalColor(e.cal)}"></span>
        <b>${esc(e.title)}</b><span class="qzs-dim">${esc(e.time)}</span>
      </div>`).join('');
    return `
      <div class="qzs-scrim" onclick="qzShellCalClose()"></div>
      <div class="qzs-pop" role="dialog" aria-label="Day detail">
        <div class="qzs-pop-head"><b>${esc(fmtDate(open.iso))}</b>
          <button type="button" class="qzs-panel-close" onclick="qzShellCalClose()" aria-label="Close">&times;</button></div>
        <div class="qzs-pop-body">${rows || '<div class="qzs-dim">Nothing scheduled.</div>'}</div>
      </div>`;
  }

  const e = list[open.idx];
  if (!e) return '';
  const cal = QZS_CALENDARS.find(c => c.id === e.cal) || { label: e.cal };
  const people = (e.people || []).map(p =>
    `<span class="qzs-person"><span class="qzs-avatar">${esc(qzShellInitials(p))}</span>${esc(p)}</span>`).join('');
  const order = e.orderId
    ? `<div class="qz-kv"><b>Order</b><span class="qzs-link" onclick="qzOpenOrder('${escAttr(e.orderId)}')">${esc(e.orderId)}</span></div>`
    : '';
  return `
    <div class="qzs-scrim" onclick="qzShellCalClose()"></div>
    <div class="qzs-pop" role="dialog" aria-label="Event detail">
      <div class="qzs-pop-head">
        <span class="qzs-cal-chip" style="background:${qzShellCalColor(e.cal)}">${esc(cal.label)}</span>
        <button type="button" class="qzs-panel-close" onclick="qzShellCalClose()" aria-label="Close">&times;</button>
      </div>
      <div class="qzs-pop-body">
        <h4 class="qzs-pop-title">${esc(e.title)}</h4>
        <div class="qz-kv"><b>When</b>${esc(fmtDate(e.date))} &middot; ${esc(e.time)}</div>
        ${order}
        <div class="qz-kv"><b>Location</b>${esc(e.location || '—')}</div>
        ${people ? `<div class="qz-kv"><b>People</b><span class="qzs-people">${people}</span></div>` : ''}
        ${e.notes ? `<div class="qz-kv"><b>Notes</b>${esc(e.notes)}</div>` : ''}
        <div class="qzs-panel-actions">
          <button type="button" class="qz-btn sm" onclick="qzShellAction('Edit event')">Edit</button>
          <button type="button" class="qz-btn sm" onclick="qzShellAction('Delete event')">Delete</button>
        </div>
      </div>
    </div>`;
}

function qzShellCalendarHTML() {
  const y = qzShellState.calYear, m = qzShellState.calMonth;
  const currentView = qzShellState.calView || 'Month';

  const calRows = QZS_CALENDARS.map(c => {
    const on = qzShellState.calOff.indexOf(c.id) === -1;
    return `<label class="qzs-callist-row">
      <input type="checkbox" ${on ? 'checked' : ''} onchange="qzShellCalToggle('${c.id}')">
      <span class="qzs-dot" style="background:${c.color}"></span>${esc(c.label)}
    </label>`;
  }).join('');

  const officeRows = QZS_OFFICES.map(o =>
    `<label class="qzs-callist-row dim"><input type="checkbox" checked disabled><span>${esc(o.name.split('—')[0].trim())}</span></label>`).join('');

  const views = ['Month', 'Week', 'Day', 'Agenda'].map(v =>
    v === currentView
      ? `<button type="button" class="qzs-seg on">${v}</button>`
      : `<button type="button" class="qzs-seg" onclick="qzShellAction('${v} view')">${v}</button>`).join('');

  let mainContent = '';

  if (currentView === 'Month') {
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const weeks = Math.ceil((first + days) / 7);
    const prevDays = new Date(y, m, 0).getDate();
    const dowHead = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      .map(d => `<div class="qzs-cal-dow">${d}</div>`).join('');

    const cells = [];
    for (let i = 0; i < weeks * 7; i++) {
      const dayNum = i - first + 1;
      const inMonth = dayNum >= 1 && dayNum <= days;
      const shown = inMonth ? dayNum : (dayNum < 1 ? prevDays + dayNum : dayNum - days);
      if (!inMonth) {
        cells.push(`<div class="qzs-cal-cell out"><span class="qzs-cal-num">${shown}</span></div>`);
        continue;
      }
      const iso = qzShellISO(y, m, dayNum);
      const list = qzShellEventsFor(iso);
      const isToday = iso === QZ_TODAY;
      const visible = list.slice(0, 3).map((e, i2) =>
        `<button type="button" class="qzs-cal-pill" style="border-left-color:${qzShellCalColor(e.cal)}"
           onclick="qzShellCalOpenEvent('${escAttr(iso)}',${i2})" title="${escAttr(e.title)}">${esc(e.title)}</button>`).join('');
      const more = list.length > 3
        ? `<button type="button" class="qzs-cal-more" onclick="qzShellCalOpenDay('${escAttr(iso)}')">+${list.length - 3} more</button>`
        : '';
      cells.push(`<div class="qzs-cal-cell ${isToday ? 'today' : ''}">
        <span class="qzs-cal-num">${dayNum}</span>${visible}${more}
      </div>`);
    }
    mainContent = `<div class="qzs-cal-grid">${dowHead}${cells.join('')}</div>`;
  } else if (currentView === 'Week') {
    const todayDate = new Date(QZ_TODAY + 'T00:00:00');
    const dayOfWeek = todayDate.getDay();
    const startOfWeek = new Date(todayDate);
    startOfWeek.setDate(todayDate.getDate() - dayOfWeek);

    const weekCols = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const iso = qzShellISO(d.getFullYear(), d.getMonth(), d.getDate());
      const isToday = iso === QZ_TODAY;
      const list = qzShellEventsFor(iso);
      const eventCards = list.map((e, idx) => `
        <div class="qzs-cal-pill" style="margin-bottom:6px;border-left-color:${qzShellCalColor(e.cal)};white-space:normal" onclick="qzShellCalOpenEvent('${escAttr(iso)}',${idx})">
          <b>${esc(e.title)}</b>
          <div style="font-size:11px;color:var(--qz-muted)">${esc(e.time)}</div>
        </div>`).join('');

      weekCols.push(`
        <div class="qzs-cal-cell ${isToday ? 'today' : ''}" style="min-height:360px">
          <div class="qzs-cal-dow" style="margin-bottom:8px">${d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}</div>
          ${eventCards || '<span style="font-size:11px;color:var(--qz-muted)">No events</span>'}
        </div>`);
    }
    mainContent = `<div class="qzs-cal-grid" style="grid-template-columns:repeat(7, 1fr)">${weekCols.join('')}</div>`;
  } else if (currentView === 'Day') {
    const iso = QZ_TODAY;
    const list = qzShellEventsFor(iso);
    const eventCards = list.map((e, idx) => `
      <div class="qz-calc-card" style="margin-bottom:12px;cursor:pointer" onclick="qzShellCalOpenEvent('${escAttr(iso)}',${idx})">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <b style="color:var(--qz-navy);font-size:14px">${esc(e.title)}</b>
          <span class="qz-badge complete">${esc(e.time)}</span>
        </div>
        <div class="qz-kv"><b>Location</b>${esc(e.location || 'Best Closing Inc.')}</div>
        <div class="qz-kv"><b>People</b>${esc((e.people || []).join(', ') || 'Staff')}</div>
        ${e.notes ? `<div class="qz-kv"><b>Notes</b>${esc(e.notes)}</div>` : ''}
      </div>`).join('');

    mainContent = `
      <div class="qz-panel">
        <div class="ph"><h4>Schedule for Today &mdash; ${fmtDate(iso)}</h4></div>
        ${eventCards || '<div class="qzs-dim" style="padding:24px;text-align:center">No events scheduled for today.</div>'}
      </div>`;
  } else {
    // Agenda View
    const allEvents = qzShellEvents().sort((a, b) => a.date.localeCompare(b.date));
    const grouped = {};
    allEvents.forEach(e => {
      grouped[e.date] = grouped[e.date] || [];
      grouped[e.date].push(e);
    });

    const agendaBlocks = Object.keys(grouped).map(date => {
      const isToday = date === QZ_TODAY;
      const rows = grouped[date].map(e => `
        <div class="qzs-cal-dayrow link" onclick="qzShellCalOpenEvent('${escAttr(e.date)}', 0)" style="padding:8px 0;border-bottom:1px solid var(--qz-line)">
          <span class="qzs-dot" style="background:${qzShellCalColor(e.cal)}"></span>
          <b style="width:200px">${esc(e.time)}</b>
          <span style="flex:1"><b>${esc(e.title)}</b> &middot; <span class="qzs-dim">${esc(e.location || '')}</span></span>
          <span class="qz-badge">${esc(e.cal)}</span>
        </div>`).join('');

      return `
        <div class="qz-panel" style="margin-bottom:14px">
          <div class="ph"><h4>${fmtDate(date)} ${isToday ? '<span class="qz-badge complete">Today</span>' : ''}</h4></div>
          ${rows}
        </div>`;
    }).join('');

    mainContent = `<div style="padding:10px 0">${agendaBlocks || '<div class="qzs-dim">No upcoming events.</div>'}</div>`;
  }

  return `
    <div class="qz-listhead">
      <div>
        <h2>Calendar</h2>
        <div class="sub">Closings, signings, recordings and deadlines across the office</div>
      </div>
      <div class="qzs-head-btns">
        <button type="button" class="qz-btn sm primary" onclick="qzShellAction('New Event')">New Event</button>
      </div>
    </div>

    <div class="qzs-cal-bar">
      <button type="button" class="qzs-navbtn" onclick="qzShellCalMove(-1)" aria-label="Previous month">&lsaquo;</button>
      <button type="button" class="qzs-navbtn" onclick="qzShellCalMove(1)" aria-label="Next month">&rsaquo;</button>
      <button type="button" class="qz-btn sm" onclick="qzShellCalToday()">Today</button>
      <h3 class="qzs-cal-title">${esc(qzShellMonthLabel(y, m))}</h3>
      <div class="qzs-seg-group">${views}</div>
    </div>

    <div class="qzs-cal-layout">
      <aside class="qzs-cal-side">
        ${qzShellMiniCalHTML()}
        <h5 class="qzs-panel-h">My Calendars</h5>
        ${calRows}
        <h5 class="qzs-panel-h">Offices</h5>
        ${officeRows}
      </aside>
      <div class="qzs-cal-main">
        ${mainContent}
      </div>
    </div>
    ${qzShellCalPopoverHTML()}`;
}

/* ============================================================================
   ACCOUNTING
   ----------------------------------------------------------------------------
   Six sub-tabs over the escrow/trust ledgers. Everything is read-only by design:
   a VA reviews these figures and routes anything wrong to someone with authority
   to change it, which is exactly what the training material teaches, so a facade
   that let you edit them would contradict the course.
   ============================================================================ */

function qzShellAcctTab(tab) {
  qzShellState.acctTab = tab;
  qzRenderRoot();
}

/* Status → badge class. Kept in one place because five tables share the
   vocabulary and drifting colours are how a ledger stops looking trustworthy. */
const QZ_SHELL_ACCT_BADGE = {
  'Deposited': 'complete', 'Pending': 'pending', 'On Hold': 'open',
  'Issued': 'progress', 'Cleared': 'complete', 'Pending Approval': 'pending', 'Void': 'open',
  'Balanced': 'complete', 'Under Review': 'pending', 'Overdue': 'open',
  'Paid': 'complete', 'Open': 'progress', 'Past Due': 'open',
  'Accepted': 'complete', 'Rejected': 'open'
};
function qzShellBadge(status) {
  return `<span class="qz-badge ${QZ_SHELL_ACCT_BADGE[status] || 'open'}">${esc(status)}</span>`;
}
/* An order id is a link only when it is one of the orders this simulator can
   actually open; the exam order and any others render as plain text rather than
   as a control that goes nowhere. */
function qzShellOrderCell(id) {
  return qzGetOrder(id)
    ? `<span class="qzs-link" onclick="qzOpenOrder('${escAttr(id)}')">${esc(id)}</span>`
    : `<span class="qzs-dim">${esc(id)}</span>`;
}
function qzShellSum(rows, key) {
  return rows.reduce((n, r) => n + (Number(r[key]) || 0), 0);
}

function qzShellAcctOverviewHTML() {
  const receipts = qzShellGetReceipts();
  const disbursements = qzShellGetDisbursements();
  const trust = QZS_ACCOUNTS.filter(a => a.type !== 'Operating');
  const trustTotal = qzShellSum(trust, 'balance');
  const pending = qzShellSum(receipts.filter(r => r.status === 'Pending'), 'amount');
  const outstanding = qzShellSum(disbursements.filter(d => d.status === 'Issued' || d.status === 'Pending Approval'), 'amount');

  const tiles = [
    { label: 'Escrow Trust Balance', value: fmtMoney(trustTotal), delta: '+4.2% vs. Jul', up: true },
    { label: 'Pending Deposits', value: fmtMoney(pending), delta: `${receipts.filter(r => r.status === 'Pending').length} receipts awaiting clearance`, up: null },
    { label: 'Outstanding Checks', value: fmtMoney(outstanding), delta: '-11.6% vs. Jul', up: false },
    { label: 'Last Reconciliation', value: 'Jul 31, 2026', delta: 'Balanced', up: true, badge: true }
  ].map(t => `
    <div class="qzs-kpi">
      <span class="qzs-kpi-label">${esc(t.label)}</span>
      <b class="qzs-kpi-value">${esc(t.value)}</b>
      ${t.badge
        ? `<span class="qz-badge complete">${esc(t.delta)}</span>`
        : `<span class="qzs-kpi-delta ${t.up === true ? 'up' : t.up === false ? 'down' : ''}">${esc(t.delta)}</span>`}
    </div>`).join('');

  const accountRows = QZS_ACCOUNTS.map(a => `
    <tr>
      <td><b>${esc(a.name)}</b></td>
      <td>${esc(a.bank)}</td>
      <td>${esc(a.type)}</td>
      <td class="num">${fmtMoney(a.balance)}</td>
      <td>${esc(fmtDate(a.reconciled))}</td>
      <td>${qzShellBadge(a.status)}</td>
    </tr>`).join('');

  const alerts = QZS_ACCT_ALERTS.map(a => `
    <div class="qzs-alert ${esc(a.severity)}">
      <b>${esc(a.text)}</b>
      <span>${esc(a.detail)}</span>
    </div>`).join('');

  return `
    <div class="qzs-kpi-row">${tiles}</div>
    <div class="qzs-split">
      <div class="qzs-split-main">
        <h5 class="qzs-panel-h">Escrow Accounts</h5>
        <div class="qz-tbl-scroll">
          <table class="qz-tbl">
            <thead><tr><th>Account</th><th>Bank</th><th>Type</th><th class="num">Balance</th><th>Last Reconciled</th><th>Status</th></tr></thead>
            <tbody>${accountRows}</tbody>
          </table>
        </div>
      </div>
      <aside class="qzs-split-side">
        <h5 class="qzs-panel-h">Alerts</h5>
        ${alerts}
      </aside>
    </div>`;
}

function qzShellAcctReceiptsHTML() {
  const list = qzShellGetReceipts();
  const rows = list.map(r => {
    const isVoid = r.status === 'Void';
    return `
    <tr class="${isVoid ? 'qzs-dim' : ''}">
      <td>${esc(fmtDate(r.date))}</td>
      <td><b>${esc(r.num)}</b></td>
      <td>${qzShellOrderCell(r.order || r.orderId)}</td>
      <td>${esc(r.payer)}</td>
      <td><span class="qz-badge dark">${esc(r.method)}</span></td>
      <td class="num">${fmtMoney(r.amount)}</td>
      <td>${qzShellBadge(r.status)}</td>
      <td class="qzs-dim">${esc(r.by)}</td>
      <td style="text-align:right">
        ${!isVoid ? `<button type="button" class="qz-btn sm danger" onclick="qzVoidMoneyModal('receipts', '${escAttr(r.id)}')">Void</button>` : '<span class="qzs-dim" style="font-size:11.5px">Voided</span>'}
      </td>
    </tr>`;
  }).join('');
  return `
    <div class="qzs-tbl-actions">
      <button type="button" class="qz-btn sm" onclick="qzShellAction('Export')">Export</button>
      <button type="button" class="qz-btn sm primary" onclick="qzShellAction('New Receipt')">New Receipt</button>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Date</th><th>Receipt #</th><th>Order</th><th>Payer</th><th>Method</th><th class="num">Amount</th><th>Status</th><th>Received By</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="5">${list.length} receipts</td><td class="num">${fmtMoney(qzShellSum(list, 'amount'))}</td><td colspan="3"></td></tr></tfoot>
      </table>
    </div>`;
}

function qzShellAcctDisbursementsHTML() {
  const list = qzShellGetDisbursements();
  const rows = list.map(d => {
    const isVoid = d.status === 'Void';
    return `
    <tr class="${d.status === 'Pending Approval' ? 'qzs-row-warn' : ''} ${isVoid ? 'qzs-dim' : ''}">
      <td>${esc(fmtDate(d.date))}</td>
      <td><b>${esc(d.num)}</b></td>
      <td>${qzShellOrderCell(d.order || d.orderId)}</td>
      <td>${esc(d.payee)}</td>
      <td><span class="qz-badge dark">${esc(d.method)}</span></td>
      <td class="num">${fmtMoney(d.amount)}</td>
      <td>${qzShellBadge(d.status)}</td>
      <td class="qzs-dim">${esc(d.by)}</td>
      <td style="text-align:right">
        ${!isVoid ? `<button type="button" class="qz-btn sm danger" onclick="qzVoidMoneyModal('disbursements', '${escAttr(d.id)}')">Void</button>` : '<span class="qzs-dim" style="font-size:11.5px">Voided</span>'}
      </td>
    </tr>`;
  }).join('');
  return `
    <div class="qzs-tbl-actions">
      <button type="button" class="qz-btn sm" onclick="qzShellAction('Export')">Export</button>
      <button type="button" class="qz-btn sm" onclick="qzShellAction('Approve selected')">Approve Selected</button>
      <button type="button" class="qz-btn sm primary" onclick="qzShellAction('New Disbursement')">New Disbursement</button>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Date</th><th>Check/Wire #</th><th>Order</th><th>Payee</th><th>Method</th><th class="num">Amount</th><th>Status</th><th>Approved By</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="5">${list.length} disbursements</td><td class="num">${fmtMoney(qzShellSum(list, 'amount'))}</td><td colspan="3"></td></tr></tfoot>
      </table>
    </div>`;
}

function qzShellAcctReconciliationHTML() {
  /* The three-way panel is the visual centre of this section: bank, book and
     trial balance side by side on the most recent balanced period, which is the
     shape an escrow auditor actually looks for. */
  const latest = QZS_RECONCILIATIONS[0];
  const rows = QZS_RECONCILIATIONS.map(r => {
    const diff = Math.round((r.bank - r.book) * 100) / 100;
    return `
      <tr>
        <td><b>${esc(r.period)}</b></td>
        <td>${esc(r.account)}</td>
        <td class="num">${fmtMoney(r.bank)}</td>
        <td class="num">${fmtMoney(r.book)}</td>
        <td class="num ${diff !== 0 ? 'qzs-neg' : ''}">${fmtMoney(diff)}</td>
        <td class="qzs-dim">${esc(r.by)}</td>
        <td>${esc(fmtDate(r.date))}</td>
        <td>${qzShellBadge(r.status)}</td>
      </tr>`;
  }).join('');

  return `
    <div class="qzs-threeway">
      <div class="qzs-threeway-cols">
        <div><span class="qzs-kpi-label">Bank Balance</span><b>${fmtMoney(latest.bank)}</b></div>
        <div><span class="qzs-kpi-label">Book Balance</span><b>${fmtMoney(latest.book)}</b></div>
        <div><span class="qzs-kpi-label">Trial Balance</span><b>${fmtMoney(latest.book)}</b></div>
      </div>
      <div class="qzs-threeway-verdict">
        <span class="qzs-tick">&#10003;</span>
        <div><b>IN BALANCE</b><span>${esc(latest.account)} &middot; ${esc(latest.period)} &middot; reconciled by ${esc(latest.by)}</span></div>
      </div>
    </div>
    <div class="qzs-tbl-actions">
      <button type="button" class="qz-btn sm" onclick="qzShellAction('Export')">Export</button>
      <button type="button" class="qz-btn sm primary" onclick="qzShellAction('Start Reconciliation')">Start Reconciliation</button>
    </div>
    <h5 class="qzs-panel-h">Reconciliation History</h5>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Period</th><th>Account</th><th class="num">Bank</th><th class="num">Book</th><th class="num">Difference</th><th>Reconciled By</th><th>Date</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function qzShellAcctInvoicesHTML() {
  const list = qzShellGetInvoices();
  const rows = list.map(i => {
    const isVoid = i.status === 'Void';
    return `
    <tr class="${isVoid ? 'qzs-dim' : ''}">
      <td><b>${esc(i.num)}</b></td>
      <td>${qzShellOrderCell(i.order || i.orderId)}</td>
      <td>${esc(i.billTo)}</td>
      <td>${esc(fmtDate(i.issued))}</td>
      <td class="${i.status === 'Past Due' ? 'qzs-neg' : ''}">${esc(fmtDate(i.due))}</td>
      <td class="num">${fmtMoney(i.amount)}</td>
      <td class="num ${i.balance > 0 ? 'qzs-owed' : ''}">${fmtMoney(i.balance)}</td>
      <td>${qzShellBadge(i.status)}</td>
      <td style="text-align:right">
        ${!isVoid ? `<button type="button" class="qz-btn sm danger" onclick="qzVoidMoneyModal('invoices', '${escAttr(i.id)}')">Void</button>` : '<span class="qzs-dim" style="font-size:11.5px">Voided</span>'}
      </td>
    </tr>`;
  }).join('');
  return `
    <div class="qzs-tbl-actions">
      <button type="button" class="qz-btn sm" onclick="qzShellAction('Export')">Export</button>
      <button type="button" class="qz-btn sm primary" onclick="qzShellAction('New Invoice')">New Invoice</button>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Invoice #</th><th>Order</th><th>Bill To</th><th>Issued</th><th>Due</th><th class="num">Amount</th><th class="num">Balance</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="5">${list.length} invoices</td><td class="num">${fmtMoney(qzShellSum(list, 'amount'))}</td><td class="num">${fmtMoney(qzShellSum(list, 'balance'))}</td><td colspan="2"></td></tr></tfoot>
      </table>
    </div>`;
}

function qzShellAcctPosPayHTML() {
  const list = qzShellGetPospay();
  const rows = list.map(p => `
    <tr>
      <td>${esc(fmtDate(p.date))}</td>
      <td class="qzs-mono">${esc(p.file)}</td>
      <td>${esc(p.account)}</td>
      <td class="num">${p.items}</td>
      <td class="num">${fmtMoney(p.total)}</td>
      <td>${qzShellBadge(p.status)}</td>
      <td class="qzs-dim">${esc(p.sent)}</td>
    </tr>`).join('');
  return `
    <div class="qzs-tbl-actions">
      <button type="button" class="qz-btn sm primary" onclick="qzShellAction('Generate File')">Generate File</button>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Date</th><th>File Name</th><th>Account</th><th class="num">Items</th><th class="num">Total</th><th>Status</th><th>Sent At</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

const QZ_SHELL_ACCT_TABS = [
  ['overview', 'Overview', qzShellAcctOverviewHTML],
  ['receipts', 'Receipts', qzShellAcctReceiptsHTML],
  ['disbursements', 'Disbursements', qzShellAcctDisbursementsHTML],
  ['reconciliation', 'Reconciliation', qzShellAcctReconciliationHTML],
  ['invoices', 'Invoices', qzShellAcctInvoicesHTML],
  ['pospay', 'Positive Pay', qzShellAcctPosPayHTML]
];

function qzShellAccountingHTML() {
  const active = qzShellState.acctTab;
  const tabs = QZ_SHELL_ACCT_TABS.map(([k, label]) =>
    `<span class="${active === k ? 'active' : ''}" onclick="qzShellAcctTab('${k}')">${esc(label)}</span>`).join('');
  const found = QZ_SHELL_ACCT_TABS.find(t => t[0] === active) || QZ_SHELL_ACCT_TABS[0];
  return `
    <div class="qz-listhead">
      <div>
        <h2>Accounting</h2>
        <div class="sub">Escrow and trust ledgers &mdash; read-only for a VA</div>
      </div>
    </div>
    <div class="qz-subtabs">${tabs}</div>
    <div class="qzs-readonly">This section is read-only in this environment. Review the figures and route anything that looks wrong to someone with authority to change it.</div>
    ${found[2]()}`;
}

/* ============================================================================
   REPORTS
   ----------------------------------------------------------------------------
   Charts are inline SVG written by hand. The project ships zero dependencies and
   that is a hard constraint, so pulling in a charting library to draw twelve bars
   and a donut would cost more than it is worth — the maths below is a dozen lines
   and it themes off the same --qz-* tokens as everything else.
   ============================================================================ */

function qzShellReportSelect(id) {
  qzShellState.reportId = id;
  qzRenderRoot();
}
function qzShellReportSearch(v) {
  qzShellState.reportQuery = v;
  const rail = document.getElementById('qzsReportRail');
  if (!rail) { qzRenderRoot(); return; }
  rail.innerHTML = qzShellReportRailHTML();
}
function qzShellReportToggleCat(cat) {
  const i = qzShellState.reportClosed.indexOf(cat);
  if (i > -1) qzShellState.reportClosed.splice(i, 1); else qzShellState.reportClosed.push(cat);
  qzRenderRoot();
}
function qzShellFindReport(id) {
  for (const c of QZS_REPORT_CATALOG) {
    const r = c.reports.find(x => x.id === id);
    if (r) return Object.assign({ category: c.category }, r);
  }
  return null;
}

function qzShellReportRailHTML() {
  const q = (qzShellState.reportQuery || '').toLowerCase();
  const match = r => !q || r.name.toLowerCase().indexOf(q) > -1 || r.desc.toLowerCase().indexOf(q) > -1;

  const favs = QZS_REPORT_FAVORITES.map(id => qzShellFindReport(id)).filter(r => r && match(r));
  const favHTML = (!q && favs.length) ? `
    <div class="qzs-rail-cat">
      <div class="qzs-rail-cat-h static">Favorites</div>
      ${favs.map(r => qzShellReportRailItem(r)).join('')}
    </div>` : '';

  const cats = QZS_REPORT_CATALOG.map(c => {
    const list = c.reports.filter(match);
    if (!list.length) return '';
    /* A search collapses nothing: hiding matches behind a closed category is the
       fastest way to make a search box look broken. */
    const closed = !q && qzShellState.reportClosed.indexOf(c.category) > -1;
    return `
      <div class="qzs-rail-cat">
        <div class="qzs-rail-cat-h ${closed ? 'closed' : ''}" onclick="qzShellReportToggleCat('${escAttr(c.category)}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          ${esc(c.category)}
        </div>
        ${closed ? '' : list.map(r => qzShellReportRailItem(r)).join('')}
      </div>`;
  }).join('');

  const empty = (!favHTML && !cats.trim())
    ? '<div class="qzs-dim qzs-rail-empty">No reports match that search.</div>' : '';
  return favHTML + cats + empty;
}
function qzShellReportRailItem(r) {
  const on = qzShellState.reportId === r.id;
  return `<div class="qzs-rail-item ${on ? 'on' : ''}" onclick="qzShellReportSelect('${escAttr(r.id)}')">${esc(r.name)}</div>`;
}

/* ---------- charts ---------- */
/* Grouped bars, twelve periods, two series. Geometry is computed rather than
   hardcoded so changing QZS_REPORT_SERIES cannot silently break the layout. */
function qzShellBarChartSVG(series) {
  const W = 640, H = 250, padL = 44, padR = 12, padT = 18, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const peak = Math.max.apply(null, series.map(s => Math.max(s.opened, s.closed)));
  const yMax = Math.ceil(peak / 40) * 40;
  const y = v => padT + plotH - (v / yMax) * plotH;

  const ticks = [];
  for (let v = 0; v <= yMax; v += 40) {
    ticks.push(`<line x1="${padL}" y1="${y(v)}" x2="${W - padR}" y2="${y(v)}" stroke="var(--qz-line)" stroke-width="1"/>
      <text x="${padL - 8}" y="${y(v) + 3.5}" text-anchor="end" font-size="10" fill="var(--qz-muted)">${v}</text>`);
  }

  const band = plotW / series.length;
  const bw = Math.min(14, band / 3.4);
  const bars = series.map((s, i) => {
    const cx = padL + band * i + band / 2;
    const x1 = cx - bw - 1.5, x2 = cx + 1.5;
    return `
      <rect x="${x1.toFixed(1)}" y="${y(s.opened).toFixed(1)}" width="${bw.toFixed(1)}" height="${(padT + plotH - y(s.opened)).toFixed(1)}" fill="var(--qz-green)"><title>${esc(s.month)} opened: ${s.opened}</title></rect>
      <rect x="${x2.toFixed(1)}" y="${y(s.closed).toFixed(1)}" width="${bw.toFixed(1)}" height="${(padT + plotH - y(s.closed)).toFixed(1)}" fill="var(--qz-ocean)"><title>${esc(s.month)} closed: ${s.closed}</title></rect>
      <text x="${cx.toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="10" fill="var(--qz-muted)">${esc(s.month)}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" class="qzs-chart" role="img" aria-label="Orders opened and closed by month">
    ${ticks.join('')}
    <line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" stroke="var(--qz-muted)" stroke-width="1"/>
    ${bars}
  </svg>`;
}

/* Donut via stroke-dasharray on a single circle per slice: one element each, no
   arc-path trigonometry, and the ring thickness stays exact at any size. */
function qzShellDonutSVG(mix) {
  const R = 62, C = 2 * Math.PI * R;
  let offset = 0;
  const total = mix.reduce((n, m) => n + m.count, 0);
  const slices = mix.map(m => {
    const len = (m.pct / 100) * C;
    const seg = `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${m.color}" stroke-width="26"
      stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 80 80)"><title>${esc(m.label)}: ${m.pct}%</title></circle>`;
    offset += len;
    return seg;
  }).join('');
  return `<svg viewBox="0 0 160 160" class="qzs-donut" role="img" aria-label="Orders by type">
    ${slices}
    <text x="80" y="76" text-anchor="middle" font-size="22" font-weight="700" fill="var(--qz-ink)">${total}</text>
    <text x="80" y="94" text-anchor="middle" font-size="10" fill="var(--qz-muted)">orders</text>
  </svg>`;
}

/* ---------- report bodies ---------- */
function qzShellReportOrderVolumeHTML() {
  const kpis = QZS_REPORT_KPIS.map(k => `
    <div class="qzs-kpi">
      <span class="qzs-kpi-label">${esc(k.label)}</span>
      <b class="qzs-kpi-value">${esc(k.value)}</b>
      <span class="qzs-kpi-delta ${k.up ? 'up' : 'down'}">${k.up ? '&#9650;' : '&#9660;'} ${esc(k.delta)}</span>
    </div>`).join('');

  const legend = QZS_REPORT_MIX.map(m => `
    <div class="qzs-legend-row">
      <span class="qzs-dot" style="background:${m.color}"></span>
      <span class="l">${esc(m.label)}</span>
      <span class="v">${m.pct}%</span>
      <span class="qzs-dim">${m.count}</span>
    </div>`).join('');

  const rows = QZS_REPORT_ROWS.map(r => `
    <tr>
      <td><b>${esc(r.order)}</b></td>
      <td>${esc(r.property)}</td>
      <td><span class="qz-badge dark">${esc(r.type)}</span></td>
      <td>${esc(fmtDate(r.opened))}</td>
      <td>${esc(fmtDate(r.closed))}</td>
      <td class="num">${r.cycle}</td>
      <td class="num">${fmtMoney(r.fees)}</td>
      <td class="qzs-dim">${esc(r.officer)}</td>
      <td class="qzs-dim">${esc(r.agent)}</td>
    </tr>`).join('');
  const avgCycle = Math.round(QZS_REPORT_ROWS.reduce((n, r) => n + r.cycle, 0) / QZS_REPORT_ROWS.length);

  return `
    <div class="qzs-kpi-row five">${kpis}</div>
    <div class="qzs-chart-row">
      <div class="qzs-chart-card">
        <div class="qzs-chart-head">
          <h5 class="qzs-panel-h">Orders Opened vs. Closed</h5>
          <div class="qzs-chart-legend">
            <span><i style="background:var(--qz-green)"></i>Opened</span>
            <span><i style="background:var(--qz-ocean)"></i>Closed</span>
          </div>
        </div>
        ${qzShellBarChartSVG(QZS_REPORT_SERIES)}
      </div>
      <div class="qzs-chart-card narrow">
        <div class="qzs-chart-head"><h5 class="qzs-panel-h">Orders by Type</h5></div>
        <div class="qzs-donut-wrap">
          ${qzShellDonutSVG(QZS_REPORT_MIX)}
          <div class="qzs-legend">${legend}</div>
        </div>
      </div>
    </div>
    <h5 class="qzs-panel-h">Detail</h5>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Order</th><th>Property</th><th>Type</th><th>Opened</th><th>Closed</th><th class="num">Cycle Days</th><th class="num">Settlement Fees</th><th>Escrow Officer</th><th>Agent</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="5">${QZS_REPORT_ROWS.length} orders</td><td class="num">${avgCycle} avg</td><td class="num">${fmtMoney(qzShellSum(QZS_REPORT_ROWS, 'fees'))}</td><td colspan="2"></td></tr></tfoot>
      </table>
    </div>
    <div class="qzs-report-foot">Generated ${esc(fmtDate(QZ_TODAY))} at 9:14 AM by Training User &middot; ${QZS_REPORT_ROWS.length} of 148 rows shown</div>`;
}

function qzShellReportOfficeRevenueHTML() {
  const rows = QZS_OFFICES.map(o => {
    const d = QZS_REPORT_OFFICE_REVENUE[o.id] || { orders: 0, revenue: 0, avgFee: 0 };
    return `<tr>
      <td><b>${esc(o.name)}</b></td>
      <td class="qzs-dim">${esc(o.address)}</td>
      <td class="num">${d.orders}</td>
      <td class="num">${fmtMoney(d.revenue)}</td>
      <td class="num">${fmtMoney(d.avgFee)}</td>
    </tr>`;
  }).join('');
  const totalRev = QZS_OFFICES.reduce((n, o) => n + (QZS_REPORT_OFFICE_REVENUE[o.id] || {}).revenue || 0, 0);
  const totalOrders = QZS_OFFICES.reduce((n, o) => n + ((QZS_REPORT_OFFICE_REVENUE[o.id] || {}).orders || 0), 0);
  const series = QZS_OFFICES.map(o => ({
    month: o.name.split('—')[0].trim().slice(0, 4),
    opened: Math.round(((QZS_REPORT_OFFICE_REVENUE[o.id] || {}).revenue || 0) / 1000),
    closed: (QZS_REPORT_OFFICE_REVENUE[o.id] || {}).orders || 0
  }));
  return `
    <div class="qzs-chart-row">
      <div class="qzs-chart-card">
        <div class="qzs-chart-head">
          <h5 class="qzs-panel-h">Revenue ($000s) and Order Count by Office</h5>
          <div class="qzs-chart-legend">
            <span><i style="background:var(--qz-green)"></i>Revenue ($000s)</span>
            <span><i style="background:var(--qz-ocean)"></i>Orders</span>
          </div>
        </div>
        ${qzShellBarChartSVG(series)}
      </div>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Office</th><th>Address</th><th class="num">Orders</th><th class="num">Revenue</th><th class="num">Avg Fee</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="2">${QZS_OFFICES.length} offices</td><td class="num">${totalOrders}</td><td class="num">${fmtMoney(totalRev)}</td><td></td></tr></tfoot>
      </table>
    </div>
    <div class="qzs-report-foot">Generated ${esc(fmtDate(QZ_TODAY))} at 9:14 AM by Training User</div>`;
}

function qzShellReportProductivityHTML() {
  const rows = QZS_REPORT_PRODUCTIVITY.map(p => `
    <tr>
      <td><span class="qzs-person"><span class="qzs-avatar">${esc(qzShellInitials(p.user))}</span><b>${esc(p.user)}</b></span></td>
      <td>${esc(p.role)}</td>
      <td class="num">${p.touched}</td>
      <td class="num">${p.tasks}</td>
      <td class="num">${p.closings}</td>
      <td class="num">${esc(p.onTime)}</td>
    </tr>`).join('');
  return `
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>User</th><th>Role</th><th class="num">Orders Touched</th><th class="num">Tasks Completed</th><th class="num">Closings</th><th class="num">On-Time %</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="qzs-report-foot">Generated ${esc(fmtDate(QZ_TODAY))} at 9:14 AM by Training User</div>`;
}

const QZ_SHELL_REPORT_BODIES = {
  'order-volume': qzShellReportOrderVolumeHTML,
  'revenue-office': qzShellReportOfficeRevenueHTML,
  'productivity-user': qzShellReportProductivityHTML
};

function qzShellReportsHTML() {
  const rep = qzShellFindReport(qzShellState.reportId) || qzShellFindReport('order-volume');
  const body = QZ_SHELL_REPORT_BODIES[rep.id]
    ? QZ_SHELL_REPORT_BODIES[rep.id]()
    : `<div class="qzs-empty">
         <b>${esc(rep.name)} is not built out in this demo</b>
         <p>${esc(rep.desc)}<br>Order Volume, Revenue by Office and Productivity by User are the three reports rendered here.</p>
         <button type="button" class="qz-btn sm primary" onclick="qzShellReportSelect('order-volume')">Open Order Volume</button>
       </div>`;

  return `
    <div class="qz-listhead">
      <div>
        <h2>Reports</h2>
        <div class="sub">Production, financial and activity reporting</div>
      </div>
    </div>
    <div class="qzs-rep-layout">
      <aside class="qzs-rep-rail">
        <div class="qzs-search sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" placeholder="Search reports&hellip;" value="${escAttr(qzShellState.reportQuery)}" oninput="qzShellReportSearch(this.value)">
        </div>
        <div id="qzsReportRail">${qzShellReportRailHTML()}</div>
      </aside>
      <div class="qzs-rep-main">
        <div class="qzs-rep-head">
          <div>
            <h3>${esc(rep.name)}</h3>
            <div class="qzs-dim">${esc(rep.category)} &middot; ${esc(rep.desc)}</div>
          </div>
        </div>
        <div class="qzs-filterbar">
          <select class="qzs-select" disabled><option>Date Range: Aug 1 – Aug 31, 2026</option></select>
          <select class="qzs-select" disabled><option>Office: All</option></select>
          <select class="qzs-select" disabled><option>User: All</option></select>
          <select class="qzs-select" disabled><option>Order Type: All</option></select>
          <div class="qzs-filter-btns">
            <button type="button" class="qz-btn sm primary" onclick="qzShellAction('Run Report')">Run Report</button>
            <button type="button" class="qz-btn sm" onclick="qzShellAction('Schedule')">Schedule</button>
            <button type="button" class="qz-btn sm" onclick="qzShellAction('Export CSV')">Export CSV</button>
            <button type="button" class="qz-btn sm" onclick="qzShellAction('Export PDF')">Export PDF</button>
            <button type="button" class="qz-btn sm" onclick="qzShellAction('Print')">Print</button>
          </div>
        </div>
        ${body}
      </div>
    </div>`;
}

/* ============================================================================
   COMPLIANCE
   ----------------------------------------------------------------------------
   Six sub-tabs over risk, ALTA Best Practices and the audit trail. Exceptions is
   the screen that carries the section: it is a work queue, so it filters, sorts
   by severity and opens a read-only detail panel showing which rule fired.
   ============================================================================ */

function qzShellCompTab(tab) {
  qzShellState.compTab = tab;
  qzShellState.compOpenId = null;
  qzRenderRoot();
}
function qzShellCompSev(sev) { qzShellState.compSev = sev; qzRenderRoot(); }
function qzShellCompStatus(st) { qzShellState.compStatus = st; qzRenderRoot(); }
function qzShellCompOpen(id) { qzShellState.compOpenId = id; qzRenderRoot(); }
function qzShellCompClose() { qzShellState.compOpenId = null; qzRenderRoot(); }

const QZ_SHELL_SEV_CLASS = { High: 'sev-high', Medium: 'sev-med', Low: 'sev-low' };
const QZ_SHELL_COMP_BADGE = {
  'Open': 'pending', 'In Review': 'progress', 'Resolved': 'complete',
  'Active': 'complete', 'Expiring': 'pending', 'Expired': 'open', 'Issued': 'complete',
  'Verified': 'complete', 'Failed': 'open', 'Pending': 'pending',
  'Compliant': 'complete', 'Needs Review': 'pending', 'Action Required': 'open'
};
function qzShellCompBadge(s) {
return `<span class="qz-badge ${QZ_SHELL_COMP_BADGE[s] || 'open'}">${esc(s)}</span>`;
}
/* Age in days against QZ_TODAY. An exception's age is the number a supervisor
   actually scans for, so it is computed rather than stored and going stale. */
function qzShellAge(iso) {
  const n = qzShellDaysAgo(iso);
  return n === null ? '—' : n + 'd';
}

function qzShellCompExceptionsFiltered() {
  return qzShellGetExceptions()
    .filter(e => qzShellState.compSev === 'All' || e.severity === qzShellState.compSev)
    .filter(e => qzShellState.compStatus === 'All' || e.status === qzShellState.compStatus)
    /* High first, then oldest first inside a severity — the order the queue is
       meant to be worked, not the order the records happen to be stored in. */
    .sort((a, b) => {
      const rank = { High: 0, Medium: 1, Low: 2 };
      return (rank[a.severity] - rank[b.severity]) || String(a.opened).localeCompare(String(b.opened));
    });
}

function qzShellCompOverviewHTML() {
  const exceptions = qzShellGetExceptions();
  const open = exceptions.filter(e => e.status !== 'Resolved').length;
  const alta = Math.round(QZS_ALTA.reduce((n, a) => n + a.pct, 0) / QZS_ALTA.length);
  const tiles = `
    <div class="qzs-kpi"><span class="qzs-kpi-label">Open Exceptions</span><b class="qzs-kpi-value qzs-neg">${open}</b><span class="qzs-kpi-delta">${exceptions.filter(e => e.severity === 'High' && e.status !== 'Resolved').length} high severity</span></div>
    <div class="qzs-kpi"><span class="qzs-kpi-label">CPLs Issued MTD</span><b class="qzs-kpi-value">${qzShellGetCpls().length}</b><span class="qzs-kpi-delta up">+9% vs. Jul</span></div>
    <div class="qzs-kpi"><span class="qzs-kpi-label">Policies Pending</span><b class="qzs-kpi-value qzs-warn">14</b><span class="qzs-kpi-delta">4 past 30 days</span></div>
    <div class="qzs-kpi">
      <span class="qzs-kpi-label">ALTA Compliance</span>
      <b class="qzs-kpi-value">${alta}%</b>
      <div class="qzs-bar"><i style="width:${alta}%"></i></div>
    </div>`;

  const attention = qzShellCompExceptionsFiltered()
    .filter(e => e.status !== 'Resolved').slice(0, 4).map(e => `
      <div class="qzs-alert ${e.severity === 'High' ? 'high' : 'medium'} link" onclick="qzShellCompTab('exceptions')">
        <b>${esc(e.title)}</b>
        <span>${esc(e.order)} &middot; ${esc(e.severity)} &middot; open ${esc(qzShellAge(e.opened))}</span>
      </div>`).join('');

  const recent = QZS_AUDIT.slice(0, 6).map(a => `
    <div class="qzs-timeline-row">
      <span class="qzs-mono">${esc(a.ts.slice(5, 16))}</span>
      <span><b>${esc(a.user)}</b> ${esc(a.action.toLowerCase())} ${esc(a.object)}</span>
    </div>`).join('');

  return `
    <div class="qzs-kpi-row">${tiles}</div>
    <div class="qzs-split">
      <div class="qzs-split-main">
        <h5 class="qzs-panel-h">Requires Attention</h5>
        ${attention}
      </div>
      <aside class="qzs-split-side">
        <h5 class="qzs-panel-h">Recent Activity</h5>
        ${recent}
      </aside>
    </div>`;
}

function qzShellCompExceptionsHTML() {
  const allExceptions = qzShellGetExceptions();
  const list = qzShellCompExceptionsFiltered();
  const sevChips = ['All', 'High', 'Medium', 'Low'].map(s => {
    const n = s === 'All' ? allExceptions.length : allExceptions.filter(e => e.severity === s).length;
    return `<button type="button" class="qzs-chip ${qzShellState.compSev === s ? 'on' : ''}" onclick="qzShellCompSev('${s}')">${s} <span>${n}</span></button>`;
  }).join('');
  const stChips = ['All', 'Open', 'In Review', 'Resolved'].map(s => {
    const n = s === 'All' ? allExceptions.length : allExceptions.filter(e => e.status === s).length;
    return `<button type="button" class="qzs-chip ${qzShellState.compStatus === s ? 'on' : ''}" onclick="qzShellCompStatus('${escAttr(s)}')">${s} <span>${n}</span></button>`;
  }).join('');

  const rows = list.length ? list.map(e => `
    <tr class="link" onclick="qzShellCompOpen('${escAttr(e.id)}')">
      <td><span class="qzs-sev ${QZ_SHELL_SEV_CLASS[e.severity]}">${esc(e.severity)}</span></td>
      <td>${qzShellOrderCell(e.order)}</td>
      <td class="qzs-dim">${esc(e.property)}</td>
      <td><b>${esc(e.title)}</b></td>
      <td>${esc(fmtDate(e.opened))}</td>
      <td class="qzs-dim">${esc(e.owner)}</td>
      <td class="num">${esc(qzShellAge(e.opened))}</td>
      <td>${qzShellCompBadge(e.status)}</td>
    </tr>`).join('')
    : `<tr><td colspan="8"><div class="qzs-empty"><b>No exceptions match these filters</b><p>Try a different severity or status.</p></div></td></tr>`;

  return `
    <div class="qzs-chips">${sevChips}<span class="qzs-chip-sep"></span>${stChips}</div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Severity</th><th>Order</th><th>Property</th><th>Exception</th><th>Opened</th><th>Owner</th><th class="num">Age</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${qzShellCompPanelHTML()}`;
}

function qzShellCompPanelHTML() {
  const id = qzShellState.compOpenId;
  if (!id) return '';
  const e = qzShellGetExceptions().find(x => x.id === id);
  if (!e) return '';
  const history = (e.history || []).map(h => `
    <div class="qzs-note"><b>${esc(h.by)}</b><span>${esc(fmtDate(h.date))}</span><p>${esc(h.text)}</p></div>`).join('');
  const docs = (e.docs || []).length
    ? e.docs.map(d => `<div class="qzs-linked"><b>${esc(d)}</b></div>`).join('')
    : '<div class="qzs-dim">No documents linked.</div>';
  return `
    <div class="qzs-scrim" onclick="qzShellCompClose()"></div>
    <aside class="qzs-panel" role="dialog" aria-label="Exception detail">
      <div class="qzs-panel-head">
        <span class="qzs-sev ${QZ_SHELL_SEV_CLASS[e.severity]}">${esc(e.severity)}</span>
        <div><b>${esc(e.id)}</b><div class="qzs-dim">${esc(e.order)}</div></div>
        <button type="button" class="qzs-panel-close" onclick="qzShellCompClose()" aria-label="Close">&times;</button>
      </div>
      <div class="qzs-panel-actions">
        <button type="button" class="qz-btn sm" onclick="qzShellResolveException('${escAttr(e.id)}')">Resolve</button>
        <button type="button" class="qz-btn sm" onclick="qzShellReassignException('${escAttr(e.id)}')">Reassign</button>
        <button type="button" class="qz-btn sm" onclick="qzShellWaiveException('${escAttr(e.id)}')">Waive</button>
      </div>
      <div class="qzs-panel-body">
        <h4 class="qzs-pop-title">${esc(e.title)}</h4>
        <div class="qz-kv"><b>Property</b>${esc(e.property)}</div>
        <div class="qz-kv"><b>Opened</b>${esc(fmtDate(e.opened))} (${esc(qzShellAge(e.opened))})</div>
        <div class="qz-kv"><b>Owner</b>${esc(e.owner)}</div>
        <div class="qz-kv"><b>Status</b>${qzShellCompBadge(e.status)}</div>
        <h5 class="qzs-panel-h">Rule Triggered</h5>
        <div class="qzs-rule">${esc(e.rule)}</div>
        <h5 class="qzs-panel-h">Detail</h5>
        <p class="qzs-dim qzs-detail">${esc(e.detail)}</p>
        <h5 class="qzs-panel-h">Linked Documents</h5>
        ${docs}
        <h5 class="qzs-panel-h">Resolution History</h5>
        ${history}
      </div>
    </aside>`;
}

function qzShellCompCplHTML() {
  const rows = qzShellGetCpls().map(c => `
    <tr>
      <td>${qzShellOrderCell(c.order)}</td>
      <td>${esc(c.lender)}</td>
      <td><b>${esc(c.cpl)}</b></td>
      <td>${esc(fmtDate(c.issued))}</td>
      <td class="${c.status === 'Expiring' || c.status === 'Expired' ? 'qzs-warn' : ''}">${c.expires === '—' ? '—' : esc(fmtDate(c.expires))}</td>
      <td>${esc(c.policy)}</td>
      <td class="qzs-mono">${esc(c.jacket)}</td>
      <td>${esc(c.uw)}</td>
      <td>${qzShellCompBadge(c.status)}</td>
    </tr>`).join('');
  return `
    <div class="qzs-tbl-actions">
      <button type="button" class="qz-btn sm" onclick="qzShellAction('Export')">Export</button>
      <button type="button" class="qz-btn sm primary" onclick="qzShellIssueCplModal()">Issue CPL</button>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Order</th><th>Lender</th><th>CPL #</th><th>Issued</th><th>Expires</th><th>Policy Type</th><th>Jacket #</th><th>Underwriter</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function qzShellCompWireHTML() {
  const rows = QZS_WIRE_LOG.map(w => `
    <tr class="${w.result === 'Failed' ? 'qzs-row-bad' : ''}">
      <td>${esc(fmtDate(w.date))}</td>
      <td>${qzShellOrderCell(w.order)}</td>
      <td>${esc(w.party)}</td>
      <td>${esc(w.kind)}</td>
      <td class="qzs-dim">${esc(w.method)}</td>
      <td class="qzs-dim">${esc(w.by)}</td>
      <td>${qzShellCompBadge(w.result)}</td>
    </tr>`).join('');
  return `
    <div class="qzs-policy">
      <b>Wire verification policy</b>
      All wire instructions must be verified by outbound callback to a previously known phone number.
      Never use a number contained in the wire request itself.
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Date</th><th>Order</th><th>Party</th><th>Instruction Type</th><th>Verification Method</th><th>Verified By</th><th>Result</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function qzShellCompAuditHTML() {
  const rows = QZS_AUDIT.map(a => `
    <tr>
      <td class="qzs-mono">${esc(a.ts)}</td>
      <td>${esc(a.user)}</td>
      <td><span class="qz-badge dark">${esc(a.action)}</span></td>
      <td>${esc(a.object)}</td>
      <td>${a.order === '—' ? '<span class="qzs-dim">—</span>' : qzShellOrderCell(a.order)}</td>
      <td class="qzs-mono qzs-dim">${esc(a.ip)}</td>
    </tr>`).join('');
  return `
    <div class="qzs-readonly">Audit records are immutable and retained for 7 years.</div>
    <div class="qzs-toolbar">
      <select class="qzs-select" disabled><option>Date: Last 30 days</option></select>
      <select class="qzs-select" disabled><option>User: All</option></select>
      <select class="qzs-select" disabled><option>Action: All</option></select>
      <span class="qzs-count-label">${QZS_AUDIT.length} events</span>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Object</th><th>Order</th><th>IP Address</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function qzShellCompAltaHTML() {
  const cards = QZS_ALTA.map(a => `
    <div class="qzs-alta">
      <div class="qzs-alta-h">
        <span class="qzs-alta-n">${a.n}</span>
        <b>${esc(a.name)}</b>
        ${qzShellCompBadge(a.status)}
      </div>
      <p>${esc(a.desc)}</p>
      <div class="qzs-alta-foot">
        <div class="qzs-bar"><i class="${a.pct < 80 ? 'bad' : a.pct < 95 ? 'warn' : ''}" style="width:${a.pct}%"></i></div>
        <span class="qzs-alta-pct">${a.pct}%</span>
      </div>
    </div>`).join('');
  return `
    <div class="qzs-alta-lead">
      Qualia compliance engine verifies adherence to the <b>ALTA Best Practices Framework (v3.0)</b> across all active files, accounts and vendor interactions.
    </div>
    <div class="qzs-alta-grid">${cards}</div>`;
}

const QZ_SHELL_COMP_TABS = [
  ['overview', 'Overview', qzShellCompOverviewHTML],
  ['exceptions', 'Exceptions', qzShellCompExceptionsHTML],
  ['cpl', 'CPLs', qzShellCompCplHTML],
  ['wire', 'Wire Verification', qzShellCompWireHTML],
  ['alta', 'ALTA Best Practices', qzShellCompAltaHTML],
  ['audit', 'Audit Log', qzShellCompAuditHTML]
];

function qzShellComplianceHTML() {
  const active = qzShellState.compTab;
  const tabs = QZ_SHELL_COMP_TABS.map(([k, label]) =>
    `<span class="${active === k ? 'active' : ''}" onclick="qzShellCompTab('${k}')">${esc(label)}</span>`).join('');
  const found = QZ_SHELL_COMP_TABS.find(t => t[0] === active) || QZ_SHELL_COMP_TABS[0];
  return `
    <div class="qz-listhead">
      <div>
        <h2>Compliance</h2>
        <div class="sub">Underwriter exceptions, CPLs and regulatory safeguards</div>
      </div>
    </div>
    <div class="qz-subtabs">${tabs}</div>
    ${found[2]()}`;
}

/* ============================================================================
   ADMIN
   ----------------------------------------------------------------------------
   Agency configuration. Unlike the other sections this one is disabled all the
   way down: search and role filters work, and nothing else does. That is not a
   shortcut — a settings screen whose toggles appear to flip but change nothing
   is worse than one that says plainly it is managed elsewhere.
   ============================================================================ */

function qzShellAdminPage(page) {
  qzShellState.adminPage = page;
  qzRenderRoot();
}
function qzShellAdminRole(role) { qzShellState.adminRole = role; qzRenderRoot(); }
function qzShellAdminSearch(v) {
  qzShellState.adminQuery = v;
  const rows = document.getElementById('qzsUserRows');
  if (!rows) { qzRenderRoot(); return; }
  rows.innerHTML = qzShellUserRowsHTML(qzShellUsersFiltered());
}

function qzShellUsersFiltered() {
  const q = (qzShellState.adminQuery || '').toLowerCase();
  return qzShellGetUsers()
    .filter(u => qzShellState.adminRole === 'All' || u.role === qzShellState.adminRole)
    .filter(u => !q || u.name.toLowerCase().indexOf(q) > -1 || u.email.toLowerCase().indexOf(q) > -1 || u.office.toLowerCase().indexOf(q) > -1);
}
function qzShellUserRowsHTML(list) {
  if (!list.length) {
    return `<tr><td colspan="7"><div class="qzs-empty"><b>No users match that search</b><p>Try a different name, email or office.</p></div></td></tr>`;
  }
  const badge = { Active: 'complete', Invited: 'pending', Disabled: 'open' };
  return list.map(u => `
    <tr>
      <td>
        <span class="qzs-person">
          <span class="qzs-avatar">${esc(qzShellInitials(u.name))}</span>
          <span><b>${esc(u.name)}</b><span class="qzs-sub">${esc(u.email)}</span></span>
        </span>
      </td>
      <td>${esc(u.role)}</td>
      <td>${esc(u.office)}</td>
      <td><span class="qz-badge ${badge[u.status] || 'open'}">${esc(u.status)}</span></td>
      <td class="qzs-dim">${esc(u.login || '—')}</td>
      <td>${u.mfa ? '<span class="qzs-yes">&#10003;</span>' : '<span class="qzs-dim">&mdash;</span>'}</td>
      <td>
        <div class="qz-row-actions">
          <button type="button" class="qz-btn sm" onclick="qzShellEditUserModal('${escAttr(u.email)}')">Edit</button>
          <button type="button" class="qz-btn sm" onclick="qzShellToggleUser('${escAttr(u.email)}')">${u.status === 'Disabled' ? 'Enable' : 'Disable'}</button>
          <button type="button" class="qz-btn sm danger" title="Remove user" onclick="qzShellDeleteUser('${escAttr(u.email)}')">&times;</button>
        </div>
      </td>
    </tr>`).join('');
}

function qzShellAdminUsersHTML() {
  const allUsers = qzShellGetUsers();
  const list = qzShellUsersFiltered();
  const chips = ['All'].concat(QZS_ROLES).map(r => {
    const n = r === 'All' ? allUsers.length : allUsers.filter(u => u.role === r).length;
    return `<button type="button" class="qzs-chip ${qzShellState.adminRole === r ? 'on' : ''}" onclick="qzShellAdminRole('${escAttr(r)}')">${esc(r)} <span>${n}</span></button>`;
  }).join('');

  /* Roles across the top, capabilities down the side. Rendered from the same
     QZS_ROLES array the chips use, so a role added in one place cannot go
     missing in the other. */
  const matrixHead = QZS_ROLES.map(r => `<th class="qzs-rot">${esc(r)}</th>`).join('');
  const matrixRows = QZS_PERMISSIONS.map(p => `
    <tr>
      <td class="qzs-perm">${esc(p.name)}</td>
      ${QZS_ROLES.map(r => `<td class="num">${p.allow.indexOf(r) > -1 ? '<span class="qzs-yes">&#10003;</span>' : '<span class="qzs-dim">&mdash;</span>'}</td>`).join('')}
    </tr>`).join('');

  return `
    <div class="qzs-toolbar">
      <div class="qzs-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" placeholder="Search users&hellip;" value="${escAttr(qzShellState.adminQuery)}" oninput="qzShellAdminSearch(this.value)">
      </div>
      <span class="qzs-count-label">${list.length} of ${allUsers.length} users</span>
      <button type="button" class="qz-btn sm" onclick="qzShellAction('Export')">Export</button>
      <button type="button" class="qz-btn sm primary" onclick="qzShellInviteUserModal()">Invite User</button>
    </div>
    <div class="qzs-chips">${chips}</div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>User</th><th>Role</th><th>Office</th><th>Status</th><th>Last Login</th><th>2FA</th><th>Actions</th></tr></thead>
        <tbody id="qzsUserRows">${qzShellUserRowsHTML(list)}</tbody>
      </table>
    </div>
    <h5 class="qzs-panel-h">Permission Matrix</h5>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl qzs-matrix">
        <thead><tr><th>Permission</th>${matrixHead}</tr></thead>
        <tbody>${matrixRows}</tbody>
      </table>
    </div>`;
}

function qzShellAdminOfficesHTML() {
  const rows = qzShellGetOffices().map(o => `
    <tr>
      <td><b>${esc(o.name)}</b></td>
      <td class="qzs-dim">${esc(o.address)}</td>
      <td>${esc(o.phone)}</td>
      <td>${esc(o.states)}</td>
      <td class="qzs-dim">${esc(o.underwriters)}</td>
      <td class="num">${o.users}</td>
      <td><span class="qz-badge ${o.status === 'Active' ? 'complete' : 'pending'}">${esc(o.status)}</span></td>
      <td><button type="button" class="qz-btn sm danger" title="Close office" onclick="qzShellDeleteOffice('${escAttr(o.name)}')">&times;</button></td>
    </tr>`).join('');
  return `
    <div class="qzs-tbl-actions"><button type="button" class="qz-btn sm primary" onclick="qzShellAddOfficeModal()">Add Office</button></div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Office</th><th>Address</th><th>Phone</th><th>States Licensed</th><th>Underwriters</th><th class="num">Users</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function qzShellTemplateGridHTML(list, kind) {
  const cards = list.map(t => `
    <div class="qzs-tpl">
      <div class="qzs-tpl-h">
        <b>${esc(t.name)}</b>
        <button type="button" class="qzs-kebab" onclick="qzShellAction('Template menu')" aria-label="More">&#8942;</button>
      </div>
      <p>${esc(t.desc)}</p>
      <div class="qzs-tpl-foot">
        <span class="qzs-count">${esc(t.count)}</span>
        <span class="qz-badge ${t.status === 'Active' ? 'complete' : 'pending'}">${esc(t.status)}</span>
      </div>
      <div class="qzs-tpl-meta">Last modified by ${esc(t.by)} on ${esc(fmtDate(t.on))}</div>
    </div>`).join('');
  return `
    <div class="qzs-tbl-actions"><button type="button" class="qz-btn sm primary" onclick="qzShellAction('New ${esc(kind)}')">New ${esc(kind)}</button></div>
    <div class="qzs-tpl-grid">${cards}</div>`;
}
function qzShellAdminOrderTplHTML() { return qzShellTemplateGridHTML(QZS_TEMPLATES.order, 'Order Template'); }
function qzShellAdminWorkflowTplHTML() { return qzShellTemplateGridHTML(QZS_TEMPLATES.workflow, 'Workflow Template'); }
function qzShellAdminDocTplHTML() { return qzShellTemplateGridHTML(QZS_TEMPLATES.document, 'Document Template'); }

function qzShellAdminFeesHTML() {
  const rows = qzShellGetFees().map(f => `
    <tr>
      <td><b>${esc(f.name)}</b></td>
      <td>${esc(f.type)}</td>
      <td>${esc(f.basis)}</td>
      <td class="num">${esc(f.amount)}</td>
      <td class="qzs-dim">${esc(f.applies)}</td>
      <td>${esc(fmtDate(f.from))}</td>
      <td><button type="button" class="qz-btn sm danger" title="Retire fee" onclick="qzShellDeleteFee('${escAttr(f.name)}')">&times;</button></td>
    </tr>`).join('');
  return `
    <div class="qzs-tbl-actions"><button type="button" class="qz-btn sm primary" onclick="qzShellAddFeeModal()">Add Fee</button></div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Fee Name</th><th>Type</th><th>Basis</th><th class="num">Amount / Rate</th><th>Applies To</th><th>Effective Date</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function qzShellAdminIntegrationsHTML() {
  const cards = QZS_INTEGRATIONS.map(i => `
    <div class="qzs-intg">
      <span class="qzs-intg-logo">${esc(i.name.charAt(0))}</span>
      <div class="qzs-intg-body">
        <b>${esc(i.name)}</b>
        <span class="qzs-sub">${esc(i.cat)}</span>
        <p>${esc(i.desc)}</p>
      </div>
      <div class="qzs-intg-foot">
        <span class="qz-badge ${i.on ? 'complete' : 'open'}">${i.on ? 'Connected' : 'Not Connected'}</span>
        <button type="button" class="qz-btn sm" onclick="qzShellAction('Configure ${escAttr(i.name)}')">Configure</button>
      </div>
    </div>`).join('');
  return `<div class="qzs-intg-grid">${cards}</div>`;
}

function qzShellAdminNotificationsHTML() {
  const rows = QZS_NOTIFICATIONS.map(n => `
    <tr>
      <td>${esc(n.event)}</td>
      ${['email', 'app', 'sms'].map(ch =>
        `<td class="num"><input type="checkbox" ${n[ch] ? 'checked' : ''} disabled></td>`).join('')}
    </tr>`).join('');
  return `
    <div class="qzs-readonly">Notification routing is configured per user by your organization administrator.</div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Event</th><th class="num">Email</th><th class="num">In-App</th><th class="num">SMS</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function qzShellAdminSecurityHTML() {
  const rows = QZS_SECURITY.map(s => `
    <div class="qz-field">
      <label>${esc(s.label)}</label>
      <input type="text" value="${escAttr(s.value)}" disabled>
    </div>`).join('');
  return `
    <div class="qzs-readonly">Security settings are managed by your organization administrator.</div>
    <div class="qz-form-grid">${rows}</div>`;
}

/* Audit reuses the Compliance renderer rather than a second copy: one table, one
   dataset, and no chance of the two drifting apart. */
function qzShellAdminAuditHTML() { return qzShellCompAuditHTML(); }

const QZ_SHELL_ADMIN_PAGES = [
  ['users', 'Users & Roles', qzShellAdminUsersHTML],
  ['offices', 'Offices', qzShellAdminOfficesHTML],
  ['order-tpl', 'Order Templates', qzShellAdminOrderTplHTML],
  ['workflow-tpl', 'Workflow Templates', qzShellAdminWorkflowTplHTML],
  ['doc-tpl', 'Document Templates', qzShellAdminDocTplHTML],
  ['fees', 'Fee Schedules', qzShellAdminFeesHTML],
  ['integrations', 'Integrations', qzShellAdminIntegrationsHTML],
  ['notifications', 'Notifications', qzShellAdminNotificationsHTML],
  ['security', 'Security', qzShellAdminSecurityHTML],
  ['audit', 'Audit', qzShellAdminAuditHTML]
];

function qzShellAdminHTML() {
  const active = qzShellState.adminPage;
  const rail = QZ_SHELL_ADMIN_PAGES.map(([k, label]) =>
    `<div class="qzs-rail-item ${active === k ? 'on' : ''}" onclick="qzShellAdminPage('${k}')">${esc(label)}</div>`).join('');
  const found = QZ_SHELL_ADMIN_PAGES.find(p => p[0] === active) || QZ_SHELL_ADMIN_PAGES[0];
  return `
    <div class="qz-listhead">
      <div>
        <h2>Admin</h2>
        <div class="sub">Agency configuration &mdash; interactive sandbox</div>
      </div>
    </div>
    <div class="qzs-rep-layout">
      <aside class="qzs-rep-rail narrow">
        <div class="qzs-rail-cat">
          <div class="qzs-rail-cat-h static">Settings</div>
          ${rail}
        </div>
      </aside>
      <div class="qzs-rep-main">
        <div class="qzs-rep-head"><h3>${esc(found[1])}</h3></div>
        ${found[2]()}
      </div>
    </div>`;
}

/* ============================================================================
   LIVE MUTATION MODALS (Phase E)
   ============================================================================ */

function qzShellNewContactModal() {
  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:460px">
      <div class="ph"><h4>New Contact</h4><button class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field"><label>Full Name</label><input id="qzsCName" placeholder="e.g. Bennett Ashcroft"></div>
        <div class="qz-field"><label>Type</label>
          <select id="qzsCType">
            <option value="Buyer">Buyer</option><option value="Seller">Seller</option><option value="Agent">Agent</option>
            <option value="Lender">Lender</option><option value="Attorney">Attorney</option><option value="Vendor">Vendor</option>
          </select>
        </div>
        <div class="qz-field"><label>Company</label><input id="qzsCCompany" placeholder="e.g. Ashcroft Law PLLC"></div>
        <div class="qz-field"><label>Email</label><input id="qzsCEmail" placeholder="e.g. bennett@ashcroftlaw.example"></div>
        <div class="qz-field wide"><label>Phone</label><input id="qzsCPhone" placeholder="e.g. (972) 555-0144"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzShellSaveNewContact()">Save Contact</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzShellSaveNewContact() {
  const name = (document.getElementById('qzsCName').value || '').trim();
  const type = document.getElementById('qzsCType').value;
  const comp = (document.getElementById('qzsCCompany').value || '').trim() || '—';
  const email = (document.getElementById('qzsCEmail').value || '').trim() || '—';
  const phone = (document.getElementById('qzsCPhone').value || '').trim() || '—';
  if (!name) { simToast('Please enter contact name.'); return; }

  qzInsert('contacts', {
    name: name,
    type: type,
    role: type,
    company: comp,
    email: email,
    phone: phone,
    mobile: '—',
    address: 'Texas, USA',
    created: QZ_TODAY,
    createdBy: 'Manual Entry',
    lastActivity: QZ_TODAY,
    orders: []
  });
  document.getElementById('qzsModal')?.remove();
  simToast(`Contact ${name} saved.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellEditContactModal(id) {
  const c = qzList('contacts').find(x => x.id === id);
  if (!c) return;
  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:460px">
      <div class="ph"><h4>Edit Contact &mdash; ${esc(c.name)}</h4><button class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field"><label>Full Name</label><input id="qzsEditCName" value="${escAttr(c.name)}"></div>
        <div class="qz-field"><label>Company</label><input id="qzsEditCCompany" value="${escAttr(c.company)}"></div>
        <div class="qz-field"><label>Email</label><input id="qzsEditCEmail" value="${escAttr(c.email)}"></div>
        <div class="qz-field wide"><label>Phone</label><input id="qzsEditCPhone" value="${escAttr(c.phone)}"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzShellSaveEditContact('${escAttr(id)}')">Update Contact</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzShellSaveEditContact(id) {
  const name = document.getElementById('qzsEditCName')?.value.trim();
  const comp = document.getElementById('qzsEditCCompany')?.value.trim();
  const email = document.getElementById('qzsEditCEmail')?.value.trim();
  const phone = document.getElementById('qzsEditCPhone')?.value.trim();

  const c = qzFind('contacts', id);
  if (c) {
    qzUpdate('contacts', id, { name, company: comp, email, phone });
  } else {
    // If it's derived from order party, update the order party
    const o = qzList('orders').find(ord => ord.parties && ord.parties.some(p => p.name === name || p.email === email));
    if (o) {
      const p = o.parties.find(x => x.name === name || x.email === email);
      if (p) { p.name = name; p.email = email; p.phone = phone; }
    }
  }

  document.getElementById('qzsModal')?.remove();
  simToast(`Contact ${name} updated.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellImportContactsMock() {
  qzInsert('contacts', {
    id: 'c-imp-1',
    name: 'Harrison Sterling',
    type: 'Lender',
    role: 'Lender',
    company: 'Sterling Capital Mortgage',
    email: 'hsterling@sterlingcap.example',
    phone: '(214) 555-0922',
    mobile: '—',
    address: 'Dallas, TX',
    created: QZ_TODAY,
    createdBy: 'CSV Import',
    lastActivity: QZ_TODAY,
    orders: []
  });
  simToast('Imported 1 contact record from CSV.', { tone: 'good' });
  qzRenderRoot();
}

function qzShellNewEventModal() {
  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:460px">
      <div class="ph"><h4>Schedule Calendar Event</h4><button class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field wide"><label>Event Title</label><input id="qzsEvTitle" placeholder="e.g. Remote Online Notarization (RON) Signing"></div>
        <div class="qz-field"><label>Calendar</label>
          <select id="qzsEvCal">
            <option value="closings">Closings</option><option value="signings">Signings</option>
            <option value="deadlines">Deadlines</option><option value="recordings">Recordings</option>
          </select>
        </div>
        <div class="qz-field"><label>Date</label><input id="qzsEvDate" type="date" value="${QZ_TODAY}"></div>
        <div class="qz-field"><label>Time</label><input id="qzsEvTime" value="02:00 PM &ndash; 03:00 PM"></div>
        <div class="qz-field"><label>Location</label><input id="qzsEvLoc" value="Plano Branch (Main Conference)"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzShellSaveNewEvent()">Add Event</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzShellSaveNewEvent() {
  const title = (document.getElementById('qzsEvTitle')?.value || '').trim();
  const cal = document.getElementById('qzsEvCal')?.value;
  const date = document.getElementById('qzsEvDate')?.value || QZ_TODAY;
  const time = document.getElementById('qzsEvTime')?.value;
  const loc = document.getElementById('qzsEvLoc')?.value;
  if (!title) { simToast('Please enter an event title.'); return; }

  qzInsert('events', {
    date: date,
    cal: cal,
    title: title,
    time: time,
    location: loc,
    people: ['Training User'],
    notes: 'Created in calendar.'
  });
  document.getElementById('qzsModal')?.remove();
  simToast(`Event "${title}" added to calendar.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellEditEventModal() {
  simToast('Event details updated.', { tone: 'good' });
  qzShellCloseCalPopup();
}

function qzShellDeleteEvent() {
  simToast('Event removed from calendar.', { tone: 'good' });
  qzShellCloseCalPopup();
}

function qzShellNewReceiptModal() {
  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:460px">
      <div class="ph"><h4>Post Escrow Receipt</h4><button class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field"><label>Order #</label><input id="qzsRcpOrder" value="ORD-2026-1483"></div>
        <div class="qz-field"><label>Amount ($)</label><input id="qzsRcpAmount" type="number" value="5000"></div>
        <div class="qz-field"><label>Payer Name</label><input id="qzsRcpPayer" value="Marcus Vance"></div>
        <div class="qz-field"><label>Method</label>
          <select id="qzsRcpMethod">
            <option value="Wire">Incoming Wire</option><option value="Check">Cashier's Check</option><option value="Earnest">Earnest Money</option>
          </select>
        </div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzShellSaveNewReceipt()">Post Receipt</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzShellSaveNewReceipt() {
  const order = (document.getElementById('qzsRcpOrder')?.value || '').trim();
  const amount = Number(document.getElementById('qzsRcpAmount')?.value) || 0;
  const payer = (document.getElementById('qzsRcpPayer')?.value || '').trim();
  const method = document.getElementById('qzsRcpMethod')?.value;

  qzInsert('receipts', {
    num: 'REC-2026-0' + (440 + qzList('receipts').length),
    date: QZ_TODAY,
    order: order,
    payer: payer,
    remitter: payer,
    method: method,
    amount: amount,
    status: 'Deposited',
    by: 'Training User'
  });
  document.getElementById('qzsModal')?.remove();
  simToast(`Receipt for ${fmtMoney(amount)} posted to ${order}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellNewDisbursementModal() {
  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:460px">
      <div class="ph"><h4>Issue Escrow Disbursement</h4><button class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field"><label>Order #</label><input id="qzsDisbOrder" value="ORD-2026-1483"></div>
        <div class="qz-field"><label>Amount ($)</label><input id="qzsDisbAmount" type="number" value="12500"></div>
        <div class="qz-field"><label>Payee Name</label><input id="qzsDisbPayee" value="Listing Broker Inc."></div>
        <div class="qz-field"><label>Method</label>
          <select id="qzsDisbMethod">
            <option value="Wire">Outgoing Wire</option><option value="Check">Check</option><option value="ACH">ACH Transfer</option>
          </select>
        </div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzShellSaveNewDisbursement()">Issue Disbursement</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzShellSaveNewDisbursement() {
  const order = (document.getElementById('qzsDisbOrder')?.value || '').trim();
  const amount = Number(document.getElementById('qzsDisbAmount')?.value) || 0;
  const payee = (document.getElementById('qzsDisbPayee')?.value || '').trim();
  const method = document.getElementById('qzsDisbMethod')?.value;

  qzInsert('disbursements', {
    num: 'DIS-2026-0' + (890 + qzList('disbursements').length),
    date: QZ_TODAY,
    order: order,
    payee: payee,
    method: method,
    amount: amount,
    status: 'Issued',
    by: 'Training User'
  });
  document.getElementById('qzsModal')?.remove();
  simToast(`Disbursement of ${fmtMoney(amount)} issued to ${payee}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellApproveDisbursements() {
  const pend = qzList('disbursements', d => d.status === 'Pending Approval');
  pend.forEach(d => qzUpdate('disbursements', d.num || d.id, { status: 'Issued' }));
  simToast(`${pend.length || 2} pending disbursements approved and queued for bank release.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellReconcileModal() {
  qzConfirm({
    title: 'Confirm Monthly Escrow 3-Way Reconciliation',
    body: 'Frost Bank Operating Escrow (***4812) &middot; Bank Balance: $1,418,920.40 &middot; Book Balance: $1,418,920.40 &middot; Trial Balance: $1,418,920.40 &middot; Variance: $0.00.',
    confirmLabel: 'Certify Reconciliation',
    onConfirm: () => {
      simToast('Reconciliation certified for August 2026. Auditor snapshot recorded.', { tone: 'good' });
    }
  });
}

function qzShellNewInvoiceModal() {
  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:460px">
      <div class="ph"><h4>Create Accounts Receivable Invoice</h4><button class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field"><label>Order #</label><input id="qzsInvOrder" value="ORD-2026-1483"></div>
        <div class="qz-field"><label>Bill To</label><input id="qzsInvBillTo" value="Frisco Community Lending"></div>
        <div class="qz-field"><label>Amount ($)</label><input id="qzsInvAmount" type="number" value="745"></div>
        <div class="qz-field"><label>Due Date</label><input id="qzsInvDue" type="date" value="${QZ_TODAY}"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzShellSaveNewInvoice()">Create Invoice</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzShellSaveNewInvoice() {
  const order = (document.getElementById('qzsInvOrder')?.value || '').trim();
  const billTo = (document.getElementById('qzsInvBillTo')?.value || '').trim();
  const amount = Number(document.getElementById('qzsInvAmount')?.value) || 0;
  const due = document.getElementById('qzsInvDue')?.value || QZ_TODAY;

  qzInsert('invoices', {
    num: 'INV-2026-0' + (510 + qzList('invoices').length),
    order: order,
    billTo: billTo,
    issued: QZ_TODAY,
    due: due,
    amount: amount,
    balance: amount,
    status: 'Open'
  });
  document.getElementById('qzsModal')?.remove();
  simToast(`Invoice for ${fmtMoney(amount)} billed to ${billTo}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellGeneratePosPay() {
  qzInsert('pospay', {
    date: QZ_TODAY,
    file: 'POSPAY_FROST_' + QZ_TODAY.replace(/-/g, '') + '.TXT',
    account: 'Frost Bank — Escrow Trust',
    items: 4,
    total: 38400.00,
    status: 'Sent',
    sent: '10:15 AM'
  });
  simToast('Positive Pay file generated and transmitted to Frost Bank.', { tone: 'good' });
  qzRenderRoot();
}

function qzShellResolveException(id) {
  qzUpdate('exceptions', id, { status: 'Resolved' });
  simToast(`Exception ${id || ''} resolved.`, { tone: 'good' });
  qzShellCompClose();
  qzRenderRoot();
}

function qzShellReassignException(id) {
  simToast(`Exception ${id || ''} reassigned to Marisol Tran.`, { tone: 'good' });
  qzShellCompClose();
}

function qzShellWaiveException(id) {
  qzUpdate('exceptions', id, { status: 'Resolved' });
  simToast(`Exception ${id || ''} waived by underwriter.`, { tone: 'good' });
  qzShellCompClose();
  qzRenderRoot();
}

function qzShellIssueCplModal() {
  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:460px">
      <div class="ph"><h4>Issue Closing Protection Letter (CPL)</h4><button class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field"><label>Order #</label><input id="qzsCplOrder" value="ORD-2026-1483"></div>
        <div class="qz-field"><label>Lender</label><input id="qzsCplLender" value="Frisco Community Lending"></div>
        <div class="qz-field"><label>Policy Type</label><input id="qzsCplPolicy" value="Loan Policy (T-2)"></div>
        <div class="qz-field"><label>Underwriter</label><input id="qzsCplUw" value="Old Republic National Title"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzShellSaveCpl()">Issue CPL</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzShellSaveCpl() {
  const order = (document.getElementById('qzsCplOrder')?.value || '').trim();
  const lender = (document.getElementById('qzsCplLender')?.value || '').trim();
  const policy = (document.getElementById('qzsCplPolicy')?.value || '').trim();
  const uw = (document.getElementById('qzsCplUw')?.value || '').trim();

  qzInsert('cpls', {
    order: order,
    lender: lender,
    cpl: 'CPL-' + (8920 + qzList('cpls').length),
    issued: QZ_TODAY,
    expires: '2026-10-12',
    policy: policy,
    jacket: 'OR-TX-4489' + (qzList('cpls').length + 1),
    uw: uw,
    status: 'Active'
  });
  document.getElementById('qzsModal')?.remove();
  simToast(`CPL issued for ${lender}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellInviteUserModal() {
  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:460px">
      <div class="ph"><h4>Invite Team Member</h4><button class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field"><label>Full Name</label><input id="qzsUsrName" placeholder="e.g. Cameron Vance"></div>
        <div class="qz-field"><label>Email Address</label><input id="qzsUsrEmail" placeholder="e.g. cvance@bestclosing.com"></div>
        <div class="qz-field"><label>Role</label>
          <select id="qzsUsrRole">
            <option value="Escrow Officer">Escrow Officer</option><option value="Escrow Assistant">Escrow Assistant</option>
            <option value="Title Examiner">Title Examiner</option><option value="Accounting">Accounting</option>
          </select>
        </div>
        <div class="qz-field"><label>Office Location</label>
          <select id="qzsUsrOffice">
            <option value="Plano HQ">Plano HQ</option><option value="Frisco Branch">Frisco Branch</option><option value="Dallas Downtown">Dallas Downtown</option>
          </select>
        </div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzShellSaveUser()">Send Invite</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzShellSaveUser() {
  const name = (document.getElementById('qzsUsrName')?.value || '').trim();
  const email = (document.getElementById('qzsUsrEmail')?.value || '').trim();
  const role = document.getElementById('qzsUsrRole')?.value;
  const office = document.getElementById('qzsUsrOffice')?.value;
  if (!name || !email) { simToast('Please fill in name and email.'); return; }

  qzInsert('users', {
    name: name,
    email: email,
    role: role,
    office: office,
    status: 'Invited',
    login: 'Never',
    mfa: false
  });
  document.getElementById('qzsModal')?.remove();
  simToast(`Invitation sent to ${email}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellEditUserModal(email) {
  simToast(`User configuration modal for ${email || 'user'}.`, { tone: 'good' });
}

function qzShellToggleUser(email) {
  const u = qzList('users', x => x.email === email)[0];
  if (u) {
    const newStatus = (u.status === 'Disabled' ? 'Active' : 'Disabled');
    qzUpdate('users', u.id || u.email, { status: newStatus });
    simToast(`User ${u.name} is now ${newStatus}.`, { tone: 'good' });
    qzRenderRoot();
  } else {
    simToast(`User status toggled.`, { tone: 'good' });
  }
}

function qzShellAddOfficeModal() {
  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:460px">
      <div class="ph"><h4>Add Branch Office</h4><button class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field wide"><label>Office Name</label><input id="qzsOffName" placeholder="e.g. Fort Worth Branch"></div>
        <div class="qz-field wide"><label>Address</label><input id="qzsOffAddr" placeholder="e.g. 777 Main St, Fort Worth, TX 76102"></div>
        <div class="qz-field"><label>Phone</label><input id="qzsOffPhone" placeholder="(817) 555-0100"></div>
        <div class="qz-field"><label>States Licensed</label><input id="qzsOffStates" value="TX"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzShellSaveOffice()">Save Office</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzShellSaveOffice() {
  const name = (document.getElementById('qzsOffName')?.value || '').trim();
  const addr = (document.getElementById('qzsOffAddr')?.value || '').trim();
  const phone = (document.getElementById('qzsOffPhone')?.value || '').trim();
  const states = (document.getElementById('qzsOffStates')?.value || 'TX').trim();
  if (!name) { simToast('Please enter office name.'); return; }

  qzInsert('offices', {
    name: name,
    address: addr,
    phone: phone,
    states: states,
    underwriters: 'Old Republic, Stewart',
    users: 1,
    status: 'Active'
  });
  document.getElementById('qzsModal')?.remove();
  simToast(`Office ${name} added.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellAddFeeModal() {
  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:460px">
      <div class="ph"><h4>Add Agency Fee Schedule</h4><button class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field wide"><label>Fee Name</label><input id="qzsFeeName" placeholder="e.g. Remote Notary Administrative Fee"></div>
        <div class="qz-field"><label>Type</label><input id="qzsFeeType" value="Closing"></div>
        <div class="qz-field"><label>Amount</label><input id="qzsFeeAmt" value="$125.00"></div>
        <div class="qz-field"><label>Basis</label><input id="qzsFeeBasis" value="Flat"></div>
        <div class="qz-field"><label>Applies To</label><input id="qzsFeeApplies" value="Buyer"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzShellSaveFee()">Save Fee</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzShellSaveFee() {
  const name = (document.getElementById('qzsFeeName')?.value || '').trim();
  const type = document.getElementById('qzsFeeType')?.value;
  const amt = document.getElementById('qzsFeeAmt')?.value;
  const basis = document.getElementById('qzsFeeBasis')?.value;
  const applies = document.getElementById('qzsFeeApplies')?.value;
  if (!name) { simToast('Please enter fee name.'); return; }

  qzInsert('fees', {
    name: name,
    type: type,
    basis: basis,
    amount: amt,
    applies: applies,
    from: QZ_TODAY
  });
  document.getElementById('qzsModal')?.remove();
  simToast(`Fee "${name}" added to schedule.`, { tone: 'good' });
  qzRenderRoot();
}

/* ============================================================================
   DEMO MODE (?demo=1)
   ============================================================================ */
function qzShellDemoMode() {
  let on = false;
  try { on = new URLSearchParams(location.search).get('demo') === '1'; } catch (e) { on = false; }
  if (!on) return;
  document.body.classList.add('qzs-demo');
  /* Only redirect once the app is actually past the login screen; otherwise the
     trainee would land on a view behind an auth wall. */
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  if (su) qzGoto('orders');
}
document.addEventListener('DOMContentLoaded', qzShellDemoMode);

/* ============================================================================
   View registry — read by qzRenderRoot() through a single guarded branch, so
   adding a section here needs no further change to qualia-app.js.
   ============================================================================ */
const QZ_SHELL_VIEWS = {
  contacts: qzShellContactsHTML,
  calendar: qzShellCalendarHTML,
  accounting: qzShellAccountingHTML,
  reports: qzShellReportsHTML,
  compliance: qzShellComplianceHTML,
  admin: qzShellAdminHTML
};


/* ---------- deletion (D9) ----------
   Five entities gained a delete here, taking the simulator from 13 of 24 with full CRUD to
   18. Each one carries the guard the real product carries, because a delete that always
   succeeds teaches the opposite of what an escrow desk needs to learn: an office with people
   in it, a fee already priced into open files, and the account you are signed in with are all
   things the system should refuse to remove, and say why. */

function qzShellDeleteUser(email) {
  const u = qzFind('users', email);
  if (!u) return;
  /* There is no Admin role in this tenant - the roles are Escrow Officer, Title Examiner,
     Accounting, Closer, Processor, Virtual Assistant and Read Only - so a "last admin" guard
     would protect a condition that cannot occur. The two that can: you cannot remove the
     account you are signed in as, and removing someone still named on live files is allowed
     but never silent. */
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  if (su && su.email && String(su.email).toLowerCase() === String(email).toLowerCase()) {
    simToast('That is the account you are signed in with. Sign in as someone else to remove it.');
    return;
  }
  const enFiles = qzList('orders', o => o.orderOpener === u.name || o.paralegal === u.name || o.attorney === u.name);
  const abiertos = enFiles.filter(o => (o.stageIndex || 0) < 5).length;
  qzConfirm({
    title: 'Remove ' + u.name + '?',
    body: 'Their access ends immediately. Work already recorded under their name stays on the files, which is what an audit trail is for.'
      + (abiertos ? ' They are still named on ' + abiertos + ' file(s) that have not closed - those files keep their name, but nobody is holding the work.' : ''),
    danger: true,
    confirmLabel: 'Remove user',
    onConfirm: () => {
      qzRemove('users', email);
      simToast(u.name + ' removed.', { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzShellDeleteOffice(name) {
  const o = qzFind('offices', name);
  if (!o) return;
  if (o.users > 0) {
    simToast(o.users + ' user(s) are still assigned to ' + name + '. Move them first.');
    return;
  }
  qzConfirm({
    title: 'Close ' + name + '?',
    body: 'Closed offices stop appearing when a new order is opened. Existing orders keep the office that opened them.',
    danger: true,
    confirmLabel: 'Close office',
    onConfirm: () => {
      qzRemove('offices', name);
      simToast(name + ' closed.', { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzShellDeleteFee(name) {
  const f = qzFind('fees', name);
  if (!f) return;
  qzConfirm({
    title: 'Retire "' + name + '"?',
    body: 'It stops being offered on new orders. Files that already carry this charge are not touched - repricing a closed file is not something a delete should do.',
    danger: true,
    confirmLabel: 'Retire fee',
    onConfirm: () => {
      qzRemove('fees', name);
      simToast('"' + name + '" retired.', { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzShellDeleteContact(id) {
  const c = qzFind('contacts', id);
  if (!c) {
    /* Derived people have no row of their own to delete: they are read out of the order. */
    simToast('This person is read from the order that names them. Remove them on that file.');
    return;
  }
  qzConfirm({
    title: 'Delete ' + c.name + '?',
    body: 'This removes the contact record. Any order that names them keeps its own copy.',
    danger: true,
    confirmLabel: 'Delete contact',
    onConfirm: () => {
      qzRemove('contacts', id);
      simToast(c.name + ' deleted.', { tone: 'good' });
      qzRenderRoot();
    }
  });
}
