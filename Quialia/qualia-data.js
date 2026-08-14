/* Qualia VA Training Simulator — mock data model. No backend, no real Qualia connection. */

const QZ_STAGES = ['Opened', 'Title Processing', 'Closing Prep', 'Closing Date', 'Post-Closing', 'Closed'];

const QZ_ORDERS = [
  {
    id: 'ORD-2026-1483',
    titleNumber: 'TX-2026-04471',
    propertyAddress: '5445 Main Street, Frisco, TX 75034',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 1,
    opened: '2026-06-08',
    closingDate: '2026-08-06',
    purchasePrice: 365120,
    loanAmount: 354954,
    inspectionCharge: 450,
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'The settlement agency is preparing the title commitment.',
    parties: [
      { name: 'Jon Smith', role: 'Buyer', email: 'john.smith@example.com', phone: '(469) 555-0142' },
      { name: 'Tanya R. Hart', role: 'Seller', email: 'tanya.hart@example.com', phone: '(469) 555-0198' },
      { name: 'Samantha Bee', role: 'Selling Agent', email: 'sbee@friscorealty.com', phone: '(972) 555-0110' },
      { name: 'Peter Einhorn', role: 'Listing Agent', email: 'peinhorn@friscorealty.com', phone: '(972) 555-0187' },
      { name: 'Lucas Adminton', role: 'Settlement Agent', email: 'ladminton@bestclosing.com', phone: '(214) 555-0166' },
      { name: 'Frisco Community Lending', role: 'Lender', email: 'processing@fclending.com', phone: '(214) 555-0120' }
    ]
  },
  {
    id: 'ORD-2026-1512',
    titleNumber: 'TX-2026-04502',
    propertyAddress: '812 Birchwood Lane, Plano, TX 75023',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 2,
    opened: '2026-05-14',
    closingDate: '2026-08-20',
    purchasePrice: 428500,
    loanAmount: 385650,
    settlementAgency: 'Best Closing Inc.',
    flag: 'missing-document',
    statusNote: 'Closing prep is on hold until the HOA Resale Certificate is received.',
    parties: [
      { name: 'Marcus Webb', role: 'Buyer', email: 'marcus.webb@example.com', phone: '(972) 555-0231' },
      { name: 'Elena Ruiz', role: 'Seller', email: 'elena.ruiz@example.com', phone: '(972) 555-0276' },
      { name: 'Dana Ruiz', role: 'Selling Agent', email: 'druiz@planoproperties.com', phone: '(469) 555-0143' },
      { name: 'Colin Frost', role: 'Listing Agent', email: 'cfrost@planoproperties.com', phone: '(469) 555-0177' },
      { name: 'Lucas Adminton', role: 'Settlement Agent', email: 'ladminton@bestclosing.com', phone: '(214) 555-0166' },
      { name: 'Plano Trust Mortgage', role: 'Lender', email: 'closing@planotrust.com', phone: '(972) 555-0199' }
    ]
  },
  {
    id: 'ORD-2026-1398',
    titleNumber: 'TX-2026-04388',
    propertyAddress: '219 Lakeshore Drive, McKinney, TX 75070',
    type: 'Purchase',
    status: 'Open',
    stageIndex: 2,
    opened: '2026-04-22',
    closingDate: '2026-08-25',
    originalClosingDate: '2026-08-11',
    purchasePrice: 512900,
    loanAmount: 461610,
    settlementAgency: 'Best Closing Inc.',
    flag: 'closing-delay',
    statusNote: 'Closing was pushed back 14 days, the lender has not yet released final loan documents.',
    parties: [
      { name: 'Priya Natarajan', role: 'Buyer', email: 'priya.n@example.com', phone: '(972) 555-0311' },
      { name: 'Grace Whitfield', role: 'Seller', email: 'grace.whitfield@example.com', phone: '(972) 555-0355' },
      { name: 'Paula Aragone', role: 'Selling Agent', email: 'paragone@mckinneyhomes.com', phone: '(214) 555-0212' },
      { name: 'Nathaniel Price', role: 'Listing Agent', email: 'nprice@mckinneyhomes.com', phone: '(214) 555-0248' },
      { name: 'Lucas Adminton', role: 'Settlement Agent', email: 'ladminton@bestclosing.com', phone: '(214) 555-0166' },
      { name: 'Northgate Home Loans', role: 'Lender', email: 'docs@northgateloans.com', phone: '(469) 555-0290' }
    ]
  }
];

