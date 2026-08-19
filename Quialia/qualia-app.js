/* Qualia VA Training Simulator — view engine + scenario engine.
   100% frontend, localStorage only, no connection to any real Qualia account. */

/* Small monochrome line-icon set (stroke=currentColor) so nothing falls back to color emoji glyphs. */
const QZ_ICONS = {
  overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V3"/><path d="M8 11h8M8 15h5"/></svg>',
  summary: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15 15 9"/><path d="M11 6.4 12 5.3a4 4 0 1 1 5.7 5.7L16.6 12"/><path d="M13 17.6 12 18.7a4 4 0 1 1-5.7-5.7L7.4 12"/></svg>',
  parties: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6"/><circle cx="17.5" cy="9" r="2.3"/><path d="M15.8 14.3c2.6.5 4.7 2.7 4.7 5.7"/></svg>',
  message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-4-.9L3 21l1.9-5.5a8.4 8.4 0 0 1-.9-4A8.5 8.5 0 1 1 21 11.5z"/></svg>',
  cell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 3a2 2 0 0 1-.4 2.1L8 10.3a16 16 0 0 0 6 6l1.5-1.5a2 2 0 0 1 2.1-.4c1 .4 2 .6 3 .7a2 2 0 0 1 1.7 2z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-7.4 7-12a7 7 0 0 0-14 0c0 4.6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>'
};

const QZ_LS_KEY = 'qz_va_training_v1';
const QZ_STORE_DEFAULTS = {
  checklist: {}, scenarios: {}, docStatus: {}, taskStatus: {}, reviews: {},
  overrides: {}, lessons: {}, replies: {}, tourSeen: false, exam: null
};
function qzDefaultStore() { return JSON.parse(JSON.stringify(QZ_STORE_DEFAULTS)); }
let qzStore = qzDefaultStore();
let qzState = { view: 'dashboard', orderId: null, orderTab: 'overview', deTab: 'property', threadId: null, scenarioId: null, orderFilter: '', lessonId: null, examIndex: 0 };

function qzLoad() {
  try {
    const raw = localStorage.getItem(QZ_LS_KEY);
    qzStore = raw ? Object.assign(qzDefaultStore(), JSON.parse(raw)) : qzDefaultStore();
  } catch (e) { qzStore = qzDefaultStore(); }
}
function qzSave() { localStorage.setItem(QZ_LS_KEY, JSON.stringify(qzStore)); }
function qzMark(id) {
  const alreadyDone = !!qzStore.checklist[id];
  if (!alreadyDone) {
    qzStore.checklist[id] = true;
    qzSave();
  }
  // Normally re-marking an already-done item is a silent no-op, that's what keeps repeatable
  // actions (like typing in the search box) from spamming a toast on every keystroke. But if
  // the walkthrough is actively showing this exact step, it needs to hear about it regardless,
  // the trainee may have completed this checklist item in an earlier session/attempt, and the
  // walkthrough always starts a lesson at step 0 without skipping steps already done, redoing
  // the action must still be able to advance it instead of going silently unheard.
  const step = (typeof qzWalk !== 'undefined' && qzWalk) ? qzWalkCurrentStep() : null;
  const walkActiveOnThis = step && step.type === 'do' && step.checklistId === id;
  if (!alreadyDone || walkActiveOnThis) qzNotifyStepDone(id);
}
/* Instant "step done" feedback when the completed checklist id belongs to a step of the
   lesson currently being worked (qzState.lessonId) — no-op outside a lesson context.
   If an interactive walkthrough is actively showing this exact step, let it own the
   feedback (its tip card shows the checkmark and auto-advances) instead of a toast. */
function qzNotifyStepDone(checklistId) {
  if (!qzState.lessonId || typeof QZ_LESSONS === 'undefined') return;
  const l = QZ_LESSONS.find(x => x.id === qzState.lessonId);
  if (!l) return;
  const step = l.steps.find(s => s.type === 'do' && s.checklistId === checklistId);
  if (!step) return;

  if (typeof qzWalk !== 'undefined' && qzWalk && qzWalk.lessonId === l.id && l.steps[qzWalk.stepIndex] === step) {
    qzWalkStepDone();
    return;
  }

  const label = qzLessonStepLabel(step);
  const prog = qzLessonProgress(l);
  if (prog.complete) qzToast(`Lesson ${l.number} complete! Use the banner above to head back and unlock the next lesson.`, { tone: 'good', duration: 5000 });
  else qzToast(`"${label}" done, ${prog.done} of ${prog.total} steps in Lesson ${l.number}.`, { tone: 'good' });
  qzRenderLessonBanner();
}
function qzResetProgress() { localStorage.removeItem(QZ_LS_KEY); }

