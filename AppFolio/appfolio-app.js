/* ============================================================================
   APPFOLIO SIMULATOR — STATE, ROUTING AND CORE VIEWS
   ============================================================================

   This file is the contract. Prompt 1/3 establishes the architecture; 2/3 fills
   the portfolio and 3/3 the curriculum. Nothing here should need rewriting by
   either of them.

   The central design decision is that COURSE and PRODUCT are two separate
   worlds that share one application:

     afStore   graded progress.  localStorage.  Survives a reload.
     afDemo    the product.      memory only.   A reload wipes it.

   and one gate between them: afMark(). Exploring the product cannot earn course
   credit, because every write that grades passes through a single guard. That
   property — that a reviewer can confirm the separation by reading one function
   — is why the module is built this way rather than retrofitted later.
   ============================================================================ */


/* ============================================================================
   1. THE TWO STORES
   ============================================================================ */

const AF_LS_KEY = 'af_va_training_v1';

/* Graded progress, and nothing else. Every key here is a record of something a
   trainee answered. If a new key is ever needed, it is worth asking whether the
   thing being stored is really a graded answer or whether it belongs in afDemo. */
const AF_STORE_DEFAULTS = {
  checklist: {},     // completed lesson steps
  scenarios: {},     // 'decide' answers
  reviews: {},       // 'verify' answers
  reconciles: {},    // 'reconcile' answers
  composes: {},      // 'compose' answers
  triages: {},       // 'triage' answers
  exam: null,
  lessonsDone: {},
  shuffleSalt: null,
  tourSeen: false
};
function afDefaultStore() { return JSON.parse(JSON.stringify(AF_STORE_DEFAULTS)); }
let afStore = afDefaultStore();

/* Everything the visitor creates or edits while exploring. A plain in-memory
   object, so a refresh drops it.

   sessionStorage would not work here: it also survives a reload. Neither would
   IndexedDB, cookies or window.name. Memory is the only thing that gives the
   "nothing I did persists" behaviour the demo needs. */
const AF_DEMO_DEFAULTS = {
  overrides: {},      // edits to catalogue entities, keyed by type then id
  created: {},        // entities the visitor made, keyed by type
  purged: {},         // tombstones for what they deleted, keyed by type then id
  ledgerEntries: [],  // charges and payments they posted
  workOrders: {},     // status changes
  applications: {},   // leasing funnel decisions
  messages: [],       // communications sent
  tasks: {},
  notifications: [],
  settings: {},
  filters: {},
  user: {
    name: 'Alex Rivera',
    email: 'alex.rivera@agency.example.com',
    role: 'Property Management Virtual Assistant',
    companyName: 'Lone Star Residential Management',
    accountId: 'AF-TX-30714'
  }
};
function afDefaultDemo() { return JSON.parse(JSON.stringify(AF_DEMO_DEFAULTS)); }
let afDemo = afDefaultDemo();

/* The only three places localStorage is touched in this module. Keeping it to
   three lines is a checkable property, not a style preference: it is how a
   reviewer confirms nothing about the product is leaking into persistence. */
function afLoad() {
  try {
    const raw = localStorage.getItem(AF_LS_KEY);
    afStore = raw ? Object.assign(afDefaultStore(), JSON.parse(raw)) : afDefaultStore();
  } catch (e) {
    afStore = afDefaultStore();
  }
  /* Never read back from storage. A fresh object on every load is the whole
     point of the model, and restoring it here would quietly defeat it. */
  afDemo = afDefaultDemo();
}
function afSave() {
  localStorage.setItem(AF_LS_KEY, JSON.stringify(afStore));
}
function afResetProgress() {
  localStorage.removeItem(AF_LS_KEY);
  afStore = afDefaultStore();
}

/* Returns the sandbox to its factory state without touching a single lesson. */
function afResetDemo() {
  afDemo = afDefaultDemo();
}


/* ============================================================================
   2. VIEW STATE
   ============================================================================ */

let afState = {
  view: 'dashboard',
  section: 'dashboard',

  /* 'sandbox' | 'lesson'. Deliberately not persisted: every load starts in
     sandbox, so nobody can be mid-lesson without having chosen to be. */
  mode: 'sandbox',

  lessonId: null,
  activePropertyId: null,
  activeUnitId: null,
  activeLeaseId: null,
  activeResidentId: null,
  activeOwnerId: null,
  activeWorkOrderId: null,
  activeApplicationId: null,

  accountingTab: 'overview',
  reportingTab: 'catalog',
  settingsPage: 'profile',

  searchQuery: '',
  page: 1,
  pageSize: 25,
  sidebarOpen: false
};


/* ============================================================================
   3. DETERMINISM HELPERS
   ============================================================================
   No Math.random() and no new Date() anywhere in this module. Two loads must
   produce a byte-identical portfolio, or screenshots drift, lessons become
   unstable, and an audit trail rewrites itself between repaints.
   ============================================================================ */

const AF_EPOCH = (function () {
  const p = AF_TODAY.split('-').map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2]);
})();

function afToday() { return AF_TODAY; }

/* Whole days from AF_TODAY to an ISO date. Negative means already past. */
function afDaysFromToday(iso) {
  if (!iso) return NaN;
  const p = String(iso).split('-').map(Number);
  return Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - AF_EPOCH) / 86400000);
}

function afAddDays(iso, n) {
  const p = String(iso).split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2]) + n * 86400000).toISOString().slice(0, 10);
}

const AF_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* "Aug 12, 2026". The raw ISO stays available wherever sorting matters. */
function afFmtDate(iso) {
  if (!iso) return '—';
  const p = String(iso).split('-');
  if (p.length !== 3) return String(iso);
  return AF_MONTHS[Number(p[1]) - 1] + ' ' + Number(p[2]) + ', ' + p[0];
}

/* Cents in, currency out. Money is stored as integer cents everywhere in this
   module — trust accounting cannot survive floating point, and a deposit that
   drifts by a cent is a real problem, not a rounding curiosity. Formatting is
   the only place a decimal point is allowed to exist. */
function afFmtMoney(cents, opts) {
  opts = opts || {};
  if (cents === null || cents === undefined || isNaN(cents)) return '—';
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const frac = String(abs % 100).padStart(2, '0');
  const body = '$' + whole + '.' + frac;
  if (!neg) return body;
  /* Accounting convention: parentheses, because a minus sign in a column of
     figures is easy to miss and easy to lose in a photocopy. */
  return opts.plain ? '-' + body : '(' + body + ')';
}

/* FNV-1a. Used to seed the PRNG from a stable id, so the same entity always
   produces the same "random" detail. */
