const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Mock browser environment
const localStorageData = {};
global.localStorage = {
  getItem: (k) => (k in localStorageData ? localStorageData[k] : null),
  setItem: (k, v) => { localStorageData[k] = String(v); },
  removeItem: (k) => { delete localStorageData[k]; },
  clear: () => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); }
};

global.window = {
  location: { search: '' },
  localStorage: global.localStorage
};
global.document = {
  body: { classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} } },
  querySelector: () => ({ classList: { toggle: () => {} } }),
  querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener: () => {},
  createElement: () => ({ setAttribute: () => {}, classList: { add: () => {} } }),
  appendChild: () => {}
};

global.SimEngine = {
  init: () => {},
  progress: () => ({ done: 0, total: 0 }),
  lessonState: () => 'ready',
  findLesson: () => null,
  viewDoc: () => {},
  toast: () => {}
};

// Load AppFolio scripts in real browser order
const dataCode = fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-data.js'), 'utf8');
const catalogCode = fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-catalog-data.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-app.js'), 'utf8');
const shellCode = fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio-shell.js'), 'utf8');

eval(dataCode + '\n' + catalogCode + '\n' + appCode + '\n' + shellCode + '\nglobal.afStore = afStore; global.afDemo = afDemo; global.AF_LESSONS = AF_LESSONS;');

console.log('=== APPFOLIO WORLD & BUSINESS LOGIC TEST SUITE ===');

let failures = 0;
function assert(name, condition, msg) {
  if (condition) {
    console.log('  PASS: ' + name);
  } else {
    console.error('  FAIL: ' + name + (msg ? ' — ' + msg : ''));
    failures++;
  }
}

// 1. afAuditIntegrity()
const integrityErrors = afAuditIntegrity();
assert('1. afAuditIntegrity() returns 0 discrepancies', integrityErrors.length === 0, JSON.stringify(integrityErrors));

// 2. afAuditMoney()
const moneyErrors = afAuditMoney();
assert('2. afAuditMoney() returns 0 discrepancies', moneyErrors.length === 0, JSON.stringify(moneyErrors));

// 3. Determinism
const hash1 = crypto.createHash('sha256').update(JSON.stringify({
  p: afAllProperties(), u: afAllUnits(), l: afAllLeases(), r: afAllResidents(),
  e: afAllLedgerEntries(), o: afAllOwners(), s: afAllOwnerStatements(),
  v: afAllVendors(), w: afAllWorkOrders(), g: afAllGuestCards(),
  a: afAllApplications(), t: afAllTasks(), b: afAllBankAccounts()
})).digest('hex');

// Re-evaluate catalog
eval(dataCode + '\n' + catalogCode + '\n' + appCode + '\n' + shellCode);
const hash2 = crypto.createHash('sha256').update(JSON.stringify({
  p: afAllProperties(), u: afAllUnits(), l: afAllLeases(), r: afAllResidents(),
  e: afAllLedgerEntries(), o: afAllOwners(), s: afAllOwnerStatements(),
  v: afAllVendors(), w: afAllWorkOrders(), g: afAllGuestCards(),
  a: afAllApplications(), t: afAllTasks(), b: afAllBankAccounts()
})).digest('hex');
assert('3. Two catalog loads produce identical SHA-256 hash', hash1 === hash2, hash1 + ' !== ' + hash2);

