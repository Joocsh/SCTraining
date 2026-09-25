/* ══════════════════════════════════════════════════════════
   SkillCloud Academy · Home
   Reveal on scroll, the simulation carousel (arrows, tabs, keys and
   swipe, never automatic) and the old #test-drive-open links.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── reveal on scroll ── */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !calm) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── simulation carousel ── */
  var car = document.getElementById('simCarousel');
  if (car) {
    var slides = [].slice.call(car.querySelectorAll('.slide'));
    var tabs = [].slice.call(document.querySelectorAll('.car-tab'));
    var count = document.getElementById('simCount');
    var cur = 0;

    function go(i, dir) {
      var n = slides.length;
      i = (i + n) % n;
      if (i === cur) return;
      dir = dir || (i > cur ? 1 : -1);
      var next = slides[i];
      next.style.setProperty('--from', (dir > 0 ? 28 : -28) + 'px');
      slides[cur].classList.remove('on');
      slides[cur].setAttribute('aria-hidden', 'true');
      next.classList.add('on');
      next.removeAttribute('aria-hidden');
      tabs.forEach(function (t, k) { t.classList.toggle('on', k === i); t.setAttribute('aria-selected', k === i); });
      if (count) count.innerHTML = '<b>' + (i + 1) + '</b> of ' + n;
      cur = i;
    }

    /* a link like index.html#sim-pm opens the carousel on that role */
    var m = /^#sim-([a-z]+)$/.exec(location.hash);
    if (m) {
      var at = slides.map(function (s) { return s.getAttribute('data-role'); }).indexOf(m[1]);
      if (at > 0) go(at, 1);
      document.getElementById('simulations').scrollIntoView();
    }

    car.querySelector('.car-arrow.prev').addEventListener('click', function () { go(cur - 1, -1); });
    car.querySelector('.car-arrow.next').addEventListener('click', function () { go(cur + 1, 1); });
    tabs.forEach(function (t, k) { t.addEventListener('click', function () { go(k); }); });
    car.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1, -1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1, 1); }
    });

    /* swipe on touch screens */
    var x0 = null;
    car.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    car.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 44) go(dx < 0 ? cur + 1 : cur - 1, dx < 0 ? 1 : -1);
      x0 = null;
    });

    /* the halo answers the cursor; the photo stays still */
    var stage = car.querySelector('.car-stage');
    if (!calm && window.matchMedia('(hover: hover)').matches) {
      var raf = 0;
      car.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        var mx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2));
        var my = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - .5) * 2));
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          stage.style.setProperty('--mx', mx.toFixed(3));
          stage.style.setProperty('--my', my.toFixed(3));
        });
      });
      car.addEventListener('pointerleave', function () {
        stage.style.setProperty('--mx', 0);
        stage.style.setProperty('--my', 0);
      });
    }
  }

  /* ── older pages link to #test-drive-open; the apps now sit on the page ── */
  if (location.hash === '#test-drive-open') {
    var td = document.getElementById('test-drive');
    if (td) {
      td.scrollIntoView();
      td.classList.add('flash');
      setTimeout(function () { td.classList.remove('flash'); }, 1600);
    }
  }
})();