function afHashString(s) {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* mulberry32, seeded. Prompt 2/3 generates the portfolio through this, keyed on
   entity id, which is what makes the world reproducible. */
function afMulberry32(seed) {
  let a = (typeof seed === 'string' ? afHashString(seed) : seed) >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Escaping is borrowed from the shared engine so the repo keeps exactly one
   definition of each rather than a third divergent copy. */
const esc = SimEngine.esc;
const escAttr = SimEngine.escAttr;


/* ============================================================================
   4. THE MODE SWITCH
   ============================================================================ */

/* Everything that grades funnels through afMark() (for 'do' checklist steps) or
   afRecordAnswer() (for the five answer buckets). One guard, one return, and
   the separation between exploring and being examined is a property a reviewer
   can confirm by reading a single function. */
function afMark(id) {
  if (afState.mode !== 'lesson') return;
  if (afStore.checklist[id]) return;
  afStore.checklist[id] = true;
  afSave();
  afNotifyStepDone(id);
}

/* The five graded buckets have exactly one writer, for the same reason checklist
   has exactly one: a reviewer must be able to confirm the course/product boundary
   by reading one function, not by auditing five call sites. Writing to
   afStore.scenarios (or reviews, reconciles, composes, triages) directly is a
   defect, not a shortcut. */
const AF_ANSWER_BUCKETS = ['scenarios', 'reviews', 'reconciles', 'composes', 'triages'];

function afRecordAnswer(bucket, id, payload) {
  if (afState.mode !== 'lesson') return false;
  if (AF_ANSWER_BUCKETS.indexOf(bucket) === -1) return false;
  if (!id) return false;
  afStore[bucket][id] = payload;
  afSave();
  afNotifyAnswerRecorded(bucket, id);
  return true;
}

function afSetMode(mode, opts) {
  opts = opts || {};
  if (afState.mode === mode) return;
  afState.mode = mode;
  /* Switching by hand is type A: nothing is destroyed, so nothing is asked. */
  if (!opts.quiet) {
    simToast(mode === 'lesson'
      ? 'Lesson mode. Your work now counts towards the course.'
      : 'Sandbox mode. Explore freely — nothing here is graded.', { tone: 'good' });
  }
  afRenderChrome();
  afRenderRoot();
}

/* Hidden entirely on a stakeholder link, where there is no course to switch to. */
function afDemoMode() {
  try { return new URLSearchParams(location.search).get('demo') === '1'; }
  catch (e) { return false; }
}

/* One predicate for every list that mixes course scaffolding with product.
   AF_SECTIONS and AF_SETTINGS_PAGES both answer to this; a third list must too. */
function afShowsTraining() {
  return !afDemoMode();
}

function afModeSwitchHTML() {
  if (afDemoMode()) return '';
  const lesson = afState.mode === 'lesson';
  return '<div class="af-mode" role="group" aria-label="Simulator mode">' +
    '<button type="button" class="af-mode-btn' + (lesson ? '' : ' on') + '" ' +
      'aria-pressed="' + (!lesson) + '" onclick="afSetMode(\'sandbox\')">Sandbox</button>' +
    '<button type="button" class="af-mode-btn' + (lesson ? ' on' : '') + '" ' +
      'aria-pressed="' + lesson + '" onclick="afSetMode(\'lesson\')">Lesson</button>' +
    '</div>';
}


/* ============================================================================
   5. ACTION TAXONOMY
   ============================================================================
   A  real            mutates afDemo, the UI changes, a refresh clears it
   B  real, confirmed a modal first, then the real effect
   C  honest toast    afDemoAction(), one sentence, one handler
   D  dead button     forbidden

   In this first prompt most controls are C, because there is no world to mutate
   yet. That is expected. What is not acceptable is a control with no handler at
   all, and centralising C in one function is what lets the next prompt measure
   its own progress by counting call sites.
   ============================================================================ */

function afDemoAction(label) {
  simToast(label + ' is not available in this demo environment.');
}

/* One confirmation modal for every destructive action, so "are you sure?"
   always looks and behaves the same way. */
let afConfirmPending = null;

function afConfirm(opts) {
  afCloseConfirm();
  const wrap = document.createElement('div');
  wrap.className = 'af-modal-backdrop';
  wrap.id = 'afConfirmModal';
  wrap.innerHTML =
    '<div class="af-modal" role="dialog" aria-modal="true" aria-labelledby="afConfirmTitle">' +
      '<h3 id="afConfirmTitle" class="af-modal-title">' + esc(opts.title || 'Are you sure?') + '</h3>' +
      '<div class="af-modal-body">' +
        (opts.body ? '<p>' + esc(opts.body) + '</p>' : '') +
        /* Saying what will NOT be affected is the point of these dialogs. The
           two reset buttons are easy to confuse, and confusing them costs
           somebody either their sandbox or their course record. */
        (opts.safe ? '<p class="af-modal-safe">' + esc(opts.safe) + '</p>' : '') +
      '</div>' +
      '<div class="af-modal-foot">' +
        '<button type="button" class="af-btn" onclick="afCloseConfirm()">Cancel</button>' +
        '<button type="button" class="af-btn ' + (opts.danger ? 'danger' : 'primary') + '" ' +
          'onclick="afConfirmGo()">' + esc(opts.confirmLabel || 'Confirm') + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);
  afConfirmPending = opts;
}
function afConfirmGo() {
  const o = afConfirmPending;
  afCloseConfirm();
  if (o && o.onConfirm) o.onConfirm();
}
function afCloseConfirm() {
  const el = document.getElementById('afConfirmModal');
  if (el) el.remove();
  afConfirmPending = null;
}


/* ============================================================================
   6. THE THREE-LAYER ACCESS LAYER
   ============================================================================
   Every entity resolves through three sources, in this order:

     base       the immutable catalogue in appfolio-catalog-data.js
     override   an edit the visitor made this session, from afDemo.overrides
     created    an entity the visitor made this session, from afDemo.created

   Curriculum always wins an id collision. When prompt 3/3 introduces lesson
   entities, nothing in the catalogue may shadow them — a lesson that silently
   grades against scenery is unfixable from the outside.
   ============================================================================ */

const AF_ENTITIES = {
  property:       { catalog: function () { return AFC_PROPERTIES; },       label: 'Property' },
  unit:           { catalog: function () { return AFC_UNITS; },            label: 'Unit' },
  lease:          { catalog: function () { return AFC_LEASES; },           label: 'Lease' },
  resident:       { catalog: function () { return AFC_RESIDENTS; },        label: 'Resident' },
  ledgerEntry:    { catalog: function () { return AFC_LEDGER_ENTRIES; },   label: 'Ledger entry' },
  owner:          { catalog: function () { return AFC_OWNERS; },           label: 'Owner' },
  workOrder:      { catalog: function () { return AFC_WORK_ORDERS; },      label: 'Work order' },
  vendor:         { catalog: function () { return AFC_VENDORS; },          label: 'Vendor' },
  application:    { catalog: function () { return AFC_APPLICATIONS; },     label: 'Application' },
  guestCard:      { catalog: function () { return AFC_GUEST_CARDS; },      label: 'Guest card' },
  bankAccount:    { catalog: function () { return AFC_BANK_ACCOUNTS; },    label: 'Bank account' },
  transaction:    { catalog: function () { return AFC_TRANSACTIONS; },     label: 'Transaction' },
  ownerStatement: { catalog: function () { return AFC_OWNER_STATEMENTS; }, label: 'Owner statement' },
  task:           { catalog: function () { return AFC_TASKS; },            label: 'Task' }
};

function afCatalog(type) {
  const e = AF_ENTITIES[type];
  return e ? (e.catalog() || []) : [];
}

/* Layer 1: the catalogue as authored, untouched. */
function afBase(type, id) {
  return afCatalog(type).find(function (x) { return x.id === id; }) || null;
}

/* Layer 2: catalogue + this session's edits and creations. */
function afGet(type, id) {
  if (afDemo.purged[type] && afDemo.purged[type][id]) return null;
  const created = (afDemo.created[type] || []).find(function (x) { return x.id === id; });
  const base = afBase(type, id);
  const ov = afDemo.overrides[type] ? afDemo.overrides[type][id] : null;
  const src = base || created;
  if (!src) return null;
  return ov ? Object.assign({}, src, ov) : src;
}

/* Layer 3: everything of a type that currently exists, purges excluded. */
function afAll(type) {
  const created = afDemo.created[type] || [];
  const ids = afCatalog(type).map(function (x) { return x.id; })
    .concat(created.map(function (x) { return x.id; }));
  const seen = {};
  return ids.filter(function (id) {
    if (seen[id]) return false;
    seen[id] = true;
    return true;
  }).map(function (id) { return afGet(type, id); }).filter(Boolean);
}

function afSetOverride(type, id, patch) {
  if (!afDemo.overrides[type]) afDemo.overrides[type] = {};
  afDemo.overrides[type][id] = Object.assign(afDemo.overrides[type][id] || {}, patch);
}
function afCreate(type, entity) {
  if (!afDemo.created[type]) afDemo.created[type] = [];
  afDemo.created[type].push(entity);
  return entity;
}
function afPurge(type, id) {
  if (!afDemo.purged[type]) afDemo.purged[type] = {};
  afDemo.purged[type][id] = true;
}

/* Named wrappers. Thin by design — they exist so call sites read as domain
   language rather than as string keys, and so a typo in a type name fails at
   the call site instead of silently returning an empty list. */
function afBaseProperty(id) { return afBase('property', id); }
function afGetProperty(id) { return afGet('property', id); }
function afAllProperties() { return afAll('property'); }

function afBaseUnit(id) { return afBase('unit', id); }
function afGetUnit(id) { return afGet('unit', id); }
function afAllUnits() { return afAll('unit'); }

function afBaseLease(id) { return afBase('lease', id); }
function afGetLease(id) { return afGet('lease', id); }
function afAllLeases() { return afAll('lease'); }

function afBaseResident(id) { return afBase('resident', id); }
function afGetResident(id) { return afGet('resident', id); }
function afAllResidents() { return afAll('resident'); }

function afBaseLedgerEntry(id) { return afBase('ledgerEntry', id); }
function afGetLedgerEntry(id) { return afGet('ledgerEntry', id); }
/* Ledger entries the visitor posted live in their own array rather than in
   created[], because a ledger is append-only and ordering matters. */
function afAllLedgerEntries() { return afAll('ledgerEntry').concat(afDemo.ledgerEntries || []); }

function afBaseOwner(id) { return afBase('owner', id); }
function afGetOwner(id) { return afGet('owner', id); }
function afAllOwners() { return afAll('owner'); }

function afBaseWorkOrder(id) { return afBase('workOrder', id); }
function afGetWorkOrder(id) { return afGet('workOrder', id); }
function afAllWorkOrders() { return afAll('workOrder'); }

function afBaseVendor(id) { return afBase('vendor', id); }
function afGetVendor(id) { return afGet('vendor', id); }
function afAllVendors() { return afAll('vendor'); }

function afBaseApplication(id) { return afBase('application', id); }
function afGetApplication(id) { return afGet('application', id); }
function afAllApplications() { return afAll('application'); }

function afBaseGuestCard(id) { return afBase('guestCard', id); }
function afGetGuestCard(id) { return afGet('guestCard', id); }
function afAllGuestCards() { return afAll('guestCard'); }

function afBaseBankAccount(id) { return afBase('bankAccount', id); }
function afGetBankAccount(id) { return afGet('bankAccount', id); }
function afAllBankAccounts() { return afAll('bankAccount'); }

function afBaseTransaction(id) { return afBase('transaction', id); }
function afGetTransaction(id) { return afGet('transaction', id); }
function afAllTransactions() { return afAll('transaction'); }

function afBaseOwnerStatement(id) { return afBase('ownerStatement', id); }
function afGetOwnerStatement(id) { return afGet('ownerStatement', id); }
function afAllOwnerStatements() { return afAll('ownerStatement'); }

function afBaseTask(id) { return afBase('task', id); }
function afGetTask(id) { return afGet('task', id); }
function afAllTasks() { return afAll('task'); }


/* ============================================================================
   7. INTEGRITY AUDIT — rule R2, no orphans
   ============================================================================
   Every id cited by any entity must resolve. A vendorId on a work order that
   opens nothing, or a unitId on a lease that does not exist, is the defect this
   project has been chasing since its first module — and the one the Qualia
   module still carries in the form of order numbers painted grey because there
   is nothing behind them.

   Prompt 2/3 uses this as an acceptance criterion when it generates the world.
   With the seed it must return zero.
   ============================================================================ */

/* Foreign keys per entity type: which field points at which type, and whether
   the field is a single id or a list. Declared as data so adding an entity in
   2/3 means adding a row here, not editing a walk function. */
const AF_REFERENCES = [
  { type: 'property',       field: 'ownerIds',      target: 'owner',       list: true },
  { type: 'unit',           field: 'propertyId',    target: 'property' },
  { type: 'unit',           field: 'currentLeaseId', target: 'lease',      nullable: true },
  { type: 'lease',          field: 'unitId',        target: 'unit' },
  { type: 'lease',          field: 'residentIds',   target: 'resident',    list: true },
  { type: 'ledgerEntry',    field: 'leaseId',       target: 'lease' },
  { type: 'owner',          field: 'propertyIds',   target: 'property',    list: true },
  { type: 'workOrder',      field: 'unitId',        target: 'unit' },
  { type: 'workOrder',      field: 'propertyId',    target: 'property' },
  { type: 'workOrder',      field: 'vendorId',      target: 'vendor',      nullable: true },
  { type: 'workOrder',      field: 'reportedBy',    target: 'resident',    nullable: true },
  { type: 'application',    field: 'unitId',        target: 'unit' },
  { type: 'guestCard',      field: 'unitId',        target: 'unit' },
  { type: 'transaction',    field: 'accountId',     target: 'bankAccount' },
  { type: 'transaction',    field: 'propertyId',    target: 'property',    nullable: true },
  { type: 'transaction',    field: 'leaseId',       target: 'lease',       nullable: true },
  { type: 'ownerStatement', field: 'ownerId',       target: 'owner' }
];

function afAuditIntegrity() {
  const broken = [];

  AF_REFERENCES.forEach(function (ref) {
    afAll(ref.type).forEach(function (entity) {
      const raw = entity[ref.field];
      if (raw === undefined) {
        broken.push({ type: ref.type, id: entity.id, field: ref.field, problem: 'field missing' });
        return;
      }
      if (raw === null || raw === '') {
        if (!ref.nullable) {
          broken.push({ type: ref.type, id: entity.id, field: ref.field, problem: 'required reference is null' });
        }
        return;
      }
      const ids = ref.list ? (Array.isArray(raw) ? raw : []) : [raw];
      if (ref.list && !Array.isArray(raw)) {
        broken.push({ type: ref.type, id: entity.id, field: ref.field, problem: 'expected a list' });
        return;
      }
      ids.forEach(function (id) {
        /* reportedBy on a work order may name a system actor rather than a
           resident, so a non-id value there is not a broken reference. */
        if (ref.type === 'workOrder' && ref.field === 'reportedBy' && !/^RES-/.test(id)) return;
        if (!afGet(ref.target, id)) {
          broken.push({ type: ref.type, id: entity.id, field: ref.field, problem: 'points at missing ' + ref.target + ' "' + id + '"' });
        }
      });
    });
  });

  /* Reciprocity: a unit that names a lease must be the unit that lease names.
     A one-way link is technically resolvable and still wrong. */
  afAllUnits().forEach(function (u) {
    if (!u.currentLeaseId) return;
    const l = afGetLease(u.currentLeaseId);
    if (l && l.unitId !== u.id) {
      broken.push({ type: 'unit', id: u.id, field: 'currentLeaseId', problem: 'lease "' + l.id + '" belongs to unit "' + l.unitId + '"' });
    }
  });
  afAllProperties().forEach(function (p) {
    (p.ownerIds || []).forEach(function (oid) {
      const o = afGetOwner(oid);
      if (o && (o.propertyIds || []).indexOf(p.id) === -1) {
        broken.push({ type: 'property', id: p.id, field: 'ownerIds', problem: 'owner "' + oid + '" does not list this property' });
      }
    });
  });

  return broken;
}


/* ============================================================================
   8. NAVIGATION
   ============================================================================ */

const AF_SECTIONS = [
  { id: 'dashboard',      label: 'Dashboard' },
  { id: 'properties',     label: 'Properties' },
  { id: 'residents',      label: 'Residents' },
  { id: 'owners',         label: 'Owners' },
  { id: 'leasing',        label: 'Leasing' },
  { id: 'maintenance',    label: 'Maintenance' },
  { id: 'accounting',     label: 'Accounting' },
  { id: 'communications', label: 'Communications' },
  { id: 'reporting',      label: 'Reporting' },
  { id: 'tasks',          label: 'Tasks' },
  { id: 'settings',       label: 'Settings' },
  { id: 'lessons',        label: 'Lessons', training: true }
];

function afGoto(view, extraId) {
  afState.view = view;
  afState.sidebarOpen = false;

  if (AF_SECTIONS.some(function (s) { return s.id === view; })) afState.section = view;

  if (view === 'property-detail') { afState.activePropertyId = extraId; afState.section = 'properties'; }
  if (view === 'unit-detail')     { afState.activeUnitId = extraId;     afState.section = 'properties'; }
  if (view === 'resident-detail') { afState.activeResidentId = extraId; afState.section = 'residents'; }
  if (view === 'owner-detail')    { afState.activeOwnerId = extraId;    afState.section = 'owners'; }
  if (view === 'work-order')      { afState.activeWorkOrderId = extraId; afState.section = 'maintenance'; }
  if (view === 'application')     { afState.activeApplicationId = extraId; afState.section = 'leasing'; }

  if (view === 'lesson') {
    afState.lessonId = extraId;
    /* Opening a lesson switches worlds automatically. Nobody should discover
       halfway through that their work was not being counted. */
    if (afState.mode !== 'lesson') afSetMode('lesson', { quiet: true });
  } else if (view === 'lessons') {
    afState.lessonId = null;
  } else if (afState.mode === 'lesson' && !afState.lessonId) {
    afSetMode('sandbox', { quiet: true });
  }

  afState.page = 1;
  afRenderChrome();
  afRenderRoot();
  const body = document.querySelector('.af-body');
  if (body) body.scrollTop = 0;
}

/* Leaving a lesson returns to the sandbox, so the switch always reflects where
   the trainee actually is. */
function afExitLesson() {
  afState.lessonId = null;
  afSetMode('sandbox', { quiet: true });
  afGoto('lessons');
}


/* ============================================================================
   9. RENDERING
   ============================================================================ */

/* The chrome — top bar, nav, mode switch, lesson banner — is painted separately
   from #afRoot so it does not get rebuilt on every view change, and so the
   lesson banner keeps its own box outside the view container.

   That last part is not incidental. In the Qualia module a banner placed inside
   a display:flex container became a 305px column beside the application. Here
   the banner is a sibling of #afRoot, not a child. */
function afRenderChrome() {
  const nav = document.getElementById('afNav');
  if (nav) {
    nav.innerHTML = AF_SECTIONS.filter(function (s) {
      return !s.training || afShowsTraining();
    }).map(function (s) {
      return '<button type="button" class="af-nav-item' +
        (afState.section === s.id ? ' on' : '') +
        (s.training ? ' training' : '') +
        '" data-section="' + escAttr(s.id) + '" onclick="afGoto(\'' + escAttr(s.id) + '\')">' +
        esc(s.label) + '</button>';
    }).join('');
  }

  const mode = document.getElementById('afModeSwitch');
  if (mode) mode.innerHTML = afModeSwitchHTML();

  afRenderSubnav();
  afRenderLessonBanner();
}

/* Structural subnav band between topbar and body. Currently empty in Phase 1 / Contract,
   so it stays hidden without taking layout space. Phase 2/3 will attach tabs here. */
function afRenderSubnav() {
  const el = document.getElementById('afSubnav');
  if (!el) return;
  el.innerHTML = '';
  el.hidden = true;
}

/* A step is stale when the transcript says it is done but the sandbox — which
   lives in memory — no longer shows what it did. That divergence is the price of
   keeping the product out of localStorage, so it gets surfaced and offered a redo
   instead of being hidden or "fixed" by persisting the sandbox.
   A step 'do' may declare an optional effect: function() { return bool; }. */
function afStaleSteps(lessonId) {
  if (!lessonId) return [];
  const lesson = SimEngine.findLesson(lessonId);
  if (!lesson || !lesson.steps) return [];
  const stale = [];
  lesson.steps.forEach(function (step, idx) {
    if (step.type === 'do' && step.checklistId && afStore.checklist[step.checklistId]) {
      if (typeof step.effect === 'function') {
        try {
          if (!step.effect()) {
            stale.push({ step: step, index: idx });
          }
        } catch (e) {
          stale.push({ step: step, index: idx });
        }
      }
    }
  });
  return stale;
}

/* Shown only while a lesson is open. In 1/3 there are no lessons, so this is
   always empty — but the container and the logic exist so 3/3 has somewhere to
   put the walkthrough controls without restructuring the shell. */
function afRenderLessonBanner() {
  const el = document.getElementById('afLessonBanner');
  if (!el) return;
  if (afState.mode !== 'lesson' || !afState.lessonId) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  const lesson = SimEngine.findLesson(afState.lessonId);
  if (!lesson) { el.innerHTML = ''; el.hidden = true; return; }
  el.hidden = false;

  const stale = afStaleSteps(afState.lessonId);
  let staleHTML = '';
  if (stale.length > 0) {
    const firstStale = stale[0];
    staleHTML = '<div class="af-banner-stale">' +
      '<span>' + esc(stale.length === 1 ? '1 step needs to be redone after refresh' : stale.length + ' steps need to be redone after refresh') + '</span>' +
      '<button type="button" class="af-btn sm primary" onclick="afLessonStepNavigate(\'' + escAttr(lesson.id) + '\', ' + firstStale.index + ')">Redo step</button>' +
    '</div>';
  }

  el.innerHTML =
    '<div class="af-banner">' +
      '<div class="af-banner-main">' +
        '<span class="af-banner-tag">Lesson ' + esc(String(lesson.number)) + '</span>' +
        '<b>' + esc(lesson.title) + '</b>' +
      '</div>' +
      staleHTML +
      '<button type="button" class="af-btn sm" onclick="afExitLesson()">Exit lesson</button>' +
    '</div>';
}

const AF_VIEWS = {
  'dashboard':       function () { return afDashboardHTML(); },
  'properties':      function () { return afPropertiesHTML(); },
  'property-detail': function () { return afPropertyDetailHTML(); },
  'unit-detail':     function () { return afUnitDetailHTML(); },
  'residents':       function () { return afResidentsHTML(); },
  'resident-detail': function () { return afResidentDetailHTML(); },
  'owners':          function () { return afOwnersHTML(); },
  'owner-detail':    function () { return afOwnerDetailHTML(); },
  'leasing':         function () { return afLeasingHTML(); },
  'application':     function () { return afApplicationHTML(); },
  'maintenance':     function () { return afMaintenanceHTML(); },
  'work-order':      function () { return afWorkOrderHTML(); },
  'accounting':      function () { return afAccountingHTML(); },
  'communications':  function () { return afCommunicationsHTML(); },
  'reporting':       function () { return afReportingHTML(); },
  'tasks':           function () { return afTasksHTML(); },
  'settings':        function () { return afSettingsHTML(); },
  'lessons':         function () { return afLessonsHTML(); },
  'lesson':          function () { return afLessonDetailHTML(); }
};

function afRenderRoot() {
  const root = document.getElementById('afRoot');
  if (!root) return;
  const view = AF_VIEWS[afState.view];
  /* No view may ever render "view not found". If a route is missing, that is a
     bug to fix, not a state to show a person — so the fallback is an empty
     state that still offers a way out. */
  root.innerHTML = view ? view() : afEmptyState({
    title: 'Nothing here yet',
    body: 'This screen has not been built yet.',
    actionLabel: 'Back to dashboard',
    action: "afGoto('dashboard')"
  });
}

/* Shared empty state. Every list uses it, so an empty screen always has the
   same shape: what belongs here, and the control that would put it there. */
function afEmptyState(o) {
  return '<div class="af-empty">' +
    '<div class="af-empty-icon" aria-hidden="true">' + (o.icon || '') + '</div>' +
    '<h3>' + esc(o.title) + '</h3>' +
    '<p>' + esc(o.body) + '</p>' +
    (o.actionLabel
      ? '<button type="button" class="af-btn primary" onclick="' + o.action + '">' + esc(o.actionLabel) + '</button>'
      : '') +
    '</div>';
}

/* Page header, shared by every section so the title, lede and actions line up
   identically everywhere. */
function afPageHead(title, lede, actions) {
  return '<div class="af-pagehead">' +
    '<div><h1 class="af-page-title">' + esc(title) + '</h1>' +
    (lede ? '<p class="af-page-lede">' + esc(lede) + '</p>' : '') + '</div>' +
    (actions ? '<div class="af-pagehead-actions">' + actions + '</div>' : '') +
    '</div>';
}


/* ============================================================================
   10. CORE VIEWS
   ============================================================================
   Prompt 1/3 builds the routes and the empty states, not the business logic.
   Ledgers that calculate, screening decisions and bank reconciliation are 2/3.
   What matters here is that every section resolves, renders, and offers the
   control that would fill it.
   ============================================================================ */

/* ---------- Dashboard ---------- */
function afDashboardHTML() {
  const units = afAllUnits();
  const occupied = units.filter(function (u) { return u.status === 'occupied'; }).length;
  const vacant = units.filter(function (u) { return u.status.indexOf('vacant') === 0; }).length;
  const openWork = afAllWorkOrders().filter(function (w) {
    return w.status !== 'completed' && w.status !== 'cancelled';
  }).length;
  const openTasks = afAllTasks().filter(function (t) { return t.status === 'open'; }).length;

  /* Occupancy is derived, never stored. Every figure on this screen is counted
     from the entities at render time, so it cannot contradict the lists. */
  const occPct = units.length ? Math.round(occupied / units.length * 100) : 0;

  const tile = function (label, value, sub, view) {
    return '<button type="button" class="af-tile" onclick="afGoto(\'' + view + '\')">' +
      '<span class="af-tile-label">' + esc(label) + '</span>' +
      '<b class="af-tile-value">' + esc(String(value)) + '</b>' +
      '<span class="af-tile-sub">' + esc(sub) + '</span></button>';
  };

  return afPageHead('Dashboard', 'Everything waiting on you across the portfolio, as of ' + afFmtDate(afToday()) + '.') +
    '<div class="af-tiles">' +
      tile('Occupancy', occPct + '%', occupied + ' of ' + units.length + ' units occupied', 'properties') +
      tile('Vacant units', vacant, vacant === 1 ? 'One unit to fill' : 'Units to fill', 'properties') +
      tile('Open work orders', openWork, 'Maintenance in flight', 'maintenance') +
      tile('Open tasks', openTasks, 'On your worklist', 'tasks') +
    '</div>' +
    '<div class="af-cols">' +
      '<section class="af-card"><h3>Needs attention</h3>' +
        afEmptyState({
          title: 'Nothing is overdue',
          body: 'Delinquencies, expiring leases and stalled work orders collect here once the portfolio is loaded.',
          actionLabel: 'Open maintenance',
          action: "afGoto('maintenance')"
        }) +
      '</section>' +
      '<section class="af-card"><h3>Recent activity</h3>' +
        afEmptyState({
          title: 'No activity yet',
          body: 'Payments, move-ins and completed work appear here as they happen.',
          actionLabel: 'Open accounting',
          action: "afGoto('accounting')"
        }) +
      '</section>' +
    '</div>';
}

/* ---------- Properties and units ---------- */
function afPropertiesHTML() {
  const props = afAllProperties();
  const actions = '<button type="button" class="af-btn primary" onclick="afDemoAction(\'Adding a property\')">Add property</button>';

  if (!props.length) {
    return afPageHead('Properties', 'Every building under management.', actions) +
      afEmptyState({
        title: 'No properties yet',
        body: 'A property holds one or more units. Everything else in the system hangs off a unit.',
        actionLabel: 'Add a property',
        action: "afDemoAction('Adding a property')"
      });
  }

  const rows = props.map(function (p) {
    const units = afAllUnits().filter(function (u) { return u.propertyId === p.id; });
    const occ = units.filter(function (u) { return u.status === 'occupied'; }).length;
    return '<tr class="link" onclick="afGoto(\'property-detail\', \'' + escAttr(p.id) + '\')">' +
      '<td><b>' + esc(p.name) + '</b><div class="af-sub">' + esc(p.address) + ', ' + esc(p.city) + ' ' + esc(p.state) + '</div></td>' +
      '<td>' + esc(p.type) + '</td>' +
      '<td class="num">' + units.length + '</td>' +
      '<td class="num">' + occ + ' / ' + units.length + '</td>' +
      '<td>' + (p.ownerIds || []).map(function (id) {
        const o = afGetOwner(id);
        return o ? esc(o.name) : '<span class="af-muted">unknown</span>';
      }).join(', ') + '</td>' +
      '</tr>';
  }).join('');

  return afPageHead('Properties', props.length + ' propert' + (props.length === 1 ? 'y' : 'ies') + ' under management.', actions) +
    '<table class="af-tbl"><thead><tr>' +
      '<th>Property</th><th>Type</th><th class="num">Units</th><th class="num">Occupied</th><th>Owner</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function afPropertyDetailHTML() {
  const p = afGetProperty(afState.activePropertyId);
  if (!p) return afEmptyState({ title: 'Property not found', body: 'It may have been removed in this session.', actionLabel: 'Back to properties', action: "afGoto('properties')" });

  const units = afAllUnits().filter(function (u) { return u.propertyId === p.id; });
  const rows = units.map(function (u) {
    const lease = u.currentLeaseId ? afGetLease(u.currentLeaseId) : null;
    const res = lease && lease.residentIds.length ? afGetResident(lease.residentIds[0]) : null;
    return '<tr class="link" onclick="afGoto(\'unit-detail\', \'' + escAttr(u.id) + '\')">' +
      '<td><b>Unit ' + esc(u.label) + '</b></td>' +
      '<td>' + u.beds + ' bd / ' + u.baths + ' ba</td>' +
      '<td class="num">' + u.sqft + '</td>' +
      '<td><span class="af-badge ' + escAttr(u.status) + '">' + esc(afUnitStatusLabel(u.status)) + '</span></td>' +
      '<td>' + (res ? esc(res.firstName + ' ' + res.lastName) : '<span class="af-muted">Vacant</span>') + '</td>' +
      '<td class="num">' + afFmtMoney(lease ? lease.rentAmount : u.marketRent) + '</td>' +
      '</tr>';
  }).join('');

  return '<button type="button" class="af-backlink" onclick="afGoto(\'properties\')">&larr; Properties</button>' +
    afPageHead(p.name, p.address + ', ' + p.city + ', ' + p.state + ' ' + p.zip,
      '<button type="button" class="af-btn" onclick="afDemoAction(\'Editing a property\')">Edit</button>') +
    '<table class="af-tbl"><thead><tr>' +
      '<th>Unit</th><th>Layout</th><th class="num">Sq ft</th><th>Status</th><th>Resident</th><th class="num">Rent</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function afUnitStatusLabel(s) {
  return {
    'occupied': 'Occupied', 'vacant-ready': 'Vacant — ready',
    'vacant-rehab': 'Vacant — rehab', 'notice': 'On notice'
  }[s] || s;
}

function afUnitDetailHTML() {
  const u = afGetUnit(afState.activeUnitId);
  if (!u) return afEmptyState({ title: 'Unit not found', body: 'It may have been removed in this session.', actionLabel: 'Back to properties', action: "afGoto('properties')" });
  const p = afGetProperty(u.propertyId);
  const lease = u.currentLeaseId ? afGetLease(u.currentLeaseId) : null;

  return '<button type="button" class="af-backlink" onclick="afGoto(\'property-detail\', \'' + escAttr(u.propertyId) + '\')">&larr; ' + esc(p ? p.name : 'Property') + '</button>' +
    afPageHead('Unit ' + u.label, (p ? p.address + ' · ' : '') + u.beds + ' bd / ' + u.baths + ' ba · ' + u.sqft + ' sq ft') +
    '<div class="af-kv">' +
      '<div><dt>Status</dt><dd>' + esc(afUnitStatusLabel(u.status)) + '</dd></div>' +
      '<div><dt>Market rent</dt><dd>' + afFmtMoney(u.marketRent) + '</dd></div>' +
      '<div><dt>Current rent</dt><dd>' + (lease ? afFmtMoney(lease.rentAmount) : '—') + '</dd></div>' +
      '<div><dt>Lease ends</dt><dd>' + (lease ? afFmtDate(lease.endDate) : '—') + '</dd></div>' +
      '<div><dt>Last renovated</dt><dd>' + afFmtDate(u.lastRenovated) + '</dd></div>' +
    '</div>' +
    '<section class="af-card"><h3>Ledger</h3>' +
      afEmptyState({ title: 'The ledger arrives with the portfolio', body: 'Charges, payments and running balances are built in the next stage.', actionLabel: 'Open accounting', action: "afGoto('accounting')" }) +
    '</section>';
}

/* ---------- Residents ---------- */
function afResidentsHTML() {
  const list = afAllResidents();
  const actions = '<button type="button" class="af-btn primary" onclick="afDemoAction(\'Adding a resident\')">Add resident</button>';
  if (!list.length) {
    return afPageHead('Residents', 'Everyone living in the portfolio.', actions) +
      afEmptyState({ title: 'No residents yet', body: 'Residents arrive through a signed lease.', actionLabel: 'Open leasing', action: "afGoto('leasing')" });
  }
  const rows = list.map(function (r) {
    const lease = afAllLeases().find(function (l) { return (l.residentIds || []).indexOf(r.id) > -1; });
    const unit = lease ? afGetUnit(lease.unitId) : null;
    return '<tr class="link" onclick="afGoto(\'resident-detail\', \'' + escAttr(r.id) + '\')">' +
      '<td><b>' + esc(r.firstName + ' ' + r.lastName) + '</b><div class="af-sub">' + esc(r.email) + '</div></td>' +
      '<td>' + esc(r.type) + '</td>' +
      '<td>' + (unit ? esc('Unit ' + unit.label) : '<span class="af-muted">—</span>') + '</td>' +
      '<td>' + afFmtDate(r.moveInDate) + '</td>' +
      '<td>' + (r.portalActive ? 'Active' : 'Not activated') + '</td>' +
      '</tr>';
  }).join('');
  return afPageHead('Residents', list.length + ' resident' + (list.length === 1 ? '' : 's') + ' across the portfolio.', actions) +
    '<table class="af-tbl"><thead><tr><th>Resident</th><th>Type</th><th>Unit</th><th>Moved in</th><th>Portal</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function afResidentDetailHTML() {
  const r = afGetResident(afState.activeResidentId);
  if (!r) return afEmptyState({ title: 'Resident not found', body: 'They may have been removed in this session.', actionLabel: 'Back to residents', action: "afGoto('residents')" });
  return '<button type="button" class="af-backlink" onclick="afGoto(\'residents\')">&larr; Residents</button>' +
    afPageHead(r.firstName + ' ' + r.lastName, r.email + ' · ' + r.phone) +
    '<div class="af-kv">' +
      '<div><dt>Type</dt><dd>' + esc(r.type) + '</dd></div>' +
      '<div><dt>Moved in</dt><dd>' + afFmtDate(r.moveInDate) + '</dd></div>' +
      '<div><dt>Portal</dt><dd>' + (r.portalActive ? 'Active' : 'Not activated') + '</dd></div>' +
      '<div><dt>Pets</dt><dd>' + ((r.pets || []).length ? esc(r.pets.map(function (p) { return p.name + ' (' + p.type + ')'; }).join(', ')) : 'None') + '</dd></div>' +
      /* Separate from pets on purpose: an assistance animal is not a pet under
         fair housing, cannot be charged pet rent, and cannot be refused under a
         no-pets policy. A later lesson is graded on that distinction. */
      '<div><dt>Assistance animal</dt><dd>' + (r.assistanceAnimal ? 'Yes — not a pet' : 'No') + '</dd></div>' +
    '</div>';
}

/* ---------- Owners ---------- */
function afOwnersHTML() {
  const list = afAllOwners();
  const actions = '<button type="button" class="af-btn primary" onclick="afDemoAction(\'Adding an owner\')">Add owner</button>';
  if (!list.length) {
    return afPageHead('Owners', 'The people whose property you manage.', actions) +
      afEmptyState({ title: 'No owners yet', body: 'An owner holds one or more properties and receives a statement each period.', actionLabel: 'Add an owner', action: "afDemoAction('Adding an owner')" });
  }
  const rows = list.map(function (o) {
    return '<tr class="link" onclick="afGoto(\'owner-detail\', \'' + escAttr(o.id) + '\')">' +
      '<td><b>' + esc(o.name) + '</b><div class="af-sub">' + esc(o.email) + '</div></td>' +
      '<td>' + esc(o.type) + '</td>' +
      '<td class="num">' + (o.propertyIds || []).length + '</td>' +
      '<td class="num">' + afFmtMoney(o.reserveAmount) + '</td>' +
      '</tr>';
  }).join('');
  return afPageHead('Owners', list.length + ' owner' + (list.length === 1 ? '' : 's') + '.', actions) +
    '<table class="af-tbl"><thead><tr><th>Owner</th><th>Type</th><th class="num">Properties</th><th class="num">Reserve</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function afOwnerDetailHTML() {
  const o = afGetOwner(afState.activeOwnerId);
  if (!o) return afEmptyState({ title: 'Owner not found', body: 'They may have been removed in this session.', actionLabel: 'Back to owners', action: "afGoto('owners')" });
  return '<button type="button" class="af-backlink" onclick="afGoto(\'owners\')">&larr; Owners</button>' +
    afPageHead(o.name, o.email + ' · ' + o.phone) +
    '<div class="af-kv">' +
      '<div><dt>Type</dt><dd>' + esc(o.type) + '</dd></div>' +
      '<div><dt>Reserve held</dt><dd>' + afFmtMoney(o.reserveAmount) + '</dd></div>' +
      '<div><dt>Distribution</dt><dd>' + esc(o.distributionMethod) + '</dd></div>' +
      '<div><dt>Properties</dt><dd>' + (o.propertyIds || []).map(function (id) {
        const p = afGetProperty(id);
        return p ? esc(p.name) : '<span class="af-muted">unknown</span>';
      }).join(', ') + '</dd></div>' +
    '</div>';
}

/* ---------- Leasing ---------- */
function afLeasingHTML() {
  const apps = afAllApplications();
  const cards = afAllGuestCards();
  const vacant = afAllUnits().filter(function (u) { return u.status.indexOf('vacant') === 0; });

  const appRows = apps.map(function (a) {
    const u = afGetUnit(a.unitId);
    return '<tr class="link" onclick="afGoto(\'application\', \'' + escAttr(a.id) + '\')">' +
      '<td><b>' + esc(a.applicantName) + '</b><div class="af-sub">' + esc(a.email) + '</div></td>' +
      '<td>' + (u ? esc('Unit ' + u.label) : '<span class="af-muted">—</span>') + '</td>' +
      '<td>' + afFmtDate(a.submittedDate) + '</td>' +
      '<td><span class="af-badge ' + escAttr(a.status) + '">' + esc(a.status) + '</span></td>' +
      '<td class="num">' + afFmtMoney(a.monthlyIncome) + '</td>' +
      '</tr>';
  }).join('');

  return afPageHead('Leasing',
      vacant.length + ' vacant unit' + (vacant.length === 1 ? '' : 's') + ' · ' +
      cards.length + ' guest card' + (cards.length === 1 ? '' : 's') + ' · ' +
      apps.length + ' application' + (apps.length === 1 ? '' : 's') + '.',
      '<button type="button" class="af-btn primary" onclick="afDemoAction(\'Creating a listing\')">New listing</button>') +
    '<section class="af-card"><h3>Applications</h3>' +
      (apps.length
        ? '<table class="af-tbl"><thead><tr><th>Applicant</th><th>Unit</th><th>Submitted</th><th>Status</th><th class="num">Monthly income</th></tr></thead><tbody>' + appRows + '</tbody></table>'
        : afEmptyState({ title: 'No applications', body: 'Applications arrive from a listing or a guest card.', actionLabel: 'Create a listing', action: "afDemoAction('Creating a listing')" })) +
    '</section>';
}

function afApplicationHTML() {
  const a = afGetApplication(afState.activeApplicationId);
  if (!a) return afEmptyState({ title: 'Application not found', body: 'It may have been withdrawn in this session.', actionLabel: 'Back to leasing', action: "afGoto('leasing')" });
  const u = afGetUnit(a.unitId);
  return '<button type="button" class="af-backlink" onclick="afGoto(\'leasing\')">&larr; Leasing</button>' +
    afPageHead(a.applicantName, 'Applied ' + afFmtDate(a.submittedDate) + (u ? ' for unit ' + u.label : '')) +
    '<div class="af-kv">' +
      '<div><dt>Status</dt><dd>' + esc(a.status) + '</dd></div>' +
      '<div><dt>Monthly income</dt><dd>' + afFmtMoney(a.monthlyIncome) + '</dd></div>' +
      '<div><dt>Employment</dt><dd>' + (a.employmentVerified ? 'Verified' : 'Not verified') + '</dd></div>' +
      '<div><dt>Credit score</dt><dd>' + (a.screening ? a.screening.creditScore : '—') + '</dd></div>' +
      /* A denial without this notice is an FCRA failure, so it is on the summary
         rather than buried where nobody would look for it. */
      '<div><dt>Adverse action</dt><dd>' + (a.adverseActionSent ? 'Sent' : 'Not sent') + '</dd></div>' +
    '</div>' +
    '<section class="af-card"><h3>Decision</h3>' +
      afEmptyState({ title: 'Screening decisions arrive later', body: 'Approve, conditional and deny — with the adverse action notice a denial requires — are built in the next stage.', actionLabel: 'Back to leasing', action: "afGoto('leasing')" }) +
    '</section>';
}

/* ---------- Maintenance ---------- */
function afMaintenanceHTML() {
  const list = afAllWorkOrders();
  const actions = '<button type="button" class="af-btn primary" onclick="afDemoAction(\'Creating a work order\')">New work order</button>';
  if (!list.length) {
    return afPageHead('Maintenance', 'Work orders across the portfolio.', actions) +
      afEmptyState({ title: 'No work orders', body: 'A work order ties a unit, a vendor and a bill-to decision together.', actionLabel: 'Create one', action: "afDemoAction('Creating a work order')" });
  }
  const rows = list.map(function (w) {
    const u = afGetUnit(w.unitId);
    const v = w.vendorId ? afGetVendor(w.vendorId) : null;
    return '<tr class="link" onclick="afGoto(\'work-order\', \'' + escAttr(w.id) + '\')">' +
      '<td><b>' + esc(w.description.slice(0, 60)) + '</b><div class="af-sub">' + esc(w.id) + '</div></td>' +
      '<td>' + (u ? esc('Unit ' + u.label) : '<span class="af-muted">—</span>') + '</td>' +
      '<td>' + esc(w.category) + '</td>' +
      '<td><span class="af-badge ' + escAttr(w.priority) + '">' + esc(w.priority) + '</span></td>' +
      '<td><span class="af-badge ' + escAttr(w.status) + '">' + esc(w.status) + '</span></td>' +
      '<td>' + (v ? esc(v.name) : '<span class="af-muted">Unassigned</span>') + '</td>' +
      '</tr>';
  }).join('');
  return afPageHead('Maintenance', list.length + ' work order' + (list.length === 1 ? '' : 's') + '.', actions) +
    '<table class="af-tbl"><thead><tr><th>Issue</th><th>Unit</th><th>Category</th><th>Priority</th><th>Status</th><th>Vendor</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function afWorkOrderHTML() {
  const w = afGetWorkOrder(afState.activeWorkOrderId);
  if (!w) return afEmptyState({ title: 'Work order not found', body: 'It may have been cancelled in this session.', actionLabel: 'Back to maintenance', action: "afGoto('maintenance')" });
  const u = afGetUnit(w.unitId);
  const v = w.vendorId ? afGetVendor(w.vendorId) : null;
  return '<button type="button" class="af-backlink" onclick="afGoto(\'maintenance\')">&larr; Maintenance</button>' +
    afPageHead(w.id, (u ? 'Unit ' + u.label + ' · ' : '') + w.category + ' · reported ' + afFmtDate(w.reportedDate)) +
    '<p class="af-page-lede">' + esc(w.description) + '</p>' +
    '<div class="af-kv">' +
      '<div><dt>Status</dt><dd>' + esc(w.status) + '</dd></div>' +
      '<div><dt>Priority</dt><dd>' + esc(w.priority) + '</dd></div>' +
      '<div><dt>Vendor</dt><dd>' + (v ? esc(v.name) : 'Unassigned') + '</dd></div>' +
      '<div><dt>Scheduled</dt><dd>' + afFmtDate(w.scheduledDate) + '</dd></div>' +
      '<div><dt>Estimate</dt><dd>' + afFmtMoney(w.estimate) + '</dd></div>' +
      /* Who pays decides which ledger and which owner statement this lands in,
         which is why it sits on the summary and not in a detail panel. */
      '<div><dt>Bill to</dt><dd>' + esc(w.billTo) + '</dd></div>' +
      '<div><dt>Entry notice</dt><dd>' + (w.entryNotice ? 'Given' : 'Not given') + '</dd></div>' +
    '</div>';
}

/* ---------- Tasks ---------- */
function afTasksHTML() {
  const list = afAllTasks();
  const actions = '<button type="button" class="af-btn primary" onclick="afDemoAction(\'Creating a task\')">New task</button>';
  if (!list.length) {
    return afPageHead('Tasks', 'Your worklist.', actions) +
      afEmptyState({ title: 'Nothing on your list', body: 'A task can stand alone or hang off a work order, an application or a lease.', actionLabel: 'Create a task', action: "afDemoAction('Creating a task')" });
  }
  const rows = list.map(function (t) {
    const due = afDaysFromToday(t.dueDate);
    return '<tr>' +
      '<td><b>' + esc(t.title) + '</b><div class="af-sub">' + esc(t.notes || '') + '</div></td>' +
      '<td>' + esc(t.priority) + '</td>' +
      '<td>' + afFmtDate(t.dueDate) + '<div class="af-sub">' +
        (due === 0 ? 'Today' : due < 0 ? Math.abs(due) + ' days overdue' : 'In ' + due + ' days') +
      '</div></td>' +
      '<td><button type="button" class="af-btn sm" onclick="afDemoAction(\'Completing a task\')">Complete</button></td>' +
      '</tr>';
  }).join('');
  return afPageHead('Tasks', list.length + ' open task' + (list.length === 1 ? '' : 's') + '.', actions) +
    '<table class="af-tbl"><thead><tr><th>Task</th><th>Priority</th><th>Due</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
}

/* ---------- Lessons ---------- */
function afLessonsHTML() {
  if (!AF_LESSONS.length) {
    return afPageHead('Lessons', 'The property management course.') +
      afEmptyState({
        title: 'The course is not loaded yet',
        body: 'Lessons arrive in the final stage of this build. The engine is already wired, so this screen fills itself once the curriculum exists.',
        actionLabel: 'Back to dashboard',
        action: "afGoto('dashboard')"
      });
  }
  return afPageHead('Lessons', AF_LESSONS.length + ' lessons.') +
    '<div class="af-lesson-grid">' + AF_LESSONS.map(function (l, i) {
      const state = SimEngine.lessonState(i);
      const prog = SimEngine.progress(l);
      return '<button type="button" class="af-lesson' + (state === 'locked' ? ' locked' : '') + '"' +
        (state === 'locked' ? ' disabled' : ' onclick="afGoto(\'lesson\', \'' + escAttr(l.id) + '\')"') + '>' +
        '<span class="af-lesson-num">Lesson ' + l.number + '</span>' +
        '<b>' + esc(l.title) + '</b>' +
        '<span class="af-lesson-sub">' + esc(l.summary || '') + '</span>' +
        '<span class="af-lesson-prog">' + prog.done + ' / ' + prog.total + '</span>' +
        '</button>';
    }).join('') + '</div>';
}

function afLessonDetailHTML() {
  const l = SimEngine.findLesson(afState.lessonId);
  if (!l) return afEmptyState({ title: 'Lesson not found', body: 'The curriculum has not been loaded yet.', actionLabel: 'Back to lessons', action: "afGoto('lessons')" });
  return SimEngine.lessonDetailHTML(l);
}


/* ============================================================================
   11. LESSON CALLBACKS
   ============================================================================
   Minimal and correct against an empty curriculum. Prompt 3/3 fills the bodies
   that need filling; it should not have to rewrite these signatures.

   Note what none of these do: read afDemo. Grading reads afStore only. What
   gets written to a product entity is always the visible consequence of an
   answer already scored, never an input to the score.
   ============================================================================ */

function afLessonStepDone(step) {
  if (!step) return false;
  if (step.type === 'do')        return !!afStore.checklist[step.checklistId];
  if (step.type === 'decide')    return !!(afStore.scenarios[step.scenarioId] || {}).correct;
  if (step.type === 'verify')    return !!(afStore.reviews[step.reviewId] || {}).correct;
  if (step.type === 'reconcile') return !!(afStore.reconciles[step.reconcileId] || {}).correct;
  if (step.type === 'compose')   return !!(afStore.composes[step.composeId] || {}).passed;
  if (step.type === 'triage')    return !!(afStore.triages[step.triageId] || {}).correct;
  return false;
}

function afLessonStepLabel(step) {
  if (!step) return '';
  return {
    do: 'Do it', decide: 'Decide', verify: 'Verify',
    reconcile: 'Reconcile', compose: 'Write it', triage: 'Triage'
  }[step.type] || step.type;
}

function afLessonStepStatus(step) {
  return afLessonStepDone(step) ? 'done' : 'todo';
}

function afLessonStepNavigate(step) {
  if (!step) return;
  if (step.view) afGoto(step.view, step.viewArg);
}

function afLessonEverComplete(lessonId) {
  return !!afStore.lessonsDone[lessonId];
}

function afNoteLessonComplete(lessonId) {
  if (afState.mode !== 'lesson') return;
  if (afStore.lessonsDone[lessonId]) return;
  afStore.lessonsDone[lessonId] = true;
  afSave();
}

function afResetLesson(lessonId) {
  const l = SimEngine.findLesson(lessonId);
  if (!l) return;
  l.steps.forEach(function (step) {
    if (step.type === 'do' && step.checklistId) delete afStore.checklist[step.checklistId];
    if (step.type === 'decide' && step.scenarioId) delete afStore.scenarios[step.scenarioId];
    if (step.type === 'verify' && step.reviewId) delete afStore.reviews[step.reviewId];
    if (step.type === 'reconcile' && step.reconcileId) delete afStore.reconciles[step.reconcileId];
    if (step.type === 'compose' && step.composeId) delete afStore.composes[step.composeId];
    if (step.type === 'triage' && step.triageId) delete afStore.triages[step.triageId];
  });
  afSave();
  simToast('Lesson ' + l.number + ' restarted.', { tone: 'good' });
}

/* Told to the engine when a graded step completes, so a running walkthrough can
   advance without polling for it. */
function afNotifyStepDone(id) {
  if (!SimEngine.walkActive || !SimEngine.walkActive()) return;
  const step = SimEngine.currentStep();
  if (step && step.type === 'do' && step.checklistId === id) SimEngine.stepCompleted();
}

function afNotifyAnswerRecorded(bucket, id) {
  if (!SimEngine.walkActive || !SimEngine.walkActive()) return;
  const step = SimEngine.currentStep();
  if (!step) return;
  const match = (bucket === 'scenarios' && step.scenarioId === id) ||
                (bucket === 'reviews' && step.reviewId === id) ||
                (bucket === 'reconciles' && step.reconcileId === id) ||
                (bucket === 'composes' && step.composeId === id) ||
                (bucket === 'triages' && step.triageId === id);
  if (match) SimEngine.stepCompleted();
}

function afInitEngine() {
  SimEngine.init({
    lessons: AF_LESSONS,
    store: function () { return afStore; },
    save: afSave,
    render: afRenderRoot,
    goHome: function () { afGoto('dashboard'); },
    showLesson: function (id) { afGoto('lesson', id); },
    currentLessonId: function () { return afState.lessonId; },
    navigate: afLessonStepNavigate,
    stepDone: afLessonStepDone,
    stepLabel: afLessonStepLabel,
    stepStatus: afLessonStepStatus,
    selfFeedbackTypes: ['decide', 'verify', 'reconcile', 'compose', 'triage'],
    feedbackSelector: '.af-feedback, .sim-feedback',
    scrollSelector: '.af-body',
    beforeStep: function () {},
    lessonEverComplete: afLessonEverComplete,
    noteLessonComplete: afNoteLessonComplete,
    resetLesson: afResetLesson,
    btnClass: 'af-btn'
  });
}


/* ============================================================================
   12. BOOT
   ============================================================================ */

function afToggleSidebar(force) {
  const shell = document.querySelector('.af-shell');
  if (!shell) return;
  afState.sidebarOpen = typeof force === 'boolean' ? force : !afState.sidebarOpen;
  shell.classList.toggle('nav-open', afState.sidebarOpen);
}

function afApplyDemoMode() {
  if (!afDemoMode()) return;
  /* Class-driven rather than by removing nodes, because the chrome is repainted
     on every navigation and deleted nodes would simply come back. */
  document.body.classList.add('af-demo');
  afState.mode = 'sandbox';
}

document.addEventListener('DOMContentLoaded', function () {
  afLoad();
  afInitEngine();
  afApplyDemoMode();
  afRenderChrome();
  afRenderRoot();
});
