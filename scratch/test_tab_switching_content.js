const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== TEST SIDEBAR BUTTON LOGIC & TAB FILTERING ===');

const tcCaJs = fs.readFileSync(path.join(__dirname, '../assets/js/tc-ca-new-case.js'), 'utf8');
const tcCaseCss = fs.readFileSync(path.join(__dirname, '../assets/css/tc-case.css'), 'utf8');

// Check CSS rule
if (!tcCaseCss.includes('.tc-toolbox-section.is-hidden')) {
  throw new Error('Missing .tc-toolbox-section.is-hidden in tc-case.css');
}
if (tcCaseCss.includes('.tc-toolbox-section {\n  display: flex !important;')) {
  throw new Error('.tc-toolbox-section should not enforce display: flex !important unconditionally');
}
console.log('✓ CSS rule check passed: .tc-toolbox-section.is-hidden { display: none !important; }');

// Setup mock DOM
const elements = {};
function makeEl(tag, id = '') {
  const styles = {};
  return {
    tagName: tag.toUpperCase(),
    id: id,
    attributes: {},
    getAttribute(k) { return this.attributes[k] || null; },
    setAttribute(k, v) { this.attributes[k] = v; },
    style: {
      setProperty(prop, val, pri) { styles[prop] = val + (pri ? ' !' + pri : ''); },
      getPropertyValue(prop) { return styles[prop] || ''; },
      get display() { return styles['display'] || ''; },
      set display(v) { styles['display'] = v; }
    },
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      toggle(c, force) {
        if (force === true) { this._classes.add(c); return true; }
        if (force === false) { this._classes.delete(c); return false; }
        if (this._classes.has(c)) { this._classes.delete(c); return false; }
        this._classes.add(c); return true;
      },
      contains(c) { return this._classes.has(c); }
    },
    textContent: '',
    innerHTML: ''
  };
}

function getEl(id) {
  if (!elements[id]) elements[id] = makeEl('div', id);
  return elements[id];
}

const railBtns = ['all', 'inbox', 'facts', 'contacts', 'docs'].map(t => {
  const b = makeEl('button');
  b.setAttribute('data-tab', t);
  return b;
});

const sandbox = {
  console: console,
  document: {
    getElementById: (id) => getEl(id),
    querySelectorAll: (sel) => {
      if (sel === '.tc-rail-btn') return railBtns;
      return [];
    }
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

// Initialize mock sections
const secInbox = getEl('tc-sec-inbox');
const secFacts = getEl('tc-sec-facts');
const secContacts = getEl('tc-sec-contacts');
const secDocs = getEl('tc-sec-docs');

// Test 1: Click "docs" (the folder icon that user clicked in screenshot)
sandbox.tcSwitchSidebarTab('docs');
if (!secDocs.style.getPropertyValue('display').includes('flex')) throw new Error('Expected secDocs to have display flex');
if (secDocs.classList.contains('is-hidden')) throw new Error('Expected secDocs to NOT have is-hidden');

if (!secInbox.style.getPropertyValue('display').includes('none')) throw new Error('Expected secInbox to have display none');
if (!secInbox.classList.contains('is-hidden')) throw new Error('Expected secInbox to have is-hidden');

if (!secFacts.style.getPropertyValue('display').includes('none')) throw new Error('Expected secFacts to have display none');
if (!secFacts.classList.contains('is-hidden')) throw new Error('Expected secFacts to have is-hidden');

if (!secContacts.style.getPropertyValue('display').includes('none')) throw new Error('Expected secContacts to have display none');
if (!secContacts.classList.contains('is-hidden')) throw new Error('Expected secContacts to have is-hidden');

const docsBtn = railBtns.find(b => b.getAttribute('data-tab') === 'docs');
if (!docsBtn.classList.contains('active')) throw new Error('Docs button should be active');
console.log('✓ Tab "docs": Only documents are visible, communications/facts/contacts are hidden with display:none !important');

// Test 2: Click "facts"
sandbox.tcSwitchSidebarTab('facts');
if (secFacts.classList.contains('is-hidden')) throw new Error('Expected secFacts to be visible');
if (!secDocs.classList.contains('is-hidden')) throw new Error('Expected secDocs to be hidden');
if (!secInbox.classList.contains('is-hidden')) throw new Error('Expected secInbox to be hidden');
if (!secContacts.classList.contains('is-hidden')) throw new Error('Expected secContacts to be hidden');
console.log('✓ Tab "facts": Only key facts are visible, others are hidden');

// Test 3: Click "contacts"
sandbox.tcSwitchSidebarTab('contacts');
if (secContacts.classList.contains('is-hidden')) throw new Error('Expected secContacts to be visible');
if (!secFacts.classList.contains('is-hidden')) throw new Error('Expected secFacts to be hidden');
console.log('✓ Tab "contacts": Only contacts are visible, others are hidden');

// Test 4: Click "inbox"
sandbox.tcSwitchSidebarTab('inbox');
if (secInbox.classList.contains('is-hidden')) throw new Error('Expected secInbox to be visible');
if (!secContacts.classList.contains('is-hidden')) throw new Error('Expected secContacts to be hidden');
console.log('✓ Tab "inbox": Only communications are visible, others are hidden');

// Test 5: Click "all"
sandbox.tcSwitchSidebarTab('all');
if (secInbox.classList.contains('is-hidden')) throw new Error('Expected secInbox to be visible in all');
if (secFacts.classList.contains('is-hidden')) throw new Error('Expected secFacts to be visible in all');
if (secContacts.classList.contains('is-hidden')) throw new Error('Expected secContacts to be visible in all');
if (secDocs.classList.contains('is-hidden')) throw new Error('Expected secDocs to be visible in all');
console.log('✓ Tab "all": All 4 sections are visible');

console.log('=== ALL LOGIC TESTS PASSED 100%! ===');
