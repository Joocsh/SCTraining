/* DocuSign VA Training Simulator — View Engine & Scenario Logic.
   100% frontend static logic using localStorage for state persistence. */

const DS_LS_KEY = 'ds_va_training_v1';
let dsStore = { checklist: {}, scenarios: {}, envelopes: [] };
let dsState = {
  view: 'dashboard',
  envelopeFilter: 'all',
  activeEnvId: null,
  activeScenarioId: null,
  wizardStep: 1,
  wizardData: {
    subject: 'Purchase Agreement — 123 Main Street',
    documents: [{ name: 'Purchase_Agreement_123_Main.pdf', pages: 6 }],
    recipients: [
      { id: 'wr1', name: 'John Smith', email: 'john.smith@example.com', role: 'Buyer', action: 'Needs to Sign', order: 1 },
      { id: 'wr2', name: 'Sarah Johnson', email: 'sarah.j@example.com', role: 'Seller', action: 'Needs to Sign', order: 2 },
      { id: 'wr3', name: 'Michael Brown', email: 'michael.brown@agency.com', role: 'Agent', action: 'Receives a Copy', order: 3 }
    ],
    fields: [
      { id: 'wf1', type: 'Signature', recipientId: 'wr1', label: 'Buyer Signature', required: true },
      { id: 'wf2', type: 'Date Signed', recipientId: 'wr1', label: 'Date', required: true },
      { id: 'wf3', type: 'Signature', recipientId: 'wr2', label: 'Seller Signature', required: true },
      { id: 'wf4', type: 'Date Signed', recipientId: 'wr2', label: 'Date', required: true }
    ],
    useSequentialOrder: true,
    errorAuditPassed: false
  }
};

function dsLoad() {
  try {
    const raw = localStorage.getItem(DS_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      dsStore.checklist = parsed.checklist || {};
      dsStore.scenarios = parsed.scenarios || {};
    }
  } catch (e) { /* ignore corrupt local state */ }
  dsStore.envelopes = Array.from(DS_ENVELOPES);
}

function dsSave() {
  localStorage.setItem(DS_LS_KEY, JSON.stringify({
    checklist: dsStore.checklist,
    scenarios: dsStore.scenarios
  }));
}

