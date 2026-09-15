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

console.log('--- Step 1: Start Lesson 2 ---');
simWalkStart('l02-resident-ledger');
assert.strictEqual(SimEngine.walkState().stepIndex, 0);

// Step 1: Click Residents / People in nav
afNavGo('people');
assert(afStore.checklist['af_c2_1'], 'af_c2_1 marked');
simWalkAdvance();

// Step 2: Open Resident Ledger
assert.strictEqual(SimEngine.walkState().stepIndex, 1);
afGoto('resident-detail', 'RES-PET-01');
assert(afStore.checklist['af_c2_2'], 'af_c2_2 marked');
simWalkAdvance();

// Step 3: Audit Ledger Running Balance Chain (Review / Verify)
assert.strictEqual(SimEngine.walkState().stepIndex, 2);
assert.strictEqual(afState.view, 'review');
assert.strictEqual(afState.reviewId, 'af_v2_1');

// Flag Error on row 8 (ENT-V8)
afAnswerReview('af_v2_1', 'ENT-V8');
assert(afStore.reviews['af_v2_1'].correct, 'Review af_v2_1 marked correct');

// Check rendered HTML
const reviewHtml = afReviewDetailHTML();
const hasFeedbackContinue = reviewHtml.includes('sim-feedback-continue');
console.log('hasFeedbackContinue during walkthrough:', hasFeedbackContinue);
assert.strictEqual(hasFeedbackContinue, false, 'Feedback box must NOT render a duplicate continue button during walkthrough');

// SimEngine advance to step 4
simWalkAdvance();

// Step 4: Scenario (Popup)
assert.strictEqual(SimEngine.walkState().stepIndex, 3);
console.log('Step 4 afAsk active:', !!afAsk, 'id:', afAsk ? afAsk.id : null);
assert(afAsk, 'afAsk must be open for step 4');
assert.strictEqual(afAsk.id, 'af_s2_1');

// Answer Scenario
afAnswerScenario('af_s2_1', 1);
assert(afStore.scenarios['af_s2_1'].correct, 'Scenario answered correctly');

afAskContinue();
assert(!afAsk, 'afAsk closed');
assert(afStore.lessonsDone['l02-resident-ledger'], 'Lesson 2 completed');

console.log('ALL LESSON 2 FLOW TESTS PASSED!');
