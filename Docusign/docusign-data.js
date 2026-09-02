/* DocuSign VA Training Simulator — Data Models & Scenarios.
   100% frontend static mock data. No real backend, no real DocuSign API/account. */

/* The simulator's "today". Every date in the dataset is positioned relative to this anchor
   so envelope ages and expirations stay internally coherent. */
const DS_TODAY = '2026-08-12';

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
      { id: 'r3', role: 'Agent', name: 'Michael Brown', email: 'michael.brown@agency.example.com', status: 'received', action: 'Receives a Copy', order: 3 }
    ],
    /* Field geometry note, read before editing.
       These carry docIndex and the page the slot actually lives on, and deliberately
       carry NO x/y: the viewer anchors them to the document's own `.sigrow`/`.ibox`
       elements at paint time (dsFieldAnchor), which keeps a tag on its line even if
       the document is re-laid out. They used to all say `page: 1` with no docIndex,
       so all four stacked on one spot of page 1 while the real execution block on
       page 6 stayed blank, and the Seller Disclosure carried no fields at all.
       doc 0 = Purchase_Agreement_123_Main.pdf  (6pp, execution on p6, initials p1-p5)
       doc 1 = Seller_Property_Disclosure.pdf   (3pp, execution on p3, initials p1-p2) */
    fields: [
      { id: 'f1', type: 'Signature',   recipientId: 'r1', docIndex: 0, page: 6, label: 'Buyer Signature',  required: true, value: 'Signed by John Smith' },
      { id: 'f2', type: 'Date Signed', recipientId: 'r1', docIndex: 0, page: 6, label: 'Date',             required: true, value: '08/11/2026' },
      { id: 'f3', type: 'Signature',   recipientId: 'r2', docIndex: 0, page: 6, label: 'Seller Signature', required: true, value: null },
      { id: 'f4', type: 'Date Signed', recipientId: 'r2', docIndex: 0, page: 6, label: 'Date',             required: true, value: null },
      { id: 'f1i1', type: 'Initial', recipientId: 'r1', docIndex: 0, page: 1, label: 'Buyer Initials',  required: true, value: 'JS' },
      { id: 'f1i2', type: 'Initial', recipientId: 'r1', docIndex: 0, page: 2, label: 'Buyer Initials',  required: true, value: 'JS' },
      { id: 'f1i3', type: 'Initial', recipientId: 'r1', docIndex: 0, page: 3, label: 'Buyer Initials',  required: true, value: 'JS' },
      { id: 'f1i4', type: 'Initial', recipientId: 'r1', docIndex: 0, page: 4, label: 'Buyer Initials',  required: true, value: 'JS' },
      { id: 'f1i5', type: 'Initial', recipientId: 'r1', docIndex: 0, page: 5, label: 'Buyer Initials',  required: true, value: 'JS' },
      { id: 'f2i1', type: 'Initial', recipientId: 'r2', docIndex: 0, page: 1, label: 'Seller Initials', required: true, value: null },
      { id: 'f2i2', type: 'Initial', recipientId: 'r2', docIndex: 0, page: 2, label: 'Seller Initials', required: true, value: null },
      { id: 'f2i3', type: 'Initial', recipientId: 'r2', docIndex: 0, page: 3, label: 'Seller Initials', required: true, value: null },
      { id: 'f2i4', type: 'Initial', recipientId: 'r2', docIndex: 0, page: 4, label: 'Seller Initials', required: true, value: null },
      { id: 'f2i5', type: 'Initial', recipientId: 'r2', docIndex: 0, page: 5, label: 'Seller Initials', required: true, value: null },
      { id: 'f5',  type: 'Signature',   recipientId: 'r2', docIndex: 1, page: 3, label: 'Seller Signature', required: true, value: null },
      { id: 'f6',  type: 'Date Signed', recipientId: 'r2', docIndex: 1, page: 3, label: 'Date',             required: true, value: null },
      { id: 'f7',  type: 'Signature',   recipientId: 'r1', docIndex: 1, page: 3, label: 'Buyer Signature',  required: true, value: 'Signed by John Smith' },
      { id: 'f8',  type: 'Date Signed', recipientId: 'r1', docIndex: 1, page: 3, label: 'Date',             required: true, value: '08/11/2026' },
      { id: 'f2j1', type: 'Initial', recipientId: 'r2', docIndex: 1, page: 1, label: 'Seller Initials', required: true, value: null },
      { id: 'f2j2', type: 'Initial', recipientId: 'r2', docIndex: 1, page: 2, label: 'Seller Initials', required: true, value: null },
      { id: 'f1j1', type: 'Initial', recipientId: 'r1', docIndex: 1, page: 1, label: 'Buyer Initials',  required: true, value: 'JS' },
      { id: 'f1j2', type: 'Initial', recipientId: 'r1', docIndex: 1, page: 2, label: 'Buyer Initials',  required: true, value: 'JS' }
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
    /* doc 0 = Independent_Contractor_Agreement.pdf (4pp, execution on p4, initials p1-p3).
       Renumbered off f5/f6 because ENV-2026-9041 now uses those ids on its second
       document, and two envelopes sharing a field id makes lookup by id ambiguous.
       Nothing references these by id. */
    fields: [
      { id: 'f9',  type: 'Signature',   recipientId: 'r4', docIndex: 0, page: 4, label: 'Contractor Signature', required: true, value: null },
      { id: 'f10', type: 'Date Signed', recipientId: 'r4', docIndex: 0, page: 4, label: 'Date Signed',          required: true, value: null },
      { id: 'f4i1', type: 'Initial', recipientId: 'r4', docIndex: 0, page: 1, label: 'Contractor Initials', required: true, value: null },
      { id: 'f4i2', type: 'Initial', recipientId: 'r4', docIndex: 0, page: 2, label: 'Contractor Initials', required: true, value: null },
      { id: 'f4i3', type: 'Initial', recipientId: 'r4', docIndex: 0, page: 3, label: 'Contractor Initials', required: true, value: null }
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
      { id: 'r5', role: 'Partner', name: 'Elena Rostova', email: 'elena.rostova@example.com', status: 'completed', action: 'Needs to Sign', order: 1 }
    ],
    fields: [
      { id: 'f11', type: 'Signature', recipientId: 'r5', docIndex: 0, page: 2, label: 'Signature', required: true, value: 'Signed by Elena Rostova' }
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
      { id: 'f12', type: 'Signature', recipientId: 'r7', docIndex: 0, page: 3, label: 'Buyer Signature', required: true, value: null }
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
      /* Lesson 1 step 2 referenced this id before it existed, which meant the step could
         never be satisfied and Lesson 1 never completed — locking the whole curriculum
         behind it. Marked by dsOpenEnvelope(), i.e. by actually opening a file, not by
         rendering the list. */
      { id: 'ds_env_open', title: 'Open an Envelope', hint: 'Click a row in the envelope list to open its detail view' },
      { id: 'ds_c5_2', title: 'Send Manual Reminder', hint: 'Click "Resend / Reminder" on an awaiting envelope' },
      { id: 'ds_c5_3', title: 'Correct Envelope', hint: 'Edit a recipient email or document on an in-flight envelope' },
      { id: 'ds_c5_4', title: 'Void In-flight Envelope', hint: 'Void an envelope with a mandatory explanation reason' },
      { id: 'ds_mail_open', title: 'Open VA Mailbox', hint: 'Click VA Mailbox in the sidebar to review incoming communications' },
      { id: 'ds_cert_open', title: 'Open Certificate of Completion', hint: 'View the legal audit trail and cryptographic timestamps' },
      { id: 'ds_action_open', title: 'Review Action Required Queue', hint: 'Inspect envelopes requiring immediate follow-up' }
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
    situation: 'Ten minutes after sending the listing agreement to seller Robert Vance, the listing agent informs you that the list price terms were updated and the sent document is invalid. Robert has not opened or signed the document yet. What should you do immediately?',
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
  },
  {
    id: 'ds_scen_6',
    title: 'Scenario 6: Signature Field Assigned to Wrong Recipient',
    situation: 'While auditing the fields on a purchase agreement in the envelope wizard, you notice that the "Buyer Signature" field on Page 6 is assigned to Sarah Johnson (the Seller) instead of John Smith (the Buyer). The envelope has not been sent yet. What should you do?',
    options: [
      'Send the envelope anyway — the signer will know which line is theirs.',
      'Click the field, change the assigned recipient from Sarah Johnson to John Smith, and verify all other fields before proceeding.',
      'Delete all fields and re-create the envelope from scratch.',
      'Add a text note on the document asking Sarah to skip that field.'
    ],
    correct: 1,
    explanation: 'Fields can be reassigned in the wizard before sending. Click the mis-assigned field, change its recipient to the correct signer, and audit the remaining fields. There is no need to recreate the envelope.'
  },
  {
    id: 'ds_scen_7',
    title: 'Scenario 7: Template Selection for a Standard Listing',
    situation: 'Your supervising agent asks you to send out a standard Exclusive Listing Agreement for a new property. The office has a pre-built DocuSign template called "Exclusive Listing — Standard" that includes all required documents, recipient roles, and field placements. What is the most efficient approach?',
    options: [
      'Ignore the template and build the envelope manually to ensure accuracy.',
      'Go to Templates, click "Use" on the Exclusive Listing template, verify pre-filled details, update property-specific information, and send.',
      'Download the template PDF, edit it in Word, upload it as a new envelope, and place all fields manually.',
      'Ask the supervising agent to send it themselves since templates are admin-only features.'
    ],
    correct: 1,
    explanation: 'Templates exist to eliminate repetitive setup. Using a pre-built template pre-populates documents, roles, and fields — you only update transaction-specific details like the property address and party names. This reduces errors and saves time.'
  },
  {
    id: 'ds_scen_8',
    title: 'Scenario 8: Voided Envelope — What the Signer Sees',
    situation: 'You just voided an envelope because the purchase price was wrong. The seller calls 10 minutes later saying "I just tried to sign and the link says the document has been voided." How should you respond?',
    options: [
      'Tell the seller to try a different browser because the void may not have propagated yet.',
      'Explain that the previous document was canceled due to an updated term, apologize for the inconvenience, and confirm that a corrected envelope is being sent shortly.',
      'Ask the seller to sign anyway — the void only applies on your side.',
      'Tell the seller to ignore the message and wait 24 hours for the system to reset.'
    ],
    correct: 1,
    explanation: 'When an envelope is voided, all signing links are immediately revoked. The professional response is to explain the reason clearly, reassure the client, and confirm that a replacement is on its way. Never ask a client to work around a voided document.'
  },
  {
    id: 'ds_scen_9',
    title: 'Scenario 9: CC Recipient Asks "Why Can\'t I Sign?"',
    situation: 'The closing attorney, Michael Brown, calls to say he received the completed purchase agreement but there is no "Sign" button — only a "View" button. He is set as Order 3, Receives a Copy. What do you tell him?',
    options: [
      'His account must be broken — void the envelope and recreate it with him as a signer.',
      'Explain that his role is set to "Receives a Copy" (CC), which means he automatically receives the final executed document but is not required to sign. If he needs to sign, the envelope must be corrected to change his action.',
      'Ask him to click "View" repeatedly until the "Sign" button appears.',
      'Send him a separate envelope with just his signature page.'
    ],
    correct: 1,
    explanation: 'A CC recipient receives the completed document automatically but cannot sign. This is by design for parties who need the record but are not signers. If the role needs to change, the envelope must be corrected before completion.'
  },
  {
    id: 'ds_scen_10',
    title: 'Scenario 10: Recipient Declined — Next Steps',
    situation: 'Tenant Elena Rostova declined the Commercial Lease (ENV-2026-9005) with the reason: "commencement date does not match the agreed letter of intent." The landlord, Yara Haddad, already signed. What is the correct next step?',
    options: [
      'Correct the envelope to change Elena\'s email address and resend.',
      'Void the envelope, because "Correct" cannot fix document content — only recipient details. Escalate to the supervising agent with Elena\'s stated reason so the commencement date can be updated in the document before re-sending.',
      'Send Elena a reminder — she probably clicked "Decline" by mistake.',
      'Archive the envelope and wait for Elena to change her mind.'
    ],
    correct: 1,
    explanation: 'A decline with a stated reason is a substantive objection, not a delivery issue. The "Correct" feature can fix email addresses and recipient details, but cannot change document content. The envelope must be voided, the document updated with the correct terms, and a new envelope sent. The decline reason must be relayed to the supervising agent.'
  },
  {
    id: 'ds_scen_11',
    title: 'Scenario 11: Envelope About to Expire',
    situation: 'Envelope ENV-2026-9008 (Listing Agreement — 504 Westwood Blvd) expires in 3 days. The seller, Sarah Johnson, received the envelope but has not opened it. What should you do?',
    options: [
      'Void the envelope immediately to prevent expiration.',
      'Send a polite reminder to Sarah Johnson via DocuSign and notify the supervising agent that the envelope is approaching expiration with no signer activity.',
      'Extend the expiration by editing the envelope settings from the Sent view.',
      'Create a new envelope with a longer expiration window and send it alongside the current one.'
    ],
    correct: 1,
    explanation: 'The first step is a reminder to the signer. If the signer does not respond, escalate to the supervising agent before the deadline. Do not void a valid envelope preemptively, and do not create duplicates that would confuse the signer.'
  },
  {
    id: 'ds_scen_12',
    title: 'Scenario 12: Access Code Authentication Failure',
    situation: 'Envelope ENV-2026-9014 shows "Authentication Failed" because borrower Tomás Delgado failed the access code challenge three times. Signing access is now blocked. What should you do?',
    options: [
      'Send the access code directly to Tomás via email so he can try again.',
      'Escalate to the supervising agent: the recipient\'s signing access is locked after 3 failed attempts. The envelope must be corrected to reset authentication or issue a new access code, and the code must be delivered through a separate secure channel (phone call, not email).',
      'Void the envelope and recreate it without an access code.',
      'Ask Tomás to create a new DocuSign account and resend to that address.'
    ],
    correct: 1,
    explanation: 'After 3 failed access code attempts, the recipient is locked out. The envelope must be corrected to reset the challenge. The access code must NEVER be sent via email — it defeats the purpose of the authentication layer. Deliver it by phone or other secure channel. Removing the access code entirely lowers the security posture and should not be done without authorization.'
  },
  {
    id: 'ds_scen_13',
    title: 'Scenario 13: Parallel vs. Sequential — Rush Closing',
    situation: 'A rush closing requires Buyer, Seller, and Agent to all sign by end of day. The supervising agent says "get everyone signing at the same time — no waiting." How should the envelope be configured?',
    options: [
      'Sequential order: Buyer Order 1, Seller Order 2, Agent Order 3 — each waits for the prior signer.',
      'Parallel order: All three recipients set to Order 1, Needs to Sign — everyone receives the notification simultaneously.',
      'Send three separate envelopes, one per signer, so there is no dependency.',
      'Sequential order but send reminders every 5 minutes to speed up the chain.'
    ],
    correct: 1,
    explanation: 'Parallel routing (all Order 1) sends every recipient their signing notification immediately. This is the correct approach when there is no contractual reason to enforce a signing sequence and speed is the priority. Separate envelopes create version-control risk.'
  },
  {
    id: 'ds_scen_14',
    title: 'Scenario 14: Required vs. Optional Fields',
    situation: 'While placing fields on a contractor agreement, you add a "Company Name" text field for the contractor. The contractor is a sole proprietor and may not have a company name. How should you configure this field?',
    options: [
      'Mark it as Required — every field should be required to ensure completeness.',
      'Mark it as Optional — a sole proprietor may not have a company name, and a required empty field would block signing.',
      'Delete the field entirely since not all contractors have companies.',
      'Pre-fill the field with "N/A" so the contractor does not have to think about it.'
    ],
    correct: 1,
    explanation: 'Optional fields allow the signer to skip information that does not apply to them. Making it required would block a sole proprietor from completing the signing process. Pre-filling "N/A" removes the signer\'s agency and may not be accurate. The field should exist but not block completion.'
  }
];

