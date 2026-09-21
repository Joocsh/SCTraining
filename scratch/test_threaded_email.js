const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('--- TESTING THREADED EMAIL CONVERSATION IN STEP 1 SLIDE 3 ---');

// 1. Verify CSS rules
const cssContent = fs.readFileSync(path.join(__dirname, '../assets/css/tc-case.css'), 'utf8');
const requiredClasses = [
  '.wf-thread-divider',
  '.wf-thread-divider-icon',
  '.wf-thread-divider-text',
  '.wf-thread-container',
  '.wf-thread-client-bar',
  '.wf-thread-path',
  '.wf-thread-body',
  '.wf-thread-msg',
  '.wf-thread-msg.outgoing',
  '.wf-thread-msg.outgoing.sent',
  '.wf-thread-msg.incoming',
  '.wf-thread-msg-header',
  '.wf-thread-avatar',
  '.wf-thread-avatar.outgoing',
  '.wf-thread-avatar.incoming',
  '.wf-thread-msg-meta',
  '.wf-thread-msg-sender',
  '.wf-thread-msg-time',
  '.wf-thread-badge',
  '.wf-thread-sent-badge',
  '.wf-thread-msg-body',
  '.wf-thread-sent-text',
  '.wf-thread-msg.outgoing .wf-compose',
  '.wf-thread-msg.outgoing .wf-compose-topbar',
  '.wf-thread-msg.outgoing .wf-compose-header',
  '.wf-thread-msg.incoming.wf-phase-enter'
];

for (const cls of requiredClasses) {
  if (!cssContent.includes(cls)) {
    throw new Error(`Missing CSS selector: ${cls}`);
  }
}
console.log('✓ All 26 required threaded email CSS selectors are present in tc-case.css');

// 2. Setup DOM and JS Context
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
    // Execute immediately for testing
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

// 3. Verify HTML structure of slide 3
assert(step0Html.includes('class="wf-thread-divider"'), 'Should have thread divider');
assert(step0Html.includes('Now draft your email to Sofia requesting the missing details'), 'Divider text correct');
assert(step0Html.includes('class="wf-thread-container"'), 'Should have thread container');
assert(step0Html.includes('class="wf-thread-client-bar"'), 'Should have thread client bar');
assert(step0Html.includes('Inbox &rsaquo; Listings &rsaquo; 4827 Rolando Blvd &rsaquo; <strong>RE: New Listing Assignment</strong>'), 'Breadcrumb correct');
assert(step0Html.includes('class="wf-thread-msg outgoing" id="ca2-thread-compose"'), 'Compose wrap has outgoing msg classes');
assert(step0Html.includes('class="wf-thread-msg incoming" id="ca2-s0-sofia-reply"'), 'Sofia reply has incoming msg classes');
assert(step0Html.includes('class="wf-thread-avatar incoming">SR</div>'), 'Sofia avatar SR');
assert(step0Html.includes('Replied 3 minutes later &middot; Mon, Sep 22, 2025'), 'Sofia timestamp correct');
assert(step0Html.includes('Verified Agent'), 'Verified Agent badge present');
console.log('✓ Slide 3 HTML structure properly incorporates threaded container, client bar, divider, and messages');

// 4. Verify sent bubble transformation
// Navigate to slide 3
ctx.caNewAutoFill('ca2-file');
ctx.caNewCheck('ca2-file');
ctx.caNewSlide1Next();
ctx.caNewAutoPick('ca2-p-predocs');
ctx.caNewSlide2Next();
assert.strictEqual(ctx._caNewSlide0, 3, 'Should be on slide 3');

// Complete picker
ctx.caNewAutoPick('ca2-p-missing');

// Autofill compose body
ctx.caNewAutoCompose('ca2-missing-info');
const ta = getEl('wf-ca2-missing-info-body');
assert(ta.value.length > 50, 'Auto compose filled text');

// Submit compose
const composeWrap = getEl('ca2-thread-compose');
ctx.caNewSubmitCompose('ca2-missing-info', {
  textareaId: 'wf-ca2-missing-info-body',
  statusElId: 'wf-ca2-missing-info-body-status',
  btnId: 'wf-ca2-missing-info-body-btn',
  role: 'tc',
  scenarioId: 'tc-ca-missing-info',
  prompt: 'Request missing listing details from Sofia Reyes'
});

// Verify compose transformed into sent bubble
assert(composeWrap.classList.contains('sent'), 'Compose wrap should have class "sent"');
assert(composeWrap.innerHTML.includes('wf-thread-avatar outgoing">TC</div>'), 'Sent bubble has TC avatar');
assert(composeWrap.innerHTML.includes('wf-thread-sent-badge">&#10003; Sent &amp; Graded</span>'), 'Sent badge present');
assert(composeWrap.innerHTML.includes('wf-thread-sent-text'), 'Sent preformatted text block present');
assert(composeWrap.innerHTML.includes('Buyer\'s Agent Compensation'), 'Sent text content preserved');

// Verify Sofia reply is displayed
const sofiaReplyEl = getEl('ca2-s0-sofia-reply');
assert.strictEqual(sofiaReplyEl.style.display, 'block', 'Sofia reply should be display: block');

// Verify next button is displayed
const nextBtn = getEl('ca2-s0-info-next');
assert.strictEqual(nextBtn.style.display, 'inline-flex', 'Next button should be display: inline-flex');

console.log('✓ Compose successfully transformed into sent bubble upon submission, preserving text and displaying grading badge');
console.log('✓ Sofia reply and Next button shown in email thread');

// 5. Verify navigation to slide 4
ctx.caNewSlide3Next();
assert.strictEqual(ctx._caNewSlide0, 4, 'Should advance to Slide 4');
console.log('✓ caNewSlide3Next advances to Slide 4');

// 6. Verify returning to slide 3 retains sent bubble
ctx.caNewGoSlide(3);
assert.strictEqual(ctx._caNewSlide0, 3, 'Back on Slide 3');
assert(composeWrap.classList.contains('sent'), 'Compose wrap still has sent state after navigating back');
console.log('✓ Navigating back to Slide 3 retains the threaded sent state');

console.log('--- ALL THREADED EMAIL CONVERSATION TESTS PASSED! ---');
