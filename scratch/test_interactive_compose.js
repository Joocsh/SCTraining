const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('--- TESTING INTERACTIVE RECIPIENTS, AUTOCOMPLETE, AND VALIDATION ---');

// 1. Setup mock DOM and context
const domElements = {};
function makeElement(tag, id = '') {
  return {
    tagName: tag.toUpperCase(),
    id: id,
    style: { display: '' },
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); }
    },
    value: '',
    children: [],
    innerHTML: '',
    parentNode: null,
    nextElementSibling: null,
    firstElementChild: null,
    scrollIntoView: () => {},
    focus: () => {},
    closest(selector) {
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        let curr = this;
        while (curr) {
          if (curr.classList && curr.classList.contains(cls)) return curr;
          curr = curr.parentNode;
        }
      }
      return null;
    }
  };
}

function getEl(id) {
  if (!domElements[id]) domElements[id] = makeElement('div', id);
  return domElements[id];
}

const mockDoc = {
  getElementById: (id) => getEl(id),
  querySelector: (sel) => makeElement('div'),
  querySelectorAll: (sel) => [],
  createElement: (tag) => makeElement(tag)
};

const windowObj = {
  document: mockDoc,
  localStorage: {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  },
  setTimeout: (fn, ms) => {
    fn();
    return 1;
  },
  setInterval: () => 1,
  clearInterval: () => {},
  clearTimeout: () => {}
};
windowObj.window = windowObj;

const ctx = vm.createContext(windowObj);

// Load workflow & case files
const workflowJs = fs.readFileSync(path.join(__dirname, '../assets/js/workflow.js'), 'utf8');
const caseJs = fs.readFileSync(path.join(__dirname, '../assets/js/tc-ca-new-case.js'), 'utf8');

vm.runInContext(workflowJs, ctx);
vm.runInContext(caseJs, ctx);

// Start workflow
ctx.wfStart(ctx.TC_CA_NEW_CASE);
const step0Html = getEl('wf-body').innerHTML;

// Verify interactive inputs exist in HTML
assert(step0Html.includes('id="wf-ca2-missing-info-to"'), 'To input should exist');
assert(step0Html.includes('id="wf-ca2-missing-info-cc"'), 'CC input should exist');
assert(step0Html.includes('id="wf-ca2-missing-info-subj"'), 'Subject input should exist');
assert(step0Html.includes('id="wf-ca2-missing-info-to-suggestions"'), 'To suggestions dropdown should exist');
assert(step0Html.includes('id="wf-ca2-missing-info-cc-suggestions"'), 'CC suggestions dropdown should exist');
console.log('✓ Interactive input elements (To, CC, Subject, and suggestion dropdowns) rendered in HTML');

// Check inputs start empty
const toInput = getEl('wf-ca2-missing-info-to');
const ccInput = getEl('wf-ca2-missing-info-cc');
const subjInput = getEl('wf-ca2-missing-info-subj');
const bodyInput = getEl('wf-ca2-missing-info-body');
const statusEl = getEl('wf-ca2-missing-info-body-status');

assert.strictEqual(toInput.value, '', 'To input starts empty');
assert.strictEqual(ccInput.value, '', 'CC input starts empty');
assert.strictEqual(subjInput.value, '', 'Subject input starts empty');
assert.strictEqual(bodyInput.value, '', 'Body textarea starts empty');
console.log('✓ All 4 fields (To, CC, Subject, Body) start completely empty for student creativity');

// Test Autocomplete Filtering
toInput.value = 'sofia';
ctx.caNewFilterContacts('ca2-missing-info', 'to');
const toDrop = getEl('wf-ca2-missing-info-to-suggestions');
assert(toDrop.innerHTML.includes('Sofia Reyes'), 'Autocomplete should suggest Sofia Reyes');
assert(toDrop.innerHTML.includes('sofia.reyes@bhhscal.com'), 'Autocomplete should show Sofia email');
assert.strictEqual(toDrop.style.display, 'block', 'Dropdown should be visible');

// Test Selecting Contact
ctx.caNewSelectContact('ca2-missing-info', 'to', 'Sofia Reyes', 'sofia.reyes@bhhscal.com');
assert.strictEqual(toInput.value, 'Sofia Reyes <sofia.reyes@bhhscal.com>', 'Selected contact properly formatted in input');
assert.strictEqual(toDrop.style.display, 'none', 'Dropdown closed after selection');
console.log('✓ Autocomplete search and selection work properly');

const submitOpts = {
  textareaId: 'wf-ca2-missing-info-body',
  statusElId: 'wf-ca2-missing-info-body-status',
  btnId: 'wf-ca2-missing-info-body-btn',
  role: 'tc',
  scenarioId: 'tc-ca-missing-info',
  prompt: 'Request missing listing details from Sofia Reyes'
};