/* ============================================================================
   TRIAGE ITEMS (Lesson 5, Lesson 6, Lesson 10 & Exam)
   Used by the 'triage' step mechanic.
   Actions: 'none', 'resend', 'correct', 'void', 'report-phishing', 'escalate'
   ============================================================================ */
const DS_TRIAGE_ITEMS = [
  {
    id: 'tri-env-9041',
    title: 'Envelope ENV-2026-9041: Sarah Johnson Pending',
    type: 'envelope',
    envId: 'ENV-2026-9041',
    situation: 'Buyer John Smith signed yesterday. Seller Sarah Johnson received her notification 20 hours ago and has not opened it. Closing is in 20 days.',
    rightAction: 'resend',
    explain: 'Sarah is the active blocker in the sequential order. Sending a polite reminder re-notifies her inbox without creating duplicate files.'
  },
  {
    id: 'tri-env-8812',
    title: 'Envelope ENV-2026-8812: Contractor Agreement Bounce',
    type: 'envelope',
    envId: 'ENV-2026-8812',
    situation: 'Delivery status shows "Delivery Failed" due to typo: "david.m.freelance@gmial.com".',
    rightAction: 'correct',
    explain: 'Do not void or recreate. Use the in-flight "Correct" feature to fix the email domain to @gmail.com and resend.'
  },
  {
    id: 'tri-env-7734',
    title: 'Envelope ENV-2026-7734: Mutual NDA Completed',
    type: 'envelope',
    envId: 'ENV-2026-7734',
    situation: 'All parties signed 11 days ago. Status is Completed. Certificate of Completion is attached.',
    rightAction: 'none',
    explain: 'No action needed. The envelope is successfully completed and archived. Acting on completed good files creates unnecessary noise.'
  },
  {
    id: 'tri-env-6620',
    title: 'Envelope ENV-2026-6620: Outdated Price Sent 10 min ago',
    type: 'envelope',
    envId: 'ENV-2026-6620',
    situation: 'Supervising agent calls: sent contract contains outdated $450k price instead of $485k. Recipient has not opened it.',
    rightAction: 'void',
    explain: 'Void immediately with a clear reason ("Superseded by updated price") to revoke the signing link before it is signed.'
  },
  {
    id: 'tri-mail-phish1',
    title: 'Notification: "Final Notice: Wire Transfer & Closing Doc"',
    type: 'email',
    doc: 'documents/email-phishing-1.html',
    docTitle: 'Email Inspection: Urgent Wire Notice',
    situation: 'Incoming email from "DocuSign Security Team" <service@docus1gn-securesign.net> threatening termination in 1 hour.',
    rightAction: 'report-phishing',
    explain: 'Phishing attack. The domain contains look-alike spelling (docus1gn with 1), artificial countdown urgency, and demands email credentials.'
  },
  {
    id: 'tri-mail-phish2',
    title: 'Notification: "Settlement Statement & Escrow Approval"',
    type: 'email',
    doc: 'documents/email-phishing-2.html',
    docTitle: 'Email Inspection: Escrow Approval',
    situation: 'Email claims to be from title officer Lucas Adminton, but the underlying button destination leads to raw IP 185.220.101.5.',
    rightAction: 'report-phishing',
    explain: 'Hyperlink spoofing. The button URL leads to an external IP address, not a legitimate docusign.net domain. Report phishing and do not click.'
  },
  {
    id: 'tri-mail-real',
    title: 'Notification: "Please DocuSign: Purchase Agreement — 123 Main"',
    type: 'email',
    doc: 'documents/email-notification-real.html',
    docTitle: 'Email Inspection: Purchase Agreement',
    situation: 'Official notification from dse@docusign.net with valid Envelope ID ENV-2026-9041 and secure na3.docusign.net destination.',
    rightAction: 'none',
    explain: 'Legitimate DocuSign email notification. Verified sender domain, valid envelope ID, and correct destination URL.'
  },
  {
    id: 'tri-env-9005',
    title: 'Envelope ENV-2026-9005: Commercial Lease Declined',
    type: 'envelope',
    envId: 'ENV-2026-9005',
    situation: 'Tenant Elena Rostova declined the commercial lease citing "commencement date does not match the agreed letter of intent." Landlord Yara Haddad already signed.',
    rightAction: 'escalate',
    explain: 'A decline with a stated content objection is not a delivery problem you can fix with Correct or Resend. The document content must be revised by the supervising agent. Escalate with the decline reason.'
  },
  {
    id: 'tri-env-9008',
    title: 'Envelope ENV-2026-9008: Listing Agreement Expiring in 3 Days',
    type: 'envelope',
    envId: 'ENV-2026-9008',
    situation: 'Listing Agreement for 504 Westwood Blvd expires in 3 days. Seller Sarah Johnson was delivered the envelope but has not opened it.',
    rightAction: 'resend',
    explain: 'The signer received the envelope but has not acted. Send a reminder to re-trigger the notification. Do not void a valid envelope preemptively — the deadline has not passed.'
  },
  {
    id: 'tri-env-9014',
    title: 'Envelope ENV-2026-9014: Access Code Authentication Failed',
    type: 'envelope',
    envId: 'ENV-2026-9014',
    situation: 'Borrower Tomás Delgado failed the access code challenge 3 times. Signing access is locked. The envelope contains a loan package with closing disclosure.',
    rightAction: 'escalate',
    explain: 'After 3 failed access code attempts, the recipient is locked out. This cannot be fixed by resend or correct alone — the authentication must be reset and the code re-delivered through a secure channel (phone, not email). Escalate to the supervising agent.'
  },
  {
    id: 'tri-env-9001',
    title: 'Envelope ENV-2026-9001: Inbound Signing Request',
    type: 'envelope',
    envId: 'ENV-2026-9001',
    situation: 'Dana Whitfield sent a purchase agreement for 4820 Cedar Ridge Dr. You (Alex Rivera) are Order 2, Needs to Sign. Order 1 (Robert Chen) has signed. The envelope is in your Inbox.',
    rightAction: 'none',
    explain: 'This is a legitimate inbound signing request that arrived in your Inbox after the prior signer completed. No corrective action is needed — the envelope is operating correctly and waiting for your signature.'
  }
];

