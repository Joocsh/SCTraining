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
      image: 'assets/img/va/sop/m2-build.jpg', lessons: 5, modules: 1, store: 'sc_course_intro__', track: 'intro'
    },
    {
      id: 'sop', title: 'SOP Foundations', href: 'va/sop-foundations.html', kind: 'VA training',
      desc: 'Turn everyday work into a reliable, repeatable system with clear Standard Operating Procedures.',
      image: 'assets/img/va/sop-foundations.jpg', lessons: 11, modules: 3, store: 'sc_va_sop_foundations_v2__', track: 'va'
    },
    {
      id: 'ai-ops', title: 'AI for Real Estate Operations', href: 'va/ai-real-estate-ops.html', kind: 'VA training',
      desc: 'Use AI to draft, organize and analyze with clear prompts, protected client data and a person accountable for every result.',
      image: 'assets/img/va/ai-ops/m1-orientation.jpg', lessons: 24, modules: 4, store: 'sc_va_ai_re_ops__', track: 'va'
    },
    {
      id: 'asana', title: 'Asana Essentials', href: 'va/asana.html', kind: 'VA training',
      desc: 'Organize, assign and track the team’s work in Asana, from your first task to full projects and teams.',
      image: 'assets/img/va/asana/m2-tasks.jpg', lessons: 10, modules: 4, store: 'sc_va_asana__', track: 'va'
    },
    {
      id: 'marketing', title: 'Marketing Training', href: 'marketing-training.html', kind: 'Marketing training', track: 'marketing',
      desc: 'The Sotheby’s brand, Design Vault, ListTrac and the marketing tools, lesson by lesson.',
      image: 'assets/img/marketing/marketing-training-cover.jpg', lessons: 58, modules: 9,
      /* this course keeps its own progress in the browser */
      progress: function () { return { done: read('mt3_done', []).length }; }
    }
  ];

  /* Training areas. Each one has its own catalog page; a new course only needs
     its track here to show up in the right place. */
  var TRACKS = [
    { id: 'va', title: 'VA', href: 'paths.html#va', image: 'assets/img/va/sop-foundations.jpg',
      desc: 'Study your role before you simulate it: processes, systems and SOPs.' },
    { id: 'marketing', title: 'Marketing', href: 'paths.html#marketing', image: 'assets/img/marketing-path.jpg',
      desc: 'The brand, the design tools and the marketing playbook.' }
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
    tracks: TRACKS,
    byTrack: function (t) { return COURSES.filter(function (c) { return c.track === t; }); },
    progress: progress
  };
})();
