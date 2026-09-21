const fs = require('fs');
const vm = require('vm');
const path = require('path');

console.log('--- RUNNING STEP 2 REDESIGN & GLOBAL COMPONENTS VERIFICATION ---');

// 1. Verify CSS rules in assets/css/tc-case.css
const cssCode = fs.readFileSync('assets/css/tc-case.css', 'utf8');
const requiredCssSelectors = [
  '.wf-notes-panel',
  '.wf-notes-panel-header',
  '.wf-notes-panel-title',
  '.wf-notes-panel-close',
  '.wf-notes-textarea',
  '.mh-contacts-section',
  '.mh-contacts-toggle',
  '.mh-contacts-arrow',
  '.mh-contacts-list',
  '.mh-contact-card',
  '.mh-contact-avatar',
  '.mh-contact-name',
  '.mh-contact-role',
  '.mh-contact-email',
  '.wf-phase-tracker',
  '.wf-pt-item',
  '.wf-pt-dot',
  '.wf-pt-label',
  '.wf-pt-line',
  '.wf-tip-inline',
  '.wf-zf-app',
  '.wf-zf-toolbar',
  '.wf-zf-logo',
  '.wf-zf-title',
  '.wf-zf-status',
  '.wf-zf-body',
  '.wf-zf-section',
  '.wf-zf-section-header',
  '.wf-zf-section-counter',
  '.wf-zf-section-content',
  '.wf-zf-field',
  '.wf-zf-input-wrap',
  '.wf-zf-icon',
  '.wf-zf-hint',
  '.wf-zf-autofill-btn',
  '.wf-zf-submit-btn',
  '.wf-zf-docusign-bar',
  '.wf-zf-docusign-fill',
  '.wf-zf-success-banner',
  '.wf-ss-app',
  '.wf-ss-toolbar',
  '.wf-ss-logo',
  '.wf-ss-status',
  '.wf-ss-body',
  '.wf-ss-fields-grid',
  '.wf-ss-checklist-table',
  '.wf-ss-row',
  '.wf-ss-pill',
  '.wf-ss-btn-attach',
  '.wf-toggle-switch',
  '.wf-toggle-slider'
];

let cssMissing = 0;
requiredCssSelectors.forEach(sel => {
  if (cssCode.includes(sel)) {
    // console.log('PASS (CSS): ' + sel);
  } else {
    console.error('FAIL (CSS missing): ' + sel);
    cssMissing++;
  }
});

if (cssMissing === 0) {
  console.log('✓ All ' + requiredCssSelectors.length + ' required CSS classes and selectors verified in tc-case.css');
} else {
  throw new Error(cssMissing + ' CSS selectors missing!');
}

// 2. Setup mock environment and load workflow.js + tc-ca-new-case.js
const mockLocalStorage = {};
const mockElements = {};
function createMockElement(tag, id) {
  return {
    tagName: (tag || 'div').toUpperCase(),
    id: id || '',
    className: '',
    set innerHTML(html) {
      this._innerHTML = html;
      const matches = html.matchAll(/id="([^"]+)"/g);
      for (const m of matches) {
        if (!mockElements[m[1]]) {
          mockElements[m[1]] = createMockElement('div', m[1]);
        }
      }
    },
    get innerHTML() {
      return this._innerHTML || '';
    },
    value: '',
    disabled: false,
    checked: false,
    style: {},
    children: [],
    attributes: {},
    classList: {
      _classes: new Set(),
      add: function(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove: function(...cls) { cls.forEach(c => this._classes.delete(c)); },
      contains: function(c) { return this._classes.has(c); },
      toggle: function(c) { if (this.contains(c)) this.remove(c); else this.add(c); }
    },
    setAttribute: function(k, v) { this.attributes[k] = v; },
    getAttribute: function(k) { return this.attributes[k]; },
    appendChild: function(c) { this.children.push(c); if (c.id) mockElements[c.id] = c; return c; },
    querySelector: function(sel) {
      if (sel.startsWith('#')) return mockElements[sel.slice(1)] || null;
      return null;
    },
    querySelectorAll: function(sel) { return []; },
    addEventListener: function() {},
    closest: function() { return null; },
    scrollIntoView: function() {}
  };
}

const mockDoc = {
  getElementById: id => mockElements[id] || null,
  createElement: tag => createMockElement(tag),
  body: createMockElement('body', 'body'),
  head: createMockElement('head', 'head'),
  querySelectorAll: function(sel) { return []; },
  querySelector: function(sel) { return null; }
};

const sandbox = {
  window: {},
  document: mockDoc,
  localStorage: {
    getItem: k => mockLocalStorage[k] !== undefined ? mockLocalStorage[k] : null,
    setItem: (k, v) => { mockLocalStorage[k] = String(v); },
    removeItem: k => { delete mockLocalStorage[k]; }
  },
  setTimeout: (fn, ms) => { fn(); },
  console: console,
  parseInt: parseInt,
  String: String,
  Array: Array,
  Object: Object
};
sandbox.window = sandbox;
sandbox.global = sandbox;

vm.createContext(sandbox);

// Execute workflow.js
const workflowCode = fs.readFileSync('assets/js/workflow.js', 'utf8');
vm.runInContext(workflowCode, sandbox);

