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
      /* Lesson 1 step 2 referenced this id before it existed, which meant the step could
         never be satisfied and Lesson 1 never completed — locking the whole curriculum
         behind it. Marked by dsOpenEnvelope(), i.e. by actually opening a file, not by
         rendering the list. */
      { id: 'ds_env_open', title: 'Open an Envelope', hint: 'Click a row in the envelope list to open its detail view' },
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
    systemValue: 'John Smith signed 14:28 UTC; Sarah Johnson signed 09:12 UTC (next day).',
    question: 'Compare the certificate timestamps and signing sequence. Is the audit trail valid?',
    options: [
      { id: 'a', text: 'Valid: Order 1 (John) completed before Order 2 (Sarah) received notification; all signatures and IPs logged chronologically.' },
      { id: 'b', text: 'Invalid: Sarah signed before John completed his signature.' },
      { id: 'c', text: 'Invalid: Michael Brown signature is missing from the audit log.' },
      { id: 'd', text: 'Invalid: Envelope hash algorithm is unverified.' }
    ],
    rightOptionId: 'a',
    explain: 'The certificate confirms sequential execution: Sarah only received the document at 14:28:41 (after John signed at 14:28:40). The audit trail is fully valid and intact.'
  },
  {
    id: 'ver-cert-anomaly',
    title: 'Verify Certificate of Completion — ENV-2026-7799 (Anomaly Check)',
    doc: 'documents/certificate-anomaly.html',
    docTitle: 'Certificate of Completion — ENV-2026-7799',
    systemValue: 'Kenneth Sterling: Signed 10:14 UTC; Delivered / Viewed 11:45 UTC.',
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
    title: 'Review the loan package before sending — ENV-2026-9155',
    doc: 'documents/loan-package-npi.html',
    docTitle: 'Loan Application Package',
    systemValue: 'Recipients: Priya Natarajan (Needs to Sign), Omar Fitch — Listing Agent (Receives a Copy). All 4 pages sent to both.',
    question: 'Open the package and look at page 3. The agent is set to receive a copy of the whole document. What should you do before this goes out?',
    options: [
      { id: 'a', text: 'Send it as configured — the agent is a party to the transaction, so they are entitled to the full file.' },
      { id: 'b', text: 'Raise it before sending: page 3 carries an unmasked SSN and bank account number, which the CC recipient has no need to see. The package needs the sensitive page removed or the CC scoped before it is sent.' },
      { id: 'c', text: 'Send it, then follow up asking the agent to delete page 3 once they have received it.' },
      { id: 'd', text: 'Add an access code for the agent so only they can open the document, and send it unchanged.' }
    ],
    rightOptionId: 'b',
    explain: 'Page 3 exposes a Social Security number and a full account number to a recipient whose role does not require them. Entitlement to the transaction is not entitlement to every field in it — the standard is need to know. Sending and asking for deletion afterwards does not undo the disclosure, and an access code only controls WHO opens the document, not WHAT is inside it once opened. The exposure has to be fixed before it is sent, and that decision is not yours to make alone: raise it.'
  }
];

/* ============================================================================
   COMPOSE ITEMS (Lesson 8 & Exam)
   ============================================================================ */
const DS_COMPOSE_ITEMS = [
  {
    id: 'cmp-void-notice',
    title: 'Draft Client Notice: Voided Contract & Revised Document',
    scenario: 'You voided Envelope ENV-2026-6620 because the purchase price was updated from $450,000 to $485,000. Write a professional, reassuring email to buyer Robert Vance explaining why the old link was voided and that a revised DocuSign envelope is on its way.',
    rubric: [
      { id: 'crit_void', label: 'Explains that previous DocuSign link was voided/canceled', required: true, keywords: ['void', 'cancel', 'previous link', 'old document'] },
      { id: 'crit_reason', label: 'States the specific reason (updated price / terms)', required: true, keywords: ['price', 'updated', 'revised', 'terms', '485'] },
      { id: 'crit_next', label: 'Informs client a new envelope is being sent immediately', required: true, keywords: ['new', 'sending', 'replacement', 'fresh link', 'envelope'] },
      { id: 'crit_polite', label: 'Maintains professional, reassuring closing tone', required: false, keywords: ['apologize', 'questions', 'assistance', 'thank', 'sincerely', 'regards'] }
    ]
  }
];

/* ============================================================================
   CURRICULUM: 10 STRUCTURED LESSONS (DS_LESSONS)
   ============================================================================ */
