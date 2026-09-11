const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- Testing Qualia Redesign ---');

// Mock browser globals
const window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: {
    data: {},
    getItem: function(k) { return this.data[k] || null; },
    setItem: function(k, v) { this.data[k] = v; },
    removeItem: function(k) { delete this.data[k]; }
  }
};
const mockElem = () => ({
  appendChild: () => {},
  addEventListener: () => {},
  style: {},
  classList: { add: () => {}, remove: () => {} },
  setAttribute: () => {},
  getAttribute: () => null
});
const document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => mockElem(),
  body: mockElem()
};
global.window = window;
global.document = document;
global.localStorage = window.localStorage;
global.navigator = { userAgent: 'node' };

// Load sim-engine.js
const simEngineCode = fs.readFileSync(path.join(__dirname, '../assets/js/sim-engine.js'), 'utf8');
vm.runInThisContext(simEngineCode);
Object.assign(global, window);

// Load qualia-catalog-data.js
const catalogCode = fs.readFileSync(path.join(__dirname, '../Quialia/qualia-catalog-data.js'), 'utf8');
vm.runInThisContext(catalogCode);

// Load qualia-data.js
const qualiaDataCode = fs.readFileSync(path.join(__dirname, '../Quialia/qualia-data.js'), 'utf8');
vm.runInThisContext(qualiaDataCode);

// Load qualia-app.js
const qualiaAppCode = fs.readFileSync(path.join(__dirname, '../Quialia/qualia-app.js'), 'utf8');
vm.runInThisContext(qualiaAppCode);

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(' [PASS]', msg);
    passed++;
  } else {
    console.error(' [FAIL]', msg);
    failed++;
  }
}

// 1. Check sim-engine lockMode
console.log('\n1. Engine lockMode & sequential/all-open tests:');
const mockLessons = [
  { id: 'l1', number: 1, steps: [{ checklistId: 's1' }] },
  { id: 'l2', number: 2, steps: [{ checklistId: 's2' }] },
  { id: 'l3', number: 3, steps: [{ checklistId: 's3' }] }
];
let testStore = { checklist: {}, lessonsDone: {} };

SimEngine.init({
  lessons: mockLessons,
  lockMode: 'sequential',
  store: () => testStore,
  lessonEverComplete: id => !!testStore.lessonsDone[id]
});

assert(SimEngine.lessonState(0) === 'unlocked', 'Sequential: Lesson 0 is unlocked');
assert(SimEngine.lessonState(1) === 'locked', 'Sequential: Lesson 1 is locked before Lesson 0 is complete');
assert(SimEngine.lessonState(2) === 'locked', 'Sequential: Lesson 2 is locked');

// Switch to all-open
SimEngine.init({
  lessons: mockLessons,
  lockMode: 'all-open',
  store: () => testStore,
  lessonEverComplete: id => !!testStore.lessonsDone[id]
});

assert(SimEngine.lessonState(0) === 'unlocked', 'All-open: Lesson 0 is unlocked');
assert(SimEngine.lessonState(1) === 'unlocked', 'All-open: Lesson 1 is unlocked');
assert(SimEngine.lessonState(2) === 'unlocked', 'All-open: Lesson 2 is unlocked');

// Mark lesson 1 complete
testStore.lessonsDone['l2'] = true;
assert(SimEngine.lessonState(1) === 'done', 'All-open: Lesson 1 marked done returns "done"');
assert(SimEngine.lessonState(0) === 'unlocked', 'All-open: Lesson 0 is still unlocked');

// Check Qualia's 10 lessons in all-open mode
SimEngine.init({
  lessons: QZ_LESSONS,
  lockMode: 'all-open',
  store: () => qzStore,
  lessonEverComplete: qzLessonEverComplete
});

assert(QZ_LESSONS.length === 10, 'QZ_LESSONS contains 10 lessons');
const allUnlocked = QZ_LESSONS.every((l, idx) => SimEngine.lessonState(idx) === 'unlocked');
assert(allUnlocked, 'All 10 Qualia lessons are unlocked from scratch with lockMode: "all-open"');

