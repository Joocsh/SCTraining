const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="wf-body"></div><div id="wf-eval-container"></div><div id="wf-scorebar-fallback"></div><div id="wf-pipeline"></div><div id="wf-score-float"></div></body></html>', { runScripts: 'dangerously' });
const window = dom.window;
const document = window.document;

// Mock some globals if needed
window.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

// load workflow.js
const wfJs = fs.readFileSync('assets/js/workflow.js', 'utf8');
window.eval(wfJs);

// load tc-ca-new-case.js
const tcJs = fs.readFileSync('assets/js/tc-ca-new-case.js', 'utf8');
window.eval(tcJs);

// Init scenario
window.wfActiveScenario = window.TC_CA_NEW_CASE;
window.wfActiveSteps = window.TC_CA_NEW_CASE.wfSteps;
window.wfActiveLabels = window.TC_CA_NEW_CASE.wfLabels;
window.wfStep = 0;

// Render step 0
document.getElementById('wf-body').innerHTML = window.TC_CA_NEW_CASE.wfSteps[0]();

console.log('Step 0 rendered.');
console.log('ca2-d-price exists:', !!document.getElementById('ca2-d-price'));
console.log('ca2-d-price-complete exists:', !!document.getElementById('ca2-d-price-complete'));
const comp = document.getElementById('ca2-d-price-complete');
console.log('ca2-d-price-complete initial display:', comp ? comp.style.display : 'none');

// Auto fill slide 1
window.caNewAutoFill('ca2-file');
window.caNewCheck('ca2-file');
console.log('Slide 1 ok:', window.caNewIsSlide1Ok());

// Auto pick slide 2
window.caNewAutoPick('ca2-p-predocs');
window.caNewPickCheck('ca2-p-predocs');
console.log('Slide 2 ok:', window.caNewIsSlide2Ok());

// Go to slide 3
window.caNewGoSlide(3);
console.log('Slide 3 active:', document.getElementById('ca2-deck-s3').classList.contains('active'));

// Pick correct decision
console.log('Now picking decision...');
const opts = document.querySelectorAll('#ca2-d-price .wf-chat-option');
console.log('Found options count:', opts.length);

opts[1].click();

console.log('After option click:');
console.log('comp display:', comp.style.display);
console.log('st d_ca2-d-price:', window.wfActiveScenario._mh ? window.wfActiveScenario._mh['d_ca2-d-price'] : 'none');
console.log('HTML of ca2-deck-s3:\n', document.getElementById('ca2-deck-s3').innerHTML);
