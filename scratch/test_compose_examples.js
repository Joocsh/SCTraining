const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('--- Testing Compose "See Example" Features in AppFolio ---');

// Mock DOM
global.window = global;
global.window.addEventListener = () => {};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const elements = {};
global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementsByTagName: () => [],
  getElementById: (id) => {
    if (!elements[id]) {
      elements[id] = {
        id,
        classList: {
          contains: () => false,
          add: () => {},
          remove: () => {},
          toggle: () => {}
        },
        value: '',
        style: { display: 'none' },
        innerHTML: '',
        textContent: '',
        scrollTop: 0,
        focus: () => { elements[id].focused = true; },
        appendChild: () => {},
        remove: () => {}
      };
    }
    return elements[id];
  },
  querySelector: (sel) => ({
    scrollTop: 0,
    focus: () => {},
    selectionStart: 0,
    setSelectionRange: () => {},
    classList: { contains: () => false, add: () => {}, remove: () => {} },
    scrollIntoView: () => {}
  }),
  querySelectorAll: (sel) => [],
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    className: '',
    innerHTML: '',
    style: {},
    remove: () => {}
  }),
  body: { appendChild: () => {}, innerHTML: '', classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false } },
  activeElement: null
};

global.location = { search: '', pathname: '/AppFolio/testdrive-appfolio.html' };
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};
global.simToast = (msg, opts) => console.log('  [Toast]:', msg);

// Load AppFolio scripts
const scripts = [
  '../assets/js/app-core.js',
  '../assets/js/sim-engine.js',
  '../AppFolio/appfolio-catalog-data.js',
  '../AppFolio/appfolio-data.js',
  '../AppFolio/appfolio-app.js',
  '../AppFolio/appfolio-shell.js',
  '../AppFolio/appfolio-tour.js'
];

scripts.forEach(s => {
  const p = path.join(__dirname, s);
  if (fs.existsSync(p)) {
    const code = fs.readFileSync(p, 'utf8');
    vm.runInThisContext(code, { filename: p });
  }
});

afInitEngine();

console.log('\n1. Verifying all 5 AF_COMPOSE_ITEMS have examples and pass rubrics:');
AF_COMPOSE_ITEMS.forEach(cmp => {
  assert(cmp.example, 'Example must exist for ' + cmp.id);
  assert(typeof cmp.example === 'string' && cmp.example.length > 50, 'Example must be substantial for ' + cmp.id);
  
  const results = cmp.rubric.map(c => {
    const fn = AF_RUBRIC_CHECKS[c.check];
    const pass = fn ? !!fn(cmp.example) : false;
    return { check: c.check, pass };
  });
  
  const allPass = results.every(r => r.pass);
  assert(allPass, cmp.id + ' example must pass all rubric checks! Failed: ' + JSON.stringify(results.filter(r => !r.pass)));
  console.log(' [PASS]', cmp.id + ' (' + cmp.label + ') passes 100% of rubrics');
});

console.log('\n2. Verifying AF_LESSONS compose steps have step.walk.example defined:');
const composeSteps = [];
AF_LESSONS.forEach(l => {
  l.steps.forEach((s, idx) => {
    if (s.type === 'compose') {
      composeSteps.push({ lesson: l.number, step: idx + 1, stepObj: s });
      assert(s.walk, 'Step must have walk object');
      assert(typeof s.walk.example === 'function', 'step.walk.example must be a function');
      const ex = s.walk.example();
      assert(typeof ex === 'string' && ex.length > 50, 'step.walk.example() must return model text');
      console.log(' [PASS] Lesson ' + l.number + ' Step ' + (idx + 1) + ' (' + s.composeId + ') has walk.example');
    }
  });
});
assert.strictEqual(composeSteps.length, 5, 'Must have exactly 5 compose steps across curriculum');

console.log('\n3. Verifying afComposeDetailHTML renders "See example" button and box:');
afState.composeId = 'af_cmp6_1';
const html = afComposeDetailHTML();
assert(html.includes('See example &rarr;'), 'HTML must include "See example →" button');
assert(html.includes('afComposeExampleBtn-af_cmp6_1'), 'HTML must include example button with ID');
assert(html.includes('afComposeExampleBox-af_cmp6_1'), 'HTML must include example box with ID');
assert(html.includes('Use this example'), 'HTML must include "Use this example" button');
console.log(' [PASS] afComposeDetailHTML includes See example button, box, and insert button');

console.log('\n4. Verifying toggle and insert functions:');
// Mock the box and button in elements
elements['afComposeExampleBox-af_cmp6_1'] = {
  style: { display: 'none' }
};
elements['afComposeExampleBtn-af_cmp6_1'] = {
  innerHTML: 'See example &rarr;'
};
elements['afComposeTextarea-af_cmp6_1'] = {
  value: '',
  focus: function() { this.focused = true; }
};

// Toggle open
afToggleComposeExample('af_cmp6_1');
assert.strictEqual(elements['afComposeExampleBox-af_cmp6_1'].style.display, 'block', 'Box must be shown after toggle');
assert(elements['afComposeExampleBtn-af_cmp6_1'].innerHTML.includes('Hide example'), 'Button must say Hide example');

// Toggle close
afToggleComposeExample('af_cmp6_1');
assert.strictEqual(elements['afComposeExampleBox-af_cmp6_1'].style.display, 'none', 'Box must be hidden after second toggle');
assert(elements['afComposeExampleBtn-af_cmp6_1'].innerHTML.includes('See example'), 'Button must say See example');

// Insert example into textarea
afInsertComposeExample('af_cmp6_1');
const inserted = elements['afComposeTextarea-af_cmp6_1'].value;
assert(inserted.includes('Dear Brenda'), 'Textarea must contain example after insert');
assert(elements['afComposeTextarea-af_cmp6_1'].focused, 'Textarea must be focused after insert');
console.log(' [PASS] Toggle and insert functions work properly');

console.log('\n5. Verifying floating tip renders See example toggle button:');
simWalkStart('l06-fair-housing-writing');
// Jump to step 2 (index 1 is compose step)
SimEngine.walkState().maxStepIndex = 1;
simWalkJumpTo(1);
const tipBody = document.getElementById('simWalkTipBody').innerHTML;
assert(tipBody.includes('sim-walk-example-toggle'), 'Tip body must include sim-walk-example-toggle button');
assert(tipBody.includes('See example'), 'Tip body must include "See example"');
console.log(' [PASS] Floating tip renders "See example" toggle button for Lesson 6 Step 2');

console.log('\n=== ALL COMPOSE "SEE EXAMPLE" TESTS PASSED SUCCESSFULLY! ===');
process.exit(0);
