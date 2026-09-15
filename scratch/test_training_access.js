const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- Verifying AppFolio Training Access & UI Routes ---');

// Mock browser globals
let rootContent = '';
const mockElem = () => ({
  appendChild: () => {},
  addEventListener: () => {},
  style: {},
  classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
  setAttribute: () => {},
  getAttribute: () => null,
  get innerHTML() { return rootContent; },
  set innerHTML(val) { rootContent = val; },
  value: ''
});
const rootEl = mockElem();
const window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  innerWidth: 1024,
  location: { search: '' },
  localStorage: {
    data: {},
    getItem: function(k) { return this.data[k] || null; },
    setItem: function(k, v) { this.data[k] = v; },
    removeItem: function(k) { delete this.data[k]; }
  }
};
const document = {
  getElementById: (id) => rootEl,
  querySelector: () => rootEl,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => mockElem(),
  body: mockElem()
};
global.window = window;
global.document = document;
global.localStorage = window.localStorage;
global.navigator = { userAgent: 'node' };

// Load files
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../assets/js/sim-engine.js'), 'utf8'));
Object.assign(global, window);
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-catalog-data.js'), 'utf8'));
Object.assign(global, window);
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-data.js'), 'utf8'));
Object.assign(global, window);
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-app.js'), 'utf8'));
Object.assign(global, window);

// Initialize engine
afLoad();
afInitEngine();

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(' [PASS]', msg);
    passed++;
  } else {
    console.error(' [FAIL]', msg);
    failed++;
  }
}

// 1. Verify afModeSwitchHTML
const modeHTML = afModeSwitchHTML();
assert(modeHTML.includes('af-mode') && modeHTML.includes('Training') && modeHTML.includes('Sandbox'),
  'afModeSwitchHTML renders Sandbox and Training mode buttons');

// 2. Verify afDemoAction for Help / Training
afState.view = 'dashboard';
afDemoAction('Help & Training');
assert(afState.view === 'lessons', 'afDemoAction("Help & Training") redirects to lessons view');

// 3. Verify afLessonsHTML renders all 13 lessons
afGoto('lessons');
const lessonsHTML = afLessonsHTML();
assert(lessonsHTML.includes('Training Curriculum'), 'afLessonsHTML renders Training Curriculum header');
assert(lessonsHTML.includes('Lesson 1') && lessonsHTML.includes('Lesson 13'), 'afLessonsHTML renders Lesson 1 through Lesson 13');
assert(lessonsHTML.includes('Available'), 'afLessonsHTML shows Available badges for unlocked lessons');

// 4. Verify afLessonDetailHTML renders lesson details
afGoto('lesson', 'l01-orientation');
const detailHTML = afLessonDetailHTML();
assert(!detailHTML.includes('Lesson not found'), 'afLessonDetailHTML finds l01-orientation');
assert(detailHTML.includes('Orientation: Properties, Units and Reading Occupancy'), 'afLessonDetailHTML includes lesson title');
assert(detailHTML.includes('Back to all lessons'), 'afLessonDetailHTML includes Back to all lessons button');
assert(detailHTML.includes('Start Lesson &rarr;'), 'afLessonDetailHTML includes Start Lesson button');
assert(!detailHTML.includes('UNDEFINED'), 'detailHTML contains NO UNDEFINED chips');
assert(!detailHTML.includes('Do it'), 'detailHTML contains NO generic "Do it" step labels');
assert(detailHTML.includes('Open Properties View'), 'detailHTML includes real step label: Open Properties View');
assert(detailHTML.includes('Select Legacy Park Apartments'), 'detailHTML includes real step label: Select Legacy Park Apartments');
assert(detailHTML.includes('Inspect Unit 11-102'), 'detailHTML includes real step label: Inspect Unit 11-102');
assert(detailHTML.includes('Locate 47-Day Renewal Milestone'), 'detailHTML includes real step label: Locate 47-Day Renewal Milestone');
assert(detailHTML.includes('Assess Renewal Action for Expiring Lease'), 'detailHTML includes real step label: Assess Renewal Action');

// 5. Verify banner is hidden when on lesson detail view
afRenderLessonBanner();
assert(rootEl.hidden === true, 'afRenderLessonBanner hides in-product banner on lesson overview screen');

// 5. Verify testdrive-appfolio.html markup
const htmlContent = fs.readFileSync(path.join(__dirname, '../AppFolio/testdrive-appfolio.html'), 'utf8');
assert(!htmlContent.includes("afDemoAction('Help &amp; Training')"),
  'testdrive-appfolio.html no longer contains afDemoAction for Help & Training');
assert(htmlContent.includes("onclick=\"afGoto('lessons')\""),
  'testdrive-appfolio.html connects topbar and footer Help & Training directly to afGoto("lessons")');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
