const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

global.window = global;
global.window.addEventListener = () => {};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const elements = {};
const createMockEl = () => ({
  style: {},
  classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
  appendChild: () => {}, remove: () => {}, innerHTML: '', textContent: '',
  getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 50, bottom: 150, right: 300 })
});

global.localStorage = { _s: {}, getItem(k){return this._s[k]||null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} };
global.location = { search: '', pathname: '/AppFolio/testdrive-appfolio.html' };
global.document = {
  addEventListener: () => {}, removeEventListener: () => {}, getElementsByTagName: () => [],
  documentElement: { clientHeight: 800, clientWidth: 1280 },
  getElementById: (id) => elements[id] || (elements[id] = createMockEl()),
  querySelector: (sel) => createMockEl(), querySelectorAll: () => [],
  createElement: () => createMockEl(), body: createMockEl()
};
global.simToast = () => {};

vm.runInThisContext(fs.readFileSync('assets/js/app-core.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('assets/js/sim-engine.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('AppFolio/appfolio-catalog-data.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('AppFolio/appfolio-data.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('AppFolio/appfolio-app.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('AppFolio/appfolio-shell.js', 'utf8'));

afInitEngine();

console.log('--- Step 1: Start Lesson 5 ---');
simWalkStart('l05-leasing-funnel');
assert.strictEqual(SimEngine.walkState().stepIndex, 0);

// Step 1: Open Leasing CRM
afNavGo('leasing');
assert(afStore.checklist['af_c5_1'], 'af_c5_1 marked');
simWalkAdvance();

// Step 2: Now on Step 2
assert.strictEqual(SimEngine.walkState().stepIndex, 1);
const step2 = SimEngine.currentStep();
console.log('Step 2 label:', step2.label);

// Verify that setup opens Brenda Miller modal
step2.walk.setup();
assert(afActiveModal, 'Modal must be open in Step 2');
console.log('Step 2 modal open:', !!afActiveModal);

// Advance card
afSetGuestCardStage('GC-FH-01', 'contacted');
assert(afStore.checklist['af_c5_2'], 'af_c5_2 marked');
simWalkAdvance();

// Step 3: Now on Step 3
assert.strictEqual(SimEngine.walkState().stepIndex, 2);
const step3 = SimEngine.currentStep();
console.log('Step 3 label:', step3.label);

step3.walk.setup();
assert(afActiveModal, 'Modal must be open in Step 3');

// Schedule showing
afScheduleShowingModal('GC-FH-01');
assert(afStore.checklist['af_c5_3'], 'af_c5_3 marked');
simWalkAdvance();

// Step 4: Now on Step 4
assert.strictEqual(SimEngine.walkState().stepIndex, 3);
const step4 = SimEngine.currentStep();
console.log('Step 4 label:', step4.label);

step4.walk.setup();
assert.strictEqual(afState.view, 'application');
assert.strictEqual(afState.activeApplicationId, 'APP-2026-005');
assert(afStore.checklist['af_c5_4'], 'af_c5_4 marked');
simWalkAdvance();

// Step 5: Decision Scenario
assert.strictEqual(SimEngine.walkState().stepIndex, 4);
assert(afAsk, 'afAsk active for step 5');
assert.strictEqual(afAsk.id, 'af_s5_1');

afAnswerScenario('af_s5_1', 1);
assert(afStore.scenarios['af_s5_1'].correct, 'af_s5_1 answered correctly');

afAskContinue();
assert(!afAsk, 'afAsk closed');
assert(afStore.lessonsDone['l05-leasing-funnel'], 'Lesson 5 completed');

console.log('ALL LESSON 5 FLOW TESTS PASSED!');
