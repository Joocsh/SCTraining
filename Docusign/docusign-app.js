/* DocuSign VA Training Simulator — View Engine & Scenario Logic.
   Redesigned for sidebar layout matching real DocuSign eSignature UI.
   100% frontend static logic using localStorage for state persistence. */

const DS_LS_KEY = 'ds_va_training_v2';
let dsStore = { checklist: {}, scenarios: {}, envelopes: [], tourSeen: false };
let dsState = {
  view: 'dashboard',
  envelopeFilter: 'all',
  activeEnvId: null,
  activeScenarioId: null,
  wizardStep: 1,
  wizardData: {
    subject: 'Purchase Agreement — 123 Main Street',
    message: 'Please review and sign the attached Purchase Agreement at your earliest convenience.',
    documents: [{ name: 'Purchase_Agreement_123_Main.pdf', pages: 6 }],
    recipients: [
      { id: 'wr1', name: 'John Smith',    email: 'john.smith@example.com',      role: 'Buyer',  action: 'Needs to Sign',    order: 1 },
      { id: 'wr2', name: 'Sarah Johnson', email: 'sarah.j@example.com',         role: 'Seller', action: 'Needs to Sign',    order: 2 },
      { id: 'wr3', name: 'Michael Brown', email: 'michael.brown@agency.com',    role: 'Agent',  action: 'Receives a Copy',  order: 3 }
    ],
    fields: [
      { id: 'wf1', type: 'Signature',  recipientId: 'wr1', label: 'Buyer Signature',  required: true },
      { id: 'wf2', type: 'Date Signed',recipientId: 'wr1', label: 'Date',             required: true },
      { id: 'wf3', type: 'Signature',  recipientId: 'wr2', label: 'Seller Signature', required: true },
      { id: 'wf4', type: 'Date Signed',recipientId: 'wr2', label: 'Date',             required: true }
    ],
    useSequentialOrder: true
  }
};

