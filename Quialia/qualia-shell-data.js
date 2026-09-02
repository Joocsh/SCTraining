/* ============================================================================
   qualia-shell-data.js — fictional data for the Qualia Core facade sections.

   This file backs the six product sections (Contacts, Calendar, Accounting,
   Reports, Compliance, Admin) that exist so the simulator LOOKS like the real
   product. None of it is training content and none of it is graded.

   WHY IT IS SEPARATE FROM qualia-data.js
   qualia-data.js holds the curriculum — lessons, scenarios, reviews, the exam
   bank — and is off limits. Keeping the facade's data in its own file means the
   two can never be confused, and a `git diff` on the curriculum stays empty.

   COHERENCE RULE
   The facade must agree with the training data, or the illusion breaks the
   moment a trainee opens an order and then Contacts. So anything that already
   exists in QZ_ORDERS / QZ_VENDORS / QZ_TASKS is DERIVED at runtime rather than
   retyped here (see qzShellContacts() in qualia-shell.js); this file only adds
   the people and records that have no counterpart in the training data.
   Every date is positioned relative to QZ_TODAY ('2026-08-12').

   All names, companies, emails, phone numbers and figures are invented.
   ============================================================================ */

/* Directory entries that exist only in the facade. The ~20 people who appear on
   real orders are derived, not duplicated — see the coherence rule above. */
const QZS_CONTACTS = [
  { id: 'c-101', name: 'Adriana Solís', type: 'Attorney', company: 'Solís & Reyes PLLC', email: 'asolis@solisreyes.com', phone: '(214) 555-0132', mobile: '(214) 555-0902', address: '1400 Preston Rd, Suite 210, Plano, TX 75093', created: '2025-11-04', createdBy: 'Lucas Adminton', lastActivity: '2026-08-11' },
  { id: 'c-102', name: 'Bennett Ashcroft', type: 'Attorney', company: 'Ashcroft Title Law', email: 'bennett@ashcrofttitlelaw.com', phone: '(972) 555-0144', mobile: '(972) 555-0871', address: '885 Legacy Dr, Frisco, TX 75034', created: '2026-01-19', createdBy: 'Dana Whitfield', lastActivity: '2026-08-05' },
  { id: 'c-110', name: 'Folasade Adeyemi', type: 'Attorney', company: 'Adeyemi Title Law', email: 'fadeyemi@adeyemititlelaw.com', phone: '(214) 555-0188', mobile: '(214) 555-0913', address: '1400 Preston Rd, Suite 400, Plano, TX 75093', created: '2026-02-04', createdBy: 'Marisol Tran', lastActivity: '2026-08-07' },
  { id: 'c-111', name: 'Gregory Pham', type: 'Attorney', company: 'Pham & Reyes PLLC', email: 'gpham@phamreyes.com', phone: '(469) 555-0177', mobile: '(469) 555-0244', address: '6136 Frisco Square Blvd, Frisco, TX 75034', created: '2026-01-28', createdBy: 'Priyanka Raman', lastActivity: '2026-08-09' },
  { id: 'c-112', name: 'Marta Kowalczyk', type: 'Attorney', company: 'Kowalczyk Real Estate Counsel', email: 'mkowalczyk@krecounsel.com', phone: '(972) 555-0199', mobile: '(972) 555-0466', address: '2150 S Central Expy, Suite 210, McKinney, TX 75070', created: '2026-03-11', createdBy: 'Charles Ryan', lastActivity: '2026-08-11' },
  { id: 'c-103', name: 'Corinne Vasquez', type: 'Agent', company: 'Allen Homes Group', email: 'cvasquez@allenhomes.com', phone: '(972) 555-0410', mobile: '(972) 555-0688', address: '210 Central Expy, Allen, TX 75013', created: '2025-09-22', createdBy: 'Lucas Adminton', lastActivity: '2026-08-10' },
  { id: 'c-104', name: 'Desmond Blake', type: 'Agent', company: 'Richardson Realty Partners', email: 'dblake@richardsonrp.com', phone: '(469) 555-0155', mobile: '(469) 555-0733', address: '3300 Campbell Rd, Richardson, TX 75082', created: '2025-12-02', createdBy: 'Marisol Tran', lastActivity: '2026-08-09' },
  { id: 'c-105', name: 'Evelyn Prather', type: 'Lender', company: 'Collin County Savings', email: 'eprather@collincountysavings.com', phone: '(214) 555-0166', mobile: '(214) 555-0955', address: '77 Coit Rd, Plano, TX 75075', created: '2025-08-14', createdBy: 'Lucas Adminton', lastActivity: '2026-08-12' },
  { id: 'c-106', name: 'Cedar Point Lending', type: 'Lender', company: 'Cedar Point Lending', email: 'processing@cedarpointlending.com', phone: '(469) 555-0388', mobile: '—', address: '4110 Hollow Creek Ct, Allen, TX 75013', created: '2026-02-27', createdBy: 'Marisol Tran', lastActivity: '2026-08-07' },
  { id: 'c-107', name: 'Harold Coleman', type: 'Seller', company: '—', email: 'h.coleman@example.com', phone: '(972) 555-0177', mobile: '(972) 555-0644', address: '5445 Main St, Frisco, TX 75034', created: '2025-05-03', createdBy: 'Lucas Adminton', lastActivity: '2026-06-18' },
  { id: 'c-108', name: 'Imani Okafor', type: 'Buyer', company: '—', email: 'imani.okafor@example.com', phone: '(469) 555-0188', mobile: '(469) 555-0710', address: '918 Custer Rd, Plano, TX 75075', created: '2026-06-30', createdBy: 'Dana Whitfield', lastActivity: '2026-08-11' },
  { id: 'c-109', name: 'Jarrett Nakamura', type: 'Buyer', company: '—', email: 'j.nakamura@example.com', phone: '(214) 555-0199', mobile: '(214) 555-0766', address: '2201 Greenville Ave, Dallas, TX 75206', created: '2026-07-08', createdBy: 'Marisol Tran', lastActivity: '2026-08-06' },
  { id: 'c-110', name: 'Marisol Tran', type: 'Internal', company: 'Best Closing Inc.', email: 'mtran@bestclosing.com', phone: '(214) 555-0121', mobile: '(214) 555-0801', address: '900 E Park Blvd, Plano, TX 75074', created: '2024-03-11', createdBy: 'System', lastActivity: '2026-08-12' },
  { id: 'c-111', name: 'Dana Whitfield', type: 'Internal', company: 'Best Closing Inc.', email: 'dwhitfield@bestclosing.com', phone: '(214) 555-0122', mobile: '(214) 555-0802', address: '900 E Park Blvd, Plano, TX 75074', created: '2024-06-02', createdBy: 'System', lastActivity: '2026-08-12' },
  { id: 'c-112', name: 'Travis Jones', type: 'Internal', company: 'Best Closing Inc.', email: 'tjones@bestclosing.com', phone: '(214) 555-0123', mobile: '(214) 555-0803', address: '900 E Park Blvd, Plano, TX 75074', created: '2024-09-16', createdBy: 'System', lastActivity: '2026-08-11' },
  { id: 'c-113', name: 'Barbara Runolfsson', type: 'Internal', company: 'Best Closing Inc.', email: 'brunolfsson@bestclosing.com', phone: '(214) 555-0124', mobile: '(214) 555-0804', address: '900 E Park Blvd, Plano, TX 75074', created: '2025-02-04', createdBy: 'System', lastActivity: '2026-08-08' },
  { id: 'c-114', name: 'Simplifile e-Recording', type: 'Vendor', company: 'Simplifile', email: 'support@simplifile-demo.example', phone: '(800) 555-0100', mobile: '—', address: 'Provo, UT', created: '2024-01-08', createdBy: 'System', lastActivity: '2026-08-12' },
  { id: 'c-115', name: 'Collin County Clerk', type: 'Vendor', company: 'Collin County Clerk', email: 'recording@collincountyclerk.example', phone: '(972) 555-0300', mobile: '—', address: '2300 Bloomdale Rd, McKinney, TX 75071', created: '2024-01-08', createdBy: 'System', lastActivity: '2026-08-11' },
  { id: 'c-116', name: 'Certified Credit Bureau', type: 'Vendor', company: 'Certified Credit Bureau', email: 'orders@certifiedcredit.example', phone: '(800) 555-0155', mobile: '—', address: 'Dallas, TX', created: '2024-04-22', createdBy: 'System', lastActivity: '2026-08-04' },
  { id: 'c-117', name: 'Old Republic Title', type: 'Vendor', company: 'Old Republic National Title', email: 'agency@oldrepublic.example', phone: '(800) 555-0177', mobile: '—', address: 'Dallas, TX', created: '2024-01-08', createdBy: 'System', lastActivity: '2026-08-10' },
  { id: 'c-118', name: 'Rowan Mikkelsen', type: 'Seller', company: '—', email: 'r.mikkelsen@example.com', phone: '(469) 555-0211', mobile: '(469) 555-0788', address: '640 Ridgemont Dr, Allen, TX 75002', created: '2026-05-12', createdBy: 'Travis Jones', lastActivity: '2026-08-03' }
];

/* Facade events. The closings and task deadlines that already exist in
   QZ_ORDERS / QZ_TASKS are derived at runtime instead of being listed here, so
   the calendar can never disagree with the orders screen. */
