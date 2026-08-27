/* ============================================================================
   IN-BROWSER SELF TEST — TIME SHIFT — appended to the page only when ?selftest=1
   ============================================================================

   Why this exists
   ---------------
   The simulator no longer lives in a fixed week. QZ_SHIFT_DAYS (qualia-data.js) moves the
   whole world onto the trainee's real calendar, and that shift has to reach FOUR separate
   surfaces or the course starts lying:

     1. the data          — qzShiftWorldTime(), before the seed is built
     2. the course prose  — the same sweep, over the in-memory lesson/scenario/exam objects
     3. the 16 documents  — qzOpenDocFile(), on the way to the viewer
     4. anything derived  — the CSV export, the audit log, the due chips

   A date that misses the shift is the worst kind of bug here: nothing crashes, the screen
   looks fine, and the trainee is taught to see a discrepancy that does not exist — inside
   the exercise whose whole point is spotting real ones.

   So this measures the shift instead of trusting it. Every check below works at ANY nonzero
   offset, including the small ones: it never asks "is this date still 2026?" (which is a
   perfectly correct answer two weeks after the anchor), it asks "did this date move by
   exactly QZ_SHIFT_DAYS, and does it still trace back to what is written in the file?".

   It is inert unless ?selftest=1 is in the URL, so the shipped simulator carries no trace.

   IT DOES NOT MUTATE THE SANDBOX. It reads, fetches and compares. Reloading changes nothing
   except the offset, once a week.
   ============================================================================ */

