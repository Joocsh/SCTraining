/* DocuSign VA Training Simulator — Data Models & Scenarios.
   100% frontend static mock data. No real backend, no real DocuSign API/account. */

const DS_BRAND_NAVY = '#002738';
const DS_BRAND_YELLOW = '#ffc400';
const DS_BRAND_BLUE = '#0066cc';

const DS_ENVELOPES = [
  {
    id: 'ENV-2026-9041',
    subject: 'Purchase Agreement — 123 Main Street, Austin TX',
    type: 'Real Estate Purchase',
    sender: 'Alex Rivera (VA)',
    status: 'waiting', // waiting, completed, draft, voided, expired
    createdDate: '2026-08-10',
    closingDate: '2026-08-30',
    documents: [
      { id: 'doc-1', name: 'Purchase_Agreement_123_Main.pdf', pages: 6 },
      { id: 'doc-2', name: 'Seller_Property_Disclosure.pdf', pages: 3 }
    ],
    recipients: [
      { id: 'r1', role: 'Buyer', name: 'John Smith', email: 'john.smith@example.com', status: 'completed', action: 'Needs to Sign', order: 1 },
      { id: 'r2', role: 'Seller', name: 'Sarah Johnson', email: 'sarah.j@example.com', status: 'waiting', action: 'Needs to Sign', order: 2 },
      { id: 'r3', role: 'Agent', name: 'Michael Brown', email: 'michael.brown@agency.com', status: 'received', action: 'Receives a Copy', order: 3 }
    ],
    fields: [
      { id: 'f1', type: 'Signature', recipientId: 'r1', page: 1, label: 'Buyer Signature', required: true, value: 'Signed by John Smith' },
      { id: 'f2', type: 'Date Signed', recipientId: 'r1', page: 1, label: 'Date', required: true, value: '08/11/2026' },
      { id: 'f3', type: 'Signature', recipientId: 'r2', page: 1, label: 'Seller Signature', required: true, value: null },
      { id: 'f4', type: 'Date Signed', recipientId: 'r2', page: 1, label: 'Date', required: true, value: null }
    ]
  },
  {
    id: 'ENV-2026-8812',
    subject: 'Independent Contractor Agreement — Freelance VA',
    type: 'HR / Onboarding',
    sender: 'Alex Rivera (VA)',
    status: 'waiting',
    createdDate: '2026-08-11',
    closingDate: '2026-08-25',
    documents: [
      { id: 'doc-3', name: 'Independent_Contractor_Agreement.pdf', pages: 4 }
    ],
    recipients: [
      { id: 'r4', role: 'Contractor', name: 'David Miller', email: 'david.m.freelance@gmial.com', status: 'waiting', action: 'Needs to Sign', order: 1 }
    ],
    fields: [
      { id: 'f5', type: 'Signature', recipientId: 'r4', page: 4, label: 'Contractor Signature', required: true, value: null },
      { id: 'f6', type: 'Date Signed', recipientId: 'r4', page: 4, label: 'Date Signed', required: true, value: null }
    ]
  },
  {
    id: 'ENV-2026-7734',
    subject: 'Standard NDA — Mutual Confidentiality',
    type: 'Legal',
    sender: 'Alex Rivera (VA)',
    status: 'completed',
    createdDate: '2026-08-01',
    closingDate: '2026-08-02',
    documents: [
      { id: 'doc-4', name: 'Mutual_NDA_Standard_2026.pdf', pages: 2 }
    ],
    recipients: [
      { id: 'r5', role: 'Partner', name: 'Elena Rostova', email: 'elena@techpartner.io', status: 'completed', action: 'Needs to Sign', order: 1 }
    ],
    fields: [
      { id: 'f7', type: 'Signature', recipientId: 'r5', page: 2, label: 'Signature', required: true, value: 'Signed by Elena Rostova' }
    ]
  },
  {
    id: 'ENV-2026-6620',
    subject: 'Outdated Listing Agreement — CANCELLED',
    type: 'Real Estate',
    sender: 'Alex Rivera (VA)',
    status: 'voided',
    createdDate: '2026-07-28',
    closingDate: '2026-07-29',
    documents: [
      { id: 'doc-5', name: 'Listing_Agreement_Draft.pdf', pages: 5 }
    ],
    recipients: [
      { id: 'r6', role: 'Seller', name: 'Robert Vance', email: 'robert@vance.com', status: 'voided', action: 'Needs to Sign', order: 1 }
    ],
    fields: []
  }
];

