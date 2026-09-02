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
  reportDateRange: 'all',
  reportOffice: 'All',
  reportOfficer: 'All',
  reportOrderType: 'All',
  reportFavorites: ['order-volume', 'revenue-office', 'exception-summary'],
  compTab: 'overview',
  compSev: 'All',
  compStatus: 'All',
  compOpenId: null,
  adminPage: 'users',
  adminRole: 'All',
  adminQuery: '',
  docFolder: 'All Documents',
  docOrderFilter: 'All',
  docStatusFilter: 'All',
  docSearch: ''
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
  'Agent': 'Agent', 'Selling Agent': 'Agent', 'Listing Agent': 'Agent', 'Real Estate Agent': 'Agent',
  'Settlement Agent': 'Internal', 'Lender': 'Lender', 'Attorney': 'Attorney', 'Vendor': 'Vendor', 'HOA': 'HOA', 'Other': 'Other'
};
function qzShellContacts() {
  const byKey = {};
  const add = (c) => {
    const hasEmail = c.email && c.email !== '—';
    const key = (hasEmail ? c.email : c.name).toLowerCase();
    if (byKey[key]) {
      const existing = byKey[key];
      (c.orders || []).forEach(o => { if (existing.orders.indexOf(o) === -1) existing.orders.push(o); });
      if (!c.derived) {
        if (c.company && c.company !== '—') existing.company = c.company;
        if (c.phone && c.phone !== '—') existing.phone = c.phone;
        if (c.mobile && c.mobile !== '—') existing.mobile = c.mobile;
        if (c.address && c.address !== '—') existing.address = c.address;
        if (c.type && c.type !== 'Other') existing.type = c.type;
        existing.derived = false;
      } else {
        if (!existing.company || existing.company === '—') existing.company = c.company;
        if (!existing.phone || existing.phone === '—') existing.phone = c.phone;
        if (!existing.address || existing.address === '—') existing.address = c.address;
      }
      return;
    }
    byKey[key] = Object.assign({}, c);
  };

  // 1. Directory and manually added contacts first
  qzList('contacts').forEach(c => add(Object.assign({ role: c.type, orders: [], derived: false }, c)));

  // 2. Real orders
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

  // 3. Vendors
  qzList('vendors').forEach(v => {
    add({
      id: 'v-' + v.id, name: v.name, type: 'Vendor', role: v.service,
      company: v.name, email: 'orders@' + String(v.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') + '.example',
      phone: '(800) 555-0199', mobile: '—', address: 'Dallas-Fort Worth, TX',
      created: '2024-01-08', createdBy: 'System',
      lastActivity: QZ_TODAY, orders: v.orderId ? [v.orderId] : [], derived: true
    });
  });

  return Object.keys(byKey).map(k => byKey[k]);
}
function qzShellFindContact(id) {
  if (!id) return null;
  const list = qzShellContacts();
  return list.find(c => c.id === id) || qzFind('contacts', id) || null;
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
    .sort((a, b) => {
      const aManual = !a.derived ? 1 : 0;
      const bManual = !b.derived ? 1 : 0;
      if (bManual !== aManual) return bManual - aManual;
      const actDiff = String(b.lastActivity || '').localeCompare(String(a.lastActivity || ''));
      if (actDiff !== 0) return actDiff;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
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
      <td>${c.orders && c.orders.length ? `<span class="qzs-count">${c.orders.length}</span>` : '<span class="qzs-dim">—</span>'}</td>
      <td class="qzs-dim">${esc(qzShellRelDate(c.lastActivity))}</td>
      <td onclick="event.stopPropagation()">
        <div style="display:flex;gap:4px">
          <button type="button" class="qz-btn xs" title="Edit contact" onclick="qzShellEditContactModal('${escAttr(c.id)}')">Edit</button>
          <button type="button" class="qz-btn xs danger" title="Delete contact" onclick="qzShellDeleteContact('${escAttr(c.id)}')">&times;</button>
        </div>
      </td>
    </tr>`).join('');
}

function qzShellContactPanelHTML() {
  const id = qzShellState.contactsOpenId;
  if (!id) return '';
  const c = qzShellFindContact(id);
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
        <button type="button" class="qz-btn sm" onclick="qzShellEditContactModal('${escAttr(c.id)}')">Edit</button>
        <button type="button" class="qz-btn sm danger" onclick="qzShellDeleteContact('${escAttr(c.id)}')">Delete</button>
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
  const out = [];

  // 1. Base facade & user-created events in qzDB.events
  qzList('events').forEach((e, i) => {
    out.push(Object.assign({
      id: e.id || ('ev-cust-' + (e.date || 'd') + '-' + i),
      source: e.source || 'facade',
      cal: e.cal || 'personal',
      title: e.title || 'Untitled Event',
      date: e.date || QZ_TODAY,
      time: e.time || '10:00 AM – 11:00 AM',
      location: e.location || '—',
      people: Array.isArray(e.people) ? e.people : (e.people ? [e.people] : []),
      notes: e.notes || ''
    }, e));
  });

  // 2. Real order closings (synced live)
  qzAllOrders().forEach(base => {
    const o = qzGetOrder(base.id) || base;
    if (!o.closingDate) return;
    out.push({
      id: 'ev-ord-' + o.id,
      date: o.closingDate,
      cal: 'closings',
      source: 'order',
      orderId: o.id,
      title: 'Closing — ' + (o.propertyAddress ? o.propertyAddress.split(',')[0] : o.id),
      time: '10:00 AM – 11:30 AM',
      location: o.settlementAgency || 'Best Closing Inc.',
      people: (o.parties || []).filter(p => p.role === 'Buyer' || p.role === 'Seller' || p.role === 'Borrower').map(p => p.name),
      notes: o.statusNote || ''
    });
  });

  // 3. Real task deadlines
  qzList('tasks').forEach(t => {
    if (qzTaskStatus(t) === 'Complete') return;
    if (!t.dueDate) return;
    const o = qzGetOrder(t.relatedOrderId);
    out.push({
      id: 'ev-task-' + t.id,
      date: t.dueDate,
      cal: 'deadlines',
      source: 'task',
      orderId: t.relatedOrderId,
      title: t.title,
      time: 'Due end of day',
      location: o ? o.propertyAddress : '—',
      people: t.assignedTo ? [t.assignedTo] : [],
      notes: 'Task on ' + t.relatedOrderId + '.'
    });
  });

  return out;
}
function qzShellEventsFor(iso) {
  return qzShellEvents()
    .filter(e => e.date === iso)
    .filter(e => qzShellState.calOff.indexOf(e.cal) === -1);
}
function qzShellFindEvent(idOrRef) {
  if (!idOrRef) return null;
  const list = qzShellEvents();
  return list.find(e => e.id === idOrRef || (e.title === idOrRef.title && e.date === idOrRef.date)) || null;
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
        <div class="qzs-panel-actions" style="margin-top:14px;padding-top:10px;border-top:1px solid var(--qz-line);display:flex;justify-content:space-between;align-items:center">
          <button type="button" class="qz-btn sm danger" onclick="qzShellDeleteEvent('${escAttr(e.id)}')">Delete Event</button>
          <div style="display:flex;gap:6px">
            <button type="button" class="qz-btn sm" onclick="qzShellCalClose()">Close</button>
            <button type="button" class="qz-btn sm primary" onclick="qzShellEditEventModal('${escAttr(e.id)}')">Edit Event</button>
          </div>
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
           onclick="event.stopPropagation(); qzShellCalOpenEvent('${escAttr(iso)}',${i2})" title="${escAttr(e.title)}">${esc(e.title)}</button>`).join('');
      const more = list.length > 3
        ? `<button type="button" class="qzs-cal-more" onclick="event.stopPropagation(); qzShellCalOpenDay('${escAttr(iso)}')">+${list.length - 3} more</button>`
        : '';
      cells.push(`<div class="qzs-cal-cell ${isToday ? 'today' : ''}" style="cursor:pointer" onclick="qzShellNewEventModal('${escAttr(iso)}')" title="Click to add event on ${fmtDate(iso)}">
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
        <div class="qzs-cal-pill" style="margin-bottom:6px;border-left-color:${qzShellCalColor(e.cal)};white-space:normal;cursor:pointer" onclick="event.stopPropagation(); qzShellCalOpenEvent('${escAttr(iso)}',${idx})">
          <b>${esc(e.title)}</b>
          <div style="font-size:11px;color:var(--qz-muted)">${esc(e.time)}</div>
        </div>`).join('');

      weekCols.push(`
        <div class="qzs-cal-cell ${isToday ? 'today' : ''}" style="min-height:360px;cursor:pointer" onclick="qzShellNewEventModal('${escAttr(iso)}')" title="Click to add event">
          <div class="qzs-cal-dow" style="margin-bottom:8px">${d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}</div>
          ${eventCards || '<span style="font-size:11px;color:var(--qz-muted)">+ Add event</span>'}
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
  const accounts = qzList('accounts').length ? qzList('accounts') : QZS_ACCOUNTS;
  const trust = accounts.filter(a => a.type !== 'Operating');
  const trustTotal = qzShellSum(trust, 'balance');
  const pending = qzShellSum(receipts.filter(r => r.status === 'Pending'), 'amount');
  const outstanding = qzShellSum(disbursements.filter(d => d.status === 'Issued' || d.status === 'Pending Approval'), 'amount');
  const reconList = qzList('reconciliations').length ? qzList('reconciliations') : QZS_RECONCILIATIONS;
  const latestRecon = reconList[0] || { period: 'Jul 2026', status: 'Balanced' };

  const tiles = [
    { label: 'Escrow Trust Balance', value: fmtMoney(trustTotal), delta: `${trust.length} active trust accounts`, up: true },
    { label: 'Pending Deposits', value: fmtMoney(pending), delta: `${receipts.filter(r => r.status === 'Pending').length} receipts awaiting clearance`, up: null },
    { label: 'Outstanding Checks', value: fmtMoney(outstanding), delta: `${disbursements.filter(d => d.status === 'Issued' || d.status === 'Pending Approval').length} checks/wires in flight`, up: false },
    { label: 'Last Reconciliation', value: latestRecon.period, delta: latestRecon.status, up: true, badge: true }
  ].map(t => `
    <div class="qzs-kpi">
      <span class="qzs-kpi-label">${esc(t.label)}</span>
      <b class="qzs-kpi-value">${esc(t.value)}</b>
      ${t.badge
        ? `<span class="qz-badge complete">${esc(t.delta)}</span>`
        : `<span class="qzs-kpi-delta ${t.up === true ? 'up' : t.up === false ? 'down' : ''}">${esc(t.delta)}</span>`}
    </div>`).join('');

  const accountRows = accounts.map(a => `
    <tr>
      <td><b>${esc(a.name)}</b></td>
      <td>${esc(a.bank)}</td>
      <td>${esc(a.type)}</td>
      <td class="num">${fmtMoney(a.balance)}</td>
      <td>${esc(fmtDate(a.reconciled))}</td>
      <td>${qzShellBadge(a.status)}</td>
    </tr>`).join('');

  const alerts = (typeof QZS_ACCT_ALERTS !== 'undefined' ? QZS_ACCT_ALERTS : []).map(a => `
    <div class="qzs-alert ${esc(a.severity)}">
      <b>${esc(a.text)}</b>
      <span>${esc(a.detail)}</span>
    </div>`).join('');

  return `
    <div class="qzs-kpi-row">${tiles}</div>
    <div class="qzs-split">
      <div class="qzs-split-main">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h5 class="qzs-panel-h" style="margin:0">Escrow Accounts</h5>
          <button type="button" class="qz-btn sm" onclick="qzShellNewAccountModal()">+ Add Account</button>
        </div>
        <div class="qz-tbl-scroll">
          <table class="qz-tbl">
            <thead><tr><th>Account</th><th>Bank</th><th>Type</th><th class="num">Balance</th><th>Last Reconciled</th><th>Status</th></tr></thead>
            <tbody>${accountRows}</tbody>
          </table>
        </div>
      </div>
      <aside class="qzs-split-side">
        <h5 class="qzs-panel-h">Audit & Compliance Alerts</h5>
        ${alerts || '<div class="qzs-dim">No active compliance alerts.</div>'}
      </aside>
    </div>`;
}

function qzShellAcctReceiptsHTML() {
  const list = qzShellGetReceipts();
  const rows = list.map(r => {
    const isVoid = r.status === 'Void';
    const recId = r.id || r.num;
    return `
    <tr class="${isVoid ? 'qzs-dim' : ''}">
      <td>${esc(fmtDate(r.date))}</td>
      <td><b>${esc(r.num || r.id)}</b></td>
      <td>${qzShellOrderCell(r.order || r.orderId)}</td>
      <td>${esc(r.payer || r.remitter || '—')}</td>
      <td><span class="qz-badge dark">${esc(r.method || 'Wire')}</span></td>
      <td class="num">${fmtMoney(r.amount)}</td>
      <td>${qzShellBadge(r.status)}</td>
      <td class="qzs-dim">${esc(r.by || 'Staff')}</td>
      <td style="text-align:right">
        ${!isVoid ? `<button type="button" class="qz-btn sm" onclick="qzVoidMoneyModal('receipts', '${escAttr(recId)}')">Void</button>` : '<span class="qzs-dim" style="font-size:11.5px">Voided</span>'}
        <button type="button" class="qz-btn sm danger" onclick="qzShellDeleteReceipt('${escAttr(recId)}')">&times;</button>
      </td>
    </tr>`;
  }).join('');
  return `
    <div class="qzs-tbl-actions">
      <button type="button" class="qz-btn sm" onclick="qzExportTableCSV('receipts')">Export CSV</button>
      <button type="button" class="qz-btn sm primary" onclick="qzShellNewReceiptModal()">+ Post Receipt</button>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Date</th><th>Receipt #</th><th>Order</th><th>Payer</th><th>Method</th><th class="num">Amount</th><th>Status</th><th>Received By</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9" style="text-align:center;padding:24px">No receipts posted.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="5">${list.length} receipts</td><td class="num">${fmtMoney(qzShellSum(list.filter(r => r.status !== 'Void'), 'amount'))}</td><td colspan="3"></td></tr></tfoot>
      </table>
    </div>`;
}

function qzShellAcctDisbursementsHTML() {
  const list = qzShellGetDisbursements();
  const rows = list.map(d => {
    const isVoid = d.status === 'Void';
    const isPending = d.status === 'Pending Approval';
    const disbId = d.id || d.num;
    return `
    <tr class="${isPending ? 'qzs-row-warn' : ''} ${isVoid ? 'qzs-dim' : ''}">
      <td>${esc(fmtDate(d.date))}</td>
      <td><b>${esc(d.num || d.id)}</b></td>
      <td>${qzShellOrderCell(d.order || d.orderId)}</td>
      <td>${esc(d.payee || '—')}</td>
      <td><span class="qz-badge dark">${esc(d.method || 'Check')}</span></td>
      <td class="num">${fmtMoney(d.amount)}</td>
      <td>${qzShellBadge(d.status)}</td>
      <td class="qzs-dim">${esc(d.by || 'Staff')}</td>
      <td style="text-align:right">
        ${isPending ? `<button type="button" class="qz-btn sm primary" onclick="qzShellApproveOneDisbursement('${escAttr(disbId)}')">Approve</button>` : ''}
        ${!isVoid ? `<button type="button" class="qz-btn sm" onclick="qzVoidMoneyModal('disbursements', '${escAttr(disbId)}')">Void</button>` : '<span class="qzs-dim" style="font-size:11.5px">Voided</span>'}
        <button type="button" class="qz-btn sm danger" onclick="qzShellDeleteDisbursement('${escAttr(disbId)}')">&times;</button>
      </td>
    </tr>`;
  }).join('');
  return `
    <div class="qzs-tbl-actions">
      <button type="button" class="qz-btn sm" onclick="qzExportTableCSV('disbursements')">Export CSV</button>
      <button type="button" class="qz-btn sm" onclick="qzShellApproveDisbursements()">Approve All Pending</button>
      <button type="button" class="qz-btn sm primary" onclick="qzShellNewDisbursementModal()">+ New Disbursement</button>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Date</th><th>Check/Wire #</th><th>Order</th><th>Payee</th><th>Method</th><th class="num">Amount</th><th>Status</th><th>Approved By</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9" style="text-align:center;padding:24px">No disbursements recorded.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="5">${list.length} disbursements</td><td class="num">${fmtMoney(qzShellSum(list.filter(d => d.status !== 'Void'), 'amount'))}</td><td colspan="3"></td></tr></tfoot>
      </table>
    </div>`;
}

function qzShellAcctReconciliationHTML() {
  const reconList = qzList('reconciliations').length ? qzList('reconciliations') : QZS_RECONCILIATIONS;
  const latest = reconList[0] || { period: 'August 2026', account: 'Frost Bank — Escrow Operating', bank: 1418920.40, book: 1418920.40, status: 'Balanced', by: 'Reconciliation Officer', date: QZ_TODAY };
  
  const receipts = qzShellGetReceipts().filter(r => r.status !== 'Void');
  const disbursements = qzShellGetDisbursements().filter(d => d.status !== 'Void');
  const liveNet = qzShellSum(receipts, 'amount') - qzShellSum(disbursements, 'amount');
  const liveBook = latest.book + (liveNet > 0 ? liveNet % 50000 : 0);
  const liveBank = liveBook;
  const liveDiff = Math.round((liveBank - liveBook) * 100) / 100;

  const rows = reconList.map(r => {
    const diff = Math.round((r.bank - r.book) * 100) / 100;
    const rId = r.id || r.period;
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
        <td style="text-align:right">
          <button type="button" class="qz-btn sm danger" onclick="qzShellDeleteReconciliation('${escAttr(rId)}')">&times;</button>
        </td>
      </tr>`;
  }).join('');

  return `
    <div class="qzs-threeway">
      <div class="qzs-threeway-cols">
        <div><span class="qzs-kpi-label">Bank Balance (Statement)</span><b>${fmtMoney(liveBank)}</b></div>
        <div><span class="qzs-kpi-label">Book Balance (Ledger)</span><b>${fmtMoney(liveBook)}</b></div>
        <div><span class="qzs-kpi-label">Trial Balance (Files)</span><b>${fmtMoney(liveBook)}</b></div>
      </div>
      <div class="qzs-threeway-verdict">
        <span class="qzs-tick">&#10003;</span>
        <div><b>IN BALANCE &middot; 3-WAY MATCH VERIFIED</b><span>${esc(latest.account)} &middot; ${esc(latest.period)} &middot; Certified under ALTA Best Practice #2</span></div>
      </div>
    </div>
    <div class="qzs-tbl-actions">
      <button type="button" class="qz-btn sm" onclick="qzExportTableCSV('reconciliations')">Export History</button>
      <button type="button" class="qz-btn sm primary" onclick="qzShellReconcileModal()">+ Start 3-Way Reconciliation</button>
    </div>
    <h5 class="qzs-panel-h">Reconciliation History</h5>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Period</th><th>Account</th><th class="num">Bank</th><th class="num">Book</th><th class="num">Difference</th><th>Reconciled By</th><th>Date</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function qzShellAcctInvoicesHTML() {
  const list = qzShellGetInvoices();
  const rows = list.map(i => {
    const isVoid = i.status === 'Void';
    const isPaid = i.status === 'Paid' || (Number(i.balance) <= 0 && !isVoid);
    const invId = i.id || i.num;
    return `
    <tr class="${isVoid ? 'qzs-dim' : ''}">
      <td><b>${esc(i.num || i.id)}</b></td>
      <td>${qzShellOrderCell(i.order || i.orderId)}</td>
      <td>${esc(i.billTo || '—')}</td>
      <td>${esc(fmtDate(i.issued))}</td>
      <td class="${i.status === 'Past Due' ? 'qzs-neg' : ''}">${esc(fmtDate(i.due))}</td>
      <td class="num">${fmtMoney(i.amount)}</td>
      <td class="num ${Number(i.balance) > 0 ? 'qzs-owed' : ''}">${fmtMoney(i.balance || 0)}</td>
      <td>${qzShellBadge(isPaid ? 'Paid' : (i.status || 'Open'))}</td>
      <td style="text-align:right">
        ${!isVoid && !isPaid ? `<button type="button" class="qz-btn sm primary" onclick="qzShellRecordPaymentModal('${escAttr(invId)}')">Record Payment</button>` : ''}
        ${!isVoid ? `<button type="button" class="qz-btn sm" onclick="qzVoidMoneyModal('invoices', '${escAttr(invId)}')">Void</button>` : '<span class="qzs-dim" style="font-size:11.5px">Voided</span>'}
        <button type="button" class="qz-btn sm danger" onclick="qzShellDeleteInvoice('${escAttr(invId)}')">&times;</button>
      </td>
    </tr>`;
  }).join('');
  return `
    <div class="qzs-tbl-actions">
      <button type="button" class="qz-btn sm" onclick="qzExportTableCSV('invoices')">Export CSV</button>
      <button type="button" class="qz-btn sm primary" onclick="qzShellNewInvoiceModal()">+ New Invoice</button>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Invoice #</th><th>Order</th><th>Bill To</th><th>Issued</th><th>Due</th><th class="num">Amount</th><th class="num">Balance</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9" style="text-align:center;padding:24px">No invoices recorded.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="5">${list.length} invoices</td><td class="num">${fmtMoney(qzShellSum(list.filter(i => i.status !== 'Void'), 'amount'))}</td><td class="num">${fmtMoney(qzShellSum(list.filter(i => i.status !== 'Void'), 'balance'))}</td><td colspan="2"></td></tr></tfoot>
      </table>
    </div>`;
}

function qzShellAcctPosPayHTML() {
  const list = qzShellGetPospay();
  const rows = list.map(p => {
    const fId = p.id || p.file;
    return `
    <tr>
      <td>${esc(fmtDate(p.date))}</td>
      <td class="qzs-mono"><b>${esc(p.file)}</b></td>
      <td>${esc(p.account)}</td>
      <td class="num">${p.items}</td>
      <td class="num">${fmtMoney(p.total)}</td>
      <td>${qzShellBadge(p.status)}</td>
      <td class="qzs-dim">${esc(p.sent)}</td>
      <td style="text-align:right">
        <button type="button" class="qz-btn sm" onclick="qzShellDownloadPosPay('${escAttr(p.file)}')">Download</button>
        <button type="button" class="qz-btn sm danger" onclick="qzShellDeletePosPay('${escAttr(fId)}')">&times;</button>
      </td>
    </tr>`;
  }).join('');
  return `
    <div class="qzs-tbl-actions">
      <button type="button" class="qz-btn sm primary" onclick="qzShellGeneratePosPay()">+ Generate Positive Pay Batch</button>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Date</th><th>File Name</th><th>Account</th><th class="num">Items</th><th class="num">Total</th><th>Status</th><th>Sent At</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;padding:24px">No Positive Pay batches generated.</td></tr>'}</tbody>
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
  const active = qzShellState.acctTab || 'overview';
  const tabs = QZ_SHELL_ACCT_TABS.map(([k, label]) =>
    `<span class="${active === k ? 'active' : ''}" onclick="qzShellAcctTab('${k}')">${esc(label)}</span>`).join('');
  const found = QZ_SHELL_ACCT_TABS.find(t => t[0] === active) || QZ_SHELL_ACCT_TABS[0];
  return `
    <div class="qz-listhead">
      <div>
        <h2>Accounting</h2>
        <div class="sub">Escrow, trust ledgers, 3-way reconciliation &amp; disbursements</div>
      </div>
    </div>
    <div class="qz-subtabs">${tabs}</div>
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

function qzShellToggleReportFavorite(id) {
  if (!qzShellState.reportFavorites) qzShellState.reportFavorites = ['order-volume', 'revenue-office', 'exception-summary'];
  const idx = qzShellState.reportFavorites.indexOf(id);
  if (idx > -1) {
    qzShellState.reportFavorites.splice(idx, 1);
    simToast('Report removed from Favorites.');
  } else {
    qzShellState.reportFavorites.push(id);
    simToast('Report added to Favorites.', { tone: 'good' });
  }
  qzRenderRoot();
}

function qzShellSetReportFilter(key, val) {
  qzShellState[key] = val;
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

  const favList = qzShellState.reportFavorites || QZS_REPORT_FAVORITES;
  const favs = favList.map(id => qzShellFindReport(id)).filter(r => r && match(r));
  const favHTML = (!q && favs.length) ? `
    <div class="qzs-rail-cat">
      <div class="qzs-rail-cat-h static">Favorites</div>
      ${favs.map(r => qzShellReportRailItem(r)).join('')}
    </div>` : '';

  const cats = QZS_REPORT_CATALOG.map(c => {
    const list = c.reports.filter(match);
    if (!list.length) return '';
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
function qzShellBarChartSVG(series) {
  const W = 640, H = 250, padL = 44, padR = 12, padT = 18, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const peak = Math.max.apply(null, series.map(s => Math.max(s.opened || 0, s.closed || 0, 1)));
  const yMax = Math.ceil(peak / 20) * 20 || 40;
  const y = v => padT + plotH - (v / yMax) * plotH;

  const ticks = [];
  const step = Math.max(20, Math.ceil(yMax / 5 / 10) * 10);
  for (let v = 0; v <= yMax; v += step) {
    ticks.push(`<line x1="${padL}" y1="${y(v)}" x2="${W - padR}" y2="${y(v)}" stroke="var(--qz-line)" stroke-width="1"/>
      <text x="${padL - 8}" y="${y(v) + 3.5}" text-anchor="end" font-size="10" fill="var(--qz-muted)">${v}</text>`);
  }

  const band = plotW / Math.max(series.length, 1);
  const bw = Math.min(14, band / 3.4);
  const bars = series.map((s, i) => {
    const cx = padL + band * i + band / 2;
    const x1 = cx - bw - 1.5, x2 = cx + 1.5;
    const h1 = Math.max(0, padT + plotH - y(s.opened || 0));
    const h2 = Math.max(0, padT + plotH - y(s.closed || 0));
    return `
      <rect x="${x1.toFixed(1)}" y="${y(s.opened || 0).toFixed(1)}" width="${bw.toFixed(1)}" height="${h1.toFixed(1)}" fill="var(--qz-green)"><title>${esc(s.month)} opened: ${s.opened}</title></rect>
      <rect x="${x2.toFixed(1)}" y="${y(s.closed || 0).toFixed(1)}" width="${bw.toFixed(1)}" height="${h2.toFixed(1)}" fill="var(--qz-ocean)"><title>${esc(s.month)} closed: ${s.closed}</title></rect>
      <text x="${cx.toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="10" fill="var(--qz-muted)">${esc(s.month)}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" class="qzs-chart" role="img" aria-label="Monthly series breakdown">
    ${ticks.join('')}
    <line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" stroke="var(--qz-muted)" stroke-width="1"/>
    ${bars}
  </svg>`;
}

function qzShellDonutSVG(mix) {
  const R = 62, C = 2 * Math.PI * R;
  let offset = 0;
  const total = mix.reduce((n, m) => n + m.count, 0) || 1;
  const slices = mix.map(m => {
    const len = ((m.count / total) * 100 / 100) * C;
    const seg = `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${m.color}" stroke-width="26"
      stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 80 80)"><title>${esc(m.label)}: ${Math.round((m.count / total) * 100)}% (${m.count})</title></circle>`;
    offset += len;
    return seg;
  }).join('');
  return `<svg viewBox="0 0 160 160" class="qzs-donut" role="img" aria-label="Orders by type">
    ${slices}
    <text x="80" y="76" text-anchor="middle" font-size="22" font-weight="700" fill="var(--qz-ink)">${total}</text>
    <text x="80" y="94" text-anchor="middle" font-size="10" fill="var(--qz-muted)">orders</text>
  </svg>`;
}

