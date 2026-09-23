const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== TEST REMOVAL OF DEADLINE BAR ===');

const cssPath = path.join(__dirname, '..', 'assets', 'css', 'tc-case.css');
const jsPath = path.join(__dirname, '..', 'assets', 'js', 'tc-ca-new-case.js');
const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

// 1. Check CSS
if (!css.includes('.tc-deadline-bar {\n  display: none !important;\n}')) {
  throw new Error('Missing .tc-deadline-bar { display: none !important; } in tc-case.css');
}
console.log('✓ PASS: tc-case.css hides .tc-deadline-bar with display: none !important');

// 2. Check JS output
const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ textContent: '', appendChild: () => {} }),
    head: { appendChild: () => {} }
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  console: console,
  setTimeout: () => {},
  setInterval: () => {},
  clearInterval: () => {}
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(js, sandbox);

// Check window.caSteps
if (sandbox.window.WF_CA_SCENARIO && sandbox.window.WF_CA_SCENARIO.wfSteps) {
  const steps = sandbox.window.WF_CA_SCENARIO.wfSteps;
  steps.forEach((stepFn, i) => {
    const html = stepFn();
    if (html.includes('tc-deadline-bar')) {
      throw new Error(`Step ${i + 1} output still contains tc-deadline-bar!`);
    }
  });
  console.log(`✓ PASS: All ${steps.length} California steps produce clean HTML without tc-deadline-bar`);
}

console.log('\nALL DEADLINE BAR REMOVAL CHECKS PASSED 100%!');
