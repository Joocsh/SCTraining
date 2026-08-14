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
  overrides: {}, lessons: {}, tourSeen: false, exam: null
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
  if (qzStore.checklist[id]) return;
  qzStore.checklist[id] = true;
  qzSave();
  qzNotifyStepDone(id);
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
  if (!qzStore.tourSeen && window.qzTourStart) setTimeout(qzTourStart, 350);
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
let qzWalk = null; // { lessonId, stepIndex }
function qzWalkStart(lessonId) {
  const l = QZ_LESSONS.find(x => x.id === lessonId);
  if (!l || !l.steps.every(s => s.walk)) return;
  qzWalk = { lessonId, stepIndex: 0 };
  qzWalkShowCurrent();
}
function qzWalkCurrentLesson() { return qzWalk ? QZ_LESSONS.find(x => x.id === qzWalk.lessonId) : null; }
function qzWalkCurrentStep() {
  const l = qzWalkCurrentLesson();
  return l ? l.steps[qzWalk.stepIndex] : null;
}
function qzWalkShowCurrent() {
  document.getElementById('qzWalk').classList.add('open');
  const step = qzWalkCurrentStep();
  if (!step) { qzWalkShowComplete(); return; }
  if (step.walk.setup) step.walk.setup();
  qzWalkRenderTip(step, false);
  requestAnimationFrame(() => requestAnimationFrame(() => qzWalkPosition(step)));
}
function qzWalkRenderTip(step, done) {
  const l = qzWalkCurrentLesson();
  const body = document.getElementById('qzWalkTipBody');
  if (done) {
    body.innerHTML = `<b>&#10003; Nice.</b><p>Moving to the next step&hellip;</p>`;
  } else {
    body.innerHTML = `<b>Lesson ${l.number} &middot; Step ${qzWalk.stepIndex + 1} of ${l.steps.length}</b><p>${esc(step.walk.text)}</p>
      <div class="qz-walk-exit" onclick="qzWalkExit()">Exit walkthrough</div>`;
  }
}
/* Wrong answer on a `decide` step: don't advance, don't reveal the answer, just point
   the trainee back at the feedback + Try Again control the scenario page already shows. */