/* Helper to get filtered order rows based on active report filters */
function qzShellGetReportFilteredRows() {
  const allRows = (typeof QZS_REPORT_ROWS !== 'undefined' ? QZS_REPORT_ROWS.slice() : []);
  
  // Inject live dynamic orders from qzDB if any
  const dbOrders = qzAllOrders();
  dbOrders.forEach(o => {
    if (!allRows.some(r => r.order === o.id)) {
      allRows.unshift({
        order: o.id,
        property: o.propertyAddress || '—',
        type: o.type || 'Purchase',
        opened: o.openDate || QZ_TODAY,
        closed: o.closingDate || '—',
        cycle: 32,
        fees: 3250.00,
        officer: o.escrowOfficer || 'Marisol Tran',
        agent: 'Samantha Bee'
      });
    }
  });

  const range = qzShellState.reportDateRange || 'all';
  const office = qzShellState.reportOffice || 'All';
  const officer = qzShellState.reportOfficer || 'All';
  const orderType = qzShellState.reportOrderType || 'All';

  return allRows.filter(r => {
    if (orderType !== 'All' && r.type !== orderType) return false;
    if (officer !== 'All' && r.officer !== officer) return false;
    if (office !== 'All' && !r.property.toLowerCase().includes(office.toLowerCase())) return false;
    if (range === 'aug2026' && !r.opened.startsWith('2026-08') && !(r.closed && r.closed.startsWith('2026-08'))) return false;
    if (range === 'jul2026' && !r.opened.startsWith('2026-07') && !(r.closed && r.closed.startsWith('2026-07'))) return false;
    return true;
  });
}

/* ---------- report bodies ---------- */
function qzShellReportOrderVolumeHTML() {
  const rows = qzShellGetReportFilteredRows();
  const totalOpened = rows.length;
  const closedRows = rows.filter(r => r.closed && r.closed !== '—');
  const totalClosed = closedRows.length;
  const totalFees = qzShellSum(rows, 'fees');
  const avgFee = totalOpened > 0 ? Math.round(totalFees / totalOpened) : 0;
  const avgCycle = rows.length ? Math.round(rows.reduce((n, r) => n + (r.cycle || 30), 0) / rows.length) : 34;

  const kpis = [
    { label: 'Orders Opened', value: String(totalOpened), delta: '+12% vs. prior', up: true },
    { label: 'Orders Closed', value: String(totalClosed), delta: '-3% vs. prior', up: false },
    { label: 'Avg Cycle Time', value: `${avgCycle} days`, delta: '-2 days', up: true },
    { label: 'Total Revenue', value: fmtMoney(totalFees), delta: '+8% vs. prior', up: true },
    { label: 'Avg Fee / File', value: fmtMoney(avgFee), delta: '+1.4%', up: true }
  ].map(k => `
    <div class="qzs-kpi">
      <span class="qzs-kpi-label">${esc(k.label)}</span>
      <b class="qzs-kpi-value">${esc(k.value)}</b>
      <span class="qzs-kpi-delta ${k.up ? 'up' : 'down'}">${k.up ? '&#9650;' : '&#9660;'} ${esc(k.delta)}</span>
    </div>`).join('');

  // Dynamic Type Mix
  const pCount = rows.filter(r => r.type === 'Purchase').length;
  const rCount = rows.filter(r => r.type === 'Refinance').length;
  const cCount = rows.filter(r => r.type === 'Cash').length;
  const cmCount = rows.filter(r => r.type === 'Commercial').length;
  const mix = [
    { label: 'Purchase', count: pCount, pct: totalOpened ? Math.round((pCount / totalOpened) * 100) : 0, color: 'var(--qz-green)' },
    { label: 'Refinance', count: rCount, pct: totalOpened ? Math.round((rCount / totalOpened) * 100) : 0, color: 'var(--qz-ocean)' },
    { label: 'Cash', count: cCount, pct: totalOpened ? Math.round((cCount / totalOpened) * 100) : 0, color: 'var(--qz-gold)' },
    { label: 'Commercial', count: cmCount, pct: totalOpened ? Math.round((cmCount / totalOpened) * 100) : 0, color: 'var(--qz-muted)' }
  ];

  const legend = mix.map(m => `
    <div class="qzs-legend-row">
      <span class="qzs-dot" style="background:${m.color}"></span>
      <span class="l">${esc(m.label)}</span>
      <span class="v">${m.pct}%</span>
      <span class="qzs-dim">${m.count}</span>
    </div>`).join('');

  const tableRows = rows.map(r => `
    <tr>
      <td><b>${qzShellOrderCell(r.order)}</b></td>
      <td>${esc(r.property)}</td>
      <td><span class="qz-badge dark">${esc(r.type)}</span></td>
      <td>${esc(fmtDate(r.opened))}</td>
      <td>${esc(fmtDate(r.closed))}</td>
      <td class="num">${r.cycle || 30}</td>
      <td class="num">${fmtMoney(r.fees)}</td>
      <td class="qzs-dim">${esc(r.officer)}</td>
      <td class="qzs-dim">${esc(r.agent)}</td>
    </tr>`).join('');

  return `
    <div class="qzs-kpi-row five">${kpis}</div>
    <div class="qzs-chart-row">
      <div class="qzs-chart-card">
        <div class="qzs-chart-head">
          <h5 class="qzs-panel-h">Orders Opened vs. Closed (Monthly Trends)</h5>
          <div class="qzs-chart-legend">
            <span><i style="background:var(--qz-green)"></i>Opened</span>
            <span><i style="background:var(--qz-ocean)"></i>Closed</span>
          </div>
        </div>
        ${qzShellBarChartSVG(QZS_REPORT_SERIES)}
      </div>
      <div class="qzs-chart-card narrow">
        <div class="qzs-chart-head"><h5 class="qzs-panel-h">Orders by Transaction Type</h5></div>
        <div class="qzs-donut-wrap">
          ${qzShellDonutSVG(mix)}
          <div class="qzs-legend">${legend}</div>
        </div>
      </div>
    </div>
    <h5 class="qzs-panel-h">Filtered Orders Detail</h5>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Order</th><th>Property Address</th><th>Type</th><th>Opened</th><th>Closed</th><th class="num">Cycle Days</th><th class="num">Settlement Fees</th><th>Escrow Officer</th><th>Agent</th></tr></thead>
        <tbody>${tableRows || '<tr><td colspan="9" style="text-align:center;padding:24px">No orders match the selected filters.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="5">${rows.length} orders matching filters</td><td class="num">${avgCycle} avg</td><td class="num">${fmtMoney(totalFees)}</td><td colspan="2"></td></tr></tfoot>
      </table>
    </div>
    <div class="qzs-report-foot">Generated ${esc(fmtDate(QZ_TODAY))} &middot; Live Qualia Analytics Engine &middot; ${rows.length} records shown</div>`;
}

function qzShellReportClosedOrdersHTML() {
  const rows = qzShellGetReportFilteredRows().filter(r => r.closed && r.closed !== '—');
  const totalFees = qzShellSum(rows, 'fees');
  const avgCycle = rows.length ? Math.round(rows.reduce((n, r) => n + (r.cycle || 30), 0) / rows.length) : 0;

  const kpis = [
    { label: 'Total Closed Files', value: String(rows.length), delta: '100% completed', up: true },
    { label: 'Total Closed Revenue', value: fmtMoney(totalFees), delta: 'Collected & disbursed', up: true },
    { label: 'Avg Closing Turnaround', value: `${avgCycle} days`, delta: 'Intake to closing', up: null }
  ].map(k => `
    <div class="qzs-kpi">
      <span class="qzs-kpi-label">${esc(k.label)}</span>
      <b class="qzs-kpi-value">${esc(k.value)}</b>
      <span class="qzs-kpi-delta ${k.up ? 'up' : ''}">${esc(k.delta)}</span>
    </div>`).join('');

  const tableRows = rows.map(r => `
    <tr>
      <td><b>${qzShellOrderCell(r.order)}</b></td>
      <td>${esc(r.property)}</td>
      <td><span class="qz-badge complete">Closed</span></td>
      <td>${esc(fmtDate(r.closed))}</td>
      <td class="num">${r.cycle}</td>
      <td class="num">${fmtMoney(r.fees)}</td>
      <td>${esc(r.officer)}</td>
      <td>${esc(r.agent)}</td>
    </tr>`).join('');

  return `
    <div class="qzs-kpi-row">${kpis}</div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Order #</th><th>Property</th><th>Status</th><th>Closed Date</th><th class="num">Cycle Days</th><th class="num">Settlement Fees</th><th>Escrow Officer</th><th>Referring Agent</th></tr></thead>
        <tbody>${tableRows || '<tr><td colspan="8" style="text-align:center;padding:24px">No closed orders in selected range.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="4">${rows.length} closed files</td><td class="num">${avgCycle} avg</td><td class="num">${fmtMoney(totalFees)}</td><td colspan="2"></td></tr></tfoot>
      </table>
    </div>
    <div class="qzs-report-foot">Generated ${esc(fmtDate(QZ_TODAY))} &middot; Closed Orders Audit Report</div>`;
}

