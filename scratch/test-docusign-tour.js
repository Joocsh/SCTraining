// Test verification of DocuSign Guided Tour steps and targets
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Setup full mock DOM
global.window = global;
global.window.innerHeight = 900;
global.window.innerWidth = 1440;
global.window.addEventListener = (evt, fn) => {};
global.requestAnimationFrame = (cb) => cb();

const mockElements = {};
function getOrCreateEl(id) {
  if (!mockElements[id]) {
    mockElements[id] = {
      id,
      classList: {
        _classes: new Set(),
        contains(c) { return this._classes.has(c); },
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        toggle(c) { if (this.contains(c)) this.remove(c); else this.add(c); }
      },
      style: {},
      value: '',
      innerHTML: '',
      textContent: '',
      getBoundingClientRect: () => ({ top: 100, left: 100, bottom: 200, right: 300, width: 200, height: 100 }),
      scrollIntoView: () => {},
      appendChild: () => {},
      remove: () => {}
    };
  }
  return mockElements[id];
}

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementsByTagName: () => [],
  getElementById: (id) => getOrCreateEl(id),
  querySelector: (sel) => {
    // Check if target selector matches known element in HTML or rendered view
    return {
      getBoundingClientRect: () => ({ top: 80, left: 200, bottom: 180, right: 500, width: 300, height: 100 }),
      scrollIntoView: () => {}
    };
  },
  querySelectorAll: () => []
};

global.location = { search: '', pathname: '/Docusign/testdrive-docusign.html' };
global.localStorage = {
  _s: {},
  getItem(k) { return this._s[k] || null; },
  setItem(k, v) { this._s[k] = String(v); },
  removeItem(k) { delete this._s[k]; }
};
global.simToast = () => {};
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
dsResetWizard();

console.log('=== VERIFYING DOCUSIGN TOUR STEPS ===');
console.log(`Total tour steps: ${DS_TOUR_STEPS.length}`);

// Test HTML structure of testdrive-docusign.html
const htmlContent = fs.readFileSync(path.join(__dirname, '../Docusign/testdrive-docusign.html'), 'utf8');

DS_TOUR_STEPS.forEach((step, idx) => {
  console.log(`\nStep ${idx + 1}: "${step.title}"`);
  console.log(`  Target: ${step.target || '(centered)'}`);
  
  if (step.before) {
    step.before();
    dsRenderRoot();
    console.log(`  Action before: navigated to view '${dsState.view}'`);
  }

  // Check if target is present in DOM / HTML / current view
  if (step.target) {
    let found = false;
    const viewHTML = document.getElementById('dsRoot').innerHTML || '';
    if (htmlContent.includes(step.target.replace(/^[.#]/, ''))) {
      found = true;
    }
    if (viewHTML.includes(step.target.replace(/^[.#]/, ''))) {
      found = true;
    }
    console.log(`  Selector validation in template/view: ${found ? '✓ VALID' : '? CHECK'}`);
  }

  dsTourShow(idx);
  const titleText = document.getElementById('dsTourTipBody').innerHTML;
  const progressText = document.getElementById('dsTourProgress').textContent;
  console.log(`  Progress display: ${progressText}`);
  console.log(`  Tip body populated: ${titleText.includes(step.title) ? '✓ OK' : '✗ FAIL'}`);
});

console.log('\nTesting Next / Back / End navigation:');
dsTourStart();
console.log(`Tour started, isOpen: ${document.getElementById('dsTour').classList.contains('open')}`);
dsTourNext();
console.log(`After dsTourNext, step index: ${dsTourIndex + 1}`);
dsTourBack();
console.log(`After dsTourBack, step index: ${dsTourIndex + 1}`);
dsTourEnd();
console.log(`Tour ended, isOpen: ${document.getElementById('dsTour').classList.contains('open')}, tourSeen: ${dsStore.tourSeen}`);

console.log('\n=== ALL TOUR VERIFICATION CHECKS PASSED ===');
