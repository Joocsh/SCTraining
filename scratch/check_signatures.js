const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') || f.endsWith('.css'));
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (/class=["'][^"']*(?:sig|sign)[^"']*["']/i.test(l) || /class="line"/i.test(l) || /\/s\//i.test(l)) {
        console.log(`${fullPath}:${idx + 1}: ${l.trim()}`);
      }
    });
  }
}

console.log('=== APPFOLIO DOCUMENTS ===');
checkDir('AppFolio/documents');

console.log('\n=== DOCUSIGN DOCUMENTS ===');
checkDir('Docusign/documents');

console.log('\n=== QUALIA DOCUMENTS ===');
checkDir('Quialia/documents');
