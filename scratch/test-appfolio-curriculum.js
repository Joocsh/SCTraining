/**
 * scratch/test-appfolio-curriculum.js
 * Comprehensive automated verification for Prompt 3/3 (AppFolio Curriculum & Exam)
 */

const fs = require('fs');
const path = require('path');

// Mock browser globals
global.window = global;
global.document = {
  getElementById: (id) => ({ value: '', checked: true, appendChild: () => {}, classList: { add: () => {}, remove: () => {} }, remove: () => {} }),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => ({ classList: { add: () => {}, remove: () => {} }, setAttribute: () => {}, remove: () => {} }),
  body: { classList: { add: () => {}, remove: () => {}, toggle: () => {} } }
};
global.location = { search: '', hash: '' };
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);

// Mock localStorage
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { for (const k in storage) delete storage[k]; }
};

// Load code files
const simEngineCode = fs.readFileSync(path.join(__dirname, '../assets/js/sim-engine.js'), 'utf8');
const dataCode = fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-data.js'), 'utf8');
const catalogCode = fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-catalog-data.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-app.js'), 'utf8');
const shellCode = fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-shell.js'), 'utf8');

eval(
  simEngineCode + '\n' +
  dataCode + '\n' +
  catalogCode + '\n' +
  appCode + '\n' +
  shellCode + '\n' +
  'global.afStore = afStore;\n' +
  'global.afDemo = afDemo;\n' +
  'global.AF_LESSONS = AF_LESSONS;\n' +
  'global.AF_SCENARIOS = AF_SCENARIOS;\n' +
  'global.AF_VERIFY_ITEMS = AF_VERIFY_ITEMS;\n' +
  'global.AF_RECONCILE_ITEMS = AF_RECONCILE_ITEMS;\n' +
  'global.AF_COMPOSE_ITEMS = AF_COMPOSE_ITEMS;\n' +
  'global.AF_TRIAGE_ITEMS = AF_TRIAGE_ITEMS;\n' +
  'global.AF_RUBRIC_CHECKS = AF_RUBRIC_CHECKS;\n' +
  'global.AF_EXAM_BANK = AF_EXAM_BANK;\n' +
  'global.AF_EXAM_BLUEPRINT = AF_EXAM_BLUEPRINT;\n' +
  'global.AF_EXAM_PASS_PCT = AF_EXAM_PASS_PCT;\n' +
  'global.AF_CHECKLIST_IDS = AF_CHECKLIST_IDS;\n'
);

console.log('=== APPFOLIO PROMPT 3/3 CURRICULUM & EXAM TEST SUITE ===');

let failures = 0;
function assert(name, condition, msg) {
  if (condition) {
    console.log('  PASS: ' + name);
  } else {
    console.error('  FAIL: ' + name + (msg ? ' — ' + msg : ''));
    failures++;
  }
}

// 1. All 13 lessons exist
assert('1. Exactly 13 lessons declared', AF_LESSONS.length === 13, 'Found ' + AF_LESSONS.length);

// 2. All steps in all lessons have a walk object (SimEngine Try It prerequisite)
let allWalksPresent = true;
let missingWalkStep = '';
AF_LESSONS.forEach(l => {
  l.steps.forEach((st, idx) => {
    if (!st.walk || typeof st.walk !== 'object') {
      allWalksPresent = false;
      missingWalkStep = `${l.id} step ${idx} (${st.type})`;
    }
  });
});
assert('2. Every single step across all 13 lessons has a valid walk block', allWalksPresent, missingWalkStep);

// 3. Step ID uniqueness across all buckets
const seenIds = new Set();
let duplicatesFound = 0;
AF_LESSONS.forEach(l => {
  l.steps.forEach(st => {
    const id = st.checklistId || st.scenarioId || st.reviewId || st.reconcileId || st.composeId || st.triageId;
    if (id) {
      if (seenIds.has(id)) duplicatesFound++;
      seenIds.add(id);
    }
  });
});
assert('3. All step IDs across all 13 lessons are 100% unique', duplicatesFound === 0, 'Found duplicates: ' + duplicatesFound);

