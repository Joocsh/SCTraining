const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== TESTING CALIFORNIA CASE PICKER SCREEN & CARD UI ===');

const html = fs.readFileSync(path.join(__dirname, '../roles/transaction-coordinator.html'), 'utf8');
const workflowJs = fs.readFileSync(path.join(__dirname, '../assets/js/workflow.js'), 'utf8');
const tcCaJs = fs.readFileSync(path.join(__dirname, '../assets/js/tc-ca-new-case.js'), 'utf8');

// Setup mock DOM environment
const elements = {};
function getOrCreate(id) {
  if (!elements[id]) {
    elements[id] = {
      id,
      style: {},
      innerHTML: '',
      textContent: '',
      children: [],
      appendChild(c) { this.children.push(c); return c; },
      onclick: null
    };
  }
  return elements[id];
}

const sandbox = {
  window: {},
  document: {
    getElementById: (id) => getOrCreate(id),
    querySelector: (sel) => {
      if (sel.startsWith('#')) return getOrCreate(sel.slice(1));
      return getOrCreate(sel.replace(/[^a-zA-Z0-9_-]/g, ''));
    },
    querySelectorAll: () => [],
    createElement: (tag) => ({
      tagName: tag,
      className: '',
      style: {},
      innerHTML: '',
      children: [],
      appendChild(c) { this.children.push(c); return c; },
      onclick: null
    }),
    body: { style: {} }
  },
  console: console,
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
  getComputedStyle: () => ({ display: 'block' }),
  esc: (s) => (s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '')
};
sandbox.window = sandbox;
sandbox.global = sandbox;

vm.createContext(sandbox);

// 1. Run tc-ca-new-case.js
vm.runInContext(tcCaJs, sandbox);
console.log('✓ Loaded tc-ca-new-case.js; TC_CA_NEW_CASE exists:', !!sandbox.TC_CA_NEW_CASE);

// 2. Setup SIM_STATES and SIM_DATA
sandbox.SIM_STATES = [
  { key: 'va', label: 'Virginia' },
  { key: 'tx', label: 'Texas' },
  { key: 'ca', label: 'California' },
  { key: 'ny', label: 'New York' }
];
sandbox.SIM_DATA = {
  ca: [ sandbox.TC_CA_NEW_CASE ]
};

// 3. Run workflow.js
vm.runInContext(workflowJs, sandbox);
console.log('✓ Loaded workflow.js');

// 4. Test selecting California: simGoToCity('ca')
sandbox.simGoToCity('ca');

const pickEl = sandbox.document.getElementById('sim-pick');
console.log('✓ #sim-pick display:', pickEl.style.display);
if (pickEl.style.display !== 'block') throw new Error('sim-pick should be visible');

const locChip = sandbox.document.getElementById('sim-location-chip-text');
console.log('✓ Location chip text:', locChip.textContent);
if (!locChip.textContent.includes('California')) throw new Error('Location chip should mention California');

const heroTitle = sandbox.document.getElementById('sim-hero-title');
console.log('✓ Hero title:', heroTitle.textContent);
if (!heroTitle.textContent.includes('California')) throw new Error('Hero title should mention California');

// 5. Verify rendered card
const cardsContainer = sandbox.document.getElementById('sim-cards');
if (!cardsContainer.children.length) throw new Error('sim-cards has no rendered children');

const caCard = cardsContainer.children[0];
console.log('✓ Rendered card class:', caCard.className);
if (!caCard.className.includes('lc-sc-card-wf') || !caCard.className.includes('st-ca')) {
  throw new Error('Card should have lc-sc-card-wf and st-ca classes');
}

const cardHtml = caCard.innerHTML;

// Check essential visual components
const checks = [
  { name: 'Topbar with California tag', pattern: /wf-card-topbar/ },
  { name: 'Tag with California', pattern: /🌴\s*California/ },
  { name: '10 Progressive Phases pill', pattern: /10 Progressive Phases/ },
  { name: 'Property header container', pattern: /wf-card-property-header/ },
  { name: 'Property title (4827 Rolando Blvd)', pattern: /4827 Rolando Blvd/ },
  { name: 'Property subtitle (San Diego, CA 92115)', pattern: /San Diego, CA 92115/ },
  { name: 'Specs grid container', pattern: /wf-card-specs-grid/ },
  { name: 'Spec: $889,000 List Price', pattern: /\$889,000/ },
  { name: 'Spec: Daniel & Carmen Herrera', pattern: /Daniel &amp; Carmen Herrera/ },
  { name: 'Spec: 10 End-to-End Steps', pattern: /10 End-to-End Steps/ },
  { name: 'Spec: Key TC Scope (NAR Split, Solar, Wire Defense)', pattern: /NAR Split, Solar, Wire Defense/ },
  { name: 'Card footer container', pattern: /wf-card-footer/ },
  { name: 'Start simulation button', pattern: /Start the simulation/ },
  { name: 'Guarantee / compliance badge', pattern: /Authentic client emails/ }
];

checks.forEach(c => {
  if (c.pattern.test(cardHtml)) {
    console.log('✓ ' + c.name);
  } else {
    throw new Error('Missing card component: ' + c.name);
  }
});

console.log('\n=== ALL CALIFORNIA CASE PICKER TESTS PASSED SUCCESSFULLY! ===');
