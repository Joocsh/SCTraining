/* ============================================================================
   sim-engine.js — shared lesson/walkthrough engine for the training simulators.

   Extracted from Quialia/qualia-app.js, where it was written first and proved out
   across 14 lessons. Nothing in here knows anything about title/escrow or about
   e-signature: it operates on a lesson array, a per-step `walk` block, and CSS
   selectors. Everything module-specific arrives through SimEngine.init().

   WHY A REGISTRY INSTEAD OF GLOBALS
   The original engine read QZ_LESSONS, qzStore, qzState and called qzRenderRoot()
   directly. That is fine with one consumer and impossible with two. Rather than
   parameterising every function, the module holds one config object and reads it
   through small accessors — call sites stay as readable as they were, and a second
   consumer costs one init() call instead of a fork.

   WHAT THE HOST MUST PROVIDE (see SimEngine.init below for the full contract):
     - the lesson data and a resolver for "is this step done?"
     - render/navigate callbacks, because only the host knows its own view layer
     - DOM: the overlay markup, a toast host, and the document modal (simMarkupHTML()
       returns all three so a host can inject them instead of hand-copying)

   NAMING: everything public is prefixed `sim`. Inline onclick handlers in generated
   HTML call the window-level aliases at the bottom of this file, because the markup
   is injected as strings and cannot close over module scope.
   ============================================================================ */