/* ---------- Persistence ---------- */
function dsLoad() {
  try {
    const raw = localStorage.getItem(DS_LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      dsStore.checklist = p.checklist || {};
      dsStore.scenarios = p.scenarios || {};
      dsStore.tourSeen  = p.tourSeen  || false;
    }
  } catch (e) { /* ignore */ }
  dsStore.envelopes = DS_ENVELOPES.map(e => Object.assign({}, e,
    { recipients: e.recipients.map(r => Object.assign({}, r)) }
  ));
}
function dsSave() {
  localStorage.setItem(DS_LS_KEY, JSON.stringify({
    checklist: dsStore.checklist,
    scenarios: dsStore.scenarios,
    tourSeen:  dsStore.tourSeen
  }));
}
function dsMark(id) {
  if (!dsStore.checklist[id]) { dsStore.checklist[id] = true; dsSave(); }
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

/* ---------- Scenario Score ---------- */
function dsScenarioScore() {
  let correct = 0, answered = 0;
  DS_SCENARIOS.forEach(s => {
    const r = dsStore.scenarios[s.id];
    if (r) { answered++; if (r.correct) correct++; }
  });
  return { correct, answered, total: DS_SCENARIOS.length };
}

/* ---------- User sync ---------- */
function dsSyncUser() {
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const av = document.getElementById('dsUserAvatar');
  if (su && av) av.textContent = (su.avatar || su.name.charAt(0)).toUpperCase();
}

/* ---------- Navigation ---------- */
function dsGoto(view, extraId) {
  dsState.view = view;
  if (view === 'envelope-detail') dsState.activeEnvId = extraId;
  if (view === 'scenario-detail') dsState.activeScenarioId = extraId;
  dsSyncNav();
  dsRenderRoot();
  // Scroll main to top
  const main = document.querySelector('.ds-main');
  if (main) main.scrollTop = 0;
}

function dsSetFilter(f) {
  dsState.envelopeFilter = f;
  // Don't navigate away if already in envelopes view
  if (dsState.view !== 'envelopes' && dsState.view !== 'envelope-detail') {
    dsGoto('envelopes');
  } else {
    dsRenderRoot();
  }
}

function dsSyncNav() {
  // Top nav tabs
  document.querySelectorAll('.ds-topnav-item').forEach(el => {
    const v = el.dataset.view;
    const active = v === dsState.view
      || (v === 'envelopes' && (dsState.view === 'envelope-detail'))
      || (v === 'scenarios' && dsState.view === 'scenario-detail');
    el.classList.toggle('active', !!active);
  });
  // Sidebar links — remove all active, then set correct one
  document.querySelectorAll('.ds-sidebar-nav a').forEach(el => el.classList.remove('ds-active'));
  const map = {
    'dashboard':      'sb-home',
    'envelopes':      'sb-sent',
    'envelope-detail':'sb-sent',
    'new-envelope':   'sb-sent',
    'templates':      'sb-templates',
    'scenarios':      'sb-scenarios',
    'complete-transaction': 'sb-home'
  };
  const id = map[dsState.view];
  if (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('ds-active');
  }
}

function dsRenderRoot() {
  const root = document.getElementById('dsRoot');
  if (!root) return;
  const views = {
    'dashboard':           dsDashboardHTML,
    'envelopes':           dsEnvelopesHTML,
    'envelope-detail':     dsEnvelopeDetailHTML,
    'new-envelope':        dsNewEnvelopeWizardHTML,
    'templates':           dsTemplatesHTML,
    'scenarios':           dsScenariosHTML,
    'scenario-detail':     dsScenarioDetailHTML,
    'complete-transaction':dsCompleteTransactionHTML
  };
  root.innerHTML = (views[dsState.view] || (() => '<p>View not found.</p>'))();
}

/* ==================== DASHBOARD ==================== */
function dsDashboardHTML() {
  const su   = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const name = su ? su.name.split(' ')[0] : 'Trainee';

  const cards = Object.keys(DS_CHECKLISTS).map(key => {
    const cl  = DS_CHECKLISTS[key];
    const done = cl.items.filter(it => dsStore.checklist[it.id]).length;
    const total = cl.items.length;
    const pct  = total ? Math.round(done / total * 100) : 0;
    return `
      <div class="ds-progress-card">
        <div class="top"><b>${esc(cl.label)}</b><span class="frac">${done}/${total}</span></div>
        <div class="ds-bar"><i style="width:${pct}%"></i></div>
      </div>`;
  }).join('');

  const score    = dsScenarioScore();
  const scorePct = score.answered ? Math.round(score.correct / score.answered * 100) : 0;

  // Count envelope statuses for quick stats
  const waiting   = dsStore.envelopes.filter(e => e.status === 'waiting').length;
  const completed = dsStore.envelopes.filter(e => e.status === 'completed').length;

  return `
    <div class="ds-welcome">
      <h2>Welcome back, ${esc(name)}</h2>
      <p>Practice real DocuSign VA tasks: prepare and send envelopes, set signing order, place fields, resend reminders, correct recipient emails, void bad contracts, and download completed documents.</p>
      <button class="ds-tour-replay-btn" onclick="dsTourStart()">▶ Replay Tour</button>
    </div>

    <div class="ds-quick-actions">
      <button class="ds-btn yellow" onclick="dsGoto('new-envelope')">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 4v12M4 10h12"/></svg>
        Send an Envelope
      </button>
      <button class="ds-btn primary" onclick="dsGoto('templates')">Use a Template</button>
      <button class="ds-btn" onclick="dsGoto('complete-transaction')">🎯 Final Exam</button>
    </div>

    <!-- Quick Stats -->
    <div class="ds-stats-row">
      <div class="ds-stat-card" onclick="dsSetFilter('waiting');dsGoto('envelopes')">
        <div class="ds-stat-label">Waiting for Others</div>
        <div class="ds-stat-num yellow">${waiting}</div>
        <div class="ds-stat-sub">envelope${waiting !== 1 ? 's' : ''} pending</div>
      </div>
      <div class="ds-stat-card" onclick="dsSetFilter('completed');dsGoto('envelopes')">
        <div class="ds-stat-label">Completed</div>
        <div class="ds-stat-num green">${completed}</div>
        <div class="ds-stat-sub">envelope${completed !== 1 ? 's' : ''} signed</div>
      </div>
      <div class="ds-score-card">
        <div class="ds-score-num">${scorePct}%</div>
        <div class="txt">
          <b>Scenario Score</b>
          <span>${score.correct} correct · ${score.answered} answered · ${score.total} total</span>
        </div>
        <button class="ds-btn" style="margin-left:auto;white-space:nowrap;" onclick="dsGoto('scenarios')">Go to Scenarios →</button>
      </div>
    </div>

    <div class="ds-listhead">
      <div><h2>Training Checklists</h2><div class="sub">Items auto-complete as you practice each action</div></div>
    </div>
    <div class="ds-dash-grid">${cards}</div>
  `;
}

/* ==================== AGREEMENTS (Envelopes) VIEW ==================== */
function dsEnvelopesHTML() {
  dsMark('ds_c5_1');
  const filter = dsState.envelopeFilter;
  const list   = dsStore.envelopes.filter(e => filter === 'all' || e.status === filter);

  const rows = list.map(e => {
    const recipChips = e.recipients.map(r => {
      const done = r.status === 'completed' || r.status === 'signed';
      return `<span class="ds-recip-chip ${done ? 'done' : ''}">${esc(r.name.split(' ')[0])} ${done ? '✓' : '…'}</span>`;
    }).join('');
    return `
      <tr class="link" onclick="dsGoto('envelope-detail','${esc(e.id)}')">
        <td class="subject">
          ${esc(e.subject)}
          <div class="td-sub">From: ${esc(e.sender)}</div>
        </td>
        <td>${esc(e.id)}</td>
        <td>${esc(e.type)}</td>
        <td><span class="ds-badge ${e.status}">${esc(dsStatusLabel(e.status))}</span></td>
        <td>${esc(e.createdDate)}</td>
        <td>${recipChips}</td>
      </tr>`;
  }).join('');

  const filters = ['all','waiting','completed','draft','voided','expired'];
  const labels  = { all:'All', waiting:'Waiting for Others', completed:'Completed', draft:'Drafts', voided:'Voided', expired:'Expired' };

  return `
    <div class="ds-listhead">
      <div>
        <h2 class="ds-page-title">Agreements</h2>
        <div class="sub">Monitor and manage all envelopes: sent, draft, waiting, completed</div>
      </div>
      <button class="ds-btn yellow" onclick="dsGoto('new-envelope')">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 4v12M4 10h12"/></svg>
        Send an Envelope
      </button>
    </div>

    <div class="ds-toolbar">
      <div class="ds-filter-tabs">
        ${filters.map(f => `<button class="${filter===f?'active':''}" onclick="dsSetFilter('${f}')">${labels[f]}</button>`).join('')}
      </div>
    </div>

    <table class="ds-tbl">
      <thead>
        <tr>
          <th>Subject / Sender</th><th>Envelope #</th><th>Type</th><th>Status</th><th>Created</th><th>Recipients</th>
        </tr>
      </thead>
      <tbody>
        ${rows.length ? rows : `<tr><td colspan="6" style="text-align:center;color:#aaa;padding:32px;font-size:13.5px;">No envelopes match this filter.</td></tr>`}
      </tbody>
    </table>`;
}

function dsStatusLabel(s) {
  return { waiting:'Waiting for Others', completed:'Completed', draft:'Draft', voided:'Voided', expired:'Expired', declined:'Declined' }[s] || s.toUpperCase();
}

/* ==================== ENVELOPE WIZARD ==================== */
function dsNewEnvelopeWizardHTML() {
  dsMark('ds_c1_1');
  const step = dsState.wizardStep;

  const stepDefs = [
    { label: 'Add Documents' },
    { label: 'Add Recipients & Order' },
    { label: 'Place Fields' },
    { label: 'Review & Send' }
  ];

  const stepsHTML = stepDefs.map((s, i) => {
    const n = i + 1;
    const cls = step === n ? 'active' : (step > n ? 'done' : '');
    return `<div class="ds-step ${cls}"><span class="num">${step > n ? '✓' : n}</span><span>${esc(s.label)}</span></div>`;
  }).join('');

  return `
    <div class="ds-listhead">
      <div>
        <h2 class="ds-page-title">Send an Envelope</h2>
        <div class="sub">Prepare documents, add recipients, configure signing order, and place fields</div>
      </div>
      <button class="ds-btn" onclick="dsGoto('envelopes')">✕ Cancel</button>
    </div>
    <div class="ds-wizard-steps">${stepsHTML}</div>
    ${step === 1 ? dsWizardStep1HTML() : ''}
    ${step === 2 ? dsWizardStep2HTML() : ''}
    ${step === 3 ? dsWizardStep3HTML() : ''}
    ${step === 4 ? dsWizardStep4HTML() : ''}`;
}

function dsWizardStep1HTML() {
  const docs = dsState.wizardData.documents;
  return `
    <div class="ds-panel">
      <h4>Step 1 — Add Documents</h4>
      <p style="font-size:13px;color:var(--ds-muted);margin-bottom:16px;">Upload the PDF or Word files that recipients will review and sign. You can add multiple documents to a single envelope.</p>

      <div class="ds-upload-zone">
        <div style="font-size:32px;margin-bottom:8px;">📄</div>
        <b style="font-size:14px;color:#222;display:block;margin-bottom:4px;">Upload PDF or Document File</b>
        <span style="font-size:12.5px;color:#888;">Drag files here or click to attach — simulated for training</span>
        <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
          <button class="ds-btn primary" onclick="dsAttachDoc('Purchase_Agreement_123_Main.pdf',6)">+ Purchase Agreement (6 pages)</button>
          <button class="ds-btn" onclick="dsAttachDoc('Seller_Property_Disclosure.pdf',3)">+ Property Disclosure (3 pages)</button>
        </div>
      </div>

      <div style="margin-bottom:18px;">
        <b style="font-size:13px;">Attached Documents (${docs.length})</b>
        <ul style="margin:8px 0 0;padding-left:18px;font-size:13px;color:#333;line-height:1.8;">
          ${docs.map(d => `<li><b>${esc(d.name)}</b> — ${d.pages} page${d.pages !== 1 ? 's' : ''} <span style="color:#888;font-size:12px;margin-left:6px;">PDF</span></li>`).join('')}
        </ul>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;color:#888;">💡 Tip: You can add up to 10 documents per envelope</span>
        <button class="ds-btn primary" onclick="dsNextWizardStep(2)">Next: Add Recipients →</button>
      </div>
    </div>`;
}

function dsAttachDoc(name, pages) {
  dsMark('ds_c1_2');
  const exists = dsState.wizardData.documents.find(d => d.name === name);
  if (!exists) dsState.wizardData.documents.push({ name, pages });
  dsRenderRoot();
}

function dsWizardStep2HTML() {
  dsMark('ds_c2_1');
  const recs = dsState.wizardData.recipients;

  const rows = recs.map((r) => `
    <div style="display:flex;align-items:center;gap:12px;background:#fafafa;border:1px solid #e0e0e0;border-radius:8px;padding:12px 16px;margin-bottom:10px;">
      <div style="font-size:12px;font-weight:700;color:#888;width:60px;text-transform:uppercase;">Order ${r.order}</div>
      <div style="flex:1;">
        <b style="font-size:13.5px;display:block;color:#222;">${esc(r.name)}</b>
        <span style="font-size:12px;color:#888;">${esc(r.email)}</span>
      </div>
      <div style="font-size:12px;color:#555;width:100px;text-align:center;">
        <span style="font-size:11.5px;font-weight:600;color:#444;">${esc(r.role)}</span>
      </div>
      <div>
        <span class="ds-badge ${r.action === 'Needs to Sign' ? 'waiting' : 'draft'}">${esc(r.action)}</span>
      </div>
    </div>`).join('');

  return `
    <div class="ds-panel">
      <h4>Step 2 — Add Recipients & Signing Order</h4>
      <p style="font-size:13px;color:var(--ds-muted);margin-bottom:16px;">Specify who needs to sign, who gets a copy (CC), and whether they sign sequentially or all at once.</p>

      <div style="background:#f0f4ff;border:1px solid #c5d8ff;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px;">
        <input type="checkbox" id="chkSeq" ${dsState.wizardData.useSequentialOrder ? 'checked' : ''} onchange="dsToggleSequential(this.checked)" style="width:16px;height:16px;cursor:pointer;">
        <label for="chkSeq" style="font-size:13px;font-weight:600;color:#1a237e;cursor:pointer;">Set Signing Order — recipients sign sequentially (Order 1 → Order 2 → CC)</label>
      </div>

      <div style="margin-bottom:20px;">${rows}</div>

      <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:10px 14px;font-size:12.5px;color:#7a5f00;margin-bottom:18px;">
        💡 <b>Tip:</b> Setting Buyer to Order 1 and Seller to Order 2 ensures Sarah cannot sign until John signs first — critical for real estate transactions.
      </div>

      <div style="display:flex;justify-content:space-between;">
        <button class="ds-btn" onclick="dsNextWizardStep(1)">← Back</button>
        <button class="ds-btn primary" onclick="dsNextWizardStep(3)">Next: Place Fields →</button>
      </div>
    </div>`;
}

function dsToggleSequential(val) {
  dsMark('ds_c2_2');
  dsMark('ds_c2_3');
  dsState.wizardData.useSequentialOrder = val;
  const recs = dsState.wizardData.recipients;
  if (!val) {
    recs.forEach(r => r.order = 1); // parallel
  } else {
    recs[0].order = 1; recs[1].order = 2; recs[2].order = 3;
  }
  dsRenderRoot();
}

function dsWizardStep3HTML() {
  dsMark('ds_c3_1');
  return `
    <div class="ds-panel">
      <h4>Step 3 — Place Fields on Document</h4>
      <p style="font-size:13px;color:var(--ds-muted);margin-bottom:14px;">Assign Signature, Initials, Date Signed, and Text fields to the correct recipient on the document.</p>

      <div class="ds-canvas">
        <div class="ds-canvas-header">
          <div><b style="font-size:13px;">📄 Purchase_Agreement_123_Main.pdf — Page 1 of 6</b></div>
          <div style="display:flex;gap:8px;">
            <button class="ds-btn" onclick="dsAddField()">+ Add Field</button>
            <button class="ds-btn danger" onclick="dsAuditFields()">⚠ Audit Assignments</button>
          </div>
        </div>

        <!-- Field Type Palette -->
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
          <div style="font-size:11.5px;font-weight:700;color:#888;align-self:center;">FIELDS:</div>
          ${['Signature','Initials','Date Signed','Text Box','Checkbox'].map(f =>
            `<button class="ds-btn" style="font-size:12px;padding:5px 10px;" onclick="alert('In real DocuSign, drag this ${f} field onto the document. Training note: fields are pre-placed below.')">${f}</button>`
          ).join('')}
        </div>

        <div class="ds-canvas-doc">
          <h3>REAL ESTATE PURCHASE AGREEMENT</h3>
          <p>This Purchase Agreement is entered into by and between Buyer and Seller for the property at <b>123 Main Street, Austin TX 78701</b>. Both parties agree to the terms outlined herein.</p>

          <div style="border-top:1px solid #e0e0e0;padding-top:16px;margin-top:16px;">
            <b style="font-size:12.5px;color:#555;text-transform:uppercase;letter-spacing:.5px;">Buyer Section — John Smith</b>
            <div class="ds-field-slot assigned-buyer" style="margin-top:10px;">
              <span>✍ Signature Field — John Smith (Buyer, Order 1)</span>
              <span class="ds-badge completed" style="font-size:11px;">Required</span>
            </div>
            <div class="ds-field-slot assigned-buyer">
              <span>📅 Date Signed — John Smith (Buyer, Order 1)</span>
              <span class="ds-badge completed" style="font-size:11px;">Required</span>
            </div>
          </div>

          <div style="border-top:1px solid #e0e0e0;padding-top:16px;margin-top:16px;">
            <b style="font-size:12.5px;color:#555;text-transform:uppercase;letter-spacing:.5px;">Seller Section — Sarah Johnson</b>
            <div class="ds-field-slot assigned-seller" style="margin-top:10px;">
              <span>✍ Signature Field — Sarah Johnson (Seller, Order 2)</span>
              <span class="ds-badge completed" style="font-size:11px;">Required</span>
            </div>
            <div class="ds-field-slot assigned-seller">
              <span>📅 Date Signed — Sarah Johnson (Seller, Order 2)</span>
              <span class="ds-badge completed" style="font-size:11px;">Required</span>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:18px;">
        <button class="ds-btn" onclick="dsNextWizardStep(2)">← Back</button>
        <button class="ds-btn primary" onclick="dsNextWizardStep(4)">Next: Review & Send →</button>
      </div>
    </div>`;
}

function dsAddField() {
  dsMark('ds_c3_1');
  alert('In the real DocuSign, you drag fields from the left palette onto the document. Fields are pre-placed in this training view to simulate a correctly configured envelope.');
}
function dsAuditFields() {
  dsMark('ds_c3_2');
  dsMark('ds_c3_3');
  alert('✅ Field Audit Passed!\n\nBuyer fields (Signature + Date) → John Smith (Order 1)\nSeller fields (Signature + Date) → Sarah Johnson (Order 2)\n\nAll assignments are correct. No fields are unassigned or mis-assigned.');
}

function dsWizardStep4HTML() {
  dsMark('ds_c1_3');
  dsMark('ds_c1_4');
  const d = dsState.wizardData;
  return `
    <div class="ds-panel">
      <h4>Step 4 — Review & Send</h4>
      <p style="font-size:13px;color:var(--ds-muted);margin-bottom:18px;">Review the envelope summary before sending. Recipients will receive email notifications in signing order.</p>

      <div style="background:#fafafa;border:1px solid #e0e0e0;border-radius:8px;padding:18px 20px;margin-bottom:18px;font-size:13.5px;">
        <div style="margin-bottom:10px;"><span style="color:#888;font-size:12px;font-weight:600;">EMAIL SUBJECT</span><br>${esc(d.subject)}</div>
        <div style="margin-bottom:10px;"><span style="color:#888;font-size:12px;font-weight:600;">MESSAGE</span><br>${esc(d.message)}</div>
        <div style="margin-bottom:10px;"><span style="color:#888;font-size:12px;font-weight:600;">DOCUMENTS (${d.documents.length})</span><br>
          ${d.documents.map(doc => `${esc(doc.name)} (${doc.pages} pages)`).join(', ')}
        </div>
        <div><span style="color:#888;font-size:12px;font-weight:600;">RECIPIENTS IN SIGNING ORDER</span></div>
        <ol style="margin:8px 0 0;padding-left:18px;line-height:1.8;">
          ${d.recipients.map(r => `<li><b>${esc(r.name)}</b> (${esc(r.role)}) — Order ${r.order} — <em>${esc(r.action)}</em></li>`).join('')}
        </ol>
      </div>

      <div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px;padding:10px 14px;font-size:12.5px;color:#2e7d32;margin-bottom:18px;">
        ✅ Envelope is ready to send. Recipients will receive email notifications in the configured signing order.
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;">
        <button class="ds-btn" onclick="dsNextWizardStep(3)">← Back to Fields</button>
        <button class="ds-btn yellow" style="font-size:14px;padding:10px 24px;font-weight:800;" onclick="dsSendEnvelopeFinal()">🚀 Send Envelope</button>
      </div>
    </div>`;
}

function dsNextWizardStep(s) {
  dsState.wizardStep = s;
  dsRenderRoot();
}

function dsSendEnvelopeFinal() {
  dsMark('ds_c1_3');
  dsMark('ds_c1_4');
  const d = dsState.wizardData;
  const newEnv = {
    id: 'ENV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
    subject: d.subject,
    type: 'Real Estate Purchase',
    sender: (window.SCApp && SCApp.currentUser && SCApp.currentUser()
      ? SCApp.currentUser().name : 'Alex Rivera') + ' (VA)',
    status: 'waiting',
    createdDate: new Date().toISOString().split('T')[0],
    closingDate:  new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
    documents: [...d.documents],
    recipients: d.recipients.map(r => Object.assign({}, r, { status: r.order === 1 ? 'sent' : 'pending' })),
    fields: [...d.fields]
  };
  dsStore.envelopes.unshift(newEnv);

  // Reset wizard for next use
  dsState.wizardStep = 1;
  dsState.wizardData.documents = [{ name: 'Purchase_Agreement_123_Main.pdf', pages: 6 }];

  alert(`✅ Envelope ${newEnv.id} sent successfully!\n\nNotification emails have been triggered.\nJohn Smith (Buyer) will receive the first signing request.`);
  dsGoto('envelopes');
}

/* ==================== ENVELOPE DETAIL ==================== */
function dsEnvelopeDetailHTML() {
  const env = dsStore.envelopes.find(e => e.id === dsState.activeEnvId);
  if (!env) return '<p style="color:#888;padding:24px;">Envelope not found.</p>';

  const recipRows = env.recipients.map(r => {
    const statusClass = r.status === 'completed' || r.status === 'signed' ? 'completed'
      : r.status === 'voided' ? 'voided'
      : r.status === 'expired' ? 'expired'
      : 'waiting';
    return `
      <div class="ds-recipient-row">
        <div class="ds-recipient-order">Order ${r.order}</div>
        <div class="ds-recipient-info">
          <b>${esc(r.name)} <span style="font-weight:400;color:#888;font-size:12px;">(${esc(r.role)})</span></b>
          <span>${esc(r.email)}</span>
        </div>
        <div style="text-align:right;">
          <div><span class="ds-badge ${statusClass}">${esc(dsStatusLabel(r.status || 'waiting'))}</span></div>
          <div style="font-size:11.5px;color:#aaa;margin-top:3px;">${esc(r.action)}</div>
        </div>
      </div>`;
  }).join('');

  const isWaiting   = env.status === 'waiting';
  const isCompleted = env.status === 'completed';

  return `
    <div class="ds-detail-back" onclick="dsGoto('envelopes')">← Back to Agreements</div>

    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
      <div>
        <h2 class="ds-page-title">${esc(env.subject)}</h2>
        <div style="font-size:12.5px;color:#888;margin-top:2px;">
          Envelope ID: <b>${esc(env.id)}</b> &nbsp;·&nbsp; Created: ${esc(env.createdDate)}
          &nbsp;·&nbsp; Sent by: ${esc(env.sender)}
        </div>
      </div>
      <span class="ds-badge ${env.status}" style="font-size:13px;padding:5px 12px;">${dsStatusLabel(env.status)}</span>
    </div>

    <!-- Action Bar — mirrors DocuSign "More Actions" menu -->
    <div class="ds-action-bar">
      ${isWaiting ? `
        <button class="ds-btn primary" onclick="dsActionResend('${esc(env.id)}')">
          📩 Send Reminder
        </button>
        <button class="ds-btn" onclick="dsActionCorrect('${esc(env.id)}')">
          ✏️ Correct Envelope
        </button>
        <button class="ds-btn danger" onclick="dsActionVoid('${esc(env.id)}')">
          🚫 Void
        </button>` : ''}
      ${isCompleted ? `
        <button class="ds-btn primary" onclick="dsActionDownload('${esc(env.id)}')">
          📥 Download PDF
        </button>
        <button class="ds-btn" onclick="dsActionDownloadCert('${esc(env.id)}')">
          🏅 Download Certificate
        </button>` : ''}
      ${(!isWaiting && !isCompleted) ? `<span style="font-size:13px;color:#888;padding:4px 0;">No actions available for this envelope status.</span>` : ''}
    </div>

    <!-- Documents -->
    <div class="ds-panel" style="margin-bottom:14px;">
      <h4>Documents (${env.documents.length})</h4>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${env.documents.map(d => `
          <div style="display:flex;align-items:center;gap:8px;background:#f5f5f5;border:1px solid #e0e0e0;border-radius:6px;padding:8px 14px;font-size:13px;">
            <span>📄</span><span>${esc(d.name)}</span><span style="color:#aaa;font-size:12px;">(${d.pages} pages)</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- Recipients & Status Timeline -->
    <div class="ds-panel">
      <h4>Recipients & Signing Status Timeline</h4>
      <div class="ds-recipients-list">${recipRows}</div>

      ${isWaiting ? `
        <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:10px 14px;font-size:12.5px;color:#7a5f00;margin-top:14px;">
          💡 <b>VA Tip:</b> If a recipient hasn't acted in 24–48 hours, use <em>Send Reminder</em> to re-notify them. Check the email address is correct with <em>Correct Envelope</em> first.
        </div>` : ''}
      ${isCompleted ? `
        <div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px;padding:10px 14px;font-size:12.5px;color:#2e7d32;margin-top:14px;">
          ✅ All parties have signed. Download the completed PDF with the Certificate of Completion for your records.
        </div>` : ''}
    </div>`;
}

/* -- Envelope Actions -- */
function dsActionResend(envId) {
  dsMark('ds_c5_2');
  alert(`📩 Reminder sent for Envelope ${envId}!\n\nAll outstanding recipients have been re-notified via email. Their existing signing links remain active.`);
}

function dsActionCorrect(envId) {
  dsMark('ds_c5_3');
  const env = dsStore.envelopes.find(e => e.id === envId);
  if (!env) return;

  // Show which recipients can be corrected
  const recipNames = env.recipients.map((r, i) => `${i+1}. ${r.name} — ${r.email}`).join('\n');
  const choice = prompt(
    `Correct Envelope ${envId}\n\nRecipients:\n${recipNames}\n\nEnter the NEW email address for recipient #1 (or Cancel):`,
    env.recipients[0] ? env.recipients[0].email : ''
  );
  if (choice && choice.trim()) {
    if (env.recipients[0]) env.recipients[0].email = choice.trim();
    alert(`✅ Recipient email corrected!\n\nNew address: ${choice.trim()}\n\nThe envelope has been updated and a new notification sent.`);
    dsRenderRoot();
  }
}

