/* ============================================================================
   APPFOLIO SIMULATOR — CURRICULUM, ITEM BANKS & EXAM BLUEPRINT
   ============================================================================

   What belongs here
   -----------------
   The graded course and nothing else: lessons, scenarios, verify/reconcile/
   compose/triage items, and the exam bank. Prompt 3/3 fills this file, and from
   that point it is frozen — every id in it is something a trainee is scored on,
   so a rename here is a lost record for anyone mid-course.

   What does NOT belong here
   -------------------------
   The portfolio. Properties, units, leases, residents, work orders and every
   other product entity live in appfolio-catalog-data.js. Keeping the two apart
   from the first line is deliberate: the other two modules in this repo each
   grew a single file holding both, and separating them afterwards cost several
   passes each.

   Naming
   ------
   Everything here is AF_*. The catalogue is AFC_*, the facade is AFS_*. Three
   prefixes, so a reader can tell at a glance which layer a symbol came from.
   ============================================================================ */

/* The frozen "today". Centered on 2026-08-12 matching DS_TODAY and QZ_TODAY. */
const AF_TODAY = '2026-08-12';

/* Legal Disclaimer Text for Sensitive Modules & Exam (§5.4) */
const AF_LEGAL_DISCLAIMER = 'Training material only — not legal advice. State laws and local regulations vary. For live property management issues, consult your broker or corporate counsel.';


/* ============================================================================
   1. EXAM TEST FIXTURES (AFC_EXAM_*) — Dedicated Exam Entities (§4)
   ============================================================================ */

const AFC_EXAM_PROPERTIES = [
  {
    id: 'PROP-EX-01',
    name: 'Canyon Ridge Estates',
    address: '8800 Canyon Ridge Blvd, Plano, TX 75024',
    type: 'single-family-portfolio',
    unitsCount: 10,
    operatingCashCents: 1540000,
    managementFeePct: 800
  },
  {
    id: 'PROP-EX-02',
    name: 'Barton Springs Terrace',
    address: '4200 Spring Valley Rd, Frisco, TX 75034',
    type: 'multifamily',
    unitsCount: 20,
    operatingCashCents: 3820000,
    managementFeePct: 750
  }
];

const AFC_EXAM_APPLICATIONS = [
  {
    id: 'APP-EX-01',
    applicantName: 'Jordan Taylor',
    propertyId: 'PROP-EX-02',
    unitId: 'UNIT-EX-01',
    monthlyIncomeCents: 520000,
    screening: { creditScore: 545, creditAgency: 'TransUnion', backgroundCheck: 'clear', evictionRecord: 'none' },
    status: 'pending',
    adverseActionSent: false
  },
  {
    id: 'APP-EX-02',
    applicantName: 'Samantha Perez',
    propertyId: 'PROP-EX-01',
    unitId: 'UNIT-EX-02',
    monthlyIncomeCents: 680000,
    requestedAccommodation: { type: 'assistance-animal', animalType: 'Dog', documentationVerified: true },
    screening: { creditScore: 710, creditAgency: 'Experian', backgroundCheck: 'clear', evictionRecord: 'none' },
    status: 'pending',
    adverseActionSent: false
  }
];

const AFC_EXAM_LEASES = [
  {
    id: 'LEASE-EX-01',
    propertyId: 'PROP-EX-01',
    unitId: 'UNIT-EX-01',
    residentName: 'David Kim',
    rentAmount: 240000,
    depositHeld: 240000,
    balanceCents: 240000,
    status: 'active'
  },
  {
    id: 'LEASE-EX-02',
    propertyId: 'PROP-EX-02',
    unitId: 'UNIT-EX-02',
    residentName: 'Rachel Green',
    rentAmount: 185000,
    depositHeld: 185000,
    balanceCents: 0,
    status: 'past',
    moveOutDate: '2026-07-20' // 23 days ago from AF_TODAY
  }
];

const AFC_EXAM_WORK_ORDERS = [
  {
    id: 'WO-EX-01',
    title: 'Emergency Gas Odor Reported',
    propertyId: 'PROP-EX-02',
    unitId: 'UNIT-EX-04',
    priority: 'emergency',
    status: 'open',
    vendorId: 'VEND-01',
    entryNoticeSent: true
  },
  {
    id: 'WO-EX-02',
    title: 'Ceiling Fan Replacement',
    propertyId: 'PROP-EX-01',
    unitId: 'UNIT-EX-03',
    priority: 'routine',
    status: 'open',
    vendorId: 'VEND-08', // Expired insurance
    entryNoticeSent: false
  }
];


/* ============================================================================
   2. CHECKLIST IDS INDEX (§1)
   ============================================================================ */

const AF_CHECKLIST_IDS = [
  'af_c1_1', 'af_c1_2', 'af_c1_3', 'af_c1_4',
  'af_c2_1', 'af_c2_2',
  'af_c3_1', 'af_c3_2', 'af_c3_3',
  'af_c4_1', 'af_c4_2',
  'af_c5_1', 'af_c5_2', 'af_c5_3', 'af_c5_4',
  'af_c9_1', 'af_c9_2', 'af_c9_3', 'af_c9_4',
  'af_c10_1', 'af_c10_2', 'af_c10_3',
  'af_c11_1'
];


/* ============================================================================
   3. LESSONS (AF_LESSONS) — 13 Interactive Walkthroughs (§3)
   ============================================================================ */

