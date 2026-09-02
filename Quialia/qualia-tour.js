/* Qualia VA Training Simulator — first-time guided tour.
   Spotlights real UI elements while the app underneath is frozen (non-interactive).
   Runs on a first login (tracked in qzStore.tourSeen) and on any launch carrying ?tour=1,
   which is how the Test Drive tile opens it. The tip's "don't show this again" checkbox
   (qzStore.tourOptOut) is the one answer that silences both. */

/* Order of the steps is the order the work happens in, and it is deliberate:

   1. the product first, top to bottom and left to right — top bar, queue, search, then a
      file opened and read the way the eye reads it (tab strip, rail, timeline, panel);
   2. the course last, as its own closing beat.

   The course used to be spotlighted in the middle, between the queue and the open file,
   which sent the trainee to the Lessons view and straight back out again and blurred the
   one distinction this simulator exists to teach: Qualia is the product, the lessons are
   not part of it. */
const QZ_TOUR_STEPS = [
  {
    title: 'Welcome to the Qualia VA Training Simulator',
    text: 'This is a practice copy of Qualia Core. Nothing here is connected to a real account, a real file or a real client. The tour takes a minute or two, and you can skip it at any time.',
    target: null
  },
  {
    title: 'The Qualia Core sections',
    text: 'This dark bar is Qualia Core, the tool a title and escrow team works in. Seven sections, and Orders is where you will spend nearly all of your time.',
    target: '.qz-tabs',
    before: () => qzGoto('orders')
  },
  {
    title: 'Your order queue',
    text: 'Every file the office has open sits in this list. A row opens that order, exactly like a live queue.',
    target: '.qz-tbl'
  },
  {
    title: 'Find any order',
    text: "Search by property address, order number, or a party's name, the same way you would in the real tool.",
    target: '.qz-search'
  },
  {
    title: 'Several files at once',
    text: 'An open order gets its own tab up here, and each one remembers the page you were on. Working five files in parallel is the normal shape of the job.',
    target: '#qzOrderTabs',
    before: () => qzOpenOrder('ORD-2026-1483')
  },
  {
    title: 'Everything about the file, on one rail',
    text: 'Inside an order this dark rail groups every page under four headings: Order, Closing, Integrations and Tasks. Pages the course does not cover are still listed, so you recognise the real thing.',
    target: '.qz-order-side'
  },
  {
    title: 'Always check the stage first',
    text: 'An order opens on Overview, and this timeline shows exactly where the file stands. Confirm it here before you tell anyone anything about the file.',
    target: '.qz-timeline',
    before: () => qzNavGo('overview')
  },
  {
    title: 'Chat, tasks, help and notes',
    text: 'This panel follows whatever page you are on. Notes is the one that saves: it is where you record what you did and what you are waiting on.',
    target: '.qz-order-panel'
  },
  {
    title: 'The course is not part of Qualia',
    text: 'Everything up to here was the product. This pill beside the search box is the training, kept visibly separate from the seven sections on purpose. It takes you to your lessons from wherever you are.',
    target: '#qzLessonsBtn'
  },
  {
    title: 'Your lessons, in order',
    text: 'Each card is a lesson. Complete every step, real actions in the UI, "what should I do?" scenarios, and document verification, to unlock the next one.',
    target: '.qz-lesson-grid',
    before: () => qzGoto('dashboard')
  },
  {
    title: "You're ready",
    text: 'That is the tour. Start with Lesson 1 and work through them in order. The Lessons pill brings you back here at any time.',
    target: null
  }
];

let qzTourIndex = 0;

function qzTourStart() {
  qzTourIndex = 0;
  const box = document.getElementById('qzTourOptOut');
  if (box) box.checked = !!qzStore.tourOptOut;
  document.getElementById('qzTour').classList.add('open');
  qzTourShow(0);
}

