/* DocuSign VA Training Simulator — Data Models & Scenarios.
   100% frontend static mock data. No real backend, no real DocuSign API/account. */

/* The simulator's "today". Every date in the dataset is positioned relative to this anchor
   so envelope ages and expirations stay internally coherent. Anything that quotes a countdown
   reads it from here rather than hardcoding a number into prose. */
const DS_TODAY = '2026-08-12';

/* Lessons: populated in Phase D. The engine reads this from SimEngine.init(), so the
   array must exist before docusign-app.js calls init(). */
const DS_LESSONS = [];

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
    deliveryStatus: 'failed',
    statusNote: 'Delivery Failed — bounce received from invalid domain gmial.com',
    createdDate: '2026-08-11',
    closingDate: '2026-08-25',
    documents: [
      { id: 'doc-3', name: 'Independent_Contractor_Agreement.pdf', pages: 4 }
    ],
    recipients: [
      { id: 'r4', role: 'Contractor', name: 'David Miller', email: 'david.m.freelance@gmial.com', status: 'waiting', deliveryStatus: 'failed', action: 'Needs to Sign', order: 1 }
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
  },
  {
    id: 'ENV-2026-5510',
    subject: 'Buyer Representation Agreement — EXPIRED',
    type: 'Real Estate',
    sender: 'Alex Rivera (VA)',
    status: 'expired',
    createdDate: '2026-07-01',
    closingDate: '2026-07-08',
    documents: [
      { id: 'doc-6', name: 'Buyer_Representation_Agreement.pdf', pages: 3 }
    ],
    recipients: [
      { id: 'r7', role: 'Buyer', name: 'Patricia Owens', email: 'p.owens@email.com', status: 'expired', action: 'Needs to Sign', order: 1 }
    ],
    fields: [
      { id: 'f8', type: 'Signature', recipientId: 'r7', page: 3, label: 'Buyer Signature', required: true, value: null }
    ]
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
    situation: 'Your supervising agent contacts you: "The buyer, John Smith, claims he never received the DocuSign email for the Purchase Agreement we sent yesterday afternoon." What is your first action as a real estate VA?',
    options: [
      'Open the Manage tab, locate Envelope ENV-2026-9041, check the recipient email address for typos, verify envelope status, and click "Resend" if correct.',
      'Immediately create a brand new envelope and send a duplicate contract so the client is not kept waiting.',
      'Advise the supervising agent to download the document and request a wet-ink signature in person.',
      'Void the envelope immediately with the reason "Client reported non-receipt" and draft a replacement.'
    ],
    correct: 0,
    explanation: 'Always inspect the in-flight envelope first. Check whether there was an email typo, if the envelope is waiting on a prior signer in a sequential order, or if it is currently in "Waiting for Others". If the address is verified, clicking "Resend" re-triggers the notification without creating confusing duplicate envelopes.'
  },
  {
    id: 'ds_scen_2',
    title: 'Scenario 2: Correcting a Typo in a Recipient Email',
    situation: 'You sent an Independent Contractor Agreement to vendor David Miller, but you notice the envelope status indicates delivery bounced because his email was entered as "david.m.freelance@gmial.com". The envelope is already in flight. What is the proper procedure?',
    options: [
      'Download the PDF, email it directly to David from your inbox, and ask him to sign and email back.',
      'Open the envelope in Manage → Select "Correct" → Update the recipient email address to "@gmail.com" → Save & Resend.',
      'Void the envelope and create a new one from scratch, since recipient details cannot be changed once an envelope is sent.',
      'Wait 24 hours to see if the mail server automatically routes the message to the correct domain.'
    ],
    correct: 1,
    explanation: 'DocuSign includes an in-flight "Correct" feature for active envelopes. You do NOT need to recreate or void the envelope. Simply open the envelope, choose Correct, update the recipient email address, and resend.'
  },
  {
    id: 'ds_scen_3',
    title: 'Scenario 3: Outdated Terms on a Sent Agreement',
    situation: 'Ten minutes after sending a purchase agreement to buyer Robert Vance, the listing agent informs you that the seller updated the purchase price terms and the sent document is invalid. Robert has not opened or signed the document yet. What should you do immediately?',
    options: [
      'Archive the envelope to remove it from your active inbox filter.',
      'Send a reminder email asking Robert to disregard the dollar figure on the document.',
      'Open the envelope in Manage → Click "Void" → Enter the reason: "Superseded by updated contract terms" → Confirm Void.',
      'Wait until Robert signs it, then attach an addendum modifying the terms in the final signed copy.'
    ],
    correct: 2,
    explanation: 'Voiding an envelope instantly revokes all signing links and renders the document unsigned and non-executable. Archiving or deleting only removes the item from your view—it does not prevent the recipient from signing. Always void an erroneous contract immediately with a clear reason.'
  },
  {
    id: 'ds_scen_4',
    title: 'Scenario 4: Managing Stalled Sequential Signatures',
    situation: 'A 2-party purchase agreement was sent with sequential signing order: Buyer John Smith (Order 1) and Seller Sarah Johnson (Order 2). John signed 24 hours ago, but Sarah has not signed and the closing deadline is approaching. Sarah calls saying she checked her inbox and found no DocuSign email. What is the likely cause and resolution?',
    options: [
      'John must have used the wrong signature type; you must void and re-send the entire agreement.',
      'Sarah was configured as Order 2, so her email notification was sent only after John completed his signature; verify her spam folder and send a reminder if needed.',
      'Sequential routing failed because DocuSign requires all signers to share order 1; convert the envelope to parallel routing.',
      'DocuSign envelopes expire automatically after 24 hours, so the envelope has already timed out.'
    ],
    correct: 1,
    explanation: 'In sequential signing order, Order 2 recipients only receive their notification once Order 1 finishes signing. Since John completed Day 1, Sarah received her email only then. Checking her spam/junk folder and sending a reminder from Manage is the standard procedure.'
  },
  {
    id: 'ds_scen_5',
    title: 'Scenario 5: Multi-Party Transaction Routing Setup',
    situation: 'You are preparing an envelope for 123 Main Street with three parties: Buyer (John Smith) who must review and sign first, Seller (Sarah Johnson) who signs only after the buyer signs, and Closing Attorney (Michael Brown) who needs an automatic copy of the completed agreement for the file. How should this envelope be configured?',
    options: [
      'Parallel order: John (Order 1, Needs to Sign), Sarah (Order 1, Needs to Sign), Michael (Order 1, Needs to Sign).',
      'Sequential order: John (Order 1, Needs to Sign), Sarah (Order 2, Needs to Sign), Michael (Order 3, Needs to Sign).',
      'Create two separate envelopes: one for John and Sarah, and another forwarded manually to Michael.',
      'Sequential order: John (Order 1, Needs to Sign), Sarah (Order 2, Needs to Sign), Michael (Order 3, Receives a Copy).'
    ],
    correct: 3,
    explanation: 'Setting John as Order 1 (Needs to Sign) and Sarah as Order 2 (Needs to Sign) enforces the required signing sequence. Setting Michael as Order 3 with the action "Receives a Copy" (CC) ensures he automatically receives the fully executed package upon completion without blocking the signing workflow.'
  }
];
