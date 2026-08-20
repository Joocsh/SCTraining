/* ============================================================================
   DOCUSIGN SIMULATOR — FICTIONAL ACCOUNT CATALOGUE
   ============================================================================

   What this is
   ------------
   Every piece of product data the DocuSign simulator displays that is NOT part
   of the graded curriculum: background envelopes, users, templates, bulk sends,
   PowerForms, settings, notifications. It exists so the account looks like an
   account. A transaction coordinator in August 2026 does not have five
   envelopes, and an empty Drafts screen breaks the illusion faster than any
   misplaced pixel.

   Why it is a separate file
   -------------------------
   docusign-data.js is frozen: it carries the 10 lessons, the scenarios and the
   exam bank, and everything in it is graded. docusign-app.js is view logic.
   Neither is the right home for a catalogue, so this is the third file, loaded
   between them. Every symbol is prefixed DS_S so it can never be mistaken for
   the DS_ curriculum data.

   Read-only, always
   -----------------
   Nothing here is mutable state. What a visitor creates or edits lives in
   dsDemo as an override on top of this, which is what makes F5 wipe their work
   while leaving the account intact. If mutable state ever leaks into this file,
   reloading stops cleaning up and the next visitor inherits the last one's mess.

   The four coherence rules this file exists to satisfy
   ----------------------------------------------------
   R1  Derive, never type. No literal KPIs anywhere. If a number can be counted
       from the envelopes, it is counted at render time.
   R2  Cross-references are real. Every name on two screens is one person. Every
       envelope id a notification cites exists. Every template a bulk send names
       exists. No orphans.
   R3  Absolute determinism. Not one Math.random(). The account must be byte-for-
       byte identical on every load, or screenshots drift and an envelope's
       history rewrites itself on every repaint. Variation comes from a seeded
       PRNG keyed on stable ids.
   R4  Everything is anchored to DS_TODAY. No loose literal dates — in three
       months a hard-coded account reads as abandoned. Dates are day offsets,
       resolved at load.
   ============================================================================ */


/* ---------- Deterministic randomness ----------
   Local copies of the FNV-1a + mulberry32 pair that docusign-app.js also uses.
   Duplicated rather than shared because this file loads first, and a catalogue
   that depends on load order is a catalogue that breaks the day someone
   reorders two script tags. */
function dsSHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function dsSRand(seed) {
  let a = (typeof seed === 'string' ? dsSHash(seed) : seed) >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Dates ----------
   Everything is expressed as "days before DS_TODAY" so the account ages with
   the fixture date instead of rotting against it. */
const DS_S_EPOCH = (function () {
  const [y, m, d] = DS_TODAY.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
})();

/* Negative offset = in the past. dsSDay(-30) is thirty days before DS_TODAY. */
function dsSDay(offset) {
  return new Date(DS_S_EPOCH + offset * 86400000).toISOString().slice(0, 10);
}
/* Same, with a time component, for audit timestamps and sign-in logs. */
function dsSStamp(offset, hour, minute) {
  const t = new Date(DS_S_EPOCH + offset * 86400000);
  t.setUTCHours(hour || 9, minute || 0, 0, 0);
  return t.toISOString().slice(0, 16).replace('T', ' ');
}


/* ============================================================================
   PEOPLE
   ============================================================================ */

/* The six senders. Until now every envelope in the account came from Alex
   Rivera, which left the "Sender" filter pill with nothing to filter.

   Note the deliberate consequence: the Sent quick view matches /alex|va/i, so
   envelopes from the other five land in Inbox rather than Sent. That is correct
   — they were sent to this account, not by it — and it is what finally gives
   Inbox and Sent different contents. */
const DS_S_SENDERS = [
  'Alex Rivera (VA)',
  'Dana Whitfield',
  'Priya Raman',
  'Marcus Lee',
  'Jordan Ellis',
  'Sofia Marchetti'
];

/* Account users. envelopesSent is a plausible lifetime figure shown in Settings;
   it is not used for any KPI, which is always counted from the envelopes. */
const DS_S_USERS = [
  { name: 'Alex Rivera',      email: 'alex.rivera@agency.example.com',      permissionProfile: 'Account Administrator', status: 'Active',  lastSignIn: dsSStamp(0, 8, 41),   group: 'Transaction Coordinators', envelopesSent: 412 },
  { name: 'Dana Whitfield',   email: 'dana.whitfield@agency.example.com',   permissionProfile: 'DS Admin',              status: 'Active',  lastSignIn: dsSStamp(0, 7, 55),   group: 'Escrow',                   envelopesSent: 388 },
  { name: 'Priya Raman',      email: 'priya.raman@agency.example.com',      permissionProfile: 'Sender',                status: 'Active',  lastSignIn: dsSStamp(-1, 16, 20), group: 'Transaction Coordinators', envelopesSent: 271 },
  { name: 'Marcus Lee',       email: 'marcus.lee@agency.example.com',       permissionProfile: 'Viewer',                status: 'Active',  lastSignIn: dsSStamp(-3, 11, 4),  group: 'Executive',                envelopesSent: 34 },
  { name: 'Jordan Ellis',     email: 'jordan.ellis@agency.example.com',     permissionProfile: 'Sender',                status: 'Active',  lastSignIn: dsSStamp(-2, 9, 12),  group: 'Listing Agents',           envelopesSent: 196 },
  { name: 'Sofia Marchetti',  email: 'sofia.marchetti@agency.example.com',  permissionProfile: 'Sender',                status: 'Active',  lastSignIn: dsSStamp(-1, 13, 47), group: 'Listing Agents',           envelopesSent: 158 },
  { name: 'Nathan Cole',      email: 'nathan.cole@agency.example.com',      permissionProfile: 'Sender',                status: 'Active',  lastSignIn: dsSStamp(-5, 10, 2),  group: 'Escrow',                   envelopesSent: 91 },
  { name: 'Hana Yoshida',     email: 'hana.yoshida@agency.example.com',     permissionProfile: 'Signing Group Manager', status: 'Active',  lastSignIn: dsSStamp(-4, 15, 33), group: 'Compliance',               envelopesSent: 63 },
  { name: 'Terrence Boyd',    email: 'terrence.boyd@agency.example.com',    permissionProfile: 'Sender',                status: 'Active',  lastSignIn: dsSStamp(-8, 8, 19),  group: 'Transaction Coordinators', envelopesSent: 147 },
  { name: 'Camille Duarte',   email: 'camille.duarte@agency.example.com',   permissionProfile: 'Viewer',                status: 'Active',  lastSignIn: dsSStamp(-11, 14, 8), group: 'Compliance',               envelopesSent: 12 },
  { name: 'Ravi Anand',       email: 'ravi.anand@agency.example.com',       permissionProfile: 'Read Only',             status: 'Active',  lastSignIn: dsSStamp(-19, 9, 51), group: 'Executive',                envelopesSent: 0 },
  { name: 'Bianca Ortiz',     email: 'bianca.ortiz@agency.example.com',     permissionProfile: 'Sender',                status: 'Pending', lastSignIn: null,                 group: 'Listing Agents',           envelopesSent: 0 },
  { name: 'Colin Mbeki',      email: 'colin.mbeki@agency.example.com',      permissionProfile: 'Sender',                status: 'Pending', lastSignIn: null,                 group: 'Contractors',              envelopesSent: 0 },
  { name: 'Casey Nolan',      email: 'casey.nolan@agency.example.com',      permissionProfile: 'Sender',                status: 'Closed',  lastSignIn: dsSStamp(-104, 9, 12), group: 'Contractors',             envelopesSent: 208 }
];

/* Address book. Feeds the wizard's recipient autocomplete, so it must contain
   every external party who appears on an envelope — a name that shows up in a
   list but not in the book would be an orphan under R2. */
const DS_S_CONTACTS = [
  { name: 'John Smith',        email: 'john.smith@example.com',        company: 'Buyer',                    role: 'Buyer',            lastUsed: dsSDay(-2) },
  { name: 'Sarah Johnson',     email: 'sarah.j@example.com',           company: 'Seller',                   role: 'Seller',           lastUsed: dsSDay(-2) },
  { name: 'Michael Brown',     email: 'michael.brown@agency.example.com', company: 'Lone Star Realty',      role: 'Agent',            lastUsed: dsSDay(-2) },
  { name: 'Elena Rostova',     email: 'elena.rostova@example.com',     company: 'Rostova Consulting',       role: 'Counterparty',     lastUsed: dsSDay(-11) },
  { name: 'Robert Chen',       email: 'robert.chen@example.com',       company: 'Chen Property Group',      role: 'Buyer',            lastUsed: dsSDay(-6) },
  { name: 'Amara Okafor',      email: 'amara.okafor@example.com',      company: 'Okafor Holdings',          role: 'Seller',           lastUsed: dsSDay(-9) },
  { name: 'David Kowalski',    email: 'david.kowalski@example.com',    company: 'Kowalski & Sons',          role: 'Contractor',       lastUsed: dsSDay(-14) },
  { name: 'Grace Liu',         email: 'grace.liu@example.com',         company: 'Liu Family Trust',         role: 'Seller',           lastUsed: dsSDay(-21) },
  { name: 'Tomas Herrera',     email: 'tomas.herrera@example.com',     company: 'Herrera Inspections',      role: 'Vendor',           lastUsed: dsSDay(-4) },
  { name: 'Nina Petrov',       email: 'nina.petrov@example.com',       company: 'Petrov Interiors',         role: 'Vendor',           lastUsed: dsSDay(-33) },
  { name: 'Wesley Park',       email: 'wesley.park@example.com',       company: 'Park Capital',             role: 'Buyer',            lastUsed: dsSDay(-17) },
  { name: 'Fatima Al-Rashid',  email: 'fatima.alrashid@example.com',   company: 'Al-Rashid Ventures',       role: 'Buyer',            lastUsed: dsSDay(-27) },
  { name: 'Owen Brennan',      email: 'owen.brennan@example.com',      company: 'Brennan Legal',            role: 'Attorney',         lastUsed: dsSDay(-8) },
  { name: 'Leilani Kealoha',   email: 'leilani.kealoha@example.com',   company: 'Kealoha Realty',           role: 'Agent',            lastUsed: dsSDay(-13) },
  { name: 'Victor Nunes',      email: 'victor.nunes@example.com',      company: 'Nunes Construction',       role: 'Contractor',       lastUsed: dsSDay(-40) },
  { name: 'Harriet Vance',     email: 'harriet.vance@example.com',     company: 'Vance Estate',             role: 'Seller',           lastUsed: dsSDay(-52) },
  { name: 'Idris Mahmoud',     email: 'idris.mahmoud@example.com',     company: 'Mahmoud Property',         role: 'Buyer',            lastUsed: dsSDay(-24) },
  { name: 'Chloe Bergeron',    email: 'chloe.bergeron@example.com',    company: 'Bergeron Design',          role: 'Vendor',           lastUsed: dsSDay(-61) },
  { name: 'Samuel Adeyemi',    email: 'samuel.adeyemi@example.com',    company: 'Adeyemi Group',            role: 'Buyer',            lastUsed: dsSDay(-30) },
  { name: 'Mira Kaplan',       email: 'mira.kaplan@example.com',       company: 'Kaplan Title',             role: 'Escrow Officer',   lastUsed: dsSDay(-5) },
  { name: 'Diego Salazar',     email: 'diego.salazar@example.com',     company: 'Salazar Surveying',        role: 'Vendor',           lastUsed: dsSDay(-18) },
  { name: 'Beatrice Lund',     email: 'beatrice.lund@example.com',     company: 'Lund Appraisal',           role: 'Vendor',           lastUsed: dsSDay(-37) },
  { name: 'Kwame Asante',      email: 'kwame.asante@example.com',      company: 'Asante Investments',       role: 'Buyer',            lastUsed: dsSDay(-45) },
  { name: 'Rosalind Fischer',  email: 'rosalind.fischer@example.com',  company: 'Fischer Mortgage',         role: 'Lender',           lastUsed: dsSDay(-7) },
  { name: 'Julian Moreau',     email: 'julian.moreau@example.com',     company: 'Moreau Partners',          role: 'Counterparty',     lastUsed: dsSDay(-70) },
  { name: 'Yara Haddad',       email: 'yara.haddad@example.com',       company: 'Haddad Leasing',           role: 'Landlord',         lastUsed: dsSDay(-15) },
  { name: 'Peter Novak',       email: 'peter.novak@example.com',       company: 'Novak Roofing',            role: 'Contractor',       lastUsed: dsSDay(-88) },
  { name: 'Alicia Fontaine',   email: 'alicia.fontaine@example.com',   company: 'Fontaine Escrow',          role: 'Escrow Officer',   lastUsed: dsSDay(-12) },
  { name: 'Marcus Delgado',    email: 'marcus.delgado@example.com',    company: 'Delgado Tenant Services',  role: 'Tenant',           lastUsed: dsSDay(-26) },
  { name: 'Ingrid Sorensen',   email: 'ingrid.sorensen@example.com',   company: 'Sorensen Compliance',      role: 'Compliance',       lastUsed: dsSDay(-49) }
];


/* ============================================================================
   ENVELOPES — the background account
   ============================================================================

   THE ORDERING TRAP, read before changing anything here
   -----------------------------------------------------
   Lesson 5's walkthrough targets tr[data-env-id="ENV-2026-9041"], an envelope
   dated DS_TODAY-2. If any background envelope carried a later date it would
   push that row down the list, and the walkthrough would highlight empty space.

   So: every envelope in this file is dated DS_TODAY-3 or older. There is a
   test for it in the acceptance run, and DS_S_MAX_OFFSET is the single knob
   that enforces it. Do not raise it above -3.
   ============================================================================ */
const DS_S_MAX_OFFSET = -3;

const DS_S_STREETS = [
  'Barton Springs Rd', 'Shoal Creek Blvd', 'Manor Rd', 'Burnet Rd', 'South Congress Ave',
  'Cesar Chavez St', 'Slaughter Ln', 'Anderson Mill Rd', 'Parmer Ln', 'Brodie Ln',
  'Riverside Dr', 'Guadalupe St', 'Lamar Blvd', 'Duval St', 'Red River St',
  'Wells Branch Pkwy', 'Gattis School Rd', 'Sam Bass Rd', 'Chisholm Trail', 'Round Rock Ave',
  'Whitestone Blvd', 'Cypress Creek Rd', 'Lakeline Blvd', 'Quest Pkwy', 'Discovery Blvd',
  'Bagdad Rd', 'Nameless Rd', 'Ranch Road 620', 'Spicewood Springs Rd', 'Bee Cave Rd'
];
const DS_S_CITIES = ['Austin, TX', 'Round Rock, TX', 'Cedar Park, TX', 'Pflugerville, TX', 'Leander, TX', 'Georgetown, TX'];

/* Envelope type -> how its subject reads and what documents ride along. Keeping
   these together is what stops a "Lease Agreement" from carrying a seller
   disclosure. */
const DS_S_TYPES = [
  { type: 'Real Estate Purchase',  subject: 'Purchase Agreement',              doc: 'Purchase_Agreement',        pages: [4, 9],  roles: ['Buyer', 'Seller', 'Agent'] },
  { type: 'Listing Agreement',     subject: 'Exclusive Listing Agreement',     doc: 'Listing_Agreement',         pages: [3, 6],  roles: ['Seller', 'Agent'] },
  { type: 'Lease Agreement',       subject: 'Residential Lease',               doc: 'Residential_Lease',         pages: [6, 12], roles: ['Tenant', 'Landlord'] },
  { type: 'Amendment',             subject: 'Amendment to Purchase Agreement', doc: 'Amendment',                 pages: [1, 3],  roles: ['Buyer', 'Seller'] },
  { type: 'Addendum',              subject: 'Financing Addendum',              doc: 'Addendum',                  pages: [1, 2],  roles: ['Buyer', 'Lender'] },
  { type: 'Seller Disclosure',     subject: "Seller's Disclosure Notice",      doc: 'Sellers_Disclosure',        pages: [4, 7],  roles: ['Seller', 'Buyer'] },
  { type: 'Commission Agreement',  subject: 'Commission Split Agreement',      doc: 'Commission_Agreement',      pages: [1, 3],  roles: ['Agent', 'Broker'] },
  { type: 'HR / Onboarding',       subject: 'Independent Contractor Agreement',doc: 'Contractor_Agreement',      pages: [3, 5],  roles: ['Contractor', 'Manager'] },
  { type: 'Legal',                 subject: 'Mutual Non-Disclosure Agreement',  doc: 'Mutual_NDA',               pages: [2, 4],  roles: ['Counterparty', 'Attorney'] },
  { type: 'Vendor Agreement',      subject: 'Vendor Services Agreement',       doc: 'Vendor_Agreement',          pages: [2, 5],  roles: ['Vendor', 'Manager'] }
];

/* How many envelopes of each status, and how far back they spread. The counts
   are chosen so that no sidebar destination is ever empty — an "Authentication
   Failed" screen with nothing in it teaches a VA nothing, and three permanently
   blank quick views were the loudest tell that this was a mock-up. */
const DS_S_STATUS_PLAN = [
  { status: 'completed', count: 38 },
  { status: 'waiting',   count: 14 },
  { status: 'draft',     count: 8  },
  { status: 'voided',    count: 4  },
  { status: 'expired',   count: 5  },
  { status: 'declined',  count: 3  },
  { status: 'authfail',  count: 3  },
  { status: 'deleted',   count: 6  }
];

/* Recipient status implied by the envelope's own status. A completed envelope
   whose signers are still "waiting" is the kind of contradiction that makes the
   detail view unbelievable. */
const DS_S_RECIP_STATUS = {
  completed: ['completed', 'completed', 'received'],
  waiting:   ['completed', 'waiting', 'received'],
  draft:     ['created', 'created', 'created'],
  voided:    ['completed', 'voided', 'received'],
  expired:   ['completed', 'expired', 'received'],
  declined:  ['completed', 'declined', 'received'],
  authfail:  ['completed', 'authfail', 'received'],
  deleted:   ['completed', 'completed', 'received']
};

/* Builds the background account. Seeded once with a fixed string, so the same
   84 envelopes come out in the same order on every load, forever. */
function dsSBuildEnvelopes() {
  const out = [];
  const rand = dsSRand('docusign-shell-account-v1');
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

  /* Sequence numbers walk downward from a fixed start so ids are stable and
     never collide with the five curriculum envelopes (9041, 8812, 7734, 6620,
     5510), which all sit above 5000 in the 2026 series. */
  let seq = 4980;
  const nextId = year => 'ENV-' + year + '-' + (seq--);

  DS_S_STATUS_PLAN.forEach(plan => {
    for (let i = 0; i < plan.count; i++) {
      const t = pick(DS_S_TYPES);
      const sender = pick(DS_S_SENDERS);

      /* Age distribution: two thirds inside the last 60 days, the rest spread
         back over 14 months so "Last 12 months" is a filter that means
         something. Everything stays at or before DS_S_MAX_OFFSET. */
      const recent = rand() < 0.62;
      const age = recent ? between(3, 60) : between(61, 425);
      const created = dsSDay(Math.min(DS_S_MAX_OFFSET, -age));
      const year = created.slice(0, 4);

      /* Waiting envelopes need a spread of closing dates: a handful must fall
         inside the next 7 days so "Expiring Soon" is not empty, the rest later. */
      let closeOffset;
      if (plan.status === 'waiting') closeOffset = (i < 5) ? between(1, 7) : between(8, 45);
      else if (plan.status === 'completed') closeOffset = -age + between(1, 9);
      else closeOffset = -age + between(3, 30);

      const address = between(100, 9899) + ' ' + pick(DS_S_STREETS);
      const city = pick(DS_S_CITIES);
      const isProperty = ['Real Estate Purchase', 'Listing Agreement', 'Lease Agreement',
                          'Amendment', 'Addendum', 'Seller Disclosure'].indexOf(t.type) > -1;
      const subject = isProperty
        ? t.subject + ' — ' + address + ', ' + city.split(',')[0]
        : t.subject + ' — ' + pick(DS_S_CONTACTS).company;

      const recipCount = Math.min(t.roles.length, between(1, 3));
      const statuses = DS_S_RECIP_STATUS[plan.status];
      const used = [];
      const recipients = [];
      for (let r = 0; r < recipCount; r++) {
        let c = pick(DS_S_CONTACTS);
        let guard = 0;
        while (used.indexOf(c.email) > -1 && guard++ < 12) c = pick(DS_S_CONTACTS);
        used.push(c.email);
        recipients.push({
          id: 'r' + (r + 1),
          role: t.roles[r],
          name: c.name,
          email: c.email,
          status: statuses[Math.min(r, statuses.length - 1)],
          action: r === recipCount - 1 && recipCount > 2 ? 'Receives a Copy' : 'Needs to Sign',
          order: r + 1
        });
      }

      const docs = [{ name: t.doc + '_' + (isProperty ? address.split(' ')[0] : 'v' + between(1, 4)) + '.pdf', pages: between(t.pages[0], t.pages[1]) }];
      if (rand() < 0.3) docs.push({ name: 'Addendum_A.pdf', pages: between(1, 3) });

      const env = {
        id: nextId(year),
        subject: subject,
        type: t.type,
        sender: sender,
        status: plan.status,
        createdDate: created,
        closingDate: dsSDay(closeOffset),
        documents: docs,
        recipients: recipients
      };

      /* Only the statuses that imply a problem carry a note — a note on a
         healthy envelope would read as noise in the Action Required view. */
      if (plan.status === 'declined') env.statusNote = 'Declined by ' + recipients[recipients.length - 1].name + ' — reason given: terms under renegotiation';
      if (plan.status === 'expired')  env.statusNote = 'Expired before all recipients signed';
      if (plan.status === 'authfail') env.statusNote = 'Recipient failed SMS authentication three times';

      out.push(env);
    }
  });

  /* Newest first, the order the list itself uses. Sorting here means the list
     view never has to care where an envelope came from. */
  return out.sort((a, b) => (a.createdDate < b.createdDate ? 1 : a.createdDate > b.createdDate ? -1 : 0));
}

const DS_S_ENVELOPES = dsSBuildEnvelopes();


/* ============================================================================
   SETTINGS
   ============================================================================ */

const DS_S_GROUPS = [
  { name: 'Transaction Coordinators', desc: 'Sends and manages real-estate envelopes end to end.' },
  { name: 'Listing Agents',           desc: 'Prepares listing agreements and seller disclosures.' },
  { name: 'Escrow',                   desc: 'Handles closing packages and disbursement authorisations.' },
  { name: 'Compliance',               desc: 'Reviews completed files and owns the retention policy.' },
  { name: 'Executive',                desc: 'Read access across every envelope in the account.' },
  { name: 'Contractors',              desc: 'External staff with time-limited sending rights.' }
];

/* Capability flags drive the permission matrix. The matrix is rendered from
   these booleans rather than from a hand-drawn table, so a profile can never
   claim one thing in a list and something else in the grid. */
const DS_S_CAPABILITIES = [
  { key: 'send',      label: 'Send envelopes' },
  { key: 'templates', label: 'Use templates' },
  { key: 'authoring', label: 'Create and share templates' },
  { key: 'correct',   label: 'Correct sent envelopes' },
  { key: 'void',      label: 'Void sent envelopes' },
  { key: 'transfer',  label: 'Transfer envelope ownership' },
  { key: 'users',     label: 'Manage users and groups' },
  { key: 'settings',  label: 'Manage account settings' },
  { key: 'audit',     label: 'View audit logs' },
  { key: 'bulk',      label: 'Bulk send' }
];

const DS_S_PERMISSION_PROFILES = [
  { name: 'Account Administrator', caps: { send: 1, templates: 1, authoring: 1, correct: 1, void: 1, transfer: 1, users: 1, settings: 1, audit: 1, bulk: 1 } },
  { name: 'DS Admin',              caps: { send: 1, templates: 1, authoring: 1, correct: 1, void: 1, transfer: 1, users: 0, settings: 1, audit: 1, bulk: 1 } },
  { name: 'Sender',                caps: { send: 1, templates: 1, authoring: 1, correct: 1, void: 1, transfer: 0, users: 0, settings: 0, audit: 0, bulk: 1 } },
  { name: 'Signing Group Manager', caps: { send: 1, templates: 1, authoring: 0, correct: 1, void: 0, transfer: 0, users: 0, settings: 0, audit: 0, bulk: 1 } },
  { name: 'Viewer',                caps: { send: 0, templates: 1, authoring: 0, correct: 0, void: 0, transfer: 0, users: 0, settings: 0, audit: 0, bulk: 0 } },
  { name: 'Read Only',             caps: { send: 0, templates: 0, authoring: 0, correct: 0, void: 0, transfer: 0, users: 0, settings: 0, audit: 0, bulk: 0 } }
];

const DS_S_SIGNING_GROUPS = [
  { name: 'Any Escrow Officer', members: ['Dana Whitfield', 'Nathan Cole'],                     note: 'First to open takes the envelope.' },
  { name: 'Broker of Record',   members: ['Marcus Lee'],                                        note: 'Required countersignature on listings.' },
  { name: 'Compliance Review',  members: ['Hana Yoshida', 'Camille Duarte'],                    note: 'Any one member may sign off.' },
  { name: 'Weekend Coverage',   members: ['Priya Raman', 'Terrence Boyd', 'Sofia Marchetti'],   note: 'Rotates monthly.' }
];

/* Brand marks are inline SVG so the account issues no remote image requests. */
const DS_S_BRANDS = [
  { name: 'Lone Star Realty — Main', color: '#2b57d9', isDefault: true,  languages: ['English (US)', 'Spanish'],
    logo: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5 14.6 9h6.9l-5.6 4.1 2.2 6.6L12 15.7 5.9 19.7l2.2-6.6L2.5 9h6.9z"/></svg>' },
  { name: 'Lone Star Commercial',    color: '#1c2b3a', isDefault: false, languages: ['English (US)'],
    logo: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 21V7l8-4 8 4v14h-6v-5h-4v5z"/></svg>' },
  { name: 'Property Management',     color: '#1a8a4a', isDefault: false, languages: ['English (US)', 'Spanish', 'Vietnamese'],
    logo: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 11 12 3l9 8h-3v9h-5v-6h-2v6H6v-9z"/></svg>' }
];

const DS_S_EMAIL_TEMPLATES = [
  { name: 'Signature Invitation', event: 'Envelope sent',      subject: 'Please Docusign: [[DocumentName]]',
    body: '[[SenderName]] sent you a document to review and sign. Please review the attached agreement and complete your signature.' },
  { name: 'Reminder',             event: 'Reminder fires',     subject: 'Reminder: please sign [[DocumentName]]',
    body: 'This is a friendly reminder that [[DocumentName]] is still waiting for your signature.' },
  { name: 'Completed',            event: 'All parties signed', subject: 'Completed: [[DocumentName]]',
    body: 'All parties have signed [[DocumentName]]. The completed document and its certificate of completion are attached.' },
  { name: 'Declined',             event: 'Recipient declines', subject: '[[RecipientName]] declined to sign [[DocumentName]]',
    body: '[[RecipientName]] declined to sign. Reason given: [[DeclineReason]].' },
  { name: 'Voided',               event: 'Sender voids',       subject: 'Voided: [[DocumentName]]',
    body: '[[SenderName]] voided this envelope. Reason: [[VoidReason]]. No further action is required.' },
  { name: 'Expiring Soon',        event: 'Expiry approaching', subject: 'Expiring in [[DaysRemaining]] days: [[DocumentName]]',
    body: 'This envelope expires on [[ExpiryDate]]. Please complete your signature before then.' }
];

const DS_S_CONNECTED_APPS = [
  { name: 'Salesforce',   desc: 'Send envelopes from an Opportunity and write status back.',    connected: true,  since: dsSDay(-412), scope: 'Read envelopes, send envelopes' },
  { name: 'Google Drive', desc: 'Attach documents straight from Drive.',                        connected: true,  since: dsSDay(-289), scope: 'Read files' },
  { name: 'Dropbox',      desc: 'Attach documents from Dropbox folders.',                       connected: false, since: null,         scope: 'Read files' },
  { name: 'Box',          desc: 'Archive completed envelopes to a Box folder.',                 connected: false, since: null,         scope: 'Read and write files' },
  { name: 'SharePoint',   desc: 'Sync completed agreements to the brokerage library.',          connected: true,  since: dsSDay(-171), scope: 'Write files' },
  { name: 'Zapier',       desc: 'Trigger workflows when an envelope completes.',                connected: false, since: null,         scope: 'Read envelope events' },
  { name: 'Slack',        desc: 'Post envelope status changes to a channel.',                   connected: true,  since: dsSDay(-96),  scope: 'Read envelope events' },
  { name: 'Qualia',       desc: 'Push signed closing documents into the title order.',          connected: true,  since: dsSDay(-58),  scope: 'Read envelopes, write documents' },
  { name: 'Stripe',       desc: 'Collect earnest money alongside signature.',                   connected: false, since: null,         scope: 'Create payment intents' },
  { name: 'HubSpot',      desc: 'Log signed agreements against the contact record.',            connected: true,  since: dsSDay(-233), scope: 'Read envelopes' }
];

/* Masked on purpose. A full-looking key in a training simulator is a key
   somebody eventually pastes somewhere real. */
const DS_S_API_KEYS = [
  { name: 'Production Integration Key', masked: '••••••••••••4f2a', created: dsSDay(-398), lastUsed: dsSDay(0),  scope: 'Full account' },
  { name: 'Qualia Connector',           masked: '••••••••••••9c71', created: dsSDay(-58),  lastUsed: dsSDay(-1), scope: 'Envelopes read/write' },
  { name: 'Reporting (read-only)',      masked: '••••••••••••20e8', created: dsSDay(-142), lastUsed: dsSDay(-7), scope: 'Envelopes read' }
];

const DS_S_CONNECT = [
  { name: 'Transaction Sync',   url: 'https://hooks.agency.example.com/docusign/transactions', events: ['Envelope Sent', 'Envelope Completed', 'Envelope Voided'], status: 'Active',   failures: 0 },
  { name: 'Compliance Archive', url: 'https://hooks.agency.example.com/docusign/archive',      events: ['Envelope Completed'],                                     status: 'Active',   failures: 0 },
  { name: 'Slack Notifier',     url: 'https://hooks.agency.example.com/docusign/slack',        events: ['Envelope Declined', 'Authentication Failed'],             status: 'Active',   failures: 2 },
  { name: 'Legacy CRM Bridge',  url: 'https://hooks.agency.example.com/docusign/legacy-crm',   events: ['Envelope Sent'],                                          status: 'Disabled', failures: 47 }
];

const DS_S_PLAN = {
  name: 'Business Pro',
  seatsUsed: 14,
  seatsTotal: 20,
  cycle: 'Annual',
  renews: dsSDay(148),
  amount: '$8,760.00 / year',
  invoices: [
    { id: 'INV-2026-0008', date: dsSDay(-12),  amount: '$730.00', status: 'Paid' },
    { id: 'INV-2026-0007', date: dsSDay(-43),  amount: '$730.00', status: 'Paid' },
    { id: 'INV-2026-0006', date: dsSDay(-73),  amount: '$730.00', status: 'Paid' },
    { id: 'INV-2026-0005', date: dsSDay(-104), amount: '$730.00', status: 'Paid' },
    { id: 'INV-2026-0004', date: dsSDay(-134), amount: '$730.00', status: 'Paid' },
    { id: 'INV-2026-0003', date: dsSDay(-165), amount: '$730.00', status: 'Paid' }
  ]
};

const DS_S_REGIONAL = {
  timezone: '(UTC-06:00) Central Time — US & Canada',
  tzAbbr: 'CST',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24-hour',
  language: 'English (US)',
  currency: 'USD ($)'
};

/* Office IP for audit trails and sign-in logs. Derived from a stable string so
   an envelope's history shows the same address on every repaint — this is what
   replaces the Math.random() that used to rewrite history on each render. */
function dsSOfficeIp(seedStr) {
  const r = dsSRand('ip|' + seedStr);
  return '10.42.' + (1 + Math.floor(r() * 6)) + '.' + (11 + Math.floor(r() * 240));
}

/* Audit rows for Settings. Actors are real users, per R2. */
const DS_S_SECURITY_EVENTS = (function () {
  const rand = dsSRand('docusign-security-log-v1');
  const kinds = [
    'User signed in', 'User signed out', 'Failed sign-in attempt', 'Password changed',
    'Permission profile changed', 'User invited', 'API key used', 'Envelope exported',
    'Bulk send started', 'Connected app authorised', 'MFA challenge passed', 'Settings updated'
  ];
  const active = DS_S_USERS.filter(u => u.status === 'Active');
  const out = [];
  for (let i = 0; i < 20; i++) {
    const u = active[Math.floor(rand() * active.length)];
    out.push({
      timestamp: dsSStamp(-Math.floor(rand() * 14), 7 + Math.floor(rand() * 11), Math.floor(rand() * 60)),
      action: kinds[Math.floor(rand() * kinds.length)],
      actor: u.name,
      ip: dsSOfficeIp(u.email)
    });
  }
  return out.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
})();


/* ============================================================================
   PRODUCT
   ============================================================================ */

/* Extra templates. The three in docusign-data.js keep their ids untouched
   because ds_c4_2 is graded off dsUseTemplate('TMPL-03'); these start at 04. */
const DS_S_TEMPLATES = [
  { id: 'TMPL-04', name: 'Exclusive Right to Sell Listing',  category: 'Real Estate',       description: 'Full listing agreement with commission schedule and marketing consent.', documentsCount: 2, recipients: ['Seller (Signer)', 'Listing Agent (Signer)', 'Broker (CC)'], lastUsed: dsSDay(-3),  usageCount: 64 },
  { id: 'TMPL-05', name: 'Residential Lease — 12 Month',     category: 'Real Estate',       description: 'Standard lease with pet and utilities addenda pre-attached.',           documentsCount: 3, recipients: ['Tenant (Signer)', 'Landlord (Signer)'],                       lastUsed: dsSDay(-6),  usageCount: 41 },
  { id: 'TMPL-06', name: 'Seller Disclosure Notice',         category: 'Real Estate',       description: 'Texas seller disclosure, pre-tagged for initials on every page.',        documentsCount: 1, recipients: ['Seller (Signer)', 'Buyer (Signer)'],                          lastUsed: dsSDay(-4),  usageCount: 88 },
  { id: 'TMPL-07', name: 'Amendment to Purchase Agreement',  category: 'Real Estate',       description: 'Blank amendment for price, date or repair changes.',                     documentsCount: 1, recipients: ['Buyer (Signer)', 'Seller (Signer)'],                          lastUsed: dsSDay(-5),  usageCount: 112 },
  { id: 'TMPL-08', name: 'Third Party Financing Addendum',   category: 'Real Estate',       description: 'Lender approval terms and the deadline for buyer financing.',            documentsCount: 1, recipients: ['Buyer (Signer)', 'Lender (CC)'],                              lastUsed: dsSDay(-9),  usageCount: 57 },
  { id: 'TMPL-09', name: 'Commission Split Agreement',       category: 'Finance',           description: 'Internal split between listing and buyer-side agents.',                  documentsCount: 1, recipients: ['Agent (Signer)', 'Broker (Signer)'],                          lastUsed: dsSDay(-14), usageCount: 29 },
  { id: 'TMPL-10', name: 'Referral Fee Agreement',           category: 'Finance',           description: 'Outbound referral with fee percentage and payment trigger.',             documentsCount: 1, recipients: ['Referring Agent (Signer)', 'Receiving Broker (Signer)'],      lastUsed: dsSDay(-22), usageCount: 18 },
  { id: 'TMPL-11', name: 'W-9 Request',                      category: 'Finance',           description: 'Collects tax identification before a vendor can be paid.',               documentsCount: 1, recipients: ['Vendor (Signer)'],                                            lastUsed: dsSDay(-8),  usageCount: 73 },
  { id: 'TMPL-12', name: 'Employee Offer Letter',            category: 'HR & Onboarding',   description: 'Offer terms, start date and at-will acknowledgement.',                   documentsCount: 2, recipients: ['Candidate (Signer)', 'Hiring Manager (Signer)'],             lastUsed: dsSDay(-17), usageCount: 22 },
  { id: 'TMPL-13', name: 'Direct Deposit Authorisation',     category: 'HR & Onboarding',   description: 'Bank routing capture with a voided-cheque attachment field.',            documentsCount: 1, recipients: ['Employee (Signer)'],                                          lastUsed: dsSDay(-26), usageCount: 31 },
  { id: 'TMPL-14', name: 'Vendor Services Agreement',        category: 'Vendor Management', description: 'Master terms for inspectors, photographers and stagers.',                documentsCount: 2, recipients: ['Vendor (Signer)', 'Operations Manager (Signer)'],            lastUsed: dsSDay(-11), usageCount: 45 },
  { id: 'TMPL-15', name: 'Certificate of Insurance Request', category: 'Vendor Management', description: 'Requests proof of liability cover before a vendor starts work.',         documentsCount: 1, recipients: ['Vendor (Signer)'],                                            lastUsed: dsSDay(-31), usageCount: 26 },
  { id: 'TMPL-16', name: 'Annual Policy Acknowledgement',    category: 'Compliance',        description: 'Yearly sign-off on the brokerage handbook and code of ethics.',          documentsCount: 1, recipients: ['Employee (Signer)'],                                          lastUsed: dsSDay(-29), usageCount: 96 },
  { id: 'TMPL-17', name: 'Wire Fraud Advisory',              category: 'Compliance',        description: 'Mandatory advisory acknowledged by both parties before closing.',        documentsCount: 1, recipients: ['Buyer (Signer)', 'Seller (Signer)'],                          lastUsed: dsSDay(-2),  usageCount: 134 }
];

/* Bulk sends. Every tmplId must resolve through dsAllTemplates() — a batch that
   names a template nobody can open is the kind of orphan R2 forbids. */
const DS_S_BULK_BATCHES = [
  { name: 'Q3 Contractor Onboarding',        tmplId: 'TMPL-01', recips: 24,  sent: dsSDay(-4),  status: 'completed', done: 24 },
  { name: 'Vendor NDA Refresh — August',     tmplId: 'TMPL-02', recips: 61,  sent: dsSDay(-7),  status: 'waiting',   done: 47 },
  { name: 'Buyer Packet — Willow Creek',     tmplId: 'TMPL-03', recips: 12,  sent: dsSDay(-3),  status: 'waiting',   done: 3 },
  { name: 'Annual Policy Acknowledgement',   tmplId: 'TMPL-16', recips: 88,  sent: dsSDay(-29), status: 'completed', done: 88 },
  { name: 'Listing Agreement Renewals',      tmplId: 'TMPL-04', recips: 9,   sent: dsSDay(-41), status: 'expired',   done: 6 },
  { name: 'Wire Fraud Advisory — All Files', tmplId: 'TMPL-17', recips: 134, sent: dsSDay(-16), status: 'completed', done: 134 },
  { name: 'W-9 Collection — New Vendors',    tmplId: 'TMPL-11', recips: 18,  sent: dsSDay(-9),  status: 'waiting',   done: 14 },
  { name: 'Spring Referral Agreements',      tmplId: 'TMPL-10', recips: 7,   sent: dsSDay(-96), status: 'completed', done: 7 },
  { name: 'COI Renewal — Inspectors',        tmplId: 'TMPL-15', recips: 22,  sent: dsSDay(-33), status: 'completed', done: 21 },
  { name: 'Lease Renewals — Riverside',      tmplId: 'TMPL-05', recips: 31,  sent: dsSDay(-12), status: 'waiting',   done: 19 },
  { name: 'Onboarding — Fall Cohort',        tmplId: 'TMPL-12', recips: 6,   sent: dsSDay(-58), status: 'completed', done: 6 },
  { name: 'Disclosure Sweep — Q2 Closings',  tmplId: 'TMPL-06', recips: 44,  sent: dsSDay(-77), status: 'completed', done: 43 }
];

const DS_S_POWERFORMS = [
  { name: 'New Client Intake Form',        tmplId: 'TMPL-02', slug: 'new-client-intake',   responses: 47,  on: true,  created: dsSDay(-201), owner: 'Alex Rivera',     lastResponse: dsSDay(-1) },
  { name: 'Contractor Onboarding Packet',  tmplId: 'TMPL-01', slug: 'contractor-onboard',  responses: 18,  on: true,  created: dsSDay(-158), owner: 'Terrence Boyd',   lastResponse: dsSDay(-4) },
  { name: 'Buyer Representation Request',  tmplId: 'TMPL-03', slug: 'buyer-rep-request',   responses: 31,  on: true,  created: dsSDay(-119), owner: 'Priya Raman',     lastResponse: dsSDay(-2) },
  { name: 'Open House Sign-In',            tmplId: 'TMPL-04', slug: 'open-house-signin',   responses: 204, on: true,  created: dsSDay(-286), owner: 'Sofia Marchetti', lastResponse: dsSDay(-3) },
  { name: 'Vendor COI Upload',             tmplId: 'TMPL-15', slug: 'vendor-coi-upload',   responses: 62,  on: true,  created: dsSDay(-173), owner: 'Nathan Cole',     lastResponse: dsSDay(-6) },
  { name: 'Maintenance Request — Tenants', tmplId: 'TMPL-05', slug: 'maintenance-request', responses: 88,  on: true,  created: dsSDay(-241), owner: 'Jordan Ellis',    lastResponse: dsSDay(-1) },
  { name: 'W-9 Self Service',              tmplId: 'TMPL-11', slug: 'w9-self-service',     responses: 39,  on: true,  created: dsSDay(-134), owner: 'Dana Whitfield',  lastResponse: dsSDay(-8) },
  { name: 'Referral Agreement (Archived)', tmplId: 'TMPL-10', slug: 'referral-agreement',  responses: 6,   on: false, created: dsSDay(-388), owner: 'Casey Nolan',     lastResponse: dsSDay(-297) }
];

/* Shared access, both directions. Everyone here is a real account user. */
const DS_S_SHARED_ACCESS = {
  sharedWithMe: [
    { name: 'Dana Whitfield',  scope: 'Send and manage', since: dsSDay(-72) },
    { name: 'Marcus Lee',      scope: 'View only',       since: dsSDay(-28) },
    { name: 'Jordan Ellis',    scope: 'Send and manage', since: dsSDay(-51) },
    { name: 'Sofia Marchetti', scope: 'View only',       since: dsSDay(-16) }
  ],
  iShareWith: [
    { name: 'Priya Raman',   scope: 'Send and manage', since: dsSDay(-84) },
    { name: 'Terrence Boyd', scope: 'View only',       since: dsSDay(-35) },
    { name: 'Hana Yoshida',  scope: 'View only',       since: dsSDay(-9) }
  ]
};

const DS_S_REPORT_CATALOG = [
  { name: 'Envelope Volume by Month',         type: 'Volume',      createdBy: 'Alex Rivera',     lastRun: dsSDay(0),   schedule: 'Monthly',       shared: true },
  { name: 'Average Time to Complete',         type: 'Performance', createdBy: 'Alex Rivera',     lastRun: dsSDay(-1),  schedule: 'Weekly',        shared: false },
  { name: 'Recipient Bounce and Failure Log', type: 'Delivery',    createdBy: 'Dana Whitfield',  lastRun: dsSDay(0),   schedule: 'Daily',         shared: true },
  { name: 'Voided Envelopes with Reason',     type: 'Compliance',  createdBy: 'Hana Yoshida',    lastRun: dsSDay(-8),  schedule: 'Not scheduled', shared: true },
  { name: 'Template Usage by Sender',         type: 'Usage',       createdBy: 'Priya Raman',     lastRun: dsSDay(-12), schedule: 'Monthly',       shared: true },
  { name: 'Authentication Failures',          type: 'Compliance',  createdBy: 'Dana Whitfield',  lastRun: dsSDay(-3),  schedule: 'Weekly',        shared: true },
  { name: 'Envelopes Expiring in 14 Days',    type: 'Delivery',    createdBy: 'Alex Rivera',     lastRun: dsSDay(0),   schedule: 'Daily',         shared: false },
  { name: 'Sender Productivity',              type: 'Performance', createdBy: 'Marcus Lee',      lastRun: dsSDay(-6),  schedule: 'Monthly',       shared: true },
  { name: 'Bulk Send Completion Rates',       type: 'Volume',      createdBy: 'Terrence Boyd',   lastRun: dsSDay(-4),  schedule: 'Weekly',        shared: false },
  { name: 'PowerForm Response Summary',       type: 'Usage',       createdBy: 'Sofia Marchetti', lastRun: dsSDay(-2),  schedule: 'Weekly',        shared: true },
  { name: 'Retention Policy Exceptions',      type: 'Compliance',  createdBy: 'Camille Duarte',  lastRun: dsSDay(-21), schedule: 'Quarterly',     shared: true },
  { name: 'Declined Envelopes by Reason',     type: 'Compliance',  createdBy: 'Hana Yoshida',    lastRun: dsSDay(-5),  schedule: 'Monthly',       shared: false }
];

/* Notifications. Every one cites an envelope id that exists — the previous three
   were hand-written and two of them referenced nothing. Built as a function so
   the ids can be looked up from the generated account rather than typed. */
function dsSBuildNotifications() {
  const pickBy = (status, n) => DS_S_ENVELOPES.filter(e => e.status === status).slice(0, n);
  const out = [];
  const add = (title, text, envId, dayOffset, read) =>
    out.push({ id: 'n' + (out.length + 1), title, text, envId, date: dsSDay(dayOffset), read });

  /* The curriculum envelopes first: these are the ones a trainee is sent to
     look at, so a notification about them is a genuine signpost. */
  add('Action Required', 'Delivery failed for ENV-2026-8812 — the recipient domain gmial.com does not exist.', 'ENV-2026-8812', -1, false);
  add('Envelope Delivered', 'ENV-2026-9041 was delivered to Sarah Johnson.', 'ENV-2026-9041', -2, false);
  add('Envelope Completed', 'Standard NDA — Mutual Confidentiality was signed by all parties.', 'ENV-2026-7734', -11, true);

  pickBy('declined', 2).forEach((e, i) => add('Recipient Declined', e.recipients[e.recipients.length - 1].name + ' declined to sign "' + e.subject + '".', e.id, -3 - i, i > 0));
  pickBy('authfail', 2).forEach((e, i) => add('Authentication Failed', 'A recipient on "' + e.subject + '" failed SMS authentication.', e.id, -4 - i, i > 0));
  pickBy('expired', 2).forEach((e, i) => add('Envelope Expired', '"' + e.subject + '" expired before all recipients signed.', e.id, -5 - i, true));
  pickBy('waiting', 3).forEach((e, i) => add('Reminder Sent', 'An automatic reminder went out for "' + e.subject + '".', e.id, -6 - i, true));
  pickBy('completed', 3).forEach((e, i) => add('Envelope Completed', '"' + e.subject + '" is complete and sealed.', e.id, -7 - i, true));

  return out;
}
const DS_S_NOTIFICATIONS = dsSBuildNotifications();

/* Seeds dsDemo.folderMap so the three sidebar folders do not open on a zero.
   Assignment is by rule rather than by hand: real estate closings go to Buyer
   Packages, anything already finished and older than 90 days goes to Closed,
   escrow-adjacent paperwork to Escrow Docs. */
const DS_S_FOLDER_MAP = (function () {
  const map = {};
  DS_S_ENVELOPES.forEach(e => {
    if (e.status === 'deleted' || e.status === 'draft') return;
    const closingType = ['Real Estate Purchase', 'Seller Disclosure', 'Addendum'].indexOf(e.type) > -1;
    const escrowType = ['Amendment', 'Commission Agreement', 'Legal'].indexOf(e.type) > -1;
    if (e.status === 'completed' && e.createdDate < dsSDay(-90)) map[e.id] = 'Closed 2026';
    else if (closingType) map[e.id] = 'Buyer Packages';
    else if (escrowType) map[e.id] = 'Escrow Docs';
  });
  return map;
})();