/* ============================================================================
   VERIFY ITEMS (Lesson 7 & Exam)
   Used by the 'verify' step mechanic.
   ============================================================================ */
const DS_VERIFY_ITEMS = [
  {
    id: 'ver-cert-9041',
    title: 'Verify Certificate of Completion — ENV-2026-9041',
    doc: 'documents/certificate-9041.html',
    docTitle: 'Certificate of Completion — ENV-2026-9041',
    /* This certificate used to declare the envelope Completed and Sarah Johnson
       signed, while the envelope list, the notifications and Lesson 10 all said she
       had not — the trainee was graded on a document the product contradicted. The
       document now reports the envelope's real state, and the question asks the thing
       a VA is actually asked on the phone: is it signed yet, and is the routing right? */
    systemValue: 'John Smith signed 8/10/2026 2:28:40 PM. Sarah Johnson was sent the envelope 2:28:41 PM, viewed it 8/11/2026 9:05:12 AM, signature not yet recorded.',
    question: 'A client asks whether the purchase agreement is fully executed. Read the certificate and decide what it actually shows.',
    options: [
      { id: 'a', text: 'Not executed: the Buyer signed and the routing is correct — Sarah was only notified after John finished — but the Seller has viewed it and not signed, so no tamper seal has been applied.' },
      { id: 'b', text: 'Fully executed: both parties signed and the certificate is sealed.' },
      { id: 'c', text: 'Invalid: Sarah was notified at 2:28:41 PM, before John signed at 2:28:40 PM, so the sequential routing failed.' },
      { id: 'd', text: 'Invalid: Michael Brown never signed, so the envelope can never complete.' }
    ],
    rightOptionId: 'a',
    explain: 'A certificate can be pulled at any point; it is only sealed when the last required signature lands. Here 1 of 2 signatures is collected, the Sent time for Order 2 (2:28:41 PM) correctly follows the Order 1 signature (2:28:40 PM) so sequential routing worked, and Michael Brown is a CC who is never expected to sign. The honest answer to the client is "the buyer has signed, the seller has opened it and not signed yet".'
  },
  {
    id: 'ver-cert-anomaly',
    /* ENV-2026-7799 is deliberately not in this account: it is a counterparty's
       certificate, sent over for review. Auditing a document from outside your own
       DocuSign account is a real transaction-coordinator task, and saying so is what
       stops the id reading as a dangling reference. */
    title: 'Verify Counterparty Certificate — ENV-2026-7799 (Anomaly Check)',
    doc: 'documents/certificate-anomaly.html',
    docTitle: 'Certificate of Completion — ENV-2026-7799',
    systemValue: 'Kenneth Sterling: Signed 8/11/2026 10:14:22 AM; Viewed / Delivered 8/11/2026 11:45:10 AM.',
    question: 'Audit the timestamp sequence on this certificate. What issue exists?',
    options: [
      { id: 'a', text: 'No issue: All timestamps and hashes are valid.' },
      { id: 'b', text: 'Chronological anomaly: The First Viewed/Delivered timestamp is recorded AFTER the signature timestamp.' },
      { id: 'c', text: 'Missing IP address for the signer.' },
      { id: 'd', text: 'Wrong signer email address.' }
    ],
    rightOptionId: 'b',
    explain: 'A signature cannot occur before the recipient views the document. An event timestamp recorded after signing indicates tampering or a corrupt audit record.'
  },
  {
    /* Lesson 9 referenced this id before it was authored, so its only step could never be
       satisfied. The document it reads against (loan-package-npi.html) already existed. */
    id: 'ver-loan-npi',
    /* Was titled with ENV-2026-9155, an envelope that exists nowhere — and it should
       not: this package is still IN the sending wizard, which is the whole point of
       putting the exercise before the send. The recipients named here now match the
       borrower printed on the document (they used to name two people who appear
       nowhere in the account), and the question points at Section 2, which is where
       the SSN actually is. It previously said "page 3" of a one-page document. */
    title: 'Review the loan package before sending',
    doc: 'documents/loan-package-npi.html',
    docTitle: 'Loan Application Package',
    systemValue: 'Draft envelope, not yet sent. Recipients: Marcus Vance Sterling — Borrower (Needs to Sign), Leilani Kealoha — Listing Agent (Receives a Copy). The whole package goes to both.',
    question: 'Open the package and read Section 2. The agent is set to receive a copy of the whole document. What should you do before this goes out?',
    options: [
      { id: 'a', text: 'Send it as configured — the agent is a party to the transaction, so they are entitled to the full file.' },
      { id: 'b', text: 'Raise it before sending: Section 2 carries an unmasked SSN and bank account number, which the CC recipient has no need to see. The package needs the sensitive section removed or the CC scoped before it is sent.' },
      { id: 'c', text: 'Send it, then follow up asking the agent to delete the document once they have received it.' },
      { id: 'd', text: 'Add an access code for the agent so only they can open the document, and send it unchanged.' }
    ],
    rightOptionId: 'b',
    explain: 'Section 2 exposes a Social Security number and a full account number to a recipient whose role does not require them. Entitlement to the transaction is not entitlement to every field in it — the standard is need to know. Sending and asking for deletion afterwards does not undo the disclosure, and an access code only controls WHO opens the document, not WHAT is inside it once opened. The exposure has to be fixed before it is sent, and that decision is not yours to make alone: raise it.'
  },
  {
    id: 'ver-cert-9002',
    title: 'Verify Certificate of Completion — ENV-2026-9002 (Access Code)',
    doc: 'documents/certificate-9002-auth.html',
    docTitle: 'Certificate of Completion — ENV-2026-9002',
    systemValue: 'Grace Liu: Access Code verified, Signed 8/06/2026 3:15:22 PM. Leilani Kealoha: ID Verification passed, Signed 8/06/2026 4:02:10 PM. Envelope completed 8/06/2026 4:02:11 PM.',
    question: 'Both signers completed execution. Review the authentication methods used. Is this certificate properly secured?',
    options: [
      { id: 'a', text: 'Properly secured: both signers passed their respective authentication challenges (Access Code and ID Verification) before signing.' },
      { id: 'b', text: 'Not secure: Access Code authentication is weaker than ID Verification, so Grace Liu\'s signature should be rejected.' },
      { id: 'c', text: 'Invalid: the second signer completed only 47 minutes after the first, which is too fast for a legitimate review.' },
      { id: 'd', text: 'Invalid: both signers should have used the same authentication method for consistency.' }
    ],
    rightOptionId: 'a',
    explain: 'Different authentication methods for different recipients is standard practice — the method is chosen based on the role and sensitivity. Access Code and ID Verification are both valid DocuSign authentication mechanisms. The timing between signatures is irrelevant to validity; what matters is that each signer passed their configured challenge.'
  }
];