function dsMark(id) {
  if (!dsStore.checklist[id]) {
    dsStore.checklist[id] = true;
    dsSave();
  }
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function dsScenarioScore() {
  let correct = 0, answered = 0;
  DS_SCENARIOS.forEach(s => {
    const r = dsStore.scenarios[s.id];
    if (r) {
      answered++;
      if (r.correct) correct++;
    }
  });
  return { correct, answered, total: DS_SCENARIOS.length };
}

/* ---------- User Session & Topbar ---------- */
function dsSyncUser() {
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const label = document.getElementById('dsUserLabel');
  const av = document.getElementById('dsUserAvatar');
  if (su) {
    if (label) label.textContent = su.name.split(' ')[0];
    if (av) av.textContent = (su.avatar || su.name.charAt(0)).toUpperCase();
  }
}

/* ---------- Navigation Engine ---------- */
function dsGoto(view, extraId) {
  dsState.view = view;
  if (view === 'envelope-detail') dsState.activeEnvId = extraId;
  if (view === 'scenario-detail') dsState.activeScenarioId = extraId;
  dsSyncTopTabs();
  dsRenderRoot();
}

function dsSyncTopTabs() {
  document.querySelectorAll('#dsTopbar .ds-tabs span[data-view]').forEach(el => {
    const v = el.dataset.view;
    const active = v === dsState.view || (v === 'envelopes' && dsState.view === 'envelope-detail') || (v === 'scenarios' && dsState.view === 'scenario-detail');
    el.classList.toggle('active', active);
  });
}

function dsRenderRoot() {
  const root = document.getElementById('dsRoot');
  if (!root) return;
  let html = '';
  if (dsState.view === 'dashboard') html = dsDashboardHTML();
  else if (dsState.view === 'envelopes') html = dsEnvelopesHTML();
  else if (dsState.view === 'envelope-detail') html = dsEnvelopeDetailHTML();
  else if (dsState.view === 'new-envelope') html = dsNewEnvelopeWizardHTML();
  else if (dsState.view === 'templates') html = dsTemplatesHTML();
  else if (dsState.view === 'scenarios') html = dsScenariosHTML();
  else if (dsState.view === 'scenario-detail') html = dsScenarioDetailHTML();
  else if (dsState.view === 'complete-transaction') html = dsCompleteTransactionHTML();
  root.innerHTML = html;
}

/* ---------- Dashboard View ---------- */
function dsDashboardHTML() {
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const firstName = su ? su.name.split(' ')[0] : 'Trainee';

  const cards = Object.keys(DS_CHECKLISTS).map(key => {
    const cl = DS_CHECKLISTS[key];
    const done = cl.items.filter(it => dsStore.checklist[it.id]).length;
    const total = cl.items.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    return `
      <div class="ds-progress-card">
        <div class="top"><b>${esc(cl.label)}</b><span class="frac">${done}/${total}</span></div>
        <div class="ds-bar"><i style="width:${pct}%"></i></div>
      </div>
    `;
  }).join('');

  const score = dsScenarioScore();
  const scorePct = score.answered ? Math.round(score.correct / score.answered * 100) : 0;

  return `
    <div class="ds-welcome">
      <h2>Welcome back, ${esc(firstName)}</h2>
      <p>This is your DocuSign practice environment. Learn to prepare envelopes, configure recipients and signing order, place fields, manage in-flight documents, and troubleshoot issues.</p>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:24px;">
      <button class="ds-btn yellow" onclick="dsGoto('new-envelope')">+ Send a Document (New Envelope)</button>
      <button class="ds-btn primary" onclick="dsGoto('templates')">Use a Template</button>
      <button class="ds-btn" onclick="dsGoto('complete-transaction')">🎯 Final Exam: Full Transaction</button>
    </div>

    <div class="ds-listhead">
      <div><h2>Module Checklists</h2><div class="sub">Items mark completed automatically when you practice their actions</div></div>
    </div>
    <div class="ds-dash-grid">${cards}</div>

    <div class="ds-score-card">
      <div class="ds-score-num">${scorePct}%</div>
      <div class="txt">
        <b>Scenario Challenge Score</b>
        <span>${score.correct} correct out of ${score.answered} answered &middot; ${score.total} total scenarios</span>
      </div>
      <button class="ds-btn primary" style="margin-left:auto" onclick="dsGoto('scenarios')">Go to Scenarios &rarr;</button>
    </div>
  `;
}

/* ---------- Envelopes List View ---------- */
function dsEnvelopesHTML() {
  const filter = dsState.envelopeFilter;
  const list = dsStore.envelopes.filter(e => {
    if (filter === 'all') return true;
    return e.status === filter;
  });

  const rows = list.map(e => `
    <tr class="link" onclick="dsGoto('envelope-detail', '${e.id}')">
      <td class="subject">${esc(e.subject)}</td>
      <td>${esc(e.id)}</td>
      <td>${esc(e.type)}</td>
      <td><span class="ds-badge ${e.status}">${esc(e.status.toUpperCase())}</span></td>
      <td>${esc(e.createdDate)}</td>
      <td>${e.recipients.map(r => `<span style="font-size:11.5px;padding:2px 6px;background:#ebecf0;border-radius:4px;margin-right:4px;">${esc(r.name)} (${r.status})</span>`).join('')}</td>
    </tr>
  `).join('');

  return `
    <div class="ds-listhead">
      <div><h2>Manage Envelopes</h2><div class="sub">Monitor and manage all sent, draft, waiting, and completed documents</div></div>
      <button class="ds-btn yellow" onclick="dsGoto('new-envelope')">+ New Envelope</button>
    </div>

    <div class="ds-toolbar">
      <div class="ds-filter-tabs">
        <button class="${filter === 'all' ? 'active' : ''}" onclick="dsSetFilter('all')">All Envelopes</button>
        <button class="${filter === 'waiting' ? 'active' : ''}" onclick="dsSetFilter('waiting')">Waiting for Others</button>
        <button class="${filter === 'completed' ? 'active' : ''}" onclick="dsSetFilter('completed')">Completed</button>
        <button class="${filter === 'draft' ? 'active' : ''}" onclick="dsSetFilter('draft')">Drafts</button>
        <button class="${filter === 'voided' ? 'active' : ''}" onclick="dsSetFilter('voided')">Voided</button>
      </div>
    </div>

    <table class="ds-tbl">
      <thead>
        <tr><th>Subject</th><th>Envelope #</th><th>Type</th><th>Status</th><th>Created</th><th>Recipients Progress</th></tr>
      </thead>
      <tbody>
        ${rows.length ? rows : '<tr><td colspan="6" style="text-align:center;color:var(--ds-muted);padding:24px;">No envelopes match this filter.</td></tr>'}
      </tbody>
    </table>
  `;
}

function dsSetFilter(f) {
  dsState.envelopeFilter = f;
  dsRenderRoot();
}

/* ---------- Envelope Wizard (Step-by-Step) ---------- */
function dsNewEnvelopeWizardHTML() {
  const step = dsState.wizardStep;
  dsMark('ds_c1_1'); // Mark checklist 1

  return `
    <div class="ds-listhead">
      <div><h2>Create & Send Envelope</h2><div class="sub">Prepare documents, add recipients, configure signing order, and place fields</div></div>
    </div>

    <div class="ds-wizard-steps">
      <div class="ds-step ${step === 1 ? 'active' : (step > 1 ? 'done' : '')}">
        <span class="num">1</span> <span>Add Documents</span>
      </div>
      <div class="ds-step ${step === 2 ? 'active' : (step > 2 ? 'done' : '')}">
        <span class="num">2</span> <span>Add Recipients & Order</span>
      </div>
      <div class="ds-step ${step === 3 ? 'active' : (step > 3 ? 'done' : '')}">
        <span class="num">3</span> <span>Add Fields</span>
      </div>
      <div class="ds-step ${step === 4 ? 'active' : (step > 4 ? 'done' : '')}">
        <span class="num">4</span> <span>Review & Send</span>
      </div>
    </div>

    ${step === 1 ? dsWizardStep1HTML() : ''}
    ${step === 2 ? dsWizardStep2HTML() : ''}
    ${step === 3 ? dsWizardStep3HTML() : ''}
    ${step === 4 ? dsWizardStep4HTML() : ''}
  `;
}

function dsWizardStep1HTML() {
  return `
    <div class="ds-panel">
      <h4>Add Documents to the Envelope</h4>
      <p style="font-size:13.5px;color:var(--ds-muted);margin-bottom:18px;">Upload the PDF/Word files that recipients need to review and sign.</p>
      
      <div style="border:2px dashed #c1c7d0;border-radius:12px;padding:32px;text-align:center;background:#fafbfc;margin-bottom:20px;">
        <div style="font-size:28px;margin-bottom:8px;">📄</div>
        <b style="font-size:14.5px;color:var(--ds-navy);display:block;margin-bottom:4px;">Upload PDF or Document File</b>
        <span style="font-size:12.5px;color:var(--ds-muted);">Simulated file upload for training</span>
        <div style="margin-top:14px;">
          <button class="ds-btn primary" onclick="dsAddMockDocument()">+ Attach Purchase_Agreement_123_Main.pdf</button>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <b>Attached Documents:</b>
        <ul style="margin:10px 0 0;padding-left:20px;font-size:13.5px;color:var(--ds-navy);">
          ${dsState.wizardData.documents.map(d => `<li><b>${esc(d.name)}</b> (${d.pages} pages)</li>`).join('')}
        </ul>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:12px;">
        <button class="ds-btn primary" onclick="dsNextWizardStep(2)">Next: Add Recipients &rarr;</button>
      </div>
    </div>
  `;
}

function dsAddMockDocument() {
  dsMark('ds_c1_2');
  alert('Attached document: Purchase_Agreement_123_Main.pdf');
  dsRenderRoot();
}

function dsWizardStep2HTML() {
  dsMark('ds_c2_1');
  const recs = dsState.wizardData.recipients;

  const rows = recs.map((r, idx) => `
    <div style="display:flex;align-items:center;gap:12px;background:#f7f9fa;border:1px solid var(--ds-line);border-radius:10px;padding:12px 16px;margin-bottom:10px;">
      <div style="font-size:13px;font-weight:800;color:var(--ds-navy);width:70px;">Order #${r.order}</div>
      <div style="flex:1;">
        <b style="font-size:13.5px;display:block;">${esc(r.name)} (${esc(r.role)})</b>
        <span style="font-size:12px;color:var(--ds-muted);">${esc(r.email)}</span>
      </div>
      <div>
        <span class="ds-badge ${r.action === 'Needs to Sign' ? 'completed' : 'waiting'}">${esc(r.action)}</span>
      </div>
    </div>
  `).join('');

  return `
    <div class="ds-panel">
      <h4>Add Recipients & Configure Signing Order</h4>
      <p style="font-size:13.5px;color:var(--ds-muted);margin-bottom:18px;">Specify who needs to sign, who gets a copy (CC), and whether they sign sequentially or in parallel.</p>

      <div style="margin-bottom:18px;background:#ebecf0;padding:12px 16px;border-radius:8px;display:flex;align-items:center;gap:10px;">
        <input type="checkbox" id="chkSeq" ${dsState.wizardData.useSequentialOrder ? 'checked' : ''} onchange="dsToggleSequential(this.checked)">
        <label for="chkSeq" style="font-size:13.5px;font-weight:700;color:var(--ds-navy);cursor:pointer;">Set signing order (Sequential: Buyer Order 1 &rarr; Seller Order 2 &rarr; Agent CC Order 3)</label>
      </div>

      <div style="margin-bottom:20px;">
        ${rows}
      </div>

      <div style="display:flex;justify-content:space-between;">
        <button class="ds-btn" onclick="dsNextWizardStep(1)">&larr; Back</button>
        <button class="ds-btn primary" onclick="dsNextWizardStep(3)">Next: Add Fields &rarr;</button>
      </div>
    </div>
  `;
}

function dsToggleSequential(val) {
  dsMark('ds_c2_2');
  dsMark('ds_c2_3');
  dsState.wizardData.useSequentialOrder = val;
  if (!val) {
    dsState.wizardData.recipients.forEach(r => r.order = 1);
  } else {
    dsState.wizardData.recipients[0].order = 1;
    dsState.wizardData.recipients[1].order = 2;
    dsState.wizardData.recipients[2].order = 3;
  }
  dsRenderRoot();
}

function dsWizardStep3HTML() {
  dsMark('ds_c3_1');
  const fields = dsState.wizardData.fields;

  return `
    <div class="ds-panel">
      <h4>Place Fields on Document Canvas</h4>
      <p style="font-size:13.5px;color:var(--ds-muted);margin-bottom:14px;">Assign Signature, Initial, Date, and Text fields to the correct recipient.</p>

      <div class="ds-canvas">
        <div class="ds-canvas-header">
          <div><b>Canvas: Purchase_Agreement_123_Main.pdf (Page 1)</b></div>
          <button class="ds-btn danger" onclick="dsAuditFieldsTest()">Audit Field Assignments (Error Check)</button>
        </div>

        <div class="ds-canvas-doc">
          <h3>REAL ESTATE PURCHASE AGREEMENT</h3>
          <p>This Purchase Agreement is entered into by and between Buyer and Seller for the property located at 123 Main Street, Austin TX.</p>

          <div style="border-top:1px solid #c1c7d0;padding-top:18px;margin-top:18px;">
            <b>BUYER SECTION:</b>
            <div class="ds-field-slot assigned-buyer">
              <span>✍️ [Buyer Signature Field] &mdash; Assigned to: John Smith (Buyer)</span>
              <span class="ds-badge completed">REQUIRED</span>
            </div>
            <div class="ds-field-slot assigned-buyer">
              <span>📅 [Date Signed Field] &mdash; Assigned to: John Smith (Buyer)</span>
              <span class="ds-badge completed">REQUIRED</span>
            </div>
          </div>

          <div style="border-top:1px solid #c1c7d0;padding-top:18px;margin-top:18px;">
            <b>SELLER SECTION:</b>
            <div class="ds-field-slot assigned-seller">
              <span>✍️ [Seller Signature Field] &mdash; Assigned to: Sarah Johnson (Seller)</span>
              <span class="ds-badge completed">REQUIRED</span>
            </div>
            <div class="ds-field-slot assigned-seller">
              <span>📅 [Date Signed Field] &mdash; Assigned to: Sarah Johnson (Seller)</span>
              <span class="ds-badge completed">REQUIRED</span>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:20px;">
        <button class="ds-btn" onclick="dsNextWizardStep(2)">&larr; Back</button>
        <button class="ds-btn primary" onclick="dsNextWizardStep(4)">Next: Review & Send &rarr;</button>
      </div>
    </div>
  `;
}

function dsAuditFieldsTest() {
  dsMark('ds_c3_2');
  dsMark('ds_c3_3');
  alert('Field Audit Passed! All Buyer fields are assigned to John Smith and Seller fields are assigned to Sarah Johnson.');
}

function dsWizardStep4HTML() {
  dsMark('ds_c1_3');
  dsMark('ds_c1_4');

  return `
    <div class="ds-panel">
      <h4>Review & Send Envelope</h4>
      <p style="font-size:13.5px;color:var(--ds-muted);margin-bottom:18px;">Review envelope summary, email subject, and notification text before sending.</p>

      <div style="background:#f7f9fa;border:1px solid var(--ds-line);border-radius:10px;padding:20px;margin-bottom:20px;">
        <div style="margin-bottom:12px;"><b>Subject:</b> ${esc(dsState.wizardData.subject)}</div>
        <div style="margin-bottom:12px;"><b>Documents:</b> Purchase_Agreement_123_Main.pdf (6 pages)</div>
        <div style="margin-bottom:12px;"><b>Recipients:</b></div>
        <ol style="margin:0;padding-left:20px;font-size:13px;">
          <li>John Smith (Buyer) — Order 1 (Needs to Sign)</li>
          <li>Sarah Johnson (Seller) — Order 2 (Needs to Sign)</li>
          <li>Michael Brown (Agent) — Order 3 (Receives a Copy)</li>
        </ol>
      </div>

      <div style="display:flex;justify-content:space-between;">
        <button class="ds-btn" onclick="dsNextWizardStep(3)">&larr; Back to Fields</button>
        <button class="ds-btn yellow" style="font-size:15px;padding:10px 24px;" onclick="dsSendEnvelopeFinal()">🚀 Send Envelope Now</button>
      </div>
    </div>
  `;
}

function dsNextWizardStep(s) {
  dsState.wizardStep = s;
  dsRenderRoot();
}

function dsSendEnvelopeFinal() {
  const newEnv = {
    id: 'ENV-2026-' + Math.floor(1000 + Math.random() * 9000),
    subject: dsState.wizardData.subject,
    type: 'Real Estate Purchase',
    sender: 'Alex Rivera (VA)',
    status: 'waiting',
    createdDate: new Date().toISOString().split('T')[0],
    closingDate: '2026-08-30',
    documents: dsState.wizardData.documents,
    recipients: dsState.wizardData.recipients,
    fields: dsState.wizardData.fields
  };

  dsStore.envelopes.unshift(newEnv);
  alert(`Envelope ${newEnv.id} has been successfully sent! Notification email triggered.`);
  dsGoto('envelopes');
}

/* ---------- Envelope Detail View (Actions: Resend, Correct, Void) ---------- */
function dsEnvelopeDetailHTML() {
  const env = dsStore.envelopes.find(e => e.id === dsState.activeEnvId);
  if (!env) return '<p>Envelope not found.</p>';

  const recList = env.recipients.map(r => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #f2f3f3;">
      <div>
        <b>Order #${r.order}: ${esc(r.name)}</b> (${esc(r.role)})
        <div style="font-size:12px;color:var(--ds-muted);">${esc(r.email)}</div>
      </div>
      <div>
        <span class="ds-badge ${r.status === 'completed' ? 'completed' : (r.status === 'voided' ? 'voided' : 'waiting')}">${esc(r.status.toUpperCase())}</span>
      </div>
    </div>
  `).join('');

  return `
    <span style="cursor:pointer;font-weight:700;font-size:12.5px;color:var(--ds-muted);" onclick="dsGoto('envelopes')">&larr; Back to Envelopes</span>

    <div class="ds-panel" style="margin-top:14px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div>
          <h2>${esc(env.subject)}</h2>
          <span style="font-size:13px;color:var(--ds-muted);">Envelope ID: ${esc(env.id)} &middot; Created ${esc(env.createdDate)}</span>
        </div>
        <div>
          <span class="ds-badge ${env.status}">${esc(env.status.toUpperCase())}</span>
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
        ${env.status === 'waiting' ? '<button class="ds-btn primary" onclick="dsActionResend(\'' + env.id + '\')">📩 Send Reminder / Resend</button>' : ''}
        ${env.status === 'waiting' ? '<button class="ds-btn" onclick="dsActionCorrect(\'' + env.id + '\')">✏️ Correct Recipient Email</button>' : ''}
        ${env.status === 'waiting' ? '<button class="ds-btn danger" onclick="dsActionVoid(\'' + env.id + '\')">🚫 Void Envelope</button>' : ''}
        ${env.status === 'completed' ? '<button class="ds-btn primary" onclick="alert(\'Downloading executed PDF package with Certificate of Completion...\')">📥 Download Completed Document</button>' : ''}
      </div>

      <h4>Recipients & Status Timeline</h4>
      <div style="border:1px solid var(--ds-line);border-radius:10px;overflow:hidden;">
        ${recList}
      </div>
    </div>
  `;
}

function dsActionResend(envId) {
  dsMark('ds_c5_1');
  dsMark('ds_c5_2');
  alert(`Reminder email sent for Envelope ${envId}!`);
}

function dsActionCorrect(envId) {
  dsMark('ds_c5_3');
  const env = dsStore.envelopes.find(e => e.id === envId);
  if (!env) return;
  const newEmail = prompt('Enter corrected email address for recipient:', 'david.m.freelance@gmail.com');
  if (newEmail) {
    if (env.recipients && env.recipients[0]) {
      env.recipients[0].email = newEmail;
    }
    alert(`Recipient email corrected to: ${newEmail}. Envelope updated!`);
    dsRenderRoot();
  }
}

function dsActionVoid(envId) {
  dsMark('ds_c5_4');
  const env = dsStore.envelopes.find(e => e.id === envId);
  if (!env) return;
  const reason = prompt('Enter mandatory reason for voiding envelope:', 'Superceded by updated contract terms');
  if (reason) {
    env.status = 'voided';
    env.recipients.forEach(r => r.status = 'voided');
    alert(`Envelope ${envId} voided! Reason logged: "${reason}". Signing links revoked.`);
    dsRenderRoot();
  }
}

/* ---------- Templates View ---------- */
function dsTemplatesHTML() {
  dsMark('ds_c4_1');
  const list = DS_TEMPLATES.map(t => `
    <div class="ds-panel" style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <b style="font-size:16px;color:var(--ds-navy);">${esc(t.name)}</b>
          <span class="ds-badge draft" style="margin-left:8px;">${esc(t.category)}</span>
          <p style="font-size:13px;color:var(--ds-muted);margin:8px 0 12px;">${esc(t.description)}</p>
          <div style="font-size:12px;color:var(--ds-navy);"><b>Recipients:</b> ${t.recipients.join(', ')}</div>
        </div>
        <button class="ds-btn yellow" onclick="dsUseTemplate('${t.id}')">Use Template &rarr;</button>
      </div>
    </div>
  `).join('');

  return `
    <div class="ds-listhead">
      <div><h2>Template Library</h2><div class="sub">Use pre-built templates to send standard agreements instantly</div></div>
    </div>
    ${list}
  `;
}

function dsUseTemplate(tmplId) {
  dsMark('ds_c4_2');
  alert('Template selected! Auto-populating document and field rules into new envelope wizard.');
  dsGoto('new-envelope');
}

/* ---------- Scenarios List View ---------- */
function dsScenariosHTML() {
  const score = dsScenarioScore();
  const cards = DS_SCENARIOS.map(s => {
    const r = dsStore.scenarios[s.id];
    let statusText = 'Not Started';
    let statusClass = 'draft';
    if (r) {
      statusText = r.correct ? '✓ Correct' : '✗ Incorrect';
      statusClass = r.correct ? 'completed' : 'voided';
    }
    return `
      <div class="ds-scenario-card" onclick="dsGoto('scenario-detail', '${s.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <b>${esc(s.title)}</b>
          <span class="ds-badge ${statusClass}">${statusText}</span>
        </div>
        <p>${esc(s.situation.slice(0, 110))}...</p>
      </div>
    `;
  }).join('');

  return `
    <div class="ds-listhead">
      <div><h2>Scenario Challenges ("What should I do?")</h2><div class="sub">Test your VA decision-making on real-world troubleshooting situations</div></div>
      <div style="font-weight:700;font-size:14px;color:var(--ds-blue);">${score.correct}/${score.answered} correct &middot; ${score.total} scenarios</div>
    </div>
    <div class="ds-scenario-grid">${cards}</div>
  `;
}

/* ---------- Scenario Detail View ---------- */
function dsScenarioDetailHTML() {
  const s = DS_SCENARIOS.find(x => x.id === dsState.activeScenarioId);
  if (!s) return '<p>Scenario not found.</p>';
  const r = dsStore.scenarios[s.id];

  const opts = s.options.map((opt, idx) => {
    let cls = '';
    if (r) {
      if (idx === s.correct) cls = 'correct';
      else if (idx === r.answered && !r.correct) cls = 'incorrect';
    }
    return `
      <button type="button" class="ds-option ${cls}" ${r ? 'disabled' : ''} onclick="dsAnswerScenario('${s.id}', ${idx})">
        <b>${String.fromCharCode(65 + idx)}.</b> ${esc(opt)}
      </button>
    `;
  }).join('');

  const feedback = r ? `
    <div class="ds-feedback ${r.correct ? 'correct' : 'incorrect'}">
      <b>${r.correct ? 'Correct Action!' : 'Not quite right.'}</b>
      <p style="margin:4px 0 0;">${esc(s.explanation)}</p>
    </div>
  ` : '';

  return `
    <span style="cursor:pointer;font-weight:700;font-size:12.5px;color:var(--ds-muted);" onclick="dsGoto('scenarios')">&larr; Back to Scenarios</span>

    <div class="ds-panel" style="margin-top:14px;">
      <h3 style="margin:0 0 12px;color:var(--ds-navy);">${esc(s.title)}</h3>
      <p style="font-size:14.5px;line-height:1.65;color:var(--ds-ink);margin-bottom:20px;background:#f7f9fa;padding:16px 18px;border-radius:10px;border-left:4px solid var(--ds-blue);">
        ${esc(s.situation)}
      </p>
      ${opts}
      ${feedback}
    </div>
  `;
}

function dsAnswerScenario(scenId, optIdx) {
  const s = DS_SCENARIOS.find(x => x.id === scenId);
  if (!s) return;
  const isCorrect = (optIdx === s.correct);
  dsStore.scenarios[scenId] = { answered: optIdx, correct: isCorrect, ts: Date.now() };
  dsSave();
  dsRenderRoot();
}

/* ---------- Complete Transaction Exam View ---------- */
function dsCompleteTransactionHTML() {
  return `
    <span style="cursor:pointer;font-weight:700;font-size:12.5px;color:var(--ds-muted);" onclick="dsGoto('dashboard')">&larr; Back to Dashboard</span>

    <div class="ds-panel" style="margin-top:14px;">
      <h2 style="margin:0 0 8px;color:var(--ds-navy);">🎯 Final Exam: Real Estate Transaction Workflow</h2>
      <p style="font-size:14px;color:var(--ds-muted);margin-bottom:20px;">Follow the 10-step full workflow checklist to verify your readiness as an Executive Virtual Assistant.</p>

      <div style="background:#f7f9fa;border:1px solid var(--ds-line);border-radius:12px;padding:20px;margin-bottom:20px;">
        <b style="color:var(--ds-navy);font-size:15px;">Transaction Details:</b>
        <ul style="margin:10px 0 0;padding-left:20px;font-size:13.5px;line-height:1.6;">
          <li><b>Property:</b> 123 Main Street, Austin TX</li>
          <li><b>Buyer:</b> John Smith (Must sign FIRST — Order 1)</li>
          <li><b>Seller:</b> Sarah Johnson (Must sign SECOND — Order 2)</li>
          <li><b>Agent:</b> Michael Brown (Receives a Copy — CC Order 3)</li>
          <li><b>Required Fields:</b> Buyer Signature + Date, Seller Signature + Date</li>
        </ul>
      </div>

      <div style="display:flex;gap:14px;flex-wrap:wrap;">
        <button class="ds-btn yellow" onclick="dsGoto('new-envelope')">1. Start New Envelope Wizard &rarr;</button>
        <button class="ds-btn primary" onclick="dsGoto('envelopes')">2. Monitor Envelope Queue &rarr;</button>
      </div>
    </div>
  `;
}

/* ---------- Bootstrap ---------- */
document.addEventListener('DOMContentLoaded', function () {
  dsLoad();
  dsSyncUser();
  dsRenderRoot();
});
