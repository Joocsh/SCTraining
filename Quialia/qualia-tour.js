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
    title: 'Two home views',
    text: 'Dashboard tracks your training progress and is where you will practice Scenarios. Orders is where you will spend most of your time working files.',
    target: '.qz-tabs'
  },
  {
    title: 'Find any order',
    text: "Search by property address, order number, or a party's name, the same way you would in the real tool.",
    target: '.qz-search'
  },
  {
    title: 'Your checklist, automated',
    text: 'Each card tracks one part of the job. Items check themselves off as you perform the real action in the UI, nothing to mark by hand.',
    target: '.qz-dash-grid',
    before: () => qzGoto('dashboard')
  },
  {
    title: 'Practice your judgment',
    text: '"What should I do?" scenarios live right here on the Dashboard. Answer one, get feedback, and watch your score update as you go.',
    target: '.qz-scenario-grid'
  },
  {
    title: 'Open a file',
    text: 'Click any row to open that Order, exactly like a live queue.',
    target: '.qz-tbl',
    before: () => qzGoto('orders')
  },
  {
    title: 'Everything about the file, in one place',
    text: 'Overview, Data Entry, Documents, Tasks, and more all live inside the Order. Explore freely, nothing here is connected to a real account.',
    target: '.qz-order-tabs',
    before: () => qzOpenOrder('ORD-2026-1483')
  },
  {
    title: 'Always check the stage first',
    text: 'This timeline shows exactly where the file stands. Confirm it here before you tell anyone anything about the file.',
    target: '.qz-timeline'
  },
  {
    title: "You're ready",
    text: 'That is the tour. Explore any module in any order, and try a Scenario when you want to test your judgment.',
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
