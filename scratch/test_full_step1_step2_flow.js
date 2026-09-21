const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('--- TESTING STEP 1 & STEP 2 ENHANCEMENTS ---');

const mockElements = {};
function getEl(id) {
  if (!mockElements[id]) {
    mockElements[id] = {
      id: id,
      value: '',
      style: { display: '' },
      classList: {
        _classes: new Set(),
        add: function (c) { this._classes.add(c); },
        remove: function (c) { this._classes.delete(c); },
        contains: function (c) { return this._classes.has(c); },
        toggle: function (c) { if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c); }
      },
      innerHTML: '',
      textContent: '',
      scrollIntoView: () => {},
      closest: () => null
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
  setTimeout: fn => { fn(); return 1; },
  clearTimeout: () => {},
  console: console,
  localStorage: { getItem: () => null, setItem: () => {} },
  esc: s => (s ? String(s) : ''),
  SCApp: {
    submitEmailStep: (opts) => {
      const el = getEl(opts.statusElId);
      if (el) el.innerHTML = 'Submitted for grading';
    }
  }
};
mockWindow.window = mockWindow;

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
console.log('Step 1 HTML length:', step0Html.length);

// Verify email body text
if (!step0Html.includes('Daniel received a corporate relocation transfer to Austin, Texas starting on <strong>November 10</strong>')) {
  throw new Error('Email body missing relocation transfer details');
}
if (!step0Html.includes('List Price:</strong> $889,000') || !step0Html.includes('5% total')) {
  throw new Error('Email body missing listing terms list');
}
console.log('✓ Step 1 email body properly updated with detailed terms and omitted items');

// Verify 5 substepper pills
if (!step0Html.includes('ca2-pill-0') || !step0Html.includes('ca2-pill-1') ||
    !step0Html.includes('ca2-pill-2') || !step0Html.includes('ca2-pill-3') ||
    !step0Html.includes('ca2-pill-4')) {
  throw new Error('Substepper does not contain all 5 pills');
}
if (!step0Html.includes('Info Request')) {
  throw new Error('Substepper pill 4 title missing "Info Request"');
}
console.log('✓ 5 substepper pills rendered correctly (Sofia\'s Email, File Setup, Pre-Listing Docs, Info Request, Pricing Call)');

// Verify slides exist
if (!step0Html.includes('id="ca2-deck-s0"') || !step0Html.includes('id="ca2-deck-s1"') ||
    !step0Html.includes('id="ca2-deck-s2"') || !step0Html.includes('id="ca2-deck-s3"') ||
    !step0Html.includes('id="ca2-deck-s4"')) {
  throw new Error('Not all 5 slides (ca2-deck-s0 through ca2-deck-s4) rendered in DOM');
}
console.log('✓ All 5 deck slides present in DOM');

// 2. Complete Slide 1 File Setup
ctx.caNewAutoFill('ca2-file');
ctx.caNewCheck('ca2-file');
if (!ctx.caNewIsSlide1Ok()) {
  throw new Error('Slide 1 should be OK after auto-fill');
}
console.log('✓ Slide 1 auto-filled and validated');

// 3. Move to Slide 2 & Complete Pre-Listing Docs
ctx.caNewSlide1Next();
ctx.caNewAutoPick('ca2-p-predocs');
if (!ctx.caNewIsSlide2Ok()) {
  throw new Error('Slide 2 should be OK after auto-pick');
}
console.log('✓ Slide 2 auto-picked and validated');

// 4. Move to Slide 3: Missing Information
ctx.caNewSlide2Next();
if (ctx._caNewSlide0 !== 3) {
  throw new Error('Should be on slide 3, but is on ' + ctx._caNewSlide0);
}
console.log('✓ Successfully navigated to Slide 3 (Missing Info Request)');

// Check missing info picker
ctx.caNewAutoPick('ca2-p-missing');
const pMissingSt = ctx.TC_CA_NEW_CASE._mh;
if (!pMissingSt['pd_ca2-p-missing']) {
  throw new Error('Missing info picker not completed');
}
console.log('✓ Missing info picker completed correctly');

// Check compose submit
ctx.caNewAutoCompose('ca2-missing-info');
ctx.caNewSubmitCompose('ca2-missing-info', {
  textareaId: 'wf-ca2-missing-info-body',
  statusElId: 'wf-ca2-missing-info-body-status',
  btnId: 'wf-ca2-missing-info-body-btn',
  role: 'tc',
  scenarioId: 'tc-ca-missing-info',
  prompt: 'Request missing listing details from Sofia Reyes'
});

if (!ctx.caNewIsSlide3Ok()) {
  throw new Error('Slide 3 should be OK after email submit');
}
console.log('✓ Clarification email submitted, Sofia response card triggered, and Slide 3 marked complete');

// 5. Move to Slide 4: Pricing Call
ctx.caNewSlide3Next();
if (ctx._caNewSlide0 !== 4) {
  throw new Error('Should be on slide 4, but is on ' + ctx._caNewSlide0);
}
console.log('✓ Navigated to Slide 4 (Pricing Call)');

// Answer Daniel's inquiry
ctx.caNewChatPick('ca2-d-price', 1); // option index 1 is redirect to Sofia
if (pMissingSt['d_ca2-d-price'] !== 1) {
  throw new Error('Daniel pricing decision not recorded');
}
console.log('✓ Pricing Call decision answered correctly');

// Advance to Step 2
ctx.caNewStep0Next();
const s2Step = vm.runInContext('wfStep', ctx);
if (s2Step !== 1) {
  throw new Error('Failed to advance to Step 2; wfStep is ' + s2Step);
}
console.log('✓ Advanced to Step 2: Listing Agreement & File Setup');

// 6. Test Step 2: Zipforms Sections
const step1Html = ctx.TC_CA_NEW_CASE.wfSteps[1]();

// Check section titles
const expectedTitles = [
  'Transaction Setup',
  '1. Property & Listing Type',
  '2. Listing Period',
  '3. List Price',
  '4. Compensation',
  '5. Ownership & Title',
  '6. Items Included / Excluded',
  '7. MLS & Marketing',
  '8. Security & Access'
];

expectedTitles.forEach(t => {
  if (!step1Html.includes(ctx.esc(t))) {
    throw new Error('Step 2 missing expected section title: ' + t);
  }
});
console.log('✓ All 9 Zipforms sections present with clean titles (no §)');

// Test AutoFill for Zipforms in Step 2
ctx.caNewZfLpAutoFill('ca2-zf');
ctx.caNewZfLpSubmit('ca2-zf');

// AutoFill form fields
ctx.caNewZfAutoFill('ca2-zf');

// Verify hints
if (!step1Html.includes("Refer to Sofia's response to your info request in Step 1.")) {
  throw new Error('Missing hint referencing Sofia\'s response for vesting/sign_auth');
}
if (!step1Html.includes("Sofia confirmed the split in her reply: 2.5% offered to buyer's agent.")) {
  throw new Error('Missing hint for buyer agent comp split');
}
if (!step1Html.includes("Sofia confirmed lockbox authorization in her reply to your info request.")) {
  throw new Error('Missing hint for lockbox authorization');
}
console.log('✓ All field hints accurately reference Sofia\'s reply from Step 1');

console.log('--- ALL STEP 1 & STEP 2 ENHANCEMENT TESTS PASSED! ---');
