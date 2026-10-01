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
assert(exported, 'TC_CA_SELLER_CASE must be exported');

console.log('Total steps:', exported.wfSteps.length);

exported.wfSteps.forEach((stepFn, idx) => {
  const html = stepFn();
  assert(typeof html === 'string' && html.length > 0, `Step ${idx} must return valid HTML string`);
  console.log(`✓ Step ${idx} generated successfully (${html.length} bytes)`);
});

// Step 0
const step0Html = exported.wfSteps[0]();
assert(step0Html.includes('wf-task-hint-box-hs-file'), 'Step 0 must have hs-file hint');
assert(step0Html.includes('wf-task-hint-box-hs-p-missing'), 'Step 0 must have hs-p-missing hint');
assert(step0Html.includes('wf-task-hint-box-hs-intake-info'), 'Step 0 must have hs-intake-info hint');

// Step 1
const step1Html = exported.wfSteps[1]();
assert(step1Html.includes('wf-task-hint-box-hs-zf'), 'Step 1 must have hs-zf hint');
assert(step1Html.includes('wf-task-hint-box-hs-ss'), 'Step 1 must have hs-ss hint');
assert(step1Html.includes('wf-task-hint-box-hs-expire'), 'Step 1 must have hs-expire hint');

// Step 2
const step2Html = exported.wfSteps[2]();
assert(step2Html.includes('wf-task-hint-box-hs-offer'), 'Step 2 must have hs-offer hint');
assert(step2Html.includes('wf-task-hint-box-hs-take-reply'), 'Step 2 must have hs-take-reply hint');

// Step 3
const step3Html = exported.wfSteps[3]();
assert(step3Html.includes('wf-task-hint-box-hs-escrow-open'), 'Step 3 must have hs-escrow-open hint');
assert(step3Html.includes('wf-task-hint-box-hs-emd'), 'Step 3 must have hs-emd hint');

// Step 4
const step4Html = exported.wfSteps[4]();
assert(step4Html.includes('wf-task-hint-box-hs-p-pkg'), 'Step 4 must have hs-p-pkg hint');
assert(step4Html.includes('wf-task-hint-box-hs-p-flags'), 'Step 4 must have hs-p-flags hint');
assert(step4Html.includes('wf-task-hint-box-hs-disc'), 'Step 4 must have hs-disc hint');

// Step 5
const step5Html = exported.wfSteps[5]();
assert(step5Html.includes('wf-task-hint-box-hs-access'), 'Step 5 must have hs-access hint');
assert(step5Html.includes('wf-task-hint-box-hs-rr-reply'), 'Step 5 must have hs-rr-reply hint');
assert(step5Html.includes('wf-task-hint-box-hs-rr'), 'Step 5 must have hs-rr hint');
assert(step5Html.includes('wf-task-hint-box-hs-repairs'), 'Step 5 must have hs-repairs hint');

// Step 6
const step6Html = exported.wfSteps[6]();
assert(step6Html.includes('wf-task-hint-box-hs-prelim'), 'Step 6 must have hs-prelim hint');
assert(step6Html.includes('wf-task-hint-box-hs-si'), 'Step 6 must have hs-si hint');
assert(step6Html.includes('wf-task-hint-box-hs-p-preclose'), 'Step 6 must have hs-p-preclose hint');
assert(step6Html.includes('wf-task-hint-box-hs-ac'), 'Step 6 must have hs-ac hint');
assert(step6Html.includes('wf-task-hint-box-hs-wire'), 'Step 6 must have hs-wire hint');

// Step 7
const step7Html = exported.wfSteps[7]();
assert(step7Html.includes('wf-task-hint-box-hs-stmt'), 'Step 7 must have hs-stmt hint');
assert(step7Html.includes('wf-task-hint-box-hs-wrapup'), 'Step 7 must have hs-wrapup hint');

console.log('\n================================================================');
console.log('ALL 8 STEPS (0 TO 7) AND ALL 22 TASKS VERIFIED WITH EMBEDDED HINTS!');
console.log('================================================================');