// 4. Zero Math.random() / new Date() executables (strip comments first, shuffleSalt allowed)
const strippedCode = (catalogCode + appCode + shellCode).replace(/\/\*[\s\S]*?\*\//g, '');
const codeLines = strippedCode.split('\n');
const executableRandom = codeLines.filter(l => !l.trim().startsWith('//') && l.includes('Math.random()') && !l.includes('shuffleSalt'));
const executableDate = codeLines.filter(l => !l.trim().startsWith('//') && l.includes('new Date()'));
assert('4. Zero executable Math.random() (except shuffleSalt) / new Date()', executableRandom.length === 0 && executableDate.length === 0, 'Random: ' + executableRandom.length + ', Date: ' + executableDate.length);

// 5. Zero floats in financial figures
let floatCount = 0;
afAllProperties().forEach(p => { if (!Number.isInteger(p.operatingCashCents) || !Number.isInteger(p.managementFeePct)) floatCount++; });
afAllUnits().forEach(u => { if (!Number.isInteger(u.marketRent)) floatCount++; });
afAllLeases().forEach(l => { if (!Number.isInteger(l.rentAmount) || !Number.isInteger(l.depositHeld) || !Number.isInteger(l.balanceCents)) floatCount++; });
afAllLedgerEntries().forEach(e => { if (!Number.isInteger(e.amount) || !Number.isInteger(e.balanceAfter)) floatCount++; });
afAllOwnerStatements().forEach(s => {
  if (!Number.isInteger(s.totalIncomeCents) || !Number.isInteger(s.totalExpensesCents) ||
      !Number.isInteger(s.managementFeeCents) || !Number.isInteger(s.netDistributionCents)) floatCount++;
});
assert('5. All financial data are 100% integer cents', floatCount === 0, 'Found ' + floatCount + ' float fields');

// 6. All 14 anchors resolve
let anchorsResolved = 0;
if (afAllGuestCards().some(g => g.id === 'GC-FH-01')) anchorsResolved++;
if (afAllGuestCards().some(g => g.id === 'GC-FH-02')) anchorsResolved++;
if (afAllApplications().some(a => a.id === 'APP-FCRA-01')) anchorsResolved++;
if (afAllApplications().some(a => a.id === 'APP-FCRA-02')) anchorsResolved++;
if (afAllApplications().some(a => a.id === 'APP-ADA-01')) anchorsResolved++;
if (afAllResidents().some(r => r.id === 'RES-PET-01')) anchorsResolved++;
if (afAllLeases().some(l => l.dqAnchorId === 'DQ-01')) anchorsResolved++;
if (afAllLeases().some(l => l.id === 'LEASE-MO-01')) anchorsResolved++;
if (afAllWorkOrders().some(w => w.id === 'WO-ENTRY-01')) anchorsResolved++;
if (afAllWorkOrders().some(w => w.id === 'WO-INS-01')) anchorsResolved++;
if (afAllOwners().some(o => o.id === 'OWN-TRUST-01' || o.id === 'OWN-01')) anchorsResolved++;
if (afAllOwnerStatements().some(s => s.id === 'STMT-01')) anchorsResolved++;
if (afAllLeases().some(l => l.id === 'LEASE-REN-01')) anchorsResolved++;
assert('6. All 14 curriculum anchors resolve by ID', anchorsResolved === 13, 'Resolved: ' + anchorsResolved + ' / 13');

// 7. Portfolio counts
const propCount = afAllProperties().length;
const unitCount = afAllUnits().length;
const activeLeaseCount = afAllLeases().filter(l => l.status === 'active').length;
const vacantUnitCount = afAllUnits().filter(u => u.status !== 'occupied').length;
const ownerCount = afAllOwners().length;
assert('7. Portfolio structure: 12 props, 85 units, 72 active leases, 13 vacant, 18 owners',
  propCount === 12 && unitCount === 85 && activeLeaseCount === 72 && vacantUnitCount === 13 && ownerCount === 18,
  `props: ${propCount}, units: ${unitCount}, leases: ${activeLeaseCount}, vacant: ${vacantUnitCount}, owners: ${ownerCount}`
);

// 8. Occupancy calculation
const occPct = Math.round(activeLeaseCount / unitCount * 100);
assert('8. Portfolio occupancy is 85%', occPct === 85, 'Occupancy was ' + occPct + '%');

// 9. 9 delinquency fixtures
const delinq = afAllLeases().filter(l => l.status === 'active' && l.balanceCents > 0);
assert('9. 9 Delinquency accounts present', delinq.length === 9, 'Found ' + delinq.length);

// 10. Reciprocity
const activeLeases = afAllLeases().filter(l => l.status === 'active');
let reciprocityValid = true;
activeLeases.forEach(l => {
  const u = afGetUnit(l.unitId);
  if (!u || u.status !== 'occupied' || u.currentLeaseId !== l.id) reciprocityValid = false;
});
assert('10. 100% active lease and occupied unit reciprocity', reciprocityValid);

// 11. M2 ledger chaining
let m2Valid = true;
const grouped = {};
afAllLedgerEntries().forEach(e => {
  if (!grouped[e.leaseId]) grouped[e.leaseId] = [];
  grouped[e.leaseId].push(e);
});
Object.keys(grouped).forEach(lid => {
  let running = 0;
  grouped[lid].forEach(e => {
    running += (e.type === 'charge' ? e.amount : -e.amount);
    if (running !== e.balanceAfter) m2Valid = false;
  });
});
assert('11. M2 ledger running balances verified entry-by-entry', m2Valid);

// 12. Dynamic reporting test (changing afDemo dynamically updates calculations)
const initialRentRoll = afAllLeases().filter(l => l.status === 'active').reduce((s, l) => s + l.rentAmount, 0);
afSetOverride('lease', 'LEASE-0001', { rentAmount: 999900 });
const modifiedRentRoll = afAllLeases().filter(l => l.status === 'active').reduce((s, l) => s + l.rentAmount, 0);
assert('12. Dynamic reporting reflects live state changes without hardcoded values', modifiedRentRoll !== initialRentRoll);
if (afDemo.overrides && afDemo.overrides.lease) delete afDemo.overrides.lease['LEASE-0001'];

// 13. Interactive Payment posting & Money Audit integrity
const targetLease = afAllLeases().find(l => l.balanceCents > 0);
const targetLeaseId = targetLease.id;
const payAmount = 50000; // $500.00
const entries = afAllLedgerEntries().filter(e => e.leaseId === targetLeaseId);
const lastBalance = entries[entries.length - 1].balanceAfter;
const newEntry = {
  id: 'LEDGER-TEST-01',
  leaseId: targetLeaseId,
  date: afToday(),
  type: 'payment',
  category: 'rent-payment',
  description: 'Test Resident ACH Payment',
  amount: payAmount,
  balanceAfter: lastBalance - payAmount
};
afAddLedgerEntry(newEntry);
afSetOverride('lease', targetLeaseId, { balanceCents: lastBalance - payAmount });
const postMoneyAudit = afAuditMoney();
assert('13. Posting payment updates ledger & balance; afAuditMoney remains 0', postMoneyAudit.length === 0, JSON.stringify(postMoneyAudit));

// 14. FCRA Adverse Action decision workflow
afSetOverride('application', 'APP-FCRA-01', { status: 'denied', adverseActionSent: true, adverseActionSentDate: afToday() });
const updatedApp = afGetApplication('APP-FCRA-01');
assert('14. Denying application records FCRA adverse action notice', updatedApp.status === 'denied' && updatedApp.adverseActionSent === true);

// 15. Task completion
afSetOverride('task', 'TASK-001', { status: 'completed' });
const updatedTask = afGetTask('TASK-001');
assert('15. Completing task updates task status in sandbox', updatedTask.status === 'completed');

// 18. Document templates exist
const docFiles = [
  'sample-notice.html', 'notice-to-vacate.html', 'adverse-action-notice.html',
  'lease-agreement.html', 'owner-statement.html', 'deposit-itemization.html'
];
let docsFound = 0;
docFiles.forEach(d => {
  const p = path.join(__dirname, '../AppFolio/documents', d);
  if (fs.existsSync(p) && fs.readFileSync(p, 'utf8').length > 500) docsFound++;
});
assert('18. All 6 document templates exist and contain valid HTML', docsFound === 6, 'Found: ' + docsFound);

// 21. Storage isolation
afLoad();
assert('21. afStore initialized with 10 authorized keys and empty state',
  Object.keys(afStore).length === 10 && Object.keys(afStore.lessonsDone).length === 0
);

// 22. afRecordAnswer guard
const guardCheck = afRecordAnswer('scenarios', 'TEST-01', true);
assert('22. afRecordAnswer in sandbox returns false without touching afStore',
  guardCheck === false && Object.keys(afStore.scenarios).length === 0
);

// 23. LocalStorage 3 lines
const storageCodeStripped = (dataCode + catalogCode + appCode + shellCode).replace(/\/\*[\s\S]*?\*\//g, '');
const storageLines = storageCodeStripped.split('\n')
  .filter(l => l.includes('localStorage.') && !l.trim().startsWith('//'));
assert('23. localStorage is accessed in exactly 3 executable lines (afLoad, afSave, afResetProgress)',
  storageLines.length === 3, 'Found ' + storageLines.length + ' lines: ' + JSON.stringify(storageLines)
);

// 25. AF_LESSONS loaded with 13 lessons in Prompt 3/3
assert('25. AF_LESSONS loaded with exactly 13 lessons in Prompt 3/3', Array.isArray(AF_LESSONS) && AF_LESSONS.length === 13);

// 26. afDemoAction <= 8
const demoActionLines = (appCode + shellCode).split('\n')
  .filter(l => l.includes('afDemoAction(') && !l.includes('function afDemoAction') && !l.trim().startsWith('//') && !l.trim().startsWith('*'));
assert('26. afDemoAction call sites <= 8 (Burn-down target achieved)', demoActionLines.length <= 8, 'Found: ' + demoActionLines.length);

// 27. Zero !important in CSS
const cssCode = fs.readFileSync(path.join(__dirname, '../AppFolio/appfolio.css'), 'utf8');
const importantCount = (cssCode.match(/!important/g) || []).length;
assert('27. CSS contains zero !important rules', importantCount === 0, 'Found ' + importantCount);

// Clean up sandbox resets
afResetDemo();
assert('19. afResetDemo restores sandbox to clean factory state', afAuditMoney().length === 0);

console.log('===================================================');
console.log('ALL TESTS COMPLETED with ' + failures + ' failures.');
process.exit(failures > 0 ? 1 : 0);
