const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== VERIFYING REAL LESSON 1 CODE (NO MONKEY PATCHING) ===');

global.window = global;
global.window.addEventListener = () => {};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const createMockEl = () => ({
  style: {},
  classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
  appendChild: () => {},
  remove: () => {},
  innerHTML: '',
  textContent: '',
  getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 50, bottom: 150, right: 300 })
});
const elements = {
  simWalk: createMockEl(),
  simWalkTip: createMockEl(),
  simWalkTipBody: createMockEl(),
  simWalkHighlight: createMockEl(),
  simWalkBackdrop: createMockEl(),
  afRoot: createMockEl(),
  afSidebar: createMockEl(),
  afSubnav: createMockEl(),
  afRail: createMockEl(),
  afRailStrip: createMockEl(),
  afModeSwitch: createMockEl(),
  afLessonBanner: createMockEl()
};

global.localStorage = {
  _s: {},
  getItem(k) { return this._s[k] || null; },
  setItem(k, v) { this._s[k] = String(v); },
  removeItem(k) { delete this._s[k]; }
};
global.location = { search: '', pathname: '/AppFolio/testdrive-appfolio.html' };

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementsByTagName: () => [],
  documentElement: { clientHeight: 800, clientWidth: 1280 },
  getElementById: (id) => {
    if (!elements[id]) elements[id] = createMockEl();
    return elements[id];
  },
  querySelector: (sel) => createMockEl(),
  querySelectorAll: () => [],
  createElement: (tag) => createMockEl(),
  body: createMockEl()
};

global.simToast = (msg) => console.log('[Toast]', msg);

// Load real codebase files
const codeCore = fs.readFileSync(path.join(__dirname, '../assets/js/app-core.js'), 'utf8');
const codeEngine = fs.readFileSync(path.join(__dirname, '../assets/js/sim-engine.js'), 'utf8');
const codeCatalog = fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-catalog-data.js'), 'utf8');
const codeData = fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-data.js'), 'utf8');
const codeApp = fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-app.js'), 'utf8');
const codeShell = fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-shell.js'), 'utf8');

vm.runInThisContext(codeCore);
vm.runInThisContext(codeEngine);
vm.runInThisContext(codeCatalog);
vm.runInThisContext(codeData);
vm.runInThisContext(codeApp);
vm.runInThisContext(codeShell);

afInitEngine();

console.log('\n--- Step 1: Start Lesson 1 ---');
simWalkStart('l01-orientation');
let walk = SimEngine.walkState();
console.log('Walk started: stepIndex =', walk.stepIndex, 'lessonId =', walk.lessonId);
console.log('afState.mode =', afState.mode, 'afState.lessonId =', afState.lessonId);

console.log('\n--- Step 1 Action: Click Properties (afNavGo) ---');
afNavGo('properties');
console.log('af_c1_1 done?', afStore.checklist['af_c1_1']);
console.log('walk.stepDoneFired:', walk.stepDoneFired);
if (!afStore.checklist['af_c1_1']) throw new Error('af_c1_1 was not marked!');

// Fast-forward advance
simWalkAdvance();
console.log('\n--- Step 2: Now on stepIndex =', walk.stepIndex);
let curStep = SimEngine.currentStep();
console.log('Target:', curStep.walk.target, 'label:', curStep.label);
afGoto('property-detail', 'PROP-11');
console.log('af_c1_2 done?', afStore.checklist['af_c1_2']);
if (!afStore.checklist['af_c1_2']) throw new Error('af_c1_2 was not marked!');

simWalkAdvance();
console.log('\n--- Step 3: Now on stepIndex =', walk.stepIndex);
curStep = SimEngine.currentStep();
console.log('Target:', curStep.walk.target, 'label:', curStep.label);
afGoto('unit-detail', 'UNIT-11-102');
console.log('af_c1_3 done?', afStore.checklist['af_c1_3']);
if (!afStore.checklist['af_c1_3']) throw new Error('af_c1_3 was not marked!');

simWalkAdvance();
console.log('\n--- Step 4: Now on stepIndex =', walk.stepIndex);
curStep = SimEngine.currentStep();
console.log('Target:', curStep.walk.target, 'label:', curStep.label);
afGoto('resident-detail', 'RES-REN-01');
console.log('af_c1_4 done?', afStore.checklist['af_c1_4']);
if (!afStore.checklist['af_c1_4']) throw new Error('af_c1_4 was not marked!');

simWalkAdvance();
console.log('\n--- Step 5: Decision Scenario (Pop-up) ---');
curStep = SimEngine.currentStep();
console.log('Scenario step:', curStep.scenarioId, 'label:', curStep.label);
console.log('afAsk active?', !!afAsk && afAsk.id === 'af_s1_1');
console.log('afState.view (should remain resident-detail):', afState.view);
if (afState.view !== 'resident-detail') throw new Error('System screen was replaced by scenario instead of popup!');
afAnswerScenario('af_s1_1', 1);
console.log('af_s1_1 recorded?', !!afStore.scenarios['af_s1_1']);
console.log('Lesson 1 step 5 done?', afLessonStepDone(curStep));
afAskContinue();

const prog = SimEngine.progress(SimEngine.findLesson('l01-orientation'));
console.log('\nLesson 1 Progress:', prog);
console.log('Lesson 1 Completed successfully!');

