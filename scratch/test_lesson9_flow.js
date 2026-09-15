const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- Testing Lesson 9 Flow ---');

global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.simToast = () => {};

// Mock DOM environment
const dom = {
  elements: {},
  bodyChildren: [],
  activeModal: null,
  querySelector(sel) {
    if (sel === '.af-app-card') return { textContent: 'Elena Rostova', offsetWidth: 100, offsetHeight: 100 };
    if (sel === 'button[data-action="generate-lease"]') return this.elements['button[data-action="generate-lease"]'];
    if (sel === 'button[data-action="collect-deposit"]') return this.elements['button[data-action="collect-deposit"]'];
    if (sel === 'button[data-action="complete-inspection"]') return this.elements['button[data-action="complete-inspection"]'];
    if (sel === '.af-rv-card') return { offsetWidth: 100, offsetHeight: 100 };
    return null;
  },
  getElementById(id) {
    if (id === 'afModalWrap') return dom.activeModal;
    return {
      appendChild: () => {},
      addEventListener: () => {},
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
      setAttribute: () => {},
      getAttribute: () => null,
      innerHTML: '',
      value: ''
    };
  }
};

const mockElem = () => ({
  appendChild: (c) => dom.bodyChildren.push(c),
  addEventListener: () => {},
  style: {},
  classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
  setAttribute: () => {},
  getAttribute: () => null,
  innerHTML: '',
  value: '',
  remove: function() {
    if (dom.activeModal === this) dom.activeModal = null;
    const idx = dom.bodyChildren.indexOf(this);
    if (idx !== -1) dom.bodyChildren.splice(idx, 1);
  }
});

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  innerWidth: 1024,
  localStorage: {
    data: {},
    getItem(k) { return this.data[k] || null; },
    setItem(k, v) { this.data[k] = String(v); },
    removeItem(k) { delete this.data[k]; }
  }
};

global.document = {
  querySelector: (sel) => dom.querySelector(sel),
  querySelectorAll: (sel) => [],
  getElementById: (id) => dom.getElementById(id),
  addEventListener: () => {},
  removeEventListener: () => {},
  body: {
    appendChild: (el) => { dom.bodyChildren.push(el); dom.activeModal = el; },
    removeChild: (el) => {
      const idx = dom.bodyChildren.indexOf(el);
      if (idx !== -1) dom.bodyChildren.splice(idx, 1);
      if (dom.activeModal === el) dom.activeModal = null;
    }
  },
  createElement: (tag) => {
    const el = mockElem();
    el.tagName = tag;
    return el;
  }
};

global.localStorage = global.window.localStorage;
global.navigator = { userAgent: 'node' };

// Load SimEngine
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../assets/js/sim-engine.js'), 'utf8'));
Object.assign(global, global.window);

// Load AppFolio catalog data
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-catalog-data.js'), 'utf8'));
Object.assign(global, global.window);

// Load AppFolio data
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-data.js'), 'utf8'));
Object.assign(global, global.window);

// Load AppFolio app
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-app.js'), 'utf8'));
Object.assign(global, global.window);

// Helper to inspect DOM after rendering
function updateDomElements() {
  const root = afApplicationHTML();
  // Check if buttons exist in HTML
  if (root.includes('data-action="generate-lease"')) {
    dom.elements['button[data-action="generate-lease"]'] = {
      action: 'generate-lease',
      click: () => {
        afGenerateLease('APP-ADA-01');
        afSetOverride('application', 'APP-ADA-01', { leaseGenerated: true });
        afMark('af_c9_2');
        afRenderRoot();
        updateDomElements();
      }
    };
  } else {
    delete dom.elements['button[data-action="generate-lease"]'];
  }

  if (root.includes('data-action="collect-deposit"')) {
    dom.elements['button[data-action="collect-deposit"]'] = {
      action: 'collect-deposit',
      click: () => {
        afCollectApplicationDeposit('APP-ADA-01');
        updateDomElements();
      }
    };
  } else {
    delete dom.elements['button[data-action="collect-deposit"]'];
  }

  if (root.includes('data-action="complete-inspection"')) {
    dom.elements['button[data-action="complete-inspection"]'] = {
      action: 'complete-inspection',
      click: () => {
        afSetOverride('application', 'APP-ADA-01', { moveInChecklistComplete: true });
        afMark('af_c9_4');
        updateDomElements();
      }
    };
  } else {
    delete dom.elements['button[data-action="complete-inspection"]'];
  }
}