function dsActionVoid(envId) {
  dsMark('ds_c5_4');
  const env = dsStore.envelopes.find(e => e.id === envId);
  if (!env) return;

  const reason = prompt(
    `Void Envelope ${envId}\n\nYou MUST enter a reason for voiding (required for audit trail).\n\nThis will instantly revoke all signing links. This action cannot be undone.`,
    'Superceded by updated contract terms'
  );
  if (reason && reason.trim()) {
    env.status = 'voided';
    env.recipients.forEach(r => r.status = 'voided');
    alert(`🚫 Envelope ${envId} voided.\n\nReason logged: "${reason.trim()}"\n\nAll signing links have been revoked. Recipients can no longer sign this document.`);
    dsRenderRoot();
  }
}

function dsActionDownload(envId) {
  alert(`📥 Downloading completed document package for ${envId}...\n\nIn the real DocuSign, this downloads:\n• Completed PDF with all signatures applied\n• Signature Certificate (audit log)\n\nFor training: document saved to Downloads folder.`);
}

function dsActionDownloadCert(envId) {
  alert(`🏅 Downloading Certificate of Completion for ${envId}...\n\nThe certificate includes:\n• Signer names, emails, IP addresses\n• Timestamp for each signature event\n• DocuSign envelope ID for legal reference`);
}

