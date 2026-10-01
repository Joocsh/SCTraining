// Requires jsdom (install outside the repo and expose it through NODE_PATH).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'roles/transaction-coordinator.html'), 'utf8')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const scripts = ['workflow.js', 'tc-ca-new-case.js', 'tc-ca-seller-case.js']
  .map(name => fs.readFileSync(path.join(root, 'assets/js', name), 'utf8'));

function boot(saved, navigation = 'reload') {
  const dom = new JSDOM(html, { url: 'https://training.test/roles/transaction-coordinator.html', runScripts: 'dangerously' });
  const w = dom.window;
  w.setTimeout = () => 0;
  w.setInterval = () => 0;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.confirm = () => true;
  w.performance.getEntriesByType = () => [{ type: navigation }];
  for (const [key, value] of Object.entries(saved || {})) w.localStorage.setItem(key, value);
  for (const script of scripts) vm.runInContext(script, dom.getInternalVMContext());
  w.SIM_STATES = [{ key: 'ca', label: 'California' }];
  w.SIM_DATA = { ca: [w.TC_CA_NEW_CASE, w.TC_CA_SELLER_CASE] };
  w.PANEL_ON_OPEN.sim = w.simInit;
  return {
    dom, w,
    run: code => vm.runInContext(code, dom.getInternalVMContext()),
    snapshot: () => Object.fromEntries(Object.keys(w.localStorage).map(k => [k, w.localStorage.getItem(k)])),
    state: () => JSON.parse(w.localStorage.getItem('sc_wf_state'))
  };
}

module.exports = { boot };

if (require.main === module) {
for (const [caseIdx, prefix] of [[0, 'bc'], [1, 'hs']]) {
  let app = boot();
  app.w.openPanel('sim');
  app.w.simGoToCity('ca');
  app.w.simStart(app.w.SIM_DATA.ca[caseIdx]);

  // Input saves before the user leaves the first phase or blurs the field.
  const input = app.w.document.querySelector('#wf-body input[oninput]');
  assert(input, 'Real case has an editable form');
  input.value = 'Draft answer before refresh';
  input.dispatchEvent(new app.w.Event('input', { bubbles: true }));
  const fieldId = input.id;
  assert(JSON.stringify(app.state().mh).includes(input.value));

  // Picker handlers replace their buttons: save even when the target detaches.
  const choice = app.w.document.querySelector('#wf-body .mh-chip');
  assert(choice);
  choice.click();
  assert(Object.keys(app.state().mh).some(key => key.startsWith('p_') && app.state().mh[key].length));

  // Include graded answers and a sent/read email to check restoration before render.
  app.run(`wfActiveScenario._decisions.push({correct: true});
    wfActiveScenario._mh.mail.read['intake'] = true;
    wfActiveScenario._mh.mail.sent['intake'] = {body: 'Sent email text'};
    window._caNewSlide1 = 1;
    window.caNewSsState['${prefix}-ss_created'] = true;
    window.caNewSsState['${prefix}-ss_rpa'] = true;
    window.caNewSsState['${prefix}-ss_doc_rpa'] = 'rpa';
    window._caNewSsStage = 2;
    _wfSaveState();`);
  for (let reload = 0; reload < 2; reload++) {
    const saved = app.snapshot();
    app.dom.window.close();
    app = boot(saved);
    assert.equal(app.w.wfRestoreSession(), true);
    assert.equal(app.w.document.getElementById(fieldId).value, 'Draft answer before refresh');
    assert.equal(app.state().step, 0, 'First step also restores without resetting');
    assert.equal(app.state().caseIdx, caseIdx);
    assert.equal(app.state().decisions.length, 1);
    assert.equal(app.state().mh.mail.sent.intake.body, 'Sent email text');
    assert.equal(app.w._caNewSlide1, 1);
    assert.equal(app.w.document.getElementById('bc-s1-p1').style.display, 'block');
    assert.equal(app.w.caNewSsState[`${prefix}-ss_doc_rpa`], 'rpa');
    assert.equal(app.w._caNewSsStage, 2);
  }

  // Later step, an unblurred zipForm field, and the furthest unlocked step survive.
  app.w.wfNext();
  const zf = app.w.document.querySelector('.zf-inline-input');
  assert(zf);
  zf.value = 'Unblurred zipForm draft';
  zf.dispatchEvent(new app.w.Event('input', { bubbles: true }));
  app.run('_wfMaxStep = 4');
  app.w.dispatchEvent(new app.w.Event('pagehide'));
  const later = app.snapshot();
  app.dom.window.close();
  app = boot(later);
  assert.equal(app.w.wfRestoreSession(), true);
  assert.equal(app.state().step, 1);
  assert.equal(app.state().maxStep, 4);
  assert.equal(app.w.document.getElementById(zf.id).value, 'Unblurred zipForm draft');

  // Mail drafts typed in the separate mail app are saved on input.
  const composeKey = caseIdx === 0 ? 'bc-intake-info' : 'hs-intake-info';
  app.w.tcMailCompose(composeKey);
  const body = app.w.document.getElementById('wf-' + composeKey + '-body');
  assert(body, 'Mail composer opens');
  body.value = 'Unsent email draft';
  body.dispatchEvent(new app.w.Event('input', { bubbles: true }));
  assert.equal(app.state().mh.mail.drafts[composeKey].body, body.value);
  const mailSaved = app.snapshot();
  app.dom.window.close();
  app = boot(mailSaved);
  assert.equal(app.w.wfRestoreSession(), true);
  app.w.tcMailCompose(composeKey);
  assert.equal(app.w.document.getElementById('wf-' + composeKey + '-body').value, 'Unsent email draft');

  app.w.wfRestartCase();
  assert.equal(app.state().step, 0);
  assert.equal(app.state().maxStep, 0);
  assert.equal(app.state().decisions, undefined);
  assert.deepEqual(app.state().caseState.ss, {});
  assert.equal(app.state().mh.mail.sent.intake, undefined);
  assert.equal(app.state().mh.mail.drafts[composeKey], undefined);
  app.w.wfReset();
  app.w.dispatchEvent(new app.w.Event('pagehide'));
  assert.equal(app.w.localStorage.getItem('sc_wf_state'), null, 'Leaving the case must not recreate cleared progress');
  app.dom.window.close();
  console.log(`PASS: ${caseIdx === 0 ? 'buyer' : 'seller'} reload, drafts, substeps, documents, answers, restart`);
}

// Existing navigation behavior and legacy saves remain supported.
const legacy = { sc_active_panel: 'sim', sc_wf_state: JSON.stringify({city: 'ca', caseIdx: 1, step: 2}) };
const old = boot(legacy);
assert.equal(old.w.wfRestoreSession(), true);
assert.equal(old.state().step, 2);
old.dom.window.close();
const nav = boot(legacy, 'navigate');
assert.equal(nav.w.wfRestoreSession(), false);
assert.equal(nav.w.localStorage.getItem('sc_active_panel'), null);
nav.dom.window.close();
console.log('PASS: legacy saves and normal navigation');
}
