/* ============================================================================
   APPFOLIO SIMULATOR — FULL PORTFOLIO CATALOGUE (Prompt 2/3: The World)
   ============================================================================

   ARCHITECTURE CONVENTION: TWO LAYERS (FIXTURE vs. BULK GENERATED)
   -----------------------------------------------------------------
   Two layers, and mixing them is the defect this file exists to prevent.
   ANCHOR entities are hand-written, id-stable and cited by the curriculum:
   changing one silently breaks a lesson in another file. Everything else is
   generated from a seed derived from its own id, so it can be regenerated at
   will and nothing outside this file depends on its exact values.

   CONVENTIONS:
   1. MONEY IS CENTS (integer, always). $1,850.00 is 185000.
   2. DATES ARE ISO and measured against AF_TODAY = '2026-08-12' via afcDay(offset).
   3. ZERO Math.random() and ZERO new Date() without arguments.
   4. DETERMINISM: Re-running this script produces an identical sha256 hash.
   ============================================================================ */

const AFC_TODAY = '2026-08-12';

const AFC_EPOCH = (function () {
  const p = AFC_TODAY.split('-').map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2]);
})();

function afcDay(offset) {
  return new Date(AFC_EPOCH + offset * 86400000).toISOString().slice(0, 10);
}

function afcHashString(s) {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function afcMulberry32(seed) {
  let a = (typeof seed === 'string' ? afcHashString(seed) : seed) >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================================
   1. OWNERS (18 Owners across 12 Properties)
   ============================================================================ */
const AFC_OWNERS = [
  /* ANCHOR: OWN-01 — Owner of PROP-01 (Single Family) & STMT-01 — DO NOT CHANGE */
  {
    id: 'OWN-01',
    name: 'Eleanor Vance',
    type: 'individual',
    email: 'eleanor.vance@example.com',
    phone: '555-0101',
    address: '1420 Legacy Dr, Plano, TX 75024',
    taxId: '***-**-4192',
    propertyIds: ['PROP-01'],
    bankAccount: { bank: 'Chase', routing: '111000614', account: '***4821' },
    drawPreference: 'ach',
    reserveCents: 50000
  },
  /* ANCHOR: OWN-02 — Owner of PROP-02 (Single Family, DQ-09) — DO NOT CHANGE */
  {
    id: 'OWN-02',
    name: 'Richard Sterling',
    type: 'individual',
    email: 'r.sterling@example.com',
    phone: '555-0102',
    address: '3904 Preston Rd, Frisco, TX 75034',
    taxId: '***-**-8831',
    propertyIds: ['PROP-02'],
    bankAccount: { bank: 'Wells Fargo', routing: '111900659', account: '***9932' },
    drawPreference: 'ach',
    reserveCents: 50000
  },
  {
    id: 'OWN-03',
    name: 'Robert & Katherine Miller',
    type: 'individual',
    email: 'miller.family@example.com',
    phone: '555-0103',
    address: '880 Eldorado Pkwy, McKinney, TX 75070',
    taxId: '***-**-6623',
    propertyIds: ['PROP-03'],
    bankAccount: { bank: 'Bank of America', routing: '111000012', account: '***3314' },
    drawPreference: 'ach',
    reserveCents: 50000
  },
  /* Co-ownership 1: PROP-04 (50% / 50%) */
  {
    id: 'OWN-04',
    name: 'David Chen',
    type: 'individual',
    email: 'david.chen@example.com',
    phone: '555-0104',
    address: '2200 Bethany Dr, Allen, TX 75013',
    taxId: '***-**-1198',
    propertyIds: ['PROP-04'],
    bankAccount: { bank: 'Chase', routing: '111000614', account: '***7721' },
    drawPreference: 'ach',
    reserveCents: 25000
  },
  {
    id: 'OWN-05',
    name: 'Michael Chen',
    type: 'individual',
    email: 'm.chen.invest@example.com',
    phone: '555-0105',
    address: '2204 Bethany Dr, Allen, TX 75013',
    taxId: '***-**-1199',
    propertyIds: ['PROP-04'],
    bankAccount: { bank: 'Chase', routing: '111000614', account: '***7722' },
    drawPreference: 'ach',
    reserveCents: 25000
  },
  /* ANCHOR: OWN-06 — Harold Finch (OWN-TRUST-01 Fiduciary Boundary) — DO NOT CHANGE */
  {
    id: 'OWN-06',
    name: 'Harold Finch',
    type: 'individual',
    email: 'finch.holdings@example.com',
    phone: '555-0106',
    address: '7720 Tennyson Pkwy, Plano, TX 75024',
    taxId: '***-**-9014',
    propertyIds: ['PROP-05'],
    bankAccount: { bank: 'Frost Bank', routing: '114000093', account: '***5501' },
    drawPreference: 'ach',
    reserveCents: 100000
  },
  {
    id: 'OWN-07',
    name: 'Stonebridge Partners LP',
    type: 'entity',
    email: 'mgmt@stonebridgepartners.example.com',
    phone: '555-0107',
    address: '500 Stonebridge Dr, McKinney, TX 75072',
    taxId: 'XX-XXX7812',
    propertyIds: ['PROP-06'],
    bankAccount: { bank: 'Comerica', routing: '111000753', account: '***8820' },
    drawPreference: 'ach',
    reserveCents: 50000
  },
  {
    id: 'OWN-08',
    name: 'Coit Residential LLC',
    type: 'entity',
    email: 'coit.res@example.com',
    phone: '555-0108',
    address: '1800 Coit Rd, Plano, TX 75075',
    taxId: 'XX-XXX4490',
    propertyIds: ['PROP-07'],
    bankAccount: { bank: 'Chase', routing: '111000614', account: '***3310' },
    drawPreference: 'ach',
    reserveCents: 75000
  },
  /* Co-ownership 2: PROP-08 (60% / 40%) */
  {
    id: 'OWN-09',
    name: 'Arthur Pendelton',
    type: 'individual',
    email: 'art.pendelton@example.com',
    phone: '555-0109',
    address: '610 Virginia Pkwy, McKinney, TX 75069',
    taxId: '***-**-3341',
    propertyIds: ['PROP-08'],
    bankAccount: { bank: 'Wells Fargo', routing: '111900659', account: '***1149' },
    drawPreference: 'ach',
    reserveCents: 45000
  },
  {
    id: 'OWN-10',
    name: 'Beatrice Pendelton',
    type: 'individual',
    email: 'bea.pendelton@example.com',
    phone: '555-0110',
    address: '610 Virginia Pkwy, McKinney, TX 75069',
    taxId: '***-**-3342',
    propertyIds: ['PROP-08'],
    bankAccount: { bank: 'Wells Fargo', routing: '111900659', account: '***1150' },
    drawPreference: 'ach',
    reserveCents: 30000
  },
  {
    id: 'OWN-11',
    name: 'Alma Properties LLC',
    type: 'entity',
    email: 'accounts@almaprop.example.com',
    phone: '555-0111',
    address: '4420 Alma Dr, Plano, TX 75023',
    taxId: 'XX-XXX8819',
    propertyIds: ['PROP-09'],
    bankAccount: { bank: 'Chase', routing: '111000614', account: '***2288' },
    drawPreference: 'ach',
    reserveCents: 75000
  },
  /* Co-ownership 3: PROP-10 (70% / 30%) */
  {
    id: 'OWN-12',
    name: 'Parkwood Investment Group LLC',
    type: 'entity',
    email: 'invest@parkwoodgrp.example.com',
    phone: '555-0112',
    address: '3000 Parkwood Blvd, Frisco, TX 75034',
    taxId: 'XX-XXX9921',
    propertyIds: ['PROP-10'],
    bankAccount: { bank: 'Texas Capital Bank', routing: '111916326', account: '***4410' },
    drawPreference: 'ach',
    reserveCents: 105000
  },
  {
    id: 'OWN-13',
    name: 'Sandra Bullock Trust',
    type: 'entity',
    email: 'trustee@sbtrust.example.com',
    phone: '555-0113',
    address: '3020 Parkwood Blvd, Frisco, TX 75034',
    taxId: 'XX-XXX9922',
    propertyIds: ['PROP-10'],
    bankAccount: { bank: 'Texas Capital Bank', routing: '111916326', account: '***4412' },
    drawPreference: 'ach',
    reserveCents: 45000
  },
  /* Co-ownership 4: PROP-11 (Maplewood Commons, 60% / 40%) */
  {
    id: 'OWN-14',
    name: 'Maplewood Holdings LLC',
    type: 'entity',
    email: 'management@maplewoodholdings.example.com',
    phone: '555-0114',
    address: '2800 Maplewood Dr, Ste 100, Plano, TX 75074',
    taxId: 'XX-XXX1420',
    propertyIds: ['PROP-11'],
    bankAccount: { bank: 'Chase', routing: '111000614', account: '***6014' },
    drawPreference: 'ach',
    reserveCents: 300000
  },
  {
    id: 'OWN-15',
    name: 'Maplewood Equity Partners LLC',
    type: 'entity',
    email: 'equity@maplewoodequity.example.com',
    phone: '555-0115',
    address: '2800 Maplewood Dr, Ste 102, Plano, TX 75074',
    taxId: 'XX-XXX1421',
    propertyIds: ['PROP-11'],
    bankAccount: { bank: 'Chase', routing: '111000614', account: '***6015' },
    drawPreference: 'ach',
    reserveCents: 200000
  },
  /* Co-ownership 5: PROP-12 (Frisco Station Flats, 50% / 30% / 20%) */
  {
    id: 'OWN-16',
    name: 'Frisco Station Residential LLC',
    type: 'entity',
    email: 'partner1@friscostation.example.com',
    phone: '555-0116',
    address: '8200 Warren Pkwy, Frisco, TX 75034',
    taxId: 'XX-XXX9401',
    propertyIds: ['PROP-12'],
    bankAccount: { bank: 'Texas Capital Bank', routing: '111916326', account: '***9901' },
    drawPreference: 'ach',
    reserveCents: 500000
  },
  {
    id: 'OWN-17',
    name: 'North Texas Multifamily LLC',
    type: 'entity',
    email: 'partner2@northtexasmulti.example.com',
    phone: '555-0117',
    address: '8200 Warren Pkwy, Frisco, TX 75034',
    taxId: 'XX-XXX9402',
    propertyIds: ['PROP-12'],
    bankAccount: { bank: 'Texas Capital Bank', routing: '111916326', account: '***9902' },
    drawPreference: 'ach',
    reserveCents: 300000
  },
  {
    id: 'OWN-18',
    name: 'Lone Star Opportunity Fund LLC',
    type: 'entity',
    email: 'partner3@lsopportunity.example.com',
    phone: '555-0118',
    address: '8200 Warren Pkwy, Frisco, TX 75034',
    taxId: 'XX-XXX9403',
    propertyIds: ['PROP-12'],
    bankAccount: { bank: 'Frost Bank', routing: '114000093', account: '***9903' },
    drawPreference: 'ach',
    reserveCents: 200000
  }
];

/* ============================================================================
   2. PROPERTIES (12 Properties — 6 Single-Family, 3 Duplexes, 1 Fourplex, 2 Apts)
   ============================================================================ */
const AFC_PROPERTIES = [
  /* ANCHOR: PROP-01 — Single Family, Main St Frisco — DO NOT CHANGE */
  {
    id: 'PROP-01',
    name: '5445 Main Street Home',
    address: '5445 Main St', city: 'Frisco', state: 'TX', zip: '75034',
    county: 'Collin', type: 'single-family', yearBuilt: 2018,
    unitCount: 1, ownerIds: ['OWN-01'], ownerSplit: { 'OWN-01': 100 },
    managementFeePct: 800, // 8.00%
    lateFeePolicy: { initialCents: 5000, dailyCents: 1000, graceDays: 3 },
    operatingCashCents: 1842050,
    status: 'active'
  },
  /* ANCHOR: PROP-02 — Single Family, Preston Rd Plano (DQ-09) — DO NOT CHANGE */
  {
    id: 'PROP-02',
    name: '3210 Preston Road Residence',
    address: '3210 Preston Rd', city: 'Plano', state: 'TX', zip: '75093',
    county: 'Collin', type: 'single-family', yearBuilt: 2015,
    unitCount: 1, ownerIds: ['OWN-02'], ownerSplit: { 'OWN-02': 100 },
    managementFeePct: 800,
    lateFeePolicy: { initialCents: 5000, dailyCents: 1000, graceDays: 3 },
    operatingCashCents: 1215000,
    status: 'active'
  },
  {
    id: 'PROP-03',
    name: '7820 Eldorado Parkway Home',
    address: '7820 Eldorado Pkwy', city: 'McKinney', state: 'TX', zip: '75070',
    county: 'Collin', type: 'single-family', yearBuilt: 2016,
    unitCount: 1, ownerIds: ['OWN-03'], ownerSplit: { 'OWN-03': 100 },
    managementFeePct: 800,
    lateFeePolicy: { initialCents: 5000, dailyCents: 1000, graceDays: 3 },
    operatingCashCents: 984000,
    status: 'active'
  },
  {
    id: 'PROP-04',
    name: '1402 Bethany Drive Home',
    address: '1402 Bethany Dr', city: 'Allen', state: 'TX', zip: '75013',
    county: 'Collin', type: 'single-family', yearBuilt: 2019,
    unitCount: 1, ownerIds: ['OWN-04', 'OWN-05'], ownerSplit: { 'OWN-04': 50, 'OWN-05': 50 },
    managementFeePct: 800,
    lateFeePolicy: { initialCents: 5000, dailyCents: 1000, graceDays: 3 },
    operatingCashCents: 1420000,
    status: 'active'
  },
  /* ANCHOR: PROP-05 — Legacy Drive Home (Harold Finch / LEASE-MO-01) — DO NOT CHANGE */
  {
    id: 'PROP-05',
    name: '910 Legacy Drive Home',
    address: '910 Legacy Dr', city: 'Plano', state: 'TX', zip: '75024',
    county: 'Collin', type: 'single-family', yearBuilt: 2017,
    unitCount: 1, ownerIds: ['OWN-06'], ownerSplit: { 'OWN-06': 100 },
    managementFeePct: 800,
    lateFeePolicy: { initialCents: 5000, dailyCents: 1000, graceDays: 3 },
    operatingCashCents: 820000,
    status: 'active'
  },
  {
    id: 'PROP-06',
    name: '2100 Stonebridge Drive Home',
    address: '2100 Stonebridge Dr', city: 'McKinney', state: 'TX', zip: '75072',
    county: 'Collin', type: 'single-family', yearBuilt: 2020,
    unitCount: 1, ownerIds: ['OWN-07'], ownerSplit: { 'OWN-07': 100 },
    managementFeePct: 800,
    lateFeePolicy: { initialCents: 5000, dailyCents: 1000, graceDays: 3 },
    operatingCashCents: 550000,
    status: 'active'
  },
  {
    id: 'PROP-07',
    name: '1804 Coit Road Duplex',
    address: '1804 Coit Rd', city: 'Plano', state: 'TX', zip: '75075',
    county: 'Collin', type: 'duplex', yearBuilt: 2004,
    unitCount: 2, ownerIds: ['OWN-08'], ownerSplit: { 'OWN-08': 100 },
    managementFeePct: 750, // 7.50%
    lateFeePolicy: { initialCents: 5000, dailyCents: 1000, graceDays: 3 },
    operatingCashCents: 715000,
    status: 'active'
  },
  {
    id: 'PROP-08',
    name: '620 Virginia Parkway Duplex',
    address: '620 Virginia Pkwy', city: 'McKinney', state: 'TX', zip: '75069',
    county: 'Collin', type: 'duplex', yearBuilt: 2006,
    unitCount: 2, ownerIds: ['OWN-09', 'OWN-10'], ownerSplit: { 'OWN-09': 60, 'OWN-10': 40 },
    managementFeePct: 750,
    lateFeePolicy: { initialCents: 5000, dailyCents: 1000, graceDays: 3 },
    operatingCashCents: 680000,
    status: 'active'
  },
  {
    id: 'PROP-09',
    name: '4400 Alma Drive Duplex',
    address: '4400 Alma Dr', city: 'Plano', state: 'TX', zip: '75023',
    county: 'Collin', type: 'duplex', yearBuilt: 2008,
    unitCount: 2, ownerIds: ['OWN-11'], ownerSplit: { 'OWN-11': 100 },
    managementFeePct: 750,
    lateFeePolicy: { initialCents: 5000, dailyCents: 1000, graceDays: 3 },
    operatingCashCents: 890000,
    status: 'active'
  },
  {
    id: 'PROP-10',
    name: 'Parkwood Fourplex',
    address: '3050 Parkwood Blvd', city: 'Frisco', state: 'TX', zip: '75034',
    county: 'Collin', type: 'fourplex', yearBuilt: 2012,
    unitCount: 4, ownerIds: ['OWN-12', 'OWN-13'], ownerSplit: { 'OWN-12': 70, 'OWN-13': 30 },
    managementFeePct: 700, // 7.00%
    lateFeePolicy: { initialCents: 5000, dailyCents: 1000, graceDays: 3 },
    operatingCashCents: 1190000,
    status: 'active'
  },
  /* ANCHOR: PROP-11 — Maplewood Commons (24 Units Apartment) — DO NOT CHANGE */
  {
    id: 'PROP-11',
    name: 'Maplewood Commons Apartments',
    address: '2800 Maplewood Dr', city: 'Plano', state: 'TX', zip: '75074',
    county: 'Collin', type: 'apartment', yearBuilt: 2014,
    unitCount: 24, ownerIds: ['OWN-14', 'OWN-15'], ownerSplit: { 'OWN-14': 60, 'OWN-15': 40 },
    managementFeePct: 600, // 6.00%
    lateFeePolicy: { initialCents: 5000, dailyCents: 1000, graceDays: 3 },
    operatingCashCents: 4420000,
    status: 'active'
  },
  /* ANCHOR: PROP-12 — Frisco Station Flats (45 Units Apartment) — DO NOT CHANGE */
  {
    id: 'PROP-12',
    name: 'Frisco Station Flats',
    address: '8200 Warren Pkwy', city: 'Frisco', state: 'TX', zip: '75034',
    county: 'Collin', type: 'apartment', yearBuilt: 2019,
    unitCount: 45, ownerIds: ['OWN-16', 'OWN-17', 'OWN-18'], ownerSplit: { 'OWN-16': 50, 'OWN-17': 30, 'OWN-18': 20 },
    managementFeePct: 550, // 5.50%
    lateFeePolicy: { initialCents: 5000, dailyCents: 1000, graceDays: 3 },
    operatingCashCents: 7850000,
    status: 'active'
  }
];

/* ============================================================================
   3. VENDORS (14 Vendors, including 2 with expired insurance)
   ============================================================================ */
const AFC_VENDORS = [
  {
    id: 'VEND-01',
    name: 'Lone Star HVAC Services',
    trade: 'hvac',
    contact: 'Mark Davis', phone: '555-0201', email: 'service@lonestarhvac.example.com',
    insuranceExpires: afcDay(140), // Active
    w9OnFile: true, paymentTerms: 'net-30', rating: 4.8
  },
  {
    id: 'VEND-02',
    name: 'DFW Master Plumbing',
    trade: 'plumbing',
    contact: 'James Thornton', phone: '555-0202', email: 'dispatch@dfwplumbing.example.com',
    insuranceExpires: afcDay(95), // Active
    w9OnFile: true, paymentTerms: 'net-30', rating: 4.9
  },
  {
    id: 'VEND-03',
    name: 'Texas Spark Electric',
    trade: 'electrical',
    contact: 'Carlos Ray', phone: '555-0203', email: 'carlos@txspark.example.com',
    insuranceExpires: afcDay(210), // Active
    w9OnFile: true, paymentTerms: 'net-30', rating: 4.7
  },
  {
    id: 'VEND-04',
    name: 'North Texas Appliance Repair',
    trade: 'appliances',
    contact: 'Steve Miller', phone: '555-0204', email: 'repairs@ntxappliance.example.com',
    insuranceExpires: afcDay(60), // Active
    w9OnFile: true, paymentTerms: 'net-15', rating: 4.6
  },
  {
    id: 'VEND-05',
    name: 'GreenThumb Landscaping & Lawn',
    trade: 'landscaping',
    contact: 'Hector Morales', phone: '555-0205', email: 'hector@greenthumb.example.com',
    insuranceExpires: afcDay(180), // Active
    w9OnFile: true, paymentTerms: 'net-30', rating: 4.9
  },
  {
    id: 'VEND-06',
    name: 'Sparkling Clean Turn Services',
    trade: 'cleaning',
    contact: 'Ana Silva', phone: '555-0206', email: 'ana@sparklingturn.example.com',
    insuranceExpires: afcDay(45), // Active
    w9OnFile: true, paymentTerms: 'due-on-receipt', rating: 4.8
  },
  {
    id: 'VEND-07',
    name: 'SafeKey Lock & Key',
    trade: 'locksmith',
    contact: 'Brian Kelly', phone: '555-0207', email: 'brian@safekey.example.com',
    insuranceExpires: afcDay(300), // Active
    w9OnFile: true, paymentTerms: 'due-on-receipt', rating: 5.0
  },
  /* ANCHOR: VEND-08 — Lone Star Roofing (insuranceExpires EXPIRED 15 days ago) — DO NOT CHANGE */
  {
    id: 'VEND-08',
    name: 'Lone Star Roofing & Gutters',
    trade: 'roofing',
    contact: 'Dale Hawkins', phone: '555-0208', email: 'dale@lonestarroof.example.com',
    insuranceExpires: afcDay(-15), // EXPIRED 15 days ago
    w9OnFile: true, paymentTerms: 'net-30', rating: 4.2
  },
  {
    id: 'VEND-09',
    name: 'Plano Pest Solutions',
    trade: 'pest-control',
    contact: 'Gary Cooper', phone: '555-0209', email: 'gary@planopest.example.com',
    insuranceExpires: afcDay(110), // Active
    w9OnFile: true, paymentTerms: 'net-30', rating: 4.7
  },
  {
    id: 'VEND-10',
    name: 'All-Star Drywall & Paint',
    trade: 'painting',
    contact: 'Leo Rivera', phone: '555-0210', email: 'leo@allstarpaint.example.com',
    insuranceExpires: afcDay(75), // Active
    w9OnFile: true, paymentTerms: 'net-15', rating: 4.6
  },
  {
    id: 'VEND-11',
    name: 'DFW Garage Door Pros',
    trade: 'garage-doors',
    contact: 'Tim Sanders', phone: '555-0211', email: 'tim@dfwgaragedoor.example.com',
    insuranceExpires: afcDay(190), // Active
    w9OnFile: true, paymentTerms: 'net-30', rating: 4.5
  },
  {
    id: 'VEND-12',
    name: 'Premier Pool & Spa Care',
    trade: 'pool',
    contact: 'Ryan O\'Connor', phone: '555-0212', email: 'ryan@premierpool.example.com',
    insuranceExpires: afcDay(130), // Active
    w9OnFile: true, paymentTerms: 'net-30', rating: 4.9
  },
  {
    id: 'VEND-13',
    name: 'ClearFlow Drain Cleaning',
    trade: 'plumbing',
    contact: 'Sam Bennett', phone: '555-0213', email: 'sam@clearflow.example.com',
    insuranceExpires: afcDay(80), // Active
    w9OnFile: true, paymentTerms: 'due-on-receipt', rating: 4.8
  },
  /* ANCHOR: VEND-14 — Lone Star Carpet (insuranceExpires EXPIRED 45 days ago) — DO NOT CHANGE */
  {
    id: 'VEND-14',
    name: 'Lone Star Carpet & Flooring',
    trade: 'flooring',
    contact: 'Victor Ortiz', phone: '555-0214', email: 'victor@lonestarfloors.example.com',
    insuranceExpires: afcDay(-45), // EXPIRED 45 days ago
    w9OnFile: true, paymentTerms: 'net-30', rating: 4.1
  }
];

/* ============================================================================
   4. BANK ACCOUNTS (3 Accounts: Operating, Trust, Security Deposit)
   ============================================================================ */
const AFC_BANK_ACCOUNTS = [
  {
    id: 'BANK-01',
    name: 'Operating Account',
    type: 'operating',
    bankName: 'JPMorgan Chase Bank, N.A.',
    routingNumber: '111000614',
    accountNumber: '482910482',
    glCode: '1010-00',
    currentBalanceCents: 38450000 // $384,500.00
  },
  {
    id: 'BANK-02',
    name: 'Owner Trust Escrow Account',
    type: 'trust',
    bankName: 'Texas Capital Bank',
    routingNumber: '111916326',
    accountNumber: '771290341',
    glCode: '1020-00',
    currentBalanceCents: 21580000 // $215,800.00
  },
  {
    id: 'BANK-03',
    name: 'Security Deposit Escrow Account',
    type: 'security-deposit',
    bankName: 'Frost Bank',
    routingNumber: '114000093',
    accountNumber: '930419203',
    glCode: '1030-00',
    currentBalanceCents: 11455000 // Exact sum of all active deposits (calculated in seed)
  }
];

/* ============================================================================
   5. COMPLETE DETERMINISTIC PORTFOLIO BUILDER
   ============================================================================ */

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Edward', 'Deborah', 'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon',
  'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
  'Nicholas', 'Shirley', 'Eric', 'Angela', 'Jonathan', 'Helen', 'Stephen', 'Anna'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey'
];

function afBuildCompletePortfolio() {
  const units = [];
  const leases = [];
  const residents = [];
  const ledgerEntries = [];
  const workOrders = [];
  const guestCards = [];
  const applications = [];
  const transactions = [];
  const ownerStatements = [];
  const tasks = [];

  let leaseSeq = 1;
  let resSeq = 1;
  let ledgerSeq = 1;
  let woSeq = 1;
  let totalDepositHeld = 0;

  // 1. Generate Units across all 12 Properties
  AFC_PROPERTIES.forEach(function (prop) {
    const count = prop.unitCount;
    for (let i = 1; i <= count; i++) {
      let unitId, label, beds, baths, sqft, rent;
      if (prop.type === 'single-family') {
        unitId = 'UNIT-' + prop.id.slice(5) + '-01';
        label = 'Single Family';
        beds = prop.id === 'PROP-01' ? 4 : (prop.id === 'PROP-02' ? 3 : (prop.id === 'PROP-03' ? 3 : 4));
        baths = prop.id === 'PROP-01' ? 2.5 : (prop.id === 'PROP-02' ? 2 : 2.5);
        sqft = 2200 + (i * 100);
        rent = prop.id === 'PROP-01' ? 265000 : (prop.id === 'PROP-02' ? 240000 : (prop.id === 'PROP-03' ? 255000 : (prop.id === 'PROP-04' ? 285000 : (prop.id === 'PROP-05' ? 290000 : 275000))));
      } else if (prop.type === 'duplex') {
        label = i === 1 ? 'A' : 'B';
        unitId = 'UNIT-' + prop.id.slice(5) + '-' + label;
        beds = 2; baths = 2; sqft = 1250;
        rent = prop.id === 'PROP-07' ? 175000 : (prop.id === 'PROP-08' ? 180000 : 165000);
      } else if (prop.type === 'fourplex') {
        label = (i <= 2 ? '10' : '20') + i;
        unitId = 'UNIT-10-' + label;
        beds = 2; baths = 1; sqft = 950;
        rent = 155000;
      } else if (prop.id === 'PROP-11') { // Maplewood Commons (24 units)
        const floor = Math.floor((i - 1) / 8) + 1;
        const num = ((i - 1) % 8) + 1;
        label = floor + '0' + num;
        unitId = 'UNIT-11-' + label;
        const is2B = num % 2 === 0;
        beds = is2B ? 2 : 1; baths = is2B ? 2 : 1;
        sqft = is2B ? 1050 : 720;
        rent = is2B ? 155000 : 125000;
      } else { // Frisco Station Flats (45 units)
        const floor = Math.floor((i - 1) / 15) + 1;
        const num = ((i - 1) % 15) + 1;
        label = floor + (num < 10 ? '0' : '') + num;
        unitId = 'UNIT-12-' + label;
        const typeMod = num % 3;
        beds = typeMod === 0 ? 2 : (typeMod === 1 ? 0 : 1);
        baths = typeMod === 0 ? 2 : 1;
        sqft = typeMod === 0 ? 1120 : (typeMod === 1 ? 540 : 780);
        rent = typeMod === 0 ? 165000 : (typeMod === 1 ? 110000 : 135000);
      }

      // Vacancy assignment (13 vacant units total: 8 vacant-ready, 3 vacant-rehab, 2 notice)
      let status = 'occupied';
      if (unitId === 'UNIT-06-01' || unitId === 'UNIT-10-101' || unitId === 'UNIT-11-104' || unitId === 'UNIT-11-208' ||
          unitId === 'UNIT-12-102' || unitId === 'UNIT-12-110' || unitId === 'UNIT-12-205' || unitId === 'UNIT-12-312') {
        status = 'vacant-ready';
      } else if (unitId === 'UNIT-08-B' || unitId === 'UNIT-11-306' || unitId === 'UNIT-12-214') {
        status = 'vacant-rehab';
      } else if (unitId === 'UNIT-11-202' || unitId === 'UNIT-12-308') {
        status = 'notice';
      }

      units.push({
        id: unitId,
        propertyId: prop.id,
        label: label,
        beds: beds,
        baths: baths,
        sqft: sqft,
        marketRent: rent,
        status: status,
        currentLeaseId: null, // Linked below if occupied
        amenities: ['Central HVAC', 'Refrigerator', 'Range/Oven', 'Dishwasher'],
        lastRenovated: afcDay(-300 - (i * 12))
      });
    }
  });

  // 2. Build 72 Active Leases + Residents + 12-Month Ledgers
  const occupiedUnits = units.filter(u => u.status === 'occupied');

  occupiedUnits.forEach(function (u, uIdx) {
    const rnd = afcMulberry32(u.id);
    const fName = FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)];
    const lName = LAST_NAMES[Math.floor(rnd() * LAST_NAMES.length)];
    const isPetAnchor = (u.id === 'UNIT-11-102'); // RES-PET-01
    const isRenewalAnchor = (u.id === 'UNIT-12-201'); // LEASE-REN-01

    const resId = isPetAnchor ? 'RES-PET-01' : ('RES-' + String(resSeq++).padStart(4, '0'));
    const leaseId = isRenewalAnchor ? 'LEASE-REN-01' : ('LEASE-' + String(leaseSeq++).padStart(4, '0'));

    u.currentLeaseId = leaseId;

    const res = {
      id: resId,
      name: isPetAnchor ? 'Marcus Vance' : (fName + ' ' + lName),
      email: isPetAnchor ? 'marcus.vance@example.com' : (fName.toLowerCase() + '.' + lName.toLowerCase() + '@example.com'),
      phone: isPetAnchor ? '555-0142' : ('555-01' + String(10 + (uIdx % 89))),
      propertyId: u.propertyId,
      unitId: u.id,
      leaseId: leaseId,
      emergencyContact: { name: 'Emergency Contact', phone: '555-0199', relation: 'Family' },
      vehicles: [{ make: 'Toyota', model: 'Camry', plate: 'TX-ABC' + (100 + uIdx) }]
    };
    residents.push(res);

    const startOffset = -365 + (uIdx % 60);
    const endOffset = startOffset + 365;
    const depositCents = u.marketRent;

    // Check if this lease is one of the 9 Delinquency Anchors (DQ-01 to DQ-09)
    let isDelinquent = false;
    let dqAnchorId = null;
    let dqPastDueMonths = 0;
    let dqLateFee = 0;

    if (u.id === 'UNIT-11-105') { isDelinquent = true; dqAnchorId = 'DQ-01'; dqPastDueMonths = 1; dqLateFee = 5000; }
    else if (u.id === 'UNIT-12-104') { isDelinquent = true; dqAnchorId = 'DQ-02'; dqPastDueMonths = 1; dqLateFee = 5000; }
    else if (u.id === 'UNIT-10-102') { isDelinquent = true; dqAnchorId = 'DQ-03'; dqPastDueMonths = 0.5; dqLateFee = 0; }
    else if (u.id === 'UNIT-11-206') { isDelinquent = true; dqAnchorId = 'DQ-04'; dqPastDueMonths = 2; dqLateFee = 10000; }
    else if (u.id === 'UNIT-12-210') { isDelinquent = true; dqAnchorId = 'DQ-05'; dqPastDueMonths = 1.2; dqLateFee = 5000; }
    else if (u.id === 'UNIT-07-A') { isDelinquent = true; dqAnchorId = 'DQ-06'; dqPastDueMonths = 1; dqLateFee = 5000; }
    else if (u.id === 'UNIT-11-304') { isDelinquent = true; dqAnchorId = 'DQ-07'; dqPastDueMonths = 2.5; dqLateFee = 15000; }
    else if (u.id === 'UNIT-12-302') { isDelinquent = true; dqAnchorId = 'DQ-08'; dqPastDueMonths = 2; dqLateFee = 10000; }
    else if (u.id === 'UNIT-02-01') { isDelinquent = true; dqAnchorId = 'DQ-09'; dqPastDueMonths = 3; dqLateFee = 15000; }


    const lease = {
      id: leaseId,
      unitId: u.id,
      residentIds: [resId],
      startDate: afcDay(startOffset),
      endDate: isRenewalAnchor ? afcDay(47) : afcDay(endOffset),
      rentAmount: u.marketRent,
      dueDay: 1,
      depositHeld: depositCents,
      petDeposit: isPetAnchor ? 35000 : 0,
      petRent: isPetAnchor ? 3500 : 0,
      status: 'active',
      renewalOffered: isRenewalAnchor,
      moveInDate: afcDay(startOffset),
      moveOutDate: null,
      balanceCents: 0, // Computed from ledger below
      dqAnchorId: dqAnchorId
    };

    totalDepositHeld += depositCents;

    // Build 12-Month Ledger Entries Chain (M1 & M2 Invariants)
    let runningBalance = 0;

    for (let m = 11; m >= 0; m--) {
      const chargeDate = afcDay(-m * 30 - 11);
      const rentCharge = u.marketRent + (isPetAnchor ? 3500 : 0);

      // Rent Charge
      runningBalance += rentCharge;
      ledgerEntries.push({
        id: 'LEDGER-' + String(ledgerSeq++).padStart(5, '0'),
        leaseId: leaseId,
        date: chargeDate,
        type: 'charge',
        category: 'rent',
        description: 'Monthly Rent Charge',
        amount: rentCharge,
        balanceAfter: runningBalance
      });

      // Payment logic: Delinquent anchors skip recent payments
      let shouldPay = true;
      if (isDelinquent) {
        if (m === 0) shouldPay = false; // August unpaid
        if (dqPastDueMonths >= 2 && m === 1) shouldPay = false; // July unpaid
        if (dqPastDueMonths >= 3 && m === 2) shouldPay = false; // June unpaid
      }

      if (shouldPay) {
        const payDate = afcDay(-m * 30 - 8);
        runningBalance -= rentCharge;
        ledgerEntries.push({
          id: 'LEDGER-' + String(ledgerSeq++).padStart(5, '0'),
          leaseId: leaseId,
          date: payDate,
          type: 'payment',
          category: 'rent-payment',
          description: 'Resident Portal Online Payment (ACH)',
          amount: rentCharge,
          balanceAfter: runningBalance
        });
      } else if (dqLateFee > 0 && m === 0) {
        // Apply late fee charge
        runningBalance += dqLateFee;
        ledgerEntries.push({
          id: 'LEDGER-' + String(ledgerSeq++).padStart(5, '0'),
          leaseId: leaseId,
          date: afcDay(-7),
          type: 'charge',
          category: 'late-fee',
          description: 'Late Fee Assessment (Past Due Rent)',
          amount: dqLateFee,
          balanceAfter: runningBalance
        });
      }
    }

    lease.balanceCents = runningBalance;
    leases.push(lease);
  });

  // Update Security Deposit Bank Account Balance (M4)
  AFC_BANK_ACCOUNTS.find(b => b.id === 'BANK-03').currentBalanceCents = totalDepositHeld;

  // 3. Hand-Crafted Specific Anchors (§6)

  /* ANCHOR: LEASE-MO-01 — Moved-Out Lease with 30-Day Texas Deposit Clock — DO NOT CHANGE */
  const moResident = {
    id: 'RES-MO-01',
    name: 'Samuel Oak',
    email: 'samuel.oak@example.com',
    phone: '555-0188',
    propertyId: 'PROP-05',
    unitId: 'UNIT-05-01',
    leaseId: 'LEASE-MO-01',
    emergencyContact: { name: 'Gary Oak', phone: '555-0189', relation: 'Grandson' }
  };
  residents.push(moResident);

  const moLease = {
    id: 'LEASE-MO-01',
    unitId: 'UNIT-05-01',
    residentIds: ['RES-MO-01'],
    startDate: afcDay(-387),
    endDate: afcDay(-22),
    rentAmount: 290000,
    dueDay: 1,
    depositHeld: 290000,
    petDeposit: 0,
    petRent: 0,
    status: 'past',
    renewalOffered: false,
    moveInDate: afcDay(-387),
    moveOutDate: afcDay(-22), // 22 days ago
    balanceCents: 0,
    depositAccounting: {
      depositHeldCents: 290000,
      deductions: [
        { description: 'Master Bedroom Carpet Replacement (Pet Damage)', amountCents: 65000 },
        { description: 'Deep Cleaning & Sanitization', amountCents: 22000 },
        { description: 'Drywall Patch & Touch-up Paint', amountCents: 18000 }
      ],
      refundDueCents: 185000,
      statutoryDeadlineDate: afcDay(8), // 30 days from move-out
      completed: false
    }
  };
  leases.push(moLease);

  // 4. Work Orders (~40 work orders across 6 states)
  /* ANCHOR: WO-ENTRY-01 — Work Order in Occupied Unit Without Entry Notice — DO NOT CHANGE */
  workOrders.push({
    id: 'WO-ENTRY-01',
    propertyId: 'PROP-11',
    unitId: 'UNIT-11-102',
    vendorId: 'VEND-02',
    reportedBy: 'RES-PET-01',
    category: 'plumbing',
    priority: 'normal',
    status: 'scheduled',
    title: 'Water Heater Annual Flush and Pressure Relief Valve Test',
    description: 'Routine annual maintenance on in-unit 50-gallon water heater.',
    entryNoticeSent: false,
    scheduledDate: afcDay(1),
    estimateCents: 18000,
    actualCents: 0,
    createdDate: afcDay(-3)
  });

  /* ANCHOR: WO-INS-01 — Work Order Assigned to Vendor with Expired Insurance — DO NOT CHANGE */
  workOrders.push({
    id: 'WO-INS-01',
    propertyId: 'PROP-04',
    unitId: 'UNIT-04-01',
    vendorId: 'VEND-08', // Expired insurance
    reportedBy: 'Alex Rivera',
    category: 'roofing',
    priority: 'normal',
    status: 'assigned',
    title: 'Roof Shingle Inspection & Gutter Cleanout',
    description: 'Annual inspection following spring storms. Inspect north flashing.',
    entryNoticeSent: true,
    scheduledDate: afcDay(3),
    estimateCents: 45000,
    actualCents: 0,
    createdDate: afcDay(-2)
  });

  // Bulk Work Orders across properties
  const WO_TITLES = [
    { cat: 'hvac', p: 'emergency', t: 'HVAC AC Unit Blowing Warm Air', v: 'VEND-01', est: 42000, s: 'in-progress' },
    { cat: 'plumbing', p: 'high', t: 'Kitchen Sink P-Trap Leak Under Cabinet', v: 'VEND-02', est: 18500, s: 'completed' },
    { cat: 'electrical', p: 'normal', t: 'Hallway GFCI Outlet Tripping', v: 'VEND-03', est: 12000, s: 'new' },
    { cat: 'appliances', p: 'normal', t: 'Dishwasher Not Draining at End of Cycle', v: 'VEND-04', est: 16000, s: 'assigned' },
    { cat: 'locksmith', p: 'emergency', t: 'Front Door Electronic Lock Deadbolt Malfunction', v: 'VEND-07', est: 15000, s: 'completed' },
    { cat: 'pest-control', p: 'low', t: 'Quarterly Preventive Pest Treatment', v: 'VEND-09', est: 8500, s: 'scheduled' },
    { cat: 'painting', p: 'low', t: 'Make-Ready Touchup Paint Living Room', v: 'VEND-10', est: 25000, s: 'completed' }
  ];

  for (let w = 1; w <= 38; w++) {
    const template = WO_TITLES[w % WO_TITLES.length];
    const targetUnit = units[(w * 2) % units.length];
    workOrders.push({
      id: 'WO-2026-' + String(100 + w).padStart(4, '0'),
      propertyId: targetUnit.propertyId,
      unitId: targetUnit.id,
      vendorId: template.v,
      reportedBy: targetUnit.status === 'occupied' ? 'Resident Portal' : 'Alex Rivera',
      category: template.cat,
      priority: template.p,
      status: template.s,
      title: template.t,
      description: template.t + ' - Reported via resident request ticket #' + (4000 + w),
      entryNoticeSent: true,
      scheduledDate: afcDay(- (w % 10)),
      estimateCents: template.est,
      actualCents: template.s === 'completed' ? template.est : 0,
      createdDate: afcDay(- (w % 20) - 2)
    });
  }

  // 5. Guest Cards (15) & Rental Applications (10)
  /* ANCHOR: GC-FH-01 — Familial Status Guest Card — DO NOT CHANGE */
  guestCards.push({
    id: 'GC-FH-01',
    name: 'Brenda Miller',
    email: 'brenda.m@example.com',
    phone: '555-0301',
    unitId: 'UNIT-11-104',
    propertyId: 'PROP-11',
    stage: 'inquiry',
    source: 'Zillow',
    createdDate: afcDay(-2),
    notes: 'Hi! Is this a quiet and safe building for small children? I am expecting a baby in November and want to make sure the neighbors are family-friendly.',
    showingDate: null
  });

  /* ANCHOR: GC-FH-02 — Vacancy Listing with Discriminatory Text — DO NOT CHANGE */
  guestCards.push({
    id: 'GC-FH-02',
    name: 'Marketing Listing Draft',
    email: 'marketing@lonestarpm.example.com',
    phone: '555-0302',
    unitId: 'UNIT-07-B',
    propertyId: 'PROP-07',
    stage: 'tour-scheduled',
    source: 'Website',
    createdDate: afcDay(-4),
    notes: 'Quiet duplex, perfect for an active young professional couple without dependents.',
    showingDate: afcDay(2)
  });

  // Bulk Guest Cards
  for (let g = 3; g <= 15; g++) {
    const targetUnit = units[(g * 5) % units.length];
    guestCards.push({
      id: 'GC-2026-' + String(g).padStart(3, '0'),
      name: FIRST_NAMES[g * 2] + ' ' + LAST_NAMES[g * 2],
      email: (FIRST_NAMES[g * 2].toLowerCase() + '@example.com'),
      phone: '555-03' + String(10 + g),
      unitId: targetUnit.id,
      propertyId: targetUnit.propertyId,
      stage: ['inquiry', 'contacted', 'tour-scheduled', 'toured', 'applied'][g % 5],
      source: ['Apartments.com', 'Zillow', 'Website', 'Drive-by', 'Referral'][g % 5],
      createdDate: afcDay(- (g * 2)),
      notes: 'Looking to move in around early September.',
      showingDate: g % 3 === 0 ? afcDay(1) : null
    });
  }

  /* ANCHOR: APP-FCRA-01 — Denied Application Requiring FCRA Adverse Action — DO NOT CHANGE */
  applications.push({
    id: 'APP-FCRA-01',
    name: 'Darren Hopkins',
    email: 'darren.hopkins@example.com',
    phone: '555-0341',
    propertyId: 'PROP-11',
    unitId: 'UNIT-11-204',
    monthlyIncomeCents: 320000,
    requestedMoveIn: afcDay(10),
    status: 'denied',
    createdDate: afcDay(-3),
    screening: {
      creditScore: 512,
      creditAgency: 'TransUnion Resident Screening Solutions',
      creditAgencyAddress: 'PO Box 800, Woodlyn, PA 19094 (800) 230-9376',
      backgroundCheck: 'Passed',
      evictionRecord: 'Clean',
      recommendation: 'Decline — Credit score below agency threshold (min 620)'
    },
    adverseActionSent: false,
    adverseActionSentDate: null
  });

  /* ANCHOR: APP-FCRA-02 — Conditional Approval with Prior Eviction Record — DO NOT CHANGE */
  applications.push({
    id: 'APP-FCRA-02',
    name: 'Clara Rodriguez',
    email: 'clara.r@example.com',
    phone: '555-0342',
    propertyId: 'PROP-12',
    unitId: 'UNIT-12-108',
    monthlyIncomeCents: 480000,
    requestedMoveIn: afcDay(15),
    status: 'conditional',
    createdDate: afcDay(-4),
    screening: {
      creditScore: 615,
      creditAgency: 'TransUnion Resident Screening Solutions',
      creditAgencyAddress: 'PO Box 800, Woodlyn, PA 19094 (800) 230-9376',
      backgroundCheck: 'Passed',
      evictionRecord: 'Civil Judgment Dismissed / Paid (3 years prior)',
      recommendation: 'Conditional Approval — Requires Additional 1.0x Security Deposit'
    },
    conditionalRequirement: 'Additional $1,350 Security Deposit Required ($2,700 total)',
    adverseActionSent: false
  });

  /* ANCHOR: APP-ADA-01 — Assistance Animal Accommodation in No-Pets Property — DO NOT CHANGE */
  applications.push({
    id: 'APP-ADA-01',
    name: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    phone: '555-0343',
    propertyId: 'PROP-01', // No-pets single family home
    unitId: 'UNIT-01-01',
    monthlyIncomeCents: 850000,
    requestedMoveIn: afcDay(7),
    status: 'approved',
    createdDate: afcDay(-5),
    screening: {
      creditScore: 745,
      creditAgency: 'TransUnion Resident Screening Solutions',
      backgroundCheck: 'Passed',
      evictionRecord: 'Clean',
      recommendation: 'Approve'
    },
    requestedAccommodation: true,
    accommodationDetails: {
      type: 'Assistance Animal (Emotional Support Animal)',
      animalType: 'Dog (Golden Retriever - "Buddy")',
      medicalDocumentationVerified: true,
      doctorName: 'Dr. Aris Thorne, MD (Licensed Clinical Psychiatrist, Dallas TX)',
      petDepositWaiver: true,
      petRentWaiver: true
    }
  });

  // Bulk Applications (7 more)
  for (let a = 4; a <= 10; a++) {
    const targetUnit = units[(a * 7) % units.length];
    applications.push({
      id: 'APP-2026-' + String(a).padStart(3, '0'),
      name: FIRST_NAMES[a * 3] + ' ' + LAST_NAMES[a * 3],
      email: (FIRST_NAMES[a * 3].toLowerCase() + '@example.com'),
      phone: '555-03' + String(50 + a),
      propertyId: targetUnit.propertyId,
      unitId: targetUnit.id,
      monthlyIncomeCents: 420000 + (a * 20000),
      requestedMoveIn: afcDay(5 + a),
      status: ['new', 'screening', 'approved', 'conditional', 'denied'][a % 5],
      createdDate: afcDay(- (a + 1)),
      screening: {
        creditScore: 620 + (a * 15),
        creditAgency: 'TransUnion Resident Screening Solutions',
        backgroundCheck: 'Passed',
        evictionRecord: 'Clean',
        recommendation: 'Approve'
      }
    });
  }

  // 6. Owner Statements (18 Owners x 3 Months = 54 Statements)
  /* ANCHOR: STMT-01 — Statement in Draft with Misclassified Expense Line — DO NOT CHANGE */
  ownerStatements.push({
    id: 'STMT-01',
    ownerId: 'OWN-01',
    propertyId: 'PROP-01',
    periodMonth: '2026-07',
    periodLabel: 'July 2026',
    status: 'draft',
    totalIncomeCents: 265000,
    totalExpensesCents: 120000,
    managementFeeCents: 21200, // 8.00% of $2,650.00
    netDistributionCents: 123800, // 265000 - 120000 - 21200
    generatedDate: afcDay(-12),
    sentDate: null,
    items: [
      { date: afcDay(-42), category: 'rent', description: 'Rent Collected - Unit Single Family', incomeCents: 265000, expenseCents: 0 },
      { date: afcDay(-30), category: 'repair', description: 'HVAC Compressor Replacement (Unclassified Capital Expense)', incomeCents: 0, expenseCents: 120000 }
    ]
  });

  // Generate Statements for all 18 Owners for May, June, July 2026
  AFC_OWNERS.forEach(function (own) {
    const prop = AFC_PROPERTIES.find(p => p.id === own.propertyIds[0]);
    if (!prop) return;
    const splitPct = (prop.ownerSplit && prop.ownerSplit[own.id]) || 100;
    const monthlyGrossRent = (prop.unitCount * 180000 * splitPct) / 100;
    const feePct = prop.managementFeePct / 100; // basis points to percent
    const feeCents = Math.round((monthlyGrossRent * feePct) / 100);
    const expCents = Math.round(monthlyGrossRent * 0.15);
    const netDist = monthlyGrossRent - expCents - feeCents;

    ['2026-05', '2026-06'].forEach(function (mStr, mIdx) {
      ownerStatements.push({
        id: 'STMT-' + own.id + '-' + mStr,
        ownerId: own.id,
        propertyId: prop.id,
        periodMonth: mStr,
        periodLabel: (mIdx === 0 ? 'May 2026' : 'June 2026'),
        status: 'paid',
        totalIncomeCents: monthlyGrossRent,
        totalExpensesCents: expCents,
        managementFeeCents: feeCents,
        netDistributionCents: netDist,
        generatedDate: afcDay(-70 + (mIdx * 30)),
        sentDate: afcDay(-68 + (mIdx * 30)),
        items: [
          { date: afcDay(-72 + (mIdx * 30)), category: 'rent', description: 'Monthly Gross Rent Collections', incomeCents: monthlyGrossRent, expenseCents: 0 },
          { date: afcDay(-70 + (mIdx * 30)), category: 'maintenance', description: 'Property Operations & Maintenance', incomeCents: 0, expenseCents: expCents }
        ]
      });
    });
  });

  // 7. Bank Transactions across 12 months for 3 Bank Accounts (M5 & M6)
  for (let t = 1; t <= 60; t++) {
    const accId = t % 3 === 0 ? 'BANK-03' : (t % 2 === 0 ? 'BANK-02' : 'BANK-01');
    const isCredit = t % 2 === 0;
    const amt = (15000 + (t * 2300));
    transactions.push({
      id: 'TXN-2026-' + String(t).padStart(4, '0'),
      accountId: accId,
      propertyId: null,
      leaseId: null,
      date: afcDay(- (t * 5)),
      description: isCredit ? 'ACH Electronic Rent Collection Batch' : 'Vendor Service Disbursement',
      category: isCredit ? 'deposit' : 'disbursement',
      amount: isCredit ? amt : -amt,
      cleared: t > 5, // Top 5 recent transactions pending for reconciliation view
      reference: 'ACH-TX-' + (90000 + t)
    });
  }

  // 8. VA Tasks (12)
  const TASK_LIST = [
    { title: 'Send 3-Day Notice to Vacate for Unit 11-304 (DeShawn Williams)', pri: 'urgent', due: 0, sec: 'accounting', arg: 'DQ-07' },
    { title: 'Dispatch Lone Star HVAC for AC Emergency (Unit 12-104)', pri: 'urgent', due: 0, sec: 'maintenance', arg: 'WO-2026-0101' },
    { title: 'Issue 24-Hour Notice of Intent to Enter (Unit 11-102)', pri: 'high', due: 1, sec: 'maintenance', arg: 'WO-ENTRY-01' },
    { title: 'Process Security Deposit Accounting Statement (Samuel Oak)', pri: 'high', due: 8, sec: 'residents', arg: 'LEASE-MO-01' },
    { title: 'Send Adverse Action Letter for Denied Applicant (Darren Hopkins)', pri: 'high', due: 1, sec: 'leasing', arg: 'APP-FCRA-01' },
    { title: 'Send Lease Renewal Offer (+7.4%) to Jordan Reed', pri: 'normal', due: 5, sec: 'residents', arg: 'LEASE-REN-01' },
    { title: 'Review COI for Lone Star Roofing before Work Order Dispatch', pri: 'high', due: 2, sec: 'maintenance', arg: 'WO-INS-01' },
    { title: 'Perform Bank Reconciliation for Trust Account (*7712)', pri: 'normal', due: 3, sec: 'accounting', arg: 'BANK-02' },
    { title: 'Review and Publish July Owner Statement for Eleanor Vance', pri: 'normal', due: 4, sec: 'owners', arg: 'STMT-01' },
    { title: 'Follow-up on Guest Card Showing with Brenda Miller', pri: 'low', due: 2, sec: 'leasing', arg: 'GC-FH-01' },
    { title: 'Inspect Turnover Cleaning for Unit 08-B Rehab', pri: 'low', due: 6, sec: 'properties', arg: 'UNIT-08-B' },
    { title: 'Audit Vendor Insurance Expiration Roster for Q3', pri: 'normal', due: 7, sec: 'maintenance', arg: 'VEND-08' }
  ];

  TASK_LIST.forEach(function (item, idx) {
    tasks.push({
      id: 'TASK-' + String(idx + 1).padStart(3, '0'),
      title: item.title,
      priority: item.pri,
      dueDate: afcDay(item.due),
      section: item.sec,
      sectionArg: item.arg,
      status: 'pending',
      assignedTo: 'Alex Rivera'
    });
  });

  return {
    units: units,
    leases: leases,
    residents: residents,
    ledgerEntries: ledgerEntries,
    workOrders: workOrders,
    guestCards: guestCards,
    applications: applications,
    transactions: transactions,
    ownerStatements: ownerStatements,
    tasks: tasks
  };
}

// Run the deterministic portfolio builder once on load
const _portfolio = afBuildCompletePortfolio();

const AFC_UNITS = _portfolio.units;
const AFC_LEASES = _portfolio.leases;
const AFC_RESIDENTS = _portfolio.residents;
const AFC_LEDGER_ENTRIES = _portfolio.ledgerEntries;
const AFC_WORK_ORDERS = _portfolio.workOrders;
const AFC_GUEST_CARDS = _portfolio.guestCards;
const AFC_APPLICATIONS = _portfolio.applications;
const AFC_TRANSACTIONS = _portfolio.transactions;
const AFC_OWNER_STATEMENTS = _portfolio.ownerStatements;
const AFC_TASKS = _portfolio.tasks;