const QZ_DOCUMENTS = [
  { id: 1, orderId: 'ORD-2026-1483', name: 'Purchase Agreement', type: 'Contract', status: 'Reviewed', uploadedBy: 'Samantha Bee', date: '2026-06-09', file: 'documents/purchase-agreement-1483.html' },
  { id: 2, orderId: 'ORD-2026-1483', name: 'Title Commitment', type: 'Title', status: 'Received', uploadedBy: 'Lucas Adminton', date: '2026-06-20', file: 'documents/title-commitment-1483.html' },
  { id: 13, orderId: 'ORD-2026-1483', name: 'Home Inspection Invoice', type: 'Invoice', status: 'Received', uploadedBy: 'Ace Home Inspections', date: '2026-06-14', file: 'documents/home-inspection-invoice-1483.html' },
  { id: 14, orderId: 'ORD-2026-1483', name: 'Source Deed', type: 'Title', status: 'Reviewed', uploadedBy: 'Lucas Adminton', date: '2026-06-18', file: 'documents/source-deed-1483.html' },
  { id: 15, orderId: 'ORD-2026-1483', name: 'Proposed Deed (Draft)', type: 'Title', status: 'Received', uploadedBy: 'Lucas Adminton', date: '2026-06-22', file: 'documents/proposed-deed-1483.html' },
  { id: 3, orderId: 'ORD-2026-1483', name: 'Loan Estimate', type: 'Lender', status: 'Pending', uploadedBy: '—', date: '—' },
  { id: 4, orderId: 'ORD-2026-1483', name: 'Homeowners Insurance Binder', type: 'Insurance', status: 'Received', uploadedBy: 'John Smith', date: '2026-06-25' },

  { id: 5, orderId: 'ORD-2026-1512', name: 'Purchase Agreement', type: 'Contract', status: 'Reviewed', uploadedBy: 'Dana Ruiz', date: '2026-05-15' },
  { id: 6, orderId: 'ORD-2026-1512', name: 'Title Commitment', type: 'Title', status: 'Reviewed', uploadedBy: 'Lucas Adminton', date: '2026-06-02' },
  { id: 7, orderId: 'ORD-2026-1512', name: 'HOA Resale Certificate', type: 'HOA', status: 'Pending', uploadedBy: '—', date: '—' },
  { id: 8, orderId: 'ORD-2026-1512', name: 'Survey', type: 'Property', status: 'Received', uploadedBy: 'Marcus Webb', date: '2026-06-18' },

  { id: 9, orderId: 'ORD-2026-1398', name: 'Purchase Agreement', type: 'Contract', status: 'Reviewed', uploadedBy: 'Paula Aragone', date: '2026-04-23' },
  { id: 10, orderId: 'ORD-2026-1398', name: 'Title Commitment', type: 'Title', status: 'Reviewed', uploadedBy: 'Lucas Adminton', date: '2026-05-10' },
  { id: 11, orderId: 'ORD-2026-1398', name: 'Final Loan Documents', type: 'Lender', status: 'Pending', uploadedBy: '—', date: '—' },
  { id: 12, orderId: 'ORD-2026-1398', name: 'Closing Disclosure', type: 'Lender', status: 'Pending', uploadedBy: '—', date: '—' }
];

const QZ_TASKS = [
  { id: 1, title: 'Confirm buyer contact information', assignedTo: 'You (VA)', dueDate: '2026-08-13', status: 'Open', relatedOrderId: 'ORD-2026-1483' },
  { id: 2, title: 'Upload homeowners insurance binder to file', assignedTo: 'You (VA)', dueDate: '2026-08-14', status: 'Complete', relatedOrderId: 'ORD-2026-1483' },
  { id: 3, title: 'Follow up with lender on Loan Estimate', assignedTo: 'You (VA)', dueDate: '2026-08-15', status: 'Open', relatedOrderId: 'ORD-2026-1483' },

  { id: 4, title: 'Request HOA Resale Certificate from management company', assignedTo: 'You (VA)', dueDate: '2026-08-13', status: 'In Progress', relatedOrderId: 'ORD-2026-1512' },
  { id: 5, title: "Notify buyer's agent of outstanding HOA item", assignedTo: 'You (VA)', dueDate: '2026-08-14', status: 'Open', relatedOrderId: 'ORD-2026-1512' },

  { id: 6, title: 'Log lender follow-up call re: final loan documents', assignedTo: 'You (VA)', dueDate: '2026-08-12', status: 'Open', relatedOrderId: 'ORD-2026-1398' },
  { id: 7, title: 'Escalate closing date change to supervisor for confirmation', assignedTo: 'You (VA)', dueDate: '2026-08-13', status: 'Open', relatedOrderId: 'ORD-2026-1398' },
  { id: 8, title: 'Update all parties on revised closing date', assignedTo: 'You (VA)', dueDate: '2026-08-14', status: 'Open', relatedOrderId: 'ORD-2026-1398' }
];