const DS_TEMPLATES = [
  {
    id: 'TMPL-01',
    name: 'Independent Contractor Agreement',
    category: 'HR & Onboarding',
    description: 'Standard company contractor agreement with signature, date, and text fields pre-configured.',
    documentsCount: 1,
    recipients: ['Contractor (Signer)', 'Manager (CC)']
  },
  {
    id: 'TMPL-02',
    name: 'Mutual Non-Disclosure Agreement (NDA)',
    category: 'Legal',
    description: 'Standard 2-page confidentiality agreement ready to populate recipient details.',
    documentsCount: 1,
    recipients: ['Recipient (Signer)']
  },
  {
    id: 'TMPL-03',
    name: 'Residential Purchase Agreement Package',
    category: 'Real Estate',
    description: 'Full purchase agreement + property disclosure with sequential signing order pre-set.',
    documentsCount: 2,
    recipients: ['Buyer 1 (Signer 1)', 'Seller 1 (Signer 2)', 'Agent (CC)']
  }
];

const DS_CHECKLISTS = {
  prepare_send: {
    label: 'Module 1: Prepare & Send Envelopes',
    items: [
      { id: 'ds_c1_1', title: 'Open New Envelope Wizard', hint: 'Click "+ New Envelope" or "Send a Document" from the dashboard' },
      { id: 'ds_c1_2', title: 'Upload Document', hint: 'Attach a practice PDF document to the envelope' },
      { id: 'ds_c1_3', title: 'Add Recipient Name & Email', hint: 'Fill out recipient name and valid email address' },
      { id: 'ds_c1_4', title: 'Review & Send Envelope', hint: 'Inspect subject line and click Send' }
    ]
  },
  recipients_order: {
    label: 'Module 2: Recipients & Signing Order',
    items: [
      { id: 'ds_c2_1', title: 'Set Recipient Action (Needs to Sign vs CC)', hint: 'Choose "Needs to Sign" for signers and "Receives a Copy" for CC' },
      { id: 'ds_c2_2', title: 'Enable Signing Order', hint: 'Check "Set signing order" checkbox to order recipients sequentially' },
      { id: 'ds_c2_3', title: 'Configure Parallel Signing', hint: 'Assign the same order number (e.g. 1 and 1) for parallel signers' }
    ]
  },
  fields_rules: {
    label: 'Module 3: Fields & Assignment Rules',
    items: [
      { id: 'ds_c3_1', title: 'Place Signature & Date Fields', hint: 'Drag or click Signature and Date Signed onto the document canvas' },
      { id: 'ds_c3_2', title: 'Toggle Required vs Optional Fields', hint: 'Select a field and toggle the "Required Field" checkbox in properties' },
      { id: 'ds_c3_3', title: 'Audit Field Assignments', hint: 'Ensure Buyer signature is assigned to Buyer, not Seller' }
    ]
  },
  templates: {
    label: 'Module 4: Working with Templates',
    items: [
      { id: 'ds_c4_1', title: 'Browse Template Library', hint: 'Navigate to Templates tab' },
      { id: 'ds_c4_2', title: 'Use Template for New Envelope', hint: 'Click "Use Template" to auto-populate documents and fields' }
    ]
  },
  manage_envelopes: {
    label: 'Module 5: Envelope Management & Follow-up',
    items: [
      { id: 'ds_c5_1', title: 'Check Envelope Status', hint: 'View envelope progress in Manage tab' },
      { id: 'ds_c5_2', title: 'Send Manual Reminder', hint: 'Click "Resend / Reminder" on an awaiting envelope' },
      { id: 'ds_c5_3', title: 'Correct Envelope', hint: 'Edit a recipient email or document on an in-flight envelope' },
      { id: 'ds_c5_4', title: 'Void In-flight Envelope', hint: 'Void an envelope with a mandatory explanation reason' }
    ]
  }
};

