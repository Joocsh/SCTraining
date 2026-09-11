const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== STARTING LESSON 2 VERIFICATION TEST ===');

// Setup minimal browser DOM environment
global.window = global;
global.window.addEventListener = () => {};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementsByTagName: () => [],
  getElementById: (id) => {
    if (!global._elements) global._elements = {};
    if (!global._elements[id]) {
      global._elements[id] = {
        id,
        classList: {
          contains: () => false,
          add: () => {},
          remove: () => {},
          toggle: () => {}
        },
        value: '',
        style: {},
        innerHTML: '',
        textContent: '',
        scrollTop: 0,
        appendChild: () => {},
        remove: function() { delete global._elements[id]; },
        querySelector: () => ({
          classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
          scrollTop: 0, focus: () => {}, selectionStart: 0, setSelectionRange: () => {}
        }),
        querySelectorAll: () => []
      };
    }
    return global._elements[id];
  },
  querySelector: (sel) => {
    return {
      scrollTop: 0,
      focus: () => {},
      selectionStart: 0,
      setSelectionRange: () => {}
    };
  },
  querySelectorAll: (sel) => [],
  createElement: (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      innerHTML: '',
      style: {},
      remove: function() {
        if (el.id && global._elements) delete global._elements[el.id];
      }
    };
    return el;
  },
  body: {
    appendChild: (el) => {
      if (el.id) {
        if (!global._elements) global._elements = {};
        global._elements[el.id] = el;
      }
    },
    innerHTML: '',
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false }
  },
  activeElement: null
};

global.location = {
  search: '',
  pathname: '/Docusign/testdrive-docusign.html'
};

global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};

global.simToast = (msg, opts) => {};
global.dsConfirm = (opts) => { if (opts.onConfirm) opts.onConfirm(); };

const scripts = [
  '../assets/js/app-core.js',
  '../assets/js/sim-engine.js',
  '../Docusign/docusign-data.js',
  '../Docusign/docusign-data-ext.js',
  '../Docusign/docusign-shell-data.js',
  '../Docusign/docusign-app.js',
  '../Docusign/docusign-tour.js'
];

scripts.forEach(s => {
  const code = fs.readFileSync(path.join(__dirname, s), 'utf8');
  vm.runInThisContext(code);
});

dsInitEngine();
const l2 = DS_LESSONS.find(l => l.id === 'l02-envelope-state');
if (!l2) throw new Error('Lesson 2 not found!');
console.log('Lesson 2 title:', l2.title);
console.log('Lesson 2 steps count:', l2.steps.length);
if (l2.steps.length !== 5) throw new Error(`Expected 5 steps, got ${l2.steps.length}`);

// Step checks
if (l2.steps[0].checklistId !== 'ds_l02_open_9041') throw new Error('Step 1 checklistId mismatch');
if (l2.steps[1].checklistId !== 'ds_cert_open') throw new Error('Step 2 checklistId mismatch');
if (l2.steps[2].checklistId !== 'ds_l02_open_6620') throw new Error('Step 3 checklistId mismatch');
if (l2.steps[3].scenarioId !== 'ds_scen_8') throw new Error('Step 4 scenarioId mismatch');
if (l2.steps[4].scenarioId !== 'ds_scen_9') throw new Error('Step 5 scenarioId mismatch');
console.log('✓ All 5 steps definition verified correctly');

// Start Lesson 2 walkthrough
SimEngine.walkStart('l02-envelope-state');
console.log('Walk active:', SimEngine.walkActive());
console.log('Current step index:', SimEngine.walkState().stepIndex);

// Test Step 1: Open ENV-2026-9041
dsOpenEnvelope('ENV-2026-9041');
console.log('Opened 9041. Active env:', dsState.activeEnvId);
const tip1 = document.getElementById('simWalkTipBody').innerHTML;
console.log('Tip 1 paused content preview:', tip1.substring(0, 100));
if (!tip1.includes('Sarah Johnson (Order 2) is Waiting')) {
  throw new Error('Expected pause text for step 1 not found in tip');
}

// Advance past Step 1 pause
window.simWalkAdvance();
console.log('Advanced to step index:', SimEngine.walkState().stepIndex);
if (SimEngine.walkState().stepIndex !== 1) throw new Error('Expected walk step index 1');

// Test Step 2: Open completed agreement and Certificate of Completion
dsOpenEnvelope('ENV-2026-7734');
console.log('Opened completed env ENV-2026-7734. Active env:', dsState.activeEnvId);
dsOpenCertificateModal('ENV-2026-7734');
console.log('Opened certificate modal! ds_cert_open in store:', dsStore.checklist[dsScopedItemKey('ds_cert_open')]);
const tip2 = document.getElementById('simWalkTipBody').innerHTML;
console.log('Tip 2 paused content preview:', tip2.substring(0, 100));
if (!tip2.includes('Certificate of Completion is the legal backbone')) {
  throw new Error('Expected pause text for step 2 not found in tip');
}

// Advance past Step 2 pause
window.simWalkAdvance();
console.log('Advanced to step index:', SimEngine.walkState().stepIndex);
if (SimEngine.walkState().stepIndex !== 2) throw new Error('Expected walk step index 2');

// Test Step 3: Open voided envelope ENV-2026-6620
dsOpenEnvelope('ENV-2026-6620');
console.log('Opened voided env ENV-2026-6620. Active env:', dsState.activeEnvId);
console.log('ds_l02_open_6620 in store:', dsStore.checklist[dsScopedItemKey('ds_l02_open_6620')]);
const tip3 = document.getElementById('simWalkTipBody').innerHTML;
console.log('Tip 3 paused content preview:', tip3.substring(0, 100));
if (!tip3.includes('When an envelope is voided, DocuSign revokes all signing tokens')) {
  throw new Error('Expected pause text for step 3 not found in tip');
}

// Advance past Step 3 pause
window.simWalkAdvance();
console.log('Advanced to step index:', SimEngine.walkState().stepIndex);
if (SimEngine.walkState().stepIndex !== 3) throw new Error('Expected walk step index 3');

// Test Step 4: Scenario 8
const scen8 = DS_SCENARIOS.find(s => s.id === 'ds_scen_8');
console.log('Answering scenario 8 with option:', scen8.correct);
dsAnswerScenario('ds_scen_8', scen8.correct);
console.log('Scenario 8 answered. Scenarios in store:', dsStore.scenarios[dsScopedItemKey('ds_scen_8')]);

// Advance from scenario 8
dsAskContinue();
console.log('Advanced to step index:', SimEngine.walkState().stepIndex);
if (SimEngine.walkState().stepIndex !== 4) throw new Error('Expected walk step index 4');

// Test Step 5: Scenario 9
const scen9 = DS_SCENARIOS.find(s => s.id === 'ds_scen_9');
console.log('Answering scenario 9 with option:', scen9.correct);
dsAnswerScenario('ds_scen_9', scen9.correct);
console.log('Scenario 9 answered. Scenarios in store:', dsStore.scenarios[dsScopedItemKey('ds_scen_9')]);

// Finish lesson
dsAskContinue();
console.log('Lesson 2 complete! dsStore.lessonsDone:', dsStore.lessonsDone);
if (!dsLessonEverComplete('l02-envelope-state')) {
  throw new Error('Lesson 2 was not marked done in dsStore.lessonsDone');
}

console.log('=== ALL LESSON 2 TESTS PASSED PERFECTLY ===');
process.exit(0);