/* ==================== TEMPLATES ==================== */
function dsTemplatesHTML() {
  dsMark('ds_c4_1');

  const cards = DS_TEMPLATES.map(t => `
    <div class="ds-template-card">
      <div>
        <div class="ds-template-card-title">${esc(t.name)}</div>
        <div class="ds-template-card-cat">${esc(t.category)}</div>
      </div>
      <div class="ds-template-card-desc">${esc(t.description)}</div>
      <div class="ds-template-card-foot">
        <div class="ds-template-recips">
          <b>Recipients:</b> ${t.recipients.map(r => esc(r)).join(', ')}
        </div>
        <button class="ds-btn yellow" onclick="dsUseTemplate('${esc(t.id)}')">Use →</button>
      </div>
    </div>`).join('');

  return `
    <div class="ds-listhead">
      <div>
        <h2 class="ds-page-title">Templates</h2>
        <div class="sub">Reusable agreement templates with pre-configured fields and recipient roles</div>
      </div>
      <button class="ds-btn primary" onclick="alert('In DocuSign: New Template wizard opens. For training use the pre-built library below.')">+ New Template</button>
    </div>

    <div style="background:#e8f0fe;border:1px solid #c5d8ff;border-radius:8px;padding:12px 16px;font-size:13px;color:#1a237e;margin-bottom:18px;">
      💡 <b>VA Tip:</b> Templates save time for repetitive documents like NDAs, Buyer Agreements, and Listing Agreements. Always use a template instead of building from scratch for standard documents.
    </div>

    <div class="ds-template-grid">${cards}</div>`;
}

