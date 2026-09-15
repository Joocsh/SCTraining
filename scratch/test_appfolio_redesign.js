const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- Testing AppFolio Redesign ---');

// Mock browser globals
const mockElem = () => ({
  appendChild: () => {},
  addEventListener: () => {},
  style: {},
  classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
  setAttribute: () => {},
  getAttribute: () => null,
  innerHTML: '',
  value: ''
});
const rootEl = mockElem();
const window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  innerWidth: 1024,
  localStorage: {
    data: {},
    getItem: function(k) { return this.data[k] || null; },
    setItem: function(k, v) { this.data[k] = v; },
    removeItem: function(k) { delete this.data[k]; }
  }
};
const document = {
  getElementById: (id) => rootEl,
  querySelector: () => rootEl,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => mockElem(),
  body: mockElem()
};
global.window = window;
global.document = document;
global.localStorage = window.localStorage;
global.navigator = { userAgent: 'node' };

// Load SimEngine
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../assets/js/sim-engine.js'), 'utf8'));
Object.assign(global, window);

// Load AppFolio catalog data
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-catalog-data.js'), 'utf8'));
Object.assign(global, window);

// Load AppFolio data
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-data.js'), 'utf8'));
Object.assign(global, window);

// Load AppFolio app
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-app.js'), 'utf8'));
Object.assign(global, window);

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

// Initialize engine as done in appfolio-app
afInitEngine();

// 1. Engine & All-Open Unlocking
console.log('\n1. Verifying lockMode all-open & lesson availability:');
assert(AF_LESSONS.length === 13, 'AF_LESSONS has 13 lessons');
const allUnlocked = AF_LESSONS.every((l, idx) => SimEngine.lessonState(idx) === 'unlocked');
assert(allUnlocked, 'All 13 AppFolio lessons are unlocked from scratch with lockMode: "all-open"');

// 2. Step counts and distribution
console.log('\n2. Verifying step counts and distribution:');
const totalSteps = AF_LESSONS.reduce((acc, l) => acc + l.steps.length, 0);
assert(totalSteps === 56, `Total steps across all 13 lessons is 56 (got ${totalSteps})`);

const expectedDistribution = {
  'l01-orientation': { count: 5, types: ['do', 'do', 'do', 'do', 'decide'] },
  'l02-resident-ledger': { count: 4, types: ['do', 'do', 'verify', 'decide'] },
  'l03-posting-rent-late-fees': { count: 4, types: ['do', 'do', 'do', 'decide'] },
  'l04-delinquency-collection-ladder': { count: 4, types: ['do', 'do', 'decide', 'decide'] },
  'l05-leasing-funnel': { count: 5, types: ['do', 'do', 'do', 'do', 'decide'] },
  'l06-fair-housing-writing': { count: 4, types: ['verify', 'compose', 'decide', 'decide'] },
  'l07-screening-adverse-action': { count: 3, types: ['verify', 'compose', 'decide'] },
  'l08-assistance-animals-vs-pets': { count: 3, types: ['decide', 'decide', 'compose'] },
  'l09-move-in-lease-deposit': { count: 5, types: ['do', 'do', 'do', 'do', 'verify'] },
  'l10-maintenance-dispatch-compliance': { count: 5, types: ['do', 'do', 'do', 'decide', 'decide'] },
  'l11-move-out-deposit-accounting': { count: 4, types: ['verify', 'reconcile', 'do', 'compose'] },
  'l12-owner-statements-trust-boundary': { count: 4, types: ['verify', 'reconcile', 'decide', 'decide'] },
  'l13-capstone-monday-morning-queue': { count: 6, types: ['triage', 'decide', 'decide', 'triage', 'reconcile', 'compose'] }
};

for (const [id, exp] of Object.entries(expectedDistribution)) {
  const l = AF_LESSONS.find(x => x.id === id);
  assert(l && l.steps.length === exp.count, `${id} has ${exp.count} steps`);
  const actualTypes = l.steps.map(s => s.type);
  assert(JSON.stringify(actualTypes) === JSON.stringify(exp.types), `${id} types match: [${exp.types.join(', ')}]`);
}

// 3. New Items Verification
console.log('\n3. Verifying new items in banks:');
assert(!!AF_SCENARIOS.find(s => s.id === 'af_s1_1'), 'af_s1_1 exists in AF_SCENARIOS');
assert(!!AF_SCENARIOS.find(s => s.id === 'af_s2_1'), 'af_s2_1 exists in AF_SCENARIOS');
assert(!!AF_SCENARIOS.find(s => s.id === 'af_s5_1'), 'af_s5_1 exists in AF_SCENARIOS');

const v6 = AF_VERIFY_ITEMS.find(v => v.id === 'af_v6_1');
assert(!!v6, 'af_v6_1 exists in AF_VERIFY_ITEMS');
assert(v6 && v6.targetPhraseId === 'PH-3', 'af_v6_1 has targetPhraseId PH-3');

const rec12 = AF_RECONCILE_ITEMS.find(r => r.id === 'af_rec12_1');
assert(!!rec12, 'af_rec12_1 exists in AF_RECONCILE_ITEMS');
assert(rec12 && rec12.expectedNetRefundCents === 227300, 'af_rec12_1 expected net distribution is $2,273.00');

const cmp11 = AF_COMPOSE_ITEMS.find(c => c.id === 'af_cmp11_1');
assert(!!cmp11, 'af_cmp11_1 exists in AF_COMPOSE_ITEMS');
assert(cmp11 && cmp11.rubric.length === 4, 'af_cmp11_1 has 4 rubric criteria');

