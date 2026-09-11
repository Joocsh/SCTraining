const fs = require('fs');
const code = fs.readFileSync('Docusign/docusign-data.js', 'utf8');
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('scenarioId:')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