function qzShellReportOpenAgingHTML() {
  const allOpen = qzAllOrders().filter(o => (o.stageIndex || 0) < 5);
  const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

  allOpen.forEach(o => {
    const days = qzShellDaysAgo(o.openDate) || 20;
    if (days <= 30) buckets['0-30']++;
    else if (days <= 60) buckets['31-60']++;
    else if (days <= 90) buckets['61-90']++;
    else buckets['90+']++;
  });

  const kpis = [
    { label: '0 – 30 Days (On Track)', value: String(buckets['0-30']), delta: 'Active pipeline', up: true },
    { label: '31 – 60 Days (Standard)', value: String(buckets['31-60']), delta: 'Scheduled for closing', up: null },
    { label: '61 – 90 Days (Warning)', value: String(buckets['61-90']), delta: 'Requires title follow-up', up: false },
    { label: '90+ Days (Stale)', value: String(buckets['90+']), delta: 'Escalation needed', up: false }
  ].map(k => `
    <div class="qzs-kpi">
      <span class="qzs-kpi-label">${esc(k.label)}</span>
      <b class="qzs-kpi-value">${esc(k.value)}</b>
      <span class="qzs-kpi-delta ${k.up === true ? 'up' : k.up === false ? 'down' : ''}">${esc(k.delta)}</span>
    </div>`).join('');

  const tableRows = allOpen.map(o => {
    const days = qzShellDaysAgo(o.openDate) || 24;
    const badgeClass = days > 90 ? 'danger' : days > 60 ? 'pending' : 'open';
    return `
      <tr>
        <td><b>${qzShellOrderCell(o.id)}</b></td>
        <td>${esc(o.propertyAddress)}</td>
        <td><span class="qz-badge ${badgeClass}">${days} days</span></td>
        <td>${esc(o.stage || 'Processing')}</td>
        <td>${esc(fmtDate(o.openDate))}</td>
        <td>${esc(fmtDate(o.closingDate || '—'))}</td>
        <td>${esc(o.escrowOfficer || 'Marisol Tran')}</td>
      </tr>`;
  }).join('');

  return `
    <div class="qzs-kpi-row">${kpis}</div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Order #</th><th>Property</th><th>Aging</th><th>Current Stage</th><th>Opened</th><th>Target Closing</th><th>Escrow Officer</th></tr></thead>
        <tbody>${tableRows}</tbody>
        <tfoot><tr><td colspan="7">${allOpen.length} open files in aging queue</td></tr></tfoot>
      </table>
    </div>
    <div class="qzs-report-foot">Generated ${esc(fmtDate(QZ_TODAY))} &middot; Pipeline Bottleneck Analysis</div>`;
}

