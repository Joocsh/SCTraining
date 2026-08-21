/* ============================================================================
   APPFOLIO SIMULATOR — CURRICULUM
   ============================================================================

   What belongs here
   -----------------
   The graded course and nothing else: lessons, scenarios, verify/reconcile/
   compose/triage items, and the exam bank. Prompt 3/3 fills this file, and from
   that point it is frozen — every id in it is something a trainee is scored on,
   so a rename here is a lost record for anyone mid-course.

   What does NOT belong here
   -------------------------
   The portfolio. Properties, units, leases, residents, work orders and every
   other product entity live in appfolio-catalog-data.js. Keeping the two apart
   from the first line is deliberate: the other two modules in this repo each
   grew a single file holding both, and separating them afterwards cost several
   passes each.

   Naming
   ------
   Everything here is AF_*. The catalogue is AFC_*, the facade is AFS_*. Three
   prefixes, so a reader can tell at a glance which layer a symbol came from.
   ============================================================================ */


/* The frozen "today". Every date in the module is measured against this rather
   than against the real clock, for two reasons: a portfolio anchored to a live
   date drifts into nonsense within weeks (leases silently expire, work orders
   age past their SLA), and a simulator whose contents change between two loads
   cannot be screenshotted, demonstrated, or tested.

   It matches DS_TODAY and QZ_TODAY in the other two modules on purpose, so all
   three simulators describe the same week of the same year. Do not change it
   without changing all three. */
const AF_TODAY = '2026-08-12';


/* ---------------------------------------------------------------------------
   LESSONS — empty until prompt 3/3.

   It is declared here, now, and passed to SimEngine.init() as-is. An empty
   array is a real test: it proves the engine hookup is correct and that the
   Lessons view degrades to its empty state instead of throwing, which is
   exactly what this first prompt is meant to establish.

   Shape, for when 3/3 fills it — matching what SimEngine already consumes in
   the Docusign and Qualia modules:

     {
       id: 'l01-orientation',
       number: 1,
       title: 'Orientation: the unit is the centre of everything',
       summary: 'One sentence on what the trainee will be able to do after.',
       steps: [
         { type: 'do',        checklistId: 'af_c1_1', view: 'properties',
           walk: { target: '#afBtnSomething', text: '…', setup: () => afGoto('properties') } },
         { type: 'decide',    scenarioId: 'sc-...' },
         { type: 'verify',    reviewId: 'rev-...' },
         { type: 'reconcile', reconcileId: 'rec-...' },
         { type: 'compose',   composeId: 'cmp-...' },
         { type: 'triage',    triageId: 'tri-...' }
       ]
     }
   --------------------------------------------------------------------------- */
const AF_LESSONS = [];


/* The graded item banks, all empty until 3/3. They are declared rather than
   left undefined so that every consumer can iterate them without a guard, and
   so afAuditIntegrity() can walk them from day one. */
const AF_SCENARIOS = [];
const AF_VERIFY_ITEMS = [];
const AF_RECONCILE_ITEMS = [];
const AF_COMPOSE_ITEMS = [];
const AF_TRIAGE_ITEMS = [];

/* Exam bank and blueprint. Null rather than empty in the blueprint's case so a
   half-configured exam fails loudly instead of silently producing zero items. */
const AF_EXAM_BANK = [];
const AF_EXAM_BLUEPRINT = null;
const AF_EXAM_PASS_PCT = 0.8;


/* Checklist ids the lessons will grade. Empty now; 3/3 declares them here so
   that there is one list to audit against, rather than having to grep the view
   layer for afMark() call sites the way the Docusign module had to. */
const AF_CHECKLIST_IDS = [];
