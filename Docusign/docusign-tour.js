/* DocuSign VA Training Simulator — Guided Tour.
   Spotlights real UI elements. Shown once; resets on progress clear.
   Pattern mirrors qualia-tour.js exactly. */

const DS_TOUR_STEPS = [
  {
    title: 'Welcome to the DocuSign VA Training Simulator',
    text: "This quick tour shows you where everything lives before you start practicing. It takes about a minute — skip at any time.",
    target: null
  },
  {
    title: 'DocuSign eSignature top bar',
    text: 'This matches the real DocuSign header — logo, navigation tabs (Home, Agreements, Templates, Scenarios), help icon, and your user avatar. All navigation happens from here or the sidebar.',
    target: '.ds-topbar'
  },
  {
    title: 'Left sidebar — your main workspace',
    text: 'Just like the real DocuSign, the sidebar gives you quick access to Inbox, Sent, Drafts, and Quick Views like Waiting for Others and Completed.',
    target: '.ds-sidebar'
  },
  {
    title: 'The NEW button — send envelopes',
    text: 'This yellow NEW button matches the real DocuSign exactly. Click it any time to start a new envelope: upload documents, add recipients, set signing order, place fields, and send.',
    target: '.ds-new-btn'
  },
  {
    title: 'Training checklists',
    text: 'Each card tracks one training module. Items check themselves off automatically as you perform the real action — nothing to mark by hand.',
    target: '.ds-dash-grid',
    before: () => dsGoto('dashboard')
  },
  {
    title: 'Quick stats dashboard',
    text: 'See at a glance how many envelopes are waiting for signatures and how many are completed. Click any stat card to jump to the filtered view.',
    target: '.ds-quick-actions'
  },
  {
    title: 'Agreements — your envelope queue',
    text: 'Filter by Waiting for Others, Completed, Draft, or Voided. Click any envelope row to open the detail view with actions: Send Reminder, Correct, Void, and Download.',
    target: '.ds-filter-tabs',
    before: () => dsGoto('envelopes')
  },
  {
    title: 'Envelope actions',
    text: 'Click any envelope row to see the full action bar: Send Reminder re-notifies signers, Correct fixes email typos, Void stops signing with a mandatory reason, Download saves the completed PDF.',
    target: '.ds-tbl'
  },
  {
    title: 'Templates — work smarter',
    text: 'Pre-built templates for NDAs, Contractor Agreements, and Purchase Packages. One click auto-populates documents, recipient roles, and signature fields.',
    target: '.ds-template-grid',
    before: () => dsGoto('templates')
  },
  {
    title: "You're ready to practice",
    text: "Explore any module in any order. Try the New Envelope wizard first, then open the Waiting envelope to practice Resend and Correct, and finish with the Final Exam.",
    target: null,
    before: () => dsGoto('dashboard')
  }
];

let dsTourIndex = 0;

function dsTourStart() {
  dsTourIndex = 0;
  document.getElementById('dsTour').classList.add('open');
  dsTourShow(0);
}

function dsTourShow(i) {
  const step = DS_TOUR_STEPS[i];
  if (step.before) step.before();
  document.getElementById('dsTourTipBody').innerHTML =
    '<b>' + esc(step.title) + '</b><p>' + esc(step.text) + '</p>';
  document.getElementById('dsTourProgress').textContent = (i + 1) + ' / ' + DS_TOUR_STEPS.length;
  document.getElementById('dsTourBackBtn').style.visibility = i === 0 ? 'hidden' : 'visible';
  document.getElementById('dsTourNextBtn').textContent =
    i === DS_TOUR_STEPS.length - 1 ? 'Finish' : 'Next';
  requestAnimationFrame(() => requestAnimationFrame(() => dsTourPosition(step)));
}

function dsTourPosition(step) {
  const highlight = document.getElementById('dsTourHighlight');
  const tip       = document.getElementById('dsTourTip');
  const el        = step.target ? document.querySelector(step.target) : null;
  const rect      = el ? el.getBoundingClientRect() : null;

  if (rect && rect.width > 0 && rect.height > 0) {
    const pad = 8;
    highlight.style.top    = (rect.top  - pad) + 'px';
    highlight.style.left   = (rect.left - pad) + 'px';
    highlight.style.width  = (rect.width  + pad * 2) + 'px';
    highlight.style.height = (rect.height + pad * 2) + 'px';
    highlight.style.borderRadius = '8px';

    const tipW = 330, tipH = tip.offsetHeight || 190, margin = 14;
    let top  = rect.bottom + pad + margin;
    if (top + tipH > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - pad - margin - tipH);
    }
    let left = Math.min(Math.max(margin, rect.left), window.innerWidth - tipW - margin);
    tip.style.top       = top  + 'px';
    tip.style.left      = left + 'px';
    tip.style.transform = 'none';
  } else {
    /* Centered — no target */
    highlight.style.top    = (window.innerHeight / 2 - 1) + 'px';
    highlight.style.left   = (window.innerWidth  / 2 - 1) + 'px';
    highlight.style.width  = '2px';
    highlight.style.height = '2px';
    highlight.style.borderRadius = '50%';
    tip.style.top       = '50%';
    tip.style.left      = '50%';
    tip.style.transform = 'translate(-50%, -50%)';
  }
}

function dsTourNext() {
  if (dsTourIndex >= DS_TOUR_STEPS.length - 1) { dsTourEnd(); return; }
  dsTourIndex++;
  dsTourShow(dsTourIndex);
}
function dsTourBack() {
  if (dsTourIndex === 0) return;
  dsTourIndex--;
  dsTourShow(dsTourIndex);
}
function dsTourSkip() { dsTourEnd(); }
function dsTourEnd() {
  document.getElementById('dsTour').classList.remove('open');
  dsStore.tourSeen = true;
  dsSave();
}

window.addEventListener('resize', () => {
  const tourEl = document.getElementById('dsTour');
  if (tourEl && tourEl.classList.contains('open')) {
    dsTourPosition(DS_TOUR_STEPS[dsTourIndex]);
  }
});
