// Dedicated test for progressive phase reveal structure and reveal mappings
global.window = global;

const elements = {};
function createEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id,
      value: '',
      className: '',
      textContent: '',
      style: { display: '' },
      classList: {
        _classes: new Set(),
        add: function(c) { this._classes.add(c); },
        remove: function(c) { this._classes.delete(c); },
        contains: function(c) { return this._classes.has(c); }
      },
      parentNode: null,
      firstElementChild: null,
      nextElementSibling: null,
      scrollIntoView: () => {}
    };
  }
  return elements[id];
}

global.document = {
  getElementById: (id) => elements[id] || createEl(id),
  createElement: (tag) => ({ id: '', textContent: '', appendChild: () => {}, addEventListener: () => {} }),
  head: { appendChild: () => {} },
  body: { appendChild: () => {}, style: {} },
  querySelectorAll: () => []
};

global.esc = (s) => String(s || '');
global.wfNav = (hasPrev) => `<div class="wf-nav">${hasPrev ? '<prev>' : ''}<next></div>`;
global.wfNext = () => { global.__wfNextCalled = true; };
global.caNewGatedNext = () => { global.__caNewGatedNextCalled = true; };
global.wfRenderFinalScore = (containerId, role, stateKey, totalStates) => {};
global.SCApp = { submitEmailStep: () => {} };
global.wfActiveScenario = { _decisions: [] };

require('../assets/js/tc-ca-new-case.js');

const c = global.TC_CA_NEW_CASE;
console.log('Verifying progressive phase reveal across 10 steps...\n');

let failed = false;

// Specifications per prompt
const stepSpecs = [
  {
    step: 0,
    name: 'Step 1: New Listing Assignment',
    gated: false,
    expectedPhases: ['ca2-s0-p1', 'ca2-s0-p2', 'ca2-s0-p3', 'ca2-s0-nav'],
    phaseBtn: { text: 'Start the file', target: 'ca2-s0-p1' },
    expectedNav: 'wfNext()'
  },
  {
    step: 1,
    name: 'Step 2: Listing Agreement',
    gated: true,
    expectedPhases: ['ca2-s1-p1', 'ca2-s1-p2', 'ca2-s1-nav'],
    phaseBtn: { text: 'Review the RLA', target: 'ca2-s1-p1' },
    expectedNav: 'caNewGatedNext()'
  },
  {
    step: 2,
    name: 'Step 3: Seller Disclosures',
    gated: false,
    expectedPhases: ['ca2-s2-p1', 'ca2-s2-p2', 'ca2-s2-p3', 'ca2-s2-p4'],
    phaseBtn: { text: 'Begin disclosure review', target: 'ca2-s2-p1' },
    expectedNav: 'wfNext()'
  },
  {
    step: 3,
    name: 'Step 4: Pre-Listing Review',
    gated: false,
    expectedPhases: ['ca2-s3-p1', 'ca2-s3-p2', 'ca2-s3-p3'],
    phaseBtn: { text: 'Review title findings', target: 'ca2-s3-p1' },
    expectedNav: 'wfNext()'
  },
  {
    step: 4,
    name: 'Step 5: Offer & Counter',
    gated: true,
    expectedPhases: ['ca2-s4-p1', 'ca2-s4-p2', 'ca2-s4-nav'],
    phaseBtn: { text: 'Prepare counter offer', target: 'ca2-s4-p1' },
    expectedNav: 'caNewGatedNext()'
  },
  {
    step: 5,
    name: 'Step 6: Open Escrow',
    gated: true,
    expectedPhases: ['ca2-s5-p1', 'ca2-s5-p2'],
    phaseBtn: null, // Starts with form directly
    expectedNav: 'caNewGatedNext()'
  },
  {
    step: 6,
    name: 'Step 7: EMD & Disclosures',
    gated: true,
    expectedPhases: ['ca2-s6-p1', 'ca2-s6-p2'],
    phaseBtn: null, // Starts with banner + form
    expectedNav: 'caNewGatedNext()'
  },
  {
    step: 7,
    name: 'Step 8: Inspections & Repairs',
    gated: false,
    expectedPhases: ['ca2-s7-p1', 'ca2-s7-p2', 'ca2-s7-nav'],
    phaseBtn: { text: 'Begin inspection review', target: 'ca2-s7-p1' },
    expectedNav: 'wfNext()'
  },
  {
    step: 8,
    name: 'Step 9: Appraisal & Wire Fraud',
    gated: true,
    expectedPhases: ['ca2-s8-p1', 'ca2-s8-p2', 'ca2-s8-p3', 'ca2-s8-nav'],
    phaseBtn: { text: 'Review appraisal contingency', target: 'ca2-s8-p1' },
    expectedNav: 'caNewGatedNext()'
  },
  {
    step: 9,
    name: 'Step 10: Closing & Post-Closing',
    gated: false,
    expectedPhases: ['ca2-s9-p1'],
    phaseBtn: { text: 'Complete post-closing', target: 'ca2-s9-p1' },
    expectedNav: null // Final step has no nav
  }
];