/* ============================================================================
   COMPOSE ITEMS (Lesson 8 & Exam)
   ============================================================================ */
const DS_COMPOSE_ITEMS = [
  {
    id: 'cmp-void-notice',
    title: 'Draft Client Notice: Voided Contract & Revised Document',
    scenario: 'You voided Envelope ENV-2026-6620 because the list price was updated from $450,000 to $485,000. Write a professional, reassuring email to seller Robert Vance explaining why the old link was voided and that a revised DocuSign envelope is on its way.',
    rubric: [
      { id: 'crit_void', label: 'Explains that previous DocuSign link was voided/canceled', required: true, keywords: ['void', 'cancel', 'previous link', 'old document'] },
      { id: 'crit_reason', label: 'States the specific reason (updated price / terms)', required: true, keywords: ['price', 'updated', 'revised', 'terms', '485'] },
      { id: 'crit_next', label: 'Informs client a new envelope is being sent immediately', required: true, keywords: ['new', 'sending', 'replacement', 'fresh link', 'envelope'] },
      { id: 'crit_polite', label: 'Maintains professional, reassuring closing tone', required: false, keywords: ['apologize', 'questions', 'assistance', 'thank', 'sincerely', 'regards'] }
    ]
  },
  {
    id: 'cmp-access-code',
    title: 'Draft Access Code Delivery Instructions',
    scenario: 'Borrower Tomás Delgado needs his access code (TX-8821) to open a loan closing disclosure on DocuSign. You must call him and provide the code verbally. Draft the script you would read on the phone — it must include the code, explain what it unlocks, and instruct him NOT to share it.',
    rubric: [
      { id: 'crit_code', label: 'States the access code clearly', required: true, keywords: ['tx-8821', 'TX-8821', '8821', 'access code'] },
      { id: 'crit_purpose', label: 'Explains what the code unlocks (loan / closing / DocuSign)', required: true, keywords: ['loan', 'closing', 'docusign', 'envelope', 'document'] },
      { id: 'crit_noshare', label: 'Instructs recipient not to share the code', required: true, keywords: ['do not share', 'don\'t share', 'confidential', 'only you', 'private', 'not share'] },
      { id: 'crit_tone', label: 'Professional, clear phone manner', required: false, keywords: ['hello', 'hi', 'good morning', 'good afternoon', 'thank', 'assist', 'help'] }
    ]
  },
  {
    id: 'cmp-expiry-notice',
    title: 'Draft Envelope Expiration Warning to Client',
    scenario: 'Listing Agreement for 504 Westwood Blvd (ENV-2026-9008) expires in 3 days. Seller Sarah Johnson has not opened the envelope. Write a professional email reminding her to sign before the deadline and explaining what happens if the envelope expires.',
    rubric: [
      { id: 'crit_deadline', label: 'Mentions the approaching expiration / deadline', required: true, keywords: ['expir', 'deadline', '3 days', 'three days', 'time-sensitive', 'expires soon'] },
      { id: 'crit_action', label: 'Asks the recipient to sign / open the document', required: true, keywords: ['sign', 'open', 'review', 'complete', 'click'] },
      { id: 'crit_consequence', label: 'Explains consequence of missing the deadline (must be re-sent)', required: true, keywords: ['re-send', 'resend', 'new envelope', 'recreat', 'expire', 'no longer available', 'invalid'] },
      { id: 'crit_tone', label: 'Courteous, non-alarming tone', required: false, keywords: ['please', 'convenience', 'assistance', 'thank', 'regards', 'happy to help'] }
    ]
  }
];

