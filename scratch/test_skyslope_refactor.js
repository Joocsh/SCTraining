const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('=== Testing SkySlope Refactor (Progressive Reveal, Sidebar Drag-and-Drop, Wrong-Doc Feedback) ===');

const mockLocalStorage = {};
const mockElementsById = {};
const mockElementsByDoc = {};
const allMockElements = [];

function createMockElement(tag, id, attrs = {}) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    id: id || '',
    className: attrs.class || '',
    _classes: new Set((attrs.class || '').split(/\s+/).filter(Boolean)),
    attributes: { ...attrs },
    get classList() {
      const self = this;
      return {
        add: (...cls) => { cls.forEach(c => self._classes.add(c)); self.className = Array.from(self._classes).join(' '); },
        remove: (...cls) => { cls.forEach(c => self._classes.delete(c)); self.className = Array.from(self._classes).join(' '); },
        contains: (c) => self._classes.has(c),
        toggle: (c) => { if (self._classes.has(c)) self._classes.delete(c); else self._classes.add(c); self.className = Array.from(self._classes).join(' '); }
      };
    },
    set innerHTML(html) {
      this._innerHTML = html;
      parseAndRegisterElements(html);
    },
    get innerHTML() {
      return this._innerHTML || '';
    },
    value: '',
    disabled: false,
    checked: false,
    style: {},
    children: [],
    setAttribute(k, v) { this.attributes[k] = String(v); if (k === 'class') { this._classes = new Set(v.split(/\s+/).filter(Boolean)); this.className = v; } },
    getAttribute(k) { return this.attributes[k]; },
    removeAttribute(k) { delete this.attributes[k]; },
    appendChild(c) { this.children.push(c); return c; },
    querySelector(sel) {
      return mockDoc.querySelector(sel, this);
    },
    querySelectorAll(sel) {
      return mockDoc.querySelectorAll(sel, this);
    },
    addEventListener() {},
    scrollIntoView() {}
  };
  if (attrs.style) {
    attrs.style.split(';').forEach(p => {
      const [k, v] = p.split(':');
      if (k && v) el.style[k.trim()] = v.trim();
    });
  }
  return el;
}

function parseAndRegisterElements(html) {
  const tagRegex = /<([a-z0-9-]+)([^>]*)>/gi;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1];
    const attrString = match[2];
    const attrs = {};
    const attrRegex = /([a-zA-Z0-9_-]+)(?:="([^"]*)")?/g;
    let aMatch;
    while ((aMatch = attrRegex.exec(attrString)) !== null) {
      attrs[aMatch[1]] = aMatch[2] !== undefined ? aMatch[2] : true;
    }
    const id = attrs.id || '';
    const el = createMockElement(tag, id, attrs);
    allMockElements.push(el);
    if (id) mockElementsById[id] = el;
    if (attrs['data-doc']) mockElementsByDoc[attrs['data-doc']] = el;
  }
}

const mockDoc = {
  getElementById: id => mockElementsById[id] || null,
  createElement: tag => createMockElement(tag),
  body: createMockElement('body', 'body'),
  head: createMockElement('head', 'head'),
  querySelector: (sel, root) => {
    if (sel.startsWith('#')) return mockElementsById[sel.slice(1)] || null;
    const docMatch = sel.match(/\.mh-doc\[data-doc="([^"]+)"\]/);
    if (docMatch) return mockElementsByDoc[docMatch[1]] || null;
    if (sel === '.mh-docs-section') {
      return allMockElements.find(e => e.classList.contains('mh-docs-section')) || null;
    }
    if (sel === '.mh-docs-count') {
      return allMockElements.find(e => e.classList.contains('mh-docs-count')) || null;
    }
    if (sel === '.mh-doc-assigned-badge') {
      return allMockElements.find(e => e.classList.contains('mh-doc-assigned-badge')) || null;
    }
    return null;
  },
  querySelectorAll: (sel, root) => {
    if (sel === '.mh-doc') return allMockElements.filter(e => e.classList.contains('mh-doc'));
    if (sel === '.wf-ss-dropzone') return allMockElements.filter(e => e.classList.contains('wf-ss-dropzone'));
    if (sel === '.mh-doc[data-doc]') return allMockElements.filter(e => e.classList.contains('mh-doc') && e.attributes['data-doc']);
    return [];
  }
};