const QZ_MESSAGES = [
  {
    id: 1, orderId: 'ORD-2026-1483', subject: 'Loan Estimate still pending',
    thread: [
      { sender: 'You (VA)', recipient: 'Frisco Community Lending', date: '2026-08-08', body: 'Hi team, checking in on the Loan Estimate for 5445 Main Street. Can you share a status?' },
      { sender: 'Frisco Community Lending', recipient: 'You (VA)', date: '2026-08-09', body: 'Thanks for the note, underwriting is finishing review. We expect to send it by end of week.' }
    ]
  },
  {
    id: 2, orderId: 'ORD-2026-1512', subject: 'HOA Resale Certificate needed',
    thread: [
      { sender: 'You (VA)', recipient: 'Ridgeview HOA Management', date: '2026-08-05', body: 'Hello, we need the Resale Certificate for 812 Birchwood Lane to move this file to closing prep. What is the turnaround time?' },
      { sender: 'Ridgeview HOA Management', recipient: 'You (VA)', date: '2026-08-06', body: 'Requests currently take 7-10 business days. We received your request and it is in the queue.' },
      { sender: 'Dana Ruiz', recipient: 'You (VA)', date: '2026-08-11', body: 'Any update on the HOA doc? Buyer is asking about timeline.' }
    ]
  },
  {
    id: 3, orderId: 'ORD-2026-1398', subject: 'Closing date delay, final loan docs',
    thread: [
      { sender: 'You (VA)', recipient: 'Northgate Home Loans', date: '2026-08-07', body: 'Following up on final loan documents for 219 Lakeshore Drive. Original closing date is August 11th.' },
      { sender: 'Northgate Home Loans', recipient: 'You (VA)', date: '2026-08-08', body: 'We are behind on this file, documents will not be ready before August 11th. Recommend pushing the closing date.' },
      { sender: 'Paula Aragone', recipient: 'You (VA)', date: '2026-08-08', body: 'Buyer and seller need to know as soon as there is a new date, please keep us posted.' }
    ]
  }
];

const QZ_VENDORS = [
  { id: 1, orderId: 'ORD-2026-1483', name: 'Best Closing Inc.', service: 'Title & Settlement', status: 'In Progress' },
  { id: 2, orderId: 'ORD-2026-1483', name: 'North Texas Notary Group', service: 'Mobile Notary', status: 'Scheduled' },
  { id: 3, orderId: 'ORD-2026-1483', name: 'Ace Home Inspections', service: 'Home Inspection', status: 'Completed' },

  { id: 4, orderId: 'ORD-2026-1512', name: 'Best Closing Inc.', service: 'Title & Settlement', status: 'In Progress' },
  { id: 5, orderId: 'ORD-2026-1512', name: 'Ridgeview HOA Management', service: 'HOA Resale Certificate', status: 'Pending Confirmation' },
  { id: 6, orderId: 'ORD-2026-1512', name: 'Precision Land Surveying', service: 'Survey', status: 'Completed' },

  { id: 7, orderId: 'ORD-2026-1398', name: 'Best Closing Inc.', service: 'Title & Settlement', status: 'In Progress' },
  { id: 8, orderId: 'ORD-2026-1398', name: 'Lakeshore Notary Services', service: 'Mobile Notary', status: 'Pending Confirmation' }
];

/* Free-navigation checklists per module. `match` items are marked done by qualia-app.js when the matching action fires. */
const QZ_CHECKLISTS = {
  orders: { label: 'Orders', items: [
    { id: 'orders-search', label: 'Search for an Order' },
    { id: 'orders-open', label: 'Open an Order' },
    { id: 'orders-back', label: 'Return to the Orders list' }
  ]},
  dataentry: { label: 'Data Entry', items: [
    { id: 'de-property', label: 'Open the Property tab' },
    { id: 'de-parties', label: 'Open the Parties tab' },
    { id: 'de-transaction', label: 'Open the Transaction Information tab' },
    { id: 'de-edit', label: "Edit a party's contact info" }
  ]},
  documents: { label: 'Documents', items: [
    { id: 'docs-upload', label: 'Upload a document' },
    { id: 'docs-download', label: 'Download a document' },
    { id: 'docs-review', label: 'Mark a document as Reviewed' }
  ]},
  tasks: { label: 'Tasks', items: [
    { id: 'tasks-open', label: 'Review your assigned tasks' },
    { id: 'tasks-complete', label: 'Mark a task Complete' }
  ]},
  workflow: { label: 'Workflow', items: [
    { id: 'workflow-view', label: "View an order's workflow stage" }
  ]},
  communication: { label: 'Communication', items: [
    { id: 'comm-open', label: 'Open a message thread' },
    { id: 'comm-reply', label: 'Reply to a message' },
    { id: 'comm-followup', label: 'Log a follow-up' }
  ]},
  vendors: { label: 'Vendors', items: [
    { id: 'vendors-open', label: 'Open the Vendors tab' },
    { id: 'vendors-check', label: "Check a vendor's status" }
  ]},
  closing: { label: 'Closing', items: [
    { id: 'closing-open', label: 'Open the Closing tab' },
    { id: 'closing-review', label: 'Review the closing checklist' }
  ]},
  accounting: { label: 'Accounting', items: [
    { id: 'accounting-open', label: 'Open Accounting (read-only)' }
  ]}
};