const QZS_EVENTS = [
  { date: '2026-08-03', cal: 'signings', title: 'Signing — 640 Ridgemont Dr', time: '9:00 AM – 10:00 AM', location: 'Plano office, Room 2', people: ['Rowan Mikkelsen', 'Travis Jones'], notes: 'Seller-only signing, buyer signs remotely.' },
  { date: '2026-08-04', cal: 'recording', title: 'Recording — 918 Custer Rd', time: '11:30 AM', location: 'Collin County Clerk (e-Recording)', people: ['Marisol Tran'], notes: 'Submitted via Simplifile.' },
  { date: '2026-08-05', cal: 'deadlines', title: 'Payoff good-through expires — 219 Lakeshore', time: 'End of day', location: '—', people: ['Dana Whitfield'], notes: 'Summit Ridge payoff expires Aug 10; reorder before closing.' },
  { date: '2026-08-06', cal: 'signings', title: 'Signing — 2201 Greenville Ave', time: '2:00 PM – 3:00 PM', location: 'Mobile notary at buyer residence', people: ['Jarrett Nakamura', 'North Texas Notary Group'], notes: '' },
  { date: '2026-08-07', cal: 'wire', title: 'Wire cutoff — outgoing disbursements', time: '3:00 PM', location: '—', people: ['Barbara Runolfsson'], notes: 'Federal wire cutoff. Anything after this funds next business day.' },
  { date: '2026-08-10', cal: 'deadlines', title: 'Option period ends — 640 Ridgemont Dr', time: '5:00 PM', location: '—', people: ['Travis Jones'], notes: '' },
  { date: '2026-08-11', cal: 'closings', title: 'Closing — 918 Custer Rd, Plano', time: '10:00 AM – 11:30 AM', location: 'Plano office, Room 1', people: ['Imani Okafor', 'Desmond Blake'], notes: 'Cash purchase, no lender package.' },
  { date: '2026-08-12', cal: 'personal', title: 'Team stand-up', time: '8:45 AM – 9:00 AM', location: 'Plano office', people: ['Marisol Tran', 'Dana Whitfield', 'Travis Jones'], notes: '' },
  { date: '2026-08-12', cal: 'wire', title: 'Wire cutoff — outgoing disbursements', time: '3:00 PM', location: '—', people: ['Barbara Runolfsson'], notes: '' },
  { date: '2026-08-13', cal: 'signings', title: 'Signing — 5445 Main St (buyer)', time: '1:00 PM – 2:00 PM', location: 'Frisco office', people: ['Jon Smith', 'Samantha Bee'], notes: 'Buyer signs ahead of seller per signing order.' },
  { date: '2026-08-14', cal: 'recording', title: 'Recording — 640 Ridgemont Dr', time: '9:30 AM', location: 'Collin County Clerk (e-Recording)', people: ['Marisol Tran'], notes: '' },
  { date: '2026-08-17', cal: 'signings', title: 'Signing — 812 Birchwood Ln (seller)', time: '11:00 AM – 12:00 PM', location: 'Plano office, Room 2', people: ['Elena Ruiz', 'Dana Ruiz'], notes: '' },
  { date: '2026-08-18', cal: 'deadlines', title: 'HOA resale certificate due — 812 Birchwood', time: 'End of day', location: '—', people: ['Dana Whitfield'], notes: 'Ridgeview quoted 7–10 business days.' },
  { date: '2026-08-18', cal: 'wire', title: 'Wire cutoff — outgoing disbursements', time: '3:00 PM', location: '—', people: ['Barbara Runolfsson'], notes: '' },
  { date: '2026-08-19', cal: 'signings', title: 'Signing — 219 Lakeshore Dr (seller)', time: '3:30 PM – 4:30 PM', location: 'Mobile notary, McKinney', people: ['Grace Whitfield', 'Lakeshore Notary Services'], notes: '' },
  { date: '2026-08-20', cal: 'personal', title: 'Underwriter remittance review', time: '2:00 PM – 3:00 PM', location: 'Plano office', people: ['Barbara Runolfsson', 'Marisol Tran'], notes: 'Monthly Old Republic remittance.' },
  { date: '2026-08-21', cal: 'recording', title: 'Recording — 812 Birchwood Ln', time: '10:00 AM', location: 'Collin County Clerk (e-Recording)', people: ['Marisol Tran'], notes: '' },
  { date: '2026-08-24', cal: 'signings', title: 'Signing — 219 Lakeshore Dr (buyer)', time: '9:00 AM – 10:30 AM', location: 'McKinney office', people: ['Priya Natarajan', 'Paula Aragone'], notes: 'Final loan docs required before this can proceed.' },
  { date: '2026-08-25', cal: 'wire', title: 'Wire cutoff — outgoing disbursements', time: '3:00 PM', location: '—', people: ['Barbara Runolfsson'], notes: '' },
  { date: '2026-08-26', cal: 'recording', title: 'Recording — 219 Lakeshore Dr', time: '9:30 AM', location: 'Collin County Clerk (e-Recording)', people: ['Marisol Tran'], notes: '' },
  { date: '2026-08-26', cal: 'deadlines', title: 'Final walkthrough — 5445 Main St', time: '4:00 PM', location: 'Property', people: ['Jon Smith', 'Samantha Bee'], notes: '' },
  { date: '2026-08-27', cal: 'signings', title: 'Signing — 5445 Main St (seller)', time: '10:00 AM – 11:00 AM', location: 'Frisco office', people: ['Tanya R. Hart', 'Peter Einhorn'], notes: '' },
  { date: '2026-08-28', cal: 'personal', title: 'Month-end reconciliation prep', time: '1:00 PM – 3:00 PM', location: 'Plano office', people: ['Barbara Runolfsson'], notes: '' },
  { date: '2026-08-31', cal: 'deadlines', title: 'August escrow reconciliation due', time: 'End of day', location: '—', people: ['Barbara Runolfsson'], notes: 'ALTA Best Practice #2 requires monthly three-way reconciliation.' },
  { date: '2026-08-31', cal: 'recording', title: 'Recording — 5445 Main St', time: '11:00 AM', location: 'Collin County Clerk (e-Recording)', people: ['Marisol Tran'], notes: '' },
  { date: '2026-08-03', cal: 'personal', title: 'Underwriter portal training', time: '3:00 PM – 4:00 PM', location: 'Remote', people: ['Travis Jones', 'Dana Whitfield'], notes: 'Old Republic agency portal refresher.' },
  { date: '2026-08-07', cal: 'closings', title: 'Closing — 2201 Greenville Ave, Dallas', time: '1:00 PM – 2:30 PM', location: 'Plano office, Room 1', people: ['Jarrett Nakamura', 'Desmond Blake'], notes: '' },
  { date: '2026-08-13', cal: 'personal', title: 'Escrow audit prep — pull August receipts', time: '4:00 PM – 5:00 PM', location: 'Plano office', people: ['Barbara Runolfsson'], notes: 'Fifth item on this day, so the day cell shows an overflow link.' },
  { date: '2026-08-14', cal: 'deadlines', title: 'CPL expiration — Collin County Savings', time: 'End of day', location: '—', people: ['Marisol Tran'], notes: 'Reissue before the lender funds.' },
  { date: '2026-08-20', cal: 'closings', title: 'Closing — 812 Birchwood Ln (scheduled)', time: '10:00 AM – 11:30 AM', location: 'Plano office, Room 2', people: ['Marcus Webb', 'Elena Ruiz'], notes: 'Contingent on the HOA resale certificate arriving.' },
  { date: '2026-08-27', cal: 'deadlines', title: 'Funds due from lender — 5445 Main St', time: '12:00 PM', location: '—', people: ['Barbara Runolfsson'], notes: '' }
];

/* Calendar colour legend. Ids match QZS_EVENTS[].cal. */
const QZS_CALENDARS = [
  { id: 'closings',  label: 'Closings',     color: 'var(--qz-ocean)' },
  { id: 'signings',  label: 'Signings',     color: '#3d7ab8' },
  { id: 'deadlines', label: 'Deadlines',    color: 'var(--qz-gold)' },
  { id: 'recording', label: 'Recording',    color: 'var(--qz-muted)' },
  { id: 'wire',      label: 'Wire Cutoffs', color: 'var(--qz-bad)' },
  { id: 'personal',  label: 'Personal',     color: '#7c6bb0' }
];

const QZS_OFFICES = [
  { id: 'plano',      name: 'Plano — Headquarters', address: '900 E Park Blvd, Suite 300, Plano, TX 75074', phone: '(214) 555-0120', states: 'TX', underwriters: 'Old Republic, First American', users: 8, status: 'Active' },
  { id: 'frisco',     name: 'Frisco',               address: '2601 Preston Rd, Suite 140, Frisco, TX 75034', phone: '(972) 555-0130', states: 'TX', underwriters: 'Old Republic', users: 4, status: 'Active' },
  { id: 'mckinney',   name: 'McKinney',             address: '1550 Eldorado Pkwy, Suite 210, McKinney, TX 75069', phone: '(214) 555-0140', states: 'TX', underwriters: 'Old Republic, Stewart', users: 3, status: 'Active' },
  { id: 'allen',      name: 'Allen',                address: '700 Central Expy S, Suite 155, Allen, TX 75013', phone: '(972) 555-0150', states: 'TX', underwriters: 'First American', users: 2, status: 'Active' },
  { id: 'richardson', name: 'Richardson — Satellite', address: '1231 Campbell Rd, Suite 90, Richardson, TX 75080', phone: '(469) 555-0160', states: 'TX', underwriters: 'Old Republic', users: 1, status: 'Onboarding' }
];

/* ============================================================================
   ACCOUNTING — escrow/trust ledgers.

   Figures are internally consistent rather than random: the three real orders
   contribute earnest money, loan funding and cash-to-close amounts that line up
   with their purchasePrice / loanAmount in qualia-data.js, and the vendors paid
   in QZS_DISBURSEMENTS are the same firms listed in QZ_VENDORS. A trainee who
   opens ORD-2026-1398 and then Accounting should recognise the numbers.
   ============================================================================ */

const QZS_ACCOUNTS = [
  { id: 'acct-1', name: 'Escrow Trust — Operating', bank: 'Frost Bank', type: 'Escrow / Trust', balance: 3184220.55, reconciled: '2026-07-31', status: 'Balanced' },
  { id: 'acct-2', name: 'Escrow Trust — Commercial', bank: 'Frost Bank', type: 'Escrow / Trust', balance: 742118.02, reconciled: '2026-07-31', status: 'Balanced' },
  { id: 'acct-3', name: 'Recording Escrow', bank: 'Independent Financial', type: 'Escrow / Trust', balance: 186401.60, reconciled: '2026-07-31', status: 'Balanced' },
  { id: 'acct-4', name: 'IOLTA', bank: 'Frost Bank', type: 'IOLTA', balance: 70200.00, reconciled: '2026-06-30', status: 'Overdue' },
  { id: 'acct-5', name: 'Operating', bank: 'Comerica', type: 'Operating', balance: 412860.44, reconciled: '2026-07-31', status: 'Balanced' }
];

/* Alerts shown beside the Overview. Deliberately phrased the way a real system
   nags: each one points at something visible elsewhere in this section. */
const QZS_ACCT_ALERTS = [
  { severity: 'high', text: '3 disbursements are pending approval', detail: 'Totalling $18,412.00 across two orders.' },
  { severity: 'medium', text: 'IOLTA not reconciled in 43 days', detail: 'Last balanced Jun 30, 2026. ALTA Best Practice #2 requires monthly.' },
  { severity: 'medium', text: "Positive Pay file not sent today", detail: 'Last transmission Aug 11, 2026 at 4:05 PM.' }
];

