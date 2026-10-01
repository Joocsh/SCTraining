const fs = require('fs');
const path = require('path');
const assert = require('assert');

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
      contains: function(x) { return this.tokens.has(x); }
    },
    style: {},
    appendChild: function(c) { return c; },
    addEventListener: function() {},
    setAttribute: function() {},
    getAttribute: function() { return null; }
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

global.window = {
  esc: (s) => String(s || ''),
  addEventListener: () => {},
  document: global.document,
  localStorage: { getItem: () => null, setItem: () => {} }
};

eval(sellerJs);
const exported = global.window.TC_CA_SELLER_CASE;
console.log('Case exported:', exported ? exported.title : 'null');

// Step 0 function
const step0Html = exported.wfSteps[0]();
assert(typeof step0Html === 'string', 'Step 0 must return html string');
assert(step0Html.includes('wf-task-hint-btn'), 'Step 0 must contain in-task hint button');
assert(step0Html.includes('wf-task-hint-box-hs-file'), 'Step 0 must contain hint box for hs-file');
assert(step0Html.includes('wf-task-hint-box-hs-intake-info'), 'Step 0 must contain hint box for hs-intake-info');
assert(step0Html.includes('Pistas de Ben'), 'Step 0 must show Pistas de Ben');
assert(step0Html.includes('1. El Objetivo'), 'Step 0 must show 1. El Objetivo tab');
assert(step0Html.includes('2. Dónde buscar'), 'Step 0 must show 2. Dónde buscar tab');
assert(step0Html.includes('3. Datos Clave &amp; Checklist'), 'Step 0 must show 3. Datos Clave & Checklist tab');

console.log('✓ Step 0 successfully renders in-task hints for hs-file and hs-intake-info!');

// Step 1 function
const step1Html = exported.wfSteps[1]();
assert(step1Html.includes('wf-task-hint-box-hs-zf'), 'Step 1 must contain hint box for hs-zf');
assert(step1Html.includes('wf-task-hint-box-hs-ss'), 'Step 1 must contain hint box for hs-ss');
console.log('✓ Step 1 successfully renders in-task hints for ZipForms and SkySlope!');

// Step 2 function
const step2Html = exported.wfSteps[2]();
assert(step2Html.includes('wf-task-hint-box-hs-take-reply'), 'Step 2 must contain hint box for hs-take-reply');
console.log('✓ Step 2 successfully renders in-task hints for hs-take-reply!');

console.log('\nAll step rendering verifications passed successfully!');