// 2. Check cross references
console.log('\n2. Checking for cross references in qualia-data.js:');
// Strip comments before checking user-facing strings
const qzDataCodeNoComments = qualiaDataCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
const forbiddenPhrases = [
  /in a later lesson/i,
  /in lesson 2/i,
  /in lesson \d/i,
  /verified in lesson/i
];
let crossRefMatches = 0;
forbiddenPhrases.forEach(regex => {
  const match = qzDataCodeNoComments.match(regex);
  if (match) {
    console.error('Found forbidden cross-reference:', match[0]);
    crossRefMatches++;
  }
});
assert(crossRefMatches === 0, 'No forbidden cross-references ("in Lesson X", "in a later lesson") found in user-facing qualia-data.js');

// 3. Introductory navigation steps
console.log('\n3. Checking introductory navigation steps:');
const l1 = QZ_LESSONS.find(l => l.id === 'l01-orientation');
const l2 = QZ_LESSONS.find(l => l.id === 'l02-verify-against-source');
const l3 = QZ_LESSONS.find(l => l.id === 'l03-documents');
const l4 = QZ_LESSONS.find(l => l.id === 'l04-communication');
const l7 = QZ_LESSONS.find(l => l.id === 'l07-conflicting-sources');
const l9 = QZ_LESSONS.find(l => l.id === 'l09-triage');
const l10 = QZ_LESSONS.find(l => l.id === 'l10-capstone');

assert(l2 && l2.steps[0].checklistId === 'orders-open', 'L2 starts with orders-open navigation step');
assert(l3 && l3.steps[0].checklistId === 'orders-open', 'L3 starts with orders-open navigation step');
assert(l4 && l4.steps.some(s => s.type === 'compose' && s.composeId === 'cmp-1398-reply'), 'L4 has compose step cmp-1398-reply');
assert(l7 && l7.steps[0].walk && l7.steps[0].walk.skipClick === true, 'L7 starts with contextual do step with skipClick: true');
assert(l9 && l9.steps[0].walk.text.includes('start of your shift'), 'L9 starts with shift briefing narrative');

// 4. Capstone Unique Exercises
console.log('\n4. Checking Capstone unique exercises:');
assert(l10.steps.length === 4, 'L10 has 4 steps');
assert(l10.steps[0].type === 'verify' && l10.steps[0].reviewId === 'rev-1512-buyer', 'L10 step 0 is rev-1512-buyer');
assert(l10.steps[1].type === 'reconcile' && l10.steps[1].reconcileId === 'rec-capstone-closing', 'L10 step 1 is rec-capstone-closing');
assert(l10.steps[2].type === 'decide' && l10.steps[2].scenarioId === 'over-escalation', 'L10 step 2 is over-escalation');
assert(l10.steps[3].type === 'compose' && l10.steps[3].composeId === 'cmp-capstone-summary', 'L10 step 3 is cmp-capstone-summary');

const rev1512 = QZ_REVIEWS.find(r => r.id === 'rev-1512-buyer');
assert(!!rev1512, 'rev-1512-buyer exists in QZ_REVIEWS');
assert(rev1512 && rev1512.doc === 'documents/purchase-agreement-1512.html', 'rev-1512-buyer references purchase-agreement-1512.html');

const recCapstone = QZ_RECONCILES.find(r => r.id === 'rec-capstone-closing');
assert(!!recCapstone, 'rec-capstone-closing exists in QZ_RECONCILES');

const cmpCapstone = QZ_COMPOSES.find(c => c.id === 'cmp-capstone-summary');
assert(!!cmpCapstone, 'cmp-capstone-summary exists in QZ_COMPOSES');
assert(cmpCapstone && cmpCapstone.rubric.length === 5, 'cmp-capstone-summary has 5 rubric criteria');

