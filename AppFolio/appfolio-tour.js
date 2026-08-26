/* ============================================================================
   APPFOLIO SIMULATOR — GUIDED TOUR
   ============================================================================

   A one-time orientation to the shell, shown on a first visit. It is not the
   course: it teaches where things are, not how to do the job. The course is
   AF_LESSONS and it runs through SimEngine's walkthrough overlay.

   It is kept deliberately short. The single most useful thing it can say is the
   one thing nothing else on screen explains: that there are two modes, and that
   only one of them counts.

   tourSeen lives in afStore rather than afDemo, because "I have already seen
   the tour" is a fact about the person, not about the sandbox. It is the one
   entry in that store that is not a graded answer, and it is there because a
   tour that replays on every reload is worse than no tour.
   ============================================================================ */

const AF_TOUR_STEPS = [
  {
    target: '#afModeSwitch',
    title: 'Two modes, one application',
    text: 'Sandbox is yours to break: nothing you do counts towards the course. Lesson mode grades your work. Opening a lesson switches you over automatically, so you will never be scored by accident.'
  },
  {
    target: '#afSidebar',
    title: 'The portfolio',
    text: 'Every section lives in this left rail, the way it does in AppFolio. Properties hold units, and the unit is the centre of everything — occupied or vacant, it is what leases, work orders and money all hang off.'
  },
  {
    target: '[data-section="accounting"]',
    title: 'Three kinds of money',
    text: 'Operating funds are the company&rsquo;s. Trust funds belong to owners. Deposits belong to residents. Keeping those apart is most of what property management accounting is.'
  },
  {
    target: '[data-section="lessons"]',
    title: 'The course lives here',
    text: 'Lessons unlock in order and each one ends in the product, doing the real thing. You can leave a lesson at any point and come back to it.'
  }
];

let afTourIndex = 0;

function afTourStart() {
  afTourIndex = 0;
  afTourShow();
}

function afTourShow() {
  const step = AF_TOUR_STEPS[afTourIndex];
  if (!step) return afTourEnd();

  const overlay = document.getElementById('afTour');
  const tip = document.getElementById('afTourTip');
  const ring = document.getElementById('afTourRing');
  if (!overlay || !tip || !ring) return;

  const el = document.querySelector(step.target);
  overlay.hidden = false;

  /* A step whose target is missing is skipped rather than pointed at nothing —
     the same failure the other two modules hit when a selector drifted. */
  if (!el) { afTourIndex++; return afTourShow(); }

  const r = el.getBoundingClientRect();
  ring.style.top = (r.top - 6) + 'px';
  ring.style.left = (r.left - 6) + 'px';
  ring.style.width = (r.width + 12) + 'px';
  ring.style.height = (r.height + 12) + 'px';

  tip.innerHTML =
    '<h3>' + step.title + '</h3>' +
    '<p>' + step.text + '</p>' +
    '<div class="af-tour-foot">' +
      '<span>' + (afTourIndex + 1) + ' of ' + AF_TOUR_STEPS.length + '</span>' +
      '<div>' +
        '<button type="button" class="af-btn sm" onclick="afTourEnd()">Skip</button>' +
        '<button type="button" class="af-btn sm primary" onclick="afTourNext()">' +
          (afTourIndex === AF_TOUR_STEPS.length - 1 ? 'Done' : 'Next') +
        '</button>' +
      '</div>' +
    '</div>';

  /* Below the target, or above it when there is no room underneath. */
  const below = r.bottom + 14;
  const fits = below + 190 < window.innerHeight;
  tip.style.top = (fits ? below : Math.max(12, r.top - 200)) + 'px';
  tip.style.left = Math.min(Math.max(12, r.left), window.innerWidth - 380) + 'px';
}

function afTourNext() {
  afTourIndex++;
  if (afTourIndex >= AF_TOUR_STEPS.length) return afTourEnd();
  afTourShow();
}

function afTourEnd() {
  const overlay = document.getElementById('afTour');
  if (overlay) overlay.hidden = true;
  if (!afStore.tourSeen) {
    afStore.tourSeen = true;
    afSave();
  }
}

/* First visit only, and never on a stakeholder link — someone being shown the
   product does not need a tour of a course they cannot see. */
document.addEventListener('DOMContentLoaded', function () {
  if (afDemoMode()) return;
  if (afStore.tourSeen) return;
  /* After the first paint, so the targets exist to be measured. */
  requestAnimationFrame(function () { requestAnimationFrame(afTourStart); });
});

window.addEventListener('resize', function () {
  const overlay = document.getElementById('afTour');
  if (overlay && !overlay.hidden) afTourShow();
});
