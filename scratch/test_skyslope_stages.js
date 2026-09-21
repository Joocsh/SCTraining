const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('--- Testing SkySlope 2-Stage Architecture (Option A) ---');

const mockLocalStorage = {};
const mockElements = {};

function createMockElement(tag, id) {
  return {
    tagName: (tag || 'div').toUpperCase(),
    id: id || '',
    className: '',
    _classes: new Set(),
    get classList() {
      const self = this;
      return {
        add: (...cls) => cls.forEach(c => self._classes.add(c)),
        remove: (...cls) => cls.forEach(c => self._classes.delete(c)),
        contains: (c) => self._classes.has(c),
        toggle: (c) => { if (self._classes.has(c)) self._classes.delete(c); else self._classes.add(c); }
      };
    },
    set innerHTML(html) {
      this._innerHTML = html;
      const tagMatches = html.matchAll(/<([a-z0-9-]+)([^>]*)id="([^"]+)"([^>]*)>/gi);
      for (const m of tagMatches) {
        const id = m[3];
        const allAttrs = m[2] + ' ' + m[4];
        if (!mockElements[id]) {
          mockElements[id] = createMockElement(m[1], id);
        }
        const classMatch = allAttrs.match(/class="([^"]+)"/);
        if (classMatch) {
          classMatch[1].trim().split(/\s+/).forEach(c => mockElements[id]._classes.add(c));
        }
        const styleMatch = allAttrs.match(/style="([^"]+)"/);
        if (styleMatch) {
          styleMatch[1].split(';').forEach(pair => {
            const [k, v] = pair.split(':');
            if (k && v) mockElements[id].style[k.trim()] = v.trim();
          });
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
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    removeAttribute(k) { delete this.attributes[k]; },
    appendChild(c) { this.children.push(c); if (c.id) mockElements[c.id] = c; return c; },
    querySelector(sel) {
      if (sel.startsWith('#')) return mockElements[sel.slice(1)] || null;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    scrollIntoView() {}
  };
}

const mockDoc = {
  getElementById: id => mockElements[id] || null,
  createElement: tag => createMockElement(tag),
  body: createMockElement('body', 'body'),
  head: createMockElement('head', 'head'),
  querySelectorAll: () => [],
  querySelector: () => null
};

const mockStorage = {};
const mockScenario = {
  _mh: mockStorage,
  _decisions: [],
  _mhFor: null
};
mockScenario._mhFor = mockScenario._decisions;

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

// Load workflow.js & tc-ca-new-case.js
const workflowCode = fs.readFileSync('assets/js/workflow.js', 'utf8');
vm.runInContext(workflowCode, sandbox);

const caseCode = fs.readFileSync('assets/js/tc-ca-new-case.js', 'utf8');
vm.runInContext(caseCode, sandbox);

sandbox.mockScenario = mockScenario;
vm.runInContext('wfActiveScenario = mockScenario;', sandbox);

const step1Fn = sandbox.window.TC_CA_NEW_CASE.wfSteps[1];
const html = step1Fn();

// Populate DOM with rendered HTML
const root = createMockElement('div', 'root');
root.innerHTML = html;

console.log('1. Initial SkySlope App Render Check');
assert(html.includes('class="wf-ss-app"'), 'Must render wf-ss-app');
assert(html.includes('id="ca2-ss-tab-0"'), 'Must render Tab 0');
assert(html.includes('id="ca2-ss-tab-1"'), 'Must render Tab 1');
assert(html.includes('id="ca2-ss-stage-0"'), 'Must render Stage 0 (Listing Info)');
assert(html.includes('id="ca2-ss-stage-1"'), 'Must render Stage 1 (Checklist)');

const stage0 = mockElements['ca2-ss-stage-0'];
const stage1 = mockElements['ca2-ss-stage-1'];
const tab0 = mockElements['ca2-ss-tab-0'];
const tab1 = mockElements['ca2-ss-tab-1'];

assert.strictEqual(stage0.style.display, 'block', 'Stage 0 should be visible initially');
assert.strictEqual(stage1.style.display, 'none', 'Stage 1 should be hidden initially');
assert(tab0.classList.contains('active'), 'Tab 0 should be active');
assert(tab1.classList.contains('locked'), 'Tab 1 should be locked initially');
console.log('✓ Stage 0 is active and Stage 1 is locked on initial render');

console.log('2. Cannot switch to Tab 1 before creating listing file');
sandbox.window.caNewSsSwitchTab('ca2-ss', 1);
assert.strictEqual(stage0.style.display, 'block', 'Stage 0 must remain visible');
assert.strictEqual(stage1.style.display, 'none', 'Stage 1 must remain hidden');
const infoErr = mockElements['ca2-ss-info-err'];
assert(infoErr.innerHTML.includes('Listing File Not Created'), 'Shows error message when attempting to access locked checklist');
console.log('✓ Prevented opening checklist before file creation');

console.log('3. Validate and Create Listing File');
let created = sandbox.window.caNewSsCreateListing('ca2-ss');
assert.strictEqual(created, false, 'Should fail creation with empty fields');
assert(infoErr.innerHTML.includes('Incomplete Listing Info'), 'Shows incomplete info error');

// Fill fields
sandbox.window.caNewSsAutoFillFields('ca2-ss');
created = sandbox.window.caNewSsCreateListing('ca2-ss');
assert.strictEqual(created, true, 'Should succeed creation with filled fields');

assert.strictEqual(stage0.style.display, 'none', 'Stage 0 is now hidden');
assert.strictEqual(stage1.style.display, 'block', 'Stage 1 is now visible');
assert(tab1.classList.contains('active'), 'Tab 1 is now active');
assert(!tab1.classList.contains('locked'), 'Tab 1 is now unlocked');
console.log('✓ Successfully created listing file and transitioned to Stage 1 (Checklist)');

console.log('4. Navigating between Tabs 0 and 1');
sandbox.window.caNewSsSwitchTab('ca2-ss', 0);
assert.strictEqual(stage0.style.display, 'block', 'Stage 0 visible after switching back');
assert.strictEqual(stage1.style.display, 'none', 'Stage 1 hidden');
assert(tab0.classList.contains('active'), 'Tab 0 active');

sandbox.window.caNewSsSwitchTab('ca2-ss', 1);
assert.strictEqual(stage0.style.display, 'none', 'Stage 0 hidden');
assert.strictEqual(stage1.style.display, 'block', 'Stage 1 visible');
assert(tab1.classList.contains('active'), 'Tab 1 active');
console.log('✓ User can freely switch between Listing Info and Compliance Checklist after creation');

console.log('5. Completing Checklist and Submitting');
sandbox.window.caNewSsAutoFillChecklist('ca2-ss');
sandbox.window.caNewSsSubmit('ca2-ss');
const st = sandbox.window.wfActiveScenario ? sandbox.window.wfActiveScenario._mh : {};
assert.strictEqual(st['ss_submitted_ca2-ss'], true, 'Listing file submitted');
const statusEl = mockElements['ca2-ss-status'];
assert(statusEl.innerHTML.includes('Submitted for Review'), 'Status shows submitted for review');
console.log('✓ Successfully submitted listing file for broker compliance review');

console.log('--- ALL SKYSLOPE 2-STAGE TESTS PASSED! ---');
