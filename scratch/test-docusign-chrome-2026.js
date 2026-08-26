// Automated test for DocuSign 2026 Chrome changes (Prompt Maestro 7)
const fs = require('fs');
const path = require('path');

console.log('--- RUNNING DOCUSIGN 2026 CHROME VERIFICATION ---');

// 1. Check CSS for #285ed8
const cssContent = fs.readFileSync(path.join(__dirname, '../Docusign/docusign.css'), 'utf8');
const oldBlueCount = (cssContent.match(/285ed8/gi) || []).length;
console.log(`1. Matches for '285ed8' in docusign.css: ${oldBlueCount}`);
if (oldBlueCount !== 0) {
  console.error('FAIL: docusign.css still contains 285ed8');
  process.exit(1);
}

// 2. Check testdrive-docusign.html
const htmlContent = fs.readFileSync(path.join(__dirname, '../Docusign/testdrive-docusign.html'), 'utf8');

if (htmlContent.includes('ds-logo-grid')) {
  console.error('FAIL: testdrive-docusign.html still contains ds-logo-grid');
  process.exit(1);
} else {
  console.log('2. ds-logo-grid successfully removed from HTML.');
}

if (!htmlContent.includes('data-view="settings" onclick="dsGoto(\'settings\')">Admin</a>')) {
  console.error('FAIL: Settings topnav link not renamed to Admin or data-view broken');
  process.exit(1);
} else {
  console.log('3. Topnav item 5 correctly named Admin with data-view="settings".');
}

// 4. Check that .ds-new-btn exists and has class .ds-new-btn
if (!htmlContent.includes('class="ds-new-btn"')) {
  console.error('FAIL: .ds-new-btn missing');
  process.exit(1);
} else {
  console.log('4. .ds-new-btn intact in sidebar.');
}

// 5. Check 13 Walkthrough selectors in code
const selectors = [
  '#sb-sent',
  '.ds-new-btn',
  'tr[data-env-id="ENV-2026-9041"]',
  '#chkSeq',
  '#dsAttachPurchaseAgreement',
  '#dsBtnNextRecipients',
  '#dsBtnNextFields',
  '#dsBtnAddField',
  '#dsBtnAuditFields',
  '#dsBtnSendFinal',
  '#dsBtnSendReminder',
  '#dsBtnCorrectEnv',
  '#dsBtnVoidEnv'
];

const jsContent = fs.readFileSync(path.join(__dirname, '../Docusign/docusign-app.js'), 'utf8');
const combined = htmlContent + '\n' + jsContent;

selectors.forEach(sel => {
  const clean = sel.replace(/[#\.\^\[\]="]/g, '').replace('trdata-env-idENV-2026-9041', 'ENV-2026-9041');
  if (combined.includes(clean)) {
    console.log(`Selector target key verified: ${sel}`);
  } else {
    console.error(`FAIL: Missing walkthrough selector target: ${sel}`);
    process.exit(1);
  }
});

console.log('ALL SYNTACTIC VERIFICATIONS PASSED.');