(function (global) {
  'use strict';

  /* ---------- config ---------- */
  var cfg = null;

  /* Defaults keep the contract small: a host that has no search box to unlock, or no
     scrolling container other than the window, simply omits those hooks. */
  var DEFAULTS = {
    /* Was this lesson ever finished, regardless of what its items say right now? Gating reads
       this, not live progress, so restarting a lesson to replay it can never re-lock the ones
       after it — and neither can a shared item being cleared by a different lesson's restart. */
    lessonEverComplete: function () { return false; },
    noteLessonComplete: function () {},
    /* Host-supplied: clears a lesson's own progress and undoes whatever world state its steps
       changed. Absent means the module does not offer restarting. */
    resetLesson: null,
    lessons: [],
    store: function () { return {}; },
    save: function () { },
    render: function () { },
    navigate: function () { },
    stepDone: function () { return false; },
    stepLabel: function (step) { return step.type || ''; },
    stepStatus: function (step) { return SimEngine.stepDone(step) ? 'good' : 'pending'; },
    goHome: function () { },
    showLesson: function () { },
    /* Types whose page renders its own explanation + "Continue" control. The walkthrough
       must NOT auto-advance past those, or the trainee is yanked away before reading it. */
    selfFeedbackTypes: ['decide', 'verify', 'reconcile', 'compose'],
    feedbackSelector: '.sim-feedback',
    /* Called at the start of every step, before setup(). Hosts use it to undo any
       per-step UI lockdown (Qualia disables its search box during one step). */
    beforeStep: function () { },
    btnClass: 'sim-btn'
  };

  function get(key) { return (cfg && cfg[key] !== undefined) ? cfg[key] : DEFAULTS[key]; }
  function lessons() { return get('lessons') || []; }
  function store() { return get('store')(); }

  /* ---------- escaping ---------- */
  /* esc() deliberately does NOT escape quotes: it is for text nodes, and leaving them
     alone keeps apostrophes readable in the generated markup. Anything interpolated
     into an ATTRIBUTE must use escAttr instead.
     NOTE: esc() escapes '&', so HTML entities written into lesson copy ("&mdash;")
     render literally. Use real Unicode characters in lesson text. */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }
  function escAttr(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- non-blocking toast (replaces alert()) ---------- */
  /* textContent, not innerHTML — so callers must NOT pre-escape the message, or the
     user sees a literal "&amp;". */
  function simToast(msg, opts) {
    var host = document.getElementById('simToastHost');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'sim-toast' + (opts && opts.tone ? ' ' + opts.tone : '');
    el.textContent = msg;
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    var duration = (opts && opts.duration) || 3200;
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 250);
    }, duration);
  }

  /* ---------- document modal ---------- */
  /* srcdoc has to go before src is touched. Per the HTML spec an iframe that carries a
     srcdoc attribute navigates to that attribute and ignores src entirely, so a host that
     had previously written frame.srcdoc (the DocuSign module does exactly that for its
     generated documents) left every later viewDoc call painting the PREVIOUS document —
     library files, phishing samples and certificates all silently served stale content for
     the rest of the session. Clearing it first is what makes src authoritative again. */
  function simViewDoc(file, title, hint) {
    var frame = document.getElementById('simDocFrame');
    var t = document.getElementById('simDocModalTitle');
    var h = document.getElementById('simDocModalHint');
    if (!frame) return;
    frame.removeAttribute('srcdoc');
    frame.src = file;
    if (t) t.textContent = title || 'Document';
    if (h) h.textContent = hint || '📖 Review the document details. When finished, click "Done Reading" to return to the exercise.';
    document.getElementById('simDocModal').classList.add('open');
  }
  function simCloseDoc() {
    var m = document.getElementById('simDocModal');
    if (m) m.classList.remove('open');
    var frame = document.getElementById('simDocFrame');
    /* Same reason as simViewDoc: without dropping srcdoc the frame keeps rendering the last
       generated document behind a closed modal, and the next open inherits it. */
    if (frame) { frame.removeAttribute('srcdoc'); frame.src = 'about:blank'; }
    /* Closing the modal needs a full resync, not just a reposition. While it was open the
       step's target resolved to null and its text resolved to the "read it, then close it"
       variant, so repositioning alone leaves that stale sentence on screen next to a
       highlight that has moved on. Three things, in this order:
         1. render  — the host rebuilds the panel; measuring before this hits nodes that are
                      about to be replaced, which is what made the card look frozen.
         2. tip     — re-resolve the step's text against the now-closed state.
         3. position with scrollIntoView — the target is usually well below the fold after a
                      document has been read, and a plain reposition deliberately never
                      scrolls (it must not fight the trainee's own scrolling on resize), so
                      without this the trainee has to hunt for the highlight by hand. */
    get('render')();
    var step = simWalkActive() ? simWalkCurrentStep() : null;
    if (step) {
      simWalkRenderTip(step, false);
      simWalkPosition(step, { scrollIntoView: true });
    }
  }
  function simDocOpen() {
    var m = document.getElementById('simDocModal');
    return !!(m && m.classList.contains('open'));
  }

  /* ---------- lesson gating (always derived, never stored) ---------- */
  function simLessonStepDone(step) { return !!get('stepDone')(step); }
  function simLessonProgress(lesson) {
    var total = lesson.steps.length;
    var done = lesson.steps.filter(simLessonStepDone).length;
    var complete = total > 0 && done === total;
    /* Recorded here rather than at each of the four places a step can complete, so no path can
       finish a lesson without it being noted. The host makes this idempotent. */
    if (complete) get('noteLessonComplete')(lesson.id);
    return { done: done, total: total, complete: complete };
  }
  /* Lock state is recomputed on every render rather than persisted, so it can never
     drift out of sync with the underlying answers. */
  function simLessonState(index) {
    var all = lessons();
    // 'done' tracks live progress so a restarted lesson visibly reopens; unlocking tracks
    // ever-complete so restarting one never takes the rest of the curriculum away.
    if (index === 0) return (simLessonProgress(all[0]).complete || get('lessonEverComplete')(all[0].id)) ? 'done' : 'unlocked';
    var prev = all[index - 1];
    if (!simLessonProgress(prev).complete && !get('lessonEverComplete')(prev.id)) return 'locked';
    return (simLessonProgress(all[index]).complete || get('lessonEverComplete')(all[index].id)) ? 'done' : 'unlocked';
  }
  function simFindLesson(id) {
    var all = lessons();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  var STEP_STATUS_LABEL = { good: 'Done', bad: 'Try again', pending: 'Not yet' };

  function simOpenLesson(id) {
    var all = lessons();
    var idx = -1;
    for (var i = 0; i < all.length; i++) if (all[i].id === id) { idx = i; break; }
    if (idx === -1 || simLessonState(idx) === 'locked') return;
    get('showLesson')(id);
  }
  function simLessonStepGo(lessonId, stepIndex) {
    var l = simFindLesson(lessonId);
    if (!l) return;
    get('navigate')(l.steps[stepIndex]);
  }
  /* Rendered next to a self-feedback step's own explanation once it is answered
     correctly, so there is an explicit way forward instead of "Retake"/"Redo" being
     the only visible control. */
  function simLessonContinueHTML(step, lessonId) {
    var id = lessonId || (cfg && cfg.currentLessonId && cfg.currentLessonId());
    if (!id) return '';
    var l = simFindLesson(id);
    if (!l) return '';
    var idx = l.steps.indexOf(step);
    if (idx === -1) return '';
    var label = idx < l.steps.length - 1 ? 'Continue to next step &rarr;' : 'Finish Lesson &rarr;';
    return '<button class="' + get('btnClass') + ' sm primary" onclick="simLessonContinue(\'' + l.id + '\',' + idx + ')">' + label + '</button>';
  }
  /* If a walkthrough is showing this exact step, skip its own ~1s "nice, moving on"
     pause rather than navigating separately — the trainee already said they are ready
     by clicking. Otherwise navigate directly. */
  function simLessonContinue(lessonId, stepIndex) {
    var l = simFindLesson(lessonId);
    if (!l) return;
    var isLastStep = stepIndex >= l.steps.length - 1;
    if (isLastStep) {
      if (walk && walk.doneTimer) { clearTimeout(walk.doneTimer); walk.doneTimer = null; }
      walk = null;
      var w = document.getElementById('simWalk');
      if (w) w.classList.remove('open');
      var h = document.getElementById('simWalkHighlight');
      if (h) h.classList.remove('on');
      get('noteLessonComplete')(l.id);
      simToast('🎉 Lesson ' + l.number + ' complete! Next lesson unlocked.', { tone: 'good' });
      get('goHome')();
      return;
    }
    if (walk && walk.lessonId === lessonId && walk.stepIndex === stepIndex) {
      simWalkSkipWait();
      return;
    }
    var next = l.steps[stepIndex + 1];
    if (next) get('navigate')(next);
    else get('goHome')();
  }
  /* Two-click confirm rather than confirm(): the first click arms the button and relabels it
     for 3s, a second click within that window actually clears. Restarting discards answers, so
     it must not be reachable by one stray click. Exits any running walkthrough first — it holds
     a step index into progress that is about to disappear underneath it. */
  function simResetLesson(lessonId, btn) {
    var reset = get('resetLesson');
    if (!reset) return;
    if (btn && !btn.dataset.confirming) {
      btn.dataset.confirming = '1';
      btn.dataset.label = btn.textContent;
      btn.textContent = 'Click again to restart';
      btn.dataset.timer = setTimeout(function () {
        btn.textContent = btn.dataset.label;
        delete btn.dataset.confirming;
      }, 3000);
      return;
    }
    if (btn && btn.dataset.timer) clearTimeout(Number(btn.dataset.timer));
    if (simWalkActive()) simWalkExit(true);
    reset(lessonId);
    simOpenLesson(lessonId);
  }
  function simLessonDetailHTML(lessonId) {
    var l = simFindLesson(lessonId);
    if (!l) return '<p>Lesson not found.</p>';
    var prog = simLessonProgress(l);
    /* "Try It" only appears when EVERY step carries a walk block — a partially-walked
       lesson would strand the trainee mid-run with no guidance. Capstone lessons omit
       walk on purpose and therefore never offer it. */
    var walkable = l.steps.every(function (s) { return s.walk; });
    var btn = get('btnClass');
    var rows = l.steps.map(function (step, i) {
      var status = get('stepStatus')(step);
      var goBtn = step.walk ? '' : '<button class="' + btn + ' sm" onclick="simLessonStepGo(\'' + l.id + '\',' + i + ')">Go</button>';
      return '<div class="sim-lesson-step-row">' +
        '<span class="sim-chip ' + status + '">' + STEP_STATUS_LABEL[status] + '</span>' +
        '<span class="label">' + esc(get('stepLabel')(step)) + '</span>' +
        goBtn + '</div>';
    }).join('');
    var tryBtn = (walkable && !prog.complete)
      ? '<button class="' + btn + ' primary sim-try-btn" onclick="simWalkStart(\'' + l.id + '\')">Try It &rarr;</button>'
      : '';
    /* Only offered once there is something to clear, and only if the host implements the reset.
       Progress persists across reloads by design — this is the deliberate way out, for a trainee
       who wants to run a lesson again rather than re-read their old answers. */
    var resetBtn = (prog.done > 0 && get('resetLesson'))
      ? '<button class="' + btn + ' sm sim-reset-btn" onclick="simResetLesson(\'' + l.id + '\', this)">Restart this lesson</button>'
      : '';
    var replayBtn = (prog.complete && walkable)
      ? '<button class="' + btn + ' sm sim-try-btn" onclick="simWalkStart(\'' + l.id + '\')">Replay walkthrough &rarr;</button>'
      : '';
    return '<div class="sim-lesson-detail">' +
      '<h4>Lesson ' + l.number + ' &middot; ' + esc(l.title) + '</h4>' +
      '<p class="sim-lesson-summary">' + esc(l.summary) + '</p>' +
      '<div class="sim-lesson-actions">' + tryBtn + replayBtn + resetBtn + '</div>' +
      '<div class="sim-lesson-steps">' + rows + '</div>' +
      (prog.complete ? '<div class="sim-feedback good"><b>Lesson complete.</b> The next lesson is unlocked from the Dashboard.</div>' : '') +
      '</div>';
  }

  /* ============================================================================
     Interactive lesson walkthrough
     ----------------------------------------------------------------------------
     Unlike a first-run product tour, the app underneath stays fully interactive:
     the overlay is pointer-events:none and only the tip card opts back in. The
     trainee performs the real action while a floating highlight + instruction card
     points at exactly what to do; the host calls SimEngine.stepCompleted() (usually
     from its own checklist-marking function) and the walkthrough advances.

     Content lives on lesson.steps[].walk:
       target      CSS selector | Element | function returning either | null
       text        string | function      (recomputed on every re-render, so a step
                                           can narrate live state as the user types)
       example     string | function      optional collapsible sample answer
       setup       function               puts the app on the right screen
       tour        [{target,text}]        multi-stop mini-tour after the step is done
       pauseText   string | function      single explanatory pause + Continue
       skipClick   bool                   explain instead of requiring a real click
       nextAction  function               what that Next button runs instead
     ============================================================================ */
  var walk = null; // { lessonId, stepIndex, tourIndex, stepDoneFired, doneTimer }

  function simWalkStart(lessonId) {
    var l = simFindLesson(lessonId);
    if (!l || !l.steps.every(function (s) { return s.walk; })) return;
    walk = { lessonId: lessonId, stepIndex: 0, tourIndex: null, stepDoneFired: false };
    simWalkShowCurrent();
  }
  function simWalkCurrentLesson() { return walk ? simFindLesson(walk.lessonId) : null; }
  function simWalkCurrentStep() {
    var l = simWalkCurrentLesson();
    return l ? l.steps[walk.stepIndex] : null;
  }
  function simWalkActive() { return !!walk; }
  function simWalkShowCurrent() {
    document.getElementById('simWalk').classList.add('open');
    walk.tourIndex = null;
    walk.stepDoneFired = false;
    get('beforeStep')();
    var step = simWalkCurrentStep();
    if (!step) { simWalkShowComplete(); return; }
    if (step.walk.setup) step.walk.setup();
    if (step.walk.skipClick) simWalkRenderSkipClick(step); else simWalkRenderTip(step, false);
    /* Double rAF: the first lets the host's re-render commit, the second lets layout
       settle, so getBoundingClientRect() measures the final position rather than an
       element that is about to move. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        simWalkPosition(step, { scrollIntoView: true });
        simWalkFlashActiveTab();
      });
    });
  }
  function simWalkFlashActiveTab() {
    document.querySelectorAll('.qz-nav-item.active, .qz-subtabs span.active, .qz-otab.active').forEach(function (el) {
      el.classList.remove('tab-flash');
      void el.offsetWidth;
      el.classList.add('tab-flash');
      el.addEventListener('animationend', function handler() {
        el.classList.remove('tab-flash');
        el.removeEventListener('animationend', handler);
      });
    });
  }
  /* For a step that is purely explanatory ("this is the Upload button") where nothing
     real would happen if clicked in a simulator: walk.nextAction runs the same underlying
     function a real click would, so any state it changes still happens and later steps
     stay consistent. The real element is still highlighted, just not required. */
  function simWalkRenderSkipClick(step) {
    var l = simWalkCurrentLesson();
    if (!l) return;
    var text = typeof step.walk.text === 'function' ? step.walk.text() : step.walk.text;
    var hasPrev = walk.stepIndex > 0;
    var hasNext = walk.stepIndex < l.steps.length - 1;

    var navHTML = '<div class="sim-walk-stepper-bar">' +
      '<button type="button" class="sim-walk-step-btn prev' + (!hasPrev ? ' disabled' : '') + '" onclick="simWalkBack()" ' + (!hasPrev ? 'disabled' : '') + '>&larr; Prev</button>' +
      '<span class="sim-walk-step-indicator">Step ' + (walk.stepIndex + 1) + ' of ' + l.steps.length + '</span>' +
      '<button type="button" class="sim-walk-step-btn next" onclick="simWalkRunNextAction()">' + (hasNext ? 'Next &rarr;' : 'Finish &#10003;') + '</button>' +
      '</div>' +
      '<div class="sim-walk-exit"><span onclick="simWalkExit()">Exit walkthrough</span></div>';

    simWalkSetTipBody('<b>Lesson ' + l.number + ' &middot; Step ' + (walk.stepIndex + 1) + ' of ' + l.steps.length + '</b><p>' + esc(text) + '</p>' + navHTML);
  }
  function simWalkRunNextAction() {
    var step = simWalkCurrentStep();
    if (!step) return;
    if (step.walk.nextAction) step.walk.nextAction();
    else simWalkAdvance();
  }
  /* Numbered pill buttons per step: clickable at any time so the user can jump to any step */
  function simWalkDotsHTML() {
    var l = simWalkCurrentLesson();
    if (!l) return '';
    var dots = l.steps.map(function (s, i) {
      var isCurrent = i === walk.stepIndex;
      var isDone = simLessonStepDone(s);
      var cls = isCurrent ? 'current' : (isDone ? 'done' : '');
      return '<button type="button" class="sim-walk-dot ' + cls + ' clickable" onclick="simWalkJumpTo(' + i + ')" title="Go to Step ' + (i + 1) + '">' + (i + 1) + '</button>';
    }).join('');
    return '<div class="sim-walk-dots">' + dots + '</div>';
  }
  function simWalkSetTipBody(html) {
    document.getElementById('simWalkTipBody').innerHTML = simWalkDotsHTML() + html;
  }
  function simWalkRenderTip(step, done) {
    var l = simWalkCurrentLesson();
    if (!l) return;
    if (done) {
      simWalkSetTipBody('<b>&#10003; Done!</b><p>Advancing to next step&hellip;</p>');
      return;
    }
    var text = typeof step.walk.text === 'function' ? step.walk.text() : step.walk.text;
    /* Optional, collapsed by default: a step whose target is a free-text field can carry
       its own worked example right in the tip, where the trainee is already looking,
       instead of somewhere on the page that the tip itself usually ends up covering. */
    var example = typeof step.walk.example === 'function' ? step.walk.example() : step.walk.example;
    var exampleHTML = example
      ? '<button type="button" class="sim-walk-example-toggle" id="simWalkExampleToggle" onclick="simWalkToggleExample()">See example &rarr;</button>' +
        '<div class="sim-walk-example" id="simWalkExampleBox" style="display:none">' + esc(example) + '</div>'
      : '';
    var hasPrev = walk.stepIndex > 0;
    var hasNext = walk.stepIndex < l.steps.length - 1;

    var navHTML = '<div class="sim-walk-stepper-bar">' +
      '<button type="button" class="sim-walk-step-btn prev' + (!hasPrev ? ' disabled' : '') + '" onclick="simWalkBack()" ' + (!hasPrev ? 'disabled' : '') + '>&larr; Prev</button>' +
      '<span class="sim-walk-step-indicator">Step ' + (walk.stepIndex + 1) + ' of ' + l.steps.length + '</span>' +
      '<button type="button" class="sim-walk-step-btn next" onclick="' + (hasNext ? 'simWalkAdvance()' : 'simWalkShowComplete()') + '">' + (hasNext ? 'Next &rarr;' : 'Finish &#10003;') + '</button>' +
      '</div>' +
      '<div class="sim-walk-exit"><span onclick="simWalkExit()">Exit walkthrough</span></div>';

    simWalkSetTipBody('<b>Lesson ' + l.number + ' &middot; Step ' + (walk.stepIndex + 1) + ' of ' + l.steps.length + '</b><p>' + esc(text) + '</p>' + exampleHTML + navHTML);
  }
  /* Expanding the example changes the tip's height. Without recomputing position the
     card's top/left stay where they were calculated for the shorter version, letting the
     now-taller card run off the bottom of the viewport. */
  function simWalkToggleExample() {
    var el = document.getElementById('simWalkExampleBox');
    var btn = document.getElementById('simWalkExampleToggle');
    if (!el) return;
    var showing = el.style.display !== 'none';
    el.style.display = showing ? 'none' : 'block';
    if (btn) btn.textContent = showing ? 'See example →' : 'Hide example';
    var step = simWalkCurrentStep();
    if (step) simWalkPosition(step);
  }
  /* Wrong answer: do not advance, do not reveal the answer, just point back at the
     feedback + retry control the page already shows. */
  function simWalkRenderRetry(msg) {
    simWalkSetTipBody('<b>Not quite.</b><p>' + esc(msg || 'Read the explanation below, then try this step again.') + '</p>' +
      '<div class="sim-walk-exit" onclick="simWalkExit()">Exit walkthrough</div>');
    // Same staleness on the wrong-answer path, where the button under the card is "Redo".
    simWalkFocusFeedback();
  }
  /* Steps with no highlight target float their tip in a corner, so nothing was bringing
     the feedback panel — with the button the trainee actually needs to click — into view.
     It could render below the fold with no indication it existed. */
  function simWalkScrollFeedbackIntoView() {
    requestAnimationFrame(function () {
      var el = document.querySelector(get('feedbackSelector'));
      if (el) el.scrollIntoView({ block: 'center', behavior: simScrollBehavior() });
    });
  }
  function simWalkFocusFeedback() {
    requestAnimationFrame(function () {
      var fb = document.querySelector(get('feedbackSelector'));
      if (!fb) { simWalkScrollFeedbackIntoView(); return; }
      var el = fb.querySelector('button:not([disabled]), a[href]') || fb;
      simWalkPosition({ walk: { target: el } }, { scrollIntoView: true });
    });
  }
  /* Smooth auto-advance when a step is satisfied */
  function simWalkStepDone() {
    var step = simWalkCurrentStep();
    if (!step) return;
    if (walk.stepDoneFired) return;
    walk.stepDoneFired = true;
    if (step.walk.tour && step.walk.tour.length) {
      walk.tourIndex = 0;
      simWalkShowTourStop();
      return;
    }
    simWalkRenderTip(step, true);
    walk.doneTimer = setTimeout(function () {
      walk.doneTimer = null;
      simWalkAdvance();
    }, 300);
  }
  function simWalkShowTourStop() {
    var step = simWalkCurrentStep();
    var stops = step.walk.tour;
    var stop = stops[walk.tourIndex];
    var isLast = walk.tourIndex === stops.length - 1;
    var text = typeof stop.text === 'function' ? stop.text() : stop.text;
    var exitLink = '<div class="sim-walk-exit" onclick="simWalkExit()">Exit walkthrough</div>';
    simWalkSetTipBody('<b>' + (walk.tourIndex + 1) + ' of ' + stops.length + '</b><p>' + esc(text) + '</p>' +
      '<button class="' + get('btnClass') + ' primary sim-walk-next" onclick="simWalkTourNext()">' + (isLast ? 'Continue' : 'Next') + ' &rarr;</button>' + exitLink);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { simWalkPosition({ walk: { target: stop.target } }, { scrollIntoView: true }); });
    });
  }
  function simWalkTourNext() {
    var step = simWalkCurrentStep();
    var stops = step.walk.tour;
    if (walk.tourIndex < stops.length - 1) {
      walk.tourIndex++;
      simWalkShowTourStop();
    } else {
      walk.tourIndex = null;
      simWalkAdvance();
    }
  }
  function simWalkAdvance() {
    if (!walk) return; // may have been exited during the pause
    walk.stepIndex++;
    simWalkShowCurrent();
  }
  function simWalkBack() {
    if (!walk || walk.stepIndex <= 0) return;
    walk.stepIndex--;
    simWalkShowCurrent();
  }
  function simWalkJumpTo(index) {
    if (!walk) return;
    var l = simWalkCurrentLesson();
    if (!l || index < 0 || index >= l.steps.length) return;
    if (walk.doneTimer) { clearTimeout(walk.doneTimer); walk.doneTimer = null; }
    walk.stepIndex = index;
    simWalkShowCurrent();
  }
  /* Lets an on-page "Continue" button skip the ~1s pause simWalkStepDone shows before
     advancing, instead of doubling up with the pending timer. */
  function simWalkSkipWait() {
    if (!walk) return;
    if (walk.doneTimer) { clearTimeout(walk.doneTimer); walk.doneTimer = null; }
    simWalkAdvance();
  }
  /* Re-resolves the tip and highlight for the current step. Hosts call this after any
     interaction that changes what the trainee should be looking at next. */
  function simWalkSync(predicate) {
    if (!walk) return;
    var step = simWalkCurrentStep();
    if (!step) return;
    if (predicate && !predicate(step)) return;
    simWalkRenderTip(step, false);
    simWalkPosition(step, { scrollIntoView: true });
  }
  /* Resolves a step's target: a plain CSS selector, a function returning an
     Element/selector/null (for steps where WHAT to highlight changes as the trainee
     acts), or null. Returns null for anything not currently laid out, so a stale
     selector degrades to "float the tip" rather than throwing. */
  function simWalkResolveTarget(target) {
    var t = typeof target === 'function' ? target() : target;
    if (!t) return null;
    if (typeof t === 'string') t = document.querySelector(t);
    return (t && t.getBoundingClientRect && t.offsetParent !== null) ? t : null;
  }
  /* Smooth unless the viewer asked for reduced motion, where an instant jump is both the
     accessible choice and the more reliable one — a smooth scroll that never animates leaves
     the target wherever it was. */
  function simScrollBehavior() {
    return (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches)
      ? 'auto' : 'smooth';
  }
  function simWalkPosition(step, opts) {
    var highlight = document.getElementById('simWalkHighlight');
    var tip = document.getElementById('simWalkTip');
    if (!highlight || !tip) return;
    /* The document modal sits BELOW the walk overlay on purpose, so the tip can float
       above it with a "close it to continue" nudge. That means a highlight pointing
       anywhere else would darken the modal through its own cutout box-shadow, so the
       highlight is suppressed entirely whenever the modal is open. */
    var el = simDocOpen() ? null : simWalkResolveTarget(step.walk.target);
    /* skipClick steps are demonstrative only — the real element stays highlighted for
       reference but must not be clickable, or the trainee triggers the real action
       directly instead of going through Next. */
    if (el && step.walk.skipClick && 'disabled' in el) el.disabled = true;
    /* Only on step transitions, never on resize/scroll repositions — those would fight
       the trainee's own scrolling. */
    if (el && opts && opts.scrollIntoView) {
      /* Smooth unless the viewer asked for reduced motion, where an instant jump is both the
         accessible choice and the more reliable one — a smooth scroll that never animates
         leaves the target wherever it was. */
      el.scrollIntoView({ block: 'center', behavior: simScrollBehavior() });
      /* getBoundingClientRect below reads the PRE-scroll position, because smooth scrolling
         is asynchronous. Re-place the highlight as the scroll settles instead of leaving it
         parked where the target used to be — with Core's tall sidebar that gap is hundreds of
         pixels, and a highlight stranded off-screen dims the whole viewport through its own
         cutout shadow (the "everything went black" failure). Polls until the rect stops
         moving rather than using scrollend, which Safari still lacks. */
      simWalkTrackScroll(step, el);
    }
    var rect = el ? el.getBoundingClientRect() : null;
    tip.style.transform = 'none';
    if (!rect) {
      /* Nothing to point at (the whole page is the content). Float the tip bottom-right
         rather than leaving it stale from the previous step. Bottom, not top: a freshly
         opened question renders its options at the top of the panel, and a top-anchored
         tip would sit on them and silently eat the click, since the tip is the one part
         of the overlay that accepts pointer events. */
      highlight.classList.remove('on');
      tip.classList.remove('pass-through');
      var m = 18;
      tip.style.top = 'auto';
      tip.style.bottom = m + 'px';
      tip.style.left = (global.innerWidth - 300 - m) + 'px';
      return;
    }
    tip.style.bottom = 'auto';
    var pad = 8;
    /* Coming from hidden (a fresh step, or a step that had no target), the highlight still
       carries the previous step's geometry — or none at all, which computes to 0x0. Animating
       from either one sweeps a 9999px-spread shadow across the screen. Suppress the transition
       for that first placement and let it animate only between two already-visible positions. */
    var wasHidden = !highlight.classList.contains('on');
    if (wasHidden) highlight.style.transition = 'none';
    highlight.style.top = (rect.top - pad) + 'px';
    highlight.style.left = (rect.left - pad) + 'px';
    highlight.style.width = (rect.width + pad * 2) + 'px';
    highlight.style.height = (rect.height + pad * 2) + 'px';
    if (wasHidden) {
      void highlight.offsetWidth; // forces the geometry to apply before transitions resume
      highlight.style.transition = '';
    }
    highlight.classList.add('on');

    var tipW = 300, tipH = tip.offsetHeight || 140, margin = 14;
    var left = Math.min(Math.max(margin, rect.left), global.innerWidth - tipW - margin);
    /* Candidate placements in preference order. Below the target reads best, but the tip is the
       one part of this overlay that accepts pointer events, so a placement that lands on a
       control swallows the click on it — which is how the escalation step ended up with its own
       Submit button underneath the card telling the trainee to press it. */
    var below = rect.bottom + pad + margin;
    var above = rect.top - pad - margin - tipH;
    var candidates = [
      { top: below, left: left },
      { top: above, left: left },
      { top: Math.max(margin, rect.top), left: rect.right + pad + margin },
      { top: Math.max(margin, rect.top), left: rect.left - pad - margin - tipW },
      /* Corners, as a fallback when none of the four placements beside the target can be used.
         In a short viewport with a tall panel — a resolved reconcile, whose explanation runs to
         several lines above its Continue button — every target-relative spot is either off the
         bottom or sitting on a control, and the old fallback then parked the card straight over
         the button the tip was telling the trainee to press. A corner loses the visual tie to
         the highlight, which still rings the target, but it never eats the click. */
      { top: global.innerHeight - tipH - margin, left: global.innerWidth - tipW - margin },
      { top: margin, left: global.innerWidth - tipW - margin },
      { top: global.innerHeight - tipH - margin, left: margin },
      { top: margin, left: margin }
    ];
    var chosen = null, firstOnscreen = null;
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (c.top < margin || c.top + tipH > global.innerHeight - margin) continue;
      if (c.left < margin || c.left + tipW > global.innerWidth - margin) continue;
      if (!firstOnscreen) firstOnscreen = c;
      if (!simTipCoversControl(c, tipW, tipH, el)) { chosen = c; break; }
    }
    /* Every placement is blocked, corners included: keep the original below-the-target
       behaviour rather than parking the card somewhere arbitrary — but stop the card from
       intercepting pointer events, so a control underneath it can still be clicked. The card
       is informational; only its own buttons and links need to stay clickable, and the CSS
       for this class opts exactly those back in. Without it the trainee is simply stuck:
       the tip says "click Continue to next step" and the card itself eats the click. */
    tip.classList.toggle('pass-through', !chosen);
    if (!chosen) chosen = firstOnscreen || { top: Math.max(margin, below), left: left };
    tip.style.top = chosen.top + 'px';
    tip.style.left = chosen.left + 'px';
  }
  /* True if a tip placed at `pos` would sit over a button or link that is not part of the
     highlighted target itself (the target is allowed to be covered — it is what the card is
     pointing at, and it is usually already read by then). */
  function simTipCoversControl(pos, w, h, targetEl) {
    var controls = document.querySelectorAll('#simWalk ~ * button, button, a[href], select');
    for (var i = 0; i < controls.length; i++) {
      var c = controls[i];
      if (c.disabled || (targetEl && (c === targetEl || targetEl.contains(c)))) continue;
      if (c.closest && c.closest('#simWalkTip')) continue;
      var r = c.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.bottom < 0 || r.top > global.innerHeight) continue;
      var overlaps = !(r.right < pos.left || r.left > pos.left + w ||
                       r.bottom < pos.top || r.top > pos.top + h);
      if (overlaps) return true;
    }
    return false;
  }
  function simWalkShowComplete() {
    var l = simWalkCurrentLesson();
    document.getElementById('simWalkHighlight').classList.remove('on');
    var tip = document.getElementById('simWalkTip');
    simWalkSetTipBody('<b>&#127881; Lesson ' + l.number + ' complete!</b><p>Great work, you finished every step. The next lesson is unlocked from the Dashboard.</p>' +
      '<button class="' + get('btnClass') + ' primary sim-walk-next" onclick="simWalkBackToLessons()">Back to Lessons</button>');
    tip.style.top = '50%';
    tip.style.bottom = 'auto';
    tip.style.left = '50%';
    tip.style.transform = 'translate(-50%,-50%)';
  }
  function simWalkBackToLessons() {
    walk = null;
    document.getElementById('simWalk').classList.remove('open');
    get('beforeStep')();
    get('goHome')();
  }
  function simWalkExit(silent) {
    var l = simWalkCurrentLesson();
    walk = null;
    var w = document.getElementById('simWalk');
    if (w) w.classList.remove('open');
    get('beforeStep')();
    if (!silent) {
      if (l) get('showLesson')(l.id);
      else get('render')();
    }
  }
  /* Follows a smooth scroll to its end by re-placing the highlight each frame until the
     target's rect stops changing (or ~700ms elapses, so a target that never settles can't
     spin forever). Cancels the previous tracker so two rapid step advances don't fight. */
  var walkScrollRAF = null;
  function simWalkTrackScroll(step, el) {
    if (walkScrollRAF) cancelAnimationFrame(walkScrollRAF);
    /* What this loop is really guarding against is the walkthrough MOVING ON mid-scroll, so it
       watches the lesson step that owns the placement rather than the object it was handed.
       Not every placement is the lesson step itself — a tour stop and the post-resolution
       feedback anchor both pass a synthetic { walk: { target } } — and comparing those against
       simWalkCurrentStep() was never equal, so the tracker gave up on its first tick and left
       the card parked at the pre-scroll rect. For a real step this is the same comparison it
       always was. */
    var owner = simWalkCurrentStep();
    var lastTop = null, stable = 0, started = Date.now();
    var tick = function () {
      walkScrollRAF = null;
      if (!walk || simWalkCurrentStep() !== owner) return;
      var top = el.getBoundingClientRect().top;
      stable = (lastTop !== null && Math.abs(top - lastTop) < 0.5) ? stable + 1 : 0;
      lastTop = top;
      simWalkPosition(step);
      if (stable < 3 && Date.now() - started < 700) walkScrollRAF = requestAnimationFrame(tick);
    };
    walkScrollRAF = requestAnimationFrame(tick);
  }
  function simWalkReposition() {
    if (!walk) return;
    var step = simWalkCurrentStep();
    if (!step) return;
    if (walk.tourIndex != null && step.walk.tour) {
      var stop = step.walk.tour[walk.tourIndex];
      if (stop) simWalkPosition({ walk: { target: stop.target } });
      return;
    }
    simWalkPosition(step);
  }

  /* ---------- DOM the engine owns ----------
     Returned as a string so a host can inject it once at boot instead of every shell
     hand-copying the same markup and drifting from it. */
  function simMarkupHTML() {
    return '' +
      '<div class="sim-toast-host" id="simToastHost"></div>' +
      '<div class="sim-doc-modal" id="simDocModal" onclick="if(event.target===this) simCloseDoc()">' +
      '  <div class="sim-doc-modal-card">' +
      '    <div class="sim-doc-modal-head">' +
      '      <div class="sim-doc-modal-meta">' +
      '        <span class="sim-doc-modal-tag">Source Document</span>' +
      '        <span id="simDocModalTitle" class="sim-doc-modal-title">Document</span>' +
      '      </div>' +
      '      <div class="sim-doc-modal-hint" id="simDocModalHint">📖 Read the document to verify the information. When finished, click &quot;Done Reading&quot;.</div>' +
      '      <div class="sim-doc-modal-actions">' +
      '        <button type="button" class="sim-doc-modal-done-btn" onclick="simCloseDoc()">Done Reading &middot; Return to Exercise &rarr;</button>' +
      '        <button type="button" class="sim-doc-modal-close" onclick="simCloseDoc()" aria-label="Close">&times;</button>' +
      '      </div>' +
      '    </div>' +
      '    <iframe id="simDocFrame" title="Document preview"></iframe>' +
      '  </div>' +
      '</div>' +
      '<div class="sim-walk" id="simWalk">' +
      '  <div class="sim-walk-highlight" id="simWalkHighlight"></div>' +
      '  <div class="sim-walk-tip" id="simWalkTip"><div id="simWalkTipBody"></div></div>' +
      '</div>';
  }
  function simInjectMarkup() {
    if (document.getElementById('simWalk')) return; // already present
    var host = document.createElement('div');
    host.innerHTML = simMarkupHTML();
    while (host.firstChild) document.body.appendChild(host.firstChild);
  }

  /* ---------- init ---------- */
  function init(options) {
    cfg = Object.assign({}, DEFAULTS, options || {});
    simInjectMarkup();
    global.addEventListener('resize', simWalkReposition);
    /* The scrolling container is usually NOT the window (these shells are
       height:100vh/overflow:hidden), and getBoundingClientRect is viewport-relative — without
       this the highlight freezes while the target scrolls away underneath.
       Capture phase on document, rather than a listener bound to one configured selector:
       scroll does not bubble, but it does capture, and the real scrollers here (Core's order
       rail and content panel) are rebuilt by every render, so anything bound to a specific
       node at init time would be pointing at a detached element moments later. */
    document.addEventListener('scroll', simWalkReposition, { capture: true, passive: true });
    return SimEngine;
  }

  global.simResetLesson = simResetLesson;

  var SimEngine = {
    init: init,
    // escaping
    esc: esc, escAttr: escAttr,
    // chrome
    toast: simToast, viewDoc: simViewDoc, closeDoc: simCloseDoc, docOpen: simDocOpen,
    markupHTML: simMarkupHTML,
    // lessons
    findLesson: simFindLesson,
    stepDone: simLessonStepDone,
    progress: simLessonProgress,
    lessonState: simLessonState,
    openLesson: simOpenLesson,
    continueHTML: simLessonContinueHTML,
    lessonDetailHTML: simLessonDetailHTML,
    resetLesson: simResetLesson,
    STEP_STATUS_LABEL: STEP_STATUS_LABEL,
    // walkthrough
    walkStart: simWalkStart,
    walkActive: simWalkActive,
    currentStep: simWalkCurrentStep,
    currentLesson: simWalkCurrentLesson,
    stepCompleted: simWalkStepDone,
    renderRetry: simWalkRenderRetry,
    renderTip: simWalkRenderTip,
    position: simWalkPosition,
    sync: simWalkSync,
    reposition: simWalkReposition,
    exit: simWalkExit,
    scrollFeedbackIntoView: simWalkScrollFeedbackIntoView,
    // introspection, used by hosts that need the raw state (e.g. "is the walkthrough
    // parked on this exact step?" checks)
    walkState: function () { return walk; }
  };

  /* Generated markup uses inline onclick handlers — strings cannot close over module
     scope, so these have to exist on window. */
  global.SimEngine = SimEngine;
  global.simToast = simToast;
  global.simViewDoc = simViewDoc;
  global.simCloseDoc = simCloseDoc;
  global.simWalkStart = simWalkStart;
  global.simWalkExit = simWalkExit;
  global.simWalkBack = simWalkBack;
  global.simWalkJumpTo = simWalkJumpTo;
  global.simWalkAdvance = simWalkAdvance;
  global.simWalkTourNext = simWalkTourNext;
  global.simWalkRunNextAction = simWalkRunNextAction;
  global.simWalkToggleExample = simWalkToggleExample;
  global.simWalkBackToLessons = simWalkBackToLessons;
  global.simLessonContinue = simLessonContinue;
  global.simLessonStepGo = simLessonStepGo;
  global.simOpenLesson = simOpenLesson;
})(window);
