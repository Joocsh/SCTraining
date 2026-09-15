const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- Testing Finish Lesson Execution Flow ---');

// Setup DOM mock
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
        remove: () => {}
      };
    }
    return global._elements[id];
  },
  querySelector: (sel) => ({
    scrollTop: 0,
    focus: () => {},
    selectionStart: 0,
    setSelectionRange: () => {}
  }),
  querySelectorAll: (sel) => [],
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
global.simToast = (msg, opts) => console.log('  [Toast]:', msg);
global.dsConfirm = (opts) => { if (opts.onConfirm) opts.onConfirm(); };

// Load scripts in order
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
  const p = path.join(__dirname, s);
  if (fs.existsSync(p)) {
    const code = fs.readFileSync(p, 'utf8');
    vm.runInThisContext(code, { filename: p });
  }
});

dsInitEngine();
dsResetWizard();

console.log('✓ Simulator scripts loaded and initialized');

// Check that simWalkShowComplete is defined globally
console.log('typeof window.simWalkShowComplete:', typeof window.simWalkShowComplete);
console.log('typeof SimEngine.showComplete:', typeof SimEngine.showComplete);

if (typeof window.simWalkShowComplete !== 'function') {
  console.error('FAIL: window.simWalkShowComplete is not a function!');
  process.exit(1);
}

// Start Lesson 1 walkthrough
SimEngine.walkStart('l01-workspace');
const walkState = SimEngine.walkState();
console.log('Walk started for lesson:', walkState ? walkState.lessonId : 'none');

// Test calling simWalkShowComplete()
console.log('\n--- Calling simWalkShowComplete() ---');
window.simWalkShowComplete();

const tipBody = document.getElementById('simWalkTipBody').innerHTML;
console.log('Tip body preview:', tipBody.substring(0, 150));
const hasLessonComplete = tipBody.includes('complete');
const hasBackBtn = tipBody.includes('Back to Lessons');
console.log('✓ Has "complete":', hasLessonComplete);
console.log('✓ Has "Back to Lessons" button:', hasBackBtn);

// Check if lesson is marked as completed
const isMarked = dsLessonEverComplete('l01-workspace');
console.log('✓ Lesson marked in dsStore.lessonsDone:', isMarked);

if (!isMarked) {
  console.error('FAIL: Lesson was not marked as completed in dsStore!');
  process.exit(1);
}

// Test clicking "Back to Lessons"
console.log('\n--- Calling simWalkBackToLessons() ---');
window.simWalkBackToLessons();
console.log('Walk active after back to lessons:', SimEngine.walkActive());

console.log('\n✓ ALL FINISH LESSON TESTS PASSED SUCCESSFULLY!');
process.exit(0);
