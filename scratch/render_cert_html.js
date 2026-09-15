const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = global;
global.window.addEventListener = () => {};
global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementsByTagName: () => [],
  getElementById: (id) => null,
  body: { appendChild: (el) => { global.renderedModal = el.innerHTML; } },
  createElement: (tag) => ({ tagName: tag, innerHTML: '', style: {} })
};
global.location = { search: '', pathname: '/Docusign/testdrive-docusign.html' };
global.localStorage = { _store: {}, getItem(k) { return this._store[k] || null; }, setItem(k, v) { this._store[k] = String(v); } };
global.simToast = () => {};
global.dsIcon = (name) => `<svg class="ds-icon ds-icon-${name}"></svg>`;

// Load files
const codeCore = fs.readFileSync(path.join(__dirname, '../assets/js/app-core.js'), 'utf8');
const codeEngine = fs.readFileSync(path.join(__dirname, '../assets/js/sim-engine.js'), 'utf8');
const codeData = fs.readFileSync(path.join(__dirname, '../Docusign/docusign-data.js'), 'utf8');
const codeShell = fs.readFileSync(path.join(__dirname, '../Docusign/docusign-shell-data.js'), 'utf8');
const codeApp = fs.readFileSync(path.join(__dirname, '../Docusign/docusign-app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../Docusign/docusign.css'), 'utf8');

vm.runInThisContext(codeCore);
vm.runInThisContext(codeEngine);
vm.runInThisContext(codeData);
vm.runInThisContext(codeShell);
vm.runInThisContext(codeApp);

dsInitEngine();

// Render 7734 certificate
dsOpenCertificateModal('ENV-2026-7734');

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Certificate Preview</title>
  <style>
    body { background: #333; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    ${css}
    .ds-modal-backdrop { position: static; display: flex; justify-content: center; }
  </style>
</head>
<body>
  <div id="dsCertModalWrap" class="ds-modal-backdrop">
    ${global.renderedModal}
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'cert_preview.html'), html);
console.log('Saved cert_preview.html successfully!');
