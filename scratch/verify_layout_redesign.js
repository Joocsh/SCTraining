const fs = require('fs');
const path = require('path');

console.log('=== VERIFYING TC SIMULATOR LAYOUT & DESIGN IMPROVEMENTS ===');

const roleShellCss = fs.readFileSync(path.join(__dirname, '../assets/css/role-shell.css'), 'utf8');
const tcCaseCss = fs.readFileSync(path.join(__dirname, '../assets/css/tc-case.css'), 'utf8');

let errors = [];

function assert(condition, message) {
  if (condition) {
    console.log('✓ ' + message);
  } else {
    console.error('✗ FAILED: ' + message);
    errors.push(message);
  }
}

// 1. Contenedor principal — Limitar ancho máximo
assert(
  roleShellCss.includes('max-width: 1340px !important') && roleShellCss.includes('margin: 0 auto !important'),
  'role-shell.css: body.rshell .lc-panel-body has max-width: 1340px !important and margin: 0 auto !important'
);
assert(
  roleShellCss.includes('padding: 34px 40px 70px'),
  'role-shell.css: lateral padding adjusted to 34px 40px 70px'
);
assert(
  roleShellCss.includes('padding: 38px 48px 80px'),
  'role-shell.css: @media (min-width: 1600px) has proportional padding'
);
assert(
  tcCaseCss.includes('body.rshell .lc-panel-body:has(.mh-grid)') &&
  tcCaseCss.includes('max-width: 1340px !important') &&
  tcCaseCss.includes('margin: 0 auto !important'),
  'tc-case.css: .lc-panel-body overrides use max-width: 1340px !important and margin: 0 auto !important'
);

// 2. Grid del caso (.mh-grid) — Proporciones más equilibradas
assert(
  tcCaseCss.includes('grid-template-columns: minmax(0, 1fr) 340px;'),
  'tc-case.css: .mh-grid sidebar width increased to 340px'
);
assert(
  tcCaseCss.includes('gap: 32px;'),
  'tc-case.css: .mh-grid gap increased to 32px'
);

// 3. Sidebar del caso (.mh-side) — Mejorar visualmente
assert(
  /\.mh-side\s*\{[^}]*border-radius:\s*16px;/.test(tcCaseCss),
  'tc-case.css: .mh-side border-radius is 16px'
);
assert(
  tcCaseCss.includes('max-height: calc(100vh - 40px);') && tcCaseCss.includes('overflow-y: auto;'),
  'tc-case.css: .mh-side has max-height calc(100vh - 40px) and overflow-y: auto'
);
assert(
  tcCaseCss.includes('margin: -8px 0 16px;') && tcCaseCss.includes('border-radius: 999px;'),
  'tc-case.css: .mh-side::before has margin: -8px 0 16px and border-radius: 999px'
);

// 4. Cards de tareas (.mh-card) — Menos padding en ancho
assert(
  /\.mh-card\s*\{[^}]*border-radius:\s*16px;/.test(tcCaseCss),
  'tc-case.css: .mh-card border-radius is 16px'
);
assert(
  tcCaseCss.includes('padding: 24px 28px 22px 30px;'),
  'tc-case.css: .mh-card padding normalized to 24px 28px 22px 30px'
);
assert(
  tcCaseCss.includes('border-radius: 16px 0 0 16px;'),
  'tc-case.css: .mh-card::before border-radius is 16px 0 0 16px'
);

// 5. Email client (.wf-email-inbox-wrap) — Ancho de lectura
assert(
  /\.mh-main\s+\.wf-email-body\s+p\s*\{[^}]*max-width:\s*720px;/.test(tcCaseCss),
  'tc-case.css: .mh-main .wf-email-body p has max-width: 720px'
);

// 6. Pipeline stepper (.wf-pipeline) — Centrado y proporción
assert(
  /\.wf-pipeline\s*\{[^}]*margin:\s*0 auto 16px;/.test(tcCaseCss),
  'tc-case.css: .wf-pipeline margin is 0 auto 16px'
);

// 7. Sub-stepper pills (.wf-substepper) — Overflow y spacing
assert(
  /\.wf-substepper\s*\{[^}]*padding:\s*10px 24px 10px 14px;/.test(tcCaseCss),
  'tc-case.css: .wf-substepper padding has extra right spacing (24px)'
);
assert(
  /\.wf-substepper\s*\{[^}]*border-radius:\s*12px;/.test(tcCaseCss),
  'tc-case.css: .wf-substepper border-radius is 12px'
);

// 8. Compose/email cards — border-radius consistency
assert(
  /\.mh-main\s+\.wf-email\s*\{[^}]*border-radius:\s*16px;/.test(tcCaseCss),
  'tc-case.css: .mh-main .wf-email border-radius is 16px'
);
assert(
  /\.wf-email-client-bar\s*\{[^}]*border-radius:\s*16px 16px 0 0;/.test(tcCaseCss),
  'tc-case.css: .wf-email-client-bar border-radius is 16px 16px 0 0'
);
assert(
  /\.wf-email-inbox-wrap\s+\.wf-email\s*\{[^}]*border-radius:\s*0 0 16px 16px;/.test(tcCaseCss),
  'tc-case.css: .wf-email-inbox-wrap .wf-email border-radius is 0 0 16px 16px'
);
assert(
  /\.mh-main\s+\.wf-compose\s*\{[^}]*border-radius:\s*16px;/.test(tcCaseCss),
  'tc-case.css: .mh-main .wf-compose border-radius is 16px'
);
assert(
  /\.wf-chat-wrap\s*\{[^}]*border-radius:\s*16px;/.test(tcCaseCss),
  'tc-case.css: .wf-chat-wrap border-radius is 16px'
);
assert(
  /\.wf-score-card\s*\{[^}]*border-radius:\s*16px;/.test(tcCaseCss),
  'tc-case.css: .wf-score-card border-radius is 16px'
);

// 9. Score float (.wf-score-float)
assert(
  /\.wf-score-float\s*\{[^}]*border-radius:\s*16px;/.test(tcCaseCss),
  'tc-case.css: .wf-score-float border-radius is 16px'
);
assert(
  /\.wf-score-float\s*\{[^}]*bottom:\s*28px;\s*right:\s*84px;/.test(tcCaseCss),
  'tc-case.css: .wf-score-float positioned safely at bottom 28px, right 84px'
);

// 13. Responsiveness — Breakpoints
assert(
  /@media\s*\(max-width:\s*1100px\)/.test(tcCaseCss),
  'tc-case.css: intermediate @media (max-width: 1100px) added'
);
assert(
  /@media\s*\(max-width:\s*1100px\)\s*\{[^}]*\.mh-grid\s*\{[^}]*grid-template-columns:\s*1fr;/.test(tcCaseCss),
  'tc-case.css: .mh-grid collapses to 1fr at 1100px'
);

if (errors.length > 0) {
  console.error(`\nFound ${errors.length} failed assertion(s)!`);
  process.exit(1);
} else {
  console.log('\n=== ALL LAYOUT & DESIGN VERIFICATIONS PASSED SUCCESSFULLY! ===');
}