function dsUseTemplate(tmplId) {
  dsMark('ds_c4_2');
  const tmpl = DS_TEMPLATES.find(t => t.id === tmplId);
  alert(`Template "${tmpl ? tmpl.name : tmplId}" selected!\n\nIn DocuSign, this auto-populates:\n• Pre-configured document structure\n• Recipient role placeholders\n• Pre-placed signature and date fields\n\nOpening the Send Envelope wizard...`);
  dsGoto('new-envelope');
}

/* ==================== SCENARIOS ==================== */
function dsScenariosHTML() {
  const score = dsScenarioScore();
  const cards = DS_SCENARIOS.map(s => {
    const r = dsStore.scenarios[s.id];
    const statusText  = r ? (r.correct ? '✓ Correct' : '✗ Incorrect') : 'Not Started';
    const statusClass = r ? (r.correct ? 'completed' : 'voided') : 'draft';
    return `
      <div class="ds-scenario-card" onclick="dsGoto('scenario-detail','${s.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <b>${esc(s.title)}</b>
          <span class="ds-badge ${statusClass}" style="flex-shrink:0;">${statusText}</span>
        </div>
        <p>${esc(s.situation.slice(0, 100))}…</p>
      </div>`;
  }).join('');

  return `
    <div class="ds-listhead">
      <div>
        <h2 class="ds-page-title">Scenario Challenges</h2>
        <div class="sub">Test your VA judgment on real-world DocuSign situations</div>
      </div>
      <div style="font-size:14px;font-weight:700;color:var(--ds-blue);">
        ${score.correct}/${score.answered} correct &nbsp;·&nbsp; ${score.total} scenarios
      </div>
    </div>
    <div class="ds-scenario-grid">${cards}</div>`;
}