const QZS_RECEIPTS = [
  { date: '2026-08-12', num: 'R-24118', order: 'ORD-2026-1398', payer: 'Priya Natarajan', method: 'Wire', amount: 49001.95, status: 'Pending', by: 'Barbara Runolfsson' },
  { date: '2026-08-12', num: 'R-24117', order: 'ORD-2026-1512', payer: 'Plano Trust Mortgage', method: 'Wire', amount: 385650.00, status: 'Pending', by: 'Barbara Runolfsson' },
  { date: '2026-08-11', num: 'R-24116', order: 'ORD-2026-1483', payer: 'Jon Smith', method: 'Cashier’s Check', amount: 12400.00, status: 'Deposited', by: 'Marisol Tran' },
  { date: '2026-08-11', num: 'R-24115', order: 'ORD-2026-1398', payer: 'Grace Whitfield', method: 'Check', amount: 1850.00, status: 'Deposited', by: 'Marisol Tran' },
  { date: '2026-08-10', num: 'R-24114', order: 'ORD-2026-1512', payer: 'Marcus Webb', method: 'Wire', amount: 42850.00, status: 'Deposited', by: 'Barbara Runolfsson' },
  { date: '2026-08-10', num: 'R-24113', order: 'ORD-2026-1483', payer: 'Frisco Community Lending', method: 'Wire', amount: 354954.00, status: 'Deposited', by: 'Barbara Runolfsson' },
  { date: '2026-08-08', num: 'R-24112', order: 'ORD-2026-1398', payer: 'Priya Natarajan', method: 'Wire', amount: 10000.00, status: 'Deposited', by: 'Marisol Tran' },
  { date: '2026-08-08', num: 'R-24111', order: 'ORD-2026-EXAM', payer: 'Derek Owusu', method: 'ACH', amount: 8500.00, status: 'Deposited', by: 'Travis Jones' },
  { date: '2026-08-07', num: 'R-24110', order: 'ORD-2026-1512', payer: 'Ridgeview HOA Management', method: 'Check', amount: 375.00, status: 'Deposited', by: 'Marisol Tran' },
  { date: '2026-08-07', num: 'R-24109', order: 'ORD-2026-1483', payer: 'Jon Smith', method: 'Wire', amount: 7500.00, status: 'Deposited', by: 'Barbara Runolfsson' },
  { date: '2026-08-06', num: 'R-24108', order: 'ORD-2026-1398', payer: 'Northgate Home Loans', method: 'Wire', amount: 461610.00, status: 'On Hold', by: 'Barbara Runolfsson' },
  { date: '2026-08-06', num: 'R-24107', order: 'ORD-2026-1512', payer: 'Elena Ruiz', method: 'Check', amount: 960.00, status: 'Deposited', by: 'Travis Jones' },
  { date: '2026-08-05', num: 'R-24106', order: 'ORD-2026-1483', payer: 'Tanya R. Hart', method: 'Check', amount: 2140.00, status: 'Deposited', by: 'Marisol Tran' },
  { date: '2026-08-05', num: 'R-24105', order: 'ORD-2026-EXAM', payer: 'Cedar Point Lending', method: 'Wire', amount: 372900.00, status: 'Deposited', by: 'Barbara Runolfsson' },
  { date: '2026-08-04', num: 'R-24104', order: 'ORD-2026-1512', payer: 'Marcus Webb', method: 'ACH', amount: 500.00, status: 'Deposited', by: 'Travis Jones' },
  { date: '2026-08-04', num: 'R-24103', order: 'ORD-2026-1398', payer: 'Paula Aragone', method: 'Check', amount: 325.00, status: 'Deposited', by: 'Marisol Tran' },
  { date: '2026-08-03', num: 'R-24102', order: 'ORD-2026-1483', payer: 'Jon Smith', method: 'Wire', amount: 5000.00, status: 'Deposited', by: 'Barbara Runolfsson' },
  { date: '2026-08-03', num: 'R-24101', order: 'ORD-2026-1512', payer: 'Marcus Webb', method: 'Cashier’s Check', amount: 6200.00, status: 'Deposited', by: 'Marisol Tran' },
  { date: '2026-07-31', num: 'R-24100', order: 'ORD-2026-1398', payer: 'Grace Whitfield', method: 'Check', amount: 1200.00, status: 'Deposited', by: 'Travis Jones' },
  { date: '2026-07-30', num: 'R-24099', order: 'ORD-2026-1483', payer: 'Samantha Bee', method: 'ACH', amount: 450.00, status: 'Deposited', by: 'Marisol Tran' },
  { date: '2026-07-29', num: 'R-24098', order: 'ORD-2026-1512', payer: 'Plano Trust Mortgage', method: 'Wire', amount: 15000.00, status: 'Deposited', by: 'Barbara Runolfsson' },
  { date: '2026-07-28', num: 'R-24097', order: 'ORD-2026-1398', payer: 'Priya Natarajan', method: 'ACH', amount: 2800.00, status: 'Deposited', by: 'Travis Jones' },
  { date: '2026-07-27', num: 'R-24096', order: 'ORD-2026-1483', payer: 'Jon Smith', method: 'Check', amount: 1100.00, status: 'Deposited', by: 'Marisol Tran' },
  { date: '2026-07-24', num: 'R-24095', order: 'ORD-2026-EXAM', payer: 'Derek Owusu', method: 'Wire', amount: 25875.00, status: 'Deposited', by: 'Barbara Runolfsson' },
  { date: '2026-07-23', num: 'R-24094', order: 'ORD-2026-1512', payer: 'Colin Frost', method: 'Check', amount: 275.00, status: 'Deposited', by: 'Travis Jones' },
  { date: '2026-07-22', num: 'R-24093', order: 'ORD-2026-1398', payer: 'Nathaniel Price', method: 'ACH', amount: 640.00, status: 'Deposited', by: 'Marisol Tran' },
  { date: '2026-07-21', num: 'R-24092', order: 'ORD-2026-1483', payer: 'Frisco Community Lending', method: 'Wire', amount: 3200.00, status: 'Deposited', by: 'Barbara Runolfsson' },
  { date: '2026-07-20', num: 'R-24091', order: 'ORD-2026-1512', payer: 'Marcus Webb', method: 'Check', amount: 890.00, status: 'Deposited', by: 'Travis Jones' },
  { date: '2026-07-17', num: 'R-24090', order: 'ORD-2026-1398', payer: 'Grace Whitfield', method: 'Wire', amount: 4300.00, status: 'Deposited', by: 'Barbara Runolfsson' },
  { date: '2026-07-16', num: 'R-24089', order: 'ORD-2026-1483', payer: 'Tanya R. Hart', method: 'ACH', amount: 720.00, status: 'Deposited', by: 'Marisol Tran' }
];

const QZS_DISBURSEMENTS = [
  { date: '2026-08-12', num: 'W-8841', order: 'ORD-2026-1398', payee: 'Summit Ridge Mortgage Servicing', method: 'Wire', amount: 282754.73, status: 'Pending Approval', by: '—' },
  { date: '2026-08-12', num: 'CK-10442', order: 'ORD-2026-1512', payee: 'Ridgeview HOA Management', method: 'Check', amount: 1055.00, status: 'Pending Approval', by: '—' },
  { date: '2026-08-11', num: 'CK-10441', order: 'ORD-2026-1483', payee: 'Ace Home Inspections', method: 'Check', amount: 425.00, status: 'Issued', by: 'Barbara Runolfsson' },
  { date: '2026-08-11', num: 'W-8840', order: 'ORD-2026-1483', payee: 'Best Closing Inc.', method: 'Wire', amount: 2593.11, status: 'Cleared', by: 'Barbara Runolfsson' },
  { date: '2026-08-11', num: 'CK-10440', order: 'ORD-2026-EXAM', payee: 'Allen Property Inspections', method: 'Check', amount: 375.00, status: 'Pending Approval', by: '—' },
  { date: '2026-08-10', num: 'CK-10439', order: 'ORD-2026-1512', payee: 'Precision Land Surveying', method: 'Check', amount: 640.00, status: 'Cleared', by: 'Marisol Tran' },
  { date: '2026-08-10', num: 'CK-10438', order: 'ORD-2026-1483', payee: 'Collin County Clerk', method: 'Check', amount: 185.00, status: 'Issued', by: 'Marisol Tran' },
  { date: '2026-08-08', num: 'W-8839', order: 'ORD-2026-1398', payee: 'Lakeshore Notary Services', method: 'Wire', amount: 225.00, status: 'Cleared', by: 'Barbara Runolfsson' },
  { date: '2026-08-08', num: 'CK-10437', order: 'ORD-2026-1483', payee: 'North Texas Notary Group', method: 'Check', amount: 200.00, status: 'Cleared', by: 'Marisol Tran' },
  { date: '2026-08-07', num: 'CK-10436', order: 'ORD-2026-1512', payee: 'Certified Credit Bureau', method: 'Check', amount: 29.50, status: 'Cleared', by: 'Travis Jones' },
  { date: '2026-08-07', num: 'W-8838', order: 'ORD-2026-1483', payee: 'Old Republic National Title', method: 'Wire', amount: 1642.00, status: 'Cleared', by: 'Barbara Runolfsson' },
  { date: '2026-08-06', num: 'CK-10435', order: 'ORD-2026-1398', payee: 'Collin County Clerk', method: 'Check', amount: 185.00, status: 'Issued', by: 'Marisol Tran' },
  { date: '2026-08-06', num: 'CK-10434', order: 'ORD-2026-1512', payee: 'Best Closing Inc.', method: 'Check', amount: 599.90, status: 'Cleared', by: 'Barbara Runolfsson' },
  { date: '2026-08-05', num: 'W-8837', order: 'ORD-2026-EXAM', payee: 'Old Republic National Title', method: 'Wire', amount: 1794.38, status: 'Cleared', by: 'Barbara Runolfsson' },
  { date: '2026-08-05', num: 'CK-10433', order: 'ORD-2026-1483', payee: 'Frisco Community Lending', method: 'Check', amount: 850.00, status: 'Void', by: 'Barbara Runolfsson' },
  { date: '2026-08-04', num: 'CK-10432', order: 'ORD-2026-1398', payee: 'Best Closing Inc.', method: 'Check', amount: 718.06, status: 'Cleared', by: 'Marisol Tran' },
  { date: '2026-08-04', num: 'W-8836', order: 'ORD-2026-1512', payee: 'Plano Trust Mortgage', method: 'Wire', amount: 4200.00, status: 'Cleared', by: 'Barbara Runolfsson' },
  { date: '2026-08-03', num: 'CK-10431', order: 'ORD-2026-1483', payee: 'Ace Home Inspections', method: 'Check', amount: 50.00, status: 'Cleared', by: 'Travis Jones' },
  { date: '2026-07-31', num: 'CK-10430', order: 'ORD-2026-1512', payee: 'Collin County Clerk', method: 'Check', amount: 210.00, status: 'Cleared', by: 'Marisol Tran' },
  { date: '2026-07-30', num: 'W-8835', order: 'ORD-2026-1398', payee: 'Old Republic National Title', method: 'Wire', amount: 2310.00, status: 'Cleared', by: 'Barbara Runolfsson' },
  { date: '2026-07-29', num: 'CK-10429', order: 'ORD-2026-1483', payee: 'North Texas Notary Group', method: 'Check', amount: 175.00, status: 'Cleared', by: 'Travis Jones' },
  { date: '2026-07-28', num: 'CK-10428', order: 'ORD-2026-EXAM', payee: 'Collin County Clerk', method: 'Check', amount: 195.00, status: 'Cleared', by: 'Marisol Tran' },
  { date: '2026-07-27', num: 'W-8834', order: 'ORD-2026-1512', payee: 'Best Closing Inc.', method: 'Wire', amount: 1180.00, status: 'Cleared', by: 'Barbara Runolfsson' },
  { date: '2026-07-24', num: 'CK-10427', order: 'ORD-2026-1398', payee: 'Lakeshore Notary Services', method: 'Check', amount: 200.00, status: 'Cleared', by: 'Travis Jones' },
  { date: '2026-07-23', num: 'CK-10426', order: 'ORD-2026-1483', payee: 'Certified Credit Bureau', method: 'Check', amount: 29.50, status: 'Cleared', by: 'Marisol Tran' },
  { date: '2026-07-22', num: 'W-8833', order: 'ORD-2026-1512', payee: 'Ridgeview HOA Management', method: 'Wire', amount: 200.00, status: 'Cleared', by: 'Barbara Runolfsson' },
  { date: '2026-07-21', num: 'CK-10425', order: 'ORD-2026-1398', payee: 'Best Closing Inc.', method: 'Check', amount: 640.00, status: 'Cleared', by: 'Travis Jones' },
  { date: '2026-07-20', num: 'CK-10424', order: 'ORD-2026-1483', payee: 'Precision Land Surveying', method: 'Check', amount: 575.00, status: 'Cleared', by: 'Marisol Tran' },
  { date: '2026-07-17', num: 'W-8832', order: 'ORD-2026-EXAM', payee: 'Best Closing Inc.', method: 'Wire', amount: 558.25, status: 'Cleared', by: 'Barbara Runolfsson' },
  { date: '2026-07-16', num: 'CK-10423', order: 'ORD-2026-1512', payee: 'North Texas Notary Group', method: 'Check', amount: 150.00, status: 'Cleared', by: 'Travis Jones' }
];

/* Monthly three-way reconciliation history. One period deliberately does not
   balance and sits Under Review — a ledger where every month is perfect reads as
   decoration, and the exception is the thing a VA has to learn to notice. */
const QZS_RECONCILIATIONS = [
  { period: 'Jul 2026', account: 'Escrow Trust — Operating', bank: 3184220.55, book: 3184220.55, by: 'Barbara Runolfsson', date: '2026-07-31', status: 'Balanced' },
  { period: 'Jul 2026', account: 'Escrow Trust — Commercial', bank: 742118.02, book: 742118.02, by: 'Barbara Runolfsson', date: '2026-07-31', status: 'Balanced' },
  { period: 'Jul 2026', account: 'Recording Escrow', bank: 186401.60, book: 186401.60, by: 'Marisol Tran', date: '2026-07-31', status: 'Balanced' },
  { period: 'Jun 2026', account: 'Escrow Trust — Operating', bank: 2971044.18, book: 2971044.18, by: 'Barbara Runolfsson', date: '2026-06-30', status: 'Balanced' },
  { period: 'Jun 2026', account: 'Escrow Trust — Commercial', bank: 688210.75, book: 688210.75, by: 'Barbara Runolfsson', date: '2026-06-30', status: 'Balanced' },
  { period: 'Jun 2026', account: 'IOLTA', bank: 70200.00, book: 70200.00, by: 'Marisol Tran', date: '2026-06-30', status: 'Balanced' },
  { period: 'May 2026', account: 'Escrow Trust — Operating', bank: 2804663.90, book: 2804663.90, by: 'Barbara Runolfsson', date: '2026-05-31', status: 'Balanced' },
  { period: 'May 2026', account: 'Recording Escrow', bank: 174820.40, book: 175145.40, by: 'Marisol Tran', date: '2026-05-31', status: 'Under Review' },
  { period: 'May 2026', account: 'Escrow Trust — Commercial', bank: 651930.12, book: 651930.12, by: 'Barbara Runolfsson', date: '2026-05-31', status: 'Balanced' },
  { period: 'Apr 2026', account: 'Escrow Trust — Operating', bank: 2655180.44, book: 2655180.44, by: 'Barbara Runolfsson', date: '2026-04-30', status: 'Balanced' },
  { period: 'Apr 2026', account: 'Escrow Trust — Commercial', bank: 610455.88, book: 610455.88, by: 'Barbara Runolfsson', date: '2026-04-30', status: 'Balanced' },
  { period: 'Apr 2026', account: 'Recording Escrow', bank: 168004.20, book: 168004.20, by: 'Marisol Tran', date: '2026-04-30', status: 'Balanced' }
];

