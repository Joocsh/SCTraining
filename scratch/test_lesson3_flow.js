const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== TESTING LESSON 3 FULL FLOW ===');

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
  simWalkHighlight: createMockEl(),
  simWalkBackdrop: createMockEl()
};
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; } };
global.location = { search: '', pathname: '/Docusign/testdrive-docusign.html' };

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementsByTagName: () => [],
  documentElement: { clientHeight: 800, clientWidth: 1280 },
  getElementById: (id) => {
    if (!elements[id]) elements[id] = createMockEl();
    return elements[id];
  },
  querySelector: (sel) => {
    if (sel === '#simDocFrame') return { removeAttribute: () => {}, src: '' };
    return createMockEl();
  },
  querySelectorAll: () => [],
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    appendChild: () => {},
    addEventListener: () => {},
    remove: () => {}
  }),
  body: {
    appendChild: () => {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} }
  }
};

global.simToast = (msg) => console.log('[Toast]', msg);
global.dsIcon = (name) => `<svg class="ds-icon ds-icon-${name}"></svg>`;

// Load modules
const codeCore = fs.readFileSync(path.join(__dirname, '../assets/js/app-core.js'), 'utf8');
const codeEngine = fs.readFileSync(path.join(__dirname, '../assets/js/sim-engine.js'), 'utf8');
const codeData = fs.readFileSync(path.join(__dirname, '../Docusign/docusign-data.js'), 'utf8');
const codeShell = fs.readFileSync(path.join(__dirname, '../Docusign/docusign-shell-data.js'), 'utf8');
const codeApp = fs.readFileSync(path.join(__dirname, '../Docusign/docusign-app.js'), 'utf8');

vm.runInThisContext(codeCore);
vm.runInThisContext(codeEngine);
vm.runInThisContext(codeData);
vm.runInThisContext(codeShell);
vm.runInThisContext(codeApp);

dsInitEngine();

const l = DS_LESSONS.find(x => x.id === 'l03-send-envelope');
console.log('Lesson 3 found:', l ? `${l.number}: ${l.title} (${l.steps.length} steps)` : 'none');

// 1. Mark prerequisites completed
dsNoteLessonComplete('l01-workspace');
dsNoteLessonComplete('l02-envelope-state');

// Start walkthrough
dsState.lessonId = 'l03-send-envelope';
simWalkStart('l03-send-envelope');

// Step 1: Open New Envelope Wizard
console.log('\n--- STEP 1 ---');
let step = l.steps[0];
if (step.walk && step.walk.setup) step.walk.setup();
console.log('Step 1 target:', typeof step.walk.target === 'function' ? step.walk.target() : step.walk.target);
console.log('Step 1 text:', typeof step.walk.text === 'function' ? step.walk.text() : step.walk.text);
// Simulate user clicking Start Now
dsOpenNewEnvelope();
console.log('After dsOpenNewEnvelope -> view:', dsState.view, 'step done:', dsLessonStepDone(step));
if (!dsLessonStepDone(step)) throw new Error('Step 1 checklistId ds_c1_1 not marked!');

// Step 2: Sample Documents / Attach
console.log('\n--- STEP 2 ---');
step = l.steps[1];
if (step.walk && step.walk.setup) step.walk.setup();
console.log('Step 2 initial target:', typeof step.walk.target === 'function' ? step.walk.target() : step.walk.target);
// Open modal
elements['dsSampleDocsWrap'] = createMockEl();
console.log('Step 2 with modal open target:', typeof step.walk.target === 'function' ? step.walk.target() : step.walk.target);
console.log('Step 2 with modal open text:', typeof step.walk.text === 'function' ? step.walk.text() : step.walk.text);
// Simulate user attaching sample doc
delete elements['dsSampleDocsWrap'];
dsAttachDoc('Purchase_Agreement_123_Main.pdf', 6);
console.log('After attach doc -> docs count:', dsState.wizardData.documents.length, 'step done:', dsLessonStepDone(step));
if (!dsLessonStepDone(step)) throw new Error('Step 2 checklistId ds_c1_2 not marked!');

// Step 3: Next Recipients
console.log('\n--- STEP 3 ---');
step = l.steps[2];
if (step.walk && step.walk.setup) step.walk.setup();
console.log('Step 3 target:', typeof step.walk.target === 'function' ? step.walk.target() : step.walk.target);
console.log('Step 3 text:', typeof step.walk.text === 'function' ? step.walk.text() : step.walk.text);
// Simulate clicking Next: Add Recipients
dsNextWizardStep(2);
console.log('After dsNextWizardStep(2) -> wizardStep:', dsState.wizardStep, 'step done:', dsLessonStepDone(step));
if (!dsLessonStepDone(step)) throw new Error('Step 3 checklistId ds_c1_3 not marked!');