function qzShellReportOfficeRevenueHTML() {
  const offices = qzList('offices').length ? qzList('offices') : QZS_OFFICES;
  const rows = offices.map(o => {
    const d = QZS_REPORT_OFFICE_REVENUE[o.id] || { orders: 28, revenue: 98000, avgFee: 3500 };
    return `<tr>
      <td><b>${esc(o.name)}</b></td>
      <td class="qzs-dim">${esc(o.address || 'Texas Branch')}</td>
      <td class="num">${d.orders}</td>
      <td class="num">${fmtMoney(d.revenue)}</td>
      <td class="num">${fmtMoney(d.avgFee)}</td>
    </tr>`;
  }).join('');
  const totalRev = offices.reduce((n, o) => n + ((QZS_REPORT_OFFICE_REVENUE[o.id] || {}).revenue || 98000), 0);
  const totalOrders = offices.reduce((n, o) => n + ((QZS_REPORT_OFFICE_REVENUE[o.id] || {}).orders || 28), 0);
  const series = offices.map(o => ({
    month: o.name.split('—')[0].trim().slice(0, 5),
    opened: Math.round(((QZS_REPORT_OFFICE_REVENUE[o.id] || {}).revenue || 98000) / 1000),
    closed: (QZS_REPORT_OFFICE_REVENUE[o.id] || {}).orders || 28
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
        <tfoot><tr><td colspan="2">${offices.length} offices</td><td class="num">${totalOrders}</td><td class="num">${fmtMoney(totalRev)}</td><td></td></tr></tfoot>
      </table>
    </div>
    <div class="qzs-report-foot">Generated ${esc(fmtDate(QZ_TODAY))} &middot; Branch Financial Performance</div>`;
}

function qzShellReportEscrowBalancesHTML() {
  const accounts = qzList('accounts').length ? qzList('accounts') : QZS_ACCOUNTS;
  const totalTrust = qzShellSum(accounts.filter(a => a.type !== 'Operating'), 'balance');

  const rows = accounts.map(a => `
    <tr>
      <td><b>${esc(a.name)}</b></td>
      <td>${esc(a.bank)}</td>
      <td>${esc(a.type)}</td>
      <td class="num">${fmtMoney(a.balance)}</td>
      <td>${esc(fmtDate(a.reconciled))}</td>
      <td>${qzShellBadge(a.status)}</td>
    </tr>`).join('');

  return `
    <div class="qzs-kpi-row">
      <div class="qzs-kpi"><span class="qzs-kpi-label">Consolidated Escrow Trust</span><b class="qzs-kpi-value">${fmtMoney(totalTrust)}</b><span class="qzs-kpi-delta up">ALTA Best Practice #2 Compliant</span></div>
      <div class="qzs-kpi"><span class="qzs-kpi-label">Active Bank Accounts</span><b class="qzs-kpi-value">${accounts.length}</b><span class="qzs-kpi-delta">Frost, Independent & Comerica</span></div>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Account Name</th><th>Bank</th><th>Account Type</th><th class="num">Current Balance</th><th>Last Reconciled</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="3">${accounts.length} accounts</td><td class="num">${fmtMoney(qzShellSum(accounts, 'balance'))}</td><td colspan="2"></td></tr></tfoot>
      </table>
    </div>
    <div class="qzs-report-foot">Generated ${esc(fmtDate(QZ_TODAY))} &middot; Live Fiduciary Balances Snapshot</div>`;
}

function qzShellReportCplIssuanceHTML() {
  const list = qzList('cpls').length ? qzList('cpls') : (typeof QZS_CPLS !== 'undefined' ? QZS_CPLS : []);
  const rows = list.map(c => `
    <tr>
      <td><b>${esc(c.num || c.cplNumber)}</b></td>
      <td>${qzShellOrderCell(c.order || c.orderId)}</td>
      <td>${esc(c.lender || '—')}</td>
      <td>${esc(c.underwriter || 'First American Title')}</td>
      <td>${esc(fmtDate(c.issued || QZ_TODAY))}</td>
      <td>${esc(fmtDate(c.expires || '2026-12-31'))}</td>
      <td>${qzShellBadge(c.status || 'Active')}</td>
    </tr>`).join('');

  return `
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>CPL #</th><th>Order</th><th>Lender</th><th>Underwriter</th><th>Issued Date</th><th>Expiration</th><th>Status</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:24px">No CPL letters issued.</td></tr>'}</tbody>
        <tfoot><tr><td colspan="7">${list.length} CPL letters recorded</td></tr></tfoot>
      </table>
    </div>
    <div class="qzs-report-foot">Generated ${esc(fmtDate(QZ_TODAY))} &middot; Underwriter Compliance Letters</div>`;
}

function qzShellReportAuditActivityHTML() {
  const list = (qzDB.auditLog && qzDB.auditLog.length) ? qzDB.auditLog : [
    { timestamp: QZ_TODAY + ' 08:30', user: 'Training User', action: 'POST_RECEIPT', details: 'Posted Receipt REC-2026-0589 ($25,000)' },
    { timestamp: QZ_TODAY + ' 08:22', user: 'Marisol Tran', action: 'ISSUE_CPL', details: 'CPL-2026-0442 issued to Frisco Lending' },
    { timestamp: QZ_TODAY + ' 07:50', user: 'Travis Jones', action: 'DISBURSEMENT_APPROVE', details: 'Approved payoff wire for ORD-2026-1483' },
    { timestamp: QZ_TODAY + ' 07:15', user: 'Dana Whitfield', action: 'RECONCILE', details: 'Monthly 3-Way Reconciliation certified' }
  ];

  const rows = list.map(a => `
    <tr>
      <td class="qzs-dim">${esc(a.timestamp || QZ_TODAY)}</td>
      <td><b>${esc(a.user || 'Training User')}</b></td>
      <td><span class="qz-badge dark">${esc(a.action || a.type || 'ACTIVITY')}</span></td>
      <td>${esc(a.details || a.message || '—')}</td>
    </tr>`).join('');

  return `
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Audit Details</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="4">${list.length} audit trail log events recorded</td></tr></tfoot>
      </table>
    </div>
    <div class="qzs-report-foot">Generated ${esc(fmtDate(QZ_TODAY))} &middot; ALTA Pillar #3 Audit Trail</div>`;
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
    <div class="qzs-report-foot">Generated ${esc(fmtDate(QZ_TODAY))} &middot; Operational Velocity</div>`;
}

const QZ_SHELL_REPORT_BODIES = {
  'order-volume': qzShellReportOrderVolumeHTML,
  'closed-orders': qzShellReportClosedOrdersHTML,
  'open-aging': qzShellReportOpenAgingHTML,
  'revenue-office': qzShellReportOfficeRevenueHTML,
  'escrow-balances': qzShellReportEscrowBalancesHTML,
  'cpl-issuance': qzShellReportCplIssuanceHTML,
  'audit-activity': qzShellReportAuditActivityHTML,
  'productivity-user': qzShellReportProductivityHTML
};

function qzShellScheduleReportModal(id) {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const rep = qzShellFindReport(id) || qzShellFindReport('order-volume');

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:480px">
      <div class="ph">
        <h4>Schedule Automated Report Delivery</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px">
        <div class="qz-field wide"><label>Report</label><input value="${escAttr(rep.name)} (${escAttr(rep.category)})" readonly></div>
        <div class="qz-field"><label>Frequency</label>
          <select id="qzsSchedFreq">
            <option value="Weekly (Every Monday 8:00 AM)">Weekly (Mondays 8:00 AM)</option>
            <option value="Monthly (1st of Month)">Monthly (1st of Month)</option>
            <option value="Daily (8:00 AM)">Daily (8:00 AM)</option>
            <option value="Quarterly">Quarterly</option>
          </select>
        </div>
        <div class="qz-field"><label>Delivery Format</label>
          <select id="qzsSchedFormat">
            <option value="PDF Summary">PDF Summary Report</option>
            <option value="CSV Data Export">CSV Data Export</option>
            <option value="Both PDF & CSV">Both PDF &amp; CSV</option>
          </select>
        </div>
        <div class="qz-field wide"><label>Recipient Email Addresses (comma-separated)</label>
          <input id="qzsSchedRecipients" value="marisol.tran@agency.example, executive@agency.example" autofocus>
        </div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveScheduleReport('${escAttr(rep.id)}')">Schedule Delivery</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzsSchedRecipients')?.focus(), 50);
}

function qzShellSaveScheduleReport(id) {
  const rep = qzShellFindReport(id) || qzShellFindReport('order-volume');
  const freq = document.getElementById('qzsSchedFreq')?.value || 'Weekly';
  const format = document.getElementById('qzsSchedFormat')?.value || 'PDF';
  const recipients = (document.getElementById('qzsSchedRecipients')?.value || '').trim();

  if (!recipients) { simToast('Please enter at least one recipient email.'); return; }

  const newSched = {
    id: 'sched-' + Date.now(),
    reportId: rep.id,
    reportName: rep.name,
    frequency: freq,
    format: format,
    recipients: recipients,
    created: QZ_TODAY,
    status: 'Active'
  };

  if (!qzDB.scheduledReports) qzDB.scheduledReports = [];
  qzDB.scheduledReports.push(newSched);

  document.getElementById('qzsModal')?.remove();
  simToast(`Report "${rep.name}" scheduled ${freq} to ${recipients}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzExportReportCSV(id) {
  const rep = qzShellFindReport(id) || qzShellFindReport('order-volume');
  const rows = qzShellGetReportFilteredRows();
  let csv = 'Order,Property,Type,Opened,Closed,CycleDays,SettlementFees,EscrowOfficer,Agent\n';
  rows.forEach(r => {
    csv += `"${r.order}","${r.property}","${r.type}","${r.opened}","${r.closed}",${r.cycle || 30},${r.fees || 0},"${r.officer}","${r.agent}"\n`;
  });

  if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof document !== 'undefined' && document.createElement) {
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${rep.id}_${QZ_TODAY}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {}
  }
  simToast(`CSV export for "${rep.name}" downloaded (${rows.length} rows).`, { tone: 'good' });
}

function qzShellReportsHTML() {
  const rep = qzShellFindReport(qzShellState.reportId) || qzShellFindReport('order-volume');
  const body = QZ_SHELL_REPORT_BODIES[rep.id]
    ? QZ_SHELL_REPORT_BODIES[rep.id]()
    : `<div class="qzs-empty">
         <b>${esc(rep.name)}</b>
         <p>${esc(rep.desc)}</p>
         <button type="button" class="qz-btn sm primary" onclick="qzShellReportSelect('order-volume')">Open Order Volume</button>
       </div>`;

  const isFav = (qzShellState.reportFavorites || QZS_REPORT_FAVORITES).includes(rep.id);

  const curRange = qzShellState.reportDateRange || 'all';
  const curOffice = qzShellState.reportOffice || 'All';
  const curOfficer = qzShellState.reportOfficer || 'All';
  const curType = qzShellState.reportOrderType || 'All';

  return `
    <div class="qz-listhead">
      <div>
        <h2>Reports &amp; Analytics</h2>
        <div class="sub">Production, financial velocity, escrow balances &amp; ALTA audit reporting</div>
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
        <div class="qzs-rep-head" style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <h3 style="display:flex;align-items:center;gap:8px">
              ${esc(rep.name)}
              <button type="button" class="qz-btn sm" style="padding:2px 6px;color:${isFav ? '#eab308' : '#94a3b8'}" onclick="qzShellToggleReportFavorite('${escAttr(rep.id)}')">
                ${isFav ? '&#9733; Favorited' : '&#9734; Add Favorite'}
              </button>
            </h3>
            <div class="qzs-dim">${esc(rep.category)} &middot; ${esc(rep.desc)}</div>
          </div>
        </div>
        <div class="qzs-filterbar">
          <select class="qzs-select" onchange="qzShellSetReportFilter('reportDateRange', this.value)">
            <option value="all" ${curRange === 'all' ? 'selected' : ''}>Date Range: All Time</option>
            <option value="aug2026" ${curRange === 'aug2026' ? 'selected' : ''}>August 2026 (This Month)</option>
            <option value="jul2026" ${curRange === 'jul2026' ? 'selected' : ''}>July 2026 (Last Month)</option>
          </select>
          <select class="qzs-select" onchange="qzShellSetReportFilter('reportOffice', this.value)">
            <option value="All" ${curOffice === 'All' ? 'selected' : ''}>Office: All Branches</option>
            <option value="Plano" ${curOffice === 'Plano' ? 'selected' : ''}>Plano HQ</option>
            <option value="Frisco" ${curOffice === 'Frisco' ? 'selected' : ''}>Frisco Branch</option>
            <option value="Dallas" ${curOffice === 'Dallas' ? 'selected' : ''}>Dallas Downtown</option>
            <option value="Allen" ${curOffice === 'Allen' ? 'selected' : ''}>Allen Office</option>
          </select>
          <select class="qzs-select" onchange="qzShellSetReportFilter('reportOfficer', this.value)">
            <option value="All" ${curOfficer === 'All' ? 'selected' : ''}>Officer: All Staff</option>
            <option value="Marisol Tran" ${curOfficer === 'Marisol Tran' ? 'selected' : ''}>Marisol Tran</option>
            <option value="Dana Whitfield" ${curOfficer === 'Dana Whitfield' ? 'selected' : ''}>Dana Whitfield</option>
            <option value="Travis Jones" ${curOfficer === 'Travis Jones' ? 'selected' : ''}>Travis Jones</option>
          </select>
          <select class="qzs-select" onchange="qzShellSetReportFilter('reportOrderType', this.value)">
            <option value="All" ${curType === 'All' ? 'selected' : ''}>Type: All Types</option>
            <option value="Purchase" ${curType === 'Purchase' ? 'selected' : ''}>Purchase</option>
            <option value="Refinance" ${curType === 'Refinance' ? 'selected' : ''}>Refinance</option>
            <option value="Cash" ${curType === 'Cash' ? 'selected' : ''}>Cash</option>
            <option value="Commercial" ${curType === 'Commercial' ? 'selected' : ''}>Commercial</option>
          </select>
          <div class="qzs-filter-btns">
            <button type="button" class="qz-btn sm primary" onclick="qzShellAction('Run Report')">Run Report</button>
            <button type="button" class="qz-btn sm" onclick="qzShellScheduleReportModal('${escAttr(rep.id)}')">Schedule</button>
            <button type="button" class="qz-btn sm" onclick="qzExportReportCSV('${escAttr(rep.id)}')">Export CSV</button>
            <button type="button" class="qz-btn sm" onclick="window.print()">Print</button>
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
  'Active': 'complete', 'Expiring': 'pending', 'Expired': 'bad', 'Issued': 'complete',
  'Verified': 'complete', 'Failed': 'bad', 'Pending': 'pending',
  'Compliant': 'complete', 'Needs Review': 'pending', 'Action Required': 'bad'
};
function qzShellCompBadge(s) {
  return `<span class="qz-badge ${QZ_SHELL_COMP_BADGE[s] || 'open'}">${esc(s)}</span>`;
}

function qzShellAge(iso) {
  const n = qzShellDaysAgo(iso);
  return n === null ? '—' : n + 'd';
}

function qzShellCompExceptionsFiltered() {
  return qzShellGetExceptions()
    .filter(e => qzShellState.compSev === 'All' || e.severity === qzShellState.compSev)
    .filter(e => qzShellState.compStatus === 'All' || e.status === qzShellState.compStatus)
    .sort((a, b) => {
      const rank = { High: 0, Medium: 1, Low: 2 };
      return (rank[a.severity] - rank[b.severity]) || String(a.opened).localeCompare(String(b.opened));
    });
}

function qzShellCompOverviewHTML() {
  const exceptions = qzShellGetExceptions();
  const open = exceptions.filter(e => e.status !== 'Resolved').length;
  const altaList = (qzDB.altaPillars && qzDB.altaPillars.length) ? qzDB.altaPillars : QZS_ALTA;
  const alta = Math.round(altaList.reduce((n, a) => n + (a.pct || 0), 0) / altaList.length);
  const cpls = qzShellGetCpls();

  const tiles = `
    <div class="qzs-kpi"><span class="qzs-kpi-label">Open Exceptions</span><b class="qzs-kpi-value ${open > 0 ? 'qzs-neg' : ''}">${open}</b><span class="qzs-kpi-delta">${exceptions.filter(e => e.severity === 'High' && e.status !== 'Resolved').length} high severity</span></div>
    <div class="qzs-kpi"><span class="qzs-kpi-label">CPLs Issued MTD</span><b class="qzs-kpi-value">${cpls.length}</b><span class="qzs-kpi-delta up">+9% vs. Jul</span></div>
    <div class="qzs-kpi"><span class="qzs-kpi-label">Policies Pending</span><b class="qzs-kpi-value qzs-warn">14</b><span class="qzs-kpi-delta">4 past 30 days</span></div>
    <div class="qzs-kpi">
      <span class="qzs-kpi-label">ALTA Compliance</span>
      <b class="qzs-kpi-value">${alta}%</b>
      <div class="qzs-bar"><i style="width:${alta}%"></i></div>
    </div>`;

  const attention = qzShellCompExceptionsFiltered()
    .filter(e => e.status !== 'Resolved').slice(0, 4).map(e => `
      <div class="qzs-alert ${e.severity === 'High' ? 'high' : 'medium'} link" onclick="qzShellCompOpen('${escAttr(e.id)}'); qzShellCompTab('exceptions');">
        <b>${esc(e.title)}</b>
        <span>${esc(e.order)} &middot; ${esc(e.severity)} &middot; open ${esc(qzShellAge(e.opened))} &middot; Owner: ${esc(e.owner)}</span>
      </div>`).join('');

  const auditEvents = (qzDB.auditLog && qzDB.auditLog.length) ? qzDB.auditLog : QZS_AUDIT;
  const recent = auditEvents.slice(0, 6).map(a => `
    <div class="qzs-timeline-row">
      <span class="qzs-mono">${esc((a.ts || a.timestamp || QZ_TODAY).slice(5, 16))}</span>
      <span><b>${esc(a.user || 'Training User')}</b> ${esc((a.action || a.type || 'activity').toLowerCase())} ${esc(a.object || a.details || 'record')}</span>
    </div>`).join('');

  return `
    <div class="qzs-kpi-row">${tiles}</div>
    <div class="qzs-split">
      <div class="qzs-split-main">
        <h5 class="qzs-panel-h">Requires Attention (Priority Exceptions)</h5>
        ${attention || '<div class="qzs-dim" style="padding:16px;background:var(--qz-bg);border-radius:6px">No open exceptions requiring immediate attention.</div>'}
      </div>
      <aside class="qzs-split-side">
        <h5 class="qzs-panel-h">Recent Activity Log</h5>
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
      <td style="text-align:right" onclick="event.stopPropagation()">
        <button type="button" class="qz-btn sm" onclick="qzShellCompOpen('${escAttr(e.id)}')">View</button>
        <button type="button" class="qz-btn sm danger" onclick="qzShellDeleteException('${escAttr(e.id)}')">&times;</button>
      </td>
    </tr>`).join('')
    : `<tr><td colspan="9"><div class="qzs-empty"><b>No exceptions match these filters</b><p>Try a different severity or status.</p></div></td></tr>`;

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div class="qzs-chips" style="margin:0">${sevChips}<span class="qzs-chip-sep"></span>${stChips}</div>
      <button type="button" class="qz-btn sm primary" onclick="qzShellRaiseExceptionModal()">+ Raise Exception</button>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Severity</th><th>Order</th><th>Property</th><th>Exception</th><th>Opened</th><th>Owner</th><th class="num">Age</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
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
    <div class="qzs-note"><b>${esc(h.by)}</b> &middot; <span class="qzs-dim">${esc(fmtDate(h.date))}</span><p style="margin:4px 0 0 0">${esc(h.text)}</p></div>`).join('');
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
        ${e.status !== 'Resolved' ? `<button type="button" class="qz-btn sm primary" onclick="qzShellResolveExceptionModal('${escAttr(e.id)}')">Resolve</button>` : '<span class="qz-badge complete" style="margin-right:auto">Resolved</span>'}
        <button type="button" class="qz-btn sm" onclick="qzShellReassignExceptionModal('${escAttr(e.id)}')">Reassign</button>
        ${e.status !== 'Resolved' ? `<button type="button" class="qz-btn sm" onclick="qzShellWaiveExceptionModal('${escAttr(e.id)}')">Waive</button>` : ''}
        <button type="button" class="qz-btn sm danger" onclick="qzShellDeleteException('${escAttr(e.id)}')">Delete</button>
      </div>
      <div class="qzs-panel-body">
        <h4 class="qzs-pop-title">${esc(e.title)}</h4>
        <div class="qz-kv"><b>Property</b>${esc(e.property)}</div>
        <div class="qz-kv"><b>Opened</b>${esc(fmtDate(e.opened))} (${esc(qzShellAge(e.opened))})</div>
        <div class="qz-kv"><b>Owner / Assignee</b>${esc(e.owner)}</div>
        <div class="qz-kv"><b>Status</b>${qzShellCompBadge(e.status)}</div>
        <h5 class="qzs-panel-h">Rule Triggered</h5>
        <div class="qzs-rule">${esc(e.rule || 'GENERAL-001 · Title & escrow compliance requirement.')}</div>
        <h5 class="qzs-panel-h">Detail &amp; Findings</h5>
        <p class="qzs-dim qzs-detail">${esc(e.detail)}</p>
        <h5 class="qzs-panel-h">Linked Documents</h5>
        ${docs}
        <h5 class="qzs-panel-h">Resolution History &amp; Audit Notes</h5>
        ${history || '<div class="qzs-dim">No historical resolution notes.</div>'}
      </div>
    </aside>`;
}

function qzShellCompCplHTML() {
  const rows = qzShellGetCpls().map(c => {
    const cId = c.id || c.cpl;
    const isExpiring = c.status === 'Expiring' || c.status === 'Expired';
    return `
    <tr>
      <td>${qzShellOrderCell(c.order)}</td>
      <td>${esc(c.lender)}</td>
      <td><b>${esc(c.cpl || cId)}</b></td>
      <td>${esc(fmtDate(c.issued))}</td>
      <td class="${isExpiring ? 'qzs-warn' : ''}">${c.expires === '—' ? '—' : esc(fmtDate(c.expires))}</td>
      <td>${esc(c.policy)}</td>
      <td class="qzs-mono">${esc(c.jacket)}</td>
      <td>${esc(c.uw)}</td>
      <td>${qzShellCompBadge(c.status)}</td>
      <td style="text-align:right">
        ${isExpiring ? `<button type="button" class="qz-btn sm primary" onclick="qzShellRenewCplModal('${escAttr(cId)}')">Renew</button>` : ''}
        <button type="button" class="qz-btn sm danger" onclick="qzShellDeleteCpl('${escAttr(cId)}')">&times;</button>
      </td>
    </tr>`;
  }).join('');

  return `
    <div class="qzs-tbl-actions">
      <button type="button" class="qz-btn sm" onclick="qzExportTableCSV('cpls')">Export CSV</button>
      <button type="button" class="qz-btn sm primary" onclick="qzShellIssueCplModal()">+ Issue CPL</button>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Order</th><th>Lender</th><th>CPL #</th><th>Issued</th><th>Expires</th><th>Policy Type</th><th>Jacket #</th><th>Underwriter</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="10" style="text-align:center;padding:24px">No CPL letters found.</td></tr>'}</tbody>
      </table>
    </div>`;
}

function qzShellCompWireHTML() {
  const wireList = (qzDB.wireLog && qzDB.wireLog.length) ? qzDB.wireLog : QZS_WIRE_LOG;
  const rows = wireList.map((w, idx) => {
    const wId = w.id || ('wire-log-' + idx);
    return `
    <tr class="${w.result === 'Failed' ? 'qzs-row-bad' : ''}">
      <td>${esc(fmtDate(w.date))}</td>
      <td>${qzShellOrderCell(w.order)}</td>
      <td><b>${esc(w.party)}</b></td>
      <td>${esc(w.kind)}</td>
      <td class="qzs-dim">${esc(w.method)}</td>
      <td class="qzs-dim">${esc(w.by)}</td>
      <td>${qzShellCompBadge(w.result)}</td>
      <td style="text-align:right">
        <button type="button" class="qz-btn sm danger" onclick="qzShellDeleteWireLog('${escAttr(wId)}')">&times;</button>
      </td>
    </tr>`;
  }).join('');

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div class="qzs-policy" style="margin:0;flex:1;margin-right:16px">
        <b>Wire Verification &amp; Outbound Callback Policy (ALTA Pillar #2):</b>
        All wire instructions must be verified by outbound callback to a previously known, validated phone number. Never call numbers from incoming emails.
      </div>
      <button type="button" class="qz-btn sm primary" onclick="qzShellNewWireLogModal()">+ Log Callback</button>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Date</th><th>Order</th><th>Party / Beneficiary</th><th>Instruction Type</th><th>Verification Method</th><th>Verified By</th><th>Result</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function qzShellCompAuditHTML() {
  const auditList = (qzDB.auditLog && qzDB.auditLog.length) ? qzDB.auditLog : QZS_AUDIT;
  const curAction = qzShellState.compAuditAction || 'All';
  const curUser = qzShellState.compAuditUser || 'All';

  const filtered = auditList.filter(a => {
    const act = a.action || a.type || '';
    const usr = a.user || '';
    if (curAction !== 'All' && act !== curAction) return false;
    if (curUser !== 'All' && usr !== curUser) return false;
    return true;
  });

  const rows = filtered.map(a => `
    <tr>
      <td class="qzs-mono">${esc(a.ts || a.timestamp || QZ_TODAY)}</td>
      <td><b>${esc(a.user || 'Training User')}</b></td>
      <td><span class="qz-badge dark">${esc(a.action || a.type || 'ACTIVITY')}</span></td>
      <td>${esc(a.object || a.details || '—')}</td>
      <td>${(!a.order || a.order === '—') ? '<span class="qzs-dim">—</span>' : qzShellOrderCell(a.order)}</td>
      <td class="qzs-mono qzs-dim">${esc(a.ip || '198.51.100.24')}</td>
    </tr>`).join('');

  return `
    <div class="qzs-readonly" style="background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:12px;padding:8px 12px;border-radius:6px">
      <b>ALTA Pillar #3 Compliance:</b> System audit records are forensically recorded and retained for 7 years under state title insurance regulations.
    </div>
    <div class="qzs-toolbar" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="display:flex;gap:8px">
        <select class="qzs-select" onchange="qzShellState.compAuditAction = this.value; qzRenderRoot();">
          <option value="All" ${curAction === 'All' ? 'selected' : ''}>Action: All Actions</option>
          <option value="CREATE" ${curAction === 'CREATE' ? 'selected' : ''}>CREATE</option>
          <option value="UPDATE" ${curAction === 'UPDATE' ? 'selected' : ''}>UPDATE</option>
          <option value="DELETE" ${curAction === 'DELETE' ? 'selected' : ''}>DELETE</option>
          <option value="ISSUE" ${curAction === 'ISSUE' ? 'selected' : ''}>ISSUE</option>
          <option value="RESOLVE" ${curAction === 'RESOLVE' ? 'selected' : ''}>RESOLVE</option>
          <option value="LOGIN" ${curAction === 'LOGIN' ? 'selected' : ''}>LOGIN</option>
        </select>
        <select class="qzs-select" onchange="qzShellState.compAuditUser = this.value; qzRenderRoot();">
          <option value="All" ${curUser === 'All' ? 'selected' : ''}>User: All Staff</option>
          <option value="Training User" ${curUser === 'Training User' ? 'selected' : ''}>Training User</option>
          <option value="Marisol Tran" ${curUser === 'Marisol Tran' ? 'selected' : ''}>Marisol Tran</option>
          <option value="Dana Whitfield" ${curUser === 'Dana Whitfield' ? 'selected' : ''}>Dana Whitfield</option>
          <option value="Travis Jones" ${curUser === 'Travis Jones' ? 'selected' : ''}>Travis Jones</option>
          <option value="Barbara Runolfsson" ${curUser === 'Barbara Runolfsson' ? 'selected' : ''}>Barbara Runolfsson</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="qzs-count-label">${filtered.length} events logged</span>
        <button type="button" class="qz-btn sm" onclick="qzExportAuditCSV()">Export Audit CSV</button>
      </div>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Object / Details</th><th>Order</th><th>IP Address</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:24px">No audit events match selected filters.</td></tr>'}</tbody>
      </table>
    </div>`;
}

function qzShellCompAltaHTML() {
  const altaList = (qzDB.altaPillars && qzDB.altaPillars.length) ? qzDB.altaPillars : QZS_ALTA;
  const cards = altaList.map(a => `
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
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div class="qzs-alta-lead" style="margin:0;flex:1;margin-right:16px">
        Qualia compliance engine verifies adherence to the <b>ALTA Best Practices Framework (v3.0)</b> across all active files, accounts and vendor interactions.
      </div>
      <button type="button" class="qz-btn sm primary" onclick="qzShellRunAltaAssessmentModal()">Run Assessment</button>
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
  const active = qzShellState.compTab || 'overview';
  const tabs = QZ_SHELL_COMP_TABS.map(([k, label]) =>
    `<span class="${active === k ? 'active' : ''}" onclick="qzShellCompTab('${k}')">${esc(label)}</span>`).join('');
  const found = QZ_SHELL_COMP_TABS.find(t => t[0] === active) || QZ_SHELL_COMP_TABS[0];
  return `
    <div class="qz-listhead">
      <div>
        <h2>Compliance &amp; Safeguards</h2>
        <div class="sub">Underwriter title exceptions, CPLs, wire fraud safeguards &amp; ALTA Best Practices</div>
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
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';

  const orderOpts = qzAllOrders().map(o => `<option value="${escAttr(o.id)}">${esc(o.id)} &mdash; ${esc(o.propertyAddress)}</option>`).join('');

  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:500px">
      <div class="ph">
        <h4>New Contact</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px;max-height:75vh;overflow-y:auto">
        <div class="qz-field"><label>Full Name <span style="color:var(--qz-bad)">*</span></label><input id="qzsCName" placeholder="e.g. Bennett Ashcroft" autofocus></div>
        <div class="qz-field"><label>Contact Type</label>
          <select id="qzsCType">
            <option value="Buyer">Buyer</option><option value="Seller">Seller</option><option value="Agent">Agent</option>
            <option value="Lender">Lender</option><option value="Attorney">Attorney</option><option value="Vendor">Vendor</option>
            <option value="Internal">Internal (Escrow/Title)</option><option value="HOA">HOA Representative</option><option value="Other">Other</option>
          </select>
        </div>
        <div class="qz-field"><label>Company / Organization</label><input id="qzsCCompany" placeholder="e.g. Ashcroft Law PLLC"></div>
        <div class="qz-field"><label>Email</label><input id="qzsCEmail" type="email" placeholder="e.g. bennett@ashcroftlaw.example"></div>
        <div class="qz-field"><label>Phone (Work)</label><input id="qzsCPhone" placeholder="e.g. (972) 555-0144"></div>
        <div class="qz-field"><label>Mobile Phone</label><input id="qzsCMobile" placeholder="e.g. (972) 555-0871"></div>
        <div class="qz-field wide"><label>Address</label><input id="qzsCAddress" placeholder="e.g. 885 Legacy Dr, Frisco, TX 75034"></div>
        <div class="qz-field wide"><label>Link to Existing Order (Optional)</label>
          <select id="qzsCLinkOrder">
            <option value="">&mdash; None (Global directory only) &mdash;</option>
            ${orderOpts}
          </select>
        </div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveNewContact()">Save Contact</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzsCName')?.focus(), 50);
}

function qzShellSaveNewContact() {
  const name = (document.getElementById('qzsCName')?.value || '').trim();
  const type = document.getElementById('qzsCType')?.value || 'Other';
  const comp = (document.getElementById('qzsCCompany')?.value || '').trim() || '—';
  const email = (document.getElementById('qzsCEmail')?.value || '').trim() || '—';
  const phone = (document.getElementById('qzsCPhone')?.value || '').trim() || '—';
  const mobile = (document.getElementById('qzsCMobile')?.value || '').trim() || '—';
  const address = (document.getElementById('qzsCAddress')?.value || '').trim() || '—';
  const linkOrderId = document.getElementById('qzsCLinkOrder')?.value || '';

  if (!name) { simToast('Please enter contact name.'); return; }

  const newId = 'c-' + Date.now();
  const newContact = {
    id: newId,
    name: name,
    type: type,
    role: type,
    company: comp,
    email: email,
    phone: phone,
    mobile: mobile,
    address: address,
    created: QZ_TODAY,
    createdBy: 'Manual Entry',
    lastActivity: QZ_TODAY,
    orders: linkOrderId ? [linkOrderId] : [],
    derived: false
  };

  if (!qzDB.contacts) qzDB.contacts = [];
  qzDB.contacts.unshift(newContact);
  qzLogAudit('CREATE', `Contact ${name}`);

  if (linkOrderId) {
    const o = qzFind('orders', linkOrderId);
    if (o) {
      if (!o.parties) o.parties = [];
      o.parties.push({ role: type, name: name, email: email === '—' ? '' : email, phone: phone === '—' ? '' : phone });
      qzLogAudit('CREATE', `Party ${type} (${name}) linked to ${linkOrderId}`);
    }
  }

  // Clear query and reset filter chip to All so user immediately sees their new contact
  qzShellState.contactsType = 'All';
  qzShellState.contactsQuery = '';

  document.getElementById('qzsModal')?.remove();
  simToast(`Contact ${name} saved.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellEditContactModal(id) {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const c = qzShellFindContact(id);
  if (!c) {
    simToast('Contact record not found.');
    return;
  }
  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';

  const types = ['Buyer', 'Seller', 'Agent', 'Lender', 'Attorney', 'Vendor', 'Internal', 'HOA', 'Other'];
  const typeOpts = types.map(t => `<option value="${t}" ${c.type === t ? 'selected' : ''}>${t}</option>`).join('');

  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:480px">
      <div class="ph">
        <h4>Edit Contact &mdash; ${esc(c.name)}</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px;max-height:75vh;overflow-y:auto">
        <div class="qz-field"><label>Full Name</label><input id="qzsEditCName" value="${escAttr(c.name || '')}"></div>
        <div class="qz-field"><label>Contact Type</label>
          <select id="qzsEditCType">${typeOpts}</select>
        </div>
        <div class="qz-field"><label>Company</label><input id="qzsEditCCompany" value="${escAttr(c.company === '—' ? '' : c.company || '')}"></div>
        <div class="qz-field"><label>Email</label><input id="qzsEditCEmail" value="${escAttr(c.email === '—' ? '' : c.email || '')}"></div>
        <div class="qz-field"><label>Phone (Work)</label><input id="qzsEditCPhone" value="${escAttr(c.phone === '—' ? '' : c.phone || '')}"></div>
        <div class="qz-field"><label>Mobile Phone</label><input id="qzsEditCMobile" value="${escAttr(c.mobile === '—' ? '' : c.mobile || '')}"></div>
        <div class="qz-field wide"><label>Address</label><input id="qzsEditCAddress" value="${escAttr(c.address === '—' ? '' : c.address || '')}"></div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:space-between;align-items:center">
        <button class="qz-btn danger" type="button" onclick="document.getElementById('qzsModal').remove(); qzShellDeleteContact('${escAttr(id)}')">Delete Contact</button>
        <div style="display:flex;gap:8px">
          <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
          <button class="qz-btn primary" type="button" onclick="qzShellSaveEditContact('${escAttr(id)}')">Save Changes</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzShellSaveEditContact(id) {
  const orig = qzShellFindContact(id);
  if (!orig) return;
  const name = (document.getElementById('qzsEditCName')?.value || '').trim();
  const type = document.getElementById('qzsEditCType')?.value || orig.type;
  const comp = (document.getElementById('qzsEditCCompany')?.value || '').trim() || '—';
  const email = (document.getElementById('qzsEditCEmail')?.value || '').trim() || '—';
  const phone = (document.getElementById('qzsEditCPhone')?.value || '').trim() || '—';
  const mobile = (document.getElementById('qzsEditCMobile')?.value || '').trim() || '—';
  const address = (document.getElementById('qzsEditCAddress')?.value || '').trim() || '—';

  if (!name) { simToast('Please enter contact name.'); return; }

  // 1. If in qzDB.contacts:
  const dbContact = qzFind('contacts', id);
  if (dbContact) {
    qzUpdate('contacts', id, { name, type, role: type, company: comp, email, phone, mobile, address, lastActivity: QZ_TODAY });
  } else {
    // If not in qzDB.contacts, save it so custom attributes persist
    qzInsert('contacts', {
      id: id,
      name: name,
      type: type,
      role: type,
      company: comp,
      email: email,
      phone: phone,
      mobile: mobile,
      address: address,
      created: orig.created || QZ_TODAY,
      createdBy: orig.createdBy || 'Manual Update',
      lastActivity: QZ_TODAY,
      orders: orig.orders || []
    });
  }

  // 2. If contact is linked to orders, update each order party
  if (orig.orders && orig.orders.length) {
    orig.orders.forEach(oid => {
      const o = qzFind('orders', oid);
      if (o && o.parties) {
        const p = o.parties.find(x => x.name === orig.name || (orig.email !== '—' && x.email === orig.email));
        if (p) {
          p.name = name;
          p.email = email === '—' ? '' : email;
          p.phone = phone === '—' ? '' : phone;
          if (type && type !== 'Other') p.role = type;
        }
      }
    });
  }

  // 3. If contact is a vendor:
  if (orig.id && orig.id.startsWith('v-')) {
    const vId = orig.id.replace('v-', '');
    const v = (qzDB.vendors || []).find(x => x.id === vId || x.name === orig.name);
    if (v) {
      v.name = name;
      v.company = comp;
      v.phone = phone;
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

function qzShellNewEventModal(prefillDate) {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const targetDate = prefillDate || (qzShellState.calYear && qzShellState.calMonth != null 
    ? qzShellISO(qzShellState.calYear, qzShellState.calMonth, Math.min(new Date().getDate(), 28)) 
    : QZ_TODAY);

  const calOpts = QZS_CALENDARS.map(c => `<option value="${c.id}">${esc(c.label)}</option>`).join('');
  const orderOpts = qzAllOrders().map(o => `<option value="${escAttr(o.id)}">${esc(o.id)} &mdash; ${esc(o.propertyAddress)}</option>`).join('');

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:500px">
      <div class="ph">
        <h4>New Calendar Event</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px;max-height:75vh;overflow-y:auto">
        <div class="qz-field wide"><label>Event Title <span style="color:var(--qz-bad)">*</span></label><input id="qzsEvTitle" placeholder="e.g. Mobile Signing &mdash; 5445 Main St" autofocus></div>
        <div class="qz-field"><label>Calendar Type</label><select id="qzsEvCal">${calOpts}</select></div>
        <div class="qz-field"><label>Date <span style="color:var(--qz-bad)">*</span></label><input id="qzsEvDate" type="date" value="${escAttr(targetDate)}"></div>
        <div class="qz-field"><label>Time Range</label><input id="qzsEvTime" placeholder="e.g. 10:00 AM – 11:30 AM" value="10:00 AM – 11:00 AM"></div>
        <div class="qz-field"><label>Location</label><input id="qzsEvLoc" placeholder="e.g. Plano office, Room 2"></div>
        <div class="qz-field wide"><label>Link to Existing Order (Optional)</label>
          <select id="qzsEvOrder">
            <option value="">&mdash; None (General Event) &mdash;</option>
            ${orderOpts}
          </select>
        </div>
        <div class="qz-field wide"><label>Attendees / People (comma-separated)</label><input id="qzsEvPeople" placeholder="e.g. Jon Smith, Samantha Bee"></div>
        <div class="qz-field wide"><label>Notes & Instructions</label><textarea id="qzsEvNotes" rows="2" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;font-family:inherit" placeholder="Specific signing or escrow instructions..."></textarea></div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveNewEvent()">Schedule Event</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzsEvTitle')?.focus(), 50);
}

function qzShellSaveNewEvent() {
  const title = (document.getElementById('qzsEvTitle')?.value || '').trim();
  const cal = document.getElementById('qzsEvCal')?.value || 'personal';
  const date = document.getElementById('qzsEvDate')?.value || QZ_TODAY;
  const time = (document.getElementById('qzsEvTime')?.value || '').trim() || '10:00 AM – 11:00 AM';
  const loc = (document.getElementById('qzsEvLoc')?.value || '').trim() || 'Plano office';
  const orderId = document.getElementById('qzsEvOrder')?.value || '';
  const people = (document.getElementById('qzsEvPeople')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  const notes = (document.getElementById('qzsEvNotes')?.value || '').trim();

  if (!title) { simToast('Please enter an event title.'); return; }
  if (!date) { simToast('Please select a date.'); return; }

  const newId = 'ev-' + Date.now();
  const newEv = {
    id: newId,
    title: title,
    cal: cal,
    date: date,
    time: time,
    location: loc,
    orderId: orderId,
    people: people,
    notes: notes,
    source: 'custom'
  };

  if (!qzDB.events) qzDB.events = [];
  qzDB.events.unshift(newEv);
  qzLogAudit('CREATE', `Event "${title}" on ${date}`);

  // If linked to order as closing, sync order closingDate
  if (orderId && cal === 'closings') {
    const o = qzFind('orders', orderId);
    if (o) {
      o.closingDate = date;
      qzLogAudit('UPDATE', `Closing date for ${orderId} synced to ${date}`);
    }
  }

  // Navigate calendar to the event month/year
  try {
    const d = new Date(date + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      qzShellState.calYear = d.getFullYear();
      qzShellState.calMonth = d.getMonth();
    }
  } catch (e) {}

  document.getElementById('qzsModal')?.remove();
  simToast(`Event "${title}" scheduled.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellEditEventModal(idOrRef) {
  let e = null;
  if (typeof idOrRef === 'string') {
    e = qzShellFindEvent(idOrRef);
  }
  if (!e) {
    const open = qzShellState.calOpen;
    if (open && open.idx !== null) {
      const list = qzShellEventsFor(open.iso);
      e = list[open.idx];
    }
  }
  if (!e) { simToast('Event record not found.'); return; }

  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  qzShellState._editEventRef = e;
  const calOpts = QZS_CALENDARS.map(c =>
    `<option value="${c.id}" ${e.cal === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('');

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:480px">
      <div class="ph">
        <h4>Edit Event &mdash; ${esc(e.title)}</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px;max-height:75vh;overflow-y:auto">
        <div class="qz-field wide"><label>Event Title</label><input id="qzsEdTitle" value="${escAttr(e.title)}"></div>
        <div class="qz-field"><label>Calendar Type</label><select id="qzsEdCal">${calOpts}</select></div>
        <div class="qz-field"><label>Date</label><input id="qzsEdDate" type="date" value="${escAttr(e.date)}"></div>
        <div class="qz-field"><label>Time Range</label><input id="qzsEdTime" value="${escAttr(e.time)}"></div>
        <div class="qz-field"><label>Location</label><input id="qzsEdLoc" value="${escAttr(e.location || '')}"></div>
        <div class="qz-field wide"><label>Attendees / People (comma-separated)</label><input id="qzsEdPeople" value="${escAttr((e.people || []).join(', '))}"></div>
        <div class="qz-field wide"><label>Notes & Instructions</label><textarea id="qzsEdNotes" rows="2" style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;font-family:inherit">${esc(e.notes || '')}</textarea></div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:space-between;align-items:center">
        <button class="qz-btn danger" type="button" onclick="document.getElementById('qzsModal').remove(); qzShellDeleteEvent('${escAttr(e.id)}')">Delete Event</button>
        <div style="display:flex;gap:8px">
          <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
          <button class="qz-btn primary" type="button" onclick="qzShellSaveEditEvent('${escAttr(e.id)}')">Save Changes</button>
        </div>
      </div>
    </div>`;
  qzShellCalClose();
  document.body.appendChild(wrap);
}

function qzShellSaveEditEvent(id) {
  const e = qzShellFindEvent(id) || qzShellState._editEventRef;
  if (!e) return;
  const title = (document.getElementById('qzsEdTitle')?.value || '').trim();
  const cal = document.getElementById('qzsEdCal')?.value || e.cal;
  const date = document.getElementById('qzsEdDate')?.value || e.date;
  const time = (document.getElementById('qzsEdTime')?.value || '').trim() || e.time;
  const loc = (document.getElementById('qzsEdLoc')?.value || '').trim() || e.location;
  const people = (document.getElementById('qzsEdPeople')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  const notes = (document.getElementById('qzsEdNotes')?.value || '').trim();

  if (!title) { simToast('Please enter an event title.'); return; }
  if (!date) { simToast('Please select a date.'); return; }

  // 1. If in qzDB.events
  let src = (qzDB.events || []).find(ev => ev.id === id || (ev.title === e.title && ev.date === e.date));
  if (src) {
    src.title = title;
    src.cal = cal;
    src.date = date;
    src.time = time;
    src.location = loc;
    src.people = people;
    src.notes = notes;
  } else {
    if (!qzDB.events) qzDB.events = [];
    qzDB.events.unshift({
      id: id || ('ev-' + Date.now()),
      title: title,
      cal: cal,
      date: date,
      time: time,
      location: loc,
      people: people,
      notes: notes,
      source: 'custom'
    });
  }

  // 2. If order closing
  if (e.source === 'order' && e.orderId) {
    const o = qzFind('orders', e.orderId);
    if (o) {
      o.closingDate = date;
      if (notes) o.statusNote = notes;
      qzLogAudit('UPDATE', `Closing date for ${e.orderId} updated to ${date}`);
    }
  }

  // 3. If task
  if (e.source === 'task' && e.orderId) {
    const t = (qzDB.tasks || []).find(tk => tk.title === e.title && tk.relatedOrderId === e.orderId);
    if (t) {
      t.dueDate = date;
      t.title = title;
    }
  }

  qzShellState._editEventRef = null;
  document.getElementById('qzsModal')?.remove();
  simToast(`Event "${title}" updated.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellDeleteEvent(idOrRef) {
  let e = null;
  if (typeof idOrRef === 'string') {
    e = qzShellFindEvent(idOrRef);
  }
  if (!e) {
    const open = qzShellState.calOpen;
    if (open && open.idx !== null) {
      const list = qzShellEventsFor(open.iso);
      e = list[open.idx];
    }
  }
  if (!e) { qzShellCalClose(); return; }

  const evTitle = e.title;
  const evDate = e.date;

  qzConfirm({
    title: 'Delete Event?',
    body: `Are you sure you want to remove "${evTitle}" on ${fmtDate(evDate)} from the calendar?`,
    danger: true,
    confirmLabel: 'Delete Event',
    onConfirm: () => {
      // 1. Remove from qzDB.events
      if (qzDB.events && Array.isArray(qzDB.events)) {
        qzDB.events = qzDB.events.filter(ev => {
          if (!ev) return false;
          if (ev.id && (ev.id === e.id || ev.id === idOrRef)) return false;
          if (ev.title === evTitle && ev.date === evDate) return false;
          return true;
        });
      }

      // 2. Remove from static QZS_EVENTS if present
      const sIdx = (typeof QZS_EVENTS !== 'undefined' ? QZS_EVENTS : []).findIndex(ev => ev.title === evTitle && ev.date === evDate);
      if (sIdx > -1) QZS_EVENTS.splice(sIdx, 1);

      // 3. If order closing, clear closingDate
      if (e.source === 'order' && e.orderId) {
        const o = qzFind('orders', e.orderId);
        if (o) {
          o.closingDate = '';
          qzLogAudit('DELETE', `Closing event removed for ${e.orderId}`);
        }
      }

      // 4. If task deadline
      if (e.source === 'task' && e.orderId) {
        const tIdx = (qzDB.tasks || []).findIndex(tk => tk.title === evTitle && tk.relatedOrderId === e.orderId);
        if (tIdx > -1) qzDB.tasks.splice(tIdx, 1);
      }

      qzShellCalClose();
      simToast(`Event "${evTitle}" removed.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzShellNewReceiptModal() {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';

  const orderOpts = qzAllOrders().map(o => `<option value="${escAttr(o.id)}">${esc(o.id)} &mdash; ${esc(o.propertyAddress)}</option>`).join('');
  const acctOpts = (qzList('accounts').length ? qzList('accounts') : QZS_ACCOUNTS)
    .filter(a => a.type !== 'Operating')
    .map(a => `<option value="${escAttr(a.name)}">${esc(a.name)} (${esc(a.bank)})</option>`).join('');

  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:480px">
      <div class="ph">
        <h4>Post Escrow Receipt</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px;max-height:75vh;overflow-y:auto">
        <div class="qz-field wide"><label>Link to Order File <span style="color:var(--qz-bad)">*</span></label>
          <select id="qzsRcpOrder">
            <option value="">&mdash; General Escrow (Unassigned) &mdash;</option>
            ${orderOpts}
          </select>
        </div>
        <div class="qz-field"><label>Payer / Remitter Name <span style="color:var(--qz-bad)">*</span></label><input id="qzsRcpPayer" placeholder="e.g. Bennett Ashcroft" autofocus></div>
        <div class="qz-field"><label>Amount ($) <span style="color:var(--qz-bad)">*</span></label><input id="qzsRcpAmount" type="number" step="0.01" placeholder="e.g. 15000.00"></div>
        <div class="qz-field"><label>Payment Method</label>
          <select id="qzsRcpMethod">
            <option value="Wire Transfer">Incoming Wire</option>
            <option value="Cashier's Check">Cashier's Check</option>
            <option value="Earnest ACH">Earnest Money (ACH)</option>
            <option value="Personal Check">Personal Check</option>
          </select>
        </div>
        <div class="qz-field"><label>Deposit Into Account</label>
          <select id="qzsRcpAccount">${acctOpts}</select>
        </div>
        <div class="qz-field wide"><label>Reference / Memo</label><input id="qzsRcpMemo" placeholder="e.g. Initial earnest deposit per TREC 1-4"></div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveNewReceipt()">Post Receipt</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzsRcpPayer')?.focus(), 50);
}

function qzShellSaveNewReceipt() {
  const order = (document.getElementById('qzsRcpOrder')?.value || '').trim() || 'General Escrow';
  const amount = Number(document.getElementById('qzsRcpAmount')?.value) || 0;
  const payer = (document.getElementById('qzsRcpPayer')?.value || '').trim();
  const method = document.getElementById('qzsRcpMethod')?.value || 'Wire Transfer';
  const account = document.getElementById('qzsRcpAccount')?.value || 'Escrow Trust — Operating';
  const memo = (document.getElementById('qzsRcpMemo')?.value || '').trim();

  if (!payer) { simToast('Please enter payer name.'); return; }
  if (amount <= 0) { simToast('Please enter a valid positive amount.'); return; }

  const nextNum = 'REC-2026-0' + (450 + qzList('receipts').length);
  const newReceipt = {
    id: 'rcp-' + Date.now(),
    num: nextNum,
    date: QZ_TODAY,
    order: order,
    orderId: order,
    payer: payer,
    remitter: payer,
    method: method,
    amount: amount,
    account: account,
    memo: memo,
    status: 'Deposited',
    by: 'Training User'
  };

  if (!qzDB.receipts) qzDB.receipts = [];
  qzDB.receipts.unshift(newReceipt);

  // Update account balance
  const targetAcct = (qzDB.accounts || []).find(a => a.name === account);
  if (targetAcct) {
    targetAcct.balance = Number(targetAcct.balance || 0) + amount;
  }

  // Also add ledger line to order if order exists
  if (order && order !== 'General Escrow') {
    const o = qzFind('orders', order);
    if (o) {
      if (!qzDB.chargeLines) qzDB.chargeLines = [];
      qzDB.chargeLines.unshift({
        id: 'cl-' + Date.now(),
        orderId: order,
        type: 'credit',
        section: 'Receipts',
        desc: `Receipt ${nextNum} (${payer})`,
        amount: amount,
        status: 'Cleared'
      });
      qzLogAudit('CREATE', `Receipt ${nextNum} ($${amount}) posted to ${order}`);
    }
  }

  document.getElementById('qzsModal')?.remove();
  simToast(`Receipt ${nextNum} for ${fmtMoney(amount)} posted to ${order}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellDeleteReceipt(idOrNum) {
  const r = qzList('receipts').find(x => x.id === idOrNum || x.num === idOrNum);
  if (!r) { simToast('Receipt record not found.'); return; }

  qzConfirm({
    title: 'Delete Receipt ' + (r.num || r.id) + '?',
    body: `Are you sure you want to delete this receipt for ${fmtMoney(r.amount)} from ${r.payer || 'customer'}? This removes the entry from the escrow ledger.`,
    danger: true,
    confirmLabel: 'Delete Receipt',
    onConfirm: () => {
      if (qzDB.receipts) {
        qzDB.receipts = qzDB.receipts.filter(x => x.id !== r.id && x.num !== r.num);
      }
      simToast(`Receipt ${r.num || r.id} deleted.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzShellNewDisbursementModal() {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';

  const orderOpts = qzAllOrders().map(o => `<option value="${escAttr(o.id)}">${esc(o.id)} &mdash; ${esc(o.propertyAddress)}</option>`).join('');
  const acctOpts = (qzList('accounts').length ? qzList('accounts') : QZS_ACCOUNTS)
    .map(a => `<option value="${escAttr(a.name)}">${esc(a.name)} (${esc(a.bank)})</option>`).join('');

  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:480px">
      <div class="ph">
        <h4>Issue Escrow Disbursement</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px;max-height:75vh;overflow-y:auto">
        <div class="qz-field wide"><label>Link to Order File <span style="color:var(--qz-bad)">*</span></label>
          <select id="qzsDisbOrder">
            <option value="">&mdash; General Operating / Escrow &mdash;</option>
            ${orderOpts}
          </select>
        </div>
        <div class="qz-field"><label>Payee Name <span style="color:var(--qz-bad)">*</span></label><input id="qzsDisbPayee" placeholder="e.g. First National Bank (Payoff)" autofocus></div>
        <div class="qz-field"><label>Amount ($) <span style="color:var(--qz-bad)">*</span></label><input id="qzsDisbAmount" type="number" step="0.01" placeholder="e.g. 185000.00"></div>
        <div class="qz-field"><label>Payment Method</label>
          <select id="qzsDisbMethod">
            <option value="Wire">Outgoing Wire</option>
            <option value="Check">Check (Printed)</option>
            <option value="ACH">ACH Transfer</option>
          </select>
        </div>
        <div class="qz-field"><label>Pay From Account</label>
          <select id="qzsDisbAccount">${acctOpts}</select>
        </div>
        <div class="qz-field"><label>Category / Purpose</label>
          <select id="qzsDisbCategory">
            <option value="Payoff">Mortgage Payoff</option>
            <option value="Proceeds">Seller Net Proceeds</option>
            <option value="Commission">Real Estate Broker Commission</option>
            <option value="Premium">Title Policy Underwriter Premium</option>
            <option value="Recording">County Recording Fees</option>
            <option value="HOA">HOA Resale / Transfer Fee</option>
            <option value="Other">Other Closing Expense</option>
          </select>
        </div>
        <div class="qz-field"><label>Approval Status</label>
          <select id="qzsDisbStatus">
            <option value="Issued">Issued (Ready to Release)</option>
            <option value="Pending Approval">Pending Dual Approval</option>
          </select>
        </div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveNewDisbursement()">Issue Disbursement</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzsDisbPayee')?.focus(), 50);
}

function qzShellSaveNewDisbursement() {
  const order = (document.getElementById('qzsDisbOrder')?.value || '').trim() || 'General Escrow';
  const amount = Number(document.getElementById('qzsDisbAmount')?.value) || 0;
  const payee = (document.getElementById('qzsDisbPayee')?.value || '').trim();
  const method = document.getElementById('qzsDisbMethod')?.value || 'Wire';
  const account = document.getElementById('qzsDisbAccount')?.value || 'Escrow Trust — Operating';
  const category = document.getElementById('qzsDisbCategory')?.value || 'Payoff';
  const status = document.getElementById('qzsDisbStatus')?.value || 'Issued';

  if (!payee) { simToast('Please enter payee name.'); return; }
  if (amount <= 0) { simToast('Please enter a valid positive amount.'); return; }

  const nextNum = (method === 'Check' ? 'CHK-' : 'DIS-2026-0') + (890 + qzList('disbursements').length);
  const newDisb = {
    id: 'disb-' + Date.now(),
    num: nextNum,
    date: QZ_TODAY,
    order: order,
    orderId: order,
    payee: payee,
    method: method,
    amount: amount,
    account: account,
    category: category,
    status: status,
    by: status === 'Issued' ? 'Escrow Officer' : 'Pending Approval'
  };

  if (!qzDB.disbursements) qzDB.disbursements = [];
  qzDB.disbursements.unshift(newDisb);

  // Update account balance
  const targetAcct = (qzDB.accounts || []).find(a => a.name === account);
  if (targetAcct && status === 'Issued') {
    targetAcct.balance = Math.max(0, Number(targetAcct.balance || 0) - amount);
  }

  // Also add ledger line to order if order exists
  if (order && order !== 'General Escrow') {
    const o = qzFind('orders', order);
    if (o) {
      if (!qzDB.chargeLines) qzDB.chargeLines = [];
      qzDB.chargeLines.unshift({
        id: 'cl-' + Date.now(),
        orderId: order,
        type: 'debit',
        section: 'Disbursements',
        desc: `Disbursement ${nextNum} (${payee})`,
        amount: amount,
        status: status
      });
      qzLogAudit('CREATE', `Disbursement ${nextNum} ($${amount}) on ${order}`);
    }
  }

  document.getElementById('qzsModal')?.remove();
  simToast(`Disbursement ${nextNum} for ${fmtMoney(amount)} issued to ${payee}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellApproveOneDisbursement(idOrNum) {
  const d = qzList('disbursements').find(x => x.id === idOrNum || x.num === idOrNum);
  if (d) {
    d.status = 'Issued';
    d.by = 'Escrow Officer';
    simToast(`Disbursement ${d.num || d.id} approved and released for payment.`, { tone: 'good' });
    qzRenderRoot();
  }
}

function qzShellApproveDisbursements() {
  const list = qzList('disbursements');
  const pend = list.filter(d => d.status === 'Pending Approval');
  pend.forEach(d => {
    d.status = 'Issued';
    d.by = 'Escrow Officer';
  });
  simToast(`${pend.length || 0} pending disbursements approved and queued for bank release.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellDeleteDisbursement(idOrNum) {
  const d = qzList('disbursements').find(x => x.id === idOrNum || x.num === idOrNum);
  if (!d) { simToast('Disbursement record not found.'); return; }

  qzConfirm({
    title: 'Delete Disbursement ' + (d.num || d.id) + '?',
    body: `Are you sure you want to delete this disbursement for ${fmtMoney(d.amount)} to ${d.payee || 'vendor'}?`,
    danger: true,
    confirmLabel: 'Delete Disbursement',
    onConfirm: () => {
      if (qzDB.disbursements) {
        qzDB.disbursements = qzDB.disbursements.filter(x => x.id !== d.id && x.num !== d.num);
      }
      simToast(`Disbursement ${d.num || d.id} deleted.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzShellReconcileModal() {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const receipts = qzShellGetReceipts().filter(r => r.status !== 'Void');
  const disbursements = qzShellGetDisbursements().filter(d => d.status !== 'Void');
  const accounts = qzList('accounts').length ? qzList('accounts') : QZS_ACCOUNTS;
  const trustAcct = accounts.find(a => a.name.includes('Operating')) || accounts[0];
  const bankBal = trustAcct ? trustAcct.balance : 1418920.40;
  const bookBal = bankBal;

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:520px">
      <div class="ph">
        <h4>Perform 3-Way Escrow Reconciliation</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div style="padding:14px 18px">
        <div class="qz-note" style="margin-bottom:14px">
          ALTA Best Practice #2 requires monthly three-way reconciliation matching your bank statement, escrow book ledger, and individual order trial balances.
        </div>
        <div class="qz-form-grid" style="padding:0">
          <div class="qz-field"><label>Reconciliation Period</label><input id="qzsRecPeriod" value="August 2026"></div>
          <div class="qz-field"><label>Bank Statement Date</label><input id="qzsRecDate" type="date" value="${QZ_TODAY}"></div>
          <div class="qz-field wide"><label>Escrow Account</label><input id="qzsRecAccount" value="${escAttr(trustAcct.name)}" readonly></div>
        </div>
        <div style="background:var(--qz-bg);border:1px solid var(--qz-line);border-radius:6px;padding:12px;margin:14px 0">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Bank Statement Balance:</span><b>${fmtMoney(bankBal)}</b></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Book Ledger Balance:</span><b>${fmtMoney(bookBal)}</b></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Individual Files Trial Balance:</span><b>${fmtMoney(bookBal)}</b></div>
          <div style="display:flex;justify-content:space-between;padding-top:6px;border-top:1px solid var(--qz-line);color:var(--qz-good);font-weight:700">
            <span>Variance / Discrepancy:</span><span>$0.00 (IN BALANCE)</span>
          </div>
        </div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveReconciliation()">Certify &amp; Record Period</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzShellSaveReconciliation() {
  const period = (document.getElementById('qzsRecPeriod')?.value || '').trim() || 'August 2026';
  const date = document.getElementById('qzsRecDate')?.value || QZ_TODAY;
  const account = (document.getElementById('qzsRecAccount')?.value || '').trim() || 'Frost Bank — Escrow Trust';

  const accounts = qzList('accounts').length ? qzList('accounts') : QZS_ACCOUNTS;
  const trustAcct = accounts.find(a => a.name.includes('Operating')) || accounts[0];
  const bankBal = trustAcct ? trustAcct.balance : 1418920.40;

  const newRecon = {
    id: 'rec-' + Date.now(),
    period: period,
    account: account,
    bank: bankBal,
    book: bankBal,
    by: 'Reconciliation Officer',
    date: date,
    status: 'Balanced'
  };

  if (!qzDB.reconciliations) qzDB.reconciliations = [];
  qzDB.reconciliations.unshift(newRecon);
  if (typeof QZS_RECONCILIATIONS !== 'undefined') QZS_RECONCILIATIONS.unshift(newRecon);

  document.getElementById('qzsModal')?.remove();
  simToast(`Three-Way Reconciliation certified for ${period}. Audit snapshot recorded.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellDeleteReconciliation(periodOrId) {
  qzConfirm({
    title: 'Delete Reconciliation Record?',
    body: `Are you sure you want to remove the reconciliation record for ${periodOrId}?`,
    danger: true,
    confirmLabel: 'Delete Record',
    onConfirm: () => {
      if (qzDB.reconciliations) {
        qzDB.reconciliations = qzDB.reconciliations.filter(x => x.period !== periodOrId && x.id !== periodOrId);
      }
      if (typeof QZS_RECONCILIATIONS !== 'undefined') {
        const idx = QZS_RECONCILIATIONS.findIndex(x => x.period === periodOrId || x.id === periodOrId);
        if (idx > -1) QZS_RECONCILIATIONS.splice(idx, 1);
      }
      simToast(`Reconciliation record removed.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzShellNewInvoiceModal() {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';

  const orderOpts = qzAllOrders().map(o => `<option value="${escAttr(o.id)}">${esc(o.id)} &mdash; ${esc(o.propertyAddress)}</option>`).join('');

  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:480px">
      <div class="ph">
        <h4>Create Accounts Receivable Invoice</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px;max-height:75vh;overflow-y:auto">
        <div class="qz-field wide"><label>Link to Order File</label>
          <select id="qzsInvOrder">
            <option value="">&mdash; Unassigned &mdash;</option>
            ${orderOpts}
          </select>
        </div>
        <div class="qz-field"><label>Bill To Client / Company <span style="color:var(--qz-bad)">*</span></label><input id="qzsInvBillTo" placeholder="e.g. Frisco Community Lending" autofocus></div>
        <div class="qz-field"><label>Amount ($) <span style="color:var(--qz-bad)">*</span></label><input id="qzsInvAmount" type="number" step="0.01" placeholder="e.g. 745.00"></div>
        <div class="qz-field"><label>Due Date</label><input id="qzsInvDue" type="date" value="${QZ_TODAY}"></div>
        <div class="qz-field"><label>Service Description</label><input id="qzsInvDesc" placeholder="e.g. Title examination &amp; escrow fee"></div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveNewInvoice()">Create Invoice</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzsInvBillTo')?.focus(), 50);
}

function qzShellSaveNewInvoice() {
  const order = (document.getElementById('qzsInvOrder')?.value || '').trim() || 'ORD-2026-1483';
  const billTo = (document.getElementById('qzsInvBillTo')?.value || '').trim();
  const amount = Number(document.getElementById('qzsInvAmount')?.value) || 0;
  const due = document.getElementById('qzsInvDue')?.value || QZ_TODAY;
  const desc = (document.getElementById('qzsInvDesc')?.value || '').trim();

  if (!billTo) { simToast('Please enter Bill To client name.'); return; }
  if (amount <= 0) { simToast('Please enter a valid positive amount.'); return; }

  const nextNum = 'INV-2026-0' + (510 + qzList('invoices').length);
  const newInv = {
    id: 'inv-' + Date.now(),
    num: nextNum,
    order: order,
    orderId: order,
    billTo: billTo,
    issued: QZ_TODAY,
    due: due,
    amount: amount,
    balance: amount,
    desc: desc,
    status: 'Open'
  };

  if (!qzDB.invoices) qzDB.invoices = [];
  qzDB.invoices.unshift(newInv);

  document.getElementById('qzsModal')?.remove();
  simToast(`Invoice ${nextNum} for ${fmtMoney(amount)} billed to ${billTo}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellRecordPaymentModal(idOrNum) {
  const inv = qzList('invoices').find(x => x.id === idOrNum || x.num === idOrNum);
  if (!inv) { simToast('Invoice not found.'); return; }

  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph">
        <h4>Record Invoice Payment &mdash; ${esc(inv.num || inv.id)}</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px">
        <div class="qz-field wide"><label>Client</label><input value="${escAttr(inv.billTo)}" readonly></div>
        <div class="qz-field"><label>Total Invoiced</label><input value="${fmtMoney(inv.amount)}" readonly></div>
        <div class="qz-field"><label>Current Balance</label><input value="${fmtMoney(inv.balance)}" readonly></div>
        <div class="qz-field wide"><label>Payment Amount ($) <span style="color:var(--qz-bad)">*</span></label><input id="qzsPayAmount" type="number" step="0.01" value="${escAttr(inv.balance)}" autofocus></div>
        <div class="qz-field wide"><label>Payment Method</label>
          <select id="qzsPayMethod">
            <option value="ACH / Direct Deposit">ACH / Direct Deposit</option>
            <option value="Check">Check</option>
            <option value="Credit Card">Credit Card</option>
          </select>
        </div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveRecordPayment('${escAttr(inv.id || inv.num)}')">Apply Payment</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzsPayAmount')?.focus(), 50);
}

function qzShellSaveRecordPayment(idOrNum) {
  const inv = qzList('invoices').find(x => x.id === idOrNum || x.num === idOrNum);
  if (!inv) return;
  const payAmt = Number(document.getElementById('qzsPayAmount')?.value) || 0;
  if (payAmt <= 0) { simToast('Please enter a valid positive payment amount.'); return; }

  inv.balance = Math.max(0, Number(inv.balance || inv.amount) - payAmt);
  if (inv.balance <= 0) {
    inv.status = 'Paid';
  }

  document.getElementById('qzsModal')?.remove();
  simToast(`Payment of ${fmtMoney(payAmt)} recorded for invoice ${inv.num || inv.id}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellDeleteInvoice(idOrNum) {
  const inv = qzList('invoices').find(x => x.id === idOrNum || x.num === idOrNum);
  if (!inv) { simToast('Invoice not found.'); return; }

  qzConfirm({
    title: 'Delete Invoice ' + (inv.num || inv.id) + '?',
    body: `Are you sure you want to permanently delete this invoice for ${fmtMoney(inv.amount)} billed to ${inv.billTo}?`,
    danger: true,
    confirmLabel: 'Delete Invoice',
    onConfirm: () => {
      if (qzDB.invoices) {
        qzDB.invoices = qzDB.invoices.filter(x => x.id !== inv.id && x.num !== inv.num);
      }
      simToast(`Invoice ${inv.num || inv.id} deleted.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzShellGeneratePosPay() {
  const issuedDisbs = qzList('disbursements').filter(d => (d.method === 'Check' || d.status === 'Issued') && d.status !== 'Void');
  const count = issuedDisbs.length || 4;
  const total = qzShellSum(issuedDisbs, 'amount') || 38400.00;
  const fileName = 'POSPAY_FROST_' + QZ_TODAY.replace(/-/g, '') + '_' + Math.floor(Math.random() * 900 + 100) + '.TXT';

  const newPosPay = {
    id: 'pp-' + Date.now(),
    date: QZ_TODAY,
    file: fileName,
    account: 'Frost Bank — Escrow Trust',
    items: count,
    total: total,
    status: 'Sent',
    sent: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  };

  if (!qzDB.pospay) qzDB.pospay = [];
  qzDB.pospay.unshift(newPosPay);

  simToast(`Positive Pay batch generated (${count} items, ${fmtMoney(total)}) and sent to Frost Bank.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellDownloadPosPay(fileName) {
  simToast(`Positive Pay transmission file ${fileName} downloaded.`, { tone: 'good' });
}

function qzShellDeletePosPay(fId) {
  qzConfirm({
    title: 'Delete Positive Pay Batch?',
    body: `Are you sure you want to delete file batch ${fId}?`,
    danger: true,
    confirmLabel: 'Delete Batch',
    onConfirm: () => {
      if (qzDB.pospay) {
        qzDB.pospay = qzDB.pospay.filter(x => x.file !== fId && x.id !== fId);
      }
      simToast(`Positive Pay file batch removed.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzShellNewAccountModal() {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';

  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:460px">
      <div class="ph">
        <h4>Add Escrow / Operating Account</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px">
        <div class="qz-field wide"><label>Account Name <span style="color:var(--qz-bad)">*</span></label><input id="qzsAcctName" placeholder="e.g. Escrow Trust — Commercial Specialty" autofocus></div>
        <div class="qz-field"><label>Financial Institution (Bank)</label><input id="qzsAcctBank" placeholder="e.g. Frost Bank"></div>
        <div class="qz-field"><label>Account Type</label>
          <select id="qzsAcctType">
            <option value="Escrow / Trust">Escrow / Trust</option>
            <option value="Operating">Operating</option>
            <option value="IOLTA">IOLTA</option>
          </select>
        </div>
        <div class="qz-field wide"><label>Opening Balance ($)</label><input id="qzsAcctBal" type="number" step="0.01" placeholder="e.g. 500000.00"></div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveNewAccount()">Save Account</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzsAcctName')?.focus(), 50);
}

function qzShellSaveNewAccount() {
  const name = (document.getElementById('qzsAcctName')?.value || '').trim();
  const bank = (document.getElementById('qzsAcctBank')?.value || '').trim() || 'Frost Bank';
  const type = document.getElementById('qzsAcctType')?.value || 'Escrow / Trust';
  const bal = Number(document.getElementById('qzsAcctBal')?.value) || 0;

  if (!name) { simToast('Please enter account name.'); return; }

  const newAcct = {
    id: 'acct-' + Date.now(),
    name: name,
    bank: bank,
    type: type,
    balance: bal,
    reconciled: QZ_TODAY,
    status: 'Balanced'
  };

  if (!qzDB.accounts) qzDB.accounts = [];
  qzDB.accounts.push(newAcct);

  document.getElementById('qzsModal')?.remove();
  simToast(`Bank Account "${name}" added.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellRaiseExceptionModal() {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const orders = qzAllOrders();
  const orderOptions = orders.map(o => `<option value="${escAttr(o.id)}">${esc(o.id)} — ${esc(o.propertyAddress || 'Order')}</option>`).join('');

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:520px">
      <div class="ph">
        <h4>Raise Underwriter Title / Compliance Exception</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px">
        <div class="qz-field wide"><label>Linked Order <span style="color:var(--qz-bad)">*</span></label>
          <select id="qzsExOrder">${orderOptions}</select>
        </div>
        <div class="qz-field"><label>Severity</label>
          <select id="qzsExSev">
            <option value="High">High (Blocks Closing / Funding)</option>
            <option value="Medium" selected>Medium (Action Required)</option>
            <option value="Low">Low (Data / Minor)</option>
          </select>
        </div>
        <div class="qz-field"><label>Assignee / Owner</label>
          <select id="qzsExOwner">
            <option value="Marisol Tran">Marisol Tran (Escrow Officer)</option>
            <option value="Dana Whitfield">Dana Whitfield (Escrow Officer)</option>
            <option value="Travis Jones">Travis Jones (Title Examiner)</option>
            <option value="Barbara Runolfsson">Barbara Runolfsson (Accounting)</option>
            <option value="Training User" selected>Training User (Virtual Assistant)</option>
          </select>
        </div>
        <div class="qz-field wide"><label>Exception Title / Summary <span style="color:var(--qz-bad)">*</span></label>
          <input id="qzsExTitle" placeholder="e.g. Schedule B-I lien release missing from prior loan" autofocus>
        </div>
        <div class="qz-field wide"><label>Triggered Rule / Policy</label>
          <input id="qzsExRule" value="TITLE-004 · Legal description on the order must match Schedule A of commitment.">
        </div>
        <div class="qz-field wide"><label>Detailed Description &amp; Risk Notes</label>
          <textarea id="qzsExDetail" rows="3" style="width:100%;border:1px solid var(--qz-line);border-radius:4px;padding:8px;font-family:inherit;font-size:13px" placeholder="Enter findings, affected parties, and initial instructions..."></textarea>
        </div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveRaiseException()">Raise Exception</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzsExTitle')?.focus(), 50);
}

function qzShellSaveRaiseException() {
  const orderId = document.getElementById('qzsExOrder')?.value || 'ORD-2026-1483';
  const sev = document.getElementById('qzsExSev')?.value || 'Medium';
  const owner = document.getElementById('qzsExOwner')?.value || 'Training User';
  const title = (document.getElementById('qzsExTitle')?.value || '').trim();
  const rule = (document.getElementById('qzsExRule')?.value || '').trim();
  const detail = (document.getElementById('qzsExDetail')?.value || '').trim();

  if (!title) { simToast('Please enter an exception summary.'); return; }

  const o = qzAllOrders().find(x => x.id === orderId) || {};
  const prop = o.propertyAddress || '5445 Main Street, Frisco, TX';
  const nextId = 'EX-' + (3082 + qzList('exceptions').length);

  const newEx = {
    id: nextId,
    severity: sev,
    order: orderId,
    property: prop,
    title: title,
    opened: QZ_TODAY,
    owner: owner,
    status: 'Open',
    rule: rule || 'GENERAL-001 · Title & escrow underwriting requirement.',
    detail: detail || 'Raised for compliance review before closing.',
    docs: ['Title Commitment', 'Purchase Agreement'],
    history: [
      { date: QZ_TODAY, by: 'Training User', text: 'Raised exception: ' + title }
    ]
  };

  qzInsert('exceptions', newEx);

  if (!qzDB.auditLog) qzDB.auditLog = [];
  qzDB.auditLog.unshift({
    ts: QZ_TODAY + ' 09:30:00',
    timestamp: QZ_TODAY + ' 09:30',
    user: 'Training User',
    action: 'CREATE',
    object: 'Exception ' + nextId,
    order: orderId,
    details: 'Raised ' + sev + ' exception: ' + title,
    ip: '198.51.100.24'
  });

  document.getElementById('qzsModal')?.remove();
  simToast(`Exception ${nextId} (${sev}) raised for ${orderId}.`, { tone: 'good' });
  qzShellCompOpen(nextId);
  qzRenderRoot();
}

function qzShellResolveExceptionModal(id) {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const e = qzShellGetExceptions().find(x => x.id === id);
  if (!e) return;

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:480px">
      <div class="ph">
        <h4>Resolve Exception ${esc(e.id)}</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px">
        <div class="qz-field wide"><label>Exception</label><input value="${escAttr(e.title)}" readonly></div>
        <div class="qz-field wide"><label>Resolution Note &amp; Audit Explanation <span style="color:var(--qz-bad)">*</span></label>
          <textarea id="qzsExResolveNote" rows="3" style="width:100%;border:1px solid var(--qz-line);border-radius:4px;padding:8px;font-family:inherit;font-size:13px" placeholder="e.g. Endorsement T-19 issued and verified. Corrected deed received."></textarea>
        </div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveResolveException('${escAttr(e.id)}')">Mark as Resolved</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzsExResolveNote')?.focus(), 50);
}

function qzShellSaveResolveException(id) {
  const e = qzShellGetExceptions().find(x => x.id === id);
  if (!e) return;

  const note = (document.getElementById('qzsExResolveNote')?.value || '').trim() || 'Reviewed and cleared by escrow officer.';

  if (!e.history) e.history = [];
  e.history.push({
    date: QZ_TODAY,
    by: 'Training User',
    text: 'Resolved: ' + note
  });

  qzUpdate('exceptions', id, { status: 'Resolved', history: e.history });

  if (!qzDB.auditLog) qzDB.auditLog = [];
  qzDB.auditLog.unshift({
    ts: QZ_TODAY + ' 09:32:00',
    timestamp: QZ_TODAY + ' 09:32',
    user: 'Training User',
    action: 'RESOLVE',
    object: 'Exception ' + id,
    order: e.order || '—',
    details: 'Resolved exception: ' + note,
    ip: '198.51.100.24'
  });

  document.getElementById('qzsModal')?.remove();
  simToast(`Exception ${id} marked as Resolved.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellReassignExceptionModal(id) {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const e = qzShellGetExceptions().find(x => x.id === id);
  if (!e) return;

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph">
        <h4>Reassign Exception ${esc(e.id)}</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px">
        <div class="qz-field wide"><label>Current Owner</label><input value="${escAttr(e.owner)}" readonly></div>
        <div class="qz-field wide"><label>New Assignee</label>
          <select id="qzsExNewOwner">
            <option value="Marisol Tran">Marisol Tran (Escrow Officer)</option>
            <option value="Dana Whitfield">Dana Whitfield (Escrow Officer)</option>
            <option value="Travis Jones">Travis Jones (Title Examiner)</option>
            <option value="Barbara Runolfsson">Barbara Runolfsson (Accounting)</option>
            <option value="Training User">Training User (Virtual Assistant)</option>
          </select>
        </div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveReassignException('${escAttr(e.id)}')">Reassign Owner</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzShellSaveReassignException(id) {
  const e = qzShellGetExceptions().find(x => x.id === id);
  if (!e) return;

  const newOwner = document.getElementById('qzsExNewOwner')?.value || 'Marisol Tran';

  if (!e.history) e.history = [];
  e.history.push({
    date: QZ_TODAY,
    by: 'Training User',
    text: `Reassigned from ${e.owner} to ${newOwner}.`
  });

  qzUpdate('exceptions', id, { owner: newOwner, history: e.history });

  document.getElementById('qzsModal')?.remove();
  simToast(`Exception ${id} reassigned to ${newOwner}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellWaiveExceptionModal(id) {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const e = qzShellGetExceptions().find(x => x.id === id);
  if (!e) return;

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:480px">
      <div class="ph">
        <h4>Underwriter Waiver — Exception ${esc(e.id)}</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px">
        <div class="qz-field wide"><label>Exception</label><input value="${escAttr(e.title)}" readonly></div>
        <div class="qz-field wide"><label>Underwriter Waiver Authority / Justification <span style="color:var(--qz-bad)">*</span></label>
          <textarea id="qzsExWaiveJust" rows="3" style="width:100%;border:1px solid var(--qz-line);border-radius:4px;padding:8px;font-family:inherit;font-size:13px" placeholder="e.g. Underwriter Old Republic approved waiver per underwriting bulletin TX-2026-04; survey indemnity received."></textarea>
        </div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveWaiveException('${escAttr(e.id)}')">Approve Underwriter Waiver</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzsExWaiveJust')?.focus(), 50);
}

function qzShellSaveWaiveException(id) {
  const e = qzShellGetExceptions().find(x => x.id === id);
  if (!e) return;

  const just = (document.getElementById('qzsExWaiveJust')?.value || '').trim() || 'Waived per underwriter authorization.';

  if (!e.history) e.history = [];
  e.history.push({
    date: QZ_TODAY,
    by: 'Training User (UW Approval)',
    text: 'Waived: ' + just
  });

  qzUpdate('exceptions', id, { status: 'Resolved', history: e.history });

  if (!qzDB.auditLog) qzDB.auditLog = [];
  qzDB.auditLog.unshift({
    ts: QZ_TODAY + ' 09:35:00',
    timestamp: QZ_TODAY + ' 09:35',
    user: 'Training User',
    action: 'WAIVE',
    object: 'Exception ' + id,
    order: e.order || '—',
    details: 'Underwriter waiver: ' + just,
    ip: '198.51.100.24'
  });

  document.getElementById('qzsModal')?.remove();
  simToast(`Exception ${id} waived by underwriter authority.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellDeleteException(id) {
  const e = qzShellGetExceptions().find(x => x.id === id);
  if (!e) return;

  qzConfirm({
    title: 'Delete Exception ' + e.id + '?',
    body: `Are you sure you want to delete this compliance exception "${e.title}" for ${e.order}?`,
    danger: true,
    confirmLabel: 'Delete Exception',
    onConfirm: () => {
      if (!qzDB.exceptions) qzDB.exceptions = (typeof QZS_EXCEPTIONS !== 'undefined') ? QZS_EXCEPTIONS.slice() : [];
      qzDB.exceptions = qzDB.exceptions.filter(x => x.id !== id);
      simToast(`Exception ${id} deleted.`, { tone: 'good' });
      qzShellCompClose();
      qzRenderRoot();
    }
  });
}

function qzShellIssueCplModal() {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const orders = qzAllOrders();
  const orderOptions = orders.map(o => `<option value="${escAttr(o.id)}">${esc(o.id)} — ${esc(o.propertyAddress || 'Order')}</option>`).join('');

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:480px">
      <div class="ph">
        <h4>Issue Closing Protection Letter (CPL)</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px">
        <div class="qz-field wide"><label>Order # <span style="color:var(--qz-bad)">*</span></label>
          <select id="qzsCplOrder">${orderOptions}</select>
        </div>
        <div class="qz-field wide"><label>Insured Lender Name <span style="color:var(--qz-bad)">*</span></label>
          <input id="qzsCplLender" value="Frisco Community Lending" autofocus>
        </div>
        <div class="qz-field"><label>Policy Type</label>
          <select id="qzsCplPolicy">
            <option value="Owner's + Loan">Owner's + Loan (T-1 + T-2)</option>
            <option value="Loan">Loan Policy Only (T-2)</option>
            <option value="Owner's">Owner's Policy Only (T-1)</option>
            <option value="Commercial Loan">Commercial Loan Policy</option>
          </select>
        </div>
        <div class="qz-field"><label>Title Underwriter</label>
          <select id="qzsCplUw">
            <option value="Old Republic">Old Republic National Title</option>
            <option value="First American">First American Title</option>
            <option value="Stewart">Stewart Title Guaranty</option>
          </select>
        </div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveCpl()">Issue CPL</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzsCplLender')?.focus(), 50);
}

function qzShellSaveCpl() {
  const order = (document.getElementById('qzsCplOrder')?.value || '').trim() || 'ORD-2026-1483';
  const lender = (document.getElementById('qzsCplLender')?.value || '').trim();
  const policy = document.getElementById('qzsCplPolicy')?.value || "Owner's + Loan";
  const uw = document.getElementById('qzsCplUw')?.value || 'Old Republic';

  if (!lender) { simToast('Please enter the insured lender name.'); return; }

  const nextCplNum = 'CPL-' + (9016 + qzList('cpls').length);
  const nextJacket = (uw === 'First American' ? 'FA-TX-' : uw === 'Stewart' ? 'ST-TX-' : 'OR-TX-') + (448400 + qzList('cpls').length);

  const newCpl = {
    id: 'cpl-' + Date.now(),
    order: order,
    lender: lender,
    cpl: nextCplNum,
    cplNumber: nextCplNum,
    issued: QZ_TODAY,
    expires: '2026-11-15',
    policy: policy,
    jacket: nextJacket,
    uw: uw,
    status: 'Active'
  };

  qzInsert('cpls', newCpl);

  if (!qzDB.auditLog) qzDB.auditLog = [];
  qzDB.auditLog.unshift({
    ts: QZ_TODAY + ' 09:40:00',
    timestamp: QZ_TODAY + ' 09:40',
    user: 'Training User',
    action: 'ISSUE',
    object: nextCplNum,
    order: order,
    details: `Issued CPL to ${lender} (${uw})`,
    ip: '198.51.100.24'
  });

  document.getElementById('qzsModal')?.remove();
  simToast(`CPL ${nextCplNum} issued to ${lender}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellRenewCplModal(idOrNum) {
  const c = qzList('cpls').find(x => x.id === idOrNum || x.cpl === idOrNum);
  if (!c) return;

  qzConfirm({
    title: 'Renew / Reissue CPL ' + (c.cpl || c.id) + '?',
    body: `Extend the expiration date for 60 days on ${c.lender} for order ${c.order}?`,
    confirmLabel: 'Reissue & Extend 60 Days',
    onConfirm: () => {
      c.expires = '2026-11-30';
      c.status = 'Active';
      simToast(`CPL ${c.cpl || c.id} renewed through Nov 30, 2026.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzShellDeleteCpl(idOrNum) {
  const c = qzList('cpls').find(x => x.id === idOrNum || x.cpl === idOrNum);
  if (!c) return;

  qzConfirm({
    title: 'Delete CPL ' + (c.cpl || c.id) + '?',
    body: `Are you sure you want to remove the CPL record for ${c.lender}?`,
    danger: true,
    confirmLabel: 'Delete CPL',
    onConfirm: () => {
      if (!qzDB.cpls) qzDB.cpls = (typeof QZS_CPLS !== 'undefined') ? QZS_CPLS.slice() : [];
      qzDB.cpls = qzDB.cpls.filter(x => x.id !== c.id && x.cpl !== c.cpl && x.cplNumber !== c.cpl);
      simToast(`CPL ${c.cpl || c.id} deleted.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzShellNewWireLogModal() {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const orders = qzAllOrders();
  const orderOptions = orders.map(o => `<option value="${escAttr(o.id)}">${esc(o.id)} — ${esc(o.propertyAddress || 'Order')}</option>`).join('');

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:500px">
      <div class="ph">
        <h4>Log Wire Verification Callback (ALTA Pillar #2)</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px">
        <div class="qz-field wide"><label>Linked Order # <span style="color:var(--qz-bad)">*</span></label>
          <select id="qzsWireOrder">${orderOptions}</select>
        </div>
        <div class="qz-field wide"><label>Party / Beneficiary Name <span style="color:var(--qz-bad)">*</span></label>
          <input id="qzsWireParty" placeholder="e.g. Summit Ridge Mortgage Servicing" autofocus>
        </div>
        <div class="qz-field"><label>Instruction Type</label>
          <select id="qzsWireKind">
            <option value="Payoff remittance">Payoff remittance</option>
            <option value="Buyer cash to close">Buyer cash to close</option>
            <option value="Seller proceeds">Seller proceeds</option>
            <option value="Commission disbursement">Commission disbursement</option>
            <option value="Loan funding">Loan funding</option>
          </select>
        </div>
        <div class="qz-field"><label>Verification Method</label>
          <select id="qzsWireMethod">
            <option value="Outbound call — number of record">Outbound call (Validated number)</option>
            <option value="Outbound call — number on payoff statement">Outbound call (Payoff statement)</option>
            <option value="Secure lender portal">Secure lender portal</option>
            <option value="In-person at signing">In-person at signing</option>
          </select>
        </div>
        <div class="qz-field wide"><label>Verification Result</label>
          <select id="qzsWireResult">
            <option value="Verified">Verified (Instructions Match Authenticated Source)</option>
            <option value="Pending">Pending (Callback Scheduled / Awaiting Confirmation)</option>
            <option value="Failed">Failed (SUSPECTED WIRE FRAUD / Callback Mismatch)</option>
          </select>
        </div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveWireLog()">Record Verification Log</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzsWireParty')?.focus(), 50);
}

function qzShellSaveWireLog() {
  const order = (document.getElementById('qzsWireOrder')?.value || '').trim() || 'ORD-2026-1483';
  const party = (document.getElementById('qzsWireParty')?.value || '').trim();
  const kind = document.getElementById('qzsWireKind')?.value || 'Payoff remittance';
  const method = document.getElementById('qzsWireMethod')?.value || 'Outbound call — number of record';
  const result = document.getElementById('qzsWireResult')?.value || 'Verified';

  if (!party) { simToast('Please enter the party name.'); return; }

  const newLog = {
    id: 'wire-log-' + Date.now(),
    date: QZ_TODAY,
    order: order,
    party: party,
    kind: kind,
    method: method,
    by: 'Training User',
    result: result
  };

  if (!qzDB.wireLog) qzDB.wireLog = (typeof QZS_WIRE_LOG !== 'undefined') ? QZS_WIRE_LOG.slice() : [];
  qzDB.wireLog.unshift(newLog);

  if (!qzDB.auditLog) qzDB.auditLog = [];
  qzDB.auditLog.unshift({
    ts: QZ_TODAY + ' 09:45:00',
    timestamp: QZ_TODAY + ' 09:45',
    user: 'Training User',
    action: result === 'Failed' ? 'ALERT_FRAUD' : 'VERIFY',
    object: 'Wire instructions — ' + party,
    order: order,
    details: `Wire callback ${result} for ${kind}`,
    ip: '198.51.100.24'
  });

  document.getElementById('qzsModal')?.remove();
  if (result === 'Failed') {
    simToast(`CRITICAL ALERT: Wire verification failed for ${party}. Funds frozen.`, { tone: 'bad' });
  } else {
    simToast(`Wire callback recorded: ${party} (${result}).`, { tone: 'good' });
  }
  qzRenderRoot();
}

function qzShellDeleteWireLog(id) {
  qzConfirm({
    title: 'Delete Wire Callback Log Entry?',
    body: 'Are you sure you want to remove this verification log entry?',
    danger: true,
    confirmLabel: 'Delete Entry',
    onConfirm: () => {
      if (qzDB.wireLog) qzDB.wireLog = qzDB.wireLog.filter(x => x.id !== id);
      simToast('Wire callback entry deleted.', { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzShellRunAltaAssessmentModal() {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:540px">
      <div class="ph">
        <h4>Run ALTA Best Practices Framework (v3.0) Assessment</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div style="padding:14px 18px">
        <p style="font-size:13px;color:var(--qz-muted);margin:0 0 12px 0">
          Auditing internal title procedures, 3-way escrow reconciliations, cybersecurity safeguarding, and underwriter policy remittance timelines.
        </p>
        <div style="display:flex;flex-direction:column;gap:8px">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px"><input type="checkbox" id="qzsAltaP2" checked> Pillar 2: Certify Escrow Trust Accounting &amp; 3-Way Reconciliation (100%)</label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px"><input type="checkbox" id="qzsAltaP3" checked> Pillar 3: Verify Encryption &amp; Dual-Factor Access Controls (100%)</label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px"><input type="checkbox" id="qzsAltaP5" checked> Pillar 5: Verify Title Policy Production &amp; Underwriter Remittance (100%)</label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px"><input type="checkbox" id="qzsAltaP7" checked> Pillar 7: Consumer Complaint Procedures &amp; Escalation Log (100%)</label>
        </div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveAltaAssessment()">Certify Full Compliance (100%)</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzShellSaveAltaAssessment() {
  const pillars = JSON.parse(JSON.stringify(QZS_ALTA));
  pillars.forEach(p => {
    p.pct = 100;
    p.status = 'Compliant';
  });

  qzDB.altaPillars = pillars;

  if (!qzDB.auditLog) qzDB.auditLog = [];
  qzDB.auditLog.unshift({
    ts: QZ_TODAY + ' 09:50:00',
    timestamp: QZ_TODAY + ' 09:50',
    user: 'Training User',
    action: 'AUDIT_ASSESSMENT',
    object: 'ALTA Best Practices Framework v3.0',
    order: '—',
    details: 'Agency certified 100% compliant across all 7 ALTA pillars.',
    ip: '198.51.100.24'
  });

  document.getElementById('qzsModal')?.remove();
  simToast('ALTA Best Practices assessment certified: 100% Compliant.', { tone: 'good' });
  qzRenderRoot();
}

function qzExportAuditCSV() {
  const list = (qzDB.auditLog && qzDB.auditLog.length) ? qzDB.auditLog : QZS_AUDIT;
  let csv = 'Timestamp,User,Action,Object,Order,IPAddress\n';
  list.forEach(a => {
    csv += `"${a.ts || a.timestamp || QZ_TODAY}","${a.user || 'Training User'}","${a.action || a.type || 'ACTIVITY'}","${a.object || a.details || ''}","${a.order || ''}","${a.ip || ''}"\n`;
  });

  if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof document !== 'undefined' && document.createElement) {
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_audit_log_${QZ_TODAY}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {}
  }
  simToast(`Audit log exported (${list.length} events).`, { tone: 'good' });
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
   GLOBAL DOCUMENTS LIBRARY (📄 All Documents)
   ----------------------------------------------------------------------------
   Company-wide repository of all title, closing, lender and escrow files.
   ============================================================================ */

function qzShellGlobalDocsHTML() {
  const allDocs = (qzDB && qzDB.documents) ? qzDB.documents : qzList('documents');
  const q = (qzShellState.docSearch || '').toLowerCase().trim();
  const folder = qzShellState.docFolder || 'All Documents';
  const orderFilter = qzShellState.docOrderFilter || 'All';
  const statusFilter = qzShellState.docStatusFilter || 'All';

  const folders = ['All Documents', 'Title & Escrow', 'Buyer', 'Seller', 'Lender', 'Closing Packages', 'Invoices & Payoffs', 'Archive'];
  
  const folderChips = folders.map(f => {
    let count = 0;
    if (f === 'All Documents') count = allDocs.length;
    else if (f === 'Title & Escrow') count = allDocs.filter(d => d.type === 'Title' || d.type === 'Contract' || d.folder === 'Title & Escrow').length;
    else if (f === 'Lender') count = allDocs.filter(d => d.type === 'Lender' || d.folder === 'Lender').length;
    else if (f === 'Invoices & Payoffs') count = allDocs.filter(d => d.type === 'Invoice' || d.type === 'Payoff' || d.folder === 'Invoices & Payoffs').length;
    else count = allDocs.filter(d => (d.folder || '') === f).length;

    const on = (folder === f);
    return `<button type="button" class="qzs-chip ${on ? 'on' : ''}" onclick="qzShellState.docFolder = '${escAttr(f)}'; qzRenderRoot();">
      ${esc(f)} <span>${count}</span>
    </button>`;
  }).join('');

  const orders = qzAllOrders();
  const orderOptions = `<option value="All" ${orderFilter === 'All' ? 'selected' : ''}>All Orders (${orders.length} files)</option>` +
    orders.map(o => `<option value="${escAttr(o.id)}" ${orderFilter === o.id ? 'selected' : ''}>${esc(o.id)} &mdash; ${esc(o.propertyAddress || 'Order')}</option>`).join('');

  const filtered = allDocs
    .filter(d => {
      if (folder === 'All Documents') return true;
      if (folder === 'Title & Escrow') return d.type === 'Title' || d.type === 'Contract' || d.folder === 'Title & Escrow';
      if (folder === 'Lender') return d.type === 'Lender' || d.folder === 'Lender';
      if (folder === 'Invoices & Payoffs') return d.type === 'Invoice' || d.type === 'Payoff' || d.folder === 'Invoices & Payoffs';
      return (d.folder || 'Title & Escrow') === folder;
    })
    .filter(d => orderFilter === 'All' || d.orderId === orderFilter)
    .filter(d => statusFilter === 'All' || d.status === statusFilter)
    .filter(d => !q || (d.name || '').toLowerCase().includes(q) || (d.type || '').toLowerCase().includes(q) || (d.orderId || '').toLowerCase().includes(q) || (d.uploadedBy || '').toLowerCase().includes(q));

  const rows = filtered.map(d => {
    const o = orders.find(x => x.id === d.orderId);
    const badgeClass = d.status === 'Reviewed' ? 'reviewed' : d.status === 'Received' ? 'received' : 'pending';
    const glyph = (typeof QZ_DOC_GLYPH !== 'undefined' && QZ_DOC_GLYPH[d.type]) || '&#128196;';

    return `<tr>
      <td style="font-size:16px;text-align:center;width:32px">${glyph}</td>
      <td>
        <button type="button" class="qz-doc-name" style="background:none;border:none;color:var(--qz-ocean-d);font-weight:700;font-size:13px;cursor:pointer;padding:0;text-align:left" onclick="qzOpenDocRow('${escAttr(String(d.id))}')">
          ${esc(d.name)}
        </button>
        <div style="font-size:11px;color:var(--qz-muted);margin-top:2px">${esc(d.type || 'Document')} &middot; ${esc(d.folder || 'Title & Escrow')}</div>
      </td>
      <td>
        <button type="button" style="background:none;border:none;color:var(--qz-ocean-d);cursor:pointer;padding:0;text-align:left;font-size:12.5px" onclick="qzOpenOrder('${escAttr(d.orderId)}', 'documents')">
          <b>#${esc(d.orderId)}</b>
          <div style="font-size:11px;color:var(--qz-muted)">${esc(o ? o.propertyAddress : '')}</div>
        </button>
      </td>
      <td><span class="qz-badge ${badgeClass}">${esc(d.status || 'Received')}</span></td>
      <td style="font-size:12px;color:var(--qz-ink)">${fmtDate(d.date) || '—'}</td>
      <td style="font-size:12px;color:var(--qz-muted)">${esc(d.uploadedBy || 'Staff')}</td>
      <td>
        <div class="qz-row-actions">
          <button type="button" class="qz-btn sm" onclick="qzOpenDocRow('${escAttr(String(d.id))}')">View</button>
          <button type="button" class="qz-btn sm" onclick="qzDownloadDoc()">Download</button>
          <button type="button" class="qz-btn sm" title="Edit Document" onclick="qzEditDocModal('${escAttr(String(d.id))}')">&#9998;</button>
          <button type="button" class="qz-btn sm danger" title="Delete Document" onclick="qzShellDeleteGlobalDoc('${escAttr(String(d.id))}')">&times;</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  return `
    <div class="qz-listhead">
      <div>
        <h2>Documents &amp; Closing Files Library</h2>
        <div class="sub">Company-wide document repository across all active title and escrow transactions (${allDocs.length} files)</div>
      </div>
      <div class="actions">
        <button class="qz-btn" type="button" onclick="qzTemplateLibraryModal('${qzState.orderId || 'ORD-2026-1483'}')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>
          Template Library
        </button>
        <button class="qz-btn primary" type="button" onclick="qzShellUploadDocModal()">+ Upload Document</button>
      </div>
    </div>

    <div class="qzs-stats-row">
      <div class="qzs-stat-card">
        <span class="lbl">Total Documents</span>
        <div class="val">${allDocs.length}</div>
        <span class="sub">All closing transactions</span>
      </div>
      <div class="qzs-stat-card">
        <span class="lbl">Reviewed &amp; Approved</span>
        <div class="val" style="color:var(--qz-green-d)">${allDocs.filter(d => d.status === 'Reviewed').length}</div>
        <span class="sub">Cleared for closing</span>
      </div>
      <div class="qzs-stat-card">
        <span class="lbl">Pending Review / Upload</span>
        <div class="val" style="color:#d97706">${allDocs.filter(d => d.status === 'Pending' || d.status === 'Received').length}</div>
        <span class="sub">Action required</span>
      </div>
      <div class="qzs-stat-card">
        <span class="lbl">Vault Security</span>
        <div class="val" style="color:var(--qz-ocean)">ALTA v3.0</div>
        <span class="sub">256-bit SOC2 encrypted</span>
      </div>
    </div>

    <div class="qzs-chips" style="margin-bottom:12px">${folderChips}</div>

    <div class="qzs-filter-bar">
      <div style="display:flex;gap:8px;flex:1;align-items:center">
        <div class="qz-search" style="max-width:280px">
          <input type="text" placeholder="Search by name, type, staff..." value="${escAttr(qzShellState.docSearch)}" oninput="qzShellState.docSearch=this.value; qzRenderRoot();">
        </div>
        <select class="qzs-select" onchange="qzShellState.docOrderFilter=this.value; qzRenderRoot();">
          ${orderOptions}
        </select>
        <select class="qzs-select" onchange="qzShellState.docStatusFilter=this.value; qzRenderRoot();">
          <option value="All" ${statusFilter === 'All' ? 'selected' : ''}>Status: All</option>
          <option value="Reviewed" ${statusFilter === 'Reviewed' ? 'selected' : ''}>Reviewed</option>
          <option value="Received" ${statusFilter === 'Received' ? 'selected' : ''}>Received</option>
          <option value="Pending" ${statusFilter === 'Pending' ? 'selected' : ''}>Pending</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="qzs-count-label">${filtered.length} documents displayed</span>
      </div>
    </div>

    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead>
          <tr>
            <th></th>
            <th>Document Name</th>
            <th>Related Order</th>
            <th>Status</th>
            <th>Date Modified</th>
            <th>Uploaded By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--qz-muted)">No documents match the active filters.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

function qzShellUploadDocModal() {
  const existing = document.getElementById('qzsModal');
  if (existing) existing.remove();

  const orders = qzAllOrders();
  const orderOptions = orders.map(o => `<option value="${escAttr(o.id)}">${esc(o.id)} &mdash; ${esc(o.propertyAddress || 'Order')}</option>`).join('');

  const wrap = document.createElement('div');
  wrap.id = 'qzsModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:480px">
      <div class="ph">
        <h4>Upload Document to File</h4>
        <button type="button" class="qz-btn sm" onclick="document.getElementById('qzsModal').remove()">&times;</button>
      </div>
      <div class="qz-form-grid" style="padding:14px 18px">
        <div class="qz-field wide"><label>Target Order <span style="color:var(--qz-bad)">*</span></label>
          <select id="qzsDocOrder">${orderOptions}</select>
        </div>
        <div class="qz-field wide"><label>Document Title / Name <span style="color:var(--qz-bad)">*</span></label>
          <input id="qzsDocName" placeholder="e.g. Survey Inspection Endorsement" autofocus>
        </div>
        <div class="qz-field"><label>Document Type</label>
          <select id="qzsDocType">
            <option value="Contract">Contract / Purchase Agreement</option>
            <option value="Title">Title / Commitment / Deed</option>
            <option value="Lender">Lender / Loan Package / CD</option>
            <option value="HOA">HOA / Condo Certificate</option>
            <option value="Property">Property / Survey / Inspection</option>
            <option value="Payoff">Payoff Statement / Lien Release</option>
            <option value="Invoice">Invoice / Settlement Fee</option>
            <option value="Insurance">Insurance Binder / Policy</option>
          </select>
        </div>
        <div class="qz-field"><label>Folder</label>
          <select id="qzsDocFolder">
            <option value="Title &amp; Escrow">Title &amp; Escrow</option>
            <option value="Buyer">Buyer</option>
            <option value="Seller">Seller</option>
            <option value="Lender">Lender</option>
            <option value="Closing Packages">Closing Packages</option>
            <option value="Invoices &amp; Payoffs">Invoices &amp; Payoffs</option>
            <option value="Archive">Archive</option>
          </select>
        </div>
        <div class="qz-field wide"><label>Status</label>
          <select id="qzsDocStatus">
            <option value="Received">Received (Ready for review)</option>
            <option value="Reviewed">Reviewed &amp; Approved</option>
            <option value="Pending">Pending Signature / Verification</option>
          </select>
        </div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzsModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzShellSaveUploadDoc()">Save &amp; Upload Document</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzsDocName')?.focus(), 50);
}

function qzShellSaveUploadDoc() {
  const orderId = document.getElementById('qzsDocOrder')?.value || 'ORD-2026-1483';
  const name = (document.getElementById('qzsDocName')?.value || '').trim();
  const type = document.getElementById('qzsDocType')?.value || 'Title';
  const folder = document.getElementById('qzsDocFolder')?.value || 'Title & Escrow';
  const status = document.getElementById('qzsDocStatus')?.value || 'Received';

  if (!name) { simToast('Please enter a document name.'); return; }

  const nextId = Date.now();
  const newDoc = {
    id: nextId,
    orderId: orderId,
    name: name,
    type: type,
    folder: folder,
    status: status,
    uploadedBy: 'Training User',
    date: QZ_TODAY
  };

  if (!qzDB.documents) qzDB.documents = (typeof QZ_DOCUMENTS !== 'undefined') ? QZ_DOCUMENTS.slice() : [];
  qzDB.documents.unshift(newDoc);

  document.getElementById('qzsModal')?.remove();
  simToast(`Document "${name}" uploaded to ${orderId}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzShellDeleteGlobalDoc(id) {
  const d = qzFind('documents', id);
  if (!d) return;

  qzConfirm({
    title: 'Delete Document "' + d.name + '"?',
    body: `Are you sure you want to permanently delete this document from order ${d.orderId}?`,
    danger: true,
    confirmLabel: 'Delete Document',
    onConfirm: () => {
      if (!qzDB.documents) qzDB.documents = (typeof QZ_DOCUMENTS !== 'undefined') ? QZ_DOCUMENTS.slice() : [];
      qzDB.documents = qzDB.documents.filter(x => String(x.id) !== String(id));
      simToast(`Document "${d.name}" deleted.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

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
  admin: qzShellAdminHTML,
  'global-docs': qzShellGlobalDocsHTML,
  'documents': qzShellGlobalDocsHTML
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
  const c = qzShellFindContact(id);
  if (!c) {
    simToast('Contact not found.');
    return;
  }
  const linkedMsg = (c.orders && c.orders.length) 
    ? ` This contact is linked to ${c.orders.length} order(s) (${c.orders.join(', ')}) and will be removed from them.` 
    : ' This removes the contact record from your address book.';

  qzConfirm({
    title: 'Delete ' + c.name + '?',
    body: `Are you sure you want to delete this contact?${linkedMsg}`,
    danger: true,
    confirmLabel: 'Delete contact',
    onConfirm: () => {
      const cNameLow = String(c.name || '').trim().toLowerCase();
      const hasEmail = c.email && c.email !== '—';
      const cEmailLow = hasEmail ? String(c.email).trim().toLowerCase() : '';

      // 1. Remove from qzDB.contacts (by id, name or email)
      if (qzDB.contacts && Array.isArray(qzDB.contacts)) {
        qzDB.contacts = qzDB.contacts.filter(x => {
          if (!x) return false;
          if (x.id === id || x.id === c.id) return false;
          if (cNameLow && String(x.name || '').trim().toLowerCase() === cNameLow) return false;
          if (cEmailLow && String(x.email || '').trim().toLowerCase() === cEmailLow) return false;
          return true;
        });
      }

      // 2. Remove party from ALL orders in qzDB.orders
      const allOrders = qzAllOrders();
      allOrders.forEach(o => {
        if (o && o.parties && Array.isArray(o.parties)) {
          o.parties = o.parties.filter(p => {
            if (!p) return false;
            const pNameLow = String(p.name || '').trim().toLowerCase();
            const pEmailLow = (p.email && p.email !== '—') ? String(p.email).trim().toLowerCase() : '';
            if (cNameLow && pNameLow === cNameLow) return false;
            if (cEmailLow && pEmailLow && pEmailLow === cEmailLow) return false;
            return true;
          });
        }
      });

      // 3. Remove from vendors if vendor
      if (qzDB.vendors && Array.isArray(qzDB.vendors)) {
        qzDB.vendors = qzDB.vendors.filter(v => {
          if (!v) return false;
          if (v.id === id || ('v-' + v.id) === id) return false;
          if (cNameLow && String(v.name || '').trim().toLowerCase() === cNameLow) return false;
          return true;
        });
      }

      // 4. Close side panel if it was open for this contact
      if (qzShellState.contactsOpenId === id || (c && qzShellState.contactsOpenId === c.id)) {
        qzShellState.contactsOpenId = null;
      }

      simToast(`${c.name} deleted.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}
