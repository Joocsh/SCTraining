const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- Testing L8 Wire Fraud Direct Execution ---');

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
  classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
  setAttribute: () => {},
  getAttribute: () => null
});
const rootEl = mockElem();
const document = {
  getElementById: (id) => rootEl,
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

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../assets/js/sim-engine.js'), 'utf8'));
Object.assign(global, window);
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../Quialia/qualia-catalog-data.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../Quialia/qualia-data.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../Quialia/qualia-app.js'), 'utf8'));

// Initialize engine as done in qualia-app
qzInitEngine();

const l8State = SimEngine.lessonState(7); // L8 is index 7
console.log('L8 lessonState:', l8State);
if (l8State !== 'unlocked') {
  console.error('FAIL: L8 is not unlocked directly!');
  process.exit(1);
}

// Open L8
qzOpenLesson('l08-wire-fraud');
console.log('Analytics lessonStarts for l08:', qzStore.analytics.lessonStarts['l08-wire-fraud']);
if (!qzStore.analytics.lessonStarts['l08-wire-fraud']) {
  console.error('FAIL: lessonStarts not recorded for l08!');
  process.exit(1);
}

const l8 = QZ_LESSONS.find(l => l.id === 'l08-wire-fraud');
console.log('L8 title:', l8.title);
console.log('L8 steps count:', l8.steps.length);
l8.steps.forEach((s, idx) => {
  console.log(`  Step ${idx}: type=${s.type}, checklistId=${s.checklistId || ''}, scenarioId=${s.scenarioId || ''}, composeId=${s.composeId || ''}`);
});

// Check compose rubric for cmp-1398-wire
const cmpWire = QZ_COMPOSES.find(c => c.id === 'cmp-1398-wire');
console.log('cmp-1398-wire rubric count:', cmpWire.rubric.length);
const wireModelReply = "Hi Sarah, I just received an urgent email requesting changed wire instructions on 219 Lakeshore Drive (ORD-2026-1398). The buyer needs to wire funds today, but this email came from an altered domain. We need to call the buyer on their phone number of record to verify before any money is wired.";
const grade = qzComposeGrade(cmpWire, wireModelReply, { order: qzGetOrder('ORD-2026-1398') });
console.log('Wire compose grade:', grade);
if (!grade.correct) {
  console.error('FAIL: Wire compose model reply failed rubric:', grade.results);
  process.exit(1);
}

console.log('SUCCESS: L8 Wire Fraud can be executed from scratch smoothly!');
