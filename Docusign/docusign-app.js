/* Docusign VA Training Simulator — view engine and scenario logic.

   Chrome matched to the Docusign 2024 rebrand: lowercase wordmark, blue Start
   button, grouped sidebar, and the Agreements list from
   Images-resources/Screenshot-2024-05-16-at-9.08.45-AM.webp. Only that one
   capture of the rebrand exists, so Home, Templates, Reports, Settings, the
   wizard and the signer experience are extensions of its visual language rather
   than copies of a reference — if better captures arrive, they win.

   State is split in two (see below): lesson progress persists, everything a
   visitor touches lives in memory and dies on reload.

   v3: v1/v2 credited items that auto-completed on navigation and had a fake exam
   (a checklist mirror with no questions). Bumping the key discards that progress
   rather than carrying false completions forward. */

const DS_LS_KEY = 'ds_va_training_v3';

/* ---------- Dual state model ----------
   Two stores, because two kinds of state want opposite lifetimes.

   dsStore is course progress. It survives a reload, because a trainee who refreshes
   mid-lesson must not lose what they earned. It is the ONLY thing written to
   localStorage, and nothing a casual visitor touches may end up in here.

   dsDemo is everything a visitor creates or edits while exploring the product:
   envelopes they send, folders they make, settings they type into. It is a plain
   in-memory object, so F5 wipes it and the next visitor gets a clean simulator.
   Note that sessionStorage would NOT work here — it also survives a reload; only
   memory gives the "nothing I did persists" behaviour the demo needs. */
const DS_STORE_DEFAULTS = {
  checklist: {}, scenarios: {},
  reviews: {}, triages: {}, composes: {},
  tourSeen: false, exam: null,
  lessonsDone: {},
  shuffleSalt: null
};
function dsDefaultStore() { return JSON.parse(JSON.stringify(DS_STORE_DEFAULTS)); }
let dsStore = dsDefaultStore();

const DS_DEMO_DEFAULTS = {
  overrides: {},
  folders: ['Buyer Packages', 'Closed 2026', 'Escrow Docs'],
  folderMap: {},
  auditLogs: {},
  drafts: {},
  activeFolder: 'all',
  searchQuery: '',
  dateFilter: '6m',
  selected: [],
  user: {
    name: 'Alex Rivera',
    email: 'alex.rivera@agency.com',
    role: 'Real Estate Transaction Coordinator (VA)',
    accountName: 'Keller Williams Realty — Lone Star',
    accountId: 'KW-TX-98421'
  },
  /* Both seeded from the catalogue rather than written here, so a folder count
     is never zero on first load and every notification cites a real envelope.
     They still live in dsDemo: marking one read, or moving an envelope, is the
     visitor's change and must die with the tab. */
  notifications: [],
  settings: {},
  /* Tombstones for permanently-deleted envelopes, and names whose shared access
     was revoked. Both are demo state: the catalogue itself is immutable, so a
     removal is recorded as an exclusion rather than an edit. */
  purged: {},
  revokedShares: [],
  templates: [],
  advanced: {}
};
function dsDefaultDemo() {
  const d = JSON.parse(JSON.stringify(DS_DEMO_DEFAULTS));
  if (typeof DS_S_FOLDER_MAP !== 'undefined') d.folderMap = JSON.parse(JSON.stringify(DS_S_FOLDER_MAP));
  if (typeof DS_S_NOTIFICATIONS !== 'undefined') d.notifications = JSON.parse(JSON.stringify(DS_S_NOTIFICATIONS));
  return d;
}
let dsDemo = dsDefaultDemo();
let dsState = {
  view: 'dashboard',
  envelopeFilter: 'all',
  activeFolder: 'all',
  searchQuery: '',
  /* Docusign opens on a 6-month window, which is why that pill is the lit one. */
  dateFilter: '6m',
  senderFilter: 'all',
  /* Paging lives in dsState, not dsDemo: which page you are on is view state, not
     something the visitor created. Every filter change resets it to 1 — see
     dsResetPage(), which each filter handler calls. */
  page: 1,
  pageSize: 20,
  activeEnvId: null,
  activeScenarioId: null,
  activeTriageId: null,
  activeVerifyId: null,
  activeComposeId: null,
  activeTemplateId: null,
  bulkOpen: null,
  advancedOpen: false,
  lessonId: null,
  settingsPage: 'profile',
  reportTab: 'overview',
  tmplQuery: '',
  tmplCat: 'all',
  examIndex: 0,
  wizardStep: 1,
  wizardData: null,   /* populated by dsResetWizard() */
  activeCanvasRecipId: 'wr1',
  selectedCanvasFieldId: null,
  /* Which page of the attached document the canvas is showing. View state, not
     learner data, by the same reasoning as `page` above — so it lives here and
     never reaches dsDemo. Resets to 1 whenever the wizard resets. */
  canvasPage: 1,
  canvasDocIndex: 0,
  signerEnvId: null,
  signerRecipId: null,
  signerStep: 'consent', // 'consent', 'signing', 'finished'
  signerStyleIdx: 0,
  popoverOpen: null // 'account', 'notif', null
};

/* Default wizard state — starts clean like real DocuSign. Sample presets auto-fill on click. */
function dsResetWizard() {
  dsState.wizardStep = 1;
  /* A fresh envelope always opens on the first page of the first document, and
     nothing is selected yet. */
  dsState.canvasPage = 1;
  dsState.canvasDocIndex = 0;
  dsState.selectedCanvasFieldId = null;
  dsState.wizardData = {
    subject: '',
    message: '',
    documents: [],
    recipients: [
      { id: 'wr1', name: '', email: '', role: 'Buyer', action: 'Needs to Sign', order: 1 }
    ],
    fields: [],
    useSequentialOrder: true
  };
  dsState.wizardBaseline = JSON.stringify(dsState.wizardData);
}


/* ---------- Persistence ----------
   Override layer: base data (DS_ENVELOPES) stays immutable; edits (void, correct,
   new envelopes) are stored in memory in dsDemo.overrides and applied on top.
   F5 cleanly resets all demo mutations, while lesson progress (dsStore) persists. */
function dsLoad() {
  try {
    const raw = localStorage.getItem(DS_LS_KEY);
    dsStore = raw ? Object.assign(dsDefaultStore(), JSON.parse(raw)) : dsDefaultStore();
  } catch (e) { dsStore = dsDefaultStore(); }
  /* Demo state is never read back from storage — a fresh object every load is the
     whole point. Restoring it here would silently defeat the dual-state model. */
  dsDemo = dsDefaultDemo();
  if (!dsState.wizardData) dsResetWizard();
}
function dsSave() { localStorage.setItem(DS_LS_KEY, JSON.stringify(dsStore)); }
function dsResetProgress() { localStorage.removeItem(DS_LS_KEY); }
/* Drops everything the visitor built without touching lesson progress. */
function dsResetDemo() { dsDemo = dsDefaultDemo(); }

/* ---------- Envelope access (respects overrides) ---------- */
/* The account is three layers: the five curriculum envelopes (frozen, graded),
   the background catalogue in docusign-shell-data.js, and whatever the visitor
   created or edited this session. Curriculum wins on id collision — a lesson
   must never be shadowed by scenery. */
function dsBaseEnvelopes() {
  return DS_ENVELOPES.concat(typeof DS_S_ENVELOPES !== 'undefined' ? DS_S_ENVELOPES : []);
}
function dsGetEnvelope(envId) {
  const base = dsBaseEnvelopes().find(e => e.id === envId);
  const ov = dsDemo.overrides[envId];
  if (!base && !ov) return null;
  if (!base && ov) return ov;   /* trainee-created envelope (from wizard) */
  if (!ov) return base;
  /* Merge: shallow scalars + deep recipients */
  const merged = Object.assign({}, base, ov);
  merged.recipients = (ov.recipients || base.recipients).map(r => Object.assign({}, r));
  merged.documents  = ov.documents || base.documents;
  merged.fields     = ov.fields || base.fields;
  return merged;
}
/* Everything the account holds: curriculum + background + anything created this
   session, with overrides applied and newest first.

   The sort matters more than it looks. Lesson 5's walkthrough targets the row
   for ENV-2026-9041, so that row has to stay near the top of an unfiltered list.
   Every background envelope is dated DS_TODAY-3 or older precisely so the five
   curriculum envelopes float above them. */
function dsAllEnvelopes() {
  const base = dsBaseEnvelopes();
  const baseIds = base.map(e => e.id);
  const createdIds = Object.keys(dsDemo.overrides).filter(id => baseIds.indexOf(id) === -1);
  return baseIds.concat(createdIds)
    .filter(id => !dsDemo.purged[id])
    .map(dsGetEnvelope)
    .filter(Boolean)
    .sort((a, b) => (a.createdDate < b.createdDate ? 1 : a.createdDate > b.createdDate ? -1 : 0));
}

/* Curriculum templates plus the catalogue plus any templates created this session.
   The three original ids are untouched because ds_c4_2 is graded off dsUseTemplate('TMPL-03'). */
function dsAllTemplates() {
  const base = DS_TEMPLATES.concat(typeof DS_S_TEMPLATES !== 'undefined' ? DS_S_TEMPLATES : []);
  const extra = (dsDemo && dsDemo.templates) ? dsDemo.templates : [];
  return base.concat(extra);
}
function dsSetEnvelopeOverride(envId, patch) {
  /* Demo state: no dsSave(). Envelope edits are meant to vanish on reload. */
  dsDemo.overrides[envId] = Object.assign(dsDemo.overrides[envId] || {}, patch);
}

/* ---------- Checklist marking (walkthrough-aware) ----------
   dsMark() is the ONLY write path for checklist items. Every call site must be an
   event handler, NEVER a render function — that was the v2 bug where 7 items auto-
   completed on navigation.

   The training gate: product mode and demo mode never grade. The 17 checklist
   triggers stay wired to exactly the same controls they always were — this gate
   decides whether the gesture counts, not where it lives. That is what makes
   this change safe: no call site moves. */
function dsMark(id) {
  /* Product mode and demo mode never grade. */
  if (!dsTrainingActive()) return;
  /* Suppress marks during engine-driven navigation (lesson step setup). */
  if (dsSuppressMarks) return;

  const alreadyDone = !!dsStore.checklist[id];
  if (!alreadyDone) {
    dsStore.checklist[id] = true;
    dsSave();
  }
  /* If the walkthrough is actively showing this step, it needs to hear about it
     even if the item was already done from a previous session. */
  const step = (SimEngine.walkActive()) ? SimEngine.currentStep() : null;
  const walkActiveOnThis = step && step.type === 'do' && step.checklistId === id;
  if (!alreadyDone || walkActiveOnThis) dsNotifyStepDone(id);
}

/* esc/escAttr are bound from the shared engine — the project keeps exactly one
   definition of each (assets/js/sim-engine.js). */
const esc = SimEngine.esc;
const escAttr = SimEngine.escAttr;

/* ---------- Icon set ----------
   Docusign's own UI uses no emoji anywhere, and emoji are the fastest tell that a
   screen is not the real product: every OS paints them differently, they carry
   their own colour, and they sit on a different baseline than the text beside them.
   These are stroke glyphs on a 24-unit grid, rendered at 16px in currentColor so
   they inherit whatever the surrounding text is doing. Same approach as QZ_ICONS in
   the Qualia module. */
const DS_ICONS = {
  check:       '<polyline points="20 6 9 17 4 12"/>',
  x:           '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  caret:       '<polyline points="6 9 12 15 18 9"/>',
  caretRight:  '<polyline points="9 18 15 12 9 6"/>',
  arrowLeft:   '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  arrowRight:  '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  folder:      '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  alert:       '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  mail:        '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>',
  edit:        '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  ban:         '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
  pen:         '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>',
  history:     '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>',
  download:    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  award:       '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
  chart:       '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  file:        '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  fileText:    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  inbox:       '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  send:        '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  trash:       '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  clock:       '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  xCircle:     '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  bulb:        '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.6 4.6 0 0 1 8.91 14"/>',
  calendar:    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  type:        '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  checkSquare: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  pin:         '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  search:      '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  play:        '<polygon points="5 3 19 12 5 21 5 3"/>',
  zap:         '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  users:       '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user:        '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  grid:        '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  settings:    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  shield:      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  key:         '<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3"/>',
  layers:      '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  bell:        '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  plus:        '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  filter:      '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  more:        '<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
  link:        '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  refresh:     '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  building:    '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01M12 6h.01M12 10h.01M12 14h.01"/>',
  copy:        '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  eye:         '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  printer:     '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  help:        '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  restore:     '<path d="M3 7v6h6"/><path d="M3.51 13a9 9 0 1 0 2.13-5.36L3 10"/>',
  archive:     '<rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"/><line x1="10" y1="13" x2="14" y2="13"/>',
  briefcase:   '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  home:        '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  /* Used by the lesson banner to signal "you are in a course". */
  book:        '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'
};

/* Inline SVG at text size. `cls` lets a caller colour or nudge one instance
   without duplicating the path data. */
function dsIcon(name, size, cls) {
  const d = DS_ICONS[name];
  if (!d) return '';
  const s = size || 16;
  return '<svg class="ds-ico' + (cls ? ' ' + cls : '') + '" width="' + s + '" height="' + s +
         '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
         'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>';
}

/* Status glyph for the agreements list. Unlike dsIcon these are filled discs with a
   knocked-out mark, which is how the 2024 list renders status — a stroke outline at
   this size reads as noise next to the label. */
const DS_STATUS_ICONS = {
  completed: '<circle cx="12" cy="12" r="10" fill="currentColor"/><polyline points="8 12.5 11 15.5 16.5 9" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  waiting:   '<circle cx="12" cy="12" r="10" fill="currentColor"/><polyline points="12 7 12 12 15.5 14" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  draft:     '<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3 3"/>',
  voided:    '<circle cx="12" cy="12" r="10" fill="currentColor"/><line x1="7.5" y1="7.5" x2="16.5" y2="16.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><line x1="16.5" y1="7.5" x2="7.5" y2="16.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
  declined:  '<circle cx="12" cy="12" r="10" fill="currentColor"/><line x1="7.5" y1="7.5" x2="16.5" y2="16.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><line x1="16.5" y1="7.5" x2="7.5" y2="16.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
  expired:   '<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="12" y1="7.5" x2="12" y2="12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="12" y1="16" x2="12" y2="16.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  deleted:   '<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  /* A shield, not a cross: an authentication failure is a security event, and it
     must not read as the same thing as a decline. */
  authfail:  '<path d="M12 2.6 4.2 5.4v6c0 5.2 7.8 9.9 7.8 9.9s7.8-4.7 7.8-9.9v-6z" fill="currentColor"/><line x1="12" y1="8" x2="12" y2="12.6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><line x1="12" y1="15.8" x2="12" y2="15.81" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>'
};
function dsStatusIcon(status, size) {
  const d = DS_STATUS_ICONS[status] || DS_STATUS_ICONS.draft;
  const s = size || 18;
  return '<svg class="ds-status-ico st-' + status + '" width="' + s + '" height="' + s +
         '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + d + '</svg>';
}

/* Monotonic counters, replacing three Math.random() id generators. A simulator
   whose ids change on every click cannot be screenshotted, and an audit trail
   keyed on a random id rewrites itself between repaints. */
let dsFieldSeq = 0;
let dsRecipSeq = 0;
let dsSentSeq = 0;

/* Certificate signature id, derived from the envelope and the signer so one
   certificate always shows one number. */
function dsSigId(envId, email) {
  const h = dsHashString(String(envId) + '|' + String(email));
  return 10000 + (h % 90000);
}

/* ---------- Deterministic option shuffling ----------
   Copied from the Qualia module's pattern: position is decided by a PRNG seeded on
   the item's id plus a per-session salt, so the same question keeps the same order
   while you look at it, but a different attempt shuffles differently. */
function dsHashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function dsMulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function dsShuffleSalt() {
  if (!dsStore.shuffleSalt) {
    /* Time-based only. The salt must differ between attempts so options get
       reshuffled, but it must not be Math.random(): the account has to be
       reproducible, and a stored timestamp already gives per-attempt variation. */
    dsStore.shuffleSalt = Date.now().toString(36);
    dsSave();
  }
  return dsStore.shuffleSalt;
}
function dsOptionOrder(itemId, n) {
  const rand = dsMulberry32(dsHashString(String(itemId) + '|' + dsShuffleSalt()));
  const order = [];
  for (let i = 0; i < n; i++) order.push(i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
  }
  return order;
}

/* ---------- Scenario Score ---------- */
/* Scored on FIRST attempts, not on the latest one. Retaking exists so a trainee can work out
   why they were wrong, which is worth encouraging — but with unlimited retries and 4 options,
   scoring the latest answer would make everyone a 100%. The number reported outward is
   therefore what they got right without help, and the retry UI says so explicitly. */
function dsScenarioScore() {
  let correct = 0, answered = 0;
  DS_SCENARIOS.forEach(s => {
    const r = dsStore.scenarios[s.id];
    if (r && r.firstAttempt) { answered++; if (r.firstAttempt.correct) correct++; }
  });
  return { correct, answered, total: DS_SCENARIOS.length };
}
function dsScenarioFirstAttemptCorrect(scenarioId) {
  const s = dsStore.scenarios[scenarioId];
  return !!(s && s.firstAttempt && s.firstAttempt.correct);
}

/* ---------- User sync ---------- */
function dsSyncUser() {
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const av = document.getElementById('dsUserAvatar');
  if (su && av) av.textContent = (su.avatar || su.name.charAt(0)).toUpperCase();
}


/* ---------- "Not in this demo" ----------
   One helper for every control the simulator shows but does not implement, so a
   click always answers with the same sentence instead of doing nothing. A dead
   button is the thing that most reliably breaks the illusion. */
function dsDemoAction(label) {
  simToast(label + ' is not available in this demo environment.');
}


/* ---------- Demo mode (?demo=1) ----------
   The link handed to a stakeholder. It hides the course scaffolding so the page
   reads purely as Docusign: no Lessons tab, no Final Exam, no lesson cards on
   Home. The "practice copy" strip stays — someone must never mistake this for a
   live account.

   Driven by a class on <body> rather than by deleting nodes, because the top bar
   and sidebar are re-rendered on navigation and removed nodes would come back. */
function dsDemoMode() {
  try { return new URLSearchParams(location.search).get('demo') === '1'; }
  catch (e) { return false; }
}

function dsApplyDemoMode() {
  if (!dsDemoMode()) return;
  document.body.classList.add('ds-demo');
  /* If a bookmarked URL lands on a training view, send it somewhere that exists
     in demo mode instead of showing a screen the visitor cannot navigate back to. */
  const TRAINING = ['lessons', 'scenarios', 'lesson', 'scenario-detail', 'triage',
                    'verify', 'compose', 'exam', 'complete-transaction', 'mailbox'];
  if (TRAINING.indexOf(dsState.view) > -1) dsGoto('dashboard');
}


/* ---------- Training-active gate ----------
   True only while the visitor is actually taking a lesson. Derived rather than
   stored: a second source of truth for "am I in a lesson" is a second thing that
   can go stale. The walkthrough answers for itself; dsState.lessonId covers the
   case where the trainee exits the walkthrough but keeps practising inside the
   lesson they opened. */
function dsTrainingActive() {
  if (dsDemoMode()) return false;
  return SimEngine.walkActive() || dsState.lessonId != null;
}

/* Set while the engine is repositioning the app for a lesson step. Navigation
   performed BY the course is not an achievement OF the trainee. With the M1 fix
   (no dsMark in dsGotoNow) this is belt-and-suspenders, but it costs nothing
   and closes the door for any future call site that might bypass the handlers. */
let dsSuppressMarks = false;

/* ---------- Type B: confirm before doing something irreversible ----------
   One modal for every destructive action, so "are you sure?" always looks and
   behaves the same. Options:
     title, body        what is about to happen and what it costs
     danger             red confirm button
     confirmLabel       verb, not "OK"
     reason             { label, min, placeholder } — when set, the confirm
                        button stays disabled until the text is long enough,
                        and the text is passed to onConfirm
     onConfirm(reason)  the actual effect

   The reason option is not decoration: DocuSign genuinely refuses to void an
   envelope without one, and a VA who learns to type a real reason here writes a
   better audit trail for the next person who opens the file. */
function dsConfirm(opts) {
  dsCloseConfirm();
  const needsReason = !!opts.reason;
  const min = (opts.reason && opts.reason.min) || 10;

  const wrap = document.createElement('div');
  wrap.className = 'ds-modal-backdrop';
  wrap.id = 'dsConfirmModal';
  wrap.innerHTML = `
    <div class="ds-modal ds-confirm" role="dialog" aria-modal="true" aria-labelledby="dsConfirmTitle">
      <div class="ds-confirm-head">
        <span class="ds-confirm-ico ${opts.danger ? 'danger' : ''}">${dsIcon(opts.danger ? 'alert' : 'help', 20)}</span>
        <h3 id="dsConfirmTitle">${esc(opts.title || 'Are you sure?')}</h3>
      </div>
      <div class="ds-confirm-body">
        ${opts.body ? `<p>${esc(opts.body)}</p>` : ''}
        ${opts.list && opts.list.length ? `<ul class="ds-confirm-list">${opts.list.map(x => '<li>' + esc(x) + '</li>').join('')}</ul>` : ''}
        ${needsReason ? `
          <label class="ds-confirm-reason">
            <span>${esc(opts.reason.label || 'Reason')}</span>
            <textarea id="dsConfirmReason" rows="3" placeholder="${escAttr(opts.reason.placeholder || '')}"
                      oninput="dsConfirmReasonInput(${min})"></textarea>
            <small id="dsConfirmHint">${min} characters minimum. This is recorded in the audit trail and shown to recipients.</small>
          </label>` : ''}
      </div>
      <div class="ds-confirm-foot">
        <button type="button" class="ds-btn" onclick="dsCloseConfirm()">Cancel</button>
        <button type="button" id="dsConfirmGo" class="ds-btn ${opts.danger ? 'danger-solid' : 'primary'}"
                ${needsReason ? 'disabled' : ''} onclick="dsConfirmGo()">${esc(opts.confirmLabel || 'Confirm')}</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  dsConfirmPending = opts;

  const ta = document.getElementById('dsConfirmReason');
  if (ta) ta.focus();
}

let dsConfirmPending = null;

/* Live length check. Disabling the button rather than rejecting on submit means
   the requirement is visible before you have typed anything. */
function dsConfirmReasonInput(min) {
  const ta = document.getElementById('dsConfirmReason');
  const go = document.getElementById('dsConfirmGo');
  const hint = document.getElementById('dsConfirmHint');
  if (!ta || !go) return;
  const n = ta.value.trim().length;
  go.disabled = n < min;
  if (hint) {
    hint.textContent = n < min
      ? (min - n) + ' more character' + (min - n === 1 ? '' : 's') + ' needed. This is recorded in the audit trail.'
      : 'Recorded in the audit trail and shown to recipients.';
    hint.classList.toggle('ok', n >= min);
  }
}

function dsConfirmGo() {
  const opts = dsConfirmPending;
  if (!opts) return;
  const ta = document.getElementById('dsConfirmReason');
  const reason = ta ? ta.value.trim() : '';
  dsCloseConfirm();
  if (opts.onConfirm) opts.onConfirm(reason);
}

function dsCloseConfirm() {
  const el = document.getElementById('dsConfirmModal');
  if (el) el.remove();
  dsConfirmPending = null;
}


/* ============================================================================
   TYPE A ACTIONS — things that really happen
   ============================================================================
   Every one of these mutates dsDemo and repaints, so the effect is visible
   immediately and gone after F5. They used to be toasts, which is the wrong
   answer for anything the simulator can actually do: a toast saying "restore is
   not available" next to a Restore button teaches a VA nothing.
   ============================================================================ */

/* ---------- Deleted: restore and purge ---------- */

/* Restoring puts the envelope back in the state it was in before deletion. The
   catalogue is immutable, so "before" is reconstructed: a deleted envelope whose
   recipients all signed was completed; anything else was still out. */
function dsRestoreEnvelope(envId) {
  const env = dsGetEnvelope(envId);
  if (!env) return;
  const signers = (env.recipients || []).filter(r => r.action !== 'Receives a Copy');
  const allSigned = signers.length > 0 && signers.every(r => r.status === 'completed' || r.status === 'signed');
  const restored = allSigned ? 'completed' : 'waiting';
  dsSetEnvelopeOverride(envId, { status: restored, statusNote: null });
  dsAddAuditLog(envId, 'Envelope Restored', { text: 'Restored from Deleted to ' + dsStatusLabel(restored) });
  const folder = dsDemo.folderMap[envId];
  simToast('"' + env.subject + '" restored' + (folder ? ' to ' + folder : '') + '.', { tone: 'good' });
  dsRenderRoot();
}

/* Purging is the one action with no undo, so it asks first. It is recorded as a
   tombstone rather than a status, because the catalogue cannot be edited — and
   because a purged envelope has to disappear from every list, not just Deleted. */
function dsConfirmPurge(envId) {
  const env = dsGetEnvelope(envId);
  if (!env) return;
  dsConfirm({
    title: 'Delete permanently?',
    body: '"' + env.subject + '" and its certificate of completion will be removed from this account. This cannot be undone, and it is the one action Docusign will not reverse for you either.',
    danger: true,
    confirmLabel: 'Delete permanently',
    onConfirm: () => {
      dsDemo.purged[envId] = true;
      simToast('Envelope permanently deleted.', { tone: 'good' });
      dsRenderRoot();
    }
  });
}

/* ---------- Clipboard ----------
   navigator.clipboard is local; no network is involved. The fallback matters
   because the API is unavailable on insecure origins, and a Copy button that
   silently does nothing is worse than one that admits it. */
function dsCopyLink(text) {
  const done = () => simToast('Link copied to clipboard.', { tone: 'good' });
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => dsCopyFallback(text, done));
      return;
    }
  } catch (e) { /* falls through */ }
  dsCopyFallback(text, done);
}
function dsCopyFallback(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.className = 'ds-offscreen';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  document.body.removeChild(ta);
  if (ok) done(); else simToast('Copy blocked by the browser. The link is ' + text);
}

/* ---------- Shared access ---------- */
function dsConfirmRevokeShare(name) {
  dsConfirm({
    title: 'Remove ' + name + "'s access?",
    body: name + ' will no longer be able to open or act on envelopes in this account. Anything they have already sent stays where it is, under their name.',
    danger: true,
    confirmLabel: 'Remove access',
    onConfirm: () => {
      dsDemo.revokedShares.push(name);
      simToast('Removed shared access for ' + name + '.', { tone: 'good' });
      dsRenderRoot();
    }
  });
}

/* ---------- Advanced search ----------
   Was a toast. It is now the panel it looks like: five fields that narrow the
   same list every other filter narrows, so nothing about the result is special-
   cased. */
function dsAdvActive() {
  const a = dsDemo.advanced || {};
  return !!(a.subject || a.sender || a.recipient || a.from || a.to || (a.status && a.status !== 'all'));
}
function dsToggleAdvanced() {
  dsState.advancedOpen = !dsState.advancedOpen;
  dsRenderRoot();
}
function dsAdvancedSet(key, value) {
  if (!dsDemo.advanced) dsDemo.advanced = {};
  dsDemo.advanced[key] = value;
  dsResetPage();
  dsRenderRoot();
}
function dsAdvancedClear() {
  dsDemo.advanced = {};
  dsResetPage();
  dsRenderRoot();
}
function dsAdvancedPanelHTML() {
  if (!dsState.advancedOpen) return '';
  const a = dsDemo.advanced || {};
  const statuses = ['all', 'completed', 'waiting', 'draft', 'voided', 'expired', 'declined', 'authfail', 'deleted'];
  return `
    <div class="ds-adv" role="region" aria-label="Advanced search">
      <div class="ds-adv-grid">
        <label>Subject contains
          <input type="text" value="${escAttr(a.subject || '')}" oninput="dsAdvancedSet('subject', this.value)">
        </label>
        <label>Sender
          <select class="ds-select" onchange="dsAdvancedSet('sender', this.value)">
            <option value="">Anyone</option>
            ${dsAccountSenders().map(s => `<option value="${escAttr(s)}" ${a.sender === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
          </select>
        </label>
        <label>Recipient name or email
          <input type="text" value="${escAttr(a.recipient || '')}" oninput="dsAdvancedSet('recipient', this.value)">
        </label>
        <label>Status
          <select class="ds-select" onchange="dsAdvancedSet('status', this.value)">
            ${statuses.map(s => `<option value="${s}" ${(a.status || 'all') === s ? 'selected' : ''}>${s === 'all' ? 'Any status' : esc(dsStatusLabel(s))}</option>`).join('')}
          </select>
        </label>
        <label>Created from
          <input type="date" value="${escAttr(a.from || '')}" max="${escAttr(DS_TODAY)}" onchange="dsAdvancedSet('from', this.value)">
        </label>
        <label>Created to
          <input type="date" value="${escAttr(a.to || '')}" max="${escAttr(DS_TODAY)}" onchange="dsAdvancedSet('to', this.value)">
        </label>
      </div>
      <div class="ds-adv-foot">
        <button type="button" class="ds-btn sm" onclick="dsAdvancedClear()">Reset fields</button>
        <button type="button" class="ds-btn sm" onclick="dsToggleAdvanced()">Close</button>
      </div>
    </div>`;
}

/* Distinct senders in the account, for the Sender pill and the advanced panel. */
function dsAccountSenders() {
  const seen = [];
  dsAllEnvelopes().forEach(e => { if (e.sender && seen.indexOf(e.sender) === -1) seen.push(e.sender); });
  return seen.sort();
}

/* ---------- Notifications ---------- */
function dsMarkNotifRead(id) {
  const n = (dsDemo.notifications || []).find(x => x.id === id);
  if (n) n.read = true;
}
function dsMarkAllNotifsRead() {
  (dsDemo.notifications || []).forEach(n => { n.read = true; });
  simToast('All notifications marked as read.', { tone: 'good' });
  dsRefreshNotifDot();
  const pop = document.getElementById('dsFloatingPopover');
  if (pop) pop.remove();
}
/* Clicking a notification does what clicking a notification should: it takes you
   to the thing it is about, and stops being unread. */
function dsOpenNotif(id) {
  const n = (dsDemo.notifications || []).find(x => x.id === id);
  const pop = document.getElementById('dsFloatingPopover');
  if (pop) pop.remove();
  if (!n) return;
  n.read = true;
  dsRefreshNotifDot();
  if (n.envId && dsGetEnvelope(n.envId)) dsOpenEnvelope(n.envId);
  else dsRenderRoot();
}
/* The red dot is a claim about unread state, so it has to be re-checked whenever
   that state changes rather than painted once at boot. */
function dsRefreshNotifDot() {
  const dot = document.getElementById('dsNotifDot');
  if (!dot) return;
  const unread = (dsDemo.notifications || []).filter(n => !n.read).length;
  dot.style.display = unread ? '' : 'none';
}

/* ---------- Sidebar behaviour ---------- */
function dsToggleSidebarGroup(groupId) {
  const g = document.getElementById(groupId);
  if (g) g.classList.toggle('collapsed');
}

/* "Show More" reveals the six secondary quick views and flips its own label. */
function dsToggleSidebarMore() {
  const g = document.getElementById('dsGrpEnvelopes');
  const btn = document.getElementById('dsSbMore');
  if (!g || !btn) return;
  const open = g.classList.toggle('expanded');
  btn.textContent = open ? 'Show Less' : 'Show More';
}

/* Sidebar quick views all land on the same list with a different filter, which is
   how the real product works — they are saved searches, not separate screens. */
function dsQuickView(filter) {
  dsState.envelopeFilter = filter;
  dsState.activeFolder = 'all';
  dsResetPage();
  dsGoto('envelopes');
}

/* Folders are demo state, so the list is painted rather than written into the
   shell — creating one has to show up without editing the HTML. */
function dsRenderSidebarFolders() {
  const ul = document.getElementById('dsSbFolders');
  if (!ul) return;
  const all = dsAllEnvelopes();
  const rows = (dsDemo.folders || []).map(f => {
    const n = all.filter(e => dsDemo.folderMap[e.id] === f).length;
    const on = dsState.activeFolder === f ? ' class="ds-active"' : '';
    return '<li><a' + on + ' onclick="dsSelectFolderView(\'' + escAttr(f) + '\')">' +
           dsIcon('folder', 17) + esc(f) +
           (n ? '<span class="ds-sb-count">' + n + '</span>' : '') + '</a></li>';
  }).join('');
  ul.innerHTML = rows +
    '<li><a onclick="dsCreateNewFolder()">' + dsIcon('plus', 17) + 'New Folder</a></li>';
}

function dsSelectFolderView(f) {
  dsState.activeFolder = f;
  dsState.envelopeFilter = 'all';
  dsResetPage();
  dsGoto('envelopes');
}

/* ---------- Mobile Sidebar Drawer ---------- */
function dsToggleSidebar(forced) {
  const sb = document.getElementById('dsSidebar');
  const bd = document.getElementById('dsSidebarBackdrop');
  if (!sb) return;
  const shouldOpen = typeof forced === 'boolean' ? forced : !sb.classList.contains('open');
  sb.classList.toggle('open', shouldOpen);
  if (bd) bd.classList.toggle('open', shouldOpen);
}

/* ---------- Navigation ---------- */
function dsOpenSent() {
  dsQuickView('sent');
  dsMark('ds_c5_1');
}

function dsOpenNewEnvelope() {
  dsGoto('new-envelope');
  dsMark('ds_c1_1');
}

function dsOpenEnvelope(envId) {
  dsGoto('envelope-detail', envId);
  dsMark('ds_env_open');
}

/* ds_c4_1 previously only fired from dsGotoNow, meaning ANY navigation to
   Templates — including lesson setup() calls — counted as having visited them.
   Now it fires only from this explicit handler, wired to the sidebar, top nav
   and the Home action card. */
function dsOpenTemplates() {
  dsGoto('templates');
  dsMark('ds_c4_1');
}

/* True once the wizard holds something the trainee typed rather than the
   defaults it opened with. Compared against a fresh default rather than a dirty
   flag, so undoing an edit correctly makes the wizard clean again. */
function dsWizardDirty() {
  if (dsState.view !== 'new-envelope') return false;
  const d = dsState.wizardData;
  if (!d) return false;
  const before = dsState.wizardBaseline;
  if (!before) return false;
  return JSON.stringify(d) !== before;
}

/* Leaving a half-built envelope should cost a confirmation, not a shrug. The
   Cancel button routes through here too, so there is one answer to "am I about
   to lose this?" wherever you leave from. */
function dsGoto(view, extraId) {
  if (dsWizardDirty() && view !== 'new-envelope' && !dsSkipWizardGuard) {
    dsConfirm({
      title: 'Discard this envelope?',
      body: 'You have changes in the sending wizard that have not been sent. Leaving now discards the documents, recipients and fields you set up.',
      danger: true,
      confirmLabel: 'Discard and leave',
      onConfirm: () => {
        dsResetWizard();
        dsSkipWizardGuard = true;
        dsGoto(view, extraId);
        dsSkipWizardGuard = false;
      }
    });
    return;
  }
  dsGotoNow(view, extraId);
}
let dsSkipWizardGuard = false;

function dsGotoNow(view, extraId) {
  dsToggleSidebar(false);
  if (dsDemoMode()) {
    const BLOCKED_IN_DEMO = ['lessons', 'scenarios', 'lesson', 'scenario-detail', 'triage',
                             'verify', 'compose', 'exam', 'complete-transaction', 'mailbox'];
    if (BLOCKED_IN_DEMO.indexOf(view) > -1) view = 'dashboard';
  }
  dsState.view = view;
  /* Page 1 on every arrival. Lesson 5 highlights a row in the agreements list,
     and a walkthrough pointing at page 3 would point at nothing. */
  /* M1 fix: navigation is navigation, not grading. The four dsMark() calls that
     used to live here auto-completed checklist items whenever ANY code path —
     including lesson setup() functions — navigated to these views. The marks now
     fire exclusively from the dsOpen*() event handlers above, which are wired to
     real user gestures. */
  if (view === 'envelopes')       { dsState.page = 1; }
  if (view === 'envelope-detail') { dsState.activeEnvId = extraId; }
  if (view === 'scenario-detail') dsState.activeScenarioId = extraId;
  if (view === 'triage')          dsState.activeTriageId = extraId;
  if (view === 'verify')          dsState.activeVerifyId = extraId;
  if (view === 'compose')         dsState.activeComposeId = extraId;
  if (view === 'lesson')          dsState.lessonId = extraId;
  dsSyncNav();
  dsRenderRoot();
  // Scroll main to top
  const main = document.querySelector('.ds-main');
  if (main) main.scrollTop = 0;
}

function dsSetFilter(f) {
  dsState.envelopeFilter = f;
  dsState.activeFolder = 'all';
  dsResetPage();
  // Don't navigate away if already in envelopes view
  if (dsState.view !== 'envelopes' && dsState.view !== 'envelope-detail') {
    dsGoto('envelopes');
  } else {
    dsRenderRoot();
  }
}

function dsRenderSidebar() {
  const sb = document.getElementById('dsSidebar');
  const layout = document.querySelector('.ds-layout');
  if (!sb) return;

  // View: Dashboard (Home) — No sidebar! (Screenshot 1)
  if (dsState.view === 'dashboard') {
    if (layout && layout.classList && layout.classList.add) layout.classList.add('no-sidebar');
    sb.style.display = 'none';
    return;
  }

  if (layout && layout.classList && layout.classList.remove) layout.classList.remove('no-sidebar');
  sb.style.display = '';

  // View: Templates & template-detail (Screenshot 3)
  if (dsState.view === 'templates' || dsState.view === 'template-detail') {
    const subView = dsState.tmplSubView || 'my';
    sb.innerHTML = `
      <button class="ds-new-btn" onclick="dsOpenTemplateBuilder()">
        <span class="ds-new-btn-label">Create Template</span>
      </button>

      <div class="ds-sb-group">
        <button type="button" class="ds-sb-grouphead">
          <svg class="ds-sb-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          <span>Envelope Templates</span>
        </button>
        <ul class="ds-sidebar-nav">
          <li><a class="${subView === 'my' ? 'ds-active' : ''}" onclick="dsSetTmplSubView('my')">
            ${dsIcon('user', 15)} My Templates
          </a></li>
          <li><a class="${subView === 'shared' ? 'ds-active' : ''}" onclick="dsSetTmplSubView('shared')">
            ${dsIcon('users', 15)} Shared with Me
          </a></li>
          <li><a class="${subView === 'favs' ? 'ds-active' : ''}" onclick="dsSetTmplSubView('favs')">
            ${dsIcon('star', 15)} Favorites
          </a></li>
          <li><a style="color:var(--ds24-muted); font-size:13px;" onclick="simToast('Displaying all available template folders.')">
            Show More
          </a></li>
        </ul>
      </div>

      <div style="height:1px;background:var(--ds26-hairline);margin:10px 16px;"></div>

      <ul class="ds-sidebar-nav">
        <li><a onclick="simToast('Workflow Templates: Multi-stage orchestrations.')" style="display:flex;align-items:center;">
          ${dsIcon('layers', 15)} Workflow Templates
          <span class="ds-tmpl-badge-new" style="margin-left:auto;">NEW</span>
        </a></li>
        <li><a onclick="simToast('Template Gallery: Browse industry-standard packages.')" style="display:flex;align-items:center;">
          ${dsIcon('grid', 15)} Template Gallery
          <span class="ds-tmpl-badge-new" style="margin-left:auto;">NEW</span>
        </a></li>
      </ul>

      <!-- Training pinned at bottom -->
      <div class="ds-sb-training" id="dsSbTraining">
        <div class="ds-sidebar-label">Training</div>
        <ul class="ds-sidebar-nav flush">
          <li><a onclick="dsGoto('lessons')" id="sb-scenarios">
            ${dsIcon('book', 15)} Lessons
          </a></li>
          <li><a onclick="dsGoto('complete-transaction')" id="sb-exam">
            ${dsIcon('award', 15)} Final Exam
          </a></li>
        </ul>
      </div>`;
    return;
  }

  // View: Reports (Screenshot 4)
  if (dsState.view === 'reports') {
    const selectedDash = dsState.reportDash || 'admin';
    sb.innerHTML = `
      <div class="ds-sb-group">
        <div class="ds-sb-grouphead" style="cursor:default;">
          <span>DASHBOARDS</span>
        </div>
        <ul class="ds-sidebar-nav">
          <li><a class="${selectedDash === 'my' ? 'ds-active' : ''}" onclick="dsSetReportDash('my')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>
            My dashboard
          </a></li>
          <li><a class="${selectedDash === 'admin' ? 'ds-active' : ''}" onclick="dsSetReportDash('admin')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>
            Administrator dashboard
          </a></li>
        </ul>
      </div>

      <div style="height:1px;background:var(--ds26-hairline);margin:10px 16px;"></div>

      <div class="ds-sb-group">
        <div class="ds-sb-grouphead" style="cursor:default;">
          <span>REPORT TYPE</span>
        </div>
        <ul class="ds-sidebar-nav">
          <li><a onclick="simToast('All Reports (17 total)')">
            ${dsIcon('caretRight', 12)} All (17)
          </a></li>
          <li><a onclick="simToast('Envelope Reports (8 total)')">
            ${dsIcon('caretRight', 12)} Envelope (8)
          </a></li>
          <li><a onclick="simToast('Recipient Reports (2 total)')">
            ${dsIcon('caretRight', 12)} Recipient (2)
          </a></li>
          <li><a onclick="simToast('Usage Reports (7 total)')">
            ${dsIcon('caretRight', 12)} Usage (7)
          </a></li>
          <li><a style="padding-left:32px;" onclick="simToast('Custom Reports (0 created)')">
            Custom (0)
          </a></li>
          <li><a style="padding-left:32px;" onclick="simToast('Report Downloads Queue')">
            Downloads
          </a></li>
        </ul>
      </div>

      <!-- Training pinned at bottom -->
      <div class="ds-sb-training" id="dsSbTraining">
        <div class="ds-sidebar-label">Training</div>
        <ul class="ds-sidebar-nav flush">
          <li><a onclick="dsGoto('lessons')" id="sb-scenarios">
            ${dsIcon('book', 15)} Lessons
          </a></li>
          <li><a onclick="dsGoto('complete-transaction')" id="sb-exam">
            ${dsIcon('award', 15)} Final Exam
          </a></li>
        </ul>
      </div>`;
    return;
  }

  // View: Agreements & other views (Screenshots 2 & 5)
  const folders = (dsDemo.folders || []).map(f => {
    const active = dsState.activeFolder === f;
    const count = (dsAllEnvelopes() || []).filter(e => dsDemo.folderMap[e.id] === f).length;
    return `<li><a class="${active ? 'ds-active' : ''}" onclick="dsOpenFolder('${escAttr(f)}')">${dsIcon('folder', 14)} ${esc(f)} <span class="ds-badge ds-badge-xs">${count}</span></a></li>`;
  }).join('');

  sb.innerHTML = `
    <button class="ds-new-btn" onclick="dsOpenNewEnvelope()">
      <span class="ds-new-btn-label">Start Now</span>
      <span class="ds-new-btn-caret" id="dsStartCaret"></span>
    </button>

    <div class="ds-sb-group" id="dsGrpEnvelopes">
      <button type="button" class="ds-sb-grouphead" onclick="dsToggleSidebarGroup('dsGrpEnvelopes')">
        <svg class="ds-sb-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/></svg>
        <span>Envelopes</span>
      </button>

      <ul class="ds-sidebar-nav">
        <li><a onclick="dsQuickView('inbox')" id="sb-inbox">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
          Inbox
        </a></li>
        <li><a onclick="dsOpenSent()" id="sb-sent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Sent
        </a></li>
        <li><a onclick="dsQuickView('completed')" id="sb-completed">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Completed
        </a></li>
        <li><a onclick="dsQuickView('action')" id="sb-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Action Required
        </a></li>
        <li class="ds-sb-more-row">
          <button type="button" class="ds-sb-more-btn" id="dsSbMoreBtn" onclick="dsToggleSidebarMore()">
            ${dsState.sidebarMoreExpanded ? 'Show Less' : 'Show More'}
          </button>
        </li>
      </ul>

      <ul class="ds-sidebar-nav ds-sb-extra${dsState.sidebarMoreExpanded ? ' expanded' : ''}" id="dsSbExtra">
        <li><a onclick="dsQuickView('draft')" id="sb-drafts">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Drafts
        </a></li>
        <li><a onclick="dsQuickView('deleted')" id="sb-deleted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Deleted
        </a></li>
        <li><a onclick="dsQuickView('waiting')" id="sb-waiting">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Waiting for Others
        </a></li>
        <li><a onclick="dsQuickView('expired')" id="sb-expiring">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Expiring Soon
        </a></li>
        <li><a onclick="dsQuickView('authfail')" id="sb-authfail">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          Authentication Failed
        </a></li>
        <li><a onclick="dsQuickView('bulk')" id="sb-bulk">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Bulk Send
        </a></li>
      </ul>
    </div>

    <div class="ds-sb-group" id="dsGrpFolders">
      <button type="button" class="ds-sb-grouphead" onclick="dsToggleSidebarGroup('dsGrpFolders')">
        <svg class="ds-sb-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <span>Folders</span>
      </button>
      <ul class="ds-sidebar-nav" id="dsFolderList">
        ${folders}
      </ul>
    </div>

    <ul class="ds-sidebar-nav">
      <li><a onclick="dsGoto('powerforms')" id="sb-powerforms">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        PowerForms
      </a></li>
      <li><a onclick="dsGoto('mailbox')" id="sb-mailbox">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>
        VA Mailbox
        <span class="ds-sidebar-badge" id="dsSbMailBadge" style="display:none;"></span>
      </a></li>
    </ul>

    <div class="ds-sb-training" id="dsSbTraining">
      <div class="ds-sidebar-label">Training</div>
      <ul class="ds-sidebar-nav flush">
        <li><a onclick="dsGoto('lessons')" id="sb-scenarios">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          Lessons
        </a></li>
        <li><a onclick="dsGoto('complete-transaction')" id="sb-exam">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/></svg>
          Final Exam
        </a></li>
      </ul>
    </div>`;
}

function dsSyncNav() {
  // 1. Render appropriate sidebar for active view
  dsRenderSidebar();

  // 2. Top nav tabs
  document.querySelectorAll('.ds-topnav-item').forEach(el => {
    const v = el.dataset.view;
    /* The Lessons tab stays lit for every view a lesson step can navigate to, so the trainee
       always knows they are inside the course rather than loose in the product. */
    const LESSON_VIEWS = ['lessons', 'scenarios', 'lesson', 'scenario-detail', 'triage', 'verify', 'compose'];
    /* Product views that are reached from the sidebar rather than the top nav still
       belong under Agreements — otherwise every one of them unlights the whole bar. */
    const AGREEMENT_VIEWS = ['envelope-detail', 'new-envelope', 'deleted', 'bulk-send',
                             'powerforms', 'shared-access', 'signer-experience'];
    if (v === 'templates' && dsState.view === 'template-detail') { el.classList.add('active'); return; }
    const active = v === dsState.view
      || (v === 'envelopes' && AGREEMENT_VIEWS.indexOf(dsState.view) > -1)
      || (v === 'lessons' && LESSON_VIEWS.indexOf(dsState.view) > -1);
    el.classList.toggle('active', !!active);
  });

  // 3. Sidebar links — remove all active, then set exactly one
  document.querySelectorAll('.ds-sidebar-nav a').forEach(el => el.classList.remove('ds-active'));

  /* Views that map to a fixed entry. The agreements list is deliberately absent:
     which sidebar row it lights depends on the active filter, handled below. */
  const map = {
    'new-envelope':   'sb-sent',
    'envelope-detail':'sb-sent',
    'mailbox':        'sb-mailbox',
    'templates':      'sb-templates',
    'template-detail':'sb-templates',
    'powerforms':     'sb-powerforms',
    'deleted':        'sb-deleted',
    'bulk-send':      'sb-bulk',
    'lessons':        'sb-scenarios',
    'scenarios':      'sb-scenarios',
    'scenario-detail':'sb-scenarios',
    'triage':         'sb-scenarios',
    'verify':         'sb-scenarios',
    'compose':        'sb-scenarios',
    'lesson':         'sb-scenarios',
    'exam':           'sb-exam',
    'complete-transaction': 'sb-exam'
  };
  const FILTER_ROW = {
    inbox: 'sb-inbox', completed: 'sb-completed', action: 'sb-action',
    draft: 'sb-drafts', waiting: 'sb-waiting', expired: 'sb-expiring',
    authfail: 'sb-authfail', sent: 'sb-sent'
    /* `all` is deliberately absent. It used to map to 'sb-sent', which lit the
       Sent row while the heading read "All Agreements" — two claims about where
       you are, disagreeing. There is no All Agreements row in the sidebar (the
       real product starts at Inbox), so the honest answer is to light nothing.
       The `if (id)` below already handles a missing key. */
  };
  let id = map[dsState.view];
  if (dsState.view === 'envelopes') {
    id = (dsState.activeFolder && dsState.activeFolder !== 'all') ? null : FILTER_ROW[dsState.envelopeFilter];
  }
  if (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('ds-active');
  }

  // Update Mailbox unread count badges
  const unreadCount = typeof dsUnreadEmailCount === 'function' ? dsUnreadEmailCount() : 0;
  const topBadge = document.getElementById('dsTopMailBadge');
  const sbBadge = document.getElementById('dsSbMailBadge');
  if (topBadge) {
    topBadge.textContent = unreadCount ? String(unreadCount) : '';
    topBadge.style.display = unreadCount ? 'inline-block' : 'none';
  }
  if (sbBadge) {
    sbBadge.textContent = unreadCount ? String(unreadCount) : '';
    sbBadge.style.display = unreadCount ? 'inline-block' : 'none';
  }

  dsRenderSidebarFolders();
}

function dsToggleSidebarMore() {
  dsState.sidebarMoreExpanded = !dsState.sidebarMoreExpanded;
  const extra = document.getElementById('dsSbExtra');
  const btn = document.getElementById('dsSbMoreBtn') || document.getElementById('dsSbMore');
  if (extra) extra.classList.toggle('expanded', dsState.sidebarMoreExpanded);
  if (btn) btn.textContent = dsState.sidebarMoreExpanded ? 'Show Less' : 'Show More';
}

function dsToggleSidebarGroup(id) {
  const grp = document.getElementById(id);
  if (grp) grp.classList.toggle('collapsed');
}

/* ---------- Lesson banner ----------
   Visible across ALL views while a lesson is active. Tells the trainee which
   lesson they are in, how far they are, and gives them a one-click exit.
   Progress is persisted as you go, so clicking Exit never loses work. */
function dsRenderLessonBanner() {
  const el = document.getElementById('dsLessonBanner');
  if (!el) return;
  const lid = dsState.lessonId;
  const les = lid ? DS_LESSONS.find(x => x.id === lid) : null;
  if (!les) {
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  const prog = SimEngine.progress(les);
  const total = prog.total;
  const done = prog.done;
  const title = `Lesson ${les.number} — ${les.title}`;
  let stepInfo = `${done} of ${total} steps complete`;
  if (dsState.view === 'exam' || dsState.view === 'complete-transaction') {
    stepInfo = 'Practical Final Exam';
  }

  el.innerHTML = `
    <div class="ds-lesson-banner-inner">
      <div class="ds-lesson-banner-info">
        ${dsIcon('book', 15)}
        <span class="ds-lesson-banner-title">${title}</span>
        ${stepInfo ? `<span class="ds-lesson-banner-step">${stepInfo}</span>` : ''}
      </div>
      <div class="ds-lesson-banner-actions">
        ${lid ? `<button type="button" class="ds-btn sm ds-banner-btn" onclick="dsGoto('lesson', '${escAttr(lid)}')">Back to lesson</button>` : ''}
        <button type="button" class="ds-btn sm ds-banner-btn exit" onclick="dsExitLesson()">Exit lesson</button>
      </div>
    </div>`;
}

/* Leaves lesson mode: clears lessonId, silently exits any active walkthrough,
   and returns to the product dashboard. Progress is already persisted. */
function dsExitLesson() {
  dsState.lessonId = null;
  if (SimEngine.walkActive()) SimEngine.exit(true);
  dsGoto('dashboard');
  simToast('Lesson exited. Your progress is saved.', { tone: 'good' });
}

function dsRenderRoot() {
  const root = document.getElementById('dsRoot');
  if (!root) return;
  const views = {
    'dashboard':           dsDashboardHTML,
    'envelopes':           dsEnvelopesHTML,
    'envelope-detail':     dsEnvelopeDetailHTML,
    'new-envelope':        dsNewEnvelopeWizardHTML,
    'mailbox':             dsMailboxHTML,
    'templates':           dsTemplatesHTML,
    'reports':             dsReportsHTML,
    'settings':            dsSettingsHTML,
    'signer-experience':   dsSignerExperienceHTML,
    'deleted':             dsDeletedHTML,
    'bulk-send':           dsBulkSendHTML,
    'powerforms':          dsPowerFormsHTML,
    'shared-access':       dsSharedAccessHTML,
    'template-detail':     dsTemplateDetailHTML,
    'lessons':             dsLessonsHTML,
    /* 'scenarios' is kept as an alias rather than deleted: the intro tour and any bookmarked
       state still reference it, and silently landing on "View not found" would be worse than
       redirecting to the view that superseded it. */
    'scenarios':           dsLessonsHTML,
    'scenario-detail':     dsScenarioDetailHTML,
    'triage':              dsTriageHTML,
    'verify':              dsVerifyHTML,
    'compose':             dsComposeHTML,
    'lesson':              dsLessonDetailHTML,
    'exam':                dsExamHTML,
    'complete-transaction':dsExamHTML
  };
  root.innerHTML = (views[dsState.view] || (() => '<p>View not found.</p>'))();
  /* Keep the lesson banner in sync after every render. */
  dsRenderLessonBanner();
}


/* One lesson card grid, shared by Home and the Lessons view — previously Home was the only
   place the 10 lessons could be opened from, which is why the lesson-level controls (Try It,
   Replay walkthrough, Restart this lesson) were so hard to find. Markup uses classes rather
   than inline styles so the card can be restyled from docusign.css. */
function dsLessonCardsHTML() {
  return DS_LESSONS.map((l, i) => {
    const state = SimEngine.lessonState(i);
    const prog = SimEngine.progress(l);
    const pct = prog.total ? Math.round(prog.done / prog.total * 100) : 0;
    const locked = state === 'locked';
    const badge = state === 'done' ? 'Done' : (locked ? 'Locked' : 'Unlocked');
    const badgeClass = state === 'done' ? 'completed' : (locked ? 'expired' : 'waiting');
    /* A locked card carries no click handler at all, rather than one that silently does
       nothing: SimEngine.openLesson already refuses locked lessons, but a card that reacts
       to the cursor and then does not open reads as a broken button. */
    const click = locked ? '' : `onclick="SimEngine.openLesson('${escAttr(l.id)}')"`;
    return `
      <div class="ds-lesson-card ${state}" ${click}>
        <div class="lc-head">
          <div>
            <span class="lc-eyebrow">LESSON ${l.number}</span>
            <h4>${esc(l.title)}</h4>
          </div>
          <span class="ds-badge ${badgeClass}">${badge}</span>
        </div>
        <p class="lc-summary">${esc(l.summary)}</p>
        <div class="lc-foot">
          <div class="ds-bar"><i style="width:${pct}%"></i></div>
          <span class="lc-frac">${prog.done}/${prog.total}</span>
        </div>
      </div>`;
  }).join('');
}

/* The Lessons view: the curriculum's actual home.
   Replaces the old "Scenario Challenges" tab, which listed 5 loose scenarios that were ALL
   already steps inside lessons — a second, ungraded path to the same content. Answering one
   there advanced no lesson (it opened scenario-detail with no lesson context, so the
   Continue button could never appear), and its cards reported status from the LAST attempt
   while the score beside them counted FIRST attempts, so the two contradicted each other. */
function dsLessonsHTML() {
  const total = DS_LESSONS.length;
  const done = DS_LESSONS.filter((l, i) => SimEngine.lessonState(i) === 'done').length;
  return `
    <div class="ds-listhead">
      <div>
        <h2 class="ds-page-title">Lessons</h2>
        <div class="sub">Work them in order — each one unlocks the next. Open a lesson to run its walkthrough or restart it.</div>
      </div>
      <div class="ds-lessons-score">${done} of ${total} complete</div>
    </div>
    <div class="ds-lesson-grid">${dsLessonCardsHTML()}</div>`;
}

/* ==================== DASHBOARD ==================== */
/* ---------- Home ----------
   No 2024 reference exists for this screen, so it is an extension of the capture's
   language rather than a copy of anything: the same 34px title, the same rounded
   pills and hairline cards, the same restraint about colour.

   M5 fix: the old training block (10 lesson cards + checklists + scenario score)
   is replaced by a slim entry strip with a single CTA. Home is product, not course.
   In ?demo=1 even the strip is hidden so a stakeholder link reads purely as Docusign. */
function dsDashboardHTML() {
  const su   = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  const name = su ? su.name : (dsDemo.user.name || 'Gerald Aburto');
  const demo = dsDemoMode();

  /* ---- training entry (hidden in demo mode and during a lesson) ---- */
  let training = '';
  if (!demo && !dsTrainingActive()) {
    training = `
      <div class="ds-training-entry">
        <span>${dsIcon('book', 16)} SkillCloud training &mdash; 10 lessons and a final exam</span>
        <button type="button" class="ds-btn sm" onclick="dsGoto('lessons')">Open training</button>
      </div>`;
  }

  return `
    <!-- The "You have 4 Invites available / Invite now." banner used to sit here.
         It is seat-upsell chrome a Docusign trial shows a new account, in the
         same family as Buy Now and the Get started strip. Removed for the same
         reason: the module teaches the working product. -->

    <!-- Purple Hero Header -->
    <div class="ds-home-hero">
      <h1 class="ds-hero-title">Welcome, ${esc(name)}</h1>
      <div class="ds-hero-actions">
        <button type="button" class="ds-hero-start-btn" onclick="dsOpenNewEnvelope()">
          Start <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <button type="button" class="ds-hero-pill-btn" onclick="dsOpenNewEnvelope()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Get Signatures
        </button>
        <button type="button" class="ds-hero-pill-btn" onclick="simToast('Sign Document: Upload and apply personal signature.')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Sign Document
        </button>
        <button type="button" class="ds-hero-pill-btn" onclick="dsOpenTemplates()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          Use Envelope Template
        </button>
      </div>
    </div>

    <!-- First Document Section (Screenshot 1) -->
    <div class="ds-home-first-doc">
      <div class="ds-first-doc-art">
        <svg width="150" height="130" viewBox="0 0 150 130" fill="none">
          <rect x="25" y="35" width="80" height="85" rx="8" fill="#e0e7ff"/>
          <rect x="35" y="20" width="60" height="80" rx="6" fill="#4338ca"/>
          <rect x="15" y="45" width="80" height="75" rx="8" fill="#ffffff" stroke="#c7d2fe" stroke-width="2"/>
          <line x1="28" y1="65" x2="68" y2="65" stroke="#a5b4fc" stroke-width="3" stroke-linecap="round"/>
          <line x1="28" y1="75" x2="58" y2="75" stroke="#c7d2fe" stroke-width="3" stroke-linecap="round"/>
          <line x1="28" y1="85" x2="72" y2="85" stroke="#c7d2fe" stroke-width="3" stroke-linecap="round"/>
          <g transform="translate(65, 40) rotate(45)">
            <rect x="0" y="0" width="14" height="75" rx="4" fill="#6366f1"/>
            <polygon points="0,75 14,75 7,88" fill="#312e81"/>
          </g>
        </svg>
      </div>
      <div class="ds-first-doc-text">
        <h2>Send your first document for signature</h2>
        <p>Ready to streamline your agreement process? Sending an envelope helps you collect secure signatures and move your documents forward with confidence.</p>
        <a class="ds-first-doc-link" onclick="dsOpenNewEnvelope()">Get Signatures</a>
      </div>
    </div>

    <!-- Promo cards. The "Ready to upgrade? / View Plans" card that used to sit
         first is gone — that one is trial upsell. The help card stays: it points
         at product documentation, which a working account does show. -->
    <div class="ds-home-promo-grid">
      <div class="ds-promo-card">
        <div class="ds-promo-ico" style="background:#ede9fe;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4338ca" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        </div>
        <div class="ds-promo-info">
          <b>Need help getting started?</b>
          <span>Get help with basic questions. <a onclick="simToast('View Our Guide')">View Our Guide</a></span>
        </div>
      </div>
    </div>

    ${training}`;
}


/* ==================== MANAGE / AGREEMENTS VIEW (DOCUSIGN 2-COLUMN) ==================== */
/* ---------- Quick views ----------
   Docusign's sidebar entries are saved filters over one list, not separate screens,
   so they are defined as predicates here and the list renders exactly once. The
   titles double as the big page heading, which is what the 2024 layout shows. */
const DS_QUICK_VIEWS = {
  all:       { title: 'All Agreements',        match: e => e.status !== 'deleted' },
  inbox:     { title: 'Inbox',                 match: e => e.status !== 'deleted' && e.status !== 'draft' },
  sent:      { title: 'Sent',                  match: e => e.status !== 'deleted' && /alex|va/i.test(e.sender || '') },
  completed: { title: 'Completed',             match: e => e.status === 'completed' },
  /* "Action Required" means the envelope is stuck on something the VA has to fix —
     a bounce, an expiry — not merely that it is open. That is also exactly the set
     Lesson 5 asks them to triage. */
  action:    { title: 'Action Required',       match: e => !!e.statusNote || e.status === 'expired' || e.status === 'declined' || e.status === 'authfail' },
  draft:     { title: 'Drafts',                match: e => e.status === 'draft' },
  waiting:   { title: 'Waiting for Others',    match: e => e.status === 'waiting' },
  /* "Expiring Soon" used to match every waiting OR already-expired envelope,
     which made it a synonym for two other views and named neither of them
     correctly. It means what it says: still out for signature, and the clock
     runs out within a week. Already-expired envelopes belong to Action Required. */
  expired:   { title: 'Expiring Soon',         match: e => e.status === 'waiting' && dsDaysUntil(e.closingDate) >= 0 && dsDaysUntil(e.closingDate) <= 7 },
  authfail:  { title: 'Authentication Failed', match: e => e.status === 'authfail' },
  deleted:   { title: 'Deleted',               match: e => e.status === 'deleted' },
  voided:    { title: 'Voided',                match: e => e.status === 'voided' }
};

/* Whole days from DS_TODAY to an ISO date. Negative means already past. */
function dsDaysUntil(iso) {
  if (!iso) return Infinity;
  const [y, m, d] = String(iso).split('-').map(Number);
  const [ty, tm, td] = DS_TODAY.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
}

/* Months back from DS_TODAY, as a plain YYYY-MM-DD comparison. String compare is
   safe here because every date in the data is zero-padded ISO. */
function dsDateFloor(months) {
  const [y, m, d] = DS_TODAY.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() - months);
  return dt.toISOString().slice(0, 10);
}
const DS_DATE_FILTERS = {
  '30d': { label: 'Last 30 days',  floor: () => dsDateFloor(1) },
  '6m':  { label: 'Last 6 months', floor: () => dsDateFloor(6) },
  '12m': { label: 'Last 12 months',floor: () => dsDateFloor(12) },
  'all': { label: 'All time',      floor: () => '0000-00-00' }
};

/* The set of envelopes the current filters resolve to. Split out from the markup so
   the row menu, the select-all box and the empty state all agree on one list. */
function dsFilteredEnvelopes() {
  const all = dsAllEnvelopes();
  const folder = dsState.activeFolder || 'all';
  const query = (dsState.searchQuery || '').trim().toLowerCase();
  const view = DS_QUICK_VIEWS[dsState.envelopeFilter] || DS_QUICK_VIEWS.all;
  const floor = (DS_DATE_FILTERS[dsState.dateFilter] || DS_DATE_FILTERS['6m']).floor();
  const sender = dsState.senderFilter || 'all';
  const statusF = dsState.statusFilter || '';

  return all.filter(e => {
    /* A custom folder overrides the quick view: you picked a folder, you want its
       contents, not the intersection with whatever filter was left selected. */
    if (folder !== 'all') { if (dsDemo.folderMap[e.id] !== folder) return false; }
    else if (!view.match(e)) return false;

    if ((e.createdDate || '') < floor) return false;
    if (sender !== 'all' && e.sender !== sender) return false;

    /* F7: Status popover filter */
    if (statusF) {
      if (statusF === 'completed' && e.status !== 'completed') return false;
      if (statusF === 'declined' && e.status !== 'declined') return false;
      if (statusF === 'voided' && e.status !== 'voided') return false;
      if (statusF === 'in_progress' && !['waiting', 'sent', 'action', 'expired', 'authfail'].includes(e.status)) return false;
    }

    if (query) {
      const hay = [e.subject, e.id, e.sender, e.type]
        .concat((e.recipients || []).map(r => r.name + ' ' + r.email))
        .join(' ').toLowerCase();
      if (hay.indexOf(query) === -1) return false;
    }

    /* Advanced search stacks on top of everything above rather than replacing
       it — that is what "advanced" means in the real product, and it is why the
       Clear link has to reset both. */
    const a = dsDemo.advanced || {};
    if (a.subject && (e.subject || '').toLowerCase().indexOf(a.subject.toLowerCase()) === -1) return false;
    if (a.sender && e.sender !== a.sender) return false;
    if (a.status && a.status !== 'all' && e.status !== a.status) return false;
    if (a.recipient) {
      const needle = a.recipient.toLowerCase();
      const hit = (e.recipients || []).some(r =>
        (r.name || '').toLowerCase().indexOf(needle) > -1 || (r.email || '').toLowerCase().indexOf(needle) > -1);
      if (!hit) return false;
    }
    if (a.from && (e.createdDate || '') < a.from) return false;
    if (a.to && (e.createdDate || '') > a.to) return false;

    return true;
  });
}

function dsEnvelopesHTML() {
  const folder = dsState.activeFolder || 'all';
  const filtered = dsFilteredEnvelopes();
  const view = DS_QUICK_VIEWS[dsState.envelopeFilter] || DS_QUICK_VIEWS.all;
  const title = folder !== 'all' ? folder : view.title;

  const dateKey = dsState.dateFilter || '6m';
  const senders = dsAccountSenders();
  const senderKey = dsState.senderFilter || 'all';
  const statusKey = dsState.statusFilter || '';
  const selected = dsDemo.selected || [];
  const dirty = !!(dsState.searchQuery || senderKey !== 'all' || dateKey !== '6m' || statusKey ||
                   dsState.envelopeFilter !== 'all' || folder !== 'all' || dsAdvActive());

  /* Page slice. `filtered` stays whole above this line because select-all and the
     result count both need the full set, not the visible window. */
  const pageSize = dsState.pageSize || 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, dsState.page || 1), pageCount);
  const firstRow = (page - 1) * pageSize;
  const visible = filtered.slice(firstRow, firstRow + pageSize);

  const rows = visible.map(e => {
    const note = dsDemo.folderMap[e.id];
    const isSel = selected.indexOf(e.id) > -1;
    return `
      <tr class="link" data-env-id="${esc(e.id)}" onclick="dsOpenEnvelope('${escAttr(e.id)}')">
        <td class="col-check" onclick="event.stopPropagation();">
          <input type="checkbox" class="ds-agr-check" ${isSel ? 'checked' : ''}
                 aria-label="Select ${escAttr(e.subject)}"
                 onchange="dsToggleSelect('${escAttr(e.id)}')">
        </td>
        <td>
          <div class="ds-agr-subject">${esc(e.subject)}${note ? `<span class="ds-agr-folder">${dsIcon('folder', 12)}${esc(note)}</span>` : ''}</div>
          <div class="ds-agr-from">From: ${esc(e.sender)}</div>
          ${e.statusNote ? `<div class="ds-agr-note">${dsIcon('alert', 13)}${esc(e.statusNote)}</div>` : ''}
        </td>
        <td>
          <span class="ds-agr-status">${dsStatusIcon(e.status)}${esc(dsStatusLabel(e.status))}</span>
        </td>
        <td class="ds-agr-menu" onclick="event.stopPropagation();">
          <div class="ds-row-actions-wrap" id="dsActionWrap_${esc(e.id)}">
            <button type="button" aria-label="More actions" title="More actions"
                    onclick="dsToggleRowActionMenu('${escAttr(e.id)}', event)">${dsIcon('more', 18)}</button>
            <div class="ds-row-actions-menu" id="dsActionMenu_${esc(e.id)}">
              <div class="ds-row-action-item" onclick="dsViewEnvelopeDoc('${escAttr(e.id)}', 0)">${dsIcon('eye')} View Documents</div>
              ${e.status === 'draft' ? `<div class="ds-row-action-item" onclick="dsResumeDraft('${escAttr(e.id)}')">${dsIcon('edit')} Continue Editing</div>` : ''}
              ${e.status === 'waiting' ? `<div class="ds-row-action-item" onclick="dsActionResend('${escAttr(e.id)}')">${dsIcon('mail')} Send Reminder</div>` : ''}
              ${e.status === 'waiting' ? `<div class="ds-row-action-item" onclick="dsActionCorrect('${escAttr(e.id)}')">${dsIcon('edit')} Correct</div>` : ''}
              ${e.status === 'waiting' ? `<div class="ds-row-action-item danger" onclick="dsActionVoid('${escAttr(e.id)}')">${dsIcon('ban')} Void</div>` : ''}
              ${e.status === 'waiting' ? `<div class="ds-row-action-item" onclick="dsSimulateSigner('${escAttr(e.id)}')">${dsIcon('pen')} Simulate Signer View</div>` : ''}
              ${e.status === 'completed' ? `<div class="ds-row-action-item" onclick="dsOpenCertificateModal('${escAttr(e.id)}')">${dsIcon('award')} Certificate of Completion</div>` : ''}
              ${e.status === 'expired' ? `<div class="ds-row-action-item" onclick="dsResendExpired('${escAttr(e.id)}')">${dsIcon('refresh')} Resend as New</div>` : ''}
              ${e.status === 'declined' ? `<div class="ds-row-action-item" onclick="dsViewDeclineReason('${escAttr(e.id)}')">${dsIcon('alert')} View Decline Reason</div>` : ''}
              ${e.status === 'authfail' ? `<div class="ds-row-action-item" onclick="dsActionCorrect('${escAttr(e.id)}')">${dsIcon('edit')} Correct Recipient</div>` : ''}
              <div class="ds-row-action-item" onclick="dsDuplicateEnvelope('${escAttr(e.id)}')">${dsIcon('copy')} Duplicate</div>
              <div class="ds-row-action-item" onclick="dsSaveAsTemplate('${escAttr(e.id)}')">${dsIcon('grid')} Save as Template</div>
              <div class="ds-row-action-item" onclick="dsPromptMoveFolder('${escAttr(e.id)}')">${dsIcon('folder')} Move to Folder</div>
              <div class="ds-row-action-item" onclick="dsOpenAuditModal('${escAttr(e.id)}')">${dsIcon('history')} History</div>
              <div class="ds-row-action-item" onclick="dsActionDownload('${escAttr(e.id)}')">${dsIcon('download')} Download PDF</div>
              ${e.status !== 'deleted' ? `<div class="ds-row-action-item danger" onclick="dsActionDelete('${escAttr(e.id)}')">${dsIcon('trash')} Delete</div>` : ''}
              ${e.status === 'deleted' ? `<div class="ds-row-action-item" onclick="dsRestoreEnvelope('${escAttr(e.id)}')">${dsIcon('restore')} Restore</div>` : ''}
              ${e.status === 'deleted' ? `<div class="ds-row-action-item danger" onclick="dsConfirmPurge('${escAttr(e.id)}')">${dsIcon('trash')} Purge Permanently</div>` : ''}
            </div>
          </div>
        </td>
      </tr>`;
  }).join('');

  const dateMenu = Object.keys(DS_DATE_FILTERS).map(k =>
    `<button type="button" class="${k === dateKey ? 'on' : ''}" onclick="dsSetDateFilter('${k}')">${DS_DATE_FILTERS[k].label}</button>`).join('');
  const senderMenu = `<button type="button" class="${senderKey === 'all' ? 'on' : ''}" onclick="dsSetSenderFilter('all')">All senders</button>` +
    senders.map(s => `<button type="button" class="${s === senderKey ? 'on' : ''}" onclick="dsSetSenderFilter('${escAttr(s)}')">${esc(s)}</button>`).join('');

  const activeTempStatus = dsState.tempStatusFilter !== undefined ? dsState.tempStatusFilter : statusKey;
  const statusOptions = [
    { id: 'completed', label: 'Completed' },
    { id: 'declined', label: 'Declined' },
    { id: 'in_progress', label: 'In progress' },
    { id: 'voided', label: 'Voided' }
  ];
  const statusRadios = statusOptions.map(opt => `
    <label class="ds-status-radio-label">
      <input type="radio" name="dsStatusRadio" value="${escAttr(opt.id)}"
             ${activeTempStatus === opt.id ? 'checked' : ''}
             onchange="dsSelectTempStatus('${escAttr(opt.id)}')">
      <span>${esc(opt.label)}</span>
    </label>`).join('');

  const statusLabel = statusKey ? (statusOptions.find(o => o.id === statusKey)?.label || 'Status') : 'Status';

  return `
    <!-- F6: Content Header with Page Title & Shared Access ⌄ top-right -->
    <div class="ds-agr-header">
      <h1 class="ds-page-title">${esc(title)}</h1>
      <button type="button" class="ds-shared-header-btn" onclick="dsGoto('shared-access')">
        Shared Access ${dsIcon('caret', 12)}
      </button>
    </div>

    <!-- F7: Filter bar [Search] [Date: Last 6 Months X] | [Status ⌄] [Sender ⌄] [Advanced search ⌄] [Clear All] -->
    <div class="ds-filterbar">
      <div class="ds-searchpill">
        ${dsIcon('search', 16)}
        <input type="text" value="${escAttr(dsState.searchQuery || '')}" placeholder="Search Inbox and Folders"
               aria-label="Search agreements" oninput="dsSetSearchQuery(this.value)">
        ${dsState.searchQuery ? `<button type="button" aria-label="Clear search" onclick="dsSetSearchQuery('')">${dsIcon('x', 14)}</button>` : ''}
      </div>

      <div class="ds-pillmenu" id="dsPillDate">
        <button type="button" class="ds-filter-chip applied" onclick="dsTogglePillMenu('dsPillDate', event)">
          <span>Date: ${esc(DS_DATE_FILTERS[dateKey] ? DS_DATE_FILTERS[dateKey].label : 'Last 6 Months')}</span>
          ${dateKey !== 'all' ? `<span class="ds-filter-chip-close" aria-label="Clear date filter" onclick="event.stopPropagation(); dsSetDateFilter('all');">${dsIcon('x', 12)}</span>` : dsIcon('caret', 12)}
        </button>
        <div class="ds-pillmenu-list">${dateMenu}</div>
      </div>

      <div class="ds-filter-divider"></div>

      <div class="ds-popover-anchor" id="dsPopStatus">
        <button type="button" class="ds-pill${statusKey ? ' on' : ''}" onclick="dsToggleStatusPopover(event)">
          ${esc(statusLabel)} ${dsIcon('caret', 14)}
        </button>
        <div class="ds-status-popover" onclick="event.stopPropagation();">
          <div class="ds-status-pop-title">Status</div>
          <div class="ds-status-pop-sub">Envelopes Status Filter</div>
          <div class="ds-status-radios">
            ${statusRadios}
          </div>
          <div class="ds-status-pop-actions">
            <button type="button" class="ds-status-btn-cancel" onclick="dsCloseStatusPopover()">Cancel</button>
            <button type="button" class="ds-status-btn-apply" onclick="dsApplyStatusFilter()">Apply</button>
          </div>
        </div>
      </div>

      <div class="ds-pillmenu" id="dsPillSender">
        <button type="button" class="ds-pill${senderKey !== 'all' ? ' on' : ''}" onclick="dsTogglePillMenu('dsPillSender', event)">
          ${senderKey === 'all' ? 'Sender' : esc(senderKey)} ${dsIcon('caret', 14)}
        </button>
        <div class="ds-pillmenu-list">${senderMenu}</div>
      </div>

      <button type="button" class="ds-pill${dsAdvActive() ? ' on' : ''}" onclick="dsToggleAdvanced()">
        Advanced search ${dsIcon('caret', 14)}
      </button>

      ${dirty ? `<button type="button" class="ds-clearlink" onclick="dsClearFilters()">Clear All</button>` : ''}
    </div>

    ${dsAdvancedPanelHTML()}

    ${selected.length ? `
      <div class="ds-bulkbar">
        <b>${selected.length} selected</b>
        <button type="button" class="ds-btn sm" onclick="dsBulkMove()">${dsIcon('folder', 14)} Move to Folder</button>
        <button type="button" class="ds-btn sm" onclick="dsDemoAction('Bulk download')">${dsIcon('download', 14)} Download</button>
        <button type="button" class="ds-btn sm" onclick="dsClearSelection()">Clear</button>
      </div>` : ''}

    ${rows.length ? `
      <table class="ds-agr-tbl">
        <thead>
          <tr>
            <th class="col-check">
              <input type="checkbox" class="ds-agr-check" aria-label="Select all"
                     ${filtered.length && selected.length === filtered.length ? 'checked' : ''}
                     onchange="dsToggleSelectAll()">
            </th>
            <th>Name</th>
            <th class="col-status">Status</th>
            <th class="col-menu"><span class="ds-sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      ${dsPagerHTML(filtered.length, page, pageCount, firstRow, visible.length)}
    ` : (title === 'Sent' ? `
      <!-- Sent Empty State (Screenshot 5) -->
      <div class="ds-empty-hero-layout">
        <div class="ds-empty-hero-art">
          <svg width="180" height="150" viewBox="0 0 180 150" fill="none">
            <rect x="40" y="25" width="80" height="100" rx="6" fill="#f0f4ff" stroke="#cbd5e1" stroke-width="2"/>
            <line x1="55" y1="45" x2="95" y2="45" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="55" y1="58" x2="105" y2="58" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="55" y1="71" x2="85" y2="71" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M25 65 L65 65 L80 80 L160 80 L150 135 L15 135 Z" fill="#4f86f7"/>
            <g transform="translate(60, 15)">
              <path d="M18 0 L36 8 V20 C36 32 18 42 18 42 C18 42 0 32 0 20 V8 Z" fill="#00c2cb"/>
              <path d="M10 20 L15 25 L26 14" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </g>
          </svg>
        </div>
        <div class="ds-empty-hero-content">
          <h2>Agree with confidence</h2>
          <p>Make your business faster, simpler and more cost-efficient with electronic agreements.</p>
          <button type="button" class="ds-btn-primary" onclick="dsOpenNewEnvelope()">Send an Envelope</button>
        </div>
      </div>
    ` : `
      <!-- Inbox / General Empty State (Screenshot 2) -->
      <div class="ds-empty-hero-layout">
        <div class="ds-empty-hero-art">
          <svg width="180" height="150" viewBox="0 0 180 150" fill="none">
            <rect x="30" y="15" width="90" height="120" rx="8" fill="#f0f4ff" stroke="#cbd5e1" stroke-width="2"/>
            <line x1="42" y1="35" x2="102" y2="35" stroke="#a5b4fc" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="42" y1="48" x2="110" y2="48" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="42" y1="61" x2="95" y2="61" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="42" y1="74" x2="105" y2="74" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="42" y1="87" x2="80" y2="87" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M42 120 Q 50 105, 62 120 T 80 110 T 100 115" stroke="#1e1b4b" stroke-width="2" fill="none" stroke-linecap="round"/>
            <g transform="translate(120, 25) rotate(42)">
              <rect x="0" y="0" width="14" height="100" rx="4" fill="#818cf8"/>
              <polygon points="0,100 14,100 7,115" fill="#312e81"/>
            </g>
          </svg>
        </div>
        <div class="ds-empty-hero-content">
          <h2>Your inbox is empty</h2>
          <p>When someone sends you an envelope, it will show up here. Edit the date range to view older envelopes.</p>
        </div>
      </div>
    `)}`;
}

/* Footer of the agreements list: "1–20 of 84", page buttons, rows-per-page.
   Hidden entirely when everything fits on one page — a pager over six rows is
   noise, and the real product hides it too. */
function dsPagerHTML(total, page, pageCount, firstRow, shown) {
  if (!total) return '';
  const sizes = [10, 20, 50, 100];
  const btn = (label, target, disabled, aria) =>
    '<button type="button" class="ds-pagebtn" ' + (disabled ? 'disabled ' : '') +
    'aria-label="' + aria + '" onclick="dsSetPage(' + target + ')">' + label + '</button>';

  /* A window of at most five numbers around the current page, so 84 envelopes
     do not produce a row of five hundred buttons. */
  let from = Math.max(1, page - 2);
  const to = Math.min(pageCount, from + 4);
  from = Math.max(1, to - 4);
  let nums = '';
  for (let i = from; i <= to; i++) {
    nums += '<button type="button" class="ds-pagenum' + (i === page ? ' on' : '') +
            '" aria-current="' + (i === page ? 'page' : 'false') +
            '" onclick="dsSetPage(' + i + ')">' + i + '</button>';
  }

  return `
    <div class="ds-pager">
      <span class="ds-pager-count">${firstRow + 1}\u2013${firstRow + shown} of ${total}</span>
      ${pageCount > 1 ? `
        <div class="ds-pager-nav">
          ${btn(dsIcon('caretRight', 15, 'flip'), page - 1, page === 1, 'Previous page')}
          ${nums}
          ${btn(dsIcon('caretRight', 15), page + 1, page === pageCount, 'Next page')}
        </div>` : ''}
      <label class="ds-pager-size">
        Rows per page
        <select class="ds-select" onchange="dsSetPageSize(this.value)">
          ${sizes.map(s => `<option value="${s}" ${s === (dsState.pageSize || 20) ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </label>
    </div>`;
}

/* ---------- filter-row handlers ---------- */
function dsTogglePillMenu(id, ev) {
  if (ev) ev.stopPropagation();
  const el = document.getElementById(id);
  document.querySelectorAll('.ds-pillmenu.open, .ds-popover-anchor.open').forEach(m => { if (m !== el) m.classList.remove('open'); });
  if (el) el.classList.toggle('open');
}

function dsToggleStatusPopover(ev) {
  if (ev) ev.stopPropagation();
  const el = document.getElementById('dsPopStatus');
  document.querySelectorAll('.ds-pillmenu.open, .ds-popover-anchor.open').forEach(m => { if (m !== el) m.classList.remove('open'); });
  if (el) {
    const opening = !el.classList.contains('open');
    if (opening) {
      dsState.tempStatusFilter = dsState.statusFilter || '';
    }
    el.classList.toggle('open');
  }
}

function dsCloseStatusPopover() {
  const el = document.getElementById('dsPopStatus');
  if (el) el.classList.remove('open');
  dsState.tempStatusFilter = dsState.statusFilter || '';
  dsRenderRoot();
}

function dsSelectTempStatus(val) {
  dsState.tempStatusFilter = val;
}

function dsApplyStatusFilter() {
  dsState.statusFilter = dsState.tempStatusFilter || '';
  dsResetPage();
  const el = document.getElementById('dsPopStatus');
  if (el) el.classList.remove('open');
  dsRenderRoot();
}

/* Any change to what the list contains sends you back to page 1. Staying on
   page 4 of a result set that now has six rows shows an empty table. */
function dsResetPage() { dsState.page = 1; }
function dsSetDateFilter(k) { dsState.dateFilter = k; dsResetPage(); dsRenderRoot(); }
function dsSetSenderFilter(s) { dsState.senderFilter = s; dsResetPage(); dsRenderRoot(); }
function dsSetPage(n) {
  dsState.page = n;
  dsRenderRoot();
  const main = document.querySelector('.ds-main');
  if (main) main.scrollTop = 0;
}
function dsSetPageSize(n) { dsState.pageSize = parseInt(n, 10) || 20; dsResetPage(); dsRenderRoot(); }
function dsClearFilters() {
  dsResetPage();
  dsDemo.advanced = {};
  dsState.searchQuery = '';
  dsState.senderFilter = 'all';
  dsState.dateFilter = '6m';
  dsState.statusFilter = '';
  dsState.tempStatusFilter = '';
  dsState.envelopeFilter = 'all';
  dsState.activeFolder = 'all';
  dsSyncNav();
  dsRenderRoot();
}

/* ---------- row selection (demo state, so it dies with the tab) ---------- */
function dsToggleSelect(envId) {
  if (!dsDemo.selected) dsDemo.selected = [];
  const i = dsDemo.selected.indexOf(envId);
  if (i > -1) dsDemo.selected.splice(i, 1); else dsDemo.selected.push(envId);
  dsRenderRoot();
}
/* Selects the whole filtered set, not just the visible page — that is what the
   header checkbox means next to a "1\u201320 of 84" footer. */
function dsToggleSelectAll() {
  const list = dsFilteredEnvelopes().map(e => e.id);
  const all = dsDemo.selected && dsDemo.selected.length === list.length;
  dsDemo.selected = all ? [] : list;
  dsRenderRoot();
}
function dsClearSelection() { dsDemo.selected = []; dsRenderRoot(); }
function dsBulkMove() {
  const ids = (dsDemo.selected || []).slice();
  if (!ids.length) return;
  const folders = dsDemo.folders || [];
  const choice = prompt('Move ' + ids.length + ' agreement(s) to which folder?\nAvailable folders:\n- ' + folders.join('\n- '));
  if (!choice) return;
  const target = folders.find(f => f.toLowerCase() === choice.trim().toLowerCase());
  if (!target) { simToast('Folder "' + choice + '" not found. Create it first with New Folder.'); return; }
  ids.forEach(id => { dsDemo.folderMap[id] = target; });
  dsDemo.selected = [];
  simToast(ids.length + ' agreement(s) moved to "' + target + '".', { tone: 'good' });
  dsRenderRoot();
}

function dsStatusLabel(s) {
  return {
    waiting: 'Waiting for Others', completed: 'Completed', draft: 'Draft',
    voided: 'Voided', expired: 'Expired', declined: 'Declined',
    deleted: 'Deleted', authfail: 'Authentication Failed'
  }[s] || s.toUpperCase();
}

/* ---------- Manage Folder & Search Handlers ---------- */
function dsSelectFolder(f) {
  dsState.activeFolder = f;
  dsResetPage();
  dsSyncNav();
  dsRenderRoot();
}
function dsSetSearchQuery(q) {
  dsState.searchQuery = q;
  dsResetPage();
  /* Re-render replaces the input, so the caret would jump to the start on every
     keystroke. Rendering and then restoring focus + caret keeps typing usable. */
  const el = document.activeElement;
  const pos = el && el.selectionStart;
  dsRenderRoot();
  const next = document.querySelector('.ds-searchpill input');
  if (next) { next.focus(); if (pos != null && next.setSelectionRange) next.setSelectionRange(pos, pos); }
}
function dsOnGlobalSearch(q) {
  dsState.searchQuery = q;
  if (dsState.view !== 'envelopes') dsGoto('envelopes');
  else dsRenderRoot();
}
function dsSetDateFilter(d) {
  dsState.dateFilter = d;
  dsResetPage();
  dsRenderRoot();
}
function dsCreateNewFolder() {
  const name = prompt('Enter a name for the new folder (e.g. "Commercial Escrow 2026"):');
  if (!name || !name.trim()) return;
  const clean = name.trim();
  if (dsDemo.folders.indexOf(clean) === -1) {
    dsDemo.folders.push(clean);
    simToast(`Folder "${clean}" created!`, { tone: 'good' });
    dsRenderRoot();
  }
}
function dsPromptMoveFolder(envId) {
  const folders = dsDemo.folders || ['Buyer Packages', 'Closed 2026', 'Escrow Docs'];
  const choice = prompt(`Move envelope ${envId} to which folder?\nAvailable folders:\n- ` + folders.join('\n- '));
  if (!choice) return;
  const target = folders.find(f => f.toLowerCase() === choice.trim().toLowerCase());
  if (target) {
    dsDemo.folderMap[envId] = target;
    simToast(`Envelope ${envId} moved to folder "${target}".`, { tone: 'good' });
    dsRenderRoot();
  } else {
    simToast(`Folder "${choice}" not found. Create it first with "+ New Folder".`);
  }
}
function dsToggleRowActionMenu(envId, ev) {
  ev.stopPropagation();
  // Close any open menus
  document.querySelectorAll('.ds-row-actions-menu.show').forEach(el => {
    if (el.id !== 'dsActionMenu_' + envId) el.classList.remove('show');
  });
  const menu = document.getElementById('dsActionMenu_' + envId);
  if (menu) menu.classList.toggle('show');
}
// Close menus when clicking outside
window.addEventListener('click', () => {
  document.querySelectorAll('.ds-row-actions-menu.show').forEach(el => el.classList.remove('show'));
  document.querySelectorAll('.ds-pillmenu.open').forEach(el => el.classList.remove('open'));
  const popover = document.getElementById('dsFloatingPopover');
  if (popover) popover.remove();
});

function dsExportEnvelopesCSV() {
  const list = dsAllEnvelopes();
  let csv = 'Envelope ID,Subject,Sender,Status,Created Date,Recipients\n';
  list.forEach(e => {
    const recs = (e.recipients || []).map(r => `${r.name} (${r.email})`).join('; ');
    csv += `"${e.id}","${e.subject.replace(/"/g, '""')}","${e.sender}","${e.status}","${e.createdDate}","${recs}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DocuSign_Agreements_Export_${DS_TODAY}.csv`;
  a.click();
  simToast('Agreements CSV spreadsheet generated and downloaded!', { tone: 'good' });
}


/* ============================================================================
   2024 SIDEBAR DESTINATIONS — Deleted, Bulk Send, PowerForms, Shared Access.
   These four exist in the real product and were the most obvious gaps: every
   other sidebar entry led somewhere and these led nowhere.

   Their supporting rows live here rather than in docusign-data.js, which is
   frozen (it carries the graded curriculum). Where a row can be derived from an
   envelope or a template it is derived, so the screens cannot drift out of step
   with the data the lessons are graded against.
   ============================================================================ */

/* ---------- Deleted ---------- */
function dsDeletedHTML() {
  /* Voided envelopes are what actually lands in this bin in the simulator —
     including any the trainee voids during Lesson 5, since dsGetEnvelope applies
     the override. Nothing here is fabricated. */
  const list = dsAllEnvelopes().filter(e => e.status === 'deleted');

  const rows = list.map(e => `
    <tr data-env-id="${esc(e.id)}">
      <td>
        <div class="ds-agr-subject">${esc(e.subject)}</div>
        <div class="ds-agr-from">From: ${esc(e.sender)} &middot; ${esc(e.id)}</div>
      </td>
      <td><span class="ds-agr-status">${dsStatusIcon(e.status)}${esc(dsStatusLabel(e.status))}</span></td>
      <td>${esc(e.createdDate)}</td>
      <td class="ds-nowrap">
        <button type="button" class="ds-btn sm" onclick="dsRestoreEnvelope('${escAttr(e.id)}')">${dsIcon('restore', 14)} Restore</button>
        <button type="button" class="ds-btn sm danger" onclick="dsConfirmPurge('${escAttr(e.id)}')">${dsIcon('trash', 14)} Delete Permanently</button>
      </td>
    </tr>`).join('');

  return `
    <h1 class="ds-page-title">Deleted</h1>

    <div class="ds-notice">
      ${dsIcon('alert')}
      <span>Items in Deleted are permanently removed after 24 months. Restoring an envelope returns it to the folder it came from.</span>
    </div>

    <table class="ds-agr-tbl ds-agr-tbl-compact">
      <thead>
        <tr><th>Name</th><th class="col-status">Status</th><th class="col-when">Deleted</th><th class="col-actions"></th></tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="4"><div class="ds-agr-empty">${dsIcon('trash', 40)}<div>Nothing has been deleted.</div></div></td></tr>`}
      </tbody>
    </table>`;
}

/* ---------- Bulk Send ----------
   Batches are keyed to the real templates so the Template column can never name
   something that does not exist in DS_TEMPLATES. */
/* Resolves each batch's template id to its name at read time, so a renamed
   template renames itself here too and can never go stale. */
function dsBulkBatches() {
  const byId = {};
  dsAllTemplates().forEach(t => { byId[t.id] = t; });
  return DS_S_BULK_BATCHES.map((b, i) =>
    Object.assign({ index: i, tmpl: (byId[b.tmplId] || {}).name || '—' }, b));
}

/* Per-recipient breakdown for the detail panel. Derived from the batch's own
   counts and the address book rather than stored, so the rows can never add up
   to a different total than the row that opened them. */
function dsBulkRecipients(batch) {
  const rand = dsSRand('bulk|' + batch.name);
  const out = [];
  const n = Math.min(batch.recips, 12);
  for (let i = 0; i < n; i++) {
    const c = DS_S_CONTACTS[Math.floor(rand() * DS_S_CONTACTS.length)];
    /* The first `done` slots completed; the rest reflect the batch's own status. */
    const doneShare = Math.round(batch.done / batch.recips * n);
    const status = i < doneShare ? 'completed'
                 : (batch.status === 'expired' ? 'expired' : 'waiting');
    out.push({ name: c.name, email: c.email, status: status });
  }
  return { rows: out, hidden: Math.max(0, batch.recips - n) };
}

function dsOpenBulkBatch(i) {
  dsState.bulkOpen = (dsState.bulkOpen === i) ? null : i;
  dsRenderRoot();
}

/* ==================== BULK SEND (PHASE D.1) ==================== */

function dsOpenBulkSendWizard() {
  const tmpls = dsAllTemplates();
  dsState.bulkWizardData = {
    batchName: 'Buyer Disclosure Batch — ' + DS_TODAY,
    templateId: tmpls[0] ? tmpls[0].id : '',
    csvText: '',
    parsedRows: [],
    errors: []
  };
  dsRenderBulkSendWizardModal();
}

function dsLoadSampleBulkCSV() {
  const sample = [
    'Name,Email,Role',
    'Jonathan Miller,jonathan.miller@example.com,Buyer',
    'Ashley Davis,ashley.davis@example.com,Buyer',
    'Christopher Lee,chris.lee@example.com,Buyer',
    'Stephanie Taylor,steph.taylor@example.com,Buyer',
    'Marcus Vance,marcus.vance@example.com,Buyer'
  ].join('\n');
  const ta = document.getElementById('dsBulkCsvInput');
  if (ta) {
    ta.value = sample;
    dsOnBulkCsvInput(sample);
  }
}

function dsOnBulkCsvInput(text) {
  if (!dsState.bulkWizardData) return;
  dsState.bulkWizardData.csvText = text;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows = [];
  const errors = [];

  if (lines.length > 1) {
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = headers.findIndex(h => /name/i.test(h));
    const emailIdx = headers.findIndex(h => /email/i.test(h));
    const roleIdx = headers.findIndex(h => /role/i.test(h));

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      const name = nameIdx > -1 ? parts[nameIdx] : parts[0] || '';
      const email = emailIdx > -1 ? parts[emailIdx] : parts[1] || '';
      const role = roleIdx > -1 ? parts[roleIdx] : parts[2] || 'Buyer';

      let rowErr = null;
      if (!name) rowErr = 'Missing name';
      else if (!email) rowErr = 'Missing email';
      else if (!dsEmailSyntaxOk(email)) rowErr = `Invalid email syntax ("${email}")`;

      if (rowErr) errors.push(`Row ${i + 1}: ${rowErr}`);
      rows.push({ line: i + 1, name, email, role, error: rowErr });
    }
  }

  dsState.bulkWizardData.parsedRows = rows;
  dsState.bulkWizardData.errors = errors;
  dsRenderBulkSendWizardModal();
}

function dsRenderBulkSendWizardModal() {
  let modal = document.getElementById('dsBulkWizardModalWrap');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dsBulkWizardModalWrap';
    modal.className = 'ds-modal-backdrop';
    document.body.appendChild(modal);
  }

  const d = dsState.bulkWizardData;
  const tmpls = dsAllTemplates();
  const validCount = d.parsedRows.filter(r => !r.error).length;

  modal.innerHTML = `
    <div class="ds-modal-card ds-tpl-builder-card">
      <div class="ds-modal-head">
        <div>
          <h3 class="ds-adopt-head-wrap">${dsIcon('users')} Create New Bulk Send</h3>
          <div class="ds-audit-actor">Import recipient lists via CSV to dispatch standardized envelope packages at scale</div>
        </div>
        <button type="button" class="ds-btn ds-cert-close-btn" onclick="dsCloseBulkWizard()">${dsIcon('x', 13)}</button>
      </div>
      <div class="ds-modal-body">
        <div class="ds-tpl-builder-grid">
          <div class="ds-tpl-builder-field">
            <label>Batch Name *</label>
            <input type="text" id="dsBulkBatchName" value="${escAttr(d.batchName)}" placeholder="e.g. Q3 Texas Buyer Packages"
                   oninput="dsState.bulkWizardData.batchName = this.value">
          </div>
          <div class="ds-tpl-builder-field">
            <label>Select Template *</label>
            <select id="dsBulkTmplSelect" onchange="dsState.bulkWizardData.templateId = this.value">
              ${tmpls.map(t => `<option value="${escAttr(t.id)}" ${d.templateId === t.id ? 'selected' : ''}>${esc(t.name)} (${esc(t.category)})</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 6px;">
          <label style="font-size:12px;font-weight:700;color:var(--ds24-muted);text-transform:uppercase;">Recipient CSV List (Name, Email, Role)</label>
          <button type="button" class="ds-btn sm" onclick="dsLoadSampleBulkCSV()">${dsIcon('download', 12)} Load Sample CSV</button>
        </div>

        <textarea id="dsBulkCsvInput" rows="4" class="ds-csv-box" placeholder="Name,Email,Role&#10;Jane Doe,jane@example.com,Buyer&#10;Mark Smith,mark@example.com,Buyer"
                  oninput="dsOnBulkCsvInput(this.value)">${esc(d.csvText)}</textarea>

        ${d.parsedRows.length ? `
          <div class="ds-csv-tbl-wrap">
            <table class="ds-agr-tbl ds-agr-tbl-compact">
              <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Validation Status</th></tr></thead>
              <tbody>
                ${d.parsedRows.map(r => `
                  <tr class="ds-csv-row ${r.error ? 'bad' : ''}">
                    <td>${r.line}</td>
                    <td><b>${esc(r.name || '—')}</b></td>
                    <td>${esc(r.email || '—')}</td>
                    <td>${esc(r.role || '—')}</td>
                    <td>${r.error ? '<span class="ds-badge danger ds-badge-xs">' + esc(r.error) + '</span>' : '<span class="ds-badge completed ds-badge-xs">Valid</span>'}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="ds-box-tip">
            ${dsIcon('checkCircle', 14)} <b>Ready:</b> ${validCount} valid recipient${validCount === 1 ? '' : 's'} identified. ${d.errors.length ? `<span style="color:var(--ds24-red);">${d.errors.length} error(s) must be resolved.</span>` : ''}
          </div>
        ` : ''}
      </div>
      <div class="ds-modal-foot">
        <button type="button" class="ds-btn" onclick="dsCloseBulkWizard()">Cancel</button>
        <button type="button" class="ds-btn primary" id="dsBtnSubmitBulk" ${!validCount || d.errors.length ? 'disabled' : ''} onclick="dsSubmitBulkSend()">
          ${dsIcon('send', 14)} Send ${validCount} Envelopes Now
        </button>
      </div>
    </div>`;
}

function dsCloseBulkWizard() {
  const m = document.getElementById('dsBulkWizardModalWrap');
  if (m) m.remove();
  dsState.bulkWizardData = null;
}

function dsSubmitBulkSend() {
  const d = dsState.bulkWizardData;
  if (!d) return;
  const valid = d.parsedRows.filter(r => !r.error);
  if (!valid.length) {
    simToast('Add at least one valid recipient before sending.');
    return;
  }

  const tmpl = dsAllTemplates().find(t => t.id === d.templateId) || DS_TEMPLATES[0];
  const batchName = d.batchName.trim() || 'Bulk Send Batch';
  const newBatch = {
    index: dsBulkBatches().length + 1,
    name: batchName,
    tmpl: tmpl.name,
    recips: valid.length,
    done: 0,
    sent: DS_TODAY,
    status: 'waiting'
  };

  if (!dsDemo.bulkBatches) dsDemo.bulkBatches = [];
  dsDemo.bulkBatches.push(newBatch);

  // Generate individual envelope records for each recipient
  valid.forEach((r, idx) => {
    const envId = 'ENV-' + DS_TODAY.slice(0, 4) + '-' + (9200 + dsSentSeq++);
    const newEnv = {
      id: envId,
      subject: `${tmpl.name} — ${r.name}`,
      type: tmpl.category || 'Real Estate',
      sender: (dsDemo.user ? dsDemo.user.name : 'Alex Rivera') + ' (VA)',
      status: 'waiting',
      createdDate: DS_TODAY,
      closingDate: '2026-09-15',
      documents: tmpl.documents ? JSON.parse(JSON.stringify(tmpl.documents)) : [{ name: `${tmpl.name}.pdf`, pages: 2 }],
      recipients: [
        { id: 'wr1', name: r.name, email: r.email, role: r.role || 'Buyer', action: 'Needs to Sign', order: 1, status: 'sent' }
      ],
      fields: [
        { id: 'f1', type: 'Signature', recipientId: 'wr1', page: 1, label: 'Signature', required: true }
      ]
    };
    dsSetEnvelopeOverride(envId, newEnv);
  });

  dsCloseBulkWizard();
  simToast(`Bulk Send dispatched! ${valid.length} envelopes created and queued.`, { tone: 'good', duration: 4500 });
  dsGoto('bulk-send');
}

function dsBulkSendHTML() {
  const rows = dsBulkBatches().map(b => {
    const pct = Math.round(b.done / b.recips * 100);
    const open = dsState.bulkOpen === b.index;
    return `
      <tr class="link${open ? ' on' : ''}" onclick="dsOpenBulkBatch(${b.index})">
        <td><b>${esc(b.name)}</b></td>
        <td>${esc(b.tmpl)}</td>
        <td class="num">${b.recips}</td>
        <td>${esc(b.sent)}</td>
        <td><span class="ds-agr-status">${dsStatusIcon(b.status)}${esc(dsStatusLabel(b.status))}</span></td>
        <td>
          <div class="ds-bulk-prog">
            <div class="ds-bulk-bar"><i style="width:${pct}%;"></i></div>
            <span>${b.done}/${b.recips}</span>
          </div>
        </td>
      </tr>
      ${open ? dsBulkDetailHTML(b) : ''}`;
  }).join('');

  return `
    <div class="ds-pagehead">
      <h1 class="ds-page-title">Bulk Send</h1>
      <button type="button" class="ds-btn primary" onclick="dsOpenBulkSendWizard()">${dsIcon('plus', 15)} New Bulk Send</button>
    </div>

    <p class="ds-pagelede">Send one template to a list of recipients at once. Each recipient receives their own private envelope.</p>

    <table class="ds-agr-tbl ds-agr-tbl-compact">
      <thead>
        <tr>
          <th>Batch Name</th><th>Template</th><th class="num">Recipients</th>
          <th>Sent</th><th class="col-status">Status</th><th class="col-completion">Completion</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/* ---------- PowerForms (Phase D.2) ---------- */

function dsPowerForms() {
  const byId = {};
  dsAllTemplates().forEach(t => { byId[t.id] = t; });
  const base = DS_S_POWERFORMS.map(p =>
    Object.assign({ tmpl: (byId[p.tmplId] || {}).name || '—' }, p));
  const custom = (dsDemo.powerforms || []).map(p =>
    Object.assign({ tmpl: (byId[p.tmplId] || {}).name || '—' }, p));
  return custom.concat(base);
}

function dsOpenNewPowerFormModal() {
  const tmpls = dsAllTemplates();
  const modal = document.createElement('div');
  modal.id = 'dsPfModalWrap';
  modal.className = 'ds-modal-backdrop';
  modal.innerHTML = `
    <div class="ds-modal-card ds-tpl-builder-card">
      <div class="ds-modal-head">
        <div>
          <h3 class="ds-adopt-head-wrap">${dsIcon('zap')} Create New PowerForm</h3>
          <div class="ds-audit-actor">Generate a public self-service URL allowing clients to initiate and sign on-demand</div>
        </div>
        <button type="button" class="ds-btn ds-cert-close-btn" onclick="document.getElementById('dsPfModalWrap').remove()">${dsIcon('x', 13)}</button>
      </div>
      <div class="ds-modal-body">
        <div class="ds-tpl-builder-grid">
          <div class="ds-tpl-builder-field">
            <label>PowerForm Title *</label>
            <input type="text" id="dsPfTitle" placeholder="e.g. Client Intake &amp; Disclosure Form" value="Client Intake Form">
          </div>
          <div class="ds-tpl-builder-field">
            <label>Source Template *</label>
            <select id="dsPfTmpl">
              ${tmpls.map(t => `<option value="${escAttr(t.id)}">${esc(t.name)} (${esc(t.category)})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="ds-tpl-builder-field">
          <label>Signer Instructions (Displayed to visitor)</label>
          <textarea rows="3" id="dsPfInstructions" placeholder="Enter instructions shown to signers before they access the agreement...">Please complete all required fields. Your information will be processed immediately by Keller Williams Realty.</textarea>
        </div>
      </div>
      <div class="ds-modal-foot">
        <button type="button" class="ds-btn" onclick="document.getElementById('dsPfModalWrap').remove()">Cancel</button>
        <button type="button" class="ds-btn primary" onclick="dsSubmitNewPowerForm()">Create PowerForm</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function dsSubmitNewPowerForm() {
  const title = (document.getElementById('dsPfTitle') || {}).value || '';
  const tmplId = (document.getElementById('dsPfTmpl') || {}).value || '';
  if (!title.trim()) {
    simToast('PowerForm title is required.');
    return;
  }
  const slug = 'pf_' + title.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + (100 + (dsDemo.powerforms || []).length);
  if (!dsDemo.powerforms) dsDemo.powerforms = [];
  dsDemo.powerforms.push({
    name: title.trim(),
    tmplId: tmplId,
    slug: slug,
    on: true,
    responses: 0
  });

  const m = document.getElementById('dsPfModalWrap');
  if (m) m.remove();
  simToast(`PowerForm "${title.trim()}" created! Ready for self-service signing.`, { tone: 'good', duration: 4000 });
  dsGoto('powerforms');
}

function dsOpenPowerFormSimulator(slug) {
  const pf = dsPowerForms().find(p => p.slug === slug) || dsPowerForms()[0];
  const modal = document.createElement('div');
  modal.id = 'dsPfSimModalWrap';
  modal.className = 'ds-modal-backdrop';
  modal.innerHTML = `
    <div class="ds-modal-card ds-role-match-card">
      <div class="ds-modal-head">
        <div>
          <h3 class="ds-adopt-head-wrap">${dsIcon('zap')} PowerForm Signer Portal</h3>
          <div class="ds-audit-actor">Public URL: <code>https://powerforms.docusign.net/${esc(pf.slug)}</code></div>
        </div>
        <button type="button" class="ds-btn ds-cert-close-btn" onclick="document.getElementById('dsPfSimModalWrap').remove()">${dsIcon('x', 13)}</button>
      </div>
      <div class="ds-modal-body">
        <p class="ds-wiz-sub">This simulator demonstrates what an external client experiences when opening your PowerForm link.</p>
        <div class="ds-role-match-row">
          <div class="ds-role-match-head"><b>Signer Information</b></div>
          <div class="ds-role-match-inputs">
            <div>
              <label>Full Name</label>
              <input type="text" id="dsPfSimName" value="Samantha Wright" placeholder="Full name">
            </div>
            <div>
              <label>Email Address</label>
              <input type="email" id="dsPfSimEmail" value="samantha.w@client.example.com" placeholder="Email address">
            </div>
          </div>
        </div>
      </div>
      <div class="ds-modal-foot">
        <button type="button" class="ds-btn" onclick="document.getElementById('dsPfSimModalWrap').remove()">Cancel</button>
        <button type="button" class="ds-btn yellow" onclick="dsLaunchPowerFormSigner('${escAttr(pf.slug)}')">Begin Signing →</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function dsLaunchPowerFormSigner(slug) {
  const pf = dsPowerForms().find(p => p.slug === slug) || dsPowerForms()[0];
  const name = (document.getElementById('dsPfSimName') || {}).value || 'Signer';
  const email = (document.getElementById('dsPfSimEmail') || {}).value || 'signer@example.com';
  pf.responses = (pf.responses || 0) + 1;

  const envId = 'ENV-' + DS_TODAY.slice(0, 4) + '-' + (9300 + dsSentSeq++);
  const newEnv = {
    id: envId,
    subject: `PowerForm: ${pf.name} — ${name}`,
    type: 'Self-Service PowerForm',
    sender: 'PowerForm Self-Service',
    status: 'waiting',
    createdDate: DS_TODAY,
    closingDate: '2026-09-15',
    documents: [{ name: `${pf.name}.pdf`, pages: 2 }],
    recipients: [
      { id: 'wr1', name: name, email: email, role: 'Signer', action: 'Needs to Sign', order: 1, status: 'sent' }
    ],
    fields: [
      { id: 'f1', type: 'Signature', recipientId: 'wr1', page: 1, label: 'Signature', required: true }
    ]
  };
  dsSetEnvelopeOverride(envId, newEnv);

  const m = document.getElementById('dsPfSimModalWrap');
  if (m) m.remove();
  simToast(`Initiated signing session for ${name}!`, { tone: 'good' });
  dsSimulateSigner(envId);
}

function dsPowerFormsHTML() {
  const cards = dsPowerForms().map(p => `
    <div class="ds-pf-card${p.on ? '' : ' off'}">
      <div class="ds-pf-head">
        <span class="ds-pf-ico">${dsIcon('zap', 18)}</span>
        <b>${esc(p.name)}</b>
        <span class="ds-badge ${p.on ? 'completed' : 'draft'}">${p.on ? 'Active' : 'Disabled'}</span>
      </div>
      <div class="ds-pf-meta">Built from <b>${esc(p.tmpl)}</b></div>
      <div class="ds-pf-url">https://powerforms.docusign.net/${esc(p.slug)}</div>
      <div class="ds-pf-foot">
        <span class="ds-pf-count">${p.responses} responses</span>
        <button type="button" class="ds-btn sm" onclick="dsCopyLink('https://powerforms.docusign.net/${escAttr(p.slug)}')">${dsIcon('copy', 14)} Copy Link</button>
        <button type="button" class="ds-btn primary sm" onclick="dsOpenPowerFormSimulator('${escAttr(p.slug)}')">${dsIcon('eye', 14)} Test PowerForm</button>
      </div>
    </div>`).join('');

  return `
    <div class="ds-pagehead">
      <h1 class="ds-page-title">PowerForms</h1>
      <button type="button" class="ds-btn primary" onclick="dsOpenNewPowerFormModal()">${dsIcon('plus', 15)} New PowerForm</button>
    </div>

    <p class="ds-pagelede">A PowerForm turns a template into a public link. Anyone with the link fills it in and signs it, and the completed envelope arrives in your account — no invitation needed.</p>

    <div class="ds-pf-grid">${cards}</div>`;
}

/* ---------- Shared Access (D4 Type A) ---------- */
function dsOpenRequestAccessModal() {
  const users = (typeof DS_S_USERS !== 'undefined' ? DS_S_USERS : []).filter(u => u.name !== (dsDemo.user ? dsDemo.user.name : 'Alex Rivera'));
  const userOpts = users.map(u => `<option value="${escAttr(u.name)}">${esc(u.name)} (${esc(u.group || u.permissionProfile || 'Agent')}) &lt;${esc(u.email || '')}&gt;</option>`).join('');

  const modal = document.createElement('div');
  modal.id = 'dsReqAccessModalWrap';
  modal.className = 'ds-modal-backdrop';
  modal.innerHTML = `
    <div class="ds-modal-card">
      <div class="ds-modal-head">
        <h3 class="ds-adopt-head-wrap">${dsIcon('users')} Request Shared Access</h3>
        <button type="button" class="ds-btn ds-cert-close-btn" onclick="document.getElementById('dsReqAccessModalWrap').remove()">${dsIcon('x', 13)}</button>
      </div>
      <div class="ds-modal-body">
        <p class="ds-audit-actor">Request delegation permissions to manage agreements and take actions on behalf of another team member.</p>
        <div class="ds-form-group">
          <label class="ds-label">Select Colleague / Agent</label>
          <select id="dsReqAccessUser" class="ds-select">
            ${userOpts}
          </select>
        </div>
        <div class="ds-form-group">
          <label class="ds-label">Access Level Requested</label>
          <select id="dsReqAccessScope" class="ds-select">
            <option value="Manage and send">Manage and Send (Full Access)</option>
            <option value="Send on behalf">Send on Behalf Only</option>
            <option value="View only">View and Track Only</option>
          </select>
        </div>
        <div class="ds-form-group">
          <label class="ds-label">Reason / Reference</label>
          <input type="text" id="dsReqAccessReason" class="ds-input" placeholder="e.g. Transaction coordination coverage for active pipeline">
        </div>
      </div>
      <div class="ds-modal-foot">
        <button type="button" class="ds-btn" onclick="document.getElementById('dsReqAccessModalWrap').remove()">Cancel</button>
        <button type="button" class="ds-btn primary" onclick="dsSubmitRequestAccess()">Submit Request</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function dsSubmitRequestAccess() {
  const userName = document.getElementById('dsReqAccessUser')?.value;
  const scope = document.getElementById('dsReqAccessScope')?.value || 'Manage and send';
  if (!userName) return;
  const u = (typeof DS_S_USERS !== 'undefined' ? DS_S_USERS : []).find(x => x.name === userName) || {};

  if (!dsDemo.pendingSharedAccess) dsDemo.pendingSharedAccess = [];
  dsDemo.pendingSharedAccess.push({
    name: userName,
    email: u.email || '—',
    role: u.group || u.permissionProfile || 'Agent',
    scope: scope,
    since: DS_TODAY,
    pending: true
  });

  document.getElementById('dsReqAccessModalWrap')?.remove();
  simToast(`Shared access request sent to ${userName}.`, { tone: 'good' });
  dsRenderRoot();
}

function dsCancelPendingShare(name) {
  if (dsDemo.pendingSharedAccess) {
    dsDemo.pendingSharedAccess = dsDemo.pendingSharedAccess.filter(x => x.name !== name);
  }
  simToast('Access request cancelled.', { tone: 'good' });
  dsRenderRoot();
}

function dsSharedAccessHTML() {
  /* Names come from the catalogue and their email, role and group are looked up
     in Settings > Users, so this screen physically cannot invent a colleague. */
  const hydrate = p => {
    const u = DS_S_USERS.find(x => x.name === p.name) || {};
    return { name: p.name, email: u.email || '—', role: u.group || '—', scope: p.scope, since: p.since, pending: false };
  };
  const live = p => dsDemo.revokedShares.indexOf(p.name) === -1;
  const pending = (dsDemo.pendingSharedAccess || []);
  const sharedWithMe = DS_S_SHARED_ACCESS.sharedWithMe.filter(live).map(hydrate).concat(pending);
  const iShareWith = DS_S_SHARED_ACCESS.iShareWith.filter(live).map(hydrate);

  const table = (rows, empty) => rows.length ? `
    <table class="ds-agr-tbl ds-agr-tbl-compact">
      <thead><tr><th>Person</th><th>Role</th><th>Access</th><th>Since</th><th class="col-manage"></th></tr></thead>
      <tbody>${rows.map(r => `
        <tr>
          <td><b>${esc(r.name)}</b><div class="ds-agr-from">${esc(r.email)}</div></td>
          <td>${esc(r.role)}</td>
          <td>${r.pending ? `<span class="ds-badge waiting">${esc(r.scope)} (Pending)</span>` : esc(r.scope)}</td>
          <td>${esc(r.since)}</td>
          <td>
            ${r.pending ? `<button type="button" class="ds-btn sm" onclick="dsCancelPendingShare('${escAttr(r.name)}')">Cancel</button>`
                        : `<button type="button" class="ds-btn sm danger" onclick="dsConfirmRevokeShare('${escAttr(r.name)}')">Remove</button>`}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>` : `<div class="ds-agr-empty">${dsIcon('users', 36)}<div>${esc(empty)}</div></div>`;

  return `
    <div class="ds-pagehead">
      <h1 class="ds-page-title">Shared Access</h1>
      <button type="button" class="ds-btn primary" onclick="dsOpenRequestAccessModal()">${dsIcon('plus', 15)} Request Access</button>
    </div>

    <div class="ds-banner-blue">
      ${dsIcon('users')}
      <span>You're managing envelopes on behalf of <b>Dana Whitfield</b>. Actions you take are recorded under your own name in the certificate of completion.</span>
    </div>

    <h3 class="ds-sec-h">Shared with me</h3>
    <p class="ds-pagelede">Inboxes you can open and act on. This is how a VA works an agent's envelopes without ever holding their password.</p>
    ${table(sharedWithMe, 'Nobody has shared their inbox with you.')}

    <h3 class="ds-sec-h">I share with</h3>
    <p class="ds-pagelede">People who can see and act on your envelopes.</p>
    ${table(iShareWith, 'You have not shared your inbox with anyone.')}`;
}

/* ==================== ENVELOPE WIZARD ==================== */
function dsNewEnvelopeWizardHTML() {
  if (!dsState.wizardData) dsResetWizard();
  const step = dsState.wizardStep || 1;

  const stepDefs = [
    { label: 'Add Documents' },
    { label: 'Add Recipients & Order' },
    { label: 'Place Fields' },
    { label: 'Review & Send' }
  ];

  const stepsHTML = stepDefs.map((s, i) => {
    const n = i + 1;
    const cls = step === n ? 'active' : (step > n ? 'done' : '');
    return `<div class="ds-step ${cls}"><span class="num">${step > n ? dsIcon('check', 13) : n}</span><span>${esc(s.label)}</span></div>`;
  }).join('');

  return `
    <div class="ds-listhead">
      <div>
        <h2 class="ds-page-title">Send an Envelope</h2>
        <div class="sub">Prepare documents, add recipients, configure signing order, and place fields</div>
      </div>
      <button class="ds-btn" onclick="dsGoto('envelopes')">${dsIcon('x', 13)} Cancel</button>
    </div>
    <div class="ds-wizard-steps">${stepsHTML}</div>
    ${step === 1 ? dsWizardStep1HTML() : ''}
    ${step === 2 ? dsWizardStep2HTML() : ''}
    ${step === 3 ? dsWizardStep3HTML() : ''}
    ${step === 4 ? dsWizardStep4HTML() : ''}`;
}

function dsWizardStep1HTML() {
  const d = dsState.wizardData;
  const docs = d.documents;
  return `
    <div class="ds-panel">
      <h4>Step 1 — Add Documents & Envelope Details</h4>
      <p class="ds-wiz-sub">Upload the PDF or Word files that recipients will review and sign, and configure the email subject and message.</p>

      <div class="ds-upload-zone"
           ondragover="event.preventDefault(); this.classList.add('dragover');"
           ondragleave="this.classList.remove('dragover');"
           ondrop="event.preventDefault(); this.classList.remove('dragover'); dsHandleFileDrop(event);">
        <input type="file" id="dsFileInput" multiple accept=".pdf,.doc,.docx,.txt" style="display:none;" onchange="dsHandleFileUpload(event)">
        <div class="ds-drop-ico">${dsIcon('file', 30)}</div>
        <b class="ds-drop-title">Drag a file here, or browse your computer</b>
        <span class="ds-drop-sub">PDF, Word or plain text. Your file is never uploaded anywhere &mdash; the name is held in this tab only, and a page refresh clears it.</span>
        <div class="ds-drop-btn-row">
          <button type="button" class="ds-btn primary" onclick="document.getElementById('dsFileInput').click()">${dsIcon('download', 15)} Browse device files</button>
          <button type="button" class="ds-btn" onclick="dsOpenSampleDocsModal()">${dsIcon('file', 15)} Sample documents</button>
        </div>

        <!-- The three sample documents are NOT uploads, so they are fenced off
             below their own label. Presenting them inside the drop zone was
             actively misleading: people clicked them expecting a file picker. -->
        <div class="ds-samples${dsShowSampleDocs() ? ' on' : ''}">
          <span class="ds-samples-label">Sample documents &mdash; for the lesson, no file of your own needed</span>
          <div class="ds-drop-btn-row">
            <button type="button" class="ds-btn" id="dsAttachPurchaseAgreement" onclick="dsAttachDoc('Purchase_Agreement_123_Main.pdf',6)">Purchase Agreement <span class="ds-samples-pages">6 pages</span></button>
            <button type="button" class="ds-btn" onclick="dsAttachDoc('Seller_Property_Disclosure.pdf',3)">Property Disclosure <span class="ds-samples-pages">3 pages</span></button>
            <button type="button" class="ds-btn" onclick="dsAttachDoc('Independent_Contractor_Agreement.pdf',4)">Contractor Agreement <span class="ds-samples-pages">4 pages</span></button>
          </div>
        </div>
      </div>

      <div class="ds-attached-wrap">
        <b class="ds-attached-title">Attached Documents (${docs.length})</b>
        ${docs.length === 0 ? '<p class="ds-drop-sub">No documents attached yet. Click a document above to attach it.</p>' :
          `<ul class="ds-attached-list">
            ${docs.map(doc => `
              <li>
                ${dsIcon('file', 17)}
                <b>${esc(doc.name)}</b>
                ${doc.uploaded ? `<span class="ds-attached-tag">From your device</span>` : ''}
                <span class="ds-attached-meta">${esc(dsDocMeta(doc))}</span>
                <button type="button" class="ds-btn sm danger ds-attached-del" onclick="dsRemoveDoc('${escAttr(doc.name)}')">${dsIcon('x', 12)} Remove</button>
              </li>`).join('')}
          </ul>`}
      </div>

      <div class="ds-wiz-section">
        <div class="ds-wiz-field">
          <label class="ds-wiz-label">Email Subject</label>
          <input type="text" id="dsWizSubject" class="ds-wiz-input" value="${escAttr(d.subject)}" maxlength="${DS_SUBJECT_MAX}" placeholder="e.g. Please Docusign: Purchase Agreement — 123 Main St" oninput="dsWizardField('subject', this.value)">
          <span class="ds-wiz-count" id="dsSubjectCount">${(d.subject || '').length} / ${DS_SUBJECT_MAX}</span>
        </div>
        <div>
          <label class="ds-wiz-label">Email Message</label>
          <textarea id="dsWizMessage" class="ds-wiz-input" rows="3" maxlength="${DS_MESSAGE_MAX}" placeholder="Optional message shown to every signer…" oninput="dsWizardField('message', this.value)">${esc(d.message)}</textarea>
          <span class="ds-wiz-count" id="dsMessageCount">${(d.message || '').length} / ${DS_MESSAGE_MAX}</span>
        </div>
      </div>

      <div class="ds-wiz-foot">
        <span class="ds-wiz-tip-text">${dsIcon('bulb', 13)} Tip: You can add multiple documents per envelope</span>
        <button type="button" class="ds-btn primary" id="dsBtnNextRecipients" ${dsStep1Problem() ? 'disabled' : ''} onclick="dsNextWizardStep(2)">Next: Add Recipients →</button>
        ${dsStep1Problem() ? `<span class="ds-wiz-block">${dsIcon('alert', 14)}${esc(dsStep1Problem())}</span>` : ''}
      </div>
    </div>`;
}


/* ---------- Wizard validation ----------
   The wizard is where the simulator teaches, so it has to behave like the real
   product including the parts that say no. Two rules are deliberate and worth
   stating: a syntactically invalid address BLOCKS the Next button, but a
   suspicious domain only warns. Lesson 5 is built on an envelope that bounced
   off gmial.com — if the wizard refused to send it, the trainee could never make
   the mistake the course is about. */
const DS_SUBJECT_MAX = 100;
const DS_MESSAGE_MAX = 10000;
/* Near-misses for the big consumer domains. These warn, never block. */
const DS_TYPO_DOMAINS = ['gmial.com', 'gmai.com', 'gmial.co', 'hotmial.com', 'hotmai.com',
                         'yaho.com', 'yahooo.com', 'outlok.com', 'outllook.com', 'iclould.com'];

function dsEmailSyntaxOk(email) {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(String(email || '').trim());
}
function dsSuspiciousDomain(email) {
  const at = String(email || '').lastIndexOf('@');
  if (at < 0) return null;
  const domain = email.slice(at + 1).toLowerCase();
  return DS_TYPO_DOMAINS.indexOf(domain) > -1 ? domain : null;
}

/* Every reason the wizard will not let you leave step 2. Returned as a list so
   the UI can show all of them at once rather than one at a time. */
function dsRecipientProblems() {
  const recips = (dsState.wizardData.recipients || []);
  const out = { blocking: {}, warnings: {}, count: 0 };
  const seen = {};
  recips.forEach(r => {
    const email = (r.email || '').trim();
    const name = (r.name || '').trim();
    if (!email && !name) { out.blocking[r.id] = 'Enter a name and an email address.'; out.count++; return; }
    if (email && !dsEmailSyntaxOk(email)) { out.blocking[r.id] = 'That is not a valid email address.'; out.count++; return; }
    if (!email) { out.blocking[r.id] = 'An email address is required.'; out.count++; return; }
    if (!name) { out.blocking[r.id] = 'A name is required when an email is set.'; out.count++; return; }
    const key = email.toLowerCase();
    if (seen[key]) { out.blocking[r.id] = 'This address is already on the envelope.'; out.count++; return; }
    seen[key] = true;
    const bad = dsSuspiciousDomain(email);
    if (bad) out.warnings[r.id] = 'Did you mean a different domain? "' + bad + '" is a common typo — check before sending.';
    if (r.action === 'Witness' && !r.witnessFor) {
      out.blocking[r.id] = 'Select which signer this witness is assigned to.';
      out.count++;
      return;
    }
    if (r.accessCode && r.accessCode.trim().length > 0 && r.accessCode.trim().length < 6) {
      out.warnings[r.id] = 'Access code should be at least 6 characters.';
    }
  });
  return out;
}

/* True when step 1 has everything it needs. */
function dsStep1Problem() {
  const d = dsState.wizardData;
  if (!d.documents || !d.documents.length) return 'Attach at least one document.';
  if (!(d.subject || '').trim()) return 'An email subject is required.';
  if ((d.subject || '').length > DS_SUBJECT_MAX) return 'The subject is over ' + DS_SUBJECT_MAX + ' characters.';
  return null;
}

function dsWizardField(key, value) {
  dsState.wizardData[key] = value;
  const el = document.getElementById(key === 'subject' ? 'dsSubjectCount' : 'dsMessageCount');
  const max = key === 'subject' ? DS_SUBJECT_MAX : DS_MESSAGE_MAX;
  if (el) {
    el.textContent = value.length + ' / ' + max;
    el.classList.toggle('over', value.length > max);
  }
  const next = document.getElementById('dsBtnNextRecipients');
  if (next && key === 'subject') next.disabled = !!dsStep1Problem();
}

/* ---------- Sample documents: shown only during a walkthrough ----------
   The three sample buttons are training scaffolding, not product. Docusign's own
   upload zone offers a file picker and nothing else, so that is all this shows
   unless a lesson is actively running.

   They cannot simply be deleted: #dsAttachPurchaseAgreement is one of the
   thirteen frozen walkthrough selectors, and Lesson 2 points at that exact
   button to teach attaching a document (marking ds_c1_2). A hidden element is
   also useless to a walkthrough, which measures its target to draw a highlight.
   So the buttons live in the DOM permanently and are revealed by CSS.

   The condition is only walkActive(), and the ordering is safe: simWalkStart()
   sets the walk state before it calls a step's setup(), and setup() is what
   navigates here — so the flag is already true by the time this renders.

   Deliberate consequence: a trainee who dismisses the walkthrough mid-lesson
   sees only the file picker. That is fine. Attaching their own file marks
   ds_c1_2 exactly the same way, and the walkthrough can be replayed from the
   lesson card. Showing the scaffolding to everyone who had not yet finished
   Lesson 2 was the wrong trade — it meant a first-time visitor exploring the
   product saw course furniture. */
function dsShowSampleDocs() {
  try {
    return !!(SimEngine.walkActive && SimEngine.walkActive());
  } catch (e) {
    /* Engine not ready yet — treat as "not in a lesson". */
    return false;
  }
}

/* Attaching a document attaches a document.

   It used to do considerably more: it rewrote the subject with a hard-coded
   "— 123 Main Street", and injected John Smith, Sarah Johnson and four fields
   into an envelope the visitor had built themselves. Attach a PDF, and two
   strangers appeared on your envelope.

   That cast is lesson scaffolding, and lessons and the product are separate
   things. The prefill now happens only while the course is running — the same
   dsTrainingActive() seam that decides whether an action grades — so a visitor
   exploring the wizard gets exactly what they asked for, and a trainee still
   lands on a workable envelope without typing two recipients by hand first. */
/* ============================================================================
   DOCUMENT LIBRARY
   The wizard used to attach a name and a page count with nothing behind them —
   dsAttachDoc('Purchase_Agreement_123_Main.pdf', 6) invented both, and the
   canvas then drew a placeholder paragraph that said as much. These entries
   resolve that name to a real fictitious document in documents/, so "page 3"
   means a page that exists and can be shown.

   Keyed by the exact file name the three sample buttons already pass, because
   #dsAttachPurchaseAgreement is a frozen walkthrough target (docusign-data.js)
   and those buttons must not change. The library is the source of truth for
   the page count; the argument is kept only for uploads, which have no entry.
   ============================================================================ */
const DS_DOC_LIBRARY = [
  { id: 'purchase-agreement',   name: 'Purchase_Agreement_123_Main.pdf',
    pages: 6, path: 'documents/doc-purchase-agreement.html',
    title: 'Residential Real Estate Purchase Agreement' },
  { id: 'property-disclosure',  name: 'Seller_Property_Disclosure.pdf',
    pages: 3, path: 'documents/doc-property-disclosure.html',
    title: "Seller's Property Disclosure Notice" },
  { id: 'contractor-agreement', name: 'Independent_Contractor_Agreement.pdf',
    pages: 4, path: 'documents/doc-contractor-agreement.html',
    title: 'Independent Contractor Agreement' }
];

function dsDocFromLibrary(name) {
  return DS_DOC_LIBRARY.find(d => d.name === name) || null;
}

/* How many blank sheets an uploaded file gets. Three is enough to practise
   placing fields across pages. It is deliberately NOT derived from the file
   size: guessing a page count and presenting it as fact would be a small lie,
   and the sheets already say plainly that they are stand-ins. */
const DS_UPLOAD_BLANK_PAGES = 3;

/* A blank document with the same [data-page] structure the library files use,
   so dsPaintCanvasFields() places markers on it without knowing the difference.
   Delivered through srcdoc, so still no network call. */
function dsBlankDocHTML(name, pages) {
  const n = Math.max(1, pages || DS_UPLOAD_BLANK_PAGES);
  const sheets = [];
  for (let i = 1; i <= n; i++) {
    sheets.push(
      '<div class="paper" data-page="' + i + '">' +
        '<div class="blanknote">Blank practice sheet &mdash; ' + esc(name) + '</div>' +
        '<div class="pagenum">Page ' + i + ' of ' + n + '</div>' +
      '</div>');
  }
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
    '<link rel="stylesheet" href="documents/doc.css">' +
    '<style>' +
      'body{padding:24px 20px;}' +
      '.paper{min-height:640px;position:relative;}' +
      '.blanknote{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
        'font-size:11.5px;color:#6e727c;border:1px dashed #d8dbe0;border-radius:6px;' +
        'padding:10px 14px;text-align:center;}' +
    '</style></head><body>' +
    '<div class="banner">This simulator never reads the file you attached. These sheets stand in for its pages so you can practise placing fields.</div>' +
    sheets.join('') +
    '</body></html>';
}

/* ---------- Sample document picker ----------
   The inline sample buttons above stay exactly where they are, shown only while
   a walkthrough runs: #dsAttachPurchaseAgreement is a frozen walkthrough target
   and moving it into a dialog that starts closed would hide it mid-lesson. This
   picker is an addition beside them, always reachable, so someone exploring
   outside a lesson can still get a real document into an envelope.

   Preview matters more than it looks: a coordinator reads the contract before
   deciding where a signature belongs, and until now the only way to attach one
   was blind. */
function dsOpenSampleDocsModal() {
  const old = document.getElementById('dsSampleDocsWrap');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'dsSampleDocsWrap';
  modal.className = 'ds-modal-backdrop';
  modal.innerHTML = `
    <div class="ds-modal-card">
      <div class="ds-modal-head">
        <div>
          <h3 class="ds-adopt-head-wrap">${dsIcon('file')} Sample documents</h3>
          <div class="ds-audit-actor">Practice contracts you can attach without a file of your own. Open one to read it first.</div>
        </div>
        <button type="button" class="ds-btn ds-cert-close-btn"
                onclick="document.getElementById('dsSampleDocsWrap').remove()">${dsIcon('x', 13)}</button>
      </div>
      <div class="ds-modal-body">
        <ul class="ds-sampledoc-list">
          ${DS_DOC_LIBRARY.map(d => `
            <li class="ds-sampledoc">
              <div class="ds-sampledoc-info">
                <b>${esc(d.title)}</b>
                <span>${esc(d.name)} &middot; ${d.pages} page${d.pages === 1 ? '' : 's'}</span>
              </div>
              <div class="ds-sampledoc-actions">
                <button type="button" class="ds-btn" onclick="dsPreviewSampleDoc('${escAttr(d.id)}')">${dsIcon('eye', 14)} Preview</button>
                <button type="button" class="ds-btn primary" onclick="dsAttachSampleDoc('${escAttr(d.id)}')">${dsIcon('plus', 14)} Attach</button>
              </div>
            </li>`).join('')}
        </ul>
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

function dsPreviewSampleDoc(id) {
  const d = DS_DOC_LIBRARY.find(x => x.id === id);
  if (!d) return;
  /* The viewer frame may still hold an envelope document; clear the marker so
     dsViewLibraryDoc does not mistake this for the same file already loaded. */
  const frame = document.getElementById('simDocFrame');
  if (frame) frame.removeAttribute('data-ds-doc');

  /* This picker sits at z-index 20000 and the shared viewer tops out at 400, so
     leaving the picker up would cover the very document Preview just opened.
     Hiding it is better than closing it: you keep your place in the list, and
     it comes back by itself when the viewer closes. Watching the class rather
     than wrapping simCloseDoc keeps the shared engine untouched. */
  const wrap = document.getElementById('dsSampleDocsWrap');
  const modal = document.getElementById('simDocModal');
  if (wrap && modal && window.MutationObserver) {
    wrap.style.display = 'none';
    const obs = new MutationObserver(() => {
      if (!modal.classList.contains('open')) {
        wrap.style.display = '';
        obs.disconnect();
      }
    });
    obs.observe(modal, { attributes: true, attributeFilter: ['class'] });
  }

  SimEngine.viewDoc(d.path, d.title);
}

function dsAttachSampleDoc(id) {
  const d = DS_DOC_LIBRARY.find(x => x.id === id);
  if (!d) return;
  const wrap = document.getElementById('dsSampleDocsWrap');
  if (wrap) wrap.remove();
  dsAttachDoc(d.name, d.pages);
  simToast(d.title + ' attached to this envelope.', { tone: 'good' });
}

function dsAttachDoc(name, pages) {
  dsMark('ds_c1_2');

  if (!dsState.wizardData.documents.some(d => d.name === name)) {
    const lib = dsDocFromLibrary(name);
    /* A library document carries its id, path and real page count. An uploaded
       file has none of that, so it keeps the old shape and the caller's count. */
    dsState.wizardData.documents.push(lib
      ? { name: lib.name, pages: lib.pages, docId: lib.id, path: lib.path, title: lib.title }
      : { name: name, pages: pages });
  }

  /* Defaulting the subject to the document name is real Docusign behaviour, so
     it stays — but it is the document's name, not an address from a lesson. */
  if (!(dsState.wizardData.subject || '').trim()) {
    dsState.wizardData.subject =
      ('Please Docusign: ' + name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')).slice(0, DS_SUBJECT_MAX);
  }

  if (dsTrainingActive()) dsSeedLessonEnvelope();
  dsRenderRoot();
}

/* The worked example the course builds on: a buyer, a seller, and the four
   fields a purchase agreement needs. Only ever called from inside a lesson, and
   only when the envelope is still empty — it must never overwrite work in
   progress. */
function dsSeedLessonEnvelope() {
  const recs = dsState.wizardData.recipients || [];
  const untouched = !recs.length || (recs.length === 1 && !(recs[0].name || '').trim() && !(recs[0].email || '').trim());
  if (!untouched) return;

  dsState.wizardData.recipients = [
    { id: 'wr1', name: 'John Smith', email: 'john.smith@gmail.com', role: 'Buyer', action: 'Needs to Sign', order: 1 },
    { id: 'wr2', name: 'Sarah Johnson', email: 'sarah.j@realty.com', role: 'Seller', action: 'Needs to Sign', order: 2 }
  ];
  /* Signatures belong on the execution page, which is the last one — derived
     from the document actually attached rather than hard-coded, because this
     runs for whichever sample the lesson picked.

     page/x/y/value are not decoration. This was the one field-creation path
     that still emitted the old shape, and since fields are drawn on the
     document rather than listed, four fields without coordinates would have
     stacked on the same spot on page 1. */
  const docs = dsState.wizardData.documents || [];
  const lastPage = (docs[0] && docs[0].pages) || 1;
  const seedField = (id, type, recipId, label, col, row) => ({
    id: id, type: type, recipientId: recipId, page: lastPage,
    x: col, y: Math.min(88, 62 + row * 9),
    label: label, required: true, value: null,
    validation: 'None (standard text)'
  });

  dsState.wizardData.fields = [
    seedField('wf1', 'Signature',   'wr1', 'John Smith Signature',      16, 0),
    seedField('wf2', 'Date Signed', 'wr1', 'John Smith Date Signed',    47, 0),
    seedField('wf3', 'Signature',   'wr2', 'Sarah Johnson Signature',   16, 1),
    seedField('wf4', 'Date Signed', 'wr2', 'Sarah Johnson Date Signed', 47, 1)
  ];
}

/* ---------- File attachment ----------
   Two kinds of document can end up on an envelope, and they are deliberately
   different.

   A sample document is one of the three from the file cabinet. It has a real
   page count because the simulator knows what is in it, and opening it renders
   actual contract text.

   An uploaded document is whatever the visitor picked from their own machine.
   The picker is real — the browser genuinely reads the file — but nothing is
   stored, nothing is parsed and nothing leaves the tab: all the simulator keeps
   is the name and the size the operating system reported. There is deliberately
   NO page count, because counting pages would mean parsing the PDF, and the old
   code guessed it from the byte size (a 2 MB file claimed forty pages). An
   invented number is worse than no number.

   Everything here lives in dsState.wizardData, which is memory. Reload and the
   attachment is gone, which is exactly the intended behaviour. */

/* Bytes -> the same short form a file manager shows. */
function dsFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/* One line of metadata per attached document: pages when we genuinely know
   them, the real file size when we do not. Never a guess. */
function dsDocMeta(doc) {
  if (doc.uploaded) return dsFileSize(doc.size);
  return doc.pages + ' page' + (doc.pages === 1 ? '' : 's');
}

/* Shared by the file picker and the drop zone — these were two near-identical
   copies, which is how they drifted apart in the first place. */
function dsHandleFiles(files, how) {
  if (!files || !files.length) return;
  let added = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (dsState.wizardData.documents.some(d => d.name === f.name)) continue;
    dsState.wizardData.documents.push({
      name: f.name,
      size: f.size,
      uploaded: true,
      /* Blank stand-in sheets. The file is never read — nothing here claims to
         be its contents — but giving it pages means the placement gesture works
         on your own document instead of dead-ending at step 3. */
      pages: DS_UPLOAD_BLANK_PAGES
    });
    added++;
    if (!dsState.wizardData.subject || !dsState.wizardData.subject.trim()) {
      dsState.wizardData.subject =
        ('Please Docusign: ' + f.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ')).slice(0, DS_SUBJECT_MAX);
    }
  }
  if (!added) { simToast('That document is already attached.'); return; }
  dsMark('ds_c1_2');
  simToast(added + ' file' + (added === 1 ? '' : 's') + ' attached' + (how ? ' by ' + how : '') + '.', { tone: 'good' });
  dsRenderRoot();
}

function dsHandleFileUpload(e) {
  dsHandleFiles(e.target.files, null);
  /* Clearing the input matters: without it, picking the same file twice in a
     row fires no change event and the second attempt looks broken. */
  e.target.value = '';
}
function dsHandleFileDrop(e) {
  dsHandleFiles(e.dataTransfer ? e.dataTransfer.files : null, 'drag and drop');
}

/* Removing the last document leaves an envelope with nothing to sign, which is
   a state the wizard should not let anyone reach by accident. */
function dsRemoveDoc(name) {
  const docs = dsState.wizardData.documents || [];
  if (docs.length === 1) {
    dsConfirm({
      title: 'Remove the only document?',
      body: 'This envelope has nothing else attached. You will not be able to continue past step 1 until you add another document.',
      danger: true,
      confirmLabel: 'Remove it',
      onConfirm: () => dsRemoveDocNow(name)
    });
    return;
  }
  dsRemoveDocNow(name);
}

function dsRemoveDocNow(name) {
  dsState.wizardData.documents = (dsState.wizardData.documents || []).filter(d => d.name !== name);
  dsRenderRoot();
}

function dsToggleRecipAdv(id) {
  const r = (dsState.wizardData.recipients || []).find(x => x.id === id);
  if (!r) return;
  r.advOpen = !r.advOpen;
  dsRenderRoot();
}

function dsWizardStep2HTML() {
  const recs = dsState.wizardData.recipients;

  /* Validation is computed once for the whole step, so a duplicate address can
     flag both rows involved rather than only the second one. */
  const probs = dsRecipientProblems();

  const ACTIONS = [
    'Needs to Sign',
    'Needs to Sign in Person',
    'Receives a Copy',
    'Needs to View',
    'Specify Recipients',
    'Allow to Edit',
    'Witness'
  ];

  const idvEnabled = !!(dsDemo.settings && dsDemo.settings.idvEnabled);

  const rows = recs.map((r, i) => {
    const err = probs.blocking[r.id];
    const warn = probs.warnings[r.id];
    const isCC = r.action === 'Receives a Copy';
    const isWitness = r.action === 'Witness';
    const otherSigners = recs.filter(x => x.id !== r.id && dsRecipientSigns(x));
    const hasAdvConfig = !!(r.accessCode || r.smsAuth || r.idv || r.privateMessage || (isWitness && r.witnessFor));

    /* Any role already on the recipient is kept as an option even if it is not
       in the canonical list — switching this control from a free-text box to a
       dropdown must not silently drop a value somebody already typed. */
    const roles = DS_RECIPIENT_ROLES.indexOf(r.role) > -1 || !r.role
      ? DS_RECIPIENT_ROLES : [r.role].concat(DS_RECIPIENT_ROLES);

    return `
    <div class="ds-wr${err ? ' bad' : warn ? ' warn' : ''}" id="dsWr-${escAttr(r.id)}">
      <div class="ds-wr-order">
        <label>Order</label>
        <input type="number" min="1" max="10" value="${r.order}"
               title="Recipients with the same number sign in parallel"
               onchange="dsUpdateRecipient('${r.id}','order',parseInt(this.value,10)||1)">
      </div>
      <div class="ds-wr-name">
        <label>Name</label>
        <input type="text" value="${escAttr(r.name)}" placeholder="Full name"
               oninput="dsUpdateRecipient('${r.id}','name',this.value)">
      </div>
      <div class="ds-wr-email">
        <label>Email</label>
        <input type="email" value="${escAttr(r.email)}" placeholder="name@example.com"
               list="dsContactList" autocomplete="off"
               oninput="dsUpdateRecipient('${r.id}','email',this.value)">
      </div>
      <div class="ds-wr-role">
        <label>Role</label>
        <select onchange="dsUpdateRecipient('${r.id}','role',this.value)">
          <option value="">Select a role…</option>
          ${roles.map(role => `<option value="${escAttr(role)}" ${r.role === role ? 'selected' : ''}>${esc(role)}</option>`).join('')}
        </select>
      </div>
      <div class="ds-wr-action">
        <label>Action</label>
        <select onchange="dsUpdateRecipient('${r.id}','action',this.value)">
          ${ACTIONS.map(a => `<option value="${escAttr(a)}" ${r.action === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}
        </select>
      </div>
      <button type="button" class="ds-btn sm ds-wr-adv-btn" onclick="dsToggleRecipAdv('${r.id}')" title="Advanced recipient settings">
        Advanced ${r.advOpen ? '▴' : '▾'}${hasAdvConfig ? '<span class="ds-adv-dot"></span>' : ''}
      </button>
      <button type="button" class="ds-btn sm danger ds-wr-del" onclick="dsRemoveRecipient('${r.id}')" title="Remove recipient">${dsIcon('x', 12)}</button>

      ${r.advOpen ? `
        <div class="ds-wr-adv" id="dsWrAdv-${escAttr(r.id)}">
          <div class="ds-wr-adv-head">
            <b>${dsIcon('lock', 12)} Advanced Recipient Settings</b>
            ${isCC ? '<span class="ds-recip-subnote">Receives a Copy (CC) recipients do not authenticate or receive private messages.</span>' : ''}
          </div>
          ${isWitness ? `
            <div class="ds-wr-adv-row">
              <label>Witness For (Signer)</label>
              <select onchange="dsUpdateRecipient('${r.id}','witnessFor',this.value)">
                <option value="">Select signer to witness…</option>
                ${otherSigners.map(os => `<option value="${escAttr(os.id)}" ${r.witnessFor === os.id ? 'selected' : ''}>${esc(os.name || os.role || os.id)} (${esc(os.email)})</option>`).join('')}
              </select>
            </div>` : ''}
          <div class="ds-wr-adv-grid">
            <div class="ds-wr-adv-col">
              <label>Access Code</label>
              <input type="text" placeholder="Min. 6 characters" value="${escAttr(r.accessCode || '')}"
                     ${isCC || r.smsAuth ? 'disabled' : ''}
                     title="${r.smsAuth ? 'Access Code and SMS Auth are mutually exclusive' : isCC ? 'Not applicable to CC' : 'Signer must enter this code before viewing document'}"
                     oninput="dsUpdateRecipient('${r.id}','accessCode',this.value)">
              <span class="ds-recip-subnote">Signer enters code before viewing</span>
            </div>
            <div class="ds-wr-adv-col">
              <label>SMS Authentication</label>
              <input type="tel" placeholder="(555) 000-0000" value="${escAttr(r.smsAuth || '')}"
                     ${isCC || r.accessCode ? 'disabled' : ''}
                     title="${r.accessCode ? 'Access Code and SMS Auth are mutually exclusive' : isCC ? 'Not applicable to CC' : 'One-time passcode sent via SMS'}"
                     oninput="dsUpdateRecipient('${r.id}','smsAuth',this.value)">
              <span class="ds-recip-subnote">One-time passcode sent via SMS</span>
            </div>
            <div class="ds-wr-adv-col">
              <label>ID Verification</label>
              <label class="ds-switch-label">
                <input type="checkbox" ${isCC || !idvEnabled ? 'disabled' : ''} ${r.idv ? 'checked' : ''}
                       onchange="dsUpdateRecipient('${r.id}','idv',this.checked)">
                <span>Require Gov ID / Passport</span>
              </label>
              <span class="ds-recip-subnote">${!idvEnabled ? 'Disabled: Enable in Settings → Identity Verification' : 'Verified by DocuSign IDV'}</span>
            </div>
          </div>
          <div class="ds-wr-adv-row">
            <label>Private Message (Visible only to this recipient)</label>
            <textarea rows="2" maxlength="1000" placeholder="Add a private note for this recipient only..."
                      ${isCC ? 'disabled' : ''}
                      oninput="dsUpdateRecipient('${r.id}','privateMessage',this.value)">${esc(r.privateMessage || '')}</textarea>
          </div>
        </div>` : ''}

      <p class="ds-wr-msg${err ? ' bad' : warn ? ' warn' : ''}" id="dsWrMsg-${escAttr(r.id)}">${err || warn ? dsIcon('alert', 13) + esc(err || warn) : ''}</p>
    </div>`;
  }).join('');

  /* Address book, offered as a native datalist: no custom dropdown to keep in
     sync with the keyboard, and it works in every browser this ships to. */
  const contactList = '<datalist id="dsContactList">' +
    DS_S_CONTACTS.map(c => '<option value="' + escAttr(c.email) + '">' + escAttr(c.name + ' — ' + c.company) + '</option>').join('') +
    '</datalist>';

  return `
    <div class="ds-panel">
      <h4>Step 2 — Add Recipients & Signing Order</h4>
      <p class="ds-wiz-sub">Specify who needs to sign, who gets a copy (CC), and whether they sign sequentially or all at once.</p>

      <div class="ds-wiz-seq-box">
        ${contactList}
        <input type="checkbox" id="chkSeq" ${dsState.wizardData.useSequentialOrder ? 'checked' : ''} onchange="dsToggleSequential(this.checked)" class="ds-wiz-check">
        <label for="chkSeq" class="ds-wiz-checklabel">Set signing order — recipients sign in sequence. Give two recipients the same number and they sign in parallel.</label>
      </div>

      <div class="ds-wiz-recip-wrap">${rows}</div>

      <div class="ds-wiz-add-recip-wrap">
        <button type="button" class="ds-btn" onclick="dsAddRecipient()">+ Add Recipient</button>
      </div>

      <div class="ds-box-tip">
        ${dsIcon('bulb', 14)} <b>Tip:</b> Setting Buyer to Order 1 and Seller to Order 2 ensures Sarah cannot sign until John signs first — critical for real estate transactions.
      </div>

      <div class="ds-wiz-foot">
        <button type="button" class="ds-btn" onclick="dsNextWizardStep(1)">← Back</button>
        <button type="button" class="ds-btn primary" id="dsBtnNextFields" ${probs.count ? 'disabled' : ''} onclick="dsNextWizardStep(3)">Next: Place Fields →</button>
        <span class="ds-wiz-block" id="dsRecipBlock">${probs.count ? dsIcon('alert', 14) + probs.count + ' recipient problem' + (probs.count === 1 ? '' : 's') + ' to fix' : ''}</span>
      </div>
    </div>`;
}


/* The roles the account actually uses. Taken from the roles that appear across
   the envelopes and templates rather than invented, so the dropdown offers what
   a real file in this office would need. */
const DS_RECIPIENT_ROLES = [
  'Buyer', 'Seller', 'Agent', 'Listing Agent', 'Broker',
  'Tenant', 'Landlord', 'Lender', 'Escrow Officer', 'Title Officer',
  'Attorney', 'Contractor', 'Vendor', 'Manager', 'Employee',
  'Candidate', 'Counterparty', 'Compliance', 'Witness'
];

function dsUpdateRecipient(id, key, val) {
  const r = dsState.wizardData.recipients.find(x => x.id === id);
  if (!r) return;
  r[key] = val;
  if (key === 'action') dsMark('ds_c2_1');
  /* Re-check without re-rendering. A full re-render on every keystroke would
     destroy the input and throw away the caret, which is why the validation
     messages used to go stale: they were painted once at render time and never
     updated, so a row you had just filled in still showed "Enter a name and an
     email address". */
  dsRevalidateRecipients();
}

/* Repaints only the validation state: each row's colour, its message, and the
   Next button. Touches nothing a person might be typing into. */
function dsRevalidateRecipients() {
  if (dsState.view !== 'new-envelope' || dsState.wizardStep !== 2) return;
  const probs = dsRecipientProblems();

  (dsState.wizardData.recipients || []).forEach(r => {
    const row = document.getElementById('dsWr-' + r.id);
    const msg = document.getElementById('dsWrMsg-' + r.id);
    if (!row || !msg) return;
    const err = probs.blocking[r.id];
    const warn = probs.warnings[r.id];
    row.classList.toggle('bad', !!err);
    row.classList.toggle('warn', !err && !!warn);
    msg.className = 'ds-wr-msg' + (err ? ' bad' : warn ? ' warn' : '');
    msg.innerHTML = (err || warn) ? dsIcon('alert', 13) + esc(err || warn) : '';
  });

  const next = document.getElementById('dsBtnNextFields');
  if (next) next.disabled = probs.count > 0;
  const block = document.getElementById('dsRecipBlock');
  if (block) {
    block.innerHTML = probs.count
      ? dsIcon('alert', 14) + probs.count + ' recipient problem' + (probs.count === 1 ? '' : 's') + ' to fix'
      : '';
  }
}

function dsAddRecipient() {
  const recs = dsState.wizardData.recipients;
  const nextOrder = dsState.wizardData.useSequentialOrder ? recs.length + 1 : 1;
  /* Sequential rather than time-based: ids that change between runs make the
     simulator impossible to screenshot and break element lookups mid-session. */
  const newId = 'wr' + (100 + dsRecipSeq++);
  recs.push({
    id: newId,
    name: '',
    email: '',
    role: '',
    action: 'Needs to Sign',
    order: nextOrder
  });
  dsRenderRoot();
}

function dsRemoveRecipient(id) {
  const recs = dsState.wizardData.recipients;
  if (recs.length <= 1) {
    simToast('An envelope must have at least one recipient.');
    return;
  }
  dsState.wizardData.recipients = recs.filter(r => r.id !== id);
  // Re-index orders if sequential
  if (dsState.wizardData.useSequentialOrder) {
    dsState.wizardData.recipients.forEach((r, i) => r.order = i + 1);
  }
  dsRenderRoot();
}

function dsToggleSequential(val) {
  if (!dsState.wizardData) dsResetWizard();
  dsState.wizardData.useSequentialOrder = !!val;
  const recs = dsState.wizardData.recipients || [];
  if (!val) {
    recs.forEach(r => r.order = 1); // parallel
  } else {
    recs.forEach((r, i) => r.order = i + 1);
  }
  /* B-2 fix: marks only the one matching the action taken */
  if (val) dsMark('ds_c2_2');   /* enabled sequential */
  else     dsMark('ds_c2_3');   /* configured parallel (all same order) */
  dsRenderRoot();
}

/* ============================================================================
   STEP 3 — PLACE AND ASSIGN FIELDS
   ============================================================================ */

const DS_FIELD_TYPES = [
  { type: 'Signature',     icon: 'pen',         signing: true },
  { type: 'Initial',       icon: 'edit',        signing: true },
  { type: 'Date Signed',   icon: 'calendar' },
  { type: 'Name',          icon: 'user' },
  { type: 'Email Address', icon: 'mail' },
  { type: 'Company',       icon: 'building' },
  { type: 'Title',         icon: 'briefcase' },
  { type: 'Text',          icon: 'type' },
  { type: 'Checkbox',      icon: 'checkSquare' },
  { type: 'Dropdown',      icon: 'caret' },
  { type: 'Radio',         icon: 'checkCircle' },
  { type: 'Note',          icon: 'fileText' },
  { type: 'Attachment',    icon: 'download' }
];
const DS_SIGNING_TYPES = DS_FIELD_TYPES.filter(f => f.signing).map(f => f.type);

/* Recipients who are expected to fill something in. A CC cannot complete a
   field, so assigning one to them is an error the audit reports. */
function dsRecipientSigns(r) {
  return r.action === 'Needs to Sign' || r.action === 'Needs to Sign in Person' || r.action === 'Witness';
}

/* Colour index per recipient, by position. Docusign colour-codes fields by
   signer; deriving it from the index means it works for any number of
   recipients instead of assuming exactly a buyer and a seller. */
function dsRecipColor(recipId) {
  const recs = dsState.wizardData.recipients || [];
  const i = recs.findIndex(r => r.id === recipId);
  return 'c' + ((i < 0 ? 0 : i) % 6);
}

/* ============================================================================
   STEP 3 CANVAS — the document itself, not a description of it

   This page used to be a letterhead, a generated sentence about the recipients,
   and a clause that literally read "the document a recipient will see here".
   Fields were listed underneath, so nothing was ever placed anywhere: a field
   had a recipient and a label but no position, and the trainee never learned
   the gesture the real product is built around.

   A document with a DS_DOC_LIBRARY entry is now loaded into an iframe by src —
   the same zero-network mechanism the viewer uses — and markers are injected
   onto its pages at each field's stored percentage coordinates. Documents with
   no library entry (an upload, or nothing attached) keep a placeholder, because
   there is no body to place anything on and pretending otherwise would lie.
   ============================================================================ */
/* Recipient colours, indexed by the order recipients were added — the same idea
   as the coloured bar Docusign puts beside each recipient in its own wizard.
   Shared by the step 3 canvas and the read-only document viewer so a field is
   the same colour wherever you meet it. */
const DS_RECIP_COLORS = ['#4C00FB', '#00857D', '#C43E1C', '#7A5AF8', '#B26A00'];

function dsCanvasDoc() {
  const docs = dsState.wizardData.documents || [];
  const idx = Math.min(dsState.canvasDocIndex || 0, Math.max(0, docs.length - 1));
  const doc = docs[idx] || null;
  return { doc: doc, idx: idx, lib: doc ? dsDocFromLibrary(doc.name) : null };
}

function dsCanvasDocHTML(docs, recs, docName) {
  const ctx = dsCanvasDoc();

  /* Nothing attached yet is the only case with no pages to show. An uploaded
     file gets blank stand-in sheets rather than a dead end, so the placement
     gesture works on it exactly as it does on a library document. */
  if (!ctx.doc) {
    return `
      <div class="ds-doc-page">
        <div class="ds-doc-letterhead">
          <h2 class="ds-doc-title">${esc(docName)}</h2>
          <div class="ds-doc-sub">${esc(dsState.wizardData.subject || 'No subject set')}</div>
        </div>
        <p class="ds-doc-clause">No document attached. Go back to step 1 and attach one.</p>
      </div>`;
  }

  const total = (ctx.lib ? ctx.lib.pages : ctx.doc.pages) || 1;
  const cur = Math.max(1, Math.min(dsState.canvasPage || 1, total));
  const frameSrc = ctx.lib
    ? `src="${escAttr(ctx.lib.path)}"`
    : `srcdoc="${escAttr(dsBlankDocHTML(ctx.doc.name, total))}"`;
  const frameTitle = ctx.lib ? (ctx.lib.title || ctx.lib.name) : ctx.doc.name;

  const tabs = docs.length > 1 ? `
    <div class="ds-canvas-doctabs">
      ${docs.map((d, i) => `
        <button type="button" class="ds-canvas-doctab${i === ctx.idx ? ' on' : ''}"
                onclick="dsSetCanvasDoc(${i})">${esc(d.name)}</button>`).join('')}
    </div>` : '';

  return `
    <div class="ds-canvas-docbar">
      ${tabs}
      <div class="ds-canvas-pager">
        <!-- Relative, not a baked-in page number. Scrolling the document moves
             dsState.canvasPage without re-rendering, so a hard-coded
             dsSetCanvasPage(2) would still jump to page 2 after you had
             scrolled to page 5. -->
        <button type="button" class="ds-canvas-pagebtn" ${cur <= 1 ? 'disabled' : ''}
                onclick="dsStepCanvasPage(-1)">&larr;</button>
        <span class="ds-canvas-pagecount">Page ${cur} of ${total}</span>
        <button type="button" class="ds-canvas-pagebtn" ${cur >= total ? 'disabled' : ''}
                onclick="dsStepCanvasPage(1)">&rarr;</button>
      </div>
    </div>
    <iframe class="ds-doc-frame" ${frameSrc}
            title="${escAttr(frameTitle)}"
            onload="dsPaintCanvasFields(this)"></iframe>`;
}

function dsSetCanvasPage(n) {
  dsState.canvasPage = Math.max(1, n);
  dsRenderRoot();
}

/* Steps from wherever the reader currently is, which the scroll listener keeps
   up to date, and clamps to the attached document's real page count. */
function dsStepCanvasPage(delta) {
  const ctx = dsCanvasDoc();
  if (!ctx.doc) return;
  const total = (ctx.lib ? ctx.lib.pages : ctx.doc.pages) || 1;
  dsSetCanvasPage(Math.max(1, Math.min(total, (dsState.canvasPage || 1) + delta)));
}

function dsSetCanvasDoc(i) {
  dsState.canvasDocIndex = i;
  dsState.canvasPage = 1;
  dsRenderRoot();
}

/* Called from the iframe's onload. Every dsRenderRoot() rebuilds the frame, so
   this runs again with current state — which is why markers never go stale. */
function dsPaintCanvasFields(frame) {
  let d;
  try { d = frame.contentDocument; } catch (e) { return; }
  if (!d || !d.body) return;

  const ctx = dsCanvasDoc();
  if (!ctx.doc) return;

  /* Only this document's fields. Without the filter, switching document tabs
     redrew every field of the envelope onto whichever document was showing. */
  const fields = (dsState.wizardData.fields || []).filter(f => (f.docIndex || 0) === ctx.idx);
  const recs = dsState.wizardData.recipients || [];
  const total = (ctx.lib ? ctx.lib.pages : ctx.doc.pages) || 1;
  const cur = Math.max(1, Math.min(dsState.canvasPage || 1, total));

  Array.from(d.querySelectorAll('.dsfld-marker')).forEach(n => n.remove());

  const palette = DS_RECIP_COLORS;

  fields.forEach(f => {
    const page = d.querySelector('[data-page="' + (f.page || 1) + '"]');
    if (!page) return;
    if (d.defaultView.getComputedStyle(page).position === 'static') page.style.position = 'relative';

    const ri = recs.findIndex(r => r.id === f.recipientId);
    const color = palette[(ri < 0 ? 0 : ri) % palette.length];
    const sel = f.id === dsState.selectedCanvasFieldId;

    const m = d.createElement('div');
    m.className = 'dsfld-marker';
    m.textContent = f.label || f.type;
    m.setAttribute('style',
      'position:absolute;left:' + (f.x == null ? 16 : f.x) + '%;top:' + (f.y == null ? 22 : f.y) + '%;' +
      'min-width:132px;padding:6px 9px;border-radius:3px;cursor:move;z-index:5;' +
      'font:600 11px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
      'color:#fff;background:' + color + ';' +
      'outline:' + (sel ? '2px solid #130032' : 'none') + ';outline-offset:1px;' +
      'box-shadow:0 2px 6px rgba(19,0,50,.28);user-select:none;');
    page.appendChild(m);

    m.addEventListener('mousedown', ev => dsDragCanvasField(ev, d, page, m, f.id));
  });

  const target = d.querySelector('[data-page="' + cur + '"]');
  if (target && target.scrollIntoView) target.scrollIntoView({ block: 'start' });

  /* Keep dsState.canvasPage tied to what is actually on screen. Without this the
     page a field lands on came from the pager alone, so scrolling to page 6 and
     clicking Signature still dropped it on page 1 — and nothing on screen said
     the pager was what decided it.

     Deliberately does NOT call dsRenderRoot(): that would rebuild the iframe on
     every scroll tick. It updates the counter in the parent by hand instead. */
  const win = d.defaultView;
  if (win && !frame.dataset.dsScrollWired) {
    frame.dataset.dsScrollWired = '1';
    win.addEventListener('scroll', () => {
      const n = dsVisibleCanvasPage(d, total);
      if (n === dsState.canvasPage) return;
      dsState.canvasPage = n;
      const label = document.querySelector('.ds-canvas-pagecount');
      if (label) label.textContent = 'Page ' + n + ' of ' + total;
      const btns = document.querySelectorAll('.ds-canvas-pagebtn');
      if (btns.length === 2) {
        btns[0].disabled = n <= 1;
        btns[1].disabled = n >= total;
      }
    }, { passive: true });
  }
}

/* Which page fills most of the frame right now. Ties break to the lower number,
   so a field dropped near a boundary lands on the page you were reading rather
   than the one creeping in from below. */
function dsVisibleCanvasPage(d, total) {
  const h = (d.defaultView && d.defaultView.innerHeight) || 1;
  let best = 1, bestSeen = -1;
  for (let i = 1; i <= total; i++) {
    const el = d.querySelector('[data-page="' + i + '"]');
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const seen = Math.min(r.bottom, h) - Math.max(r.top, 0);
    if (seen > bestSeen + 1) { bestSeen = seen; best = i; }
  }
  return best;
}

/* ---------- Snapping ----------
   Docusign anchors fields to marks in the document rather than to arbitrary
   coordinates. The library documents already carry the marks, so a dragged
   field looks for one of the right KIND: a signature belongs on a signature
   line, initials in an initials box. Dropping a signature onto "SELLER
   INITIALS" is exactly the mistake this prevents.

   Snapping assists, it never imposes — hold Alt to place freely. And a blank
   uploaded sheet has nothing to anchor to, so there the fallback is a coarse
   grid, which at least keeps fields aligned with each other. */
const DS_FIELD_ANCHORS = {
  'Signature':   '.sig .line',
  'Date Signed': '.sig .line',
  'Initial':     '.initials .slot'
};
const DS_SNAP_RADIUS = 9;   /* per cent of the page box */
const DS_SNAP_GRID   = 2;   /* per cent, when there is nothing to anchor to */

function dsSnapField(page, type, x, y) {
  const sel = DS_FIELD_ANCHORS[type];
  if (sel) {
    const pr = page.getBoundingClientRect();
    let best = null, bestD = Infinity;
    Array.from(page.querySelectorAll(sel)).forEach(a => {
      const ar = a.getBoundingClientRect();
      const ax = ((ar.left - pr.left) / pr.width) * 100;
      const ay = ((ar.top - pr.top) / pr.height) * 100;
      const dist = Math.hypot(ax - x, ay - y);
      if (dist < bestD) { bestD = dist; best = { x: ax, y: ay, el: a }; }
    });
    if (best && bestD <= DS_SNAP_RADIUS) return best;
  }
  const g = DS_SNAP_GRID;
  return { x: Math.round(x / g) * g, y: Math.round(y / g) * g, el: null };
}

/* Live drag updates only the marker's style; the model is written once on
   mouseup. Re-rendering on every mousemove would rebuild the iframe mid-drag. */
function dsDragCanvasField(ev, d, page, marker, fieldId) {
  ev.preventDefault();
  dsState.selectedCanvasFieldId = fieldId;

  /* Where inside the marker the pointer grabbed it. Without this the marker's
     top-left corner snaps to the cursor on the first move, so a field jumps the
     moment you touch it — you can never nudge one a few pixels. */
  const mr = marker.getBoundingClientRect();
  const grabX = ev.clientX - mr.left;
  const grabY = ev.clientY - mr.top;
  const startX = ev.clientX;
  const startY = ev.clientY;

  /* A plain click to select fires a mousemove or two from hand jitter. Without
     a threshold, selecting a field would also move it a fraction of a percent
     and dirty the envelope for no reason. */
  let moved = false;
  const THRESHOLD = 3;

  const field = (dsState.wizardData.fields || []).find(x => x.id === fieldId);
  const type = field ? field.type : '';
  let lit = null;
  const light = el => {
    if (lit === el) return;
    if (lit) lit.style.outline = '';
    lit = el;
    if (lit) lit.style.outline = '2px solid #4C00FB';
  };

  const move = e => {
    if (!moved) {
      if (Math.abs(e.clientX - startX) < THRESHOLD && Math.abs(e.clientY - startY) < THRESHOLD) return;
      moved = true;
    }
    const r = page.getBoundingClientRect();
    let x = Math.max(0, Math.min(92, ((e.clientX - grabX - r.left) / r.width) * 100));
    let y = Math.max(0, Math.min(96, ((e.clientY - grabY - r.top) / r.height) * 100));

    /* Alt places freely — snapping is help, not a rule. */
    if (!e.altKey) {
      const s = dsSnapField(page, type, x, y);
      x = s.x; y = s.y;
      light(s.el);
    } else {
      light(null);
    }

    marker.style.left = x + '%';
    marker.style.top = y + '%';
  };
  const up = () => {
    d.removeEventListener('mousemove', move);
    d.removeEventListener('mouseup', up);
    light(null);
    const f = (dsState.wizardData.fields || []).find(x => x.id === fieldId);
    if (f && moved) {
      f.x = Math.round(parseFloat(marker.style.left) * 10) / 10;
      f.y = Math.round(parseFloat(marker.style.top) * 10) / 10;
    }
    dsRenderRoot();
  };
  d.addEventListener('mousemove', move);
  d.addEventListener('mouseup', up);
}

function dsWizardStep3HTML() {
  const recs = dsState.wizardData.recipients || [];
  const fields = dsState.wizardData.fields || [];
  const docs = dsState.wizardData.documents || [];
  const activeRecipId = dsState.activeCanvasRecipId && recs.some(r => r.id === dsState.activeCanvasRecipId)
    ? dsState.activeCanvasRecipId
    : (recs[0] ? recs[0].id : null);
  const activeRecip = recs.find(r => r.id === activeRecipId) || recs[0] || null;
  const selectedField = fields.find(f => f.id === dsState.selectedCanvasFieldId) || null;

  const recipLabel = r => (r.name || r.role || 'Unnamed recipient');
  const recipOptions = current => recs.map(r =>
    `<option value="${escAttr(r.id)}" ${r.id === current ? 'selected' : ''}>${esc(recipLabel(r))} (${esc(r.role || 'No role')}, order ${r.order})</option>`
  ).join('');

  /* The page header reflects the document that is actually attached. */
  const docName = docs.length ? docs[0].name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') : 'Untitled document';

  const fieldRows = fields.map(f => {
    const r = recs.find(x => x.id === f.recipientId);
    const orphan = !r;
    const cc = r && !dsRecipientSigns(r);
    return `
      <div class="ds-fld ${dsRecipColor(f.recipientId)}${f.id === dsState.selectedCanvasFieldId ? ' on' : ''}${orphan || cc ? ' bad' : ''}"
           onclick="dsSelectCanvasField('${escAttr(f.id)}')">
        <span class="ds-fld-type">${dsIcon(dsFieldIcon(f.type), 14)}${esc(f.label || f.type)}</span>
        <select class="ds-fld-who" onclick="event.stopPropagation();" onchange="dsUpdateFieldRecipient('${escAttr(f.id)}', this.value)">
          ${recipOptions(f.recipientId)}
        </select>
        <span class="ds-fld-req">${f.required ? 'Required' : 'Optional'}</span>
        <button type="button" class="ds-fld-del" title="Remove field"
                onclick="event.stopPropagation();dsDeleteCanvasField('${escAttr(f.id)}')">${dsIcon('x', 12)}</button>
      </div>`;
  }).join('');

  return `
    <div class="ds-panel">
      <div class="ds-step3-head">
        <div>
          <h4 class="ds-step3-title">Step 3 — Place &amp; Assign Fields</h4>
          <p class="ds-step3-sub">Choose a signer, then click a field type to place it. Every field belongs to exactly one recipient, and its colour tells you which.</p>
        </div>
        <div class="ds-step3-signer-ctrl">
          <label class="ds-step3-label" for="dsActiveSigner">Placing fields for</label>
          <select class="ds-select ds-step3-select" id="dsActiveSigner" onchange="dsSetActiveCanvasRecip(this.value)">
            ${recs.map(r => `<option value="${escAttr(r.id)}" ${r.id === activeRecipId ? 'selected' : ''}>${esc(recipLabel(r))}${dsRecipientSigns(r) ? '' : ' — cannot sign'}</option>`).join('')}
          </select>
          <button type="button" class="ds-btn danger" id="dsBtnAuditFields" onclick="dsAuditFields()" title="Check every field is assigned to someone who can complete it">${dsIcon('alert', 14)} Audit Assignments</button>
        </div>
      </div>

      <div class="ds-canvas-workspace">
        <div class="ds-tag-palette">
          <div class="ds-palette-head">Standard Fields</div>
          ${DS_FIELD_TYPES.map((ft, i) => `
            <button type="button" class="ds-palette-btn${ft.signing ? ' sig' : ''}"
                    ${i === 0 ? 'id="dsBtnAddField"' : ''}
                    ${activeRecip ? '' : 'disabled'}
                    onclick="dsAddCustomCanvasField('${escAttr(ft.type)}')">
              <span>${dsIcon(ft.icon)}</span> ${esc(ft.type)}
            </button>`).join('')}
          <div class="ds-palette-tip">
            ${activeRecip
              ? `${dsIcon('bulb', 13)} Fields are placed for <b>${esc(recipLabel(activeRecip))}</b> on <b>the page you are viewing</b> &mdash; scroll the document to place one further in. Change the signer above to place fields for someone else, and drag any field to reposition it.`
              : `${dsIcon('alert', 13)} Add a recipient in step 2 before placing fields.`}
          </div>
        </div>

        <div class="ds-doc-canvas">
          ${dsCanvasDocHTML(docs, recs, docName)}

          <div class="ds-fld-area">
            <div class="ds-fld-area-head">
              Placed fields <span>${fields.length}</span>
            </div>
            ${fields.length ? fieldRows : `
              <div class="ds-fld-empty">
                ${dsIcon('pen', 30)}
                <b>No fields placed yet</b>
                <span>Pick a field type on the left. Without at least one signature field, nobody can sign this envelope.</span>
              </div>`}
          </div>
        </div>

        <div class="ds-props-pane">
          <div class="ds-props-head">Field Properties</div>
          ${selectedField ? `
            <div class="ds-prop-row">
              <label class="ds-prop-label" for="dsPropLabel">Field label</label>
              <input type="text" class="ds-input ds-prop-input" id="dsPropLabel"
                     value="${escAttr(selectedField.label || selectedField.type)}"
                     oninput="dsUpdateSelectedFieldLabel(this.value)">
            </div>
            <div class="ds-prop-row">
              <label class="ds-prop-label" for="dsPropRecip">Assigned recipient</label>
              <select class="ds-select ds-prop-select" id="dsPropRecip"
                      onchange="dsUpdateFieldRecipient('${escAttr(selectedField.id)}', this.value)">
                ${recipOptions(selectedField.recipientId)}
              </select>
            </div>
            <div class="ds-prop-row-chk">
              <input type="checkbox" id="chkPropReq" ${selectedField.required ? 'checked' : ''}
                     onchange="dsToggleSelectedFieldRequired(this.checked)">
              <label for="chkPropReq" class="ds-prop-chk-label">Required field</label>
            </div>
            <div class="ds-prop-row">
              <label class="ds-prop-label" for="dsPropValidation">Validation format</label>
              <select class="ds-select ds-prop-select" id="dsPropValidation"
                      onchange="dsUpdateSelectedFieldValidation(this.value)">
                ${['None (standard text)', 'Numbers only (0-9)', 'Currency ($ USD)', 'Date (MM/DD/YYYY)', 'SSN mask (***-**-****)', 'Email address', 'ZIP code']
                  .map(v => `<option ${selectedField.validation === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}
              </select>
            </div>
            <button type="button" class="ds-btn sm danger ds-prop-del" onclick="dsDeleteCanvasField('${escAttr(selectedField.id)}')">
              ${dsIcon('trash', 13)} Remove this field
            </button>
          ` : `
            <p class="ds-empty-p">Select a field on the canvas to edit its label, its owner, and whether it is required.</p>
          `}
        </div>
      </div>

      <div class="ds-step3-foot">
        <button type="button" class="ds-btn" onclick="dsNextWizardStep(2)">&larr; Back</button>
        <button type="button" class="ds-btn primary" id="dsBtnNextReview" onclick="dsNextWizardStep(4)">Next: Review &amp; Send &rarr;</button>
      </div>
    </div>`;
}

function dsFieldIcon(type) {
  const f = DS_FIELD_TYPES.find(x => x.type === type);
  return f ? f.icon : 'pin';
}

function dsUpdateSelectedFieldValidation(v) {
  const f = (dsState.wizardData.fields || []).find(x => x.id === dsState.selectedCanvasFieldId);
  if (f) f.validation = v;
}

function dsSetActiveCanvasRecip(recipId) {
  dsState.activeCanvasRecipId = recipId;
  dsRenderRoot();
}
function dsSelectCanvasField(fieldId) {
  dsState.selectedCanvasFieldId = fieldId;
  dsRenderRoot();
}
function dsAddCustomCanvasField(type) {
  dsMark('ds_c3_1');
  const recipId = dsState.activeCanvasRecipId || (dsState.wizardData.recipients[0] ? dsState.wizardData.recipients[0].id : 'wr1');
  /* Sequential, so the same sequence of clicks always yields the same field ids. */
  const newId = 'wf_' + (100 + dsFieldSeq++);
  /* page / x / y / value bring wizard-made fields into the same shape the graded
     curriculum already uses in docusign-data.js, which has always carried `page`
     and `value` while this path emitted neither. Coordinates are PERCENTAGES of
     the page box, not pixels, so they survive zoom and a narrower viewport.
     New fields stack down the page instead of landing on top of each other. */
  const onThisPage = (dsState.wizardData.fields || [])
    .filter(f => (f.page || 1) === dsState.canvasPage).length;
  const newField = {
    id: newId,
    type: type,
    recipientId: recipId,
    /* Which attached document, not just which page. With two documents on one
       envelope "page 3" is ambiguous, and without this every field showed on
       every document. Absent on the seeded curriculum fields, which is why
       readers treat a missing docIndex as 0. */
    docIndex: dsState.canvasDocIndex || 0,
    page: dsState.canvasPage || 1,
    x: 16,
    y: Math.min(88, 22 + onThisPage * 9),
    label: dsFieldLabel(type, recipId),
    required: true,
    value: null,
    validation: 'None (standard text)'
  };
  dsState.wizardData.fields.push(newField);
  dsState.selectedCanvasFieldId = newId;
  simToast(`Added ${type} field for active signer.`, { tone: 'good' });
  dsRenderRoot();
}
function dsDeleteCanvasField(fieldId) {
  dsState.wizardData.fields = dsState.wizardData.fields.filter(f => f.id !== fieldId);
  if (dsState.selectedCanvasFieldId === fieldId) dsState.selectedCanvasFieldId = null;
  simToast('Field removed from canvas.');
  dsRenderRoot();
}
function dsUpdateSelectedFieldLabel(lbl) {
  const f = dsState.wizardData.fields.find(x => x.id === dsState.selectedCanvasFieldId);
  if (!f) return;
  f.label = lbl;
  /* Once it has been named by hand, reassigning the field must not silently
     rewrite that name. */
  f.customLabel = true;
}
/* Reassigns a placed field to a different recipient. Five selects in step 3 have
   been calling this since the wizard was written and it was never defined, so
   changing the owner of a signature field threw a ReferenceError and did
   nothing. It matters more than it looks: reassigning a field is exactly the
   mistake dsAuditFields() is meant to catch in Lesson 3. */
/* "<owner> <type>", e.g. "Sarah Johnson Signature". Naming the owner in the
   label is what makes a mis-assigned field obvious on the canvas itself. */
function dsFieldLabel(type, recipId) {
  const r = (dsState.wizardData.recipients || []).find(x => x.id === recipId);
  const who = r ? (r.name || r.role || '') : '';
  return (who ? who + ' ' : '') + type;
}

function dsUpdateFieldRecipient(fieldId, recipientId) {
  const f = (dsState.wizardData.fields || []).find(x => x.id === fieldId);
  if (!f) return;
  f.recipientId = recipientId;
  /* Rebuild the label from type + new owner rather than doing string surgery on
     the old one. The previous version replaced the first word, so "Signature
     Field" became "Buyer Field" and the field type was lost. A label somebody
     typed themselves is never touched. */
  if (!f.customLabel) f.label = dsFieldLabel(f.type, recipientId);
  dsRenderRoot();
}

function dsToggleSelectedFieldRequired(val) {
  const f = dsState.wizardData.fields.find(x => x.id === dsState.selectedCanvasFieldId);
  if (f) f.required = !!val;
}

function dsAddField() {
  dsAddCustomCanvasField('Signature');
}
function dsAuditFields() {
  /* Checks four things that would each stop a real envelope from working. The
     previous version only compared two hard-coded field ids against a hard-coded
     buyer and seller — and once those ids stopped existing it found nothing to
     check and passed every time, including with zero fields placed.

     Nothing here is hard-coded. Every rule is derived from the recipients and
     the fields that are actually on the envelope. */
  const fields = dsState.wizardData.fields || [];
  const recs = dsState.wizardData.recipients || [];
  const problems = [];
  const label = r => (r.name || r.role || 'a recipient');

  /* 1. An envelope with no fields cannot be signed by anyone. */
  if (!fields.length) {
    problems.push('No fields have been placed. Nobody can sign this envelope.');
  }

  /* 2. A field pointing at a recipient who is no longer on the envelope —
        usually the result of deleting a recipient in step 2 after tagging. */
  fields.forEach(f => {
    if (!recs.some(r => r.id === f.recipientId)) {
      problems.push('"' + (f.label || f.type) + '" is not assigned to anyone on this envelope.');
    }
  });

  /* 3. A field assigned to someone who only receives a copy. This is the classic
        mis-assignment: the envelope goes out, and the field sits there forever
        because its owner was never asked to do anything. */
  fields.forEach(f => {
    const r = recs.find(x => x.id === f.recipientId);
    if (r && !dsRecipientSigns(r)) {
      problems.push('"' + (f.label || f.type) + '" is assigned to ' + label(r) +
                    ', who is set to "' + r.action + '" and cannot complete it.');
    }
  });

  /* 4. A signer with nothing to sign. Docusign refuses to send these, and it is
        the mistake a VA makes most often after adding a recipient late. */
  recs.filter(dsRecipientSigns).forEach(r => {
    const own = fields.filter(f => f.recipientId === r.id);
    if (!own.length) {
      problems.push(label(r) + ' is set to sign but has no fields at all.');
    } else if (!own.some(f => DS_SIGNING_TYPES.indexOf(f.type) > -1)) {
      problems.push(label(r) + ' has fields but no signature or initial, so there is nothing to sign.');
    }
  });

  if (!problems.length) {
    dsMark('ds_c3_2');
    dsMark('ds_c3_3');
    simToast('Audit passed. Every field belongs to someone who can complete it, and every signer has something to sign.', { tone: 'good' });
    return;
  }

  /* All of them, not just the first: fixing one at a time and re-running is how
     a five-second check becomes a five-minute one. */
  dsConfirm({
    title: problems.length + ' problem' + (problems.length === 1 ? '' : 's') + ' found',
    body: 'Fix these before sending. Docusign refuses an envelope that nobody can complete.',
    list: problems,
    confirmLabel: 'Got it',
    onConfirm: () => {}
  });
}

function dsToggleWizardReminders() {
  dsState.wizardRemindersOpen = !dsState.wizardRemindersOpen;
  dsRenderRoot();
}

function dsUpdateWizardReminder(key, val) {
  if (!dsState.wizardData) dsResetWizard();
  if (!dsState.wizardData.reminders) {
    dsState.wizardData.reminders = { enabled: true, firstDays: 2, repeatDays: 3, expireDays: 120, warnDays: 3 };
  }
  dsState.wizardData.reminders[key] = val;
  dsRenderRoot();
}

function dsComputeExpiryDate(startDate, days) {
  if (!startDate) return '—';
  try {
    const d = new Date(startDate + 'T00:00:00');
    d.setDate(d.getDate() + (days || 120));
    return d.toISOString().slice(0, 10);
  } catch (e) {
    return '—';
  }
}

function dsWizardStep4HTML() {
  /* B-2 fix: dsMark('ds_c1_3') and dsMark('ds_c1_4') were here — removed. */
  const d = dsState.wizardData;
  if (!d.reminders) {
    d.reminders = { enabled: true, firstDays: 2, repeatDays: 3, expireDays: 120, warnDays: 3 };
  }
  const rem = d.reminders;

  return `
    <div class="ds-panel">
      <h4>Step 4 — Review & Send</h4>
      <p class="ds-wiz-sub">Review the envelope summary before sending. Recipients will receive email notifications in signing order.</p>

      <div class="ds-wiz-summary-card">
        <div class="ds-wiz-summary-row"><span class="ds-wiz-summary-label">EMAIL SUBJECT</span><br>${esc(d.subject)}</div>
        <div class="ds-wiz-summary-row"><span class="ds-wiz-summary-label">MESSAGE</span><br>${esc(d.message || '(No standard message)')}</div>
        <div class="ds-wiz-summary-row"><span class="ds-wiz-summary-label">DOCUMENTS (${d.documents.length})</span><br>
          ${d.documents.map(doc => `${esc(doc.name)} (${esc(dsDocMeta(doc))})`).join(', ')}
        </div>
        <div><span class="ds-wiz-summary-label">RECIPIENTS IN SIGNING ORDER</span></div>
        <ol class="ds-wiz-summary-list">
          ${d.recipients.map(r => {
            const authStr = r.accessCode ? `<span class="ds-badge primary ds-badge-xs">${dsIcon('lock', 10)} Access Code</span>`
              : r.smsAuth ? `<span class="ds-badge primary ds-badge-xs">${dsIcon('smartphone', 10)} SMS: ${esc(r.smsAuth)}</span>`
              : r.idv ? `<span class="ds-badge green ds-badge-xs">${dsIcon('shield', 10)} ID Verification</span>`
              : `<span class="ds-recip-subnote">Email (Standard)</span>`;
            const privStr = r.privateMessage ? `<span class="ds-badge yellow ds-badge-xs">${dsIcon('mail', 10)} Private Note</span>` : '';
            const witStr = r.action === 'Witness' ? `<span class="ds-recip-subnote">(Witness)</span>` : '';
            return `<li><b>${esc(r.name)}</b> (${esc(r.role)}) — Order ${r.order} — <em>${esc(r.action)}</em> &middot; ${authStr} ${privStr} ${witStr}</li>`;
          }).join('')}
        </ol>
      </div>

      <div class="ds-wiz-adv-block">
        <div class="ds-wiz-adv-head" onclick="dsToggleWizardReminders()">
          <b>${dsIcon('bell', 13)} Reminders and Expiration</b>
          <span class="ds-recip-subnote">${rem.enabled ? `Remind every ${rem.repeatDays || 3} days &middot; Expires in ${rem.expireDays || 120} days` : 'Automatic reminders disabled'}</span>
          <span class="ds-wiz-adv-chevron">${dsState.wizardRemindersOpen ? '▴' : '▾'}</span>
        </div>
        ${dsState.wizardRemindersOpen ? `
          <div class="ds-wiz-adv-body">
            <div class="ds-wiz-rem-grid">
              <div>
                <label class="ds-switch-label">
                  <input type="checkbox" ${rem.enabled ? 'checked' : ''} onchange="dsUpdateWizardReminder('enabled', this.checked)">
                  <b>Send automatic reminders</b>
                </label>
              </div>
              <div class="ds-wiz-rem-inputs">
                <div class="ds-wiz-rem-field">
                  <label>First reminder in</label>
                  <select ${!rem.enabled ? 'disabled' : ''} onchange="dsUpdateWizardReminder('firstDays', parseInt(this.value,10))">
                    ${[1, 2, 3, 5, 7].map(n => `<option value="${n}" ${rem.firstDays === n ? 'selected' : ''}>${n} day${n === 1 ? '' : 's'}</option>`).join('')}
                  </select>
                </div>
                <div class="ds-wiz-rem-field">
                  <label>Repeat every</label>
                  <select ${!rem.enabled ? 'disabled' : ''} onchange="dsUpdateWizardReminder('repeatDays', parseInt(this.value,10))">
                    ${[1, 2, 3, 7].map(n => `<option value="${n}" ${rem.repeatDays === n ? 'selected' : ''}>${n} day${n === 1 ? '' : 's'}</option>`).join('')}
                  </select>
                </div>
                <div class="ds-wiz-rem-field">
                  <label>Envelope expires in</label>
                  <select onchange="dsUpdateWizardReminder('expireDays', parseInt(this.value,10))">
                    ${[30, 60, 90, 120, 180].map(n => `<option value="${n}" ${rem.expireDays === n ? 'selected' : ''}>${n} days</option>`).join('')}
                  </select>
                </div>
                <div class="ds-wiz-rem-field">
                  <label>Warn before expiry</label>
                  <select onchange="dsUpdateWizardReminder('warnDays', parseInt(this.value,10))">
                    ${[1, 2, 3, 7].map(n => `<option value="${n}" ${rem.warnDays === n ? 'selected' : ''}>${n} day${n === 1 ? '' : 's'}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>
          </div>` : ''}
      </div>

      <div class="ds-wiz-ready-box">
        ${dsIcon('checkCircle')} Envelope is ready to send. Recipients will receive email notifications in the configured signing order.
      </div>

      <div class="ds-wiz-foot">
        <button class="ds-btn" onclick="dsNextWizardStep(3)">← Back to Fields</button>
        <button class="ds-btn yellow ds-wiz-send-btn" id="dsBtnSendFinal" ${dsStep4Problem() ? 'disabled' : ''}
                onclick="dsSendEnvelopeFinal()">${dsIcon('send', 15)} Send Envelope</button>
        ${dsStep4Problem() ? `<span class="ds-wiz-block">${dsIcon('alert', 14)}${esc(dsStep4Problem())}</span>` : ''}
      </div>
    </div>`;
}

/* Send used to fill in whatever was missing — an empty subject became "Purchase
   Agreement — 123 Main Street", no documents became the 6-page purchase
   agreement, and no valid recipients became John Smith and Sarah Johnson. So a
   half-finished envelope went out looking like somebody else's, and a trainee
   learned that the system covers for you. It does not: real Docusign refuses.

   Lessons are unaffected — dsSeedLessonEnvelope() fills the wizard at attach
   time, so a lesson never arrives here empty. */
function dsStep4Problem() {
  const d = dsState.wizardData;
  if (!d) return 'Start an envelope first.';
  if (!d.documents || !d.documents.length) return 'Attach at least one document before sending.';
  if (!(d.subject || '').trim()) return 'An email subject is required before sending.';
  const valid = (d.recipients || []).filter(r => (r.name || '').trim() && (r.email || '').trim());
  if (!valid.length) return 'Add at least one recipient with a name and an email address.';
  const bad = valid.find(r => !dsEmailSyntaxOk(r.email));
  if (bad) return 'Fix the email address for ' + (bad.name || 'a recipient') + ' before sending.';
  return null;
}


/* The Next buttons are also disabled in the markup, but the guard lives here as
   well: a walkthrough or a stale DOM node could still call this directly, and
   letting an invalid envelope through would be worse than a blocked click. */
function dsNextWizardStep(s) {
  if (s === 2) {
    const p = dsStep1Problem();
    if (p) { simToast(p); return; }
  }
  if (s === 3) {
    const probs = dsRecipientProblems();
    if (probs.count) { simToast('Fix ' + probs.count + ' recipient problem' + (probs.count === 1 ? '' : 's') + ' before continuing.'); dsRenderRoot(); return; }
  }
  return dsNextWizardStepNow(s);
}
function dsNextWizardStepNow(s) {
  if (s === 2) dsMark('ds_c1_3');
  if (s === 3) dsMark('ds_c2_1');
  dsState.wizardStep = s;
  dsRenderRoot();
}

function dsSendEnvelopeFinal() {
  if (!dsState.wizardData) dsResetWizard();

  /* Same reasoning as dsNextWizardStep: the button is disabled in the markup,
     but a walkthrough or a stale DOM node could still reach this directly, and
     an envelope going out with invented contents is worse than a refused click.
     Nothing is substituted here any more — what you built is what gets sent. */
  const problem = dsStep4Problem();
  if (problem) { simToast(problem); return; }

  const d = dsState.wizardData;
  const validRecips = (d.recipients || []).filter(r => (r.name || '').trim() && (r.email || '').trim());

  const rem = Object.assign({ enabled: true, firstDays: 2, repeatDays: 3, expireDays: 120, warnDays: 3 }, d.reminders || {});

  /* If resuming an existing draft, update it in-place to 'waiting' status so it
     leaves Drafts and appears in Sent. Otherwise assign a new ID from sequence. */
  const targetId = d.resumeDraftId || ('ENV-' + DS_TODAY.slice(0, 4) + '-' + (9100 + dsSentSeq++));
  const newEnv = {
    id: targetId,
    subject: d.subject,
    type: 'Real Estate Purchase',
    sender: (window.SCApp && SCApp.currentUser && SCApp.currentUser()
      ? SCApp.currentUser().name : 'Alex Rivera') + ' (VA)',
    status: 'waiting',
    createdDate: DS_TODAY,
    closingDate: '2026-09-01',
    documents: [...d.documents],
    /* validRecips, not d.recipients: an untouched blank row in step 2 used to
       ship with the envelope as a nameless recipient with no address. */
    recipients: validRecips.map(r => Object.assign({}, r, { status: r.order === 1 ? 'sent' : 'pending' })),
    fields: [...(d.fields || [])],
    reminders: rem
  };
  /* B-6 fix: persist via override layer, not volatile array. */
  dsSetEnvelopeOverride(targetId, newEnv);

  /* Trigger live mailbox notification if mailbox initialized */
  if (typeof dsAddLiveEmail === 'function') {
    dsAddLiveEmail({
      type: 'sent',
      envId: targetId,
      subject: 'Please DocuSign: ' + newEnv.subject,
      recipient: newEnv.recipients[0] ? newEnv.recipients[0].name : 'Signer'
    });
  }

  /* B-2 fix: marks moved here from dsWizardStep4HTML (the render function). */
  dsMark('ds_c1_3');
  dsMark('ds_c1_4');
  /* The envelope is sent, so there is nothing left to discard. */
  dsState.wizardBaseline = JSON.stringify(dsState.wizardData);

  dsResetWizard();
  simToast(`Envelope ${targetId} sent! Notification emails triggered.`, { tone: 'good', duration: 4000 });
  dsGoto('envelopes');
}

/* ==================== ENVELOPE DETAIL ==================== */
function dsEnvelopeDetailHTML() {
  /* B-6 fix: reads through override layer, not volatile array. */
  const env = dsGetEnvelope(dsState.activeEnvId);
  if (!env) return '<p class="ds-empty-p">Envelope not found.</p>';

  const rem = env.reminders;
  const remText = rem && rem.enabled
    ? `Expires ${dsComputeExpiryDate(env.createdDate, rem.expireDays)} &middot; Reminder every ${rem.repeatDays}d`
    : (env.status === 'expired' ? 'Expired' : '—');

  const signers = (env.recipients || []).filter(r => r.action !== 'Receives a Copy');
  const recipRows = (env.recipients || []).map(r => {
    const statusClass = r.status === 'completed' || r.status === 'signed' ? 'completed'
      : r.status === 'voided' ? 'voided'
      : r.status === 'expired' ? 'expired'
      : r.status === 'authfail' ? 'voided'
      : 'waiting';
    const isPending = r.status !== 'completed' && r.status !== 'signed' && r.status !== 'voided' && r.status !== 'authfail' && env.status !== 'voided' && env.status !== 'draft';

    const authTag = r.accessCode ? `<span class="ds-badge primary ds-badge-xs" title="Access Code Protected">${dsIcon('lock', 10)} Code</span>`
      : r.smsAuth ? `<span class="ds-badge primary ds-badge-xs" title="SMS Authentication">${dsIcon('smartphone', 10)} SMS</span>`
      : r.idv ? `<span class="ds-badge green ds-badge-xs" title="ID Verification">${dsIcon('shield', 10)} IDV</span>` : '';
    const privTag = r.privateMessage ? `<span class="ds-badge yellow ds-badge-xs" title="Private Message Included">${dsIcon('mail', 10)} Private Note</span>` : '';
    const witTag = r.action === 'Witness' ? `<span class="ds-recip-subnote">(Witness)</span>` : '';

    return `
      <div class="ds-recipient-row">
        <div class="ds-recipient-order">Order ${r.order}</div>
        <div class="ds-recipient-info">
          <b>${esc(r.name)} <span class="ds-recip-subnote">(${esc(r.role)})</span> ${authTag} ${privTag} ${witTag}</b>
          <span>${esc(r.email)}</span>
        </div>
        <div class="ds-recip-action-col">
          <div><span class="ds-badge ${statusClass}">${esc(r.status === 'authfail' ? 'Auth Failed' : dsStatusLabel(r.status || 'waiting'))}</span></div>
          <div class="ds-recip-subnote">${esc(r.action)}</div>
          ${isPending ? `<button type="button" class="ds-btn sm ds-recip-resend-btn" onclick="dsActionResendRecipient('${escAttr(env.id)}', '${escAttr(r.id)}')">Resend</button>` : ''}
        </div>
      </div>`;
  }).join('');

  // Derived fields summary for all 86 envelopes
  let fieldsSummary = '';
  if (env.fields && env.fields.length) {
    const sigCount = env.fields.filter(f => /sig/i.test(f.type || f.label)).length;
    const dateCount = env.fields.filter(f => /date/i.test(f.type || f.label)).length;
    const otherCount = env.fields.length - sigCount - dateCount;
    fieldsSummary = `${sigCount} signature field${sigCount === 1 ? '' : 's'}, ${dateCount} date signed field${dateCount === 1 ? '' : 's'}${otherCount > 0 ? ', ' + otherCount + ' other field(s)' : ''} assigned across ${signers.length} recipient${signers.length === 1 ? '' : 's'}.`;
  } else {
    const sigCount = Math.max(1, signers.length);
    const dateCount = sigCount;
    fieldsSummary = `${sigCount} signature field${sigCount === 1 ? '' : 's'}, ${dateCount} date signed field${dateCount === 1 ? '' : 's'} assigned to ${sigCount} recipient${sigCount === 1 ? '' : 's'}.`;
  }

  // Status Action Buttons (All 8 statuses supported without dead states)
  let actionButtons = '';
  if (env.status === 'waiting') {
    actionButtons = `
      <button class="ds-btn primary" id="dsBtnSendReminder" onclick="dsActionResend('${escAttr(env.id)}')">
        ${dsIcon('mail')} Send Reminder
      </button>
      <button class="ds-btn" id="dsBtnCorrectEnv" onclick="dsActionCorrect('${escAttr(env.id)}')">
        ${dsIcon('edit')} Correct Envelope
      </button>
      <button class="ds-btn danger" id="dsBtnVoidEnv" onclick="dsActionVoid('${escAttr(env.id)}')">
        ${dsIcon('ban')} Void
      </button>
      <button class="ds-btn" onclick="dsSimulateSigner('${escAttr(env.id)}')">
        ${dsIcon('pen')} Simulate Signer View
      </button>
      <button class="ds-btn" onclick="dsOpenAuditModal('${escAttr(env.id)}')">
        ${dsIcon('history')} History
      </button>
      <button class="ds-btn" onclick="dsPromptMoveFolder('${escAttr(env.id)}')">
        ${dsIcon('folder')} Move to Folder
      </button>
      <button class="ds-btn" onclick="dsActionDelete('${escAttr(env.id)}')">
        ${dsIcon('trash')} Delete
      </button>`;
  } else if (env.status === 'completed') {
    actionButtons = `
      <button class="ds-btn primary" onclick="dsViewEnvelopeDoc('${escAttr(env.id)}', 0)">
        ${dsIcon('eye')} View Document
      </button>
      <button class="ds-btn" onclick="dsOpenCertificateModal('${escAttr(env.id)}')">
        ${dsIcon('award')} Certificate of Completion
      </button>
      <button class="ds-btn" onclick="dsSaveEnvelopeAsTemplate('${escAttr(env.id)}')">
        ${dsIcon('fileText')} Save as Template
      </button>
      <button class="ds-btn" onclick="dsActionDownload('${escAttr(env.id)}')">
        ${dsIcon('download')} Download PDF
      </button>
      <button class="ds-btn" onclick="dsOpenAuditModal('${escAttr(env.id)}')">
        ${dsIcon('history')} History
      </button>
      <button class="ds-btn" onclick="dsPromptMoveFolder('${escAttr(env.id)}')">
        ${dsIcon('folder')} Move to Folder
      </button>
      <button class="ds-btn" onclick="dsActionDelete('${escAttr(env.id)}')">
        ${dsIcon('trash')} Delete
      </button>`;
  } else if (env.status === 'draft') {
    actionButtons = `
      <button class="ds-btn primary" onclick="dsResumeDraft('${escAttr(env.id)}')">
        ${dsIcon('edit')} Continue Editing
      </button>
      <button class="ds-btn" onclick="dsPromptMoveFolder('${escAttr(env.id)}')">
        ${dsIcon('folder')} Move to Folder
      </button>
      <button class="ds-btn danger" onclick="dsActionDelete('${escAttr(env.id)}')">
        ${dsIcon('trash')} Delete Draft
      </button>`;
  } else if (env.status === 'voided') {
    actionButtons = `
      <button class="ds-btn primary" onclick="dsDuplicateEnvelope('${escAttr(env.id)}')">
        ${dsIcon('copy')} Duplicate as New
      </button>
      <button class="ds-btn" onclick="dsOpenAuditModal('${escAttr(env.id)}')">
        ${dsIcon('history')} View History
      </button>
      <button class="ds-btn" onclick="dsPromptMoveFolder('${escAttr(env.id)}')">
        ${dsIcon('folder')} Move to Folder
      </button>
      <button class="ds-btn" onclick="dsActionDelete('${escAttr(env.id)}')">
        ${dsIcon('trash')} Delete
      </button>`;
  } else if (env.status === 'expired') {
    actionButtons = `
      <button class="ds-btn primary" onclick="dsResendExpired('${escAttr(env.id)}')">
        ${dsIcon('refresh')} Resend as New
      </button>
      <button class="ds-btn" onclick="dsDuplicateEnvelope('${escAttr(env.id)}')">
        ${dsIcon('copy')} Duplicate
      </button>
      <button class="ds-btn" onclick="dsOpenAuditModal('${escAttr(env.id)}')">
        ${dsIcon('history')} View History
      </button>
      <button class="ds-btn" onclick="dsActionDelete('${escAttr(env.id)}')">
        ${dsIcon('trash')} Delete
      </button>`;
  } else if (env.status === 'declined') {
    actionButtons = `
      <button class="ds-btn primary" onclick="dsViewDeclineReason('${escAttr(env.id)}')">
        ${dsIcon('alert')} View Decline Reason
      </button>
      <button class="ds-btn" onclick="dsDuplicateEnvelope('${escAttr(env.id)}')">
        ${dsIcon('copy')} Duplicate as New
      </button>
      <button class="ds-btn" onclick="dsOpenAuditModal('${escAttr(env.id)}')">
        ${dsIcon('history')} View History
      </button>
      <button class="ds-btn" onclick="dsActionDelete('${escAttr(env.id)}')">
        ${dsIcon('trash')} Delete
      </button>`;
  } else if (env.status === 'authfail') {
    actionButtons = `
      <button class="ds-btn primary" onclick="dsActionCorrect('${escAttr(env.id)}')">
        ${dsIcon('edit')} Correct Recipient
      </button>
      <button class="ds-btn" onclick="dsActionResend('${escAttr(env.id)}')">
        ${dsIcon('mail')} Resend
      </button>
      <button class="ds-btn" onclick="dsOpenAuditModal('${escAttr(env.id)}')">
        ${dsIcon('history')} View History
      </button>
      <button class="ds-btn" onclick="dsActionDelete('${escAttr(env.id)}')">
        ${dsIcon('trash')} Delete
      </button>`;
  } else if (env.status === 'deleted') {
    actionButtons = `
      <button class="ds-btn primary" onclick="dsRestoreEnvelope('${escAttr(env.id)}')">
        ${dsIcon('restore')} Restore to Agreements
      </button>
      <button class="ds-btn danger" onclick="dsConfirmPurge('${escAttr(env.id)}')">
        ${dsIcon('trash')} Delete Permanently
      </button>`;
  }

  return `
    <div class="ds-detail-back" onclick="dsGoto('envelopes')">← Back to Agreements</div>

    <div class="ds-detail-head">
      <div>
        <h2 class="ds-page-title">${esc(env.subject)}</h2>
        <div class="ds-detail-sub">
          Envelope ID: <b>${esc(env.id)}</b> &nbsp;·&nbsp; Created: ${esc(env.createdDate)}
          &nbsp;·&nbsp; Sent by: ${esc(env.sender)} &nbsp;·&nbsp; ${remText}
        </div>
      </div>
      <span class="ds-badge ${env.status} ds-detail-badge">${dsStatusLabel(env.status)}</span>
    </div>

    <!-- Action Bar — mirrors DocuSign "More Actions" menu -->
    <div class="ds-action-bar">
      ${actionButtons}
    </div>

    <!-- Documents -->
    <div class="ds-panel ds-detail-doc-panel">
      <h4>Documents (${env.documents.length})</h4>
      <div class="ds-doc-chips">
        ${env.documents.map((d, i) => `
          <button type="button" class="ds-doc-chip" onclick="dsViewEnvelopeDoc('${escAttr(env.id)}', ${i})">
            <span>${dsIcon('file')}</span>
            <span class="ds-doc-chip-name">${esc(d.name)}</span>
            <span class="ds-doc-chip-pages">${d.pages ? '(' + d.pages + (d.pages === 1 ? ' page' : ' pages') + ')' : ''}</span>
            <span class="ds-doc-chip-action">${dsIcon('eye', 13)} View</span>
          </button>`).join('')}
      </div>
    </div>

    <!-- Recipients & Status Timeline -->
    <div class="ds-panel">
      <h4>Recipients & Signing Status Timeline</h4>
      <div class="ds-recipients-list">${recipRows}</div>
      <div class="ds-fields-summary-box">
        ${dsIcon('pin', 14)} <span><b>Fields Placed:</b> ${esc(fieldsSummary)}</span>
      </div>
    </div>`;
}

/* ---------- Envelope Action Handlers ---------- */
function dsResumeDraft(envId) {
  const env = dsGetEnvelope(envId);
  if (!env) return;
  dsResetWizard();
  dsState.wizardData = {
    subject: env.subject || 'Draft Agreement',
    message: 'Please review and sign the attached document.',
    documents: env.documents && env.documents.length ? [...env.documents] : [{ name: 'Document.pdf', pages: 2 }],
    recipients: env.recipients && env.recipients.length ? env.recipients.map(r => Object.assign({}, r)) : [
      { id: 'wr1', name: '', email: '', role: 'Signer 1', action: 'Needs to Sign', order: 1 }
    ],
    fields: env.fields ? [...env.fields] : [],
    useSequentialOrder: true,
    resumeDraftId: envId
  };
  dsState.wizardBaseline = JSON.stringify(dsState.wizardData);
  dsSuppressMarks = true;
  dsGoto('new-envelope');
  dsSuppressMarks = false;
  simToast(`Resumed draft "${env.subject}".`, { tone: 'good' });
}

function dsDuplicateEnvelope(envId) {
  const env = dsGetEnvelope(envId);
  if (!env) return;
  dsResetWizard();
  dsState.wizardData = {
    subject: `Copy of ${env.subject}`,
    message: 'Please review and sign the attached document.',
    documents: env.documents && env.documents.length ? [...env.documents] : [{ name: 'Document.pdf', pages: 2 }],
    recipients: env.recipients && env.recipients.length ? env.recipients.map(r => Object.assign({}, r, { status: 'waiting' })) : [],
    fields: env.fields ? [...env.fields] : [],
    useSequentialOrder: true
  };
  dsState.wizardBaseline = JSON.stringify(dsState.wizardData);
  dsSuppressMarks = true;
  dsGoto('new-envelope');
  dsSuppressMarks = false;
  simToast(`Duplicated envelope as new draft: "Copy of ${env.subject}".`, { tone: 'good' });
}

function dsResendExpired(envId) {
  const env = dsGetEnvelope(envId);
  if (!env) return;
  const newEnvId = 'ENV-' + DS_TODAY.slice(0, 4) + '-' + (9100 + dsSentSeq++);
  const [ty, tm, td] = DS_TODAY.split('-').map(Number);
  const newClosing = new Date(Date.UTC(ty, tm - 1, td + 21)).toISOString().slice(0, 10);
  const clone = Object.assign({}, env, {
    id: newEnvId,
    status: 'waiting',
    createdDate: DS_TODAY,
    closingDate: newClosing,
    recipients: (env.recipients || []).map(r => Object.assign({}, r, { status: 'waiting' }))
  });
  dsSetEnvelopeOverride(newEnvId, clone);
  dsAddAuditLog(newEnvId, 'Envelope Re-issued', { text: `Re-sent from expired envelope ${envId}. Fresh signing links issued.` });
  simToast(`Re-issued envelope as ${newEnvId} with active 21-day closing window!`, { tone: 'good' });
  dsOpenEnvelope(newEnvId);
}

function dsViewDeclineReason(envId) {
  const env = dsGetEnvelope(envId);
  const reason = env ? (env.statusNote || 'Recipient declined to sign stating terms required revision.') : 'Terms revision required.';
  dsConfirm({
    title: 'Decline Reason — ' + (env ? env.id : envId),
    body: `The recipient declined this envelope with the following note:\n\n"${reason}"\n\nYou can duplicate this envelope to adjust terms and re-send.`,
    confirmLabel: 'Duplicate & Re-send',
    danger: false,
    onConfirm: () => dsDuplicateEnvelope(envId)
  });
}

function dsActionDelete(envId) {
  const env = dsGetEnvelope(envId);
  dsConfirm({
    title: 'Move envelope to Deleted?',
    body: `Envelope "${env ? env.subject : envId}" will be moved to the Deleted folder. You can restore it later from the Deleted view.`,
    confirmLabel: 'Move to Deleted',
    danger: true,
    onConfirm: () => {
      dsSetEnvelopeOverride(envId, { status: 'deleted' });
      simToast(`Envelope ${envId} moved to Deleted.`, { tone: 'good' });
      if (dsState.view === 'envelope-detail') dsGoto('envelopes');
      else dsRenderRoot();
    }
  });
}

function dsSaveAsTemplate(envId) {
  const env = dsGetEnvelope(envId);
  if (!env) return;
  if (!dsDemo.templates) dsDemo.templates = [];
  const tmplId = 'TMPL-CUSTOM-' + (dsDemo.templates.length + 1);
  const newTmpl = {
    id: tmplId,
    name: env.subject + ' (Template)',
    category: env.type || 'Custom',
    description: `Template generated from envelope ${env.id}. Standard document roles and workflow pre-configured.`,
    documentsCount: (env.documents || []).length || 1,
    recipients: (env.recipients || []).map(r => r.role || r.name),
    usageCount: 0,
    lastUsed: null
  };
  dsDemo.templates.push(newTmpl);
  simToast(`Saved "${env.subject}" as a new template!`, { tone: 'good' });
}

function dsActionResendRecipient(envId, recipId) {
  const env = dsGetEnvelope(envId);
  const r = (env && env.recipients) ? env.recipients.find(x => x.id === recipId) : null;
  const name = r ? r.name : 'recipient';
  simToast(`Reminder notification re-sent to ${name}!`, { tone: 'good' });
}


/* -- Envelope Actions (B-8: all alert/prompt replaced with toasts + in-page forms) -- */
function dsActionResend(envId) {
  dsMark('ds_c5_2');
  simToast(`Reminder sent for Envelope ${envId}! All outstanding recipients re-notified.`, { tone: 'good' });
}

function dsActionCorrect(envId) {
  const env = dsGetEnvelope(envId);
  if (!env) return;
  const formId = 'dsCorrectForm-' + envId;
  if (document.getElementById(formId)) return;   /* already open */
  const bar = document.querySelector('.ds-action-bar');
  if (!bar) return;

  /* Correcting an envelope cannot touch anyone who has already signed. Their
     signature is bound to the name and address that were on the envelope when
     they signed it; changing either afterwards would invalidate the certificate.
     Docusign enforces this, and a VA who learns the rule here will not ask a
     client why the correction "did not go through". */
  const signed = r => r.status === 'completed' || r.status === 'signed';

  const rows = env.recipients.map((r, i) => {
    const locked = signed(r);
    return `
      <div class="ds-corr-row${locked ? ' locked' : ''}">
        <label for="dsCorrectEmail-${i}">
          ${esc(r.name)} <span>(${esc(r.role)})</span>
          ${locked ? '<span class="ds-corr-tag">' + dsIcon('check', 12) + 'Signed — locked</span>' : ''}
        </label>
        <input type="text" id="dsCorrectName-${i}" value="${escAttr(r.name)}"
               placeholder="Full name" ${locked ? 'disabled' : ''}>
        <input type="email" id="dsCorrectEmail-${i}" value="${escAttr(r.email)}"
               placeholder="name@example.com" ${locked ? 'disabled' : ''}>
      </div>`;
  }).join('');

  const editable = env.recipients.filter(r => !signed(r)).length;

  const form = document.createElement('div');
  form.id = formId;
  form.className = 'ds-panel ds-corr';
  form.innerHTML = `
    <h4>Correct envelope ${esc(envId)}</h4>
    <p class="ds-corr-lede">Update the name or email of anyone who has not signed yet. Recipients who have already signed are locked: their signature is bound to the details that were on the envelope at the time.</p>
    ${editable ? rows : rows + '<p class="ds-corr-none">' + dsIcon('alert', 14) + 'Every recipient has already signed. There is nothing left to correct on this envelope.</p>'}
    <div class="ds-corr-foot">
      <button class="ds-btn primary" ${editable ? '' : 'disabled'} onclick="dsCorrectSubmit('${escAttr(envId)}')">Save &amp; Resend</button>
      <button class="ds-btn" onclick="document.getElementById('${formId}').remove()">Cancel</button>
    </div>`;
  bar.after(form);
}

function dsCorrectSubmit(envId) {
  const env = dsGetEnvelope(envId);
  if (!env) return;
  const signed = r => r.status === 'completed' || r.status === 'signed';
  const updated = [];
  let changes = 0;

  for (let i = 0; i < env.recipients.length; i++) {
    const r = env.recipients[i];
    if (signed(r)) { updated.push(Object.assign({}, r)); continue; }

    const emailEl = document.getElementById('dsCorrectEmail-' + i);
    const nameEl = document.getElementById('dsCorrectName-' + i);
    const email = emailEl ? emailEl.value.trim() : r.email;
    const name = nameEl ? nameEl.value.trim() : r.name;

    if (!dsEmailSyntaxOk(email)) {
      simToast('"' + email + '" is not a valid email address.');
      if (emailEl) emailEl.focus();
      return;
    }
    if (!name) {
      simToast('A recipient cannot be left without a name.');
      if (nameEl) nameEl.focus();
      return;
    }
    if (email !== r.email || name !== r.name) changes++;
    updated.push(Object.assign({}, r, { email: email, name: name }));
  }

  if (!changes) { simToast('Nothing was changed.'); return; }

  dsSetEnvelopeOverride(envId, { recipients: updated, statusNote: null });
  dsAddAuditLog(envId, 'Envelope Corrected', { text: changes + ' recipient detail(s) updated; invitations re-sent' });
  dsMark('ds_c5_3');
  simToast('Corrected. A fresh invitation has gone out to the affected recipients.', { tone: 'good' });
  dsRenderRoot();
}

function dsActionVoid(envId) {
  /* B-5/B-8: was prompt() with pre-filled reason + 'Superceded' typo. */
  const env = dsGetEnvelope(envId);
  if (!env) return;
  const formId = 'dsVoidForm-' + envId;
  if (document.getElementById(formId)) return;
  const bar = document.querySelector('.ds-action-bar');
  if (!bar) return;
  const form = document.createElement('div');
  form.id = formId;
  form.className = 'ds-panel ds-corr';
  form.innerHTML = `<h4>Void envelope ${esc(envId)}</h4>
    <p class="ds-corr-lede">This instantly revokes every signing link. It cannot be undone, and the reason you give is recorded in the audit trail and shown to recipients &mdash; which is why Docusign insists on one.</p>
    <label class="ds-corr-label" for="dsVoidReason">Reason for voiding (required, at least 10 characters)</label>
    <textarea id="dsVoidReason" rows="3" class="ds-wiz-input" placeholder="e.g. Superseded by a revised purchase agreement dated today" oninput="dsVoidReasonInput()"></textarea>
    <span class="ds-wiz-count" id="dsVoidHint">10 characters minimum</span>
    <div class="ds-corr-foot">
      <button class="ds-btn danger-solid" id="dsVoidGo" disabled onclick="dsVoidSubmit('${escAttr(envId)}')">Void envelope</button>
      <button class="ds-btn" onclick="document.getElementById('${formId}').remove()">Cancel</button>
    </div>`;
  bar.after(form);
}
/* Live gate on the reason. Disabling the button is friendlier than rejecting
   on submit: the requirement is visible before anything is typed. */
function dsVoidReasonInput() {
  const ta = document.getElementById('dsVoidReason');
  const go = document.getElementById('dsVoidGo');
  const hint = document.getElementById('dsVoidHint');
  if (!ta || !go) return;
  const n = ta.value.trim().length;
  go.disabled = n < 10;
  if (hint) hint.textContent = n < 10
    ? (10 - n) + ' more character' + (10 - n === 1 ? '' : 's') + ' needed'
    : 'Recorded in the audit trail';
}

function dsVoidSubmit(envId) {
  const reason = (document.getElementById('dsVoidReason') || {}).value || '';
  if (reason.trim().length < 10) {
    simToast('Enter a reason of at least 10 characters.');
    return;
  }
  /* B-6 fix: persist via override layer */
  const env = dsGetEnvelope(envId);
  if (!env) return;
  const voidedRecips = env.recipients.map(r => Object.assign({}, r, { status: 'voided' }));
  dsSetEnvelopeOverride(envId, { status: 'voided', recipients: voidedRecips, voidReason: reason.trim() });
  dsAddAuditLog(envId, 'Envelope Voided', { text: reason.trim() });
  dsMark('ds_c5_4');
  /* B-11 fix: 'Superceded' → 'Superseded' is fixed by removing the pre-filled prompt */
  simToast(`Envelope ${envId} voided. All signing links revoked.`, { tone: 'good' });
  dsRenderRoot();
}

function dsActionDownload(envId) {
  simToast(`Downloading completed document package for ${envId}...`, { duration: 3000 });
}

function dsActionDownloadCert(envId) {
  simToast(`Downloading Certificate of Completion for ${envId}...`, { duration: 3000 });
}

/* ==================== PHASE C: VA MAILBOX (OUTLOOK/GMAIL SIMULATOR) ==================== */

function dsInitMailbox() {
  if (dsDemo.mailbox && dsDemo.mailbox.length) return dsDemo.mailbox;

  dsDemo.mailbox = [
    {
      id: 'em-1',
      from: 'DocuSign System <docusign@docusign.net>',
      to: 'Alex Rivera <alex.rivera@kwrealty.example.com>',
      subject: 'Please DocuSign: Purchase Agreement — 123 Main Street',
      date: 'Today, 09:14 AM',
      unread: true,
      category: 'envelopes',
      envId: 'ENV-2026-9001',
      isPhish: false,
      spf: 'pass (docusign.net: sender IP 198.51.100.22 is authorized)',
      dkim: 'pass (signature verified for domain docusign.net)',
      returnPath: 'docusign@docusign.net',
      receivedFrom: 'mail-out-04.docusign.net [198.51.100.22]',
      body: `
        <div class="ds-panel">
          <div class="ds-wiz-summary-card">
            <div><b style="font-size:18px;color:#1e293b;">DocuSign</b></div>
            <h3 style="margin:12px 0;">Alex Rivera sent you a document to review and sign.</h3>
            <p class="ds-wiz-sub">Please review and sign the Purchase Agreement for 123 Main Street. Timely execution ensures compliance with Texas escrow deadlines.</p>
            <div style="margin:20px 0;">
              <button type="button" class="ds-btn yellow" onclick="dsSimulateSigner('ENV-2026-9001')">REVIEW DOCUMENT</button>
            </div>
            <p class="ds-recip-subnote">This message was sent to you by DocuSign on behalf of Alex Rivera (Keller Williams Realty). Do not share this email.</p>
          </div>
        </div>`
    },
    {
      id: 'em-2',
      from: 'DocuSign System <docusign@docusign.net>',
      to: 'Alex Rivera <alex.rivera@kwrealty.example.com>',
      subject: 'Completed: Listing Agreement — 742 Evergreen Terrace',
      date: 'Yesterday, 04:30 PM',
      unread: true,
      category: 'envelopes',
      envId: 'ENV-2026-9002',
      isPhish: false,
      spf: 'pass (docusign.net: sender IP 198.51.100.24 is authorized)',
      dkim: 'pass (signature verified for domain docusign.net)',
      returnPath: 'docusign@docusign.net',
      receivedFrom: 'mail-out-02.docusign.net [198.51.100.24]',
      body: `
        <div class="ds-panel">
          <div class="ds-wiz-summary-card">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
              <span class="ds-badge completed">DOCUMENT COMPLETED &amp; SEALED</span>
            </div>
            <h3 style="margin:0 0 10px;">All signers have completed Listing Agreement — 742 Evergreen Terrace</h3>
            <p class="ds-wiz-sub">All parties have signed. A copy of the completed document and Certificate of Completion are now attached to the envelope record.</p>
            <div style="display:flex;gap:10px;margin-top:16px;">
              <button type="button" class="ds-btn primary" onclick="dsGoto('envelope-detail', 'ENV-2026-9002')">View in DocuSign</button>
              <button type="button" class="ds-btn" onclick="dsOpenCertificateModal('ENV-2026-9002')">View Certificate</button>
            </div>
          </div>
        </div>`
    },
    {
      id: 'em-3',
      from: 'DocuSign Security Team <security-alert@docus1gn-securesign.com>',
      to: 'Alex Rivera <alex.rivera@kwrealty.example.com>',
      subject: 'URGENT: Verify your DocuSign account before permanent suspension',
      date: 'Today, 08:05 AM',
      unread: true,
      category: 'phishing',
      envId: null,
      isPhish: true,
      spf: 'softfail (docus1gn-securesign.com does not designate authorized sender IP 45.142.212.89)',
      dkim: 'fail (body hash did not verify or missing signature)',
      returnPath: 'bounce-trap@phish-payload-delivery.top',
      receivedFrom: 'relay42.suspicious-vps.ru [45.142.212.89]',
      phishClues: [
        'Sender domain is "docus1gn-securesign.com" (lookalike domain with number 1 instead of letter i)',
        'Creates false emergency ("permanent suspension in 24 hours") to induce panic',
        'DKIM and SPF authentication failed across technical mail headers',
        'Links point to an unverified third-party credential harvesting server'
      ],
      body: `
        <div class="ds-panel">
          <div class="ds-wiz-summary-card">
            <div style="color:var(--ds24-red);font-weight:800;margin-bottom:8px;">⚠️ CRITICAL SECURITY WARNING</div>
            <h3 style="color:#8a1c1c;margin:0 0 10px;">Your DocuSign account has been flagged for abnormal activity</h3>
            <p class="ds-wiz-sub">We noticed unauthorized login attempts on your account. If you do not verify your identity and credentials within 24 hours, all active transactions and pending envelopes will be locked permanently.</p>
            <div style="margin:16px 0;">
              <button type="button" class="ds-btn danger" onclick="simToast('⚠️ Blocked by VA Security Shield: Link points to malicious credential harvester at http://docus1gn-securesign.com/login.php', { tone: 'bad', duration: 6000 })">VERIFY CREDENTIALS NOW</button>
            </div>
            <p class="ds-recip-subnote">DocuSign Security Team · Case Reference #SEC-984210</p>
          </div>
        </div>`
    },
    {
      id: 'em-4',
      from: 'Escrow Wire Instructions <wire-update@title-fontaine-escrow.net>',
      to: 'Alex Rivera <alex.rivera@kwrealty.example.com>',
      subject: 'UPDATED Wire Transfer Instructions for Closing on 456 Oak Lane',
      date: 'Today, 10:20 AM',
      unread: true,
      category: 'phishing',
      envId: null,
      isPhish: true,
      spf: 'fail (SPF record for title-fontaine-escrow.net fails sender check)',
      dkim: 'none (no DKIM header present)',
      returnPath: 'fraud-ops@shadowmail.cc',
      receivedFrom: 'vps901.shadow-wire-network.com [185.220.101.5]',
      phishClues: [
        'Classic real estate wire fraud: sudden last-minute changes to wiring instructions before closing',
        'Sender domain "title-fontaine-escrow.net" does not match verified escrow domain fontaineescrow.example.com',
        'Title companies NEVER change wire instructions via raw unencrypted email',
        'Standard VA protocol mandates phone voice verification with verified number before acting on wire info'
      ],
      body: `
        <div class="ds-panel">
          <div class="ds-wiz-summary-card">
            <div style="color:#b45309;font-weight:800;margin-bottom:8px;">🏦 URGENT WIRE INSTRUCTION UPDATE</div>
            <h3 style="color:#92400e;margin:0 0 10px;">Revised Closing Funds Instructions for Buyer (456 Oak Lane)</h3>
            <p class="ds-wiz-sub">Due to internal banking audits at Fontaine Title & Escrow, our primary receiving account is temporarily unavailable. Please immediately wire the closing deposit ($48,500.00) to our alternate clearing bank below:</p>
            <div class="ds-tech-header-card">
              Bank: Global Merchant Clearing LLC<br>
              Routing (ABA): 021000021<br>
              Account #: 8892019482<br>
              Beneficiary: Fontaine Escrow Clearing Sub-Account 4
            </div>
            <p class="ds-recip-subnote">DO NOT CALL TO CONFIRM AS PHONE LINES ARE CONGESTED. EXECUTE WIRE IMMEDIATELY TO AVOID CLOSING DELAYS.</p>
          </div>
        </div>`
    },
    {
      id: 'em-5',
      from: 'DocuSign Notifications <docusign@docusign.net>',
      to: 'Alex Rivera <alex.rivera@kwrealty.example.com>',
      subject: 'Declined to Sign: Commercial Lease — Suite 400',
      date: 'Aug 18, 11:45 AM',
      unread: false,
      category: 'envelopes',
      envId: 'ENV-2026-9005',
      isPhish: false,
      spf: 'pass (docusign.net)',
      dkim: 'pass (docusign.net)',
      returnPath: 'docusign@docusign.net',
      receivedFrom: 'mail-out-01.docusign.net [198.51.100.19]',
      body: `
        <div class="ds-panel">
          <div class="ds-wiz-summary-card">
            <h3 style="margin:0 0 10px;">Elena Rostova has declined to sign Commercial Lease — Suite 400</h3>
            <p class="ds-wiz-sub"><b>Reason provided by signer:</b></p>
            <div class="ds-box-tip">
              "Lease commencement date was stated as Sept 1st instead of Oct 1st agreed in the LOI. Please revise and resend."
            </div>
            <p class="ds-recip-subnote">The envelope has been voided automatically. You can duplicate it to create a corrected version.</p>
            <div style="margin-top:16px;">
              <button type="button" class="ds-btn primary" onclick="dsGoto('envelope-detail', 'ENV-2026-9005')">View Declined Envelope</button>
            </div>
          </div>
        </div>`
    },
    {
      id: 'em-6',
      from: 'DocuSign Reminders <docusign@docusign.net>',
      to: 'Alex Rivera <alex.rivera@kwrealty.example.com>',
      subject: 'Reminder: 504 Westwood Blvd is Expiring in 3 Days',
      date: 'Aug 17, 04:12 PM',
      unread: false,
      category: 'reminders',
      envId: 'ENV-2026-9008',
      isPhish: false,
      spf: 'pass (docusign.net)',
      dkim: 'pass (docusign.net)',
      returnPath: 'docusign@docusign.net',
      receivedFrom: 'mail-out-03.docusign.net [198.51.100.21]',
      body: `
        <div class="ds-panel">
          <div class="ds-wiz-summary-card">
            <h3 style="margin:0 0 10px;">Envelope Expiration Warning</h3>
            <p class="ds-wiz-sub">Envelope <b>ENV-2026-9008</b> (Listing Agreement — 504 Westwood Blvd) is scheduled to expire in 3 days. Sarah Johnson has not yet completed their assigned fields.</p>
            <div style="margin-top:16px;">
              <button type="button" class="ds-btn primary" onclick="dsGoto('envelope-detail', 'ENV-2026-9008')">Send Manual Reminder</button>
            </div>
          </div>
        </div>`
    },
    {
      id: 'em-7',
      from: 'DocuSign Security Alert <security@docusign.net>',
      to: 'Alex Rivera <alex.rivera@kwrealty.example.com>',
      subject: 'Security Alert: Access Code Lockout on ENV-2026-9014',
      date: 'Aug 16, 01:10 PM',
      unread: false,
      category: 'security',
      envId: 'ENV-2026-9014',
      isPhish: false,
      spf: 'pass (docusign.net)',
      dkim: 'pass (docusign.net)',
      returnPath: 'security@docusign.net',
      receivedFrom: 'sec-out-01.docusign.net [198.51.100.33]',
      body: `
        <div class="ds-panel">
          <div class="ds-wiz-summary-card">
            <div style="color:var(--ds24-red);font-weight:700;margin-bottom:8px;">🔒 AUTHENTICATION LOCKOUT TRIGGERED</div>
            <h3 style="margin:0 0 10px;">Signer exceeded 3 failed Access Code attempts</h3>
            <p class="ds-wiz-sub">Recipient <b>David Kowalski</b> failed access code verification 3 consecutive times on envelope <b>ENV-2026-9014</b>. The signing link has been locked to prevent brute force access.</p>
            <p class="ds-recip-subnote">To unlock access, use "Correct Envelope" in DocuSign to reset the recipient's access code or resend the invitation.</p>
            <div style="margin-top:16px;">
              <button type="button" class="ds-btn primary" onclick="dsGoto('envelope-detail', 'ENV-2026-9014')">Open Envelope to Correct</button>
            </div>
          </div>
        </div>`
    }
  ];

  return dsDemo.mailbox;
}

function dsUnreadEmailCount() {
  const box = dsInitMailbox();
  return box.filter(m => m.unread).length;
}

function dsAddLiveEmail(evt) {
  const box = dsInitMailbox();
  const newId = 'em-live-' + (100 + box.length + 1);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let subject = evt.subject || 'DocuSign Envelope Notification';
  let body = '';
  let category = 'envelopes';

  if (evt.type === 'sent') {
    subject = 'Sent for Signatures: ' + (evt.subject || 'Envelope');
    body = `
      <div class="ds-panel">
        <div class="ds-wiz-summary-card">
          <h3 style="margin:0 0 10px;">Envelope ${esc(evt.envId)} was sent successfully</h3>
          <p class="ds-wiz-sub">Notification emails have been dispatched to ${esc(evt.recipient || 'recipients')}. Real-time tracking is active.</p>
          <div style="margin-top:16px;">
            <button type="button" class="ds-btn primary" onclick="dsGoto('envelope-detail', '${escAttr(evt.envId)}')">Track Envelope</button>
          </div>
        </div>
      </div>`;
  } else if (evt.type === 'completed') {
    subject = 'Completed: ' + (evt.subject || 'Envelope');
    category = 'envelopes';
    body = `
      <div class="ds-panel">
        <div class="ds-wiz-summary-card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <span class="ds-badge completed">DOCUMENT COMPLETED &amp; SEALED</span>
          </div>
          <h3 style="margin:0 0 10px;">Envelope ${esc(evt.envId)} is Completed!</h3>
          <p class="ds-wiz-sub">All signers have signed. The Certificate of Completion has been cryptographically sealed.</p>
          <div style="margin-top:16px;">
            <button type="button" class="ds-btn primary" onclick="dsGoto('envelope-detail', '${escAttr(evt.envId)}')">View Completed File</button>
          </div>
        </div>
      </div>`;
  } else if (evt.type === 'declined') {
    subject = 'Declined to Sign: ' + (evt.subject || 'Envelope');
    body = `
      <div class="ds-panel">
        <div class="ds-wiz-summary-card">
          <h3 style="color:#8a1c1c;margin:0 0 10px;">Envelope ${esc(evt.envId)} was Declined</h3>
          <p class="ds-wiz-sub"><b>Reason:</b> ${esc(evt.reason || 'No reason provided')}</p>
          <div style="margin-top:16px;">
            <button type="button" class="ds-btn primary" onclick="dsGoto('envelope-detail', '${escAttr(evt.envId)}')">View Envelope Details</button>
          </div>
        </div>
      </div>`;
  }

  box.unshift({
    id: newId,
    from: 'DocuSign System <docusign@docusign.net>',
    to: 'Alex Rivera <alex.rivera@kwrealty.example.com>',
    subject: subject,
    date: 'Today, ' + timeStr,
    unread: true,
    category: category,
    envId: evt.envId,
    isPhish: false,
    spf: 'pass (docusign.net)',
    dkim: 'pass (docusign.net)',
    returnPath: 'docusign@docusign.net',
    receivedFrom: 'mail-out-01.docusign.net [198.51.100.19]',
    body: body
  });

  dsSyncNav();
}

function dsMailboxHTML() {
  const box = dsInitMailbox();
  const activeFilter = dsState.mailboxFilter || 'all';
  const activeEmailId = dsState.activeEmailId || (box[0] ? box[0].id : null);

  const filtered = box.filter(m => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'phishing') return m.isPhish;
    return m.category === activeFilter;
  });

  const currentEmail = box.find(m => m.id === activeEmailId) || filtered[0] || box[0];
  if (currentEmail && currentEmail.unread) {
    currentEmail.unread = false;
    dsSyncNav();
  }

  const pills = [
    { key: 'all', label: 'All Mail' },
    { key: 'envelopes', label: 'DocuSign Envelopes' },
    { key: 'phishing', label: 'Phishing Simulation ⚠️' },
    { key: 'reminders', label: 'Reminders' },
    { key: 'security', label: 'Security Alerts' }
  ];

  return `
    <div class="ds-pagehead">
      <div>
        <h1 class="ds-page-title">VA Mailbox &amp; Email Simulator</h1>
        <p class="ds-pagelede">Simulates the real estate transaction email workflow: DocuSign notifications, envelope signing links, and real-world phishing detection.</p>
      </div>
      <div class="ds-pagehead-btns">
        <button type="button" class="ds-btn" onclick="simToast('Mailbox updated with live notifications.', { tone: 'good' })">${dsIcon('refresh', 15)} Refresh</button>
      </div>
    </div>

    <div class="ds-filterbar" style="margin-bottom:12px;">
      ${pills.map(p => `
        <button type="button" class="ds-pill ${p.key === activeFilter ? 'on' : ''}" onclick="dsSetMailboxFilter('${p.key}')">
          ${p.label}
        </button>`).join('')}
    </div>

    <div class="ds-mailbox-layout">
      <!-- Left Column: Mail list -->
      <div class="ds-mail-list-col">
        <div class="ds-mail-list-head">
          <b>Inbox (${filtered.length})</b>
          <span class="ds-recip-subnote">VA Email Client</span>
        </div>
        <div class="ds-mail-items-wrap">
          ${filtered.map(m => `
            <div class="ds-mail-item ${m.unread ? 'unread' : ''} ${currentEmail && m.id === currentEmail.id ? 'active' : ''}" onclick="dsSelectEmail('${m.id}')">
              <div class="ds-mail-item-top">
                <span>${esc(m.date)}</span>
                ${m.isPhish ? '<span class="ds-badge danger ds-badge-xs">Phish Test</span>' : '<span class="ds-badge primary ds-badge-xs">Verified</span>'}
              </div>
              <div class="ds-mail-item-sender">${esc(m.from.split('<')[0].trim())}</div>
              <div class="ds-mail-item-subject">${esc(m.subject)}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Right Column: Email view -->
      <div class="ds-mail-view-col">
        ${currentEmail ? `
          <div class="ds-mail-view-head">
            <h2 class="ds-mail-view-title">${esc(currentEmail.subject)}</h2>
            <div class="ds-mail-view-meta">
              <div><b>From:</b> ${esc(currentEmail.from)}</div>
              <div><b>To:</b> ${esc(currentEmail.to)}</div>
              <div><b>Date:</b> ${esc(currentEmail.date)}</div>
            </div>
            <div class="ds-mail-toolbar">
              ${currentEmail.envId ? `
                <button type="button" class="ds-btn primary sm" onclick="dsGoto('envelope-detail', '${escAttr(currentEmail.envId)}')">
                  ${dsIcon('eye', 13)} View in DocuSign
                </button>
                <button type="button" class="ds-btn sm" onclick="dsSimulateSigner('${escAttr(currentEmail.envId)}')">
                  ${dsIcon('pen', 13)} Review &amp; Sign
                </button>
              ` : ''}
              <button type="button" class="ds-btn sm danger" onclick="dsReportPhishing('${escAttr(currentEmail.id)}')">
                ${dsIcon('shield', 13)} Report Phishing
              </button>
              <button type="button" class="ds-btn sm" onclick="dsToggleTechHeaders()">
                ${dsIcon('fileText', 13)} ${dsState.showTechHeaders ? 'Hide Technical Headers' : 'Inspect Headers (SPF/DKIM)'}
              </button>
            </div>
          </div>

          ${dsState.showTechHeaders ? `
            <div class="ds-tech-header-card">
              <div><b>Received:</b> from ${esc(currentEmail.receivedFrom || 'mail.example.com')}</div>
              <div><b>Return-Path:</b> &lt;${esc(currentEmail.returnPath || 'sender@example.com')}&gt;</div>
              <div><b>Authentication-Results:</b> spf=${esc(currentEmail.spf || 'neutral')} dkim=${esc(currentEmail.dkim || 'neutral')}</div>
              <div><b>Message-ID:</b> &lt;${currentEmail.id}.msg.docusign@va-training.local&gt;</div>
            </div>` : ''}

          ${currentEmail.isPhish && currentEmail.reported ? `
            <div class="ds-phish-callout">
              <b>🛡️ Phishing Analysis (VA Training):</b>
              <ul style="margin:6px 0 0 16px;padding:0;">
                ${(currentEmail.phishClues || []).map(c => `<li>${esc(c)}</li>`).join('')}
              </ul>
            </div>` : ''}

          <div class="ds-mail-body-content">
            ${currentEmail.body}
          </div>
        ` : `
          <div class="ds-agr-empty">Select an email to read.</div>
        `}
      </div>
    </div>`;
}

function dsSelectEmail(id) {
  dsState.activeEmailId = id;
  dsRenderRoot();
}

function dsSetMailboxFilter(cat) {
  dsState.mailboxFilter = cat;
  dsRenderRoot();
}

function dsToggleTechHeaders() {
  dsState.showTechHeaders = !dsState.showTechHeaders;
  dsRenderRoot();
}

function dsReportPhishing(id) {
  const box = dsInitMailbox();
  const m = box.find(x => x.id === id);
  if (!m) return;

  if (m.isPhish) {
    m.reported = true;
    dsConfirm({
      title: '🎯 Excellent Vigilance! Phishing Identified',
      body: 'You successfully recognized a phishing attempt. In a Real Estate Virtual Assistant role, verifying the sender domain and never trusting sudden wire instruction changes prevents catastrophic wire fraud and credential theft.',
      list: m.phishClues,
      confirmLabel: 'Understood',
      onConfirm: () => { dsRenderRoot(); }
    });
  } else {
    simToast('ℹ️ This email is a legitimate DocuSign notification (SPF and DKIM verified from docusign.net).', { tone: 'good', duration: 5000 });
  }
}

/* ==================== TEMPLATES (PHASE B / F8) ==================== */

function dsTemplatesHTML() {
  const q = (dsState.tmplQuery || '').trim().toLowerCase();
  const subView = dsState.tmplSubView || 'my';
  const all = dsAllTemplates();

  const list = all.filter(t => {
    if (!q) return true;
    return (t.name + ' ' + (t.category || '') + ' ' + (t.description || '')).toLowerCase().indexOf(q) > -1;
  });

  const cards = list.map(t => {
    const isCustom = !!t.custom;
    return `
    <div class="ds-tpl-card">
      <div class="ds-tpl-head">
        <span class="ds-tpl-ico">${dsIcon('fileText', 18)}</span>
        <div class="ds-tpl-title">
          <b>${esc(t.name)} ${isCustom ? '<span class="ds-badge green ds-badge-xs">Custom</span>' : ''}</b>
          <span class="ds-tpl-cat">${esc(t.category || 'General')}</span>
        </div>
        <button type="button" class="ds-tpl-kebab" aria-label="More actions"
                onclick="dsOpenTemplate('${escAttr(t.id)}')">${dsIcon('more', 18)}</button>
      </div>

      <p class="ds-tpl-desc">${esc(t.description || '')}</p>

      <dl class="ds-tpl-meta">
        <div><dt>Documents</dt><dd>${t.documentsCount || (t.documents ? t.documents.length : 1)}</dd></div>
        <div><dt>Recipients</dt><dd>${t.recipients.length}</dd></div>
        ${t.usageCount != null ? `<div><dt>Sent</dt><dd>${t.usageCount}</dd></div>` : ''}
      </dl>

      <ul class="ds-tpl-recips">
        ${t.recipients.map(r => `<li>${dsIcon('user', 13)}${esc(typeof r === 'string' ? r : (r.role || r.name))}${typeof r === 'object' && r.name ? ' (' + esc(r.name) + ')' : ''}</li>`).join('')}
      </ul>

      <div class="ds-tpl-foot">
        <button type="button" class="ds-btn cta sm" onclick="dsUseTemplate('${escAttr(t.id)}')">Use</button>
        <button type="button" class="ds-btn sm" onclick="dsOpenTemplate('${escAttr(t.id)}')">View / Edit</button>
      </div>
    </div>`;
  }).join('');

  return `
    <!-- Main Templates Area (Screenshot 3) -->
    <div class="ds-filterbar" style="margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:12px;flex:1;max-width:560px;">
        <div class="ds-searchpill" style="flex:1;">
          ${dsIcon('search', 16)}
          <input type="text" value="${escAttr(dsState.tmplQuery || '')}" placeholder="Search My Templates"
                 aria-label="Search templates" oninput="dsSetTemplateQuery(this.value)">
          ${dsState.tmplQuery ? `<button type="button" aria-label="Clear search" onclick="dsSetTemplateQuery('')">${dsIcon('x', 14)}</button>` : ''}
        </div>
        <button type="button" class="ds-pill" onclick="simToast('Date filter')">
          Date ${dsIcon('caret', 14)}
        </button>
        <button type="button" class="ds-pill" onclick="simToast('Advanced search')">
          Advanced search ${dsIcon('caret', 14)}
        </button>
        ${dsState.tmplQuery ? `<button type="button" class="ds-clearlink" onclick="dsSetTemplateQuery('')">Clear</button>` : ''}
      </div>

      <button type="button" class="ds-help-btn" title="View density" onclick="simToast('Switched view density.')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><circle cx="8" cy="9" r="2"/><circle cx="16" cy="15" r="2"/></svg>
      </button>
    </div>

    ${list.length
      ? `<div class="ds-tpl-grid">${cards}</div>`
      : `
      <!-- Templates Landing / Empty State (Screenshot 3) -->
      <div class="ds-empty-hero-layout">
        <div class="ds-empty-hero-art">
          <svg width="200" height="160" viewBox="0 0 200 160" fill="none">
            <rect x="35" y="25" width="90" height="120" rx="8" fill="#f0f4ff" stroke="#cbd5e1" stroke-width="2"/>
            <line x1="50" y1="48" x2="105" y2="48" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="50" y1="62" x2="112" y2="62" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="50" y1="76" x2="95" y2="76" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="50" y1="90" x2="108" y2="90" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M25 95 Q 65 55, 135 25" stroke="#00c2cb" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
            <polygon points="135,22 150,26 140,36" fill="#00c2cb"/>
            <path d="M25 115 Q 75 75, 155 45" stroke="#4f86f7" stroke-width="2" stroke-dasharray="4 4" fill="none"/>
            <polygon points="155,42 170,46 160,56" fill="#4f86f7"/>
          </svg>
        </div>
        <div class="ds-empty-hero-content">
          <h2>Resending the same envelopes?</h2>
          <p>Save documents, placeholder recipients and fields as a template so you can save time.</p>
          <div>
            <button type="button" class="ds-btn-primary" onclick="dsOpenTemplateBuilder()">Create a Template</button>
            <a class="ds-link-secondary" onclick="simToast('Browse starter templates catalog')">Browse starter templates</a>
          </div>
        </div>
      </div>`}

    <!-- Templates Pager Footer (F8) -->
    <div class="ds-pager" style="margin-top:24px;border-top:1px solid var(--ds26-hairline);padding-top:14px;display:flex;justify-content:space-between;align-items:center;">
      <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ds24-muted);">
        <span>25 / Page</span>
        ${dsIcon('caret', 12)}
      </div>
      <div style="display:flex;align-items:center;gap:12px;font-size:13px;color:var(--ds26-ink-90);">
        <span>Page 1</span>
        <div style="display:flex;gap:4px;">
          <button type="button" class="ds-btn sm" disabled style="padding:2px 6px;">&lsaquo;</button>
          <button type="button" class="ds-btn sm" disabled style="padding:2px 6px;">&rsaquo;</button>
        </div>
      </div>
    </div>`;
}

function dsSetTmplSubView(v) {
  dsState.tmplSubView = v;
  dsSyncNav();
  dsRenderRoot();
}

function dsSetTemplateCat(c) { dsState.tmplCat = c; dsRenderRoot(); }
function dsSetTemplateQuery(q) {
  dsState.tmplQuery = q;
  const pos = document.activeElement && document.activeElement.selectionStart;
  dsRenderRoot();
  const next = document.querySelector('.ds-searchpill input');
  if (next) { next.focus(); if (pos != null && next.setSelectionRange) next.setSelectionRange(pos, pos); }
}

function dsOpenTemplate(tmplId) {
  dsState.activeTemplateId = tmplId;
  dsGoto('template-detail');
}

function dsTemplateFields(tmpl) {
  if (tmpl.fields && tmpl.fields.length) {
    const byRole = {};
    tmpl.fields.forEach(f => {
      const r = f.role || f.recipientId || 'Signer';
      (byRole[r] = byRole[r] || []).push(f.type || f.label || 'Field');
    });
    return (tmpl.recipients || []).map(r => {
      const roleName = typeof r === 'string' ? r : r.role;
      const signs = typeof r === 'object' ? dsRecipientSigns(r) : (/signer|sign|buyer|seller/i.test(r) && !/cc|copy/i.test(r));
      return {
        role: roleName,
        signs: signs,
        fields: byRole[roleName] || (signs ? ['Signature', 'Date Signed'] : [])
      };
    });
  }

  return (tmpl.recipients || []).map(r => {
    const roleName = typeof r === 'string' ? r : r.role;
    const signs = typeof r === 'object' ? dsRecipientSigns(r) : (/signer|sign|buyer|seller/i.test(r) && !/cc|copy/i.test(r));
    return {
      role: roleName,
      signs: signs,
      fields: signs
        ? ['Signature', 'Date Signed', 'Full Name'].concat(/broker|manager|lender/i.test(roleName) ? ['Title'] : [])
        : []
    };
  });
}

function dsTemplateDetailHTML() {
  const t = dsAllTemplates().find(x => x.id === dsState.activeTemplateId);
  if (!t) return '<p>Template not found.</p>';
  const roles = dsTemplateFields(t);
  const totalFields = roles.reduce((n, r) => n + r.fields.length, 0);
  const isCustom = !!t.custom;

  return `
    <button type="button" class="ds-backlink" onclick="dsGoto('templates')">${dsIcon('arrowLeft', 15)} Templates</button>

    <div class="ds-pagehead">
      <h1 class="ds-page-title sm">${esc(t.name)} ${isCustom ? '<span class="ds-badge green ds-badge-xs">Custom</span>' : ''}</h1>
      <div class="ds-pagehead-btns">
        ${isCustom ? `
          <button type="button" class="ds-btn" onclick="dsOpenTemplateBuilder('${escAttr(t.id)}')">${dsIcon('edit', 15)} Edit Template</button>
          <button type="button" class="ds-btn danger" onclick="dsDeleteTemplate('${escAttr(t.id)}')">${dsIcon('trash', 15)} Delete</button>
        ` : `
          <button type="button" class="ds-btn" onclick="dsOpenTemplateBuilder('${escAttr(t.id)}', true)">${dsIcon('copy', 15)} Duplicate &amp; Edit</button>
        `}
        <button type="button" class="ds-btn primary" onclick="dsUseTemplate('${escAttr(t.id)}')">Use Template</button>
      </div>
    </div>

    <p class="ds-pagelede">${esc(t.description)}</p>

    <div class="ds-kpi-row">
      <div class="ds-kpi"><span class="ds-kpi-label">Category</span><b class="ds-kpi-text">${esc(t.category)}</b></div>
      <div class="ds-kpi"><span class="ds-kpi-label">Documents</span><b>${t.documentsCount || (t.documents ? t.documents.length : 1)}</b></div>
      <div class="ds-kpi"><span class="ds-kpi-label">Fields placed</span><b>${totalFields}</b><span class="ds-kpi-sub">Across ${roles.length} role${roles.length === 1 ? '' : 's'}</span></div>
      <div class="ds-kpi"><span class="ds-kpi-label">Times sent</span><b>${t.usageCount != null ? t.usageCount : '—'}</b><span class="ds-kpi-sub">${t.lastUsed ? 'Last used ' + esc(t.lastUsed) : 'Never used'}</span></div>
    </div>

    <h3 class="ds-sec-h">Recipient roles</h3>
    <p class="ds-pagelede">A role is a placeholder. When you use the template you fill in who each one actually is; the fields below travel with them.</p>

    <table class="ds-agr-tbl ds-agr-tbl-compact">
      <thead><tr><th>Role</th><th>Signs?</th><th>Fields pre-placed</th></tr></thead>
      <tbody>
        ${roles.map(r => `
          <tr>
            <td><b>${esc(r.role)}</b></td>
            <td>${r.signs ? '<span class="ds-yes">' + dsIcon('check', 15) + '</span>' : '<span class="ds-no">Receives a copy</span>'}</td>
            <td>${r.fields.length ? r.fields.map(f => '<span class="ds-fieldchip">' + esc(f) + '</span>').join('') : '<span class="ds-no">—</span>'}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    <h3 class="ds-sec-h">Documents</h3>
    <ul class="ds-doclist">
      ${(t.documents || Array.from({ length: t.documentsCount || 1 }, (_, i) => ({ name: `${t.name}${t.documentsCount > 1 ? ' — Part ' + (i + 1) : ''}.pdf` }))).map((d, i) => `
        <li class="ds-doc-item-clickable" onclick="dsViewTemplateDoc('${escAttr(t.id)}', ${i})">
          ${dsIcon('file', 17)}
          <span>${esc(d.name || d)}</span>
          <span class="ds-doc-hint">${dsIcon('eye', 13)} View</span>
        </li>`).join('')}
    </ul>`;
}

/* ---------- Use Template with Role Assignment (Phase B.3) ---------- */
function dsUseTemplate(tmplId) {
  dsMark('ds_c4_2');
  const all = dsAllTemplates();
  const tmpl = all.find(t => t.id === tmplId) || DS_TEMPLATES.find(t => t.id === tmplId);
  if (!tmpl) {
    simToast('Template not found.');
    return;
  }
  dsOpenRoleMatchModal(tmpl);
}

function dsOpenRoleMatchModal(tmpl) {
  const modal = document.createElement('div');
  modal.id = 'dsRoleMatchModalWrap';
  modal.className = 'ds-modal-backdrop';

  const rawRoles = tmpl.recipients || ['Buyer', 'Seller', 'Agent (CC)'];
  const roles = rawRoles.map((r, i) => {
    if (typeof r === 'object') {
      return { id: 'r' + i, role: r.role || 'Signer', action: r.action || 'Needs to Sign', order: r.order || (i + 1), name: r.name || '', email: r.email || '' };
    }
    const isCC = /cc|copy|agent/i.test(r) && !/buyer|seller|signer/i.test(r);
    return {
      id: 'r' + i,
      role: r.replace(/\s*\(.*?\)/, '').trim() || r,
      action: isCC ? 'Receives a Copy' : 'Needs to Sign',
      order: i + 1,
      name: '',
      email: ''
    };
  });

  const contactOptions = DS_S_CONTACTS.map(c => `<option value="${escAttr(c.email)}">${escAttr(c.name)} — ${escAttr(c.company)}</option>`).join('');

  modal.innerHTML = `
    <div class="ds-modal-card ds-role-match-card">
      <div class="ds-modal-head">
        <div>
          <h3 class="ds-adopt-head-wrap">${dsIcon('users')} Match Template Roles to Recipients</h3>
          <div class="ds-audit-actor">Template: <b>${esc(tmpl.name)}</b> &middot; Fields will auto-assign to matched recipients</div>
        </div>
        <button type="button" class="ds-btn ds-cert-close-btn" onclick="dsCloseRoleMatchModal()">${dsIcon('x', 13)}</button>
      </div>
      <div class="ds-modal-body">
        <datalist id="dsRoleMatchContactList">${contactOptions}</datalist>
        <p class="ds-wiz-sub">Enter the names and email addresses for each recipient role. DocuSign will automatically place all signature, initial, and date fields on the right person.</p>
        <div>
          ${roles.map((r, idx) => `
            <div class="ds-role-match-row">
              <div class="ds-role-match-head">
                <b>Role: ${esc(r.role)}</b>
                <span class="ds-badge ${r.action === 'Receives a Copy' ? 'draft' : 'completed'}">${esc(r.action)} &middot; Order ${r.order}</span>
              </div>
              <div class="ds-role-match-inputs">
                <div>
                  <label>Full Name</label>
                  <input type="text" id="dsRmName-${idx}" value="${escAttr(r.name)}" placeholder="e.g. John Smith">
                </div>
                <div>
                  <label>Email Address</label>
                  <input type="email" id="dsRmEmail-${idx}" value="${escAttr(r.email)}" placeholder="name@example.com" list="dsRoleMatchContactList">
                </div>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="ds-modal-foot">
        <button type="button" class="ds-btn" onclick="dsCloseRoleMatchModal()">Cancel</button>
        <button type="button" class="ds-btn primary" onclick="dsApplyRoleMatching('${escAttr(tmpl.id)}')">Apply &amp; Continue to Envelope →</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
}

function dsCloseRoleMatchModal() {
  const m = document.getElementById('dsRoleMatchModalWrap');
  if (m) m.remove();
}

function dsApplyRoleMatching(tmplId) {
  const all = dsAllTemplates();
  const tmpl = all.find(t => t.id === tmplId) || DS_TEMPLATES.find(t => t.id === tmplId);
  if (!tmpl) return;

  const rawRoles = tmpl.recipients || ['Buyer', 'Seller', 'Agent (CC)'];
  const assignedRecips = [];

  for (let i = 0; i < rawRoles.length; i++) {
    const r = rawRoles[i];
    const nameInput = document.getElementById('dsRmName-' + i);
    const emailInput = document.getElementById('dsRmEmail-' + i);
    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    if (email && !dsEmailSyntaxOk(email)) {
      simToast(`"${email}" is not a valid email address.`);
      if (emailInput) emailInput.focus();
      return;
    }

    const roleName = typeof r === 'string' ? r.replace(/\s*\(.*?\)/, '').trim() : r.role;
    const action = typeof r === 'object' ? r.action : (/cc|copy|agent/i.test(r) && !/buyer|seller|signer/i.test(r) ? 'Receives a Copy' : 'Needs to Sign');
    const order = typeof r === 'object' ? (r.order || i + 1) : (i + 1);

    assignedRecips.push({
      id: 'wr' + (100 + i),
      role: roleName,
      name: name || roleName,
      email: email || (name ? name.toLowerCase().replace(/\s+/g, '.') + '@example.com' : `signer${i + 1}@example.com`),
      action: action,
      order: order
    });
  }

  /* Reset wizard and apply template data */
  dsResetWizard();
  dsState.wizardData.subject = tmpl.name;
  dsState.wizardData.documents = tmpl.documents && tmpl.documents.length
    ? JSON.parse(JSON.stringify(tmpl.documents))
    : [{ name: tmpl.name + '.pdf', pages: tmpl.documentsCount || 2 }];
  dsState.wizardData.recipients = assignedRecips;
  dsState.wizardData.useSequentialOrder = assignedRecips.some((r, idx) => r.order !== 1);

  /* Build / Map fields to matched recipients */
  const fields = [];
  assignedRecips.forEach((r, idx) => {
    if (dsRecipientSigns(r)) {
      fields.push({
        id: 'wf' + (idx * 2 + 1),
        type: 'Signature',
        recipientId: r.id,
        page: 1,
        label: r.role + ' Signature',
        required: true,
        value: null,
        /* Percentages of the page box, same basis as dsAddCustomCanvasField().
           These used to be pixels (120 / 400 + idx*80), which would drift the
           moment the canvas zoomed or the viewport narrowed. */
        x: 16,
        y: Math.min(88, 62 + idx * 9)
      });
      fields.push({
        id: 'wf' + (idx * 2 + 2),
        type: 'Date Signed',
        recipientId: r.id,
        page: 1,
        label: 'Date Signed',
        required: true,
        value: null,
        x: 47,
        y: Math.min(88, 62 + idx * 9)
      });
    }
  });
  dsState.wizardData.fields = fields;

  dsCloseRoleMatchModal();
  simToast(`Template applied! Fields placed and assigned to recipients.`, { tone: 'good', duration: 4000 });
  dsState.wizardStep = 3;
  dsGoto('new-envelope');
}

/* ---------- Template Builder: Create / Edit (Phase B.1 & B.2) ---------- */
function dsOpenTemplateBuilder(tmplId, isDuplicate) {
  let initial = {
    name: '',
    category: 'Real Estate',
    description: '',
    documents: [{ name: 'Document_1.pdf', pages: 2 }],
    recipients: [
      { role: 'Buyer', action: 'Needs to Sign', order: 1, name: '', email: '' },
      { role: 'Seller', action: 'Needs to Sign', order: 2, name: '', email: '' },
      { role: 'Agent', action: 'Receives a Copy', order: 3, name: '', email: '' }
    ]
  };

  if (tmplId) {
    const all = dsAllTemplates();
    const existing = all.find(t => t.id === tmplId);
    if (existing) {
      initial = {
        id: isDuplicate ? null : existing.id,
        name: isDuplicate ? `Copy of ${existing.name}` : existing.name,
        category: existing.category || 'Real Estate',
        description: existing.description || '',
        documents: existing.documents ? JSON.parse(JSON.stringify(existing.documents)) : [{ name: `${existing.name}.pdf`, pages: existing.documentsCount || 2 }],
        recipients: (existing.recipients || []).map((r, i) => {
          if (typeof r === 'object') return Object.assign({}, r);
          const isCC = /cc|copy/i.test(r);
          return { role: r, action: isCC ? 'Receives a Copy' : 'Needs to Sign', order: i + 1, name: '', email: '' };
        })
      };
    }
  }

  dsState.templateBuilderData = initial;
  dsRenderTemplateBuilderModal();
}

function dsRenderTemplateBuilderModal() {
  let modal = document.getElementById('dsTplBuilderModalWrap');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dsTplBuilderModalWrap';
    modal.className = 'ds-modal-backdrop';
    document.body.appendChild(modal);
  }

  const d = dsState.templateBuilderData;
  const categories = ['Real Estate', 'HR & Onboarding', 'Legal', 'Finance', 'Procurement', 'Operations'];

  modal.innerHTML = `
    <div class="ds-modal-card ds-tpl-builder-card">
      <div class="ds-modal-head">
        <div>
          <h3 class="ds-adopt-head-wrap">${dsIcon('fileText')} ${d.id ? 'Edit Template' : 'Create New Template'}</h3>
          <div class="ds-audit-actor">Configure reusable documents, recipient roles, and default actions</div>
        </div>
        <button type="button" class="ds-btn ds-cert-close-btn" onclick="dsCloseTemplateBuilder()">${dsIcon('x', 13)}</button>
      </div>
      <div class="ds-modal-body">
        <div class="ds-tpl-builder-grid">
          <div class="ds-tpl-builder-field">
            <label>Template Name *</label>
            <input type="text" id="dsTbName" value="${escAttr(d.name)}" placeholder="e.g. Standard Listing Agreement Package"
                   oninput="dsState.templateBuilderData.name = this.value">
          </div>
          <div class="ds-tpl-builder-field">
            <label>Category</label>
            <select id="dsTbCat" onchange="dsState.templateBuilderData.category = this.value">
              ${categories.map(c => `<option value="${escAttr(c)}" ${d.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="ds-tpl-builder-field">
          <label>Description</label>
          <textarea rows="2" id="dsTbDesc" placeholder="Describe the purpose of this template and when to use it..."
                    oninput="dsState.templateBuilderData.description = this.value">${esc(d.description)}</textarea>
        </div>

        <h4 class="ds-sec-h">Recipient Roles</h4>
        <p class="ds-wiz-sub">Define the roles that will participate in this template workflow.</p>
        <div id="dsTbRolesList">
          ${d.recipients.map((r, i) => `
            <div class="ds-tpl-role-item">
              <input type="text" value="${escAttr(r.role)}" placeholder="Role Name (e.g. Buyer)"
                     oninput="dsState.templateBuilderData.recipients[${i}].role = this.value">
              <select onchange="dsState.templateBuilderData.recipients[${i}].action = this.value">
                <option value="Needs to Sign" ${r.action === 'Needs to Sign' ? 'selected' : ''}>Needs to Sign</option>
                <option value="Receives a Copy" ${r.action === 'Receives a Copy' ? 'selected' : ''}>Receives a Copy (CC)</option>
                <option value="Needs to View" ${r.action === 'Needs to View' ? 'selected' : ''}>Needs to View</option>
                <option value="Witness" ${r.action === 'Witness' ? 'selected' : ''}>Witness</option>
              </select>
              <input type="number" min="1" max="10" value="${r.order || (i + 1)}" title="Signing Order"
                     onchange="dsState.templateBuilderData.recipients[${i}].order = parseInt(this.value,10)||1">
              <input type="text" value="${escAttr(r.name || '')}" placeholder="Default Name (optional)"
                     oninput="dsState.templateBuilderData.recipients[${i}].name = this.value">
              <input type="email" value="${escAttr(r.email || '')}" placeholder="Default Email (optional)"
                     oninput="dsState.templateBuilderData.recipients[${i}].email = this.value">
              <button type="button" class="ds-btn sm danger" onclick="dsTbRemoveRole(${i})">${dsIcon('x', 12)}</button>
            </div>`).join('')}
        </div>
        <button type="button" class="ds-btn sm" onclick="dsTbAddRole()">+ Add Role</button>
      </div>
      <div class="ds-modal-foot">
        <button type="button" class="ds-btn" onclick="dsCloseTemplateBuilder()">Cancel</button>
        <button type="button" class="ds-btn primary" onclick="dsSaveTemplateBuilder()">Save Template</button>
      </div>
    </div>`;
}

function dsTbAddRole() {
  const d = dsState.templateBuilderData;
  d.recipients.push({ role: 'Role ' + (d.recipients.length + 1), action: 'Needs to Sign', order: d.recipients.length + 1, name: '', email: '' });
  dsRenderTemplateBuilderModal();
}

function dsTbRemoveRole(index) {
  const d = dsState.templateBuilderData;
  if (d.recipients.length <= 1) {
    simToast('A template must have at least one recipient role.');
    return;
  }
  d.recipients.splice(index, 1);
  dsRenderTemplateBuilderModal();
}

function dsCloseTemplateBuilder() {
  const m = document.getElementById('dsTplBuilderModalWrap');
  if (m) m.remove();
  dsState.templateBuilderData = null;
}

function dsSaveTemplateBuilder() {
  const d = dsState.templateBuilderData;
  if (!d) return;

  const name = (d.name || '').trim();
  if (!name) {
    simToast('Template name is required.');
    const el = document.getElementById('dsTbName');
    if (el) el.focus();
    return;
  }

  if (!d.recipients || !d.recipients.length) {
    simToast('Add at least one recipient role.');
    return;
  }

  if (!dsDemo.templates) dsDemo.templates = [];

  const tmplId = d.id || ('TMPL-DEMO-' + (100 + dsDemo.templates.length + 1));
  const newTmpl = {
    id: tmplId,
    name: name,
    category: d.category || 'Real Estate',
    description: d.description || `Custom template for ${name}`,
    documentsCount: d.documents ? d.documents.length : 1,
    documents: d.documents || [{ name: `${name}.pdf`, pages: 2 }],
    recipients: d.recipients.map(r => Object.assign({}, r)),
    custom: true,
    usageCount: 0,
    lastUsed: null
  };

  const existingIdx = dsDemo.templates.findIndex(t => t.id === tmplId);
  if (existingIdx > -1) {
    dsDemo.templates[existingIdx] = newTmpl;
  } else {
    dsDemo.templates.push(newTmpl);
  }

  dsCloseTemplateBuilder();
  simToast(`Template "${name}" saved!`, { tone: 'good', duration: 4000 });
  dsGoto('templates');
}

function dsDeleteTemplate(tmplId) {
  const tmpl = (dsDemo.templates || []).find(t => t.id === tmplId);
  if (!tmpl) {
    simToast('Catalogue templates cannot be deleted.');
    return;
  }

  dsConfirm({
    title: `Delete Template "${tmpl.name}"?`,
    body: 'This will remove the custom template from your active session. Any in-flight envelopes created from it will remain.',
    danger: true,
    confirmLabel: 'Delete Template',
    onConfirm: () => {
      dsDemo.templates = dsDemo.templates.filter(t => t.id !== tmplId);
      simToast(`Template "${tmpl.name}" deleted.`, { tone: 'good' });
      dsGoto('templates');
    }
  });
}

function dsSaveEnvelopeAsTemplate(envId) {
  const env = dsGetEnvelope(envId);
  if (!env) return;
  if (!dsDemo.templates) dsDemo.templates = [];
  const tmplId = 'TMPL-DEMO-' + (100 + dsDemo.templates.length + 1);
  const newTmpl = {
    id: tmplId,
    name: env.subject + ' Template',
    category: env.type || 'Real Estate',
    description: `Template generated from envelope ${env.id}`,
    documentsCount: env.documents ? env.documents.length : 1,
    documents: env.documents ? JSON.parse(JSON.stringify(env.documents)) : [{ name: env.subject + '.pdf', pages: 2 }],
    recipients: (env.recipients || []).map(r => ({
      role: r.role || r.name || 'Signer',
      action: r.action || 'Needs to Sign',
      order: r.order || 1,
      name: '',
      email: ''
    })),
    fields: env.fields ? JSON.parse(JSON.stringify(env.fields)) : [],
    custom: true,
    usageCount: 0,
    lastUsed: null
  };
  dsDemo.templates.push(newTmpl);
  simToast(`Saved envelope as template "${newTmpl.name}"!`, { tone: 'good', duration: 4000 });
  dsGoto('templates');
}

/* ==================== SCENARIOS ==================== */
function dsScenariosHTML() {
  const score = dsScenarioScore();
  const cards = DS_SCENARIOS.map(s => {
    const r = dsStore.scenarios[s.id];
    const statusText  = r ? (r.correct ? 'Correct' : 'Incorrect') : 'Not Started';
    const statusClass = r ? (r.correct ? 'completed' : 'voided') : 'draft';
    return `
      <div class="ds-scenario-card" onclick="dsGoto('scenario-detail','${s.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <b>${esc(s.title)}</b>
          <span class="ds-badge ${statusClass}" style="flex-shrink:0;">${statusText}</span>
        </div>
        <p>${esc(s.situation.slice(0, 100))}…</p>
      </div>`;
  }).join('');

  return `
    <div class="ds-listhead">
      <div>
        <h2 class="ds-page-title">Scenario Challenges</h2>
        <div class="sub">Test your VA judgment on real-world DocuSign situations</div>
      </div>
      <div style="font-size:14px;font-weight:700;color:var(--ds-blue);">
        ${score.correct}/${score.answered} correct &nbsp;·&nbsp; ${score.total} scenarios
      </div>
    </div>
    <div class="ds-scenario-grid">${cards}</div>`;
}

/* ==================== SCENARIO DETAIL ==================== */
function dsScenarioDetailHTML() {
  const s = DS_SCENARIOS.find(x => x.id === dsState.activeScenarioId);
  if (!s) return '<p style="color:#888;padding:24px;">Scenario not found.</p>';
  const r = dsStore.scenarios[s.id];
  /* A retaken item keeps its record (firstAttempt is preserved) but has no current answer,
     so "answered" has to mean "there is an answer right now" — otherwise Try Again clears
     the answer and leaves the options disabled forever. answered can legitimately be 0. */
  const answeredNow = !!(r && r.answered != null);

  /* B-3: options are shown in shuffled order */
  const order = dsOptionOrder(s.id, s.options.length);
  const opts = order.map(origIdx => {
    let cls = '';
    if (answeredNow) {
      if (origIdx === s.correct)                    cls = 'correct';
      else if (origIdx === r.answered && !r.correct) cls = 'incorrect';
    }
    return `
      <button type="button" class="ds-option ${cls}" ${answeredNow ? 'disabled' : ''} onclick="dsAnswerScenario('${s.id}',${origIdx})">
        ${esc(s.options[origIdx])}
      </button>`;
  }).join('');

  /* A wrong answer used to be terminal: the options were disabled and nothing offered a way
     back, so a single mis-click on Lesson 1's scenario locked the entire curriculum behind an
     unsatisfiable step. Retry is always available; what protects the score is firstAttempt,
     which dsAnswerScenario records once and never overwrites. Once the answer IS correct and
     a Continue button is showing, Retake is dropped — clicking it there would wipe the
     resolved state and take the Continue button down with it. */
  const continueBtn = (answeredNow && r.correct && SimEngine.continueHTML)
    ? SimEngine.continueHTML(dsFindLessonStep('decide', 'scenarioId', s.id)) : '';
  const retakeBtn = answeredNow
    ? ((r.correct && continueBtn) ? ''
      : `<button type="button" class="ds-btn sm" onclick="dsRetakeScenario('${escAttr(s.id)}')">${r.correct ? 'Retake Scenario' : 'Try Again'}</button>`)
    : '';
  const firstLine = (answeredNow && r.firstAttempt)
    ? `<div class="ds-first-attempt">First attempt: ${r.firstAttempt.correct ? '&#10003; correct' : '&#10007; incorrect'} &middot; this is what counts toward your score.</div>`
    : '';
  const feedback = answeredNow ? `
    <div class="ds-feedback ${r.correct ? 'correct' : 'incorrect'}">
      <b>${r.correct ? 'Correct!' : 'Not quite right.'}</b>
      <p class="ds-feedback-body">${esc(s.explanation)}</p>
      ${firstLine}
      <div class="ds-feedback-actions">${continueBtn}${retakeBtn}</div>
    </div>` : '';

  return `
    <div class="ds-detail-back" onclick="dsGoto('scenarios')">← Back to Scenarios</div>

    <div class="ds-panel" style="margin-top:0;">
      <h3 style="margin:0 0 14px;color:#222;font-size:17px;">${esc(s.title)}</h3>
      <div style="font-size:14px;line-height:1.7;color:#333;margin-bottom:20px;background:#f5f5f5;padding:16px 18px;border-radius:8px;border-left:4px solid var(--ds-blue);">
        ${esc(s.situation)}
      </div>
      <div style="font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Select the best action:</div>
      ${opts}
      ${feedback}
    </div>`;
}

/* Clears the current answer so the options unlock, while keeping firstAttempt — retaking is
   for learning, not for laundering a wrong first answer into a right one. Mirrors
   qzRetakeScenario in the Qualia module. */
function dsRetakeScenario(scenId) {
  const prev = dsStore.scenarios[scenId] || {};
  if (prev.firstAttempt) dsStore.scenarios[scenId] = { firstAttempt: prev.firstAttempt };
  else delete dsStore.scenarios[scenId];
  dsSave();
  dsRenderRoot();
  /* If the walkthrough is parked on this exact step it is showing "Not quite" with no way
     forward; re-rendering its tip puts the original instruction back. */
  if (SimEngine.walkActive()) {
    const step = SimEngine.currentStep();
    if (step && step.type === 'decide' && step.scenarioId === scenId) SimEngine.renderTip(step, false);
  }
}
function dsAnswerScenario(scenId, optIdx) {
  const s = DS_SCENARIOS.find(x => x.id === scenId);
  if (!s) return;
  const isCorrect = (optIdx === s.correct);
  const existing = dsStore.scenarios[scenId];
  const record = { answered: optIdx, correct: isCorrect, ts: Date.now() };
  /* B-3 fix: track first attempt separately for exam-quality grading. */
  if (!existing) record.firstAttempt = { answered: optIdx, correct: isCorrect };
  else record.firstAttempt = existing.firstAttempt || { answered: optIdx, correct: isCorrect };
  dsStore.scenarios[scenId] = record;
  dsSave();
  /* B-7: Report score to SCApp core */
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  if (su && window.SCApp.setModeScore) {
    const sc = dsScenarioScore();
    SCApp.setModeScore(su.id, 'docusign', 'scenario', sc.correct, sc.total);
  }
  /* Notify walkthrough (for 'decide' steps linked to this scenario) */
  if (isCorrect) dsNotifyStepDone('scenario:' + scenId);
  dsRenderRoot();
}

/* ============================================================================
   TRIAGE MECHANIC (D-1: Lesson 5, Lesson 10 & Exam)
   ============================================================================ */
const DS_TRIAGE_ACTION_LABELS = {
  'resend': 'Send Reminder (Resend)',
  'correct': 'Correct Envelope (In-flight Edit)',
  'void': 'Void Envelope (Mandatory Reason)',
  'none': 'No Action Needed (On Track / Completed)',
  'report-phishing': 'Report Phishing / Security Threat',
  'escalate': 'Escalate to Supervising Broker'
};

function dsTriageHTML() {
  const id = dsState.activeTriageId || 'tri-env-9041';
  const item = DS_TRIAGE_ITEMS.find(x => x.id === id) || DS_TRIAGE_ITEMS[0];
  const r = dsStore.triages[item.id];
  const answeredNow = !!(r && r.answered != null);

  const actions = ['resend', 'correct', 'void', 'none', 'report-phishing', 'escalate'];
  const btns = actions.map(act => {
    let cls = '';
    if (answeredNow) {
      if (act === item.rightAction)                 cls = 'correct';
      else if (act === r.answered && !r.correct)   cls = 'incorrect';
    }
    return `<button type="button" class="ds-option ${cls}" ${answeredNow ? 'disabled' : ''} onclick="dsTriageAnswer('${item.id}','${act}')" style="margin-bottom:8px;text-align:left;">
      <b>${esc(DS_TRIAGE_ACTION_LABELS[act])}</b>
    </button>`;
  }).join('');

  const docBtn = item.doc ? `<div style="margin-bottom:14px;"><button type="button" class="ds-btn primary sm" onclick="SimEngine.viewDoc('${escAttr(item.doc)}','${escAttr(item.docTitle)}')">Open & Inspect ${esc(item.docTitle || 'Document')}</button></div>` : '';

  const continueBtn = (answeredNow && r.correct && SimEngine.continueHTML)
    ? SimEngine.continueHTML(dsFindLessonStep('triage', 'triageId', item.id)) : '';
  const retryBtn = answeredNow
    ? ((r.correct && continueBtn) ? ''
      : `<button type="button" class="ds-btn sm" onclick="dsRetakeTriage('${escAttr(item.id)}')">${r.correct ? 'Redo' : 'Try Again'}</button>`)
    : '';
  const feedback = answeredNow ? `
    <div class="ds-feedback ${r.correct ? 'correct' : 'incorrect'}">
      <b>${r.correct ? 'Correct triage action.' : 'Not the right action here.'}</b>
      <p class="ds-feedback-body">${esc(item.explain)}</p>
      <div class="ds-feedback-actions">${continueBtn}${retryBtn}</div>
    </div>` : '';

  return `
    <div class="ds-detail-back" onclick="dsGoto('dashboard')">← Back to Dashboard</div>

    <div class="ds-panel" style="margin-top:0;">
      <span class="ds-badge yellow" style="font-size:11px;margin-bottom:6px;display:inline-block;">TRIAGE DECISION</span>
      <h3 style="margin:0 0 12px;color:#222;font-size:17px;">${esc(item.title)}</h3>

      <div style="font-size:14px;line-height:1.7;color:#333;margin-bottom:16px;background:#f5f5f5;padding:16px 18px;border-radius:8px;border-left:4px solid var(--ds-blue);">
        ${esc(item.situation)}
      </div>

      ${docBtn}

      <div style="font-size:12px;font-weight:700;color:var(--ds-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">What is the appropriate action for this item?</div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${btns}
      </div>
      ${feedback}
    </div>`;
}

/* Same rule as dsRetakeScenario: unlock the choices, keep firstAttempt. Used by both the
   triage and verify banks, which store their records in different bags but with the same
   shape. */
function dsRetakeItem(bag, itemId, stepType, stepKey) {
  const prev = bag[itemId] || {};
  if (prev.firstAttempt) bag[itemId] = { firstAttempt: prev.firstAttempt };
  else delete bag[itemId];
  dsSave();
  dsRenderRoot();
  if (SimEngine.walkActive()) {
    const step = SimEngine.currentStep();
    if (step && step.type === stepType && step[stepKey] === itemId) SimEngine.renderTip(step, false);
  }
}
function dsRetakeTriage(itemId) { dsRetakeItem(dsStore.triages, itemId, 'triage', 'triageId'); }
function dsRetakeVerify(itemId) { dsRetakeItem(dsStore.reviews, itemId, 'verify', 'reviewId'); }

function dsTriageAnswer(itemId, action) {
  const item = DS_TRIAGE_ITEMS.find(x => x.id === itemId);
  if (!item) return;
  const isCorrect = (action === item.rightAction);
  /* firstAttempt is written once and never overwritten, so retaking can improve what the
     trainee understands without rewriting what they actually scored the first time. */
  const prev = dsStore.triages[itemId];
  dsStore.triages[itemId] = {
    answered: action, correct: isCorrect, ts: Date.now(),
    firstAttempt: (prev && prev.firstAttempt) || { answered: action, correct: isCorrect }
  };
  if (isCorrect) dsMark('tri:' + itemId);
  dsSave();
  if (isCorrect) dsNotifyStepDone('tri:' + itemId);
  dsRenderRoot();
}

/* ============================================================================
   VERIFY MECHANIC (D-1: Lesson 6, Lesson 7, Lesson 9 & Exam)
   ============================================================================ */
function dsVerifyHTML() {
  const id = dsState.activeVerifyId || 'ver-cert-9041';
  const item = DS_VERIFY_ITEMS.find(x => x.id === id) || DS_VERIFY_ITEMS[0];
  const r = dsStore.reviews[item.id];
  const answeredNow = !!(r && r.answered != null);

  const opts = item.options.map(opt => {
    let cls = '';
    if (answeredNow) {
      if (opt.id === item.rightOptionId)           cls = 'correct';
      else if (opt.id === r.answered && !r.correct) cls = 'incorrect';
    }
    return `<button type="button" class="ds-option ${cls}" ${answeredNow ? 'disabled' : ''} onclick="dsVerifyAnswer('${item.id}','${opt.id}')" style="margin-bottom:8px;text-align:left;">
      <b>${opt.id.toUpperCase()}.</b> ${esc(opt.text)}
    </button>`;
  }).join('');

  const docBtn = `<button type="button" class="ds-btn primary" onclick="SimEngine.viewDoc('${escAttr(item.doc)}','${escAttr(item.docTitle)}')">Open ${esc(item.docTitle)} &rarr;</button>`;

  const continueBtn = (answeredNow && r.correct && SimEngine.continueHTML)
    ? SimEngine.continueHTML(dsFindLessonStep('verify', 'reviewId', item.id)) : '';
  const retryBtn = answeredNow
    ? ((r.correct && continueBtn) ? ''
      : `<button type="button" class="ds-btn sm" onclick="dsRetakeVerify('${escAttr(item.id)}')">${r.correct ? 'Redo' : 'Try Again'}</button>`)
    : '';
  const feedback = answeredNow ? `
    <div class="ds-feedback ${r.correct ? 'correct' : 'incorrect'}">
      <b>${r.correct ? 'Audit verified.' : 'That is not what the document shows.'}</b>
      <p class="ds-feedback-body">${esc(item.explain)}</p>
      <div class="ds-feedback-actions">${continueBtn}${retryBtn}</div>
    </div>` : '';

  return `
    <div class="ds-detail-back" onclick="dsGoto('dashboard')">← Back to Dashboard</div>

    <div class="ds-panel" style="margin-top:0;">
      <span class="ds-badge green" style="font-size:11px;margin-bottom:6px;display:inline-block;">DOCUMENT VERIFICATION</span>
      <h3 style="margin:0 0 12px;color:#222;font-size:17px;">${esc(item.title)}</h3>

      <div style="background:#f0f4ff;border:1px solid #c5d8ff;border-radius:8px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div>
          <span style="font-size:12px;font-weight:700;color:#1a237e;">STEP 1: INSPECT SOURCE DOCUMENT</span>
          <div style="font-size:13px;color:#333;margin-top:2px;">Compare system timestamps and signer records with the document audit trail.</div>
        </div>
        ${docBtn}
      </div>

      <div style="font-size:13.5px;line-height:1.6;color:#333;margin-bottom:16px;background:#fafafa;padding:12px 16px;border-radius:6px;border:1px solid #e0e0e0;">
        <span style="font-size:11px;font-weight:700;color:var(--ds-muted);text-transform:uppercase;">SYSTEM LOG</span><br>
        <b>${esc(item.systemValue)}</b>
      </div>

      <div style="font-size:13px;font-weight:700;color:#222;margin-bottom:12px;">${esc(item.question)}</div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${opts}
      </div>
      ${feedback}
    </div>`;
}

function dsVerifyAnswer(itemId, optionId) {
  const item = DS_VERIFY_ITEMS.find(x => x.id === itemId);
  if (!item) return;
  const isCorrect = (optionId === item.rightOptionId);
  const prev = dsStore.reviews[itemId];
  dsStore.reviews[itemId] = {
    answered: optionId, correct: isCorrect, ts: Date.now(),
    firstAttempt: (prev && prev.firstAttempt) || { answered: optionId, correct: isCorrect }
  };
  if (isCorrect) dsMark('ver:' + itemId);
  dsSave();
  if (isCorrect) dsNotifyStepDone('ver:' + itemId);
  dsRenderRoot();
}

/* ============================================================================
   COMPOSE MECHANIC (D-1: Lesson 8 & Exam)
   ============================================================================ */
function dsComposeHTML() {
  const id = dsState.activeComposeId || 'cmp-void-notice';
  const item = DS_COMPOSE_ITEMS.find(x => x.id === id) || DS_COMPOSE_ITEMS[0];
  const r = dsStore.composes[item.id];

  let feedback = '';
  if (r) {
    const rubricRows = r.results.map(crit => `
      <div style="display:flex;align-items:center;gap:10px;font-size:12.5px;margin-bottom:4px;color:${crit.pass ? '#2e7d32' : '#c62828'};">
        <span>${crit.pass ? dsIcon('check', 13) : dsIcon('x', 13)}</span>
        <span>${esc(crit.label)} ${crit.required ? '(Required)' : ''}</span>
      </div>`).join('');

    feedback = `
      <div class="ds-feedback ${r.passed ? 'correct' : 'incorrect'}">
        <b>${r.passed ? dsIcon('checkCircle') + ' Rubric Criteria Met (' + r.passedCount + '/' + r.totalCount + ')' : dsIcon('xCircle') + ' Needs Revision (' + r.passedCount + '/' + r.totalCount + ')'}</b>
        <div style="margin-top:8px;">${rubricRows}</div>
        ${r.passed && SimEngine.continueHTML ? SimEngine.continueHTML(dsFindLessonStep('compose', 'composeId', item.id)) : ''}
      </div>`;
  }

  return `
    <div class="ds-detail-back" onclick="dsGoto('dashboard')">← Back to Dashboard</div>

    <div class="ds-panel" style="margin-top:0;">
      <span class="ds-badge primary" style="font-size:11px;margin-bottom:6px;display:inline-block;">CLIENT COMMUNICATION</span>
      <h3 style="margin:0 0 12px;color:#222;font-size:17px;">${esc(item.title)}</h3>

      <div style="font-size:14px;line-height:1.7;color:#333;margin-bottom:16px;background:#f5f5f5;padding:16px 18px;border-radius:8px;border-left:4px solid var(--ds-blue);">
        ${esc(item.scenario)}
      </div>

      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:12px;font-weight:700;color:var(--ds-muted);margin-bottom:6px;text-transform:uppercase;">Draft Email Message</label>
        <textarea id="dsComposeText" rows="6" placeholder="Dear Robert,..." style="width:100%;padding:10px 12px;border:1px solid var(--ds-line);border-radius:6px;font-size:13.5px;line-height:1.6;resize:vertical;">${r ? esc(r.text) : ''}</textarea>
      </div>

      <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;">
        <button type="button" class="ds-btn primary" onclick="dsComposeGrade('${item.id}')">Submit &amp; Check Rubric &rarr;</button>
      </div>

      ${feedback}
    </div>`;
}

function dsComposeGrade(itemId) {
  const item = DS_COMPOSE_ITEMS.find(x => x.id === itemId);
  if (!item) return;
  const textarea = document.getElementById('dsComposeText');
  const text = (textarea ? textarea.value : '').toLowerCase();

  const results = item.rubric.map(crit => {
    const match = crit.keywords.some(kw => text.includes(kw.toLowerCase()));
    return { id: crit.id, label: crit.label, required: crit.required, pass: match };
  });

  const reqFailed = results.some(r => r.required && !r.pass);
  const passed = !reqFailed && text.trim().length >= 25;
  const passedCount = results.filter(r => r.pass).length;

  dsStore.composes[itemId] = {
    text: textarea ? textarea.value : '',
    passed: passed,
    results: results,
    passedCount: passedCount,
    totalCount: results.length,
    ts: Date.now()
  };

  if (passed) dsMark('cmp:' + itemId);
  dsSave();
  if (passed) dsNotifyStepDone('cmp:' + itemId);
  dsRenderRoot();
}

/* ============================================================================
   FINAL EXAM ENGINE (D-4)
   ============================================================================ */
let dsExamTimerHandle = null;

function dsAllExamBank() {
  const ext = (typeof DS_EXAM_BANK_EXT !== 'undefined') ? DS_EXAM_BANK_EXT : [];
  return DS_EXAM_BANK.concat(ext);
}

function dsExamBuild() {
  if (dsStore.exam && !dsStore.exam.submittedAt) return; // Keep active attempt
  const allBank = dsAllExamBank();
  const items = [];
  DS_EXAM_BLUEPRINT.forEach(bp => {
    const pool = allBank.filter(b => b.category === bp.category);
    const order = dsOptionOrder('exam_pool_' + bp.category, pool.length);
    for (let i = 0; i < Math.min(bp.count, pool.length); i++) {
      items.push(pool[order[i]]);
    }
  });

  dsStore.exam = {
    items: items.map(it => it.id),
    answers: {},
    startedAt: Date.now(),
    expiresAt: Date.now() + (DS_EXAM_MINUTES * 60 * 1000),
    score: 0,
    max: 0,
    submittedAt: null
  };
  dsSave();
}

function dsExamItems() {
  if (!dsStore.exam) return [];
  const allBank = dsAllExamBank();
  return dsStore.exam.items.map(id => allBank.find(b => b.id === id)).filter(Boolean);
}

function dsExamTimeLeftLabel() {
  if (!dsStore.exam || dsStore.exam.submittedAt) return 'Completed';
  const remain = Math.max(0, Math.floor((dsStore.exam.expiresAt - Date.now()) / 1000));
  if (remain <= 0 && !dsStore.exam.submittedAt) {
    setTimeout(dsExamSubmit, 10);
    return '00:00 (Time Expired)';
  }
  const m = Math.floor(remain / 60);
  const s = remain % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function dsExamScoreItem(item) {
  const ans = dsStore.exam.answers[item.id];
  if (!ans) return 0;
  if (item.type === 'decide') {
    return ans.choice === item.correct ? (item.points || 5) : 0;
  }
  if (item.type === 'triage') {
    return ans.choice === item.rightAction ? (item.points || 5) : 0;
  }
  if (item.type === 'verify') {
    return ans.choice === item.rightOptionId ? (item.points || 5) : 0;
  }
  if (item.type === 'compose') {
    const text = (ans.text || '').toLowerCase();
    const req = item.rubric.filter(r => r.required);
    const passed = req.filter(r => r.keywords.some(kw => text.includes(kw.toLowerCase()))).length;
    return req.length ? Math.round((item.points || 10) * (passed / req.length)) : 0;
  }
  return 0;
}

function dsExamSubmit() {
  if (!dsStore.exam || dsStore.exam.submittedAt) return;
  if (dsExamTimerHandle) { clearInterval(dsExamTimerHandle); dsExamTimerHandle = null; }

  const items = dsExamItems();
  let score = 0, max = 0;
  items.forEach(item => {
    const pts = item.points || 5;
    max += pts;
    score += dsExamScoreItem(item);
  });

  dsStore.exam.score = score;
  dsStore.exam.max = max;
  dsStore.exam.submittedAt = Date.now();
  dsSave();

  /* B-7: Report exam score to SCApp core */
  const su = window.SCApp && SCApp.currentUser && SCApp.currentUser();
  if (su && window.SCApp.setModeScore) {
    SCApp.setModeScore(su.id, 'docusign', 'exam', score, max);
  }

  dsGoto('dashboard');
}

function dsExamResetAttempt() {
  dsStore.exam = null;
  dsSave();
  dsExamBuild();
  dsState.examIndex = 0;
  dsRenderRoot();
}

function dsExamHTML() {
  if (!dsStore.exam || !dsStore.exam.startedAt) dsExamBuild();

  // Start timer ticking if active
  if (!dsExamTimerHandle && !dsStore.exam.submittedAt) {
    dsExamTimerHandle = setInterval(() => {
      const el = document.getElementById('dsExamClock');
      if (el) el.textContent = dsExamTimeLeftLabel();
      if (dsStore.exam && !dsStore.exam.submittedAt && Date.now() >= dsStore.exam.expiresAt) {
        dsExamSubmit();
      }
    }, 1000);
  }

  // If submitted, show result card
  if (dsStore.exam && dsStore.exam.submittedAt) {
    return dsExamResultHTML();
  }

  const items = dsExamItems();
  const i = Math.max(0, Math.min(dsState.examIndex || 0, items.length - 1));
  const item = items[i];
  if (!item) return '<p>No exam questions found.</p>';

  const ans = dsStore.exam.answers[item.id] || {};
  let body = '';

  if (item.type === 'decide') {
    const order = dsOptionOrder('exam_opt_' + item.id, item.options.length);
    const opts = order.map(origIdx => `
      <button type="button" class="ds-option ${ans.choice === origIdx ? 'selected' : ''}" onclick="dsExamSelectChoice('${item.id}', ${origIdx})" style="margin-bottom:8px;text-align:left;">
        ${esc(item.options[origIdx])}
      </button>`).join('');

    body = `
      <div style="font-size:14px;line-height:1.7;color:#333;margin-bottom:16px;background:#f5f5f5;padding:16px 18px;border-radius:8px;border-left:4px solid var(--ds-blue);">
        ${esc(item.situation)}
      </div>
      <div style="font-size:12.5px;font-weight:700;color:var(--ds-muted);text-transform:uppercase;margin-bottom:10px;">Select the best action:</div>
      <div>${opts}</div>`;
  } else if (item.type === 'triage') {
    const actions = ['resend', 'correct', 'void', 'none', 'report-phishing', 'escalate'];
    const btns = actions.map(act => `
      <button type="button" class="ds-option ${ans.choice === act ? 'selected' : ''}" onclick="dsExamSelectChoice('${item.id}', '${act}')" style="margin-bottom:8px;text-align:left;">
        <b>${esc(DS_TRIAGE_ACTION_LABELS[act])}</b>
      </button>`).join('');

    body = `
      <div style="font-size:14px;line-height:1.7;color:#333;margin-bottom:16px;background:#f5f5f5;padding:16px 18px;border-radius:8px;border-left:4px solid var(--ds-blue);">
        ${esc(item.situation)}
      </div>
      <div style="font-size:12.5px;font-weight:700;color:var(--ds-muted);text-transform:uppercase;margin-bottom:10px;">Choose triage action:</div>
      <div>${btns}</div>`;
  } else if (item.type === 'verify') {
    const docBtn = `<button type="button" class="ds-btn primary sm" onclick="SimEngine.viewDoc('${escAttr(item.doc)}','${escAttr(item.docTitle)}')">Open ${esc(item.docTitle)} &rarr;</button>`;
    const opts = item.options.map(opt => `
      <button type="button" class="ds-option ${ans.choice === opt.id ? 'selected' : ''}" onclick="dsExamSelectChoice('${item.id}', '${opt.id}')" style="margin-bottom:8px;text-align:left;">
        <b>${opt.id.toUpperCase()}.</b> ${esc(opt.text)}
      </button>`).join('');

    body = `
      <div style="background:#f0f4ff;border:1px solid #c5d8ff;border-radius:8px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <span style="font-size:13px;font-weight:600;color:#1a237e;">Inspect document audit log:</span>
        ${docBtn}
      </div>
      <div style="font-size:13px;background:#fafafa;padding:10px 14px;border:1px solid #e0e0e0;border-radius:6px;margin-bottom:14px;">
        <span style="font-size:11px;font-weight:700;color:var(--ds-muted);">RECORD LOG:</span> <b>${esc(item.systemValue)}</b>
      </div>
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">${esc(item.question)}</div>
      <div>${opts}</div>`;
  } else if (item.type === 'compose') {
    body = `
      <div style="font-size:14px;line-height:1.7;color:#333;margin-bottom:16px;background:#f5f5f5;padding:16px 18px;border-radius:8px;border-left:4px solid var(--ds-blue);">
        ${esc(item.situation)}
      </div>
      <label style="display:block;font-size:12px;font-weight:700;color:var(--ds-muted);margin-bottom:6px;text-transform:uppercase;">Draft Communication</label>
      <textarea rows="5" placeholder="Type your response here..." style="width:100%;padding:10px 12px;border:1px solid var(--ds-line);border-radius:6px;font-size:13px;" oninput="dsExamInputText('${item.id}', this.value)">${esc(ans.text || '')}</textarea>`;
  }

  const isLast = i === items.length - 1;
  const isAnswered = ans.choice !== undefined || (ans.text && ans.text.trim().length > 10);

  return `
    <div style="background:#002738;color:#fff;padding:12px 20px;border-radius:8px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <div><b>DocuSign VA Certification Exam</b> &middot; Question ${i + 1} of ${items.length}</div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:12.5px;color:#9fb4c9;">Time Remaining:</span>
        <span id="dsExamClock" class="ds-exam-clock">${dsExamTimeLeftLabel()}</span>
      </div>
    </div>

    <div class="ds-panel" style="margin-top:0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="margin:0;font-size:16px;color:#222;">${esc(item.label)}</h3>
        <span style="font-size:12px;color:var(--ds-muted);">${item.points || 5} points</span>
      </div>

      ${body}

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:16px;border-top:1px solid #eee;">
        <button type="button" class="ds-btn" ${i === 0 ? 'disabled' : ''} onclick="dsExamNav(${i - 1})">← Previous</button>
        ${isLast ?
          `<button type="button" class="ds-btn yellow" style="font-weight:800;padding:8px 22px;" onclick="dsExamSubmit()">Submit Exam ${dsIcon('arrowRight', 14)}</button>` :
          `<button type="button" class="ds-btn primary" onclick="dsExamNav(${i + 1})">Next Question &rarr;</button>`}
      </div>
    </div>`;
}

function dsExamSelectChoice(itemId, choice) {
  if (!dsStore.exam || dsStore.exam.submittedAt) return;
  dsStore.exam.answers[itemId] = { choice: choice, ts: Date.now() };
  dsSave();
  dsRenderRoot();
}

function dsExamInputText(itemId, text) {
  if (!dsStore.exam || dsStore.exam.submittedAt) return;
  dsStore.exam.answers[itemId] = { text: text, ts: Date.now() };
  dsSave();
}

function dsExamNav(index) {
  dsState.examIndex = index;
  dsRenderRoot();
}

function dsExamResultHTML() {
  const ex = dsStore.exam;
  if (!ex) return '<p>No exam data found.</p>';

  const items = dsExamItems();
  const pct = ex.max ? ex.score / ex.max : 0;
  const passed = pct >= DS_EXAM_PASS_PCT;

  const rows = items.map(item => {
    const got = dsExamScoreItem(item);
    const pts = item.points || 5;
    const isFull = got === pts;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;">
        <div>
          <span style="color:${isFull ? '#2e7d32' : got > 0 ? '#f57c00' : '#c62828'};font-weight:700;margin-right:8px;">${isFull ? dsIcon('check', 13) : got > 0 ? dsIcon('alert', 13) : dsIcon('x', 13)}</span>
          <b>${esc(item.label)}</b>
        </div>
        <div style="font-weight:700;color:${isFull ? '#2e7d32' : '#555'};">${got}/${pts} pts</div>
      </div>`;
  }).join('');

  return `
    <div class="ds-detail-back" onclick="dsGoto('dashboard')">← Back to Dashboard</div>

    <div class="ds-panel" style="margin-top:0;">
      <div style="background:${passed ? '#e8f5e9' : '#ffebee'};border:1px solid ${passed ? '#a5d6a7' : '#ffcdd2'};border-radius:8px;padding:24px;text-align:center;margin-bottom:20px;">
        <h2 style="margin:0 0 6px;color:${passed ? '#2e7d32' : '#c62828'};">${passed ? 'Passed Docusign Certification' : 'Did Not Pass — Score Below 75%'}</h2>
        <div style="font-size:24px;font-weight:800;color:#222;margin:10px 0;">${ex.score} / ${ex.max} (${Math.round(pct * 100)}%)</div>
        <p style="font-size:13px;color:var(--ds-muted);max-width:480px;margin:0 auto;">
          ${passed ? 'Congratulations! You have demonstrated high competency across DocuSign envelope configuration, routing, in-flight management, and security verification.' : 'Review the lessons and try the exam again to earn certification.'}
        </p>
        <div style="margin-top:16px;">
          <button type="button" class="ds-btn ${passed ? 'primary' : 'yellow'}" onclick="dsExamResetAttempt()">${passed ? 'Retake Exam' : 'Try Again &rarr;'}</button>
        </div>
      </div>

      <div class="ds-listhead" style="margin-top:16px;">
        <div><h4 style="margin:0;">Score Breakdown by Question</h4></div>
      </div>
      <div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
        ${rows}
      </div>
    </div>`;
}

/* ============================================================================
   LESSON INFRASTRUCTURE
   Wires DocuSign-specific step completion into the shared SimEngine.
   ============================================================================ */

/* Maps a step to its "done" status. The engine calls this for every step on
   every render, so it must be fast and side-effect-free. */
/* Returns the ACTUAL step object from the lesson currently being worked, or null. The engine
   resolves a step's position with steps.indexOf(step), which is reference equality — handing
   it a rebuilt literal always yielded -1 and silently suppressed the Continue button. */
function dsFindLessonStep(type, key, id) {
  /* 1. Try active walkthrough lesson */
  if (SimEngine.currentLesson) {
    const cl = SimEngine.currentLesson();
    if (cl && cl.steps) {
      const step = cl.steps.find(st => st.type === type && st[key] === id);
      if (step) return step;
    }
  }
  /* 2. Try dsState.lessonId */
  if (dsState.lessonId) {
    const l = SimEngine.findLesson(dsState.lessonId);
    if (l && l.steps) {
      const step = l.steps.find(st => st.type === type && st[key] === id);
      if (step) return step;
    }
  }
  /* 3. Global search across all DS_LESSONS */
  if (typeof DS_LESSONS !== 'undefined') {
    for (let i = 0; i < DS_LESSONS.length; i++) {
      const step = DS_LESSONS[i].steps.find(st => st.type === type && st[key] === id);
      if (step) return step;
    }
  }
  return null;
}
function dsLessonStepDone(step) {
  if (step.type === 'do') return !!dsStore.checklist[step.checklistId];
  if (step.type === 'decide') {
    const r = dsStore.scenarios[step.scenarioId];
    return !!(r && r.correct);
  }
  if (step.type === 'triage') {
    const r = dsStore.triages[step.triageId];
    return !!(r && r.correct);
  }
  if (step.type === 'verify') {
    const r = dsStore.reviews[step.reviewId];
    return !!(r && r.correct);
  }
  if (step.type === 'compose') {
    const r = dsStore.composes[step.composeId];
    return !!(r && r.passed);
  }
  if (step.type === 'configure') return !!dsStore.checklist['cfg:' + step.id];
  return false;
}

/* Human-readable label shown in the lesson detail's step list (D1 fix). */
function dsLessonStepLabel(step) {
  if (!step) return '';
  if (step.type === 'do') {
    if (typeof DS_CHECKLISTS !== 'undefined') {
      for (const key in DS_CHECKLISTS) {
        if (DS_CHECKLISTS[key] && Array.isArray(DS_CHECKLISTS[key].items)) {
          const it = DS_CHECKLISTS[key].items.find(i => i.id === step.checklistId);
          if (it) return it.title || it.label;
        }
      }
    }
    if (step.walk && step.walk.text) return step.walk.text;
    return step.label || step.checklistId || 'Action required';
  }
  if (step.type === 'decide') {
    const s = typeof DS_SCENARIOS !== 'undefined' && DS_SCENARIOS.find(x => x.id === step.scenarioId);
    if (s) return s.title || s.label;
    if (step.walk && step.walk.text) return step.walk.text;
    return step.label || step.scenarioId || 'Decision required';
  }
  if (step.type === 'triage') {
    const t = typeof DS_TRIAGE_ITEMS !== 'undefined' && DS_TRIAGE_ITEMS.find(x => x.id === step.triageId);
    if (t) return t.title || t.label;
    if (step.walk && step.walk.text) return step.walk.text;
    return step.label || step.triageId || 'Triage decision';
  }
  if (step.type === 'verify') {
    const v = typeof DS_VERIFY_ITEMS !== 'undefined' && DS_VERIFY_ITEMS.find(x => x.id === step.reviewId);
    if (v) return v.title || v.label;
    if (step.walk && step.walk.text) return step.walk.text;
    return step.label || step.reviewId || 'Verification required';
  }
  if (step.type === 'compose') {
    const c = typeof DS_COMPOSE_ITEMS !== 'undefined' && DS_COMPOSE_ITEMS.find(x => x.id === step.composeId);
    if (c) return c.title || c.label;
    if (step.walk && step.walk.text) return step.walk.text;
    return step.label || step.composeId || 'Draft notice';
  }
  if (step.type === 'configure') {
    if (step.walk && step.walk.text) return step.walk.text;
    return step.label || 'Configure envelope';
  }
  return step.label || (step.walk && step.walk.text) || step.id || '';
}

/* Step chip: good / bad / pending. */
function dsLessonStepStatus(step) {
  if (dsLessonStepDone(step)) return 'good';
  return 'pending';
}

/* Navigate to the correct view when a step is clicked in the lesson detail.
   Suppresses marks during navigation so the engine moving you to a view is not
   confused with the trainee navigating there by hand. */
function dsLessonStepNavigate(step) {
  dsSuppressMarks = true;
  if (step.type === 'do' && step.view)       dsGoto(step.view, step.viewArg);
  else if (step.type === 'decide')           dsGoto('scenario-detail', step.scenarioId);
  else if (step.type === 'triage')           dsGoto('triage', step.triageId);
  else if (step.type === 'verify')           dsGoto('verify', step.reviewId);
  else if (step.type === 'compose')          dsGoto('compose', step.composeId);
  else if (step.type === 'configure')        dsGoto(step.view || 'new-envelope', step.viewArg);
  else dsRenderRoot();
  dsSuppressMarks = false;
}

/* Called from dsMark() and dsAnswerScenario() when something relevant completes. */
function dsNotifyStepDone(triggerId) {
  if (!SimEngine.walkActive()) return;
  const step = SimEngine.currentStep();
  if (!step) return;

  /* Does this trigger match the current walkthrough step? */
  let match = false;
  if (step.type === 'do' && step.checklistId === triggerId) match = true;
  if (step.type === 'decide' && triggerId === 'scenario:' + step.scenarioId) match = true;
  if (step.type === 'triage' && triggerId === 'tri:' + step.triageId) match = true;
  if (step.type === 'verify' && triggerId === 'ver:' + step.reviewId) match = true;
  if (step.type === 'compose' && triggerId === 'cmp:' + step.composeId) match = true;
  if (step.type === 'configure' && triggerId === 'cfg:' + step.id) match = true;

  if (match) SimEngine.stepCompleted();
}

/* Lesson ever-complete tracking (for gating: restarting a lesson must not re-lock later ones). */
function dsLessonEverComplete(lessonId) { return !!dsStore.lessonsDone[lessonId]; }
function dsNoteLessonComplete(lessonId) {
  if (!dsStore.lessonsDone[lessonId]) {
    dsStore.lessonsDone[lessonId] = Date.now();
    dsSave();
  }
}

/* Clears one item's progress while KEEPING firstAttempt. Restarting a lesson must not be a
   way to erase a wrong first answer and re-take it clean — the honest first-try result is
   what gets reported, so it is the one thing a restart is not allowed to touch. */
function dsResetItemState(bag, id) {
  const prev = bag[id];
  if (prev && prev.firstAttempt) bag[id] = { firstAttempt: prev.firstAttempt };
  else delete bag[id];
}

/* Undoes the world-state a lesson changes, so a replay starts from the same place the first
   run did. Progress records are cleared generically by dsResetLesson; this covers the things
   that outlive them — an envelope this lesson voided or corrected, a document it uploaded,
   a reminder it logged. Without it, restarting Lesson 5 leaves ENV-6620 already voided and
   the trainee replays a lesson whose whole premise ("stop this from being signed") is gone.
   Only lessons that actually mutate something appear here. */
const DS_LESSON_UNDO = {
  'l02-prepare-send': () => {
    // The wizard send creates an envelope override and resets the draft.
    dsClearEnvelopeOverride('ENV-2026-9041');
    dsResetWizard();
  },
  'l05-triage-actions': () => {
    // Correct / resend / void performed against the triage envelopes.
    ['ENV-2026-9041', 'ENV-2026-8812', 'ENV-2026-6620', 'ENV-2026-7734'].forEach(dsClearEnvelopeOverride);
  },
  'l10-capstone-bandeja': () => {
    DS_ENVELOPES.forEach(e => dsClearEnvelopeOverride(e.id));
  }
};

/* Removes every override recorded against one envelope, returning it to its DS_ENVELOPES
   baseline. The base data is immutable by design (see the overrides layer), so this is just
   dropping the diff on top of it. */
function dsClearEnvelopeOverride(envId) {
  if (dsDemo.overrides && dsDemo.overrides[envId]) delete dsDemo.overrides[envId];
}

/* Clears one lesson so it can be run again. Note the deliberate consequence for items shared
   between lessons (the capstone reuses several of the earlier triage envelopes): clearing
   them also drops them from the other lesson's progress bar. That is honest — the item really
   was cleared — and it is safe, because unlocking reads lessonsDone, not live progress, so a
   lesson already finished stays finished and nothing downstream re-locks. */
function dsResetLesson(lessonId) {
  const l = SimEngine.findLesson(lessonId);
  if (!l) return;
  l.steps.forEach(step => {
    if (step.type === 'do' && step.checklistId) delete dsStore.checklist[step.checklistId];
    if (step.type === 'decide' && step.scenarioId) dsResetItemState(dsStore.scenarios, step.scenarioId);
    if (step.type === 'triage' && step.triageId) dsResetItemState(dsStore.triages, step.triageId);
    if (step.type === 'verify' && step.reviewId) dsResetItemState(dsStore.reviews, step.reviewId);
    if (step.type === 'compose' && step.composeId) dsResetItemState(dsStore.composes, step.composeId);
    if (step.type === 'configure') {
      delete dsStore.checklist['cfg:' + step.id];
      if (dsStore.configures) dsResetItemState(dsStore.configures, step.id);
    }
  });
  const undo = DS_LESSON_UNDO[lessonId];
  if (undo) undo();
  dsSave();
  simToast(`Lesson ${l.number} restarted — its steps are open again.`, { tone: 'good' });
}

/* ============================================================================
   SANDBOX EXTENSIONS: AUDIT TRAIL, CERTIFICATE, LIVE SIGNER, REPORTS & SETTINGS
   ============================================================================ */

/* ---------- Audit Log System ----------
   The history tab and the certificate of completion are where DocuSign most
   looks like DocuSign, and they were the least believable thing in the module:
   every envelope was seeded with the same two events, both dated 2026-08-11, so
   an NDA completed on the 2nd claimed to have been created nine days later. The
   IP was Math.random(), which meant the history literally rewrote itself every
   time the panel repainted.

   So the trail is derived, not stored. dsBuildAuditTrail(env) reconstructs it
   from the envelope itself — its creation date, its sender, its recipients and
   their individual statuses — which makes it impossible for the history to
   disagree with the envelope it belongs to. Everything is seeded off the
   envelope id, so the same envelope yields the same trail on every render.

   Events the visitor causes (a reminder, a correction, a void, a signature) are
   appended to dsDemo.auditLogs and concatenated on top, which is why they show
   up immediately and vanish on reload. */

/* One timezone for the whole account, taken from the regional settings so the
   audit trail and Settings > Regional cannot contradict each other. */
function dsAuditTz() {
  return (typeof DS_S_REGIONAL !== 'undefined' && DS_S_REGIONAL.tzAbbr) ? DS_S_REGIONAL.tzAbbr : 'CST';
}

/* ISO date + minutes-since-midnight -> "YYYY-MM-DD HH:MM:SS CST". Minutes may
   exceed a day; the date rolls forward, which is what a two-day signing gap
   needs. */
function dsAuditStamp(isoDate, minutes) {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) + minutes * 60000);
  return t.toISOString().slice(0, 19).replace('T', ' ') + ' ' + dsAuditTz();
}

function dsBuildAuditTrail(env) {
  if (!env) return [];
  const rand = (typeof dsSRand !== 'undefined') ? dsSRand('trail|' + env.id) : (() => 0.5);
  const ip = (typeof dsSOfficeIp !== 'undefined') ? dsSOfficeIp(env.id) : '10.42.1.11';
  const sender = env.sender || 'Alex Rivera (VA)';
  const out = [];

  /* Business hours: created somewhere between 09:00 and 11:00. */
  let t = 540 + Math.floor(rand() * 120);

  out.push({ timestamp: dsAuditStamp(env.createdDate, t), action: 'Envelope Created',
             actor: sender, ip: ip, details: 'Created via Docusign eSignature Web' });

  /* A draft was never sent, so its trail stops here. Anything else went out. */
  if (env.status === 'draft') return out;

  t += 2;
  out.push({ timestamp: dsAuditStamp(env.createdDate, t), action: 'Envelope Sent',
             actor: sender, ip: ip, details: 'Notification invitations dispatched to ' + (env.recipients || []).length + ' recipient(s)' });

  /* Recipients in signing order. Each one's own status decides how their part of
     the story ends, which is what stops a "completed" envelope from showing a
     recipient who never signed. */
  const recips = (env.recipients || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  recips.forEach(r => {
    const rIp = (typeof dsSOfficeIp !== 'undefined') ? dsSOfficeIp(env.id + '|' + r.email) : ip;

    t += 3 + Math.floor(rand() * 25);
    out.push({ timestamp: dsAuditStamp(env.createdDate, t), action: 'Email Delivered',
               actor: r.name, ip: '54.240.14.' + (40 + Math.floor(rand() * 60)),
               details: 'Delivered to ' + r.email });

    /* A recipient who never opened it stops at Delivered — that is exactly the
       state Lesson 5 asks the trainee to notice and chase. */
    if (r.status === 'waiting' || r.status === 'sent' || r.status === 'created') return;

    t += 60 + Math.floor(rand() * 900);
    out.push({ timestamp: dsAuditStamp(env.createdDate, t), action: 'Envelope Viewed',
               actor: r.name, ip: rIp, details: 'Opened the signing session' });

    t += 4 + Math.floor(rand() * 40);
    if (r.status === 'completed' || r.status === 'signed') {
      out.push({ timestamp: dsAuditStamp(env.createdDate, t), action: 'Signed',
                 actor: r.name, ip: rIp, details: 'Signature and required fields completed' });
    } else if (r.status === 'declined') {
      out.push({ timestamp: dsAuditStamp(env.createdDate, t), action: 'Declined to Sign',
                 actor: r.name, ip: rIp, details: env.statusNote || 'Recipient declined' });
    } else if (r.status === 'authfail') {
      out.push({ timestamp: dsAuditStamp(env.createdDate, t), action: 'Authentication Failed',
                 actor: r.name, ip: rIp, details: 'Three failed SMS authentication attempts; access blocked' });
    } else if (r.status === 'expired') {
      out.push({ timestamp: dsAuditStamp(env.createdDate, t), action: 'Access Expired',
                 actor: r.name, ip: rIp, details: 'Signing link expired before completion' });
    } else if (r.status === 'received' || r.status === 'copied') {
      out.push({ timestamp: dsAuditStamp(env.createdDate, t), action: 'Copy Received',
                 actor: r.name, ip: rIp, details: 'Received a copy; no signature required' });
    }
  });

  /* Only a genuinely finished envelope gets sealed. */
  const signers = recips.filter(r => r.action !== 'Receives a Copy');
  const allSigned = signers.length > 0 && signers.every(r => r.status === 'completed' || r.status === 'signed');
  if (env.status === 'completed' && allSigned) {
    t += 2;
    out.push({ timestamp: dsAuditStamp(env.createdDate, t), action: 'Envelope Completed',
               actor: 'Docusign eSignature', ip: '—',
               details: 'All parties signed. Certificate of completion sealed with a SHA-256 digest.' });
  }
  if (env.status === 'voided') {
    t += 30;
    out.push({ timestamp: dsAuditStamp(env.createdDate, t), action: 'Envelope Voided',
               actor: sender, ip: ip, details: env.voidReason || 'Voided by sender' });
  }
  if (env.status === 'expired') {
    out.push({ timestamp: dsAuditStamp(env.closingDate || env.createdDate, 1439), action: 'Envelope Expired',
               actor: 'Docusign eSignature', ip: '—', details: 'Expiration reached before all recipients signed' });
  }

  return out;
}

/* Records something the visitor just did. Only their own actions are stored —
   the rest of the trail is derived, so storing it would only create a second
   copy that could fall out of step. */
function dsAddAuditLog(envId, action, details) {
  if (!dsDemo.auditLogs[envId]) dsDemo.auditLogs[envId] = [];
  const now = new Date();
  const ts = now.toISOString().slice(0, 19).replace('T', ' ') + ' ' + dsAuditTz();
  dsDemo.auditLogs[envId].push({
    timestamp: ts,
    action: action,
    actor: details?.actor || ((dsDemo.user ? dsDemo.user.name : 'Alex Rivera') + ' (VA)'),
    /* Derived from the envelope, never random: an audit entry whose IP changes
       on every repaint is not an audit entry. */
    ip: details?.ip || (typeof dsSOfficeIp !== 'undefined' ? dsSOfficeIp(envId) : '10.42.1.11'),
    details: details?.text || ''
  });
}

function dsGetAuditLogs(envId) {
  const env = dsGetEnvelope(envId);
  return dsBuildAuditTrail(env).concat(dsDemo.auditLogs[envId] || []);
}

function dsOpenAuditModal(envId) {
  const env = dsGetEnvelope(envId);
  if (!env) return;
  const logs = dsGetAuditLogs(envId);

  const rows = logs.map(l => `
    <div class="ds-audit-row">
      <div class="ds-audit-time">${esc(l.timestamp)}</div>
      <div class="ds-audit-main">
        <div class="ds-audit-action">${esc(l.action)}</div>
        <div class="ds-audit-actor">User: <b>${esc(l.actor)}</b> &middot; IP: <code>${esc(l.ip)}</code></div>
        ${l.details ? `<div class="ds-audit-details">${esc(l.details)}</div>` : ''}
      </div>
    </div>`).join('');

  const modal = document.createElement('div');
  modal.id = 'dsAuditModalWrap';
  modal.className = 'ds-modal-backdrop';
  modal.innerHTML = `
    <div class="ds-modal-card">
      <div class="ds-modal-head">
        <div>
          <h3 class="ds-adopt-head-wrap">${dsIcon('history')} Envelope History &amp; Audit Trail</h3>
          <div class="ds-audit-actor">${esc(env.subject)} &middot; ${esc(env.id)}</div>
        </div>
        <button type="button" class="ds-btn ds-cert-close-btn" onclick="dsCloseAuditModal()">${dsIcon('x', 13)}</button>
      </div>
      <div class="ds-modal-body">
        <div class="ds-audit-banner">
          <b>Security Audit Record:</b> Every event in DocuSign is cryptographically timestamped with IP address and certificate hash.
        </div>
        <div>${rows}</div>
      </div>
      <div class="ds-modal-foot">
        <button type="button" class="ds-btn primary" onclick="dsCloseAuditModal()">Close History</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}
function dsCloseAuditModal() {
  const m = document.getElementById('dsAuditModalWrap');
  if (m) m.remove();
}

/* ---------- Certificate of Completion Modal ---------- */
function dsOpenCertificateModal(envId) {
  const env = dsGetEnvelope(envId);
  if (!env) return;

  const modal = document.createElement('div');
  modal.id = 'dsCertModalWrap';
  modal.className = 'ds-modal-backdrop';
  modal.innerHTML = `
    <div class="ds-modal-card ds-cert-card">
      <div class="ds-modal-head ds-cert-head">
        <div class="ds-cert-head-left">
          <span>${dsIcon('award', 20)}</span>
          <div>
            <h3 class="ds-cert-title">Certificate of Completion</h3>
            <div class="ds-cert-sub">Envelope Tracking ID: ${esc(env.id)} &middot; SHA-256 Verified</div>
          </div>
        </div>
        <button type="button" class="ds-btn ds-cert-close-btn" onclick="dsCloseCertificateModal()">${dsIcon('x', 13)}</button>
      </div>
      <div class="ds-modal-body ds-cert-body">
        <div class="ds-cert-header">
          <h2 class="ds-cert-h2">SUMMARY & AUDIT CERTIFICATE</h2>
          <div class="ds-cert-type">DocuSign Electronic Signature Custody Verification</div>
        </div>

        <table class="ds-cert-tbl">
          <tr><td class="ds-cert-th">Subject:</td><td>${esc(env.subject)}</td></tr>
          <tr><td class="ds-cert-th">Envelope Originator:</td><td>${esc(env.sender)}</td></tr>
          <tr><td class="ds-cert-th">Account:</td><td>Keller Williams Realty — Lone Star (#KW-TX-98421)</td></tr>
          <tr><td class="ds-cert-th">Status:</td><td><b class="ds-cert-status-tag">COMPLETED & SEALED</b></td></tr>
          <tr><td class="ds-cert-th">Time Zone:</td><td>(UTC-06:00) Central Time (US & Canada)</td></tr>
        </table>

        <div class="ds-cert-sec-title">Signer Events</div>
        ${(env.recipients || []).map(r => `
          <div class="ds-cert-recip-card">
            <div class="ds-cert-recip-row">
              <div>
                <b>${esc(r.name)}</b> (${esc(r.role)})<br>
                <span class="ds-cert-recip-sub">${esc(r.email)}</span>
              </div>
              <div class="ds-cert-sig-col">
                <div class="ds-sig-1 ds-sig-init">${esc(r.name)}</div>
                <div class="ds-cert-sigid">Signature ID: DS-SIG-${dsSigId(env.id, r.email)}</div>
              </div>
            </div>
            <div class="ds-audit-actor">
              <span>Security: ${r.accessCode ? 'Access Code (Verified)' : r.smsAuth ? 'SMS Authentication (Verified)' : r.idv ? 'DocuSign ID Verification (Pass)' : 'Email Verified'}</span> &middot;
              <span>IP: 192.168.1.42</span> &middot;
              <span>Disclosure Accepted: YES</span>
            </div>
          </div>`).join('')}

        <div class="ds-audit-details">
          Electronic Record and Signature Disclosure: By executing this agreement through DocuSign, all parties agree that electronic signatures have the same legal validity and enforceability as handwritten signatures pursuant to the U.S. Electronic Signatures in Global and National Commerce Act (E-SIGN) and UETA.
        </div>
      </div>
      <div class="ds-modal-foot">
        <button type="button" class="ds-btn" onclick="simToast('Downloading Certificate of Completion PDF...', { tone:'good' })">${dsIcon('download')} Download Certificate</button>
        <button type="button" class="ds-btn primary" onclick="dsCloseCertificateModal()">Close Certificate</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}
function dsCloseCertificateModal() {
  const m = document.getElementById('dsCertModalWrap');
  if (m) m.remove();
}

/* ---------- Deterministic Document Renderer (Phase A) ----------
   Generates a plausible, fully-styled HTML document for any envelope in the account.
   Uses envelope metadata (type, subject, recipients, dates, status) to generate
   coherent contract clauses, party definitions, and status-accurate signature blocks.
   Reuses the visual language of doc.css inlined in <style> so it is 100% self-contained
   and requires zero network requests. */
function dsRenderEnvelopeDocument(env, docIndex, pageNum) {
  if (!env) return '<p>Document not available.</p>';
  docIndex = docIndex || 0;
  pageNum = pageNum || 1;
  const docs = env.documents && env.documents.length ? env.documents : [{ name: (env.subject || 'Document') + '.pdf', pages: 1 }];
  const doc = docs[docIndex] || docs[0];
  const totalPages = doc.pages || 1;
  const curPage = Math.max(1, Math.min(pageNum, totalPages));

  const recips = env.recipients || [];
  const type = env.type || 'Agreement';
  const created = env.createdDate || DS_TODAY;
  const closing = env.closingDate || '2026-09-01';

  // Build parties summary
  const signers = recips.filter(r => r.action !== 'Receives a Copy');

  // Realistic clauses tailored to document type
  let clausesHTML = '';
  if (/purchase|real estate|property/i.test(type)) {
    clausesHTML = `
      <h2 class="sec">1. Parties & Property Description</h2>
      <div class="row">
        ${signers.map(r => `<div class="f"><label>${esc(r.role || 'Party')}</label><div class="v big">${esc(r.name)}</div><div class="v mono">${esc(r.email)}</div></div>`).join('')}
      </div>
      <div class="row">
        <div class="f"><label>Property / Transaction Subject</label><div class="v big">${esc(env.subject)}</div></div>
      </div>
      <h2 class="sec">2. Financial Consideration & Escrow Terms</h2>
      <p class="clause">The Buyer and Seller agree to the terms of purchase and escrow deposit as stipulated herein. Earnest money shall be deposited with the designated title and escrow officer within 3 business days of mutual execution. Final closing is scheduled for <b>${esc(closing)}</b>.</p>
      <h2 class="sec">3. Inspection, Title & Electronic Execution</h2>
      <p class="clause">This instrument is executed in accordance with the Electronic Signatures in Global and National Commerce Act. Signatures applied electronically through DocuSign eSignature are legally binding upon all parties.</p>`;
  } else if (/lease|rental/i.test(type)) {
    clausesHTML = `
      <h2 class="sec">1. Lease Parties & Demised Premises</h2>
      <div class="row">
        ${signers.map(r => `<div class="f"><label>${esc(r.role || 'Party')}</label><div class="v big">${esc(r.name)}</div><div class="v mono">${esc(r.email)}</div></div>`).join('')}
      </div>
      <div class="row">
        <div class="f"><label>Premises</label><div class="v big">${esc(env.subject)}</div></div>
      </div>
      <h2 class="sec">2. Term, Rent & Security Deposit</h2>
      <p class="clause">The lease term commences on <b>${esc(created)}</b> and extends through <b>${esc(closing)}</b>. Rent shall be payable monthly in advance. Tenant shall maintain the premises in good repair.</p>
      <h2 class="sec">3. Use, Default & Electronic Signatures</h2>
      <p class="clause">The premises shall be used exclusively for the permitted use outlined in this Agreement. All notices and electronic signatures submitted through DocuSign are recognized as binding.</p>`;
  } else if (/nda|confidential|legal/i.test(type)) {
    clausesHTML = `
      <h2 class="sec">1. Confidentiality Agreement Parties</h2>
      <div class="row">
        ${signers.map(r => `<div class="f"><label>${esc(r.role || 'Participant')}</label><div class="v big">${esc(r.name)}</div><div class="v mono">${esc(r.email)}</div></div>`).join('')}
      </div>
      <h2 class="sec">2. Scope of Confidential Information</h2>
      <p class="clause">"Confidential Information" includes all proprietary technical, business, financial, and client data disclosed by either party in connection with <b>${esc(env.subject)}</b>.</p>
      <h2 class="sec">3. Non-Disclosure & Non-Use Obligations</h2>
      <p class="clause">The receiving party agrees to hold all Confidential Information in strict confidence and prevent unauthorized disclosure. This obligation survives for a period of two (2) years from <b>${esc(created)}</b>.</p>`;
  } else if (/hr|contractor|employment|onboarding/i.test(type)) {
    clausesHTML = `
      <h2 class="sec">1. Engagement & Contractor Details</h2>
      <div class="row">
        ${signers.map(r => `<div class="f"><label>${esc(r.role || 'Contractor')}</label><div class="v big">${esc(r.name)}</div><div class="v mono">${esc(r.email)}</div></div>`).join('')}
      </div>
      <h2 class="sec">2. Services & Compensation Terms</h2>
      <p class="clause">Contractor shall perform virtual transaction coordination and administrative services as set forth under <b>${esc(env.subject)}</b>. Invoices shall be submitted semi-monthly.</p>
      <h2 class="sec">3. Work Product & Independent Status</h2>
      <p class="clause">All deliverables created during the engagement shall constitute works made for hire. Contractor operates as an independent contractor and not as an employee.</p>`;
  } else {
    clausesHTML = `
      <h2 class="sec">1. Agreement Scope & Designated Parties</h2>
      <div class="row">
        ${signers.map(r => `<div class="f"><label>${esc(r.role || 'Party')}</label><div class="v big">${esc(r.name)}</div><div class="v mono">${esc(r.email)}</div></div>`).join('')}
      </div>
      <div class="row">
        <div class="f"><label>Agreement Reference</label><div class="v big">${esc(env.subject)}</div></div>
      </div>
      <h2 class="sec">2. Terms, Conditions & Deliverables</h2>
      <p class="clause">The undersigned parties agree to perform the duties and obligations stipulated in this instrument. Effective as of <b>${esc(created)}</b> with target completion on <b>${esc(closing)}</b>.</p>
      <h2 class="sec">3. Execution & Authorization</h2>
      <p class="clause">Mutual electronic signatures transmitted via DocuSign eSignature constitute valid and enforceable execution of this instrument.</p>`;
  }

  // Signature Blocks
  const sigBlocksHTML = `
    <h2 class="sec">4. Execution & Signatures</h2>
    <div class="sigrow">
      ${signers.map(r => {
        const isSigned = r.status === 'completed' || r.status === 'signed';
        const isVoided = env.status === 'voided' || r.status === 'voided';
        const isExpired = env.status === 'expired' || r.status === 'expired';
        return `
          <div class="sig">
            <div class="line" style="${isSigned ? 'color:#002738;font-style:italic;' : 'color:#999;font-style:normal;font-size:12px;'}">
              ${isSigned ? '/s/ ' + esc(r.name) : (isVoided ? '[ VOIDED ]' : (isExpired ? '[ EXPIRED ]' : '[ Pending Signature ]'))}
            </div>
            <label>${esc(r.role || 'Signer')} &mdash; ${esc(r.name)} &middot; ${isSigned ? 'Signed: ' + esc(env.createdDate || DS_TODAY) : esc(r.status || 'waiting')}</label>
          </div>`;
      }).join('')}
    </div>`;

  // Doc switcher / page switcher header
  const docNavHTML = docs.length > 1 || totalPages > 1 ? `
    <div class="doc-nav-bar">
      ${docs.length > 1 ? `
        <div class="doc-tabs">
          ${docs.map((d, i) => `
            <button type="button" class="doc-tab-btn ${i === docIndex ? 'active' : ''}" onclick="parent.dsViewEnvelopeDoc('${escAttr(env.id)}', ${i}, 1)">
              ${esc(d.name)}
            </button>`).join('')}
        </div>` : ''}
      ${totalPages > 1 ? `
        <div class="page-pager">
          <button type="button" class="page-btn" ${curPage <= 1 ? 'disabled' : ''} onclick="parent.dsViewEnvelopeDoc('${escAttr(env.id)}', ${docIndex}, ${curPage - 1})">&larr; Prev Page</button>
          <span class="page-count">Page ${curPage} of ${totalPages}</span>
          <button type="button" class="page-btn" ${curPage >= totalPages ? 'disabled' : ''} onclick="parent.dsViewEnvelopeDoc('${escAttr(env.id)}', ${docIndex}, ${curPage + 1})">Next Page &rarr;</button>
        </div>` : ''}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(doc.name || env.subject)}</title>
  <style>
    :root { --ink: #24262b; --muted: #6e727c; --line: #d8dbe0; --green: #1c6b43; --blue: #0066cc; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e9ebee; font-family: Georgia, 'Times New Roman', Times, serif; color: var(--ink); padding: 24px 16px; }
    .banner { max-width: 760px; margin: 0 auto 12px; background: #fdf6e8; border-left: 4px solid #d9a441; color: #6b4c0f; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; padding: 8px 14px; border-radius: 0 6px 6px 0; }
    .doc-nav-bar { max-width: 760px; margin: 0 auto 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; flex-wrap: wrap; }
    .doc-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
    .doc-tab-btn { background: #fff; border: 1px solid #ccc; border-radius: 4px; padding: 4px 10px; font-size: 12px; cursor: pointer; font-family: inherit; font-weight: 600; color: #333; }
    .doc-tab-btn.active { background: #0066cc; color: #fff; border-color: #0066cc; }
    .page-pager { display: flex; align-items: center; gap: 8px; margin-left: auto; }
    .page-btn { background: #fff; border: 1px solid #ccc; border-radius: 4px; padding: 4px 8px; font-size: 11.5px; cursor: pointer; font-family: inherit; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-count { font-weight: 600; color: #555; }
    .paper { max-width: 760px; margin: 0 auto; background: #fff; padding: 44px 52px; box-shadow: 0 8px 30px rgba(20, 25, 22, .15); line-height: 1.6; }
    .letterhead { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--ink); padding-bottom: 14px; margin-bottom: 24px; }
    .letterhead h1 { font-size: 18px; margin: 0 0 4px; letter-spacing: .3px; }
    .letterhead .sub { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .6px; }
    .letterhead .ref { text-align: right; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: var(--muted); }
    .letterhead .ref b { display: block; color: var(--ink); font-size: 13px; }
    h2.sec { font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-transform: uppercase; letter-spacing: .6px; color: var(--blue); border-bottom: 1px solid var(--line); padding-bottom: 6px; margin: 24px 0 12px; }
    .row { display: flex; gap: 20px; margin-bottom: 10px; flex-wrap: wrap; }
    .row .f { flex: 1; min-width: 160px; }
    .row .f label { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted); margin-bottom: 2px; }
    .row .f .v { font-size: 14px; }
    .row .f .v.big { font-weight: 700; font-size: 15px; }
    .row .f .v.mono { font-family: Consolas, monospace; font-size: 12px; color: #555; }
    p.clause { font-size: 13.5px; margin: 0 0 12px; }
    .sigrow { display: flex; gap: 24px; margin-top: 16px; flex-wrap: wrap; }
    .sig { flex: 1; min-width: 180px; }
    .sig .line { border-bottom: 1px solid var(--ink); height: 32px; font-family: 'Brush Script MT', cursive, sans-serif; font-size: 19px; padding-top: 4px; }
    .sig label { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; color: var(--muted); margin-top: 6px; }
    .foot { margin-top: 28px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; color: var(--muted); }
  </style>
</head>
<body>
  <div class="banner">Official DocuSign Test Drive Document &middot; ${esc(env.id)} &middot; Page ${curPage} of ${totalPages}</div>
  ${docNavHTML}
  <div class="paper">
    <div class="letterhead">
      <div>
        <h1>${esc(doc.name.replace(/\.pdf$/i, '').replace(/_/g, ' '))}</h1>
        <div class="sub">${esc(type)} &middot; DocuSign eSignature Package</div>
      </div>
      <div class="ref"><b>${esc(env.id)}</b>Date: ${esc(created)}</div>
    </div>
    ${clausesHTML}
    ${sigBlocksHTML}
    <div class="foot">Generated for SkillCloud Academy DocuSign Training &middot; Envelope ID: ${esc(env.id)}</div>
  </div>
</body>
</html>`;
}

function dsViewEnvelopeDoc(envId, docIndex, pageNum) {
  const env = dsGetEnvelope(envId);
  if (!env) {
    simToast('Envelope not found.');
    return;
  }
  docIndex = docIndex || 0;
  pageNum = pageNum || 1;

  /* Two hard-coded branches used to live here, serving a single-page HTML file
     for ENV-2026-9041 and ENV-2026-8812 and returning early. Both discarded
     docIndex and pageNum, so ENV-2026-9041 — which carries two documents and
     nine pages — opened as one page with no navigation and no way to reach the
     Property Disclosure at all. The generic path below already handles multiple
     documents and real paging, so the special cases were removed rather than
     repaired. */

  const doc = (env.documents && env.documents[docIndex]) ? env.documents[docIndex] : { name: env.subject };
  const docName = doc.name || env.subject;

  /* An uploaded document was never read — only its name was. It used to refuse
     to open at all, which contradicted the wizard, where the same file does get
     blank stand-in sheets to place fields on. Same sheets here, so the two views
     tell the same story, and the banner inside them says what they are. */
  if (doc.uploaded) {
    SimEngine.viewDoc('about:blank', docName);
    const upFrame = document.getElementById('simDocFrame');
    if (upFrame) {
      upFrame.removeAttribute('data-ds-doc');
      /* Same fields as any other document. Placing a signature on a blank sheet
         and then finding the sent envelope empty would undo the whole point of
         giving uploads pages in the first place. */
      upFrame.onload = () => {
        let ud;
        try { ud = upFrame.contentDocument; } catch (e) { return; }
        if (ud && ud.body) dsPaintViewerFields(ud, env, docIndex);
      };
      upFrame.srcdoc = dsBlankDocHTML(docName, doc.pages || DS_UPLOAD_BLANK_PAGES);
    }
    return;
  }

  /* A document with a DS_DOC_LIBRARY entry has a real body on disk, so show that
     instead of generating one. Everything else keeps the synthetic renderer —
     the NDA, the listing agreement and the buyer representation have no file. */
  const lib = dsDocFromLibrary(docName);
  if (lib) { dsViewLibraryDoc(env, docIndex, pageNum, lib); return; }

  const html = dsRenderEnvelopeDocument(env, docIndex, pageNum);
  SimEngine.viewDoc('about:blank', docName);
  const frame = document.getElementById('simDocFrame');
  if (frame) frame.srcdoc = html;
}

/* ---------- Library documents ----------
   Loaded into the viewer frame by src, not read in and re-emitted. An iframe
   navigation is not fetch/XHR/WebSocket, so the module keeps its zero-network
   invariant, and it is the same mechanism SimEngine.viewDoc has always used.

   The synthetic renderer builds its page bar into its own markup. Here the file
   on disk knows nothing about envelopes, so the bar is injected after load.
   Both paths end up presenting the same chrome. The frame is same-origin, so
   contentDocument is reachable without a request. */
function dsViewLibraryDoc(env, docIndex, pageNum, lib) {
  const frame = document.getElementById('simDocFrame');
  const already = frame && frame.getAttribute('data-ds-doc') === lib.id;

  SimEngine.viewDoc(lib.path, lib.title || lib.name);
  if (!frame) return;
  frame.setAttribute('data-ds-doc', lib.id);

  const run = () => dsDecorateLibraryDoc(frame, env, docIndex, pageNum, lib);

  /* onload is reassigned every time, deliberately. Re-pointing src at the file
     already loaded makes the browser reload it, and that reload fires whatever
     handler is registered — so a handler left over from the previous call would
     redecorate with that call's page number and undo this one. Assigning the
     fresh closure first means the reload lands on the right page.

     run() is also called directly for the case where the browser serves the
     same src without a reload and no load event ever arrives. Decorating twice
     is harmless: the decorator removes the previous bar before building one. */
  frame.onload = run;
  if (already) run();
}

function dsDecorateLibraryDoc(frame, env, docIndex, pageNum, lib) {
  let d;
  try { d = frame.contentDocument; } catch (e) { return; }
  if (!d || !d.body) return;

  const docs  = (env.documents && env.documents.length) ? env.documents : [{ name: lib.name, pages: lib.pages }];
  const total = lib.pages || 1;
  const cur   = Math.max(1, Math.min(pageNum || 1, total));

  /* Rebuilt on every call so the counter never goes stale. */
  const prev = d.getElementById('dsDocNav');
  if (prev) prev.remove();

  const bar = d.createElement('div');
  bar.id = 'dsDocNav';
  bar.setAttribute('style',
    'position:sticky;top:0;z-index:20;display:flex;align-items:center;' +
    'justify-content:space-between;gap:16px;flex-wrap:wrap;' +
    'background:#fff;border-bottom:1px solid #d8dbe0;padding:10px 18px;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
    'font-size:12.5px;box-shadow:0 2px 8px rgba(20,25,22,.08);margin-bottom:18px;');

  const tabs = d.createElement('div');
  tabs.setAttribute('style', 'display:flex;gap:6px;flex-wrap:wrap;');
  docs.forEach((dd, i) => {
    const b = d.createElement('button');
    b.type = 'button';
    b.textContent = dd.name;
    b.setAttribute('style',
      'border:1px solid ' + (i === docIndex ? '#260559' : '#ccc') + ';' +
      'background:' + (i === docIndex ? '#260559' : '#fff') + ';' +
      'color:' + (i === docIndex ? '#fff' : '#24262b') + ';' +
      'border-radius:4px;padding:5px 10px;font-size:11.5px;cursor:pointer;font-family:inherit;');
    b.addEventListener('click', () => dsViewEnvelopeDoc(env.id, i, 1));
    tabs.appendChild(b);
  });

  const pager = d.createElement('div');
  pager.setAttribute('style', 'display:flex;align-items:center;gap:10px;');
  const mkBtn = (label, page, disabled) => {
    const b = d.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.disabled = !!disabled;
    b.setAttribute('style',
      'background:#fff;border:1px solid #ccc;border-radius:4px;padding:4px 8px;' +
      'font-size:11.5px;font-family:inherit;cursor:' + (disabled ? 'not-allowed' : 'pointer') + ';' +
      'opacity:' + (disabled ? '.4' : '1') + ';');
    if (!disabled) b.addEventListener('click', () => dsViewEnvelopeDoc(env.id, docIndex, page));
    return b;
  };
  const count = d.createElement('span');
  count.setAttribute('style', 'font-weight:600;color:#555;');
  count.textContent = 'Page ' + cur + ' of ' + total;

  pager.appendChild(mkBtn('← Prev Page', cur - 1, cur <= 1));
  pager.appendChild(count);
  pager.appendChild(mkBtn('Next Page →', cur + 1, cur >= total));

  if (docs.length > 1) bar.appendChild(tabs);
  bar.appendChild(pager);
  d.body.insertBefore(bar, d.body.firstChild);

  dsPaintViewerFields(d, env, docIndex);

  const target = d.querySelector('[data-page="' + cur + '"]');
  if (target && target.scrollIntoView) target.scrollIntoView({ block: 'start' });
}

/* The fields, on the document, read-only.

   The viewer used to show the pages and nothing else, so an envelope you had
   just built with signature fields opened looking untouched — there was no way
   to see where anyone was meant to sign. These are the same coordinates the
   sender placed, in the same recipient colours, which is the whole point: what
   you positioned in step 3 is what the document carries.

   Two states. A field still waiting shows a dashed outline with whose it is; a
   field already completed shows its value, because after signing the document
   should read as signed rather than as a form. */
/* dsFieldLabel() builds labels like "Gerald Signature", and the viewer already
   names the recipient beside the box — so it read "Gerald — Gerald Signature".
   Trim the leading name when it is there, leave a hand-written label alone. */
function dsFieldShortLabel(f, who) {
  const label = (f.label || f.type || '').trim();
  const name = (who || '').trim();
  if (name && label.toLowerCase().indexOf(name.toLowerCase()) === 0) {
    const rest = label.slice(name.length).trim();
    if (rest) return rest;
  }
  return label || f.type;
}

function dsPaintViewerFields(d, env, docIndex) {
  const fields = (env.fields || []).filter(f => (f.docIndex || 0) === (docIndex || 0));
  if (!fields.length) return;
  const recs = env.recipients || [];

  Array.from(d.querySelectorAll('.dsview-field')).forEach(n => n.remove());

  fields.forEach(f => {
    const page = d.querySelector('[data-page="' + (f.page || 1) + '"]');
    if (!page) return;
    if (d.defaultView.getComputedStyle(page).position === 'static') page.style.position = 'relative';

    const ri = recs.findIndex(r => r.id === f.recipientId);
    const color = DS_RECIP_COLORS[(ri < 0 ? 0 : ri) % DS_RECIP_COLORS.length];
    const who = (recs[ri] && recs[ri].name) || 'Recipient';
    const done = f.value != null && f.value !== '';

    const box = d.createElement('div');
    box.className = 'dsview-field';
    const base =
      'position:absolute;left:' + (f.x == null ? 16 : f.x) + '%;top:' + (f.y == null ? 22 : f.y) + '%;' +
      'min-width:150px;padding:7px 10px;border-radius:3px;z-index:4;';

    if (done) {
      box.textContent = f.value;
      box.setAttribute('style', base +
        'background:rgba(255,255,255,.94);border-bottom:2px solid ' + color + ';color:#111;' +
        'font:italic 600 15px/1.2 "Brush Script MT",cursive,serif;');
    } else {
      box.textContent = who + ' — ' + dsFieldShortLabel(f, who);
      box.setAttribute('style', base +
        'background:' + color + '1f;border:1.5px dashed ' + color + ';color:' + color + ';' +
        'font:600 11px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;');
    }
    page.appendChild(box);
  });
}


function dsViewTemplateDoc(tmplId, docIndex) {
  const tmpl = dsAllTemplates().find(t => t.id === tmplId);
  if (!tmpl) {
    simToast('Template not found.');
    return;
  }
  docIndex = docIndex || 0;
  const pseudoEnv = {
    id: tmpl.id,
    subject: tmpl.name,
    type: tmpl.category || 'Template',
    createdDate: DS_TODAY,
    closingDate: '2026-09-01',
    sender: 'Alex Rivera (VA)',
    status: 'draft',
    documents: Array.from({ length: tmpl.documentsCount || 1 }, (_, i) => ({
      name: `${tmpl.name}${tmpl.documentsCount > 1 ? ' — Part ' + (i + 1) : ''}.pdf`,
      pages: 2
    })),
    recipients: (tmpl.recipients || []).map((r, i) => ({
      id: 'tr' + i,
      name: r,
      role: r,
      action: r.includes('CC') ? 'Receives a Copy' : 'Needs to Sign',
      status: 'pending'
    }))
  };
  const docName = pseudoEnv.documents[docIndex].name;
  const html = dsRenderEnvelopeDocument(pseudoEnv, docIndex, 1);
  SimEngine.viewDoc('about:blank', docName);
  const frame = document.getElementById('simDocFrame');
  if (frame) frame.srcdoc = html;
}

/* ---------- Live Signer Experience Flow ---------- */
/* ---------- Live Signer Experience Flow (Phase E) ---------- */
function dsSimulateSigner(envId) {
  const env = dsGetEnvelope(envId);
  if (!env) return;
  const pendingRecip = (env.recipients || []).find(r => r.status !== 'completed' && r.status !== 'signed' && r.action !== 'Receives a Copy') || env.recipients[0];
  dsState.signerEnvId = envId;
  dsState.signerRecipId = pendingRecip ? pendingRecip.id : 'r1';
  dsState.signerStyleIdx = 0;
  dsState.signerDocIdx = 0;
  dsState.signerOtherOpen = false;
  dsState.signerAttempts = 0;
  dsState.signerAdoptTab = 'style';
  dsState.signerDrawnData = null;

  // Check Access Code requirement
  if (pendingRecip && pendingRecip.accessCode && !dsState.signerUnlocked) {
    dsState.signerStep = 'auth_gate';
  } else {
    dsState.signerStep = 'consent';
  }

  dsGoto('signer-experience');
}

function dsToggleSignerOtherMenu(ev) {
  if (ev) ev.stopPropagation();
  dsState.signerOtherOpen = !dsState.signerOtherOpen;
  const dd = document.getElementById('dsSignerOtherDropdown');
  if (dd) dd.classList.toggle('open', dsState.signerOtherOpen);
}

function dsSignerFinishLater() {
  simToast('Your signing session has been saved. You can resume at any time from your email invitation.', { tone: 'good', duration: 4500 });
  dsGoto('envelopes');
}

function dsOpenDeclineModal() {
  dsState.signerOtherOpen = false;
  const modal = document.createElement('div');
  modal.id = 'dsDeclineModalWrap';
  modal.className = 'ds-modal-backdrop';
  modal.innerHTML = `
    <div class="ds-modal-card ds-role-match-card">
      <div class="ds-modal-head">
        <div>
          <h3 class="ds-adopt-head-wrap" style="color:var(--ds24-red);">${dsIcon('ban')} Decline to Sign</h3>
          <div class="ds-audit-actor">This will void the envelope for all parties and record your reason in the audit trail</div>
        </div>
        <button type="button" class="ds-btn ds-cert-close-btn" onclick="document.getElementById('dsDeclineModalWrap').remove()">${dsIcon('x', 13)}</button>
      </div>
      <div class="ds-modal-body">
        <label class="ds-corr-label" for="dsDeclineReasonInput">Reason for declining (required, min. 10 characters):</label>
        <textarea id="dsDeclineReasonInput" rows="3" class="ds-wiz-input" placeholder="e.g. Terms do not match the verbal agreement regarding closing costs." oninput="dsOnDeclineInput()"></textarea>
        <span class="ds-wiz-count" id="dsDeclineHint">10 characters minimum</span>
      </div>
      <div class="ds-modal-foot">
        <button type="button" class="ds-btn" onclick="document.getElementById('dsDeclineModalWrap').remove()">Cancel</button>
        <button type="button" class="ds-btn danger-solid" id="dsBtnConfirmDecline" disabled onclick="dsSubmitDeclineReason()">Decline Agreement</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function dsOnDeclineInput() {
  const ta = document.getElementById('dsDeclineReasonInput');
  const btn = document.getElementById('dsBtnConfirmDecline');
  const hint = document.getElementById('dsDeclineHint');
  if (!ta || !btn) return;
  const n = ta.value.trim().length;
  btn.disabled = n < 10;
  if (hint) hint.textContent = n < 10 ? `${10 - n} more characters required` : 'Reason will be transmitted to sender';
}

function dsSubmitDeclineReason() {
  const reason = (document.getElementById('dsDeclineReasonInput') || {}).value || '';
  if (reason.trim().length < 10) return;

  const envId = dsState.signerEnvId;
  const recipId = dsState.signerRecipId;
  const env = dsGetEnvelope(envId);
  const m = document.getElementById('dsDeclineModalWrap');
  if (m) m.remove();

  if (env) {
    const recip = (env.recipients || []).find(r => r.id === recipId) || { name: 'Signer', role: 'Signer' };
    const updated = (env.recipients || []).map(r => {
      if (r.id === recipId) return Object.assign({}, r, { status: 'voided' });
      return r;
    });
    dsSetEnvelopeOverride(envId, { status: 'declined', recipients: updated, declineReason: reason.trim() });
    dsAddAuditLog(envId, 'Signer Declined to Sign', { actor: `${recip.name} (${recip.role})`, text: reason.trim() });

    if (typeof dsAddLiveEmail === 'function') {
      dsAddLiveEmail({
        type: 'declined',
        envId: envId,
        subject: env.subject,
        reason: reason.trim()
      });
    }
  }

  simToast('You declined to sign. Envelope voided and sender notified.', { tone: 'good', duration: 4500 });
  dsGoto('envelopes');
}

function dsSubmitAccessCode() {
  const env = dsGetEnvelope(dsState.signerEnvId);
  const recip = (env && env.recipients) ? env.recipients.find(r => r.id === dsState.signerRecipId) : null;
  const input = document.getElementById('dsAccessCodeAttempt');
  const val = input ? input.value.trim() : '';

  if (!recip || !recip.accessCode) {
    dsState.signerUnlocked = true;
    dsState.signerStep = 'consent';
    dsRenderRoot();
    return;
  }

  if (val === recip.accessCode) {
    dsState.signerUnlocked = true;
    dsState.signerStep = 'consent';
    simToast('Access Code verified! Welcome to DocuSign.', { tone: 'good' });
    dsRenderRoot();
  } else {
    dsState.signerAttempts = (dsState.signerAttempts || 0) + 1;
    const remaining = 3 - dsState.signerAttempts;
    if (remaining > 0) {
      simToast(`Incorrect Access Code. ${remaining} attempt(s) remaining before lockout.`, { tone: 'bad', duration: 4000 });
      if (input) { input.value = ''; input.focus(); }
      dsRenderRoot();
    } else {
      // 3rd attempt lockout
      dsState.signerStep = 'auth_lockout';
      if (env) {
        const updated = (env.recipients || []).map(r => {
          if (r.id === recip.id) return Object.assign({}, r, { status: 'authfail' });
          return r;
        });
        dsSetEnvelopeOverride(env.id, { status: 'authfail', recipients: updated });
        dsAddAuditLog(env.id, 'Authentication Lockout', { actor: `${recip.name} (${recip.role})`, text: 'Exceeded 3 failed Access Code attempts. Access revoked.' });

        if (typeof dsAddLiveEmail === 'function') {
          dsAddLiveEmail({
            type: 'security',
            envId: env.id,
            subject: 'Security Alert: Access Code Lockout on ' + env.id,
            reason: '3 failed Access Code attempts'
          });
        }
      }
      simToast('Access Code lockout triggered. Envelope locked.', { tone: 'bad', duration: 5000 });
      dsRenderRoot();
    }
  }
}

function dsSignerExperienceHTML() {
  const env = dsGetEnvelope(dsState.signerEnvId);
  if (!env) return `<div class="ds-panel"><p class="ds-empty-p">Envelope not found.</p><button class="ds-btn" onclick="dsGoto('envelopes')">Back</button></div>`;

  const recips = env.recipients || [];
  const recip = recips.find(r => r.id === dsState.signerRecipId) || recips[0] || { id: 'r1', name: 'Recipient', role: 'Signer' };
  const step = dsState.signerStep || 'consent';

  /* Access Code Gate Screen */
  if (step === 'auth_gate') {
    return `
      <div class="ds-signer-shell" style="display:flex;align-items:center;justify-content:center;min-height:80vh;">
        <div class="ds-auth-gate-card">
          <img src="Images-resources/OIP.webp" alt="DocuSign" style="height:28px;margin-bottom:16px;">
          <h2 style="font-size:18px;margin:0 0 8px;color:var(--ds24-ink);">${dsIcon('lock', 16)} Access Code Authentication</h2>
          <p style="font-size:13px;color:var(--ds24-muted);line-height:1.5;margin:0 0 16px;">
            The sender has protected this agreement with an Access Code. Please enter the code provided to you by <b>${esc(env.sender)}</b>.
          </p>
          <input type="password" id="dsAccessCodeAttempt" class="ds-auth-gate-input" placeholder="Enter Access Code" autofocus
                 onkeydown="if(event.key==='Enter')dsSubmitAccessCode()">
          <div style="font-size:12px;color:var(--ds24-muted);margin-bottom:18px;">
            Attempts remaining: <b>${3 - (dsState.signerAttempts || 0)}</b> of 3
          </div>
          <div style="display:flex;gap:10px;justify-content:center;">
            <button type="button" class="ds-btn" onclick="dsGoto('envelopes')">Cancel</button>
            <button type="button" class="ds-btn primary" onclick="dsSubmitAccessCode()">Validate &amp; Open Document →</button>
          </div>
        </div>
      </div>`;
  }

  /* Lockout Screen */
  if (step === 'auth_lockout') {
    return `
      <div class="ds-signer-shell" style="display:flex;align-items:center;justify-content:center;min-height:80vh;">
        <div class="ds-auth-gate-card" style="border:2px solid var(--ds24-red);">
          <div style="color:var(--ds24-red);margin-bottom:12px;">${dsIcon('ban', 36)}</div>
          <h2 style="font-size:18px;margin:0 0 8px;color:#8a1c1c;">Authentication Lockout Triggered</h2>
          <p style="font-size:13px;color:var(--ds24-muted);line-height:1.5;margin:0 0 18px;">
            You have entered an incorrect access code 3 consecutive times. To protect the security of this transaction, access to envelope <b>${esc(env.id)}</b> has been locked.
          </p>
          <div class="ds-box-tip" style="text-align:left;margin-bottom:20px;">
            ${dsIcon('bulb', 14)} <b>What to do next:</b> Contact the envelope originator (<b>${esc(env.sender)}</b>) to unlock your access using the "Correct Envelope" workflow.
          </div>
          <button type="button" class="ds-btn primary" onclick="dsGoto('envelopes')">Return to Agreements</button>
        </div>
      </div>`;
  }

  const signed = recip.status === 'signed' || recip.status === 'completed';
  const docs = env.documents && env.documents.length ? env.documents : [{ name: env.subject + '.pdf', pages: 1 }];
  const docIdx = dsState.signerDocIdx || 0;
  const currentDoc = docs[docIdx] || docs[0];

  const sigStyleFont = 'ds-sig-' + ((dsState.signerStyleIdx || 0) + 1);
  const signers = recips.filter(r => r.action !== 'Receives a Copy');

  const type = env.type || 'Agreement';
  const created = env.createdDate || DS_TODAY;
  const closing = env.closingDate || '2026-09-01';

  let clausesHTML = `
    <p class="ds-signer-doc-body">
      This Agreement sets forth the complete terms and mutual covenants between the undersigned parties regarding:
      <br><b class="ds-doc-text-bold">${esc(env.subject)}</b>
    </p>
    <p class="ds-signer-doc-clause">
      <b>Section 2. Terms &amp; Execution:</b> Effective as of ${esc(created)} with completion target on or before ${esc(closing)}. Signatures affixed via DocuSign constitute binding execution.
    </p>`;

  if (/purchase|real estate|property/i.test(type)) {
    clausesHTML = `
      <p class="ds-signer-doc-body">
        This Purchase and Sale Agreement is made and entered into by and between the designated parties. Buyer agrees to purchase and Seller agrees to sell the real property described as:
        <br><b class="ds-doc-text-bold">${esc(env.subject)}</b>
      </p>
      <p class="ds-signer-doc-clause">
        <b>Section 4. Closing &amp; Electronic Execution:</b> Closing will take place on or before ${esc(closing)}. Title shall be conveyed free and clear of all liens. Signatures applied electronically through DocuSign eSignature are legally binding upon all parties.
      </p>`;
  } else if (/lease|rental/i.test(type)) {
    clausesHTML = `
      <p class="ds-signer-doc-body">
        This Lease Agreement is executed by and between the Landlord and Tenant regarding the premises located at:
        <br><b class="ds-doc-text-bold">${esc(env.subject)}</b>
      </p>
      <p class="ds-signer-doc-clause">
        <b>Section 2. Term &amp; Execution:</b> The term commences on ${esc(created)} and terminates on ${esc(closing)}. The parties agree that electronic records and signatures executed herein are valid and enforceable.
      </p>`;
  }

  return `
    <div class="ds-signer-shell" onclick="if(dsState.signerOtherOpen){dsState.signerOtherOpen=false;document.getElementById('dsSignerOtherDropdown')?.classList.remove('open');}">
      <!-- Black DocuSign Topbar -->
      <div class="ds-signer-topbar">
        <div class="ds-signer-topbar-left">
          <img src="Images-resources/OIP.webp" alt="DocuSign" class="ds-signer-logo">
          <span class="ds-signer-user-tag">Reviewing as: <b class="ds-signer-user-name">${esc(recip.name)}</b> (${esc(recip.role)})</span>
        </div>
        <div class="ds-signer-topbar-actions">
          ${signed ? `
            <button type="button" class="ds-btn yellow ds-signer-finish-btn" onclick="dsFinishSigning()">FINISH ${dsIcon('check', 13)}</button>
          ` : `
            <div class="ds-signer-other-wrap">
              <button type="button" class="ds-btn ds-signer-sub-btn" onclick="dsToggleSignerOtherMenu(event)">Other Actions ${dsIcon('caret', 12)}</button>
              <div class="ds-signer-other-dd" id="dsSignerOtherDropdown">
                <button type="button" onclick="dsOpenDeclineModal()">${dsIcon('ban', 13)} Decline to Sign</button>
                <button type="button" onclick="dsSignerFinishLater()">${dsIcon('clock', 13)} Finish Later</button>
                <button type="button" onclick="dsOpenAuditModal('${escAttr(env.id)}')">${dsIcon('history', 13)} View History</button>
              </div>
            </div>
          `}
          <button type="button" class="ds-btn ds-signer-exit-btn" onclick="dsGoto('envelopes')">Exit Signing</button>
        </div>
      </div>

      <!-- Yellow Consent Banner -->
      ${step === 'consent' ? `
        <div class="ds-signer-banner">
          <div class="ds-signer-banner-inner">
            <input type="checkbox" id="chkConsent" class="ds-signer-chk" checked>
            <label for="chkConsent" class="ds-signer-chk-label">I agree to use electronic records and signatures for <b>${esc(env.subject)}</b>.</label>
          </div>
          <button type="button" class="ds-btn primary ds-signer-cta" onclick="dsSignerConsentContinue()">CONTINUE &rarr;</button>
        </div>
      ` : ''}

      <!-- Main Signer Document Area -->
      <div class="ds-signer-body">
        ${docs.length > 1 ? `
          <div class="doc-tabs ds-signer-doc-tabs">
            ${docs.map((d, i) => `
              <button type="button" class="doc-tab-btn ${i === docIdx ? 'active' : ''}" onclick="dsSetSignerDoc(${i})">${esc(d.name)}</button>
            `).join('')}
          </div>
        ` : ''}

        <div class="ds-signer-doc">
          ${!signed ? `
            <div class="ds-start-marker" onclick="document.getElementById('dsSignAnchorTarget')?.scrollIntoView({behavior:'smooth'}); dsOpenAdoptModal(event)">
              START ${dsIcon('caret', 12)}
            </div>
          ` : ''}

          <div class="ds-signer-doc-head">
            <h2 class="ds-signer-doc-title">${esc(currentDoc.name.replace(/\.pdf$/i, '').replace(/_/g, ' '))}</h2>
            <div class="ds-signer-doc-sub">DocuSign Official Execution Copy &middot; ${esc(env.id)}</div>
          </div>

          ${clausesHTML}

          <div class="ds-signer-sig-grid">
            ${signers.map(r => {
              const isCurrent = r.id === recip.id;
              const isSigned = r.status === 'signed' || r.status === 'completed';
              return `
                <div class="ds-signer-sig-col" ${isCurrent ? 'id="dsSignAnchorTarget"' : ''}>
                  <div class="ds-signer-sig-title">${esc(r.role || 'Signer')} (${esc(r.name)})</div>
                  <div class="ds-signer-sig-holder">
                    ${isCurrent ? (
                      signed ? (
                        dsState.signerDrawnData
                           ? `<img src="${dsState.signerDrawnData}" alt="Drawn signature" style="max-height:48px;">`
                          : `<span class="ds-signed-stamp ${sigStyleFont}">${esc(recip.name)}</span>`
                      ) : `<button type="button" class="ds-sign-anchor" id="dsSignAnchorBtn" onclick="dsOpenAdoptModal(event)">${dsIcon('pen', 14)} SIGN HERE</button>`
                    ) : (
                      isSigned ? `<span class="ds-signed-stamp ds-sig-1">${esc(r.name)}</span>`
                               : `<div class="ds-sign-pending-box">[ Awaiting Signature: ${esc(r.name)} ]</div>`
                    )}
                  </div>
                  <div class="ds-signer-sig-date">
                    Date: <b>${isCurrent ? (signed ? DS_TODAY : 'Pending Signature') : (isSigned ? (env.createdDate || DS_TODAY) : 'Pending')}</b>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

function dsSetSignerDoc(idx) {
  dsState.signerDocIdx = idx;
  dsRenderRoot();
}

function dsSignerConsentContinue() {
  dsState.signerStep = 'signing';
  dsRenderRoot();
}

/* ---------- Multi-Tab Adopt Signature Modal (Phase E.3) ---------- */
function dsOpenAdoptModal(ev) {
  if (ev && ev.stopPropagation) ev.stopPropagation();
  const existing = document.getElementById('dsAdoptModalWrap');
  if (existing) existing.remove();

  dsState.signerStep = 'signing';
  const env = dsGetEnvelope(dsState.signerEnvId);
  const recips = (env && env.recipients) ? env.recipients : [];
  const recip = recips.find(r => r.id === dsState.signerRecipId) || recips[0] || { name: 'Recipient', role: 'Signer' };
  const name = recip.name || 'Recipient';
  const initials = name.split(' ').map(p => p[0]).join('');

  dsState.signerAdoptTab = dsState.signerAdoptTab || 'style';

  const modal = document.createElement('div');
  modal.id = 'dsAdoptModalWrap';
  modal.className = 'ds-modal-backdrop';
  modal.style.cssText = 'position:fixed !important;inset:0 !important;z-index:999999 !important;background:rgba(0,0,0,0.65) !important;display:grid !important;place-items:center !important;padding:20px !important;';
  modal.innerHTML = `
    <div class="ds-modal-card">
      <div class="ds-modal-head">
        <div>
          <h3 class="ds-adopt-head-wrap">Adopt Your Signature</h3>
          <div class="ds-adopt-sub">Confirm your name, initials, and signing method</div>
        </div>
        <button type="button" class="ds-btn ds-adopt-close-btn" onclick="dsCloseAdoptModal()">${dsIcon('x', 13)}</button>
      </div>
      <div class="ds-modal-body">
        <div class="ds-adopt-grid">
          <div>
            <label class="ds-adopt-label">Full Name</label>
            <input type="text" class="ds-input" id="dsAdoptNameInput" value="${escAttr(name)}" readonly>
          </div>
          <div>
            <label class="ds-adopt-label">Initials</label>
            <input type="text" class="ds-input" id="dsAdoptInitInput" value="${escAttr(initials)}" readonly>
          </div>
        </div>

        <div class="ds-adopt-tabs">
          <button type="button" class="ds-adopt-tab ${dsState.signerAdoptTab === 'style' ? 'on' : ''}" onclick="dsSetAdoptTab('style')">Select Style</button>
          <button type="button" class="ds-adopt-tab ${dsState.signerAdoptTab === 'draw' ? 'on' : ''}" onclick="dsSetAdoptTab('draw')">Draw</button>
          <button type="button" class="ds-adopt-tab ${dsState.signerAdoptTab === 'upload' ? 'on' : ''}" onclick="dsSetAdoptTab('upload')">Upload</button>
        </div>

        <div id="dsAdoptTabContent">
          ${dsRenderAdoptTabContent(name, initials)}
        </div>

        <div class="ds-sig-legal">
          By clicking <b>Adopt and Sign</b>, I agree that the signature and initials will be the electronic representation of my signature and initials for all purposes.
        </div>
      </div>
      <div class="ds-modal-foot">
        <button type="button" class="ds-btn" onclick="dsCloseAdoptModal()">Cancel</button>
        <button type="button" class="ds-btn yellow ds-adopt-finish-btn" onclick="dsAdoptSignatureFinal()">Adopt and Sign ${dsIcon('check', 13)}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  if (dsState.signerAdoptTab === 'draw') {
    dsInitCanvasDrawing();
  }
}

function dsSetAdoptTab(tab) {
  dsState.signerAdoptTab = tab;
  const env = dsGetEnvelope(dsState.signerEnvId);
  const recips = (env && env.recipients) ? env.recipients : [];
  const recip = recips.find(r => r.id === dsState.signerRecipId) || recips[0] || { name: 'Recipient' };
  const name = recip.name || 'Recipient';
  const initials = name.split(' ').map(p => p[0]).join('');

  document.querySelectorAll('.ds-adopt-tab').forEach(t => t.classList.toggle('on', t.textContent.toLowerCase().includes(tab)));
  const cont = document.getElementById('dsAdoptTabContent');
  if (cont) cont.innerHTML = dsRenderAdoptTabContent(name, initials);

  if (tab === 'draw') {
    dsInitCanvasDrawing();
  }
}

function dsRenderAdoptTabContent(name, initials) {
  const tab = dsState.signerAdoptTab;
  if (tab === 'draw') {
    return `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:12px;color:var(--ds24-muted);font-weight:600;">Draw your signature in the box below:</span>
          <button type="button" class="ds-btn sm" onclick="dsClearDrawCanvas()">${dsIcon('trash', 12)} Clear</button>
        </div>
        <canvas id="dsSigCanvas" class="ds-draw-canvas" width="480" height="130"></canvas>
      </div>`;
  } else if (tab === 'upload') {
    return `
      <div style="text-align:center;padding:24px 16px;border:1px dashed var(--ds24-line);border-radius:6px;background:#fafafa;">
        ${dsIcon('download', 28)}
        <b style="display:block;margin:10px 0 4px;font-size:13.5px;">Upload Signature Image</b>
        <p style="font-size:12px;color:var(--ds24-muted);margin:0 0 14px;">Supported formats: PNG, JPG, BMP (Transparent background recommended)</p>
        <button type="button" class="ds-btn primary sm" onclick="simToast('Loaded default vectorized signature image.', { tone: 'good' })">Browse Files</button>
      </div>`;
  }

  return `
    <div class="ds-sig-style-card ${dsState.signerStyleIdx === 0 ? 'selected' : ''}" onclick="dsSelectSignatureStyle(0)">
      <div class="ds-sig-1 ds-sig-name">${esc(name)}</div>
      <div class="ds-sig-1 ds-sig-init">${esc(initials)}</div>
    </div>
    <div class="ds-sig-style-card ${dsState.signerStyleIdx === 1 ? 'selected' : ''}" onclick="dsSelectSignatureStyle(1)">
      <div class="ds-sig-2 ds-sig-name">${esc(name)}</div>
      <div class="ds-sig-2 ds-sig-init">${esc(initials)}</div>
    </div>
    <div class="ds-sig-style-card ${dsState.signerStyleIdx === 2 ? 'selected' : ''}" onclick="dsSelectSignatureStyle(2)">
      <div class="ds-sig-3 ds-sig-name">${esc(name)}</div>
      <div class="ds-sig-3 ds-sig-init">${esc(initials)}</div>
    </div>
    <div class="ds-sig-style-card ${dsState.signerStyleIdx === 3 ? 'selected' : ''}" onclick="dsSelectSignatureStyle(3)">
      <div class="ds-sig-4 ds-sig-name">${esc(name)}</div>
      <div class="ds-sig-4 ds-sig-init">${esc(initials)}</div>
    </div>`;
}

function dsInitCanvasDrawing() {
  const canvas = document.getElementById('dsSigCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  let drawing = false;

  const getPos = e => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = e => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = e => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const stop = () => { drawing = false; dsState.signerDrawnData = canvas.toDataURL(); };

  canvas.onmousedown = start; canvas.onmousemove = move; window.onmouseup = stop;
  canvas.ontouchstart = start; canvas.ontouchmove = move; canvas.ontouchend = stop;
}

function dsClearDrawCanvas() {
  const canvas = document.getElementById('dsSigCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  dsState.signerDrawnData = null;
}

function dsCloseAdoptModal() {
  const m = document.getElementById('dsAdoptModalWrap');
  if (m) m.remove();
}

function dsSelectSignatureStyle(idx) {
  dsState.signerStyleIdx = idx;
  dsState.signerDrawnData = null;
  const cards = document.querySelectorAll('.ds-sig-style-card');
  cards.forEach((c, i) => c.classList.toggle('selected', i === idx));
}

/* MM/DD/YYYY — the shape the graded curriculum stores in a Date Signed field
   ('08/11/2026'), not the ISO DS_TODAY it is derived from. */
function dsDateUS(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? m[2] + '/' + m[3] + '/' + m[1] : (iso || '');
}

function dsRecipInitials(name) {
  const s = (name || '').trim().split(/\s+/).map(p => p.charAt(0)).join('').toUpperCase().slice(0, 3);
  return s || '--';
}

/* Signing used to move the recipient's status and nothing else, so the fields
   the sender placed stayed empty forever — an envelope signed inside the module
   never came to look like the seeded ones in docusign-data.js, which do carry
   values. This fills the fields that follow from who signed, in exactly the
   formats that file already uses, so the two are indistinguishable.

   Types a signer has to type into by hand (Text, Checkbox, Company, Title…) are
   deliberately left alone: claiming to fill them would be inventing content. */
function dsFillFieldsForRecipient(fields, recip) {
  return (fields || []).map(f => {
    if (f.recipientId !== recip.id || f.value != null) return f;
    let v;
    switch (f.type) {
      case 'Signature':     v = 'Signed by ' + (recip.name || 'Signer'); break;
      case 'Initial':       v = dsRecipInitials(recip.name); break;
      case 'Date Signed':   v = dsDateUS(DS_TODAY); break;
      case 'Name':          v = recip.name || null; break;
      case 'Email Address': v = recip.email || null; break;
      default: return f;
    }
    return Object.assign({}, f, { value: v });
  });
}

function dsAdoptSignatureFinal() {
  dsCloseAdoptModal();
  const envId = dsState.signerEnvId;
  const recipId = dsState.signerRecipId;
  const env = dsGetEnvelope(envId);
  if (env) {
    const targetRecip = (env.recipients || []).find(r => r.id === recipId) || { name: 'Signer', role: 'Signer' };
    const updatedRecips = (env.recipients || []).map(r => {
      if (r.id === recipId) return Object.assign({}, r, { status: 'signed' });
      return r;
    });
    dsSetEnvelopeOverride(envId, {
      recipients: updatedRecips,
      fields: dsFillFieldsForRecipient(env.fields, targetRecip)
    });
    dsAddAuditLog(envId, 'Document Signed', { actor: `${targetRecip.name} (${targetRecip.role})`, text: 'Signature adopted and applied electronically' });
  }
  simToast('Signature adopted and placed on document!', { tone: 'good' });
  dsRenderRoot();
}

function dsFinishSigning() {
  const envId = dsState.signerEnvId;
  const env = dsGetEnvelope(envId);
  if (env) {
    const allSigned = (env.recipients || []).filter(r => r.action !== 'Receives a Copy').every(r => r.status === 'completed' || r.status === 'signed');
    if (allSigned) {
      dsSetEnvelopeOverride(envId, { status: 'completed' });
      dsAddAuditLog(envId, 'Envelope Completed', { text: 'All required signers executed agreement. Certificate of Completion sealed.' });

      if (typeof dsAddLiveEmail === 'function') {
        dsAddLiveEmail({
          type: 'completed',
          envId: envId,
          subject: env.subject
        });
      }
    }
  }
  simToast('You finished signing! Agreement is now completed and sealed.', { tone: 'good', duration: 5000 });
  dsGoto('envelopes');
}


/* ---------- Reports & Settings Views ---------- */
/* ============================================================================
   REPORTS — every figure counted, none typed.
   ============================================================================
   The previous version had a hand-written six-month series sitting next to a
   donut built from the real envelopes, which meant the bar chart and the list
   could disagree and nobody would notice. Now both come from the same place.

   If you ever find yourself about to type a number into this file, the data is
   not reaching you and the fix is upstream, not here.

   Charts are hand-written inline SVG. No chart library, and none is needed: a
   grouped bar chart is arithmetic, and a donut is stroke-dasharray on a circle.
   ============================================================================ */

/* Twelve months back from DS_TODAY, oldest first, counted off createdDate. */
function dsMonthlySeries(list) {
  const [ty, tm] = DS_TODAY.split('-').map(Number);
  const months = [];
  const index = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
    const key = d.toISOString().slice(0, 7);
    const row = { key: key, m: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()], sent: 0, completed: 0 };
    index[key] = row;
    months.push(row);
  }
  list.forEach(e => {
    const row = index[(e.createdDate || '').slice(0, 7)];
    if (!row) return;
    /* Drafts were never sent, so they are not volume. */
    if (e.status !== 'draft') row.sent++;
    if (e.status === 'completed') row.completed++;
  });
  return months;
}

/* Mean days from creation to closing across completed envelopes. */
function dsMedianTurnaround(list) {
  const spans = list
    .filter(e => e.status === 'completed' && e.createdDate && e.closingDate)
    .map(e => dsDaysBetween(e.createdDate, e.closingDate))
    .filter(n => n >= 0);
  if (!spans.length) return null;
  spans.sort((a, b) => a - b);
  const mid = Math.floor(spans.length / 2);
  return spans.length % 2 ? spans[mid] : (spans[mid - 1] + spans[mid]) / 2;
}
function dsDaysBetween(a, b) {
  const [ay, am, ad] = String(a).split('-').map(Number);
  const [by, bm, bd] = String(b).split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

function dsReportsGoto(tab) { dsState.reportTab = tab; dsRenderRoot(); }

/* Grouped bar chart. Geometry is computed rather than hard-coded so changing the
   series never requires re-measuring anything by hand. */
function dsBarChartSVG(series) {
  const W = 620, H = 220, padL = 34, padB = 30, padT = 12;
  const max = Math.max(1, Math.max.apply(null, series.map(d => Math.max(d.sent, d.completed))));
  const step = Math.max(1, Math.ceil(max / 4 / 5) * 5);
  const top = step * 4;
  const plotH = H - padB - padT;
  const plotW = W - padL - 8;
  const slot = plotW / series.length;
  const bw = Math.min(16, slot / 3.2);

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const v = step * i;
    const y = padT + plotH - (v / top) * plotH;
    grid += '<line x1="' + padL + '" y1="' + y + '" x2="' + W + '" y2="' + y + '" class="ds-chart-grid"/>' +
            '<text x="' + (padL - 8) + '" y="' + (y + 4) + '" class="ds-chart-axis" text-anchor="end">' + v + '</text>';
  }

  let bars = '';
  series.forEach((d, i) => {
    const cx = padL + slot * i + slot / 2;
    const hs = (d.sent / top) * plotH;
    const hc = (d.completed / top) * plotH;
    bars += '<rect x="' + (cx - bw - 1.5) + '" y="' + (padT + plotH - hs) + '" width="' + bw + '" height="' + hs + '" rx="2" class="ds-bar-sent"><title>' + d.m + ' sent: ' + d.sent + '</title></rect>';
    bars += '<rect x="' + (cx + 1.5) + '" y="' + (padT + plotH - hc) + '" width="' + bw + '" height="' + hc + '" rx="2" class="ds-bar-done"><title>' + d.m + ' completed: ' + d.completed + '</title></rect>';
    bars += '<text x="' + cx + '" y="' + (H - 10) + '" class="ds-chart-axis" text-anchor="middle">' + d.m + '</text>';
  });

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ds-chart" role="img" aria-label="Envelopes sent and completed per month">' +
         grid + bars + '</svg>';
}

/* Donut: one <circle> per slice, each rotated by the running total via
   stroke-dashoffset. Standard trick, and it keeps the markup tiny. */
function dsDonutSVG(slices) {
  const R = 58, C = 2 * Math.PI * R;
  const total = slices.reduce((a, s) => a + s.v, 0) || 1;
  let offset = 0;
  const arcs = slices.filter(s => s.v > 0).map(s => {
    const len = (s.v / total) * C;
    const el = '<circle cx="80" cy="80" r="' + R + '" fill="none" stroke="' + s.c + '" stroke-width="22" ' +
               'stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" ' +
               'stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 80 80)">' +
               '<title>' + esc(s.k) + ': ' + s.v + '</title></circle>';
    offset += len;
    return el;
  }).join('');
  return '<svg viewBox="0 0 160 160" class="ds-donut" role="img" aria-label="Envelope status distribution">' +
         arcs +
         '<text x="80" y="76" text-anchor="middle" class="ds-donut-num">' + total + '</text>' +
         '<text x="80" y="95" text-anchor="middle" class="ds-donut-lbl">envelopes</text></svg>';
}

/* Horizontal ranking bars, used for senders. */
function dsRankBars(rows) {
  const max = Math.max(1, Math.max.apply(null, rows.map(r => r.v)));
  return '<ul class="ds-rank">' + rows.map(r =>
    '<li><span class="ds-rank-label">' + esc(r.k) + '</span>' +
    '<span class="ds-rank-track"><i style="width:' + Math.round(r.v / max * 100) + '%;"></i></span>' +
    '<b>' + r.v + '</b></li>').join('') + '</ul>';
}

function dsReportsHTML() {
  const selectedDash = dsState.reportDash || 'admin';

  return `
    <!-- Main Reports Content (Screenshot 4) -->
    <div class="ds-pagehead" style="margin-bottom:20px;">
      <h1 class="ds-page-title" style="display:flex;align-items:center;gap:8px;">
        ${selectedDash === 'my' ? 'My dashboard' : 'Administrator dashboard'}
        <span style="font-size:18px;color:var(--ds24-muted);cursor:pointer;" title="Dashboard metrics information">&#9432;</span>
      </h1>
    </div>

    <!-- Envelope Usage Card -->
    <div class="ds-rep-card">
      <div class="ds-rep-card-head">
        <div class="ds-rep-card-title">Envelope Usage</div>
        <div class="ds-rep-card-period">
          <span>Time Period</span>
          <select class="ds-select" style="min-width:140px;height:32px;font-size:13px;" onchange="simToast('Time period updated.')">
            <option selected>Last 30 Days</option>
            <option>Last 6 Months</option>
            <option>Last 12 Months</option>
          </select>
        </div>
      </div>
      <div class="ds-rep-card-empty">
        <h4>No results.</h4>
        <p>There are no matching results. Try adjusting your filters.</p>
        <button type="button" class="ds-btn primary" onclick="simToast('Filters reset to defaults.')">Reset Filters</button>
      </div>
    </div>

    <!-- Envelope Success Card -->
    <div class="ds-rep-card">
      <div class="ds-rep-card-head">
        <div class="ds-rep-card-title">Envelope Success</div>
        <div class="ds-rep-card-period">
          <span>Time Period</span>
          <select class="ds-select" style="min-width:140px;height:32px;font-size:13px;" onchange="simToast('Time period updated.')">
            <option selected>Last 30 Days</option>
            <option>Last 6 Months</option>
            <option>Last 12 Months</option>
          </select>
        </div>
      </div>
      <div class="ds-rep-card-empty">
        <h4>No results.</h4>
      </div>
    </div>`;
}

function dsSetReportDash(d) {
  dsState.reportDash = d;
  dsSyncNav();
  dsRenderRoot();
}

function dsOpenNewReportModal() {
  const modal = document.createElement('div');
  modal.id = 'dsNewReportModalWrap';
  modal.className = 'ds-modal-backdrop';
  modal.innerHTML = `
    <div class="ds-modal-card">
      <div class="ds-modal-head">
        <h3 class="ds-adopt-head-wrap">${dsIcon('chart')} Create Custom Report</h3>
        <button type="button" class="ds-btn ds-cert-close-btn" onclick="document.getElementById('dsNewReportModalWrap').remove()">${dsIcon('x', 13)}</button>
      </div>
      <div class="ds-modal-body">
        <p class="ds-audit-actor">Select report metric, date range, and grouping to execute a real-time account analysis.</p>
        <div class="ds-form-group">
          <label class="ds-label">Report Title</label>
          <input type="text" id="dsNewReportTitle" class="ds-input" value="Custom Envelope Velocity Report">
        </div>
        <div class="ds-form-group">
          <label class="ds-label">Primary Metric</label>
          <select id="dsNewReportMetric" class="ds-select">
            <option value="Envelope Status & Turnaround">Envelope Status &amp; Turnaround Time</option>
            <option value="Delivery Failures & Bounces">Delivery Failures, Bounces &amp; Lockouts</option>
            <option value="Template Usage Velocity">Template Usage &amp; Adoption</option>
            <option value="Void & Decline Analysis">Void &amp; Decline Reasons Audit</option>
            <option value="Signer Routing Velocity">Sequential vs Parallel Routing Speed</option>
          </select>
        </div>
        <div class="ds-form-group">
          <label class="ds-label">Date Range</label>
          <select id="dsNewReportRange" class="ds-select">
            <option value="Last 30 Days">Last 30 Days (to ${esc(DS_TODAY)})</option>
            <option value="Last 90 Days">Last 90 Days</option>
            <option value="Year to Date">Year to Date (2026)</option>
            <option value="All Time">All Time</option>
          </select>
        </div>
        <div class="ds-form-group">
          <label class="ds-label">Group Results By</label>
          <select id="dsNewReportGroupBy" class="ds-select">
            <option value="status">By Envelope Status</option>
            <option value="sender">By Sender / VA</option>
            <option value="type">By Transaction / Agreement Type</option>
          </select>
        </div>
      </div>
      <div class="ds-modal-foot">
        <button type="button" class="ds-btn" onclick="document.getElementById('dsNewReportModalWrap').remove()">Cancel</button>
        <button type="button" class="ds-btn primary" onclick="dsSubmitNewReport()">Generate &amp; Run Report →</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function dsSubmitNewReport() {
  const title = document.getElementById('dsNewReportTitle')?.value || 'Custom Velocity Report';
  const metric = document.getElementById('dsNewReportMetric')?.value || 'Envelope Status & Turnaround';
  const range = document.getElementById('dsNewReportRange')?.value || 'Last 30 Days';
  const groupBy = document.getElementById('dsNewReportGroupBy')?.value || 'status';

  document.getElementById('dsNewReportModalWrap')?.remove();
  simToast(`Report "${title}" generated successfully.`, { tone: 'good' });
  dsRunReportModal(title, { metric, range, groupBy });
}

function dsExportReportsCSV() {
  const envs = dsAllEnvelopes();
  const headers = ['Envelope ID', 'Subject', 'Type', 'Sender', 'Status', 'Created Date', 'Closing Date', 'Recipients Count'];
  const rows = envs.map(e => [
    `"${e.id}"`,
    `"${(e.subject || '').replace(/"/g, '""')}"`,
    `"${(e.type || 'Agreement').replace(/"/g, '""')}"`,
    `"${(e.sender || '').replace(/"/g, '""')}"`,
    `"${e.status || 'waiting'}"`,
    `"${e.createdDate || ''}"`,
    `"${e.closingDate || ''}"`,
    (e.recipients || []).length
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\r\n');
  try {
    if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `docusign-envelope-report-${DS_TODAY}.csv`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(url);
      }, 100);
    }
  } catch (e) { /* fallback */ }
  simToast('Report data exported to CSV.', { tone: 'good' });
}

function dsRunReportModal(reportName, opts) {
  const envs = dsAllEnvelopes();
  const modal = document.createElement('div');
  modal.id = 'dsReportModalWrap';
  modal.className = 'ds-modal-backdrop';

  const completed = envs.filter(e => e.status === 'completed').length;
  const waiting = envs.filter(e => e.status === 'waiting').length;
  const voided = envs.filter(e => e.status === 'voided').length;
  const expired = envs.filter(e => e.status === 'expired').length;
  const declined = envs.filter(e => e.status === 'declined').length;
  const authfail = envs.filter(e => e.status === 'authfail').length;

  const rows = envs.slice(0, 15).map(e => `
    <tr>
      <td><b>${esc(e.id)}</b></td>
      <td>${esc(e.subject)}</td>
      <td>${esc(e.sender)}</td>
      <td>${esc(e.createdDate)}</td>
      <td><span class="ds-badge ${esc(e.status)}">${esc(dsStatusLabel(e.status))}</span></td>
    </tr>`).join('');

  modal.innerHTML = `
    <div class="ds-modal-card ds-tpl-builder-card">
      <div class="ds-modal-head">
        <div>
          <h3 class="ds-adopt-head-wrap">${dsIcon('chart')} Report: ${esc(reportName)}</h3>
          <div class="ds-audit-actor">Live Analysis &middot; Generated ${esc(DS_TODAY)} across ${envs.length} account envelopes</div>
        </div>
        <button type="button" class="ds-btn ds-cert-close-btn" onclick="document.getElementById('dsReportModalWrap').remove()">${dsIcon('x', 13)}</button>
      </div>
      <div class="ds-modal-body">
        <div class="ds-kpi-row">
          <div class="ds-kpi"><span class="ds-kpi-label">Total Envelopes</span><b>${envs.length}</b></div>
          <div class="ds-kpi"><span class="ds-kpi-label">Completed</span><b class="pos">${completed}</b></div>
          <div class="ds-kpi"><span class="ds-kpi-label">In Progress</span><b>${waiting}</b></div>
          <div class="ds-kpi"><span class="ds-kpi-label">Voided / Declined</span><b class="neg">${voided + declined}</b></div>
        </div>

        <h4 class="ds-sec-h">Envelope Activity Breakdown (Sample of ${envs.length})</h4>
        <div class="ds-set-scroll">
          <table class="ds-agr-tbl ds-agr-tbl-compact">
            <thead><tr><th>ID</th><th>Subject</th><th>Sender</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      <div class="ds-modal-foot">
        <button type="button" class="ds-btn" onclick="dsExportReportsCSV()">${dsIcon('download')} Export CSV</button>
        <button type="button" class="ds-btn primary" onclick="document.getElementById('dsReportModalWrap').remove()">Close Report</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
}

/* ============================================================================
   SETTINGS — the real navigation tree.
   Docusign's Settings is a grouped rail with dozens of pages, not a single panel
   of four inputs. The whole rail is shown because seeing the shape of it is part
   of what a VA needs to recognise; nine pages are built out, and the rest answer
   with a considered empty state rather than a dead link.

   Every control on these pages is disabled. They exist so the screens are
   recognisable, not so a visitor can change settings nothing would honour.
   The one exception is Account Profile, whose three fields write to dsDemo and
   therefore vanish on reload — that is the point of the dual-state model.
   ============================================================================ */
/* Groups and page names below were read off a signed-in eSignature Admin on
   apps.docusign.com, so the rail is a truthful map of where a setting lives.
   Admin is deliberately a MAP, not a working surface: pages without a builder
   fall through to the stub in dsSettingsHTML(), which names the group the
   setting lives under in a real account. That is the intended depth here —
   a VA does not administer a client's Docusign account.

   Two pages are kept that the observed account did not list, because they are
   real Docusign Admin features gated behind higher plans, not inventions:
   Signing Groups and Identity Verification. Trust Center was dropped — in the
   live product that is a footer link, not an Admin page. */
const DS_SETTINGS_TREE = [
  { group: 'Account', pages: [
    { id: 'billing',    label: 'Plan and Billing' },
    { id: 'profile',    label: 'Account Profile' },
    { id: 'security',   label: 'Security Settings' },
    { id: 'regional',   label: 'Regional Settings' },
    { id: 'brands',     label: 'Branding' },
    { id: 'stamps',     label: 'Stamps' },
    { id: 'updates',    label: 'Updates' },
    { id: 'valuecalc',  label: 'Value Calculator' }
  ]},
  { group: 'Users and Groups', pages: [
    { id: 'users',      label: 'Users' },
    { id: 'perms',      label: 'Permission Profiles' },
    { id: 'groups',     label: 'Groups' },
    { id: 'siggroups',  label: 'Signing Groups' }
  ]},
  { group: 'Signing and Sending', pages: [
    { id: 'signing',    label: 'Signing Settings' },
    { id: 'sending',    label: 'Sending Settings' },
    { id: 'emailtpl',   label: 'Email Preferences' },
    { id: 'custody',    label: 'Custody Transfer' },
    { id: 'retention',  label: 'Document Retention' },
    { id: 'disclosure', label: 'Legal Disclosure' },
    { id: 'reminders',  label: 'Reminders and Expiration' },
    { id: 'comments',   label: 'Comments' },
    { id: 'docfields',  label: 'Document Custom Fields' },
    { id: 'envfields',  label: 'Envelope Custom Fields' },
    { id: 'idv',        label: 'Identity Verification' }
  ]},
  { group: 'Integrations', pages: [
    { id: 'apps',       label: 'App Center' },
    { id: 'connect',    label: 'Connect' },
    { id: 'api',        label: 'Apps and Keys' },
    { id: 'apiusage',   label: 'API Usage Center' },
    { id: 'cors',       label: 'CORS' }
  ]},
  { group: 'Agreement Actions', pages: [
    { id: 'rules',       label: 'Rules' },
    { id: 'connections', label: 'Connections' }
  ]},
  { group: 'Auditing', pages: [
    { id: 'auditlogs',   label: 'Audit Logs' },
    { id: 'bulkactions', label: 'Bulk Actions' }
  ]}
];

/* Settings edits are real: the three profile fields write straight into dsDemo,
   so Save must confirm a save rather than claim the feature is missing. What it
   cannot promise is survival — that is what the reload note says. */
function dsSaveSettings() {
  simToast('Account settings saved for this session.', { tone: 'good' });
}

/* Disconnecting an app is destructive and irreversible from the UI, so it asks
   first — type B. The connection itself is catalogue data, so the confirmation
   is honest about what will and will not happen. */
function dsConfirmDisconnect(i) {
  const app = DS_S_CONNECTED_APPS[i];
  if (!app) return;
  dsConfirm({
    title: 'Disconnect ' + app.name + '?',
    body: app.name + ' will immediately lose access to this account. Envelopes it has already sent are unaffected, but any workflow that depends on it will stop.',
    danger: true,
    confirmLabel: 'Disconnect',
    onConfirm: () => dsDemoAction('Disconnecting an integration')
  });
}

function dsSettingsGoto(page) {
  dsState.settingsPage = page;
  dsRenderRoot();
  const main = document.querySelector('.ds-main');
  if (main) main.scrollTop = 0;
}

/* Small builders so each page reads as content rather than markup. */
function dsSetSection(title, help, body) {
  return '<section class="ds-set-sec">' +
    '<h3>' + esc(title) + '</h3>' +
    (help ? '<p class="ds-set-help">' + esc(help) + '</p>' : '') +
    body + '</section>';
}
function dsSetField(label, control, hint) {
  return '<div class="ds-set-field"><label>' + esc(label) + '</label>' + control +
         (hint ? '<span class="ds-set-hint">' + esc(hint) + '</span>' : '') + '</div>';
}
function dsSetInput(value, opts) {
  opts = opts || {};
  return '<input type="' + (opts.type || 'text') + '" class="ds-input" value="' + escAttr(value) + '"' +
         (opts.live ? ' oninput="' + opts.live + '"' : ' disabled') + '>';
}
function dsSetSelect(options, selected) {
  return '<select class="ds-select" disabled>' +
    options.map(o => '<option' + (o === selected ? ' selected' : '') + '>' + esc(o) + '</option>').join('') +
    '</select>';
}
function dsSetToggle(label, on, hint) {
  return '<div class="ds-set-toggle">' +
    '<input type="checkbox" ' + (on ? 'checked ' : '') + 'disabled>' +
    '<div><b>' + esc(label) + '</b>' + (hint ? '<span>' + esc(hint) + '</span>' : '') + '</div></div>';
}

/* Every page below reads from docusign-shell-data.js. Nothing is typed inline any
   more: a user list that disagreed with the senders on the envelopes was one of
   the loudest coherence bugs in the module. */
const DS_SETTINGS_PAGES = {

  profile: () => {
    const u = dsDemo.user;
    return dsSetSection('Account Profile',
      'Identifies your account on every envelope you send and on the certificate of completion.',
      '<div class="ds-set-grid">' +
        dsSetField('Account Holder Name', dsSetInput(u.name, { live: 'dsDemo.user.name = this.value;' })) +
        dsSetField('Email Address', dsSetInput(u.email, { type: 'email', live: 'dsDemo.user.email = this.value;' })) +
        dsSetField('Company / Brokerage', dsSetInput(u.accountName, { live: 'dsDemo.user.accountName = this.value;' })) +
        dsSetField('Job Title', dsSetInput(u.role)) +
      '</div>' +
      '<div class="ds-set-grid">' +
        dsSetField('Account ID', dsSetInput(u.accountId), 'Assigned by Docusign. Cannot be changed.') +
        dsSetField('Account Plan', dsSetInput(DS_S_PLAN.name + ' — ' + DS_S_PLAN.seatsTotal + ' seats')) +
      '</div>' +
      '<div class="ds-set-actions">' +
        '<button type="button" class="ds-btn primary" onclick="dsSaveSettings()">Save Changes</button>' +
        '<button type="button" class="ds-btn" onclick="dsSettingsGoto(\'profile\')">Cancel</button>' +
      '</div>') +
    dsSetSection('Signature',
      'The signature applied when you sign an envelope yourself.',
      '<div class="ds-set-sigcard">' +
        '<div class="ds-set-sigpreview ds-sig-1">' + esc(u.name) + '</div>' +
        '<div><b>Adopted signature</b><span class="ds-set-hint">Style: Segoe Script &middot; Adopted ' + esc(dsSDay(-211)) + '</span></div>' +
        '<button type="button" class="ds-btn sm" onclick="dsDemoAction(\'Changing your adopted signature\')">Edit</button>' +
      '</div>');
  },

  billing: () => {
    const p = DS_S_PLAN;
    const pct = Math.round(p.seatsUsed / p.seatsTotal * 100);
    return dsSetSection('Plan and Billing',
      'What this account pays for and how many of its seats are in use.',
      '<div class="ds-set-grid">' +
        dsSetField('Plan', dsSetInput(p.name)) +
        dsSetField('Billing cycle', dsSetInput(p.cycle)) +
        dsSetField('Amount', dsSetInput(p.amount)) +
        dsSetField('Renews on', dsSetInput(p.renews)) +
      '</div>' +
      '<div class="ds-set-seats">' +
        '<div class="ds-set-seatbar"><i style="width:' + pct + '%;"></i></div>' +
        '<span><b>' + p.seatsUsed + '</b> of ' + p.seatsTotal + ' seats in use</span>' +
      '</div>' +
      '<div class="ds-set-actions">' +
        '<button type="button" class="ds-btn primary" onclick="dsDemoAction(\'Changing your plan\')">Change Plan</button>' +
        '<button type="button" class="ds-btn" onclick="dsDemoAction(\'Updating the payment method\')">Payment Method</button>' +
      '</div>') +
    dsSetSection('Invoices', '',
      '<table class="ds-agr-tbl ds-agr-tbl-compact">' +
      '<thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th><th class="col-run"></th></tr></thead><tbody>' +
      p.invoices.map(i =>
        '<tr><td class="ds-mono">' + esc(i.id) + '</td><td>' + esc(i.date) + '</td><td>' + esc(i.amount) + '</td>' +
        '<td><span class="ds-badge completed">' + esc(i.status) + '</span></td>' +
        '<td><button type="button" class="ds-btn sm" onclick="dsDemoAction(\'Downloading an invoice\')">PDF</button></td></tr>').join('') +
      '</tbody></table>');
  },

  regional: () => {
    const r = DS_S_REGIONAL;
    return dsSetSection('Regional Settings',
      'Applies to every timestamp this account shows, including the audit trail and the certificate of completion.',
      '<div class="ds-set-grid">' +
        dsSetField('Time zone', dsSetInput(r.timezone)) +
        dsSetField('Date format', dsSetInput(r.dateFormat)) +
        dsSetField('Time format', dsSetInput(r.timeFormat)) +
        dsSetField('Language', dsSetInput(r.language)) +
        dsSetField('Currency', dsSetInput(r.currency)) +
      '</div>');
  },

  users: () => {
    const rows = DS_S_USERS.map(u =>
      '<tr><td><b>' + esc(u.name) + '</b><div class="ds-agr-from">' + esc(u.email) + '</div></td>' +
      '<td>' + esc(u.permissionProfile) + '</td>' +
      '<td>' + esc(u.group) + '</td>' +
      '<td><span class="ds-badge ' + (u.status === 'Active' ? 'completed' : u.status === 'Pending' ? 'waiting' : 'draft') + '">' + esc(u.status) + '</span></td>' +
      '<td>' + esc(u.lastSignIn || '—') + '</td>' +
      '<td><button type="button" class="ds-btn sm" onclick="dsDemoAction(\'Editing a user\')">Edit</button></td></tr>').join('');
    return dsSetSection('Users',
      'Everyone who can send or view envelopes on this account. A closed user keeps their completed envelopes; they simply cannot sign in.',
      '<div class="ds-set-scroll"><table class="ds-agr-tbl ds-agr-tbl-compact">' +
      '<thead><tr><th>Name</th><th>Permission Profile</th><th>Group</th><th>Status</th><th>Last Sign-In</th><th class="col-run"></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
      '<div class="ds-set-actions">' +
        '<button type="button" class="ds-btn primary" onclick="dsDemoAction(\'Inviting a user\')">Add User</button>' +
        '<button type="button" class="ds-btn" onclick="dsDemoAction(\'Exporting the user list\')">Export</button>' +
      '</div>');
  },

  groups: () => {
    /* Membership is counted from DS_S_USERS rather than stored, so a group can
       never claim four members while the user list shows three. */
    const rows = DS_S_GROUPS.map(gr => {
      const n = DS_S_USERS.filter(u => u.group === gr.name).length;
      return '<tr><td><b>' + esc(gr.name) + '</b></td><td class="num">' + n + '</td>' +
        '<td>' + esc(gr.desc) + '</td>' +
        '<td><button type="button" class="ds-btn sm" onclick="dsDemoAction(\'Editing a group\')">Edit</button></td></tr>';
    }).join('');
    return dsSetSection('Groups',
      'Groups let you assign a permission profile and a set of templates to several users at once.',
      '<table class="ds-agr-tbl ds-agr-tbl-compact">' +
      '<thead><tr><th>Group</th><th class="num">Members</th><th>Description</th><th class="col-run"></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<div class="ds-set-actions"><button type="button" class="ds-btn primary" onclick="dsDemoAction(\'Creating a group\')">New Group</button></div>');
  },

  perms: () => {
    /* The matrix is painted from the capability flags on each profile, so the
       grid and the profile list are physically incapable of disagreeing. */
    const head = DS_S_PERMISSION_PROFILES.map(p => '<th class="num">' + esc(p.name) + '</th>').join('');
    const body = DS_S_CAPABILITIES.map(c =>
      '<tr><td><b>' + esc(c.label) + '</b></td>' +
      DS_S_PERMISSION_PROFILES.map(p =>
        '<td class="num">' + (p.caps[c.key] ? '<span class="ds-yes">' + dsIcon('check', 15) + '</span>' : '<span class="ds-no">—</span>') + '</td>'
      ).join('') + '</tr>').join('');
    const counts = DS_S_PERMISSION_PROFILES.map(p =>
      '<td class="num ds-set-usercount">' + DS_S_USERS.filter(u => u.permissionProfile === p.name).length + '</td>').join('');
    return dsSetSection('Permission Profiles',
      'A profile is a named set of capabilities, and every user has exactly one. This is the screen that answers "why can I not void that envelope?".',
      '<div class="ds-set-scroll"><table class="ds-agr-tbl ds-agr-tbl-compact ds-set-matrix">' +
      '<thead><tr><th>Capability</th>' + head + '</tr></thead>' +
      '<tbody>' + body +
      '<tr class="ds-set-matrix-foot"><td><b>Users assigned</b></td>' + counts + '</tr></tbody></table></div>' +
      '<div class="ds-set-actions"><button type="button" class="ds-btn primary" onclick="dsDemoAction(\'Creating a permission profile\')">New Profile</button></div>');
  },

  siggroups: () => dsSetSection('Signing Groups',
    'A signing group is addressed as one recipient. Whoever opens it first takes the signature, which is how a team covers a role without naming an individual on the envelope.',
    '<table class="ds-agr-tbl ds-agr-tbl-compact">' +
    '<thead><tr><th>Group</th><th>Members</th><th>Notes</th><th class="col-run"></th></tr></thead><tbody>' +
    DS_S_SIGNING_GROUPS.map(sg =>
      '<tr><td><b>' + esc(sg.name) + '</b></td>' +
      '<td>' + sg.members.map(m => esc(m)).join(', ') + '</td>' +
      '<td>' + esc(sg.note) + '</td>' +
      '<td><button type="button" class="ds-btn sm" onclick="dsDemoAction(\'Editing a signing group\')">Edit</button></td></tr>').join('') +
    '</tbody></table>' +
    '<div class="ds-set-actions"><button type="button" class="ds-btn primary" onclick="dsDemoAction(\'Creating a signing group\')">New Signing Group</button></div>'),

  sending: () => dsSetSection('Sending Settings',
    'Defaults applied to every envelope this account sends. Individual envelopes can override most of them at send time.',
    '<div class="ds-set-grid">' +
      dsSetField('Default email subject', dsSetInput('Please Docusign: [[DocumentName]]')) +
      dsSetField('Default sender name', dsSetInput(dsDemo.user.name)) +
    '</div>' +
    dsSetToggle('Allow senders to set signing order', true, 'Required for the Buyer-then-Seller sequence used on purchase agreements.') +
    dsSetToggle('Allow recipients to reassign', false, 'Off, because reassignment moves a signature outside the intended party.') +
    dsSetToggle('Attach the completed PDF to the completion email', true) +
    dsSetToggle('Allow senders to add comments to documents', true) +
    dsSetToggle('Require a reason when a recipient declines', true)) +
    dsSetSection('Document Handling', '',
    '<div class="ds-set-grid">' +
      dsSetField('Maximum envelope size', dsSetSelect(['25 MB', '50 MB', '100 MB'], '25 MB')) +
      dsSetField('Attachment types allowed', dsSetInput('PDF, DOCX, PNG, JPG')) +
    '</div>'),

  signing: () => dsSetSection('Signing Settings',
    'What a recipient sees and is allowed to do inside the signing session.',
    dsSetToggle('Require signers to adopt a signature before signing', true) +
    dsSetToggle('Allow drawn signatures', true) +
    dsSetToggle('Allow signers to download the document before signing', true) +
    dsSetToggle('Show the "Finish Later" option', true) +
    dsSetToggle('Require every required field before Finish', true, 'Off would let a signer skip a field the file legally needs.') +
    dsSetToggle('Allow signers to add a comment when declining', true)),

  reminders: () => dsSetSection('Reminders and Expiration',
    'The cadence that chases an unsigned envelope for you. A VA who understands this screen stops sending manual nudges the system was already going to send.',
    '<div class="ds-set-grid">' +
      dsSetField('First reminder after', dsSetSelect(['1 day', '2 days', '3 days', '5 days'], '2 days'), 'Counted from the moment the envelope is sent.') +
      dsSetField('Then repeat every', dsSetSelect(['1 day', '2 days', '3 days', '7 days'], '3 days')) +
    '</div>' +
    dsSetToggle('Send automatic reminders', true) +
    '<div class="ds-set-grid">' +
      dsSetField('Envelope expires after', dsSetSelect(['30 days', '60 days', '120 days'], '120 days')) +
      dsSetField('Warn recipients before expiry', dsSetSelect(['1 day', '3 days', '7 days'], '3 days')) +
    '</div>' +
    dsSetToggle('Notify the sender when an envelope expires', true)),

  brands: () => dsSetSection('Branding',
    'A brand controls the logo, colours and wording a recipient sees in the signing session and in every notification email.',
    '<div class="ds-set-brandgrid">' +
      DS_S_BRANDS.map(b =>
        '<div class="ds-set-brand' + (b.isDefault ? ' default' : '') + '">' +
          '<div class="ds-set-brandbar" style="background:' + b.color + ';"><span class="ds-set-brandlogo">' + b.logo + '</span></div>' +
          '<b>' + esc(b.name) + '</b>' +
          '<span class="ds-set-hint">' + (b.isDefault ? 'Default for sending and signing' : 'Available to senders') +
          ' &middot; ' + b.languages.map(l => esc(l)).join(', ') + '</span>' +
          '<button type="button" class="ds-btn sm" onclick="dsDemoAction(\'Editing a brand\')">Edit</button>' +
        '</div>').join('') +
    '</div>' +
    '<div class="ds-set-actions"><button type="button" class="ds-btn primary" onclick="dsDemoAction(\'Creating a brand\')">Add Brand</button></div>'),

  emailtpl: () => dsSetSection('Email Preferences',
    'The six messages Docusign sends on your behalf. Placeholders in double brackets are filled in per envelope.',
    '<div class="ds-set-maillist">' +
      DS_S_EMAIL_TEMPLATES.map(t =>
        '<div class="ds-set-mail">' +
          '<div class="ds-set-mail-h"><b>' + esc(t.name) + '</b><span>' + esc(t.event) + '</span>' +
          '<button type="button" class="ds-btn sm" onclick="dsDemoAction(\'Editing an email template\')">Edit</button></div>' +
          '<div class="ds-set-mail-subj">' + esc(t.subject) + '</div>' +
          '<p>' + esc(t.body) + '</p>' +
        '</div>').join('') +
    '</div>'),

  apps: () => dsSetSection('App Center',
    'Applications authorised to act on this account. Revoking one stops it immediately; envelopes it already sent are unaffected.',
    '<div class="ds-set-appgrid">' + DS_S_CONNECTED_APPS.map((a, i) =>
      '<div class="ds-set-app"><div class="ds-set-applogo">' + esc(a.name.charAt(0)) + '</div>' +
      '<div class="ds-set-appbody"><b>' + esc(a.name) + '</b><p>' + esc(a.desc) + '</p>' +
      '<span class="ds-set-hint">' + (a.connected ? 'Connected ' + esc(a.since) + ' &middot; ' + esc(a.scope) : esc(a.scope)) + '</span></div>' +
      '<div class="ds-set-appfoot"><span class="ds-badge ' + (a.connected ? 'completed' : 'draft') + '">' + (a.connected ? 'Connected' : 'Not connected') + '</span>' +
      (a.connected
        ? '<button type="button" class="ds-btn sm danger" onclick="dsConfirmDisconnect(' + i + ')">Disconnect</button>'
        : '<button type="button" class="ds-btn sm" onclick="dsDemoAction(\'Connecting an app\')">Connect</button>') +
      '</div></div>').join('') +
    '</div>'),

  api: () => dsSetSection('Apps and Keys',
    'Integration credentials. Keys are shown masked and cannot be revealed again after creation — that is how the real product behaves, and it is the habit worth learning.',
    '<div class="ds-set-grid">' +
      dsSetField('Account API base URL', dsSetInput('https://na4.docusign.net/restapi')) +
      dsSetField('API Account ID', dsSetInput(dsDemo.user.accountId)) +
    '</div>' +
    '<table class="ds-agr-tbl ds-agr-tbl-compact">' +
    '<thead><tr><th>Key</th><th>Secret</th><th>Scope</th><th>Created</th><th>Last used</th><th class="col-run"></th></tr></thead><tbody>' +
    DS_S_API_KEYS.map(k =>
      '<tr><td><b>' + esc(k.name) + '</b></td><td class="ds-mono">' + esc(k.masked) + '</td>' +
      '<td>' + esc(k.scope) + '</td><td>' + esc(k.created) + '</td><td>' + esc(k.lastUsed) + '</td>' +
      '<td><button type="button" class="ds-btn sm" onclick="dsDemoAction(\'Regenerating an API key\')">Regenerate</button></td></tr>').join('') +
    '</tbody></table>' +
    '<div class="ds-set-actions"><button type="button" class="ds-btn primary" onclick="dsDemoAction(\'Creating an API key\')">New Key</button></div>'),

  connect: () => dsSetSection('Connect',
    'Webhook subscriptions. Docusign posts envelope events to these URLs as they happen; a failing endpoint is why a downstream system stops seeing signatures.',
    '<table class="ds-agr-tbl ds-agr-tbl-compact">' +
    '<thead><tr><th>Subscription</th><th>Events</th><th>Status</th><th class="num">Recent failures</th><th class="col-run"></th></tr></thead><tbody>' +
    DS_S_CONNECT.map(c =>
      '<tr><td><b>' + esc(c.name) + '</b><div class="ds-mono">' + esc(c.url) + '</div></td>' +
      '<td>' + c.events.map(e => esc(e)).join(', ') + '</td>' +
      '<td><span class="ds-badge ' + (c.status === 'Active' ? 'completed' : 'draft') + '">' + esc(c.status) + '</span></td>' +
      '<td class="num' + (c.failures ? ' ds-set-fail' : '') + '">' + c.failures + '</td>' +
      '<td><button type="button" class="ds-btn sm" onclick="dsDemoAction(\'Editing a Connect subscription\')">Edit</button></td></tr>').join('') +
    '</tbody></table>'),

  security: () => dsSetSection('Security Settings',
    'Account-wide rules. These are the settings an escrow or title client will ask about before letting a VA near their envelopes.',
    '<div class="ds-set-grid">' +
      dsSetField('Minimum password length', dsSetSelect(['8 characters', '10 characters', '12 characters'], '12 characters')) +
      dsSetField('Password expires after', dsSetSelect(['Never', '90 days', '180 days'], '90 days')) +
      dsSetField('Session timeout', dsSetSelect(['15 minutes', '20 minutes', '30 minutes'], '20 minutes')) +
      dsSetField('Failed sign-in lockout', dsSetSelect(['3 attempts', '5 attempts', '10 attempts'], '5 attempts')) +
    '</div>' +
    dsSetToggle('Require multi-factor authentication for all users', true) +
    dsSetToggle('Require SMS or phone authentication for signers on real-estate envelopes', true, 'This is what the "Authentication Failed" quick view is counting.') +
    dsSetToggle('Restrict sign-in to the IP allowlist', false) +
    dsSetToggle('Block downloads of completed documents outside the account', false)) +
    dsSetSection('Data Retention', '',
    '<div class="ds-set-grid">' +
      dsSetField('Keep completed envelopes for', dsSetSelect(['3 years', '7 years', 'Indefinitely'], '7 years')) +
      dsSetField('Purge voided envelopes after', dsSetSelect(['90 days', '1 year', '24 months'], '24 months')) +
    '</div>'),

  auditlogs: () => dsSetSection('Audit Logs',
    'Every action taken on this account, by any user. Read-only by design — an audit log you can edit is not an audit log.',
    '<div class="ds-set-scroll"><table class="ds-agr-tbl ds-agr-tbl-compact">' +
    '<thead><tr><th class="col-ts">Timestamp</th><th>Action</th><th>Actor</th><th>IP</th></tr></thead><tbody>' +
    DS_S_SECURITY_EVENTS.map(e =>
      '<tr><td class="ds-mono">' + esc(e.timestamp) + '</td><td><b>' + esc(e.action) + '</b></td>' +
      '<td>' + esc(e.actor) + '</td><td class="ds-mono">' + esc(e.ip) + '</td></tr>').join('') +
    '</tbody></table></div>' +
    '<div class="ds-set-actions"><button type="button" class="ds-btn" onclick="dsDemoAction(\'Exporting the audit log\')">Export</button></div>'),

  idv: () => {
    const on = !!(dsDemo.settings && dsDemo.settings.idvEnabled);
    return dsSetSection('Identity Verification (IDV)',
      'Require signers to verify their identity with a government-issued ID, passport, or electronic ID before opening an envelope.',
      '<div class="ds-set-toggle">' +
        '<input type="checkbox" id="dsIdvToggle" ' + (on ? 'checked ' : '') + 'onchange="if(!dsDemo.settings)dsDemo.settings={}; dsDemo.settings.idvEnabled=this.checked; dsRenderRoot(); simToast(this.checked ? \'Identity Verification enabled for this account.\' : \'Identity Verification disabled.\', { tone: \'good\' });">' +
        '<div><b>Enable DocuSign ID Verification</b><span>Allows senders to require government ID or passport verification per recipient on sensitive envelopes.</span></div>' +
      '</div>' +
      '<div class="ds-box-tip">' +
        dsIcon('shield', 14) + ' <b>VA Security Note:</b> When enabled in Account Settings, senders can toggle ID Verification on individual signers in Step 2 of the Send Wizard.' +
      '</div>');
  }
};


function dsSettingsHTML() {
  const page = dsState.settingsPage || 'profile';
  const flat = [];
  DS_SETTINGS_TREE.forEach(g => g.pages.forEach(p => flat.push(p)));
  const current = flat.find(p => p.id === page) || flat[0];

  const rail = DS_SETTINGS_TREE.map(g => `
    <div class="ds-set-group">
      <div class="ds-set-grouplabel">${esc(g.group)}</div>
      ${g.pages.map(p => `
        <button type="button" class="ds-set-link${p.id === current.id ? ' on' : ''}" onclick="dsSettingsGoto('${escAttr(p.id)}')">
          ${esc(p.label)}${DS_SETTINGS_PAGES[p.id] ? '' : '<span class="ds-set-dot" title="Not built in this demo"></span>'}
        </button>`).join('')}
    </div>`).join('');

  const builder = DS_SETTINGS_PAGES[current.id];
  const body = builder ? builder() : `
    <div class="ds-set-empty">
      ${dsIcon('settings', 44)}
      <h3>${esc(current.label)}</h3>
      <p>This settings page is not available in the demo environment.</p>
      <p class="ds-set-emptysub">In a live Docusign account it lives under <b>${esc((DS_SETTINGS_TREE.find(g => g.pages.some(p => p.id === current.id)) || {}).group || '')}</b>.</p>
    </div>`;

  return `
    <h1 class="ds-page-title">Settings</h1>
    <div class="ds-set-layout">
      <nav class="ds-set-rail" aria-label="Settings">${rail}</nav>
      <div class="ds-set-body">
        <h2 class="ds-set-title">${esc(current.label)}</h2>
        ${body}
      </div>
    </div>`;
}

/* ---------- Topbar Popovers ---------- */
function dsToggleAccountDropdown(ev) {
  ev.stopPropagation();
  const existing = document.getElementById('dsFloatingPopover');
  if (existing) { existing.remove(); return; }

  const u = dsDemo.user || { name: 'Alex Rivera', email: 'alex.rivera@agency.com', accountName: 'Keller Williams Realty — Lone Star', accountId: 'KW-TX-98421' };
  const pop = document.createElement('div');
  pop.id = 'dsFloatingPopover';
  pop.className = 'ds-popover-menu';
  pop.innerHTML = `
    <div class="ds-popover-header">
      <span>Account & Profile</span>
      <span class="ds-badge completed" style="font-size:10px;">Active Sandbox</span>
    </div>
    <div class="ds-popover-body">
      <div class="ds-popover-user-row">
        <div class="ds-user-avatar ds-popover-avatar">VA</div>
        <div>
          <div class="ds-popover-user-name">${esc(u.name)}</div>
          <div class="ds-popover-user-email">${esc(u.email)}</div>
          <div class="ds-popover-user-account">${esc(u.accountName)}</div>
        </div>
      </div>
      <div class="ds-popover-acct-id">
        Account ID: <code>${esc(u.accountId)}</code>
      </div>
      <div>
        <button type="button" class="ds-btn ds-popover-btn-center" onclick="dsGoto('settings')">${dsIcon('settings')} Account Settings</button>
      </div>
      <!-- Training tools, not Docusign features. Moved here out of the Settings page,
           where they read as part of the product. -->
      <div class="ds-popover-training">
        <span>Training tools</span>
        <button type="button" class="ds-btn ds-popover-btn-center" onclick="dsExportSandboxJSON()">${dsIcon('download')} Export Sandbox (JSON)</button>
        <button type="button" class="ds-btn danger ds-popover-btn-center" onclick="dsConfirmResetSandbox()">${dsIcon('refresh')} Reset Sandbox to Default</button>
      </div>
    </div>`;
  document.body.appendChild(pop);
  const btn = document.getElementById('dsUserAvatar');
  if (btn) {
    const rect = btn.getBoundingClientRect();
    pop.style.top = (rect.bottom + 8) + 'px';
    pop.style.right = (window.innerWidth - rect.right) + 'px';
  }
}

/* Per-recipient breakdown, rendered as an extra row under the batch it belongs
   to rather than a separate screen — the numbers only make sense next to the
   totals they add up to. */
function dsBulkDetailHTML(batch) {
  const d = dsBulkRecipients(batch);
  return `
    <tr class="ds-bulk-detail">
      <td colspan="6">
        <div class="ds-bulk-panel">
          <div class="ds-bulk-panel-h">
            <b>Recipients</b>
            <span>${batch.done} of ${batch.recips} complete</span>
            <button type="button" class="ds-btn sm" onclick="event.stopPropagation();dsDemoAction('Exporting a bulk send report')">${dsIcon('download', 14)} Export</button>
          </div>
          <table class="ds-agr-tbl ds-agr-tbl-compact">
            <thead><tr><th>Name</th><th>Email</th><th class="col-status">Status</th></tr></thead>
            <tbody>
              ${d.rows.map(r => `
                <tr>
                  <td>${esc(r.name)}</td>
                  <td class="ds-mono">${esc(r.email)}</td>
                  <td><span class="ds-agr-status">${dsStatusIcon(r.status, 16)}${esc(dsStatusLabel(r.status))}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
          ${d.hidden ? `<p class="ds-bulk-more">and ${d.hidden} more recipient${d.hidden === 1 ? '' : 's'}</p>` : ''}
        </div>
      </td>
    </tr>`;
}

function dsToggleNotifDropdown(ev) {
  ev.stopPropagation();
  const existing = document.getElementById('dsFloatingPopover');
  if (existing) { existing.remove(); return; }

  const notifs = dsDemo.notifications || [];
  const unread = notifs.filter(n => !n.read).length;

  /* Each row navigates to the envelope it names and marks itself read. Opening
     the panel no longer clears the dot on its own: seeing that something exists
     is not the same as having read it, and clearing on open was why the dot
     never came back. */
  const items = notifs.map(n => `
    <div class="ds-notif${n.read ? '' : ' unread'}" onclick="dsOpenNotif('${escAttr(n.id)}')">
      <span class="ds-notif-dot" aria-hidden="true"></span>
      <div>
        <b>${esc(n.title)}</b>
        <p>${esc(n.text)}</p>
        <span class="ds-notif-meta">${esc(n.date || '')}${n.envId ? ' · ' + esc(n.envId) : ''}</span>
      </div>
    </div>`).join('');

  const pop = document.createElement('div');
  pop.id = 'dsFloatingPopover';
  pop.className = 'ds-popover-menu';
  pop.innerHTML = `
    <div class="ds-popover-header">
      <span>Notifications${unread ? ' (' + unread + ')' : ''}</span>
      <button type="button" class="ds-linkbtn" onclick="event.stopPropagation();dsMarkAllNotifsRead()">Mark all read</button>
    </div>
    <div class="ds-popover-body">
      ${items.length ? items : '<div class="ds-notif-empty">No notifications.</div>'}
    </div>`;
  document.body.appendChild(pop);
  const btn = document.getElementById('dsNotifBtn');
  if (btn) {
    const rect = btn.getBoundingClientRect();
    pop.style.top = (rect.bottom + 8) + 'px';
    pop.style.right = (window.innerWidth - rect.right) + 'px';
  }
}

function dsConfirmResetSandbox() {
  if (confirm('Are you sure you want to reset all sandbox test envelopes and restore default training state?')) {
    dsResetDemo();
    simToast('Sandbox restored to initial clean training state!', { tone: 'good' });
    const pop = document.getElementById('dsFloatingPopover');
    if (pop) pop.remove();
    dsGoto('envelopes');
  }
}

function dsExportSandboxJSON() {
  const jsonStr = JSON.stringify({ progress: dsStore, sandbox: dsDemo }, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DocuSign_Sandbox_State_${DS_TODAY}.json`;
  a.click();
  simToast('Sandbox session state exported as JSON file!', { tone: 'good' });
}

/* Lesson detail HTML: the engine does most of the work; the host provides this thin wrapper. */
function dsLessonDetailHTML() {
  const id = dsState.lessonId;
  if (!id) return '<p>No lesson selected.</p>';
  return SimEngine.lessonDetailHTML(id);
}

/* Hands the shared engine everything it cannot know on its own. Note that `lessons` is
   passed by reference to the live array, so nothing has to be re-registered when the
   curriculum changes, and `store` is a getter rather than the object itself because
   dsLoad() REPLACES dsStore wholesale on load. */
function dsInitEngine() {
  SimEngine.init({
    lessons: DS_LESSONS,
    store: () => dsStore,
    save: dsSave,
    render: dsRenderRoot,
    goHome: () => dsGoto('dashboard'),
    showLesson: (id) => { dsState.view = 'lesson'; dsState.lessonId = id; dsSyncNav(); dsRenderRoot(); },
    currentLessonId: () => dsState.lessonId,
    navigate: dsLessonStepNavigate,
    stepDone: dsLessonStepDone,
    stepLabel: dsLessonStepLabel,
    stepStatus: dsLessonStepStatus,
    /* Types whose page renders its own explanation + Continue button. */
    selfFeedbackTypes: ['decide', 'verify', 'configure', 'triage', 'compose'],
    feedbackSelector: '.ds-feedback, .sim-feedback',
    beforeStep: function () { /* no search box to unlock in DocuSign */ },
    lessonEverComplete: dsLessonEverComplete,
    noteLessonComplete: dsNoteLessonComplete,
    resetLesson: dsResetLesson,
    btnClass: 'ds-btn'
  });
}

document.addEventListener('DOMContentLoaded', function () {
  dsLoad();
  dsResetWizard();
  dsInitEngine();
  dsSyncUser();
  /* Before the first paint, so the course chrome never flashes on a demo link. */
  dsApplyDemoMode();
  dsRefreshNotifDot();
  dsSyncNav();
  dsRenderRoot();
  /* Launch tour on first visit — but not on a stakeholder link, where a tour of
     a curriculum that is hidden would make no sense. */
  if (!dsDemoMode() && !dsStore.tourSeen && window.dsTourStart) {
    setTimeout(dsTourStart, 500);
  }
});
