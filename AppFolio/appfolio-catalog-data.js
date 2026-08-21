/* ============================================================================
   APPFOLIO SIMULATOR — PORTFOLIO CATALOGUE (minimal seed)
   ============================================================================

   What this is
   ------------
   The property-management world the simulator displays: properties, units,
   leases, residents, ledgers, owners, work orders, vendors, applications, bank
   accounts and transactions.

   This is a SEED, not the world. Prompt 1/3 builds the contract; one property,
   two units, one lease and one resident are enough to prove the router renders,
   the three-layer access functions resolve, and afAuditIntegrity() has real
   references to check. Prompt 2/3 replaces this file wholesale with roughly a
   dozen properties and eighty-five units, generated deterministically.

   Read-only, always
   -----------------
   Nothing here is mutable. What a visitor creates or edits lives in afDemo as
   an override on top of this, which is what makes a page refresh wipe their
   work while leaving the portfolio intact. If mutable state ever leaks in here,
   reloading stops cleaning up and the next visitor inherits the last one's mess.

   Two conventions that are not negotiable
   ---------------------------------------
   MONEY IS CENTS, always, as an integer. $1,850.00 is 185000. Trust accounting
   does not survive floating point — 0.1 + 0.2 is not 0.3, and a security
   deposit that drifts by a cent is a real-world problem. Formatting happens
   only at the presentation layer, in afFmtMoney().

   DATES ARE ISO, always, and measured against AF_TODAY rather than the clock.
   Offsets are resolved at load through afcDay(), so the portfolio ages with the
   fixture date instead of rotting against it.
   ============================================================================ */


/* Day offsets resolved against AF_TODAY. Negative is the past.
   Defined here rather than imported because this file loads before the app —
   a catalogue that depends on load order breaks the day someone reorders two
   script tags. */
const AFC_EPOCH = (function () {
  const p = AF_TODAY.split('-').map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2]);
})();
function afcDay(offset) {
  return new Date(AFC_EPOCH + offset * 86400000).toISOString().slice(0, 10);
}


/* ---------------------------------------------------------------------------
   PROPERTIES
   Residential only — single-family, duplex, fourplex, apartment. No commercial,
   no HOA. managementFeePct is basis points of collected rent (800 = 8.00%),
   kept as an integer for the same reason money is.
   --------------------------------------------------------------------------- */
const AFC_PROPERTIES = [
  {
    id: 'PROP-1001',
    name: 'Willow Creek Duplex',
    address: '4218 Willow Creek Ln', city: 'Round Rock', state: 'TX', zip: '78664',
    county: 'Williamson',
    type: 'duplex',
    yearBuilt: 1998,
    unitCount: 2,
    ownerIds: ['OWN-2001'],
    managementFeePct: 800,
    photoSeed: 'willow-creek',
    status: 'active'
  }
];


/* ---------------------------------------------------------------------------
   UNITS — the spine of the module.
   A unit always exists: occupied or vacant, leased or not. Everything else in
   the model hangs off one. The seed deliberately carries one of each state so
   the occupancy logic has both branches to render.
   --------------------------------------------------------------------------- */
const AFC_UNITS = [
  {
    id: 'UNIT-1001A', propertyId: 'PROP-1001', label: 'A',
    beds: 3, baths: 2, sqft: 1420, marketRent: 195000,
    status: 'occupied',
    currentLeaseId: 'LEASE-3001',
    amenities: ['Washer/dryer hookups', 'Fenced yard', 'Single-car garage'],
    lastRenovated: afcDay(-864)
  },
  {
    id: 'UNIT-1001B', propertyId: 'PROP-1001', label: 'B',
    beds: 2, baths: 1, sqft: 1080, marketRent: 165000,
    status: 'vacant-ready',
    currentLeaseId: null,
    amenities: ['Washer/dryer hookups', 'Fenced yard'],
    lastRenovated: afcDay(-270)
  }
];


/* ---------------------------------------------------------------------------
   LEASES
   signatureStatus and signatures[] are native to AppFolio by design decision 3:
   the lease is signed inside this module with its own simulated e-signature.
   There is deliberately no coupling to the Docusign module.
   --------------------------------------------------------------------------- */
const AFC_LEASES = [
  {
    id: 'LEASE-3001',
    unitId: 'UNIT-1001A',
    residentIds: ['RES-4001'],
    startDate: afcDay(-227),
    endDate: afcDay(138),
    rentAmount: 189500,
    dueDay: 1,
    depositHeld: 189500,
    petDeposit: 30000,
    petRent: 3500,
    status: 'active',
    renewalOffered: false,
    moveInDate: afcDay(-227),
    moveOutDate: null,
    signatureStatus: 'executed',
    signatures: [
      { residentId: 'RES-4001', signedAt: afcDay(-232), method: 'electronic' }
    ]
  }
];