/* Scenario engine — "What should I do?" cases. */
const QZ_SCENARIOS = [
  {
    id: 'buyer-name-error',
    title: 'The buyer\'s name is incorrect in the Order',
    situation: 'While reviewing Order ORD-2026-1483, you notice the buyer\'s name was entered as "Jon Smith" instead of "John Smith".',
    options: [
      'Change it immediately',
      'Ignore it',
      'Verify against source documents and follow the client\'s procedure',
      'Delete the Order'
    ],
    correct: 2,
    explanation: 'Always verify data against the source document (the contract) before changing anything, then follow your company\'s procedure for corrections and escalation.',
    verifyDoc: {
      file: 'documents/purchase-agreement-1483.html',
      title: 'Purchase Agreement',
      buttonLabel: 'View Purchase Agreement'
    },
    practice: {
      orderId: 'ORD-2026-1483', tab: 'dataentry', deTab: 'parties',
      buttonLabel: "Open Data Entry and correct the buyer's name",
      hint: "You're in Data Entry → Parties. The buyer is listed as \"Jon Smith\" — update Full Name to \"John Smith\" now that you've verified the correct spelling against the contract."
    }
  },
  {
    id: 'new-order',
    title: 'You are assigned a new Order',
    situation: 'A new file just landed in your queue. It is your first time touching this order.',
    options: [
      'Start entering data immediately without reviewing the instructions',
      'Open the order, review the referral or instructions, and confirm required fields before entering data',
      'Ask a coworker to do it for you',
      'Wait until someone tells you exactly what to do'
    ],
    correct: 1,
    explanation: 'Before touching any data, orient yourself: open the order, read the instructions or referral, and confirm what is required. Verification before action is the core habit.',
    practice: {
      view: 'orders',
      buttonLabel: 'Go to the Orders queue and open a file',
      hint: 'Search for an order and open it, the way you would when a new file lands in your queue.'
    }
  },
  {
    id: 'missing-document',
    title: 'A required document is missing',
    situation: 'Order ORD-2026-1512 is waiting on the HOA Resale Certificate and it has not been received yet.',
    options: [
      'Mark it as received anyway to move the file forward',
      'Ignore it, it is not your responsibility',
      'Follow up with the responsible party, keep the document status accurate, and flag it per protocol',
      'Delete the missing document line from the checklist'
    ],
    correct: 2,
    explanation: 'Never mark a document received until it actually is. Follow up with whoever owns it, keep statuses honest, and escalate if it is blocking closing.',
    practice: {
      orderId: 'ORD-2026-1512', tab: 'documents',
      buttonLabel: 'Go to Documents and resolve the outstanding item',
      hint: 'Order 812 Birchwood Lane is waiting on the HOA Resale Certificate. Once the HOA confirms it, use Upload to bring the file current.'
    }
  },
  {
    id: 'lender-followup',
    title: 'The lender has not sent final loan documents',
    situation: 'Order ORD-2026-1398 needs final loan documents from Northgate Home Loans and the closing date is close.',
    options: [
      'Wait silently for the lender to remember on their own',
      'Send a professional follow-up to the lender and log the follow-up in the file',
      'Call the buyer and tell them the lender is the problem',
      'Change the closing date yourself without telling anyone'
    ],
    correct: 1,
    explanation: 'Proactive, professional follow-up is part of the job, and logging it keeps the file auditable. Changing dates or assigning blame is not your call to make alone.',
    practice: {
      orderId: 'ORD-2026-1398', tab: 'communication', threadId: 3,
      buttonLabel: 'Go to Communication and follow up with the lender',
      hint: 'Open the thread with Northgate Home Loans, send a professional follow-up, then log it.'
    }
  },
  {
    id: 'closing-delay',
    title: 'The closing date needs to move',
    situation: 'Order ORD-2026-1398\'s original closing date cannot be met because final loan documents are late.',
    options: [
      'Change the closing date in the system on your own judgment',
      'Notify your supervisor and escalate so the date change is verified and communicated correctly',
      'Tell the buyer and seller nothing has changed',
      'Cancel the order'
    ],
    correct: 1,
    explanation: 'Closing date changes affect every party and can have legal or contractual weight. Escalate per protocol so the change is verified before anyone communicates it.',
    practice: {
      orderId: 'ORD-2026-1398', tab: 'tasks',
      buttonLabel: 'Go to Tasks and escalate the closing date change',
      hint: 'Find the task to escalate the closing date change to your supervisor, and mark it complete once it is logged.'
    }
  },
  {
    id: 'data-error',
    title: 'Double-checking a figure before closing',
    situation: 'A coworker asks you to double-check the purchase price on an order against the purchase agreement before the file goes to closing. You have not looked at it yet.',
    options: [
      'Assume it is fine since no one has flagged it',
      'Open the purchase agreement, compare it to the order, and follow your procedure whether it matches or not',
      'Change the price to whatever looks more likely to be right',
      'Tell your coworker you already checked it without actually looking'
    ],
    correct: 1,
    explanation: 'Verification is the job whether or not there turns out to be an error. Open the source document, compare it line by line, and follow your procedure either way, confirming a correct value matters as much as catching a wrong one.',
    practice: {
      orderId: 'ORD-2026-1483', tab: 'dataentry', deTab: 'transaction',
      buttonLabel: 'Go to Transaction Information and verify the price',
      hint: 'Open Transaction Information, compare the purchase price against the purchase agreement, and confirm whether it matches.'
    }
  }
];

