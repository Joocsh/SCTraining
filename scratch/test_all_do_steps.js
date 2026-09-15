const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== VERIFYING ALL 23 DO CHECKLIST STEPS IN APPFOLIO ===');

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

global.simToast = () => {};

// Load AppFolio code
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

const doSteps = [
  { id: 'af_c1_1', l: 'l01-orientation', act: () => afNavGo('properties') },
  { id: 'af_c1_2', l: 'l01-orientation', act: () => afGoto('property-detail', 'PROP-11') },
  { id: 'af_c1_3', l: 'l01-orientation', act: () => afGoto('unit-detail', 'UNIT-11-102') },
  { id: 'af_c1_4', l: 'l01-orientation', act: () => afGoto('resident-detail', 'RES-0006') },
  { id: 'af_c2_1', l: 'l02-resident-ledger', act: () => afNavGo('people') },
  { id: 'af_c2_2', l: 'l02-resident-ledger', act: () => afGoto('resident-detail', 'RES-PET-01') },
  { id: 'af_c3_1', l: 'l03-posting-rent-late-fees', act: () => afAccountingDelinquencyHTML() },
  { id: 'af_c3_2', l: 'l03-posting-rent-late-fees', act: () => afModalPostPayment('LEASE-0002') },
  { id: 'af_c3_3', l: 'l03-posting-rent-late-fees', act: () => afMark('af_c3_3') },
  { id: 'af_c4_1', l: 'l04-delinquency-collection-ladder', act: () => afViewReport('delinquency') },
  { id: 'af_c4_2', l: 'l04-delinquency-collection-ladder', act: () => afMark('af_c4_2') },
  { id: 'af_c5_1', l: 'l05-leasing-funnel', act: () => afNavGo('leasing') },
  { id: 'af_c5_2', l: 'l05-leasing-funnel', act: () => afSetGuestCardStage('GC-FH-01', 'contacted') },
  { id: 'af_c5_3', l: 'l05-leasing-funnel', act: () => afScheduleShowingModal('GC-FH-01') },
  { id: 'af_c5_4', l: 'l05-leasing-funnel', act: () => afGoto('application', 'APP-2026-005') },
  { id: 'af_c9_1', l: 'l09-move-in-lease-deposit', act: () => afGoto('application', 'APP-ADA-01') },
  { id: 'af_c9_2', l: 'l09-move-in-lease-deposit', act: () => afMark('af_c9_2') },
  { id: 'af_c9_3', l: 'l09-move-in-lease-deposit', act: () => afMark('af_c9_3') },
  { id: 'af_c9_4', l: 'l09-move-in-lease-deposit', act: () => afMark('af_c9_4') },
  { id: 'af_c10_1', l: 'l10-maintenance-dispatch-compliance', act: () => afNavGo('maintenance') },
  { id: 'af_c10_2', l: 'l10-maintenance-dispatch-compliance', act: () => afGoto('work-order', 'WO-2026-0101') },
  { id: 'af_c10_3', l: 'l10-maintenance-dispatch-compliance', act: () => afConfirmDispatchGo('WO-2026-0101') },
  { id: 'af_c11_1', l: 'l11-move-out-deposit-accounting', act: () => afMark('af_c11_1') }
];

let allPassed = true;
doSteps.forEach(s => {
  afResetProgress();
  afState.lessonId = s.l;
  afState.mode = 'lesson';
  simWalkStart(s.l);
  const l = SimEngine.findLesson(s.l);
  const step = l.steps.find(st => st.checklistId === s.id);
  const stepIdx = l.steps.indexOf(step);
  SimEngine.walkState().stepIndex = stepIdx;
  SimEngine.sync();

  s.act();
  const ok = !!afStore.checklist[s.id];
  if (!ok) {
    allPassed = false;
    console.error('FAILED: ' + s.id + ' for lesson ' + s.l);
  } else {
    console.log('PASS: ' + s.id.padEnd(10) + ' (' + step.label + ')');
  }
});

console.log('\nAll 23 DO steps completed successfully:', allPassed);
if (!allPassed) process.exit(1);