(function () {
  if (new URLSearchParams(location.search).get('selftest') !== '1') return;

  const consoleErrors = [];
  ['error', 'warn'].forEach(function (level) {
    const original = console[level];
    console[level] = function () {
      consoleErrors.push(level + ': ' + Array.prototype.slice.call(arguments).join(' '));
      original.apply(console, arguments);
    };
  });
  window.addEventListener('error', function (e) {
    consoleErrors.push('uncaught: ' + e.message + ' (' + e.filename + ':' + e.lineno + ')');
  });

  const results = [];
  function group(name) { results.push({ group: name }); }
  function ok(pass, label, detail) { results.push({ pass: !!pass, label: label, detail: detail }); }

  const DAY = 86400000;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];
  const ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parseISO(iso) { return Date.parse(iso + 'T00:00:00'); }
  function daysBetween(a, b) { return Math.round((parseISO(a) - parseISO(b)) / DAY); }

  /* Every date-shaped run in a blob of text, in document order, normalised to ISO. The two
     patterns and the neighbour guard are deliberately the same ones qzShiftDateText uses:
     a check that scanned differently would measure a different thing than the code under test. */
  function findDates(text) {
    const out = [];
    const s = String(text || '');
    s.replace(/\d{4}-\d{2}-\d{2}/g, function (m, offset) {
      const before = offset > 0 ? s.charAt(offset - 1) : '';
      const after = s.charAt(offset + m.length);
      if (/[\d-]/.test(before) || /[\d-]/.test(after)) return m;
      out.push(m);
      return m;
    });
    s.replace(/\b([A-Z][a-z]{2,8})\.? (\d{1,2}), (\d{4})\b/g, function (m, mon, day, year) {
      let i = MONTHS.indexOf(mon);
      if (i < 0) i = ABBR.indexOf(mon);
      if (i < 0) return m;
      const d = +day;
      if (d < 1 || d > 31) return m;
      const pad = function (n) { return (n < 10 ? '0' : '') + n; };
      out.push(year + '-' + pad(i + 1) + '-' + pad(d));
      return m;
    });
    return out;
  }

  function walkStrings(node, fn, seen) {
    seen = seen || new Set();
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    Object.keys(node).forEach(function (k) {
      const v = node[k];
      if (typeof v === 'string') fn(v, k);
      else if (v && typeof v === 'object') walkStrings(v, fn, seen);
    });
  }

  function run() {
    const shift = typeof QZ_SHIFT_DAYS === 'number' ? QZ_SHIFT_DAYS : null;

    /* ---------------- the clock ---------------- */
    group('The clock');

    ok(shift !== null, 'QZ_SHIFT_DAYS exists', shift === null ? 'not defined' : shift + ' days');
    ok(shift !== null && shift % 7 === 0, 'the offset is a whole number of weeks',
      shift + ' days = ' + (shift / 7) + ' weeks');

    const anchorDow = new Date(parseISO(QZ_ANCHOR)).getUTCDay();
    const todayDow = new Date(parseISO(QZ_TODAY)).getUTCDay();
    const dowNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    ok(anchorDow === todayDow, 'weekday survives the shift',
      'anchor ' + QZ_ANCHOR + ' (' + dowNames[anchorDow] + ') -> today ' + QZ_TODAY + ' (' + dowNames[todayDow] + ')');

    const real = new Date();
    const realISO = real.getFullYear() + '-' + ('0' + (real.getMonth() + 1)).slice(-2) + '-' + ('0' + real.getDate()).slice(-2);
    const drift = Math.abs(daysBetween(QZ_TODAY, realISO));
    ok(drift <= 3, 'the simulated today sits inside the real week',
      drift + ' day(s) from the real ' + realISO + ' (<= 3 by design: weeks, not days)');

    ok(daysBetween(QZ_TODAY, QZ_ANCHOR) === shift, 'today is the anchor plus the offset');

    /* ---------------- the data ---------------- */
    group('The data');

    if (shift === 0) {
      ok(true, 'offset is zero this week — coverage checks skipped',
        'They compare moved against unmoved, which needs a nonzero offset. Re-run next week.');
    } else {
      /* Nothing may still sit where the file put it: unshifting every live date has to land
         it back inside the window the dataset was written in. */
      const window0 = { lo: parseISO('2024-01-01'), hi: parseISO('2028-12-31') };
      let live = 0, outside = 0, sample = '';
      ['orders', 'tasks', 'documents', 'receipts', 'disbursements', 'invoices', 'ledgerLines',
        'events', 'notes', 'messages', 'threads', 'exceptions', 'cpls'].forEach(function (coll) {
          qzList(coll).forEach(function (row) {
            walkStrings(row, function (v) {
              findDates(v).forEach(function (iso) {
                live++;
                const back = parseISO(iso) - shift * DAY;
                if (back < window0.lo || back > window0.hi) {
                  outside++;
                  if (!sample) sample = coll + ': ' + iso;
                }
              });
            });
          });
        });
      ok(live > 0, 'the live world carries dates', live + ' date values scanned');
      ok(outside === 0, 'no date was shifted twice or left behind',
        outside ? outside + ' outside the source window, e.g. ' + sample : 'all ' + live + ' trace back into the source window');
    }

    /* File numbers are labels, not dates, and the course cites them 152 times. */
    ok(!!qzGetOrder('ORD-2026-1483'), 'file numbers were left alone',
      'ORD-2026-1483 still resolves — course citations and saved progress keys intact');

    /* ---------------- the documents ---------------- */
    group('The documents');

    /* Not just the documents collection: 7 of the 16 files are reachable only from a course
       exercise (a review's r.doc, a scenario's verifyDoc, a reconcile's docs[]), and those
       go through qzOpenDocFile too. Collecting every path anything can open is the only way
       this check covers what a trainee can actually reach. */
    const docFiles = [];
    const addFile = function (f) {
      if (typeof f === 'string' && /^documents\//.test(f) && docFiles.indexOf(f) === -1) docFiles.push(f);
    };
    qzList('documents').forEach(function (d) { addFile(d.file); });
    [QZ_REVIEWS, QZ_SCENARIOS, QZ_RECONCILES, QZ_EXAM_BANK, QZ_LESSONS].forEach(function (root) {
      walkStrings(root, function (v) { addFile(v); });
    });

    if (!docFiles.length) {
      ok(false, 'documents with a file were found', 'none — qzList("documents") returned no .file');
      return Promise.resolve();
    }

    return Promise.all(docFiles.map(function (file) {
      return fetch(file).then(function (r) { return r.ok ? r.text() : Promise.reject(new Error(r.status)); })
        .then(function (raw) {
          const before = findDates(raw);
          const after = findDates(qzShiftDateText(raw));
          let moved = 0, wrong = 0, detail = '';
          before.forEach(function (iso, i) {
            if (!after[i]) { wrong++; return; }
            const delta = daysBetween(after[i], iso);
            if (delta === shift) moved++;
            else { wrong++; if (!detail) detail = iso + ' -> ' + after[i] + ' (' + delta + 'd, expected ' + shift + 'd)'; }
          });
          return { file: file, total: before.length, moved: moved, wrong: wrong, detail: detail };
        })
        .catch(function (e) { return { file: file, error: e.message }; });
    })).then(function (rows) {
      const failed = rows.filter(function (r) { return r.error || r.wrong; });
      const dates = rows.reduce(function (n, r) { return n + (r.total || 0); }, 0);
      const moved = rows.reduce(function (n, r) { return n + (r.moved || 0); }, 0);
      ok(!rows.some(function (r) { return r.error; }), 'every reachable document could be read',
        rows.filter(function (r) { return r.error; }).map(function (r) { return r.file + ': ' + r.error; }).join(' · ') || rows.length + ' files fetched');
      if (shift !== 0) {
        ok(!failed.length, 'every printed date moves with the clock',
          failed.length ? failed[0].file + ' — ' + (failed[0].detail || failed[0].error)
            : moved + ' of ' + dates + ' printed dates shifted by ' + shift + ' days across ' + rows.length + ' files');
      }
      const empty = rows.filter(function (r) { return !r.error && r.total === 0; });
      ok(true, 'documents carrying no printed date', empty.length + ' of ' + rows.length +
        (empty.length ? ' (' + empty.map(function (r) { return r.file.split('/').pop(); }).join(', ') + ')' : ''));

      /* ---------------- the course prose ---------------- */
      group('The course prose');

      return fetch('qualia-data.js').then(function (r) { return r.text(); }).then(function (src) {
        const onDisk = {};
        findDates(src).forEach(function (iso) { onDisk[iso] = true; });

        let quoted = 0, stale = 0, first = '';
        [QZ_LESSONS, QZ_SCENARIOS, QZ_REVIEWS, QZ_EXAM_BANK, QZ_COMPOSES, QZ_RECONCILES].forEach(function (root) {
          walkStrings(root, function (v) {
            findDates(v).forEach(function (iso) {
              quoted++;
              /* Shifted back, a live prose date must be one that is actually written in the
                 file. If it is not, the sweep either missed it or moved it twice. */
              const back = new Date(parseISO(iso) - shift * DAY).toISOString().slice(0, 10);
              if (!onDisk[back]) { stale++; if (!first) first = iso + ' (unshifts to ' + back + ', not in qualia-data.js)'; }
            });
          });
        });
        ok(quoted > 0, 'the course quotes dates in prose', quoted + ' date mentions in lessons, scenarios, reviews and the exam bank');
        ok(stale === 0, 'every quoted date traces back to the file',
          stale ? stale + ' do not, e.g. ' + first : 'all ' + quoted + ' unshift onto a date written in qualia-data.js');

        /* ---------------- what the screen actually shows ---------------- */
        group('The screen');

        /* Two separate checks on purpose. A stray "undefined" in a name is not a date bug,
           and letting it fail the date check would teach us to ignore a red panel. */
        const views = ['orders', 'contacts', 'calendar', 'accounting', 'reports', 'compliance', 'admin'];
        let broken = 0, where = '', stray = 0, strayWhere = '';
        views.forEach(function (v) {
          try {
            qzState.view = v;
            qzRenderRoot();
            const txt = document.getElementById('qzRoot').textContent;
            if (/Invalid Date|NaN/.test(txt)) { broken++; if (!where) where = v; }
            if (/undefined/.test(txt)) {
              stray++;
              if (!strayWhere) {
                const m = /.{0,50}undefined.{0,30}/.exec(txt);
                strayWhere = v + ': ' + (m ? m[0].replace(/\s+/g, ' ').trim() : '');
              }
            }
          } catch (e) { broken++; if (!where) where = v + ' threw: ' + e.message; }
        });
        try { qzGotoHome('tasks'); } catch (e) { /* Home is optional for this check */ }
        ok(broken === 0, 'no broken date maths on screen',
          broken ? 'found in ' + where : views.length + ' sections rendered clean');
        ok(stray === 0, 'no stray undefined on screen',
          stray ? strayWhere : views.length + ' sections carry no undefined values');

        const store = localStorage.getItem('qz_va_training_v2');
        const fields = store ? Object.keys(JSON.parse(store)).length : 0;
        const keys = Object.keys(localStorage).filter(function (k) { return /^qz/.test(k); });
        ok(keys.length === 1 && fields === 10, 'the course invariant held',
          keys.length + ' key(s), ' + fields + ' fields — no product data leaked into storage');

        ok(consoleErrors.length === 0, 'console stayed clean',
          consoleErrors.slice(0, 3).join(' · ') || 'no errors or warnings');
      });
    });
  }

  function render() {
    const failures = results.filter(function (r) { return r.group === undefined && !r.pass; }).length;
    const panel = document.createElement('div');
    panel.className = 'qz-selftest';
    panel.setAttribute('style', 'position:fixed;inset:auto 16px 16px auto;width:min(560px,calc(100vw - 32px));max-height:80vh;overflow:auto;z-index:99999;background:#fff;border:1px solid #cbd2d8;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.25);font:13px/1.45 system-ui,sans-serif;color:#24262b');
    panel.innerHTML =
      '<header style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid #e3e5e8;background:' + (failures ? '#fdecea' : '#e8f5ec') + '">' +
        '<b style="flex:1">' + (failures ? failures + ' FAILURE' + (failures === 1 ? '' : 'S') : 'ALL PASS') + '</b>' +
        '<span style="color:#6e727c;font-size:11.5px">' + results.filter(function (r) { return r.pass; }).length + ' checks · shift ' + QZ_SHIFT_DAYS + 'd · today ' + QZ_TODAY + '</span>' +
        '<button type="button" style="border:1px solid #cbd2d8;background:#fff;border-radius:4px;padding:3px 9px;cursor:pointer" onclick="this.closest(\'.qz-selftest\').remove()">Close</button>' +
      '</header>' +
      '<div style="padding:6px 0">' +
        results.map(function (r) {
          if (r.group) return '<h4 style="margin:12px 14px 4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6e727c">' + r.group + '</h4>';
          return '<div style="display:flex;gap:9px;padding:5px 14px;align-items:baseline">' +
            '<span style="flex:none;font-size:10.5px;font-weight:700;color:' + (r.pass ? '#1c6b43' : '#c94b3f') + '">' + (r.pass ? 'PASS' : 'FAIL') + '</span>' +
            '<div><b style="font-weight:600">' + r.label + '</b>' +
            (r.detail ? '<em style="display:block;color:#6e727c;font-style:normal;font-size:11.5px">' + String(r.detail).replace(/</g, '&lt;') + '</em>' : '') +
            '</div></div>';
        }).join('') +
      '</div>' +
      '<footer style="padding:9px 14px;border-top:1px solid #e3e5e8;color:#6e727c;font-size:11px">Read-only run. The offset is recomputed every load, so this panel is only ever as old as the week you are in.</footer>';
    document.body.appendChild(panel);
  }

  window.addEventListener('load', function () {
    setTimeout(function () {
      Promise.resolve()
        .then(run)
        .catch(function (e) {
          ok(false, 'the self test itself threw', e.message + ' @ ' + (e.stack || '').split('\n')[1]);
        })
        .then(render);
    }, 300);
  });
})();
