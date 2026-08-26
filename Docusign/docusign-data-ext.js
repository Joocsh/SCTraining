/* ============================================================================
   DOCUSIGN DATA EXTENSION — Capability Gap & Real-World VA Scenarios (Phase F)
   Non-destructive add-on module. Immutable docusign-data.js remains frozen.
   ============================================================================ */

const DS_EXAM_BANK_EXT = [
  {
    id: 'ex-scen-ext-1', category: 'judgment', type: 'decide',
    label: 'Wire Fraud Prevention & Email Vigilance',
    situation: 'You receive an urgent email from "wire-update@title-fontaine-escrow.net" stating that escrow bank accounts changed and buyer must wire $48,500 to a new clearing bank immediately. What is the mandatory VA protocol?',
    options: [
      'Forward the email to the buyer immediately so closing is not delayed.',
      'Check technical headers for SPF/DKIM failure, flag as phishing, and verbally verify wire instructions with the title company over a known, verified telephone number before taking any action.',
      'Reply to the email asking for confirmation of the routing number.',
      'Create a DocuSign envelope with the new bank routing info to make it official.'
    ],
    correct: 1, points: 5,
    explain: 'Title and escrow companies never change wiring instructions via unverified email. Always inspect sender domain, verify SPF/DKIM, and call a verified phone number.'
  },
  {
    id: 'ex-scen-ext-2', category: 'judgment', type: 'decide',
    label: 'Signer Access Code Lockout Resolution',
    situation: 'A buyer failed their Access Code challenge 3 consecutive times, locking envelope ENV-2026-9014. How should the Virtual Assistant unlock access for the buyer?',
    options: [
      'Tell the buyer to clear their browser cache and try the same code again.',
      'Open the envelope in DocuSign, select "Correct Envelope", update or verify the Access Code under Recipient Advanced Options, and resend the invitation.',
      'Void the envelope and wait 48 hours for the security lockout timer to expire.',
      'Email the DocuSign root certificate to the buyer.'
    ],
    correct: 1, points: 5,
    explain: 'Using the "Correct" feature resets the recipient authentication status and allows setting a fresh Access Code without recreating the transaction.'
  },
  {
    id: 'ex-scen-ext-3', category: 'judgment', type: 'decide',
    label: 'Bulk Send vs PowerForm Selection',
    situation: 'Your brokerage needs 45 independent property owners to sign an identical HOA wildfire disclosure simultaneously from a pre-existing CSV contact list. What is the most efficient DocuSign feature to use?',
    options: [
      'Create 45 separate envelopes by hand one by one.',
      'Create a PowerForm and post it on a public billboard.',
      'Use Bulk Send with a standardized Template and import the recipient CSV list to generate individualized private envelopes in one batch.',
      'Put all 45 emails as parallel recipients on a single envelope.'
    ],
    correct: 2, points: 5,
    explain: 'Bulk Send takes a template and recipient CSV to automatically dispatch individualized, private envelopes to large recipient lists.'
  },
  {
    id: 'ex-scen-ext-4', category: 'judgment', type: 'decide',
    label: 'Template Role Matching',
    situation: 'When launching a transaction from a template with predefined roles ("Buyer", "Seller", "Listing Agent"), what occurs during the Role Matching step?',
    options: [
      'DocuSign deletes all predefined signature fields and requires manual field placement.',
      'You assign specific names and emails to each placeholder role, and DocuSign automatically maps all pre-placed signature and date fields to those recipients.',
      'All signers are automatically converted to "Receives a Copy" recipients.',
      'The template is permanently locked from future use.'
    ],
    correct: 1, points: 5,
    explain: 'Role matching binds real names/emails to abstract placeholder roles while preserving all signature field assignments on the underlying documents.'
  },
  {
    id: 'ex-scen-ext-5', category: 'judgment', type: 'decide',
    label: 'Signer Declines to Sign Handling',
    situation: 'A tenant clicks "Decline to Sign" on a commercial lease with reason: "Commencement date does not match agreed LOI." What happens to the envelope status?',
    options: [
      'The envelope remains active and other signers can continue signing.',
      'The envelope is automatically voided for all parties, signing links are revoked, and the decline reason is logged in the audit trail.',
      'DocuSign automatically edits the document text to fix the error.',
      'The envelope moves to "Draft" status.'
    ],
    correct: 1, points: 5,
    explain: 'When any required signer declines, the envelope is voided immediately for all parties and the decline reason is preserved in the audit log.'
  },
  {
    id: 'ex-scen-ext-6', category: 'judgment', type: 'decide',
    label: 'Automated Reminders & Expiration Policy',
    situation: 'You are setting up a time-sensitive purchase offer that expires in 3 days. Where should you configure auto-reminders and envelope expiration?',
    options: [
      'In Step 4 (Review & Send) under Advanced Options > Reminders and Expiration.',
      'By sending manual Outlook calendar reminders every 2 hours.',
      'In Windows Control Panel regional settings.',
      'In the Certificate of Completion viewer.'
    ],
    correct: 0, points: 5,
    explain: 'Step 4 of the Send Wizard provides built-in Reminders & Expiration controls to automate reminder frequency and hard expiration deadlines.'
  },
  {
    id: 'ex-tri-ext-1', category: 'triage', type: 'triage',
    label: 'Triage: Access Code Lockout on ENV-2026-9014',
    situation: 'ENV-2026-9014: Signer David Kowalski exceeded 3 access code attempts; status is Authentication Failed.',
    rightAction: 'correct', points: 5,
    explain: 'Use Correct to reset access code or authentication settings.'
  },
  {
    id: 'ex-tri-ext-2', category: 'triage', type: 'triage',
    label: 'Triage: Phishing simulation email received',
    situation: 'Suspicious email claiming account suspension from docus1gn-securesign.com with failed SPF/DKIM.',
    rightAction: 'void', points: 5,
    explain: 'Flag and report phishing immediately without clicking any internal links.'
  },
  {
    id: 'ex-tri-ext-3', category: 'triage', type: 'triage',
    label: 'Triage: Expiring purchase contract (2 days left)',
    situation: 'ENV-2026-9008: Listing agreement expiring in 48 hours; Sarah Johnson has not opened the envelope.',
    rightAction: 'resend', points: 5,
    explain: 'Send an immediate reminder to prompt the pending signer before the expiration window closes.'
  },
  {
    id: 'ex-tri-ext-4', category: 'triage', type: 'triage',
    label: 'Triage: Voided contract with decline notice',
    situation: 'ENV-2026-9005: Elena Rostova declined to sign due to incorrect commencement date; envelope is voided.',
    rightAction: 'none', points: 5,
    explain: 'No further action on the voided envelope itself; prepare a revised envelope if instructed.'
  },
  {
    id: 'ex-ver-ext-1', category: 'verify', type: 'verify',
    label: 'Audit Certificate: Access Code Verification',
    doc: 'documents/certificate-9041.html',
    docTitle: 'Certificate of Completion (Security Audit)',
    systemValue: 'Security Level: Access Code (Verified) for Buyer John Smith.',
    question: 'Does this Certificate of Completion confirm enhanced two-factor authentication was enforced for the signer?',
    options: [
      { id: 'a', text: 'Yes: Security level explicitly confirms Access Code was validated prior to document access.' },
      { id: 'b', text: 'No: Only basic email verification was recorded.' }
    ],
    rightOptionId: 'a', points: 5,
    explain: 'The audit certificate records "Access Code (Verified)" under Security Level for recipients protected by access codes.'
  },
  {
    id: 'ex-ver-ext-2', category: 'verify', type: 'verify',
    label: 'Audit Certificate: IDV Government ID Tag',
    doc: 'documents/certificate-9041.html',
    docTitle: 'Certificate of Completion (IDV Audit)',
    systemValue: 'Security Level: DocuSign ID Verification (Pass).',
    question: 'What level of signer authentication is verified by this certificate record?',
    options: [
      { id: 'a', text: 'Standard email link with no secondary verification.' },
      { id: 'b', text: 'DocuSign IDV: Signer submitted valid government-issued photo ID verified by biometric analysis.' }
    ],
    rightOptionId: 'b', points: 5,
    explain: 'DocuSign ID Verification validates government photo IDs before granting access to signature fields.'
  },
  {
    id: 'ex-cmp-ext-1', category: 'compose', type: 'compose',
    label: 'Compose Access Code Guidance to Buyer',
    situation: 'Write a professional email to client David Kowalski providing him with his new DocuSign Access Code (TX-8821) and explaining how to enter it upon opening his signing link.',
    rubric: [
      { id: 'r1', label: 'Mentions Access Code (TX-8821)', required: true, keywords: ['access code', 'code', 'tx-8821', '8821'] },
      { id: 'r2', label: 'Explains entering code upon clicking Review Document', required: true, keywords: ['link', 'email', 'review', 'prompt', 'enter'] },
      { id: 'r3', label: 'Mentions 3-attempt security limit', required: false, keywords: ['attempts', 'security', 'lockout', 'careful'] }
    ],
    points: 10
  }
];