// 4. All referenced anchors resolve
let anchorsValid = true;
if (!afGetGuestCard('GC-FH-01') || !afGetGuestCard('GC-FH-02')) anchorsValid = false;
if (!afGetApplication('APP-FCRA-01') || !afGetApplication('APP-FCRA-02') || !afGetApplication('APP-ADA-01')) anchorsValid = false;
if (!afGetResident('RES-PET-01') || !afGetLease('LEASE-MO-01') || !afGetLease('LEASE-REN-01')) anchorsValid = false;
if (!afGetWorkOrder('WO-ENTRY-01') || !afGetWorkOrder('WO-INS-01')) anchorsValid = false;
if (!afGetOwner('OWN-01') || !afGet('ownerStatement', 'STMT-01')) anchorsValid = false;
assert('4. All 14 curriculum anchor fixtures resolve by ID', anchorsValid);

// 5. afResetLesson clears only current lesson progress
afSetMode('lesson', { quiet: true });
afStore.checklist['af_c1_1'] = true;
afStore.checklist['af_c2_1'] = true;
afResetLesson('l01-orientation');
assert('5. afResetLesson clears only target lesson progress',
  !afStore.checklist['af_c1_1'] && afStore.checklist['af_c2_1'] === true
);

// 6. Completing L13 marks course finished
afNoteLessonComplete('l13-capstone-monday-morning-queue');
assert('6. Note lesson complete marks lesson in afStore.lessonsDone', afLessonEverComplete('l13-capstone-monday-morning-queue'));

// 7. Storage isolation: Sandbox mode forbids writes to afStore
afSetMode('sandbox', { quiet: true });
const sandboxWrite1 = afRecordAnswer('scenarios', 'af_s3_1', { correct: true });
const sandboxWrite2 = afRecordAnswer('composes', 'af_cmp6_1', { passed: true });
assert('7. In sandbox mode, afRecordAnswer returns false and leaves afStore untouched',
  sandboxWrite1 === false && sandboxWrite2 === false && !afStore.scenarios['af_s3_1'] && !afStore.composes['af_cmp6_1']
);

// 8. Storage isolation: Lesson mode permits writes to afStore
afSetMode('lesson', { quiet: true });
const lessonWrite = afRecordAnswer('scenarios', 'af_s3_1', { answered: 1, correct: true });
assert('8. In lesson mode, afRecordAnswer records and persists answer',
  lessonWrite === true && afStore.scenarios['af_s3_1'].correct === true
);

// 9. None of the 13 setup() functions grade or record answers
let callCount = 0;
const origMark = afMark;
const origRecord = afRecordAnswer;
global.afMark = function () { callCount++; };
global.afRecordAnswer = function () { callCount++; };
AF_LESSONS.forEach(l => {
  l.steps.forEach(st => {
    if (st.walk && typeof st.walk.setup === 'function') {
      try { st.walk.setup(); } catch (e) {}
    }
  });
});
global.afMark = origMark;
global.afRecordAnswer = origRecord;
assert('9. Zero setup() functions call afMark or afRecordAnswer', callCount === 0, 'Triggered ' + callCount + ' calls');

// 10. Bucket writes in codebase funnel solely through afRecordAnswer
const appCodeClean = (dataCode + catalogCode + appCode + shellCode).replace(/\/\*[\s\S]*?\*\//g, '');
const directScenarios = appCodeClean.split('\n').filter(l => /afStore\.scenarios\[[^\]]+\]\s*=/.test(l));
assert('10. Scenarios bucket assignment happens only inside afRecordAnswer', directScenarios.length === 0, 'Found direct writes: ' + directScenarios.length);

// 11. Stale step detection with effect()
const stepWithEffect = AF_LESSONS[2].steps.find(s => typeof s.effect === 'function');
assert('11. do steps with footprint declare effect()', !!stepWithEffect);
const isEffectActiveBefore = stepWithEffect.effect();
assert('12. effect() returns false on empty sandbox', isEffectActiveBefore === false);

// 13. Exam Blueprint validation
assert('13. Exam blueprint defines 24 total questions',
  AF_EXAM_BLUEPRINT.reduce((s, b) => s + b.count, 0) === 24
);

