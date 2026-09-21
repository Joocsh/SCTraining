const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('--- Testing Phase Isolation & Progressive Reveal ---');

// 1. Check CSS file
const cssPath = path.resolve(__dirname, '../assets/css/tc-case.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes('.wf-phase-enter'), 'CSS must include .wf-phase-enter');
assert(cssContent.includes('@keyframes phaseSlideIn'), 'CSS must include @keyframes phaseSlideIn');
console.log('✓ CSS verification passed (.wf-phase-enter and keyframes present)');

// 2. Mock DOM environment for testing caNewReveal
class MockClassList {
  constructor(initial = []) {
    this.classes = new Set(initial);
  }
  contains(c) { return this.classes.has(c); }
  add(c) { this.classes.add(c); }
  remove(c) { this.classes.delete(c); }
}

class MockElement {
  constructor(id, classes = [], display = 'none') {
    this.id = id;
    this.classList = new MockClassList(classes);
    this.style = { display };
    this.parentNode = null;
    this.firstElementChild = null;
    this.nextElementSibling = null;
    this.scrolled = false;
  }
  scrollIntoView() {
    this.scrolled = true;
  }
}

// Build mock parent with phases and non-phase siblings
const parent = new MockElement('parent');
const tracker = new MockElement('tracker', ['wf-tracker'], '');
const p1 = new MockElement('p1', ['wf-phase'], 'block');
const p2 = new MockElement('p2', ['wf-phase'], 'none');
const p3 = new MockElement('p3', ['wf-phase'], 'none');

parent.firstElementChild = tracker;
tracker.nextElementSibling = p1;
p1.nextElementSibling = p2;
p2.nextElementSibling = p3;
tracker.parentNode = parent;
p1.parentNode = parent;
p2.parentNode = parent;
p3.parentNode = parent;

const elements = { p1, p2, p3, tracker };

const mockWindow = {
  document: {
    getElementById: (id) => elements[id] || null,
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      id: '',
      textContent: '',
      setAttribute: () => {},
      appendChild: () => {}
    }),
    head: {
      appendChild: () => {}
    }
  },
  setTimeout: (fn, ms) => fn()
};

// Read tc-ca-new-case.js
const jsPath = path.resolve(__dirname, '../assets/js/tc-ca-new-case.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

// Extract and test caNewReveal
const revealMatch = jsContent.match(/window\.caNewReveal\s*=\s*function\s*\([\s\S]*?\n  \};/);
assert(revealMatch, 'Could not find window.caNewReveal definition');

const evalScript = new vm.Script('var window = this; ' + revealMatch[0]);
evalScript.runInNewContext(mockWindow);

// Test caNewReveal('p2')
mockWindow.caNewReveal('p2');

assert.strictEqual(p1.style.display, 'none', 'p1 should be hidden');
assert.strictEqual(p2.style.display, '', 'p2 should be displayed');
assert.strictEqual(p3.style.display, 'none', 'p3 should be hidden');
assert(p2.classList.contains('wf-phase-enter'), 'p2 should have wf-phase-enter');
assert.strictEqual(p2.scrolled, true, 'p2 should have scrolled into view');
assert.strictEqual(tracker.style.display, '', 'tracker (non-phase) should not be hidden');

// Now reveal p3
mockWindow.caNewReveal('p3');
assert.strictEqual(p1.style.display, 'none', 'p1 should still be hidden');
assert.strictEqual(p2.style.display, 'none', 'p2 should now be hidden');
assert(!p2.classList.contains('wf-phase-enter'), 'p2 should no longer have wf-phase-enter');
assert.strictEqual(p3.style.display, '', 'p3 should be displayed');
assert(p3.classList.contains('wf-phase-enter'), 'p3 should have wf-phase-enter');

console.log('✓ caNewReveal DOM tests passed (properly hides all siblings and shows target)');

// 3. Test initial render state across Steps 2 to 10
// We can mock the environment to execute each step function
const mockStorage = {};
const mockScenario = {
  _mh: mockStorage,
  _decisions: [],
  _mhFor: null
};
mockScenario._mhFor = mockScenario._decisions;

const mockEnv = {
  window: mockWindow,
  document: mockWindow.document,
  console: console,
  setTimeout: (fn) => fn(),
  wfActiveScenario: mockScenario,
  run: () => mockStorage,
  step: (num, title, date, desc, main, side, flag, banner) => ({ num, title, main }),
  card: (title, sub, body) => `<div class="card">${title}</div>`,
  form: (id) => `<div class="form" id="${id}"></div>`,
  picker: (id) => `<div class="picker" id="${id}"></div>`,
  decision: (id) => `<div class="decision" id="${id}"></div>`,
  compose: (opts) => `<div class="compose" id="${opts.key}"></div>`,
  timeline: () => `<div class="timeline"></div>`,
  phaseTracker: (id, steps, cur) => `<div class="tracker" id="${id}"></div>`,
  zipformsApp: (id) => `<div class="zf-app" id="${id}"></div>`,
  skyslopeApp: (id) => `<div class="ss-app" id="${id}"></div>`,
  side: () => '',
  ZF_SECTIONS: [],
  SS_FIELDS: [],
  SS_CHECKLIST: [],
  wfNav: () => '',
  esc: (s) => (s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '')
};

// We will load the full script or execute step functions
// Let's create a regex parser to count top-level phase containers in the main HTML returned by steps
function parseTopPhases(html) {
  // Find all matches of <div class="([^"]*)"([^>]*)> where class contains the token 'wf-phase'
  const re = /<div\s+class="([^"]*)"([^>]*)>/g;
  const matches = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const classAttr = m[1];
    const classes = classAttr.trim().split(/\s+/);
    if (classes.includes('wf-phase')) {
      const rest = m[2];
      const isHidden = rest.includes('display:none') || rest.includes('display: none');
      matches.push({
        class: classAttr,
        rest,
        isHidden
      });
    }
  }
  return matches;
}

