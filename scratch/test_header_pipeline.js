const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'roles', 'transaction-coordinator.html');
const cssPath = path.join(__dirname, '..', 'assets', 'css', 'tc-case.css');
const wfJsPath = path.join(__dirname, '..', 'assets', 'js', 'workflow.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const wfJs = fs.readFileSync(wfJsPath, 'utf8');

console.log('=== TEST HEADER PIPELINE STEPPER INTEGRATION ===');

console.log('\n--- 1. Testing HTML Structure ---');
// 1. Check that tc-header-pipeline-wrap exists inside tc-sim-header
const headerMatch = html.match(/<div class="[^"]*tc-sim-header[^"]*" id="tc-sim-header">([\s\S]*?)<\/div>\s*<div class="lc-panel-body/);
if (!headerMatch) throw new Error('Could not find .tc-sim-header block in transaction-coordinator.html');

const headerContent = headerMatch[1];
if (!headerContent.includes('id="tc-header-pipeline-wrap"')) {
  throw new Error('#tc-header-pipeline-wrap is not inside #tc-sim-header');
}
if (!headerContent.includes('id="wf-pipeline"')) {
  throw new Error('#wf-pipeline is not inside #tc-sim-header');
}
console.log('✓ PASS: #wf-pipeline is inside #tc-header-pipeline-wrap in #tc-sim-header');

// 2. Check that #wf-pipeline is NOT inside #sim-workflow
const wfMatch = html.match(/<div id="sim-workflow"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<footer/);
if (!wfMatch) throw new Error('Could not find #sim-workflow block in transaction-coordinator.html');

if (wfMatch[1].includes('id="wf-pipeline"')) {
  throw new Error('Duplicate #wf-pipeline found inside #sim-workflow!');
}
console.log('✓ PASS: No duplicate #wf-pipeline inside #sim-workflow');

// 3. Count total occurrences of id="wf-pipeline" in html
const occurrences = (html.match(/id="wf-pipeline"/g) || []).length;
if (occurrences !== 1) {
  throw new Error(`Expected exactly 1 id="wf-pipeline", found ${occurrences}`);
}
console.log('✓ PASS: Exactly 1 id="wf-pipeline" in transaction-coordinator.html');

console.log('\n--- 2. Testing CSS Styling ---');
if (!css.includes('.tc-sim-header .wf-pipeline')) {
  throw new Error('Missing .tc-sim-header .wf-pipeline in tc-case.css');
}
if (!css.includes('background: transparent !important;')) {
  throw new Error('Missing transparent background for header pipeline');
}
if (!css.includes('.tc-header-pipeline-wrap')) {
  throw new Error('Missing .tc-header-pipeline-wrap in tc-case.css');
}
if (!css.includes('grid-template-columns: 376px minmax(0, 1fr) !important;')) {
  throw new Error('Missing 376px grid-template-columns in tc-case.css');
}
if (!css.includes('.tc-sim-header .wf-pipe-node')) {
  throw new Error('Missing .tc-sim-header .wf-pipe-node styling in tc-case.css');
}
if (!css.includes('.tc-sim-header .wf-pipe-step.active .wf-pipe-node')) {
  throw new Error('Missing .tc-sim-header .wf-pipe-step.active .wf-pipe-node styling');
}
console.log('✓ PASS: All required CSS classes and properties present in tc-case.css');

console.log('\n--- 3. Testing workflow.js Pipeline Logic & Visibility ---');
// Mock DOM environment for workflow.js
const elements = {};
function makeEl(id) {
  const styles = {};
  const el = {
    id: id,
    innerHTML: '',
    style: {
      display: '',
      width: '',
      get display() { return styles.display !== undefined ? styles.display : ''; },
      set display(v) { styles.display = v; }
    },
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); }
    },
    querySelector(sel) { return null; },
    querySelectorAll(sel) { return []; },
    scrollIntoView() {}
  };
  elements[id] = el;
  return el;
}

['wf-pipeline', 'tc-header-pipeline-wrap', 'wf-scorebar-fallback', 'wf-score-float', 'sim-workflow',
 'sim-play', 'sim-pick', 'sim-view-cities', 'sim-cards', 'wf-body', 'wf-step-chip', 'wf-label-chip',
 'wf-prog', 'wf-hint-fab', 'wf-fab-stack', 'wf-notif-container', 'panel-sim'].forEach(makeEl);

