/* DocuSign VA Training Simulator — View Engine & Scenario Logic.
   Redesigned for sidebar layout matching real DocuSign eSignature UI.
   100% frontend static logic using localStorage for state persistence.

   v3: v1/v2 credited items that auto-completed on navigation and had a fake exam
   (a checklist mirror with no questions). Bumping the key discards that progress
   rather than carrying false completions forward. */

const DS_LS_KEY = 'ds_va_training_v3';
const DS_STORE_DEFAULTS = {
  checklist: {}, scenarios: {}, overrides: {},
  reviews: {}, triages: {}, composes: {},
  tourSeen: false, exam: null,
  lessonsDone: {},
  shuffleSalt: null
};
function dsDefaultStore() { return JSON.parse(JSON.stringify(DS_STORE_DEFAULTS)); }
let dsStore = dsDefaultStore();
let dsState = {
  view: 'dashboard',
  envelopeFilter: 'all',
  activeEnvId: null,
  activeScenarioId: null,
  activeTriageId: null,
  activeVerifyId: null,
  activeComposeId: null,
  lessonId: null,
  examIndex: 0,
  wizardStep: 1,
  wizardData: null   /* populated by dsResetWizard() */
};

/* Default wizard state — called on boot and after each send. */
function dsResetWizard() {
  dsState.wizardStep = 1;
  dsState.wizardData = {
    subject: '',
    message: '',
    documents: [],
    recipients: [
      { id: 'wr1', name: '', email: '', role: 'Signer', action: 'Needs to Sign', order: 1 }
    ],
    fields: [],
    useSequentialOrder: true
  };
}

/* ---------- Persistence ----------
   Override layer: base data (DS_ENVELOPES) stays immutable; edits (void, correct,
   new envelopes) are stored as patches and applied on top. This means a reload
   restores the trainee's actions rather than silently discarding them. */
function dsLoad() {
  try {
    const raw = localStorage.getItem(DS_LS_KEY);
    dsStore = raw ? Object.assign(dsDefaultStore(), JSON.parse(raw)) : dsDefaultStore();
  } catch (e) { dsStore = dsDefaultStore(); }
  if (!dsState.wizardData) dsResetWizard();
}
function dsSave() { localStorage.setItem(DS_LS_KEY, JSON.stringify(dsStore)); }
function dsResetProgress() { localStorage.removeItem(DS_LS_KEY); }

/* ---------- Envelope access (respects overrides) ---------- */
function dsGetEnvelope(envId) {
  const base = DS_ENVELOPES.find(e => e.id === envId);
  const ov = dsStore.overrides[envId];
  if (!base && !ov) return null;
  if (!base && ov) return ov;   /* trainee-created envelope (from wizard) */
  if (!ov) return base;
  /* Merge: shallow scalars + deep recipients */
  const merged = Object.assign({}, base, ov);
  merged.recipients = (ov.recipients || base.recipients).map(r => Object.assign({}, r));
  merged.documents  = ov.documents || base.documents;
  merged.fields     = ov.fields || base.fields;
  return merged;
}
/* All envelopes the trainee should see: base + created, with overrides applied. */
function dsAllEnvelopes() {
  const baseIds = DS_ENVELOPES.map(e => e.id);
  const createdIds = Object.keys(dsStore.overrides).filter(id => baseIds.indexOf(id) === -1);
  return baseIds.concat(createdIds).map(dsGetEnvelope).filter(Boolean);
}
function dsSetEnvelopeOverride(envId, patch) {
  dsStore.overrides[envId] = Object.assign(dsStore.overrides[envId] || {}, patch);
  dsSave();
}

/* ---------- Checklist marking (walkthrough-aware) ----------
   dsMark() is the ONLY write path for checklist items. Every call site must be an
   event handler, NEVER a render function — that was the v2 bug where 7 items auto-
   completed on navigation. */
function dsMark(id) {
  const alreadyDone = !!dsStore.checklist[id];
  if (!alreadyDone) {
    dsStore.checklist[id] = true;
    dsSave();
  }
  /* If the walkthrough is actively showing this step, it needs to hear about it
     even if the item was already done from a previous session. */
  const step = (SimEngine.walkActive()) ? SimEngine.currentStep() : null;
  const walkActiveOnThis = step && step.type === 'do' && step.checklistId === id;
  if (!alreadyDone || walkActiveOnThis) dsNotifyStepDone(id);
}

/* esc/escAttr are bound from the shared engine — the project keeps exactly one
   definition of each (assets/js/sim-engine.js). */
const esc = SimEngine.esc;
const escAttr = SimEngine.escAttr;

/* ---------- Deterministic option shuffling ----------
   Copied from the Qualia module's pattern: position is decided by a PRNG seeded on
   the item's id plus a per-session salt, so the same question keeps the same order
   while you look at it, but a different attempt shuffles differently. */
function dsHashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function dsMulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function dsShuffleSalt() {
  if (!dsStore.shuffleSalt) {
    dsStore.shuffleSalt = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    dsSave();
  }
  return dsStore.shuffleSalt;
}
function dsOptionOrder(itemId, n) {
  const rand = dsMulberry32(dsHashString(String(itemId) + '|' + dsShuffleSalt()));
  const order = [];
  for (let i = 0; i < n; i++) order.push(i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
  }
  return order;
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
function dsScenarioFirstAttemptCorrect(scenarioId) {
  const s = dsStore.scenarios[scenarioId];
  return !!(s && s.firstAttempt && s.firstAttempt.correct);
}

/* ---------- User sync ---------- */
function dsSyncUser() {
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const av = document.getElementById('dsUserAvatar');
  if (su && av) av.textContent = (su.avatar || su.name.charAt(0)).toUpperCase();
}

/* ---------- Mobile Sidebar Drawer ---------- */
function dsToggleSidebar(forced) {
  const sb = document.getElementById('dsSidebar');
  const bd = document.getElementById('dsSidebarBackdrop');
  if (!sb) return;
  const shouldOpen = typeof forced === 'boolean' ? forced : !sb.classList.contains('open');
  sb.classList.toggle('open', shouldOpen);
  if (bd) bd.classList.toggle('open', shouldOpen);
}

/* ---------- Navigation ---------- */
/* Opening an envelope from the list is a real trainee action, so it is credited here in the
   click handler rather than inside the render function — the B-2 rule for the whole module:
   an item is marked by doing the thing, never by the view that shows it being drawn. */
function dsOpenEnvelope(envId) {
  dsGoto('envelope-detail', envId);
  dsMark('ds_env_open');
}
function dsGoto(view, extraId) {
  dsToggleSidebar(false);
  dsState.view = view;
  if (view === 'envelope-detail') dsState.activeEnvId = extraId;
  if (view === 'scenario-detail') dsState.activeScenarioId = extraId;
  if (view === 'triage')          dsState.activeTriageId = extraId;
  if (view === 'verify')          dsState.activeVerifyId = extraId;
  if (view === 'compose')         dsState.activeComposeId = extraId;
  if (view === 'lesson')          dsState.lessonId = extraId;
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
    'triage':         'sb-sent',
    'verify':         'sb-sent',
    'compose':        'sb-sent',
    'lesson':         'sb-home',
    'exam':           'sb-exam',
    'complete-transaction': 'sb-exam'
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
    'triage':              dsTriageHTML,
    'verify':              dsVerifyHTML,
    'compose':             dsComposeHTML,
    'lesson':              dsLessonDetailHTML,
    'exam':                dsExamHTML,
    'complete-transaction':dsExamHTML
  };
  root.innerHTML = (views[dsState.view] || (() => '<p>View not found.</p>'))();
}