const QZS_INVOICES = [
  { num: 'INV-5512', order: 'ORD-2026-1398', billTo: 'Northgate Home Loans', issued: '2026-08-11', due: '2026-09-10', amount: 2560.06, balance: 2560.06, status: 'Open' },
  { num: 'INV-5511', order: 'ORD-2026-1512', billTo: 'Plano Trust Mortgage', issued: '2026-08-10', due: '2026-09-09', amount: 2041.90, balance: 2041.90, status: 'Open' },
  { num: 'INV-5510', order: 'ORD-2026-1483', billTo: 'Frisco Community Lending', issued: '2026-08-08', due: '2026-09-07', amount: 2593.11, balance: 0, status: 'Paid' },
  { num: 'INV-5509', order: 'ORD-2026-EXAM', billTo: 'Cedar Point Lending', issued: '2026-08-05', due: '2026-09-04', amount: 1794.38, balance: 1794.38, status: 'Open' },
  { num: 'INV-5508', order: 'ORD-2026-1483', billTo: 'Samantha Bee', issued: '2026-07-30', due: '2026-08-29', amount: 450.00, balance: 450.00, status: 'Open' },
  { num: 'INV-5507', order: 'ORD-2026-1512', billTo: 'Dana Ruiz', issued: '2026-07-28', due: '2026-08-27', amount: 275.00, balance: 275.00, status: 'Open' },
  { num: 'INV-5506', order: 'ORD-2026-1398', billTo: 'Paula Aragone', issued: '2026-07-22', due: '2026-08-21', amount: 640.00, balance: 640.00, status: 'Open' },
  { num: 'INV-5505', order: 'ORD-2026-1483', billTo: 'Tanya R. Hart', issued: '2026-07-08', due: '2026-08-07', amount: 720.00, balance: 720.00, status: 'Past Due' },
  { num: 'INV-5504', order: 'ORD-2026-1512', billTo: 'Colin Frost', issued: '2026-07-05', due: '2026-08-04', amount: 310.00, balance: 310.00, status: 'Past Due' },
  { num: 'INV-5503', order: 'ORD-2026-1398', billTo: 'Nathaniel Price', issued: '2026-06-28', due: '2026-07-28', amount: 415.00, balance: 415.00, status: 'Past Due' },
  { num: 'INV-5502', order: 'ORD-2026-1483', billTo: 'Frisco Community Lending', issued: '2026-06-20', due: '2026-07-20', amount: 1180.00, balance: 0, status: 'Paid' },
  { num: 'INV-5501', order: 'ORD-2026-1512', billTo: 'Plano Trust Mortgage', issued: '2026-06-14', due: '2026-07-14', amount: 2110.55, balance: 0, status: 'Paid' },
  { num: 'INV-5500', order: 'ORD-2026-EXAM', billTo: 'Renee Castillo', issued: '2026-06-10', due: '2026-07-10', amount: 380.00, balance: 0, status: 'Paid' },
  { num: 'INV-5499', order: 'ORD-2026-1398', billTo: 'Northgate Home Loans', issued: '2026-05-30', due: '2026-06-29', amount: 1955.00, balance: 0, status: 'Paid' },
  { num: 'INV-5498', order: 'ORD-2026-1483', billTo: 'Peter Einhorn', issued: '2026-05-22', due: '2026-06-21', amount: 295.00, balance: 0, status: 'Paid' }
];

const QZS_POSPAY = [
  { date: '2026-08-11', file: 'PPAY_20260811_FROST_ESCROW.txt', account: 'Escrow Trust — Operating', items: 14, total: 48211.05, status: 'Accepted', sent: '4:05 PM' },
  { date: '2026-08-08', file: 'PPAY_20260808_FROST_ESCROW.txt', account: 'Escrow Trust — Operating', items: 9, total: 12844.60, status: 'Accepted', sent: '3:58 PM' },
  { date: '2026-08-07', file: 'PPAY_20260807_FROST_ESCROW.txt', account: 'Escrow Trust — Operating', items: 11, total: 31009.40, status: 'Accepted', sent: '4:02 PM' },
  { date: '2026-08-06', file: 'PPAY_20260806_INDEP_RECORDING.txt', account: 'Recording Escrow', items: 4, total: 775.00, status: 'Accepted', sent: '3:41 PM' },
  { date: '2026-08-05', file: 'PPAY_20260805_FROST_ESCROW.txt', account: 'Escrow Trust — Operating', items: 7, total: 9420.18, status: 'Rejected', sent: '4:11 PM' },
  { date: '2026-08-04', file: 'PPAY_20260804_FROST_ESCROW.txt', account: 'Escrow Trust — Operating', items: 12, total: 27655.30, status: 'Accepted', sent: '3:52 PM' },
  { date: '2026-08-03', file: 'PPAY_20260803_FROST_COMMERCIAL.txt', account: 'Escrow Trust — Commercial', items: 3, total: 6180.00, status: 'Accepted', sent: '3:47 PM' },
  { date: '2026-07-31', file: 'PPAY_20260731_FROST_ESCROW.txt', account: 'Escrow Trust — Operating', items: 18, total: 66240.75, status: 'Accepted', sent: '4:08 PM' }
];

/* ============================================================================
   REPORTS — catalog, series and the Order Volume detail rows.
   ============================================================================ */

/* Left-rail catalog. `built: true` marks the reports this demo actually renders;
   the rest select and show their own header and filter bar, then say plainly
   that the visualisation is not part of the demo — a stated limit rather than a
   control that appears to work and does nothing. */
const QZS_REPORT_CATALOG = [
  { category: 'Production', reports: [
    { id: 'order-volume', name: 'Order Volume', built: true, desc: 'Orders opened and closed by month, with cycle time and fee totals.' },
    { id: 'closed-orders', name: 'Closed Orders', desc: 'Every order that reached closing in the selected period.' },
    { id: 'open-aging', name: 'Open Orders Aging', desc: 'Open orders bucketed by days since intake.' },
    { id: 'orders-source', name: 'Orders by Source', desc: 'Referral source attribution for new orders.' }
  ]},
  { category: 'Financial', reports: [
    { id: 'revenue-office', name: 'Revenue by Office', built: true, desc: 'Settlement and title revenue split by office.' },
    { id: 'revenue-agent', name: 'Revenue by Agent', desc: 'Revenue attributed to the referring agent.' },
    { id: 'fee-analysis', name: 'Fee Analysis', desc: 'Average fee by order type against the published schedule.' },
    { id: 'escrow-balances', name: 'Escrow Balances', desc: 'Trust balances by account and period.' }
  ]},
  { category: 'Title', reports: [
    { id: 'policy-production', name: 'Policy Production', desc: 'Owner and lender policies issued, by underwriter.' },
    { id: 'underwriter-remittance', name: 'Underwriter Remittance', desc: 'Premium splits due to each underwriter.' },
    { id: 'commitment-turnaround', name: 'Commitment Turnaround', desc: 'Days from order open to commitment delivery.' }
  ]},
  { category: 'Escrow', reports: [
    { id: 'disbursement-summary', name: 'Disbursement Summary', desc: 'Outgoing funds by payee and method.' },
    { id: 'trust-activity', name: 'Trust Activity', desc: 'All receipts and disbursements against trust accounts.' },
    { id: 'unreleased-funds', name: 'Unreleased Funds', desc: 'Balances held past the expected release date.' }
  ]},
  { category: 'Compliance', reports: [
    { id: 'cpl-issuance', name: 'CPL Issuance', desc: 'Closing protection letters issued and expiring.' },
    { id: 'exception-summary', name: 'Exception Summary', desc: 'Open exceptions by severity and age.' },
    { id: 'audit-activity', name: 'Audit Activity', desc: 'User actions recorded in the audit log.' }
  ]},
  { category: 'User Activity', reports: [
    { id: 'productivity-user', name: 'Productivity by User', built: true, desc: 'Orders touched, tasks completed and closings per user.' },
    { id: 'login-history', name: 'Login History', desc: 'Sign-in events by user, device and IP.' },
    { id: 'task-completion', name: 'Task Completion', desc: 'On-time versus late task completion rates.' }
  ]}
];

const QZS_REPORT_FAVORITES = ['order-volume', 'revenue-office', 'exception-summary'];

/* Twelve months ending on the simulator's current month. Opened runs slightly
   ahead of closed all year, which is what gives the bar chart its shape. */
const QZS_REPORT_SERIES = [
  { month: 'Sep', opened: 112, closed: 98 },
  { month: 'Oct', opened: 124, closed: 109 },
  { month: 'Nov', opened: 96, closed: 101 },
  { month: 'Dec', opened: 88, closed: 94 },
  { month: 'Jan', opened: 131, closed: 105 },
  { month: 'Feb', opened: 118, closed: 112 },
  { month: 'Mar', opened: 142, closed: 120 },
  { month: 'Apr', opened: 137, closed: 128 },
  { month: 'May', opened: 149, closed: 131 },
  { month: 'Jun', opened: 156, closed: 140 },
  { month: 'Jul', opened: 152, closed: 125 },
  { month: 'Aug', opened: 148, closed: 121 }
];

const QZS_REPORT_MIX = [
  { label: 'Purchase', pct: 62, count: 92, color: 'var(--qz-green)' },
  { label: 'Refinance', pct: 21, count: 31, color: 'var(--qz-ocean)' },
  { label: 'Cash', pct: 11, count: 16, color: 'var(--qz-gold)' },
  { label: 'Commercial', pct: 6, count: 9, color: 'var(--qz-muted)' }
];

const QZS_REPORT_KPIS = [
  { label: 'Orders Opened', value: '148', delta: '+12%', up: true },
  { label: 'Orders Closed', value: '121', delta: '-3%', up: false },
  { label: 'Avg Cycle Time', value: '34 days', delta: '-2 days', up: true },
  { label: 'Revenue', value: '$412,860', delta: '+8%', up: true },
  { label: 'Avg Fee', value: '$3,412', delta: '+1.4%', up: true }
];

/* 24 of the 148 rows behind the summary — the count in the report footer says so
   explicitly, because a table that silently shows a subset is how people end up
   quoting the wrong total. */