/* ---------------------------------------------------------------------------
   RESIDENTS
   assistanceAnimal is separate from pets[] on purpose: under fair housing an
   assistance animal is not a pet, cannot be charged pet rent, and cannot be
   refused on a no-pets policy. Prompt 3/3's lesson 8 turns on that distinction,
   so the data model has to be able to express it from the start.
   --------------------------------------------------------------------------- */
const AFC_RESIDENTS = [
  {
    id: 'RES-4001',
    firstName: 'Marisol', lastName: 'Vega',
    email: 'marisol.vega@example.com', phone: '555-0142',
    type: 'primary',
    moveInDate: afcDay(-227),
    portalActive: true,
    emergencyContact: { name: 'Hector Vega', phone: '555-0143', relationship: 'Brother' },
    vehicles: [{ make: 'Honda', model: 'CR-V', year: 2021, plate: 'TX-4RD812', color: 'Silver' }],
    pets: [{ name: 'Biscuit', type: 'Dog', breed: 'Beagle mix', weight: 24 }],
    assistanceAnimal: false
  }
];


/* ---------------------------------------------------------------------------
   LEDGER
   balanceAfter is stored rather than derived so a reversed entry keeps the
   history readable: the running balance a resident saw at the time is part of
   the record, not something to recompute from the current state of the world.
   --------------------------------------------------------------------------- */
const AFC_LEDGER_ENTRIES = [
  {
    id: 'LED-5001', leaseId: 'LEASE-3001', date: afcDay(-42),
    type: 'charge', category: 'rent', amount: 189500,
    memo: 'Monthly rent', balanceAfter: 189500,
    postedBy: 'system', reversedBy: null
  },
  {
    id: 'LED-5002', leaseId: 'LEASE-3001', date: afcDay(-41),
    type: 'payment', category: 'rent', amount: -189500,
    memo: 'Resident portal — ACH', balanceAfter: 0,
    postedBy: 'system', reversedBy: null
  },
  {
    id: 'LED-5003', leaseId: 'LEASE-3001', date: afcDay(-12),
    type: 'charge', category: 'rent', amount: 189500,
    memo: 'Monthly rent', balanceAfter: 189500,
    postedBy: 'system', reversedBy: null
  }
];


/* ---------------------------------------------------------------------------
   OWNERS
   reserveAmount is the cash the owner requires be held back before a
   distribution — the number that decides whether a draw can be run at all.
   --------------------------------------------------------------------------- */
const AFC_OWNERS = [
  {
    id: 'OWN-2001',
    name: 'Calloway Family Trust', type: 'entity',
    email: 'trust@calloway.example.com', phone: '555-0170',
    address: '918 Rio Grande St, Austin, TX 78701',
    taxId: '**-***4821',
    propertyIds: ['PROP-1001'],
    distributionMethod: 'ach',
    reserveAmount: 50000
  }
];


/* ---------------------------------------------------------------------------
   MAINTENANCE
   billTo is the field the module's accounting hinges on: the same repair
   charged to the owner or to the resident lands in different ledgers and
   different statements.
   --------------------------------------------------------------------------- */
const AFC_VENDORS = [
  {
    id: 'VEN-6001', name: 'Brazos Plumbing Co.', trade: 'plumbing',
    phone: '555-0188', email: 'dispatch@brazosplumbing.example.com',
    insuranceExpires: afcDay(212), w9OnFile: true, rating: 4.6, coiOnFile: true
  }
];

const AFC_WORK_ORDERS = [
  {
    id: 'WO-7001',
    unitId: 'UNIT-1001A', propertyId: 'PROP-1001',
    reportedBy: 'RES-4001', reportedDate: afcDay(-6),
    category: 'plumbing', priority: 'normal', status: 'assigned',
    description: 'Kitchen sink drains slowly; standing water after running the disposal.',
    vendorId: 'VEN-6001',
    scheduledDate: afcDay(1),
    completedDate: null,
    estimate: 18500, invoiceAmount: null,
    billTo: 'owner',
    entryNotice: true
  }
];


/* ---------------------------------------------------------------------------
   LEASING FUNNEL
   requestedAccommodation and adverseActionSent both exist because the fair
   housing and FCRA lessons in 3/3 are graded on them. A denial without an
   adverse action notice is a compliance failure, and the schema has to be able
   to represent that failure for the lesson to be able to teach it.
   --------------------------------------------------------------------------- */
