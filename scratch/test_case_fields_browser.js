const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'training.test') return route.abort();
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.abort();
      let body = fs.readFileSync(file);
      if (file.endsWith('.html')) body = body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
      await route.fulfill({ body, contentType: types[path.extname(file)] || 'application/octet-stream' });
    });
    await page.goto('https://training.test/roles/transaction-coordinator.html');
    for (const script of ['workflow.js', 'tc-ca-new-case.js', 'tc-ca-seller-case.js']) {
      await page.addScriptTag({ path: path.join(root, 'assets/js', script) });
    }
    await page.evaluate(() => {
      window.SIM_STATES = [{ key: 'ca', label: 'California' }];
      window.SIM_DATA = { ca: [TC_CA_NEW_CASE, TC_CA_SELLER_CASE] };
      PANEL_ON_OPEN.sim = simInit;
      openPanel('sim');
      simGoToCity('ca');
      simStart(TC_CA_SELLER_CASE);
      wfNext();
      caNewZfOpenDocFullscreen('hs-zf', false);
    });
    const money = page.locator('#hs-zf-1-2');
    await money.fill('');
    await money.pressSequentially('1298000.50');
    assert.equal(await money.inputValue(), '1,298,000.50');
    await money.fill('1234');
    await money.evaluate(el => el.setSelectionRange(2, 2));
    await money.press('Backspace');
    assert.equal(await money.inputValue(), '234', 'Backspace next to grouping comma deletes a digit');
    await money.fill('1234');
    await money.evaluate(el => el.setSelectionRange(1, 1));
    await money.press('Delete');
    assert.equal(await money.inputValue(), '134', 'Forward delete skips grouping comma');
    await money.fill('2198000.50');
    const begin = page.locator('#hs-zf-1-0');
    await begin.click();
    const calendar = page.locator('#tc-calendar');
    assert(await calendar.isVisible());
    await calendar.getByLabel('Year', { exact: true }).selectOption('2025');
    await calendar.getByLabel('Month', { exact: true }).selectOption('9');
    await calendar.locator('[data-date="2025-10-22"]').click();
    assert.equal(await begin.inputValue(), '10/22/2025');
    assert.equal(await calendar.isVisible(), false);
    assert(await page.locator('#hs-zf-1-0-wrap').evaluate(el => el.classList.contains('is-valid')));
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sc_wf_state')));
    assert.equal(stored.mh['zf_val_hs-zf-1-0'], '10/22/2025');

    // Keyboard selection and Escape return focus without closing the form.
    await begin.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    assert.equal(await begin.inputValue(), '10/23/2025');
    await begin.press('ArrowDown');
    await page.keyboard.press('Escape');
    assert.equal(await calendar.isVisible(), false);
    assert(await begin.evaluate(el => el === document.activeElement));
    assert(await page.locator('#hs-zf-doc-modal').isVisible());

    // Leap-year navigation, invalid manual dates and clearing.
    await begin.click();
    await calendar.getByLabel('Year', { exact: true }).selectOption('2024');
    await calendar.getByLabel('Month', { exact: true }).selectOption('1');
    await calendar.locator('[data-date="2024-02-29"]').click();
    assert.equal(await begin.inputValue(), '02/29/2024');
    await begin.click();
    await calendar.getByLabel('Year', { exact: true }).selectOption('2025');
    assert.equal(await calendar.locator('[data-date="2025-02-29"]').count(), 0);
    await calendar.getByRole('button', { name: 'Clear', exact: true }).click();
    assert.equal(await begin.inputValue(), '');
    await begin.fill('02/30/2026');
    await begin.press('Tab');
    assert.equal(await begin.getAttribute('aria-invalid'), 'true');
    await begin.fill('10/22/2025');
    assert.equal(await calendar.getByLabel('Year', { exact: true }).inputValue(), '2025');
    assert.equal(await calendar.getByLabel('Month', { exact: true }).inputValue(), '9');
    await begin.press('Tab');
    await page.locator('#hs-zf-1-1').fill('2026-04-21');
    await page.locator('#hs-zf-1-1').press('Tab');
    assert.equal(await page.locator('#hs-zf-1-1').inputValue(), '04/21/2026');
    await money.fill('2198000.00');
    await money.press('Tab');
    await begin.click();
    const screenshot = path.join(os.tmpdir(), 'sctraining-california-fields.png');
    await page.screenshot({ path: screenshot });
    const bounds = await calendar.boundingBox();
    assert(bounds.x >= 0 && bounds.y >= 0 && bounds.y + bounds.height <= 1000);
    await page.keyboard.press('Escape');

    // Same picker works in the buyer case and fits a narrow viewport.
    await page.evaluate(() => {
      simStart(TC_CA_NEW_CASE);
      wfNext();
      caNewZfOpenDocFullscreen('bc-zf', false);
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const expiry = page.locator('#bc-zf-1-5');
    await expiry.fill('02/02/2026');
    await expiry.press('Tab');
    await expiry.press('ArrowDown');
    const narrow = await calendar.boundingBox();
    assert(narrow.x >= 0 && narrow.x + narrow.width <= 390 && narrow.y >= 0 && narrow.y + narrow.height <= 844);
    await calendar.locator('[data-date="2026-02-02"]').click();
    assert.equal(await expiry.inputValue(), '02/02/2026');
    assert(await page.locator('#bc-zf-1-5-wrap').evaluate(el => el.classList.contains('is-valid')));
    assert.deepEqual(errors, []);
    console.log('PASS: custom calendar in both cases, manual dates, leap years, keyboard, saved selection, narrow viewport and money fields');
    console.log(screenshot);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