const mockStorage = {};
const mockScenario = {
  _mh: mockStorage,
  _decisions: [],
  _mhFor: null
};
mockScenario._mhFor = mockScenario._decisions;

let recordedToast = null;
let recordedError = false;

const sandbox = {
  window: {},
  document: mockDoc,
  wfActiveScenario: mockScenario,
  localStorage: {
    getItem: k => mockLocalStorage[k] !== undefined ? mockLocalStorage[k] : null,
    setItem: (k, v) => { mockLocalStorage[k] = String(v); },
    removeItem: k => { delete mockLocalStorage[k]; }
  },
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
  console: console,
  parseInt: parseInt,
  String: String,
  Array: Array,
  Object: Object
};
sandbox.window = sandbox;
sandbox.global = sandbox;

vm.createContext(sandbox);

// Load workflow.js and tc-ca-new-case.js
const workflowCode = fs.readFileSync('assets/js/workflow.js', 'utf8');
vm.runInContext(workflowCode, sandbox);

const caseCode = fs.readFileSync('assets/js/tc-ca-new-case.js', 'utf8');
vm.runInContext(caseCode, sandbox);

sandbox.mockScenario = mockScenario;
vm.runInContext('wfActiveScenario = mockScenario;', sandbox);

// Hook toast to record messages
const origToast = sandbox.window.caNewSsToast;
sandbox.window.caNewSsToast = function(msg, isErr) {
  recordedToast = msg;
  recordedError = isErr;
  return origToast(msg, isErr);
};

// 1. Render Step 2 (caNewStep1)
console.log('\n--- 1. Testing Step 2 HTML and Removal of Doctray ---');
const step1Fn = sandbox.window.TC_CA_NEW_CASE.wfSteps[1];
const html = step1Fn();
parseAndRegisterElements(html);

// Assert doctray is completely gone
assert(!html.includes('wf-ss-doctray-col'), 'Must NOT contain wf-ss-doctray-col');
assert(!html.includes('wf-ss-layout-split'), 'Must NOT contain wf-ss-layout-split');
assert(!html.includes('Working Documents Tray'), 'Must NOT contain Working Documents Tray');
assert(html.includes('wf-ss-checklist-table'), 'Must contain wf-ss-checklist-table full width');
console.log('✓ Working Documents Tray and split layout removed, checklist is full width');

// 2. Check Sidebar Documents Panel
console.log('\n--- 2. Testing Sidebar Documents as Drag Sources ---');
const rlaBtn = mockElementsByDoc['rla'];
const tdsBtn = mockElementsByDoc['tds'];
const wireBtn = mockElementsByDoc['wire'];

assert(rlaBtn, 'Sidebar should contain RLA document button');
assert(tdsBtn, 'Sidebar should contain TDS distractor document button');
assert(wireBtn, 'Sidebar should contain Wire document button');
assert.strictEqual(rlaBtn.getAttribute('draggable'), 'true', 'RLA button must be draggable="true"');
assert.strictEqual(tdsBtn.getAttribute('draggable'), 'true', 'TDS button must be draggable="true"');
assert.strictEqual(wireBtn.style.display, 'none', 'Wire Fraud Advisory button must initially be hidden in sidebar');
console.log('✓ Sidebar documents are draggable and wire advisory is initially hidden');

// 3. Progressive Reveal & Animated Transition
console.log('\n--- 3. Testing Stage 0 -> Stage 1 Transition ---');
const tab0 = mockElementsById['ca2-ss-tab-0'];
const tab1 = mockElementsById['ca2-ss-tab-1'];
assert(tab0.classList.contains('active'), 'Tab 0 is initially active');
assert(tab1.classList.contains('locked'), 'Tab 1 is initially locked');

