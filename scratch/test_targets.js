const fs = require('fs');
const js = fs.readFileSync('AppFolio/appfolio-app.js', 'utf8') + '\n' + fs.readFileSync('AppFolio/appfolio-shell.js', 'utf8');

const targets = [
  'a[data-section="properties"]',
  'button[data-prop="PROP-11"]',
  'button[data-unit="UNIT-11-102"]',
  '.af-pill-warn',
  'a[data-section="people"]',
  '.af-tbl-ledger',
  'button[data-subtab="delinquency"]',
  'button[data-post-pay="LEASE-0002"]',
  '#afBtnSubmitPayment',
  'button[data-report="delinquency"]',
  '.af-tbl-delinq tr[data-dq="DQ-04"]',
  'a[data-section="leasing"]',
  'button[data-gc-advance="GC-FH-01"]',
  'button[data-gc-showing="GC-FH-01"]',
  '.af-app-card',
  'button[data-action="generate-lease"]',
  'button[data-action="collect-deposit"]',
  'button[data-action="complete-inspection"]',
  'a[data-section="maintenance"]',
  '.af-wo-detail',
  '#afBtnDispatchWO',
  'button[data-action="generate-deposit-itemization"]'
];

let allPassed = true;
targets.forEach(t => {
  let found = false;
  if (t.includes('=')) {
    const raw = t.match(/([a-zA-Z0-9_-]+)="([^"]+)"/);
    if (raw) {
      found = js.includes(raw[1]) && js.includes(raw[2]);
    }
  } else if (t.startsWith('.')) {
    found = js.includes(t.slice(1));
  } else if (t.startsWith('#')) {
    found = js.includes(t.slice(1));
  }
  if (!found) allPassed = false;
  console.log(t.padEnd(50), found ? 'FOUND' : 'MISSING');
});

console.log('\nAll targets found in AppFolio runtime:', allPassed);