const sandbox = {
  document: {
    getElementById(id) {
      if (!elements[id]) elements[id] = makeEl(id);
      return elements[id];
    },
    querySelector(s) { return null; },
    querySelectorAll(s) { return []; },
    body: {
      style: {},
      classList: {
        add() {},
        remove() {},
        contains() { return false; }
      }
    }
  },
  window: {},
  localStorage: {
    getItem(k) { return null; },
    setItem(k, v) {},
    removeItem(k) {}
  },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  confirm: () => true,
  esc: (s) => s,
  simPickCenterToggle: () => {},
  simRenderCards: () => {},
  simDataForState: () => []
};

sandbox.window = sandbox;

// Execute workflow.js in sandbox
vm.createContext(sandbox);
vm.runInContext(wfJs, sandbox);

// Setup a scenario
const labels = [
  'New Listing Assignment',
  'Listing Agreement & File Setup',
  'Offer Review & Negotiation',
  'Open Escrow',
  'EMD & Disclosures',
  'Inspections & Repairs',
  'Appraisal & Wire Fraud',
  'Closing & Post-Closing'
];

const steps = labels.map((lbl, i) => () => `<div id="step-${i}">${lbl}</div>`);

const mockSc = {
  usePipeline: true,
  wfLabels: labels,
  wfSteps: steps
};

// 1. Start workflow
sandbox.wfStart(mockSc, 0);

const pipe = elements['wf-pipeline'];
const wrap = elements['tc-header-pipeline-wrap'];

if (pipe.style.display === 'none') {
  throw new Error('Expected #wf-pipeline to be visible on wfStart');
}
if (wrap.style.display !== 'flex') {
  throw new Error(`Expected #tc-header-pipeline-wrap to be flex, got "${wrap.style.display}"`);
}
if (!pipe.innerHTML.includes('New Listing Assignment')) {
  throw new Error('Pipeline HTML missing step 1 label');
}
if (!pipe.innerHTML.includes('Closing &amp; Post-Closing') && !pipe.innerHTML.includes('Closing & Post-Closing')) {
  throw new Error('Pipeline HTML missing step 8 label');
}
console.log('✓ PASS: wfStart() correctly displayed #wf-pipeline and #tc-header-pipeline-wrap with 8 steps');

// 2. Advance step
sandbox.wfNext();
const currentStep = vm.runInContext('wfStep', sandbox);
if (currentStep !== 1) {
  throw new Error(`Expected wfStep to be 1, got ${currentStep}`);
}
if (!pipe.innerHTML.includes('wf-pipe-step done')) {
  throw new Error('Step 1 should be marked done after advancing');
}
console.log('✓ PASS: wfNext() advanced step and marked completed node');

// 3. Reset workflow
sandbox.wfReset();
if (pipe.style.display !== 'none') {
  throw new Error('Expected #wf-pipeline to be hidden after wfReset()');
}
if (wrap.style.display !== 'none') {
  throw new Error('Expected #tc-header-pipeline-wrap to be hidden after wfReset()');
}
console.log('✓ PASS: wfReset() cleanly hid #wf-pipeline and #tc-header-pipeline-wrap');

// 4. Test simReset
sandbox.wfStart(mockSc, 0);
sandbox.simReset();
if (pipe.style.display !== 'none' || wrap.style.display !== 'none') {
  throw new Error('Expected pipeline to be hidden after simReset()');
}
console.log('✓ PASS: simReset() cleanly hid #wf-pipeline and #tc-header-pipeline-wrap');

// 5. Test simBackToCities
sandbox.wfStart(mockSc, 0);
sandbox.simBackToCities();
if (pipe.style.display !== 'none' || wrap.style.display !== 'none') {
  throw new Error('Expected pipeline to be hidden after simBackToCities()');
}
console.log('✓ PASS: simBackToCities() cleanly hid #wf-pipeline and #tc-header-pipeline-wrap');

// 6. Test closePanel('sim')
sandbox.wfStart(mockSc, 0);
sandbox.closePanel('sim');
if (pipe.style.display !== 'none' || wrap.style.display !== 'none') {
  throw new Error('Expected pipeline to be hidden after closePanel("sim")');
}
console.log('✓ PASS: closePanel("sim") cleanly hid #wf-pipeline and #tc-header-pipeline-wrap');

console.log('\n=======================================');
console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
console.log('=======================================');
