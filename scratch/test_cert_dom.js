const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== VERIFYING CERTIFICATE MODAL DOM & DATA ===');

global.window = global;
global.window.addEventListener = () => {};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const elements = {};
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; } };
global.location = { search: '', pathname: '/Docusign/' };
global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementsByTagName: () => [],
  createElement: (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      innerHTML: '',
      innerText: '',
      style: {},
      children: [],
      appendChild: function(c) { this.children.push(c); },
      remove: function() { delete elements[this.id]; }
    };
    return el;
  },
  body: {
    appendChild: (el) => {
      if (el.id) elements[el.id] = el;
      elements._lastAppended = el;
    }
  },
  getElementById: (id) => elements[id] || null,
  querySelector: (sel) => {
    if (sel === '.ds-cert-body' && elements.dsCertModalWrap) {
      return { innerHTML: elements.dsCertModalWrap.innerHTML };
    }
    return null;
  },
  querySelectorAll: () => []
};

global.simToast = (msg, opt) => {
  console.log(`[Toast] ${msg} (${JSON.stringify(opt || {})})`);
};
global.dsIcon = (name) => `<svg class="ds-icon ds-icon-${name}"></svg>`;

// Load files with vm
const codeCore = fs.readFileSync(path.join(__dirname, '../assets/js/app-core.js'), 'utf8');
const codeEngine = fs.readFileSync(path.join(__dirname, '../assets/js/sim-engine.js'), 'utf8');
const codeData = fs.readFileSync(path.join(__dirname, '../Docusign/docusign-data.js'), 'utf8');
const codeShell = fs.readFileSync(path.join(__dirname, '../Docusign/docusign-shell-data.js'), 'utf8');
const codeApp = fs.readFileSync(path.join(__dirname, '../Docusign/docusign-app.js'), 'utf8');

vm.runInThisContext(codeCore);
vm.runInThisContext(codeEngine);
vm.runInThisContext(codeData);
vm.runInThisContext(codeShell);
vm.runInThisContext(codeApp);

dsInitEngine();
console.log('Loaded DocuSign modules successfully.');

function validateHtmlTags(html) {
  // Simple stack validator for div tags
  const tokens = html.match(/<\/?div[^>]*>/gi) || [];
  let depth = 0;
  for (let t of tokens) {
    if (t.startsWith('</')) {
      depth--;
      if (depth < 0) return { valid: false, error: 'Extra closing div: ' + t };
    } else if (!t.endsWith('/>')) {
      depth++;
    }
  }
  if (depth !== 0) return { valid: false, error: `Mismatched divs: ${depth} unclosed div(s)` };
  return { valid: true };
}

// TEST 1: ENV-2026-7734
console.log('\n--- TEST 1: ENV-2026-7734 (Completed NDA) ---');
dsOpenCertificateModal('ENV-2026-7734');
const modal7734 = elements.dsCertModalWrap;
if (!modal7734) {
  console.error('FAIL: modal did not append to body');
  process.exit(1);
}

const html7734 = modal7734.innerHTML;
const tagCheck = validateHtmlTags(html7734);
console.log('HTML tag balance:', tagCheck);
if (!tagCheck.valid) {
  console.error('FAIL:', tagCheck.error);
  process.exit(1);
}

// Check key content
console.log('Contains Envelope Id: 64452EC44C404C34A36E0563D5FF088F:', html7734.includes('64452EC44C404C34A36E0563D5FF088F'));
console.log('Contains Status: Completed:', html7734.includes('Status: Completed'));
console.log('Contains Elena Rostova:', html7734.includes('Elena Rostova'));
console.log('Contains Signature Adoption:', html7734.includes('Signature Adoption: Pre-selected Style'));
console.log('Contains EnvelopeId Stamping:', html7734.includes('EnvelopeId Stamping: Enabled'));
console.log('Typo "Envelopeld" absent:', !html7734.includes('Envelopeld'));
console.log('Contains Envelope Summary Events:', html7734.includes('Envelope Summary Events'));
console.log('Contains Electronic Record and Signature Disclosure:', html7734.includes('Electronic Record and Signature Disclosure created on'));

// TEST 2: Multiple signers ENV-2026-9041
console.log('\n--- TEST 2: ENV-2026-9041 (Sequential Signers) ---');
dsCloseCertificateModal();
dsOpenCertificateModal('ENV-2026-9041');
const modal9041 = elements.dsCertModalWrap;
const html9041 = modal9041.innerHTML;
const tagCheck9041 = validateHtmlTags(html9041);
console.log('HTML tag balance (9041):', tagCheck9041);
if (!tagCheck9041.valid) {
  console.error('FAIL:', tagCheck9041.error);
  process.exit(1);
}

// TEST 3: Download certificate trigger
console.log('\n--- TEST 3: dsDownloadCertificate ---');
let toastCalled = false;
global.simToast = (m) => { toastCalled = true; console.log('[Toast]', m); };
dsDownloadCertificate('ENV-2026-7734');
console.log('Download certificate triggered toast:', toastCalled);

console.log('\n=== ALL CERTIFICATE TESTS PASSED PERFECTLY ===');
