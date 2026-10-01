const assert = require('node:assert/strict');
const { boot } = require('./test_case_reload_persistence');

for (const caseIdx of [0, 1]) {
  let app = boot();
  app.w.openPanel('sim');
  app.w.simGoToCity('ca');
  app.w.simStart(app.w.SIM_DATA.ca[caseIdx]);
  app.run('_wfMaxStep = 7');
  let dateCount = 0, moneyCount = 0;
  for (let step = 0; step < 8; step++) {
    app.w.wfGoToStep(step);
    const doc = app.w.document;
    const dates = [...doc.querySelectorAll('input[placeholder="mm/dd/yyyy"]')];
    const amounts = [...doc.querySelectorAll('input[placeholder="$"]')];
    dateCount += dates.length;
    moneyCount += amounts.length;
    dates.forEach(field => assert.equal(field.getAttribute('aria-haspopup'), 'dialog', field.id));
    amounts.forEach(field => {
      assert.equal(field.dataset.tcField, 'money', field.id);
      field.value = '1298000.50';
      field.dispatchEvent(new app.w.Event('input', { bubbles: true }));
      assert.equal(field.value, '1,298,000.50', field.id);
      field.value = '';
      field.dispatchEvent(new app.w.Event('input', { bubbles: true }));
    });
    // Auto-fill must still pass the case's original grading rules.
    const forms = [...doc.querySelectorAll('.mh-rows .mh-row:first-child input, .mh-rows .mh-row:first-child select')];
    forms.forEach(field => {
      const id = field.id.replace(/-0$/, '');
      app.w.caNewAutoFill(id);
      assert(app.run('wfActiveScenario._mh[' + JSON.stringify('r_' + id) + '].every(Boolean)'), id);
    });
    if (step === 1) {
      const zfId = caseIdx === 0 ? 'bc-zf' : 'hs-zf';
      app.w.caNewZfAutoFill(zfId);
      [...doc.querySelectorAll('.zf-inline-input[data-tc-field]')].forEach(field => {
        assert(field.value, field.id + ' auto-fill');
        assert(doc.getElementById(field.id + '-wrap').classList.contains('is-valid'), field.id + ' validation');
      });
      const fastMoney = doc.querySelector('.zf-fastfill-input[data-tc-field="money"]');
      assert(fastMoney && fastMoney.value.includes(','));
      if (caseIdx === 1) {
        assert.equal(doc.getElementById('hs-zf-ff-begin').type, 'text');
        assert.equal(doc.getElementById('hs-zf-ff-begin').value, '10/22/2025');
      }
    }
    const ss = doc.querySelector('.wf-ss-app');
    if (ss) {
      app.w.caNewSsAutoFillFields(ss.id);
      [...ss.querySelectorAll('[data-tc-field]')].forEach(field => assert(field.value, field.id));
    }
  }
  assert(dateCount > 10 && moneyCount > 5);

  // Restore old US-format dates and plain numeric amounts in the RPA/RLA.
  app.w.wfGoToStep(1);
  const date = app.w.document.querySelector('.zf-inline-input[data-tc-field="date"]');
  const money = app.w.document.querySelector('.zf-inline-input[data-tc-field="money"]');
  app.w.dispatchEvent(new app.w.Event('pagehide'));
  const saved = app.snapshot();
  const state = JSON.parse(saved.sc_wf_state);
  state.mh['zf_val_' + date.id] = '02/02/2026';
  state.mh['zf_val_' + money.id] = '1298000.50';
  saved.sc_wf_state = JSON.stringify(state);
  const dateId = date.id, moneyId = money.id;
  app.dom.window.close();
  app = boot(saved);
  assert.equal(app.w.wfRestoreSession(), true);
  assert.equal(app.w.document.getElementById(dateId).value, '02/02/2026');
  assert.equal(app.w.document.getElementById(moneyId).value, '1,298,000.50');

  const input = app.w.document.getElementById(moneyId);
  for (const [raw, expected] of [['', ''], ['0', '0'], ['1234.', '1,234.'], ['1234.00', '1,234.00'], ['$1,298,000.50', '1,298,000.50']]) {
    input.value = raw;
    input.dispatchEvent(new app.w.Event('input', { bubbles: true }));
    assert.equal(input.value, expected);
  }
  input.value = '192,345';
  input.setSelectionRange(2, 2);
  input.dispatchEvent(new app.w.Event('input', { bubbles: true }));
  assert.equal(input.selectionStart, 2, 'Caret stays beside the edited digit');
  app.dom.window.close();
  console.log('PASS:', caseIdx === 0 ? 'buyer' : 'seller', dateCount, 'date fields,', moneyCount, 'money fields; auto-fill, validation, legacy restore and caret');
}
