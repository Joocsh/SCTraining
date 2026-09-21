// Test script for tc-ca-new-case.js
global.window = global;
global.document = {
  getElementById: (id) => null,
  createElement: (tag) => ({ id: '', textContent: '', appendChild: () => {} }),
  head: { appendChild: () => {} },
  body: { appendChild: () => {}, style: {} },
  querySelectorAll: () => []
};

// Dummy helpers from workflow.js
global.esc = (s) => String(s || '');
global.wfNav = (hasPrev) => `<div class="wf-nav">${hasPrev ? '<prev>' : ''}<next></div>`;
global.wfRenderFinalScore = (containerId, role, stateKey, totalStates) => {
  console.log('wfRenderFinalScore called with:', { containerId, role, stateKey, totalStates });
};
global.SCApp = { submitEmailStep: () => {} };

require('../assets/js/tc-ca-new-case.js');

const c = global.TC_CA_NEW_CASE;
console.log('Case loaded:');
console.log('Title:', c.title);
console.log('Step count:', c.stepCount);
console.log('Labels count:', c.wfLabels.length);
console.log('Steps count:', c.wfSteps.length);

if (c.stepCount !== 10) throw new Error('Expected 10 steps, got ' + c.stepCount);
if (c.wfLabels.length !== 10) throw new Error('Expected 10 labels, got ' + c.wfLabels.length);
if (c.wfSteps.length !== 10) throw new Error('Expected 10 step functions, got ' + c.wfSteps.length);

c.wfSteps.forEach((fn, i) => {
  try {
    const html = fn();
    if (!html || typeof html !== 'string') throw new Error('Step ' + (i + 1) + ' did not return HTML string');
    console.log(`Step ${i + 1} (${c.wfLabels[i]}): OK (${html.length} chars)`);
  } catch (err) {
    console.error(`Error in Step ${i + 1}:`, err);
    process.exit(1);
  }
});

// Test afterRender
if (c.wfAfterRender && c.wfAfterRender[9]) {
  c.wfAfterRender[9]();
  console.log('Step 10 afterRender: OK');
}

console.log('All 10 steps verified successfully!');
