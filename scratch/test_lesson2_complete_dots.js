const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- Testing Lesson 2 Completion Card and Dot 5 ---');

global.window = global;
global.window.addEventListener = () => {};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const elements = {};
global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementsByTagName: () => [],
  getElementById: (id) => {
    if (!elements[id]) {
      elements[id] = {
        id,
        classList: {
          contains: () => false,
          add: () => {},
          remove: () => {},
          toggle: () => {}
        },
        style: {},
        innerHTML: '',
        innerText: '',
        scrollTop: 0,
        appendChild: () => {},
        remove: () => { delete elements[id]; }
      };
    }
    return elements[id];
  },
  querySelector: () => ({
    scrollTop: 0,
    focus: () => {},
    selectionStart: 0,
    setSelectionRange: () => {}
  }),
  querySelectorAll: () => [],
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    className: '',
    innerHTML: '',
    style: {},
    remove: () => {}
  }),
  body: { appendChild: () => {}, innerHTML: '', classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false } },
  activeElement: null
};

global.location = { search: '', pathname: '/Docusign/testdrive-docusign.html' };
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};
global.simToast = (msg, opts) => console.log('  [Toast called]:', msg);

const scripts = [
  '../assets/js/app-core.js',
  '../assets/js/sim-engine.js',
  '../Docusign/docusign-data.js',
  '../Docusign/docusign-data-ext.js',
  '../Docusign/docusign-shell-data.js',
  '../Docusign/docusign-app.js'
];

scripts.forEach(s => {
  const p = path.join(__dirname, s);
  if (fs.existsSync(p)) {
    const code = fs.readFileSync(p, 'utf8');
    vm.runInThisContext(code, { filename: p });
  }
});

dsInitEngine();
dsResetWizard();

// Start Lesson 2
SimEngine.walkStart('l02-envelope-state');
console.log('Started Lesson 2');

// Simulate completing steps 1, 2, 3
dsMark('ds_l02_open_9041');
dsMark('ds_cert_open');
dsMark('ds_l02_open_6620');
dsAnswerScenario('ds_scen_8', 1);
dsAnswerScenario('ds_scen_9', 1);

const l2 = SimEngine.findLesson('l02-envelope-state');
console.log('Checking step 5 (ds_scen_9) done state:');
const step5 = l2.steps[4];
const isStep5Done = SimEngine.stepDone(step5);
console.log('✓ Step 5 SimEngine.stepDone:', isStep5Done);
if (!isStep5Done) {
  console.error('FAIL: Step 5 is not reported as done!');
  process.exit(1);
}

// Show complete screen
console.log('\nShowing complete screen...');
window.simWalkShowComplete();

const tipBody = document.getElementById('simWalkTipBody').innerHTML;
// Verify dots HTML has 5 done dots
const matchDone = (tipBody.match(/class="sim-walk-dot done/g) || []).length;
console.log('✓ Number of dots with "done" class on complete screen:', matchDone);
if (matchDone !== 5) {
  console.error('FAIL: Expected all 5 dots to have "done" class, but got', matchDone);
  process.exit(1);
}

// Verify no locked dots without done
const hasUncompletedDot = /class="sim-walk-dot\s+locked"/.test(tipBody);
console.log('Has uncompleted locked dot:', hasUncompletedDot);
if (hasUncompletedDot) {
  console.error('FAIL: Found dot that is not marked done on completion screen!');
  process.exit(1);
}

console.log('✓ Tip body contains celebration and completion message:', tipBody.includes('Lesson 2 complete!'));

console.log('\n=== ALL LESSON 2 COMPLETION CHECKS PASSED 100% ===');
process.exit(0);