// Fill listing info and create listing
sandbox.window.caNewSsAutoFillFields('ca2-ss');
const created = sandbox.window.caNewSsCreateListing('ca2-ss');
assert.strictEqual(created, true, 'caNewSsCreateListing succeeds');
assert(!tab1.classList.contains('locked'), 'Tab 1 is unlocked');
assert(tab1.classList.contains('active'), 'Tab 1 is now active');
console.log('✓ Progressive reveal unlocked checklist tab after file creation');

// 4. Wrong-Document Feedback (Reject drop, red shake, no answer revealed)
console.log('\n--- 4. Testing Wrong-Document Feedback ---');
const rlaDrop = mockElementsById['ca2-ss-drop-rla'];
// Drop wrong document (e.g. 'tds') into 'rla' slot
recordedToast = null;
recordedError = false;
sandbox.window.caNewSsAssign('ca2-ss', 'rla', 'tds');

assert.strictEqual(recordedError, true, 'Wrong drop must trigger error state');
assert(recordedToast.includes("doesn't belong in this slot"), 'Toast informs that document does not belong here');
assert(!recordedToast.includes("Residential Listing Agreement"), 'Toast must NOT reveal the correct answer');
assert(!recordedToast.includes("RLA"), 'Toast must NOT reveal the correct answer code');
assert.strictEqual(sandbox.window.SS_STATE['ca2-ss_rla'], undefined, 'RLA slot must NOT be marked attached');
console.log('✓ Wrong-document drop rejected with generic feedback, answer NOT revealed');

// 5. Correct Document Drop & Sidebar Assignment
console.log('\n--- 5. Testing Correct Document Drop ---');
sandbox.window.caNewSsAssign('ca2-ss', 'rla', 'rla');
assert.strictEqual(sandbox.window.SS_STATE['ca2-ss_rla'], true, 'RLA slot is attached');
assert.strictEqual(rlaBtn.getAttribute('draggable'), 'false', 'Assigned sidebar doc becomes non-draggable');
assert(rlaBtn.classList.contains('is-assigned'), 'Assigned sidebar doc has is-assigned class');
console.log('✓ Correct document attached and sidebar document marked assigned');

// 6. Detach and Restore Sidebar Document
console.log('\n--- 6. Testing Detach Document ---');
sandbox.window.caNewSsDetach('ca2-ss', 'rla');
assert.strictEqual(sandbox.window.SS_STATE['ca2-ss_rla'], undefined, 'RLA slot is detached');
assert.strictEqual(rlaBtn.getAttribute('draggable'), 'true', 'Detached sidebar doc becomes draggable="true" again');
assert(!rlaBtn.classList.contains('is-assigned'), 'Detached sidebar doc removes is-assigned class');
console.log('✓ Detached document restores sidebar button to draggable');

// 7. Wire Fraud Missing Document Flow
console.log('\n--- 7. Testing Wire Fraud Missing Document Flow ---');
assert.strictEqual(wireBtn.style.display, 'none', 'Wire doc is hidden in sidebar before request');
sandbox.window.caNewSsSendRequest('ca2-ss', 'wire');
assert.strictEqual(sandbox.window.SS_STATE['ca2-ss_wire_requested'], true, 'Wire request marked in state');
assert.strictEqual(wireBtn.style.display, '', 'Wire doc in sidebar is now revealed');
console.log('✓ Wire Fraud Advisory missing flow reveals document in sidebar');

// Drop wire into wire slot
sandbox.window.caNewSsAssign('ca2-ss', 'wire', 'wire');
assert.strictEqual(sandbox.window.SS_STATE['ca2-ss_wire'], true, 'Wire slot attached');
assert.strictEqual(wireBtn.getAttribute('draggable'), 'false', 'Wire doc in sidebar is marked non-draggable');

// 8. Autofill Checklist and Submit
console.log('\n--- 8. Testing Autofill Checklist and Final Submission ---');
sandbox.window.caNewSsAutoFillChecklist('ca2-ss');
sandbox.window.caNewSsSubmit('ca2-ss');
const st = sandbox.window.wfActiveScenario ? sandbox.window.wfActiveScenario._mh : {};
assert.strictEqual(st['ss_submitted_ca2-ss'], true, 'SkySlope listing file submitted for review');
console.log('✓ SkySlope listing file successfully submitted for review');

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