/* Document-review items: a 4-step discrepancy-report engine.
   Step 1 — open the source document (doc/docTitle).
   Step 2 — multiple choice: "what does the source document actually say?" (sourceOptions,
            graded against rightSourceOptionId). One option always restates systemValue as
            the "matches, no discrepancy" choice, so this single question also answers
            whether there IS a discrepancy, no free-text/fuzzy matching anywhere.
   Step 3 — multiple choice: "what's the right next step?" (rightAction, one of
            none | correct | escalate-agent | escalate-supervisor), always the same 4 choices.
   Step 4 — conditional: if action=correct, an editable value (correctedValue is the
            reference value, partyRole/field says where it gets applied); if action starts
            with escalate-, a closed-list category (rightCategory) plus an ungraded free note.
   Overall `correct` = every applicable graded sub-part correct. This same shape is reused
   by the exam's `verify` items (see QZ_EXAM_ITEMS) through the same grading engine. */
const QZ_REVIEWS = [
  {
    id: 'rev-1483-buyer',
    orderId: 'ORD-2026-1483',
    label: "Buyer's legal name",
    where: 'Data Entry → Parties',
    instruction: "Open the Purchase Agreement and compare it to the buyer's name on this order.",
    doc: 'documents/purchase-agreement-1483.html', docTitle: 'Purchase Agreement',
    systemValue: 'Jon Smith',
    sourceOptions: [
      { id: 'a', text: 'Jon Smith — matches, no discrepancy' },
      { id: 'b', text: 'John Smith' },
      { id: 'c', text: 'John Smith, Jr.' },
      { id: 'd', text: 'J. Smith' }
    ],
    rightSourceOptionId: 'b',
    rightAction: 'correct',
    rightCategory: null,
    correctedValue: 'John Smith',
    partyRole: 'Buyer',
    field: null,
    explain: 'The Purchase Agreement clearly shows "John Smith", a one-character typo made during data entry. This is a plain, unambiguous correction: verify against the contract, then fix it directly.'
  },
  {
    id: 'rev-1483-inspection',
    orderId: 'ORD-2026-1483',
    label: 'Home inspection charge',
    where: 'Accounting',
    instruction: 'Open the Home Inspection Invoice and confirm the charge on the order matches what the vendor actually billed.',
    doc: 'documents/home-inspection-invoice-1483.html', docTitle: 'Home Inspection Invoice',
    systemValue: '$450.00',
    sourceOptions: [
      { id: 'a', text: '$450.00 — matches, no discrepancy' },
      { id: 'b', text: '$425.00' },
      { id: 'c', text: '$405.00' },
      { id: 'd', text: '$475.00' }
    ],
    rightSourceOptionId: 'b',
    rightAction: 'correct',
    rightCategory: null,
    correctedValue: '425.00',
    partyRole: null,
    field: 'inspectionCharge',
    explain: 'The vendor invoice totals $425.00. The charge entered on the order was overstated by $25, correct it to match what the vendor actually billed. Accounting figures come from the invoice, not from memory.'
  },
  {
    id: 'rev-1483-vesting',
    orderId: 'ORD-2026-1483',
    label: 'Seller vesting on the Proposed Deed',
    where: 'Documents → Proposed Deed',
    instruction: 'Compare how the seller (grantor) is vested on the Proposed Deed against the Source Deed.',
    doc: 'documents/source-deed-1483.html', docTitle: 'Source Deed',
    systemValue: 'Tanya Hart',
    sourceOptions: [
      { id: 'a', text: 'Tanya Hart — matches, no discrepancy' },
      { id: 'b', text: 'Tanya R. Hart' },
      { id: 'c', text: 'Tanya R. Hart, a single person' },
      { id: 'd', text: 'T. Hart' }
    ],
    rightSourceOptionId: 'c',
    rightAction: 'escalate-agent',
    rightCategory: 'legal-vesting',
    correctedValue: null,
    partyRole: null,
    field: null,
    explain: 'Deed vesting is a legal matter, not a typo. The proposed deed drops both the middle initial and the vesting language ("a single person") shown on the recorded source deed. A VA never edits vesting directly, escalate to the Settlement Agent to confirm and revise the deed.'
  },
  {
    id: 'rev-1483-price',
    orderId: 'ORD-2026-1483',
    label: 'Purchase price',
    where: 'Data Entry → Transaction Information',
    instruction: 'Verify the purchase price on the order against the Purchase Agreement.',
    doc: 'documents/purchase-agreement-1483.html', docTitle: 'Purchase Agreement',
    systemValue: '$365,120.00',
    sourceOptions: [
      { id: 'a', text: '$365,120.00 — matches, no discrepancy' },
      { id: 'b', text: '$365,210.00' },
      { id: 'c', text: '$356,120.00' },
      { id: 'd', text: '$365,120.00, plus a $2,000 credit' }
    ],
    rightSourceOptionId: 'a',
    rightAction: 'none',
    rightCategory: null,
    correctedValue: null,
    partyRole: null,
    field: null,
    explain: 'The price matches the contract exactly. Not every item has an error, confirming a correct value and moving on is part of the job too.'
  }
];

