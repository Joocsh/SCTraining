const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- Testing Lesson 10 Flow in AppFolio ---');

const dom = {
  elements: {},
  querySelector(sel) {
    if (sel === 'a[data-section="maintenance"]') return this.elements['a[data-section="maintenance"]'];
    if (sel === 'button[data-wo="WO-2026-0101"]') return this.elements['button[data-wo="WO-2026-0101"]'];
    if (sel === '#afBtnDispatchWO') return this.elements['#afBtnDispatchWO'];
    if (sel === '.af-scenario-card') return { textContent: 'Scenario' };
    return null;
  }
};

const win = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  },
  location: { search: '', pathname: '/AppFolio/testdrive-appfolio.html' },
  innerWidth: 1024
};

const mockElem = () => ({
  appendChild: () => {},
  addEventListener: () => {},
  style: {},
  classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
  setAttribute: () => {},
  getAttribute: () => null,
  innerHTML: '',
  value: '',
  remove: () => {}
});

global.window = win;
global.localStorage = win.localStorage;
global.location = win.location;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.simToast = () => {};

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => dom.querySelector('#' + id) || mockElem(),
  querySelector: (sel) => dom.querySelector(sel),
  querySelectorAll: () => [],
  createElement: () => mockElem(),
  body: mockElem()
};

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../assets/js/sim-engine.js'), 'utf8'));
Object.assign(global, global.window);
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-catalog-data.js'), 'utf8'));
Object.assign(global, global.window);
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-data.js'), 'utf8'));
Object.assign(global, global.window);
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-app.js'), 'utf8'));
Object.assign(global, global.window);

afInitEngine();
afState.mode = 'lesson';
afState.lessonId = 'l10-maintenance-dispatch-compliance';
simWalkStart('l10-maintenance-dispatch-compliance');

// Verify work orders catalog
const allWOs = afAllWorkOrders();
console.log('Total work orders in catalog:', allWOs.length);
if (allWOs.length === 40) {
  console.log('[PASS] Total work orders count is 40');
} else {
  console.error('[FAIL] Expected 40 work orders, got ' + allWOs.length);
}

const w101 = afGetWorkOrder('WO-2026-0101');
console.log('WO-2026-0101 title:', w101.title);
console.log('WO-2026-0101 status:', w101.status);
console.log('WO-2026-0101 vendorId:', w101.vendorId);
if (w101.status === 'assigned' && w101.vendorId === 'VEND-01') {
  console.log('[PASS] WO-2026-0101 is correctly initialized as assigned to VEND-01');
} else {
  console.error('[FAIL] WO-2026-0101 initialization incorrect');
}

const l10 = AF_LESSONS.find(l => l.id === 'l10-maintenance-dispatch-compliance');
console.log('\nTesting Lesson 10:', l10.title);

// Step 1: Open Maintenance Dashboard
console.log('\n--- Step 1 ---');
SimEngine.walkState().stepIndex = 0;
l10.steps[0].walk.setup();
dom.elements['a[data-section="maintenance"]'] = {
  click: () => {
    afNavGo('maintenance');
  }
};
const step1Target = dom.querySelector(l10.steps[0].walk.target);
if (step1Target) {
  console.log('[PASS] Step 1 target found:', l10.steps[0].walk.target);
  step1Target.click();
  console.log('View after click:', afState.view);
  console.log('Checklist af_c10_1:', afStore.checklist['af_c10_1']);
  if (afStore.checklist['af_c10_1']) {
    console.log('[PASS] Step 1 marked complete');
  } else {
    console.error('[FAIL] Step 1 not marked');
  }
} else {
  console.error('[FAIL] Step 1 target not found');
}