// Step 4: Next Fields
console.log('\n--- STEP 4 ---');
step = l.steps[3];
if (step.walk && step.walk.setup) step.walk.setup();
console.log('Step 4 target:', typeof step.walk.target === 'function' ? step.walk.target() : step.walk.target);
console.log('Step 4 text:', typeof step.walk.text === 'function' ? step.walk.text() : step.walk.text);
console.log('Recipients in wizard:', dsState.wizardData.recipients.map(r => `${r.name} (${r.action})`));
const probs = dsRecipientProblems();
console.log('Recipient validation problems count:', probs.count);
if (probs.count > 0) throw new Error('Recipient validation failed unexpectedly in step 4!');
// Simulate clicking Next: Place Fields
dsNextWizardStep(3);
console.log('After dsNextWizardStep(3) -> wizardStep:', dsState.wizardStep, 'step done:', dsLessonStepDone(step));
if (!dsLessonStepDone(step)) throw new Error('Step 4 checklistId ds_c2_1 not marked!');

// Step 5: Review & Send -> Send Final
console.log('\n--- STEP 5 ---');
step = l.steps[4];
console.log('WizardStep is 3 (Place Fields). Step 5 target:', typeof step.walk.target === 'function' ? step.walk.target() : step.walk.target);
console.log('Step 5 text:', typeof step.walk.text === 'function' ? step.walk.text() : step.walk.text);
if ((typeof step.walk.target === 'function' ? step.walk.target() : step.walk.target) !== '#dsBtnReviewAndSend, .ds-wiz-foot .ds-btn.primary') {
  throw new Error('Step 5 did not target #dsBtnReviewAndSend when wizardStep === 3!');
}
// Advance to wizardStep 4
dsNextWizardStep(4);
console.log('WizardStep is now 4 (Review & Send). Step 5 target:', typeof step.walk.target === 'function' ? step.walk.target() : step.walk.target);
console.log('Step 5 text:', typeof step.walk.text === 'function' ? step.walk.text() : step.walk.text);
if ((typeof step.walk.target === 'function' ? step.walk.target() : step.walk.target) !== '#dsBtnSendFinal') {
  throw new Error('Step 5 did not target #dsBtnSendFinal when wizardStep === 4!');
}
// Send envelope
dsSendEnvelopeFinal();
console.log('After dsSendEnvelopeFinal -> step done:', dsLessonStepDone(step), 'view:', dsState.view);
if (!dsLessonStepDone(step)) throw new Error('Step 5 checklistId ds_c1_4 not marked!');

// Step 6: Decide Scenario (ds_scen_l03_send)
console.log('\n--- STEP 6 ---');
step = l.steps[5];
if (step.walk && step.walk.setup) step.walk.setup();
console.log('Scenario ID:', step.scenarioId);
const scen = DS_SCENARIOS.find(s => s.id === step.scenarioId);
if (!scen) throw new Error(`Scenario ${step.scenarioId} not found in DS_SCENARIOS!`);
console.log('Scenario Title:', scen.title);
console.log('Scenario Question:', scen.situation.slice(0, 80) + '...');
console.log('Correct option index:', scen.correct);
console.log('Correct option text:', scen.options[scen.correct]);
dsAnswerScenario(step.scenarioId, scen.correct);
console.log('Scenario answered. Stored record:', dsStore.scenarios[step.scenarioId]);
if (!dsStore.scenarios[step.scenarioId] || !dsStore.scenarios[step.scenarioId].correct) {
  throw new Error('Scenario not correctly marked in store!');
}

// Check if all steps of Lesson 3 are done
const allDone = l.steps.every(s => dsLessonStepDone(s));
console.log('\nAll Lesson 3 steps done:', allDone);
if (!allDone) throw new Error('Not all Lesson 3 steps marked as done!');

console.log('Lesson step labels:');
l.steps.forEach((s, idx) => {
  console.log(`  Step ${idx + 1}: [${dsLessonStepStatus(s)}] ${dsLessonStepLabel(s)}`);
});

console.log('\n=== ALL LESSON 3 TESTS PASSED PERFECTLY ===');
process.exit(0);
