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

/* v2: the v1 grader credited unverified corrections and gave away free exam points, so any
   progress earned under it recorded passes that were never actually earned. Bumping the key
   discards it rather than carrying false completions forward. */
/* v2: the v1 grader credited unverified corrections and gave away free exam points, so any
   progress earned under it recorded passes that were never actually earned. Bumping the key
   discards it rather than carrying false completions forward. */
const QZ_LS_KEY = 'qz_va_training_v2';

/* Academic progress store (persisted in localStorage). Only coursework lives here. */
const QZ_STORE_DEFAULTS = {
  checklist: {},
  scenarios: {},
  reviews: {},
  reconciles: {},
  composes: {},
  exam: null,
  // Which lessons have ever been finished. Gating reads this instead of live progress,
  // so restarting a lesson to replay it cannot re-lock the ones after it.
  lessonsDone: {},
  // Set once qzMigrateChecklistScope has run against this store.
  checklistScoped: false,
  shuffleSalt: null,
  tourSeen: false
};
function qzDefaultStore() { return JSON.parse(JSON.stringify(QZ_STORE_DEFAULTS)); }
let qzStore = qzDefaultStore();

/* In-memory sandbox/demo store (cleared on F5 reload). All product mutations live here. */
const QZ_DEMO_DEFAULTS = {
  overrides: {},
  docStatus: {},
  taskStatus: {},
  notes: {},
  replies: {},
  orders: [],
  parties: {},
  documents: {},
  tasks: {},
  vendors: {},
  contacts: [],
  events: [],
  receipts: [],
  disbursements: [],
  invoices: [],
  users: [],
  exceptions: []
};
function qzDefaultDemo() { return JSON.parse(JSON.stringify(QZ_DEMO_DEFAULTS)); }
let qzDemo = qzDefaultDemo();

let qzState = {
  view: 'dashboard', orderId: null, orderTab: 'overview', deTab: 'property', threadId: null,
  composeId: null,   // a compose exercise the trainee opened by hand from the thread list
  scenarioId: null, orderFilter: '', lessonId: null, examIndex: 0,
  railOpen: false,     // narrow-screen only: is the order rail showing as an overlay drawer?
  openOrders: [],      // Core keeps several files open at once (see qzRenderOrderTabs)
  orderViews: {},      // per-order view state, so switching tabs restores where you were
  panel: { chat: true, tasks: true, help: true, notes: false },
  qzMode: 'sandbox'   // 'sandbox' | 'lesson'
};

function qzLoad() {
  try {
    const raw = localStorage.getItem(QZ_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Silent migration: delete old sandbox keys if present in legacy stores
      delete parsed.overrides;
      delete parsed.docStatus;
      delete parsed.taskStatus;
      delete parsed.notes;
      delete parsed.replies;
      qzStore = Object.assign(qzDefaultStore(), parsed);
    } else {
      qzStore = qzDefaultStore();
    }
  } catch (e) { qzStore = qzDefaultStore(); }
}
function qzSave() { localStorage.setItem(QZ_LS_KEY, JSON.stringify(qzStore)); }

/* One-time backfill for progress saved before checklist keys became order-scoped */
function qzMigrateChecklistScope() {
  if (qzStore.checklistScoped || typeof QZ_LESSONS === 'undefined') return;
  QZ_LESSONS.forEach(l => {
    if (!qzStore.lessonsDone[l.id]) return;
    l.steps.forEach(s => {
      if (s.type !== 'do' || !s.orderId) return;
      if (qzStore.checklist[s.checklistId]) qzStore.checklist[qzScopedChecklistKey(s.checklistId, s.orderId)] = true;
    });
  });
  qzStore.checklistScoped = true;
  qzSave();
}

function qzScopedChecklistKey(id, orderId) { return orderId ? id + '@' + orderId : id; }

/* Modal confirmation dialog (Type B) */
function qzConfirm(opts) {
  const modal = document.createElement('div');
  modal.id = 'qzConfirmModalWrap';
  modal.className = 'qz-modal-backdrop';
  modal.innerHTML = `
    <div class="qz-modal-card">
      <div class="qz-modal-head">
        <h3>${esc(opts.title || 'Confirm Action')}</h3>
        <button type="button" class="qz-modal-close" onclick="document.getElementById('qzConfirmModalWrap').remove()">&times;</button>
      </div>
      <div class="qz-modal-body">
        <p>${esc(opts.body || 'Are you sure you want to proceed?')}</p>
        ${opts.list ? `<ul>${opts.list.map(it => `<li>${esc(it)}</li>`).join('')}</ul>` : ''}
      </div>
      <div class="qz-modal-foot">
        <button type="button" class="qz-btn" onclick="document.getElementById('qzConfirmModalWrap').remove()">${esc(opts.cancelLabel || 'Cancel')}</button>
        <button type="button" class="qz-btn ${opts.danger ? 'danger' : 'primary'}" id="qzBtnConfirmModal">${esc(opts.confirmLabel || 'Confirm')}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('qzBtnConfirmModal').onclick = () => {
    modal.remove();
    if (opts.onConfirm) opts.onConfirm();
  };
}

/* Reset sandbox to factory state without touching course progress */
function qzResetSandbox() {
  qzConfirm({
    title: 'Reset Sandbox',
    body: 'Are you sure you want to reset the Sandbox environment? All custom orders, modified documents, and temporary edits will be discarded. Your coursework and academic progress will remain completely untouched.',
    confirmLabel: 'Reset Sandbox',
    danger: true,
    onConfirm: () => {
      qzDemo = qzDefaultDemo();
      simToast('Sandbox reset to factory defaults. Academic progress preserved.', { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzSetMode(mode) {
  qzState.qzMode = mode;
  qzSyncModeSwitch();
  qzRenderRoot();
}

function qzSyncModeSwitch() {
  const isDemoUrl = window.location.search.indexOf('demo=1') !== -1;
  const wrap = document.getElementById('qzModeSwitch');
  if (wrap) {
    if (isDemoUrl) {
      wrap.style.display = 'none';
      return;
    }
    wrap.style.display = 'inline-flex';
    wrap.innerHTML = `
      <button type="button" class="qz-mode-btn ${qzState.qzMode === 'sandbox' ? 'active' : ''}" onclick="qzSetMode('sandbox')" title="Free exploration mode. Edits do not affect lesson scoring.">Sandbox</button>
      <button type="button" class="qz-mode-btn ${qzState.qzMode === 'lesson' ? 'active lesson' : ''}" onclick="qzSetMode('lesson')" title="Lesson mode. Actions contribute to coursework and checklist progress.">Lesson</button>
    `;
  }
}

function qzMark(id) {
  // Navigation and exploration in Sandbox mode never grades or marks checklist items
  if (qzState.qzMode !== 'lesson') return;

  const scopedKey = qzScopedChecklistKey(id, qzState.orderId);
  const alreadyDone = !!qzStore.checklist[scopedKey];
  if (!alreadyDone || !qzStore.checklist[id]) {
    qzStore.checklist[id] = true;
    qzStore.checklist[scopedKey] = true;
    qzSave();
  }

  const step = (SimEngine.walkActive()) ? SimEngine.currentStep() : null;
  const walkActiveOnThis = step && step.type === 'do' && step.checklistId === id &&
    (!step.orderId || step.orderId === qzState.orderId);
  if (!alreadyDone || walkActiveOnThis) qzNotifyStepDone(id);
}

function qzNotifyStepDone(checklistId) {
  if (!qzState.lessonId || typeof QZ_LESSONS === 'undefined') return;
  const l = QZ_LESSONS.find(x => x.id === qzState.lessonId);
  if (!l) return;
  const step = l.steps.find(s => s.type === 'do' && s.checklistId === checklistId &&
    (!s.orderId || s.orderId === qzState.orderId));
  if (!step) return;

  if (SimEngine.walkActive() && SimEngine.currentStep() === step) {
    SimEngine.stepCompleted();
    return;
  }

  const label = qzLessonStepLabel(step);
  const prog = SimEngine.progress(l);
  if (prog.complete) simToast(`Lesson ${l.number} complete! Use the banner above to head back and unlock the next lesson.`, { tone: 'good', duration: 5000 });
  else simToast(`"${label}" done, ${prog.done} of ${prog.total} steps in Lesson ${l.number}.`, { tone: 'good' });
  qzRenderLessonBanner();
}

/* esc/escAttr are bound from the shared engine rather than redefined — the project keeps
   exactly one definition of each (assets/js/sim-engine.js), while the short local names
   stay usable at the several hundred call sites in this file. */
const esc = SimEngine.esc;
const escAttr = SimEngine.escAttr;

function fmtMoney(n) { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(iso) {
  if (!iso || iso === '—') return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ---------- deterministic option shuffling ----------
   Every multiple choice in the project used to render its options in authoring order, and
   the correct one was written second far more often than not — across the whole item bank,
   "always answer B" scored higher than reading the questions. Position is now decided by a
   PRNG seeded on the item's id plus a per-session salt, so:
     - the same question keeps the same order while you're looking at it (no reshuffle on
       every re-render, which would move an option out from under the cursor),
     - a different attempt gets a different order (the salt is regenerated on exam start
       and on exam reset), and
     - authoring order carries no signal at all.
   Handlers still receive the REAL index/id, so grading never has to unmap anything. */
function qzHashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function qzMulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function qzShuffleSalt() {
  if (!qzStore.shuffleSalt) {
    qzStore.shuffleSalt = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    qzSave();
  }
  return qzStore.shuffleSalt;
}
function qzNewShuffleSalt() {
  qzStore.shuffleSalt = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  qzSave();
}
/* Returns an array `order` of length n where order[displayedPosition] === originalIndex. */
function qzOptionOrder(itemId, n) {
  const rand = qzMulberry32(qzHashString(String(itemId) + '|' + qzShuffleSalt()));
  const order = [];
  for (let i = 0; i < n; i++) order.push(i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
  }
  return order;
}
/* Development check for B-1's acceptance criterion: with the current salt, how often does
   the correct answer land in each displayed position across the whole bank? No position
   should dominate. Call qzAnswerDistribution() from the console. */
function qzAnswerDistribution() {
  const counts = [0, 0, 0, 0], rows = [];
  const record = (id, correctRealIdx, n) => {
    const order = qzOptionOrder(id, n);
    const shown = order.indexOf(correctRealIdx);
    if (shown > -1 && shown < counts.length) counts[shown]++;
    rows.push({ id, shownAt: 'ABCD'[shown] });
  };
  QZ_SCENARIOS.forEach(s => record('scenario:' + s.id, s.correct, s.options.length));
  if (typeof QZ_EXAM_BANK !== 'undefined') {
    QZ_EXAM_BANK.forEach(i => {
      if (i.type === 'decide') record('scenario:' + i.id, i.correct, i.options.length);
      if (i.type === 'verify') {
        const real = i.sourceOptions.findIndex(o => o.id === i.rightSourceOptionId);
        record('rev2:' + i.id, real, i.sourceOptions.length);
      }
    });
  }
  QZ_REVIEWS.forEach(r => {
    const real = r.sourceOptions.findIndex(o => o.id === r.rightSourceOptionId);
    record('rev2:' + r.id, real, r.sourceOptions.length);
  });
  const total = counts.reduce((a, b) => a + b, 0);
  const pct = counts.map(c => Math.round(c / total * 100));
  return { total, counts, percentByPosition: { A: pct[0], B: pct[1], C: pct[2], D: pct[3] }, max: Math.max.apply(null, pct), rows };
}

/* ---------- "today" and due-date arithmetic ----------
   Everything time-related is measured against QZ_TODAY, never against the real clock: the
   dataset is a fixed snapshot, so a real Date.now() would drift it into nonsense within
   days of writing it. Lesson content that quotes a countdown ("closing is in N days") calls
   these instead of hardcoding a number that the data can silently contradict later. */
function qzDaysFromToday(iso) {
  if (!iso || iso === '—') return null;
  const d = new Date(iso + 'T00:00:00'), t = new Date(QZ_TODAY + 'T00:00:00');
  if (isNaN(d)) return null;
  return Math.round((d - t) / 86400000);
}
/* Business days, ignoring holidays — enough for "closing is in N business days" copy. */
function qzBusinessDaysFromToday(iso) {
  const total = qzDaysFromToday(iso);
  if (total === null || total < 0) return total;
  let count = 0;
  const cur = new Date(QZ_TODAY + 'T00:00:00');
  for (let i = 0; i < total; i++) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}
function qzDaysPhrase(iso) {
  const n = qzDaysFromToday(iso);
  if (n === null) return 'no date set';
  if (n < 0) return `${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} ago`;
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  return `in ${n} days`;
}
/* Small colored chip for task/document tables: overdue, due today, due soon, or neutral. */
function qzDueChipHTML(iso) {
  const n = qzDaysFromToday(iso);
  if (n === null) return '';
  let cls = 'far', text;
  if (n < 0) { cls = 'overdue'; text = `${Math.abs(n)}d overdue`; }
  else if (n === 0) { cls = 'today'; text = 'due today'; }
  else if (n <= 3) { cls = 'soon'; text = `in ${n}d`; }
  else text = `in ${n}d`;
  return `<span class="qz-due ${cls}">${text}</span>`;
}



/* ---------- data lookups (respect in-session overrides) ---------- */
function qzDocsForOrder(orderId) {
  const custom = (qzDemo.documents && qzDemo.documents[orderId]) || [];
  const base = QZ_DOCUMENTS.filter(d => d.orderId === orderId);
  const cat = typeof QZC_DOCUMENTS !== 'undefined' ? QZC_DOCUMENTS.filter(d => d.orderId === orderId) : [];
  const exam = typeof QZ_EXAM_DOCUMENTS !== 'undefined' ? QZ_EXAM_DOCUMENTS.filter(d => d.orderId === orderId) : [];
  return base.concat(cat).concat(custom).concat(exam);
}
function qzDocStatus(d) { return qzDemo.docStatus[d.id] || d.status; }
function qzTasksForOrder(orderId) {
  const custom = (qzDemo.tasks && qzDemo.tasks[orderId]) || [];
  const base = QZ_TASKS.filter(t => t.relatedOrderId === orderId);
  const cat = typeof QZC_TASKS !== 'undefined' ? QZC_TASKS.filter(t => t.relatedOrderId === orderId) : [];
  return base.concat(cat).concat(custom);
}
function qzTaskStatus(t) { return qzDemo.taskStatus[t.id] || t.status; }

/* ---------- per-order override layer (persists edits made in Data Entry / Review) ---------- */
function qzBaseOrder(orderId) {
  const curric = QZ_ORDERS.find(o => o.id === orderId);
  if (curric) return curric;
  const demoOrder = (qzDemo.orders && qzDemo.orders.find(o => o.id === orderId));
  if (demoOrder) return demoOrder;
  const catalogOrder = (typeof QZC_ORDERS !== 'undefined' && QZC_ORDERS.find(o => o.id === orderId));
  if (catalogOrder) return catalogOrder;
  if (typeof QZ_EXAM_ORDER !== 'undefined' && QZ_EXAM_ORDER.id === orderId) return QZ_EXAM_ORDER;
  return null;
}
function qzOverrideOrder(orderId) { return qzDemo.overrides[orderId] || {}; }
function qzAllOrders() {
  const all = QZ_ORDERS.concat(qzDemo.orders || []).concat(typeof QZC_ORDERS !== 'undefined' ? QZC_ORDERS : []);
  return all.map(o => qzGetOrder(o.id));
}
function qzGetOrder(orderId) {
  const base = qzBaseOrder(orderId);
  if (!base) return null;
  const ov = qzOverrideOrder(orderId);
  const customParties = (qzDemo.parties && qzDemo.parties[orderId]) || [];
  const initialParties = (base.parties || []).concat(customParties);
  if (!ov.scalars && !ov.parties && !customParties.length) return base;
  const merged = Object.assign({}, base, ov.scalars || {});
  merged.parties = initialParties.map(p => {
    const po = ov.parties && ov.parties[p.role];
    return po ? Object.assign({}, p, po) : p;
  });
  return merged;
}
function qzSetPartyOverride(orderId, role, patch) {
  const ov = qzDemo.overrides[orderId] = qzDemo.overrides[orderId] || {};
  ov.parties = ov.parties || {};
  ov.parties[role] = Object.assign({}, ov.parties[role], patch);
}
/* Explicit list, never guessed by regex: these order fields are consumed as numbers
   (fmtMoney, Number(), arithmetic in Accounting). A trainee typing a perfectly reasonable
   "$425.00" into a correction field used to be stored verbatim, and Number("$425.00") is
   NaN, which rendered "$NaN" rows and an NaN total in Accounting. Every write path that can
   set one of these goes through qzCoerceFieldValue. */
const QZ_NUMERIC_FIELDS = ['purchasePrice', 'loanAmount', 'inspectionCharge'];
/* Currency/'$'/comma-tolerant parse. Returns null when there's no number in there at all,
   so callers can reject the input instead of silently storing NaN. */
function qzParseNumeric(v) {
  const cleaned = String(v == null ? '' : v).replace(/[^0-9.\-]/g, '');
  if (!cleaned || cleaned === '.' || cleaned === '-') return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}
function qzCoerceFieldValue(field, value) {
  if (QZ_NUMERIC_FIELDS.indexOf(field) === -1) return value;
  const n = qzParseNumeric(value);
  return n === null ? value : n;
}
/* Comparison-only normalization for grading a typed correction: ignores currency symbols,
   thousands separators, trailing ".00", redundant whitespace and letter case, so "John
   Smith", "  john   smith " and "$425.00" / "425" all grade the way a human reviewer would.
   The value the trainee actually typed is stored separately, untouched. */
function qzNormalizeValue(v) {
  let s = String(v == null ? '' : v).replace(/[$,]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (/^-?\d+(\.\d+)?$/.test(s)) s = String(parseFloat(s));
  return s;
}
function qzSetScalarOverride(orderId, field, value) {
  const ov = qzDemo.overrides[orderId] = qzDemo.overrides[orderId] || {};
  ov.scalars = ov.scalars || {};
  ov.scalars[field] = qzCoerceFieldValue(field, value);
}

/* ---------- lesson progress: ledger + per-lesson restart ----------
   Progress itself is derived from the item stores (checklist / scenarios / reviews /
   reconciles / composes), never stored as a lesson-level flag — that stays true. What IS
   stored is whether a lesson was ever finished, which is what unlocking reads. */
function qzLessonEverComplete(lessonId) { return !!qzStore.lessonsDone[lessonId]; }
function qzNoteLessonComplete(lessonId) {
  if (qzStore.lessonsDone[lessonId]) return;   // idempotent: called from every progress read
  qzStore.lessonsDone[lessonId] = true;
  qzSave();
}

function qzClearPartyOverride(orderId, role, field) {
  const ov = qzDemo.overrides[orderId];
  if (!ov || !ov.parties || !ov.parties[role]) return;
  delete ov.parties[role][field];
  if (!Object.keys(ov.parties[role]).length) delete ov.parties[role];
}
function qzClearScalarOverride(orderId, field) {
  const ov = qzDemo.overrides[orderId];
  if (!ov || !ov.scalars) return;
  delete ov.scalars[field];
}

/* Wipes an item's working state but keeps firstAttempt. Replaying a lesson is practice; it
   must not be able to overwrite the answer the trainee actually gave the first time, which is
   what the recorded grade is derived from. */
function qzResetItemState(bag, id) {
  const prev = bag[id];
  if (prev && prev.firstAttempt) bag[id] = { firstAttempt: prev.firstAttempt };
  else delete bag[id];
}

/* Undoes the world-state changes a lesson makes, so a replay starts where the first run did. */
const QZ_LESSON_UNDO = {
  'l02-data-entry': () => qzClearPartyOverride('ORD-2026-1483', 'Buyer', 'phone'),
  'l04-documents': () => { if (qzDemo.docStatus) delete qzDemo.docStatus[3]; },
  'l05-communication': () => { if (qzDemo.replies) delete qzDemo.replies[3]; },
  'l06-tasks': () => { if (qzDemo.taskStatus) delete qzDemo.taskStatus[7]; }
};

/* Auto-repair helper to detect and restore orders referenced in lessons */
function qzOrderHasDemoEdits(orderId) {
  if (!qzDemo) return false;
  if (qzDemo.overrides && qzDemo.overrides[orderId] && Object.keys(qzDemo.overrides[orderId]).length > 0) return true;
  if (qzDemo.notes && qzDemo.notes[orderId]) return true;
  if (qzDemo.parties && qzDemo.parties[orderId] && qzDemo.parties[orderId].length > 0) return true;
  if (qzDemo.documents && qzDemo.documents[orderId] && qzDemo.documents[orderId].length > 0) return true;
  if (qzDemo.tasks && qzDemo.tasks[orderId] && qzDemo.tasks[orderId].length > 0) return true;
  const docs = qzDocsForOrder(orderId);
  for (const d of docs) {
    if (qzDemo.docStatus && qzDemo.docStatus[d.id]) return true;
  }
  const tasks = qzTasksForOrder(orderId);
  for (const t of tasks) {
    if (qzDemo.taskStatus && qzDemo.taskStatus[t.id]) return true;
  }
  return false;
}

function qzRestoreOrder(orderId) {
  if (!qzDemo) return;
  if (qzDemo.overrides) delete qzDemo.overrides[orderId];
  if (qzDemo.notes) delete qzDemo.notes[orderId];
  if (qzDemo.parties) delete qzDemo.parties[orderId];
  if (qzDemo.documents) delete qzDemo.documents[orderId];
  if (qzDemo.tasks) delete qzDemo.tasks[orderId];

  const docs = qzDocsForOrder(orderId);
  docs.forEach(d => {
    if (qzDemo.docStatus) delete qzDemo.docStatus[d.id];
  });
  const tasks = qzTasksForOrder(orderId);
  tasks.forEach(t => {
    if (qzDemo.taskStatus) delete qzDemo.taskStatus[t.id];
  });
  if (typeof QZ_MESSAGES !== 'undefined') {
    const orderThreads = QZ_MESSAGES.filter(m => m.orderId === orderId);
    orderThreads.forEach(t => {
      if (qzDemo.replies) delete qzDemo.replies[t.id];
    });
  }
}

function qzOpenLesson(lessonId) {
  const l = typeof QZ_LESSONS !== 'undefined' ? QZ_LESSONS.find(x => x.id === lessonId) : null;
  if (!l) return;

  const orders = [];
  l.steps.forEach(s => {
    if (s.orderId && orders.indexOf(s.orderId) === -1) orders.push(s.orderId);
    if (s.reviewId) {
      const r = qzReviewLookup(s.reviewId);
      if (r && r.orderId && orders.indexOf(r.orderId) === -1) orders.push(r.orderId);
    }
  });

  const modified = orders.filter(oid => qzOrderHasDemoEdits(oid));

  const activate = () => {
    orders.forEach(oid => qzRestoreOrder(oid));
    qzState.qzMode = 'lesson';
    qzState.lessonId = lessonId;
    qzState.view = 'lesson';
    qzSyncModeSwitch();
    qzSyncTopTabs();
    qzRenderRoot();
  };

  if (modified.length > 0) {
    qzConfirm({
      title: 'Restore Lesson Orders',
      body: `Opening Lesson ${l.number} will reset sandbox modifications on ${modified.join(', ')} to ensure clean step verification.`,
      confirmLabel: 'Restore and Open Lesson',
      onConfirm: activate
    });
  } else {
    activate();
  }
}

function qzExitLesson() {
  qzState.lessonId = null;
  qzState.qzMode = 'sandbox';
  if (SimEngine.walkActive()) SimEngine.exit(true);
  qzSyncModeSwitch();
  qzSyncTopTabs();
  qzRenderRoot();
}

/* A verify/reconcile item that resolved as "correct it myself" wrote a real value onto the
   order. Derived from the item's own metadata rather than a hardcoded list, so items added
   later roll back without anyone remembering to register them. */
function qzUndoItemWrite(item) {
  if (!item || !item.orderId) return;
  if (item.partyRole) qzClearPartyOverride(item.orderId, item.partyRole, 'name');
  else if (item.field) qzClearScalarOverride(item.orderId, item.field);
}

/* Clears one lesson so it can be run again. Note the deliberate consequence for the five items
   shared between lessons (rev-1483-legal, comm-followup, rec-1483-price-conflict,
   rec-1512-commitment, cmp-1398-delay, mostly the capstone reusing earlier work): clearing them
   also drops them from the other lesson's progress bar. That is honest — the item really was
   cleared — and it is safe, because unlocking reads lessonsDone, not live progress. */
function qzResetLesson(lessonId) {
  const l = QZ_LESSONS.find(x => x.id === lessonId);
  if (!l) return;
  l.steps.forEach(step => {
    if (step.type === 'do') delete qzStore.checklist[step.checklistId];
    else if (step.type === 'decide') qzResetItemState(qzStore.scenarios, step.scenarioId);
    else if (step.type === 'verify') {
      qzUndoItemWrite(qzReviewLookup(step.reviewId));
      qzResetItemState(qzStore.reviews, step.reviewId);
    } else if (step.type === 'reconcile') qzResetItemState(qzStore.reconciles, step.reconcileId);
    else if (step.type === 'compose') qzResetItemState(qzStore.composes, step.composeId);
  });
  const undo = QZ_LESSON_UNDO[lessonId];
  if (undo) undo();
  qzSave();
  simToast(`Lesson ${l.number} restarted — its steps are open again.`, { tone: 'good' });
}

/* ---------- login ---------- */
function qzLoginHTML() {
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const email = su ? su.email : 'va.trainee@skillcloud.demo';
  return `<div class="qz-login"><div class="qz-login-card">
    <div class="mark"><img src="Images-resourses/qualia-mark.svg" alt=""><span class="wordmark">Qualia</span></div>
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
  // Clears the inline display:none the markup ships with, rather than replacing it with an
  // inline display:block. An inline value beats every selector, so hardcoding 'block' here
  // silently killed `.qz-body.core #qzRoot { display: flex }`: #qzRoot stopped being a flex
  // container, .qz-core stopped being a flex item, its `flex:1; min-height:0` never applied,
  // and the Core rail grew to its content height instead of the viewport's — overflowing
  // .qz-body (overflow:hidden) by ~725px and clipping the bottom of the sidebar for good.
  // Empty string hands the decision back to the stylesheet, which sets block or flex per view.
  document.getElementById('qzRoot').style.display = '';
  qzSyncModeSwitch();
  qzRenderCoreSections();
  qzGoto('dashboard');
  qzUpdateBellBadge();
  if (!qzStore.tourSeen && window.qzTourStart) setTimeout(qzTourStart, 350);
}

