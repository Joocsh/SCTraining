const fs = require('fs');
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

const l = afAllLeases().find(x => x.id === 'LEASE-REN-01');
console.log('LEASE-REN-01:', l);
if (l) {
  const r = afGetResident(l.residentIds[0]);
  console.log('Resident for LEASE-REN-01:', r);
  const u = afGetUnit(l.unitId);
  console.log('Unit for LEASE-REN-01:', u);
}

const u11 = afGetUnit('UNIT-11-102');
console.log('UNIT-11-102:', u11);
if (u11 && u11.currentLeaseId) {
  const l11 = afGetLease(u11.currentLeaseId);
  console.log('Lease for 11-102:', l11);
  const r11 = afGetResident(l11.residentIds[0]);
  console.log('Resident for 11-102:', r11);
}
