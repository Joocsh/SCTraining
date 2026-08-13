/* ============================================================
   SHARED GUIDED TOUR ENGINE
   Spotlights real UI elements on first visit to a test drive.

   A page supplies only its steps; this file owns the mechanics
   and injects its own overlay markup, so nothing has to be
   pasted into the page HTML.

     SCTour.create({
       key:   'sc_tour_fub',        // localStorage flag
       steps: [ {title, text, target, before}, ... ],
       auto:  true                  // open on load if not seen yet
     });

   A step's `target` is any CSS selector. Omit it (or pass null)
   for a centered card with no spotlight. `before` runs before the
   step is measured, so it can switch views first.

   Returns a controller: start(), end(), seen(), reset().
   ============================================================ */
(function (window, document) {
  'use strict';

  var OPEN_DELAY = 450;   // let the page finish its first render
  var TIP_WIDTH  = 330;
  var PAD        = 8;
  var MARGIN     = 14;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function create(cfg) {
    var steps = (cfg && cfg.steps) || [];
    var key   = (cfg && cfg.key) || 'sc_tour';
    if (!steps.length) return null;

    var index = 0;
    var shown = 0;
    var root, highlight, tip, body, progress, backBtn, nextBtn;

    function seen() {
      try { return localStorage.getItem(key) === '1'; } catch (e) { return false; }
    }
    function markSeen() {
      try { localStorage.setItem(key, '1'); } catch (e) {}
    }
    function reset() {
      try { localStorage.removeItem(key); } catch (e) {}
    }

    function build() {
      if (root) return;
      root = document.createElement('div');
      root.className = 'sc-tour';
      root.innerHTML =
        '<div class="sc-tour-highlight"></div>' +
        '<div class="sc-tour-tip" role="dialog" aria-modal="true">' +
          '<div class="sc-tour-tip-body"></div>' +
          '<div class="sc-tour-tip-foot">' +
            '<span class="sc-tour-progress"></span>' +
            '<div class="sc-tour-tip-btns">' +
              '<button type="button" data-act="skip">Skip</button>' +
              '<button type="button" data-act="back">Back</button>' +
              '<button type="button" class="primary" data-act="next">Next</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(root);

      highlight = root.querySelector('.sc-tour-highlight');
      tip       = root.querySelector('.sc-tour-tip');
      body      = root.querySelector('.sc-tour-tip-body');
      progress  = root.querySelector('.sc-tour-progress');
      backBtn   = root.querySelector('[data-act="back"]');
      nextBtn   = root.querySelector('[data-act="next"]');

      root.addEventListener('click', function (e) {
        var act = e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'skip') end();
        else if (act === 'back') back();
        else if (act === 'next') next();
      });
    }

    /* A step that names a target it cannot find would otherwise render as a
       centered card describing something the associate cannot see. That happens
       for real: these pages are responsive, and elements like FollowUpBoss's
       left rail are display:none on narrow viewports. Run `before` first (it may
       be what reveals the target), then skip the step if the target still is not
       on screen. Steps with no target are deliberate centered cards and always
       show. `dir` is +1 when moving forward, -1 when moving back. */
    function visible(sel) {
      var el = document.querySelector(sel);
      if (!el) return false;
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }

    function show(i, dir) {
      dir = dir || 1;
      var step = steps[i];
      if (!step) return;
      if (typeof step.before === 'function') {
        try { step.before(); } catch (e) {}
      }
      if (step.target && !visible(step.target)) {
        var j = i + dir;
        if (j >= 0 && j < steps.length) { index = j; show(j, dir); return; }
        if (dir > 0) { end(); return; }   // nothing viable ahead: close
        // nothing viable behind: stay put and show this one anyway
      }
      // Count steps actually shown rather than the raw index, so skipping a
      // hidden target does not make the counter jump (3 / 9 straight to 5 / 9).
      shown = Math.max(1, dir > 0 ? shown + 1 : shown - 1);

      body.innerHTML = '<b>' + esc(step.title) + '</b><p>' + esc(step.text) + '</p>';
      progress.textContent = shown + ' / ' + steps.length;
      backBtn.style.visibility = i === 0 ? 'hidden' : 'visible';
      nextBtn.textContent = i === steps.length - 1 ? 'Finish' : 'Next';

      var el = step.target ? document.querySelector(step.target) : null;
      if (el && el.scrollIntoView) {
        try { el.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (e) {}
      }
      // two frames: let `before` re-render and the scroll settle before measuring
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { position(step); });
      });
    }

    function position(step) {
      if (!root) return;
      var el   = step && step.target ? document.querySelector(step.target) : null;
      var rect = el ? el.getBoundingClientRect() : null;

      if (rect && rect.width > 0 && rect.height > 0) {
        // Clip the spotlight to what is actually on screen. An element taller than
        // the viewport would otherwise light a box running off both edges, which
        // reads as no spotlight at all.
        var t = Math.max(MARGIN, rect.top - PAD);
        var l = Math.max(MARGIN, rect.left - PAD);
        var b = Math.min(window.innerHeight - MARGIN, rect.bottom + PAD);
        var r = Math.min(window.innerWidth - MARGIN, rect.right + PAD);

        highlight.style.top          = t + 'px';
        highlight.style.left         = l + 'px';
        highlight.style.width        = Math.max(0, r - l) + 'px';
        highlight.style.height       = Math.max(0, b - t) + 'px';
        highlight.style.borderRadius = '8px';

        var tipH = tip.offsetHeight || 190;
        var top  = b + MARGIN;
        if (top + tipH > window.innerHeight - MARGIN) {
          top = t - MARGIN - tipH;                       // above the spotlight
          if (top < MARGIN) {                            // no room either side:
            top = window.innerHeight - tipH - MARGIN;    // pin to the bottom edge
          }
        }
        var left = Math.min(
          Math.max(MARGIN, rect.left),
          Math.max(MARGIN, window.innerWidth - TIP_WIDTH - MARGIN)
        );
        tip.style.top       = top + 'px';
        tip.style.left      = left + 'px';
        tip.style.transform = 'none';
      } else {
        // centered card, pinhole spotlight
        highlight.style.top          = (window.innerHeight / 2 - 1) + 'px';
        highlight.style.left         = (window.innerWidth / 2 - 1) + 'px';
        highlight.style.width        = '2px';
        highlight.style.height       = '2px';
        highlight.style.borderRadius = '50%';
        tip.style.top       = '50%';
        tip.style.left      = '50%';
        tip.style.transform = 'translate(-50%, -50%)';
      }
    }

    function start() {
      build();
      index = 0;
      shown = 0;
      root.classList.add('open');
      document.addEventListener('keydown', onKey);
      show(0, 1);
    }
    function next() {
      if (index >= steps.length - 1) { end(); return; }
      index++; show(index, 1);
    }
    function back() {
      if (index === 0) return;
      index--; show(index, -1);
    }
    function end() {
      if (root) root.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      markSeen();
    }

    function onKey(e) {
      if (e.key === 'Escape') { end(); }
      else if (e.key === 'ArrowRight') { next(); }
      else if (e.key === 'ArrowLeft') { back(); }
    }

    window.addEventListener('resize', function () {
      if (root && root.classList.contains('open')) position(steps[index]);
    });

    if (cfg.auto !== false && !seen()) {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(start, OPEN_DELAY);
      } else {
        window.addEventListener('DOMContentLoaded', function () {
          setTimeout(start, OPEN_DELAY);
        });
      }
    }

    return { start: start, end: end, seen: seen, reset: reset };
  }

  window.SCTour = { create: create };
})(window, document);