const DS_LESSONS = [
  {
    id: 'l01-orientation', number: 1, title: 'Orientation & Reading Envelope State',
    summary: 'Navigate the DocuSign interface, read envelope statuses, and inspect who is blocking an in-flight agreement.',
    steps: [
      { type: 'do', checklistId: 'ds_c5_1', view: 'envelopes', walk: {
          target: '#sb-sent',
          text: 'Click "Sent" in the left sidebar to open your agreement list.',
          setup: () => dsGoto('dashboard')
        } },
      { type: 'do', checklistId: 'ds_env_open', view: 'envelope-detail', viewArg: 'ENV-2026-9041', walk: {
          target: 'tr[data-env-id="ENV-2026-9041"]',
          text: 'Click on Envelope ENV-2026-9041 (123 Main Street) to inspect its signing status and recipient timeline.',
          setup: () => dsGoto('envelopes')
        } },
      { type: 'do', checklistId: 'ds_c5_2', view: 'envelope-detail', viewArg: 'ENV-2026-9041', walk: {
          target: '#dsBtnSendReminder',
          text: 'Notice that John Smith has signed (Order 1), but Sarah Johnson (Order 2) is waiting. Click "Send Reminder" to prompt Sarah.',
          setup: () => dsGoto('envelope-detail', 'ENV-2026-9041')
        } },
      { type: 'decide', scenarioId: 'ds_scen_4', walk: {
          target: null,
          text: 'Now test your understanding of sequential routing: read the scenario below and pick the best action.',
          setup: () => dsGoto('scenario-detail', 'ds_scen_4')
        } },
      { type: 'decide', scenarioId: 'ds_scen_1', walk: {
          target: null,
          text: 'A buyer claims they never received their signing link. What should you do first?',
          setup: () => dsGoto('scenario-detail', 'ds_scen_1')
        } }
    ]
  },
  {
    id: 'l02-prepare-send', number: 2, title: 'Prepare & Send: Documents, Subject & Recipients',
    summary: 'Upload documents, configure clean email subjects, and add signers according to instructions.',
    steps: [
      { type: 'do', checklistId: 'ds_c1_1', view: 'new-envelope', walk: {
          target: '.ds-new-btn',
          text: 'Click the yellow "NEW ▾" button to open the Send an Envelope wizard.',
          setup: () => dsGoto('dashboard')
        } },
      { type: 'do', checklistId: 'ds_c1_2', view: 'new-envelope', walk: {
          target: '#dsAttachPurchaseAgreement',
          text: 'Click "+ Purchase Agreement (6 pages)" to attach the primary contract document.',
          setup: () => { dsResetWizard(); dsGoto('new-envelope'); }
        } },
      { type: 'do', checklistId: 'ds_c1_3', view: 'new-envelope', walk: {
          target: '#dsBtnNextRecipients',
          text: 'Verify or enter the email subject (e.g. "Purchase Agreement — 123 Main Street") and click "Next: Add Recipients →".',
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
          text: 'In Step 2, review the recipients and ensure Buyer has action "Needs to Sign". Click "Next: Place Fields →".',
          setup: () => {
            dsState.wizardStep = 2;
            dsGoto('new-envelope');
          }
        } },
      { type: 'do', checklistId: 'ds_c1_4', view: 'new-envelope', walk: {
          target: '#dsBtnSendFinal',
          text: 'Step 4 shows the final review. Click "🚀 Send Envelope" to launch the agreement.',
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
        } }
    ]
  },
  {
    id: 'l03-signing-order', number: 3, title: 'Signing Order: Sequential, Parallel & Hybrid Routing',
    summary: 'Master sequential order, parallel routing, and CC agent recipients for multi-party deals.',
    steps: [
      { type: 'do', checklistId: 'ds_c2_2', view: 'new-envelope', walk: {
          target: '#chkSeq',
          text: 'Check the "Set Signing Order" box to enforce sequential execution (Order 1 → Order 2).',
          setup: () => {
            dsResetWizard();
            dsState.wizardStep = 2;
            dsState.wizardData.useSequentialOrder = false;
            dsGoto('new-envelope');
          }
        } },
      { type: 'do', checklistId: 'ds_c2_3', view: 'new-envelope', walk: {
          target: '#chkSeq',
          text: 'Now uncheck "Set Signing Order" to see how parallel routing allows all signers to execute simultaneously.',
          setup: () => {
            if (!dsState.wizardData) dsResetWizard();
            dsState.wizardStep = 2;
            dsState.wizardData.useSequentialOrder = true;
            dsGoto('new-envelope');
          }
        } },
      { type: 'decide', scenarioId: 'ds_scen_5', walk: {
          target: null,
          text: 'Apply what you learned: configure a 3-party deal with Buyer (Order 1), Seller (Order 2), and Agent (CC).',
          setup: () => dsGoto('scenario-detail', 'ds_scen_5')
        } }
    ]
  },
  {
    id: 'l04-fields-audit', number: 4, title: 'Fields Placement & Mis-Assigned Field Audit',
    summary: 'Audit signature and date fields to ensure Buyer fields are assigned to Buyer, not Seller.',
    steps: [
      { type: 'do', checklistId: 'ds_c3_1', view: 'new-envelope', walk: {
          target: '#dsBtnAddField',
          text: 'In Step 3, explore the document canvas and field palette.',
          setup: () => {
            dsResetWizard();
            dsState.wizardStep = 3;
            dsGoto('new-envelope');
          }
        } },
      { type: 'do', checklistId: 'ds_c3_2', view: 'new-envelope', walk: {
          target: '#dsBtnAuditFields',
          text: 'Click "⚠ Audit Assignments" to verify that all field slots correspond to the correct signer.',
          setup: () => {
            dsState.wizardStep = 3;
            dsGoto('new-envelope');
          }
        } },
      { type: 'decide', scenarioId: 'ds_scen_2', walk: {
          target: null,
          text: 'What is the correct procedure when an email typo prevents field delivery?',
          setup: () => dsGoto('scenario-detail', 'ds_scen_2')
        } }
    ]
  },
  {
    id: 'l05-triage-actions', number: 5, title: 'Envelope Triage: Correct, Resend, or Void',
    summary: 'Triage active envelopes: know when to resend a reminder, correct a typo, or void an invalid deal.',
    steps: [
      { type: 'do', checklistId: 'ds_c5_3', view: 'envelope-detail', viewArg: 'ENV-2026-8812', walk: {
          target: '#dsBtnCorrectEnv',
          text: 'Envelope ENV-2026-8812 bounced. Click "✏️ Correct Envelope" to update David Miller\'s email address.',
          setup: () => dsGoto('envelope-detail', 'ENV-2026-8812')
        } },
      { type: 'do', checklistId: 'ds_c5_4', view: 'envelope-detail', viewArg: 'ENV-2026-9041', walk: {
          target: '#dsBtnVoidEnv',
          text: 'To cancel an envelope with mandatory audit trail, click "🚫 Void" and provide a clear reason.',
          setup: () => dsGoto('envelope-detail', 'ENV-2026-9041')
        } },
      { type: 'decide', scenarioId: 'ds_scen_3', walk: {
          target: null,
          text: 'Review the legal difference between voiding an envelope versus deleting it from your inbox.',
          setup: () => dsGoto('scenario-detail', 'ds_scen_3')
        } }
    ]
  },
  {
    id: 'l06-phishing-security', number: 6, title: 'Email Security & Phishing Detection',
    summary: 'Identify deceptive look-alike domains, credential harvesters, and malicious signing links.',
    steps: [
      /* These were wired as `verify` against three ids that were never authored, so all three
         steps were permanently unsatisfiable. The items they describe already existed in the
         triage bank (tri-mail-phish1 / phish2 / real), which is also the mechanic this lesson
         is supposed to teach: the trainee classifies each notification and reports the fakes,
         rather than answering a multiple choice about them. The third one is the lesson's
         "do nothing" case — a legitimate email whose right answer is `none`. */
      { type: 'triage', triageId: 'tri-mail-phish1', label: 'Urgent wire transfer notification', walk: {
          target: null,
          text: 'Inspect this urgent wire transfer email. Check the sender domain and the link destination before you decide what to do with it.',
          setup: () => SimEngine.viewDoc('documents/email-phishing-1.html', 'Security Inspection: Phishing Sample 1')
        } },
      { type: 'triage', triageId: 'tri-mail-phish2', label: 'Escrow instructions notice', walk: {
          target: null,
          text: 'Now this escrow notice. The sender looks right, so read where the button actually points.',
          setup: () => SimEngine.viewDoc('documents/email-phishing-2.html', 'Security Inspection: Phishing Sample 2')
        } },
      { type: 'triage', triageId: 'tri-mail-real', label: 'Standard signing request', walk: {
          target: null,
          text: 'Last one. Not every notification is an attack, and treating a real one as phishing has its own cost.',
          setup: () => SimEngine.viewDoc('documents/email-notification-real.html', 'Security Inspection: Legitimate Email')
        } }
    ]
  },
  {
    id: 'l07-certificate-audit', number: 7, title: 'Certificate of Completion & Audit Trails',
    summary: 'Read DocuSign Certificates of Completion, audit timestamps, and spot security anomalies.',
    steps: [
      { type: 'verify', reviewId: 'ver-cert-9041', walk: {
          target: null,
          text: 'Open the Certificate of Completion for ENV-2026-9041 and verify the timestamp sequence.',
          setup: () => SimEngine.viewDoc('documents/certificate-9041.html', 'Certificate Audit — ENV-2026-9041')
        } },
      { type: 'verify', reviewId: 'ver-cert-anomaly', walk: {
          target: null,
          text: 'Audit this second certificate: identify the timestamp anomaly where viewing occurred after signing.',
          setup: () => SimEngine.viewDoc('documents/certificate-anomaly.html', 'Certificate Audit — Anomaly Check')
        } }
    ]
  },
  {
    id: 'l08-communication-rubric', number: 8, title: 'Rejection, Expiration & Client Communication',
    summary: 'Handle expired envelopes and draft clear, professional client notifications following a scoring rubric.',
    steps: [
      { type: 'compose', composeId: 'cmp-void-notice', walk: {
          target: null,
          text: 'Draft a professional notification to the buyer explaining why their previous link was voided and that a new envelope is being sent.',
          setup: () => dsGoto('dashboard')
        } }
    ]
  },
  {
    id: 'l09-authentication-npi', number: 9, title: 'Authentication & Sensitive Data (NPI)',
    summary: 'Protect Social Security Numbers, bank account routing, and understand Access Code requirements.',
    steps: [
      { type: 'verify', reviewId: 'ver-loan-npi', walk: {
          target: null,
          text: 'Inspect the loan application document containing unmasked Social Security and Bank Account numbers.',
          setup: () => SimEngine.viewDoc('documents/loan-package-npi.html', 'NPI Document Review')
        } }
    ]
  },
  {
    id: 'l10-capstone-bandeja', number: 10, title: 'Capstone: The Morning Bandeja',
    summary: 'Final comprehensive triage challenge: manage a full queue of envelopes and notifications with zero hints.',
    steps: [
      { type: 'triage', triageId: 'tri-env-9041', label: 'ENV-9041 Pending Sarah' },
      { type: 'triage', triageId: 'tri-env-8812', label: 'ENV-8812 Email Bounced' },
      { type: 'triage', triageId: 'tri-env-7734', label: 'ENV-7734 Completed NDA' },
      { type: 'triage', triageId: 'tri-env-6620', label: 'ENV-6620 Outdated Price' },
      { type: 'triage', triageId: 'tri-mail-phish1', label: 'Security: Wire Phishing Notice' },
      { type: 'triage', triageId: 'tri-mail-phish2', label: 'Security: IP Spoofed Link' }
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
    systemValue: 'John Smith signed 14:28 UTC; Sarah Johnson signed 09:12 UTC next day.',
    question: 'Is the signing chronology on this certificate valid?',
    options: [
      { id: 'a', text: 'Valid: Order 1 completed before Order 2 received notification.' },
      { id: 'b', text: 'Invalid: Signature order violated.' }
    ],
    rightOptionId: 'a', points: 5,
    explain: 'Sequential signing timeline is completely verified.'
  },
  {
    id: 'ex-ver-2', category: 'verify', type: 'verify',
    label: 'Audit Certificate: ENV-2026-7799 Anomaly',
    doc: 'documents/certificate-anomaly.html',
    docTitle: 'Certificate of Completion',
    systemValue: 'Signed 10:14 UTC; Delivered 11:45 UTC.',
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
    situation: 'Draft a short email to buyer Robert Vance explaining that his previous envelope was voided due to updated pricing, and a revised DocuSign envelope is being sent.',
    rubric: [
      { id: 'r1', label: 'Mentions void/cancellation of previous link', required: true, keywords: ['void', 'cancel', 'previous'] },
      { id: 'r2', label: 'Mentions updated pricing/terms', required: true, keywords: ['price', 'terms', 'updated', 'revised', '485'] },
      { id: 'r3', label: 'Mentions new replacement envelope', required: true, keywords: ['new', 'sending', 'replacement', 'link'] }
    ],
    points: 10
  }
];