/* ---------- notification bell ---------- */
function qzOpenTasks() { return QZ_TASKS.filter(t => qzTaskStatus(t) !== 'Complete'); }
function qzUpdateBellBadge() {
  const badge = document.querySelector('#qzBell .n');
  if (badge) badge.textContent = qzOpenTasks().length;
  const mail = document.getElementById('qzMailBadge');
  if (mail) {
    const threads = typeof QZ_MESSAGES !== 'undefined' ? QZ_MESSAGES.length : 0;
    mail.textContent = threads;
    mail.style.display = threads ? 'flex' : 'none';
  }
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

/* ---------- Qualia Core: top-level section nav ----------
   Core's topbar carries the whole product, not just the two views this trainer implements.
   The sections that aren't part of the training still render — a VA has to recognise the
   real chrome — but they answer with an explicit "not part of this module" instead of
   being dead links that make the trainee wonder whether they broke something.
   Training-only entries (Dashboard) are marked so they read as scaffolding, not product. */
const QZ_CORE_SECTIONS = [
  { id: 'dashboard', label: 'Training', view: 'dashboard', training: true },
  { id: 'orders', label: 'Orders', view: 'orders' },
  /* These six are the Core facade (Quialia/qualia-shell.js): real screens to walk
     through, no persistence. `view` matches `id` on purpose — qzSyncTopTabs compares
     el.dataset.view against qzState.view, so the active underline works with no change
     to that function. */
  { id: 'contacts', label: 'Contacts', view: 'contacts' },
  { id: 'calendar', label: 'Calendar', view: 'calendar' },
  { id: 'accounting', label: 'Accounting', view: 'accounting' },
  { id: 'reports', label: 'Reports', view: 'reports' },
  { id: 'compliance', label: 'Compliance', view: 'compliance' },
  { id: 'admin', label: 'Admin', view: 'admin' }
];
function qzCoreStub(label) {
  simToast(`${label} is part of Qualia Core but not part of this training module.`);
}
function qzRenderCoreSections() {
  const host = document.getElementById('qzCoreSections');
  if (!host) return;
  host.innerHTML = QZ_CORE_SECTIONS.map(s => {
    const onclick = s.view ? `qzGoto('${s.view}')` : `qzCoreStub('${s.label}')`;
    return `<span data-view="${s.id}" class="${s.training ? 'training' : ''}" onclick="${onclick}">${esc(s.label)}</span>`;
  }).join('');
  qzSyncTopTabs();
}
/* Core has no per-page back link — the old `.qz-back` in the order view went away with the
   Connect shell — so leaving an open file means clicking Orders in the top bar. That makes
   this function the only path for the `orders-back` step, and it used to do two things that
   broke it: it never marked the item, and it aborted any active walkthrough on the way out. */
function qzGoto(view) {
  const wasOrder = qzState.view === 'order';
  const step = SimEngine.walkActive() ? SimEngine.currentStep() : null;
  // The one navigation that is itself a lesson step, rather than the trainee wandering off.
  const isBackStep = !!(step && step.type === 'do' && step.checklistId === 'orders-back'
    && view === 'orders' && wasOrder);
  /* Guard: the Core facade sections are browsing, not coursework, and every other exit from
     a lesson below silently kills the running walkthrough. Wandering into Contacts mid-step
     would therefore discard the lesson with no warning, so refuse the navigation instead and
     say why. Training views are unaffected — this only fires for the facade. */
  if (step && typeof QZ_SHELL_VIEWS !== 'undefined' && QZ_SHELL_VIEWS[view]) {
    simToast('Finish or exit the current lesson step before browsing other sections.');
    return;
  }
  qzState.view = view;
  qzState.orderId = null;
  if (!isBackStep) {
    qzState.lessonId = null;
    if (SimEngine.walkActive()) SimEngine.exit(true);
  }
  qzSyncTopTabs();
  qzRenderRoot();
  // Marked after the render so the walkthrough's completion tip measures the new view.
  if (view === 'orders' && wasOrder) qzMark('orders-back');
}
function qzSyncTopTabs() {
  document.querySelectorAll('#qzTopbar .qz-tabs span[data-view]').forEach(el => {
    const v = el.dataset.view;
    const active = v === qzState.view || (v === 'orders' && qzState.view === 'order')
      || (v === 'dashboard' && (qzState.view === 'scenario' || qzState.view === 'lesson' || qzState.view === 'exam'));
    el.classList.toggle('active', active);
  });
  qzRenderOrderTabs();
}

/* ---------- Core: multi-order tab strip ----------
   qzState.openOrders holds the ids of every file the trainee has open, in the order they
   were opened, exactly like Core's strip under the topbar. Per-order view state (which
   sidebar page, which Data Entry sub-tab, which message thread) is kept per id in
   qzState.orderViews so switching tabs returns you to where you were, rather than resetting
   every file to Overview — that persistence is the whole point of the mechanic. */
function qzOrderViewState(orderId) {
  if (!qzState.orderViews[orderId]) qzState.orderViews[orderId] = { orderTab: 'overview', deTab: 'property', threadId: null };
  return qzState.orderViews[orderId];
}
function qzOpenOrderTab(orderId) {
  if (qzState.openOrders.indexOf(orderId) === -1) qzState.openOrders.push(orderId);
}
function qzCloseOrderTab(orderId, ev) {
  if (ev) ev.stopPropagation();
  const i = qzState.openOrders.indexOf(orderId);
  if (i > -1) qzState.openOrders.splice(i, 1);
  delete qzState.orderViews[orderId];
  if (qzState.orderId === orderId) {
    // Fall back to the neighbouring tab rather than dumping the trainee on the orders list,
    // which is what closing a tab does in any real multi-document app.
    const next = qzState.openOrders[i] || qzState.openOrders[i - 1];
    if (next) { qzSwitchOrderTab(next); return; }
    qzState.view = 'orders'; qzState.orderId = null;
    qzSyncTopTabs();
    qzRenderRoot();
    // Closing the last open file lands on the list, which is the same outcome the
    // `orders-back` step asks for, so it counts too.
    qzMark('orders-back');
    return;
  }
  qzSyncTopTabs();
  qzRenderRoot();
}
function qzSwitchOrderTab(orderId) {
  const vs = qzOrderViewState(orderId);
  qzState.view = 'order';
  qzState.orderId = orderId;
  qzState.orderTab = vs.orderTab;
  qzState.deTab = vs.deTab;
  qzState.threadId = vs.threadId;
  qzSyncTopTabs();
  qzRenderRoot();
}
/* Mirror the live qzState fields back into the per-order record, so the next switch away
   and back lands on the same page. */
function qzPersistOrderView() {
  if (qzState.view !== 'order' || !qzState.orderId) return;
  const vs = qzOrderViewState(qzState.orderId);
  vs.orderTab = qzState.orderTab;
  vs.deTab = qzState.deTab;
  vs.threadId = qzState.threadId;
}
/* The strip is shared by the order tabs and the lesson breadcrumb, so neither one can hide
   it alone — whichever renders last would clobber the other's decision. Both call this. */
function qzSyncTopStrip() {
  const strip = document.getElementById('qzTopStrip');
  const banner = document.getElementById('qzLessonBanner');
  if (!strip) return;
  const hasTabs = qzState.openOrders.length > 0;
  const hasBanner = !!(banner && banner.innerHTML.trim());
  strip.style.display = (hasTabs || hasBanner) ? 'flex' : 'none';
}
function qzRenderOrderTabs() {
  const host = document.getElementById('qzOrderTabs');
  if (!host) return;
  if (!qzState.openOrders.length) { host.innerHTML = ''; qzSyncTopStrip(); return; }
  host.innerHTML = qzState.openOrders.map(id => {
    const o = qzGetOrder(id);
    if (!o) return '';
    const label = o.propertyAddress.split(',')[0];
    const active = qzState.view === 'order' && qzState.orderId === id;
    return `<div class="qz-otab ${active ? 'active' : ''}" data-order-tab="${escAttr(id)}" onclick="qzSwitchOrderTab('${id}')" title="${escAttr(o.propertyAddress)}">
      <span class="lbl">${esc(label)}</span>
      <button type="button" class="x" title="Close" onclick="qzCloseOrderTab('${id}',event)">&times;</button>
    </div>`;
  }).join('');
  qzSyncTopStrip();
}
/* Lives in its own persistent DOM node (#qzLessonBanner, outside #qzRoot) so it can be
   refreshed the instant a step completes without a full re-render, this matters when a
   step fires mid-keystroke (the Orders search box patches its own row list in place and
   skips qzRenderRoot to avoid losing input focus). */
function qzLessonBreadcrumbHTML() {
  if (!qzState.lessonId || qzState.view === 'lesson' || qzState.view === 'dashboard' || qzState.view === 'exam') return '';
  const l = QZ_LESSONS.find(x => x.id === qzState.lessonId);
  if (!l) return '';
  const prog = SimEngine.progress(l);
  const label = prog.complete ? `Lesson ${l.number} complete!` : `Lesson ${l.number} &middot; ${prog.done} of ${prog.total} steps done`;
  return `<div class="qz-lesson-banner ${prog.complete ? 'done' : ''}" onclick="SimEngine.openLesson('${l.id}')">${label} &middot; Back to Lesson &rarr;</div>`;
}
function qzRenderLessonBanner() {
  const el = document.getElementById('qzLessonBanner');
  if (el) el.innerHTML = qzLessonBreadcrumbHTML();
  qzSyncTopStrip();
}
function qzRenderRoot() {
  const root = document.getElementById('qzRoot');
  // The order view brings its own full-height Core chrome (dark rail + right panel), so the
  // scrolling page padding that every other view wants has to come off for it.
  const body = document.querySelector('.qz-body');
  if (body) body.classList.toggle('core', qzState.view === 'order');
  let html = '';
  if (qzState.view === 'dashboard') html = qzDashboardHTML();
  else if (qzState.view === 'orders') html = qzOrdersHTML();
  else if (qzState.view === 'order') html = qzOrderHTML();
  else if (qzState.view === 'scenario') html = qzScenarioDetailHTML();
  else if (qzState.view === 'lesson') html = qzLessonDetailHTML();
  else if (qzState.view === 'exam') html = qzExamHTML();
  /* Core facade sections (Contacts, Calendar, Accounting, Reports, Compliance, Admin).
     Guarded on the registry existing so qualia-app.js still runs if qualia-shell.js is
     not loaded, and placed last so it can never shadow a training view. */
  else if (typeof QZ_SHELL_VIEWS !== 'undefined' && QZ_SHELL_VIEWS[qzState.view]) {
    html = QZ_SHELL_VIEWS[qzState.view]();
  }
  root.innerHTML = qzExamActiveBannerHTML() + html;
  qzRenderLessonBanner();
}

/* ---------- lessons: gating (always derived, never stored) ---------- */
/* Gating reads the sticky "was right at least once" flag, not the current answer. Lessons
   are explicitly retry-friendly, so reopening a solved scenario/review to re-read it — or
   deliberately clicking a wrong option to see the explanation — must never take back a
   lesson the trainee already unlocked. Scoring integrity is handled separately and does not
   use this: the exam is single-answer, and the score reported to SCApp uses first attempts
   (see qzScenarioFirstAttemptCorrect). */
function qzLessonStepDone(step) {
  if (step.type === 'do') return !!qzStore.checklist[qzScopedChecklistKey(step.checklistId, step.orderId)];
  if (step.type === 'verify') { const s = qzStore.reviews[step.reviewId]; return !!(s && (s.everCorrect || s.correct)); }
  if (step.type === 'decide') { const s = qzStore.scenarios[step.scenarioId]; return !!(s && (s.everCorrect || s.correct)); }
  if (step.type === 'reconcile') { const s = qzStore.reconciles[step.reconcileId]; return !!(s && (s.everCorrect || s.correct)); }
  if (step.type === 'compose') { const s = qzStore.composes[step.composeId]; return !!(s && (s.everCorrect || s.correct)); }
  return false;
}
/* What the trainee got RIGHT ON THE FIRST TRY, independent of how many retries followed.
   This is the honest measure of the curriculum and what gets reported outward. */
function qzScenarioFirstAttemptCorrect(scenarioId) {
  const s = qzStore.scenarios[scenarioId];
  return !!(s && s.firstAttempt && s.firstAttempt.correct);
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
  'triage-open-all': { tab: 'overview' },
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
  } else if (step.type === 'reconcile') {
    const r = qzRecLookup(step.reconcileId);
    if (!r) return;
    qzOpenOrderTab(r.orderId);
    qzState.view = 'order';
    qzState.orderId = r.orderId;
    qzState.orderTab = 'review';
    qzMark('orders-open');
    qzSyncTopTabs();
    qzRenderRoot();
  } else if (step.type === 'compose') {
    const c = qzComposeLookup(step.composeId);
    if (!c) return;
    if (c.orderId) qzOpenOrderTab(c.orderId);
    qzState.view = 'order';
    qzState.orderId = c.orderId || qzState.orderId;
    qzState.orderTab = 'communication';
    qzSyncTopTabs();
    qzRenderRoot();
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
  if (step.type === 'reconcile') { const r = qzRecLookup(step.reconcileId); return r ? 'Reconcile: ' + r.label : step.reconcileId; }
  if (step.type === 'compose') { const c = qzComposeLookup(step.composeId); return c ? 'Write: ' + c.label : step.composeId; }
  return '';
}
function qzLessonStepStatus(step) {
  if (step.type === 'do') return qzLessonStepDone(step) ? 'good' : 'pending';
  if (step.type === 'verify') { const s = qzStore.reviews[step.reviewId]; if (!s || !s.resolvedAt) return 'pending'; return s.correct ? 'good' : 'bad'; }
  if (step.type === 'decide') { const s = qzStore.scenarios[step.scenarioId]; if (!s || s.answered == null) return 'pending'; return s.correct ? 'good' : 'bad'; }
  if (step.type === 'reconcile') { const s = qzStore.reconciles[step.reconcileId]; if (!s || !s.resolvedAt) return 'pending'; return s.correct ? 'good' : 'bad'; }
  if (step.type === 'compose') { const s = qzStore.composes[step.composeId]; if (!s || !s.resolvedAt) return 'pending'; return s.correct ? 'good' : 'bad'; }
  return 'pending';
}
/* The step list, "Try It" button and completion notice are all generic — the engine
   renders them (SimEngine.lessonDetailHTML) and this only supplies the panel chrome and
   the back link, which are Qualia's own layout. */
function qzLessonDetailHTML() {
  return `<span class="qz-back" onclick="qzGoto('dashboard')">&larr; Dashboard</span>
    <div class="qz-panel qz-lesson-detail">
      ${SimEngine.lessonDetailHTML(qzState.lessonId)}
    </div>`;
}
/* Thin wrapper so call sites don't have to pass the current lesson id every time. */
function qzContinueHTML(step) {
  return SimEngine.continueHTML(step, qzState.lessonId);
}

/* ---------- walkthrough: Qualia-specific hooks ----------
   The walkthrough engine itself now lives in assets/js/sim-engine.js and is shared with
   the DocuSign module. What stays here is only what depends on Qualia's own screens: the
   per-mechanic sync helpers below (which re-resolve the tip after an interaction inside a
   multi-step item) and the target/text resolvers for verify, reconcile and compose.
   Everything generic — positioning, the tip card, dots, tours, skipClick, advancing — is
   the engine's, and is reached through SimEngine.*. */

/* Keeps the orders-search step's tip text live as the trainee types, so a query that
   doesn't surface Order ORD-2026-1483 says so immediately instead of staying silent. */
/* Covers both search-adjacent steps: orders-search itself, and orders-open's fallback in
   case the row it points at ever disappears (normally prevented by locking the search box
   during that step, this is the safety net for anything that slips past that). Unlike the
   search step, orders-open's target can change (row vs. fallback to the input), so this
   also repositions, not just re-renders the text. */
function qzSyncSearchStep() {
  if (!SimEngine.walkActive()) return;
  const step = SimEngine.currentStep();
  if (!step || step.type !== 'do') return;
  if (step.checklistId !== 'orders-search' && step.checklistId !== 'orders-open') return;
  SimEngine.renderTip(step, false);
  SimEngine.position(step);
}
/* Same idea as qzSyncSearchStep/qzSyncEditStep: the comm-reply step's target moves
   from the textarea to the Send button once there's 20+ characters typed, but nothing was
   re-checking that while the trainee was actually typing, only on the next unrelated
   reposition (resize/scroll), so the highlight sat on the box well past the point it should
   have moved. */
function qzSyncReplyStep() {
  if (!SimEngine.walkActive()) return;
  const step = SimEngine.currentStep();
  if (!step || step.type !== 'do' || step.checklistId !== 'comm-reply') return;
  SimEngine.renderTip(step, false);
  SimEngine.position(step);
}
/* A `verify` lesson step maps to the 4-step discrepancy-report engine, which has its own
   internal sub-phases (open doc / answer source / answer action / correct or escalate).
   Called after every sub-phase action so the tip text and highlight track the trainee's
   progress inside the item, not just the outer lesson step. No-op unless the walkthrough
   is currently showing this exact `verify` step. */
function qzSyncVerifyStep(reviewId) {
  if (!SimEngine.walkActive()) return;
  const step = SimEngine.currentStep();
  if (!step || step.type !== 'verify' || step.reviewId !== reviewId) return;
  SimEngine.renderTip(step, false);
  SimEngine.position(step, { scrollIntoView: true });
}
/* Same idea for the two new mechanics: a reconcile item has many sub-phases (open each
   doc, fill each cell, decide each row) and a compose item changes as the trainee types,
   so both need the tip re-resolved after every interaction. */
function qzSyncReconcileStep(reconcileId) {
  if (!SimEngine.walkActive()) return;
  const step = SimEngine.currentStep();
  if (!step || step.type !== 'reconcile' || step.reconcileId !== reconcileId) return;
  SimEngine.renderTip(step, false);
  SimEngine.position(step, { scrollIntoView: true });
}
function qzSyncComposeStep(composeId) {
  if (!SimEngine.walkActive()) return;
  const step = SimEngine.currentStep();
  if (!step || step.type !== 'compose' || (composeId && step.composeId !== composeId)) return;
  SimEngine.renderTip(step, false);
  SimEngine.position(step);
}
/* Generic walk resolvers for a reconcile step, mirroring qzVerifyTarget/Text: the copy
   is derived from the item's own state so no lesson has to hand-write per-phase guidance. */
function qzReconcileTarget(recId) {
  const st = qzRecGet(recId);
  if (SimEngine.docOpen()) return null;
  const scope = `.qz-rec-item[data-rec-id="${recId}"]`;
  if (st.resolvedAt) return st.correct ? null : scope + ' .qz-rv-feedback button';
  if (!qzRecAllDocsOpened(recId)) return scope + ' [data-rec-phase="1"]';
  const r = qzRecLookup(recId);
  const unfilled = r.rows.find(row => !qzRecRowCellsDone(recId, row.id));
  if (unfilled) return scope + ` [data-rec-phase="2"] tr[data-rec-row="${unfilled.id}"]`;
  const undecided = r.rows.find(row => !qzRecRowSettled(recId, row.id));
  if (undecided) return scope + ` [data-rec-phase="3"][data-rec-row="${undecided.id}"]`;
  return scope + ' .qz-rec-actions button';
}
function qzReconcileText(recId) {
  const r = qzRecLookup(recId);
  const st = qzRecGet(recId);
  if (SimEngine.docOpen()) return 'Read it, then close it and come back to the grid.';
  if (st.resolvedAt) return st.correct ? 'Reconciled.' : 'Read the breakdown below, then click "Redo" to work it again.';
  if (!qzRecAllDocsOpened(recId)) {
    const left = r.docs.filter(d => !st.opened[d.id]).length;
    return `Open every source before filling anything in. ${left} still unopened.`;
  }
  const unfilled = r.rows.find(row => !qzRecRowCellsDone(recId, row.id));
  if (unfilled) return `For "${unfilled.label}", record what each source says. They will not all agree, that is the point.`;
  const undecided = r.rows.find(row => !qzRecRowSettled(recId, row.id));
  if (undecided) return `Now decide what happens with "${undecided.label}". Which source governs, and is this yours to fix?`;
  return 'Every row is filled in. Submit the reconciliation.';
}
/* Escalation-note example for a `reconcile` step, the exact counterpart of qzVerifyExample
   below: the note that sits beside the category picker is free text and ungraded, and with
   nothing to look at it is a blank page. Resolved per ROW, because one reconcile walks
   several in turn — it offers the example only while the row the walkthrough is standing on
   is the one actually asking for a note. */
function qzReconcileExample(recId) {
  const r = qzRecLookup(recId);
  const st = qzRecGet(recId);
  if (!r || st.resolvedAt || SimEngine.docOpen()) return null;
  if (!qzRecAllDocsOpened(recId)) return null;
  const row = r.rows.find(x => !qzRecRowSettled(recId, x.id));
  if (!row || !row.noteExample) return null;
  // Only once the row's action has been answered AND answered right, and only for an
  // escalation: offered any earlier, the example would hand over the decision the trainee is
  // being asked to make. Once the category is recorded the row settles and this moves on.
  const d = st.decisions[row.id] || {};
  if (!d.action || !d.actionCorrect || d.action.indexOf('escalate') !== 0) return null;
  return row.noteExample;
}
function qzComposeTarget(composeId) {
  const st = qzComposeGet(composeId);
  const scope = `.qz-compose-item[data-compose-id="${composeId}"]`;
  if (st.resolvedAt) return st.correct ? null : scope + ' .qz-rv-feedback button';
  const box = document.getElementById('qzComposeBox-' + composeId);
  if (box && box.value.trim().length >= 40) return scope + ' .qz-rv-actions button';
  return scope + ' .qz-compose-box';
}
function qzComposeText(composeId) {
  const st = qzComposeGet(composeId);
  if (st.resolvedAt && !st.correct) return 'Read which points the reply missed, then revise and send it again.';
  const box = document.getElementById('qzComposeBox-' + composeId);
  const len = box ? box.value.trim().length : 0;
  if (len >= 40) return 'Long enough. Read it back once, then send it, your reply is checked against what a professional response has to contain.';
  return `Write the reply. Think about what the other person needs to know and by when. ${len ? `(${len} of 40 characters)` : ''}`;
}
/* Generic target/text resolvers for a `verify` lesson step, reused by every lesson that
   walks a discrepancy-report item (rev-1483-buyer, rev-1483-price, rev-1483-vesting, ...).
   All copy comes from the review's own data, so nothing here is lesson-specific. While
   the source document modal is open (z-index above the walk overlay, by design) the
   highlight is suppressed and the tip just floats with a "close it to continue" nudge. */
function qzVerifyTarget(reviewId) {
  const st = qzRevGet(reviewId);
  if (SimEngine.docOpen()) return null;
  const scope = `.qz-rv-item[data-rev-id="${reviewId}"]`;
  if (st.resolvedAt) return st.correct ? null : scope + ' .qz-rv-feedback button';
  if (!st.docOpened) return scope + ' [data-rev-phase="1"] button';
  if (!st.step2Choice) return scope + ' [data-rev-phase="2"]';
  if (!st.step2Correct) return scope + ' [data-rev-phase="2"] .qz-rv-actions button';
  if (!st.step3Choice) return scope + ' [data-rev-phase="3"]';
  if (!st.step3Correct) return scope + ' [data-rev-phase="3"] .qz-rv-actions button';
  // Both retry states point at the whole step, not at the field that was answered wrong. The
  // tip card is placed below its target, and in step 4 the submit button sits below the field
  // — so highlighting just the <select> or the <input> put the card straight on top of the
  // button the trainee had to press next. Targeting the block also means scrollIntoView
  // centres the button along with the field instead of pushing it under the fold.
  if (st.step4Category && !st.step4CategoryCorrect) return scope + ' [data-rev-phase="4"]';
  if (st.correctedValueSaved && !st.step4ValueCorrect) return scope + ' [data-rev-phase="4"]';
  return scope + ' [data-rev-phase="4"]';
}
function qzVerifyText(reviewId) {
  const r = qzReviewLookup(reviewId);
  const st = qzRevGet(reviewId);
  if (SimEngine.docOpen()) return `Read the ${r.docTitle}, then close it to come back and report what you found.`;
  if (st.resolvedAt) return 'Read the explanation below, then click "Redo" to try again.';
  if (!st.docOpened) return `Open the ${r.docTitle} to compare it against "${r.label}."`;
  if (!st.step2Choice) return 'Now pick what the source document actually says.';
  if (!st.step2Correct) return 'Not quite, click "Try again" and look at the document once more.';
  if (!st.step3Choice) return "Pick the right next step: does this need a correction, or does it need escalating?";
  if (!st.step3Correct) return 'Not quite, click "Try again" and reconsider the right next step.';
  if (st.step3Choice === 'correct') {
    return (st.correctedValueSaved && !st.step4ValueCorrect)
      ? "That doesn't match the source document. Reopen it if you need to, then retype the value exactly as it appears."
      : 'Type the corrected value exactly as the source document shows it, then click "Save correction."';
  }
  if (st.step4Category && !st.step4CategoryCorrect) return 'Not quite — pick a different category and submit again.';
  return 'Choose the escalation category that fits, then submit.';
}
/* Escalation-note example, shown inside the walkthrough tip (not on the page itself) while
   Step 4's note field is the active thing to fill in, same "See example" mechanism as any
   other walk.example. Returns null once the item is resolved or has no example to offer. */
function qzVerifyExample(reviewId) {
  const r = qzReviewLookup(reviewId);
  if (!r.noteExample) return null;
  const st = qzRevGet(reviewId);
  if (st.resolvedAt) return null;
  if (st.step3Choice && st.step3Correct && st.step3Choice.indexOf('escalate') === 0) return r.noteExample;
  return null;
}
/* Lesson 1 locks the top search box during its 'open the order' step so the trainee can't
   filter the target row out from under the highlight. The engine calls this before every
   step (config.beforeStep), so the lock can never outlive the one step that wanted it. */
/* Runs before every walkthrough step. Besides releasing the lock the orders-open step puts on
   the box, it clears what that step typed into it: the value and qzState.orderFilter used to
   survive the whole rest of the lesson, so the search kept showing "1483" and the Orders list
   stayed filtered to one row long after that step was over. Steps that need a preset filter
   set it in their own setup(), which runs after this. */
function qzUnlockSearchInput() {
  const input = document.getElementById('qzTopSearchInput');
  if (input) { input.disabled = false; input.title = ''; input.value = ''; }
  qzState.orderFilter = '';
}



/* ---------- final exam card (full exam logic lives further down) ---------- */
function qzExamDashboardCardHTML(unlocked) {
  if (typeof QZ_EXAM_BANK === 'undefined') return '';
  const ex = qzStore.exam;
  const count = QZ_EXAM_BLUEPRINT.reduce((n, s) => n + s.count, 0);
  if (ex && ex.submittedAt) {
    const pct = ex.max ? Math.round(ex.score / ex.max * 100) : 0;
    const passed = pct >= Math.round(QZ_EXAM_PASS_PCT * 100);
    return `<div class="qz-exam-card done"><b>Final Exam</b><p>Completed &mdash; ${ex.score}/${ex.max} (${pct}%), ${passed ? 'Passed' : 'Not passed'}. Pass mark ${Math.round(QZ_EXAM_PASS_PCT * 100)}%.</p>
      ${qzExamResultHTML()}
      <button class="qz-btn sm" onclick="qzExamResetAttempt(this)">Reset my exam attempt (training only)</button></div>`;
  }
  if (ex && !ex.submittedAt) {
    return `<div class="qz-exam-card"><b>Final Exam</b><p>In progress &mdash; question ${(ex.currentIndex || 0) + 1} of ${(ex.itemIds || []).length} &middot; ${qzExamTimeLeftLabel()} remaining.</p>
      <button class="qz-btn primary" onclick="qzExamReturn()">Resume Exam</button></div>`;
  }
  if (!unlocked) return `<div class="qz-exam-card locked"><b>Final Exam</b><p>Unlocks once all ${QZ_LESSONS.length} lessons are complete.</p></div>`;
  return `<div class="qz-exam-card"><b>Final Exam</b>
    <p>${count} questions drawn from a larger bank, ${QZ_EXAM_MINUTES} minutes, pass mark ${Math.round(QZ_EXAM_PASS_PCT * 100)}%. One answer per question, no hints, no going back, and no feedback until you submit.</p>
    <button class="qz-btn primary" onclick="qzExamStart()">Start Final Exam</button></div>`;
}

/* ---------- dashboard ---------- */
function qzDashboardHTML() {
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const firstName = su ? su.name.split(' ')[0] : 'there';
  const cards = QZ_LESSONS.map((l, i) => {
    const state = SimEngine.lessonState(i);
    const prog = SimEngine.progress(l);
    const locked = state === 'locked';
    const pct = prog.total ? Math.round(prog.done / prog.total * 100) : 0;
    const fracLabel = locked ? 'Locked' : (state === 'done' ? 'Complete' : prog.done + ' of ' + prog.total + ' done');
    return `<div class="qz-lesson-card ${state}" ${locked ? '' : `onclick="SimEngine.openLesson('${l.id}')"`}>
      <div class="eyebrow">MODULE ${String(l.number).padStart(2, '0')}</div>
      <b>${esc(l.title)}</b>
      <p>${esc(l.summary)}</p>
      <div class="qz-bar"><i style="width:${pct}%"></i></div>
      <div class="frac">${esc(fracLabel)}</div>
    </div>`;
  }).join('');
  const allDone = QZ_LESSONS.every((l, i) => SimEngine.lessonState(i) === 'done');
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
  if (qzState.ordersFilterStatus && qzState.ordersFilterStatus !== 'all' && o.status !== qzState.ordersFilterStatus) return false;
  if (qzState.ordersFilterStage && qzState.ordersFilterStage !== 'all' && QZ_STAGES[o.stageIndex] !== qzState.ordersFilterStage) return false;
  if (qzState.ordersFilterType && qzState.ordersFilterType !== 'all' && o.type !== qzState.ordersFilterType) return false;
  if (!f) return true;
  return o.propertyAddress.toLowerCase().includes(f) || o.id.toLowerCase().includes(f) || o.parties.some(p => p.name.toLowerCase().includes(f));
}
function qzSetOrdersFilter(key, val) {
  qzState[key] = val;
  qzState.ordersPage = 1;
  const body = document.getElementById('qzOrdersBody');
  if (body) body.innerHTML = qzOrdersRowsHTML();
  const pag = document.getElementById('qzOrdersPagination');
  if (pag) pag.innerHTML = qzOrdersPaginationHTML();
}
function qzSetOrdersPage(p) {
  qzState.ordersPage = p;
  const body = document.getElementById('qzOrdersBody');
  if (body) body.innerHTML = qzOrdersRowsHTML();
  const pag = document.getElementById('qzOrdersPagination');
  if (pag) pag.innerHTML = qzOrdersPaginationHTML();
}
function qzOrdersFilteredList() {
  const filter = qzState.orderFilter;
  return qzAllOrders().filter(o => qzOrderMatchesFilter(o, filter));
}
function qzOrdersPaginationHTML() {
  const total = qzOrdersFilteredList().length;
  const perPage = qzState.ordersPerPage || 15;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const curPage = Math.min(totalPages, Math.max(1, qzState.ordersPage || 1));
  return `
    <span style="color:var(--qz-muted)">Showing ${Math.min(total, (curPage - 1) * perPage + 1)}&ndash;${Math.min(total, curPage * perPage)} of ${total} orders</span>
    <button class="qz-pag-btn" ${curPage <= 1 ? 'disabled' : ''} onclick="qzSetOrdersPage(${curPage - 1})">&larr; Prev</button>
    <span style="font-weight:600;color:var(--qz-navy)">Page ${curPage} of ${totalPages}</span>
    <button class="qz-pag-btn" ${curPage >= totalPages ? 'disabled' : ''} onclick="qzSetOrdersPage(${curPage + 1})">Next &rarr;</button>
  `;
}
function qzOrdersRowsHTML() {
  const filtered = qzOrdersFilteredList();
  const perPage = qzState.ordersPerPage || 15;
  const curPage = Math.min(Math.max(1, Math.ceil(filtered.length / perPage)), Math.max(1, qzState.ordersPage || 1));
  const start = (curPage - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);
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
  const statusVal = qzState.ordersFilterStatus || 'all';
  const stageVal = qzState.ordersFilterStage || 'all';
  const typeVal = qzState.ordersFilterType || 'all';

  return `
    <div class="qz-orders-hero">
      <div class="ic">${QZ_ICONS.pin}</div>
      <h2>Skill Cloud Training</h2>
      <div class="qz-orders-hero-btns">
        <button class="qz-btn" type="button" onclick="qzOpenQuoteModal()">Get a Quote</button>
        <button class="qz-btn primary" type="button" onclick="qzOpenNewOrderWizard(1)">Place Order</button>
      </div>
      <div class="qz-orders-stats">${qzOrdersStatsHTML()}</div>
    </div>
    <div class="qz-listhead">
      <div><h2>Orders</h2><div class="sub">Search and open a file the way you would in a live queue</div></div>
    </div>
    <div class="qz-tbl-toolbar">
      <div class="qz-tbl-filters">
        <select class="qz-filter-select" onchange="qzSetOrdersFilter('ordersFilterStatus', this.value)">
          <option value="all" ${statusVal==='all'?'selected':''}>All Statuses</option>
          <option value="Open" ${statusVal==='Open'?'selected':''}>Open</option>
          <option value="Closed" ${statusVal==='Closed'?'selected':''}>Closed</option>
        </select>
        <select class="qz-filter-select" onchange="qzSetOrdersFilter('ordersFilterStage', this.value)">
          <option value="all" ${stageVal==='all'?'selected':''}>All Stages</option>
          ${QZ_STAGES.map(st => `<option value="${escAttr(st)}" ${stageVal===st?'selected':''}>${esc(st)}</option>`).join('')}
        </select>
        <select class="qz-filter-select" onchange="qzSetOrdersFilter('ordersFilterType', this.value)">
          <option value="all" ${typeVal==='all'?'selected':''}>All Types</option>
          <option value="Purchase" ${typeVal==='Purchase'?'selected':''}>Purchase</option>
          <option value="Refinance" ${typeVal==='Refinance'?'selected':''}>Refinance</option>
          <option value="Cash" ${typeVal==='Cash'?'selected':''}>Cash</option>
          <option value="Commercial" ${typeVal==='Commercial'?'selected':''}>Commercial</option>
        </select>
      </div>
      <div id="qzOrdersPagination" class="qz-pagination">${qzOrdersPaginationHTML()}</div>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl"><thead><tr><th>Status</th><th>Stage</th><th>Order</th><th>Borrower</th><th>Seller</th><th>Property</th><th>Type</th><th>Agent</th><th>Closing</th></tr></thead>
      <tbody id="qzOrdersBody">${qzOrdersRowsHTML()}</tbody></table>
    </div>
  `;
}
function qzTopSearch(v) {
  qzState.orderFilter = v;
  // Outside the walkthrough, any non-empty search counts (organic exploration shouldn't be
  // graded against a specific order). But while the walkthrough is actively showing this
  // exact step, only mark it done once the typed text actually surfaces Order ORD-2026-1483,
  // otherwise the tip would celebrate "found it!" over a table showing zero results.
  const step = (SimEngine.walkActive()) ? SimEngine.currentStep() : null;
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
  qzSyncSearchStep();
}
function qzOpenOrder(id) {
  qzOpenOrderTab(id);
  const vs = qzOrderViewState(id);
  qzState.view = 'order';
  qzState.orderId = id;
  qzState.orderTab = vs.orderTab;
  qzState.deTab = vs.deTab;
  qzState.threadId = vs.threadId;
  qzMark('orders-open');
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
  // Leaving the tab drops any hand-opened compose exercise, so coming back lands on the
  // ordinary messages view rather than mid-exercise.
  qzState.composeId = null;
  if (tab === 'dataentry') { qzState.deTab = 'property'; qzMark('de-property'); }
  else if (tab === 'tasks') qzMark('tasks-open');
  else if (tab === 'workflow') qzMark('workflow-view');
  else if (tab === 'vendors') qzMark('vendors-open');
  else if (tab === 'closing') qzMark('closing-open');
  else if (tab === 'accounting') qzMark('accounting-open');
  qzPersistOrderView();
  qzRenderRoot();
}

/* ---------- Core: the order sidebar ----------
   Core groups an order's pages into ORDER / CLOSING / TASKS rails rather than the flat tab
   row Connect uses. The `tab` keys are unchanged from the previous shell on purpose: the
   lesson walkthroughs target [data-tab="..."], so renaming the navigation must not rename
   the contract those steps rely on.
   Pages the training doesn't implement are rendered (a VA needs to recognise the real rail)
   but answer with qzCoreStub. `Review` has no Core equivalent at all — it's this trainer's
   own instrument — so it's grouped separately and labelled as training. */
const QZ_CORE_NAV = [
  { section: 'Order', groups: [
    { label: 'General', items: [
      { label: 'Basic Info', tab: 'overview' },
      { label: 'Properties', tab: 'dataentry', deTab: 'property' },
      { label: 'Contacts', tab: 'dataentry', deTab: 'parties' },
      { label: 'Loan', tab: 'dataentry', deTab: 'transaction' },
      { label: 'Earnest & Commissions', tab: 'earnest' },
      { label: 'Taxes & Prorations', tab: 'prorations' },
      { label: 'Payoffs', tab: 'payoffs' }
    ] },
    { label: 'Title', items: [
      { label: 'CPL', tab: 'cpl' },
      { label: 'Policy Info & Rates', tab: 'policy-info' },
      { label: 'Commitment', tab: 'commitment' },
      { label: 'Final Policy', tab: 'final-policy' }
    ] }
  ] },
  { section: 'Closing', groups: [
    { label: 'Charges', items: [
      { label: 'Origination Charges', badge: 'A', tab: 'cd-a' },
      { label: 'Did Not Shop For', badge: 'B', tab: 'accounting' },
      { label: 'Did Shop For', badge: 'C', tab: 'cd-c' },
      { label: 'Taxes & Fees', badge: 'E', tab: 'cd-e' },
      { label: 'Prepaids', badge: 'F', tab: 'cd-f' },
      { label: 'Escrow', badge: 'G', tab: 'cd-g' },
      { label: 'Other Charges', badge: 'H', tab: 'cd-h' },
      { label: 'Lender Credits', badge: 'J', tab: 'cd-j' },
      { label: 'Debits/Credits', badge: 'K/M', tab: 'cd-km' },
      { label: 'Debits/Credits', badge: 'L/N', tab: 'cd-ln' }
    ] },
    { label: 'Closing File', items: [
      { label: 'Disclosures', tab: 'closing' },
      { label: 'Proceeds', tab: 'proceeds' },
      { label: 'Workflow', tab: 'workflow' }
    ] }
  ] },
  { section: 'Tasks', groups: [
    { label: '', items: [
      { label: 'Documents', tab: 'documents', icon: 'doc' },
      { label: 'Accounting', tab: 'accounting', icon: 'acct' },
      { label: 'Marketplace', tab: 'vendors', icon: 'market' },
      { label: 'Connect', tab: 'communication', icon: 'connect' },
      { label: 'Order Tasks', tab: 'tasks', icon: 'task' }
    ] }
  ] },
  { section: 'Training', training: true, groups: [
    { label: '', items: [
      { label: 'Document Review', tab: 'review', icon: 'review' }
    ] }
  ] }
];
const QZ_NAV_ICONS = {
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
  acct: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/></svg>',
  market: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18l-1.5 10.5A2 2 0 0 1 17.5 21h-11a2 2 0 0 1-2-1.5z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></svg>',
  connect: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l1.9-5.5A8.5 8.5 0 1 1 21 11.5z"/></svg>',
  task: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l2 2 4-4"/><rect x="3" y="4" width="18" height="16" rx="2"/></svg>',
  review: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>'
};
function qzNavGo(tab, deTab) {
  // The drawer sits on top of the content on narrow screens, so leaving it open after a nav
  // click would hide the very page the click just opened.
  qzState.railOpen = false;
  if (deTab) qzState.deTab = deTab;
  qzOrderTab(tab);
  if (deTab) { qzState.deTab = deTab; qzDeTab(deTab); }
}
/* Below ~760px there is no room for a 208px rail plus a readable content column, so the rail
   becomes an overlay drawer instead of a permanent column (see the .qz-core.rail-open rules).
   Kept in qzState rather than a DOM class because qzRenderRoot rebuilds .qz-core wholesale on
   every navigation, which would drop a class toggled directly on the node. */
function qzToggleRail(force) {
  qzState.railOpen = (force === undefined) ? !qzState.railOpen : !!force;
  qzRenderRoot();
}

function qzOrderSidebarHTML(o) {
  const counts = {
    documents: qzDocsForOrder(o.id).filter(d => qzDocStatus(d) === 'Pending').length,
    tasks: qzTasksForOrder(o.id).filter(t => qzTaskStatus(t) !== 'Complete').length,
    review: qzReviewsForOrder(o.id).filter(r => !qzStore.reviews[r.id]).length
  };
  const sections = QZ_CORE_NAV.map(sec => {
    const groups = sec.groups.map(g => {
      const items = g.items.map(it => {
        const live = !!it.tab;
        const active = live && qzState.orderTab === it.tab &&
          (!it.deTab || qzState.deTab === it.deTab);
        const onclick = live
          ? `qzNavGo('${it.tab}'${it.deTab ? `,'${it.deTab}'` : ''})`
          : `qzCoreStub('${esc(it.label)}')`;
        const badge = it.badge ? `<span class="bdg">${esc(it.badge)}</span>` : '';
        const count = counts[it.tab] ? `<span class="cnt">${counts[it.tab]}</span>` : '';
        const icon = it.icon ? `<span class="ic">${QZ_NAV_ICONS[it.icon]}</span>` : '';
        // data-tab is the selector contract the lesson walkthroughs point at.
        return `<div class="qz-nav-item ${active ? 'active' : ''} ${live ? '' : 'stub'}" ${live ? `data-tab="${it.tab}"` : ''} onclick="${onclick}">${icon}<span class="t">${esc(it.label)}</span>${count}${badge}</div>`;
      }).join('');
      const head = g.label ? `<div class="qz-nav-group">${esc(g.label)}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></div>` : '';
      return head + items;
    }).join('');
    return `<div class="qz-nav-sec ${sec.training ? 'training' : ''}"><div class="qz-nav-sec-h">${esc(sec.section)}</div>${groups}</div>`;
  }).join('');

  return `<div class="qz-order-side">
    <div class="qz-side-head">
      <span class="pin">${QZ_ICONS.pin}</span>
      <div class="addr">${esc(o.propertyAddress.split(',')[0])}</div>
      <div class="ono">${esc(o.id.replace('ORD-', ''))}</div>
    </div>
    <div class="qz-side-nav">${sections}</div>
  </div>`;
}

/* ---------- Core: right-hand panel ----------
   Chat is presence only (decorative, as in the real product for our purposes), Tasks and
   Help are contextual to the open order, Notes is the one that actually persists — that's
   where a VA writes down what they did, and Lesson 14 expects it to still be there. */
const QZ_CORE_PRESENCE = [
  { name: 'Lucas Adminton', role: 'Settlement Agent', online: true },
  { name: 'Dana Reyes', role: 'Escrow Officer', online: true },
  { name: 'Travis Jones', role: 'Title Examiner', online: false },
  { name: 'Barbara Runolfsson', role: 'Post-Closing', online: false },
  { name: 'Training User', role: 'You', online: true }
];
const QZ_PANEL_HELP = {
  overview: 'Basic Info shows the file at a glance: stage, key dates, parties and figures. Confirm where a file stands here before telling anyone anything about it.',
  dataentry: 'Properties, Contacts and Loan hold the data entered at intake. Every field here should be traceable to a document in the file.',
  documents: 'Documents tracks each file\'s paperwork through Pending, Received and Reviewed. A status is a statement of fact other people rely on.',
  review: 'Document Review is a training instrument, not a Qualia Core screen. It walks the comparison a VA does by eye: open the source, report what it says, decide what to do.',
  tasks: 'Order Tasks lists what is outstanding on this file. Prioritise by closing impact and by whether the next step belongs to someone else.',
  workflow: 'Workflow shows the file\'s stage progression. Stage rules are configured by admins, not by a VA.',
  communication: 'Connect is where correspondence with agents, lenders and clients lives. Everything written here is part of the file record.',
  vendors: 'Marketplace tracks the vendors engaged on this order and their confirmation status.',
  closing: 'Disclosures collects what must be complete before the file can be called closing-ready.',
  accounting: 'The charges grid is read-only for a VA. Review the figures, and route anything that looks wrong to someone with authority to change it.'
};
function qzTogglePanel(key) {
  qzState.panel[key] = !qzState.panel[key];
  qzRenderRoot();
}
function qzSaveNote(orderId) {
  const el = document.getElementById('qzNoteBox');
  if (!el) return;
  qzDemo.notes[orderId] = el.value;
  simToast('Note saved to this file in current session.', { tone: 'good' });
}
function qzPanelSectionHTML(key, title, bodyHTML, extraHead) {
  const open = !!qzState.panel[key];
  return `<div class="qz-panel-sec ${open ? 'open' : ''}">
    <div class="qz-panel-sec-h" onclick="qzTogglePanel('${key}')">
      <svg class="cv" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      <span>${esc(title)}</span>${extraHead || ''}
    </div>
    ${open ? `<div class="qz-panel-sec-b">${bodyHTML}</div>` : ''}
  </div>`;
}
function qzOrderPanelHTML(o) {
  const presence = QZ_CORE_PRESENCE.map(p =>
    `<div class="qz-presence ${p.online ? 'on' : ''}"><span class="d"></span><span class="n">${esc(p.name)}</span><span class="r">${esc(p.role)}</span></div>`
  ).join('');

  const openTasks = qzTasksForOrder(o.id).filter(t => qzTaskStatus(t) !== 'Complete');
  const allTasks = qzTasksForOrder(o.id);
  const tasksBody = openTasks.length
    ? openTasks.map(t => `<div class="qz-panel-task" onclick="qzNavGo('tasks')"><span class="tt">${esc(t.title)}</span>${qzDueChipHTML(t.dueDate)}</div>`).join('')
    : '<div class="qz-panel-empty">Nothing outstanding on this order.</div>';

  const helpText = QZ_PANEL_HELP[qzState.orderTab] || 'Open a section from the rail on the left to see guidance for it.';
  const helpBody = `<p class="qz-panel-help">${esc(helpText)}</p>
    <div class="qz-kb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input type="text" placeholder="Search knowledge base&hellip;" onkeydown="if(event.key==='Enter') qzCoreStub('The knowledge base')"></div>
    <div class="qz-kb-btns"><button type="button" class="qz-btn sm" onclick="qzCoreStub('Help Center')">Help Center</button><button type="button" class="qz-btn sm" onclick="qzCoreStub('Contact Us')">Contact Us</button></div>`;

  const note = (qzDemo.notes && qzDemo.notes[o.id]) || '';
  const notesBody = `<textarea id="qzNoteBox" class="qz-note-box" placeholder="Record what you did on this file, who you contacted, and what you are waiting on&hellip;">${esc(note)}</textarea>
    <button type="button" class="qz-btn sm primary" onclick="qzSaveNote('${o.id}')">Save note</button>`;

  return `<div class="qz-order-panel">
    ${qzPanelSectionHTML('chat', 'Chat', presence)}
    ${qzPanelSectionHTML('tasks', 'Tasks', tasksBody, `<span class="qz-panel-count">${openTasks.length} / ${allTasks.length}</span>`)}
    ${qzPanelSectionHTML('help', 'Help', helpBody)}
    ${qzPanelSectionHTML('notes', 'Notes', notesBody)}
  </div>`;
}
/* Human title for the page currently open, shown in the Core content header next to the
   house glyph the way Core titles each section of an order. */
const QZ_TAB_TITLE = {
  overview: 'Basic Info', dataentry: 'Properties & Contacts', documents: 'Documents',
  review: 'Document Review', tasks: 'Order Tasks', workflow: 'Workflow',
  communication: 'Connect', vendors: 'Marketplace', closing: 'Disclosures',
  accounting: 'Services Borrower Did Not Shop For (Section B)',
  earnest: 'Earnest Money & Brokerage Commissions',
  prorations: 'Taxes & Prorations Calculator',
  payoffs: 'Existing Loan Payoffs',
  cpl: 'Closing Protection Letter (CPL)',
  'policy-info': 'Title Policy Information & Promulgated Rates',
  commitment: 'Title Commitment (Schedules A & B)',
  'final-policy': 'Final Policy Production',
  'cd-a': 'Origination Charges (Section A)',
  'cd-c': 'Services Borrower Did Shop For (Section C)',
  'cd-e': 'Taxes & Government Recording Fees (Section E)',
  'cd-f': 'Prepaid Items (Section F)',
  'cd-g': 'Initial Escrow Payment at Closing (Section G)',
  'cd-h': 'Other Charges (Section H)',
  'cd-j': 'Total Closing Costs for Borrower (Section J)',
  'cd-km': 'Calculating Cash to Close (Sections K & M)',
  'cd-ln': 'Seller Net Proceeds (Sections L & N)',
  proceeds: 'Seller Net Proceeds & Wire Verification'
};
function qzOrderHTML() {
  const o = qzGetOrder(qzState.orderId);
  if (!o) return '<p>Order not found.</p>';

  let flagHtml = '';
  if (o.flag === 'missing-document') flagHtml = `<div class="qz-order-flag">A required document is outstanding, see Documents.</div>`;
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
  else if (qzState.orderTab === 'earnest') body = qzEarnestHTML(o);
  else if (qzState.orderTab === 'prorations') body = qzProrationsHTML(o);
  else if (qzState.orderTab === 'payoffs') body = qzPayoffsHTML(o);
  else if (qzState.orderTab === 'cpl') body = qzCplHTML(o);
  else if (qzState.orderTab === 'policy-info') body = qzPolicyInfoHTML(o);
  else if (qzState.orderTab === 'commitment') body = qzCommitmentHTML(o);
  else if (qzState.orderTab === 'final-policy') body = qzFinalPolicyHTML(o);
  else if (['cd-a', 'cd-c', 'cd-e', 'cd-f', 'cd-g', 'cd-h', 'cd-j', 'cd-km', 'cd-ln'].includes(qzState.orderTab)) {
    body = qzClosingDisclosureSectionHTML(o, qzState.orderTab);
  } else if (qzState.orderTab === 'proceeds') body = qzProceedsHTML(o);

  const title = QZ_TAB_TITLE[qzState.orderTab] || 'Order';
  const badges = {
    accounting: 'B', 'cd-a': 'A', 'cd-c': 'C', 'cd-e': 'E', 'cd-f': 'F',
    'cd-g': 'G', 'cd-h': 'H', 'cd-j': 'J', 'cd-km': 'K/M', 'cd-ln': 'L/N'
  };
  const badge = badges[qzState.orderTab] ? `<span class="qz-sec-badge">${badges[qzState.orderTab]}</span>` : '';
  const trainingTag = qzState.orderTab === 'review'
    ? '<span class="qz-training-tag">Training tool &mdash; not a Qualia Core screen</span>' : '';

  return `<div class="qz-core${qzState.railOpen ? ' rail-open' : ''}">
    <div class="qz-rail-scrim" onclick="qzToggleRail(false)"></div>
    ${qzOrderSidebarHTML(o)}
    <div class="qz-order-main">
      <div class="qz-sec-head">
        <button type="button" class="qz-rail-toggle" onclick="qzToggleRail()" aria-label="Order navigation">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
        <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1V10"/></svg></span>
        <h2>${esc(title)}</h2>${badge}${trainingTag}
        <span class="qz-sec-addr">${esc(o.propertyAddress)}</span>
      </div>
      ${flagHtml}
      <div class="qz-order-body">${body}</div>
    </div>
    ${qzOrderPanelHTML(o)}
  </div>`;
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
            <td class="ic"><button type="button" title="Message" onclick="simToast('Training only, no real message is sent.')">${QZ_ICONS.message}</button></td>
            <td class="ic"><button type="button" title="Cell" onclick="simToast('Training only, no real call is placed.')">${QZ_ICONS.cell}</button></td>
            <td class="ic"><button type="button" title="Work" onclick="simToast('Training only, no real call is placed.')">${QZ_ICONS.phone}</button></td>
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
    (typeof QZ_EXAM_BANK !== 'undefined' ? QZ_EXAM_BANK.find(i => i.type === 'verify' && i.id === id) : undefined);
}
function qzReviewScore(orderId) {
  const items = qzReviewsForOrder(orderId);
  let resolved = 0, correct = 0;
  items.forEach(r => { const s = qzStore.reviews[r.id]; if (s && s.resolvedAt) { resolved++; if (s.correct) correct++; } });
  return { resolved, correct, total: items.length };
}
function qzRevGet(id) { return qzStore.reviews[id] || (qzStore.reviews[id] = { docOpened: false }); }
/* Exam mode is derived from the item's own id rather than threaded through every call site,
   because the same engine functions are wired to onclick handlers in both contexts and an
   extra argument would have to be plumbed through ~12 render/handler pairs.
   In exam mode the engine behaves differently in three ways:
     - a wrong step 2/3 does NOT block the next step (you answer once and move on),
     - nothing is colored right/wrong and no "Try again" is offered,
     - step 4 branches on what the trainee CHOSE, not on what was correct,
   so a trainee can complete the whole item while getting every sub-part wrong, and only
   finds out at submit. In lessons, all three behave the opposite way, on purpose. */
function qzRevExamMode(id) {
  return typeof QZ_EXAM_BANK !== 'undefined' && QZ_EXAM_BANK.some(i => i.type === 'verify' && i.id === id);
}
function qzRevOpenDoc(id) {
  const r = qzReviewLookup(id);
  if (!r) return;
  simViewDoc(r.doc, r.docTitle);
  qzRevGet(id).docOpened = true;
  qzSave();
  qzRenderRoot();
  qzSyncVerifyStep(id);
}
function qzRevAnswerSource(id, optionId) {
  const r = qzReviewLookup(id);
  const st = qzRevGet(id);
  if (!st.docOpened || st.step2Choice) return;
  st.step2Choice = optionId;
  st.step2Correct = optionId === r.rightSourceOptionId;
  qzSave();
  qzRenderRoot();
  qzSyncVerifyStep(id);
}
/* In the exam a wrong step 2 must not dead-end the item: step 3 has to stay reachable so the
   trainee answers every part without learning they slipped. In lessons the opposite holds —
   step 3 is gated on step 2 being right, because there the point is to fix it now. */
function qzRevStep3Unlocked(id) {
  const st = qzRevGet(id);
  if (!st.step2Choice) return false;
  return qzRevExamMode(id) ? true : !!st.step2Correct;
}
/* Which step-4 form to show. Lessons only open step 4 once step 3 was RIGHT (a wrong pick
   gets an inline retry instead). The exam opens whichever form matches what the trainee
   chose, so a wrong action still gets carried through to a complete, gradable answer. */
function qzRevStep4Kind(id) {
  const st = qzRevGet(id);
  if (!st.step3Choice || st.step3Choice === 'none') return null;
  if (!qzRevExamMode(id) && !st.step3Correct) return null;
  return st.step3Choice === 'correct' ? 'correct' : 'escalate';
}
/* action==='none' is a terminal choice (no step 4 either way), so it finalizes right away
   regardless of whether it was the right call, the outer feedback panel covers that case.
   Any other action gates on correctness: a wrong "correct it myself"/"escalate" pick never
   reaches step 4, it shows an immediate inline retry instead (see qzRevItemHTML). */
function qzRevAnswerAction(id, action) {
  const r = qzReviewLookup(id);
  const st = qzRevGet(id);
  if (!qzRevStep3Unlocked(id) || st.step3Choice) return;
  st.step3Choice = action;
  st.step3Correct = action === r.rightAction;
  qzSave();
  if (action === 'none') { qzRevFinalize(id); return; }
  qzRenderRoot();
  qzSyncVerifyStep(id);
}
/* Step 4 (correction branch) is the step that used to be pure theater: the input came
   prefilled with the WRONG value, and nothing ever compared what was typed against
   r.correctedValue, so clicking "Save correction" without touching the field scored the item
   correct and wrote the typo back onto the order. Now the typed value is graded like any
   other sub-answer, and in a lesson a wrong one is refused the same way steps 2/3 are. */
function qzRevSaveCorrection(id) {
  const r = qzReviewLookup(id);
  const input = document.getElementById('qzRevInput-' + id);
  const val = input ? input.value.trim() : '';
  if (!val) { simToast('Enter the corrected value.'); return; }
  const st = qzRevGet(id);
  st.correctedValueSaved = val;
  st.step4ValueCorrect = qzNormalizeValue(val) === qzNormalizeValue(r.correctedValue);

  if (!qzRevExamMode(id) && !st.step4ValueCorrect) {
    // Don't write a value we just graded wrong onto the order, and don't resolve the item:
    // same "a wrong answer never passes" rule the other steps follow.
    qzSave();
    qzRenderRoot();
    simToast("That doesn't match the source document — check it and save again.");
    qzSyncVerifyStep(id);
    return;
  }
  if (st.step4ValueCorrect) {
    if (r.partyRole) qzSetPartyOverride(r.orderId, r.partyRole, { name: val });
    else if (r.field) qzSetScalarOverride(r.orderId, r.field, val);
  }
  qzRevFinalize(id);
  simToast('Correction saved.', { tone: 'good' });
}
function qzRevSaveEscalation(id) {
  const r = qzReviewLookup(id);
  const catSel = document.getElementById('qzRevCategory-' + id);
  const cat = catSel ? catSel.value : '';
  if (!cat) { simToast('Choose an escalation category.'); return; }
  const noteEl = document.getElementById('qzRevNote-' + id);
  const note = noteEl ? noteEl.value.trim() : '';
  const st = qzRevGet(id);
  st.step4Category = cat;
  st.step4CategoryCorrect = cat === r.rightCategory;
  st.note = note;
  // Same gating rule as Step 2/3: a wrong pick here must not be able to "pass" and finalize
  // the item, stay on Step 4 with inline feedback and let the trainee pick again instead.
  // The exam skips that: one submission, graded silently at the end.
  if (!qzRevExamMode(id) && !st.step4CategoryCorrect) {
    qzSave();
    qzRenderRoot();
    simToast('Not quite — check the category and submit again.');
    qzSyncVerifyStep(id);
    return;
  }
  qzRevFinalize(id);
  simToast('Escalation submitted.', { tone: qzRevGet(id).correct ? 'good' : undefined });
}
function qzRevFinalize(id) {
  const st = qzRevGet(id);
  const parts = [st.step2Correct, st.step3Correct];
  // Whichever step-4 branch the trainee actually went down is graded. Keyed off step3Choice
  // (what they did), not r.rightAction (what they should have done) — someone who wrongly
  // escalates a typo is already failing on step3Correct, and has no correctedValue to grade.
  if (st.step3Choice === 'correct') parts.push(st.step4ValueCorrect);
  else if (st.step3Choice && st.step3Choice.indexOf('escalate') === 0) parts.push(st.step4CategoryCorrect);
  st.correct = parts.every(Boolean);
  // Sticky "was right at least once", so redoing a solved item to review it can never
  // re-lock a lesson the trainee already earned (see qzLessonStepDone).
  if (st.correct) st.everCorrect = true;
  st.resolvedAt = Date.now();
  qzSave();
  qzRenderRoot();
  qzNotifyReviewResolved(id);
}
/* Full reset, used by the "Redo" control after the item is fully resolved. */
function qzRevRetry(id) {
  if (qzRevExamMode(id)) return; // exam answers are final, see qzRevExamMode
  const prev = qzStore.reviews[id] || {};
  qzStore.reviews[id] = { docOpened: !!prev.docOpened, everCorrect: !!prev.everCorrect };
  qzSave();
  qzRenderRoot();
  qzSyncVerifyStep(id);
}
/* Partial reset for a wrong mid-flow MC answer (step 2 or step 3): clears that step and
   everything after it, keeps earlier correct answers (and docOpened) intact so the trainee
   retries only what they got wrong instead of starting the whole item over. */
function qzRevRetryStep(id, fromPhase) {
  // Guarded in the engine, not just by omitting the button: the exam renders no retry
  // control, but a callable global that silently rewinds a graded answer is exactly the
  // kind of thing that turns a hiring filter back into an attendance certificate.
  if (qzRevExamMode(id)) return;
  const st = qzRevGet(id);
  if (fromPhase <= 2) { delete st.step2Choice; delete st.step2Correct; }
  if (fromPhase <= 3) { delete st.step3Choice; delete st.step3Correct; }
  delete st.step4Category; delete st.step4CategoryCorrect; delete st.note;
  delete st.correctedValueSaved; delete st.step4ValueCorrect;
  qzSave();
  qzRenderRoot();
  qzSyncVerifyStep(id);
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

  if (SimEngine.walkActive() && SimEngine.currentStep() === step) {
    if (st.correct) SimEngine.stepCompleted();
    else { SimEngine.renderRetry('Read the explanation below, then click "Redo" to try again.'); SimEngine.position(step); }
    return;
  }

  if (!st.correct) return;
  const label = qzLessonStepLabel(step);
  const prog = SimEngine.progress(l);
  if (prog.complete) simToast(`Lesson ${l.number} complete! Use the banner above to head back and unlock the next lesson.`, { tone: 'good', duration: 5000 });
  else simToast(`"${label}" done, ${prog.done} of ${prog.total} steps in Lesson ${l.number}.`, { tone: 'good' });
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
    // Shuffled: the "matches, no discrepancy" option was authored first on every single
    // item, which taught position rather than reading.
    const optsHtml = qzOptionOrder('rev2:' + id, r.sourceOptions.length).map(i => {
      const o = r.sourceOptions[i];
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
  if (qzRevStep3Unlocked(id)) {
    const answered = !!st.step3Choice;
    const optsHtml = qzOptionOrder('rev3:' + id, QZ_ACTION_CHOICES.length).map(i => {
      const a = QZ_ACTION_CHOICES[i];
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
  const step4Kind = done ? null : qzRevStep4Kind(id);
  if (step4Kind === 'correct') {
    // Starts EMPTY on purpose. Prefilling it with r.systemValue (the value under suspicion)
    // meant the trainee could "correct" the record by clicking Save without reading the
    // document at all, which is the exact skill this step exists to test.
    const wrongValue = st.correctedValueSaved && !st.step4ValueCorrect;
    const wrongValueNote = wrongValue
      ? `<div class="qz-rv-subfeedback bad">&#10007; That doesn't match the source document. Read it again and retype the value exactly as it appears.</div>`
      : '';
    step4 = `<div class="qz-rv-step active" data-rev-phase="4">
      <div class="qz-rv-step-h">Step 4 &middot; Enter the corrected value</div>
      <div class="qz-form-grid full">
        <div class="qz-field"><label>Corrected Value</label><input type="text" id="qzRevInput-${id}" value="${escAttr(st.correctedValueSaved || '')}" placeholder="Type it exactly as the source document shows it"></div>
      </div>
      ${wrongValueNote}
      <div class="qz-rv-actions"><button class="qz-btn sm primary" onclick="qzRevSaveCorrection('${id}')">Save correction</button></div>
    </div>`;
  } else if (step4Kind === 'escalate') {
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
    // Only meaningful when they went down the correction branch: r.correctedValue is null on
    // items whose right answer was "no action" or "escalate", nothing to compare against.
    if (st.step3Choice === 'correct' && r.correctedValue) {
      bits.push(st.step4ValueCorrect
        ? '<div class="qz-rv-subfeedback good">&#10003; Entered the corrected value accurately.</div>'
        : `<div class="qz-rv-subfeedback bad">&#10007; You entered "${esc(st.correctedValueSaved || '')}" &mdash; the source document shows "${esc(r.correctedValue)}"</div>`);
    }
    const noteLine = st.note ? `<div class="qz-rv-note">Your note: ${esc(st.note)}</div>` : '';
    const lessonStep = qzState.lessonId && typeof QZ_LESSONS !== 'undefined'
      ? (QZ_LESSONS.find(x => x.id === qzState.lessonId) || { steps: [] }).steps.find(s2 => s2.type === 'verify' && s2.reviewId === id)
      : null;
    const continueBtn = (st.correct && lessonStep) ? qzContinueHTML(lessonStep) : '';
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
function qzReconcilesForOrder(orderId) {
  return typeof QZ_RECONCILES !== 'undefined' ? QZ_RECONCILES.filter(r => r.orderId === orderId) : [];
}
function qzReviewHTML(o) {
  const items = qzReviewsForOrder(o.id);
  const recs = qzReconcilesForOrder(o.id);
  if (!items.length && !recs.length) {
    return `<div class="qz-panel"><div class="ph"><h4>Review</h4></div><p style="font-size:13px;color:var(--qz-muted)">No review items are set up for this order yet.</p></div>`;
  }
  const score = qzReviewScore(o.id);
  // While the walkthrough is actively working a `verify` step, show only that item in full
  // ("one point at a time" instead of the whole order's review history at once): anything
  // already resolved collapses to a compact row, anything not reached yet doesn't show. Outside
  // an active verify step (browsing normally, or mid `do`/`decide` step), show everything.
  const walkStep = (SimEngine.walkActive()) ? SimEngine.currentStep() : null;
  const walking = walkStep && walkStep.type === 'verify';
  const walkingRec = walkStep && walkStep.type === 'reconcile';
  const rows = items.map(r => {
    if (walkingRec) return qzRevGet(r.id).resolvedAt ? qzRevCollapsedHTML(r.id) : '';
    if (!walking) return qzRevItemHTML(r.id);
    if (walkStep.reviewId === r.id) return qzRevItemHTML(r.id);
    return qzRevGet(r.id).resolvedAt ? qzRevCollapsedHTML(r.id) : '';
  }).join('');
  // Reconcile items live in the same tab: they are the same job (compare the record against
  // its sources), just across more than one document at a time.
  const recRows = recs.map(r => {
    if (walkingRec) return walkStep.reconcileId === r.id ? qzRecItemHTML(r.id) : '';
    if (walking) return '';
    return qzRecItemHTML(r.id);
  }).join('');
  const scoreLine = items.length
    ? `<span class="qz-rv-score">${score.resolved}/${score.total} reviewed &middot; ${score.correct} correct calls</span>` : '';
  return `<div class="qz-panel">
    <div class="ph"><h4>Document Review</h4>${scoreLine}</div>
    <p style="font-size:13px;color:var(--qz-muted);margin:0 0 18px">Open the source document, work through each step, and report what you find: verify it, correct it, or escalate it.</p>
    ${rows}${recRows}
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
  qzSyncEditStep();
}
/* Keeps the de-edit step's tip text live as the trainee types the buyer's phone number, same
   idea as qzSyncSearchStep: say immediately if what's typed doesn't match the number the
   walkthrough asked for, instead of staying silent until Save is clicked. */
function qzSyncEditStep() {
  if (!SimEngine.walkActive()) { SimEngine.reposition(); return; }
  const step = SimEngine.currentStep();
  if (!step || step.type !== 'do' || step.checklistId !== 'de-edit') { SimEngine.reposition(); return; }
  SimEngine.renderTip(step, false);
  SimEngine.position(step);
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
    const legal = (document.getElementById('qzDeLegal').value || '').trim();
    if (addr) qzSetScalarOverride(orderId, 'propertyAddress', addr);
    if (propType) qzSetScalarOverride(orderId, 'propertyType', propType);
    if (legal) qzSetScalarOverride(orderId, 'legalDescription', legal);
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
    const step = (SimEngine.walkActive()) ? SimEngine.currentStep() : null;
    const isEditWalkStep = step && step.type === 'do' && step.checklistId === 'de-edit';
    if (!isEditWalkStep || buyerPhoneMatchesTarget) {
      qzMark('de-edit');
    } else {
      simToast(`Saved, but it doesn't match — the buyer said ${QZ_DE_EDIT_TARGET_PHONE}. Check the Phone field and save again.`);
      skipSavedToast = true;
    }
  } else {
    // Same coercion path as a Review correction (qzSetScalarOverride → qzCoerceFieldValue):
    // both write the same numeric order fields, so neither may store a raw "$425.00" string.
    const price = qzParseNumeric(document.getElementById('qzDePrice').value);
    const loan = qzParseNumeric(document.getElementById('qzDeLoan').value);
    const closing = (document.getElementById('qzDeClosing').value || '').trim();
    const titleNum = (document.getElementById('qzDeTitleNum').value || '').trim();
    const agency = (document.getElementById('qzDeSettleAgency').value || '').trim();
    if (price !== null) qzSetScalarOverride(orderId, 'purchasePrice', price);
    if (loan !== null) qzSetScalarOverride(orderId, 'loanAmount', loan);
    if (closing) qzSetScalarOverride(orderId, 'closingDate', closing);
    if (titleNum) qzSetScalarOverride(orderId, 'titleNumber', titleNum);
    if (agency) qzSetScalarOverride(orderId, 'settlementAgency', agency);
  }
  if (!skipSavedToast) simToast('Changes saved.', { tone: 'good' });
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
      <div class="qz-field wide"><label>Legal Description</label><input id="qzDeLegal" value="${escAttr(o.legalDescription || '')}" oninput="qzDeMarkDirty()"></div>
    </div>`;
  } else if (sub === 'parties') {
    const addPartyBtn = `<div style="margin-bottom:12px;text-align:right"><button class="qz-btn sm primary" type="button" onclick="qzAddPartyModal('${o.id}')">+ Add Party</button></div>`;
    body = addPartyBtn + o.parties.map(p => `
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
  qzDemo.docStatus[id] = 'Received';
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
  qzRenderRoot();
}
/* Opening a document from the Documents table is the "I looked at it" step of the lifecycle,
   so it has to mark docs-download the same way the Download button does. The refactor pointed
   this button straight at the engine's simViewDoc, which only opens the modal — so Lesson 4
   step 2 opened the file and then waited forever for a step that could never complete.
   Review items deliberately keep calling simViewDoc directly: they track their own docOpened. */
function qzViewDoc(file, title) {
  qzMark('docs-download');
  simViewDoc(file, title);
}
function qzDownloadDoc() { qzMark('docs-download'); simToast('Downloaded (training only, no real file was transferred).'); }
function qzReviewDoc(id) { qzDemo.docStatus[id] = 'Reviewed'; qzMark('docs-review'); qzRenderRoot(); }


document.addEventListener('keydown', e => {
  if (e.key === 'Escape') simCloseDoc();
});
function qzDocumentsHTML(o) {
  const o2 = qzGetOrder(o.id);
  const daysToClosing = o2 ? qzDaysFromToday(o2.closingDate) : null;
  const rows = qzDocsForOrder(o.id).map(d => {
    const st = qzDocStatus(d);
    const badgeClass = st === 'Pending' ? 'pending' : st === 'Received' ? 'received' : 'reviewed';
    // A pending document only matters in relation to the closing it's holding up — showing
    // that pressure in the row is what makes "which of these is urgent" a real question.
    const pressure = (st === 'Pending' && daysToClosing !== null)
      ? ` <span class="qz-due ${daysToClosing < 0 ? 'overdue' : daysToClosing <= 7 ? 'soon' : 'far'}">closing in ${daysToClosing}d</span>`
      : '';
    let actions = '';
    if (st === 'Pending') actions = `<button class="qz-btn sm primary" data-doc-action="upload" onclick="qzUploadDoc(${d.id})">Upload</button>`;
    else {
      actions = d.file
        ? `<button class="qz-btn sm" data-doc-action="view" onclick="qzViewDoc('${d.file}','${esc(d.name)}')">View</button>`
        : `<button class="qz-btn sm" data-doc-action="download" onclick="qzDownloadDoc()">Download</button>`;
      if (st === 'Received') actions += ` <button class="qz-btn sm" data-doc-action="review" onclick="qzReviewDoc(${d.id})">Mark Reviewed</button>`;
    }
    return `<tr data-doc-id="${d.id}"><td>${esc(d.name)}</td><td>${esc(d.type)}</td><td><span class="qz-badge ${badgeClass}">${st}</span>${pressure}</td><td>${esc(d.uploadedBy)}</td><td>${fmtDate(d.date)}</td><td><div class="qz-row-actions">${actions}</div></td></tr>`;
  }).join('');
  return `<div class="qz-panel"><div class="ph"><h4>Documents</h4><button class="qz-btn sm primary" type="button" onclick="qzAddDocumentModal('${o.id}')">+ Add Document</button></div>
    <table class="qz-tbl"><thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Uploaded By</th><th>Date</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>
  </div>`;
}

/* ---------- Tasks ---------- */
function qzCompleteTask(id) { qzDemo.taskStatus[id] = 'Complete'; qzMark('tasks-complete'); qzRenderRoot(); qzUpdateBellBadge(); }
function qzTasksHTML(o) {
  const rows = qzTasksForOrder(o.id).map(t => {
    const st = qzTaskStatus(t);
    const badgeClass = st === 'Complete' ? 'complete' : st === 'In Progress' ? 'progress' : 'open';
    const action = st !== 'Complete' ? `<button class="qz-btn sm primary" onclick="qzCompleteTask(${t.id})">Mark Complete</button>` : '<span style="color:var(--qz-muted);font-size:12px">Done</span>';
    // A completed task's countdown is noise — only what's still open can be "overdue".
    const due = st === 'Complete' ? fmtDate(t.dueDate) : `${fmtDate(t.dueDate)} ${qzDueChipHTML(t.dueDate)}`;
    return `<tr data-task-id="${t.id}"><td>${esc(t.title)}</td><td>${esc(t.assignedTo)}</td><td>${due}</td><td><span class="qz-badge ${badgeClass}">${st}</span></td><td>${action}</td></tr>`;
  }).join('');
  const o2 = qzGetOrder(o.id);
  const closingLine = o2 && o2.closingDate
    ? `<div class="qz-due-context">Today is ${fmtDate(QZ_TODAY)}. This file is scheduled to close ${qzDaysPhrase(o2.closingDate)}, on ${fmtDate(o2.closingDate)}.</div>`
    : '';
  return `<div class="qz-panel"><div class="ph"><h4>Tasks</h4><button class="qz-btn sm primary" type="button" onclick="qzAddTaskModal('${o.id}')">+ Add Task</button></div>
    ${closingLine}
    <table class="qz-tbl"><thead><tr><th>Task</th><th>Assigned To</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  </div>`;
}

/* ---------- Workflow ---------- */
function qzWorkflowHTML(o) {
  const note = o.flag === 'closing-delay'
    ? `<p class="qz-tl-readonly-note" style="margin-top:14px;font-size:12.5px;color:var(--qz-bad)">Original closing date was ${fmtDate(o.originalClosingDate)}. Workflow structure is configured by admins, always escalate date changes per protocol.</p>`
    : `<p class="qz-tl-readonly-note" style="margin-top:14px;font-size:12.5px;color:var(--qz-muted)">Workflow milestones track order stage progression.</p>`;
  const advanceBtn = `<button class="qz-btn sm primary" style="margin-top:14px" type="button" onclick="qzAdvanceStageModal('${o.id}')">Advance Stage &rarr;</button>`;
  return `<div class="qz-panel"><div class="ph"><h4>Workflow</h4>${advanceBtn}</div>
    ${qzTimelineHTML(o)}
    <div class="qz-tl-status"><b>Current stage: <span>${esc(QZ_STAGES[o.stageIndex])}</span></b><p>${esc(o.statusNote)}</p></div>
    ${note}
  </div>`;
}

/* ---------- Communication ---------- */
function qzOpenThread(id) { qzState.threadId = id; qzMark('comm-open'); qzRenderRoot(); }
/* Merges a thread's original messages with whatever the trainee has replied in this
   session, replies are stored in qzDemo.replies so they reset on F5 reload. */
function qzThreadMessages(threadId) {
  const t = QZ_MESSAGES.find(m => m.id === threadId);
  if (!t) return [];
  const stored = (qzDemo.replies && qzDemo.replies[threadId]) || [];
  return t.thread.concat(stored);
}
function qzSendReply(threadId) {
  const box = document.getElementById('qzReplyBox');
  const text = box ? box.value.trim() : '';
  if (!text) { simToast('Write a reply before sending.'); return; }
  if (text.length < 20) { simToast('Your reply should be at least 20 characters. Write a professional response.'); return; }
  const msgs = qzThreadMessages(threadId);
  const last = msgs[msgs.length - 1];
  const recipient = last.sender === 'You (VA)' ? last.recipient : last.sender;
  qzDemo.replies[threadId] = qzDemo.replies[threadId] || [];
  qzDemo.replies[threadId].push({ sender: 'You (VA)', recipient: recipient, date: QZ_TODAY, body: text });
  qzMark('comm-reply');
  qzRenderRoot();
}
function qzLogFollowup() { qzMark('comm-followup'); simToast('Follow-up logged on this file (training only).'); }
function qzCommunicationHTML(o) {
  const threads = QZ_MESSAGES.filter(m => m.orderId === o.id);
  if (!qzState.threadId || !threads.some(t => t.id === qzState.threadId)) qzState.threadId = threads[0] ? threads[0].id : null;
  const list = threads.map(t => {
    const count = qzThreadMessages(t.id).length;
    return `<div class="qz-thread-item ${t.id === qzState.threadId ? 'active' : ''}" onclick="qzOpenThread(${t.id})"><b>${esc(t.subject)}</b><span>${count} message${count !== 1 ? 's' : ''}</span></div>`;
  }).join('');
  // A compose exercise takes over this tab while it's the active thing to do: it carries its
  // own thread context and its own graded reply box, so showing the ordinary reply UI beside
  // it would just offer a second, ungraded way to answer the same message.
  // The takeover needs a REASON, though. ORD-2026-1398 carries two compose exercises, and
  // while merely having one was reason enough, this tab never rendered its thread list, reply
  // box or Log Follow-up button on that order at all — which is every interactive step of
  // Lesson 5. The trainee got a walkthrough tip pointing at controls that were not on screen.
  const composes = (typeof QZ_COMPOSES !== 'undefined' ? QZ_COMPOSES : []).filter(c => c.orderId === o.id);
  const walkStep = (SimEngine.walkActive()) ? SimEngine.currentStep() : null;
  const activeCompose = composes.length ? qzActiveComposeFor(o, composes, walkStep) : null;
  if (activeCompose) {
    // Only reachable by choice (no walkthrough driving it) does it need a way back.
    const back = (!walkStep && qzState.composeId === activeCompose.id)
      ? '<button class="qz-btn sm" style="margin-bottom:12px" onclick="qzCloseCompose()">&larr; Back to messages</button>'
      : '';
    return `<div class="qz-panel">${back}${qzComposeItemHTML(activeCompose.id)}</div>`;
  }
  /* Free navigation still has to be able to REACH the exercise, so when the tab is showing
     ordinary threads the order's exercises sit at the top of the thread list as openable
     entries rather than disappearing. */
  const exerciseList = composes.map(c => {
    const st = qzComposeGet(c.id);
    const state = st.resolvedAt ? (st.correct ? 'Completed' : 'Needs revision') : 'Not started';
    // Deliberately NOT .qz-thread-item: that selector is the walkthrough's handle on a real
    // message thread (Lesson 5 step 1), and an exercise entry sitting above the threads would
    // otherwise be the first thing it matched.
    return `<div class="qz-thread-exercise" onclick="qzOpenCompose('${escAttr(c.id)}')"><b>Exercise &middot; ${esc(c.label)}</b><span>${esc(state)}</span></div>`;
  }).join('');
  const active = threads.find(t => t.id === qzState.threadId);
  let detail = '<div class="qz-panel">Select a thread.</div>';
  if (active) {
    const msgs = qzThreadMessages(active.id).map(m => `<div class="qz-msg ${m.sender === 'You (VA)' ? 'mine' : ''}"><div class="meta">${esc(m.sender)} &rarr; ${esc(m.recipient)} &middot; ${fmtDate(m.date)}</div>${esc(m.body)}</div>`).join('');
    detail = `<div class="qz-panel"><div class="ph"><h4>${esc(active.subject)}</h4></div>
      ${msgs}
      <div class="qz-reply"><textarea id="qzReplyBox" placeholder="Write a reply..." oninput="qzSyncReplyStep()"></textarea>
      <div class="row"><button class="qz-btn" data-comm-action="followup" onclick="qzLogFollowup()">Log Follow-up</button><button class="qz-btn primary" data-comm-action="reply" onclick="qzSendReply(${active.id})">Send Reply</button></div></div>
    </div>`;
  }
  const newBtn = `<div style="padding:0 0 10px 0"><button class="qz-btn sm primary" style="width:100%" onclick="qzNewThreadModal('${o.id}')">+ New Message</button></div>`;
  return `<div class="qz-comm-grid"><div class="qz-thread-list">${newBtn}${exerciseList}${list}</div>${detail}</div>`;
}
/* Which compose exercise (if any) owns the Communication tab right now. In order:
     1. the walkthrough is standing on a compose step for this order,
     2. the trainee opened one from the thread list,
     3. the lesson being worked has a compose step for this order (Lesson 14 has no
        walkthrough at all, so nothing else would surface its exercise).
   Everything else — free navigation, and any lesson whose steps use the ordinary thread
   controls, Lesson 5 above all — gets the normal messages view. */
function qzActiveComposeFor(o, composes, walkStep) {
  if (walkStep && walkStep.type === 'compose') {
    return composes.find(c => c.id === walkStep.composeId) || null;
  }
  // A walkthrough parked on a `do` step for THIS order wants the real controls that step
  // points at, never an exercise panel covering them.
  if (walkStep && walkStep.type === 'do' && walkStep.orderId === o.id) return null;
  if (qzState.composeId) {
    const chosen = composes.find(c => c.id === qzState.composeId);
    if (chosen) return chosen;
  }
  const lesson = (qzState.lessonId && typeof QZ_LESSONS !== 'undefined')
    ? QZ_LESSONS.find(x => x.id === qzState.lessonId) : null;
  if (lesson && lesson.steps.some(st => st.type === 'compose' && composes.some(c => c.id === st.composeId))) {
    const ids = lesson.steps.filter(st => st.type === 'compose').map(st => st.composeId);
    const mine = composes.filter(c => ids.indexOf(c.id) > -1);
    return mine.find(c => !qzComposeGet(c.id).resolvedAt) || mine[0] || null;
  }
  return null;
}
function qzOpenCompose(id) { qzState.composeId = id; qzRenderRoot(); }
function qzCloseCompose() { qzState.composeId = null; qzRenderRoot(); }

/* ---------- Vendors ---------- */
function qzCheckVendor(id) {
  const v = QZ_VENDORS.find(x => x.id === id);
  qzMark('vendors-check');
  simToast(v.name + ': ' + v.status);
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
function qzReviewClosing() { qzMark('closing-review'); simToast('Closing checklist reviewed (training only).'); }
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
/* ---------- Accounting: settlement statement grid ----------
   Core does not show charges as a flat three-column list. It shows numbered lines against
   who pays them and when: Paid by Borrower (At Closing / Before Closing), Paid by Seller
   (same split), and By Others. Reading that grid — and understanding that the same total
   can sit in very different columns — is the actual skill, so the layout is the lesson.
   Blank numbered lines are rendered deliberately: the real grid is a fixed-length section,
   not a list that shrinks to its contents.
   Each charge declares which column it lands in; `col` is one of the five column keys. */
const QZ_ACCT_COLS = ['borrowerAt', 'borrowerBefore', 'sellerAt', 'sellerBefore', 'byOthers'];
function qzAcctLines(o) {
  const lines = [
    { desc: 'Title - Settlement or Closing Fee', payee: 'Best Closing Inc.', amount: Math.round(o.purchasePrice * 0.0014 * 100) / 100, col: 'borrowerAt' },
    { desc: "Owner's Title Policy", payee: 'Best Closing Inc.', amount: Math.round(o.purchasePrice * 0.0057 * 100) / 100, col: 'sellerAt' },
    { desc: 'Recording Fees', payee: 'County Clerk', amount: 185, col: 'borrowerAt' },
    { desc: 'Credit Report', payee: 'Certified Credit Bureau', amount: 29.5, col: 'borrowerBefore' }
  ];
  if (o.inspectionCharge != null) {
    lines.push({ desc: 'Home Inspection Fee', payee: 'Ace Home Inspections', amount: Number(o.inspectionCharge), col: 'borrowerBefore' });
  }
  return lines;
}
function qzAccountingHTML(o) {
  const lines = qzAcctLines(o);
  const MIN_ROWS = 8;
  const totals = { borrowerAt: 0, borrowerBefore: 0, sellerAt: 0, sellerBefore: 0, byOthers: 0 };
  lines.forEach(l => { if (totals[l.col] != null) totals[l.col] += l.amount; });

  const rowHTML = (l, i) => {
    const cells = QZ_ACCT_COLS.map(c =>
      `<td class="num ${l && l.col === c ? 'has' : ''}">${l && l.col === c ? fmtMoney(l.amount) : ''}</td>`
    ).join('');
    return `<tr class="${l ? '' : 'empty'}">
      <td class="ln">${String(i + 1).padStart(2, '0')}</td>
      <td class="desc">${l ? esc(l.desc) : ''}</td>
      <td class="payee">${l ? 'to ' + esc(l.payee) : ''}</td>
      ${cells}
    </tr>`;
  };
  const body = [];
  for (let i = 0; i < Math.max(MIN_ROWS, lines.length); i++) body.push(rowHTML(lines[i] || null, i));
  const totalCells = QZ_ACCT_COLS.map(c => `<td class="num">${fmtMoney(totals[c])}</td>`).join('');

  return `<div class="qz-panel">
    <div class="qz-readonly-note">This grid is read-only for a VA. Review the figures and route anything that looks wrong to someone with authority to change it, funds are never modified from here.</div>
    <div class="qz-tbl-scroll">
      <table class="qz-acct-grid">
        <thead>
          <tr class="grp">
            <th colspan="3"></th>
            <th colspan="2">Paid by Borrower</th>
            <th colspan="2">Paid by Seller</th>
            <th rowspan="2" class="by-others">By Others</th>
          </tr>
          <tr>
            <th class="ln"></th><th class="desc">Description</th><th class="payee">Payee</th>
            <th class="num">At Closing</th><th class="num">Before Closing</th>
            <th class="num">At Closing</th><th class="num">Before Closing</th>
          </tr>
        </thead>
        <tbody>${body.join('')}</tbody>
        <tfoot><tr><td colspan="3" class="tl">TOTALS</td>${totalCells}</tr></tfoot>
      </table>
    </div>
  </div>`;
}

/* ---------- 17 Rail Pages (Phase D) ---------- */

function qzCommitmentHTML(o) {
  const buyer = o.parties.find(p => p.role === 'Buyer' || p.role === 'Borrower') || { name: 'Not set' };
  const lender = o.parties.find(p => p.role === 'Lender') || { name: 'None (Cash)' };
  return `
    <div class="qz-panel">
      <div class="ph"><h4>Title Commitment &mdash; ${esc(o.titleNumber || 'TX-2026-0000')}</h4></div>
      <p style="font-size:12.5px;color:var(--qz-muted);margin-bottom:14px">Issued pursuant to Texas Insurance Code Title 11 &middot; Underwriter: Old Republic National Title Insurance Company</p>
      
      <div class="qz-sched-box">
        <div class="qz-sched-head"><span>Schedule A &middot; Policy Information & Vesting</span><span class="qz-badge complete">Effective ${fmtDate(o.opened)}</span></div>
        <div class="qz-sched-body">
          <div class="qz-calc-row"><span>1. Commitment Number:</span><span class="qz-calc-val">${esc(o.titleNumber || o.id)}</span></div>
          <div class="qz-calc-row"><span>2. Policy Amount (Owner's Policy):</span><span class="qz-calc-val">${fmtMoney(o.purchasePrice)}</span></div>
          <div class="qz-calc-row"><span>&nbsp;&nbsp;&nbsp;Proposed Insured:</span><span class="qz-calc-val">${esc(buyer.name)}</span></div>
          <div class="qz-calc-row"><span>3. Policy Amount (Lender's Policy):</span><span class="qz-calc-val">${o.loanAmount ? fmtMoney(o.loanAmount) : 'None'}</span></div>
          <div class="qz-calc-row"><span>&nbsp;&nbsp;&nbsp;Proposed Insured:</span><span class="qz-calc-val">${esc(lender.name)}</span></div>
          <div class="qz-calc-row"><span>4. Estate or Interest Insured:</span><span class="qz-calc-val">Fee Simple</span></div>
          <div class="qz-calc-row"><span>5. Title currently vested in:</span><span class="qz-calc-val">${esc(qzOrderParty(o, 'Seller'))}</span></div>
          <div class="qz-calc-row"><span>6. Legal Description:</span><span class="qz-calc-val">${esc(o.legalDescription || 'See Exhibit A on file')}</span></div>
        </div>
      </div>

      <div class="qz-sched-box">
        <div class="qz-sched-head"><span>Schedule B &middot; Part I &mdash; Requirements</span><span class="qz-badge progress">5 Requirements</span></div>
        <div class="qz-sched-body">
          <div class="qz-sched-item"><span class="num">1.</span><div>Instruments creating the estate/interest to be insured must be approved, executed, and filed for record: General Warranty Deed from <b>${esc(qzOrderParty(o, 'Seller'))}</b> to <b>${esc(buyer.name)}</b>.</div></div>
          <div class="qz-sched-item"><span class="num">2.</span><div>Pay and satisfy full purchase consideration of <b>${fmtMoney(o.purchasePrice)}</b> to the grantor.</div></div>
          <div class="qz-sched-item"><span class="num">3.</span><div>Pay all taxes, charges, and assessments levied and due prior to closing.</div></div>
          <div class="qz-sched-item"><span class="num">4.</span><div>Payoff and full release of prior recorded deed of trust and liens against the subject property.</div></div>
          <div class="qz-sched-item"><span class="num">5.</span><div>Identity Affidavit and marital status statement executed by all parties to the transaction.</div></div>
        </div>
      </div>

      <div class="qz-sched-box">
        <div class="qz-sched-head"><span>Schedule B &middot; Part II &mdash; Standard Exceptions</span><span class="qz-badge">Standard Exceptions</span></div>
        <div class="qz-sched-body">
          <div class="qz-sched-item"><span class="num">1.</span><div>Standby fees, taxes and assessments by any taxing authority for current and subsequent years (prorated).</div></div>
          <div class="qz-sched-item"><span class="num">2.</span><div>Restrictive covenants affecting property recorded in Collin/Dallas County map and deed records.</div></div>
          <div class="qz-sched-item"><span class="num">3.</span><div>Utility easements, building setback lines, and drainage easements as shown on recorded subdivision plat.</div></div>
          <div class="qz-sched-item"><span class="num">4.</span><div>Any mineral reservations, oil/gas leases, and royalty interests of record in chain of title.</div></div>
        </div>
      </div>
    </div>`;
}

function qzProrationsHTML(o) {
  const price = o.purchasePrice || 400000;
  const taxRate = 0.0215; // 2.15% average property tax
  const annualTax = Math.round(price * taxRate);
  const closingMonth = Number((o.closingDate || '2026-08-28').slice(5, 7));
  const closingDay = Number((o.closingDate || '2026-08-28').slice(8, 10));
  const daysElapsed = Math.min(365, (closingMonth - 1) * 30 + closingDay);
  const sellerTaxShare = Math.round(annualTax * (daysElapsed / 365) * 100) / 100;
  const hoaQuarterly = 135.00;
  const hoaQuarterDay = closingDay % 90;
  const sellerHoaShare = Math.round(hoaQuarterly * (hoaQuarterDay / 90) * 100) / 100;

  return `
    <div class="qz-panel">
      <div class="ph"><h4>Taxes & Prorations Calculator</h4><button class="qz-btn sm" onclick="simToast('Proration recalculated with statutory 365-day Texas convention.')">Recalculate</button></div>
      <p style="font-size:12.5px;color:var(--qz-muted);margin-bottom:14px">Prorations calculated through midnight preceding closing date (${fmtDate(o.closingDate)}) using Texas statutory 365-day calendar convention.</p>
      
      <div class="qz-grid2">
        <div class="qz-calc-card">
          <h5 style="margin:0 0 10px 0;color:var(--qz-navy)">County & Municipal Real Estate Taxes</h5>
          <div class="qz-calc-row"><span>Assessed Property Valuation:</span><span class="qz-calc-val">${fmtMoney(price)}</span></div>
          <div class="qz-calc-row"><span>Effective Combined Tax Rate:</span><span class="qz-calc-val">2.15% / year</span></div>
          <div class="qz-calc-row"><span>Total Annual Taxes (estimated):</span><span class="qz-calc-val">${fmtMoney(annualTax)}</span></div>
          <div class="qz-calc-row"><span>Proration Period (Jan 1 &rarr; ${fmtDate(o.closingDate)}):</span><span class="qz-calc-val">${daysElapsed} of 365 days</span></div>
          <div class="qz-calc-row total"><span>Seller Tax Debit / Buyer Credit:</span><span class="qz-calc-val" style="color:var(--qz-ocean)">${fmtMoney(sellerTaxShare)}</span></div>
        </div>

        <div class="qz-calc-card">
          <h5 style="margin:0 0 10px 0;color:var(--qz-navy)">Homeowners Association (HOA) Assessments</h5>
          <div class="qz-calc-row"><span>HOA Assessment Cycle:</span><span class="qz-calc-val">Quarterly ($135.00)</span></div>
          <div class="qz-calc-row"><span>Current Quarter Assessment Status:</span><span class="qz-calc-val">Paid in advance by Seller</span></div>
          <div class="qz-calc-row"><span>Days owned by Buyer this quarter:</span><span class="qz-calc-val">${90 - hoaQuarterDay} days</span></div>
          <div class="qz-calc-row total"><span>Buyer HOA Debit / Seller Reimbursement:</span><span class="qz-calc-val" style="color:var(--qz-ocean)">${fmtMoney(Math.max(0, hoaQuarterly - sellerHoaShare))}</span></div>
        </div>
      </div>
    </div>`;
}

function qzPayoffsHTML(o) {
  const payoffPrincipal = Math.round(o.purchasePrice * 0.58);
  const perDiem = Math.round((payoffPrincipal * 0.0575 / 365) * 100) / 100;
  const goodThrough = '2026-08-10';
  const isStale = (goodThrough < (o.closingDate || '2026-08-28'));
  const wireFee = 25.00;
  const releaseFee = 75.00;
  const totalPayoff = payoffPrincipal + (perDiem * 15) + wireFee + releaseFee;

  return `
    <div class="qz-panel">
      <div class="ph"><h4>Existing Mortgage Payoffs</h4><button class="qz-btn sm primary" onclick="simToast('Payoff update request transmitted to loan servicer.')">Request Updated Payoff</button></div>
      
      ${isStale ? `
      <div class="qz-wire-verify-box" style="margin-top:0;margin-bottom:16px;background:#fef2f2;border-color:#fecaca">
        <h5 style="color:#991b1b">&sim; Payoff Statement Expiration Notice</h5>
        <p style="margin:0;font-size:12.5px;color:#7f1d1d">The payoff statement on file is valid through <b>${fmtDate(goodThrough)}</b>, which precedes scheduled funding date <b>${fmtDate(o.closingDate)}</b>. Funding on this stale balance will cause an escrow shortage. An updated statement must be obtained.</p>
      </div>` : ''}

      <div class="qz-calc-card">
        <h5 style="margin:0 0 10px 0;color:var(--qz-navy)">1st Lien &mdash; Summit Ridge Mortgage Servicing (Loan #8842-117093)</h5>
        <div class="qz-calc-row"><span>Unpaid Principal Balance:</span><span class="qz-calc-val">${fmtMoney(payoffPrincipal)}</span></div>
        <div class="qz-calc-row"><span>Interest Rate:</span><span class="qz-calc-val">5.750% (Per diem: ${fmtMoney(perDiem)} / day)</span></div>
        <div class="qz-calc-row"><span>Statement Good-Through Date:</span><span class="qz-calc-val ${isStale ? 'bad' : ''}">${fmtDate(goodThrough)} ${isStale ? '(Expired)' : '(Valid)'}</span></div>
        <div class="qz-calc-row"><span>Prepayment Penalty:</span><span class="qz-calc-val">$0.00</span></div>
        <div class="qz-calc-row"><span>County Lien Release & Escrow Fee:</span><span class="qz-calc-val">${fmtMoney(releaseFee)}</span></div>
        <div class="qz-calc-row"><span>Outgoing Payoff Wire Fee:</span><span class="qz-calc-val">${fmtMoney(wireFee)}</span></div>
        <div class="qz-calc-row total"><span>Total Estimated Payoff Wire:</span><span class="qz-calc-val" style="color:var(--qz-navy)">${fmtMoney(totalPayoff)}</span></div>
      </div>
    </div>`;
}

function qzCplHTML(o) {
  const lender = o.parties.find(p => p.role === 'Lender') || { name: 'Frisco Community Lending' };
  const cplRecord = (typeof QZS_CPLS !== 'undefined' && QZS_CPLS.find(c => c.order === o.id)) || {
    cpl: 'CPL-' + (8900 + (parseInt(o.id.replace('ORD-2026-', '')) % 100)),
    issued: '2026-07-05',
    expires: '2026-09-05',
    uw: 'Old Republic National Title',
    jacket: 'OR-TX-' + (448000 + (parseInt(o.id.replace('ORD-2026-', '')) % 1000)),
    status: 'Active'
  };

  return `
    <div class="qz-panel">
      <div class="ph">
        <h4>Closing Protection Letter (CPL)</h4>
        <button class="qz-btn sm primary" onclick="simToast('CPL reissued for 60 days. Jacket updated in underwriter portal.', {tone:'good'})">Reissue CPL</button>
      </div>
      <p style="font-size:12.5px;color:var(--qz-muted);margin-bottom:14px">Indemnification agreement issued by underwriter insuring lender against fraud, dishonesty, or handling negligence by settlement agent.</p>

      <div class="qz-calc-card">
        <div class="qz-calc-row"><span>CPL Certificate Number:</span><span class="qz-calc-val">${esc(cplRecord.cpl)}</span></div>
        <div class="qz-calc-row"><span>Title Underwriter:</span><span class="qz-calc-val">${esc(cplRecord.uw)}</span></div>
        <div class="qz-calc-row"><span>Policy Jacket Number:</span><span class="qz-calc-val">${esc(cplRecord.jacket)}</span></div>
        <div class="qz-calc-row"><span>Insured Lender:</span><span class="qz-calc-val">${esc(lender.name)}</span></div>
        <div class="qz-calc-row"><span>Insured Borrower / Buyer:</span><span class="qz-calc-val">${esc(qzOrderParty(o, 'Buyer'))}</span></div>
        <div class="qz-calc-row"><span>Insured Amount (Loan Amount):</span><span class="qz-calc-val">${fmtMoney(o.loanAmount || o.purchasePrice)}</span></div>
        <div class="qz-calc-row"><span>Date Issued:</span><span class="qz-calc-val">${fmtDate(cplRecord.issued)}</span></div>
        <div class="qz-calc-row"><span>Expiration Date:</span><span class="qz-calc-val">${fmtDate(cplRecord.expires)}</span></div>
        <div class="qz-calc-row total"><span>CPL Status:</span><span class="qz-cpl-badge ${cplRecord.status.toLowerCase()}">${esc(cplRecord.status)}</span></div>
      </div>
    </div>`;
}

function qzPolicyInfoHTML(o) {
  // Texas Department of Insurance (TDI) basic manual promulgated rate calculation
  const p = o.purchasePrice || 350000;
  let basicRate = 0;
  if (p <= 100000) basicRate = 875;
  else if (p <= 200000) basicRate = 875 + ((p - 100000) / 1000) * 5.54;
  else if (p <= 400000) basicRate = 1429 + ((p - 200000) / 1000) * 4.56;
  else basicRate = 2341 + ((p - 400000) / 1000) * 3.85;
  basicRate = Math.round(basicRate);

  const simultaneousLenderFee = o.loanAmount ? 100 : 0;
  const t19Fee = 25.00;
  const t30Fee = 20.00;
  const totalPremium = basicRate + simultaneousLenderFee + t19Fee + t30Fee;

  return `
    <div class="qz-panel">
      <div class="ph"><h4>Title Policy Info & Promulgated Rates</h4></div>
      <p style="font-size:12.5px;color:var(--qz-muted);margin-bottom:14px">Texas title insurance rates are set by the Texas Department of Insurance (TDI Schedule R-1) and non-negotiable.</p>

      <div class="qz-calc-card">
        <h5 style="margin:0 0 10px 0;color:var(--qz-navy)">Promulgated Premium Calculation</h5>
        <div class="qz-calc-row"><span>Owner's Title Policy (Basic Schedule R-1 on ${fmtMoney(o.purchasePrice)}):</span><span class="qz-calc-val">${fmtMoney(basicRate)}</span></div>
        <div class="qz-calc-row"><span>Lender's Title Policy (Simultaneous Issue Schedule R-5):</span><span class="qz-calc-val">${fmtMoney(simultaneousLenderFee)}</span></div>
        <div class="qz-calc-row"><span>T-19 Restrictive Covenants & Encroachments Endorsement:</span><span class="qz-calc-val">${fmtMoney(t19Fee)}</span></div>
        <div class="qz-calc-row"><span>T-30 Tax Deletion Endorsement:</span><span class="qz-calc-val">${fmtMoney(t30Fee)}</span></div>
        <div class="qz-calc-row total"><span>Total Promulgated Premium:</span><span class="qz-calc-val" style="color:var(--qz-navy)">${fmtMoney(totalPremium)}</span></div>
      </div>

      <div class="qz-calc-card" style="margin-top:12px">
        <h5 style="margin:0 0 10px 0;color:var(--qz-navy)">Premium Remittance Split</h5>
        <div class="qz-calc-row"><span>Title Agency Retention (85%):</span><span class="qz-calc-val">${fmtMoney(totalPremium * 0.85)}</span></div>
        <div class="qz-calc-row"><span>Underwriter Remittance Due (15%):</span><span class="qz-calc-val">${fmtMoney(totalPremium * 0.15)}</span></div>
      </div>
    </div>`;
}

function qzFinalPolicyHTML(o) {
  const isClosed = o.stageIndex >= 4;
  return `
    <div class="qz-panel">
      <div class="ph"><h4>Final Policy Production</h4></div>
      <p style="font-size:12.5px;color:var(--qz-muted);margin-bottom:14px">Post-closing document verification, recording confirmation, and policy jacket delivery to insureds.</p>

      <div class="qz-calc-card">
        <div class="qz-calc-row"><span>Recorded Deed Instrument:</span><span class="qz-calc-val">${isClosed ? 'Doc #2026-0811904 (Collin Co.)' : 'Pending Recording'}</span></div>
        <div class="qz-calc-row"><span>Owner's Policy Jacket Assigned:</span><span class="qz-calc-val">OR-TX-448120</span></div>
        <div class="qz-calc-row"><span>Lender's Policy Jacket Assigned:</span><span class="qz-calc-val">${o.loanAmount ? 'OR-TX-448121' : 'None'}</span></div>
        <div class="qz-calc-row"><span>Underwriter Remittance Status:</span><span class="qz-calc-val">${isClosed ? 'Remitted' : 'Pending Month-End'}</span></div>
        <div class="qz-calc-row total"><span>Policy Production Status:</span><span class="qz-badge ${isClosed ? 'complete' : 'progress'}">${isClosed ? 'Policies Issued & Delivered' : 'Pending Post-Closing'}</span></div>
      </div>
    </div>`;
}

function qzClosingDisclosureSectionHTML(o, secKey) {
  const titles = {
    'cd-a': 'Section A &middot; Origination Charges',
    'cd-c': 'Section C &middot; Services Borrower Did Shop For',
    'cd-e': 'Section E &middot; Taxes and Other Government Fees',
    'cd-f': 'Section F &middot; Prepaids',
    'cd-g': 'Section G &middot; Initial Escrow Payment at Closing',
    'cd-h': 'Section H &middot; Other Charges',
    'cd-j': 'Section J &middot; Total Closing Costs for Borrower',
    'cd-km': 'Sections K & M &middot; Calculating Cash to Close',
    'cd-ln': 'Sections L & N &middot; Summaries of Transactions (Seller)'
  };

  const lineGenerators = {
    'cd-a': () => [
      { desc: '0.50 % of Loan Amount (Points)', payee: 'Lender', amount: Math.round((o.loanAmount || 300000) * 0.005), col: 'borrowerAt' },
      { desc: 'Application Fee', payee: 'Lender', amount: 350.00, col: 'borrowerBefore' },
      { desc: 'Underwriting Fee', payee: 'Lender', amount: 795.00, col: 'borrowerAt' }
    ],
    'cd-c': () => [
      { desc: 'Pest Inspection Fee', payee: 'Ace Home Inspections', amount: 125.00, col: 'borrowerBefore' },
      { desc: 'Survey Fee', payee: 'Precision Land Surveying', amount: 640.00, col: 'borrowerBefore' },
      { desc: 'Title &mdash; Closing Protection Letter', payee: 'Old Republic Title', amount: 50.00, col: 'borrowerAt' },
      { desc: 'Title &mdash; Settlement Agent Fee', payee: 'Best Closing Inc.', amount: 595.00, col: 'borrowerAt' },
      { desc: 'Title &mdash; Title Examination Fee', payee: 'Best Closing Inc.', amount: 150.00, col: 'borrowerAt' }
    ],
    'cd-e': () => [
      { desc: 'Recording Fees (Deed: $85.00, Mortgage: $100.00)', payee: 'Collin County Clerk', amount: 185.00, col: 'borrowerAt' },
      { desc: 'Transfer Taxes', payee: 'State / County', amount: 0.00, col: 'borrowerAt' }
    ],
    'cd-f': () => [
      { desc: "Homeowner's Insurance Premium (12 mo)", payee: 'Insurance Carrier', amount: 1680.00, col: 'borrowerBefore' },
      { desc: 'Prepaid Interest ($42.10/day for 14 days)', payee: 'Lender', amount: 589.40, col: 'borrowerAt' }
    ],
    'cd-g': () => [
      { desc: "Homeowner's Insurance ($140/mo for 2 mo)", payee: 'Lender Escrow Account', amount: 280.00, col: 'borrowerAt' },
      { desc: 'Property Taxes ($650/mo for 2 mo)', payee: 'Lender Escrow Account', amount: 1300.00, col: 'borrowerAt' }
    ],
    'cd-h': () => [
      { desc: 'HOA Capital Contribution', payee: 'HOA Management', amount: 350.00, col: 'borrowerAt' },
      { desc: 'Home Warranty Plan', payee: 'Choice Home Warranty', amount: 625.00, col: 'sellerAt' },
      { desc: "Title &mdash; Owner's Title Policy (optional)", payee: 'Best Closing Inc.', amount: Math.round(o.purchasePrice * 0.0057), col: 'sellerAt' }
    ],
    'cd-j': () => [
      { desc: 'Total Loan Costs (Borrower-Paid Sections A + B + C)', payee: 'Various Providers', amount: 3420.00, col: 'borrowerAt' },
      { desc: 'Total Other Costs (Borrower-Paid Sections E + F + G + H)', payee: 'Various Providers', amount: 4389.40, col: 'borrowerAt' }
    ],
    'cd-km': () => [
      { desc: 'Sale Price of Property', payee: 'Seller', amount: o.purchasePrice, col: 'borrowerAt' },
      { desc: 'Closing Costs Financed / Paid at Closing', payee: 'Settlement Escrow', amount: 7809.40, col: 'borrowerAt' },
      { desc: 'Deposit / Earnest Money Already Paid', payee: 'Best Closing Escrow', amount: 5000.00, col: 'borrowerBefore' },
      { desc: 'Principal Amount of New Loan', payee: 'Lender', amount: o.loanAmount || 0, col: 'borrowerBefore' }
    ],
    'cd-ln': () => [
      { desc: 'Sale Price of Property (Due to Seller)', payee: 'Seller Gross', amount: o.purchasePrice, col: 'sellerAt' },
      { desc: 'Payoff of First Mortgage Loan', payee: 'Summit Ridge Mortgage', amount: Math.round(o.purchasePrice * 0.58), col: 'sellerAt' },
      { desc: 'Total Real Estate Broker Commissions (6%)', payee: 'Listing & Selling Brokers', amount: Math.round(o.purchasePrice * 0.06), col: 'sellerAt' }
    ]
  };

  const lines = (lineGenerators[secKey] ? lineGenerators[secKey]() : []);
  const MIN_ROWS = 6;
  const totals = { borrowerAt: 0, borrowerBefore: 0, sellerAt: 0, sellerBefore: 0, byOthers: 0 };
  lines.forEach(l => { if (totals[l.col] != null) totals[l.col] += l.amount; });

  const body = [];
  for (let i = 0; i < Math.max(MIN_ROWS, lines.length); i++) {
    const l = lines[i] || null;
    const cells = QZ_ACCT_COLS.map(c =>
      `<td class="num ${l && l.col === c ? 'has' : ''}">${l && l.col === c ? fmtMoney(l.amount) : ''}</td>`
    ).join('');
    body.push(`<tr class="${l ? '' : 'empty'}">
      <td class="ln">${String(i + 1).padStart(2, '0')}</td>
      <td class="desc">${l ? esc(l.desc) : ''}</td>
      <td class="payee">${l ? 'to ' + esc(l.payee) : ''}</td>
      ${cells}
    </tr>`);
  }
  const totalCells = QZ_ACCT_COLS.map(c => `<td class="num">${fmtMoney(totals[c])}</td>`).join('');

  return `
    <div class="qz-panel">
      <div class="ph"><h4>${titles[secKey] || 'Closing Disclosure Section'}</h4></div>
      <div class="qz-tbl-scroll">
        <table class="qz-acct-grid">
          <thead>
            <tr class="grp">
              <th colspan="3"></th>
              <th colspan="2">Paid by Borrower</th>
              <th colspan="2">Paid by Seller</th>
              <th rowspan="2" class="by-others">By Others</th>
            </tr>
            <tr>
              <th class="ln"></th><th class="desc">Description</th><th class="payee">Payee</th>
              <th class="num">At Closing</th><th class="num">Before Closing</th>
              <th class="num">At Closing</th><th class="num">Before Closing</th>
            </tr>
          </thead>
          <tbody>${body.join('')}</tbody>
          <tfoot><tr><td colspan="3" class="tl">TOTALS</td>${totalCells}</tr></tfoot>
        </table>
      </div>
    </div>`;
}

function qzEarnestHTML(o) {
  const totalCommission = Math.round(o.purchasePrice * 0.06);
  const listingComm = Math.round(o.purchasePrice * 0.03);
  const sellingComm = Math.round(o.purchasePrice * 0.03);
  return `
    <div class="qz-panel">
      <div class="ph"><h4>Earnest Money & Brokerage Commissions</h4></div>
      
      <div class="qz-calc-card">
        <h5 style="margin:0 0 10px 0;color:var(--qz-navy)">Earnest Money Escrow Deposit</h5>
        <div class="qz-calc-row"><span>Earnest Money Deposit Amount:</span><span class="qz-calc-val">$5,000.00</span></div>
        <div class="qz-calc-row"><span>Escrow Account Held At:</span><span class="qz-calc-val">Frost Bank (Escrow Trust &mdash; Operating)</span></div>
        <div class="qz-calc-row"><span>Deposit Date:</span><span class="qz-calc-val">${fmtDate(o.opened)}</span></div>
        <div class="qz-calc-row total"><span>Receipt Status:</span><span class="qz-badge complete">Deposited & Cleared</span></div>
      </div>

      <div class="qz-calc-card" style="margin-top:12px">
        <h5 style="margin:0 0 10px 0;color:var(--qz-navy)">Real Estate Brokerage Commissions (6.00% Total)</h5>
        <div class="qz-calc-row"><span>Total Commission (6.00% of ${fmtMoney(o.purchasePrice)}):</span><span class="qz-calc-val">${fmtMoney(totalCommission)}</span></div>
        <div class="qz-calc-row"><span>Listing Broker (3.00% &mdash; ${esc(qzOrderParty(o, 'Listing Agent'))}):</span><span class="qz-calc-val">${fmtMoney(listingComm)}</span></div>
        <div class="qz-calc-row"><span>Selling Broker (3.00% &mdash; ${esc(qzOrderParty(o, 'Selling Agent'))}):</span><span class="qz-calc-val">${fmtMoney(sellingComm)}</span></div>
        <div class="qz-calc-row total"><span>Disbursement Source:</span><span class="qz-calc-val">Paid from Seller proceeds at closing</span></div>
      </div>
    </div>`;
}

function qzProceedsHTML(o) {
  const price = o.purchasePrice || 400000;
  const payoffs = Math.round(price * 0.58);
  const commissions = Math.round(price * 0.06);
  const titleFees = Math.round(price * 0.007);
  const taxes = 3200;
  const netProceeds = Math.max(0, price - payoffs - commissions - titleFees - taxes);

  return `
    <div class="qz-panel">
      <div class="ph"><h4>Seller Net Proceeds & Wire Verification</h4></div>
      <p style="font-size:12.5px;color:var(--qz-muted);margin-bottom:14px">Disbursement calculation of net cash due to seller upon funding authorization.</p>

      <div class="qz-calc-card">
        <div class="qz-calc-row"><span>1. Gross Sale Price:</span><span class="qz-calc-val">${fmtMoney(price)}</span></div>
        <div class="qz-calc-row"><span>2. Less Existing 1st Mortgage Payoff:</span><span class="qz-calc-val" style="color:var(--qz-bad)">- ${fmtMoney(payoffs)}</span></div>
        <div class="qz-calc-row"><span>3. Less Real Estate Broker Commissions (6%):</span><span class="qz-calc-val" style="color:var(--qz-bad)">- ${fmtMoney(commissions)}</span></div>
        <div class="qz-calc-row"><span>4. Less Settlement & Title Policy Charges:</span><span class="qz-calc-val" style="color:var(--qz-bad)">- ${fmtMoney(titleFees)}</span></div>
        <div class="qz-calc-row"><span>5. Less Prorated County/ISD Taxes:</span><span class="qz-calc-val" style="color:var(--qz-bad)">- ${fmtMoney(taxes)}</span></div>
        <div class="qz-calc-row total"><span>Estimated Seller Net Wire Proceeds:</span><span class="qz-calc-val" style="color:var(--qz-ocean);font-size:16px">${fmtMoney(netProceeds)}</span></div>
      </div>

      <div class="qz-wire-verify-box">
        <h5>&#128222; Wire Transfer Verification Protocol (ALTA Best Practice #3)</h5>
        <p style="margin:0 0 10px 0;font-size:12.5px;color:#78350f">Prior to executing outgoing wire disbursements, wiring instructions MUST be verbally verified with the seller via outbound call to a trusted telephone number established at file intake.</p>
        <div class="qz-calc-row"><span>Seller Verified Telephone:</span><span class="qz-calc-val">${esc(o.parties.find(p => p.role === 'Seller') ? o.parties.find(p => p.role === 'Seller').phone : '(972) 555-0100')}</span></div>
        <div class="qz-calc-row"><span>Verification Officer:</span><span class="qz-calc-val">Barbara Runolfsson (Escrow Accounting)</span></div>
        <div class="qz-calc-row total"><span>Verification Status:</span><span class="qz-badge complete">&#10003; Verbal Callback Confirmed</span></div>
      </div>
    </div>`;
}

/* ============================================================================
   MECHANIC: New Order Wizard & Live CRUD (Phase C)
   ============================================================================ */

let qzWizState = {
  step: 1,
  type: 'Purchase',
  address: '2401 Legacy Dr',
  city: 'Plano',
  stateZip: 'TX 75024',
  county: 'Collin County',
  legal: 'Lot 14, Block B, Legacy Estates Phase 2',
  buyer: 'Jordan Hayes',
  buyerEmail: 'jordan.hayes@example.com',
  buyerPhone: '(214) 555-0789',
  seller: 'Marianne Croft',
  sellerEmail: 'mcroft@example.com',
  sellerPhone: '(972) 555-0456',
  sellingAgent: 'Samantha Bee',
  listingAgent: 'Peter Einhorn',
  settlementAgent: 'Lucas Adminton',
  lender: 'Frisco Community Lending',
  price: 450000,
  loan: 360000,
  closingDate: '2026-09-18'
};

function qzOpenNewOrderWizard(step) {
  qzWizState.step = step || 1;
  const existingMod = document.getElementById('qzWizModal');
  if (existingMod) existingMod.remove();

  const wrap = document.createElement('div');
  wrap.id = 'qzWizModal';
  wrap.className = 'qz-modal-backdrop';
  
  const stepHead = `
    <div class="qz-wiz-steps">
      <div class="qz-wiz-step ${qzWizState.step === 1 ? 'active' : qzWizState.step > 1 ? 'done' : ''}">1. Property</div>
      <div class="qz-wiz-step ${qzWizState.step === 2 ? 'active' : qzWizState.step > 2 ? 'done' : ''}">2. Parties</div>
      <div class="qz-wiz-step ${qzWizState.step === 3 ? 'active' : qzWizState.step > 3 ? 'done' : ''}">3. Terms & Dates</div>
      <div class="qz-wiz-step ${qzWizState.step === 4 ? 'active' : ''}">4. Review & Create</div>
    </div>`;

  let stepBody = '';
  if (qzWizState.step === 1) {
    stepBody = `
      <div class="qz-form-grid">
        <div class="qz-field"><label>Order Type</label>
          <select id="qzWizType" onchange="qzWizState.type=this.value">
            <option value="Purchase" ${qzWizState.type==='Purchase'?'selected':''}>Residential Purchase</option>
            <option value="Refinance" ${qzWizState.type==='Refinance'?'selected':''}>Residential Refinance</option>
            <option value="Cash" ${qzWizState.type==='Cash'?'selected':''}>Cash Purchase</option>
            <option value="Commercial" ${qzWizState.type==='Commercial'?'selected':''}>Commercial Purchase</option>
          </select>
        </div>
        <div class="qz-field"><label>Street Address</label><input id="qzWizAddr" value="${escAttr(qzWizState.address)}" oninput="qzWizState.address=this.value"></div>
        <div class="qz-field"><label>City</label><input id="qzWizCity" value="${escAttr(qzWizState.city)}" oninput="qzWizState.city=this.value"></div>
        <div class="qz-field"><label>State / ZIP</label><input id="qzWizStateZip" value="${escAttr(qzWizState.stateZip)}" oninput="qzWizState.stateZip=this.value"></div>
        <div class="qz-field wide"><label>Legal Description</label><input id="qzWizLegal" value="${escAttr(qzWizState.legal)}" oninput="qzWizState.legal=this.value"></div>
      </div>`;
  } else if (qzWizState.step === 2) {
    stepBody = `
      <div class="qz-form-grid">
        <div class="qz-field"><label>Buyer / Borrower Name</label><input id="qzWizBuyer" value="${escAttr(qzWizState.buyer)}" oninput="qzWizState.buyer=this.value"></div>
        <div class="qz-field"><label>Buyer Email</label><input id="qzWizBuyerEmail" value="${escAttr(qzWizState.buyerEmail)}" oninput="qzWizState.buyerEmail=this.value"></div>
        <div class="qz-field"><label>Seller Name</label><input id="qzWizSeller" value="${escAttr(qzWizState.seller)}" oninput="qzWizState.seller=this.value"></div>
        <div class="qz-field"><label>Seller Email</label><input id="qzWizSellerEmail" value="${escAttr(qzWizState.sellerEmail)}" oninput="qzWizState.sellerEmail=this.value"></div>
        <div class="qz-field"><label>Settlement Agent</label>
          <select id="qzWizOfficer" onchange="qzWizState.settlementAgent=this.value">
            <option value="Lucas Adminton" ${qzWizState.settlementAgent==='Lucas Adminton'?'selected':''}>Lucas Adminton (Plano)</option>
            <option value="Marisol Tran" ${qzWizState.settlementAgent==='Marisol Tran'?'selected':''}>Marisol Tran (Plano)</option>
            <option value="Dana Whitfield" ${qzWizState.settlementAgent==='Dana Whitfield'?'selected':''}>Dana Whitfield (Frisco)</option>
            <option value="Travis Jones" ${qzWizState.settlementAgent==='Travis Jones'?'selected':''}>Travis Jones (Plano)</option>
          </select>
        </div>
        <div class="qz-field"><label>Lender</label><input id="qzWizLender" value="${escAttr(qzWizState.lender)}" oninput="qzWizState.lender=this.value"></div>
      </div>`;
  } else if (qzWizState.step === 3) {
    stepBody = `
      <div class="qz-form-grid">
        <div class="qz-field"><label>Purchase Price ($)</label><input id="qzWizPrice" type="number" value="${qzWizState.price}" oninput="qzWizState.price=Number(this.value)"></div>
        <div class="qz-field"><label>Loan Amount ($)</label><input id="qzWizLoan" type="number" value="${qzWizState.loan}" oninput="qzWizState.loan=Number(this.value)"></div>
        <div class="qz-field wide"><label>Target Closing Date</label><input id="qzWizClosing" type="date" value="${qzWizState.closingDate}" oninput="qzWizState.closingDate=this.value"></div>
      </div>`;
  } else {
    stepBody = `
      <div class="qz-calc-card" style="margin-bottom:0">
        <div class="qz-calc-row"><span>Order Type & Property:</span><span class="qz-calc-val">${esc(qzWizState.type)} &middot; ${esc(qzWizState.address)}, ${esc(qzWizState.city)}, ${esc(qzWizState.stateZip)}</span></div>
        <div class="qz-calc-row"><span>Buyer / Borrower:</span><span class="qz-calc-val">${esc(qzWizState.buyer)} (${esc(qzWizState.buyerEmail)})</span></div>
        <div class="qz-calc-row"><span>Seller:</span><span class="qz-calc-val">${esc(qzWizState.seller)} (${esc(qzWizState.sellerEmail)})</span></div>
        <div class="qz-calc-row"><span>Settlement Agent:</span><span class="qz-calc-val">${esc(qzWizState.settlementAgent)}</span></div>
        <div class="qz-calc-row"><span>Purchase Price & Loan:</span><span class="qz-calc-val">${fmtMoney(qzWizState.price)} / ${fmtMoney(qzWizState.loan)}</span></div>
        <div class="qz-calc-row total"><span>Target Closing Date:</span><span class="qz-calc-val" style="color:var(--qz-ocean)">${fmtDate(qzWizState.closingDate)}</span></div>
      </div>`;
  }

  const prevBtn = qzWizState.step > 1 ? `<button class="qz-btn" onclick="qzOpenNewOrderWizard(${qzWizState.step - 1})">&larr; Previous</button>` : '';
  const nextBtn = qzWizState.step < 4
    ? `<button class="qz-btn primary" onclick="qzOpenNewOrderWizard(${qzWizState.step + 1})">Next &rarr;</button>`
    : `<button class="qz-btn primary" onclick="qzSaveNewOrder()">Create Order</button>`;

  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:540px">
      <div class="ph"><h4>Create New Order</h4><button class="qz-btn sm" onclick="document.getElementById('qzWizModal').remove()">&times;</button></div>
      ${stepHead}
      <div style="padding:16px 0">${stepBody}</div>
      <div style="display:flex;justify-content:space-between;border-top:1px solid var(--qz-line);padding-top:12px">
        ${prevBtn}
        <div style="margin-left:auto;display:flex;gap:8px">${nextBtn}</div>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzSaveNewOrder() {
  const mod = document.getElementById('qzWizModal');
  if (mod) mod.remove();

  const newNum = 1530 + (qzDemo.orders ? qzDemo.orders.length : 0);
  const newId = 'ORD-2026-' + newNum;
  const newTitle = 'TX-2026-0' + (4530 + (qzDemo.orders ? qzDemo.orders.length : 0));

  const newOrder = {
    id: newId,
    titleNumber: newTitle,
    propertyAddress: `${qzWizState.address}, ${qzWizState.city}, ${qzWizState.stateZip}`,
    type: qzWizState.type,
    status: 'Open',
    stageIndex: 0,
    opened: QZ_TODAY,
    closingDate: qzWizState.closingDate || '2026-09-25',
    purchasePrice: qzWizState.price || 400000,
    loanAmount: qzWizState.loan || 320000,
    inspectionCharge: 425,
    legalDescription: qzWizState.legal,
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'Order opened in intake. Title search requested.',
    parties: [
      { name: qzWizState.buyer, role: 'Buyer', email: qzWizState.buyerEmail, phone: qzWizState.buyerPhone },
      { name: qzWizState.seller, role: 'Seller', email: qzWizState.sellerEmail, phone: qzWizState.sellerPhone },
      { name: qzWizState.sellingAgent, role: 'Selling Agent', email: 'sbee@friscorealty.com', phone: '(972) 555-0110' },
      { name: qzWizState.listingAgent, role: 'Listing Agent', email: 'peinhorn@friscorealty.com', phone: '(972) 555-0187' },
      { name: qzWizState.settlementAgent, role: 'Settlement Agent', email: 'ladminton@bestclosing.com', phone: '(214) 555-0166' },
      { name: qzWizState.lender, role: 'Lender', email: 'processing@fclending.com', phone: '(214) 555-0120' }
    ]
  };

  qzDemo.orders = qzDemo.orders || [];
  qzDemo.orders.push(newOrder);

  qzDemo.documents = qzDemo.documents || {};
  qzDemo.documents[newId] = [
    { id: 9001 + qzDemo.orders.length, orderId: newId, name: 'Purchase Contract', type: 'Contract', status: 'Reviewed', uploadedBy: qzWizState.sellingAgent, date: QZ_TODAY, file: null },
    { id: 9002 + qzDemo.orders.length, orderId: newId, name: 'Title Commitment', type: 'Title', status: 'Pending', uploadedBy: '—', date: '—', file: null }
  ];

  qzDemo.tasks = qzDemo.tasks || {};
  qzDemo.tasks[newId] = [
    { id: 9501 + qzDemo.orders.length, relatedOrderId: newId, title: 'Perform Title Search & Examination', assignedTo: 'Travis Jones', dueDate: QZ_TODAY, status: 'In Progress' },
    { id: 9502 + qzDemo.orders.length, relatedOrderId: newId, title: 'Verify Earnest Money Wire Receipt', assignedTo: 'Barbara Runolfsson', dueDate: qzWizState.closingDate, status: 'Open' }
  ];

  simToast(`Order ${newId} created successfully.`, { tone: 'good' });
  qzOpenOrder(newId);
}

function qzOpenQuoteModal() {
  const wrap = document.createElement('div');
  wrap.id = 'qzQuoteModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph"><h4>Rate & Fee Calculator</h4><button class="qz-btn sm" onclick="document.getElementById('qzQuoteModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field"><label>Purchase Price ($)</label><input id="qzQPrice" type="number" value="450000" oninput="qzCalcQuote()"></div>
        <div class="qz-field"><label>Loan Amount ($)</label><input id="qzQLoan" type="number" value="360000" oninput="qzCalcQuote()"></div>
      </div>
      <div id="qzQuoteResults" class="qz-calc-card"></div>
      <div style="text-align:right;padding-top:10px"><button class="qz-btn primary" onclick="document.getElementById('qzQuoteModal').remove()">Close</button></div>
    </div>`;
  document.body.appendChild(wrap);
  qzCalcQuote();
}

function qzCalcQuote() {
  const p = Number(document.getElementById('qzQPrice').value) || 400000;
  const l = Number(document.getElementById('qzQLoan').value) || 300000;
  const title = Math.round(2341 + ((p - 400000) / 1000) * 3.85);
  const closingFee = 595.00;
  const recording = 185.00;
  const el = document.getElementById('qzQuoteResults');
  if (el) {
    el.innerHTML = `
      <div class="qz-calc-row"><span>Owner's Title Premium (TDI):</span><span class="qz-calc-val">${fmtMoney(title)}</span></div>
      <div class="qz-calc-row"><span>Simultaneous Loan Policy:</span><span class="qz-calc-val">${l ? '$100.00' : '$0.00'}</span></div>
      <div class="qz-calc-row"><span>Settlement / Closing Fee:</span><span class="qz-calc-val">${fmtMoney(closingFee)}</span></div>
      <div class="qz-calc-row"><span>County Recording Estimate:</span><span class="qz-calc-val">${fmtMoney(recording)}</span></div>
      <div class="qz-calc-row total"><span>Total Estimated Settlement Costs:</span><span class="qz-calc-val" style="color:var(--qz-ocean)">${fmtMoney(title + (l ? 100 : 0) + closingFee + recording)}</span></div>`;
  }
}

/* Modals for live in-file operations */
function qzAddPartyModal(orderId) {
  const wrap = document.createElement('div');
  wrap.id = 'qzAddPartyModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph"><h4>Add Party to File</h4><button class="qz-btn sm" onclick="document.getElementById('qzAddPartyModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field"><label>Role</label>
          <select id="qzNewPartyRole">
            <option value="Buyer">Buyer</option><option value="Seller">Seller</option><option value="Selling Agent">Selling Agent</option>
            <option value="Listing Agent">Listing Agent</option><option value="Lender">Lender</option><option value="Attorney">Attorney</option>
            <option value="HOA">HOA Representative</option>
          </select>
        </div>
        <div class="qz-field"><label>Full Name</label><input id="qzNewPartyName" placeholder="e.g. Bennett Ashcroft"></div>
        <div class="qz-field"><label>Email</label><input id="qzNewPartyEmail" placeholder="e.g. bennett@ashcroftlaw.example"></div>
        <div class="qz-field"><label>Phone</label><input id="qzNewPartyPhone" placeholder="e.g. (972) 555-0144"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzAddPartyModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzSaveNewParty('${orderId}')">Add Party</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzSaveNewParty(orderId) {
  const role = document.getElementById('qzNewPartyRole').value;
  const name = (document.getElementById('qzNewPartyName').value || '').trim();
  const email = (document.getElementById('qzNewPartyEmail').value || '').trim();
  const phone = (document.getElementById('qzNewPartyPhone').value || '').trim();
  if (!name) { simToast('Please enter a party name.'); return; }
  
  qzDemo.parties = qzDemo.parties || {};
  qzDemo.parties[orderId] = qzDemo.parties[orderId] || [];
  qzDemo.parties[orderId].push({ role, name, email, phone });
  
  document.getElementById('qzAddPartyModal').remove();
  simToast(`Added ${name} (${role}) to file.`, { tone: 'good' });
  qzRenderRoot();
}

function qzAddDocumentModal(orderId) {
  const wrap = document.createElement('div');
  wrap.id = 'qzAddDocModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph"><h4>Upload / Add Document</h4><button class="qz-btn sm" onclick="document.getElementById('qzAddDocModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field"><label>Document Type</label>
          <select id="qzNewDocType">
            <option value="Survey">Survey</option>
            <option value="HOA Resale Certificate">HOA Resale Certificate</option>
            <option value="Payoff Statement">Payoff Statement</option>
            <option value="Pest Inspection">Pest Inspection Report</option>
            <option value="Closing Disclosure">Closing Disclosure</option>
            <option value="Deed">Warranty Deed</option>
            <option value="Other">Other Document</option>
          </select>
        </div>
        <div class="qz-field"><label>Document Name</label><input id="qzNewDocName" value="Survey &mdash; Precision Land Surveying"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzAddDocModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzSaveNewDocument('${orderId}')">Upload Document</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzSaveNewDocument(orderId) {
  const type = document.getElementById('qzNewDocType').value;
  const name = (document.getElementById('qzNewDocName').value || '').trim() || type;
  qzDemo.documents = qzDemo.documents || {};
  qzDemo.documents[orderId] = qzDemo.documents[orderId] || [];
  qzDemo.documents[orderId].push({
    id: 9800 + Math.floor(Math.random() * 100),
    orderId: orderId,
    name: name,
    type: type,
    status: 'Received',
    uploadedBy: 'Training User',
    date: QZ_TODAY,
    file: null
  });
  document.getElementById('qzAddDocModal').remove();
  simToast(`Document "${name}" uploaded.`, { tone: 'good' });
  qzRenderRoot();
}

function qzAddTaskModal(orderId) {
  const wrap = document.createElement('div');
  wrap.id = 'qzAddTaskModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph"><h4>Add Order Task</h4><button class="qz-btn sm" onclick="document.getElementById('qzAddTaskModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field wide"><label>Task Title</label><input id="qzNewTaskTitle" placeholder="e.g. Order Municipal Tax Certificate"></div>
        <div class="qz-field"><label>Assigned To</label>
          <select id="qzNewTaskAssign">
            <option value="Marisol Tran">Marisol Tran (Escrow Officer)</option>
            <option value="Travis Jones">Travis Jones (Title Examiner)</option>
            <option value="Barbara Runolfsson">Barbara Runolfsson (Accounting)</option>
            <option value="Training User">Training User (VA)</option>
          </select>
        </div>
        <div class="qz-field"><label>Due Date</label><input id="qzNewTaskDue" type="date" value="${QZ_TODAY}"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzAddTaskModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzSaveNewTask('${orderId}')">Create Task</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzSaveNewTask(orderId) {
  const title = (document.getElementById('qzNewTaskTitle').value || '').trim();
  const assign = document.getElementById('qzNewTaskAssign').value;
  const due = document.getElementById('qzNewTaskDue').value || QZ_TODAY;
  if (!title) { simToast('Please enter a task title.'); return; }
  qzDemo.tasks = qzDemo.tasks || {};
  qzDemo.tasks[orderId] = qzDemo.tasks[orderId] || [];
  qzDemo.tasks[orderId].push({
    id: 9900 + Math.floor(Math.random() * 100),
    relatedOrderId: orderId,
    title: title,
    assignedTo: assign,
    dueDate: due,
    status: 'Open'
  });
  document.getElementById('qzAddTaskModal').remove();
  simToast(`Task "${title}" assigned to ${assign}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzAdvanceStageModal(orderId) {
  const o = qzGetOrder(orderId);
  const nextStage = QZ_STAGES[Math.min(QZ_STAGES.length - 1, o.stageIndex + 1)];
  qzConfirm({
    title: `Advance Stage to "${nextStage}"?`,
    message: `Are you sure you want to advance this order from "${QZ_STAGES[o.stageIndex]}" to "${nextStage}"? This will update the milestone timeline.`,
    confirmText: 'Advance Stage',
    onConfirm: () => {
      qzSetScalarOverride(orderId, 'stageIndex', Math.min(QZ_STAGES.length - 1, o.stageIndex + 1));
      simToast(`Order advanced to stage: ${nextStage}`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzOrderServiceModal(orderId) {
  qzConfirm({
    title: 'Order Marketplace Service',
    message: 'Select vendor to dispatch: Precision Land Surveying (Survey: $640.00). Standard turnaround 5-7 business days.',
    confirmText: 'Dispatch Order',
    onConfirm: () => {
      simToast('Service order submitted to Qualia Marketplace.', { tone: 'good' });
    }
  });
}

function qzNewThreadModal(orderId) {
  const wrap = document.createElement('div');
  wrap.id = 'qzNewThreadModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph"><h4>New Connect Message</h4><button class="qz-btn sm" onclick="document.getElementById('qzNewThreadModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field wide"><label>Subject</label><input id="qzNewSubject" placeholder="e.g. HOA Resale Certificate Status"></div>
        <div class="qz-field wide"><label>Recipient</label><input id="qzNewRecipient" placeholder="e.g. listing@friscorealty.com"></div>
        <div class="qz-field wide"><label>Message</label><textarea id="qzNewMsgBody" style="height:80px" placeholder="Write initial message..."></textarea></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzNewThreadModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzSaveNewThread('${orderId}')">Send Message</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzSaveNewThread(orderId) {
  const sub = (document.getElementById('qzNewSubject').value || '').trim() || 'General Inquiry';
  const rec = (document.getElementById('qzNewRecipient').value || '').trim() || 'Party';
  const body = (document.getElementById('qzNewMsgBody').value || '').trim() || 'Message sent.';
  document.getElementById('qzNewThreadModal').remove();
  simToast(`Message "${sub}" sent to ${rec}.`, { tone: 'good' });
}



/* ============================================================================
   MECHANIC: `reconcile` — cross-checking N sources against N fields
   ----------------------------------------------------------------------------
   The `verify` engine above answers one question about one field against one
   document. Most of what actually goes wrong on a title file is not that shape:
   a price appears in three places and two of them agree, a commitment lists six
   requirements that each have to be traced to different evidence, a payoff has
   expired and the arithmetic has to be redone. All of those are "open several
   documents, fill in a grid, then decide per row".

   So `reconcile` generalises it. An item declares:
     docs[]    — every source the trainee can open (all must be opened first,
                 the same gate step 1 applies in `verify`)
     rows[]    — one per field being reconciled. Each row carries:
                   label     what is being compared
                   onOrder   what the order currently says (display only)
                   cells[]   one per doc: what does THIS document say for this
                             field? Either a closed list of options, or a typed
                             value graded with qzNormalizeValue / numeric
                             tolerance.
                   rightAction / rightCategory / correctedValue — the same
                             decision vocabulary `verify` already uses, so the
                             judgment half is identical and transfers.
   Grading is per cell and per row-decision; the item is correct only when every
   graded part is. Same everCorrect stickiness, same exam-mode rules (one shot,
   no colouring, no retry) as `verify`.
   ============================================================================ */
function qzRecLookup(id) {
  return (typeof QZ_RECONCILES !== 'undefined' ? QZ_RECONCILES.find(r => r.id === id) : null) ||
    (typeof QZ_EXAM_BANK !== 'undefined' ? QZ_EXAM_BANK.find(i => i.type === 'reconcile' && i.id === id) : null);
}
function qzRecExamMode(id) {
  return typeof QZ_EXAM_BANK !== 'undefined' && QZ_EXAM_BANK.some(i => i.type === 'reconcile' && i.id === id);
}
function qzRecGet(id) {
  if (!qzStore.reconciles[id]) qzStore.reconciles[id] = { opened: {}, cells: {}, decisions: {}, notes: {} };
  return qzStore.reconciles[id];
}
function qzRecAllDocsOpened(id) {
  const r = qzRecLookup(id), st = qzRecGet(id);
  return !!r && r.docs.every(d => st.opened[d.id]);
}
function qzRecOpenDoc(id, docId) {
  const r = qzRecLookup(id);
  const d = r && r.docs.find(x => x.id === docId);
  if (!d) return;
  simViewDoc(d.file, d.title);
  qzRecGet(id).opened[docId] = true;
  qzSave();
  qzRenderRoot();
  qzSyncReconcileStep(id);
}
/* Cell answers are stored as {value, correct}. A cell is either a closed list
   (options + right) or a free value (right + optional numeric tolerance). */
function qzRecCellKey(rowId, docId) { return rowId + '::' + docId; }
function qzRecGradeCell(cell, value) {
  if (cell.options) return value === cell.right;
  if (cell.tolerance != null) {
    const a = qzParseNumeric(value), b = qzParseNumeric(cell.right);
    if (a === null || b === null) return false;
    return Math.abs(a - b) <= cell.tolerance;
  }
  return qzNormalizeValue(value) === qzNormalizeValue(cell.right);
}
function qzRecAnswerCell(id, rowId, docId, value) {
  const r = qzRecLookup(id);
  if (!r || !qzRecAllDocsOpened(id)) return;
  const row = r.rows.find(x => x.id === rowId);
  const cell = row && row.cells.find(c => c.docId === docId);
  if (!cell) return;
  const st = qzRecGet(id);
  const key = qzRecCellKey(rowId, docId);
  // In a lesson, a graded-wrong cell can be answered again; in the exam it locks.
  if (qzRecExamMode(id) && st.cells[key]) return;
  st.cells[key] = { value: value, correct: qzRecGradeCell(cell, value) };
  qzSave();
  qzRenderRoot();
  qzSyncReconcileStep(id);
}
function qzRecSaveTypedCell(id, rowId, docId) {
  const el = document.getElementById('qzRecIn-' + id + '-' + rowId + '-' + docId);
  if (!el) return;
  const v = el.value.trim();
  if (!v) { simToast('Enter what the document shows for this field.'); return; }
  qzRecAnswerCell(id, rowId, docId, v);
}
function qzRecRowCellsDone(id, rowId) {
  const r = qzRecLookup(id), st = qzRecGet(id);
  const row = r.rows.find(x => x.id === rowId);
  if (!row) return false;
  return row.cells.every(c => {
    const a = st.cells[qzRecCellKey(rowId, c.docId)];
    // Lessons require the cell to be RIGHT before the decision unlocks (you cannot
    // decide what to do about a discrepancy you have not read correctly). The exam
    // only requires it to be answered.
    return a && (qzRecExamMode(id) ? true : a.correct);
  });
}
function qzRecAnswerDecision(id, rowId, action) {
  const r = qzRecLookup(id);
  const row = r && r.rows.find(x => x.id === rowId);
  if (!row || !qzRecRowCellsDone(id, rowId)) return;
  const st = qzRecGet(id);
  const prev = st.decisions[rowId];
  if (qzRecExamMode(id) && prev && prev.action) return;
  st.decisions[rowId] = {
    action: action,
    actionCorrect: action === row.rightAction,
    category: prev ? prev.category : null,
    categoryCorrect: prev ? prev.categoryCorrect : null
  };
  qzSave();
  qzRenderRoot();
  qzSyncReconcileStep(id);
}
function qzRecSaveCategory(id, rowId) {
  const r = qzRecLookup(id);
  const row = r && r.rows.find(x => x.id === rowId);
  const sel = document.getElementById('qzRecCat-' + id + '-' + rowId);
  if (!row || !sel) return;
  const cat = sel.value;
  if (!cat) { simToast('Choose an escalation category.'); return; }
  const st = qzRecGet(id);
  const d = st.decisions[rowId] || {};
  d.category = cat;
  d.categoryCorrect = cat === row.rightCategory;
  const noteEl = document.getElementById('qzRecNote-' + id + '-' + rowId);
  if (noteEl) st.notes[rowId] = noteEl.value.trim();
  st.decisions[rowId] = d;
  qzSave();
  if (!qzRecExamMode(id) && !d.categoryCorrect) {
    qzRenderRoot();
    simToast('Not quite — check the category and submit again.');
    qzSyncReconcileStep(id);
    return;
  }
  qzRenderRoot();
  qzSyncReconcileStep(id);
}
function qzRecSaveRowValue(id, rowId) {
  const r = qzRecLookup(id);
  const row = r && r.rows.find(x => x.id === rowId);
  const el = document.getElementById('qzRecFix-' + id + '-' + rowId);
  if (!row || !el) return;
  const v = el.value.trim();
  if (!v) { simToast('Enter the corrected value.'); return; }
  const st = qzRecGet(id);
  const d = st.decisions[rowId] || {};
  d.value = v;
  d.valueCorrect = row.tolerance != null
    ? (() => { const a = qzParseNumeric(v), b = qzParseNumeric(row.correctedValue); return a !== null && b !== null && Math.abs(a - b) <= row.tolerance; })()
    : qzNormalizeValue(v) === qzNormalizeValue(row.correctedValue);
  st.decisions[rowId] = d;
  qzSave();
  if (!qzRecExamMode(id) && !d.valueCorrect) {
    qzRenderRoot();
    simToast("That doesn't match the source. Check it and save again.");
    qzSyncReconcileStep(id);
    return;
  }
  // Apply it for real, same override layer a `verify` correction uses.
  if (d.valueCorrect && row.field) qzSetScalarOverride(r.orderId, row.field, v);
  if (d.valueCorrect && row.partyRole) qzSetPartyOverride(r.orderId, row.partyRole, { name: v });
  qzRenderRoot();
  qzSyncReconcileStep(id);
}
/* A row is settled once its decision is complete: 'none' needs nothing more,
   'correct' needs a value, an escalation needs a category. */
function qzRecRowSettled(id, rowId) {
  const r = qzRecLookup(id);
  const row = r.rows.find(x => x.id === rowId);
  const d = qzRecGet(id).decisions[rowId];
  if (!d || !d.action) return false;
  if (!qzRecExamMode(id) && !d.actionCorrect) return false;
  if (d.action === 'none') return true;
  if (d.action === 'correct') return d.value != null && (qzRecExamMode(id) || d.valueCorrect);
  return d.category != null && (qzRecExamMode(id) || d.categoryCorrect);
}
function qzRecComplete(id) {
  const r = qzRecLookup(id);
  return !!r && qzRecAllDocsOpened(id) && r.rows.every(row =>
    (qzRecExamMode(id) ? true : qzRecRowCellsDone(id, row.id)) && qzRecRowSettled(id, row.id));
}
/* Overall correctness = every graded sub-part. Used by both the lesson gate and
   the exam scorer, so a partially-right reconcile is never a pass. */
function qzRecGrade(id) {
  const r = qzRecLookup(id), st = qzRecGet(id);
  const parts = [];
  r.rows.forEach(row => {
    row.cells.forEach(c => {
      const a = st.cells[qzRecCellKey(row.id, c.docId)];
      parts.push(!!(a && a.correct));
    });
    const d = st.decisions[row.id];
    parts.push(!!(d && d.actionCorrect));
    if (d && d.action === 'correct') parts.push(!!d.valueCorrect);
    if (d && d.action && d.action.indexOf('escalate') === 0) parts.push(!!d.categoryCorrect);
  });
  const right = parts.filter(Boolean).length;
  return { right: right, total: parts.length, correct: parts.length > 0 && right === parts.length };
}
function qzRecFinalize(id) {
  const st = qzRecGet(id);
  const g = qzRecGrade(id);
  st.correct = g.correct;
  if (g.correct) st.everCorrect = true;
  st.resolvedAt = Date.now();
  qzSave();
  qzRenderRoot();
  qzNotifyReconcileResolved(id);
}
function qzRecSubmit(id) {
  if (!qzRecComplete(id)) { simToast('Finish every row before submitting.'); return; }
  qzRecFinalize(id);
}
function qzRecRetry(id) {
  if (qzRecExamMode(id)) return;
  const prev = qzStore.reconciles[id] || {};
  qzStore.reconciles[id] = { opened: prev.opened || {}, cells: {}, decisions: {}, notes: {}, everCorrect: !!prev.everCorrect };
  qzSave();
  qzRenderRoot();
  qzSyncReconcileStep(id);
}
function qzNotifyReconcileResolved(recId) {
  if (!qzState.lessonId || typeof QZ_LESSONS === 'undefined') return;
  const l = QZ_LESSONS.find(x => x.id === qzState.lessonId);
  if (!l) return;
  const step = l.steps.find(s => s.type === 'reconcile' && s.reconcileId === recId);
  if (!step) return;
  const st = qzRecGet(recId);
  if (SimEngine.walkActive() && SimEngine.currentStep() === step) {
    if (st.correct) SimEngine.stepCompleted();
    else { SimEngine.renderRetry('Read the breakdown below, then click "Redo" to try again.'); SimEngine.position(step); }
    return;
  }
  if (!st.correct) return;
  const prog = SimEngine.progress(l);
  if (prog.complete) simToast(`Lesson ${l.number} complete! Use the banner above to head back and unlock the next lesson.`, { tone: 'good', duration: 5000 });
  else simToast(`"${qzLessonStepLabel(step)}" done, ${prog.done} of ${prog.total} steps in Lesson ${l.number}.`, { tone: 'good' });
  qzRenderLessonBanner();
}

/* ---------- reconcile: rendering ---------- */
function qzRecCellHTML(r, row, cell, examMode) {
  const st = qzRecGet(r.id);
  const key = qzRecCellKey(row.id, cell.docId);
  const a = st.cells[key];
  const locked = !!a && (examMode || a.correct);
  if (cell.options) {
    const opts = cell.options.map(o => {
      const sel = a && a.value === o;
      let cls = '';
      if (a && !examMode) {
        if (o === cell.right) cls = 'correct';
        else if (sel) cls = 'incorrect';
      } else if (sel) cls = 'selected';
      return `<option value="${escAttr(o)}" ${sel ? 'selected' : ''}>${esc(o)}</option>`;
    }).join('');
    const cls = (a && !examMode) ? (a.correct ? 'ok' : 'bad') : '';
    return `<select class="qz-rec-sel ${cls}" ${locked ? 'disabled' : ''} onchange="qzRecAnswerCell('${r.id}','${row.id}','${cell.docId}',this.value)">
      <option value="">&mdash;</option>${opts}</select>`;
  }
  const cls = (a && !examMode) ? (a.correct ? 'ok' : 'bad') : '';
  return `<div class="qz-rec-typed">
    <input type="text" class="${cls}" id="qzRecIn-${r.id}-${row.id}-${cell.docId}" value="${escAttr(a ? a.value : '')}" ${locked ? 'disabled' : ''} placeholder="${escAttr(cell.placeholder || 'As shown')}">
    ${locked ? '' : `<button type="button" class="qz-btn sm" onclick="qzRecSaveTypedCell('${r.id}','${row.id}','${cell.docId}')">Set</button>`}
  </div>`;
}
function qzRecRowDecisionHTML(r, row, examMode) {
  const st = qzRecGet(r.id);
  if (!qzRecRowCellsDone(r.id, row.id)) {
    return `<div class="qz-rec-locked">Fill in every source for this row first.</div>`;
  }
  const d = st.decisions[row.id] || {};
  const answered = !!d.action;
  const actions = qzOptionOrder('rec3:' + r.id + ':' + row.id, QZ_ACTION_CHOICES.length).map(i => {
    const a = QZ_ACTION_CHOICES[i];
    let cls = '';
    if (answered && !examMode) {
      if (a.id === row.rightAction) cls = 'correct';
      else if (a.id === d.action) cls = 'incorrect';
    } else if (d.action === a.id) cls = 'selected';
    return `<button type="button" class="qz-option qz-rv-mc ${cls}" ${answered ? 'disabled' : ''} onclick="qzRecAnswerDecision('${r.id}','${row.id}','${a.id}')">${esc(a.label)}</button>`;
  }).join('');

  let follow = '';
  if (answered && (examMode || d.actionCorrect)) {
    if (d.action === 'correct') {
      const done = d.value != null && (examMode || d.valueCorrect);
      const wrong = d.value != null && !d.valueCorrect && !examMode;
      follow = done && !wrong
        ? `<div class="qz-rv-subfeedback good">&#10003; Value recorded${examMode ? '' : ': ' + esc(d.value)}</div>`
        : `<div class="qz-rec-follow">
             <label>Corrected value</label>
             <input type="text" id="qzRecFix-${r.id}-${row.id}" value="${escAttr(d.value || '')}" placeholder="Type it exactly as the governing source shows it">
             ${wrong ? '<div class="qz-rv-subfeedback bad">&#10007; That does not match the governing source.</div>' : ''}
             <button type="button" class="qz-btn sm primary" onclick="qzRecSaveRowValue('${r.id}','${row.id}')">Save</button>
           </div>`;
    } else if (d.action.indexOf('escalate') === 0) {
      const done = d.category != null && (examMode || d.categoryCorrect);
      const wrong = d.category != null && !d.categoryCorrect && !examMode;
      const catOpts = QZ_ESCALATION_CATEGORIES.map(c => `<option value="${c.id}" ${d.category === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('');
      follow = done && !wrong
        ? `<div class="qz-rv-subfeedback good">&#10003; Escalation category recorded.</div>`
        : `<div class="qz-rec-follow">
             <label>Escalation category</label>
             <select id="qzRecCat-${r.id}-${row.id}"><option value="">Choose a category&hellip;</option>${catOpts}</select>
             <label>Note (not graded, for practice)</label>
             <textarea id="qzRecNote-${r.id}-${row.id}" placeholder="What is inconsistent, and what decision does it need?">${esc(st.notes[row.id] || '')}</textarea>
             ${wrong ? '<div class="qz-rv-subfeedback bad">&#10007; That is not the right category here.</div>' : ''}
             <button type="button" class="qz-btn sm primary" onclick="qzRecSaveCategory('${r.id}','${row.id}')">Submit</button>
           </div>`;
    }
  } else if (answered && !examMode && !d.actionCorrect) {
    follow = `<div class="qz-rv-subfeedback bad">&#10007; That is not the right call for this row.</div>
      <button type="button" class="qz-btn sm" onclick="qzRecClearDecision('${r.id}','${row.id}')">Try again</button>`;
  }
  return `<div class="qz-rec-decide"><div class="qz-rec-decide-h">What should happen with this field?</div>${actions}${follow}</div>`;
}
function qzRecClearDecision(id, rowId) {
  if (qzRecExamMode(id)) return;
  delete qzRecGet(id).decisions[rowId];
  qzSave();
  qzRenderRoot();
  qzSyncReconcileStep(id);
}
function qzRecItemHTML(id) {
  const r = qzRecLookup(id);
  if (!r) return '';
  const st = qzRecGet(id);
  const examMode = qzRecExamMode(id);
  const done = !!st.resolvedAt;

  const docBtns = r.docs.map(d =>
    `<button type="button" class="qz-btn sm ${st.opened[d.id] ? 'opened' : ''}" data-rec-doc="${escAttr(d.id)}" onclick="qzRecOpenDoc('${id}','${d.id}')">${st.opened[d.id] ? '&#10003; ' : ''}${esc(d.title)}</button>`
  ).join('');
  const allOpen = qzRecAllDocsOpened(id);

  const head = `<div class="qz-rec-step ${allOpen ? 'done' : 'active'}" data-rec-phase="1">
    <div class="qz-rv-step-h">Step 1 &middot; Open every source</div>
    <div class="qz-rec-docs">${docBtns}</div>
    ${allOpen ? '' : '<div class="qz-rec-locked">All of them. You cannot reconcile sources you have not read.</div>'}
  </div>`;

  let grid = '';
  if (allOpen && !done) {
    const headCells = r.docs.map(d => `<th>${esc(d.short || d.title)}</th>`).join('');
    const bodyRows = r.rows.map(row => {
      const cells = r.docs.map(d => {
        const cell = row.cells.find(c => c.docId === d.id);
        return `<td>${cell ? qzRecCellHTML(r, row, cell, examMode) : '<span class="qz-rec-na">n/a</span>'}</td>`;
      }).join('');
      return `<tr data-rec-row="${escAttr(row.id)}">
        <td class="fld"><b>${esc(row.label)}</b>${row.onOrder ? `<span class="on-order">On the order: ${esc(row.onOrder)}</span>` : ''}</td>
        ${cells}
      </tr>`;
    }).join('');
    grid = `<div class="qz-rec-step active" data-rec-phase="2">
      <div class="qz-rv-step-h">Step 2 &middot; What does each source say?</div>
      <div class="qz-tbl-scroll"><table class="qz-rec-grid"><thead><tr><th class="fld">Field</th>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>
    </div>`;
  }

  let decisions = '';
  if (allOpen && !done) {
    decisions = r.rows.map(row => `<div class="qz-rec-step active" data-rec-phase="3" data-rec-row="${escAttr(row.id)}">
      <div class="qz-rv-step-h">Step 3 &middot; ${esc(row.label)}</div>
      ${qzRecRowDecisionHTML(r, row, examMode)}
    </div>`).join('');
  }

  let submit = '';
  if (allOpen && !done) {
    const ready = qzRecComplete(id);
    submit = `<div class="qz-rec-actions">
      <button type="button" class="qz-btn primary" ${ready ? '' : 'disabled'} onclick="qzRecSubmit('${id}')">Submit reconciliation</button>
      ${ready ? '' : '<span class="qz-rec-hint">Every row needs a source reading and a decision.</span>'}
    </div>`;
  }

  let feedback = '';
  if (done) {
    const g = qzRecGrade(id);
    const bits = r.rows.map(row => {
      const d = st.decisions[row.id] || {};
      const cellsOk = row.cells.every(c => { const a = st.cells[qzRecCellKey(row.id, c.docId)]; return a && a.correct; });
      const ok = cellsOk && d.actionCorrect &&
        (d.action !== 'correct' || d.valueCorrect) &&
        (!d.action || d.action.indexOf('escalate') !== 0 || d.categoryCorrect);
      return `<div class="qz-rv-subfeedback ${ok ? 'good' : 'bad'}">${ok ? '&#10003;' : '&#10007;'} ${esc(row.label)} &mdash; ${esc(ok ? 'handled correctly' : row.explain)}</div>`;
    }).join('');
    const lessonStep = qzState.lessonId && typeof QZ_LESSONS !== 'undefined'
      ? (QZ_LESSONS.find(x => x.id === qzState.lessonId) || { steps: [] }).steps.find(s2 => s2.type === 'reconcile' && s2.reconcileId === id)
      : null;
    const continueBtn = (st.correct && lessonStep) ? qzContinueHTML(lessonStep) : '';
    const redoBtn = (st.correct && continueBtn) ? '' : `<button class="qz-btn sm" onclick="qzRecRetry('${id}')">Redo</button>`;
    feedback = `<div class="qz-rv-feedback ${st.correct ? 'good' : 'bad'}">
      <b>${st.correct ? 'Fully reconciled.' : 'Not fully reconciled.'}</b> ${g.right} of ${g.total} graded points. ${esc(r.explain || '')}
      ${bits}
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${continueBtn}${redoBtn}</div>
    </div>`;
  }

  const chip = done
    ? `<span class="qz-rv-chip ${st.correct ? 'good' : 'bad'}">${st.correct ? 'Correct' : 'Needs another look'}</span>`
    : '<span class="qz-rv-chip pending">Pending</span>';

  return `<div class="qz-rv-item qz-rec-item" data-rec-id="${escAttr(id)}">
    <div class="qz-rv-head"><b>${esc(r.label)}</b>${chip}</div>
    <div class="qz-rv-where">${esc(r.where)}</div>
    <p class="qz-rv-instr">${esc(r.instruction)}</p>
    ${head}${grid}${decisions}${submit}${feedback}
  </div>`;
}

/* ============================================================================
   MECHANIC: `compose` — a written reply graded against a rubric
   ----------------------------------------------------------------------------
   qzSendReply used to accept any 20 characters, which made Lesson 5 decorative:
   the trainee could type "aaaaaaaaaaaaaaaaaaaaaa" and be told they had
   communicated professionally. A rubric replaces that. Each criterion is a
   named check the trainee does NOT see until they submit, evaluated with plain
   regex and term lists — no model, no network, nothing that can drift.
   Criteria live on the item so different lessons can weight different things,
   and `mustAvoid` criteria invert (they pass when the pattern is ABSENT), which
   is how "did not leak an SSN" and "did not blame a named third party" work.
   ============================================================================ */
const QZ_NPI_PATTERNS = [
  { re: /\b\d{3}-\d{2}-\d{4}\b/, what: 'a Social Security number' },
  { re: /\b\d{9,}\b/, what: 'a long account-style number' },
  { re: /\brouting\s*(number|#)?\s*[:#]?\s*\d{6,}/i, what: 'a routing number' },
  { re: /\bacct\.?\s*(number|#)?\s*[:#]?\s*\d{5,}/i, what: 'an account number' }
];
function qzComposeCriteria(item) {
  return (item.rubric || []).map(c => Object.assign({}, c));
}
/* Each criterion returns true when satisfied. `test` receives the text plus a
   context object holding the order, so "did you cite the file" can check the
   real address and order number rather than a hardcoded string. */
const QZ_RUBRIC_CHECKS = {
  identifiesFile: (text, ctx) => {
    const o = ctx.order;
    if (!o) return false;
    const street = o.propertyAddress.split(',')[0].toLowerCase();
    const num = o.id.replace('ORD-', '').toLowerCase();
    const t = text.toLowerCase();
    return t.includes(street) || t.includes(num) || t.includes(o.id.toLowerCase());
  },
  givesTimeframe: text => /\b(by|before|on)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|end of (the )?(day|week)|close of business|cob|eod|\d{1,2}\/\d{1,2}|[a-z]+ \d{1,2})\b/i.test(text)
    || /\bwithin\s+\d+\s+(hour|day|business day)/i.test(text)
    || /\b(24|48|72)\s*hours\b/i.test(text),
  acknowledgesRequest: text => /\b(thank|thanks|received|got your|following up|checking in|as you asked|you asked|regarding your|in response to|appreciate)\b/i.test(text),
  noBlame: text => !/\b(their fault|not (my|our) fault|the lender (is|has been) (slow|useless|terrible|dropping)|they (dropped|messed|screwed)|blame|incompetent|useless)\b/i.test(text),
  noNPI: text => !QZ_NPI_PATTERNS.some(p => p.re.test(text)),
  statesNextStep: text => /\b(i will|i'll|we will|we'll|i am|i'm)\s+\w+/i.test(text) && /\b(follow(ing)? up|confirm|contact|reach out|check|update|send|request|escalat)/i.test(text),
  noCommitmentBeyondAuthority: text => !/\b(i (have )?(confirmed|approved|changed|moved|set) the (closing )?date|the new closing date (is|will be)|i can guarantee|i guarantee)\b/i.test(text),
  verifyOutOfBand: text => /\b(call|phone|verbally|by phone|voice)\b/i.test(text) && /\b(number|on file|of record|from the file|previously)\b/i.test(text),
  /* Deliberately not givesTimeframe, though it starts by accepting everything that one does.
     givesTimeframe answers "did you commit to a day you will come back", so it insists on the
     grammar of a promise — "by Thursday", "within 24 hours". An escalation about a wire-fraud
     attempt is asked for something different: convey the window the firm is working against.
     That is stated as a fact about the attack ("the wire goes out tomorrow morning, so this
     needs eyes today"), never as a promise, and it scored zero against the promise grammar —
     the lesson's own model answer failed its own rubric at 4 of 5.
     Still concrete, though: a bare "this is urgent" names no window and does not pass. */
  conveysUrgency: text => QZ_RUBRIC_CHECKS.givesTimeframe(text)
    || /\b(today|tonight|tomorrow|this (morning|afternoon|evening)|first thing|same day|overnight)\b/i.test(text)
    || /\bbefore (the|any|it|anything|funds|money)\b/i.test(text)
};
function qzComposeGrade(item, text, ctx) {
  const results = qzComposeCriteria(item).map(c => {
    const fn = QZ_RUBRIC_CHECKS[c.check];
    let pass = false;
    try { pass = fn ? !!fn(text, ctx || {}) : false; } catch (e) { pass = false; }
    /* A rubric naming a check this file does not define is an authoring or version-skew
       problem, never something the trainee wrote wrongly — and scoring it as a missed point
       makes the exercise unpassable no matter what they write. That is not hypothetical: the
       rubric lives in qualia-data.js and the checks live here, so a browser holding one file
       from cache and the other fresh produces exactly that. Mark it, and keep it out of the
       required set so a mismatch can never block a lesson. */
    const ungradable = !fn;
    return {
      key: c.check, label: c.label, why: c.why, pass: pass,
      ungradable: ungradable,
      required: !ungradable && c.required !== false
    };
  });
  const required = results.filter(r => r.required);
  const passed = required.filter(r => r.pass).length;
  return {
    results: results,
    passed: passed,
    total: required.length,
    correct: required.length > 0 && passed === required.length
  };
}
function qzComposeGet(id) {
  if (!qzStore.composes[id]) qzStore.composes[id] = {};
  return qzStore.composes[id];
}
function qzComposeExamMode(id) {
  return typeof QZ_EXAM_BANK !== 'undefined' && QZ_EXAM_BANK.some(i => i.type === 'compose' && i.id === id);
}
function qzComposeLookup(id) {
  return (typeof QZ_COMPOSES !== 'undefined' ? QZ_COMPOSES.find(c => c.id === id) : null) ||
    (typeof QZ_EXAM_BANK !== 'undefined' ? QZ_EXAM_BANK.find(i => i.type === 'compose' && i.id === id) : null);
}
function qzComposeSubmit(id) {
  const item = qzComposeLookup(id);
  const el = document.getElementById('qzComposeBox-' + id);
  if (!item || !el) return;
  const text = el.value.trim();
  if (text.length < 40) { simToast('Write a full reply before submitting, at least a couple of sentences.'); return; }
  const ctx = { order: item.orderId ? qzGetOrder(item.orderId) : null };
  const g = qzComposeGrade(item, text, ctx);
  const st = qzComposeGet(id);
  st.text = text;
  st.results = g.results;
  st.correct = g.correct;
  if (g.correct) st.everCorrect = true;
  st.resolvedAt = Date.now();
  qzSave();
  qzRenderRoot();
  qzNotifyComposeResolved(id);
}
function qzComposeRetry(id) {
  if (qzComposeExamMode(id)) return;
  const prev = qzStore.composes[id] || {};
  qzStore.composes[id] = { text: prev.text, everCorrect: !!prev.everCorrect };
  qzSave();
  qzRenderRoot();
  qzSyncComposeStep(id);
}
function qzNotifyComposeResolved(composeId) {
  if (!qzState.lessonId || typeof QZ_LESSONS === 'undefined') return;
  const l = QZ_LESSONS.find(x => x.id === qzState.lessonId);
  if (!l) return;
  const step = l.steps.find(s => s.type === 'compose' && s.composeId === composeId);
  if (!step) return;
  const st = qzComposeGet(composeId);
  if (SimEngine.walkActive() && SimEngine.currentStep() === step) {
    if (st.correct) SimEngine.stepCompleted();
    else { SimEngine.renderRetry('Read which points the reply missed, then revise it.'); SimEngine.position(step); }
    return;
  }
  if (!st.correct) return;
  const prog = SimEngine.progress(l);
  simToast(`"${qzLessonStepLabel(step)}" done, ${prog.done} of ${prog.total} steps in Lesson ${l.number}.`, { tone: 'good' });
  qzRenderLessonBanner();
}
function qzComposeItemHTML(id) {
  const item = qzComposeLookup(id);
  if (!item) return '';
  const st = qzComposeGet(id);
  const examMode = qzComposeExamMode(id);
  const done = !!st.resolvedAt;

  const context = (item.thread || []).map(m =>
    `<div class="qz-msg ${m.sender === 'You (VA)' ? 'mine' : ''}"><div class="meta">${esc(m.sender)} &rarr; ${esc(m.recipient)} &middot; ${fmtDate(m.date)}</div>${esc(m.body)}</div>`
  ).join('');

  let feedback = '';
  if (done && !examMode) {
    const bits = st.results.map(r => {
      // Says plainly that the app is stale rather than showing it as a point they missed.
      if (r.ungradable) return `<div class="qz-rv-subfeedback bad">&#9888; ${esc(r.label)} &mdash; this point could not be graded because the page is running an out-of-date script. Reload with Ctrl+Shift+R. It is not counting against you.</div>`;
      return `<div class="qz-rv-subfeedback ${r.pass ? 'good' : 'bad'}">${r.pass ? '&#10003;' : '&#10007;'} ${esc(r.label)}${r.pass ? '' : ' &mdash; ' + esc(r.why)}</div>`;
    }).join('');
    const gradable = st.results.filter(r => !r.ungradable);
    const passed = gradable.filter(r => r.pass).length;
    const lessonStep = qzState.lessonId && typeof QZ_LESSONS !== 'undefined'
      ? (QZ_LESSONS.find(x => x.id === qzState.lessonId) || { steps: [] }).steps.find(s2 => s2.type === 'compose' && s2.composeId === id)
      : null;
    const continueBtn = (st.correct && lessonStep) ? qzContinueHTML(lessonStep) : '';
    const redo = (st.correct && continueBtn) ? '' : `<button class="qz-btn sm" onclick="qzComposeRetry('${id}')">Revise it</button>`;
    feedback = `<div class="qz-rv-feedback ${st.correct ? 'good' : 'bad'}">
      <b>${st.correct ? 'That reply does the job.' : 'This reply is missing something.'}</b>
      ${passed} of ${gradable.length} points covered.
      ${bits}
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${continueBtn}${redo}</div>
    </div>`;
  } else if (done && examMode) {
    feedback = '<div class="qz-rv-subfeedback good">&#10003; Reply recorded. Use Next to continue.</div>';
  }

  const editable = !done;
  return `<div class="qz-rv-item qz-compose-item" data-compose-id="${escAttr(id)}">
    <div class="qz-rv-head"><b>${esc(item.label)}</b></div>
    <p class="qz-rv-instr">${esc(item.instruction)}</p>
    ${context ? `<div class="qz-compose-thread">${context}</div>` : ''}
    <textarea id="qzComposeBox-${id}" class="qz-compose-box" ${editable ? '' : 'disabled'} placeholder="${escAttr(item.placeholder || 'Write your reply...')}" oninput="qzSyncComposeStep('${id}')">${esc(st.text || '')}</textarea>
    ${editable ? `<div class="qz-rv-actions"><button class="qz-btn primary" onclick="qzComposeSubmit('${id}')">Send reply</button>
      <span class="qz-rec-hint">Your reply is checked against what a professional response has to contain. You will see the checklist after you send.</span></div>` : ''}
    ${feedback}
  </div>`;
}

/* ---------- Scenarios ---------- */
function qzOpenScenario(id) { qzState.scenarioId = id; qzState.view = 'scenario'; qzSyncTopTabs(); qzRenderRoot(); }
function qzAnswerScenario(id, idx) {
  const s = QZ_SCENARIOS.find(x => x.id === id);
  const correct = idx === s.correct;
  const prev = qzStore.scenarios[id] || {};
  const firstAttempt = prev.firstAttempt || { answered: idx, correct, ts: Date.now() };
  qzStore.scenarios[id] = {
    answered: idx, correct, firstAttempt,
    everCorrect: !!prev.everCorrect || correct,
    practiced: prev.practiced || false
  };
  qzSave();
  qzRenderRoot();
  qzNotifyScenarioAnswered(id, correct);
}
function qzRetakeScenario(id) {
  const prev = qzStore.scenarios[id] || {};
  // firstAttempt (what's scored) and everCorrect (what gates the next lesson) both survive a
  // retake — clearing everCorrect used to let a retake re-lock lessons already unlocked.
  qzStore.scenarios[id] = {
    firstAttempt: prev.firstAttempt,
    everCorrect: !!prev.everCorrect,
    practiced: !!prev.practiced
  };
  qzSave();
  qzRenderRoot();
  if (SimEngine.walkActive()) {
    const step = SimEngine.currentStep();
    if (step && step.type === 'decide' && step.scenarioId === id) SimEngine.renderTip(step, false);
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

  if (SimEngine.walkActive() && SimEngine.currentStep() === step) {
    if (correct) SimEngine.stepCompleted();
    else SimEngine.renderRetry();
    return;
  }

  if (!correct) return;
  const label = qzLessonStepLabel(step);
  const prog = SimEngine.progress(l);
  if (prog.complete) simToast(`Lesson ${l.number} complete! Use the banner above to head back and unlock the next lesson.`, { tone: 'good', duration: 5000 });
  else simToast(`"${label}" done, ${prog.done} of ${prog.total} steps in Lesson ${l.number}.`, { tone: 'good' });
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
  if (p.hint) simToast(p.hint);
}
/* A scenario's `situation` may be a function so it can quote live state — days to closing,
   the charge currently on the order, the number of outstanding documents. Scenarios that
   hardcoded those numbers in prose drifted out of sync with the data the moment a lesson
   corrected a figure (the accounting scenario still said "$450.00" long after Lesson 3 had
   corrected it to $425.00, describing something the trainee could no longer see). */
function qzSituationText(s) {
  return typeof s.situation === 'function' ? s.situation() : s.situation;
}
function qzScenarioDetailHTML() {
  const s = QZ_SCENARIOS.find(x => x.id === qzState.scenarioId);
  if (!s) return '<p>Scenario not found.</p>';
  const r = qzStore.scenarios[s.id];
  const answered = !!(r && r.answered != null);
  // Displayed order is shuffled; `idx` stays the REAL index so grading and stored answers
  // are unaffected, only the letter and the position change.
  const opts = qzOptionOrder('scenario:' + s.id, s.options.length).map((idx, pos) => {
    const opt = s.options[idx];
    let cls = '';
    if (answered) { if (idx === s.correct) cls = 'correct'; else if (idx === r.answered && !r.correct) cls = 'incorrect'; }
    return `<button type="button" class="qz-option ${cls}" ${answered ? 'disabled' : ''} onclick="qzAnswerScenario('${s.id}',${idx})">${String.fromCharCode(65 + pos)}. ${esc(opt)}</button>`;
  }).join('');
  const firstAttemptLine = answered && r.firstAttempt
    ? `<div class="qz-feedback-first">First attempt: ${r.firstAttempt.correct ? '&#10003; correct' : '&#10007; incorrect'}</div>` : '';
  const lessonStep = qzState.lessonId && typeof QZ_LESSONS !== 'undefined'
    ? (QZ_LESSONS.find(x => x.id === qzState.lessonId) || { steps: [] }).steps.find(s2 => s2.type === 'decide' && s2.scenarioId === s.id)
    : null;
  const continueBtn = (answered && r.correct && lessonStep) ? qzContinueHTML(lessonStep) : '';
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
  const walkActiveHere = SimEngine.walkActive() && lessonStep && SimEngine.currentStep() === lessonStep;
  const feedback = answered ? `<div class="qz-feedback ${r.correct ? 'correct' : 'incorrect'}">
      <b>${r.correct ? 'Correct.' : 'Not quite.'}</b>${esc(s.explanation)}
      ${firstAttemptLine}
      <div class="qz-feedback-actions">
        ${continueBtn}
        ${(!walkActiveHere && r.correct && s.verifyDoc) ? `<button class="qz-btn" onclick="simViewDoc('${s.verifyDoc.file}','${esc(s.verifyDoc.title)}')">${esc(s.verifyDoc.buttonLabel)}</button>` : ''}
        ${(!walkActiveHere && s.practice) ? `<button class="qz-btn primary" onclick="qzPracticeAction('${s.id}')">${esc(s.practice.buttonLabel)} &rarr;</button>` : ''}
        ${r.practiced ? '<span class="qz-rv-chip good">Practiced</span>' : ''}
        ${retakeBtn}
      </div>
    </div>` : '';
  return `<span class="qz-back" onclick="qzGoto('dashboard')">&larr; Dashboard</span>
    <div class="qz-panel qz-scenario-detail"><div class="ph"><h4>${esc(s.title)}</h4></div>
      <p class="situation">${esc(qzSituationText(s))}</p>
      ${opts}
      ${feedback}
    </div>`;
}

/* ---------- Final exam: sampled, timed, no hints, no going back ----------
   Reuses every grading engine the lessons use (qzRev*, qzRec*, qzCompose*) through their
   shared lookups, but in exam mode: one answer per step, no correct/incorrect colouring,
   no "Try again", and no explanation until the whole paper is submitted.

   Two structural differences from the previous version:
     - The paper is DRAWN from QZ_EXAM_BANK per attempt (qzExamBuild), following
       QZ_EXAM_BLUEPRINT, so two sittings are not the same twenty questions.
     - It is timed. A VA is judged on throughput under a queue, and unlimited time on a
       hiring filter measures patience rather than competence. Running out submits what
       exists; it does not discard the attempt. */
function qzExamShuffled(list, seedKey) {
  const order = qzOptionOrder(seedKey, list.length);
  return order.map(i => list[i]);
}
function qzExamBuild() {
  const ids = [];
  QZ_EXAM_BLUEPRINT.forEach(spec => {
    const pool = QZ_EXAM_BANK.filter(i => i.category === spec.category);
    // Salt is regenerated immediately before this runs, so the draw differs per attempt.
    const drawn = qzExamShuffled(pool, 'exampool:' + spec.category).slice(0, spec.count);
    drawn.forEach(i => ids.push(i.id));
  });
  // Interleave categories rather than presenting six verifies in a row.
  return qzExamShuffled(ids, 'examorder');
}
function qzExamItems() {
  const ex = qzStore.exam;
  if (!ex || !ex.itemIds) return [];
  return ex.itemIds.map(id => QZ_EXAM_BANK.find(i => i.id === id)).filter(Boolean);
}
function qzExamLookup(id) { return QZ_EXAM_BANK.find(i => i.id === id); }
/* Clears every engine's state for the bank, so a fresh attempt starts genuinely fresh
   rather than inheriting answers from the previous one (see the reset bug this fixes). */
function qzExamClearItemState() {
  QZ_EXAM_BANK.forEach(i => {
    if (i.type === 'verify') delete qzStore.reviews[i.id];
    if (i.type === 'reconcile') delete qzStore.reconciles[i.id];
    if (i.type === 'compose') delete qzStore.composes[i.id];
  });
}
function qzExamStart() {
  // New salt per attempt: a second attempt must not present the same questions, in the same
  // order, with the same options in the same positions.
  qzNewShuffleSalt();
  qzExamClearItemState();
  const itemIds = qzExamBuild();
  qzStore.exam = {
    startedAt: Date.now(),
    endsAt: Date.now() + QZ_EXAM_MINUTES * 60000,
    itemIds: itemIds,
    currentIndex: 0,
    answers: {},
    submittedAt: null,
    score: 0, max: 0
  };
  qzSave();
  qzState.view = 'exam';
  qzState.examIndex = 0;
  qzSyncTopTabs();
  qzRenderRoot();
  qzExamStartTimer();
}
let qzExamTimerHandle = null;
function qzExamStartTimer() {
  if (qzExamTimerHandle) clearInterval(qzExamTimerHandle);
  qzExamTimerHandle = setInterval(() => {
    const ex = qzStore.exam;
    if (!ex || ex.submittedAt) { clearInterval(qzExamTimerHandle); qzExamTimerHandle = null; return; }
    const el = document.getElementById('qzExamClock');
    const left = ex.endsAt - Date.now();
    if (left <= 0) {
      clearInterval(qzExamTimerHandle); qzExamTimerHandle = null;
      simToast('Time is up. Submitting what you have.', { duration: 5000 });
      qzExamSubmit();
      return;
    }
    if (el) {
      const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      el.textContent = m + ':' + String(s).padStart(2, '0');
      el.classList.toggle('low', left < 5 * 60000);
    }
  }, 1000);
}
function qzExamTimeLeftLabel() {
  const ex = qzStore.exam;
  if (!ex || !ex.endsAt) return '';
  const left = Math.max(0, ex.endsAt - Date.now());
  const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
  return m + ':' + String(s).padStart(2, '0');
}
function qzExamReturn() {
  qzState.view = 'exam';
  qzState.examIndex = (qzStore.exam && qzStore.exam.currentIndex) || 0;
  qzSyncTopTabs();
  qzRenderRoot();
  if (qzStore.exam && !qzStore.exam.submittedAt) qzExamStartTimer();
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
  // Item state lives in qzStore.reviews / .reconciles / .composes, NOT in qzStore.exam.
  // Without clearing it, a "reset" left every item still resolved and the retake could be
  // clicked straight through carrying the previous answers and score.
  qzExamClearItemState();
  qzSave();
  // Leave the exam view before re-rendering: qzExamHTML dereferences qzStore.exam, which
  // we just nulled, and would throw if we re-rendered in place.
  if (qzState.view === 'exam') qzGoto('dashboard');
  else qzRenderRoot();
}
function qzExamNext() {
  qzState.examIndex++;
  if (qzStore.exam) { qzStore.exam.currentIndex = qzState.examIndex; qzSave(); }
  qzRenderRoot();
}
function qzExamItemAnswered(item) {
  const answers = (qzStore.exam && qzStore.exam.answers) || {};
  if (item.type === 'decide') { const a = answers[item.id]; return !!(a && a.idx != null); }
  if (item.type === 'numeric') { const a = answers[item.id]; return !!(a && a.value != null); }
  if (item.type === 'verify') { const s = qzStore.reviews[item.id]; return !!(s && s.resolvedAt); }
  if (item.type === 'reconcile') { const s = qzStore.reconciles[item.id]; return !!(s && s.resolvedAt); }
  if (item.type === 'compose') { const s = qzStore.composes[item.id]; return !!(s && s.resolvedAt); }
  return false;
}
function qzExamAnswerDecide(itemId, idx) {
  if (!qzStore.exam || qzStore.exam.answers[itemId]) return; // one answer only
  qzStore.exam.answers[itemId] = { idx };
  qzSave();
  qzRenderRoot();
}
function qzExamAnswerNumeric(itemId) {
  const el = document.getElementById('qzExamNum-' + itemId);
  if (!el || !qzStore.exam || qzStore.exam.answers[itemId]) return;
  const v = el.value.trim();
  if (!v) { simToast('Enter an amount.'); return; }
  qzStore.exam.answers[itemId] = { value: v };
  qzSave();
  qzRenderRoot();
}
function qzExamDecideItemHTML(item, answered) {
  const a = qzStore.exam.answers[item.id];
  const opts = qzOptionOrder('scenario:' + item.id, item.options.length).map((idx, pos) => {
    const cls = a && a.idx === idx ? 'selected' : '';
    return `<button type="button" class="qz-option ${cls}" ${answered ? 'disabled' : ''} onclick="qzExamAnswerDecide('${item.id}',${idx})">${String.fromCharCode(65 + pos)}. ${esc(item.options[idx])}</button>`;
  }).join('');
  return `<p class="situation">${esc(qzSituationText(item))}</p>${opts}`;
}
function qzExamNumericItemHTML(item, answered) {
  const a = qzStore.exam.answers[item.id];
  return `<p class="situation">${esc(item.prompt)}</p>
    <div class="qz-rv-form">
      <input type="text" id="qzExamNum-${item.id}" value="${escAttr(a ? a.value : '')}" ${answered ? 'disabled' : ''} placeholder="${escAttr(item.placeholder || 'Amount')}">
      ${answered ? '<div class="qz-rv-subfeedback good">&#10003; Answer recorded.</div>'
        : `<div class="row"><button class="qz-btn sm primary" onclick="qzExamAnswerNumeric('${item.id}')">Record answer</button></div>`}
    </div>`;
}
function qzExamHTML() {
  const items = qzExamItems();
  const i = qzState.examIndex;
  const item = items[i];
  if (!item) return '<p>Exam not found.</p>';
  const answered = qzExamItemAnswered(item);
  let body = '';
  if (item.type === 'verify') body = qzExamVerifyItemHTML(item, answered);
  else if (item.type === 'decide') body = qzExamDecideItemHTML(item, answered);
  else if (item.type === 'numeric') body = qzExamNumericItemHTML(item, answered);
  else if (item.type === 'reconcile') body = qzRecItemHTML(item.id);
  else if (item.type === 'compose') body = qzComposeItemHTML(item.id);
  const isLast = i === items.length - 1;
  const nextBtn = answered
    ? `<button class="qz-btn primary" onclick="${isLast ? 'qzExamSubmit()' : 'qzExamNext()'}">${isLast ? 'Submit Exam' : 'Next'} &rarr;</button>`
    : '';
  return `<div class="qz-exam-banner"><b>Final Exam</b> &middot; Question ${i + 1} of ${items.length} &middot; no hints, no going back
      <span class="qz-exam-clock" id="qzExamClock">${qzExamTimeLeftLabel()}</span></div>
    <div class="qz-panel qz-exam-item">
      ${body}
      <div style="margin-top:16px">${nextBtn}</div>
    </div>`;
}
function qzExamActiveBannerHTML() {
  if (!qzStore.exam || qzStore.exam.submittedAt || qzState.view === 'exam') return '';
  return `<div class="qz-exam-banner active" onclick="qzExamReturn()">Final Exam in progress &middot; ${qzExamTimeLeftLabel()} left &middot; Return to Exam &rarr;</div>`;
}
/* Partial credit on the two multi-part types: a reconcile with 9 graded points and a
   compose with 6 rubric criteria are not all-or-nothing the way a multiple choice is, and
   scoring them that way would make the paper far harsher than the pass mark assumes. */
function qzExamScoreItem(item) {
  if (item.type === 'decide') {
    const a = qzStore.exam.answers[item.id];
    return (a && a.idx === item.correct) ? item.points : 0;
  }
  if (item.type === 'numeric') {
    const a = qzStore.exam.answers[item.id];
    if (!a) return 0;
    const got = qzParseNumeric(a.value), want = qzParseNumeric(item.answer);
    if (got === null || want === null) return 0;
    return Math.abs(got - want) <= (item.tolerance || 0.01) ? item.points : 0;
  }
  if (item.type === 'verify') {
    const s = qzStore.reviews[item.id];
    return (s && s.correct) ? item.points : 0;
  }
  if (item.type === 'reconcile') {
    const s = qzStore.reconciles[item.id];
    if (!s || !s.resolvedAt) return 0;
    const g = qzRecGrade(item.id);
    return g.total ? Math.round(item.points * (g.right / g.total)) : 0;
  }
  if (item.type === 'compose') {
    const s = qzStore.composes[item.id];
    if (!s || !s.results) return 0;
    const req = s.results.filter(r => r.required);
    const passed = req.filter(r => r.pass).length;
    return req.length ? Math.round(item.points * (passed / req.length)) : 0;
  }
  return 0;
}
function qzExamSubmit() {
  if (!qzStore.exam) return;
  if (qzExamTimerHandle) { clearInterval(qzExamTimerHandle); qzExamTimerHandle = null; }
  const items = qzExamItems();
  let score = 0, max = 0;
  items.forEach(item => { max += item.points; score += qzExamScoreItem(item); });
  qzStore.exam.score = score;
  qzStore.exam.max = max;
  qzStore.exam.submittedAt = Date.now();
  qzSave();
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  if (su && window.SCApp.setModeScore) SCApp.setModeScore(su.id, 'qualia', 'exam', score, max);
  qzGoto('dashboard');
}
/* Per-item breakdown shown on the dashboard after submission — the exam withholds
   feedback until the end, so this is the only place the candidate learns anything. */
function qzExamResultHTML() {
  const ex = qzStore.exam;
  if (!ex || !ex.submittedAt) return '';
  const items = qzExamItems();
  const pct = ex.max ? ex.score / ex.max : 0;
  const passed = pct >= QZ_EXAM_PASS_PCT;
  const rows = items.map(item => {
    const got = qzExamScoreItem(item);
    const label = item.label || item.situation || item.prompt || item.id;
    const short = String(typeof label === 'function' ? label() : label).slice(0, 90);
    return `<div class="qz-rv-subfeedback ${got === item.points ? 'good' : got > 0 ? '' : 'bad'}">
      ${got === item.points ? '&#10003;' : got > 0 ? '&bull;' : '&#10007;'} ${esc(short)} &mdash; ${got}/${item.points}</div>`;
  }).join('');
  return `<div class="qz-rv-feedback ${passed ? 'good' : 'bad'}">
    <b>${passed ? 'Passed' : 'Did not pass'} &mdash; ${ex.score}/${ex.max} (${Math.round(pct * 100)}%)</b>
    Pass mark is ${Math.round(QZ_EXAM_PASS_PCT * 100)}%.
    ${rows}
  </div>`;
}

function qzExamVerifyItemHTML(item, answered) {
  const st = qzRevGet(item.id);
  const step1 = `<div class="qz-rv-step ${st.docOpened ? 'done' : 'active'}">
    <div class="qz-rv-step-h">Step 1 &middot; Open the source document</div>
    <button class="qz-btn sm" onclick="qzRevOpenDoc('${item.id}')">${st.docOpened ? 'Reopen' : 'Open'} ${esc(item.docTitle)}</button>
  </div>`;
  // Exam rendering differs from the lesson version on purpose and in exactly one direction:
  // nothing here tells the trainee how they're doing. No correct/incorrect coloring, no
  // "Try again", no inline feedback — a step is answered once and the item moves on, right
  // or wrong. Previously this reused the lesson's retry controls, which meant every multiple
  // choice could be brute-forced until it went green: 4 options, unlimited attempts.
  let step2 = '';
  if (st.docOpened) {
    const mcAnswered = !!st.step2Choice;
    const opts = qzOptionOrder('rev2:' + item.id, item.sourceOptions.length).map(i => {
      const o = item.sourceOptions[i];
      return `<button type="button" class="qz-option qz-rv-mc ${st.step2Choice === o.id ? 'selected' : ''}" ${mcAnswered ? 'disabled' : ''} onclick="qzRevAnswerSource('${item.id}','${o.id}')">${esc(o.text)}</button>`;
    }).join('');
    step2 = `<div class="qz-rv-step ${mcAnswered ? 'done' : 'active'}"><div class="qz-rv-step-h">Step 2 &middot; What does the source document actually say?</div>${opts}</div>`;
  }
  let step3 = '';
  if (qzRevStep3Unlocked(item.id)) {
    const mcAnswered = !!st.step3Choice;
    const opts = qzOptionOrder('rev3:' + item.id, QZ_ACTION_CHOICES.length).map(i => {
      const a2 = QZ_ACTION_CHOICES[i];
      return `<button type="button" class="qz-option qz-rv-mc ${st.step3Choice === a2.id ? 'selected' : ''}" ${mcAnswered ? 'disabled' : ''} onclick="qzRevAnswerAction('${item.id}','${a2.id}')">${esc(a2.label)}</button>`;
    }).join('');
    step3 = `<div class="qz-rv-step ${mcAnswered ? 'done' : 'active'}"><div class="qz-rv-step-h">Step 3 &middot; What's the right next step?</div>${opts}</div>`;
  }
  let step4 = '';
  const step4Kind = st.resolvedAt ? null : qzRevStep4Kind(item.id);
  if (step4Kind === 'correct') {
    step4 = `<div class="qz-rv-step active"><div class="qz-rv-step-h">Step 4 &middot; Enter the corrected value</div>
      <div class="qz-rv-form"><input type="text" id="qzRevInput-${item.id}" value="" placeholder="Type it exactly as the source document shows it">
      <div class="row"><button class="qz-btn sm primary" onclick="qzRevSaveCorrection('${item.id}')">Save correction</button></div></div></div>`;
  } else if (step4Kind === 'escalate') {
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

/* ---------- bootstrap ---------- */
/* Hands the shared engine everything it cannot know on its own. Note that `lessons` is
   passed by reference to the live array, so nothing has to be re-registered when the
   curriculum changes, and `store` is a getter rather than the object itself because
   qzLoad() REPLACES qzStore wholesale on load. */
function qzInitEngine() {
  SimEngine.init({
    lessons: QZ_LESSONS,
    store: () => qzStore,
    save: qzSave,
    render: qzRenderRoot,
    goHome: () => { qzExitLesson(); qzGoto('dashboard'); },
    showLesson: (id) => { qzOpenLesson(id); },
    currentLessonId: () => qzState.lessonId,
    navigate: qzLessonStepNavigate,
    stepDone: qzLessonStepDone,
    stepLabel: qzLessonStepLabel,
    stepStatus: qzLessonStepStatus,
    // Every item type that renders its own explanation plus a Continue button on the page.
    selfFeedbackTypes: ['decide', 'verify', 'reconcile', 'compose'],
    feedbackSelector: '.qz-feedback, .qz-rv-feedback',
    beforeStep: qzUnlockSearchInput,
    lessonEverComplete: qzLessonEverComplete,
    noteLessonComplete: qzNoteLessonComplete,
    resetLesson: qzResetLesson,
    btnClass: 'qz-btn'
  });
}
document.addEventListener('DOMContentLoaded', function () {
  qzLoad();
  qzMigrateChecklistScope();
  qzInitEngine();
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  if (su) {
    qzEnter();
  } else {
    document.getElementById('qzLoginWrap').innerHTML = qzLoginHTML();
  }
});