stepSpecs.forEach((spec) => {
  console.log(`Checking ${spec.name}...`);
  const html = c.wfSteps[spec.step]();

  // 1. Check suppressing outer nav: when last is true, nav is '' and no outer wf-nav exists at the end of wf-step-wrap
  // Check if an outer wf-nav is appended after mh-grid
  const outerNavMatch = html.match(/<\/div><\/div>(<div class="wf-nav">[\s\S]*?<\/div>)<\/div>$/);
  if (outerNavMatch) {
    console.error(`  FAIL: Step ${spec.step + 1} generated outer nav! SuppressNav was not true.`);
    failed = true;
  } else {
    console.log(`  PASS: Outer navigation successfully suppressed.`);
  }

  // 2. Check Phase 0 has class wf-phase
  if (!html.includes('<div class="wf-phase">')) {
    console.error(`  FAIL: Step ${spec.step + 1} does not contain '<div class="wf-phase">'!`);
    failed = true;
  } else {
    console.log(`  PASS: Phase 0 has class wf-phase.`);
  }

  // 3. Check Phase button if expected
  if (spec.phaseBtn) {
    const btnRegex = new RegExp(`caNewReveal\\(['"]${spec.phaseBtn.target}['"]\\)`);
    if (!btnRegex.test(html)) {
      console.error(`  FAIL: Missing phase button calling caNewReveal('${spec.phaseBtn.target}')!`);
      failed = true;
    } else {
      console.log(`  PASS: Found phase button triggering '${spec.phaseBtn.target}'.`);
    }
  }

  // 4. Check all expected phases exist with display:none and class wf-phase
  spec.expectedPhases.forEach((pId) => {
    const phaseRegex = new RegExp(`<div class="wf-phase" id="${pId}" style="display:none">`);
    if (!phaseRegex.test(html)) {
      console.error(`  FAIL: Missing or incorrect phase container for id '${pId}'!`);
      failed = true;
    } else {
      console.log(`  PASS: Found phase '${pId}' hidden with style="display:none".`);
    }
  });

  // 5. Check navigation button
  if (spec.expectedNav) {
    if (!html.includes(spec.expectedNav)) {
      console.error(`  FAIL: Missing expected nav call '${spec.expectedNav}'!`);
      failed = true;
    } else {
      console.log(`  PASS: Found nav handler '${spec.expectedNav}'.`);
    }
  }

  // 6. Check that REVEAL mappings trigger caNewReveal properly
  // Let's test the caNewReveal logic
  const mockPhases = [];
  const parent = { firstElementChild: null };
  // Phase 0
  const p0 = createEl(`step-${spec.step}-p0`);
  p0.classList.add('wf-phase');
  p0.parentNode = parent;
  mockPhases.push(p0);
  parent.firstElementChild = p0;

  let prev = p0;
  spec.expectedPhases.forEach((pId) => {
    const el = createEl(pId);
    el.classList.add('wf-phase');
    el.style.display = 'none';
    el.parentNode = parent;
    prev.nextElementSibling = el;
    prev = el;
    mockPhases.push(el);
  });

  // Call caNewReveal on the first hidden phase
  const firstHiddenId = spec.expectedPhases[0];
  global.caNewReveal(firstHiddenId);
  const revealedEl = elements[firstHiddenId];
  if (revealedEl.style.display !== '') {
    console.error(`  FAIL: caNewReveal failed to clear display:none on '${firstHiddenId}'!`);
    failed = true;
  }
  if (!p0.classList.contains('done')) {
    console.error(`  FAIL: caNewReveal failed to mark previous phase 'done'!`);
    failed = true;
  } else {
    console.log(`  PASS: caNewReveal properly displayed '${firstHiddenId}' and marked prior phase as done.`);
  }

  console.log('');
});

if (failed) {
  console.error('=== TESTS FAILED ===');
  process.exit(1);
} else {
  console.log('=== ALL PROGRESSIVE PHASE REVEAL TESTS PASSED PERFECTLY! ===');
}