const QZS_REPORT_ROWS = [
  { order: 'ORD-2026-1471', property: '1820 Ridgehollow Dr, Plano, TX', type: 'Purchase', opened: '2026-06-30', closed: '2026-08-03', cycle: 34, fees: 3210.50, officer: 'Marisol Tran', agent: 'Samantha Bee' },
  { order: 'ORD-2026-1468', property: '904 Winterstone Ln, Frisco, TX', type: 'Purchase', opened: '2026-06-24', closed: '2026-08-04', cycle: 41, fees: 3684.00, officer: 'Dana Whitfield', agent: 'Peter Einhorn' },
  { order: 'ORD-2026-1465', property: '2201 Greenville Ave, Dallas, TX', type: 'Cash', opened: '2026-07-08', closed: '2026-08-06', cycle: 29, fees: 1980.00, officer: 'Travis Jones', agent: 'Desmond Blake' },
  { order: 'ORD-2026-1462', property: '640 Ridgemont Dr, Allen, TX', type: 'Purchase', opened: '2026-06-18', closed: '2026-08-07', cycle: 50, fees: 3402.75, officer: 'Marisol Tran', agent: 'Corinne Vasquez' },
  { order: 'ORD-2026-1459', property: '5580 Preston Meadow, Plano, TX', type: 'Refinance', opened: '2026-07-02', closed: '2026-08-07', cycle: 36, fees: 1450.00, officer: 'Dana Whitfield', agent: '—' },
  { order: 'ORD-2026-1456', property: '918 Custer Rd, Plano, TX', type: 'Cash', opened: '2026-07-14', closed: '2026-08-11', cycle: 28, fees: 2115.00, officer: 'Travis Jones', agent: 'Desmond Blake' },
  { order: 'ORD-2026-1452', property: '3311 Legacy Dr, Frisco, TX', type: 'Purchase', opened: '2026-06-11', closed: '2026-07-31', cycle: 50, fees: 3890.20, officer: 'Marisol Tran', agent: 'Samantha Bee' },
  { order: 'ORD-2026-1449', property: '7702 Coit Rd, Richardson, TX', type: 'Refinance', opened: '2026-06-28', closed: '2026-07-30', cycle: 32, fees: 1385.00, officer: 'Dana Whitfield', agent: '—' },
  { order: 'ORD-2026-1445', property: '110 Bloomdale Rd, McKinney, TX', type: 'Purchase', opened: '2026-06-05', closed: '2026-07-29', cycle: 54, fees: 3520.00, officer: 'Travis Jones', agent: 'Paula Aragone' },
  { order: 'ORD-2026-1441', property: '4408 Hedgcoxe Rd, Plano, TX', type: 'Purchase', opened: '2026-06-16', closed: '2026-07-28', cycle: 42, fees: 3288.40, officer: 'Marisol Tran', agent: 'Corinne Vasquez' },
  { order: 'ORD-2026-1438', property: '215 Eldorado Pkwy, McKinney, TX', type: 'Commercial', opened: '2026-05-20', closed: '2026-07-27', cycle: 68, fees: 9840.00, officer: 'Dana Whitfield', agent: 'Nathaniel Price' },
  { order: 'ORD-2026-1434', property: '8801 Independence Pkwy, Plano, TX', type: 'Purchase', opened: '2026-06-09', closed: '2026-07-24', cycle: 45, fees: 3140.00, officer: 'Travis Jones', agent: 'Samantha Bee' },
  { order: 'ORD-2026-1430', property: '1290 Stonebridge Dr, McKinney, TX', type: 'Purchase', opened: '2026-06-02', closed: '2026-07-23', cycle: 51, fees: 3610.75, officer: 'Marisol Tran', agent: 'Paula Aragone' },
  { order: 'ORD-2026-1427', property: '660 Exchange Pkwy, Allen, TX', type: 'Refinance', opened: '2026-06-22', closed: '2026-07-22', cycle: 30, fees: 1420.00, officer: 'Dana Whitfield', agent: '—' },
  { order: 'ORD-2026-1423', property: '3050 Alma Dr, Plano, TX', type: 'Purchase', opened: '2026-05-28', closed: '2026-07-21', cycle: 54, fees: 3455.00, officer: 'Travis Jones', agent: 'Corinne Vasquez' },
  { order: 'ORD-2026-1419', property: '5445 Ohio Dr, Frisco, TX', type: 'Purchase', opened: '2026-06-01', closed: '2026-07-20', cycle: 49, fees: 3372.60, officer: 'Marisol Tran', agent: 'Peter Einhorn' },
  { order: 'ORD-2026-1415', property: '1701 Custer Pkwy, Richardson, TX', type: 'Cash', opened: '2026-06-26', closed: '2026-07-17', cycle: 21, fees: 1875.00, officer: 'Dana Whitfield', agent: 'Desmond Blake' },
  { order: 'ORD-2026-1411', property: '2280 Rockbrook Dr, Lewisville, TX', type: 'Purchase', opened: '2026-05-30', closed: '2026-07-16', cycle: 47, fees: 3298.00, officer: 'Travis Jones', agent: 'Samantha Bee' },
  { order: 'ORD-2026-1407', property: '9010 Preston Rd, Frisco, TX', type: 'Commercial', opened: '2026-04-28', closed: '2026-07-15', cycle: 78, fees: 11200.00, officer: 'Marisol Tran', agent: 'Nathaniel Price' },
  { order: 'ORD-2026-1403', property: '740 Bethany Dr, Allen, TX', type: 'Purchase', opened: '2026-05-25', closed: '2026-07-14', cycle: 50, fees: 3180.25, officer: 'Dana Whitfield', agent: 'Corinne Vasquez' },
  { order: 'ORD-2026-1399', property: '1155 Parker Rd, Plano, TX', type: 'Refinance', opened: '2026-06-14', closed: '2026-07-13', cycle: 29, fees: 1395.00, officer: 'Travis Jones', agent: '—' },
  { order: 'ORD-2026-1395', property: '325 Wilmeth Rd, McKinney, TX', type: 'Purchase', opened: '2026-05-18', closed: '2026-07-10', cycle: 53, fees: 3540.00, officer: 'Marisol Tran', agent: 'Paula Aragone' },
  { order: 'ORD-2026-1391', property: '6620 Virginia Pkwy, McKinney, TX', type: 'Purchase', opened: '2026-05-22', closed: '2026-07-09', cycle: 48, fees: 3425.80, officer: 'Dana Whitfield', agent: 'Peter Einhorn' },
  { order: 'ORD-2026-1387', property: '4120 Spring Creek Pkwy, Plano, TX', type: 'Purchase', opened: '2026-05-14', closed: '2026-07-08', cycle: 55, fees: 3612.00, officer: 'Travis Jones', agent: 'Samantha Bee' }
];

/* Revenue by Office — the second built report. Derived from QZS_OFFICES so the
   office list can never disagree with Admin. */
const QZS_REPORT_OFFICE_REVENUE = {
  'plano': { orders: 61, revenue: 186420.00, avgFee: 3056.07 },
  'frisco': { orders: 34, revenue: 118955.00, avgFee: 3498.68 },
  'mckinney': { orders: 26, revenue: 71340.00, avgFee: 2743.85 },
  'allen': { orders: 15, revenue: 28145.00, avgFee: 1876.33 },
  'richardson': { orders: 6, revenue: 8000.00, avgFee: 1333.33 }
};

const QZS_REPORT_PRODUCTIVITY = [
  { user: 'Marisol Tran', role: 'Escrow Officer', touched: 48, tasks: 142, closings: 21, onTime: '96%' },
  { user: 'Dana Whitfield', role: 'Escrow Officer', touched: 44, tasks: 128, closings: 19, onTime: '93%' },
  { user: 'Travis Jones', role: 'Title Examiner', touched: 51, tasks: 117, closings: 17, onTime: '91%' },
  { user: 'Barbara Runolfsson', role: 'Accounting', touched: 33, tasks: 96, closings: 0, onTime: '99%' },
  { user: 'Lucas Adminton', role: 'Settlement Agent', touched: 62, tasks: 88, closings: 24, onTime: '88%' },
  { user: 'Training User', role: 'Virtual Assistant', touched: 12, tasks: 34, closings: 0, onTime: '100%' }
];


/* ============================================================================
   COMPLIANCE — exceptions, CPLs, wire verification, audit trail, ALTA.

   The first five exceptions are deliberately the same problems the curriculum
   teaches: the Schedule A legal-description mismatch (Lesson 3), the wire
   instruction change (Lesson 8), the missing HOA certificate (Lesson 7) and
   the expired payoff (Lesson 6). A trainee who worked those lessons should
   recognise their own files here, which is what makes the section feel like the
   same company rather than a separate demo.
   ============================================================================ */

const QZS_EXCEPTIONS = [
  { id: 'EX-3081', severity: 'High', order: 'ORD-2026-1483', property: '5445 Main Street, Frisco, TX', title: 'Legal description mismatch — Schedule A vs. purchase contract', opened: '2026-08-10', owner: 'Marisol Tran', status: 'Open',
    rule: 'TITLE-004 · Legal description on the order must match Schedule A of the commitment.',
    detail: 'The order records the property as Phase 1; Schedule A of commitment TX-2026-04471 shows Phase 2. A one-word difference can describe a different parcel, so nothing may be prepared from this description until it is confirmed.',
    docs: ['Title Commitment TX-2026-04471', 'Purchase Agreement'],
    history: [
      { date: '2026-08-10', by: 'System', text: 'Raised automatically on commitment import.' },
      { date: '2026-08-11', by: 'Marisol Tran', text: 'Escalated to supervisor. Awaiting examiner review of the recorded plat.' }
    ] },
  { id: 'EX-3080', severity: 'High', order: 'ORD-2026-1398', property: '219 Lakeshore Drive, McKinney, TX', title: 'Wire instructions changed after initial issuance — callback pending', opened: '2026-08-11', owner: 'Barbara Runolfsson', status: 'In Review',
    rule: 'WIRE-001 · Any change to disbursement instructions requires outbound callback verification.',
    detail: 'A second set of wiring instructions arrived by email for this file. Sender domain differs by one character from the settlement agent of record and the reply-to points at a third domain. Funds are frozen pending verbal verification against the number in the order file.',
    docs: ['Email — UPDATED Wire Instructions', 'Payoff Statement'],
    history: [
      { date: '2026-08-11', by: 'Training User', text: 'Reported as suspected business email compromise. Did not reply to the thread.' },
      { date: '2026-08-11', by: 'Barbara Runolfsson', text: 'Disbursement W-8841 held. Callback scheduled to the servicer number on the payoff statement.' }
    ] },
  { id: 'EX-3079', severity: 'Medium', order: 'ORD-2026-1512', property: '812 Birchwood Lane, Plano, TX', title: 'HOA resale certificate not received', opened: '2026-08-06', owner: 'Dana Whitfield', status: 'Open',
    rule: 'TITLE-011 · Schedule B-I requirements must be satisfied before the policy issues.',
    detail: 'Schedule B-I item 4 requires a resale certificate showing assessments current. Ridgeview quoted 7–10 business days on August 6. Closing prep is on hold behind it.',
    docs: ['Title Commitment TX-2026-04502'],
    history: [{ date: '2026-08-06', by: 'Dana Whitfield', text: 'Request logged with Ridgeview HOA Management.' }] },
  { id: 'EX-3078', severity: 'Medium', order: 'ORD-2026-1398', property: '219 Lakeshore Drive, McKinney, TX', title: 'Payoff statement expires before scheduled closing date', opened: '2026-08-09', owner: 'Dana Whitfield', status: 'Open',
    rule: 'ESCROW-007 · Payoff figures must be valid through the funding date.',
    detail: 'Summit Ridge payoff is good through August 10; closing is scheduled for August 25. Funding on the stale figure would short the payoff by fifteen days of per diem and the lien would not be released.',
    docs: ['Payoff Statement — Loan 8842-117093'],
    history: [{ date: '2026-08-09', by: 'System', text: 'Raised on closing-date change.' }] },
  { id: 'EX-3077', severity: 'Low', order: 'ORD-2026-1483', property: '5445 Main Street, Frisco, TX', title: 'Borrower phone number missing area code', opened: '2026-08-04', owner: 'Travis Jones', status: 'Resolved',
    rule: 'DATA-002 · Party contact fields must be complete before closing package generation.',
    detail: 'Buyer phone captured at intake without an area code. Corrected from the contact record.',
    docs: [],
    history: [{ date: '2026-08-05', by: 'Travis Jones', text: 'Corrected in Data Entry and verified against the purchase contract.' }] },
  { id: 'EX-3076', severity: 'High', order: 'ORD-2026-1512', property: '812 Birchwood Lane, Plano, TX', title: 'Abstract of judgment recorded against "E. Ruiz" — identity unconfirmed', opened: '2026-08-08', owner: 'Travis Jones', status: 'In Review',
    rule: 'TITLE-009 · Liens against a similarly-named party require identity affidavit before waiver.',
    detail: 'Instrument 2024-0091447 records a $12,480.00 judgment against "E. Ruiz". Nothing in the file establishes whether this is the seller. Requires client confirmation before the requirement can be cleared or disputed.',
    docs: ['Title Commitment TX-2026-04502'],
    history: [{ date: '2026-08-08', by: 'Travis Jones', text: 'Identity affidavit requested from the seller via the listing agent.' }] },
  { id: 'EX-3075', severity: 'Medium', order: 'ORD-2026-1471', property: '1820 Ridgehollow Dr, Plano, TX', title: 'Survey shows encroachment into rear utility easement', opened: '2026-07-28', owner: 'Marisol Tran', status: 'Resolved',
    rule: 'TITLE-006 · Survey exceptions must be resolved or expressly insured.',
    detail: 'Detached shed encroaches 2.4 ft into the ten-foot rear easement. Underwriter accepted with a survey exception endorsement.',
    docs: ['Survey — Precision Land Surveying'],
    history: [{ date: '2026-08-01', by: 'Marisol Tran', text: 'T-19 endorsement issued. Exception closed.' }] },
  { id: 'EX-3074', severity: 'Low', order: 'ORD-2026-1465', property: '2201 Greenville Ave, Dallas, TX', title: 'Vesting shows middle initial not present on tax roll', opened: '2026-07-26', owner: 'Dana Whitfield', status: 'Resolved',
    rule: 'TITLE-003 · Vesting variations must be reviewed before deed preparation.',
    detail: 'Tax roll abbreviates the middle initial. Confirmed as the same party; no instrument required.',
    docs: [],
    history: [{ date: '2026-07-27', by: 'Dana Whitfield', text: 'Reviewed and cleared — abbreviation only, not a vesting discrepancy.' }] },
  { id: 'EX-3073', severity: 'Medium', order: 'ORD-2026-1438', property: '215 Eldorado Pkwy, McKinney, TX', title: 'Entity good standing certificate expired', opened: '2026-07-20', owner: 'Travis Jones', status: 'Open',
    rule: 'TITLE-014 · Entity parties require current certificate of existence at closing.',
    detail: 'Certificate on file expired June 30, 2026. Reissued certificate requested from the Secretary of State.',
    docs: [],
    history: [{ date: '2026-07-20', by: 'Travis Jones', text: 'Reorder submitted.' }] },
  { id: 'EX-3072', severity: 'Low', order: 'ORD-2026-1459', property: '5580 Preston Meadow, Plano, TX', title: 'Recording fee estimate differs from county schedule', opened: '2026-07-18', owner: 'Barbara Runolfsson', status: 'Resolved',
    rule: 'ESCROW-011 · Estimated fees must reconcile to the published county schedule.',
    detail: 'Estimate used a prior-year page rate. Corrected before disbursement; no variance at closing.',
    docs: [],
    history: [{ date: '2026-07-19', by: 'Barbara Runolfsson', text: 'Corrected to current schedule.' }] },
  { id: 'EX-3071', severity: 'High', order: 'ORD-2026-1445', property: '110 Bloomdale Rd, McKinney, TX', title: 'CPL issued to a lender not named on the commitment', opened: '2026-07-15', owner: 'Marisol Tran', status: 'Resolved',
    rule: 'CPL-002 · A closing protection letter may only name the insured lender of record.',
    detail: 'CPL originally issued to the broker rather than the funding lender. Voided and reissued the same day.',
    docs: ['CPL-8841'],
    history: [{ date: '2026-07-15', by: 'Marisol Tran', text: 'Voided CPL-8841, reissued as CPL-8846 to the correct lender.' }] },
  { id: 'EX-3070', severity: 'Medium', order: 'ORD-2026-1434', property: '8801 Independence Pkwy, Plano, TX', title: 'Earnest money receipted to the wrong escrow account', opened: '2026-07-10', owner: 'Barbara Runolfsson', status: 'Resolved',
    rule: 'ESCROW-002 · Funds must be receipted to the account matching the order type.',
    detail: 'Residential earnest money deposited into the commercial trust account. Transferred same day with a corrected receipt.',
    docs: [],
    history: [{ date: '2026-07-10', by: 'Barbara Runolfsson', text: 'Transfer completed and both receipts annotated.' }] }
];