/* ==================== DASHBOARD ==================== */
function dsDashboardHTML() {
  const su   = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const name = su ? su.name.split(' ')[0] : 'Trainee';

  // 10 Structured Lesson Cards (Progressive Unlock)
  const lessonCards = DS_LESSONS.map((l, i) => {
    const state = SimEngine.lessonState(i);
    const prog = SimEngine.progress(l);
    const pct = prog.total ? Math.round(prog.done / prog.total * 100) : 0;
    const isLocked = state === 'locked';
    const isDone = state === 'done';
    const badgeText = isDone ? 'Done' : (isLocked ? 'Locked' : 'Unlocked');
    const badgeClass = isDone ? 'completed' : (isLocked ? 'expired' : 'waiting');

    const clickAction = !isLocked ? `onclick="SimEngine.openLesson('${escAttr(l.id)}')"` : '';

    return `
      <div class="ds-lesson-card ${state}" ${clickAction} style="background:#fff;border:1px solid ${isDone?'#a5d6a7':isLocked?'#e0e0e0':'#c5d8ff'};border-radius:8px;padding:16px;cursor:${isLocked?'not-allowed':'pointer'};transition:all .15s;opacity:${isLocked?'.65':'1'};box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--ds-muted);text-transform:uppercase;">LESSON ${l.number}</span>
            <h4 style="margin:2px 0 0;font-size:14px;color:#222;">${esc(l.title)}</h4>
          </div>
          <span class="ds-badge ${badgeClass}" style="font-size:11px;padding:2px 8px;">${badgeText}</span>
        </div>
        <p style="font-size:12.5px;color:var(--ds-muted);line-height:1.4;margin:0 0 12px;min-height:34px;">${esc(l.summary)}</p>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="flex:1;background:#eee;border-radius:999px;height:6px;overflow:hidden;">
            <div style="width:${pct}%;background:${isDone?'#43a047':'var(--ds-blue)'};height:100%;border-radius:999px;"></div>
          </div>
          <span style="font-size:11.5px;font-weight:700;color:${isDone?'#2e7d32':'var(--ds-muted)'};">${prog.done}/${prog.total}</span>
        </div>
      </div>`;
  }).join('');

  const checklistsCards = Object.keys(DS_CHECKLISTS).map(key => {
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
  const allEnvelopes = dsAllEnvelopes();
  const waiting   = allEnvelopes.filter(e => e.status === 'waiting').length;
  const completed = allEnvelopes.filter(e => e.status === 'completed').length;

  return `
    <div class="ds-welcome">
      <h2>Welcome back, ${esc(name)}</h2>
      <p>Master professional DocuSign Virtual Assistant workflows: envelope preparation, sequential routing, field audits, in-flight corrections, void procedures, and security verification.</p>
      <button class="ds-tour-replay-btn" onclick="dsTourStart()">▶ Replay Tour</button>
    </div>

    <div class="ds-quick-actions">
      <button class="ds-btn yellow" onclick="dsGoto('new-envelope')">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 4v12M4 10h12"/></svg>
        Send an Envelope
      </button>
      <button class="ds-btn primary" onclick="dsGoto('templates')">Use a Template</button>
      <button class="ds-btn" onclick="dsGoto('exam')">🎯 Final Exam</button>
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

    <div class="ds-listhead" style="margin-top:24px;">
      <div><h2>Curriculum: 10 Structured Lessons</h2><div class="sub">Progressive unlock &middot; Interactive guided walkthrough on every lesson</div></div>
    </div>
    <div class="ds-dash-grid" style="grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:16px;margin-bottom:28px;">
      ${lessonCards}
    </div>

    <div class="ds-listhead">
      <div><h2>Training Checklists</h2><div class="sub">Items auto-complete as you practice each action</div></div>
    </div>
    <div class="ds-dash-grid">${checklistsCards}</div>
  `;
}

/* ==================== AGREEMENTS (Envelopes) VIEW ==================== */
function dsEnvelopesHTML() {
  /* B-2 fix: dsMark('ds_c5_1') was here — removed. Marking now happens via lesson
     walkthrough step completion, not by navigating to the view. */
  const filter = dsState.envelopeFilter;
  const list   = dsAllEnvelopes().filter(e => filter === 'all' || e.status === filter);

  const rows = list.map(e => {
    const recipChips = e.recipients.map(r => {
      const done = r.status === 'completed' || r.status === 'signed';
      return `<span class="ds-recip-chip ${done ? 'done' : ''}">${esc(r.name.split(' ')[0])} ${done ? '✓' : '…'}</span>`;
    }).join('');
    return `
      <tr class="link" onclick="dsOpenEnvelope('${esc(e.id)}')">
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
  /* B-2 fix: dsMark('ds_c1_1') was here — removed. */
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
  const d = dsState.wizardData;
  const docs = d.documents;
  return `
    <div class="ds-panel">
      <h4>Step 1 — Add Documents & Envelope Details</h4>
      <p style="font-size:13px;color:var(--ds-muted);margin-bottom:16px;">Upload the PDF or Word files that recipients will review and sign, and configure the email subject and message.</p>

      <div class="ds-upload-zone">
        <div style="font-size:32px;margin-bottom:8px;">📄</div>
        <b style="font-size:14px;color:#222;display:block;margin-bottom:4px;">Upload PDF or Document File</b>
        <span style="font-size:12.5px;color:#888;">Drag files here or click to attach — simulated for training</span>
        <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
          <button type="button" class="ds-btn primary" onclick="dsAttachDoc('Purchase_Agreement_123_Main.pdf',6)">+ Purchase Agreement (6 pages)</button>
          <button type="button" class="ds-btn" onclick="dsAttachDoc('Seller_Property_Disclosure.pdf',3)">+ Property Disclosure (3 pages)</button>
          <button type="button" class="ds-btn" onclick="dsAttachDoc('Independent_Contractor_Agreement.pdf',4)">+ Contractor Agreement (4 pages)</button>
        </div>
      </div>

      <div style="margin-bottom:18px;">
        <b style="font-size:13px;">Attached Documents (${docs.length})</b>
        ${docs.length === 0 ? '<p style="font-size:12.5px;color:#888;margin:8px 0 0;">No documents attached yet. Click a document above to attach it.</p>' :
          `<ul style="margin:8px 0 0;padding-left:18px;font-size:13px;color:#333;line-height:1.8;">
            ${docs.map(doc => `<li><b>${esc(doc.name)}</b> — ${doc.pages} page${doc.pages !== 1 ? 's' : ''} <button type="button" class="ds-btn sm danger" style="padding:1px 6px;margin-left:8px;font-size:11px;" onclick="dsRemoveDoc('${escAttr(doc.name)}')">✕ Remove</button></li>`).join('')}
          </ul>`}
      </div>

      <div style="background:#fafafa;border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin-bottom:18px;">
        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:12px;font-weight:700;color:var(--ds-muted);margin-bottom:4px;text-transform:uppercase;">Email Subject</label>
          <input type="text" id="dsWizSubject" value="${escAttr(d.subject)}" placeholder="e.g. Please DocuSign: Purchase Agreement — 123 Main St" style="width:100%;padding:8px 10px;border:1px solid var(--ds-line);border-radius:4px;font-size:13.5px;" oninput="dsState.wizardData.subject=this.value">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:var(--ds-muted);margin-bottom:4px;text-transform:uppercase;">Email Message</label>
          <textarea id="dsWizMessage" rows="3" placeholder="Enter custom message to signers..." style="width:100%;padding:8px 10px;border:1px solid var(--ds-line);border-radius:4px;font-size:13px;resize:vertical;" oninput="dsState.wizardData.message=this.value">${esc(d.message)}</textarea>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;color:#888;">💡 Tip: You can add multiple documents per envelope</span>
        <button type="button" class="ds-btn primary" onclick="dsNextWizardStep(2)">Next: Add Recipients →</button>
      </div>
    </div>`;
}

function dsAttachDoc(name, pages) {
  dsMark('ds_c1_2');
  const exists = dsState.wizardData.documents.find(d => d.name === name);
  if (!exists) dsState.wizardData.documents.push({ name, pages });
  dsRenderRoot();
}

function dsRemoveDoc(name) {
  dsState.wizardData.documents = dsState.wizardData.documents.filter(d => d.name !== name);
  dsRenderRoot();
}

function dsWizardStep2HTML() {
  const recs = dsState.wizardData.recipients;

  const rows = recs.map((r, i) => `
    <div style="display:flex;align-items:center;gap:10px;background:#fafafa;border:1px solid #e0e0e0;border-radius:8px;padding:12px 14px;margin-bottom:10px;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:6px;width:90px;">
        <label style="font-size:11px;font-weight:700;color:var(--ds-muted);">ORDER</label>
        <input type="number" min="1" max="10" value="${r.order}" style="width:46px;padding:4px 6px;border:1px solid var(--ds-line);border-radius:4px;font-size:13px;text-align:center;" onchange="dsUpdateRecipient('${r.id}','order',parseInt(this.value,10)||1)">
      </div>
      <div style="flex:2;min-width:140px;">
        <label style="display:block;font-size:10.5px;font-weight:700;color:var(--ds-muted);margin-bottom:2px;">NAME</label>
        <input type="text" value="${escAttr(r.name)}" placeholder="Full Name" style="width:100%;padding:6px 8px;border:1px solid var(--ds-line);border-radius:4px;font-size:13px;" oninput="dsUpdateRecipient('${r.id}','name',this.value)">
      </div>
      <div style="flex:3;min-width:180px;">
        <label style="display:block;font-size:10.5px;font-weight:700;color:var(--ds-muted);margin-bottom:2px;">EMAIL</label>
        <input type="email" value="${escAttr(r.email)}" placeholder="name@example.com" style="width:100%;padding:6px 8px;border:1px solid var(--ds-line);border-radius:4px;font-size:13px;" oninput="dsUpdateRecipient('${r.id}','email',this.value)">
      </div>
      <div style="flex:1.5;min-width:110px;">
        <label style="display:block;font-size:10.5px;font-weight:700;color:var(--ds-muted);margin-bottom:2px;">ROLE</label>
        <input type="text" value="${escAttr(r.role || '')}" placeholder="Buyer, Seller, etc." style="width:100%;padding:6px 8px;border:1px solid var(--ds-line);border-radius:4px;font-size:13px;" oninput="dsUpdateRecipient('${r.id}','role',this.value)">
      </div>
      <div style="flex:2;min-width:130px;">
        <label style="display:block;font-size:10.5px;font-weight:700;color:var(--ds-muted);margin-bottom:2px;">ACTION</label>
        <select style="width:100%;padding:6px 8px;border:1px solid var(--ds-line);border-radius:4px;font-size:12.5px;background:#fff;" onchange="dsUpdateRecipient('${r.id}','action',this.value)">
          <option value="Needs to Sign" ${r.action === 'Needs to Sign' ? 'selected' : ''}>Needs to Sign</option>
          <option value="Receives a Copy" ${r.action === 'Receives a Copy' ? 'selected' : ''}>Receives a Copy (CC)</option>
          <option value="Needs to View" ${r.action === 'Needs to View' ? 'selected' : ''}>Needs to View</option>
        </select>
      </div>
      <div>
        <button type="button" class="ds-btn sm danger" style="padding:4px 8px;" onclick="dsRemoveRecipient('${r.id}')" title="Remove Recipient">✕</button>
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

      <div style="margin-bottom:14px;">${rows}</div>

      <div style="margin-bottom:18px;">
        <button type="button" class="ds-btn" onclick="dsAddRecipient()">+ Add Recipient</button>
      </div>

      <div class="ds-box-tip">
        💡 <b>Tip:</b> Setting Buyer to Order 1 and Seller to Order 2 ensures Sarah cannot sign until John signs first — critical for real estate transactions.
      </div>

      <div style="display:flex;justify-content:space-between;">
        <button type="button" class="ds-btn" onclick="dsNextWizardStep(1)">← Back</button>
        <button type="button" class="ds-btn primary" onclick="dsNextWizardStep(3)">Next: Place Fields →</button>
      </div>
    </div>`;
}

function dsUpdateRecipient(id, key, val) {
  const r = dsState.wizardData.recipients.find(x => x.id === id);
  if (!r) return;
  r[key] = val;
  if (key === 'action') dsMark('ds_c2_1');
}

function dsAddRecipient() {
  const recs = dsState.wizardData.recipients;
  const nextOrder = dsState.wizardData.useSequentialOrder ? recs.length + 1 : 1;
  const newId = 'wr' + (Date.now().toString(36));
  recs.push({
    id: newId,
    name: '',
    email: '',
    role: '',
    action: 'Needs to Sign',
    order: nextOrder
  });
  dsRenderRoot();
}

function dsRemoveRecipient(id) {
  const recs = dsState.wizardData.recipients;
  if (recs.length <= 1) {
    simToast('An envelope must have at least one recipient.');
    return;
  }
  dsState.wizardData.recipients = recs.filter(r => r.id !== id);
  // Re-index orders if sequential
  if (dsState.wizardData.useSequentialOrder) {
    dsState.wizardData.recipients.forEach((r, i) => r.order = i + 1);
  }
  dsRenderRoot();
}

function dsToggleSequential(val) {
  /* B-2 fix: previously marked both ds_c2_2 AND ds_c2_3 with a single click.
     Now marks only the one matching the action taken. */
  if (val) dsMark('ds_c2_2');   /* enabled sequential */
  else     dsMark('ds_c2_3');   /* configured parallel (all same order) */
  dsState.wizardData.useSequentialOrder = val;
  const recs = dsState.wizardData.recipients;
  if (!val) {
    recs.forEach(r => r.order = 1); // parallel
  } else {
    recs.forEach((r, i) => r.order = i + 1);
  }
  dsRenderRoot();
}

function dsWizardStep3HTML() {
  const recs = dsState.wizardData.recipients;
  const fields = dsState.wizardData.fields;

  // Render recipient options for field assignment
  function recipOptions(currentRecipId) {
    return recs.map(r =>
      `<option value="${escAttr(r.id)}" ${r.id === currentRecipId ? 'selected' : ''}>${esc(r.name || r.role || r.id)} (${esc(r.role || 'Signer')}, Order ${r.order})</option>`
    ).join('');
  }

  return `
    <div class="ds-panel">
      <h4>Step 3 — Place & Assign Fields on Document</h4>
      <p style="font-size:13px;color:var(--ds-muted);margin-bottom:14px;">Assign Signature, Initials, Date Signed, and Text fields to the correct recipient on the document canvas.</p>

      <div class="ds-canvas">
        <div class="ds-canvas-header">
          <div><b style="font-size:13px;">📄 Document Canvas — Page 1</b></div>
          <div style="display:flex;gap:8px;">
            <button type="button" class="ds-btn" onclick="dsAddField()">+ Add Field</button>
            <button type="button" class="ds-btn danger" onclick="dsAuditFields()">⚠ Audit Assignments</button>
          </div>
        </div>

        <!-- Field Type Palette -->
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
          <div style="font-size:11.5px;font-weight:700;color:#888;align-self:center;">FIELDS:</div>
          ${['Signature','Initials','Date Signed','Text Box','Checkbox'].map(f =>
            `<button type="button" class="ds-btn" style="font-size:12px;padding:5px 10px;" onclick="simToast('In real DocuSign, drag this ${f} field onto the document. Fields are pre-placed below.')">${f}</button>`
          ).join('')}
        </div>

        <div class="ds-canvas-doc">
          <h3>REAL ESTATE PURCHASE AGREEMENT</h3>
          <p>This Purchase Agreement is entered into by and between Buyer and Seller for the property at <b>123 Main Street, Austin TX 78701</b>. Both parties agree to the terms outlined herein.</p>

          <div style="border-top:1px solid #e0e0e0;padding-top:16px;margin-top:16px;">
            <b style="font-size:12.5px;color:#555;text-transform:uppercase;letter-spacing:.5px;">Buyer Signature Block</b>
            <div class="ds-field-slot assigned-buyer" style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <span>✍ Signature Field — Buyer</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <label style="font-size:11px;color:#555;">Assign to:</label>
                <select style="font-size:12px;padding:3px 6px;border-radius:4px;border:1px solid #ccc;background:#fff;" onchange="dsUpdateFieldRecipient('wf1', this.value)">
                  ${recipOptions(fields.find(f => f.id === 'wf1')?.recipientId || recs[0]?.id)}
                </select>
                <span class="ds-badge completed" style="font-size:11px;">Required</span>
              </div>
            </div>
            <div class="ds-field-slot assigned-buyer" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <span>📅 Date Signed — Buyer</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <label style="font-size:11px;color:#555;">Assign to:</label>
                <select style="font-size:12px;padding:3px 6px;border-radius:4px;border:1px solid #ccc;background:#fff;" onchange="dsUpdateFieldRecipient('wf2', this.value)">
                  ${recipOptions(fields.find(f => f.id === 'wf2')?.recipientId || recs[0]?.id)}
                </select>
                <span class="ds-badge completed" style="font-size:11px;">Required</span>
              </div>
            </div>
          </div>

          <div style="border-top:1px solid #e0e0e0;padding-top:16px;margin-top:16px;">
            <b style="font-size:12.5px;color:#555;text-transform:uppercase;letter-spacing:.5px;">Seller Signature Block</b>
            <div class="ds-field-slot assigned-seller" style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <span>✍ Signature Field — Seller</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <label style="font-size:11px;color:#555;">Assign to:</label>
                <select style="font-size:12px;padding:3px 6px;border-radius:4px;border:1px solid #ccc;background:#fff;" onchange="dsUpdateFieldRecipient('wf3', this.value)">
                  ${recipOptions(fields.find(f => f.id === 'wf3')?.recipientId || recs[1]?.id || recs[0]?.id)}
                </select>
                <span class="ds-badge completed" style="font-size:11px;">Required</span>
              </div>
            </div>
            <div class="ds-field-slot assigned-seller" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <span>📅 Date Signed — Seller</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <label style="font-size:11px;color:#555;">Assign to:</label>
                <select style="font-size:12px;padding:3px 6px;border-radius:4px;border:1px solid #ccc;background:#fff;" onchange="dsUpdateFieldRecipient('wf4', this.value)">
                  ${recipOptions(fields.find(f => f.id === 'wf4')?.recipientId || recs[1]?.id || recs[0]?.id)}
                </select>
                <span class="ds-badge completed" style="font-size:11px;">Required</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:18px;">
        <button type="button" class="ds-btn" onclick="dsNextWizardStep(2)">← Back</button>
        <button type="button" class="ds-btn primary" onclick="dsNextWizardStep(4)">Next: Review & Send →</button>
      </div>
    </div>`;
}

function dsUpdateFieldRecipient(fieldId, recipId) {
  let f = dsState.wizardData.fields.find(x => x.id === fieldId);
  if (!f) {
    f = { id: fieldId, type: 'Signature', recipientId: recipId, label: fieldId, required: true };
    dsState.wizardData.fields.push(f);
  } else {
    f.recipientId = recipId;
  }
}

function dsAddField() {
  /* B-8: was alert(). B-2: mark moved here from the render function. */
  dsMark('ds_c3_1');
  simToast('In real DocuSign, you drag fields from the left palette onto the document. Fields are pre-placed in this training view.', { duration: 4000 });
}
function dsAuditFields() {
  /* B-4/B-8: was a single alert that always said "passed". Now checks fields. */
  const fields = dsState.wizardData.fields;
  const recs = dsState.wizardData.recipients;
  const errors = [];

  // Check that all required fields are assigned
  const buyerRecip = recs.find(r => /buyer/i.test(r.role) || /john/i.test(r.name)) || recs[0];
  const sellerRecip = recs.find(r => /seller/i.test(r.role) || /sarah/i.test(r.name)) || recs[1];

  const f1 = fields.find(f => f.id === 'wf1');
  const f3 = fields.find(f => f.id === 'wf3');

  if (buyerRecip && f1 && f1.recipientId !== buyerRecip.id) {
    errors.push(`Buyer signature is assigned to ${recs.find(r => r.id === f1.recipientId)?.name || 'the wrong recipient'}.`);
  }
  if (sellerRecip && f3 && f3.recipientId !== sellerRecip.id) {
    errors.push(`Seller signature is assigned to ${recs.find(r => r.id === f3.recipientId)?.name || 'the wrong recipient'}.`);
  }

  if (errors.length === 0) {
    dsMark('ds_c3_2');
    dsMark('ds_c3_3');
    simToast('Field Audit Passed! All field assignments match signer roles.', { tone: 'good' });
  } else {
    simToast(`Audit issue: ${errors[0]}`);
  }
}

function dsWizardStep4HTML() {
  /* B-2 fix: dsMark('ds_c1_3') and dsMark('ds_c1_4') were here — removed. */
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
  const d = dsState.wizardData;
  /* Validation: subject and at least one recipient with name+email */
  if (!d.subject.trim()) { simToast('Enter an email subject before sending.'); return; }
  const validRecips = d.recipients.filter(r => r.name.trim() && r.email.trim());
  if (!validRecips.length) { simToast('Add at least one recipient with name and email.'); return; }

  const newEnvId = 'ENV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const newEnv = {
    id: newEnvId,
    subject: d.subject,
    type: 'Real Estate Purchase',
    sender: (window.SCApp && SCApp.currentUser && SCApp.currentUser()
      ? SCApp.currentUser().name : 'Alex Rivera') + ' (VA)',
    status: 'waiting',
    createdDate: DS_TODAY,
    closingDate: '2026-09-01',
    documents: [...d.documents],
    recipients: d.recipients.map(r => Object.assign({}, r, { status: r.order === 1 ? 'sent' : 'pending' })),
    fields: [...d.fields]
  };
  /* B-6 fix: persist via override layer, not volatile array. */
  dsSetEnvelopeOverride(newEnvId, newEnv);

  /* B-2 fix: marks moved here from dsWizardStep4HTML (the render function). */
  dsMark('ds_c1_3');
  dsMark('ds_c1_4');

  dsResetWizard();
  /* B-8: was alert(). */
  simToast(`Envelope ${newEnvId} sent! Notification emails triggered.`, { tone: 'good', duration: 4000 });
  dsGoto('envelopes');
}

/* ==================== ENVELOPE DETAIL ==================== */
function dsEnvelopeDetailHTML() {
  /* B-6 fix: reads through override layer, not volatile array. */
  const env = dsGetEnvelope(dsState.activeEnvId);
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
        <div class="ds-box-tip" style="margin-top:14px;margin-bottom:0;">
          💡 <b>VA Tip:</b> If a recipient hasn't acted in 24–48 hours, use <em>Send Reminder</em> to re-notify them. Check the email address is correct with <em>Correct Envelope</em> first.
        </div>` : ''}
      ${isCompleted ? `
        <div class="ds-box-success" style="margin-top:14px;margin-bottom:0;">
          ✅ All parties have signed. Download the completed PDF with the Certificate of Completion for your records.
        </div>` : ''}
    </div>`;
}

/* -- Envelope Actions (B-8: all alert/prompt replaced with toasts + in-page forms) -- */
function dsActionResend(envId) {
  dsMark('ds_c5_2');
  simToast(`Reminder sent for Envelope ${envId}! All outstanding recipients re-notified.`, { tone: 'good' });
}

function dsActionCorrect(envId) {
  /* B-5/B-8: was prompt() with no validation. Now shows inline form. */
  const env = dsGetEnvelope(envId);
  if (!env) return;
  /* Render the form inline in the detail view */
  const root = document.getElementById('dsRoot');
  const formId = 'dsCorrectForm-' + envId;
  if (document.getElementById(formId)) return;   /* already open */
  const bar = document.querySelector('.ds-action-bar');
  if (!bar) return;
  const form = document.createElement('div');
  form.id = formId;
  form.className = 'ds-panel';
  form.style.marginTop = '12px';
  const recips = env.recipients.map((r, i) =>
    `<div style="margin-bottom:8px;"><label style="font-size:12px;font-weight:600;color:var(--ds-muted);">${esc(r.name)} (${esc(r.role)})</label>
     <input type="email" id="dsCorrectEmail-${i}" value="${escAttr(r.email)}" style="width:100%;padding:6px 10px;border:1px solid var(--ds-line);border-radius:4px;font-size:13px;margin-top:4px;"></div>`
  ).join('');
  form.innerHTML = `<h4>Correct Envelope ${esc(envId)}</h4>
    <p style="font-size:13px;color:var(--ds-muted);">Update recipient email addresses below. Only email format is accepted.</p>
    ${recips}
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="ds-btn primary" onclick="dsCorrectSubmit('${escAttr(envId)}')">Save & Resend</button>
      <button class="ds-btn" onclick="document.getElementById('${formId}').remove()">Cancel</button>
    </div>`;
  bar.after(form);
}
function dsCorrectSubmit(envId) {
  const env = dsGetEnvelope(envId);
  if (!env) return;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const updated = [];
  for (let i = 0; i < env.recipients.length; i++) {
    const input = document.getElementById('dsCorrectEmail-' + i);
    if (!input) continue;
    const val = input.value.trim();
    if (!emailRe.test(val)) {
      simToast(`"${val}" is not a valid email address.`);
      input.focus();
      return;
    }
    updated.push(Object.assign({}, env.recipients[i], { email: val }));
  }
  dsSetEnvelopeOverride(envId, { recipients: updated });
  dsMark('ds_c5_3');
  simToast('Recipient email corrected! Envelope updated and re-sent.', { tone: 'good' });
  dsRenderRoot();
}

function dsActionVoid(envId) {
  /* B-5/B-8: was prompt() with pre-filled reason + 'Superceded' typo. */
  const env = dsGetEnvelope(envId);
  if (!env) return;
  const formId = 'dsVoidForm-' + envId;
  if (document.getElementById(formId)) return;
  const bar = document.querySelector('.ds-action-bar');
  if (!bar) return;
  const form = document.createElement('div');
  form.id = formId;
  form.className = 'ds-panel';
  form.style.marginTop = '12px';
  form.innerHTML = `<h4>Void Envelope ${esc(envId)}</h4>
    <p style="font-size:13px;color:var(--ds-muted);">This will instantly revoke all signing links. This action cannot be undone.</p>
    <label style="font-size:12px;font-weight:600;color:var(--ds-muted);">Reason for voiding (required, minimum 10 characters)</label>
    <textarea id="dsVoidReason" rows="3" placeholder="Enter reason..." style="width:100%;padding:8px 10px;border:1px solid var(--ds-line);border-radius:4px;font-size:13px;margin-top:4px;resize:vertical;"></textarea>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="ds-btn danger" onclick="dsVoidSubmit('${escAttr(envId)}')">Void Envelope</button>
      <button class="ds-btn" onclick="document.getElementById('${formId}').remove()">Cancel</button>
    </div>`;
  bar.after(form);
}
function dsVoidSubmit(envId) {
  const reason = (document.getElementById('dsVoidReason') || {}).value || '';
  if (reason.trim().length < 10) {
    simToast('Enter a reason of at least 10 characters.');
    return;
  }
  /* B-6 fix: persist via override layer */
  const env = dsGetEnvelope(envId);
  if (!env) return;
  const voidedRecips = env.recipients.map(r => Object.assign({}, r, { status: 'voided' }));
  dsSetEnvelopeOverride(envId, { status: 'voided', recipients: voidedRecips, voidReason: reason.trim() });
  dsMark('ds_c5_4');
  /* B-11 fix: 'Superceded' → 'Superseded' is fixed by removing the pre-filled prompt */
  simToast(`Envelope ${envId} voided. All signing links revoked.`, { tone: 'good' });
  dsRenderRoot();
}

function dsActionDownload(envId) {
  simToast(`Downloading completed document package for ${envId}...`, { duration: 3000 });
}

function dsActionDownloadCert(envId) {
  simToast(`Downloading Certificate of Completion for ${envId}...`, { duration: 3000 });
}

/* ==================== TEMPLATES ==================== */
function dsTemplatesHTML() {
  /* B-2 fix: dsMark('ds_c4_1') was here — removed. */

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
      <button class="ds-btn primary" onclick="simToast('In DocuSign: New Template wizard opens. Use the pre-built library below for training.')">+ New Template</button>
    </div>

    <div style="background:#e8f0fe;border:1px solid #c5d8ff;border-radius:8px;padding:12px 16px;font-size:13px;color:#1a237e;margin-bottom:18px;">
      💡 <b>VA Tip:</b> Templates save time for repetitive documents like NDAs, Buyer Agreements, and Listing Agreements. Always use a template instead of building from scratch for standard documents.
    </div>

    <div class="ds-template-grid">${cards}</div>`;
}

function dsUseTemplate(tmplId) {
  dsMark('ds_c4_2');
  const tmpl = DS_TEMPLATES.find(t => t.id === tmplId);
  /* B-8: was alert(). Now navigates to wizard with template pre-populated. */
  simToast(`Template "${tmpl ? tmpl.name : tmplId}" selected! Opening Send Envelope wizard...`, { tone: 'good' });
  dsResetWizard();
  if (tmpl) {
    dsState.wizardData.subject = tmpl.name;
    dsState.wizardData.recipients = tmpl.recipients.map((r, i) => ({
      id: 'wt' + i, name: '', email: '', role: r, action: r === 'CC' ? 'Receives a Copy' : 'Needs to Sign', order: i + 1
    }));
  }
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

  /* B-3: options are shown in shuffled order */
  const order = dsOptionOrder(s.id, s.options.length);
  const opts = order.map(origIdx => {
    let cls = '';
    if (r) {
      if (origIdx === s.correct)                    cls = 'correct';
      else if (origIdx === r.answered && !r.correct) cls = 'incorrect';
    }
    return `
      <button type="button" class="ds-option ${cls}" ${r ? 'disabled' : ''} onclick="dsAnswerScenario('${s.id}',${origIdx})">
        ${esc(s.options[origIdx])}
      </button>`;
  }).join('');

  /* A wrong answer used to be terminal: the options were disabled and nothing offered a way
     back, so a single mis-click on Lesson 1's scenario locked the entire curriculum behind an
     unsatisfiable step. Retry is always available; what protects the score is firstAttempt,
     which dsAnswerScenario records once and never overwrites. Once the answer IS correct and
     a Continue button is showing, Retake is dropped — clicking it there would wipe the
     resolved state and take the Continue button down with it. */
  const continueBtn = (r && r.correct && SimEngine.continueHTML)
    ? SimEngine.continueHTML({ type: 'decide', scenarioId: s.id }) : '';
  const retakeBtn = r
    ? ((r.correct && continueBtn) ? ''
      : `<button type="button" class="ds-btn sm" onclick="dsRetakeScenario('${escAttr(s.id)}')">${r.correct ? 'Retake Scenario' : 'Try Again'}</button>`)
    : '';
  const firstLine = (r && r.firstAttempt)
    ? `<div class="ds-first-attempt">First attempt: ${r.firstAttempt.correct ? '&#10003; correct' : '&#10007; incorrect'} &middot; this is what counts toward your score.</div>`
    : '';
  const feedback = r ? `
    <div class="ds-feedback ${r.correct ? 'correct' : 'incorrect'}">
      <b>${r.correct ? 'Correct!' : 'Not quite right.'}</b>
      <p class="ds-feedback-body">${esc(s.explanation)}</p>
      ${firstLine}
      <div class="ds-feedback-actions">${continueBtn}${retakeBtn}</div>
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

/* Clears the current answer so the options unlock, while keeping firstAttempt — retaking is
   for learning, not for laundering a wrong first answer into a right one. Mirrors
   qzRetakeScenario in the Qualia module. */
function dsRetakeScenario(scenId) {
  const prev = dsStore.scenarios[scenId] || {};
  if (prev.firstAttempt) dsStore.scenarios[scenId] = { firstAttempt: prev.firstAttempt };
  else delete dsStore.scenarios[scenId];
  dsSave();
  dsRenderRoot();
  /* If the walkthrough is parked on this exact step it is showing "Not quite" with no way
     forward; re-rendering its tip puts the original instruction back. */
  if (SimEngine.walkActive()) {
    const step = SimEngine.currentStep();
    if (step && step.type === 'decide' && step.scenarioId === scenId) SimEngine.renderTip(step, false);
  }
}
function dsAnswerScenario(scenId, optIdx) {
  const s = DS_SCENARIOS.find(x => x.id === scenId);
  if (!s) return;
  const isCorrect = (optIdx === s.correct);
  const existing = dsStore.scenarios[scenId];
  const record = { answered: optIdx, correct: isCorrect, ts: Date.now() };
  /* B-3 fix: track first attempt separately for exam-quality grading. */
  if (!existing) record.firstAttempt = { answered: optIdx, correct: isCorrect };
  else record.firstAttempt = existing.firstAttempt || { answered: optIdx, correct: isCorrect };
  dsStore.scenarios[scenId] = record;
  dsSave();
  /* B-7: Report score to SCApp core */
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  if (su && window.SCApp.setModeScore) {
    const sc = dsScenarioScore();
    SCApp.setModeScore(su.id, 'docusign', 'scenario', sc.correct, sc.total);
  }
  /* Notify walkthrough (for 'decide' steps linked to this scenario) */
  if (isCorrect) dsNotifyStepDone('scenario:' + scenId);
  dsRenderRoot();
}

/* ============================================================================
   TRIAGE MECHANIC (D-1: Lesson 5, Lesson 10 & Exam)
   ============================================================================ */
const DS_TRIAGE_ACTION_LABELS = {
  'resend': 'Send Reminder (Resend)',
  'correct': 'Correct Envelope (In-flight Edit)',
  'void': 'Void Envelope (Mandatory Reason)',
  'none': 'No Action Needed (On Track / Completed)',
  'report-phishing': 'Report Phishing / Security Threat',
  'escalate': 'Escalate to Supervising Broker'
};

function dsTriageHTML() {
  const id = dsState.activeTriageId || 'tri-env-9041';
  const item = DS_TRIAGE_ITEMS.find(x => x.id === id) || DS_TRIAGE_ITEMS[0];
  const r = dsStore.triages[item.id];

  const actions = ['resend', 'correct', 'void', 'none', 'report-phishing', 'escalate'];
  const btns = actions.map(act => {
    let cls = '';
    if (r) {
      if (act === item.rightAction)                 cls = 'correct';
      else if (act === r.answered && !r.correct)   cls = 'incorrect';
    }
    return `<button type="button" class="ds-option ${cls}" ${r ? 'disabled' : ''} onclick="dsTriageAnswer('${item.id}','${act}')" style="margin-bottom:8px;text-align:left;">
      <b>${esc(DS_TRIAGE_ACTION_LABELS[act])}</b>
    </button>`;
  }).join('');

  const docBtn = item.doc ? `<div style="margin-bottom:14px;"><button type="button" class="ds-btn primary sm" onclick="SimEngine.viewDoc('${escAttr(item.doc)}','${escAttr(item.docTitle)}')">📄 Open & Inspect ${esc(item.docTitle || 'Document')}</button></div>` : '';

  const continueBtn = (r && r.correct && SimEngine.continueHTML)
    ? SimEngine.continueHTML({ type: 'triage', triageId: item.id }) : '';
  const retryBtn = r
    ? ((r.correct && continueBtn) ? ''
      : `<button type="button" class="ds-btn sm" onclick="dsRetakeTriage('${escAttr(item.id)}')">${r.correct ? 'Redo' : 'Try Again'}</button>`)
    : '';
  const feedback = r ? `
    <div class="ds-feedback ${r.correct ? 'correct' : 'incorrect'}">
      <b>${r.correct ? 'Correct triage action.' : 'Not the right action here.'}</b>
      <p class="ds-feedback-body">${esc(item.explain)}</p>
      <div class="ds-feedback-actions">${continueBtn}${retryBtn}</div>
    </div>` : '';

  return `
    <div class="ds-detail-back" onclick="dsGoto('dashboard')">← Back to Dashboard</div>

    <div class="ds-panel" style="margin-top:0;">
      <span class="ds-badge yellow" style="font-size:11px;margin-bottom:6px;display:inline-block;">TRIAGE DECISION</span>
      <h3 style="margin:0 0 12px;color:#222;font-size:17px;">${esc(item.title)}</h3>

      <div style="font-size:14px;line-height:1.7;color:#333;margin-bottom:16px;background:#f5f5f5;padding:16px 18px;border-radius:8px;border-left:4px solid var(--ds-blue);">
        ${esc(item.situation)}
      </div>

      ${docBtn}

      <div style="font-size:12px;font-weight:700;color:var(--ds-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">What is the appropriate action for this item?</div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${btns}
      </div>
      ${feedback}
    </div>`;
}

/* Same rule as dsRetakeScenario: unlock the choices, keep firstAttempt. Used by both the
   triage and verify banks, which store their records in different bags but with the same
   shape. */
function dsRetakeItem(bag, itemId, stepType, stepKey) {
  const prev = bag[itemId] || {};
  if (prev.firstAttempt) bag[itemId] = { firstAttempt: prev.firstAttempt };
  else delete bag[itemId];
  dsSave();
  dsRenderRoot();
  if (SimEngine.walkActive()) {
    const step = SimEngine.currentStep();
    if (step && step.type === stepType && step[stepKey] === itemId) SimEngine.renderTip(step, false);
  }
}
function dsRetakeTriage(itemId) { dsRetakeItem(dsStore.triages, itemId, 'triage', 'triageId'); }
function dsRetakeVerify(itemId) { dsRetakeItem(dsStore.reviews, itemId, 'verify', 'reviewId'); }

function dsTriageAnswer(itemId, action) {
  const item = DS_TRIAGE_ITEMS.find(x => x.id === itemId);
  if (!item) return;
  const isCorrect = (action === item.rightAction);
  /* firstAttempt is written once and never overwritten, so retaking can improve what the
     trainee understands without rewriting what they actually scored the first time. */
  const prev = dsStore.triages[itemId];
  dsStore.triages[itemId] = {
    answered: action, correct: isCorrect, ts: Date.now(),
    firstAttempt: (prev && prev.firstAttempt) || { answered: action, correct: isCorrect }
  };
  if (isCorrect) dsMark('tri:' + itemId);
  dsSave();
  if (isCorrect) dsNotifyStepDone('tri:' + itemId);
  dsRenderRoot();
}

/* ============================================================================
   VERIFY MECHANIC (D-1: Lesson 6, Lesson 7, Lesson 9 & Exam)
   ============================================================================ */
function dsVerifyHTML() {
  const id = dsState.activeVerifyId || 'ver-cert-9041';
  const item = DS_VERIFY_ITEMS.find(x => x.id === id) || DS_VERIFY_ITEMS[0];
  const r = dsStore.reviews[item.id];

  const opts = item.options.map(opt => {
    let cls = '';
    if (r) {
      if (opt.id === item.rightOptionId)           cls = 'correct';
      else if (opt.id === r.answered && !r.correct) cls = 'incorrect';
    }
    return `<button type="button" class="ds-option ${cls}" ${r ? 'disabled' : ''} onclick="dsVerifyAnswer('${item.id}','${opt.id}')" style="margin-bottom:8px;text-align:left;">
      <b>${opt.id.toUpperCase()}.</b> ${esc(opt.text)}
    </button>`;
  }).join('');

  const docBtn = `<button type="button" class="ds-btn primary" onclick="SimEngine.viewDoc('${escAttr(item.doc)}','${escAttr(item.docTitle)}')">🔍 Open ${esc(item.docTitle)} &rarr;</button>`;

  const continueBtn = (r && r.correct && SimEngine.continueHTML)
    ? SimEngine.continueHTML({ type: 'verify', reviewId: item.id }) : '';
  const retryBtn = r
    ? ((r.correct && continueBtn) ? ''
      : `<button type="button" class="ds-btn sm" onclick="dsRetakeVerify('${escAttr(item.id)}')">${r.correct ? 'Redo' : 'Try Again'}</button>`)
    : '';
  const feedback = r ? `
    <div class="ds-feedback ${r.correct ? 'correct' : 'incorrect'}">
      <b>${r.correct ? 'Audit verified.' : 'That is not what the document shows.'}</b>
      <p class="ds-feedback-body">${esc(item.explain)}</p>
      <div class="ds-feedback-actions">${continueBtn}${retryBtn}</div>
    </div>` : '';

  return `
    <div class="ds-detail-back" onclick="dsGoto('dashboard')">← Back to Dashboard</div>

    <div class="ds-panel" style="margin-top:0;">
      <span class="ds-badge green" style="font-size:11px;margin-bottom:6px;display:inline-block;">DOCUMENT VERIFICATION</span>
      <h3 style="margin:0 0 12px;color:#222;font-size:17px;">${esc(item.title)}</h3>

      <div style="background:#f0f4ff;border:1px solid #c5d8ff;border-radius:8px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div>
          <span style="font-size:12px;font-weight:700;color:#1a237e;">STEP 1: INSPECT SOURCE DOCUMENT</span>
          <div style="font-size:13px;color:#333;margin-top:2px;">Compare system timestamps and signer records with the document audit trail.</div>
        </div>
        ${docBtn}
      </div>

      <div style="font-size:13.5px;line-height:1.6;color:#333;margin-bottom:16px;background:#fafafa;padding:12px 16px;border-radius:6px;border:1px solid #e0e0e0;">
        <span style="font-size:11px;font-weight:700;color:var(--ds-muted);text-transform:uppercase;">SYSTEM LOG</span><br>
        <b>${esc(item.systemValue)}</b>
      </div>

      <div style="font-size:13px;font-weight:700;color:#222;margin-bottom:12px;">${esc(item.question)}</div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${opts}
      </div>
      ${feedback}
    </div>`;
}

function dsVerifyAnswer(itemId, optionId) {
  const item = DS_VERIFY_ITEMS.find(x => x.id === itemId);
  if (!item) return;
  const isCorrect = (optionId === item.rightOptionId);
  const prev = dsStore.reviews[itemId];
  dsStore.reviews[itemId] = {
    answered: optionId, correct: isCorrect, ts: Date.now(),
    firstAttempt: (prev && prev.firstAttempt) || { answered: optionId, correct: isCorrect }
  };
  if (isCorrect) dsMark('ver:' + itemId);
  dsSave();
  if (isCorrect) dsNotifyStepDone('ver:' + itemId);
  dsRenderRoot();
}

/* ============================================================================
   COMPOSE MECHANIC (D-1: Lesson 8 & Exam)
   ============================================================================ */
function dsComposeHTML() {
  const id = dsState.activeComposeId || 'cmp-void-notice';
  const item = DS_COMPOSE_ITEMS.find(x => x.id === id) || DS_COMPOSE_ITEMS[0];
  const r = dsStore.composes[item.id];

  let feedback = '';
  if (r) {
    const rubricRows = r.results.map(crit => `
      <div style="display:flex;align-items:center;gap:10px;font-size:12.5px;margin-bottom:4px;color:${crit.pass ? '#2e7d32' : '#c62828'};">
        <span>${crit.pass ? '✓' : '✗'}</span>
        <span>${esc(crit.label)} ${crit.required ? '(Required)' : ''}</span>
      </div>`).join('');

    feedback = `
      <div class="ds-feedback ${r.passed ? 'correct' : 'incorrect'}">
        <b>${r.passed ? '✅ Rubric Criteria Met (' + r.passedCount + '/' + r.totalCount + ')' : '❌ Needs Revision (' + r.passedCount + '/' + r.totalCount + ')'}</b>
        <div style="margin-top:8px;">${rubricRows}</div>
        ${r.passed && SimEngine.continueHTML ? SimEngine.continueHTML({ type: 'compose', composeId: item.id }) : ''}
      </div>`;
  }

  return `
    <div class="ds-detail-back" onclick="dsGoto('dashboard')">← Back to Dashboard</div>

    <div class="ds-panel" style="margin-top:0;">
      <span class="ds-badge primary" style="font-size:11px;margin-bottom:6px;display:inline-block;">CLIENT COMMUNICATION</span>
      <h3 style="margin:0 0 12px;color:#222;font-size:17px;">${esc(item.title)}</h3>

      <div style="font-size:14px;line-height:1.7;color:#333;margin-bottom:16px;background:#f5f5f5;padding:16px 18px;border-radius:8px;border-left:4px solid var(--ds-blue);">
        ${esc(item.scenario)}
      </div>

      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:12px;font-weight:700;color:var(--ds-muted);margin-bottom:6px;text-transform:uppercase;">Draft Email Message</label>
        <textarea id="dsComposeText" rows="6" placeholder="Dear Robert,..." style="width:100%;padding:10px 12px;border:1px solid var(--ds-line);border-radius:6px;font-size:13.5px;line-height:1.6;resize:vertical;">${r ? esc(r.text) : ''}</textarea>
      </div>

      <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;">
        <button type="button" class="ds-btn primary" onclick="dsComposeGrade('${item.id}')">Submit &amp; Check Rubric &rarr;</button>
      </div>

      ${feedback}
    </div>`;
}

function dsComposeGrade(itemId) {
  const item = DS_COMPOSE_ITEMS.find(x => x.id === itemId);
  if (!item) return;
  const textarea = document.getElementById('dsComposeText');
  const text = (textarea ? textarea.value : '').toLowerCase();

  const results = item.rubric.map(crit => {
    const match = crit.keywords.some(kw => text.includes(kw.toLowerCase()));
    return { id: crit.id, label: crit.label, required: crit.required, pass: match };
  });

  const reqFailed = results.some(r => r.required && !r.pass);
  const passed = !reqFailed && text.trim().length >= 25;
  const passedCount = results.filter(r => r.pass).length;

  dsStore.composes[itemId] = {
    text: textarea ? textarea.value : '',
    passed: passed,
    results: results,
    passedCount: passedCount,
    totalCount: results.length,
    ts: Date.now()
  };

  if (passed) dsMark('cmp:' + itemId);
  dsSave();
  if (passed) dsNotifyStepDone('cmp:' + itemId);
  dsRenderRoot();
}

/* ============================================================================
   FINAL EXAM ENGINE (D-4)
   ============================================================================ */
let dsExamTimerHandle = null;

function dsExamBuild() {
  if (dsStore.exam && !dsStore.exam.submittedAt) return; // Keep active attempt
  const items = [];
  DS_EXAM_BLUEPRINT.forEach(bp => {
    const pool = DS_EXAM_BANK.filter(b => b.category === bp.category);
    const order = dsOptionOrder('exam_pool_' + bp.category, pool.length);
    for (let i = 0; i < Math.min(bp.count, pool.length); i++) {
      items.push(pool[order[i]]);
    }
  });

  dsStore.exam = {
    items: items.map(it => it.id),
    answers: {},
    startedAt: Date.now(),
    expiresAt: Date.now() + (DS_EXAM_MINUTES * 60 * 1000),
    score: 0,
    max: 0,
    submittedAt: null
  };
  dsSave();
}

function dsExamItems() {
  if (!dsStore.exam) return [];
  return dsStore.exam.items.map(id => DS_EXAM_BANK.find(b => b.id === id)).filter(Boolean);
}

function dsExamTimeLeftLabel() {
  if (!dsStore.exam || dsStore.exam.submittedAt) return 'Completed';
  const remain = Math.max(0, Math.floor((dsStore.exam.expiresAt - Date.now()) / 1000));
  if (remain <= 0 && !dsStore.exam.submittedAt) {
    setTimeout(dsExamSubmit, 10);
    return '00:00 (Time Expired)';
  }
  const m = Math.floor(remain / 60);
  const s = remain % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function dsExamScoreItem(item) {
  const ans = dsStore.exam.answers[item.id];
  if (!ans) return 0;
  if (item.type === 'decide') {
    return ans.choice === item.correct ? (item.points || 5) : 0;
  }
  if (item.type === 'triage') {
    return ans.choice === item.rightAction ? (item.points || 5) : 0;
  }
  if (item.type === 'verify') {
    return ans.choice === item.rightOptionId ? (item.points || 5) : 0;
  }
  if (item.type === 'compose') {
    const text = (ans.text || '').toLowerCase();
    const req = item.rubric.filter(r => r.required);
    const passed = req.filter(r => r.keywords.some(kw => text.includes(kw.toLowerCase()))).length;
    return req.length ? Math.round((item.points || 10) * (passed / req.length)) : 0;
  }
  return 0;
}

function dsExamSubmit() {
  if (!dsStore.exam || dsStore.exam.submittedAt) return;
  if (dsExamTimerHandle) { clearInterval(dsExamTimerHandle); dsExamTimerHandle = null; }

  const items = dsExamItems();
  let score = 0, max = 0;
  items.forEach(item => {
    const pts = item.points || 5;
    max += pts;
    score += dsExamScoreItem(item);
  });

  dsStore.exam.score = score;
  dsStore.exam.max = max;
  dsStore.exam.submittedAt = Date.now();
  dsSave();

  /* B-7: Report exam score to SCApp core */
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  if (su && window.SCApp.setModeScore) {
    SCApp.setModeScore(su.id, 'docusign', 'exam', score, max);
  }

  dsGoto('dashboard');
}

function dsExamResetAttempt() {
  dsStore.exam = null;
  dsSave();
  dsExamBuild();
  dsState.examIndex = 0;
  dsRenderRoot();
}

function dsExamHTML() {
  if (!dsStore.exam || !dsStore.exam.startedAt) dsExamBuild();

  // Start timer ticking if active
  if (!dsExamTimerHandle && !dsStore.exam.submittedAt) {
    dsExamTimerHandle = setInterval(() => {
      const el = document.getElementById('dsExamClock');
      if (el) el.textContent = dsExamTimeLeftLabel();
      if (dsStore.exam && !dsStore.exam.submittedAt && Date.now() >= dsStore.exam.expiresAt) {
        dsExamSubmit();
      }
    }, 1000);
  }

  // If submitted, show result card
  if (dsStore.exam && dsStore.exam.submittedAt) {
    return dsExamResultHTML();
  }

  const items = dsExamItems();
  const i = Math.max(0, Math.min(dsState.examIndex || 0, items.length - 1));
  const item = items[i];
  if (!item) return '<p>No exam questions found.</p>';

  const ans = dsStore.exam.answers[item.id] || {};
  let body = '';

  if (item.type === 'decide') {
    const order = dsOptionOrder('exam_opt_' + item.id, item.options.length);
    const opts = order.map(origIdx => `
      <button type="button" class="ds-option ${ans.choice === origIdx ? 'selected' : ''}" onclick="dsExamSelectChoice('${item.id}', ${origIdx})" style="margin-bottom:8px;text-align:left;">
        ${esc(item.options[origIdx])}
      </button>`).join('');

    body = `
      <div style="font-size:14px;line-height:1.7;color:#333;margin-bottom:16px;background:#f5f5f5;padding:16px 18px;border-radius:8px;border-left:4px solid var(--ds-blue);">
        ${esc(item.situation)}
      </div>
      <div style="font-size:12.5px;font-weight:700;color:var(--ds-muted);text-transform:uppercase;margin-bottom:10px;">Select the best action:</div>
      <div>${opts}</div>`;
  } else if (item.type === 'triage') {
    const actions = ['resend', 'correct', 'void', 'none', 'report-phishing', 'escalate'];
    const btns = actions.map(act => `
      <button type="button" class="ds-option ${ans.choice === act ? 'selected' : ''}" onclick="dsExamSelectChoice('${item.id}', '${act}')" style="margin-bottom:8px;text-align:left;">
        <b>${esc(DS_TRIAGE_ACTION_LABELS[act])}</b>
      </button>`).join('');

    body = `
      <div style="font-size:14px;line-height:1.7;color:#333;margin-bottom:16px;background:#f5f5f5;padding:16px 18px;border-radius:8px;border-left:4px solid var(--ds-blue);">
        ${esc(item.situation)}
      </div>
      <div style="font-size:12.5px;font-weight:700;color:var(--ds-muted);text-transform:uppercase;margin-bottom:10px;">Choose triage action:</div>
      <div>${btns}</div>`;
  } else if (item.type === 'verify') {
    const docBtn = `<button type="button" class="ds-btn primary sm" onclick="SimEngine.viewDoc('${escAttr(item.doc)}','${escAttr(item.docTitle)}')">🔍 Open ${esc(item.docTitle)} &rarr;</button>`;
    const opts = item.options.map(opt => `
      <button type="button" class="ds-option ${ans.choice === opt.id ? 'selected' : ''}" onclick="dsExamSelectChoice('${item.id}', '${opt.id}')" style="margin-bottom:8px;text-align:left;">
        <b>${opt.id.toUpperCase()}.</b> ${esc(opt.text)}
      </button>`).join('');

    body = `
      <div style="background:#f0f4ff;border:1px solid #c5d8ff;border-radius:8px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <span style="font-size:13px;font-weight:600;color:#1a237e;">Inspect document audit log:</span>
        ${docBtn}
      </div>
      <div style="font-size:13px;background:#fafafa;padding:10px 14px;border:1px solid #e0e0e0;border-radius:6px;margin-bottom:14px;">
        <span style="font-size:11px;font-weight:700;color:var(--ds-muted);">RECORD LOG:</span> <b>${esc(item.systemValue)}</b>
      </div>
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">${esc(item.question)}</div>
      <div>${opts}</div>`;
  } else if (item.type === 'compose') {
    body = `
      <div style="font-size:14px;line-height:1.7;color:#333;margin-bottom:16px;background:#f5f5f5;padding:16px 18px;border-radius:8px;border-left:4px solid var(--ds-blue);">
        ${esc(item.situation)}
      </div>
      <label style="display:block;font-size:12px;font-weight:700;color:var(--ds-muted);margin-bottom:6px;text-transform:uppercase;">Draft Communication</label>
      <textarea rows="5" placeholder="Type your response here..." style="width:100%;padding:10px 12px;border:1px solid var(--ds-line);border-radius:6px;font-size:13px;" oninput="dsExamInputText('${item.id}', this.value)">${esc(ans.text || '')}</textarea>`;
  }

  const isLast = i === items.length - 1;
  const isAnswered = ans.choice !== undefined || (ans.text && ans.text.trim().length > 10);

  return `
    <div style="background:#002738;color:#fff;padding:12px 20px;border-radius:8px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <div><b>DocuSign VA Certification Exam</b> &middot; Question ${i + 1} of ${items.length}</div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:12.5px;color:#9fb4c9;">Time Remaining:</span>
        <span id="dsExamClock" style="font-weight:800;color:#ffc400;font-size:14px;">${dsExamTimeLeftLabel()}</span>
      </div>
    </div>

    <div class="ds-panel" style="margin-top:0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="margin:0;font-size:16px;color:#222;">${esc(item.label)}</h3>
        <span style="font-size:12px;color:var(--ds-muted);">${item.points || 5} points</span>
      </div>

      ${body}

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:16px;border-top:1px solid #eee;">
        <button type="button" class="ds-btn" ${i === 0 ? 'disabled' : ''} onclick="dsExamNav(${i - 1})">← Previous</button>
        ${isLast ?
          `<button type="button" class="ds-btn yellow" style="font-weight:800;padding:8px 22px;" onclick="dsExamSubmit()">Submit Exam 🚀</button>` :
          `<button type="button" class="ds-btn primary" onclick="dsExamNav(${i + 1})">Next Question &rarr;</button>`}
      </div>
    </div>`;
}

function dsExamSelectChoice(itemId, choice) {
  if (!dsStore.exam || dsStore.exam.submittedAt) return;
  dsStore.exam.answers[itemId] = { choice: choice, ts: Date.now() };
  dsSave();
  dsRenderRoot();
}

function dsExamInputText(itemId, text) {
  if (!dsStore.exam || dsStore.exam.submittedAt) return;
  dsStore.exam.answers[itemId] = { text: text, ts: Date.now() };
  dsSave();
}

function dsExamNav(index) {
  dsState.examIndex = index;
  dsRenderRoot();
}

function dsExamResultHTML() {
  const ex = dsStore.exam;
  if (!ex) return '<p>No exam data found.</p>';

  const items = dsExamItems();
  const pct = ex.max ? ex.score / ex.max : 0;
  const passed = pct >= DS_EXAM_PASS_PCT;

  const rows = items.map(item => {
    const got = dsExamScoreItem(item);
    const pts = item.points || 5;
    const isFull = got === pts;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;">
        <div>
          <span style="color:${isFull ? '#2e7d32' : got > 0 ? '#f57c00' : '#c62828'};font-weight:700;margin-right:8px;">${isFull ? '✓' : got > 0 ? '•' : '✗'}</span>
          <b>${esc(item.label)}</b>
        </div>
        <div style="font-weight:700;color:${isFull ? '#2e7d32' : '#555'};">${got}/${pts} pts</div>
      </div>`;
  }).join('');

  return `
    <div class="ds-detail-back" onclick="dsGoto('dashboard')">← Back to Dashboard</div>

    <div class="ds-panel" style="margin-top:0;">
      <div style="background:${passed ? '#e8f5e9' : '#ffebee'};border:1px solid ${passed ? '#a5d6a7' : '#ffcdd2'};border-radius:8px;padding:24px;text-align:center;margin-bottom:20px;">
        <h2 style="margin:0 0 6px;color:${passed ? '#2e7d32' : '#c62828'};">${passed ? '🎉 Passed DocuSign Certification!' : '❌ Did Not Pass — Score Below 75%'}</h2>
        <div style="font-size:24px;font-weight:800;color:#222;margin:10px 0;">${ex.score} / ${ex.max} (${Math.round(pct * 100)}%)</div>
        <p style="font-size:13px;color:var(--ds-muted);max-width:480px;margin:0 auto;">
          ${passed ? 'Congratulations! You have demonstrated high competency across DocuSign envelope configuration, routing, in-flight management, and security verification.' : 'Review the lessons and try the exam again to earn certification.'}
        </p>
        <div style="margin-top:16px;">
          <button type="button" class="ds-btn ${passed ? 'primary' : 'yellow'}" onclick="dsExamResetAttempt()">${passed ? 'Retake Exam' : 'Try Again &rarr;'}</button>
        </div>
      </div>

      <div class="ds-listhead" style="margin-top:16px;">
        <div><h4 style="margin:0;">Score Breakdown by Question</h4></div>
      </div>
      <div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
        ${rows}
      </div>
    </div>`;
}

/* ============================================================================
   LESSON INFRASTRUCTURE
   Wires DocuSign-specific step completion into the shared SimEngine.
   ============================================================================ */

/* Maps a step to its "done" status. The engine calls this for every step on
   every render, so it must be fast and side-effect-free. */
function dsLessonStepDone(step) {
  if (step.type === 'do') return !!dsStore.checklist[step.checklistId];
  if (step.type === 'decide') {
    const r = dsStore.scenarios[step.scenarioId];
    return !!(r && r.correct);
  }
  if (step.type === 'triage') {
    const r = dsStore.triages[step.triageId];
    return !!(r && r.correct);
  }
  if (step.type === 'verify') {
    const r = dsStore.reviews[step.reviewId];
    return !!(r && r.correct);
  }
  if (step.type === 'compose') {
    const r = dsStore.composes[step.composeId];
    return !!(r && r.passed);
  }
  if (step.type === 'configure') return !!dsStore.checklist['cfg:' + step.id];
  return false;
}

/* Human-readable label shown in the lesson detail's step list. */
function dsLessonStepLabel(step) {
  const typeLabel = { do: 'Do', decide: 'Decide', configure: 'Configure',
                      triage: 'Triage', verify: 'Verify', compose: 'Compose' };
  return (typeLabel[step.type] || step.type) + ': ' + (step.label || step.checklistId || step.scenarioId || step.triageId || step.reviewId || step.composeId || step.id || '');
}

/* Step chip: good / bad / pending. */
function dsLessonStepStatus(step) {
  if (dsLessonStepDone(step)) return 'good';
  return 'pending';
}

/* Navigate to the correct view when a step is clicked in the lesson detail. */
function dsLessonStepNavigate(step) {
  if (step.type === 'do' && step.view)       dsGoto(step.view, step.viewArg);
  else if (step.type === 'decide')           dsGoto('scenario-detail', step.scenarioId);
  else if (step.type === 'triage')           dsGoto('triage', step.triageId);
  else if (step.type === 'verify')           dsGoto('verify', step.reviewId);
  else if (step.type === 'compose')          dsGoto('compose', step.composeId);
  else if (step.type === 'configure')        dsGoto(step.view || 'new-envelope', step.viewArg);
  else dsRenderRoot();
}

/* Called from dsMark() and dsAnswerScenario() when something relevant completes. */
function dsNotifyStepDone(triggerId) {
  if (!SimEngine.walkActive()) return;
  const step = SimEngine.currentStep();
  if (!step) return;

  /* Does this trigger match the current walkthrough step? */
  let match = false;
  if (step.type === 'do' && step.checklistId === triggerId) match = true;
  if (step.type === 'decide' && triggerId === 'scenario:' + step.scenarioId) match = true;
  if (step.type === 'triage' && triggerId === 'tri:' + step.triageId) match = true;
  if (step.type === 'verify' && triggerId === 'ver:' + step.reviewId) match = true;
  if (step.type === 'compose' && triggerId === 'cmp:' + step.composeId) match = true;
  if (step.type === 'configure' && triggerId === 'cfg:' + step.id) match = true;

  if (match) SimEngine.stepCompleted();
}

/* Lesson ever-complete tracking (for gating: restarting a lesson must not re-lock later ones). */
function dsLessonEverComplete(lessonId) { return !!dsStore.lessonsDone[lessonId]; }
function dsNoteLessonComplete(lessonId) {
  if (!dsStore.lessonsDone[lessonId]) {
    dsStore.lessonsDone[lessonId] = Date.now();
    dsSave();
  }
}

/* Clears one item's progress while KEEPING firstAttempt. Restarting a lesson must not be a
   way to erase a wrong first answer and re-take it clean — the honest first-try result is
   what gets reported, so it is the one thing a restart is not allowed to touch. */
function dsResetItemState(bag, id) {
  const prev = bag[id];
  if (prev && prev.firstAttempt) bag[id] = { firstAttempt: prev.firstAttempt };
  else delete bag[id];
}

/* Undoes the world-state a lesson changes, so a replay starts from the same place the first
   run did. Progress records are cleared generically by dsResetLesson; this covers the things
   that outlive them — an envelope this lesson voided or corrected, a document it uploaded,
   a reminder it logged. Without it, restarting Lesson 5 leaves ENV-6620 already voided and
   the trainee replays a lesson whose whole premise ("stop this from being signed") is gone.
   Only lessons that actually mutate something appear here. */
const DS_LESSON_UNDO = {
  'l02-prepare-send': () => {
    // The wizard send creates an envelope override and resets the draft.
    dsClearEnvelopeOverride('ENV-2026-9041');
    dsResetWizard();
  },
  'l05-triage-actions': () => {
    // Correct / resend / void performed against the triage envelopes.
    ['ENV-2026-9041', 'ENV-2026-8812', 'ENV-2026-6620', 'ENV-2026-7734'].forEach(dsClearEnvelopeOverride);
  },
  'l10-capstone-bandeja': () => {
    DS_ENVELOPES.forEach(e => dsClearEnvelopeOverride(e.id));
  }
};

/* Removes every override recorded against one envelope, returning it to its DS_ENVELOPES
   baseline. The base data is immutable by design (see the overrides layer), so this is just
   dropping the diff on top of it. */
function dsClearEnvelopeOverride(envId) {
  if (dsStore.overrides && dsStore.overrides[envId]) delete dsStore.overrides[envId];
}

/* Clears one lesson so it can be run again. Note the deliberate consequence for items shared
   between lessons (the capstone reuses several of the earlier triage envelopes): clearing
   them also drops them from the other lesson's progress bar. That is honest — the item really
   was cleared — and it is safe, because unlocking reads lessonsDone, not live progress, so a
   lesson already finished stays finished and nothing downstream re-locks. */
function dsResetLesson(lessonId) {
  const l = SimEngine.findLesson(lessonId);
  if (!l) return;
  l.steps.forEach(step => {
    if (step.type === 'do' && step.checklistId) delete dsStore.checklist[step.checklistId];
    if (step.type === 'decide' && step.scenarioId) dsResetItemState(dsStore.scenarios, step.scenarioId);
    if (step.type === 'triage' && step.triageId) dsResetItemState(dsStore.triages, step.triageId);
    if (step.type === 'verify' && step.reviewId) dsResetItemState(dsStore.reviews, step.reviewId);
    if (step.type === 'compose' && step.composeId) dsResetItemState(dsStore.composes, step.composeId);
    if (step.type === 'configure') {
      delete dsStore.checklist['cfg:' + step.id];
      if (dsStore.configures) dsResetItemState(dsStore.configures, step.id);
    }
  });
  const undo = DS_LESSON_UNDO[lessonId];
  if (undo) undo();
  dsSave();
  simToast(`Lesson ${l.number} restarted — its steps are open again.`, { tone: 'good' });
}

/* Lesson detail HTML: the engine does most of the work; the host provides this thin wrapper. */
function dsLessonDetailHTML() {
  const id = dsState.lessonId;
  if (!id) return '<p>No lesson selected.</p>';
  return SimEngine.lessonDetailHTML(id);
}

/* ==================== BOOTSTRAP ==================== */
/* Hands the shared engine everything it cannot know on its own. Note that `lessons` is
   passed by reference to the live array, so nothing has to be re-registered when the
   curriculum changes, and `store` is a getter rather than the object itself because
   dsLoad() REPLACES dsStore wholesale on load. */
function dsInitEngine() {
  SimEngine.init({
    lessons: DS_LESSONS,
    store: () => dsStore,
    save: dsSave,
    render: dsRenderRoot,
    goHome: () => dsGoto('dashboard'),
    showLesson: (id) => { dsState.view = 'lesson'; dsState.lessonId = id; dsSyncNav(); dsRenderRoot(); },
    currentLessonId: () => dsState.lessonId,
    navigate: dsLessonStepNavigate,
    stepDone: dsLessonStepDone,
    stepLabel: dsLessonStepLabel,
    stepStatus: dsLessonStepStatus,
    /* Types whose page renders its own explanation + Continue button. */
    selfFeedbackTypes: ['decide', 'verify', 'configure', 'triage', 'compose'],
    feedbackSelector: '.ds-feedback, .sim-feedback',
    beforeStep: function () { /* no search box to unlock in DocuSign */ },
    lessonEverComplete: dsLessonEverComplete,
    noteLessonComplete: dsNoteLessonComplete,
    resetLesson: dsResetLesson,
    btnClass: 'ds-btn'
  });
}

document.addEventListener('DOMContentLoaded', function () {
  dsLoad();
  dsResetWizard();
  dsInitEngine();
  dsSyncUser();
  dsSyncNav();
  dsRenderRoot();
  /* Launch tour on first visit */
  if (!dsStore.tourSeen && window.dsTourStart) {
    setTimeout(dsTourStart, 500);
  }
});