// Check that files exist on disk
const doc1512Path = path.join(__dirname, '../Quialia/documents/purchase-agreement-1512.html');
const doc1398Path = path.join(__dirname, '../Quialia/documents/purchase-agreement-1398.html');
assert(fs.existsSync(doc1512Path), 'purchase-agreement-1512.html exists on disk');
assert(fs.existsSync(doc1398Path), 'purchase-agreement-1398.html exists on disk');

const doc1512Content = fs.readFileSync(doc1512Path, 'utf8');
assert(doc1512Content.includes('Marcus A. Webb') && doc1512Content.includes('$428,500.00'), 'purchase-agreement-1512.html has correct buyer and price');

// 5. Rubrics grading
console.log('\n5. Checking Rubric grading:');
const l4ModelAnswer = "Thanks for following up, Paula. I'm aware of a delay with the final loan documents on 219 Lakeshore Drive and I'm working on getting a confirmed timeline from the lender. I don't have a new closing date to share yet — that decision needs to come from my supervisor once we have firm dates. I'll follow up with you by Thursday with whatever I have, even if the only update is that we're still waiting.";
const cmp1398 = QZ_COMPOSES.find(c => c.id === 'cmp-1398-reply');
const l4Grade = qzComposeGrade(cmp1398, l4ModelAnswer, { order: qzGetOrder('ORD-2026-1398') });
assert(l4Grade.correct, 'L4 model answer passes all 6 rubric criteria');
if (!l4Grade.correct) {
  console.log('L4 Grade results:', l4Grade.results);
}

const capstoneModelAnswer = "Hi Sarah, here is my review summary for Order ORD-2026-1512 (812 Birchwood Lane):\n\nCorrections Made:\n- Corrected Buyer legal name from Marcus Webb to Marcus A. Webb to match the Purchase Agreement.\n- Verified closing date discrepancy on file.\n\nEscalations for Your Attention:\n- Closing date conflict: The Purchase Agreement states August 11, 2026, but the Closing Disclosure states August 25, 2026. Needs supervisor approval/decision.\n- Routine lender payoff delay was confirmed normal and not escalated.\n\nPlease let me know how to proceed.";
const capstoneGrade = qzComposeGrade(cmpCapstone, capstoneModelAnswer, { order: qzGetOrder('ORD-2026-1512') });
assert(capstoneGrade.correct, 'Capstone model answer passes all 5 rubric criteria');
if (!capstoneGrade.correct) {
  console.log('Capstone Grade results:', capstoneGrade.results);
}

// 6. Analytics tracking
console.log('\n6. Checking Analytics tracking:');
qzStore = qzDefaultStore();
assert(qzStore.analytics && typeof qzStore.analytics.lessonStarts === 'object', 'Store has analytics schema');

// Test backward compatibility in qzLoad
qzStore = { lessonsDone: {}, reconciles: {} }; // no analytics field
qzSave();
qzLoad();
assert(qzStore.analytics && qzStore.analytics.lessonStarts, 'qzLoad adds analytics defaults if missing in existing store');

// Test tracking
qzTrackLessonStart('l08-wire-fraud');
assert(qzStore.analytics.lessonStarts['l08-wire-fraud'] > 0, 'qzTrackLessonStart recorded timestamp for l08');

qzTrackStepAttempt('l08-wire-fraud', 1);
qzTrackStepAttempt('l08-wire-fraud', 1);
assert(qzStore.analytics.stepAttempts['l08-wire-fraud'][1] === 2, 'qzTrackStepAttempt counted 2 attempts for step 1');
assert(qzStore.analytics.stepFirstAttempts['l08-wire-fraud'][1] > 0, 'qzTrackStepAttempt recorded stepFirstAttempts');

qzNoteLessonComplete('l08-wire-fraud');
assert(qzStore.analytics.lessonCompletes['l08-wire-fraud'] > 0, 'qzNoteLessonComplete recorded timestamp');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