const QZS_CPLS = [
  { order: 'ORD-2026-1483', lender: 'Frisco Community Lending', cpl: 'CPL-9012', issued: '2026-07-02', expires: '2026-09-02', policy: "Owner's + Loan", jacket: 'OR-TX-448120', uw: 'Old Republic', status: 'Active' },
  { order: 'ORD-2026-1512', lender: 'Plano Trust Mortgage', cpl: 'CPL-9008', issued: '2026-06-18', expires: '2026-08-18', policy: "Owner's + Loan", jacket: 'OR-TX-447905', uw: 'Old Republic', status: 'Expiring' },
  { order: 'ORD-2026-1398', lender: 'Northgate Home Loans', cpl: 'CPL-9001', issued: '2026-05-14', expires: '2026-08-14', policy: "Owner's + Loan", jacket: 'FA-TX-113044', uw: 'First American', status: 'Expiring' },
  { order: 'ORD-2026-EXAM', lender: 'Cedar Point Lending', cpl: 'CPL-9015', issued: '2026-07-08', expires: '2026-09-08', policy: "Owner's + Loan", jacket: 'OR-TX-448377', uw: 'Old Republic', status: 'Active' },
  { order: 'ORD-2026-1471', lender: 'Collin County Savings', cpl: 'CPL-8998', issued: '2026-06-30', expires: '2026-08-30', policy: "Owner's", jacket: 'OR-TX-447712', uw: 'Old Republic', status: 'Active' },
  { order: 'ORD-2026-1468', lender: 'Frisco Community Lending', cpl: 'CPL-8994', issued: '2026-06-24', expires: '2026-08-24', policy: "Owner's + Loan", jacket: 'ST-TX-220814', uw: 'Stewart', status: 'Active' },
  { order: 'ORD-2026-1465', lender: '— (cash)', cpl: '—', issued: '2026-07-08', expires: '—', policy: "Owner's", jacket: 'OR-TX-448001', uw: 'Old Republic', status: 'Issued' },
  { order: 'ORD-2026-1462', lender: 'Collin County Savings', cpl: 'CPL-8989', issued: '2026-06-18', expires: '2026-08-18', policy: "Owner's + Loan", jacket: 'OR-TX-447688', uw: 'Old Republic', status: 'Expiring' },
  { order: 'ORD-2026-1459', lender: 'Plano Trust Mortgage', cpl: 'CPL-8985', issued: '2026-07-02', expires: '2026-09-02', policy: 'Loan', jacket: 'FA-TX-112990', uw: 'First American', status: 'Active' },
  { order: 'ORD-2026-1456', lender: '— (cash)', cpl: '—', issued: '2026-07-14', expires: '—', policy: "Owner's", jacket: 'OR-TX-448210', uw: 'Old Republic', status: 'Issued' },
  { order: 'ORD-2026-1452', lender: 'Frisco Community Lending', cpl: 'CPL-8977', issued: '2026-06-11', expires: '2026-08-11', policy: "Owner's + Loan", jacket: 'OR-TX-447501', uw: 'Old Republic', status: 'Expired' },
  { order: 'ORD-2026-1449', lender: 'Collin County Savings', cpl: 'CPL-8972', issued: '2026-06-28', expires: '2026-08-28', policy: 'Loan', jacket: 'ST-TX-220660', uw: 'Stewart', status: 'Active' },
  { order: 'ORD-2026-1445', lender: 'Northgate Home Loans', cpl: 'CPL-8846', issued: '2026-07-15', expires: '2026-09-15', policy: "Owner's + Loan", jacket: 'FA-TX-113101', uw: 'First American', status: 'Active' },
  { order: 'ORD-2026-1441', lender: 'Plano Trust Mortgage', cpl: 'CPL-8961', issued: '2026-06-16', expires: '2026-08-16', policy: "Owner's + Loan", jacket: 'OR-TX-447440', uw: 'Old Republic', status: 'Expiring' },
  { order: 'ORD-2026-1438', lender: 'Comerica Commercial', cpl: 'CPL-8955', issued: '2026-05-20', expires: '2026-08-20', policy: 'Commercial Loan', jacket: 'FA-TX-112801', uw: 'First American', status: 'Active' },
  { order: 'ORD-2026-1434', lender: 'Frisco Community Lending', cpl: 'CPL-8950', issued: '2026-06-09', expires: '2026-08-09', policy: "Owner's + Loan", jacket: 'OR-TX-447320', uw: 'Old Republic', status: 'Expired' },
  { order: 'ORD-2026-1430', lender: 'Collin County Savings', cpl: 'CPL-8944', issued: '2026-06-02', expires: '2026-09-02', policy: "Owner's + Loan", jacket: 'ST-TX-220512', uw: 'Stewart', status: 'Active' },
  { order: 'ORD-2026-1427', lender: 'Plano Trust Mortgage', cpl: 'CPL-8938', issued: '2026-06-22', expires: '2026-08-22', policy: 'Loan', jacket: 'OR-TX-447255', uw: 'Old Republic', status: 'Active' },
  { order: 'ORD-2026-1423', lender: 'Northgate Home Loans', cpl: 'CPL-8931', issued: '2026-05-28', expires: '2026-08-28', policy: "Owner's + Loan", jacket: 'FA-TX-112700', uw: 'First American', status: 'Active' },
  { order: 'ORD-2026-1419', lender: 'Frisco Community Lending', cpl: 'CPL-8925', issued: '2026-06-01', expires: '2026-09-01', policy: "Owner's + Loan", jacket: 'OR-TX-447180', uw: 'Old Republic', status: 'Active' }
];

