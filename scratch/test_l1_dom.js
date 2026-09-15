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

console.log('=== TEST 1: Defensive Routing in afGoto ===');
afGoto('properties', 'PROP-11');
assert.strictEqual(afState.view, 'property-detail', 'afGoto("properties", "PROP-11") must route to property-detail');
assert.strictEqual(afState.activePropertyId, 'PROP-11', 'activePropertyId must be PROP-11');

afGoto('residents', 'RES-0006');
assert.strictEqual(afState.view, 'resident-detail', 'afGoto("residents", "RES-0006") must route to resident-detail');
assert.strictEqual(afState.activeResidentId, 'RES-0006', 'activeResidentId must be RES-0006');

afGoto('properties', 'UNIT-11-102');
assert.strictEqual(afState.view, 'unit-detail', 'afGoto("properties", "UNIT-11-102") must route to unit-detail');
assert.strictEqual(afState.activeUnitId, 'UNIT-11-102', 'activeUnitId must be UNIT-11-102');

console.log('=== TEST 2: HTML Content on Each Step of Lesson 1 ===');
// Step 1
simWalkStart('l01-orientation');
assert.strictEqual(SimEngine.walkState().stepIndex, 0);
afRenderSidebar();
const navHtml = document.getElementById('afSidebar').innerHTML;
assert(navHtml.includes('data-section="properties"'), 'Step 1 target a[data-section="properties"] must exist in sidebar');

// Step 2
afNavGo('properties');
assert(afStore.checklist['af_c1_1'], 'af_c1_1 must be marked');
simWalkAdvance();
assert.strictEqual(SimEngine.walkState().stepIndex, 1);
const propsHtml = afPropertiesHTML();
assert(propsHtml.includes('data-prop="PROP-11"'), 'Step 2 target button[data-prop="PROP-11"] must exist in properties HTML');
assert(propsHtml.includes('Legacy Park Apartments'), 'Properties table must display "Legacy Park Apartments"');

// Step 3
afGoto('property-detail', 'PROP-11');
assert(afStore.checklist['af_c1_2'], 'af_c1_2 must be marked');
simWalkAdvance();
assert.strictEqual(SimEngine.walkState().stepIndex, 2);
assert.strictEqual(afState.view, 'property-detail', 'Step 3 must stay on property-detail');
assert.strictEqual(afState.activePropertyId, 'PROP-11', 'Step 3 activePropertyId must be PROP-11');
const propDetailHtml = afPropertyDetailHTML();
assert(propDetailHtml.includes('data-unit="UNIT-11-102"'), 'Step 3 target button[data-unit="UNIT-11-102"] must exist in property detail HTML');
assert(propDetailHtml.includes('Unit 102'), 'Property detail HTML must include Unit 102');

// Step 3 action: User clicks Unit 11-102
afGoto('unit-detail', 'UNIT-11-102');
assert(afStore.checklist['af_c1_3'], 'af_c1_3 must be marked');

// Advance to Step 4
simWalkAdvance();
assert.strictEqual(SimEngine.walkState().stepIndex, 3);
assert.strictEqual(afState.view, 'resident-detail', 'Step 4 must be resident-detail');
assert.strictEqual(afState.activeResidentId, 'RES-REN-01', 'Step 4 activeResidentId must be RES-REN-01');
const resDetailHtml = afResidentDetailHTML();
assert(resDetailHtml.includes('af-pill-warn'), 'Step 4 target .af-pill-warn must exist in resident detail HTML');
assert(resDetailHtml.includes('47 days remaining'), 'Step 4 HTML must display "47 days remaining"');
assert(resDetailHtml.includes('Jordan Reed'), 'Step 4 HTML must display "Jordan Reed"');
assert(afStore.checklist['af_c1_4'], 'Step 4 af_c1_4 must be marked');

// Step 5: Question appears in pop-up, NOT replacing the system!
simWalkAdvance();
assert.strictEqual(SimEngine.walkState().stepIndex, 4);
assert.strictEqual(afState.view, 'resident-detail', 'AppFolio system must stay on resident-detail, not navigate away');
assert(afAsk, 'afAsk state must be active');
assert.strictEqual(afAsk.id, 'af_s1_1', 'afAsk id must be af_s1_1');

const askEl = document.getElementById('afAskLayer');
assert(askEl, 'afAskLayer must exist');
assert(askEl.innerHTML.includes('af-ask-card'), 'af-ask-card must exist in popup layer');
assert(askEl.innerHTML.includes('Reading Occupancy &amp; Lease Expiration Indicators') || askEl.innerHTML.includes('Reading Occupancy'), 'Question title must exist in popup');
assert(askEl.innerHTML.includes('Jordan Reed'), 'Situation text in popup must mention Jordan Reed');
assert(askEl.innerHTML.includes('Proactively send a lease renewal offer'), 'Options must be rendered in popup');

// Answer question in pop-up
afAnswerScenario('af_s1_1', 1);
assert(afStore.scenarios['af_s1_1'].correct, 'Answer must be recorded as correct');
assert(askEl.innerHTML.includes('Correct assessment'), 'Popup must show correct feedback');
assert(askEl.innerHTML.includes('Finish Lesson'), 'Popup must show Finish Lesson button');

// Finish lesson from pop-up
afAskContinue();
assert(!afAsk, 'afAsk must close after continuing');
assert(afStore.lessonsDone['l01-orientation'], 'Lesson 1 must be marked done in afStore.lessonsDone');

console.log('ALL DOM AND WALKTHROUGH TESTS PASSED (POPUP VERIFIED)!');
