const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Test that loading workflow.js, tc-ca-new-case.js, and tc-ca-seller-case.js together works seamlessly
const workflowJs = fs.readFileSync(path.join(__dirname, '../assets/js/workflow.js'), 'utf8');
const buyerJs = fs.readFileSync(path.join(__dirname, '../assets/js/tc-ca-new-case.js'), 'utf8');
const sellerJs = fs.readFileSync(path.join(__dirname, '../assets/js/tc-ca-seller-case.js'), 'utf8');

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

global.document = {
  body: createMockEl('body'),
  head: createMockEl('head'),
  createElement: (t) => createMockEl(t),
  getElementById: (id) => mockElements.get(id) || null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};

const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

global.window = {
  esc: (s) => String(s || ''),
  addEventListener: () => {},
  document: global.document,
  localStorage: global.localStorage
};

console.log('Loading workflow.js...');
eval(workflowJs);
console.log('Loading tc-ca-new-case.js (Buyer side)...');
eval(buyerJs);
console.log('Loading tc-ca-seller-case.js (Seller side)...');
eval(sellerJs);

assert(global.window.TC_CA_SELLER_CASE, 'TC_CA_SELLER_CASE must exist');
console.log('✓ All 3 scripts loaded together without collisions!');

// Verify Seller Case Title and Steps
console.log('Seller Case Title:', global.window.TC_CA_SELLER_CASE.title);
assert.strictEqual(global.window.TC_CA_SELLER_CASE.wfSteps.length, 8, 'Must have 8 steps (0-7)');

console.log('\nIntegration test passed with 100% success!');
