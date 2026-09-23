const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== TEST DUAL-PANE VERTICAL RAIL SIDEBAR ===');

const tcCaseCss = fs.readFileSync(path.join(__dirname, '../assets/css/tc-case.css'), 'utf8');
const tcCaJs = fs.readFileSync(path.join(__dirname, '../assets/js/tc-ca-new-case.js'), 'utf8');

// 1. Verify CSS rules
if (!tcCaseCss.includes('.tc-sidebar-rail')) {
  throw new Error('Missing .tc-sidebar-rail in tc-case.css');
}
if (!tcCaseCss.includes('.tc-sidebar-content')) {
  throw new Error('Missing .tc-sidebar-content in tc-case.css');
}
if (!tcCaseCss.includes('flex-direction: row !important')) {
  throw new Error('.tc-sidebar-left missing flex-direction: row !important');
}
if (!tcCaseCss.includes('.tc-sidebar-left.collapsed .tc-sidebar-content')) {
  throw new Error('Missing collapsed rule for content panel in tc-case.css');
}
console.log('✓ CSS checks passed: Dual pane, vertical rail, flex-row, collapsed hiding content panel');

// 2. Setup mock environment
const domElements = {};
function makeElement(tag, id = '') {
  return {
    tagName: tag.toUpperCase(),
    id: id,
    attributes: {},
    getAttribute(name) { return this.attributes[name] || null; },
    setAttribute(name, val) { this.attributes[name] = val; },
    style: { display: '' },
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      toggle(c, force) {
        if (force === true) { this._classes.add(c); return true; }
        if (force === false) { this._classes.delete(c); return false; }
        if (this._classes.has(c)) { this._classes.delete(c); return false; }
        this._classes.add(c);
        return true;
      },
      contains(c) { return this._classes.has(c); }
    },
    value: '',
    children: [],
    innerHTML: '',
    textContent: ''
  };
}

function getEl(id) {
  if (!domElements[id]) domElements[id] = makeElement('div', id);
  return domElements[id];
}

const railBtns = [
  makeElement('button'),
  makeElement('button'),
  makeElement('button'),
  makeElement('button'),
  makeElement('button')
];
['all', 'inbox', 'facts', 'contacts', 'docs'].forEach((t, i) => {
  railBtns[i].setAttribute('data-tab', t);
});

const sandbox = {
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  console: console,
  document: {
    getElementById: (id) => getEl(id),
    querySelectorAll: (sel) => {
      if (sel === '.tc-rail-btn') return railBtns;
      return [];
    },
    querySelector: () => null
  },
  window: {},
  localStorage: {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); }
  }
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(tcCaJs, sandbox);

console.log('✓ tc-ca-new-case.js loaded in VM');
if (typeof sandbox.tcToggleSidebar !== 'function') throw new Error('tcToggleSidebar not defined');
if (typeof sandbox.tcSwitchSidebarTab !== 'function') throw new Error('tcSwitchSidebarTab not defined');
if (!sandbox.TC_CA_NEW_CASE) throw new Error('TC_CA_NEW_CASE not found');

// 3. Test step rendering
sandbox.wfNav = () => '';
sandbox.wfGetRole = () => 'tc';
const rendered = sandbox.TC_CA_NEW_CASE.wfSteps[1]();
if (!rendered.includes('class="tc-sidebar-rail"')) throw new Error('Missing tc-sidebar-rail in rendered HTML');
if (!rendered.includes('class="tc-sidebar-content"')) throw new Error('Missing tc-sidebar-content in rendered HTML');
if (!rendered.includes('class="tc-rail-toggle-btn"')) throw new Error('Missing tc-rail-toggle-btn in rendered HTML');
if (!rendered.includes('data-tab="all"')) throw new Error('Missing data-tab="all" in rendered HTML');
if (!rendered.includes('data-tab="inbox"')) throw new Error('Missing data-tab="inbox" in rendered HTML');
if (!rendered.includes('data-tab="facts"')) throw new Error('Missing data-tab="facts" in rendered HTML');
if (!rendered.includes('data-tab="contacts"')) throw new Error('Missing data-tab="contacts" in rendered HTML');
if (!rendered.includes('data-tab="docs"')) throw new Error('Missing data-tab="docs" in rendered HTML');
console.log('✓ Step rendered with vertical rail and content panel with all 5 tool buttons');

// 4. Test tab switching
sandbox.tcSwitchSidebarTab('inbox');
if (!railBtns[1].classList.contains('active')) throw new Error('Inbox button was not marked active');
if (railBtns[0].classList.contains('active')) throw new Error('All button should not be active');
const titleEl = getEl('tc-pane-title');
if (titleEl.innerHTML !== 'Communications') throw new Error('Title was not updated to Communications: ' + titleEl.innerHTML);
console.log('✓ tcSwitchSidebarTab updated active tab and title to:', titleEl.innerHTML);

// 5. Test sidebar collapse toggle
const sidebarEl = getEl('tc-sidebar-left');
const gridEl = getEl('tc-workspace-grid');
sandbox.tcToggleSidebar();
if (!sidebarEl.classList.contains('collapsed')) throw new Error('Sidebar was not collapsed');
if (!gridEl.classList.contains('left-collapsed')) throw new Error('Grid was not left-collapsed');
console.log('✓ tcToggleSidebar collapsed the sidebar');

sandbox.tcToggleSidebar();
if (sidebarEl.classList.contains('collapsed')) throw new Error('Sidebar should be expanded');
if (gridEl.classList.contains('left-collapsed')) throw new Error('Grid should be expanded');
console.log('✓ tcToggleSidebar expanded the sidebar back');

console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
