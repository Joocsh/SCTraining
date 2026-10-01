const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Test seller hints and dev mode
const sellerJs = fs.readFileSync(path.join(__dirname, '../assets/js/tc-ca-seller-case.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../assets/css/tc-case.css'), 'utf8');

// 1. Verify CSS rules for Dev Mode and In-Task Hints
console.log('1. Checking CSS rules...');
assert(css.includes('body:not(.tc-instructor):not(.tc-dev-mode) .tc-assist'), 'CSS must hide .tc-assist when neither tc-instructor nor tc-dev-mode');
assert(css.includes('body:not(.tc-instructor):not(.tc-dev-mode) .wf-compose-autofill'), 'CSS must hide .wf-compose-autofill');
assert(css.includes('body.tc-dev-mode #panel-sim .tc-assist'), 'CSS must show .tc-assist in tc-dev-mode');
assert(css.includes('.wf-task-hint-btn'), 'CSS must include .wf-task-hint-btn');
assert(css.includes('.wf-task-hint-box'), 'CSS must include .wf-task-hint-box');
assert(css.includes('.tc-dev-toast'), 'CSS must include .tc-dev-toast');
console.log('✓ CSS verification passed!');

// 2. Mock DOM environment for JS execution
console.log('2. Mocking DOM environment and loading tc-ca-seller-case.js...');
const mockElements = new Map();

function createMockEl(tag) {
  return {
    tagName: tag.toUpperCase(),
    id: '',
    className: '',
    classList: {
      tokens: new Set(),
      add: function(...c) { c.forEach(x => this.tokens.add(x)); },
      remove: function(...c) { c.forEach(x => this.tokens.delete(x)); },
      toggle: function(x, force) {
        if (force === true) { this.tokens.add(x); return true; }
        if (force === false) { this.tokens.delete(x); return false; }
        if (this.tokens.has(x)) { this.tokens.delete(x); return false; }
        this.tokens.add(x); return true;
      },
      contains: function(x) { return this.tokens.has(x); }
    },
    style: {},
    dataset: {},
    appendChild: function(c) { return c; },
    addEventListener: function() {},
    setAttribute: function() {},
    getAttribute: function() { return null; },
    scrollIntoView: function() {}
  };
}

const mockBody = createMockEl('body');
const mockHead = createMockEl('head');

const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

global.document = {
  body: mockBody,
  head: mockHead,
  createElement: (t) => createMockEl(t),
  getElementById: (id) => mockElements.get(id) || null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};

const listeners = [];
global.window = {
  esc: (s) => String(s || ''),
  addEventListener: (evt, handler) => { listeners.push({ evt, handler }); },
  document: global.document,
  localStorage: global.localStorage
};

// Evaluate tc-ca-seller-case.js
eval(sellerJs);

console.log('✓ Script loaded without errors!');

// 3. Test Developer Mode Keyboard Shortcut (Ctrl + Shift + D)
console.log('3. Testing Developer Mode shortcut...');
const keydownListener = listeners.find(l => l.evt === 'keydown');
assert(keydownListener, 'Must register keydown listener for developer mode');

// Simulate student mode initial state
assert(!mockBody.classList.contains('tc-dev-mode'), 'Initially tc-dev-mode should not be set');
assert(!mockBody.classList.contains('tc-instructor'), 'Initially tc-instructor should not be set');

// Press Ctrl + Shift + D
let prevented = false;
keydownListener.handler({
  ctrlKey: true,
  shiftKey: true,
  key: 'D',
  preventDefault: () => { prevented = true; }
});

assert(prevented, 'Ctrl+Shift+D should prevent default browser action');
assert(mockBody.classList.contains('tc-dev-mode'), 'tc-dev-mode should now be enabled');
assert(mockBody.classList.contains('tc-instructor'), 'tc-instructor should now be enabled');
assert.strictEqual(global.localStorage.getItem('tc_dev_mode'), '1', 'localStorage should persist tc_dev_mode = 1');
console.log('✓ Dev Mode activated and persisted correctly!');

// Press Ctrl + Shift + D again to toggle off
keydownListener.handler({
  ctrlKey: true,
  shiftKey: true,
  key: 'd',
  preventDefault: () => {}
});
assert(!mockBody.classList.contains('tc-dev-mode'), 'tc-dev-mode should now be disabled');
assert(!mockBody.classList.contains('tc-instructor'), 'tc-instructor should now be disabled');
assert.strictEqual(global.localStorage.getItem('tc_dev_mode'), '0', 'localStorage should persist tc_dev_mode = 0');
console.log('✓ Dev Mode toggled off correctly!');

// 4. Test Hint Toggle and Level Selection
console.log('4. Testing In-Task Hint UI functions...');
assert(typeof window.caNewToggleTaskHint === 'function', 'caNewToggleTaskHint must be defined');
assert(typeof window.caNewSelectHintLevel === 'function', 'caNewSelectHintLevel must be defined');

// Create mock elements for task hs-file
const mockBox = createMockEl('div');
mockBox.id = 'wf-task-hint-box-hs-file';
mockBox.style.display = 'none';
mockElements.set(mockBox.id, mockBox);

const tab1 = createMockEl('button'); tab1.id = 'tab-hs-file-1'; mockElements.set(tab1.id, tab1);
const tab2 = createMockEl('button'); tab2.id = 'tab-hs-file-2'; mockElements.set(tab2.id, tab2);
const tab3 = createMockEl('button'); tab3.id = 'tab-hs-file-3'; mockElements.set(tab3.id, tab3);

const pane1 = createMockEl('div'); pane1.id = 'hint-body-hs-file-1'; mockElements.set(pane1.id, pane1);
const pane2 = createMockEl('div'); pane2.id = 'hint-body-hs-file-2'; mockElements.set(pane2.id, pane2);
const pane3 = createMockEl('div'); pane3.id = 'hint-body-hs-file-3'; mockElements.set(pane3.id, pane3);

// Test Toggle
window.caNewToggleTaskHint('hs-file');
assert.strictEqual(mockBox.style.display, 'block', 'Hint box should be displayed after toggle');
assert(tab1.classList.contains('active'), 'Tab 1 should be active by default');
assert(pane1.classList.contains('active'), 'Pane 1 should be active by default');

// Test Switch to Level 2
window.caNewSelectHintLevel('hs-file', 2);
assert(!tab1.classList.contains('active'), 'Tab 1 should no longer be active');
assert(tab2.classList.contains('active'), 'Tab 2 should now be active');
assert(!pane1.classList.contains('active'), 'Pane 1 should no longer be active');
assert(pane2.classList.contains('active'), 'Pane 2 should now be active');

// Test Switch to Level 3
window.caNewSelectHintLevel('hs-file', 3);
assert(tab3.classList.contains('active'), 'Tab 3 should now be active');
assert(pane3.classList.contains('active'), 'Pane 3 should now be active');

// Test Toggle Close
window.caNewToggleTaskHint('hs-file');
assert.strictEqual(mockBox.style.display, 'none', 'Hint box should be hidden after second toggle');
console.log('✓ In-Task Hint UI functions tested and verified successfully!');

console.log('\n=========================================');
console.log('ALL TESTS PASSED! IMPLEMENTATION COMPLETE');
console.log('=========================================');
