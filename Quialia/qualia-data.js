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
    settlementAgency: 'Best Closing Inc.',
    flag: null,
    statusNote: 'The settlement agency is preparing the title commitment.',
    parties: [
      { name: 'Jon Smith', role: 'Buyer', email: 'john.smith@example.com', phone: '(469) 555-0142' },
      { name: 'Tanya Hart', role: 'Seller', email: 'tanya.hart@example.com', phone: '(469) 555-0198' },
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
  { id: 2, orderId: 'ORD-2026-1483', name: 'Title Commitment', type: 'Title', status: 'Received', uploadedBy: 'Lucas Adminton', date: '2026-06-20' },
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
    title: 'You notice a data entry error made by someone else',
    situation: 'While reviewing an order, you notice the purchase price entered does not match the purchase agreement.',
    options: [
      'Correct it silently without telling anyone',
      'Verify against the source document and escalate or correct it following your procedure',
      'Leave it, it is probably not a big deal',
      'Delete the field so it looks blank instead of wrong'
    ],
    correct: 1,
    explanation: 'Data errors can cascade into disclosures, payoffs, and disbursements. Verify against the source document, then follow your procedure for correcting and documenting the fix.',
    practice: {
      orderId: 'ORD-2026-1483', tab: 'dataentry', deTab: 'transaction',
      buttonLabel: 'Go to Transaction Information and verify the price',
      hint: 'Open Transaction Information, compare the purchase price against the purchase agreement, and correct it if it does not match.'
    }
  }
];
