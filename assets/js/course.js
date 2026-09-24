/* ══════════════════════════════════════════════════════════
   SkillCloud course player
   Markup a page provides:
     <header class="scbar">…</header>
     <main class="c-stage" id="stage">
       <section class="lesson" id="…" data-mod="Module 1 · …" data-title="…"
                data-goals="First goal|Second goal"> … </section>
     </main>
   Every lesson may hold .task.gate items (data-type choice | match | sort
   or any custom type the page passes with SCCourse.pass). A lesson that
   holds a .checkpoint runs in two steps: read first, answer after. The
   player moves the checkpoint onto a screen of its own, so nobody reads
   with the questions sitting in the corner of the eye.
   Call SCCourse.init({ id, title, store, certificate, onComplete }).
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var ARROW = '<path d="M5 12h14M13 6l6 6-6 6"/>', CHECK = '<path d="M5 12.5l4.5 4.5L19 7.5"/>';

  var C = { lessons: [], cur: 0, state: null, opts: null, key: '' };

  function save() { try { localStorage.setItem(C.key, JSON.stringify(C.state)); } catch (e) {} }
  function mods() {
    var out = [];
    C.lessons.forEach(function (l, i) {
      var m = l.dataset.mod || '';
      if (!out.length || out[out.length - 1].name !== m) out.push({ name: m, idx: [] });
      out[out.length - 1].idx.push(i);
    });
    return out;
  }
  function gates(i) { return $$('.gate', C.lessons[i]); }
  function passedAll(i) { return gates(i).every(function (g, k) { return C.state.passed[C.lessons[i].id + ':' + k]; }); }
  function isSplit(i) { return C.lessons[i].classList.contains('split'); }
  function reading(i) { return isSplit(i) && !C.lessons[i].classList.contains('quiz'); }

  /* ── read first, answer after ──
     The checkpoint and anything the page puts after it move to a second
     screen inside the same lesson. A lesson with almost nothing to read,
     like a final knowledge check, stays on one screen. */
  function twoSteps() {
    C.lessons.forEach(function (l) {
      var kids = [].slice.call(l.children);
      var cut = kids.map(function (k) { return k.classList.contains('checkpoint'); }).indexOf(true);
      if (cut < 1) return;
      var read = document.createElement('div'); read.className = 'c-read';
      var quiz = document.createElement('div'); quiz.className = 'c-quiz';
      kids.forEach(function (k, i) { (i < cut ? read : quiz).appendChild(k); });
      if ((read.textContent || '').trim().split(/\s+/).length < 70) {
        kids.forEach(function (k) { l.appendChild(k); });
        return;
      }
      var n = $$('.gate', quiz).length;
      read.insertAdjacentHTML('beforeend',
        '<div class="c-step-end"><div><b>Checkpoint</b><span>' +
          (n === 1 ? 'One quick task' : n + ' quick tasks') + ' on what you just read. Retry as often as you need.</span></div>' +
        '<button class="c-btn primary" data-phase="quiz">Go to the checkpoint <span aria-hidden="true">&rarr;</span></button></div>');
      quiz.insertAdjacentHTML('afterbegin',
        '<div class="c-qhead"><button class="c-back" data-phase="read"><span aria-hidden="true">&larr;</span> Back to the lesson</button>' +
        '<div class="c-meta"><span class="c-kick">Checkpoint</span><span class="c-sep"></span><span>' + l.dataset.title + '</span></div></div>');
      quiz.insertAdjacentHTML('beforeend',
        '<div class="c-step-end done"><div><b>Checkpoint complete</b><span>Well done. Your progress is saved.</span></div>' +
        '<button class="c-btn primary" data-advance></button></div>');
      l.appendChild(read); l.appendChild(quiz);
      l.classList.add('split');
    });
  }

  /* ── chrome the player adds around the page's lessons ── */
  function build() {
    var o = C.opts;
    document.body.classList.add('course');
    document.body.insertAdjacentHTML('beforeend',
      '<div class="c-topline"><i id="cTop"></i></div>' +
      '<aside class="c-outline" id="cOutline" aria-label="Course outline"><div class="c-outline-hd"><div class="c-kick">' + (o.kick || 'Course') + '</div><h1>' + o.title + '</h1>' +
        '<div class="c-meter"><div class="c-meter-bar"><i id="cMeter"></i></div><span id="cMeterTxt">0%</span></div></div><nav id="cNav"></nav></aside>' +
      '<div class="c-scrim" id="cScrim"></div>' +
      '<div class="c-hint" id="cHint">Answer the checkpoint to continue</div>' +
      '<button class="c-next" id="cNext" aria-label="Next lesson"><span class="c-tip" id="cTip"></span><svg id="cIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ARROW + '</svg></button>' +
      '<div class="c-toast" id="cToast" role="status"><div class="c-medal">&#9733;</div><div><b id="cToastT"></b><span id="cToastS"></span></div></div>' +
      '<div class="c-cert-wrap" id="cCert" role="dialog" aria-modal="true" aria-label="Certificate"><div class="c-cert"><div class="c-cert-in">' +
        '<svg class="c-cloud" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>' +
        '<small>SkillCloud Academy · Certificate of completion</small><h2>Well done</h2><p>This certifies that</p><div class="c-name" id="cCertName"></div>' +
        '<p>completed the training <span class="c-course">' + o.title + '</span></p><div class="c-date" id="cCertDate"></div></div>' +
        '<div class="c-cert-actions"><button class="c-btn primary" id="cPrint">Print or save as PDF</button><button class="c-btn ghost" id="cClose">Close</button></div></div></div>');

    var bar = $('.scbar');
    if (bar && !$('#cOutlineBtn')) bar.insertAdjacentHTML('afterbegin', '<button class="scbar-act icon c-outline-btn" id="cOutlineBtn" aria-label="Course outline" aria-expanded="false">&#9776;</button>');

    C.lessons.forEach(function (l) {
      if (l.dataset.goals) {
        var anchor = $('.lead', l) || $('h2', l);
        while (anchor && anchor.parentElement !== l) anchor = anchor.parentElement;
        if (anchor) anchor.insertAdjacentHTML('afterend', '<div class="c-goals"><b>In this lesson</b><ul>' + l.dataset.goals.split('|').map(function (g) { return '<li>' + g + '</li>'; }).join('') + '</ul></div>');
      }
    });

    twoSteps();

    var nav = $('#cNav');
    mods().forEach(function (m) {
      if (m.name) nav.insertAdjacentHTML('beforeend', '<div class="c-mod" data-mod="' + m.name + '"><span>' + m.name + '</span><span class="c-badge" title="Module complete">&#9733;</span></div>');
      m.idx.forEach(function (i) {
        var l = C.lessons[i];
        var b = document.createElement('button');
        b.className = 'c-item'; b.dataset.i = i;
        b.innerHTML = '<span class="c-dot">' + (i + 1) + '</span><span>' + l.dataset.title + '</span>';
        b.onclick = function () { go(i); };
        nav.appendChild(b);
        if (!isSplit(i)) return;
        var s = document.createElement('button');
        s.className = 'c-item c-sub'; s.dataset.i = i;
        s.innerHTML = '<span class="c-dot">&#183;</span><span>Checkpoint</span>';
        s.onclick = function () { go(i, 'quiz'); };
        nav.appendChild(s);
      });
    });
  }

  function paint() {
    var s = C.state, L = C.lessons, pct = Math.round(s.done.length / L.length * 100);
    $('#cMeter').style.width = pct + '%';
    $('#cMeterTxt').textContent = pct + '%';
    $('#cTop').style.width = ((C.cur + 1) / L.length * 100) + '%';
    $$('.c-item').forEach(function (b) {
      var i = +b.dataset.i, sub = b.classList.contains('c-sub');
      var d = sub ? passedAll(i) : s.done.indexOf(i) > -1;
      b.classList.toggle('on', i === C.cur && sub !== reading(i));
      b.classList.toggle('done', d);
      $('.c-dot', b).innerHTML = d ? '&#10003;' : (sub ? '&#183;' : (i + 1));
    });
    $$('.c-mod').forEach(function (m) { m.classList.toggle('done', (s.modulesDone || []).indexOf(m.dataset.mod) > -1); });
    $$('.checkpoint', L[C.cur]).forEach(function (cp) {
      var g = $$('.gate', cp), n = g.filter(function (x) { return x.classList.contains('passed'); }).length;
      var st = $('.cp-state', cp);
      if (st) st.textContent = g.length ? n + ' of ' + g.length + ' done' : '';
    });
    var last = C.cur === L.length - 1, read = reading(C.cur);
    L[C.cur].classList.toggle('cleared', passedAll(C.cur));
    $('#cTip').textContent = read ? 'Go to the checkpoint' : (last ? 'Finish training' : 'Next: ' + L[C.cur + 1].dataset.title);
    $('#cIcon').innerHTML = (last && !read) ? CHECK : ARROW;
    $('#cNext').setAttribute('aria-label', read ? 'Go to the checkpoint' : (last ? 'Finish training' : 'Next lesson'));
    var adv = $('[data-advance]', L[C.cur]);
    if (adv) adv.innerHTML = last ? 'Finish the training' : 'Next lesson <span aria-hidden="true">&rarr;</span>';
    reveal();
  }

  function reveal() {
    var end = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60;
    var read = reading(C.cur), open = read || passedAll(C.cur);
    var finished = C.cur === C.lessons.length - 1 && C.state.done.indexOf(C.cur) > -1 && !read;
    $('#cNext').classList.toggle('show', end && open && !finished);
    $('#cHint').classList.toggle('show', end && !open);
  }

  /* move between the two steps of one lesson */
  function setPhase(p) {
    var l = C.lessons[C.cur];
    if (!l.classList.contains('split')) return;
    l.classList.toggle('quiz', p === 'quiz');
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('#cNext').classList.remove('show');
    paint();
    setTimeout(reveal, 320);
  }

  function go(i, phase) {
    i = Math.max(0, Math.min(i, C.lessons.length - 1));
    C.lessons[C.cur].classList.remove('on', 'quiz');
    C.cur = i; C.state.at = i;
    C.lessons[i].classList.add('on');
    C.lessons[i].classList.toggle('quiz', phase === 'quiz' && isSplit(i));
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.body.classList.remove('nav-open');
    var ob = $('#cOutlineBtn'); if (ob) ob.setAttribute('aria-expanded', 'false');
    $('#cNext').classList.remove('show');
    save(); paint();
    var st = $('.c-stage'); if (st) st.focus({ preventScroll: true });
  }

  function toast(t, s) {
    $('#cToastT').textContent = t; $('#cToastS').textContent = s;
    var el = $('#cToast'); el.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  function complete(i) {
    var s = C.state;
    if (s.done.indexOf(i) === -1) s.done.push(i);
    s.modulesDone = s.modulesDone || [];
    mods().forEach(function (m) {
      if (!m.name || /^start$/i.test(m.name) || s.modulesDone.indexOf(m.name) > -1) return;
      if (m.idx.every(function (k) { return s.done.indexOf(k) > -1; })) {
        s.modulesDone.push(m.name);
        toast('Module complete', m.name.replace(/^Module \d+ · /, ''));
      }
    });
    if (s.done.length === C.lessons.length && !s.completedAt) {
      s.completedAt = Date.now();
      save();
      if (C.opts.onComplete) C.opts.onComplete(s);
      if (C.opts.certificate !== false) setTimeout(showCert, 600);
    }
    save();
  }
  function next() {
    if (reading(C.cur)) return setPhase('quiz');
    if (!passedAll(C.cur)) return;
    complete(C.cur);
    if (C.cur === C.lessons.length - 1) { paint(); return; }
    go(C.cur + 1);
  }

  function showCert() {
    var me = window.SCApp && SCApp.currentUser();
    $('#cCertName').textContent = me ? me.name : 'SkillCloud associate';
    var d = C.state.completedAt ? new Date(C.state.completedAt) : new Date();
    $('#cCertDate').textContent = 'Completed on ' + d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    $('#cCert').classList.add('open');
  }

  /* ── checkpoint tasks ── */
  function pass(task, msg) {
    var lesson = task.closest('.lesson');
    var k = $$('.gate', lesson).indexOf(task);
    C.state.passed[lesson.id + ':' + k] = 1; save();
    task.classList.add('passed');
    var fb = $('.fb', task);
    if (fb && msg) { fb.textContent = msg; fb.className = 'fb good'; }
    paint();
  }
  function fail(task, msg) {
    var fb = $('.fb', task);
    if (fb) { fb.textContent = msg; fb.className = 'fb bad'; }
  }
  function wireTasks() {
    $$('.task[data-type="choice"]').forEach(function (task) {
      $$('.choice', task).forEach(function (b) {
        b.onclick = function () {
          if (b.dataset.choice === task.dataset.answer) {
            $$('.choice', task).forEach(function (x) { x.disabled = true; });
            b.classList.add('right');
            pass(task, task.dataset.ok);
          } else {
            b.classList.add('wrong'); b.disabled = true;
            fail(task, task.dataset.bad || 'Not quite. Revisit the lesson, then try again.');
          }
        };
      });
    });
    $$('.task[data-type="match"]').forEach(function (task) {
      var opts = $('.match', task).dataset.options.split('|');
      $$('.match-row', task).forEach(function (row) {
        row.insertAdjacentHTML('beforeend', '<select aria-label="Choose"><option value="">Choose</option>' + opts.map(function (o) { return '<option>' + o.replace(/&/g, '&amp;') + '</option>'; }).join('') + '</select>');
        $('select', row).onchange = function () { row.classList.remove('right', 'wrong'); };
      });
      $('[data-check]', task).onclick = function () {
        var rows = $$('.match-row', task), ok = 0;
        rows.forEach(function (row) {
          var good = $('select', row).value === row.dataset.answer;
          row.classList.toggle('right', good); row.classList.toggle('wrong', !good);
          if (good) ok++;
        });
        if (ok === rows.length) { $$('select', task).forEach(function (s) { s.disabled = true; }); this.disabled = true; pass(task, task.dataset.ok); }
        else fail(task, ok + ' of ' + rows.length + ' correct. Fix the red ones and check again.');
      };
    });
    $$('.task[data-type="sort"]').forEach(function (task) {
      var list = $('.sort', task);
      $$('li', list).forEach(function (li) {
        li.insertAdjacentHTML('beforeend', '<button class="mv" data-dir="-1" aria-label="Move up">&#8593;</button><button class="mv" data-dir="1" aria-label="Move down">&#8595;</button>');
      });
      function paintSort() {
        var li = $$('li', list);
        li.forEach(function (x, i) { $('[data-dir="-1"]', x).disabled = i === 0; $('[data-dir="1"]', x).disabled = i === li.length - 1; });
      }
      list.addEventListener('click', function (e) {
        var b = e.target.closest('.mv'); if (!b || task.classList.contains('passed')) return;
        var li = b.closest('li');
        if (b.dataset.dir === '-1' && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
        if (b.dataset.dir === '1' && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
        var fb = $('.fb', task); if (fb) fb.textContent = '';
        paintSort();
      });
      paintSort();
      $('[data-check]', task).onclick = function () {
        var good = $$('li', list).every(function (x, i) { return +x.dataset.order === i + 1; });
        if (good) { list.classList.add('right'); $$('.mv', list).forEach(function (m) { m.disabled = true; }); this.disabled = true; pass(task, task.dataset.ok); }
        else fail(task, task.dataset.bad || 'Not yet. Move the items and check again.');
      };
    });
  }
  function restore() {
    C.lessons.forEach(function (l) {
      $$('.gate', l).forEach(function (g, k) {
        if (!C.state.passed[l.id + ':' + k]) return;
        g.classList.add('passed');
        if (g.dataset.type === 'choice') { var b = $('.choice[data-choice="' + g.dataset.answer + '"]', g); if (b) b.classList.add('right'); $$('.choice', g).forEach(function (x) { x.disabled = true; }); }
        if (g.dataset.type === 'match') { $$('.match-row', g).forEach(function (row) { $('select', row).value = row.dataset.answer; row.classList.add('right'); $('select', row).disabled = true; }); $('[data-check]', g).disabled = true; }
        if (g.dataset.type === 'sort') { var list = $('.sort', g); $$('li', list).sort(function (a, b) { return a.dataset.order - b.dataset.order; }).forEach(function (li) { list.appendChild(li); }); list.classList.add('right'); $$('.mv', list).forEach(function (m) { m.disabled = true; }); $('[data-check]', g).disabled = true; }
      });
    });
  }

  function init(opts) {
    C.opts = opts || {};
    C.lessons = $$('.lesson');
    var me = window.SCApp && SCApp.currentUser();
    C.key = (C.opts.store || ('sc_course_' + C.opts.id + '__')) + (me ? me.id : 'guest');
    C.state = { done: [], passed: {}, at: 0, modulesDone: [] };
    try { Object.assign(C.state, JSON.parse(localStorage.getItem(C.key) || '{}')); } catch (e) {}
    C.state.passed = C.state.passed || {};
    C.cur = Math.min(C.state.at || 0, C.lessons.length - 1);

    build(); wireTasks(); restore();

    window.addEventListener('scroll', reveal, { passive: true });
    window.addEventListener('resize', reveal);
    document.addEventListener('toggle', function () { setTimeout(reveal, 50); }, true);
    document.addEventListener('click', function () { setTimeout(reveal, 60); });
    $('#cNext').onclick = next;
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-jump],[data-next],[data-cert],[data-phase],[data-advance]');
      if (!t) return;
      if (t.hasAttribute('data-cert')) return showCert();
      if (t.hasAttribute('data-phase')) return setPhase(t.dataset.phase);
      if (t.hasAttribute('data-advance')) return next();
      if (t.hasAttribute('data-next')) { complete(C.cur); return go(C.cur + 1); }
      go(C.lessons.findIndex(function (l) { return l.id === t.dataset.jump; }));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') $('#cCert').classList.remove('open');
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') C.lessons[C.cur].classList.contains('quiz') ? setPhase('read') : go(C.cur - 1);
    });
    $('#cOutlineBtn').onclick = function () { var o = document.body.classList.toggle('nav-open'); this.setAttribute('aria-expanded', o); };
    $('#cScrim').onclick = function () { document.body.classList.remove('nav-open'); };
    $('#cPrint').onclick = function () { window.print(); };
    $('#cClose').onclick = function () { $('#cCert').classList.remove('open'); };
    $('#cCert').onclick = function (e) { if (e.target === this) this.classList.remove('open'); };

    C.lessons[C.cur].classList.add('on');
    paint();
    setTimeout(reveal, 400);
    if (location.hash === '#certificate' && C.state.completedAt && C.opts.certificate !== false) showCert();
  }

  window.SCCourse = {
    init: init, pass: pass, fail: fail, paint: paint, go: go,
    get state() { return C.state; },
    reset: function () { localStorage.removeItem(C.key); location.reload(); }
  };
})();
