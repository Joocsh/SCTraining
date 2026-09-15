const fs = require('fs');
const path = require('path');
const vm = require('vm');

const win = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  },
  location: { search: '', pathname: '/AppFolio/testdrive-appfolio.html' },
  innerWidth: 1024
};
global.window = win;
global.localStorage = win.localStorage;
global.location = win.location;
const mockElem = () => ({
  appendChild: () => {},
  addEventListener: () => {},
  style: {},
  classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
  setAttribute: () => {},
  getAttribute: () => null,
  innerHTML: '',
  value: ''
});
global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: () => mockElem(),
  querySelector: () => mockElem(),
  querySelectorAll: () => [],
  createElement: () => mockElem(),
  body: mockElem()
};

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../assets/js/sim-engine.js'), 'utf8'));
Object.assign(global, global.window);
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-catalog-data.js'), 'utf8'));
Object.assign(global, global.window);
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-data.js'), 'utf8'));
Object.assign(global, global.window);
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-app.js'), 'utf8'));
Object.assign(global, global.window);

afInitEngine();
const w101 = afGetWorkOrder('WO-2026-0101');
console.log('w101 exists:', !!w101);
if (w101) {
  console.log('w101 status:', w101.status, 'createdDate:', w101.createdDate, 'vendorId:', w101.vendorId);
}
afGoto('maintenance');
const key = 'work-orders';
const fields = afSfWorkOrders();
const all = afAllWorkOrders();
const found = afSearchFilter(key, all.slice(), fields);
console.log('Total work orders:', all.length);
console.log('Found open work orders:', found.length);
console.log('Is w101 in found:', found.some(w => w.id === 'WO-2026-0101'));
const idx = found.findIndex(w => w.id === 'WO-2026-0101');
console.log('Index of w101 in found list:', idx);


const l10 = AF_LESSONS.find(l => l.id === 'l10-maintenance-dispatch-compliance');
console.log('L10 steps:');
l10.steps.forEach((s, idx) => {
  console.log(`Step ${idx+1}: type=${s.type}, id=${s.checklistId || s.scenarioId}, target=${s.walk ? s.walk.target : 'none'}, text=${s.walk ? s.walk.text : ''}`);
});