/* Closed list of escalation categories, used by Step 4 of the discrepancy-report engine. */
const QZ_ESCALATION_CATEGORIES = [
  { id: 'legal-vesting', label: 'Legal / vesting issue' },
  { id: 'conflicting-sources', label: 'Conflicting sources' },
  { id: 'outside-authority', label: 'Outside my authority as a VA' },
  { id: 'needs-client-confirmation', label: 'Needs client confirmation' }
];

/* Step 3 of the discrepancy-report engine always offers these same 4 choices. */
const QZ_ACTION_CHOICES = [
  { id: 'none', label: 'No action needed' },
  { id: 'correct', label: 'Correct it myself' },
  { id: 'escalate-agent', label: 'Escalate to the Settlement Agent' },
  { id: 'escalate-supervisor', label: 'Escalate to my Supervisor' }
];
const QZ_ACTION_LABEL = QZ_ACTION_CHOICES.reduce((m, a) => (m[a.id] = a.label, m), {});

/* 12 lessons — the trainee's guided curriculum. Each step references an id that already
   lives in QZ_CHECKLISTS ('do'), QZ_REVIEWS ('verify'), or QZ_SCENARIOS ('decide') — no
   content is duplicated here. Lesson N+1 unlocks only once every step of lesson N is
   resolved correctly (lock state is always derived at render time, never stored). */
