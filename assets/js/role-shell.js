/* ==========================================================================
   Role shell
   Reframes a role page to match the Operations Manager platform without
   adding anything to it. The sections come from the practice mode cards the
   page already has, and each one shows a panel the page already defines.
   ========================================================================== */
(function () {
  'use strict';

  var ICONS = {
    home: 'M3 11.5 12 4l9 7.5M5 10v9.5h5V15h4v4.5h5V10',
    sim: 'M4 5h16v11H4zM8 20h8M12 16v4M8 9h3M8 12h5',
    prompt: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
    quiz: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2',
    mls: 'M3 11.5 12 4l9 7.5M5 10v9.5h14V10M9 19.5V14h6v5.5',
    tax: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4',
    resources: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'
  };

  function iconFor(id, label) {
    if (ICONS[id]) return ICONS[id];
    var t = (label || '').toLowerCase();
    if (t.indexOf('mls') > -1) return ICONS.mls;
    if (t.indexOf('tax') > -1) return ICONS.tax;
    if (t.indexOf('quiz') > -1) return ICONS.quiz;
    if (t.indexOf('prompt') > -1) return ICONS.prompt;
    if (t.indexOf('librar') > -1 || t.indexOf('resource') > -1) return ICONS.resources;
    return ICONS.sim;
  }

  function svg(d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
           'stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
  }

  /* Read the sections straight off the page's own mode cards. */
  function readSections() {
    var out = [];
    document.querySelectorAll('.rd-mode-card').forEach(function (card) {
      var nameEl = card.querySelector('.rd-mode-name');
      if (!nameEl) return;
      var name = nameEl.textContent.trim();
      var desc = (card.querySelector('.rd-mode-desc') || {}).textContent || '';
      var id = null;

      /* the panel id can be on the card itself (data-mode or onclick) or on an
         inner call to action, depending on the page */
      if (card.dataset && card.dataset.mode) id = card.dataset.mode;
      if (!id) {
        var host = card.getAttribute('onclick') ? card : card.querySelector('[onclick*="openPanel"]');
        if (host) {
          var m = /openPanel\(['"]([^'"]+)['"]\)/.exec(host.getAttribute('onclick') || '');
          if (m) id = m[1];
        }
      }
      if (!id && card.classList.contains('rd-mode-resources')) id = 'resources';
      if (!id) {
        var link = card.querySelector('a[href]');
        if (link) { out.push({ id: null, name: name, desc: desc.trim(), href: link.getAttribute('href') }); return; }
      }
      if (id) out.push({ id: id, name: name, desc: desc.trim() });
    });
    return out;
  }

  function build() {
    var sections = readSections();
    if (!sections.length) return;

    var hero = document.querySelector('.rd-hero');
    var roleName = (hero && hero.querySelector('h1')) ? hero.querySelector('h1').innerHTML.trim() : document.title;
    var roleDesc = (hero && hero.querySelector('.rd-hero-desc')) ? hero.querySelector('.rd-hero-desc').textContent.trim() : '';

    document.body.classList.add('rshell');

    var shell = document.createElement('div');
    shell.className = 'rs';
    shell.innerHTML =
      '<aside class="rs-side">' +
        '<div class="rs-side-hd"><div class="kick">Role training</div><div class="nm">' + roleName + '</div></div>' +
        '<nav class="rs-nav" id="rsNav"></nav>' +
        '<div class="rs-side-ft"><a href="../index.html#roles">&larr; All roles</a></div>' +
      '</aside>' +
      '<div class="rs-main" id="rsMain"><div class="rs-home" id="rsHome"></div></div>';
    document.body.insertBefore(shell, document.body.firstChild);

    var main = shell.querySelector('#rsMain');
    var nav = shell.querySelector('#rsNav');
    var home = shell.querySelector('#rsHome');

    /* the overview keeps the role's own words */
    home.innerHTML = '<h1>' + roleName + '</h1>' +
      (roleDesc ? '<p class="lead">' + roleDesc + '</p>' : '') +
      '<div class="rs-cards"></div>';
    var cards = home.querySelector('.rs-cards');

    /* move the page's existing panels into the content column */
    sections.forEach(function (s) {
      if (!s.id) return;
      var panel = document.getElementById(s.id === 'resources' ? 'resources-panel' : 'panel-' + s.id);
      if (panel) main.appendChild(panel);
    });

    var frame = null;
    function ensureFrame() {
      if (!frame) {
        frame = document.createElement('iframe');
        frame.className = 'rs-frame';
        frame.setAttribute('title', 'Section');
        main.appendChild(frame);
      }
      return frame;
    }

    function show(id, href) {
      main.querySelectorAll('.lc-panel, .rd-resources-panel').forEach(function (p) { p.classList.remove('open'); });
      if (frame) frame.classList.remove('open');
      main.classList.remove('framed');
      home.style.display = id ? 'none' : '';

      if (href) {
        /* its own page, shown inside the column so the section list stays */
        var f = ensureFrame();
        var url = href + (href.indexOf('?') > -1 ? '&' : '?') + 'embed=1';
        if (f.getAttribute('src') !== url) f.setAttribute('src', url);
        f.classList.add('open');
        main.classList.add('framed');
      } else if (id) {
        var panel = document.getElementById(id === 'resources' ? 'resources-panel' : 'panel-' + id);
        if (panel) {
          panel.classList.add('open');
          if (window.PANEL_ON_OPEN && window.PANEL_ON_OPEN[id]) window.PANEL_ON_OPEN[id]();
        }
      }
      nav.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.sec === (id || 'home')); });
      main.scrollTop = 0;
    }

    function navButton(id, label) {
      var b = document.createElement('button');
      b.dataset.sec = id || 'home';
      b.innerHTML = svg(iconFor(id, label)) + '<span>' + label + '</span>';
      b.addEventListener('click', function () { show(id); });
      nav.appendChild(b);
      return b;
    }

    var ov = navButton(null, 'Overview');
    ov.innerHTML = svg(ICONS.home) + '<span>Overview</span>';

    sections.forEach(function (s, i) {
      if (s.href) {
        s.id = 'ext' + i;
        var a = document.createElement('button');
        a.dataset.sec = s.id;
        a.innerHTML = svg(iconFor(null, s.name)) + '<span>' + s.name + '</span>';
        a.addEventListener('click', function () { show(s.id, s.href); });
        nav.appendChild(a);
      } else {
        navButton(s.id, s.name);
      }

      var c = document.createElement('button');
      c.className = 'rs-card';
      c.innerHTML = '<span class="nm">' + s.name + '</span>' +
                    '<span class="ds">' + s.desc + '</span>' +
                    '<span class="go">Open &rarr;</span>';
      c.addEventListener('click', function () { show(s.id, s.href); });
      cards.appendChild(c);
    });

    /* keep the page's own openPanel calls working inside the shell */
    window.openPanel = function (id) { show(id); };
    window.closePanel = function () { show(null); };
    window.toggleResources = function () { show('resources'); };
    window.openResources = function () { show('resources'); };

    show(null);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