const QZS_WIRE_LOG = [
  { date: '2026-08-11', order: 'ORD-2026-1398', party: 'Summit Ridge Mortgage Servicing', kind: 'Payoff remittance', method: 'Outbound call — number on payoff statement', by: 'Barbara Runolfsson', result: 'Pending' },
  { date: '2026-08-11', order: 'ORD-2026-1398', party: 'Sender claiming to be Lucas Adminton', kind: 'Disbursement change', method: 'Outbound call — number in email', by: 'Training User', result: 'Failed' },
  { date: '2026-08-10', order: 'ORD-2026-1483', party: 'Jon Smith', kind: 'Buyer cash to close', method: 'Outbound call — number of record', by: 'Marisol Tran', result: 'Verified' },
  { date: '2026-08-10', order: 'ORD-2026-1512', party: 'Plano Trust Mortgage', kind: 'Loan funding', method: 'Secure lender portal', by: 'Barbara Runolfsson', result: 'Verified' },
  { date: '2026-08-08', order: 'ORD-2026-1398', party: 'Priya Natarajan', kind: 'Buyer cash to close', method: 'Outbound call — number of record', by: 'Marisol Tran', result: 'Verified' },
  { date: '2026-08-08', order: 'ORD-2026-EXAM', party: 'Cedar Point Lending', kind: 'Loan funding', method: 'Secure lender portal', by: 'Barbara Runolfsson', result: 'Verified' },
  { date: '2026-08-07', order: 'ORD-2026-1483', party: 'Frisco Community Lending', kind: 'Loan funding', method: 'Secure lender portal', by: 'Barbara Runolfsson', result: 'Verified' },
  { date: '2026-08-07', order: 'ORD-2026-1512', party: 'Elena Ruiz', kind: 'Seller proceeds', method: 'Outbound call — number of record', by: 'Dana Whitfield', result: 'Verified' },
  { date: '2026-08-06', order: 'ORD-2026-1471', party: 'Collin County Savings', kind: 'Loan funding', method: 'Secure lender portal', by: 'Barbara Runolfsson', result: 'Verified' },
  { date: '2026-08-06', order: 'ORD-2026-1465', party: 'Jarrett Nakamura', kind: 'Buyer cash to close', method: 'Outbound call — number of record', by: 'Travis Jones', result: 'Verified' },
  { date: '2026-08-05', order: 'ORD-2026-1462', party: 'Rowan Mikkelsen', kind: 'Seller proceeds', method: 'In-person at signing', by: 'Travis Jones', result: 'Verified' },
  { date: '2026-08-05', order: 'ORD-2026-1459', party: 'Plano Trust Mortgage', kind: 'Loan funding', method: 'Secure lender portal', by: 'Barbara Runolfsson', result: 'Verified' },
  { date: '2026-08-04', order: 'ORD-2026-1456', party: 'Imani Okafor', kind: 'Buyer cash to close', method: 'Outbound call — number of record', by: 'Marisol Tran', result: 'Verified' },
  { date: '2026-08-04', order: 'ORD-2026-1452', party: 'Frisco Community Lending', kind: 'Loan funding', method: 'Secure lender portal', by: 'Barbara Runolfsson', result: 'Verified' },
  { date: '2026-08-03', order: 'ORD-2026-1449', party: 'Collin County Savings', kind: 'Payoff remittance', method: 'Outbound call — number on payoff statement', by: 'Dana Whitfield', result: 'Verified' },
  { date: '2026-07-31', order: 'ORD-2026-1445', party: 'Northgate Home Loans', kind: 'Loan funding', method: 'Secure lender portal', by: 'Barbara Runolfsson', result: 'Verified' },
  { date: '2026-07-30', order: 'ORD-2026-1441', party: 'Plano Trust Mortgage', kind: 'Loan funding', method: 'Secure lender portal', by: 'Barbara Runolfsson', result: 'Verified' },
  { date: '2026-07-29', order: 'ORD-2026-1438', party: 'Comerica Commercial', kind: 'Commercial funding', method: 'Outbound call — number of record', by: 'Marisol Tran', result: 'Verified' },
  { date: '2026-07-28', order: 'ORD-2026-1434', party: 'Frisco Community Lending', kind: 'Loan funding', method: 'Secure lender portal', by: 'Barbara Runolfsson', result: 'Verified' },
  { date: '2026-07-27', order: 'ORD-2026-1430', party: 'Collin County Savings', kind: 'Loan funding', method: 'Secure lender portal', by: 'Barbara Runolfsson', result: 'Verified' },
  { date: '2026-07-24', order: 'ORD-2026-1427', party: 'Plano Trust Mortgage', kind: 'Payoff remittance', method: 'Outbound call — number on payoff statement', by: 'Dana Whitfield', result: 'Verified' },
  { date: '2026-07-23', order: 'ORD-2026-1423', party: 'Northgate Home Loans', kind: 'Loan funding', method: 'Secure lender portal', by: 'Barbara Runolfsson', result: 'Verified' },
  { date: '2026-07-22', order: 'ORD-2026-1419', party: 'Tanya R. Hart', kind: 'Seller proceeds', method: 'Outbound call — number of record', by: 'Marisol Tran', result: 'Verified' },
  { date: '2026-07-21', order: 'ORD-2026-1415', party: 'Desmond Blake', kind: 'Commission disbursement', method: 'Outbound call — number of record', by: 'Travis Jones', result: 'Verified' },
  { date: '2026-07-20', order: 'ORD-2026-1411', party: 'Frisco Community Lending', kind: 'Loan funding', method: 'Secure lender portal', by: 'Barbara Runolfsson', result: 'Verified' }
];

const QZS_AUDIT = [
  { ts: '2026-08-12 09:14:22', user: 'Training User', action: 'VIEW', object: 'Report — Order Volume', order: '—', ip: '198.51.100.24' },
  { ts: '2026-08-12 09:11:08', user: 'Barbara Runolfsson', action: 'HOLD', object: 'Disbursement W-8841', order: 'ORD-2026-1398', ip: '203.0.113.11' },
  { ts: '2026-08-12 08:57:41', user: 'Training User', action: 'CREATE', object: 'Exception EX-3080', order: 'ORD-2026-1398', ip: '198.51.100.24' },
  { ts: '2026-08-12 08:52:19', user: 'Training User', action: 'VIEW', object: 'Email — UPDATED Wire Instructions', order: 'ORD-2026-1398', ip: '198.51.100.24' },
  { ts: '2026-08-12 08:40:03', user: 'Marisol Tran', action: 'UPDATE', object: 'Contact — Jon Smith', order: 'ORD-2026-1483', ip: '203.0.113.8' },
  { ts: '2026-08-12 08:31:55', user: 'Dana Whitfield', action: 'VIEW', object: 'Title Commitment TX-2026-04502', order: 'ORD-2026-1512', ip: '203.0.113.9' },
  { ts: '2026-08-11 17:22:10', user: 'Barbara Runolfsson', action: 'SEND', object: 'Positive Pay file PPAY_20260811', order: '—', ip: '203.0.113.11' },
  { ts: '2026-08-11 16:48:37', user: 'Marisol Tran', action: 'ISSUE', object: 'Check CK-10441', order: 'ORD-2026-1483', ip: '203.0.113.8' },
  { ts: '2026-08-11 15:30:02', user: 'Travis Jones', action: 'UPDATE', object: 'Exception EX-3076', order: 'ORD-2026-1512', ip: '203.0.113.14' },
  { ts: '2026-08-11 14:12:44', user: 'Marisol Tran', action: 'ESCALATE', object: 'Exception EX-3081', order: 'ORD-2026-1483', ip: '203.0.113.8' },
  { ts: '2026-08-11 11:05:19', user: 'Dana Whitfield', action: 'VIEW', object: 'Payoff Statement 8842-117093', order: 'ORD-2026-1398', ip: '203.0.113.9' },
  { ts: '2026-08-11 10:41:58', user: 'Barbara Runolfsson', action: 'RECEIPT', object: 'Receipt R-24116', order: 'ORD-2026-1483', ip: '203.0.113.11' },
  { ts: '2026-08-11 09:58:26', user: 'Lucas Adminton', action: 'APPROVE', object: 'Disbursement W-8840', order: 'ORD-2026-1483', ip: '203.0.113.5' },
  { ts: '2026-08-11 09:12:03', user: 'Travis Jones', action: 'LOGIN', object: 'Session', order: '—', ip: '203.0.113.14' },
  { ts: '2026-08-10 16:55:47', user: 'Marisol Tran', action: 'ISSUE', object: 'CPL-9012', order: 'ORD-2026-1483', ip: '203.0.113.8' },
  { ts: '2026-08-10 15:33:12', user: 'Barbara Runolfsson', action: 'VERIFY', object: 'Wire instructions — Jon Smith', order: 'ORD-2026-1483', ip: '203.0.113.11' },
  { ts: '2026-08-10 14:20:39', user: 'Dana Whitfield', action: 'UPDATE', object: 'Order stage', order: 'ORD-2026-1512', ip: '203.0.113.9' },
  { ts: '2026-08-10 11:47:05', user: 'Marisol Tran', action: 'CREATE', object: 'Exception EX-3081', order: 'ORD-2026-1483', ip: '203.0.113.8' },
  { ts: '2026-08-10 10:15:52', user: 'Barbara Runolfsson', action: 'RECEIPT', object: 'Receipt R-24113', order: 'ORD-2026-1483', ip: '203.0.113.11' },
  { ts: '2026-08-10 08:44:31', user: 'Lucas Adminton', action: 'LOGIN', object: 'Session', order: '—', ip: '203.0.113.5' },
  { ts: '2026-08-08 16:38:14', user: 'Travis Jones', action: 'CREATE', object: 'Exception EX-3076', order: 'ORD-2026-1512', ip: '203.0.113.14' },
  { ts: '2026-08-08 15:02:57', user: 'Barbara Runolfsson', action: 'VERIFY', object: 'Wire instructions — Cedar Point Lending', order: 'ORD-2026-EXAM', ip: '203.0.113.11' },
  { ts: '2026-08-08 13:29:40', user: 'Marisol Tran', action: 'VIEW', object: 'Source Deed', order: 'ORD-2026-1483', ip: '203.0.113.8' },
  { ts: '2026-08-08 11:11:23', user: 'Dana Whitfield', action: 'SEND', object: 'Reminder — Ridgeview HOA', order: 'ORD-2026-1512', ip: '203.0.113.9' },
  { ts: '2026-08-08 09:05:06', user: 'Training User', action: 'LOGIN', object: 'Session', order: '—', ip: '198.51.100.24' },
  { ts: '2026-08-07 17:44:52', user: 'Barbara Runolfsson', action: 'ISSUE', object: 'Wire W-8838', order: 'ORD-2026-1483', ip: '203.0.113.11' },
  { ts: '2026-08-07 16:20:35', user: 'Marisol Tran', action: 'UPDATE', object: 'Contact — Ridgeview HOA Management', order: 'ORD-2026-1512', ip: '203.0.113.8' },
  { ts: '2026-08-07 14:03:18', user: 'Travis Jones', action: 'VIEW', object: 'Survey — Precision Land Surveying', order: 'ORD-2026-1512', ip: '203.0.113.14' },
  { ts: '2026-08-07 10:36:01', user: 'Lucas Adminton', action: 'APPROVE', object: 'Disbursement CK-10436', order: 'ORD-2026-1512', ip: '203.0.113.5' },
  { ts: '2026-08-06 16:58:44', user: 'Barbara Runolfsson', action: 'HOLD', object: 'Receipt R-24108', order: 'ORD-2026-1398', ip: '203.0.113.11' },
  { ts: '2026-08-06 15:12:27', user: 'Dana Whitfield', action: 'CREATE', object: 'Exception EX-3079', order: 'ORD-2026-1512', ip: '203.0.113.9' },
  { ts: '2026-08-06 12:40:10', user: 'Marisol Tran', action: 'ISSUE', object: 'Check CK-10435', order: 'ORD-2026-1398', ip: '203.0.113.8' },
  { ts: '2026-08-06 09:22:53', user: 'Dana Whitfield', action: 'LOGIN', object: 'Session', order: '—', ip: '203.0.113.9' },
  { ts: '2026-08-05 17:15:36', user: 'Barbara Runolfsson', action: 'VOID', object: 'Check CK-10433', order: 'ORD-2026-1483', ip: '203.0.113.11' },
  { ts: '2026-08-05 14:48:19', user: 'Travis Jones', action: 'UPDATE', object: 'Task 5', order: 'ORD-2026-1512', ip: '203.0.113.14' },
  { ts: '2026-08-05 11:33:02', user: 'Marisol Tran', action: 'VIEW', object: 'Loan Estimate', order: 'ORD-2026-1483', ip: '203.0.113.8' },
  { ts: '2026-08-04 16:07:45', user: 'Travis Jones', action: 'RESOLVE', object: 'Exception EX-3077', order: 'ORD-2026-1483', ip: '203.0.113.14' },
  { ts: '2026-08-04 13:51:28', user: 'Barbara Runolfsson', action: 'RECEIPT', object: 'Receipt R-24104', order: 'ORD-2026-1512', ip: '203.0.113.11' },
  { ts: '2026-08-04 10:24:11', user: 'Lucas Adminton', action: 'VIEW', object: 'Order summary', order: 'ORD-2026-1398', ip: '203.0.113.5' },
  { ts: '2026-08-03 16:40:54', user: 'Marisol Tran', action: 'ISSUE', object: 'Check CK-10431', order: 'ORD-2026-1483', ip: '203.0.113.8' }
];

const QZS_ALTA = [
  { n: 1, name: 'Licensing', desc: 'Establish and maintain current license and registration for the agency and its staff.', pct: 100, status: 'Compliant' },
  { n: 2, name: 'Escrow Trust Accounting', desc: 'Adopt appropriate escrow controls and perform monthly three-way reconciliation.', pct: 84, status: 'Needs Review' },
  { n: 3, name: 'Privacy & Information Security', desc: 'Protect non-public personal information and control access to it.', pct: 92, status: 'Compliant' },
  { n: 4, name: 'Settlement Processes', desc: 'Adopt standard procedures for recording documents and pricing settlement services.', pct: 96, status: 'Compliant' },
  { n: 5, name: 'Title Policy Production', desc: 'Issue and deliver policies promptly, and remit premiums to the underwriter on schedule.', pct: 88, status: 'Needs Review' },
  { n: 6, name: 'Insurance Coverage', desc: 'Maintain professional liability and fidelity coverage appropriate to the business.', pct: 100, status: 'Compliant' },
  { n: 7, name: 'Consumer Complaints', desc: 'Maintain a written procedure for receiving and resolving consumer complaints.', pct: 71, status: 'Action Required' }
];