function qzWalkRenderRetry() {
  const body = document.getElementById('qzWalkTipBody');
  body.innerHTML = `<b>Not quite.</b><p>Read the explanation below, then click "Try Again" to retry this scenario.</p>
    <div class="qz-walk-exit" onclick="qzWalkExit()">Exit walkthrough</div>`;
}
function qzWalkStepDone() {
  const step = qzWalkCurrentStep();
  if (!step) return;
  qzWalkRenderTip(step, true);
  setTimeout(() => {
    if (!qzWalk) return; // walkthrough may have been exited during the pause
    qzWalk.stepIndex++;
    qzWalkShowCurrent();
  }, 900);
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
function qzWalkPosition(step) {
  const highlight = document.getElementById('qzWalkHighlight');
  const tip = document.getElementById('qzWalkTip');
  const el = qzWalkResolveTarget(step.walk.target);
  const rect = el ? el.getBoundingClientRect() : null;
  tip.style.transform = 'none';
  if (!rect) {
    // No single element to point at (e.g. a `decide` step, the whole page is the content) —
    // float the tip in a fixed corner instead of leaving it stale from the previous step.
    highlight.style.opacity = '0';
    const margin = 18;
    tip.style.top = margin + 'px';
    tip.style.left = (window.innerWidth - 300 - margin) + 'px';
    return;
  }
  highlight.style.opacity = '1';
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
  document.getElementById('qzWalkTipBody').innerHTML =
    `<b>&#127881; Lesson ${l.number} complete!</b><p>Great work, you finished every step. The next lesson is unlocked from the Dashboard.</p>
     <button class="qz-btn primary" style="margin-top:10px" onclick="qzWalkBackToLessons()">Back to Lessons</button>`;
  tip.style.top = '50%';
  tip.style.left = '50%';
  tip.style.transform = 'translate(-50%,-50%)';
}
function qzWalkBackToLessons() {
  qzWalk = null;
  document.getElementById('qzWalk').classList.remove('open');
  qzGoto('dashboard');
}
function qzWalkExit(silent) {
  const l = qzWalkCurrentLesson();
  qzWalk = null;
  const w = document.getElementById('qzWalk');
  if (w) w.classList.remove('open');
  if (!silent) {
    if (l) { qzState.view = 'lesson'; qzState.lessonId = l.id; qzSyncTopTabs(); }
    qzRenderRoot();
  }
}
function qzWalkReposition() {
  if (qzWalk) { const step = qzWalkCurrentStep(); if (step) qzWalkPosition(step); }
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
      <button class="qz-btn sm" onclick="qzExamResetAttempt()">Reset my exam attempt (training only)</button></div>`;
  }
  if (ex && !ex.submittedAt) {
    return `<div class="qz-exam-card"><b>Final Exam</b><p>In progress &mdash; question ${(ex.currentIndex || 0) + 1} of ${QZ_EXAM_ITEMS.length}.</p>
      <button class="qz-btn primary" onclick="qzExamReturn()">Resume Exam</button></div>`;
  }
  if (!unlocked) return `<div class="qz-exam-card locked"><b>Final Exam</b><p>Unlocks once all 12 lessons are complete.</p></div>`;
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
  return `
    <div class="qz-welcome"><h2>Welcome back, ${esc(firstName)}</h2><p>This is your Qualia practice environment. Work through the lessons in order, nothing here is connected to a real account or real clients.</p></div>
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
function qzOrdersRowsHTML() {
  const filter = (qzState.orderFilter || '').toLowerCase().trim();
  const rows = qzAllOrders().filter(o => !filter
    || o.propertyAddress.toLowerCase().includes(filter)
    || o.id.toLowerCase().includes(filter)
    || o.parties.some(p => p.name.toLowerCase().includes(filter)));
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
  if (v && v.trim()) qzMark('orders-search');
  if (qzState.view !== 'orders') {
    qzState.view = 'orders';
    qzState.orderId = null;
    qzSyncTopTabs();
    qzRenderRoot();
  } else {
    const body = document.getElementById('qzOrdersBody');
    if (body) body.innerHTML = qzOrdersRowsHTML();
  }
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
}
function qzRevAnswerSource(id, optionId) {
  const r = qzReviewLookup(id);
  const st = qzRevGet(id);
  if (!st.docOpened || st.step2Choice) return;
  st.step2Choice = optionId;
  st.step2Correct = optionId === r.rightSourceOptionId;
  qzSave();
  qzRenderRoot();
}
function qzRevAnswerAction(id, action) {
  const r = qzReviewLookup(id);
  const st = qzRevGet(id);
  if (!st.step2Choice || st.step3Choice) return;
  st.step3Choice = action;
  st.step3Correct = action === r.rightAction;
  if (action === 'none') { qzRevFinalize(id); return; }
  qzSave();
  qzRenderRoot();
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
  qzRevFinalize(id);
}
function qzRevFinalize(id) {
  const st = qzRevGet(id);
  const parts = [st.step2Correct, st.step3Correct];
  if (st.step3Choice && st.step3Choice.indexOf('escalate') === 0) parts.push(st.step4CategoryCorrect);
  st.correct = parts.every(Boolean);
  st.resolvedAt = Date.now();
  qzSave();
  qzRenderRoot();
}
function qzRevRetry(id) {
  qzStore.reviews[id] = { docOpened: qzStore.reviews[id] ? qzStore.reviews[id].docOpened : false };
  qzSave();
  qzRenderRoot();
}
function qzRevItemHTML(id) {
  const r = qzReviewLookup(id);
  if (!r) return '';
  const st = qzRevGet(id);
  const done = !!st.resolvedAt;

  const statusChip = done
    ? `<span class="qz-rv-chip ${st.correct ? 'good' : 'bad'}">${st.correct ? 'Correct' : 'Needs another look'}</span>`
    : '<span class="qz-rv-chip pending">Pending</span>';

  const step1 = `<div class="qz-rv-step ${st.docOpened ? 'done' : 'active'}">
    <div class="qz-rv-step-h">Step 1 &middot; Open the source document</div>
    <button class="qz-btn sm" onclick="qzRevOpenDoc('${id}')">${st.docOpened ? 'Reopen' : 'Open'} ${esc(r.docTitle)}</button>
  </div>`;

  let step2 = '';
  if (st.docOpened) {
    const optsHtml = r.sourceOptions.map(o => {
      let cls = '';
      if (st.step2Choice) {
        if (o.id === r.rightSourceOptionId) cls = 'correct';
        else if (o.id === st.step2Choice) cls = 'incorrect';
      }
      return `<button type="button" class="qz-option qz-rv-mc ${cls}" ${st.step2Choice ? 'disabled' : ''} onclick="qzRevAnswerSource('${id}','${o.id}')">${esc(o.text)}</button>`;
    }).join('');
    step2 = `<div class="qz-rv-step ${st.step2Choice ? 'done' : 'active'}">
      <div class="qz-rv-step-h">Step 2 &middot; What does the source document actually say?</div>
      ${optsHtml}
    </div>`;
  }

  let step3 = '';
  if (st.step2Choice) {
    const optsHtml = QZ_ACTION_CHOICES.map(a => {
      let cls = '';
      if (st.step3Choice) {
        if (a.id === r.rightAction) cls = 'correct';
        else if (a.id === st.step3Choice) cls = 'incorrect';
      }
      return `<button type="button" class="qz-option qz-rv-mc ${cls}" ${st.step3Choice ? 'disabled' : ''} onclick="qzRevAnswerAction('${id}','${a.id}')">${esc(a.label)}</button>`;
    }).join('');
    step3 = `<div class="qz-rv-step ${st.step3Choice ? 'done' : 'active'}">
      <div class="qz-rv-step-h">Step 3 &middot; What's the right next step?</div>
      ${optsHtml}
    </div>`;
  }

  let step4 = '';
  if (st.step3Choice === 'correct' && !done) {
    step4 = `<div class="qz-rv-step active">
      <div class="qz-rv-step-h">Step 4 &middot; Enter the corrected value</div>
      <div class="qz-rv-form">
        <input type="text" id="qzRevInput-${id}" value="${escAttr(r.systemValue)}">
        <div class="row"><button class="qz-btn sm primary" onclick="qzRevSaveCorrection('${id}')">Save correction</button></div>
      </div>
    </div>`;
  } else if (st.step3Choice && st.step3Choice.indexOf('escalate') === 0 && !done) {
    const catOpts = QZ_ESCALATION_CATEGORIES.map(c => `<option value="${c.id}">${esc(c.label)}</option>`).join('');
    step4 = `<div class="qz-rv-step active">
      <div class="qz-rv-step-h">Step 4 &middot; Escalation category</div>
      <div class="qz-rv-form">
        <select id="qzRevCategory-${id}"><option value="">Choose a category&hellip;</option>${catOpts}</select>
        <label>Note (not graded, for practice)</label>
        <textarea id="qzRevNote-${id}" placeholder="Describe the discrepancy and why it needs a decision..."></textarea>
        <div class="row"><button class="qz-btn sm primary" onclick="qzRevSaveEscalation('${id}')">Submit escalation</button></div>
      </div>
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
    if (st.step3Choice && st.step3Choice.indexOf('escalate') === 0) {
      bits.push(st.step4CategoryCorrect
        ? '<div class="qz-rv-subfeedback good">&#10003; Picked the right escalation category.</div>'
        : `<div class="qz-rv-subfeedback bad">&#10007; The right category was: "${esc(QZ_ESCALATION_CATEGORIES.find(c => c.id === r.rightCategory).label)}"</div>`);
    }
    const noteLine = st.note ? `<div class="qz-rv-note">Your note: ${esc(st.note)}</div>` : '';
    feedback = `<div class="qz-rv-feedback ${st.correct ? 'good' : 'bad'}">
      <b>${st.correct ? 'Right call.' : 'Not quite.'}</b> ${esc(r.explain)}
      ${bits.join('')}${noteLine}
      <div style="margin-top:10px"><button class="qz-btn sm" onclick="qzRevRetry('${id}')">Redo</button></div>
    </div>`;
  }

  return `<div class="qz-rv-item">
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
  return `<div class="qz-panel">
    <div class="ph"><h4>Document Review</h4><span class="qz-rv-score">${score.resolved}/${score.total} reviewed &middot; ${score.correct} correct calls</span></div>
    <p style="font-size:13px;color:var(--qz-muted);margin:0 0 18px">Open the source document, work through each step, and report what you find: verify it, correct it, or escalate it.</p>
    ${items.map(r => qzRevItemHTML(r.id)).join('')}
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
  if (typeof qzWalkReposition === 'function') qzWalkReposition();
}
function qzDeSaveChanges(orderId) {
  const sub = qzState.deTab || 'property';
  if (sub === 'property') {
    const street = (document.getElementById('qzDeStreet').value || '').trim();
    const city = (document.getElementById('qzDeCity').value || '').trim();
    const stateZip = (document.getElementById('qzDeStateZip').value || '').trim();
    const propType = (document.getElementById('qzDePropType').value || '').trim();
    const addr = [street, city, stateZip].filter(Boolean).join(', ');
    if (addr) qzSetScalarOverride(orderId, 'propertyAddress', addr);
    if (propType) qzSetScalarOverride(orderId, 'propertyType', propType);
  } else if (sub === 'parties') {
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
    });
    qzMark('de-edit');
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
  qzToast('Changes saved.', { tone: 'good' });
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
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') qzCloseDoc();
});
function qzDocumentsHTML(o) {
  const rows = qzDocsForOrder(o.id).map(d => {
    const st = qzDocStatus(d);
    const badgeClass = st === 'Pending' ? 'pending' : st === 'Received' ? 'received' : 'reviewed';
    let actions = '';
    if (st === 'Pending') actions = `<button class="qz-btn sm primary" onclick="qzUploadDoc(${d.id})">Upload</button>`;
    else {
      actions = d.file
        ? `<button class="qz-btn sm" onclick="qzViewDoc('${d.file}','${esc(d.name)}')">View</button>`
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
  const feedback = answered ? `<div class="qz-feedback ${r.correct ? 'correct' : 'incorrect'}">
      <b>${r.correct ? 'Correct.' : 'Not quite.'}</b>${esc(s.explanation)}
      ${firstAttemptLine}
      <div class="qz-feedback-actions">
        ${r.correct && s.verifyDoc ? `<button class="qz-btn" onclick="qzViewDoc('${s.verifyDoc.file}','${esc(s.verifyDoc.title)}')">${esc(s.verifyDoc.buttonLabel)}</button>` : ''}
        ${s.practice ? `<button class="qz-btn primary" onclick="qzPracticeAction('${s.id}')">${esc(s.practice.buttonLabel)} &rarr;</button>` : ''}
        ${r.practiced ? '<span class="qz-rv-chip good">Practiced</span>' : ''}
        <button class="qz-btn" onclick="qzRetakeScenario('${s.id}')">${r.correct ? 'Retake Scenario' : 'Try Again'}</button>
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
function qzExamResetAttempt() {
  if (!confirm('This clears your recorded exam result on this device. Continue?')) return;
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
    const opts = item.sourceOptions.map(o =>
      `<button type="button" class="qz-option qz-rv-mc ${st.step2Choice === o.id ? 'selected' : ''}" ${st.step2Choice ? 'disabled' : ''} onclick="qzRevAnswerSource('${item.id}','${o.id}')">${esc(o.text)}</button>`
    ).join('');
    step2 = `<div class="qz-rv-step ${st.step2Choice ? 'done' : 'active'}"><div class="qz-rv-step-h">Step 2 &middot; What does the source document actually say?</div>${opts}</div>`;
  }
  let step3 = '';
  if (st.step2Choice) {
    const opts = QZ_ACTION_CHOICES.map(a2 =>
      `<button type="button" class="qz-option qz-rv-mc ${st.step3Choice === a2.id ? 'selected' : ''}" ${st.step3Choice ? 'disabled' : ''} onclick="qzRevAnswerAction('${item.id}','${a2.id}')">${esc(a2.label)}</button>`
    ).join('');
    step3 = `<div class="qz-rv-step ${st.step3Choice ? 'done' : 'active'}"><div class="qz-rv-step-h">Step 3 &middot; What's the right next step?</div>${opts}</div>`;
  }
  let step4 = '';
  if (st.step3Choice === 'correct' && !st.resolvedAt) {
    step4 = `<div class="qz-rv-step active"><div class="qz-rv-step-h">Step 4 &middot; Enter the corrected value</div>
      <div class="qz-rv-form"><input type="text" id="qzRevInput-${item.id}" value="${escAttr(item.systemValue)}">
      <div class="row"><button class="qz-btn sm primary" onclick="qzRevSaveCorrection('${item.id}')">Save correction</button></div></div></div>`;
  } else if (st.step3Choice && st.step3Choice.indexOf('escalate') === 0 && !st.resolvedAt) {
    const catOpts = QZ_ESCALATION_CATEGORIES.map(c => `<option value="${c.id}">${esc(c.label)}</option>`).join('');
    step4 = `<div class="qz-rv-step active"><div class="qz-rv-step-h">Step 4 &middot; Escalation category</div>
      <div class="qz-rv-form"><select id="qzRevCategory-${item.id}"><option value="">Choose a category&hellip;</option>${catOpts}</select>
      <label>Note</label><textarea id="qzRevNote-${item.id}" placeholder="Describe the discrepancy..."></textarea>
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
