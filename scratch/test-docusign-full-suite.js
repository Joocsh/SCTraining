// Full runtime simulation test for DocuSign Simulator
const fs = require('fs');
const path = require('path');

// Setup minimal browser DOM environment
global.window = global;
global.window.addEventListener = () => {};

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementsByTagName: () => [],
  getElementById: (id) => {
    if (!global._elements) global._elements = {};
    if (!global._elements[id]) {
      global._elements[id] = {
        id,
        classList: {
          contains: () => false,
          add: () => {},
          remove: () => {},
          toggle: () => {}
        },
        value: '',
        style: {},
        innerHTML: '',
        textContent: '',
        scrollTop: 0,
        appendChild: () => {},
        remove: () => {}
      };
    }
    return global._elements[id];
  },
  querySelector: (sel) => {
    return {
      scrollTop: 0,
      focus: () => {},
      selectionStart: 0,
      setSelectionRange: () => {}
    };
  },
  querySelectorAll: (sel) => [],
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    className: '',
    innerHTML: '',
    style: {},
    remove: () => {}
  }),
  body: {
    appendChild: () => {},
    innerHTML: ''
  },
  activeElement: null
};

global.location = {
  search: '',
  pathname: '/Docusign/testdrive-docusign.html'
};

global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};

global.simToast = (msg, opts) => {
  // console.log(`[Toast]: ${msg}`);
};

global.dsConfirm = (opts) => {
  if (opts.onConfirm) opts.onConfirm();
};

const vm = require('vm');

const scripts = [
  '../assets/js/app-core.js',
  '../assets/js/sim-engine.js',
  '../Docusign/docusign-data.js',
  '../Docusign/docusign-data-ext.js',
  '../Docusign/docusign-shell-data.js',
  '../Docusign/docusign-app.js',
  '../Docusign/docusign-tour.js'
];

scripts.forEach(s => {
  const code = fs.readFileSync(path.join(__dirname, s), 'utf8');
  vm.runInThisContext(code);
});

dsInitEngine();
dsResetWizard();

console.log('--- TEST 1: Checking App State and Rendering Root ---');
console.log('dsState initialized. Current view:', dsState.view);

console.log('--- TEST 2: Testing All 13 Views Rendering ---');
const views = [
  'dashboard',
  'envelopes',
  'templates',
  'reports',
  'settings',
  'lessons',
  'new-envelope',
  'envelope-detail',
  'template-detail',
  'mailbox',
  'powerforms',
  'shared-access',
  'complete-transaction'
];

views.forEach(v => {
  dsState.view = v;
  if (v === 'envelope-detail') dsState.activeEnvId = 'ENV-2026-9041';
  if (v === 'template-detail') dsState.activeTemplateId = 'TMPL-01';
  dsRenderRoot();
  const html = document.getElementById('dsRoot').innerHTML;
  if (typeof html !== 'string' || html.length < 50) {
    console.error(`FAIL: View ${v} returned invalid html: ${html}`);
    process.exit(1);
  }
  console.log(`✓ View ${v} rendered successfully (${html.length} chars)`);
});

console.log('--- TEST 3: Testing Status Popover and Filtering ---');
dsState.view = 'envelopes';
dsRenderRoot();

// Select temp status and apply
dsSelectTempStatus('completed');
dsApplyStatusFilter();
console.log('Applied status filter:', dsState.statusFilter);
const filteredCompleted = dsFilteredEnvelopes();
const allCompleted = filteredCompleted.every(e => e.status === 'completed');
console.log(`Filtered completed count: ${filteredCompleted.length}, all are completed: ${allCompleted}`);
if (!allCompleted || filteredCompleted.length === 0) {
  console.error('FAIL: Status filter "completed" did not work as expected');
  process.exit(1);
}

// Clear filters
dsClearFilters();
console.log('Cleared status filter:', dsState.statusFilter || '(empty)');
if (dsState.statusFilter !== '') {
  console.error('FAIL: dsClearFilters did not clear statusFilter');
  process.exit(1);
}

console.log('--- TEST 4: Verifying Lesson Step Labeling ---');
const step1 = DS_LESSONS[0].steps[0];
const label1 = dsLessonStepLabel(step1);
console.log('Lesson 1 step 1 label:', label1);
if (!label1 || label1.length < 3) {
  console.error('FAIL: dsLessonStepLabel failed to return human-readable label');
  process.exit(1);
}

console.log('--- TEST 5: Verifying Dynamic Sidebar and Templates Layout ---');
dsState.view = 'templates';
dsSyncNav();
const tmplHtml = dsTemplatesHTML();
const sbHtml = document.getElementById('dsSidebar').innerHTML;
if (!sbHtml.includes('Create Template') || !sbHtml.includes('Workflow Templates') || !sbHtml.includes('Template Gallery')) {
  console.error('FAIL: Dynamic Sidebar missing Templates sections');
  process.exit(1);
}
if (!tmplHtml.includes('Search My Templates') && !tmplHtml.includes('Resending the same envelopes?')) {
  console.error('FAIL: Templates main HTML missing expected content');
  process.exit(1);
}
console.log('✓ Dynamic Sidebar correctly rendered Templates navigation and main templates area');

// Test dynamic sidebar on Home (Dashboard)
dsState.view = 'dashboard';
dsSyncNav();
if (document.getElementById('dsSidebar').style.display !== 'none') {
  console.error('FAIL: Sidebar should be hidden on Home (Dashboard)');
  process.exit(1);
}
console.log('✓ Sidebar is properly hidden on Home');

// Test dynamic sidebar on Reports
dsState.view = 'reports';
dsSyncNav();
const repSbHtml = document.getElementById('dsSidebar').innerHTML;
if (!repSbHtml.includes('Administrator dashboard') || !repSbHtml.includes('REPORT TYPE') || !repSbHtml.includes('Downloads')) {
  console.error('FAIL: Reports dynamic sidebar missing expected sections');
  process.exit(1);
}
console.log('✓ Dynamic Sidebar correctly rendered Reports navigation');

console.log('--- ALL FULL SUITE TESTS PASSED SUCCESSFULLY ---');
