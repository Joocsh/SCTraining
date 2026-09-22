/* ══════════════════════════════════════════════════════════
   Course catalog
   One list of every study course so the Home, VA, My Account and the
   supervisor view read progress the same way. Paths are from the site
   root; pages in subfolders prefix them with SCCourses.root.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function read(key, fb) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fb : v; } catch (e) { return fb; } }

  var COURSES = [
    {
      id: 'intro', title: 'AI Introduction', href: 'ai.html', kind: 'Start here',
      desc: 'What Claude, ChatGPT and Manus are, how each one works, and when to use which.',
      image: 'assets/img/va/sop/m2-build.jpg', lessons: 5, modules: 1, store: 'sc_course_intro__'
    },
    {
      id: 'sop', title: 'SOP Foundations', href: 'va/sop-foundations.html', kind: 'VA course',
      desc: 'Turn everyday work into a reliable, repeatable system with clear Standard Operating Procedures.',
      image: 'assets/img/va/sop-foundations.jpg', lessons: 11, modules: 3, store: 'sc_va_sop_foundations_v2__'
    },
    {
      id: 'marketing', title: 'Marketing Training', href: 'marketing-training.html', kind: 'VA course',
      desc: 'The Sotheby’s brand, Design Vault, ListTrac and the marketing tools, lesson by lesson.',
      image: 'assets/img/va/sop/m1-understand.jpg', lessons: 58, modules: 0,
      /* this course keeps its own progress in the browser */
      progress: function () { return { done: read('mt3_done', []).length }; }
    }
  ];

  function progress(course, userId) {
    var raw = course.progress ? course.progress(userId) : read(course.store + userId, {});
    var done = typeof raw.done === 'number' ? raw.done : (raw.done || []).length;
    done = Math.min(done, course.lessons);
    return {
      done: done, total: course.lessons,
      pct: Math.round(done / course.lessons * 100),
      complete: done >= course.lessons,
      completedAt: raw.completedAt || null,
      modulesDone: raw.modulesDone || []
    };
  }

  window.SCCourses = {
    list: COURSES,
    get: function (id) { return COURSES.filter(function (c) { return c.id === id; })[0]; },
    progress: progress
  };
})();
