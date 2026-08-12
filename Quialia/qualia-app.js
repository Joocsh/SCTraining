/* Qualia VA Training Simulator — view engine + scenario engine.
   100% frontend, localStorage only, no connection to any real Qualia account. */

/* Small monochrome line-icon set (stroke=currentColor) so nothing falls back to color emoji glyphs. */
const QZ_ICONS = {
  overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V3"/><path d="M8 11h8M8 15h5"/></svg>',
  summary: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15 15 9"/><path d="M11 6.4 12 5.3a4 4 0 1 1 5.7 5.7L16.6 12"/><path d="M13 17.6 12 18.7a4 4 0 1 1-5.7-5.7L7.4 12"/></svg>',
  parties: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6"/><circle cx="17.5" cy="9" r="2.3"/><path d="M15.8 14.3c2.6.5 4.7 2.7 4.7 5.7"/></svg>',
  message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-4-.9L3 21l1.9-5.5a8.4 8.4 0 0 1-.9-4A8.5 8.5 0 1 1 21 11.5z"/></svg>',
  cell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 3a2 2 0 0 1-.4 2.1L8 10.3a16 16 0 0 0 6 6l1.5-1.5a2 2 0 0 1 2.1-.4c1 .4 2 .6 3 .7a2 2 0 0 1 1.7 2z"/></svg>'
};

const QZ_LS_KEY = 'qz_va_training_v1';
let qzStore = { checklist: {}, scenarios: {}, docStatus: {}, taskStatus: {} };
let qzState = { view: 'dashboard', orderId: null, orderTab: 'overview', deTab: 'property', threadId: null, scenarioId: null, orderFilter: '' };

function qzLoad() {
  try {
    const raw = localStorage.getItem(QZ_LS_KEY);
    if (raw) qzStore = Object.assign({ checklist: {}, scenarios: {}, docStatus: {}, taskStatus: {} }, JSON.parse(raw));
  } catch (e) { /* ignore corrupt local state */ }
}
function qzSave() { localStorage.setItem(QZ_LS_KEY, JSON.stringify(qzStore)); }
function qzMark(id) { if (!qzStore.checklist[id]) { qzStore.checklist[id] = true; qzSave(); } }
function qzToast(msg) { alert(msg); }

