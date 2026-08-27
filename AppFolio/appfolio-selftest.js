/* ============================================================================
   IN-BROWSER SELF TEST — appended to the page only when ?selftest=1
   ============================================================================

   Why this exists
   ---------------
   Everything in this module has been verified by running its handlers in Node
   against a DOM shim. That catches logic errors, but it cannot see the things
   only a real browser knows: whether the console is clean, whether a form field
   actually exists in the markup, whether a click handler is reachable, whether
   the layout scrolls sideways.

   So the same assertions run here, in Chrome, against the real DOM, and report
   on screen. Anyone — or any agent looking at the page — can read the result
   without knowing anything about the codebase.

   It is inert unless ?selftest=1 is in the URL, so the shipped simulator carries
   no trace of it.

   IT MUTATES THE SANDBOX. It posts payments, generates leases, moves people in
   and out. That is the point — a test that avoids side effects tests nothing —
   and it is safe because the sandbox is memory only: a reload puts everything
   back. The panel says so, and offers the reload.
   ============================================================================ */

(function () {
  if (new URLSearchParams(location.search).get('selftest') !== '1') return;

  /* Console noise is one of the things only the browser can tell us, so it is
     captured from the moment this file loads rather than only during the run. */
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
  window.addEventListener('unhandledrejection', function (e) {
    consoleErrors.push('unhandled rejection: ' + e.reason);
  });

  const results = [];
  let failures = 0;
  function ok(pass, label, detail) {
    if (!pass) failures++;
    results.push({ pass: !!pass, label: label, detail: detail || '' });
  }
  function group(name) { results.push({ group: name }); }

  const $ = function (c) { return afFmtMoney(c); };
  const bal = function (id) { return afAccountBalance(id); };

  /* Sets a form field the way a person would, including the input event, so any
     oninput handler runs. Returns false if the field is not in the DOM — which
     is itself a finding a Node shim can never produce, because the shim invents
     an element for every id you ask it for. */
  function fill(id, value) {
    const el = document.getElementById(id);
    if (!el) return false;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  /* afOpenModal is deliberately NOT stubbed. The whole reason this file exists
     is to find out whether the real modal puts its real fields into the real
     DOM, and a stub that captures the body string instead of inserting it would
     make every field check fail for a reason that has nothing to do with the
     application. Node cannot catch that class of bug; this can, but only by
     letting the product render.

     afConfirm and simToast ARE captured, because an assertion needs to read
     what they said. afConfirm is not auto-confirmed — the callers that matter
     here pass a no-op — so nothing is driven that a person would not drive. */
  let lastToast = null, lastConfirm = null;
  function stubChrome() {
    window.__afConfirm = window.afConfirm;
    window.__simToast = window.simToast;
    window.afConfirm = function (o) { lastConfirm = o; };
    window.simToast = function (m) { lastToast = m; };
  }
  function restoreChrome() {
    window.afConfirm = window.__afConfirm;
    window.simToast = window.__simToast;
  }

  function run() {
    /* ---------------- shell ---------------- */
    group('Shell and chassis');
    ok(!document.querySelector('.af-nav'), 'the old horizontal nav is gone');
    ok(!!document.getElementById('afSidebar'), 'the dark sidebar exists');
    ok(!!document.getElementById('afRail'), 'the right rail exists');
    ok(!document.querySelector('.af-new'), 'there is no global + New button');
    /* Rebuilt from the 2026 screenshots: ten sections, a light sidebar, the
       vertical panel strip, and a topbar carrying Add Functionality rather
       than the Customer Service entry this module had invented. */
    ok(!!document.querySelector('.af-railstrip'), 'the Assistant / Tasks / Support strip exists');
    ok(document.querySelectorAll('.af-railstrip .af-strip-btn').length === 3,
       'it carries three panels',
       document.querySelectorAll('.af-railstrip .af-strip-btn').length + ' buttons');
    ok(document.body.innerHTML.indexOf('Add Functionality') > -1, 'the topbar has Add Functionality');
    /* Read the MENUS, not document.body.innerHTML. innerHTML carries comments,
       and the top bar's own comment explains that there is no Customer Service
       entry — so the substring scan failed on the sentence documenting its
       absence. The menu itself has never existed. */
    ok(Array.prototype.slice.call(document.querySelectorAll('.af-topmenu'))
         .every(function (b) { return (b.textContent || '').indexOf('Customer Service') < 0; }),
       'and no Customer Service menu, which the real product does not have');
    ok((document.getElementById('afGlobalSearch') || {}).placeholder === 'Search AppFolio',
       'the search field says Search AppFolio',
       (document.getElementById('afGlobalSearch') || {}).placeholder);
    /* Reading the painted colour back is the only way to know the token swap
       actually reached the element. */
    (function () {
      const sb = document.getElementById('afSidebar');
      const bg = sb ? getComputedStyle(sb).backgroundColor : '';
      const m = bg.match(/\d+/g);
      const light = m && (+m[0] + +m[1] + +m[2]) / 3 > 200;
      ok(!!light, 'the sidebar is light, not dark', bg);
    })();
    ok(AF_NAV.length === 10, 'ten navigation sections', String(AF_NAV.length));
    (function () {
      const n = AF_REPORT_INDEX.reduce(function (a, g) { return a + g.reports.length; }, 0);
      ok(n >= 130, 'the report index carries the full set', String(n));
    })();
    const secs = document.querySelectorAll('#afSidebar .af-sb-item');
    ok(secs.length >= 8, 'the sidebar lists its sections', secs.length + ' entries');
    ['properties', 'residents', 'leasing', 'maintenance'].forEach(function (s) {
      ok(!!document.querySelector('a[data-section="' + s + '"]'),
         'a[data-section="' + s + '"] is in the DOM', 'the four lesson walkthroughs select on these');
    });

    /* Only a browser can measure this. */
    group('Layout');
    const bodyOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    ok(window.innerWidth < 320 || bodyOverflow <= 0, 'no horizontal scroll on the body at ' + window.innerWidth + 'px',
       bodyOverflow > 0 ? bodyOverflow + 'px of overflow' : 'clean');
    const rail = document.getElementById('afRail');
    ok(window.innerWidth < 1360 || !rail.hidden, 'the rail is visible at this width',
       'viewport ' + window.innerWidth + 'px');

    /* ---------------- money ---------------- */
    group('Trust accounting');
    const ownerSum = afAllOwners().reduce(function (s, o) { return s + afOwnerAvailableCash(o.id).held; }, 0);
    ok(ownerSum === bal(AF_ACCT.trust), 'the trust account equals the sum of owner sub-balances',
       $(ownerSum) + ' vs ' + $(bal(AF_ACCT.trust)));
    ok(afAuditMoney().length === 0, 'the money audit is clean',
       JSON.stringify(afAuditMoney()).slice(0, 140));
    ok(afAuditIntegrity().length === 0, 'no broken references',
       JSON.stringify(afAuditIntegrity()).slice(0, 140));

    group('Posting a payment');
    const lease = afAllLeases().find(function (l) { return l.status === 'active' && l.balanceCents > 0; });
    if (!lease) { ok(false, 'a delinquent lease exists to pay', 'none found'); }
    else {
      afModalPostPayment(lease.id);
      const hasForm = ['afPayLease', 'afPayAmt', 'afPayMethod', 'afPayDate']
        .filter(function (id) { return !document.getElementById(id); });
      ok(hasForm.length === 0, 'the payment form renders all its fields',
         hasForm.length ? 'missing: ' + hasForm.join(', ') : 'afPayLease, afPayAmt, afPayMethod, afPayDate');

      if (!hasForm.length) {
        const trBefore = bal(AF_ACCT.trust), opBefore = bal(AF_ACCT.operating);
        const balBefore = afGetLease(lease.id).balanceCents;
        fill('afPayLease', lease.id); fill('afPayAmt', '500.00');
        fill('afPayMethod', 'ACH'); fill('afPayDate', afToday());
        stubChrome(); afSavePayment(); restoreChrome();

        ok(afGetLease(lease.id).balanceCents === balBefore - 50000,
           'the balance drops by exactly $500', $(balBefore) + ' -> ' + $(afGetLease(lease.id).balanceCents));
        ok(bal(AF_ACCT.trust) > trBefore, 'trust receives the rent', $(trBefore) + ' -> ' + $(bal(AF_ACCT.trust)));
        ok(bal(AF_ACCT.operating) > opBefore, 'operating receives the management fee',
           $(opBefore) + ' -> ' + $(bal(AF_ACCT.operating)));
        ok(afAuditMoney().length === 0, 'the books still balance afterwards');
      }
      afCloseModal();
    }

    /* ---------------- the lease lifecycle ---------------- */
    group('Lease lifecycle');
    const app = afAllApplications().find(function (a) {
      const u = afGetUnit(a.unitId);
      return u && String(u.status).indexOf('vacant') === 0 &&
             (a.status === 'approved' || a.status === 'conditional');
    });
    if (!app) { ok(false, 'an approved application on a vacant unit exists', 'none found'); }
    else {
      const unitBefore = afGetUnit(app.unitId).status;
      stubChrome();
      afGenerateLease(app.id);
      const newLease = afAllLeases().find(function (l) { return l.applicationId === app.id; });
      ok(!!newLease, 'a lease is generated from the approved application', newLease ? newLease.id : 'none');

      if (newLease) {
        ok(newLease.status === 'pending' && newLease.signatureStatus === 'unsigned',
           'it starts pending and unsigned');
        ok(afGetUnit(app.unitId).status !== 'occupied',
           'generating does not occupy the unit', unitBefore + ' -> ' + afGetUnit(app.unitId).status);

        lastConfirm = null;
        afMoveIn(newLease.id);
        ok(!!lastConfirm && /Cannot move in/.test(lastConfirm.title),
           'move-in is refused before signing', lastConfirm ? lastConfirm.title : 'ALLOWED');

        afModalSignLease(newLease.id);
        ok(!!document.getElementById('afSignName'), 'the signing form renders');
        fill('afSignName', 'Not The Applicant');
        afSignLease(newLease.id);
        ok(afGetLease(newLease.id).signatureStatus === 'unsigned', 'a wrong name does not sign');
        fill('afSignName', newLease.applicantName);
        afSignLease(newLease.id);
        /* The resident signing no longer executes the lease on its own — it
           hands it to the manager. A lease is executed when both parties have
           signed, so the flow is sign -> countersign -> move in. */
        ok(afGetLease(newLease.id).signatureStatus === 'resident-signed',
           'the right name signs it, and it moves to Ready to Countersign');
        afMoveIn(newLease.id);
        ok(afGetLease(newLease.id).status !== 'active',
           'move-in is refused while the lease is only half signed');
        afCountersignLease(newLease.id);
        ok(afGetLease(newLease.id).signatureStatus === 'executed',
           'countersigning executes it');

        afModalCollectDeposit(newLease.id);
        ok(!!document.getElementById('afDepAmt'), 'the deposit form renders');
        const sdBefore = bal(AF_ACCT.deposit);
        fill('afDepAmt', (newLease.depositDue / 100).toFixed(2));
        afCollectDeposit(newLease.id);
        ok(bal(AF_ACCT.deposit) === sdBefore + newLease.depositDue,
           'the deposit lands in escrow', $(sdBefore) + ' -> ' + $(bal(AF_ACCT.deposit)));
        ok(afAuditMoney().length === 0, 'M4 stays balanced — both sides moved together',
           JSON.stringify(afAuditMoney()).slice(0, 120));

        afMoveIn(newLease.id);
        ok(afGetLease(newLease.id).status === 'active', 'move-in activates the lease');
        ok(afGetUnit(app.unitId).status === 'occupied', 'and occupies the unit');
        ok(afAuditIntegrity().length === 0, 'no orphans after move-in');
      }
      restoreChrome();
      afCloseModal();
    }

    /* ---------------- maintenance ---------------- */
    group('Vendor invoice and who pays');
    const wo = afAllWorkOrders().find(function (w) {
      return !w.invoiceNumber && (w.status === 'in-progress' || w.status === 'scheduled' || w.status === 'assigned');
    });
    if (!wo) { ok(false, 'an open work order exists to invoice', 'none found'); }
    else {
      stubChrome();
      afModalEnterInvoice(wo.id);
      const invFields = ['afInvAmount', 'afInvNumber', 'afInvBillTo', 'afInvReason']
        .filter(function (id) { return !document.getElementById(id); });
      ok(invFields.length === 0, 'the invoice form renders all its fields',
         invFields.length ? 'missing: ' + invFields.join(', ') : 'all four present');

      if (!invFields.length) {
        fill('afInvAmount', '250.00'); fill('afInvNumber', '');
        fill('afInvBillTo', 'owner'); fill('afInvReason', 'End of life failure.');
        afEnterInvoice(wo.id);
        ok(!afGetWorkOrder(wo.id).invoiceNumber, 'a missing invoice number is refused', lastToast);

        const trBefore = bal(AF_ACCT.trust);
        fill('afInvNumber', 'SELFTEST-1');
        afEnterInvoice(wo.id);
        ok(afGetWorkOrder(wo.id).billTo === 'owner', 'billed to the owner');
        ok(bal(AF_ACCT.trust) === trBefore - 25000, 'trust pays it',
           $(trBefore) + ' -> ' + $(bal(AF_ACCT.trust)));
        ok(afAuditMoney().length === 0, 'the books balance after the invoice');
      }
      restoreChrome();
      afCloseModal();
    }

    /* ---------------- every route ---------------- */
    group('Routing');
    const broken = [];
    Object.keys(AF_VIEWS).forEach(function (v) {
      const before = afState.view;
      try {
        afState.view = v;
        const out = AF_VIEWS[v]();
        if (/view not found/i.test(out)) broken.push(v);
      } catch (e) { broken.push(v + ' (' + e.message + ')'); }
      afState.view = before;
    });
    ok(broken.length === 0, Object.keys(AF_VIEWS).length + ' routes render without throwing',
       broken.join(', '));

    group('Console');
    ok(consoleErrors.length === 0, 'no console errors or warnings during load and run',
       consoleErrors.slice(0, 4).join(' | '));

    render();
  }

  function render() {
    const panel = document.createElement('div');
    panel.className = 'af-selftest';
    panel.innerHTML =
      '<header class="' + (failures ? 'bad' : 'good') + '">' +
        '<b>' + (failures ? failures + ' FAILURE' + (failures === 1 ? '' : 'S') : 'ALL PASS') + '</b>' +
        '<span>' + results.filter(function (r) { return r.pass; }).length + ' checks passed · ' +
        window.innerWidth + '×' + window.innerHeight + '</span>' +
        '<button type="button" onclick="location.reload()">Reload &amp; reset</button>' +
        '<button type="button" onclick="this.closest(\'.af-selftest\').remove()">Close</button>' +
      '</header>' +
      '<div class="af-selftest-body">' +
        results.map(function (r) {
          if (r.group) return '<h4>' + r.group + '</h4>';
          return '<div class="' + (r.pass ? 'p' : 'f') + '">' +
            '<span>' + (r.pass ? 'PASS' : 'FAIL') + '</span>' +
            '<div><b>' + r.label + '</b>' +
            (r.detail ? '<em>' + String(r.detail).replace(/</g, '&lt;') + '</em>' : '') + '</div></div>';
        }).join('') +
      '</div>' +
      '<footer>This run modified the sandbox. It lives in memory only — reload to put it back.</footer>';
    document.body.appendChild(panel);
  }

  /* After the app has booted and painted, so every target exists to be measured. */
  window.addEventListener('load', function () {
    setTimeout(function () {
      try { run(); }
      catch (e) {
        ok(false, 'the self test itself threw', e.message + ' @ ' + (e.stack || '').split('\n')[1]);
        render();
      }
    }, 300);
  });
})();