const cmp13 = AF_COMPOSE_ITEMS.find(c => c.id === 'af_cmp13_1');
assert(!!cmp13, 'af_cmp13_1 exists in AF_COMPOSE_ITEMS');
assert(cmp13 && cmp13.rubric.length === 4, 'af_cmp13_1 has 4 rubric criteria');

// 4. Rubric checks
console.log('\n4. Verifying rubric checks:');
const sampleCoverLetter = "Dear Samuel Oak,\n\nEnclosed please find your security deposit refund check in the exact amount of $2,370.00 following your surrender of Unit 11-102. From your original $2,900.00 deposit, lawful itemized deductions were made: $350.00 for drywall patching and repair, and $180.00 for deep carpet cleaning to remove pet stains. No deductions were assessed for normal wear and tear. If you wish to dispute any of these itemized deductions, you have the right to submit a written notice to management.";
const results11 = cmp11.rubric.map(c => {
  const fn = AF_RUBRIC_CHECKS[c.check];
  return fn ? !!fn(sampleCoverLetter) : false;
});
assert(results11.every(Boolean), 'af_cmp11_1 model response passes all 4 rubric checks');

const sampleEmergencyEscalation = "Dear Eleanor Vance,\n\nI am writing to request emergency authorization for an immediate HVAC compressor replacement at Unit 12-104. The unit currently has no cooling during our current 94-degree heatwave, presenting an urgent habitability and tenant health emergency under Texas Property Code § 92.056. We have received a firm estimate of $4,800.00 from Lone Star HVAC to complete the repair today. Because this exceeds my discretionary spending authority of $2,500.00, please confirm your authorization to proceed.";
const results13 = cmp13.rubric.map(c => {
  const fn = AF_RUBRIC_CHECKS[c.check];
  return fn ? !!fn(sampleEmergencyEscalation) : false;
});
assert(results13.every(Boolean), 'af_cmp13_1 model response passes all 4 rubric checks');

// 5. Triage grading (af_tri13_1 and af_tri13_2)
console.log('\n5. Verifying triage evaluation:');
afState.mode = 'lesson';
afState.lessonId = 'l13-capstone-monday-morning-queue';

// Test af_tri13_1
afDemo.triageOrders = {};
const tri1 = AF_TRIAGE_ITEMS.find(t => t.id === 'af_tri13_1');
afDemo.triageOrders['af_tri13_1'] = tri1.items.slice().sort((a, b) => a.correctRank - b.correctRank);
afSubmitTriage('af_tri13_1');
assert(afStore.triages['af_tri13_1'] && afStore.triages['af_tri13_1'].correct === true, 'af_tri13_1 grades correct when top 3 match');

// Test af_tri13_2
const tri2 = AF_TRIAGE_ITEMS.find(t => t.id === 'af_tri13_2');
afDemo.triageOrders['af_tri13_2'] = tri2.items.slice().sort((a, b) => a.correctRank - b.correctRank);
afSubmitTriage('af_tri13_2');
assert(afStore.triages['af_tri13_2'] && afStore.triages['af_tri13_2'].correct === true, 'af_tri13_2 grades correct when top 3 match');

// 6. Review grading for phrases (af_v6_1)
console.log('\n6. Verifying review grading for phrases (af_v6_1):');
afState.lessonId = 'l06-fair-housing-writing';
afAnswerReview('af_v6_1', 'PH-3');
assert(afStore.reviews['af_v6_1'] && afStore.reviews['af_v6_1'].correct === true, 'af_v6_1 answers correctly for targetPhraseId PH-3');

afAnswerReview('af_v6_1', 'PH-1');
assert(afStore.reviews['af_v6_1'] && afStore.reviews['af_v6_1'].correct === false, 'af_v6_1 answers incorrectly for non-violation phrase');

// 7. Analytics tracking & backward compatibility
console.log('\n7. Verifying analytics tracking:');
afResetProgress();
assert(afStore.analytics && typeof afStore.analytics.lessonStarts === 'object', 'afStore has analytics schema by default');

// Backward compatibility in afLoad
localStorage.setItem(AF_LS_KEY, JSON.stringify({ checklist: {}, scenarios: {} })); // no analytics
afLoad();
assert(afStore.analytics && typeof afStore.analytics.lessonStarts === 'object', 'afLoad ensures analytics defaults if missing in localStorage');

// Test track start
afTrackLessonStart('l13-capstone-monday-morning-queue');
assert(afStore.analytics.lessonStarts['l13-capstone-monday-morning-queue'] > 0, 'afTrackLessonStart records timestamp');

// Test track step attempts via answering
afState.mode = 'lesson';
afState.lessonId = 'l01-orientation';
afAnswerScenario('af_s1_1', 1);
assert(afStore.analytics.stepAttempts['l01-orientation']['4'] === 1, 'afRecordAnswer tracks stepAttempt for decide step in L1 (step 4)');
assert(afStore.analytics.stepFirstAttempts['l01-orientation']['4'] > 0, 'afRecordAnswer tracks stepFirstAttempts for decide step in L1');

// Second attempt
afAnswerScenario('af_s1_1', 0);
assert(afStore.analytics.stepAttempts['l01-orientation']['4'] === 2, 'afRecordAnswer increments stepAttempts on second attempt');

// Test note complete
afNoteLessonComplete('l01-orientation');
assert(afStore.analytics.lessonCompletes['l01-orientation'] > 0, 'afNoteLessonComplete records timestamp in analytics');

// 8. Independence check
console.log('\n8. Checking independence of L9 and Capstone:');
const appAda = AFC_APPLICATIONS.find(a => a.id === 'APP-ADA-01');
assert(!!appAda, 'APP-ADA-01 is static in AFC_APPLICATIONS for L9');
assert(appAda && appAda.status === 'approved', 'APP-ADA-01 is pre-approved for L9 move-in execution');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