/* ==================== SCENARIO DETAIL ==================== */
function dsScenarioDetailHTML() {
  const s = DS_SCENARIOS.find(x => x.id === dsState.activeScenarioId);
  if (!s) return '<p style="color:#888;padding:24px;">Scenario not found.</p>';
  const r = dsStore.scenarios[s.id];

  const opts = s.options.map((opt, idx) => {
    let cls = '';
    if (r) {
      if (idx === s.correct)                    cls = 'correct';
      else if (idx === r.answered && !r.correct) cls = 'incorrect';
    }
    return `
      <button type="button" class="ds-option ${cls}" ${r ? 'disabled' : ''} onclick="dsAnswerScenario('${s.id}',${idx})">
        <b>${String.fromCharCode(65 + idx)}.</b> ${esc(opt)}
      </button>`;
  }).join('');

  const feedback = r ? `
    <div class="ds-feedback ${r.correct ? 'correct' : 'incorrect'}">
      <b>${r.correct ? '✅ Correct Action!' : '❌ Not quite right.'}</b>
      <p style="margin:6px 0 0;">${esc(s.explanation)}</p>
    </div>` : '';

  return `
    <div class="ds-detail-back" onclick="dsGoto('scenarios')">← Back to Scenarios</div>

    <div class="ds-panel" style="margin-top:0;">
      <h3 style="margin:0 0 14px;color:#222;font-size:17px;">${esc(s.title)}</h3>
      <div style="font-size:14px;line-height:1.7;color:#333;margin-bottom:20px;background:#f5f5f5;padding:16px 18px;border-radius:8px;border-left:4px solid var(--ds-blue);">
        ${esc(s.situation)}
      </div>
      <div style="font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Select the best action:</div>
      ${opts}
      ${feedback}
    </div>`;
}