// Sandbox context for full evaluation of step functions
let modJs = jsContent;
// Make sure window.caNewStep1 etc are exposed
modJs = modJs.replace(/function caNewStep(\d)\(\)\s*\{/g, 'window.caNewStep$1 = caNewStep$1; function caNewStep$1() {');

const ctx = vm.createContext(mockEnv);
try {
  vm.runInContext(modJs, ctx);
} catch (e) {
  console.log('Note on runInContext (some global deps might be missing):', e.message);
}

// Test each step function from Step 2 to Step 10 (caNewStep1 to caNewStep9)
for (let stepNum = 1; stepNum <= 9; stepNum++) {
  const fnName = 'caNewStep' + stepNum;
  const fn = ctx[fnName] || ctx.window[fnName];
  assert(fn, `Function ${fnName} must exist`);

  // Clear mockStorage
  for (let k in mockStorage) delete mockStorage[k];

  // Test 1: Fresh state (activeIdx = 0)
  const res0 = fn();
  const phases0 = parseTopPhases(res0);
  const visible0 = phases0.filter(p => !p.isHidden);

  assert.strictEqual(
    visible0.length,
    1,
    `${fnName} with fresh state should have exactly 1 visible phase, found ${visible0.length}`
  );
  assert.strictEqual(
    phases0[0].isHidden,
    false,
    `${fnName} first phase should be visible on fresh state`
  );

  console.log(`✓ ${fnName} initial render has exactly 1 active phase visible (total phases: ${phases0.length})`);
}

// Additional test: Step 2 progressive state restoration
console.log('--- Testing Step 2 state progression ---');
const step1Fn = ctx.caNewStep1 || ctx.window.caNewStep1;

// State: zfDone -> activeIdx 1 (Phase 2 visible)
for (let k in mockStorage) delete mockStorage[k];
mockStorage['zf_submitted_ca2-zf'] = 1;
const res1 = step1Fn();
const phases1 = parseTopPhases(res1);
assert.strictEqual(phases1.filter(p => !p.isHidden).length, 1, 'Only 1 phase visible when zfDone');
assert.strictEqual(phases1[1].isHidden, false, 'Phase 2 visible when zfDone');
assert.strictEqual(phases1[0].isHidden, true, 'Phase 1 hidden when zfDone');
console.log('✓ Step 2 correctly restores to Phase 2 when Zipforms is submitted');

// State: decDone -> activeIdx 2 (Phase 3 visible)
mockStorage['d_ca2-d-excluded'] = 1;
const res2 = step1Fn();
const phases2 = parseTopPhases(res2);
assert.strictEqual(phases2.filter(p => !p.isHidden).length, 1, 'Only 1 phase visible when decDone');
assert.strictEqual(phases2[2].isHidden, false, 'Phase 3 visible when decDone');
assert.strictEqual(phases2[0].isHidden, true, 'Phase 1 hidden when decDone');
assert.strictEqual(phases2[1].isHidden, true, 'Phase 2 hidden when decDone');
console.log('✓ Step 2 correctly restores to Phase 3 when decision is answered');

// State: ssDone -> activeIdx 3 (Phase 4 visible)
mockStorage['ss_submitted_ca2-ss'] = 1;
const res3 = step1Fn();
const phases3 = parseTopPhases(res3);
assert.strictEqual(phases3.filter(p => !p.isHidden).length, 1, 'Only 1 phase visible when ssDone');
assert.strictEqual(phases3[3].isHidden, false, 'Phase 4 visible when ssDone');
assert.strictEqual(phases3[0].isHidden, true, 'Phase 1 hidden when ssDone');
assert.strictEqual(phases3[1].isHidden, true, 'Phase 2 hidden when ssDone');
assert.strictEqual(phases3[2].isHidden, true, 'Phase 3 hidden when ssDone');
console.log('✓ Step 2 correctly restores to Phase 4 when SkySlope is submitted');

// Additional test: Step 3 state progression
console.log('--- Testing Step 3 state progression ---');
const step2Fn = ctx.caNewStep2 || ctx.window.caNewStep2;
for (let k in mockStorage) delete mockStorage[k];
mockStorage['pd_ca2-p-disclosures'] = 1;
const resStep2_1 = step2Fn();
const phasesStep2_1 = parseTopPhases(resStep2_1);
assert.strictEqual(phasesStep2_1.filter(p => !p.isHidden).length, 1);
assert.strictEqual(phasesStep2_1[2].isHidden, false, 'Phase 3 (TDS form) visible when disclosures picked');
console.log('✓ Step 3 correctly restores to Phase 3 when disclosures picked');

console.log('--- ALL CHECKS PASSED SUCCESSFULLY ---');