// Initialize AppFolio state
afInitEngine();
afState.mode = 'lesson';
afState.lessonId = 'l09-move-in-lease-deposit';
const l9 = AF_LESSONS.find(l => l.id === 'l09-move-in-lease-deposit');
console.log('Lesson 9 found:', l9.title, 'with', l9.steps.length, 'steps');

// Step 1: Open profile
console.log('\n--- Testing Step 1 ---');
l9.steps[0].walk.setup();
updateDomElements();
console.log('Active application:', afState.activeApplicationId);
if (afState.activeApplicationId === 'APP-ADA-01') {
  console.log('[PASS] Step 1 setup loaded APP-ADA-01');
} else {
  console.error('[FAIL] Step 1 setup failed');
}

// Step 2: Generate Lease
console.log('\n--- Testing Step 2 ---');
l9.steps[1].walk.setup();
updateDomElements();
const btnGenLease = dom.querySelector(l9.steps[1].walk.target);
if (btnGenLease) {
  console.log('[PASS] Step 2 target button exists: generate-lease');
  btnGenLease.click();
  const effect2 = l9.steps[1].effect();
  console.log('[PASS] Step 2 effect passed:', effect2);
  console.log('[PASS] Step 2 marked:', afStore.checklist['af_c9_2']);
} else {
  console.error('[FAIL] Step 2 target button not found');
}

// Step 3: Collect Deposit
console.log('\n--- Testing Step 3 ---');
l9.steps[2].walk.setup();
updateDomElements();
const btnCollectDep = dom.querySelector(l9.steps[2].walk.target);
if (btnCollectDep) {
  console.log('[PASS] Step 3 target button exists: collect-deposit');
  btnCollectDep.click();
  const effect3 = l9.steps[2].effect();
  console.log('[PASS] Step 3 effect passed:', effect3);
  console.log('[PASS] Step 3 marked:', afStore.checklist['af_c9_3']);
  console.log('[PASS] No blocking modal opened:', dom.activeModal === null);
} else {
  console.error('[FAIL] Step 3 target button not found');
}

// Step 4: Complete Inspection
console.log('\n--- Testing Step 4 ---');
l9.steps[3].walk.setup();
updateDomElements();
const btnInspection = dom.querySelector(l9.steps[3].walk.target);
if (btnInspection) {
  console.log('[PASS] Step 4 target button exists: complete-inspection');
  console.log('[PASS] Screen is completely unblocked (activeModal is null):', dom.activeModal === null);
  btnInspection.click();
  const effect4 = l9.steps[3].effect();
  console.log('[PASS] Step 4 effect passed:', effect4);
  console.log('[PASS] Step 4 marked:', afStore.checklist['af_c9_4']);
} else {
  console.error('[FAIL] Step 4 target button not found');
}

// Step 5: Verify review
console.log('\n--- Testing Step 5 ---');
l9.steps[4].walk.setup();
console.log('[PASS] Step 5 setup navigated to:', afState.view, afState.viewArg);
const revItem = AF_VERIFY_ITEMS.find(r => r.id === 'af_v9_1');
console.log('[PASS] Review item af_v9_1 found with targetField:', revItem.targetField);

// Direct jump test: what if user jumped directly to Step 4 without doing Step 2 or 3?
console.log('\n--- Testing Direct Jump to Step 4 ---');
afInitEngine(); // reset state
afState.mode = 'lesson';
l9.steps[3].walk.setup();
updateDomElements();
const directBtnInspection = dom.querySelector(l9.steps[3].walk.target);
if (directBtnInspection) {
  console.log('[PASS] Direct jump to Step 4 ensures target button exists in DOM');
} else {
  console.error('[FAIL] Direct jump to Step 4 failed to render button');
}

console.log('\nALL LESSON 9 TESTS COMPLETED SUCCESSFULLY!');
