/* Qualia VA Training Simulator — first-time guided tour.
   Spotlights real UI elements while the app underneath is frozen (non-interactive).
   Shown once (tracked in qzStore.tourSeen); resets whenever qzResetProgress() runs. */

const QZ_TOUR_STEPS = [
  {
    title: 'Welcome to the Qualia VA Training Simulator',
    text: "This quick tour shows you where everything lives before you start practicing. It takes about a minute, and you can skip it at any time.",
    target: null
  },
  {
    title: 'The Qualia Core sections',
    text: 'This dark bar is Qualia Core, the tool a title and escrow team works in. Orders is where you will spend nearly all your time. Training is this course, not part of the product.',
    target: '.qz-tabs'
  },
  {
    title: 'Find any order',
    text: "Search by property address, order number, or a party's name, the same way you would in the real tool.",
    target: '.qz-search'
  },
  {
    title: 'Guided lessons, in order',
    text: 'Each card is a lesson. Complete every step, real actions in the UI, "what should I do?" scenarios, and document verification, to unlock the next one.',
    target: '.qz-lesson-grid',
    before: () => qzGoto('dashboard')
  },
  {
    title: 'Open a file',
    text: 'Click any row to open that Order, exactly like a live queue.',
    target: '.qz-tbl',
    before: () => qzGoto('orders')
  },
  {
    title: 'Everything about the file, on one rail',
    text: 'Inside an order, this dark rail groups every page: Order details, Closing charges, and your Tasks. Sections the course does not cover are still listed, so you recognise the real thing.',
    target: '.qz-order-side',
    before: () => qzOpenOrder('ORD-2026-1483')
  },
  {
    title: 'Several files at once',
    text: 'Each order you open gets its own tab up here, and each remembers the page you were on. Working five files in parallel is the normal shape of the job.',
    target: '#qzOrderTabs'
  },
  {
    title: 'Chat, tasks, help and notes',
    text: 'This panel follows whatever page you are on. Notes is the one that saves: it is where you record what you did and what you are waiting on.',
    target: '.qz-order-panel'
  },
  {
    title: 'Always check the stage first',
    text: 'This timeline shows exactly where the file stands. Confirm it here before you tell anyone anything about the file.',
    target: '.qz-timeline'
  },
  {
    title: "You're ready",
    text: 'That is the tour. Start with Lesson 1 on the Dashboard, and work through them in order.',
    target: null,
    before: () => qzGoto('dashboard')
  }
];

let qzTourIndex = 0;

function qzTourStart() {
  qzTourIndex = 0;
  document.getElementById('qzTour').classList.add('open');
  qzTourShow(0);
}
function qzTourShow(i) {
  const step = QZ_TOUR_STEPS[i];
  if (step.before) step.before();
  document.getElementById('qzTourTipBody').innerHTML = `<b>${esc(step.title)}</b><p>${esc(step.text)}</p>`;
  document.getElementById('qzTourProgress').textContent = (i + 1) + ' / ' + QZ_TOUR_STEPS.length;
  document.getElementById('qzTourBackBtn').style.visibility = i === 0 ? 'hidden' : 'visible';
  document.getElementById('qzTourNextBtn').textContent = i === QZ_TOUR_STEPS.length - 1 ? 'Finish' : 'Next';
  requestAnimationFrame(() => requestAnimationFrame(() => qzTourPosition(step)));
}
function qzTourPosition(step) {
  const highlight = document.getElementById('qzTourHighlight');
  const tip = document.getElementById('qzTourTip');
  const el = step.target ? document.querySelector(step.target) : null;
  const rect = el ? el.getBoundingClientRect() : null;

  if (rect) {
    const pad = 8;
    highlight.style.top = (rect.top - pad) + 'px';
    highlight.style.left = (rect.left - pad) + 'px';
    highlight.style.width = (rect.width + pad * 2) + 'px';
    highlight.style.height = (rect.height + pad * 2) + 'px';
    highlight.style.borderRadius = '10px';

    const tipW = 320, tipH = tip.offsetHeight || 170, margin = 14;
    let top = rect.bottom + pad + margin;
    if (top + tipH > window.innerHeight - margin) top = Math.max(margin, rect.top - pad - margin - tipH);
    let left = Math.min(Math.max(margin, rect.left), window.innerWidth - tipW - margin);
    tip.style.top = top + 'px';
    tip.style.left = left + 'px';
    tip.style.transform = 'none';
  } else {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    highlight.style.top = (cy - 1) + 'px';
    highlight.style.left = (cx - 1) + 'px';
    highlight.style.width = '2px';
    highlight.style.height = '2px';
    highlight.style.borderRadius = '50%';
    tip.style.top = '50%';
    tip.style.left = '50%';
    tip.style.transform = 'translate(-50%, -50%)';
  }
}
function qzTourNext() {
  if (qzTourIndex >= QZ_TOUR_STEPS.length - 1) { qzTourEnd(); return; }
  qzTourIndex++;
  qzTourShow(qzTourIndex);
}
function qzTourBack() {
  if (qzTourIndex === 0) return;
  qzTourIndex--;
  qzTourShow(qzTourIndex);
}
function qzTourSkip() { qzTourEnd(); }
function qzTourEnd() {
  document.getElementById('qzTour').classList.remove('open');
  qzStore.tourSeen = true;
  qzSave();
}

window.addEventListener('resize', () => {
  const tourEl = document.getElementById('qzTour');
  if (tourEl && tourEl.classList.contains('open')) qzTourPosition(QZ_TOUR_STEPS[qzTourIndex]);
});