const AF_LESSONS = [
  {
    id: 'l01-orientation',
    number: 1,
    title: 'Orientation: Properties, Units and Reading Occupancy',
    summary: 'Navigate the residential portfolio, inspect property and unit cards, and locate active leases with upcoming expiration milestones.',
    steps: [
      {
        type: 'do',
        checklistId: 'af_c1_1',
        label: 'Open Properties View',
        view: 'properties',
        walk: {
          target: 'a[data-section="properties"]',
          text: 'Click on Properties in the navigation bar to view all managed Texas properties.',
          setup: function () { afGoto('dashboard'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c1_2',
        label: 'Select Legacy Park Apartments',
        view: 'properties',
        walk: {
          target: 'button[data-prop="PROP-11"]',
          text: 'Select Legacy Park Apartments (PROP-11) in Plano, TX (24 units).',
          setup: function () { afGoto('properties'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c1_3',
        label: 'Inspect Unit 11-102',
        view: 'properties',
        walk: {
          target: 'button[data-unit="UNIT-11-102"]',
          text: 'Click on Unit 11-102 to view resident Marcus Vance and lease details.',
          setup: function () { afGoto('properties', 'PROP-11'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c1_4',
        label: 'Locate 47-Day Renewal Milestone',
        view: 'residents',
        viewArg: 'RES-0006',
        walk: {
          target: '.af-pill-warn',
          text: 'Inspect Jordan Reed (LEASE-REN-01). Note that the lease expires in 47 days, requiring a timely renewal offer.',
          setup: function () { afGoto('resident-detail', 'RES-0006'); }
        }
      }
    ]
  },
  {
    id: 'l02-resident-ledger',
    number: 2,
    title: 'The Resident Ledger: Charges, Payments and Balances',
    summary: 'Master the 12-month ledger balance chain and learn to spot mathematical discrepancies in running balance calculations.',
    steps: [
      {
        type: 'do',
        checklistId: 'af_c2_1',
        label: 'Open Residents Directory',
        view: 'residents',
        walk: {
          target: 'a[data-section="residents"]',
          text: 'Navigate to the Residents directory.',
          setup: function () { afGoto('dashboard'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c2_2',
        label: 'Open Resident Ledger',
        view: 'resident-detail',
        viewArg: 'RES-PET-01',
        walk: {
          target: '.af-tbl-ledger',
          text: 'Inspect Marcus Vance (UNIT-11-102) 12-month ledger history including rent charges, payments, and pet rent.',
          setup: function () { afGoto('resident-detail', 'RES-PET-01'); }
        }
      },
      {
        type: 'verify',
        reviewId: 'af_v2_1',
        label: 'Audit Ledger Running Balance Chain',
        view: 'review',
        viewArg: 'af_v2_1',
        walk: {
          target: '.af-rv-card',
          text: 'Review the sample 12-month ledger below. Identify the single entry where the running balance chain breaks M2.',
          setup: function () { afGoto('review', 'af_v2_1'); }
        }
      }
    ]
  },
  {
    id: 'l03-posting-rent-late-fees',
    number: 3,
    title: 'Posting Rent and Applying Late Fees',
    summary: 'Post resident payments, observe balance reductions, and evaluate Texas statutory late fee policies under Texas Property Code § 92.019.',
    steps: [
      {
        type: 'do',
        checklistId: 'af_c3_1',
        label: 'Open Delinquency Aging',
        view: 'accounting',
        viewArg: 'delinquency',
        walk: {
          target: 'button[data-subtab="delinquency"]',
          text: 'Navigate to Accounting and select the Delinquency Aging view.',
          setup: function () { afGoto('accounting', 'overview'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c3_2',
        label: 'Open Post Payment Modal',
        view: 'accounting',
        viewArg: 'delinquency',
        effect: function () { return afAllLedgerEntries().some(function (e) { return e.id === 'LEDGER-POST-01'; }); },
        walk: {
          target: 'button[data-post-pay="LEASE-0002"]',
          text: 'Click "Post Payment" for delinquent tenant Arthur Dent (LEASE-0002).',
          setup: function () { afGoto('accounting', 'delinquency'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c3_3',
        label: 'Post $500.00 Resident Payment',
        view: 'accounting',
        viewArg: 'delinquency',
        effect: function () { return afAllLedgerEntries().some(function (e) { return e.amount === 50000 && e.type === 'payment'; }); },
        walk: {
          target: '#afBtnSubmitPayment',
          text: 'Submit the $500.00 payment to record the transaction and update the ledger.',
          setup: function () { afModalPostPayment('LEASE-0002'); }
        }
      },
      {
        type: 'decide',
        scenarioId: 'af_s3_1',
        label: 'Evaluate Partial Payment & Late Fee Assessment',
        view: 'scenario',
        viewArg: 'af_s3_1',
        walk: {
          target: '.af-scenario-card',
          text: 'Evaluate late fee rules under Texas Property Code § 92.019 when a partial payment is submitted after the contractual grace period.',
          setup: function () { afGoto('scenario', 'af_s3_1'); }
        }
      }
    ]
  },
  {
    id: 'l04-delinquency-collection-ladder',
    number: 4,
    title: 'Delinquency: Reading the Report and Collection Ladder',
    summary: 'Analyze aged receivables across 1-15, 16-30, 31-60, and 60+ day tiers and determine progressive collection remedies.',
    steps: [
      {
        type: 'do',
        checklistId: 'af_c4_1',
        label: 'Open Delinquency Aging Report',
        view: 'reporting',
        walk: {
          target: 'button[data-report="delinquency"]',
          text: 'Open the Delinquency Aging Report from the Reporting section.',
          setup: function () { afGoto('reporting'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c4_2',
        label: 'Inspect 30-Day Delinquent Account',
        view: 'reporting',
        walk: {
          target: '.af-tbl-delinq tr[data-dq="DQ-04"]',
          text: 'Locate DQ-04 ($2,150.00 past due, 31-60 days aging).',
          setup: function () { afViewReport('delinquency'); }
        }
      },
      {
        type: 'decide',
        scenarioId: 'af_s4_1',
        label: 'Determine Next Step for 12-Day Delinquent',
        view: 'scenario',
        viewArg: 'af_s4_1',
        walk: {
          target: '.af-scenario-card',
          text: 'Select the legally compliant next step for a 12-day delinquent account under Texas Property Code § 24.005.',
          setup: function () { afGoto('scenario', 'af_s4_1'); }
        }
      },
      {
        type: 'decide',
        scenarioId: 'af_s4_2',
        label: 'Determine Action for 45-Day Delinquency',
        view: 'scenario',
        viewArg: 'af_s4_2',
        walk: {
          target: '.af-scenario-card',
          text: 'Decide the lawful collection escalation for an account exceeding 45 days delinquent.',
          setup: function () { afGoto('scenario', 'af_s4_2'); }
        }
      }
    ]
  },
  {
    id: 'l05-leasing-funnel',
    number: 5,
    title: 'The Leasing Funnel: Guest Card → Tour → Application',
    summary: 'Process prospective renter inquiries through CRM stages: new inquiry, contacted, showing scheduled, and application submitted.',
    steps: [
      {
        type: 'do',
        checklistId: 'af_c5_1',
        label: 'Open Leasing CRM',
        view: 'leasing',
        walk: {
          target: 'a[data-section="leasing"]',
          text: 'Navigate to the Leasing CRM funnel.',
          setup: function () { afGoto('dashboard'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c5_2',
        label: 'Advance Guest Card to Contacted',
        view: 'leasing',
        effect: function () { const gc = afGetGuestCard('GC-0001'); return gc && gc.stage !== 'new'; },
        walk: {
          target: 'button[data-gc-advance="GC-0001"]',
          text: 'Advance guest card GC-0001 (Michael Chang) from "New" to "Contacted".',
          setup: function () { afGoto('leasing'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c5_3',
        label: 'Schedule Property Showing',
        view: 'leasing',
        effect: function () { const gc = afGetGuestCard('GC-0001'); return gc && gc.stage === 'showing'; },
        walk: {
          target: 'button[data-gc-showing="GC-0001"]',
          text: 'Schedule an on-site property tour for Michael Chang.',
          setup: function () { afGoto('leasing'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c5_4',
        label: 'View Submitted Rental Application',
        view: 'application',
        viewArg: 'APP-0001',
        walk: {
          target: '.af-app-card',
          text: 'Open the rental application submitted by Michael Chang for Unit 11-104.',
          setup: function () { afGoto('application', 'APP-0001'); }
        }
      }
    ]
  },
  {
    id: 'l06-fair-housing-writing',
    number: 6,
    title: 'Fair Housing in Writing ⚠️',
    summary: 'Protect against discrimination claims under the Fair Housing Act (42 U.S.C. § 3604) by crafting compliant, non-discriminatory communications and advertising copy.',
    steps: [
      {
        type: 'compose',
        composeId: 'af_cmp6_1',
        label: 'Reply to Family Rental Inquiry (GC-FH-01)',
        view: 'compose',
        viewArg: 'af_cmp6_1',
        walk: {
          target: '.af-compose-card',
          text: 'Compose a professional response to Brenda Miller (GC-FH-01) describing property specifications neutrally without familial status bias.',
          setup: function () { afGoto('compose', 'af_cmp6_1'); }
        }
      },
      {
        type: 'decide',
        scenarioId: 'af_s6_1',
        label: 'Identify Violations in Draft Listing (GC-FH-02)',
        view: 'scenario',
        viewArg: 'af_s6_1',
        walk: {
          target: '.af-scenario-card',
          text: 'Identify the illegal discriminatory restriction in draft listing GC-FH-02 and choose the lawful revised copy.',
          setup: function () { afGoto('scenario', 'af_s6_1'); }
        }
      },
      {
        type: 'decide',
        scenarioId: 'af_s6_2',
        label: 'Select Compliant Marketing Phrase',
        view: 'scenario',
        viewArg: 'af_s6_2',
        walk: {
          target: '.af-scenario-card',
          text: 'Select the single legally compliant phrase among 4 marketing options under Fair Housing advertising regulations.',
          setup: function () { afGoto('scenario', 'af_s6_2'); }
        }
      }
    ]
  },
  {
    id: 'l07-screening-adverse-action',
    number: 7,
    title: 'Screening and Adverse Action (FCRA) ⚠️',
    summary: 'Evaluate consumer screening reports and generate statutory Adverse Action Notices complying with 15 U.S.C. § 1681m.',
    steps: [
      {
        type: 'verify',
        reviewId: 'af_v7_1',
        label: 'Audit Screening Report for APP-FCRA-01',
        view: 'review',
        viewArg: 'af_v7_1',
        walk: {
          target: '.af-rv-card',
          text: 'Inspect the screening report for applicant Darren Hopkins (credit score 512) and locate the mandatory disclosure details.',
          setup: function () { afGoto('review', 'af_v7_1'); }
        }
      },
      {
        type: 'compose',
        composeId: 'af_cmp7_1',
        label: 'Draft FCRA Adverse Action Notice',
        view: 'compose',
        viewArg: 'af_cmp7_1',
        walk: {
          target: '.af-compose-card',
          text: 'Draft the formal FCRA Adverse Action Notice for Darren Hopkins, including all statutory agency disclaimers.',
          setup: function () { afGoto('compose', 'af_cmp7_1'); }
        }
      },
      {
        type: 'decide',
        scenarioId: 'af_s7_1',
        label: 'Evaluate Conditional Approval vs Denial (APP-FCRA-02)',
        view: 'scenario',
        viewArg: 'af_s7_1',
        walk: {
          target: '.af-scenario-card',
          text: 'Evaluate Clara Rodriguez (satisfied eviction judgment 4 years ago) under uniform screening criteria.',
          setup: function () { afGoto('scenario', 'af_s7_1'); }
        }
      }
    ]
  },
  {
    id: 'l08-assistance-animals-vs-pets',
    number: 8,
    title: 'Assistance Animals vs. Pets ⚠️',
    summary: 'Distinguish between pets and assistance animals under the FHA & HUD guidelines, enforcing zero-fee accommodation rules for service/support animals.',
    steps: [
      {
        type: 'decide',
        scenarioId: 'af_s8_1',
        label: 'Assistance Animal Accommodation (APP-ADA-01)',
        view: 'scenario',
        viewArg: 'af_s8_1',
        walk: {
          target: '.af-scenario-card',
          text: 'Determine fee applicability for applicant Elena Rostova requesting an Emotional Support Animal with verified medical documentation.',
          setup: function () { afGoto('scenario', 'af_s8_1'); }
        }
      },
      {
        type: 'decide',
        scenarioId: 'af_s8_2',
        label: 'Standard Pet Rent Assessment (RES-PET-01)',
        view: 'scenario',
        viewArg: 'af_s8_2',
        walk: {
          target: '.af-scenario-card',
          text: 'Determine lawful pet deposits and monthly pet rent for resident Marcus Vance possessing an ordinary household pet dog.',
          setup: function () { afGoto('scenario', 'af_s8_2'); }
        }
      },
      {
        type: 'compose',
        composeId: 'af_cmp8_1',
        label: 'Compose Reasonable Accommodation Approval Letter',
        view: 'compose',
        viewArg: 'af_cmp8_1',
        walk: {
          target: '.af-compose-card',
          text: 'Write the formal accommodation approval letter for Elena Rostova confirming zero pet fees while outlining standard community conduct rules.',
          setup: function () { afGoto('compose', 'af_cmp8_1'); }
        }
      }
    ]
  },
  {
    id: 'l09-move-in-lease-deposit',
    number: 9,
    title: 'Move-In: Lease, Deposit and Checklist',
    summary: 'Execute the move-in workflow: generate Texas residential lease agreements, verify terms against screening records, and collect escrow deposits.',
    steps: [
      {
        type: 'do',
        checklistId: 'af_c9_1',
        label: 'Open Approved Applicant Profile',
        view: 'application',
        viewArg: 'APP-0004',
        walk: {
          target: '.af-app-card',
          text: 'Open approved applicant profile for Priya Patel (APP-0004).',
          setup: function () { afGoto('application', 'APP-0004'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c9_2',
        label: 'Generate Lease Agreement',
        view: 'application',
        viewArg: 'APP-0004',
        effect: function () { const a = afGetApplication('APP-0004'); return a && a.leaseGenerated; },
        walk: {
          target: 'button[data-action="generate-lease"]',
          text: 'Click "Generate Lease Agreement" to create the Texas Standard Lease Agreement.',
          setup: function () { afGoto('application', 'APP-0004'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c9_3',
        label: 'Post Move-In Security Deposit',
        view: 'application',
        viewArg: 'APP-0004',
        effect: function () { return afAllLedgerEntries().some(function (e) { return e.category === 'deposit' && e.amount === 215000; }); },
        walk: {
          target: 'button[data-action="collect-deposit"]',
          text: 'Post the $2,150.00 security deposit to Bank Account 03 (Escrow).',
          setup: function () { afGoto('application', 'APP-0004'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c9_4',
        label: 'Execute Move-In Inspection Checklist',
        view: 'application',
        viewArg: 'APP-0004',
        effect: function () { const a = afGetApplication('APP-0004'); return a && a.moveInChecklistComplete; },
        walk: {
          target: 'button[data-action="complete-inspection"]',
          text: 'Complete the Move-In Inventory & Condition Checklist with the new resident.',
          setup: function () { afGoto('application', 'APP-0004'); }
        }
      },
      {
        type: 'verify',
        reviewId: 'af_v9_1',
        label: 'Audit Lease Terms vs Approved Application',
        view: 'review',
        viewArg: 'af_v9_1',
        walk: {
          target: '.af-rv-card',
          text: 'Compare the generated lease contract against approved application specifications and identify any clerical errors.',
          setup: function () { afGoto('review', 'af_v9_1'); }
        }
      }
    ]
  },
  {
    id: 'l10-maintenance-dispatch-compliance',
    number: 10,
    title: 'Maintenance: Request → Order → Vendor → Invoice ⚠️',
    summary: 'Manage maintenance operations while enforcing contractor insurance compliance and landlord notice of entry requirements.',
    steps: [
      {
        type: 'do',
        checklistId: 'af_c10_1',
        label: 'Open Maintenance Dashboard',
        view: 'maintenance',
        walk: {
          target: 'a[data-section="maintenance"]',
          text: 'Navigate to the Maintenance overview.',
          setup: function () { afGoto('dashboard'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c10_2',
        label: 'Inspect HVAC Emergency Ticket',
        view: 'work-order',
        viewArg: 'WO-2026-0101',
        walk: {
          target: '.af-wo-detail',
          text: 'Open urgent work order WO-2026-0101 (AC Compressor Failure in Unit 12-104 during summer heatwave).',
          setup: function () { afGoto('work-order', 'WO-2026-0101'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c10_3',
        label: 'Dispatch Vendor with Active COI',
        view: 'work-order',
        viewArg: 'WO-2026-0101',
        effect: function () { const w = afGetWorkOrder('WO-2026-0101'); return w && w.status === 'in_progress'; },
        walk: {
          target: '#afBtnDispatchWO',
          text: 'Assign and dispatch Lone Star HVAC Services (VEND-01, verified COI active through 2027).',
          setup: function () { afGoto('work-order', 'WO-2026-0101'); }
        }
      },
      {
        type: 'decide',
        scenarioId: 'af_s10_1',
        label: 'Address Expired Vendor Insurance (WO-INS-01)',
        view: 'scenario',
        viewArg: 'af_s10_1',
        walk: {
          target: '.af-scenario-card',
          text: 'Evaluate dispatch protocol for work order WO-INS-01 assigned to vendor Lone Star Roofing with expired liability COI.',
          setup: function () { afGoto('scenario', 'af_s10_1'); }
        }
      },
      {
        type: 'decide',
        scenarioId: 'af_s10_2',
        label: 'Evaluate 24-Hour Notice of Entry Rules (WO-ENTRY-01)',
        view: 'scenario',
        viewArg: 'af_s10_2',
        walk: {
          target: '.af-scenario-card',
          text: 'Determine landlord right of entry rules in Texas when scheduling non-emergency repairs in occupied units.',
          setup: function () { afGoto('scenario', 'af_s10_2'); }
        }
      }
    ]
  },
  {
    id: 'l11-move-out-deposit-accounting',
    number: 11,
    title: 'Move-Out: Deposit Accounting and the State Clock ⚠️',
    summary: 'Itemize move-out deductions and enforce the mandatory 30-day Texas refund deadline under Texas Property Code § 92.103 & § 92.104.',
    steps: [
      {
        type: 'verify',
        reviewId: 'af_v11_1',
        label: 'Audit Texas 30-Day Statutory Clock (LEASE-MO-01)',
        view: 'review',
        viewArg: 'af_v11_1',
        walk: {
          target: '.af-rv-card',
          text: 'Review move-out date for Samuel Oak (22 days elapsed). Calculate statutory deadline and bad faith penalties under § 92.109.',
          setup: function () { afGoto('review', 'af_v11_1'); }
        }
      },
      {
        type: 'reconcile',
        reconcileId: 'af_rec11_1',
        label: 'Reconcile Security Deposit Itemization',
        view: 'reconcile',
        viewArg: 'af_rec11_1',
        walk: {
          target: '.af-rec-card',
          text: 'Reconcile security deposit deductions (drywall repairs, trash haul, carpet deep clean) against original deposit held.',
          setup: function () { afGoto('reconcile', 'af_rec11_1'); }
        }
      },
      {
        type: 'do',
        checklistId: 'af_c11_1',
        label: 'Issue Itemized Deposit Statement',
        view: 'resident-detail',
        viewArg: 'RES-MO-01',
        effect: function () { const l = afGetLease('LEASE-MO-01'); return l && l.depositItemizationGenerated; },
        walk: {
          target: 'button[data-action="generate-deposit-itemization"]',
          text: 'Generate and issue the final Security Deposit Itemization Statement (deposit-itemization.html).',
          setup: function () { afGoto('resident-detail', 'RES-MO-01'); }
        }
      }
    ]
  },
  {
    id: 'l12-owner-statements-trust-boundary',
    number: 12,
    title: 'Owner Statements and the Trust Boundary ⚠️',
    summary: 'Audit monthly owner statements, classify capital vs operating expenses, and enforce fiduciary boundaries under TREC Rule § 535.146.',
    steps: [
      {
        type: 'verify',
        reviewId: 'af_v12_1',
        label: 'Audit Draft Owner Statement (STMT-01)',
        view: 'review',
        viewArg: 'af_v12_1',
        walk: {
          target: '.af-rv-card',
          text: 'Review the draft July owner statement for Eleanor Vance (STMT-01) and locate the miscoded repair expense.',
          setup: function () { afGoto('review', 'af_v12_1'); }
        }
      },
      {
        type: 'decide',
        scenarioId: 'af_s12_1',
        label: 'Evaluate Prohibited Trust Draw (OWN-TRUST-01)',
        view: 'scenario',
        viewArg: 'af_s12_1',
        walk: {
          target: '.af-scenario-card',
          text: 'Evaluate an owner draw request exceeding available property operating cash that would invade tenant security deposit escrow.',
          setup: function () { afGoto('scenario', 'af_s12_1'); }
        }
      },
      {
        type: 'decide',
        scenarioId: 'af_s12_2',
        label: 'Identify Fiduciary Account Commingling Violations',
        view: 'scenario',
        viewArg: 'af_s12_2',
        walk: {
          target: '.af-scenario-card',
          text: 'Analyze 4 fund transfer scenarios between Operating, Trust Escrow, and Security Deposit accounts to spot unlawful commingling.',
          setup: function () { afGoto('scenario', 'af_s12_2'); }
        }
      }
    ]
  },
  {
    id: 'l13-capstone-monday-morning-queue',
    number: 13,
    title: 'Capstone: The Monday Morning Queue',
    summary: 'Triage 9 competing operational tasks by balancing emergency physical property risks, strict statutory legal deadlines, and fiduciary duties.',
    steps: [
      {
        type: 'triage',
        triageId: 'af_tri13_1',
        label: 'Prioritize Monday Morning Queue',
        view: 'triage',
        viewArg: 'af_tri13_1',
        walk: {
          target: '.af-triage-card',
          text: 'Order the 9 urgent tasks waiting in your queue based on statutory clocks, life safety, and fiduciary mandates.',
          setup: function () { afGoto('triage', 'af_tri13_1'); }
        }
      },
      {
        type: 'decide',
        scenarioId: 'af_s13_1',
        label: 'Justify Emergency Water Leak & Deposit Clock Priority',
        view: 'scenario',
        viewArg: 'af_s13_1',
        walk: {
          target: '.af-scenario-card',
          text: 'Justify why active physical property damage and the Day 28 security deposit clock take legal precedence over routine vendor emails.',
          setup: function () { afGoto('scenario', 'af_s13_1'); }
        }
      },
      {
        type: 'decide',
        scenarioId: 'af_s13_2',
        label: 'Justify FCRA Deadline vs Leasing Tasks',
        view: 'scenario',
        viewArg: 'af_s13_2',
        walk: {
          target: '.af-scenario-card',
          text: 'Justify statutory compliance windows for Adverse Action notices under federal law.',
          setup: function () { afGoto('scenario', 'af_s13_2'); }
        }
      }
    ]
  }
];


/* ============================================================================
   4. SCENARIOS BANK (AF_SCENARIOS) — 'decide' Steps (§3)
   ============================================================================ */

const AF_SCENARIOS = [
  {
    id: 'af_s3_1',
    title: 'Late Fee Assessment & Partial Payment Policy',
    situation: 'A resident whose monthly rent is $1,800.00 pays $1,000.00 on the 6th of the month. The lease and company policy (Settings) state rent is due on the 1st, late on the 4th, with a $50 initial late fee plus $10/day. Under Texas Property Code § 92.019, late fees must be reasonable and explicitly contracted. How should the late fee be assessed?',
    options: [
      'Waive the late fee entirely because the resident made a good-faith payment of over 50% of the rent.',
      'Charge the standard contracted late fee because full rent was not received by the end of the contractual grace period (3rd of the month).',
      'Charge a 20% penalty fee on the full $1,800.00 plus a daily charge of $50/day.',
      'Automatically report the resident to credit bureaus immediately without assessing a ledger fee.'
    ],
    correct: 1,
    explanation: 'Under Texas Property Code § 92.019, late fees are enforceable when written into the lease, notice is provided, and payment is past the statutory grace period (at least 2 full days after due date). A partial payment does not cure delinquency, so the contracted late fee applies.'
  },
  {
    id: 'af_s4_1',
    title: 'Delinquency Escalation: 12-Day Past Due',
    situation: 'A tenant is 12 days delinquent on rent ($2,100.00). The automated grace period passed, the contracted late fee was posted on day 4, and polite email reminders were sent. What is the required next step in the standard collection ladder under Texas law?',
    options: [
      'Send a formal 3-Day Notice to Vacate for Non-Payment under Texas Property Code § 24.005 (or contractual notice period) prior to legal filing.',
      'Immediately dispatch a locksmith to change the unit locks without giving statutory notice.',
      'Shut off the unit electrical breaker and water valve to compel payment.',
      'Post a public notice in the building lobby disclosing the tenant\'s delinquent balance.'
    ],
    correct: 0,
    explanation: 'Under Texas Property Code § 24.005, the landlord must give the tenant at least 3 days\' written notice to vacate before filing a forcible detainer (eviction) suit, unless a different period is stated in the written lease. Self-help evictions (lockouts without strict statutory compliance under § 92.0081 or utility shutoffs under § 92.008) are illegal in Texas.'
  },
  {
    id: 'af_s4_2',
    title: 'Delinquency Escalation: 45-Day Unresolved Default',
    situation: 'A tenant owes $4,200.00 (45 days past due across two rental periods). A formal 3-Day Notice to Vacate was delivered 10 days ago, but the tenant has not paid or vacated. What is the lawful course of action?',
    options: [
      'Enter the unit while the tenant is at work and remove their personal belongings to the street curb.',
      'File an Eviction / Forcible Detainer suit in the local Texas Justice of the Peace (JP) Court with proper jurisdiction.',
      'Call the local police department to have the tenant immediately arrested for criminal trespass.',
      'Transfer the tenant\'s lease to another building without their signature or court order.'
    ],
    correct: 1,
    explanation: 'When statutory notice has expired without payment or surrender, the sole lawful remedy is filing an Eviction Petition (Forcible Detainer) in the Justice of the Peace court where the property is located. Self-help removal of tenant belongings violates Texas Property Code § 92.0081.'
  },
  {
    id: 'af_s6_1',
    title: 'Fair Housing: Correcting Discriminatory Listing Copy',
    situation: 'A property manager drafts a listing for Unit 11-208: "Charming 2-bedroom apartment. Quiet community, ideal for mature singles or working professionals. No kids or large families please." Why is this language unlawful and how must it be modified?',
    options: [
      'It is unlawful under Fair Housing Act 42 U.S.C. § 3604(c) (familial status discrimination). It must be revised to describe only physical property features (e.g., "2-bedroom, 2-bath apartment with modern kitchen and balcony").',
      'It is lawful as long as the property owner signs a written affidavit stating they prefer adult tenants.',
      'It is only illegal if the monthly rent is less than $1,500.00.',
      'It is permissible because property managers have full discretion over marketing adjectives.'
    ],
    correct: 0,
    explanation: 'The Fair Housing Act (42 U.S.C. § 3604(c)) explicitly prohibits publishing advertisements that indicate any preference, limitation, or discrimination based on race, color, religion, sex, handicap, familial status, or national origin. Advertising should describe the property amenities, never the ideal demographic profile of the occupant.'
  },
  {
    id: 'af_s6_2',
    title: 'Fair Housing: Identifying Lawful Advertising Phrases',
    situation: 'Which of the following 4 marketing statements is fully compliant with federal Fair Housing advertising standards?',
    options: [
      '"Quiet Christian neighborhood close to churches."',
      '"Spacious 3-bedroom, 2-bathroom home with hardwood floors, fenced yard, and updated appliances."',
      '"Perfect bachelor pad close to active downtown nightlife."',
      '"Great apartment for physically active residents who do not require elevator access."'
    ],
    correct: 1,
    explanation: 'Compliant property marketing describes physical amenities and objective lease terms. Describing religion ("Christian"), sex/marital status ("bachelor pad"), or disability ("physically active / no elevator") indicates discriminatory preferences.'
  },
  {
    id: 'af_s7_1',
    title: 'FCRA & Screening: Uniform Evaluation of Prior Records',
    situation: 'Applicant Clara Rodriguez (APP-FCRA-02) has strong verified income (3.5x rent, 720 credit score), but an eviction record from 4 years ago during a medical emergency, which was resolved with zero balance owed. Company written screening criteria permit conditional approval with a double security deposit or qualified guarantor. How should this application be handled?',
    options: [
      'Reject the applicant arbitrarily without reference to written criteria or providing an adverse action letter.',
      'Apply the written screening criteria uniformly by issuing conditional approval requiring an additional security deposit or guarantor.',
      'Charge a non-refundable $1,000 cash fee directly to the property manager without recording it on the ledger.',
      'Deny the application and tell the applicant verbally without providing credit bureau contact details.'
    ],
    correct: 1,
    explanation: 'Fair Housing and FCRA compliance require uniform adherence to written rental criteria. When an applicant meets conditional approval guidelines, offering admission with the specified condition (e.g. increased deposit) avoids arbitrary disparate treatment.'
  },
  {
    id: 'af_s8_1',
    title: 'Assistance Animals vs Pets: Reasonable Accommodation Fees',
    situation: 'Applicant Elena Rostova (APP-ADA-01) applies for a "no-pets" rental property and submits a request for a Reasonable Accommodation for an Emotional Support Animal (ESA) accompanied by verification from a licensed mental health professional. May management charge a $300 pet deposit and $35/month pet rent?',
    options: [
      'Yes, all animals residing on the property must pay standard pet fees regardless of service or support status.',
      'No. Under the Fair Housing Act and HUD guidance, assistance animals (service animals and emotional support animals) are not pets; landlords cannot charge pet deposits, pet rent, or pet application fees.',
      'Management may charge double pet rent because the property has a general no-pets policy.',
      'Management may deny the accommodation simply because other residents might want pets too.'
    ],
    correct: 1,
    explanation: 'Under HUD FHA guidelines (FHEO-2020-01), assistance animals are not pets. Housing providers must grant reasonable accommodations to no-pet policies and cannot charge pet fees, pet rent, or pet deposits. The resident remains responsible for any actual physical damage caused by the animal upon move-out.'
  },
  {
    id: 'af_s8_2',
    title: 'Standard Pet Rent & Deposit Assessment',
    situation: 'Resident Marcus Vance (RES-PET-01) moves into a pet-friendly community with his pet Golden Retriever (non-assistance animal). How are fees legally handled under the lease agreement?',
    options: [
      'Management may lawfully charge a refundable pet deposit and monthly pet rent as stipulated in the Animal Addendum to the lease.',
      'Pet deposits are prohibited by federal law for all animals in Texas.',
      'Management must allow the pet free of charge if the tenant signs a waiver.',
      'Management must require the pet owner to purchase the entire rental building.'
    ],
    correct: 0,
    explanation: 'For ordinary companion animals (pets), landlords may charge pet deposits, non-refundable pet fees, and monthly pet rent as authorized by the lease agreement and animal addendum.'
  },
  {
    id: 'af_s10_1',
    title: 'Vendor Compliance: Expired Certificate of Insurance (COI)',
    situation: 'Work order WO-INS-01 is assigned to Lone Star Roofing (VEND-08) for roof leak repairs. The vendor management file indicates their Certificate of Liability Insurance expired 15 days ago. What must the property manager do before dispatching the vendor?',
    options: [
      'Dispatch the vendor immediately to save time and ask for insurance documents next month.',
      'Hold the dispatch and request an updated Certificate of Insurance naming the property management company and property owner as Additional Insured before allowing work on site.',
      'Cancel the work order and tell the resident the roof will not be repaired.',
      'Pay for the vendor\'s insurance policy using tenant security deposit funds.'
    ],
    correct: 1,
    explanation: 'Dispatching uninsured or expired-insurance vendors exposes the property owner and management company to massive third-party liability and workers compensation claims. Valid COIs with appropriate liability limits and Additional Insured endorsements must be verified prior to site dispatch.'
  },
  {
    id: 'af_s10_2',
    title: 'Landlord Notice of Entry in Texas',
    situation: 'A technician is scheduled for a routine non-emergency filter replacement in occupied Unit 11-102 (WO-ENTRY-01). The tenant did not request the repair and no advance notice was given. The technician asks if they can use the master key to enter immediately while the tenant is away. What does Texas law and standard lease practice dictate?',
    options: [
      'Enter immediately without notice because the landlord owns the real estate.',
      'Provide reasonable advance notice (typically 24 hours under standard Texas lease terms) before entering an occupied unit for non-emergency routine maintenance, respecting the tenant\'s quiet enjoyment.',
      'Break down the door if it is locked.',
      'Wait until midnight to perform the inspection quietly.'
    ],
    correct: 1,
    explanation: 'While Texas Property Code does not have a single statewide statutory 24-hour entry statute like California, landlord entry is strictly governed by the lease agreement (standard TAR/TAA Lease Paragraph 14) and Texas common law implied covenant of quiet enjoyment. Unauthorized entry without notice for non-emergencies breaches the lease.'
  },
  {
    id: 'af_s12_1',
    title: 'Fiduciary Trust Accounting: Illegal Escrow Invasion',
    situation: 'Property owner Harold Finch (OWN-01 / PROP-01) requests an emergency owner draw of $14,500.00. The property ledger shows $8,200.00 in available operating cash and $6,300.00 in tenant security deposits held in the Security Deposit Trust Escrow Account (BANK-03). Can you disburse $14,500.00 to the owner?',
    options: [
      'Yes, the owner owns the property and is entitled to all cash in any related account at all times.',
      'No. Tenant security deposits are fiduciary funds held in trust for residents and cannot be disbursed to owners. The maximum draw is limited to the available operating cash balance of $8,200.00.',
      'Yes, provided the property manager replaces the escrow funds with personal credit card debt within 90 days.',
      'No, because owner draws can never exceed $1,000.00 per month regardless of cash balance.'
    ],
    correct: 1,
    explanation: 'Tenant security deposits are trust funds owned by the tenants until lawful move-out deductions occur. Disbursing tenant deposit escrow funds to an owner constitutes unlawful commingling and illegal conversion of trust funds under Texas Real Estate Commission (TREC) Rule § 535.146 and general fiduciary principles.'
  },
  {
    id: 'af_s12_2',
    title: 'Identifying Trust Commingling Violations',
    situation: 'Which of the following four multi-account bank transactions represents an illegal commingling violation in property management accounting?',
    options: [
      'Transferring earned management fees from the Property Operating Account to the Management Company Operating Account after the close of the accounting period.',
      'Depositing tenant security deposits directly into the Property Management Company Corporate Payroll Account to cover office bonuses.',
      'Refunding a tenant security deposit directly from the Security Deposit Escrow Account to the vacated resident.',
      'Disbursing owner net rental proceeds from the Trust Operating Account after all property operating expenses and reserves are funded.'
    ],
    correct: 1,
    explanation: 'Depositing tenant trust escrow funds into a corporate payroll or operating account is criminal conversion/commingling of client funds, resulting in immediate loss of real estate license, severe civil penalties, and potential criminal liability.'
  },
  {
    id: 'af_s13_1',
    title: 'Queue Prioritization: Emergency Water Leak vs Routine Items',
    situation: 'On Monday morning, you open your operations queue and see: (1) Active water leak in Unit 12-104 flooding downstairs ceiling, (2) Day 28 Security Deposit Refund for moved-out tenant, (3) Routine vendor invoice inquiry, and (4) Non-urgent paint touch-up request. Why must the active water leak and day 28 deposit refund be addressed first?',
    options: [
      'Active water leaks cause catastrophic structural damage and habitability failure, while Day 28 of the Texas deposit clock risks statutory 3x penalties under § 92.109 if delayed past day 30.',
      'Routine vendor invoices are always legally forbidden from being paid on Mondays.',
      'Non-urgent paint touch-ups must always take priority over flood damage.',
      'Property managers should simply ignore the queue until Tuesday afternoon.'
    ],
    correct: 0,
    explanation: 'Life safety and active property destruction represent immediate emergency liabilities, while strict statutory clocks (like the Texas 30-day security deposit deadline under § 92.103/§ 92.109) carry severe legal penalties (3x deposit + $100 + attorney fees) if missed.'
  },
  {
    id: 'af_s13_2',
    title: 'Statutory Windows: FCRA Adverse Action Priority',
    situation: 'Why does issuing an FCRA Adverse Action Notice for a denied applicant take priority over general marketing and routine file sorting?',
    options: [
      'Federal law (FCRA 15 U.S.C. § 1681m) mandates timely written notice of adverse action when consumer reports affect leasing decisions, protecting applicant dispute rights and preventing statutory civil liability.',
      'FCRA notices can only be mailed during full moon cycles.',
      'Credit bureaus will fine the property manager personally $50,000 within 1 hour.',
      'Adverse action letters are optional and can be delayed indefinitely without legal risk.'
    ],
    correct: 0,
    explanation: 'Prompt issuance of FCRA Adverse Action notices is a strict federal requirement when credit or background checks influence adverse tenancy decisions, allowing prospective tenants to exercise their statutory rights to free disclosures and disputes.'
  }
];


/* ============================================================================
   5. VERIFY ITEMS BANK (AF_VERIFY_ITEMS) — 'verify' Steps (§3)
   ============================================================================ */

const AF_VERIFY_ITEMS = [
  {
    id: 'af_v2_1',
    title: 'Audit 12-Month Ledger Balance Chain',
    instruction: 'Review the 12-month ledger entries below. Click on the single row where the running balance (balanceAfter) fails to equal previous balance plus charge (or minus payment).',
    entries: [
      { id: 'ENT-V1', date: '2025-09-01', type: 'charge', desc: 'Monthly Rent', amount: 185000, balanceAfter: 185000 },
      { id: 'ENT-V2', date: '2025-09-03', type: 'payment', desc: 'ACH Resident Payment', amount: 185000, balanceAfter: 0 },
      { id: 'ENT-V3', date: '2025-10-01', type: 'charge', desc: 'Monthly Rent', amount: 185000, balanceAfter: 185000 },
      { id: 'ENT-V4', date: '2025-10-02', type: 'payment', desc: 'ACH Resident Payment', amount: 185000, balanceAfter: 0 },
      { id: 'ENT-V5', date: '2025-11-01', type: 'charge', desc: 'Monthly Rent', amount: 185000, balanceAfter: 185000 },
      { id: 'ENT-V6', date: '2025-11-04', type: 'charge', desc: 'Late Fee Assessment', amount: 5000, balanceAfter: 190000 },
      { id: 'ENT-V7', date: '2025-11-06', type: 'payment', desc: 'Partial Payment', amount: 100000, balanceAfter: 90000 },
      { id: 'ENT-V8', date: '2025-11-15', type: 'payment', desc: 'Balance Settlement Payment', amount: 90000, balanceAfter: 15000 }, // BROKEN: should be 0!
      { id: 'ENT-V9', date: '2025-12-01', type: 'charge', desc: 'Monthly Rent', amount: 185000, balanceAfter: 200000 }
    ],
    targetEntryId: 'ENT-V8',
    explanation: 'Entry ENT-V8 posted a payment of $900.00 against a $900.00 balance, which should result in a $0.00 balance, but balanceAfter was incorrectly computed as $150.00 ($15,000 cents).'
  },
  {
    id: 'af_v7_1',
    title: 'Audit Screening Report Disclosures (APP-FCRA-01)',
    instruction: 'Inspect the consumer screening report for Darren Hopkins (APP-FCRA-01). Select the key disclosure trigger and reporting agency that must be cited on the Adverse Action Notice.',
    screeningData: {
      applicantName: 'Darren Hopkins',
      unitId: 'UNIT-10-101',
      creditScore: 512,
      creditAgency: 'TransUnion Consumer Solutions',
      agencyAddress: 'P.O. Box 2000, Chester, PA 19016',
      agencyPhone: '1-800-888-4213',
      agencyWebsite: 'www.transunion.com/dispute',
      thresholdRequired: 620,
      adverseFactor: 'Credit score 512 below minimum underwriting guideline of 620'
    },
    targetField: 'creditScore',
    explanation: 'The applicant\'s credit score of 512 was pulled from TransUnion Consumer Solutions and fell below the 620 threshold, triggering the mandatory FCRA § 615(a) adverse action disclosure.'
  },
  {
    id: 'af_v9_1',
    title: 'Audit Generated Lease vs Approved Application',
    instruction: 'Compare the generated lease terms for Priya Patel against her approved rental application. Click on the conflicting term.',
    discrepancies: [
      { field: 'Monthly Rent Rate', appVal: '$2,150.00', leaseVal: '$2,150.00', isError: false },
      { field: 'Security Deposit Held', appVal: '$2,150.00', leaseVal: '$2,150.00', isError: false },
      { field: 'Lease Start Date', appVal: '2026-09-01', leaseVal: '2026-09-01', isError: false },
      { field: 'Pet Deposit Charged', appVal: '$0.00 (No Pets)', leaseVal: '$350.00 Pet Deposit', isError: true }
    ],
    targetField: 'Pet Deposit Charged',
    explanation: 'The lease erroneously included a $350.00 pet deposit for an applicant who does not own any pets and did not apply for a pet addendum.'
  },
  {
    id: 'af_v11_1',
    title: 'Audit Texas Security Deposit Return Deadline & Penalty (LEASE-MO-01)',
    instruction: 'Review the move-out calendar for Samuel Oak (LEASE-MO-01). Select the statutory deadline and statutory bad-faith penalty calculation under Texas Property Code § 92.103 and § 92.109.',
    statuteDetails: {
      moveOutDate: '2026-07-21',
      daysElapsed: 22,
      statutoryLimitDays: 30,
      daysRemaining: 8,
      depositHeldCents: 290000,
      penaltyFormula: '$100 + 3x deposit amount wrongfully withheld + reasonable attorney fees',
      calculated3xPenaltyCents: 880000 // $100 + 3 * $2,900 = $8,800.00
    },
    targetItem: 'daysRemaining',
    explanation: 'Under Texas Property Code § 92.103, the landlord has 30 days from surrender to refund the deposit. With 22 days elapsed, exactly 8 days remain. Under § 92.109, bad-faith retention triggers $100 + 3x the deposit amount ($8,800 total liability) plus tenant attorney fees.'
  },
  {
    id: 'af_v12_1',
    title: 'Audit Owner Operating Statement (STMT-01)',
    instruction: 'Inspect the July Owner Operating Statement for Eleanor Vance. Identify the misclassified transaction that improperly coded an owner capital improvement as a routine operating expense.',
    lineItems: [
      { id: 'LI-1', desc: 'Gross Rental Income (Unit 01-01)', cat: 'income', amount: 265000, isError: false },
      { id: 'LI-2', desc: 'Management Fee (8%)', cat: 'expense', amount: 21200, isError: false },
      { id: 'LI-3', desc: 'HVAC Air Filter Replacement (Routine)', cat: 'expense', amount: 4500, isError: false },
      { id: 'LI-4', desc: 'Complete New Roof Replacement (Capital Improvement)', cat: 'operating-expense', amount: 850000, isError: true },
      { id: 'LI-5', desc: 'Lawn & Grounds Maintenance', cat: 'expense', amount: 12000, isError: false }
    ],
    targetItemId: 'LI-4',
    explanation: 'A $8,500.00 complete roof replacement is a capital expenditure (CapEx / Owner Improvement) that should be capitalized or funded from owner reserves, rather than expensed against routine monthly operating cash.'
  }
];


/* ============================================================================
   6. RECONCILE ITEMS BANK (AF_RECONCILE_ITEMS) — 'reconcile' Steps (§3)
   ============================================================================ */

const AF_RECONCILE_ITEMS = [
  {
    id: 'af_rec11_1',
    title: 'Security Deposit Itemization Statement Reconciliation',
    instruction: 'Reconcile the security deposit accounting statement for Samuel Oak (LEASE-MO-01). Enter the itemized deductions and calculate the exact net refund check owed to the former tenant.',
    depositHeldCents: 290000, // $2,900.00
    deductionItems: [
      { id: 'DED-1', label: 'Drywall hole patching & paint (Living Room)', amountCents: 35000, valid: true },
      { id: 'DED-2', label: 'Carpet deep extraction clean (Pet stain removal)', amountCents: 18000, valid: true },
      { id: 'DED-3', label: 'Normal wear and tear scuff marks on baseboards', amountCents: 0, valid: false }, // Cannot deduct normal wear & tear!
      { id: 'DED-4', label: 'Unpaid water utility pass-through balance', amountCents: 0, valid: true }
    ],
    expectedTotalDeductionsCents: 53000, // $530.00
    expectedNetRefundCents: 237000,      // $2,370.00
    explanation: 'Under Texas Property Code § 92.104(b), the landlord may NOT deduct for normal wear and tear. Deducting $350.00 (drywall) and $180.00 (carpet cleaning) totals $530.00 in deductions, leaving an exact refund balance of $2,370.00.'
  }
];


/* ============================================================================
   7. COMPOSE ITEMS BANK (AF_COMPOSE_ITEMS) — 'compose' Steps (§3)
   ============================================================================ */

const AF_COMPOSE_ITEMS = [
  {
    id: 'af_cmp6_1',
    anchorId: 'GC-FH-01',
    label: 'Fair Housing Inquiry Response (Brenda Miller)',
    instruction: 'Brenda Miller submitted an inquiry asking: "Hi, I love the photos of Unit 11-104! I am 6 months pregnant with my first baby. Is this building safe and good for young children?" Write a professional, compliant response describing unit features, lease terms, and amenities without making statements regarding suitability for children.',
    placeholder: 'Dear Brenda, thank you for your interest in Unit 11-104 at Legacy Park Apartments...',
    thread: [
      { sender: 'Brenda Miller', recipient: 'Management', date: '2026-08-11', body: 'Hi! I love Unit 11-104. I am expecting a baby in November and want to make sure this community is safe and quiet for small children. Are there other families with babies living in this building?' }
    ],
    rubric: [
      { check: 'describesUnitFeatures', label: 'Describes objective unit/property features (2-bedroom, amenities, floorplan)', why: 'Your reply should focus strictly on objective unit specifications, layout, square footage, and amenities.' },
      { check: 'noFamilyStereotypes', label: 'Avoids expressing preferences, opinions, or stereotypes regarding children', why: 'Expressing opinions on whether a property is "good for kids" or commenting on resident family makeup constitutes illegal steering under the Fair Housing Act.' },
      { check: 'invitesApplicationOrTour', label: 'Invites prospective renter to schedule a tour or apply online', why: 'A helpful leasing response provides clear next steps such as booking a tour or reviewing criteria.' },
      { check: 'givesTimeframe', label: 'Includes specific office hours, tour availability, or response timeframe', why: 'Professional communication provides concrete scheduling options or response windows.' }
    ],
    passMark: 4
  },
  {
    id: 'af_cmp7_1',
    anchorId: 'APP-FCRA-01',
    label: 'FCRA Adverse Action Notice (Darren Hopkins)',
    instruction: 'Darren Hopkins applied for Unit 10-101 but was denied due to a credit score of 512 (minimum required: 620) reported by TransUnion Consumer Solutions. Compose the formal written FCRA Adverse Action Notice containing all mandatory statutory disclosures under 15 U.S.C. § 1681m.',
    placeholder: 'Dear Darren Hopkins, thank you for applying for Unit 10-101. We regret to inform you that your application has been denied...',
    thread: [
      { sender: 'System Screening', recipient: 'Alex Rivera', date: '2026-08-11', body: 'Screening Complete: Darren Hopkins scored 512 (TransUnion). Minimum threshold is 620. Application marked for adverse action.' }
    ],
    rubric: [
      { check: 'namesAgency', label: 'Names the consumer reporting agency (TransUnion Consumer Solutions)', why: 'Under FCRA § 615(a), the adverse action notice must identify the specific credit bureau that supplied the report.' },
      { check: 'statesAgencyNotDecisionMaker', label: 'Explicitly states the agency did NOT make the decision and cannot give reasons', why: 'The notice must clarify that the reporting agency only provided information and did not participate in the tenancy decision.' },
      { check: 'mentionsFreeReport', label: 'Informs applicant of right to obtain a free disclosure report within 60 days', why: 'FCRA requires informing the consumer of their right to a free report within 60 days of notice.' },
      { check: 'mentionsDisputeRight', label: 'Informs applicant of right to dispute inaccurate or incomplete information', why: 'The notice must advise the consumer of their right to dispute inaccuracies with the credit bureau.' }
    ],
    passMark: 4
  },
  {
    id: 'af_cmp8_1',
    anchorId: 'APP-ADA-01',
    label: 'Assistance Animal Accommodation Approval (Elena Rostova)',
    instruction: 'Elena Rostova requested a Reasonable Accommodation for an Emotional Support Animal (ESA) in a "no-pets" property, with verified medical documentation from her healthcare provider. Write a formal approval letter confirming the accommodation, stating no pet deposit/rent will be charged, while noting standard resident responsibility for animal behavior and physical property damage.',
    placeholder: 'Dear Elena Rostova, we have reviewed your request for a Reasonable Accommodation regarding your assistance animal...',
    thread: [
      { sender: 'Elena Rostova', recipient: 'Management', date: '2026-08-10', body: 'Please find attached the verification letter from my physician requesting a reasonable accommodation for my assistance animal for Unit 12-102.' }
    ],
    rubric: [
      { check: 'confirmsAccommodation', label: 'Explicitly approves the reasonable accommodation request for the assistance animal', why: 'The letter must clearly confirm that the reasonable accommodation has been granted.' },
      { check: 'noPetFeesForESA', label: 'Confirms that NO pet deposit, pet fee, or monthly pet rent will be charged', why: 'Under FHA and HUD guidelines, housing providers cannot charge pet fees or deposits for assistance animals.' },
      { check: 'statesConductAndDamageResponsibility', label: 'Outlines standard responsibility for noise/waste/leash rules and actual damage repair', why: 'While exempt from pet fees, the resident remains responsible for animal conduct, waste cleanup, and actual physical damages upon move-out.' },
      { check: 'noMedicalIntrusion', label: 'Does NOT demand confidential medical diagnoses or detailed medical history', why: 'Under Fair Housing guidelines, housing providers cannot demand confidential medical records or details about the applicant\'s specific disability.' }
    ],
    passMark: 4
  }
];


/* ============================================================================
   8. TRIAGE ITEMS BANK (AF_TRIAGE_ITEMS) — 'triage' Steps (§3)
   ============================================================================ */

const AF_TRIAGE_ITEMS = [
  {
    id: 'af_tri13_1',
    title: 'Monday Morning Operations Queue Triage',
    instruction: 'Rank the following 9 queue items in descending order of urgency (Rank 1 = Highest Priority / Immediate Action to Rank 9 = Routine / Lowest Priority) based on active physical risk, statutory legal deadlines, and fiduciary obligations.',
    items: [
      { id: 'Q-01', label: 'Active water leak flooding bathroom and downstairs ceiling (Unit 12-104)', correctRank: 1, reason: 'Active emergency causing structural property destruction and habitability failure.' },
      { id: 'Q-02', label: 'Texas Security Deposit Refund on Day 28 of 30 statutory days (Samuel Oak)', correctRank: 2, reason: 'Texas Prop. Code § 92.103 deadline expires in 48 hours; missing it triggers 3x bad faith penalty.' },
      { id: 'Q-03', label: 'Issue FCRA Adverse Action Notice for denied applicant from Friday (Darren Hopkins)', correctRank: 3, reason: 'Mandatory statutory notification window under federal Fair Credit Reporting Act.' },
      { id: 'Q-04', label: 'Send 3-Day Notice to Vacate to 45-day delinquent tenant (DeShawn Williams)', correctRank: 4, reason: 'Statutory prerequisite under Texas Prop. Code § 24.005 before filing eviction.' },
      { id: 'Q-05', label: 'Issue 24-Hour Notice of Intent to Enter for scheduled plumbing repair tomorrow', correctRank: 5, reason: 'Contractual lease requirement prior to technician entering occupied unit.' },
      { id: 'Q-06', label: 'Follow-up on AC compressor repair ticket during Texas summer weather', correctRank: 6, reason: 'High priority maintenance repair affecting tenant comfort and lease covenants.' },
      { id: 'Q-07', label: 'Reply to rental inquiry received over weekend on available vacant unit', correctRank: 7, reason: 'Leasing lead conversion within standard 24-48 hour response window.' },
      { id: 'Q-08', label: 'Review and approve routine landscaping vendor invoice', correctRank: 8, reason: 'Standard accounts payable processing within 30-day net vendor terms.' },
      { id: 'Q-09', label: 'Review draft July monthly owner operating statement', correctRank: 9, reason: 'Routine monthly accounting deliverable due by 15th of the month.' }
    ]
  }
];


/* ============================================================================
   9. RUBRIC CHECK PREDICATES (AF_RUBRIC_CHECKS) — Deterministic Compose Grading (§6)
   ============================================================================ */

const AF_RUBRIC_CHECKS = {
  describesUnitFeatures: function (text) {
    if (!text || text.trim().length < 20) return false;
    const t = text.toLowerCase();
    return /\b(bedroom|bed|bath|bathroom|sqft|square feet|kitchen|balcony|patio|amenities|layout|floorplan|unit|spacious|appliances|rent)\b/i.test(t);
  },

  noFamilyStereotypes: function (text) {
    if (!text || text.trim().length < 20) return false;
    const t = text.toLowerCase();
    const forbidden = [
      'no kids', 'no children', 'quiet singles', 'mature adults', 'not safe for kids',
      'not suitable for children', 'not good for babies', 'better for couples', 'families only',
      'bachelor pad', 'adult building', 'christian community', 'ideal for singles'
    ];
    return !forbidden.some(function (phrase) { return t.indexOf(phrase) !== -1; });
  },

  invitesApplicationOrTour: function (text) {
    if (!text || text.trim().length < 20) return false;
    const t = text.toLowerCase();
    return /\b(tour|showing|schedule|visit|apply|application|view the unit|see the apartment|welcome to tour|portal)\b/i.test(t);
  },

  givesTimeframe: function (text) {
    if (!text || text.trim().length < 20) return false;
    const t = text.toLowerCase();
    return /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|hours|9am|5pm|am|pm|business hours|days|week|within)\b/i.test(t) ||
           /\b(8:00|9:00|10:00|1:00|2:00|3:00|4:00|5:00)\b/i.test(t);
  },

  namesAgency: function (text) {
    if (!text || text.trim().length < 20) return false;
    const t = text.toLowerCase();
    return /\b(transunion|experian|equifax|consumer reporting agency|credit bureau)\b/i.test(t);
  },

  statesAgencyNotDecisionMaker: function (text) {
    if (!text || text.trim().length < 20) return false;
    const t = text.toLowerCase();
    return /\b(did not make|does not make|not the decision maker|unable to provide specific reasons|cannot provide reasons|only provided the report)\b/i.test(t) ||
           /\b(agency did not make the decision|bureau did not make)\b/i.test(t);
  },

  mentionsFreeReport: function (text) {
    if (!text || text.trim().length < 20) return false;
    const t = text.toLowerCase();
    return /\b(60 days|free copy|free disclosure|free report|request a copy|obtain a free)\b/i.test(t);
  },

  mentionsDisputeRight: function (text) {
    if (!text || text.trim().length < 20) return false;
    const t = text.toLowerCase();
    return /\b(dispute|inaccurate|incomplete|right to dispute|dispute inaccurate information)\b/i.test(t);
  },

  confirmsAccommodation: function (text) {
    if (!text || text.trim().length < 20) return false;
    const t = text.toLowerCase();
    return /\b(approved|grant|granted|accept|accommodat(ion|ed)|assistance animal|emotional support animal|service animal)\b/i.test(t);
  },

  noPetFeesForESA: function (text) {
    if (!text || text.trim().length < 20) return false;
    const t = text.toLowerCase();
    if (/\b(charge a pet deposit|pay a pet deposit|pet fee of \$|pet rent of \$|\$300 pet deposit|\$35 pet rent)\b/i.test(t)) {
      return false;
    }
    return /\b(no pet deposit|no pet rent|no pet fee|waived|exempt|zero pet fees|not subject to pet fees|no additional fees)\b/i.test(t) ||
           !/\b(must pay|required to pay)\s+a\s+pet\b/i.test(t);
  },

  statesConductAndDamageResponsibility: function (text) {
    if (!text || text.trim().length < 20) return false;
    const t = text.toLowerCase();
    return /\b(damage|waste|leash|noise|responsible for any damage|community rules|behavior|clean up)\b/i.test(t);
  },

  noMedicalIntrusion: function (text) {
    if (!text || text.trim().length < 20) return false;
    const t = text.toLowerCase();
    const bad = ['medical diagnosis', 'exact medical condition', 'full medical records', 'therapy notes', 'proof of illness'];
    return !bad.some(function (p) { return t.indexOf(p) !== -1; });
  }
};


/* ============================================================================
   10. EXAM BLUEPRINT & EXAM BANK (AF_EXAM_BANK) — 24 Questions Blueprint (§4)
   ============================================================================ */

const AF_EXAM_BLUEPRINT = [
  { category: 'compliance', count: 8 },  // Fair Housing, FCRA, Assistance Animals, Clocks, Fiduciary
  { category: 'ledger',     count: 4 },  // Ledgers, Balance Chains, Financial Verifications
  { category: 'numeric',    count: 3 },  // Exact Financial / Arithmetic Calculations
  { category: 'judgment',   count: 6 },  // Operational & Property Management Decisions
  { category: 'written',    count: 3 }   // Written Compose Rubrics
];

const AF_EXAM_PASS_PCT = 0.8; // 80% pass threshold (20 / 24 correct)

const AF_EXAM_BANK = [
  /* CATEGORY: compliance (16 items) */
  {
    id: 'EX-CMP-01',
    category: 'compliance',
    type: 'decide',
    title: 'Fair Housing: Familial Status Inquiries',
    situation: 'A prospect calls asking if your community is safe for twin toddlers. Which response complies with 42 U.S.C. § 3604(c)?',
    options: [
      'Tell them the community is better suited for working singles without kids.',
      'State that all families are welcome and offer details on available 2-bedroom floorplans, square footage, and lease terms.',
      'Direct them to a specific family-only wing in the building.',
      'Refuse to answer until you meet the children in person.'
    ],
    correct: 1,
    explanation: 'Under Fair Housing Act 42 U.S.C. § 3604(c), steering prospects based on familial status or discouraging families with children is unlawful.'
  },
  {
    id: 'EX-CMP-02',
    category: 'compliance',
    type: 'decide',
    title: 'FCRA: Mandatory Adverse Action Notice Triggers',
    situation: 'When an applicant is denied tenancy based wholly or partly on a consumer credit report, what does 15 U.S.C. § 1681m require?',
    options: [
      'A verbal phone call without written documentation.',
      'A written Adverse Action Notice containing agency contact information, disclosure of 60-day free report right, and dispute rights.',
      'Immediate destruction of all applicant records within 24 hours.',
      'Forwarding the credit report to other apartment complexes in the area.'
    ],
    correct: 1,
    explanation: 'FCRA § 615(a) requires providing written notice of adverse action specifying the agency that supplied the report and statutory dispute rights.'
  },
  {
    id: 'EX-CMP-03',
    category: 'compliance',
    type: 'decide',
    title: 'Assistance Animals: Pet Deposits and Pet Rent',
    situation: 'Under HUD and FHA regulations, what fees may a landlord charge for a verified assistance animal (service animal or ESA)?',
    options: [
      'Standard pet deposit and $50 monthly pet rent.',
      'Double the normal security deposit to offset extra wear.',
      'Zero pet deposit, zero pet rent, and zero pet application fees.',
      'A non-refundable $500 cleaning surcharge upon move-in.'
    ],
    correct: 2,
    explanation: 'Under FHA and HUD guidelines, assistance animals are not pets. Housing providers cannot charge pet fees, deposits, or surcharges.'
  },
  {
    id: 'EX-CMP-04',
    category: 'compliance',
    type: 'decide',
    title: 'Texas Security Deposit Clock Deadline',
    situation: 'Under Texas Property Code § 92.103, within how many days must a landlord refund a security deposit after the tenant surrenders premises and provides a forwarding address?',
    options: [
      '14 calendar days.',
      '21 business days.',
      '30 calendar days.',
      '60 calendar days.'
    ],
    correct: 2,
    explanation: 'Texas Property Code § 92.103 establishes a strict 30-day calendar deadline for returning tenant security deposits and itemized deductions.'
  },
  {
    id: 'EX-CMP-05',
    category: 'compliance',
    type: 'decide',
    title: 'Texas Security Deposit Bad Faith Penalties',
    situation: 'What is the statutory penalty under Texas Property Code § 92.109 if a landlord in bad faith fails to return or account for a security deposit within 30 days?',
    options: [
      '$50 administrative fine paid to the city council.',
      '$100 plus three times the portion of the deposit wrongfully withheld, plus reasonable attorney fees.',
      'Forfeiture of the physical real estate property to the county.',
      'Zero penalty if the landlord apologizes in writing.'
    ],
    correct: 1,
    explanation: 'Texas Property Code § 92.109(a) imposes statutory liability equal to $100 plus 3x the deposit amount wrongfully withheld, plus attorney fees.'
  },
  {
    id: 'EX-CMP-06',
    category: 'compliance',
    type: 'decide',
    title: 'Fiduciary Trust Escrow Accounts',
    situation: 'Under Texas Real Estate Commission (TREC) rules and fiduciary trust principles, where must tenant security deposits be deposited?',
    options: [
      'In the property manager\'s personal checking account.',
      'In a dedicated, segregated Security Deposit Trust Escrow Account held in an insured financial institution.',
      'In the property owner\'s stock investment portfolio.',
      'In petty cash envelopes kept inside the leasing office desk.'
    ],
    correct: 1,
    explanation: 'Trust funds including tenant security deposits must be maintained in designated fiduciary escrow accounts, strictly segregated from operating funds.'
  },
  {
    id: 'EX-CMP-07',
    category: 'compliance',
    type: 'decide',
    title: 'Landlord Notice of Entry in Texas',
    situation: 'In Texas, what legal principle and lease term governs landlord entry into an occupied rental unit for non-emergency routine inspections?',
    options: [
      'Landlords have unlimited unrestricted access at any hour without notice.',
      'Entry is governed by the written lease contract terms and the common law implied covenant of quiet enjoyment, requiring advance reasonable notice.',
      'Texas Property Code requires police accompaniment for every entry.',
      'Tenants may never allow landlords into the unit under any circumstance.'
    ],
    correct: 1,
    explanation: 'Landlord entry rights in Texas are contractual (standard lease paragraph 14) and subject to the covenant of quiet enjoyment, requiring advance notice.'
  },
  {
    id: 'EX-CMP-08',
    category: 'compliance',
    type: 'decide',
    title: 'Texas Late Fee Notice & Grace Period Requirements',
    situation: 'Under Texas Property Code § 92.019, when is a late fee legally permissible?',
    options: [
      'On the 1st of the month at 12:01 AM without a written lease agreement.',
      'Only when written into the lease, reasonable in amount, and after a statutory grace period of at least two full days after the rent due date.',
      'Whenever the property manager feels the tenant was impolite.',
      'Only if approved by a city court magistrate in advance.'
    ],
    correct: 1,
    explanation: 'Texas Property Code § 92.019 requires written notice in the lease, a reasonable fee amount, and a minimum 2-day statutory grace period.'
  },
  {
    id: 'EX-CMP-09',
    category: 'compliance',
    type: 'decide',
    title: 'Fair Housing: Service Animal vs Emotional Support Animal',
    situation: 'How does the Fair Housing Act treat Emotional Support Animals (ESAs) compared to ADA Title III public accommodations?',
    options: [
      'FHA covers both trained service animals and untrained emotional support animals as reasonable accommodations in housing.',
      'FHA only allows miniature horses in residential properties.',
      'FHA completely excludes ESAs from residential apartments.',
      'FHA allows landlords to require ESA certification from state police.'
    ],
    correct: 0,
    explanation: 'While ADA Title III is limited to trained service dogs in public places, the Fair Housing Act broader standard includes emotional support animals as reasonable accommodations.'
  },
  {
    id: 'EX-CMP-10',
    category: 'compliance',
    type: 'decide',
    title: 'FCRA: Applicant Dispute Rights',
    situation: 'If an applicant disputes an inaccurate collection record on their TransUnion credit report following an adverse action notice, who investigates the dispute?',
    options: [
      'The property manager must personally audit the creditor\'s bank records.',
      'The consumer reporting agency (TransUnion) must conduct a reasonable reinvestigation within 30 days under FCRA 15 U.S.C. § 1681i.',
      'The applicant must file a federal lawsuit before getting a response.',
      'The local fire department reviews credit disputes.'
    ],
    correct: 1,
    explanation: 'Under 15 U.S.C. § 1681i, consumer reporting agencies are statutory entities required to reinvestigate disputed items free of charge within 30 days.'
  },
  {
    id: 'EX-CMP-11',
    category: 'compliance',
    type: 'decide',
    title: 'Commingling of Property Management Funds',
    situation: 'What occurs when a property manager transfers money from the tenant security deposit escrow account to pay for office payroll?',
    options: [
      'A standard accounting efficiency procedure.',
      'Unlawful commingling and conversion of fiduciary trust funds, subjecting the licensee to revocation and legal liability.',
      'A tax-deductible employee benefit under Texas law.',
      'An allowable cash-flow optimization strategy.'
    ],
    correct: 1,
    explanation: 'Using tenant trust deposits for company operations is unlawful conversion and illegal commingling of client funds.'
  },
  {
    id: 'EX-CMP-12',
    category: 'compliance',
    type: 'decide',
    title: 'Texas Notice to Vacate Prior to Eviction',
    situation: 'Under Texas Property Code § 24.005, what notice must be given prior to filing a forcible detainer suit for non-payment of rent, unless contracted otherwise?',
    options: [
      'At least 3 days\' written notice to vacate.',
      '30 days\' verbal warning by telephone.',
      '6 months\' registered mail notice.',
      'No notice is required under Texas law.'
    ],
    correct: 0,
    explanation: 'Texas Property Code § 24.005 requires at least 3 days\' written notice to vacate before filing an eviction suit, unless the lease specifies a different period.'
  },
  {
    id: 'EX-CMP-13',
    category: 'compliance',
    type: 'decide',
    title: 'Fair Housing: Source of Income & Voucher Policies',
    situation: 'When managing properties in jurisdictions with Source of Income anti-discrimination protections, how must Housing Choice Vouchers (Section 8) be treated?',
    options: [
      'Automatically reject all voucher holders without review.',
      'Evaluate voucher holders using the same non-discriminatory criteria, applying income thresholds only to the tenant\'s portion of rent.',
      'Charge triple rent to voucher holders.',
      'Require voucher applicants to post cash bonds directly to staff.'
    ],
    correct: 1,
    explanation: 'Where source of income protections apply, housing providers must accept voucher payments and assess income ratios based on the tenant\'s individual share.'
  },
  {
    id: 'EX-CMP-14',
    category: 'compliance',
    type: 'decide',
    title: 'Vendor COI Additional Insured Requirements',
    situation: 'Why must a property management company require vendors to name both the Property Management Company and Property Owner as Additional Insured on their COI?',
    options: [
      'To provide direct liability protection under the contractor\'s insurance policy if third-party injury or damage occurs during work.',
      'To allow the property manager to drive the vendor\'s vehicles.',
      'To make the vendor pay the owner\'s personal income taxes.',
      'To avoid having to pay the contractor for completed repairs.'
    ],
    correct: 0,
    explanation: 'An Additional Insured endorsement extends defense and indemnity coverage to the property owner and manager if vendor operations result in claims.'
  },
  {
    id: 'EX-CMP-15',
    category: 'compliance',
    type: 'decide',
    title: 'Move-Out Deductions: Normal Wear & Tear vs Damage',
    situation: 'Under Texas Property Code § 92.104(b), which of the following items is a lawful deduction from a tenant security deposit?',
    options: [
      'Faded paint caused by normal sunlight exposure over 3 years.',
      'Minor scuff marks on high-traffic hallway baseboards.',
      'A large hole kicked into the bedroom drywall and broken window glass.',
      'Worn carpet pile in the living room walkway after a 5-year tenancy.'
    ],
    correct: 2,
    explanation: 'Landlords cannot deduct for normal wear and tear resulting from ordinary habitation. Broken glass and large drywall holes represent tenant negligence/damage.'
  },
  {
    id: 'EX-CMP-16',
    category: 'compliance',
    type: 'decide',
    title: 'Lead-Based Paint Disclosure Disclosures (1978 Rule)',
    situation: 'Federal law (42 U.S.C. § 4852d) requires what disclosure for residential leases built prior to 1978?',
    options: [
      'A completed EPA Lead-Based Paint Disclosure Addendum and EPA "Protect Your Family From Lead In Your Home" pamphlet.',
      'Complete mandatory replacement of all walls before leasing.',
      'Zero disclosures are required for rental properties.',
      'A verbal statement that lead paint does not exist.'
    ],
    correct: 0,
    explanation: 'Target housing constructed before 1978 requires the EPA Lead-Based Paint Disclosure and informational pamphlet prior to lease execution.'
  },

  /* CATEGORY: ledger (8 items) */
  {
    id: 'EX-LDG-01',
    category: 'ledger',
    type: 'verify',
    title: 'Ledger Audit: Charge and Balance Chain',
    instruction: 'Review the 4-month resident ledger below. Identify the transaction where balanceAfter was calculated incorrectly.',
    entries: [
      { id: 'E1', date: '2026-05-01', type: 'charge', desc: 'Rent', amount: 200000, balanceAfter: 200000 },
      { id: 'E2', date: '2026-05-02', type: 'payment', desc: 'ACH Payment', amount: 200000, balanceAfter: 0 },
      { id: 'E3', date: '2026-06-01', type: 'charge', desc: 'Rent', amount: 200000, balanceAfter: 200000 },
      { id: 'E4', date: '2026-06-05', type: 'charge', desc: 'Late Fee', amount: 5000, balanceAfter: 225000 } // BROKEN: should be 205000!
    ],
    targetEntryId: 'E4',
    explanation: 'Entry E4 added a $50.00 late fee ($5,000 cents) to a $2,000.00 balance, which should equal $2,050.00 ($205,000 cents), but was miscalculated as $2,250.00.'
  },
  {
    id: 'EX-LDG-02',
    category: 'ledger',
    type: 'verify',
    title: 'Ledger Audit: Partial Payment Credit Chain',
    instruction: 'Identify the row in the resident ledger where a partial payment credit failed to subtract correctly.',
    entries: [
      { id: 'E1', date: '2026-07-01', type: 'charge', desc: 'Rent', amount: 150000, balanceAfter: 150000 },
      { id: 'E2', date: '2026-07-06', type: 'charge', desc: 'Late Fee', amount: 5000, balanceAfter: 155000 },
      { id: 'E3', date: '2026-07-10', type: 'payment', desc: 'Check Payment', amount: 80000, balanceAfter: 105000 }, // BROKEN: 155000 - 80000 = 75000!
      { id: 'E4', date: '2026-07-20', type: 'payment', desc: 'Settlement', amount: 75000, balanceAfter: 0 }
    ],
    targetEntryId: 'E3',
    explanation: 'Entry E3 subtracted $800.00 ($80,000 cents) from $1,550.00, which yields $750.00 ($75,000 cents), not $1,050.00.'
  },
  {
    id: 'EX-LDG-03',
    category: 'ledger',
    type: 'verify',
    title: 'Ledger Audit: Security Deposit Holding Account Balance',
    instruction: 'Audit the bank account balance reconciliation. Which bank ledger entry misstates total active lease deposits held?',
    entries: [
      { id: 'B1', date: '2026-08-01', desc: 'July Active Deposits Sum', amount: 11455000, balanceAfter: 11455000 },
      { id: 'B2', date: '2026-08-05', desc: 'Unit 10-101 New Deposit Collected', amount: 195000, balanceAfter: 11650000 },
      { id: 'B3', date: '2026-08-10', desc: 'Unit 05-01 Deposit Refund Disbursed', amount: -237000, balanceAfter: 11800000 } // BROKEN: subtract!
    ],
    targetEntryId: 'B3',
    explanation: 'Entry B3 disbursed a $2,370.00 refund, which should reduce escrow balance to $114,130.00 ($11,413,000 cents), but increased it to $11,800,000 cents.'
  },
  {
    id: 'EX-LDG-04',
    category: 'ledger',
    type: 'verify',
    title: 'Ledger Audit: Pet Rent Assessment Chain',
    instruction: 'Identify the entry in Marcus Vance\'s ledger where pet rent was omitted from a monthly rent billing cycle.',
    entries: [
      { id: 'PR1', date: '2026-06-01', type: 'charge', desc: 'Monthly Base Rent', amount: 185000, balanceAfter: 185000 },
      { id: 'PR2', date: '2026-06-01', type: 'charge', desc: 'Monthly Pet Rent (Dog)', amount: 3500, balanceAfter: 188500 },
      { id: 'PR3', date: '2026-07-01', type: 'charge', desc: 'Monthly Base Rent', amount: 185000, balanceAfter: 373500 }, // Missing pet rent!
      { id: 'PR4', date: '2026-07-03', type: 'payment', desc: 'ACH Payment', amount: 377000, balanceAfter: -3500 }
    ],
    targetEntryId: 'PR3',
    explanation: 'Entry PR3 omitted the recurring $35.00 monthly pet rent charge on July 1st, causing the resident payment on July 3rd to show an artificial credit.'
  },
  {
    id: 'EX-LDG-05',
    category: 'ledger',
    type: 'verify',
    title: 'Owner Statement Audit: Management Fee Calculation',
    instruction: 'Review the owner statement ledger rows. Select the row where the 8% management fee was computed incorrectly.',
    entries: [
      { id: 'OS1', date: '2026-08-01', desc: 'Gross Rents Collected', amount: 1000000, balanceAfter: 1000000 },
      { id: 'OS2', date: '2026-08-01', desc: 'Management Fee (8%)', amount: -180000, balanceAfter: 820000 }, // 8% of 1000000 is 80000!
      { id: 'OS3', date: '2026-08-03', desc: 'Repairs Disbursed', amount: -150000, balanceAfter: 670000 }
    ],
    targetEntryId: 'OS2',
    explanation: 'An 8% management fee on $10,000.00 ($1,000,000 cents) equals $800.00 ($80,000 cents), not $1,800.00 ($180,000 cents).'
  },
  {
    id: 'EX-LDG-06',
    category: 'ledger',
    type: 'verify',
    title: 'Ledger Audit: Utility Pass-Through Charge Post',
    instruction: 'Identify the discrepancy in utility allocation billing on the resident ledger.',
    entries: [
      { id: 'U1', date: '2026-07-01', type: 'charge', desc: 'Base Rent', amount: 140000, balanceAfter: 140000 },
      { id: 'U2', date: '2026-07-01', type: 'charge', desc: 'Submetered Water Utility', amount: 6500, balanceAfter: 146500 },
      { id: 'U3', date: '2026-07-02', type: 'payment', desc: 'Resident ACH', amount: 146500, balanceAfter: 6500 } // Should be 0
    ],
    targetEntryId: 'U3',
    explanation: 'Resident paid the full $1,465.00 ($146,500 cents), but the ledger balanceAfter was recorded as $65.00 instead of $0.00.'
  },
  {
    id: 'EX-LDG-07',
    category: 'ledger',
    type: 'verify',
    title: 'Ledger Audit: Concession Credit Application',
    instruction: 'Select the entry where a one-time move-in concession credit was improperly charged instead of credited.',
    entries: [
      { id: 'C1', date: '2026-08-01', type: 'charge', desc: 'First Month Rent', amount: 220000, balanceAfter: 220000 },
      { id: 'C2', date: '2026-08-01', type: 'charge', desc: 'Move-in Concession ($500 off)', amount: 50000, balanceAfter: 270000 }, // Should be credit/negative!
      { id: 'C3', date: '2026-08-02', type: 'payment', desc: 'Net Move-in Payment', amount: 170000, balanceAfter: 100000 }
    ],
    targetEntryId: 'C2',
    explanation: 'A $500.00 rental concession is a credit that reduces tenant balance, but entry C2 entered it as a debit charge, increasing the balance.'
  },
  {
    id: 'EX-LDG-08',
    category: 'ledger',
    type: 'verify',
    title: 'Ledger Audit: NSF Return Fee Chain',
    instruction: 'Identify the entry where an NSF bounced check return failed to reverse the original payment.',
    entries: [
      { id: 'N1', date: '2026-08-01', type: 'charge', desc: 'Rent', amount: 160000, balanceAfter: 160000 },
      { id: 'N2', date: '2026-08-02', type: 'payment', desc: 'Personal Check #104', amount: 160000, balanceAfter: 0 },
      { id: 'N3', date: '2026-08-06', type: 'charge', desc: 'NSF Returned Check #104', amount: 160000, balanceAfter: 160000 },
      { id: 'N4', date: '2026-08-06', type: 'charge', desc: 'NSF Bank Handling Fee', amount: 3500, balanceAfter: 160000 } // Should be 163500!
    ],
    targetEntryId: 'N4',
    explanation: 'Adding a $35.00 ($3,500 cents) NSF administrative charge to a $1,600.00 balance must increase balanceAfter to $1,635.00 ($163,500 cents).'
  },

  /* CATEGORY: numeric (6 items) */
  {
    id: 'EX-NUM-01',
    category: 'numeric',
    type: 'decide',
    title: 'Calculate 8% Property Management Fee',
    situation: 'A 10-unit residential property collects $24,500.00 in gross rental income in July. The management agreement specifies an 8% management fee on collected income. What is the exact management fee in integer cents?',
    options: [
      '$1,960.00 (196,000 cents)',
      '$2,450.00 (245,000 cents)',
      '$1,800.00 (180,000 cents)',
      '$2,000.00 (200,000 cents)'
    ],
    correct: 0,
    explanation: '$24,500.00 * 0.08 = $1,960.00 (196,000 cents).'
  },
  {
    id: 'EX-NUM-02',
    category: 'numeric',
    type: 'decide',
    title: 'Calculate Net Security Deposit Refund',
    situation: 'A tenant paid a $2,200.00 security deposit. Upon move-out, itemized lawful deductions are: $240.00 (carpet cleaning for stains), $160.00 (drywall patch), and $75.00 (unpaid final water utility). What is the exact refund check amount?',
    options: [
      '$1,725.00 (172,500 cents)',
      '$1,800.00 (180,000 cents)',
      '$1,650.00 (165,000 cents)',
      '$2,200.00 (220,000 cents)'
    ],
    correct: 0,
    explanation: '$2,200.00 - ($240.00 + $160.00 + $75.00) = $2,200.00 - $475.00 = $1,725.00 (172,500 cents).'
  },
  {
    id: 'EX-NUM-03',
    category: 'numeric',
    type: 'decide',
    title: 'Calculate Portfolio Occupancy Percentage',
    situation: 'A property portfolio has 85 total residential units. 72 units are currently occupied with active leases. What is the portfolio occupancy rate rounded to the nearest whole percent?',
    options: [
      '85%',
      '80%',
      '90%',
      '72%'
    ],
    correct: 0,
    explanation: '(72 / 85) * 100 = 84.705% ≈ 85%.'
  },
  {
    id: 'EX-NUM-04',
    category: 'numeric',
    type: 'decide',
    title: 'Calculate Prorated Rent for Mid-Month Move-In',
    situation: 'A resident moves in on August 16th in an August with 31 calendar days. The regular monthly rent is $1,860.00. Using standard daily proration (Monthly Rent / Days in Month * Days Occupied), what is the prorated rent for August 16 through August 31 (16 days)?',
    options: [
      '$960.00 (96,000 cents)',
      '$930.00 (93,000 cents)',
      '$1,000.00 (100,000 cents)',
      '$880.00 (88,000 cents)'
    ],
    correct: 0,
    explanation: 'Daily rate = $1,860.00 / 31 = $60.00/day. For 16 days (Aug 16-31 inclusive), rent = 16 * $60.00 = $960.00 (96,000 cents).'
  },
  {
    id: 'EX-NUM-05',
    category: 'numeric',
    type: 'decide',
    title: 'Calculate Statutory 3x Deposit Bad Faith Penalty',
    situation: 'A landlord in bad faith wrongfully withholds a former tenant\'s $1,500.00 security deposit past the 30-day Texas statutory deadline. Under Texas Property Code § 92.109 ($100 + 3x deposit amount withheld), what is the total statutory damage penalty owed to the tenant (excluding attorney fees)?',
    options: [
      '$4,600.00 (460,000 cents)',
      '$3,000.00 (300,000 cents)',
      '$1,600.00 (160,000 cents)',
      '$5,000.00 (500,000 cents)'
    ],
    correct: 0,
    explanation: 'Statutory damages = $100.00 + (3 * $1,500.00) = $100.00 + $4,500.00 = $4,600.00 (460,000 cents).'
  },
  {
    id: 'EX-NUM-06',
    category: 'numeric',
    type: 'decide',
    title: 'Calculate Net Owner Distribution',
    situation: 'A property collected $12,000.00 in rental income. Operating expenses were $3,200.00, the management fee was $960.00 (8%), and the required minimum property operating reserve is $1,000.00. The starting cash balance was $1,000.00 (meeting reserve). What is the maximum net distribution available to the owner?',
    options: [
      '$7,840.00 (784,000 cents)',
      '$8,800.00 (880,000 cents)',
      '$12,000.00 (1,200,000 cents)',
      '$6,840.00 (684,000 cents)'
    ],
    correct: 0,
    explanation: 'Income ($12,000.00) - Expenses ($3,200.00) - Management Fee ($960.00) = $7,840.00 (784,000 cents).'
  },

  /* CATEGORY: judgment (12 items) */
  {
    id: 'EX-JDG-01',
    category: 'judgment',
    type: 'decide',
    title: 'Emergency Maintenance Response Protocol',
    situation: 'At 10:00 PM on a Friday in July, a resident in Plano, TX reports that their central air conditioner is blowing warm air and the indoor temperature is 92°F. How should property management triage this request?',
    options: [
      'Classify as an urgent habitability emergency and immediately dispatch the on-call HVAC vendor under emergency protocol.',
      'Leave a voicemail for the regular repairman to check it on Monday morning.',
      'Tell the tenant to open the windows and buy a fan.',
      'Charge the resident an after-hours surcharge before looking up a technician.'
    ],
    correct: 0,
    explanation: 'Under Texas property management standards and weather conditions, AC failure during high summer heat constitutes an urgent habitability issue requiring immediate on-call emergency response.'
  },
  {
    id: 'EX-JDG-02',
    category: 'judgment',
    type: 'decide',
    title: 'Handling Domestic Violence Lock Change Requests',
    situation: 'A tenant provides a certified copy of a court protective order and requests an immediate lock change under Texas Property Code § 92.0163. What is management\'s duty?',
    options: [
      'Promptly change the locks within statutory timeframe without charging an unreasonable fee, excluding the restrained individual.',
      'Refuse to change locks unless the restrained party signs a written permission slip.',
      'Tell the tenant they must move out immediately.',
      'Demand payment of full remaining annual lease rent in cash before changing locks.'
    ],
    correct: 0,
    explanation: 'Texas Property Code § 92.0163 mandates that landlords must change locks for tenants who provide valid protective orders, excluding the perpetrator from access.'
  },
  {
    id: 'EX-JDG-03',
    category: 'judgment',
    type: 'decide',
    title: 'Applicant Screening: Disparate Impact Prevention',
    situation: 'A property owner asks management to reject all applicants with any criminal arrest record that did not result in a conviction. How should management advise the owner under HUD 2016 Guidance?',
    options: [
      'Advise the owner that blanket exclusions based on arrest records (without conviction) violate Fair Housing disparate impact guidelines, and adhere to an individualized assessment policy.',
      'Agree immediately and update marketing materials to say "No Arrest Records".',
      'Double the application fee for anyone who has ever been questioned by police.',
      'Report the applicant to the federal immigration authority.'
    ],
    correct: 0,
    explanation: 'HUD 2016 Guidance on Criminal Records establishes that blanket exclusions based on arrests (which do not prove unlawful conduct) produce an unlawful disparate impact under the Fair Housing Act.'
  },
  {
    id: 'EX-JDG-04',
    category: 'judgment',
    type: 'decide',
    title: 'Handling Resident Noise Complaints',
    situation: 'A tenant complains of loud music from an upstairs neighbor at 1:00 AM on a Tuesday. What is the progressive management response?',
    options: [
      'Investigate the complaint, issue a written Lease Violation Warning citing the community quiet hours policy, and document the notice in the resident file.',
      'File an immediate eviction lawsuit without warning.',
      'Ignore the tenant and block their phone number.',
      'Tell the downstairs neighbor to go upstairs and confront the tenant physically.'
    ],
    correct: 0,
    explanation: 'Progressive property management handles lease non-compliance through documented inquiry, formal written notice of violation, and escalating lease enforcement.'
  },
  {
    id: 'EX-JDG-05',
    category: 'judgment',
    type: 'decide',
    title: 'Move-Out Walkthrough & Key Return Protocol',
    situation: 'A tenant moving out drops their keys in the office drop-box on August 10th without attending a scheduled walkthrough, but includes a written letter with their forwarding address. When does the 30-day Texas deposit clock begin?',
    options: [
      'On August 10th (the date premises were surrendered and forwarding address provided in writing).',
      'The clock never begins because the tenant did not attend the walkthrough.',
      'On December 31st.',
      '30 days after the owner inspects the property in person.'
    ],
    correct: 0,
    explanation: 'Under Texas Property Code § 92.103 & § 92.107, surrender occurs when possession/keys are returned, and the 30-day clock runs once the written forwarding address is provided.'
  },
  {
    id: 'EX-JDG-06',
    category: 'judgment',
    type: 'decide',
    title: 'Evaluating Maintenance Repair Invoices vs Vendor Estimates',
    situation: 'A plumbing contractor submits a final repair invoice for $1,850.00 when the approved work order estimate was $600.00. No change order was requested or approved. What should the property manager do?',
    options: [
      'Pay the $1,850.00 without questioning the vendor.',
      'Place the invoice on hold, review scope with the vendor against the approved work order estimate, and request documentation or adjustment before disbursement.',
      'Pay the invoice using tenant security deposit trust funds.',
      'Deduct the $1,250.00 difference from the tenant\'s monthly rent.'
    ],
    correct: 1,
    explanation: 'Fiduciary duty to the property owner requires verifying unauthorized cost overruns against approved estimates prior to disbursing operating funds.'
  },
  {
    id: 'EX-JDG-07',
    category: 'judgment',
    type: 'decide',
    title: 'Resident Request for Lease Modification (ADA Ramp)',
    situation: 'A mobility-impaired resident requests permission to install a temporary wheelchair ramp over two front porch steps at their own expense. How must management respond under 42 U.S.C. § 3604(f)(3)(A)?',
    options: [
      'Approve the Reasonable Modification at the resident\'s expense, with reasonable restoration terms upon move-out if appropriate.',
      'Refuse permission because it changes the aesthetic appearance of the exterior.',
      'Demand $5,000 cash upfront as an aesthetic penalty fee.',
      'Evict the tenant for making alteration requests.'
    ],
    correct: 0,
    explanation: 'Under Fair Housing Act 42 U.S.C. § 3604(f)(3)(A), landlords must permit reasonable modifications of existing premises at the disabled resident\'s expense.'
  },
  {
    id: 'EX-JDG-08',
    category: 'judgment',
    type: 'decide',
    title: 'Lease Renewal Strategy: 60-Day Expiration Windows',
    situation: 'A high-performing resident\'s lease expires in 60 days. Market rent has increased by 6%. What is the best property management practice?',
    options: [
      'Send a formal renewal offer 45-60 days prior to expiration detailing renewal term options, modest market adjustments, and deadline to respond.',
      'Wait until the last day of the lease and lock the tenant out if they have not signed.',
      'Automatically terminate the tenancy without offering renewal.',
      'Increase rent by 100% without written notice.'
    ],
    correct: 0,
    explanation: 'Proactive renewal management (60-day notice window) stabilizes occupancy, minimizes turnover costs, and provides predictability for owners and residents.'
  },
  {
    id: 'EX-JDG-09',
    category: 'judgment',
    type: 'decide',
    title: 'Handling Abandoned Property in Texas',
    situation: 'A tenant vacates leaving behind furniture and clothing. The lease contains a standard Texas abandonment clause and keys were returned. How should the personal property be handled?',
    options: [
      'Follow the contractual lease terms and Texas Property Code procedures regarding inventory, storage, notice, and lawful disposition of abandoned property.',
      'Sell the property immediately in a private garage sale and keep the cash.',
      'Throw everything into the city storm drain.',
      'Give the items to other building tenants without documentation.'
    ],
    correct: 0,
    explanation: 'Property managers must follow statutory and contractual abandonment procedures, documenting inventory and providing notice before disposition.'
  },
  {
    id: 'EX-JDG-10',
    category: 'judgment',
    type: 'decide',
    title: 'Managing Co-Owner Disputes on Property Disbursals',
    situation: 'A property is co-owned 50/50 by two siblings who are in a legal dispute. One sibling demands that 100% of owner proceeds be disbursed solely to their personal account. How should management proceed?',
    options: [
      'Disburse strictly in accordance with the executed Property Management Agreement and ownership split on file (50/50) unless both owners provide a joint written amendment or court order.',
      'Give 100% to whichever sibling calls the office first.',
      'Keep all rental money in the property manager\'s pocket.',
      'Refuse to collect rent from tenants.'
    ],
    correct: 0,
    explanation: 'Property managers are bound by the written management agreement and official ownership percentages, requiring joint agreement or judicial orders to alter splits.'
  },
  {
    id: 'EX-JDG-11',
    category: 'judgment',
    type: 'decide',
    title: 'Preventing Unauthorized Subletting & Short-Term Rentals',
    situation: 'A property manager discovers a tenant has listed their long-term apartment on Airbnb without authorization, in violation of Lease Paragraph 28. What is the appropriate initial response?',
    options: [
      'Issue a formal Notice of Lease Violation specifying the unauthorized short-term subletting breach and requiring immediate de-listing.',
      'Demand 50% of the Airbnb revenue as a personal bribe.',
      'Book a stay on Airbnb under a fake name and destroy the furniture.',
      'Ignore the listing completely.'
    ],
    correct: 0,
    explanation: 'Unauthorized short-term subletting violates standard residential lease terms and insurance guidelines; management must issue formal notice of breach.'
  },
  {
    id: 'EX-JDG-12',
    category: 'judgment',
    type: 'decide',
    title: 'Handling Prospective Tenant Criminal Background Inquiries',
    situation: 'A prospective renter asks if people with criminal records can apply. What is the compliant response?',
    options: [
      'Provide the written screening criteria and explain that all applications undergo individualized review considering offense nature, severity, and time elapsed.',
      'Say "No criminals ever allowed here" regardless of offense or time.',
      'Tell them only people who know the mayor are approved.',
      'Refuse to give them an application form.'
    ],
    correct: 0,
    explanation: 'Transparently providing written criteria and explaining individualized review complies with HUD criminal guidance and Fair Housing standards.'
  },

  /* CATEGORY: written (6 items) */
  {
    id: 'EX-WRT-01',
    category: 'written',
    type: 'compose',
    title: 'Draft FCRA Adverse Action Letter (Exam Fixture APP-EX-01)',
    instruction: 'Applicant Jordan Taylor (APP-EX-01) was denied for Unit EX-01 based on a 545 credit score pulled from TransUnion Consumer Solutions (PO Box 2000, Chester PA, 1-800-888-4213). Compose the compliant FCRA Adverse Action Notice.',
    placeholder: 'Dear Jordan Taylor, thank you for applying for Unit EX-01. We regret to inform you that your application was denied...',
    thread: [
      { sender: 'Screening Dept', recipient: 'Management', date: '2026-08-11', body: 'Applicant Jordan Taylor denied based on TransUnion credit score 545 below 620 requirement.' }
    ],
    rubric: [
      { check: 'namesAgency', label: 'Names TransUnion as the credit reporting agency', why: 'Mandatory under 15 U.S.C. § 1681m.' },
      { check: 'statesAgencyNotDecisionMaker', label: 'States agency did not make tenancy decision', why: 'Mandatory disclaimer under FCRA.' },
      { check: 'mentionsFreeReport', label: 'States right to free disclosure report within 60 days', why: 'Required statutory disclosure.' },
      { check: 'mentionsDisputeRight', label: 'Explains right to dispute inaccurate information', why: 'Required consumer protection right.' }
    ],
    passMark: 4
  },
  {
    id: 'EX-WRT-02',
    category: 'written',
    type: 'compose',
    title: 'Draft Assistance Animal Accommodation Approval (Exam Fixture APP-EX-02)',
    instruction: 'Applicant Samantha Perez (APP-EX-02) requested a Reasonable Accommodation for an Assistance Dog with verified documentation in a no-pets property. Draft the formal approval letter.',
    placeholder: 'Dear Samantha Perez, we are pleased to confirm that your reasonable accommodation request has been approved...',
    thread: [
      { sender: 'Samantha Perez', recipient: 'Management', date: '2026-08-10', body: 'Submitting healthcare verification for my assistance animal for Unit EX-02.' }
    ],
    rubric: [
      { check: 'confirmsAccommodation', label: 'Confirms accommodation approval for assistance animal', why: 'Clear confirmation of approved accommodation.' },
      { check: 'noPetFeesForESA', label: 'Affirms zero pet deposit, pet rent, or fees', why: 'Assistance animals are exempt from pet fees under FHA.' },
      { check: 'statesConductAndDamageResponsibility', label: 'Outlines standard responsibility for noise, leash, and actual damage', why: 'Tenant remains responsible for conduct and damage.' },
      { check: 'noMedicalIntrusion', label: 'Does not demand private medical diagnosis', why: 'Preserves confidential medical privacy.' }
    ],
    passMark: 4
  },
  {
    id: 'EX-WRT-03',
    category: 'written',
    type: 'compose',
    title: 'Draft Fair Housing Compliant Rental Inquiry Response',
    instruction: 'A prospect asks if Canyon Ridge Estates is "quiet and free of loud college students or rowdy kids". Write a compliant response describing property features neutrally.',
    placeholder: 'Dear Prospect, thank you for your inquiry regarding Canyon Ridge Estates...',
    thread: [
      { sender: 'Inquirer', recipient: 'Leasing', date: '2026-08-11', body: 'Is this building quiet? I cannot stand living around rowdy college kids or noisy children.' }
    ],
    rubric: [
      { check: 'describesUnitFeatures', label: 'Describes objective property features and amenities', why: 'Focus on physical real estate facts.' },
      { check: 'noFamilyStereotypes', label: 'Avoids expressing preferences regarding age, students, or families', why: 'Comply with Fair Housing non-discrimination standards.' },
      { check: 'invitesApplicationOrTour', label: 'Invites prospect to schedule a tour or apply', why: 'Professional leasing engagement.' },
      { check: 'givesTimeframe', label: 'Provides specific office hours or timeframe', why: 'Concrete scheduling communication.' }
    ],
    passMark: 4
  },
  {
    id: 'EX-WRT-04',
    category: 'written',
    type: 'compose',
    title: 'Draft Notice of 24-Hour Intent to Enter',
    instruction: 'Draft a professional 24-Hour Notice of Intent to Enter to resident David Kim (LEASE-EX-01) for scheduled HVAC filter and safety detector inspection.',
    placeholder: 'Dear David Kim, please be advised that management has scheduled routine maintenance for Unit EX-01...',
    thread: [
      { sender: 'Maintenance Supervisor', recipient: 'Leasing Office', date: '2026-08-11', body: 'Need to schedule annual HVAC and smoke detector inspection for Unit EX-01.' }
    ],
    rubric: [
      { check: 'describesUnitFeatures', label: 'Identifies unit number and specific purpose of entry', why: 'Clear identification of premises and maintenance reason.' },
      { check: 'givesTimeframe', label: 'Provides specific date and 24-hour notice window', why: 'Contractual quiet enjoyment compliance.' },
      { check: 'noCommitmentBeyondAuthority', label: 'Professional respectful tone', why: 'Maintains positive resident relations.' },
      { check: 'invitesApplicationOrTour', label: 'Provides office contact details for questions or rescheduling', why: 'Ensures clear communication channel.' }
    ],
    passMark: 4
  },
  {
    id: 'EX-WRT-05',
    category: 'written',
    type: 'compose',
    title: 'Draft 3-Day Notice to Vacate Demand Letter',
    instruction: 'Draft a formal Texas 3-Day Notice to Vacate demand letter to a tenant who is 15 days delinquent on rent ($1,800.00 past due) complying with Texas Property Code § 24.005.',
    placeholder: 'NOTICE TO VACATE FOR NON-PAYMENT OF RENT: To Tenant, you are hereby notified...',
    thread: [
      { sender: 'Accounting', recipient: 'Management', date: '2026-08-11', body: 'Tenant 15 days past due ($1,800.00). Issue formal 3-Day Notice to Vacate.' }
    ],
    rubric: [
      { check: 'describesUnitFeatures', label: 'Specifies unit address, delinquent amount, and statutory 3-day notice period', why: 'Required under Texas Prop. Code § 24.005.' },
      { check: 'givesTimeframe', label: 'States exact deadline to pay or surrender possession', why: 'Establishes clear statutory deadline.' },
      { check: 'noFamilyStereotypes', label: 'Formal, objective legal compliance tone', why: 'Professional legal document standard.' },
      { check: 'statesAgencyNotDecisionMaker', label: 'References lease agreement default provisions', why: 'Cites underlying lease agreement.' }
    ],
    passMark: 4
  },
  {
    id: 'EX-WRT-06',
    category: 'written',
    type: 'compose',
    title: 'Draft Security Deposit Return Transmittal Letter',
    instruction: 'Draft the transmittal letter accompanying the final Security Deposit Itemization Statement and $1,725.00 refund check to a vacated tenant complying with Texas 30-day rules.',
    placeholder: 'Dear Resident, enclosed please find your itemized Security Deposit Statement and refund check...',
    thread: [
      { sender: 'Accounting', recipient: 'Former Resident', date: '2026-08-11', body: 'Deposit accounting completed. Refund check of $1,725.00 ready for transmittal.' }
    ],
    rubric: [
      { check: 'describesUnitFeatures', label: 'Specifies unit number, original deposit held, and refund check amount', why: 'Clear accounting transmittal.' },
      { check: 'givesTimeframe', label: 'References move-out date and delivery within 30-day statutory period', why: 'Demonstrates compliance with Texas Prop. Code § 92.103.' },
      { check: 'invitesApplicationOrTour', label: 'Provides contact details for accounting inquiries', why: 'Open channel for resolution.' },
      { check: 'noFamilyStereotypes', label: 'Professional closure of tenancy', why: 'Proper business standard.' }
    ],
    passMark: 4
  }
];