/* ============================================================================
   ADMIN — agency configuration. Every control in this section is disabled by
   design: it exists so a VA recognises the screens, not so a demo can change
   settings that nothing would honour anyway.
   ============================================================================ */

const QZS_ROLES = ['Administrator', 'Escrow Officer', 'Title Examiner', 'Closer', 'Processor', 'Accounting', 'Virtual Assistant', 'Read Only'];

const QZS_USERS = [
  { name: 'Lucas Adminton', email: 'ladminton@bestclosing.com', role: 'Administrator', office: 'Plano', status: 'Active', login: '2026-08-12 08:31', mfa: true },
  { name: 'Marisol Tran', email: 'mtran@bestclosing.com', role: 'Escrow Officer', office: 'Plano', status: 'Active', login: '2026-08-12 08:40', mfa: true },
  { name: 'Dana Whitfield', email: 'dwhitfield@bestclosing.com', role: 'Escrow Officer', office: 'Frisco', status: 'Active', login: '2026-08-12 08:22', mfa: true },
  { name: 'Travis Jones', email: 'tjones@bestclosing.com', role: 'Title Examiner', office: 'Plano', status: 'Active', login: '2026-08-11 09:12', mfa: true },
  { name: 'Barbara Runolfsson', email: 'brunolfsson@bestclosing.com', role: 'Accounting', office: 'Plano', status: 'Active', login: '2026-08-12 07:58', mfa: true },
  { name: 'Charles Ryan', email: 'cryan@bestclosing.com', role: 'Closer', office: 'McKinney', status: 'Active', login: '2026-08-11 16:44', mfa: true },
  { name: 'Logan Hill', email: 'lhill@bestclosing.com', role: 'Closer', office: 'Frisco', status: 'Active', login: '2026-08-11 15:02', mfa: false },
  { name: 'Taylor Heaney', email: 'theaney@bestclosing.com', role: 'Processor', office: 'Plano', status: 'Active', login: '2026-08-12 08:05', mfa: true },
  { name: 'Daniel Stehr', email: 'dstehr@bestclosing.com', role: 'Processor', office: 'Allen', status: 'Active', login: '2026-08-10 14:37', mfa: true },
  { name: 'Jack Lukic', email: 'jlukic@bestclosing.com', role: 'Title Examiner', office: 'McKinney', status: 'Active', login: '2026-08-12 09:01', mfa: true },
  { name: 'Priyanka Raman', email: 'praman@bestclosing.com', role: 'Escrow Officer', office: 'McKinney', status: 'Active', login: '2026-08-11 11:20', mfa: true },
  { name: 'Owen Castellanos', email: 'ocastellanos@bestclosing.com', role: 'Processor', office: 'Frisco', status: 'Active', login: '2026-08-08 16:15', mfa: false },
  { name: 'Training User', email: 'va.trainee@skillcloud.demo', role: 'Virtual Assistant', office: 'Plano', status: 'Active', login: '2026-08-12 09:14', mfa: true },
  { name: 'Sofia Alvarado', email: 'salvarado@bestclosing.com', role: 'Virtual Assistant', office: 'Plano', status: 'Active', login: '2026-08-11 10:48', mfa: true },
  { name: 'Nathan Whitlock', email: 'nwhitlock@bestclosing.com', role: 'Read Only', office: 'Allen', status: 'Active', login: '2026-07-29 13:05', mfa: false },
  { name: 'Reconciliation User', email: 'recon@bestclosing.com', role: 'Accounting', office: 'Plano', status: 'Active', login: '2026-08-01 06:00', mfa: true },
  { name: 'Imelda Ferraro', email: 'iferraro@bestclosing.com', role: 'Escrow Officer', office: 'Richardson', status: 'Invited', login: '—', mfa: false },
  { name: 'Grant Mosley', email: 'gmosley@bestclosing.com', role: 'Closer', office: 'Frisco', status: 'Disabled', login: '2026-05-14 09:31', mfa: false }
];

/* Permission matrix. Rows are capabilities, columns are the roles above; the VA
   row is the one the course cares about — read broadly, write almost nowhere. */
const QZS_PERMISSIONS = [
  { name: 'View Orders',       allow: ['Administrator', 'Escrow Officer', 'Title Examiner', 'Closer', 'Processor', 'Accounting', 'Virtual Assistant', 'Read Only'] },
  { name: 'Edit Orders',       allow: ['Administrator', 'Escrow Officer', 'Title Examiner', 'Closer', 'Processor', 'Virtual Assistant'] },
  { name: 'Delete Orders',     allow: ['Administrator'] },
  { name: 'Issue CPL',         allow: ['Administrator', 'Escrow Officer', 'Title Examiner'] },
  { name: 'Disburse Funds',    allow: ['Administrator', 'Accounting'] },
  { name: 'Reconcile Accounts',allow: ['Administrator', 'Accounting'] },
  { name: 'Manage Users',      allow: ['Administrator'] },
  { name: 'View Reports',      allow: ['Administrator', 'Escrow Officer', 'Accounting', 'Virtual Assistant', 'Read Only'] },
  { name: 'Export Data',       allow: ['Administrator', 'Accounting'] },
  { name: 'Access Audit Log',  allow: ['Administrator', 'Accounting'] }
];

const QZS_TEMPLATES = {
  order: [
    { name: 'Residential Purchase — TX', desc: 'Standard resale purchase with lender, survey and HOA steps.', count: '18 fields', by: 'Lucas Adminton', on: '2026-06-14', status: 'Active' },
    { name: 'Residential Refinance — TX', desc: 'Refinance intake with payoff ordering built in.', count: '14 fields', by: 'Marisol Tran', on: '2026-05-30', status: 'Active' },
    { name: 'Cash Purchase — TX', desc: 'No lender package; proof of funds instead of loan docs.', count: '11 fields', by: 'Lucas Adminton', on: '2026-04-02', status: 'Active' },
    { name: 'Commercial Purchase', desc: 'Entity parties, extended coverage and survey review.', count: '26 fields', by: 'Travis Jones', on: '2026-07-21', status: 'Draft' }
  ],
  workflow: [
    { name: 'Purchase — Standard Milestones', desc: 'Opened, Title Processing, Closing Prep, Closing, Post-Closing.', count: '9 steps', by: 'Lucas Adminton', on: '2026-03-11', status: 'Active' },
    { name: 'Refinance — Short Cycle', desc: 'Compressed milestones for refinances without a survey.', count: '6 steps', by: 'Dana Whitfield', on: '2026-05-08', status: 'Active' },
    { name: 'Commercial — Extended Review', desc: 'Adds entity verification and underwriter approval gates.', count: '13 steps', by: 'Travis Jones', on: '2026-07-19', status: 'Draft' }
  ],
  document: [
    { name: 'Settlement Statement (ALTA)', desc: 'ALTA combined settlement statement for purchase files.', count: '4 pages', by: 'Barbara Runolfsson', on: '2026-02-27', status: 'Active' },
    { name: 'Seller Proceeds Letter', desc: 'Disbursement summary sent with seller wire confirmation.', count: '1 page', by: 'Marisol Tran', on: '2026-06-03', status: 'Active' },
    { name: 'Closing Instruction Cover', desc: 'Cover sheet for lender closing instruction packages.', count: '2 pages', by: 'Charles Ryan', on: '2026-01-16', status: 'Active' }
  ]
};

const QZS_FEES = [
  { name: 'Settlement or Closing Fee', type: 'Settlement', basis: 'Flat', amount: '$595.00', applies: 'Residential purchase', from: '2026-01-01' },
  { name: 'Title Search', type: 'Title', basis: 'Flat', amount: '$175.00', applies: 'All order types', from: '2026-01-01' },
  { name: 'Examination Fee', type: 'Title', basis: 'Flat', amount: '$150.00', applies: 'All order types', from: '2026-01-01' },
  { name: "Owner's Policy Premium", type: 'Title', basis: 'Rate', amount: '0.57% of sale price', applies: 'Purchase', from: '2026-01-01' },
  { name: "Lender's Policy Premium", type: 'Title', basis: 'Rate', amount: '$100.00 simultaneous issue', applies: 'Purchase with loan', from: '2026-01-01' },
  { name: 'Endorsements (T-19, T-30)', type: 'Title', basis: 'Rate', amount: '5% of basic premium', applies: 'As requested', from: '2026-01-01' },
  { name: 'Recording Fees', type: 'Pass-through', basis: 'Per page', amount: 'County schedule', applies: 'All order types', from: '2026-01-01' },
  { name: 'Wire Fee', type: 'Escrow', basis: 'Flat', amount: '$25.00', applies: 'Per outgoing wire', from: '2026-03-01' },
  { name: 'Courier / Overnight', type: 'Pass-through', basis: 'Flat', amount: '$38.00', applies: 'As incurred', from: '2026-03-01' }
];

const QZS_INTEGRATIONS = [
  { name: 'First American', cat: 'Underwriter', desc: 'Policy jackets, rate calculation and remittance.', on: true },
  { name: 'Old Republic', cat: 'Underwriter', desc: 'Policy jackets, rate calculation and remittance.', on: true },
  { name: 'Stewart Title', cat: 'Underwriter', desc: 'Policy jackets and CPL issuance.', on: true },
  { name: 'Simplifile', cat: 'e-Recording', desc: 'Electronic submission to county recorders.', on: true },
  { name: 'CSC eRecording', cat: 'e-Recording', desc: 'Alternate e-recording network for out-of-county filings.', on: false },
  { name: 'Payoff Exchange', cat: 'Payoffs', desc: 'Automated payoff ordering and status tracking.', on: true },
  { name: 'DocuSign', cat: 'e-Signature', desc: 'Send and track signature envelopes from the order.', on: true },
  { name: 'Notary Scheduling', cat: 'Vendors', desc: 'Mobile and remote online notary dispatch.', on: true },
  { name: 'Bank Feed / Positive Pay', cat: 'Banking', desc: 'Daily balance feed and issued-item transmission.', on: true },
  { name: 'MLS Data', cat: 'Data', desc: 'Property and listing lookup at order intake.', on: false },
  { name: 'QuickBooks', cat: 'Accounting', desc: 'Sync operating-account revenue to the general ledger.', on: false },
  { name: 'Qualia Marketplace', cat: 'Vendors', desc: 'Order surveys, inspections and HOA documents in-app.', on: true }
];

const QZS_NOTIFICATIONS = [
  { event: 'Order assigned to me', email: true, app: true, sms: false },
  { event: 'Document uploaded to an order I follow', email: true, app: true, sms: false },
  { event: 'Task due within 24 hours', email: true, app: true, sms: true },
  { event: 'Task overdue', email: true, app: true, sms: true },
  { event: 'Exception raised on my order', email: true, app: true, sms: true },
  { event: 'Wire instructions changed', email: true, app: true, sms: true },
  { event: 'Disbursement pending my approval', email: true, app: true, sms: false },
  { event: 'Reconciliation completed', email: false, app: true, sms: false },
  { event: 'Closing date changed', email: true, app: true, sms: false },
  { event: 'Weekly production summary', email: true, app: false, sms: false }
];

const QZS_SECURITY = [
  { label: 'Minimum password length', value: '12 characters' },
  { label: 'Password rotation', value: 'Every 90 days' },
  { label: 'Multi-factor authentication', value: 'Required for all roles' },
  { label: 'Session timeout', value: '30 minutes of inactivity' },
  { label: 'IP allowlist', value: '203.0.113.0/24, 198.51.100.0/24' },
  { label: 'Single sign-on (SSO)', value: 'SAML 2.0 — Okta' },
  { label: 'Audit log retention', value: '7 years' },
  { label: 'NPI data retention', value: 'Purged 5 years after file close' }
];
