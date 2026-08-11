/* ==========================================================================
   SkillCloud Academy · AI Lab guide library
   Shared behaviour for every page in /guides. Progressive enhancement only:
   the markup reads fine with this file absent, and every affordance below is
   built from the page's own content rather than hand written per guide.
   Pairs with assets/css/guide.css.
   ========================================================================== */
(function () {
  'use strict';

  var body = document.body;
  if (!body || body.className.indexOf('gd-page') === -1) return;

  var article = document.querySelector('.ai-article');
  if (!article) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function slug(text, fallback) {
    var s = String(text || '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return s || fallback;
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* ── 1. Section rail, built from the page's own H2s ───────────────────── */
  var heads = [];
  var allH2 = article.querySelectorAll('h2');
  for (var i = 0; i < allH2.length; i++) heads.push(allH2[i]);

  var rail = null, progress = null, jumps = [];

  if (heads.length > 1) {
    heads.forEach(function (h, idx) {
      if (!h.id) h.id = 'sec-' + slug(h.textContent, 'section') + '-' + (idx + 1);
      var n = document.createElement('span');
      n.className = 'gd-n';
      n.textContent = pad(idx + 1) + ' / ' + pad(heads.length);
      h.insertBefore(n, h.firstChild);
    });

    rail = document.createElement('nav');
    rail.className = 'gd-rail';
    rail.setAttribute('aria-label', 'Guide sections');

    progress = document.createElement('span');
    progress.className = 'gd-progress';
    rail.appendChild(progress);

    var railInner = document.createElement('div');
    railInner.className = 'gd-rail-inner';

    heads.forEach(function (h) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gd-jump';
      /* The number span lives in the heading, so read the label without it. */
      var label = h.textContent.replace(/^\s*\d+\s*\/\s*\d+\s*/, '').trim();
      btn.textContent = label;
      btn.addEventListener('click', function () {
        var top = h.getBoundingClientRect().top + window.pageYOffset - 132;
        window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
      railInner.appendChild(btn);
      jumps.push(btn);
    });

    rail.appendChild(railInner);
    var hero = document.querySelector('.ai-hero');
    if (hero && hero.parentNode) hero.parentNode.insertBefore(rail, hero.nextSibling);
  }

  /* ── 2. Copy to clipboard on every prompt panel ───────────────────────── */
  function copyText(text, btn) {
    function done() {
      var original = btn.innerHTML;
      btn.classList.add('copied');
      btn.innerHTML = checkSvg() + '<span>Copied</span>';
      window.setTimeout(function () {
        btn.classList.remove('copied');
        btn.innerHTML = original;
      }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacy(text, done); });
    } else {
      legacy(text, done);
    }
  }

  function legacy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    done();
  }

  function copySvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
      '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  }

  function checkSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M20 6L9 17l-5-5"/></svg>';
  }

  var panels = article.querySelectorAll('.prompt-box, .long-prompt, .hint-prompt');
  for (var p = 0; p < panels.length; p++) {
    (function (panel) {
      var source = panel.querySelector('pre') || panel.querySelector('p');
      if (!source) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gd-copy';
      btn.setAttribute('aria-label', 'Copy this prompt');
      btn.innerHTML = copySvg() + '<span>Copy</span>';
      btn.addEventListener('click', function () {
        copyText((source.innerText || source.textContent || '').trim(), btn);
      });
      panel.appendChild(btn);
    })(panels[p]);
  }

  /* ── 3. Long prompts clamp until asked for ───────────────────────────── */
  var longs = article.querySelectorAll('.long-prompt');
  for (var L = 0; L < longs.length; L++) {
    (function (box) {
      var pre = box.querySelector('pre');
      if (!pre) return;

      var wrap = document.createElement('div');
      wrap.className = 'gd-pre-wrap';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      if (pre.scrollHeight <= 420) return;

      box.classList.add('gd-clamped');
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'gd-expand';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<span class="gd-etxt">Read the full prompt</span><span class="gd-chev"></span>';
      toggle.addEventListener('click', function () {
        var clamped = box.classList.toggle('gd-clamped');
        toggle.setAttribute('aria-expanded', clamped ? 'false' : 'true');
        toggle.querySelector('.gd-etxt').textContent =
          clamped ? 'Read the full prompt' : 'Collapse prompt';
        if (clamped) {
          var top = box.getBoundingClientRect().top + window.pageYOffset - 132;
          window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      });
      box.appendChild(toggle);
    })(longs[L]);
  }

  /* ── 4. Reference libraries collapse into a browsable index ───────────── */
  var entries = article.querySelectorAll('.hint-num');
  if (entries.length > 3) {
    var toggles = [];

    for (var e = 0; e < entries.length; e++) {
      (function (head, idx) {
        var panel = document.createElement('div');
        panel.className = 'gd-panel';
        panel.id = 'gd-entry-' + (idx + 1);

        var node = head.nextSibling;
        while (node) {
          var next = node.nextSibling;
          if (node.nodeType === 1) {
            var cn = node.className || '';
            var tag = node.tagName;
            if (cn.indexOf('hint-num') > -1 || cn.indexOf('hint-group') > -1 ||
                cn.indexOf('guide-nav') > -1 || tag === 'H2') break;
          }
          panel.appendChild(node);
          node = next;
        }

        var label = head.textContent.trim();
        head.textContent = '';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gd-toggle';
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', panel.id);
        btn.innerHTML = '<span class="gd-ttxt"></span><span class="gd-chev"></span>';
        btn.querySelector('.gd-ttxt').textContent = label;
        head.appendChild(btn);
        head.parentNode.insertBefore(panel, head.nextSibling);

        function setOpen(open) {
          panel.classList.toggle('open', open);
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        btn.addEventListener('click', function () {
          setOpen(!panel.classList.contains('open'));
        });
        toggles.push({ open: setOpen, head: head, panel: panel, isOpen: function () {
          return panel.classList.contains('open');
        } });
      })(entries[e], e);
    }

    /* Toolbar: a count of what is in the library, and a way to open it all. */
    var toolbar = document.createElement('div');
    toolbar.className = 'gd-toolbar';
    var count = document.createElement('span');
    count.className = 'gd-count';
    count.textContent = entries.length + ' entries in this library';
    var allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.textContent = 'Expand all';
    allBtn.addEventListener('click', function () {
      var anyClosed = toggles.some(function (t) { return !t.isOpen(); });
      toggles.forEach(function (t) { t.open(anyClosed); });
      allBtn.textContent = anyClosed ? 'Collapse all' : 'Expand all';
    });
    toolbar.appendChild(count);
    toolbar.appendChild(allBtn);

    var firstGroup = article.querySelector('.hint-group') || entries[0];
    firstGroup.parentNode.insertBefore(toolbar, firstGroup);

    /* Open the first entry so the section never reads as an empty list. */
    if (toggles.length) toggles[0].open(true);
  }

  /* ── 5. Section rail state, tied to real scroll position ─────────────── */
  if (rail) {
    var ticking = false;

    function sync() {
      ticking = false;
      var content = document.querySelector('.ai-content');
      if (content && progress) {
        var start = content.offsetTop;
        var span = content.offsetHeight - window.innerHeight;
        var pct = span > 0 ? (window.pageYOffset - start) / span : 0;
        progress.style.width = Math.max(0, Math.min(1, pct)) * 100 + '%';
      }
      var active = 0;
      for (var k = 0; k < heads.length; k++) {
        if (heads[k].getBoundingClientRect().top <= 150) active = k;
      }
      for (var j = 0; j < jumps.length; j++) {
        jumps[j].classList.toggle('active', j === active);
      }
      var on = jumps[active];
      if (on && rail) {
        var inner = rail.querySelector('.gd-rail-inner');
        var left = on.offsetLeft - inner.clientWidth / 2 + on.offsetWidth / 2;
        if (inner.scrollWidth > inner.clientWidth) {
          inner.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      }
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(sync); }
    }, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  /* ── 6. Load in, only where the browser can do it cleanly ────────────── */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var kids = [];
    var children = article.children;
    for (var c = 0; c < children.length; c++) {
      /* Collapsible panels run their own open animation, so leave them alone. */
      if (children[c].classList.contains('gd-panel')) continue;
      kids.push(children[c]);
      children[c].classList.add('gd-reveal');
    }
    var io = new IntersectionObserver(function (recs) {
      recs.forEach(function (rec) {
        if (rec.isIntersecting) {
          rec.target.classList.add('gd-in');
          io.unobserve(rec.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.02 });
    kids.forEach(function (el) { io.observe(el); });
    /* Anything already on screen should not wait for a scroll event. */
    window.setTimeout(function () {
      kids.forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('gd-in');
      });
    }, 60);
  }
})();