const DS_SCENARIOS = [
  {
    id: 'ds_scen_1',
    title: 'Scenario 1: "The client says they never received the email"',
    situation: 'Your client emails you saying: "John Smith claims he never received the DocuSign email for the Purchase Agreement sent yesterday." What is your FIRST step as a Virtual Assistant?',
    options: [
      'Immediately create a brand new envelope and send it again to John Smith.',
      'Open the Manage tab, inspect Envelope ENV-2026-9041, check the recipient status and email address, and click "Resend".',
      'Tell the manager that DocuSign is down and ask John to print and sign manually.',
      'Void the envelope immediately and delete all documents from the system.'
    ],
    correct: 1,
    explanation: 'Always inspect the in-progress envelope first! Check whether the email address has a typo or if it is sitting in "Waiting for Others". If the email is correct, clicking "Resend" re-triggers the notification without creating duplicate envelopes.'
  },
  {
    id: 'ds_scen_2',
    title: 'Scenario 2: Typo in Recipient Email (gmial.com)',
    situation: 'You sent an Independent Contractor Agreement to David Miller, but you just noticed the envelope status says "Delivery Failed" because the email address was entered as "david.m.freelance@gmial.com". The envelope is already sent. What should you do?',
    options: [
      'Create a brand new envelope from scratch and send it to the correct email.',
      'Open the envelope in Manage → Select "Correct" → Update the email address to "@gmail.com" → Save & Resend.',
      'Delete the envelope from the archives and ignore the error.',
      'Email David from your personal Gmail with a PDF attachment.'
    ],
    correct: 1,
    explanation: 'DocuSign includes an in-flight "Correct" feature! You do NOT need to recreate the envelope. Simply select Correct on the envelope, fix the email typo, and click Save/Send.'
  },
  {
    id: 'ds_scen_3',
    title: 'Scenario 3: Outdated Contract Must NOT Be Signed',
    situation: 'Your manager calls you: "The contract we sent to Robert Vance 2 hours ago has the wrong purchase price! We must stop him from signing it immediately." What action should you perform?',
    options: [
      'Click "Delete" to archive the envelope in your dashboard.',
      'Select the envelope in Manage → Click "Void" → Enter the reason: "Superceded by updated contract price" → Confirm Void.',
      'Wait for Robert to sign it and then change the price in PDF editor later.',
      'Change your password in DocuSign.'
    ],
    correct: 1,
    explanation: 'Voiding an envelope instantly revokes all signing links and prevents any recipient from completing signature. Deleting or archiving only hides the record from your view; it does NOT stop the recipient from signing. Always Void an invalid envelope!'
  },
  {
    id: 'ds_scen_4',
    title: 'Scenario 4: Follow-up on Missing Signatures',
    situation: 'You sent a Purchase Agreement 2 days ago. John Smith signed on Day 1, but Sarah Johnson has not signed yet and the closing date is approaching. What is the recommended VA workflow?',
    options: [
      'Void the envelope and re-send to Sarah only.',
      'Check envelope status → Verify Sarah is listed as "Waiting" → Click "Send Reminder" → Notify the manager/agent of the status.',
      'Call Sarah and ask for her credit card number.',
      'Do nothing; DocuSign will automatically sign for her after 48 hours.'
    ],
    correct: 1,
    explanation: 'Check status to confirm who is blocking completion. Sending a manual reminder re-notifies the pending recipient gently. If urgent, escalate to the agent with clear status details.'
  },
  {
    id: 'ds_scen_5',
    title: 'Scenario 5 (Final Exam): Complete Real Estate Transaction Workflow',
    situation: 'You are handling a new transaction for 123 Main Street. Requirements: Buyer (John) must sign FIRST, Seller (Sarah) must sign SECOND, Agent (Michael) receives a CC copy upon completion. You have uploaded the Purchase Agreement. How do you configure the recipients & signing order?',
    options: [
      'Set John = 1 (Signer), Sarah = 1 (Signer), Michael = 1 (Signer).',
      'Enable "Set signing order" → John = Order 1 (Needs to Sign), Sarah = Order 2 (Needs to Sign), Michael = Order 3 (Receives a Copy).',
      'Send 3 separate emails with 3 separate PDFs to each person.',
      'Set Michael = Order 1 (Needs to Sign), John = Order 2 (CC), Sarah = Order 3 (CC).'
    ],
    correct: 1,
    explanation: 'Sequential signing order (Order 1 -> Order 2 -> Order 3) guarantees John signs first before Sarah receives the notification. Setting Michael as "Receives a Copy" (CC) ensures the agent automatically receives the final executed copy once all signatures are complete!'
  }
];