function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function escAttr(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtMoney(n) { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(iso) {
  if (!iso || iso === '—') return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ---------- non-blocking toast (replaces alert()) ---------- */
function qzToast(msg, opts) {
  const host = document.getElementById('qzToastHost');
  if (!host) { return; }
  const el = document.createElement('div');
  el.className = 'qz-toast' + (opts && opts.tone ? ' ' + opts.tone : '');
  el.textContent = msg; // textContent, not innerHTML — no HTML-escaping needed or wanted here
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const duration = (opts && opts.duration) || 3200;
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, duration);
}

/* ---------- data lookups (respect in-session overrides) ---------- */
function qzDocsForOrder(orderId) { return QZ_DOCUMENTS.filter(d => d.orderId === orderId).concat(typeof QZ_EXAM_DOCUMENTS !== 'undefined' ? QZ_EXAM_DOCUMENTS.filter(d => d.orderId === orderId) : []); }
function qzDocStatus(d) { return qzStore.docStatus[d.id] || d.status; }
function qzTasksForOrder(orderId) { return QZ_TASKS.filter(t => t.relatedOrderId === orderId); }
function qzTaskStatus(t) { return qzStore.taskStatus[t.id] || t.status; }

/* ---------- per-order override layer (persists edits made in Data Entry / Review) ---------- */
function qzBaseOrder(orderId) {
  return QZ_ORDERS.find(o => o.id === orderId) || (typeof QZ_EXAM_ORDER !== 'undefined' && QZ_EXAM_ORDER.id === orderId ? QZ_EXAM_ORDER : null);
}
function qzOverrideOrder(orderId) { return qzStore.overrides[orderId] || {}; }
function qzAllOrders() { return QZ_ORDERS.map(o => qzGetOrder(o.id)); }
function qzGetOrder(orderId) {
  const base = qzBaseOrder(orderId);
  if (!base) return null;
  const ov = qzOverrideOrder(orderId);
  if (!ov.scalars && !ov.parties) return base;
  const merged = Object.assign({}, base, ov.scalars || {});
  merged.parties = base.parties.map(p => {
    const po = ov.parties && ov.parties[p.role];
    return po ? Object.assign({}, p, po) : p;
  });
  return merged;
}
function qzSetPartyOverride(orderId, role, patch) {
  const ov = qzStore.overrides[orderId] = qzStore.overrides[orderId] || {};
  ov.parties = ov.parties || {};
  ov.parties[role] = Object.assign({}, ov.parties[role], patch);
  qzSave();
}
function qzSetScalarOverride(orderId, field, value) {
  const ov = qzStore.overrides[orderId] = qzStore.overrides[orderId] || {};
  ov.scalars = ov.scalars || {};
  ov.scalars[field] = value;
  qzSave();
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
  qzUpdateBellBadge();
  if (!qzStore.tourSeen && window.qzTourStart) setTimeout(qzTourStart, 350);
}

/* ---------- notification bell ---------- */
function qzOpenTasks() { return QZ_TASKS.filter(t => qzTaskStatus(t) !== 'Complete'); }
function qzUpdateBellBadge() {
  const badge = document.querySelector('#qzBell .n');
  if (badge) badge.textContent = qzOpenTasks().length;
}
function qzToggleBellDropdown(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById('qzBellDropdown');
  if (!dd) return;
  const opening = !dd.classList.contains('open');
  if (opening) qzRenderBellDropdown();
  dd.classList.toggle('open', opening);
}
function qzCloseBellDropdown() {
  const dd = document.getElementById('qzBellDropdown');
  if (dd) dd.classList.remove('open');
}
document.addEventListener('click', () => qzCloseBellDropdown());
function qzRenderBellDropdown() {
  const dd = document.getElementById('qzBellDropdown');
  if (!dd) return;
  const open = qzOpenTasks();
  if (!open.length) { dd.innerHTML = '<div class="qz-bell-empty">No open tasks</div>'; return; }
  const groups = {};
  open.forEach(t => { (groups[t.relatedOrderId] = groups[t.relatedOrderId] || []).push(t); });
  dd.innerHTML = Object.keys(groups).map(orderId => {
    const o = qzGetOrder(orderId);
    const label = o ? o.propertyAddress : orderId;
    const items = groups[orderId].map(t =>
      `<div class="qz-bell-item" onclick="qzGotoOrderTasks('${escAttr(orderId)}')"><span class="t">${esc(t.title)}</span><span class="d">${fmtDate(t.dueDate)}</span></div>`
    ).join('');
    return `<div class="qz-bell-group"><div class="qz-bell-group-h">${esc(label)}</div>${items}</div>`;
  }).join('');
}
function qzGotoOrderTasks(orderId) {
  qzState.view = 'order';
  qzState.orderId = orderId;
  qzState.orderTab = 'tasks';
  qzMark('orders-open');
  qzSyncTopTabs();
  qzRenderRoot();
  qzCloseBellDropdown();
}

/* ---------- top-level navigation ---------- */
function qzGoto(view) {
  qzState.view = view;
  qzState.orderId = null;
  qzState.lessonId = null;
  if (qzWalk) qzWalkExit(true);
  qzSyncTopTabs();
  qzRenderRoot();
}
function qzSyncTopTabs() {
  document.querySelectorAll('#qzTopbar .qz-tabs span[data-view]').forEach(el => {
    const v = el.dataset.view;
    const active = v === qzState.view || (v === 'orders' && qzState.view === 'order')
      || (v === 'dashboard' && (qzState.view === 'scenario' || qzState.view === 'lesson' || qzState.view === 'exam'));
    el.classList.toggle('active', active);
  });
}
/* Lives in its own persistent DOM node (#qzLessonBanner, outside #qzRoot) so it can be
   refreshed the instant a step completes without a full re-render, this matters when a
   step fires mid-keystroke (the Orders search box patches its own row list in place and
   skips qzRenderRoot to avoid losing input focus). */
function qzLessonBreadcrumbHTML() {
  if (!qzState.lessonId || qzState.view === 'lesson' || qzState.view === 'dashboard' || qzState.view === 'exam') return '';
  const l = QZ_LESSONS.find(x => x.id === qzState.lessonId);
  if (!l) return '';
  const prog = qzLessonProgress(l);
  const label = prog.complete ? `Lesson ${l.number} complete!` : `Lesson ${l.number} &middot; ${prog.done} of ${prog.total} steps done`;
  return `<div class="qz-lesson-banner ${prog.complete ? 'done' : ''}" onclick="qzOpenLesson('${l.id}')">${label} &middot; Back to Lesson &rarr;</div>`;
}
function qzRenderLessonBanner() {
  const el = document.getElementById('qzLessonBanner');
  if (el) el.innerHTML = qzLessonBreadcrumbHTML();
}
function qzRenderRoot() {
  const root = document.getElementById('qzRoot');
  let html = '';
  if (qzState.view === 'dashboard') html = qzDashboardHTML();
  else if (qzState.view === 'orders') html = qzOrdersHTML();
  else if (qzState.view === 'order') html = qzOrderHTML();
  else if (qzState.view === 'scenario') html = qzScenarioDetailHTML();
  else if (qzState.view === 'lesson') html = qzLessonDetailHTML();
  else if (qzState.view === 'exam') html = qzExamHTML();
  root.innerHTML = qzExamActiveBannerHTML() + html;
  qzRenderLessonBanner();
}

/* ---------- lessons: gating (always derived, never stored) ---------- */
function qzLessonStepDone(step) {
  if (step.type === 'do') return !!qzStore.checklist[step.checklistId];
  if (step.type === 'verify') { const s = qzStore.reviews[step.reviewId]; return !!(s && s.correct); }
  if (step.type === 'decide') { const s = qzStore.scenarios[step.scenarioId]; return !!(s && s.correct); }
  return false;
}
function qzLessonProgress(lesson) {
  const total = lesson.steps.length;
  const done = lesson.steps.filter(qzLessonStepDone).length;
  return { done, total, complete: total > 0 && done === total };
}
function qzLessonState(index) {
  if (index === 0) return qzLessonProgress(QZ_LESSONS[0]).complete ? 'done' : 'unlocked';
  const prevComplete = qzLessonProgress(QZ_LESSONS[index - 1]).complete;
  if (!prevComplete) return 'locked';
  return qzLessonProgress(QZ_LESSONS[index]).complete ? 'done' : 'unlocked';
}

/* Maps a `do` step's checklistId to where it lives in the order shell. */
const QZ_CHECKLIST_TAB = {
  'de-property': { tab: 'dataentry', deTab: 'property' },
  'de-parties': { tab: 'dataentry', deTab: 'parties' },
  'de-transaction': { tab: 'dataentry', deTab: 'transaction' },
  'de-edit': { tab: 'dataentry', deTab: 'parties' },
  'docs-upload': { tab: 'documents' },
  'docs-download': { tab: 'documents' },
  'docs-review': { tab: 'documents' },
  'tasks-open': { tab: 'tasks' },
  'tasks-complete': { tab: 'tasks' },
  'workflow-view': { tab: 'workflow' },
  'comm-open': { tab: 'communication' },
  'comm-reply': { tab: 'communication' },
  'comm-followup': { tab: 'communication' },
  'vendors-open': { tab: 'vendors' },
  'vendors-check': { tab: 'vendors' },
  'closing-open': { tab: 'closing' },
  'closing-review': { tab: 'closing' },
  'accounting-open': { tab: 'accounting' }
};
function qzLessonStepNavigate(step) {
  if (step.type === 'do') {
    if (step.checklistId.indexOf('orders-') === 0) {
      qzState.view = 'orders';
      qzState.orderId = null;
      qzSyncTopTabs();
      qzRenderRoot();
      return;
    }
    const nav = QZ_CHECKLIST_TAB[step.checklistId];
    if (!nav) return;
    qzState.view = 'order';
    qzState.orderId = step.orderId || 'ORD-2026-1483';
    qzState.orderTab = nav.tab;
    qzState.deTab = nav.deTab || 'property';
    qzState.threadId = null;
    qzMark('orders-open');
    qzSyncTopTabs();
    qzRenderRoot();
  } else if (step.type === 'verify') {
    const r = qzReviewLookup(step.reviewId);
    if (!r) return;
    qzState.view = 'order';
    qzState.orderId = r.orderId;
    qzState.orderTab = 'review';
    qzMark('orders-open');
    qzSyncTopTabs();
    qzRenderRoot();
  } else if (step.type === 'decide') {
    qzOpenScenario(step.scenarioId);
  }
}
function qzLessonStepLabel(step) {
  if (step.type === 'do') {
    for (const key in QZ_CHECKLISTS) {
      const it = QZ_CHECKLISTS[key].items.find(i => i.id === step.checklistId);
      if (it) return it.label;
    }
    return step.checklistId;
  }
  if (step.type === 'verify') { const r = qzReviewLookup(step.reviewId); return r ? 'Verify: ' + r.label : step.reviewId; }
  if (step.type === 'decide') { const s = QZ_SCENARIOS.find(x => x.id === step.scenarioId); return s ? s.title : step.scenarioId; }
}
function qzLessonStepStatus(step) {
  if (step.type === 'do') return qzLessonStepDone(step) ? 'good' : 'pending';
  if (step.type === 'verify') { const s = qzStore.reviews[step.reviewId]; if (!s || !s.resolvedAt) return 'pending'; return s.correct ? 'good' : 'bad'; }
  if (step.type === 'decide') { const s = qzStore.scenarios[step.scenarioId]; if (!s || s.answered == null) return 'pending'; return s.correct ? 'good' : 'bad'; }
}
const QZ_STEP_STATUS_LABEL = { good: 'Done', bad: 'Try again', pending: 'Not yet' };
function qzOpenLesson(id) {
  const idx = QZ_LESSONS.findIndex(l => l.id === id);
  if (idx === -1 || qzLessonState(idx) === 'locked') return;
  qzState.view = 'lesson';
  qzState.lessonId = id;
  qzSyncTopTabs();
  qzRenderRoot();
}
function qzLessonStepGo(lessonId, stepIndex) {
  const l = QZ_LESSONS.find(x => x.id === lessonId);
  if (!l) return;
  qzLessonStepNavigate(l.steps[stepIndex]);
}
/* Shown next to a `decide`/`verify` step's own feedback once it's answered correctly, so
   there's an explicit way forward instead of "Retake"/"Redo" being the only visible button. */
function qzLessonContinueHTML(step) {
  if (!qzState.lessonId) return '';
  const l = QZ_LESSONS.find(x => x.id === qzState.lessonId);
  if (!l) return '';
  const idx = l.steps.indexOf(step);
  if (idx === -1) return '';
  const label = idx < l.steps.length - 1 ? 'Continue to next step &rarr;' : 'Finish Lesson &rarr;';
  return `<button class="qz-btn sm primary" onclick="qzLessonContinue('${l.id}',${idx})">${label}</button>`;
}
/* If an active walkthrough is showing this exact step, skip its own ~1s "nice, moving on"
   pause instead of navigating separately, the trainee already said they're ready by
   clicking. Otherwise (no walkthrough, or a manual visit) navigate directly. */
function qzLessonContinue(lessonId, stepIndex) {
  if (typeof qzWalk !== 'undefined' && qzWalk && qzWalk.lessonId === lessonId && qzWalk.stepIndex === stepIndex) {
    qzWalkSkipWait();
    return;
  }
  const l = QZ_LESSONS.find(x => x.id === lessonId);
  if (!l) return;
  const next = l.steps[stepIndex + 1];
  if (next) qzLessonStepNavigate(next);
  else qzGoto('dashboard');
}
function qzLessonDetailHTML() {
  const l = QZ_LESSONS.find(x => x.id === qzState.lessonId);
  if (!l) return '<p>Lesson not found.</p>';
  const prog = qzLessonProgress(l);
  const walkable = l.steps.every(s => s.walk);
  const rows = l.steps.map((step, i) => {
    const status = qzLessonStepStatus(step);
    const goBtn = step.walk ? '' : `<button class="qz-btn sm" onclick="qzLessonStepGo('${l.id}',${i})">Go</button>`;
    return `<div class="qz-lesson-step-row">
      <span class="qz-rv-chip ${status}">${QZ_STEP_STATUS_LABEL[status]}</span>
      <span class="label">${esc(qzLessonStepLabel(step))}</span>
      ${goBtn}
    </div>`;
  }).join('');
  const tryBtn = (walkable && !prog.complete)
    ? `<button class="qz-btn primary" style="margin-bottom:16px" onclick="qzWalkStart('${l.id}')">Try It &rarr;</button>`
    : '';
  return `<span class="qz-back" onclick="qzGoto('dashboard')">&larr; Dashboard</span>
    <div class="qz-panel qz-lesson-detail">
      <div class="ph"><h4>Lesson ${l.number} &middot; ${esc(l.title)}</h4></div>
      <p class="situation">${esc(l.summary)}</p>
      ${tryBtn}
      <div class="qz-lesson-steps">${rows}</div>
      ${prog.complete ? '<div class="qz-rv-feedback good"><b>Lesson complete.</b> The next lesson is unlocked from the Dashboard.</div>' : ''}
    </div>`;
}

/* ---------- Interactive lesson walkthrough (generic engine) ----------
   Unlike the intro tour (qualia-tour.js), the app stays fully interactive underneath —
   the overlay itself is pointer-events:none, only the tip card can be clicked. The
   trainee performs the real action while a floating highlight + instruction card points
   at exactly what to do; qzNotifyStepDone() (called from qzMark) detects completion and
   advances automatically. Content lives on QZ_LESSONS[].steps[].walk (target/text/setup). */
let qzWalk = null; // { lessonId, stepIndex, tourIndex }
function qzWalkStart(lessonId) {
  const l = QZ_LESSONS.find(x => x.id === lessonId);
  if (!l || !l.steps.every(s => s.walk)) return;
  qzWalk = { lessonId, stepIndex: 0, tourIndex: null, stepDoneFired: false };
  qzWalkShowCurrent();
}
function qzWalkCurrentLesson() { return qzWalk ? QZ_LESSONS.find(x => x.id === qzWalk.lessonId) : null; }
function qzWalkCurrentStep() {
  const l = qzWalkCurrentLesson();
  return l ? l.steps[qzWalk.stepIndex] : null;
}
function qzWalkShowCurrent() {
  document.getElementById('qzWalk').classList.add('open');
  qzWalk.tourIndex = null;
  qzWalk.stepDoneFired = false;
  // Default unlocked, a step that specifically needs the search box locked (see l01's
  // orders-open) re-locks it in its own setup() below, this just guarantees it doesn't stay
  // locked once that step is behind us.
  qzWalkUnlockSearchInput();
  const step = qzWalkCurrentStep();
  if (!step) { qzWalkShowComplete(); return; }
  if (step.walk.setup) step.walk.setup();
  if (step.walk.skipClick) qzWalkRenderSkipClick(step); else qzWalkRenderTip(step, false);
  requestAnimationFrame(() => requestAnimationFrame(() => qzWalkPosition(step, { scrollIntoView: true })));
}
/* For a `do` step that's purely explanatory (e.g. "this is the Upload button") where nothing
   real would actually happen if clicked in this simulator, walk.nextAction runs the same
   underlying function a real click would (so any state it changes still happens, keeping
   later steps consistent), triggered by a "Next" button in the tip instead of requiring the
   trainee to click the real element, which is still highlighted so they know what it is. */
function qzWalkRenderSkipClick(step) {
  const l = qzWalkCurrentLesson();
  const text = typeof step.walk.text === 'function' ? step.walk.text() : step.walk.text;
  qzWalkSetTipBody(`<b>Lesson ${l.number} &middot; Step ${qzWalk.stepIndex + 1} of ${l.steps.length}</b><p>${esc(text)}</p>
    <button class="qz-btn primary" style="margin-top:10px" onclick="qzWalkRunNextAction()">Next &rarr;</button>
    <div class="qz-walk-exit" onclick="qzWalkExit()">Exit walkthrough</div>`);
}
function qzWalkRunNextAction() {
  const step = qzWalkCurrentStep();
  if (!step || !step.walk.nextAction) return;
  step.walk.nextAction();
}
/* One dot per step in the current lesson, filled for done, ringed for the one in progress,
   hollow for anything still ahead, persistent across every view the walkthrough passes
   through so there's always a sense of "point 2 of 6", not just a wall of content. */
function qzWalkDotsHTML() {
  const l = qzWalkCurrentLesson();
  if (!l) return '';
  const dots = l.steps.map((s, i) => {
    const cls = i === qzWalk.stepIndex ? 'current' : (qzLessonStepDone(s) ? 'done' : '');
    return `<span class="qz-walk-dot ${cls}"></span>`;
  }).join('');
  return `<div class="qz-walk-dots">${dots}</div>`;
}
function qzWalkSetTipBody(html) {
  document.getElementById('qzWalkTipBody').innerHTML = qzWalkDotsHTML() + html;
}
function qzWalkRenderTip(step, done) {
  const l = qzWalkCurrentLesson();
  if (done) {
    qzWalkSetTipBody(`<b>&#10003; Nice.</b><p>Moving to the next step&hellip;</p>`);
  } else {
    const text = typeof step.walk.text === 'function' ? step.walk.text() : step.walk.text;
    // Optional, collapsed by default: a step whose target is a free-text field (e.g. the
    // Communication reply box) can carry its own example right in the tip, where the trainee
    // is already looking, instead of a link elsewhere on the page that the tip itself
    // usually ends up covering.
    const example = typeof step.walk.example === 'function' ? step.walk.example() : step.walk.example;
    const exampleHTML = example
      ? `<button type="button" class="qz-walk-example-toggle" id="qzWalkExampleToggle" onclick="qzWalkToggleExample()">See example &rarr;</button>
         <div class="qz-walk-example" id="qzWalkExampleBox" style="display:none">${esc(example)}</div>`
      : '';
    qzWalkSetTipBody(`<b>Lesson ${l.number} &middot; Step ${qzWalk.stepIndex + 1} of ${l.steps.length}</b><p>${esc(text)}</p>${exampleHTML}
      <div class="qz-walk-exit" onclick="qzWalkExit()">Exit walkthrough</div>`);
  }
}
/* Toggling the example changes the tip's height, without recomputing position afterward the
   card's top/left stay wherever they were calculated for the shorter version, letting the
   now-taller card run off the bottom of the viewport instead of the whole thing staying visible. */
function qzWalkToggleExample() {
  const el = document.getElementById('qzWalkExampleBox');
  const btn = document.getElementById('qzWalkExampleToggle');
  if (!el) return;
  const showing = el.style.display !== 'none';
  el.style.display = showing ? 'none' : 'block';
  if (btn) btn.textContent = showing ? 'See example →' : 'Hide example';
  const step = qzWalkCurrentStep();
  if (step) qzWalkPosition(step);
}
/* Wrong answer on a `decide` step or a `verify` item: don't advance, don't reveal the
   answer, just point the trainee back at the feedback + retry control the page already
   shows (custom msg lets `verify` steps say "Redo" instead of "Try Again"). */
function qzWalkRenderRetry(msg) {
  qzWalkSetTipBody(`<b>Not quite.</b><p>${msg || 'Read the explanation below, then click "Try Again" to retry this scenario.'}</p>
    <div class="qz-walk-exit" onclick="qzWalkExit()">Exit walkthrough</div>`);
  qzWalkScrollFeedbackIntoView();
}
/* decide/verify steps float their tip (no highlight, target is null / whole page is the
   content), so unlike do/verify-with-a-real-target steps, nothing was bringing the feedback
   panel (with the Continue/Try Again/Redo button the trainee actually needs to click) into
   view, it could render below the fold with no indication it was even there. */
function qzWalkScrollFeedbackIntoView() {
  requestAnimationFrame(() => {
    const el = document.querySelector('.qz-feedback, .qz-rv-feedback');
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}
/* Four different "what happens after a correct answer" behaviors, depending on the step:
   1. walk.tour set (e.g. workflow-view) — a real UI panel just appeared with several parts
      worth pointing out (the stage marker, the status text, the read-only note), so instead
      of one blob of text this walks through them one at a time, each with its own highlight,
      before moving on to the next lesson step.
   2. walk.pauseText set — a single explanation (built from live order data) with a Continue
      click, for steps that need context but only have one thing to point at.
   3. decide/verify steps — these already render their own explanation + a "Continue to next
      step" button on the page (qzLessonContinueHTML), auto-advancing here would yank the
      trainee away before they get to read it, so this just waits for that button instead.
   4. everything else (plain `do` clicks with nothing to read) — short "Nice" pause, then
      auto-advance, unchanged from before. */
function qzWalkStepDone() {
  const step = qzWalkCurrentStep();
  if (!step) return;
  // Guards against firing more than once per step instance: a repeatable trigger (typing in
  // the search box fires on every keystroke, and a loose substring match can satisfy the
  // target on more than one of them) could otherwise queue up several independent advances
  // that each fire their own delayed qzWalkAdvance(), skipping past whatever step comes next.
  if (qzWalk.stepDoneFired) return;
  qzWalk.stepDoneFired = true;
  const exitLink = '<div class="qz-walk-exit" onclick="qzWalkExit()">Exit walkthrough</div>';
  if (step.walk.tour && step.walk.tour.length) {
    qzWalk.tourIndex = 0;
    qzWalkShowTourStop();
    return;
  }
  if (step.walk.pauseText) {
    const text = typeof step.walk.pauseText === 'function' ? step.walk.pauseText() : step.walk.pauseText;
    qzWalkSetTipBody(`<b>&#10003; Nice.</b><p>${esc(text)}</p>
      <button class="qz-btn primary" style="margin-top:10px" onclick="qzWalkAdvance()">Continue &rarr;</button>${exitLink}`);
    return;
  }
  if (step.type === 'decide' || step.type === 'verify') {
    qzWalkSetTipBody(`<b>&#10003; Correct.</b><p>Read the explanation below, then click "Continue to next step" when you're ready.</p>${exitLink}`);
    qzWalkScrollFeedbackIntoView();
    return;
  }
  qzWalkRenderTip(step, true);
  qzWalk.doneTimer = setTimeout(() => {
    qzWalk.doneTimer = null;
    qzWalkAdvance();
  }, 900);
}
/* Renders the current stop of an in-step tour (walk.tour[]): its own text + its own
   highlighted target, with Next/Continue advancing through the array before finally moving
   on to the next lesson step via qzWalkAdvance(). */
function qzWalkShowTourStop() {
  const step = qzWalkCurrentStep();
  const stops = step.walk.tour;
  const stop = stops[qzWalk.tourIndex];
  const isLast = qzWalk.tourIndex === stops.length - 1;
  const text = typeof stop.text === 'function' ? stop.text() : stop.text;
  const exitLink = '<div class="qz-walk-exit" onclick="qzWalkExit()">Exit walkthrough</div>';
  qzWalkSetTipBody(`<b>${qzWalk.tourIndex + 1} of ${stops.length}</b><p>${esc(text)}</p>
    <button class="qz-btn primary" style="margin-top:10px" onclick="qzWalkTourNext()">${isLast ? 'Continue' : 'Next'} &rarr;</button>${exitLink}`);
  requestAnimationFrame(() => requestAnimationFrame(() => qzWalkPosition({ walk: { target: stop.target } }, { scrollIntoView: true })));
}
function qzWalkTourNext() {
  const step = qzWalkCurrentStep();
  const stops = step.walk.tour;
  if (qzWalk.tourIndex < stops.length - 1) {
    qzWalk.tourIndex++;
    qzWalkShowTourStop();
  } else {
    qzWalk.tourIndex = null;
    qzWalkAdvance();
  }
}
function qzWalkAdvance() {
  if (!qzWalk) return; // walkthrough may have been exited during the pause
  qzWalk.stepIndex++;
  qzWalkShowCurrent();
}
/* Lets the "Continue to next step" button (qzLessonContinue) skip the ~1s pause qzWalkStepDone
   normally shows before advancing, instead of doubling up with the pending timer. */
function qzWalkSkipWait() {
  if (!qzWalk) return;
  if (qzWalk.doneTimer) { clearTimeout(qzWalk.doneTimer); qzWalk.doneTimer = null; }
  qzWalkAdvance();
}
/* Keeps the orders-search step's tip text live as the trainee types, so a query that
   doesn't surface Order ORD-2026-1483 says so immediately instead of staying silent. */
/* Covers both search-adjacent steps: orders-search itself, and orders-open's fallback in
   case the row it points at ever disappears (normally prevented by locking the search box
   during that step, this is the safety net for anything that slips past that). Unlike the
   search step, orders-open's target can change (row vs. fallback to the input), so this
   also repositions, not just re-renders the text. */
function qzWalkSyncSearchStep() {
  if (typeof qzWalk === 'undefined' || !qzWalk) return;
  const step = qzWalkCurrentStep();
  if (!step || step.type !== 'do') return;
  if (step.checklistId !== 'orders-search' && step.checklistId !== 'orders-open') return;
  qzWalkRenderTip(step, false);
  qzWalkPosition(step);
}
/* Same idea as qzWalkSyncSearchStep/qzWalkSyncEditStep: the comm-reply step's target moves
   from the textarea to the Send button once there's 20+ characters typed, but nothing was
   re-checking that while the trainee was actually typing, only on the next unrelated
   reposition (resize/scroll), so the highlight sat on the box well past the point it should
   have moved. */
function qzWalkSyncReplyStep() {
  if (typeof qzWalk === 'undefined' || !qzWalk) return;
  const step = qzWalkCurrentStep();
  if (!step || step.type !== 'do' || step.checklistId !== 'comm-reply') return;
  qzWalkRenderTip(step, false);
  qzWalkPosition(step);
}
/* A `verify` lesson step maps to the 4-step discrepancy-report engine, which has its own
   internal sub-phases (open doc / answer source / answer action / correct or escalate).
   Called after every sub-phase action so the tip text and highlight track the trainee's
   progress inside the item, not just the outer lesson step. No-op unless the walkthrough
   is currently showing this exact `verify` step. */
function qzWalkSyncVerifyStep(reviewId) {
  if (typeof qzWalk === 'undefined' || !qzWalk) return;
  const step = qzWalkCurrentStep();
  if (!step || step.type !== 'verify' || step.reviewId !== reviewId) return;
  qzWalkRenderTip(step, false);
  qzWalkPosition(step, { scrollIntoView: true });
}
/* Generic target/text resolvers for a `verify` lesson step, reused by every lesson that
   walks a discrepancy-report item (rev-1483-buyer, rev-1483-price, rev-1483-vesting, ...).
   All copy comes from the review's own data, so nothing here is lesson-specific. While
   the source document modal is open (z-index above the walk overlay, by design) the
   highlight is suppressed and the tip just floats with a "close it to continue" nudge. */
function qzWalkVerifyTarget(reviewId) {
  const st = qzRevGet(reviewId);
  if (document.getElementById('qzDocModal').classList.contains('open')) return null;
  const scope = `.qz-rv-item[data-rev-id="${reviewId}"]`;
  if (st.resolvedAt) return st.correct ? null : scope + ' .qz-rv-feedback button';
  if (!st.docOpened) return scope + ' [data-rev-phase="1"] button';
  if (!st.step2Choice) return scope + ' [data-rev-phase="2"]';
  if (!st.step2Correct) return scope + ' [data-rev-phase="2"] .qz-rv-actions button';
  if (!st.step3Choice) return scope + ' [data-rev-phase="3"]';
  if (!st.step3Correct) return scope + ' [data-rev-phase="3"] .qz-rv-actions button';
  if (st.step4Category && !st.step4CategoryCorrect) return scope + ' [data-rev-phase="4"] select';
  return scope + ' [data-rev-phase="4"]';
}
function qzWalkVerifyText(reviewId) {
  const r = qzReviewLookup(reviewId);
  const st = qzRevGet(reviewId);
  if (document.getElementById('qzDocModal').classList.contains('open')) return `Read the ${r.docTitle}, then close it to come back and report what you found.`;
  if (st.resolvedAt) return 'Read the explanation below, then click "Redo" to try again.';
  if (!st.docOpened) return `Open the ${r.docTitle} to compare it against "${r.label}."`;
  if (!st.step2Choice) return 'Now pick what the source document actually says.';
  if (!st.step2Correct) return 'Not quite, click "Try again" and look at the document once more.';
  if (!st.step3Choice) return "Pick the right next step: does this need a correction, or does it need escalating?";
  if (!st.step3Correct) return 'Not quite, click "Try again" and reconsider the right next step.';
  if (st.step3Choice === 'correct') return 'Type the corrected value exactly as the source document shows it, then click "Save correction."';
  if (st.step4Category && !st.step4CategoryCorrect) return 'Not quite — pick a different category and submit again.';
  return 'Choose the escalation category that fits, then submit.';
}
/* Escalation-note example, shown inside the walkthrough tip (not on the page itself) while
   Step 4's note field is the active thing to fill in, same "See example" mechanism as any
   other walk.example. Returns null once the item is resolved or has no example to offer. */
function qzWalkVerifyExample(reviewId) {
  const r = qzReviewLookup(reviewId);
  if (!r.noteExample) return null;
  const st = qzRevGet(reviewId);
  if (st.resolvedAt) return null;
  if (st.step3Choice && st.step3Correct && st.step3Choice.indexOf('escalate') === 0) return r.noteExample;
  return null;
}
/* Resolves a step's target: a plain CSS selector string, a function returning an
   Element/selector/null (for steps where WHAT to highlight changes as the trainee acts,
   e.g. "type here" then "click Save once it appears"), or null/undefined. */
function qzWalkResolveTarget(target) {
  let t = typeof target === 'function' ? target() : target;
  if (!t) return null;
  if (typeof t === 'string') t = document.querySelector(t);
  return (t && t.getBoundingClientRect && t.offsetParent !== null) ? t : null;
}
function qzWalkPosition(step, opts) {
  const highlight = document.getElementById('qzWalkHighlight');
  const tip = document.getElementById('qzWalkTip');
  // The doc modal (z-index 200) sits below the walk overlay (z-index 250) on purpose, so the
  // tip can float above it with a "close it to continue" nudge, but that means a highlight
  // pointing anywhere other than the modal would visually darken/obscure it via the
  // highlight's giant cutout box-shadow. Suppress the highlight whenever the modal is open,
  // regardless of which step/target logic is in play.
  const docModal = document.getElementById('qzDocModal');
  const el = (docModal && docModal.classList.contains('open')) ? null : qzWalkResolveTarget(step.walk.target);
  // skipClick steps are demonstrative only ("here's the button, nothing to actually upload in
  // this practice") — the real element stays highlighted for reference but must not be
  // clickable, or the trainee could trigger the real action directly instead of via Next.
  if (el && step.walk.skipClick && 'disabled' in el) el.disabled = true;
  // Only on step/phase transitions (never on resize/scroll reposition calls, that would
  // fight the trainee's own scrolling): bring the target into view if the review tab's
  // item list has pushed it below the fold, the highlight rect below is computed from
  // wherever the element ends up, the .qz-body scroll listener keeps it in sync while the
  // scroll animates.
  if (el && opts && opts.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const rect = el ? el.getBoundingClientRect() : null;
  tip.style.transform = 'none';
  if (!rect) {
    // No single element to point at (e.g. a `decide` step, the whole page is the content) —
    // float the tip in a fixed corner instead of leaving it stale from the previous step.
    // Bottom, not top: a freshly-opened scenario/review loads with its situation + options
    // right at the top of the panel, a top-right tip would sit directly on top of them and
    // silently eat the trainee's click (the tip itself is pointer-events:auto). Anchoring to
    // the bottom keeps clear of that content instead.
    highlight.style.opacity = '0';
    const margin = 18;
    tip.style.top = 'auto';
    tip.style.bottom = margin + 'px';
    tip.style.left = (window.innerWidth - 300 - margin) + 'px';
    return;
  }
  highlight.style.opacity = '1';
  tip.style.bottom = 'auto';
  const pad = 8;
  highlight.style.top = (rect.top - pad) + 'px';
  highlight.style.left = (rect.left - pad) + 'px';
  highlight.style.width = (rect.width + pad * 2) + 'px';
  highlight.style.height = (rect.height + pad * 2) + 'px';

  const tipW = 300, tipH = tip.offsetHeight || 140, margin = 14;
  let top = rect.bottom + pad + margin;
  if (top + tipH > window.innerHeight - margin) top = Math.max(margin, rect.top - pad - margin - tipH);
  const left = Math.min(Math.max(margin, rect.left), window.innerWidth - tipW - margin);
  tip.style.top = top + 'px';
  tip.style.left = left + 'px';
}
function qzWalkShowComplete() {
  const l = qzWalkCurrentLesson();
  document.getElementById('qzWalkHighlight').style.opacity = '0';
  const tip = document.getElementById('qzWalkTip');
  qzWalkSetTipBody(`<b>&#127881; Lesson ${l.number} complete!</b><p>Great work, you finished every step. The next lesson is unlocked from the Dashboard.</p>
     <button class="qz-btn primary" style="margin-top:10px" onclick="qzWalkBackToLessons()">Back to Lessons</button>`);
  tip.style.top = '50%';
  tip.style.bottom = 'auto';
  tip.style.left = '50%';
  tip.style.transform = 'translate(-50%,-50%)';
}
function qzWalkUnlockSearchInput() {
  const input = document.getElementById('qzTopSearchInput');
  if (input) { input.disabled = false; input.title = ''; }
}
function qzWalkBackToLessons() {
  qzWalk = null;
  document.getElementById('qzWalk').classList.remove('open');
  qzWalkUnlockSearchInput();
  qzGoto('dashboard');
}
function qzWalkExit(silent) {
  const l = qzWalkCurrentLesson();
  qzWalk = null;
  const w = document.getElementById('qzWalk');
  if (w) w.classList.remove('open');
  qzWalkUnlockSearchInput();
  if (!silent) {
    if (l) { qzState.view = 'lesson'; qzState.lessonId = l.id; qzSyncTopTabs(); }
    qzRenderRoot();
  }
}
function qzWalkReposition() {
  if (!qzWalk) return;
  const step = qzWalkCurrentStep();
  if (!step) return;
  if (qzWalk.tourIndex != null && step.walk.tour) {
    const stop = step.walk.tour[qzWalk.tourIndex];
    if (stop) qzWalkPosition({ walk: { target: stop.target } });
    return;
  }
  qzWalkPosition(step);
}
window.addEventListener('resize', qzWalkReposition);
document.addEventListener('DOMContentLoaded', () => {
  // .qz-body is the actual scrolling container (the page itself is height:100vh/overflow:hidden),
  // and getBoundingClientRect() is viewport-relative — without this, the highlight/tip stay
  // frozen at their last position while the real target scrolls away underneath them.
  const bodyEl = document.querySelector('.qz-body');
  if (bodyEl) bodyEl.addEventListener('scroll', qzWalkReposition, { passive: true });
});

/* ---------- final exam card (full exam logic lives further down) ---------- */
function qzExamDashboardCardHTML(unlocked) {
  if (typeof QZ_EXAM_ITEMS === 'undefined') return '';
  const ex = qzStore.exam;
  if (ex && ex.submittedAt) {
    const pct = ex.max ? Math.round(ex.score / ex.max * 100) : 0;
    const passed = pct >= Math.round(QZ_EXAM_PASS_PCT * 100);
    return `<div class="qz-exam-card done"><b>Final Exam</b><p>Completed &mdash; ${ex.score}/${ex.max} (${pct}%), ${passed ? 'Passed' : 'Not passed'}.</p>
      <button class="qz-btn sm" onclick="qzExamResetAttempt(this)">Reset my exam attempt (training only)</button></div>`;
  }
  if (ex && !ex.submittedAt) {
    return `<div class="qz-exam-card"><b>Final Exam</b><p>In progress &mdash; question ${(ex.currentIndex || 0) + 1} of ${QZ_EXAM_ITEMS.length}.</p>
      <button class="qz-btn primary" onclick="qzExamReturn()">Resume Exam</button></div>`;
  }
  if (!unlocked) return `<div class="qz-exam-card locked"><b>Final Exam</b><p>Unlocks once all ${QZ_LESSONS.length} lessons are complete.</p></div>`;
  return `<div class="qz-exam-card"><b>Final Exam</b><p>One official attempt. No hints, no going back.</p><button class="qz-btn primary" onclick="qzExamStart()">Start Final Exam</button></div>`;
}

/* ---------- dashboard ---------- */
function qzDashboardHTML() {
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const firstName = su ? su.name.split(' ')[0] : 'there';
  const cards = QZ_LESSONS.map((l, i) => {
    const state = qzLessonState(i);
    const prog = qzLessonProgress(l);
    const locked = state === 'locked';
    const pct = prog.total ? Math.round(prog.done / prog.total * 100) : 0;
    const fracLabel = locked ? 'Locked' : (state === 'done' ? 'Complete' : prog.done + ' of ' + prog.total + ' done');
    return `<div class="qz-lesson-card ${state}" ${locked ? '' : `onclick="qzOpenLesson('${l.id}')"`}>
      <div class="eyebrow">MODULE ${String(l.number).padStart(2, '0')}</div>
      <b>${esc(l.title)}</b>
      <p>${esc(l.summary)}</p>
      <div class="qz-bar"><i style="width:${pct}%"></i></div>
      <div class="frac">${esc(fracLabel)}</div>
    </div>`;
  }).join('');
  const allDone = QZ_LESSONS.every((l, i) => qzLessonState(i) === 'done');
  const examCard = qzExamDashboardCardHTML(allDone);

  const allSteps = QZ_LESSONS.flatMap(l => l.steps);
  const doneSteps = allSteps.filter(qzLessonStepDone).length;
  const totalSteps = allSteps.length;
  const overallPct = totalSteps ? Math.round(doneSteps / totalSteps * 100) : 0;
  let examLabel = 'Pending';
  if (qzStore.exam && qzStore.exam.submittedAt) {
    const examPct = qzStore.exam.max ? Math.round(qzStore.exam.score / qzStore.exam.max * 100) : 0;
    examLabel = examPct >= Math.round(QZ_EXAM_PASS_PCT * 100) ? 'Passed' : 'Not Passed';
  } else if (qzStore.exam) {
    examLabel = 'In Progress';
  }

  return `
    <div class="qz-welcome">
      <h2>Welcome back, ${esc(firstName)}</h2>
      <p>This is your Qualia practice environment. Work through the lessons in order, nothing here is connected to a real account or real clients.</p>
      <div class="qz-overall-progress">
        <div class="qz-overall-label">Overall Progress: ${doneSteps} of ${totalSteps} steps (${overallPct}%) &middot; Exam: ${examLabel}</div>
        <div class="qz-bar"><i style="width:${overallPct}%"></i></div>
      </div>
    </div>
    <div class="qz-listhead"><div><h2>Lessons</h2><div class="sub">Complete every step in a lesson to unlock the next. Each step is a real action in the UI, graded automatically.</div></div></div>
    <div class="qz-lesson-grid">${cards}</div>
    ${examCard}
  `;
}

/* ---------- orders list ---------- */
function qzOrderParty(o, role) {
  const p = o.parties.find(x => x.role === role);
  return p ? p.name : 'Not set';
}
function qzOrderMatchesFilter(o, filter) {
  const f = (filter || '').toLowerCase().trim();
  if (!f) return true;
  return o.propertyAddress.toLowerCase().includes(f) || o.id.toLowerCase().includes(f) || o.parties.some(p => p.name.toLowerCase().includes(f));
}
function qzOrdersRowsHTML() {
  const filter = qzState.orderFilter;
  const rows = qzAllOrders().filter(o => qzOrderMatchesFilter(o, filter));
  if (!rows.length) return '<tr><td colspan="9" style="text-align:center;color:var(--qz-muted);padding:26px">No orders match that search.</td></tr>';
  return rows.map(o => `<tr class="link" data-order-id="${escAttr(o.id)}" onclick="qzOpenOrder('${o.id}')">
      <td>${esc(o.status)}</td>
      <td>${esc(QZ_STAGES[o.stageIndex])}</td>
      <td class="addr">${esc(o.id.replace('ORD-', ''))}</td>
      <td>${esc(qzOrderParty(o, 'Buyer'))}</td>
      <td>${esc(qzOrderParty(o, 'Seller'))}</td>
      <td>${esc(o.propertyAddress)}</td>
      <td>${esc(o.type)}</td>
      <td>${esc(qzOrderParty(o, 'Settlement Agent'))}</td>
      <td>${fmtDate(o.closingDate)}</td>
    </tr>`).join('');
}
function qzOrdersStatsHTML() {
  return QZ_STAGES.filter(stage => stage !== 'Closed').map(stage => {
    const count = qzAllOrders().filter(o => QZ_STAGES[o.stageIndex] === stage).length;
    return `<div class="stat"><span class="num">${count}</span><span class="lbl">${esc(stage)}</span></div>`;
  }).join('');
}
function qzOrdersHTML() {
  return `
    <div class="qz-orders-hero">
      <div class="ic">${QZ_ICONS.pin}</div>
      <h2>Skill Cloud Training</h2>
      <div class="qz-orders-hero-btns">
        <button class="qz-btn" type="button" onclick="qzToast('Training only, quotes are not available in this simulator.')">Get a Quote</button>
        <button class="qz-btn primary" type="button" onclick="qzToast('Training only, creating new orders is not available in this simulator.')">Place Order</button>
      </div>
      <div class="qz-orders-stats">${qzOrdersStatsHTML()}</div>
    </div>
    <div class="qz-listhead"><div><h2>Orders</h2><div class="sub">Search and open a file the way you would in a live queue</div></div></div>
    <table class="qz-tbl"><thead><tr><th>Status</th><th>Stage</th><th>Order</th><th>Borrower</th><th>Seller</th><th>Property</th><th>Type</th><th>Agent</th><th>Closing</th></tr></thead>
    <tbody id="qzOrdersBody">${qzOrdersRowsHTML()}</tbody></table>
  `;
}
function qzTopSearch(v) {
  qzState.orderFilter = v;
  // Outside the walkthrough, any non-empty search counts (organic exploration shouldn't be
  // graded against a specific order). But while the walkthrough is actively showing this
  // exact step, only mark it done once the typed text actually surfaces Order ORD-2026-1483,
  // otherwise the tip would celebrate "found it!" over a table showing zero results.
  const step = (typeof qzWalk !== 'undefined' && qzWalk) ? qzWalkCurrentStep() : null;
  const isSearchWalkStep = step && step.type === 'do' && step.checklistId === 'orders-search';
  const target1483 = qzGetOrder('ORD-2026-1483');
  if (v && v.trim() && (!isSearchWalkStep || (target1483 && qzOrderMatchesFilter(target1483, v)))) {
    qzMark('orders-search');
  }
  if (qzState.view !== 'orders') {
    qzState.view = 'orders';
    qzState.orderId = null;
    qzSyncTopTabs();
    qzRenderRoot();
  } else {
    const body = document.getElementById('qzOrdersBody');
    if (body) body.innerHTML = qzOrdersRowsHTML();
  }
  qzWalkSyncSearchStep();
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
  const o = qzGetOrder(qzState.orderId);
  if (!o) return '<p>Order not found.</p>';
  const pendingDocs = qzDocsForOrder(o.id).filter(d => qzDocStatus(d) === 'Pending').length;
  const openTasks = qzTasksForOrder(o.id).filter(t => qzTaskStatus(t) !== 'Complete').length;
  const openReviews = qzReviewsForOrder(o.id).filter(r => !qzStore.reviews[r.id]).length;

  const tabs = [
    ['overview', 'Overview'], ['review', 'Review', openReviews], ['dataentry', 'Data Entry'], ['documents', 'Documents', pendingDocs],
    ['tasks', 'Tasks', openTasks], ['workflow', 'Workflow'], ['communication', 'Communication'],
    ['vendors', 'Vendors'], ['closing', 'Closing'], ['accounting', 'Accounting']
  ];
  const tabsHtml = tabs.map(t => {
    const [key, label, count] = t;
    return `<span class="${qzState.orderTab === key ? 'active' : ''}" data-tab="${key}" onclick="qzOrderTab('${key}')">${esc(label)}${count ? ' <span class="c">' + count + '</span>' : ''}</span>`;
  }).join('');

  let flagHtml = '';
  if (o.flag === 'missing-document') flagHtml = `<div class="qz-order-flag">A required document is outstanding, see the Documents tab.</div>`;
  else if (o.flag === 'closing-delay') flagHtml = `<div class="qz-order-flag bad">Closing date moved from ${fmtDate(o.originalClosingDate)} to ${fmtDate(o.closingDate)}, see Workflow for details.</div>`;

  let body = '';
  if (qzState.orderTab === 'overview') body = qzOverviewHTML(o);
  else if (qzState.orderTab === 'review') body = qzReviewHTML(o);
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

/* ---------- Review: 4-step discrepancy-report engine ----------
   Step 1: open the source document. Step 2: multiple choice, what does the source
   actually say (auto-graded). Step 3: multiple choice, what's the right next step
   (auto-graded). Step 4: conditional — apply a correction (live, via the override
   layer) or pick an escalation category (auto-graded) plus an ungraded note.
   Reused as-is by the exam's `verify` items through qzReviewLookup(). */
function qzReviewsForOrder(orderId) { return QZ_REVIEWS.filter(r => r.orderId === orderId); }
function qzReviewLookup(id) {
  return QZ_REVIEWS.find(r => r.id === id) ||
    (typeof QZ_EXAM_ITEMS !== 'undefined' ? QZ_EXAM_ITEMS.find(i => i.type === 'verify' && i.id === id) : undefined);
}
function qzReviewScore(orderId) {
  const items = qzReviewsForOrder(orderId);
  let resolved = 0, correct = 0;
  items.forEach(r => { const s = qzStore.reviews[r.id]; if (s && s.resolvedAt) { resolved++; if (s.correct) correct++; } });
  return { resolved, correct, total: items.length };
}
function qzRevGet(id) { return qzStore.reviews[id] || (qzStore.reviews[id] = { docOpened: false }); }
function qzRevOpenDoc(id) {
  const r = qzReviewLookup(id);
  if (!r) return;
  qzViewDoc(r.doc, r.docTitle);
  qzRevGet(id).docOpened = true;
  qzSave();
  qzRenderRoot();
  qzWalkSyncVerifyStep(id);
}
function qzRevAnswerSource(id, optionId) {
  const r = qzReviewLookup(id);
  const st = qzRevGet(id);
  if (!st.docOpened || st.step2Choice) return;
  st.step2Choice = optionId;
  st.step2Correct = optionId === r.rightSourceOptionId;
  qzSave();
  qzRenderRoot();
  qzWalkSyncVerifyStep(id);
}
/* action==='none' is a terminal choice (no step 4 either way), so it finalizes right away
   regardless of whether it was the right call, the outer feedback panel covers that case.
   Any other action gates on correctness: a wrong "correct it myself"/"escalate" pick never
   reaches step 4, it shows an immediate inline retry instead (see qzRevItemHTML). */
function qzRevAnswerAction(id, action) {
  const r = qzReviewLookup(id);
  const st = qzRevGet(id);
  if (!st.step2Choice || !st.step2Correct || st.step3Choice) return;
  st.step3Choice = action;
  st.step3Correct = action === r.rightAction;
  qzSave();
  if (action === 'none') { qzRevFinalize(id); return; }
  qzRenderRoot();
  qzWalkSyncVerifyStep(id);
}
function qzRevSaveCorrection(id) {
  const r = qzReviewLookup(id);
  const input = document.getElementById('qzRevInput-' + id);
  const val = input ? input.value.trim() : '';
  if (!val) { qzToast('Enter the corrected value.'); return; }
  const st = qzRevGet(id);
  st.correctedValueSaved = val;
  if (r.partyRole) qzSetPartyOverride(r.orderId, r.partyRole, { name: val });
  else if (r.field) qzSetScalarOverride(r.orderId, r.field, val);
  qzMark('de-edit');
  qzRevFinalize(id);
  qzToast('Correction saved.', { tone: 'good' });
}
function qzRevSaveEscalation(id) {
  const r = qzReviewLookup(id);
  const catSel = document.getElementById('qzRevCategory-' + id);
  const cat = catSel ? catSel.value : '';
  if (!cat) { qzToast('Choose an escalation category.'); return; }
  const noteEl = document.getElementById('qzRevNote-' + id);
  const note = noteEl ? noteEl.value.trim() : '';
  const st = qzRevGet(id);
  st.step4Category = cat;
  st.step4CategoryCorrect = cat === r.rightCategory;
  st.note = note;
  // Same gating rule as Step 2/3: a wrong pick here must not be able to "pass" and finalize
  // the item, stay on Step 4 with inline feedback and let the trainee pick again instead.
  if (!st.step4CategoryCorrect) {
    qzSave();
    qzRenderRoot();
    qzToast('Not quite — check the category and submit again.');
    qzWalkSyncVerifyStep(id);
    return;
  }
  qzRevFinalize(id);
  qzToast('Escalation submitted.', { tone: qzRevGet(id).correct ? 'good' : undefined });
}
function qzRevFinalize(id) {
  const st = qzRevGet(id);
  const parts = [st.step2Correct, st.step3Correct];
  if (st.step3Choice && st.step3Choice.indexOf('escalate') === 0) parts.push(st.step4CategoryCorrect);
  st.correct = parts.every(Boolean);
  st.resolvedAt = Date.now();
  qzSave();
  qzRenderRoot();
  qzNotifyReviewResolved(id);
}
/* Full reset, used by the "Redo" control after the item is fully resolved. */
function qzRevRetry(id) {
  qzStore.reviews[id] = { docOpened: qzStore.reviews[id] ? qzStore.reviews[id].docOpened : false };
  qzSave();
  qzRenderRoot();
  qzWalkSyncVerifyStep(id);
}
/* Partial reset for a wrong mid-flow MC answer (step 2 or step 3): clears that step and
   everything after it, keeps earlier correct answers (and docOpened) intact so the trainee
   retries only what they got wrong instead of starting the whole item over. */
function qzRevRetryStep(id, fromPhase) {
  const st = qzRevGet(id);
  if (fromPhase <= 2) { delete st.step2Choice; delete st.step2Correct; }
  if (fromPhase <= 3) { delete st.step3Choice; delete st.step3Correct; }
  delete st.step4Category; delete st.step4CategoryCorrect; delete st.note; delete st.correctedValueSaved;
  qzSave();
  qzRenderRoot();
  qzWalkSyncVerifyStep(id);
}
/* Same idea as qzNotifyStepDone (called from qzMark) but for `verify` items, resolved via
   qzRevFinalize instead of the checklist. An incorrect result does NOT auto-advance an
   active walkthrough, same rule as qzNotifyScenarioAnswered: it points at the explanation
   and the item's own "Redo" control instead. */
function qzNotifyReviewResolved(reviewId) {
  if (!qzState.lessonId || typeof QZ_LESSONS === 'undefined') return;
  const l = QZ_LESSONS.find(x => x.id === qzState.lessonId);
  if (!l) return;
  const step = l.steps.find(s => s.type === 'verify' && s.reviewId === reviewId);
  if (!step) return;
  const st = qzRevGet(reviewId);

  if (typeof qzWalk !== 'undefined' && qzWalk && qzWalk.lessonId === l.id && l.steps[qzWalk.stepIndex] === step) {
    if (st.correct) qzWalkStepDone();
    else { qzWalkRenderRetry('Read the explanation below, then click "Redo" to try again.'); qzWalkPosition(step); }
    return;
  }

  if (!st.correct) return;
  const label = qzLessonStepLabel(step);
  const prog = qzLessonProgress(l);
  if (prog.complete) qzToast(`Lesson ${l.number} complete! Use the banner above to head back and unlock the next lesson.`, { tone: 'good', duration: 5000 });
  else qzToast(`"${label}" done, ${prog.done} of ${prog.total} steps in Lesson ${l.number}.`, { tone: 'good' });
  qzRenderLessonBanner();
}
function qzRevItemHTML(id) {
  const r = qzReviewLookup(id);
  if (!r) return '';
  const st = qzRevGet(id);
  const done = !!st.resolvedAt;

  const statusChip = done
    ? `<span class="qz-rv-chip ${st.correct ? 'good' : 'bad'}">${st.correct ? 'Correct' : 'Needs another look'}</span>`
    : '<span class="qz-rv-chip pending">Pending</span>';

  const step1 = `<div class="qz-rv-step ${st.docOpened ? 'done' : 'active'}" data-rev-phase="1">
    <div class="qz-rv-step-h">Step 1 &middot; Open the source document</div>
    <button class="qz-btn sm" onclick="qzRevOpenDoc('${id}')">${st.docOpened ? 'Reopen' : 'Open'} ${esc(r.docTitle)}</button>
  </div>`;

  let step2 = '';
  if (st.docOpened) {
    const answered = !!st.step2Choice;
    const optsHtml = r.sourceOptions.map(o => {
      let cls = '';
      if (answered) {
        if (o.id === r.rightSourceOptionId) cls = 'correct';
        else if (o.id === st.step2Choice) cls = 'incorrect';
      }
      return `<button type="button" class="qz-option qz-rv-mc ${cls}" ${answered ? 'disabled' : ''} onclick="qzRevAnswerSource('${id}','${o.id}')">${esc(o.text)}</button>`;
    }).join('');
    const retry = (answered && !st.step2Correct)
      ? `<div class="qz-rv-subfeedback bad">&#10007; Not quite, look at the document again before deciding what happens next.</div>
         <div class="qz-rv-actions"><button class="qz-btn sm" onclick="qzRevRetryStep('${id}',2)">Try again</button></div>`
      : '';
    step2 = `<div class="qz-rv-step ${st.step2Correct ? 'done' : 'active'}" data-rev-phase="2">
      <div class="qz-rv-step-h">Step 2 &middot; What does the source document actually say?</div>
      ${optsHtml}
      ${retry}
    </div>`;
  }

  let step3 = '';
  if (st.step2Choice && st.step2Correct) {
    const answered = !!st.step3Choice;
    const optsHtml = QZ_ACTION_CHOICES.map(a => {
      let cls = '';
      if (answered) {
        if (a.id === r.rightAction) cls = 'correct';
        else if (a.id === st.step3Choice) cls = 'incorrect';
      }
      return `<button type="button" class="qz-option qz-rv-mc ${cls}" ${answered ? 'disabled' : ''} onclick="qzRevAnswerAction('${id}','${a.id}')">${esc(a.label)}</button>`;
    }).join('');
    // action==='none' finalizes immediately (there's no step 4 either way), so this inline
    // retry only needs to cover the correct/escalate picks, which pause here instead.
    const retry = (answered && !st.step3Correct && !done)
      ? `<div class="qz-rv-subfeedback bad">&#10007; That's not the right next step here.</div>
         <div class="qz-rv-actions"><button class="qz-btn sm" onclick="qzRevRetryStep('${id}',3)">Try again</button></div>`
      : '';
    step3 = `<div class="qz-rv-step ${st.step3Correct ? 'done' : 'active'}" data-rev-phase="3">
      <div class="qz-rv-step-h">Step 3 &middot; What's the right next step?</div>
      ${optsHtml}
      ${retry}
    </div>`;
  }

  let step4 = '';
  if (st.step3Choice === 'correct' && st.step3Correct && !done) {
    step4 = `<div class="qz-rv-step active" data-rev-phase="4">
      <div class="qz-rv-step-h">Step 4 &middot; Enter the corrected value</div>
      <div class="qz-form-grid full">
        <div class="qz-field"><label>Corrected Value</label><input type="text" id="qzRevInput-${id}" value="${escAttr(r.systemValue)}"></div>
      </div>
      <div class="qz-rv-actions"><button class="qz-btn sm primary" onclick="qzRevSaveCorrection('${id}')">Save correction</button></div>
    </div>`;
  } else if (st.step3Choice && st.step3Correct && st.step3Choice.indexOf('escalate') === 0 && !done) {
    // A prior wrong submit sets step4Category without resolving the item (gated, same as
    // Step 2/3), re-select it and show why it was wrong instead of resetting the form blank.
    const wrongCategory = st.step4Category && !st.step4CategoryCorrect;
    const catOpts = QZ_ESCALATION_CATEGORIES.map(c => `<option value="${c.id}" ${st.step4Category === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('');
    const wrongNote = wrongCategory ? `<div class="qz-rv-subfeedback bad">&#10007; That's not the right category. Check it and submit again.</div>` : '';
    step4 = `<div class="qz-rv-step active" data-rev-phase="4">
      <div class="qz-rv-step-h">Step 4 &middot; Escalation category</div>
      <div class="qz-form-grid full">
        <div class="qz-field"><label>Category</label><select id="qzRevCategory-${id}"><option value="">Choose a category&hellip;</option>${catOpts}</select></div>
        <div class="qz-field"><label>Note (not graded, for practice)</label><textarea id="qzRevNote-${id}" placeholder="Describe the discrepancy and why it needs a decision...">${esc(st.note || '')}</textarea></div>
      </div>
      ${wrongNote}
      <div class="qz-rv-actions"><button class="qz-btn sm primary" onclick="qzRevSaveEscalation('${id}')">Submit escalation</button></div>
    </div>`;
  }

  let feedback = '';
  if (done) {
    const bits = [];
    bits.push(st.step2Correct
      ? '<div class="qz-rv-subfeedback good">&#10003; Read the document correctly.</div>'
      : `<div class="qz-rv-subfeedback bad">&#10007; The source document actually says: "${esc(r.sourceOptions.find(o => o.id === r.rightSourceOptionId).text)}"</div>`);
    bits.push(st.step3Correct
      ? '<div class="qz-rv-subfeedback good">&#10003; Chose the right next step.</div>'
      : `<div class="qz-rv-subfeedback bad">&#10007; The right next step was: "${esc(QZ_ACTION_LABEL[r.rightAction])}"</div>`);
    // r.rightCategory is only set when the item's correct action actually IS an escalation.
    // If the trainee escalated something that should have been handled another way,
    // r.rightCategory is null, there's no "right category" to name, the step3 bit above
    // already explains the real mistake, so this bit is skipped rather than crashing on it.
    if (st.step3Choice && st.step3Choice.indexOf('escalate') === 0 && r.rightCategory) {
      bits.push(st.step4CategoryCorrect
        ? '<div class="qz-rv-subfeedback good">&#10003; Picked the right escalation category.</div>'
        : `<div class="qz-rv-subfeedback bad">&#10007; The right category was: "${esc(QZ_ESCALATION_CATEGORIES.find(c => c.id === r.rightCategory).label)}"</div>`);
    }
    const noteLine = st.note ? `<div class="qz-rv-note">Your note: ${esc(st.note)}</div>` : '';
    const lessonStep = qzState.lessonId && typeof QZ_LESSONS !== 'undefined'
      ? (QZ_LESSONS.find(x => x.id === qzState.lessonId) || { steps: [] }).steps.find(s2 => s2.type === 'verify' && s2.reviewId === id)
      : null;
    const continueBtn = (st.correct && lessonStep) ? qzLessonContinueHTML(lessonStep) : '';
    // Redo doesn't make sense once you're right and a Continue button is already offering
    // the way forward, clicking it would wipe the resolved state and, since Continue only
    // renders inside this same feedback block, take the Continue button down with it.
    const redoBtn = (st.correct && continueBtn) ? '' : `<button class="qz-btn sm" onclick="qzRevRetry('${id}')">Redo</button>`;
    feedback = `<div class="qz-rv-feedback ${st.correct ? 'good' : 'bad'}">
      <b>${st.correct ? 'Right call.' : 'Not quite.'}</b> ${esc(r.explain)}
      ${bits.join('')}${noteLine}
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${continueBtn}${redoBtn}</div>
    </div>`;
  }

  return `<div class="qz-rv-item" data-rev-id="${escAttr(id)}">
    <div class="qz-rv-head"><b>${esc(r.label)}</b>${statusChip}</div>
    <div class="qz-rv-where">${esc(r.where)}</div>
    <p class="qz-rv-instr">${esc(r.instruction)}</p>
    <div class="qz-rv-compare">
      <div class="col"><span class="k">On the order</span><span class="v">${esc(r.systemValue)}</span></div>
    </div>
    ${step1}
    ${step2}
    ${step3}
    ${step4}
    ${feedback}
  </div>`;
}
function qzReviewHTML(o) {
  const items = qzReviewsForOrder(o.id);
  if (!items.length) {
    return `<div class="qz-panel"><div class="ph"><h4>Review</h4></div><p style="font-size:13px;color:var(--qz-muted)">No review items are set up for this order yet.</p></div>`;
  }
  const score = qzReviewScore(o.id);
  // While the walkthrough is actively working a `verify` step, show only that item in full
  // ("one point at a time" instead of the whole order's review history at once): anything
  // already resolved collapses to a compact row, anything not reached yet doesn't show. Outside
  // an active verify step (browsing normally, or mid `do`/`decide` step), show everything.
  const walkStep = (typeof qzWalk !== 'undefined' && qzWalk) ? qzWalkCurrentStep() : null;
  const walking = walkStep && walkStep.type === 'verify';
  const rows = items.map(r => {
    if (!walking) return qzRevItemHTML(r.id);
    if (walkStep.reviewId === r.id) return qzRevItemHTML(r.id);
    return qzRevGet(r.id).resolvedAt ? qzRevCollapsedHTML(r.id) : '';
  }).join('');
  return `<div class="qz-panel">
    <div class="ph"><h4>Document Review</h4><span class="qz-rv-score">${score.resolved}/${score.total} reviewed &middot; ${score.correct} correct calls</span></div>
    <p style="font-size:13px;color:var(--qz-muted);margin:0 0 18px">Open the source document, work through each step, and report what you find: verify it, correct it, or escalate it.</p>
    ${rows}
  </div>`;
}
function qzRevCollapsedHTML(id) {
  const r = qzReviewLookup(id);
  const st = qzRevGet(id);
  return `<div class="qz-rv-item qz-rv-collapsed" data-rev-id="${escAttr(id)}">
    <div class="qz-rv-head"><b>${esc(r.label)}</b><span class="qz-rv-chip ${st.correct ? 'good' : 'bad'}">${st.correct ? 'Correct' : 'Needs another look'}</span></div>
  </div>`;
}

/* ---------- Data Entry ----------
   Fields stage changes locally (oninput just reveals the Save button); nothing is
   written to the override layer until Save is clicked, which reads the DOM directly
   and commits everything for the active sub-tab in one go. */
function qzDeTab(tab) {
  qzState.deTab = tab;
  qzMark('de-' + tab);
  qzRenderRoot();
}
function qzDeMarkDirty() {
  const btn = document.getElementById('qzDeSaveBtn');
  if (btn) btn.style.display = '';
  qzWalkSyncEditStep();
}
/* Keeps the de-edit step's tip text live as the trainee types the buyer's phone number, same
   idea as qzWalkSyncSearchStep: say immediately if what's typed doesn't match the number the
   walkthrough asked for, instead of staying silent until Save is clicked. */
function qzWalkSyncEditStep() {
  if (typeof qzWalk === 'undefined' || !qzWalk) { if (typeof qzWalkReposition === 'function') qzWalkReposition(); return; }
  const step = qzWalkCurrentStep();
  if (!step || step.type !== 'do' || step.checklistId !== 'de-edit') { qzWalkReposition(); return; }
  qzWalkRenderTip(step, false);
  qzWalkPosition(step);
}
function qzDeSaveChanges(orderId) {
  const sub = qzState.deTab || 'property';
  let skipSavedToast = false;
  if (sub === 'property') {
    const street = (document.getElementById('qzDeStreet').value || '').trim();
    const city = (document.getElementById('qzDeCity').value || '').trim();
    const stateZip = (document.getElementById('qzDeStateZip').value || '').trim();
    const propType = (document.getElementById('qzDePropType').value || '').trim();
    const addr = [street, city, stateZip].filter(Boolean).join(', ');
    if (addr) qzSetScalarOverride(orderId, 'propertyAddress', addr);
    if (propType) qzSetScalarOverride(orderId, 'propertyType', propType);
  } else if (sub === 'parties') {
    let buyerPhoneMatchesTarget = false;
    document.querySelectorAll('.qz-party-card').forEach(card => {
      const role = card.dataset.role;
      const nameEl = card.querySelector('input[data-field="name"]');
      const emailEl = card.querySelector('input[data-field="email"]');
      const phoneEl = card.querySelector('input[data-field="phone"]');
      const patch = {};
      if (nameEl && nameEl.value.trim()) patch.name = nameEl.value.trim();
      if (emailEl && emailEl.value.trim()) patch.email = emailEl.value.trim();
      if (phoneEl && phoneEl.value.trim()) patch.phone = phoneEl.value.trim();
      if (Object.keys(patch).length) qzSetPartyOverride(orderId, role, patch);
      if (role === 'Buyer' && phoneEl && phoneEl.value.trim() === QZ_DE_EDIT_TARGET_PHONE) buyerPhoneMatchesTarget = true;
    });
    // Outside the walkthrough, Data Entry is a general tool, any edit is a valid edit. But
    // while the walkthrough is actively on this exact step, it's a specific exercise: type
    // the number the trainee was just told, don't just accept whatever got typed.
    const step = (typeof qzWalk !== 'undefined' && qzWalk) ? qzWalkCurrentStep() : null;
    const isEditWalkStep = step && step.type === 'do' && step.checklistId === 'de-edit';
    if (!isEditWalkStep || buyerPhoneMatchesTarget) {
      qzMark('de-edit');
    } else {
      qzToast(`Saved, but it doesn't match — the buyer said ${QZ_DE_EDIT_TARGET_PHONE}. Check the Phone field and save again.`);
      skipSavedToast = true;
    }
  } else {
    const priceRaw = (document.getElementById('qzDePrice').value || '').replace(/[^0-9.]/g, '');
    const loanRaw = (document.getElementById('qzDeLoan').value || '').replace(/[^0-9.]/g, '');
    const closing = (document.getElementById('qzDeClosing').value || '').trim();
    const titleNum = (document.getElementById('qzDeTitleNum').value || '').trim();
    const agency = (document.getElementById('qzDeSettleAgency').value || '').trim();
    if (priceRaw) qzSetScalarOverride(orderId, 'purchasePrice', parseFloat(priceRaw));
    if (loanRaw) qzSetScalarOverride(orderId, 'loanAmount', parseFloat(loanRaw));
    if (closing) qzSetScalarOverride(orderId, 'closingDate', closing);
    if (titleNum) qzSetScalarOverride(orderId, 'titleNumber', titleNum);
    if (agency) qzSetScalarOverride(orderId, 'settlementAgency', agency);
  }
  if (!skipSavedToast) qzToast('Changes saved.', { tone: 'good' });
  qzRenderRoot();
}
function qzDataEntryHTML(o) {
  const sub = qzState.deTab || 'property';
  const subtabs = [['property', 'Property'], ['parties', 'Parties'], ['transaction', 'Transaction Information']]
    .map(([k, label]) => `<span class="${sub === k ? 'active' : ''}" data-detab="${k}" onclick="qzDeTab('${k}')">${label}</span>`).join('');
  const saveBtn = `<button class="qz-btn primary" id="qzDeSaveBtn" style="display:none" onclick="qzDeSaveChanges('${o.id}')">Save</button>`;

  let body = '';
  if (sub === 'property') {
    const parts = o.propertyAddress.split(',');
    body = `<div class="qz-form-grid">
      <div class="qz-field"><label>Street Address</label><input id="qzDeStreet" value="${escAttr(parts[0] || '')}" oninput="qzDeMarkDirty()"></div>
      <div class="qz-field"><label>City</label><input id="qzDeCity" value="${escAttr((parts[1] || '').trim())}" oninput="qzDeMarkDirty()"></div>
      <div class="qz-field"><label>State / Zip</label><input id="qzDeStateZip" value="${escAttr((parts[2] || '').trim())}" oninput="qzDeMarkDirty()"></div>
      <div class="qz-field"><label>Property Type</label><input id="qzDePropType" value="${escAttr(o.propertyType || 'Single Family Residence')}" oninput="qzDeMarkDirty()"></div>
    </div>`;
  } else if (sub === 'parties') {
    body = o.parties.map(p => `
      <div class="qz-party-card" data-role="${escAttr(p.role)}">
        <div class="pc-top"><b>${esc(p.name)}</b><span>${esc(p.role)}</span></div>
        <div class="qz-form-grid">
          <div class="qz-field"><label>Full Name</label><input value="${escAttr(p.name)}" data-field="name" oninput="qzDeMarkDirty()"></div>
          <div class="qz-field"><label>Email</label><input value="${escAttr(p.email)}" data-field="email" oninput="qzDeMarkDirty()"></div>
          <div class="qz-field"><label>Phone</label><input value="${escAttr(p.phone)}" data-field="phone" oninput="qzDeMarkDirty()"></div>
        </div>
      </div>`).join('');
  } else {
    body = `<div class="qz-form-grid">
      <div class="qz-field"><label>Purchase Price</label><input id="qzDePrice" value="${fmtMoney(o.purchasePrice)}" oninput="qzDeMarkDirty()"></div>
      <div class="qz-field"><label>Loan Amount</label><input id="qzDeLoan" value="${fmtMoney(o.loanAmount)}" oninput="qzDeMarkDirty()"></div>
      <div class="qz-field"><label>Closing Date</label><input id="qzDeClosing" value="${fmtDate(o.closingDate)}" oninput="qzDeMarkDirty()"></div>
      <div class="qz-field"><label>Title Number</label><input id="qzDeTitleNum" value="${escAttr(o.titleNumber)}" oninput="qzDeMarkDirty()"></div>
      <div class="qz-field"><label>Settlement Agency</label><input id="qzDeSettleAgency" value="${escAttr(o.settlementAgency)}" oninput="qzDeMarkDirty()"></div>
    </div>`;
  }
  return `<div class="qz-panel"><div class="qz-de-head"><div class="qz-subtabs">${subtabs}</div>${saveBtn}</div>${body}</div>`;
}

/* ---------- Documents ---------- */
function qzUploadDoc(id) {
  qzStore.docStatus[id] = 'Received';
  qzMark('docs-upload');
  const d = QZ_DOCUMENTS.find(x => x.id === id) || (typeof QZ_EXAM_DOCUMENTS !== 'undefined' ? QZ_EXAM_DOCUMENTS.find(x => x.id === id) : undefined);
  if (d && d.type === 'HOA') {
    const o = qzBaseOrder(d.orderId);
    if (o && o.flag === 'missing-document') {
      qzSetScalarOverride(d.orderId, 'flag', null);
      qzSetScalarOverride(d.orderId, 'stageIndex', o.stageIndex + 1);
      qzSetScalarOverride(d.orderId, 'statusNote', 'The HOA Resale Certificate has been received. Closing prep can continue.');
    }
  }
  qzSave();
  qzRenderRoot();
}
function qzDownloadDoc() { qzMark('docs-download'); qzToast('Downloaded (training only, no real file was transferred).'); }
function qzReviewDoc(id) { qzStore.docStatus[id] = 'Reviewed'; qzSave(); qzMark('docs-review'); qzRenderRoot(); }
function qzViewDoc(file, title) {
  qzMark('docs-download');
  document.getElementById('qzDocModalTitle').textContent = title || 'Document';
  document.getElementById('qzDocFrame').src = file;
  document.getElementById('qzDocModal').classList.add('open');
}
function qzCloseDoc() {
  document.getElementById('qzDocModal').classList.remove('open');
  document.getElementById('qzDocFrame').src = 'about:blank';
  // The walkthrough deliberately floats its tip (no highlight) while the doc modal covers
  // the screen; once closed, re-sync so it can point at the review step underneath again.
  if (typeof qzWalk !== 'undefined' && qzWalk) {
    const step = qzWalkCurrentStep();
    if (step) { qzWalkRenderTip(step, false); qzWalkPosition(step, { scrollIntoView: true }); }
  }
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') qzCloseDoc();
});
function qzDocumentsHTML(o) {
  const rows = qzDocsForOrder(o.id).map(d => {
    const st = qzDocStatus(d);
    const badgeClass = st === 'Pending' ? 'pending' : st === 'Received' ? 'received' : 'reviewed';
    let actions = '';
    if (st === 'Pending') actions = `<button class="qz-btn sm primary" data-doc-action="upload" onclick="qzUploadDoc(${d.id})">Upload</button>`;
    else {
      actions = d.file
        ? `<button class="qz-btn sm" data-doc-action="view" onclick="qzViewDoc('${d.file}','${esc(d.name)}')">View</button>`
        : `<button class="qz-btn sm" data-doc-action="download" onclick="qzDownloadDoc()">Download</button>`;
      if (st === 'Received') actions += ` <button class="qz-btn sm" data-doc-action="review" onclick="qzReviewDoc(${d.id})">Mark Reviewed</button>`;
    }
    return `<tr data-doc-id="${d.id}"><td>${esc(d.name)}</td><td>${esc(d.type)}</td><td><span class="qz-badge ${badgeClass}">${st}</span></td><td>${esc(d.uploadedBy)}</td><td>${fmtDate(d.date)}</td><td><div class="qz-row-actions">${actions}</div></td></tr>`;
  }).join('');
  return `<div class="qz-panel"><div class="ph"><h4>Documents</h4></div>
    <table class="qz-tbl"><thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Uploaded By</th><th>Date</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>
  </div>`;
}

/* ---------- Tasks ---------- */
function qzCompleteTask(id) { qzStore.taskStatus[id] = 'Complete'; qzSave(); qzMark('tasks-complete'); qzRenderRoot(); qzUpdateBellBadge(); }
function qzTasksHTML(o) {
  const rows = qzTasksForOrder(o.id).map(t => {
    const st = qzTaskStatus(t);
    const badgeClass = st === 'Complete' ? 'complete' : st === 'In Progress' ? 'progress' : 'open';
    const action = st !== 'Complete' ? `<button class="qz-btn sm primary" onclick="qzCompleteTask(${t.id})">Mark Complete</button>` : '<span style="color:var(--qz-muted);font-size:12px">Done</span>';
    return `<tr data-task-id="${t.id}"><td>${esc(t.title)}</td><td>${esc(t.assignedTo)}</td><td>${fmtDate(t.dueDate)}</td><td><span class="qz-badge ${badgeClass}">${st}</span></td><td>${action}</td></tr>`;
  }).join('');
  return `<div class="qz-panel"><div class="ph"><h4>Tasks</h4></div>
    <table class="qz-tbl"><thead><tr><th>Task</th><th>Assigned To</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  </div>`;
}

/* ---------- Workflow ---------- */
function qzWorkflowHTML(o) {
  const note = o.flag === 'closing-delay'
    ? `<p class="qz-tl-readonly-note" style="margin-top:14px;font-size:12.5px;color:var(--qz-bad)">Original closing date was ${fmtDate(o.originalClosingDate)}. This view is read-only, workflow structure is configured by admins, always escalate date changes per protocol.</p>`
    : `<p class="qz-tl-readonly-note" style="margin-top:14px;font-size:12.5px;color:var(--qz-muted)">This view is read-only. Workflow structure and stage rules are configured by admins, not by a VA.</p>`;
  return `<div class="qz-panel"><div class="ph"><h4>Workflow</h4></div>
    ${qzTimelineHTML(o)}
    <div class="qz-tl-status"><b>Current stage: <span>${esc(QZ_STAGES[o.stageIndex])}</span></b><p>${esc(o.statusNote)}</p></div>
    ${note}
  </div>`;
}

/* ---------- Communication ---------- */
function qzOpenThread(id) { qzState.threadId = id; qzMark('comm-open'); qzRenderRoot(); }
/* Merges a thread's original messages with whatever the trainee has replied in this
   session, replies are stored separately (qzStore.replies) rather than mutated onto
   QZ_MESSAGES directly, so they survive a reload instead of resetting on every page load. */
function qzThreadMessages(threadId) {
  const t = QZ_MESSAGES.find(m => m.id === threadId);
  if (!t) return [];
  const stored = (qzStore.replies && qzStore.replies[threadId]) || [];
  return t.thread.concat(stored);
}
function qzSendReply(threadId) {
  const box = document.getElementById('qzReplyBox');
  const text = box ? box.value.trim() : '';
  if (!text) { qzToast('Write a reply before sending.'); return; }
  if (text.length < 20) { qzToast('Your reply should be at least 20 characters. Write a professional response.'); return; }
  const msgs = qzThreadMessages(threadId);
  const last = msgs[msgs.length - 1];
  const recipient = last.sender === 'You (VA)' ? last.recipient : last.sender;
  qzStore.replies[threadId] = qzStore.replies[threadId] || [];
  qzStore.replies[threadId].push({ sender: 'You (VA)', recipient: recipient, date: new Date().toISOString().slice(0, 10), body: text });
  qzSave();
  qzMark('comm-reply');
  qzRenderRoot();
}
function qzLogFollowup() { qzMark('comm-followup'); qzToast('Follow-up logged on this file (training only).'); }
function qzCommunicationHTML(o) {
  const threads = QZ_MESSAGES.filter(m => m.orderId === o.id);
  if (!qzState.threadId || !threads.some(t => t.id === qzState.threadId)) qzState.threadId = threads[0] ? threads[0].id : null;
  const list = threads.map(t => {
    const count = qzThreadMessages(t.id).length;
    return `<div class="qz-thread-item ${t.id === qzState.threadId ? 'active' : ''}" onclick="qzOpenThread(${t.id})"><b>${esc(t.subject)}</b><span>${count} message${count !== 1 ? 's' : ''}</span></div>`;
  }).join('');
  const active = threads.find(t => t.id === qzState.threadId);
  let detail = '<div class="qz-panel">Select a thread.</div>';
  if (active) {
    const msgs = qzThreadMessages(active.id).map(m => `<div class="qz-msg ${m.sender === 'You (VA)' ? 'mine' : ''}"><div class="meta">${esc(m.sender)} &rarr; ${esc(m.recipient)} &middot; ${fmtDate(m.date)}</div>${esc(m.body)}</div>`).join('');
    detail = `<div class="qz-panel"><div class="ph"><h4>${esc(active.subject)}</h4></div>
      ${msgs}
      <div class="qz-reply"><textarea id="qzReplyBox" placeholder="Write a reply..." oninput="qzWalkSyncReplyStep()"></textarea>
      <div class="row"><button class="qz-btn" data-comm-action="followup" onclick="qzLogFollowup()">Log Follow-up</button><button class="qz-btn primary" data-comm-action="reply" onclick="qzSendReply(${active.id})">Send Reply</button></div></div>
    </div>`;
  }
  return `<div class="qz-comm-grid"><div class="qz-thread-list">${list}</div>${detail}</div>`;
}

/* ---------- Vendors ---------- */
function qzCheckVendor(id) {
  const v = QZ_VENDORS.find(x => x.id === id);
  qzMark('vendors-check');
  qzToast(v.name + ': ' + v.status);
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
  if (o.inspectionCharge != null) rows.push(["Home Inspection Fee", "Ace Home Inspections", Number(o.inspectionCharge)]);
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
  const correct = idx === s.correct;
  const prev = qzStore.scenarios[id] || {};
  const firstAttempt = prev.firstAttempt || { answered: idx, correct, ts: Date.now() };
  qzStore.scenarios[id] = { answered: idx, correct, firstAttempt, practiced: prev.practiced || false };
  qzSave();
  qzRenderRoot();
  qzNotifyScenarioAnswered(id, correct);
}
function qzRetakeScenario(id) {
  const prev = qzStore.scenarios[id];
  qzStore.scenarios[id] = { firstAttempt: prev && prev.firstAttempt, practiced: prev && prev.practiced };
  qzSave();
  qzRenderRoot();
  if (typeof qzWalk !== 'undefined' && qzWalk) {
    const step = qzWalkCurrentStep();
    if (step && step.type === 'decide' && step.scenarioId === id) qzWalkRenderTip(step, false);
  }
}
/* Same idea as qzNotifyStepDone (called from qzMark) but for `decide` steps, answered
   via qzAnswerScenario instead of the checklist. A wrong answer does NOT auto-advance
   an active walkthrough — it nudges the trainee to read the feedback and retry, since
   scenarios test judgment and the walkthrough must not just wait out a wrong pick. */
function qzNotifyScenarioAnswered(scenarioId, correct) {
  if (!qzState.lessonId || typeof QZ_LESSONS === 'undefined') return;
  const l = QZ_LESSONS.find(x => x.id === qzState.lessonId);
  if (!l) return;
  const step = l.steps.find(s => s.type === 'decide' && s.scenarioId === scenarioId);
  if (!step) return;

  if (typeof qzWalk !== 'undefined' && qzWalk && qzWalk.lessonId === l.id && l.steps[qzWalk.stepIndex] === step) {
    if (correct) qzWalkStepDone();
    else qzWalkRenderRetry();
    return;
  }

  if (!correct) return;
  const label = qzLessonStepLabel(step);
  const prog = qzLessonProgress(l);
  if (prog.complete) qzToast(`Lesson ${l.number} complete! Use the banner above to head back and unlock the next lesson.`, { tone: 'good', duration: 5000 });
  else qzToast(`"${label}" done, ${prog.done} of ${prog.total} steps in Lesson ${l.number}.`, { tone: 'good' });
  qzRenderLessonBanner();
}
function qzPracticeAction(id) {
  const s = QZ_SCENARIOS.find(x => x.id === id);
  const p = s && s.practice;
  if (!p) return;
  const prev = qzStore.scenarios[id] || {};
  qzStore.scenarios[id] = Object.assign({}, prev, { practiced: true });
  qzSave();
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
function qzScenarioDetailHTML() {
  const s = QZ_SCENARIOS.find(x => x.id === qzState.scenarioId);
  if (!s) return '<p>Scenario not found.</p>';
  const r = qzStore.scenarios[s.id];
  const answered = !!(r && r.answered != null);
  const opts = s.options.map((opt, idx) => {
    let cls = '';
    if (answered) { if (idx === s.correct) cls = 'correct'; else if (idx === r.answered && !r.correct) cls = 'incorrect'; }
    return `<button type="button" class="qz-option ${cls}" ${answered ? 'disabled' : ''} onclick="qzAnswerScenario('${s.id}',${idx})">${String.fromCharCode(65 + idx)}. ${esc(opt)}</button>`;
  }).join('');
  const firstAttemptLine = answered && r.firstAttempt
    ? `<div class="qz-feedback-first">First attempt: ${r.firstAttempt.correct ? '&#10003; correct' : '&#10007; incorrect'}</div>` : '';
  const lessonStep = qzState.lessonId && typeof QZ_LESSONS !== 'undefined'
    ? (QZ_LESSONS.find(x => x.id === qzState.lessonId) || { steps: [] }).steps.find(s2 => s2.type === 'decide' && s2.scenarioId === s.id)
    : null;
  const continueBtn = (answered && r.correct && lessonStep) ? qzLessonContinueHTML(lessonStep) : '';
  // Retake doesn't make sense once you're right and a Continue button is already offering
  // the way forward, clicking it would wipe the answered state and, since Continue only
  // renders inside this same feedback block, take the Continue button down with it. "Try
  // Again" on a wrong answer is the essential retry path and always stays.
  const retakeBtn = answered
    ? ((r.correct && continueBtn) ? '' : `<button class="qz-btn" onclick="qzRetakeScenario('${s.id}')">${r.correct ? 'Retake Scenario' : 'Try Again'}</button>`)
    : '';
  // practice/verifyDoc navigate away to a different order/tab entirely, if the guided
  // walkthrough is actively parked on this exact step waiting for a Continue click, that
  // click lives only on this page, navigating away strands it with no way back. Once the
  // trainee isn't mid-walkthrough here (browsing manually, or this step isn't the one being
  // walked), these stay available as before.
  const walkActiveHere = typeof qzWalk !== 'undefined' && qzWalk && lessonStep && qzWalkCurrentStep() === lessonStep;
  const feedback = answered ? `<div class="qz-feedback ${r.correct ? 'correct' : 'incorrect'}">
      <b>${r.correct ? 'Correct.' : 'Not quite.'}</b>${esc(s.explanation)}
      ${firstAttemptLine}
      <div class="qz-feedback-actions">
        ${continueBtn}
        ${(!walkActiveHere && r.correct && s.verifyDoc) ? `<button class="qz-btn" onclick="qzViewDoc('${s.verifyDoc.file}','${esc(s.verifyDoc.title)}')">${esc(s.verifyDoc.buttonLabel)}</button>` : ''}
        ${(!walkActiveHere && s.practice) ? `<button class="qz-btn primary" onclick="qzPracticeAction('${s.id}')">${esc(s.practice.buttonLabel)} &rarr;</button>` : ''}
        ${r.practiced ? '<span class="qz-rv-chip good">Practiced</span>' : ''}
        ${retakeBtn}
      </div>
    </div>` : '';
  return `<span class="qz-back" onclick="qzGoto('dashboard')">&larr; Dashboard</span>
    <div class="qz-panel qz-scenario-detail"><div class="ph"><h4>${esc(s.title)}</h4></div>
      <p class="situation">${esc(s.situation)}</p>
      ${opts}
      ${feedback}
    </div>`;
}

/* ---------- Final exam: no hints, no going back, one official attempt.
   Reuses the discrepancy-report engine (qzRevOpenDoc/qzRevAnswerSource/qzRevAnswerAction/
   qzRevSaveCorrection/qzRevSaveEscalation) for `verify` items via qzReviewLookup(), but
   renders without correctness coloring or explanations, those only appear after Submit. */
function qzExamStart() {
  qzStore.exam = { startedAt: Date.now(), currentIndex: 0, answers: {}, submittedAt: null, score: 0, max: 0 };
  qzSave();
  qzState.view = 'exam';
  qzState.examIndex = 0;
  qzSyncTopTabs();
  qzRenderRoot();
}
function qzExamReturn() {
  qzState.view = 'exam';
  qzState.examIndex = (qzStore.exam && qzStore.exam.currentIndex) || 0;
  qzSyncTopTabs();
  qzRenderRoot();
}
/* Two-click confirm instead of a native confirm() dialog: first click arms the button and
   flips its label for 3s, a second click within that window actually resets. */
function qzExamResetAttempt(btn) {
  if (!btn.dataset.confirming) {
    btn.dataset.confirming = '1';
    btn.dataset.label = btn.textContent;
    btn.textContent = 'Click again to confirm reset';
    btn.dataset.timer = setTimeout(() => {
      btn.textContent = btn.dataset.label;
      delete btn.dataset.confirming;
    }, 3000);
    return;
  }
  clearTimeout(Number(btn.dataset.timer));
  qzStore.exam = null;
  qzSave();
  qzRenderRoot();
}
function qzExamNext() {
  qzState.examIndex++;
  if (qzStore.exam) { qzStore.exam.currentIndex = qzState.examIndex; qzSave(); }
  qzRenderRoot();
}
function qzExamItemAnswered(item) {
  if (item.type === 'do') { const a = qzStore.exam.answers[item.id]; return !!(a && a.done); }
  if (item.type === 'decide') { const a = qzStore.exam.answers[item.id]; return !!(a && a.idx != null); }
  if (item.type === 'verify') { const s = qzStore.reviews[item.id]; return !!(s && s.resolvedAt); }
}
function qzExamDoStepGo(itemId) {
  const item = QZ_EXAM_ITEMS.find(i => i.id === itemId);
  if (!item) return;
  qzStore.exam.answers[itemId] = { done: true };
  qzSave();
  qzState.view = 'order';
  qzState.orderId = QZ_EXAM_ORDER.id;
  qzState.orderTab = 'workflow';
  qzSyncTopTabs();
  qzRenderRoot();
}
function qzExamAnswerDecide(itemId, idx) {
  qzStore.exam.answers[itemId] = { idx };
  qzSave();
  qzRenderRoot();
}
function qzExamDoItemHTML(item, answered) {
  return `<p class="qz-rv-instr">${esc(item.label)}</p>
    ${answered
      ? '<div class="qz-rv-subfeedback good">&#10003; Done. Use Next to continue.</div>'
      : `<button class="qz-btn sm" onclick="qzExamDoStepGo('${item.id}')">Open the order</button>`}`;
}
function qzExamDecideItemHTML(item, answered) {
  const a = qzStore.exam.answers[item.id];
  const opts = item.options.map((opt, idx) => {
    const cls = a && a.idx === idx ? 'selected' : '';
    return `<button type="button" class="qz-option ${cls}" ${answered ? 'disabled' : ''} onclick="qzExamAnswerDecide('${item.id}',${idx})">${String.fromCharCode(65 + idx)}. ${esc(opt)}</button>`;
  }).join('');
  return `<p class="situation">${esc(item.situation)}</p>${opts}`;
}
function qzExamVerifyItemHTML(item, answered) {
  const st = qzRevGet(item.id);
  const step1 = `<div class="qz-rv-step ${st.docOpened ? 'done' : 'active'}">
    <div class="qz-rv-step-h">Step 1 &middot; Open the source document</div>
    <button class="qz-btn sm" onclick="qzRevOpenDoc('${item.id}')">${st.docOpened ? 'Reopen' : 'Open'} ${esc(item.docTitle)}</button>
  </div>`;
  let step2 = '';
  if (st.docOpened) {
    const mcAnswered = !!st.step2Choice;
    const opts = item.sourceOptions.map(o =>
      `<button type="button" class="qz-option qz-rv-mc ${st.step2Choice === o.id ? 'selected' : ''}" ${mcAnswered ? 'disabled' : ''} onclick="qzRevAnswerSource('${item.id}','${o.id}')">${esc(o.text)}</button>`
    ).join('');
    // Same gating as the lesson version (qzRevItemHTML): a wrong pick here must not let the
    // trainee click through to step 3, qzRevAnswerAction silently no-ops on !step2Correct,
    // so without this the buttons below would look clickable but do nothing.
    const retry = (mcAnswered && !st.step2Correct)
      ? `<div class="qz-rv-subfeedback bad">&#10007; Not quite &mdash; review the document and try again.</div>
         <div class="qz-rv-actions"><button class="qz-btn sm" onclick="qzRevRetryStep('${item.id}',2)">Try again</button></div>`
      : '';
    step2 = `<div class="qz-rv-step ${st.step2Correct ? 'done' : 'active'}"><div class="qz-rv-step-h">Step 2 &middot; What does the source document actually say?</div>${opts}${retry}</div>`;
  }
  let step3 = '';
  if (st.step2Choice && st.step2Correct) {
    const mcAnswered = !!st.step3Choice;
    const opts = QZ_ACTION_CHOICES.map(a2 =>
      `<button type="button" class="qz-option qz-rv-mc ${st.step3Choice === a2.id ? 'selected' : ''}" ${mcAnswered ? 'disabled' : ''} onclick="qzRevAnswerAction('${item.id}','${a2.id}')">${esc(a2.label)}</button>`
    ).join('');
    const retry = (mcAnswered && !st.step3Correct && !st.resolvedAt)
      ? `<div class="qz-rv-subfeedback bad">&#10007; That's not the right next step here.</div>
         <div class="qz-rv-actions"><button class="qz-btn sm" onclick="qzRevRetryStep('${item.id}',3)">Try again</button></div>`
      : '';
    step3 = `<div class="qz-rv-step ${st.step3Correct ? 'done' : 'active'}"><div class="qz-rv-step-h">Step 3 &middot; What's the right next step?</div>${opts}${retry}</div>`;
  }
  let step4 = '';
  if (st.step3Choice === 'correct' && st.step3Correct && !st.resolvedAt) {
    step4 = `<div class="qz-rv-step active"><div class="qz-rv-step-h">Step 4 &middot; Enter the corrected value</div>
      <div class="qz-rv-form"><input type="text" id="qzRevInput-${item.id}" value="${escAttr(item.systemValue)}">
      <div class="row"><button class="qz-btn sm primary" onclick="qzRevSaveCorrection('${item.id}')">Save correction</button></div></div></div>`;
  } else if (st.step3Choice && st.step3Correct && st.step3Choice.indexOf('escalate') === 0 && !st.resolvedAt) {
    // Same gating as the lesson version: qzRevSaveEscalation won't finalize a wrong category,
    // it just re-renders this same step, so preserve what was picked/typed and say why it was
    // wrong instead of silently resetting to a blank form.
    const wrongCategory = st.step4Category && !st.step4CategoryCorrect;
    const catOpts = QZ_ESCALATION_CATEGORIES.map(c => `<option value="${c.id}" ${st.step4Category === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('');
    const wrongNote = wrongCategory ? `<div class="qz-rv-subfeedback bad">&#10007; That's not the right category. Check it and submit again.</div>` : '';
    step4 = `<div class="qz-rv-step active"><div class="qz-rv-step-h">Step 4 &middot; Escalation category</div>
      <div class="qz-rv-form"><select id="qzRevCategory-${item.id}"><option value="">Choose a category&hellip;</option>${catOpts}</select>
      <label>Note</label><textarea id="qzRevNote-${item.id}" placeholder="Describe the discrepancy...">${esc(st.note || '')}</textarea>
      ${wrongNote}
      <div class="row"><button class="qz-btn sm primary" onclick="qzRevSaveEscalation('${item.id}')">Submit escalation</button></div></div></div>`;
  }
  return `<div class="qz-rv-head"><b>${esc(item.label)}</b></div>
    <div class="qz-rv-where">${esc(item.where)}</div>
    <p class="qz-rv-instr">${esc(item.instruction)}</p>
    <div class="qz-rv-compare"><div class="col"><span class="k">On the order</span><span class="v">${esc(item.systemValue)}</span></div></div>
    ${step1}${step2}${step3}${step4}
    ${answered ? '<div class="qz-rv-subfeedback good">&#10003; Answer recorded. Use Next to continue.</div>' : ''}`;
}
function qzExamHTML() {
  const items = QZ_EXAM_ITEMS;
  const i = qzState.examIndex;
  const item = items[i];
  if (!item) return '<p>Exam not found.</p>';
  const answered = qzExamItemAnswered(item);
  let body = '';
  if (item.type === 'do') body = qzExamDoItemHTML(item, answered);
  else if (item.type === 'verify') body = qzExamVerifyItemHTML(item, answered);
  else if (item.type === 'decide') body = qzExamDecideItemHTML(item, answered);
  const isLast = i === items.length - 1;
  const nextBtn = answered
    ? `<button class="qz-btn primary" onclick="${isLast ? 'qzExamSubmit()' : 'qzExamNext()'}">${isLast ? 'Submit Exam' : 'Next'} &rarr;</button>`
    : '';
  return `<div class="qz-exam-banner"><b>Final Exam</b> &middot; Question ${i + 1} of ${items.length} &middot; no hints, no going back</div>
    <div class="qz-panel qz-exam-item">
      ${body}
      <div style="margin-top:16px">${nextBtn}</div>
    </div>`;
}
function qzExamActiveBannerHTML() {
  if (!qzStore.exam || qzStore.exam.submittedAt || qzState.view === 'exam') return '';
  return `<div class="qz-exam-banner active" onclick="qzExamReturn()">Final Exam in progress &middot; Return to Exam &rarr;</div>`;
}
function qzExamSubmit() {
  let score = 0, max = 0;
  QZ_EXAM_ITEMS.forEach(item => {
    max += item.points;
    if (item.type === 'do') { const a = qzStore.exam.answers[item.id]; if (a && a.done) score += item.points; }
    else if (item.type === 'decide') { const a = qzStore.exam.answers[item.id]; if (a && a.idx === item.correct) score += item.points; }
    else if (item.type === 'verify') { const s = qzStore.reviews[item.id]; if (s && s.correct) score += item.points; }
  });
  qzStore.exam.score = score;
  qzStore.exam.max = max;
  qzStore.exam.submittedAt = Date.now();
  qzSave();
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  if (su && window.SCApp.setModeScore) SCApp.setModeScore(su.id, 'qualia', 'exam', score, max);
  qzGoto('dashboard');
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
