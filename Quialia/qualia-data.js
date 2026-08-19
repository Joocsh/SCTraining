/* Qualia VA Training Simulator — mock data model. No backend, no real Qualia connection. */

const QZ_STAGES = ['Opened', 'Title Processing', 'Closing Prep', 'Closing Date', 'Post-Closing', 'Closed'];

/* The simulator's "today". Every date in the dataset is positioned relative to this anchor
   so the file states stay internally coherent: a task can't be due after its own order has
   already closed, and a lesson that teaches prioritizing by urgency needs a notion of what
   "urgent" means. qzDaysFromToday()/qzDueLabel() in qualia-app.js derive overdue and
   days-remaining indicators from it. Anything user-visible that quotes a countdown ("closing
   is in 5 days") reads it from here rather than hardcoding a number into prose. */
const QZ_TODAY = '2026-08-12';

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
    // Was 2026-08-06 — i.e. already in the past, with the file still sitting in "Title
    // Processing" and its own tasks due the 13th-15th. Moved past QZ_TODAY so the file's
    // stage, tasks and closing date describe one coherent situation.
    closingDate: '2026-08-28',
    purchasePrice: 365120,
    loanAmount: 354954,
    inspectionCharge: 450,
    // Says Phase 1; the Title Commitment's Schedule A says Phase 2. A legal description is
    // what the deed and the policy actually describe, so this is never a VA edit — it drives
    // the rev-1483-legal review item (escalate to supervisor / outside my authority).
    legalDescription: 'Lot 14, Block C, Maple Ridge Estates, Phase 1, Collin County, Texas',
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
  ]},
  triage: { label: 'Triage', items: [
    { id: 'triage-open-all', label: 'Open several files at once' }
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
      "Compare it against the buyer's ID and email signature in the file, since those show how the buyer spells their own name",
      "Open the Purchase Agreement, compare it character by character to the name on the order, and follow your procedure whether it matches or not",
      'Check the most recently uploaded document in the file, since that reflects the latest information on the buyer',
      'Confirm it as verified: the settlement agent has already reviewed this file and would have caught a name problem'
    ],
    correct: 1,
    explanation: 'The Purchase Agreement is the contract that governs this transaction, so it is the document the order has to agree with. An ID or an email signature shows a preference, not the name of record; the newest document in the file is not automatically the governing one; and "someone else would have caught it" is how errors survive an entire file. Compare against the contract, and follow your procedure whether it matches or not.'
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
      'Enter the data you already have so the file is not sitting idle, and fill in the gaps as documents arrive',
      'Open the order, read the referral instructions, and confirm which fields are required before entering anything',
      'Find a recent order of the same type and use its setup as a starting point, then adjust the details',
      'Ask the settlement agent to walk you through this file before you open it, so you start from their expectations'
    ],
    correct: 1,
    explanation: 'All four keep the file moving, but only one starts with knowing what this file needs. Entering what you have first means entering unverified data and re-checking it later. Copying a similar order carries the other file\'s values into this one, which is how a wrong address or party ends up on a closing. And asking to be walked through it before reading anything spends someone else\'s time on what the instructions already say. Orient first, then enter.'
    // No practice CTA here either: this scenario now lives in Lesson 1 (Orientation), right
    // after the orders-search/orders-open steps that already have the trainee search for and
    // open a file, sending them to do it again would just repeat those steps, and worse,
    // navigating away from this page mid-walkthrough would strand the Continue button that
    // only renders on the scenario feedback panel.
  },
  {
    id: 'missing-document',
    title: 'A required document is missing',
    situation: () => `Order ORD-2026-1512 (812 Birchwood Lane) is waiting on the HOA Resale Certificate. The management company quoted 7-10 business days and the request is in their queue. Closing is ${qzDaysPhrase(qzGetOrder('ORD-2026-1512').closingDate)}, and the file is sitting in Closing Prep.`,
    options: [
      'Mark it Received and add a note that it is expected shortly, so the checklist reflects where the file actually stands',
      'Follow up with the management company for a firm date, keep the status Pending until the certificate is in hand, and flag it as blocking',
      'Escalate to your supervisor now, since the file cannot progress without it',
      'Move the file to the next stage and pick the certificate back up during closing prep'
    ],
    correct: 1,
    explanation: 'A status is read by everyone else as fact, so "Received" has to mean received; a note underneath does not undo what the status says. Escalating is not wrong in principle, but routine vendor follow-up is your job first, and a supervisor cannot do anything you have not already tried. Advancing the stage hides the one thing holding the file up. Chase it, keep the record honest, and flag it as the blocker it is.',
    practice: {
      orderId: 'ORD-2026-1512', tab: 'documents',
      buttonLabel: 'Go to Documents and resolve the outstanding item',
      hint: 'Order 812 Birchwood Lane is waiting on the HOA Resale Certificate. Once the HOA confirms it, use Upload to bring the file current.'
    }
  },
  {
    id: 'lender-followup',
    title: 'The lender has not sent final loan documents',
    situation: () => `Order ORD-2026-1398 is waiting on final loan documents from Northgate Home Loans. The lender has already told you in writing that they are behind. Closing is ${qzDaysPhrase(qzGetOrder('ORD-2026-1398').closingDate)}.`,
    options: [
      'Wait for the lender to come back to you: they have acknowledged the delay, and chasing them again adds noise without adding information',
      'Send a professional follow-up asking for a specific date they can commit to, and log the follow-up on the file',
      'Escalate to your supervisor so they can apply pressure to the lender directly',
      "Update the closing date on the order to match the lender's estimate, so the file reflects reality"
    ],
    correct: 1,
    explanation: 'An acknowledgement is not a date, and a file cannot be planned around "we are behind". Waiting leaves you with nothing to tell anyone who asks. Escalating skips the step that is actually yours. And updating the closing date is the one option that changes something you have no authority to change, on an estimate nobody has confirmed. Ask for a committed date, then log it so the next person can see the chase happened.',
    practice: {
      orderId: 'ORD-2026-1398', tab: 'communication', threadId: 3,
      buttonLabel: 'Go to Communication and follow up with the lender',
      hint: 'Open the thread with Northgate Home Loans, send a professional follow-up, then log it.'
    }
  },
  {
    id: 'closing-delay',
    title: 'The closing date needs to move',
    situation: () => {
      const o = qzGetOrder('ORD-2026-1398');
      return `Order ORD-2026-1398 was originally set to close ${fmtDate(o.originalClosingDate)}. The lender has confirmed in writing that final loan documents will not be ready in time and has recommended pushing the date. Every party is still working toward the original date.`;
    },
    options: [
      "Update the closing date to the lender's proposed date and notify all parties, so nobody is planning around a date that cannot happen",
      "Escalate to your supervisor with the lender's written statement, so the new date is confirmed by someone with authority before anyone is told",
      'Ask the selling and listing agents what date works for the buyer and seller, then enter the date they agree on',
      'Leave the date alone and note the delay on the file: the closing date is not yours to change'
    ],
    correct: 1,
    explanation: 'The last option is half right and the most tempting: the date genuinely is not yours to move. But stopping there leaves every party working toward a date that cannot happen, which is the harm you were trying to avoid. Setting the date yourself, or letting the agents negotiate one, both put a contractual date in the system without the person accountable for it ever signing off. Escalate with the evidence, and let the confirmed date come back down.',
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
      "Compare it against the Loan Estimate, since the lender's figures reflect what was actually underwritten",
      'Open the Purchase Agreement, compare the price line by line, and follow your procedure whether it matches or not',
      'Compare it against the Accounting tab, since that is what the file will actually settle on',
      'Confirm it looks consistent with the other figures on the order and report back that it checks out'
    ],
    correct: 1,
    explanation: 'Three of these compare the price to something downstream of the contract. The Loan Estimate reflects what the lender underwrote, Accounting reflects what was entered, and internal consistency only proves the same number was copied around. If the contract price was mistyped at intake, every one of those agrees with the mistake. Verification means going back to the document the number came from, and doing it whether or not anything looks wrong.'
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
      "Forward the lender's message to the agent so they have it first-hand and can judge the situation themselves",
      'Tell the agent you are aware of a delay, are working on a confirmed date, and will come back to them by a specific day',
      'Reply that you will get back to them as soon as you have something concrete, without going into detail yet',
      'Hold your reply until the lender confirms a date, so the agent gets one clear answer instead of two partial ones'
    ],
    correct: 1,
    explanation: 'None of these are dishonest, and the last two are the ones people actually choose. But "I will get back to you" with no timeframe gives the agent nothing to plan around, and waiting for certainty leaves a direct question sitting unanswered while they explain the silence to their client. Forwarding the lender\'s message hands over an internal exchange you do not control the wording of. Acknowledge what you know, say what you are doing about it, and commit to a date you will report back.'
  },
  {
    id: 'task-priority',
    title: 'Which task comes first?',
    situation: () => {
      const esc1398 = QZ_TASKS.find(t => t.id === 7), contact = QZ_TASKS.find(t => t.id === 1), lender = QZ_TASKS.find(t => t.id === 3);
      return `Three tasks are open across your queue this morning. (A) "${contact.title}" on Order 1483, due ${qzDaysPhrase(contact.dueDate)}. (B) "${esc1398.title}" on Order 1398, due ${qzDaysPhrase(esc1398.dueDate)} — that file's closing date has already been pushed once. (C) "${lender.title}" on Order 1483, due ${qzDaysPhrase(lender.dueDate)}.`;
    },
    options: [
      'Start with (A): it takes five minutes, and clearing it frees your attention for the heavier items',
      'Start with (B): it is the one with a closing depending on it, and the decision it needs is not yours to make alone',
      'Start with (C): vendors and lenders are the slowest to respond, so starting the wait early shortens the whole chain',
      'Work them in due-date order, so nothing ages past its deadline while you are picking favorites'
    ],
    correct: 1,
    explanation: 'Every one of these is a real prioritization strategy, and three of them are ones you would defend in most weeks. Quick wins do clear the desk; long-lead items do benefit from an early start; due-date order is honest queue discipline. What separates (B) is that it is both the nearest deadline and the one that has to travel through someone else before it can be resolved — anything requiring another person\'s decision needs to leave your hands first, because their clock starts when yours stops. Closing impact plus a hand-off is the combination that outranks the rest.'
  },
  {
    id: 'task-honesty',
    title: 'A task says "In Progress" but nothing has been done',
    situation: 'A coworker marked a task as "In Progress" on your file last week, but when you check, no actual work has been done on it. The task is due in two days.',
    options: [
      'Follow up with the person who owns it to confirm where it stands, then update the status to match what is actually true',
      'Leave the status alone and raise it with your supervisor: changing someone else\'s entry is not your call',
      'Take the task over yourself so it gets done before the deadline, and set the status once you have made progress',
      'Add a note describing what you found, and leave the status as the owner set it'
    ],
    correct: 0,
    explanation: 'The three wrong answers are all considerate, and that is what makes them tempting — each one avoids stepping on a colleague. But the status line is what every other person on this file reads to decide whether they need to worry, and for two more days it will keep telling them this is handled. A note underneath does not change what the status says; a supervisor escalation is slower than a message to the person who knows; and quietly absorbing someone else\'s task leaves them unaware they dropped it. Talk to the owner, then make the record true.'
  },
  {
    id: 'vendor-pending',
    title: 'A vendor has not confirmed and closing is close',
    // Deliberately set on ORD-2026-1398, not 1512: that's the order whose vendor list
    // actually has a mobile notary sitting at "Pending Confirmation" (Lakeshore Notary
    // Services). 1512's outstanding item is the HOA certificate, already covered by the
    // missing-document scenario, not a vendor confirmation.
    situation: () => {
      const o = qzGetOrder('ORD-2026-1398');
      const bd = qzBusinessDaysFromToday(o.closingDate);
      return `Order ORD-2026-1398 needs a mobile notary at closing. Lakeshore Notary Services shows "Pending Confirmation" on the Vendors tab, and closing is ${bd} business days out, on ${fmtDate(o.closingDate)}.`;
    },
    options: [
      'Follow up with the vendor now to confirm availability and get the appointment tied to the closing date',
      'Wait a few more days: notaries normally confirm close to the date, and chasing them this early is unnecessary',
      'Escalate to the settlement agent now so a backup notary can be lined up in parallel',
      'Ask the agents whether the parties have a preferred notary, and schedule one who is already confirmed'
    ],
    correct: 0,
    explanation: 'It is true that notaries often confirm late, and lining up a backup is genuinely prudent — but both of those come after you have asked. Escalating before you have made a single follow-up hands someone else a problem you have not tried to solve, and swapping in a different vendor is a decision about who works this file, which is not yours to make. Ask first. If they cannot commit, then the backup conversation has something real behind it.'
  },
  {
    id: 'accounting-flag',
    title: 'You spot a charge that does not match',
    // Reads the live charge instead of naming a number in prose: Lesson 3's inspection review
    // can correct this very figure, and the scenario used to keep quoting the pre-correction
    // amount, describing a screen the trainee could no longer see.
    situation: () => {
      const o = qzGetOrder('ORD-2026-1483');
      return `While reviewing the Accounting tab on Order ORD-2026-1483, you notice the home inspection charge is entered as ${fmtMoney(o.inspectionCharge)}, and you do not think that is what the vendor's invoice said. Accounting is read-only for VAs in Qualia.`;
    },
    options: [
      'Flag it to the settlement agent with the invoice, so someone with the authority to change accounting can verify and correct it',
      'Note the difference on the file and move on: accounting is read-only for you, so it is not your call',
      'Correct it in Data Entry, which is the tab where you are allowed to edit figures on this order',
      'Ask the vendor to reissue the invoice for the amount currently entered, so the file and the invoice agree'
    ],
    correct: 0,
    explanation: '"Read-only for me" means "not mine to change", not "not my concern" — noticing it and stopping there leaves a wrong number heading to settlement. Editing it somewhere you do have write access does not give you the authority the restriction was protecting. And asking the vendor to reissue makes the evidence match the error, which is the wrong direction entirely: the invoice is what actually happened. Route it to the person who can fix it, with the document that proves it.'
  },
  {
    id: 'closing-docs-outstanding',
    title: 'Outstanding documents at closing time',
    situation: () => {
      const o = qzGetOrder('ORD-2026-1398');
      return `You open the Closing tab on Order ORD-2026-1398 and see Final Loan Documents and Closing Disclosure both still marked Pending. Closing is ${qzDaysPhrase(o.closingDate)}, on ${fmtDate(o.closingDate)}, and this file's date has already moved once.`;
    },
    options: [
      'Flag both as outstanding, follow up with the lender for a submission date, and keep the file out of closing-ready until they arrive',
      'Leave the checklist as it is and revisit two days before closing, which is when lender packages normally land',
      'Escalate to your supervisor that this closing is at risk of missing its date again',
      'Mark the file closing-ready with a note naming the two outstanding items, so the rest of the checklist is not held up'
    ],
    correct: 0,
    explanation: 'Lender packages really do arrive late in the process, so waiting is not an unreasonable instinct — but on a file whose date has already slipped once, "it usually shows up" is the assumption that produced the first delay. Escalating is premature while you have not yet asked the lender for a date. And "closing-ready with a note" is the quiet one: a status everyone downstream trusts, qualified by a caveat only someone who opens the file will read. Chase the date, keep the status honest, and escalate when the answer you get is bad — not before you have asked.'
  }
  ,
  /* --- Lesson 9: document hierarchy --------------------------------------- */
  {
    id: 'which-governs',
    title: 'Two documents, two numbers',
    situation: 'A purchase agreement states one price. A signed addendum dated six weeks later states a different one, and says it controls as to the terms it amends. A loan estimate issued in between shows the original figure. Nothing else in the file addresses the price.',
    options: [
      'The addendum governs, because it is later in time and expressly amends the term in question',
      'The purchase agreement governs, because it is the contract the parties actually signed to buy the property',
      'The loan estimate governs, because it reflects what the lender is actually funding',
      'Whichever figure appears in the most documents governs, since that is what the file as a whole reflects'
    ],
    correct: 0,
    explanation: 'A later instrument that expressly amends a term replaces that term; the base contract survives for everything the addendum did not touch, which is why "the contract governs" is nearly right but not the answer here. The loan estimate is downstream: it reflects what the lender was told, so when it disagrees with the contract, it is evidence that the lender has not been updated, not evidence about the price. And counting how many documents repeat a number measures how far an error travelled, not whether it is correct.'
  },

  /* --- Lesson 10: wire fraud ---------------------------------------------- */
  {
    id: 'wire-first-instinct',
    title: 'An email changes where the money goes',
    situation: 'An email arrives on a file that is closing this week. It appears to come from the settlement agent you have worked with for months, and it changes the account that closing funds should be wired to. The tone and signature look exactly like their previous messages.',
    options: [
      'Verify it by phone, using a number already in the order file rather than any number in the email, before anything moves',
      'Reply to the email asking them to confirm the new details are correct',
      'Compare the new details against their previous emails, and proceed if the signature and writing style match',
      'Forward it to your supervisor and act on it once they reply'
    ],
    correct: 0,
    explanation: 'Replying asks the attacker to confirm their own instructions, and a compromised or spoofed address will happily say yes. Style-matching proves nothing when the whole technique is imitation, and previous emails may themselves be from the attacker. Forwarding to a supervisor is not wrong, but on its own it just moves the same unverified request to someone else. The only step that actually breaks the attack is confirmation through a channel the email did not supply.'
  },
  {
    id: 'wire-legit-change',
    title: 'The change looks genuine',
    situation: 'A servicer emails you updated remittance details for a payoff. The message comes from the same domain as their previous correspondence, explains that their lockbox provider changed in July, matches the servicer named on the payoff statement, and asks you to confirm by phone before sending funds.',
    options: [
      'Verify by phone using the number printed on the payoff statement, then route it to the settlement agent',
      'Accept it: the sender checks out, the explanation is plausible, and they themselves asked for phone confirmation',
      'Treat it as fraud, since any email changing wire details is by definition a wire fraud attempt',
      'Call the number in the email signature, since it came from the verified sender'
    ],
    correct: 0,
    explanation: 'This one really is legitimate, which is what makes it hard. Accepting it because it looks right skips the verification the document itself demands, and "they asked me to verify" is not the same as having verified. Treating every wire change as fraud is its own failure: real lockbox changes happen, and a VA who cannot process one is not doing the job. Calling the number in the email is the subtle trap, an attacker supplies their own callback number. Use the number on the statement, then hand it to the person with authority to act on it.'
  },

  /* --- Lesson 11: title commitment ---------------------------------------- */
  {
    id: 'schedule-b-basics',
    title: 'What Schedule B is for',
    situation: 'You open a title commitment and find Schedule A, then Schedule B-I headed "Requirements", then Schedule B-II headed "Exceptions".',
    options: [
      'B-I lists what must be done before the policy can issue; B-II lists what the policy will not cover even after it issues',
      'B-I lists problems found in the title search; B-II lists problems the buyer has agreed to accept',
      'B-I lists what the seller must pay for; B-II lists what the buyer must pay for',
      'B-I and B-II are both lists of title defects, separated by whether they are curable'
    ],
    correct: 0,
    explanation: 'Requirements are conditions: satisfy them and the policy issues. Exceptions are carve-outs: they survive closing and describe what the policy will never insure against. The distinction matters because a VA clears requirements and never "clears" exceptions. The other framings sound reasonable but collapse the two into one idea, which is exactly the mistake that leads someone to treat a standing easement as an outstanding task.'
  },

  /* --- Lesson 12: prorations and payoff ----------------------------------- */
  {
    id: 'proration-basics',
    title: 'Prorating the annual tax bill',
    situation: 'Annual property tax on a file is $8,420.00. Closing is set for September 14. The proration is calculated on a 365-day year, with the seller responsible through the day before closing and the buyer from the closing date forward.',
    options: [
      "The seller's share covers January 1 through September 13, which is 256 days, or about $5,905",
      "The seller's share covers January 1 through September 14, which is 257 days, or about $5,928",
      "The seller's share is simply eight and a half months of the annual bill, or about $5,964",
      "The seller's share is half the annual bill, since the parties split taxes evenly at closing"
    ],
    correct: 0,
    explanation: 'The daily rate is $8,420 / 365 = $23.0685. Through September 13 is 256 days, giving $5,905.54. Option two makes the classic off-by-one error of including the closing date on the seller\'s side when the convention here puts it on the buyer\'s. Rounding to whole months ignores that months are different lengths, and splitting evenly is a real practice in some contracts but is not what this one says. Read the convention before you do the arithmetic.'
  },
  {
    id: 'payoff-expired',
    title: 'The payoff has expired',
    situation: 'A payoff statement was good through August 10 and states a per diem of $47.13. Closing has moved to August 25. You have already worked out that fifteen additional days is $706.95 of interest.',
    options: [
      'Request an updated payoff statement from the servicer for the new date',
      'Add your calculated per diem to the payoff figure and use the total at closing',
      'Use the original figure and let the servicer bill the difference afterwards',
      'Ask the seller to cover the shortfall directly so the closing figures do not change'
    ],
    correct: 0,
    explanation: 'Your arithmetic tells the file how big the gap is, which is worth knowing, but the servicer\'s figure is what releases the lien. Funding your own calculation risks being short by a fee you could not see, and a short payoff means the lien stays on the property after closing. Using the stale figure guarantees that outcome. Involving the seller to paper over it moves a servicing problem onto a party who cannot fix it. Order a current statement.'
  },

  /* --- Lesson 13: triage --------------------------------------------------- */
  {
    id: 'triage-order',
    title: 'Five things happened overnight',
    situation: () => {
      const a = qzGetOrder('ORD-2026-1398'), b = qzGetOrder('ORD-2026-1512'), c = qzGetOrder('ORD-2026-1483');
      return `Your queue this morning: (A) Order 1398, closing ${qzDaysPhrase(a.closingDate)} — an email arrived overnight changing the wire instructions for closing funds. (B) Order 1512, closing ${qzDaysPhrase(b.closingDate)} — the HOA certificate finally arrived and the file is waiting on it. (C) Order 1483, closing ${qzDaysPhrase(c.closingDate)} — the selling agent sent an angry message about slow updates. (D) A routine contact confirmation, no deadline. (E) A vendor invoice to file, no deadline.`;
    },
    options: [
      'A — an unverified change to where money goes is the only item here that can cause an irreversible loss',
      'C — an angry agent will escalate to your manager if they are left waiting, and relationships take longest to repair',
      'B — it is the one thing you can actually finish this morning, and it unblocks a file that is stuck',
      'A and C together, since both are same-day communications and can be handled in one pass'
    ],
    correct: 0,
    explanation: 'B is genuinely satisfying and C is genuinely loud, and on most mornings either would be a defensible start. What separates A is not urgency but reversibility: a mis-sent wire cannot be recalled, while a stuck file stays stuck and an annoyed agent stays annoyed. Rank by what cannot be undone first, then by what blocks a closing, then by who is waiting. Bundling A with C also gets this wrong: the wire item needs your full attention and a phone call, not a pass through the inbox.'
  },
  {
    id: 'triage-second',
    title: 'Now what comes second?',
    situation: 'You have escalated the wire request and it is with your supervisor. The angry agent message, the newly-arrived HOA certificate, the contact confirmation and the vendor invoice are all still open.',
    options: [
      'The HOA certificate, because logging it unblocks a file that is otherwise sitting still and it takes minutes',
      'The angry agent, because they are the one actively waiting on a human response',
      'The contact confirmation, to clear the smallest item before the day fills up',
      'Nothing yet: stay available in case your supervisor comes back with questions about the wire escalation'
    ],
    correct: 0,
    explanation: 'This is closer than the first one, and the agent is a reasonable answer. But the certificate is short, it is the only blocker on a file in closing prep, and once it is logged the file moves without you. The agent needs a considered reply that has not become possible yet, because the file it concerns has not changed. Clear the blocker, then write the reply properly. Waiting on your supervisor is the one to avoid: being available is not the same as being idle.'
  },

  {
    id: 'triage-not-mine',
    title: 'One of these is not your job',
    situation: 'Working down the queue you reach a file where the buyer has emailed asking whether they should take title in their own name or through the trust their attorney set up last year. They want a recommendation before they sign tomorrow.',
    options: [
      'Acknowledge the message, tell them this is a question for their attorney, and let the settlement agent know it was asked',
      'Explain the general difference between the two so they can make an informed choice, without recommending either',
      'Look at how the seller is vested on the deed and suggest the buyer mirror that structure',
      'Forward the question to the settlement agent and wait for their answer before replying to the buyer'
    ],
    correct: 0,
    explanation: 'How a buyer takes title has tax and legal consequences, so it is legal advice however carefully it is phrased, and "just explaining the difference" is the version that feels safe and is not. Mirroring the seller\'s vesting is guesswork about someone else\'s estate planning. Forwarding and waiting is close, but it leaves the buyer with no reply the day before signing. Answer the person, redirect the question to whoever can actually answer it, and make sure it is on the file.'
  },
  {
    id: 'triage-leave-it',
    title: 'The item that needs nothing',
    situation: 'The last thing in your queue is a note that a vendor invoice was filed to an order yesterday. The amount matches the charge on the order, the vendor is one already engaged on the file, and the document is marked Reviewed.',
    options: [
      'Nothing. It is filed, it matches, and it is already marked Reviewed',
      'Re-open the invoice and re-check the arithmetic, since nobody has verified it since it was filed',
      'Mark it for follow-up so someone confirms the vendor has been paid',
      'Add a note to the file recording that you reviewed it today'
    ],
    correct: 0,
    explanation: 'This is the one you leave alone, and it is harder than it looks after a morning of finding problems. The figure agrees with its source, the status is accurate, and the work was done. Re-checking it, chasing payment that is not yours to chase, or annotating the file to show you looked all consume time the rest of the queue needed. Recognising that something is finished is part of triage, not an absence of it.'
  },

  /* --- Lesson 14: capstone ------------------------------------------------- */
  {
    id: 'over-escalation',
    title: 'The cost of flagging everything',
    situation: 'You have been through a file carefully and found nine things that look unusual. Six of them turn out to be genuine discrepancies. Three of them are normal: a standard survey exception, a lender fee that looks high but matches the loan estimate, and a middle initial that appears on the deed but not the tax record because the tax roll abbreviates.',
    options: [
      'Report the six, and note the three as checked and clear so the next person knows they were looked at',
      'Report all nine and let the settlement agent sort out which ones are real',
      'Report the six and say nothing about the three, since there is nothing to report',
      'Report the six now, and hold the three until someone else raises them'
    ],
    correct: 0,
    explanation: 'Sending all nine looks thorough and is actually the expensive answer: it spends a settlement agent\'s attention on three non-issues and trains them to skim your next report. Saying nothing about the three is not wrong, but it wastes the work, the next person re-checks the same three from scratch. Holding them back deliberately is the worst of both. A good report separates what needs a decision from what has been verified and cleared, and being explicit that something is fine is a finding.'
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
    // Covers two combinations nothing else in the bank reached: escalate-supervisor as the
    // right action, and outside-authority as the right category. Before this, every
    // escalation item in the project resolved to "Settlement Agent / legal-vesting", which
    // taught the trainee a reflex rather than a judgment.
    id: 'rev-1483-legal',
    orderId: 'ORD-2026-1483',
    label: 'Legal description of the property',
    where: 'Data Entry → Property',
    instruction: 'Open the Title Commitment and compare the legal description in Schedule A against the one recorded on this order.',
    doc: 'documents/title-commitment-1483.html', docTitle: 'Title Commitment',
    systemValue: 'Lot 14, Block C, Maple Ridge Estates, Phase 1, Collin County, Texas',
    sourceOptions: [
      { id: 'a', text: 'Lot 14, Block C, Maple Ridge Estates, Phase 1, Collin County, Texas — matches, no discrepancy' },
      { id: 'b', text: 'Lot 14, Block C, Maple Ridge Estates, Phase 2, Collin County, Texas' },
      { id: 'c', text: 'Lot 14, Block G, Maple Ridge Estates, Phase 1, Collin County, Texas' },
      { id: 'd', text: 'Lot 40, Block C, Maple Ridge Estates, Phase 2, Denton County, Texas' }
    ],
    rightSourceOptionId: 'b',
    rightAction: 'escalate-supervisor',
    rightCategory: 'outside-authority',
    correctedValue: null,
    partyRole: null,
    field: null,
    explain: 'The commitment describes Phase 2; the order says Phase 1. A legal description is what the deed conveys and what the title policy insures, so a one-word difference can describe a different piece of land. This is not a typo you retype: correcting it silently would put an unverified description onto closing documents. It is outside a VA\'s authority, and it goes to your supervisor rather than straight to the settlement agent, because a description mismatch on a file this far along may mean the wrong property was opened.',
    noteExample: 'The order records the legal description as "Lot 14, Block C, Maple Ridge Estates, Phase 1, Collin County, Texas." Schedule A of the Title Commitment (Title No. TX-2026-04471, effective June 20, 2026) shows "Phase 2." I have not changed anything on the order. Flagging for review before any closing document is prepared from this description.'
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

/* ============================================================================
   RECONCILE ITEMS — the `reconcile` mechanic's content bank.
   Each item opens k documents and grades n fields across them, then asks for a
   decision per field. This is where the escalation categories that the verify
   bank never reached (conflicting-sources, needs-client-confirmation) and the
   "correct answer is do nothing" cases live.
   ============================================================================ */
const QZ_RECONCILES = [
  {
    id: 'rec-1483-price-conflict',
    orderId: 'ORD-2026-1483',
    label: 'Purchase price across three sources',
    where: 'Data Entry → Transaction Information',
    instruction: 'Three documents in this file state a purchase price and they do not all agree. Open all three, record what each one says, then decide what should happen. Pay attention to what each document is and when it was signed.',
    docs: [
      { id: 'pa', title: 'Purchase Agreement', short: 'Purchase Agmt', file: 'documents/purchase-agreement-1483.html' },
      { id: 'add', title: 'Addendum No. 1', short: 'Addendum', file: 'documents/addendum-1483.html' },
      { id: 'le', title: 'Loan Estimate', short: 'Loan Estimate', file: 'documents/loan-estimate-1483.html' }
    ],
    rows: [
      {
        id: 'price',
        label: 'Total purchase price',
        onOrder: '$365,120.00',
        cells: [
          { docId: 'pa', options: ['$365,120.00', '$361,750.00', '$356,120.00', 'Not stated'], right: '$365,120.00' },
          { docId: 'add', options: ['$365,120.00', '$361,750.00', '$356,120.00', 'Not stated'], right: '$361,750.00' },
          { docId: 'le', options: ['$365,120.00', '$361,750.00', '$356,120.00', 'Not stated'], right: '$365,120.00' }
        ],
        // The addendum is later and expressly controls, but "which document governs" is a
        // contract question with money attached, and the lender is still underwriting to the
        // old figure. That combination is exactly what conflicting-sources is for.
        rightAction: 'escalate-supervisor',
        rightCategory: 'conflicting-sources',
        // Same role as a review item's noteExample, and shown the same way: a collapsed
        // "See example" inside the walkthrough tip while the escalation note is the active
        // field. The note is free text and ungraded, so without a model it is a blank page.
        noteExample: 'The order shows a purchase price of $365,120.00, which matches the Purchase Agreement and the Loan Estimate. Addendum No. 1 is signed later, states that it controls, and sets the price at $361,750.00, so $361,750.00 is the operative figure and the Loan Estimate was issued against a price the addendum has superseded. This is a contract question with the lender file attached, not a data entry fix, so I have not changed the price on the order. Escalating so the order, the lender file and the closing figures can be brought back into line together.',
        explain: 'The signed Addendum is dated after the base contract and says it controls, so $361,750.00 is the operative price. But the Loan Estimate was issued against $365,120.00, which means the lender has not been told. You do not resolve that by editing the order: escalate it as conflicting sources so the price, the lender file and the closing figures are brought back into line together.'
      },
      {
        id: 'closing',
        label: 'Closing date',
        onOrder: 'August 28, 2026',
        cells: [
          { docId: 'pa', options: ['August 28, 2026', 'August 11, 2026', 'September 4, 2026', 'Not stated'], right: 'August 28, 2026' },
          { docId: 'add', options: ['August 28, 2026', 'August 11, 2026', 'September 4, 2026', 'Not stated'], right: 'August 28, 2026' },
          { docId: 'le', options: ['August 28, 2026', 'August 11, 2026', 'September 4, 2026', 'Not stated'], right: 'Not stated' }
        ],
        // The "nothing is wrong" row, deliberately sitting next to a row that IS wrong.
        rightAction: 'none',
        rightCategory: null,
        explain: 'Both contract documents state August 28 and the addendum expressly leaves the date unchanged. A Loan Estimate does not carry a closing date at all, so its silence is not a discrepancy. Nothing to do here, and saying so is the right answer.'
      }
    ],
    explain: 'Two rows, two different right answers. Finding a real conflict does not mean everything nearby is also broken, and a document being silent on a field is not the same as disagreeing about it.'
  },

  {
    id: 'rec-1512-commitment',
    orderId: 'ORD-2026-1512',
    label: 'Title Commitment Schedule B requirements',
    where: 'Documents → Title Commitment',
    instruction: 'Work Schedule B-I of the commitment against what is actually in this file. For each requirement, record whether the evidence exists in the file, then decide what happens next.',
    docs: [
      { id: 'cm', title: 'Title Commitment (Schedules A & B)', short: 'Commitment', file: 'documents/commitment-schedule-b-1512.html' },
      { id: 'hoa', title: 'HOA Resale Certificate', short: 'HOA Cert', file: 'documents/hoa-resale-1512.html' }
    ],
    rows: [
      {
        id: 'b1-3-survey',
        label: 'B-I item 3 — current certified survey',
        onOrder: 'Survey — status Received',
        cells: [
          { docId: 'cm', options: ['Required', 'Not required', 'Required only if lender asks'], right: 'Required' },
          { docId: 'hoa', options: ['Addresses this requirement', 'Does not address this requirement'], right: 'Does not address this requirement' }
        ],
        rightAction: 'none',
        rightCategory: null,
        explain: 'The commitment requires a survey and the file already holds one marked Received. The requirement is satisfied, so there is nothing to raise. Confirming that a requirement is met is as much of an answer as flagging one that is not.'
      },
      {
        id: 'b1-4-hoa',
        label: 'B-I item 4 — HOA resale certificate showing assessments current',
        onOrder: 'HOA Resale Certificate — status Pending',
        cells: [
          { docId: 'cm', options: ['Required', 'Not required', 'Required only if lender asks'], right: 'Required' },
          { docId: 'hoa', options: ['Account is current, no delinquency', 'Account is delinquent', 'Certificate does not state account status'], right: 'Account is current, no delinquency' }
        ],
        rightAction: 'correct',
        correctedValue: 'Received',
        field: null,
        explain: 'The certificate has actually arrived and it states the account is current, which satisfies the requirement. The order still shows it Pending. That is a status that no longer matches reality, and updating a document status is squarely within a VA\'s authority.'
      },
      {
        id: 'b1-6-judgment',
        label: 'B-I item 6 — abstract of judgment against "E. Ruiz"',
        onOrder: 'Nothing in the file references this lien',
        cells: [
          { docId: 'cm', options: ['$12,480.00 against "E. Ruiz"', '$21,480.00 against "Elena Ruiz"', '$12,480.00 against "Marcus Webb"', 'Not listed'], right: '$12,480.00 against "E. Ruiz"' },
          { docId: 'hoa', options: ['Addresses this requirement', 'Does not address this requirement'], right: 'Does not address this requirement' }
        ],
        // needs-client-confirmation: nobody in-house can say whether "E. Ruiz" is this seller.
        // Escalation-note model, surfaced by qzReconcileExample as a collapsed "See example"
        // in the walkthrough tip while this row's note is the active field.
        noteExample: 'Schedule B-I item 6 of the Title Commitment (Title No. TX-2026-04502) requires release of an abstract of judgment in favor of Meridian Recovery Partners LLC for $12,480.00, styled against "E. Ruiz." Schedule A shows the record owner as Elena Ruiz, a single person. Nothing in the file establishes whether that judgment is against our seller or a different person with the same initial, and the HOA resale certificate does not touch it. I have not assumed it either way. This needs the seller to confirm identity before the requirement can be cleared or disputed.',
        rightAction: 'escalate-agent',
        rightCategory: 'needs-client-confirmation',
        explain: 'A judgment lien is recorded against "E. Ruiz" and nothing in the file resolves whether that is this seller or a different person with the same initial. Nobody internal can answer that, it needs the seller to confirm identity before the requirement can be cleared or disputed. That makes it a client-confirmation escalation to the settlement agent, not a lien you quietly assume away.'
      }
    ],
    explain: 'Three requirements, three different outcomes: one already satisfied, one a status you can fix yourself, one that cannot move without the client. Treating all three the same way is the mistake this exercise exists to catch.'
  },

  {
    id: 'rec-1398-payoff',
    orderId: 'ORD-2026-1398',
    label: 'Payoff figures against the moved closing date',
    where: 'Accounting → Payoffs',
    instruction: 'This file\'s closing date moved after the payoff statement was issued. Open the payoff statement and the Closing Disclosure, then work out what the payoff actually needs to be. Amounts are graded to the cent.',
    docs: [
      { id: 'po', title: 'Payoff Statement', short: 'Payoff', file: 'documents/payoff-statement-1398.html' },
      { id: 'cd', title: 'Closing Disclosure', short: 'Closing Disc.', file: 'documents/closing-disclosure-1398.html' }
    ],
    rows: [
      {
        id: 'goodthrough',
        label: 'Is the payoff still valid on the closing date?',
        onOrder: 'Closing scheduled August 25, 2026',
        cells: [
          { docId: 'po', options: ['Good through August 10, 2026', 'Good through August 25, 2026', 'Good through September 10, 2026', 'No expiry stated'], right: 'Good through August 10, 2026' },
          { docId: 'cd', options: ['Closing August 25, 2026', 'Closing August 11, 2026', 'Closing September 4, 2026', 'Not stated'], right: 'Closing August 25, 2026' }
        ],
        // Escalation-note model, surfaced by qzReconcileExample as a collapsed "See example"
        // in the walkthrough tip while this row's note is the active field.
        noteExample: 'The payoff statement on 219 Lakeshore Drive is good through August 10, 2026 at $282,754.73, and the Closing Disclosure has closing on August 25. The statement has expired for the date we are actually closing on. I have worked the additional per diem at $47.13 a day so the file knows the size of the gap, but I have not recorded it as a figure of record: an updated statement has to come from Summit Ridge, and the statement itself says that funding short of the per diem leaves the lien unreleased. Asking you to order a current payoff good through the new closing date.',
        rightAction: 'escalate-agent',
        rightCategory: 'outside-authority',
        explain: 'The payoff expired on August 10 and closing is now August 25. An expired payoff cannot simply be topped up on your own arithmetic and used to close: the servicer has to issue an updated statement. Flag it to the settlement agent so a current payoff is ordered, because funding short means the lien is not released.'
      },
      {
        id: 'perdiem',
        label: 'Additional per diem interest from the good-through date to closing (15 days)',
        onOrder: 'Not yet calculated',
        cells: [
          // Typed with a tolerance rather than a menu: this is arithmetic, not recognition.
          { docId: 'po', right: '706.95', tolerance: 0.01, placeholder: 'e.g. 706.95' },
          { docId: 'cd', options: ['Does not state a per diem for the payoff', 'States the payoff per diem'], right: 'Does not state a per diem for the payoff' }
        ],
        rightAction: 'none',
        rightCategory: null,
        explain: 'At $47.13 per day for the 15 days from August 10 to August 25, that is $706.95 of additional interest, which brings the payoff to $283,461.68. You calculate it so the file knows the exposure, but you do not enter it anywhere as a figure of record: the servicer\'s updated statement is what closing will use. Running the number and taking no action on it is the correct pair.'
      }
    ],
    explain: 'Payoff arithmetic tells you how big the gap is. It does not give you authority to close on a number you produced yourself.'
  },

  {
    id: 'rec-1398-wire',
    orderId: 'ORD-2026-1398',
    label: 'Two requests to change where money goes',
    where: 'Connect → Wire instructions',
    instruction: 'Two emails on this file both change wiring details. Open all three sources, including the payoff statement, and judge each email on its own. They are not the same situation, and neither one is resolved by replying to it.',
    docs: [
      { id: 'sus', title: 'Email — "UPDATED Wire Instructions"', short: 'Email A', file: 'documents/wire-email-suspect-1398.html' },
      { id: 'rout', title: 'Email — payoff remittance detail', short: 'Email B', file: 'documents/wire-email-routine-1398.html' },
      { id: 'po', title: 'Payoff Statement', short: 'Payoff', file: 'documents/payoff-statement-1398.html' }
    ],
    rows: [
      {
        id: 'sender-domain',
        label: 'Email A — sender domain against the settlement agent on this order',
        onOrder: 'ladminton@bestclosing.com',
        cells: [
          { docId: 'sus', options: ['ladminton@bestclosing.com — identical', 'ladminton@bestclosinq.com — one letter differs', 'ladminton@best-closing.com — a hyphen was added', 'The sender address is hidden'], right: 'ladminton@bestclosinq.com — one letter differs' },
          { docId: 'rout', options: ['Same sender as Email A', 'A different company entirely'], right: 'A different company entirely' },
          { docId: 'po', options: ['Names Summit Ridge as the servicer', 'Names Best Closing as the servicer'], right: 'Names Summit Ridge as the servicer' }
        ],
        // Escalation-note model, surfaced by qzReconcileExample as a collapsed "See example"
        // in the walkthrough tip while this row's note is the active field.
        noteExample: 'The order lists the settlement agent as ladminton@bestclosing.com. The email asking to move the closing funds for 219 Lakeshore Drive comes from ladminton@bestclosinq.com, one letter different, and its reply-to is a third domain again. It manufactures urgency and explicitly tells me not to call the office. I have not replied to it, forwarded it, or confirmed anything, and I am not repeating the account details here. Bringing it to you outside that thread, and I suggest we confirm with Lucas by phone on the number already in the order file.',
        rightAction: 'escalate-supervisor',
        rightCategory: 'outside-authority',
        explain: 'The sender is bestclosinq.com, not bestclosing.com, the reply-to points at a third domain, the message manufactures urgency, and it explicitly discourages you from calling the office. This is a business email compromise attempt. Do not reply to the thread, do not forward it onward, and do not confirm anything: escalate it to your supervisor through a channel that did not come out of this email.'
      },
      {
        id: 'legit-change',
        label: 'Email B — a genuine change of receiving bank',
        onOrder: 'No wire instructions on file yet',
        cells: [
          { docId: 'rout', options: ['Asks you to confirm by phone before sending funds', 'Asks you to confirm by reply email', 'Says no confirmation is needed'], right: 'Asks you to confirm by phone before sending funds' },
          { docId: 'po', options: ['Says wire instructions must be confirmed by telephone', 'Says wire instructions may be accepted by email', 'Says nothing about confirming instructions'], right: 'Says wire instructions must be confirmed by telephone' },
          { docId: 'sus', options: ['Also asks for phone confirmation', 'Discourages calling the office'], right: 'Discourages calling the office' }
        ],
        // Escalation-note model, surfaced by qzReconcileExample as a collapsed "See example"
        // in the walkthrough tip while this row's note is the active field.
        noteExample: 'Summit Ridge Mortgage Servicing, the servicer named on the payoff statement for 219 Lakeshore Drive, has emailed a change of receiving bank for the payoff. It explains why the bank changed and asks that it be confirmed by phone on the number printed on the statement, which is what the statement itself requires. It reads as genuine, but confirming it is not mine to do, and probably real is not the same as verified. Sending it to you to verify out of band against the file before any funds move. I have not replied to the sender.',
        rightAction: 'escalate-agent',
        rightCategory: 'needs-client-confirmation',
        explain: 'Email B is almost certainly legitimate: it comes from the servicer named on the payoff statement, explains why the bank changed, and asks you to verify by phone using the number printed on the statement rather than one in the email. That does not make it yours to action. Route it to the settlement agent for out-of-band verification against the file number. "Probably real" and "verified" are not the same thing, and the difference is the whole exercise.'
      },
      {
        // The "nothing is wrong here" row, placed inside the fraud exercise on purpose: once a
        // trainee has caught a real attack, the reflex is to treat every field on the file as
        // tainted, and that reflex costs as much as missing the attack did.
        id: 'loan-number',
        label: 'Loan number quoted in Email B against the payoff statement',
        onOrder: 'Not recorded on the order',
        cells: [
          { docId: 'rout', options: ['Loan 8842-117093', 'Loan 8842-117039', 'Loan 1398-884211', 'No loan number given'], right: 'Loan 8842-117093' },
          { docId: 'po', options: ['Loan 8842-117093', 'Loan 8842-117039', 'Loan 1398-884211', 'No loan number given'], right: 'Loan 8842-117093' }
        ],
        rightAction: 'none',
        rightCategory: null,
        explain: 'The loan number in Email B matches the payoff statement exactly. Having just caught a fraud attempt on this file does not make the rest of it suspect, and reporting a field that agrees with its source spends attention you will need for one that does not.'
      }
    ],
    explain: 'Not every wire change is fraud, and treating them all as fraud is its own failure. What both real items have in common is that the verification never happens inside the email that asked for it, and the third row is there to check you can still say "this one is fine".'
  }
];

/* ============================================================================
   COMPOSE ITEMS — replies graded against a rubric the trainee cannot see until
   they submit. Criteria map to functions in QZ_RUBRIC_CHECKS.
   ============================================================================ */
const QZ_COMPOSES = [
  {
    id: 'cmp-1398-delay',
    orderId: 'ORD-2026-1398',
    label: 'Reply to the selling agent about the delay',
    instruction: 'Paula Aragone is asking for an update. The lender has told you documents will be late and has recommended pushing the closing date, but nothing has been confirmed and the new date is not yours to give. Write the reply you would actually send.',
    placeholder: 'Write your reply to Paula Aragone...',
    thread: [
      { sender: 'Northgate Home Loans', recipient: 'You (VA)', date: '2026-08-08', body: 'We are behind on this file, documents will not be ready before August 11th. Recommend pushing the closing date.' },
      { sender: 'Paula Aragone', recipient: 'You (VA)', date: '2026-08-08', body: 'Buyer and seller need to know as soon as there is a new date, please keep us posted.' }
    ],
    rubric: [
      { check: 'identifiesFile', label: 'Names the file (address or order number)', why: 'A reply that could be about any of your files makes the recipient go looking for context you already had.' },
      { check: 'acknowledgesRequest', label: 'Acknowledges what was asked', why: 'Paula asked a direct question. Answering around it reads as avoidance even when it is not.' },
      { check: 'givesTimeframe', label: 'Commits to a specific time you will follow up', why: '"As soon as I know" is not something anyone can plan around. Name a day.' },
      { check: 'statesNextStep', label: 'Says what you are doing about it', why: 'Tell them the action in flight, not just that you received their message.' },
      { check: 'noBlame', label: 'Does not blame the lender by name', why: 'Assigning fault to another party in writing creates a record you cannot control and does not move the file.' },
      { check: 'noCommitmentBeyondAuthority', label: 'Does not announce a new closing date', why: 'The date is not confirmed and is not yours to set. Stating one commits the firm to something nobody approved.' },
      { check: 'noNPI', label: 'No account numbers or personal identifiers', why: 'Loan and account numbers do not belong in routine correspondence.' }
    ]
  },
  {
    id: 'cmp-1398-wire',
    orderId: 'ORD-2026-1398',
    label: 'Escalate the suspicious wire request',
    instruction: 'You have identified the "UPDATED Wire Instructions" email as a likely business email compromise attempt. Write the message escalating it to your supervisor. Do not reply to the original thread.',
    placeholder: 'Write your escalation to your supervisor...',
    thread: [
      { sender: 'ladminton@bestclosinq.com', recipient: 'You (VA)', date: '2026-08-21', body: 'URGENT - our account has been frozen, funds for 219 Lakeshore must go to the new receiving account below. Do not call the office, I am in closings all day.' }
    ],
    rubric: [
      { check: 'identifiesFile', label: 'Names the file the request relates to', why: 'Your supervisor needs to know which closing is exposed before anything else.' },
      { check: 'statesNextStep', label: 'Says what you have done and are doing', why: 'They need to know whether you replied, confirmed, or forwarded anything, because that changes how urgent this is.' },
      { check: 'givesTimeframe', label: 'Conveys the timing pressure concretely', why: 'The message claims a wire goes out tomorrow morning. Whether that is true or not, the window matters.' },
      { check: 'verifyOutOfBand', label: 'Proposes verifying by phone using a number from the file', why: 'The only way to break the attack is to confirm through a channel the email did not supply.' },
      { check: 'noNPI', label: 'Does not repeat the account and routing numbers', why: 'Re-transmitting the fraudulent account details spreads them further into your own systems.', required: true }
    ]
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

/* 14 lessons — the trainee's guided
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
      // Closing the file's tab, not a back link and not the top-bar Orders section. The old
      // `.qz-back` went away with the Connect shell, and Orders already renders as the active
      // section while an order is open, so pointing there tells the trainee to click something
      // that already looks selected. Core is a multi-document app: you leave a file by closing
      // it, which is also the mechanic Lesson 13's triage exercise is built on.
      { type: 'do', checklistId: 'orders-back', walk: {
          target: '#qzOrderTabs [data-order-tab="ORD-2026-1483"] .x',
          text: 'Last one. Core keeps every file you open as a tab up here, so you leave one by closing it: click the × on the "5445 Main Street" tab. With no files left open you land back on the Orders list.',
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
          target: () => qzVerifyTarget('rev-1483-buyer'),
          text: () => qzVerifyText('rev-1483-buyer'),
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('review'); }
        } },
      { type: 'decide', scenarioId: 'data-error', walk: {
          target: null,
          text: "Same rule, a different kind of field. Read the situation below, then pick the option you believe is correct. This is what we're about to apply a few times.",
          setup: () => qzOpenScenario('data-error')
        } },
      { type: 'verify', reviewId: 'rev-1483-price', walk: {
          target: () => qzVerifyTarget('rev-1483-price'),
          text: () => qzVerifyText('rev-1483-price'),
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('review'); }
        } },
      { type: 'verify', reviewId: 'rev-1483-inspection', walk: {
          target: () => qzVerifyTarget('rev-1483-inspection'),
          text: () => qzVerifyText('rev-1483-inspection'),
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('review'); }
        } },
      { type: 'verify', reviewId: 'rev-1483-vesting', walk: {
          target: () => qzVerifyTarget('rev-1483-vesting'),
          text: () => qzVerifyText('rev-1483-vesting'),
          example: () => qzVerifyExample('rev-1483-vesting'),
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('review'); }
        } },
      // Deliberately last: it's the only item in this lesson whose answer is neither "fix it"
      // nor "escalate to the Settlement Agent", so it lands after the trainee has built the
      // reflex — and breaks it.
      { type: 'verify', reviewId: 'rev-1483-legal', walk: {
          target: () => qzVerifyTarget('rev-1483-legal'),
          text: () => qzVerifyText('rev-1483-legal'),
          example: () => qzVerifyExample('rev-1483-legal'),
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
          target: () => qzVerifyTarget('rev-1483-loan'),
          text: () => qzVerifyText('rev-1483-loan'),
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
  ,
  /* ---------------------------------------------------------------------------
     Lessons 9-14: the domain half of the course.
     Lessons 1-8 teach coordination habits (verify, escalate, keep records
     honest, write professionally) which are real but generic. These six teach
     title and escrow specifically: which document governs when two disagree,
     how wire fraud actually arrives, what a commitment's Schedule B is asking
     for, payoff arithmetic, working a queue, and finally all of it at once.
     Every one of them contains at least one item whose right answer is "nothing
     is wrong here" and one whose right answer is "this is not mine to fix" —
     without both, the trainee learns that every screen hides an error, which is
     as damaging as never checking.
     --------------------------------------------------------------------------- */
  {
    id: 'l09-conflicting-sources', number: 9, title: 'When Sources Disagree',
    summary: 'Three documents, three numbers, one file. Learn which document governs, what an effective date changes, and when the right move is not to correct anything.',
    steps: [
      { type: 'reconcile', reconcileId: 'rec-1483-price-conflict', walk: {
          target: () => qzReconcileTarget('rec-1483-price-conflict'),
          text: () => qzReconcileText('rec-1483-price-conflict'),
          example: () => qzReconcileExample('rec-1483-price-conflict'),
          setup: () => { qzOpenOrder('ORD-2026-1483'); qzOrderTab('review'); }
        } },
      { type: 'decide', scenarioId: 'which-governs', walk: {
          target: null,
          text: 'You just worked a real conflict. Now name the rule behind it.',
          setup: () => qzOpenScenario('which-governs')
        } }
    ]
  },
  {
    id: 'l10-wire-fraud', number: 10, title: 'Wire Instructions & Business Email Compromise',
    summary: 'The single most expensive mistake in this industry arrives as an ordinary email. Learn to spot it, and learn why even the legitimate version still gets verified by phone.',
    steps: [
      { type: 'decide', scenarioId: 'wire-first-instinct', walk: {
          target: null,
          text: "Before you look at anything, answer this. It sets the rule the rest of the lesson tests.",
          setup: () => qzOpenScenario('wire-first-instinct')
        } },
      { type: 'reconcile', reconcileId: 'rec-1398-wire', walk: {
          target: () => qzReconcileTarget('rec-1398-wire'),
          text: () => qzReconcileText('rec-1398-wire'),
          example: () => qzReconcileExample('rec-1398-wire'),
          setup: () => { qzOpenOrder('ORD-2026-1398'); qzOrderTab('review'); }
        } },
      { type: 'compose', composeId: 'cmp-1398-wire', orderId: 'ORD-2026-1398', walk: {
          target: () => qzComposeTarget('cmp-1398-wire'),
          text: () => qzComposeText('cmp-1398-wire'),
          example: () => {
            const st = qzComposeGet('cmp-1398-wire');
            if (st.resolvedAt && st.correct) return null;
            return "Flagging a likely wire fraud attempt on Order ORD-2026-1398, 219 Lakeshore Drive. An email arriving today claims to be from Lucas Adminton and changes the receiving account for closing funds. The sender domain is one letter off from ours, the reply-to is a third domain, and it explicitly discourages calling the office. I have not replied, forwarded it, or confirmed anything, and I am not repeating the account details here. The message claims a wire goes out tomorrow morning, so this needs eyes today. I suggest we confirm directly with Lucas by phone on the number in the order file before anything moves.";
          },
          setup: () => { qzOpenOrder('ORD-2026-1398'); qzOrderTab('communication'); }
        } },
      { type: 'decide', scenarioId: 'wire-legit-change', walk: {
          target: null,
          text: "Last one, and it is the harder half: not every change of instructions is an attack.",
          setup: () => qzOpenScenario('wire-legit-change')
        } }
    ]
  },
  {
    id: 'l11-commitment', number: 11, title: 'Reading a Title Commitment',
    summary: "Schedule B is a list of what has to happen before a policy can issue. Trace each requirement to its evidence: some are already satisfied, some are yours to clear, and some cannot move without the client.",
    steps: [
      { type: 'decide', scenarioId: 'schedule-b-basics', walk: {
          target: null,
          text: 'First, what Schedule B actually is. Read the situation and pick the right description.',
          setup: () => qzOpenScenario('schedule-b-basics')
        } },
      { type: 'reconcile', reconcileId: 'rec-1512-commitment', walk: {
          target: () => qzReconcileTarget('rec-1512-commitment'),
          text: () => qzReconcileText('rec-1512-commitment'),
          example: () => qzReconcileExample('rec-1512-commitment'),
          setup: () => { qzOpenOrder('ORD-2026-1512'); qzOrderTab('review'); }
        } }
    ]
  },
  {
    id: 'l12-prorations-payoff', number: 12, title: 'Prorations & Payoff Arithmetic',
    summary: 'Real numbers, to the cent. A payoff that expired, a per diem that has been running, and a tax proration nobody has calculated yet.',
    steps: [
      { type: 'decide', scenarioId: 'proration-basics', walk: {
          target: null,
          text: 'Start with the arithmetic itself, then apply it to the file.',
          setup: () => qzOpenScenario('proration-basics')
        } },
      { type: 'reconcile', reconcileId: 'rec-1398-payoff', walk: {
          target: () => qzReconcileTarget('rec-1398-payoff'),
          text: () => qzReconcileText('rec-1398-payoff'),
          example: () => qzReconcileExample('rec-1398-payoff'),
          setup: () => { qzOpenOrder('ORD-2026-1398'); qzOrderTab('review'); }
        } },
      { type: 'decide', scenarioId: 'payoff-expired', walk: {
          target: null,
          text: 'One more judgment call about the payoff you just worked.',
          setup: () => qzOpenScenario('payoff-expired')
        } }
    ]
  },
  {
    id: 'l13-triage', number: 13, title: 'Triage: Five Files, One Morning',
    summary: 'Every file in your queue wants something. Order the work, then do the top of it. What is graded is the order you chose, not just the actions you took.',
    steps: [
      { type: 'do', checklistId: 'triage-open-all', walk: {
          target: '#qzOrderTabs',
          text: 'Every order you open gets its own tab up here, and each remembers where you were. Open all three practice files so you can move between them, that is how this job is actually worked.',
          skipClick: true,
          nextAction: () => { ['ORD-2026-1483', 'ORD-2026-1512', 'ORD-2026-1398'].forEach(qzOpenOrderTab); qzMark('triage-open-all'); qzRenderRoot(); },
          setup: () => qzOpenOrder('ORD-2026-1483')
        } },
      { type: 'decide', scenarioId: 'triage-order', walk: {
          target: null,
          text: 'Three files, three incoming events, one morning. Which do you touch first?',
          setup: () => qzOpenScenario('triage-order')
        } },
      { type: 'decide', scenarioId: 'triage-second', walk: {
          target: null,
          text: 'You handled the first one. What is second, and why is it not the loudest?',
          setup: () => qzOpenScenario('triage-second')
        } },
      { type: 'decide', scenarioId: 'triage-not-mine', walk: {
          target: null,
          text: 'Further down the queue. Not everything that lands on you is yours to answer.',
          setup: () => qzOpenScenario('triage-not-mine')
        } },
      { type: 'decide', scenarioId: 'triage-leave-it', walk: {
          target: null,
          text: 'Last item. After a morning of finding problems, this one is the hard one.',
          setup: () => qzOpenScenario('triage-leave-it')
        } },
      { type: 'compose', composeId: 'cmp-1398-delay', orderId: 'ORD-2026-1398', walk: {
          target: () => qzComposeTarget('cmp-1398-delay'),
          text: () => qzComposeText('cmp-1398-delay'),
          example: () => {
            const st = qzComposeGet('cmp-1398-delay');
            if (st.resolvedAt && st.correct) return null;
            return "Hi Paula, thanks for following up on 219 Lakeshore Drive. The lender has told us the final loan documents will not be ready for the original date, and they have recommended moving closing. I do not have a confirmed new date yet, and I am not able to set one myself, so I have escalated it to my supervisor to get it confirmed. I will come back to you by Thursday either way, even if the only news is that we are still waiting.";
          },
          setup: () => { qzOpenOrder('ORD-2026-1398'); qzOrderTab('communication'); }
        } }
    ]
  },
  {
    id: 'l14-capstone', number: 14, title: 'Capstone: Take a File to Closing-Ready',
    summary: 'No walkthrough, no hints. Work the file the way you would on the job, and remember that reporting something that is not wrong costs you as much as missing something that is.',
    // Deliberately has no `walk` on any step: the walkthrough engine only offers "Start
    // walkthrough" when every step declares one, so this lesson simply never offers it.
    // Everything here has been taught; the point is whether it transfers unaided.
    steps: [
      { type: 'verify', reviewId: 'rev-1483-legal' },
      { type: 'reconcile', reconcileId: 'rec-1483-price-conflict' },
      { type: 'reconcile', reconcileId: 'rec-1512-commitment' },
      { type: 'decide', scenarioId: 'over-escalation' },
      { type: 'compose', composeId: 'cmp-1398-delay', orderId: 'ORD-2026-1398' }
    ]
  }
];

/* ============================================================================
   FINAL EXAM — sampled from a bank, not a fixed list.
   With 14 lessons a 10-item fixed exam is both too short and too memorable: two
   attempts saw exactly the same questions in the same order. QZ_EXAM_BANK holds
   more items than any single attempt uses; qzExamBuild() draws a fixed number
   from each category so every sitting has the same shape and difficulty mix
   without being the same paper.

   Target mix (D-4): ~40% verify/reconcile, ~35% decide, ~15% compose, ~10%
   numeric. At least three items whose correct answer is "no action needed".
   ============================================================================ */
const QZ_EXAM_PASS_PCT = 0.75; /* Recalibrated from 0.80, see comment in qzExamSubmit. */
const QZ_EXAM_MINUTES = 45;

const QZ_EXAM_BLUEPRINT = [
  { category: 'source', count: 6 },   /* verify — read a document, decide an action */
  { category: 'multi', count: 2 },    /* reconcile — several sources at once       */
  { category: 'judgment', count: 7 }, /* decide                                     */
  { category: 'numeric', count: 2 },  /* arithmetic with a tolerance                */
  { category: 'written', count: 3 }   /* compose — graded against a rubric          */
];

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
  legalDescription: 'Lot 9, Block D, Hollow Creek Estates, Phase 1, Collin County, Texas',
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

const QZ_EXAM_BANK = [
  /* ---------- category: source (verify) ---------------------------------- */
  {
    id: 'ex-buyer-name', category: 'source', type: 'verify', orderId: 'ORD-2026-EXAM', label: "Buyer's legal name",
    where: 'Data Entry → Contacts',
    instruction: "Open the Purchase Agreement and compare it to the buyer's name on this order.",
    doc: 'documents/exam-purchase-agreement.html', docTitle: 'Purchase Agreement',
    systemValue: 'Derrick Owusu',
    sourceOptions: [
      { id: 'a', text: 'Derrick Owusu — matches, no discrepancy' },
      { id: 'b', text: 'Derek Owusu' },
      { id: 'c', text: 'Derek Owusu, Jr.' },
      { id: 'd', text: 'D. Owusu' }
    ],
    rightSourceOptionId: 'b', rightAction: 'correct', rightCategory: null,
    correctedValue: 'Derek Owusu', partyRole: 'Buyer', field: null,
    explain: 'A one-character data-entry typo against the contract. Correct it directly.',
    points: 5
  },
  {
    id: 'ex-price', category: 'source', type: 'verify', orderId: 'ORD-2026-EXAM', label: 'Purchase price',
    where: 'Data Entry → Loan',
    instruction: 'Verify the purchase price on the order against the Purchase Agreement.',
    doc: 'documents/exam-purchase-agreement.html', docTitle: 'Purchase Agreement',
    systemValue: '$398,750.00',
    sourceOptions: [
      { id: 'a', text: '$398,750.00 — matches, no discrepancy' },
      { id: 'b', text: '$389,750.00' },
      { id: 'c', text: '$398,570.00' },
      { id: 'd', text: '$398,750.00, plus a $1,500 credit' }
    ],
    rightSourceOptionId: 'a', rightAction: 'none', rightCategory: null,
    correctedValue: null, partyRole: null, field: null,
    explain: 'The price matches exactly. Confirming a correct value is as much the job as catching a wrong one.',
    points: 5
  },
  {
    id: 'ex-vesting', category: 'source', type: 'verify', orderId: 'ORD-2026-EXAM', label: 'Seller vesting on the Source Deed',
    where: 'Documents → Source Deed',
    instruction: 'Compare how the seller is vested on the Source Deed against the vesting shown on the order.',
    doc: 'documents/exam-source-deed.html', docTitle: 'Source Deed',
    systemValue: 'Marisol Vega',
    sourceOptions: [
      { id: 'a', text: 'Marisol Vega — matches, no discrepancy' },
      { id: 'b', text: 'Marisol Vega, a married person' },
      { id: 'c', text: 'Marisol T. Vega, a married person' },
      { id: 'd', text: 'M. Vega' }
    ],
    rightSourceOptionId: 'c', rightAction: 'escalate-agent', rightCategory: 'legal-vesting',
    correctedValue: null, partyRole: null, field: null,
    explain: 'Vesting is legal, not clerical. The source deed carries a middle initial and marital-status language the order does not reflect.',
    points: 5
  },
  {
    id: 'ex-inspection', category: 'source', type: 'verify', orderId: 'ORD-2026-EXAM', label: 'Home inspection charge',
    where: 'Accounting',
    instruction: 'Open the Home Inspection Invoice and confirm the charge on the order matches what the vendor billed.',
    doc: 'documents/exam-vendor-invoice.html', docTitle: 'Home Inspection Invoice',
    systemValue: '$395.00',
    sourceOptions: [
      { id: 'a', text: '$395.00 — matches, no discrepancy' },
      { id: 'b', text: '$375.00' },
      { id: 'c', text: '$350.00' },
      { id: 'd', text: '$415.00' }
    ],
    rightSourceOptionId: 'b', rightAction: 'correct', rightCategory: null,
    correctedValue: '375.00', partyRole: null, field: 'inspectionCharge',
    explain: 'The invoice totals $375.00. Correct the charge to what was actually billed.',
    points: 5
  },
  {
    id: 'ex-legal-desc', category: 'source', type: 'verify', orderId: 'ORD-2026-EXAM', label: 'Legal description',
    where: 'Data Entry → Properties',
    instruction: 'Compare the legal description on the order against the one on the Source Deed.',
    doc: 'documents/exam-source-deed.html', docTitle: 'Source Deed',
    systemValue: 'Lot 9, Block D, Hollow Creek Estates, Phase 1, Collin County, Texas',
    sourceOptions: [
      { id: 'a', text: 'Lot 9, Block D, Hollow Creek Estates, Phase 1, Collin County, Texas — matches' },
      { id: 'b', text: 'Lot 9, Block D, Hollow Creek Estates, Phase 2, Collin County, Texas' },
      { id: 'c', text: 'Lot 90, Block D, Hollow Creek Estates, Phase 1, Denton County, Texas' },
      { id: 'd', text: 'Lot 9, Block B, Hollow Creek Estates, Phase 1, Collin County, Texas' }
    ],
    rightSourceOptionId: 'a', rightAction: 'none', rightCategory: null,
    correctedValue: null, partyRole: null, field: null,
    explain: 'The description matches the deed word for word. Nothing to raise.',
    points: 5
  },
  {
    id: 'ex-seller-name', category: 'source', type: 'verify', orderId: 'ORD-2026-EXAM', label: "Seller's name on the contract",
    where: 'Data Entry → Contacts',
    instruction: "Open the Purchase Agreement and compare the seller's name against the order.",
    doc: 'documents/exam-purchase-agreement.html', docTitle: 'Purchase Agreement',
    systemValue: 'Marisol Vega',
    sourceOptions: [
      { id: 'a', text: 'Marisol Vega — matches, no discrepancy' },
      { id: 'b', text: 'Marisol T. Vega' },
      { id: 'c', text: 'Maribel Vega' },
      { id: 'd', text: 'M. Vega' }
    ],
    rightSourceOptionId: 'a', rightAction: 'none', rightCategory: null,
    correctedValue: null, partyRole: null, field: null,
    explain: 'The contract and the order agree. The deed vesting question is separate and does not make this field wrong.',
    points: 5
  },
  {
    id: 'ex-loan-amt', category: 'source', type: 'verify', orderId: 'ORD-2026-EXAM', label: 'Loan amount',
    where: 'Data Entry → Loan',
    instruction: 'Verify the loan amount recorded on the order against the Purchase Agreement financing terms.',
    doc: 'documents/exam-purchase-agreement.html', docTitle: 'Purchase Agreement',
    systemValue: '$372,900.00',
    sourceOptions: [
      { id: 'a', text: '$372,900.00 — matches, no discrepancy' },
      { id: 'b', text: '$327,900.00' },
      { id: 'c', text: '$372,090.00' },
      { id: 'd', text: 'The agreement does not state a loan amount' }
    ],
    rightSourceOptionId: 'd', rightAction: 'escalate-agent', rightCategory: 'conflicting-sources',
    correctedValue: null, partyRole: null, field: null,
    explain: 'The purchase agreement does not state a loan amount at all, so it cannot confirm the figure on the order. Verifying against a document that is silent is not verification, the figure needs a source that actually carries it.',
    points: 5
  },

  /* ---------- category: multi (reconcile) --------------------------------- */
  {
    id: 'ex-rec-vesting', category: 'multi', type: 'reconcile', orderId: 'ORD-2026-EXAM',
    label: 'Seller identity across the contract and the deed',
    where: 'Document Review',
    instruction: 'The contract and the deed both name the seller. Record what each says, then decide what happens.',
    docs: [
      { id: 'pa', title: 'Purchase Agreement', short: 'Purchase Agmt', file: 'documents/exam-purchase-agreement.html' },
      { id: 'sd', title: 'Source Deed', short: 'Source Deed', file: 'documents/exam-source-deed.html' }
    ],
    rows: [
      {
        id: 'seller',
        label: 'Seller name and vesting',
        onOrder: 'Marisol Vega',
        cells: [
          { docId: 'pa', options: ['Marisol Vega', 'Marisol T. Vega, a married person', 'Maribel Vega', 'Not stated'], right: 'Marisol Vega' },
          { docId: 'sd', options: ['Marisol Vega', 'Marisol T. Vega, a married person', 'Maribel Vega', 'Not stated'], right: 'Marisol T. Vega, a married person' }
        ],
        rightAction: 'escalate-agent', rightCategory: 'legal-vesting',
        explain: 'The deed carries a fuller vesting than the contract. That is a legal question about how title is held, not a typo to reconcile by picking one.'
      },
      {
        id: 'address',
        label: 'Property address',
        onOrder: '4110 Hollow Creek Court, Allen, TX 75013',
        cells: [
          { docId: 'pa', options: ['4110 Hollow Creek Court, Allen, TX 75013', '4110 Hollow Creek Drive, Allen, TX 75013', '4100 Hollow Creek Court, Allen, TX 75013', 'Not stated'], right: '4110 Hollow Creek Court, Allen, TX 75013' },
          { docId: 'sd', options: ['4110 Hollow Creek Court, Allen, TX 75013', '4110 Hollow Creek Drive, Allen, TX 75013', '4100 Hollow Creek Court, Allen, TX 75013', 'Not stated'], right: '4110 Hollow Creek Court, Allen, TX 75013' }
        ],
        rightAction: 'none', rightCategory: null,
        explain: 'All three agree. Nothing to do.'
      }
    ],
    explain: 'One row needs escalating, one needs nothing. Finding a real problem does not mean the row beside it is also broken.',
    points: 10
  },
  {
    id: 'ex-rec-charges', category: 'multi', type: 'reconcile', orderId: 'ORD-2026-EXAM',
    label: 'Inspection charge against the invoice',
    where: 'Document Review',
    instruction: 'Reconcile what the order was charged against what the vendor billed.',
    docs: [
      { id: 'inv', title: 'Home Inspection Invoice', short: 'Invoice', file: 'documents/exam-vendor-invoice.html' },
      { id: 'pa', title: 'Purchase Agreement', short: 'Purchase Agmt', file: 'documents/exam-purchase-agreement.html' }
    ],
    rows: [
      {
        id: 'total',
        label: 'Total billed for inspection services',
        onOrder: '$395.00',
        cells: [
          { docId: 'inv', right: '375.00', tolerance: 0.01, placeholder: 'e.g. 375.00' },
          { docId: 'pa', options: ['States who pays for the inspection', 'Does not state an inspection amount'], right: 'Does not state an inspection amount' }
        ],
        rightAction: 'correct', correctedValue: '375.00', field: 'inspectionCharge',
        explain: 'The invoice totals $375.00 ($325 inspection plus $50 termite report). The order is overstated by $20 and the contract has nothing to say about the amount.'
      }
    ],
    explain: 'Add the line items yourself rather than reading the first number you see.',
    points: 10
  },

  /* ---------- category: judgment (decide) --------------------------------- */
  {
    id: 'ex-stage', category: 'judgment', type: 'decide',
    situation: 'Open this order and look at its Workflow before answering. Which statement matches the current stage of the file and the reason recorded for it?',
    options: [
      'Closing Prep — the file is waiting on final loan documents from the lender',
      'Opened — intake is still being completed and no title work has started',
      'Title Processing — the settlement agency is preparing the title commitment',
      'Closing Date — everything is cleared and the file is ready to close'
    ],
    correct: 2, points: 5
  },
  {
    id: 'ex-wire', category: 'judgment', type: 'decide',
    situation: 'An email arrives changing the account that closing funds should be wired to. It appears to come from the settlement agent, the signature matches their previous messages, and it says the change is urgent.',
    options: [
      'Verify by phone using a number already in the order file, before anything moves',
      'Reply to the email and ask them to confirm the new details are correct',
      'Compare the details against previous emails and proceed if the signature matches',
      'Update the wire instructions and flag the change in your notes for the settlement agent to review'
    ],
    correct: 0, points: 5
  },
  {
    id: 'ex-governs', category: 'judgment', type: 'decide',
    situation: 'A purchase agreement states one price. A signed addendum dated six weeks later states a different one and says it controls as to the terms it amends.',
    options: [
      'The addendum controls the amended term; the base contract still governs everything it did not touch',
      'The base purchase agreement controls, since it is the contract the parties signed to buy the property',
      'Neither controls until the lender confirms which figure they underwrote',
      'The lower of the two figures controls, since that is what the buyer will expect to pay'
    ],
    correct: 0, points: 5
  },
  {
    id: 'ex-status', category: 'judgment', type: 'decide',
    situation: 'A required document has not arrived, but the party responsible has told you it will be sent this week. The file is in closing prep and the checklist shows the document as Pending.',
    options: [
      'Leave it Pending, follow up for a firm date, and flag it as blocking',
      'Mark it Received and note in the file that it is expected this week',
      'Escalate to your supervisor that the closing is at risk',
      'Advance the file to the next stage and revisit the document before closing'
    ],
    correct: 0, points: 5
  },
  {
    id: 'ex-accounting-auth', category: 'judgment', type: 'decide',
    situation: 'You notice a charge on the Accounting grid that does not match the vendor invoice. Accounting is read-only for VAs.',
    options: [
      'Flag it to the settlement agent with the invoice, so someone with authority can correct it',
      'Note the difference and move on, since accounting is not something you can edit',
      'Correct it on a tab where you do have edit access',
      'Ask the vendor to reissue the invoice so it matches what was entered'
    ],
    correct: 0, points: 5
  },
  {
    id: 'ex-over-escalate', category: 'judgment', type: 'decide',
    situation: 'You have reviewed a file and found nine unusual-looking items. Six are genuine discrepancies. Three turn out to be normal: a standard survey exception, a fee that matches the loan estimate, and an abbreviation difference between the deed and the tax roll.',
    options: [
      'Report the six, and record the three as checked and clear',
      'Report all nine and let the settlement agent decide which are real',
      'Report only the six and say nothing about the three',
      'Report the six now and hold the three in case they come up later'
    ],
    correct: 0, points: 5
  },
  {
    id: 'ex-schedule-b', category: 'judgment', type: 'decide',
    situation: 'A title commitment lists Schedule B-I "Requirements" and Schedule B-II "Exceptions".',
    options: [
      'B-I must be satisfied before the policy issues; B-II describes what the policy will never cover',
      'B-I lists title defects found; B-II lists defects the buyer has agreed to accept',
      'B-I lists seller obligations; B-II lists buyer obligations',
      'Both list title defects, separated by whether they can be cured before closing'
    ],
    correct: 0, points: 5
  },
  {
    id: 'ex-triage', category: 'judgment', type: 'decide',
    situation: 'Four items land at once: an unverified change to wire instructions on a file closing this week, a document that just arrived and unblocks a stalled file, an angry message from an agent about slow updates, and a routine contact confirmation with no deadline.',
    options: [
      'The wire change, because it is the only one where a mistake cannot be undone',
      'The angry agent, because an unanswered complaint escalates and damages the relationship',
      'The arrived document, because it is quick and it unblocks a file immediately',
      'The wire change and the agent together, since both are same-day communications'
    ],
    correct: 0, points: 5
  },
  {
    id: 'ex-payoff-expired', category: 'judgment', type: 'decide',
    situation: 'A payoff statement expired two weeks before the rescheduled closing date. You have calculated the additional per diem interest accurately.',
    options: [
      'Request an updated payoff statement from the servicer for the new date',
      'Add your calculated per diem to the payoff figure and close on that total',
      'Close on the original figure and let the servicer bill any shortfall afterwards',
      'Ask the seller to bring the difference to closing so the figures balance'
    ],
    correct: 0, points: 5
  },

  /* ---------- category: numeric ------------------------------------------- */
  {
    id: 'ex-num-perdiem', category: 'numeric', type: 'numeric',
    prompt: 'A payoff statement is good through August 10 with a per diem of $47.13. Closing has moved to August 25. How much additional interest accrues over those 15 days? Enter the amount in dollars.',
    answer: '706.95', tolerance: 0.01, placeholder: 'e.g. 706.95',
    explain: '15 days at $47.13 per day is $706.95.',
    points: 5
  },
  {
    id: 'ex-num-proration', category: 'numeric', type: 'numeric',
    prompt: 'Annual property tax is $8,420.00, prorated on a 365-day year. Closing is September 14, and the seller is responsible through the day before closing (256 days). What is the seller\'s share? Enter the amount in dollars.',
    answer: '5905.54', tolerance: 0.75, placeholder: 'e.g. 5905.54',
    explain: '$8,420 / 365 = $23.0685 per day, times 256 days = $5,905.54.',
    points: 5
  },
  {
    id: 'ex-num-invoice', category: 'numeric', type: 'numeric',
    prompt: 'An inspection invoice lists a standard home inspection at $325.00 and a termite/WDI report at $50.00. What total should appear on the order for this vendor? Enter the amount in dollars.',
    answer: '375.00', tolerance: 0.01, placeholder: 'e.g. 375.00',
    explain: 'Both line items belong to the same vendor charge: $375.00.',
    points: 5
  },

  /* ---------- category: written (compose) --------------------------------- */
  {
    id: 'ex-cmp-delay', category: 'written', type: 'compose', orderId: 'ORD-2026-EXAM',
    label: 'Reply to the selling agent',
    instruction: 'The selling agent has asked for an update on the title commitment. You have no new information from the settlement agency yet, and no confirmed timeline to give.',
    placeholder: 'Write your reply to Renee Castillo...',
    thread: [
      { sender: 'Renee Castillo', recipient: 'You (VA)', date: '2026-08-11', body: 'Checking in on the title commitment for my buyer. Any word on timing? They keep asking me.' }
    ],
    rubric: [
      { check: 'identifiesFile', label: 'Names the file (address or order number)', why: 'A reply with no file reference makes the reader go looking.' },
      { check: 'acknowledgesRequest', label: 'Acknowledges what was asked', why: 'They asked a direct question.' },
      { check: 'givesTimeframe', label: 'Commits to a specific follow-up time', why: '"As soon as I know" cannot be planned around.' },
      { check: 'statesNextStep', label: 'Says what you are doing about it', why: 'Name the action in flight.' },
      { check: 'noBlame', label: 'Does not blame another party by name', why: 'Assigning fault in writing creates a record you cannot control.' },
      { check: 'noNPI', label: 'No account numbers or personal identifiers', why: 'These do not belong in routine correspondence.' }
    ],
    points: 10
  },
  {
    id: 'ex-cmp-escalate', category: 'written', type: 'compose', orderId: 'ORD-2026-EXAM',
    label: 'Escalate a vesting discrepancy',
    instruction: 'The source deed vests the seller differently from how the order records it. Write the escalation to the settlement agent.',
    placeholder: 'Write your escalation...',
    thread: [],
    rubric: [
      { check: 'identifiesFile', label: 'Names the file', why: 'The recipient works many files.' },
      { check: 'statesNextStep', label: 'States what you have and have not done', why: 'They need to know whether anything was changed.' },
      { check: 'noCommitmentBeyondAuthority', label: 'Does not resolve the vesting yourself', why: 'Vesting is a legal determination, not a data fix.' },
      { check: 'noNPI', label: 'No personal identifiers', why: 'Not needed to describe the discrepancy.' }
    ],
    points: 10
  },
  {
    id: 'ex-cmp-wire', category: 'written', type: 'compose', orderId: 'ORD-2026-EXAM',
    label: 'Escalate a suspicious wire request',
    instruction: 'You have identified an email changing wire instructions as a likely fraud attempt. Write the escalation to your supervisor. Do not reply to the original thread.',
    placeholder: 'Write your escalation...',
    thread: [
      { sender: 'ladminton@bestclosinq.com', recipient: 'You (VA)', date: '2026-08-21', body: 'URGENT - our account has been frozen, funds must go to the new receiving account below. Do not call the office, I am in closings all day.' }
    ],
    rubric: [
      { check: 'identifiesFile', label: 'Names the file at risk', why: 'Your supervisor needs to know which closing is exposed.' },
      { check: 'statesNextStep', label: 'Says what you have done and are doing', why: 'Whether you replied changes how urgent this is.' },
      { check: 'verifyOutOfBand', label: 'Proposes phone verification using a number from the file', why: 'Only an out-of-band channel breaks the attack.' },
      { check: 'noNPI', label: 'Does not repeat the fraudulent account numbers', why: 'Re-transmitting them spreads them further.' }
    ],
    points: 10
  }
];