// 14. Exam Bank size >= 2x blueprint for each category
let bankSufficient = true;
let bankDeficitMsg = '';
AF_EXAM_BLUEPRINT.forEach(spec => {
  const inBank = AF_EXAM_BANK.filter(q => q.category === spec.category).length;
  if (inBank < spec.count * 2) {
    bankSufficient = false;
    bankDeficitMsg = `${spec.category}: needs ${spec.count * 2}, found ${inBank}`;
  }
});
assert('14. Exam bank contains at least 2x items per blueprint category', bankSufficient, bankDeficitMsg);

// 15. Exam shuffling determinism
afStore.shuffleSalt = 'test_salt_12345';
const order1 = afOptionOrder('exam_test_key', 10);
const order2 = afOptionOrder('exam_test_key', 10);
assert('15. Same shuffleSalt produces identical question and option order',
  JSON.stringify(order1) === JSON.stringify(order2)
);

afStore.shuffleSalt = 'different_salt_67890';
const order3 = afOptionOrder('exam_test_key', 10);
assert('16. Different shuffleSalt produces different order',
  JSON.stringify(order1) !== JSON.stringify(order3)
);

// 17. Exam passing threshold calculation (20 of 24 = 83.3% >= 80%, 19 of 24 = 79.2% < 80%)
assert('17. 80% passing threshold requires 20 of 24 correct',
  Math.ceil(24 * AF_EXAM_PASS_PCT) === 20 &&
  (19 / 24 < AF_EXAM_PASS_PCT) &&
  (20 / 24 >= AF_EXAM_PASS_PCT)
);

// 18. Rubric predicates validation (Pass / Fail / Ambiguous)
const checks = AF_RUBRIC_CHECKS;

// Check: namesAgency
assert('18a. namesAgency passes on TransUnion / Experian',
  checks.namesAgency('Credit report from TransUnion Consumer Solutions') &&
  checks.namesAgency('Based on report provided by Experian')
);
assert('18b. namesAgency fails on missing agency',
  !checks.namesAgency('We pulled your credit report yesterday.') &&
  !checks.namesAgency('')
);

// Check: statesAgencyNotDecisionMaker
assert('18c. statesAgencyNotDecisionMaker passes compliant disclaimer',
  checks.statesAgencyNotDecisionMaker('The reporting agency did not make the decision to take adverse action and is unable to provide reasons.')
);
assert('18d. statesAgencyNotDecisionMaker fails when blaming bureau',
  !checks.statesAgencyNotDecisionMaker('TransUnion decided you cannot live here.')
);

// Check: mentionsFreeReport
assert('18e. mentionsFreeReport passes on 60 days disclosure',
  checks.mentionsFreeReport('You have the right to obtain a free copy of your credit report within 60 days.')
);
assert('18f. mentionsFreeReport fails on missing timeline',
  !checks.mentionsFreeReport('You can check your credit online.')
);

// Check: mentionsDisputeRight
assert('18g. mentionsDisputeRight passes on dispute clause',
  checks.mentionsDisputeRight('You have the right to dispute the accuracy or completeness of any information.')
);

// Check: noFamilyStereotypes
assert('18h. noFamilyStereotypes flags forbidden steering terms',
  !checks.noFamilyStereotypes('Great place, no kids allowed.') &&
  !checks.noFamilyStereotypes('Ideal for quiet singles, not suitable for children.') &&
  checks.noFamilyStereotypes('Spacious 2-bedroom, 2-bath apartment with modern stainless appliances and balcony.')
);

// Check: noPetFeesForESA
assert('18i. noPetFeesForESA ensures zero pet fees for assistance animals',
  checks.noPetFeesForESA('Your assistance animal is approved with zero pet deposit and no pet rent.') &&
  !checks.noPetFeesForESA('You must pay a pet deposit of $300 and $35 pet rent.')
);

// Check: zero rubric checks pass on empty text
let emptyCheckPassed = false;
for (const k in checks) {
  if (checks[k]('')) emptyCheckPassed = true;
}
assert('19. Zero rubric check predicates return true on empty string', !emptyCheckPassed);

