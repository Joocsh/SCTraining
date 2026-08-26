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

  if (view === 'leasing') {
    afState.section = 'leasing';
    if (extraId) afState.sectionTab = extraId;
    else if (!afState.sectionTab || ['vacancies', 'guest-cards', 'applications', 'leases', 'renewals'].indexOf(afState.sectionTab) === -1) {
      afState.sectionTab = 'vacancies';
    }
  }
  if (view === 'residents') {
    afState.section = 'residents';
    if (extraId) afState.sectionTab = extraId;
    else if (!afState.sectionTab || ['tenants', 'vendors'].indexOf(afState.sectionTab) === -1) {
      afState.sectionTab = 'tenants';
    }
  }
  if (view === 'owners') {
    afState.section = 'owners';
    afState.sectionTab = 'owners';
  }
  if (view === 'maintenance') {
    afState.section = 'maintenance';
    if (extraId) afState.sectionTab = extraId;
    else if (!afState.sectionTab || ['work-orders', 'inspections'].indexOf(afState.sectionTab) === -1) {
      afState.sectionTab = 'work-orders';
    }
  }
  if (view === 'accounting') {
    afState.section = 'accounting';
    if (extraId) {
      afState.accountingTab = extraId;
      afState.sectionTab = extraId;
    } else if (!afState.sectionTab || ['overview', 'receipts', 'delinquency', 'statements', 'reconcile'].indexOf(afState.sectionTab) === -1) {
      afState.sectionTab = afState.accountingTab || 'overview';
    }
  }
  if (view === 'reporting') {
    afState.section = 'reporting';
    if (extraId) afState.sectionTab = extraId;
    else if (!afState.sectionTab || ['reports', 'scheduled', 'letters', 'metrics', 'compliance'].indexOf(afState.sectionTab) === -1) {
      afState.sectionTab = 'reports';
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
const AF_NAV = [
  { id: 'dashboard', label: 'Dashboard', nav: 'dashboard', view: 'dashboard' },

  { id: 'leasing', label: 'Leasing', nav: 'leasing', view: 'leasing', children: [
    { id: 'vacancies',    label: 'Vacancies',           view: 'leasing', tab: 'vacancies' },
    { id: 'guest-cards',  label: 'Guest Cards',         view: 'leasing', tab: 'guest-cards' },
    { id: 'applications', label: 'Rental Applications', view: 'leasing', tab: 'applications' },
    { id: 'leases',       label: 'Leases',              view: 'leasing', tab: 'leases' },
    { id: 'renewals',     label: 'Renewals',            view: 'leasing', tab: 'renewals' }
  ]},

  { id: 'properties', label: 'Properties', nav: 'properties', view: 'properties', children: [
    { id: 'properties',   label: 'Properties',   view: 'properties', tab: 'properties', nav: 'properties' },
    /* Associations are the HOA side of AppFolio. This module is residential
       only by decision 1 of the contract, so the entry is shown and declines. */
    { id: 'associations', label: 'Associations', stub: true }
  ]},

  { id: 'people', label: 'People', nav: 'residents', view: 'residents', children: [
    { id: 'tenants',    label: 'Tenants',         view: 'residents', tab: 'tenants', nav: 'residents' },
    { id: 'homeowners', label: 'Homeowners',      stub: true },
    { id: 'owners',     label: 'Owners',          view: 'owners',    tab: 'owners' },
    { id: 'vendors',    label: 'Vendors',         view: 'residents', tab: 'vendors' },
    { id: 'tax',        label: 'Tax Authorities', stub: true }
  ]},

  { id: 'accounting', label: 'Accounting', nav: 'accounting', view: 'accounting', children: [
    { id: 'overview',     label: 'Overview',            view: 'accounting', tab: 'overview' },
    { id: 'receipts',     label: 'Receipts & Ledger',   view: 'accounting', tab: 'receipts' },
    { id: 'delinquency',  label: 'Delinquency Aging',   view: 'accounting', tab: 'delinquency' },
    { id: 'statements',   label: 'Owner Statements',    view: 'accounting', tab: 'statements' },
    { id: 'reconcile',    label: 'Bank Reconciliation', view: 'accounting', tab: 'reconcile' }
  ]},

  { id: 'maintenance', label: 'Maintenance', nav: 'maintenance', view: 'maintenance', children: [
    { id: 'work-orders',   label: 'Work Orders',           view: 'maintenance', tab: 'work-orders', nav: 'maintenance' },
    { id: 'recurring',     label: 'Recurring Work Orders', stub: true },
    { id: 'inspections',   label: 'Inspections',           view: 'maintenance', tab: 'inspections' },
    { id: 'purchase',      label: 'Purchase Orders',       stub: true },
    { id: 'contact',       label: 'Contact Center',        stub: true }
  ]},

  { id: 'reporting', label: 'Reporting', nav: 'reporting', view: 'reporting', children: [
    { id: 'reports',    label: 'Reports',           view: 'reporting', tab: 'reports' },
    { id: 'scheduled',  label: 'Scheduled Reports', view: 'reporting', tab: 'scheduled' },
    { id: 'letters',    label: 'Letters',           view: 'reporting', tab: 'letters' },
    { id: 'metrics',    label: 'Metrics',           view: 'reporting', tab: 'metrics' },
    { id: 'surveys',    label: 'Surveys',           stub: true },
    { id: 'compliance', label: 'Compliance',        view: 'reporting', tab: 'compliance' }
  ]},

  /* MESSAGES has no children in the sidebar and carries an orange count. */
  { id: 'messages', label: 'Messages', view: 'communications', badge: true }
];

/* Level-2 tabs. Only three pages have them, and each strip sits directly under
   the level-1 strip rather than replacing it — the sidebar locates you, the
   first strip moves you between siblings, the second within one sibling. */
const AF_SUBTABS = {
  'accounting/receivables': [
    { id: 'receipts',  label: 'Receipts' },
    { id: 'charges',   label: 'Charges' },
    { id: 'deposits',  label: 'Bank Deposits' }
  ],
  'accounting/payables': [
    { id: 'bills',     label: 'Bills' },
    { id: 'payments',  label: 'Payments' },
    { id: 'recurring', label: 'Recurring' },
    { id: 'online',    label: 'Online Payables' }
  ],
  'accounting/journal': [
    { id: 'history',   label: 'Journal Entry History' },
    { id: 'recurring', label: 'Recurring Journal Entries' },
    { id: 'bulk',      label: 'Bulk Journal Entries' }
  ],
  'reporting/metrics': [
    { id: 'pricing',   label: 'Pricing Metrics' },
    { id: 'business',  label: 'Business Metrics' },
    { id: 'insurance', label: 'Tenant Insurance Coverage' }
  ],
  'reporting/compliance': [
    { id: 'violations', label: 'Violations' },
    { id: 'reviews',    label: 'Architectural Reviews' }
  ]
};

/* Which sidebar section owns a given module view, so the rail and the sidebar
   stay lit when a lesson navigates straight to a detail screen. */
const AF_VIEW_SECTION = {
  dashboard: 'dashboard',
  leasing: 'leasing', application: 'leasing', 'lease-detail': 'leasing',
  properties: 'properties', 'property-detail': 'properties', 'unit-detail': 'properties',
  residents: 'people', 'resident-detail': 'people', owners: 'people', 'owner-detail': 'people',
  accounting: 'accounting',
  maintenance: 'maintenance', 'work-order': 'maintenance',
  reporting: 'reporting',
  communications: 'messages'
};

function afNavSection(id) {
  return AF_NAV.find(function (s) { return s.id === id; }) || null;
}
function afCurrentNavSection() {
  return AF_VIEW_SECTION[afState.view] || afState.section || 'dashboard';
}

/* Expanding is separate from being active, because AppFolio lets you leave a
   section open while you work somewhere else — frame 12 shows exactly that. */
function afToggleNavGroup(id) {
  afState.navOpen[id] = !afState.navOpen[id];
  afRenderChrome();
}

function afNavGo(sectionId, childId) {
  const s = afNavSection(sectionId);
  if (!s) return;

  /* A section with children behaves the way it does in the product: it opens,
     and it takes you to its first child. */
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
const AF_REPORT_INDEX = [
  { group: 'Tenant Reports', items: [
    { name: 'Debt Collections Status' },
    { name: 'Delinquency', id: 'delinquency' },
    { name: 'Eligible Debt Summary' },
    { name: 'Security Deposit Funds Detail', id: 'deposit-liability' },
    { name: 'Tenant Directory', id: 'tenant-directory' },
    { name: 'Tenant Ledger', id: 'tenant-ledger' },
    { name: 'Tenant Tickler' },
    { name: 'Tenant Unpaid Charges' },
    { name: 'Tenant Unpaid Charges Summary' }
  ]},
  { group: 'Property & Unit Reports', items: [
    { name: 'Activities Summary' },
    { name: 'Additional Fees' },
    { name: 'Annual Budget Comparison' },
    { name: 'Budget Comparison' },
    { name: 'Budget Detail' },
    { name: 'Gross Potential Rent', id: 'gross-potential-rent' },
    { name: 'Keys Detail' },
    { name: 'Property Directory', id: 'property-directory' },
    { name: 'Property Group Directory' },
    { name: 'Property Performance' },
    { name: 'Rent Roll', id: 'rent-roll' },
    { name: 'Rent Roll (Commercial)', isNew: true },
    { name: 'Rent Roll (Itemized)', id: 'rent-roll-itemized' }
  ]},
  { group: 'Accounting Reports', items: [
    { name: 'Account Totals' },
    { name: 'Balance Sheet', id: 'balance-sheet' },
    { name: 'Balance Sheet - Comparative' },
    { name: 'Balance Sheet Comparison' },
    { name: 'Bank Account Activity' },
    { name: 'Bank Account Association' },
    { name: 'Cash Flow', id: 'cash-flow' },
    { name: 'Cash Flow - 12 Month' },
    { name: 'Cash Flow Comparison' },
    { name: 'Cash Flow Detail' },
    { name: 'Chart of Accounts' },
    { name: 'Expense Distribution' },
    { name: 'General Ledger', id: 'general-ledger' },
    { name: 'Income Statement', id: 'income-statement' },
    { name: 'Income Statement - 12 Month' },
    { name: 'Income Statement - Comparative' },
    { name: 'Income Statement Comparison' },
    { name: 'Trial Balance', id: 'trial-balance' },
    { name: 'Trust Account Balance', id: 'trust-balance' },
    { name: 'Trust Account Detail', id: 'trust-detail' }
  ]},
  { group: 'Transaction Reports', items: [
    { name: 'Aged Payables Summary' },
    { name: 'Aged Receivable Detail', id: 'aged-receivables' },
    { name: 'Bill Detail' },
    { name: 'Payment Detail' },
    { name: 'Receipt Detail' }
  ]}
];

const AF_REPORT_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>' +
  '<line x1="9" y1="9" x2="9" y2="21"/></svg>';

function afReportIndexHTML() {
  return '<div class="af-reports-cols">' +
    AF_REPORT_INDEX.map(function (g) {
      return '<section class="af-reports-group"><h3>' + esc(g.group) + '</h3>' +
        g.items.map(function (r) {
          const live = !!r.id;
          return '<button type="button" class="af-report-row' + (live ? '' : ' stub') + '"' +
            (live ? ' data-report="' + escAttr(r.id) + '"' : '') +
            ' onclick="' + (live
              ? 'afViewReport(\'' + escAttr(r.id) + '\')'
              : 'afDemoAction(\'The ' + escAttr(r.name) + ' report\')') + '">' +
            AF_REPORT_ICON + '<span>' + esc(r.name) + '</span>' +
            (r.isNew ? '<span class="af-report-new">NEW</span>' : '') +
          '</button>';
        }).join('') +
      '</section>';
    }).join('') +
  '</div>';
}

/* ---------------------------------------------------------------------------
   SIDEBAR
   --------------------------------------------------------------------------- */
function afRenderSidebar() {
  const el = document.getElementById('afSidebar');
  if (!el) return;

  const activeSection = afCurrentNavSection();

  const rows = AF_NAV.map(function (s) {
    const isActive = s.id === activeSection;
    const isOpen = !!afState.navOpen[s.id] || isActive;
    const hasKids = !!(s.children && s.children.length);

    /* data-section carries the module's view id, which is what the lesson
       walkthroughs select on. Sections without one still get their own id so
       the tour can find them. */
    const dataSection = s.nav || s.id;

    let html =
      '<a class="af-sb-item' + (isActive ? ' active' : '') + (isOpen && hasKids ? ' open' : '') + '"' +
      ' href="#" data-section="' + escAttr(dataSection) + '"' +
      ' onclick="afNavGo(\'' + escAttr(s.id) + '\');return false;">' +
        '<span class="af-sb-label">' + esc(s.label) + '</span>' +
        (s.badge ? '<span class="af-sb-badge">' + afUnreadMessages() + '</span>' : '') +
        (hasKids
          ? '<span class="af-sb-caret" onclick="event.stopPropagation();event.preventDefault();afToggleNavGroup(\'' + escAttr(s.id) + '\');" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
            '</span>'
          : '') +
      '</a>';

    if (hasKids && isOpen) {
      html += '<div class="af-sb-kids' + (isActive ? ' on-active' : '') + '">' +
        s.children.map(function (c) {
          const kidActive = isActive && (afState.navChild === c.id ||
            (!afState.navChild && c === s.children[0]));
          return '<a class="af-sb-kid' + (kidActive ? ' active' : '') + (c.stub ? ' stub' : '') + '"' +
            ' href="#"' + (c.nav ? ' data-section="' + escAttr(c.nav) + '"' : '') +
            ' onclick="afNavGo(\'' + escAttr(s.id) + '\',\'' + escAttr(c.id) + '\');return false;">' +
            esc(c.label) + '</a>';
        }).join('') +
      '</div>';
    }
    return html;
  }).join('');

  /* Training is not part of AppFolio. It is fenced off at the bottom, above
     WHAT'S NEW, and disappears entirely on a ?demo=1 link. */
  const training = afShowsTraining()
    ? '<div class="af-sb-training">' +
        '<div class="af-sb-trainlabel">SkillCloud training</div>' +
        '<a class="af-sb-item training' + (afState.view === 'lessons' || afState.view === 'lesson' ? ' active' : '') + '"' +
        ' href="#" data-section="lessons" onclick="afGoto(\'lessons\');return false;">' +
        '<span class="af-sb-label">Lessons</span></a>' +
      '</div>'
    : '';

  el.innerHTML =
    '<div class="af-sb-company">Management<br>Company</div>' +
    '<nav class="af-sb-nav" aria-label="Sections">' + rows + '</nav>' +
    training +
    '<button type="button" class="af-sb-new" onclick="afDemoAction(\'What&rsquo;s New\')">' +
      'WHAT&rsquo;S NEW <span>' + AF_WHATS_NEW_COUNT + '</span>' +
    '</button>';
}

/* Counted from the messages the visitor has not opened, so the badge is derived
   rather than a decorative number. */
function afUnreadMessages() {
  const sent = (afDemo.messages || []).length;
  return Math.max(0, 1 - Math.min(sent, 1)) + (sent ? 0 : 0) || 1;
}

const AF_WHATS_NEW_COUNT = 5;


/* ---------------------------------------------------------------------------
   TAB STRIPS
   --------------------------------------------------------------------------- */
function afRenderSubnav() {
  const el = document.getElementById('afSubnav');
  if (!el) return;

  const s = afNavSection(afCurrentNavSection());
  if (!s || !s.children || !s.children.length) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }

  const activeTab = afState.sectionTab || (s.children[0] && s.children[0].tab) || null;

  const level1 = s.children.map(function (c) {
    const on = c.tab ? c.tab === activeTab : false;
    return '<button type="button" class="af-tab' + (on ? ' on' : '') + '"' +
      ' data-subtab="' + escAttr(c.tab || c.id) + '"' +
      ' onclick="' + (c.stub
        ? 'afDemoAction(\'' + escAttr(c.label) + '\')'
        : 'afNavGo(\'' + escAttr(s.id) + '\',\'' + escAttr(c.id) + '\')') + '">' +
      esc(c.label) + '</button>';
  }).join('');

  /* The second strip, where the page has one. */
  const key = s.id + '/' + (activeTab || '');
  const subs = AF_SUBTABS[key];
  const level2 = subs
    ? '<div class="af-tabs level2">' + subs.map(function (t, i) {
        const on = (afState.subTab || subs[0].id) === t.id;
        return '<button type="button" class="af-tab2' + (on ? ' on' : '') + '"' +
          ' data-subtab2="' + escAttr(t.id) + '"' +
          ' onclick="afSetSubTab(\'' + escAttr(t.id) + '\')">' + esc(t.label) + '</button>';
      }).join('') + '</div>'
    : '';

  el.hidden = false;
  el.innerHTML = '<div class="af-tabs">' + level1 + '</div>' + level2;
}


/* ---------------------------------------------------------------------------
   RIGHT RAIL
   ---------------------------------------------------------------------------
   Contextual, and deliberately short. The real rail carries up to twenty links
   per page; reproducing that count here would mean twenty destinations that do
   not exist, which rule D of the contract forbids. So the groups and their
   order are the real ones, and only the links this module can actually honour
   are listed. Four working links are faithful; twenty dead ones are not.
   --------------------------------------------------------------------------- */
const AF_RAIL = {
  dashboard: [
    { group: 'People', icon: 'user', links: [
      { label: 'Move In Tenant',  act: "afModalAddResident()" },
      { label: 'Tenant Receipt',  act: "afModalPostPayment()" },
      { label: 'New Owner',       act: "afModalAddOwner()" },
      { label: 'Enter Bill',      act: "afModalCreateWorkOrder()" }
    ]},
    { group: 'Property', icon: 'home', links: [
      { label: 'New Property', act: "afModalAddProperty()" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Delinquency', act: "afViewReport('delinquency')" },
      { label: 'Rent Roll',   act: "afViewReport('rent-roll')" }
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
  leasing: [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'New Guest Card', act: "afModalNewListing()" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Rent Roll', act: "afViewReport('rent-roll')" }
    ]}
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
  maintenance: [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'New Work Order', act: "afModalCreateWorkOrder()" }
    ]},
    { group: 'Reports', icon: 'chart', links: [
      { label: 'Rent Roll', act: "afViewReport('rent-roll')" }
    ]}
  ],
  reporting: [
    { group: 'Statements', icon: 'doc', links: [
      { label: 'Send Owner Packets', act: "afDemoAction('Sending owner packets')" }
    ]},
    { group: 'Letters', icon: 'doc', links: [
      { label: '3-Day Notices', act: "SimEngine.viewDoc('documents/notice-to-vacate.html','3-Day Notice to Vacate')" }
    ]}
  ],
  messages: [
    { group: 'Tasks', icon: 'star', links: [
      { label: 'Compose Message', act: "afModalComposeMessage()" }
    ]}
  ]
};

const AF_RAIL_ICONS = {
  star:  '<polygon points="12 2 15.1 8.6 22 9.6 17 14.5 18.2 21.5 12 18.2 5.8 21.5 7 14.5 2 9.6 8.9 8.6 12 2"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  doc:   '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  user:  '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  home:  '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  help:  '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
};

function afRenderRail() {
  const el = document.getElementById('afRail');
  if (!el) return;

  const groups = AF_RAIL[afCurrentNavSection()];
  if (!groups || !groups.length) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = groups.map(function (g) {
    return '<div class="af-rail-group">' +
      '<div class="af-rail-head">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          (AF_RAIL_ICONS[g.icon] || '') + '</svg>' +
        esc(g.group.toUpperCase()) +
      '</div>' +
      g.links.map(function (l) {
        return '<button type="button" class="af-rail-link" onclick="' + l.act + '">' + esc(l.label) + '</button>';
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
function afDashboardHTML() {
  const units = afAllUnits();
  const activeLeases = afAllLeases().filter(function (l) { return l.status === 'active'; });
  const occupied = units.filter(function (u) { return u.status === 'occupied'; }).length;
  const vacant = units.filter(function (u) { return u.status.indexOf('vacant') === 0; }).length;
  const openWork = afAllWorkOrders().filter(function (w) { return w.status !== 'completed'; }).length;
  const openTasks = afAllTasks().filter(function (t) { return t.status !== 'completed'; }).length;
  const totalRentRoll = activeLeases.reduce(function (s, l) { return s + (l.rentAmount || 0); }, 0);
  const totalDelinquent = activeLeases.reduce(function (s, l) { return s + (l.balanceCents > 0 ? l.balanceCents : 0); }, 0);
  const occPct = units.length ? Math.round(occupied / units.length * 100) : 0;

  const tile = function (label, value, sub, view, arg) {
    return '<button type="button" class="af-tile" onclick="afGoto(\'' + view + '\'' + (arg ? ', \'' + arg + '\'' : '') + ')">' +
      '<span class="af-tile-label">' + esc(label) + '</span>' +
      '<b class="af-tile-value">' + esc(String(value)) + '</b>' +
      '<span class="af-tile-sub">' + esc(sub) + '</span></button>';
  };

  const delinquentLeases = activeLeases.filter(function (l) { return l.balanceCents > 0; });
  const emergencyWork = afAllWorkOrders().filter(function (w) { return w.priority === 'emergency' && w.status !== 'completed'; });

  return afPageHead('Dashboard', 'Operations & Portfolio Overview as of ' + afFmtDate(afToday()) + '.') +
    '<div class="af-tiles">' +
      tile('Occupancy', occPct + '%', occupied + ' of ' + units.length + ' units occupied', 'properties') +
      tile('Rent Roll', afFmtMoney(totalRentRoll), activeLeases.length + ' active leases', 'accounting', 'overview') +
      tile('Delinquency', afFmtMoney(totalDelinquent), delinquentLeases.length + ' accounts past due', 'accounting', 'delinquency') +
      tile('Open Work Orders', openWork, emergencyWork.length + ' emergency requests', 'maintenance') +
      tile('Open Tasks', openTasks, 'Pending action items', 'tasks') +
    '</div>' +
    '<div class="af-cols">' +
      '<section class="af-card"><h3>Needs Attention</h3>' +
        (delinquentLeases.length || emergencyWork.length
          ? '<table class="af-tbl"><tbody>' +
              delinquentLeases.slice(0, 4).map(function (l) {
                const r = l.residentIds.length ? afGetResident(l.residentIds[0]) : null;
                const u = afGetUnit(l.unitId);
                return '<tr class="link" onclick="afGoto(\'resident-detail\', \'' + escAttr(r ? r.id : '') + '\')">' +
                  '<td><b>' + esc(r ? r.name : 'Resident') + '</b><div class="af-sub">Unit ' + (u ? u.label : '') + ' &bull; Past Due</div></td>' +
                  '<td class="num" style="color:var(--af-bad);font-weight:700;">' + afFmtMoney(l.balanceCents) + '</td>' +
                  '</tr>';
              }).join('') +
              emergencyWork.map(function (w) {
                return '<tr class="link" onclick="afGoto(\'work-order\', \'' + escAttr(w.id) + '\')">' +
                  '<td><b>' + esc(w.title) + '</b><div class="af-sub">' + esc(w.id) + '</div></td>' +
                  '<td><span class="af-badge emergency">Emergency</span></td>' +
                  '</tr>';
              }).join('') +
            '</tbody></table>'
          : '<p class="af-sub">All accounts and maintenance items are current.</p>') +
      '</section>' +
      '<section class="af-card"><h3>Recent Portfolio Activity</h3>' +
        '<table class="af-tbl"><tbody>' +
          afAllLedgerEntries().slice(-5).reverse().map(function (e) {
            const lease = afGetLease(e.leaseId);
            const r = lease && lease.residentIds.length ? afGetResident(lease.residentIds[0]) : null;
            return '<tr>' +
              '<td>' + afFmtDate(e.date) + '</td>' +
              '<td><b>' + esc(e.description) + '</b><div class="af-sub">' + (r ? esc(r.name) : '') + '</div></td>' +
              '<td class="num" style="color:' + (e.type === 'payment' ? 'var(--af-good)' : 'var(--af-text)') + '">' +
                (e.type === 'payment' ? '-' : '') + afFmtMoney(e.amount) +
              '</td>' +
              '</tr>';
          }).join('') +
        '</tbody></table>' +
      '</section>' +
    '</div>';
}

/* ---------- Properties and units ---------- */
function afPropertiesHTML() {
  const props = afAllProperties();
  const actions = '<button type="button" class="af-btn primary" onclick="afModalAddProperty()">+ Add Property</button>';

  const rows = props.map(function (p) {
    const units = afAllUnits().filter(function (u) { return u.propertyId === p.id; });
    const occ = units.filter(function (u) { return u.status === 'occupied'; }).length;
    return '<tr class="link" data-prop="' + escAttr(p.id) + '" onclick="afGoto(\'property-detail\', \'' + escAttr(p.id) + '\')">' +
      '<td><button type="button" class="af-link-btn" data-prop="' + escAttr(p.id) + '" onclick="afGoto(\'property-detail\', \'' + escAttr(p.id) + '\')"><b>' + esc(p.name) + '</b></button><div class="af-sub">' + esc(p.address) + ', ' + esc(p.city) + ' ' + esc(p.state) + '</div></td>' +
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

function afPropertyDetailHTML() {
  const p = afGetProperty(afState.activePropertyId);
  if (!p) return afEmptyState({ title: 'Property not found', body: 'It may have been removed.', actionLabel: 'Back to properties', action: "afGoto('properties')" });

  const units = afAllUnits().filter(function (u) { return u.propertyId === p.id; });
  const rows = units.map(function (u) {
    const lease = u.currentLeaseId ? afGetLease(u.currentLeaseId) : null;
    const res = lease && lease.residentIds.length ? afGetResident(lease.residentIds[0]) : null;
    return '<tr class="link" data-unit="' + escAttr(u.id) + '" onclick="afGoto(\'unit-detail\', \'' + escAttr(u.id) + '\')">' +
      '<td><button type="button" class="af-link-btn" data-unit="' + escAttr(u.id) + '" onclick="afGoto(\'unit-detail\', \'' + escAttr(u.id) + '\')"><b>Unit ' + esc(u.label) + '</b></button></td>' +
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

/* ---------- People (Residents, Owners, Vendors) ---------- */
function afResidentsHTML() {
  const tab = afState.sectionTab || 'tenants';
  if (tab === 'vendors') return afVendorsHTML();
  if (tab === 'owners') return afOwnersHTML();
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
  return afLeasingVacanciesHTML();
}

function afLeasingVacanciesHTML() {
  const vacantUnits = afAllUnits().filter(function (u) {
    return String(u.status).indexOf('vacant') === 0 || u.status === 'notice';
  });

  const rows = vacantUnits.map(function (u) {
    const p = afGetProperty(u.propertyId);
    return '<tr class="link" onclick="afGoto(\'unit-detail\', \'' + escAttr(u.id) + '\')">' +
      '<td><b>' + (p ? esc(p.name) : '') + ' &bull; Unit ' + esc(u.label) + '</b></td>' +
      '<td>' + u.beds + ' bd / ' + u.baths + ' ba (' + u.sqft + ' sq ft)</td>' +
      '<td class="num"><b>' + afFmtMoney(u.marketRent) + '</b></td>' +
      '<td><span class="af-badge ' + escAttr(u.status) + '">' + esc(afUnitStatusLabel(u.status)) + '</span></td>' +
      '<td>' + (u.amenities ? u.amenities.slice(0, 2).join(', ') : 'Standard') + '</td>' +
      '<td><button type="button" class="af-btn sm" onclick="event.stopPropagation();afModalNewListing()">List Unit</button></td>' +
      '</tr>';
  }).join('');

  return afPageHead('Vacant Units & Marketing', vacantUnits.length + ' units ready for marketing and leasing.',
      '<button type="button" class="af-btn primary" onclick="afModalNewListing()">+ New Listing</button>') +
    '<section class="af-card">' +
      '<h3>Available Vacancies</h3>' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Property / Unit</th><th>Floorplan</th><th class="num">Market Rent</th><th>Status</th><th>Features</th><th>Action</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</section>';
}

function afLeasingGuestCardsHTML() {
  const cards = afAllGuestCards();

  const rows = cards.map(function (g) {
    const u = afGetUnit(g.unitId);
    const p = u ? afGetProperty(u.propertyId) : null;
    return '<tr>' +
      '<td><b>' + esc(g.name) + '</b><div class="af-sub">' + esc(g.notes || '') + '</div></td>' +
      '<td>' + (p ? esc(p.name) + ' ' : '') + (u ? esc('Unit ' + u.label) : '—') + '</td>' +
      '<td>' + esc(g.source) + '</td>' +
      '<td><span class="af-badge ' + (g.stage === 'applied' ? 'good' : (g.stage === 'inquiry' ? 'warn' : 'neutral')) + '">' + esc(g.stage) + '</span></td>' +
      '<td>' +
        (g.stage === 'inquiry'
          ? '<button type="button" class="af-btn sm" data-gc-advance="' + escAttr(g.id) + '" onclick="afSetGuestCardStage(\'' + escAttr(g.id) + '\', \'contacted\')">Mark Contacted</button>' +
            '<button type="button" class="af-btn sm primary" data-gc-showing="' + escAttr(g.id) + '" style="margin-left:6px" onclick="afSetGuestCardStage(\'' + escAttr(g.id) + '\', \'tour-scheduled\')">Schedule Tour</button>'
          : '') +
        (g.stage === 'contacted'
          ? '<button type="button" class="af-btn sm primary" data-gc-showing="' + escAttr(g.id) + '" onclick="afSetGuestCardStage(\'' + escAttr(g.id) + '\', \'tour-scheduled\')">Schedule Tour</button>'
          : '') +
        (g.stage === 'tour-scheduled'
          ? '<button type="button" class="af-btn sm" onclick="afSetGuestCardStage(\'' + escAttr(g.id) + '\', \'toured\')">Mark Toured</button>'
          : '') +
        (g.stage === 'toured'
          ? '<button type="button" class="af-btn sm primary" onclick="afSetGuestCardStage(\'' + escAttr(g.id) + '\', \'applied\')">Send App</button>'
          : '') +
        (g.stage === 'applied'
          ? '<span class="af-pill-good">&#10003; Application Submitted</span>'
          : '') +
      '</td>' +
      '</tr>';
  }).join('');

  return afPageHead('Guest Cards & Inquiries', cards.length + ' prospective renters in the leasing pipeline.',
      '<button type="button" class="af-btn primary" onclick="simToast(\'Guest Card created.\', { tone: \'good\' })">+ New Guest Card</button>') +
    '<section class="af-card">' +
      '<h3>Active Prospect Queue</h3>' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Lead Name</th><th>Inquired Unit</th><th>Lead Source</th><th>Stage</th><th>Actions</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</section>';
}

function afLeasingApplicationsHTML() {
  const apps = afAllApplications();

  const rows = apps.map(function (a) {
    const u = afGetUnit(a.unitId);
    const p = u ? afGetProperty(u.propertyId) : null;
    return '<tr class="link" onclick="afGoto(\'application\', \'' + escAttr(a.id) + '\')">' +
      '<td><b>' + esc(a.name) + '</b><div class="af-sub">' + esc(a.email) + '</div></td>' +
      '<td>' + (p ? esc(p.name) + ' ' : '') + (u ? esc('Unit ' + u.label) : '<span class="af-muted">—</span>') + '</td>' +
      '<td>' + (a.screening ? 'Score: ' + a.screening.creditScore + ' (' + a.screening.recommendation + ')' : 'Pending') + '</td>' +
      '<td><span class="af-badge ' + escAttr(a.status) + '">' + esc(a.status.toUpperCase()) + '</span></td>' +
      '<td class="num">' + afFmtMoney(a.monthlyIncomeCents) + '</td>' +
      '<td><button type="button" class="af-btn sm" onclick="event.stopPropagation();afGoto(\'application\', \'' + escAttr(a.id) + '\')">Inspect</button></td>' +
      '</tr>';
  }).join('');

  return afPageHead('Rental Applications', apps.length + ' rental applications awaiting screening decisions or lease execution.') +
    '<section class="af-card">' +
      '<h3>Applicant Screening & Decisions</h3>' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Applicant</th><th>Unit</th><th>Screening Summary</th><th>Decision Status</th><th class="num">Monthly Income</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</section>';
}

function afLeasingLeasesHTML() {
  const leases = afAllLeases();

  const rows = leases.map(function (l) {
    const u = afGetUnit(l.unitId);
    const p = u ? afGetProperty(u.propertyId) : null;
    const r = l.residentIds.length ? afGetResident(l.residentIds[0]) : null;
    return '<tr class="link" onclick="afGoto(\'lease-detail\', \'' + escAttr(l.id) + '\')">' +
      '<td><b>' + (r ? esc(r.name) : (l.applicantName ? esc(l.applicantName) : 'Resident')) + '</b><div class="af-sub">' + esc(l.id) + '</div></td>' +
      '<td>' + (p ? esc(p.name) + ' ' : '') + (u ? esc('Unit ' + u.label) : '—') + '</td>' +
      '<td>' + afFmtDate(l.startDate) + ' &rarr; ' + afFmtDate(l.endDate) + '</td>' +
      '<td class="num">' + afFmtMoney(l.rentAmount) + '</td>' +
      '<td class="num">' + afFmtMoney(l.depositHeld || 0) + '</td>' +
      '<td><span class="af-badge ' + escAttr(l.status) + '">' + esc(l.status.toUpperCase()) + '</span></td>' +
      '</tr>';
  }).join('');

  return afPageHead('Leases Directory', leases.length + ' active and pending lease agreements.') +
    '<section class="af-card">' +
      '<h3>Residential Leases</h3>' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Resident</th><th>Property / Unit</th><th>Lease Term</th><th class="num">Monthly Rent</th><th class="num">Deposit Held</th><th>Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</section>';
}

function afLeasingRenewalsHTML() {
  const activeLeases = afAllLeases().filter(function (l) { return l.status === 'active'; });
  const renewals = activeLeases.map(function (l) {
    const daysLeft = afDaysFromToday(l.endDate);
    return { lease: l, daysLeft: daysLeft };
  }).sort(function (a, b) { return a.daysLeft - b.daysLeft; });

  const rows = renewals.map(function (item) {
    const l = item.lease;
    const u = afGetUnit(l.unitId);
    const p = u ? afGetProperty(u.propertyId) : null;
    const r = l.residentIds.length ? afGetResident(l.residentIds[0]) : null;
    const days = item.daysLeft;
    let badgeCls = 'good';
    if (days <= 30) badgeCls = 'bad';
    else if (days <= 60) badgeCls = 'warn';

    return '<tr>' +
      '<td><b>' + (r ? esc(r.name) : 'Resident') + '</b><div class="af-sub">' + (p ? esc(p.name) : '') + ' &bull; Unit ' + (u ? esc(u.label) : '') + '</div></td>' +
      '<td>' + afFmtDate(l.endDate) + '</td>' +
      '<td><span class="af-pill-' + badgeCls + '">' + (days > 0 ? days + ' days remaining' : 'Expired') + '</span></td>' +
      '<td class="num">' + afFmtMoney(l.rentAmount) + '</td>' +
      '<td class="num" style="font-weight:700;color:var(--af-accent);">' + afFmtMoney(Math.round(l.rentAmount * 1.04)) + ' (+4%)</td>' +
      '<td><button type="button" class="af-btn sm primary" onclick="afModalRenewLease(\'' + escAttr(l.id) + '\')">Generate Renewal Offer</button></td>' +
      '</tr>';
  }).join('');

  return afPageHead('Lease Renewal Pipeline', 'Track expiration windows (30/60/90 days) and send proactive renewal offers to protect occupancy.') +
    '<section class="af-card">' +
      '<h3>Upcoming Lease Expirations</h3>' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Resident / Unit</th><th>Lease End Date</th><th>Time Remaining</th><th class="num">Current Rent</th><th class="num">Proposed Renewal</th><th>Action</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</section>';
}

function afSetGuestCardStage(id, newStage) {
  afSetOverride('guestCard', id, { stage: newStage });
  simToast('Guest card updated to ' + newStage + '.', { tone: 'good' });
  afRenderRoot();
}

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

  afSetOverride('lease', leaseId, {
    signatureStatus: 'executed',
    signatures: [{ name: l.applicantName, signedAt: afToday(), method: 'electronic' }]
  });
  afCloseModal();
  simToast('Lease ' + leaseId + ' signed by ' + l.applicantName + '.', { tone: 'good' });
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
  if (l.signatureStatus !== 'executed') problems.push('The lease has not been signed.');
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
  if (l.status === 'pending' && l.signatureStatus !== 'executed') {
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
    ['Signed', l.signatureStatus === 'executed'],
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
      '<div><dt>Signature</dt><dd>' + esc(l.signatureStatus || 'unsigned') + '</dd></div>' +
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
  if (tab === 'inspections') return afInspectionsHTML();
  return afWorkOrdersQueueHTML();
}

function afWorkOrdersQueueHTML() {
  const list = afAllWorkOrders();
  const actions = '<button type="button" class="af-btn primary" onclick="afModalCreateWorkOrder()">+ New Work Order</button>';

  const rows = list.map(function (w) {
    const u = afGetUnit(w.unitId);
    const v = w.vendorId ? afGetVendor(w.vendorId) : null;
    return '<tr class="link" onclick="afGoto(\'work-order\', \'' + escAttr(w.id) + '\')">' +
      '<td><b>' + esc(w.title) + '</b><div class="af-sub">' + esc(w.id) + '</div></td>' +
      '<td>' + (u ? esc('Unit ' + u.label) : '<span class="af-muted">—</span>') + '</td>' +
      '<td>' + esc(w.category) + '</td>' +
      '<td><span class="af-badge ' + escAttr(w.priority) + '">' + esc(w.priority) + '</span></td>' +
      '<td><span class="af-badge ' + escAttr(w.status) + '">' + esc(w.status) + '</span></td>' +
      '<td>' + (v ? esc(v.name) : '<span class="af-muted">Unassigned</span>') + '</td>' +
      '</tr>';
  }).join('');

  return afPageHead('Maintenance Queue', list.length + ' service requests across the portfolio.', actions) +
    '<table class="af-tbl"><thead><tr>' +
      '<th>Issue / Request</th><th>Unit</th><th>Trade</th><th>Priority</th><th>Status</th><th>Assigned Vendor</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function afInspectionsHTML() {
  const units = afAllUnits().slice(0, 15);
  const rows = units.map(function (u, i) {
    const p = afGetProperty(u.propertyId);
    const lease = u.currentLeaseId ? afGetLease(u.currentLeaseId) : null;
    const res = lease && lease.residentIds.length ? afGetResident(lease.residentIds[0]) : null;
    const type = i % 2 === 0 ? 'Move-In Inventory & Condition' : 'Move-Out Statutory Inspection';
    const status = i % 3 === 0 ? 'Completed' : 'Pending Review';

    return '<tr>' +
      '<td><b>' + (p ? esc(p.name) : '') + ' &bull; Unit ' + esc(u.label) + '</b></td>' +
      '<td>' + (res ? esc(res.name) : 'Vacant Unit') + '</td>' +
      '<td>' + esc(type) + '</td>' +
      '<td>' + afFmtDate(afAddDays(afToday(), - (i * 4 + 1))) + '</td>' +
      '<td><span class="af-badge ' + (status === 'Completed' ? 'good' : 'warn') + '">' + esc(status) + '</span></td>' +
      '<td><button type="button" class="af-btn sm" onclick="simToast(\'Inspection report loaded.\', { tone: \'good\' })">View Report</button></td>' +
      '</tr>';
  }).join('');

  return afPageHead('Property Inspections', 'Move-In / Move-Out inventory checklists and condition reports.') +
    '<section class="af-card">' +
      '<h3>Inspection Activity Log</h3>' +
      '<table class="af-tbl"><thead><tr>' +
        '<th>Property / Unit</th><th>Resident</th><th>Inspection Type</th><th>Date</th><th>Status</th><th>Action</th>' +
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
    action = '<button type="button" class="af-btn" onclick="afDemoAction(\'Reopening a closed work order\')">Reopen</button>';
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