/* ============================================================================
   CURRICULUM: 10 STRUCTURED LESSONS (DS_LESSONS)
   Redesigned from zero with systematic progression:
   L1-L2: Read (navigation, envelope state)
   L3-L5: Build (wizard, routing, fields)
   L6:    Act (templates + correct/void actions)
   L7:    Defend (phishing detection)
   L8:    Audit (certificates, timestamps, NPI)
   L9:    Communicate (professional writing)
   L10:   Integrate (capstone morning bandeja)
   ============================================================================ */
const DS_LESSONS = [
  {
    id: 'l01-workspace', number: 1, title: 'Workspace Navigation',
    summary: 'Learn the DocuSign layout: sidebar sections, envelope list, mailbox, and templates — everything a VA needs to locate before handling real transactions.',
    steps: [
      { type: 'do', checklistId: 'ds_c5_1', view: 'envelopes', walk: {
          target: '#sb-sent',
          text: 'The Sent section shows every envelope you have dispatched. Click "Sent" now to see the agreements your office has in flight.',
          setup: () => dsGotoAllEnvelopes(),
          pauseText: 'Good — this is your Sent queue. Every envelope you dispatch appears here with its current status.'
        } },
      { type: 'do', checklistId: 'ds_mail_open', view: 'mailbox', walk: {
          target: '#sb-mailbox',
          text: 'The VA Mailbox collects signer notifications, bounce alerts, and completion confirmations. Click "VA Mailbox" in the sidebar to review what has arrived.',
          pauseText: 'This is your Mailbox. Signer replies, delivery bounces, and completion alerts arrive here. Now click "Sent" in the sidebar to go back to your sent envelopes.'
        } },
      { type: 'do', checklistId: 'ds_c5_1', view: 'envelopes', walk: {
          target: '#sb-sent',
          text: 'Click "Sent" to go back to your sent envelopes. We need to inspect one of them.',
          pauseText: 'Good — now find the 123 Main Street Purchase Agreement in the list.'
        } },
      { type: 'do', checklistId: 'ds_env_open', view: 'envelope-detail', viewArg: 'ENV-2026-9041', walk: {
          target: 'tr[data-env-id="ENV-2026-9041"]',
          text: 'Click on ENV-2026-9041 (123 Main Street Purchase Agreement) to inspect its status, recipients, and history.',
          pauseText: 'This is the envelope detail view. You can see the recipients, their signing status, the document history, and available actions like Send Reminder or Void.'
        } },
      { type: 'do', checklistId: 'ds_c4_1', view: 'templates', walk: {
          target: '.ds-topnav-item[data-view="templates"]',
          text: 'Templates let you send standard agreements without rebuilding them from scratch. Click "Templates" in the top navigation.'
        } },
      { type: 'decide', scenarioId: 'ds_scen_1', walk: {
          target: null,
          text: 'You just explored the workspace. Now a real situation: the buyer on that 123 Main Street envelope says he never received his DocuSign email. What do you do?',
          setup: () => dsAskScenario('ds_scen_1')
        } }
    ]
  },
  {
    id: 'l02-envelope-state', number: 2, title: 'Reading Envelope State',
    summary: 'Understand envelope statuses (Waiting, Completed, Voided, Declined, Expired), recipient timelines, and what each status means for your next action.',
    steps: [
      { type: 'do', checklistId: 'ds_env_open', view: 'envelope-detail', viewArg: 'ENV-2026-9041', walk: {
          target: 'tr[data-env-id="ENV-2026-9041"]',
          text: 'Open ENV-2026-9041. Notice the status "Waiting" — John Smith signed, Sarah Johnson has not.',
          setup: () => dsGotoAllEnvelopes()
        } },
      { type: 'do', checklistId: 'ds_c5_2', view: 'envelope-detail', viewArg: 'ENV-2026-9041', walk: {
          target: '#dsBtnSendReminder',
          text: 'Sarah is the active blocker. Click "Send Reminder" to prompt her.',
          setup: () => dsGoto('envelope-detail', 'ENV-2026-9041')
        } },
      { type: 'do', checklistId: 'ds_env_open', view: 'envelope-detail', viewArg: 'ENV-2026-8812', walk: {
          target: 'tr[data-env-id="ENV-2026-8812"]',
          text: 'Now open ENV-2026-8812. Notice "Delivery Failed" — the email address has a typo.',
          setup: () => dsGotoAllEnvelopes()
        } },
      { type: 'decide', scenarioId: 'ds_scen_4', walk: {
          target: null,
          text: 'Sarah (Order 2) says she never got an email. Why, and what do you do?',
          setup: () => dsAskScenario('ds_scen_4')
        } },
      { type: 'decide', scenarioId: 'ds_scen_9', walk: {
          target: null,
          text: 'The closing attorney (CC) asks why he cannot sign. What do you tell him?',
          setup: () => dsAskScenario('ds_scen_9')
        } }
    ]
  },
  {
    id: 'l03-send-envelope', number: 3, title: 'Prepare & Send an Envelope',
    summary: 'Walk through the complete wizard: upload documents, set the subject, add recipients, and send.',
    steps: [
      { type: 'do', checklistId: 'ds_c1_1', view: 'new-envelope', walk: {
          target: '.ds-new-btn',
          text: 'Click the yellow "Start Now" button to open the Send an Envelope wizard.',
          setup: () => dsGotoAllEnvelopes()
        } },
      { type: 'do', checklistId: 'ds_c1_2', view: 'new-envelope', walk: {
          target: '#dsBtnSampleDocs',
          text: 'Click "Sample documents" to attach the practice Purchase Agreement.',
          setup: () => { dsResetWizard(); dsGoto('new-envelope'); }
        } },
      { type: 'do', checklistId: 'ds_c1_3', view: 'new-envelope', walk: {
          target: '#dsBtnNextRecipients',
          text: 'Verify the email subject and click "Next: Add Recipients".',
          setup: () => {
            if (dsState.view !== 'new-envelope' || dsState.wizardStep !== 1) {
              dsResetWizard();
              dsState.wizardData.documents.push({ name: 'Purchase_Agreement_123_Main.pdf', pages: 6 });
              dsGoto('new-envelope');
            }
          }
        } },
      { type: 'do', checklistId: 'ds_c2_1', view: 'new-envelope', walk: {
          target: '#dsBtnNextFields',
          text: 'Review recipients. Buyer has "Needs to Sign". Click "Next: Place Fields".',
          setup: () => {
            dsState.wizardStep = 2;
            dsGoto('new-envelope');
          }
        } },
      { type: 'do', checklistId: 'ds_c1_4', view: 'new-envelope', walk: {
          target: '#dsBtnSendFinal',
          text: 'Final review. Click "Send Envelope" to launch the agreement.',
          setup: () => {
            if (!dsState.wizardData) dsResetWizard();
            if (!dsState.wizardData.documents || !dsState.wizardData.documents.length) {
              dsState.wizardData.documents = [{ name: 'Purchase_Agreement_123_Main.pdf', pages: 6 }];
            }
            if (!dsState.wizardData.subject) {
              dsState.wizardData.subject = 'Purchase Agreement — 123 Main Street';
            }
            dsState.wizardStep = 4;
            dsGoto('new-envelope');
          }
        } },
      { type: 'decide', scenarioId: 'ds_scen_7', walk: {
          target: null,
          text: 'Your agent asks you to send a standard listing. Should you build from scratch or use a template?',
          setup: () => dsAskScenario('ds_scen_7')
        } }
    ]
  },
  {
    id: 'l04-signing-order', number: 4, title: 'Signing Order & Recipient Routing',
    summary: 'Master sequential, parallel, and hybrid routing for multi-party transactions.',
    steps: [
      { type: 'do', checklistId: 'ds_c2_2', view: 'new-envelope', walk: {
          target: '#chkSeq',
          text: 'Check "Set Signing Order" to enforce sequential execution (Order 1 before Order 2).',
          setup: () => {
            dsResetWizard();
            dsState.wizardData.documents = [{ name: 'Purchase_Agreement_123_Main.pdf', pages: 6 }];
            dsSeedLessonEnvelope();
            dsState.wizardStep = 2;
            dsState.wizardData.useSequentialOrder = false;
            dsGoto('new-envelope');
          }
        } },
      { type: 'do', checklistId: 'ds_c2_3', view: 'new-envelope', walk: {
          target: '#chkSeq',
          text: 'Now uncheck "Set Signing Order" to see parallel routing in action.',
          setup: () => {
            if (!dsState.wizardData || !dsState.wizardData.documents.length) {
              dsResetWizard();
              dsState.wizardData.documents = [{ name: 'Purchase_Agreement_123_Main.pdf', pages: 6 }];
              dsSeedLessonEnvelope();
            }
            dsState.wizardStep = 2;
            dsState.wizardData.useSequentialOrder = true;
            dsGoto('new-envelope');
          }
        } },
      { type: 'decide', scenarioId: 'ds_scen_5', walk: {
          target: null,
          text: 'Configure a 3-party deal: Buyer (Order 1), Seller (Order 2), Agent (CC).',
          setup: () => dsAskScenario('ds_scen_5')
        } },
      { type: 'decide', scenarioId: 'ds_scen_13', walk: {
          target: null,
          text: 'A rush closing needs everyone signing at the same time. Sequential or parallel?',
          setup: () => dsAskScenario('ds_scen_13')
        } },
      { type: 'decide', scenarioId: 'ds_scen_11', walk: {
          target: null,
          text: 'An envelope is about to expire and the signer has not opened it. What do you do?',
          setup: () => dsAskScenario('ds_scen_11')
        } }
    ]
  },
  {
    id: 'l05-fields-audit', number: 5, title: 'Field Placement & Assignment Audit',
    summary: 'Place signature fields, audit assignments, and understand required vs. optional fields.',
    steps: [
      { type: 'do', checklistId: 'ds_c3_1', view: 'new-envelope', walk: {
          target: '#dsBtnAddField',
          text: 'In Step 3, click "Signature" in the palette to place a signature field for John Smith.',
          setup: () => {
            dsResetWizard();
            dsState.wizardData.documents = [{ name: 'Purchase_Agreement_123_Main.pdf', pages: 6 }];
            dsState.wizardData.subject = 'Purchase Agreement — 123 Main Street';
            dsSeedLessonEnvelope();
            dsState.wizardStep = 3;
            dsGoto('new-envelope');
          }
        } },
      { type: 'do', checklistId: 'ds_c3_2', view: 'new-envelope', walk: {
          target: '#dsBtnAuditFields',
          text: 'Click "Audit Assignments" to verify every field is assigned to the correct recipient.',
          setup: () => {
            if (!dsState.wizardData || !dsState.wizardData.documents.length) {
              dsResetWizard();
              dsState.wizardData.documents = [{ name: 'Purchase_Agreement_123_Main.pdf', pages: 6 }];
              dsSeedLessonEnvelope();
            }
            dsState.wizardStep = 3;
            dsGoto('new-envelope');
          }
        } },
      { type: 'decide', scenarioId: 'ds_scen_6', walk: {
          target: null,
          text: 'The Buyer Signature field is assigned to the Seller. What do you do before sending?',
          setup: () => dsAskScenario('ds_scen_6')
        } },
      { type: 'decide', scenarioId: 'ds_scen_14', walk: {
          target: null,
          text: 'A "Company Name" field for a sole proprietor — required or optional?',
          setup: () => dsAskScenario('ds_scen_14')
        } },
      { type: 'decide', scenarioId: 'ds_scen_2', walk: {
          target: null,
          text: 'An email typo caused a bounce on an in-flight envelope. What is the correct procedure?',
          setup: () => dsAskScenario('ds_scen_2')
        } }
    ]
  },
  {
    id: 'l06-templates-actions', number: 6, title: 'Templates & Envelope Actions',
    summary: 'Use templates to send envelopes efficiently, then practice Correct and Void on live envelopes.',
    steps: [
      { type: 'do', checklistId: 'ds_c4_1', view: 'templates', walk: {
          target: '#sb-templates',
          text: 'Open Templates to browse the pre-built agreement templates.',
          setup: () => dsGotoAllEnvelopes()
        } },
      { type: 'do', checklistId: 'ds_c4_2', view: 'new-envelope', walk: {
          target: '.ds-tpl-use-btn',
          text: 'Click "Use" on any template to see how it pre-populates documents, roles, and fields.',
          setup: () => dsGoto('templates')
        } },
      { type: 'do', checklistId: 'ds_c5_3', view: 'envelope-detail', viewArg: 'ENV-2026-8812', walk: {
          target: '#dsBtnCorrectEnv',
          text: 'ENV-2026-8812 bounced due to a typo. Click "Correct Envelope" to fix the email address.',
          setup: () => dsGoto('envelope-detail', 'ENV-2026-8812')
        } },
      { type: 'decide', scenarioId: 'ds_scen_3', walk: {
          target: null,
          text: 'Outdated price on a sent contract — void or correct?',
          setup: () => dsAskScenario('ds_scen_3')
        } },
      { type: 'decide', scenarioId: 'ds_scen_8', walk: {
          target: null,
          text: 'You voided an envelope. The seller calls confused. How do you handle this?',
          setup: () => dsAskScenario('ds_scen_8')
        } },
      { type: 'decide', scenarioId: 'ds_scen_10', walk: {
          target: null,
          text: 'A tenant declined a lease citing wrong terms. Correct, void, or escalate?',
          setup: () => dsAskScenario('ds_scen_10')
        } }
    ]
  },
  {
    id: 'l07-phishing', number: 7, title: 'Email Security & Phishing Detection',
    summary: 'Identify deceptive look-alike domains, credential harvesters, and malicious signing links. Distinguish phishing from legitimate DocuSign notifications.',
    steps: [
      { type: 'do', checklistId: 'ds_mail_open', view: 'mailbox', walk: {
          target: '#sb-mailbox',
          text: 'Open the VA Mailbox to review incoming email notifications.',
          setup: () => dsGotoAllEnvelopes()
        } },
      { type: 'triage', triageId: 'tri-mail-phish1', label: 'Urgent wire transfer email', walk: {
          target: null,
          text: 'Inspect this urgent wire transfer email. Check the sender domain and the link destination.',
          setup: () => dsAskTriage('tri-mail-phish1')
        } },
      { type: 'triage', triageId: 'tri-mail-phish2', label: 'Escrow approval notice', walk: {
          target: null,
          text: 'This escrow notice looks right at first glance. Read where the button actually points.',
          setup: () => dsAskTriage('tri-mail-phish2')
        } },
      { type: 'triage', triageId: 'tri-mail-real', label: 'Standard signing request', walk: {
          target: null,
          text: 'Not every notification is an attack. Treating a real one as phishing has its own cost.',
          setup: () => dsAskTriage('tri-mail-real')
        } },
      { type: 'decide', scenarioId: 'ds_scen_12', walk: {
          target: null,
          text: 'A borrower failed the access code challenge 3 times. What should you do?',
          setup: () => dsAskScenario('ds_scen_12')
        } }
    ]
  },
  {
    id: 'l08-certificates', number: 8, title: 'Certificates, Audit Trails & NPI',
    summary: 'Read DocuSign Certificates of Completion, spot timestamp anomalies, verify authentication methods, and catch sensitive data exposure before sending.',
    steps: [
      { type: 'verify', reviewId: 'ver-cert-9041', walk: {
          target: null,
          text: 'Open the certificate for ENV-2026-9041. Is the purchase agreement fully executed? What does the certificate actually prove?',
          setup: () => dsAskVerify('ver-cert-9041')
        } },
      { type: 'verify', reviewId: 'ver-cert-anomaly', walk: {
          target: null,
          text: 'A counterparty sent this certificate. Audit the timestamp sequence — what is wrong?',
          setup: () => dsAskVerify('ver-cert-anomaly')
        } },
      { type: 'verify', reviewId: 'ver-cert-9002', walk: {
          target: null,
          text: 'Both signers passed authentication (Access Code and ID Verification). Is this certificate properly secured?',
          setup: () => dsAskVerify('ver-cert-9002')
        } },
      { type: 'verify', reviewId: 'ver-loan-npi', walk: {
          target: null,
          text: 'A loan package is ready to send. The listing agent is CC\'d on the full document. Read Section 2 — what should you do before this goes out?',
          setup: () => dsAskVerify('ver-loan-npi')
        } },
      { type: 'decide', scenarioId: 'ds_scen_12', walk: {
          target: null,
          text: 'A borrower\'s access code authentication failed 3 times. What is the correct next step?',
          setup: () => dsAskScenario('ds_scen_12')
        } }
    ]
  },
  {
    id: 'l09-communication', number: 9, title: 'Professional Communication',
    summary: 'Handle real-world envelope situations (declined deals, expiring agreements, access code delivery) and draft professional client notifications graded by rubric.',
    steps: [
      { type: 'triage', triageId: 'tri-env-9005', label: 'Declined lease — Elena Rostova', walk: {
          target: null,
          text: 'A tenant declined with a content objection. What is the right triage action?',
          setup: () => dsAskTriage('tri-env-9005')
        } },
      { type: 'triage', triageId: 'tri-env-9008', label: 'Listing agreement expiring soon', walk: {
          target: null,
          text: 'This envelope expires in 3 days and the signer has not opened it. What do you do?',
          setup: () => dsAskTriage('tri-env-9008')
        } },
      { type: 'compose', composeId: 'cmp-void-notice', walk: {
          target: null,
          text: 'Draft a professional email to the seller explaining why their previous envelope was voided and that a replacement is coming.',
          setup: () => dsAskCompose('cmp-void-notice')
        } },
      { type: 'compose', composeId: 'cmp-access-code', walk: {
          target: null,
          text: 'Draft the phone script you would read to deliver an access code to a borrower. Include the code, explain what it unlocks, and instruct them not to share it.',
          setup: () => dsAskCompose('cmp-access-code')
        } },
      { type: 'compose', composeId: 'cmp-expiry-notice', walk: {
          target: null,
          text: 'Draft an email warning a seller that her listing agreement is about to expire.',
          setup: () => dsAskCompose('cmp-expiry-notice')
        } }
    ]
  },
  {
    id: 'l10-capstone', number: 10, title: 'Capstone: The Morning Bandeja',
    summary: 'Your Monday morning queue: 8 items, zero hints. Triage every envelope and notification with the judgment you built across Lessons 1–9.',
    steps: [
      { type: 'triage', triageId: 'tri-env-9041', label: 'ENV-9041 Sarah pending', walk: {
          target: null,
          text: 'Item 1 of 8: Sarah Johnson has not signed the purchase agreement.',
          setup: () => { dsGoto('envelope-detail', 'ENV-2026-9041'); dsAskTriage('tri-env-9041'); }
        } },
      { type: 'triage', triageId: 'tri-env-8812', label: 'ENV-8812 email bounced', walk: {
          target: null,
          text: 'Item 2 of 8: David Miller\'s contractor agreement bounced.',
          setup: () => { dsGoto('envelope-detail', 'ENV-2026-8812'); dsAskTriage('tri-env-8812'); }
        } },
      { type: 'triage', triageId: 'tri-env-7734', label: 'ENV-7734 completed NDA', walk: {
          target: null,
          text: 'Item 3 of 8: Mutual NDA shows Completed.',
          setup: () => { dsGoto('envelope-detail', 'ENV-2026-7734'); dsAskTriage('tri-env-7734'); }
        } },
      { type: 'triage', triageId: 'tri-env-6620', label: 'ENV-6620 outdated price', walk: {
          target: null,
          text: 'Item 4 of 8: Contract with wrong price, not yet signed.',
          setup: () => { dsGoto('envelope-detail', 'ENV-2026-6620'); dsAskTriage('tri-env-6620'); }
        } },
      { type: 'triage', triageId: 'tri-mail-phish1', label: 'Wire phishing email', walk: {
          target: null,
          text: 'Item 5 of 8: Urgent wire transfer notification.',
          setup: () => dsAskTriage('tri-mail-phish1')
        } },
      { type: 'triage', triageId: 'tri-mail-phish2', label: 'Escrow IP spoofed link', walk: {
          target: null,
          text: 'Item 6 of 8: Escrow notice with suspicious link.',
          setup: () => dsAskTriage('tri-mail-phish2')
        } },
      { type: 'triage', triageId: 'tri-env-9005', label: 'ENV-9005 lease declined', walk: {
          target: null,
          text: 'Item 7 of 8: Commercial lease declined by tenant.',
          setup: () => dsAskTriage('tri-env-9005')
        } },
      { type: 'triage', triageId: 'tri-env-9001', label: 'ENV-9001 inbound signing', walk: {
          target: null,
          text: 'Item 8 of 8: Purchase agreement arrived in your Inbox for your signature.',
          setup: () => dsAskTriage('tri-env-9001')
        } }
    ]
  }
];