const QZ_LESSONS = [
  {
    id: 'l01-orientation', number: 1, title: 'Orientation & Navigation',
    summary: 'Find your way around Orders before you touch any data.',
    steps: [
      { type: 'do', checklistId: 'orders-search', walk: {
          target: '#qzTopSearchInput',
          text: 'Type "1483" in the search box above. That finds Order ORD-2026-1483.',
          setup: () => {
            qzState.view = 'orders'; qzState.orderId = null; qzState.orderFilter = '';
            const input = document.getElementById('qzTopSearchInput');
            if (input) input.value = '';
            qzSyncTopTabs(); qzRenderRoot();
          }
        } },
      { type: 'do', checklistId: 'orders-open', walk: {
          target: 'tr[data-order-id="ORD-2026-1483"]',
          text: 'Click this row to open Order ORD-2026-1483.',
          setup: () => {
            qzState.view = 'orders'; qzState.orderId = null; qzState.orderFilter = '1483';
            const input = document.getElementById('qzTopSearchInput');
            if (input) input.value = '1483';
            qzSyncTopTabs(); qzRenderRoot();
          }
        } },
      { type: 'do', checklistId: 'orders-back', walk: {
          target: '.qz-back',
          text: 'Click "← Orders" to return to the Orders list.',
          setup: () => { qzOpenOrder('ORD-2026-1483'); }
        } }
    ]
  },
  {
    id: 'l02-overview-stage', number: 2, title: 'Reading a File: Overview & Stage',
    summary: 'Always confirm where a file stands before you say anything about it.',
    steps: [
      { type: 'do', checklistId: 'workflow-view', walk: {
          target: '[data-tab="workflow"]',
          text: 'Click the Workflow tab to see exactly where Order ORD-2026-1483 stands right now.',
          setup: () => qzOpenOrder('ORD-2026-1483')
        } },
      { type: 'decide', scenarioId: 'new-order', walk: {
          target: null,
          text: 'A new scenario. Read the situation below, then pick the option you believe is correct, no shortcuts here, this one tests your judgment.',
          setup: () => qzOpenScenario('new-order')
        } }
    ]
  },
  {
    id: 'l03-data-entry', number: 3, title: 'Data Entry: Property & Parties',
    summary: 'Tour the Data Entry tabs and make your first tracked edit.',
    steps: [
      { type: 'do', checklistId: 'de-property', walk: {
          target: '[data-tab="dataentry"]',
          text: 'Click the Data Entry tab. It opens straight to Property, the first stop.',
          setup: () => qzOpenOrder('ORD-2026-1483')
        } },
      { type: 'do', checklistId: 'de-parties', walk: {
          target: '[data-detab="parties"]',
          text: 'Click the Parties sub-tab to see everyone on this file.',
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('dataentry'); }
        } },
      { type: 'do', checklistId: 'de-transaction', walk: {
          target: '[data-detab="transaction"]',
          text: 'Click Transaction Information to see the price, loan amount, and closing date.',
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('dataentry'); }
        } },
      { type: 'do', checklistId: 'de-edit', walk: {
          target: () => {
            const btn = document.getElementById('qzDeSaveBtn');
            if (btn && btn.offsetParent !== null) return btn; // visible once something changed
            return document.querySelector('.qz-party-card[data-role="Buyer"] input[data-field="phone"]');
          },
          text: "Let's make a tracked edit. Change the Buyer's phone number to anything below. A Save button appears top-right, click it to save.",
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('dataentry'); qzDeTab('parties'); }
        } }
    ]
  },
  {
    id: 'l04-verify-buyer-name', number: 4, title: "Verify Against Source: Buyer's Name",
    summary: 'Every field can be wrong. Learn to check it before you trust it.',
    steps: [
      { type: 'verify', reviewId: 'rev-1483-buyer' },
      { type: 'decide', scenarioId: 'buyer-name-error' }
    ]
  },
  {
    id: 'l05-verify-figures', number: 5, title: 'Verify Figures: Price & Inspection Charge',
    summary: 'Numbers need the same scrutiny as names, whether or not they turn out to be wrong.',
    steps: [
      { type: 'verify', reviewId: 'rev-1483-price' },
      { type: 'verify', reviewId: 'rev-1483-inspection' },
      { type: 'decide', scenarioId: 'data-error' }
    ]
  },
  {
    id: 'l06-documents', number: 6, title: 'Documents: Receive, Review, Version',
    summary: 'Move a document through its real lifecycle: received, viewed, reviewed.',
    steps: [
      { type: 'do', checklistId: 'docs-upload' },
      { type: 'do', checklistId: 'docs-download' },
      { type: 'do', checklistId: 'docs-review' }
    ]
  },
  {
    id: 'l07-missing-document', number: 7, title: 'Missing Document & Honest Follow-up',
    summary: 'Keep statuses accurate and follow up with whoever owns the delay.',
    steps: [
      { type: 'decide', scenarioId: 'missing-document' },
      { type: 'do', checklistId: 'comm-followup', orderId: 'ORD-2026-1512' }
    ]
  },
  {
    id: 'l08-vesting-escalation', number: 8, title: 'When Not to Touch Data: Vesting & Escalation',
    summary: 'Some things are not a VA’s call to fix. Learn to recognize and escalate them.',
    steps: [
      { type: 'verify', reviewId: 'rev-1483-vesting' }
    ]
  },
  {
    id: 'l09-communication', number: 9, title: 'Professional Communication',
    summary: 'Open a thread, reply professionally, and know when to push a vendor.',
    steps: [
      { type: 'do', checklistId: 'comm-open', orderId: 'ORD-2026-1398' },
      { type: 'do', checklistId: 'comm-reply', orderId: 'ORD-2026-1398' },
      { type: 'decide', scenarioId: 'lender-followup' }
    ]
  },
  {
    id: 'l10-tasks', number: 10, title: 'Tasks & Prioritization',
    summary: 'Work your queue like a real file depends on it, because it does.',
    steps: [
      { type: 'do', checklistId: 'tasks-open' },
      { type: 'do', checklistId: 'tasks-complete' }
    ]
  },
  {
    id: 'l11-vendors-accounting', number: 11, title: 'Vendors & Read-Only Accounting',
    summary: 'Check vendor status and understand where the money is tracked, without touching it.',
    steps: [
      { type: 'do', checklistId: 'vendors-open' },
      { type: 'do', checklistId: 'vendors-check' },
      { type: 'do', checklistId: 'accounting-open' }
    ]
  },
  {
    id: 'l12-closing', number: 12, title: 'Closing: Checklist & Date Changes',
    summary: 'Confirm every document is reviewed, and escalate anything that moves the date.',
    steps: [
      { type: 'do', checklistId: 'closing-open', orderId: 'ORD-2026-1398' },
      { type: 'do', checklistId: 'closing-review', orderId: 'ORD-2026-1398' },
      { type: 'decide', scenarioId: 'closing-delay' }
    ]
  }
];

/* ---------- Final exam: dedicated order + documents, unrelated to the lesson orders
   above, so the exam cannot be passed from memorized lesson answers. Unlocks only once
   every lesson is complete; graded with no hints and no going back. ---------- */
const QZ_EXAM_PASS_PCT = 0.8;

const QZ_EXAM_ORDER = {
  id: 'ORD-2026-EXAM',
  titleNumber: 'TX-2026-09901',
  propertyAddress: '4110 Hollow Creek Court, Allen, TX 75013',
  type: 'Purchase',
  status: 'Open',
  stageIndex: 1,
  opened: '2026-07-02',
  closingDate: '2026-08-28',
  purchasePrice: 398750,
  loanAmount: 372900,
  inspectionCharge: 395,
  settlementAgency: 'Best Closing Inc.',
  flag: null,
  statusNote: 'The settlement agency is preparing the title commitment.',
  parties: [
    { name: 'Derek Owusu', role: 'Buyer', email: 'derek.owusu@example.com', phone: '(214) 555-0301' },
    { name: 'Marisol Vega', role: 'Seller', email: 'marisol.vega@example.com', phone: '(214) 555-0344' },
    { name: 'Renee Castillo', role: 'Selling Agent', email: 'rcastillo@allenhomes.com', phone: '(972) 555-0410' },
    { name: 'Omar Fitch', role: 'Listing Agent', email: 'ofitch@allenhomes.com', phone: '(972) 555-0455' },
    { name: 'Lucas Adminton', role: 'Settlement Agent', email: 'ladminton@bestclosing.com', phone: '(214) 555-0166' },
    { name: 'Cedar Point Lending', role: 'Lender', email: 'processing@cedarpointlending.com', phone: '(469) 555-0388' }
  ]
};

