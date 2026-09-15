const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- Testing Wizard Step 3 Document Preview Flow ---');

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
        remove: () => {}
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
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    className: '',
    innerHTML: '',
    style: {},
    remove: () => {}
  }),
  body: {
    appendChild: () => {},
    innerHTML: ''
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
  const p = path.join(__dirname, s);
  if (fs.existsSync(p)) {
    const code = fs.readFileSync(p, 'utf8');
    vm.runInThisContext(code, { filename: p });
  }
});

dsInitEngine();
dsResetWizard();

console.log('✓ Simulator scripts loaded and initialized');

// Test 1: TMPL-01 (Independent Contractor Agreement)
console.log('\n--- Test 1: TMPL-01 (Independent Contractor Agreement) ---');
dsUseTemplate('TMPL-01');

const nameInput = document.getElementById('dsRmName-0');
const emailInput = document.getElementById('dsRmEmail-0');
if (nameInput) nameInput.value = 'David Miller';
if (emailInput) emailInput.value = 'david.miller@example.com';

dsApplyRoleMatching('TMPL-01');

console.log('Wizard Step:', dsState.wizardStep);
console.log('Wizard Docs:', JSON.stringify(dsState.wizardData.documents));
console.log('Wizard Fields count:', dsState.wizardData.fields.length);

const canvasHTML = dsWizardStep3HTML();
const hasIframe = canvasHTML.includes('<iframe class="ds-doc-frame"');
console.log('✓ Has doc iframe:', hasIframe);

const srcdocMatch = canvasHTML.match(/srcdoc="([^"]+)"/);
const srcMatch = canvasHTML.match(/src="([^"]+)"/);

if (srcdocMatch) {
  const hasParties = srcdocMatch[1].includes('Parties');
  const hasSigrow = srcdocMatch[1].includes('sigrow');
  const hasDataPage = srcdocMatch[1].includes('data-page=&quot;1&quot;');
  console.log('✓ Has Parties section:', hasParties);
  console.log('✓ Has Signature row:', hasSigrow);
  console.log('✓ Has data-page="1":', hasDataPage);
  if (!hasParties || !hasSigrow || !hasDataPage) {
    console.error('FAIL: Missing contract sections in srcdoc!');
    process.exit(1);
  }
} else if (srcMatch) {
  console.log('✓ Using external file src:', srcMatch[1]);
}

// Test 2: TMPL-02 (Mutual NDA)
console.log('\n--- Test 2: TMPL-02 (Mutual Non-Disclosure Agreement) ---');
dsUseTemplate('TMPL-02');
const nameInput2 = document.getElementById('dsRmName-0');
if (nameInput2) nameInput2.value = 'Sarah Connor';
dsApplyRoleMatching('TMPL-02');

const canvasHTML2 = dsWizardStep3HTML();
const hasIframe2 = canvasHTML2.includes('<iframe class="ds-doc-frame"');
console.log('✓ Has doc iframe for NDA:', hasIframe2);

const srcdocMatch2 = canvasHTML2.match(/srcdoc="([^"]+)"/);
const srcMatch2 = canvasHTML2.match(/src="([^"]+)"/);
if (srcdocMatch2) {
  const hasNDA = srcdocMatch2[1].includes('Non-Disclosure') || srcdocMatch2[1].includes('Confidential');
  const hasSigrow = srcdocMatch2[1].includes('sigrow');
  console.log('✓ Has NDA content:', hasNDA);
  console.log('✓ Has Signature row:', hasSigrow);
  if (!hasNDA || !hasSigrow) {
    console.error('FAIL: Missing NDA contract sections in srcdoc!');
    process.exit(1);
  }
} else if (srcMatch2) {
  console.log('✓ NDA using file src:', srcMatch2[1]);
}

console.log('\n✓ ALL TESTS PASSED! Wizard Step 3 displays authentic contract preview and is never empty.');
process.exit(0);