function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function fmtMoney(n) { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(iso) {
  if (!iso || iso === '—') return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ---------- data lookups (respect in-session overrides) ---------- */
function qzDocsForOrder(orderId) { return QZ_DOCUMENTS.filter(d => d.orderId === orderId); }
function qzDocStatus(d) { return qzStore.docStatus[d.id] || d.status; }
function qzTasksForOrder(orderId) { return QZ_TASKS.filter(t => t.relatedOrderId === orderId); }
function qzTaskStatus(t) { return qzStore.taskStatus[t.id] || t.status; }
function qzScenarioScore() {
  let correct = 0, answered = 0;
  QZ_SCENARIOS.forEach(s => { const r = qzStore.scenarios[s.id]; if (r) { answered++; if (r.correct) correct++; } });
  return { correct, answered, total: QZ_SCENARIOS.length };
}

/* ---------- login ---------- */
function qzLoginHTML() {
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const email = su ? su.email : 'va.trainee@skillcloud.demo';
  return `<div class="qz-login"><div class="qz-login-card">
    <div class="mark"><img src="Images-resourses/OIP.webp" alt="Qualia"></div>
    <h1>Log in to Qualia</h1>
    <p>Training environment, no real credentials needed.</p>
    <div class="fld"><label>Email</label><input type="text" value="${esc(email)}" readonly></div>
    <div class="fld"><label>Password</label><input type="password" value="••••••••••" readonly></div>
    <button type="button" onclick="qzEnter()">Log In</button>
    <div class="qz-login-note">Training only. Nothing here is connected to a real Qualia account.</div>
  </div></div>`;
}
function qzEnter() {
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const label = document.getElementById('qzUserLabel');
  const av = document.getElementById('qzUserAvatar');
  if (su) {
    if (label) label.textContent = su.name.split(' ')[0];
    if (av) av.textContent = (su.avatar || su.name.charAt(0)).toUpperCase();
  }
  document.getElementById('qzTopbar').style.display = 'flex';
  document.getElementById('qzLoginWrap').style.display = 'none';
  document.getElementById('qzRoot').style.display = 'block';
  qzGoto('dashboard');
}

/* ---------- top-level navigation ---------- */
function qzGoto(view) {
  qzState.view = view;
  qzState.orderId = null;
  qzSyncTopTabs();
  qzRenderRoot();
}
function qzSyncTopTabs() {
  document.querySelectorAll('#qzTopbar .qz-tabs span[data-view]').forEach(el => {
    const v = el.dataset.view;
    const active = v === qzState.view || (v === 'orders' && qzState.view === 'order') || (v === 'scenarios' && qzState.view === 'scenario');
    el.classList.toggle('active', active);
  });
}
function qzRenderRoot() {
  const root = document.getElementById('qzRoot');
  let html = '';
  if (qzState.view === 'dashboard') html = qzDashboardHTML();
  else if (qzState.view === 'orders') html = qzOrdersHTML();
  else if (qzState.view === 'order') html = qzOrderHTML();
  else if (qzState.view === 'scenarios') html = qzScenariosHTML();
  else if (qzState.view === 'scenario') html = qzScenarioDetailHTML();
  root.innerHTML = html;
}

/* ---------- dashboard ---------- */
function qzDashboardHTML() {
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const firstName = su ? su.name.split(' ')[0] : 'there';
  const cards = Object.keys(QZ_CHECKLISTS).map(key => {
    const cl = QZ_CHECKLISTS[key];
    const done = cl.items.filter(it => qzStore.checklist[it.id]).length;
    const total = cl.items.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    return `<div class="qz-progress-card"><div class="top"><b>${esc(cl.label)}</b><span class="frac">${done}/${total}</span></div><div class="qz-bar"><i style="width:${pct}%"></i></div></div>`;
  }).join('');
  const score = qzScenarioScore();
  const scorePct = score.answered ? Math.round(score.correct / score.answered * 100) : 0;
  return `
    <div class="qz-welcome"><h2>Welcome back, ${esc(firstName)}</h2><p>This is your Qualia practice environment. Explore any module below in any order, nothing here is connected to a real account or real clients.</p></div>
    <div class="qz-listhead"><div><h2>Module Progress</h2><div class="sub">Each checklist item is marked complete automatically when you perform that action in the UI</div></div></div>
    <div class="qz-dash-grid">${cards}</div>
    <div class="qz-score-card">
      <div class="qz-score-num">${scorePct}%</div>
      <div class="txt"><b>Scenario score</b><span>${score.correct} correct out of ${score.answered} answered &middot; ${score.total} scenarios total</span></div>
      <button class="qz-btn primary" style="margin-left:auto" onclick="qzGoto('scenarios')">Go to Scenarios &rarr;</button>
    </div>
  `;
}

/* ---------- orders list ---------- */
function qzOrdersRowsHTML() {
  const filter = (qzState.orderFilter || '').toLowerCase().trim();
  const rows = QZ_ORDERS.filter(o => !filter
    || o.propertyAddress.toLowerCase().includes(filter)
    || o.id.toLowerCase().includes(filter)
    || o.parties.some(p => p.name.toLowerCase().includes(filter)));
  if (!rows.length) return '<tr><td colspan="6" style="text-align:center;color:var(--qz-muted);padding:26px">No orders match that search.</td></tr>';
  return rows.map(o => `<tr class="link" onclick="qzOpenOrder('${o.id}')">
      <td class="addr">${esc(o.propertyAddress)}</td>
      <td>${esc(o.id)}</td>
      <td>${esc(o.type)}</td>
      <td>${esc(QZ_STAGES[o.stageIndex])}</td>
      <td>${fmtDate(o.closingDate)}</td>
      <td>${o.flag ? '<span class="qz-badge flag">' + (o.flag === 'missing-document' ? 'Missing Doc' : 'Delayed') + '</span>' : '—'}</td>
    </tr>`).join('');
}
function qzOrdersHTML() {
  return `
    <div class="qz-listhead"><div><h2>Orders</h2><div class="sub">Search and open a file the way you would in a live queue</div></div></div>
    <div class="qz-toolbar"><input type="text" id="qzOrderSearch" placeholder="Find order by address, order #, or name..." value="${esc(qzState.orderFilter || '')}" oninput="qzFilterOrders(this.value)"></div>
    <table class="qz-tbl"><thead><tr><th>Property</th><th>Order #</th><th>Type</th><th>Stage</th><th>Closing Date</th><th>Flag</th></tr></thead>
    <tbody id="qzOrdersBody">${qzOrdersRowsHTML()}</tbody></table>
  `;
}
function qzFilterOrders(v) {
  qzState.orderFilter = v;
  if (v && v.trim()) qzMark('orders-search');
  const body = document.getElementById('qzOrdersBody');
  if (body) body.innerHTML = qzOrdersRowsHTML();
}
function qzOpenOrder(id) {
  qzState.view = 'order';
  qzState.orderId = id;
  qzState.orderTab = 'overview';
  qzState.deTab = 'property';
  qzState.threadId = null;
  qzMark('orders-open');
  qzSyncTopTabs();
  qzRenderRoot();
}
function qzBackToOrders() {
  qzMark('orders-back');
  qzState.view = 'orders';
  qzState.orderId = null;
  qzSyncTopTabs();
  qzRenderRoot();
}

/* ---------- order shell ---------- */
function qzTimelineHTML(o) {
  const steps = QZ_STAGES.map((label, idx) => {
    const cls = idx < o.stageIndex ? 'done' : idx === o.stageIndex ? 'current' : '';
    let dt = '';
    if (idx === 0) dt = fmtDate(o.opened);
    else if (label === 'Closing Date') dt = fmtDate(o.closingDate);
    return `<div class="qz-tl-step ${cls}"><div class="track"></div><div class="node"></div><div class="lbl">${esc(label)}</div>${dt ? '<div class="dt">' + dt + '</div>' : ''}</div>`;
  }).join('');
  return `<div class="qz-timeline">${steps}</div>`;
}
function qzOrderTab(tab) {
  qzState.orderTab = tab;
  if (tab === 'dataentry') { qzState.deTab = 'property'; qzMark('de-property'); }
  else if (tab === 'tasks') qzMark('tasks-open');
  else if (tab === 'workflow') qzMark('workflow-view');
  else if (tab === 'vendors') qzMark('vendors-open');
  else if (tab === 'closing') qzMark('closing-open');
  else if (tab === 'accounting') qzMark('accounting-open');
  qzRenderRoot();
}
function qzOrderHTML() {
  const o = QZ_ORDERS.find(x => x.id === qzState.orderId);
  if (!o) return '<p>Order not found.</p>';
  const pendingDocs = qzDocsForOrder(o.id).filter(d => qzDocStatus(d) === 'Pending').length;
  const openTasks = qzTasksForOrder(o.id).filter(t => qzTaskStatus(t) !== 'Complete').length;

  const tabs = [
    ['overview', 'Overview'], ['dataentry', 'Data Entry'], ['documents', 'Documents', pendingDocs],
    ['tasks', 'Tasks', openTasks], ['workflow', 'Workflow'], ['communication', 'Communication'],
    ['vendors', 'Vendors'], ['closing', 'Closing'], ['accounting', 'Accounting']
  ];
  const tabsHtml = tabs.map(t => {
    const [key, label, count] = t;
    return `<span class="${qzState.orderTab === key ? 'active' : ''}" onclick="qzOrderTab('${key}')">${esc(label)}${count ? ' <span class="c">' + count + '</span>' : ''}</span>`;
  }).join('');

  let flagHtml = '';
  if (o.flag === 'missing-document') flagHtml = `<div class="qz-order-flag">A required document is outstanding, see the Documents tab.</div>`;
  else if (o.flag === 'closing-delay') flagHtml = `<div class="qz-order-flag bad">Closing date moved from ${fmtDate(o.originalClosingDate)} to ${fmtDate(o.closingDate)}, see Workflow for details.</div>`;

  let body = '';
  if (qzState.orderTab === 'overview') body = qzOverviewHTML(o);
  else if (qzState.orderTab === 'dataentry') body = qzDataEntryHTML(o);
  else if (qzState.orderTab === 'documents') body = qzDocumentsHTML(o);
  else if (qzState.orderTab === 'tasks') body = qzTasksHTML(o);
  else if (qzState.orderTab === 'workflow') body = qzWorkflowHTML(o);
  else if (qzState.orderTab === 'communication') body = qzCommunicationHTML(o);
  else if (qzState.orderTab === 'vendors') body = qzVendorsHTML(o);
  else if (qzState.orderTab === 'closing') body = qzClosingHTML(o);
  else if (qzState.orderTab === 'accounting') body = qzAccountingHTML(o);

  return `
    <span class="qz-back" onclick="qzBackToOrders()">&larr; Orders</span>
    <div class="qz-order-hero">
      <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1V10"/><path d="M12 15.2c-2.6-1.6-3.6-3-3.6-4.2a1.8 1.8 0 0 1 3.6-.9 1.8 1.8 0 0 1 3.6.9c0 1.2-1 2.6-3.6 4.2Z" fill="#fff" stroke="none"/></svg></div>
      <h2>${esc(o.propertyAddress)}</h2>
      <span class="qz-badge dark">${esc(o.type)}</span>
      <div class="ordno">Order #${esc(o.id.replace('ORD-', ''))}</div>
      <div class="qz-order-tabs">${tabsHtml}</div>
    </div>
    ${flagHtml}
    <div style="margin-top:18px">${body}</div>
  `;
}

/* ---------- Overview ---------- */
function qzOverviewHTML(o) {
  return `
    <div class="qz-panel">
      <div class="ph"><h4><span class="dot gold">${QZ_ICONS.overview}</span> Overview</h4></div>
      ${qzTimelineHTML(o)}
      <div class="qz-tl-status"><b>Your order is currently in <span>${esc(QZ_STAGES[o.stageIndex])}</span></b><p>${esc(o.statusNote)}</p></div>
    </div>
    <div class="qz-grid2">
      <div class="qz-panel">
        <div class="ph"><h4><span class="dot">${QZ_ICONS.summary}</span> Summary</h4></div>
        <div class="qz-kv"><b>Property</b><span class="addr-box">${esc(o.propertyAddress)}</span></div>
        <div class="qz-kv"><b>Settlement Agency</b>${esc(o.settlementAgency)}</div>
        <div class="qz-kv"><b>Order #</b>${esc(o.id)}</div>
        <div class="qz-kv"><b>Order Opened</b>${fmtDate(o.opened)}</div>
        <div class="qz-kv"><b>Estimated Close</b>${fmtDate(o.closingDate)}</div>
        <div class="qz-kv"><b>Purchase Price</b>${fmtMoney(o.purchasePrice)}</div>
        <div class="qz-kv"><b>Loan Amount</b>${fmtMoney(o.loanAmount)}</div>
        <div class="qz-kv"><b>Title #</b>${esc(o.titleNumber)}</div>
      </div>
      <div class="qz-panel">
        <div class="ph"><h4><span class="dot gold">${QZ_ICONS.parties}</span> Parties</h4></div>
        <table class="qz-parties"><thead><tr><th>Role</th><th>Name</th><th class="ic">Message</th><th class="ic">Cell</th><th class="ic">Work</th></tr></thead><tbody>
          ${o.parties.map(p => `<tr><td class="role">${esc(p.role)}</td><td class="name">${esc(p.name)}</td>
            <td class="ic"><button type="button" title="Message" onclick="qzToast('Training only, no real message is sent.')">${QZ_ICONS.message}</button></td>
            <td class="ic"><button type="button" title="Cell" onclick="qzToast('Training only, no real call is placed.')">${QZ_ICONS.cell}</button></td>
            <td class="ic"><button type="button" title="Work" onclick="qzToast('Training only, no real call is placed.')">${QZ_ICONS.phone}</button></td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>
  `;
}

/* ---------- Data Entry ---------- */
function qzDeTab(tab) {
  qzState.deTab = tab;
  qzMark('de-' + tab);
  qzRenderRoot();
}
function qzFlashSaved(el) {
  const tag = el && el.parentElement && el.parentElement.querySelector('.qz-saved-tag');
  if (!tag) return;
  tag.classList.add('show');
  setTimeout(() => tag.classList.remove('show'), 1400);
}
function qzEditPartyField(el) {
  qzMark('de-edit');
  qzFlashSaved(el);
}
function qzEditPartyName(el, orderId, oldName) {
  qzMark('de-edit');
  const newValue = (el.value || '').trim();
  if (orderId && oldName && newValue && newValue !== oldName) {
    const o = QZ_ORDERS.find(x => x.id === orderId);
    const p = o && o.parties.find(x => x.name === oldName);
    if (p) {
      p.name = newValue;
      qzFlashSaved(el);
      setTimeout(qzRenderRoot, 1400);
      return;
    }
  }
  qzFlashSaved(el);
}
function qzDataEntryHTML(o) {
  const sub = qzState.deTab || 'property';
  const subtabs = [['property', 'Property'], ['parties', 'Parties'], ['transaction', 'Transaction Information']]
    .map(([k, label]) => `<span class="${sub === k ? 'active' : ''}" onclick="qzDeTab('${k}')">${label}</span>`).join('');

  let body = '';
  if (sub === 'property') {
    const parts = o.propertyAddress.split(',');
    body = `<div class="qz-form-grid">
      <div class="qz-field"><label>Street Address</label><input value="${esc(parts[0] || '')}" onchange="qzToast('Training only, this does not save anywhere real.')"></div>
      <div class="qz-field"><label>City</label><input value="${esc((parts[1] || '').trim())}" onchange="qzToast('Training only, this does not save anywhere real.')"></div>
      <div class="qz-field"><label>State / Zip</label><input value="${esc((parts[2] || '').trim())}" onchange="qzToast('Training only, this does not save anywhere real.')"></div>
      <div class="qz-field"><label>Property Type</label><input value="Single Family Residence" onchange="qzToast('Training only, this does not save anywhere real.')"></div>
    </div>`;
  } else if (sub === 'parties') {
    body = o.parties.map(p => `
      <div class="qz-party-card">
        <div class="pc-top"><b>${esc(p.name)}</b><span>${esc(p.role)}</span></div>
        <div class="qz-form-grid">
          <div class="qz-field"><label>Full Name</label><div class="qz-field-row"><input value="${esc(p.name)}" onchange="qzEditPartyName(this,'${o.id}','${esc(p.name)}')"><span class="qz-saved-tag">&#10003; Saved</span></div></div>
          <div class="qz-field"><label>Email</label><div class="qz-field-row"><input value="${esc(p.email)}" onchange="qzEditPartyField(this)"><span class="qz-saved-tag">&#10003; Saved</span></div></div>
          <div class="qz-field"><label>Phone</label><div class="qz-field-row"><input value="${esc(p.phone)}" onchange="qzEditPartyField(this)"><span class="qz-saved-tag">&#10003; Saved</span></div></div>
        </div>
      </div>`).join('');
  } else {
    body = `<div class="qz-form-grid">
      <div class="qz-field"><label>Purchase Price</label><input value="${fmtMoney(o.purchasePrice)}" onchange="qzToast('Training only, this does not save anywhere real.')"></div>
      <div class="qz-field"><label>Loan Amount</label><input value="${fmtMoney(o.loanAmount)}" onchange="qzToast('Training only, this does not save anywhere real.')"></div>
      <div class="qz-field"><label>Closing Date</label><input value="${fmtDate(o.closingDate)}" onchange="qzToast('Training only, this does not save anywhere real.')"></div>
      <div class="qz-field"><label>Title Number</label><input value="${esc(o.titleNumber)}" onchange="qzToast('Training only, this does not save anywhere real.')"></div>
      <div class="qz-field"><label>Settlement Agency</label><input value="${esc(o.settlementAgency)}" onchange="qzToast('Training only, this does not save anywhere real.')"></div>
    </div>`;
  }
  return `<div class="qz-panel"><div class="qz-subtabs">${subtabs}</div>${body}</div>`;
}

/* ---------- Documents ---------- */
function qzUploadDoc(id) { qzStore.docStatus[id] = 'Received'; qzSave(); qzMark('docs-upload'); qzRenderRoot(); }
function qzDownloadDoc() { qzMark('docs-download'); qzToast('Downloaded (training only, no real file was transferred).'); }
function qzReviewDoc(id) { qzStore.docStatus[id] = 'Reviewed'; qzSave(); qzMark('docs-review'); qzRenderRoot(); }
function qzViewDoc(file) { qzMark('docs-download'); window.open(file, '_blank'); }
function qzDocumentsHTML(o) {
  const rows = qzDocsForOrder(o.id).map(d => {
    const st = qzDocStatus(d);
    const badgeClass = st === 'Pending' ? 'pending' : st === 'Received' ? 'received' : 'reviewed';
    let actions = '';
    if (st === 'Pending') actions = `<button class="qz-btn sm primary" onclick="qzUploadDoc(${d.id})">Upload</button>`;
    else {
      actions = d.file
        ? `<button class="qz-btn sm" onclick="qzViewDoc('${d.file}')">View</button>`
        : `<button class="qz-btn sm" onclick="qzDownloadDoc()">Download</button>`;
      if (st === 'Received') actions += ` <button class="qz-btn sm" onclick="qzReviewDoc(${d.id})">Mark Reviewed</button>`;
    }
    return `<tr><td>${esc(d.name)}</td><td>${esc(d.type)}</td><td><span class="qz-badge ${badgeClass}">${st}</span></td><td>${esc(d.uploadedBy)}</td><td>${fmtDate(d.date)}</td><td><div class="qz-row-actions">${actions}</div></td></tr>`;
  }).join('');
  return `<div class="qz-panel"><div class="ph"><h4>Documents</h4></div>
    <table class="qz-tbl"><thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Uploaded By</th><th>Date</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>
  </div>`;
}

/* ---------- Tasks ---------- */
function qzCompleteTask(id) { qzStore.taskStatus[id] = 'Complete'; qzSave(); qzMark('tasks-complete'); qzRenderRoot(); }
function qzTasksHTML(o) {
  const rows = qzTasksForOrder(o.id).map(t => {
    const st = qzTaskStatus(t);
    const badgeClass = st === 'Complete' ? 'complete' : st === 'In Progress' ? 'progress' : 'open';
    const action = st !== 'Complete' ? `<button class="qz-btn sm primary" onclick="qzCompleteTask(${t.id})">Mark Complete</button>` : '<span style="color:var(--qz-muted);font-size:12px">Done</span>';
    return `<tr><td>${esc(t.title)}</td><td>${esc(t.assignedTo)}</td><td>${fmtDate(t.dueDate)}</td><td><span class="qz-badge ${badgeClass}">${st}</span></td><td>${action}</td></tr>`;
  }).join('');
  return `<div class="qz-panel"><div class="ph"><h4>Tasks</h4></div>
    <table class="qz-tbl"><thead><tr><th>Task</th><th>Assigned To</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  </div>`;
}

/* ---------- Workflow ---------- */
function qzWorkflowHTML(o) {
  const note = o.flag === 'closing-delay'
    ? `<p style="margin-top:14px;font-size:12.5px;color:var(--qz-bad)">Original closing date was ${fmtDate(o.originalClosingDate)}. This view is read-only, workflow structure is configured by admins, always escalate date changes per protocol.</p>`
    : `<p style="margin-top:14px;font-size:12.5px;color:var(--qz-muted)">This view is read-only. Workflow structure and stage rules are configured by admins, not by a VA.</p>`;
  return `<div class="qz-panel"><div class="ph"><h4>Workflow</h4></div>
    ${qzTimelineHTML(o)}
    <div class="qz-tl-status"><b>Current stage: <span>${esc(QZ_STAGES[o.stageIndex])}</span></b><p>${esc(o.statusNote)}</p></div>
    ${note}
  </div>`;
}

/* ---------- Communication ---------- */
function qzOpenThread(id) { qzState.threadId = id; qzMark('comm-open'); qzRenderRoot(); }
function qzSendReply(threadId) {
  const box = document.getElementById('qzReplyBox');
  const text = box ? box.value.trim() : '';
  if (!text) { qzToast('Write a reply before sending.'); return; }
  const t = QZ_MESSAGES.find(m => m.id === threadId);
  const last = t.thread[t.thread.length - 1];
  const recipient = last.sender === 'You (VA)' ? last.recipient : last.sender;
  t.thread.push({ sender: 'You (VA)', recipient: recipient, date: new Date().toISOString().slice(0, 10), body: text });
  qzMark('comm-reply');
  qzRenderRoot();
}
function qzLogFollowup() { qzMark('comm-followup'); qzToast('Follow-up logged on this file (training only).'); }
function qzCommunicationHTML(o) {
  const threads = QZ_MESSAGES.filter(m => m.orderId === o.id);
  if (!qzState.threadId || !threads.some(t => t.id === qzState.threadId)) qzState.threadId = threads[0] ? threads[0].id : null;
  const list = threads.map(t => `<div class="qz-thread-item ${t.id === qzState.threadId ? 'active' : ''}" onclick="qzOpenThread(${t.id})"><b>${esc(t.subject)}</b><span>${t.thread.length} message${t.thread.length !== 1 ? 's' : ''}</span></div>`).join('');
  const active = threads.find(t => t.id === qzState.threadId);
  let detail = '<div class="qz-panel">Select a thread.</div>';
  if (active) {
    const msgs = active.thread.map(m => `<div class="qz-msg ${m.sender === 'You (VA)' ? 'mine' : ''}"><div class="meta">${esc(m.sender)} &rarr; ${esc(m.recipient)} &middot; ${fmtDate(m.date)}</div>${esc(m.body)}</div>`).join('');
    detail = `<div class="qz-panel"><div class="ph"><h4>${esc(active.subject)}</h4></div>
      ${msgs}
      <div class="qz-reply"><textarea id="qzReplyBox" placeholder="Write a reply..."></textarea>
      <div class="row"><button class="qz-btn" onclick="qzLogFollowup()">Log Follow-up</button><button class="qz-btn primary" onclick="qzSendReply(${active.id})">Send Reply</button></div></div>
    </div>`;
  }
  return `<div class="qz-comm-grid"><div class="qz-thread-list">${list}</div>${detail}</div>`;
}

/* ---------- Vendors ---------- */
function qzCheckVendor(id) {
  const v = QZ_VENDORS.find(x => x.id === id);
  qzMark('vendors-check');
  qzToast(esc(v.name) + ': ' + esc(v.status));
}
function qzVendorsHTML(o) {
  const rows = QZ_VENDORS.filter(v => v.orderId === o.id).map(v => {
    const cls = v.status === 'Completed' ? 'completed' : v.status === 'Scheduled' ? 'scheduled' : v.status === 'In Progress' ? 'progress' : 'pending';
    return `<tr><td>${esc(v.name)}</td><td>${esc(v.service)}</td><td><span class="qz-badge ${cls}">${esc(v.status)}</span></td><td><button class="qz-btn sm" onclick="qzCheckVendor(${v.id})">Check Status</button></td></tr>`;
  }).join('');
  return `<div class="qz-panel"><div class="ph"><h4>Vendors</h4></div>
    <table class="qz-tbl"><thead><tr><th>Vendor</th><th>Service</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  </div>`;
}

/* ---------- Closing ---------- */
function qzReviewClosing() { qzMark('closing-review'); qzToast('Closing checklist reviewed (training only).'); }
function qzClosingHTML(o) {
  const outstanding = qzDocsForOrder(o.id).filter(d => qzDocStatus(d) !== 'Reviewed');
  const items = outstanding.length
    ? outstanding.map(d => `<div><input type="checkbox" disabled> ${esc(d.name)} — ${qzDocStatus(d)}</div>`).join('')
    : '<div style="color:var(--qz-muted);font-size:13px">All documents reviewed.</div>';
  return `<div class="qz-grid2">
    <div class="qz-panel"><div class="ph"><h4>Closing Checklist</h4></div><div class="qz-checklist">${items}</div>
      <button class="qz-btn primary" style="margin-top:14px" onclick="qzReviewClosing()">Mark Checklist Reviewed</button>
    </div>
    <div class="qz-panel"><div class="ph"><h4>Key Dates</h4></div>
      <div class="qz-kv"><b>Closing Date</b>${fmtDate(o.closingDate)}</div>
      ${o.originalClosingDate ? '<div class="qz-kv"><b>Original Date</b>' + fmtDate(o.originalClosingDate) + '</div>' : ''}
      <div class="qz-kv"><b>Settlement Agency</b>${esc(o.settlementAgency)}</div>
    </div>
  </div>`;
}

/* ---------- Accounting (read-only) ---------- */
function qzAccountingHTML(o) {
  const rows = [
    ["Title - Settlement or Closing Fee", "Best Closing Inc.", Math.round(o.purchasePrice * 0.0014 * 100) / 100],
    ["Owner's Title Policy", "Best Closing Inc.", Math.round(o.purchasePrice * 0.0057 * 100) / 100],
    ["Recording Fees", "County Clerk", 185],
    ["Credit Report", "Certified Credit Bureau", 29.5]
  ];
  const total = rows.reduce((s, r) => s + r[2], 0);
  const trs = rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td class="num">${fmtMoney(r[2])}</td></tr>`).join('');
  return `<div class="qz-panel">
    <div class="qz-readonly-note">Accounting is read-only in this simulator. A VA can review balances here, funds are never modified.</div>
    <table class="qz-tbl qz-acct"><thead><tr><th>Description</th><th>Payee</th><th class="num">Amount</th></tr></thead>
    <tbody>${trs}</tbody>
    <tfoot><tr><td colspan="2">Total Charges</td><td class="num">${fmtMoney(total)}</td></tr></tfoot>
    </table>
  </div>`;
}

/* ---------- Scenarios ---------- */
function qzOpenScenario(id) { qzState.scenarioId = id; qzState.view = 'scenario'; qzSyncTopTabs(); qzRenderRoot(); }
function qzAnswerScenario(id, idx) {
  const s = QZ_SCENARIOS.find(x => x.id === id);
  qzStore.scenarios[id] = { answered: idx, correct: idx === s.correct };
  qzSave();
  qzRenderRoot();
}
function qzRetakeScenario(id) {
  delete qzStore.scenarios[id];
  qzSave();
  qzRenderRoot();
}
function qzPracticeAction(id) {
  const s = QZ_SCENARIOS.find(x => x.id === id);
  const p = s && s.practice;
  if (!p) return;
  if (p.orderId) {
    qzState.view = 'order';
    qzState.orderId = p.orderId;
    qzState.orderTab = p.tab || 'overview';
    qzState.deTab = p.deTab || 'property';
    qzState.threadId = p.threadId || null;
    qzMark('orders-open');
    if (p.tab === 'dataentry') qzMark('de-' + (p.deTab || 'property'));
    else if (p.tab === 'tasks') qzMark('tasks-open');
    else if (p.tab === 'workflow') qzMark('workflow-view');
    else if (p.tab === 'communication') qzMark('comm-open');
    else if (p.tab === 'vendors') qzMark('vendors-open');
    else if (p.tab === 'closing') qzMark('closing-open');
    else if (p.tab === 'accounting') qzMark('accounting-open');
  } else if (p.view) {
    qzState.view = p.view;
    qzState.orderId = null;
  }
  qzSyncTopTabs();
  qzRenderRoot();
  if (p.hint) qzToast(p.hint);
}
function qzScenariosHTML() {
  const score = qzScenarioScore();
  const cards = QZ_SCENARIOS.map(s => {
    const r = qzStore.scenarios[s.id];
    const status = r ? (r.correct ? '<span class="qz-scenario-status correct">&#10003;</span>' : '<span class="qz-scenario-status incorrect">&#10007;</span>') : '';
    return `<div class="qz-scenario-card" onclick="qzOpenScenario('${s.id}')"><div class="top"><b>${esc(s.title)}</b>${status}</div><p>${esc(s.situation)}</p></div>`;
  }).join('');
  return `<div class="qz-listhead"><div><h2>Scenarios</h2><div class="sub">"What should I do?" — practice recognizing when to verify and escalate</div></div>
    <div class="sub" style="font-weight:700">${score.correct}/${score.answered} correct &middot; ${score.total} total</div></div>
    <div class="qz-scenario-grid">${cards}</div>`;
}
function qzScenarioDetailHTML() {
  const s = QZ_SCENARIOS.find(x => x.id === qzState.scenarioId);
  if (!s) return '<p>Scenario not found.</p>';
  const r = qzStore.scenarios[s.id];
  const opts = s.options.map((opt, idx) => {
    let cls = '';
    if (r) { if (idx === s.correct) cls = 'correct'; else if (idx === r.answered && !r.correct) cls = 'incorrect'; }
    return `<button type="button" class="qz-option ${cls}" ${r ? 'disabled' : ''} onclick="qzAnswerScenario('${s.id}',${idx})">${String.fromCharCode(65 + idx)}. ${esc(opt)}</button>`;
  }).join('');
  const feedback = r ? `<div class="qz-feedback ${r.correct ? 'correct' : 'incorrect'}">
      <b>${r.correct ? 'Correct.' : 'Not quite.'}</b>${esc(s.explanation)}
      <div class="qz-feedback-actions">
        ${r.correct && s.verifyDoc ? `<button class="qz-btn" onclick="qzViewDoc('${s.verifyDoc.file}')">${esc(s.verifyDoc.buttonLabel)}</button>` : ''}
        ${r.correct && s.practice ? `<button class="qz-btn primary" onclick="qzPracticeAction('${s.id}')">${esc(s.practice.buttonLabel)} &rarr;</button>` : ''}
        <button class="qz-btn" onclick="qzRetakeScenario('${s.id}')">${r.correct ? 'Retake Scenario' : 'Try Again'}</button>
      </div>
    </div>` : '';
  return `<span class="qz-back" onclick="qzGoto('scenarios')">&larr; Scenarios</span>
    <div class="qz-panel qz-scenario-detail"><div class="ph"><h4>${esc(s.title)}</h4></div>
      <p class="situation">${esc(s.situation)}</p>
      ${opts}
      ${feedback}
    </div>`;
}

/* ---------- bootstrap ---------- */
document.addEventListener('DOMContentLoaded', function () {
  qzLoad();
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  if (su) {
    qzEnter();
  } else {
    document.getElementById('qzLoginWrap').innerHTML = qzLoginHTML();
  }
});
