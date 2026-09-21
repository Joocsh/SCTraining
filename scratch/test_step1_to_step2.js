const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('--- Testing Step 1 to Step 2 Navigation ---');

// Mock browser environment
const mockStorage = {};
const mockScenario = {
  _mh: mockStorage,
  _decisions: [],
  _mhFor: null
};
mockScenario._mhFor = mockScenario._decisions;

const mockElements = {};
function getEl(id) {
  if (!mockElements[id]) {
    mockElements[id] = {
      id: id,
      style: {},
      classList: {
        _classes: new Set(),
        add: function (c) { this._classes.add(c); },
        remove: function (c) { this._classes.delete(c); },
        contains: function (c) { return this._classes.has(c); }
      },
      innerHTML: '',
      textContent: '',
      scrollIntoView: () => {}
    };
  }
  return mockElements[id];
}

const mockWindow = {
  document: {
    getElementById: id => getEl(id),
    createElement: tag => ({
      tagName: tag.toUpperCase(),
      id: '',
      style: {},
      textContent: '',
      setAttribute: () => {},
      appendChild: () => {}
    }),
    head: { appendChild: () => {} },
    querySelector: () => null,
    querySelectorAll: () => []
  },
  setTimeout: fn => fn(),
  clearTimeout: () => {},
  console: console,
  localStorage: { getItem: () => null, setItem: () => {} },
  esc: s => (s ? String(s) : '')
};
mockWindow.window = mockWindow;

// Read workflow.js and tc-ca-new-case.js
const wfJs = fs.readFileSync('assets/js/workflow.js', 'utf8');
const tcJs = fs.readFileSync('assets/js/tc-ca-new-case.js', 'utf8');

const ctx = vm.createContext(mockWindow);
vm.runInContext(wfJs, ctx);
vm.runInContext(tcJs, ctx);

// Start workflow
ctx.wfStart(ctx.TC_CA_NEW_CASE);
const currentStep = vm.runInContext('wfStep', ctx);
console.log('Initial wfStep:', currentStep);
assert.strictEqual(currentStep, 0, 'Initial step must be 0');

// Step 0 main HTML
const step0Html = getEl('wf-body').innerHTML;
assert(step0Html.includes('ca2-deck-s0'), 'Must have slide 0');
assert(step0Html.includes('ca2-deck-s1'), 'Must have slide 1');
assert(step0Html.includes('ca2-deck-s2'), 'Must have slide 2');
assert(step0Html.includes('ca2-deck-s3'), 'Must have slide 3');

// 1. Complete slide 1
ctx.caNewAutoFill('ca2-file');
ctx.caNewCheck('ca2-file');
assert(ctx.caNewIsSlide1Ok(), 'Slide 1 must be ok');
console.log('✓ Slide 1 auto-filled and validated');

// 2. Complete slide 2
ctx.caNewAutoPick('ca2-p-predocs');
ctx.caNewPickCheck('ca2-p-predocs');
assert(ctx.caNewIsSlide2Ok(), 'Slide 2 must be ok');
console.log('✓ Slide 2 auto-picked and validated');

// 3. Go to slide 3
ctx.caNewGoSlide(3);
assert.strictEqual(ctx._caNewSlide0, 3, 'Slide 3 must be active');
console.log('✓ Navigated to slide 3');

// 4. Answer decision
ctx.caNewAutoDecide('ca2-d-price');
console.log('Scenario _mh:', ctx.TC_CA_NEW_CASE._mh);
assert.notStrictEqual(ctx.TC_CA_NEW_CASE._mh['d_ca2-d-price'], undefined, 'Decision ca2-d-price must be answered');
console.log('✓ Decision answered correctly');

// Check complete banner
const comp = getEl('ca2-d-price-complete');
console.log('ca2-d-price-complete display:', comp.style.display);

// 5. Trigger transition to Step 2
ctx.caNewStep0Next();
const nextStep = vm.runInContext('wfStep', ctx);
console.log('After caNewStep0Next, wfStep is:', nextStep);
assert.strictEqual(nextStep, 1, 'wfStep must advance to 1 (Step 2)');
console.log('✓ caNewStep0Next() successfully advanced to Step 2');

const step1Html = getEl('wf-body').innerHTML;
assert(step1Html.includes('Step 2: Listing Agreement & File Setup'), 'Body must now contain Step 2');
console.log('✓ Step 2 correctly rendered in #wf-body');

console.log('--- ALL STEP 1 TO STEP 2 TESTS PASSED ---');