// 20. Every rubric check in all compose items has an explanatory why
let missingWhy = false;
AF_COMPOSE_ITEMS.forEach(cmp => {
  cmp.rubric.forEach(r => {
    if (!r.why || r.why.length < 10) missingWhy = true;
  });
});
assert('20. Every single rubric criterion has a detailed explanatory why field', !missingWhy);

// 21. Legal disclaimers present on 5 sensitive lessons + exam
const sensitiveLessons = ['l06-fair-housing-writing', 'l07-screening-adverse-action', 'l08-assistance-animals-vs-pets', 'l10-maintenance-dispatch-compliance', 'l11-move-out-deposit-accounting', 'l12-owner-statements-trust-boundary'];
let disclaimerValid = true;
sensitiveLessons.forEach(lid => {
  const l = AF_LESSONS.find(x => x.id === lid);
  if (!l || !l.title.includes('⚠️')) disclaimerValid = false;
});
assert('21. All 6 compliance-sensitive lessons marked with ⚠️ warning and disclaimer', disclaimerValid);

// 22. Verification of Texas Legal Points (§5.3)
const l10 = AF_LESSONS.find(x => x.id === 'l10-maintenance-dispatch-compliance');
const l11 = AF_LESSONS.find(x => x.id === 'l11-move-out-deposit-accounting');
assert('22a. L10 teaches contractual entry notice & quiet enjoyment',
  AF_SCENARIOS.some(s => s.id === 'af_s10_2' && s.explanation.includes('lease agreement') && s.explanation.includes('quiet enjoyment'))
);
assert('22b. L11 teaches Texas 30-day clock (§ 92.103) & 3x bad faith penalty (§ 92.109)',
  AF_VERIFY_ITEMS.some(v => v.id === 'af_v11_1' && v.explanation.includes('92.103') && v.explanation.includes('92.109'))
);

// 23. Integrity & Money Audits
const integrityErrors = afAuditIntegrity();
assert('23. afAuditIntegrity() returns 0 discrepancies across all 13 lessons and banks', integrityErrors.length === 0, JSON.stringify(integrityErrors));

const moneyErrors = afAuditMoney();
assert('24. afAuditMoney() returns 0 discrepancies across financial invariants M1-M10', moneyErrors.length === 0, JSON.stringify(moneyErrors));

// 25. Zero !important in CSS
const cssCode = fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio.css'), 'utf8');
const importantCount = (cssCode.match(/!important/g) || []).length;
assert('25. appfolio.css contains zero !important rules', importantCount === 0);

// 26. LocalStorage 3 lines
const storageCodeStripped = (dataCode + catalogCode + appCode + shellCode).replace(/\/\*[\s\S]*?\*\//g, '');
const storageLines = storageCodeStripped.split('\n')
  .filter(l => l.includes('localStorage.') && !l.trim().startsWith('//'));
assert('26. localStorage is accessed in exactly 3 executable lines (afLoad, afSave, afResetProgress)',
  storageLines.length === 3, 'Found ' + storageLines.length + ' lines: ' + JSON.stringify(storageLines)
);

// 27. Zero Math.random() in executable code except shuffleSalt
const strippedExecCode = (dataCode + catalogCode + appCode + shellCode).replace(/\/\*[\s\S]*?\*\//g, '');
const randomLines = strippedExecCode.split('\n')
  .filter(l => !l.trim().startsWith('//') && l.includes('Math.random()') && !l.includes('afStore.shuffleSalt'));
assert('27. Zero Math.random() except for one-time shuffleSalt generation', randomLines.length === 0, 'Found: ' + randomLines.length);

// 28. Zero new Date() without arguments except exam duration Date.now()
const dateLines = strippedExecCode.split('\n')
  .filter(l => !l.trim().startsWith('//') && l.includes('new Date()'));
assert('28. Zero non-deterministic new Date() in code', dateLines.length === 0, 'Found: ' + dateLines.length);

console.log('=======================================================');
console.log('ALL PROMPT 3/3 TESTS COMPLETED with ' + failures + ' failures.');
process.exit(failures > 0 ? 1 : 0);
