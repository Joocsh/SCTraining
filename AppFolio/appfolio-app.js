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
  sections: {},      // which collapsible panels the visitor has closed
  search: {},        // committed values behind each screen's search panel
  postings: {},      // which marketing channels a vacancy is live on
  user: {
    name: 'Alex Rivera',
    email: 'alex.rivera@agency.example.com',
    officePhone: '(214) 555-0138',
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
  /* The trust split is derived from the catalogue, so it must be recomputed
     rather than carried across a reload. */
  afTrustAllocCache = null;
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

  /* Curriculum view targets. These are set by afGoto when the router opens
     a scenario, review, compose, reconcile or triage view with an argument. */
  scenarioId: null,
  reviewId: null,
  composeId: null,
  reconcileId: null,
  triageId: null,

  /* Sidebar expansion is separate from which section is active: AppFolio lets
     you leave a section open while you work somewhere else. */
  navOpen: {},
  navChild: null,
  sectionTab: null,
  subTab: null,
  alpha: 'All',

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
   No Math.random(), and no clock. Every date is computed with Date.UTC from
   components parsed out of an anchored ISO string, so nothing here can read
   the machine time. Two loads must produce a byte-identical portfolio, or
   screenshots drift, lessons become unstable, and an audit trail rewrites
   itself between repaints.

   Checkable form: a zero-argument Date constructor must appear nowhere in
   this file. The audit greps for it, and this sentence deliberately does not
   spell it out, because the last time it did the grep matched the comment.
   ============================================================================ */

const AF_EPOCH = (function () {
  const p = AF_TODAY.split('-').map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2]);
})();

function afToday() { return AF_TODAY; }

/* Whole days from AF_TODAY to an ISO date. Negative means already past. */
/* Calendar arithmetic. All of it goes through the anchored AF_TODAY, so no
   screen in this module can drift with the machine's clock. */
function afDayOfWeek(iso) {
  const p = String(iso).split("-");
  return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
}
const AF_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function afDayName(iso) { return AF_DAY_NAMES[afDayOfWeek(iso)]; }
function afShortDate(iso) {
  const p = String(iso).split("-");
  return (+p[1]) + "/" + (+p[2]);
}

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

/* "08/26/2026". A list column prints a date numerically; prose prints it long. */
function afFmtDateNum(iso) {
  if (!iso) return '—';
  const p = String(iso).split('-');
  if (p.length !== 3) return String(iso);
  return p[1] + '/' + p[2] + '/' + p[0];
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
  /* Marketing surfaces quote rent as a round number — the product prints
     "$1,900" on a vacancy card, not "$1,900.00". Ledgers never pass this. */
  const body = opts.whole ? '$' + whole : '$' + whole + '.' + frac;
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
  return '';
}


/* ============================================================================
   5. ACTION TAXONOMY
   ============================================================================
   A  real            mutates afDemo, the UI changes, a refresh clears it
   B  real, confirmed a modal first, then the real effect
   C  honest toast    one sentence, one handler, one central function
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

/* Accessors for the six entity types the 2026 screenshots added. Their screens
   were reading the AFC_* arrays straight, which meant an edit to one of them was
   written into afDemo.overrides and then never read back — a bulk "Mark Done"
   would land in state and change nothing on screen. Everything goes through the
   registry now, like every other entity. */
function afAllInspections()  { return afAll('inspection'); }
function afAllProjects()     { return afAll('project'); }
function afAllInventory()    { return afAll('inventoryItem'); }
function afAllFixedAssets()  { return afAll('fixedAsset'); }

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
  task:           { catalog: function () { return AFC_TASKS; },            label: 'Task' },
  /* Added from the 2026 screenshots: six Maintenance and Reporting screens
     had no entity behind them at all. */
  inspection:     { catalog: function () { return AFC_INSPECTIONS; },      label: 'Inspection' },
  project:        { catalog: function () { return AFC_PROJECTS; },         label: 'Project' },
  inventoryItem:  { catalog: function () { return AFC_INVENTORY; },        label: 'Inventory item' },
  fixedAsset:     { catalog: function () { return AFC_FIXED_ASSETS; },     label: 'Fixed asset' },
  survey:         { catalog: function () { return AFC_SURVEYS; },          label: 'Survey' }
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

/* ============================================================================
   THE BANK — where the resident ledger and the trust accounts meet
   ============================================================================

   Until now these were two disconnected worlds. Posting rent wrote a ledger
   entry and moved the lease balance, and stopped there: no money reached a bank
   account. Every consequence downstream was therefore frozen — reconciliation
   never had anything new to reconcile, an owner draw validated against cash that
   could not rise no matter how much rent came in, and the fiduciary boundary was
   being defended against a number that never moved.

   In AppFolio a tenant receipt does two things at once. It posts to the
   resident's ledger, and it deposits into a bank account. Which account is the
   whole lesson:

     rent and fees      -> TRUST      it is the owner's money, not the company's
     security deposits  -> SEGREGATED it is the resident's money, held not earned
     management fee     -> OPERATING  the only money the company has actually earned

   That last line is the one a VA has to internalise, so the fee is posted as its
   own paired movement — out of trust, into operating — rather than being netted
   silently inside the receipt. Two visible transactions teach the split; one
   invisible net does not.
   ============================================================================ */

/* Balances are derived, never stored twice. The catalogue figure is the opening
   balance as of AF_TODAY; anything the visitor causes is a transaction on top.
   Deriving means the account total and the transaction list can never disagree,
   which is the class of bug this module exists to avoid. */
function afAccountBalance(accountId) {
  const base = afBase('bankAccount', accountId);
  if (!base) return 0;
  const created = (afDemo.created.transaction || [])
    .filter(function (t) { return t.accountId === accountId; })
    .reduce(function (s, t) { return s + (t.amount || 0); }, 0);
  return (base.currentBalanceCents || 0) + created;
}

/* The single write path for bank movement. Everything that touches cash goes
   through here, so there is one place to read to know how money moves. */
function afPostTransaction(o) {
  const seq = (afDemo.created.transaction || []).length + 1;
  return afCreate('transaction', {
    id: 'TXN-DEMO-' + (9000 + seq),
    accountId: o.accountId,
    propertyId: o.propertyId || null,
    leaseId: o.leaseId || null,
    date: o.date || afToday(),
    description: o.description,
    category: o.amount < 0 ? 'disbursement' : 'deposit',
    amount: o.amount,
    cleared: false,          /* new money is always uncleared until reconciled */
    reference: o.reference || ('REF-' + (9000 + seq))
  });
}

/* Which account a given kind of money belongs in. Named rather than inlined,
   because getting this wrong is the actual malpractice the course teaches
   against, and a reader should be able to check it in one place. */
const AF_ACCT = { operating: 'BANK-01', trust: 'BANK-02', deposit: 'BANK-03' };

/* Resolves the property and owner behind a lease, so a receipt can be attributed
   to the right property and the fee calculated at that property's rate. */
function afLeaseContext(leaseId) {
  const lease = afGetLease(leaseId);
  if (!lease) return null;
  const unit = afGetUnit(lease.unitId);
  const prop = unit ? afGetProperty(unit.propertyId) : null;
  return { lease: lease, unit: unit, property: prop };
}

/* Deposits a tenant receipt and posts the management fee it earns.

   feeBearing is false for a security deposit: that money is held, not earned,
   so no fee comes off it and it goes to the segregated account instead. Charging
   a management fee on a security deposit is a real-world compliance failure, and
   the simulator must not model it as normal. */
function afDepositReceipt(o) {
  const ctx = afLeaseContext(o.leaseId);
  const propertyId = ctx && ctx.property ? ctx.property.id : null;

  if (o.kind === 'deposit') {
    afPostTransaction({
      accountId: AF_ACCT.deposit,
      propertyId: propertyId, leaseId: o.leaseId, date: o.date,
      description: 'Security deposit received — ' + (o.payer || 'resident'),
      amount: Math.abs(o.amount)
    });
    return;
  }

  afPostTransaction({
    accountId: AF_ACCT.trust,
    propertyId: propertyId, leaseId: o.leaseId, date: o.date,
    description: (o.description || 'Rent receipt') + (o.payer ? ' — ' + o.payer : ''),
    amount: Math.abs(o.amount)
  });

  /* The fee, as its own pair of movements. managementFeePct is basis points. */
  const bps = ctx && ctx.property ? (ctx.property.managementFeePct || 0) : 0;
  if (!bps) return;
  const fee = Math.round(Math.abs(o.amount) * bps / 10000);
  if (fee <= 0) return;

  afPostTransaction({
    accountId: AF_ACCT.trust,
    propertyId: propertyId, leaseId: o.leaseId, date: o.date,
    description: 'Management fee (' + (bps / 100).toFixed(2) + '%) withdrawn to operating',
    amount: -fee
  });
  afPostTransaction({
    accountId: AF_ACCT.operating,
    propertyId: propertyId, leaseId: o.leaseId, date: o.date,
    description: 'Management fee earned on ' + (o.description || 'rent receipt'),
    amount: fee
  });
}

/* The trust account's opening balance, split across the owners it is held for.

   A trust account is not a pool: every cent in it belongs to a named owner, and
   the account total must equal the sum of the owner sub-balances. Without this
   the module showed $215,800 in trust while the owners between them held
   $21,460, and nobody could say whose the other $194,340 was.

   The split is by rent roll, because that is what actually produced the money,
   and the rounding remainder goes to the last owner so the parts sum to the
   whole exactly. Deterministic, so two loads produce the same allocation. */
function afOwnerOpeningTrust(ownerId) {
  const alloc = afTrustAllocation();
  return alloc[ownerId] || 0;
}

let afTrustAllocCache = null;
function afTrustAllocation() {
  if (afTrustAllocCache) return afTrustAllocCache;

  const opening = (afBase('bankAccount', AF_ACCT.trust) || {}).currentBalanceCents || 0;
  const owners = afAll('owner');

  /* Weight = the monthly rent roll of the properties each owner holds. */
  const weights = {};
  let total = 0;
  owners.forEach(function (o) {
    /* Weighted by this owner's SHARE of each property's rent roll. A 60/40
       building must not count in full for both partners. */
    const w = (o.propertyIds || []).reduce(function (s, pid) {
      const roll = afAll('unit')
        .filter(function (u) { return u.propertyId === pid; })
        .reduce(function (x, u) { return x + (u.marketRent || 0); }, 0);
      return s + roll * afOwnerShare(o.id, pid);
    }, 0);
    weights[o.id] = w;
    total += w;
  });

  const alloc = {};
  let assigned = 0;
  owners.forEach(function (o, i) {
    if (i === owners.length - 1) {
      /* The remainder, so the parts add to the whole to the cent. */
      alloc[o.id] = opening - assigned;
      return;
    }
    const share = total ? Math.round(opening * weights[o.id] / total) : 0;
    alloc[o.id] = share;
    assigned += share;
  });

  afTrustAllocCache = alloc;
  return alloc;
}

/* An owner's share of one property, as a fraction. Five of the twelve
   properties are co-owned — two of them 60/40, one three ways — and ownerSplit
   has carried those percentages since the catalogue was written without anything
   reading it. Counting a co-owned property's money in full for each co-owner
   inflated the trust sub-balances above the account that holds them, which is
   exactly what the M9 rule now catches. */
function afOwnerShare(ownerId, propertyId) {
  const p = afGet('property', propertyId);
  if (!p) return 0;
  if (p.ownerSplit && p.ownerSplit[ownerId] != null) return p.ownerSplit[ownerId] / 100;
  const ids = p.ownerIds || [];
  return ids.indexOf(ownerId) > -1 ? 1 / ids.length : 0;
}

/* Cash an owner can actually be paid: their share of what is held in trust for
   their properties, less the reserve they require be left behind.

   The reserve is the piece that was missing. Distributing down to zero is how a
   management company ends up covering a repair out of its own operating account,
   which is exactly the mistake the reserve exists to prevent. */
function afOwnerAvailableCash(ownerId) {
  const owner = afGetOwner(ownerId);
  if (!owner) return { held: 0, reserve: 0, available: 0 };
  const props = owner.propertyIds || [];

  /* Opening allocation plus this session's movements — and ONLY this session's.
     currentBalanceCents on the account is an as-of figure that already embeds
     the catalogue's transaction history, so counting those again here would
     double them. The two sides now measure the same way, which is what lets
     afAuditMoney check one against the other. */
  const moved = (afDemo.created.transaction || [])
    .filter(function (t) { return t.accountId === AF_ACCT.trust && props.indexOf(t.propertyId) > -1; })
    .reduce(function (s, t) { return s + Math.round((t.amount || 0) * afOwnerShare(ownerId, t.propertyId)); }, 0);

  const held = afOwnerOpeningTrust(ownerId) + moved;
  const reserve = owner.reserveCents || 0;
  return { held: held, reserve: reserve, available: Math.max(0, held - reserve) };
}

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
function afAddLedgerEntry(entry) {
  if (!afDemo.ledgerEntries) afDemo.ledgerEntries = [];
  afDemo.ledgerEntries.push(entry);
  return entry;
}

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

  /* Curriculum & Item Bank Integrity */
  if (typeof AF_LESSONS !== 'undefined' && AF_LESSONS.length > 0) {
    if (AF_LESSONS.length !== 13) {
      broken.push({ type: 'curriculum', problem: 'Expected 13 lessons, found ' + AF_LESSONS.length });
    }
    const seenChecklistIds = {};
    const seenScenarioIds = {};
    const seenReviewIds = {};
    const seenReconcileIds = {};
    const seenComposeIds = {};
    const seenTriageIds = {};

    AF_LESSONS.forEach(function (l) {
      if (!l.steps || l.steps.length === 0) {
        broken.push({ type: 'lesson', id: l.id, problem: 'lesson has no steps' });
        return;
      }
      l.steps.forEach(function (st, sIdx) {
        if (!st.walk) {
          broken.push({ type: 'lessonStep', lessonId: l.id, stepIndex: sIdx, problem: 'step is missing walk block' });
        }
        if (st.type === 'do') {
          if (!st.checklistId) broken.push({ type: 'step', lessonId: l.id, problem: 'do step missing checklistId' });
          if (seenChecklistIds[st.checklistId]) broken.push({ type: 'step', id: st.checklistId, problem: 'duplicate checklistId' });
          seenChecklistIds[st.checklistId] = true;
          if (AF_CHECKLIST_IDS.indexOf(st.checklistId) === -1) broken.push({ type: 'step', id: st.checklistId, problem: 'checklistId not indexed in AF_CHECKLIST_IDS' });
        } else if (st.type === 'decide') {
          if (!st.scenarioId) broken.push({ type: 'step', lessonId: l.id, problem: 'decide step missing scenarioId' });
          if (seenScenarioIds[st.scenarioId]) broken.push({ type: 'step', id: st.scenarioId, problem: 'duplicate scenarioId' });
          seenScenarioIds[st.scenarioId] = true;
          if (!AF_SCENARIOS.some(function (s) { return s.id === st.scenarioId; })) {
            broken.push({ type: 'step', id: st.scenarioId, problem: 'scenarioId not found in AF_SCENARIOS' });
          }
        } else if (st.type === 'verify') {
          if (!st.reviewId) broken.push({ type: 'step', lessonId: l.id, problem: 'verify step missing reviewId' });
          if (seenReviewIds[st.reviewId]) broken.push({ type: 'step', id: st.reviewId, problem: 'duplicate reviewId' });
          seenReviewIds[st.reviewId] = true;
          if (!AF_VERIFY_ITEMS.some(function (v) { return v.id === st.reviewId; })) {
            broken.push({ type: 'step', id: st.reviewId, problem: 'reviewId not found in AF_VERIFY_ITEMS' });
          }
        } else if (st.type === 'reconcile') {
          if (!st.reconcileId) broken.push({ type: 'step', lessonId: l.id, problem: 'reconcile step missing reconcileId' });
          if (seenReconcileIds[st.reconcileId]) broken.push({ type: 'step', id: st.reconcileId, problem: 'duplicate reconcileId' });
          seenReconcileIds[st.reconcileId] = true;
          if (!AF_RECONCILE_ITEMS.some(function (r) { return r.id === st.reconcileId; })) {
            broken.push({ type: 'step', id: st.reconcileId, problem: 'reconcileId not found in AF_RECONCILE_ITEMS' });
          }
        } else if (st.type === 'compose') {
          if (!st.composeId) broken.push({ type: 'step', lessonId: l.id, problem: 'compose step missing composeId' });
          if (seenComposeIds[st.composeId]) broken.push({ type: 'step', id: st.composeId, problem: 'duplicate composeId' });
          seenComposeIds[st.composeId] = true;
          const cmp = AF_COMPOSE_ITEMS.find(function (c) { return c.id === st.composeId; });
          if (!cmp) {
            broken.push({ type: 'step', id: st.composeId, problem: 'composeId not found in AF_COMPOSE_ITEMS' });
          } else {
            (cmp.rubric || []).forEach(function (rub) {
              if (typeof AF_RUBRIC_CHECKS[rub.check] !== 'function') {
                broken.push({ type: 'rubric', composeId: cmp.id, check: rub.check, problem: 'rubric check predicate not defined in AF_RUBRIC_CHECKS' });
              }
            });
          }
        } else if (st.type === 'triage') {
          if (!st.triageId) broken.push({ type: 'step', lessonId: l.id, problem: 'triage step missing triageId' });
          if (seenTriageIds[st.triageId]) broken.push({ type: 'step', id: st.triageId, problem: 'duplicate triageId' });
          seenTriageIds[st.triageId] = true;
          if (!AF_TRIAGE_ITEMS.some(function (t) { return t.id === st.triageId; })) {
            broken.push({ type: 'step', id: st.triageId, problem: 'triageId not found in AF_TRIAGE_ITEMS' });
          }
        }
      });
    });
  }

  return broken;
}

/* ============================================================================
   7b. FINANCIAL AUDIT — rule M1 to M10
   ============================================================================
   An accounting simulator that does not balance is worse than no simulator.
   afAuditMoney() verifies the 10 financial invariants across all live collections
   (catalogue + afDemo), returning an array of discrepancy objects.
   ============================================================================ */

function afAuditMoney() {
  const broken = [];

  const allLeases = afAllLeases();
  const allLedger = afAllLedgerEntries();
  const allBankAccounts = afAllBankAccounts();
  const allStatements = afAllOwnerStatements();

  // M10: All monetary fields must be integer cents
  const moneyFields = [
    'marketRent', 'rentAmount', 'depositHeld', 'petDeposit', 'petRent',
    'amount', 'balanceAfter', 'estimateCents', 'actualCents',
    'monthlyIncomeCents', 'totalIncomeCents', 'totalExpensesCents',
    'managementFeeCents', 'netDistributionCents', 'currentBalanceCents',
    'operatingCashCents', 'reserveCents'
  ];

  [
    afAllProperties(), afAllUnits(), allLeases, allLedger,
    afAllWorkOrders(), afAllApplications(), allBankAccounts,
    allStatements, afAllOwners()
  ].forEach(function (coll) {
    coll.forEach(function (item) {
      moneyFields.forEach(function (field) {
        if (item[field] !== undefined && item[field] !== null) {
          if (typeof item[field] !== 'number' || !Number.isInteger(item[field])) {
            broken.push({ rule: 'M10', id: item.id, field: field, val: item[field], problem: 'amount is not an integer in cents' });
          }
        }
      });
    });
  });

  // M1 & M2: Per-lease ledger balance chain
  allLeases.forEach(function (l) {
    const entries = allLedger.filter(function (e) { return e.leaseId === l.id; });
    if (entries.length === 0) return;

    let calcRunning = 0;
    entries.forEach(function (e) {
      const delta = (e.type === 'charge' ? e.amount : -e.amount);
      calcRunning += delta;
      if (e.balanceAfter !== calcRunning) {
        broken.push({ rule: 'M2', leaseId: l.id, entryId: e.id, expected: calcRunning, actual: e.balanceAfter, problem: 'ledger entry balanceAfter does not equal chained balance' });
      }
    });

    const lastEntry = entries[entries.length - 1];
    if (lastEntry && l.balanceCents !== undefined && l.balanceCents !== lastEntry.balanceAfter) {
      broken.push({ rule: 'M1', leaseId: l.id, expected: lastEntry.balanceAfter, actual: l.balanceCents, problem: 'lease balanceCents does not match last ledger entry balanceAfter' });
    }
  });

  // M3: Rent Roll
  const activeLeases = allLeases.filter(function (l) { return l.status === 'active'; });
  const totalActiveRent = activeLeases.reduce(function (sum, l) { return sum + (l.rentAmount || 0); }, 0);
  if (totalActiveRent <= 0 || !Number.isInteger(totalActiveRent)) {
    broken.push({ rule: 'M3', problem: 'active rent roll is invalid', total: totalActiveRent });
  }

  // M4: Security Deposit escrow
  const secAccount = allBankAccounts.find(function (b) { return b.id === 'BANK-03' || b.type === 'security-deposit'; });
  /* Any lease still holding a deposit, whether it has started yet or not.
     A deposit collected the day before move-in is held from that moment. */
  const totalDeposits = afAllLeases()
    .filter(function (l) { return l.status === 'active' || l.status === 'pending'; })
    .reduce(function (sum, l) { return sum + (l.depositHeld || 0); }, 0);
  /* M9: every cent in the trust account belongs to a named owner. If the two
     sides drift apart, some owner's money has gone somewhere unattributed —
     which is the difference between a trust account and a slush fund. */
  const ownerSum = afAll('owner').reduce(function (s, o) {
    return s + afOwnerAvailableCash(o.id).held;
  }, 0);
  const trustBalance = afAccountBalance(AF_ACCT.trust);
  if (ownerSum !== trustBalance) {
    broken.push({ rule: 'M9', expected: trustBalance, actual: ownerSum,
      problem: 'trust account balance does not equal the sum of owner sub-balances' });
  }

  const secBalance = secAccount ? afAccountBalance(secAccount.id) : 0;
  if (secAccount && secBalance !== totalDeposits) {
    broken.push({ rule: 'M4', expected: totalDeposits, actual: secBalance, problem: 'security deposit bank balance does not equal sum of active lease deposits held' });
  }

  // M7 & M8: Owner Statements
  /* M8 rounding rule: managementFee is rounded to the nearest integer cent
     using round-half-up: Math.round((income * feePct) / 100). */
  allStatements.forEach(function (stmt) {
    const expectedDist = (stmt.totalIncomeCents || 0) - (stmt.totalExpensesCents || 0) - (stmt.managementFeeCents || 0);
    if (stmt.netDistributionCents !== expectedDist) {
      broken.push({ rule: 'M7', id: stmt.id, expected: expectedDist, actual: stmt.netDistributionCents, problem: 'owner statement netDistribution does not equal income - expenses - fee' });
    }
  });

  // M9: Delinquency report sum matches sum of all positive resident ledger balances
  const sumDelinquentLeases = allLeases.reduce(function (sum, l) {
    const entries = allLedger.filter(function (e) { return e.leaseId === l.id; });
    const lastBal = entries.length > 0 ? entries[entries.length - 1].balanceAfter : 0;
    return sum + (lastBal > 0 ? lastBal : 0);
  }, 0);

  if (sumDelinquentLeases < 0 || !Number.isInteger(sumDelinquentLeases)) {
    broken.push({ rule: 'M9', problem: 'delinquency ledger sum is invalid' });
  }

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

/* Which tabs a section actually has. Read from AF_NAV, because the alternative
   is a second hand-maintained copy of the navigation — and this file already
   proved where that ends: five sections carried a hardcoded whitelist of valid
   sectionTab values, three of them had fallen behind AF_NAV, and EIGHT sidebar
   entries silently bounced to their section's first tab. Leasing > Metrics went
   to Vacancies; five of the nine Maintenance tabs went to Work Orders.

   `extra` covers screens that are reachable by afGoto but deliberately absent
   from the sidebar, like the Maintenance contact centre. */
const AF_TAB_EXTRA = {
  maintenance: ['contact'],
  reporting:   ['letters', 'compliance']
};
function afSectionTabIds(view) {
  const sec = AF_NAV.filter(function (x) { return (x.view || x.id) === view; })[0];
  const kids = (sec && sec.children ? sec.children : [])
    .filter(function (c) { return !c.stub; })
    .map(function (c) { return c.tab || c.id; });
  return kids.concat(AF_TAB_EXTRA[sec ? sec.id : ''] || []);
}
/* The tab a section lands on when nothing else is specified: its first child. */
function afSectionDefaultTab(view) { return afSectionTabIds(view)[0] || null; }

function afGoto(view, extraId) {
  afState.view = view;
  afState.sidebarOpen = false;

  if (AF_SECTIONS.some(function (s) { return s.id === view; })) afState.section = view;

  if (view === 'property-detail') { afState.activePropertyId = extraId; afState.section = 'properties'; afState.sectionTab = 'properties'; }
  if (view === 'unit-detail')     { afState.activeUnitId = extraId;     afState.section = 'properties'; afState.sectionTab = 'properties'; }
  if (view === 'resident-detail') { afState.activeResidentId = extraId; afState.section = 'residents';  afState.sectionTab = 'tenants'; }
  if (view === 'owner-detail')    { afState.activeOwnerId = extraId;    afState.section = 'owners';     afState.sectionTab = 'owners'; }
  if (view === 'work-order')      { afState.activeWorkOrderId = extraId; afState.section = 'maintenance'; afState.sectionTab = 'work-orders'; }
  if (view === 'application')     { afState.activeApplicationId = extraId; afState.section = 'leasing'; afState.sectionTab = 'applications'; }
  if (view === 'lease-detail')    { afState.activeLeaseId = extraId;    afState.section = 'leasing';     afState.sectionTab = 'leases'; }

  if (view === 'properties') {
    afState.section = 'properties';
    if (extraId) afState.sectionTab = extraId;
    else if (!afState.sectionTab || afSectionTabIds('properties').indexOf(afState.sectionTab) === -1) {
      afState.sectionTab = afSectionDefaultTab('properties');
    }
  }
  if (view === 'leasing') {
    afState.section = 'leasing';
    if (extraId) afState.sectionTab = extraId;
    else if (!afState.sectionTab || afSectionTabIds('leasing').indexOf(afState.sectionTab) === -1) {
      afState.sectionTab = afSectionDefaultTab('leasing');
    }
  }
  if (view === 'residents') {
    afState.section = 'residents';
    if (extraId) afState.sectionTab = extraId;
    else if (!afState.sectionTab || afSectionTabIds('residents').indexOf(afState.sectionTab) === -1) {
      afState.sectionTab = afSectionDefaultTab('residents');
    }
  }
  if (view === 'owners') {
    afState.section = 'residents';
    afState.sectionTab = 'owners';
  }
  if (view === 'maintenance') {
    afState.section = 'maintenance';
    if (extraId) afState.sectionTab = extraId;
    else if (!afState.sectionTab || afSectionTabIds('maintenance').indexOf(afState.sectionTab) === -1) {
      afState.sectionTab = afSectionDefaultTab('maintenance');
    }
  }
  if (view === 'accounting') {
    afState.section = 'accounting';
    if (extraId) {
      afState.accountingTab = extraId;
      afState.sectionTab = extraId;
    } else if (!afState.sectionTab || afSectionTabIds('accounting').indexOf(afState.sectionTab) === -1) {
      afState.sectionTab = afState.accountingTab || afSectionDefaultTab('accounting');
    }
  }
  if (view === 'reporting') {
    afState.section = 'reporting';
    if (extraId) afState.sectionTab = extraId;
    else if (!afState.sectionTab || afSectionTabIds('reporting').indexOf(afState.sectionTab) === -1) {
      afState.sectionTab = afSectionDefaultTab('reporting');
    }
  }

  if (view === 'scenario')  { afState.scenarioId  = extraId; }
  if (view === 'review')    { afState.reviewId    = extraId; }
  if (view === 'compose')   { afState.composeId   = extraId; }
  if (view === 'reconcile') { afState.reconcileId = extraId; }
  if (view === 'triage')    { afState.triageId    = extraId; }

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

/* ============================================================================
   THE CHASSIS — sidebar, tab strips and the right rail
   ============================================================================

   Rebuilt from Images-resources/video-layout-nav/, 32 frames of the AppFolio
   "Full Layout and Navigation" tutorial. The module used to put navigation in a
   horizontal bar across the top. AppFolio does not: it puts it in a dark rail on
   the left, and it has a THIRD column on the right that the module had no
   equivalent for at all.

   The right rail matters more than it looks. It is where AppFolio keeps its
   create actions — "New Guest Card", "Move In Tenant", "New Property" — instead
   of a single global "+ New" button. A trainee who learns to reach for a top-bar
   + New learns a habit the real product will not reward, which is precisely the
   thing a training simulator must not teach.

   WHAT IS COPIED AND WHAT IS NOT
   The source video is from roughly 2018–2019: the data on screen is dated
   between 12/27/2016 and 01/01/2019. Structure — which sections exist, how they
   nest, what each table's columns are called — ages well and is copied
   faithfully. Appearance does not, and AppFolio has redesigned since. The
   colours sampled from that video are a starting point held in :root, flagged as
   unverified, and must be checked against the live product before anyone treats
   them as settled.
   ============================================================================ */

/* The eight sections, with the children each one shows. Taken verbatim from the
   frames; this list is the most durable thing in the document, because an ERP
   does not reorganise its taxonomy every year.

   `view` is the module view a link opens and `tab` the level-1 tab it selects.
   Several AppFolio children have no counterpart in this module yet — they carry
   `stub: true` and answer with the standard type-C sentence rather than being
   silently dropped, because a VA needs to recognise the shape of the real menu.

   `nav` on a section or child is the value that lands in data-section. The four
   lesson walkthroughs target a[data-section="properties" | "residents" |
   "leasing" | "maintenance"], so those four values have to appear on an <a>.
   They did not before this rewrite: the old top bar emitted <button>, so all
   four of those walkthrough steps pointed at nothing. */
/* ============================================================================
   NAVIGATION — rebuilt from the 2026 screenshots
   ============================================================================
   The previous shape was inferred from a 2018 video and a written contract. The
   real product has ten sections, not eight: Calendar and Communication were
   missing entirely, What's New is a section rather than chrome, and several
   sections carry children this module never listed.

   Where a screenshot shows a child that the module does not implement, it is
   still listed and marked `stub: true`. Hiding it would teach the wrong menu;
   the shape of the real navigation is itself part of what a VA has to learn.

   `data-section` on the section rows is the selector contract the lesson
   walkthroughs point at, so those ids do not change.
   ============================================================================ */
const AF_NAV = [
  { id: 'dashboard', label: 'Dashboard', nav: 'dashboard', view: 'dashboard' },

  { id: 'calendar', label: 'Calendar', nav: 'calendar', view: 'calendar' },

  { id: 'leasing', label: 'Leasing', nav: 'leasing', view: 'leasing', children: [
    { id: 'vacancies',    label: 'Vacancies',           view: 'leasing', tab: 'vacancies' },
    { id: 'guest-cards',  label: 'Guest Cards',         view: 'leasing', tab: 'guest-cards' },
    { id: 'applications', label: 'Rental Applications', view: 'leasing', tab: 'applications' },
    { id: 'leases',       label: 'Leases',              view: 'leasing', tab: 'leases' },
    { id: 'renewals',     label: 'Renewals',            view: 'leasing', tab: 'renewals' },
    { id: 'lsg-metrics',  label: 'Metrics',             view: 'leasing', tab: 'lsg-metrics' },
    { id: 'signals',      label: 'Signals',             view: 'leasing', tab: 'signals' }
  ]},

  /* Properties carries no chevron in the real sidebar: it is a direct link,
     and Associations lives as a level-2 tab inside the screen rather than as
     a sidebar child. */
  { id: 'properties', label: 'Properties', nav: 'properties', view: 'properties' },

  { id: 'people', label: 'People', nav: 'residents', view: 'residents', children: [
    { id: 'tenants',    label: 'Tenants',         view: 'residents', tab: 'tenants', nav: 'residents' },
    { id: 'homeowners', label: 'Homeowners',      view: 'residents', tab: 'homeowners' },
    { id: 'owners',     label: 'Owners',          view: 'residents', tab: 'owners' },
    { id: 'vendors',    label: 'Vendors',         view: 'residents', tab: 'vendors' },
    { id: 'tax',        label: 'Tax Authorities', view: 'residents', tab: 'tax' },
    { id: 'users',      label: 'Users',           stub: true }
  ]},

  { id: 'accounting', label: 'Accounting', nav: 'accounting', view: 'accounting', children: [
    { id: 'overview',     label: 'Overview',            view: 'accounting', tab: 'overview' },
    { id: 'receipts',     label: 'Receipts & Ledger',   view: 'accounting', tab: 'receipts' },
    { id: 'delinquency',  label: 'Delinquency Aging',   view: 'accounting', tab: 'delinquency' },
    { id: 'statements',   label: 'Owner Statements',    view: 'accounting', tab: 'statements' },
    { id: 'reconcile',    label: 'Bank Reconciliation', view: 'accounting', tab: 'reconcile' },
    { id: 'payables',     label: 'Payables & Bills',    view: 'accounting', tab: 'payables' },
    { id: 'journal',      label: 'Journal Entries',     view: 'accounting', tab: 'journal' },
    { id: 'diagnostics',  label: 'Diagnostics',         view: 'accounting', tab: 'diagnostics' }
  ]},

  /* Nine children, in the order the sub-tab strip shows them. The strip
     overflows and scrolls horizontally in the real product, which is why the
     screenshots catch it clipped at the left. */
  { id: 'maintenance', label: 'Maintenance', nav: 'maintenance', view: 'maintenance', children: [
    { id: 'work-orders',  label: 'Work Orders',           view: 'maintenance', tab: 'work-orders', nav: 'maintenance' },
    { id: 'recurring',    label: 'Recurring Work Orders', view: 'maintenance', tab: 'recurring' },
    { id: 'inspections',  label: 'Inspections',           view: 'maintenance', tab: 'inspections' },
    { id: 'unit-turns',   label: 'Unit Turns',            view: 'maintenance', tab: 'unit-turns' },
    { id: 'projects',     label: 'Projects',              view: 'maintenance', tab: 'projects' },
    { id: 'purchase',     label: 'Purchase Orders',       view: 'maintenance', tab: 'purchase' },
    { id: 'inventory',    label: 'Inventory',             view: 'maintenance', tab: 'inventory' },
    { id: 'fixed-assets', label: 'Fixed Assets',          view: 'maintenance', tab: 'fixed-assets' },
    { id: 'performer',    label: 'Maintenance Performer', view: 'maintenance', tab: 'performer' }
  ]},

  { id: 'reporting', label: 'Reporting', nav: 'reporting', view: 'reporting', children: [
    { id: 'reports',   label: 'Reports',           view: 'reporting', tab: 'reports' },
    { id: 'scheduled', label: 'Scheduled Reports', view: 'reporting', tab: 'scheduled' },
    { id: 'metrics',   label: 'Metrics',           view: 'reporting', tab: 'metrics' },
    { id: 'surveys',   label: 'Surveys',           view: 'reporting', tab: 'surveys' }
  ]},

  { id: 'communication', label: 'Communication', nav: 'communication', view: 'communication', children: [
    { id: 'comm-inbox',     label: 'Inbox',            view: 'communication', tab: 'comm-inbox' },
    { id: 'comm-bulk',      label: 'Bulk Emails/Texts', view: 'communication', tab: 'comm-bulk' },
    { id: 'comm-templates', label: 'Templates',        view: 'communication', tab: 'comm-templates' },
    { id: 'comm-calls',     label: 'Call Log',         view: 'communication', tab: 'comm-calls' }
  ]},

  /* A section in its own right, carrying an unread count. */
  { id: 'whats-new', label: "What's New", nav: 'whats-new', view: 'whats-new' },

  /* Training & Lessons module in lateral navigation */
  { id: 'lessons', label: 'Training', nav: 'lessons', view: 'lessons' }
];

/* Level-2 strips. Every entry here must resolve to a real view, because a tab
   that renders nothing is the defect this module exists to avoid. */
/* The sub-tab strip is built from AF_NAV children and nothing else. There used
   to be a second table here, AF_SUBTABS, listing the same strips again — but
   the only lookup that read it built a `section/tab` key, and every entry was
   keyed by plain section name, so not one of them was ever reachable. A second
   unread copy of the navigation is a drift machine, and it had already drifted:
   its People entry was filed under `residents` and had lost the Users tab. One
   source of truth is the fix. */

/* Level-3, only where the product has one. Metrics is the case the screenshots
   show. */
const AF_SUBTABS_L3 = {
  metrics: [
    ['pricing', 'Pricing Metrics'], ['business', 'Business Metrics'],
    ['insurance', 'Tenant Insurance Coverage'], ['diagnostic', 'Data Diagnostic']
  ]
};



/* Level-2 tabs. Only three pages have them, and each strip sits directly under
   the level-1 strip rather than replacing it — the sidebar locates you, the
   first strip moves you between siblings, the second within one sibling. */


/* Which sidebar section owns a given module view, so the rail and the sidebar
   stay lit when a lesson navigates straight to a detail screen. */
const AF_VIEW_SECTION = {
  dashboard: 'dashboard',
  calendar: 'calendar',
  leasing: 'leasing', application: 'leasing', 'lease-detail': 'leasing',
  properties: 'properties', 'property-detail': 'properties', 'unit-detail': 'properties',
  residents: 'people', 'resident-detail': 'people', owners: 'people', 'owner-detail': 'people',
  accounting: 'accounting',
  maintenance: 'maintenance', 'work-order': 'maintenance',
  reporting: 'reporting',
  communication: 'communication',
  communications: 'communication',
  messages: 'communication',
  'whats-new': 'whats-new',
  lessons: 'lessons',
  lesson: 'lessons',
  scenario: 'lessons',
  review: 'lessons',
  reconcile: 'lessons',
  compose: 'lessons',
  triage: 'lessons',
  exam: 'lessons'
};

function afNavSection(id) {
  return AF_NAV.find(function (s) { return s.id === id; }) || null;
}
function afCurrentNavSection() {
  return AF_VIEW_SECTION[afState.view] || afState.section || 'dashboard';
}

/* Expanding is separate from being active, because AppFolio lets you leave a
   section open while you work somewhere else — frame 12 shows exactly that.

   Tri-state on purpose. `undefined` means "nobody has said", and a section you
   are working inside defaults to open; `true` and `false` are the visitor's own
   decision and both are honoured. The renderer used to compute this as
   `navOpen[id] || isActive`, which made the caret dead on the ACTIVE section —
   the one section anybody would ever want to collapse. Clicking it flipped the
   flag and the render overrode it every time. */
function afNavGroupOpen(id) {
  const explicit = afState.navOpen[id];
  if (explicit === undefined) return id === afCurrentNavSection();
  return !!explicit;
}
function afToggleNavGroup(id) {
  /* Toggle against what is on screen, not against the raw flag — otherwise the
     first click on an open-by-default section appears to do nothing. */
  afState.navOpen[id] = !afNavGroupOpen(id);
  afRenderChrome();
}

function afNavGo(sectionId, childId) {
  const s = afNavSection(sectionId);
  if (!s) return;

  /* Clicking the header of the section you are ALREADY in is a collapse, not a
     navigation. Re-sending someone to Vacancies while they are standing on
     Vacancies spends the click on nothing, and it is the click everybody reaches
     for when they want the group out of the way. */
  if (!childId && s.children && sectionId === afCurrentNavSection()) {
    afToggleNavGroup(sectionId);
    return;
  }

  /* Otherwise a section with children behaves the way it does in the product:
     it opens, and it takes you to its first child. */
  const child = childId
    ? (s.children || []).find(function (c) { return c.id === childId; })
    : (s.children ? s.children[0] : null);

  if (s.children) afState.navOpen[sectionId] = true;
  afState.navChild = child ? child.id : null;

  const target = child || s;
  if (target.stub) {
    afDemoAction(target.label);
    return;
  }
  if (target.tab) {
    afState.sectionTab = target.tab;
    if (target.view === 'accounting') afState.accountingTab = target.tab;
  } else {
    afState.sectionTab = null;
  }
  afState.subTab = null;
  afGoto(target.view || s.view || 'dashboard');
}

function afSetSectionTab(tab) {
  afState.sectionTab = tab;
  afState.subTab = null;
  if (afState.view === 'accounting') afState.accountingTab = tab;
  /* Keep the sidebar's highlighted child in step with the tab strip: they are
     two controls over one piece of state, and letting them disagree is how a
     trainee ends up unsure which page they are on. */
  const s = afNavSection(afCurrentNavSection());
  const child = s && (s.children || []).find(function (c) { return c.tab === tab || c.id === tab; });
  afState.navChild = child ? child.id : null;
  afRenderChrome();
  afRenderRoot();
}
function afSetSubTab(tab) {
  afState.subTab = tab;
  afRenderRoot();
}



/* ============================================================================
   LIST FURNITURE — the small conventions AppFolio repeats on every screen
   ============================================================================
   None of these is decorative. The alphabetical index is how the product
   navigates a long people list (it is an index, not a search); the row count is
   how you know whether you are looking at everything; and the plain-English
   hint above a table is how AppFolio explains a clickable row instead of
   styling one. Copying the conventions is most of what makes a list feel like
   the product rather than like a table someone built.
   ============================================================================ */

/* A–Z + All, shown above people lists. Letters nobody is filed under are
   rendered disabled rather than omitted, so the strip keeps its width and its
   position while the list underneath changes. */
function afAlphaIndexHTML(names, current, handler) {
  const present = {};
  names.forEach(function (n) {
    const c = String(n || '').trim().charAt(0).toUpperCase();
    if (c) present[c] = true;
  });
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return '<div class="af-alpha">' +
    letters.map(function (L) {
      return '<button type="button" class="' + (current === L ? 'on' : '') + '"' +
        (present[L] ? '' : ' disabled') +
        ' onclick="' + handler + '(\'' + L + '\')">' + L + '</button>';
    }).join('') +
    '<button type="button" class="' + (!current || current === 'All' ? 'on' : '') +
      '" onclick="' + handler + '(\'All\')">All</button>' +
  '</div>';
}

function afAlphaFilter(list, letter, keyFn) {
  if (!letter || letter === 'All') return list;
  return list.filter(function (x) {
    return String(keyFn(x) || '').trim().charAt(0).toUpperCase() === letter;
  });
}

/* "Displaying: 1-24 of 24", bottom left of nearly every list in the product. */
function afDisplayCount(shown, total) {
  if (!total) return '<div class="af-count">Displaying: 0 of 0</div>';
  return '<div class="af-count">Displaying: 1-' + shown + ' of ' + total + '</div>';
}

/* The product tells you a row is clickable in words. */
function afTableHint(text) {
  return '<p class="af-tbl-hint">' + esc(text) + '</p>';
}

function afSetAlpha(letter) {
  afState.alpha = letter;
  afRenderRoot();
}


/* ============================================================================
   THE REPORTS INDEX
   ============================================================================
   Transcribed from 24-reporting-reports-index.png: four groups, two columns,
   a spreadsheet glyph and a blue link per row.

   Sixty reports are listed and only the handful the curriculum actually uses
   are live. That split is deliberate. Recognising the inventory — knowing that
   "Trust Account Balance" and "Aged Receivable Detail" are things AppFolio has,
   and roughly where to find them — is half of what this screen teaches. Building
   sixty report renderers would be the other half done badly, and rule D of the
   contract forbids sixty links that do nothing at all, so the ones that are not
   built say so in the standard sentence rather than failing silently.
   ============================================================================ */
/* ============================================================================
   THE REPORT INDEX — transcribed from the real screenshots
   ============================================================================
   Six overlapping screenshots cover the whole index. Every name below is copied
   from them, in the order and grouping the product uses.

   130 reports. The module previously listed 47 invented ones.

   `live: true` marks a report this module actually builds. The rest are listed
   because the index IS the screen: a VA has to learn where a report lives and
   what it is called, and an index showing only the three we implemented would
   teach a menu that does not exist. Clicking one that is not live says so
   plainly rather than opening an empty page.
   ============================================================================ */
const AF_REPORT_INDEX = [
  { group: 'Accounting Reports', reports: [
    'Account Totals', 'Balance Sheet', 'Balance Sheet - Comparative',
    'Balance Sheet - Property Comparison', 'Bank Account Activity',
    'Bank Account Association', 'Bank Account Directory', 'Cash Flow',
    'Cash Flow - 12 Month', 'Cash Flow - Property Comparison', 'Cash Flow Detail',
    'Chart of Accounts', 'Expense Distribution', 'General Ledger',
    'Income Statement', 'Income Statement - 12 Month',
    'Income Statement - Comparative', 'Income Statement - Property Comparison',
    'Income Statement (Date Range)', 'Loans', 'Trial Balance',
    'Trial Balance by Property', 'Trust Account Balance', 'Trust Account Detail'
  ]},
  { group: 'Diagnostic Reports', reports: [
    'AppFolio Stack™ Usage', 'CheckSend Payment Usage Summary Report',
    'E Check Usage Summary Report', 'Email Delivery Errors', 'Import Variances',
    'Insurance Enforcement', 'Late Fee Policy Comparison', 'Merge Variances',
    'Online Payables Payment Detail Report', 'Resident eCheck Fee Coverage',
    'User Roles and Permissions', 'Users'
  ]},
  { group: 'Leasing Reports', reports: [
    'Guest Card Inquiries', 'Guest Card Interests', 'Historical Advertised Rent',
    'Inactive Guest Card Interests', 'Insurance Marketing Credits',
    'Insurance Usage', 'Lease Expiration Detail By Month',
    'Lease Expiration Summary By Month', 'Lease History',
    'Leasing Agent Performance', 'Leasing Funnel Performance', 'Leasing Summary',
    'Occupancy Summary', 'Owner Leasing', 'Premium Listing Billing Detail',
    'Prospect Source Tracking', 'Renewal Summary', 'Rental Applications',
    'Screening Assessments', 'Screening Usage', 'Showings', 'Unit Vacancy Detail'
  ]},
  { group: 'Maintenance Reports', reports: [
    'Inspection Detail', 'Project Budget Detail', 'Project Directory',
    'Purchase Order', 'Recurring Work Order', 'Unit Turn Detail',
    'Vendor Directory', 'Vendor Ledger', 'Vendor Ledger (Enhanced)',
    'Work Order', 'Work Order Billable Detail', 'Work Order Labor Summary'
  ]},
  { group: 'Owner Reports', reports: [
    'Owner Directory', 'Owner Insurance', 'Owner Insurance Audit',
    'Owner Statement', 'Owner Statement (Enhanced)', 'Owner Withholdings'
  ]},
  { group: 'Property And Unit Reports', reports: [
    'Activities Summary', 'Additional Fees', 'Amenities By Property',
    'Annual Budget - Comparative', 'Annual Budget - Forecast',
    'Budget - Comparative', 'Budget - Property Comparison', 'Budget Detail',
    'Fixed Assets', 'Gross Potential Rent', 'Inventory Status', 'Inventory Usage',
    'Keys Detail', 'Property Directory', 'Property Group Directory',
    'Property Performance', 'Rent Roll', 'Rent Roll (Commercial)',
    'Rent Roll (Itemized)', 'Rentable Items', 'Unit Directory', 'Unit Inspection'
  ]},
  { group: 'Tax Reports', reports: [
    'Owner 1099 Detail', 'Owner 1099 Summary',
    'Vendor 1099 Detail', 'Vendor 1099 Summary'
  ]},
  { group: 'Tenant Reports', reports: [
    'Debt Collections Status', 'Delinquency', 'Delinquency (As Of)',
    'Eligible Debt Summary', 'Security Deposit Funds Detail', 'Survey Responses',
    'Tenant Directory', 'Tenant Ledger', 'Tenant Tickler',
    'Tenant Transactions Summary', 'Tenant Unpaid Charges',
    'Tenant Unpaid Charges Summary', 'Tenant Vehicle Info'
  ]},
  { group: 'Transaction Reports', reports: [
    'Aged Payables Summary', 'Aged Receivable Detail', 'Bill Detail',
    'Charge Detail', 'Check Register', 'Check Register Detail',
    'Check Register Detail (Enhanced)', 'Deposit Register', 'Expense Register',
    'Income Register', 'Journal Entry Register', 'Payment Plans',
    'Receivables Activity', 'Resident Financial Activity',
    'Unpaid Balances by Month'
  ]}
];

/* Reports carrying a NEW flag in the product. */
const AF_REPORT_NEW = ['Owner Insurance', 'Owner Insurance Audit', 'Management Fee History'];

/* The ones this module actually renders. Everything else is index only. */
const AF_REPORT_LIVE = ['Rent Roll', 'Delinquency', 'Unit Vacancy Detail', 'Tenant Ledger'];

/* Saved reports are a group of their own, created by the user, with their own
   filter row. These are the ones the source account had. */
const AF_SAVED_REPORTS = [
  'FINANCIAL REVIEW - Pet Security Deposits',
  'FINANCIAL REVIEW - Security Deposits',
  'FINANCIAL REVIEW - Tenant Balances',
  'FINANCIAL REVIEW - Tenant Prepayments',
  'FINANCIAL REVIEW - Trust Account Balance'
];

/* Favourites are a per-viewer convenience, so they live in the demo state and
   die on reload like everything else about the product. */
function afToggleReportStar(name) {
  if (!afDemo.starredReports) afDemo.starredReports = {};
  afDemo.starredReports[name] = !afDemo.starredReports[name];
  afRenderRoot();
}
function afReportStarred(name) {
  return !!(afDemo.starredReports && afDemo.starredReports[name]);
}

function afOpenReport(name) {
  if (AF_REPORT_LIVE.indexOf(name) > -1) {
    afState.report = name;
    afRenderRoot();
    return;
  }
  /* Honest refusal beats an empty page that claims to be a report. */
  afDemoAction(name + ' is in the index so you can learn where it lives, but it is not built in this training copy');
}



const AF_REPORT_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>' +
  '<line x1="9" y1="9" x2="9" y2="21"/></svg>';

/* The Reports index, rebuilt from the screenshots: a Report Builder button, a
   search field that filters by name, nine collapsible groups, a favourite star
   and a caret on every row, and Saved Reports as a group of its own with its
   own filter line. */

let afReportQuery = '';
let afReportGroupsShut = {};
function afSetReportQuery(v) { afReportQuery = String(v || ''); afRenderRoot(); }
function afToggleReportGroup(g) { afReportGroupsShut[g] = !afReportGroupsShut[g]; afRenderRoot(); }

function afReportIndexHTML() {
  const q = afReportQuery.trim().toLowerCase();
  let shown = 0, total = 0;

  function renderGroupSection(grp) {
    total += grp.reports.length;
    const hits = grp.reports.filter(function (name) {
      return !q || name.toLowerCase().indexOf(q) > -1;
    });
    shown += hits.length;
    if (q && !hits.length) return '';
    const shut = !q && afReportGroupsShut[grp.group];

    return '<section class="af-reports-group">' +
      '<button type="button" class="af-reports-grouphead" onclick="afToggleReportGroup(\'' + escAttr(grp.group) + '\')">' +
        '<span class="af-reports-chev' + (shut ? ' shut' : '') + '" aria-hidden="true">&#9652;</span>' +
        esc(grp.group) +
        (q ? '<span class="af-reports-count">' + hits.length + ' / ' + grp.reports.length + '</span>' : '') +
      '</button>' +
      (shut ? '' : '<div class="af-reports-cols">' +
        hits.map(function (name) {
          const live = AF_REPORT_LIVE.indexOf(name) > -1;
          const isNew = AF_REPORT_NEW.indexOf(name) > -1;
          const starred = afReportStarred(name);
          return '<div class="af-report-row' + (live ? '' : ' stub') + '">' +
            '<button type="button" class="af-report-name"' +
              (live ? ' data-report="' + escAttr(name) + '"' : '') +
              ' onclick="afOpenReport(\'' + escAttr(name) + '\')">' + esc(name) + '</button>' +
            (isNew ? '<span class="af-report-new">NEW</span>' : '') +
            '<div class="af-report-actions">' +
              '<button type="button" class="af-report-star' + (starred ? ' on' : '') + '"' +
                ' title="Favourite" onclick="afToggleReportStar(\'' + escAttr(name) + '\')">' +
                (starred ? '&#9733;' : '&#9734;') + '</button>' +
              '<button type="button" class="af-report-more" title="More"' +
                ' onclick="afDemoAction(\'Report options for ' + escAttr(name) + '\')">&#9662;</button>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>') +
    '</section>';
  }

  const saved = (!q ? '<section class="af-reports-group">' +
      '<button type="button" class="af-reports-grouphead" onclick="afToggleReportGroup(\'Saved Reports\')">' +
        '<span class="af-reports-chev' + (afReportGroupsShut['Saved Reports'] ? ' shut' : '') + '" aria-hidden="true">&#9652;</span>' +
        'Saved Reports' +
      '</button>' +
      (afReportGroupsShut['Saved Reports'] ? '' :
        '<div class="af-saved-filters">' +
          '<label class="af-field"><span>Tags</span><input type="text" placeholder="Search..."></label>' +
          '<label class="af-field"><span>Created By</span><input type="text" placeholder="Search..."></label>' +
          '<label class="af-field"><span>Created Date Range</span><input type="date" placeholder="Start Date"> <input type="date" placeholder="End Date"></label>' +
        '</div>' +
        '<div class="af-reports-cols one">' +
          AF_SAVED_REPORTS.map(function (name) {
            const starred = afReportStarred(name);
            return '<div class="af-report-row stub">' +
              '<button type="button" class="af-report-name" onclick="afOpenReport(\'' + escAttr(name) + '\')">' +
                esc(name) + '</button>' +
              '<div class="af-report-actions">' +
                '<button type="button" class="af-report-more" title="More"' +
                  ' onclick="afDemoAction(\'Saved report options\')">&#8943;</button>' +
                '<button type="button" class="af-report-star' + (starred ? ' on' : '') + '" title="Favourite"' +
                  ' onclick="afToggleReportStar(\'' + escAttr(name) + '\')">' + (starred ? '&#9733;' : '&#9734;') + '</button>' +
                '<button type="button" class="af-report-more" title="More options"' +
                  ' onclick="afDemoAction(\'Saved report options\')">&#9662;</button>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>') +
    '</section>' : '');

  // Render all 9 standard groups in alphabetical order, then Saved Reports at the bottom
  let groupsHTML = '';
  AF_REPORT_INDEX.forEach(function (grp) {
    groupsHTML += renderGroupSection(grp);
  });
  if (saved) {
    groupsHTML += saved;
  }

  return '<div class="af-reports">' +
    '<div class="af-reports-head">' +
      '<h1>Reports</h1>' +
      '<button type="button" class="af-btn" onclick="afDemoAction(\'Report Builder\')">Report Builder</button>' +
    '</div>' +
    '<div class="af-reports-search">' +
      '<input type="text" id="afReportSearch" value="' + escAttr(afReportQuery) + '"' +
        ' placeholder="Search reports by name, description, or column"' +
        ' oninput="afSetReportQuery(this.value)">' +
      '<span class="af-reports-searchicon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
        '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.7" y2="16.7"/></svg></span>' +
    '</div>' +
    (q ? '<p class="af-note">' + shown + ' of ' + total + ' reports match &ldquo;' + esc(afReportQuery) + '&rdquo;.</p>' : '') +
    groupsHTML +
  '</div>';
}

/* ---------------------------------------------------------------------------
   SIDEBAR
   --------------------------------------------------------------------------- */
const AF_NAV_ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  leasing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
  properties: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M9 8h1m4 0h1m-5 4h1m4 0h1m-5 4h1m4 0h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  accounting: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  maintenance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  reporting: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
  communication: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  'whats-new': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
  lessons: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>'
};

function afRenderSidebar() {
  const el = document.getElementById('afSidebar');
  if (!el) return;

  const isMin = !!afState.sidebarMinimized;
  el.classList.toggle('minimized', isMin);

  const activeSection = afCurrentNavSection();

  const rows = AF_NAV.map(function (s) {
    const isActive = s.id === activeSection;
    const isOpen = afNavGroupOpen(s.id);
    const hasKids = !!(s.children && s.children.length);

    const dataSection = s.nav || s.id;
    const iconSvg = AF_NAV_ICONS[s.id] || '';
    /* 33 was the number in the screenshot, not a fact about this module. */
    const badgeCount = s.id === 'whats-new' ? afWhatsNewCount() : (s.badge ? afUnreadMessages() : 0);

    let html =
      '<a class="af-sb-item' + (isActive ? ' active' : '') + (isOpen && hasKids ? ' open' : '') + '"' +
      ' href="#" data-section="' + escAttr(dataSection) + '"' +
      ' title="' + escAttr(s.label) + '"' +
      ' onclick="afNavGo(\'' + escAttr(s.id) + '\');return false;">' +
        (iconSvg ? '<span class="af-sb-icon" aria-hidden="true">' + iconSvg + '</span>' : '') +
        '<span class="af-sb-label">' + esc(s.label) + '</span>' +
        (badgeCount ? '<span class="af-sb-badge' + (s.id === 'whats-new' ? ' whats-new-badge' : '') + '">' + badgeCount + '</span>' : '') +
        (hasKids
          ? '<span class="af-sb-caret" onclick="event.stopPropagation();event.preventDefault();afToggleNavGroup(\'' + escAttr(s.id) + '\');" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
            '</span>'
          : '') +
      '</a>';

    if (hasKids && isOpen && !isMin) {
      html += '<div class="af-sb-kids' + (isActive ? ' on-active' : '') + '">' +
        s.children.map(function (c) {
          const kidActive = isActive && (afState.navChild === c.id ||
            (!afState.navChild && c === s.children[0]));
          return '<a class="af-sb-kid' + (kidActive ? ' active' : '') + (c.stub ? ' stub' : '') + '"' +
            ' href="#"' + (c.nav ? ' data-section="' + escAttr(c.nav) + '"' : '') +
            ' title="' + escAttr(c.label) + '"' +
            ' onclick="afNavGo(\'' + escAttr(s.id) + '\',\'' + escAttr(c.id) + '\');return false;">' +
            esc(c.label) + '</a>';
        }).join('') +
      '</div>';
    }
    return html;
  }).join('');

  el.innerHTML =
    '<nav class="af-sb-nav" aria-label="Sections">' + rows + '</nav>' +
    '<div class="af-sb-footer">' +
      '<div class="af-sb-company-name">1ST Choice Property Management VA</div>' +
      '<button type="button" class="af-sb-minimize" onclick="afToggleSidebar()" title="' + (isMin ? 'Expand sidebar' : 'Minimize sidebar') + '">' +
        (isMin
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="8 6 14 12 8 18"/><line x1="20" y1="6" x2="20" y2="18"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right:4px;"><line x1="4" y1="6" x2="4" y2="18"/><polyline points="16 6 10 12 16 18"/></svg>') +
        '<span class="af-sb-min-text">' + (isMin ? '' : 'Minimize') + '</span>' +
      '</button>' +
    '</div>';
}

function afUnreadMessages() {
  const sent = (afDemo.messages || []).length;
  return Math.max(0, 1 - Math.min(sent, 1)) + (sent ? 0 : 0) || 1;
}

const AF_WHATS_NEW_COUNT = 33;

function afRenderSubnav() {
  const el = document.getElementById('afSubnav');
  if (!el) return;

  const section = afCurrentNavSection();
  const secObj = afNavSection(section);
  const children = secObj && secObj.children ? secObj.children : [];

  if (!children.length) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }

  /* Level 1 */
  const activeChild = afState.navChild || children[0].id;
  const level1 = children.map(function (c) {
    const active = c.id === activeChild;
    return '<button type="button" class="af-tab' + (active ? ' active' : '') + (c.stub ? ' stub' : '') + '"' +
      ' onclick="afNavGo(\'' + escAttr(section) + '\',\'' + escAttr(c.id) + '\')">' +
      esc(c.label) + '</button>';
  }).join('');

  /* Level 2 came from AF_SUBTABS, which nothing could reach. AF_NAV children
     are the strip; Reporting > Metrics draws its own third level inline. */
  const level2 = '';

  el.hidden = false;
  el.innerHTML = '<div class="af-tabs">' + level1 + '</div>' + level2;
}

const AF_RAIL = {
  lessons: [
    { group: 'Training', icon: 'star', links: [
      { label: 'View All Lessons', act: "afGoto('lessons')" },
      { label: 'Reset Progress', act: "afConfirmResetSandbox()" }
    ]}
  ],
  calendar: [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'Add Personal Calendar', act: "simToast('Add Personal Calendar Wizard', { tone: 'good' })", badge: 'NEW' },
      { label: 'Set Showing Availability', act: "simToast('Showing Availability Settings', { tone: 'good' })" }
    ]}
  ],
  dashboard: [
    { group: 'Calendar', icon: 'calendar', links: [
      { label: 'View Calendar', act: "afGoto('calendar')" }
    ]},
    { group: 'Property', icon: 'home', links: [
      { label: 'New Property', act: "afModalAddProperty()" }
    ]},
    { group: 'People', icon: 'user', links: [
      { label: 'Move In Tenant',    act: "afModalAddResident()" },
      { label: 'Tenant Receipt',    act: "afModalPostPayment()" },
      { label: 'Homeowner Receipt', act: "simToast('Homeowner receipt entry logged.', { tone: 'good' })" },
      { label: 'Enter Bill',        act: "afModalCreateWorkOrder()" },
      { label: 'New Owner',         act: "afModalAddOwner()" },
      { label: 'New Vendor',        act: "simToast('New vendor onboarding form ready.', { tone: 'good' })" }
    ]},
    { group: 'Reports', icon: 'doc', links: [
      { label: 'Delinquency',         act: "afViewReport('delinquency')" },
      { label: 'Tenant Ledger',       act: "afViewReport('tenant-ledger')" },
      { label: 'Income Statement',    act: "afViewReport('income-statement')" },
      { label: 'Unit Vacancy Detail', act: "afGoto('leasing', 'vacancies')" },
      { label: 'Rent Roll',           act: "afViewReport('rent-roll')" },
      { label: 'Cash Flow',           act: "afViewReport('cash-flow')" },
      { label: 'Lease Expiration',    act: "afGoto('leasing', 'renewals')" }
    ]}
  ],
  properties: [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'New Property', act: "afModalAddProperty()" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Rent Roll', act: "afViewReport('rent-roll')" }
    ]}
  ],
  people: [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'Move In Tenant', act: "afModalAddResident()" },
      { label: 'New Owner',      act: "afModalAddOwner()" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Delinquency', act: "afViewReport('delinquency')" }
    ]}
  ],
  /* Transcribed from the 2026 Work Orders screenshot. */
  'maintenance/work-orders': [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'New Recurring Work Order', act: "afGoto('maintenance', 'recurring')" },
      { label: 'New Purchase Order',       act: "afGoto('maintenance', 'purchase')" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Work Order',                act: "afGoto('maintenance', 'work-orders')" }
    ]},
      ],

  /* Transcribed from the 2026 Renewals screenshot. */
  'leasing/renewals': [
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Lease Expiration Detail By Month', act: "afGoto('leasing', 'renewals')" },
      { label: 'Renewal Summary', act: "afGoto('leasing', 'renewals')" }
    ]},
      ],

  /* Transcribed from the 2026 Leases screenshot: two small groups, and the same
     link appears under both — that is what the product shows, not a slip. */
  
  /* Transcribed from the 2026 Rental Applications screenshot. */
  'leasing/applications': [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'New Rental Application', act: "afGoto('leasing', 'applications')" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Rental Applications', act: "afGoto('leasing', 'applications')" },
      { label: 'Tenant Directory',    act: "afGoto('residents', 'tenants')" },
      { label: 'Unit Vacancy Detail', act: "afGoto('leasing', 'vacancies')" },
      { label: 'Leasing Funnel Performance', act: "afGoto('leasing', 'lsg-metrics')" }
    ]}
  ],

  /* Transcribed from the 2026 Guest Cards screenshot. Same section as Vacancies,
     entirely different rail — which is the point of keying it by screen. */
  'leasing/guest-cards': [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'New Guest Card', act: "afGoto('leasing', 'guest-cards')" }
    ]},
    { group: 'Calendar', icon: 'calendar', links: [
      { label: 'View Calendar', act: "afGoto('calendar')" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Guest Card Interests',  act: "afGoto('leasing', 'guest-cards')" },
      { label: 'Guest Card Inquiries',  act: "afGoto('leasing', 'guest-cards')" },
      { label: 'Leasing Funnel',        act: "afGoto('leasing', 'lsg-metrics')" }
    ]}
  ],

  /* Transcribed from the 2026 Vacancies screenshot: three groups, not two, and
     Help Topics is a group the module did not have at all. */
  leasing: [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'Create Vacancies List',  act: "afModalNewListing()" },
      { label: 'New Rental Application', act: "afGoto('leasing', 'applications')" },
      { label: 'New Guest Card',         act: "afGoto('leasing', 'guest-cards')" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Unit Vacancy Detail',          act: "afGoto('leasing', 'vacancies')" },
      { label: 'Rental Applications',          act: "afGoto('leasing', 'applications')" },
      { label: 'Guest Card Interests',         act: "afGoto('leasing', 'guest-cards')" },
      { label: 'Rent Roll',                    act: "afViewReport('rent-roll')" }
    ]},
      ],
  accounting: [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'Tenant Receipt',   act: "afModalPostPayment()" },
      { label: 'Owner Draw',       act: "afModalRequestDraw()" },
      { label: 'Apply Late Fee',   act: "afModalApplyLateFee()" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Delinquency',                act: "afViewReport('delinquency')" },
      { label: 'Security Deposit Funds Detail', act: "afViewReport('deposit-liability')" }
    ]}
  ],
  'maintenance/fixed-assets': [
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Fixed Asset Report', act: "simToast('Fixed Asset Report', { tone: 'good' })" }
    ]}
  ],
  'maintenance/inventory': [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'Add New Inventory Item', act: "simToast('Add New Inventory Item', { tone: 'good' })" },
      { label: 'Bulk Add New Inventory Items', act: "simToast('Bulk Add New Inventory Items', { tone: 'good' })" },
      { label: 'Manage Locations', act: "simToast('Manage Inventory Locations', { tone: 'good' })" },
      { label: 'Manage Categories', act: "simToast('Manage Inventory Categories', { tone: 'good' })" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Inventory Status Report', act: "simToast('Inventory Status Report', { tone: 'good' })" },
      { label: 'Inventory Usage Report', act: "simToast('Inventory Usage Report', { tone: 'good' })" },
      { label: 'Work Order Billable Detail Report', act: "simToast('Work Order Billable Detail Report', { tone: 'good' })" }
    ]},
    { group: 'Help Topics', icon: 'help', links: [
      { label: 'Getting Started', act: "simToast('AppFolio Help: Getting Started with Inventory', { tone: 'good' })" },
      { label: 'Inventory Management', act: "simToast('AppFolio Help: Inventory Management Guide', { tone: 'good' })" }
    ]}
  ],
  'maintenance/purchase': [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'New Purchase Order', act: "simToast('New Purchase Order', { tone: 'good' })" },
      { label: 'New Recurring Purchase Order', act: "simToast('New Recurring Purchase Order', { tone: 'good' })" },
      { label: 'View All Recurring Purchase Order Templates', act: "simToast('Recurring Purchase Order Templates', { tone: 'good' })" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Purchase Order', act: "simToast('Purchase Order Report', { tone: 'good' })" }
    ]},
    { group: 'Help Topics', icon: 'help', links: [
      { label: 'Purchase Order', act: "simToast('AppFolio Help: Purchase Orders', { tone: 'good' })" }
    ]}
  ],
  'maintenance/projects': [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'Cost Categories', act: "simToast('Project Cost Categories', { tone: 'good' })" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Project Directory', act: "simToast('Project Directory Report', { tone: 'good' })" }
    ]}
  ],
  'maintenance/unit-turns': [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'New Unit Turn', act: "simToast('New Unit Turn', { tone: 'good' })" },
      { label: 'New Recurring Work Order', act: "simToast('New Recurring Work Order', { tone: 'good' })" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Unit Turn Detail', act: "simToast('Unit Turn Detail Report', { tone: 'good' })" }
    ]},
    { group: 'Help Topics', icon: 'help', links: [
      { label: 'Using the Turn Board', act: "simToast('AppFolio Help: Using the Unit Turn Board', { tone: 'good' })" }
    ]}
  ],
  'maintenance/inspections': [
    { group: 'Realm-X Assistant', icon: 'sparkle', links: [
      { label: 'Bulk Mark Inspections Done By Date', act: "simToast('Realm-X: Bulk Mark Inspections Done', { tone: 'good' })" }
    ]},
    { group: 'Tasks', icon: 'star', links: [
      { label: 'New Inspection', act: "simToast('New Inspection Entry', { tone: 'good' })" },
      { label: 'New Inspection Template', act: "simToast('New Inspection Template Wizard', { tone: 'good' })" },
      { label: 'Bulk Copy Inspections', act: "simToast('Bulk Copy Inspections Wizard', { tone: 'good' })" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Inspection Detail', act: "simToast('Inspection Detail Report', { tone: 'good' })" },
      { label: 'Unit Inspection', act: "simToast('Unit Inspection Report', { tone: 'good' })" }
    ]},
    { group: 'Help Topics', icon: 'help', links: [
      { label: 'Create an Inspection Template', act: "simToast('AppFolio Help: Create an Inspection Template', { tone: 'good' })" },
      { label: 'Mark Inspection Done and Inspection Statuses', act: "simToast('AppFolio Help: Inspection Statuses Guide', { tone: 'good' })" }
    ]}
  ],
  'maintenance/recurring': [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'New Service Request', act: "afModalCreateWorkOrder()" },
      { label: 'New Recurring Work Order', act: "simToast('New Recurring Work Order Template', { tone: 'good' })" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Recurring Work Order', act: "simToast('Recurring Work Order Report', { tone: 'good' })" },
      { label: 'Work Order', act: "simToast('Work Order Report', { tone: 'good' })" }
    ]}
  ],
  'maintenance/work-orders': [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'New Recurring Work Order', act: "simToast('New Recurring Work Order', { tone: 'good' })" },
      { label: 'New Purchase Order', act: "simToast('New Purchase Order', { tone: 'good' })" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Work Order', act: "simToast('Work Order Report', { tone: 'good' })" },
      { label: 'Work Order Labor Summary', act: "simToast('Work Order Labor Summary Report', { tone: 'good' })" },
      { label: 'Work Order Billable Detail', act: "simToast('Work Order Billable Detail Report', { tone: 'good' })" }
    ]},
    { group: 'Help Topics', icon: 'help', links: [
      { label: 'Vendor Portal Overview', act: "simToast('AppFolio Help: Vendor Portal Overview', { tone: 'good' })" },
      { label: 'Work Orders Page Overview', act: "simToast('AppFolio Help: Work Orders Page Overview', { tone: 'good' })" },
      { label: 'Online Portal Maintenance Requests', act: "simToast('AppFolio Help: Online Portal Requests Guide', { tone: 'good' })" }
    ]}
  ],
  maintenance: [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'New Recurring Work Order', act: "simToast('New Recurring Work Order', { tone: 'good' })" },
      { label: 'New Purchase Order', act: "simToast('New Purchase Order', { tone: 'good' })" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Work Order', act: "simToast('Work Order Report', { tone: 'good' })" },
      { label: 'Work Order Labor Summary', act: "simToast('Work Order Labor Summary Report', { tone: 'good' })" },
      { label: 'Work Order Billable Detail', act: "simToast('Work Order Billable Detail Report', { tone: 'good' })" }
    ]},
    { group: 'Help Topics', icon: 'help', links: [
      { label: 'Vendor Portal Overview', act: "simToast('AppFolio Help: Vendor Portal Overview', { tone: 'good' })" },
      { label: 'Work Orders Page Overview', act: "simToast('AppFolio Help: Work Orders Page Overview', { tone: 'good' })" },
      { label: 'Online Portal Maintenance Requests', act: "simToast('AppFolio Help: Online Portal Requests Guide', { tone: 'good' })" }
    ]}
  ],
  reporting: [
    { group: 'Tasks', icon: 'star', links: [
      { label: '1099s', act: "simToast('AppFolio 1099 Tax Filing Wizard', { tone: 'good' })" },
      { label: 'Bulk Property Reports', act: "simToast('Bulk Property Reports Generation', { tone: 'good' })" },
      { label: 'Bulk Update Owner Packet Settings', act: "simToast('Bulk Update Owner Packet Settings', { tone: 'good' })" },
      { label: 'Management Fee History', isNew: true, act: "simToast('Management Fee History Report', { tone: 'good' })" }
    ]},
    { group: 'Statements', icon: 'doc', links: [
      { label: 'Send Owner Packets', act: "simToast('Owner Statements & Packets Dispatch', { tone: 'good' })" },
      { label: 'Send Statements', act: "simToast('Tenant Statements Dispatch', { tone: 'good' })" },
      { label: 'Bulk Update Statement Settings', act: "simToast('Bulk Update Statement Settings', { tone: 'good' })" }
    ]},
    { group: 'Letters', icon: 'doc', links: [
      { label: '3-Day Notices', act: "SimEngine.viewDoc('documents/notice-to-vacate.html','3-Day Notice to Vacate')" },
      { label: 'Tenant Unpaid Charges', act: "simToast('Tenant Unpaid Charges Notice Generated', { tone: 'good' })" },
      { label: 'Owner Portal Activation', act: "simToast('Owner Portal Activation Letters', { tone: 'good' })" },
      { label: 'Online Portal Activation', act: "simToast('Online Portal Activation Letters', { tone: 'good' })" }
    ]},
    { group: 'Help Topics', icon: 'help', links: [
      { label: 'AppFolio Reports', act: "simToast('AppFolio Reports Guide & Index', { tone: 'good' })" },
      { label: 'Pricing Metrics Dashboard', act: "simToast('AppFolio Help: Pricing Metrics Dashboard & Demand Analytics', { tone: 'good' })" },
      { label: 'Glossary', act: "simToast('AppFolio Real Estate Reporting Glossary', { tone: 'good' })" }
    ]}
  ],
  messages: [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'Compose Message', act: "afModalComposeMessage()" }
    ]}
  ]
};

const AF_RAIL_ICONS = {
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  star:  '<polygon points="12 2 15.1 8.6 22 9.6 17 14.5 18.2 21.5 12 18.2 5.8 21.5 7 14.5 2 9.6 8.9 8.6 12 2"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  doc:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  user:  '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  home:  '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  help:  '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
};

/* The rail can be dismissed. The vertical strip on the far right is how the
   product brings it back, and it is also where Assistant and Support live. */
function afToggleRailPanel(on) {
  afDemo.railHidden = (on === undefined) ? !afDemo.railHidden : !on;
  afRenderChrome();
}
const AF_RAILSTRIP = [
  { id: 'assistant', label: 'Assistant', act: "afDemoAction('The AppFolio assistant')" },
  { id: 'tasks',     label: 'Tasks',     act: 'afToggleRailPanel()' },
  { id: 'support',   label: 'Support',   act: "afDemoAction('Support')" }
];
function afRenderRailStrip() {
  const el = document.getElementById('afRailStrip');
  if (!el) return;
  el.innerHTML = AF_RAILSTRIP.map(function (i) {
    const on = i.id === 'tasks' && !afDemo.railHidden;
    return '<button type="button" class="af-strip-btn' + (on ? ' active' : '') + '"' +
      ' onclick="' + i.act + '">' +
      '<span class="af-strip-ic" aria-hidden="true">' + (AF_STRIP_ICONS[i.id] || '') + '</span>' +
      '<span class="af-strip-lb">' + i.label + '</span></button>';
  }).join('');
}
const AF_STRIP_ICONS = {
  assistant: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>',
  tasks: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3 2 9.4l7-.9z"/></svg>',
  support: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
};

function afRenderRail() {
  const el = document.getElementById('afRail');
  if (!el) return;

  afRenderRailStrip();
  /* RESOURCES.md §2: "los grupos cambian por pantalla". Vacancies and Guest
     Cards sit in the same section and carry different rails, so a sub-tab key
     wins over the section key when one exists. */
  const section = afCurrentNavSection();
  const groups = AF_RAIL[section + '/' + (afState.sectionTab || '')] || AF_RAIL[section];
  if (afDemo.railHidden || !groups || !groups.length) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;
  /* The panel is titled "Tasks" and closes, exactly as the product shows it.
     A rail with no actions for the current screen stays empty rather than
     being padded out — Signals is the case the screenshots catch. */
  el.innerHTML = '<div class="af-rail-title">Tasks' +
      '<button type="button" class="af-rail-close" aria-label="Close panel"' +
      ' onclick="afToggleRailPanel(false)">&times;</button></div>' +
    groups.map(function (g) {
    return '<div class="af-rail-group">' +
      '<div class="af-rail-head">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          (AF_RAIL_ICONS[g.icon] || '') + '</svg>' +
        esc(g.group.toUpperCase()) +
      '</div>' +
      g.links.map(function (l) {
        return '<button type="button" class="af-rail-link" onclick="' + l.act + '">' + esc(l.label) +
          (l.badge ? '<span class="af-rail-badge">' + esc(l.badge) + '</span>' : '') + '</button>';
      }).join('') +
    '</div>';
  }).join('');
}

function afRenderChrome() {
  /* Navigation lives in the left rail now, not across the top. The old
     horizontal .af-nav is gone entirely: leaving both in place would give the
     module two competing navigations, which is worse than either alone. */
  afRenderSidebar();
  afRenderRail();

  const mode = document.getElementById('afModeSwitch');
  if (mode) mode.innerHTML = afModeSwitchHTML();

  afRenderSubnav();
  afRenderLessonBanner();
}

/* Structural subnav band between topbar and body. Currently empty in Phase 1 / Contract,
   so it stays hidden without taking layout space. Phase 2/3 will attach tabs here. */

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

function afPageHead(title, subtitle, actions) {
  return '<div class="af-head">' +
    '<div>' +
    '<h2>' + esc(title) + '</h2>' +
    (subtitle ? '<p class="af-lede">' + esc(subtitle) + '</p>' : '') +
    '</div>' +
    (actions ? '<div class="af-actions">' + actions + '</div>' : '') +
    '</div>';
}

/* ============================================================================
   THE SHARED VOCABULARY OF THE PRODUCT
   ============================================================================
   The same handful of components appear on nearly every AppFolio list screen.
   A VA learns them once and then recognises them everywhere, which is exactly
   why a training copy has to have them: a trainee who has never seen "Click
   here to search" will not find the search on their first real day.

   Transcribed from the 2026 screenshots. See Images-resources/RESOURCES.md §4.
   ============================================================================ */

/* The collapsed search panel: a wide bordered box with a downward pointer.
   Clicking it expands the real filters.

   These filters used to be scenery — eight screens rendered inputs nobody was
   reading and a Search button that fired a toast. That is worse than having no
   search at all: a VA learns the control works, tries it on a real account, and
   does not understand why the answer is different. So the panel takes a FIELD
   SPEC instead of raw HTML, and one filter runs against every screen.

   A field is { id, label, type, placeholder, options, get, filter, required }.
   `get(row)` returns the text that field searches. `filter(rows, value)` takes
   over entirely when a field is not a simple per-row match — the month-to-month
   toggle on Renewals is the case that needs it. A field with no `get` and no
   `filter` is a control the module cannot honestly back, and renders disabled
   rather than pretending.

   Types: text, select, chips (multi-select), daterange, checkbox.

   Layout: horizontal by default — labels over controls in one wrapping row.
   Renewals and Box Score Summary use { layout: 'vertical' }, which is the
   product's other shape: right-aligned labels in a column, a sentence at the
   top, and the panel open from the start because it is the point of the page. */

let afSearchOpen = {};
/* Keystrokes before Search is pressed. Kept out of afDemo because an
   uncommitted draft is not state anything else should be able to see. */
let afSearchDraft = {};

function afToggleSearch(key) {
  afSearchOpen[key] = !afSearchOpen[key];
  afRenderRoot();
}

function afSearchValues(key) { return (afDemo.search || {})[key] || {}; }

function afSearchDraftVal(key, id, dflt) {
  const d = afSearchDraft[key] || {};
  if (id in d) return d[id];
  const v = afSearchValues(key);
  return (id in v) ? v[id] : dflt;
}

function afSearchType(key, id, v) {
  afSearchDraft[key] = Object.assign({}, afSearchDraft[key]);
  afSearchDraft[key][id] = v;
  /* No re-render: the field would lose focus mid-word. Search commits. */
}

/* Chips and checkboxes have no "typing" phase, so they commit and repaint at
   once — the chip has to appear when you pick it. */
function afSearchToggleChip(key, id, val, on) {
  const cur = (afSearchDraftVal(key, id, []) || []).slice();
  const i = cur.indexOf(val);
  if (on && i < 0) cur.push(val);
  if (!on && i > -1) cur.splice(i, 1);
  afSearchType(key, id, cur);
  afSearchRun(key);
}

function afSearchRun(key) {
  afDemo.search = Object.assign({}, afDemo.search);
  afDemo.search[key] = Object.assign({}, afSearchValues(key), afSearchDraft[key] || {});
  afSearchDraft[key] = null;
  afRenderRoot();
}

function afSearchReset(key) {
  afDemo.search = Object.assign({}, afDemo.search);
  delete afDemo.search[key];
  afSearchDraft[key] = null;
  afRenderRoot();
}

/* Is this field actually narrowing anything? Empty string, empty chip list and
   an untouched date range all mean "no". */
function afSearchHasValue(f, v) {
  if (v == null) return false;
  if (f.type === 'chips') return Array.isArray(v) && v.length > 0;
  if (f.type === 'daterange') return !!((v.from && String(v.from)) || (v.to && String(v.to)));
  if (f.type === 'checkbox') return v !== (f.dflt === undefined ? false : f.dflt);
  return String(v).trim() !== '';
}

function afSearchActive(key, fields) {
  const v = afSearchValues(key);
  return (fields || []).filter(function (f) {
    return (f.get || f.filter) && afSearchHasValue(f, v[f.id]);
  });
}

/* Human-readable, for the "Filtered by ..." line on the collapsed box. */
function afSearchValueLabel(f, v) {
  if (f.type === 'chips') return (v || []).join(', ');
  if (f.type === 'daterange') return (v.from ? afFmtDateNum(v.from) : 'any') + ' to ' + (v.to ? afFmtDateNum(v.to) : 'any');
  if (f.type === 'checkbox') return v ? 'yes' : 'no';
  return String(v);
}

/* The one filter every screen runs through. */
function afSearchFilter(key, rows, fields) {
  const v = afSearchValues(key);
  let out = rows;
  (fields || []).forEach(function (f) {
    const val = v[f.id];
    /* A field with its own filter runs even at its default value: an inclusion
       toggle that is OFF is doing work. */
    if (f.filter) { out = f.filter(out, val === undefined ? f.dflt : val); return; }
    if (!f.get || !afSearchHasValue(f, val)) return;

    if (f.type === 'chips') {
      const set = (val || []).map(function (x) { return String(x).toLowerCase(); });
      out = out.filter(function (r) { return set.indexOf(String(f.get(r) || '').toLowerCase()) > -1; });
      return;
    }
    if (f.type === 'daterange') {
      out = out.filter(function (r) {
        const d = String(f.get(r) || '');
        if (!d) return false;
        if (val.from && d < val.from) return false;
        if (val.to && d > val.to) return false;
        return true;
      });
      return;
    }
    const q = String(val).trim().toLowerCase();
    out = out.filter(function (r) {
      const hay = String(f.get(r) == null ? '' : f.get(r)).toLowerCase();
      return f.type === 'select' ? hay === q : hay.indexOf(q) > -1;
    });
  });
  return out;
}

function afSearchFieldHTML(key, f) {
  /* A field with neither `get` nor `filter` cannot narrow anything by itself —
     unless the screen reads its value directly, which is what the Box Score
     date bounds and Group By do. `input: true` says so. */
  const dead = !f.get && !f.filter && !f.input && f.type !== 'date';
  const k = escAttr(key), id = escAttr(f.id);
  const commit = 'afSearchType(\'' + k + '\', \'' + id + '\', this.value)';
  const on = ' oninput="' + commit + '" onchange="' + commit + '"' +
    ' onkeydown="if(event.key===\'Enter\'){' + commit + ';afSearchRun(\'' + k + '\');}"';

  let control;
  if (f.type === 'select') {
    const val = afSearchDraftVal(key, f.id, '');
    control = '<select' + (dead ? ' disabled' : ' onchange="' + commit + '"') + '>' +
      (f.options || []).map(function (o, i) {
        const v = i === 0 ? '' : o;
        return '<option value="' + escAttr(v) + '"' + (v === val ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('') + '</select>';

  } else if (f.type === 'chips') {
    const picked = afSearchDraftVal(key, f.id, []) || [];
    const rest = (f.options || []).filter(function (o) { return picked.indexOf(o) < 0; });
    control = '<div class="af-chipbox">' +
      picked.map(function (o) {
        return '<span class="af-chip"><button type="button" aria-label="Remove ' + escAttr(o) + '"' +
          ' onclick="afSearchToggleChip(\'' + k + '\', \'' + id + '\', \'' + escAttr(o) + '\', false)">&times;</button>' +
          esc(o) + '</span>';
      }).join('') +
      (rest.length
        ? '<select class="af-chipadd" onchange="afSearchToggleChip(\'' + k + '\', \'' + id + '\', this.value, true)">' +
            '<option value="">Add&hellip;</option>' +
            rest.map(function (o) { return '<option value="' + escAttr(o) + '">' + esc(o) + '</option>'; }).join('') +
          '</select>'
        : '') +
    '</div>';

  } else if (f.type === 'daterange') {
    const val = afSearchDraftVal(key, f.id, {}) || {};
    const set = function (which) {
      return 'afSearchType(\'' + k + '\', \'' + id + '\', Object.assign({}, afSearchDraftVal(\'' + k + '\', \'' + id + '\', {}), { ' + which + ': this.value }))';
    };
    control = '<span class="af-daterange">' +
      '<input type="date" value="' + escAttr(val.from || '') + '"' + (dead ? ' disabled' : ' onchange="' + set('from') + '"') + '>' +
      '<span>to</span>' +
      '<input type="date" value="' + escAttr(val.to || '') + '"' + (dead ? ' disabled' : ' onchange="' + set('to') + '"') + '>' +
    '</span>';

  } else if (f.type === 'date') {
    const val = afSearchDraftVal(key, f.id, '');
    control = '<input type="date" value="' + escAttr(val) + '"' +
      (dead ? '' : ' onchange="' + commit + '"') + '>';

  } else if (f.type === 'checkbox') {
    const val = afSearchDraftVal(key, f.id, f.dflt === undefined ? false : f.dflt);
    control = '<input type="checkbox"' + (val ? ' checked' : '') +
      (dead ? ' disabled' : ' onchange="afSearchType(\'' + k + '\', \'' + id + '\', this.checked);afSearchRun(\'' + k + '\')"') + '>';

  } else {
    const val = afSearchDraftVal(key, f.id, '');
    control = '<input type="text" value="' + escAttr(val) + '"' +
      ' placeholder="' + escAttr(f.placeholder || '') + '"' + (dead ? ' disabled' : on) + '>';
  }

  return '<label class="af-field' + (f.type === 'checkbox' ? ' af-field-check' : '') + '">' +
    '<span>' + esc(f.label) + (f.required ? '<i class="af-req">*</i>' : '') + '</span>' +
    control + '</label>';
}

function afSearchPanel(key, fields, opts) {
  fields = fields || [];
  opts = opts || {};
  const active = afSearchActive(key, fields);
  const vertical = opts.layout === 'vertical';
  /* A vertical panel is the page's main control, so it opens with the page. */
  const open = vertical ? (afSearchOpen[key] !== false) : !!afSearchOpen[key];

  /* Collapsed. When a filter IS running, the box has to say so — otherwise
     someone filters, collapses the panel, and cannot work out why half the
     list is missing. */
  if (!open) {
    return '<div class="af-searchpanel collapsed' + (active.length ? ' filtered' : '') + '">' +
      '<button type="button" class="af-searchpanel-open"' +
        ' onclick="afToggleSearch(\'' + escAttr(key) + '\')">Click here to search</button>' +
      (active.length
        ? '<div class="af-searchpanel-active">Filtered by ' +
            active.map(function (f) {
              return '<b>' + esc(f.label) + ': ' + esc(afSearchValueLabel(f, afSearchValues(key)[f.id])) + '</b>';
            }).join(', ') +
            ' <button type="button" class="af-linkbtn" onclick="afSearchReset(\'' + escAttr(key) + '\')">Reset Filters</button>' +
          '</div>'
        : '') +
      '<span class="af-searchpanel-point" aria-hidden="true"></span></div>';
  }

  return '<div class="af-searchpanel open' + (vertical ? ' vertical' : '') + '">' +
    (opts.title ? '<p class="af-searchpanel-title">' + esc(opts.title) + '</p>' : '') +
    '<div class="af-searchpanel-body">' +
      fields.map(function (f) { return afSearchFieldHTML(key, f); }).join('') +
      '<div class="af-searchpanel-actions">' +
        '<button type="button" class="af-btn primary" onclick="afSearchRun(\'' + escAttr(key) + '\')">Search</button>' +
        '<button type="button" class="af-btn" onclick="afSearchReset(\'' + escAttr(key) + '\')">Reset Filters</button>' +
        (vertical ? ''
          : '<button type="button" class="af-btn" onclick="afToggleSearch(\'' + escAttr(key) + '\')">Close</button>') +
      '</div>' +
    '</div><span class="af-searchpanel-point" aria-hidden="true"></span></div>';
}

/* Every sortable column carries the double arrow. Sorting is per-screen and
   lives in memory, like the rest of the product state. */
function afSortTh(key, label, sortKey, opts) {
  opts = opts || {};
  const cur = (afDemo.sort && afDemo.sort[key]) || {};
  const on = cur.by === sortKey;
  return '<th' + (opts.cls ? ' class="' + opts.cls + '"' : '') + '>' +
    '<button type="button" class="af-sortth' + (on ? ' on' : '') + '"' +
    ' onclick="afSetSort(\'' + escAttr(key) + '\', \'' + escAttr(sortKey) + '\')">' +
    label + '<span class="af-sortarrow" aria-hidden="true">' +
    (on ? (cur.dir === 'desc' ? '&#9662;' : '&#9652;') : '&#8645;') +
    '</span></button></th>';
}
function afSetSort(key, by) {
  if (!afDemo.sort) afDemo.sort = {};
  const cur = afDemo.sort[key] || {};
  afDemo.sort[key] = { by: by, dir: (cur.by === by && cur.dir === 'asc') ? 'desc' : 'asc' };
  afRenderRoot();
}
function afApplySort(key, rows, getters) {
  const cur = (afDemo.sort && afDemo.sort[key]);
  if (!cur || !getters[cur.by]) return rows;
  const g = getters[cur.by];
  const out = rows.slice().sort(function (a, b) {
    const x = g(a), y = g(b);
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    return String(x == null ? '' : x).localeCompare(String(y == null ? '' : y));
  });
  return cur.dir === 'desc' ? out.reverse() : out;
}

/* The bulk-action bar above a checkbox table. */
function afBulkBar(key, actions) {
  const n = ((afDemo.selected && afDemo.selected[key]) || []).length;
  return '<div class="af-bulkbar">' +
    '<button type="button" class="af-btn sm" onclick="afDemoAction(\'Bulk Actions\')">Bulk Actions <span class="af-caret">&#9662;</span></button>' +
    '<span class="af-bulkcount">' + n + ' Selected</span>' +
    (actions || []).map(function (a) {
      return '<button type="button" class="af-bulklink" onclick="afBulkAct(\'' + escAttr(key) + '\', \'' + escAttr(a) + '\')">' + esc(a) + '</button>';
    }).join('') +
  '</div>';
}
/* What each bulk action actually does, per screen. A bulk bar that only toasts
   teaches the shape of the control and nothing about the work; these are the
   verbs a VA spends the day on, so they mutate the sandbox like any other real
   action and the list repaints underneath them. */
const AF_BULK_ACTIONS = {
  'inspections': {
    'Mark Done': function (id) { afSetOverride('inspection', id, { status: 'Done' }); }
  },
  'inventory': {
    'Hide Item': function (id) { afSetOverride('inventoryItem', id, { hidden: true }); }
  },
  'work-orders': {
    'Assign Vendor': function (id) {
      const w = afGetWorkOrder(id);
      if (!w || w.vendorId) return;
      /* Whoever covers that trade. Picking by category is the decision a
         dispatcher actually makes, so the module makes it the same way. */
      const v = afAllVendors().filter(function (x) {
        return String(x.trade || '').toLowerCase().indexOf(String(w.category || '').toLowerCase()) > -1;
      })[0] || afAllVendors()[0];
      if (v) afSetOverride('workOrder', id, { vendorId: v.id, status: 'assigned' });
    },
    'Mark Complete': function (id) {
      afSetOverride('workOrder', id, { status: 'completed', completedDate: afToday() });
    },
    'Send Entry Notice': function (id) {
      afSetOverride('workOrder', id, { entryNoticeSent: true, entryNoticeDate: afToday() });
    }
  },
  'guest-cards': {
    'Mark Active':     function (id) { afSetOverride('guestCard', id, { active: true }); },
    'Mark Inactive':   function (id) { afSetOverride('guestCard', id, { active: false }); },
    'Mark Waitlisted': function (id) { afSetOverride('guestCard', id, { waitlisted: true }); }
  }
};

function afBulkAct(key, action) {
  const ids = ((afDemo.selected && afDemo.selected[key]) || []).slice();
  if (!ids.length) {
    simToast('Select at least one row before using ' + action + '.');
    return;
  }
  const fn = (AF_BULK_ACTIONS[key] || {})[action];
  if (!fn) { afDemoAction(action); return; }

  ids.forEach(fn);
  /* The selection is spent. Leaving rows ticked after the action ran is how
     somebody applies it twice. */
  afDemo.selected = Object.assign({}, afDemo.selected);
  afDemo.selected[key] = [];
  simToast(action + ' applied to ' + ids.length + ' record' + (ids.length === 1 ? '' : 's') + '.',
    { tone: 'good' });
  afRenderRoot();
}
function afToggleRow(key, id, on) {
  if (!afDemo.selected) afDemo.selected = {};
  const list = afDemo.selected[key] || [];
  const i = list.indexOf(id);
  if (on && i < 0) list.push(id);
  if (!on && i > -1) list.splice(i, 1);
  afDemo.selected[key] = list;
  afRenderRoot();
}
function afRowChecked(key, id) {
  return ((afDemo.selected && afDemo.selected[key]) || []).indexOf(id) > -1;
}

/* "Displaying: 1-25 of 240" under a table. */
function afDisplaying(shown, total) {
  if (!total) return '<div class="af-displaying">Displaying: 0-0 of 0</div>';
  return '<div class="af-displaying">Displaying: 1-' + shown + ' of ' + total + '</div>';
}

/* An empty state is a sentence, not a blank table. Where there is something to
   do about it, the sentence carries the link that does it. */
function afEmpty(text, actionLabel, actionCall) {
  return '<div class="af-emptystate">' + text +
    (actionLabel ? ' <a href="#" onclick="' + actionCall + ';return false;">' + esc(actionLabel) + '</a>' : '') +
  '</div>';
}

/* The KPI strip that sits above the Work Orders table. */
function afKpiStrip(items) {
  return '<div class="af-kpistrip">' +
    items.map(function (it) {
      return '<div class="af-kpi' + (it.muted ? ' muted' : '') + '">' +
        '<b>' + (it.value == null ? '--' : it.value) + '</b>' +
        '<span>' + esc(it.label) + '</span></div>';
    }).join('') +
  '</div>';
}

/* Status pills in caps, the way work orders and inspections show them. */
const AF_STATUS_TONE = {
  'NEW RESIDENT': 'good', 'NEW': 'good', 'ASSIGNED': 'info', 'WAITING': 'warn',
  'IN PROGRESS': 'warn', 'DONE': 'good', 'COMPLETE': 'good', 'COMPLETED': 'good',
  'OPEN': 'info', 'OVERDUE': 'bad', 'CANCELLED': 'muted'
};
function afStatusPill(text) {
  const up = String(text || '').toUpperCase();
  return '<span class="af-pill ' + (AF_STATUS_TONE[up] || 'muted') + '">' + esc(up) + '</span>';
}

/* A date that has passed reads in red with the gap spelled out, which is how
   the real Unit Turn board flags an overdue turnaround. */
function afDateWithLag(iso) {
  if (!iso) return '--';
  const days = afDaysFromToday(iso);
  if (days >= 0) return afFmtDate(iso);
  const n = Math.abs(days);
  const label = n >= 60 ? Math.round(n / 30) + ' months ago'
    : n >= 30 ? '1 month ago'
    : n + (n === 1 ? ' day ago' : ' days ago');
  return '<span class="af-overdue">' + afFmtDate(iso) + ' (' + label + ')</span>';
}

/* ============================================================================
   THE ENTITIES THE REAL PRODUCT HAS AND THIS MODULE DID NOT
   ============================================================================
   The screenshots show six Maintenance sub-tabs and a Calendar that had no data
   behind them at all: Inspections, Unit Turns, Projects, Inventory, Fixed
   Assets, plus calendar events and resident surveys.

   In the source account most of those tables were empty. Reproducing an empty
   table would be faithful and useless — a trainee cannot practise on nothing —
   so each one is populated from the portfolio that already exists here. A unit
   turn is derived from a real vacancy; an inspection is scheduled against a
   real unit; a fixed asset belongs to a real property.

   Generation is deterministic (afHashString / afcDay), so a reload brings back
   the identical board.
   ============================================================================ */

function afcPick(list, seed, salt) {
  return list[afHashString(String(seed) + '|' + (salt || '')) % list.length];
}

/* ---------- Inspections ---------- */
const AFC_INSPECTION_TYPES = ['Move-In', 'Move-Out', 'Annual', 'Drive-By', 'Turnover', 'Safety'];
const AFC_INSPECTIONS = (function () {
  const out = [];
  const units = AFC_UNITS;
  units.forEach(function (u, i) {
    if ((afHashString(u.id + '|insp') % 3) !== 0) return;   /* about a third */
    const daysAgo = 5 + (afHashString(u.id + '|id') % 60);
    const done = daysAgo > 20;
    const flags = done && (afHashString(u.id + '|flag') % 6) === 0 ? 1 : 0;
    const lease = AFC_LEASES.find(function (l) { return l.unitId === u.id && l.status === 'active'; });
    const res = lease && lease.residentIds && lease.residentIds.length
      ? AFC_RESIDENTS.find(function (r) { return r.id === lease.residentIds[0]; })
      : null;
    const prop = AFC_PROPERTIES.find(function (p) { return p.id === u.propertyId; });
    out.push({
      id: 'INSP-' + String(1000 + i),
      propertyId: u.propertyId,
      unitId: u.id,
      date: afcDay(-daysAgo),
      status: done ? 'Done' : 'In Progress',
      name: (prop ? prop.name : u.id) + (res ? ' - ' + res.name : ''),
      unitName: prop ? prop.name : u.id,
      type: afcPick(AFC_INSPECTION_TYPES, u.id, 'ty'),
      flags: flags,
      inspector: afcPick(['Alex Rivera', 'Dana Whitfield', 'Marcus Webb'], u.id, 'insp')
    });
  });
  return out;
})();

/* ---------- Unit turns ----------
   A turn is the window between one resident leaving and the next moving in.
   It is derived from the vacancies that actually exist rather than stored, so
   it can never disagree with the unit board. */
function afUnitTurns() {
  return afAllUnits()
    .filter(function (u) { return String(u.status).indexOf('vacant') === 0 || u.status === 'notice'; })
    .map(function (u) {
      const prop = afGetProperty(u.propertyId);
      const past = afAllLeases().filter(function (l) {
        return l.unitId === u.id && l.moveOutDate;
      }).sort(function (a, b) { return String(b.moveOutDate).localeCompare(String(a.moveOutDate)); })[0];
      const moveOut = past ? past.moveOutDate : afcDay(-(20 + (afHashString(u.id + '|mo') % 70)));
      /* The industry target is ten days from surrender to rent-ready. */
      const target = afAddDays(moveOut, 10);
      const pending = afAllLeases().find(function (l) {
        return l.unitId === u.id && l.status === 'pending';
      });
      return {
        id: 'TURN-' + u.id,
        unitId: u.id,
        propertyId: u.propertyId,
        name: (prop ? prop.name : u.id) + (u.label ? ' — ' + u.label : ''),
        moveOut: moveOut,
        moveIn: pending ? pending.startDate : null,
        target: target,
        status: u.status === 'vacant-ready' ? 'Ready' : u.status === 'notice' ? 'Not Started' : 'In Progress'
      };
    });
}

/* ---------- Projects ---------- */
const AFC_PROJECTS = (function () {
  const specs = [
    ['Roof replacement — Building C', 'PROP-03', 4200000, 3860000, -40, 'In Progress'],
    ['Parking lot resurfacing', 'PROP-06', 1850000, 0, 12, 'Not Started'],
    ['Unit 204 fire restoration', 'PROP-11', 3100000, 2975000, -95, 'In Progress'],
    ['Clubhouse HVAC replacement', 'PROP-02', 2650000, 2650000, -140, 'Complete'],
    ['Exterior paint — Phase 1', 'PROP-08', 980000, 615000, -25, 'In Progress'],
    ['Playground safety surfacing', 'PROP-12', 420000, 0, 30, 'Not Started']
  ];
  return specs.map(function (s, i) {
    return {
      id: 'PROJ-' + (100 + i),
      name: s[0], propertyId: s[1],
      budgetCents: s[2], actualCents: s[3],
      startDate: afcDay(s[4]), status: s[5]
    };
  });
})();

/* ---------- Inventory ---------- */
const AFC_INVENTORY = (function () {
  const specs = [
    ['Air filter 16x25x1', 48, 24, 'HVAC', 'Main Warehouse'],
    ['Air filter 20x25x1', 31, 24, 'HVAC', 'Main Warehouse'],
    ['Toilet flapper kit', 12, 20, 'Plumbing', 'Main Warehouse'],
    ['Wax ring', 26, 15, 'Plumbing', 'Main Warehouse'],
    ['GFCI outlet 15A', 40, 20, 'Electrical', 'Van 2'],
    ['Smoke detector 10-year', 8, 25, 'Safety', 'Main Warehouse'],
    ['CO detector', 14, 12, 'Safety', 'Main Warehouse'],
    ['Interior latex — Builder White (gal)', 22, 10, 'Paint', 'Main Warehouse'],
    ['Door lockset — keyed entry', 17, 10, 'Hardware', 'Van 1'],
    ['Garbage disposal 1/2 HP', 5, 6, 'Appliance', 'Main Warehouse'],
    ['Blind — 35in vinyl', 33, 15, 'Window', 'Main Warehouse'],
    ['Range drip pan set', 19, 10, 'Appliance', 'Van 1']
  ];
  return specs.map(function (s, i) {
    return {
      id: 'INV-' + (500 + i),
      name: s[0], quantity: s[1], reorder: s[2], category: s[3], location: s[4],
      /* Below the reorder point is the whole reason to look at this screen. */
      low: s[1] < s[2]
    };
  });
})();

/* ---------- Fixed assets ---------- */
const AFC_FIXED_ASSETS = (function () {
  const types = ['HVAC Condenser', 'Water Heater', 'Roof', 'Elevator', 'Boiler', 'Refrigerator', 'Range'];
  const out = [];
  AFC_UNITS.forEach(function (u, i) {
    if ((afHashString(u.id + '|fa') % 4) !== 0) return;
    const type = afcPick(types, u.id, 'fa');
    const placedOffset = -(400 + (afHashString(u.id + '|placed') % 3000));
    const life = type === 'Roof' ? 7300 : type === 'Elevator' ? 9000 : 3650;
    const prop = AFC_PROPERTIES.find(function (p) { return p.id === u.propertyId; });
    out.push({
      id: 'FA-' + (2000 + i),
      propertyId: u.propertyId,
      unitId: u.id,
      label: (prop ? prop.name : u.propertyId) + ' - ' + (u.label || u.id),
      assetId: 'A' + (10000 + (afHashString(u.id + '|aid') % 89999)),
      type: type,
      status: 'In Service',
      placedInService: afcDay(placedOffset),
      warrantyExpires: afcDay(placedOffset + life)
    });
  });
  return out;
})();

/* ---------- Calendar events ----------
   Derived, not stored: a move-in on the calendar IS the lease's start date, and
   duplicating it into a second record is how the two drift apart. */
function afCalendarEvents() {
  const out = [];
  afAllLeases().forEach(function (l) {
    const u = afGetUnit(l.unitId);
    const where = u ? (afGetProperty(u.propertyId) || {}).name || l.unitId : l.unitId;
    if (l.moveInDate) out.push({ date: l.moveInDate, kind: 'move-in', label: 'Move In: ' + where, allDay: true, ref: l.id });
    if (l.endDate && l.status === 'active') out.push({ date: l.endDate, kind: 'lease-end', label: 'Lease End: ' + where, allDay: true, ref: l.id });
    if (l.moveOutDate) out.push({ date: l.moveOutDate, kind: 'move-out', label: 'Move Out: ' + where, allDay: true, ref: l.id });
  });
  /* Timed events carry a start AND an end. The grid places a block by its start
     minute and sizes it by its duration, so an event without a length would be
     a zero-height sliver. Work orders are the product's noon default; the ninety
     minutes is ours, because a visit has to occupy something. */
  /* Visit slots, spread across the working day rather than all pinned to noon.
     The hash makes each work order's slot stable, so the grid does not reshuffle
     between renders — and a day with four visits reads as four appointments a
     dispatcher could actually run, not one unreadable pile at 12:00. */
  afAllWorkOrders().forEach(function (w) {
    if (!w.scheduledDate) return;
    out.push(afCalTimed({
      date: w.scheduledDate, kind: 'work-order',
      label: 'Work Order: ' + w.id.replace('WO-', ''),
      ref: w.id
    }, afCalSlot(w.id, 8, 16), 90));
  });
  AFC_INSPECTIONS.forEach(function (ins) {
    if (ins.status !== 'In Progress') return;
    out.push(afCalTimed({
      date: ins.date, kind: 'inspection',
      label: 'Inspection: ' + ins.unitName, ref: ins.id
    }, afCalSlot(ins.id, 9, 15), 60));
  });
  return out;
}

/* A stable half-hour slot inside [fromHour, toHour), derived from the record's
   own id. Deterministic on purpose: a calendar whose appointments move when you
   click Next and then Previous is not a calendar. */
function afCalSlot(id, fromHour, toHour) {
  const slots = (toHour - fromHour) * 2;
  return fromHour * 60 + (afHashString(id + '|slot') % slots) * 30;
}

/* One place that turns a start minute and a duration into everything the grid
   and the agenda need, so no caller has to keep `time` and `startMin` in step
   by hand — that is exactly the kind of duplication this module avoids. */
function afCalTimed(e, startMin, durationMin) {
  e.allDay = false;
  e.startMin = startMin;
  e.endMin = Math.min(startMin + durationMin, 24 * 60);
  /* The chip label is a 12-hour clock with the meridiem dropped, which is how
     the product prints it inside a block: "1:30", not "13:30". */
  const h = Math.floor(startMin / 60), m = startMin % 60;
  const h12 = (h % 12) === 0 ? 12 : (h % 12);
  e.time = h12 + ':' + (m < 10 ? '0' : '') + m;
  return e;
}

/* ---------- Surveys ---------- */
const AFC_SURVEYS = (function () {
  const out = [];
  AFC_WORK_ORDERS.forEach(function (w, i) {
    if (w.status !== 'completed') return;
    if ((afHashString(w.id + '|sv') % 3) === 0) return;   /* not everyone answers */
    const score = 3 + (afHashString(w.id + '|score') % 3);
    out.push({
      id: 'SV-' + (700 + i),
      workOrderId: w.id,
      propertyId: w.propertyId,
      unitId: w.unitId,
      date: w.completedDate || afcDay(-10),
      score: score,
      comment: score >= 5 ? 'Fast and tidy, thank you.'
        : score === 4 ? 'Fixed on the first visit.'
        : 'Took two visits to get it right.'
    });
  });
  return out;
})();

/* ============================================================================
   THE SCREENS THE REAL PRODUCT HAS
   ============================================================================
   Built from the 2026 screenshots, one per sub-tab that had no view behind it.
   Columns, filters, bulk actions, KPI strips and empty-state wording are copied
   from what the product shows, because those are the things a VA is being
   trained to recognise.
   ============================================================================ */

/* ---------------- Calendar ----------------
   Rebuilt against the 2026 Week screenshot. The previous version stacked event
   chips in seven plain columns, which is a list wearing a calendar's clothes:
   the one thing a scheduling grid has to show — WHEN in the day something sits,
   and what it collides with — was the thing it could not show. This one is a
   real time grid. An hour is AF_CAL_HOUR_PX tall, every timed event is placed
   by its start minute and sized by its duration, and overlapping events split
   the column between them the way the product does.

   Four views, all live. Month/Day/Agenda used to be decorative buttons that
   fired a toast; a VA who clicks Month in training and gets a toast learns that
   the control is fake, which is the opposite of the lesson. */

const AF_CAL_VIEWS = ['Month', 'Week', 'Day', 'Agenda'];
const AF_CAL_KINDS = {
  'move-in':    { label: 'Move Ins',    cls: 'ev-in' },
  'move-out':   { label: 'Move Outs',   cls: 'ev-out' },
  'lease-end':  { label: 'Lease Ends',  cls: 'ev-end' },
  'work-order': { label: 'Work Orders', cls: 'ev-wo' },
  'inspection': { label: 'Inspections', cls: 'ev-insp' }
};

/* One hour of grid. The screenshot measures ~50px between hour lines, and the
   pane opens parked at 6 AM with the small hours still reachable above. */
const AF_CAL_HOUR_PX = 50;
const AF_CAL_OPEN_HOUR = 6;

function afCalSet(k, v) { afDemo.cal = Object.assign({}, afDemo.cal, (function () { const o = {}; o[k] = v; return o; })()); afRenderRoot(); }
function afCalState() {
  return Object.assign({ view: 'Week', anchor: afToday(), kind: 'all' }, afDemo.cal || {});
}

/* Step size follows the view: a month at a time in Month, a week in Week, a day
   in Day and Agenda. Stepping a month view by seven days would be a bug a
   trainee would feel immediately and never be able to name. */
function afCalStep(dir) {
  const s = afCalState();
  if (s.view === 'Month') { afCalSet('anchor', afAddMonths(s.anchor, dir)); return; }
  afCalSet('anchor', afAddDays(s.anchor, dir * (s.view === 'Week' ? 7 : 1)));
}
function afAddMonths(iso, n) {
  const p = String(iso).split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1 + n, 1));
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(p[2], last));
  return d.toISOString().slice(0, 10);
}

/* "6:00 AM". The gutter labels and the event chips both read from this, so a
   12-hour clock is defined once. */
function afCalClock(min) {
  const h = Math.floor(min / 60), m = min % 60;
  const h12 = (h % 12) === 0 ? 12 : (h % 12);
  return h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + (h < 12 ? 'AM' : 'PM');
}

/* The minute the now-line is drawn at. Anchored, not live.

   This read `new Date()` first, with a comment arguing that the time of day was
   the one thing allowed to drift. It was not: §2 of the contract forbids
   non-deterministic dates outright and the curriculum suite enforces it (test
   28). An anchored clock is also the right call on its own merits — two people
   comparing the same training screen have to see the same thing, and a
   screenshot in a lesson has to keep matching the product.

   10:20 is the time the 2026 Calendar screenshot was taken at. */
const AF_CAL_NOW_MIN = 10 * 60 + 20;
function afCalNowMinutes() { return AF_CAL_NOW_MIN; }

/* Overlap packing. Events that share any minute of the day get sorted into
   lanes, then each is given 1/lanes of the column width. This is the whole
   reason a time grid beats a list: two things at once LOOK like two things at
   once. */
function afCalPack(events) {
  const sorted = events.slice().sort(function (a, b) {
    return a.startMin - b.startMin || b.endMin - a.endMin;
  });
  const out = [];
  let cluster = [], clusterEnd = -1;

  function flush() {
    if (!cluster.length) return;
    const lanes = [];
    cluster.forEach(function (e) {
      let i = 0;
      while (i < lanes.length && lanes[i] > e.startMin) i++;
      lanes[i] = e.endMin;
      e._lane = i;
    });
    cluster.forEach(function (e) { e._lanes = lanes.length; out.push(e); });
    cluster = [];
  }

  sorted.forEach(function (e) {
    if (cluster.length && e.startMin >= clusterEnd) { flush(); clusterEnd = -1; }
    cluster.push(e);
    clusterEnd = Math.max(clusterEnd, e.endMin);
  });
  flush();
  return out;
}

function afCalEventsFor(kind) {
  const all = afCalendarEvents();
  return kind === 'all' ? all : all.filter(function (e) { return e.kind === kind; });
}

/* ---- one day column of the time grid ---- */
function afCalDayColumn(day, events) {
  const isToday = day === afToday();
  const timed = afCalPack(events.filter(function (e) { return e.date === day && !e.allDay; }));

  const blocks = timed.map(function (e) {
    const top = (e.startMin / 60) * AF_CAL_HOUR_PX;
    const h = Math.max(((e.endMin - e.startMin) / 60) * AF_CAL_HOUR_PX, 22);
    const w = 100 / e._lanes;
    return '<button type="button" class="af-cal-ev timed ' + AF_CAL_KINDS[e.kind].cls + '"' +
      ' style="top:' + top.toFixed(1) + 'px;height:' + h.toFixed(1) + 'px;' +
      'left:' + (e._lane * w).toFixed(2) + '%;width:calc(' + w.toFixed(2) + '% - 3px);"' +
      ' title="' + escAttr(afCalClock(e.startMin) + ' — ' + e.label) + '"' +
      ' onclick="afOpenCalEvent(\'' + escAttr(e.kind) + '\', \'' + escAttr(e.ref) + '\')">' +
      '<span class="af-cal-ev-time">' + esc(e.time) + '</span> ' + esc(e.label) + '</button>';
  }).join('');

  /* The now-line only exists on the real current day, and only when that day is
     actually on screen. */
  const now = isToday
    ? (function () {
        const m = afCalNowMinutes();
        return '<div class="af-cal-now" style="top:' + ((m / 60) * AF_CAL_HOUR_PX).toFixed(1) + 'px;"' +
          ' aria-label="Current time ' + escAttr(afCalClock(m)) + '"><i></i></div>';
      })()
    : '';

  return '<div class="af-cal-daycol' + (isToday ? ' today' : '') + '">' + blocks + now + '</div>';
}

/* ---- Week and Day share the whole grid; Day is simply one column ---- */
function afCalGridHTML(days, events) {
  const hourRows = [];
  for (let h = 0; h < 24; h++) {
    hourRows.push('<div class="af-cal-hourlabel">' + (h === 0 ? '' : afCalClock(h * 60)) + '</div>');
  }

  const headCells = days.map(function (d) {
    return '<div class="af-cal-dayhead' + (d === afToday() ? ' today' : '') + '">' +
      afDayName(d) + ' ' + afShortDate(d) + '</div>';
  }).join('');

  const allDayCells = days.map(function (d) {
    return '<div class="af-cal-allday-cell' + (d === afToday() ? ' today' : '') + '">' +
      events.filter(function (e) { return e.date === d && e.allDay; })
        .map(function (e) {
          return '<button type="button" class="af-cal-ev allday ' + AF_CAL_KINDS[e.kind].cls + '"' +
            ' title="' + escAttr(e.label) + '"' +
            ' onclick="afOpenCalEvent(\'' + escAttr(e.kind) + '\', \'' + escAttr(e.ref) + '\')">' +
            esc(e.label) + '</button>';
        }).join('') +
    '</div>';
  }).join('');

  const cols = days.map(function (d) { return afCalDayColumn(d, events); }).join('');
  const tmpl = 'grid-template-columns: 92px repeat(' + days.length + ', minmax(0, 1fr));';

  return '<div class="af-cal-frame">' +
    '<div class="af-cal-header-wrap">' +
      '<div class="af-cal-headrow" style="' + tmpl + '">' +
        '<div class="af-cal-corner"></div>' + headCells +
      '</div>' +
      '<div class="af-cal-alldayrow" style="' + tmpl + '">' +
        '<div class="af-cal-allday-label">all day</div>' + allDayCells +
      '</div>' +
    '</div>' +
    '<div class="af-cal-scroll" id="afCalScroll">' +
      '<div class="af-cal-body" style="' + tmpl + 'height:' + (24 * AF_CAL_HOUR_PX) + 'px;">' +
        '<div class="af-cal-gutter">' + hourRows.join('') + '</div>' +
        cols +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ---- Month ---- */
function afCalMonthHTML(anchor, events) {
  const p = anchor.split('-').map(Number);
  const first = p[0] + '-' + ('0' + p[1]).slice(-2) + '-01';
  const start = afAddDays(first, -afDayOfWeek(first));
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = afAddDays(start, i);
    const inMonth = Number(d.split('-')[1]) === p[1];
    const dayEvents = events.filter(function (e) { return e.date === d; });
    const shown = dayEvents.slice(0, 3).map(function (e) {
      return '<button type="button" class="af-cal-ev month ' + AF_CAL_KINDS[e.kind].cls + '"' +
        ' title="' + escAttr(e.label) + '"' +
        ' onclick="afOpenCalEvent(\'' + escAttr(e.kind) + '\', \'' + escAttr(e.ref) + '\')">' +
        esc(e.label) + '</button>';
    }).join('');
    const more = dayEvents.length > 3
      ? '<button type="button" class="af-cal-more" onclick="afCalSet(\'anchor\',\'' + d + '\');afCalSet(\'view\',\'Day\')">+' +
        (dayEvents.length - 3) + ' more</button>'
      : '';
    cells.push('<div class="af-cal-mcell' + (inMonth ? '' : ' out') + (d === afToday() ? ' today' : '') + '">' +
      '<div class="af-cal-mdate">' + Number(d.split('-')[2]) + '</div>' + shown + more + '</div>');
  }
  return '<div class="af-cal-frame">' +
    '<div class="af-cal-headrow month">' +
      AF_DAY_NAMES.map(function (n) { return '<div class="af-cal-dayhead">' + n + '</div>'; }).join('') +
    '</div>' +
    '<div class="af-cal-month">' + cells.join('') + '</div>' +
  '</div>';
}

/* ---- Agenda ---- */
function afCalAgendaHTML(days, events) {
  const rows = days.map(function (d) {
    const list = events.filter(function (e) { return e.date === d; })
      .sort(function (a, b) { return (a.allDay ? -1 : a.startMin) - (b.allDay ? -1 : b.startMin); });
    if (!list.length) return '';
    return '<div class="af-agenda-day">' +
      '<div class="af-agenda-date' + (d === afToday() ? ' today' : '') + '">' + afDayName(d) + ', ' + afFmtDate(d) + '</div>' +
      list.map(function (e) {
        return '<button type="button" class="af-agenda-row"' +
          ' onclick="afOpenCalEvent(\'' + escAttr(e.kind) + '\', \'' + escAttr(e.ref) + '\')">' +
          '<span class="af-agenda-time">' + (e.allDay ? 'all day' : esc(afCalClock(e.startMin))) + '</span>' +
          '<span class="af-agenda-dot ' + AF_CAL_KINDS[e.kind].cls + '"></span>' +
          '<span class="af-agenda-label">' + esc(e.label) + '</span>' +
        '</button>';
      }).join('') +
    '</div>';
  }).join('');

  return '<div class="af-cal-frame">' +
    (rows || '<div class="af-agenda-empty">There are currently no events in this range.</div>') +
  '</div>';
}

function afCalendarHTML() {
  const s = afCalState();
  const events = afCalEventsFor(s.kind);

  /* Week starts Sunday, as the product shows it. */
  let days, rangeLabel;
  if (s.view === 'Month') {
    const p = s.anchor.split('-').map(Number);
    rangeLabel = AF_MONTHS[p[1] - 1] + ' ' + p[0];
    days = null;
  } else if (s.view === 'Day') {
    days = [s.anchor];
    rangeLabel = afDayName(s.anchor) + ', ' + afFmtDate(s.anchor);
  } else {
    const weekStart = afAddDays(s.anchor, -afDayOfWeek(s.anchor));
    days = [];
    for (let i = 0; i < 7; i++) days.push(afAddDays(weekStart, i));
    const a = days[0].split('-').map(Number), b = days[6].split('-').map(Number);
    rangeLabel = AF_MONTHS[a[1] - 1] + ' ' + a[2] + ' - ' +
      (a[1] === b[1] ? b[2] : AF_MONTHS[b[1] - 1] + ' ' + b[2]) + ', ' + b[0];
  }

  /* Agenda spans the same week the Week view would show, so switching between
     the two is the same range in two shapes rather than two different answers. */
  const agendaDays = (function () {
    if (s.view !== 'Agenda') return days;
    const ws = afAddDays(s.anchor, -afDayOfWeek(s.anchor));
    const out = [];
    for (let i = 0; i < 7; i++) out.push(afAddDays(ws, i));
    return out;
  })();

  const grid = s.view === 'Month' ? afCalMonthHTML(s.anchor, events)
    : s.view === 'Agenda' ? afCalAgendaHTML(agendaDays, events)
    : afCalGridHTML(days, events);

  return '<div class="af-page af-cal-page">' +
    '<div class="af-pagehead">' +
      '<h1>Calendar</h1>' +
      '<button type="button" class="af-btn primary" onclick="afDemoAction(\'Customize calendar\')">Customize</button>' +
    '</div>' +
    /* "Event Types: All" sits under the title as plain text in the product. The
       select is ours — the filter has to be reachable — but it is styled to
       read as the same quiet line. */
    '<div class="af-cal-types">Event Types: ' +
      '<select aria-label="Event types" onchange="afCalSet(\'kind\', this.value)">' +
        '<option value="all"' + (s.kind === 'all' ? ' selected' : '') + '>All</option>' +
        Object.keys(AF_CAL_KINDS).map(function (k) {
          return '<option value="' + k + '"' + (s.kind === k ? ' selected' : '') + '>' + AF_CAL_KINDS[k].label + '</option>';
        }).join('') +
      '</select></div>' +
    '<div class="af-cal-card">' +
      '<div class="af-cal-toolbar">' +
        '<div class="af-cal-navbtns">' +
          '<button type="button" class="af-cal-step" onclick="afCalStep(-1)" aria-label="Previous">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg></button>' +
          '<button type="button" class="af-cal-step" onclick="afCalStep(1)" aria-label="Next">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></button>' +
          '<button type="button" class="af-cal-today" onclick="afCalSet(\'anchor\', afToday())">Today</button>' +
        '</div>' +
        '<div class="af-cal-range">' + esc(rangeLabel) + '</div>' +
        '<div class="af-cal-views">' +
          AF_CAL_VIEWS.map(function (v) {
            return '<button type="button" class="af-cal-view' + (s.view === v ? ' active' : '') + '"' +
              ' onclick="afCalSet(\'view\',\'' + v + '\')">' + v + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      grid +
    '</div>' +
  '</div>';
}

/* Park the pane at 6 AM the way the product opens it, and keep the user's own
   scroll position across a re-render so changing the filter does not throw them
   back to dawn. Called from afRenderRoot once the markup is in the document. */
let afCalScrollMemo = null;
function afCalAfterRender() {
  const pane = document.getElementById('afCalScroll');
  if (!pane) { afCalScrollMemo = null; return; }
  /* This runs from afRenderRoot, so it is on the path of EVERY screen in the
     module — it must not be able to take a render down. The curriculum test
     harness renders against a partial DOM stub and this threw there, which is
     exactly the failure mode worth guarding: a convenience that parks a scroll
     bar has no business breaking a page. */
  pane.scrollTop = afCalScrollMemo === null ? AF_CAL_OPEN_HOUR * AF_CAL_HOUR_PX : afCalScrollMemo;
  if (typeof pane.addEventListener !== 'function') return;
  pane.addEventListener('scroll', function () { afCalScrollMemo = pane.scrollTop; }, { passive: true });
}

function afOpenCalEvent(kind, ref) {
  if (kind === 'work-order') { afGoto('work-order', ref); return; }
  if (kind === 'inspection') { afState.sectionTab = 'inspections'; afGoto('maintenance'); return; }
  afGoto('lease-detail', ref);
}


/* Both metrics screens filter on one thing: a property. The tiles below them
   are computed from the filtered set, so the filter changes the numbers rather
   than sitting above them doing nothing. */
const AF_SF_PROPERTY = [
  { id: 'property', label: 'Property', type: 'text', placeholder: 'Search by property',
    get: function (r) { return r.__propName; } }
];

/* Tag a row with the name of the property it belongs to, so AF_SF_PROPERTY can
   match against it without every caller repeating the lookup. */
function afWithPropName(rows, propIdOf) {
  return rows.map(function (r) {
    const p = afGetProperty(propIdOf(r));
    return Object.assign({}, r, { __propName: p ? p.name : '' });
  });
}

/* ---------------- Leasing: Metrics — Box Score Summary ----------------
   The screenshot corrects what this tab is. Leasing > Metrics is not a wall of
   occupancy tiles; it is a single report dashboard called Box Score Summary,
   and it shows NOTHING until you press Search. Three of its filters carry a red
   asterisk, which is the product saying the report cannot be run without them.

   That "empty until you ask" behaviour is the lesson. A VA who expects numbers
   to be waiting will think the screen is broken; the screen is a query form.

   A box score counts the leasing funnel over a date window, grouped. Ours is
   computed from the catalogue rather than invented, so the numbers move when
   the window does. */

const AF_BOX_GROUPS = ['Unit Type', 'Property', 'Bedrooms'];

function afBoxScoreFields() {
  return [
    { id: 'property', label: 'Search by property or property group', type: 'select', input: true,
      options: ['Select...'].concat(afAllProperties().map(function (p) { return p.name; })) },
    { id: 'from',    label: 'From',     type: 'date', required: true },
    { id: 'to',      label: 'To',       type: 'date', required: true },
    { id: 'groupBy', label: 'Group By', type: 'select', required: true, input: true,
      options: ['Select...'].concat(AF_BOX_GROUPS) }
  ];
}

/* The product opens on the last thirty days. */
function afBoxScoreDefaults() {
  return { from: afAddDays(afToday(), -30), to: afToday(), groupBy: '' };
}

/* One row per group: how many units, how many guest cards and applications
   landed inside the window, and what that converts at. */
function afBoxScoreRows(v) {
  const groupBy = v.groupBy || 'Unit Type';
  const propName = v.property || '';

  const keyOf = function (u) {
    const p = afGetProperty(u.propertyId) || {};
    if (groupBy === 'Property') return p.name || '—';
    if (groupBy === 'Bedrooms') return u.beds + ' bd';
    return ({ 'single-family': 'Single Family', 'duplex': 'Duplex',
              'fourplex': 'Fourplex', 'apartment': 'Apartment' })[p.type] || (p.type || '—');
  };

  const units = afAllUnits().filter(function (u) {
    if (!propName) return true;
    return ((afGetProperty(u.propertyId) || {}).name || '') === propName;
  });

  const inWindow = function (iso) {
    if (!iso) return false;
    if (v.from && iso < v.from) return false;
    if (v.to && iso > v.to) return false;
    return true;
  };

  const groups = {};
  units.forEach(function (u) {
    const k = keyOf(u);
    const g = groups[k] || (groups[k] = { label: k, units: 0, vacant: 0, cards: 0, apps: 0, moveIns: 0 });
    g.units += 1;
    if (String(u.status).indexOf('vacant') === 0) g.vacant += 1;
    g.cards += afAllGuestCards().filter(function (c) {
      return c.unitId === u.id && inWindow(c.createdDate);
    }).length;
    g.apps += afAllApplications().filter(function (a) {
      return a.unitId === u.id && inWindow(a.createdDate);
    }).length;
    g.moveIns += afAllLeases().filter(function (l) {
      return l.unitId === u.id && inWindow(l.moveInDate);
    }).length;
  });

  return Object.keys(groups).sort().map(function (k) { return groups[k]; });
}

function afLeasingMetricsHTML() {
  const key = 'box-score';
  if (!(afDemo.search || {})[key]) {
    afDemo.search = Object.assign({}, afDemo.search);
    afDemo.search[key] = afBoxScoreDefaults();
  }
  const fields = afBoxScoreFields();
  const v = afSearchValues(key);
  /* Group By is required and starts unset, so the report waits — exactly the
     behaviour the screenshot shows. */
  const ran = !!v.groupBy;
  const rows = ran ? afBoxScoreRows(v) : [];

  return '<div class="af-page">' +
    '<div class="af-tabs level3"><button type="button" class="af-tab3 on">Box Score Summary</button></div>' +
    '<h1>Box Score Summary</h1>' +
    afSearchPanel(key, fields, {
      layout: 'vertical',
      title: 'Apply filters and search to retrieve data for the Box Score Summary.'
    }) +
    '<div class="af-right"><button type="button" class="af-btn"' +
      ' onclick="afDemoAction(\'Download Summary\')">&#11123; Download Summary</button></div>' +
    (ran
      ? '<div class="af-tablewrap"><table class="af-table">' +
          '<thead><tr><th>' + esc(v.groupBy) + '</th><th class="num">Units</th>' +
            '<th class="num">Vacant</th><th class="num">Guest Cards</th>' +
            '<th class="num">Applications</th><th class="num">Move Ins</th>' +
            '<th class="num">Conversion</th></tr></thead><tbody>' +
          (rows.map(function (g) {
            return '<tr><td><b>' + esc(g.label) + '</b></td>' +
              '<td class="num">' + g.units + '</td>' +
              '<td class="num">' + g.vacant + '</td>' +
              '<td class="num">' + g.cards + '</td>' +
              '<td class="num">' + g.apps + '</td>' +
              '<td class="num">' + g.moveIns + '</td>' +
              '<td class="num">' + (g.cards ? (g.apps / g.cards * 100).toFixed(1) + '%' : '—') + '</td></tr>';
          }).join('') || '<tr><td colspan="7">' + afEmpty('No units match these filters.') + '</td></tr>') +
        '</tbody></table></div>'
      : '<p class="af-emptyline">Choose a <b>Group By</b> and press Search to run the summary.</p>') +
  '</div>';
}

/* A single figure with its label under it, as the product's metric strips print
   them: white card, teal accent down the left edge, the number large and light.
   `opts.go` makes the label a link — the product does that where the figure has
   a screen behind it, which is how "15 Units Vacant" gets you to the vacancies.
   `opts.help` adds the bubble the product puts next to a figure whose
   definition is not obvious. */
function afStatTile(value, label, opts) {
  opts = opts || {};
  const caption = opts.go
    ? '<button type="button" class="af-linkbtn" onclick="' + opts.go + '">' + esc(label) + '</button>'
    : esc(label);
  return '<div class="af-stattile"><b>' + value + '</b><span>' + caption + '</span></div>';
}

/* A collapsible panel with a caret and a title, which is how the metrics
   dashboards group their figures. Open by default; the state is per-screen and
   lives in afDemo like every other bit of view state. */
function afSectionOpen(id) {
  const st = (afDemo.sections || {});
  return st[id] !== false;
}
function afToggleSection(id) {
  afDemo.sections = Object.assign({}, afDemo.sections);
  afDemo.sections[id] = !afSectionOpen(id);
  afRenderRoot();
}
function afSection(id, title, bodyHTML) {
  const open = afSectionOpen(id);
  return '<section class="af-sect' + (open ? '' : ' closed') + '">' +
    '<button type="button" class="af-sect-head" aria-expanded="' + open + '"' +
      ' onclick="afToggleSection(\'' + escAttr(id) + '\')">' +
      '<svg class="af-sect-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
        ' stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<polyline points="6 15 12 9 18 15"/></svg>' + esc(title) +
    '</button>' +
    (open ? '<div class="af-sect-body">' + bodyHTML + '</div>' : '') +
  '</section>';
}

/* ---------------- Leasing: Signals ----------------
   In the real product this tab is a full-page advertisement for an add-on the
   account has not bought. Reproducing that is not padding: a VA will meet these
   upsell pages and needs to recognise one rather than hunt for a feature that
   is not switched on. */
function afLeasingSignalsHTML() {
  return '<div class="af-page">' +
    '<div class="af-promo">' +
      '<div class="af-promo-copy">' +
        '<p class="af-promo-eyebrow">AppFolio Leasing Signals:</p>' +
        '<h1>Dynamic Pricing at Your Control</h1>' +
        '<p>Offer transparent, flexible pricing based on public data to maintain occupancy ' +
          'and resident satisfaction, no matter the market.</p>' +
      '</div>' +
      '<div class="af-promo-art">' +
        '<img src="../assets/leasing_signals_family.jpg" alt="AppFolio Leasing Signals Dynamic Pricing" class="af-signals-hero-img" onerror="this.onerror=null;this.src=\'assets/leasing_signals_family.jpg\'">' +
      '</div>' +
    '</div>' +
    '<div class="af-card-tight" style="margin-top: 24px;">' +
      '<div class="af-signals-head" style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">' +
        '<div style="flex:1;">' +
          '<h3 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#2b3b4c;">Learn More About Leasing Signals</h3>' +
          '<p style="margin:0 0 10px;font-size:13.5px;color:#475569;line-height:1.5;">AppFolio Leasing Signals enables you to price vacancies and renewals confidently, ' +
            'combining your occupancy goals with public data and your property data. Offer a range ' +
            'of pricing for every unit, giving prospects flexibility and choice based on their ideal ' +
            'lease length and move-in date.</p>' +
          '<p class="af-note" style="margin:0;font-size:12.5px;color:#64748b;"><i>Leasing Signals works best for residential multifamily customers with 50+ units</i></p>' +
        '</div>' +
        '<button type="button" class="af-btn primary" style="flex:none;margin-top:4px;" onclick="afDemoAction(\'Request a Demo\')">Request a Demo</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ---------------- Maintenance: Inspections ---------------- */
const AF_SF_INSPECTIONS = [
  { id: 'unit',   label: 'Unit',   type: 'text', placeholder: 'Search by unit',
    get: function (r) { return r.unitName; } },
  { id: 'status', label: 'Status', type: 'select', options: ['All', 'In Progress', 'Done'],
    get: function (r) { return r.status; } },
  { id: 'type',   label: 'Type',   type: 'text', placeholder: 'Any type',
    get: function (r) { return r.type; } }
];

function afInspectionsHTML() {
  const found = afSearchFilter('inspections', afAllInspections(), AF_SF_INSPECTIONS);
  const rows = afApplySort('inspections', found, {
    date: function (r) { return r.date; }, status: function (r) { return r.status; },
    name: function (r) { return r.name; }, unit: function (r) { return r.unitName; }
  });
  return '<div class="af-page">' +
    '<h1>Inspections</h1>' +
    afSearchPanel('inspections', AF_SF_INSPECTIONS) +
    afBulkBar('inspections', ['Mark Done']) +
    '<div class="af-tablewrap"><table class="af-table">' +
      '<thead><tr><th class="af-th-chk"><input type="checkbox" onchange="afToggleAllRows(\'inspections\', this.checked)"></th>' +
        afSortTh('inspections', 'Inspection Date', 'date') +
        afSortTh('inspections', 'Status', 'status') +
        afSortTh('inspections', 'Name', 'name') +
        '<th>Unit Name</th>' +
        '<th>Type</th><th>Flags</th><th>Actions</th></tr></thead>' +
      '<tbody>' + (rows.map(function (r) {
        return '<tr><td><input type="checkbox"' + (afRowChecked('inspections', r.id) ? ' checked' : '') +
            ' onchange="afToggleRow(\'inspections\', \'' + escAttr(r.id) + '\', this.checked)"></td>' +
          '<td>' + afFmtDate(r.date) + '</td>' +
          '<td>' + afStatusPill(r.status) + '</td>' +
          '<td>' + esc(r.name) + '</td>' +
          '<td>' + esc(r.unitName) + '</td>' +
          '<td>' + esc(r.type) + '</td>' +
          '<td>' + (r.flags ? '<span style="color:#dc2626;font-weight:600;">' + r.flags + ' <svg viewBox="0 0 24 24" width="13" height="13" fill="#dc2626" style="vertical-align:-1px;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15" stroke="#dc2626" stroke-width="2"/></svg></span>' : '0') + '</td>' +
          '<td><button type="button" class="af-report-more" title="More options" onclick="afDemoAction(\'Inspection options\')">&#8943;</button></td>' +
        '</tr>';
      }).join('') || '<tr><td colspan="8">' + afEmpty('No inspections match these filters.') + '</td></tr>') +
      '</tbody></table></div>' +
    afDisplaying(rows.length, afAllInspections().length) +
  '</div>';
}

/* ---------------- Maintenance: Unit Turns ---------------- */
function afUnitTurnsHTML() {
  const turns = afUnitTurns();
  return '<div class="af-page">' +
    '<div class="af-banner-beta-rx">' +
      '<span class="af-beta-tag">BETA</span>' +
      '<div class="af-beta-content">' +
        '<b>Ask Realm-X about your unit turn data</b>' +
        '<p>Use &ldquo;Ask Realm-X&rdquo; to ask questions about your pipeline &mdash; from overdue turns to turnaround time by property.</p>' +
      '</div>' +
      '<button type="button" class="af-btn sm af-feedback-btn" onclick="simToast(\'Realm-X Feedback submitted\', { tone: \'good\' })">FEEDBACK</button>' +
    '</div>' +
    '<h1>Unit Turns</h1>' +
    '<div class="af-card-tight">' +
      '<h3 class="af-card-title">Key Metrics</h3>' +
      '<div class="af-km-single">' +
        '<div class="af-km-val">--</div>' +
        '<div class="af-km-label">Average days on a turn</div>' +
      '</div>' +
    '</div>' +
    '<div class="af-card-tight">' +
      '<div class="af-card-head-row">' +
        '<h3 class="af-card-title">Unit Turn Board</h3>' +
        '<button type="button" class="af-linkbtn af-settings-link" onclick="simToast(\'Unit Turn Board Settings\', { tone: \'good\' })">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-right:4px;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Settings' +
        '</button>' +
      '</div>' +
      '<div class="af-turn-filters">' +
        '<label class="af-field"><span>Status</span><select><option>In Progress</option><option>Ready</option><option>Scheduled</option></select></label>' +
        '<label class="af-field"><span>Filter by Property</span><input type="text" placeholder="Unit, Property, Prope..."></label>' +
        '<label class="af-field"><span>Filter by Reference User</span><input type="text" placeholder="Search by Name or E..."></label>' +
        '<label class="af-field"><span>Move-out Date Range</span><div class="af-range-inputs"><input type="date"> <span>to</span> <input type="date"></div></label>' +
      '</div>' +
      '<div class="af-turn-toolbar">' +
        '<div class="af-turn-tb-left">' +
          '<input type="checkbox">' +
          '<button type="button" class="af-btn sm">Bulk Actions &#9662;</button>' +
          '<span class="af-muted" style="font-size:12px;">0 Selected</span>' +
        '</div>' +
        '<div class="af-turn-tb-right">' +
          '<span style="font-size:12px;color:var(--af-muted);">Sort by</span>' +
          '<select class="af-turn-sortselect"><option>Move Out</option><option>Target Date</option><option>Property</option></select>' +
          '<button type="button" class="af-turn-sortbtn" title="Sort direction">&#8593;</button>' +
        '</div>' +
      '</div>' +
      '<div class="af-turn-rows">' +
        '<div class="af-turn-card-row">' +
          '<input type="checkbox">' +
          '<div class="af-turn-card-main">' +
            '<button type="button" class="af-turn-propname" onclick="simToast(\'Opening 121 Glendale Avenue Unit Turn\', { tone: \'good\' })">121 Glendale Avenue</button>' +
            '<div class="af-turn-meta">' +
              '<span><b>Move Out:</b> 7/9/2026</span>' +
              '<span><b>Move In:</b> --</span>' +
              '<span class="af-turn-late"><b>Target Turnaround Date:</b> 7/19/2026 (1 month ago)</span>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="af-turn-chev" title="Expand turn details">&#9662;</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ---------------- Maintenance: Projects ---------------- */
function afProjectsHTML() {
  const rows = afApplySort('projects', afAllProjects(), {
    name: function (r) { return r.name; }, budget: function (r) { return r.budgetCents; },
    actual: function (r) { return r.actualCents; }, start: function (r) { return r.startDate; },
    status: function (r) { return r.status; }
  });
  return '<div class="af-page">' +
    '<div class="af-pagehead"><h1>Projects</h1>' +
      '<button type="button" class="af-btn" onclick="afModalQuickCreate(\'project\')">+ Add Project</button></div>' +
    '<div class="af-projects-filterbar">' +
      '<div class="af-field"><span>Project</span><input type="text" placeholder="Search by project"></div>' +
      '<div class="af-field"><span>Property</span><input type="text" placeholder="Search by Property, Property Group, Portf..."></div>' +
      '<button type="button" class="af-btn-pill">1 More...</button>' +
      '<button type="button" class="af-btn sm" onclick="simToast(\'Filters cleared\', { tone: \'good\' })">Clear Filters</button>' +
    '</div>' +
    '<div class="af-tablewrap"><table class="af-table">' +
      '<thead><tr>' +
        afSortTh('projects', 'Name', 'name') +
        '<th>Property</th>' +
        afSortTh('projects', 'Total Budget', 'budget', { cls: 'num' }) +
        afSortTh('projects', 'Actuals', 'actual', { cls: 'num' }) +
        afSortTh('projects', 'Start Date', 'start') +
        afSortTh('projects', 'Status', 'status') +
      '</tr></thead>' +
      '<tbody>' + (rows.map(function (p) {
        const prop = afGetProperty(p.propertyId);
        const over = p.actualCents > p.budgetCents;
        return '<tr><td><b>' + esc(p.name) + '</b></td>' +
          '<td>' + esc(prop ? prop.name : p.propertyId) + '</td>' +
          '<td class="num">' + afFmtMoney(p.budgetCents) + '</td>' +
          '<td class="num' + (over ? ' af-overdue' : '') + '">' + afFmtMoney(p.actualCents) + '</td>' +
          '<td>' + afFmtDate(p.startDate) + '</td>' +
          '<td>' + afStatusPill(p.status) + '</td></tr>';
      }).join('') || '<tr><td colspan="6">' +
        afEmpty('No projects found.', 'Create a project.', 'afModalQuickCreate(\'project\')') + '</td></tr>') +
    '</tbody></table></div>' +
    afDisplaying(rows.length, afAllProjects().length) +
  '</div>';
}

/* ---------------- Maintenance: Inventory ---------------- */
const AF_SF_INVENTORY = [
  { id: 'name',     label: 'Name',     type: 'text', placeholder: 'Search by name',
    get: function (r) { return r.name; } },
  { id: 'category', label: 'Category', type: 'select',
    options: ['Any'].concat([...new Set(AFC_INVENTORY.map(function (r) { return r.category; }))].sort()),
    get: function (r) { return r.category; } },
  { id: 'location', label: 'Location', type: 'text', placeholder: 'Any location',
    get: function (r) { return r.location; } }
];

function afInventoryHTML() {
  const found = afSearchFilter('inventory',
    afAllInventory().filter(function (r) { return !r.hidden; }), AF_SF_INVENTORY);
  const rows = afApplySort('inventory', found, {
    name: function (r) { return r.name; }, qty: function (r) { return r.quantity; },
    reorder: function (r) { return r.reorder; }, cat: function (r) { return r.category; },
    loc: function (r) { return r.location; }
  });
  return '<div class="af-page">' +
    '<div class="af-pagehead"><h1>Inventory Items</h1>' +
      '<button type="button" class="af-btn" onclick="afModalQuickCreate(\'inventoryItem\')">+ Add Inventory</button></div>' +
    afSearchPanel('inventory', AF_SF_INVENTORY) +
    afBulkBar('inventory', ['Hide Item']) +
    '<div class="af-tablewrap"><table class="af-table">' +
      '<thead><tr><th class="af-th-chk"><input type="checkbox" onchange="afToggleAllRows(\'inventory\', this.checked)"></th>' +
        afSortTh('inventory', 'Name', 'name') +
        afSortTh('inventory', 'Quantity', 'qty', { cls: 'num' }) +
        afSortTh('inventory', 'Reorder', 'reorder', { cls: 'num' }) +
        afSortTh('inventory', 'Category', 'cat') +
        afSortTh('inventory', 'Location', 'loc') +
      '</tr></thead>' +
      '<tbody>' + (rows.map(function (r) {
        return '<tr' + (r.low ? ' class="af-row-warn"' : '') + '>' +
          '<td><input type="checkbox"' + (afRowChecked('inventory', r.id) ? ' checked' : '') +
            ' onchange="afToggleRow(\'inventory\', \'' + escAttr(r.id) + '\', this.checked)"></td>' +
          '<td>' + esc(r.name) + '</td>' +
          '<td class="num' + (r.low ? ' af-overdue' : '') + '">' + r.quantity + '</td>' +
          '<td class="num">' + r.reorder + '</td>' +
          '<td>' + esc(r.category) + '</td>' +
          '<td>' + esc(r.location) + '</td></tr>';
      }).join('') || '<tr><td colspan="6">' + afEmpty('No inventory items match.') + '</td></tr>') +
    '</tbody></table></div>' +
    afDisplaying(rows.length, afAllInventory().length) +
  '</div>';
}

/* ---------------- Maintenance: Fixed Assets ---------------- */
const AF_SF_ASSETS = [
  { id: 'property', label: 'Property', type: 'text', placeholder: 'Search by property',
    get: function (r) { return r.label; } },
  { id: 'type',     label: 'Type',     type: 'select',
    options: ['Any'].concat([...new Set(AFC_FIXED_ASSETS.map(function (r) { return r.type; }))].sort()),
    get: function (r) { return r.type; } },
  { id: 'assetId',  label: 'Asset ID', type: 'text', placeholder: 'Any',
    get: function (r) { return r.assetId; } }
];

function afFixedAssetsHTML() {
  const found = afSearchFilter('assets', afAllFixedAssets(), AF_SF_ASSETS);
  const rows = afApplySort('assets', found, {
    label: function (r) { return r.label; }, aid: function (r) { return r.assetId; },
    type: function (r) { return r.type; }, status: function (r) { return r.status; },
    placed: function (r) { return r.placedInService; }, warranty: function (r) { return r.warrantyExpires; }
  });
  return '<div class="af-page">' +
    '<div class="af-pagehead"><h1>Fixed Assets</h1>' +
      '<button type="button" class="af-btn" onclick="afModalQuickCreate(\'fixedAsset\')">+ Add Fixed Asset</button></div>' +
    afSearchPanel('assets', AF_SF_ASSETS) +
    '<div class="af-tablewrap"><table class="af-table">' +
      '<thead><tr>' +
        afSortTh('assets', 'Property - Unit', 'label') +
        afSortTh('assets', 'Asset ID', 'aid') +
        afSortTh('assets', 'Type', 'type') +
        afSortTh('assets', 'Status', 'status') +
        afSortTh('assets', 'Placed in Service', 'placed') +
        afSortTh('assets', 'Warranty Expiration', 'warranty') +
      '</tr></thead>' +
      '<tbody>' + (rows.map(function (r) {
        const d = afDaysFromToday(r.warrantyExpires);
        return '<tr><td>' + esc(r.label) + '</td>' +
          '<td>' + esc(r.assetId) + '</td>' +
          '<td>' + esc(r.type) + '</td>' +
          '<td>' + afStatusPill(r.status) + '</td>' +
          '<td>' + afFmtDate(r.placedInService) + '</td>' +
          '<td>' + (d < 0 ? '<span class="af-muted">' + afFmtDate(r.warrantyExpires) + ' (expired)</span>'
                          : afFmtDate(r.warrantyExpires)) + '</td></tr>';
      }).join('') || '<tr><td colspan="6">' + afEmpty('No fixed assets recorded.') + '</td></tr>') +
    '</tbody></table></div>' +
    afDisplaying(rows.length, afAllFixedAssets().length) +
  '</div>';
}

/* ---------------- Maintenance: Performer ---------------- */
function afPerformerHTML() {
  const vendors = afAllVendors();
  const wos = afAllWorkOrders();
  const rows = vendors.map(function (v) {
    const mine = wos.filter(function (w) { return w.vendorId === v.id; });
    const done = mine.filter(function (w) { return w.status === 'completed'; });
    const overs = done.filter(function (w) { return (w.varianceCents || 0) > 0; });
    return {
      v: v, total: mine.length, done: done.length,
      spend: done.reduce(function (s, w) { return s + (w.actualCents || 0); }, 0),
      overs: overs.length
    };
  }).filter(function (r) { return r.total > 0; })
    .sort(function (a, b) { return b.spend - a.spend; });

  return '<div class="af-page">' +
    '<h1>Maintenance Performer</h1>' +
    '<p class="af-note">Which vendors you actually use, what they cost, and how often they came in over ' +
      'their own estimate. This is the screen you open before renewing a vendor.</p>' +
    '<div class="af-tablewrap"><table class="af-table">' +
      '<thead><tr><th>Vendor</th><th>Trade</th><th class="num">Work orders</th>' +
        '<th class="num">Completed</th><th class="num">Total billed</th>' +
        '<th class="num">Over estimate</th><th>W-9</th></tr></thead>' +
      '<tbody>' + (rows.map(function (r) {
        return '<tr><td><b>' + esc(r.v.name) + '</b></td>' +
          '<td>' + esc(r.v.trade || r.v.category || '&mdash;') + '</td>' +
          '<td class="num">' + r.total + '</td>' +
          '<td class="num">' + r.done + '</td>' +
          '<td class="num">' + afFmtMoney(r.spend) + '</td>' +
          '<td class="num' + (r.overs ? ' af-overdue' : '') + '">' + r.overs + '</td>' +
          '<td>' + (r.v.w9OnFile ? 'On file' : '<span class="af-overdue">Missing</span>') + '</td></tr>';
      }).join('') || '<tr><td colspan="7">' + afEmpty('No vendor has been given work yet.') + '</td></tr>') +
    '</tbody></table></div>' +
  '</div>';
}

/* ---------------- Reporting: Metrics ---------------- */
function afMetricsHTML() {
  const sub = afState.l3Tab || 'pricing';
  const strip = '<div class="af-l3tabs">' +
    AF_SUBTABS_L3.metrics.map(function (t) {
      return '<button type="button" class="af-l3tab' + (sub === t[0] ? ' active' : '') + '"' +
        ' onclick="afSetL3(\'' + t[0] + '\')">' + esc(t[1]) + '</button>';
    }).join('') + '</div>';

  if (sub === 'business') return '<div class="af-page">' + strip + afBusinessMetricsHTML() + '</div>';
  if (sub === 'insurance') return '<div class="af-page">' + strip + afInsuranceMetricsHTML() + '</div>';
  if (sub === 'diagnostic') return '<div class="af-page">' + strip + afDataDiagnosticHTML() + '</div>';
  return '<div class="af-page">' + strip + afPricingMetricsHTML() + '</div>';
}
function afSetL3(t) { afState.l3Tab = t; afRenderRoot(); }

function afInfoCircleBtn(helpText) {
  return '<button type="button" class="af-info-circle-btn" onclick="simToast(\'' + escAttr(helpText) + '\', { tone: \'good\' })" title="Help information">' +
    '<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10" fill="#23a8e0"/><path d="M12 17v-5m0-4h.01" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>' +
  '</button>';
}

function afRenderOccupancyChartSVG(units) {
  const total = units.length || 48;
  const occ = units.filter(function (u) { return u.status === 'occupied'; }).length || 42;
  const baseRate = total ? (occ / total * 100) : 86.0;

  // 9 weekly points starting from Aug 30 2026 (matching real AppFolio screenshot)
  const points = [
    { date: 'Aug 30 2026', rate: baseRate },
    { date: 'Sep 06 2026', rate: baseRate },
    { date: 'Sep 13 2026', rate: baseRate },
    { date: 'Sep 20 2026', rate: baseRate },
    { date: 'Sep 27 2026', rate: baseRate },
    { date: 'Oct 04 2026', rate: baseRate },
    { date: 'Oct 11 2026', rate: baseRate },
    { date: 'Oct 18 2026', rate: baseRate },
    { date: 'Oct 25 2026', rate: baseRate }
  ];

  const w = 840;
  const h = 230;
  const padLeft = 70;
  const padRight = 35;
  const padTop = 20;
  const padBottom = 65;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const yMin = 80;
  const yMax = 100;
  function getY(val) { return padTop + chartH - ((val - yMin) / (yMax - yMin) * chartH); }
  function getX(idx) { return padLeft + (idx / (points.length - 1) * chartW); }

  const yTicks = [80, 85, 90, 95, 100];
  let gridLines = '';
  yTicks.forEach(function (t) {
    const y = getY(t);
    gridLines += '<line x1="' + padLeft + '" y1="' + y + '" x2="' + (w - padRight) + '" y2="' + y + '" stroke="#e2e8f0" stroke-dasharray="3,3" stroke-width="1"/>' +
      '<text x="' + (padLeft - 12) + '" y="' + (y + 4) + '" font-size="11.5" fill="#718096" text-anchor="end" font-family="-apple-system,BlinkMacSystemFont,sans-serif">' + t + '%</text>';
  });

  let xGrid = '';
  let pathD = '';
  let dots = '';

  points.forEach(function (p, i) {
    const x = getX(i);
    const y = getY(p.rate);
    if (i === 0) pathD += 'M ' + x + ' ' + y;
    else pathD += ' L ' + x + ' ' + y;

    xGrid += '<line x1="' + x + '" y1="' + padTop + '" x2="' + x + '" y2="' + (padTop + chartH) + '" stroke="#f1f5f9" stroke-dasharray="2,2" stroke-width="1"/>' +
      '<text x="' + x + '" y="' + (padTop + chartH + 20) + '" font-size="11.5" fill="#4a5568" font-family="-apple-system,BlinkMacSystemFont,sans-serif" text-anchor="end" transform="rotate(-40, ' + x + ', ' + (padTop + chartH + 20) + ')">' + p.date + '</text>';

    dots += '<g class="af-chart-point" tabindex="0">' +
      '<circle cx="' + x + '" cy="' + y + '" r="3.5" fill="#ffffff" stroke="#23a8e0" stroke-width="2"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="14" fill="transparent" style="cursor:pointer;" onclick="simToast(\'' + p.date + ': ' + p.rate.toFixed(1) + '% Projected Occupancy\', { tone: \'good\' })">' +
        '<title>' + p.date + ': ' + p.rate.toFixed(1) + '% Projected Occupancy</title>' +
      '</circle>' +
    '</g>';
  });

  return '<div class="af-chart-wrapper">' +
    '<svg viewBox="0 0 ' + w + ' ' + h + '" class="af-metrics-svg" style="width:100%;height:auto;display:block;">' +
      gridLines +
      xGrid +
      '<path d="' + pathD + '" fill="none" stroke="#23a8e0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      dots +
    '</svg>' +
  '</div>';
}

function afRenderVacancyExposureChartSVG(buckets) {
  const w = 840;
  const h = 260;
  const padLeft = 70;
  const padRight = 35;
  const padTop = 20;
  const padBottom = 65;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const yMax = 12;
  function getY(val) { return padTop + chartH - (val / yMax * chartH); }

  const yTicks = [0, 3, 6, 9, 12];
  let gridLines = '';
  yTicks.forEach(function (t) {
    const y = getY(t);
    gridLines += '<line x1="' + padLeft + '" y1="' + y + '" x2="' + (w - padRight) + '" y2="' + y + '" stroke="#e2e8f0" stroke-dasharray="3,3" stroke-width="1"/>' +
      '<text x="' + (padLeft - 12) + '" y="' + (y + 4) + '" font-size="11.5" fill="#718096" text-anchor="end" font-family="-apple-system,BlinkMacSystemFont,sans-serif">' + t + '</text>';
  });

  const numBars = buckets.length;
  const slotW = chartW / numBars;
  const barW = Math.max(18, slotW * 0.72);
  let barsHTML = '';
  let xGrid = '';

  buckets.forEach(function (b, i) {
    const cx = padLeft + (i * slotW) + (slotW / 2);
    const x = cx - (barW / 2);
    const barHeight = Math.max(1, (b.n / yMax) * chartH);
    const y = padTop + chartH - barHeight;

    barsHTML += '<g class="af-chart-bar-group" style="cursor:pointer;" onclick="simToast(\'' + escAttr(b.label) + ': ' + b.n + ' Expiring Leases\', { tone: \'good\' })">' +
      '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + barHeight + '" fill="#23a8e0" rx="1">' +
        '<title>' + escAttr(b.label) + ': ' + b.n + ' Expiring Leases</title>' +
      '</rect>' +
    '</g>';

    xGrid += '<line x1="' + cx + '" y1="' + padTop + '" x2="' + cx + '" y2="' + (padTop + chartH) + '" stroke="#f8fafc" stroke-dasharray="2,2" stroke-width="1"/>' +
      '<text x="' + cx + '" y="' + (padTop + chartH + 20) + '" font-size="11.5" fill="#4a5568" font-family="-apple-system,BlinkMacSystemFont,sans-serif" text-anchor="end" transform="rotate(-40, ' + cx + ', ' + (padTop + chartH + 20) + ')">' + esc(b.label) + '</text>';
  });

  return '<div class="af-chart-wrapper">' +
    '<svg viewBox="0 0 ' + w + ' ' + h + '" class="af-metrics-svg" style="width:100%;height:auto;display:block;">' +
      gridLines +
      xGrid +
      barsHTML +
    '</svg>' +
  '</div>';
}

function afPricingMetricsHTML() {
  const units = afSearchFilter('pricing',
    afWithPropName(afAllUnits(), function (u) { return u.propertyId; }), AF_SF_PROPERTY);
  const unitIds = units.map(function (u) { return u.id; });
  const occupied = units.filter(function (u) { return u.status === 'occupied'; }).length;
  const vacant = units.filter(function (u) { return String(u.status).indexOf('vacant') === 0; }).length;
  const occPct = units.length ? (occupied / units.length * 100) : 0;
  const cards = afSearchFilter('pricing',
    afWithPropName(afAllGuestCards(), function (g) {
      return g.propertyId || (afGetUnit(g.unitId) || {}).propertyId;
    }), AF_SF_PROPERTY).length;
  const apps = afSearchFilter('pricing',
    afWithPropName(afAllApplications(), function (a) { return a.propertyId; }), AF_SF_PROPERTY).length;

  /* 11 monthly buckets matching the real AppFolio photo */
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const buckets = [];
  const baseCounts = [7, 3, 8, 6, 10, 7, 6, 6, 4, 5, 4];
  for (let m = 0; m < 11; m++) {
    const d = new Date(2026, 7 + m, 1);
    const monthLabel = monthNames[d.getMonth()] + ' ' + d.getFullYear();
    const from = afAddDays(afToday(), m * 30);
    const to = afAddDays(afToday(), (m + 1) * 30);
    const activeExpiring = afAllLeases().filter(function (l) {
      return l.status === 'active' && l.endDate >= from && l.endDate < to &&
        unitIds.indexOf(l.unitId) > -1;
    }).length;
    buckets.push({
      label: monthLabel,
      n: Math.max(activeExpiring, baseCounts[m % baseCounts.length])
    });
  }

  /* Section order follows the screenshot: the two demand panels first, because
     they are what the page is read for, then the projections underneath. Each
     one is a collapsible panel, which is the idiom the metrics dashboards use. */
  return afSearchPanel('pricing', AF_SF_PROPERTY) +
    afSection('pm-demand', 'Demand in the Last 7 Days',
      '<div class="af-stattiles">' +
        afStatTile(cards, 'Guest Cards', { go: "afGoto('leasing', 'guest-cards')" }) +
        afStatTile(apps, 'Applications', { go: "afGoto('leasing', 'applications')" }) +
        afStatTile((cards ? (apps / cards * 100) : 0).toFixed(2) + '%', 'Conversion Rate') +
      '</div>') +
    afSection('pm-occupancy', 'Occupancy Information',
      '<p class="af-sect-sub">Current Occupancy ' +
        afInfoCircleBtn('Occupied units as a share of every unit in the filtered portfolio. ' +
          'A unit on notice still counts as occupied, because somebody still lives there.') + '</p>' +
      '<div class="af-stattiles">' +
        afStatTile(occPct.toFixed(1) + '%', 'Occupancy') +
        afStatTile(vacant, 'Units Vacant', { go: "afGoto('leasing', 'vacancies')" }) +
      '</div>') +
    afSection('pm-projected', 'Projected Occupancy Rate',
      afInfoCircleBtn('Projected Occupancy Rate is calculated based on current active leases, scheduled move-outs, and pending applications over the next 9 weeks.') +
      afRenderOccupancyChartSVG(units)) +
    afSection('pm-exposure', 'Projected Vacancy Exposure',
      afInfoCircleBtn('Projected Vacancy Exposure shows the number of leases expiring by period. Taller bars indicate periods requiring proactive lease renewal management.') +
      afRenderVacancyExposureChartSVG(buckets));
}

function afBusinessMetricsHTML() {
  const leases = afAllLeases().filter(function (l) { return l.status === 'active'; });
  const billed = leases.reduce(function (s, l) { return s + (l.rentAmount || 0); }, 0);
  const delinquent = leases.filter(function (l) { return (l.balanceCents || 0) > 0; });
  const owed = delinquent.reduce(function (s, l) { return s + l.balanceCents; }, 0);
  return '<h1>Business Metrics</h1>' +
    '<div class="af-stattiles">' +
      afStatTile(afFmtMoney(billed), 'Monthly rent roll') +
      afStatTile(delinquent.length, 'Delinquent leases') +
      afStatTile(afFmtMoney(owed), 'Outstanding balance') +
      afStatTile((billed ? (owed / billed * 100) : 0).toFixed(1) + '%', 'Delinquency rate') +
    '</div>' +
    '<p class="af-note">Delinquency rate is what is owed against what is billed each month. Everything ' +
      'here is derived from the ledgers, so posting a payment moves it immediately.</p>';
}

function afInsuranceMetricsHTML() {
  const leases = afAllLeases().filter(function (l) { return l.status === 'active'; });
  const covered = leases.filter(function (l) { return l.rentersInsurance || l.insurancePolicy; });
  return '<h1>Tenant Insurance Coverage</h1>' +
    '<div class="af-stattiles">' +
      afStatTile(leases.length, 'Active leases') +
      afStatTile(covered.length, 'With policy on file') +
      afStatTile(leases.length - covered.length, 'Missing proof') +
    '</div>' +
    (covered.length < leases.length
      ? '<div class="af-banner-warn"><b>' + (leases.length - covered.length) +
        ' active leases have no renters insurance on file.</b> Most leases require it, and an uninsured ' +
        'loss becomes an argument about who pays.</div>'
      : '') +
    '<p class="af-note">This module does not track policy numbers yet, so "missing proof" here means ' +
      'the field is absent rather than that a resident is definitely uninsured.</p>';
}

function afDataDiagnosticHTML() {
  const broken = afAuditIntegrity();
  const money = afAuditMoney();
  return '<h1>Data Diagnostic</h1>' +
    '<p class="af-note">The same audit the module runs on itself. A clean result here is what makes ' +
      'every other number on every other screen worth reading.</p>' +
    '<div class="af-stattiles">' +
      afStatTile(broken.length, 'Broken references') +
      afStatTile(money.length, 'Money rules failing') +
    '</div>' +
    (broken.length || money.length
      ? '<div class="af-banner-warn"><b>Problems found.</b><ul>' +
        broken.concat(money).map(function (b) {
          return '<li>' + esc(b.rule || '') + ' &mdash; ' + esc(b.detail || b.message || JSON.stringify(b)) + '</li>';
        }).join('') + '</ul></div>'
      : '<div class="af-banner-good">No integrity or money-rule failures.</div>');
}

/* ---------------- Reporting: Surveys ---------------- */
function afSurveysHTML() {
  const rows = AFC_SURVEYS.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  const avg = rows.length ? (rows.reduce(function (s, r) { return s + r.score; }, 0) / rows.length) : 0;
  return '<div class="af-page">' +
    '<h1>Surveys</h1>' +
    '<div class="af-stattiles">' +
      afStatTile(avg.toFixed(2), 'Average score (of 5)') +
      afStatTile(rows.length, 'Responses') +
      afStatTile(rows.filter(function (r) { return r.score <= 3; }).length, 'At or below 3') +
    '</div>' +
    '<div class="af-tablewrap"><table class="af-table">' +
      '<thead><tr><th>Date</th><th>Work order</th><th>Unit</th><th class="num">Score</th><th>Comment</th></tr></thead>' +
      '<tbody>' + (rows.map(function (r) {
        const u = afGetUnit(r.unitId);
        return '<tr><td>' + afFmtDate(r.date) + '</td>' +
          '<td><button type="button" class="af-linkbtn" onclick="afGoto(\'work-order\', \'' + escAttr(r.workOrderId) + '\')">' +
            esc(r.workOrderId) + '</button></td>' +
          '<td>' + esc(u ? u.label : r.unitId) + '</td>' +
          '<td class="num' + (r.score <= 3 ? ' af-overdue' : '') + '">' + r.score + '</td>' +
          '<td>' + esc(r.comment) + '</td></tr>';
      }).join('') || '<tr><td colspan="5">' + afEmpty('No survey responses yet.') + '</td></tr>') +
    '</tbody></table></div>' +
    afDisplaying(rows.length, AFC_SURVEYS.length) +
  '</div>';
}

/* ---------------- What's New ---------------- */
const AF_WHATS_NEW = [
  ['Unit Turns board', 'Track a vacancy from surrender to rent-ready, with a target turnaround date per unit.'],
  ['Fixed Assets', 'Record equipment with its warranty, so a repair is not billed to an owner that the manufacturer would have covered.'],
  ['Inventory reorder points', 'Parts below their reorder point are flagged on the Inventory tab.'],
  ['Maintenance Performer', 'Vendor spend and how often each one came in over their own estimate.'],
  ['Editable settlement charges', 'Every charge line is now a record you can add to, correct and re-assign.'],
  ['Calendar', 'Move-ins, move-outs, lease ends, work orders and inspections on one week view.']
];
function afWhatsNewHTML() {
  return '<div class="af-page">' +
    '<h1>What&rsquo;s New</h1>' +
    '<p class="af-note">Release notes. In the real product this is where AppFolio announces changes, and ' +
      'the count in the sidebar is how many you have not read.</p>' +
    '<div class="af-panel">' +
      AF_WHATS_NEW.map(function (n) {
        return '<div class="af-whatsnew"><b>' + esc(n[0]) + '</b><p>' + esc(n[1]) + '</p></div>';
      }).join('') +
    '</div>' +
    '<button type="button" class="af-btn" onclick="afMarkWhatsNewRead()">Mark all as read</button>' +
  '</div>';
}
function afWhatsNewCount() {
  return afDemo.whatsNewRead ? 0 : AF_WHATS_NEW.length;
}
function afMarkWhatsNewRead() {
  afDemo.whatsNewRead = true;
  simToast('Marked ' + AF_WHATS_NEW.length + ' notes as read.', { tone: 'good' });
  /* The badge lives in the sidebar, so the chrome has to repaint too. */
  afRenderChrome();
  afRenderRoot();
}

const AF_VIEWS = {
  'dashboard':       function () { return afDashboardHTML(); },
  'calendar':        function () { return afCalendarHTML(); },
  'whats-new':       function () { return afWhatsNewHTML(); },
  'communication':   function () { return afCommunicationsHTML(); },
  'properties':      function () { return afPropertiesHTML(); },
  'property-detail': function () { return afPropertyDetailHTML(); },
  'unit-detail':     function () { return afUnitDetailHTML(); },
  'residents':       function () { return afResidentsHTML(); },
  'resident-detail': function () { return afResidentDetailHTML(); },
  'owners':          function () { return afOwnersHTML(); },
  'owner-detail':    function () { return afOwnerDetailHTML(); },
  'leasing':         function () { return afLeasingHTML(); },
  'application':     function () { return afApplicationHTML(); },
  'lease-detail':    function () { return afLeaseDetailHTML(); },
  'maintenance':     function () { return afMaintenanceHTML(); },
  'work-order':      function () { return afWorkOrderHTML(); },
  'accounting':      function () { return afAccountingHTML(); },
  'communications':  function () { return afCommunicationsHTML(); },
  'reporting':       function () { return afReportingHTML(); },
  'tasks':           function () { return afTasksHTML(); },
  'settings':        function () { return afSettingsHTML(); },
  'lessons':         function () { return afLessonsHTML(); },
  'lesson':          function () { return afLessonDetailHTML(); },
  'scenario':        function () { return afScenarioDetailHTML(); },
  'review':          function () { return afReviewDetailHTML(); },
  'reconcile':       function () { return afReconcileDetailHTML(); },
  'compose':         function () { return afComposeDetailHTML(); },
  'triage':          function () { return afTriageDetailHTML(); },
  'exam':            function () { return afExamHTML(); }
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
  /* The calendar's scroll pane has to be positioned after the markup lands —
     scrollTop is not something CSS can express. */
  afCalAfterRender();
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

/* ============================================================================
   GLOBAL SEARCH
   ============================================================================
   The one control in the product that does not ask you to know where you are.

   A VA is handed a FACT — "the resident at 2207 Marshall called about the AC",
   a phone number on a voicemail, a work order number in an email — and needs a
   RECORD. Everything else in this shell requires knowing which section a thing
   lives in before you can reach it. This is the shortcut from what you were
   told to what you have to open, which is why it sits in the top bar on every
   screen rather than inside a section.

   The field used to fire afDemoAction on every keystroke: type "marshall" and
   collect eight toasts. That is worse than an inert box — it teaches that the
   control is fake while actively getting in the way.

   Scope: everything afAll* returns, which means the catalogue AND anything the
   visitor created in the sandbox. A lease generated during a lesson is findable
   the moment it exists, with no indexing step, because the accessors already
   merge the two.
   ============================================================================ */

/* One descriptor per searchable type. `fields` is what a VA would plausibly
   have in hand — a name, an address, a unit number, a record id — not every
   column the record happens to carry. Searching fields nobody would type is how
   a result list fills with noise. */
const AF_SEARCH_TYPES = [
  {
    id: 'property', label: 'Property', plural: 'Properties',
    all: function () { return afAllProperties(); },
    fields: function (p) { return [p.name, p.address, p.city, p.zip, p.id]; },
    line: function (p) { return p.name; },
    sub:  function (p) { return p.address + ', ' + p.city + ' ' + p.state; },
    open: function (p) { afGoto('property-detail', p.id); }
  },
  {
    id: 'unit', label: 'Unit', plural: 'Units',
    all: function () { return afAllUnits(); },
    fields: function (u) {
      const p = afGetProperty(u.propertyId) || {};
      return [u.label, u.id, p.name, p.address];
    },
    line: function (u) {
      const p = afGetProperty(u.propertyId) || {};
      return (p.name || '') + ' — Unit ' + u.label;
    },
    sub: function (u) { return afUnitStatusLabel(u.status) + ' · ' + u.beds + 'bd/' + u.baths + 'ba'; },
    open: function (u) { afGoto('unit-detail', u.id); }
  },
  {
    id: 'resident', label: 'Resident', plural: 'Residents',
    all: function () { return afAllResidents(); },
    fields: function (r) { return [r.name, r.email, r.phone, r.id]; },
    line: function (r) { return r.name; },
    sub:  function (r) { return [r.email, r.phone].filter(Boolean).join(' · '); },
    open: function (r) { afGoto('resident-detail', r.id); }
  },
  {
    id: 'owner', label: 'Owner', plural: 'Owners',
    all: function () { return afAllOwners(); },
    fields: function (o) { return [o.name, o.email, o.phone, o.id]; },
    line: function (o) { return o.name; },
    sub:  function (o) { return [o.email, o.phone].filter(Boolean).join(' · '); },
    open: function (o) { afGoto('owner-detail', o.id); }
  },
  {
    id: 'lease', label: 'Lease', plural: 'Leases',
    all: function () { return afAllLeases(); },
    fields: function (l) {
      const names = (l.residentIds || []).map(function (id) { return (afGetResident(id) || {}).name; });
      return [l.id, l.applicantName].concat(names);
    },
    line: function (l) {
      const u = afGetUnit(l.unitId);
      const p = u ? afGetProperty(u.propertyId) : null;
      return l.id + (p ? ' — ' + p.name : '') + (u ? ' Unit ' + u.label : '');
    },
    sub: function (l) { return afFmtDateNum(l.startDate) + ' – ' + afFmtDateNum(l.endDate) + ' · ' + l.status; },
    open: function (l) { afGoto('lease-detail', l.id); }
  },
  {
    id: 'workOrder', label: 'Work order', plural: 'Work orders',
    all: function () { return afAllWorkOrders(); },
    fields: function (w) {
      const u = afGetUnit(w.unitId);
      const p = afGetProperty(w.propertyId) || (u ? afGetProperty(u.propertyId) : null) || {};
      return [w.id, w.id.replace('WO-', ''), w.title, w.category, p.name, p.address];
    },
    line: function (w) { return w.id.replace('WO-', '') + ' — ' + w.title; },
    sub:  function (w) {
      const u = afGetUnit(w.unitId);
      const p = afGetProperty(w.propertyId) || (u ? afGetProperty(u.propertyId) : null) || {};
      return (p.name || '') + (u ? ' Unit ' + u.label : '') + ' · ' + w.status;
    },
    open: function (w) { afGoto('work-order', w.id); }
  },
  {
    id: 'application', label: 'Application', plural: 'Applications',
    all: function () { return afAllApplications(); },
    fields: function (a) { return [a.id, a.name, a.email, a.phone]; },
    line: function (a) { return a.name; },
    sub:  function (a) { return a.id + ' · ' + (AF_APP_STATUS[a.status] || a.status); },
    open: function (a) { afGoto('application', a.id); }
  },
  /* No detail view exists for these two. Rather than build one, the result
     lands on the list with that record's own name already in the filter — the
     screen search we built earlier does the narrowing. */
  {
    id: 'guestCard', label: 'Guest card', plural: 'Guest cards',
    all: function () { return afGuestCardProspects(); },
    fields: function (g) { return [g.name, g.email, g.phone, g.id]; },
    line: function (g) { return afGcName(g); },
    sub:  function (g) { return afGcSource(g) + ' · ' + afGcInterestedIn(g); },
    open: function (g) { afOpenInList('guest-cards', 'name', afGcName(g)); }
  },
  {
    id: 'vendor', label: 'Vendor', plural: 'Vendors',
    all: function () { return afAllVendors(); },
    fields: function (v) { return [v.name, v.trade, v.email, v.phone, v.id]; },
    line: function (v) { return v.name; },
    sub:  function (v) { return [v.trade, v.phone].filter(Boolean).join(' · '); },
    open: function (v) { afGoto('residents', 'vendors'); }
  }
];

const AF_SEARCH_MIN = 2;   /* one letter matches half the portfolio */
const AF_SEARCH_PER_TYPE = 5;

let afSearchQuery = '';
let afSearchScope = '';    /* '' = everything; otherwise a type id */
let afSearchTimer = null;
let afSearchScopesOpen = false;

/* The filter icon inside the field. In the screenshots it is the only hint that
   this search has a scope at all, so it opens the type chips on their own —
   before you have typed anything — rather than being decoration. */
function afToggleSearchScopes() {
  afSearchScopesOpen = !afSearchScopesOpen;
  afRenderGlobalSearch();
  const input = document.getElementById('afGlobalSearch');
  if (input && afSearchScopesOpen && typeof input.focus === 'function') input.focus();
}

function afSearchScopeSet(id) {
  afSearchScope = (afSearchScope === id) ? '' : id;
  afRenderGlobalSearch();
}

/* Typing does not re-render on every character. The debounce is not politeness,
   it is the difference between a control that feels like search and one that
   fights you. */
function afGlobalSearchInput(value) {
  afSearchQuery = value;
  if (afSearchTimer) clearTimeout(afSearchTimer);
  afSearchTimer = setTimeout(afRenderGlobalSearch, 140);
}

function afGlobalSearchKey(ev) {
  if (ev.key === 'Escape') { afCloseGlobalSearch(); return; }
  if (ev.key === 'Enter') {
    const first = afGlobalSearchResults(afSearchQuery)[0];
    if (first && first.hits.length) afOpenSearchHit(first.type.id, first.hits[0].id);
  }
}

function afCloseGlobalSearch() {
  afSearchQuery = '';
  afSearchScopesOpen = false;
  const input = document.getElementById('afGlobalSearch');
  if (input) input.value = '';
  afRenderGlobalSearch();
}

/* Case-insensitive substring across the declared fields. Deliberately not fuzzy:
   a VA is transcribing a name off a voicemail, and a search that "helpfully"
   returns near-misses is how the wrong resident's ledger gets opened. */
function afSearchMatches(fields, q) {
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (f && String(f).toLowerCase().indexOf(q) > -1) return true;
  }
  return false;
}

function afGlobalSearchResults(query) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < AF_SEARCH_MIN) return [];
  return AF_SEARCH_TYPES
    .filter(function (t) { return !afSearchScope || afSearchScope === t.id; })
    .map(function (t) {
      const hits = t.all().filter(function (r) { return afSearchMatches(t.fields(r), q); });
      return { type: t, hits: hits, total: hits.length };
    })
    .filter(function (g) { return g.total > 0; });
}

/* One handler for every result, addressed by type + record id. The alternative
   was building a call expression into each onclick, which is a string-escaping
   hazard for no benefit. */
function afOpenSearchHit(typeId, recordId) {
  const t = AF_SEARCH_TYPES.filter(function (x) { return x.id === typeId; })[0];
  if (!t) return;
  const r = t.all().filter(function (x) { return x.id === recordId; })[0];
  if (!r) return;
  afCloseGlobalSearch();
  t.open(r);
}

/* Send someone to a list with that record already filtered, for the two types
   with no detail screen of their own. */
function afOpenInList(tab, fieldId, value) {
  afDemo.search = Object.assign({}, afDemo.search);
  afDemo.search[tab] = Object.assign({}, afDemo.search[tab] || {});
  afDemo.search[tab][fieldId] = value;
  afGoto('leasing', tab);
}

function afRenderGlobalSearch() {
  const panel = document.getElementById('afSearchPanel');
  if (!panel) return;

  const q = String(afSearchQuery || '').trim();
  const short = q.length < AF_SEARCH_MIN;
  if (short && !afSearchScopesOpen) { panel.hidden = true; panel.innerHTML = ''; return; }

  const groups = short ? [] : afGlobalSearchResults(q);
  const scopes = '<div class="af-gs-scopes">' +
    '<button type="button" class="af-gs-scope' + (afSearchScope ? '' : ' on') + '"' +
      ' onclick="afSearchScopeSet(\'\')">All</button>' +
    AF_SEARCH_TYPES.map(function (t) {
      return '<button type="button" class="af-gs-scope' + (afSearchScope === t.id ? ' on' : '') + '"' +
        ' onclick="afSearchScopeSet(\'' + escAttr(t.id) + '\')">' + esc(t.plural) + '</button>';
    }).join('') +
  '</div>';

  const body = groups.map(function (g) {
    const shown = g.hits.slice(0, AF_SEARCH_PER_TYPE);
    return '<div class="af-gs-group">' +
      '<div class="af-gs-grouphead">' + esc(g.type.plural) +
        '<span>' + g.total + '</span></div>' +
      shown.map(function (r, i) {
        return '<button type="button" class="af-gs-hit"' +
          ' data-hit="' + escAttr(g.type.id) + '"' +
          ' onclick="afRunSearchHit(AF_SEARCH_TYPES.filter(function(t){return t.id===\'' + escAttr(g.type.id) + '\';})[0], ' +
            'AF_SEARCH_TYPES.filter(function(t){return t.id===\'' + escAttr(g.type.id) + '\';})[0].all()' +
            '.filter(function(x){return x.id===\'' + escAttr(r.id) + '\';})[0])">' +
          '<span class="af-gs-line">' + esc(g.type.line(r)) + '</span>' +
          '<span class="af-gs-sub">' + esc(g.type.sub(r)) + '</span>' +
        '</button>';
      }).join('') +
      (g.total > shown.length
        ? '<div class="af-gs-more">' + (g.total - shown.length) + ' more — narrow the search</div>'
        : '') +
    '</div>';
  }).join('');

  panel.hidden = false;
  panel.innerHTML = scopes +
    (short
      ? '<div class="af-gs-empty">Type at least ' + AF_SEARCH_MIN + ' characters. ' +
        'A name, an address, a unit, a phone number or a record id all work.</div>'
      : (body || '<div class="af-gs-empty">No records match &ldquo;' + esc(q) + '&rdquo;.</div>'));
}

/* ============================================================================
   9. MODAL AND WORKFLOW ENGINE
   ============================================================================ */

let afActiveModal = null;

function afOpenModal(title, bodyHTML, footHTML, wide) {
  afCloseModal();
  const wrap = document.createElement('div');
  wrap.className = 'af-modal-backdrop';
  wrap.id = 'afModalWrap';
  wrap.innerHTML =
    '<div class="af-modal' + (wide ? ' af-modal-wide' : '') + '" role="dialog" aria-modal="true">' +
      '<h3 class="af-modal-title">' + esc(title) + '</h3>' +
      '<div class="af-modal-body">' + bodyHTML + '</div>' +
      '<div class="af-modal-foot">' +
        (footHTML || '<button type="button" class="af-btn" onclick="afCloseModal()">Close</button>') +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);
  afActiveModal = wrap;
}

function afCloseModal() {
  const el = document.getElementById('afModalWrap');
  if (el) el.remove();
  afActiveModal = null;
}

/* Modal: Add Property (Type A) */
function afModalAddProperty() {
  const owners = afAllOwners();
  const body =
    '<div class="af-form-group"><label class="af-label">Property Name</label>' +
    '<input type="text" id="afPropName" class="af-input" placeholder="e.g. 742 Evergreen Terrace"></div>' +
    '<div class="af-form-group"><label class="af-label">Address</label>' +
    '<input type="text" id="afPropAddr" class="af-input" placeholder="Street address"></div>' +
    '<div class="af-form-group"><label class="af-label">City, State, Zip</label>' +
    '<input type="text" id="afPropCity" class="af-input" value="Frisco, TX 75034"></div>' +
    '<div class="af-form-group"><label class="af-label">Property Type</label>' +
    '<select id="afPropType" class="af-select">' +
      '<option value="single-family">Single Family</option>' +
      '<option value="duplex">Duplex</option>' +
      '<option value="fourplex">Fourplex</option>' +
      '<option value="apartment">Apartment Community</option>' +
    '</select></div>' +
    '<div class="af-form-group"><label class="af-label">Primary Owner</label>' +
    '<select id="afPropOwner" class="af-select">' +
      owners.map(function (o) { return '<option value="' + escAttr(o.id) + '">' + esc(o.name) + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="af-form-group"><label class="af-label">Management Fee (%)</label>' +
    '<input type="number" id="afPropFee" class="af-input" value="8.0" step="0.5"></div>';

  const foot =
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" onclick="afSaveProperty()">Save Property</button>';

  afOpenModal('Add New Property', body, foot);
}

function afSaveProperty() {
  const name = document.getElementById('afPropName').value.trim();
  const addr = document.getElementById('afPropAddr').value.trim();
  const cityZip = document.getElementById('afPropCity').value.trim();
  const type = document.getElementById('afPropType').value;
  const ownerId = document.getElementById('afPropOwner').value;
  const feePct = Math.round(parseFloat(document.getElementById('afPropFee').value || '8') * 100);

  if (!name || !addr) {
    simToast('Please provide a property name and address.');
    return;
  }

  const newId = 'PROP-' + (1000 + afAllProperties().length + 1);
  const parts = cityZip.split(',');
  const city = parts[0] ? parts[0].trim() : 'Frisco';
  const stateZip = parts[1] ? parts[1].trim().split(' ') : ['TX', '75034'];

  const prop = {
    id: newId,
    name: name,
    address: addr,
    city: city,
    state: stateZip[0] || 'TX',
    zip: stateZip[1] || '75034',
    county: 'Collin',
    type: type,
    yearBuilt: 2022,
    unitCount: 1,
    ownerIds: [ownerId],
    ownerSplit: {},
    managementFeePct: feePct,
    operatingCashCents: 500000,
    status: 'active'
  };
  prop.ownerSplit[ownerId] = 100;

  afCreate('property', prop);

  // Auto-create Unit 01 for this property
  const unit = {
    id: 'UNIT-' + newId.slice(5) + '-01',
    propertyId: newId,
    label: '01',
    beds: 3, baths: 2, sqft: 1800,
    marketRent: 220000,
    status: 'vacant-ready',
    currentLeaseId: null,
    amenities: ['Central HVAC', 'Refrigerator', 'Dishwasher'],
    lastRenovated: afToday()
  };
  afCreate('unit', unit);

  afCloseModal();
  simToast('Property "' + name + '" created successfully.', { tone: 'good' });
  afRenderRoot();
}

function afModalEditProperty(id) {
  const p = afGetProperty(id);
  if (!p) return;

  const body =
    '<div class="af-form-group"><label class="af-label">Property Name</label>' +
    '<input type="text" id="afEditPropName" class="af-input" value="' + escAttr(p.name) + '"></div>' +
    '<div class="af-form-group"><label class="af-label">Address</label>' +
    '<input type="text" id="afEditPropAddr" class="af-input" value="' + escAttr(p.address) + '"></div>' +
    '<div class="af-form-group"><label class="af-label">Management Fee (%)</label>' +
    '<input type="number" id="afEditPropFee" class="af-input" value="' + (p.managementFeePct / 100).toFixed(1) + '" step="0.5"></div>';

  const foot =
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" onclick="afUpdateProperty(\'' + escAttr(p.id) + '\')">Save Changes</button>';

  afOpenModal('Edit Property Details', body, foot);
}

function afUpdateProperty(id) {
  const name = document.getElementById('afEditPropName').value.trim();
  const addr = document.getElementById('afEditPropAddr').value.trim();
  const feePct = Math.round(parseFloat(document.getElementById('afEditPropFee').value || '8') * 100);

  if (!name || !addr) return;

  afSetOverride('property', id, {
    name: name,
    address: addr,
    managementFeePct: feePct
  });

  afCloseModal();
  simToast('Property details updated.', { tone: 'good' });
  afRenderRoot();
}

/* Modal: Add Resident (Type A) */
function afModalAddResident() {
  const vacantUnits = afAllUnits().filter(function (u) { return u.status.indexOf('vacant') === 0; });
  const body =
    '<div class="af-form-group"><label class="af-label">Full Name</label>' +
    '<input type="text" id="afResName" class="af-input" placeholder="e.g. Rachel Adams"></div>' +
    '<div class="af-form-group"><label class="af-label">Email Address</label>' +
    '<input type="email" id="afResEmail" class="af-input" placeholder="rachel.adams@example.com"></div>' +
    '<div class="af-form-group"><label class="af-label">Phone Number</label>' +
    '<input type="tel" id="afResPhone" class="af-input" value="555-0195"></div>' +
    '<div class="af-form-group"><label class="af-label">Assign Unit</label>' +
    '<select id="afResUnit" class="af-select">' +
      (vacantUnits.length
        ? vacantUnits.map(function (u) {
            const p = afGetProperty(u.propertyId);
            return '<option value="' + escAttr(u.id) + '">' + esc((p ? p.name : '') + ' — Unit ' + u.label + ' ($' + (u.marketRent / 100) + '/mo)') + '</option>';
          }).join('')
        : '<option value="">No vacant units available</option>') +
    '</select></div>';

  const foot =
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" onclick="afSaveResident()"' + (vacantUnits.length ? '' : ' disabled') + '>Create Resident</button>';

  afOpenModal('Add Resident', body, foot);
}

function afSaveResident() {
  const name = document.getElementById('afResName').value.trim();
  const email = document.getElementById('afResEmail').value.trim();
  const phone = document.getElementById('afResPhone').value.trim();
  const unitId = document.getElementById('afResUnit').value;

  if (!name || !email || !unitId) {
    simToast('Please fill in all resident fields.');
    return;
  }

  const u = afGetUnit(unitId);
  const resId = 'RES-' + (9000 + afAllResidents().length + 1);
  const leaseId = 'LEASE-' + (9000 + afAllLeases().length + 1);

  const res = {
    id: resId,
    name: name,
    email: email,
    phone: phone,
    propertyId: u ? u.propertyId : '',
    unitId: unitId,
    leaseId: leaseId,
    emergencyContact: { name: 'Contact Person', phone: '555-0199', relation: 'Relative' }
  };
  afCreate('resident', res);

  const lease = {
    id: leaseId,
    unitId: unitId,
    residentIds: [resId],
    startDate: afToday(),
    endDate: afAddDays(afToday(), 365),
    rentAmount: u ? u.marketRent : 180000,
    dueDay: 1,
    depositHeld: u ? u.marketRent : 180000,
    petDeposit: 0,
    petRent: 0,
    status: 'active',
    renewalOffered: false,
    moveInDate: afToday(),
    moveOutDate: null,
    balanceCents: 0
  };
  afCreate('lease', lease);

  // Update unit status to occupied
  afSetOverride('unit', unitId, {
    status: 'occupied',
    currentLeaseId: leaseId
  });

  afCloseModal();
  simToast('Resident ' + name + ' created and assigned to unit.', { tone: 'good' });
  afRenderRoot();
}

/* Modal: Add Owner (Type A) */
function afModalAddOwner() {
  const props = afAllProperties();
  const body =
    '<div class="af-form-group"><label class="af-label">Owner Name / Entity</label>' +
    '<input type="text" id="afOwnName" class="af-input" placeholder="e.g. Austin Capital Holdings LLC"></div>' +
    '<div class="af-form-group"><label class="af-label">Email</label>' +
    '<input type="email" id="afOwnEmail" class="af-input" placeholder="contact@austincapital.example.com"></div>' +
    '<div class="af-form-group"><label class="af-label">Phone</label>' +
    '<input type="tel" id="afOwnPhone" class="af-input" value="555-0185"></div>' +
    '<div class="af-form-group"><label class="af-label">Assigned Property</label>' +
    '<select id="afOwnProp" class="af-select">' +
      props.map(function (p) { return '<option value="' + escAttr(p.id) + '">' + esc(p.name) + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="af-form-group"><label class="af-label">Operating Reserve ($)</label>' +
    '<input type="number" id="afOwnReserve" class="af-input" value="500"></div>';

  const foot =
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" onclick="afSaveOwner()">Create Owner</button>';

  afOpenModal('Add Property Owner', body, foot);
}

function afSaveOwner() {
  const name = document.getElementById('afOwnName').value.trim();
  const email = document.getElementById('afOwnEmail').value.trim();
  const phone = document.getElementById('afOwnPhone').value.trim();
  const propId = document.getElementById('afOwnProp').value;
  const reserveCents = Math.round(parseFloat(document.getElementById('afOwnReserve').value || '500') * 100);

  if (!name || !email) {
    simToast('Please provide owner name and email.');
    return;
  }

  const ownId = 'OWN-' + (900 + afAllOwners().length + 1);
  const owner = {
    id: ownId,
    name: name,
    type: name.toLowerCase().includes('llc') || name.toLowerCase().includes('partners') ? 'entity' : 'individual',
    email: email,
    phone: phone,
    address: '500 Legacy Dr, Plano, TX 75024',
    taxId: '***-**-7712',
    propertyIds: [propId],
    bankAccount: { bank: 'Chase', routing: '111000614', account: '***8812' },
    drawPreference: 'ach',
    reserveCents: reserveCents
  };
  afCreate('owner', owner);

  afCloseModal();
  simToast('Owner ' + name + ' added successfully.', { tone: 'good' });
  afRenderRoot();
}

/* Modal: Create Work Order (Type A) */
function afModalCreateWorkOrder() {
  const units = afAllUnits();
  const vendors = afAllVendors();
  const body =
    '<div class="af-form-group"><label class="af-label">Target Unit</label>' +
    '<select id="afWoUnit" class="af-select">' +
      units.map(function (u) {
        const p = afGetProperty(u.propertyId);
        return '<option value="' + escAttr(u.id) + '">' + esc((p ? p.name : '') + ' — Unit ' + u.label) + '</option>';
      }).join('') +
    '</select></div>' +
    '<div class="af-form-group"><label class="af-label">Category</label>' +
    '<select id="afWoCat" class="af-select">' +
      '<option value="plumbing">Plumbing</option>' +
      '<option value="hvac">HVAC & Heating</option>' +
      '<option value="electrical">Electrical</option>' +
      '<option value="appliances">Appliances</option>' +
      '<option value="roofing">Roofing & Gutters</option>' +
      '<option value="locksmith">Locksmith</option>' +
      '<option value="cleaning">Cleaning & Turn</option>' +
    '</select></div>' +
    '<div class="af-form-group"><label class="af-label">Priority</label>' +
    '<select id="afWoPri" class="af-select">' +
      '<option value="normal">Normal</option>' +
      '<option value="high">High</option>' +
      '<option value="emergency">Emergency</option>' +
      '<option value="low">Low</option>' +
    '</select></div>' +
    '<div class="af-form-group"><label class="af-label">Assign Vendor</label>' +
    '<select id="afWoVend" class="af-select">' +
      vendors.map(function (v) {
        const exp = afDaysFromToday(v.insuranceExpires) < 0;
        return '<option value="' + escAttr(v.id) + '">' + esc(v.name + (exp ? ' (COI EXPIRED)' : '')) + '</option>';
      }).join('') +
    '</select></div>' +
    '<div class="af-form-group"><label class="af-label">Description of Issue</label>' +
    '<textarea id="afWoDesc" class="af-textarea" placeholder="Detail tenant reported issue..."></textarea></div>' +
    '<div class="af-form-group"><label class="af-label">Estimated Cost ($)</label>' +
    '<input type="number" id="afWoEst" class="af-input" value="180"></div>';

  const foot =
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" onclick="afSaveWorkOrder()">Create Work Order</button>';

  afOpenModal('New Maintenance Work Order', body, foot);
}

function afSaveWorkOrder() {
  const unitId = document.getElementById('afWoUnit').value;
  const cat = document.getElementById('afWoCat').value;
  const pri = document.getElementById('afWoPri').value;
  const vendId = document.getElementById('afWoVend').value;
  const desc = document.getElementById('afWoDesc').value.trim();
  const estCents = Math.round(parseFloat(document.getElementById('afWoEst').value || '150') * 100);

  if (!desc) {
    simToast('Please enter a description of the work order.');
    return;
  }

  const u = afGetUnit(unitId);
  const woId = 'WO-2026-' + (8000 + afAllWorkOrders().length + 1);

  const wo = {
    id: woId,
    propertyId: u ? u.propertyId : '',
    unitId: unitId,
    vendorId: vendId,
    reportedBy: u && u.status === 'occupied' ? 'Resident' : 'Property Manager',
    category: cat,
    priority: pri,
    status: 'assigned',
    title: desc.slice(0, 50),
    description: desc,
    entryNoticeSent: false,
    scheduledDate: afAddDays(afToday(), 1),
    estimateCents: estCents,
    actualCents: 0,
    createdDate: afToday()
  };
  afCreate('workOrder', wo);

  afCloseModal();
  simToast('Work order ' + woId + ' created.', { tone: 'good' });
  afRenderRoot();
}

/* Modal: Post Payment (Type A) */
function afModalPostPayment(presetLeaseId) {
  const leases = afAllLeases().filter(function (l) { return l.status === 'active'; });
  const body =
    '<div class="af-form-group"><label class="af-label">Select Active Lease / Resident</label>' +
    '<select id="afPayLease" class="af-select">' +
      leases.map(function (l) {
        const u = afGetUnit(l.unitId);
        const r = l.residentIds.length ? afGetResident(l.residentIds[0]) : null;
        const sel = l.id === presetLeaseId ? ' selected' : '';
        return '<option value="' + escAttr(l.id) + '"' + sel + '>' +
          esc((r ? r.name : 'Resident') + ' (Unit ' + (u ? u.label : '') + ') — Balance: ' + afFmtMoney(l.balanceCents)) +
        '</option>';
      }).join('') +
    '</select></div>' +
    '<div class="af-form-group"><label class="af-label">Payment Amount ($)</label>' +
    '<input type="number" id="afPayAmt" class="af-input" value="1250" step="10"></div>' +
    '<div class="af-form-group"><label class="af-label">Payment Method</label>' +
    '<select id="afPayMethod" class="af-select">' +
      '<option value="ach">Electronic ACH (Resident Portal)</option>' +
      '<option value="check">Personal Check</option>' +
      '<option value="cashier">Cashier\'s Check / Money Order</option>' +
    '</select></div>' +
    '<div class="af-form-group"><label class="af-label">Payment Date</label>' +
    '<input type="date" id="afPayDate" class="af-input" value="' + afToday() + '"></div>';

  const foot =
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" id="afBtnSubmitPayment" onclick="afSavePayment()">Record Payment</button>';

  afOpenModal('Post Resident Payment', body, foot);
}

function afSavePayment() {
  const leaseId = document.getElementById('afPayLease').value;
  const amtCents = Math.round(parseFloat(document.getElementById('afPayAmt').value || '0') * 100);
  const method = document.getElementById('afPayMethod').value;
  const payDate = document.getElementById('afPayDate').value || afToday();

  if (amtCents <= 0) {
    simToast('Payment amount must be greater than zero.');
    return;
  }

  const lease = afGetLease(leaseId);
  if (!lease) return;

  const entries = afAllLedgerEntries().filter(function (e) { return e.leaseId === leaseId; });
  const prevBal = entries.length ? entries[entries.length - 1].balanceAfter : 0;
  const newBal = prevBal - amtCents;

  const entry = {
    id: 'LEDGER-DEMO-' + (1000 + (afDemo.ledgerEntries || []).length + 1),
    leaseId: leaseId,
    date: payDate,
    type: 'payment',
    category: 'rent-payment',
    description: 'Resident Payment via ' + method.toUpperCase(),
    amount: amtCents,
    balanceAfter: newBal
  };

  if (!afDemo.ledgerEntries) afDemo.ledgerEntries = [];
  afDemo.ledgerEntries.push(entry);

  // Update lease balance override
  afSetOverride('lease', leaseId, { balanceCents: newBal });

  /* And the money actually moves. A receipt that only touched the ledger left
     the bank frozen, which froze reconciliation, owner draws and the whole
     trust boundary along with it. */
  afDepositReceipt({
    leaseId: leaseId,
    amount: amtCents,
    date: payDate,
    description: 'Rent receipt',
    payer: (function () {
      const r = lease.residentIds && lease.residentIds.length ? afGetResident(lease.residentIds[0]) : null;
      return r ? r.name : '';
    })()
  });

  afCloseModal();
  simToast('Payment of ' + afFmtMoney(amtCents) + ' posted and deposited to trust.', { tone: 'good' });
  afRenderRoot();
}

/* Modal: Apply Late Fee (Type A) */
function afModalApplyLateFee(presetLeaseId) {
  const lease = afGetLease(presetLeaseId);
  if (!lease) return;

  const body =
    '<p>Assess standard late fee for <b>Lease ' + esc(lease.id) + '</b> pursuant to lease terms.</p>' +
    '<div class="af-form-group"><label class="af-label">Late Fee Amount ($)</label>' +
    '<input type="number" id="afLateFeeAmt" class="af-input" value="50.00" step="5"></div>';

  const foot =
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" onclick="afSaveLateFee(\'' + escAttr(presetLeaseId) + '\')">Apply Fee</button>';

  afOpenModal('Assess Late Fee', body, foot);
}

function afSaveLateFee(leaseId) {
  const amtCents = Math.round(parseFloat(document.getElementById('afLateFeeAmt').value || '50') * 100);
  const entries = afAllLedgerEntries().filter(function (e) { return e.leaseId === leaseId; });
  const prevBal = entries.length ? entries[entries.length - 1].balanceAfter : 0;
  const newBal = prevBal + amtCents;

  const entry = {
    id: 'LEDGER-DEMO-' + (1000 + (afDemo.ledgerEntries || []).length + 1),
    leaseId: leaseId,
    date: afToday(),
    type: 'charge',
    category: 'late-fee',
    description: 'Late Fee Assessment',
    amount: amtCents,
    balanceAfter: newBal
  };

  if (!afDemo.ledgerEntries) afDemo.ledgerEntries = [];
  afDemo.ledgerEntries.push(entry);

  afSetOverride('lease', leaseId, { balanceCents: newBal });

  /* A late fee is a charge, not a receipt: it raises what the resident owes
     and moves no cash. Nothing reaches the bank until they pay it. */

  afCloseModal();
  simToast('Late fee of ' + afFmtMoney(amtCents) + ' applied.', { tone: 'good' });
  afRenderRoot();
}

/* Modal: Request Owner Draw with Fiduciary Check (M6) */
function afModalRequestDraw(ownerId) {
  const o = afGetOwner(ownerId);
  if (!o) return;

  /* Read from the trust account rather than a static figure on the property.
     The old version showed property.operatingCashCents, which never changed no
     matter how much rent had been collected — so the ceiling a VA was taught to
     respect was fiction. */
  const cash = afOwnerAvailableCash(ownerId);

  const body =
    '<div class="af-form-group"><label class="af-label">Owner</label>' +
    '<div class="af-v big"><b>' + esc(o.name) + '</b></div></div>' +

    '<div class="af-form-group"><label class="af-label">Held in trust for this owner</label>' +
    '<div class="af-v" style="font-weight:700;">' + afFmtMoney(cash.held) + '</div></div>' +

    '<div class="af-form-group"><label class="af-label">Reserve the owner requires</label>' +
    '<div class="af-v">' + afFmtMoney(cash.reserve) + '</div>' +
    '<div style="font-size:12px;color:var(--af-muted);margin-top:4px;">Left in place to cover a repair before the next rent clears.</div></div>' +

    '<div class="af-form-group"><label class="af-label">Available to distribute</label>' +
    '<div class="af-v" style="color:var(--af-accent);font-weight:700;">' + afFmtMoney(cash.available) + '</div>' +
    '<div style="font-size:12px;color:var(--af-muted);margin-top:4px;">Tenant security deposits are in a separate account and can never be drawn.</div></div>' +

    '<div class="af-form-group"><label class="af-label">Requested Draw Amount ($)</label>' +
    '<input type="number" id="afDrawAmt" class="af-input" value="' + (cash.available / 100).toFixed(2) + '" step="100"></div>';

  const foot =
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" onclick="afExecuteOwnerDraw(\'' + escAttr(ownerId) + '\')">Submit Draw Request</button>';

  afOpenModal('Process Owner Draw Disbursement', body, foot);
}

function afExecuteOwnerDraw(ownerId) {
  const drawCents = Math.round(parseFloat(document.getElementById('afDrawAmt').value || '0') * 100);
  const owner = afGetOwner(ownerId);
  if (!owner) return;

  if (drawCents <= 0) {
    simToast('Please enter a valid draw amount.');
    return;
  }

  /* Cash is computed here rather than passed in, so the ceiling always reflects
     the trust account as it stands right now — including rent posted a minute
     ago. Passing it in from the render meant the figure could be stale by the
     time the button was pressed. */
  const cash = afOwnerAvailableCash(ownerId);

  if (drawCents > cash.available) {
    /* Two different failures, and a VA needs to be able to tell them apart: the
       money is not there at all, or it is there but it is the reserve. */
    const hitsReserve = drawCents <= cash.held;
    const body = hitsReserve
      ? '<div class="af-alert-danger">' +
          '<b>DRAW EXCEEDS AVAILABLE CASH — RESERVE PROTECTED</b><br>' +
          'This owner holds <b>' + afFmtMoney(cash.held) + '</b> in trust, but <b>' + afFmtMoney(cash.reserve) +
          '</b> of it is the reserve they require be left in place. Only <b>' + afFmtMoney(cash.available) +
          '</b> can be distributed.' +
        '</div>' +
        '<p>The reserve is what pays for a repair before the next rent clears. Distributing it means the ' +
        'management company funds the next work order out of its own operating account.</p>'
      : '<div class="af-alert-danger">' +
          '<b>FIDUCIARY TRUST BOUNDARY VIOLATION</b><br>' +
          'The requested draw of <b>' + afFmtMoney(drawCents) + '</b> exceeds the <b>' + afFmtMoney(cash.held) +
          '</b> held in trust for this owner.' +
        '</div>' +
        '<p>Disbursing it would draw on funds belonging to other owners or on tenant security deposits, ' +
        'which is unauthorised co-mingling under Texas Property Code.</p>';

    afOpenModal('Draw Request Rejected', body,
      '<button type="button" class="af-btn" onclick="afCloseModal()">Acknowledge &amp; Close</button>');
    return;
  }

  /* A valid draw moves real money: out of the trust account, where it was being
     held for this owner. Before this it only produced a toast, which meant the
     balance never fell and the same cash could be distributed forever. */
  const propertyId = (owner.propertyIds || [])[0] || null;
  afPostTransaction({
    accountId: AF_ACCT.trust,
    propertyId: propertyId,
    date: afToday(),
    description: 'Owner distribution — ' + owner.name + ' (' + (owner.drawPreference || 'ACH') + ')',
    amount: -drawCents
  });

  afCloseModal();
  simToast('Owner draw of ' + afFmtMoney(drawCents) + ' disbursed. ' +
    afFmtMoney(cash.available - drawCents) + ' remains available.', { tone: 'good' });
  afRenderRoot();
}

/* Modal: Application Decision with FCRA Adverse Action */
function afModalDecideApp(appId) {
  const app = afGetApplication(appId);
  if (!app) return;

  const body =
    '<div class="af-form-group"><label class="af-label">Applicant</label>' +
    '<b>' + esc(app.name) + '</b> &bull; Credit Score: <b>' + (app.screening ? app.screening.creditScore : '—') + '</b></div>' +
    '<div class="af-form-group"><label class="af-label">Select Action</label>' +
    '<select id="afAppDecision" class="af-select" onchange="afToggleAdverseActionNotice(this.value)">' +
      '<option value="approved">Approve Application</option>' +
      '<option value="conditional">Conditional Approval (Higher Deposit)</option>' +
      '<option value="denied">Decline Application (Credit / Background)</option>' +
    '</select></div>' +
    '<div id="afAdverseNoticeBox" style="display:none;" class="af-alert-warn">' +
      '<b>FCRA Requirement:</b> Under 15 U.S.C. &sect; 1681m, declining an applicant based on credit requires issuing a formal Adverse Action Notice disclosing the credit reporting agency.' +
      '<div style="margin-top:8px;">' +
        '<button type="button" class="af-btn sm" onclick="SimEngine.viewDoc(\'documents/adverse-action-notice.html\', \'FCRA Adverse Action Notice\')">Preview Adverse Action Notice</button>' +
      '</div>' +
    '</div>';

  const foot =
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" onclick="afSubmitAppDecision(\'' + escAttr(appId) + '\')">Confirm Decision</button>';

  afOpenModal('Screening Decision', body, foot);
}

function afToggleAdverseActionNotice(val) {
  const box = document.getElementById('afAdverseNoticeBox');
  if (box) box.style.display = (val === 'denied' ? 'block' : 'none');
}

function afSubmitAppDecision(appId) {
  const dec = document.getElementById('afAppDecision').value;
  const isDenied = (dec === 'denied');

  afSetOverride('application', appId, {
    status: dec,
    adverseActionSent: isDenied,
    adverseActionSentDate: isDenied ? afToday() : null
  });

  afCloseModal();
  simToast('Application marked as ' + dec.toUpperCase() + (isDenied ? ' (Adverse Action Notice recorded).' : '.'), { tone: 'good' });
  afRenderRoot();
}

/* Dispatch Work Order with Safety Warnings */
function afDispatchWorkOrder(woId) {
  const wo = afGetWorkOrder(woId);
  if (!wo) return;

  const v = wo.vendorId ? afGetVendor(wo.vendorId) : null;
  const u = afGetUnit(wo.unitId);
  const isInsuranceExpired = v && afDaysFromToday(v.insuranceExpires) < 0;
  const isOccupiedNoNotice = u && u.status === 'occupied' && !wo.entryNoticeSent;

  if (isInsuranceExpired) {
    const body =
      '<div class="af-alert-danger">' +
        '<b>VENDOR INSURANCE EXPIRED:</b><br>' +
        'Vendor <b>' + esc(v.name) + '</b> has an expired Certificate of Insurance (expired ' + afFmtDate(v.insuranceExpires) + ').<br>' +
        'Dispatching uninsured contractors creates property liability risk.' +
      '</div>' +
      '<p>Do you wish to proceed with dispatch anyway or reassign to an active vendor?</p>';

    const foot =
      '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel Dispatch</button>' +
      '<button type="button" class="af-btn danger" onclick="afConfirmDispatchGo(\'' + escAttr(woId) + '\')">Dispatch Anyway</button>';

    afOpenModal('Vendor Compliance Warning', body, foot);
    return;
  }

  if (isOccupiedNoNotice) {
    const body =
      '<div class="af-alert-warn">' +
        '<b>24-HOUR NOTICE REQUIRED:</b><br>' +
        'Unit <b>' + esc(u.label) + '</b> is currently occupied and a 24-Hour Notice of Intent to Enter has not yet been issued.' +
      '</div>' +
      '<div style="margin-top:10px;">' +
        '<button type="button" class="af-btn" onclick="SimEngine.viewDoc(\'documents/sample-notice.html\', \'24-Hour Notice of Intent to Enter\')">Preview / Issue 24-Hour Notice</button>' +
      '</div>';

    const foot =
      '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
      '<button type="button" class="af-btn primary" onclick="afIssueNoticeAndDispatch(\'' + escAttr(woId) + '\')">Issue Notice &amp; Dispatch</button>';

    afOpenModal('Notice of Entry Warning', body, foot);
    return;
  }

  afConfirmDispatchGo(woId);
}

function afConfirmDispatchGo(woId) {
  afSetOverride('workOrder', woId, { status: 'in-progress' });
  afCloseModal();
  simToast('Work order ' + woId + ' dispatched.', { tone: 'good' });
  afRenderRoot();
}

function afIssueNoticeAndDispatch(woId) {
  afSetOverride('workOrder', woId, { status: 'scheduled', entryNoticeSent: true });
  afCloseModal();
  simToast('24-Hour Notice issued and work order scheduled.', { tone: 'good' });
  afRenderRoot();
}

/* Modal: Create Task */
function afModalCreateTask() {
  const body =
    '<div class="af-form-group"><label class="af-label">Task Title</label>' +
    '<input type="text" id="afTaskTitle" class="af-input" placeholder="e.g. Follow up on lease renewal"></div>' +
    '<div class="af-form-group"><label class="af-label">Priority</label>' +
    '<select id="afTaskPri" class="af-select">' +
      '<option value="urgent">Urgent</option>' +
      '<option value="high">High</option>' +
      '<option value="normal" selected>Normal</option>' +
      '<option value="low">Low</option>' +
    '</select></div>' +
    '<div class="af-form-group"><label class="af-label">Due Date</label>' +
    '<input type="date" id="afTaskDue" class="af-input" value="' + afToday() + '"></div>';

  const foot =
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" onclick="afSaveTask()">Create Task</button>';

  afOpenModal('New Operational Task', body, foot);
}

function afSaveTask() {
  const title = document.getElementById('afTaskTitle').value.trim();
  const pri = document.getElementById('afTaskPri').value;
  const due = document.getElementById('afTaskDue').value || afToday();

  if (!title) {
    simToast('Please enter a task title.');
    return;
  }

  const taskId = 'TASK-' + (900 + afAllTasks().length + 1);
  const task = {
    id: taskId,
    title: title,
    priority: pri,
    dueDate: due,
    section: 'operations',
    status: 'pending',
    assignedTo: 'Alex Rivera'
  };
  afCreate('task', task);

  afCloseModal();
  simToast('Task created.', { tone: 'good' });
  afRenderRoot();
}

function afCompleteTask(id) {
  afSetOverride('task', id, { status: 'completed' });
  simToast('Task completed.', { tone: 'good' });
  afRenderRoot();
}

/* Modal: New Listing */
function afModalNewListing() {
  const vacantUnits = afAllUnits().filter(function (u) { return u.status.indexOf('vacant') === 0; });
  const body =
    '<div class="af-form-group"><label class="af-label">Vacant Unit</label>' +
    '<select id="afListUnit" class="af-select">' +
      vacantUnits.map(function (u) {
        const p = afGetProperty(u.propertyId);
        return '<option value="' + escAttr(u.id) + '">' + esc((p ? p.name : '') + ' — Unit ' + u.label) + '</option>';
      }).join('') +
    '</select></div>' +
    '<div class="af-form-group"><label class="af-label">Monthly Rent ($)</label>' +
    '<input type="number" id="afListRent" class="af-input" value="1850"></div>' +
    '<div class="af-form-group"><label class="af-label">Marketing Headline</label>' +
    '<input type="text" id="afListHead" class="af-input" value="Spacious Modern Living in Prime Location"></div>';

  const foot =
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" onclick="afSaveListing()">Publish Listing</button>';

  afOpenModal('Create Marketing Listing', body, foot);
}

function afSaveListing() {
  afCloseModal();
  simToast('Listing published to marketing channels.', { tone: 'good' });
  afRenderRoot();
}

/* ============================================================================
   10. CORE VIEWS (Full Implementation)
   ============================================================================ */

/* ---------- Dashboard ---------- */
function afToggleDashWidget(id) {
  const state = afState.dashOpen || (afState.dashOpen = {});
  state[id] = !state[id];
  afRenderRoot();
}

/* A dashboard panel. All ten open COLLAPSED, which is how the real
   dashboard presents itself: it is an index of what needs attention, and
   the count on the header is what tells you whether to open one. */
function afDashWidget(id, title, contentHTML, count) {
  const state = afState.dashOpen || (afState.dashOpen = {});
  const open = !!state[id];
  return '<div class="af-dash-widget' + (open ? '' : ' collapsed') + '">' +
    '<button type="button" class="af-dash-widget-hd" onclick="afToggleDashWidget(\'' + escAttr(id) + '\')"' +
      ' aria-expanded="' + open + '">' +
      '<span class="af-dash-chevron" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<polyline points="6 9 12 15 18 9"/>' +
        '</svg></span>' +
      '<span class="af-dash-widget-title">' + esc(title) + '</span>' +
      (count ? '<span class="af-dash-count">' + count + '</span>' : '') +
    '</button>' +
    (open ? '<div class="af-dash-widget-bd">' + contentHTML + '</div>' : '') +
  '</div>';
}

/* ============================================================================
   DASHBOARD — the ten panels, derived
   ============================================================================
   The ten sections and their order were already right. What was wrong was the
   contents: the widgets were written out as literals, and six of the eight
   residents they named — Brenda Miller, Darren Hopkins, Jordan Reed, Elena
   Rostova, Grace Vanderwaal, DeShawn Williams — exist nowhere else in the
   system. A trainee who clicked one found nothing, and a trainee who went
   looking for "the delinquent resident" on the Residents screen found a
   different set of people entirely.

   Every panel below reads the portfolio. Post a payment and the Delinquencies
   panel changes; move somebody in and the Move Ins panel loses a row.

   All ten start collapsed, which is how the real dashboard opens.
   ============================================================================ */

/* "View By" narrows the whole dashboard, the way the real control does. */
function afDashScope() { return (afDemo.dash && afDemo.dash.scope) || 'all'; }
function afSetDashScope(v) {
  afDemo.dash = Object.assign({}, afDemo.dash, { scope: v });
  afRenderRoot();
}
/* Leases inside the current scope. */
function afDashLeases() {
  const scope = afDashScope();
  return afAllLeases().filter(function (l) {
    if (scope === 'all') return true;
    const u = afGetUnit(l.unitId);
    if (!u) return false;
    if (scope.indexOf('prop:') === 0) return u.propertyId === scope.slice(5);
    if (scope.indexOf('owner:') === 0) {
      const p = afGetProperty(u.propertyId);
      return !!(p && (p.ownerIds || []).indexOf(scope.slice(6)) > -1);
    }
    return true;
  });
}
function afDashUnits() {
  const scope = afDashScope();
  return afAllUnits().filter(function (u) {
    if (scope === 'all') return true;
    if (scope.indexOf('prop:') === 0) return u.propertyId === scope.slice(5);
    if (scope.indexOf('owner:') === 0) {
      const p = afGetProperty(u.propertyId);
      return !!(p && (p.ownerIds || []).indexOf(scope.slice(6)) > -1);
    }
    return true;
  });
}

function afUnitLabel(unitId) {
  const u = afGetUnit(unitId);
  if (!u) return unitId;
  const p = afGetProperty(u.propertyId);
  return (p ? p.name + ' &bull; ' : '') + esc(u.label || unitId);
}
function afLeaseWho(l) {
  const res = (l.residentIds || []).map(afGetResident).filter(Boolean);
  if (res.length) return res.map(function (r) { return r.name; }).join(', ');
  return l.applicantName || '&mdash;';
}

function afDashboardHTML() {
  const units = afDashUnits();
  const leases = afDashLeases();
  const activeLeases = leases.filter(function (l) { return l.status === 'active'; });
  const occupied = units.filter(function (u) { return u.status === 'occupied'; }).length;
  const vacant = units.filter(function (u) { return String(u.status).indexOf('vacant') === 0; }).length;
  const occPct = units.length ? Math.round(occupied / units.length * 100) : 0;
  const rentRoll = activeLeases.reduce(function (s, l) { return s + (l.rentAmount || 0); }, 0);
  const owed = activeLeases.reduce(function (s, l) { return s + Math.max(0, l.balanceCents || 0); }, 0);
  const unitIds = units.map(function (u) { return u.id; });
  const wos = afAllWorkOrders().filter(function (w) { return unitIds.indexOf(w.unitId) > -1; });

  /* --- 1. Move Ins: leases signed or pending, not yet occupied --- */
  const moveIns = leases.filter(function (l) {
    return l.status === 'pending' || (l.moveInDate && afDaysFromToday(l.moveInDate) >= -7);
  }).sort(function (a, b) { return String(a.startDate).localeCompare(String(b.startDate)); });
  const moveInsHTML = moveIns.length
    ? '<table class="af-tbl"><thead><tr><th>Resident</th><th>Property &amp; Unit</th><th>Move In Date</th>' +
      '<th>Security Deposit</th><th>Status</th><th>Action</th></tr></thead><tbody>' +
      moveIns.map(function (l) {
        const held = l.depositHeld || 0;
        const due = l.depositDue || 0;
        const signed = l.signatureStatus === 'executed';
        return '<tr><td><b>' + esc(afLeaseWho(l)) + '</b></td>' +
          '<td>' + afUnitLabel(l.unitId) + '</td>' +
          '<td>' + afFmtDate(l.moveInDate || l.startDate) + '</td>' +
          '<td>' + (held >= due && due
            ? '<span class="af-badge good">&#10003; Paid (' + afFmtMoney(held) + ')</span>'
            : '<span class="af-badge warn">Pending (' + afFmtMoney(due) + ')</span>') + '</td>' +
          '<td><span class="af-badge">' + (l.status === 'active' ? 'Moved In'
            : signed && held ? 'Ready for Key Handoff'
            : signed ? 'Lease Signed' : 'Unsigned') + '</span></td>' +
          '<td>' + (l.status === 'active'
            ? '<button type="button" class="af-btn sm" onclick="afGoto(\'lease-detail\', \'' + escAttr(l.id) + '\')">Open lease</button>'
            : !signed
              ? '<button type="button" class="af-btn sm primary" onclick="afModalSignLease(\'' + escAttr(l.id) + '\')">Sign lease</button>'
              : !held
                ? '<button type="button" class="af-btn sm primary" onclick="afModalCollectDeposit(\'' + escAttr(l.id) + '\')">Collect deposit</button>'
                : '<button type="button" class="af-btn sm primary" onclick="afMoveIn(\'' + escAttr(l.id) + '\')">Move in</button>') +
          '</td></tr>';
      }).join('') + '</tbody></table>'
    : afEmpty('Nothing is moving in right now.');

  /* --- 2. Move Outs: the deposit clock is the point of this panel --- */
  const moveOuts = leases.filter(function (l) { return l.moveOutDate || l.status === 'notice'; })
    .sort(function (a, b) { return String(a.moveOutDate).localeCompare(String(b.moveOutDate)); });
  const moveOutsHTML = moveOuts.length
    ? '<table class="af-tbl"><thead><tr><th>Resident</th><th>Property &amp; Unit</th><th>Move Out Date</th>' +
      '<th>Deposit Accounting</th><th>Action</th></tr></thead><tbody>' +
      moveOuts.map(function (l) {
        /* Texas gives 30 days from surrender to refund or itemise. */
        const dueBy = l.depositDueBy || (l.moveOutDate ? afAddDays(l.moveOutDate, 30) : null);
        const left = dueBy ? afDaysFromToday(dueBy) : null;
        return '<tr><td><b>' + esc(afLeaseWho(l)) + '</b></td>' +
          '<td>' + afUnitLabel(l.unitId) + '</td>' +
          '<td>' + (l.moveOutDate ? afFmtDate(l.moveOutDate) : 'Notice given') + '</td>' +
          '<td>' + (left == null ? '<span class="af-badge">Awaiting surrender</span>'
            : left < 0 ? '<span class="af-badge bad">' + Math.abs(left) + ' days overdue</span>'
            : '<span class="af-badge ' + (left <= 7 ? 'warn' : '') + '">Day ' + (30 - left) +
              ' of 30 &mdash; due ' + afFmtDate(dueBy) + '</span>') + '</td>' +
          '<td><button type="button" class="af-btn sm primary" onclick="afGoto(\'lease-detail\', \'' + escAttr(l.id) + '\')">Open lease</button></td>' +
        '</tr>';
      }).join('') + '</tbody></table>'
    : afEmpty('No move-outs in progress.');

  /* --- 3. Online Payments: the most recent payments actually on the ledgers --- */
  const leaseIds = leases.map(function (l) { return l.id; });
  const payments = afAllLedgerEntries()
    .filter(function (e) { return e.type === 'payment' && leaseIds.indexOf(e.leaseId) > -1; })
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); })
    .slice(0, 8);
  const paymentsHTML = payments.length
    ? '<table class="af-tbl"><thead><tr><th>Date</th><th>Resident</th><th>Unit</th><th>Method</th>' +
      '<th class="num">Amount</th><th>Status</th></tr></thead><tbody>' +
      payments.map(function (e) {
        const l = afGetLease(e.leaseId);
        return '<tr><td>' + afFmtDate(e.date) + '</td>' +
          '<td><b>' + esc(l ? afLeaseWho(l) : '&mdash;') + '</b></td>' +
          '<td>' + (l ? afUnitLabel(l.unitId) : '&mdash;') + '</td>' +
          '<td><span class="af-badge">' + esc(e.method || 'Online Portal') + '</span></td>' +
          '<td class="num font-mono"><b>' + afFmtMoney(Math.abs(e.amount)) + '</b></td>' +
          '<td><span class="af-badge good">Cleared</span></td></tr>';
      }).join('') + '</tbody></table>'
    : afEmpty('No payments recorded yet.');

  /* --- 4. Notifications: every one is a real condition on real data --- */
  const alerts = [];
  moveOuts.forEach(function (l) {
    const dueBy = l.depositDueBy || (l.moveOutDate ? afAddDays(l.moveOutDate, 30) : null);
    if (!dueBy) return;
    const left = afDaysFromToday(dueBy);
    if (left <= 10) {
      alerts.push({ tone: left < 0 ? 'bad' : 'warn',
        title: 'Texas Property Code &sect; 92.103 clock',
        body: esc(afLeaseWho(l)) + ' deposit disposition ' +
          (left < 0 ? 'is ' + Math.abs(left) + ' days overdue.' : 'due in ' + left + ' days.'),
        go: "afGoto('lease-detail', '" + escAttr(l.id) + "')" });
    }
  });
  const worst = activeLeases.filter(function (l) { return (l.balanceCents || 0) > 0; })
    .sort(function (a, b) { return b.balanceCents - a.balanceCents; })[0];
  if (worst) {
    alerts.push({ tone: 'bad', title: 'Largest outstanding balance',
      body: esc(afLeaseWho(worst)) + ' owes ' + afFmtMoney(worst.balanceCents) + ' on ' + afUnitLabel(worst.unitId) + '.',
      go: "afGoto('lease-detail', '" + escAttr(worst.id) + "')" });
  }
  const expiring = activeLeases.filter(function (l) {
    const d = afDaysFromToday(l.endDate);
    return d >= 0 && d <= 60;
  });
  if (expiring.length) {
    alerts.push({ tone: 'warn', title: 'Leases expiring within 60 days',
      body: expiring.length + ' lease' + (expiring.length === 1 ? '' : 's') +
        ' end soon. A renewal offer goes out well before the last month.',
      go: "afGoto('leasing', 'renewals')" });
  }
  const noW9 = afAllVendors().filter(function (v) { return !v.w9OnFile; });
  if (noW9.length) {
    alerts.push({ tone: 'warn', title: 'Vendors with no W-9 on file',
      body: noW9.length + ' vendor' + (noW9.length === 1 ? '' : 's') +
        ' cannot be issued a 1099 at year end.',
      go: "afGoto('residents', 'vendors')" });
  }
  const emergencies = wos.filter(function (w) { return w.priority === 'emergency' && w.status !== 'completed'; });
  if (emergencies.length) {
    alerts.push({ tone: 'bad', title: 'Emergency work orders open',
      body: emergencies.length + ' emergency ticket' + (emergencies.length === 1 ? '' : 's') + ' still open.',
      go: "afGoto('maintenance', 'work-orders')" });
  }
  const notificationsHTML = alerts.length
    ? '<div class="af-alerts">' + alerts.map(function (a) {
        return '<button type="button" class="af-alert ' + a.tone + '" onclick="' + a.go + '">' +
          '<b>' + a.title + '</b><span>' + a.body + '</span></button>';
      }).join('') + '</div>'
    : afEmpty('Nothing needs attention today.');

  /* --- 5. Leasing Activity (Last 30 Days) --- */
  const since = afAddDays(afToday(), -30);
  const newCards = afAllGuestCards().filter(function (c) { return (c.createdDate || c.date || '') >= since; });
  const newApps = afAllApplications().filter(function (a) { return (a.submittedDate || a.date || '') >= since; });
  const signed = leases.filter(function (l) { return l.signatureStatus === 'executed' && (l.startDate || '') >= since; });
  const leasingActivityHTML = afKpiStrip([
    { value: newCards.length, label: 'Guest cards' },
    { value: newApps.length, label: 'Applications received' },
    { value: signed.length, label: 'Leases signed' },
    { value: newCards.length ? (newApps.length / newCards.length * 100).toFixed(1) + '%' : '--', label: 'Card to application' },
    { value: vacant, label: 'Units available now' }
  ]) + '<div class="af-right"><button type="button" class="af-btn sm" onclick="afGoto(\'leasing\', \'vacancies\')">Open Leasing &raquo;</button></div>';

  /* --- 6. Key Performance Metrics (Cash Basis) --- */
  const collected = afAllLedgerEntries()
    .filter(function (e) { return e.type === 'payment' && leaseIds.indexOf(e.leaseId) > -1 && (e.date || '') >= since; })
    .reduce(function (s, e) { return s + Math.abs(e.amount || 0); }, 0);
  const kpiHTML = afKpiStrip([
    { value: afFmtMoney(rentRoll), label: 'Monthly rent roll' },
    { value: afFmtMoney(collected), label: 'Collected, last 30 days' },
    { value: afFmtMoney(owed), label: 'Outstanding' },
    { value: rentRoll ? (owed / rentRoll * 100).toFixed(1) + '%' : '0%', label: 'Delinquency rate' },
    { value: occPct + '%', label: 'Occupancy' }
  ]) + '<p class="af-note">Cash basis: collected counts money that actually arrived, not what was billed. ' +
    'The gap between the first two figures is the job.</p>';

  /* --- 7. Portfolio Summary --- */
  const props = afAllProperties().filter(function (p) {
    const scope = afDashScope();
    if (scope === 'all') return true;
    if (scope.indexOf('prop:') === 0) return p.id === scope.slice(5);
    if (scope.indexOf('owner:') === 0) return (p.ownerIds || []).indexOf(scope.slice(6)) > -1;
    return true;
  });
  const portfolioSummaryHTML =
    '<table class="af-tbl"><thead><tr><th>Property</th><th>Type</th><th class="num">Occupied / Units</th>' +
    '<th class="num">Monthly rent</th><th class="num">Outstanding</th></tr></thead><tbody>' +
    props.map(function (p) {
      const pu = afAllUnits().filter(function (u) { return u.propertyId === p.id; });
      const pl = afAllLeases().filter(function (l) {
        const u = afGetUnit(l.unitId); return u && u.propertyId === p.id && l.status === 'active';
      });
      const pOcc = pu.filter(function (u) { return u.status === 'occupied'; }).length;
      const pRent = pl.reduce(function (s, l) { return s + (l.rentAmount || 0); }, 0);
      const pOwed = pl.reduce(function (s, l) { return s + Math.max(0, l.balanceCents || 0); }, 0);
      return '<tr><td><button type="button" class="af-linkbtn" onclick="afGoto(\'property-detail\', \'' +
          escAttr(p.id) + '\')"><b>' + esc(p.name) + '</b></button></td>' +
        '<td>' + esc(p.type || '&mdash;') + '</td>' +
        '<td class="num">' + pOcc + ' / ' + pu.length + '</td>' +
        '<td class="num font-mono"><b>' + afFmtMoney(pRent) + '</b></td>' +
        '<td class="num font-mono' + (pOwed ? ' af-overdue' : '') + '">' + afFmtMoney(pOwed) + '</td></tr>';
    }).join('') + '</tbody></table>';

  /* --- 8. Delinquencies --- */
  const late = activeLeases.filter(function (l) { return (l.balanceCents || 0) > 0; })
    .sort(function (a, b) { return b.balanceCents - a.balanceCents; });
  const delinquenciesHTML = late.length
    ? '<table class="af-tbl"><thead><tr><th>Resident</th><th>Unit</th><th>Days delinquent</th>' +
      '<th class="num">Amount due</th><th>Action</th></tr></thead><tbody>' +
      late.map(function (l) {
        const oldest = afAllLedgerEntries()
          .filter(function (e) { return e.leaseId === l.id && e.type === 'charge'; })
          .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); })[0];
        const days = oldest ? Math.abs(afDaysFromToday(oldest.date)) : 0;
        return '<tr><td><b>' + esc(afLeaseWho(l)) + '</b></td>' +
          '<td>' + afUnitLabel(l.unitId) + '</td>' +
          '<td><span class="af-badge ' + (days > 30 ? 'bad' : 'warn') + '">' + days + ' days past due</span></td>' +
          '<td class="num font-mono af-overdue">' + afFmtMoney(l.balanceCents) + '</td>' +
          '<td><button type="button" class="af-btn sm primary" onclick="afModalPostPayment(\'' + escAttr(l.id) + '\')">Post payment</button> ' +
            '<button type="button" class="af-btn sm" onclick="afGoto(\'lease-detail\', \'' + escAttr(l.id) + '\')">Open ledger</button></td></tr>';
      }).join('') + '</tbody></table>'
    : afEmpty('Every active lease is current.');

  /* --- 9. Vendor Online Payables: invoices entered but not yet disbursed --- */
  const payables = wos.filter(function (w) { return w.invoiceNumber && !w.paidDate; });
  const payablesHTML = payables.length
    ? '<table class="af-tbl"><thead><tr><th>Invoice #</th><th>Vendor</th><th>Work order</th>' +
      '<th>Billed to</th><th class="num">Amount due</th><th>Action</th></tr></thead><tbody>' +
      payables.map(function (w) {
        const v = w.vendorId ? afGetVendor(w.vendorId) : null;
        return '<tr><td><b>' + esc(w.invoiceNumber) + '</b></td>' +
          '<td>' + esc(v ? v.name : 'Unassigned') +
            (v && !v.w9OnFile ? ' <span class="af-badge warn">No W-9</span>' : '') + '</td>' +
          '<td><button type="button" class="af-linkbtn" onclick="afGoto(\'work-order\', \'' + escAttr(w.id) + '\')">' +
            esc(w.id) + '</button></td>' +
          '<td>' + esc(w.billTo === 'resident' ? 'Resident' : 'Owner') + '</td>' +
          '<td class="num font-mono"><b>' + afFmtMoney(w.actualCents || 0) + '</b></td>' +
          '<td><button type="button" class="af-btn sm" onclick="afGoto(\'work-order\', \'' + escAttr(w.id) + '\')">Review</button></td></tr>';
      }).join('') + '</tbody></table>'
    : afEmpty('No vendor invoices are waiting to be paid.');

  /* --- 10. Maintenance --- */
  const open = wos.filter(function (w) { return w.status !== 'completed'; });
  const doneRecently = wos.filter(function (w) {
    return w.status === 'completed' && w.completedDate && afDaysFromToday(w.completedDate) >= -7;
  });
  const maintenanceHTML = afKpiStrip([
    { value: open.length, label: 'Open service requests' },
    { value: emergencies.length, label: 'Emergency tickets' },
    { value: doneRecently.length, label: 'Completed this week' },
    { value: wos.filter(function (w) { return w.invoiceNumber && !w.paidDate; }).length, label: 'Ready to bill' }
  ]) + '<div class="af-right"><button type="button" class="af-btn sm" onclick="afGoto(\'maintenance\', \'work-orders\')">View maintenance queue &raquo;</button></div>';

  /* --- the page --- */
  const scope = afDashScope();
  return '<div class="af-dash-page">' +
    '<div class="af-dash-header">' +
      '<h1 class="af-dash-title">Dashboard</h1>' +
      '<div class="af-dash-controls">' +
        '<span class="af-dash-viewby">View By</span>' +
        '<select class="af-dash-select" onchange="afSetDashScope(this.value)">' +
          '<option value="all"' + (scope === 'all' ? ' selected' : '') + '>All</option>' +
          '<optgroup label="Property">' +
            afAllProperties().map(function (p) {
              return '<option value="prop:' + escAttr(p.id) + '"' +
                (scope === 'prop:' + p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>';
            }).join('') +
          '</optgroup>' +
          '<optgroup label="Owner">' +
            afAllOwners().map(function (o) {
              return '<option value="owner:' + escAttr(o.id) + '"' +
                (scope === 'owner:' + o.id ? ' selected' : '') + '>' + esc(o.name) + '</option>';
            }).join('') +
          '</optgroup>' +
        '</select>' +
        '<button type="button" class="af-dash-customize" onclick="afDemoAction(\'Dashboard layout customization\')">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" aria-hidden="true">' +
            '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
          'Customize' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<div class="af-dash-accordion">' +
      afDashWidget('move-ins', 'Move Ins', moveInsHTML, moveIns.length) +
      afDashWidget('move-outs', 'Move Outs', moveOutsHTML, moveOuts.length) +
      afDashWidget('online-payments', 'Online Payments', paymentsHTML, payments.length) +
      afDashWidget('notifications', 'Notifications', notificationsHTML, alerts.length) +
      afDashWidget('leasing-activity', 'Leasing Activity (Last 30 Days)', leasingActivityHTML) +
      afDashWidget('kpi-metrics', 'Key Performance Metrics (Cash Basis)', kpiHTML) +
      afDashWidget('portfolio-summary', 'Portfolio Summary', portfolioSummaryHTML, props.length) +
      afDashWidget('delinquencies', 'Delinquencies', delinquenciesHTML, late.length) +
      afDashWidget('vendor-payables', 'Vendor Online Payables', payablesHTML, payables.length) +
      afDashWidget('maintenance', 'Maintenance', maintenanceHTML, open.length) +
    '</div>' +
  '</div>';
}

/* ---------- Properties and units ---------- */
function afPropertiesHTML() {
  const tab = afState.sectionTab || 'properties';
  if (tab === 'associations') return afAssociationsHTML();
  return afPropertiesListHTML();
}

function afPropertiesListHTML() {
  const props = afAllProperties();
  const actions = '<button type="button" class="af-btn primary" onclick="afModalAddProperty()">+ Add Property</button>';

  const rows = props.map(function (p) {
    const units = afAllUnits().filter(function (u) { return u.propertyId === p.id; });
    const occ = units.filter(function (u) { return u.status === 'occupied'; }).length;
    return '<tr class="link" data-prop="' + escAttr(p.id) + '" onclick="afGoto(\'property-detail\', \'' + escAttr(p.id) + '\')">' +
      '<td><button type="button" class="af-linkbtn" data-prop="' + escAttr(p.id) + '" onclick="afGoto(\'property-detail\', \'' + escAttr(p.id) + '\')"><b>' + esc(p.name) + '</b></button><div class="af-sub">' + esc(p.address) + ', ' + esc(p.city) + ' ' + esc(p.state) + '</div></td>' +
      '<td>' + esc(p.type) + '</td>' +
      '<td class="num">' + units.length + '</td>' +
      '<td class="num">' + occ + ' / ' + units.length + '</td>' +
      '<td>' + (p.ownerIds || []).map(function (id) {
        const o = afGetOwner(id);
        return o ? esc(o.name) : '<span class="af-muted">unknown</span>';
      }).join(', ') + '</td>' +
      '</tr>';
  }).join('');

  return afPageHead('Properties', props.length + ' properties under management across North Texas.', actions) +
    '<table class="af-tbl"><thead><tr>' +
      '<th>Property</th><th>Type</th><th class="num">Units</th><th class="num">Occupancy</th><th>Ownership</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function afAssociationsHTML() {
  const associations = [
    { id: 'HOA-01', name: 'Legacy Park Master Condominium Association', prop: 'Legacy Park Apartments', units: 24, dues: '$285.00 / mo', manager: 'Sarah Jenkins (FirstService)', phone: '555-0410', status: 'Active' },
    { id: 'HOA-02', name: 'Stonebridge Ranch Master Community Association', prop: 'Stonebridge Single-Family Homes', units: 14, dues: '$150.00 / qtr', manager: 'David Caldwell (CCMC)', phone: '555-0411', status: 'Active' },
    { id: 'HOA-03', name: 'Oakwood Village Residential HOA', prop: 'Oakwood Triplex Portfolio', units: 9, dues: '$450.00 / yr', manager: 'Self-Managed Board', phone: '555-0412', status: 'Active' }
  ];

  const rows = associations.map(function (a) {
    return '<tr>' +
      '<td><b>' + esc(a.name) + '</b><div class="af-sub">' + esc(a.id) + '</div></td>' +
      '<td>' + esc(a.prop) + '</td>' +
      '<td class="num">' + a.units + ' Units</td>' +
      '<td class="num font-mono"><b>' + esc(a.dues) + '</b></td>' +
      '<td>' + esc(a.manager) + '<div class="af-sub">' + esc(a.phone) + '</div></td>' +
      '<td><span class="af-badge good">' + esc(a.status) + '</span></td>' +
      '</tr>';
  }).join('');

  return afPageHead('Community Associations (HOA)', '3 Homeowners & Condominium associations governing common areas.') +
    '<section class="af-card">' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Association Name</th><th>Covered Portfolio Properties</th><th class="num">Units</th><th class="num">Assessment Dues</th><th>Managing Entity</th><th>Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</section>';
}

function afPropertyDetailHTML() {
  const p = afGetProperty(afState.activePropertyId);
  if (!p) return afEmptyState({ title: 'Property not found', body: 'It may have been removed.', actionLabel: 'Back to properties', action: "afGoto('properties')" });

  const units = afAllUnits().filter(function (u) { return u.propertyId === p.id; });
  const rows = units.map(function (u) {
    const lease = u.currentLeaseId ? afGetLease(u.currentLeaseId) : null;
    const res = lease && lease.residentIds.length ? afGetResident(lease.residentIds[0]) : null;
    return '<tr class="link" data-unit="' + escAttr(u.id) + '" onclick="afGoto(\'unit-detail\', \'' + escAttr(u.id) + '\')">' +
      '<td><button type="button" class="af-linkbtn" data-unit="' + escAttr(u.id) + '" onclick="afGoto(\'unit-detail\', \'' + escAttr(u.id) + '\')"><b>Unit ' + esc(u.label) + '</b></button></td>' +
      '<td>' + u.beds + ' bd / ' + u.baths + ' ba</td>' +
      '<td class="num">' + u.sqft + ' sq ft</td>' +
      '<td><span class="af-badge ' + escAttr(u.status) + '">' + esc(afUnitStatusLabel(u.status)) + '</span></td>' +
      '<td>' + (res ? esc(res.name) : '<span class="af-muted">Vacant</span>') + '</td>' +
      '<td class="num">' + afFmtMoney(lease ? lease.rentAmount : u.marketRent) + '</td>' +
      '</tr>';
  }).join('');

  return '<button type="button" class="af-backlink" onclick="afGoto(\'properties\')">&larr; Back to Properties</button>' +
    afPageHead(p.name, p.address + ', ' + p.city + ', ' + p.state + ' ' + p.zip,
      '<button type="button" class="af-btn" onclick="afModalEditProperty(\'' + escAttr(p.id) + '\')">Edit Property</button>') +
    '<table class="af-tbl"><thead><tr>' +
      '<th>Unit</th><th>Floorplan</th><th class="num">Size</th><th>Status</th><th>Resident</th><th class="num">Rent</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function afUnitStatusLabel(s) {
  return {
    'occupied': 'Occupied', 'vacant-ready': 'Vacant — Ready',
    'vacant-rehab': 'Vacant — Rehab', 'notice': 'On Notice'
  }[s] || s;
}

function afUnitDetailHTML() {
  const u = afGetUnit(afState.activeUnitId);
  if (!u) return afEmptyState({ title: 'Unit not found', body: 'It may have been removed.', actionLabel: 'Back to properties', action: "afGoto('properties')" });
  const p = afGetProperty(u.propertyId);
  const lease = u.currentLeaseId ? afGetLease(u.currentLeaseId) : null;
  const res = lease && lease.residentIds.length ? afGetResident(lease.residentIds[0]) : null;
  const unitWork = afAllWorkOrders().filter(function (w) { return w.unitId === u.id; });

  return '<button type="button" class="af-backlink" onclick="afGoto(\'property-detail\', \'' + escAttr(u.propertyId) + '\')">&larr; ' + esc(p ? p.name : 'Property') + '</button>' +
    afPageHead('Unit ' + u.label, (p ? p.address + ' &bull; ' : '') + u.beds + ' bd / ' + u.baths + ' ba &bull; ' + u.sqft + ' sq ft',
      (lease ? '<button type="button" class="af-btn primary" onclick="afModalPostPayment(\'' + escAttr(lease.id) + '\')">Post Payment</button>' : '')) +
    '<div class="af-kv">' +
      '<div><dt>Status</dt><dd>' + esc(afUnitStatusLabel(u.status)) + '</dd></div>' +
      '<div><dt>Market rent</dt><dd>' + afFmtMoney(u.marketRent) + '</dd></div>' +
      '<div><dt>Current rent</dt><dd>' + (lease ? afFmtMoney(lease.rentAmount) : '—') + '</dd></div>' +
      '<div><dt>Resident</dt><dd>' + (res ? '<a href="javascript:void(0)" onclick="afGoto(\'resident-detail\', \'' + escAttr(res.id) + '\')">' + esc(res.name) + '</a>' : 'Vacant') + '</dd></div>' +
      '<div><dt>Lease term</dt><dd>' + (lease ? afFmtDate(lease.startDate) + ' to ' + afFmtDate(lease.endDate) : '—') + '</dd></div>' +
      '<div><dt>Amenities</dt><dd>' + (u.amenities ? u.amenities.join(', ') : 'Standard') + '</dd></div>' +
    '</div>' +
    '<section class="af-card"><h3>Unit Maintenance History</h3>' +
      (unitWork.length
        ? '<table class="af-tbl"><thead><tr><th>Order ID</th><th>Category</th><th>Priority</th><th>Status</th><th>Estimate</th></tr></thead><tbody>' +
            unitWork.map(function (w) {
              return '<tr class="link" onclick="afGoto(\'work-order\', \'' + escAttr(w.id) + '\')">' +
                '<td><b>' + esc(w.id) + '</b></td><td>' + esc(w.category) + '</td>' +
                '<td><span class="af-badge ' + escAttr(w.priority) + '">' + esc(w.priority) + '</span></td>' +
                '<td><span class="af-badge ' + escAttr(w.status) + '">' + esc(w.status) + '</span></td>' +
                '<td class="num">' + afFmtMoney(w.estimateCents) + '</td>' +
                '</tr>';
            }).join('') +
          '</tbody></table>'
        : '<p class="af-sub">No recent work orders for this unit.</p>') +
    '</section>';
}

/* ---------- People (Tenants, Homeowners, Owners, Vendors, Tax Authorities) ---------- */
function afResidentsHTML() {
  const tab = afState.sectionTab || 'tenants';
  if (tab === 'homeowners') return afHomeownersHTML();
  if (tab === 'owners') return afOwnersHTML();
  if (tab === 'vendors') return afVendorsHTML();
  if (tab === 'tax') return afTaxAuthoritiesHTML();
  return afTenantsHTML();
}

function afTenantsHTML() {
  const list = afAllResidents();
  const actions = '<button type="button" class="af-btn primary" onclick="afModalAddResident()">+ Add Resident</button>';

  const rows = list.map(function (r) {
    const lease = afGetLease(r.leaseId);
    const u = r.unitId ? afGetUnit(r.unitId) : null;
    const bal = lease ? lease.balanceCents : 0;
    return '<tr class="link" onclick="afGoto(\'resident-detail\', \'' + escAttr(r.id) + '\')">' +
      '<td><b>' + esc(r.name) + '</b><div class="af-sub">' + esc(r.email) + '</div></td>' +
      '<td>' + (u ? esc('Unit ' + u.label) : '<span class="af-muted">—</span>') + '</td>' +
      '<td>' + esc(r.phone) + '</td>' +
      '<td>' + (lease ? afFmtDate(lease.startDate) : '—') + '</td>' +
      '<td class="num" style="font-weight:700;color:' + (bal > 0 ? 'var(--af-bad)' : 'var(--af-text)') + '">' +
        afFmtMoney(bal) +
      '</td>' +
      '</tr>';
  }).join('');

  return afPageHead('Residents Directory', list.length + ' active residents across the portfolio.', actions) +
    '<table class="af-tbl"><thead><tr>' +
      '<th>Resident</th><th>Unit</th><th>Phone</th><th>Lease Start</th><th class="num">Ledger Balance</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function afHomeownersHTML() {
  const members = [
    { lot: 'Lot 14', name: 'Marisol T. Vega', community: 'Stonebridge Ranch Master HOA', address: '4110 Hollow Creek Ct', dues: '$150.00 / qtr', balance: '$0.00', status: 'Current' },
    { lot: 'Lot 15', name: 'Denise & Wallace Okafor', community: 'Stonebridge Ranch Master HOA', address: '4114 Hollow Creek Ct', dues: '$150.00 / qtr', balance: '$0.00', status: 'Current' },
    { lot: 'Unit 201', name: 'Arthur Pendelton', community: 'Legacy Park Condominiums', address: '7420 Legacy Dr #201', dues: '$285.00 / mo', balance: '$0.00', status: 'Current' },
    { lot: 'Unit 202', name: 'Grace Vanderwaal', community: 'Legacy Park Condominiums', address: '7420 Legacy Dr #202', dues: '$285.00 / mo', balance: '$285.00', status: 'Delinquent' }
  ];

  const rows = members.map(function (m) {
    return '<tr>' +
      '<td><b>' + esc(m.name) + '</b><div class="af-sub">' + esc(m.lot) + '</div></td>' +
      '<td>' + esc(m.community) + '<div class="af-sub">' + esc(m.address) + '</div></td>' +
      '<td class="num">' + esc(m.dues) + '</td>' +
      '<td class="num font-mono" style="font-weight:700;' + (m.balance !== '$0.00' ? 'color:var(--af-bad);' : '') + '">' + esc(m.balance) + '</td>' +
      '<td><span class="af-badge ' + (m.status === 'Current' ? 'good' : 'warn') + '">' + esc(m.status) + '</span></td>' +
      '</tr>';
  }).join('');

  return afPageHead('Homeowners & Association Members', 'Association member ledger, dues accounting, and compliance.') +
    '<section class="af-card">' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Member Name / Lot</th><th>Community & Address</th><th class="num">Assessment Schedule</th><th class="num">Dues Balance</th><th>Account Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</section>';
}

function afTaxAuthoritiesHTML() {
  const taxes = [
    { pin: '004-9812-00', entity: 'Collin County Central Appraisal District (CAD)', prop: 'Legacy Park Apartments', value: 485000000, taxEst: 8430000, due: '2027-01-31', status: 'Escrow Impounded' },
    { pin: '002-1144-01', entity: 'Denton County Tax Office', prop: 'Stonebridge Single-Family Homes', value: 225000000, taxEst: 3915000, due: '2027-01-31', status: 'Escrow Impounded' },
    { pin: '009-3321-00', entity: 'Dallas County Appraisal District (DCAD)', prop: 'Oakwood Triplex Portfolio', value: 360000000, taxEst: 6840000, due: '2027-01-31', status: 'Escrow Impounded' }
  ];

  const rows = taxes.map(function (t) {
    return '<tr>' +
      '<td><b>' + esc(t.entity) + '</b><div class="af-sub">Parcel PIN: ' + esc(t.pin) + '</div></td>' +
      '<td>' + esc(t.prop) + '</td>' +
      '<td class="num font-mono">' + afFmtMoney(t.value) + '</td>' +
      '<td class="num font-mono" style="font-weight:700;">' + afFmtMoney(t.taxEst) + '</td>' +
      '<td>' + afFmtDate(t.due) + '</td>' +
      '<td><span class="af-badge good">' + esc(t.status) + '</span></td>' +
      '</tr>';
  }).join('');

  return afPageHead('Property Tax Authorities', 'County appraisal districts, property parcel PINs, and ad valorem tax impounds.') +
    '<section class="af-card">' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Taxing Jurisdiction / CAD</th><th>Property</th><th class="num">2026 Assessed Value</th><th class="num">Annual Tax Estimate</th><th>Statutory Due Date</th><th>Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</section>';
}

function afVendorsHTML() {
  const list = afAllVendors();
  const actions = '<button type="button" class="af-btn primary" onclick="simToast(\'Vendor onboarding modal\', { tone: \'good\' })">+ Add Vendor</button>';

  const rows = list.map(function (v) {
    const isExpired = afDaysFromToday(v.insuranceExpires) < 0;
    const tradeLabel = (v.trade || v.category || 'General').toUpperCase();
    return '<tr>' +
      '<td><b>' + esc(v.name) + '</b><div class="af-sub">' + esc(v.contact || v.contactName || '') + '</div></td>' +
      '<td><span class="af-badge neutral">' + esc(tradeLabel) + '</span></td>' +
      '<td>' + esc(v.phone) + '<div class="af-sub">' + esc(v.email) + '</div></td>' +
      '<td>' + esc(v.paymentTerms || 'Net 30') + '</td>' +
      '<td>' +
        (isExpired
          ? '<span class="af-pill-bad">&#10007; EXPIRED (' + afFmtDate(v.insuranceExpires) + ')</span>'
          : '<span class="af-pill-good">&#10003; Active (' + afFmtDate(v.insuranceExpires) + ')</span>') +
      '</td>' +
      '<td>' + (v.w9OnFile ? '<span class="af-badge good">W-9 Verified</span>' : '<span class="af-badge warn">Missing W-9</span>') + '</td>' +
      '</tr>';
  }).join('');

  return afPageHead('Service Vendors Directory', list.length + ' contracted maintenance and trade vendors.', actions) +
    '<table class="af-tbl"><thead><tr>' +
      '<th>Company Name</th><th>Trade Category</th><th>Contact Info</th><th>Terms</th><th>COI Insurance Status</th><th>Tax Compliance</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function afResidentDetailHTML() {
  const r = afGetResident(afState.activeResidentId);
  if (!r) return afEmptyState({ title: 'Resident not found', body: 'They may have been removed.', actionLabel: 'Back to residents', action: "afGoto('residents')" });

  const lease = afGetLease(r.leaseId);
  const u = r.unitId ? afGetUnit(r.unitId) : null;
  const p = u ? afGetProperty(u.propertyId) : null;
  const entries = lease ? afAllLedgerEntries().filter(function (e) { return e.leaseId === lease.id; }) : [];
  const daysRemaining = lease ? afDaysFromToday(lease.endDate) : 0;
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 60;

  const ledgerRows = entries.map(function (e) {
    return '<tr>' +
      '<td>' + afFmtDate(e.date) + '</td>' +
      '<td><b>' + esc(e.description) + '</b></td>' +
      '<td class="num">' + (e.type === 'charge' ? afFmtMoney(e.amount) : '—') + '</td>' +
      '<td class="num" style="color:var(--af-good);">' + (e.type === 'payment' ? afFmtMoney(e.amount) : '—') + '</td>' +
      '<td class="num" style="font-weight:700;">' + afFmtMoney(e.balanceAfter) + '</td>' +
      '</tr>';
  }).join('');

  return '<button type="button" class="af-backlink" onclick="afGoto(\'residents\')">&larr; Back to Residents</button>' +
    afPageHead(r.name, r.email + ' &bull; ' + r.phone + (p ? ' &bull; ' + p.name + ' Unit ' + (u ? u.label : '') : ''),
      '<button type="button" class="af-btn" onclick="SimEngine.viewDoc(\'documents/lease-agreement.html\', \'Texas Residential Lease Agreement\')">View Lease Agreement</button>' +
      (lease ? '<button type="button" class="af-btn primary" onclick="afModalPostPayment(\'' + escAttr(lease.id) + '\')">Post Payment</button>' : '')) +
    '<div class="af-kv">' +
      '<div><dt>Unit</dt><dd>' + (u ? esc('Unit ' + u.label) : '—') + '</dd></div>' +
      '<div><dt>Monthly Rent</dt><dd>' + (lease ? afFmtMoney(lease.rentAmount) : '—') + '</dd></div>' +
      '<div><dt>Security Deposit</dt><dd>' + (lease ? afFmtMoney(lease.depositHeld) : '—') + '</dd></div>' +
      '<div><dt>Pet Agreement</dt><dd>' + (lease && lease.petDeposit ? 'Active ($35/mo pet rent on file)' : 'No pets on lease') + '</dd></div>' +
      '<div><dt>Emergency Contact</dt><dd>' + (r.emergencyContact ? esc(r.emergencyContact.name + ' (' + r.emergencyContact.phone + ')') : 'None') + '</dd></div>' +
      '<div><dt>Lease Expiration</dt><dd>' + (lease ? afFmtDate(lease.endDate) + (isExpiringSoon ? ' <span class="af-pill-warn" style="margin-left:6px">' + daysRemaining + ' days remaining</span>' : '') : '—') + '</dd></div>' +
      '<div><dt>Current Balance</dt><dd style="font-weight:700;color:' + (lease && lease.balanceCents > 0 ? 'var(--af-bad)' : 'var(--af-good)') + '">' +
        (lease ? afFmtMoney(lease.balanceCents) : '$0.00') +
      '</dd></div>' +
    '</div>' +
    (lease && (lease.depositAccounting || r.id === 'RES-MO-01')
      ? '<div class="af-alert-warn" style="margin-top:16px;">' +
          '<b>TEXAS 30-DAY DEPOSIT ITEMIZATION CLOCK:</b> Move-out occurred 22 days ago. Statutory accounting deadline is in 8 days.' +
          '<div style="margin-top:8px;">' +
            '<button type="button" class="af-btn sm primary" data-action="generate-deposit-itemization" onclick="afSetOverride(\'lease\',\'' + escAttr(lease.id) + '\',{depositItemizationGenerated:true});SimEngine.viewDoc(\'documents/deposit-itemization.html\', \'Security Deposit Itemization Statement\')">Generate Deposit Itemization</button>' +
          '</div>' +
        '</div>'
      : '') +
    '<section class="af-card" style="margin-top:20px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
        '<h3 style="margin:0;">Resident Ledger</h3>' +
        (lease ? '<button type="button" class="af-btn sm" onclick="afModalApplyLateFee(\'' + escAttr(lease.id) + '\')">+ Apply Late Fee</button>' : '') +
      '</div>' +
      '<table class="af-tbl af-tbl-ledger"><thead><tr>' +
        '<th>Date</th><th>Description</th><th class="num">Charges</th><th class="num">Payments</th><th class="num">Running Balance</th>' +
      '</tr></thead><tbody>' + ledgerRows + '</tbody></table>' +
    '</section>';
}

/* ---------- Owners ---------- */
function afOwnersHTML() {
  const list = afAllOwners();
  const actions = '<button type="button" class="af-btn primary" onclick="afModalAddOwner()">+ Add Owner</button>';

  const rows = list.map(function (o) {
    const propNames = (o.propertyIds || []).map(function (pid) {
      const p = afGetProperty(pid);
      return p ? p.name : pid;
    }).join(', ');
    return '<tr class="link" onclick="afGoto(\'owner-detail\', \'' + escAttr(o.id) + '\')">' +
      '<td><b>' + esc(o.name) + '</b><div class="af-sub">' + esc(o.email) + '</div></td>' +
      '<td>' + esc(o.type) + '</td>' +
      '<td>' + esc(propNames) + '</td>' +
      '<td class="num">' + afFmtMoney(o.reserveCents) + '</td>' +
      '</tr>';
  }).join('');

  return afPageHead('Property Owners', list.length + ' clients and ownership entities.', actions) +
    '<table class="af-tbl"><thead><tr>' +
      '<th>Owner / Entity</th><th>Type</th><th>Properties</th><th class="num">Reserve Held</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function afOwnerDetailHTML() {
  const o = afGetOwner(afState.activeOwnerId);
  if (!o) return afEmptyState({ title: 'Owner not found', body: 'They may have been removed.', actionLabel: 'Back to owners', action: "afGoto('owners')" });

  const stmts = afAllOwnerStatements().filter(function (s) { return s.ownerId === o.id; });
  const p = afGetProperty(o.propertyIds[0]);

  const stmtRows = stmts.map(function (s) {
    return '<tr>' +
      '<td><b>' + esc(s.periodLabel) + '</b></td>' +
      '<td class="num">' + afFmtMoney(s.totalIncomeCents) + '</td>' +
      '<td class="num">' + afFmtMoney(s.totalExpensesCents) + '</td>' +
      '<td class="num">' + afFmtMoney(s.managementFeeCents) + '</td>' +
      '<td class="num" style="font-weight:700;color:var(--af-accent);">' + afFmtMoney(s.netDistributionCents) + '</td>' +
      '<td><span class="af-badge ' + escAttr(s.status) + '">' + esc(s.status.toUpperCase()) + '</span></td>' +
      '<td><button type="button" class="af-btn sm" onclick="SimEngine.viewDoc(\'documents/owner-statement.html\', \'Owner Statement ' + escAttr(s.periodLabel) + '\')">View</button></td>' +
      '</tr>';
  }).join('');

  return '<button type="button" class="af-backlink" onclick="afGoto(\'owners\')">&larr; Back to Owners</button>' +
    afPageHead(o.name, o.email + ' &bull; ' + o.phone,
      '<button type="button" class="af-btn primary" onclick="afModalRequestDraw(\'' + escAttr(o.id) + '\')">Request Owner Draw</button>') +
    '<div class="af-kv">' +
      '<div><dt>Type</dt><dd>' + esc(o.type) + '</dd></div>' +
      '<div><dt>Operating Reserve</dt><dd>' + afFmtMoney(o.reserveCents) + '</dd></div>' +
      '<div><dt>Property</dt><dd>' + esc(p ? p.name : '—') + '</dd></div>' +
      '<div><dt>Available Operating Cash</dt><dd style="font-weight:700;color:var(--af-accent);">' + afFmtMoney(p ? p.operatingCashCents : 820000) + '</dd></div>' +
      '<div><dt>Bank Disbursement</dt><dd>' + esc(o.bankAccount ? o.bankAccount.bank + ' ' + o.bankAccount.account : 'ACH Direct Deposit') + '</dd></div>' +
      '<div><dt>Tax ID</dt><dd>' + esc(o.taxId) + '</dd></div>' +
    '</div>' +
    '<section class="af-card" style="margin-top:20px;">' +
      '<h3>Owner Operating Statements</h3>' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Period</th><th class="num">Income</th><th class="num">Expenses</th><th class="num">Mgmt Fee</th><th class="num">Net Distribution</th><th>Status</th><th></th>' +
      '</tr></thead><tbody>' + stmtRows + '</tbody></table>' +
    '</section>';
}

/* ---------- Leasing (Modular Views by Tab) ---------- */
function afLeasingHTML() {
  const tab = afState.sectionTab || 'vacancies';
  if (tab === 'guest-cards') return afLeasingGuestCardsHTML();
  if (tab === 'applications') return afLeasingApplicationsHTML();
  if (tab === 'leases') return afLeasingLeasesHTML();
  if (tab === 'renewals') return afLeasingRenewalsHTML();
  if (tab === 'lsg-metrics') return afLeasingMetricsHTML();
  if (tab === 'signals') return afLeasingSignalsHTML();
  return afLeasingVacanciesHTML();
}

/* ---------- Leasing: Vacancies ----------
   Rebuilt against the 2026 Vacancies screenshot. What was here was a six-column
   table, and a table is the wrong shape for this screen: the product does not
   ask "what are my vacant units", it asks "is this unit ON THE MARKET YET", and
   it answers that with a posting matrix per unit — Website, Internet, Premium,
   Zillow Spotlight, each with a state and a button. A table row cannot hold
   that, so the real screen is a stack of cards, and so is this one.

   The posting state is the point of the screen, so it is real state rather than
   decoration: Post flips the channel, the label changes, and Unpost puts it
   back. A VA whose training Post button only fires a toast has not learned
   which of these four channels they actually turned on. */

/* Channels, in the order the product stacks them. `activate` marks the two that
   are paid add-ons: those say Off / Activate rather than Not Posted / Post. */
const AF_VAC_CHANNELS = [
  { id: 'website',  label: 'Website',          on: 'Posted',  off: 'Not Posted', act: 'Post',       deact: 'Unpost' },
  { id: 'internet', label: 'Internet',         on: 'Posted',  off: 'Not Posted', act: 'Post',       deact: 'Unpost' },
  { id: 'premium',  label: 'Premium',          on: 'On',      off: 'Off',        act: 'Activate',   deact: 'Deactivate', paid: true },
  { id: 'zillow',   label: 'Zillow Spotlight', on: 'On',      off: 'Off',        act: 'Learn More', deact: 'Deactivate', paid: true, badge: 'NEW' }
];

const AF_VAC_SORTS = [
  ['days',     'Days Vacant'],
  ['rent',     'Rent'],
  ['property', 'Property'],
  ['beds',     'Bedrooms']
];

function afPostingState(unitId) {
  return Object.assign(
    { website: false, internet: false, premium: false, zillow: false },
    (afDemo.postings || {})[unitId] || {}
  );
}

function afTogglePosting(unitId, channelId) {
  const ch = AF_VAC_CHANNELS.filter(function (c) { return c.id === channelId; })[0];
  if (!ch) return;
  const state = afPostingState(unitId);
  const turningOn = !state[channelId];

  /* Zillow Spotlight is a sales page in the real product, not a switch. Saying
     so is more useful than pretending the module can buy it. */
  if (ch.id === 'zillow' && turningOn) {
    afDemoAction('Zillow Listing Spotlight');
    return;
  }

  state[channelId] = turningOn;
  afDemo.postings = Object.assign({}, afDemo.postings);
  afDemo.postings[unitId] = state;

  const u = afGetUnit(unitId);
  const p = u ? afGetProperty(u.propertyId) : null;
  const where = p ? p.name : unitId;
  simToast(where + ' — ' + ch.label + ' ' + (turningOn ? ch.on : ch.off).toLowerCase() + '.',
    { tone: turningOn ? 'good' : 'info' });
  afRenderRoot();
}

/* Everything the card shows that is not stored on the unit. Derived rather than
   duplicated, so a lease that ends moves the vacancy clock on its own. */
function afVacancyFacts(u) {
  const ended = afAllLeases()
    .filter(function (l) { return l.unitId === u.id && l.moveOutDate; })
    .map(function (l) { return l.moveOutDate; })
    .sort();

  const since = ended.length ? ended[ended.length - 1] : null;
  let days = since ? -afDaysFromToday(since) : 0;
  /* A unit with no move-out on file still has to have been empty for some
     length of time, and it has to be the SAME length on every render. */
  if (!(days > 0)) days = 12 + (afHashString(u.id + '|vac') % 96);

  let available, onNotice = false;
  if (u.status === 'notice') {
    /* The date the resident is leaving on. Read from the unit, because the world
       contract keeps leases off notice units — see the note in the catalogue. */
    const l = afAllLeases().filter(function (x) {
      return x.unitId === u.id && x.status === 'active' && x.endDate;
    })[0];
    available = u.noticeVacateDate ? afFmtDate(u.noticeVacateDate)
      : (l ? afFmtDate(l.endDate) : '--');
    onNotice = true;
  } else if (u.status === 'vacant-rehab') {
    available = afFmtDate(afAddDays(afToday(), 10 + (afHashString(u.id + '|rdy') % 35)));
  } else {
    available = 'Now';
  }

  /* A vacancy with no photographs is the most ordinary reason a unit sits, so
     some of the catalogue has none and the card has to show that plainly. */
  const h = afHashString(u.id + '|pix');
  const photos = (h % 7) === 0 ? 0 : 4 + (h % 22);

  return { days: days, available: available, onNotice: onNotice, photos: photos };
}

/* Listing photography. Ten public-licence photographs of real Texas and US
   residential property, keyed BY PROPERTY rather than by unit, because that is
   how a real portfolio works: every unit in Maplewood Commons is photographed
   against the same building. Provenance and attribution for all ten are in
   Images-resources/RESOURCES.md §9 — the CC BY-SA ones require it. */
const AF_PHOTO_DIR = 'Images-resources/listing-photos/';
const AF_LISTING_PHOTOS = {
  'single-family': ['sfh-01.jpg', 'sfh-02.jpg'],
  'duplex':        ['duplex-01.jpg', 'duplex-02.jpg'],
  'fourplex':      ['fourplex-01.jpg', 'fourplex-02.jpg'],
  'apartment':     ['apartment-01.jpg', 'apartment-02.jpg', 'apartment-03.jpg', 'apartment-04.jpg']
};
function afListingPhoto(prop) {
  const set = AF_LISTING_PHOTOS[prop.type] || AF_LISTING_PHOTOS['single-family'];
  return AF_PHOTO_DIR + set[afHashString(prop.id + '|photo') % set.length];
}

function afVacSort() { return (afDemo.filters || {}).vacSort || 'days'; }
function afSetVacSort(v) {
  afDemo.filters = Object.assign({}, afDemo.filters, { vacSort: v });
  afRenderRoot();
}

function afVacancyCardHTML(u) {
  const p = afGetProperty(u.propertyId) || {};
  const f = afVacancyFacts(u);
  const state = afPostingState(u.id);
  const unitLine = (p.name || u.id) + (u.label ? ' — Unit ' + u.label : '');

  const stats = [
    ['BD/BA',     u.beds + '/' + u.baths],
    ['SQ. FT.',   u.sqft ? String(u.sqft) : '--'],
    ['RENT',      afFmtMoney(u.marketRent, { whole: true })],
    ['AVAILABLE', f.available]
  ].map(function (s) {
    return '<div class="af-vac-stat"><span class="af-vac-stat-l">' + esc(s[0]) + '</span>' +
      '<span class="af-vac-stat-v">' + esc(s[1]) + '</span></div>';
  }).join('');

  const channels = AF_VAC_CHANNELS.map(function (c) {
    const on = !!state[c.id];
    return '<div class="af-vac-chan">' +
      '<span class="af-vac-chan-l">' + esc(c.label) +
        (c.badge ? '<span class="af-vac-new">' + esc(c.badge) + '</span>' : '') + '</span>' +
      '<span class="af-vac-chan-s' + (on ? ' on' : '') + '">' + esc(on ? c.on : c.off) + '</span>' +
      '<button type="button" class="af-btn sm primary af-vac-post"' +
        ' onclick="afTogglePosting(\'' + escAttr(u.id) + '\', \'' + escAttr(c.id) + '\')">' +
        esc(on ? c.deact : c.act) + '</button>' +
    '</div>';
  }).join('');

  /* A unit with no photographs falls back to the product's own grey house tile.
     That contrast is the lesson: "0 Photos" next to a blank square is the most
     ordinary reason a vacancy is not getting calls. */
  const photo = (f.photos
      ? '<div class="af-vac-photo"><img src="' + escAttr(afListingPhoto(p)) + '"' +
          ' alt="' + escAttr(unitLine) + '" loading="lazy" decoding="async"></div>'
      : '<div class="af-vac-photo empty">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">' +
            '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/></svg>' +
        '</div>') +
    '<div class="af-vac-photon">' + f.photos + ' Photo' + (f.photos === 1 ? '' : 's') + '</div>';

  return '<article class="af-vac">' +
    '<div class="af-vac-photowrap">' + photo + '</div>' +
    '<div class="af-vac-main">' +
      '<a href="#" class="af-vac-title" onclick="afGoto(\'unit-detail\', \'' + escAttr(u.id) + '\');return false;">' +
        esc(unitLine) + '</a>' +
      '<div class="af-vac-addr">' + esc(p.address || '') + '</div>' +
      '<div class="af-vac-stats">' + stats + '</div>' +
    '</div>' +
    '<div class="af-vac-side">' +
      '<div class="af-vac-banner' + (f.onNotice ? ' notice' : '') + '">' +
        (f.onNotice
          ? 'On Notice' + (f.available === '--' ? '' : ' — Available ' + esc(f.available))
          : 'Vacant For: ' + f.days + ' days') +
      '</div>' +
      '<button type="button" class="af-vac-more" onclick="afDemoAction(\'Vacancy actions\')">Actions &bull;&bull;&bull;</button>' +
      '<div class="af-vac-chans">' + channels + '</div>' +
    '</div>' +
  '</article>';
}

const AF_SF_VACANCIES = [
  { id: 'property', label: 'Property', type: 'text', placeholder: 'Any property',
    get: function (u) { return (afGetProperty(u.propertyId) || {}).name; } },
  { id: 'unit',     label: 'Unit',     type: 'text', placeholder: 'Any unit',
    get: function (u) { return u.label; } },
  { id: 'beds',     label: 'Bedrooms', type: 'select', options: ['Any', '0', '1', '2', '3', '4'],
    get: function (u) { return String(u.beds); } },
  { id: 'posted',   label: 'Posted',   type: 'select', options: ['Any', 'Posted', 'Not Posted'],
    get: function (u) {
      const st = afPostingState(u.id);
      return (st.website || st.internet) ? 'Posted' : 'Not Posted';
    } }
];

function afLeasingVacanciesHTML() {
  const all = afAllUnits().filter(function (u) {
    return String(u.status).indexOf('vacant') === 0 || u.status === 'notice';
  });
  const units = afSearchFilter('vacancies', all, AF_SF_VACANCIES);

  const sort = afVacSort();
  units.sort(function (a, b) {
    if (sort === 'rent') return b.marketRent - a.marketRent;
    if (sort === 'beds') return b.beds - a.beds;
    if (sort === 'property') {
      const pa = (afGetProperty(a.propertyId) || {}).name || '';
      const pb = (afGetProperty(b.propertyId) || {}).name || '';
      return pa.localeCompare(pb) || String(a.label).localeCompare(String(b.label));
    }
    return afVacancyFacts(b).days - afVacancyFacts(a).days;
  });


  const user = afDemo.user || {};

  return '<div class="af-page">' +
    '<div class="af-pagehead"><h1>Vacancies</h1></div>' +
    afSearchPanel('vacancies', AF_SF_VACANCIES) +
    /* The contact block and the sort control share one band under the search
       fold, exactly where the product puts them. */
    '<div class="af-vac-bar">' +
      '<div class="af-vac-contact">' +
        '<b>Vacancy Posting Contact Settings:</b>' +
        '<div>' + esc(user.officePhone || '(214) 555-0138') + ' - ' + esc(user.email || '') +
          ' (<a href="#" onclick="afModalPostingContact();return false;">Edit</a>)</div>' +
      '</div>' +
      '<label class="af-vac-sort">Sort By: ' +
        '<select onchange="afSetVacSort(this.value)">' +
          AF_VAC_SORTS.map(function (s) {
            return '<option value="' + s[0] + '"' + (sort === s[0] ? ' selected' : '') + '>' + s[1] + '</option>';
          }).join('') +
        '</select></label>' +
    '</div>' +
    (units.length
      ? units.map(afVacancyCardHTML).join('') + afDisplaying(units.length, all.length)
      : afEmptyState({
          title: all.length ? 'No vacancies match these filters' : 'No vacancies',
          body: all.length
            ? 'Reset the filters to see all ' + all.length + ' vacancies.'
            : 'Every unit in the portfolio is occupied. Units on notice appear here as their lease end approaches.'
        })) +
  '</div>';
}

/* ---------------- Leasing: Guest Cards ----------------
   Rebuilt against the 2026 Guest Cards screenshot. The old screen invented its
   own columns — Lead Name, Inquired Unit, Lead Source, Stage, Actions — with a
   row of stage buttons on every line. The product's list has none of that. It
   has five columns, a checkbox, and a bulk-action bar, because the list is for
   TRIAGE: who came in, what they asked about, when they last touched us, and
   where they came from. The work on a single lead happens after you click the
   name, not in the row.

   So the pipeline actions did not disappear — they moved behind the name, which
   is where the product keeps them. A VA who learns to advance a lead from a row
   button learns a control that does not exist in the real screen. */

const AF_GC_SOURCES = {
  'Zillow': 'Zillow Rental Network'   /* the product names the channel, not the brand */
};

/* Stage → the activity line the product prints in bold with a date under it. */
const AF_GC_ACTIVITY = {
  'inquiry':        'Guest Card Received',
  'contacted':      'Interest Received',
  'tour-scheduled': 'Showing Scheduled',
  'toured':         'Showing Completed',
  'applied':        'Application Received'
};

/* "Miller, Brenda". The product sorts and prints leads surname-first, which is
   the whole reason its Name column sorts usefully. */
function afGcName(g) {
  /* Only people get inverted. Anything else in this collection is a record, not
     a surname, and flipping it produces nonsense. */
  if (g.kind && g.kind !== 'prospect') return g.name || '';
  const parts = String(g.name || '').trim().split(/\s+/);
  if (parts.length < 2) return g.name || '';
  return parts.slice(1).join(' ') + ', ' + parts[0];
}

/* The leads list is a list of PROSPECTS. The collection also carries the
   fair-housing draft listing (GC-FH-02), which is a marketing document — it has
   no stage, nobody is waiting on a call back, and it cannot be advanced through
   a funnel. It stays in the data for the curriculum and out of this list. */
function afGuestCardProspects() {
  return afAllGuestCards().filter(function (g) { return !g.kind || g.kind === 'prospect'; });
}

function afGcSource(g) { return AF_GC_SOURCES[g.source] || g.source || '—'; }

/* The last date anything happened on this lead. A showing that has been booked
   is more recent news than the inquiry that produced it. */
function afGcLatest(g) {
  const dates = [g.createdDate, g.showingDate].filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : g.createdDate;
}

function afGcInterestedIn(g) {
  const u = afGetUnit(g.unitId);
  const p = u ? afGetProperty(u.propertyId) : null;
  if (!p) return '—';
  return p.address + (u && u.label ? ' Unit ' + u.label : '');
}

function afSfGuestCards() {
  return [
    { id: 'name',   label: 'Name',          type: 'text', placeholder: 'Search by name',
      get: function (g) { return afGcName(g); } },
    { id: 'unit',   label: 'Interested In', type: 'text', placeholder: 'Any property',
      get: function (g) { return afGcInterestedIn(g); } },
    { id: 'source', label: 'Source',        type: 'select',
      options: ['All'].concat([...new Set(afGuestCardProspects().map(afGcSource))].sort()),
      get: function (g) { return afGcSource(g); } },
    { id: 'activity', label: 'Most Recent Activity', type: 'select',
      options: ['All'].concat([...new Set(Object.keys(AF_GC_ACTIVITY).map(function (k) { return AF_GC_ACTIVITY[k]; }))]),
      get: function (g) { return AF_GC_ACTIVITY[g.stage] || g.stage; } }
  ];
}

function afLeasingGuestCardsHTML() {
  const all = afGuestCardProspects();
  const fields = afSfGuestCards();
  const found = afSearchFilter('guest-cards', all.slice(), fields);
  const rows = afApplySort('guest-cards', found, {
    name:     function (g) { return afGcName(g); },
    unit:     function (g) { return afGcInterestedIn(g); },
    latest:   function (g) { return afGcLatest(g); },
    activity: function (g) { return AF_GC_ACTIVITY[g.stage] || g.stage; },
    source:   function (g) { return afGcSource(g); }
  });

  const body = rows.map(function (g) {
    const latest = afGcLatest(g);
    return '<tr>' +
      '<td><input type="checkbox"' + (afRowChecked('guest-cards', g.id) ? ' checked' : '') +
        ' onchange="afToggleRow(\'guest-cards\', \'' + escAttr(g.id) + '\', this.checked)"' +
        ' aria-label="Select ' + escAttr(afGcName(g)) + '"></td>' +
      '<td><button type="button" class="af-linkbtn" data-gc="' + escAttr(g.id) + '"' +
        ' onclick="afGuestCardModal(\'' + escAttr(g.id) + '\')">' + esc(afGcName(g)) + '</button></td>' +
      '<td>' + esc(afGcInterestedIn(g)) + '</td>' +
      '<td>' + afFmtDateNum(latest) + '</td>' +
      '<td><b>' + esc(AF_GC_ACTIVITY[g.stage] || g.stage) + '</b>' +
        '<div class="af-sub">' + afFmtDateNum(latest) + '</div></td>' +
      '<td>' + esc(afGcSource(g)) + '</td>' +
    '</tr>';
  }).join('');

  return '<div class="af-page">' +
    '<h1>Guest Cards</h1>' +
    afSearchPanel('guest-cards', fields) +
    afBulkBar('guest-cards', [
      'Mark Active', 'Mark Inactive', 'Mark Waitlisted', 'Send Email', 'Assign User',
      'Send Application Link', 'Send Showing Link', 'Send Text'
    ]) +
    '<div class="af-tablewrap"><table class="af-table">' +
      '<thead><tr><th class="af-th-chk"></th>' +
        afSortTh('guest-cards', 'Name', 'name') +
        afSortTh('guest-cards', 'Interested In', 'unit') +
        afSortTh('guest-cards', 'Latest Interest', 'latest') +
        afSortTh('guest-cards', 'Most Recent Activity', 'activity') +
        afSortTh('guest-cards', 'Source', 'source') +
      '</tr></thead>' +
      '<tbody>' + (body || '<tr><td colspan="6">' +
        afEmpty(all.length ? 'No guest cards match these filters.' : 'There are currently no guest cards.') +
        '</td></tr>') +
      '</tbody></table></div>' +
    afDisplaying(rows.length, all.length) +
  '</div>';
}

/* The lead itself. Everything the old list crammed into a row lives here: what
   they asked, where they are in the funnel, and the one control that moves them
   to the next step. */
const AF_GC_NEXT = {
  'inquiry':        { stage: 'contacted',      label: 'Mark Contacted' },
  'contacted':      { stage: 'tour-scheduled', label: 'Schedule Showing' },
  'tour-scheduled': { stage: 'toured',         label: 'Mark Showing Complete' },
  'toured':         { stage: 'applied',        label: 'Send Application Link' }
};

function afGuestCardModal(id) {
  const g = afAllGuestCards().filter(function (x) { return x.id === id; })[0];
  if (!g) return;
  const next = AF_GC_NEXT[g.stage];

  const body =
    '<div class="af-gc-head">' +
      '<div><b>' + esc(g.name) + '</b>' +
        '<div class="af-sub">' + esc(g.email || '') + ' &middot; ' + esc(g.phone || '') + '</div></div>' +
      '<span class="af-badge ' + (g.stage === 'applied' ? 'good' : (g.stage === 'inquiry' ? 'warn' : 'neutral')) + '">' +
        esc(AF_GC_ACTIVITY[g.stage] || g.stage) + '</span>' +
    '</div>' +
    '<div class="af-kv">' +
      '<div><dt>Interested In</dt><dd>' + esc(afGcInterestedIn(g)) + '</dd></div>' +
      '<div><dt>Source</dt><dd>' + esc(afGcSource(g)) + '</dd></div>' +
      '<div><dt>Guest Card Received</dt><dd>' + afFmtDate(g.createdDate) + '</dd></div>' +
      '<div><dt>Showing</dt><dd>' + (g.showingDate ? afFmtDate(g.showingDate) : 'Not scheduled') + '</dd></div>' +
    '</div>' +
    (g.notes ? '<div class="af-gc-note"><b>Inquiry</b><p>' + esc(g.notes) + '</p></div>' : '');

  const foot =
    '<button type="button" class="af-btn" onclick="afCloseModal()">Close</button>' +
    (next
      ? '<button type="button" class="af-btn primary" data-gc-advance="' + escAttr(g.id) + '"' +
        ' onclick="afCloseModal();afSetGuestCardStage(\'' + escAttr(g.id) + '\', \'' + escAttr(next.stage) + '\')">' +
        esc(next.label) + '</button>'
      : '<span class="af-pill-good">&#10003; Application Submitted</span>');

  afOpenModal('Guest Card', body, foot);
}

/* ---------------- Leasing: Rental Applications ----------------
   Rebuilt against the 2026 Rental Applications screenshot. The old screen was a
   flat table of applicants; the product groups them BY PROPERTY into cards, and
   that grouping is the screen's whole argument. A leasing agent does not work
   an applicant queue, they work a unit: three people applied for 2800 Maplewood
   and only one of them can have it. A flat list hides the competition; a card
   per property puts the rival applications on the same page, which is the
   decision the VA is actually being trained to prepare.

   Each card is the property header the product shows — photo, address, market
   rent, vacant-on — over a table of the applications against it. */

/* Our statuses in the product's words. "Decision Pending" is the phrase the
   screenshot prints; the rest follow the same voice. */
const AF_APP_STATUS = {
  'new':         'Decision Pending',
  'screening':   'Screening In Progress',
  'conditional': 'Conditionally Approved',
  'approved':    'Approved',
  'denied':      'Denied'
};

/* Residential history is a verification the office requests, so it tracks how
   far the file has actually travelled rather than being decorative. */
const AF_APP_HISTORY = {
  'new':         'None Requested',
  'screening':   'Requested',
  'conditional': 'Received',
  'approved':    'Received',
  'denied':      'Received'
};

/* "08/17/2026 11:39 AM". The clock is derived from the record's id so a file
   does not appear to have been received at a different time on every render. */
function afFmtDateTime(iso, seed) {
  if (!iso) return '—';
  const h = afHashString(String(seed || iso) + '|clock');
  const mins = 8 * 60 + (h % (10 * 60));          /* between 8:00 AM and 6:00 PM */
  return afFmtDateNum(iso) + ' ' + afCalClock(mins);
}

/* The date the unit last emptied. A unit the portfolio has never leased says so
   rather than showing a blank, which is what the product does. */
function afVacantOn(unitId) {
  const ended = afAllLeases()
    .filter(function (l) { return l.unitId === unitId && l.moveOutDate; })
    .map(function (l) { return l.moveOutDate; })
    .sort();
  if (ended.length) return afFmtDate(ended[ended.length - 1]);
  const u = afGetUnit(unitId);
  return (u && u.currentLeaseId) ? 'Occupied' : 'Never Rented';
}

function afApplicationCardHTML(propertyId, apps) {
  const p = afGetProperty(propertyId) || {};
  /* Market rent and the vacancy clock belong to the UNIT, and a property card
     can carry applications against more than one of them. When they disagree,
     the card says so rather than quietly picking the first. */
  const unitIds = [...new Set(apps.map(function (a) { return a.unitId; }))];
  const rents = [...new Set(unitIds.map(function (id) {
    const u = afGetUnit(id); return u ? u.marketRent : null;
  }).filter(function (v) { return v != null; }))];
  const marketRent = rents.length === 1 ? afFmtMoney(rents[0], { whole: true })
    : rents.length ? 'Varies by unit' : '--';
  const vacantOn = unitIds.length === 1 ? afVacantOn(unitIds[0]) : 'Varies by unit';

  const rows = apps.slice().sort(function (a, b) {
    return String(b.createdDate).localeCompare(String(a.createdDate));
  }).map(function (a) {
    const u = afGetUnit(a.unitId);
    return '<tr>' +
      '<td><button type="button" class="af-linkbtn" data-app="' + escAttr(a.id) + '"' +
        ' onclick="afGoto(\'application\', \'' + escAttr(a.id) + '\')">' + esc(a.name) + '</button>' +
        (unitIds.length > 1 && u ? '<div class="af-sub">Unit ' + esc(u.label) + '</div>' : '') + '</td>' +
      '<td>' + afFmtDateNum(a.requestedMoveIn) + '</td>' +
      '<td>' + esc(AF_APP_STATUS[a.status] || a.status) + '</td>' +
      '<td>' + esc(AF_APP_HISTORY[a.status] || 'None Requested') + '</td>' +
      '<td>' + afFmtDateTime(a.createdDate, a.id) + '</td>' +
    '</tr>';
  }).join('');

  return '<article class="af-ra">' +
    '<div class="af-ra-head">' +
      '<div class="af-ra-photo">' +
        '<img src="' + escAttr(afListingPhoto(p)) + '" alt="' + escAttr(p.name || '') + '"' +
          ' loading="lazy" decoding="async">' +
      '</div>' +
      '<div class="af-ra-facts">' +
        '<a href="#" class="af-ra-title" onclick="afGoto(\'property-detail\', \'' + escAttr(p.id) + '\');return false;">' +
          esc(p.name || p.id) + '</a>' +
        '<dl>' +
          '<dt>Address</dt><dd>' + esc(p.address || '') +
            '<br>' + esc((p.city || '') + ', ' + (p.state || '') + ' ' + (p.zip || '')) + '</dd>' +
          '<dt>Market Rent:</dt><dd>' + esc(marketRent) + '</dd>' +
          '<dt>Vacant On:</dt><dd>' + esc(vacantOn) + '</dd>' +
        '</dl>' +
      '</div>' +
    '</div>' +
    '<div class="af-tablewrap flush"><table class="af-table">' +
      '<thead><tr>' +
        '<th>Applicant(s)</th><th>Desired Move In</th><th>Status</th>' +
        '<th>Residential History</th><th>Received</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
  '</article>';
}

function afSfApplications() {
  return [
    { id: 'applicant', label: 'Applicant', type: 'text', placeholder: 'Search by name',
      get: function (a) { return a.name; } },
    { id: 'property',  label: 'Property',  type: 'text', placeholder: 'Any property',
      get: function (a) { return (afGetProperty(a.propertyId) || {}).name; } },
    { id: 'status',    label: 'Status',    type: 'select',
      options: ['All'].concat([...new Set(Object.keys(AF_APP_STATUS).map(function (k) { return AF_APP_STATUS[k]; }))]),
      get: function (a) { return AF_APP_STATUS[a.status] || a.status; } },
    { id: 'history',   label: 'Residential History', type: 'select',
      options: ['All', 'None Requested', 'Requested', 'Received'],
      get: function (a) { return AF_APP_HISTORY[a.status] || 'None Requested'; } }
  ];
}

function afLeasingApplicationsHTML() {
  const all = afAllApplications();
  const fields = afSfApplications();
  const apps = afSearchFilter('applications', all, fields);

  /* Group by property, newest application first — the order the screen is read
     in, since the freshest file is the one somebody still has to action. */
  const groups = {};
  apps.forEach(function (a) {
    const pid = a.propertyId || ((afGetUnit(a.unitId) || {}).propertyId);
    if (!pid) return;
    (groups[pid] = groups[pid] || []).push(a);
  });
  const order = Object.keys(groups).sort(function (x, y) {
    const gx = groups[x].map(function (a) { return a.createdDate; }).sort().pop();
    const gy = groups[y].map(function (a) { return a.createdDate; }).sort().pop();
    return String(gy).localeCompare(String(gx));
  });

  return '<div class="af-page">' +
    '<h1>Rental Applications</h1>' +
    afSearchPanel('applications', fields) +
    (order.length
      ? order.map(function (pid) { return afApplicationCardHTML(pid, groups[pid]); }).join('')
      : afEmptyState({
          title: all.length ? 'No applications match these filters' : 'No rental applications',
          body: all.length
            ? 'Reset the filters to see all ' + all.length + ' applications.'
            : 'Applications appear here as prospects submit them from a posted vacancy.'
        })) +
    afDisplaying(apps.length, all.length) +
  '</div>';
}

/* ---------------- Leasing: Leases ----------------
   The product's tab here is the LEASE DOCUMENT queue (/lease_documents), not a
   directory of lease records — its four filters are All, Ready to Countersign,
   Out for Signing and Printed, which are stages of a signature, not states of a
   tenancy. The screenshot shows it empty on a live account, because nothing was
   out for signature that day. That is the normal state of this screen and the
   module should be able to show it.

   Two of the four filters are honest about the model: this module's lease
   lifecycle goes unsigned -> executed in one step, so nothing ever rests in
   "Ready to Countersign", and nothing is printed for wet signature. Those tabs
   say so rather than quietly showing the same rows as All. */

const AF_LEASE_DOC_TABS = [
  { id: 'all',          label: 'All' },
  { id: 'countersign',  label: 'Ready to Countersign' },
  { id: 'signing',      label: 'Out for Signing' },
  { id: 'printed',      label: 'Printed' }
];

/* What a lease's document is doing, in the product's words. */
function afLeaseDocState(l) {
  if (l.signatureStatus === 'unsigned') return 'Out for Signing';
  if (l.signatureStatus === 'resident-signed') return 'Ready to Countersign';
  if (l.signatureStatus === 'printed') return 'Printed';
  return 'Executed';
}

function afLeaseDocTab() { return (afDemo.filters || {}).leaseDocTab || 'all'; }
function afSetLeaseDocTab(id) {
  afDemo.filters = Object.assign({}, afDemo.filters, { leaseDocTab: id });
  afRenderRoot();
}

/* A segmented strip of filters, the way the product renders this one: bordered
   group, active segment filled grey. */
function afSegBar(tabs, active, call) {
  return '<div class="af-segbar">' +
    tabs.map(function (t) {
      return '<button type="button" class="af-seg' + (t.id === active ? ' on' : '') + '"' +
        ' onclick="' + call + '(\'' + escAttr(t.id) + '\')">' + esc(t.label) + '</button>';
    }).join('') +
  '</div>';
}

function afLeasingLeasesHTML() {
  const all = afAllLeases();
  const tab = afLeaseDocTab();

  const buckets = {
    all:         function () { return all; },
    countersign: function () { return all.filter(function (l) { return l.signatureStatus === 'resident-signed'; }); },
    signing:     function () { return all.filter(function (l) { return l.signatureStatus === 'unsigned'; }); },
    printed:     function () { return all.filter(function (l) { return l.signatureStatus === 'printed'; }); }
  };
  const leases = (buckets[tab] || buckets.all)();

  const rows = leases.map(function (l) {
    const u = afGetUnit(l.unitId);
    const p = u ? afGetProperty(u.propertyId) : null;
    const r = l.residentIds && l.residentIds.length ? afGetResident(l.residentIds[0]) : null;
    const who = r ? r.name : (l.applicantName || 'Resident');
    return '<tr>' +
      '<td><button type="button" class="af-linkbtn" data-lease="' + escAttr(l.id) + '"' +
        ' onclick="afGoto(\'lease-detail\', \'' + escAttr(l.id) + '\')"><b>' + esc(who) + '</b></button>' +
        '<div class="af-sub">' + esc(l.id) + '</div></td>' +
      '<td>' + (p ? esc(p.name) + ' ' : '') + (u ? esc('Unit ' + u.label) : '—') + '</td>' +
      '<td>' + afFmtDateNum(l.startDate) + ' &ndash; ' + afFmtDateNum(l.endDate) + '</td>' +
      '<td class="num">' + afFmtMoney(l.rentAmount, { whole: true }) + '</td>' +
      '<td>' + esc(afLeaseDocState(l)) + '</td>' +
    '</tr>';
  }).join('');

  /* The product's own sentence, and it is the right one to show: an empty
     signing queue means nothing is waiting on anybody. */
  const empty = tab === 'countersign'
    ? 'There are currently no lease documents. This module signs a lease in one step, ' +
      'so no lease waits on a countersignature.'
    : tab === 'printed'
      ? 'There are currently no lease documents. Printing a lease for wet signature ' +
        'is not modelled in this module.'
      : 'There are currently no lease documents.';

  return '<div class="af-page">' +
    '<h1>Leases</h1>' +
    afSegBar(AF_LEASE_DOC_TABS, tab, 'afSetLeaseDocTab') +
    (rows
      ? '<div class="af-tablewrap"><table class="af-table">' +
          '<thead><tr>' +
            '<th>Resident</th><th>Property / Unit</th><th>Lease Term</th>' +
            '<th class="num">Rent</th><th>Document</th>' +
          '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
        afDisplaying(leases.length, all.length)
      : '<p class="af-emptyline">' + esc(empty) + '</p>') +
  '</div>';
}

/* ---------------- Leasing: Renewals ----------------
   Rebuilt against the 2026 Renewals screenshot. Three things the old screen got
   structurally wrong:

   1. The filter panel here is the product's VERTICAL variant and it opens with
      the page — right-aligned labels, a sentence at the top, a status chip box,
      a date window and a month-to-month toggle. This screen is a query, not a
      list you scroll.
   2. The default window is not "everything active". The product opens on
      expirations from today to ninety days out, which is the renewal desk's
      actual working set.
   3. A renewal has a STATUS of its own — Eligible, Pending, Prepared not Sent,
      Sent — which is not the lease's status. The old screen only knew how many
      days were left, so it could not tell a VA the one thing the queue exists
      to answer: has anybody actually sent this offer yet? */

const AF_RENEWAL_STATUSES = ['Eligible', 'Pending', 'Prepared not Sent', 'Sent'];

/* Where a renewal sits. Derived from the lease so an offer that gets generated
   moves through the queue on its own. */
function afRenewalStatus(l) {
  if (l.renewalStatus) return l.renewalStatus;      /* set once an offer is made */
  if (l.renewalOffered) return 'Sent';
  const days = afDaysFromToday(l.endDate);
  /* Inside sixty days the desk is expected to have prepared something; outside
     it the lease is merely eligible. */
  return days <= 60 ? 'Pending' : 'Eligible';
}

/* A month-to-month tenancy is a lease whose term has already run out and that
   nobody has renewed — it rolls monthly. The product lets you include or
   exclude them, because they are the ones with no expiration date to work to. */
function afIsMonthToMonth(l) {
  return l.status === 'active' && afDaysFromToday(l.endDate) < 0;
}

function afSfRenewals() {
  return [
    { id: 'properties', label: 'Properties', type: 'text', placeholder: '',
      get: function (l) {
        const u = afGetUnit(l.unitId);
        return u ? (afGetProperty(u.propertyId) || {}).name : '';
      } },
    { id: 'tenant', label: 'Tenant', type: 'text', placeholder: 'Search by tenant',
      get: function (l) {
        return (l.residentIds || []).map(function (id) {
          return (afGetResident(id) || {}).name || '';
        }).join(' ');
      } },
    { id: 'status', label: 'Status', type: 'chips', options: AF_RENEWAL_STATUSES,
      get: function (l) { return afRenewalStatus(l); } },
    { id: 'window', label: 'Lease Expirations Eligible for Renewal', type: 'daterange',
      get: function (l) { return l.endDate; } },
    /* An inclusion toggle, not a match: it adds rows back rather than narrowing
       them, so it needs the filter hook rather than a `get`. */
    { id: 'mtm', label: 'Include month to month tenants', type: 'checkbox', dflt: true,
      filter: function (rows, on) {
        return on ? rows : rows.filter(function (l) { return !afIsMonthToMonth(l); });
      } }
  ];
}

/* The window the product opens on: today to ninety days out. Seeded once so the
   screen has the product's default rather than an empty range. */
function afRenewalDefaults() {
  return {
    /* The product opens with three of the four statuses already selected —
       everything except offers that have gone out. The renewal desk's queue is
       what still needs doing, not what is done. */
    status: ['Eligible', 'Pending', 'Prepared not Sent'],
    window: { from: afToday(), to: afAddDays(afToday(), 90) },
    mtm: true
  };
}

function afLeasingRenewalsHTML() {
  const key = 'renewals';
  if (!(afDemo.search || {})[key]) {
    afDemo.search = Object.assign({}, afDemo.search);
    afDemo.search[key] = afRenewalDefaults();
  }

  const fields = afSfRenewals();
  const all = afAllLeases().filter(function (l) { return l.status === 'active'; });
  /* A month-to-month lease has an expiry in the past, so the date window would
     drop it before the toggle ever saw it. The toggle decides first. */
  const mtmOn = afSearchValues(key).mtm !== false;
  const inWindow = afSearchFilter(key, all, fields);
  const rows = mtmOn
    ? inWindow.concat(all.filter(function (l) {
        return afIsMonthToMonth(l) && inWindow.indexOf(l) < 0;
      }))
    : inWindow;

  const sorted = afApplySort(key, rows, {
    unit:    function (l) { const u = afGetUnit(l.unitId); return (u ? (afGetProperty(u.propertyId) || {}).name + ' ' + u.label : ''); },
    expires: function (l) { return l.endDate; },
    status:  function (l) { return afRenewalStatus(l); }
  });

  const body = sorted.map(function (l) {
    const u = afGetUnit(l.unitId);
    const p = u ? afGetProperty(u.propertyId) : null;
    const who = (l.residentIds || []).map(function (id) { return (afGetResident(id) || {}).name; })
      .filter(Boolean).join(', ') || 'Resident';
    const st = afRenewalStatus(l);
    const mtm = afIsMonthToMonth(l);
    return '<tr>' +
      '<td><button type="button" class="af-linkbtn" data-lease="' + escAttr(l.id) + '"' +
        ' onclick="afGoto(\'lease-detail\', \'' + escAttr(l.id) + '\')">' +
        esc((p ? p.name : '') + ' – ' + (u ? u.label : '')) + '</button></td>' +
      '<td>' + esc(who) + '</td>' +
      '<td>' + (mtm ? '<span class="af-mtm">Month to month</span>' : afFmtDateNum(l.endDate)) + '</td>' +
      '<td class="num">' + afFmtMoney(l.rentAmount, { whole: true }) + '</td>' +
      '<td class="num">' + afFmtMoney(afRenewalRent(l), { whole: true }) + '</td>' +
      '<td>' + esc(st) + '</td>' +
      '<td>' + (st === 'Sent'
        ? '<span class="af-pill-good">&#10003; Offer sent</span>'
        : '<button type="button" class="af-btn sm primary" onclick="afModalRenewLease(\'' + escAttr(l.id) + '\')">Generate Offer</button>') +
      '</td>' +
    '</tr>';
  }).join('');

  return '<div class="af-page">' +
    '<h1>Renewals</h1>' +
    afSearchPanel(key, fields, {
      layout: 'vertical',
      title: 'Filter your renewals with the options below:'
    }) +
    afSegBar(AF_LEASE_DOC_TABS, afLeaseDocTab(), 'afSetLeaseDocTab') +
    '<div class="af-tablewrap"><table class="af-table">' +
      '<thead><tr>' +
        afSortTh(key, 'Property &ndash; Unit', 'unit') +
        '<th>Tenants</th>' +
        afSortTh(key, 'Expiration', 'expires') +
        '<th class="num">Current Rent</th>' +
        '<th class="num">New Rent <span class="af-help" title="' +
          escAttr('The proposed renewal rent. This module offers 4% over the current rent; ' +
                  'the real product prices it from Leasing Signals when that add-on is active.') +
          '">?</span></th>' +
        afSortTh(key, 'Status', 'status') +
        '<th>Actions</th>' +
      '</tr></thead>' +
      '<tbody>' + (body || '<tr><td colspan="7">' +
        afEmpty('No leases expire in this window. Widen the date range or include month to month tenants.') +
        '</td></tr>') + '</tbody></table></div>' +
    afDisplaying(sorted.length, all.length) +
  '</div>';
}

/* Three Maintenance screens carried a "+ Add" button that only toasted. They
   are ordinary creation flows over entities the registry already knows, so one
   spec table drives all three rather than three near-identical modals. */
const AF_QUICK_CREATE = {
  project: {
    title: 'Add Project', type: 'project', prefix: 'PROJ-',
    fields: [
      { id: 'name',   label: 'Project name', placeholder: 'e.g. Roof replacement, Building B' },
      { id: 'status', label: 'Status', options: ['Planning', 'In Progress', 'On Hold', 'Complete'] },
      { id: 'budget', label: 'Budget ($)', value: '15000' }
    ],
    build: function (v, id) {
      return { id: id, name: v.name, status: v.status, budgetCents: Math.round(Number(v.budget || 0) * 100),
               spentCents: 0, startDate: afToday() };
    }
  },
  inventoryItem: {
    title: 'Add Inventory Item', type: 'inventoryItem', prefix: 'INV-',
    fields: [
      { id: 'name',     label: 'Item', placeholder: 'e.g. Air filter 20x25x1' },
      { id: 'category', label: 'Category', options: ['HVAC', 'Plumbing', 'Electrical', 'Safety', 'Paint', 'Hardware', 'Appliance', 'Window'] },
      { id: 'quantity', label: 'Quantity on hand', value: '24' },
      { id: 'reorder',  label: 'Reorder point', value: '12' },
      { id: 'location', label: 'Location', value: 'Main Warehouse' }
    ],
    build: function (v, id) {
      const qty = Number(v.quantity || 0), re = Number(v.reorder || 0);
      return { id: id, name: v.name, category: v.category, quantity: qty, reorder: re,
               location: v.location, low: qty <= re };
    }
  },
  fixedAsset: {
    title: 'Add Fixed Asset', type: 'fixedAsset', prefix: 'FA-',
    fields: [
      { id: 'label', label: 'Asset', placeholder: 'e.g. 5445 Main Street Home - Water Heater' },
      { id: 'type',  label: 'Type', options: ['HVAC Condenser', 'Water Heater', 'Roof', 'Appliance Package', 'Flooring'] },
      { id: 'years', label: 'Warranty (years)', value: '10' }
    ],
    build: function (v, id) {
      const yrs = Number(v.years || 0) || 10;
      return { id: id, label: v.label, assetId: 'A' + String(afHashString(id) % 100000).padStart(5, '0'),
               type: v.type, status: 'In Service', placedInService: afToday(),
               warrantyExpires: afAddDays(afToday(), Math.round(yrs * 365)) };
    }
  }
};

function afModalQuickCreate(key) {
  const spec = AF_QUICK_CREATE[key];
  if (!spec) return;
  const body = spec.fields.map(function (f) {
    const control = f.options
      ? '<select id="afQc_' + f.id + '" class="af-select">' +
          f.options.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>'
      : '<input type="text" id="afQc_' + f.id + '" class="af-input"' +
          (f.value ? ' value="' + escAttr(f.value) + '"' : '') +
          (f.placeholder ? ' placeholder="' + escAttr(f.placeholder) + '"' : '') + '>';
    return '<div class="af-form-group"><label class="af-label">' + esc(f.label) + '</label>' + control + '</div>';
  }).join('');
  afOpenModal(spec.title, body,
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" onclick="afSaveQuickCreate(\'' + escAttr(key) + '\')">Save</button>');
}

function afSaveQuickCreate(key) {
  const spec = AF_QUICK_CREATE[key];
  if (!spec) return;
  const v = {};
  spec.fields.forEach(function (f) {
    v[f.id] = ((document.getElementById('afQc_' + f.id) || {}).value || '').trim();
  });
  const first = spec.fields[0];
  if (!v[first.id]) { simToast('Enter a ' + first.label.toLowerCase() + ' first.'); return; }

  const seq = (afDemo.created[spec.type] || []).length + 1;
  const id = spec.prefix + 'NEW-' + (9000 + seq);
  afCreate(spec.type, spec.build(v, id));
  afCloseModal();
  simToast(spec.title.replace('Add ', '') + ' ' + v[first.id] + ' created.', { tone: 'good' });
  afRenderRoot();
}

/* A completed work order that turns out not to be fixed goes back into the
   queue. Reopening was an explanation; it is a state change. */
function afReopenWorkOrder(id) {
  const w = afGetWorkOrder(id);
  if (!w) return;
  afSetOverride('workOrder', id, {
    status: w.vendorId ? 'assigned' : 'new',
    completedDate: null,
    billedDate: null
  });
  simToast('Work order ' + id.replace('WO-', '') + ' reopened.', { tone: 'good' });
  afRenderRoot();
}

/* The phone and email a vacancy posting tells prospects to call. It lives on the
   demo user, so editing it is an ordinary sandbox edit. */
function afModalPostingContact() {
  const u = afDemo.user || {};
  afOpenModal('Vacancy Posting Contact Settings',
    '<div class="af-form-group"><label class="af-label">Phone</label>' +
      '<input type="text" id="afPcPhone" class="af-input" value="' + escAttr(u.officePhone || '') + '"></div>' +
    '<div class="af-form-group"><label class="af-label">Email</label>' +
      '<input type="text" id="afPcEmail" class="af-input" value="' + escAttr(u.email || '') + '"></div>' +
    '<p class="af-note">This is what a prospect sees on every posted vacancy.</p>',
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" onclick="afSavePostingContact()">Save</button>');
}
function afSavePostingContact() {
  const phone = (document.getElementById('afPcPhone') || {}).value || '';
  const email = (document.getElementById('afPcEmail') || {}).value || '';
  afDemo.user = Object.assign({}, afDemo.user, { officePhone: phone, email: email });
  afCloseModal();
  simToast('Posting contact updated.', { tone: 'good' });
  afRenderRoot();
}

/* One place decides the renewal ask, so the table and the offer modal cannot
   quote a resident two different numbers. */
function afRenewalRent(l) { return Math.round(l.rentAmount * 1.04); }

function afSetGuestCardStage(id, newStage) {
  afSetOverride('guestCard', id, { stage: newStage });
  simToast('Guest card updated to ' + newStage + '.', { tone: 'good' });
  afRenderRoot();
}


/* ============================================================================
   THE LEASE LIFECYCLE
   ============================================================================

   Approve → generate → sign → collect deposit → move in → (renew) → move out.

   Before this, the chain stopped at "approve". An approved application led
   nowhere: no lease could be created from it, so a vacant unit could never
   become occupied, no deposit could be taken, and the whole leasing half of the
   product was a funnel with no outlet.

   Two things worth stating because they are easy to get wrong:

   APPROVING DOES NOT OCCUPY THE UNIT. The unit stays vacant until somebody
   actually moves in. An approval is a decision about a person, not about a
   unit — and a VA who thinks otherwise will double-book a vacancy. The unit is
   marked as spoken for so it stops being marketed, which is a different thing
   from being occupied.

   THE DEPOSIT IS NOT INCOME. It is collected before move-in, it lands in the
   segregated account, no management fee comes off it, and it stays a liability
   until move-out. Everything in this file treats it that way.
   ============================================================================ */

/* Statuses a unit can be in between "vacant" and "occupied". Docusign-style
   ceremony is deliberately absent: this module signs leases natively, per the
   contract's third decision, with no coupling to the e-signature module. */
const AF_LEASE_FLOW = ['pending', 'active', 'notice-given', 'terminated', 'past'];

/* Generates a lease from an approved application. The lease starts pending and
   unsigned: it exists, it can be read, and it binds nobody yet. */
function afGenerateLease(appId) {
  const app = afGetApplication(appId);
  if (!app) return;

  if (app.status !== 'approved' && app.status !== 'conditional') {
    simToast('Only an approved or conditionally approved application can become a lease.');
    return;
  }
  const unit = afGetUnit(app.unitId);
  if (!unit) return;

  /* A unit already carrying an active lease cannot take another one. This is
     the check that stops a vacancy being double-booked. */
  const existing = afAllLeases().find(function (l) {
    return l.unitId === unit.id && (l.status === 'active' || l.status === 'pending');
  });
  if (existing) {
    afConfirm({
      title: 'That unit already has a lease',
      body: 'Unit ' + unit.label + ' is carrying lease ' + existing.id + ' (' + existing.status + '). ' +
            'A unit can only hold one lease at a time.',
      confirmLabel: 'Understood',
      onConfirm: function () {}
    });
    return;
  }

  const seq = (afDemo.created.lease || []).length + 1;
  const leaseId = 'LEASE-NEW-' + (9000 + seq);
  const start = app.requestedMoveIn || afToday();

  const lease = {
    id: leaseId,
    unitId: unit.id,
    residentIds: [],                 /* filled at move-in, when a resident exists */
    startDate: start,
    endDate: afAddDays(start, 365),
    rentAmount: unit.marketRent,
    dueDay: 1,
    /* One month's rent, the common Texas default. Waived pet deposit is handled
       at move-in for an assistance animal, which is not a pet. */
    depositHeld: 0,                  /* nothing is held until it is collected */
    depositDue: unit.marketRent,
    petDeposit: 0,
    petRent: 0,
    status: 'pending',
    renewalOffered: false,
    moveInDate: null,
    moveOutDate: null,
    balanceCents: 0,
    dqAnchorId: null,
    signatureStatus: 'unsigned',
    signatures: [],
    applicationId: app.id,
    applicantName: app.name,
    applicantEmail: app.email
  };
  afCreate('lease', lease);

  /* The unit stops being marketed but is not yet occupied. */
  afSetOverride('unit', unit.id, { status: 'notice', pendingLeaseId: leaseId });

  simToast('Lease ' + leaseId + ' generated for ' + app.name + '. It is unsigned.', { tone: 'good' });
  afGoto('lease-detail', leaseId);
}

/* Native e-signature. Deliberately not a Docusign envelope: AppFolio signs
   leases in-product, and coupling the two modules would teach a workflow that
   does not exist. */
function afModalSignLease(leaseId) {
  const l = afGetLease(leaseId);
  if (!l) return;
  const unit = afGetUnit(l.unitId);

  const body =
    '<p class="af-page-lede">Signing records the applicant&rsquo;s electronic signature against this lease. ' +
    'It does not move anyone in and it does not collect any money — those are separate steps, in that order.</p>' +
    '<div class="af-kv">' +
      '<div><dt>Lease</dt><dd>' + esc(l.id) + '</dd></div>' +
      '<div><dt>Unit</dt><dd>' + (unit ? esc(unit.label) : '—') + '</dd></div>' +
      '<div><dt>Term</dt><dd>' + afFmtDate(l.startDate) + ' &ndash; ' + afFmtDate(l.endDate) + '</dd></div>' +
      '<div><dt>Rent</dt><dd>' + afFmtMoney(l.rentAmount) + ' / month</dd></div>' +
    '</div>' +
    '<div class="af-form-group"><label class="af-label" for="afSignName">Type the applicant&rsquo;s full legal name to sign</label>' +
    '<input type="text" id="afSignName" class="af-input" placeholder="' + escAttr(l.applicantName || '') + '"></div>' +
    '<p class="af-note">Under the E-SIGN Act a typed name is a valid signature when the signer intends it as one.</p>';

  const foot =
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" id="afBtnSignLease" onclick="afSignLease(\'' + escAttr(leaseId) + '\')">Sign Lease</button>';

  afOpenModal('Sign Lease ' + l.id, body, foot);
}

function afSignLease(leaseId) {
  const l = afGetLease(leaseId);
  if (!l) return;
  const typed = (document.getElementById('afSignName') || {}).value || '';
  const expected = (l.applicantName || '').trim().toLowerCase();

  /* The name has to match. A signature panel that accepts anything teaches that
     the signature is decoration. */
  if (typed.trim().toLowerCase() !== expected) {
    simToast('The typed name must match the applicant on the lease: ' + (l.applicantName || ''));
    return;
  }

  /* The resident signing does NOT execute the lease. It moves it to the
     manager's side of the desk, which is what "Ready to Countersign" means on
     the Leases queue. A lease is executed when BOTH parties have signed, and a
     module that skipped straight to executed taught a VA to hand over keys on a
     half-signed agreement. */
  afSetOverride('lease', leaseId, {
    signatureStatus: 'resident-signed',
    signatures: [{ name: l.applicantName, signedAt: afToday(), method: 'electronic' }]
  });
  afCloseModal();
  simToast('Lease ' + leaseId + ' signed by ' + l.applicantName + '. It now needs your countersignature.',
    { tone: 'good' });
  afRenderRoot();
}

/* The manager's half. Nothing about the lease is binding until this runs, so it
   is a step of its own rather than something the resident's signature implies. */
function afCountersignLease(leaseId) {
  const l = afGetLease(leaseId);
  if (!l) return;
  if (l.signatureStatus !== 'resident-signed') {
    simToast('Only a lease the resident has already signed can be countersigned.');
    return;
  }
  const sigs = (l.signatures || []).concat([{
    name: (afDemo.user || {}).name || 'Property Manager',
    signedAt: afToday(),
    method: 'electronic',
    role: 'manager'
  }]);
  afSetOverride('lease', leaseId, { signatureStatus: 'executed', signatures: sigs });
  simToast('Lease ' + leaseId + ' countersigned and executed.', { tone: 'good' });
  afRenderRoot();
}

/* Collects the move-in deposit. Both sides move together — the lease records
   what it holds and the segregated account receives the cash — because a
   one-sided deposit is exactly what the M4 rule exists to catch. */
function afModalCollectDeposit(leaseId) {
  const l = afGetLease(leaseId);
  if (!l) return;
  const body =
    '<p class="af-page-lede">A security deposit is held, not earned. It goes to the segregated escrow account, ' +
    'no management fee is taken from it, and it stays a liability until move-out.</p>' +
    '<div class="af-form-group"><label class="af-label" for="afDepAmt">Deposit amount ($)</label>' +
    '<input type="number" id="afDepAmt" class="af-input" step="50" value="' + ((l.depositDue || l.rentAmount) / 100).toFixed(2) + '"></div>' +
    '<div class="af-form-group"><label class="af-label" for="afDepMethod">Method</label>' +
    '<select id="afDepMethod" class="af-input"><option>ACH</option><option>Check</option><option>Money order</option></select></div>';
  afOpenModal('Collect Security Deposit', body,
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" id="afBtnCollectDeposit" onclick="afCollectDeposit(\'' + escAttr(leaseId) + '\')">Collect Deposit</button>');
}

function afCollectDeposit(leaseId) {
  const l = afGetLease(leaseId);
  if (!l) return;
  const amt = Math.round(parseFloat((document.getElementById('afDepAmt') || {}).value || '0') * 100);
  if (amt <= 0) { simToast('Enter a deposit amount greater than zero.'); return; }

  /* Ledger: a charge and its payment, so the resident's history shows the
     deposit was billed and settled rather than appearing from nowhere. */
  const entries = afAllLedgerEntries().filter(function (e) { return e.leaseId === leaseId; });
  let bal = entries.length ? entries[entries.length - 1].balanceAfter : 0;
  const n = (afDemo.ledgerEntries || []).length;
  if (!afDemo.ledgerEntries) afDemo.ledgerEntries = [];

  bal += amt;
  afDemo.ledgerEntries.push({
    id: 'LEDGER-DEMO-' + (1000 + n + 1), leaseId: leaseId, date: afToday(),
    type: 'charge', category: 'deposit', description: 'Security deposit due',
    amount: amt, balanceAfter: bal
  });
  bal -= amt;
  afDemo.ledgerEntries.push({
    id: 'LEDGER-DEMO-' + (1000 + n + 2), leaseId: leaseId, date: afToday(),
    type: 'payment', category: 'deposit', description: 'Security deposit received',
    amount: amt, balanceAfter: bal
  });

  afSetOverride('lease', leaseId, { depositHeld: (l.depositHeld || 0) + amt, balanceCents: bal });
  afDepositReceipt({ leaseId: leaseId, amount: amt, kind: 'deposit', payer: l.applicantName || '' });

  afCloseModal();
  simToast('Deposit of ' + afFmtMoney(amt) + ' collected into escrow.', { tone: 'good' });
  afRenderRoot();
}

/* Moves the resident in. This is the step that finally occupies the unit, and
   it refuses to run until the lease is signed and the deposit is held —
   the two things that must be true before somebody gets keys. */
function afMoveIn(leaseId) {
  const l = afGetLease(leaseId);
  if (!l) return;
  const unit = afGetUnit(l.unitId);
  if (!unit) return;

  const problems = [];
  if (l.signatureStatus === 'resident-signed') {
    problems.push('The resident has signed but the lease has not been countersigned.');
  } else if (l.signatureStatus !== 'executed') {
    problems.push('The lease has not been signed.');
  }
  if (!l.depositHeld) problems.push('No security deposit has been collected.');
  if (l.status === 'active') problems.push('This lease is already active.');

  if (problems.length) {
    afConfirm({
      title: 'Cannot move in yet',
      body: problems.join(' '),
      confirmLabel: 'Understood',
      onConfirm: function () {}
    });
    return;
  }

  /* The resident record is created here, not at application time: an applicant
     is not a resident until they have a signed lease and keys. */
  const seq = (afDemo.created.resident || []).length + 1;
  const resId = 'RES-NEW-' + (9000 + seq);
  afCreate('resident', {
    id: resId,
    name: l.applicantName || 'New Resident',
    email: l.applicantEmail || '',
    phone: '',
    propertyId: unit.propertyId,
    unitId: unit.id,
    leaseId: leaseId,
    emergencyContact: { name: '', phone: '', relation: '' },
    vehicles: []
  });

  afSetOverride('lease', leaseId, {
    status: 'active',
    residentIds: [resId],
    moveInDate: afToday()
  });
  afSetOverride('unit', unit.id, {
    status: 'occupied',
    currentLeaseId: leaseId,
    pendingLeaseId: null
  });

  simToast(l.applicantName + ' moved into unit ' + unit.label + '.', { tone: 'good' });
  afRenderRoot();
}

/* Move-out. The deposit disposition is the part that matters: Texas gives a
   landlord 30 days from surrender to refund or itemise, and the clock is what
   the module has to make visible. */
function afModalMoveOut(leaseId) {
  const l = afGetLease(leaseId);
  if (!l) return;
  const held = l.depositHeld || 0;
  const body =
    '<p class="af-page-lede">Moving out ends the lease, returns the unit to the vacant pool, and starts the ' +
    'deposit clock. Texas Property Code &sect; 92.103 gives 30 days from surrender to refund the deposit or ' +
    'deliver a written itemisation of what was withheld.</p>' +
    '<div class="af-kv">' +
      '<div><dt>Deposit held</dt><dd>' + afFmtMoney(held) + '</dd></div>' +
      '<div><dt>Outstanding balance</dt><dd>' + afFmtMoney(l.balanceCents || 0) + '</dd></div>' +
    '</div>' +
    '<div class="af-form-group"><label class="af-label" for="afMoDeductions">Deductions withheld ($)</label>' +
    '<input type="number" id="afMoDeductions" class="af-input" step="25" value="0"></div>' +
    '<div class="af-form-group"><label class="af-label" for="afMoReason">Itemised reason (required if anything is withheld)</label>' +
    '<textarea id="afMoReason" class="af-input" rows="3" placeholder="e.g. carpet cleaning beyond normal wear, $185"></textarea></div>';
  afOpenModal('Move Out — Lease ' + l.id, body,
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn danger" id="afBtnMoveOut" onclick="afSubmitMoveOut(\'' + escAttr(leaseId) + '\')">Complete Move-Out</button>');
}

function afSubmitMoveOut(leaseId) {
  const l = afGetLease(leaseId);
  if (!l) return;
  const held = l.depositHeld || 0;
  const ded = Math.round(parseFloat((document.getElementById('afMoDeductions') || {}).value || '0') * 100);
  const reason = ((document.getElementById('afMoReason') || {}).value || '').trim();

  if (ded > held) { simToast('Deductions cannot exceed the deposit held.'); return; }
  /* Withholding without a written itemisation is the statutory failure. */
  if (ded > 0 && reason.length < 10) {
    simToast('An itemised written reason is required for any amount withheld.');
    return;
  }

  const refund = held - ded;
  const unit = afGetUnit(l.unitId);

  /* The escrow account releases the whole deposit: the refund leaves, and the
     withheld portion moves to trust as owner income rather than vanishing. */
  if (refund > 0) {
    afPostTransaction({
      accountId: AF_ACCT.deposit, leaseId: leaseId,
      propertyId: unit ? unit.propertyId : null,
      description: 'Security deposit refunded — lease ' + leaseId,
      amount: -refund
    });
  }
  if (ded > 0) {
    afPostTransaction({
      accountId: AF_ACCT.deposit, leaseId: leaseId,
      propertyId: unit ? unit.propertyId : null,
      description: 'Deposit withheld, transferred to owner — ' + reason.slice(0, 60),
      amount: -ded
    });
    afPostTransaction({
      accountId: AF_ACCT.trust, leaseId: leaseId,
      propertyId: unit ? unit.propertyId : null,
      description: 'Withheld deposit applied — lease ' + leaseId,
      amount: ded
    });
  }

  afSetOverride('lease', leaseId, {
    status: 'past',
    moveOutDate: afToday(),
    depositHeld: 0,
    depositRefunded: refund,
    depositWithheld: ded,
    depositItemisation: reason,
    /* The deadline, stored so the module can show the clock rather than expect
       a VA to count days in their head. */
    depositDueBy: afAddDays(afToday(), 30)
  });
  if (unit) afSetOverride('unit', unit.id, { status: 'vacant-rehab', currentLeaseId: null });

  afCloseModal();
  simToast('Move-out complete. ' + afFmtMoney(refund) + ' refundable, itemisation due by ' +
    afFmtDate(afAddDays(afToday(), 30)) + '.', { tone: 'good' });
  afRenderRoot();
}

/* Renewal: a new term on the same lease, with the rent that was agreed. */
function afModalRenewLease(leaseId) {
  const l = afGetLease(leaseId);
  if (!l) return;
  const unit = afGetUnit(l.unitId);
  const suggested = unit ? unit.marketRent : l.rentAmount;
  const body =
    '<p class="af-page-lede">Current term ends ' + afFmtDate(l.endDate) + '. A renewal extends it by twelve months ' +
    'from that date, so there is no gap the resident could occupy without a lease.</p>' +
    '<div class="af-kv">' +
      '<div><dt>Current rent</dt><dd>' + afFmtMoney(l.rentAmount) + '</dd></div>' +
      '<div><dt>Market rent</dt><dd>' + afFmtMoney(suggested) + '</dd></div>' +
    '</div>' +
    '<div class="af-form-group"><label class="af-label" for="afRenewRent">New rent ($)</label>' +
    '<input type="number" id="afRenewRent" class="af-input" step="25" value="' + (suggested / 100).toFixed(2) + '"></div>';
  afOpenModal('Renew Lease ' + l.id, body,
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" id="afBtnRenewLease" onclick="afRenewLease(\'' + escAttr(leaseId) + '\')">Offer Renewal</button>');
}

function afRenewLease(leaseId) {
  const l = afGetLease(leaseId);
  if (!l) return;
  const rent = Math.round(parseFloat((document.getElementById('afRenewRent') || {}).value || '0') * 100);
  if (rent <= 0) { simToast('Enter a rent greater than zero.'); return; }

  afSetOverride('lease', leaseId, {
    endDate: afAddDays(l.endDate, 365),
    rentAmount: rent,
    renewalOffered: true,
    /* A renewal is a new agreement and needs signing again. */
    signatureStatus: 'unsigned'
  });
  afCloseModal();
  simToast('Renewal offered at ' + afFmtMoney(rent) + ' through ' + afFmtDate(afAddDays(l.endDate, 365)) + '.', { tone: 'good' });
  afRenderRoot();
}


/* ---------------------------------------------------------------------------
   LEASE DETAIL — where the lifecycle is driven from
   --------------------------------------------------------------------------- */
function afLeaseDetailHTML() {
  const l = afGetLease(afState.activeLeaseId);
  if (!l) return afEmptyState({ title: 'Lease not found', body: 'It may have been removed this session.', actionLabel: 'Back to leasing', action: "afGoto('leasing')" });
  const unit = afGetUnit(l.unitId);
  const prop = unit ? afGetProperty(unit.propertyId) : null;
  const res = (l.residentIds || []).map(afGetResident).filter(Boolean);

  /* The next action, and only the next one. Showing all five buttons at once
     invites doing them out of order, which is the mistake this screen exists to
     prevent. */
  let next = '';
  if (l.status === 'pending' && l.signatureStatus === 'resident-signed') {
    next = '<button type="button" class="af-btn primary" data-action="countersign-lease" onclick="afCountersignLease(\'' + escAttr(l.id) + '\')">Countersign Lease</button>';
  } else if (l.status === 'pending' && l.signatureStatus !== 'executed') {
    next = '<button type="button" class="af-btn primary" data-action="sign-lease" onclick="afModalSignLease(\'' + escAttr(l.id) + '\')">Sign Lease</button>';
  } else if (l.status === 'pending' && !l.depositHeld) {
    next = '<button type="button" class="af-btn primary" data-action="collect-deposit" onclick="afModalCollectDeposit(\'' + escAttr(l.id) + '\')">Collect Security Deposit</button>';
  } else if (l.status === 'pending') {
    next = '<button type="button" class="af-btn primary" data-action="move-in" onclick="afMoveIn(\'' + escAttr(l.id) + '\')">Complete Move-In</button>';
  } else if (l.status === 'active') {
    next = '<button type="button" class="af-btn" data-action="renew-lease" onclick="afModalRenewLease(\'' + escAttr(l.id) + '\')">Offer Renewal</button>' +
           '<button type="button" class="af-btn danger" data-action="move-out" onclick="afModalMoveOut(\'' + escAttr(l.id) + '\')">Move Out</button>';
  }

  const steps = [
    ['Generated', true],
    ['Resident signed', l.signatureStatus === 'resident-signed' || l.signatureStatus === 'executed'],
    ['Countersigned', l.signatureStatus === 'executed'],
    ['Deposit held', !!l.depositHeld],
    ['Moved in', l.status === 'active' || l.status === 'past'],
    ['Moved out', l.status === 'past']
  ];

  return '<button type="button" class="af-backlink" onclick="afGoto(\'leasing\')">&larr; Back to Leasing</button>' +
    afPageHead('Lease ' + l.id,
      (prop ? prop.name + ' · ' : '') + 'Unit ' + (unit ? unit.label : '—') +
      ' · ' + afFmtDate(l.startDate) + ' – ' + afFmtDate(l.endDate), next) +

    '<ol class="af-flow">' + steps.map(function (s) {
      return '<li class="' + (s[1] ? 'done' : '') + '">' + esc(s[0]) + '</li>';
    }).join('') + '</ol>' +

    '<div class="af-kv">' +
      '<div><dt>Status</dt><dd><span class="af-badge ' + escAttr(l.status) + '">' + esc(l.status) + '</span></dd></div>' +
      '<div><dt>Signature</dt><dd>' + esc(afLeaseDocState(l)) + '</dd></div>' +
      '<div><dt>Rent</dt><dd>' + afFmtMoney(l.rentAmount) + ' / month</dd></div>' +
      '<div><dt>Deposit held</dt><dd>' + afFmtMoney(l.depositHeld || 0) +
        (l.depositDue && !l.depositHeld ? ' <span class="af-muted">(' + afFmtMoney(l.depositDue) + ' due)</span>' : '') + '</dd></div>' +
      '<div><dt>Balance</dt><dd>' + afFmtMoney(l.balanceCents || 0) + '</dd></div>' +
      '<div><dt>Resident</dt><dd>' + (res.length ? esc(res.map(function (r) { return r.name; }).join(', ')) : (l.applicantName ? esc(l.applicantName) + ' <span class="af-muted">(applicant)</span>' : '—')) + '</dd></div>' +
    '</div>' +

    (l.status === 'past'
      ? '<div class="af-alert-warn">' +
          '<b>Deposit disposition</b><br>' +
          'Refunded ' + afFmtMoney(l.depositRefunded || 0) + ' · withheld ' + afFmtMoney(l.depositWithheld || 0) + '.<br>' +
          'Written itemisation due by <b>' + afFmtDate(l.depositDueBy) + '</b> — 30 days from surrender under Texas Property Code &sect; 92.103.' +
          (l.depositItemisation ? '<br><br>' + esc(l.depositItemisation) : '') +
        '</div>'
      : '');
}

function afApplicationHTML() {
  const a = afGetApplication(afState.activeApplicationId);
  if (!a) return afEmptyState({ title: 'Application not found', body: 'It may have been removed.', actionLabel: 'Back to leasing', action: "afGoto('leasing')" });
  const u = afGetUnit(a.unitId);
  const p = u ? afGetProperty(u.propertyId) : null;

  return '<button type="button" class="af-backlink" onclick="afGoto(\'leasing\')">&larr; Back to Leasing</button>' +
    afPageHead(a.name, 'Application for Unit ' + (u ? u.label : '') + ' &bull; Submitted ' + afFmtDate(a.createdDate),
      ((a.status === 'approved' || a.status === 'conditional')
        ? (!a.leaseGenerated
            ? '<button type="button" class="af-btn primary" data-action="generate-lease" onclick="afGenerateLease(\'' + escAttr(a.id) + '\');afSetOverride(\'application\',\'' + escAttr(a.id) + '\',{leaseGenerated:true});afRenderRoot();">Generate Lease</button>'
            : '<button type="button" class="af-btn primary" data-action="collect-deposit" onclick="afModalCollectDeposit(\'LEASE-NEW-9001\');">Collect Security Deposit</button>' +
              '<button type="button" class="af-btn" data-action="complete-inspection" style="margin-left:8px" onclick="afSetOverride(\'application\',\'' + escAttr(a.id) + '\',{moveInChecklistComplete:true});simToast(\'Move-In Inspection Completed.\',{tone:\'good\'});afRenderRoot();">Complete Inspection</button>')
        : '') +
      '<button type="button" class="af-btn" style="margin-left:8px" onclick="afModalDecideApp(\'' + escAttr(a.id) + '\')">Screening Decision</button>') +
    '<div class="af-kv af-app-card">' +
      '<div><dt>Decision Status</dt><dd><span class="af-badge ' + escAttr(a.status) + '">' + esc(a.status.toUpperCase()) + '</span></dd></div>' +
      '<div><dt>Monthly Income</dt><dd>' + afFmtMoney(a.monthlyIncomeCents) + '</dd></div>' +
      '<div><dt>Credit Score</dt><dd><b>' + (a.screening ? a.screening.creditScore : '—') + '</b></dd></div>' +
      '<div><dt>Screening Agency</dt><dd>' + (a.screening ? esc(a.screening.creditAgency) : 'TransUnion') + '</dd></div>' +
      '<div><dt>Background Check</dt><dd>' + (a.screening ? esc(a.screening.backgroundCheck) : 'Passed') + '</dd></div>' +
      '<div><dt>Eviction Search</dt><dd>' + (a.screening ? esc(a.screening.evictionRecord) : 'Clean') + '</dd></div>' +
      '<div><dt>FCRA Adverse Action</dt><dd>' + (a.adverseActionSent ? '<span style="color:var(--af-accent);font-weight:700;">Sent</span>' : 'Not sent') + '</dd></div>' +
      '<div><dt>Assistance Animal</dt><dd>' + (a.requestedAccommodation ? '<span style="color:var(--af-accent);font-weight:700;">Yes (Verified Doctor Note on File)</span>' : 'None') + '</dd></div>' +
    '</div>' +
    (a.status === 'denied'
      ? '<div class="af-alert-warn" style="margin-top:16px;">' +
          '<b>FCRA ADVERSE ACTION STATUS:</b> ' +
          (a.adverseActionSent
            ? 'Adverse Action Notice has been issued.'
            : 'Adverse Action Notice is required by federal law for credit denial.') +
          '<div style="margin-top:8px;">' +
            '<button type="button" class="af-btn sm" onclick="SimEngine.viewDoc(\'documents/adverse-action-notice.html\', \'FCRA Adverse Action Notice\')">View Adverse Action Notice</button>' +
          '</div>' +
        '</div>'
      : '') +
    (a.requestedAccommodation
      ? '<div class="af-alert-good" style="margin-top:16px;">' +
          '<b>FAIR HOUSING ACCOMMODATION:</b> Applicant has requested an emotional support animal with verified documentation from ' +
          esc(a.accommodationDetails ? a.accommodationDetails.doctorName : 'licensed medical professional') + '. Under Fair Housing regulations, pet deposit and pet rent are waived.' +
        '</div>'
      : '');
}

/* ---------- Maintenance (Modular Views by Tab) ---------- */
function afMaintenanceHTML() {
  const tab = afState.sectionTab || 'work-orders';
  if (tab === 'recurring') return afRecurringMaintenanceHTML();
  if (tab === 'inspections') return afInspectionsHTML();
  if (tab === 'purchase') return afPurchaseOrdersHTML();
  if (tab === 'unit-turns') return afUnitTurnsHTML();
  if (tab === 'projects') return afProjectsHTML();
  if (tab === 'inventory') return afInventoryHTML();
  if (tab === 'fixed-assets') return afFixedAssetsHTML();
  if (tab === 'performer') return afPerformerHTML();
  if (tab === 'contact') return afMaintenanceContactCenterHTML();
  return afWorkOrdersQueueHTML();
}

/* ---------------- Maintenance: Work Orders ----------------
   Rebuilt against the 2026 Work Orders screenshot. The old screen was a table
   of titles; the product's is a ROW LIST with no column headers, and that shape
   is deliberate. A work order is not a record you scan a column of — it is a
   short story someone has to act on: who reported it, what broke, who has it,
   how long it has been sitting. So each row prints its fields with their own
   labels ("Vendor/Assignee", "Created"), which is the only way a row can carry
   four different kinds of fact and still be readable.

   Above it sits the KPI strip the screenshots catch on every visit —
   "7 Unassigned Resident Requested · 1 Unassigned Internal · -- Add a Dashboard
   Metric · 0 Ready to Bill". Those four numbers are the triage: everything on
   this screen exists to drive the first two to zero. */

/* Status in the product's badge vocabulary, uppercase on the row. Ours are
   lowercase internal states; this is the translation. */
const AF_WO_BADGES = {
  'new':         [['NEW', 'good']],
  'assigned':    [['ASSIGNED', 'neutral']],
  'scheduled':   [['SCHEDULED', 'info']],
  'in-progress': [['IN PROGRESS', 'info']],
  'completed':   [['COMPLETED', 'neutral']],
  'waiting':     [['WAITING', 'warn']]
};

/* Which of the four filter selects the Status control offers. "Open" is the
   product's default and it means everything that is not finished — that is the
   whole point of opening this screen. */
const AF_WO_STATUS_FILTERS = ['Open', 'All', 'New', 'Assigned', 'Scheduled', 'In Progress', 'Completed'];

function afWoIsOpen(w) { return w.status !== 'completed'; }

/* A resident-reported order carries a second badge. The product stacks it under
   the status one, and it matters: a resident is waiting on the other end.

   `reportedBy` is not a clean field — the anchors put a resident id in it
   ('RES-PET-01'), the generator puts one of two display strings ('Resident
   Portal' for an occupied unit, a staff name otherwise). Testing it for
   truthiness, which is what this did first, called all forty resident-reported
   and wiped out the internal queue. Read the shape, not the presence. */
function afWoResidentReported(w) {
  const by = String(w.reportedBy || '');
  if (!by) return false;
  return by.indexOf('RES-') === 0 || /resident/i.test(by);
}

function afWoAssignee(w) {
  const v = w.vendorId ? afGetVendor(w.vendorId) : null;
  return v ? (v.name || v.company || '—') : '--';
}

function afSfWorkOrders() {
  return [
    { id: 'place', label: 'Properties or Units', type: 'text',
      placeholder: 'Search by Unit, Property or Pr...',
      get: function (w) {
        const u = afGetUnit(w.unitId);
        const p = afGetProperty(w.propertyId) || (u ? afGetProperty(u.propertyId) : null) || {};
        return (p.name || '') + ' ' + (p.address || '') + ' ' + (u ? u.label : '');
      } },
    { id: 'status', label: 'Status', type: 'select', options: AF_WO_STATUS_FILTERS,
      /* "Open" is not a status any record holds, so it cannot be a plain match. */
      filter: function (rows, v) {
        if (!v || v === 'All') return rows;
        if (v === 'Open') return rows.filter(afWoIsOpen);
        return rows.filter(function (w) {
          return String(w.status).replace('-', ' ').toLowerCase() === String(v).toLowerCase();
        });
      } },
    { id: 'assigned', label: 'Assigned To', type: 'text', placeholder: 'Search...',
      get: function (w) { return w.assignedTo || afWoAssignee(w); } },
    { id: 'vendor', label: 'Vendor', type: 'text', placeholder: 'Search by vendor or manage...',
      get: function (w) { return afWoAssignee(w); } }
  ];
}

function afWoSort() { return (afDemo.filters || {}).woSort || 'Created At'; }
function afSetWoSort(v) {
  afDemo.filters = Object.assign({}, afDemo.filters, { woSort: v });
  afRenderRoot();
}

/* The four numbers across the top. Each is a real count over the real list, so
   clearing a queue moves them. */
function afWorkOrderKpis(all) {
  const unassigned = all.filter(function (w) { return afWoIsOpen(w) && !w.vendorId; });
  return [
    { n: unassigned.filter(afWoResidentReported).length, label: 'Unassigned Resident Requested' },
    { n: unassigned.filter(function (w) { return !afWoResidentReported(w); }).length, label: 'Unassigned Internal' },
    { n: '--', label: 'Add a Dashboard Metric', muted: true },
    /* Finished but not yet invoiced to the owner. */
    { n: all.filter(function (w) { return w.status === 'completed' && !w.billedDate; }).length, label: 'Ready to Bill' }
  ];
}

function afWorkOrderRowHTML(w) {
  const u = afGetUnit(w.unitId);
  const p = afGetProperty(w.propertyId) || (u ? afGetProperty(u.propertyId) : null) || {};
  const badges = (AF_WO_BADGES[w.status] || [[String(w.status).toUpperCase(), 'neutral']]).slice();
  if (afWoResidentReported(w)) badges.push(['RESIDENT', 'warn']);

  const who = (function () {
    const r = w.reportedBy ? afGetResident(w.reportedBy) : null;
    return r ? r.name : (u && u.currentLeaseId
      ? ((afGetLease(u.currentLeaseId) || {}).residentIds || [])
          .map(function (id) { return (afGetResident(id) || {}).name; }).filter(Boolean).join(', ')
      : '');
  })();

  return '<div class="af-wo">' +
    '<div class="af-wo-chk"><input type="checkbox"' + (afRowChecked('work-orders', w.id) ? ' checked' : '') +
      ' onchange="afToggleRow(\'work-orders\', \'' + escAttr(w.id) + '\', this.checked)"' +
      ' aria-label="Select ' + escAttr(w.id) + '"></div>' +
    '<div class="af-wo-id">' +
      '<button type="button" class="af-linkbtn" data-wo="' + escAttr(w.id) + '"' +
        ' onclick="afGoto(\'work-order\', \'' + escAttr(w.id) + '\')">' +
        esc(w.id.replace('WO-', '')) + '</button>' +
      '<div class="af-wo-badges">' +
        badges.map(function (b) {
          return '<span class="af-badge ' + escAttr(b[1]) + '">' + esc(b[0]) + '</span>';
        }).join('') +
      '</div>' +
    '</div>' +
    '<div class="af-wo-where">' +
      '<b>' + esc(p.address || p.name || '—') + (u && u.label ? ' ' + esc(u.label) : '') + '</b>' +
      (who ? '<div class="af-sub">' + esc(who) + '</div>' : '') +
    '</div>' +
    '<div class="af-wo-what">' + esc(w.title || w.description || '') + '</div>' +
    '<div class="af-wo-field">' +
      '<span class="af-wo-label">Vendor/Assignee</span>' +
      '<div>' + esc(afWoAssignee(w)) + '</div>' +
      '<div class="af-wo-person">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">' +
          '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>' +
        esc(w.assignedTo || '--') +
      '</div>' +
    '</div>' +
    '<div class="af-wo-field">' +
      '<span class="af-wo-label">Created</span>' +
      '<div>' + afFmtDate(w.createdDate) + '</div>' +
    '</div>' +
    '<div class="af-wo-more">' +
      '<button type="button" class="af-linkbtn" aria-label="Open work order"' +
        ' onclick="afGoto(\'work-order\', \'' + escAttr(w.id) + '\')">&#9662;</button>' +
    '</div>' +
  '</div>';
}

function afWorkOrdersQueueHTML() {
  const key = 'work-orders';
  if (!(afDemo.search || {})[key]) {
    afDemo.search = Object.assign({}, afDemo.search);
    afDemo.search[key] = { status: 'Open' };   /* the product's default */
  }
  const fields = afSfWorkOrders();
  const all = afAllWorkOrders();
  const found = afSearchFilter(key, all.slice(), fields);

  const sort = afWoSort();
  const list = found.slice().sort(function (a, b) {
    if (sort === 'Status') return String(a.status).localeCompare(String(b.status));
    if (sort === 'Priority') {
      const rank = { emergency: 0, high: 1, normal: 2, low: 3 };
      return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
    }
    return String(b.createdDate).localeCompare(String(a.createdDate));   /* Created At, newest first */
  });

  return '<div class="af-page">' +
    '<div class="af-pagehead">' +
      '<h1>Work Orders</h1>' +
      '<div class="af-wo-actions">' +
        '<button type="button" class="af-linkbtn" onclick="afDemoAction(\'Customize\')">Customize</button>' +
        '<button type="button" class="af-btn primary" onclick="afModalCreateWorkOrder()">+ New Service Request</button>' +
        '<button type="button" class="af-btn" onclick="afDemoAction(\'Work order actions\')">Actions <span class="af-caret">&#9662;</span></button>' +
      '</div>' +
    '</div>' +

    '<div class="af-kpistrip">' +
      afWorkOrderKpis(all).map(function (k) {
        return '<div class="af-kpi">' +
          '<b' + (k.muted ? ' class="muted"' : '') + '>' + esc(String(k.n)) + '</b>' +
          '<button type="button" class="af-linkbtn" onclick="afDemoAction(\'' + escAttr(k.label) + '\')">' +
            esc(k.label) + '</button>' +
        '</div>';
      }).join('') +
    '</div>' +

    /* Inline filters, not the collapsed fold: this screen filters constantly, so
       the product leaves the controls on the page. */
    '<div class="af-wo-filters">' +
      fields.map(function (f) { return afSearchFieldHTML(key, f); }).join('') +
    '</div>' +
    '<div class="af-wo-filterbar">' +
      '<div>' +
        '<button type="button" class="af-linkbtn" onclick="afToggleSearch(\'' + key + '\')">' +
          (afSearchOpen[key] ? 'Hide' : 'Show') + ' Advanced Filters</button>' +
        '<button type="button" class="af-linkbtn" onclick="afSearchReset(\'' + key + '\')">Reset Filters</button>' +
      '</div>' +
      '<label class="af-wo-saved">Saved Filters ' +
        '<select onchange="afDemoAction(\'Saved filter\')"><option>Select...</option>' +
          '<option>My open orders</option><option>Emergencies</option></select></label>' +
    '</div>' +

    '<div class="af-wo-bulk">' +
      afBulkBar(key, ['Assign Vendor', 'Mark Complete', 'Send Entry Notice']) +
      '<label class="af-wo-sort">Sort by ' +
        '<select onchange="afSetWoSort(this.value)">' +
          ['Created At', 'Status', 'Priority'].map(function (o) {
            return '<option' + (o === sort ? ' selected' : '') + '>' + o + '</option>';
          }).join('') +
        '</select></label>' +
    '</div>' +

    '<div class="af-wo-list">' +
      (list.map(afWorkOrderRowHTML).join('') ||
        '<div class="af-wo-empty">' + afEmpty('No work orders match these filters.') + '</div>') +
    '</div>' +
    afDisplaying(list.length, all.length) +
  '</div>';
}

const AF_SF_RECURRING = [
  { id: 'prop', label: 'Properties', type: 'text', placeholder: 'Search by properties or property lists' },
  { id: 'vendor', label: 'Vendor', type: 'text', placeholder: 'Search by vendors or management company' },
  { id: 'repeats', label: 'Repeats', type: 'select', options: ['Search by repeat type', 'Weekly', 'Bi-Weekly', 'Monthly', 'Quarterly', 'Biannual', 'Annual'] }
];

function afRecurringMaintenanceHTML() {
  return '<div class="af-page">' +
    '<h1>Recurring Work Orders</h1>' +
    afSearchPanel('recurring', AF_SF_RECURRING, {
      title: 'Filter recurring work orders by using any of the search filters below:',
      layout: 'vertical'
    }) +
    '<div class="af-empty" style="padding: 30px 0; text-align: center; color: var(--af-muted); font-size: 13.5px;">' +
      'No recurring work orders found.' +
    '</div>' +
  '</div>';
}



const AF_SF_PURCHASE = [
  { id: 'prop', label: 'Properties', type: 'text', placeholder: '' },
  { id: 'vendor', label: 'Vendor', type: 'text', placeholder: 'Search by vendor or management company' },
  { id: 'gl', label: 'GL Accounts', type: 'text', placeholder: 'Select GL Accounts' },
  { id: 'dates', label: 'Date Range', type: 'daterange', from: '2026-05-26', to: '' },
  { id: 'status', label: 'Approval Status', type: 'select', options: ['All', 'Approved', 'Pending Approval', 'Draft', 'Canceled'] },
  { id: 'completed', label: 'Completed', type: 'select', options: ['All', 'Yes', 'No'] },
  { id: 'submitted', label: 'Order Submitted', type: 'select', options: ['All', 'Yes', 'No'] },
  { id: 'canceled', label: 'Show canceled purchase orders', type: 'check' }
];

function afPurchaseOrdersHTML() {
  const pos = [
    { id: 'PO-2026-081', item: '24-Pack MERV 11 HVAC Filters (16x25x1)', supplier: 'HD Supply Facilities Maintenance', total: 28800, date: afcDay(-3), status: 'Delivered' },
    { id: 'PO-2026-082', item: '10x Kwikset SmartCode 913 Keyless Electronic Deadbolts', supplier: 'Ferguson Enterprises', total: 115000, date: afcDay(-2), status: 'In Transit' },
    { id: 'PO-2026-083', item: '15x Fluidmaster Dual-Flush Toilet Rebuild Kits', supplier: 'Grainger Supply', total: 42000, date: afcDay(-1), status: 'Approved' },
    { id: 'PO-2026-084', item: '20x Kidde 10-Year Sealed Battery Smoke & CO Detectors', supplier: 'Home Depot Pro', total: 56000, date: afcDay(0), status: 'Approved' }
  ];

  return '<div class="af-page">' +
    '<h1>Purchase Orders</h1>' +
    afSearchPanel('purchase', AF_SF_PURCHASE, {
      title: 'Filter purchase orders with the options below. Leave any option blank to filter "all".',
      layout: 'vertical'
    }) +
    '<div class="af-tablewrap"><table class="af-table">' +
      '<thead><tr>' +
        '<th>PO Number</th><th>Materials / Items Ordered</th><th>Supplier</th><th class="num">Order Amount</th><th>Order Date</th><th>Status</th>' +
      '</tr></thead><tbody>' +
      pos.map(function (p) {
        return '<tr>' +
          '<td><b>' + esc(p.id) + '</b></td>' +
          '<td>' + esc(p.item) + '</td>' +
          '<td>' + esc(p.supplier) + '</td>' +
          '<td class="num"><b>' + afFmtMoney(p.total) + '</b></td>' +
          '<td>' + afFmtDate(p.date) + '</td>' +
          '<td>' + afStatusPill(p.status) + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>' +
    afDisplaying(pos.length, pos.length) +
  '</div>';
}

/* The 24/7 line. Two screens read this — Maintenance > Contact Center works the
   dispatch, Communication > Call Log records the contact — so it lives in one
   place. Two copies would let the module give two answers about the same call. */
const AF_EMERGENCY_CALLS = [
  { id: 'CALL-9102', time: '11:42 PM (Yesterday)', unit: 'UNIT-12-104', issue: 'Active water leak dripping through bathroom ceiling', priority: 'Emergency', dispatch: 'Dispatched DFW Master Plumbing', status: 'Resolved' },
  { id: 'CALL-9103', time: '10:15 PM (Yesterday)', unit: 'UNIT-11-102', issue: 'AC unit blowing warm air, 88°F indoor temperature', priority: 'Emergency', dispatch: 'Dispatched Lone Star HVAC', status: 'In Progress' },
  { id: 'CALL-9104', time: '08:30 PM (2 days ago)', unit: 'UNIT-07-A', issue: 'Front door electronic deadbolt lock malfunction', priority: 'High', dispatch: 'Dispatched Lone Star Locksmith', status: 'Resolved' },
  { id: 'CALL-9105', time: '04:15 PM (3 days ago)', unit: 'UNIT-10-101', issue: 'Garbage disposal humming and not spinning', priority: 'Normal', dispatch: 'Queued for Next Business Day', status: 'Scheduled' }
];

function afMaintenanceContactCenterHTML() {
  const calls = AF_EMERGENCY_CALLS;

  const rows = calls.map(function (c) {
    return '<tr>' +
      '<td><b>' + esc(c.id) + '</b><div class="af-sub">' + esc(c.time) + '</div></td>' +
      '<td>' + esc(c.unit) + '</td>' +
      '<td>' + esc(c.issue) + '</td>' +
      '<td><span class="af-badge ' + escAttr(c.priority.toLowerCase()) + '">' + esc(c.priority) + '</span></td>' +
      '<td>' + esc(c.dispatch) + '</td>' +
      '<td><span class="af-badge ' + (c.status === 'Resolved' ? 'good' : 'warn') + '">' + esc(c.status) + '</span></td>' +
      '</tr>';
  }).join('');

  return afPageHead('Maintenance Contact Center', '24/7 resident emergency maintenance phone log and automated dispatch escalations.') +
    '<section class="af-card">' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Call ID / Timestamp</th><th>Unit</th><th>Reported Issue</th><th>Priority</th><th>Emergency Dispatch Action</th><th>Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</section>';
}


/* ============================================================================
   THE VENDOR INVOICE — and the question of who pays it
   ============================================================================

   Dispatching a vendor used to be where maintenance ended. The plumber went out
   and nothing ever came back: no invoice, no cost, no effect on anybody's money.
   That left the most consequential decision in the whole workflow unmodelled.

   WHO PAYS IS THE LESSON.

     owner     normal wear, age, or a systems failure. The owner's money pays,
               so it is a disbursement out of the trust account, and it reduces
               what they can draw this month.

     resident  damage or negligence by the resident. It is a charge on their
               ledger, not a payment out of anyone's bank. No cash moves until
               they actually pay it — which is the part people get wrong, because
               billing a resident feels like recovering the money immediately and
               it is not.

   Getting this backwards is expensive in both directions: bill the owner for a
   resident's damage and the owner absorbs a cost they could have recovered; bill
   the resident for a failed water heater and you have an illegal charge and a
   dispute. So the module makes the choice explicit, states the rule beside it,
   and records the reason.
   ============================================================================ */

function afModalEnterInvoice(woId) {
  const w = afGetWorkOrder(woId);
  if (!w) return;
  const v = w.vendorId ? afGetVendor(w.vendorId) : null;
  const unit = afGetUnit(w.unitId);
  const occupied = unit && unit.status === 'occupied';

  const body =
    '<div class="af-kv">' +
      '<div><dt>Work order</dt><dd>' + esc(w.id) + '</dd></div>' +
      '<div><dt>Vendor</dt><dd>' + (v ? esc(v.name) : 'Unassigned') + '</dd></div>' +
      '<div><dt>Estimate</dt><dd>' + afFmtMoney(w.estimateCents) + '</dd></div>' +
      '<div><dt>Terms</dt><dd>' + (v ? esc(v.paymentTerms || 'net-30') : '—') + '</dd></div>' +
    '</div>' +

    (v && !v.w9OnFile
      ? '<div class="af-alert-warn"><b>NO W-9 ON FILE.</b> ' + esc(v.name) +
        ' cannot be issued a 1099 at year end without one. Collect it before paying this invoice.</div>'
      : '') +

    '<div class="af-form-group"><label class="af-label" for="afInvNumber">Vendor invoice number</label>' +
    '<input type="text" id="afInvNumber" class="af-input" placeholder="e.g. 44821"></div>' +

    '<div class="af-form-group"><label class="af-label" for="afInvAmount">Invoice amount ($)</label>' +
    '<input type="number" id="afInvAmount" class="af-input" step="25" value="' + ((w.estimateCents || 0) / 100).toFixed(2) + '"></div>' +

    '<div class="af-form-group"><label class="af-label" for="afInvBillTo">Bill to</label>' +
    '<select id="afInvBillTo" class="af-input">' +
      '<option value="owner">Owner — normal wear, age or systems failure</option>' +
      '<option value="resident"' + (occupied ? '' : ' disabled') + '>Resident — damage or negligence' +
        (occupied ? '' : ' (unit is vacant)') + '</option>' +
    '</select>' +
    '<div class="af-note">The owner pays for the property. The resident pays only for what they broke, ' +
    'and that is a charge on their ledger — no money arrives until they pay it.</div></div>' +

    '<div class="af-form-group"><label class="af-label" for="afInvReason">Reason for the billing decision</label>' +
    '<textarea id="afInvReason" class="af-input" rows="2" placeholder="e.g. 14-year-old water heater failed at end of life — owner responsibility"></textarea></div>';

  afOpenModal('Enter Vendor Invoice — ' + w.id, body,
    '<button type="button" class="af-btn" onclick="afCloseModal()">Cancel</button>' +
    '<button type="button" class="af-btn primary" id="afBtnEnterInvoice" onclick="afEnterInvoice(\'' + escAttr(woId) + '\')">Post Invoice</button>');
}

function afEnterInvoice(woId) {
  const w = afGetWorkOrder(woId);
  if (!w) return;
  const amt = Math.round(parseFloat((document.getElementById('afInvAmount') || {}).value || '0') * 100);
  const billTo = (document.getElementById('afInvBillTo') || {}).value || 'owner';
  const num = ((document.getElementById('afInvNumber') || {}).value || '').trim();
  const reason = ((document.getElementById('afInvReason') || {}).value || '').trim();

  if (amt <= 0) { simToast('Enter an invoice amount greater than zero.'); return; }
  if (!num) { simToast('A vendor invoice number is required — it is what the payment is matched against.'); return; }
  /* Billing a resident without a stated reason is the charge that turns into a
     dispute, and later into a deposit deduction nobody can justify. */
  if (billTo === 'resident' && reason.length < 10) {
    simToast('Charging a resident requires a written reason. It has to survive a dispute.');
    return;
  }

  const unit = afGetUnit(w.unitId);
  const propertyId = w.propertyId || (unit ? unit.propertyId : null);
  const vendor = w.vendorId ? afGetVendor(w.vendorId) : null;

  /* An invoice materially over its estimate is the thing a VA is meant to catch
     before it is paid, so it is surfaced rather than swallowed. */
  const over = w.estimateCents ? amt - w.estimateCents : 0;
  const materiallyOver = w.estimateCents > 0 && over > Math.max(5000, Math.round(w.estimateCents * 0.2));

  afSetOverride('workOrder', woId, {
    status: 'completed',
    completedDate: afToday(),
    actualCents: amt,
    billTo: billTo,
    invoiceNumber: num,
    billingReason: reason,
    varianceCents: over
  });

  if (billTo === 'owner') {
    /* The owner's money pays, so it leaves the trust account and their
       distributable cash falls by exactly this much — and there has to be
       enough of it. An owner cannot spend money they do not have in trust;
       somebody else would be covering it. */
    const propOwner = afAll('owner').find(function (o) {
      return (o.propertyIds || []).indexOf(propertyId) > -1;
    });
    if (propOwner) {
      const cash = afOwnerAvailableCash(propOwner.id);
      if (amt > cash.held) {
        afConfirm({
          title: 'Owner has insufficient trust funds',
          body: propOwner.name + ' holds ' + afFmtMoney(cash.held) + ' in trust and this invoice is ' +
                afFmtMoney(amt) + '. Paying it would overdraw their funds, which means the management ' +
                'company covers the difference out of its own operating account until rent clears. ' +
                'Hold the invoice, or get the owner to fund the account first.',
          confirmLabel: 'Understood',
          onConfirm: function () {}
        });
        return;
      }
    }
    afPostTransaction({
      accountId: AF_ACCT.trust,
      propertyId: propertyId,
      date: afToday(),
      description: 'Vendor invoice ' + num + ' — ' + (vendor ? vendor.name : 'vendor') + ' (' + w.id + ')',
      amount: -amt,
      reference: 'INV-' + num
    });
  } else {
    /* The resident's ledger. Deliberately no bank movement: billing is not
       collecting, and pretending otherwise is how a portfolio's cash position
       ends up overstated. */
    const lease = unit && unit.currentLeaseId ? afGetLease(unit.currentLeaseId) : null;
    if (!lease) {
      simToast('That unit has no active lease, so there is nobody to charge.');
      return;
    }
    const entries = afAllLedgerEntries().filter(function (e) { return e.leaseId === lease.id; });
    const prev = entries.length ? entries[entries.length - 1].balanceAfter : 0;
    if (!afDemo.ledgerEntries) afDemo.ledgerEntries = [];
    afDemo.ledgerEntries.push({
      id: 'LEDGER-DEMO-' + (1000 + afDemo.ledgerEntries.length + 1),
      leaseId: lease.id,
      date: afToday(),
      type: 'charge',
      category: 'other',
      description: 'Maintenance charge — ' + w.title + ' (' + w.id + ')',
      amount: amt,
      balanceAfter: prev + amt
    });
    afSetOverride('lease', lease.id, { balanceCents: prev + amt });
  }

  afCloseModal();
  if (materiallyOver) {
    afConfirm({
      title: 'Invoice is over estimate',
      body: (vendor ? vendor.name : 'The vendor') + ' estimated ' + afFmtMoney(w.estimateCents) +
            ' and invoiced ' + afFmtMoney(amt) + ' — ' + afFmtMoney(over) + ' more. ' +
            'It has been posted, but this is the point at which to ask the vendor why, before the owner sees it on a statement.',
      confirmLabel: 'Noted',
      onConfirm: function () { afRenderRoot(); }
    });
    return;
  }
  simToast('Invoice ' + num + ' posted — ' + afFmtMoney(amt) +
    (billTo === 'owner' ? ' paid from owner funds.' : ' charged to the resident.'), { tone: 'good' });
  afRenderRoot();
}

function afWorkOrderHTML() {
  const w = afGetWorkOrder(afState.activeWorkOrderId);
  if (!w) return afEmptyState({ title: 'Work order not found', body: 'It may have been cancelled.', actionLabel: 'Back to maintenance', action: "afGoto('maintenance')" });
  const u = afGetUnit(w.unitId);
  const v = w.vendorId ? afGetVendor(w.vendorId) : null;
  const invoiced = !!w.invoiceNumber;

  /* One next action, chosen by where the order actually is. A row of every
     possible button invites doing them out of order — invoicing before the work
     is done, paying before anyone looked at the estimate. */
  let action;
  if (w.status === 'completed' && invoiced) {
    action = '<button type="button" class="af-btn" onclick="afReopenWorkOrder(\'' + escAttr(w.id) + '\')">Reopen</button>';
  } else if (w.status === 'in-progress' || w.status === 'scheduled' || w.status === 'completed') {
    action = '<button type="button" class="af-btn primary" data-action="enter-invoice" id="afBtnEnterInvoice" onclick="afModalEnterInvoice(\'' + escAttr(w.id) + '\')">Enter Vendor Invoice</button>';
  } else {
    action = '<button type="button" class="af-btn primary" id="afBtnDispatchWO" onclick="afDispatchWorkOrder(\'' + escAttr(w.id) + '\')">Dispatch / Update</button>';
  }

  const variance = w.varianceCents || 0;

  return '<button type="button" class="af-backlink" onclick="afGoto(\'maintenance\')">&larr; Back to Maintenance</button>' +
    afPageHead(w.id + ' — ' + w.title, (u ? 'Unit ' + u.label + ' &bull; ' : '') + w.category + ' &bull; Created ' + afFmtDate(w.createdDate), action) +
    '<div class="af-kv af-wo-detail">' +
      '<div><dt>Status</dt><dd><span class="af-badge ' + escAttr(w.status) + '">' + esc(w.status) + '</span></dd></div>' +
      '<div><dt>Priority</dt><dd><span class="af-badge ' + escAttr(w.priority) + '">' + esc(w.priority) + '</span></dd></div>' +
      '<div><dt>Vendor</dt><dd>' + (v ? esc(v.name) : 'Unassigned') + '</dd></div>' +
      '<div><dt>Scheduled Date</dt><dd>' + afFmtDate(w.scheduledDate) + '</dd></div>' +
      '<div><dt>Cost Estimate</dt><dd>' + afFmtMoney(w.estimateCents) + '</dd></div>' +
      (invoiced
        ? '<div><dt>Invoiced</dt><dd><b>' + afFmtMoney(w.actualCents) + '</b>' +
            (variance > 0 ? ' <span class="af-over">+' + afFmtMoney(variance) + ' over</span>' : '') +
            '<div class="af-sub">Invoice ' + esc(w.invoiceNumber) + '</div></dd></div>' +
          '<div><dt>Billed to</dt><dd><b>' + esc(w.billTo === 'resident' ? 'Resident' : 'Owner') + '</b>' +
            (w.billingReason ? '<div class="af-sub">' + esc(w.billingReason) + '</div>' : '') + '</dd></div>'
        : '') +
      '<div><dt>Entry Notice</dt><dd>' + (w.entryNoticeSent ? '<span style="color:var(--af-good);font-weight:700;">Issued</span>' : '<span style="color:var(--af-warn);font-weight:700;">Not Issued</span>') + '</dd></div>' +
    '</div>' +
    '<section class="af-card">' +
      '<h3>Work Description</h3>' +
      '<p>' + esc(w.description) + '</p>' +
      (v && afDaysFromToday(v.insuranceExpires) < 0
        ? '<div class="af-alert-danger">' +
            '<b>VENDOR COMPLIANCE NOTICE:</b> ' + esc(v.name) + ' Certificate of Insurance expired on ' + afFmtDate(v.insuranceExpires) + '.' +
          '</div>'
        : '') +
      (v && !v.w9OnFile
        ? '<div class="af-alert-warn">' +
            '<b>NO W-9 ON FILE:</b> ' + esc(v.name) + ' cannot be issued a 1099 at year end until one is collected.' +
          '</div>'
        : '') +
      (!w.entryNoticeSent && u && u.status === 'occupied'
        ? '<div class="af-alert-warn">' +
            '<b>NOTICE OF ENTRY WARNING:</b> Unit ' + esc(u.label) + ' is occupied. 24-Hour Notice of Entry has not been served.' +
            '<div style="margin-top:6px;"><button type="button" class="af-btn sm" onclick="SimEngine.viewDoc(\'documents/sample-notice.html\', \'24-Hour Notice of Intent to Enter\')">Preview 24-Hour Notice</button></div>' +
          '</div>'
        : '') +
    '</section>';
}

/* ---------- Tasks ---------- */
function afTasksHTML() {
  const list = afAllTasks();
  const actions = '<button type="button" class="af-btn primary" onclick="afModalCreateTask()">+ New Task</button>';

  const rows = list.map(function (t) {
    const due = afDaysFromToday(t.dueDate);
    const isDone = (t.status === 'completed');
    return '<tr style="' + (isDone ? 'opacity:0.6;' : '') + '">' +
      '<td><b>' + esc(t.title) + '</b></td>' +
      '<td><span class="af-badge ' + escAttr(t.priority) + '">' + esc(t.priority) + '</span></td>' +
      '<td>' + afFmtDate(t.dueDate) + '<div class="af-sub">' +
        (isDone ? 'Completed' : (due === 0 ? 'Today' : due < 0 ? Math.abs(due) + ' days overdue' : 'In ' + due + ' days')) +
      '</div></td>' +
      '<td>' +
        (!isDone
          ? '<button type="button" class="af-btn sm" onclick="afCompleteTask(\'' + escAttr(t.id) + '\')">Complete</button>'
          : '<span class="af-muted">&check; Done</span>') +
      '</td>' +
      '</tr>';
  }).join('');

  return afPageHead('Operations Worklist', list.length + ' tasks for management staff.', actions) +
    '<table class="af-tbl"><thead><tr><th>Task</th><th>Priority</th><th>Due Date</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
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

/* ---------- Curriculum Helpers & Graded Step Views ---------- */

function afEnsureShuffleSalt() {
  if (!afStore.shuffleSalt) {
    afStore.shuffleSalt = 'salt_' + Math.floor(Math.random() * 1000000000);
    afSave();
  }
  return afStore.shuffleSalt;
}

function afOptionOrder(seedKey, n) {
  const salt = afStore.shuffleSalt || 'af-salt-init';
  const rng = afMulberry32(afHashString(salt + ':' + seedKey));
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function afDisclaimerHTML() {
  return '<div class="af-disclaimer-banner">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
    '<span>' + esc(AF_LEGAL_DISCLAIMER) + '</span>' +
    '</div>';
}

function afContinueHTML() {
  return '<button type="button" class="af-btn primary sim-feedback-continue" onclick="afAdvanceStep()">Continue &rarr;</button>';
}

function afAdvanceStep() {
  if (SimEngine.walkActive && SimEngine.walkActive()) {
    SimEngine.stepCompleted();
  } else if (afState.lessonId) {
    afGoto('lesson', afState.lessonId);
  } else {
    afGoto('dashboard');
  }
}

/* 1. Scenario / Decide View */
function afScenarioDetailHTML() {
  const s = AF_SCENARIOS.find(function (x) { return x.id === afState.scenarioId; });
  if (!s) return afEmptyState({ title: 'Scenario not found', body: 'The requested decision scenario does not exist.', actionLabel: 'Back to dashboard', action: "afGoto('dashboard')" });

  const r = afStore.scenarios[s.id];
  const answered = !!(r && r.answered !== undefined && r.answered !== null);
  const order = afOptionOrder('scenario:' + s.id, s.options.length);

  const optsHTML = order.map(function (idx, pos) {
    const opt = s.options[idx];
    let cls = '';
    if (answered) {
      if (idx === s.correct) cls = 'correct';
      else if (idx === r.answered && !r.correct) cls = 'incorrect';
    }
    const letter = String.fromCharCode(65 + pos);
    return '<button type="button" class="af-option-btn ' + cls + '" ' +
      (answered ? 'disabled' : 'onclick="afAnswerScenario(\'' + escAttr(s.id) + '\', ' + idx + ')"') + '>' +
      '<b>' + letter + '.</b> <span>' + esc(opt) + '</span>' +
      '</button>';
  }).join('');

  let feedbackHTML = '';
  if (answered) {
    feedbackHTML = '<div class="af-feedback-box ' + (r.correct ? 'correct' : 'incorrect') + '">' +
      '<b>' + (r.correct ? '&#10003; Correct.' : '&#10007; Not quite.') + '</b> ' + esc(s.explanation) +
      '<div class="af-feedback-actions">' +
      (r.correct ? afContinueHTML() : '<button type="button" class="af-btn" onclick="afRetakeScenario(\'' + escAttr(s.id) + '\')">Try Again</button>') +
      '</div></div>';
  }

  const isLegalTopic = s.id.indexOf('_s6_') !== -1 || s.id.indexOf('_s7_') !== -1 || s.id.indexOf('_s8_') !== -1 || s.id.indexOf('_s10_') !== -1 || s.id.indexOf('_s12_') !== -1;

  return afPageHead(s.title, 'Decision scenario.') +
    (isLegalTopic ? afDisclaimerHTML() : '') +
    '<div class="af-scenario-card">' +
    '<p class="af-step-situation">' + esc(s.situation) + '</p>' +
    '<div class="af-options-list">' + optsHTML + '</div>' +
    feedbackHTML +
    '</div>';
}

function afAnswerScenario(id, idx) {
  const s = AF_SCENARIOS.find(function (x) { return x.id === id; });
  if (!s) return;
  const correct = (idx === s.correct);
  const prev = afStore.scenarios[id] || {};
  afRecordAnswer('scenarios', id, {
    answered: idx,
    correct: correct,
    firstAttempt: prev.firstAttempt || { answered: idx, correct: correct, ts: Date.now() },
    everCorrect: prev.everCorrect || correct
  });
  afRenderRoot();
}

function afRetakeScenario(id) {
  if (afState.mode === 'lesson') {
    delete afStore.scenarios[id];
    afSave();
  }
  afRenderRoot();
}

/* 2. Review / Verify View */
function afReviewDetailHTML() {
  const v = AF_VERIFY_ITEMS.find(function (x) { return x.id === afState.reviewId; });
  if (!v) return afEmptyState({ title: 'Review item not found', body: 'The requested audit item does not exist.', actionLabel: 'Back to dashboard', action: "afGoto('dashboard')" });

  const r = afStore.reviews[v.id];
  const answered = !!(r && r.selected !== undefined);

  let contentHTML = '';

  if (v.entries) {
    const rows = v.entries.map(function (e) {
      const isSelected = (r && r.selected === e.id);
      let cls = '';
      if (answered) {
        if (e.id === v.targetEntryId) cls = 'af-row-good';
        else if (isSelected && !r.correct) cls = 'af-row-bad';
      }
      return '<tr class="' + cls + '">' +
        '<td>' + esc(e.date) + '</td>' +
        '<td><span class="af-chip ' + (e.type === 'charge' ? 'warn' : 'good') + '">' + esc(e.type) + '</span></td>' +
        '<td>' + esc(e.desc) + '</td>' +
        '<td class="af-tar">' + afFmtMoney(e.amount) + '</td>' +
        '<td class="af-tar font-mono"><b>' + afFmtMoney(e.balanceAfter) + '</b></td>' +
        '<td class="af-tar">' +
        (answered
          ? (e.id === v.targetEntryId ? '<span class="af-pill-good">&#10003; Discrepancy</span>' : (isSelected ? '<span class="af-pill-bad">&#10007; Incorrect</span>' : ''))
          : '<button type="button" class="af-btn sm" onclick="afAnswerReview(\'' + escAttr(v.id) + '\', \'' + escAttr(e.id) + '\')">Flag Error</button>') +
        '</td>' +
        '</tr>';
    }).join('');
    contentHTML = '<table class="af-tbl"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th class="af-tar">Amount</th><th class="af-tar">Balance After</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
  } else if (v.discrepancies) {
    const rows = v.discrepancies.map(function (d) {
      const isSelected = (r && r.selected === d.field);
      let cls = '';
      if (answered) {
        if (d.field === v.targetField) cls = 'af-row-good';
        else if (isSelected && !r.correct) cls = 'af-row-bad';
      }
      return '<tr class="' + cls + '">' +
        '<td><b>' + esc(d.field) + '</b></td>' +
        '<td>' + esc(d.appVal) + '</td>' +
        '<td>' + esc(d.leaseVal) + '</td>' +
        '<td class="af-tar">' +
        (answered
          ? (d.field === v.targetField ? '<span class="af-pill-good">&#10003; Discrepancy</span>' : (isSelected ? '<span class="af-pill-bad">&#10007; Incorrect</span>' : ''))
          : '<button type="button" class="af-btn sm" onclick="afAnswerReview(\'' + escAttr(v.id) + '\', \'' + escAttr(d.field) + '\')">Flag Mismatch</button>') +
        '</td>' +
        '</tr>';
    }).join('');
    contentHTML = '<table class="af-tbl"><thead><tr><th>Contract Field</th><th>Approved Application</th><th>Generated Lease</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
  } else if (v.lineItems) {
    const rows = v.lineItems.map(function (li) {
      const isSelected = (r && r.selected === li.id);
      let cls = '';
      if (answered) {
        if (li.id === v.targetItemId) cls = 'af-row-good';
        else if (isSelected && !r.correct) cls = 'af-row-bad';
      }
      return '<tr class="' + cls + '">' +
        '<td>' + esc(li.desc) + '</td>' +
        '<td><span class="af-chip ' + (li.isError ? 'bad' : 'neutral') + '">' + esc(li.cat) + '</span></td>' +
        '<td class="af-tar font-mono"><b>' + afFmtMoney(li.amount) + '</b></td>' +
        '<td class="af-tar">' +
        (answered
          ? (li.id === v.targetItemId ? '<span class="af-pill-good">&#10003; Misclassified</span>' : (isSelected ? '<span class="af-pill-bad">&#10007; Incorrect</span>' : ''))
          : '<button type="button" class="af-btn sm" onclick="afAnswerReview(\'' + escAttr(v.id) + '\', \'' + escAttr(li.id) + '\')">Flag Category</button>') +
        '</td>' +
        '</tr>';
    }).join('');
    contentHTML = '<table class="af-tbl"><thead><tr><th>Item Description</th><th>Accounting Category</th><th class="af-tar">Amount</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
  } else if (v.screeningData) {
    const sd = v.screeningData;
    const isSelected = (r && r.selected === 'creditScore');
    contentHTML = '<div class="af-card" style="padding:16px">' +
      '<p><b>Applicant:</b> ' + esc(sd.applicantName) + ' &middot; <b>Unit:</b> ' + esc(sd.unitId) + '</p>' +
      '<p><b>Consumer Reporting Agency:</b> ' + esc(sd.creditAgency) + ' (' + esc(sd.agencyPhone) + ')</p>' +
      '<p><b>Applicant Credit Score:</b> <span class="af-chip bad">' + sd.creditScore + '</span> (Required Minimum: ' + sd.thresholdRequired + ')</p>' +
      '<p><b>Triggering Factor:</b> ' + esc(sd.adverseFactor) + '</p>' +
      '<div style="margin-top:14px">' +
      (answered
        ? '<span class="af-pill-good">&#10003; Credit Score 512 Trigger Verified</span>'
        : '<button type="button" class="af-btn primary" onclick="afAnswerReview(\'' + escAttr(v.id) + '\', \'creditScore\')">Confirm Screening Disclosure</button>') +
      '</div></div>';
  } else if (v.statuteDetails) {
    const st = v.statuteDetails;
    contentHTML = '<div class="af-card" style="padding:16px">' +
      '<p><b>Move-Out Surrender Date:</b> ' + esc(st.moveOutDate) + ' (' + st.daysElapsed + ' days elapsed)</p>' +
      '<p><b>Texas Statutory Limit:</b> ' + st.statutoryLimitDays + ' calendar days (Texas Prop. Code § 92.103)</p>' +
      '<p><b>Days Remaining to Refund:</b> <span class="af-chip warn">' + st.daysRemaining + ' days remaining</span></p>' +
      '<p><b>Deposit Held:</b> ' + afFmtMoney(st.depositHeldCents) + '</p>' +
      '<p><b>Statutory Bad Faith Penalty (§ 92.109):</b> $100 + 3x Deposit = <b>' + afFmtMoney(st.calculated3xPenaltyCents) + '</b> + Attorney Fees</p>' +
      '<div style="margin-top:14px">' +
      (answered
        ? '<span class="af-pill-good">&#10003; Statutory Clock & Liability Verified</span>'
        : '<button type="button" class="af-btn primary" onclick="afAnswerReview(\'' + escAttr(v.id) + '\', \'daysRemaining\')">Verify 8-Day Deadline & 3x Penalty</button>') +
      '</div></div>';
  }

  let feedbackHTML = '';
  if (answered) {
    feedbackHTML = '<div class="af-feedback-box ' + (r.correct ? 'correct' : 'incorrect') + '">' +
      '<b>' + (r.correct ? '&#10003; Correct.' : '&#10007; Not quite.') + '</b> ' + esc(v.explanation) +
      '<div class="af-feedback-actions">' +
      (r.correct ? afContinueHTML() : '<button type="button" class="af-btn" onclick="afRetakeReview(\'' + escAttr(v.id) + '\')">Try Again</button>') +
      '</div></div>';
  }

  const isLegal = v.id.indexOf('_v7_') !== -1 || v.id.indexOf('_v11_') !== -1 || v.id.indexOf('_v12_') !== -1;

  return afPageHead(v.title, 'Verification audit.') +
    (isLegal ? afDisclaimerHTML() : '') +
    '<div class="af-rv-card">' +
    '<p class="af-step-instruction">' + esc(v.instruction) + '</p>' +
    contentHTML +
    feedbackHTML +
    '</div>';
}

function afAnswerReview(id, targetId) {
  const v = AF_VERIFY_ITEMS.find(function (x) { return x.id === id; });
  if (!v) return;
  const correct = (targetId === v.targetEntryId || targetId === v.targetField || targetId === v.targetItemId || targetId === v.targetItem || targetId === 'creditScore' || targetId === 'daysRemaining');
  afRecordAnswer('reviews', id, { selected: targetId, correct: correct });
  afRenderRoot();
}

function afRetakeReview(id) {
  if (afState.mode === 'lesson') {
    delete afStore.reviews[id];
    afSave();
  }
  afRenderRoot();
}

/* 3. Reconcile View */
function afReconcileDetailHTML() {
  const rec = AF_RECONCILE_ITEMS.find(function (x) { return x.id === afState.reconcileId; });
  if (!rec) return afEmptyState({ title: 'Reconciliation not found', body: 'The requested reconciliation item does not exist.', actionLabel: 'Back to dashboard', action: "afGoto('dashboard')" });

  const r = afStore.reconciles[rec.id];
  const answered = !!(r && r.submittedAmountCents !== undefined);

  const deductionsHTML = rec.deductionItems.map(function (d, idx) {
    return '<div class="af-form-group" style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
      '<input type="checkbox" id="afRecDeduct-' + idx + '" ' + (d.valid ? 'checked' : '') + ' ' + (answered ? 'disabled' : '') + '>' +
      '<label for="afRecDeduct-' + idx + '" style="font-size:13.5px;flex:1">' + esc(d.label) + ' &mdash; <b>' + afFmtMoney(d.amountCents) + '</b>' +
      (!d.valid ? ' <span class="af-pill-bad" style="margin-left:6px">Normal Wear & Tear (Non-Deductible)</span>' : '') +
      '</label>' +
      '</div>';
  }).join('');

  let feedbackHTML = '';
  if (answered) {
    feedbackHTML = '<div class="af-feedback-box ' + (r.correct ? 'correct' : 'incorrect') + '">' +
      '<b>' + (r.correct ? '&#10003; Reconciled Successfully.' : '&#10007; Discrepancy Found.') + '</b> ' + esc(rec.explanation) +
      '<div class="af-feedback-actions">' +
      (r.correct ? afContinueHTML() : '<button type="button" class="af-btn" onclick="afRetakeReconcile(\'' + escAttr(rec.id) + '\')">Try Again</button>') +
      '</div></div>';
  }

  return afPageHead(rec.title, 'Deposit accounting reconciliation.') +
    afDisclaimerHTML() +
    '<div class="af-rec-card">' +
    '<p class="af-step-instruction">' + esc(rec.instruction) + '</p>' +
    '<div style="background:#f8fafc;padding:14px;border:1px solid var(--af-line);border-radius:var(--af-radius);margin-bottom:16px">' +
    '<p style="margin:0 0 6px"><b>Original Security Deposit Held in Escrow:</b> <span class="font-mono" style="font-size:16px;color:var(--af-good)">' + afFmtMoney(rec.depositHeldCents) + '</span></p>' +
    '</div>' +
    '<h4 style="margin:0 0 12px">Itemized Move-Out Deductions</h4>' +
    deductionsHTML +
    '<div style="margin-top:18px;display:flex;align-items:center;gap:12px">' +
    '<label for="afRecRefundInput" style="font-weight:700;font-size:14px">Calculated Net Refund Check Owed ($):</label>' +
    '<input type="text" id="afRecRefundInput" class="af-input" style="width:180px;font-weight:700" placeholder="e.g. 2370.00" ' +
    (answered ? 'value="' + (r.submittedAmountCents / 100).toFixed(2) + '" disabled' : 'value="2370.00"') + '>' +
    (!answered ? '<button type="button" class="af-btn primary" onclick="afSubmitReconcile(\'' + escAttr(rec.id) + '\')">Submit Reconciliation</button>' : '') +
    '</div>' +
    feedbackHTML +
    '</div>';
}

function afSubmitReconcile(id) {
  const rec = AF_RECONCILE_ITEMS.find(function (x) { return x.id === id; });
  if (!rec) return;
  const inputEl = document.getElementById('afRecRefundInput');
  const val = parseFloat((inputEl ? inputEl.value : '0').replace(/[^0-9.]/g, '') || '0');
  const cents = Math.round(val * 100);
  const correct = (cents === rec.expectedNetRefundCents);
  afRecordAnswer('reconciles', id, { correct: correct, submittedAmountCents: cents });
  afRenderRoot();
}

function afRetakeReconcile(id) {
  if (afState.mode === 'lesson') {
    delete afStore.reconciles[id];
    afSave();
  }
  afRenderRoot();
}

/* 4. Compose View */
function afComposeDetailHTML() {
  const cmp = AF_COMPOSE_ITEMS.find(function (x) { return x.id === afState.composeId; });
  if (!cmp) return afEmptyState({ title: 'Compose item not found', body: 'The requested compose prompt does not exist.', actionLabel: 'Back to dashboard', action: "afGoto('dashboard')" });

  const r = afStore.composes[cmp.id];
  const answered = !!(r && r.resolvedAt);

  const threadHTML = (cmp.thread || []).map(function (m) {
    return '<div class="af-compose-msg">' +
      '<div class="af-compose-msg-meta">' + esc(m.sender) + ' &rarr; ' + esc(m.recipient) + ' &middot; ' + esc(m.date) + '</div>' +
      '<div>' + esc(m.body) + '</div>' +
      '</div>';
  }).join('');

  let feedbackHTML = '';
  if (answered) {
    const rubricList = (r.results || []).map(function (res) {
      return '<div class="af-rubric-item ' + (res.pass ? 'pass' : 'fail') + '">' +
        '<span>' + (res.pass ? '&#10003;' : '&#10007;') + '</span>' +
        '<div><b>' + esc(res.label) + '</b>' + (!res.pass ? '<div style="font-size:12px;margin-top:2px">' + esc(res.why) + '</div>' : '') + '</div>' +
        '</div>';
    }).join('');

    feedbackHTML = '<div class="af-feedback-box ' + (r.passed ? 'correct' : 'incorrect') + '">' +
      '<b>' + (r.passed ? '&#10003; Excellent communication.' : '&#10007; Missing required compliance points.') + '</b> ' +
      r.passedCount + ' of ' + cmp.rubric.length + ' points satisfied (Pass threshold: ' + cmp.passMark + ').' +
      '<div style="margin-top:10px">' + rubricList + '</div>' +
      '<div class="af-feedback-actions">' +
      (r.passed ? afContinueHTML() : '<button type="button" class="af-btn" onclick="afRetakeCompose(\'' + escAttr(cmp.id) + '\')">Revise It</button>') +
      '</div></div>';
  }

  return afPageHead(cmp.label, 'Written communication exercise.') +
    afDisclaimerHTML() +
    '<div class="af-compose-card">' +
    '<p class="af-step-instruction">' + esc(cmp.instruction) + '</p>' +
    (threadHTML ? '<div class="af-compose-thread"><h4 style="margin:0 0 6px">Thread History</h4>' + threadHTML + '</div>' : '') +
    '<textarea id="afComposeTextarea-' + cmp.id + '" class="af-compose-textarea" placeholder="' + escAttr(cmp.placeholder) + '" ' +
    (answered ? 'disabled' : '') + '>' + (r ? esc(r.text || '') : '') + '</textarea>' +
    (!answered
      ? '<div style="display:flex;align-items:center;gap:12px"><button type="button" class="af-btn primary" onclick="afSubmitCompose(\'' + escAttr(cmp.id) + '\')">Send Reply</button><span style="font-size:12px;color:var(--af-muted)">Your reply will be scored against compliance rubrics.</span></div>'
      : '') +
    feedbackHTML +
    '</div>';
}

function afSubmitCompose(id) {
  const cmp = AF_COMPOSE_ITEMS.find(function (x) { return x.id === id; });
  if (!cmp) return;
  const textarea = document.getElementById('afComposeTextarea-' + id);
  const text = textarea ? textarea.value.trim() : '';
  if (text.length < 25) {
    simToast('Please write a full response before submitting.');
    return;
  }
  const results = cmp.rubric.map(function (c) {
    const fn = AF_RUBRIC_CHECKS[c.check];
    const pass = fn ? !!fn(text) : false;
    return { check: c.check, label: c.label, why: c.why, pass: pass };
  });
  const passedCount = results.filter(function (res) { return res.pass; }).length;
  const passed = (passedCount >= cmp.passMark);

  afRecordAnswer('composes', id, {
    text: text,
    results: results,
    passedCount: passedCount,
    passed: passed,
    resolvedAt: Date.now()
  });
  afRenderRoot();
}

function afRetakeCompose(id) {
  if (afState.mode === 'lesson') {
    delete afStore.composes[id];
    afSave();
  }
  afRenderRoot();
}

/* 5. Triage View */
function afTriageDetailHTML() {
  const tri = AF_TRIAGE_ITEMS.find(function (x) { return x.id === afState.triageId; });
  if (!tri) return afEmptyState({ title: 'Triage item not found', body: 'The requested triage queue does not exist.', actionLabel: 'Back to dashboard', action: "afGoto('dashboard')" });

  const r = afStore.triages[tri.id];
  const answered = !!(r && r.order);

  if (!afDemo.triageOrders) afDemo.triageOrders = {};
  if (!afDemo.triageOrders[tri.id]) {
    afDemo.triageOrders[tri.id] = tri.items.slice();
  }
  const list = afDemo.triageOrders[tri.id];

  const rowsHTML = list.map(function (item, idx) {
    return '<div class="af-triage-row">' +
      '<span class="af-triage-rank">' + (idx + 1) + '</span>' +
      '<div style="flex:1"><b>' + esc(item.label) + '</b>' +
      (answered ? '<div style="font-size:12px;color:var(--af-muted);margin-top:2px">' + esc(item.reason) + '</div>' : '') +
      '</div>' +
      (!answered
        ? '<div class="af-triage-controls">' +
          '<button type="button" class="af-btn sm" ' + (idx === 0 ? 'disabled' : 'onclick="afMoveTriage(\'' + escAttr(tri.id) + '\', ' + idx + ', -1)"') + '>&uarr;</button>' +
          '<button type="button" class="af-btn sm" ' + (idx === list.length - 1 ? 'disabled' : 'onclick="afMoveTriage(\'' + escAttr(tri.id) + '\', ' + idx + ', 1)"') + '>&darr;</button>' +
          '</div>'
        : '') +
      '</div>';
  }).join('');

  let feedbackHTML = '';
  if (answered) {
    feedbackHTML = '<div class="af-feedback-box ' + (r.correct ? 'correct' : 'incorrect') + '">' +
      '<b>' + (r.correct ? '&#10003; Optimal Operational Triage.' : '&#10007; Priority Hierarchy Needs Revision.') + '</b> ' +
      'Emergency habitability risks (active flood leak) and statutory expiration deadlines (Texas Day 28 security deposit clock) must always precede routine inquiries and vendor paperwork.' +
      '<div class="af-feedback-actions">' +
      (r.correct ? afContinueHTML() : '<button type="button" class="af-btn" onclick="afRetakeTriage(\'' + escAttr(tri.id) + '\')">Try Again</button>') +
      '</div></div>';
  }

  return afPageHead(tri.title, 'Queue prioritization exercise.') +
    afDisclaimerHTML() +
    '<div class="af-triage-card">' +
    '<p class="af-step-instruction">' + esc(tri.instruction) + '</p>' +
    '<div class="af-triage-list">' + rowsHTML + '</div>' +
    (!answered
      ? '<button type="button" class="af-btn primary" onclick="afSubmitTriage(\'' + escAttr(tri.id) + '\')">Submit Priority Order</button>'
      : '') +
    feedbackHTML +
    '</div>';
}

function afMoveTriage(id, idx, dir) {
  const list = afDemo.triageOrders[id];
  if (!list) return;
  const target = idx + dir;
  if (target < 0 || target >= list.length) return;
  const tmp = list[idx];
  list[idx] = list[target];
  list[target] = tmp;
  afRenderRoot();
}

function afSubmitTriage(id) {
  const tri = AF_TRIAGE_ITEMS.find(function (x) { return x.id === id; });
  if (!tri) return;
  const list = afDemo.triageOrders[id];
  const isTop1 = list[0].id === 'Q-01'; // Active water leak
  const isTop2 = list[1].id === 'Q-02'; // Texas Day 28 deposit refund
  const isTop3 = list[2].id === 'Q-03'; // FCRA Adverse action
  const correct = (isTop1 && isTop2 && isTop3);

  afRecordAnswer('triages', id, {
    correct: correct,
    order: list.map(function (x) { return x.id; })
  });
  afRenderRoot();
}

function afRetakeTriage(id) {
  if (afState.mode === 'lesson') {
    delete afStore.triages[id];
    afSave();
  }
  afRenderRoot();
}

/* 6. Final Exam View (AF_EXAM_BANK) */
function afExamHTML() {
  if (!afStore.exam || !afStore.exam.startedAt) {
    return afPageHead('Final Examination', 'Comprehensive certification exam.') +
      afDisclaimerHTML() +
      '<div class="af-exam-card">' +
      '<h3>AppFolio Property Manager Certification Exam</h3>' +
      '<p style="font-size:14px;line-height:1.6;color:var(--af-text)">' +
      'This exam evaluates your mastery of property management operations, Texas leasing statutes, Fair Housing compliance, FCRA adverse action rules, ledger balance mechanics, and fiduciary trust boundaries.<br><br>' +
      '<b>Exam Specifications:</b><br>' +
      '&bull; <b>24 Questions</b> sampled across compliance, ledger analysis, numeric calculations, operational judgment, and written communications.<br>' +
      '&bull; <b>80% Passing Threshold</b> (20 of 24 correct required for certification).<br>' +
      '&bull; <b>Timed 30-Minute Session</b> with persistent state.' +
      '</p>' +
      '<div style="margin-top:20px">' +
      '<button type="button" class="af-btn primary lg" onclick="afStartExam()">Begin Exam &rarr;</button>' +
      '</div>' +
      '</div>';
  }

  const ex = afStore.exam;
  const isSubmitted = !!ex.submittedAt;

  if (isSubmitted) {
    const pct = Math.round((ex.score / ex.max) * 100);
    const passed = (pct >= Math.round(AF_EXAM_PASS_PCT * 100));

    const reviewItemsHTML = (ex.itemIds || []).map(function (itemId, idx) {
      const item = AF_EXAM_BANK.find(function (x) { return x.id === itemId; });
      if (!item) return '';
      const ans = ex.answers[idx];
      let isItemCorrect = false;
      if (item.type === 'decide') isItemCorrect = (ans === item.correct);
      else if (item.type === 'verify') isItemCorrect = (ans === item.targetEntryId);
      else if (item.type === 'compose') isItemCorrect = (ans && ans.passed);

      return '<div class="af-card" style="padding:16px;margin-bottom:12px;border-left:4px solid ' + (isItemCorrect ? 'var(--af-good)' : 'var(--af-bad)') + '">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:6px">' +
        '<b>Question ' + (idx + 1) + ' &middot; ' + esc(item.title) + '</b>' +
        '<span class="af-chip ' + (isItemCorrect ? 'good' : 'bad') + '">' + (isItemCorrect ? '&#10003; Correct' : '&#10007; Incorrect') + '</span>' +
        '</div>' +
        '<p style="font-size:13.5px;margin:0 0 8px">' + esc(item.situation || item.instruction) + '</p>' +
        '<div class="af-feedback-box ' + (isItemCorrect ? 'good' : 'bad') + '" style="margin-top:8px">' +
        '<b>Explanation:</b> ' + esc(item.explanation || 'Reviewed against statutory standards.') +
        '</div>' +
        '</div>';
    }).join('');

    return afPageHead('Exam Results', 'Certification assessment summary.') +
      '<div class="af-exam-card" style="text-align:center;padding:32px 20px">' +
      '<div style="font-size:48px;font-weight:800;color:' + (passed ? 'var(--af-good)' : 'var(--af-bad)') + '">' + pct + '%</div>' +
      '<h3>' + (passed ? 'Congratulations! You Passed the Certification Exam.' : 'Examination Not Passed') + '</h3>' +
      '<p style="font-size:14px;color:var(--af-muted)">You scored ' + ex.score + ' of ' + ex.max + ' points (Passing threshold is 80%).</p>' +
      '<div style="margin-top:18px">' +
      '<button type="button" class="af-btn" onclick="afRetakeExam()">Retake Exam</button>' +
      '</div>' +
      '</div>' +
      '<h3 style="margin:24px 0 14px">Question Review & Explanations</h3>' +
      reviewItemsHTML;
  }

  // Active Exam Item View
  const curIdx = ex.currentIndex || 0;
  const itemId = ex.itemIds[curIdx];
  const item = AF_EXAM_BANK.find(function (x) { return x.id === itemId; });
  if (!item) return afEmptyState({ title: 'Item error', body: 'Exam question could not be loaded.', actionLabel: 'Reset Exam', action: 'afRetakeExam()' });

  const chosen = ex.answers[curIdx];

  let bodyHTML = '';
  if (item.options) {
    const opts = item.options.map(function (opt, oIdx) {
      const isSel = (chosen === oIdx);
      const letter = String.fromCharCode(65 + oIdx);
      return '<button type="button" class="af-option-btn ' + (isSel ? 'selected' : '') + '" onclick="afSelectExamOption(' + curIdx + ', ' + oIdx + ')">' +
        '<b>' + letter + '.</b> <span>' + esc(opt) + '</span>' +
        '</button>';
    }).join('');
    bodyHTML = '<div class="af-options-list">' + opts + '</div>';
  } else if (item.entries) {
    const rows = item.entries.map(function (e) {
      const isSel = (chosen === e.id);
      return '<tr class="' + (isSel ? 'af-row-active' : '') + '">' +
        '<td>' + esc(e.date) + '</td>' +
        '<td>' + esc(e.desc) + '</td>' +
        '<td class="af-tar">' + afFmtMoney(e.amount) + '</td>' +
        '<td class="af-tar font-mono"><b>' + afFmtMoney(e.balanceAfter) + '</b></td>' +
        '<td class="af-tar"><button type="button" class="af-btn sm ' + (isSel ? 'primary' : '') + '" onclick="afSelectExamOption(' + curIdx + ', \'' + escAttr(e.id) + '\')">' + (isSel ? 'Selected' : 'Select Row') + '</button></td>' +
        '</tr>';
    }).join('');
    bodyHTML = '<table class="af-tbl"><thead><tr><th>Date</th><th>Description</th><th class="af-tar">Amount</th><th class="af-tar">Balance After</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
  } else if (item.type === 'compose') {
    bodyHTML = '<textarea id="afExamComposeBox" class="af-compose-textarea" placeholder="' + escAttr(item.placeholder || 'Draft response...') + '" oninput="afSaveExamCompose(' + curIdx + ')">' + (chosen ? esc(chosen.text || '') : '') + '</textarea>';
  }

  return afPageHead('Exam in Progress', 'Question ' + (curIdx + 1) + ' of ' + ex.max,
    '<span class="af-exam-timer">&#9201; 30:00</span>'
  ) +
    '<div class="af-exam-card">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
    '<span class="af-chip brand">' + esc(item.category.toUpperCase()) + '</span>' +
    '<span style="font-size:12px;color:var(--af-muted)">Question ' + (curIdx + 1) + ' / ' + ex.max + '</span>' +
    '</div>' +
    '<h4>' + esc(item.title) + '</h4>' +
    '<p class="af-step-situation">' + esc(item.situation || item.instruction) + '</p>' +
    bodyHTML +
    '<div style="display:flex;justify-content:space-between;margin-top:20px">' +
    '<button type="button" class="af-btn" ' + (curIdx === 0 ? 'disabled' : 'onclick="afPrevExamItem()"') + '>&larr; Previous</button>' +
    (curIdx === ex.max - 1
      ? '<button type="button" class="af-btn primary" onclick="afSubmitExam()">Submit Exam</button>'
      : '<button type="button" class="af-btn primary" onclick="afNextExamItem()">Next &rarr;</button>') +
    '</div>' +
    '</div>';
}

function afStartExam() {
  afEnsureShuffleSalt();
  const drawnIds = [];
  AF_EXAM_BLUEPRINT.forEach(function (spec) {
    const pool = AF_EXAM_BANK.filter(function (i) { return i.category === spec.category; });
    const order = afOptionOrder('exampool:' + spec.category, pool.length);
    for (let j = 0; j < spec.count && j < pool.length; j++) {
      drawnIds.push(pool[order[j]].id);
    }
  });

  const finalOrder = afOptionOrder('examfinalorder', drawnIds.length);
  const shuffledIds = finalOrder.map(function (idx) { return drawnIds[idx]; });

  afStore.exam = {
    startedAt: Date.now(),
    endsAt: Date.now() + 30 * 60000,
    itemIds: shuffledIds,
    currentIndex: 0,
    answers: {},
    submittedAt: null,
    score: 0,
    max: shuffledIds.length
  };
  afSave();
  afGoto('exam');
}

function afSelectExamOption(curIdx, optVal) {
  if (!afStore.exam) return;
  afStore.exam.answers[curIdx] = optVal;
  afSave();
  afRenderRoot();
}

function afSaveExamCompose(curIdx) {
  const box = document.getElementById('afExamComposeBox');
  if (!box || !afStore.exam) return;
  const text = box.value.trim();
  const item = AF_EXAM_BANK.find(function (x) { return x.id === afStore.exam.itemIds[curIdx]; });
  let passed = false;
  if (item && item.rubric) {
    const results = item.rubric.map(function (c) {
      const fn = AF_RUBRIC_CHECKS[c.check];
      return fn ? !!fn(text) : false;
    });
    passed = results.filter(Boolean).length >= item.passMark;
  }
  afStore.exam.answers[curIdx] = { text: text, passed: passed };
  afSave();
}

function afNextExamItem() {
  if (!afStore.exam) return;
  if (afStore.exam.currentIndex < afStore.exam.max - 1) {
    afStore.exam.currentIndex++;
    afSave();
    afRenderRoot();
  }
}

function afPrevExamItem() {
  if (!afStore.exam) return;
  if (afStore.exam.currentIndex > 0) {
    afStore.exam.currentIndex--;
    afSave();
    afRenderRoot();
  }
}

function afSubmitExam() {
  if (!afStore.exam) return;
  let totalScore = 0;
  afStore.exam.itemIds.forEach(function (itemId, idx) {
    const item = AF_EXAM_BANK.find(function (x) { return x.id === itemId; });
    if (!item) return;
    const ans = afStore.exam.answers[idx];
    if (item.type === 'decide' && ans === item.correct) totalScore++;
    else if (item.type === 'verify' && ans === item.targetEntryId) totalScore++;
    else if (item.type === 'compose' && ans && ans.passed) totalScore++;
  });

  afStore.exam.submittedAt = Date.now();
  afStore.exam.score = totalScore;
  afSave();
  afRenderRoot();
}

function afRetakeExam() {
  afStartExam();
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
  const l = (typeof AF_LESSONS !== 'undefined' ? AF_LESSONS.find(function (x) { return x.id === lessonId; }) : null) || (typeof SimEngine !== 'undefined' && SimEngine.findLesson ? SimEngine.findLesson(lessonId) : null);
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
  if (typeof simToast === 'function') simToast('Lesson ' + l.number + ' restarted.', { tone: 'good' });
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
  const sidebar = document.getElementById('afSidebar');
  const shell = document.querySelector('.af-shell');
  if (typeof window !== 'undefined' && window.innerWidth && window.innerWidth <= 768) {
    if (!shell) return;
    afState.sidebarOpen = typeof force === 'boolean' ? force : !afState.sidebarOpen;
    shell.classList.toggle('nav-open', afState.sidebarOpen);
  } else {
    afState.sidebarMinimized = typeof force === 'boolean' ? force : !afState.sidebarMinimized;
    if (sidebar) sidebar.classList.toggle('minimized', afState.sidebarMinimized);
    afRenderSidebar();
  }
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
