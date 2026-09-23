const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== TEST RESTORE SESSION ONLY ON RELOAD ===');

const wfJs = fs.readFileSync(path.join(__dirname, '../assets/js/workflow.js'), 'utf8');

function setupTest(navType, initialStorage = {}) {
  const store = Object.assign({}, initialStorage);
  const elements = {};
  function makeEl(id) {
    return {
      id: id,
      classList: {
        _c: new Set(),
        add(c) { this._c.add(c); },
        remove(c) { this._c.delete(c); },
        contains(c) { return this._c.has(c); }
      },
      style: { display: '' }
    };
  }

  const sandbox = {
    console: console,
    document: {
      getElementById(id) {
        if (!elements[id]) elements[id] = makeEl(id);
        return elements[id];
      },
      querySelectorAll() { return []; },
      body: { style: { overflow: '' } }
    },
    performance: {
      getEntriesByType(type) {
        if (type === 'navigation') return [{ type: navType }];
        return [];
      }
    },
    localStorage: {
      getItem(k) { return store[k] || null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; }
    },
    window: {},
    SIM_STATES: [{ key: 'ca', label: 'California' }],
    SIM_DATA: {
      ca: [{ type: 'workflow', title: 'Rolando', wfSteps: [() => 'Step0', () => 'Step1'], wfLabels: ['L0', 'L1'] }]
    }
  };
  sandbox.window = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(wfJs, sandbox);
  return { sandbox, store, elements };
}

// Scenario 1: User navigates via menu/link (navType: 'navigate')
const test1 = setupTest('navigate', {
  sc_active_panel: 'sim',
  sc_wf_state: JSON.stringify({ city: 'ca', caseIdx: 0, step: 1 })
});
const res1 = test1.sandbox.wfRestoreSession();
if (res1 !== false) throw new Error('Expected wfRestoreSession to return false on navigate');
if (test1.store.sc_active_panel) throw new Error('Expected sc_active_panel to be cleared on navigate');
if (test1.store.sc_wf_state) throw new Error('Expected sc_wf_state to be cleared on navigate');
console.log('✓ Normal navigation from menu/link does NOT restore simulation and clears active panel');

// Scenario 2: User reloads page (navType: 'reload')
const test2 = setupTest('reload', {
  sc_active_panel: 'sim',
  sc_wf_state: JSON.stringify({ city: 'ca', caseIdx: 0, step: 1 })
});
const res2 = test2.sandbox.wfRestoreSession();
if (res2 !== true) throw new Error('Expected wfRestoreSession to return true on reload');
const simPanel = test2.elements['panel-sim'];
if (!simPanel || !simPanel.classList.contains('open')) throw new Error('Expected panel-sim to be opened on reload');
console.log('✓ Page reload (F5 / Refresh) DOES restore the simulation seamlessly');

console.log('=== ALL TESTS PASSED! ===');
