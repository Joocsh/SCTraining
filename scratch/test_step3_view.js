const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = global;
global.window.addEventListener = () => {};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const createMockEl = () => ({
  style: {},
  classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
  appendChild: () => {}, remove: () => {}, innerHTML: '', textContent: '',
  getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 50, bottom: 150, right: 300 })
});
const elements = {};
global.localStorage = { _s: {}, getItem(k){return this._s[k]||null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} };
global.location = { search: '', pathname: '/AppFolio/testdrive-appfolio.html' };
global.document = {
  addEventListener: () => {}, removeEventListener: () => {}, getElementsByTagName: () => [],
  documentElement: { clientHeight: 800, clientWidth: 1280 },
  getElementById: (id) => elements[id] || (elements[id] = createMockEl()),
  querySelector: (sel) => createMockEl(), querySelectorAll: () => [],
  createElement: () => createMockEl(), body: createMockEl()
};
global.simToast = () => {};

vm.runInThisContext(fs.readFileSync('assets/js/app-core.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('assets/js/sim-engine.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('AppFolio/appfolio-catalog-data.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('AppFolio/appfolio-data.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('AppFolio/appfolio-app.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('AppFolio/appfolio-shell.js', 'utf8'));

afInitEngine();
simWalkStart('l01-orientation');

console.log('--- STEP 1 ---');
console.log('view:', afState.view, 'step:', SimEngine.walkState().stepIndex);
afNavGo('properties');
console.log('After clicking Properties -> view:', afState.view);

console.log('\n--- ADVANCING TO STEP 2 ---');
simWalkAdvance();
console.log('view:', afState.view, 'step:', SimEngine.walkState().stepIndex);
console.log('User clicks Legacy Park -> afGoto("property-detail", "PROP-11")');
afGoto('property-detail', 'PROP-11');
console.log('view:', afState.view, 'activePropertyId:', afState.activePropertyId);

console.log('\n--- ADVANCING TO STEP 3 ---');
simWalkAdvance();
console.log('view after Step 3 setup runs:', afState.view, 'activePropertyId:', afState.activePropertyId);
console.log('Target for step 3:', SimEngine.currentStep().walk.target);