/* "Don't show this again", which is not the same answer as Skip: Skip means not now and the
   tour comes back on the next launch, this one silences it for good. Saved the moment it is
   ticked rather than on exit, so closing the tab straight after still honours it. */
function qzTourSetOptOut(on) {
  qzStore.tourOptOut = !!on;
  qzSave();
}
/* `dir` is the direction of travel, so a skipped step is stepped over the way the trainee
   was already moving rather than always forwards. */
function qzTourShow(i, dir) {
  dir = dir || 1;
  const step = QZ_TOUR_STEPS[i];
  if (!step) { qzTourEnd(); return; }
  if (step.before) step.before();
  /* A step whose target no longer resolves is skipped, not spotlighted at nothing: the
     no-target branch of qzTourPosition draws a 2px hole in the middle of the screen with a
     tip floating beside it, which reads as a broken overlay rather than a missing step. The
     `before` hook above has already run, so the view it opens is in the DOM by now and this
     only fires on a selector that genuinely drifted. AppFolio carries the same guard. */
  if (step.target && !document.querySelector(step.target)) {
    const next = i + dir;
    if (next < 0 || next >= QZ_TOUR_STEPS.length) { qzTourEnd(); return; }
    qzTourIndex = next;
    qzTourShow(next, dir);
    return;
  }
  document.getElementById('qzTourTipBody').innerHTML = `<b>${esc(step.title)}</b><p>${esc(step.text)}</p>`;
  document.getElementById('qzTourProgress').textContent = (i + 1) + ' / ' + QZ_TOUR_STEPS.length;
  document.getElementById('qzTourBackBtn').style.visibility = i === 0 ? 'hidden' : 'visible';
  document.getElementById('qzTourNextBtn').textContent = i === QZ_TOUR_STEPS.length - 1 ? 'Finish' : 'Next';
  /* preventScroll because the tip is position:fixed: without it the browser scrolls the
     page to "reveal" a button that never moved, which drags the spotlighted element away. */
  const nextBtn = document.getElementById('qzTourNextBtn');
  if (nextBtn) nextBtn.focus({ preventScroll: true });
  requestAnimationFrame(() => requestAnimationFrame(() => qzTourPosition(step)));
}
function qzTourPosition(step) {
  const highlight = document.getElementById('qzTourHighlight');
  const tip = document.getElementById('qzTourTip');
  const el = step.target ? document.querySelector(step.target) : null;
  let rect = el ? el.getBoundingClientRect() : null;

  /* The highlight and the tip are both position:fixed, so a target sitting below the fold
     would be measured off-screen and the spotlight drawn outside the window — the trainee
     sees a tip pointing at nothing. Scroll it in first, and only when it is actually out of
     view, so a target already on screen never jumps. Anything taller than the viewport is
     aligned to its top instead of its centre, which would push its top edge out of sight.
     'auto' rather than smooth: a scroll still animating would be measured mid-flight. */
  if (rect && (rect.top < 0 || rect.bottom > window.innerHeight)) {
    const tallerThanViewport = rect.height > window.innerHeight - 40;
    el.scrollIntoView({ block: tallerThanViewport ? 'start' : 'center', inline: 'nearest', behavior: 'auto' });
    rect = el.getBoundingClientRect();
  }

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
  qzTourShow(qzTourIndex, 1);
}
function qzTourBack() {
  if (qzTourIndex === 0) return;
  qzTourIndex--;
  qzTourShow(qzTourIndex, -1);
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

/* The overlay swallows every click underneath it, so while it is open the keyboard is the
   only other way through. Enter and Space are left alone: Next holds focus, so the browser
   already fires it natively, and intercepting them here would double-advance. */
document.addEventListener('keydown', (e) => {
  const tourEl = document.getElementById('qzTour');
  if (!tourEl || !tourEl.classList.contains('open')) return;
  if (e.key === 'Escape') { e.preventDefault(); qzTourSkip(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); qzTourNext(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); qzTourBack(); }
});
