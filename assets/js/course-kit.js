/* ══════════════════════════════════════════════════════════
   Course kit: small helpers for trainings on the course player.
     .task[data-type="poll"]   a question with no right answer; picking
                               one shows the note in data-why. The pick
                               is saved like the drafts.
     textarea[data-draft]      written practice, saved on this device.
   Call SCCourseKit.init('store_prefix__') after SCCourse.init.
   SCCourseKit.drafts() returns everything saved so far, so a page can
   show it back (for example a "My work" view).
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var drafts = {}, key = '';
  function persist() { try { localStorage.setItem(key, JSON.stringify(drafts)); } catch (e) {} }

  function init(store) {
    var me = window.SCApp && SCApp.currentUser();
    key = store + 'drafts__' + (me ? me.id : 'guest');
    try { drafts = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { drafts = {}; }

    [].forEach.call(document.querySelectorAll('.task[data-type="poll"]'), function (task, n) {
      var fb = task.querySelector('.fb'), lesson = task.closest('.lesson');
      var pid = 'poll:' + (lesson ? lesson.id : '') + ':' + n;
      var choices = [].slice.call(task.querySelectorAll('.choice'));
      function pick(b) {
        choices.forEach(function (x) { x.classList.toggle('picked', x === b); });
        if (fb) { fb.textContent = task.getAttribute('data-why') || ''; fb.className = 'fb good'; }
      }
      if (drafts[pid] != null && choices[drafts[pid]]) pick(choices[drafts[pid]]);
      choices.forEach(function (b, i) {
        b.addEventListener('click', function () {
          pick(b); drafts[pid] = i; persist();
          if (window.SCDB && window.SCCourse && lesson) SCDB.pollAnswer(SCCourse.id || store, lesson.id, 0, i);
        });
      });
    });

    var timer;
    [].forEach.call(document.querySelectorAll('textarea[data-draft]'), function (ta) {
      var id = ta.getAttribute('data-draft'), box = ta.closest('.task');
      if (drafts[id]) { ta.value = drafts[id]; if (box) box.classList.add('saved'); }
      ta.addEventListener('input', function () {
        drafts[id] = ta.value;
        clearTimeout(timer);
        timer = setTimeout(function () {
          persist(); if (box) box.classList.toggle('saved', !!ta.value.trim());
          if (window.SCDB) SCDB.draft(id, ta.value);
        }, 400);
      });
    });
  }
  window.SCCourseKit = { init: init, drafts: function () { return drafts; } };
})();