const QZ_EXAM_DOCUMENTS = [
  { id: 901, orderId: 'ORD-2026-EXAM', name: 'Purchase Agreement', type: 'Contract', status: 'Reviewed', uploadedBy: 'Renee Castillo', date: '2026-07-03', file: 'documents/exam-purchase-agreement.html' },
  { id: 902, orderId: 'ORD-2026-EXAM', name: 'Source Deed', type: 'Title', status: 'Reviewed', uploadedBy: 'Lucas Adminton', date: '2026-07-10', file: 'documents/exam-source-deed.html' }
];

const QZ_EXAM_ITEMS = [
  { id: 'ex-01', type: 'do', label: 'Open the exam order and confirm its current workflow stage.', checklistId: 'workflow-view', points: 10 },
  {
    id: 'ex-02', type: 'verify', orderId: 'ORD-2026-EXAM', label: "Buyer's legal name",
    where: 'Data Entry → Parties',
    instruction: "Open the Purchase Agreement and compare it to the buyer's name on this order.",
    doc: 'documents/exam-purchase-agreement.html', docTitle: 'Purchase Agreement',
    systemValue: 'Derrick Owusu',
    sourceOptions: [
      { id: 'a', text: 'Derrick Owusu — matches, no discrepancy' },
      { id: 'b', text: 'Derek Owusu' },
      { id: 'c', text: 'Derek Owusu, Jr.' },
      { id: 'd', text: 'D. Owusu' }
    ],
    rightSourceOptionId: 'b',
    rightAction: 'correct', rightCategory: null,
    correctedValue: 'Derek Owusu', partyRole: 'Buyer', field: null,
    explain: 'The Purchase Agreement shows "Derek Owusu" — a data-entry typo. Correct it directly.',
    points: 10
  },
  {
    id: 'ex-03', type: 'verify', orderId: 'ORD-2026-EXAM', label: 'Purchase price',
    where: 'Data Entry → Transaction Information',
    instruction: 'Verify the purchase price on the order against the Purchase Agreement.',
    doc: 'documents/exam-purchase-agreement.html', docTitle: 'Purchase Agreement',
    systemValue: '$398,750.00',
    sourceOptions: [
      { id: 'a', text: '$398,750.00 — matches, no discrepancy' },
      { id: 'b', text: '$389,750.00' },
      { id: 'c', text: '$398,570.00' },
      { id: 'd', text: '$398,750.00, plus a $1,500 credit' }
    ],
    rightSourceOptionId: 'a',
    rightAction: 'none', rightCategory: null,
    correctedValue: null, partyRole: null, field: null,
    explain: 'The price matches the contract exactly. Confirming a correct value is as much the job as catching a wrong one.',
    points: 10
  },
  {
    id: 'ex-04', type: 'verify', orderId: 'ORD-2026-EXAM', label: 'Seller vesting on the Source Deed',
    where: 'Documents → Source Deed',
    instruction: 'Compare how the seller is vested on the Source Deed against the buyer name and vesting shown on the order.',
    doc: 'documents/exam-source-deed.html', docTitle: 'Source Deed',
    systemValue: 'Marisol Vega',
    sourceOptions: [
      { id: 'a', text: 'Marisol Vega — matches, no discrepancy' },
      { id: 'b', text: 'Marisol Vega, a married person' },
      { id: 'c', text: 'Marisol T. Vega, a married person' },
      { id: 'd', text: 'M. Vega' }
    ],
    rightSourceOptionId: 'c',
    rightAction: 'escalate-agent', rightCategory: 'legal-vesting',
    correctedValue: null, partyRole: null, field: null,
    explain: 'Vesting is a legal matter. The source deed carries a middle initial and marital-status language the order does not reflect. Escalate to the Settlement Agent, do not edit vesting yourself.',
    points: 10
  },
  {
    id: 'ex-05', type: 'decide',
    situation: 'A vendor invoice on this file totals $30 less than the charge currently entered on the order.',
    options: [
      'Correct it silently without telling anyone',
      'Verify the amount against the vendor invoice, then correct it to match what the vendor actually billed',
      'Leave it, a small difference is not worth the trouble',
      'Delete the charge entirely so it does not show as wrong'
    ],
    correct: 1,
    points: 10
  },
  {
    id: 'ex-06', type: 'decide',
    situation: 'The lender tells you final loan documents will be late, and the current closing date cannot be met.',
    options: [
      'Change the closing date in the system on your own judgment',
      'Notify your supervisor and escalate so the date change is verified and communicated correctly',
      'Say nothing to the buyer and seller until someone asks',
      'Cancel the order'
    ],
    correct: 1,
    points: 10
  }
];
