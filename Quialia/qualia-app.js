/* Qualia VA Training Simulator — view engine + scenario engine.
   100% frontend, localStorage only, no connection to any real Qualia account. */

/* Small monochrome line-icon set (stroke=currentColor) so nothing falls back to color emoji glyphs. */
const QZ_ICONS = {
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.7 5.1A9.9 9.9 0 0 1 12 5c5 0 9 4.5 10 7a15.6 15.6 0 0 1-2.9 3.9"/><path d="M6.6 6.8A15.1 15.1 0 0 0 2 12c1 2.5 5 7 10 7a9.7 9.7 0 0 0 4.5-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m3 3 18 18"/></svg>',
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
  // Written once the tour has run to the end or been skipped: gates the first-run showing.
  tourSeen: false,
  // Written only by the tour's own "don't show this again" checkbox. Kept apart from
  // tourSeen because they answer different questions: tourSeen is "has this browser met the
  // tour", tourOptOut is "has this person asked it to stop", and only the second one is
  // strong enough to override an explicit ?tour=1 launch.
  tourOptOut: false
};
function qzDefaultStore() { return JSON.parse(JSON.stringify(QZ_STORE_DEFAULTS)); }
let qzStore = qzDefaultStore();

/* ============================================================================
   qzDB — In-memory database (reset on F5 / qzHydrate).
   Holds all 24 mutable collections in memory. No views read frozen consts.
   ============================================================================ */
let QZ_SEED = null;

const qzDB = {
  orders: [], parties: [], documents: [], tasks: [], taskGroups: [], threads: [], messages: [],
  notes: [], vendors: [], contacts: [], events: [], receipts: [], disbursements: [],
  invoices: [], ledgerLines: [], exceptions: [], cpls: [], users: [], offices: [], fees: [],
  templates: { order: [], workflow: [], document: [] }, integrations: [], accounts: [], auditLog: [],
  pospay: [], reconciliations: [], wireLog: [], alta: [], permissions: [], security: [], notifications: [],
  /* Charge lines are the settlement statement itself: the ten Charges pages
     used to be literals inside the renderer. */
  chargeLines: [],
  /* Schedule B. Clearing an exception is curative work, so it is a record
     with a status rather than a printed paragraph. */
  titleExceptions: []
};

let _qzIdCounters = {};

function qzResetIdCounters() {
  _qzIdCounters = {
    orders: 2000,
    parties: 100,
    documents: 5000,
    tasks: 5000,
    taskGroups: 100,
    threads: 100,
    messages: 500,
    notes: 100,
    vendors: 100,
    contacts: 500,
    events: 500,
    receipts: 25000,
    disbursements: 12000,
    invoices: 6000,
    ledgerLines: 1000,
    exceptions: 4000,
    cpls: 9500,
    users: 200,
    offices: 50,
    fees: 50,
    templates: 100,
    accounts: 50,
    auditLog: 1000,
    chargeLines: 3000,
    ledgerLines: 1000
  };
}

/* ============================================================================
   ORDER ENRICHMENT — widening the order from 16 fields to a real file
   ============================================================================

   Basic Info reads 28 values. The order object carried 16. The missing 12 were
   painted as literals inside the renderer:

       ${esc(o.paralegal || "Travis Jones")}

   o.paralegal existed on none of the 75 orders, so every order in the system
   showed Travis Jones as its closer, Collin County as its county, and the same
   $5,000.00 of earnest money. The field looked real, read as real, and was a
   constant in disguise. That is the defect this function closes.

   WHY IT LIVES HERE AND NOT IN THE DATA FILES

   qualia-data.js is frozen: it carries the curriculum and the three orders the
   lessons are written against. Widening the orders where they enter the
   database instead leaves that file untouched, and gives the catalogue orders
   and the exam order the same treatment through one code path rather than
   three copies of the same literal table.

   EVERYTHING IS DERIVED, NOTHING IS RANDOM

   The values come from what the order already knows (its city and zip, its
   type, its price, its own parties) or from a deterministic hash of its id.
   Reload the page and every order comes back identical. That matters because a
   lesson that says "look at the closer on 1483" has to find the same closer
   tomorrow.

   The cast is the one that already exists in the user directory. No parallel
   roster.
   ============================================================================ */

/* Deterministic, so the same order always draws the same people. FNV-1a. */
function qzHashString(s) {
  let h = 0x811c9dc5;
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}
function qzPick(list, seed, salt) {
  if (!list || !list.length) return null;
  return list[qzHashString(String(seed) + '|' + (salt || '')) % list.length];
}

/* The county a property actually sits in. Collin, Dallas and Denton are the
   three this portfolio touches: every Plano, Frisco, McKinney and Allen zip in
   the data is Collin; Richardson 75080 and Dallas 75206 are Dallas; Lewisville
   75067 is Denton. Spreading the orders over more counties would mean inventing
   geography that contradicts the addresses. */
const QZ_COUNTY_BY_CITY = {
  'Plano': 'Collin County',
  'Frisco': 'Collin County',
  'McKinney': 'Collin County',
  'Allen': 'Collin County',
  'Wylie': 'Collin County',
  'Richardson': 'Dallas County',
  'Dallas': 'Dallas County',
  'Garland': 'Dallas County',
  'Lewisville': 'Denton County',
  'Flower Mound': 'Denton County'
};

/* The five branches are the offices that already exist in the directory, and
   the underwriters each one is licensed with come from that same record: an
   Allen order cannot be written on a policy its office does not carry. */
const QZ_BRANCHES = [
  { key: 'Plano',      agency: 'Best Closing Inc. — Plano',      underwriters: ['Old Republic National Title Insurance Co.', 'First American Title Insurance Co.'] },
  { key: 'Frisco',     agency: 'Best Closing Inc. — Frisco',     underwriters: ['Old Republic National Title Insurance Co.'] },
  { key: 'McKinney',   agency: 'Best Closing Inc. — McKinney',   underwriters: ['Old Republic National Title Insurance Co.', 'Stewart Title Guaranty Co.'] },
  { key: 'Allen',      agency: 'Best Closing Inc. — Allen',      underwriters: ['First American Title Insurance Co.'] },
  { key: 'Richardson', agency: 'Best Closing Inc. — Richardson', underwriters: ['Old Republic National Title Insurance Co.'] }
];
const QZ_JACKET_PREFIX = {
  'Old Republic National Title Insurance Co.': 'OR-TX',
  'First American Title Insurance Co.': 'FA-TX',
  'Stewart Title Guaranty Co.': 'ST-TX'
};

/* Staff pools, filtered out of the live user directory by role, so adding a
   user in Admin widens the pool instead of leaving it stale. */
function qzStaffPool(roles) {
  const users = (typeof QZS_USERS !== 'undefined' ? QZS_USERS : []);
  return users
    .filter(function (u) { return roles.indexOf(u.role) > -1; })
    .map(function (u) { return u.name; });
}

function qzAttorneyPool() {
  const cs = (typeof QZS_CONTACTS !== 'undefined' ? QZS_CONTACTS : []);
  return cs.filter(function (c) { return c.type === 'Attorney'; })
           .map(function (c) { return c.name; });
}

/* ---------- moving the whole world with the clock ----------
   QZ_SHIFT_DAYS (qualia-data.js) is the offset between the week the dataset was written and
   the week the trainee is actually in. This applies it, once, to everything that carries a
   date, in one pass over the raw data globals BEFORE the seed is built — so the generators
   (which compare against QZ_TODAY as they decide what is Paid, Past Due or Complete) see a
   world that already agrees with the clock.

   It shifts two kinds of thing:

     1. Date FIELDS — any string shaped 'YYYY-MM-DD'.
     2. Dates written INTO PROSE — the course quotes exact dates ("August 28, 2026") in
        lesson text, scenario stems and exam items, and those have to move in step or the
        trainee is taught to spot discrepancies that are not there.

   Shifting the in-memory copy rather than the files keeps qualia-data.js byte-for-byte
   untouched (rule §1.1) and means the walkthrough overlay, which renders straight from the
   course data, is carried along for free.

   What is deliberately NOT shifted: file numbers. 'ORD-2026-1483' is cited 152 times in the
   course and is part of the localStorage progress keys, so moving it would erase the progress
   of anyone mid-course. A file number carries the year the file was opened; it is a label,
   not a date. The guards below make sure the date patterns never bite into one. */
const QZ_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const QZ_MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function qzShiftDateText(text) {
  if (!QZ_SHIFT_DAYS || !text) return text;
  let out = String(text);

  /* ISO. The neighbour check is what keeps 'ORD-2026-1483' and 'TX-2026-04471' intact: a
     real date is never flanked by another digit or hyphen. */
  out = out.replace(/\d{4}-\d{2}-\d{2}/g, function (m, offset, whole) {
    const before = offset > 0 ? whole.charAt(offset - 1) : '';
    const after = whole.charAt(offset + m.length);
    if (/[\d-]/.test(before) || /[\d-]/.test(after)) return m;
    return qzShiftISO(m);
  });

  /* 'August 28, 2026' and 'Aug 28, 2026', answered in whichever of the two styles it came. */
  out = out.replace(/\b([A-Z][a-z]{2,8})\.? (\d{1,2}), (\d{4})\b/g, function (m, mon, day, year) {
    const full = QZ_MONTHS.indexOf(mon);
    const abbr = full > -1 ? -1 : QZ_MONTHS_ABBR.indexOf(mon);
    if (full < 0 && abbr < 0) return m;
    const i = full > -1 ? full : abbr;
    const d = +day;
    if (d < 1 || d > 31) return m;
    const pad = n => (n < 10 ? '0' : '') + n;
    const parts = qzShiftISO(year + '-' + pad(i + 1) + '-' + pad(d)).split('-');
    const names = full > -1 ? QZ_MONTHS : QZ_MONTHS_ABBR;
    return names[+parts[1] - 1] + ' ' + (+parts[2]) + ', ' + parts[0];
  });

  return out;
}

let _qzWorldShifted = false;

function qzShiftWorldTime() {
  if (_qzWorldShifted || !QZ_SHIFT_DAYS) { _qzWorldShifted = true; return; }
  _qzWorldShifted = true;

  /* Listed by name because top-level `const` in a classic script never lands on `window`,
     so there is nothing to enumerate. Anything holding a date or a line of course prose
     belongs here. */
  const roots = [
    QZ_ORDERS, QZ_TASKS, QZ_DOCUMENTS, QZ_MESSAGES, QZ_VENDORS, QZ_EXAM_ORDER, QZ_EXAM_DOCUMENTS,
    QZ_LESSONS, QZ_SCENARIOS, QZ_REVIEWS, QZ_COMPOSES, QZ_RECONCILES, QZ_EXAM_BANK,
    QZ_EXAM_BLUEPRINT, QZ_CHECKLISTS, QZ_ACTION_CHOICES, QZ_ACTION_LABEL, QZ_ESCALATION_CATEGORIES,
    QZC_ORDERS, QZC_TASKS, QZC_DOCUMENTS,
    QZS_ACCOUNTS, QZS_ACCT_ALERTS, QZS_ALTA, QZS_AUDIT, QZS_CALENDARS, QZS_CONTACTS, QZS_CPLS,
    QZS_DISBURSEMENTS, QZS_EVENTS, QZS_EXCEPTIONS, QZS_FEES, QZS_INTEGRATIONS, QZS_INVOICES,
    QZS_NOTIFICATIONS, QZS_OFFICES, QZS_PERMISSIONS, QZS_POSPAY, QZS_RECEIPTS,
    QZS_RECONCILIATIONS, QZS_REPORT_CATALOG, QZS_REPORT_FAVORITES, QZS_REPORT_KPIS,
    QZS_REPORT_MIX, QZS_REPORT_OFFICE_REVENUE, QZS_REPORT_PRODUCTIVITY, QZS_REPORT_ROWS,
    QZS_REPORT_SERIES, QZS_ROLES, QZS_SECURITY, QZS_TEMPLATES, QZS_USERS, QZS_WIRE_LOG
  ];

  const seen = new Set();
  const walk = function (node) {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    Object.keys(node).forEach(function (k) {
      const v = node[k];
      if (typeof v === 'string') {
        const shifted = qzShiftDateText(v);
        if (shifted !== v) node[k] = shifted;
      } else if (v && typeof v === 'object') {
        walk(v);
      }
    });
  };
  roots.forEach(walk);
}

function qzAddDaysISO(iso, n) {
  const p = String(iso || '').split('-');
  if (p.length !== 3) return iso;
  const d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/* Money never disburses on a weekend. */
function qzNextBusinessDay(iso) {
  let out = iso;
  for (let i = 0; i < 7; i++) {
    const p = String(out).split('-');
    if (p.length !== 3) return out;
    const day = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
    if (day !== 0 && day !== 6) return out;
    out = qzAddDaysISO(out, 1);
  }
  return out;
}

function qzEnrichOrder(o) {
  const parts = String(o.propertyAddress || '').split(',');
  const city = (parts[1] || '').trim();

  const openers   = qzStaffPool(['Processor', 'Escrow Officer', 'Virtual Assistant']);
  const closers   = qzStaffPool(['Closer', 'Title Examiner', 'Escrow Officer']);
  /* Counsel is engaged, not employed: attorneys live in the contacts
     directory as outside firms, which is where the two the system already
     knew about were sitting all along. */
  const attorneys = qzAttorneyPool();
  const assists   = qzStaffPool(['Processor', 'Virtual Assistant', 'Accounting']);
  const marketers = qzStaffPool(['Escrow Officer', 'Closer']);

  const branch = qzPick(QZ_BRANCHES, o.id, 'branch') || QZ_BRANCHES[0];
  const underwriter = qzPick(branch.underwriters, o.id, 'uw') || branch.underwriters[0];

  const isRefi = o.type === 'Refinance';
  const isCash = o.type === 'Cash';
  const financed = !!o.loanAmount && o.loanAmount > 0;

  /* A refinance of a primary residence carries the three-day right of
     rescission, so the money cannot fund on the day it signs. A purchase funds
     and disburses the same day. This is exactly the kind of difference a VA is
     meant to notice on a file, so the dates have to genuinely differ. */
  const funding = isRefi
    ? qzNextBusinessDay(qzAddDaysISO(o.closingDate, 3))
    : qzNextBusinessDay(o.closingDate);
  const disbursement = funding;

  /* Earnest money is a purchase concept. A refinance has no buyer and no
     earnest deposit, so showing $5,000 on one was simply wrong. Purchases carry
     1-3 % of the price, rounded the way a contract writes it. */
  let earnest = 0;
  if (!isRefi) {
    const pctBasis = 100 + (qzHashString(o.id + '|em') % 201); /* 1.00 % - 3.00 % */
    earnest = Math.round((o.purchasePrice || 0) * (pctBasis / 10000) / 500) * 500;
    if (earnest < 1000) earnest = 1000;
  }

  /* Source of business is whoever actually referred the file, so it is read off
     the order's own parties rather than drawn from an invented list. */
  const pl = (o.parties || []);
  const referrer = pl.find(function (p) { return p.role === 'Listing Agent'; })
    || pl.find(function (p) { return p.role === 'Selling Agent'; })
    || pl.find(function (p) { return p.role === 'Lender'; });
  const sourceOfBusiness = referrer
    ? referrer.name + (referrer.role === 'Lender' ? ' (Lender referral)' : ' (Agent referral)')
    : 'Repeat client — direct';

  const purpose = isRefi ? 'Refinance'
    : isCash ? 'Cash Purchase'
    : o.type === 'Commercial' ? 'Commercial Purchase'
    : 'Purchase';

  /* You represent the party who engaged you. On a refinance that is the
     borrower. */
  const representing = isRefi ? 'Borrower' : qzPick(['Buyer', 'Seller', 'Buyer', 'Buyer'], o.id, 'rep');

  /* TRID's Closing Disclosure applies to consumer mortgages. A cash deal or a
     commercial file settles on an ALTA statement instead. */
  const statementType = (financed && !isCash && o.type !== 'Commercial')
    ? 'Closing Disclosure (CD)'
    : 'ALTA Settlement Statement';

  const jacketPrefix = QZ_JACKET_PREFIX[underwriter] || 'XX-TX';
  const jacketNo = 400000 + (qzHashString(o.id + '|jkt') % 99999);

  /* Most residential closings have no unit number. The only ones that do are
     those whose street line already carries one. */
  const unitMatch = String(parts[0] || '').match(/(?:apt|unit|ste|#)\s*([\w-]+)/i);
  const aptSuite = unitMatch ? unitMatch[1] : '';

  const patch = {
    /* Dates */
    fundingDate: funding,
    disbursementDate: disbursement,
    /* Amounts */
    earnestAmount: earnest,
    /* Type and identifiers */
    purpose: purpose,
    representing: representing,
    statementType: statementType,
    /* Reporting. A refinance produces no seller proceeds, so no 1099-S. */
    sourceOfBusiness: sourceOfBusiness,
    eligible1099: !isRefi,
    underwriter: underwriter,
    policyJacket: jacketPrefix + '-' + jacketNo,
    /* Settlement team */
    settlementAgency: branch.agency,
    orderOpener: qzPick(openers, o.id, 'opener'),
    paralegal: qzPick(closers, o.id, 'closer'),
    attorney: qzPick(attorneys, o.id, 'atty'),
    assistants: qzPick(assists, o.id, 'asst'),
    marketers: qzPick(marketers, o.id, 'mktr'),
    /* Place of closing */
    aptSuite: aptSuite,
    county: QZ_COUNTY_BY_CITY[city] || '',
    /* Property and loan identifiers the Loan page was faking */
    propertyType: o.type === 'Commercial'
      ? qzPick(['Office Condominium', 'Retail Building', 'Mixed-Use Building'], o.id, 'ptype')
      : qzPick(['Single Family Residence', 'Single Family Residence', 'Townhouse', 'Condominium'], o.id, 'ptype'),
    loanPurpose: purpose,
    loanIdNumber: financed
      ? 'FCL-' + (1000 + (qzHashString(o.id + '|lid') % 8999)) + '-0' + (1 + (qzHashString(o.id) % 9))
      : '',
    /* Private mortgage insurance only exists above 80 % loan-to-value. */
    /* Figures the calculation pages used to print as constants: the same
       2.15 % tax rate, the same $135 HOA due and the same courier tracking
       number on all 75 files. They are per-order facts, so they are fields. */
    taxRatePct: (2.0 + (qzHashString(o.id + '|tax%') % 45) / 100).toFixed(2),
    hoaAssessment: ((qzHashString(o.id + '|hoa') % 3) > 0 && !isRefi)
      ? 40 + (qzHashString(o.id + '|dues') % 36) * 10 : 0,
    hoaCycle: qzPick(['Quarterly', 'Quarterly', 'Monthly', 'Annual'], o.id, 'cyc'),
    hoaPaidStatus: 'Paid in advance by Seller',
    escrowBank: 'Frost Bank (Escrow Trust — Operating)',
    earnestDepositDate: isRefi ? '' : qzAddDaysISO(o.opened, 2),
    earnestStatus: isRefi ? 'Not Yet Received' : 'Deposited & Cleared',
    commissionPct: isRefi ? 0 : (5 + (qzHashString(o.id + '|comm') % 2)),
    listingSplitPct: 50,
    commissionSource: isRefi ? '' : 'Paid from Seller proceeds at closing',
    /* A refinance pays off the existing loan; a purchase pays off the
       seller's. A cash purchase of an unencumbered property pays off nothing. */
    payoffLender: qzPick(['Summit Ridge Mortgage', 'Rocket Mortgage', 'Chase Home Lending', 'PennyMac Loan Services'], o.id, 'po'),
    payoffPrincipal: Math.round((o.purchasePrice || 0) * (0.45 + (qzHashString(o.id + '|po') % 30) / 100)),
    payoffRatePct: (4.5 + (qzHashString(o.id + '|rate') % 350) / 100).toFixed(3),
    payoffGoodThrough: qzAddDaysISO(o.closingDate, (qzHashString(o.id + '|gt') % 9) - 2),
    prepaymentPenalty: 0,
    releaseFee: 95,
    payoffWireFee: 30,
    proceedsVerified: 'Not yet verified',
    proceedsVerifiedBy: '',
    proceedsMethod: 'Wire',
    cplNumber: 'CPL-' + (90000 + (qzHashString(o.id + '|cpl') % 9999)),
    cplIssued: qzAddDaysISO(o.opened, 14),
    cplExpires: qzAddDaysISO(o.closingDate, 30),
    cplStatus: financed ? 'Issued & Delivered' : 'Not Required',
    ownerPolicyForm: 'T-1 Owner Policy',
    lenderPolicyForm: financed ? 'T-2 Loan Policy' : 'None — cash transaction',
    reissueCredit: 'No',
    commitmentEffective: qzAddDaysISO(o.opened, 10),
    estateType: 'Fee Simple',
    commitmentStatus: (o.stageIndex || 0) >= 2 ? 'Issued' : 'In preparation',
    finalPolicyNumber: (o.stageIndex || 0) >= 5 ? jacketPrefix + '-P-' + jacketNo : '',
    finalPolicyDate: (o.stageIndex || 0) >= 5 ? qzAddDaysISO(o.closingDate, 21) : '',
    finalPolicyStatus: (o.stageIndex || 0) >= 5 ? 'Issued' : 'Not yet issued',
    shipCarrier: (o.stageIndex || 0) >= 4 ? 'FedEx Priority Overnight' : 'Not yet shipped',
    shipTracking: (o.stageIndex || 0) >= 4
      ? String(7000 + (qzHashString(o.id + '|trk') % 2999)) + '-' + (1000 + (qzHashString(o.id + '|trk2') % 8999)) + '-' + (1000 + (qzHashString(o.id + '|trk3') % 8999))
      : '',
    shipRecipient: financed ? qzLenderFor(o) + ' · Post-Closing Intake' : '',
    shipDate: (o.stageIndex || 0) >= 4 ? qzAddDaysISO(o.closingDate, 1) : '',
    shipStatus: (o.stageIndex || 0) >= 5 ? 'Delivered & signed' : (o.stageIndex || 0) >= 4 ? 'In transit' : 'Not yet shipped',
    recordingMethod: 'e-Recording',
    recordingSubmitted: (o.stageIndex || 0) >= 4 ? qzAddDaysISO(o.closingDate, 1) : '',
    recordingInstrument: (o.stageIndex || 0) >= 5 ? 'D2' + (100000 + (qzHashString(o.id + '|rec') % 899999)) : '',
    recordingFee: qzFeeVary(85, o, 'deed') + (financed ? qzFeeVary(100, o, 'mtg') : 0),
    recordingStatus: (o.stageIndex || 0) >= 5 ? 'Accepted & recorded' : (o.stageIndex || 0) >= 4 ? 'Submitted' : 'Not yet submitted',
    erecordVendor: qzPick(['Simplifile', 'CSC eRecording', 'ePN'], o.id, 'ers'),
    erecordPackage: (o.stageIndex || 0) >= 4 ? 'PKG-' + (10000 + (qzHashString(o.id + '|pkg') % 89999)) : '',
    erecordStatus: (o.stageIndex || 0) >= 5 ? 'Recorded' : (o.stageIndex || 0) >= 4 ? 'Submitted' : 'Not submitted',
    underwriterAgencyNo: 'AG-' + (1000 + (qzHashString(branch.key) % 8999)),
    underwriterApprovalNeeded: (o.purchasePrice || 0) > 900000 ? 'Yes — over agency authority' : 'No',
    underwriterApprovalRef: '',
    esignProvider: qzPick(['DocuSign', 'DocuSign', 'Adobe Sign', 'Wet signature only'], o.id, 'esp'),
    esignEnvelope: (o.stageIndex || 0) >= 3 ? 'ENV-' + (100000 + (qzHashString(o.id + '|env') % 899999)) : '',
    esignSent: (o.stageIndex || 0) >= 3 ? qzAddDaysISO(o.closingDate, -2) : '',
    esignStatus: (o.stageIndex || 0) >= 4 ? 'Completed' : (o.stageIndex || 0) >= 3 ? 'Sent — awaiting signature' : 'Not sent',
    mortgageInsCaseNumber: (financed && o.loanAmount / (o.purchasePrice || 1) > 0.8)
      ? 'TX-' + (100 + (qzHashString(o.id + '|mic') % 899)) + '-' + (1000 + (qzHashString(o.id + '|mic2') % 8999))
      : ''
  };

  /* Never overwrite something the curriculum deliberately set. A lesson that
     depends on a value written in qualia-data.js has to keep winning.

     The one exception is the bare firm name. All 75 orders carried the literal
     'Best Closing Inc.', which is not a fact about any particular order but the
     absence of one, and it is precisely the sameness this widening exists to
     remove. A file belongs to the branch that opened it, so the generic value
     is upgraded to its branch while a genuinely specific one is left alone. */
  if (o.settlementAgency === 'Best Closing Inc.' && QZ_CURRICULUM_ORDERS.indexOf(o.id) < 0) {
    o.settlementAgency = patch.settlementAgency;
  }
  for (const k in patch) {
    if (o[k] === undefined || o[k] === null || o[k] === '') o[k] = patch[k];
  }
  return o;
}

function qzEnrichOrders(orders) {
  (orders || []).forEach(qzEnrichOrder);
  return orders;
}

/* ============================================================================
   CHARGE LINES — the settlement statement as data
   ============================================================================

   The ten Charges pages were built by a table of literals inside the renderer:

       'cd-a': () => [
         { desc: 'Application Fee', payee: 'Lender', amount: 350.00, ... },
         ...

   The same two-to-five lines for all 75 orders, scaled by price, painted into
   read-only cells. A VA could not add a fee, correct a payee, or move a charge
   from the borrower to the seller, which is most of what the job actually is.
   Charges is where an escrow assistant spends the day; it was the emptiest
   screen in the product.

   Lines now live in their own collection, keyed to an order, and the grid edits
   them. Generation is deterministic and driven by the order itself, so a cash
   purchase carries no origination charges, a refinance has no sale price and no
   broker commission, and the recording fee is payable to the clerk of the
   county the property is actually in.
   ============================================================================ */

const QZ_CHARGE_SECTIONS = ['A', 'B', 'C', 'E', 'F', 'G', 'H', 'J', 'KM', 'LN'];

/* Section key on the order tab -> section letter in the collection. */
const QZ_TAB_TO_SECTION = {
  'cd-a': 'A', 'accounting': 'B', 'cd-c': 'C', 'cd-e': 'E', 'cd-f': 'F',
  'cd-g': 'G', 'cd-h': 'H', 'cd-j': 'J', 'cd-km': 'KM', 'cd-ln': 'LN'
};

/* Vary a base fee by a few percent per order, rounded to the nearest $5, so two
   files do not quote an identical survey fee to the cent. Deterministic. */
function qzFeeVary(base, o, salt) {
  const swing = 0.85 + (qzHashString(o.id + '|' + salt) % 31) / 100; /* 0.85 - 1.15 */
  return Math.round(base * swing / 5) * 5;
}
function qzPickFor(o, salt, list) { return qzPick(list, o.id, salt); }

const QZ_PEST_CO    = ['Ace Home Inspections', 'Lone Star Pest & Termite', 'Guardian Property Inspections', 'BrightPath Home Services'];
const QZ_SURVEY_CO  = ['Precision Land Surveying', 'Trinity Metes & Bounds', 'North Texas Survey Group', 'Benchmark Land Services'];
const QZ_INSURE_CO  = ['State Farm', 'Allstate', 'Travelers', 'Chubb Personal Risk', 'Germania Insurance'];
const QZ_WARRANTY   = ['Choice Home Warranty', 'American Home Shield', 'Old Republic Home Protection'];
const QZ_APPRAISAL  = ['Cornerstone Appraisal Group', 'Metroplex Valuation Services', 'Sterling Appraisal Co.'];
const QZ_HOA_MGMT   = ['FirstService Residential', 'Goodwin & Company', 'CMA Management', 'Real Manage'];

/* The clerk who records the deed is the clerk of the county the land is in.
   Every order used to pay Collin County regardless of where the house was. */
function qzClerkFor(o) {
  return (o.county ? o.county.replace(/ County$/, '') : 'County') + ' County Clerk';
}
function qzLenderFor(o) {
  const p = (o.parties || []).find(function (x) { return x.role === 'Lender'; });
  return p ? p.name : 'Lender';
}

/* Build one section's lines for one order. Returns [] where a section does not
   apply, which is itself information: an empty Section A on a cash purchase is
   correct, and a VA should see that rather than three invented loan fees. */
function qzGenChargeLines(o, section) {
  const L = [];
  const financed = !!o.loanAmount && o.loanAmount > 0;
  const isRefi = o.type === 'Refinance';
  const price = o.purchasePrice || 0;
  const add = function (description, payee, col, amount) {
    if (amount == null || isNaN(amount)) return;
    const row = { description: description, payee: payee,
      borrowerAt: 0, borrowerBefore: 0, sellerAt: 0, sellerBefore: 0, byOthers: 0 };
    row[col] = Math.round(amount * 100) / 100;
    L.push(row);
  };

  if (section === 'A') {
    if (!financed) return L;   /* no loan, no origination charges */
    const pts = (qzHashString(o.id + '|pts') % 4) * 0.25;   /* 0, .25, .5, .75 */
    if (pts > 0) add(pts.toFixed(2) + ' % of Loan Amount (Points)', qzLenderFor(o), 'borrowerAt', o.loanAmount * pts / 100);
    add('Application Fee', qzLenderFor(o), 'borrowerBefore', qzFeeVary(350, o, 'app'));
    add('Underwriting Fee', qzLenderFor(o), 'borrowerAt', qzFeeVary(795, o, 'uw'));
    add('Loan Origination Fee', qzLenderFor(o), 'borrowerAt', qzFeeVary(o.loanAmount * 0.005, o, 'orig'));
  }

  if (section === 'B') {
    /* Services the borrower could not shop for. Without a loan there is no
       lender ordering an appraisal or a flood determination. */
    add('Title &mdash; Settlement or Closing Fee', o.settlementAgency, 'borrowerAt', qzFeeVary(price * 0.0014, o, 'settle'));
    add("Title &mdash; Lender's Title Policy", o.underwriter, 'borrowerAt', financed ? qzFeeVary(o.loanAmount * 0.0043, o, 'lpol') : null);
    if (financed) {
      add('Appraisal Fee', qzPickFor(o, 'apr', QZ_APPRAISAL), 'borrowerBefore', qzFeeVary(575, o, 'apr$'));
      add('Credit Report Fee', qzLenderFor(o), 'borrowerBefore', qzFeeVary(65, o, 'cr'));
      add('Flood Determination Fee', 'CoreLogic Flood Services', 'borrowerAt', qzFeeVary(25, o, 'fl'));
      add('Tax Service Fee', qzLenderFor(o), 'borrowerAt', qzFeeVary(85, o, 'tax'));
    }
    if (o.inspectionCharge) add('Home Inspection Fee', qzPickFor(o, 'pest', QZ_PEST_CO), 'borrowerBefore', o.inspectionCharge);
  }

  if (section === 'C') {
    if (!isRefi) add('Pest Inspection Fee', qzPickFor(o, 'pest', QZ_PEST_CO), 'borrowerBefore', qzFeeVary(125, o, 'pest$'));
    add('Survey Fee', qzPickFor(o, 'srv', QZ_SURVEY_CO), 'borrowerBefore', qzFeeVary(640, o, 'srv$'));
    add('Title &mdash; Closing Protection Letter', o.underwriter, 'borrowerAt', 50);
    add('Title &mdash; Settlement Agent Fee', o.settlementAgency, 'borrowerAt', qzFeeVary(595, o, 'sa'));
    add('Title &mdash; Title Examination Fee', o.settlementAgency, 'borrowerAt', qzFeeVary(150, o, 'exam'));
  }

  if (section === 'E') {
    const deed = qzFeeVary(85, o, 'deed');
    const mtg = financed ? qzFeeVary(100, o, 'mtg') : 0;
    add('Recording Fees (Deed: ' + fmtMoney(deed) + (financed ? ', Mortgage: ' + fmtMoney(mtg) : '') + ')',
        qzClerkFor(o), 'borrowerAt', deed + mtg);
    /* Texas levies no real estate transfer tax. The line stays visible at zero,
       because its absence is a thing a VA is asked about. */
    add('Transfer Taxes', 'State of Texas (none levied)', 'borrowerAt', 0);
  }

  if (section === 'F') {
    if (!isRefi || financed) {
      add("Homeowner's Insurance Premium (12 mo)", qzPickFor(o, 'ins', QZ_INSURE_CO), 'borrowerBefore', qzFeeVary(1680, o, 'ins$'));
    }
    if (financed) {
      const daily = Math.round(o.loanAmount * 0.06375 / 365 * 100) / 100;
      const days = 3 + (qzHashString(o.id + '|days') % 26);
      add('Prepaid Interest (' + fmtMoney(daily) + '/day for ' + days + ' days)', qzLenderFor(o), 'borrowerAt', daily * days);
    }
  }

  if (section === 'G') {
    if (!financed) return L;   /* no lender, no escrow account to fund */
    const insMo = Math.round(qzFeeVary(1680, o, 'ins$') / 12);
    const taxMo = Math.round(price * 0.021 / 12);
    add("Homeowner's Insurance (" + fmtMoney(insMo) + '/mo for 2 mo)', 'Lender Escrow Account', 'borrowerAt', insMo * 2);
    add('Property Taxes (' + fmtMoney(taxMo) + '/mo for 2 mo)', 'Lender Escrow Account', 'borrowerAt', taxMo * 2);
    add('Aggregate Adjustment', 'Lender Escrow Account', 'borrowerAt', -qzFeeVary(180, o, 'agg'));
  }

  if (section === 'H') {
    const hasHoa = (qzHashString(o.id + '|hoa') % 3) > 0;
    if (hasHoa && !isRefi) add('HOA Capital Contribution', qzPickFor(o, 'hoa', QZ_HOA_MGMT), 'borrowerAt', qzFeeVary(350, o, 'hoa$'));
    if (!isRefi) {
      add('Home Warranty Plan', qzPickFor(o, 'war', QZ_WARRANTY), 'sellerAt', qzFeeVary(625, o, 'war$'));
      add("Title &mdash; Owner's Title Policy (optional)", o.underwriter, 'sellerAt', qzFeeVary(price * 0.0057, o, 'opol'));
    }
  }

  if (section === 'J') {
    /* A total is a total. It is summed from the sections it totals rather than
       typed, which is why these two rows are the only ones the grid refuses to
       let you edit. */
    return L;
  }

  if (section === 'KM') {
    if (isRefi) {
      add('Payoff of Existing Loan', 'Existing Lender', 'borrowerAt', Math.round(price * 0.58));
      add('Principal Amount of New Loan', qzLenderFor(o), 'borrowerBefore', o.loanAmount || 0);
    } else {
      add('Sale Price of Property', 'Seller', 'borrowerAt', price);
      add('Deposit / Earnest Money Already Paid', o.settlementAgency + ' Escrow', 'borrowerBefore', o.earnestAmount || 0);
      if (financed) add('Principal Amount of New Loan', qzLenderFor(o), 'borrowerBefore', o.loanAmount);
    }
  }

  if (section === 'LN') {
    /* A refinance has no seller, so there is no seller summary to draw. */
    if (isRefi) return L;
    add('Sale Price of Property (Due to Seller)', 'Seller Gross', 'sellerAt', price);
    const payoff = Math.round(price * (0.45 + (qzHashString(o.id + '|po') % 30) / 100));
    add('Payoff of First Mortgage Loan', qzPickFor(o, 'po', ['Summit Ridge Mortgage', 'Rocket Mortgage', 'Chase Home Lending', 'PennyMac Loan Services']), 'sellerAt', payoff);
    const rate = 5 + (qzHashString(o.id + '|comm') % 2);   /* 5 % or 6 % */
    add('Total Real Estate Broker Commissions (' + rate + '%)', 'Listing & Selling Brokers', 'sellerAt', Math.round(price * rate / 100));
  }

  return L;
}

/* Materialise every line for every order into the collection. Runs once at
   hydrate, so an F5 restores the generated statement exactly. */
function qzBuildChargeLines(orders) {
  const out = [];
  let n = 0;
  (orders || []).forEach(function (o) {
    QZ_CHARGE_SECTIONS.forEach(function (sec) {
      qzGenChargeLines(o, sec).forEach(function (row, i) {
        out.push(Object.assign({
          id: 'chg-' + (++n),
          orderId: o.id,
          section: sec,
          lineNo: i + 1
        }, row));
      });
    });
  });
  return out;
}

/* ============================================================================
   THE MONEY, ATTACHED TO THE ORDER IT BELONGS TO
   ============================================================================

   Accounting and the order file were two separate worlds. 30 receipts, 30
   disbursements and 15 invoices existed, all of them naming one of three
   orders; the other 72 files had no money at all. The order ledger was empty
   for all 75, because ledgerLines held zero rows, while Accounting showed a
   balance by falling back to a literal:

       ${fmtMoney(totalReceipts || 5000)}

   So the escrow balance a trainee read was $5,000 on every order, whether or
   not a cent had ever been received.

   Three things happen here.

   1. Every money record carries orderId, one name for the relationship. The
      collections that genuinely are not per-order keep their own shape and are
      documented below rather than given a fake key.

   2. The money spreads across the open portfolio instead of piling onto three
      files, so opening a random order shows a real escrow position.

   3. ledgerLines is generated FROM the receipts and disbursements rather than
      written alongside them, which is what makes the ledger and the balance
      agree by construction. A ledger that can disagree with its own receipts
      is worse than no ledger, because it teaches a VA to trust a number that
      is wrong.

   WHAT DELIBERATELY HAS NO orderId

     reconciliations  a bank reconciliation is an account and a period, not a
                      file. Jul 2026 on the trust account covers every order at
                      once.
     pospay           a positive-pay file is a batch sent to the bank. It spans
                      orders by nature, so it references its disbursements
                      instead.
     notifications    these are the user's alert preferences. They were never
                      about an order.
   ============================================================================ */

/* Orders that can carry money: anything opened, plus closed files that
   obviously settled. Cancelled files never funded. */
function qzFundedOrders(orders) {
  return (orders || []).filter(function (o) { return o.status === 'Open' || o.status === 'Closed'; });
}

/* Receipts a file would really have: the earnest deposit, the lender's wire on
   a financed deal, and the buyer's cash to close. */
function qzGenReceiptsFor(o, seq) {
  const out = [];
  const financed = !!o.loanAmount && o.loanAmount > 0;
  const isRefi = o.type === 'Refinance';
  const buyer = (o.parties || []).find(function (p) { return p.role === 'Buyer' || p.role === 'Borrower'; });
  const lender = (o.parties || []).find(function (p) { return p.role === 'Lender'; });
  const push = function (payer, method, amount, status, dayOffset, kind) {
    if (!amount || amount <= 0) return;
    out.push({
      id: 'R-' + (30000 + seq * 10 + out.length),
      num: 'R-' + (30000 + seq * 10 + out.length),
      orderId: o.id,
      order: o.id,
      date: qzAddDaysISO(o.closingDate, dayOffset),
      payer: payer, method: method,
      amount: Math.round(amount * 100) / 100,
      status: status,
      kind: kind,
      by: o.orderOpener
    });
  };

  if (!isRefi && o.earnestAmount) {
    push(buyer ? buyer.name : 'Buyer', 'Wire', o.earnestAmount, 'Cleared', -30, 'earnest');
  }
  if (financed) {
    push(lender ? lender.name : 'Lender', 'Wire', o.loanAmount,
         o.status === 'Closed' ? 'Cleared' : 'Pending', -1, 'loan');
  }
  /* Cash to close: what the buyer still owes after the loan and the deposit. */
  if (!isRefi) {
    const costs = qzChargeTotals(o.id, 'B').borrowerAt + qzChargeTotals(o.id, 'C').borrowerAt +
                  qzChargeTotals(o.id, 'E').borrowerAt + qzChargeTotals(o.id, 'F').borrowerAt +
                  qzChargeTotals(o.id, 'G').borrowerAt + qzChargeTotals(o.id, 'A').borrowerAt;
    const cash = (o.purchasePrice || 0) + costs - (o.loanAmount || 0) - (o.earnestAmount || 0);
    push(buyer ? buyer.name : 'Buyer', qzPick(['Wire', 'Wire', 'Cashier Check'], o.id, 'ctc'), cash,
         o.status === 'Closed' ? 'Cleared' : 'Pending', 0, 'cash-to-close');
  }
  return out;
}

/* Disbursements: the payees on the statement actually get paid. */
function qzGenDisbursementsFor(o, seq) {
  const out = [];
  const push = function (payee, method, amount, status, memo) {
    if (!amount || amount <= 0) return;
    out.push({
      id: 'CK-' + (20000 + seq * 20 + out.length),
      num: (method === 'Wire' ? 'W-' : 'CK-') + (20000 + seq * 20 + out.length),
      orderId: o.id,
      order: o.id,
      date: o.disbursementDate || o.closingDate,
      payee: payee, method: method,
      amount: Math.round(amount * 100) / 100,
      status: status,
      memo: memo || '',
      by: o.paralegal || '—'
    });
  };
  const settled = o.status === 'Closed';

  /* Seller-side payoff and commission are the two big wires on a purchase. */
  qzChargeLines(o.id, 'LN').forEach(function (l) {
    const amt = Number(l.sellerAt) || 0;
    if (amt > 0 && !/Sale Price/.test(l.description)) {
      push(l.payee, amt > 50000 ? 'Wire' : 'Check', amt,
           settled ? 'Cleared' : 'Pending Approval', l.description);
    }
  });
  /* Third-party fees on the borrower side that leave the escrow account. */
  qzChargeLines(o.id, 'C').forEach(function (l) {
    const amt = Number(l.borrowerAt) || 0;
    if (amt > 0) push(l.payee, 'Check', amt, settled ? 'Cleared' : 'Scheduled', l.description);
  });
  qzChargeLines(o.id, 'E').forEach(function (l) {
    const amt = Number(l.borrowerAt) || 0;
    if (amt > 0) push(l.payee, 'Check', amt, settled ? 'Cleared' : 'Scheduled', l.description);
  });
  return out;
}

/* ---------- the ledger ----------
   Built from the receipts and disbursements, in date order, with a running
   balance. Nothing here is invented: every line points at the record that
   caused it, so a trainee can click from the ledger to the receipt. */
function qzBuildLedgerFor(orderId, receipts, disbursements) {
  const rows = [];
  receipts.forEach(function (r) {
    rows.push({
      orderId: orderId, date: r.date, ref: r.num, party: r.payer,
      type: r.kind === 'earnest' ? 'Earnest Money Deposit'
          : r.kind === 'loan' ? 'Loan Funding'
          : 'Cash to Close',
      credit: r.amount, debit: 0, status: r.status, sourceId: r.id, sourceColl: 'receipts'
    });
  });
  disbursements.forEach(function (d) {
    rows.push({
      orderId: orderId, date: d.date, ref: d.num, party: d.payee,
      type: 'Disbursement', credit: 0, debit: d.amount,
      status: d.status, sourceId: d.id, sourceColl: 'disbursements', memo: d.memo
    });
  });
  /* A record that is already void arrives with its debit intact, because the
     money did leave and then came back. The ledger has to say both things: the
     original line and its reversal. Posting only the debit is what made the
     running balance disagree with the escrow position by the voided amount. */
  const voids = [];
  rows.forEach(function (r) {
    if (String(r.status) !== 'Void') return;
    voids.push({
      orderId: orderId, date: r.date, ref: 'VOID ' + r.ref, party: r.party,
      type: 'Void of ' + r.type, credit: r.debit || 0, debit: r.credit || 0,
      status: 'Void', sourceId: r.sourceId, sourceColl: r.sourceColl,
      memo: r.memo || 'Reversed'
    });
  });
  voids.forEach(function (v) { rows.push(v); });

  rows.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
  let bal = 0;
  rows.forEach(function (r, i) {
    bal += (r.credit || 0) - (r.debit || 0);
    r.balance = Math.round(bal * 100) / 100;
    r.id = 'led-' + orderId + '-' + (i + 1);
    r.lineNo = i + 1;
  });
  return rows;
}

/* The escrow position of a file, derived — never stored, never faked. */
function qzOrderEscrow(orderId) {
  const rec = qzList('receipts').filter(function (r) { return r.orderId === orderId; });
  const dis = qzList('disbursements').filter(function (d) { return d.orderId === orderId && d.status !== 'Void'; });
  const totalIn = rec.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0);
  const totalOut = dis.reduce(function (s, d) { return s + (Number(d.amount) || 0); }, 0);
  return {
    receipts: rec, disbursements: dis,
    totalIn: Math.round(totalIn * 100) / 100,
    totalOut: Math.round(totalOut * 100) / 100,
    balance: Math.round((totalIn - totalOut) * 100) / 100
  };
}

/* ---------- generation at hydrate ---------- */

function qzBuildMoney(seed) {
  const funded = qzFundedOrders(seed.orders);

  /* The three curriculum orders keep the records the lessons were written
     against; those rows are re-keyed, not replaced. */
  const CURRICULUM = ['ORD-2026-1483', 'ORD-2026-1512', 'ORD-2026-1398'];
  const reKey = function (list, field) {
    (list || []).forEach(function (row) {
      if (row.order && !row.orderId) row.orderId = row.order;
    });
    return list;
  };
  reKey(seed.receipts); reKey(seed.disbursements); reKey(seed.invoices);

  /* Every other funded order gets its own money. */
  let seq = 0;
  funded.forEach(function (o) {
    if (CURRICULUM.indexOf(o.id) > -1) return;
    seq++;
    /* Not every open file has funded yet; the ones still in title work
       legitimately show only the earnest deposit. */
    const stage = o.stageIndex || 0;
    const rs = qzGenReceiptsFor(o, seq).filter(function (r) {
      return stage >= 3 || r.kind === 'earnest';
    });
    const ds = stage >= 3 ? qzGenDisbursementsFor(o, seq) : [];
    rs.forEach(function (r) { seed.receipts.push(r); });
    ds.forEach(function (d) { seed.disbursements.push(d); });
  });

  /* Ledger last, so it sees every receipt and disbursement that exists. */
  seed.ledgerLines = [];
  const byOrder = {};
  seed.receipts.forEach(function (r) { (byOrder[r.orderId] = byOrder[r.orderId] || { r: [], d: [] }).r.push(r); });
  seed.disbursements.forEach(function (d) { (byOrder[d.orderId] = byOrder[d.orderId] || { r: [], d: [] }).d.push(d); });
  Object.keys(byOrder).forEach(function (oid) {
    if (!oid || oid === 'undefined') return;
    qzBuildLedgerFor(oid, byOrder[oid].r, byOrder[oid].d)
      .forEach(function (row) { seed.ledgerLines.push(row); });
  });

  /* Invoices spread over the funded portfolio instead of stacking on three
     files, and each one names the order it bills for. */
  (seed.invoices || []).forEach(function (inv, i) {
    if (i < CURRICULUM.length) return;   /* the three the lessons read */
    const o = funded[(i * 7 + 5) % funded.length];
    inv.orderId = o.id; inv.order = o.id;
  });

  let invSeq = 1000;
  funded.forEach(function (o) {
    if (CURRICULUM.indexOf(o.id) > -1) return;
    const hasInv = (seed.invoices || []).some(function (inv) { return inv.orderId === o.id; });
    if (!hasInv) {
      const invNum = 'INV-2026-' + (++invSeq);
      const isPaid = (qzHashString(o.id + '|invp') % 3) !== 0;
      const amt = 250 + (qzHashString(o.id + '|inva') % 15) * 50;
      seed.invoices.push({
        id: 'inv-' + invSeq,
        orderId: o.id,
        order: o.id,
        num: invNum,
        billTo: (o.parties && o.parties[0]) ? o.parties[0].name : 'First American Title Co.',
        issued: qzAddDaysISO(o.opened, 5),
        due: qzAddDaysISO(o.closingDate, -2),
        amount: amt,
        balance: isPaid ? 0 : amt,
        status: isPaid ? 'Paid' : (o.closingDate < QZ_TODAY ? 'Past Due' : 'Issued')
      });
    }
  });

  /* A calendar entry that belongs to nobody's file cannot be navigated from
     the order it concerns. Signings, funding dates and recording deadlines all
     belong to one. */
  (seed.events || []).forEach(function (ev, i) {
    if (ev.orderId) return;
    const o = funded[(i * 11 + 3) % funded.length];
    ev.orderId = o.id;
  });

  /* CPLs and wire logs already named their order in prose; give them the key. */
  (seed.cpls || []).forEach(function (c) { if (!c.orderId && c.order) c.orderId = c.order; });
  (seed.wireLog || []).forEach(function (w) { if (!w.orderId && w.order) w.orderId = w.order; });

  /* A positive-pay file is a batch sent to the bank, so it references the
     disbursements it covers rather than pretending to belong to one order. */
  (seed.pospay || []).forEach(function (p, i) {
    if (p.disbursementIds) return;
    const pool = seed.disbursements.filter(function (d) { return d.method === 'Check'; });
    p.disbursementIds = pool.slice(i * 3, i * 3 + (p.items || 3)).map(function (d) { return d.id; });
  });

  return seed;
}

/* ---------- posting from the UI ---------- */

/* Appends a ledger line for a disbursement recorded through the Payments
   panel, keeping the running balance correct. */
function qzPostLedgerForDisbursement(d) {
  if (!d || !d.orderId) return;
  const existing = qzList('ledgerLines')
    .filter(function (l) { return l.orderId === d.orderId; })
    .sort(function (a, b) { return (a.lineNo || 0) - (b.lineNo || 0); });
  const prev = existing.length ? existing[existing.length - 1].balance : 0;
  qzInsert('ledgerLines', {
    orderId: d.orderId, date: d.date, ref: d.num || d.id, party: d.payee,
    type: 'Disbursement', credit: 0, debit: d.amount,
    balance: Math.round((prev - d.amount) * 100) / 100,
    lineNo: existing.length + 1,
    status: d.status, sourceId: d.id, sourceColl: 'disbursements', memo: d.memo
  });
}

function qzPostLedgerForReceipt(r) {
  if (!r || !r.orderId) return;
  const existing = qzList('ledgerLines')
    .filter(function (l) { return l.orderId === r.orderId; })
    .sort(function (a, b) { return (a.lineNo || 0) - (b.lineNo || 0); });
  const prev = existing.length ? existing[existing.length - 1].balance : 0;
  qzInsert('ledgerLines', {
    orderId: r.orderId, date: r.date, ref: r.num || r.id, party: r.payer,
    type: r.kind === 'earnest' ? 'Earnest Money Deposit' : 'Receipt',
    credit: r.amount, debit: 0,
    balance: Math.round((prev + r.amount) * 100) / 100,
    lineNo: existing.length + 1,
    status: r.status, sourceId: r.id, sourceColl: 'receipts'
  });
}

/* ---------- voiding, which is daily work in escrow ---------- */

/* A receipt captured wrong is not deleted. It is voided, and the void stays
   visible: an escrow account that can lose a row silently is an escrow account
   nobody can reconcile. */
function qzVoidMoneyRecord(coll, id, reason) {
  const rec = qzFind(coll, id);
  if (!rec) return;
  if (rec.status === 'Void') { simToast('That record is already void.'); return; }
  if (!reason || String(reason).trim().length < 5) {
    simToast('A void needs a written reason. It has to survive an audit.');
    return;
  }
  qzUpdate(coll, id, { status: 'Void', voidReason: String(reason).trim(), voidedOn: QZ_TODAY });
  /* Reverse it in the ledger rather than removing the original line. */
  const led = qzList('ledgerLines').find(function (l) { return l.sourceId === id; });
  if (led) {
    const rows = qzList('ledgerLines')
      .filter(function (l) { return l.orderId === led.orderId; })
      .sort(function (a, b) { return (a.lineNo || 0) - (b.lineNo || 0); });
    const prev = rows.length ? rows[rows.length - 1].balance : 0;
    const delta = (led.debit || 0) - (led.credit || 0);
    qzInsert('ledgerLines', {
      orderId: led.orderId, date: QZ_TODAY, ref: 'VOID ' + led.ref, party: led.party,
      type: 'Void of ' + led.type, credit: led.debit || 0, debit: led.credit || 0,
      balance: Math.round((prev + delta) * 100) / 100,
      lineNo: rows.length + 1, status: 'Void', sourceId: id, sourceColl: coll,
      memo: String(reason).trim()
    });
  }
  simToast('Voided. The reversal is on the ledger.', { tone: 'good' });
  qzRenderRoot();
}

function qzVoidMoneyModal(coll, id) {
  const rec = qzFind(coll, id);
  if (!rec) return;
  const label = coll === 'receipts' ? 'Receipt' : coll === 'disbursements' ? 'Disbursement' : 'Invoice';
  const old = document.getElementById('qzVoidModal');
  if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = 'qzVoidModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML =
    '<div class="qz-modal-card" style="max-width:460px">' +
      '<div class="ph"><h4>Void ' + esc(label) + ' &mdash; ' + esc(rec.num || rec.id) + '</h4>' +
      '<button class="qz-btn sm" onclick="document.getElementById(\'qzVoidModal\').remove()">&times;</button></div>' +
      '<p class="qz-note">' + fmtMoney(rec.amount || 0) + ' &middot; ' +
        esc(rec.payer || rec.payee || rec.billTo || '') + '. Voiding does not delete the record: ' +
        'it posts a reversing line so the ledger still reconciles.</p>' +
      '<div class="qz-field wide"><label for="qzVoidReason">Reason</label>' +
        '<textarea id="qzVoidReason" rows="2" placeholder="e.g. wire returned by the receiving bank"></textarea></div>' +
      '<div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">' +
        '<button class="qz-btn" onclick="document.getElementById(\'qzVoidModal\').remove()">Cancel</button>' +
        '<button class="qz-btn primary" onclick="qzConfirmVoid(\'' + escAttr(coll) + '\', \'' + escAttr(id) + '\')">Void it</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);
}

function qzConfirmVoid(coll, id) {
  const reason = (document.getElementById('qzVoidReason') || {}).value || '';
  if (!reason.trim() || reason.trim().length < 5) {
    simToast('A void needs a written reason. It has to survive an audit.');
    return;
  }
  const m = document.getElementById('qzVoidModal');
  if (m) m.remove();
  qzVoidMoneyRecord(coll, id, reason);
}

/* ============================================================================
   EXPORT — a file that actually arrives
   ============================================================================

   The shell answered every Export button with:

       simToast('CSV export generated and downloaded.', { tone: 'good' });

   Nothing was generated and nothing was downloaded. A toast that describes an
   event which did not happen is worse than a disabled button, because a VA
   learns to trust the confirmation instead of checking the folder.

   These build a real CSV in memory and hand it to the browser.
   ============================================================================ */

/* RFC 4180: quote everything, double any embedded quote. Descriptions on a
   settlement statement routinely contain commas. */
function qzCsvCell(v) {
  const s = String(v == null ? '' : v).replace(/&mdash;/g, '-').replace(/&middot;/g, '-');
  return '"' + s.replace(/"/g, '""') + '"';
}
function qzCsvRows(rows) {
  return rows.map(function (r) { return r.map(qzCsvCell).join(','); }).join('\r\n');
}

function qzDownloadCSV(filename, rows) {
  const csv = qzCsvRows(rows);
  try {
    /* The BOM is what makes Excel open UTF-8 correctly on Windows, which is
       where these files are going to be opened. */
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    simToast(filename + ' downloaded (' + (rows.length - 1) + ' rows).', { tone: 'good' });
  } catch (e) {
    /* If the browser refuses the download, say so rather than claiming success. */
    simToast('This browser blocked the download. Nothing was saved.');
  }
}

function qzExportLedgerCSV(orderId) {
  const led = qzList('ledgerLines')
    .filter(function (l) { return l.orderId === orderId; })
    .sort(function (a, b) { return (a.lineNo || 0) - (b.lineNo || 0); });
  if (!led.length) { simToast('There is nothing on this ledger to export yet.'); return; }
  const rows = [['Date', 'Reference', 'Party', 'Type', 'Debit', 'Credit', 'Balance', 'Status', 'Memo']];
  led.forEach(function (l) {
    rows.push([l.date, l.ref, l.party, l.type,
      l.debit ? l.debit.toFixed(2) : '', l.credit ? l.credit.toFixed(2) : '',
      (l.balance || 0).toFixed(2), l.status, l.memo || '']);
  });
  qzDownloadCSV('ledger-' + orderId + '.csv', rows);
}

function qzExportChargesCSV(orderId, section) {
  const lines = qzChargeLines(orderId, section);
  if (!lines.length) { simToast('This section has no lines to export.'); return; }
  const rows = [['Line', 'Description', 'Payee', 'Borrower at closing', 'Borrower before closing',
                 'Seller at closing', 'Seller before closing', 'By others']];
  lines.forEach(function (l) {
    rows.push([l.lineNo, l.description, l.payee,
      (l.borrowerAt || 0).toFixed(2), (l.borrowerBefore || 0).toFixed(2),
      (l.sellerAt || 0).toFixed(2), (l.sellerBefore || 0).toFixed(2), (l.byOthers || 0).toFixed(2)]);
  });
  qzDownloadCSV('charges-' + orderId + '-section-' + section + '.csv', rows);
}

/* The shell's generic Export button, now told which table it is looking at. */
function qzExportTableCSV(what) {
  const map = {
    'orders':        { coll: 'orders',        cols: ['id', 'titleNumber', 'propertyAddress', 'type', 'status', 'closingDate', 'purchasePrice', 'settlementAgency', 'paralegal'] },
    'receipts':      { coll: 'receipts',      cols: ['num', 'orderId', 'date', 'payer', 'method', 'amount', 'status'] },
    'disbursements': { coll: 'disbursements', cols: ['num', 'orderId', 'date', 'payee', 'method', 'amount', 'status'] },
    'invoices':      { coll: 'invoices',      cols: ['num', 'orderId', 'billTo', 'issued', 'due', 'amount', 'balance', 'status'] },
    'contacts':      { coll: 'contacts',      cols: ['name', 'type', 'company', 'email', 'phone'] },
    'vendors':       { coll: 'vendors',       cols: ['name', 'orderId', 'service', 'status'] },
    'tasks':         { coll: 'tasks',         cols: ['id', 'orderId', 'title', 'taskGroup', 'due', 'status', 'assignee'] },
    'documents':     { coll: 'documents',     cols: ['id', 'orderId', 'name', 'type', 'status'] }
  };
  const spec = map[what];
  if (!spec) { simToast('There is no table here to export.'); return; }
  const list = qzList(spec.coll);
  if (!list.length) { simToast('That table is empty.'); return; }
  const rows = [spec.cols.slice()];
  list.forEach(function (r) { rows.push(spec.cols.map(function (c) { return r[c]; })); });
  qzDownloadCSV(what + '-export.csv', rows);
}

/* ============================================================================
   PARAMETERISED DOCUMENTS — the paperwork a VA has to actually read
   ============================================================================

   Nine of 220 documents opened. The other 211 were rows with a name and a
   status, and the single most important habit in this job — open the source and
   read what it really says — worked on four per cent of the file.

   Writing one HTML file per document would mean hundreds of near-identical
   files. Instead each document type is a template that draws from the order it
   belongs to, so the deed on order 1449 names the parties on order 1449 and
   quotes its own legal description. That also makes the documents useful for
   verification practice: they agree with the file, so a discrepancy is a real
   discrepancy rather than template drift.

   The rendered page is handed to the existing viewer as a blob URL, because
   sim-engine.js owns the modal and points an iframe at whatever it is given.
   ============================================================================ */

function qzDocParty(o, role) {
  const p = (o.parties || []).find(function (x) { return x.role === role; });
  return p || null;
}
function qzDocPartyName(o, role, fallback) {
  const p = qzDocParty(o, role);
  return p ? p.name : (fallback || '—');
}
function qzDocRow(label, value) {
  return '<div class="row"><span class="l">' + label + '</span><span class="f">' + (value == null || value === '' ? '&mdash;' : value) + '</span></div>';
}

const QZ_DOC_TEMPLATES = {

  'Purchase Agreement': function (o) {
    return '<h2 class="sec">Parties</h2>' +
      qzDocRow('Buyer', esc(qzDocPartyName(o, 'Buyer'))) +
      qzDocRow('Seller', esc(qzDocPartyName(o, 'Seller'))) +
      '<h2 class="sec">Property</h2>' +
      qzDocRow('Address', esc(o.propertyAddress)) +
      qzDocRow('Legal description', esc(o.legalDescription || '')) +
      qzDocRow('County', esc(o.county)) +
      '<h2 class="sec">Price and terms</h2>' +
      qzDocRow('Purchase price', fmtMoney(o.purchasePrice)) +
      qzDocRow('Earnest money', o.earnestAmount ? fmtMoney(o.earnestAmount) : 'None') +
      qzDocRow('Financing', o.loanAmount ? fmtMoney(o.loanAmount) + ' conventional' : 'All cash, no financing contingency') +
      qzDocRow('Closing date', fmtDate(o.closingDate)) +
      '<p class="clause">Time is of the essence. Should the Buyer fail to close on the date stated above, ' +
      'the earnest money shall be subject to the default provisions of paragraph 15.</p>';
  },

  'Source Deed': function (o) {
    return '<h2 class="sec">Grant</h2>' +
      '<p class="clause">That the Grantor, for and in consideration of the sum of TEN DOLLARS ($10.00) ' +
      'and other good and valuable consideration, the receipt of which is hereby acknowledged, does ' +
      'GRANT, SELL AND CONVEY unto the Grantee the property described below.</p>' +
      qzDocRow('Grantor', esc(qzDocPartyName(o, 'Seller'))) +
      qzDocRow('Grantee', esc(qzDocPartyName(o, 'Buyer'))) +
      qzDocRow('Recorded', fmtDate(qzAddDaysISO(o.opened, -(400 + (qzHashString(o.id) % 2000))))) +
      qzDocRow('Instrument no.', 'D2' + (100000 + (qzHashString(o.id + '|inst') % 899999))) +
      '<h2 class="sec">Property conveyed</h2>' +
      qzDocRow('Legal description', esc(o.legalDescription || '')) +
      qzDocRow('County', esc(o.county)) +
      '<p class="clause">TO HAVE AND TO HOLD the above described premises, together with all and singular ' +
      'the rights and appurtenances thereto in anywise belonging, unto the said Grantee, its heirs and ' +
      'assigns forever.</p>';
  },

  'Title Commitment': function (o) {
    return '<h2 class="sec">Schedule A</h2>' +
      qzDocRow('Commitment no.', esc(o.titleNumber)) +
      qzDocRow('Effective date', fmtDate(qzAddDaysISO(o.opened, 10))) +
      qzDocRow('Underwriter', esc(o.underwriter)) +
      qzDocRow('Proposed insured', esc(qzDocPartyName(o, 'Buyer'))) +
      qzDocRow('Policy amount', fmtMoney(o.purchasePrice)) +
      qzDocRow('Estate', 'Fee Simple') +
      qzDocRow('Title vested in', esc(qzDocPartyName(o, 'Seller'))) +
      '<h2 class="sec">Schedule B &mdash; Exceptions</h2>' +
      '<p class="clause">1. Restrictive covenants of record.<br>' +
      '2. Any discrepancy, conflict or shortage in area or boundary lines.<br>' +
      '3. Standby fees, taxes and assessments for the year ' + String(o.closingDate).slice(0, 4) + ' and subsequent years.<br>' +
      '4. Rights of parties in possession.<br>' +
      '5. Easement recorded in Volume ' + (1000 + (qzHashString(o.id + '|ez') % 8999)) + ', Page ' + (10 + (qzHashString(o.id + '|pg') % 400)) + '.</p>';
  },

  'Closing Disclosure': function (o) {
    const b = qzChargeTotals(o.id, 'B'), c = qzChargeTotals(o.id, 'C'), a = qzChargeTotals(o.id, 'A');
    const loanCosts = a.borrowerAt + a.borrowerBefore + b.borrowerAt + b.borrowerBefore + c.borrowerAt + c.borrowerBefore;
    return '<h2 class="sec">Closing information</h2>' +
      qzDocRow('Date issued', fmtDate(qzAddDaysISO(o.closingDate, -3))) +
      qzDocRow('Closing date', fmtDate(o.closingDate)) +
      qzDocRow('Disbursement date', fmtDate(o.disbursementDate)) +
      qzDocRow('Settlement agent', esc(o.settlementAgency)) +
      qzDocRow('File no.', esc(o.id)) +
      qzDocRow('Property', esc(o.propertyAddress)) +
      qzDocRow('Sale price', fmtMoney(o.purchasePrice)) +
      '<h2 class="sec">Loan terms</h2>' +
      qzDocRow('Loan amount', o.loanAmount ? fmtMoney(o.loanAmount) : 'None') +
      qzDocRow('Loan purpose', esc(o.loanPurpose)) +
      qzDocRow('Product', esc(o.loanProduct || '30-Year Fixed Rate')) +
      '<h2 class="sec">Costs at closing</h2>' +
      qzDocRow('Total loan costs (A + B + C)', fmtMoney(loanCosts)) +
      qzDocRow('Cash to close', fmtMoney(Math.max(0, (o.purchasePrice || 0) + loanCosts - (o.loanAmount || 0) - (o.earnestAmount || 0))));
  },

  'Homeowners Insurance Binder': function (o) {
    const premium = qzFeeVary(1680, o, 'ins$');
    return '<h2 class="sec">Binder</h2>' +
      qzDocRow('Named insured', esc(qzDocPartyName(o, 'Buyer'))) +
      qzDocRow('Insured location', esc(o.propertyAddress)) +
      qzDocRow('Carrier', esc(qzPick(QZ_INSURE_CO, o.id, 'ins'))) +
      qzDocRow('Policy no.', 'HO-' + (qzHashString(o.id + '|ho') % 9000000 + 1000000)) +
      qzDocRow('Effective', fmtDate(o.closingDate)) +
      qzDocRow('Expires', fmtDate(qzAddDaysISO(o.closingDate, 365))) +
      '<h2 class="sec">Coverage</h2>' +
      qzDocRow('Dwelling (Coverage A)', fmtMoney(Math.round((o.purchasePrice || 0) * 0.82))) +
      qzDocRow('Annual premium', fmtMoney(premium)) +
      qzDocRow('Deductible', fmtMoney(1000 + (qzHashString(o.id + '|ded') % 4) * 500)) +
      qzDocRow('Mortgagee clause', o.loanAmount ? esc(qzLenderFor(o)) + ', ISAOA/ATIMA' : 'None &mdash; cash transaction');
  },

  'Payoff Statement': function (o) {
    const principal = Math.round((o.purchasePrice || 0) * (0.45 + (qzHashString(o.id + '|po') % 30) / 100));
    const perDiem = Math.round(principal * 0.0625 / 365 * 100) / 100;
    return '<h2 class="sec">Payoff</h2>' +
      qzDocRow('Borrower', esc(qzDocPartyName(o, 'Seller', qzDocPartyName(o, 'Borrower')))) +
      qzDocRow('Property', esc(o.propertyAddress)) +
      qzDocRow('Loan no.', 'LN-' + (qzHashString(o.id + '|ln') % 900000 + 100000)) +
      '<h2 class="sec">Amounts</h2>' +
      qzDocRow('Unpaid principal balance', fmtMoney(principal)) +
      qzDocRow('Interest to good-through date', fmtMoney(Math.round(perDiem * 18 * 100) / 100)) +
      qzDocRow('Recording / release fee', fmtMoney(95)) +
      qzDocRow('Total payoff', fmtMoney(principal + Math.round(perDiem * 18 * 100) / 100 + 95)) +
      '<h2 class="sec">Critical dates</h2>' +
      qzDocRow('Good through', fmtDate(qzAddDaysISO(o.closingDate, 5))) +
      qzDocRow('Per diem after that date', fmtMoney(perDiem)) +
      '<p class="clause">Funds received after the good-through date require an updated statement. ' +
      'Wiring the figure below after that date will leave the loan short and the lien unreleased.</p>';
  },

  'HOA Resale Certificate': function (o) {
    const dues = 40 + (qzHashString(o.id + '|dues') % 36) * 10;
    return '<h2 class="sec">Association</h2>' +
      qzDocRow('Management company', esc(qzPick(QZ_HOA_MGMT, o.id, 'hoa'))) +
      qzDocRow('Property', esc(o.propertyAddress)) +
      qzDocRow('Owner of record', esc(qzDocPartyName(o, 'Seller'))) +
      '<h2 class="sec">Assessments</h2>' +
      qzDocRow('Regular assessment', fmtMoney(dues) + ' per month') +
      qzDocRow('Paid through', fmtDate(qzAddDaysISO(o.closingDate, -15))) +
      qzDocRow('Balance owing', fmtMoney((qzHashString(o.id + '|bal') % 4) * dues)) +
      qzDocRow('Transfer fee', fmtMoney(qzFeeVary(350, o, 'hoa$'))) +
      qzDocRow('Capital contribution', fmtMoney(qzFeeVary(350, o, 'hoa$'))) +
      '<h2 class="sec">Violations</h2>' +
      '<p class="clause">' + ((qzHashString(o.id + '|viol') % 4) === 0
        ? 'One open violation of record: unapproved exterior paint colour, notice dated ' +
          fmtDate(qzAddDaysISO(o.closingDate, -60)) + '. Must be cured prior to transfer.'
        : 'No open violations of record as of the date of this certificate.') + '</p>';
  },

  'Survey': function (o) {
    return '<h2 class="sec">Survey</h2>' +
      qzDocRow('Surveyor', esc(qzPick(QZ_SURVEY_CO, o.id, 'srv'))) +
      qzDocRow('Registration no.', 'RPLS ' + (4000 + (qzHashString(o.id + '|rpls') % 2999))) +
      qzDocRow('Date of survey', fmtDate(qzAddDaysISO(o.opened, 18))) +
      qzDocRow('Property', esc(o.propertyAddress)) +
      qzDocRow('Legal description', esc(o.legalDescription || '')) +
      '<h2 class="sec">Surveyor&rsquo;s findings</h2>' +
      '<p class="clause">' + ((qzHashString(o.id + '|enc') % 5) === 0
        ? 'A storage structure along the rear boundary encroaches approximately 1.4 feet into the ' +
          'platted utility easement. No other encroachments observed.'
        : 'No visible encroachments, protrusions or overlapping of improvements were observed, ' +
          'and the improvements lie wholly within the boundaries of the subject tract.') + '</p>';
  },

  'ALTA Settlement Statement': function (o) {
    const sale = o.purchasePrice || 0;
    const loan = o.loanAmount || 0;
    const earnest = o.earnestAmount || 0;
    const debits = sale + Math.round(sale * 0.025);
    const credits = loan + earnest;
    const cashToClose = Math.max(0, debits - credits);
    return '<h2 class="sec">Financial Summary</h2>' +
      qzDocRow('Sales Price', fmtMoney(sale)) +
      qzDocRow('Loan Amount', loan ? fmtMoney(loan) : 'None (Cash)') +
      qzDocRow('Deposit / Earnest Money', earnest ? fmtMoney(earnest) : 'None') +
      qzDocRow('Total Debits (Buyer)', fmtMoney(debits)) +
      qzDocRow('Total Credits (Buyer)', fmtMoney(credits)) +
      qzDocRow('Cash to Close', fmtMoney(cashToClose)) +
      '<h2 class="sec">Escrow Statement Certification</h2>' +
      '<p class="clause">The undersigned hereby acknowledge receipt of this ALTA Settlement Statement and agree to the charges and disbursements stated herein.</p>';
  },

  'Closing Disclosure (Lender)': function (o) {
    return QZ_DOC_TEMPLATES['Closing Disclosure'](o);
  },

  'Loan Estimate': function (o) {
    const loan = o.loanAmount || (o.purchasePrice ? Math.round(o.purchasePrice * 0.8) : 0);
    return '<h2 class="sec">Loan Terms</h2>' +
      qzDocRow('Loan Amount', fmtMoney(loan)) +
      qzDocRow('Interest Rate', '6.625% Fixed') +
      qzDocRow('Monthly Principal & Interest', fmtMoney(Math.round(loan * 0.0064))) +
      qzDocRow('Prepayment Penalty', 'No') +
      qzDocRow('Balloon Payment', 'No') +
      '<h2 class="sec">Projected Payments</h2>' +
      qzDocRow('Estimated Total Monthly Payment', fmtMoney(Math.round(loan * 0.0085))) +
      qzDocRow('Estimated Cash to Close', fmtMoney(Math.round((o.purchasePrice || 0) * 0.22)));
  },

  'Earnest Money Receipt': function (o) {
    return '<h2 class="sec">Receipt of Escrow Funds</h2>' +
      qzDocRow('Amount Received', fmtMoney(o.earnestAmount || 5000)) +
      qzDocRow('Payer', esc(qzDocPartyName(o, 'Buyer'))) +
      qzDocRow('Escrow Agent', esc(o.settlementAgency)) +
      qzDocRow('Deposit Date', fmtDate(qzAddDaysISO(o.opened, 2))) +
      qzDocRow('Escrow Account', 'Frost Bank Escrow Operating #9842') +
      '<p class="clause">Funds received and deposited subject to collection. To be held pursuant to the terms of the purchase contract.</p>';
  },

  'Tax Certificate': function (o) {
    const val = o.purchasePrice || 350000;
    const taxes = Math.round(val * 0.022);
    return '<h2 class="sec">Tax Assessor Information</h2>' +
      qzDocRow('Taxing Jurisdiction', esc(o.county) + ' County & Local ISD') +
      qzDocRow('Assessed Value', fmtMoney(val)) +
      qzDocRow('Annual Tax Amount', fmtMoney(taxes)) +
      qzDocRow('Tax Status', 'Paid through current calendar year') +
      qzDocRow('Delinquent Taxes', 'None of record') +
      '<p class="clause">Tax certificates issued under Texas Tax Code § 31.08. No tax liens currently encumber the property.</p>';
  },

  'Proposed Deed (Draft)': function (o) {
    return QZ_DOC_TEMPLATES['Source Deed'](o);
  },

  'Signed Deed': function (o) {
    return QZ_DOC_TEMPLATES['Source Deed'](o);
  },

  'Recorded Deed': function (o) {
    return QZ_DOC_TEMPLATES['Source Deed'](o);
  },

  'Prior Title Policy': function (o) {
    return '<h2 class="sec">Owner Title Policy</h2>' +
      qzDocRow('Policy Number', 'OTP-' + (qzHashString(o.id + '|otp') % 900000 + 100000)) +
      qzDocRow('Underwriter', esc(o.underwriter)) +
      qzDocRow('Insured Party', esc(qzDocPartyName(o, 'Seller'))) +
      qzDocRow('Amount of Insurance', fmtMoney(Math.round((o.purchasePrice || 0) * 0.85))) +
      qzDocRow('Effective Date', fmtDate(qzAddDaysISO(o.opened, -1200))) +
      '<p class="clause">Subject to the terms, conditions, and stipulations contained in the standard ALTA Owner Policy jacket.</p>';
  },

  'Final Title Policy': function (o) {
    return '<h2 class="sec">Final Owner Title Policy</h2>' +
      qzDocRow('Policy Number', 'OTP-FINAL-' + (qzHashString(o.id + '|otpf') % 900000 + 100000)) +
      qzDocRow('Underwriter', esc(o.underwriter)) +
      qzDocRow('Insured Party', esc(qzDocPartyName(o, 'Buyer'))) +
      qzDocRow('Amount of Insurance', fmtMoney(o.purchasePrice)) +
      qzDocRow('Policy Date', fmtDate(o.closingDate)) +
      '<p class="clause">Guaranteed policy of title insurance issued pursuant to Title Commitment Schedule A.</p>';
  },

  'Wiring Instructions': function (o) {
    return '<h2 class="sec">Wire Transfer Instructions</h2>' +
      qzDocRow('Receiving Bank', 'Frost Bank, N.A.') +
      qzDocRow('ABA Routing Number', '114000093') +
      qzDocRow('Beneficiary Account Name', esc(o.settlementAgency) + ' Escrow Trust') +
      qzDocRow('Account Number', '3849102847') +
      qzDocRow('Reference / File No.', esc(o.id) + ' / ' + esc(o.titleNumber)) +
      '<p class="clause" style="color:#b91c1c;font-weight:600">WARNING: Wire fraud is real. Always call our office at a verified number before initiating a wire transfer.</p>';
  },

  'Title Search Report': function (o) {
    return '<h2 class="sec">Title Abstract Search</h2>' +
      qzDocRow('Search Period', '50 Years (Standard Texas Search)') +
      qzDocRow('County Records', esc(o.county) + ' County Clerk') +
      qzDocRow('Current Owner of Record', esc(qzDocPartyName(o, 'Seller'))) +
      qzDocRow('Vesting Deed', 'Volume 1420, Page 88, Official Public Records') +
      qzDocRow('Open Liens Found', o.type === 'Refinance' ? '1 Open Deed of Trust' : 'None') +
      '<p class="clause">Search completed by Licensed Title Examiner. No adverse mineral rights or lis pendens found.</p>';
  },

  'Home Inspection Invoice': function (o) {
    return '<h2 class="sec">Invoice Details</h2>' +
      qzDocRow('Vendor', 'Pinnacle Property Inspections, LLC') +
      qzDocRow('Invoice Number', 'INV-INSP-' + (qzHashString(o.id + '|insp') % 90000 + 10000)) +
      qzDocRow('Bill To', esc(qzDocPartyName(o, 'Buyer'))) +
      qzDocRow('Service Performed', 'Complete Residential Inspection & Foundation Analysis') +
      qzDocRow('Total Fee', '$475.00') +
      qzDocRow('Payment Status', 'Paid via Escrow at Closing') +
      '<p class="clause">TREC Licensed Professional Real Estate Inspector #21049.</p>';
  },

  'Deed of Trust': function (o) {
    const loan = o.loanAmount || 300000;
    return '<h2 class="sec">Security Instrument</h2>' +
      qzDocRow('Grantor (Borrower)', esc(qzDocPartyName(o, 'Buyer', qzDocPartyName(o, 'Borrower')))) +
      qzDocRow('Lender', esc(qzLenderFor(o))) +
      qzDocRow('Trustee', 'First American Title Insurance Company') +
      qzDocRow('Principal Sum', fmtMoney(loan)) +
      qzDocRow('Maturity Date', fmtDate(qzAddDaysISO(o.closingDate, 360 * 30))) +
      '<p class="clause">Borrower irrevocably grants and conveys to Trustee, in trust, with power of sale, the described property to secure repayment of the Note.</p>';
  },

  'Disbursement Summary': function (o) {
    return '<h2 class="sec">Escrow Trust Ledger Reconciliation</h2>' +
      qzDocRow('File Number', esc(o.id)) +
      qzDocRow('Disbursement Date', fmtDate(o.disbursementDate)) +
      qzDocRow('Total Receipts Cleared', fmtMoney((o.purchasePrice || 0) + 12000)) +
      qzDocRow('Total Disbursements Paid', fmtMoney((o.purchasePrice || 0) + 12000)) +
      qzDocRow('Ending Escrow Balance', '$0.00 (Balanced)') +
      '<p class="clause">Certified by Escrow Officer. All checks and wire transfers verified against bank clearing log.</p>';
  },

  'Post-Closing Audit Checklist': function (o) {
    return '<h2 class="sec">Post-Closing Quality Assurance</h2>' +
      qzDocRow('Recorded Deed Verified', 'Complete & Confirmed in Public Records') +
      qzDocRow('Policy Issued & Delivered', 'Underwriter Policy Logged') +
      qzDocRow('Zero Escrow Balance Verified', 'Verified ($0.00)') +
      qzDocRow('1099-S Filing Exported', o.eligible1099 ? 'Filed with IRS' : 'Not Required') +
      '<p class="clause">Quality audit completed according to ALTA Best Practices Pillar 2 and Pillar 3 guidelines.</p>';
  },

  /* ---------- added 2026-08-27 ----------
     584 documents were marked Received or Reviewed - the file says they arrived - and opened
     nothing, because no template answered to their name. Every one of these reads from the
     order it belongs to, so a trainee comparing a document against the file is comparing two
     views of the same data, which is the entire exercise. */

  'Chain of Title Abstract': function (o) {
    const yrs = 50;
    return '<h2 class="sec">Chain of Title</h2>' +
      qzDocRow('Search Period', yrs + ' years, ' + esc(o.county) + ' County Official Public Records') +
      qzDocRow('Legal Description', esc(o.legalDescription)) +
      qzDocRow('Current Vested Owner', esc(qzDocPartyName(o, 'Seller', qzDocPartyName(o, 'Borrower')))) +
      qzDocRow('Instrument Chain', '4 conveyances of record, unbroken') +
      qzDocRow('Gaps or Breaks', 'None identified') +
      qzDocRow('Abstractor', 'Licensed Texas Title Examiner, ' + esc(o.underwriter || 'Underwriter of record')) +
      '<p class="clause">An unbroken chain means every conveyance connects the current owner back to the ' +
      'beginning of the search period. A break here is what a title examiner escalates, not corrects.</p>';
  },

  'Property Tax Statement': function (o) {
    const val = o.purchasePrice || 350000;
    /* taxRatePct arrives as a string on part of the catalogue, so it is coerced rather than
       trusted: Number('2.1834') is fine, Number(undefined) is not, hence the fallback. */
    const rate = Number(o.taxRatePct) || 2.2;
    const annual = Math.round(val * (rate / 100));
    return '<h2 class="sec">Consolidated Tax Statement</h2>' +
      qzDocRow('Taxing Authorities', esc(o.county) + ' County, ISD, City, Hospital District') +
      qzDocRow('Assessed Value', fmtMoney(val)) +
      qzDocRow('Combined Rate', rate.toFixed(4) + ' per $100') +
      qzDocRow('Annual Tax', fmtMoney(annual)) +
      qzDocRow('Paid Through', 'Prior calendar year') +
      qzDocRow('Current Year Status', 'Not yet due - prorated at closing') +
      '<p class="clause">Texas taxes run on the calendar year and are billed in arrears. The proration ' +
      'on the settlement statement should reconcile to the annual figure above.</p>';
  },

  'Judgment Search Results': function (o) {
    const hits = qzHashString(o.id + '|judg') % 5 === 0;
    return '<h2 class="sec">Judgment & Lien Search</h2>' +
      qzDocRow('Names Searched', esc(qzDocPartyName(o, 'Buyer', qzDocPartyName(o, 'Borrower'))) + ' / ' + esc(qzDocPartyName(o, 'Seller', 'n/a'))) +
      qzDocRow('Jurisdictions', esc(o.county) + ' County, State of Texas, Federal (N.D. Tex.)') +
      qzDocRow('Abstracts of Judgment', hits ? '1 possible match - identity not confirmed' : 'None of record') +
      qzDocRow('Federal Tax Liens', 'None of record') +
      qzDocRow('Child Support Liens', 'None of record') +
      qzDocRow('Search Through', fmtDate(o.commitmentEffective || o.opened)) +
      (hits
        ? '<p class="clause" style="color:#b45309;font-weight:600">A possible match on a common name is not ' +
          'a lien until identity is confirmed. Order an identity affidavit; do not clear it yourself.</p>'
        : '<p class="clause">A clean judgment search is a snapshot, not a guarantee: it speaks only through ' +
          'the date above.</p>');
  },

  'Seller Disclosure Notice': function (o) {
    return '<h2 class="sec">Seller\u2019s Disclosure of Property Condition</h2>' +
      qzDocRow('Property', esc(o.propertyAddress)) +
      qzDocRow('Seller', esc(qzDocPartyName(o, 'Seller'))) +
      qzDocRow('Occupancy', 'Seller occupied at time of disclosure') +
      qzDocRow('Known Structural Defects', 'None disclosed') +
      qzDocRow('Prior Flooding', 'None disclosed') +
      qzDocRow('Pending Litigation', 'None disclosed') +
      qzDocRow('HOA Membership', o.hoaAssessment ? 'Yes - mandatory' : 'No') +
      '<p class="clause">Required by Texas Property Code &sect; 5.008. The seller states what the seller ' +
      'knows; it is not an inspection and it is not a warranty.</p>';
  },

  'Pest Inspection Report': function (o) {
    const found = qzHashString(o.id + '|pest') % 4 === 0;
    return '<h2 class="sec">Wood Destroying Insect Report</h2>' +
      qzDocRow('Property', esc(o.propertyAddress)) +
      qzDocRow('Inspection Date', fmtDate(qzAddDaysISO(o.closingDate, -21))) +
      qzDocRow('Visible Evidence', found ? 'Yes - subterranean termites, exterior sill plate' : 'No visible evidence observed') +
      qzDocRow('Previous Treatment', found ? 'Evidence of prior treatment present' : 'None observed') +
      qzDocRow('Inspector License', 'TPCL #' + (10000 + (qzHashString(o.id + '|tpcl') % 89999))) +
      (found
        ? '<p class="clause" style="color:#b45309;font-weight:600">Active evidence triggers a treatment ' +
          'proposal and, usually, a repair amendment. Check whether one is in this file.</p>'
        : '<p class="clause">A report of no visible evidence covers accessible areas only.</p>');
  },

  'Repair Amendment': function (o) {
    const credit = 500 + (qzHashString(o.id + '|repair') % 4500);
    return '<h2 class="sec">Amendment to Contract - Repairs</h2>' +
      qzDocRow('Contract Dated', fmtDate(o.opened)) +
      qzDocRow('Property', esc(o.propertyAddress)) +
      qzDocRow('Agreed Repairs', 'Items 3, 7 and 11 of the inspection report') +
      qzDocRow('Repair Completion', 'Prior to funding, receipts to escrow') +
      qzDocRow('Seller Credit in Lieu', fmtMoney(credit)) +
      qzDocRow('All Other Terms', 'Unchanged and in full force') +
      '<p class="clause">A credit here has to appear on the settlement statement. If the amendment says ' +
      fmtMoney(credit) + ' and the statement does not, that is the discrepancy.</p>';
  },

  'Lender Instructions': function (o) {
    return '<h2 class="sec">Closing Instructions to Settlement Agent</h2>' +
      qzDocRow('Lender', esc(qzDocPartyName(o, 'Lender', 'Lender of record'))) +
      qzDocRow('Loan Number', esc(o.loanIdNumber || 'Pending assignment')) +
      qzDocRow('Loan Amount', fmtMoney(o.loanAmount)) +
      qzDocRow('Disbursement Condition', 'Do not disburse before recording confirmation') +
      qzDocRow('Required Endorsements', 'T-17, T-19, T-30 as applicable') +
      qzDocRow('CPL Required', o.cplNumber ? 'Yes - ' + esc(o.cplNumber) : 'Yes - not yet issued') +
      '<p class="clause">Lender instructions govern the closing. Where they conflict with the contract, ' +
      'they are escalated, never reconciled at the desk.</p>';
  },

  'Loan Approval Letter': function (o) {
    return '<h2 class="sec">Conditional Loan Approval</h2>' +
      qzDocRow('Borrower', esc(qzDocPartyName(o, 'Buyer', qzDocPartyName(o, 'Borrower')))) +
      qzDocRow('Loan Amount', fmtMoney(o.loanAmount)) +
      qzDocRow('Loan Purpose', esc(o.loanPurpose || o.purpose || 'Purchase')) +
      qzDocRow('Approval Status', 'Conditional - clear to close pending items below') +
      qzDocRow('Outstanding Conditions', 'Final employment verification; hazard insurance binder') +
      qzDocRow('Approval Expires', fmtDate(qzAddDaysISO(o.closingDate, 21))) +
      '<p class="clause">Conditional approval is not clear-to-close. Funding waits on the conditions.</p>';
  },

  'Flood Certificate': function (o) {
    const zoneX = qzHashString(o.id + '|flood') % 6 !== 0;
    return '<h2 class="sec">Standard Flood Hazard Determination</h2>' +
      qzDocRow('Property', esc(o.propertyAddress)) +
      qzDocRow('NFIP Community', esc(o.county) + ' County, Texas') +
      qzDocRow('Flood Zone', zoneX ? 'Zone X - outside the 0.2% annual chance floodplain' : 'Zone AE - special flood hazard area') +
      qzDocRow('Insurance Required', zoneX ? 'No' : 'Yes - federally mandated') +
      qzDocRow('Determination Basis', 'Current FEMA FIRM panel') +
      (zoneX
        ? '<p class="clause">Zone X removes the federal requirement. It does not mean the property cannot flood.</p>'
        : '<p class="clause" style="color:#b45309;font-weight:600">Zone AE requires flood insurance in place ' +
          'before funding. Confirm the binder is in this file.</p>');
  },

  'Identity Verification': function (o) {
    return '<h2 class="sec">Identity Verification Record</h2>' +
      qzDocRow('Subject', esc(qzDocPartyName(o, 'Buyer', qzDocPartyName(o, 'Borrower')))) +
      qzDocRow('Method', 'Government photo identification, verified in person') +
      qzDocRow('ID Type', 'Texas Driver License') +
      qzDocRow('Verified By', esc(o.orderOpener || o.paralegal || 'Settlement team')) +
      qzDocRow('Verification Date', fmtDate(qzAddDaysISO(o.closingDate, -7))) +
      qzDocRow('OFAC / SDN Screening', 'Cleared - no match') +
      '<p class="clause">Training record only. Identification numbers are deliberately not reproduced here; ' +
      'a real file redacts them for the same reason.</p>';
  },

  'Mortgage Payoff Authorization': function (o) {
    return '<h2 class="sec">Borrower Authorization to Release Payoff</h2>' +
      qzDocRow('Borrower', esc(qzDocPartyName(o, 'Seller', qzDocPartyName(o, 'Borrower')))) +
      qzDocRow('Lender', esc(o.payoffLender || 'Lender of record')) +
      qzDocRow('Property', esc(o.propertyAddress)) +
      qzDocRow('Authorized Recipient', esc(o.settlementAgency)) +
      qzDocRow('Scope', 'Payoff figures, per diem interest and release instructions') +
      qzDocRow('Signed', fmtDate(qzAddDaysISO(o.closingDate, -18))) +
      '<p class="clause">Without this signed authorization the lender will not speak to the settlement ' +
      'agent. A missing one is the usual reason a payoff statement never arrives.</p>';
  },

  'HOA Statement of Account': function (o) {
    const dues = o.hoaAssessment || 0;
    return '<h2 class="sec">Association Statement of Account</h2>' +
      qzDocRow('Association', esc(o.county) + ' Ridge Homeowners Association') +
      qzDocRow('Owner of Record', esc(qzDocPartyName(o, 'Seller'))) +
      qzDocRow('Regular Assessment', dues ? fmtMoney(dues) + ' ' + esc(o.hoaCycle || 'annually') : 'None of record') +
      qzDocRow('Account Status', esc(o.hoaPaidStatus || 'Current')) +
      qzDocRow('Outstanding Balance', o.hoaPaidStatus === 'Delinquent' ? fmtMoney(dues) : fmtMoney(0)) +
      qzDocRow('Transfer Fee', fmtMoney(275)) +
      '<p class="clause">An unpaid assessment is a lien on the property in most Texas associations. The ' +
      'balance above has to be reflected on the settlement statement.</p>';
  },

  'HOA Bylaws & Restrictions': function (o) {
    return '<h2 class="sec">Declaration of Covenants, Conditions & Restrictions</h2>' +
      qzDocRow('Association', esc(o.county) + ' Ridge Homeowners Association') +
      qzDocRow('Recorded', 'Volume 3120, Page 45, Official Public Records') +
      qzDocRow('Use Restriction', 'Single family residential only') +
      qzDocRow('Architectural Control', 'Committee approval required for exterior alterations') +
      qzDocRow('Leasing Restriction', 'Minimum six month term; no short term rentals') +
      qzDocRow('Right of First Refusal', 'None') +
      '<p class="clause">Restrictions run with the land and appear as an exception on Schedule B. They ' +
      'are disclosed, not cleared.</p>';
  },

  "Owner's Policy Jacket": function (o) {
    return '<h2 class="sec">Owner Policy of Title Insurance</h2>' +
      qzDocRow('Policy Number', esc(o.policyJacket || o.finalPolicyNumber || 'Pending issue')) +
      qzDocRow('Form', esc(o.ownerPolicyForm || 'T-1 Texas Owner Policy')) +
      qzDocRow('Underwriter', esc(o.underwriter)) +
      qzDocRow('Insured', esc(qzDocPartyName(o, 'Buyer', qzDocPartyName(o, 'Borrower')))) +
      qzDocRow('Amount of Insurance', fmtMoney(o.purchasePrice)) +
      qzDocRow('Date of Policy', fmtDate(o.finalPolicyDate || o.closingDate)) +
      '<p class="clause">The jacket carries the insuring provisions; Schedule B carries what is excepted ' +
      'from them. Both are needed to know what is actually covered.</p>';
  },

  'Final Loan Documents': function (o) {
    return '<h2 class="sec">Lender Closing Package</h2>' +
      qzDocRow('Lender', esc(qzDocPartyName(o, 'Lender', 'Lender of record'))) +
      qzDocRow('Loan Number', esc(o.loanIdNumber || 'Pending assignment')) +
      qzDocRow('Package Contents', 'Note, Deed of Trust, riders, affidavits, compliance agreement') +
      qzDocRow('Signing Method', esc(o.esignProvider ? 'Hybrid - ' + o.esignProvider : 'Wet signature, in office')) +
      qzDocRow('Notary Required', 'Yes - Deed of Trust and affidavits') +
      qzDocRow('Return Instructions', 'Overnight originals within 24 hours of signing') +
      '<p class="clause">The package is what funds the loan. A missing signature or a bad notarial ' +
      'certificate stops funding on a file that otherwise looks finished.</p>';
  },

  '1099-S Filing Copy': function (o) {
    return '<h2 class="sec">Proceeds From Real Estate Transactions</h2>' +
      qzDocRow('Filer', esc(o.settlementAgency)) +
      qzDocRow('Transferor', esc(qzDocPartyName(o, 'Seller'))) +
      qzDocRow('Property', esc(o.propertyAddress)) +
      qzDocRow('Date of Closing', fmtDate(o.closingDate)) +
      qzDocRow('Gross Proceeds', fmtMoney(o.purchasePrice)) +
      qzDocRow('Filing Required', o.eligible1099 ? 'Yes' : 'No - exemption certified by transferor') +
      '<p class="clause">The settlement agent is the filer. Gross proceeds is the sale price, not what the ' +
      'seller walked away with.</p>';
  },

  'UCC Search Results': function (o) {
    return '<h2 class="sec">UCC Financing Statement Search</h2>' +
      qzDocRow('Debtor Searched', esc(qzDocPartyName(o, 'Seller', qzDocPartyName(o, 'Borrower')))) +
      qzDocRow('Jurisdiction', 'Texas Secretary of State') +
      qzDocRow('Fixture Filings', 'None of record against the property') +
      qzDocRow('Personal Property Liens', 'None of record') +
      qzDocRow('Search Through', fmtDate(o.commitmentEffective || o.opened)) +
      '<p class="clause">Fixture filings matter because they attach to the real property. A UCC on ' +
      'equipment alone does not.</p>';
  },

  'Bill of Sale': function (o) {
    return '<h2 class="sec">Bill of Sale - Personal Property</h2>' +
      qzDocRow('Seller', esc(qzDocPartyName(o, 'Seller'))) +
      qzDocRow('Buyer', esc(qzDocPartyName(o, 'Buyer', qzDocPartyName(o, 'Borrower')))) +
      qzDocRow('Property', esc(o.propertyAddress)) +
      qzDocRow('Items Conveyed', 'Appliances, window treatments and fixtures as listed in the contract') +
      qzDocRow('Consideration', 'Included in the purchase price') +
      qzDocRow('Warranty', 'As-is, no warranty of condition') +
      '<p class="clause">Personal property conveys by bill of sale, not by deed. The deed carries the ' +
      'land and what is affixed to it.</p>';
  }
};

/* ---------- rendering and opening ---------- */

function qzRenderTemplatedDoc(doc, o) {
  const fn = QZ_DOC_TEMPLATES[doc.template || doc.name];
  if (!fn) return null;
  /* The stylesheet is resolved against the page rather than the blob, which has
     no base URL of its own. */
  let css = 'documents/doc.css';
  try { css = new URL('documents/doc.css', location.href).href; } catch (e) {}

  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<title>' + esc(doc.name) + '</title>' +
    '<link rel="stylesheet" href="' + escAttr(css) + '">' +
    '</head><body>' +
    '<div class="banner">Training document &mdash; generated from order ' + esc(o.id) +
      '. Not a real instrument.</div>' +
    '<div class="paper">' +
      '<div class="letterhead">' +
        '<h1>' + esc(doc.name) + '</h1>' +
        '<p>' + esc(o.settlementAgency) + ' &middot; File ' + esc(o.id) +
        ' &middot; ' + esc(o.titleNumber) + '</p>' +
      '</div>' +
      fn(o) +
      '<div class="sigrow"><div><span class="line"></span>' + esc(qzDocPartyName(o, 'Buyer')) + '</div>' +
      '<div><span class="line"></span>' + esc(qzDocPartyName(o, 'Seller')) + '</div></div>' +
    '</div></body></html>';
}

function qzViewGeneratedDoc(docId) {
  const d = qzFind('documents', docId);
  if (!d) return;
  const o = qzFind('orders', d.orderId);
  if (!o) return;
  const html = qzRenderTemplatedDoc(d, o);
  if (!html) { simToast('There is no document body on file for this item yet.'); return; }
  qzMark('docs-download');
  try {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    simViewDoc(url, d.name);
    /* Released once the iframe has had time to load it. */
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  } catch (e) {
    simToast('This browser blocked the document preview.');
  }
}

/* True when a row can actually be opened, whichever way it is backed. */
function qzDocIsOpenable(d) {
  return !!(d && (d.file || QZ_DOC_TEMPLATES[d.template || d.name]));
}

/* ============================================================================
   FILLING THE CATALOGUE — 72 of the 75 orders were shells
   ============================================================================

   All eight vendors, all three message threads and every reviewable item sat on
   the three curriculum orders. Open any other file and Marketplace was empty,
   Connect was empty, Review was empty, and the document list held an average of
   2.9 rows drawn from a vocabulary of twelve names.

   That is not a small cosmetic gap. A trainee who has finished the lessons is
   supposed to practise on unfamiliar files, and every unfamiliar file was
   visibly hollow: the moment they left 1483 the product stopped pretending.

   Everything here is generated from the order it belongs to and a hash of its
   id, so it is stable across reloads, and the three curriculum orders are left
   exactly as the lessons expect to find them.
   ============================================================================ */

const QZ_CURRICULUM_ORDERS = ['ORD-2026-1483', 'ORD-2026-1512', 'ORD-2026-1398'];

/* ---------- documents ----------
   A real title file runs to dozens of documents. The set depends on the deal:
   a refinance has no purchase contract and no seller, a cash purchase has no
   loan package, and only a file inside an association pulls HOA paperwork. */
const QZ_DOC_CATALOG = [
  /* name,                              type,        stage, appliesTo */
  ['Purchase Agreement',                'Contract',   0, 'sale'],
  ['Earnest Money Receipt',             'Contract',   0, 'sale'],
  ['Seller Disclosure Notice',          'Contract',   0, 'sale'],
  ['Survey',                            'Property',   1, 'all'],
  ['Prior Title Policy',                'Title',      1, 'all'],
  ['Title Commitment',                  'Title',      1, 'all'],
  ['Title Search Report',               'Title',      1, 'all'],
  ['Chain of Title Abstract',           'Title',      1, 'all'],
  ['Source Deed',                       'Title',      1, 'all'],
  ['Tax Certificate',                   'Property',   1, 'all'],
  ['Property Tax Statement',            'Property',   1, 'all'],
  ['Judgment Search Results',           'Title',      1, 'all'],
  ['UCC Search Results',                'Title',      1, 'commercial'],
  ['Loan Estimate',                     'Lender',     2, 'financed'],
  ['Lender Instructions',               'Lender',     2, 'financed'],
  ['Loan Approval Letter',              'Lender',     2, 'financed'],
  ['Payoff Statement',                  'Lender',     2, 'payoff'],
  ['Mortgage Payoff Authorization',     'Lender',     2, 'payoff'],
  ['Homeowners Insurance Binder',       'Insurance',  2, 'all'],
  ['Flood Certificate',                 'Insurance',  2, 'financed'],
  ['HOA Resale Certificate',            'HOA',        2, 'hoa'],
  ['HOA Statement of Account',          'HOA',        2, 'hoa'],
  ['HOA Bylaws & Restrictions',         'HOA',        2, 'hoa'],
  ['Home Inspection Invoice',           'Invoice',    2, 'sale'],
  ['Pest Inspection Report',            'Property',   2, 'sale'],
  ['Repair Amendment',                  'Contract',   2, 'sale'],
  ['Proposed Deed (Draft)',             'Title',      3, 'all'],
  ['Closing Disclosure',                'Lender',     3, 'financed'],
  ['Closing Disclosure (Lender)',       'Lender',     3, 'financed'],
  ['ALTA Settlement Statement',         'Title',      3, 'all'],
  ['Wiring Instructions',               'Escrow',     3, 'all'],
  ['Identity Verification',             'Compliance', 3, 'all'],
  ['Final Loan Documents',              'Lender',     4, 'financed'],
  ['Signed Deed',                       'Title',      4, 'all'],
  ['Deed of Trust',                     'Lender',     4, 'financed'],
  ['Bill of Sale',                      'Contract',   4, 'commercial'],
  ['Recorded Deed',                     'Title',      5, 'all'],
  ['Final Title Policy',                'Title',      5, 'all'],
  ["Owner's Policy Jacket",             'Title',      5, 'all'],
  ['Disbursement Summary',              'Escrow',     5, 'all'],
  ['1099-S Filing Copy',                'Compliance', 5, 'reportable'],
  ['Post-Closing Audit Checklist',      'Compliance', 5, 'all']
];

function qzDocApplies(rule, o) {
  const financed = !!o.loanAmount && o.loanAmount > 0;
  const isRefi = o.type === 'Refinance';
  const hasHoa = (qzHashString(o.id + '|hoa') % 3) > 0;
  switch (rule) {
    case 'all': return true;
    case 'sale': return !isRefi;
    case 'financed': return financed;
    case 'payoff': return isRefi || (qzHashString(o.id + '|po2') % 3) > 0;
    case 'hoa': return hasHoa && !isRefi;
    case 'commercial': return o.type === 'Commercial';
    case 'reportable': return !!o.eligible1099;
    default: return false;
  }
}

const QZ_DOC_STATUS = ['Received', 'Reviewed', 'Pending', 'Requested'];

function qzBuildDocuments(orders, existing) {
  const out = existing.slice();
  let n = 6000;
  orders.forEach(function (o) {
    if (QZ_CURRICULUM_ORDERS.indexOf(o.id) > -1) return;   /* lessons own these */
    const stage = o.stageIndex || 0;
    QZ_DOC_CATALOG.forEach(function (spec, idx) {
      const name = spec[0], type = spec[1], docStage = spec[2], rule = spec[3];
      if (!qzDocApplies(rule, o)) return;
      /* A file that has not reached a stage does not yet hold its paperwork,
         and a document still outstanding is the whole point of the Documents
         screen: it is the list of what is missing. */
      if (docStage > stage + 1) return;
      const outstanding = docStage > stage;
      out.push({
        id: 'doc-' + (++n),
        orderId: o.id,
        name: name,
        type: type,
        status: outstanding
          ? (docStage === stage + 1 ? 'Requested' : 'Pending')
          : QZ_DOC_STATUS[qzHashString(o.id + name) % 2],
        uploadedBy: outstanding ? '—' : o.orderOpener,
        date: outstanding ? '' : qzAddDaysISO(o.opened, 3 + (qzHashString(o.id + name) % 40)),
        /* Parameterised viewer rather than a file per document. */
        template: QZ_DOC_TEMPLATES[name] ? name : null
      });
    });
  });
  return out;
}

/* ---------- tasks ----------
   Every task now belongs to one of the five groups the product actually shows,
   because the Tasks screen is organised by group and 221 ungrouped rows could
   not be drawn that way. */
const QZ_TASK_CATALOG = [
  ['tg-open',   'Confirm buyer contact information'],
  ['tg-open',   'Confirm seller contact information'],
  ['tg-open',   'Open order and assign settlement team'],
  ['tg-open',   'Send opening package to all parties'],
  ['tg-open',   'Verify earnest money received'],
  ['tg-open',   'Confirm commission split with brokers'],
  ['tg-open',   'Collect signed engagement letter'],
  ['tg-title',  'Order title search'],
  ['tg-title',  'Examine Title Commitment & Exceptions'],
  ['tg-title',  'Clear Schedule B exceptions'],
  ['tg-title',  'Order tax certificate'],
  ['tg-title',  'Review survey for encroachments'],
  ['tg-title',  'Confirm vesting matches the source deed'],
  ['tg-title',  'Request prior title policy for reissue credit'],
  ['tg-title',  'Order judgment and lien search'],
  ['tg-pre',    'Upload homeowners insurance binder to file'],
  ['tg-pre',    'Follow up with lender on Loan Estimate'],
  ['tg-pre',    'Request HOA Resale Certificate from management company'],
  ['tg-pre',    'Notify buyer’s agent of outstanding HOA item'],
  ['tg-pre',    'Prepare draft Closing Disclosure'],
  ['tg-pre',    'Balance CD with lender'],
  ['tg-pre',    'Schedule signing appointment'],
  ['tg-pre',    'Verify wiring instructions with parties'],
  ['tg-pre',    'Send closing package to the signing agent'],
  ['tg-pre',    'Confirm buyer cash to close'],
  ['tg-payoff', 'Order mortgage payoff statement'],
  ['tg-payoff', 'Verify payoff good-through date'],
  ['tg-payoff', 'Request HOA payoff figures'],
  ['tg-payoff', 'Confirm property tax proration'],
  ['tg-payoff', 'Obtain lien release authorization'],
  ['tg-post',   'Disburse seller proceeds'],
  ['tg-post',   'Send deed for recording'],
  ['tg-post',   'Confirm recording returned from county'],
  ['tg-post',   'Issue final title policy'],
  ['tg-post',   'File 1099-S with the IRS'],
  ['tg-post',   'Reconcile the escrow file to zero'],
  ['tg-post',   'Archive the closed file'],
  ['tg-post',   'Send post-closing survey to the client']
];
const QZ_TASK_STAGE = { 'tg-open': 0, 'tg-title': 1, 'tg-pre': 2, 'tg-payoff': 2, 'tg-post': 4 };

function qzBuildTasks(orders, existing) {
  /* Existing curriculum tasks keep their identity but gain a group, so the
     grouped screen can draw them alongside everything else. */
  const out = existing.map(function (t) {
    const copy = Object.assign({}, t);
    if (!copy.orderId) copy.orderId = copy.relatedOrderId;
    if (!copy.taskGroup) {
      const hit = QZ_TASK_CATALOG.find(function (c) {
        return c[1].toLowerCase() === String(copy.title).toLowerCase();
      });
      copy.taskGroup = hit ? hit[0] : 'tg-pre';
    }
    return copy;
  });

  let n = 6000;
  orders.forEach(function (o) {
    if (QZ_CURRICULUM_ORDERS.indexOf(o.id) > -1) return;
    const stage = o.stageIndex || 0;
    QZ_TASK_CATALOG.forEach(function (spec) {
      const grp = spec[0], title = spec[1];
      const taskStage = QZ_TASK_STAGE[grp];
      if (taskStage > stage + 1) return;
      /* Not every file needs every task: a cash deal orders no payoff. */
      if (grp === 'tg-payoff' && !(o.type === 'Refinance' || (qzHashString(o.id + '|po2') % 3) > 0)) return;
      const done = taskStage < stage;
      out.push({
        id: 't-' + (++n),
        orderId: o.id,
        relatedOrderId: o.id,
        taskGroup: grp,
        title: title,
        assignedTo: qzPick([o.orderOpener, o.paralegal, 'You (VA)'], o.id + title, 'asgn'),
        dueDate: qzAddDaysISO(o.closingDate, taskStage * 5 - 20),
        status: done ? 'Complete' : (taskStage === stage ? 'In Progress' : 'Open')
      });
    });
  });
  return out;
}

/* ---------- vendors (Marketplace) ---------- */
const QZ_VENDOR_CATALOG = [
  ['Title & Settlement', null],
  ['Survey', QZ_SURVEY_CO],
  ['Pest Inspection', QZ_PEST_CO],
  ['Home Warranty', QZ_WARRANTY],
  ['Appraisal', QZ_APPRAISAL],
  ['Homeowners Insurance', QZ_INSURE_CO],
  ['HOA Management', QZ_HOA_MGMT],
  ['Courier & Recording', ['Metroplex Courier', 'SwiftFile Recording', 'Lone Star Document Services']],
  ['Notary / Signing Agent', ['North Texas Notary Group', 'Mobile Signing Partners', 'Statewide Notary Network']],
  ['Payoff & Lien Release', ['NationalLink Payoff', 'LienClear Services']]
];
/* The one vendor vocabulary. There used to be four and they did not agree: the row
   dropdown offered Ordered/In Progress/Delayed/Complete/Cancelled, the generator picked
   from Ordered/In Progress/Complete/Delayed, the edit modal offered Pending/Scheduled/
   In Progress/Completed, and the seeded curriculum vendors carried 'Pending Confirmation',
   'Scheduled' and 'Completed'. Only 'In Progress' appeared in all of them, so a seeded
   vendor matched no <option> and the browser fell back to displaying the FIRST one -
   every seeded vendor read as "Ordered" no matter what its record said. Lakeshore Notary
   Services, whose whole role in Lesson 6 is to sit at "Pending Confirmation", displayed
   as "Ordered". */
const QZ_VENDOR_STATUS = [
  'Ordered', 'Pending Confirmation', 'Scheduled', 'In Progress', 'Delayed', 'Complete', 'Cancelled'
];
/* What a generated (non-curriculum) vendor can be born as - a subset, because a fresh file
   has not had time to be delayed or cancelled. */
const QZ_VENDOR_STATUS_SEEDABLE = ['Ordered', 'In Progress', 'Complete', 'Delayed'];

function qzBuildVendors(orders, existing) {
  const out = existing.slice();
  let n = 500;
  orders.forEach(function (o) {
    if (QZ_CURRICULUM_ORDERS.indexOf(o.id) > -1) return;
    const stage = o.stageIndex || 0;
    const isRefi = o.type === 'Refinance';
    QZ_VENDOR_CATALOG.forEach(function (spec, i) {
      const service = spec[0], pool = spec[1];
      if (service === 'Pest Inspection' && isRefi) return;
      if (service === 'Home Warranty' && isRefi) return;
      if (service === 'HOA Management' && !((qzHashString(o.id + '|hoa') % 3) > 0)) return;
      if (service === 'Appraisal' && !(o.loanAmount > 0)) return;
      /* Two or three orders in five would not have engaged every vendor yet. */
      if ((qzHashString(o.id + service) % 5) === 0) return;
      out.push({
        id: 'v-' + (++n),
        orderId: o.id,
        name: pool ? qzPick(pool, o.id, 'v' + i) : o.settlementAgency,
        service: service,
        status: stage >= 4 ? 'Complete' : QZ_VENDOR_STATUS_SEEDABLE[qzHashString(o.id + service) % 3],
        ordered: qzAddDaysISO(o.opened, 2 + (qzHashString(o.id + service) % 20))
      });
    });
  });
  return out;
}

/* ---------- Connect threads ---------- */
const QZ_THREAD_TOPICS = [
  ['Loan Estimate still pending', 'Lender',
   'Checking in on the Loan Estimate for {addr}. Can you share a status?',
   'Underwriting is finishing review. We expect to send it by end of week.'],
  ['Survey received — encroachment noted', 'Selling Agent',
   'The survey on {addr} shows the shed crossing the rear setback. Flagging before we go further.',
   'Understood. The seller has agreed to obtain a variance letter from the HOA.'],
  ['HOA resale certificate ordered', 'Listing Agent',
   'Ordered the resale certificate for {addr}. Management quotes ten business days.',
   'That lands after our contract deadline. Can it be expedited?'],
  ['Confirming closing date', 'Buyer',
   'Confirming we are still on track to close {addr} on {close}.',
   'Yes, that date still works for us. Please send the wire instructions.'],
  ['Payoff figures requested', 'Lender',
   'Requested payoff figures for {addr}, good through the end of the month.',
   'Payoff statement attached, good through the 30th with per diem noted.'],
  ['Wire instructions — verify by phone', 'Buyer',
   'Do not act on wire instructions sent by email. We will call you to confirm before you send anything.',
   'Understood, I will call the number on your website rather than any number in an email.'],
  ['Commission split confirmation', 'Listing Agent',
   'Confirming the commission split on {addr} before we prepare the statement.',
   'Split is as written in the listing agreement. No changes.'],
  ['Insurance binder outstanding', 'Buyer',
   'We still need the homeowners insurance binder for {addr} before the lender will fund.',
   'My agent is sending it today. Sorry for the delay.']
];

function qzBuildThreads(orders, existing) {
  const out = existing.slice();
  let n = 500;
  orders.forEach(function (o) {
    if (QZ_CURRICULUM_ORDERS.indexOf(o.id) > -1) return;
    /* Roughly two thirds of live files have correspondence on them. */
    if ((qzHashString(o.id + '|th') % 3) === 0) return;
    const count = 1 + (qzHashString(o.id + '|thn') % 3);
    for (let i = 0; i < count; i++) {
      const topic = QZ_THREAD_TOPICS[(qzHashString(o.id + '|t' + i)) % QZ_THREAD_TOPICS.length];
      const counterparty = (o.parties || []).find(function (p) { return p.role === topic[1]; });
      const who = counterparty ? counterparty.name : topic[1];
      const addr = String(o.propertyAddress || '').split(',')[0];
      const fill = function (s) {
        return s.replace('{addr}', addr).replace('{close}', fmtDate(o.closingDate));
      };
      out.push({
        id: 'th-' + (++n),
        orderId: o.id,
        subject: topic[0],
        thread: [
          { sender: 'You (VA)', recipient: who,
            date: qzAddDaysISO(o.closingDate, -21 + i * 3), body: fill(topic[2]) },
          { sender: who, recipient: 'You (VA)',
            date: qzAddDaysISO(o.closingDate, -19 + i * 3), body: fill(topic[3]) }
        ]
      });
    }
  });
  return out;
}

const QZ_NOTE_TEMPLATES = [
  'File intake complete. Confirmed contract terms and earnest deposit with listing agent.',
  'Title search completed by underwriter. No unreleased prior liens found; restrictive covenants noted in Schedule B.',
  'Payoff statement requested from prior mortgage servicer. Good-through date verified.',
  'Survey review complete. Property boundaries and utility easements verified against recorded plat.',
  'HOA estoppel certificate received. Regular assessments current through month-end; transfer fee noted.',
  'Tax certificate issued by County Assessor. Prorations calculated based on current fiscal year millage.',
  'Hazard insurance binder and paid receipt received from carrier. Mortgagee clause matches lender instructions.',
  'Preliminary Closing Disclosure reviewed with lender. Cash-to-close figure matches buyer breakdown.',
  'Closing scheduled with mobile notary. Signing appointment confirmed with buyer and seller.',
  'Final funding authorization received. Wire released to seller and broker commissions disbursed.'
];

function qzBuildNotes(orders) {
  const notes = [];
  let n = 100;
  orders.forEach(function (o) {
    // Seed notes for at least 55 orders
    const seedThis = (qzHashString(o.id + '|nt') % 5) !== 0;
    if (seedThis) {
      const count = 1 + (qzHashString(o.id + '|ntc') % 3);
      for (let i = 0; i < count; i++) {
        const noteIdx = (qzHashString(o.id + '|nti' + i)) % QZ_NOTE_TEMPLATES.length;
        notes.push({
          id: 'note-' + (++n),
          orderId: o.id,
          author: (i === 0 && o.orderOpener) ? o.orderOpener : 'Training User',
          date: qzAddDaysISO(o.opened, 2 + i * 5),
          body: QZ_NOTE_TEMPLATES[noteIdx]
        });
      }
    }
  });
  return notes;
}

function qzBuildMessages(threads) {
  const messages = [];
  let mId = 1000;
  threads.forEach(function (th) {
    if (Array.isArray(th.thread)) {
      th.thread.forEach(function (m) {
        messages.push({
          id: 'msg-' + (++mId),
          threadId: th.id,
          orderId: th.orderId,
          sender: m.sender,
          recipient: m.recipient,
          date: m.date,
          body: m.body
        });
      });
    }
  });
  return messages;
}

function qzBuildCatalog(seed) {
  seed.documents = qzBuildDocuments(seed.orders, seed.documents || []);
  seed.tasks     = qzBuildTasks(seed.orders, seed.tasks || []);
  seed.vendors   = qzBuildVendors(seed.orders, seed.vendors || []);
  seed.threads   = qzBuildThreads(seed.orders, seed.threads || []);
  seed.messages  = qzBuildMessages(seed.threads);
  seed.notes     = qzBuildNotes(seed.orders);
  return seed;
}

function qzBuildSeed() {
  const deep = (x) => (x ? JSON.parse(JSON.stringify(x)) : []);
  const seedOrders = deep(typeof QZ_ORDERS !== 'undefined' ? QZ_ORDERS : [])
    .concat(deep(typeof QZC_ORDERS !== 'undefined' ? QZC_ORDERS : []))
    .concat(typeof QZ_EXAM_ORDER !== 'undefined' ? [deep(QZ_EXAM_ORDER)] : []);

  const seed = {
    orders: seedOrders,
    parties: [],
    documents: deep(typeof QZ_DOCUMENTS !== 'undefined' ? QZ_DOCUMENTS : [])
      .concat(deep(typeof QZC_DOCUMENTS !== 'undefined' ? QZC_DOCUMENTS : []))
      .concat(deep(typeof QZ_EXAM_DOCUMENTS !== 'undefined' ? QZ_EXAM_DOCUMENTS : [])),
    tasks: deep(typeof QZ_TASKS !== 'undefined' ? QZ_TASKS : [])
      .concat(deep(typeof QZC_TASKS !== 'undefined' ? QZC_TASKS : [])),
    taskGroups: [
      { id: 'tg-open', name: 'Order Opening', order: 1 },
      { id: 'tg-title', name: 'Title', order: 2 },
      { id: 'tg-pre', name: 'Pre-Closing', order: 3 },
      { id: 'tg-payoff', name: 'Payoff Tasks', order: 4 },
      { id: 'tg-post', name: 'Post-Closing', order: 5 }
    ],
    threads: deep(typeof QZ_MESSAGES !== 'undefined' ? QZ_MESSAGES : []),
    messages: [],
    notes: [],
    vendors: deep(typeof QZ_VENDORS !== 'undefined' ? QZ_VENDORS : []),
    contacts: deep(typeof QZS_CONTACTS !== 'undefined' ? QZS_CONTACTS : []),
    events: deep(typeof QZS_EVENTS !== 'undefined' ? QZS_EVENTS : []),
    receipts: deep(typeof QZS_RECEIPTS !== 'undefined' ? QZS_RECEIPTS : []),
    disbursements: deep(typeof QZS_DISBURSEMENTS !== 'undefined' ? QZS_DISBURSEMENTS : []),
    invoices: deep(typeof QZS_INVOICES !== 'undefined' ? QZS_INVOICES : []),
    ledgerLines: [],
    exceptions: deep(typeof QZS_EXCEPTIONS !== 'undefined' ? QZS_EXCEPTIONS : []),
    cpls: deep(typeof QZS_CPLS !== 'undefined' ? QZS_CPLS : []),
    users: deep(typeof QZS_USERS !== 'undefined' ? QZS_USERS : []),
    offices: deep(typeof QZS_OFFICES !== 'undefined' ? QZS_OFFICES : []),
    fees: deep(typeof QZS_FEES !== 'undefined' ? QZS_FEES : []),
    templates: deep(typeof QZS_TEMPLATES !== 'undefined' ? QZS_TEMPLATES : { order: [], workflow: [], document: [] }),
    integrations: deep(typeof QZS_INTEGRATIONS !== 'undefined' ? QZS_INTEGRATIONS : []),
    accounts: deep(typeof QZS_ACCOUNTS !== 'undefined' ? QZS_ACCOUNTS : []),
    auditLog: deep(typeof QZS_AUDIT !== 'undefined' ? QZS_AUDIT : []),
    pospay: deep(typeof QZS_POSPAY !== 'undefined' ? QZS_POSPAY : []),
    reconciliations: deep(typeof QZS_RECONCILIATIONS !== 'undefined' ? QZS_RECONCILIATIONS : []),
    wireLog: deep(typeof QZS_WIRE_LOG !== 'undefined' ? QZS_WIRE_LOG : []),
    alta: deep(typeof QZS_ALTA !== 'undefined' ? QZS_ALTA : []),
    permissions: deep(typeof QZS_PERMISSIONS !== 'undefined' ? QZS_PERMISSIONS : []),
    security: deep(typeof QZS_SECURITY !== 'undefined' ? QZS_SECURITY : []),
    notifications: deep(typeof QZS_NOTIFICATIONS !== 'undefined' ? QZS_NOTIFICATIONS : [])
  };
  qzEnrichOrders(seed.orders);
  /* Charges first: the money generator reads the statement to know what a
     file actually has to pay out. qzDB is pointed at the lines here because
     the generators call qzChargeLines, which reads through qzList. */
  seed.chargeLines = qzBuildChargeLines(seed.orders);
  qzDB.chargeLines = seed.chargeLines;
  qzBuildMoney(seed);
  /* Catalogue last: it reads the widened order, and nothing reads it back. */
  seed.titleExceptions = qzBuildTitleExceptions(seed.orders);
  qzBuildCatalog(seed);
  return seed;
}

function qzHydrate() {
  /* Before anything is generated or copied: the builders below read QZ_TODAY while they
     decide statuses, so the data has to agree with the clock first. */
  qzShiftWorldTime();
  if (!QZ_SEED) {
    QZ_SEED = qzBuildSeed();
  }
  qzResetIdCounters();
  for (const k in QZ_SEED) {
    if (Array.isArray(QZ_SEED[k])) {
      qzDB[k] = JSON.parse(JSON.stringify(QZ_SEED[k]));
    } else if (typeof QZ_SEED[k] === 'object' && QZ_SEED[k] !== null) {
      qzDB[k] = JSON.parse(JSON.stringify(QZ_SEED[k]));
    } else {
      qzDB[k] = QZ_SEED[k];
    }
  }
}

/* ---------- The 5 Access Functions (qzList, qzFind, qzInsert, qzUpdate, qzRemove) ---------- */
function qzList(coll, filterFn) {
  const item = qzDB[coll];
  if (!item) return [];
  let list = [];
  if (Array.isArray(item)) {
    list = item;
  } else if (typeof item === 'object' && item !== null) {
    list = Object.keys(item).flatMap(k => Array.isArray(item[k]) ? item[k].map(x => Object.assign({ category: k }, x)) : []);
  }
  if (typeof filterFn === 'function') {
    return list.filter(filterFn);
  }
  return list.slice();
}

function qzFind(coll, idOrPredicate) {
  const list = qzList(coll);
  if (typeof idOrPredicate === 'function') {
    return list.find(idOrPredicate) || null;
  }
  return list.find(item => {
    if (!item) return false;
    if (item.id !== undefined && String(item.id) === String(idOrPredicate)) return true;
    if (item.num !== undefined && String(item.num) === String(idOrPredicate)) return true;
    if (item.name !== undefined && String(item.name) === String(idOrPredicate)) return true;
    if (item.email !== undefined && String(item.email) === String(idOrPredicate)) return true;
    return false;
  }) || null;
}

function qzNextId(coll) {
  _qzIdCounters[coll] = (_qzIdCounters[coll] || 1000) + 1;
  const num = _qzIdCounters[coll];
  if (coll === 'orders') return `ORD-2026-${num}`;
  if (coll === 'tasks') return `t-${num}`;
  if (coll === 'documents') return `doc-${num}`;
  if (coll === 'parties') return `p-${num}`;
  if (coll === 'vendors') return `v-${num}`;
  if (coll === 'notes') return `n-${num}`;
  if (coll === 'threads') return `th-${num}`;
  if (coll === 'messages') return `msg-${num}`;
  if (coll === 'contacts') return `c-${num}`;
  if (coll === 'events') return `ev-${num}`;
  if (coll === 'receipts') return `R-${num}`;
  if (coll === 'disbursements') return `CK-${num}`;
  if (coll === 'invoices') return `INV-${num}`;
  if (coll === 'exceptions') return `EX-${num}`;
  if (coll === 'cpls') return `CPL-${num}`;
  if (coll === 'offices') return `off-${num}`;
  if (coll === 'fees') return `fee-${num}`;
  if (coll === 'users') return `u-${num}`;
  if (coll === 'templates') return `tpl-${num}`;
  return `${coll}-${num}`;
}

function qzLogAudit(action, object, orderId) {
  const auditCount = (qzDB.auditLog ? qzDB.auditLog.length : 0);
  const min = String((15 + auditCount) % 60).padStart(2, '0');
  const sec = String((auditCount * 7) % 60).padStart(2, '0');
  const entry = {
    ts: `${QZ_TODAY} 09:${min}:${sec}`,
    user: 'Training User',
    action: action,
    object: object || '—',
    order: orderId || (qzState && qzState.orderId) || '—',
    ip: '198.51.100.24'
  };
  if (!qzDB.auditLog) qzDB.auditLog = [];
  qzDB.auditLog.unshift(entry);
}

function qzInsert(coll, record) {
  if (!qzDB[coll]) qzDB[coll] = [];
  const item = Object.assign({}, record);
  if (item.id === undefined || item.id === null) {
    item.id = qzNextId(coll);
  }
  qzDB[coll].push(item);
  qzLogAudit('CREATE', `${coll.slice(0, -1)} ${item.id || item.name || item.num || ''}`);
  return item;
}

function qzUpdate(coll, id, patch) {
  const item = qzFind(coll, id);
  if (!item) return null;
  Object.assign(item, patch);
  qzLogAudit('UPDATE', `${coll.slice(0, -1)} ${item.id || item.name || item.num || id}`);
  return item;
}

function qzRemove(coll, id) {
  if (!qzDB[coll]) return false;
  const idx = qzDB[coll].findIndex(item => {
    if (!item) return false;
    if (item.id !== undefined && String(item.id) === String(id)) return true;
    if (item.num !== undefined && String(item.num) === String(id)) return true;
    if (item.name !== undefined && String(item.name) === String(id)) return true;
    if (item.email !== undefined && String(item.email) === String(id)) return true;
    return false;
  });
  if (idx === -1) return false;
  const removed = qzDB[coll].splice(idx, 1)[0];
  qzLogAudit('DELETE', `${coll.slice(0, -1)} ${removed.id || removed.name || removed.num || id}`);
  return true;
}

let qzState = {
  view: 'orders', orderId: null, orderTab: 'overview', deTab: 'property', threadId: null,
  composeId: null,   // a compose exercise the trainee opened by hand from the thread list
  scenarioId: null, orderFilter: '', lessonId: null, examIndex: 0,
  railOpen: false,     // narrow-screen only: is the order rail showing as an overlay drawer?
  openOrders: [],      // Core keeps several files open at once (see qzRenderOrderTabs)
  orderViews: {},      // per-order view state, so switching tabs restores where you were
  panel: { chat: true, tasks: true, help: true, notes: false },
  homeTab: 'orders',   // which chip of the Home strip is showing (see qzHomeHTML)
  reviewOrderId: null, // which order the Document Review course screen is working (see qzGotoReview)
  pendingRevFix: null, // a review whose correction is being made on the real screen (qzRevGoFix)
  pendingRevDoc: null, // a review whose source document is being fetched from Documents (qzRevGoDoc)
  pendingRecDoc: null, // { recId, docId } — a reconcile whose source doc is being fetched from Documents (qzRecGoDoc)
  pendingRecFix: null, // { recId, rowId } — a reconcile row whose correction is being made on the real screen
  pendingWalk: null,   // { lessonId, stepIndex } read back by qzRestoreNav, consumed once by qzEnter
  qzMode: 'sandbox'   // 'sandbox' | 'lesson'
};

const QZ_NAV_KEY = 'qz_nav_v1';

/* Only the navigation slice. Anything derived, or anything that would be wrong to
   restore into a rebuilt qzDB, is left out. */
function qzSaveNav() {
  try {
    const w = (window.SimEngine && SimEngine.walkState && SimEngine.walkState()) || null;
    sessionStorage.setItem(QZ_NAV_KEY, JSON.stringify({
      view: qzState.view, orderId: qzState.orderId, orderTab: qzState.orderTab,
      deTab: qzState.deTab, threadId: qzState.threadId, composeId: qzState.composeId,
      openOrders: qzState.openOrders, orderViews: qzState.orderViews,
      lessonId: qzState.lessonId, reviewOrderId: qzState.reviewOrderId,
      homeTab: qzState.homeTab, panel: qzState.panel, qzMode: qzState.qzMode,
      docFolder: qzDocActiveFolder,
      walk: w ? { lessonId: w.lessonId, stepIndex: w.stepIndex } : null
    }));
  } catch (e) { /* private mode, quota — never worth breaking a render over */ }
}

/* Validated against the live qzDB rather than trusted: the seed is rebuilt on every load,
   so a stored id can point at a row that no longer exists (after Reset course, or a data
   change between deploys). Anything that does not resolve is dropped, not restored. */
function qzRestoreNav() {
  let p = null;
  try { p = JSON.parse(sessionStorage.getItem(QZ_NAV_KEY) || 'null'); } catch (e) { p = null; }
  if (!p) return false;

  const liveOrder = id => !!(id && qzFind('orders', id));
  qzState.openOrders = (p.openOrders || []).filter(liveOrder);
  qzState.orderViews = p.orderViews || {};
  qzState.panel = p.panel || qzState.panel;
  qzState.homeTab = p.homeTab || qzState.homeTab;
  qzState.qzMode = p.qzMode || qzState.qzMode;
  qzState.lessonId = (p.lessonId && typeof QZ_LESSONS !== 'undefined'
    && QZ_LESSONS.some(l => l.id === p.lessonId)) ? p.lessonId : null;
  if (p.docFolder) qzDocActiveFolder = p.docFolder;

  if (p.view === 'order' && liveOrder(p.orderId)) {
    qzState.orderId = p.orderId;
    qzState.orderTab = p.orderTab || 'overview';
    qzState.deTab = p.deTab || 'property';
    qzState.threadId = p.threadId != null ? p.threadId : null;
    qzState.composeId = p.composeId || null;
    qzState.view = 'order';
  } else if (p.view === 'review' && liveOrder(p.reviewOrderId)) {
    qzState.reviewOrderId = p.reviewOrderId;
    qzState.view = 'review';
  } else if (p.view && p.view !== 'order' && p.view !== 'review') {
    qzState.view = p.view;
  } else {
    return false;
  }

  qzState.pendingWalk = (p.walk && qzState.lessonId === p.walk.lessonId) ? p.walk : null;
  return true;
}

/* simWalkStart always opens at step 0. Restoring the index and re-running that step's own
   setup() is what puts the trainee back on the screen the step is about — and because
   setup() is also what opens the question dialog, the popup comes back with it. */
function qzResumeWalk(w) {
  if (!w || !window.SimEngine || !SimEngine.walkStart) return;
  SimEngine.walkStart(w.lessonId);
  const st = SimEngine.walkState();
  const l = SimEngine.currentLesson();
  if (!st || !l || !l.steps[w.stepIndex]) return;
  st.stepIndex = w.stepIndex;
  st.tourIndex = null;
  st.stepDoneFired = false;
  const step = l.steps[w.stepIndex];
  if (step.walk && step.walk.setup) step.walk.setup();
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { SimEngine.sync(); });
  });
}

function qzLoad() {
  try {
    const raw = localStorage.getItem(QZ_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
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

/* One-time backfill for progress saved before checklist keys became lesson-scoped */
function qzMigrateChecklistScope() {
  if (typeof QZ_LESSONS === 'undefined') return;
  if (!qzStore.checklistScoped) {
    QZ_LESSONS.forEach(l => {
      if (!qzStore.lessonsDone[l.id]) return;
      l.steps.forEach(s => {
        if (s.type !== 'do' || !s.orderId) return;
        if (qzStore.checklist[s.checklistId]) qzStore.checklist[qzScopedChecklistKey(s.checklistId, s.orderId)] = true;
      });
    });
    qzStore.checklistScoped = true;
  }
  if (!qzStore.checklistLessonScoped) {
    QZ_LESSONS.forEach(l => {
      if (!qzStore.lessonsDone[l.id]) return;
      l.steps.forEach(s => {
        if (s.type !== 'do') return;
        var oldKey = qzScopedChecklistKey(s.checklistId, s.orderId);
        if (qzStore.checklist[oldKey] || qzStore.checklist[s.checklistId]) {
          qzStore.checklist[qzScopedChecklistKey(s.checklistId, s.orderId, l.id)] = true;
        }
      });
    });
    qzStore.checklistLessonScoped = true;
  }
  if (!qzStore.itemsLessonScoped) {
    QZ_LESSONS.forEach(l => {
      if (!qzStore.lessonsDone[l.id]) return;
      l.steps.forEach(s => {
        if (s.type === 'verify' && qzStore.reviews[s.reviewId]) {
          qzStore.reviews[`${s.reviewId}#${l.id}`] = Object.assign({}, qzStore.reviews[s.reviewId]);
        } else if (s.type === 'reconcile' && qzStore.reconciles[s.reconcileId]) {
          qzStore.reconciles[`${s.reconcileId}#${l.id}`] = Object.assign({}, qzStore.reconciles[s.reconcileId]);
        } else if (s.type === 'decide' && qzStore.scenarios[s.scenarioId]) {
          qzStore.scenarios[`${s.scenarioId}#${l.id}`] = Object.assign({}, qzStore.scenarios[s.scenarioId]);
        } else if (s.type === 'compose' && qzStore.composes[s.composeId]) {
          qzStore.composes[`${s.composeId}#${l.id}`] = Object.assign({}, qzStore.composes[s.composeId]);
        }
      });
    });
    qzStore.itemsLessonScoped = true;
  }
  qzSave();
}

function qzScopedChecklistKey(id, orderId, lessonId) {
  var key = id;
  if (orderId) key += '@' + orderId;
  if (lessonId) key += '#' + lessonId;
  return key;
}

function qzScopedItemKey(id, lessonId) {
  if (!id) return id;
  const lid = lessonId || qzState.lessonId;
  return lid ? `${id}#${lid}` : id;
}

/* Text-entry dialog, sibling of qzConfirm below.

   It replaces the three window.prompt() calls this file used to make. prompt() is a browser
   dialog: it looks nothing like the rest of Core, it cannot be styled, and it is refused
   outright inside a sandboxed iframe or an embedded webview - where the button simply does
   nothing and the trainee is left clicking a control that appears broken. A sweep of 1,876
   clicks across the order screens found those three as the only remaining runtime failures. */
function qzPrompt(opts) {
  const modal = document.createElement('div');
  modal.id = 'qzPromptModalWrap';
  modal.className = 'qz-modal-backdrop';
  modal.innerHTML = `
    <div class="qz-modal-card">
      <div class="qz-modal-head">
        <h3>${esc(opts.title || 'Enter a value')}</h3>
        <button type="button" class="qz-modal-close" onclick="document.getElementById('qzPromptModalWrap').remove()">&times;</button>
      </div>
      <div class="qz-modal-body">
        <div class="qz-field wide">
          <label for="qzPromptInput">${esc(opts.label || 'Value')}</label>
          <input type="text" id="qzPromptInput" value="${escAttr(opts.value || '')}" placeholder="${escAttr(opts.placeholder || '')}">
        </div>
        ${opts.hint ? `<p class="qz-note">${esc(opts.hint)}</p>` : ''}
      </div>
      <div class="qz-modal-foot">
        <button type="button" class="qz-btn" onclick="document.getElementById('qzPromptModalWrap').remove()">Cancel</button>
        <button type="button" class="qz-btn primary" id="qzBtnPromptModal">${esc(opts.confirmLabel || 'Save')}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const input = document.getElementById('qzPromptInput');
  const submit = () => {
    const value = input ? input.value.trim() : '';
    if (!value) { simToast('Type a value first.'); return; }
    modal.remove();
    if (opts.onSubmit) opts.onSubmit(value);
  };
  document.getElementById('qzBtnPromptModal').onclick = submit;
  /* Enter submits, the way the browser dialog it replaces did. */
  if (input) {
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    setTimeout(() => { input.focus(); input.select(); }, 0);
  }
}

/* Modal confirmation dialog (Type B) */
function qzConfirm(opts) {
  const existing = document.getElementById('qzConfirmModalWrap');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'qzConfirmModalWrap';
  modal.className = 'qz-modal-backdrop';
  modal.style.zIndex = '99999';
  modal.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph">
        <h4>${esc(opts.title || 'Confirm Action')}</h4>
        <button type="button" class="qz-btn sm close-btn">&times;</button>
      </div>
      <div style="padding:16px 18px;font-size:13.5px;line-height:1.5;color:var(--qz-ink)">
        <p style="margin:0">${esc(opts.body || 'Are you sure you want to proceed?')}</p>
        ${opts.list ? `<ul style="margin:10px 0 0 18px">${opts.list.map(it => `<li>${esc(it)}</li>`).join('')}</ul>` : ''}
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button type="button" class="qz-btn cancel-btn">${esc(opts.cancelLabel || 'Cancel')}</button>
        <button type="button" class="qz-btn ${opts.danger ? 'danger' : 'primary'} confirm-btn">${esc(opts.confirmLabel || 'Confirm')}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('.close-btn');
  const cancelBtn = modal.querySelector('.cancel-btn');
  const confirmBtn = modal.querySelector('.confirm-btn');

  if (closeBtn) closeBtn.onclick = () => modal.remove();
  if (cancelBtn) cancelBtn.onclick = () => modal.remove();
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      modal.remove();
      if (typeof opts.onConfirm === 'function') opts.onConfirm();
    };
  }
}

/* Reset EVERYTHING: coursework, orders, modified documents, and world state to factory clean state. */
function qzResetSandbox() {
  qzConfirm({
    title: 'Reiniciar Sandbox',
    body: '¿Deseas reiniciar el Sandbox? Se restablecerán todos los expedientes, documentos y el progreso del curso al estado inicial.',
    confirmLabel: 'Reiniciar Sandbox',
    danger: true,
    onConfirm: () => {
      if (window.SimEngine && SimEngine.walkActive && SimEngine.walkActive()) {
        if (window.simWalkExit) simWalkExit(true);
      }
      try { localStorage.removeItem(QZ_LS_KEY); } catch (e) {}
      try { sessionStorage.removeItem(QZ_NAV_KEY); } catch (e) {}
      qzStore = qzDefaultStore();
      qzHydrate();
      qzState.lessonId = null;
      qzState.openOrders = [];
      qzState.orderId = null;
      qzState.threadId = null;
      qzState.composeId = null;
      qzAsk = null;
      qzAskLast = null;
      qzState.view = 'orders';
      qzSave();
      simToast('Sandbox y progreso del curso restablecidos al estado inicial.', { tone: 'good' });
      qzSyncTopTabs();
      qzRenderRoot();
    }
  });
}

function qzResetCourse() {
  qzResetSandbox();
}

function qzSetMode(mode) {
  qzState.qzMode = mode;
  qzSyncModeSwitch();
  qzRenderRoot();
}

function qzSyncModeSwitch() {
  const wrap = document.getElementById('qzModeSwitch');
  if (wrap) {
    wrap.style.display = 'none'; // Mode switch removed in favor of automatic lesson state
  }
}

function qzMark(id) {
  if (!qzState.lessonId) return;

  const l = typeof QZ_LESSONS !== 'undefined' && QZ_LESSONS.find(x => x.id === qzState.lessonId);
  const matchStep = l && l.steps.find(s => s.type === 'do' && s.checklistId === id &&
    (!s.orderId || s.orderId === qzState.orderId));
  const keyOrderId = matchStep ? matchStep.orderId : qzState.orderId;

  const lessonKey = qzScopedChecklistKey(id, keyOrderId, qzState.lessonId);
  const alreadyDone = !!qzStore.checklist[lessonKey];
  if (!alreadyDone) {
    qzStore.checklist[id] = true;
    qzStore.checklist[lessonKey] = true;
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



/* ---------- data lookups (reads directly from qzDB) ---------- */
function qzDocsForOrder(orderId) {
  return qzList('documents', d => d.orderId === orderId);
}
function qzDocStatus(d) {
  if (!d) return '';
  return typeof d === 'object' ? (d.status || '') : (qzFind('documents', d)?.status || '');
}
function qzTasksForOrder(orderId) {
  return qzList('tasks', t => t.relatedOrderId === orderId);
}
function qzTaskStatus(t) {
  if (!t) return '';
  return typeof t === 'object' ? (t.status || '') : (qzFind('tasks', t)?.status || '');
}

/* ---------- per-order layer (direct reads and writes to qzDB) ---------- */
function qzBaseOrder(orderId) {
  return qzFind('orders', orderId);
}
function qzAllOrders() {
  return qzList('orders');
}
function qzGetOrder(orderId) {
  return qzFind('orders', orderId);
}
function qzSetPartyOverride(orderId, role, patch) {
  const o = qzFind('orders', orderId);
  if (o && o.parties) {
    const p = o.parties.find(x => x.role === role);
    if (p) {
      Object.assign(p, patch);
      qzLogAudit('UPDATE', `Party ${role} in ${orderId}`);
    }
  }
}
/* Explicit list, never guessed by regex: these order fields are consumed as numbers
   (fmtMoney, Number(), arithmetic in Accounting). A trainee typing a perfectly reasonable
   "$425.00" into a correction field used to be stored verbatim, and Number("$425.00") is
   NaN, which rendered "$NaN" rows and an NaN total in Accounting. Every write path that can
   set one of these goes through qzCoerceFieldValue. */
const QZ_NUMERIC_FIELDS = ['purchasePrice', 'loanAmount', 'inspectionCharge', 'earnestAmount'];
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
  const o = qzFind('orders', orderId);
  if (o) {
    o[field] = qzCoerceFieldValue(field, value);
    qzLogAudit('UPDATE', `Order ${orderId} field ${field}`);
  }
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
  if (!QZ_SEED) return;
  const seedOrder = QZ_SEED.orders.find(x => x.id === orderId);
  const o = qzFind('orders', orderId);
  if (o && o.parties && seedOrder && seedOrder.parties) {
    const seedParty = seedOrder.parties.find(x => x.role === role);
    const p = o.parties.find(x => x.role === role);
    if (p && seedParty && field in seedParty) {
      p[field] = seedParty[field];
    }
  }
}
function qzClearScalarOverride(orderId, field) {
  if (!QZ_SEED) return;
  const seedOrder = QZ_SEED.orders.find(x => x.id === orderId);
  const o = qzFind('orders', orderId);
  if (o && seedOrder && field in seedOrder) {
    o[field] = seedOrder[field];
  }
}

/* Wipes an item's working state but keeps firstAttempt. Replaying a lesson is practice; it
   must not be able to overwrite the answer the trainee actually gave the first time, which is
   what the recorded grade is derived from. */
function qzResetItemState(bag, id) {
  const prev = bag[id];
  if (prev && prev.firstAttempt) bag[id] = { firstAttempt: prev.firstAttempt };
  else delete bag[id];
}

/* Restores seeded rows from QZ_SEED rather than re-asserting a literal. Re-asserting is how
   the Lesson 5 undo came to set task 7 to 'In Progress' - a status that task never had: it
   is 'Open' in the seed, so "restart the lesson" left the file in a state the first run
   never started from. */
function qzRestoreSeedRows(coll, match) {
  const seed = (QZ_SEED && QZ_SEED[coll]) || [];
  seed.filter(match).forEach(function (row) {
    const live = qzFind(coll, row.id);
    if (live) Object.assign(live, JSON.parse(JSON.stringify(row)));
  });
}

/* A reply the trainee sends is an INSERTED row, not a mutated one, so restoring cannot
   reach it - it has to be dropped and the seeded mirror put back. */
function qzRestoreSeedMessages(orderId) {
  const seed = (QZ_SEED && QZ_SEED.messages) || [];
  const ids = qzList('threads', t => t.orderId === orderId).map(t => String(t.id));
  const mine = m => ids.indexOf(String(m.threadId)) > -1;
  qzDB.messages = (qzDB.messages || []).filter(m => !mine(m))
    .concat(seed.filter(mine).map(m => JSON.parse(JSON.stringify(m))));
}

/* Undoes the world-state changes a lesson makes, so a replay starts where the first run did. */
const QZ_LESSON_UNDO = {
  // Keyed by lesson id, so it has to move whenever lessons merge. The data-entry steps now
  // live in Orientation and the task steps in the tasks/closing lesson; the world-state each
  // one dirties has not changed, only the lesson that owns it.
  'l01-orientation': () => qzClearPartyOverride('ORD-2026-1483', 'Buyer', 'phone'),
  'l03-documents': () => qzRestoreSeedRows('documents', d => String(d.id) === '3'),
  // Lesson 4 leaves the trainee's own reply on thread 3; this used to be a no-op, so a
  // restart replayed the lesson with the previous run's reply still in the thread.
  'l04-communication': () => qzRestoreSeedMessages('ORD-2026-1398'),
  // Lesson 5 completes task 7 AND ticks documents off the Disclosures checklist, which
  // writes status:'Reviewed' through qzReviewDoc. Only the task was ever being undone, so
  // a replay met a checklist reading "Every document on this file has been reviewed" while
  // the closing-docs-outstanding scenario insisted two were still Pending.
  'l05-tasks-closing': () => {
    qzRestoreSeedRows('tasks', t => t.relatedOrderId === 'ORD-2026-1398');
    qzRestoreSeedRows('documents', d => d.orderId === 'ORD-2026-1398');
  },
  'l07-conflicting-sources': () => {
    qzRestoreSeedRows('documents', d => String(d.id) === '7');
    const o = qzFind('orders', 'ORD-2026-1512');
    if (o) { o.flag = 'missing-document'; o.stageIndex = 2; o.statusNote = 'Closing prep is on hold until the HOA Resale Certificate is received.'; }
  },
  'l10-capstone': () => {
    qzRestoreSeedRows('documents', d => String(d.id) === '7');
    const o = qzFind('orders', 'ORD-2026-1512');
    if (o) { o.flag = 'missing-document'; o.stageIndex = 2; o.statusNote = 'Closing prep is on hold until the HOA Resale Certificate is received.'; }
  }
};

/* Auto-repair helper to detect and restore orders referenced in lessons */
function qzOrderHasDemoEdits(orderId) {
  if (!QZ_SEED) return false;
  const seedOrder = QZ_SEED.orders.find(o => o.id === orderId);
  const currOrder = qzFind('orders', orderId);
  if (!seedOrder || !currOrder) return true;
  if (JSON.stringify(seedOrder) !== JSON.stringify(currOrder)) return true;
  const seedDocs = QZ_SEED.documents.filter(d => d.orderId === orderId);
  const currDocs = qzList('documents', d => d.orderId === orderId);
  if (JSON.stringify(seedDocs) !== JSON.stringify(currDocs)) return true;
  const seedTasks = QZ_SEED.tasks.filter(t => t.relatedOrderId === orderId);
  const currTasks = qzList('tasks', t => t.relatedOrderId === orderId);
  if (JSON.stringify(seedTasks) !== JSON.stringify(currTasks)) return true;
  return false;
}

function qzRestoreOrder(orderId) {
  if (!QZ_SEED) return;
  const seedOrder = QZ_SEED.orders.find(o => o.id === orderId);
  if (!seedOrder) return;
  const currIdx = qzDB.orders.findIndex(o => o.id === orderId);
  if (currIdx !== -1) {
    qzDB.orders[currIdx] = JSON.parse(JSON.stringify(seedOrder));
  } else {
    qzDB.orders.push(JSON.parse(JSON.stringify(seedOrder)));
  }

  qzDB.documents = qzDB.documents.filter(d => d.orderId !== orderId);
  const seedDocs = QZ_SEED.documents.filter(d => d.orderId === orderId);
  seedDocs.forEach(d => qzDB.documents.push(JSON.parse(JSON.stringify(d))));

  qzDB.tasks = qzDB.tasks.filter(t => t.relatedOrderId !== orderId);
  const seedTasks = QZ_SEED.tasks.filter(t => t.relatedOrderId === orderId);
  seedTasks.forEach(t => qzDB.tasks.push(JSON.parse(JSON.stringify(t))));

  qzDB.threads = qzDB.threads.filter(m => m.orderId !== orderId);
  const seedThreads = QZ_SEED.threads.filter(m => m.orderId === orderId);
  seedThreads.forEach(m => qzDB.threads.push(JSON.parse(JSON.stringify(m))));

  qzRestoreSeedMessages(orderId);

  qzDB.notes = qzDB.notes.filter(n => n.orderId !== orderId);
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
    if (s.reconcileId) {
      const r = qzRecLookup(s.reconcileId);
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

/* Clears one lesson so it can be run again. Deletes only keys scoped to this lessonId so
   shared items in other lessons are never affected. */
function qzResetLesson(lessonId) {
  const l = QZ_LESSONS.find(x => x.id === lessonId);
  if (!l) return;
  l.steps.forEach(step => {
    if (step.type === 'do') {
      delete qzStore.checklist[step.checklistId];
      delete qzStore.checklist[qzScopedChecklistKey(step.checklistId, step.orderId)];
      delete qzStore.checklist[qzScopedChecklistKey(step.checklistId, step.orderId, lessonId)];
    }
    else if (step.type === 'decide') {
      delete qzStore.scenarios[`${step.scenarioId}#${lessonId}`];
    }
    else if (step.type === 'verify') {
      qzUndoItemWrite(qzReviewLookup(step.reviewId));
      delete qzStore.reviews[`${step.reviewId}#${lessonId}`];
    } else if (step.type === 'reconcile') {
      delete qzStore.reconciles[`${step.reconcileId}#${lessonId}`];
    } else if (step.type === 'compose') {
      delete qzStore.composes[`${step.composeId}#${lessonId}`];
    }
  });
  delete qzStore.lessonsDone[lessonId];
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
    <div class="mark"><img src="Images-resourses/brand/qualia-mark.svg" alt=""><span class="wordmark">Qualia</span></div>
    <h1>Log in to Qualia</h1>
    <p>Training environment, no real credentials needed.</p>
    <div class="fld"><label>Email</label><input type="text" value="${esc(email)}" readonly></div>
    <div class="fld"><label>Password</label><input type="password" value="••••••••••" readonly></div>
    <button type="button" onclick="qzEnter()">Log In</button>
    <div class="qz-login-note">Training only. Nothing here is connected to a real Qualia account.</div>
  </div></div>`;
}
function qzEnter() {
  if (!qzDB.orders || qzDB.orders.length === 0) {
    qzHydrate();
  }
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const label = document.getElementById('qzUserLabel');
  const av = document.getElementById('qzUserAvatar');
  if (su && su.name) {
    if (label) label.textContent = su.name.split(' ')[0];
    if (av) av.textContent = (su.avatar || su.name.charAt(0)).toUpperCase();
  } else {
    if (label) label.textContent = 'Alex';
    if (av) av.textContent = 'A';
  }
  document.getElementById('qzTopbar').style.display = 'flex';
  document.getElementById('qzLoginWrap').style.display = 'none';
  document.getElementById('qzRoot').style.display = '';
  qzSyncModeSwitch();
  qzRenderCoreSections();
  const resumed = qzRestoreNav();
  if (resumed) {
    qzSyncTopTabs();
    qzRenderRoot();
    if (qzState.pendingWalk) { const w = qzState.pendingWalk; qzState.pendingWalk = null; qzResumeWalk(w); }
  } else {
    qzGoto('orders');
  }
  qzUpdateBellBadge();
  /* First login only, unless ?tour=1 forces it. On normal page reload (F5), the tour must NOT pop up. */
  let isReload = false;
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries && navEntries.length > 0) {
      isReload = navEntries[0].type === 'reload';
    } else if (window.performance && window.performance.navigation) {
      isReload = window.performance.navigation.type === 1;
    }
  } catch (e) { isReload = false; }

  let forceTour = false;
  try { forceTour = new URLSearchParams(location.search).get('tour') === '1'; } catch (e) { forceTour = false; }

  const wanted = forceTour || (!qzStore.tourSeen && !resumed && !isReload);
  if (wanted && !qzStore.tourOptOut && window.qzTourStart) setTimeout(qzTourStart, 350);
}

/* ---------- notification bell & personal tasks (D1) ----------
   Navigation rationale for 'My Tasks', REVISED 2026-08-27 against a real screenshot of the
   product supplied by the team (superseding the earlier guess recorded here):

   The Qualia logo is a button. It opens a HOME landing whose breadcrumb reads 'Home' and
   which carries a strip of five chips — Orders | Order Queue | Action Queue | Tasks |
   Notifications <n>. So the personal task queue does have a first-class home in the product;
   it simply is not a top-bar section. The top bar itself is left untouched: the screenshot
   came from a tenant whose bar reads 'Clear · Orders · Contacts · Calendar · Reports', which
   conflicts with core-charges-section-b.png and would strand Accounting/Compliance/Admin.

   My Tasks therefore lives at Home -> Tasks, and every earlier entry point still lands there:
   the bell ('View All'), the right-rail empty state link ('assigned any tasks') and
   qzGotoMyTasks(). Order Queue and Action Queue are rendered but disabled: they exist in the
   product, nobody here has seen inside them, and inventing two screens is worse than an
   honest 'not simulated'. */
function qzOpenTasks() {
  return qzList('tasks', t => qzTaskStatus(t) !== 'Complete' && /you/i.test(t.assignedTo || ''));
}
/* ---------- Qualia Core Topbar Interactive Dropdowns & Drawers ---------- */
let qzDocTab = 'templates'; // 'templates' | 'recent'
let qzDocSearchQuery = '';
let qzBellTab = 'activity'; // 'activity' | 'tasks'
let qzMsgFilter = 'all'; // 'all' | 'unread'
let qzMsgSearchQuery = '';

function qzCloseAllTopbarDropdowns() {
  document.querySelectorAll('.qz-topbar-dropdown, .qz-bell-dropdown').forEach(el => {
    el.classList.remove('open');
  });
}
document.addEventListener('click', () => qzCloseAllTopbarDropdowns());
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') qzCloseAllTopbarDropdowns();
});

let qzUnreadAlertsCount = 8;
let qzUnreadThreadsCount = 3;

function qzUpdateBellBadge() {
  const openTasks = qzList('tasks', t => qzTaskStatus(t) !== 'Complete' && /you/i.test(t.assignedTo || ''));
  const totalNotifications = qzUnreadAlertsCount + openTasks.length;
  const badge = document.querySelector('#qzBell .n') || document.getElementById('qzBellBadge');
  if (badge) {
    badge.textContent = totalNotifications;
    badge.style.display = totalNotifications > 0 ? 'flex' : 'none';
  }
  const threads = qzList('threads') || [];
  const activeUnreadThreads = Math.min(qzUnreadThreadsCount, threads.length);
  const mail = document.getElementById('qzMailBadge');
  if (mail) {
    mail.textContent = activeUnreadThreads;
    mail.style.display = activeUnreadThreads > 0 ? 'flex' : 'none';
  }
}

/* ---------- 1. Document Center (📄) ---------- */
function qzToggleDocDropdown(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById('qzDocDropdown');
  if (!dd) return;
  const opening = !dd.classList.contains('open');
  qzCloseAllTopbarDropdowns();
  if (opening) {
    qzRenderDocDropdown();
    dd.classList.add('open');
  }
}

function qzSetDocTab(tab) {
  qzDocTab = tab;
  qzRenderDocDropdown();
}

function qzFilterDocSearch(val) {
  qzDocSearchQuery = (val || '').toLowerCase().trim();
  qzRenderDocDropdown();
}

function qzQuickGenTemplate(tplName) {
  const curOrderId = qzState.orderId || (qzDB.orders && qzDB.orders[0] && qzDB.orders[0].id) || '2021-1470';
  const o = qzGetOrder(curOrderId);
  if (!o) return;

  const fn = QZ_DOC_TEMPLATES[tplName];
  if (fn) {
    const html = qzRenderTemplatedDoc({ name: tplName, template: tplName, orderId: o.id }, o);
    if (html) {
      qzMark('docs-download');
      try {
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        simViewDoc(url, tplName + ' — Order #' + o.id);
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        qzCloseAllTopbarDropdowns();
        return;
      } catch (err) {}
    }
  }

  const matchDocs = qzList('documents', doc => doc.orderId === o.id && (doc.name.includes(tplName) || (doc.template && doc.template.includes(tplName))));
  if (matchDocs.length > 0 && matchDocs[0].file) {
    qzOpenDocFile(matchDocs[0].file, matchDocs[0].name);
    qzCloseAllTopbarDropdowns();
    return;
  }

  simToast('Generated ' + tplName + ' for Order #' + curOrderId);
  qzCloseAllTopbarDropdowns();
}

function qzRenderDocDropdown() {
  const dd = document.getElementById('qzDocDropdown');
  if (!dd) return;

  const activeOrder = qzState.orderId ? qzGetOrder(qzState.orderId) : (qzDB.orders && qzDB.orders[0]);
  const activeOrderLabel = activeOrder ? `#${activeOrder.id} · ${activeOrder.propertyAddress}` : 'No order open';

  const templates = [
    { name: 'ALTA Settlement Statement (Combined)', desc: 'Combined buyer & seller settlement closing statement' },
    { name: 'Closing Disclosure', desc: 'Standard CFPB TILA-RESPA Closing Disclosure (CD)' },
    { name: 'Title Commitment', desc: 'Schedules A, B-I Requirements and B-II Exceptions' },
    { name: 'Source Deed', desc: 'Warranty Deed / Transfer Deed for title conveyance' },
    { name: 'Wiring Instructions', desc: 'Escrow account wire instructions with fraud notice' },
    { name: 'Escrow Agreement', desc: 'Standard escrow closing agreement and instructions' },
    { name: 'Payoff Statement', desc: 'Mortgage & lien payoff statement with daily per diem' },
    { name: 'Notice of Availability of Title Insurance', desc: 'Owner and loan policy notification' }
  ];

  let bodyHTML = '';
  if (qzDocTab === 'templates') {
    const tplCards = templates.map(t => `
      <div class="qz-doc-tpl-card">
        <div>
          <div class="qz-doc-tpl-name">${esc(t.name)}</div>
          <div class="qz-doc-tpl-desc">${esc(t.desc)}</div>
        </div>
        <button type="button" class="qz-doc-tpl-btn" onclick="qzQuickGenTemplate('${escAttr(t.name)}')">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3v5h5M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/></svg>
          Generate &amp; Preview
        </button>
      </div>`).join('');

    bodyHTML = `
      <div class="qz-dd-order-context">
        <span><b>Active Order Target:</b> ${esc(activeOrderLabel)}</span>
        <span style="font-size:10.5px;color:#059669;">Pre-filled from ledger &amp; parties</span>
      </div>
      <div class="qz-dd-body" style="max-height:460px;overflow-y:auto;padding:0">
        <div class="qz-doc-template-grid">${tplCards}</div>
      </div>`;
  } else {
    const allDocs = qzList('documents');
    const filtered = qzDocSearchQuery
      ? allDocs.filter(d => (d.name || '').toLowerCase().includes(qzDocSearchQuery) || (d.orderId || '').toLowerCase().includes(qzDocSearchQuery) || (d.type || '').toLowerCase().includes(qzDocSearchQuery))
      : allDocs.slice(0, 20);

    const docRows = filtered.map(d => {
      const glyph = QZ_DOC_GLYPH[d.type] || '&#128196;';
      return `
        <div class="qz-doc-row-item" onclick="qzOpenDocRow('${escAttr(String(d.id))}'); qzCloseAllTopbarDropdowns();">
          <div class="qz-doc-row-ic">${glyph}</div>
          <div class="qz-doc-row-info">
            <div class="qz-doc-row-title">${esc(d.name)}</div>
            <div class="qz-doc-row-meta">
              <span>Order #${esc(d.orderId)}</span>
              <span>&bull;</span>
              <span>${esc(d.type || 'General')}</span>
              <span>&bull;</span>
              <span>${fmtDate(d.date)}</span>
            </div>
          </div>
          <span class="qz-badge ${d.status === 'Reviewed' ? 'reviewed' : d.status === 'Received' ? 'received' : 'pending'}" style="font-size:10px;padding:2px 6px;">${esc(d.status || 'Received')}</span>
        </div>`;
    }).join('');

    bodyHTML = `
      <div class="qz-dd-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" placeholder="Filter ${allDocs.length} documents by name or order..." value="${escAttr(qzDocSearchQuery)}" oninput="qzFilterDocSearch(this.value)">
      </div>
      <div class="qz-dd-body">${docRows || '<div class="qz-dd-empty">No matching documents found.</div>'}</div>`;
  }

  dd.innerHTML = `
    <div class="qz-dd-header">
      <div>
        <div class="qz-dd-title">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>
          Document Center
        </div>
        <div class="qz-dd-sub">Title, escrow &amp; closing document generation</div>
      </div>
      <div class="qz-dd-actions">
        <button type="button" class="qz-dd-link-btn" onclick="qzGoto('global-docs'); qzCloseAllTopbarDropdowns();">All Documents (2,479) &raquo;</button>
      </div>
    </div>
    <div class="qz-dd-tabs">
      <button type="button" class="qz-dd-tab ${qzDocTab === 'templates' ? 'active' : ''}" onclick="qzSetDocTab('templates')">Quick Generate / Templates</button>
      <button type="button" class="qz-dd-tab ${qzDocTab === 'recent' ? 'active' : ''}" onclick="qzSetDocTab('recent')">Recent Files &amp; Search</button>
    </div>
    ${bodyHTML}`;
}

/* ---------- 2. Connect Messages Drawer (✉ 109) ---------- */
function qzToggleMessagesDropdown(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById('qzMessagesDropdown');
  if (!dd) return;
  const opening = !dd.classList.contains('open');
  qzCloseAllTopbarDropdowns();
  if (opening) {
    qzRenderMessagesDropdown();
    dd.classList.add('open');
  }
}

function qzSetMsgFilter(filter) {
  qzMsgFilter = filter;
  qzRenderMessagesDropdown();
}

function qzFilterMsgSearch(val) {
  qzMsgSearchQuery = (val || '').toLowerCase().trim();
  qzRenderMessagesDropdown();
}

function qzOpenThreadFromDropdown(threadId) {
  const t = qzFind('threads', threadId);
  if (!t) return;
  qzCloseAllTopbarDropdowns();
  if (t.orderId) {
    qzOpenOrder(t.orderId, 'connect');
    qzState.threadId = t.id;
    qzRenderRoot();
  } else {
    qzGoto('global-messages');
  }
}

function qzQuickComposeModal() {
  qzCloseAllTopbarDropdowns();
  const orders = qzDB.orders || [];
  const orderOptions = orders.map(o => `<option value="${escAttr(o.id)}">#${esc(o.id)} - ${esc(o.propertyAddress)}</option>`).join('');

  const modal = document.createElement('div');
  modal.className = 'qz-modal-wrap';
  modal.id = 'qzQuickComposeModal';
  modal.innerHTML = `
    <div class="qz-modal-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="qz-modal" style="max-width:540px;">
      <div class="qz-modal-head">
        <div class="qz-modal-title">New Connect Message</div>
        <button type="button" class="qz-modal-close" onclick="document.getElementById('qzQuickComposeModal').remove()">&times;</button>
      </div>
      <div class="qz-modal-body" style="padding:18px;">
        <div class="qz-fld" style="margin-bottom:12px;">
          <label style="font-size:11.5px;font-weight:700;color:#475569;">Target Order / File</label>
          <select id="qzComposeOrderId" class="qz-input" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;">${orderOptions}</select>
        </div>
        <div class="qz-fld" style="margin-bottom:12px;">
          <label style="font-size:11.5px;font-weight:700;color:#475569;">Recipient Party</label>
          <select id="qzComposeRecipient" class="qz-input" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;">
            <option value="Buyer">Buyer (Borrower)</option>
            <option value="Seller">Seller</option>
            <option value="Lender">Lender / Loan Officer</option>
            <option value="Agent">Real Estate Agent (Buyer / Seller)</option>
            <option value="Title Underwriter">Title Underwriter</option>
          </select>
        </div>
        <div class="qz-fld" style="margin-bottom:12px;">
          <label style="font-size:11.5px;font-weight:700;color:#475569;">Subject</label>
          <input type="text" id="qzComposeSubject" placeholder="e.g. Escrow Deposit Confirmation &amp; Wiring Instructions" class="qz-input" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;">
        </div>
        <div class="qz-fld" style="margin-bottom:12px;">
          <label style="font-size:11.5px;font-weight:700;color:#475569;">Message</label>
          <textarea id="qzComposeBody" rows="4" placeholder="Write your message to the party..." class="qz-input" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;font-family:inherit;"></textarea>
        </div>
      </div>
      <div class="qz-modal-foot" style="display:flex;justify-content:flex-end;gap:10px;padding:12px 18px;background:#f8fafc;border-top:1px solid var(--qz-line);">
        <button type="button" class="qz-btn" onclick="document.getElementById('qzQuickComposeModal').remove()">Cancel</button>
        <button type="button" class="qz-btn primary" onclick="qzSubmitQuickCompose()">Send via Connect &raquo;</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function qzSubmitQuickCompose() {
  const orderId = document.getElementById('qzComposeOrderId').value;
  const recipient = document.getElementById('qzComposeRecipient').value;
  const subject = document.getElementById('qzComposeSubject').value.trim() || 'Notice Regarding File #' + orderId;
  const body = document.getElementById('qzComposeBody').value.trim() || 'Attached documents and updates regarding the upcoming closing.';

  const newThread = qzInsert('threads', {
    orderId: orderId,
    subject: subject,
    thread: [
      { sender: 'Alex (Escrow Officer)', text: body, date: QZ_TODAY }
    ]
  });

  qzLogAudit('Connect thread initiated for Order #' + orderId + ' with ' + recipient + ': ' + subject);
  simToast('Connect message dispatched to ' + recipient + '.');
  const m = document.getElementById('qzQuickComposeModal');
  if (m) m.remove();
  qzUpdateBellBadge();
  if (qzState.orderId === orderId) qzRenderRoot();
}

function qzRenderMessagesDropdown() {
  const dd = document.getElementById('qzMessagesDropdown');
  if (!dd) return;

  const allThreads = qzList('threads');
  let filtered = allThreads;

  if (qzMsgSearchQuery) {
    filtered = filtered.filter(t => (t.subject || '').toLowerCase().includes(qzMsgSearchQuery) || (t.orderId || '').toLowerCase().includes(qzMsgSearchQuery) || (t.thread && t.thread.some(m => (m.text || '').toLowerCase().includes(qzMsgSearchQuery) || (m.sender || '').toLowerCase().includes(qzMsgSearchQuery))));
  }

  const threadRows = filtered.slice(0, 15).map((t, idx) => {
    const lastMsg = t.thread && t.thread[t.thread.length - 1];
    const sender = lastMsg ? lastMsg.sender : 'Participant';
    const text = lastMsg ? lastMsg.text : 'No message content';
    const isBuyer = /buyer|borrower/i.test(sender);
    const isSeller = /seller/i.test(sender);
    const isLender = /lender|loan|bank/i.test(sender);
    const roleClass = isBuyer ? 'buyer' : isSeller ? 'seller' : isLender ? 'lender' : 'agent';
    const initial = sender.charAt(0).toUpperCase();

    return `
      <div class="qz-msg-item ${idx < 4 ? 'unread' : ''}" onclick="qzOpenThreadFromDropdown('${escAttr(String(t.id))}')">
        <div class="qz-msg-avatar ${roleClass}">${esc(initial)}</div>
        <div class="qz-msg-content">
          <div class="qz-msg-top">
            <span class="qz-msg-sender">${esc(sender)}</span>
            <span class="qz-msg-time">${fmtDate(lastMsg ? lastMsg.date : QZ_TODAY)}</span>
          </div>
          <div class="qz-msg-subject">#${esc(t.orderId)} &middot; ${esc(t.subject)}</div>
          <div class="qz-msg-snippet">${esc(text)}</div>
        </div>
        ${idx < 4 ? '<div class="qz-msg-unread-dot"></div>' : ''}
      </div>`;
  }).join('');

  dd.innerHTML = `
    <div class="qz-dd-header">
      <div>
        <div class="qz-dd-title">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
          Connect Messages (${allThreads.length})
        </div>
        <div class="qz-dd-sub">Agency client &amp; lender communication hub</div>
      </div>
      <div class="qz-dd-actions">
        <button type="button" class="qz-btn sm primary" style="font-size:11px;padding:3px 8px;" onclick="qzQuickComposeModal()">+ New</button>
        <button type="button" class="qz-dd-link-btn" onclick="qzGoto('global-messages'); qzCloseAllTopbarDropdowns();">View All &raquo;</button>
      </div>
    </div>
    <div class="qz-dd-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <input type="text" placeholder="Search conversations by subject or order..." value="${escAttr(qzMsgSearchQuery)}" oninput="qzFilterMsgSearch(this.value)">
    </div>
    <div class="qz-dd-body">
      ${threadRows || '<div class="qz-dd-empty">No message threads found.</div>'}
    </div>`;
}

/* ---------- 3. Notification Center (🔔 294) ---------- */
function qzToggleBellDropdown(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById('qzBellDropdown');
  if (!dd) return;
  const opening = !dd.classList.contains('open');
  qzCloseAllTopbarDropdowns();
  if (opening) {
    qzRenderBellDropdown();
    dd.classList.add('open');
  }
}

function qzSetBellTab(tab) {
  qzBellTab = tab;
  qzRenderBellDropdown();
}

function qzMarkAllAlertsRead() {
  simToast('All notifications marked as read.');
  qzUnreadAlertsCount = 0;
  qzUpdateBellBadge();
  qzRenderBellDropdown();
}

function qzToggleTaskFromBell(taskId, checked, e) {
  if (e) e.stopPropagation();
  qzToggleTaskStatus(taskId, checked);
  simToast(checked ? 'Task marked as complete.' : 'Task reopened.', { tone: 'good' });
  qzUpdateBellBadge();
  qzRenderBellDropdown();
}

function qzRenderBellDropdown() {
  const dd = document.getElementById('qzBellDropdown');
  if (!dd) return;

  const allMyOpenTasks = qzList('tasks', t => qzTaskStatus(t) !== 'Complete' && /you/i.test(t.assignedTo || ''));
  const sortedTasks = allMyOpenTasks.slice().sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
  const openTasks = sortedTasks.slice(0, 15);
  const totalNotifications = qzUnreadAlertsCount + allMyOpenTasks.length;

  let contentHTML = '';
  if (qzBellTab === 'activity') {
    const sampleAlerts = [
      { type: 'doc', icon: '📄', title: 'Buyer signed Closing Disclosure received', orderId: '2021-1470', time: '12m ago', address: '213 Lake Street' },
      { type: 'wire', icon: '💰', title: 'Earnest money wire ($15,000.00) verified in Escrow Trust', orderId: '2021-1398', time: '45m ago', address: '839 Oak Street' },
      { type: 'doc', icon: '🛡', title: 'Title commitment Schedule B approved by Old Republic Underwriter', orderId: '2021-1512', time: '2h ago', address: '484 Third Street' },
      { type: 'warn', icon: '⚠️', title: 'Mortgage payoff good-through statement expires in 48 hours', orderId: '2021-1483', time: '3h ago', address: '358 Pine Street' },
      { type: 'task', icon: '📅', title: 'Mobile notary signing appointment confirmed for 2:30 PM', orderId: '2021-1405', time: 'Today', address: '999 Second Street' },
      { type: 'doc', icon: '📬', title: 'Lender final closing package uploaded via Connect', orderId: '2021-1490', time: 'Today', address: '181 Pine Street' },
      { type: 'wire', icon: '✍️', title: 'Warranty Deed e-recording package accepted by Collin County Clerk', orderId: '2021-1375', time: 'Yesterday', address: '159 Elm Street' },
      { type: 'warn', icon: '📋', title: 'CPL re-issuance requested for closing file #2021-1460', orderId: '2021-1460', time: 'Yesterday', address: '215 West Lake' }
    ];

    const alertRows = sampleAlerts.map((a, idx) => `
      <div class="qz-alert-item ${idx < qzUnreadAlertsCount ? 'unread' : ''}" onclick="qzOpenOrder('${escAttr(a.orderId)}'); qzCloseAllTopbarDropdowns();">
        <div class="qz-alert-icon ${a.type}">${a.icon}</div>
        <div class="qz-alert-content">
          <div class="qz-alert-text"><b>Order #${esc(a.orderId)}:</b> ${esc(a.title)}</div>
          <div class="qz-alert-meta">
            <span>${esc(a.address)}</span>
            <span>&bull;</span>
            <span>${esc(a.time)}</span>
          </div>
        </div>
      </div>`).join('');

    contentHTML = `<div class="qz-dd-body">${alertRows}</div>`;
  } else {
    if (!allMyOpenTasks.length) {
      contentHTML = '<div class="qz-dd-empty">No open tasks assigned to you</div>';
    } else {
      const groups = {};
      openTasks.forEach(t => { (groups[t.relatedOrderId] = groups[t.relatedOrderId] || []).push(t); });
      const taskRows = Object.keys(groups).map(orderId => {
        const o = qzGetOrder(orderId);
        const label = o ? o.propertyAddress : orderId;
        const items = groups[orderId].map(t => {
          const isOverdue = t.dueDate && t.dueDate < QZ_TODAY;
          const isDueToday = t.dueDate && t.dueDate === QZ_TODAY;
          const badgeClass = isOverdue ? 'bad' : isDueToday ? 'pending' : 'progress';
          const dueLabel = isOverdue ? `Overdue &bull; ${fmtDate(t.dueDate)}` : isDueToday ? 'Today' : fmtDate(t.dueDate);

          return `
            <div class="qz-bell-task-item">
              <label class="qz-bell-chk-label" onclick="event.stopPropagation()">
                <input type="checkbox" onchange="qzToggleTaskFromBell('${escAttr(String(t.id))}', this.checked, event)">
              </label>
              <div class="qz-bell-task-info" onclick="qzGotoOrderTasks('${escAttr(orderId)}'); qzCloseAllTopbarDropdowns();">
                <div class="qz-bell-task-title">${esc(t.title)}</div>
                <div class="qz-bell-task-meta">${esc(t.group || 'Milestone Task')}</div>
              </div>
              <span class="qz-badge ${badgeClass}" style="font-size:10px;padding:2px 7px;flex:none">${dueLabel}</span>
            </div>`;
        }).join('');

        return `
          <div class="qz-bell-group-block">
            <div class="qz-bell-group-header" onclick="qzGotoOrderTasks('${escAttr(orderId)}'); qzCloseAllTopbarDropdowns();">
              <span class="qz-bell-order-pill">#${esc(orderId)}</span>
              <span class="qz-bell-order-title">${esc(label)}</span>
              <span class="qz-bell-order-count">${groups[orderId].length} tasks</span>
            </div>
            <div>${items}</div>
          </div>`;
      }).join('');
      contentHTML = `<div class="qz-dd-body">${taskRows}</div>`;
    }
  }

  dd.innerHTML = `
    <div class="qz-dd-header">
      <div>
        <div class="qz-dd-title">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Notifications &amp; Activity (${totalNotifications})
        </div>
        <div class="qz-dd-sub">Real-time alerts, uploads &amp; closing milestones</div>
      </div>
      <div class="qz-dd-actions">
        <button type="button" class="qz-dd-link-btn" onclick="qzMarkAllAlertsRead()">Mark All Read</button>
        <button type="button" class="qz-dd-link-btn" onclick="qzGotoMyTasks(); qzCloseAllTopbarDropdowns();">All Tasks &raquo;</button>
      </div>
    </div>
    <div class="qz-dd-tabs">
      <button type="button" class="qz-dd-tab ${qzBellTab === 'activity' ? 'active' : ''}" onclick="qzSetBellTab('activity')">Activity Feed (${qzUnreadAlertsCount})</button>
      <button type="button" class="qz-dd-tab ${qzBellTab === 'tasks' ? 'active' : ''}" onclick="qzSetBellTab('tasks')">My Tasks (${allMyOpenTasks.length})</button>
    </div>
    ${contentHTML}`;
}

function qzGotoMyTasks() {
  qzGotoHome('tasks');
}

/* ---------- 4. User Profile Menu (🟢 [A] Alex ▾) ---------- */
function qzToggleUserDropdown(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById('qzUserDropdown');
  if (!dd) return;
  const opening = !dd.classList.contains('open');
  qzCloseAllTopbarDropdowns();
  if (opening) {
    qzRenderUserDropdown();
    dd.classList.add('open');
  }
}

function qzRenderUserDropdown() {
  const dd = document.getElementById('qzUserDropdown');
  if (!dd) return;
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const userName = su ? su.name : 'Alex Rivera';
  const userInitial = (su ? (su.avatar || su.name.charAt(0)) : 'A').toUpperCase();
  const userEmail = su ? (su.email || 'alex.rivera@bestclosing.com') : 'alex.rivera@bestclosing.com';

  dd.innerHTML = `
    <div class="qz-user-card">
      <div class="qz-user-card-av">${esc(userInitial)}</div>
      <div>
        <div class="qz-user-card-name">${esc(userName)}</div>
        <div class="qz-user-card-role">${esc(userEmail)}</div>
        <div class="qz-user-card-branch">Plano HQ &middot; Best Closing Inc.</div>
      </div>
    </div>
    <div class="qz-user-menu">
      <div class="qz-user-menu-item" onclick="qzOpenUserSettings('profile'); qzCloseAllTopbarDropdowns();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>User Settings &amp; Preferences</span>
      </div>
      <div class="qz-user-menu-item" onclick="qzOpenUserSettings('notifications'); qzCloseAllTopbarDropdowns();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span>Notification Preferences</span>
      </div>
      <div class="qz-user-menu-item" onclick="qzGoto('admin'); qzCloseAllTopbarDropdowns();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Company Settings (Admin)</span>
      </div>
      <div class="qz-user-menu-item" onclick="qzCoreStub('Help Center'); qzCloseAllTopbarDropdowns();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>Help &amp; Support Center</span>
      </div>
      <div class="qz-user-menu-divider"></div>
      <div class="qz-user-menu-item danger" onclick="qzLogout();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>Sign Out</span>
      </div>
    </div>`;
}

/* ---------- Qualia Native User Settings View ---------- */
let qzUserSettingsTab = 'profile'; // 'profile' | 'notifications' | 'signature' | 'security'

function qzOpenUserSettings(tab) {
  qzUserSettingsTab = tab || 'profile';
  qzCloseAllTopbarDropdowns();
  qzGoto('user-settings');
}

function qzSetUserSettingsTab(tab) {
  qzUserSettingsTab = tab;
  qzRenderRoot();
}

function qzUserSettingsHTML() {
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const userName = su ? su.name : 'Alex Rivera';
  const userInitial = (su ? (su.avatar || su.name.charAt(0)) : 'A').toUpperCase();
  const userEmail = su ? (su.email || 'alex.rivera@bestclosing.com') : 'alex.rivera@bestclosing.com';

  const tabs = [
    { id: 'profile', label: 'Personal Profile', icon: '👤' },
    { id: 'notifications', label: 'Notification Preferences', icon: '🔔' },
    { id: 'signature', label: 'Closing Signature & Credentials', icon: '✍️' },
    { id: 'security', label: 'Security & Two-Factor Auth', icon: '🔒' }
  ];

  const tabNav = tabs.map(t => `
    <button type="button" class="qz-settings-nav-item ${qzUserSettingsTab === t.id ? 'active' : ''}" onclick="qzSetUserSettingsTab('${t.id}')">
      <span class="ic">${t.icon}</span>
      <span>${esc(t.label)}</span>
    </button>`).join('');

  let paneHTML = '';

  if (qzUserSettingsTab === 'profile') {
    paneHTML = `
      <div class="qz-settings-card">
        <div class="qz-settings-card-h">
          <h3>User Profile &amp; Contact Information</h3>
          <p>Personal credentials and agency closing assignment details</p>
        </div>
        <div class="qz-settings-profile-head">
          <div class="qz-user-card-av lg">${esc(userInitial)}</div>
          <div>
            <h2 style="font-size:17px;font-weight:700;color:#0f172a;margin:0 0 4px;">${esc(userName)}</h2>
            <div style="font-size:12.5px;color:#64748b;">Title &amp; Escrow Officer / Closing Specialist</div>
            <div style="font-size:11px;color:#166534;background:#dcfce7;display:inline-block;padding:2px 8px;border-radius:4px;margin-top:6px;font-weight:600;">Active Employee &middot; Best Closing Inc.</div>
          </div>
        </div>
        <div class="qz-settings-grid">
          <div class="qz-fld">
            <label style="display:block;font-size:11.5px;font-weight:700;color:#475569;margin-bottom:4px;">Full Name</label>
            <input type="text" value="${esc(userName)}" class="qz-input" id="qzSetFullName" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;">
          </div>
          <div class="qz-fld">
            <label style="display:block;font-size:11.5px;font-weight:700;color:#475569;margin-bottom:4px;">Email Address</label>
            <input type="text" value="${esc(userEmail)}" class="qz-input" id="qzSetEmail" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;background:#f8fafc;" readonly>
          </div>
          <div class="qz-fld">
            <label style="display:block;font-size:11.5px;font-weight:700;color:#475569;margin-bottom:4px;">Direct Phone Number</label>
            <input type="text" value="(214) 555-0128" class="qz-input" id="qzSetPhone" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;">
          </div>
          <div class="qz-fld">
            <label style="display:block;font-size:11.5px;font-weight:700;color:#475569;margin-bottom:4px;">Primary Office / Branch</label>
            <input type="text" value="Plano HQ (900 E Park Blvd, Suite 300)" class="qz-input" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;background:#f8fafc;" readonly>
          </div>
          <div class="qz-fld">
            <label style="display:block;font-size:11.5px;font-weight:700;color:#475569;margin-bottom:4px;">Default Settlement State</label>
            <input type="text" value="Texas (TX)" class="qz-input" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;background:#f8fafc;" readonly>
          </div>
          <div class="qz-fld">
            <label style="display:block;font-size:11.5px;font-weight:700;color:#475569;margin-bottom:4px;">Assigned Underwriter Portal</label>
            <input type="text" value="Old Republic National Title" class="qz-input" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;background:#f8fafc;" readonly>
          </div>
        </div>
        <div class="qz-settings-actions">
          <button type="button" class="qz-btn primary" onclick="simToast('Profile details updated successfully.', { tone: 'good' })">Save Changes</button>
        </div>
      </div>`;
  } else if (qzUserSettingsTab === 'notifications') {
    paneHTML = `
      <div class="qz-settings-card">
        <div class="qz-settings-card-h">
          <h3>Notification Preferences</h3>
          <p>Control browser alerts, email digests, and transaction event notifications</p>
        </div>
        <div class="qz-settings-notif-list">
          <div class="qz-settings-notif-item">
            <div>
              <b>Connect Client Messages &amp; Chat</b>
              <p>Receive real-time notifications when buyers, sellers, or lenders send messages on your orders</p>
            </div>
            <label class="qz-switch"><input type="checkbox" checked onchange="simToast('Preference saved')"><span class="slider"></span></label>
          </div>
          <div class="qz-settings-notif-item">
            <div>
              <b>Document Uploads &amp; Package Deliveries</b>
              <p>Notify immediately when loan packages, deeds, or addenda are uploaded to active files</p>
            </div>
            <label class="qz-switch"><input type="checkbox" checked onchange="simToast('Preference saved')"><span class="slider"></span></label>
          </div>
          <div class="qz-settings-notif-item">
            <div>
              <b>Escrow Wire Confirmations &amp; Receipts</b>
              <p>Alert upon verification of incoming earnest money or payoff funds in the trust ledger</p>
            </div>
            <label class="qz-switch"><input type="checkbox" checked onchange="simToast('Preference saved')"><span class="slider"></span></label>
          </div>
          <div class="qz-settings-notif-item">
            <div>
              <b>Task Due Date &amp; Milestone Reminders</b>
              <p>Daily morning summary of tasks due within 24–48 hours across your closing queue</p>
            </div>
            <label class="qz-switch"><input type="checkbox" checked onchange="simToast('Preference saved')"><span class="slider"></span></label>
          </div>
          <div class="qz-settings-notif-item">
            <div>
              <b>Underwriter Approvals &amp; CPL Notifications</b>
              <p>Instant alert when title search exams or CPL requests are approved by the underwriter</p>
            </div>
            <label class="qz-switch"><input type="checkbox" checked onchange="simToast('Preference saved')"><span class="slider"></span></label>
          </div>
        </div>
        <div class="qz-settings-actions">
          <button type="button" class="qz-btn primary" onclick="simToast('Notification preferences saved.', { tone: 'good' })">Save Notification Settings</button>
        </div>
      </div>`;
  } else if (qzUserSettingsTab === 'signature') {
    paneHTML = `
      <div class="qz-settings-card">
        <div class="qz-settings-card-h">
          <h3>Digital Closing Signature &amp; Title Credentials</h3>
          <p>Official e-signature used on settlement statements, escrow disbursements, and deeds</p>
        </div>
        <div style="margin:20px 0;">
          <label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:8px;">Electronic Signature Preview</label>
          <div class="qz-settings-sig-box">
            <span class="sig-name">${esc(userName)}</span>
            <span class="sig-title">Title &amp; Escrow Officer &middot; Best Closing Inc.</span>
          </div>
        </div>
        <div class="qz-settings-grid">
          <div class="qz-fld">
            <label style="display:block;font-size:11.5px;font-weight:700;color:#475569;margin-bottom:4px;">Escrow Officer License #</label>
            <input type="text" value="TX-ESC-849201" class="qz-input" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;background:#f8fafc;" readonly>
          </div>
          <div class="qz-fld">
            <label style="display:block;font-size:11.5px;font-weight:700;color:#475569;margin-bottom:4px;">Notary Public Commission Exp.</label>
            <input type="text" value="11/24/2028" class="qz-input" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;background:#f8fafc;" readonly>
          </div>
        </div>
        <div class="qz-settings-actions">
          <button type="button" class="qz-btn primary" onclick="simToast('Signature credentials verified.', { tone: 'good' })">Update Signature</button>
        </div>
      </div>`;
  } else if (qzUserSettingsTab === 'security') {
    paneHTML = `
      <div class="qz-settings-card">
        <div class="qz-settings-card-h">
          <h3>Security &amp; Multi-Factor Authentication</h3>
          <p>Manage login credentials and account access protection</p>
        </div>
        <div class="qz-settings-notif-list">
          <div class="qz-settings-notif-item">
            <div>
              <b>Two-Factor Authentication (2FA)</b>
              <p>Authenticator app (TOTP) verification required on all new device logins</p>
            </div>
            <span class="qz-badge complete" style="padding:4px 8px;font-size:11px;">Active &middot; Enabled</span>
          </div>
          <div class="qz-settings-notif-item">
            <div>
              <b>Session Timeout</b>
              <p>Automatically lock idle session after 30 minutes of inactivity</p>
            </div>
            <span class="qz-badge complete" style="padding:4px 8px;font-size:11px;">Enforced</span>
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="qz-settings-layout">
      <div class="qz-settings-sidebar">
        <div class="qz-settings-sidebar-h">
          <span class="lbl">Account Settings</span>
          <button type="button" class="qz-btn sm" onclick="qzGoto('orders')">&larr; Back to Orders</button>
        </div>
        <div class="qz-settings-nav">${tabNav}</div>
      </div>
      <div class="qz-settings-content">
        ${paneHTML}
      </div>
    </div>`;
}

function qzLogout() {
  if (window.SCApp && SCApp.logout) {
    SCApp.logout();
  } else {
    location.href = '../login.html';
  }
}

function qzGotoMyTasks() {
  qzGotoHome('tasks');
}

/* ---------- Home (the logo) ----------
   Chip ids match the product's labels. `ready:false` renders the chip greyed with a reason
   on hover instead of a toast that pretends something happened. */
const QZ_HOME_CHIPS = [
  { id: 'orders', label: 'Orders', ready: true },
  { id: 'order-queue', label: 'Order Queue', ready: true },
  { id: 'action-queue', label: 'Action Queue', ready: true },
  { id: 'tasks', label: 'Tasks', ready: true },
  { id: 'notifications', label: 'Notifications', ready: true }
];

function qzGotoHome(tab) {
  if (SimEngine.walkActive()) {
    simToast('Finish or exit the current lesson step before browsing other sections.');
    return;
  }
  qzCloseAllTopbarDropdowns();
  qzState.view = 'home';
  qzState.orderId = null;
  if (tab) qzState.homeTab = tab;
  if (!qzState.homeTab) qzState.homeTab = 'orders';
  qzSyncTopTabs();
  qzRenderRoot();
}

function qzCloseBellDropdown() {
  qzCloseAllTopbarDropdowns();
}

function qzSetHomeTab(tab) {
  qzState.homeTab = tab;
  qzRenderRoot();
}

/* The bell's feed, as a page. Same source as qzRenderBellDropdown — open tasks assigned to
   the trainee — so the count on the chip and the count on the bell can never disagree. */
function qzNotificationsHTML() {
  const mine = qzOpenTasks().slice().sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
  if (!mine.length) return '<div class="qz-empty">Nothing assigned to you right now.</div>';
  const rows = mine.map(t => {
    const o = qzGetOrder(t.relatedOrderId);
    const overdue = t.dueDate && t.dueDate < QZ_TODAY;
    return `<div class="qz-notif-row ${overdue ? 'overdue' : ''}" onclick="qzGotoOrderTasks('${escAttr(t.relatedOrderId)}')">
      <div class="qz-notif-main">
        <b>${esc(t.title)}</b>
        <span class="qz-sub">${esc(t.relatedOrderId)} &middot; ${esc(o ? o.propertyAddress : '—')}</span>
      </div>
      <div class="qz-notif-meta">${fmtDate(t.dueDate)} ${qzDueChipHTML(t.dueDate)}</div>
    </div>`;
  }).join('');
  return `<div class="qz-notif-list">${rows}</div>`;
}

/* ---------- Order Queue and Action Queue ----------
   These two chips sat greyed out until 2026-08-27 because the product screenshot names them
   and nothing else about them could be verified - no reference exists for what they contain.

   They are built here from the dataset itself rather than from a guess at the product, and
   the difference matters: every row below is a real record already in qzDB, reached by the
   same navigation the rest of the simulator uses. What is inferred is the GROUPING, not the
   data. If a real reference ever turns up and it groups differently, the rows survive the
   change; only this file's arrangement of them does not.

   Order Queue  = files that have been opened and have not started title work (stage 0).
   Action Queue = the things across every file that are waiting on somebody, grouped by what
                  unblocks each one. */

/* One number for the chip, from the same five filters the page draws. */
function qzActionQueueCount() {
  return qzList('tasks', t => qzTaskStatus(t) !== 'Complete' && /you/i.test(t.assignedTo || '') && t.dueDate && t.dueDate < QZ_TODAY).length
    + qzList('documents', d => d.status === 'Pending' || d.status === 'Requested').length
    + qzList('exceptions', e => (e.status || '') !== 'Resolved').length
    + qzList('cpls', c => (c.status || '') !== 'Issued').length
    + qzList('receipts', r => (r.status || '') === 'Pending' || (r.status || '') === 'On Hold').length;
}

function qzOrderQueueHTML() {
  const cola = qzList('orders', o => (o.stageIndex || 0) === 0)
    .sort((a, b) => String(b.opened || '').localeCompare(String(a.opened || '')));

  if (!cola.length) {
    return '<div class="qz-empty">Nothing waiting to be picked up. Every open file has started title work.</div>';
  }

  const filas = cola.map(o => {
    const dias = qzDaysFromToday(o.opened);
    const espera = dias === 0 ? 'today' : Math.abs(dias) + ' day' + (Math.abs(dias) === 1 ? '' : 's') + ' ago';
    const parado = Math.abs(dias) > 7;
    return `<tr class="qz-task-row link ${parado ? 'qz-task-strip-warn' : 'qz-task-strip-open'}" onclick="qzGotoOrderTab('${escAttr(o.id)}','overview')">
      <td><b>${esc(o.id)}</b><div class="qz-sub" style="font-size:11.5px;color:#64748b;">${esc(o.propertyAddress)}</div></td>
      <td>${esc(o.type)}</td>
      <td>${esc(o.orderOpener || 'Unassigned')}</td>
      <td>${fmtDate(o.opened)}<div class="qz-sub" style="font-size:11.5px;color:${parado ? '#b45309' : '#64748b'};">opened ${espera}</div></td>
      <td>${fmtMoney(o.purchasePrice)}</td>
      <td><button type="button" class="qz-btn sm" onclick="event.stopPropagation(); qzGotoOrderTab('${escAttr(o.id)}','overview')">Open file &raquo;</button></td>
    </tr>`;
  }).join('');

  const parados = cola.filter(o => Math.abs(qzDaysFromToday(o.opened)) > 7).length;
  return `<div class="qz-tasks-sec">
    <div class="qz-tasks-sec-head">
      <h3>Awaiting Title Work <span class="qz-panel-count ${parados ? 'warn' : 'good'}">${cola.length}</span></h3>
      <span class="qz-tasks-sec-note">${parados
        ? parados + ' of these have been sitting for more than a week.'
        : 'None of these has been sitting more than a week.'}</span>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Order &amp; Property</th><th>Type</th><th>Opened By</th><th>Opened</th><th>Price</th><th>Action</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  </div>`;
}

/* Each block names what is waiting, how many there are, and where the work is done. The cap
   is per block: a queue that prints 472 rows is a wall, not a queue. */
const QZ_ACTION_ROWS = 8;

function qzActionQueueHTML() {
  const bloques = [
    {
      titulo: 'Your overdue tasks',
      porque: 'Past their due date and assigned to you.',
      tono: 'bad',
      items: qzList('tasks', t => qzTaskStatus(t) !== 'Complete' && /you/i.test(t.assignedTo || '') && t.dueDate && t.dueDate < QZ_TODAY)
        .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
        .map(t => ({ orden: t.relatedOrderId, tab: 'tasks', que: t.title, cuando: t.dueDate })),
    },
    {
      titulo: 'Documents not in yet',
      porque: 'Requested or pending on a file that is still moving.',
      tono: 'warn',
      items: qzList('documents', d => d.status === 'Pending' || d.status === 'Requested')
        .map(d => ({ orden: d.orderId || d.relatedOrderId, tab: 'documents', que: d.name, cuando: d.date })),
    },
    {
      titulo: 'Title exceptions open',
      porque: 'Schedule B items that have not been cleared or waived.',
      tono: 'bad',
      items: qzList('exceptions', e => (e.status || '') !== 'Resolved')
        .map(e => ({ orden: e.orderId, tab: 'exceptions', que: e.text || e.name || e.type || 'Exception', cuando: e.status })),
    },
    {
      titulo: 'CPLs not issued',
      porque: 'The lender cannot fund without one.',
      tono: 'warn',
      items: qzList('cpls', c => (c.status || '') !== 'Issued')
        .map(c => ({ orden: c.orderId, tab: 'cpl', que: (c.number || 'CPL') + ' — ' + (c.lender || 'lender of record'), cuando: c.status })),
    },
    {
      titulo: 'Receipts not deposited',
      porque: 'Money received and still sitting outside the trust account.',
      tono: 'warn',
      items: qzList('receipts', r => (r.status || '') === 'Pending' || (r.status || '') === 'On Hold')
        .map(r => ({ orden: r.orderId, tab: 'accounting', que: (r.payer || r.from || 'Receipt') + ' — ' + fmtMoney(r.amount), cuando: r.status })),
    }
  ].filter(b => b.items.length);

  if (!bloques.length) {
    return '<div class="qz-empty">Nothing is waiting on anyone. That does not happen often.</div>';
  }

  return bloques.map(b => {
    const filas = b.items.slice(0, QZ_ACTION_ROWS).map(it => {
      const o = qzGetOrder(it.orden);
      return `<tr class="qz-task-row link qz-task-strip-${b.tono === 'bad' ? 'bad' : 'warn'}" onclick="qzGotoOrderTab('${escAttr(it.orden)}','${escAttr(it.tab)}')">
        <td><b>${esc(it.que)}</b></td>
        <td><b>${esc(it.orden)}</b><div class="qz-sub" style="font-size:11.5px;color:#64748b;">${esc(o ? o.propertyAddress : '—')}</div></td>
        <td>${/^\d{4}-\d{2}-\d{2}$/.test(String(it.cuando)) ? fmtDate(it.cuando) : esc(it.cuando || '—')}</td>
        <td><button type="button" class="qz-btn sm" onclick="event.stopPropagation(); qzGotoOrderTab('${escAttr(it.orden)}','${escAttr(it.tab)}')">Go &raquo;</button></td>
      </tr>`;
    }).join('');
    const resto = b.items.length > QZ_ACTION_ROWS
      ? `Showing ${QZ_ACTION_ROWS} of ${b.items.length}.`
      : '';
    return `<div class="qz-tasks-sec">
      <div class="qz-tasks-sec-head">
        <h3>${esc(b.titulo)} <span class="qz-panel-count ${b.tono}">${b.items.length}</span></h3>
        <span class="qz-tasks-sec-note">${esc(b.porque)}${resto ? ' ' + resto : ''}</span>
      </div>
      <div class="qz-tbl-scroll">
        <table class="qz-tbl">
          <thead><tr><th>What is waiting</th><th>Order &amp; Property</th><th>Since / Status</th><th>Action</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>`;
  }).join('');
}

function qzHomeHTML() {
  const tab = qzState.homeTab || 'orders';
  const notifCount = qzOpenTasks().length;
  const chips = QZ_HOME_CHIPS.map(c => {
    if (!c.ready) {
      return `<button type="button" class="qz-home-chip disabled" disabled title="${escAttr(c.why)}">${esc(c.label)}</button>`;
    }
    const cuenta = c.id === 'notifications' ? notifCount
      : c.id === 'order-queue' ? qzList('orders', o => (o.stageIndex || 0) === 0).length
        : c.id === 'action-queue' ? qzActionQueueCount()
          : null;
    const n = cuenta === null ? '' : `<span class="qz-home-chip-n">${cuenta}</span>`;
    return `<button type="button" class="qz-home-chip ${tab === c.id ? 'active' : ''}" onclick="qzSetHomeTab('${c.id}')">${esc(c.label)}${n}</button>`;
  }).join('');

  const body = tab === 'tasks' ? qzMyTasksHTML()
    : tab === 'notifications' ? qzNotificationsHTML()
      : tab === 'order-queue' ? qzOrderQueueHTML()
        : tab === 'action-queue' ? qzActionQueueHTML()
          : qzOrdersHTML();

  return `<div class="qz-home">
    <div class="qz-home-crumb">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
      <h1>Home</h1>
    </div>
    <div class="qz-home-chips">${chips}</div>
    <div class="qz-home-body">${body}</div>
  </div>`;
}

function qzSetTasksFilter(filter) {
  qzState.tasksFilter = filter;
  qzRenderRoot();
}

/* How many finished tasks the pipeline draws before it stops. 439 of the trainee's own tasks
   are already complete, and 1,501 across the team: the point of showing them is that a queue
   of nothing but pending work reads as a broken simulator, not that anyone scrolls through
   fifteen hundred rows. The rest stay one click away, in the file's own Tasks tab. */
const QZ_DONE_ROWS = 40;

function qzMyTasksHTML() {
  const filter = qzState.tasksFilter || 'mine';
  const scope = filter === 'all'
    ? qzList('tasks')
    : qzList('tasks', t => /you/i.test(t.assignedTo || ''));

  const open = scope.filter(t => qzTaskStatus(t) !== 'Complete');
  const done = scope.filter(t => qzTaskStatus(t) === 'Complete')
    .sort((a, b) => String(b.dueDate || '').localeCompare(String(a.dueDate || '')));

  const myOpenCount = qzList('tasks', t => qzTaskStatus(t) !== 'Complete' && /you/i.test(t.assignedTo || '')).length;
  const allOpenCount = qzList('tasks', t => qzTaskStatus(t) !== 'Complete').length;

  const overdue = open.filter(t => t.dueDate && t.dueDate < QZ_TODAY);
  const dueToday = open.filter(t => t.dueDate && t.dueDate === QZ_TODAY);
  const upcoming = open.filter(t => !t.dueDate || t.dueDate > QZ_TODAY);

  const renderSection = (title, items, badgeClass, stripClass, note) => {
    if (!items.length) return '';
    const rows = items.map(t => {
      const o = qzGetOrder(t.relatedOrderId);
      const addr = o ? o.propertyAddress : '—';
      /* taskGroup holds the group's id ('tg-title'); the screen wants its name ('Title'). */
      const grp = t.taskGroup ? qzFind('taskGroups', t.taskGroup) : null;
      const wf = (grp && grp.name) || t.group || '—';
      const isDone = qzTaskStatus(t) === 'Complete';
      const statusClass = isDone ? 'complete' : (t.status === 'In Progress' ? 'progress' : 'open');
      return `<tr class="qz-task-row link ${stripClass} ${isDone ? 'qz-task-done' : ''}" onclick="qzGotoOrderTasks('${escAttr(t.relatedOrderId)}')">
        <td class="qz-task-tick" onclick="event.stopPropagation()">
          <input type="checkbox" ${isDone ? 'checked' : ''} title="${isDone ? 'Reopen this task' : 'Mark this task complete'}" onchange="qzToggleTaskStatus('${escAttr(String(t.id))}', this.checked)">
        </td>
        <td><div class="qz-task-title"><b>${esc(t.title)}</b></div><div class="qz-sub" style="font-size:11.5px;color:#64748b;">${esc(wf)}</div></td>
        <td><b>${esc(t.relatedOrderId)}</b><div class="qz-sub" style="font-size:11.5px;color:#64748b;">${esc(addr)}</div></td>
        <td><span class="qz-badge ${/you/i.test(t.assignedTo || '') ? 'teal' : 'neutral'}">${esc(t.assignedTo || 'Unassigned')}</span></td>
        <td><span class="qz-due-date ${badgeClass}">${fmtDate(t.dueDate)}</span></td>
        <td class="qz-status-cell"><span class="qz-badge ${statusClass}">${esc(t.status || 'Open')}</span></td>
        <td><button type="button" class="qz-btn sm" onclick="event.stopPropagation(); qzGotoOrderTasks('${escAttr(t.relatedOrderId)}')">Open Tasks &raquo;</button></td>
      </tr>`;
    }).join('');

    return `<div class="qz-tasks-sec">
      <div class="qz-tasks-sec-head">
        <h3>${esc(title)} <span class="qz-panel-count ${badgeClass}">${items.length}</span></h3>
        ${note ? `<span class="qz-tasks-sec-note">${esc(note)}</span>` : ''}
      </div>
      <div class="qz-tbl-scroll">
        <table class="qz-tbl">
          <thead>
            <tr>
              <th style="width:36px"></th>
              <th>Task & Milestone</th>
              <th>Order & Property</th>
              <th>Assigned To</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  };

  const doneShown = done.slice(0, QZ_DONE_ROWS);
  const doneNote = done.length > QZ_DONE_ROWS
    ? `Showing the ${QZ_DONE_ROWS} most recently due of ${done.length}. The rest live in each file's own Tasks tab.`
    : '';

  return `<div class="qz-my-tasks-page">
    <div class="qz-listhead" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div>
        <h2>Tasks Pipeline</h2>
        <div class="sub">Cross-order task queue across all 75 active files as of ${fmtDate(QZ_TODAY)} &middot;
          ${open.length} open &middot; ${done.length} complete. Tick a task to close it out.</div>
      </div>
      <div class="qz-tasks-switch">
        <button type="button" class="qz-btn sm ${filter === 'mine' ? 'primary' : ''}" onclick="qzSetTasksFilter('mine')">My Tasks (${myOpenCount})</button>
        <button type="button" class="qz-btn sm ${filter === 'all' ? 'primary' : ''}" onclick="qzSetTasksFilter('all')">All Team Tasks (${allOpenCount})</button>
      </div>
    </div>
    ${renderSection('Overdue Tasks', overdue, 'bad', 'qz-task-strip-bad')}
    ${renderSection('Due Today', dueToday, 'warn', 'qz-task-strip-warn')}
    ${renderSection('Upcoming Tasks', upcoming, 'good', 'qz-task-strip-good')}
    ${renderSection('Completed', doneShown, 'good', 'qz-task-strip-good', doneNote)}
    ${!scope.length ? '<div class="qz-empty">No tasks matching the selected filter.</div>' : ''}
  </div>`;
}

function qzGotoOrderTab(orderId, tab) {
  qzState.view = 'order';
  qzState.orderId = orderId;
  qzState.orderTab = tab || 'overview';
  qzMark('orders-open');
  qzSyncTopTabs();
  qzRenderRoot();
  qzCloseBellDropdown();
}

function qzGotoOrderTasks(orderId) {
  qzGotoOrderTab(orderId, 'tasks');
}

/* ---------- Qualia Core: top-level section nav ---------- */
const QZ_CORE_SECTIONS = [
  { id: 'orders', label: 'Orders', view: 'orders' },
  { id: 'contacts', label: 'Contacts', view: 'contacts' },
  { id: 'calendar', label: 'Calendar', view: 'calendar' },
  { id: 'accounting', label: 'Accounting', view: 'accounting' },
  { id: 'reports', label: 'Reports', view: 'reports' },
  { id: 'compliance', label: 'Compliance', view: 'compliance' },
  { id: 'admin', label: 'Admin', view: 'admin' }
];
/* Qualia Core's top bar carries exactly these seven sections — verified against
   Images-resourses/real-screenshots/core-charges-section-b.png. There used to be an eighth,
   'Training', sitting next to Admin, which made the course read as part of the product. The
   course now has its own control beside the search box (#qzLessonsBtn), styled to look like
   what it is: something outside Qualia. */
function qzCoreStub(label) {
  if (label === 'Documents') {
    qzGoto('documents');
    return;
  }
  if (label === 'Messages') {
    qzGoto('communication');
    return;
  }
  simToast(`${label} is part of Qualia Core.`);
}
/* ---------- the course's own entry point ----------
   Deliberately NOT a Core section. It opens the academic dashboard and it is the only
   control in the top bar that is not part of the simulated product. */
function qzGotoLessons() {
  qzGoto('dashboard');
}

/* Badge shows steps still outstanding, so a trainee can see at a glance that the course is
   waiting without opening it. Blank when everything is done — a zero badge is noise. */
function qzSyncLessonsBadge() {
  const badge = document.getElementById('qzLessonsBadge');
  if (badge) badge.style.display = 'none';
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
  // Leaving the order abandons any correction that was handed off to a product screen, so the
  // strip must not keep offering a way back to an exercise the trainee has walked out of.
  qzState.pendingRevFix = null;
  qzState.pendingRevDoc = null;
  qzState.pendingRecDoc = null;
  qzState.pendingRecFix = null;
  // Same for a question floating over that screen (qzAskRender enforces this too).
  qzAsk = null;
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
  /* The Lessons control lights up on every course view, the way a section tab would, so the
     trainee always knows which layer they are standing in. */
  /* The logo is the Home button, so it carries the active underline while Home is open. */
  const brand = document.getElementById('qzBrand');
  if (brand) brand.classList.toggle('active', qzState.view === 'home');
  const lb = document.getElementById('qzLessonsBtn');
  if (lb) {
    lb.classList.toggle('active', ['dashboard', 'lesson', 'lessons', 'scenario', 'review', 'exam'].indexOf(qzState.view) > -1);
  }
  qzSyncLessonsBadge();
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
/* The strip of open files belongs to the Orders section, not to the application.
   Measured on Images-resourses/real-screenshots/core-charges-section-b.png: at the height of
   the tab row the dark order rail runs to x≈410 and the strip's grey background starts at
   x≈425 — the same boundary as the rail lower down. In the product the strip therefore lives
   inside the order workspace, to the RIGHT of the rail; it is not full-width chrome.

   This module renders it above .qz-body instead, so it used to follow the trainee into
   Calendar, Accounting and every other section, showing tabs with none of them active. That
   is the tell: a tab strip where nothing is active does not belong to the screen under it.
   Until the strip is moved inside the workspace properly, scoping which views draw tabs gets
   the behaviour right without touching layout. */
function qzOrderTabsVisible() {
  return qzState.view === 'order' || qzState.view === 'orders';
}

function qzSyncTopStrip() {
  const strip = document.getElementById('qzTopStrip');
  const banner = document.getElementById('qzLessonBanner');
  if (!strip) return;
  const hasTabs = qzState.openOrders.length > 0 && qzOrderTabsVisible();
  /* The lesson breadcrumb rides in this same strip, and a lesson step can legitimately send
     the trainee into Accounting. So the strip still appears for the banner alone — it just
     carries no order tabs there. */
  const hasBanner = !!(banner && banner.innerHTML.trim());
  strip.style.display = (hasTabs || hasBanner) ? 'flex' : 'none';
}
function qzRenderOrderTabs() {
  const host = document.getElementById('qzOrderTabs');
  if (!host) return;
  if (!qzState.openOrders.length || !qzOrderTabsVisible()) { host.innerHTML = ''; qzSyncTopStrip(); return; }
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
  /* A hand-off in progress outranks the lesson breadcrumb: the trainee is standing on a
     product screen because an exercise sent them there, and needs to know why and how back.
     It rides the strip rather than the page so the product screen itself stays untouched. */
  if (qzState.pendingRevFix && qzState.view === 'order') {
    const r = qzReviewLookup(qzState.pendingRevFix);
    if (r && r.fieldAt) return `<div class="qz-lesson-banner" onclick="qzRevBackToExercise()">Correct ${esc(r.label)} here, then save &middot; Back to the question &rarr;</div>`;
    if (r) return `<div class="qz-lesson-banner" onclick="qzRevBackToExercise()">Document Review &middot; correct ${esc(r.label)} here, then save &middot; Back to the exercise &rarr;</div>`;
  }
  /* A question the trainee dismissed with the dialog's close button. The strip is already
     the thing that says "an exercise put you on this screen", so it also says how to get
     the question back rather than leaving the step unreachable. */
  if (qzState.pendingRecFix && qzState.view === 'order') {
    const prf = qzState.pendingRecFix;
    const rr = qzRecLookup(prf.recId);
    const fixRow = rr && rr.rows.find(x => x.id === prf.rowId);
    if (fixRow) {
      if (fixRow.fixAt && fixRow.fixAt.action === 'upload') {
        return `<div class="qz-lesson-banner" onclick="qzReconcileDrive('${escAttr(prf.recId)}')">📎 In Qualia, click "Upload" on the document to register it and mark it Received &middot; Back to question &rarr;</div>`;
      }
      return `<div class="qz-lesson-banner" onclick="qzReconcileDrive('${escAttr(prf.recId)}')">Make the correction on this screen &middot; Back to the exercise &rarr;</div>`;
    }
  }
  if (qzState.pendingRecDoc && qzState.view === 'order') {
    const prd = qzState.pendingRecDoc;
    const rr = qzRecLookup(prd.recId);
    const dd = rr && rr.docs.find(d => d.id === prd.docId);
    if (dd) return `<div class="qz-lesson-banner" onclick="qzReconcileDrive('${escAttr(prd.recId)}')">Open the ${esc(dd.title)} from this file's Documents &middot; Back to the exercise &rarr;</div>`;
  }
  if (qzState.pendingRevDoc && qzState.view === 'order') {
    const rd = qzReviewLookup(qzState.pendingRevDoc);
    if (rd) return `<div class="qz-lesson-banner" onclick="qzAskReopen()">Open the ${esc(rd.docTitle)} from this file's Documents &middot; Back to the question &rarr;</div>`;
  }
  if (!qzAsk && !qzState.pendingRevFix && !qzState.pendingRevDoc && !qzState.pendingRecDoc && !qzState.pendingRecFix && qzAskLast && qzState.view === 'order' && SimEngine.walkActive()) {
    const cur = SimEngine.currentStep();
    const mine = !!cur && ((qzAskLast.kind === 'verify' && cur.reviewId === qzAskLast.id) ||
                           (qzAskLast.kind === 'reconcile' && cur.reconcileId === qzAskLast.id) ||
                           (qzAskLast.kind === 'scenario' && cur.scenarioId === qzAskLast.id));
    if (mine) return `<div class="qz-lesson-banner" onclick="qzAskReopen()">Question closed &middot; Reopen it &rarr;</div>`;
  }
  if (qzState.view === 'orders' && qzState.lessonId) {
    const l = QZ_LESSONS.find(x => x.id === qzState.lessonId);
    if (l) {
      const targetOid = qzActiveLessonOrderId() || 'ORD-2026-1483';
      const orderNum = targetOid.replace('ORD-', '');
      return `<div class="qz-lesson-banner guide">
        <span>📚 <b>Lesson ${l.number}</b>: Open Order <b>#${esc(orderNum)}</b> to continue the exercise</span>
        <button type="button" class="qz-resume-btn" onclick="qzOpenOrder('${escAttr(targetOid)}')">Resume Order &rarr;</button>
      </div>`;
    }
  }
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
  qzSaveNav();
  const root = document.getElementById('qzRoot');
  const body = document.querySelector('.qz-body');
  const stayingInOrder = qzState.view === 'order';
  const mainEl = stayingInOrder ? root.querySelector('.qz-order-main') : null;
  const savedScroll = mainEl ? mainEl.scrollTop : 0;
  if (body) body.classList.toggle('core', stayingInOrder);
  let html = '';
  if (qzState.view === 'dashboard') html = qzDashboardHTML();
  else if (qzState.view === 'orders') html = qzOrdersHTML();
  else if (qzState.view === 'order') html = qzOrderHTML();
  else if (qzState.view === 'home') html = qzHomeHTML();
  else if (qzState.view === 'my-tasks' || qzState.view === 'tasks') html = qzMyTasksHTML();
  else if (qzState.view === 'user-settings' || qzState.view === 'settings') html = qzUserSettingsHTML();
  else if (qzState.view === 'scenario') html = qzScenarioDetailHTML();
  else if (qzState.view === 'lesson') html = qzLessonDetailHTML();
  else if (qzState.view === 'exam') html = qzExamHTML();
  else if (qzState.view === 'review') html = qzReviewViewHTML();
  else if (typeof QZ_SHELL_VIEWS !== 'undefined' && QZ_SHELL_VIEWS[qzState.view]) {
    html = QZ_SHELL_VIEWS[qzState.view]();
  }
  root.innerHTML = qzExamActiveBannerHTML() + html;
  if (stayingInOrder && savedScroll) {
    const restored = root.querySelector('.qz-order-main');
    if (restored) restored.scrollTop = savedScroll;
  }
  qzRenderLessonBanner();
  qzAskRender();
  qzUpdateBellBadge();
}

/* ---------- lessons: gating (always derived, never stored) ---------- */
/* Gating reads the sticky "was right at least once" flag, not the current answer. Lessons
   are explicitly retry-friendly, so reopening a solved scenario/review to re-read it — or
   deliberately clicking a wrong option to see the explanation — must never take back a
   lesson the trainee already unlocked. Scoring integrity is handled separately and does not
   use this: the exam is single-answer, and the score reported to SCApp uses first attempts
   (see qzScenarioFirstAttemptCorrect). */
function qzLessonStepDone(step) {
  const lid = step._lessonId;
  if (lid && qzStore.lessonsDone[lid]) return true;
  if (step.type === 'do') return !!qzStore.checklist[qzScopedChecklistKey(step.checklistId, step.orderId, lid)];
  if (step.type === 'verify') {
    const s = lid ? qzStore.reviews[`${step.reviewId}#${lid}`] : qzStore.reviews[step.reviewId];
    return !!(s && (s.everCorrect || s.correct));
  }
  if (step.type === 'decide') {
    const s = lid ? qzStore.scenarios[`${step.scenarioId}#${lid}`] : qzStore.scenarios[step.scenarioId];
    return !!(s && (s.everCorrect || s.correct));
  }
  if (step.type === 'reconcile') {
    const s = lid ? qzStore.reconciles[`${step.reconcileId}#${lid}`] : qzStore.reconciles[step.reconcileId];
    return !!(s && (s.everCorrect || s.correct));
  }
  if (step.type === 'compose') {
    const s = lid ? qzStore.composes[`${step.composeId}#${lid}`] : qzStore.composes[step.composeId];
    return !!(s && (s.everCorrect || s.correct));
  }
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
  qzAsk = null;
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
    // Ask-layer items go to the Core screen that owns the value, not to a course page.
    if (r.fieldAt) { qzVerifyDrive(step.reviewId); return; }
    qzState.view = 'order';
    qzState.orderId = r.orderId;
    qzState.orderTab = 'review';
    qzMark('orders-open');
    qzSyncTopTabs();
    qzRenderRoot();
  } else if (step.type === 'decide') {
    // A step that declares its own context (qzAskScenario) owns where it opens; the
    // rest still get the standalone scenario page.
    if (step.walk && step.walk.setup) { step.walk.setup(); return; }
    qzOpenScenario(step.scenarioId);
  } else if (step.type === 'reconcile') {
    const r = qzRecLookup(step.reconcileId);
    if (!r) return;
    if (typeof QZ_REC_AT !== 'undefined' && QZ_REC_AT[step.reconcileId]) {
      qzReconcileDrive(step.reconcileId);
      return;
    }
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
  const lid = step._lessonId;
  if (step.type === 'do') return qzLessonStepDone(step) ? 'good' : 'pending';
  if (step.type === 'verify') { const s = lid ? qzStore.reviews[`${step.reviewId}#${lid}`] : qzStore.reviews[step.reviewId]; if (!s || !s.resolvedAt) return 'pending'; return s.correct ? 'good' : 'bad'; }
  if (step.type === 'decide') { const s = lid ? qzStore.scenarios[`${step.scenarioId}#${lid}`] : qzStore.scenarios[step.scenarioId]; if (!s || s.answered == null) return 'pending'; return s.correct ? 'good' : 'bad'; }
  if (step.type === 'reconcile') { const s = lid ? qzStore.reconciles[`${step.reconcileId}#${lid}`] : qzStore.reconciles[step.reconcileId]; if (!s || !s.resolvedAt) return 'pending'; return s.correct ? 'good' : 'bad'; }
  if (step.type === 'compose') { const s = lid ? qzStore.composes[`${step.composeId}#${lid}`] : qzStore.composes[step.composeId]; if (!s || !s.resolvedAt) return 'pending'; return s.correct ? 'good' : 'bad'; }
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
  if (qzState.pendingRecDoc && qzState.pendingRecDoc.recId === recId) {
    const r = qzRecLookup(recId);
    const rowId = r ? qzRecDocRowId(r, qzState.pendingRecDoc.docId) : null;
    return rowId != null ? `tr[data-doc-id="${rowId}"] [data-doc-action="view"]` : null;
  }
  if (qzState.pendingRecFix && qzState.pendingRecFix.recId === recId) {
    const r = qzRecLookup(recId);
    const row = r && r.rows.find(x => x.id === qzState.pendingRecFix.rowId);
    return row && row.fixAt ? row.fixAt.sel : null;
  }
  const scope = `.qz-rec-item[data-rec-id="${recId}"]`;
  if (st.resolvedAt) return st.correct ? null : scope + ' .qz-rv-feedback button';
  if (!qzRecAllDocsOpened(recId)) return scope + ' [data-rec-phase="1"]';
  const r = qzRecLookup(recId);
  const unfilled = r.rows.find(row => !qzRecRowCellsDone(recId, row.id));
  if (unfilled) return scope + ` .qz-rec-card[data-rec-row="${unfilled.id}"]`;
  const undecided = r.rows.find(row => !qzRecRowSettled(recId, row.id));
  if (undecided) return scope + ` .qz-rec-card[data-rec-row="${undecided.id}"] .qz-rec-decide`;
  return scope + ' .qz-rec-actions button';
}
function qzReconcileText(recId) {
  const r = qzRecLookup(recId);
  const st = qzRecGet(recId);
  if (SimEngine.docOpen()) return 'Read it, then close it and come back to the grid.';
  if (qzState.pendingRecDoc && qzState.pendingRecDoc.recId === recId) {
    const doc = r.docs.find(d => d.id === qzState.pendingRecDoc.docId);
    return `Find the ${doc ? doc.title : 'document'} in this order's Documents list and click View.`;
  }
  if (qzState.pendingRecFix && qzState.pendingRecFix.recId === recId) {
    const fixRow = r.rows.find(x => x.id === qzState.pendingRecFix.rowId);
    if (fixRow && fixRow.fixAt && fixRow.fixAt.action === 'upload') return 'The certificate is in hand. Click Upload to update the status on this order.';
    return 'Make the correction on this screen, the way you would on the real product.';
  }
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
  const r0 = qzReviewLookup(reviewId);
  // Items that declare where their value lives are walked on the product (ask layer).
  if (r0 && r0.fieldAt) return qzVerifyFieldTarget(r0);
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
  if (r && r.fieldAt) return qzVerifyFieldText(r);
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
  qzState.ordersFilterStatus = 'all';
  qzState.ordersFilterStage = 'all';
  qzState.ordersFilterType = 'all';
  qzState.ordersPage = 1;
}




/* ============================================================================
   ASK LAYER — a question asked ON TOP of the product, never instead of it
   ----------------------------------------------------------------------------
   Two of the three step types used to answer "where does a question live?" by
   replacing Core with a screen Core does not have:

     `decide`  ->  qzOpenScenario()  ->  view 'scenario', a blank page with four
                   options and a "back to Dashboard" link. The app is simply gone.
     `verify`  ->  qzGotoReview()    ->  view 'review', "Document Review", whose
                   own subtitle had to say "A course exercise, not a Qualia
                   screen" — a label that describes the problem rather than
                   fixing it. Worse, it REPRINTED the value under examination on
                   an "On the order" card, so the trainee compared a document
                   against the exercise and never once stood on the screen where
                   the value actually lives.

   This layer does the opposite. The question is a dialog; behind it is the real
   order, opened on the real tab that owns the value, with the real field ringed
   (.qz-ask-mark). Nothing is reprinted — to read the current value you read Core.
   And when the answer implies an edit, the dialog steps aside and the walkthrough
   drives the trainee to the Core form that owns the field, which is what
   qzRevGoFix already did for step 4 alone and what the rest now does too.

   OPT-IN, DELIBERATELY. A review takes this path only if it declares `fieldAt`
   (which Core screen owns the value, and the selector for the field itself); a
   scenario only if its lesson step's setup() calls qzAskScenario. Everything that
   does not — the other lessons, the reconcile/compose mechanics, and the whole
   exam — keeps the old screens and the old code paths untouched.

   The grading engine is NOT duplicated here. qzAskVerifyHTML renders the very
   same qzRevItemHTML the Document Review page renders, so every sub-answer is
   scored by exactly the code that scored it before; the dialog only supplies the
   chrome and hides the blocks that the chrome has made redundant (see
   .qz-ask-rev in qualia.css).
   ============================================================================ */

/* Module-level rather than on qzState: qzState is the product's view state, and a
   pending question is course chrome. Both qzGoto and qzAskRender's own invariant
   clear it, so it cannot outlive the screen it was floating over. */
let qzAsk = null; // { kind: 'scenario' | 'verify', id, ctx }
/* The last question opened, kept after it is closed. Dismissing a question is not
   leaving the step — the walkthrough is still on it and the dialog is where its
   options live — so the strip needs something concrete to reopen. */
let qzAskLast = null;

function qzAskLayerEl() {
  let el = document.getElementById('qzAskLayer');
  if (!el) {
    /* Outside #qzRoot on purpose, same reasoning as #qzLessonBanner: qzRenderRoot
       replaces the whole of #qzRoot, and a dialog destroyed and rebuilt by every
       render loses focus and scroll position mid-question. */
    el = document.createElement('div');
    el.id = 'qzAskLayer';
    el.className = 'qz-ask';
    document.body.appendChild(el);
  }
  return el;
}

function qzAskingVerify(reviewId) {
  return !!(qzAsk && qzAsk.kind === 'verify' && qzAsk.id === reviewId);
}

/* Puts the product on the screen the question is about. Deliberately not
   qzOpenOrder (that marks 'orders-open', a Lesson 1 checklist item, and re-marking
   it every time a later lesson asks something is noise) and not qzGoto (that kills
   the running walkthrough) — the same two exclusions qzRevGoFix makes, for the
   same two reasons. */
function qzAskGoto(loc) {
  if (!loc || !loc.orderId) return;
  qzOpenOrderTab(loc.orderId);
  qzState.view = 'order';
  qzState.orderId = loc.orderId;
  qzState.orderTab = loc.tab || 'overview';
  qzState.deTab = loc.deTab || 'property';
  qzState.composeId = null;
  qzSyncTopTabs();
}

/* Entry point for a `decide` step: ctx says which order and tab the situation
   would actually be read on, and optionally which field to ring. */
function qzAskScenario(scenarioId, ctx) {
  qzAskGoto(ctx);
  qzAsk = { kind: 'scenario', id: scenarioId, ctx: ctx || null };
  qzAskLast = qzAsk;
  qzRenderRoot();
}

/* Entry point for a `verify` step, and the step's setup(). Dispatches on the phase
   the item is already in, so re-entering a half-finished item (Back to Lesson, a
   replay of the step, "Redo") lands where the trainee left off rather than at the
   top. */
function qzVerifyDrive(reviewId) {
  const r = qzReviewLookup(reviewId);
  if (!r) return;
  if (!r.fieldAt) { qzGotoReview(r.orderId); return; }
  /* A correction handed off to a Core form owns the screen until it is saved —
     re-opening the dialog over it would cover the field the trainee was sent to. */
  if (qzState.pendingRevFix === reviewId) { qzRenderRoot(); return; }
  qzState.pendingRevDoc = null;
  qzAskGoto({ orderId: r.orderId, tab: r.fieldAt.tab, deTab: r.fieldAt.deTab });
  qzAsk = { kind: 'verify', id: reviewId };
  qzAskLast = qzAsk;
  qzRenderRoot();
  /* No-op unless the walkthrough is parked on this exact item, which is what makes it
     safe to call from the mid-step entry points (qzAskNoteDocOpened) as well as setup(). */
  qzSyncVerifyStep(reviewId);
}

function qzAskClose() { qzAsk = null; qzRenderRoot(); }

function qzAskReopen() {
  if (!qzAskLast) return;
  qzState.pendingRevDoc = null;
  qzState.pendingRecFix = null;
  if (qzAskLast.kind === 'verify') qzVerifyDrive(qzAskLast.id);
  else if (qzAskLast.kind === 'reconcile') qzReconcileDrive(qzAskLast.id);
  else qzAskScenario(qzAskLast.id, qzAskLast.ctx);
}

/* Rings the field the question is about, on the screen behind the dialog. Re-applied
   on every render because qzRenderRoot rebuilds the element it was on. */
function qzAskMarkSelector() {
  if (!qzAsk) return null;
  if (qzAsk.kind === 'scenario') return (qzAsk.ctx && qzAsk.ctx.sel) || null;
  const r = qzReviewLookup(qzAsk.id);
  return (r && r.fieldAt && r.fieldAt.sel) || null;
}

function qzAskMarkField(justOpened) {
  document.querySelectorAll('.qz-ask-mark').forEach(e => e.classList.remove('qz-ask-mark'));
  const sel = qzAskMarkSelector();
  if (!sel) { qzAskDock(null, false); return; }
  const el = document.querySelector(sel);
  if (el) el.classList.add('qz-ask-mark');
  qzAskDock(el, !!justOpened);
}

function qzAskDock(el, justOpened) {
  const layer = document.getElementById('qzAskLayer');
  if (!layer) return;
  /* Card width plus the layer's 22px gutter. A reconcile uses the wide variant, so the
     overlap test has to measure the card that is actually on screen. */
  const CARD = (layer.classList.contains('wide') ? 720 : 460) + 22;
  const clear = () => { layer.classList.remove('dock-left'); };
  if (!el || window.innerWidth < CARD * 2) { clear(); return; }
  if (justOpened && el.scrollIntoView) {
    try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) { el.scrollIntoView(); }
  }
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) { clear(); return; }
  const overlapsRight = r.right > window.innerWidth - CARD;
  const fitsLeft = r.left > CARD;
  layer.classList.toggle('dock-left', overlapsRight && fitsLeft);
}

/* The step counter, the dots and the exit link all move into the dialog while it is
   up, because the walkthrough tip is hidden then (body.qz-asking) — two floating
   cards saying the same thing, fighting for the same corner, is worse than one. */
function qzAskStepMeta() {
  if (!SimEngine.walkActive()) return null;
  const l = SimEngine.currentLesson();
  const w = SimEngine.walkState();
  return (l && w) ? { lesson: l, index: w.stepIndex } : null;
}

function qzAskChromeHTML(title, whereHTML) {
  const meta = qzAskStepMeta();
  const kicker = meta
    ? `Lesson ${meta.lesson.number} - Step ${meta.index + 1} of ${meta.lesson.steps.length}`
    : 'Practice question';
  return `<div class="qz-ask-head">
    <button type="button" class="qz-ask-close" onclick="qzAskClose()" title="Close. You can reopen it from the strip at the top.">&times;</button>
    <div class="qz-ask-kicker"><span class="qz-ask-badge">?</span>${esc(kicker)}</div>
    <h3>${esc(title)}</h3>
    ${whereHTML || ''}
  </div>`;
}

/* The one line that keeps the dialog honest: it names the Core screen underneath,
   which is also the screen carrying the ringed field. */
function qzAskWhereHTML(loc, orderId) {
  if (!loc || !loc.label) return '';
  const o = qzGetOrder(orderId || qzState.orderId);
  const where = o ? `Order ${esc(o.id.replace('ORD-', ''))} &middot; ` : '';
  const ring = loc.sel ? ' The field itself is ringed on it.' : '';
  return `<div class="qz-ask-where">${where}<b>${esc(loc.label)}</b> is open behind this box.${esc(ring)}</div>`;
}

function qzAskFootHTML() {
  const meta = qzAskStepMeta();
  if (!meta) return '<div class="qz-ask-foot"></div>';
  const dots = meta.lesson.steps.map((s, i) => {
    const cls = i === meta.index ? 'current' : (SimEngine.stepDone(s) ? 'done' : '');
    return `<span class="qz-ask-dot ${cls}"></span>`;
  }).join('');
  return `<div class="qz-ask-foot">
    <div class="qz-ask-dots">${dots}</div>
    <span class="qz-ask-exit" onclick="simWalkExit()">Exit walkthrough</span>
  </div>`;
}

/* Same grading, same shuffle seed, same store as the full-page version — only the
   page chrome around it is gone. */
function qzAskScenarioHTML(id) {
  const s = QZ_SCENARIOS.find(x => x.id === id);
  if (!s) return '';
  const r = qzStore.scenarios[s.id];
  const answered = !!(r && r.answered != null);
  const opts = qzOptionOrder('scenario:' + s.id, s.options.length).map((idx, pos) => {
    const opt = s.options[idx];
    let cls = '';
    if (answered) { if (idx === s.correct) cls = 'correct'; else if (idx === r.answered && !r.correct) cls = 'incorrect'; }
    return `<button type="button" class="qz-option ${cls}" ${answered ? 'disabled' : ''} onclick="qzAnswerScenario('${s.id}',${idx})">${String.fromCharCode(65 + pos)}. ${esc(opt)}</button>`;
  }).join('');
  const lessonStep = qzState.lessonId && typeof QZ_LESSONS !== 'undefined'
    ? (QZ_LESSONS.find(x => x.id === qzState.lessonId) || { steps: [] }).steps.find(s2 => s2.type === 'decide' && s2.scenarioId === s.id)
    : null;
  const continueBtn = (answered && r.correct && lessonStep) ? qzContinueHTML(lessonStep) : '';
  const retakeBtn = answered
    ? ((r.correct && continueBtn) ? '' : `<button class="qz-btn sm" onclick="qzRetakeScenario('${s.id}')">${r.correct ? 'Retake' : 'Try Again'}</button>`)
    : '';
  const firstAttemptLine = (answered && r.firstAttempt)
    ? `<div class="qz-feedback-first">First attempt: ${r.firstAttempt.correct ? '&#10003; correct' : '&#10007; incorrect'}</div>` : '';
  const feedback = answered ? `<div class="qz-feedback ${r.correct ? 'correct' : 'incorrect'}">
      <b>${r.correct ? 'Correct.' : 'Not quite.'}</b>${esc(s.explanation)}
      ${firstAttemptLine}
      <div class="qz-feedback-actions">${continueBtn}${retakeBtn}</div>
    </div>` : '';
  return qzAskChromeHTML(s.title, qzAskWhereHTML(qzAsk && qzAsk.ctx, qzAsk && qzAsk.ctx && qzAsk.ctx.orderId)) +
    `<div class="qz-ask-body"><p class="situation">${esc(qzSituationText(s))}</p>${opts}${feedback}</div>` +
    qzAskFootHTML();
}

function qzAskVerifyHTML(id) {
  const r = qzReviewLookup(id);
  if (!r) return '';
  return qzAskChromeHTML(r.label, qzAskWhereHTML(r.fieldAt, r.orderId)) +
    `<div class="qz-ask-body">
       <p class="situation">${esc(r.instruction)}</p>
       <div class="qz-ask-rev">${qzRevItemHTML(id)}</div>
     </div>` +
    qzAskFootHTML();
}

/* The reconcile grid is a table with a column per source document, so it needs more room
   than a scenario's four options: the card widens for this kind (see .qz-ask.wide). */
function qzAskReconcileHTML(id) {
  const r = qzRecLookup(id);
  if (!r) return '';
  return qzAskChromeHTML(r.label, qzAskWhereHTML(QZ_REC_AT[id], (QZ_REC_AT[id] || {}).orderId || r.orderId)) +
    `<div class="qz-ask-body">
       <p class="situation">${esc(r.instruction)}</p>
       <div class="qz-ask-rev">${qzRecItemHTML(id, true)}</div>
     </div>` +
    qzAskFootHTML();
}

function qzAskRender() {
  const el = qzAskLayerEl();
  const wasOpen = el.classList.contains('open');
  /* Invariant: a question only ever floats over an open file. Every path that leaves
     the order view — exiting the walkthrough, Back to Lessons, the top nav, the
     dashboard — therefore dismisses it without any of them needing to know this
     layer exists. */
  if (qzAsk && qzState.view !== 'order') qzAsk = null;
  /* Second invariant: a question belongs to the step being walked. Without this, moving
     on to a step that does NOT use this layer — the next lesson's verify items render on
     the Document Review page — left the previous item's dialog floating over it, since
     that page is still view 'order'. */
  if (qzAsk && SimEngine.walkActive()) {
    const cur = SimEngine.currentStep();
    const mine = !!cur && ((qzAsk.kind === 'verify' && cur.reviewId === qzAsk.id) ||
                           (qzAsk.kind === 'reconcile' && cur.reconcileId === qzAsk.id) ||
                           (qzAsk.kind === 'scenario' && cur.scenarioId === qzAsk.id));
    if (!mine) qzAsk = null;
  }
  let html = '';
  if (qzAsk && qzAsk.kind === 'scenario') html = qzAskScenarioHTML(qzAsk.id);
  else if (qzAsk && qzAsk.kind === 'verify') html = qzAskVerifyHTML(qzAsk.id);
  else if (qzAsk && qzAsk.kind === 'reconcile') html = qzAskReconcileHTML(qzAsk.id);
  const open = !!html;
  el.classList.toggle('wide', !!(qzAsk && qzAsk.kind === 'reconcile'));
  el.innerHTML = open ? `<div class="qz-ask-scrim"></div><div class="qz-ask-card">${html}</div>` : '';
  el.classList.toggle('open', open);
  /* The entrance animation belongs to the dialog APPEARING, not to its contents
     changing. Every answer repaints this node, and with the animation on the card
     itself the whole box faded and slid again on each one — during which it is
     half-transparent and reads as broken. */
  if (open && !wasOpen) {
    const card = el.querySelector('.qz-ask-card');
    if (card) card.classList.add('qz-ask-enter');
  }
  document.body.classList.toggle('qz-asking', open);
  qzAskMarkField(open && !wasOpen);
}

/* Opening the source document from the real Documents list counts for the verify item
   that asked for it, exactly as the dialog's own button does. The point of this layer
   is that the product's own path is never the wrong one. */
function qzAskNoteDocOpened(file) {
  if (!qzState.lessonId) return;
  if (qzState.pendingRecDoc) {
    const prd = qzState.pendingRecDoc;
    const r = qzRecLookup(prd.recId);
    const doc = r && r.docs.find(d => d.id === prd.docId);
    if (r && doc && doc.file === file) {
      qzRecGet(prd.recId).opened[prd.docId] = true;
      qzState.pendingRecDoc = null;
      qzSave();
      qzReconcileDrive(prd.recId);
      return;
    }
  }
  let id = qzState.pendingRevDoc;
  if (!id && SimEngine.walkActive()) {
    const step = SimEngine.currentStep();
    if (step && step.type === 'verify') id = step.reviewId;
  }
  if (!id) return;
  const r = qzReviewLookup(id);
  if (!r || !r.fieldAt || r.doc !== file) return;
  const st = qzRevGet(id);
  qzState.pendingRevDoc = null;
  if (!st.docOpened) { st.docOpened = true; qzSave(); }
  qzVerifyDrive(id);
}

/* The Documents row that carries this review's source document, so Step 1 can point at the
   product's own "View" button instead of at a shortcut the exercise invented. Null when the
   file is not on the order's list, and the item then keeps the direct-open button. */
function qzRevDocRowId(r) {
  const d = qzList('documents').find(x => x.orderId === r.orderId && x.file === r.doc);
  return d ? d.id : null;
}

/* Step 1's hand-off, the reading counterpart of qzRevGoFix: a VA does not summon a contract
   out of a dialog, they go to the file's Documents list and open it. So the dialog says where
   the document is and steps aside, and the walkthrough points at the real row's View button.
   qzAskNoteDocOpened picks it up from there. */
function qzRevGoDoc(id) {
  const r = qzReviewLookup(id);
  if (!r) return;
  qzState.pendingRevDoc = id;
  qzAsk = null;
  /* The row has to be on screen for the walkthrough to point at it, so any folder or search
     the trainee left on the Documents list is cleared first. */
  qzDocActiveFolder = 'All Documents';
  qzDocQuery = '';
  qzOpenOrderTab(r.orderId);
  qzState.view = 'order';
  qzState.orderId = r.orderId;
  qzState.orderTab = 'documents';
  qzState.composeId = null;
  qzSyncTopTabs();
  qzRenderRoot();
  qzSyncVerifyStep(id);
}

/* ---------- verify walk resolvers, fieldAt variant ----------
   The fieldAt half of qzVerifyTarget / qzVerifyText. A review without fieldAt never
   reaches these and behaves exactly as it did. */
function qzVerifyFieldTarget(r) {
  /* Both the source document (z 200) and the question (z 190) sit under the walk
     overlay so the tip can float over them — which means a highlight anywhere else
     would darken them through its own cutout shadow. Suppressed while either is up,
     the same rule simWalkPosition already applies to the document modal. */
  if (SimEngine.docOpen() || qzAskingVerify(r.id)) return null;
  if (qzState.pendingRevDoc === r.id) {
    const rowId = qzRevDocRowId(r);
    return rowId != null ? `tr[data-doc-id="${rowId}"] [data-doc-action="view"]` : null;
  }
  if (qzState.pendingRevFix === r.id && r.fixAt && r.fixAt.sel) {
    const inp = document.querySelector(r.fixAt.sel);
    if (inp && qzNormalizeValue(inp.value) === qzNormalizeValue(r.correctedValue)) {
      const saveBtn = r.fixAt.acctDesc ? '#qzAcctSaveBtn' : '#qzDeSaveBtn';
      return saveBtn;
    }
    return r.fixAt.sel;
  }
  return r.fieldAt.sel;
}

function qzVerifyFieldText(r) {
  const st = qzRevGet(r.id);
  if (SimEngine.docOpen()) return `Read the ${r.docTitle}, then close it — the question is waiting behind it.`;
  if (qzState.pendingRevDoc === r.id) {
    return `This is the file's Documents list, where every document on this order lives. Find the ${r.docTitle} and click View.`;
  }
  if (qzAskingVerify(r.id)) {
    return st.docOpened
      ? `Compare "${r.label}" on this screen against what you read in the ${r.docTitle}, then complete the question on the right.`
      : `Step 1: Open the ${r.docTitle} to check it against "${r.label}" on this screen.`;
  }
  if (qzState.pendingRevFix === r.id && r.fixAt) {
    if (st.correctedValueSaved && !st.step4ValueCorrect)
      return `That is not what the ${r.docTitle} says. Reopen it if you need to, then correct this field and save again.`;
    const inp = r.fixAt.sel ? document.querySelector(r.fixAt.sel) : null;
    if (inp && qzNormalizeValue(inp.value) === qzNormalizeValue(r.correctedValue))
      return `Good — now click Save Changes to commit the correction.`;
    return `Correct "${r.label}" right here, in the form that owns it, so it matches the ${r.docTitle}, then save. This is where a VA fixes it on the job.`;
  }
  if (st.resolvedAt) return 'Read the explanation, then use "Redo" if you want to work it again.';
  return `This is "${r.label}" on ${r.fieldAt.label}, the value you are about to check against the ${r.docTitle}.`;
}

/* Saves the one cell the Lesson-mode settlement grid opens up while a correction is
   being applied to it (see qzAccountingHTML). The value reaches the order first and is
   graded after, the same convention qzRevGradeFix and the Data Entry form follow. */
function qzAcctMarkDirty() {
  const btn = document.getElementById('qzAcctSaveBtn');
  if (btn) btn.style.display = '';
  if (qzState.pendingRevFix) qzSyncVerifyStep(qzState.pendingRevFix);
}

function qzAcctSaveFix() {
  const id = qzState.pendingRevFix;
  const r = id ? qzReviewLookup(id) : null;
  if (!r || !r.fixAt) return;
  const el = document.getElementById('qzAcctFixInput');
  const val = el ? el.value.trim() : '';
  if (!val) { simToast('Enter the corrected amount.'); return; }
  if (r.field) qzSetScalarOverride(r.orderId, r.field, val);
  qzRevGradeFix(id, val);
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
    const pct = locked ? 0 : (prog.total ? Math.round(prog.done / prog.total * 100) : 0);
    const fracLabel = locked ? 'Locked' : (state === 'done' ? 'Complete' : prog.done + ' of ' + prog.total + ' done');
    return `<div class="qz-lesson-card ${state}" ${locked ? '' : `onclick="SimEngine.openLesson('${l.id}')"`}>
      <div class="eyebrow">MODULE ${String(l.number).padStart(2, '0')}</div>
      <b>${esc(l.title)}</b>
      <p>${esc(l.summary)}</p>
      <div class="qz-bar"><i style="width:${pct}%"></i></div>
      <div class="frac">${esc(fracLabel)}</div>
    </div>`;
  }).join('');
  const allDone = QZ_LESSONS.every((l, i) => SimEngine.lessonState(i) === 'done' || qzLessonEverComplete(l.id));
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
  if (!o || !o.parties || !Array.isArray(o.parties)) return 'Not set';
  if (role === 'Borrower' || role === 'Buyer') {
    const p = o.parties.find(x => x && (x.role === 'Borrower' || x.role === 'Buyer'));
    return p ? p.name : 'Not set';
  }
  const p = o.parties.find(x => x && x.role === role);
  return p ? p.name : 'Not set';
}
function qzOrderMatchesFilter(o, filter) {
  if (!o) return false;
  const f = (filter || '').toLowerCase().trim();
  if (qzState.ordersFilterStatus && qzState.ordersFilterStatus !== 'all' && o.status !== qzState.ordersFilterStatus) return false;
  if (qzState.ordersFilterStage && qzState.ordersFilterStage !== 'all' && QZ_STAGES[o.stageIndex] !== qzState.ordersFilterStage) return false;
  if (qzState.ordersFilterType && qzState.ordersFilterType !== 'all' && o.type !== qzState.ordersFilterType) return false;
  if (!f) return true;
  const addr = (o.propertyAddress || '').toLowerCase();
  const id = (o.id || '').toLowerCase();
  const rawId = (o.id || '').replace('ord-', '').toLowerCase();
  const titleNo = (o.titleNumber || '').toLowerCase();
  const type = (o.type || '').toLowerCase();
  const status = (o.status || '').toLowerCase();
  const stage = (QZ_STAGES[o.stageIndex] || '').toLowerCase();
  const agency = (o.settlementAgency || '').toLowerCase();
  const partyMatch = o.parties && Array.isArray(o.parties) && o.parties.some(p => p && (
    (p.name || '').toLowerCase().includes(f) ||
    (p.role || '').toLowerCase().includes(f) ||
    (p.email || '').toLowerCase().includes(f)
  ));
  return addr.includes(f) || id.includes(f) || rawId.includes(f) || titleNo.includes(f) || type.includes(f) || status.includes(f) || stage.includes(f) || agency.includes(f) || partyMatch;
}
function qzClearAllOrdersFilters() {
  qzState.orderFilter = '';
  qzState.ordersFilterStatus = 'all';
  qzState.ordersFilterStage = 'all';
  qzState.ordersFilterType = 'all';
  qzState.ordersPage = 1;
  const input = document.getElementById('qzTopSearchInput');
  if (input) input.value = '';
  if (qzState.view === 'orders') {
    qzRenderRoot();
  }
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
  return qzAllOrders().filter(o => qzOrderMatchesFilter(o, filter))
    .sort((a, b) => {
      const aOpen = a.status === 'Open' ? 0 : 1;
      const bOpen = b.status === 'Open' ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      return (a.stageIndex || 0) - (b.stageIndex || 0);
    });
}
function qzOrdersPaginationHTML() {
  const total = qzOrdersFilteredList().length;
  const perPage = qzState.ordersPerPage || 15;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const curPage = Math.min(totalPages, Math.max(1, qzState.ordersPage || 1));
  return `
    <span style="color:var(--qz-muted)">Showing ${total === 0 ? 0 : Math.min(total, (curPage - 1) * perPage + 1)}&ndash;${Math.min(total, curPage * perPage)} of ${total} orders</span>
    <button class="qz-pag-btn" ${curPage <= 1 ? 'disabled' : ''} onclick="qzSetOrdersPage(${curPage - 1})">&larr; Prev</button>
    <span style="font-weight:600;color:var(--qz-navy)">Page ${curPage} of ${totalPages}</span>
    <button class="qz-pag-btn" ${curPage >= totalPages ? 'disabled' : ''} onclick="qzSetOrdersPage(${curPage + 1})">Next &rarr;</button>
  `;
}
function qzActiveLessonOrderId() {
  if (!qzState.lessonId) return null;
  const l = (typeof QZ_LESSONS !== 'undefined') ? QZ_LESSONS.find(x => x.id === qzState.lessonId) : null;
  if (!l) return null;
  const curStep = SimEngine.walkActive() ? SimEngine.currentStep() : null;
  if (curStep && curStep.orderId) return curStep.orderId;
  if (curStep && curStep.reviewId) {
    const r = qzReviewLookup(curStep.reviewId);
    if (r && r.orderId) return r.orderId;
  }
  if (curStep && curStep.reconcileId) {
    const r = qzRecLookup(curStep.reconcileId);
    if (r && r.orderId) return r.orderId;
  }
  if (curStep && curStep.composeId) {
    const c = qzComposeLookup(curStep.composeId);
    if (c && c.orderId) return c.orderId;
  }
  for (let s of l.steps) {
    if (s.orderId) return s.orderId;
    if (s.reviewId) { const r = qzReviewLookup(s.reviewId); if (r && r.orderId) return r.orderId; }
    if (s.reconcileId) { const r = qzRecLookup(s.reconcileId); if (r && r.orderId) return r.orderId; }
    if (s.composeId) { const c = qzComposeLookup(s.composeId); if (c && c.orderId) return c.orderId; }
  }
  return 'ORD-2026-1483';
}
function qzOrdersRowsHTML() {
  const filtered = qzOrdersFilteredList();
  const perPage = qzState.ordersPerPage || 15;
  const curPage = Math.min(Math.max(1, Math.ceil(filtered.length / perPage)), Math.max(1, qzState.ordersPage || 1));
  const start = (curPage - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);
  if (!rows.length) {
    const hasActiveFilters = (qzState.orderFilter || (qzState.ordersFilterStatus && qzState.ordersFilterStatus !== 'all') || (qzState.ordersFilterStage && qzState.ordersFilterStage !== 'all') || (qzState.ordersFilterType && qzState.ordersFilterType !== 'all'));
    return `<tr><td colspan="10" style="text-align:center;color:var(--qz-muted);padding:26px">
      No orders match that search.
      ${hasActiveFilters ? '<div style="margin-top:8px"><button type="button" class="qz-btn sm" onclick="qzClearAllOrdersFilters()">Clear filters</button></div>' : ''}
    </td></tr>`;
  }
  const targetOid = qzActiveLessonOrderId();
  return rows.map(o => {
    const isTarget = targetOid && o.id === targetOid && qzState.lessonId;
    return `<tr class="link ${isTarget ? 'qz-order-pulse' : ''}" data-order-id="${escAttr(o.id)}" onclick="qzOpenOrder('${o.id}')">
      <td>${esc(o.status)}</td>
      <td>${esc(QZ_STAGES[o.stageIndex])}</td>
      <td class="addr">${esc(o.id.replace('ORD-', ''))}</td>
      <td>${esc(qzOrderParty(o, 'Borrower'))}</td>
      <td>${esc(qzOrderParty(o, 'Seller'))}</td>
      <td>${esc(o.propertyAddress)}</td>
      <td>${esc(o.type)}</td>
      <td>${esc(qzOrderParty(o, 'Settlement Agent'))}</td>
      <td>${fmtDate(o.closingDate)}</td>
      <td onclick="event.stopPropagation()">
        <div style="display:flex;gap:4px">
          <button type="button" class="qz-btn xs" onclick="qzEditOrderModal('${o.id}')" title="Edit Order">Edit</button>
          <button type="button" class="qz-btn xs danger" onclick="qzDeleteOrderModal('${o.id}')" title="Delete Order">&times;</button>
        </div>
      </td>
    </tr>`;
  }).join('');
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
        <button class="qz-btn primary" type="button" onclick="qzOpenNewOrderWizard(1)">+ New Order</button>
      </div>
      <div class="qz-orders-stats">${qzOrdersStatsHTML()}</div>
    </div>
    <div class="qz-listhead">
      <div><h2>Orders</h2><div class="sub">Search, create, edit, or open a file the way you would in a live queue</div></div>
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
      <table class="qz-tbl"><thead><tr><th>Status</th><th>Stage</th><th>Order</th><th>Borrower</th><th>Seller</th><th>Property</th><th>Type</th><th>Agent</th><th>Closing</th><th>Actions</th></tr></thead>
      <tbody id="qzOrdersBody">${qzOrdersRowsHTML()}</tbody></table>
    </div>
  `;
}
function qzTopSearch(v) {
  qzState.orderFilter = v;
  qzState.ordersPage = 1;
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
    const pag = document.getElementById('qzOrdersPagination');
    if (pag) pag.innerHTML = qzOrdersPaginationHTML();
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
      { label: 'Loan', tab: 'loan' },
      { label: 'Earnest & Commissions', tab: 'earnest' },
      { label: 'Taxes & Prorations', tab: 'prorations' },
      { label: 'Payoffs', tab: 'payoffs' }
    ] },
    { label: 'Title', items: [
      { label: 'CPL', tab: 'cpl' },
      { label: 'Policy Info & Rates', tab: 'policy-info' },
      { label: 'Commitment', tab: 'commitment' },
      { label: 'Requirements', tab: 'requirements' },
      { label: 'Exceptions', tab: 'exceptions' },
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
      { label: 'CD Preview', tab: 'preview-cd' },
      { label: 'Settlement Statement', tab: 'preview-settlement' },
      { label: 'Mailing', tab: 'mailing' },
      { label: 'e-Recording', tab: 'recording' },
      { label: 'Proceeds', tab: 'proceeds' },
      { label: 'Workflow', tab: 'workflow' }
    ] }
  ] },
  { section: 'Integrations', groups: [
    { label: '', items: [
      { label: 'Marketplace', tab: 'marketplace', icon: 'market' },
      { label: 'e-Recording Gateway', tab: 'erecording', icon: 'doc' },
      { label: 'Title Underwriter', tab: 'underwriter', icon: 'acct' },
      { label: 'Qualia Sign (RON)', tab: 'esign', icon: 'connect' }
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
];
/* The rail used to end with a 'Training' section holding Document Review. An open order is
   product, not coursework, and that entry put an exercise two clicks from Basic Info in the
   same rail — which is why trainees reported finding lesson questions "inside" a file.
   Document Review is no longer an order tab at all: it is a course screen reached with
   qzGotoReview() (see its comment), so this rail holds only Qualia Core pages. */
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
    <button type="button" class="qz-dash-btn" onclick="qzNavGo('overview')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      Order Dashboard
    </button>
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
   where a VA writes down what they did, and the capstone expects it to still be there. */
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
  loan: 'Loan Information configures amortization, interest schedules, underwriter identifiers, and document generation.',
  documents: 'Documents tracks each file\'s paperwork through Pending, Received and Reviewed. A status is a statement of fact other people rely on.',
  tasks: 'Order Tasks lists what is outstanding on this file. Prioritise by closing impact and by whether the next step belongs to someone else.',
  workflow: 'Workflow shows the file\'s stage progression. Stage rules are configured by admins, not by a VA.',
  communication: 'Connect is where correspondence with agents, lenders and clients lives. Everything written here is part of the file record.',
  vendors: 'Marketplace tracks the vendors engaged on this order and their confirmation status.',
  closing: 'Disclosures collects what must be complete before the file can be called closing-ready.',
  accounting: 'The charges grid is read-only for a VA in Lesson mode, or a full double-entry trust ledger in Sandbox.'
};
function qzTogglePanel(key) {
  qzState.panel[key] = !qzState.panel[key];
  qzRenderRoot();
}
function qzSaveNote(orderId) {
  const el = document.getElementById('qzNoteBox');
  if (!el) return;
  const val = el.value;
  qzInsert('notes', { orderId, body: val, author: 'Training User', date: QZ_TODAY });
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

  const allTasks = qzTasksForOrder(o.id);
  const myOpenTasks = allTasks.filter(t => qzTaskStatus(t) !== 'Complete' && /you/i.test(t.assignedTo || ''));
  const openTasks = allTasks.filter(t => qzTaskStatus(t) !== 'Complete');
  const tasksBody = myOpenTasks.length
    ? myOpenTasks.map(t => `<div class="qz-panel-task" onclick="qzNavGo('tasks')"><span class="tt">${esc(t.title)}</span>${qzDueChipHTML(t.dueDate)}</div>`).join('')
    : `<div class="qz-panel-empty-card"><span class="qz-panel-empty-bar"></span><div>You have not been <a href="#" onclick="qzGotoMyTasks();return false;" class="qz-teal-link">assigned any tasks</a> on this order</div></div>`;

  const helpText = QZ_PANEL_HELP[qzState.orderTab] || 'Open a section from the rail on the left to see guidance for it.';
  const helpBody = `<p class="qz-panel-help">${esc(helpText)}</p>
    <div class="qz-kb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input type="text" placeholder="Search knowledge base&hellip;" onkeydown="if(event.key==='Enter') qzCoreStub('The knowledge base')"></div>
    <div class="qz-kb-btns"><button type="button" class="qz-btn sm" onclick="qzCoreStub('Help Center')">Help Center</button><button type="button" class="qz-btn sm" onclick="qzCoreStub('Contact Us')">Contact Us</button></div>`;

  const orderNotes = qzList('notes', n => n.orderId === o.id);
  const noteText = orderNotes.map(n => n.body).join('\n') || '';
  const notesBody = `<textarea id="qzNoteBox" class="qz-note-box" placeholder="Record what you did on this file, who you contacted, and what you are waiting on&hellip;">${esc(noteText)}</textarea>
    <button type="button" class="qz-btn sm primary" onclick="qzSaveNote('${o.id}')">Save note</button>`;

  return `<div class="qz-order-panel">
    ${qzPanelSectionHTML('chat', 'Chat', presence)}
    ${qzPanelSectionHTML('tasks', 'Tasks', tasksBody, `<span class="qz-panel-count">[ ${myOpenTasks.length} / ${allTasks.length} ]</span>`)}
    ${qzPanelSectionHTML('help', 'Help', helpBody)}
    ${qzPanelSectionHTML('notes', 'Notes', notesBody)}
  </div>`;
}

/* Human title for the page currently open, shown in the Core content header next to the
   house glyph the way Core titles each section of an order. */
const QZ_TAB_TITLE = {
  overview: 'Basic Info', dataentry: 'Properties & Contacts', loan: 'Loan Information',
  documents: 'Documents', tasks: 'Order Tasks', workflow: 'Workflow',
  communication: 'Connect', vendors: 'Marketplace', closing: 'Disclosures',
  accounting: 'Services Borrower Did Not Shop For (Section B)',
  earnest: 'Earnest Money & Brokerage Commissions',
  prorations: 'Taxes & Prorations Calculator',
  payoffs: 'Existing Loan Payoffs',
  cpl: 'Closing Protection Letter (CPL)',
  'policy-info': 'Title Policy Information & Promulgated Rates',
  commitment: 'Title Commitment (Schedules A & B)',
  requirements: 'Title Requirements (Schedule B - Part I)',
  exceptions: 'Title Exceptions (Schedule B - Part II)',
  'final-policy': 'Final Policy Production',
  'preview-cd': 'Closing Disclosure Live Preview',
  'preview-settlement': 'ALTA Settlement Statement',
  mailing: 'Mailing & Courier Tracking',
  recording: 'e-Recording Submission',
  marketplace: 'Qualia Marketplace',
  erecording: 'Simplifile / CSC Gateway',
  underwriter: 'Old Republic Underwriter Portal',
  esign: 'Qualia Sign / RON e-Signature',
  'global-docs': 'Documents',
  'global-messages': 'Connect Messages',
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
  else if (qzState.orderTab === 'loan') body = qzLoanHTML(o);
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
  else if (qzState.orderTab === 'requirements') body = qzRequirementsHTML(o);
  else if (qzState.orderTab === 'exceptions') body = qzExceptionsTabHTML(o);
  else if (qzState.orderTab === 'final-policy') body = qzFinalPolicyHTML(o);
  else if (qzState.orderTab === 'preview-cd') body = qzPreviewCdHTML(o);
  else if (qzState.orderTab === 'preview-settlement') body = qzPreviewSettlementHTML(o);
  else if (qzState.orderTab === 'mailing') body = qzMailingHTML(o);
  else if (qzState.orderTab === 'recording') body = qzRecordingHTML(o);
  else if (qzState.orderTab === 'marketplace') body = qzMarketplaceHTML(o);
  else if (qzState.orderTab === 'erecording') body = qzErecordingHTML(o);
  else if (qzState.orderTab === 'underwriter') body = qzUnderwriterHTML(o);
  else if (qzState.orderTab === 'esign') body = qzEsignHTML(o);
  else if (['cd-a', 'cd-c', 'cd-e', 'cd-f', 'cd-g', 'cd-h', 'cd-j', 'cd-km', 'cd-ln'].includes(qzState.orderTab)) {
    body = qzClosingDisclosureSectionHTML(o, qzState.orderTab);
  } else if (qzState.orderTab === 'proceeds') body = qzProceedsHTML(o);

  const title = QZ_TAB_TITLE[qzState.orderTab] || 'Order';
  const badges = {
    accounting: 'B', 'cd-a': 'A', 'cd-c': 'C', 'cd-e': 'E', 'cd-f': 'F',
    'cd-g': 'G', 'cd-h': 'H', 'cd-j': 'J', 'cd-km': 'K/M', 'cd-ln': 'L/N'
  };
  const badge = badges[qzState.orderTab] ? `<span class="qz-sec-badge">${badges[qzState.orderTab]}</span>` : '';
  return `<div class="qz-core${qzState.railOpen ? ' rail-open' : ''}">
    <div class="qz-rail-scrim" onclick="qzToggleRail(false)"></div>
    ${qzOrderSidebarHTML(o)}
    <div class="qz-order-main">
      <div class="qz-sec-head">
        <button type="button" class="qz-rail-toggle" onclick="qzToggleRail()" aria-label="Order navigation">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
        <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1V10"/></svg></span>
        <h2>${esc(title)}</h2>${badge}
        <span class="qz-sec-addr">${esc(o.propertyAddress)}</span>
      </div>
      ${flagHtml}
      <div class="qz-order-body">${body}</div>
    </div>
    ${qzOrderPanelHTML(o)}
  </div>`;
}

/* ---------- Overview (D.1 Basic Info Parity — 7 Groups) ---------- */
/* ============================================================================
   BASIC INFO — from a printed page to a working form
   ============================================================================

   Overview carried 28 values and exactly one control: the 1099 checkbox. A VA
   could read the file and change nothing on it, which makes the first screen of
   the product a poster.

   These helpers turn a qz-kv row into an editable one without inventing a
   second editing convention: every write goes through qzSetScalarOverride, the
   same path Data Entry and the Review corrections already use, so coercion of
   money fields and the audit entry come along for free.
   ============================================================================ */

/* One write path for every control on this page. Blank is allowed through:
   clearing a field a VA cannot verify is a legitimate act, and an empty field
   is honest where an invented default is not. */
function qzOrderFieldSet(orderId, field, value) {
  qzSetScalarOverride(orderId, field, typeof value === 'string' ? value.trim() : value);
  qzRenderRoot();
}
function qzOrderFieldSetNoRender(orderId, field, value) {
  qzSetScalarOverride(orderId, field, typeof value === 'string' ? value.trim() : value);
}

/* The address is stored as one line, so editing a part means recomposing it
   rather than keeping five fields that can drift out of agreement with the
   string every other screen reads. */
function qzSetAddressPart(orderId, part, value) {
  const o = qzFind('orders', orderId);
  if (!o) return;
  const p = String(o.propertyAddress || '').split(',');
  const street = (p[0] || '').trim();
  const city = (p[1] || '').trim();
  const stateZip = (p[2] || '').trim();
  const state = stateZip.split(' ')[0] || 'TX';
  const zip = stateZip.split(' ')[1] || '';

  const next = { street: street, city: city, state: state, zip: zip };
  next[part] = String(value == null ? '' : value).trim();

  const line = next.street + ', ' + next.city + ', ' + (next.state + ' ' + next.zip).trim();
  qzSetScalarOverride(orderId, 'propertyAddress', line);
  /* The county follows the city, the way it does on a real file: move the
     property and it is recorded somewhere else. */
  if (part === 'city' && QZ_COUNTY_BY_CITY[next.city]) {
    qzSetScalarOverride(orderId, 'county', QZ_COUNTY_BY_CITY[next.city]);
  }
  qzRenderRoot();
}

/* ---------- row builders ---------- */

function qzKvInput(o, label, field, opts) {
  opts = opts || {};
  const v = o[field];
  return '<div class="qz-kv"><b>' + label + '</b>' +
    '<input class="qz-kv-in' + (opts.strong ? ' strong' : '') + '"' +
    ' data-field="' + escAttr(field) + '"' +
    (opts.type ? ' type="' + opts.type + '"' : '') +
    ' value="' + escAttr(v == null ? '' : v) + '"' +
    (opts.placeholder ? ' placeholder="' + escAttr(opts.placeholder) + '"' : '') +
    ' onchange="qzOrderFieldSet(\'' + escAttr(o.id) + '\', \'' + escAttr(field) + '\', this.value)"></div>';
}

function qzKvSelect(o, label, field, options) {
  const v = o[field];
  const opts = options.map(function (x) {
    const val = Array.isArray(x) ? x[0] : x;
    const txt = Array.isArray(x) ? x[1] : x;
    return '<option value="' + escAttr(val) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(txt) + '</option>';
  }).join('');
  return '<div class="qz-kv"><b>' + label + '</b>' +
    '<select class="qz-kv-in" onchange="qzOrderFieldSet(\'' + escAttr(o.id) + '\', \'' + escAttr(field) + '\', this.value)">' +
    opts + '</select></div>';
}

/* A money field is typed the way people type money. qzSetScalarOverride runs it
   through qzCoerceFieldValue, so "$425,000.00" is stored as a number and
   Accounting does not end up totalling NaN. */
function qzKvMoney(o, label, field, opts) {
  opts = opts || {};
  const v = o[field];
  const shown = (v === 0 || v) ? fmtMoney(v) : '';
  return '<div class="qz-kv"><b>' + label + '</b>' +
    '<input class="qz-kv-in' + (opts.strong ? ' strong' : '') + '" value="' + escAttr(shown) + '"' +
    (opts.placeholder ? ' placeholder="' + escAttr(opts.placeholder) + '"' : '') +
    ' onchange="qzOrderFieldSet(\'' + escAttr(o.id) + '\', \'' + escAttr(field) + '\', this.value)"></div>';
}

/* ---------- the people picker ---------- */

/* Typing a name into the settlement team is how it goes wrong: a closer who
   left, a paralegal spelled two ways across four orders. The picker offers the
   directory, and the magnifier opens the full list filtered to the roles that
   can actually hold the seat. The field stays typeable, because a real Qualia
   install lets you name somebody outside the directory. */
function qzDirectoryNames(roles) {
  if (roles === 'attorney') return qzAttorneyPool();
  return qzList('users')
    .filter(function (u) { return roles.indexOf(u.role) > -1 && u.status !== 'Disabled'; })
    .map(function (u) { return u.name; });
}

function qzKvPeople(o, label, field, roles) {
  const names = qzDirectoryNames(roles);
  const listId = 'qzDir_' + field;
  const rolesArg = roles === 'attorney' ? '\'attorney\'' : JSON.stringify(roles).replace(/"/g, '&quot;');
  return '<div class="qz-kv"><b>' + label + '</b>' +
    '<span class="qz-people">' +
      '<input class="qz-kv-in" list="' + listId + '" value="' + escAttr(o[field] == null ? '' : o[field]) + '"' +
      ' onchange="qzOrderFieldSet(\'' + escAttr(o.id) + '\', \'' + escAttr(field) + '\', this.value)">' +
      '<datalist id="' + listId + '">' +
        names.map(function (n) { return '<option value="' + escAttr(n) + '"></option>'; }).join('') +
      '</datalist>' +
      '<button type="button" class="qz-people-btn" title="Browse the directory"' +
      ' onclick="qzOpenPeoplePicker(\'' + escAttr(o.id) + '\', \'' + escAttr(field) + '\', ' + rolesArg + ', \'' + escAttr(label) + '\')">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
        '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.7" y2="16.7"/></svg>' +
      '</button>' +
    '</span></div>';
}

function qzOpenPeoplePicker(orderId, field, roles, label) {
  const isAtty = roles === 'attorney';
  const people = isAtty
    ? qzList('contacts').filter(function (c) { return c.type === 'Attorney'; })
        .map(function (c) { return { name: c.name, role: c.company || 'Outside counsel', office: c.email || '' }; })
    : qzList('users').filter(function (u) { return roles.indexOf(u.role) > -1; })
        .map(function (u) { return { name: u.name, role: u.role, office: u.office, status: u.status }; });

  const old = document.getElementById('qzPeoplePicker');
  if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = 'qzPeoplePicker';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML =
    '<div class="qz-modal-card" style="max-width:520px">' +
      '<div class="ph"><h4>Assign ' + esc(label || field) + '</h4>' +
      '<button class="qz-btn sm" onclick="document.getElementById(\'qzPeoplePicker\').remove()">&times;</button></div>' +
      '<div class="qz-picker-list">' +
        people.map(function (p) {
          const disabled = p.status === 'Disabled';
          return '<button type="button" class="qz-picker-row' + (disabled ? ' is-off' : '') + '"' +
            (disabled ? ' disabled title="This account is disabled and cannot take new work."' : '') +
            ' onclick="qzPickPerson(\'' + escAttr(orderId) + '\', \'' + escAttr(field) + '\', \'' + escAttr(p.name) + '\')">' +
            '<b>' + esc(p.name) + '</b><span>' + esc(p.role || '') +
            (p.office ? ' &middot; ' + esc(p.office) : '') + '</span></button>';
        }).join('') +
      '</div>' +
      '<div style="text-align:right;padding-top:10px">' +
        '<button class="qz-btn" onclick="qzPickPerson(\'' + escAttr(orderId) + '\', \'' + escAttr(field) + '\', \'\')">Clear this seat</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);
}

function qzPickPerson(orderId, field, name) {
  const el = document.getElementById('qzPeoplePicker');
  if (el) el.remove();
  qzOrderFieldSet(orderId, field, name);
}

function qzOverviewHTML(o) {
  const addrParts = (o.propertyAddress || '').split(',');
  const street = (addrParts[0] || '').trim();
  const city = (addrParts[1] || '').trim();
  const stateZip = (addrParts[2] || '').trim();
  const state = stateZip.split(' ')[0] || 'TX';
  const zip = stateZip.split(' ')[1] || '75024';

  return `
    <div class="qz-panel">
      <div class="ph">
        <h4><span class="dot gold">${QZ_ICONS.overview}</span> Overview &amp; Timeline</h4>
        <div style="display:flex;gap:8px">
          <button class="qz-btn sm" type="button" onclick="qzEditOrderModal('${o.id}')">Edit Order</button>
          <button class="qz-btn sm danger" type="button" onclick="qzDeleteOrderModal('${o.id}')">Delete Order</button>
        </div>
      </div>
      ${qzTimelineHTML(o)}
      <div class="qz-tl-status"><b>Your order is currently in <span>${esc(QZ_STAGES[o.stageIndex])}</span></b><p>${esc(o.statusNote)}</p></div>
    </div>

    <div class="qz-grid2">
      <!-- 1. Important Dates.
           Funding and disbursement are not decoration: a refinance of a primary
           residence cannot fund until the three-day rescission period runs out,
           so on a refi these genuinely differ from the closing date. -->
      <div class="qz-panel">
        <div class="ph"><h4><span class="dot">${QZ_ICONS.summary}</span> 1. Important Dates</h4></div>
        ${qzKvInput(o, 'Closing Date', 'closingDate', { type: 'date', strong: true })}
        ${qzKvInput(o, 'Funding Date', 'fundingDate', { type: 'date' })}
        ${qzKvInput(o, 'Disbursement Date', 'disbursementDate', { type: 'date' })}
        ${qzKvInput(o, 'Order Opened', 'opened', { type: 'date' })}
      </div>

      <!-- 2. Amounts -->
      <div class="qz-panel">
        <div class="ph"><h4><span class="dot">${QZ_ICONS.summary}</span> 2. Amounts</h4></div>
        ${qzKvMoney(o, 'Purchase Price', 'purchasePrice', { strong: true })}
        ${qzKvMoney(o, 'Loan Amount', 'loanAmount', { strong: true, placeholder: 'None (Cash)' })}
        ${qzKvMoney(o, 'Earnest Money Deposit', 'earnestAmount', { placeholder: 'None' })}
      </div>
    </div>

    <div class="qz-grid2" style="margin-top:14px">
      <!-- 3. Type & Representation -->
      <div class="qz-panel">
        <div class="ph"><h4><span class="dot">${QZ_ICONS.summary}</span> 3. Type &amp; Order Identifiers</h4></div>
        ${qzKvSelect(o, 'Purpose', 'purpose', ['Purchase', 'Cash Purchase', 'Refinance', 'Commercial Purchase', 'Construction', 'Equity Loan'])}
        ${qzKvSelect(o, 'Representing', 'representing', ['Buyer', 'Seller', 'Borrower', 'Lender', 'Both'])}
        <div class="qz-kv"><b>Order #</b><span>${esc(o.id)} <button class="qz-btn sm" style="margin-left:8px;padding:2px 8px;font-size:11px" onclick="qzChangeOrderNumberModal('${o.id}')">Change Order #</button></span></div>
        <div class="qz-kv"><b>Settlement Statement</b><span>${esc(o.statementType)} <button class="qz-btn sm" style="margin-left:8px;padding:2px 8px;font-size:11px" onclick="qzToggleSettlementType('${o.id}')">Toggle HUD/CD</button></span></div>
        ${qzKvInput(o, 'Title #', 'titleNumber')}
      </div>

      <!-- 4. Reporting & Taxes.
           A refinance produces no seller proceeds, so it files no 1099-S. The
           checkbox reflects that instead of defaulting to checked. -->
      <div class="qz-panel">
        <div class="ph"><h4><span class="dot">${QZ_ICONS.summary}</span> 4. Reporting &amp; Tax Compliance</h4></div>
        ${qzKvInput(o, 'Source of Business', 'sourceOfBusiness', { placeholder: 'Referring agent, lender or firm' })}
        <div class="qz-kv"><b>1099 Eligible</b>
          <label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">
            <input type="checkbox" ${o.eligible1099 ? 'checked' : ''} onchange="qzToggle1099('${o.id}', this.checked)"> 1099-S Real Estate Proceeds
          </label>
        </div>
        ${qzKvSelect(o, 'Underwriter', 'underwriter', ['Old Republic National Title Insurance Co.', 'First American Title Insurance Co.', 'Stewart Title Guaranty Co.'])}
        ${qzKvInput(o, 'Policy Jacket', 'policyJacket')}
      </div>
    </div>

    <div class="qz-grid2" style="margin-top:14px">
      <!-- 5. Settlement Team.
           Six seats, each one a directory lookup. Counsel is engaged rather than
           employed, so the Attorney seat reads the contacts directory where the
           outside firms live. -->
      <div class="qz-panel">
        <div class="ph"><h4><span class="dot gold">${QZ_ICONS.parties}</span> 5. Settlement Team</h4></div>
        ${qzKvSelect(o, 'Settlement Agency', 'settlementAgency', QZ_BRANCHES.map(b => b.agency))}
        ${qzKvPeople(o, 'Order Opener', 'orderOpener', ['Processor', 'Escrow Officer', 'Virtual Assistant'])}
        ${qzKvPeople(o, 'Paralegal / Closer', 'paralegal', ['Closer', 'Title Examiner', 'Escrow Officer'])}
        ${qzKvPeople(o, 'Attorney', 'attorney', 'attorney')}
        ${qzKvPeople(o, 'Assistants', 'assistants', ['Processor', 'Virtual Assistant', 'Accounting'])}
        ${qzKvPeople(o, 'Marketers', 'marketers', ['Escrow Officer', 'Closer'])}
      </div>

      <!-- 6. Place of Closing.
           Street, city, state and zip write back into the single address line
           the rest of the product reads, so they cannot drift apart from it. -->
      <div class="qz-panel">
        <div class="ph"><h4><span class="dot">${QZ_ICONS.summary}</span> 6. Place of Closing</h4></div>
        <div class="qz-kv"><b>Street Address</b><input class="qz-kv-in" value="${escAttr(street)}" onchange="qzSetAddressPart('${o.id}', 'street', this.value)"></div>
        ${qzKvInput(o, 'Apt / Suite', 'aptSuite', { placeholder: 'None' })}
        <div class="qz-kv"><b>City</b><input class="qz-kv-in" value="${escAttr(city)}" onchange="qzSetAddressPart('${o.id}', 'city', this.value)"></div>
        ${qzKvSelect(o, 'County', 'county', ['Collin County', 'Dallas County', 'Denton County', 'Tarrant County', 'Rockwall County', 'Grayson County'])}
        <div class="qz-kv"><b>State</b>
          <select class="qz-kv-in" onchange="qzSetAddressPart('${o.id}', 'state', this.value)">
            ${['TX', 'OK', 'AR', 'LA', 'NM'].map(s => `<option value="${s}" ${state === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="qz-kv"><b>Zipcode</b><input class="qz-kv-in" value="${escAttr(zip)}" onchange="qzSetAddressPart('${o.id}', 'zip', this.value)"></div>
        <div class="qz-kv"><b>Legal Description</b><input class="qz-kv-in" value="${escAttr(o.legalDescription == null ? '' : o.legalDescription)}" placeholder="Not yet supplied by the examiner" onchange="qzOrderFieldSet('${o.id}', 'legalDescription', this.value)"></div>
      </div>
    </div>

    <!-- 7. Parties Summary Table -->
    <div class="qz-panel" style="margin-top:14px">
      <div class="ph">
        <h4><span class="dot gold">${QZ_ICONS.parties}</span> 7. Parties to Transaction</h4>
        <button class="qz-btn sm primary" type="button" onclick="qzAddPartyModal('${o.id}')">+ Add Party</button>
      </div>
      <table class="qz-parties">
        <thead><tr><th>Role</th><th>Name</th><th>Email</th><th>Phone</th><th class="ic">Actions</th></tr></thead>
        <tbody>
          ${(o.parties || []).map(p => `<tr>
            <td class="role"><b>${esc(p.role)}</b></td>
            <td class="name">${esc(p.name)}</td>
            <td>${p.email ? `<a href="mailto:${escAttr(p.email)}" style="color:var(--qz-ocean)">${esc(p.email)}</a>` : '<span class="qzs-dim">None</span>'}</td>
            <td>${p.phone ? esc(p.phone) : '<span class="qzs-dim">None</span>'}</td>
            <td class="ic">
              <div class="qz-row-actions">
                <button type="button" class="qz-btn sm" title="Edit Party" onclick="qzEditPartyModal('${o.id}', '${escAttr(p.role)}')">Edit</button>
                <button type="button" class="qz-btn sm danger" title="Delete Party" onclick="qzDeletePartyModal('${o.id}', '${escAttr(p.role)}')">&times;</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
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
function qzRevGet(id) {
  const key = qzScopedItemKey(id);
  return qzStore.reviews[key] || (qzStore.reviews[key] = { docOpened: false });
}
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
  const hint = `📖 Review the ${r.docTitle} to verify "${r.label}". When finished, click "Done Reading · Return to Exercise" to proceed.`;
  qzOpenDocFile(r.doc, r.docTitle, hint);
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
/* Sends the trainee to the real screen that owns the field under correction, and remembers
   which review is waiting on it. Deliberately does not go through qzOpenOrder: that marks
   'orders-open', a Lesson 1 checklist item, and re-marking it every time a later lesson opens
   a correction is noise. Nor through qzGoto, which kills the running walkthrough. */
function qzRevGoFix(id) {
  const r = qzReviewLookup(id);
  if (!r || !r.fixAt) return;
  qzState.pendingRevFix = id;
  /* The dialog steps aside for the edit: the trainee is being sent to a Core form to
     type in it, and a question floating over that form is in the way. It comes back on
     its own once the save is graded (qzRevFinalize). */
  if (qzAskingVerify(id)) qzAsk = null;
  qzOpenOrderTab(r.orderId);
  qzState.view = 'order';
  qzState.orderId = r.orderId;
  qzState.orderTab = r.fixAt.tab;
  qzState.deTab = r.fixAt.deTab || 'property';
  qzState.composeId = null;
  qzSyncTopTabs();
  qzRenderRoot();
  /* The hand-off changes the screen AND the phase, so the walkthrough has to re-resolve:
     without this the tip kept the sentence it was showing while the dialog was up, and
     the highlight was never placed on the field the trainee had just been sent to. */
  qzSyncVerifyStep(id);
}

/* Back to the exercise without saving anything — the escape hatch for a trainee who followed
   the hand-off and then wanted to re-read the question. */
function qzRevBackToExercise() {
  const r = qzState.pendingRevFix ? qzReviewLookup(qzState.pendingRevFix) : null;
  /* A fieldAt item has no exercise page to go back TO: the question is a dialog over
     this very screen, so bringing it back is the whole of "back". */
  if (r && r.fieldAt) { qzAsk = { kind: 'verify', id: r.id }; qzRenderRoot(); qzSyncVerifyStep(r.id); return; }
  qzGotoReview(r ? r.orderId : qzState.reviewOrderId);
}

/* Grades a correction typed into the real form. Unlike the inline step 4, the wrong value is
   written to the order first and flagged afterwards: that is what the product would do, and it
   is the same convention the de-edit exercise already follows in this file. */
function qzRevGradeFix(id, value) {
  const r = qzReviewLookup(id);
  const st = qzRevGet(id);
  st.correctedValueSaved = value;
  st.step4ValueCorrect = qzNormalizeValue(value) === qzNormalizeValue(r.correctedValue);
  if (!st.step4ValueCorrect) {
    qzSave();
    // The wrong value did reach the order, so the form has to repaint around it: the Save
    // button goes back to hidden and the field shows what is actually stored now.
    qzRenderRoot();
    simToast(`Saved, but that does not match ${r.docTitle} — read it again and correct the field.`);
    qzSyncVerifyStep(id);
    return false;
  }
  qzState.pendingRevFix = null;
  qzRevFinalize(id);
  simToast('Correction saved on the order.', { tone: 'good' });
  // fieldAt items stay on the screen the correction was made on; qzRevFinalize brings
  // the dialog back over it carrying the explanation and the Continue button.
  if (!r.fieldAt) qzGotoReview(r.orderId);
  return true;
}

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
  if (!qzRevExamMode(id) && (!note || note.length < 10)) {
    simToast('Please write a brief note explaining why this is escalated (at least 10 characters).');
    return;
  }
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
  /* A fieldAt item is worked on product screens, so its explanation and its "Continue
     to next step" button have nowhere to land unless the dialog comes back for them.
     Lessons only: the exam renders its own paper. */
  const rr = qzReviewLookup(id);
  if (rr && rr.fieldAt && qzState.lessonId && !qzRevExamMode(id)) qzAsk = { kind: 'verify', id: id };
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

  /* On an ask-layer item the source document is fetched the way a VA fetches one: from the
     file's own Documents list. The dialog says where it is and hands over to that screen
     (qzRevGoDoc), which makes the View button on the real row the thing that satisfies this
     step. Once it has been read once the button reopens it directly — re-reading is not the
     skill, finding it was. Items with no row on the list keep the direct-open button. */
  const docRowId = r.fieldAt ? qzRevDocRowId(r) : null;
  const step1 = `<div class="qz-rv-step ${st.docOpened ? 'done' : 'active'}" data-rev-phase="1">
    <div class="qz-rv-step-h">Step 1 &middot; Open the source document</div>
    ${(docRowId != null && !st.docOpened)
      ? `<p class="qz-rv-handoff">The ${esc(r.docTitle)} is filed under this order's Documents, with everything else on the file. Go and open it from there.</p>
         <div class="qz-rv-actions"><button class="qz-btn sm primary" onclick="qzRevGoDoc('${id}')">Take me to Documents &rarr;</button></div>`
      : `<button class="qz-btn sm" onclick="qzRevOpenDoc('${id}')">${st.docOpened ? 'Reopen' : 'Open'} ${esc(r.docTitle)}</button>`}
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
  if (step4Kind === 'correct' && r.fixAt) {
    /* The correction is made in the product, on the screen that owns the field, because that
       is where a VA makes it on the job — typing it into the exercise taught the answer but
       never the action. The value is graded when the real form is saved (qzDeSaveChanges),
       so a wrong entry is caught there rather than here. */
    /* On an ask-layer item the fix screen is usually the one already open behind the
       dialog, so "Open Data Entry -> Parties" would be telling the trainee to go somewhere
       they are standing. Say what is actually true instead. */
    const sameScreen = !!(r.fieldAt && r.fieldAt.tab === r.fixAt.tab
      && (r.fieldAt.deTab || null) === (r.fixAt.deTab || null));
    step4 = `<div class="qz-rv-step active" data-rev-phase="4">
      <div class="qz-rv-step-h">Step 4 &middot; Correct it where it lives</div>
      <p class="qz-rv-handoff">${sameScreen
        ? `This value is wrong on the order. ${esc(r.fixAt.label)} is already open behind this box: correct <b>${esc(r.label)}</b> there to match ${esc(r.docTitle)}, and save it.`
        : `This value is wrong on the order. Open ${esc(r.fixAt.label)}, correct <b>${esc(r.label)}</b> to match ${esc(r.docTitle)}, and save it there.`}</p>
      <div class="qz-rv-actions"><button class="qz-btn sm primary" onclick="qzRevGoFix('${id}')">${sameScreen ? 'Take me to the field' : 'Open ' + esc(r.fixAt.label)} &rarr;</button></div>
    </div>`;
  } else if (step4Kind === 'correct') {
    // No fixAt: the field has no screen a VA may edit (the charges grid is read-only in
    // Lesson mode), so the correction is still typed here.
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
/* Document Review is coursework, so it renders on the course's own chrome — no dark rail, no
   property header, no order tab strip — instead of inside an open file. It used to be an order
   tab wearing full Core chrome with an amber "not a Qualia Core screen" badge stapled on, which
   is the shape of the problem rather than a fix for it: a screen that needs a label explaining
   it is not the product is a screen in the wrong place. Removing it from the order rail (see
   QZ_CORE_NAV) was the first half of this; this is the second.

   The order stays open in the tab strip, so stepping into the exercise does not close the file
   the trainee was working. */
function qzGotoReview(orderId) {
  qzState.pendingRevFix = null;
  qzState.pendingRecDoc = null;
  qzState.pendingRecFix = null;
  qzOpenOrderTab(orderId);
  qzState.view = 'review';
  qzState.reviewOrderId = orderId;
  /* Cleared so no order tab reads as active while a course screen is showing. Safe for the
     walkthrough: verify and reconcile steps carry no orderId, so the current-step matcher
     accepts them whatever this holds. */
  qzState.orderId = null;
  qzSyncTopTabs();
  qzRenderRoot();
}

function qzReviewViewHTML() {
  const o = qzGetOrder(qzState.reviewOrderId);
  if (!o) return `<div class="qz-panel"><div class="ph"><h4>Document Review</h4></div>
    <p style="font-size:13px;color:var(--qz-muted)">Open this exercise from a lesson.</p></div>`;
  return `
    <div class="qz-listhead">
      <div><h2>Document Review</h2><div class="sub">A course exercise, not a Qualia screen. Open the source document, report what it says, then decide what to do about it.</div></div>
      <span class="qz-rv-file">Order ${esc(o.id.replace('ORD-', ''))} &middot; ${esc(o.propertyAddress)}</span>
    </div>
    ${qzReviewHTML(o)}
  `;
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
  if (qzState.pendingRevFix) qzSyncVerifyStep(qzState.pendingRevFix);
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
    /* A Document Review correction that was handed off to this form (qzRevGoFix) is graded
       against the source document once the trainee saves, so the exercise resolves from the
       real edit rather than from a value typed into the exercise. */
    const fix = qzState.pendingRevFix ? qzReviewLookup(qzState.pendingRevFix) : null;
    let fixValue = null;
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
      if (fix && fix.orderId === orderId && fix.partyRole === role && nameEl) fixValue = nameEl.value.trim();
    });
    if (fixValue !== null) {
      /* Graded here and nowhere else: qzRevGradeFix owns the toast and the navigation back.
         Returning early also skips the de-edit marking below on purpose — that is Lesson 1's
         "first tracked edit" step, and a correction handed off by a later lesson is not it. */
      qzRevGradeFix(qzState.pendingRevFix, fixValue);
      return;
    }
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
  const saveBtn = `<button class="qz-btn primary" id="qzDeSaveBtn" style="display:none" onclick="qzDeSaveChanges('${o.id}')">Save Changes</button>`;

  let body = '';
  if (sub === 'property') {
    const parts = o.propertyAddress.split(',');
    body = `<div class="qz-form-grid">
      <div class="qz-field"><label>Street Address</label><input id="qzDeStreet" value="${escAttr(parts[0] || '')}" oninput="qzDeMarkDirty()"></div>
      <div class="qz-field"><label>City</label><input id="qzDeCity" value="${escAttr((parts[1] || '').trim())}" oninput="qzDeMarkDirty()"></div>
      <div class="qz-field"><label>State / Zip</label><input id="qzDeStateZip" value="${escAttr((parts[2] || '').trim())}" oninput="qzDeMarkDirty()"></div>
      <div class="qz-field"><label>Property Type</label><input id="qzDePropType" value="${escAttr(o.propertyType)}" oninput="qzDeMarkDirty()"></div>
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

/* ---------- Loan Information (D.2 Parity — 6 Groups) ---------- */
function qzSaveLoanInfo(orderId) {
  const o = qzFind('orders', orderId);
  if (!o) return;
  const loanType = document.getElementById('qzLoanType')?.value;
  const loanAmount = qzParseNumeric(document.getElementById('qzLoanAmount')?.value);
  const fundingType = document.getElementById('qzLoanFundingType')?.value;
  const loanPurpose = document.getElementById('qzLoanPurpose')?.value;
  const loanProduct = document.getElementById('qzLoanProduct')?.value;
  const loanIdNumber = document.getElementById('qzLoanIdNum')?.value;
  const mic = document.getElementById('qzLoanMicNum')?.value;
  const graceDays = parseInt(document.getElementById('qzLoanGraceDays')?.value) || 15;
  const penaltyAmt = parseFloat(document.getElementById('qzLoanPenaltyAmount')?.value) || 5.0;
  const penaltyType = document.getElementById('qzLoanPenaltyType')?.value;
  const interestOnly = document.getElementById('qzLoanInterestOnly')?.value === 'Yes';
  const interestRate = document.getElementById('qzLoanRate')?.value;
  const interestType = document.getElementById('qzLoanInterestType')?.value;
  const genDocs = !!document.getElementById('qzLoanGenMortgageDocs')?.checked;

  const patch = {
    loanType, fundingType, loanPurpose, loanProduct, loanIdNumber,
    mortgageInsCaseNumber: mic, gracePeriodDays: graceDays,
    latePenaltyAmount: penaltyAmt, latePenaltyType: penaltyType,
    interestOnly, interestRate, interestType, generatingMortgageDocs: genDocs
  };
  if (loanAmount !== null) patch.loanAmount = loanAmount;
  qzUpdate('orders', orderId, patch);
  simToast('Loan details saved successfully.', { tone: 'good' });
  qzRenderRoot();
}

function qzLoanHTML(o) {
  return `
    <div class="qz-panel">
      <div class="ph">
        <h4>Loan Information</h4>
        <button class="qz-btn sm primary" type="button" onclick="qzSaveLoanInfo('${o.id}')">Save Loan Info</button>
      </div>
      <p style="font-size:12.5px;color:var(--qz-muted);margin-bottom:16px">Origination, amortization schedule, underwriting identifiers and interest calculations for this file.</p>
      
      <div class="qz-grid2">
        <div class="qz-calc-card">
          <h5 style="margin:0 0 10px 0;color:var(--qz-navy)">1. Loan Overview</h5>
          <div class="qz-form-grid">
            <div class="qz-field"><label>Loan Type</label>
              <select id="qzLoanType">
                <option value="Conventional" ${(o.loanType||'Conventional')==='Conventional'?'selected':''}>Conventional</option>
                <option value="FHA" ${(o.loanType||'')==='FHA'?'selected':''}>FHA</option>
                <option value="VA" ${(o.loanType||'')==='VA'?'selected':''}>VA</option>
                <option value="USDA" ${(o.loanType||'')==='USDA'?'selected':''}>USDA / Rural Housing</option>
                <option value="Commercial" ${(o.loanType||'')==='Commercial'?'selected':''}>Commercial</option>
              </select>
            </div>
            <div class="qz-field"><label>Loan Amount ($)</label><input id="qzLoanAmount" value="${fmtMoney(o.loanAmount)}"></div>
            <div class="qz-field"><label>Funding Type</label>
              <select id="qzLoanFundingType">
                <option value="Net" ${(o.fundingType||'Net')==='Net'?'selected':''}>Net Funding</option>
                <option value="Gross" ${(o.fundingType||'')==='Gross'?'selected':''}>Gross Funding</option>
              </select>
            </div>
          </div>
        </div>

        <div class="qz-calc-card">
          <h5 style="margin:0 0 10px 0;color:var(--qz-navy)">2. Term &amp; Dates</h5>
          <div class="qz-form-grid">
            <div class="qz-field"><label>Loan Term</label><input id="qzLoanTerm" value="${o.loanTermYears || 30} yr / ${o.loanTermMonths || 360} mo"></div>
            <div class="qz-field"><label>First Payment Date</label><input id="qzLoanFirstPayment" type="date" value="${o.firstPaymentDate || '2026-10-01'}"></div>
            <div class="qz-field"><label>Maturity Date</label><input id="qzLoanLastPayment" type="date" value="${o.lastPaymentDate || '2056-09-01'}"></div>
            <div class="qz-field"><label>Mortgage Commitment Date</label><input id="qzLoanCommitmentDate" type="date" value="${o.mortgageCommitmentDate || '2026-08-15'}"></div>
          </div>
        </div>
      </div>

      <div class="qz-grid2" style="margin-top:14px">
        <div class="qz-calc-card">
          <h5 style="margin:0 0 10px 0;color:var(--qz-navy)">3. Disclosures &amp; Tracking</h5>
          <div class="qz-form-grid">
            <div class="qz-field"><label>Loan Purpose</label><input id="qzLoanPurpose" value="${escAttr(o.loanPurpose)}"></div>
            <div class="qz-field"><label>Loan Product</label><input id="qzLoanProduct" value="${escAttr(o.loanProduct || '30-Year Fixed Rate')}"></div>
            <div class="qz-field"><label>Loan ID #</label><input id="qzLoanIdNum" value="${escAttr(o.loanIdNumber)}" placeholder="No loan on this file"></div>
            <div class="qz-field"><label>Mortgage Ins. Case #</label><input id="qzLoanMicNum" value="${escAttr(o.mortgageInsCaseNumber)}" placeholder="Not required below 80% LTV"></div>
          </div>
        </div>

        <div class="qz-calc-card">
          <h5 style="margin:0 0 10px 0;color:var(--qz-navy)">4. Late Penalty</h5>
          <div class="qz-form-grid">
            <div class="qz-field"><label>Grace Period (Days)</label><input id="qzLoanGraceDays" type="number" value="${o.gracePeriodDays || 15}"></div>
            <div class="qz-field"><label>Late Penalty Amount</label><input id="qzLoanPenaltyAmount" value="${o.latePenaltyAmount || 5.0}"></div>
            <div class="qz-field"><label>Penalty Type</label>
              <select id="qzLoanPenaltyType">
                <option value="%" ${(o.latePenaltyType||'%')==='%'?'selected':''}>% of Monthly P&amp;I</option>
                <option value="$" ${(o.latePenaltyType||'')==='$'?'selected':''}>Fixed Dollar ($)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="qz-calc-card" style="margin-top:14px">
        <h5 style="margin:0 0 10px 0;color:var(--qz-navy)">5. Interest &amp; Rate Configuration</h5>
        <div class="qz-form-grid">
          <div class="qz-field"><label>Interest Only?</label>
            <select id="qzLoanInterestOnly">
              <option value="No" ${!o.interestOnly?'selected':''}>No (Amortizing P&amp;I)</option>
              <option value="Yes" ${o.interestOnly?'selected':''}>Yes (Interest-Only Period)</option>
            </select>
          </div>
          <div class="qz-field"><label>Interest Rate</label><input id="qzLoanRate" value="${escAttr(o.interestRate || '6.375%')}"></div>
          <div class="qz-field"><label>Interest Type</label>
            <select id="qzLoanInterestType">
              <option value="Fixed" ${(o.interestType||'Fixed')==='Fixed'?'selected':''}>Fixed Rate</option>
              <option value="Adjustable" ${(o.interestType||'')==='Adjustable'?'selected':''}>Adjustable Rate (ARM)</option>
            </select>
          </div>
        </div>
      </div>

      <div style="margin-top:14px;padding:12px;background:var(--qz-bg);border:1px solid var(--qz-line);border-radius:6px;display:flex;align-items:center;justify-content:space-between">
        <label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="qzLoanGenMortgageDocs" ${o.generatingMortgageDocs ? 'checked' : ''}>
          Generate Mortgage Closing Documents from Qualia Document Engine
        </label>
        <button class="qz-btn sm primary" type="button" onclick="qzSaveLoanInfo('${o.id}')">Save Changes</button>
      </div>
    </div>`;
}

/* ---------- Documents (D.5 Parity — Folder Tree & Template Library) ---------- */
let qzDocActiveFolder = 'All Documents';
let qzDocQuery = '';

function qzSelectDocFolder(f) {
  qzDocActiveFolder = f;
  qzRenderRoot();
}

function qzUploadDoc(id) {
  qzUpdate('documents', id, { status: 'Received' });
  qzMark('docs-upload');
  const d = qzFind('documents', id);
  if (d && d.type === 'HOA') {
    const o = qzFind('orders', d.orderId);
    if (o && o.flag === 'missing-document') {
      qzUpdate('orders', d.orderId, {
        flag: null,
        stageIndex: o.stageIndex + 1,
        statusNote: 'The HOA Resale Certificate has been received. Closing prep can continue.'
      });
    }
  }
  if (qzState.pendingRecFix) {
    const prf = qzState.pendingRecFix;
    const r = qzRecLookup(prf.recId);
    const row = r && r.rows.find(x => x.id === prf.rowId);
    if (row && row.fixAt && String(row.fixAt.docId) === String(id)) {
      qzRecGradeFix(prf.recId, prf.rowId, 'Received');
      return;
    }
  }
  qzRenderRoot();
}

/* ---------- opening a file-backed document ----------
   15 of the 16 files in documents/ carry their dates printed into the HTML, and the viewer
   in sim-engine.js just points an iframe at them. Rather than templating all sixteen (that
   is D3, a much bigger job) the text is shifted on its way to the viewer and served as a
   blob, so a document always agrees with the order it belongs to.

   The <base> tag is what keeps doc.css alive: a blob URL has no base of its own to resolve
   'doc.css' against. qzRenderTemplatedDoc solves the same problem the same way.

   Cached per file: a trainee re-opening the purchase agreement should not refetch it, and
   the shift cannot change inside one session. */
const _qzShiftedDocs = {};

function qzOpenDocFile(file, title, hint) {
  if (!QZ_SHIFT_DAYS) { simViewDoc(file, title, hint); return; }
  if (_qzShiftedDocs[file]) { simViewDoc(_qzShiftedDocs[file], title, hint); return; }
  let base = file;
  try { base = new URL(file, location.href).href; } catch (e) {}
  fetch(file)
    .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error(String(r.status))); })
    .then(function (html) {
      const shifted = qzShiftDateText(html)
        .replace(/<head(\s[^>]*)?>/i, function (m) { return m + '<base href="' + base + '">'; });
      const url = URL.createObjectURL(new Blob([shifted], { type: 'text/html' }));
      _qzShiftedDocs[file] = url;
      simViewDoc(url, title, hint);
    })
    .catch(function (e) {
      console.warn('Could not shift dates in ' + file + ' (' + e.message + '); serving as-is.');
      simViewDoc(file, title);
    });
}

/* Opens a row by id and resolves file-vs-template itself. The previous inline handler
   interpolated the document NAME into a JS string literal inside an onclick attribute,
   which breaks the moment a name contains an apostrophe - the same class of bug the
   PROMPT records as "Id sin comillas en handler inline". Nothing but the id crosses
   the attribute boundary now. */
function qzOpenDocRow(id) {
  const d = qzFind('documents', id);
  if (!d) return;
  const hint = `📖 Review ${d.name}. When finished, click "Done Reading · Return to Exercise" to continue.`;
  if (d.file) { qzViewDoc(d.file, d.name, hint); return; }
  qzViewGeneratedDoc(d.id);
}

function qzViewDoc(file, title, hint) {
  qzMark('docs-download');
  qzOpenDocFile(file, title, hint);
  qzAskNoteDocOpened(file);
}
function qzDownloadDoc() { qzMark('docs-download'); simToast('Downloaded (training only, no real file was transferred).'); }
function qzReviewDoc(id) { qzUpdate('documents', id, { status: 'Reviewed' }); qzMark('docs-review'); qzRenderRoot(); }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') simCloseDoc();
});

/* Leading row glyph, as in the product. Keyed off the document's own type so a title
   document and a lender package are not the same shape. */
const QZ_DOC_GLYPH = {
  Contract: '&#128196;', Title: '&#128209;', Lender: '&#127974;', HOA: '&#127968;',
  Property: '&#128506;', Payoff: '&#128176;', Invoice: '&#129534;'
};

function qzDocumentsHTML(o) {
  const o2 = qzGetOrder(o.id);
  const daysToClosing = o2 ? qzDaysFromToday(o2.closingDate) : null;
  const allDocs = qzDocsForOrder(o.id);
  const folders = ['All Documents', 'Buyer', 'Seller', 'Title & Escrow', 'Lender', 'Closing Packages', 'Archive'];
  
  const folderList = folders.map(f => {
    const count = f === 'All Documents' ? allDocs.length : allDocs.filter(d => (d.folder || 'Title & Escrow') === f).length;
    const on = (qzDocActiveFolder === f);
    return `<div class="qz-doc-folder ${on ? 'active' : ''}" onclick="qzSelectDocFolder('${escAttr(f)}')">
      <span>&#128193; ${esc(f)}</span>
      <span class="qz-badge ${count ? 'neutral' : 'open'}">${count}</span>
    </div>`;
  }).join('');

  const q = (qzDocQuery || '').toLowerCase();
  const filtered = allDocs
    .filter(d => qzDocActiveFolder === 'All Documents' || (d.folder || 'Title & Escrow') === qzDocActiveFolder)
    .filter(d => !q || d.name.toLowerCase().indexOf(q) > -1 || d.type.toLowerCase().indexOf(q) > -1);

  const rows = filtered.map(d => {
    const st = qzDocStatus(d);
    const badgeClass = st === 'Pending' ? 'pending' : st === 'Received' ? 'received' : 'reviewed';
    const pressure = (st === 'Pending' && daysToClosing !== null)
      ? ` <span class="qz-due ${daysToClosing < 0 ? 'overdue' : daysToClosing <= 7 ? 'soon' : 'far'}">closing in ${daysToClosing}d</span>`
      : '';
    let actions = '';
    if (st === 'Pending') {
      actions = `<button class="qz-btn sm primary" data-doc-action="upload" onclick="qzUploadDoc('${escAttr(String(d.id))}')">Upload</button>`;
      if (d.file || qzDocIsOpenable(d)) actions += ` <button class="qz-btn sm" data-doc-action="view" onclick="qzOpenDocRow('${escAttr(String(d.id))}')">View</button>`;
    } else {
      if (d.file || qzDocIsOpenable(d)) {
        actions = `<button class="qz-btn sm" data-doc-action="view" onclick="qzOpenDocRow('${escAttr(String(d.id))}')">View</button>`;
      } else {
        actions = `<button class="qz-btn sm" data-doc-action="download" onclick="qzDownloadDoc()">Download</button>`;
      }
      if (st === 'Received') actions += ` <button class="qz-btn sm" data-doc-action="review" onclick="qzReviewDoc('${escAttr(String(d.id))}')">Mark Reviewed</button>`;
    }
    actions += ` <button class="qz-btn sm" title="Edit Document" onclick="qzEditDocModal('${escAttr(String(d.id))}')">&#9998;</button>`;
    actions += ` <button class="qz-btn sm danger" title="Delete Document" onclick="qzDeleteDocModal('${escAttr(String(d.id))}')">&times;</button>`;

    const nameCell = (d.file || qzDocIsOpenable(d))
      ? `<button type="button" class="qz-doc-name" data-doc-action="view" onclick="qzOpenDocRow('${escAttr(String(d.id))}')">${esc(d.name)}</button>`
      : `<b>${esc(d.name)}</b>`;

    return `<tr data-doc-id="${d.id}">
      <td class="qz-doc-glyph">${QZ_DOC_GLYPH[d.type] || '&#128196;'}</td>
      <td>${nameCell}</td>
      <td>${esc(d.type)}</td>
      <td><span class="qz-badge ${badgeClass}">${st}</span>${pressure}</td>
      <td>${fmtDate(d.date)}</td>
      <td><div class="qz-row-actions">${actions}</div></td>
    </tr>`;
  }).join('');

  return `
    <div class="qz-doc-container">
      <aside class="qz-doc-tree">
        <div class="qz-doc-tree-head">
          <b>Folders</b>
          <button class="qz-btn sm" onclick="qzNewFolderModal('${o.id}')">+ Folder</button>
        </div>
        <div class="qz-doc-folder-list">${folderList}</div>
      </aside>
      <main class="qz-doc-content">
        <div class="qz-doc-bar">
          <div class="qz-doc-crumb">&#128190; ${esc(qzDocActiveFolder)}</div>
          <div class="qz-doc-bar-actions">
            <input type="text" placeholder="Search documents..." class="qz-input sm" value="${escAttr(qzDocQuery)}" oninput="qzDocQuery=this.value;qzRenderRoot()">
            <button class="qz-btn sm" type="button" onclick="qzTemplateLibraryModal('${o.id}')">Template Library</button>
            <button class="qz-btn sm primary" type="button" onclick="qzAddDocumentModal('${o.id}')">+ Add Document</button>
          </div>
        </div>
        <div class="qz-panel" style="margin-bottom:0">
          <div class="qz-tbl-scroll">
            <table class="qz-tbl">
              <thead><tr><th></th><th>Name</th><th>Type</th><th>Status</th><th>Modified</th><th>Actions</th></tr></thead>
              <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--qz-muted)">No documents in this folder.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </main>
    </div>`;
}

/* ---------- Tasks (D.4 Parity — Workflow Groups & Progress) ---------- */
function qzCompleteTask(id) {
  qzUpdate('tasks', id, { status: 'Complete' });
  qzMark('tasks-complete');
  qzRenderRoot();
  qzUpdateBellBadge();
}

function qzToggleTaskStatus(id, done) {
  qzUpdate('tasks', id, { status: done ? 'Complete' : 'Open' });
  if (done) qzMark('tasks-complete');
  qzRenderRoot();
  qzUpdateBellBadge();
}

/* ============================================================================
   EDITABLE CALCULATION ROWS
   ============================================================================

   Fifteen pages were built out of 85 qz-calc-row elements, and every one of
   them was a printed value. Some were derived from the order and correct;
   many were constants wearing a label:

       <span>Effective Combined Tax Rate:</span><span class="qz-calc-val">2.15% / year</span>
       <span>Tracking Number:</span><span class="qz-calc-val">7894-2201-9941</span>

   The same tax rate and the same FedEx tracking number on all 75 files.

   These helpers are the calc-row equivalent of what qzKvInput did for Basic
   Info: the row keeps looking like a printed statement, and it writes to the
   order through the one path that coerces money and logs an audit entry.

   A row that is genuinely CALCULATED stays read-only, and says so, because a
   trainee who can type over a computed total learns nothing about where the
   total came from. qzCalcOut is that row.
   ============================================================================ */

function qzCalcIn(o, label, field, opts) {
  opts = opts || {};
  const v = o[field];
  const shown = opts.money ? ((v === 0 || v) ? fmtMoney(v) : '') : (v == null ? '' : v);
  return '<div class="qz-calc-row"><span>' + label + '</span>' +
    '<input class="qz-calc-in" value="' + escAttr(shown) + '"' +
    (opts.type ? ' type="' + opts.type + '"' : '') +
    (opts.placeholder ? ' placeholder="' + escAttr(opts.placeholder) + '"' : '') +
    ' aria-label="' + escAttr(String(label).replace(/:$/, '')) + '"' +
    ' onchange="qzOrderFieldSet(\'' + escAttr(o.id) + '\', \'' + escAttr(field) + '\', this.value)"></div>';
}

function qzCalcSelect(o, label, field, options) {
  const v = o[field];
  return '<div class="qz-calc-row"><span>' + label + '</span>' +
    '<select class="qz-calc-in" onchange="qzOrderFieldSet(\'' + escAttr(o.id) + '\', \'' + escAttr(field) + '\', this.value)">' +
    options.map(function (x) {
      return '<option value="' + escAttr(x) + '"' + (String(v) === String(x) ? ' selected' : '') + '>' + esc(x) + '</option>';
    }).join('') + '</select></div>';
}

/* A derived figure. Read-only on purpose, and marked so the distinction between
   "what was entered" and "what was worked out" stays visible. */
function qzCalcOut(label, value, opts) {
  opts = opts || {};
  return '<div class="qz-calc-row' + (opts.total ? ' total' : '') + '"><span>' + label + '</span>' +
    '<span class="qz-calc-val' + (opts.cls ? ' ' + opts.cls : '') + '" title="Calculated from the fields above">' +
    value + '</span></div>';
}

/* ---------- the pages ---------- */

function qzEarnestHTML(o) {
  const pct = Number(o.commissionPct) || 6;
  const total = Math.round((o.purchasePrice || 0) * pct / 100);
  const listing = Math.round(total * (Number(o.listingSplitPct) || 50) / 100);
  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Earnest Money &amp; Brokerage Commissions</h4></div>' +
    '<div class="qz-calc-card">' +
      '<h5 class="qz-calc-h">Earnest Money Escrow Deposit</h5>' +
      qzCalcIn(o, 'Earnest Money Deposit Amount:', 'earnestAmount', { money: true, placeholder: 'None on a refinance' }) +
      qzCalcIn(o, 'Escrow Account Held At:', 'escrowBank') +
      qzCalcIn(o, 'Deposit Date:', 'earnestDepositDate', { type: 'date' }) +
      qzCalcSelect(o, 'Receipt Status:', 'earnestStatus', ['Deposited & Cleared', 'Deposited, Pending Clearance', 'Not Yet Received', 'Released']) +
    '</div>' +
    '<div class="qz-calc-card" style="margin-top:12px">' +
      '<h5 class="qz-calc-h">Real Estate Brokerage Commissions</h5>' +
      qzCalcIn(o, 'Total Commission Rate (% of sale price):', 'commissionPct') +
      qzCalcOut('Total Commission (' + pct + '% of ' + fmtMoney(o.purchasePrice) + '):', fmtMoney(total)) +
      qzCalcIn(o, 'Listing Broker Share (%):', 'listingSplitPct') +
      qzCalcOut('Listing Broker &mdash; ' + esc(qzOrderParty(o, 'Listing Agent')) + ':', fmtMoney(listing)) +
      qzCalcOut('Selling Broker &mdash; ' + esc(qzOrderParty(o, 'Selling Agent')) + ':', fmtMoney(total - listing)) +
      qzCalcIn(o, 'Disbursement Source:', 'commissionSource') +
    '</div></div>';
}

function qzProrationsHTML(o) {
  const price = o.purchasePrice || 0;
  const rate = Number(o.taxRatePct) || 0;
  const annualTax = Math.round(price * rate / 100);
  const cm = Number(String(o.closingDate || '').slice(5, 7));
  const cd = Number(String(o.closingDate || '').slice(8, 10));
  const daysElapsed = Math.min(365, (cm - 1) * 30 + cd);
  const sellerTaxShare = Math.round(annualTax * (daysElapsed / 365) * 100) / 100;
  const hoa = Number(o.hoaAssessment) || 0;
  const cycleDays = o.hoaCycle === 'Monthly' ? 30 : o.hoaCycle === 'Annual' ? 365 : 90;
  const dayInCycle = cd % cycleDays;
  const sellerHoa = Math.round(hoa * (dayInCycle / cycleDays) * 100) / 100;

  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Taxes &amp; Prorations Calculator</h4></div>' +
    '<p class="qz-note">Prorated through midnight preceding ' + fmtDate(o.closingDate) +
      ' on the Texas statutory 365-day convention. Change a figure and the totals below follow it.</p>' +
    '<div class="qz-grid2">' +
      '<div class="qz-calc-card">' +
        '<h5 class="qz-calc-h">County &amp; Municipal Real Estate Taxes</h5>' +
        qzCalcIn(o, 'Assessed Property Valuation:', 'purchasePrice', { money: true }) +
        qzCalcIn(o, 'Effective Combined Tax Rate (% / year):', 'taxRatePct') +
        qzCalcOut('Total Annual Taxes:', fmtMoney(annualTax)) +
        qzCalcOut('Proration Period (Jan 1 &rarr; ' + fmtDate(o.closingDate) + '):', daysElapsed + ' of 365 days') +
        qzCalcOut('Seller Tax Debit / Buyer Credit:', fmtMoney(sellerTaxShare), { total: true, cls: 'ocean' }) +
      '</div>' +
      '<div class="qz-calc-card">' +
        '<h5 class="qz-calc-h">Homeowners Association Assessments</h5>' +
        (hoa
          ? qzCalcSelect(o, 'Assessment Cycle:', 'hoaCycle', ['Monthly', 'Quarterly', 'Annual']) +
            qzCalcIn(o, 'Assessment Amount:', 'hoaAssessment', { money: true }) +
            qzCalcSelect(o, 'Current Period Status:', 'hoaPaidStatus', ['Paid in advance by Seller', 'Owed by Seller', 'Paid by Buyer']) +
            qzCalcOut('Days owned by Buyer this period:', (cycleDays - dayInCycle) + ' days') +
            qzCalcOut('Buyer HOA Debit / Seller Reimbursement:', fmtMoney(Math.max(0, hoa - sellerHoa)), { total: true, cls: 'ocean' })
          : '<p class="qz-empty">This property is not in an association, so there is nothing to prorate. ' +
            'Enter an assessment below if that turns out to be wrong.</p>' +
            qzCalcIn(o, 'Assessment Amount:', 'hoaAssessment', { money: true, placeholder: 'None' })) +
      '</div>' +
    '</div></div>';
}

function qzPayoffsHTML(o) {
  const principal = Number(o.payoffPrincipal) || 0;
  const rate = Number(o.payoffRatePct) || 0;
  const perDiem = Math.round(principal * (rate / 100) / 365 * 100) / 100;
  const goodThrough = o.payoffGoodThrough || '';
  const stale = goodThrough && goodThrough < o.closingDate;
  const total = principal + (Number(o.prepaymentPenalty) || 0) +
                (Number(o.releaseFee) || 0) + (Number(o.payoffWireFee) || 0);
  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Loan Payoffs</h4></div>' +
    (stale
      ? '<div class="qz-alert-bad"><b>This payoff has expired.</b> The good-through date is before closing, ' +
        'so the figure below is short. Order an updated statement before wiring anything.</div>'
      : '') +
    '<div class="qz-calc-card">' +
      '<h5 class="qz-calc-h">First Lien Payoff &mdash; ' + esc(o.payoffLender || 'lender not yet identified') + '</h5>' +
      qzCalcIn(o, 'Payoff Lender:', 'payoffLender') +
      qzCalcIn(o, 'Unpaid Principal Balance:', 'payoffPrincipal', { money: true }) +
      qzCalcIn(o, 'Interest Rate (%):', 'payoffRatePct') +
      qzCalcOut('Per diem interest:', fmtMoney(perDiem) + ' / day') +
      qzCalcIn(o, 'Statement Good-Through Date:', 'payoffGoodThrough', { type: 'date' }) +
      qzCalcIn(o, 'Prepayment Penalty:', 'prepaymentPenalty', { money: true }) +
      qzCalcIn(o, 'County Lien Release Fee:', 'releaseFee', { money: true }) +
      qzCalcIn(o, 'Outgoing Payoff Wire Fee:', 'payoffWireFee', { money: true }) +
      qzCalcOut('Total Estimated Payoff Wire:', fmtMoney(total), { total: true, cls: 'ocean' }) +
    '</div></div>';
}

function qzProceedsHTML(o) {
  const price = o.purchasePrice || 0;
  const payoff = Number(o.payoffPrincipal) || 0;
  const commission = Math.round(price * (Number(o.commissionPct) || 6) / 100);
  const titleFees = qzChargeTotals(o.id, 'H').sellerAt + qzChargeTotals(o.id, 'C').sellerAt;
  const taxes = Math.round(price * (Number(o.taxRatePct) || 0) / 100 *
    (Math.min(365, (Number(String(o.closingDate).slice(5, 7)) - 1) * 30 + Number(String(o.closingDate).slice(8, 10))) / 365));
  const net = price - payoff - commission - titleFees - taxes;
  const seller = (o.parties || []).find(function (p) { return p.role === 'Seller'; });
  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Seller Net Proceeds</h4></div>' +
    '<div class="qz-calc-card">' +
      qzCalcOut('1. Gross Sale Price:', fmtMoney(price)) +
      qzCalcOut('2. Less Existing Mortgage Payoff:', '- ' + fmtMoney(payoff), { cls: 'bad' }) +
      qzCalcOut('3. Less Broker Commissions:', '- ' + fmtMoney(commission), { cls: 'bad' }) +
      qzCalcOut('4. Less Settlement &amp; Title Charges:', '- ' + fmtMoney(titleFees), { cls: 'bad' }) +
      qzCalcOut('5. Less Prorated Taxes:', '- ' + fmtMoney(taxes), { cls: 'bad' }) +
      qzCalcOut('Estimated Seller Net Proceeds:', fmtMoney(net), { total: true, cls: 'ocean' }) +
    '</div>' +
    '<div class="qz-calc-card" style="margin-top:12px">' +
      '<h5 class="qz-calc-h">Disbursement Verification</h5>' +
      '<p class="qz-note">Call the seller on a number you already had on file. Never on a number that ' +
        'arrived with the wire instructions.</p>' +
      qzCalcOut('Seller of record:', esc(seller ? seller.name : '&mdash;')) +
      qzCalcOut('Telephone on file:', esc(seller && seller.phone ? seller.phone : '&mdash;')) +
      qzCalcIn(o, 'Verification Officer:', 'proceedsVerifiedBy', { placeholder: 'Who called' }) +
      qzCalcSelect(o, 'Verification Status:', 'proceedsVerified', ['Not yet verified', 'Verified by callback', 'Verified in person', 'Unable to reach seller']) +
      qzCalcSelect(o, 'Delivery Method:', 'proceedsMethod', ['Wire', 'Check', 'Hold in escrow']) +
    '</div></div>';
}

function qzCplHTML(o) {
  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Closing Protection Letter</h4></div>' +
    '<div class="qz-calc-card">' +
      qzCalcIn(o, 'CPL Certificate Number:', 'cplNumber') +
      qzCalcSelect(o, 'Title Underwriter:', 'underwriter', ['Old Republic National Title Insurance Co.', 'First American Title Insurance Co.', 'Stewart Title Guaranty Co.']) +
      qzCalcIn(o, 'Policy Jacket Number:', 'policyJacket') +
      qzCalcOut('Insured Lender:', esc(qzOrderParty(o, 'Lender') || '&mdash; no lender on a cash file')) +
      qzCalcOut('Insured Borrower / Buyer:', esc(qzOrderParty(o, 'Buyer'))) +
      qzCalcOut('Insured Amount:', fmtMoney(o.loanAmount || o.purchasePrice)) +
      qzCalcIn(o, 'Date Issued:', 'cplIssued', { type: 'date' }) +
      qzCalcIn(o, 'Expiration Date:', 'cplExpires', { type: 'date' }) +
      qzCalcSelect(o, 'CPL Status:', 'cplStatus', ['Issued & Delivered', 'Requested', 'Expired', 'Not Required']) +
    '</div></div>';
}

function qzPolicyInfoHTML(o) {
  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Policy Information</h4></div>' +
    '<div class="qz-calc-card">' +
      qzCalcSelect(o, 'Underwriter:', 'underwriter', ['Old Republic National Title Insurance Co.', 'First American Title Insurance Co.', 'Stewart Title Guaranty Co.']) +
      qzCalcIn(o, 'Policy Jacket:', 'policyJacket') +
      qzCalcSelect(o, "Owner's Policy Form:", 'ownerPolicyForm', ['T-1 Owner Policy', 'T-1R Residential Owner Policy', 'None ordered']) +
      qzCalcIn(o, "Owner's Policy Amount:", 'purchasePrice', { money: true }) +
      qzCalcSelect(o, "Lender's Policy Form:", 'lenderPolicyForm', ['T-2 Loan Policy', 'T-2R Short Form', 'None &mdash; cash transaction']) +
      qzCalcIn(o, "Lender's Policy Amount:", 'loanAmount', { money: true, placeholder: 'None (cash)' }) +
      qzCalcSelect(o, 'Reissue Credit Applied:', 'reissueCredit', ['No', 'Yes — prior policy within 7 years']) +
    '</div></div>';
}

function qzCommitmentHTML(o) {
  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Title Commitment &mdash; ' + esc(o.titleNumber) + '</h4></div>' +
    '<div class="qz-calc-card">' +
      '<h5 class="qz-calc-h">Schedule A</h5>' +
      qzCalcIn(o, 'Commitment Number:', 'titleNumber') +
      qzCalcIn(o, 'Effective Date:', 'commitmentEffective', { type: 'date' }) +
      qzCalcSelect(o, 'Estate or Interest:', 'estateType', ['Fee Simple', 'Leasehold', 'Easement']) +
      qzCalcOut('Proposed Insured:', esc(qzOrderParty(o, 'Buyer'))) +
      qzCalcOut('Title Currently Vested In:', esc(qzOrderParty(o, 'Seller'))) +
      qzCalcIn(o, 'Policy Amount:', 'purchasePrice', { money: true }) +
      qzCalcIn(o, 'Legal Description:', 'legalDescription', { placeholder: 'Not yet supplied by the examiner' }) +
      qzCalcSelect(o, 'Commitment Status:', 'commitmentStatus', ['In preparation', 'Issued', 'Amended', 'Cleared to close']) +
    '</div></div>';
}

function qzFinalPolicyHTML(o) {
  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Final Policy</h4></div>' +
    '<div class="qz-calc-card">' +
      qzCalcIn(o, 'Policy Number:', 'finalPolicyNumber', { placeholder: 'Issued after recording' }) +
      qzCalcIn(o, 'Date of Policy:', 'finalPolicyDate', { type: 'date' }) +
      qzCalcIn(o, 'Amount of Insurance:', 'purchasePrice', { money: true }) +
      qzCalcSelect(o, 'Underwriter:', 'underwriter', ['Old Republic National Title Insurance Co.', 'First American Title Insurance Co.', 'Stewart Title Guaranty Co.']) +
      qzCalcSelect(o, 'Policy Status:', 'finalPolicyStatus', ['Not yet issued', 'Issued', 'Delivered to insured', 'Remitted to underwriter']) +
    '</div></div>';
}

function qzMailingHTML(o) {
  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Mailing &amp; Courier Tracking</h4></div>' +
    '<p class="qz-note">Physical closing packages, deeds going to the county, and lender post-closing shipments.</p>' +
    '<div class="qz-calc-card">' +
      qzCalcSelect(o, 'Carrier / Service:', 'shipCarrier', ['FedEx Priority Overnight', 'FedEx 2Day', 'UPS Next Day Air', 'USPS Certified Mail', 'Local courier', 'Not yet shipped']) +
      qzCalcIn(o, 'Tracking Number:', 'shipTracking', { placeholder: 'Nothing shipped yet' }) +
      qzCalcIn(o, 'Recipient:', 'shipRecipient', { placeholder: 'Who receives the package' }) +
      qzCalcIn(o, 'Ship Date:', 'shipDate', { type: 'date' }) +
      qzCalcSelect(o, 'Shipment Status:', 'shipStatus', ['Not yet shipped', 'In transit', 'Delivered', 'Delivered & signed', 'Exception — see carrier']) +
    '</div></div>';
}

function qzRecordingHTML(o) {
  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Recording</h4></div>' +
    '<div class="qz-calc-card">' +
      qzCalcOut('Recording Jurisdiction:', esc(o.county ? o.county + ' Clerk' : '&mdash;')) +
      qzCalcSelect(o, 'Submission Method:', 'recordingMethod', ['e-Recording', 'Courier to counter', 'Mail']) +
      qzCalcIn(o, 'Submitted On:', 'recordingSubmitted', { type: 'date' }) +
      qzCalcIn(o, 'Instrument Number:', 'recordingInstrument', { placeholder: 'Assigned by the county on acceptance' }) +
      qzCalcIn(o, 'Recording Fees:', 'recordingFee', { money: true }) +
      qzCalcSelect(o, 'Recording Status:', 'recordingStatus', ['Not yet submitted', 'Submitted', 'Accepted & recorded', 'Rejected — see county notice']) +
    '</div></div>';
}

function qzErecordingHTML(o) {
  return '<div class="qz-panel">' +
    '<div class="ph"><h4>e-Recording</h4></div>' +
    '<div class="qz-calc-card">' +
      qzCalcSelect(o, 'e-Recording Vendor:', 'erecordVendor', ['Simplifile', 'CSC eRecording', 'ePN', 'Not enrolled for this county']) +
      qzCalcOut('County:', esc(o.county || '&mdash;')) +
      qzCalcIn(o, 'Package ID:', 'erecordPackage', { placeholder: 'Assigned on submission' }) +
      qzCalcSelect(o, 'Package Status:', 'erecordStatus', ['Not submitted', 'Submitted', 'In review by county', 'Recorded', 'Rejected']) +
    '</div></div>';
}

function qzUnderwriterHTML(o) {
  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Underwriter</h4></div>' +
    '<div class="qz-calc-card">' +
      qzCalcSelect(o, 'Underwriter:', 'underwriter', ['Old Republic National Title Insurance Co.', 'First American Title Insurance Co.', 'Stewart Title Guaranty Co.']) +
      qzCalcIn(o, 'Agency Number:', 'underwriterAgencyNo', { placeholder: 'Agency identifier with this underwriter' }) +
      qzCalcSelect(o, 'Approval Required:', 'underwriterApprovalNeeded', ['No', 'Yes — over agency authority', 'Yes — curative question']) +
      qzCalcIn(o, 'Approval Reference:', 'underwriterApprovalRef', { placeholder: 'None required' }) +
    '</div></div>';
}

function qzEsignHTML(o) {
  return '<div class="qz-panel">' +
    '<div class="ph"><h4>e-Sign</h4></div>' +
    '<div class="qz-calc-card">' +
      qzCalcSelect(o, 'e-Sign Provider:', 'esignProvider', ['DocuSign', 'Adobe Sign', 'Notarize', 'Wet signature only']) +
      qzCalcIn(o, 'Envelope ID:', 'esignEnvelope', { placeholder: 'Assigned when the envelope is sent' }) +
      qzCalcIn(o, 'Sent On:', 'esignSent', { type: 'date' }) +
      qzCalcSelect(o, 'Signing Status:', 'esignStatus', ['Not sent', 'Sent — awaiting signature', 'Partially signed', 'Completed', 'Declined']) +
    '</div></div>';
}

/* The last five printed pages. Each one gets the control the job actually
   needs on it, rather than a form for its own sake:

     Closing      the checklist is checkable. It was rendered <input disabled>,
                  which is a picture of a checklist.
     Workflow     the status note is the sentence every other screen quotes, so
                  it is written here rather than being immutable prose.
     Marketplace  the provider list was three fixed company names; it is now the
                  vendors actually engaged on this file.
     Vendors      status is a dropdown, because chasing a vendor and recording
                  what they said is the whole task.
     Exceptions   a title exception is either cleared or it is not, and saying
                  which is curative work, not decoration.
*/

function qzClosingHTML(o) {
  const docs = qzDocsForOrder(o.id);
  const outstanding = docs.filter(function (d) { return qzDocStatus(d) !== 'Reviewed'; });
  const items = outstanding.length
    ? outstanding.map(function (d) {
        return '<label class="qz-check-item">' +
          '<input type="checkbox" onchange="qzReviewDoc(&#39;' + escAttr(String(d.id)) + '&#39;)">' +
          '<span>' + esc(d.name) + ' &mdash; ' + esc(qzDocStatus(d)) + '</span></label>';
      }).join('')
    : '<div class="qz-empty">Every document on this file has been reviewed.</div>';

  return '<div class="qz-grid2">' +
    '<div class="qz-panel">' +
      '<div class="ph"><h4>Closing Checklist</h4>' +
        '<span class="qz-chg-note">' + (docs.length - outstanding.length) + ' of ' + docs.length + ' reviewed</span>' +
        '<button class="qz-btn sm primary" type="button" data-closing-action="review" ' +
          'onclick="qzReviewClosing()">Mark Checklist Reviewed</button></div>' +
      '<div class="qz-checklist">' + items + '</div>' +
      '<p class="qz-note">Ticking an item marks that document reviewed on the Documents tab. ' +
        'It is the same record, not a second copy of it.</p>' +
    '</div>' +
    '<div class="qz-panel"><div class="ph"><h4>Key Dates</h4></div>' +
      qzKvInput(o, 'Closing Date', 'closingDate', { type: 'date', strong: true }) +
      (o.originalClosingDate
        ? '<div class="qz-kv"><b>Original Date</b>' + fmtDate(o.originalClosingDate) + '</div>'
        : '') +
      qzKvInput(o, 'Funding Date', 'fundingDate', { type: 'date' }) +
      qzKvInput(o, 'Disbursement Date', 'disbursementDate', { type: 'date' }) +
      qzKvSelect(o, 'Settlement Agency', 'settlementAgency', QZ_BRANCHES.map(function (b) { return b.agency; })) +
    '</div>' +
  '</div>';
}

function qzWorkflowHTML(o) {
  const delayed = o.flag === 'closing-delay';
  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Workflow</h4>' +
      '<button class="qz-btn sm primary" type="button" onclick="qzAdvanceStageModal(\'' + escAttr(o.id) + '\')">Advance Stage &rarr;</button>' +
    '</div>' +
    qzTimelineHTML(o) +
    '<div class="qz-tl-status"><b>Current stage: <span>' + esc(QZ_STAGES[o.stageIndex]) + '</span></b></div>' +
    '<div class="qz-field wide" style="margin-top:12px">' +
      '<label for="qzWfNote">Status note &mdash; this is the sentence every other screen quotes</label>' +
      '<textarea id="qzWfNote" rows="2" onchange="qzOrderFieldSet(\'' + escAttr(o.id) + '\', \'statusNote\', this.value)">' +
        esc(o.statusNote || '') + '</textarea>' +
    '</div>' +
    (delayed
      ? '<p class="qz-note" style="color:var(--qz-bad)">The original closing date was ' +
        fmtDate(o.originalClosingDate) + '. Workflow structure is configured by administrators; ' +
        'a date change is escalated, not edited away.</p>'
      : '<p class="qz-note">Milestones track the order through its stages. Advancing a stage is a ' +
        'deliberate act, so it goes through the confirmation above.</p>') +
  '</div>';
}

function qzMarketplaceHTML(o) {
  const engaged = qzList('vendors', function (v) { return v.orderId === o.id; });
  const names = engaged.map(function (v) { return v.name; });
  const unique = names.filter(function (n, i) { return names.indexOf(n) === i; });
  const open = engaged.filter(function (v) { return v.status !== 'Complete'; }).length;

  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Qualia Marketplace &mdash; Integrated Vendor Orders</h4>' +
      '<button class="qz-btn sm primary" onclick="qzAddVendorModal(\'' + escAttr(o.id) + '\')">+ Order Service</button></div>' +
    '<p class="qz-note">Order title searches, surveys, tax certificates, payoff statements and mobile ' +
      'notaries without leaving the file.</p>' +
    '<div class="qz-calc-card">' +
      qzCalcOut('Providers engaged on this order:',
        unique.length ? esc(unique.join(', ')) : '<span class="qz-muted">None ordered yet</span>') +
      qzCalcOut('Services tracked:', engaged.length + (open ? ' &middot; ' + open + ' still open' : ' &middot; all complete')) +
      qzCalcSelect(o, 'Marketplace routing:', 'marketplaceRouting',
        ['Automatic — use preferred vendors', 'Manual — choose per order', 'Disabled for this file']) +
      qzCalcIn(o, 'Standing instructions to vendors:', 'marketplaceNote',
        { placeholder: 'e.g. deliver survey directly to the lender' }) +
    '</div></div>';
}

/* status -> pill colour. A map rather than a ternary chain so adding a status to
   QZ_VENDOR_STATUS and forgetting the colour is a visible grey, not a wrong colour. */
const QZ_VENDOR_CLS = {
  'Ordered': 'scheduled',
  'Pending Confirmation': 'pending',
  'Scheduled': 'scheduled',
  'In Progress': 'progress',
  'Delayed': 'pending',
  'Complete': 'completed',
  'Cancelled': 'cancelled'
};

function qzVendorsHTML(o) {
  const list = qzList('vendors', function (v) { return v.orderId === o.id; });
  const statuses = QZ_VENDOR_STATUS;
  const rows = list.map(function (v) {
    const cls = QZ_VENDOR_CLS[v.status] || 'scheduled';
    return '<tr data-vendor-id="' + escAttr(String(v.id)) + '">' +
      '<td><b>' + esc(v.name) + '</b></td>' +
      '<td>' + esc(v.service) + '</td>' +
      '<td>' + (v.ordered ? fmtDate(v.ordered) : '&mdash;') + '</td>' +
      '<td><select class="qz-calc-in qz-vendor-st ' + cls + '"' +
        ' aria-label="Status for ' + escAttr(v.name) + '"' +
        ' onchange="qzSetVendorStatus(&#39;' + escAttr(String(v.id)) + '&#39;, this.value)">' +
        statuses.map(function (s) {
          return '<option value="' + s + '"' + (v.status === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('') + '</select></td>' +
      '<td><div class="qz-row-actions">' +
        '<button class="qz-btn sm" onclick="qzEditVendorModal(&#39;' + escAttr(String(v.id)) + '&#39;)">&#9998;</button>' +
        '<button class="qz-btn sm danger" onclick="qzDeleteVendorModal(&#39;' + escAttr(String(v.id)) + '&#39;)">&times;</button>' +
      '</div></td></tr>';
  }).join('');

  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Vendors &amp; Service Providers</h4>' +
      '<button class="qz-btn sm primary" onclick="qzAddVendorModal(\'' + escAttr(o.id) + '\')">+ Add Vendor</button></div>' +
    '<table class="qz-tbl">' +
      '<thead><tr><th>Vendor</th><th>Service</th><th>Ordered</th><th>Status</th><th>Actions</th></tr></thead>' +
      '<tbody>' + (rows ||
        '<tr><td colspan="5" class="qz-empty">No vendors are engaged on this order yet.</td></tr>') + '</tbody>' +
    '</table></div>';
}

/* Changing a vendor's status is the single most common thing a VA does on this
   screen, so it happens in place rather than through a modal. */
function qzSetVendorStatus(id, status) {
  qzUpdate('vendors', id, { status: status });
  const v = qzFind('vendors', id);
  qzMark('vendors-check');
  simToast((v ? v.name : 'Vendor') + ' set to ' + status + '.', { tone: 'good' });
  qzRenderRoot();
}

/* ============================================================================
   SCHEDULE B EXCEPTIONS
   ============================================================================
   The tab printed four fixed exceptions and named Collin County on every file,
   including the ones in Dallas and Denton. Schedule B is the list of what the
   policy will NOT cover, and clearing an item off it is curative work: the
   single most consequential thing a title assistant does. It cannot be a
   picture.

   Each exception is now a record on the order, and each one can be cleared,
   waived or endorsed with a reason. Standard exceptions that survive on every
   Texas policy are marked as such, because trying to clear one is a mistake
   worth catching early.
   ============================================================================ */

function qzGenTitleExceptions(o) {
  const county = o.county || 'the county';
  const year = String(o.closingDate || '2026').slice(0, 4);
  const rows = [
    { text: 'Standby fees, taxes and assessments for ' + year + ' and subsequent years.', standard: true },
    { text: 'Restrictive covenants and architectural guidelines recorded in the Map Records of ' + county + '.', standard: true },
    { text: 'Rights of parties in possession.', standard: true },
    { text: 'Any discrepancy, conflict or shortage in area or boundary lines, or any encroachment or protrusion.', standard: true }
  ];
  const utilFt = 5 + (qzHashString(o.id + '|ease') % 4) * 5;
  rows.push({ text: utilFt + '-foot utility easement along the rear boundary as shown on the recorded plat.', standard: false });
  if ((qzHashString(o.id + '|min') % 2) === 0) {
    rows.push({ text: 'All oil, gas and other minerals previously reserved or conveyed of record.', standard: false });
  }
  if ((qzHashString(o.id + '|lien') % 5) === 0) {
    rows.push({ text: 'Abstract of judgment against a party with a similar name; identity affidavit required.', standard: false });
  }
  if (o.type === 'Commercial') {
    rows.push({ text: 'Terms and conditions of any unrecorded lease affecting the premises.', standard: false });
  }
  return rows.map(function (r, i) {
    return {
      id: 'tex-' + o.id + '-' + (i + 1),
      orderId: o.id,
      num: i + 1,
      text: r.text,
      standard: r.standard,
      /* A standard exception is never cleared; it prints on the policy. */
      status: r.standard ? 'Standard — remains' : 'Open',
      note: ''
    };
  });
}

function qzBuildTitleExceptions(orders) {
  const out = [];
  (orders || []).forEach(function (o) {
    qzGenTitleExceptions(o).forEach(function (r) { out.push(r); });
  });
  return out;
}

function qzSetExceptionStatus(id, status) {
  const ex = qzFind('titleExceptions', id);
  if (!ex) return;
  if (ex.standard && status !== 'Standard — remains') {
    simToast('That is a standard Texas exception. It prints on every policy and cannot be cleared.');
    qzRenderRoot();
    return;
  }
  qzUpdate('titleExceptions', id, { status: status });
  qzRenderRoot();
}
function qzSetExceptionNote(id, note) {
  qzUpdate('titleExceptions', id, { note: String(note || '').trim() });
}
function qzAddException(orderId) {
  const rows = qzList('titleExceptions', function (x) { return x.orderId === orderId; });
  qzInsert('titleExceptions', {
    orderId: orderId,
    num: rows.length + 1,
    text: '',
    standard: false,
    status: 'Open',
    note: ''
  });
  simToast('Exception added. Type what the examiner found.', { tone: 'good' });
  qzRenderRoot();
}
function qzSetExceptionText(id, text) {
  qzUpdate('titleExceptions', id, { text: String(text || '').trim() });
}
function qzDeleteException(id) {
  const ex = qzFind('titleExceptions', id);
  if (ex && ex.standard) {
    simToast('A standard exception cannot be removed from Schedule B.');
    return;
  }
  qzRemove('titleExceptions', id);
  simToast('Exception removed.', { tone: 'good' });
  qzRenderRoot();
}

function qzExceptionsTabHTML(o) {
  const rows = qzList('titleExceptions', function (x) { return x.orderId === o.id; })
    .sort(function (a, b) { return (a.num || 0) - (b.num || 0); });
  const open = rows.filter(function (r) { return r.status === 'Open'; }).length;
  const STATUSES = ['Open', 'Cleared', 'Waived by underwriter', 'Endorsed over', 'Standard — remains'];

  const items = rows.map(function (r) {
    return '<div class="qz-sched-item' + (r.standard ? ' is-standard' : '') + '">' +
      '<span class="num">' + r.num + '.</span>' +
      '<div class="qz-ex-body">' +
        '<textarea class="qz-ex-text" rows="2"' +
          (r.standard ? ' readonly title="Standard Texas exception — its wording is fixed."' : '') +
          ' aria-label="Exception ' + r.num + '"' +
          ' onchange="qzSetExceptionText(\'' + escAttr(r.id) + '\', this.value)">' + esc(r.text) + '</textarea>' +
        '<div class="qz-ex-foot">' +
          '<select class="qz-calc-in" aria-label="Status of exception ' + r.num + '"' +
            ' onchange="qzSetExceptionStatus(\'' + escAttr(r.id) + '\', this.value)">' +
            STATUSES.map(function (st) {
              return '<option value="' + escAttr(st) + '"' + (r.status === st ? ' selected' : '') + '>' + esc(st) + '</option>';
            }).join('') +
          '</select>' +
          '<input class="qz-calc-in qz-ex-note" value="' + escAttr(r.note || '') + '"' +
            ' placeholder="How it was cleared, and by whom"' +
            ' aria-label="Curative note for exception ' + r.num + '"' +
            ' onchange="qzSetExceptionNote(\'' + escAttr(r.id) + '\', this.value)">' +
          (r.standard ? '' :
            '<button type="button" class="qz-chg-del" title="Remove this exception"' +
            ' onclick="qzDeleteException(\'' + escAttr(r.id) + '\')">&minus;</button>') +
        '</div>' +
      '</div></div>';
  }).join('');

  return '<div class="qz-panel">' +
    '<div class="ph"><h4>Title Exceptions (Schedule B &middot; Part II)</h4>' +
      '<button class="qz-btn sm primary" onclick="qzAddException(\'' + escAttr(o.id) + '\')">+ Add Exception</button></div>' +
    '<p class="qz-note">Matters excluded from policy coverage unless cleared or specifically endorsed. ' +
      open + ' of ' + rows.length + ' still open. The four standard Texas exceptions print on every ' +
      'policy and are not curable.</p>' +
    '<div class="qz-sched-box"><div class="qz-sched-body">' +
      (items || '<div class="qz-empty">No exceptions have been raised on this commitment.</div>') +
    '</div></div></div>';
}

function qzToggleTaskGroupHidden(gId) {
  if (!qzState.hiddenTaskGroups) qzState.hiddenTaskGroups = {};
  qzState.hiddenTaskGroups[gId] = !qzState.hiddenTaskGroups[gId];
  qzRenderRoot();
}

function qzModifyWorkflowModal(orderId) {
  simToast('Workflow rule modifier active for ' + orderId + '.', { tone: 'good' });
}

function qzTasksHTML(o) {
  const allTasks = qzTasksForOrder(o.id);
  const groups = qzList('taskGroups').sort((a, b) => (a.order || 0) - (b.order || 0));
  const hiddenMap = qzState.hiddenTaskGroups || {};

  const workflowTitle = o.workflow || (o.type === 'Refinance' ? 'Refinance' : o.type === 'Cash' ? 'Cash Purchase' : o.type === 'Commercial' ? 'Commercial Acquisition' : 'Purchase &middot; Standard Milestones');
  const teamLabel = o.settlementAgency || o.paralegal || '';

  const groupBlocks = groups.map(g => {
    const gKey = g.id || g.name;
    const isHidden = !!hiddenMap[gKey];
    const gTasks = allTasks.filter(function (t) {
      if (t.taskGroup) return t.taskGroup === g.id;
      if (t.group) return t.group === g.name;
      return g.id === 'tg-open';
    });
    const doneCount = gTasks.filter(t => qzTaskStatus(t) === 'Complete').length;
    const totalCount = gTasks.length;
    const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
    const isActive = totalCount > 0 && doneCount < totalCount;

    const taskRows = gTasks.map(t => {
      const isDone = qzTaskStatus(t) === 'Complete';
      const isOverdue = !isDone && t.dueDate && t.dueDate < QZ_TODAY;
      const isDueToday = !isDone && t.dueDate && t.dueDate === QZ_TODAY;
      const stripClass = isDone ? 'qz-task-strip-good' : isOverdue ? 'qz-task-strip-bad' : isDueToday ? 'qz-task-strip-warn' : 'qz-task-strip-open';
      const badgeClass = isDone ? 'complete' : t.status === 'In Progress' ? 'progress' : 'open';
      const due = isDone ? fmtDate(t.dueDate) : `${fmtDate(t.dueDate)} ${qzDueChipHTML(t.dueDate)}`;
      return `
        <tr data-task-id="${t.id}" class="${isDone ? 'qz-task-done' : ''} ${stripClass}">
          <td class="qz-task-tick"><input type="checkbox" ${isDone ? 'checked' : ''} onchange="qzToggleTaskStatus('${escAttr(String(t.id))}', this.checked)"></td>
          <td><b>${esc(t.title)}</b></td>
          <td>${esc(t.assignedTo)}</td>
          <td>${due}</td>
          <td class="qz-status-cell"><span class="qz-badge ${badgeClass}">${esc(t.status || 'Open')}</span></td>
          <td class="qz-task-act">${isDone
            ? `<button type="button" class="qz-task-ico" title="Task details" onclick="qzEditTaskModal('${escAttr(String(t.id))}')">&#9432;</button>`
            : `<button type="button" class="qz-task-ico off" title="Remove task" onclick="qzDeleteTaskModal('${escAttr(String(t.id))}')">&times;</button>`}</td>
        </tr>`;
    }).join('');

    return `
      <div class="qz-task-group-card ${isActive ? 'active-group' : ''} ${isHidden ? 'collapsed' : ''}">
        <div class="qz-tg-head">
          <div class="qz-tg-side">
            <b class="qz-tg-title">${esc(g.name)}</b>
            <span class="qz-tg-count">${totalCount ? `${doneCount}/${totalCount} (${pct}%)` : 'No tasks'}</span>
          </div>
          <div class="qz-tg-side">
            ${totalCount ? `<div class="qz-tg-bar"><i style="width:${pct}%"></i></div>` : ''}
            <button type="button" class="qz-tg-btn ${isActive ? 'on' : ''}" title="${isHidden ? 'Show task group' : 'Hide task group'}" onclick="qzToggleTaskGroupHidden('${escAttr(gKey)}')">${isHidden ? QZ_ICONS.eyeOff : (isActive ? '&#9733;' : '&#9734;')}</button>
          </div>
        </div>
        ${!isHidden ? (gTasks.length ? `
        <table class="qz-tbl qz-task-tbl">
          <tbody>${taskRows}</tbody>
        </table>` : '<div class="qz-tg-empty">No tasks in this milestone group.</div>') : ''}
      </div>`;
  }).join('');

  return `
    <div class="qz-panel">
      <div class="ph">
        <div>
          <h4>${workflowTitle}</h4>
          <span class="sub">Workflow automated rules active &middot; Assigned to ${esc(teamLabel)}</span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="qz-btn sm ghost" onclick="qzModifyWorkflowModal('${o.id}')">Modify</button>
          <button class="qz-btn sm charcoal" onclick="qzAddTaskModal('${o.id}')">Add Task</button>
          <button class="qz-btn sm primary" onclick="qzAddTaskGroupModal('${o.id}')">Add Task Group</button>
        </div>
      </div>
      <div class="qz-task-groups">${groupBlocks}</div>
    </div>`;
}

/* ---------- Workflow ---------- */


/* ---------- Communication ---------- */
function qzOpenThread(id) { qzState.threadId = Number(id) || id; qzMark('comm-open'); qzRenderRoot(); }
function qzThreadMessages(threadId) {
  const t = qzFind('threads', threadId);
  if (!t) return [];
  const inline = t.thread || [];
  /* qzBuildMessages mirrors every seeded thread's inline messages into qzDB.messages, so a
     plain concat rendered each seeded message twice and pushed the trainee's own reply below
     the fold. The inline array can't just be dropped either: threads created at runtime by
     qzSaveNewThread are never mirrored. So key the mirrors out and keep everything once.
     String() on both sides because thread ids arrive from HTML onclick as strings. */
  const key = m => `${m.sender}|${m.date}|${m.body}`;
  const seen = new Set(inline.map(key));
  const stored = qzList('messages', m => String(m.threadId) === String(threadId) && !seen.has(key(m)));
  return inline.concat(stored);
}
function qzSendReply(threadId) {
  threadId = Number(threadId) || threadId;
  const box = document.getElementById('qzReplyBox');
  const text = box ? box.value.trim() : '';
  if (!text) { simToast('Write a reply before sending.'); return; }
  if (text.length < 20) { simToast('Your reply should be at least 20 characters. Write a professional response.'); return; }
  const msgs = qzThreadMessages(threadId);
  const last = msgs[msgs.length - 1] || {};
  const recipient = last.sender === 'You (VA)' ? last.recipient : (last.sender || 'Participant');
  qzInsert('messages', { threadId: threadId, sender: 'You (VA)', recipient: recipient, date: QZ_TODAY, body: text });
  qzMark('comm-reply');
  qzRenderRoot();
}
function qzLogFollowup() { qzMark('comm-followup'); simToast('Follow-up logged on this file (training only).'); }

function qzCommunicationHTML(o) {
  const threads = qzList('threads', m => m.orderId === o.id);
  if (!qzState.threadId || !threads.some(t => t.id === qzState.threadId)) qzState.threadId = threads[0] ? threads[0].id : null;
  const list = threads.map(t => {
    const count = qzThreadMessages(t.id).length;
    return `
      <div class="qz-thread-item ${t.id === qzState.threadId ? 'active' : ''}" onclick="qzOpenThread('${escAttr(String(t.id))}')">
        <b>${esc(t.subject)}</b>
        <span>${count} message${count !== 1 ? 's' : ''}</span>
      </div>`;
  }).join('');

  const composes = (typeof QZ_COMPOSES !== 'undefined' ? QZ_COMPOSES : []).filter(c => c.orderId === o.id);
  const walkStep = (SimEngine.walkActive()) ? SimEngine.currentStep() : null;
  const activeCompose = composes.length ? qzActiveComposeFor(o, composes, walkStep) : null;
  if (activeCompose) {
    const back = (!walkStep && qzState.composeId === activeCompose.id)
      ? '<button class="qz-btn sm" style="margin-bottom:12px" onclick="qzCloseCompose()">&larr; Back to messages</button>'
      : '';
    return `<div class="qz-panel">${back}${qzComposeItemHTML(activeCompose.id)}</div>`;
  }

  const exerciseList = composes.map(c => {
    const st = qzComposeGet(c.id);
    const state = st.resolvedAt ? (st.correct ? 'Completed' : 'Needs revision') : 'Not started';
    return `<div class="qz-thread-exercise" onclick="qzOpenCompose('${escAttr(c.id)}')"><b>Exercise &middot; ${esc(c.label)}</b><span>${esc(state)}</span></div>`;
  }).join('');

  const active = threads.find(t => t.id === qzState.threadId);
  let detail = '<div class="qz-panel">Select a thread.</div>';
  if (active) {
    const msgs = qzThreadMessages(active.id).map((m, i) => `<div class="qz-msg ${m.sender === 'You (VA)' ? 'mine' : ''}" data-msg-index="${i + 1}"><div class="meta">${esc(m.sender)} &rarr; ${esc(m.recipient)} &middot; ${fmtDate(m.date)}</div>${esc(m.body)}</div>`).join('');
    detail = `<div class="qz-panel"><div class="ph"><h4>${esc(active.subject)}</h4><button class="qz-btn sm danger" onclick="qzDeleteThreadModal('${escAttr(String(active.id))}')">Delete Thread</button></div>
      ${msgs}
      <div class="qz-reply"><textarea id="qzReplyBox" placeholder="Write a reply..." oninput="qzSyncReplyStep()"></textarea>
      <div class="row"><button class="qz-btn" data-comm-action="followup" onclick="qzLogFollowup()">Log Follow-up</button><button class="qz-btn primary" data-comm-action="reply" onclick="qzSendReply('${escAttr(String(active.id))}')">Send Reply</button></div></div>
    </div>`;
  }
  const newBtn = `<div style="padding:0 0 10px 0"><button class="qz-btn sm primary" style="width:100%" onclick="qzNewThreadModal('${o.id}')">+ New Message</button></div>`;
  return `<div class="qz-comm-grid"><div class="qz-thread-list">${newBtn}${exerciseList}${list}</div>${detail}</div>`;
}

function qzActiveComposeFor(o, composes, walkStep) {
  if (walkStep && walkStep.type === 'compose') {
    return composes.find(c => c.id === walkStep.composeId) || null;
  }
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

/* ---------- Vendors (Universal CRUD) ---------- */


/* ---------- Closing ---------- */
function qzReviewClosing() { qzMark('closing-review'); simToast('Closing checklist reviewed (training only).', { tone: 'good' }); }


/* ---------- Accounting (D.6 Parity — Editable Ledger in Sandbox) ---------- */
let qzExpandedLedgerRow = null;

function qzToggleLedgerRow(rowId) {
  qzExpandedLedgerRow = (qzExpandedLedgerRow === rowId ? null : rowId);
  qzRenderRoot();
}

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
  // In Lesson mode on the 3 curriculum orders, present the read-only Settlement Statement grid
  const isCurriculumOrderInLesson = qzState.lessonId && ['ORD-2026-1483', 'ORD-2026-1512', 'ORD-2026-1398'].includes(o.id);
  if (isCurriculumOrderInLesson) {
    const lines = qzAcctLines(o);
    const MIN_ROWS = 8;
    const totals = { borrowerAt: 0, borrowerBefore: 0, sellerAt: 0, sellerBefore: 0, byOthers: 0 };
    lines.forEach(l => { if (totals[l.col] != null) totals[l.col] += l.amount; });

    /* Exactly one cell of this otherwise read-only grid opens up, and only while a
       Document Review correction has been handed off to it: qzRevGoFix set
       pendingRevFix, and that review names this line in fixAt.acctDesc. Everything
       else stays read-only, which is what the note above the grid says. The point is
       that the figure gets corrected on the settlement statement that carries it,
       rather than typed into a box belonging to the exercise. */
    const fixRev = qzState.pendingRevFix ? qzReviewLookup(qzState.pendingRevFix) : null;
    const fixDesc = (fixRev && fixRev.orderId === o.id && fixRev.fixAt) ? fixRev.fixAt.acctDesc : null;
    const fixSt = fixDesc ? qzRevGet(fixRev.id) : null;
    /* Empty on a first attempt, on purpose (same rule as the inline Step 4): prefilled
       with the figure under suspicion, "correcting" it would be a click. After a wrong
       save it keeps what was typed, so the trainee edits rather than retypes. */
    const fixPrefill = (fixSt && fixSt.correctedValueSaved && !fixSt.step4ValueCorrect) ? fixSt.correctedValueSaved : '';

    const rowHTML = (l, i) => {
      const editing = !!(l && fixDesc && l.desc === fixDesc);
      const cells = QZ_ACCT_COLS.map(c => {
        const own = !!(l && l.col === c);
        if (own && editing) {
          return `<td class="num has"><span class="qz-acct-fix">
            <input id="qzAcctFixInput" value="${escAttr(fixPrefill)}" placeholder="0.00" aria-label="Corrected ${escAttr(l.desc)}" oninput="qzAcctMarkDirty()">
          </span></td>`;
        }
        return `<td class="num ${own ? 'has' : ''}">${own ? fmtMoney(l.amount) : ''}</td>`;
      }).join('');
      return `<tr class="${l ? '' : 'empty'}"${l ? ` data-acct-desc="${escAttr(l.desc)}"` : ''}>
        <td class="ln">${String(i + 1).padStart(2, '0')}</td>
        <td class="desc">${l ? esc(l.desc) : ''}</td>
        <td class="payee">${l ? 'to ' + esc(l.payee) : ''}</td>
        ${cells}
      </tr>`;
    };
    const body = [];
    for (let i = 0; i < Math.max(MIN_ROWS, lines.length); i++) body.push(rowHTML(lines[i] || null, i));
    const totalCells = QZ_ACCT_COLS.map(c => `<td class="num">${fmtMoney(totals[c])}</td>`).join('');

    const acctSaveBtn = fixDesc
      ? `<div class="qz-de-actions"><button class="qz-btn primary" id="qzAcctSaveBtn" style="display:none" onclick="qzAcctSaveFix()">Save Changes</button></div>`
      : '';

    return `<div class="qz-panel">
      <div class="qz-readonly-note">${fixDesc
        ? `Correcting <b>${esc(fixDesc)}</b>. Enter what the source document actually billed, then save. The rest of the grid stays read-only.`
        : 'This grid is read-only for a VA in Lesson mode. Review figures and verify calculations.'}</div>
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
      ${acctSaveBtn}
    </div>`;
  }

  // In Sandbox mode: Full Editable Qualia Core Order Ledger
  /* The escrow position is derived from the receipts and disbursements that
     actually exist on this file. It used to fall back to a literal $5,000, so
     every order in the system reported the same balance whether or not a cent
     had ever been received. */
  const esc$ = qzOrderEscrow(o.id);
  const orderReceipts = esc$.receipts;
  const orderDisbursements = esc$.disbursements;
  const escrowBalance = esc$.balance;

  const led = qzList('ledgerLines')
    .filter(function (l) { return l.orderId === o.id; })
    .sort(function (x, y) { return (x.lineNo || 0) - (y.lineNo || 0); });

  const tableRows = led.map(function (l) {
    const isVoid = String(l.status) === 'Void';
    return '<tr' + (isVoid ? ' class="qz-void"' : '') + '>' +
      '<td>' + fmtDate(l.date) + '</td>' +
      '<td>' + esc(l.ref || '') + '</td>' +
      '<td>' + esc(l.party || '') + '</td>' +
      '<td>' + esc(l.type || '') + '</td>' +
      '<td class="num">' + (l.debit ? fmtMoney(l.debit) : '') + '</td>' +
      '<td class="num">' + (l.credit ? fmtMoney(l.credit) : '') + '</td>' +
      '<td class="num">' + fmtMoney(l.balance || 0) + '</td>' +
      '<td><span class="qz-badge ' + (isVoid ? 'bad' : 'complete') + '">' + esc(l.status || '') + '</span></td>' +
      '<td>' + (l.sourceColl && !isVoid
        ? '<button type="button" class="qz-btn sm" onclick="qzVoidMoneyModal(\'' + l.sourceColl + '\', \'' + escAttr(l.sourceId) + '\')">Void</button>'
        : '') + '</td>' +
    '</tr>';
  }).join('');

  /* A file is ready to disburse when the money is in and it covers the fees
     due. Saying so unconditionally, as this tile used to, taught a trainee to
     ignore the one check that matters. */
  const owed = qzChargeTotals(o.id, 'B').borrowerAt + qzChargeTotals(o.id, 'C').borrowerAt;
  const ready = escrowBalance >= owed && orderReceipts.length > 0;

  return '' +
    '<div class="qz-panel">' +
      '<div class="ph"><h4>Escrow Ledger &mdash; ' + esc(o.id) + '</h4>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="qz-btn sm" onclick="qzExportLedgerCSV(\'' + escAttr(o.id) + '\')">Export CSV</button>' +
          '<button class="qz-btn sm primary" onclick="qzAddLedgerLineModal(\'' + escAttr(o.id) + '\')">+ Add Transaction</button>' +
        '</div>' +
      '</div>' +
      '<div class="qzs-kpi-row" style="margin-bottom:16px">' +
        '<div class="qzs-kpi"><span class="qzs-kpi-label">Total Deposits (Receipts)</span>' +
          '<b class="qzs-kpi-value">' + fmtMoney(esc$.totalIn) + '</b>' +
          '<span class="qzs-kpi-delta up">' + orderReceipts.length + ' receipt' + (orderReceipts.length === 1 ? '' : 's') + '</span></div>' +
        '<div class="qzs-kpi"><span class="qzs-kpi-label">Total Disbursements</span>' +
          '<b class="qzs-kpi-value">' + fmtMoney(esc$.totalOut) + '</b>' +
          '<span class="qzs-kpi-delta">' + orderDisbursements.length + ' checks / wires</span></div>' +
        '<div class="qzs-kpi"><span class="qzs-kpi-label">Escrow Trust File Balance</span>' +
          '<b class="qzs-kpi-value" style="color:var(--qz-ocean)">' + fmtMoney(escrowBalance) + '</b>' +
          '<span class="qz-badge ' + (escrowBalance >= 0 ? 'complete' : 'bad') + '">' +
            (escrowBalance >= 0 ? 'Balanced' : 'Overdrawn') + '</span></div>' +
        '<div class="qzs-kpi"><span class="qzs-kpi-label">Ready to Disburse</span>' +
          '<b class="qzs-kpi-value">' + (ready ? 'Authorized' : 'Pending Funding') + '</b>' +
          '<span class="qzs-kpi-delta' + (ready ? '' : ' up') + '">' +
            (ready ? 'Funds received cover the fees due' : 'Short ' + fmtMoney(Math.max(0, owed - escrowBalance))) + '</span></div>' +
      '</div>' +
      '<div class="qz-tbl-scroll"><table class="qz-tbl">' +
        '<thead><tr><th>Date</th><th>Ref #</th><th>Party</th><th>Transaction Type</th>' +
          '<th class="num">Debit ($)</th><th class="num">Credit ($)</th><th class="num">Balance</th>' +
          '<th>Status</th><th>Actions</th></tr></thead>' +
        '<tbody>' + (tableRows ||
          '<tr><td colspan="9" class="qz-empty">No money has moved on this order yet.</td></tr>') + '</tbody>' +
      '</table></div>' +
    '</div>' +
    '<div class="qz-chg-layout" style="margin-top:14px">' +
      qzChargeGridHTML(o, 'B', 'Section B &middot; Services Borrower Did Not Shop For') +
      qzPaymentsPanelHTML(o, 'B') +
    '</div>';
}

/* ---------- 17 Rail Pages (Phase D) ---------- */













/* ============================================================================
   THE CHARGES GRID — editable cells, and the Payments panel beside it
   ============================================================================
   Modelled on Images-resourses/real-screenshots/core-charges-section-b.png:
   a numbered grid whose Description, Payee and five money columns are all
   typed into, a Sort Lines / + / - control set in the header, and a Payments
   panel to the right carrying the six disbursement methods.
   ============================================================================ */

const QZ_CHARGE_COL_LABEL = {
  borrowerAt: 'Borrower at closing', borrowerBefore: 'Borrower before closing',
  sellerAt: 'Seller at closing', sellerBefore: 'Seller before closing',
  byOthers: 'By others'
};

function qzChargeLines(orderId, section) {
  return qzList('chargeLines')
    .filter(function (l) { return l.orderId === orderId && l.section === section; })
    .sort(function (a, b) { return (a.lineNo || 0) - (b.lineNo || 0); });
}

/* ---------- writes ---------- */

function qzChargeSet(id, field, value) {
  const isMoney = QZ_ACCT_COLS.indexOf(field) > -1;
  const v = isMoney ? (qzParseNumeric(value) || 0) : String(value == null ? '' : value).trim();
  qzUpdate('chargeLines', id, (function () { const p = {}; p[field] = v; return p; })());
  qzRenderRoot();
}

function qzChargeAdd(orderId, section) {
  const rows = qzChargeLines(orderId, section);
  qzInsert('chargeLines', {
    orderId: orderId, section: section,
    lineNo: rows.length ? Math.max.apply(null, rows.map(function (r) { return r.lineNo || 0; })) + 1 : 1,
    description: '', payee: '',
    borrowerAt: 0, borrowerBefore: 0, sellerAt: 0, sellerBefore: 0, byOthers: 0
  });
  simToast('Line added. Fill in the description and the payee.', { tone: 'good' });
  qzRenderRoot();
}

function qzChargeDelete(id) {
  const l = qzFind('chargeLines', id);
  if (!l) return;
  /* A charge that has already been disbursed cannot simply vanish from the
     statement: the money left the account and the statement has to keep saying
     where it went. */
  const paid = qzList('disbursements').some(function (d) { return d.chargeLineId === id; });
  if (paid) {
    simToast('This line has already been disbursed. Void the disbursement first.');
    return;
  }
  qzRemove('chargeLines', id);
  simToast('Line removed.', { tone: 'good' });
  qzRenderRoot();
}

/* Sorts by description and renumbers, which is what the Sort Lines button does
   in the product: the numbering is positional, not an identifier. */
function qzChargeSort(orderId, section) {
  const rows = qzChargeLines(orderId, section)
    .slice()
    .sort(function (a, b) { return String(a.description).localeCompare(String(b.description)); });
  rows.forEach(function (r, i) { qzUpdate('chargeLines', r.id, { lineNo: i + 1 }); });
  simToast('Lines sorted by description and renumbered.', { tone: 'good' });
  qzRenderRoot();
}

/* ---------- totals ---------- */

function qzChargeTotals(orderId, section) {
  const t = { borrowerAt: 0, borrowerBefore: 0, sellerAt: 0, sellerBefore: 0, byOthers: 0 };
  qzChargeLines(orderId, section).forEach(function (l) {
    QZ_ACCT_COLS.forEach(function (c) { t[c] += Number(l[c]) || 0; });
  });
  return t;
}
/* Section J totals the sections it says it totals, rather than carrying two
   hard-coded numbers that agreed with nothing on the other nine pages. */
function qzChargeSectionJ(orderId) {
  const sum = function (secs, col) {
    return secs.reduce(function (s, sec) { return s + qzChargeTotals(orderId, sec)[col]; }, 0);
  };
  return [
    { label: 'Total Loan Costs (Borrower-Paid, Sections A + B + C)',
      borrowerAt: sum(['A', 'B', 'C'], 'borrowerAt'), borrowerBefore: sum(['A', 'B', 'C'], 'borrowerBefore') },
    { label: 'Total Other Costs (Borrower-Paid, Sections E + F + G + H)',
      borrowerAt: sum(['E', 'F', 'G', 'H'], 'borrowerAt'), borrowerBefore: sum(['E', 'F', 'G', 'H'], 'borrowerBefore') }
  ];
}

/* ---------- the grid ---------- */

function qzChargeGridHTML(o, section, title) {
  const isJ = section === 'J';
  const lines = qzChargeLines(o.id, section);
  const MIN_ROWS = 6;
  const body = [];

  if (isJ) {
    /* Derived, so it is displayed rather than typed. */
    qzChargeSectionJ(o.id).forEach(function (r, i) {
      body.push('<tr><td class="ln">' + String(i + 1).padStart(2, '0') + '</td>' +
        '<td class="desc">' + r.label + '</td><td class="payee">Various providers</td>' +
        '<td class="num has">' + fmtMoney(r.borrowerAt) + '</td>' +
        '<td class="num has">' + fmtMoney(r.borrowerBefore) + '</td>' +
        '<td class="num"></td><td class="num"></td><td class="num"></td><td class="act"></td></tr>');
    });
  } else {
    for (let i = 0; i < Math.max(MIN_ROWS, lines.length); i++) {
      const l = lines[i] || null;
      if (!l) {
        body.push('<tr class="empty"><td class="ln">' + String(i + 1).padStart(2, '0') + '</td>' +
          '<td class="desc"></td><td class="payee"></td>' +
          QZ_ACCT_COLS.map(function () { return '<td class="num"></td>'; }).join('') +
          '<td class="act"></td></tr>');
        continue;
      }
      const cells = QZ_ACCT_COLS.map(function (c) {
        const v = Number(l[c]) || 0;
        return '<td class="num' + (v ? ' has' : '') + '">' +
          '<input class="qz-chg-in num" value="' + escAttr(v ? fmtMoney(v) : '') + '"' +
          ' aria-label="' + escAttr(QZ_CHARGE_COL_LABEL[c]) + '"' +
          ' onchange="qzChargeSet(\'' + escAttr(l.id) + '\', \'' + c + '\', this.value)"></td>';
      }).join('');
      body.push('<tr>' +
        '<td class="ln">' + String(l.lineNo || i + 1).padStart(2, '0') + '</td>' +
        '<td class="desc"><input class="qz-chg-in" value="' + escAttr(l.description) + '"' +
          ' placeholder="Description" aria-label="Description"' +
          ' onchange="qzChargeSet(\'' + escAttr(l.id) + '\', \'description\', this.value)"></td>' +
        '<td class="payee"><input class="qz-chg-in" value="' + escAttr(l.payee) + '"' +
          ' placeholder="Payee" aria-label="Payee"' +
          ' onchange="qzChargeSet(\'' + escAttr(l.id) + '\', \'payee\', this.value)"></td>' +
        cells +
        '<td class="act"><button type="button" class="qz-chg-del" title="Remove this line"' +
          ' onclick="qzChargeDelete(\'' + escAttr(l.id) + '\')">&minus;</button></td>' +
      '</tr>');
    }
  }

  const t = isJ ? (function () {
    const j = qzChargeSectionJ(o.id);
    return { borrowerAt: j[0].borrowerAt + j[1].borrowerAt,
             borrowerBefore: j[0].borrowerBefore + j[1].borrowerBefore,
             sellerAt: 0, sellerBefore: 0, byOthers: 0 };
  })() : qzChargeTotals(o.id, section);
  const totalCells = QZ_ACCT_COLS.map(function (c) { return '<td class="num">' + fmtMoney(t[c]) + '</td>'; }).join('');

  const tools = isJ
    ? '<span class="qz-chg-note">Totalled from the other sections &mdash; not typed.</span>'
    : '<button type="button" class="qz-btn sm" onclick="qzChargeSort(\'' + escAttr(o.id) + '\', \'' + section + '\')">Sort Lines</button>' +
      '<button type="button" class="qz-btn sm" title="Add a line" onclick="qzChargeAdd(\'' + escAttr(o.id) + '\', \'' + section + '\')">+</button>';

  return '<div class="qz-panel">' +
      '<div class="ph"><h4>' + title + '</h4><div class="qz-chg-tools">' + tools + '</div></div>' +
      '<div class="qz-tbl-scroll"><table class="qz-acct-grid">' +
        '<thead>' +
          '<tr class="grp"><th colspan="3"></th>' +
            '<th colspan="2">Paid by Borrower</th><th colspan="2">Paid by Seller</th>' +
            '<th rowspan="2" class="by-others">By Others</th><th rowspan="2" class="act"></th></tr>' +
          '<tr><th class="ln"></th><th class="desc">Description</th><th class="payee">Payee</th>' +
            '<th class="num">At Closing</th><th class="num">Before Closing</th>' +
            '<th class="num">At Closing</th><th class="num">Before Closing</th></tr>' +
        '</thead>' +
        '<tbody>' + body.join('') + '</tbody>' +
        '<tfoot><tr><td colspan="3" class="tl">TOTALS</td>' + totalCells + '<td class="act"></td></tr></tfoot>' +
      '</table></div>' +
    '</div>';
}

/* ---------- the Payments panel ---------- */

const QZ_PAY_METHODS = ['Check', 'Wire', 'Net Funded', 'Aggregate', 'Transfer', 'Holdback'];
let qzPayMethod = 'Check';
let qzPaySeparate = false;

function qzSetPayMethod(m) { qzPayMethod = m; qzRenderRoot(); }
function qzTogglePaySeparate(on) { qzPaySeparate = !!on; }

function qzPaymentsPanelHTML(o, section) {
  const t = qzChargeTotals(o.id, section);
  const due = t.borrowerAt + t.sellerAt;
  const tabs = QZ_PAY_METHODS.map(function (m) {
    return '<button type="button" class="qz-pay-tab' + (qzPayMethod === m ? ' active' : '') + '"' +
      ' onclick="qzSetPayMethod(\'' + m + '\')">' + m + '</button>';
  }).join('');

  /* Wires and checks need somewhere to go; the other four settle inside the
     file and have no mailing address to collect. */
  const needsAddress = qzPayMethod === 'Check' || qzPayMethod === 'Wire';

  return '<div class="qz-panel qz-pay">' +
      '<div class="ph"><h4>Payments</h4>' +
        '<button type="button" class="qz-btn sm" onclick="qzChargeAdd(\'' + escAttr(o.id) + '\', \'' + section + '\')">Add Contact</button>' +
      '</div>' +
      '<div class="qz-pay-tabs">' + tabs + '</div>' +
      '<div class="qz-form-grid">' +
        '<div class="qz-field"><label for="qzPayName">Name</label>' +
          '<input id="qzPayName" placeholder="Payee on the ' + esc(qzPayMethod.toLowerCase()) + '"></div>' +
        '<div class="qz-field"><label for="qzPayAmount">Payment Amount</label>' +
          '<input id="qzPayAmount" value="' + escAttr(due ? fmtMoney(due) : '') + '"></div>' +
        '<div class="qz-field"><label for="qzPayLabel">Label</label>' +
          '<input id="qzPayLabel" placeholder="How this shows on the statement"></div>' +
        '<div class="qz-field"><label for="qzPayRef">Reference #</label>' +
          '<input id="qzPayRef" placeholder="' + (qzPayMethod === 'Wire' ? 'IMAD / confirmation' : 'Check number') + '"></div>' +
      '</div>' +
      '<label class="qz-pay-sep">' +
        '<input type="checkbox" ' + (qzPaySeparate ? 'checked' : '') + ' onchange="qzTogglePaySeparate(this.checked)">' +
        ' Disburse Separately' +
      '</label>' +
      (needsAddress
        ? '<div class="qz-pay-addr">' +
            '<div class="qz-field wide"><label for="qzPayAddr">Mailing Address</label>' +
              '<input id="qzPayAddr" placeholder="Street, city, state, zip"></div>' +
          '</div>'
        : '<div class="qz-pay-addr muted">A ' + esc(qzPayMethod.toLowerCase()) +
          ' settles inside the file, so there is nothing to mail.</div>') +
      '<div class="qz-pay-foot">' +
        '<button type="button" class="qz-btn sm" onclick="qzItemizePayment(\'' + escAttr(o.id) + '\', \'' + section + '\')">Itemize</button>' +
        '<span class="sp"></span>' +
        '<button type="button" class="qz-btn sm" onclick="qzClearPaymentForm()">Clear</button>' +
        '<button type="button" class="qz-btn sm primary" onclick="qzRecordPayment(\'' + escAttr(o.id) + '\', \'' + section + '\')">Record</button>' +
      '</div>' +
    '</div>';
}

function qzClearPaymentForm() {
  ['qzPayName', 'qzPayAmount', 'qzPayLabel', 'qzPayRef', 'qzPayAddr'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function qzItemizePayment(orderId, section) {
  const lines = qzChargeLines(orderId, section);
  const rows = lines.length
    ? lines.map(function (l) {
        const amt = QZ_ACCT_COLS.reduce(function (s, c) { return s + (Number(l[c]) || 0); }, 0);
        return '<tr><td>' + String(l.lineNo).padStart(2, '0') + '</td><td>' + (l.description || '&mdash;') +
               '</td><td>' + esc(l.payee || '&mdash;') + '</td><td class="num">' + fmtMoney(amt) + '</td></tr>';
      }).join('')
    : '<tr><td colspan="4" class="qz-empty">This section has no lines yet.</td></tr>';

  const old = document.getElementById('qzItemizeModal');
  if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = 'qzItemizeModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML =
    '<div class="qz-modal-card" style="max-width:640px">' +
      '<div class="ph"><h4>Itemisation &mdash; Section ' + esc(section) + '</h4>' +
      '<button class="qz-btn sm" onclick="document.getElementById(\'qzItemizeModal\').remove()">&times;</button></div>' +
      '<div class="qz-tbl-scroll"><table class="qz-tbl">' +
        '<thead><tr><th>#</th><th>Description</th><th>Payee</th><th class="num">Amount</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>' +
    '</div>';
  document.body.appendChild(wrap);
}

/* Records the payment as a real disbursement against the order, so the money
   shows up in the ledger rather than in a toast that claims something happened. */
function qzRecordPayment(orderId, section) {
  const name = (document.getElementById('qzPayName') || {}).value || '';
  const amt = qzParseNumeric((document.getElementById('qzPayAmount') || {}).value || '');
  const label = (document.getElementById('qzPayLabel') || {}).value || '';
  const ref = (document.getElementById('qzPayRef') || {}).value || '';

  if (!name.trim()) { simToast('A payment needs a payee. Type the name it is going to.'); return; }
  if (amt === null || amt <= 0) { simToast('Enter a payment amount greater than zero.'); return; }

  const rec = qzInsert('disbursements', {
    orderId: orderId,
    payee: name.trim(),
    amount: amt,
    method: qzPayMethod,
    reference: ref.trim(),
    memo: label.trim() || ('Section ' + section),
    date: QZ_TODAY,
    status: qzPaySeparate ? 'Pending Approval' : 'Scheduled',
    separate: qzPaySeparate
  });
  qzPostLedgerForDisbursement(rec);
  qzClearPaymentForm();
  simToast('Disbursement ' + rec.id + ' recorded for ' + fmtMoney(amt) + '.', { tone: 'good' });
  qzRenderRoot();
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
    'cd-km': 'Sections K &amp; M &middot; Calculating Cash to Close',
    'cd-ln': 'Sections L &amp; N &middot; Summaries of Transactions (Seller)'
  };
  const section = QZ_TAB_TO_SECTION[secKey] || 'A';
  /* Grid on the left, Payments on the right, the way the real screen is laid
     out. Section J is a derived total, so it has nothing to disburse. */
  const grid = qzChargeGridHTML(o, section, titles[secKey] || 'Closing Disclosure Section');
  if (section === 'J') return grid;
  return '<div class="qz-chg-layout">' + grid + qzPaymentsPanelHTML(o, section) + '</div>';
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

  const newNum = 1530 + qzList('orders').length;
  const newId = 'ORD-2026-' + newNum;
  const newTitle = 'TX-2026-0' + (4530 + qzList('orders').length);

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
      { name: qzWizState.buyer, role: 'Buyer', email: qzWizState.buyerEmail, phone: qzWizState.buyerPhone || '(214) 555-0789' },
      { name: qzWizState.seller, role: 'Seller', email: qzWizState.sellerEmail, phone: qzWizState.sellerPhone || '(972) 555-0456' },
      { name: qzWizState.sellingAgent, role: 'Selling Agent', email: 'sbee@friscorealty.com', phone: '(972) 555-0110' },
      { name: qzWizState.listingAgent, role: 'Listing Agent', email: 'peinhorn@friscorealty.com', phone: '(972) 555-0187' },
      { name: qzWizState.settlementAgent, role: 'Settlement Agent', email: 'ladminton@bestclosing.com', phone: '(214) 555-0166' },
      { name: qzWizState.lender, role: 'Lender', email: 'processing@fclending.com', phone: '(214) 555-0120' }
    ]
  };

  qzInsert('orders', newOrder);

  qzInsert('documents', { orderId: newId, name: 'Purchase Contract', type: 'Contract', status: 'Reviewed', uploadedBy: qzWizState.sellingAgent, date: QZ_TODAY, file: null, folder: 'Buyer' });
  qzInsert('documents', { orderId: newId, name: 'Title Commitment', type: 'Title', status: 'Pending', uploadedBy: '—', date: '—', file: null, folder: 'Title & Escrow' });

  qzInsert('tasks', { relatedOrderId: newId, title: 'Perform Title Search & Examination', assignedTo: 'Travis Jones', dueDate: QZ_TODAY, status: 'In Progress', group: 'Title' });
  qzInsert('tasks', { relatedOrderId: newId, title: 'Verify Earnest Money Wire Receipt', assignedTo: 'Barbara Runolfsson', dueDate: qzWizState.closingDate, status: 'Open', group: 'Order Opening' });

  simToast(`Order ${newId} created successfully.`, { tone: 'good' });
  qzOpenOrder(newId);
}

function qzEditOrderModal(orderId) {
  const o = qzFind('orders', orderId);
  if (!o) return;
  const wrap = document.createElement('div');
  wrap.id = 'qzEditOrderModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:480px">
      <div class="ph"><h4>Edit Order Details &mdash; ${esc(o.id)}</h4><button class="qz-btn sm" onclick="document.getElementById('qzEditOrderModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field wide"><label>Property Address</label><input id="qzEditOrderAddr" value="${escAttr(o.propertyAddress)}"></div>
        <div class="qz-field"><label>Order Status</label>
          <select id="qzEditOrderStatus">
            <option value="Open" ${o.status==='Open'?'selected':''}>Open</option>
            <option value="Closed" ${o.status==='Closed'?'selected':''}>Closed</option>
            <option value="Cancelled" ${o.status==='Cancelled'?'selected':''}>Cancelled</option>
          </select>
        </div>
        <div class="qz-field"><label>Closing Date</label><input id="qzEditOrderClose" type="date" value="${o.closingDate}"></div>
        <div class="qz-field"><label>Purchase Price ($)</label><input id="qzEditOrderPrice" value="${o.purchasePrice}"></div>
        <div class="qz-field"><label>Loan Amount ($)</label><input id="qzEditOrderLoan" value="${o.loanAmount || 0}"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzEditOrderModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzSaveEditOrder('${o.id}')">Save Changes</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzSaveEditOrder(orderId) {
  const addr = (document.getElementById('qzEditOrderAddr')?.value || '').trim();
  const status = document.getElementById('qzEditOrderStatus')?.value || 'Open';
  const close = document.getElementById('qzEditOrderClose')?.value;
  const price = qzParseNumeric(document.getElementById('qzEditOrderPrice')?.value);
  const loan = qzParseNumeric(document.getElementById('qzEditOrderLoan')?.value);

  const patch = { status };
  if (addr) patch.propertyAddress = addr;
  if (close) patch.closingDate = close;
  if (price !== null) patch.purchasePrice = price;
  if (loan !== null) patch.loanAmount = loan;

  qzUpdate('orders', orderId, patch);
  document.getElementById('qzEditOrderModal')?.remove();
  simToast(`Order ${orderId} updated.`, { tone: 'good' });
  qzRenderRoot();
}

function qzDeleteOrderModal(orderId) {
  const o = qzFind('orders', orderId);
  if (!o) return;
  qzConfirm({
    title: 'Delete Order',
    body: `Are you sure you want to permanently delete order ${o.id} (${o.propertyAddress})? All associated documents, tasks, messages, and ledger entries will be removed.`,
    confirmLabel: 'Delete Order',
    danger: true,
    onConfirm: () => {
      qzRemove('orders', orderId);
      const docs = qzList('documents', d => d.orderId === orderId);
      docs.forEach(d => qzRemove('documents', d.id));
      const tasks = qzList('tasks', t => t.relatedOrderId === orderId);
      tasks.forEach(t => qzRemove('tasks', t.id));
      const threads = qzList('threads', m => m.orderId === orderId);
      threads.forEach(m => qzRemove('threads', m.id));
      const receipts = qzList('receipts', r => r.order === orderId);
      receipts.forEach(r => qzRemove('receipts', r.num || r.id));
      const disbursements = qzList('disbursements', d => d.order === orderId);
      disbursements.forEach(d => qzRemove('disbursements', d.num || d.id));

      if (qzState.orderId === orderId) {
        qzCloseOrderTab(orderId);
        qzState.view = 'orders';
        qzState.orderId = null;
      }
      simToast(`Order ${orderId} deleted.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzChangeOrderNumberModal(orderId) {
  qzPrompt({
    title: 'Change Order Number',
    label: 'New order number',
    value: orderId,
    hint: 'The file number appears on every document and report generated from this order.',
    confirmLabel: 'Change number',
    onSubmit: (newNum) => {
      if (newNum === orderId) return;
      const o = qzFind('orders', orderId);
      if (!o) return;
      o.id = newNum;
      qzLogAudit('UPDATE', `Order number changed from ${orderId} to ${o.id}`);
      if (qzState.orderId === orderId) qzState.orderId = o.id;
      simToast(`Order number updated to ${o.id}`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzToggleSettlementType(orderId) {
  const o = qzFind('orders', orderId);
  if (!o) return;
  o.statementType = (o.statementType === 'HUD-1 Settlement Statement' ? 'Closing Disclosure (CD)' : 'HUD-1 Settlement Statement');
  simToast(`Settlement statement format set to ${o.statementType}`, { tone: 'good' });
  qzRenderRoot();
}

function qzToggle1099(orderId, checked) {
  qzUpdate('orders', orderId, { eligible1099: checked });
  simToast(`1099-S tax reporting ${checked ? 'enabled' : 'disabled'}.`, { tone: 'good' });
}

function qzOpenQuoteModal() {
  const wrap = document.createElement('div');
  wrap.id = 'qzQuoteModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph"><h4>Rate &amp; Fee Calculator</h4><button class="qz-btn sm" onclick="document.getElementById('qzQuoteModal').remove()">&times;</button></div>
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
  const existing = document.getElementById('qzAddPartyModal');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'qzAddPartyModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.style.zIndex = '99999';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph"><h4>Add Party to File</h4><button class="qz-btn sm" onclick="document.getElementById('qzAddPartyModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 18px">
        <div class="qz-field"><label>Role</label>
          <select id="qzNewPartyRole">
            <option value="Buyer">Buyer</option><option value="Seller">Seller</option><option value="Selling Agent">Selling Agent</option>
            <option value="Listing Agent">Listing Agent</option><option value="Lender">Lender</option><option value="Attorney">Attorney</option>
            <option value="HOA">HOA Representative</option><option value="Other">Other</option>
          </select>
        </div>
        <div class="qz-field"><label>Full Name <span style="color:var(--qz-bad)">*</span></label><input id="qzNewPartyName" placeholder="e.g. Bennett Ashcroft" autofocus></div>
        <div class="qz-field"><label>Email</label><input id="qzNewPartyEmail" placeholder="e.g. bennett@ashcroftlaw.example"></div>
        <div class="qz-field"><label>Phone</label><input id="qzNewPartyPhone" placeholder="e.g. (972) 555-0144"></div>
      </div>
      <div style="text-align:right;padding:12px 18px;border-top:1px solid var(--qz-line);display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" type="button" onclick="document.getElementById('qzAddPartyModal').remove()">Cancel</button>
        <button class="qz-btn primary" type="button" onclick="qzSaveNewParty('${orderId}')">Add Party</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  setTimeout(() => document.getElementById('qzNewPartyName')?.focus(), 50);
}

function qzSaveNewParty(orderId) {
  const role = document.getElementById('qzNewPartyRole')?.value || 'Other';
  const name = (document.getElementById('qzNewPartyName')?.value || '').trim();
  const email = (document.getElementById('qzNewPartyEmail')?.value || '').trim();
  const phone = (document.getElementById('qzNewPartyPhone')?.value || '').trim();
  if (!name) { simToast('Please enter a party name.'); return; }
  
  const o = qzFind('orders', orderId);
  if (o) {
    if (!o.parties) o.parties = [];
    o.parties.push({ role, name, email, phone });
    qzLogAudit('CREATE', `Party ${role} (${name}) on ${orderId}`);
  }

  // Also insert into central contacts directory
  if (!qzDB.contacts) qzDB.contacts = [];
  qzDB.contacts.unshift({
    id: 'c-' + Date.now(),
    name: name,
    type: QZ_SHELL_ROLE_TYPE[role] || role,
    role: role,
    company: role.includes('Agent') ? 'Real Estate Agency' : (role === 'Lender' ? name : '—'),
    email: email || '—',
    phone: phone || '—',
    mobile: '—',
    address: o ? o.propertyAddress : '—',
    created: QZ_TODAY,
    createdBy: 'Order intake',
    lastActivity: QZ_TODAY,
    orders: [orderId],
    derived: false
  });
  
  document.getElementById('qzAddPartyModal')?.remove();
  simToast(`Added ${name} (${role}) to file.`, { tone: 'good' });
  qzRenderRoot();
}

function qzEditPartyModal(orderId, role) {
  const o = qzFind('orders', orderId);
  const p = o && o.parties && o.parties.find(x => x.role === role);
  if (!p) return;

  const wrap = document.createElement('div');
  wrap.id = 'qzEditPartyModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph"><h4>Edit Party &mdash; ${esc(role)}</h4><button class="qz-btn sm" onclick="document.getElementById('qzEditPartyModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field wide"><label>Full Name</label><input id="qzEditPartyName" value="${escAttr(p.name)}"></div>
        <div class="qz-field wide"><label>Email</label><input id="qzEditPartyEmail" value="${escAttr(p.email || '')}"></div>
        <div class="qz-field wide"><label>Phone</label><input id="qzEditPartyPhone" value="${escAttr(p.phone || '')}"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzEditPartyModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzSaveEditParty('${orderId}', '${escAttr(role)}')">Save Changes</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzSaveEditParty(orderId, role) {
  const name = (document.getElementById('qzEditPartyName')?.value || '').trim();
  const email = (document.getElementById('qzEditPartyEmail')?.value || '').trim();
  const phone = (document.getElementById('qzEditPartyPhone')?.value || '').trim();
  if (!name) { simToast('Name cannot be empty.'); return; }

  const o = qzFind('orders', orderId);
  const p = o && o.parties && o.parties.find(x => x.role === role);
  if (p) {
    p.name = name;
    p.email = email;
    p.phone = phone;
    qzLogAudit('UPDATE', `Party ${role} on ${orderId}`);
  }
  document.getElementById('qzEditPartyModal')?.remove();
  simToast(`Party ${role} updated.`, { tone: 'good' });
  qzRenderRoot();
}

function qzDeletePartyModal(orderId, role) {
  qzConfirm({
    title: 'Delete Party',
    body: `Are you sure you want to remove the ${role} party from order ${orderId}?`,
    confirmLabel: 'Remove Party',
    danger: true,
    onConfirm: () => {
      const o = qzFind('orders', orderId);
      if (o && o.parties) {
        const idx = o.parties.findIndex(p => p.role === role);
        if (idx !== -1) o.parties.splice(idx, 1);
        qzLogAudit('DELETE', `Party ${role} on ${orderId}`);
      }
      simToast(`Party ${role} removed.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
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
            <option value="Title Commitment">Title Commitment</option>
            <option value="Other">Other Document</option>
          </select>
        </div>
        <div class="qz-field"><label>Folder</label>
          <select id="qzNewDocFolder">
            <option value="All Documents">All Documents</option>
            <option value="Buyer">Buyer</option>
            <option value="Seller">Seller</option>
            <option value="Title & Escrow" selected>Title & Escrow</option>
            <option value="Lender">Lender</option>
            <option value="Closing Packages">Closing Packages</option>
            <option value="Archive">Archive</option>
          </select>
        </div>
        <div class="qz-field wide"><label>Document Name</label><input id="qzNewDocName" value="Survey &mdash; Precision Land Surveying"></div>
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
  const folder = document.getElementById('qzNewDocFolder')?.value || 'Title & Escrow';
  const name = (document.getElementById('qzNewDocName').value || '').trim() || type;

  qzInsert('documents', {
    orderId: orderId,
    name: name,
    type: type,
    folder: folder,
    status: 'Received',
    uploadedBy: 'Training User',
    date: QZ_TODAY,
    file: null
  });
  document.getElementById('qzAddDocModal')?.remove();
  simToast(`Document "${name}" uploaded.`, { tone: 'good' });
  qzRenderRoot();
}

function qzEditDocModal(docId) {
  const d = qzFind('documents', docId);
  if (!d) return;
  const wrap = document.createElement('div');
  wrap.id = 'qzEditDocModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph"><h4>Edit Document</h4><button class="qz-btn sm" onclick="document.getElementById('qzEditDocModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field wide"><label>Document Name</label><input id="qzEditDocName" value="${escAttr(d.name)}"></div>
        <div class="qz-field"><label>Type</label><input id="qzEditDocType" value="${escAttr(d.type)}"></div>
        <div class="qz-field"><label>Folder</label>
          <select id="qzEditDocFolder">
            <option value="Buyer" ${d.folder==='Buyer'?'selected':''}>Buyer</option>
            <option value="Seller" ${d.folder==='Seller'?'selected':''}>Seller</option>
            <option value="Title & Escrow" ${(d.folder||'Title & Escrow')==='Title & Escrow'?'selected':''}>Title & Escrow</option>
            <option value="Lender" ${d.folder==='Lender'?'selected':''}>Lender</option>
            <option value="Closing Packages" ${d.folder==='Closing Packages'?'selected':''}>Closing Packages</option>
            <option value="Archive" ${d.folder==='Archive'?'selected':''}>Archive</option>
          </select>
        </div>
        <div class="qz-field wide"><label>Status</label>
          <select id="qzEditDocStatus">
            <option value="Pending" ${d.status==='Pending'?'selected':''}>Pending</option>
            <option value="Received" ${d.status==='Received'?'selected':''}>Received</option>
            <option value="Reviewed" ${d.status==='Reviewed'?'selected':''}>Reviewed</option>
          </select>
        </div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzEditDocModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzSaveEditDoc('${escAttr(String(d.id))}')">Save Changes</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzSaveEditDoc(docId) {
  const name = (document.getElementById('qzEditDocName')?.value || '').trim();
  const type = (document.getElementById('qzEditDocType')?.value || '').trim();
  const folder = document.getElementById('qzEditDocFolder')?.value;
  const status = document.getElementById('qzEditDocStatus')?.value;
  if (!name) { simToast('Document name cannot be empty.'); return; }

  qzUpdate('documents', docId, { name, type, folder, status });
  document.getElementById('qzEditDocModal')?.remove();
  simToast(`Document updated.`, { tone: 'good' });
  qzRenderRoot();
}

function qzDeleteDocModal(docId) {
  const d = qzFind('documents', docId);
  if (!d) return;
  qzConfirm({
    title: 'Delete Document',
    body: `Are you sure you want to permanently delete "${d.name}"?`,
    confirmLabel: 'Delete Document',
    danger: true,
    onConfirm: () => {
      qzRemove('documents', docId);
      simToast(`Document "${d.name}" deleted.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzNewFolderModal(orderId) {
  qzPrompt({
    title: 'New Folder',
    label: 'Folder name',
    placeholder: 'e.g. Lender Package',
    confirmLabel: 'Create folder',
    onSubmit: (folderName) => {
      qzDocActiveFolder = folderName;
      simToast(`Folder "${qzDocActiveFolder}" created.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzTemplateLibraryModal(orderId) {
  const wrap = document.createElement('div');
  wrap.id = 'qzTemplateModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:600px">
      <div class="ph"><h4>Qualia Document Template Library</h4><button class="qz-btn sm" onclick="document.getElementById('qzTemplateModal').remove()">&times;</button></div>
      <p style="font-size:12.5px;color:var(--qz-muted);margin:8px 0 14px">Select a standard or custom document template to merge with current order data.</p>
      <div class="qz-subtabs" style="margin-bottom:12px">
        <span class="active">Standard Templates</span>
        <span>Custom Agency Templates</span>
        <span>Generated Closing Docs</span>
      </div>
      <div class="qz-tbl-scroll" style="max-height:260px">
        <table class="qz-tbl">
          <thead><tr><th>Template Name</th><th>Category</th><th>Source</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td><b>Texas General Warranty Deed</b></td><td>Deed & Conveyance</td><td>Standard (TDI)</td><td><button class="qz-btn sm primary" onclick="qzGenerateFromTemplate('${orderId}','General Warranty Deed','Deed')">Generate</button></td></tr>
            <tr><td><b>Owner & Lender Title Commitment</b></td><td>Commitment</td><td>Old Republic</td><td><button class="qz-btn sm primary" onclick="qzGenerateFromTemplate('${orderId}','Title Commitment','Title')">Generate</button></td></tr>
            <tr><td><b>Closing Protection Letter (CPL)</b></td><td>Compliance</td><td>Old Republic</td><td><button class="qz-btn sm primary" onclick="qzGenerateFromTemplate('${orderId}','Closing Protection Letter','Compliance')">Generate</button></td></tr>
            <tr><td><b>Affidavit of Marital Status & Identity</b></td><td>Affidavits</td><td>Custom Agency</td><td><button class="qz-btn sm primary" onclick="qzGenerateFromTemplate('${orderId}','Identity Affidavit','Affidavit')">Generate</button></td></tr>
            <tr><td><b>Wiring Instructions Acknowledgment</b></td><td>Escrow</td><td>ALTA Best Practice</td><td><button class="qz-btn sm primary" onclick="qzGenerateFromTemplate('${orderId}','Wire Acknowledgment','Escrow')">Generate</button></td></tr>
          </tbody>
        </table>
      </div>
      <div style="text-align:right;padding-top:14px"><button class="qz-btn" onclick="document.getElementById('qzTemplateModal').remove()">Close</button></div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzGenerateFromTemplate(orderId, name, type) {
  document.getElementById('qzTemplateModal')?.remove();
  qzInsert('documents', {
    orderId: orderId,
    name: name,
    type: type,
    folder: 'Closing Packages',
    status: 'Received',
    uploadedBy: 'Template Engine',
    date: QZ_TODAY,
    file: null
  });
  simToast(`Generated document "${name}" from template.`, { tone: 'good' });
  qzRenderRoot();
}

function qzAddTaskModal(orderId, groupName) {
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
        <div class="qz-field"><label>Task Group</label>
          <select id="qzNewTaskGroup">
            <option value="Order Opening" ${(groupName||'')==='Order Opening'?'selected':''}>Order Opening</option>
            <option value="Title" ${(groupName||'')==='Title'?'selected':''}>Title</option>
            <option value="Pre-Closing" ${(groupName||'')==='Pre-Closing'?'selected':''}>Pre-Closing</option>
            <option value="Payoff Tasks" ${(groupName||'')==='Payoff Tasks'?'selected':''}>Payoff Tasks</option>
            <option value="Post-Closing" ${(groupName||'')==='Post-Closing'?'selected':''}>Post-Closing</option>
          </select>
        </div>
        <div class="qz-field wide"><label>Due Date</label><input id="qzNewTaskDue" type="date" value="${QZ_TODAY}"></div>
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
  const group = document.getElementById('qzNewTaskGroup')?.value || 'Order Opening';
  const due = document.getElementById('qzNewTaskDue').value || QZ_TODAY;
  if (!title) { simToast('Please enter a task title.'); return; }

  qzInsert('tasks', {
    relatedOrderId: orderId,
    title: title,
    assignedTo: assign,
    dueDate: due,
    status: 'Open',
    group: group
  });
  document.getElementById('qzAddTaskModal')?.remove();
  simToast(`Task "${title}" assigned to ${assign}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzEditTaskModal(taskId) {
  const t = qzFind('tasks', taskId);
  if (!t) return;
  const wrap = document.createElement('div');
  wrap.id = 'qzEditTaskModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph"><h4>Edit Task</h4><button class="qz-btn sm" onclick="document.getElementById('qzEditTaskModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field wide"><label>Task Title</label><input id="qzEditTaskTitle" value="${escAttr(t.title)}"></div>
        <div class="qz-field"><label>Assigned To</label><input id="qzEditTaskAssign" value="${escAttr(t.assignedTo)}"></div>
        <div class="qz-field"><label>Status</label>
          <select id="qzEditTaskStatus">
            <option value="Open" ${t.status==='Open'?'selected':''}>Open</option>
            <option value="In Progress" ${t.status==='In Progress'?'selected':''}>In Progress</option>
            <option value="Complete" ${t.status==='Complete'?'selected':''}>Complete</option>
          </select>
        </div>
        <div class="qz-field wide"><label>Due Date</label><input id="qzEditTaskDue" type="date" value="${t.dueDate}"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzEditTaskModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzSaveEditTask('${escAttr(String(t.id))}')">Save Changes</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzSaveEditTask(taskId) {
  const title = (document.getElementById('qzEditTaskTitle')?.value || '').trim();
  const assign = (document.getElementById('qzEditTaskAssign')?.value || '').trim();
  const status = document.getElementById('qzEditTaskStatus')?.value;
  const due = document.getElementById('qzEditTaskDue')?.value;
  if (!title) { simToast('Task title cannot be empty.'); return; }

  qzUpdate('tasks', taskId, { title, assignedTo: assign, status, dueDate: due });
  document.getElementById('qzEditTaskModal')?.remove();
  simToast('Task updated.', { tone: 'good' });
  qzRenderRoot();
}

function qzDeleteTaskModal(taskId) {
  const t = qzFind('tasks', taskId);
  if (!t) return;
  qzConfirm({
    title: 'Delete Task',
    body: `Are you sure you want to permanently delete task "${t.title}"?`,
    confirmLabel: 'Delete Task',
    danger: true,
    onConfirm: () => {
      qzRemove('tasks', taskId);
      simToast(`Task "${t.title}" deleted.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

/* A group is a phase of the workflow, and phases hold work. Deleting one that still has
   tasks in it would silently orphan them across every order that uses this workflow, so the
   count is checked first and named in the refusal. */
function qzDeleteTaskGroupModal(groupId) {
  const g = qzFind('taskGroups', groupId);
  if (!g) return;
  const inUse = qzList('tasks', t => t.taskGroup === g.id || t.group === g.name).length;
  if (inUse) {
    simToast(inUse + ' task(s) still sit in "' + g.name + '". Move or close them first.');
    return;
  }
  qzConfirm({
    title: 'Delete "' + g.name + '"?',
    body: 'The group disappears from every order that uses this workflow.',
    danger: true,
    confirmLabel: 'Delete group',
    onConfirm: () => {
      qzRemove('taskGroups', g.id || g.name);
      simToast('"' + g.name + '" deleted.', { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzAddTaskGroupModal(orderId) {
  qzPrompt({
    title: 'Add Task Group',
    label: 'Group name',
    placeholder: 'e.g. Post-Closing Audit',
    hint: 'Groups are the chronological phases the workflow is broken into.',
    confirmLabel: 'Add group',
    onSubmit: (name) => {
      qzInsert('taskGroups', { name: name });
      simToast(`Task Group "${name}" created.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzAdvanceStageModal(orderId) {
  const o = qzGetOrder(orderId);
  const nextStage = QZ_STAGES[Math.min(QZ_STAGES.length - 1, o.stageIndex + 1)];
  qzConfirm({
    title: `Advance Stage to "${nextStage}"?`,
    body: `Are you sure you want to advance this order from "${QZ_STAGES[o.stageIndex]}" to "${nextStage}"? This will update the milestone timeline.`,
    confirmLabel: 'Advance Stage',
    onConfirm: () => {
      qzSetScalarOverride(orderId, 'stageIndex', Math.min(QZ_STAGES.length - 1, o.stageIndex + 1));
      simToast(`Order advanced to stage: ${nextStage}`, { tone: 'good' });
      qzRenderRoot();
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

  const thread = qzInsert('threads', {
    orderId: orderId,
    subject: sub,
    thread: [{ sender: 'You (VA)', recipient: rec, date: QZ_TODAY, body: body }]
  });
  document.getElementById('qzNewThreadModal')?.remove();
  simToast(`Message "${sub}" sent to ${rec}.`, { tone: 'good' });
  qzState.threadId = thread.id;
  qzRenderRoot();
}

function qzDeleteThreadModal(threadId) {
  qzConfirm({
    title: 'Delete Message Thread',
    body: 'Are you sure you want to delete this message thread and its history?',
    confirmLabel: 'Delete Thread',
    danger: true,
    onConfirm: () => {
      qzRemove('threads', threadId);
      qzState.threadId = null;
      simToast('Thread deleted.', { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzAddVendorModal(orderId) {
  const wrap = document.createElement('div');
  wrap.id = 'qzAddVendorModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph"><h4>Add Vendor to Order</h4><button class="qz-btn sm" onclick="document.getElementById('qzAddVendorModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field wide"><label>Vendor Name</label><input id="qzNewVendorName" placeholder="e.g. Lone Star Surveying"></div>
        <div class="qz-field"><label>Service Provided</label><input id="qzNewVendorService" placeholder="e.g. Survey"></div>
        <div class="qz-field"><label>Status</label>
          <select id="qzNewVendorStatus">
            <option value="Pending">Pending</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzAddVendorModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzSaveNewVendor('${orderId}')">Add Vendor</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzSaveNewVendor(orderId) {
  const name = (document.getElementById('qzNewVendorName')?.value || '').trim();
  const service = (document.getElementById('qzNewVendorService')?.value || '').trim() || 'General';
  const status = document.getElementById('qzNewVendorStatus')?.value || 'Pending';
  if (!name) { simToast('Vendor name cannot be empty.'); return; }

  qzInsert('vendors', { orderId, name, service, status });
  document.getElementById('qzAddVendorModal')?.remove();
  simToast(`Vendor "${name}" added to order.`, { tone: 'good' });
  qzRenderRoot();
}

function qzEditVendorModal(vendorId) {
  const v = qzFind('vendors', vendorId);
  if (!v) return;
  const wrap = document.createElement('div');
  wrap.id = 'qzEditVendorModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph"><h4>Edit Vendor</h4><button class="qz-btn sm" onclick="document.getElementById('qzEditVendorModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field wide"><label>Vendor Name</label><input id="qzEditVendorName" value="${escAttr(v.name)}"></div>
        <div class="qz-field"><label>Service</label><input id="qzEditVendorService" value="${escAttr(v.service)}"></div>
        <div class="qz-field"><label>Status</label>
          <select id="qzEditVendorStatus">
            ${QZ_VENDOR_STATUS.map(st => `<option value="${escAttr(st)}" ${v.status === st ? 'selected' : ''}>${esc(st)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzEditVendorModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzSaveEditVendor('${escAttr(String(v.id))}')">Save Changes</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzSaveEditVendor(vendorId) {
  const name = (document.getElementById('qzEditVendorName')?.value || '').trim();
  const service = (document.getElementById('qzEditVendorService')?.value || '').trim();
  const status = document.getElementById('qzEditVendorStatus')?.value;
  if (!name) { simToast('Vendor name cannot be empty.'); return; }

  qzUpdate('vendors', vendorId, { name, service, status });
  document.getElementById('qzEditVendorModal')?.remove();
  simToast('Vendor updated.', { tone: 'good' });
  qzRenderRoot();
}

function qzDeleteVendorModal(vendorId) {
  const v = qzFind('vendors', vendorId);
  if (!v) return;
  qzConfirm({
    title: 'Delete Vendor',
    body: `Are you sure you want to remove vendor "${v.name}" from this file?`,
    confirmLabel: 'Delete Vendor',
    danger: true,
    onConfirm: () => {
      qzRemove('vendors', vendorId);
      simToast(`Vendor "${v.name}" deleted.`, { tone: 'good' });
      qzRenderRoot();
    }
  });
}

function qzAddLedgerLineModal(orderId) {
  const wrap = document.createElement('div');
  wrap.id = 'qzAddLedgerModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:480px">
      <div class="ph"><h4>Add Ledger Transaction</h4><button class="qz-btn sm" onclick="document.getElementById('qzAddLedgerModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field"><label>Transaction Type</label>
          <select id="qzLedgerKind">
            <option value="receipt">Receipt (Deposit / Credit)</option>
            <option value="disbursement">Disbursement (Check / Debit)</option>
          </select>
        </div>
        <div class="qz-field"><label>Amount ($)</label><input id="qzLedgerAmount" type="number" step="0.01" placeholder="e.g. 1500.00"></div>
        <div class="qz-field wide"><label>Payee / Remitter</label><input id="qzLedgerParty" placeholder="e.g. Frost Bank / Buyer Name"></div>
        <div class="qz-field"><label>Payment Method</label>
          <select id="qzLedgerMethod">
            <option value="Wire Transfer">Wire Transfer</option>
            <option value="Check">Check</option>
            <option value="ACH">ACH</option>
            <option value="Cashier Check">Cashier's Check</option>
          </select>
        </div>
        <div class="qz-field"><label>Reference / Check #</label><input id="qzLedgerRef" placeholder="e.g. R-2409 / CK-1092"></div>
        <div class="qz-field wide"><label>Memo / Description</label><input id="qzLedgerMemo" placeholder="e.g. Additional Earnest Money Deposit"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzAddLedgerModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzSaveLedgerLine('${orderId}')">Record Transaction</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzSaveLedgerLine(orderId) {
  const kind = document.getElementById('qzLedgerKind').value;
  const amt = parseFloat(document.getElementById('qzLedgerAmount').value) || 0;
  const party = (document.getElementById('qzLedgerParty').value || '').trim() || 'Payee';
  const method = document.getElementById('qzLedgerMethod').value;
  const ref = (document.getElementById('qzLedgerRef').value || '').trim() || (kind === 'receipt' ? 'R-' + Date.now().toString().slice(-4) : 'CK-' + Date.now().toString().slice(-4));
  const memo = (document.getElementById('qzLedgerMemo').value || '').trim() || 'Escrow Settlement Transaction';

  if (amt <= 0) { simToast('Please enter a valid dollar amount.'); return; }

  if (kind === 'receipt') {
    qzInsert('receipts', {
      order: orderId,
      num: ref,
      date: QZ_TODAY,
      amount: amt,
      remitter: party,
      method: method,
      memo: memo,
      status: 'Deposited'
    });
  } else {
    qzInsert('disbursements', {
      order: orderId,
      num: ref,
      date: QZ_TODAY,
      amount: amt,
      payee: party,
      method: method,
      memo: memo,
      status: 'Issued'
    });
  }
  document.getElementById('qzAddLedgerModal')?.remove();
  simToast(`Ledger transaction ${ref} recorded for ${fmtMoney(amt)}.`, { tone: 'good' });
  qzRenderRoot();
}

function qzEditLedgerLineModal(lineId) {
  const isReceipt = lineId.startsWith('r-');
  const rawId = lineId.replace(/^[rd]-/, '');
  const coll = isReceipt ? 'receipts' : 'disbursements';
  const item = qzFind(coll, rawId);
  if (!item) return;

  const wrap = document.createElement('div');
  wrap.id = 'qzEditLedgerModal';
  wrap.className = 'qz-modal-backdrop';
  wrap.innerHTML = `
    <div class="qz-modal-card" style="max-width:440px">
      <div class="ph"><h4>Edit Ledger Line &mdash; ${esc(item.num || rawId)}</h4><button class="qz-btn sm" onclick="document.getElementById('qzEditLedgerModal').remove()">&times;</button></div>
      <div class="qz-form-grid" style="padding:14px 0">
        <div class="qz-field wide"><label>Payee / Remitter</label><input id="qzEditLedgerParty" value="${escAttr(item.remitter || item.payee || '')}"></div>
        <div class="qz-field"><label>Amount ($)</label><input id="qzEditLedgerAmount" type="number" step="0.01" value="${item.amount}"></div>
        <div class="qz-field"><label>Status</label>
          <select id="qzEditLedgerStatus">
            <option value="Pending" ${item.status==='Pending'?'selected':''}>Pending</option>
            <option value="Deposited" ${item.status==='Deposited'?'selected':''}>Deposited</option>
            <option value="Cleared" ${item.status==='Cleared'?'selected':''}>Cleared</option>
            <option value="Issued" ${item.status==='Issued'?'selected':''}>Issued</option>
            <option value="Void" ${item.status==='Void'?'selected':''}>Void</option>
          </select>
        </div>
        <div class="qz-field wide"><label>Memo</label><input id="qzEditLedgerMemo" value="${escAttr(item.memo || '')}"></div>
      </div>
      <div style="text-align:right;padding-top:10px;display:flex;justify-content:flex-end;gap:8px">
        <button class="qz-btn" onclick="document.getElementById('qzEditLedgerModal').remove()">Cancel</button>
        <button class="qz-btn primary" onclick="qzSaveEditLedgerLine('${coll}', '${rawId}')">Save Changes</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

function qzSaveEditLedgerLine(coll, rawId) {
  const party = document.getElementById('qzEditLedgerParty')?.value;
  const amount = parseFloat(document.getElementById('qzEditLedgerAmount')?.value) || 0;
  const status = document.getElementById('qzEditLedgerStatus')?.value;
  const memo = document.getElementById('qzEditLedgerMemo')?.value;

  const patch = { amount, status, memo };
  if (coll === 'receipts') patch.remitter = party; else patch.payee = party;

  qzUpdate(coll, rawId, patch);
  document.getElementById('qzEditLedgerModal')?.remove();
  simToast('Ledger entry updated.', { tone: 'good' });
  qzRenderRoot();
}

function qzDeleteLedgerLineModal(lineId) {
  const isReceipt = lineId.startsWith('r-');
  const rawId = lineId.replace(/^[rd]-/, '');
  const coll = isReceipt ? 'receipts' : 'disbursements';
  qzConfirm({
    title: 'Delete Ledger Transaction',
    body: `Are you sure you want to delete transaction ${rawId} from the accounting ledger?`,
    confirmLabel: 'Delete Transaction',
    danger: true,
    onConfirm: () => {
      qzRemove(coll, rawId);
      simToast('Transaction removed from ledger.', { tone: 'good' });
      qzRenderRoot();
    }
  });
}

/* ---------- Additional Rail Tabs (D.3) ---------- */
function qzRequirementsHTML(o) {
  return `
    <div class="qz-panel">
      <div class="ph"><h4>Title Requirements (Schedule B &middot; Part I)</h4><button class="qz-btn sm primary" onclick="simToast('Requirement satisfied and cleared in title engine.')">Clear Selected</button></div>
      <p style="font-size:12.5px;color:var(--qz-muted);margin-bottom:14px">Specific instruments, releases, and actions that must be completed prior to closing and policy delivery.</p>
      <div class="qz-sched-box">
        <div class="qz-sched-body">
          <div class="qz-sched-item"><input type="checkbox"><div>General Warranty Deed from <b>${esc(qzOrderParty(o, 'Seller'))}</b> to <b>${esc(qzOrderParty(o, 'Buyer'))}</b>.</div></div>
          <div class="qz-sched-item"><input type="checkbox"><div>Full satisfaction and release of Deed of Trust (1st Lien Summit Ridge Mortgage).</div></div>
          <div class="qz-sched-item"><input type="checkbox"><div>Payment of 2026 ad valorem taxes and municipal assessments through funding date.</div></div>
          <div class="qz-sched-item"><input type="checkbox"><div>Receipt and examination of acceptable boundary survey and surveyor inspection report.</div></div>
          <div class="qz-sched-item"><input type="checkbox"><div>Executed marital status and non-homestead affidavit by grantor.</div></div>
        </div>
      </div>
    </div>`;
}



function qzPreviewCdHTML(o) {
  return `
    <div class="qz-panel">
      <div class="ph">
        <div>
          <h4>Closing Disclosure &mdash; Live Preview</h4>
          <span class="sub">5-page standard CFPB TRID Closing Disclosure generated from file state</span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="qz-btn sm" onclick="simToast('CD exported as PDF (training mode).')">Export PDF</button>
          <button class="qz-btn sm primary" onclick="simToast('CD transmitted to lender via Connect.', {tone:'good'})">Send to Lender</button>
        </div>
      </div>
      <div class="qz-calc-card">
        <div class="qz-calc-row"><span>Borrower:</span><span class="qz-calc-val">${esc(qzOrderParty(o, 'Buyer'))}</span></div>
        <div class="qz-calc-row"><span>Seller:</span><span class="qz-calc-val">${esc(qzOrderParty(o, 'Seller'))}</span></div>
        <div class="qz-calc-row"><span>Settlement Agent:</span><span class="qz-calc-val">${esc(o.settlementAgency)}</span></div>
        <div class="qz-calc-row"><span>Sale Price:</span><span class="qz-calc-val">${fmtMoney(o.purchasePrice)}</span></div>
        <div class="qz-calc-row"><span>Loan Amount:</span><span class="qz-calc-val">${fmtMoney(o.loanAmount || 0)}</span></div>
        <div class="qz-calc-row total"><span>Estimated Cash to Close (Borrower):</span><span class="qz-calc-val" style="color:var(--qz-ocean);font-size:16px">${fmtMoney(Math.max(0, o.purchasePrice - (o.loanAmount||0) + 7800 - 5000))}</span></div>
      </div>
    </div>`;
}

function qzPreviewSettlementHTML(o) {
  return `
    <div class="qz-panel">
      <div class="ph">
        <div>
          <h4>Settlement Statement (ALTA Combined)</h4>
          <span class="sub">Standard combined buyer and seller settlement accounting breakdown</span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="qz-btn sm" onclick="simToast('Statement printed (training mode).')">Print Statement</button>
        </div>
      </div>
      <div class="qz-calc-card">
        <div class="qz-calc-row"><span>Property Address:</span><span class="qz-calc-val">${esc(o.propertyAddress)}</span></div>
        <div class="qz-calc-row"><span>File Number:</span><span class="qz-calc-val">${esc(o.id)}</span></div>
        <div class="qz-calc-row"><span>Closing Date:</span><span class="qz-calc-val">${fmtDate(o.closingDate)}</span></div>
        <div class="qz-calc-row total"><span>Escrow Account Status:</span><span class="qz-badge complete">&#10003; In Balance ($0.00 Variance)</span></div>
      </div>
    </div>`;
}













function qzGlobalDocsHTML() {
  const allDocs = qzList('documents');
  const rows = allDocs.map(d => `
    <tr>
      <td><b>${esc(d.name)}</b></td>
      <td>${esc(d.type)}</td>
      <td><span class="qzs-link" onclick="qzOpenOrder('${escAttr(d.orderId)}')">${esc(d.orderId)}</span></td>
      <td><span class="qz-badge ${d.status==='Reviewed'?'reviewed':d.status==='Received'?'received':'pending'}">${esc(d.status)}</span></td>
      <td>${esc(d.uploadedBy)}</td>
      <td>${fmtDate(d.date)}</td>
    </tr>`).join('');

  return `
    <div class="qz-listhead">
      <div><h2>Documents</h2><div class="sub">All agency documents across all active and archived files</div></div>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Document Name</th><th>Type</th><th>Order</th><th>Status</th><th>Uploaded By</th><th>Date</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--qz-muted)">No documents in database.</td></tr>'}</tbody>
      </table>
    </div>`;
}

function qzGlobalMessagesHTML() {
  const allThreads = qzList('threads');
  const rows = allThreads.map(t => `
    <tr>
      <td><b>${esc(t.subject)}</b></td>
      <td><span class="qzs-link" onclick="qzOpenOrder('${escAttr(t.orderId)}')">${esc(t.orderId)}</span></td>
      <td>${(t.thread || []).length} messages</td>
      <td>${t.thread && t.thread[t.thread.length - 1] ? esc(t.thread[t.thread.length - 1].sender) : '—'}</td>
    </tr>`).join('');

  return `
    <div class="qz-listhead">
      <div><h2>Connect Messages</h2><div class="sub">Agency-wide communication threads and client correspondence</div></div>
    </div>
    <div class="qz-tbl-scroll">
      <table class="qz-tbl">
        <thead><tr><th>Subject</th><th>Order</th><th>Thread Length</th><th>Last Sender</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--qz-muted)">No message threads.</td></tr>'}</tbody>
      </table>
    </div>`;
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
const QZ_REC_AT = {
  'rec-1483-price-conflict': { orderId: 'ORD-2026-1483', tab: 'dataentry', deTab: 'transaction', label: 'Transaction Information' },
  'rec-1512-commitment':     { orderId: 'ORD-2026-1512', tab: 'documents', label: 'Documents' },
  'rec-1398-payoff':         { orderId: 'ORD-2026-1398', tab: 'payoffs',   label: 'Existing Loan Payoffs' },
  'rec-1398-wire':           { orderId: 'ORD-2026-1398', tab: 'communication', label: 'Connect' }
};

/* Entry point for a `reconcile` step, and the step's setup(). The twin of qzVerifyDrive:
   put the real Core page the exercise is about on screen, then float the exercise over it,
   instead of navigating away to a course screen that reprints a file the product already
   shows. Items with no QZ_REC_AT entry keep the old standalone page. */
function qzReconcileDrive(recId) {
  const r = qzRecLookup(recId);
  if (!r) return;
  const at = QZ_REC_AT[recId];
  if (!at) { qzGotoReview(r.orderId); return; }
  /* The trainee is away fetching a source from the real Documents list; re-opening the
     dialog now would cover the row they were sent to find. */
  if (qzState.pendingRecDoc && qzState.pendingRecDoc.recId === recId) { qzRenderRoot(); return; }
  if (qzState.pendingRecFix && qzState.pendingRecFix.recId === recId) { qzRenderRoot(); return; }
  qzAskGoto({ orderId: at.orderId || r.orderId, tab: at.tab, deTab: at.deTab });
  qzAsk = { kind: 'reconcile', id: recId, ctx: at };
  qzAskLast = qzAsk;
  qzRenderRoot();
  qzSyncReconcileStep(recId);
}

function qzRecLookup(id) {
  return (typeof QZ_RECONCILES !== 'undefined' ? QZ_RECONCILES.find(r => r.id === id) : null) ||
    (typeof QZ_EXAM_BANK !== 'undefined' ? QZ_EXAM_BANK.find(i => i.type === 'reconcile' && i.id === id) : null);
}
function qzRecExamMode(id) {
  return typeof QZ_EXAM_BANK !== 'undefined' && QZ_EXAM_BANK.some(i => i.type === 'reconcile' && i.id === id);
}
function qzRecGet(id) {
  const key = qzScopedItemKey(id);
  if (!qzStore.reconciles[key]) qzStore.reconciles[key] = { opened: {}, cells: {}, decisions: {}, notes: {} };
  return qzStore.reconciles[key];
}
function qzRecAllDocsOpened(id) {
  const r = qzRecLookup(id), st = qzRecGet(id);
  return !!r && r.docs.every(d => st.opened[d.id]);
}
function qzRecDocRowId(r, docId) {
  const doc = r.docs.find(d => d.id === docId);
  if (!doc) return null;
  const d = qzList('documents').find(x => x.orderId === r.orderId && x.file === doc.file);
  return d ? d.id : null;
}
function qzRecGoDoc(recId, docId) {
  const r = qzRecLookup(recId);
  if (!r) return;
  qzState.pendingRecDoc = { recId: recId, docId: docId };
  /* Same reason as qzRevGoDoc: the card would sit on top of the row they were just
     sent to find. */
  qzAsk = null;
  qzDocActiveFolder = 'All Documents';
  qzDocQuery = '';
  qzState.view = 'order';
  qzState.orderId = r.orderId;
  qzState.orderTab = 'documents';
  qzState.composeId = null;
  qzSyncTopTabs();
  qzRenderRoot();
  qzSyncReconcileStep(recId);
}
function qzRecOpenDoc(id, docId) {
  const r = qzRecLookup(id);
  const d = r && r.docs.find(x => x.id === docId);
  if (!d) return;
  qzOpenDocFile(d.file, d.title);
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
  const noteEl = document.getElementById('qzRecNote-' + id + '-' + rowId);
  const noteVal = noteEl ? noteEl.value.trim() : '';
  if (!qzRecExamMode(id) && row.noteExample && (!noteVal || noteVal.length < 10)) {
    simToast('Please write an escalation note explaining the discrepancy (at least 10 characters).');
    return;
  }
  const st = qzRecGet(id);
  const d = st.decisions[rowId] || {};
  d.category = cat;
  d.categoryCorrect = cat === row.rightCategory;
  if (noteEl) st.notes[rowId] = noteVal;
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
function qzRecGoFix(recId, rowId) {
  const r = qzRecLookup(recId);
  if (!r) return;
  const row = r.rows.find(x => x.id === rowId);
  if (!row || !row.fixAt) return;
  qzState.pendingRecFix = { recId: recId, rowId: rowId };
  qzAsk = null;
  const at = QZ_REC_AT[recId];
  qzOpenOrderTab(at ? at.orderId || r.orderId : r.orderId);
  qzState.view = 'order';
  qzState.orderId = r.orderId;
  qzState.orderTab = row.fixAt.tab;
  qzState.composeId = null;
  qzSyncTopTabs();
  qzRenderRoot();
  qzSyncReconcileStep(recId);
}
function qzRecGradeFix(recId, rowId, newValue) {
  const r = qzRecLookup(recId);
  const row = r && r.rows.find(x => x.id === rowId);
  if (!row) return;
  const st = qzRecGet(recId);
  const d = st.decisions[rowId] || {};
  d.value = newValue;
  d.valueCorrect = qzNormalizeValue(newValue) === qzNormalizeValue(row.correctedValue);
  st.decisions[rowId] = d;
  qzState.pendingRecFix = null;
  qzSave();
  if (d.valueCorrect) {
    simToast('Status updated on the order.', { tone: 'good' });
  } else {
    simToast("That does not match what the source shows.", { tone: 'bad' });
    qzRenderRoot();
    qzSyncReconcileStep(recId);
    return;
  }
  const at = QZ_REC_AT[recId];
  if (at) {
    qzAsk = { kind: 'reconcile', id: recId, ctx: at };
    qzAskLast = qzAsk;
  }
  qzRenderRoot();
  qzSyncReconcileStep(recId);
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
function qzRecRowDecisionHTML(r, row, examMode, popup) {
  const st = qzRecGet(r.id);
  if (!qzRecRowCellsDone(r.id, row.id)) {
    return `<div class="qz-rec-locked">Fill in every source for this row first.</div>`;
  }
  const d = st.decisions[row.id] || {};
  const answered = !!d.action;
  const actions = (popup && answered) ? '' : qzOptionOrder('rec3:' + r.id + ':' + row.id, QZ_ACTION_CHOICES.length).map(i => {
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
      if (done && !wrong) {
        follow = `<div class="qz-rv-subfeedback good">&#10003; Value recorded${examMode ? '' : ': ' + esc(d.value)}</div>`;
      } else if (row.fixAt && !examMode) {
        follow = `<div class="qz-rec-follow">
             <p class="qz-rv-handoff">Go to this file's ${esc(row.fixAt.tab === 'documents' ? 'Documents' : row.fixAt.tab)} and make the correction there.</p>
             <button type="button" class="qz-btn sm primary" onclick="qzRecGoFix('${r.id}','${row.id}')">Take me there &rarr;</button>
           </div>`;
      } else {
        follow = `<div class="qz-rec-follow">
             <label>Corrected value</label>
             <input type="text" id="qzRecFix-${r.id}-${row.id}" value="${escAttr(d.value || '')}" placeholder="Type it exactly as the governing source shows it">
             ${wrong ? '<div class="qz-rv-subfeedback bad">&#10007; That does not match the governing source.</div>' : ''}
             <button type="button" class="qz-btn sm primary" onclick="qzRecSaveRowValue('${r.id}','${row.id}')">Save</button>
           </div>`;
      }
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
  const heading = popup && answered ? '' : `<div class="qz-rec-decide-h">What should happen with this field?</div>`;
  return `<div class="qz-rec-decide">${heading}${actions}${follow}</div>`;
}
function qzRecClearDecision(id, rowId) {
  if (qzRecExamMode(id)) return;
  delete qzRecGet(id).decisions[rowId];
  qzSave();
  qzRenderRoot();
  qzSyncReconcileStep(id);
}
function qzRecItemHTML(id, popup) {
  const r = qzRecLookup(id);
  if (!r) return '';
  const st = qzRecGet(id);
  const examMode = qzRecExamMode(id);
  const done = !!st.resolvedAt;

  const docBtns = r.docs.map(d => {
    if (st.opened[d.id]) {
      return `<button type="button" class="qz-btn sm opened" data-rec-doc="${escAttr(d.id)}" onclick="qzRecOpenDoc('${id}','${d.id}')">&#10003; ${esc(d.title)}</button>`;
    }
    const rowId = examMode ? null : qzRecDocRowId(r, d.id);
    if (rowId != null) {
      return `<button type="button" class="qz-btn sm primary" data-rec-doc="${escAttr(d.id)}" onclick="qzRecGoDoc('${id}','${d.id}')">Find ${esc(d.title)} in Documents &rarr;</button>`;
    }
    return `<button type="button" class="qz-btn sm" data-rec-doc="${escAttr(d.id)}" onclick="qzRecOpenDoc('${id}','${d.id}')">${esc(d.title)}</button>`;
  }).join('');
  const allOpen = qzRecAllDocsOpened(id);

  let head;
  if (popup && allOpen) {
    head = `<div class="qz-rec-step done" data-rec-phase="1">
      <div class="qz-rv-step-h">Step 1 &middot; Sources opened &#10003;</div>
    </div>`;
  } else {
    head = `<div class="qz-rec-step ${allOpen ? 'done' : 'active'}" data-rec-phase="1">
      <div class="qz-rv-step-h">Step 1 &middot; Open every source</div>
      <div class="qz-rec-docs">${docBtns}</div>
      ${allOpen ? '' : '<div class="qz-rec-locked">All of them. You cannot reconcile sources you have not read.</div>'}
    </div>`;
  }

  let cards = '';
  if (allOpen && !done) {
    let foundActive = false;
    let doneCount = 0;
    const total = r.rows.length;
    cards = r.rows.map(row => {
      const settled = qzRecRowSettled(id, row.id);
      if (settled) { doneCount++; }
      let cls = '';
      if (settled) { cls = 'done'; }
      else if (!foundActive) { cls = 'active'; foundActive = true; }
      if (popup && cls !== 'active') return '';
      const cellsDone = qzRecRowCellsDone(id, row.id);
      const progress = popup && total > 1 ? `<span class="qz-rec-progress">${doneCount + 1} of ${total}</span>` : '';
      let cellLines, decideHTML;
      if (popup && cellsDone) {
        cellLines = '';
        decideHTML = `<div class="qz-rec-card-decide">${qzRecRowDecisionHTML(r, row, examMode, true)}</div>`;
      } else {
        cellLines = r.docs.map(d => {
          const cell = row.cells.find(c => c.docId === d.id);
          if (!cell) return '';
          return `<div class="qz-rec-field-row">
            <div class="qz-rec-field-label">${esc(d.short || d.title)}</div>
            <div class="qz-rec-field-input">${qzRecCellHTML(r, row, cell, examMode)}</div>
          </div>`;
        }).join('');
        decideHTML = popup ? '' : `<div class="qz-rec-card-decide">${qzRecRowDecisionHTML(r, row, examMode)}</div>`;
      }
      return `<div class="qz-rec-card ${cls}" data-rec-row="${escAttr(row.id)}">
        <div class="qz-rec-card-head">
          <b>${esc(row.label)}</b>${progress}
          ${row.onOrder ? `<span class="on-order">On the order: ${esc(row.onOrder)}</span>` : ''}
        </div>
        ${cellLines}
        ${decideHTML}
      </div>`;
    }).join('');
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
    ${head}${cards}${submit}${feedback}
  </div>`;
}

/* ============================================================================
   MECHANIC: `compose` — a written reply graded against a rubric
   ----------------------------------------------------------------------------
   qzSendReply used to accept any 20 characters, which made the communication lesson decorative:
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
  const key = qzScopedItemKey(id);
  if (!qzStore.composes[key]) qzStore.composes[key] = {};
  return qzStore.composes[key];
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
  const key = qzScopedItemKey(id);
  const prev = qzStore.composes[key] || qzStore.composes[id] || {};
  qzStore.composes[key] = { text: prev.text, everCorrect: !!prev.everCorrect };
  if (key !== id) qzStore.composes[id] = qzStore.composes[key];
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
  const key = qzScopedItemKey(id);
  const prev = qzStore.scenarios[key] || qzStore.scenarios[id] || {};
  const firstAttempt = prev.firstAttempt || { answered: idx, correct, ts: Date.now() };
  const rec = {
    answered: idx, correct, firstAttempt,
    everCorrect: !!prev.everCorrect || correct,
    practiced: prev.practiced || false
  };
  qzStore.scenarios[key] = rec;
  if (key !== id) qzStore.scenarios[id] = rec;
  qzSave();
  qzRenderRoot();
  qzNotifyScenarioAnswered(id, correct);
}
function qzRetakeScenario(id) {
  const key = qzScopedItemKey(id);
  const prev = qzStore.scenarios[key] || qzStore.scenarios[id] || {};
  const rec = {
    firstAttempt: prev.firstAttempt,
    everCorrect: !!prev.everCorrect,
    practiced: !!prev.practiced
  };
  qzStore.scenarios[key] = rec;
  if (key !== id) qzStore.scenarios[id] = rec;
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
   corrected a figure (the accounting scenario still said "$450.00" long after the verification lesson had
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
        ${(!walkActiveHere && r.correct && s.verifyDoc) ? `<button class="qz-btn" onclick="qzOpenDocFile('${s.verifyDoc.file}','${esc(s.verifyDoc.title)}')">${esc(s.verifyDoc.buttonLabel)}</button>` : ''}
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
  QZ_LESSONS.forEach(function (l) { l.steps.forEach(function (s) { s._lessonId = l.id; }); });
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
  qzHydrate();
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