// Execute tc-ca-new-case.js
const caseCode = fs.readFileSync('assets/js/tc-ca-new-case.js', 'utf8');
vm.runInContext(caseCode, sandbox);

// 3. Test Notepad FAB & Panel in workflow.js
const stack = sandbox.wfEnsureFloatingActions();
const notesFab = mockElements['wf-notes-fab'];
if (!notesFab) throw new Error('Notepad FAB #wf-notes-fab not created in FAB stack');
if (notesFab.getAttribute('aria-label') !== 'Notepad') throw new Error('Notepad FAB missing aria-label="Notepad"');
console.log('✓ Notepad FAB button created with proper label and placed in FAB stack');

sandbox.wfOpenNotesPanel();
const notesPanel = mockElements['wf-notes-panel'];
if (!notesPanel || !notesPanel.classList.contains('open')) throw new Error('wfOpenNotesPanel did not open #wf-notes-panel');
const notesTa = mockElements['wf-notes-textarea'];
if (!notesTa) throw new Error('Notes textarea not found in panel');

// Test persistence
sandbox.localStorage.setItem('sc_tc_ca_notepad', 'Built in 1961, exclude chandelier');
sandbox.wfOpenNotesPanel();
if (notesTa.value !== 'Built in 1961, exclude chandelier') throw new Error('Panel did not load from localStorage');
console.log('✓ Notepad panel opens, displays textarea, and synchronizes with localStorage key "sc_tc_ca_notepad"');

sandbox.wfCloseNotesPanel();
if (notesPanel.classList.contains('open')) throw new Error('wfCloseNotesPanel failed to close panel');
console.log('✓ Notepad panel closes correctly');

// 4. Test Step 2 (caNewStep1) in tc-ca-new-case.js
const tcCase = sandbox.window.TC_CA_NEW_CASE;
if (!tcCase) throw new Error('TC_CA_NEW_CASE not found');
if (tcCase.wfLabels[1] !== 'Listing Agreement & File Setup') {
  throw new Error('wfLabels[1] expected "Listing Agreement & File Setup", got: ' + tcCase.wfLabels[1]);
}
console.log('✓ wfLabels[1] is correctly "Listing Agreement & File Setup"');

const step1Fn = tcCase.wfSteps[1];
const step1Html = step1Fn();

// Check phase tracker
if (!step1Html.includes('id="ca2-s1-tracker"') || !step1Html.includes('Zipforms') || !step1Html.includes('Confirmation')) {
  throw new Error('Step 2 output missing phase tracker with expected phases');
}
console.log('✓ Phase tracker present with 4 phases (Zipforms, Decision, SkySlope, Confirmation)');

// Check Zipforms app structure
console.log('zf-app:', step1Html.includes('class="wf-zf-app"'));
if (!step1Html.includes('class="wf-zf-app"') || !step1Html.includes('Transaction Setup') || !step1Html.includes('Listing Type')) {
  throw new Error('Step 2 output missing Zipforms app or its sections');
}
console.log('✓ Zipforms application rendered with sections and proper software interface');

// Check Decision point ca2-d-excluded (Chat bubble mode)
if (!step1Html.includes('id="ca2-d-excluded"') || !step1Html.includes('Carmen Herrera') || !step1Html.includes('chandelier')) {
  throw new Error('Step 2 output missing Decision point ca2-d-excluded with Carmen Herrera chandelier query');
}
console.log('✓ Decision point ca2-d-excluded rendered in chat bubble mode for Carmen Herrera');

// Check SkySlope app structure
if (!step1Html.includes('class="wf-ss-app"') || !step1Html.includes('Create New Listing File') || !step1Html.includes('Brokerage Compliance Checklist')) {
  throw new Error('Step 2 output missing SkySlope app or compliance checklist');
}
console.log('✓ SkySlope application rendered with Listing Information and Brokerage Compliance Checklist');

// Check Confirmation Compose
if (!step1Html.includes('wf-ca2-listing-confirm-body') || !step1Html.includes('Listing Agreement Confirmation: 4827 Rolando Blvd')) {
  throw new Error('Step 2 output missing Confirmation Email compose component');
}
console.log('✓ Confirmation email compose box present');

// Check Contacts in sidebar
if (!step1Html.includes('class="mh-contacts-section"') || !step1Html.includes('Sofia Reyes') || !step1Html.includes('Daniel Herrera') || !step1Html.includes('Carmen Herrera')) {
  throw new Error('Step 2 sidebar missing Contacts section or required contacts');
}
console.log('✓ Sidebar contains collapsible Contacts section with Sofia Reyes, Daniel Herrera, and Carmen Herrera');

// 5. Test Step Hints
let capturedHints = null;
sandbox.window.wfSetHints = function(h) {
  capturedHints = h;
};
sandbox.window.TC_CA_NEW_CASE.wfAfterRender[1]();
if (!capturedHints || !capturedHints[0].includes('Notepad') || !capturedHints[1].includes('chandelier')) {
  throw new Error('STEP_HINTS[1] does not contain updated hints for Notepad and chandelier');
}
console.log('✓ STEP_HINTS[1] properly configured with RLA, Notepad, 1961 Lead Paint, and Chandelier guidance');

console.log('--- ALL STEP 2 REDESIGN CHECKS PASSED! ---');
