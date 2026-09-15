const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('--- Testing AppFolio Finish Lesson Navigation to Lessons View ---');

// Mock DOM
global.window = global;
global.window.addEventListener = () => {};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementsByTagName: () => [],
  getElementById: (id) => {
    if (!global._elements) global._elements = {};
    if (!global._elements[id]) {
      global._elements[id] = {
        id,
        classList: {
          contains: () => false,
          add: () => {},
          remove: () => {},
          toggle: () => {}
        },
        value: '',
        style: {},
        innerHTML: '',
        textContent: '',
        scrollTop: 0,
        appendChild: () => {},
        remove: () => {}
      };
    }
    return global._elements[id];
  },
  querySelector: (sel) => ({
    scrollTop: 0,
    focus: () => {},
    selectionStart: 0,
    setSelectionRange: () => {},
    classList: { contains: () => false, add: () => {}, remove: () => {} },
    scrollIntoView: () => {}
  }),
  querySelectorAll: (sel) => [],
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    className: '',
    innerHTML: '',
    style: {},
    remove: () => {}
  }),
  body: { appendChild: () => {}, innerHTML: '', classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false } },
  activeElement: null
};

global.location = { search: '', pathname: '/AppFolio/testdrive-appfolio.html' };
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};
global.simToast = (msg, opts) => console.log('  [Toast]:', msg);

// Load AppFolio scripts
const scripts = [
  '../assets/js/app-core.js',
  '../assets/js/sim-engine.js',
  '../AppFolio/appfolio-data.js',
  '../AppFolio/appfolio-catalog-data.js',
  '../AppFolio/appfolio-app.js',
  '../AppFolio/appfolio-shell.js',
  '../AppFolio/appfolio-tour.js'
];

scripts.forEach(s => {
  const p = path.join(__dirname, s);
  if (fs.existsSync(p)) {
    const code = fs.readFileSync(p, 'utf8');
    vm.runInThisContext(code, { filename: p });
  }
});

afInitEngine();

console.log('\n[Case 1]: Finish Lesson 5 from Question Pop-up (afAskContinue)');
// Start Lesson 5
simWalkStart('l05-leasing-funnel');
assert.strictEqual(afState.lessonId, 'l05-leasing-funnel');
assert.strictEqual(afState.mode, 'lesson');

// Fast-forward to step 5 (index 4)
SimEngine.walkState().maxStepIndex = 4;
simWalkJumpTo(4);
const curStep = SimEngine.currentStep();
assert.strictEqual(curStep.scenarioId, 'af_s5_1', 'Step 5 must be scenario af_s5_1');

// Open question modal and answer
afAskScenario('af_s5_1');
const meta = afAskStepMeta();
assert(meta, 'Meta must exist for active step');
assert(meta.lesson && meta.index === 4, 'Must be at last step');

afAnswerScenario('af_s5_1', 1); // Option B is correct
assert(afStore.scenarios['af_s5_1'].correct, 'Scenario must be marked correct');

// Click Finish Lesson
afAskContinue();

// Verify that it transitioned directly to 'lessons'
assert.strictEqual(afState.view, 'lessons', 'afState.view must be "lessons" after Finish Lesson');
assert.strictEqual(afState.lessonId, null, 'afState.lessonId must be null');
assert.strictEqual(afState.mode, 'sandbox', 'afState.mode must be sandbox');
assert.strictEqual(SimEngine.walkActive(), false, 'Walkthrough must be inactive');
assert.strictEqual(afStore.lessonsDone['l05-leasing-funnel'], true, 'Lesson 5 must be marked completed');
console.log('✓ Case 1 Passed: Popup "Finish Lesson" takes user to "lessons" view');

console.log('\n[Case 2]: Finish Lesson via simWalkBackToLessons()');
simWalkStart('l01-orientation');
assert.strictEqual(afState.lessonId, 'l01-orientation');
simWalkShowComplete();
simWalkBackToLessons();

assert.strictEqual(afState.view, 'lessons', 'afState.view must be "lessons" after simWalkBackToLessons');
assert.strictEqual(afState.lessonId, null, 'afState.lessonId must be null');
assert.strictEqual(afStore.lessonsDone['l01-orientation'], true, 'Lesson 1 must be marked completed');
console.log('✓ Case 2 Passed: simWalkBackToLessons() takes user to "lessons" view');

console.log('\n[Case 3]: Finish Lesson via simLessonContinue()');
simWalkStart('l02-resident-ledger');
assert.strictEqual(afState.lessonId, 'l02-resident-ledger');
const l2 = AF_LESSONS.find(x => x.id === 'l02-resident-ledger');
simLessonContinue('l02-resident-ledger', l2.steps.length - 1);

assert.strictEqual(afState.view, 'lessons', 'afState.view must be "lessons" after simLessonContinue');
assert.strictEqual(afState.lessonId, null, 'afState.lessonId must be null');
assert.strictEqual(afStore.lessonsDone['l02-resident-ledger'], true, 'Lesson 2 must be marked completed');
console.log('✓ Case 3 Passed: simLessonContinue() takes user to "lessons" view');

console.log('\n=== ALL FINISH LESSON TO LESSONS TESTS PASSED SUCCESSFULLY! ===');
process.exit(0);
