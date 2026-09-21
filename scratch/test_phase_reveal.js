const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id="app"></div><div id="wf-modal-layer"></div></body></html>`, {
  runScripts: "dangerously"
});
const { window } = dom;
global.window = window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.Element = window.Element;
global.document.head.appendChild = window.document.head.appendChild.bind(window.document.head);
global.document.getElementById = window.document.getElementById.bind(window.document);
global.setTimeout = (fn, ms) => fn(); // immediate for tests
window.Element.prototype.scrollIntoView = () => {};

// Mock workflow helpers needed by tc-ca-new-case.js
window.wfActiveScenario = { _decisions: [], _mh: {}, _mhFor: null };
window.wfOpenDoc = () => {};
window.wfRenderFinalScore = () => {};
window.wfNext = () => { window.__wfNextCalled = true; };

const workflowCode = fs.readFileSync('assets/js/workflow.js', 'utf8');
window.eval(workflowCode);

const caseCode = fs.readFileSync('assets/js/tc-ca-new-case.js', 'utf8');
window.eval(caseCode);

const steps = window.TC_CA_NEW_CASE.wfSteps;
console.log(`Loaded ${steps.length} steps.`);

let allPassed = true;

steps.forEach((stepFn, stepIdx) => {
  window.__wfNextCalled = false;
  window.wfActiveScenario._gatedPassed = false;
  const rendered = stepFn();
  const stepContainer = document.createElement('div');
  stepContainer.id = `step-container-${stepIdx}`;
  stepContainer.innerHTML = rendered.main;
  document.body.appendChild(stepContainer);

  console.log(`\n--- Verifying Step ${stepIdx + 1} (${rendered.title}) ---`);
  
  // Find all .wf-phase elements in this step
  const phases = Array.from(stepContainer.querySelectorAll('.wf-phase'));
  console.log(`Found ${phases.length} phases.`);
  if (phases.length < 2) {
    console.error(`Step ${stepIdx + 1} does not have at least 2 phases!`);
    allPassed = false;
  }

  // Phase 0 must be visible (no display:none)
  if (phases[0].style.display === 'none') {
    console.error(`Phase 0 is hidden!`);
    allPassed = false;
  } else {
    console.log(`Phase 0 is visible.`);
  }

  // Subsequent phases must have display:none and unique ids
  for (let i = 1; i < phases.length; i++) {
    const p = phases[i];
    if (p.style.display !== 'none') {
      console.error(`Phase ${i} (${p.id}) is NOT hidden by default!`);
      allPassed = false;
    }
    if (!p.id) {
      console.error(`Phase ${i} lacks an id!`);
      allPassed = false;
    }
  }

  // Test reveal sequence
  // If phase 0 has a .wf-phase-btn, let's trigger it
  const phaseBtn = phases[0].querySelector('.wf-phase-btn');
  if (phaseBtn) {
    console.log(`Found phase button in Phase 0: "${phaseBtn.textContent.trim()}". Triggering click.`);
    phaseBtn.click();
    // Verify first revealed phase is now visible
    const nextPhaseId = phases[1].id;
    const nextPhase = document.getElementById(nextPhaseId);
    if (nextPhase.style.display === 'none') {
      console.error(`Phase ${nextPhaseId} failed to reveal!`);
      allPassed = false;
    } else {
      console.log(`Phase ${nextPhaseId} successfully revealed.`);
    }
    // Verify Phase 0 received .done class
    if (!phases[0].classList.contains('done')) {
      console.error(`Phase 0 did NOT get 'done' class!`);
      allPassed = false;
    } else {
      console.log(`Phase 0 correctly marked 'done'.`);
    }
  }

  // Reveal all subsequent phases using caNewReveal to verify cascade
  for (let i = 1; i < phases.length; i++) {
    window.caNewReveal(phases[i].id);
    if (phases[i].style.display === 'none') {
      console.error(`Phase ${phases[i].id} could not be revealed!`);
      allPassed = false;
    }
  }

  // Verify final nav phase exists and has button (except step 10)
  if (stepIdx < 9) {
    const navBtn = stepContainer.querySelector('.wf-nav-btn');
    if (!navBtn) {
      console.error(`No nav button found in Step ${stepIdx + 1}!`);
      allPassed = false;
    } else {
      console.log(`Nav button verified: "${navBtn.textContent.trim()}".`);
    }
  }
});

if (allPassed) {
  console.log(`\n=== ALL STEPS PHASE REVEAL ARCHITECTURE VERIFIED SUCCESSFULLY! ===`);
} else {
  console.error(`\n=== ERRORS DETECTED DURING PHASE REVEAL VERIFICATION ===`);
  process.exit(1);
}