/* ============================================================================
   FINAL EXAM SPECIFICATION & BANK (DS_EXAM_BANK)
   ============================================================================ */
const DS_EXAM_PASS_PCT = 0.75;
const DS_EXAM_MINUTES = 45;

const DS_EXAM_BLUEPRINT = [
  { category: 'judgment', count: 6 },
  { category: 'triage', count: 4 },
  { category: 'verify', count: 3 },
  { category: 'compose', count: 1 }
];

const DS_EXAM_BANK = [
  {
    id: 'ex-scen-1', category: 'judgment', type: 'decide',
    label: 'Client reports missing envelope email',
    situation: 'Buyer claims they never received a DocuSign email sent yesterday. What is your first action?',
    options: [
      'Open Manage tab, locate the envelope, verify the email address, check recipient order status, and click Resend.',
      'Create and send a brand new envelope immediately.',
      'Ask the client to print and sign manually.',
      'Void the envelope immediately.'
    ],
    correct: 0, points: 5,
    explain: 'Always inspect the envelope first in Manage to verify the recipient address and stage before resending.'
  },
  {
    id: 'ex-scen-2', category: 'judgment', type: 'decide',
    label: 'Email typo in sent envelope',
    situation: 'An agreement was sent to david.m@gmial.com and bounced. What is the proper procedure?',
    options: [
      'Download the PDF and email it from your personal inbox.',
      'Use the DocuSign "Correct" feature on the active envelope to update the address to @gmail.com and resend.',
      'Void the envelope and create a new one from scratch.',
      'Wait for the email server to re-route automatically.'
    ],
    correct: 1, points: 5,
    explain: 'Use the in-flight Correct feature to fix recipient typos without recreating the entire envelope.'
  },
  {
    id: 'ex-scen-3', category: 'judgment', type: 'decide',
    label: 'Outdated terms on sent contract',
    situation: 'A contract was sent with an outdated purchase price and has not been signed. What should you do?',
    options: [
      'Archive the envelope to remove it from your active view.',
      'Send an email asking the buyer to ignore the figure.',
      'Select Void on the envelope, provide a clear explanation, and confirm void.',
      'Wait until signed, then edit the PDF later.'
    ],
    correct: 2, points: 5,
    explain: 'Voiding immediately revokes all signing links and ensures the invalid document cannot be executed.'
  },
  {
    id: 'ex-scen-4', category: 'judgment', type: 'decide',
    label: 'Sequential signing order blocker',
    situation: 'John (Order 1) signed yesterday; Sarah (Order 2) has not signed. Sarah says she has no email. Why?',
    options: [
      'Sarah was Order 2, so her notification was triggered only after John completed his signature; check her spam and resend.',
      'DocuSign failed because all signers must share order 1.',
      'The envelope expired after 24 hours.',
      'John used the wrong signature font.'
    ],
    correct: 0, points: 5,
    explain: 'Order 2 recipients only receive email notifications once Order 1 finishes signing.'
  },
  {
    id: 'ex-scen-5', category: 'judgment', type: 'decide',
    label: 'Multi-party deal configuration',
    situation: 'Configure an envelope where Buyer signs first, Seller signs second, and Agent receives an automatic copy upon completion.',
    options: [
      'Parallel order: Buyer 1, Seller 1, Agent 1.',
      'Sequential order: Buyer Order 1 (Needs to Sign), Seller Order 2 (Needs to Sign), Agent Order 3 (Receives a Copy).',
      'Sequential order: Buyer Order 1 (Needs to Sign), Seller Order 2 (Needs to Sign), Agent Order 3 (Needs to Sign).',
      'Send two separate envelopes.'
    ],
    correct: 1, points: 5,
    explain: 'Buyer = 1 (Needs to Sign), Seller = 2 (Needs to Sign), Agent = 3 (Receives a Copy).'
  },
  {
    id: 'ex-tri-1', category: 'triage', type: 'triage',
    label: 'Triage: Sarah Johnson Pending 20h',
    situation: 'ENV-2026-9041: John Smith signed; Sarah Johnson received notice 20h ago and has not opened it.',
    rightAction: 'resend', points: 5,
    explain: 'Send a polite reminder to re-trigger notification to the pending signer.'
  },
  {
    id: 'ex-tri-2', category: 'triage', type: 'triage',
    label: 'Triage: Bounced contractor email',
    situation: 'ENV-2026-8812: Contractor email has typo @gmial.com with Delivery Failed status.',
    rightAction: 'correct', points: 5,
    explain: 'Use Correct to fix the email address.'
  },
  {
    id: 'ex-tri-3', category: 'triage', type: 'triage',
    label: 'Triage: Completed mutual NDA',
    situation: 'ENV-2026-7734: Completed 11 days ago with certificate attached.',
    rightAction: 'none', points: 5,
    explain: 'No action needed on completed agreements.'
  },
  {
    id: 'ex-tri-4', category: 'triage', type: 'triage',
    label: 'Triage: Outdated price contract',
    situation: 'ENV-2026-6620: Price was updated right after sending; contract must not be signed.',
    rightAction: 'void', points: 5,
    explain: 'Void immediately to revoke signing links.'
  },
  {
    id: 'ex-ver-1', category: 'verify', type: 'verify',
    label: 'Audit Certificate: ENV-2026-9041',
    doc: 'documents/certificate-9041.html',
    docTitle: 'Certificate of Completion',
    systemValue: 'John Smith (Order 1) signed 8/10/2026 2:28:40 PM. Sarah Johnson (Order 2) was sent the envelope 2:28:41 PM and viewed it the next day at 9:05:12 AM.',
    question: 'Is the signing chronology on this certificate valid?',
    options: [
      { id: 'a', text: 'Valid: Order 1 completed before Order 2 received notification, even though Order 2 has not signed yet.' },
      { id: 'b', text: 'Invalid: Signature order violated.' }
    ],
    rightOptionId: 'a', points: 5,
    explain: 'Sequential routing is verified by the one second between John\'s signature and Sarah\'s Sent event. An envelope still waiting on a signer is not the same thing as a broken chronology.'
  },
  {
    id: 'ex-ver-2', category: 'verify', type: 'verify',
    label: 'Audit Counterparty Certificate: ENV-2026-7799 Anomaly',
    doc: 'documents/certificate-anomaly.html',
    docTitle: 'Certificate of Completion',
    systemValue: 'Signed 8/11/2026 10:14:22 AM; Viewed / Delivered 8/11/2026 11:45:10 AM.',
    question: 'What audit discrepancy is present on this document?',
    options: [
      { id: 'a', text: 'No discrepancy.' },
      { id: 'b', text: 'Chronology anomaly: Delivered timestamp is recorded after Signed timestamp.' }
    ],
    rightOptionId: 'b', points: 5,
    explain: 'Delivery timestamp cannot be recorded after signature.'
  },
  {
    id: 'ex-cmp-1', category: 'compose', type: 'compose',
    label: 'Draft Void Notice to Client',
    situation: 'Draft a short email to seller Robert Vance explaining that his previous envelope was voided due to updated pricing, and a revised DocuSign envelope is being sent.',
    rubric: [
      { id: 'r1', label: 'Mentions void/cancellation of previous link', required: true, keywords: ['void', 'cancel', 'previous'] },
      { id: 'r2', label: 'Mentions updated pricing/terms', required: true, keywords: ['price', 'terms', 'updated', 'revised', '485'] },
      { id: 'r3', label: 'Mentions new replacement envelope', required: true, keywords: ['new', 'sending', 'replacement', 'link'] }
    ],
    points: 10
  }
];