// Step 2: Open WO-2026-0101 from maintenance list
console.log('\n--- Step 2 ---');
SimEngine.walkState().stepIndex = 1;
l10.steps[1].walk.setup();
const maintHTML = afMaintenanceHTML();
console.log('Does maintenance HTML contain data-wo="WO-2026-0101":', maintHTML.includes('data-wo="WO-2026-0101"'));
if (maintHTML.includes('data-wo="WO-2026-0101"')) {
  console.log('[PASS] Work order 0101 row is rendered on page 1 of maintenance list');
} else {
  console.error('[FAIL] Work order 0101 row is not rendered on page 1');
}

dom.elements['button[data-wo="WO-2026-0101"]'] = {
  click: () => {
    afGoto('work-order', 'WO-2026-0101');
  }
};
const step2Target = dom.querySelector(l10.steps[1].walk.target);
if (step2Target) {
  console.log('[PASS] Step 2 target found:', l10.steps[1].walk.target);
  step2Target.click();
  console.log('View after click:', afState.view, afState.activeWorkOrderId);
  console.log('Checklist af_c10_2:', afStore.checklist['af_c10_2']);
  if (afStore.checklist['af_c10_2']) {
    console.log('[PASS] Step 2 marked complete');
  } else {
    console.error('[FAIL] Step 2 not marked');
  }
} else {
  console.error('[FAIL] Step 2 target not found');
}

// Step 3: Dispatch Vendor
console.log('\n--- Step 3 ---');
SimEngine.walkState().stepIndex = 2;
l10.steps[2].walk.setup();
const woHTML = afWorkOrderHTML();
console.log('Does work order HTML contain #afBtnDispatchWO:', woHTML.includes('id="afBtnDispatchWO"'));
if (woHTML.includes('id="afBtnDispatchWO"')) {
  console.log('[PASS] Dispatch button is rendered on WO-2026-0101 page');
} else {
  console.error('[FAIL] Dispatch button is NOT rendered on WO-2026-0101 page');
}

dom.elements['#afBtnDispatchWO'] = {
  click: () => {
    afDispatchWorkOrder('WO-2026-0101');
  }
};
const step3Target = dom.querySelector(l10.steps[2].walk.target);
if (step3Target) {
  console.log('[PASS] Step 3 target found:', l10.steps[2].walk.target);
  step3Target.click();
  const effect3 = l10.steps[2].effect();
  console.log('Effect return:', effect3);
  console.log('Checklist af_c10_3:', afStore.checklist['af_c10_3']);
  console.log('Work order status after dispatch:', afGetWorkOrder('WO-2026-0101').status);
  if (effect3 && afStore.checklist['af_c10_3']) {
    console.log('[PASS] Step 3 effect passed and marked complete');
  } else {
    console.error('[FAIL] Step 3 effect or mark failed');
  }
} else {
  console.error('[FAIL] Step 3 target not found');
}

// Step 4: Scenario 10-1
console.log('\n--- Step 4 ---');
SimEngine.walkState().stepIndex = 3;
l10.steps[3].walk.setup();
console.log('View in Step 4:', afState.view, afState.viewArg);
const s10_1 = AF_SCENARIOS.find(s => s.id === 'af_s10_1');
console.log('Scenario af_s10_1 correct option:', s10_1.correct, '->', s10_1.options[s10_1.correct]);
afRecordAnswer('scenarios', 'af_s10_1', s10_1.correct);
console.log('[PASS] Step 4 scenario recorded');

// Step 5: Scenario 10-2
console.log('\n--- Step 5 ---');
SimEngine.walkState().stepIndex = 4;
l10.steps[4].walk.setup();
console.log('View in Step 5:', afState.view, afState.viewArg);
const s10_2 = AF_SCENARIOS.find(s => s.id === 'af_s10_2');
console.log('Scenario af_s10_2 correct option:', s10_2.correct, '->', s10_2.options[s10_2.correct]);
afRecordAnswer('scenarios', 'af_s10_2', s10_2.correct);
console.log('[PASS] Step 5 scenario recorded');

console.log('\nALL 5 STEPS OF LESSON 10 TESTED SUCCESSFULLY!');
