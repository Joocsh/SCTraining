const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== STARTING CERTIFICATE AUDIT VERIFICATION ===');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto('http://localhost:5799/Docusign/', { waitUntil: 'networkidle0' });

  // Test 1: Open Certificate on ENV-2026-7734
  console.log('Opening ENV-2026-7734 Certificate modal...');
  await page.evaluate(() => {
    dsOpenCertificateModal('ENV-2026-7734');
  });

  await new Promise(r => setTimeout(r, 500));

  const modalExists = await page.evaluate(() => !!document.getElementById('dsCertModalWrap'));
  console.log('Modal rendered:', modalExists);

  // Check column alignment of Signer Events header vs Signer row
  const alignmentReport = await page.evaluate(() => {
    const secHeaders = Array.from(document.querySelectorAll('.ds-cert-body .cert-sec')).map(el => {
      const spans = Array.from(el.children);
      return {
        title: spans[0] ? spans[0].textContent.trim() : '',
        titleRect: spans[0] ? spans[0].getBoundingClientRect() : null,
        c2Rect: el.querySelector('.c2') ? el.querySelector('.c2').getBoundingClientRect() : null,
        c3Rect: el.querySelector('.c3') ? el.querySelector('.c3').getBoundingClientRect() : null
      };
    });

    const rows = Array.from(document.querySelectorAll('.ds-cert-body .cert-row')).map(el => {
      const c1 = el.querySelector('.c1');
      const c2 = el.querySelector('.c2');
      const c3 = el.querySelector('.c3');
      return {
        text1: c1 ? c1.textContent.slice(0, 30).trim() : '',
        c1Rect: c1 ? c1.getBoundingClientRect() : null,
        c2Rect: c2 ? c2.getBoundingClientRect() : null,
        c3Rect: c3 ? c3.getBoundingClientRect() : null
      };
    });

    const bodyText = document.querySelector('.ds-cert-body') ? document.querySelector('.ds-cert-body').innerText : '';
    const hasTypo = bodyText.includes('Envelopeld');
    const hasCorrectEnvelopeId = bodyText.includes('EnvelopeId Stamping: Enabled');

    return { secHeaders, rows, hasTypo, hasCorrectEnvelopeId };
  });

  console.log('Has "Envelopeld" typo:', alignmentReport.hasTypo);
  console.log('Has correct "EnvelopeId Stamping: Enabled":', alignmentReport.hasCorrectEnvelopeId);

  const signerSec = alignmentReport.secHeaders.find(s => s.title.includes('Signer Events'));
  const firstRow = alignmentReport.rows.find(r => r.text1.includes('Elena Rostova'));

  if (signerSec && firstRow) {
    console.log('Signer Events header c2 x:', signerSec.c2Rect ? signerSec.c2Rect.x : 'none');
    console.log('Signer row c2 x:', firstRow.c2Rect ? firstRow.c2Rect.x : 'none');
    console.log('Signer Events header c3 x:', signerSec.c3Rect ? signerSec.c3Rect.x : 'none');
    console.log('Signer row c3 x:', firstRow.c3Rect ? firstRow.c3Rect.x : 'none');

    const diffC2 = Math.abs((signerSec.c2Rect?.x || 0) - (firstRow.c2Rect?.x || 0));
    const diffC3 = Math.abs((signerSec.c3Rect?.x || 0) - (firstRow.c3Rect?.x || 0));
    console.log('Discrepancy in Column 2 (Signature):', diffC2, 'px');
    console.log('Discrepancy in Column 3 (Timestamp):', diffC3, 'px');
  }

  // Take screenshot of 7734 certificate modal
  await page.screenshot({ path: path.join(__dirname, 'cert_7734_verified.png'), fullPage: false });
  console.log('Saved screenshot cert_7734_verified.png');

  // Test 2: Close and test ENV-2026-9041 (Sequential signing with John Smith completed, Sarah Johnson waiting)
  await page.evaluate(() => {
    dsCloseCertificateModal();
    dsOpenCertificateModal('ENV-2026-9041');
  });

  await new Promise(r => setTimeout(r, 500));

  const report9041 = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.ds-cert-body .cert-row')).map(el => {
      const c1 = el.querySelector('.c1')?.innerText || '';
      const c2 = el.querySelector('.c2')?.innerText || '';
      const c3 = el.querySelector('.c3')?.innerText || '';
      return { c1: c1.slice(0, 40), c2: c2.slice(0, 40), c3: c3.slice(0, 40) };
    });
    return rows;
  });

  console.log('\n--- ENV-2026-9041 Rows Summary ---');
  report9041.forEach((r, i) => {
    console.log(`[Row ${i+1}] ${r.c1.replace(/\n/g, ' ')} | ${r.c2.replace(/\n/g, ' ')} | ${r.c3.replace(/\n/g, ' ')}`);
  });

  await page.screenshot({ path: path.join(__dirname, 'cert_9041_verified.png'), fullPage: false });
  console.log('Saved screenshot cert_9041_verified.png');

  await browser.close();
  console.log('=== CERTIFICATE AUDIT COMPLETE ===');
})();
