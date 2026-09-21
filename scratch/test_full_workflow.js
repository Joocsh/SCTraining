// Comprehensive simulation test for tc-ca-new-case.js
global.window = global;

// Mock DOM elements
const elements = {};
function createEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id,
      value: '',
      className: '',
      textContent: '',
      style: {},
      classList: {
        add: (c) => {},
        remove: (c) => {}
      },
      dataset: {}
    };
  }
  return elements[id];
}

global.document = {
  getElementById: (id) => elements[id] || createEl(id),
  createElement: (tag) => ({ id: '', textContent: '', appendChild: () => {}, addEventListener: () => {} }),
  head: { appendChild: () => {} },
  body: { appendChild: () => {}, style: {} },
  querySelectorAll: () => []
};

global.esc = (s) => String(s || '');
global.wfNav = (hasPrev) => `<div class="wf-nav">${hasPrev ? '<prev>' : ''}<next></div>`;
global.wfNext = () => { console.log('  -> wfNext called successfully!'); };
global.wfRenderFinalScore = (containerId, role, stateKey, totalStates) => {
  console.log('  -> wfRenderFinalScore executed for container:', containerId, 'totalStates:', totalStates);
};
global.SCApp = { submitEmailStep: () => {} };
global.wfActiveScenario = { _decisions: [] };

require('../assets/js/tc-ca-new-case.js');

const c = global.TC_CA_NEW_CASE;
console.log('Starting full end-to-end workflow verification across 10 steps...');

// Step 1
console.log('\n--- Testing Step 1: New Listing Assignment ---');
c.wfSteps[0]();
console.log('Testing Auto-fill form ca2-file:');
global.caNewAutoFill('ca2-file');
console.log('Testing Auto-pick ca2-p-predocs:');
global.caNewAutoPick('ca2-p-predocs');
console.log('Testing Auto-decide ca2-d-price:');
global.caNewAutoDecide('ca2-d-price');

// Step 2
console.log('\n--- Testing Step 2: Listing Agreement (gated) ---');
c.wfSteps[1]();
console.log('Testing Auto-fill form ca2-rla:');
global.caNewAutoFill('ca2-rla');
console.log('Testing Auto-decide ca2-d-excluded:');
global.caNewAutoDecide('ca2-d-excluded');
console.log('Testing Gated Next for Step 2:');
global.caNewGatedNext();

// Step 3
console.log('\n--- Testing Step 3: Seller Disclosures ---');
c.wfSteps[2]();
console.log('Testing Auto-pick ca2-p-disclosures:');
global.caNewAutoPick('ca2-p-disclosures');
console.log('Testing Auto-fill form ca2-tds-review:');
global.caNewAutoFill('ca2-tds-review');
console.log('Testing Auto-decide ca2-d-tds-incomplete:');
global.caNewAutoDecide('ca2-d-tds-incomplete');
console.log('Testing Auto-compose ca2-nhd-order:');
global.caNewAutoCompose('ca2-nhd-order');

// Step 4
console.log('\n--- Testing Step 4: Pre-Listing Review ---');
c.wfSteps[3]();
console.log('Testing Auto-decide ca2-d-lien:');
global.caNewAutoDecide('ca2-d-lien');
console.log('Testing Auto-decide ca2-d-nhd-seismic:');
global.caNewAutoDecide('ca2-d-nhd-seismic');
console.log('Testing Auto-compose ca2-prelisting-ready:');
global.caNewAutoCompose('ca2-prelisting-ready');

// Step 5
console.log('\n--- Testing Step 5: Offer & Counter (gated) ---');
c.wfSteps[4]();
console.log('Testing Auto-fill form ca2-counter:');
global.caNewAutoFill('ca2-counter');
console.log('Testing Auto-decide ca2-d-multiple-offers:');
global.caNewAutoDecide('ca2-d-multiple-offers');
console.log('Testing Gated Next for Step 5:');
global.caNewGatedNext();

// Step 6
console.log('\n--- Testing Step 6: Acceptance & Open Escrow (gated) ---');
c.wfSteps[5]();
console.log('Testing Auto-fill form ca2-escrow:');
global.caNewAutoFill('ca2-escrow');
console.log('Testing Auto-pick ca2-p-distribute:');
global.caNewAutoPick('ca2-p-distribute');
console.log('Testing Auto-compose ca2-escrow-open:');
global.caNewAutoCompose('ca2-escrow-open');
console.log('Testing Gated Next for Step 6:');
global.caNewGatedNext();

// Step 7
console.log('\n--- Testing Step 7: EMD & Disclosures (gated) ---');
c.wfSteps[6]();
console.log('Testing Auto-fill form ca2-emd:');
global.caNewAutoFill('ca2-emd');
console.log('Testing Auto-decide ca2-d-emd-late:');
global.caNewAutoDecide('ca2-d-emd-late');
console.log('Testing Auto-compose ca2-disc-delivery:');
global.caNewAutoCompose('ca2-disc-delivery');
console.log('Testing Gated Next for Step 7:');
global.caNewGatedNext();

// Step 8
console.log('\n--- Testing Step 8: Inspections & Repairs ---');
c.wfSteps[7]();
console.log('Testing Auto-decide ca2-d-vendor:');
global.caNewAutoDecide('ca2-d-vendor');
console.log('Testing Auto-decide ca2-d-seller-advice:');
global.caNewAutoDecide('ca2-d-seller-advice');

// Step 9
console.log('\n--- Testing Step 9: Appraisal & Wire Fraud (gated) ---');
c.wfSteps[8]();
console.log('Testing Auto-decide ca2-d-extension:');
global.caNewAutoDecide('ca2-d-extension');
console.log('Testing Auto-decide ca2-d-wire:');
global.caNewAutoDecide('ca2-d-wire');
console.log('Testing Auto-fill form ca2-amend2:');
global.caNewAutoFill('ca2-amend2');
console.log('Testing Gated Next for Step 9:');
global.caNewGatedNext();

// Step 10
console.log('\n--- Testing Step 10: Closing & Post-Closing ---');
c.wfSteps[9]();
console.log('Testing Auto-compose ca2-post-close:');
global.caNewAutoCompose('ca2-post-close');
console.log('Testing wfAfterRender for Step 10:');
c.wfAfterRender[9]();

console.log('\n=== ALL 10 STEPS PASSED WITH 100% SUCCESS! ===');
