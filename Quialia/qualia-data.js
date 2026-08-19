/* Qualia VA Training Simulator — mock data model. No backend, no real Qualia connection. */

const QZ_STAGES = ['Opened', 'Title Processing', 'Closing Prep', 'Closing Date', 'Post-Closing', 'Closed'];

/* Target value for Lesson 2's "first tracked edit" exercise (de-edit): the buyer's phone
   number on the order (john.smith@example.com's Jon Smith / ORD-2026-1483) is (469) 555-0142.
   The walkthrough tells the trainee the buyer called with this updated number, and only
   counts the edit once it matches exactly, so the exercise checks real data-entry accuracy
   instead of accepting any typed value. */
const QZ_DE_EDIT_TARGET_PHONE = '(469) 555-0187';

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
  { id: 3, orderId: 'ORD-2026-1483', name: 'Loan Estimate', type: 'Lender', status: 'Pending', uploadedBy: '—', date: '—', file: 'documents/loan-estimate-1483.html' },
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
    // Situation deliberately does NOT say whether the name is right or wrong (it used to,
    // spoiling the verify step that comes right after: the Step 2 "what does the source
    // actually say?" MC question was pointless once you'd already been told the answer here).
    // Framed the same way as data-error on purpose, so both "verify" scenarios in this
    // lesson teach the identical habit without contradicting each other.
    id: 'buyer-name-error',
    title: "Confirming a Buyer's Legal Name",
    situation: 'A coworker asks you to confirm the buyer\'s legal name on Order ORD-2026-1483 matches the Purchase Agreement before the file moves to the next stage. You have not looked at it yet.',
    options: [
      'Assume the name on file is correct since no one has flagged it',
      "Open the Purchase Agreement, compare it to the buyer's name on the order, and follow your procedure whether it matches or not",
      'Change the name to whatever looks more correct without checking',
      'Tell your supervisor you already verified it without actually looking'
    ],
    correct: 1,
    explanation: 'Verification is the job whether or not there turns out to be an error. Open the source document, compare it to what is on file, and follow your procedure either way, confirming a correct name matters as much as catching a wrong one.'
    // No verifyDoc/practice CTA here on purpose: this scenario is always reached right before
    // this lesson's own verify step (rev-1483-buyer), which already opens the Purchase
    // Agreement and already applies the real correction. Offering those same actions again
    // here would just send the trainee to re-do work they're about to do anyway.
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
    explanation: 'Before touching any data, orient yourself: open the order, read the instructions or referral, and confirm what is required. Verification before action is the core habit.'
    // No practice CTA here either: this scenario now lives in Lesson 1 (Orientation), right
    // after the orders-search/orders-open steps that already have the trainee search for and
    // open a file, sending them to do it again would just repeat those steps, and worse,
    // navigating away from this page mid-walkthrough would strand the Continue button that
    // only renders on the scenario feedback panel.
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
    explanation: 'Verification is the job whether or not there turns out to be an error. Open the source document, compare it line by line, and follow your procedure either way, confirming a correct value matters as much as catching a wrong one.'
    // No practice CTA here either, same reasoning as buyer-name-error: Lesson 5's two verify
    // steps (rev-1483-price, rev-1483-inspection) already do this exact comparison for real.
  },
  {
    id: 'comm-read-context',
    title: 'What does this thread actually say?',
    situation: 'Before you reply on Order ORD-2026-1398, look back at the "Closing date delay, final loan docs" thread you just opened. Based on what was actually written there, what is going on?',
    options: [
      'Northgate Home Loans confirmed the closing date will hold as scheduled',
      "Northgate Home Loans is behind and recommends pushing the closing date, and Paula Aragone wants to be kept posted once there's a new date",
      'The buyer emailed directly asking to cancel the contract',
      'No closing date has been set on this file yet'
    ],
    correct: 1,
    explanation: "That's what the thread says: the lender told you documents will not be ready before the original date and recommended pushing it, and Paula Aragone asked to be kept posted as soon as there is a new one. Reading the full history before you reply is what lets you respond with the actual facts instead of guessing."
  },
  {
    id: 'comm-tone',
    title: 'Choosing the right reply',
    situation: 'You are working Order ORD-2026-1398. The lender told you final loan documents will be late. The selling agent just messaged asking for an update on closing timeline. You do not have a new confirmed date yet.',
    options: [
      "Copy-paste the lender's exact response to the agent",
      'Let the agent know you are aware and following up, and will share an update once you have a confirmed timeline',
      'Tell them the lender is causing the delay and it is not your fault',
      'Ignore the message since you do not have new information yet'
    ],
    correct: 1,
    explanation: 'Keep communication professional and factual. Do not blame other parties, do not forward internal messages verbatim, and never ignore a question. Even without a full answer, acknowledge the inquiry and set an expectation for when you will follow up.'
  },
  {
    id: 'task-priority',
    title: 'Which task comes first?',
    situation: 'You start your day with three tasks across your queue: (A) "Confirm buyer contact info" on Order 1483, due in 2 days. (B) "Escalate closing date change to supervisor" on Order 1398, due tomorrow — closing is in 3 days. (C) "Upload homeowners insurance binder" on Order 1483, already marked Complete.',
    options: [
      'Start with (A) because it was assigned first',
      'Work (B) first because it is time-sensitive and blocking a closing',
      'Work (C) again to double-check it',
      'Do them in alphabetical order by task name'
    ],
    correct: 1,
    explanation: 'Always prioritize tasks that are time-sensitive or blocking a closing. A closing-date escalation with a 3-day window is urgent. Contact confirmations and already-completed tasks can wait. The habit is: deadline pressure and closing impact first, then routine items.'
  },
  {
    id: 'task-honesty',
    title: 'A task says "In Progress" but nothing has been done',
    situation: 'A coworker marked a task as "In Progress" on your file last week, but when you check, no actual work has been done on it. The task is due in two days.',
    options: [
      'Leave the status as-is since someone else set it',
      'Mark it Complete yourself so it stops showing as overdue',
      'Follow up with the person responsible, flag the gap, and update the status honestly',
      'Delete the task so it does not clutter your view'
    ],
    correct: 2,
    explanation: 'Statuses must reflect reality. If work has not started, the status should say so. Follow up with whoever owns it, flag the gap, and keep the record honest. A misleading "In Progress" is worse than an honest "Open" because it hides the risk from everyone relying on that status.'
  },
  {
    id: 'vendor-pending',
    title: 'A vendor has not confirmed and closing is close',
    // Deliberately set on ORD-2026-1398, not 1512: that's the order whose vendor list
    // actually has a mobile notary sitting at "Pending Confirmation" (Lakeshore Notary
    // Services). 1512's outstanding item is the HOA certificate, already covered by the
    // missing-document scenario, not a vendor confirmation.
    situation: 'Order ORD-2026-1398 needs a mobile notary for closing. The vendor status for Lakeshore Notary Services shows "Pending Confirmation" and closing is in 5 business days.',
    options: [
      'Wait — the vendor will confirm when they are ready',
      'Follow up with the vendor proactively to confirm availability and lock in the date',
      'Mark the vendor as "Completed" to move the file forward',
      'Find and hire a different vendor on your own without telling anyone'
    ],
    correct: 1,
    explanation: '"Pending Confirmation" with closing 5 days out is a risk. Follow up proactively — do not wait for a vendor to remember on their own, and never mark something done when it is not. If the vendor cannot confirm, escalate so a backup plan can be made in time.'
  },
  {
    id: 'accounting-flag',
    title: 'You spot a charge that does not match',
    situation: 'While reviewing the Accounting tab, you notice a charge listed as $450.00 for a home inspection, but you recall the vendor invoice showed a different amount. Accounting is read-only for VAs in Qualia.',
    options: [
      'Ignore it — accounting is not your job',
      'Find a way to change the number directly in the system',
      'Flag the discrepancy to your supervisor or the settlement agent so it can be verified and corrected by someone with the right authority',
      "Call the vendor and tell them their invoice was wrong"
    ],
    correct: 2,
    explanation: 'A VA does not modify accounting directly, but spotting a discrepancy is part of the job. Flag it to someone with the authority to verify and correct it. "Read-only for me" does not mean "not my concern" — it means "escalate to the right person."'
  },
  {
    id: 'closing-docs-outstanding',
    title: 'Outstanding documents at closing time',
    situation: 'You open the Closing tab on Order ORD-2026-1398 and see that Final Loan Documents and Closing Disclosure are both still marked Pending. Closing is scheduled for 10 days from now.',
    options: [
      'Mark them as Reviewed so the checklist turns green',
      'Flag the outstanding items, follow up with the lender to get them submitted, and do not mark the file closing-ready until every document is in',
      'Proceed to closing without them since 10 days is still far away',
      'Delete the pending document entries from the list'
    ],
    correct: 1,
    explanation: 'Never mark a document Reviewed until it has actually been received and reviewed. 10 days sounds comfortable, but lender documents can take longer than expected. Follow up now, keep statuses honest, and escalate if they are not arriving on time. A green checklist must mean everything is genuinely ready.'
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
// Order matches how Lesson 3 visits them (buyer -> price -> inspection -> vesting), then loan
// at the end since it's only used later in Lesson 4. The Review tab lists every item for an
// order in this array's order, so this keeps the on-screen list and the walkthrough's
// highlight moving top-to-bottom together instead of jumping around the page.
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
    explain: 'Deed vesting is a legal matter, not a typo. The proposed deed drops both the middle initial and the vesting language ("a single person") shown on the recorded source deed. A VA never edits vesting directly, escalate to the Settlement Agent to confirm and revise the deed.',
    // Shown as an optional, collapsed "See example" in Step 4 of the escalation flow: the
    // note itself is free-text and ungraded, without a model to look at, it's a blank page.
    noteExample: 'The Proposed Deed shows the seller as "Tanya Hart," but the Source Deed shows "Tanya R. Hart, a single person." The middle initial and marital-status language are missing. This affects legal vesting, not a data entry field, so I am not correcting it myself. Escalating to the Settlement Agent to confirm the correct vesting and revise the deed before closing.'
  },
  {
    id: 'rev-1483-loan',
    orderId: 'ORD-2026-1483',
    label: 'Loan amount',
    where: 'Data Entry → Transaction Information',
    instruction: "Open the Loan Estimate and confirm the loan amount on the order matches the lender's figure.",
    doc: 'documents/loan-estimate-1483.html', docTitle: 'Loan Estimate',
    systemValue: '$354,954.00',
    sourceOptions: [
      { id: 'a', text: '$354,954.00 — matches, no discrepancy' },
      { id: 'b', text: '$354,564.00' },
      { id: 'c', text: '$345,954.00' },
      { id: 'd', text: '$354,954.00, plus a $500 origination adjustment' }
    ],
    rightSourceOptionId: 'a',
    rightAction: 'none',
    rightCategory: null,
    correctedValue: null,
    partyRole: null,
    field: null,
    explain: 'The loan amount matches the Loan Estimate exactly. Verification means checking every figure against its source, not just the ones that look wrong. Confirming a correct value is as much the job as catching a wrong one.'
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

/* 8 lessons (9-12 reserved for later, heavier capstone content) — the trainee's guided
   curriculum. Each step references an id that already
   lives in QZ_CHECKLISTS ('do'), QZ_REVIEWS ('verify'), or QZ_SCENARIOS ('decide') — no
   content is duplicated here. Lesson N+1 unlocks only once every step of lesson N is
   resolved correctly (lock state is always derived at render time, never stored). */
const QZ_LESSONS = [
  {
    id: 'l01-orientation', number: 1, title: 'Orientation & Navigation',
    summary: 'Find your way around Orders, read where a file stands, and know your first move on anything new.',
    // Merged with the old, separate "l02-overview-stage": its workflow-view step and the
    // new-order decide step both belong to the same "getting oriented" arc as this lesson's
    // search/open/back steps. new-order in particular fits here better than it fit on its
    // own, "what do you do when a new file lands in your queue" is exactly what Orientation
    // is about, and it gives this lesson the judgment component it didn't have before.
    steps: [
      { type: 'do', checklistId: 'orders-search', walk: {
          target: '#qzTopSearchInput',
          // Live text: if what's typed doesn't actually surface ORD-2026-1483, say so instead
          // of staying silent while the table below shows zero (or the wrong) results.
          text: () => {
            const input = document.getElementById('qzTopSearchInput');
            const v = input ? input.value : '';
            const o = qzGetOrder('ORD-2026-1483');
            if (v && v.trim() && o && !qzOrderMatchesFilter(o, v)) {
              return `"${v}" doesn't find Order ORD-2026-1483 — try typing "1483" instead.`;
            }
            return 'Type "1483" in the search box above. That finds Order ORD-2026-1483.';
          },
          setup: () => {
            qzState.view = 'orders'; qzState.orderId = null; qzState.orderFilter = '';
            const input = document.getElementById('qzTopSearchInput');
            if (input) input.value = '';
            qzSyncTopTabs(); qzRenderRoot();
          }
        } },
      { type: 'do', checklistId: 'orders-open', walk: {
          // Normally the row itself, but falls back to the search box if it's ever not
          // there, defense in depth alongside locking the input in setup() below.
          target: () => document.querySelector('tr[data-order-id="ORD-2026-1483"]') || '#qzTopSearchInput',
          text: () => {
            if (document.querySelector('tr[data-order-id="ORD-2026-1483"]')) return 'Click this row to open Order ORD-2026-1483.';
            const input = document.getElementById('qzTopSearchInput');
            const v = input ? input.value : '';
            return `"${v}" doesn't show Order ORD-2026-1483 anymore — clear the search or type "1483" again.`;
          },
          setup: () => {
            qzState.view = 'orders'; qzState.orderId = null; qzState.orderFilter = '1483';
            const input = document.getElementById('qzTopSearchInput');
            if (input) {
              input.value = '1483';
              // Locked here: you've already found the order, further edits to this box would
              // only risk filtering it back out from under the highlighted row below.
              input.disabled = true;
              input.title = 'Order found — click the row below to open it.';
            }
            qzSyncTopTabs(); qzRenderRoot();
          }
        } },
      { type: 'do', checklistId: 'workflow-view', walk: {
          target: '[data-tab="workflow"]',
          text: "Now click the Workflow tab to see exactly where this order stands right now.",
          // Shown after the click instead of an instant auto-advance: a 3-stop mini-tour of
          // the panel that just appeared (using live order data, not generic filler), so this
          // step actually teaches "reading a file" instead of just "clicking a tab."
          tour: [
            { target: '.qz-tl-step.current', text: () => `This marker shows exactly where the order is right now: "${QZ_STAGES[qzGetOrder('ORD-2026-1483').stageIndex]}".` },
            { target: '.qz-tl-status', text: () => `And this confirms it in words: ${qzGetOrder('ORD-2026-1483').statusNote}` },
            { target: '.qz-tl-readonly-note', text: 'One more thing: this whole view is read-only. Workflow structure and stage rules are configured by admins, not by a VA, you read it, you never edit it directly.' }
          ],
          setup: () => qzOpenOrder('ORD-2026-1483')
        } },
      { type: 'decide', scenarioId: 'new-order', walk: {
          target: null,
          text: "You just practiced opening a file and checking where it stands. Now think about a brand new one landing in your queue: read the situation below, then pick the option you believe is correct.",
          setup: () => qzOpenScenario('new-order')
        } },
      { type: 'do', checklistId: 'orders-back', walk: {
          target: '.qz-back',
          text: 'Click "← Orders" to return to the Orders list.',
          setup: () => { qzOpenOrder('ORD-2026-1483'); }
        } }
    ]
  },
  {
    id: 'l02-data-entry', number: 2, title: 'Data Entry: Property & Parties',
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
          // Stays on the phone field until it actually matches the target number, not just
          // "something changed" (the Save button appears on the very first keystroke, which
          // was yanking the highlight away before the trainee finished typing).
          target: () => {
            const phoneEl = document.querySelector('.qz-party-card[data-role="Buyer"] input[data-field="phone"]');
            const v = phoneEl ? phoneEl.value.trim() : '';
            const btn = document.getElementById('qzDeSaveBtn');
            if (v === QZ_DE_EDIT_TARGET_PHONE && btn && btn.offsetParent !== null) return btn;
            return phoneEl;
          },
          // Live text: a real target number to enter, not "type anything" — and it says so
          // immediately if what's in the field doesn't match, same pattern as orders-search.
          text: () => {
            const phoneEl = document.querySelector('.qz-party-card[data-role="Buyer"] input[data-field="phone"]');
            const v = phoneEl ? phoneEl.value.trim() : '';
            const btn = document.getElementById('qzDeSaveBtn');
            const saveVisible = btn && btn.offsetParent !== null;
            if (saveVisible && v && v !== QZ_DE_EDIT_TARGET_PHONE) {
              return `That doesn't match — the buyer said their new number is ${QZ_DE_EDIT_TARGET_PHONE}. Fix it, then click Save.`;
            }
            return `The buyer just called with an updated phone number: ${QZ_DE_EDIT_TARGET_PHONE}. Type it into the Phone field, then click Save.`;
          },
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('dataentry'); qzDeTab('parties'); }
        } }
    ]
  },
  {
    // Merged with the old "l04-verify-figures" (which had already absorbed vesting from an
    // even older "l08-vesting-escalation"): buyer-name-error and data-error were teaching the
    // identical habit ("verify against source, whether or not it turns out to be wrong") in
    // two separate lessons back to back. One lesson now covers all 4 flavors of the
    // discrepancy-report engine in escalating order: a plain typo, a value that's actually
    // correct, a wrong figure, and a legal issue that isn't a VA's call to fix. Each decide
    // sits right before the verify item it sets up, instead of both decides bunched at the
    // front.
    id: 'l03-verify-against-source', number: 3, title: 'Verify Against Source: Names, Figures & Vesting',
    summary: 'Every field can be wrong, whether or not it turns out to be. Learn to check it before you trust it, and recognize what is not yours to fix.',
    steps: [
      { type: 'decide', scenarioId: 'buyer-name-error', walk: {
          target: null,
          text: "Read the situation below, then pick the option you believe is correct. This sets the rule we're about to apply for real.",
          setup: () => qzOpenScenario('buyer-name-error')
        } },
      { type: 'verify', reviewId: 'rev-1483-buyer', walk: {
          target: () => qzWalkVerifyTarget('rev-1483-buyer'),
          text: () => qzWalkVerifyText('rev-1483-buyer'),
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('review'); }
        } },
      { type: 'decide', scenarioId: 'data-error', walk: {
          target: null,
          text: "Same rule, a different kind of field. Read the situation below, then pick the option you believe is correct. This is what we're about to apply a few times.",
          setup: () => qzOpenScenario('data-error')
        } },
      { type: 'verify', reviewId: 'rev-1483-price', walk: {
          target: () => qzWalkVerifyTarget('rev-1483-price'),
          text: () => qzWalkVerifyText('rev-1483-price'),
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('review'); }
        } },
      { type: 'verify', reviewId: 'rev-1483-inspection', walk: {
          target: () => qzWalkVerifyTarget('rev-1483-inspection'),
          text: () => qzWalkVerifyText('rev-1483-inspection'),
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('review'); }
        } },
      { type: 'verify', reviewId: 'rev-1483-vesting', walk: {
          target: () => qzWalkVerifyTarget('rev-1483-vesting'),
          text: () => qzWalkVerifyText('rev-1483-vesting'),
          example: () => qzWalkVerifyExample('rev-1483-vesting'),
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('review'); }
        } }
    ]
  },
  {
    // Merged with the old "l07-missing-document": both lived in the Documents domain, and
    // this gives the lifecycle steps below a judgment component they didn't have on their
    // own (nothing here previously tested whether the trainee understood that a status has
    // to be honest, not just clicked through).
    id: 'l04-documents', number: 4, title: 'Documents: Lifecycle & Verification',
    summary: 'Move a document through its real lifecycle, verify a figure against it, then handle one that never showed up.',
    // Same document (Loan Estimate, id 3 on ORD-2026-1483) through the first four steps on
    // purpose: it starts Pending, so its own lifecycle demonstrates received -> viewed ->
    // reviewed -> verified exactly as the summary above describes, no need to jump between rows.
    steps: [
      { type: 'do', checklistId: 'docs-upload', walk: {
          target: 'tr[data-doc-id="3"] [data-doc-action="upload"]',
          text: "The Loan Estimate is still Pending. This is the Upload button, this is where you'd bring a new document into the file once it's received. There's no real file to upload in this practice, so just click Next to continue.",
          // Nothing would really upload in this simulator, so don't make clicking the real
          // button the requirement, just point at it and explain, then advance. nextAction
          // still runs the real qzUploadDoc so the document's status genuinely changes to
          // Received, keeping the next two steps (View, Mark Reviewed) working normally.
          skipClick: true,
          nextAction: () => qzUploadDoc(3),
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('documents'); }
        } },
      { type: 'do', checklistId: 'docs-download', walk: {
          target: 'tr[data-doc-id="3"] [data-doc-action="view"]',
          text: "It's received. Click View to open it and confirm the details.",
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('documents'); }
        } },
      { type: 'do', checklistId: 'docs-review', walk: {
          target: 'tr[data-doc-id="3"] [data-doc-action="review"]',
          text: 'Click "Mark Reviewed" to close out this document.',
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('documents'); }
        } },
      { type: 'verify', reviewId: 'rev-1483-loan', walk: {
          target: () => qzWalkVerifyTarget('rev-1483-loan'),
          text: () => qzWalkVerifyText('rev-1483-loan'),
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('review'); }
        } },
      { type: 'decide', scenarioId: 'missing-document', walk: {
          target: null,
          text: "Now a different case: Order ORD-2026-1512 is waiting on a document that hasn't arrived at all. Read the situation below, then pick the option you believe is correct.",
          setup: () => qzOpenScenario('missing-document')
        } },
      { type: 'do', checklistId: 'comm-followup', orderId: 'ORD-2026-1512', walk: {
          target: '[data-comm-action="followup"]',
          text: "Order 812 Birchwood Lane is still waiting on the HOA Resale Certificate. Click \"Log Follow-up\" to record that you're on it.",
          setup: () => { qzOpenOrder('ORD-2026-1512'); qzOrderTab('communication'); }
        } }
    ]
  },
  {
    id: 'l05-communication', number: 5, title: 'Professional Communication',
    summary: 'Read the thread before you reply, keep it professional, and know when to follow up vs. when to escalate.',
    steps: [
      { type: 'do', checklistId: 'comm-open', orderId: 'ORD-2026-1398', walk: {
          target: '.qz-thread-item',
          text: "Click on a message thread to read the full conversation history before doing anything else. (You'll also see a \"Log Follow-up\" button next to Send Reply, that's for later in this lesson.)",
          setup: () => { qzOpenOrder('ORD-2026-1398'); qzOrderTab('communication'); }
        } },
      { type: 'decide', scenarioId: 'comm-read-context', walk: {
          target: null,
          text: "Before you write a reply, make sure you actually read what's in that thread, not just that you opened it. Answer the question below.",
          setup: () => qzOpenScenario('comm-read-context')
        } },
      { type: 'do', checklistId: 'comm-reply', orderId: 'ORD-2026-1398', walk: {
          target: () => {
            const box = document.getElementById('qzReplyBox');
            if (box && box.value.trim().length >= 20) return document.querySelector('[data-comm-action="reply"]');
            return box;
          },
          // Live text: matches the target function above, once there's enough written it
          // stops repeating "write a reply" and confirms it's ready to send instead.
          text: () => {
            const box = document.getElementById('qzReplyBox');
            const len = box ? box.value.trim().length : 0;
            if (len >= 20) return "That's a good length. Click Send Reply when you're happy with it.";
            return `Write a professional reply (at least 20 characters) and click Send. ${len ? `(${len} of 20)` : ''}`;
          },
          // Also conditional: once there's enough written, the example has done its job and
          // just clutters the tip next to the "click Send" instruction.
          example: () => {
            const box = document.getElementById('qzReplyBox');
            const len = box ? box.value.trim().length : 0;
            if (len >= 20) return null;
            return "Thanks for flagging this, Paula. I'm following up with the lender on the revised timeline now and will share the updated closing date with you and all parties as soon as it's confirmed.";
          },
          setup: () => { qzOpenOrder('ORD-2026-1398'); qzOrderTab('communication'); }
        } },
      { type: 'decide', scenarioId: 'comm-tone', walk: {
          target: null,
          text: "You've seen how threads work. Now think about what the right reply looks like. Read the scenario below.",
          setup: () => qzOpenScenario('comm-tone')
        } },
      { type: 'do', checklistId: 'comm-followup', orderId: 'ORD-2026-1398', walk: {
          target: '[data-comm-action="followup"]',
          text: 'Click "Log Follow-up" to record that you followed up on this file.',
          setup: () => { qzOpenOrder('ORD-2026-1398'); qzOrderTab('communication'); }
        } },
      { type: 'decide', scenarioId: 'lender-followup', walk: {
          target: null,
          text: 'A vendor is late with critical documents. Read the scenario and decide what to do.',
          setup: () => qzOpenScenario('lender-followup')
        } }
    ]
  },
  {
    id: 'l06-tasks', number: 6, title: 'Tasks & Prioritization',
    summary: 'Learn to read your task queue, prioritize by urgency and closing impact, and keep statuses honest.',
    steps: [
      { type: 'do', checklistId: 'tasks-open', orderId: 'ORD-2026-1398', walk: {
          target: '[data-tab="tasks"]',
          text: 'Click the Tasks tab to see what needs to be done on this file.',
          setup: () => qzOpenOrder('ORD-2026-1398')
        } },
      { type: 'decide', scenarioId: 'task-priority', walk: {
          target: null,
          text: 'You have multiple tasks across your queue. Read the scenario and decide which to handle first.',
          setup: () => qzOpenScenario('task-priority')
        } },
      // Task id 7, "Escalate closing date change to supervisor for confirmation", is the
      // specific task the task-priority scenario just taught should come first, targeted by
      // id (not "whichever button renders first") so the walkthrough actually matches what
      // the trainee was just asked to reason about.
      { type: 'do', checklistId: 'tasks-complete', orderId: 'ORD-2026-1398', walk: {
          target: 'tr[data-task-id="7"] button',
          text: 'Mark the closing-date escalation task complete, the one you just decided should come first.',
          setup: () => { qzOpenOrder('ORD-2026-1398'); qzOrderTab('tasks'); }
        } },
      { type: 'decide', scenarioId: 'task-honesty', walk: {
          target: null,
          text: 'Task statuses have to be honest. Read the scenario.',
          setup: () => qzOpenScenario('task-honesty')
        } }
    ]
  },
  {
    id: 'l07-vendors-accounting', number: 7, title: 'Vendors & Read-Only Accounting',
    summary: 'Check vendor status, follow up when something is not confirmed, and understand where the money is tracked without touching it.',
    steps: [
      { type: 'do', checklistId: 'vendors-open', orderId: 'ORD-2026-1483', walk: {
          target: '[data-tab="vendors"]',
          text: 'Click the Vendors tab to see the vendors assigned to this order.',
          setup: () => qzOpenOrder('ORD-2026-1483')
        } },
      { type: 'do', checklistId: 'vendors-check', orderId: 'ORD-2026-1483', walk: {
          target: () => {
            const btns = document.querySelectorAll('.qz-tbl tbody .qz-btn');
            return btns.length ? btns[0] : null;
          },
          text: 'Click "Check Status" on any vendor to see where they stand.',
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('vendors'); }
        } },
      { type: 'decide', scenarioId: 'vendor-pending', walk: {
          target: null,
          text: 'A vendor is in "Pending Confirmation" and closing is close. Read the scenario.',
          setup: () => qzOpenScenario('vendor-pending')
        } },
      { type: 'do', checklistId: 'accounting-open', orderId: 'ORD-2026-1483', walk: {
          target: '[data-tab="accounting"]',
          text: 'Click Accounting to review the charges on this file. Remember: this tab is read-only for VAs.',
          setup: () => qzOpenOrder('ORD-2026-1483')
        } },
      { type: 'decide', scenarioId: 'accounting-flag', walk: {
          target: null,
          text: 'You noticed something in accounting that does not match. Read the scenario.',
          setup: () => qzOpenScenario('accounting-flag')
        } }
    ]
  },
  {
    id: 'l08-closing', number: 8, title: 'Closing: Checklist & Date Changes',
    summary: 'Confirm every document is accounted for before clearing the closing checklist, and escalate anything that moves the date.',
    steps: [
      { type: 'do', checklistId: 'closing-open', orderId: 'ORD-2026-1398', walk: {
          target: '[data-tab="closing"]',
          text: 'Click the Closing tab to see the closing checklist for this order.',
          setup: () => qzOpenOrder('ORD-2026-1398')
        } },
      { type: 'do', checklistId: 'closing-review', orderId: 'ORD-2026-1398', walk: {
          target: () => document.querySelector('.qz-panel .qz-btn.primary'),
          text: 'Review the items on the checklist, then click "Mark Checklist Reviewed."',
          setup: () => { qzOpenOrder('ORD-2026-1398'); qzOrderTab('closing'); }
        } },
      { type: 'decide', scenarioId: 'closing-docs-outstanding', walk: {
          target: null,
          text: 'The closing checklist has outstanding items. Read the scenario and decide what to do.',
          setup: () => qzOpenScenario('closing-docs-outstanding')
        } },
      { type: 'decide', scenarioId: 'closing-delay', walk: {
          target: null,
          text: 'The closing date cannot be met. Read the scenario and decide the right course of action.',
          setup: () => qzOpenScenario('closing-delay')
        } }
    ]
  }
  // Lessons 9-12 intentionally left unbuilt for now: the plan is to design these as
  // heavier, more complex "capstone" exercises (closer to what the final exam demands)
  // once that content is ready, rather than filling the slots with more thin lessons.
  // That would bring the curriculum back up to the 10-lesson minimum (currently at 8).
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
  { id: 902, orderId: 'ORD-2026-EXAM', name: 'Source Deed', type: 'Title', status: 'Reviewed', uploadedBy: 'Lucas Adminton', date: '2026-07-10', file: 'documents/exam-source-deed.html' },
  { id: 903, orderId: 'ORD-2026-EXAM', name: 'Home Inspection Invoice', type: 'Invoice', status: 'Reviewed', uploadedBy: 'Allen Property Inspections', date: '2026-07-16', file: 'documents/exam-vendor-invoice.html' }
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
  },
  {
    id: 'ex-07', type: 'verify', orderId: 'ORD-2026-EXAM', label: 'Home inspection charge',
    where: 'Accounting',
    instruction: 'Open the Home Inspection Invoice and confirm the charge on the order matches what the vendor actually billed.',
    doc: 'documents/exam-vendor-invoice.html', docTitle: 'Home Inspection Invoice',
    systemValue: '$395.00',
    sourceOptions: [
      { id: 'a', text: '$395.00 — matches, no discrepancy' },
      { id: 'b', text: '$375.00' },
      { id: 'c', text: '$350.00' },
      { id: 'd', text: '$415.00' }
    ],
    rightSourceOptionId: 'b',
    rightAction: 'correct', rightCategory: null,
    correctedValue: '375.00', partyRole: null, field: 'inspectionCharge',
    explain: 'The vendor invoice totals $375.00. The charge on the order was overstated by $20 — correct it to match what the vendor actually billed.',
    points: 10
  },
  {
    id: 'ex-08', type: 'decide',
    situation: "The buyer's agent messages you asking for an update on the title commitment. You have no new information from the settlement agency yet.",
    options: [
      'Ignore the message until you have something new to share',
      'Reply that you do not have an update yet, and will follow up with the settlement agency and circle back once you know more',
      'Make up a timeline to reassure the agent that everything is on track',
      "Forward the agent's message directly to the settlement agency without responding to the agent"
    ],
    correct: 1,
    points: 10
  },
  {
    id: 'ex-09', type: 'decide',
    situation: 'You start your day with two tasks: one is a routine contact confirmation due in 3 days, the other is an urgent escalation for a closing date change on a file closing this week.',
    options: [
      'Handle the contact confirmation first since it was assigned earlier',
      'Handle the escalation first because it is time-sensitive and affects a closing this week',
      'Do both at the same time by drafting emails for each simultaneously',
      'Ask a coworker to handle the escalation so you can stay on your normal workflow'
    ],
    correct: 1,
    points: 10
  },
  {
    id: 'ex-10', type: 'decide',
    situation: 'You open the closing checklist and see two documents are still marked Pending. Closing is scheduled for next week.',
    options: [
      'Proceed — two outstanding documents should not hold up a closing',
      'Flag the outstanding items, follow up to get them resolved, and do not mark the file closing-ready until everything is in',
      'Mark them as Reviewed so the checklist turns green',
      'Delete the pending documents from the checklist so they stop showing'
    ],
    correct: 1,
    points: 10
  }
];
