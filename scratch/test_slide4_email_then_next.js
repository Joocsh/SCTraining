const fs = require('fs');

console.log('=== TESTING SLIDE 4: SEND EMAIL THEN NEXT BUTTON APPEARS ===');

global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const elements = {};
function getOrCreate(id) {
  if (!elements[id]) {
    elements[id] = {
      id,
      value: '',
      className: '',
      style: {},
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); elements[id].className = Array.from(this.classes).join(' '); },
        remove(c) { this.classes.delete(c); elements[id].className = Array.from(this.classes).join(' '); },
        toggle(c) { if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c); elements[id].className = Array.from(this.classes).join(' '); },
        contains(c) { return this.classes.has(c); }
      },
      innerHTML: '',
      textContent: '',
      dataset: {},
      appendChild(child) { if (!this.children) this.children = []; this.children.push(child); return child; },
      scrollIntoView() {},
      focus() {},
      removeAttribute() {}
    };
  }
  return elements[id];
}

global.document = {
  getElementById: (id) => getOrCreate(id),
  createElement: (tag) => ({
    tagName: tag,
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    innerHTML: '',
    appendChild() {},
    setAttribute() {},
    remove() {},
    addEventListener() {}
  }),
  head: { appendChild: () => {} },
  body: { style: {}, classList: { add: () => {}, remove: () => {} }, appendChild: () => {} },
  querySelector: () => ({ scrollIntoView: () => {} }),
  querySelectorAll: () => []
};

// Hook innerHTML setter on wf-body to parse IDs and classes into mock elements
const origWfBody = getOrCreate('wf-body');
let wfBodyHtml = '';
Object.defineProperty(origWfBody, 'innerHTML', {
  get() { return wfBodyHtml; },
  set(val) {
    wfBodyHtml = val;
    const matches = val.matchAll(/id="([^"]+)"[^>]*class="([^"]+)"|class="([^"]+)"[^>]*id="([^"]+)"/g);
    for (const m of matches) {
      const id = m[1] || m[4];
      const cls = m[2] || m[3];
      if (id && cls) {
        const el = getOrCreate(id);
        el.className = cls;
        el.classList.classes = new Set(cls.split(/\s+/).filter(Boolean));
      }
    }
  }
});

global.esc = (s) => String(s || '');
global.simPickCenterToggle = () => {};
global.simRenderCards = () => {};

eval(fs.readFileSync('assets/js/workflow.js', 'utf8') + '\n;' + fs.readFileSync('assets/js/tc-ca-new-case.js', 'utf8'));

// Start California Case
wfStart(window.TC_CA_NEW_CASE);

const html0 = document.getElementById('wf-body').innerHTML;

// 1. Verify Next button has style="display:none" in the rendered HTML of Slide 4
const nextBtnMatch = /id="ca2-s0-info-next"[^>]*style="([^"]*)"/.exec(html0);
console.log('Initial Next button style attribute in HTML:', nextBtnMatch ? nextBtnMatch[1] : 'not found');
if (!nextBtnMatch || !nextBtnMatch[1].includes('display:none')) {
  throw new Error('ca2-s0-info-next must have display:none initially in HTML');
}
console.log('✓ Initial HTML renders ca2-s0-info-next with display:none');

// 2. Step through slides 1 -> 2 -> 3 -> 4
caNewGoSlide(1);
caNewAutoFill('ca2-file');
caNewSlide1Next();
caNewAutoPick('ca2-p-predocs');
caNewSlide2Next();
caNewAutoPick('ca2-p-missing');
caNewSlide3Next();

console.log('Arrived on Slide:', window._caNewSlide0);
if (window._caNewSlide0 !== 4) throw new Error('Expected to be on Slide 4');

const nextBtnEl = document.getElementById('ca2-s0-info-next');
console.log('Next button style.display on Slide 4 BEFORE sending email:', nextBtnEl.style.display);
if (nextBtnEl.style.display !== 'none') {
  throw new Error('Next button must be hidden before email is sent');
}
console.log('✓ Slide 4 keeps Next button hidden while drafting');

// 3. Auto compose and submit email
caNewAutoCompose('ca2-missing-info');
caNewSubmitCompose('ca2-missing-info', {
  textareaId: 'wf-ca2-missing-info-body',
  statusElId: 'wf-ca2-missing-info-body-status',
  btnId: 'wf-ca2-missing-info-body-btn',
  role: 'tc',
  scenarioId: 'tc-ca-missing-info',
  scenarioPrompt: 'Request missing listing details from Sofia Reyes',
  maxScore: 5
});

setTimeout(() => {
  console.log('Next button style.display on Slide 4 AFTER sending email:', nextBtnEl.style.display);
  if (nextBtnEl.style.display !== 'inline-flex') {
    throw new Error('Next button must appear (inline-flex) after email is sent');
  }
  console.log('✓ Next button becomes visible (inline-flex) immediately after email is sent');

  // 4. Advance to Slide 5
  caNewSlide4Next();
  console.log('Current slide after caNewSlide4Next():', window._caNewSlide0);
  if (window._caNewSlide0 !== 5) {
    throw new Error('Should have advanced to Slide 5');
  }
  console.log('✓ Successfully advanced to Slide 5');

  // 5. Navigate back to Slide 4 and ensure Next button remains visible
  caNewGoSlide(4);
  console.log('Next button style.display when returning to Slide 4:', nextBtnEl.style.display);
  if (nextBtnEl.style.display !== 'inline-flex') {
    throw new Error('Next button must remain visible when returning to previously completed Slide 4');
  }
  console.log('✓ Next button remains visible when revisiting sent email on Slide 4');

  console.log('\n=== ALL SLIDE 4 EMAIL THEN NEXT TESTS PASSED SUCCESSFULLY! ===');
}, 1100);