// Test Validation Case A: To is empty
toInput.value = '';
ctx.caNewSubmitCompose('ca2-missing-info', submitOpts);
assert(statusEl.innerHTML.includes('Recipient Missing'), 'Should reject empty To');
assert(!ctx.TC_CA_NEW_CASE._mh['c_ca2-missing-info'], 'Should not mark completed');
console.log('✓ Validation Case A: Empty To rejected with clear guidance');

// Test Validation Case B: To is wrong person (Daniel Herrera)
toInput.value = 'Daniel Herrera <herrera.family@email.com>';
ctx.caNewSubmitCompose('ca2-missing-info', submitOpts);
assert(statusEl.innerHTML.includes('Incorrect Recipient'), 'Should reject seller in To');
assert(statusEl.innerHTML.includes('Sofia Reyes'), 'Error mentions Sofia Reyes');
assert(!ctx.TC_CA_NEW_CASE._mh['c_ca2-missing-info'], 'Should not mark completed');
console.log('✓ Validation Case B: Seller in To rejected with educational explanation');

// Test Validation Case C: CC is populated (should be empty)
toInput.value = 'Sofia Reyes <sofia.reyes@bhhscal.com>';
ccInput.value = 'Daniel Herrera <herrera.family@email.com>';
ctx.caNewSubmitCompose('ca2-missing-info', submitOpts);
assert(statusEl.innerHTML.includes('"CC" Field Must Be Empty'), 'Should reject CC populated');
assert(statusEl.innerHTML.includes('internal TC-to-Agent listing preparation'), 'Explains internal listing prep reason');
assert(!ctx.TC_CA_NEW_CASE._mh['c_ca2-missing-info'], 'Should not mark completed');
console.log('✓ Validation Case C: Populated CC rejected with explanation of internal TC-agent communication');

// Test Validation Case D: Subject is empty
ccInput.value = '';
subjInput.value = '';
ctx.caNewSubmitCompose('ca2-missing-info', submitOpts);
assert(statusEl.innerHTML.includes('Subject Line Missing'), 'Should reject empty Subject');
assert(!ctx.TC_CA_NEW_CASE._mh['c_ca2-missing-info'], 'Should not mark completed');
console.log('✓ Validation Case D: Empty Subject rejected');

// Test Validation Case E: Subject is too vague / missing property or purpose
subjInput.value = 'Quick question about the file';
ctx.caNewSubmitCompose('ca2-missing-info', submitOpts);
assert(statusEl.innerHTML.includes('Incomplete Subject Line'), 'Should reject vague Subject');
assert(statusEl.innerHTML.includes('4827 Rolando Blvd'), 'Guidance specifies property reference');
assert(!ctx.TC_CA_NEW_CASE._mh['c_ca2-missing-info'], 'Should not mark completed');
console.log('✓ Validation Case E: Vague Subject rejected with property and purpose requirements');

// Test Validation Case F: Body is too short
subjInput.value = '4827 Rolando Blvd — RLA Missing Details';
bodyInput.value = 'Hi Sofia';
ctx.caNewSubmitCompose('ca2-missing-info', submitOpts);
assert(statusEl.innerHTML.includes('Email Body Incomplete'), 'Should reject short body');
assert(!ctx.TC_CA_NEW_CASE._mh['c_ca2-missing-info'], 'Should not mark completed');
console.log('✓ Validation Case F: Incomplete email body rejected');

// Test Validation Case G: Standard autofill sets all fields
ctx.caNewAutoCompose('ca2-missing-info');
assert.strictEqual(toInput.value, 'Sofia Reyes <sofia.reyes@bhhscal.com>', 'Auto compose sets To');
assert.strictEqual(ccInput.value, '', 'Auto compose clears CC');
assert(subjInput.value.includes('4827 Rolando Blvd'), 'Auto compose sets Subject with property');
assert(bodyInput.value.length > 100, 'Auto compose sets full draft');
console.log('✓ Auto compose properly populates To, CC (empty), Subject, and Body');

// Submit valid compose
const composeWrap = getEl('ca2-thread-compose');
ctx.caNewSubmitCompose('ca2-missing-info', submitOpts);
assert(ctx.TC_CA_NEW_CASE._mh['c_ca2-missing-info'] === 1, 'Marked completed in state');
assert(composeWrap.classList.contains('sent'), 'Compose wrap transformed into sent bubble');
assert(composeWrap.innerHTML.includes('Sofia Reyes &lt;sofia.reyes@bhhscal.com&gt;'), 'Sent bubble displays To recipient');
assert(composeWrap.innerHTML.includes('4827 Rolando Blvd'), 'Sent bubble displays Subject line');
console.log('✓ Valid compose submitted successfully and rendered with To and Subject details in thread');

console.log('--- ALL INTERACTIVE COMPOSE TESTS PASSED! ---');
