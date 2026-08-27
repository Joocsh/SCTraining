/* DocuSign VA Training Simulator — Guided Tour.
   Spotlights real UI elements in the 2026 DocuSign interface.
   Shown once on first visit; resets when training progress is cleared. */

const DS_TOUR_STEPS = [
  {
    title: 'Welcome to the DocuSign VA Training Simulator',
    text: 'This interactive simulator lets you practice sending, correcting, and managing DocuSign agreements in a safe sandbox. It takes about a minute — skip at any time.',
    target: null,
    before: () => dsGoto('dashboard')
  },
  {
    title: 'DocuSign eSignature top bar',
    text: 'Matches the real DocuSign header: core navigation (Home, Agreements, Templates, Reports, Admin), help center, your profile avatar, and direct access to your Training curriculum.',
    target: '.ds-topbar'
  },
  {
    title: 'Home dashboard & quick actions',
    text: 'Your daily hub with quick-start action pills: Start, Get Signatures, Sign Document, or Use Envelope Template, plus guides for agreement management.',
    target: '.ds-home-hero',
    before: () => dsGoto('dashboard')
  },
  {
    title: 'Left sidebar — your main workspace',
    text: 'In Agreements, the sidebar gives you quick access to your Envelopes (Inbox, Sent, Completed, Action Required), Show More quick views (Drafts, Waiting for Others, Deleted, Bulk Send), Folders, and PowerForms.',
    target: '.ds-sidebar',
    before: () => dsGoto('envelopes')
  },
  {
    title: 'The Start Now button — send envelopes',
    text: 'Click this primary button at any time to launch the envelope wizard: upload documents, configure recipient roles and signing order, place signature tags, and send.',
    target: '.ds-new-btn',
    before: () => dsGoto('envelopes')
  },
  {
    title: 'Agreements — envelope queue & filters',
    text: 'Search agreements in real time, filter by date (Last 6 Months), status (Completed, Declined, In progress, Voided), or sender, and clear filters with one click.',
    target: '.ds-filterbar',
    before: () => dsGoto('envelopes')
  },
  {
    title: 'Envelope actions & row menu',
    text: 'Click any row to open full agreement details, or use the menu (···) for instant actions: Send Reminder, Correct signer email, Void with mandatory reason, History, and Download PDF.',
    target: '.ds-agr-tbl',
    before: () => dsGoto('envelopes')
  },
  {
    title: 'Templates — work smarter',
    text: 'Reusable templates for Purchase Packages, Listing Agreements, and NDAs. One click on "Use" automatically populates documents, recipient roles, and signature fields.',
    target: '.ds-tpl-grid',
    before: () => dsGoto('templates')
  },
  {
    title: 'Training curriculum & final exam',
    text: 'Access 10 hands-on guided lessons and the timed Final Exam from the sidebar or top bar at any time. Your course progress and grades are automatically saved.',
    target: '#dsSbTraining'
  },
  {
    title: "You're ready to practice",
    text: 'Explore the sandbox freely or open Lesson 1 on the Training panel to start the guided curriculum. Have fun!',
    target: null,
    before: () => dsGoto('dashboard')
  }
];

let dsTourIndex = 0;

function dsTourKeyHandler(e) {
  if (e.key === 'Escape') {
    dsTourEnd();
  } else if (e.key === 'ArrowRight') {
    dsTourNext();
  } else if (e.key === 'ArrowLeft') {
    dsTourBack();
  }
}

function dsTourStart() {
  dsTourIndex = 0;
  const tourEl = document.getElementById('dsTour');
  if (!tourEl) return;
  tourEl.classList.add('open');
  document.removeEventListener('keydown', dsTourKeyHandler);
  document.addEventListener('keydown', dsTourKeyHandler);
  dsTourShow(0);
}

