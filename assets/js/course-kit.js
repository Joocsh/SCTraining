/* ══════════════════════════════════════════════════════════
   Course kit: small helpers for trainings on the course player.
     .task[data-type="poll"]   a question with no right answer; picking
                               one shows the note in data-why.
     textarea[data-draft]      written practice, saved on this device.
   Call SCCourseKit.init('store_prefix__') after SCCourse.init.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  function init(store) {
    var me = window.SCApp && SCApp.currentUser();
    var key = store + 'drafts__' + (me ? me.id : 'guest');
    var drafts = {};
    try { drafts = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) {}

    [].forEach.call(document.querySelectorAll('.task[data-type="poll"]'), function (task) {
      var fb = task.querySelector('.fb');
      [].forEach.call(task.querySelectorAll('.choice'), function (b) {
        b.addEventListener('click', function () {
          [].forEach.call(task.querySelectorAll('.choice'), function (x) { x.classList.toggle('picked', x === b); });
          if (fb) { fb.textContent = task.getAttribute('data-why') || ''; fb.className = 'fb good'; }
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
          try { localStorage.setItem(key, JSON.stringify(drafts)); if (box) box.classList.toggle('saved', !!ta.value.trim()); } catch (e) {}
        }, 400);
      });
    });
  }
  window.SCCourseKit = { init: init };
})();