const AFC_GUEST_CARDS = [
  {
    id: 'GC-8001', unitId: 'UNIT-1001B',
    name: 'Devon Pratt', email: 'devon.pratt@example.com', phone: '555-0155',
    source: 'Zillow', inquiryDate: afcDay(-4),
    status: 'toured',
    notes: 'Toured Saturday. Asked about the fence height and lawn care responsibility.'
  }
];

const AFC_APPLICATIONS = [
  {
    id: 'APP-9001',
    unitId: 'UNIT-1001B',
    applicantName: 'Devon Pratt', email: 'devon.pratt@example.com', phone: '555-0155',
    submittedDate: afcDay(-2),
    status: 'screening',
    monthlyIncome: 612000,
    employmentVerified: true,
    screening: { creditScore: 704, criminalFlags: 0, evictionFlags: 0, reportDate: afcDay(-1), agency: 'TransUnion SmartMove' },
    decision: null, decisionDate: null, adverseActionSent: false,
    requestedAccommodation: false
  }
];


/* ---------------------------------------------------------------------------
   TRUST ACCOUNTING
   Three account types, and the boundary between them is the whole point. Money
   in a trust account belongs to owners; money in a security-deposit account
   belongs to residents; only the operating account is the management company's.
   Moving cash across that line is the mistake the accounting lessons exist to
   prevent, so the model separates them at the schema level rather than by
   convention.
   --------------------------------------------------------------------------- */
const AFC_BANK_ACCOUNTS = [
  { id: 'ACCT-OP',  name: 'Operating — Frost Bank',        type: 'operating',        last4: '4417', balance: 1284350, lastReconciled: afcDay(-12) },
  { id: 'ACCT-TR',  name: 'Trust — Owner Funds',           type: 'trust',            last4: '9052', balance: 4176500, lastReconciled: afcDay(-12) },
  { id: 'ACCT-SD',  name: 'Security Deposits — Segregated', type: 'security-deposit', last4: '3388', balance: 219500, lastReconciled: afcDay(-12) }
];

const AFC_TRANSACTIONS = [
  {
    id: 'TXN-A001', accountId: 'ACCT-TR', date: afcDay(-41),
    type: 'receipt', amount: 189500,
    payee: 'Marisol Vega', propertyId: 'PROP-1001', leaseId: 'LEASE-3001',
    glAccount: '4000 · Rental Income', reference: 'ACH-88213',
    cleared: true, reconciledDate: afcDay(-12)
  },
  {
    id: 'TXN-A002', accountId: 'ACCT-TR', date: afcDay(-40),
    type: 'fee', amount: -15160,
    payee: 'Management fee', propertyId: 'PROP-1001', leaseId: null,
    glAccount: '5010 · Management Fee', reference: 'MF-2026-07',
    cleared: true, reconciledDate: afcDay(-12)
  },
  {
    id: 'TXN-A003', accountId: 'ACCT-SD', date: afcDay(-227),
    type: 'receipt', amount: 189500,
    payee: 'Marisol Vega', propertyId: 'PROP-1001', leaseId: 'LEASE-3001',
    glAccount: '2100 · Security Deposits Held', reference: 'DEP-3001',
    cleared: true, reconciledDate: afcDay(-198)
  }
];

const AFC_OWNER_STATEMENTS = [
  {
    id: 'STMT-B001', ownerId: 'OWN-2001',
    periodStart: afcDay(-42), periodEnd: afcDay(-12),
    income: 189500, expenses: 0, managementFee: 15160,
    netDistribution: 174340,
    status: 'sent'
  }
];


/* Tasks are the VA's own worklist rather than a product entity with a lifecycle
   of its own, so they carry only what a list needs. */
const AFC_TASKS = [
  {
    id: 'TASK-C001', title: 'Confirm plumber access for Willow Creek A',
    dueDate: afcDay(0), priority: 'normal', status: 'open',
    relatedType: 'workOrder', relatedId: 'WO-7001',
    assignedTo: 'va', notes: '24-hour entry notice already sent to the resident.'
  },
  {
    id: 'TASK-C002', title: 'Complete screening decision for Devon Pratt',
    dueDate: afcDay(1), priority: 'high', status: 'open',
    relatedType: 'application', relatedId: 'APP-9001',
    assignedTo: 'va', notes: 'Report is back. Income and employment already verified.'
  }
];