function dsAnswerScenario(scenId, optIdx) {
  const s = DS_SCENARIOS.find(x => x.id === scenId);
  if (!s) return;
  const isCorrect = (optIdx === s.correct);
  dsStore.scenarios[scenId] = { answered: optIdx, correct: isCorrect, ts: Date.now() };
  dsSave();
  dsRenderRoot();
}

/* ==================== FINAL EXAM ==================== */
function dsCompleteTransactionHTML() {
  const checkItems = [
    { id:'ds_c1_1', label:'Opened New Envelope Wizard' },
    { id:'ds_c1_2', label:'Attached purchase agreement document' },
    { id:'ds_c2_1', label:'Configured recipient roles (Buyer, Seller, Agent CC)' },
    { id:'ds_c2_2', label:'Enabled sequential signing order' },
    { id:'ds_c3_1', label:'Placed Signature & Date fields for both signers' },
    { id:'ds_c3_2', label:'Audited field assignments (no mis-assigned fields)' },
    { id:'ds_c1_3', label:'Reviewed envelope summary before sending' },
    { id:'ds_c1_4', label:'Sent envelope successfully' },
    { id:'ds_c5_2', label:'Sent a reminder to an outstanding signer' },
    { id:'ds_c5_4', label:'Voided an incorrect envelope with reason' }
  ];

  const rows = checkItems.map(ci => {
    const done = !!dsStore.checklist[ci.id];
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid #f2f2f2;">
        <span style="font-size:18px;">${done ? '✅' : '⬜'}</span>
        <span style="font-size:13.5px;color:${done ? '#2e7d32' : '#333'};font-weight:${done ? '600' : '400'};">${esc(ci.label)}</span>
      </div>`;
  }).join('');

  const doneCount = checkItems.filter(ci => dsStore.checklist[ci.id]).length;
  const pct = Math.round(doneCount / checkItems.length * 100);

  return `
    <div class="ds-detail-back" onclick="dsGoto('dashboard')">← Back to Dashboard</div>

    <div class="ds-panel" style="margin-top:0;">
      <h2 style="margin:0 0 6px;color:#222;">🎯 Final Exam: Full Real Estate Transaction</h2>
      <p style="font-size:13.5px;color:#888;margin-bottom:20px;">Complete all 10 steps to prove you can manage a full DocuSign transaction from start to finish.</p>

      <div style="background:#fafafa;border:1px solid #e0e0e0;border-radius:8px;padding:16px 20px;margin-bottom:18px;font-size:13.5px;">
        <b style="font-size:14px;">Transaction Scenario:</b>
        <ul style="margin:10px 0 0;padding-left:18px;line-height:1.8;">
          <li><b>Property:</b> 123 Main Street, Austin TX 78701</li>
          <li><b>Buyer:</b> John Smith — must sign <b>FIRST</b> (Order 1)</li>
          <li><b>Seller:</b> Sarah Johnson — must sign <b>SECOND</b> (Order 2)</li>
          <li><b>Agent:</b> Michael Brown — receives a CC copy (Order 3)</li>
          <li><b>Required:</b> Buyer Signature + Date · Seller Signature + Date</li>
        </ul>
      </div>

      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
        <div style="flex:1;background:#e8e8e8;border-radius:999px;height:10px;">
          <div style="width:${pct}%;background:${pct===100?'#43a047':'var(--ds-blue)'};height:100%;border-radius:999px;transition:width .4s;"></div>
        </div>
        <span style="font-size:14px;font-weight:700;color:${pct===100?'#2e7d32':'var(--ds-blue)'};">${doneCount}/${checkItems.length} — ${pct}%</span>
      </div>

      <div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:18px;">
        ${rows}
      </div>

      ${pct === 100 ? `
        <div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:16px 18px;text-align:center;font-size:15px;font-weight:700;color:#2e7d32;">
          🎉 Exam Complete! You've demonstrated full DocuSign VA competency.
        </div>` : `
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="ds-btn yellow" onclick="dsGoto('new-envelope')">1. Start New Envelope →</button>
          <button class="ds-btn primary" onclick="dsGoto('envelopes')">2. Monitor Agreements →</button>
          <button class="ds-btn" onclick="dsGoto('scenarios')">3. Practice Scenarios →</button>
        </div>`}
    </div>`;
}

/* ==================== BOOTSTRAP ==================== */
document.addEventListener('DOMContentLoaded', function () {
  dsLoad();
  dsSyncUser();
  dsSyncNav();
  dsRenderRoot();
  /* Launch tour on first visit */
  if (!dsStore.tourSeen && window.dsTourStart) {
    setTimeout(dsTourStart, 500);
  }
});