function dsTourShow(i) {
  const step = DS_TOUR_STEPS[i];
  if (!step) return;
  if (typeof step.before === 'function') {
    try { step.before(); } catch (e) {}
  }

  const tipBody = document.getElementById('dsTourTipBody');
  const progEl = document.getElementById('dsTourProgress');
  const backBtn = document.getElementById('dsTourBackBtn');
  const nextBtn = document.getElementById('dsTourNextBtn');

  if (tipBody) {
    tipBody.innerHTML = '<b>' + esc(step.title) + '</b><p>' + esc(step.text) + '</p>';
  }
  if (progEl) {
    progEl.textContent = (i + 1) + ' / ' + DS_TOUR_STEPS.length;
  }
  if (backBtn) {
    backBtn.style.visibility = i === 0 ? 'hidden' : 'visible';
  }
  if (nextBtn) {
    nextBtn.textContent = i === DS_TOUR_STEPS.length - 1 ? 'Finish' : 'Next';
  }

  const el = step.target ? document.querySelector(step.target) : null;
  if (el && typeof el.scrollIntoView === 'function') {
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' }); } catch (e) {}
  }

  requestAnimationFrame(() => requestAnimationFrame(() => dsTourPosition(step)));
}

function dsTourPosition(step) {
  const highlight = document.getElementById('dsTourHighlight');
  const tip       = document.getElementById('dsTourTip');
  if (!highlight || !tip) return;

  const el   = step && step.target ? document.querySelector(step.target) : null;
  const rect = el ? el.getBoundingClientRect() : null;

  if (rect && rect.width > 0 && rect.height > 0) {
    const pad = 8;
    const margin = 14;
    const t = Math.max(margin, rect.top - pad);
    const l = Math.max(margin, rect.left - pad);
    const b = Math.min(window.innerHeight - margin, rect.bottom + pad);
    const r = Math.min(window.innerWidth - margin, rect.right + pad);

    highlight.style.top          = t + 'px';
    highlight.style.left         = l + 'px';
    highlight.style.width        = Math.max(0, r - l) + 'px';
    highlight.style.height       = Math.max(0, b - t) + 'px';
    highlight.style.borderRadius = '8px';

    const tipW = 340;
    const tipH = tip.offsetHeight || 190;
    let top = b + margin;
    if (top + tipH > window.innerHeight - margin) {
      top = t - margin - tipH;
      if (top < margin) {
        top = Math.max(margin, window.innerHeight - tipH - margin);
      }
    }
    const left = Math.min(
      Math.max(margin, rect.left),
      Math.max(margin, window.innerWidth - tipW - margin)
    );

    tip.style.top       = top  + 'px';
    tip.style.left      = left + 'px';
    tip.style.transform = 'none';
  } else {
    /* Centered — no target */
    highlight.style.top          = (window.innerHeight / 2 - 1) + 'px';
    highlight.style.left         = (window.innerWidth  / 2 - 1) + 'px';
    highlight.style.width        = '2px';
    highlight.style.height       = '2px';
    highlight.style.borderRadius = '50%';
    tip.style.top                = '50%';
    tip.style.left               = '50%';
    tip.style.transform          = 'translate(-50%, -50%)';
  }
}

function dsTourNext() {
  if (dsTourIndex >= DS_TOUR_STEPS.length - 1) {
    dsTourEnd();
    return;
  }
  dsTourIndex++;
  dsTourShow(dsTourIndex);
}

function dsTourBack() {
  if (dsTourIndex === 0) return;
  dsTourIndex--;
  dsTourShow(dsTourIndex);
}

function dsTourSkip() {
  dsTourEnd();
}

function dsTourEnd() {
  const tourEl = document.getElementById('dsTour');
  if (tourEl) tourEl.classList.remove('open');
  document.removeEventListener('keydown', dsTourKeyHandler);
  dsStore.tourSeen = true;
  dsSave();
}

window.addEventListener('resize', () => {
  const tourEl = document.getElementById('dsTour');
  if (tourEl && tourEl.classList.contains('open')) {
    dsTourPosition(DS_TOUR_STEPS[dsTourIndex]);
  }
});
