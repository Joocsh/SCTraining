/* ══════════════════════════════════════════════════════════
   QuickBooks Online test drive: the rest of the apps and the
   gear-menu pages (prefix qbm-).
   Part A: Payroll, Team, Time, Inventory, Sales Tax, Business Tax,
           Lending, Marketing.
   Part B: Settings, Manage users, Custom form styles, Workers' comp,
           Lists, Attachments, Custom fields, Reclassify, Import,
           Export, Audit log, Resolution center, Billing.
   Numbers are computed live from QB.store / QB.ledger.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var QB = window.QB, U = QB.util, S = QB.store, L = QB.ledger, UI = QB.ui;
  var ic = UI.icon;

  /* View state kept across re-renders (re-render happens after every store change). */
  var V = {
    timeLaunched: false, timeRange: 'all', weekOffset: 0, shifts: [], labels: [], poStatus: 'all', empFilter: 'active',
    taxSetup: false, taxTab: 'returns', taxReturn: null, taxFreq: { ca: 'Quarterly', az: 'Quarterly' },
    btPaid: {}, tsRange: 'this-year-to-date', tsOpen: {}, campaigns: []
  };
  /* Shared with part B. */
  var K = QB._qbm = { V: V, ACT: {} };
  var ACT = K.ACT;
  QB.on('qbm', function (arg, el) {
    var p = arg.split(':'), f = ACT[p[0]];
    if (f) return f(p.slice(1), el);
    console.warn('No qbm action', arg);
  });

  /* ───────── helpers ───────── */
  function head(title, actions, opts) { opts = opts || {}; opts.actions = actions || ''; return UI.pageHead(title, opts); }
  function changed(why) { S.changed(why || 'more'); }
  function empty(o) {
    return '<div class="qbm-empty' + (o.cls ? ' ' + o.cls : '') + '"><div class="qbm-empty-art">' + (o.art || QB.art('empty')) + '</div><h2>' + o.title + '</h2>' + (o.text ? '<p>' + o.text + '</p>' : '') + '<div class="qbm-empty-acts">' + (o.actions || '') + '</div></div>';
  }
  function card(title, body, opts) {
    opts = opts || {};
    return '<section class="qbm-card' + (opts.cls ? ' ' + opts.cls : '') + '">' + (title ? '<div class="qbm-card-head"><h3>' + title + '</h3><span class="qb-grow"></span>' + (opts.right || '') + '</div>' : '') + body + '</section>';
  }
  function pills(list) {
    return '<div class="qbm-create"><h2>Create actions</h2><div class="qbm-pills">' + list.map(function (c) { return '<button type="button" class="qbm-pill' + (c[2] ? ' qbm-pill-all' : '') + '" data-act="' + c[1] + '">' + c[0] + '</button>'; }).join('') + '</div></div>';
  }
  function miniTable(cols, rows, emptyText) {
    return '<table class="qbm-mini"><thead><tr>' + cols.map(function (c) { return '<th' + (c[1] ? ' class="ta-r"' : '') + '>' + c[0] + '</th>'; }).join('') + '</tr></thead><tbody>' +
      (rows.length ? rows.map(function (r) { return '<tr>' + r.map(function (v, i) { return '<td' + (cols[i] && cols[i][1] ? ' class="ta-r"' : '') + '>' + v + '</td>'; }).join('') + '</tr>'; }).join('') :
        '<tr><td colspan="' + cols.length + '" class="qbm-mini-empty">' + (emptyText || 'Data appears once it\'s available.') + '</td></tr>') + '</tbody></table>';
  }
  function money(n) { return U.money(n); }
  function plTotals(from, to) {
    var inc = 0, cogs = 0, exp = 0, oinc = 0, oexp = 0;
    S.accounts.forEach(function (a) {
      if (a.parent) return;
      var b = 0;
      if (['Income', 'Other Income', 'Cost of Goods Sold', 'Expenses', 'Other Expense'].indexOf(a.type) < 0) return;
      b = L.balance(a.id, { from: from, to: to });
      if (a.type === 'Income') inc += b; else if (a.type === 'Other Income') oinc += b;
      else if (a.type === 'Cost of Goods Sold') cogs += b; else if (a.type === 'Expenses') exp += b; else oexp += b;
    });
    return { inc: U.r2(inc), cogs: U.r2(cogs), exp: U.r2(exp), oinc: U.r2(oinc), oexp: U.r2(oexp), net: U.r2(inc + oinc - cogs - exp - oexp) };
  }
  function hoursOf(t) { return +(t.hours || (t.lines && t.lines[0] && t.lines[0].qty) || 0); }
  function hm(h) { var m = Math.round(h * 60); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); }
  function itemLabel(it) { return it ? (it.category ? it.category + ':' : '') + it.name : 'Not specified'; }
  function openFormOr(type, opts, fallback) {
    if (QB.forms[type] || !fallback) return QB.openForm(type, opts);
    return fallback(opts || {});
  }
  function custOptions(blank) {
    return (blank ? [['', blank]] : []).concat(QB.lists.customers().map(function (c) { return [c.value, (c.depth ? '— ' : '') + c.label]; }));
  }
  function err(inp, on) { if (inp) inp.classList.toggle('is-err', !!on); return !on; }
  function val(root, name) { var e = root.querySelector('[name="' + name + '"]'); return e ? (e.type === 'checkbox' ? e.checked : e.value.trim()) : ''; }
  K.head = head; K.changed = changed; K.empty = empty; K.card = card; K.miniTable = miniTable; K.plTotals = plTotals; K.val = val; K.err = err; K.openFormOr = openFormOr; K.custOptions = custOptions;

  /* ═════════ Payroll ═════════ */
  var PLANS = [
    { name: 'Core', price: 50, per: 6.5, bullets: ['Full-service payroll with automated taxes and forms', 'Next-day direct deposit', 'Employee self-service portal', 'Health benefits and 401(k) plans', 'Pay contractors and e-file 1099s'] },
    { name: 'Premium', price: 88, per: 10, tag: 'Most popular', bullets: ['Everything in Core, plus:', 'Same-day direct deposit', 'Time tracking with QuickBooks Time', 'HR support center', 'Expert review of your payroll setup', "Workers' comp administration"] },
    { name: 'Elite', price: 134, per: 12, bullets: ['Everything in Premium, plus:', 'Tax penalty protection up to $25,000', 'Personal HR advisor', 'Project tracking and mileage tracking', '24/7 expert product support'] }
  ];
  QB.view('payroll-signup', function (p, el) {
    el.innerHTML = '<div class="qbm-pay">' +
      '<div class="qbm-pay-hero"><div><span class="qbm-kicker">' + ic('diamond') + ' QuickBooks Payroll</span><h1>Payroll that runs itself, so you can run your business</h1>' +
      '<p>Pay your team, file payroll taxes automatically, and offer benefits, all in the same place you keep your books.</p></div>' + QB.art('sitting') + '</div>' +
      '<div class="qbm-plans">' + PLANS.map(function (pl) {
        return '<div class="qbm-plan' + (pl.tag ? ' is-pop' : '') + '">' + (pl.tag ? '<span class="qbm-plan-tag">' + pl.tag + '</span>' : '') +
          '<h2>' + pl.name + '</h2><div class="qbm-plan-price"><b>$' + pl.price + '</b><span>/mo</span></div><div class="qbm-plan-per">plus $' + pl.per.toFixed(2) + '/employee per month</div>' +
          UI.btn('Try it free', { kind: 'primary', act: 'qbm:paytry:' + pl.name, cls: 'qbm-plan-btn' }) + UI.btn('Buy now', { kind: 'secondary', act: 'qbm:paytry:' + pl.name, cls: 'qbm-plan-btn' }) +
          '<ul>' + pl.bullets.map(function (b) { return '<li>' + ic('check') + '<span>' + U.esc(b) + '</span></li>'; }).join('') + '</ul></div>';
      }).join('') + '</div>' +
      '<h2 class="qbm-sec-title">Compare plans</h2>' +
      miniTable([['Feature'], ['Core'], ['Premium'], ['Elite']], [
        ['Automated payroll taxes and forms', ic('check'), ic('check'), ic('check')],
        ['Direct deposit', 'Next-day', 'Same-day', 'Same-day'],
        ['Time tracking', '—', ic('check'), ic('check')],
        ['HR support', '—', 'HR support center', 'Personal HR advisor'],
        ['Tax penalty protection', '—', '—', 'Up to $25,000'],
        ['Expert setup review', '—', ic('check'), ic('check')]
      ]) +
      '<p class="qb-muted qbm-fine">Prices are shown for practice only. Payroll is not available in the test drive.</p></div>';
  });
  ACT.paytry = function (a) {
    UI.modal('Payroll isn\'t available in the test drive', '<p>The sample company can\'t run payroll. In your own QuickBooks company you can start a free 30-day trial of QuickBooks Payroll ' + U.esc(a[0] || '') + ' and run your first payroll in minutes.</p><p class="qb-muted">Meanwhile you can still add employees under Team and track their time.</p>',
      { buttons: [['Go to Employees', 'secondary', function () { QB.go('employees'); }], ['Got it', 'primary']] });
  };

  /* ═════════ Team: Employees ═════════ */
  function payText(e) { var r = +e.rate || 0; return e.payType === 'Salary' ? money(r) + '/yr' : e.payType === 'Commission only' ? 'Commission only' : money(r) + '/hr'; }
  QB.view('employees', function (p, el) {
    var fb = '<button type="button" class="qb-feedback" data-act="shell:feedback">' + ic('comment') + '<span>Give Feedback</span></button>';
    if (!S.employees.length) {
      el.innerHTML = head('Employees', fb) +
        '<div class="qbm-team-empty"><div class="qbm-team-art">' + QB.art('laptop') + '</div><h2>Ready to build your team?</h2>' +
        '<p>Everything you need to manage your team—from onboarding to offboarding—is right here. Add your first team member to get started.</p>' +
        UI.btn('Get started', { kind: 'primary', act: 'qbm:emp:new' }) + '</div>';
      return;
    }
    var list = S.employees.filter(function (e) { return V.empFilter === 'all' || e.status === 'Active'; });
    el.innerHTML = head('Employees', fb + UI.btn('Add employee', { kind: 'primary', act: 'qbm:emp:new' })) +
      '<div class="qb-filters">' + UI.field('Show', UI.select('empFilter', [['active', 'Active employees'], ['all', 'All employees']], V.empFilter)) + '</div><div class="qbm-tbl"></div>';
    el.querySelector('[name=empFilter]').onchange = function () { V.empFilter = this.value; QB.render(); };
    UI.table(el.querySelector('.qbm-tbl'), [
      { key: 'name', label: 'Name', render: function (e) { return '<button type="button" class="qb-link" data-act="qbm:emp:edit:' + e.id + '">' + U.esc(e.name) + '</button>'; } },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'payType', label: 'Pay type' },
      { key: 'rate', label: 'Pay rate', align: 'right', render: payText },
      { key: 'hire', label: 'Hire date', render: function (e) { return U.fmtDate(e.hire); } },
      { key: 'status', label: 'Status' },
      { key: 'act', label: 'Action', sort: false, align: 'right', render: function (e) { return '<span class="qb-act"><button type="button" class="qb-link" data-act="qbm:emp:edit:' + e.id + '">Edit</button><button type="button" class="qb-act-caret" data-act="qbm:emp:menu:' + e.id + '" aria-label="More">' + ic('caretDown') + '</button></span>'; } }
    ], list, { sortKey: 'name', empty: 'No employees match this filter.' });
  });
  ACT.emp = function (a, el) {
    var e = a[1] ? S.employees.filter(function (x) { return x.id === a[1]; })[0] : null;
    if (a[0] === 'menu') return UI.menu(el, [[e.status === 'Active' ? 'Make inactive' : 'Make active', 'qbm:emp:toggle:' + e.id], ['Delete', 'qbm:emp:del:' + e.id]]);
    if (a[0] === 'toggle') { e.status = e.status === 'Active' ? 'Inactive' : 'Active'; UI.toast(e.name + ' is now ' + e.status.toLowerCase() + '.'); return changed(); }
    if (a[0] === 'del') return UI.confirm('Delete employee?', 'Delete ' + e.name + '? This can\'t be undone in the test drive.', 'Delete', function () { S.employees.splice(S.employees.indexOf(e), 1); UI.toast('Employee deleted.'); changed(); });
    var d = UI.drawer(e ? 'Edit employee' : 'Add employee',
      '<div class="qbm-form">' +
      '<div class="qbm-row2">' + UI.field('First name *', UI.input('first', e && e.first)) + UI.field('Last name *', UI.input('last', e && e.last)) + '</div>' +
      UI.field('Email', UI.input('email', e && e.email, ' type="email" placeholder="name@example.com"')) +
      UI.field('Phone', UI.input('phone', e && e.phone)) +
      UI.field('Hire date', UI.dateInput('hire', e ? e.hire : U.today())) +
      '<h4 class="qbm-sub">Pay</h4><div class="qbm-row2">' + UI.field('Pay type', UI.select('payType', ['Hourly', 'Salary', 'Commission only'], e ? e.payType : 'Hourly')) +
      UI.field('Rate', UI.input('rate', e ? e.rate : '', ' inputmode="decimal" placeholder="0.00"')) + '</div>' +
      '<p class="qb-muted">Running payroll needs a QuickBooks Payroll subscription. You can still track time for this employee.</p></div>',
      {
        onSave: function (dr) {
          var f = val(dr, 'first'), l = val(dr, 'last'), em = val(dr, 'email');
          var ok = err(dr.querySelector('[name=first]'), !f) & err(dr.querySelector('[name=last]'), !l) & err(dr.querySelector('[name=email]'), em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em));
          if (!ok) { UI.toast('Fill in the required fields.', 'err'); return false; }
          var o = e || { id: U.uid('emp'), status: 'Active' };
          o.first = f; o.last = l; o.name = f + ' ' + l; o.email = em; o.phone = val(dr, 'phone');
          o.hire = U.parseDate(val(dr, 'hire')) || U.today(); o.payType = val(dr, 'payType'); o.rate = U.parseMoney(val(dr, 'rate'));
          if (!e) S.employees.push(o);
          UI.toast(e ? 'Employee saved.' : o.name + ' was added to your team.');
          changed();
        }
      });
    return d;
  };

  /* ═════════ Team: Contractors ═════════ */
  QB.view('team-contractors', function (p, el) {
    var rows = S.contractors.map(function (c, i) { return Object.assign({ id: 'ct' + i, idx: i }, c); });
    var paid = rows.reduce(function (s, c) { return s + (+c.paid || 0); }, 0);
    el.innerHTML = head('Contractors', UI.feedbackLink() + UI.btn('Prepare 1099s', { kind: 'secondary', act: 'go:1099FilingDetails' }) + UI.btn('Add contractor', { kind: 'primary', act: 'qbm:ctr:new' })) +
      '<div class="qbm-statrow"><div><b>' + rows.length + '</b><span>Contractors</span></div><div><b>' + money(paid) + '</b><span>Paid this year</span></div><div><b>' + rows.filter(function (c) { return c.w9 !== 'Received'; }).length + '</b><span>Missing W-9 info</span></div></div>' +
      '<div class="qbm-tbl"></div>';
    UI.table(el.querySelector('.qbm-tbl'), [
      { key: 'name', label: 'Contractor', render: function (c) { return '<b>' + U.esc(c.name) + '</b>'; } },
      { key: 'email', label: 'Email', render: function (c) { return c.email ? U.esc(c.email) : '<span class="qb-muted">Not provided</span>'; } },
      { key: 'w9', label: 'W-9 info', render: function (c) { return '<span class="qbm-tag qbm-tag-' + (c.w9 === 'Received' ? 'ok' : c.w9 === 'Requested' ? 'info' : 'warn') + '">' + U.esc(c.w9 || 'Not requested') + '</span>'; } },
      { key: 'paid', label: 'Paid this year', align: 'right', render: function (c) { return money(c.paid || 0); } },
      { key: 'act', label: 'Action', sort: false, align: 'right', render: function (c) { return '<span class="qb-act"><button type="button" class="qb-link" data-act="form:Check">Pay</button><button type="button" class="qb-act-caret" data-act="qbm:ctr:menu:' + c.idx + '" aria-label="More">' + ic('caretDown') + '</button></span>'; } }
    ], rows, { sortKey: 'name', empty: 'No contractors yet. Add one to pay them and prepare 1099s.' });
  });
  ACT.ctr = function (a, el) {
    var c = S.contractors[+a[1]];
    if (a[0] === 'new') return openFormOr('Contractor', {}, function () { contractorDrawer(); });
    if (a[0] === 'menu') return UI.menu(el, [['Request W-9 info', 'qbm:ctr:w9:' + a[1]], ['Edit', 'qbm:ctr:edit:' + a[1]], ['Delete', 'qbm:ctr:del:' + a[1]]]);
    if (a[0] === 'w9') { if (c.w9 !== 'Received') c.w9 = 'Requested'; UI.toast('W-9 request recorded for ' + c.name + '. No email is sent from the test drive.'); return changed(); }
    if (a[0] === 'edit') return contractorDrawer(c);
    if (a[0] === 'del') return UI.confirm('Delete contractor?', 'Remove ' + c.name + ' from your contractors?', 'Delete', function () { S.contractors.splice(+a[1], 1); changed(); });
  };
  function contractorDrawer(c) {
    UI.drawer(c ? 'Edit contractor' : 'Add contractor', '<div class="qbm-form">' + UI.field('Name *', UI.input('name', c && c.name)) + UI.field('Email', UI.input('email', c && c.email)) +
      UI.field('W-9 info', UI.select('w9', ['Not requested', 'Requested', 'Received'], c ? c.w9 : 'Not requested')) + '</div>', {
      onSave: function (d) {
        var n = val(d, 'name'); if (!err(d.querySelector('[name=name]'), !n)) return false;
        var o = c || { paid: 0 }; o.name = n; o.email = val(d, 'email'); o.w9 = val(d, 'w9');
        if (!c) S.contractors.push(o);
        UI.toast(c ? 'Contractor saved.' : 'Contractor added.'); changed();
      }
    });
  }

  /* ═════════ Time ═════════ */
  QB.view('time', function (p, el) {
    if (!V.timeLaunched) {
      el.innerHTML = '<div class="qbm-time-hero">' + UI.hero({
        grey: true, title: 'Supercharge your time', lead: 'Get ready to track time, manage projects, and so much more with QuickBooks Time.',
        body: '<div class="qbm-feats">' +
          '<div><b>View your team\'s location</b><p>Use the mobile app with GPS to see where workers are, no matter where they roam.</p></div>' +
          '<div><b>Manage time for projects</b><p>Create tasks within projects, assign them to workers, and track time against them.</p></div>' +
          '<div><b>Track time from any device</b><p>Trust automated time tracking to keep your timesheets accurate and payroll painless.</p></div></div>',
        actions: UI.btn('Launch QuickBooks Time', { kind: 'primary', act: 'qbm:timelaunch' }), art: QB.art('phone')
      }) + '</div>';
      return;
    }
    var r = U.range(V.timeRange);
    var rows = S.find(function (t) { return (t.type === 'Time Charge' || t.type === 'Time Activity') && t.date >= r[0] && t.date <= r[1]; }).map(function (t) {
      var ln = t.lines[0] || {}, it = S.item[ln.item], emp = t.employee && S.employees.filter(function (e) { return e.id === t.employee; })[0];
      return { id: t.id, t: t, date: t.date, emp: emp ? emp.name : (t.employeeName || t.payeeName || 'Craig Carlson'), cust: S.custName(t.cust), service: it ? it.name : '', desc: ln.desc || t.memo || '', hours: hoursOf(t), billable: t.billable !== false && !!t.cust, rate: ln.rate || 0, amount: t.total || 0, status: L.status(t).text || t.status || '' };
    });
    var hrs = rows.reduce(function (s, x) { return s + x.hours; }, 0), amt = rows.reduce(function (s, x) { return s + x.amount; }, 0);
    el.innerHTML = head('Time entries', UI.btn('QuickBooks Time overview', { kind: 'tertiary', act: 'qbm:timeback' }) + UI.split('Add time', [['Single time activity', 'form:Single time activity'], ['Weekly timesheet', 'form:Weekly timesheet']], { act: 'form:Single time activity' })) +
      '<div class="qbm-statrow"><div><b>' + hm(hrs) + '</b><span>Hours</span></div><div><b>' + money(amt) + '</b><span>Billable amount</span></div><div><b>' + rows.filter(function (x) { return x.status === 'Open'; }).length + '</b><span>Not yet invoiced</span></div></div>' +
      '<div class="qb-filters">' + UI.field('Date', UI.select('timeRange', U.RANGES, V.timeRange)) + '</div><div class="qbm-tbl"></div>';
    el.querySelector('[name=timeRange]').onchange = function () { V.timeRange = this.value; QB.render(); };
    UI.table(el.querySelector('.qbm-tbl'), [
      { key: 'date', label: 'Date', render: function (x) { return U.fmtDate(x.date); } },
      { key: 'emp', label: 'Name' }, { key: 'cust', label: 'Customer' }, { key: 'service', label: 'Service' },
      { key: 'desc', label: 'Description' },
      { key: 'hours', label: 'Duration', align: 'right', render: function (x) { return hm(x.hours); } },
      { key: 'billable', label: 'Billable', render: function (x) { return x.billable ? 'Yes' : 'No'; } },
      { key: 'rate', label: 'Rate', align: 'right', render: function (x) { return U.num(x.rate); } },
      { key: 'amount', label: 'Amount', align: 'right', render: function (x) { return U.num(x.amount); } },
      { key: 'status', label: 'Status' }
    ], rows, { sortKey: 'date', sortDir: 'desc', rowAct: function (x) { return 'txn:' + x.id; }, empty: 'No time entries for these dates.', footer: '<tr><td colspan="5">Total</td><td class="ta-r">' + hm(hrs) + '</td><td></td><td></td><td class="ta-r">' + U.num(amt) + '</td><td></td></tr>' });
  });
  ACT.timelaunch = function () { V.timeLaunched = true; QB.render(); };
  ACT.timeback = function () { V.timeLaunched = false; QB.render(); };

  /* ═════════ Schedule ═════════ */
  var TIMES = (function () { var o = []; for (var m = 6 * 60; m <= 22 * 60; m += 30) { var h = Math.floor(m / 60), mm = m % 60; o.push([String(m), ((h + 11) % 12 + 1) + ':' + String(mm).padStart(2, '0') + (h < 12 ? ' AM' : ' PM')]); } return o; })();
  function tLabel(m) { var t = TIMES.filter(function (x) { return x[0] === String(m); })[0]; return t ? t[1] : ''; }
  function team() { return [{ id: 'me', name: 'Craig Carlson' }].concat(S.employees.filter(function (e) { return e.status === 'Active'; }).map(function (e) { return { id: e.id, name: e.name }; })); }
  function weekStart() { var t = U.today(), d = U.toDate(t); return U.addDays(t, -d.getDay() + 7 * V.weekOffset); }
  QB.view('schedule', function (p, el) {
    var ws = weekStart(), days = [], i;
    for (i = 0; i < 7; i++) days.push(U.addDays(ws, i));
    var inWeek = V.shifts.filter(function (s) { return s.date >= days[0] && s.date <= days[6]; });
    var mem = team();
    var hrs = inWeek.reduce(function (s, x) { return s + (x.end - x.start) / 60; }, 0);
    var grid = '<div class="qbm-sched"><div class="qbm-sched-row qbm-sched-head"><div class="qbm-sched-name">Team member</div>' + days.map(function (d) {
      var dt = U.toDate(d);
      return '<div class="qbm-sched-day' + (d === U.today() ? ' is-today' : '') + '"><span>' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()] + '</span><b>' + dt.getDate() + '</b></div>';
    }).join('') + '</div>' + mem.map(function (m) {
      return '<div class="qbm-sched-row"><div class="qbm-sched-name"><span class="qbm-av">' + U.esc(m.name.charAt(0)) + '</span>' + U.esc(m.name) + '</div>' + days.map(function (d) {
        var ss = inWeek.filter(function (s) { return s.member === m.id && s.date === d; });
        return '<div class="qbm-sched-cell" data-act="qbm:shift:new:' + m.id + ':' + d + '">' + ss.map(function (s) {
          return '<button type="button" class="qbm-shift" style="background:' + s.color + '" data-act="qbm:shift:edit:' + s.id + '"><b>' + tLabel(s.start) + ' - ' + tLabel(s.end) + '</b><span>' + U.esc(s.cust ? S.custName(s.cust) : s.title || 'Shift') + '</span></button>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }).join('') + (inWeek.length ? '' : '<div class="qbm-sched-empty"><div>' + ic('calendar') + '<h3>No shifts scheduled for this week</h3><p>Add a shift to let your team know when and where to work.</p>' + UI.btn('Add shift', { kind: 'primary', act: 'qbm:shift:new' }) + '</div></div>') + '</div>';
    el.innerHTML = head('Schedule', UI.feedbackLink() + UI.btn('Add shift', { kind: 'primary', act: 'qbm:shift:new' })) +
      '<div class="qbm-weekbar"><button type="button" class="qb-icon-btn" data-act="qbm:week:-1" aria-label="Previous week">' + ic('caretLeft') + '</button>' +
      '<button type="button" class="qb-btn qb-btn-tertiary qb-btn-sm" data-act="qbm:week:0">Today</button>' +
      '<button type="button" class="qb-icon-btn" data-act="qbm:week:1" aria-label="Next week">' + ic('caretRight') + '</button>' +
      '<b>' + U.fmtDate(days[0], 'mon') + ' – ' + U.fmtDate(days[6], 'mon') + '</b><span class="qb-grow"></span><span class="qb-muted">' + inWeek.length + ' shift' + (inWeek.length === 1 ? '' : 's') + ' · ' + hm(hrs) + ' hours scheduled</span></div>' + grid;
  });
  ACT.week = function (a) { V.weekOffset = +a[0] === 0 ? 0 : V.weekOffset + (+a[0]); QB.render(); };
  var SHIFT_COLORS = ['#d7f0d1', '#d6ebfb', '#efe3fb', '#fde8cf', '#d4f3ef'];
  ACT.shift = function (a) {
    var s = a[0] === 'edit' ? V.shifts.filter(function (x) { return x.id === a[1]; })[0] : null;
    var mem = team();
    var m = UI.modal(s ? 'Edit shift' : 'Add shift', '<div class="qbm-form">' +
      UI.field('Team member', UI.select('member', mem.map(function (x) { return [x.id, x.name]; }), s ? s.member : (a[1] || 'me'))) +
      UI.field('Date', UI.dateInput('date', s ? s.date : (a[2] || U.today()))) +
      '<div class="qbm-row2">' + UI.field('Start time', UI.select('start', TIMES, s ? String(s.start) : '540')) + UI.field('End time', UI.select('end', TIMES, s ? String(s.end) : '1020')) + '</div>' +
      UI.field('Customer (optional)', UI.select('cust', custOptions('No customer'), s ? s.cust : '')) +
      UI.field('Title', UI.input('title', s ? s.title : '', ' placeholder="e.g. Weekly gardening"')) +
      UI.field('Notes', '<textarea class="qb-input" name="notes" rows="3">' + U.esc(s ? s.notes : '') + '</textarea>') + '</div>',
      {
        buttons: (s ? [['Delete', 'tertiary', function () { V.shifts.splice(V.shifts.indexOf(s), 1); UI.toast('Shift deleted.'); QB.render(); }]] : []).concat([['Cancel', 'secondary'], ['Save', 'primary', function (md) {
          var date = U.parseDate(val(md, 'date')), st = +val(md, 'start'), en = +val(md, 'end');
          if (!err(md.querySelector('[name=date]'), !date)) return false;
          if (en <= st) { UI.toast('End time must be after start time.', 'err'); return false; }
          var o = s || { id: U.uid('sh'), color: SHIFT_COLORS[V.shifts.length % SHIFT_COLORS.length] };
          o.member = val(md, 'member'); o.date = date; o.start = st; o.end = en; o.cust = val(md, 'cust'); o.title = val(md, 'title'); o.notes = val(md, 'notes');
          if (!s) V.shifts.push(o);
          var ws = weekStart(); if (date < ws || date > U.addDays(ws, 6)) V.weekOffset += Math.floor(U.diffDays(date, ws) / 7);
          UI.toast(s ? 'Shift updated.' : 'Shift added.');
          QB.render();
        }]])
      });
    return m;
  };

  /* ═════════ Inventory ═════════ */
  function invItems() { return S.items.filter(function (i) { return i.type === 'Inventory' && i.active; }); }
  function stockState(i) { var q = +i.qty || 0; if (q <= 0) return 'out'; if (i.reorder != null && i.reorder !== '' && q <= +i.reorder) return 'low'; return 'ok'; }
  function topSelling(days) {
    var r = [U.addDays(U.today(), -days), U.today()], by = {};
    S.find(function (t) { return (t.type === 'Invoice' || t.type === 'Sales Receipt') && t.date >= r[0] && t.date <= r[1]; }).forEach(function (t) {
      t.lines.forEach(function (l) {
        var k = l.item && S.item[l.item] ? l.item : '_none';
        var o = by[k] = by[k] || { id: k, name: k === '_none' ? 'Not specified' : itemLabel(S.item[k]), qty: 0, sales: 0 };
        o.qty += +l.qty || 0; o.sales += +l.amount || 0;
      });
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.sales - a.sales; });
  }
  QB.view('inventory-overview', function (p, el) {
    var items = invItems(), low = items.filter(function (i) { return stockState(i) === 'low'; }), out = items.filter(function (i) { return stockState(i) === 'out'; });
    var so = S.find(function (t) { return t.type === 'Sales Order' && (t.status || 'Open') !== 'Closed'; });
    var po = S.find(function (t) { return t.type === 'Purchase Order' && (t.status || 'Open') === 'Open'; });
    var top = topSelling(30).slice(0, 6);
    function stockRows(list) { return list.map(function (i) { return [U.esc(i.name), U.num(i.qty || 0).replace(/\.00$/, ''), '<button type="button" class="qb-link" data-act="qbm:po:item:' + i.id + '">Reorder</button>']; }); }
    var reports = [['Inventory valuation summary', 'Inventory Valuation Summary'], ['Inventory valuation detail', 'Inventory Valuation Detail'], ['Physical inventory worksheet', 'Physical Inventory Worksheet'], ['Products and services list', 'Product/Service List'], ['Sales by products - Summary', 'Sales by Product/Service Summary'], ['Open sales order by item', 'Open Sales Order by Item'], ['Open sales order by customer', 'Open Sales Order by Customer']];
    el.innerHTML = '<div class="qbm-ov">' + head('Inventory', UI.feedbackLink()) +
      pills([['Add product or service', 'new:item'], ['Create sales order', 'form:Sales Order'], ['Create purchase order', 'form:Purchase Order'], ['Adjust inventory', 'form:Inventory Qty Adjust'], ['Buy shipping label', 'qbm:label'], ['Show all', 'shell:create', true]]) +
      '<h2 class="qbm-glance">Inventory at a glance</h2><div class="qbm-grid3">' +
      card('LOW ON STOCK', '<div class="qbm-count qbm-c-orange">' + low.length + '</div>' + miniTable([['PRODUCT'], ['QTY', 1], ['ACTION', 1]], stockRows(low)) + '<div class="qbm-card-foot"><button type="button" class="qb-link" data-act="go:inventory">View all products</button></div>') +
      card('OUT OF STOCK', '<div class="qbm-count qbm-c-red">' + out.length + '</div>' + miniTable([['PRODUCT'], ['QTY', 1], ['ACTION', 1]], stockRows(out)) + '<div class="qbm-card-foot"><button type="button" class="qb-link" data-act="go:inventory">View all products</button></div>') +
      card('TOP SELLING PRODUCTS', '<div class="qbm-card-sub">Last 30 days</div>' + miniTable([['PRODUCT NAME'], ['QTY SOLD', 1], ['SALES', 1]], top.map(function (t) { return [U.esc(t.name), U.num(t.qty), U.num(t.sales)]; })) + '<div class="qbm-card-foot"><button type="button" class="qb-link" data-act="report:Sales by Product/Service Summary">View sales by products report</button></div>') +
      card('OPEN SALES ORDERS', '<div class="qbm-amt">' + money(so.reduce(function (s, t) { return s + t.total; }, 0)) + '</div><div class="qbm-card-sub">' + so.length + ' open sales orders</div>' + miniTable([['SO NO.'], ['CUSTOMER'], ['AMOUNT', 1]], so.slice(0, 5).map(function (t) { return ['<button type="button" class="qb-link" data-act="txn:' + t.id + '">' + U.esc(t.no || '') + '</button>', U.esc(S.custName(t.cust)), money(t.total)]; })) + '<div class="qbm-card-foot"><button type="button" class="qb-link" data-act="form:Sales Order">Create sales order</button></div>') +
      card('OPEN PURCHASE ORDERS', '<div class="qbm-amt">' + money(po.reduce(function (s, t) { return s + t.total; }, 0)) + '</div><div class="qbm-card-sub">' + po.length + ' open purchase orders</div>' + miniTable([['PO NO.'], ['VENDOR'], ['AMOUNT', 1]], po.slice(0, 5).map(function (t) { return ['<button type="button" class="qb-link" data-act="txn:' + t.id + '">' + U.esc(t.no || '') + '</button>', U.esc(S.payeeName(t)), money(t.total)]; })) + '<div class="qbm-card-foot"><button type="button" class="qb-link" data-act="go:purchase-orders">View all purchase orders</button></div>') +
      card('INVENTORY REPORTS', '<div class="qbm-replist">' + reports.map(function (r) { return '<div><span>' + r[0] + '</span><button type="button" class="qb-link" data-act="report:' + r[1] + '">View</button></div>'; }).join('') + '</div><div class="qbm-card-foot"><button type="button" class="qb-link" data-act="go:standardreports">View all reports</button></div>') +
      '</div></div>';
  });

  QB.view('inventory', function (p, el) {
    var items = invItems();
    var value = items.reduce(function (s, i) { return s + (+i.qty || 0) * (+i.cost || 0); }, 0);
    var rows = items.map(function (i) { return { id: i.id, it: i, name: i.name, sku: i.sku, qty: +i.qty || 0, reorder: i.reorder, cost: +i.cost || 0, value: U.r2((+i.qty || 0) * (+i.cost || 0)), state: stockState(i) }; });
    el.innerHTML = head('Inventory', UI.feedbackLink() + UI.btn('Adjust inventory', { kind: 'secondary', act: 'form:Inventory Qty Adjust' }) + UI.btn('New product', { kind: 'primary', act: 'new:item' })) +
      '<div class="qbm-statrow"><div><b>' + money(value) + '</b><span>Inventory value</span></div><div><b>' + U.num(items.reduce(function (s, i) { return s + (+i.qty || 0); }, 0)).replace(/\.00$/, '') + '</b><span>Units on hand</span></div>' +
      '<div class="qbm-st-orange"><b>' + rows.filter(function (r) { return r.state === 'low'; }).length + '</b><span>Low on stock</span></div><div class="qbm-st-red"><b>' + rows.filter(function (r) { return r.state === 'out'; }).length + '</b><span>Out of stock</span></div></div>' +
      '<div class="qbm-tbl"></div>';
    UI.table(el.querySelector('.qbm-tbl'), [
      { key: 'name', label: 'Name', render: function (r) { return '<b>' + U.esc(r.name) + '</b><div class="qb-muted qbm-small">' + U.esc(r.it.desc || '') + '</div>'; } },
      { key: 'sku', label: 'SKU' },
      { key: 'qty', label: 'Qty on hand', align: 'right', render: function (r) { return '<span class="qbm-qty qbm-qty-' + r.state + '">' + U.num(r.qty).replace(/\.00$/, '') + '</span>'; } },
      { key: 'reorder', label: 'Reorder point', align: 'right', render: function (r) { return r.reorder == null || r.reorder === '' ? '<button type="button" class="qb-link" data-act="qbm:reorder:' + r.id + '">Set</button>' : U.esc(r.reorder) + ' <button type="button" class="qb-icon-btn qbm-tiny" data-act="qbm:reorder:' + r.id + '" aria-label="Edit reorder point">' + ic('pencil') + '</button>'; } },
      { key: 'cost', label: 'Cost', align: 'right', render: function (r) { return U.num(r.cost); } },
      { key: 'value', label: 'Value', align: 'right', render: function (r) { return U.num(r.value); } },
      { key: 'act', label: 'Action', sort: false, align: 'right', render: function (r) { return '<span class="qb-act"><button type="button" class="qb-link" data-act="qbm:adjust:' + r.id + '">Adjust quantity</button><button type="button" class="qb-act-caret" data-act="qbm:invmenu:' + r.id + '" aria-label="More">' + ic('caretDown') + '</button></span>'; } }
    ], rows, { sortKey: 'name', empty: 'No inventory products. Add a product with the Inventory type to track quantities.', footer: '<tr><td colspan="5">Total</td><td class="ta-r">' + U.num(value) + '</td><td></td></tr>' });
  });
  ACT.adjust = function (a) { QB.openForm('Inventory Qty Adjust', { item: a[0] }); };
  ACT.invmenu = function (a, el) { UI.menu(el, [['Set reorder point', 'qbm:reorder:' + a[0]], ['Create purchase order', 'qbm:po:item:' + a[0]], ['Edit product', 'qbm:itemedit:' + a[0]], ['Run inventory valuation', 'report:Inventory Valuation Detail']]); };
  ACT.itemedit = function (a) { QB.openForm('Product/Service', { item: a[0], id: a[0] }); };
  ACT.reorder = function (a) {
    var it = S.item[a[0]];
    UI.modal('Reorder point for ' + it.name, '<p>QuickBooks shows this product as low on stock when the quantity on hand drops to this number.</p>' + UI.field('Reorder point', UI.input('reorder', it.reorder == null ? '' : it.reorder, ' inputmode="numeric"')), {
      buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (m) {
        var v = val(m, 'reorder'); it.reorder = v === '' ? null : +v || 0;
        UI.toast('Reorder point saved.'); changed();
      }]]
    });
  };
  ACT.po = function (a) { QB.openForm('Purchase Order', a[0] === 'item' ? { item: a[1] } : {}); };

  QB.view('purchase-orders', function (p, el) {
    var all = S.find(function (t) { return t.type === 'Purchase Order'; });
    var rows = all.filter(function (t) { return V.poStatus === 'all' || (t.status || 'Open') === V.poStatus; }).map(function (t) { return { id: t.id, t: t, date: t.date, no: t.no, vendor: S.payeeName(t), total: t.total, status: t.status || 'Open' }; });
    var open = all.filter(function (t) { return (t.status || 'Open') === 'Open'; });
    el.innerHTML = head('Purchase orders', UI.feedbackLink() + UI.btn('New purchase order', { kind: 'primary', act: 'form:Purchase Order' })) +
      UI.moneyBar([{ title: 'Open', segs: [{ amount: money(open.reduce(function (s, t) { return s + t.total; }, 0)), label: open.length + ' open purchase order' + (open.length === 1 ? '' : 's'), color: '#0077c5', act: 'qbm:postatus:Open' }] },
        { title: 'Closed', segs: [{ amount: money(all.filter(function (t) { return t.status === 'Closed'; }).reduce(function (s, t) { return s + t.total; }, 0)), label: all.filter(function (t) { return t.status === 'Closed'; }).length + ' closed', color: '#8d9096', act: 'qbm:postatus:Closed' }] }]) +
      '<div class="qb-filters">' + UI.field('Status', UI.select('poStatus', [['all', 'All'], ['Open', 'Open'], ['Closed', 'Closed']], V.poStatus)) + '</div><div class="qbm-tbl"></div>';
    el.querySelector('[name=poStatus]').onchange = function () { V.poStatus = this.value; QB.render(); };
    UI.table(el.querySelector('.qbm-tbl'), [
      { key: 'date', label: 'Date', render: function (r) { return U.fmtDate(r.date); } },
      { key: 'no', label: 'No.' }, { key: 'vendor', label: 'Vendor' },
      { key: 'total', label: 'Amount', align: 'right', render: function (r) { return U.num(r.total); } },
      { key: 'status', label: 'Status', render: function (r) { return UI.statusHtml(L.status(r.t)); } },
      { key: 'act', label: 'Action', sort: false, align: 'right', render: function (r) { return '<span class="qb-act"><button type="button" class="qb-link" data-act="txn:' + r.id + '">View/Edit</button>' + (r.status === 'Open' ? '<span class="qb-sep">|</span><button type="button" class="qb-link" data-act="qbm:poclose:' + r.id + '">Close</button>' : '') + '</span>'; } }
    ], rows, { sortKey: 'date', sortDir: 'desc', rowAct: function (r) { return 'txn:' + r.id; }, empty: 'No purchase orders match this filter.' });
  });
  ACT.postatus = function (a) { V.poStatus = a[0]; QB.render(); };
  ACT.poclose = function (a) { var t = S.txn[a[0]]; t.status = 'Closed'; UI.toast('Purchase order ' + (t.no || '') + ' closed.'); S.update(t); };

  QB.view('itemreceipts', function (p, el) {
    el.innerHTML = head('Item receipts', UI.feedbackLink()) + empty({
      art: QB.art('box'), title: 'Receive inventory before the bill arrives',
      text: 'Item receipts record products you get from vendors so your quantities stay right. When the vendor\'s bill comes in, QuickBooks links it to the receipt. To use them, set Inventory receiving method to Item receipts in Settings.',
      actions: UI.btn('Go to settings', { kind: 'secondary', act: 'go:settings?tab=inventory' }) + UI.btn('Create purchase order', { kind: 'primary', act: 'form:Purchase Order' })
    });
  });

  QB.view('inv-salesorders', function (p, el) {
    var so = S.find(function (t) { return t.type === 'Sales Order'; });
    if (!so.length) {
      el.innerHTML = head('Sales orders', UI.feedbackLink()) + empty({ art: QB.art('docs'), title: 'Track what customers order', text: 'Sales orders record what customers have asked for so you can fill orders as products come in. Turn them into invoices when you ship.', actions: UI.btn('Create sales order', { kind: 'primary', act: 'form:Sales Order' }) });
      return;
    }
    el.innerHTML = head('Sales orders', UI.feedbackLink() + UI.btn('Create sales order', { kind: 'primary', act: 'form:Sales Order' })) + '<div class="qbm-tbl"></div>';
    UI.table(el.querySelector('.qbm-tbl'), [
      { key: 'date', label: 'Date', render: function (t) { return U.fmtDate(t.date); } }, { key: 'no', label: 'No.' },
      { key: 'cust', label: 'Customer', render: function (t) { return U.esc(S.custName(t.cust)); } },
      { key: 'total', label: 'Amount', align: 'right', render: function (t) { return U.num(t.total); } },
      { key: 'status', label: 'Status', render: function (t) { return U.esc(t.status || 'Open'); } }
    ], so, { sortKey: 'date', sortDir: 'desc', rowAct: function (t) { return 'txn:' + t.id; } });
  });

  QB.view('shipping', function (p, el) {
    if (!V.labels.length) {
      el.innerHTML = head('Shipping labels', UI.feedbackLink()) + empty({ art: QB.art('box'), title: 'Ship faster with discounted labels', text: 'Buy and print shipping labels right from QuickBooks, then track every package in one place.', actions: UI.btn('Buy shipping label', { kind: 'primary', act: 'qbm:label' }) });
      return;
    }
    el.innerHTML = head('Shipping labels', UI.feedbackLink() + UI.btn('Buy shipping label', { kind: 'primary', act: 'qbm:label' })) + '<div class="qbm-tbl"></div>';
    UI.table(el.querySelector('.qbm-tbl'), [
      { key: 'date', label: 'Date', render: function (r) { return U.fmtDate(r.date); } }, { key: 'to', label: 'Ship to' }, { key: 'service', label: 'Service' },
      { key: 'weight', label: 'Weight' }, { key: 'tracking', label: 'Tracking number' },
      { key: 'cost', label: 'Cost', align: 'right', render: function (r) { return U.num(r.cost); } }, { key: 'status', label: 'Status' }
    ], V.labels, { sortKey: 'date', sortDir: 'desc' });
  });
  var SERVICES = [['Ground Advantage', 4.85, 0.45, '2-5 business days'], ['Priority Mail', 8.6, 0.95, '1-3 business days'], ['Ground', 10.2, 1.1, '1-5 business days'], ['Priority Mail Express', 27.9, 1.6, '1-2 business days']];
  ACT.label = function () {
    var addr = [S.company.street, S.company.city, S.company.state, S.company.zip].filter(Boolean).join(', ');
    var m = UI.modal('Buy shipping label', '<div class="qbm-form">' +
      UI.field('Ship from', '<div class="qbm-static">' + U.esc(S.company.name) + '<br>' + U.esc(addr || 'No address on file') + '</div>') +
      UI.field('Ship to', UI.select('to', custOptions('Choose a customer'), '')) +
      '<div class="qbm-row2">' + UI.field('Package', UI.select('pkg', ['Box', 'Envelope', 'Padded envelope', 'Tube'], 'Box')) + UI.field('Weight (lb)', UI.input('lb', '2', ' inputmode="decimal"')) + '</div>' +
      '<div class="qbm-svc"></div><p class="qb-muted qbm-small">Practice copy: no postage is bought and no carrier is contacted.</p></div>', {
      wide: false,
      buttons: [['Cancel', 'secondary'], ['Buy label', 'primary', function (md) {
        var to = val(md, 'to'), lb = U.parseMoney(val(md, 'lb')), svc = md.querySelector('[name=svc]:checked');
        if (!err(md.querySelector('[name=to]'), !to) | !err(md.querySelector('[name=lb]'), !(lb > 0))) return false;
        var s = SERVICES[+(svc ? svc.value : 0)];
        V.labels.push({ id: U.uid('lbl'), date: U.today(), to: S.custName(to), service: s[0], weight: lb + ' lb', cost: U.r2(s[1] + s[2] * lb), tracking: '9400 ' + String(Math.floor(1e15 + Math.random() * 9e15)).replace(/(\d{4})(?=\d)/g, '$1 '), status: 'Label created' });
        UI.toast('Practice label created for ' + S.custName(to) + '.');
        if (QB.route.name === 'shipping') QB.render(); else QB.go('shipping');
      }]]
    });
    function rates() {
      var lb = U.parseMoney(val(m, 'lb')) || 0, cur = m.querySelector('[name=svc]:checked'), sel = cur ? cur.value : '0';
      m.querySelector('.qbm-svc').innerHTML = '<div class="qb-label">Service</div>' + SERVICES.map(function (s, i) {
        return '<label class="qbm-radio-row"><input type="radio" name="svc" value="' + i + '"' + (String(i) === sel ? ' checked' : '') + '><span><b>' + s[0] + '</b><em>' + s[3] + '</em></span><span class="qb-grow"></span><b>' + money(s[1] + s[2] * lb) + '</b></label>';
      }).join('');
    }
    m.querySelector('[name=lb]').addEventListener('input', rates);
    rates();
  };

  /* ═════════ Sales Tax ═════════ */
  var AGENCIES = [
    { key: 'ca', name: 'California Department of Tax and Fee Administration', short: 'CDTFA', acct: 'a_boe', state: 'CA', rate: 'California (8%)' },
    { key: 'az', name: 'Arizona Department of Revenue', short: 'ADOR', acct: 'a_azrev', state: 'AZ', rate: 'Arizona (7.1%)' }
  ];
  function quarterOf(iso) { var d = U.toDate(iso), q = Math.floor(d.getMonth() / 3); return [U.iso(new Date(d.getFullYear(), q * 3, 1)), U.iso(new Date(d.getFullYear(), q * 3 + 3, 0))]; }
  function taxPaidAfter(ag, after) {
    if (ag.acct !== 'a_boe') return 0; /* core posts every Sales Tax Payment against a_boe */
    return S.txns.filter(function (t) { return t.type === 'Sales Tax Payment' && t.date > after; }).reduce(function (s, t) { return s + t.total; }, 0);
  }
  function returnsFor(ag) {
    var today = U.today(), cur = quarterOf(today), prev = quarterOf(U.addDays(cur[0], -1)), old = quarterOf(U.addDays(prev[0], -1));
    var bal = L.balance(ag.acct);
    var prevDue = Math.max(0, U.r2(L.balance(ag.acct, { to: prev[1] }) - taxPaidAfter(ag, prev[1])));
    prevDue = Math.min(prevDue, Math.max(0, bal));
    var curDue = Math.max(0, U.r2(bal - prevDue));
    function dueDate(q) { var d = U.toDate(q[1]); return U.iso(new Date(d.getFullYear(), d.getMonth() + 2, 0)); }
    var out = [];
    out.push({ ag: ag, from: old[0], to: old[1], due: dueDate(old), amount: 0, status: 'Paid', filed: true });
    var pd = dueDate(prev);
    out.push({ ag: ag, from: prev[0], to: prev[1], due: pd, amount: U.r2(prevDue), status: prevDue <= 0.004 ? 'Paid' : (today > pd ? 'Overdue' : 'Due') });
    out.push({ ag: ag, from: cur[0], to: cur[1], due: dueDate(cur), amount: U.r2(curDue), status: 'Open' });
    return out.reverse();
  }
  function periodLabel(r) { return U.fmtDate(r.from, 'mon').replace(/, \d{4}$/, '') + ' – ' + U.fmtDate(r.to, 'mon'); }
  function salesFor(ag, from, to) {
    var o = { gross: 0, taxable: 0, tax: 0 };
    S.find(function (t) { return ['Invoice', 'Sales Receipt', 'Credit Memo', 'Refund'].indexOf(t.type) >= 0 && t.date >= from && t.date <= to; }).forEach(function (t) {
      var c = S.cust[t.cust], st = c ? c.state : '';
      if (ag.state === 'AZ' ? st !== 'AZ' : st === 'AZ') return;
      var sign = t.type === 'Credit Memo' || t.type === 'Refund' ? -1 : 1;
      o.gross += sign * ((t.subtotal || 0) - (t.discount || 0)); o.taxable += sign * (t.taxableSubtotal || 0); o.tax += sign * (t.tax || 0);
    });
    o.gross = U.r2(o.gross); o.taxable = U.r2(o.taxable); o.tax = U.r2(o.tax);
    return o;
  }
  var TAX_ART = '<svg viewBox="0 0 240 180" class="qbm-tax-art"><rect x="30" y="30" width="120" height="140" rx="8" fill="#fff" stroke="#c9ced4" stroke-width="3"/><rect x="48" y="52" width="60" height="12" rx="3" fill="#2ca01c"/><path d="M48 84h84M48 102h84M48 120h60" stroke="#d7dbe0" stroke-width="7" stroke-linecap="round"/><circle cx="170" cy="70" r="34" fill="#e7f6e5"/><path d="M170 46c-13 0-22 9-22 21 0 16 22 37 22 37s22-21 22-37c0-12-9-21-22-21z" fill="#108000"/><circle cx="170" cy="67" r="8" fill="#fff"/><path d="M150 150l20-20 30 30" stroke="#0077c5" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="208" cy="132" r="10" fill="#ffc400"/></svg>';
  QB.view('tax', function (p, el) {
    if (!V.taxSetup) {
      el.innerHTML = '<div class="qbm-taxsetup"><div class="qbm-taxsetup-copy"><h1>Let\'s set up your new and improved sales tax centre</h1><p class="qbm-lead">You\'re just 2 steps away from an awesome experience</p>' +
        '<ol class="qbm-steps"><li><span>1</span><div><b>Double-check your business address</b><p>It provides the most accurate rates and reports.</p></div></li>' +
        '<li><span>2</span><div><b>Tell us who collects your tax</b><p>Connect your old tax centre agencies to their new agencies.</p></div></li></ol>' +
        '<div class="qbm-acts">' + UI.btn('Do it later', { kind: 'secondary', act: 'qbm:taxsetup:later' }) + UI.btn('Get started', { kind: 'primary', act: 'qbm:taxsetup:start' }) + '</div></div>' +
        '<div class="qbm-taxsetup-art">' + TAX_ART + '</div></div>';
      return;
    }
    if (V.taxReturn) return taxReturnView(el);
    var rets = [];
    AGENCIES.forEach(function (ag) { rets = rets.concat(returnsFor(ag)); });
    var pays = S.find(function (t) { return t.type === 'Sales Tax Payment'; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    el.innerHTML = head('Sales tax', UI.feedbackLink() + UI.btn('Manage sales tax', { kind: 'secondary', act: 'qbm:taxmanage' }) + UI.btn('Record payment', { kind: 'primary', act: 'qbm:taxpay:-1' })) +
      '<div class="qbm-agencies">' + AGENCIES.map(function (ag) {
        var r = returnsFor(ag), next = r.filter(function (x) { return x.status !== 'Paid'; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; })[0];
        return '<div class="qbm-agency"><div class="qbm-agency-ic">' + ic('bank') + '</div><div class="qbm-agency-body"><b>' + U.esc(ag.name) + '</b><span>' + V.taxFreq[ag.key] + ' · ' + U.esc(ag.rate) + '</span></div>' +
          '<div class="qbm-agency-amt"><span>Sales tax owed</span><b>' + money(L.balance(ag.acct)) + '</b>' + (next ? '<em>Next return due ' + U.fmtDate(next.due, 'mon') + '</em>' : '') + '</div></div>';
      }).join('') + '</div>' +
      '<div class="qb-tabs"><button type="button" class="' + (V.taxTab === 'returns' ? 'on' : '') + '" data-act="qbm:taxtab:returns">Returns</button><button type="button" class="' + (V.taxTab === 'history' ? 'on' : '') + '" data-act="qbm:taxtab:history">Payment history</button></div>' +
      '<div class="qbm-tbl"></div>';
    var box = el.querySelector('.qbm-tbl');
    if (V.taxTab === 'returns') {
      UI.table(box, [
        { key: 'agency', label: 'Agency', render: function (r) { return U.esc(r.ag.name); } },
        { key: 'from', label: 'Period', render: periodLabel },
        { key: 'due', label: 'Due date', render: function (r) { return U.fmtDate(r.due); } },
        { key: 'amount', label: 'Tax due', align: 'right', render: function (r) { return r.filed ? '—' : U.num(r.amount); } },
        { key: 'status', label: 'Status', render: function (r) { var t = r.status === 'Overdue' ? 'overdue' : r.status === 'Paid' ? 'paid' : r.status === 'Due' ? 'due' : 'open'; return UI.statusHtml({ text: r.filed ? 'Filed' : r.status, tone: r.filed ? 'closed' : t, sub: r.status === 'Overdue' ? U.diffDays(U.today(), r.due) + ' days late' : '' }); } },
        { key: 'act', label: 'Action', sort: false, align: 'right', render: function (r) { return '<button type="button" class="qb-link" data-act="qbm:taxview:' + r.ag.key + ':' + r.from + ':' + r.to + '">View return</button>'; } }
      ], rets.map(function (r, i) { r.id = 'rt' + i; return r; }), {});
    } else {
      UI.table(box, [
        { key: 'date', label: 'Payment date', render: function (t) { return U.fmtDate(t.date); } },
        { key: 'agency', label: 'Agency', sort: false, render: function () { return AGENCIES[0].name; } },
        { key: 'account', label: 'Bank account', render: function (t) { return U.esc(S.fullName(t.account || 'a_chk')); } },
        { key: 'memo', label: 'Memo' },
        { key: 'total', label: 'Amount', align: 'right', render: function (t) { return U.num(t.total); } }
      ], pays, { rowAct: function (t) { return 'txn:' + t.id; }, empty: 'No sales tax payments yet.' });
    }
  });
  ACT.taxsetup = function (a) { V.taxSetup = true; if (a[0] === 'later') UI.toast('You can finish setup any time from Manage sales tax.'); QB.render(); };
  ACT.taxtab = function (a) { V.taxTab = a[0]; QB.render(); };
  ACT.taxview = function (a) { V.taxReturn = { ag: a[0], from: a[1], to: a[2] }; QB.render(); };
  ACT.taxback = function () { V.taxReturn = null; QB.render(); };
  function taxReturnView(el) {
    var ag = AGENCIES.filter(function (x) { return x.key === V.taxReturn.ag; })[0];
    var r = returnsFor(ag).filter(function (x) { return x.from === V.taxReturn.from; })[0] || { from: V.taxReturn.from, to: V.taxReturn.to, due: V.taxReturn.to, amount: 0, status: 'Filed', filed: true, ag: ag };
    var s = salesFor(ag, r.from, r.to);
    var paid = S.txns.filter(function (t) { return t.type === 'Sales Tax Payment' && ag.acct === 'a_boe' && t.date >= r.from && t.date <= r.to; }).reduce(function (x, t) { return x + t.total; }, 0);
    el.innerHTML = '<div class="qb-crumb"><button type="button" class="qb-link" data-act="qbm:taxback">' + ic('caretLeft') + ' Back to sales tax</button></div>' +
      head('Review your sales tax return', UI.btn('Sales tax liability report', { kind: 'tertiary', act: 'report:Sales Tax Liability Report' })) +
      '<div class="qbm-return"><div class="qbm-return-main">' +
      '<div class="qbm-return-top"><div><b>' + U.esc(ag.name) + '</b><div class="qb-muted">Tax period: ' + periodLabel(r) + ' · Due ' + U.fmtDate(r.due, 'mon') + '</div></div>' + UI.statusHtml({ text: r.filed ? 'Filed' : r.status, tone: r.status === 'Overdue' ? 'overdue' : r.filed || r.status === 'Paid' ? 'closed' : 'open' }) + '</div>' +
      '<table class="qbm-rtable"><tbody>' +
      '<tr><td>Gross sales</td><td class="ta-r">' + money(s.gross) + '</td></tr>' +
      '<tr><td>Non-taxable sales</td><td class="ta-r">' + money(s.gross - s.taxable) + '</td></tr>' +
      '<tr><td>Taxable sales</td><td class="ta-r">' + money(s.taxable) + '</td></tr>' +
      '<tr><td>Tax collected</td><td class="ta-r">' + money(s.tax) + '</td></tr>' +
      '<tr><td>Payments made in this period</td><td class="ta-r">' + money(-paid) + '</td></tr>' +
      '<tr class="qbm-rtotal"><td>Tax due</td><td class="ta-r">' + (r.filed ? money(0) : money(r.amount)) + '</td></tr>' +
      '</tbody></table>' +
      '<p class="qb-muted qbm-small">Tax due is the balance of ' + U.esc(S.fullName(ag.acct)) + ' for this period after payments. File the return with the agency, then record the payment here.</p>' +
      '<div class="qbm-acts">' + UI.btn('Back', { kind: 'secondary', act: 'qbm:taxback' }) + (r.filed || r.amount <= 0.004 ? '' : UI.btn('Record payment', { kind: 'primary', act: 'qbm:taxpay:' + r.amount + ':' + ag.key })) + '</div></div>' +
      '<aside class="qbm-return-side">' + card('NEED TO FILE?', '<p>Go to the agency\'s website to file. When you\'re done, record the payment so your books show the tax as paid.</p>') + '</aside></div>';
  }
  ACT.taxpay = function (a) {
    var amt = +a[0] >= 0 ? +a[0] : L.balance('a_boe');
    var agKey = a[1] || 'ca';
    openFormOr('Sales Tax Payment', { amount: U.r2(amt), agency: agKey }, function () {
      UI.modal('Record payment', '<div class="qbm-form">' + UI.field('Agency', '<div class="qbm-static">' + U.esc(AGENCIES.filter(function (x) { return x.key === agKey; })[0].name) + '</div>') +
        UI.field('Payment date', UI.dateInput('date', U.today())) +
        UI.field('Bank account', UI.select('account', QB.lists.payFrom().map(function (o) { return [o.value, o.label]; }), 'a_chk')) +
        UI.field('Payment amount', UI.input('amount', U.num(amt))) + UI.field('Memo', UI.input('memo', '')) + '</div>', {
        buttons: [['Cancel', 'secondary'], ['Record payment', 'primary', function (m) {
          var v = U.parseMoney(val(m, 'amount')), d = U.parseDate(val(m, 'date'));
          if (!err(m.querySelector('[name=amount]'), !(v > 0)) | !err(m.querySelector('[name=date]'), !d)) return false;
          S.add({ type: 'Sales Tax Payment', no: '', date: d, account: val(m, 'account'), total: U.r2(v), memo: val(m, 'memo'), lines: [] });
          V.taxReturn = null; UI.toast('Sales tax payment recorded.');
        }]]
      });
    });
  };
  ACT.taxmanage = function () {
    UI.modal('Manage sales tax', '<p>Agencies you collect tax for, and how often you file.</p>' + AGENCIES.map(function (ag) {
      return '<div class="qbm-manage-row"><div><b>' + U.esc(ag.name) + '</b><div class="qb-muted qbm-small">Rate: ' + U.esc(ag.rate) + ' · Liability account: ' + U.esc(S.fullName(ag.acct)) + '</div></div>' + UI.select('freq_' + ag.key, ['Monthly', 'Quarterly', 'Annually'], V.taxFreq[ag.key]) + '</div>';
    }).join('') + '<h4 class="qbm-sub">Tax rates</h4>' + (S.company.taxRates || []).map(function (r) { return '<div class="qbm-kvrow"><span>' + U.esc(r.name) + '</span><b>' + (r.rate * 100).toFixed(2).replace(/0$/, '') + '%</b></div>'; }).join(''), {
      buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (m) { AGENCIES.forEach(function (ag) { V.taxFreq[ag.key] = val(m, 'freq_' + ag.key); }); UI.toast('Sales tax settings saved.'); QB.render(); }]]
    });
  };

  /* ═════════ Business Tax ═════════ */
  function estimate() {
    var today = U.today(), y = +today.slice(0, 4), ytd = plTotals(y + '-01-01', today);
    var day = U.diffDays(today, y + '-01-01') + 1, proj = U.r2(ytd.net / day * 365);
    var base = Math.max(0, proj);
    var se = U.r2(base * 0.9235 * 0.153), inc = U.r2(Math.max(0, base - se / 2 - 15000) * 0.12);
    return { y: y, ytd: ytd, proj: proj, se: se, inc: inc, total: U.r2(se + inc) };
  }
  QB.view('business-tax', function (p, el) {
    var e = estimate(), y = e.y;
    var qs = [['Q1', 'Jan 1 – Mar 31', y + '-04-15'], ['Q2', 'Apr 1 – May 31', y + '-06-15'], ['Q3', 'Jun 1 – Aug 31', y + '-09-15'], ['Q4', 'Sep 1 – Dec 31', (y + 1) + '-01-15']];
    var nextShown = false;
    var rows = qs.map(function (q) {
      var paid = V.btPaid[y + q[0]], st;
      if (paid) st = { text: 'Paid', tone: 'paid' };
      else if (q[2] < U.today()) st = { text: 'Past due', tone: 'overdue' };
      else if (!nextShown) { nextShown = true; st = { text: 'Due next', tone: 'due', sub: 'in ' + U.diffDays(q[2], U.today()) + ' days' }; }
      else st = { text: 'Upcoming', tone: 'open' };
      return { id: q[0], q: q, st: st, amount: U.r2(e.total / 4) };
    });
    el.innerHTML = head('Business tax', UI.feedbackLink() + UI.btn('Tax summary', { kind: 'secondary', act: 'go:tax-se' })) +
      '<div class="qbm-grid2">' +
      card('ESTIMATED TAX FOR ' + y, '<div class="qbm-amt-xl">' + money(e.total) + '</div><div class="qbm-card-sub">Estimated federal income and self-employment tax</div>' +
        '<div class="qbm-kvrow"><span>Year-to-date net profit</span><b>' + money(e.ytd.net) + '</b></div>' +
        '<div class="qbm-kvrow"><span>Projected net profit for ' + y + '</span><b>' + money(e.proj) + '</b></div>' +
        '<div class="qbm-kvrow"><span>Self-employment tax (15.3% of 92.35%)</span><b>' + money(e.se) + '</b></div>' +
        '<div class="qbm-kvrow"><span>Income tax (12% after deductions)</span><b>' + money(e.inc) + '</b></div>' +
        '<div class="qbm-card-foot"><button type="button" class="qb-link" data-act="report:Profit and Loss">View Profit and Loss</button></div>') +
      card('HOW WE ESTIMATE', '<p>We take your year-to-date net profit from your books, project it to a full year, and apply simple self-employment and income tax rates.</p><p class="qb-muted">Estimates are for practice and planning only, not tax advice. Your accountant can fine-tune them.</p>' +
        '<div class="qbm-kvrow"><span>Income</span><b>' + money(e.ytd.inc + e.ytd.oinc) + '</b></div><div class="qbm-kvrow"><span>Cost of goods and expenses</span><b>' + money(e.ytd.cogs + e.ytd.exp + e.ytd.oexp) + '</b></div>') +
      '</div><h2 class="qbm-sec-title">Quarterly estimated payments</h2><div class="qbm-tbl"></div>';
    UI.table(el.querySelector('.qbm-tbl'), [
      { key: 'id', label: 'Quarter' }, { key: 'period', label: 'Income period', sort: false, render: function (r) { return r.q[1]; } },
      { key: 'due', label: 'Due date', sort: false, render: function (r) { return U.fmtDate(r.q[2], 'mon'); } },
      { key: 'amount', label: 'Estimated payment', align: 'right', render: function (r) { return U.num(r.amount); } },
      { key: 'st', label: 'Status', sort: false, render: function (r) { return UI.statusHtml(r.st); } },
      { key: 'act', label: 'Action', sort: false, align: 'right', render: function (r) { return '<button type="button" class="qb-link" data-act="qbm:btpaid:' + y + r.id + '">' + (V.btPaid[y + r.id] ? 'Mark as unpaid' : 'Mark as paid') + '</button>'; } }
    ], rows, {});
  });
  ACT.btpaid = function (a) { V.btPaid[a[0]] = !V.btPaid[a[0]]; QB.render(); };

  var SCHED_C = [
    ['8', 'Advertising', ['a_adv', 'a_promo']], ['9', 'Car and truck expenses', ['a_auto']], ['10', 'Commissions and fees', ['a_comm']],
    ['11', 'Contract labor', ['a_jcl']], ['13', 'Depreciation', ['a_depr']], ['15', 'Insurance (other than health)', ['a_ins']],
    ['17', 'Legal and professional services', ['a_legal']], ['18', 'Office expense', ['a_office', 'a_stat']],
    ['20a', 'Rent or lease: vehicles, machinery, and equipment', ['a_eqr', 'a_jeqr']], ['20b', 'Rent or lease: other business property', ['a_rent']],
    ['21', 'Repairs and maintenance', ['a_mr']], ['22', 'Supplies', ['a_supp', 'a_jjm', 'a_purch']], ['23', 'Taxes and licenses', ['a_taxlic', 'a_jperm']],
    ['24a', 'Travel', ['a_travel']], ['24b', 'Deductible meals (50%)', ['a_meals', 'a_tmeals']], ['25', 'Utilities', ['a_util']], ['27a', 'Other expenses', []]
  ];
  function schedLine(id) {
    var a = S.acct[id];
    while (a) { for (var i = 0; i < SCHED_C.length; i++) if (SCHED_C[i][2].indexOf(a.id) >= 0) return SCHED_C[i][0]; a = S.acct[a.parent]; }
    return '27a';
  }
  QB.view('tax-se', function (p, el) {
    var r = U.range(V.tsRange), o = { from: r[0], to: r[1], children: false }, lines = {}, accts = {};
    SCHED_C.forEach(function (l) { lines[l[0]] = 0; accts[l[0]] = []; });
    var gross = 0, ret = 0, oinc = 0, cogs = 0;
    S.accounts.forEach(function (a) {
      if (['Income', 'Other Income', 'Cost of Goods Sold', 'Expenses', 'Other Expense'].indexOf(a.type) < 0) return;
      var b = L.balance(a.id, o); if (Math.abs(b) < 0.005) return;
      if (a.type === 'Income') { if (a.detail === 'Discounts/Refunds Given') ret -= b; else gross += b; return; }
      if (a.type === 'Other Income') { oinc += b; return; }
      if (a.type === 'Cost of Goods Sold') { cogs += b; return; }
      var ln = schedLine(a.id), amt = ln === '24b' ? U.r2(b * 0.5) : b;
      lines[ln] += amt; accts[ln].push([S.fullName(a.id), b]);
    });
    var totalExp = SCHED_C.reduce(function (s, l) { return s + lines[l[0]]; }, 0);
    var gp = gross - ret - cogs, gi = gp + oinc, net = gi - totalExp;
    function row(no, label, amt, cls, key) {
      var open = key && V.tsOpen[key], has = key && accts[key] && accts[key].length;
      return '<tr class="' + (cls || '') + (has ? ' is-click' : '') + '"' + (has ? ' data-act="qbm:tsopen:' + key + '"' : '') + '><td class="qbm-ts-no">' + no + '</td><td>' + (has ? ic(open ? 'caretDown' : 'caretRight', 'qbm-ts-car') : '') + label + '</td><td class="ta-r">' + money(amt) + '</td></tr>' +
        (open ? accts[key].map(function (x) { return '<tr class="qbm-ts-sub"><td></td><td>' + U.esc(x[0]) + '</td><td class="ta-r">' + U.num(x[1]) + '</td></tr>'; }).join('') : '');
    }
    el.innerHTML = head('Tax summary', UI.feedbackLink() + UI.btn('Business tax overview', { kind: 'secondary', act: 'go:business-tax' })) +
      '<div class="qb-filters">' + UI.field('Tax year', UI.select('tsRange', [['this-year-to-date', 'This year to date'], ['last-year', 'Last year'], ['this-quarter', 'This quarter']], V.tsRange)) + '<span class="qb-muted qbm-small">' + U.fmtDate(r[0], 'mon') + ' – ' + U.fmtDate(r[1], 'mon') + ' · Schedule C (Form 1040) view of your books</span></div>' +
      '<div class="qbm-ts"><table class="qbm-tstable"><tbody>' +
      '<tr class="qbm-ts-part"><td colspan="3">Part I · Income</td></tr>' +
      row('1', 'Gross receipts or sales', gross) + row('2', 'Returns and allowances', ret) + row('4', 'Cost of goods sold', cogs) +
      row('5', 'Gross profit', gp, 'qbm-ts-tot') + row('6', 'Other income', oinc) + row('7', 'Gross income', gi, 'qbm-ts-tot') +
      '<tr class="qbm-ts-part"><td colspan="3">Part II · Expenses</td></tr>' +
      SCHED_C.map(function (l) { return row(l[0], l[1], lines[l[0]], '', l[0]); }).join('') +
      row('28', 'Total expenses', totalExp, 'qbm-ts-tot') + row('31', 'Net profit or (loss)', net, 'qbm-ts-net') +
      '</tbody></table></div><p class="qb-muted qbm-small">Categories map from your chart of accounts. Click a line to see the accounts in it. For practice only; not tax advice.</p>';
    el.querySelector('[name=tsRange]').onchange = function () { V.tsRange = this.value; QB.render(); };
  });
  ACT.tsopen = function (a) { V.tsOpen[a[0]] = !V.tsOpen[a[0]]; QB.render(); };

  /* ═════════ Lending ═════════ */
  function avgMonthlySales() { var t = U.today(), r = [U.addMonths(t, -6), t]; return Math.max(0, plTotals(r[0], r[1]).inc / 6); }
  QB.view('lending', function (p, el) {
    var avg = avgMonthlySales();
    el.innerHTML = head('Lending', UI.feedbackLink()) +
      '<div class="qbm-lend-offer"><div class="qbm-lend-copy"><span class="qbm-kicker">' + ic('lock') + ' QuickBooks Capital</span><h2>Get the funds to grow your business</h2>' +
      '<p>Apply in minutes with no impact to your credit score. Loans from $1,000 to $200,000 with terms from 6 to 24 months, and no prepayment fees.</p>' +
      '<div class="qbm-acts">' + UI.btn('Check eligibility', { kind: 'primary', act: 'qbm:lendcheck' }) + UI.btn('How it works', { kind: 'secondary', act: 'qbm:lendhow' }) + '</div></div>' +
      '<div class="qbm-lend-side"><span>Based on your QuickBooks activity</span><b>' + money(avg) + '</b><em>average monthly sales, last 6 months</em></div></div>' +
      '<h2 class="qbm-sec-title">Financing options</h2><div class="qbm-grid3">' +
      [['Term loan', 'A lump sum you pay back in fixed monthly payments.', 'Up to $200,000'], ['Line of credit', 'Draw funds when you need them and pay interest only on what you use.', 'Up to $100,000'], ['Invoice financing', 'Get paid now for invoices your customers will pay later.', 'Up to 90% of open invoices']].map(function (o) {
        return card(o[0].toUpperCase(), '<p>' + o[1] + '</p><div class="qbm-amt">' + o[2] + '</div><div class="qbm-card-foot"><button type="button" class="qb-link" data-act="qbm:lendcheck">Check eligibility</button></div>');
      }).join('') + '</div><p class="qb-muted qbm-fine">Practice copy: no application is sent and no credit check is run.</p>';
  });
  ACT.lendhow = function () { UI.modal('How QuickBooks Capital works', '<ol class="qbm-ol"><li>Check eligibility using the data already in QuickBooks.</li><li>Pick the offer and term that fit your plans.</li><li>Get funds as soon as the next business day, and repay automatically.</li></ol>', { buttons: [['Close', 'primary']] }); };
  ACT.lendcheck = function () {
    var m = UI.modal('Check your eligibility', '<div class="qbm-lend-form"><div class="qbm-form">' +
      UI.field('How much do you need?', UI.select('need', ['$1,000 - $10,000', '$10,000 - $50,000', '$50,000 - $100,000', '$100,000 - $200,000'], '$1,000 - $10,000')) +
      UI.field('What is it for?', UI.select('purpose', ['Equipment', 'Inventory', 'Hiring', 'Marketing', 'Cash flow', 'Other'], 'Equipment')) +
      UI.field('Years in business', UI.select('years', ['Less than 1', '1-2', '3-5', 'More than 5'], '3-5')) + '</div></div>', {
      buttons: [['Cancel', 'secondary'], ['Check eligibility', 'primary', function (md) {
        var avg = avgMonthlySales(), max = Math.max(1000, Math.round(avg * 1.5 / 500) * 500);
        var ok = avg >= 500 && val(md, 'years') !== 'Less than 1';
        md.querySelector('.qbm-modal-out, .qbm-lend-form').outerHTML = '<div class="qbm-modal-out qbm-lend-result">' + (ok ?
          ic('checkCircle') + '<h3>You may qualify for up to ' + U.money0(max) + '</h3><p>Estimated from ' + money(avg) + ' in average monthly sales over the last 6 months. Final terms depend on a full review.</p>' :
          ic('info') + '<h3>Not eligible yet</h3><p>Lenders usually look for at least a year in business and steady monthly sales. Keep your books up to date and check again soon.</p>') +
          '<p class="qb-muted qbm-small">This is a practice estimate. No application was sent and no credit check was run.</p></div>';
        var foot = md.querySelector('.qb-modal-foot'); if (foot) foot.innerHTML = '<button type="button" class="qb-btn qb-btn-primary" data-close>Done</button>';
        return false;
      }]]
    });
    return m;
  };

  /* ═════════ Marketing ═════════ */
  function audience() {
    var seen = {}, out = [];
    S.customers.forEach(function (c) {
      if (!c.active || !c.email) return;
      c.email.split(/[,;]\s*/).forEach(function (e) { e = e.trim().toLowerCase(); if (e && !seen[e]) { seen[e] = 1; out.push({ id: c.id, name: S.custName(c.id), email: e, open: L.custBalance(c.id, false) }); } });
    });
    return out;
  }
  QB.view('marketing', function (p, el) {
    var aud = audience(), owing = aud.filter(function (a) { return a.open > 0.004; }).length;
    var kinds = [['Email campaign', 'Design an email and send it to your customer list.', 'mail'], ['Promotion', 'Offer a discount to bring customers back.', 'tag'], ['Review request', 'Ask happy customers to leave a review.', 'star'], ['New service announcement', 'Tell customers about something new.', 'sparkle']];
    el.innerHTML = head('Marketing', UI.feedbackLink() + UI.btn('Create campaign', { kind: 'primary', act: 'qbm:camp:Email campaign' })) +
      '<div class="qbm-mkt-hero"><div><h2>Turn customers into regulars</h2><p>Your QuickBooks customers sync to your email audience automatically, so you can reach the right people with the right message.</p></div>' +
      '<div class="qbm-mkt-aud"><b>' + aud.length + '</b><span>contacts in your audience</span><em>' + owing + ' with open balances · ' + (S.customers.filter(function (c) { return c.active; }).length - aud.length) + ' customers without an email</em></div></div>' +
      '<h2 class="qbm-sec-title">Create a campaign</h2><div class="qbm-grid4">' + kinds.map(function (k) {
        return '<button type="button" class="qbm-camp-card" data-act="qbm:camp:' + k[0] + '"><span class="qbm-camp-ic">' + ic(k[2]) + '</span><b>' + k[0] + '</b><span>' + k[1] + '</span></button>';
      }).join('') + '</div>' +
      '<div class="qbm-grid2">' +
      card('CAMPAIGNS', V.campaigns.length ? miniTable([['NAME'], ['AUDIENCE'], ['RECIPIENTS', 1], ['STATUS']], V.campaigns.slice().reverse().map(function (c) { return [U.esc(c.name), U.esc(c.audience), String(c.count), '<span class="qbm-tag qbm-tag-' + (c.status === 'Draft' ? 'info' : 'ok') + '">' + c.status + '</span>']; })) : '<p class="qb-muted">No campaigns yet. Pick a campaign type above to get started.</p>') +
      card('AUDIENCE', miniTable([['NAME'], ['EMAIL']], aud.slice(0, 8).map(function (a) { return [U.esc(a.name), U.esc(a.email)]; })) + (aud.length > 8 ? '<div class="qbm-card-foot"><span class="qb-muted">and ' + (aud.length - 8) + ' more</span><span class="qb-grow"></span><button type="button" class="qb-link" data-act="go:customers">Manage customers</button></div>' : '')) +
      '</div>';
  });
  ACT.camp = function (a) {
    var kind = a[0] || 'Email campaign', aud = audience();
    var groups = [['all', 'All customers with email', aud.length], ['open', 'Customers with open balances', aud.filter(function (x) { return x.open > 0.004; }).length], ['paid', 'Customers who are paid up', aud.filter(function (x) { return x.open <= 0.004; }).length]];
    UI.modal('New ' + kind.toLowerCase(), '<div class="qbm-form">' + UI.field('Campaign name', UI.input('name', kind + ' ' + U.fmtDate(U.today(), 'mon'))) +
      UI.field('Audience', UI.select('aud', groups.map(function (g) { return [g[0], g[1] + ' (' + g[2] + ')']; }), 'all')) +
      UI.field('Subject line', UI.input('subject', kind === 'Promotion' ? '15% off your next visit' : kind === 'Review request' ? 'How did we do?' : 'News from ' + S.company.name)) +
      UI.field('Message', '<textarea class="qb-input" name="msg" rows="5">Hi there,\n\nThanks for choosing ' + U.esc(S.company.name) + '.\n</textarea>') + '</div>', {
      wide: true,
      buttons: [['Cancel', 'secondary'], ['Save as draft', 'secondary', function (m) { save(m, 'Draft'); }], ['Schedule', 'primary', function (m) { save(m, 'Scheduled'); }]]
    });
    function save(m, status) {
      var g = groups.filter(function (x) { return x[0] === val(m, 'aud'); })[0];
      V.campaigns.push({ name: val(m, 'name') || kind, audience: g[1], count: g[2], status: status, subject: val(m, 'subject') });
      UI.toast(status === 'Draft' ? 'Campaign saved as a draft.' : 'Campaign scheduled (practice only, nothing is sent).');
      QB.render();
    }
  };
})();

/* ── Part B: gear menu pages ── */
(function () {
  'use strict';
  var QB = window.QB, U = QB.util, S = QB.store, L = QB.ledger, UI = QB.ui;
  var ic = UI.icon, K = QB._qbm, V = K.V, ACT = K.ACT;
  var head = K.head, changed = K.changed, empty = K.empty, card = K.card, miniTable = K.miniTable, val = K.val, err = K.err;
  var money = U.money;

  V.setEdit = null; V.umTab = 'users'; V.firms = []; V.designer = null; V.files = []; V.rcType = 'pl'; V.rcAcct = null; V.rcRange = 'this-year';
  V.exTab = 'reports'; V.exRange = 'this-year-to-date'; V.auUser = ''; V.auRange = 'all'; V.auEvent = '';
  V.styles = [{ id: 'st_std', name: 'Standard', forms: 'Invoices, Estimates, Sales receipts', template: 'airy', color: '#2ca01c', font: 'Helvetica', size: '10', logo: true, logoPos: 'left', isDefault: true }];
  QB.attachments = V.files;

  /* ═════════ Settings ═════════ */
  var MONTHS = U.MONTHS.slice();
  var YN = function (k, label, def) { return { k: k, label: label, type: 'toggle', def: def }; };
  var SEC = {
    cinfo: { title: 'Company info', desc: 'This info may be connected to the Business Network or used for billing purposes.', rows: [
      { k: 'name', src: 'c', label: 'Name', req: true }, { k: 'addr', src: 'c', label: 'Address', type: 'addr' }, { k: 'email', src: 'c', label: 'Email', type: 'email' },
      { k: 'phone', src: 'c', label: 'Phone' }, { k: 'website', src: 'c', label: 'Website' },
      { k: 'industry', src: 'c', label: 'Industry', type: 'select', opts: [['', 'None listed'], 'Landscaping services', 'Construction', 'Design services', 'Retail', 'Professional services', 'Other'] }] },
    legal: { title: 'Legal info', desc: 'This is the info your business uses for tax purposes.', rows: [
      { k: 'legalName', src: 'c', label: 'Legal business name' }, { k: 'ein', src: 'c', label: 'EIN / SSN' },
      { k: 'businessType', src: 'c', label: 'Business type', type: 'select', opts: ['Not sure/Other/None', 'Sole proprietor (Form 1040)', 'Partnership or limited liability company (Form 1065)', 'Small business corporation, two or more owners (Form 1120S)', 'Corporation, one or more shareholders (Form 1120)', 'Nonprofit organization (Form 990)'] },
      { k: 'legalAddr', src: 'c', label: 'Legal address', type: 'addr' }] },
    contact: { title: 'Customer contact info', desc: 'This is how customers get in touch with you.', rows: [
      { k: 'custEmail', src: 'c', label: 'Customer email', type: 'email', defFn: function () { return S.company.email; } }, { k: 'custAddr', src: 'c', label: 'Customer address', type: 'addr' }] },
    rpt: { title: 'Report and graph settings', rows: [
      { k: 'reportMethod', label: 'Default accounting method', type: 'select', opts: ['Accrual', 'Cash'], def: 'Accrual' },
      { k: 'reportRange', label: 'Default date range', type: 'select', opts: ['This year to date', 'This month to date', 'This quarter to date', 'Last month', 'Last year'], def: 'This year to date' },
      { k: 'agingMethod', label: 'Aging method', type: 'select', opts: ['Current', 'Report date'], def: 'Current' },
      { k: 'negFormat', label: 'Negative numbers', type: 'select', opts: ['-100', '(100)', '100-'], def: '-100' },
      YN('divide1000', 'Divide by 1000', false), YN('hideZero', 'Hide zero amounts', false)] },
    rpthead: { title: 'Header and footer', rows: [YN('rptCompanyName', 'Show company name', true), YN('rptDatePrepared', 'Show date prepared', true), YN('rptTimePrepared', 'Show time prepared', true), YN('rptBasis', 'Show report basis', true)] },
    lend: { title: 'QuickBooks Capital', desc: 'Get financing offers based on the data in your books.', rows: [YN('lendShare', 'Share my QuickBooks data with lending partners', true), YN('lendOffers', 'Show financing offers in QuickBooks', true)] },
    acct: { title: 'Accounting', rows: [
      { k: 'fiscalMonth', label: 'First month of fiscal year', type: 'select', opts: MONTHS }, { k: 'taxYear', label: 'First month of tax year', type: 'select', opts: ['Same as fiscal year', 'January'] },
      { k: 'method', label: 'Accounting method', type: 'select', opts: ['Accrual', 'Cash'] }, YN('closeBooks', 'Close the books')] },
    coa: { title: 'Chart of accounts', rows: [YN('acctNumbers', 'Enable account numbers'),
      { k: 'discAcct', label: 'Discount account', type: 'select', optsFn: function () { return S.accountsBy(['Income', 'Expenses']).map(function (a) { return S.fullName(a.id); }); }, def: 'Discounts given' },
      { k: 'tipsAcct', label: 'Tips account', type: 'select', optsFn: function () { return [['', 'None listed']].concat(S.accountsBy(['Income', 'Other Current Liabilities']).map(function (a) { return S.fullName(a.id); })); }, def: '' },
      { k: 'billableAcct', label: 'Billable expense income account', type: 'select', optsFn: function () { return S.accountsBy(['Income']).map(function (a) { return S.fullName(a.id); }); }, def: 'Billable Expense Income' }] },
    cats: { title: 'Categories', rows: [YN('classes', 'Track classes'), YN('locations', 'Track locations')] },
    automation: { title: 'Automation', rows: [YN('prefill', 'Pre-fill forms with previously entered content'), YN('autoCredits', 'Automatically apply credits'), YN('autoInvoiceUnbilled', 'Automatically invoice unbilled activity'), YN('autoBillPayments', 'Automatically apply bill payments')] },
    projects: { title: 'Projects', rows: [YN('projects', 'Organize all job-related activity in one place')] },
    currency: { title: 'Currency', rows: [{ k: 'currency', label: 'Home Currency', type: 'note' }, YN('multicurrency', 'Multicurrency')] },
    network: { title: 'Business Network', rows: [YN('network', 'Allow members to find me')] },
    other: { title: 'Other preferences', rows: [
      { k: 'dateFormat', label: 'Date format', type: 'select', opts: ['mm/dd/yyyy', 'dd/mm/yyyy', 'yyyy-mm-dd'] },
      { k: 'numberFormat', label: 'Number format', type: 'select', opts: ['123,456.00', '123.456,00', '123 456,00'] },
      { k: 'customerLabel', label: 'Customer label', type: 'select', opts: ['Customers', 'Clients', 'Donors', 'Guests', 'Members', 'Patients', 'Tenants'] },
      YN('warnDuplicateCheck', 'Warn if duplicate check number is used'), YN('warnDuplicateBill', 'Warn if duplicate bill number is used'),
      { k: 'signOutAfter', label: 'Sign me out if inactive for', type: 'select', opts: ['1 hour', '2 hours', '3 hours'] }] },
    salesform: { title: 'Sales form content', rows: [
      { k: 'preferredTerms', label: 'Preferred invoice terms', type: 'select', opts: U.TERMS }, { k: 'deliveryMethod', label: 'Preferred delivery method', type: 'select', opts: ['Print later', 'Send later', 'None'] },
      YN('shipping', 'Shipping'), { k: 'cfNote', label: 'Custom fields', type: 'note', text: 'Go to Settings > Lists > Custom Fields to add or edit custom fields.', link: 'customfields' },
      YN('customTxnNumbers', 'Custom transaction numbers'), YN('serviceDate', 'Service date'), YN('discount', 'Discount'), YN('deposit', 'Deposit'), YN('tips', 'Accept tips'), YN('tags', 'Tags')] },
    financing: { title: 'Financing', noEdit: true, rows: [{ k: 'affirm', label: 'Customer financing with affirm', type: 'note', text: 'Customers can pay over time, right from your invoices and estimates. You\'re paid in full upfront, minus the transaction fee (2.99%).', linkText: 'See how it works' }] },
    prodsvc: { title: 'Products and services', rows: [YN('showProductColumn', 'Show Product/Service column on sales forms'), YN('showSku', 'Show SKU column'), YN('priceRules', 'Turn on price rules'),
      YN('trackQty', 'Track quantity and price/rate'), YN('trackInventory', 'Track inventory quantity on hand'),
      { k: 'invReceiving', label: 'Inventory receiving method', badge: 'NEW', type: 'select', opts: ['Bills and expenses', 'Item receipts'], def: 'Bills and expenses' }] },
    latefees: { title: 'Late fees', rows: [YN('lateFees', 'Default charge applied to overdue invoices')] },
    invalerts: { title: 'Inventory alerts', rows: [YN('lowStockAlerts', 'Show low stock alerts', true), { k: 'defaultReorder', label: 'Default reorder point for new products', def: '' }] },
    bills: { title: 'Bills and expenses', rows: [YN('itemsOnExpense', 'Show Items table on expense and purchase forms'), YN('tagsOnExpense', 'Show Tags field'), YN('trackByCustomer', 'Track expenses and items by customer'), YN('billable', 'Make expenses and items billable'),
      { k: 'billTerms', label: 'Default bill payment terms', type: 'select', opts: [['', 'None listed']].concat(U.TERMS), def: '' }] },
    po: { title: 'Purchase orders', rows: [YN('usePO', 'Use purchase orders')] },
    msgs: { title: 'Messages', rows: [{ k: 'poMessage', label: 'Default email message sent with purchase orders', def: 'Please find our purchase order attached to this email. Thank you.' }] },
    timesheet: { title: 'Timesheet', rows: [{ k: 'weekStart', label: 'First day of work week', type: 'select', opts: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], def: 'Sunday' },
      YN('serviceRequired', 'Service field required', false), YN('timeBillable', 'Allow time to be billable', true), YN('showRate', 'Show billing rate to users entering time', false)] },
    inbox: { title: 'Receipt and bill forwarding', desc: 'Anyone can autofill multiple receipts or create bills and expenses by sending files to this address.', rows: [
      { k: 'fwd', label: 'Forwarding email', type: 'note', text: 'craigs-design+expenses@assist.intuit.com' }, YN('autoBills', 'Automatically create bills from forwarded files', true), YN('inboxNotify', 'Email me when new files arrive', false)] },
    wallet: { title: 'Wallet', desc: 'Payment methods you use to pay bills and vendors from QuickBooks.', rows: [
      { k: 'walletDefault', label: 'Default payment method', type: 'select', opts: [['', 'None listed'], 'Checking (bank account)', 'Mastercard'], def: '' }, YN('walletAutopay', 'Autopay bills from Wallet', false)] }
  };
  var TABS = [['company', 'Company', ['cinfo', 'legal', 'contact']], ['usage', 'Usage', []], ['reports', 'Reports', ['rpt', 'rpthead']], ['lending', 'Lending', ['lend']],
    ['accounting', 'Accounting', ['acct', 'coa', 'cats']], ['sales', 'Sales', ['salesform', 'financing', 'prodsvc', 'latefees']], ['inventory', 'Inventory', ['prodsvc', 'invalerts']],
    ['expenses', 'Expenses', ['bills', 'po', 'msgs']], ['time', 'Time', ['timesheet']], ['inbox', 'Inbox', ['inbox']], ['wallet', 'Wallet', ['wallet']],
    ['advanced', 'Advanced', ['acct', 'coa', 'cats', 'automation', 'projects', 'currency', 'network', 'other']]];
  function tgt(r) { return r.src === 'c' ? S.company : S.settings; }
  function rawVal(r) {
    var o = tgt(r), v = o[r.k];
    if (v === undefined) v = r.defFn ? r.defFn() : r.def;
    if (v === undefined && r.type === 'toggle') v = false;
    return v;
  }
  function addrOf(r) { var o = tgt(r); return { street: o[r.k + 'Street'] || '', city: o[r.k + 'City'] || '', state: o[r.k + 'State'] || '', zip: o[r.k + 'Zip'] || '' }; }
  function shown(r) {
    if (r.type === 'note') { var t = r.text != null ? r.text : rawVal(r); return '<span class="qbm-set-note">' + U.esc(t) + '</span>' + (r.link ? ' <button type="button" class="qb-link" data-act="go:' + r.link + '">Custom fields</button>' : '') + (r.linkText ? '<div><button type="button" class="qb-link" data-act="qbm:affirm">' + r.linkText + '</button></div>' : ''); }
    if (r.type === 'toggle') return rawVal(r) ? 'On' : 'Off';
    if (r.type === 'addr') { var a = addrOf(r), s = [a.street, [a.city, a.state].filter(Boolean).join(', '), a.zip].filter(Boolean).join(' '); return s ? U.esc(s) : '<span class="qb-muted">None listed</span>'; }
    var v = rawVal(r);
    if (r.type === 'select' && Array.isArray(r.opts)) { var hit = r.opts.filter(function (o) { return Array.isArray(o) && String(o[0]) === String(v); })[0]; if (hit) v = hit[1]; }
    return v === '' || v == null || v === 'None listed' ? '<span class="qb-muted">None listed</span>' : U.esc(v);
  }
  function editor(r) {
    var n = 'f_' + r.k;
    if (r.type === 'note') return shown(r);
    if (r.type === 'toggle') return UI.toggle(n, !!rawVal(r));
    if (r.type === 'select') { var opts = r.optsFn ? r.optsFn() : r.opts, v = rawVal(r); if (v && !opts.some(function (o) { return (Array.isArray(o) ? o[0] : o) === v; })) opts = [v].concat(opts); return UI.select(n, opts, v == null ? '' : v); }
    if (r.type === 'addr') { var a = addrOf(r); return '<div class="qbm-addr">' + UI.input(n + '_street', a.street, ' placeholder="Street address"') + '<div class="qbm-row3">' + UI.input(n + '_city', a.city, ' placeholder="City"') + UI.input(n + '_state', a.state, ' placeholder="State"') + UI.input(n + '_zip', a.zip, ' placeholder="ZIP code"') + '</div></div>'; }
    return UI.input(n, rawVal(r) == null ? '' : rawVal(r), r.type === 'email' ? ' type="email"' : '');
  }
  function secHtml(id, tab) {
    var s = SEC[id], key = tab + ':' + id, editing = V.setEdit === key;
    return '<section class="qbm-set-card' + (editing ? ' is-edit' : '') + '" data-sec="' + id + '"><div class="qbm-set-card-head"><div><h3>' + s.title + '</h3>' + (s.desc ? '<p>' + s.desc + '</p>' : '') + '</div><span class="qb-grow"></span>' +
      (s.noEdit || editing ? '' : '<button type="button" class="qb-link qbm-set-edit" data-act="qbm:setedit:' + key + '">' + ic('pencil') + 'Edit</button>') + '</div>' +
      '<div class="qbm-set-rows">' + s.rows.map(function (r) {
        return '<div class="qbm-set-row' + (!editing && !s.noEdit && r.type !== 'note' ? ' is-click' : '') + '"' + (!editing && !s.noEdit && r.type !== 'note' ? ' data-act="qbm:setedit:' + key + '"' : '') + '><div class="qbm-set-lbl">' + U.esc(r.label) + (r.badge ? ' <span class="qb-badge">' + r.badge + '</span>' : '') + '</div><div class="qbm-set-val">' + (editing ? editor(r) : shown(r)) + '</div>' +
          (!editing && !s.noEdit && r.type !== 'note' ? '<div class="qbm-set-pen">' + ic('pencil') + '</div>' : '<div></div>') + '</div>';
      }).join('') + '</div>' +
      (editing ? '<div class="qbm-set-foot">' + UI.btn('Cancel', { kind: 'secondary', act: 'qbm:setcancel' }) + UI.btn('Save', { kind: 'primary', act: 'qbm:setsave:' + id }) + '</div>' : '') + '</section>';
  }
  function usageHtml() {
    var billable = S.users.filter(function (u) { return u.status !== 'Deleted' && ['Reports only', 'Time tracking only'].indexOf(u.role) < 0; }).length;
    var coa = S.accounts.filter(function (a) { return a.active !== false; }).length;
    var cl = (S.settings.classList || []).length + (S.settings.locationList || []).length;
    function bar(label, n, max, note) {
      var pct = Math.min(100, n / max * 100);
      return '<div class="qbm-usage-row"><div class="qbm-usage-top"><b>' + label + '</b><span class="qb-grow"></span><span><b>' + n + '</b> of ' + max + '</span></div><div class="qbm-usage-bar"><i style="width:' + pct.toFixed(1) + '%"' + (pct > 80 ? ' class="is-hi"' : '') + '></i></div><div class="qb-muted qbm-small">' + note + '</div></div>';
    }
    return '<section class="qbm-set-card"><div class="qbm-set-card-head"><div><h3>Usage limits</h3><p>Your plan, QuickBooks Online Plus, includes these limits. Upgrade when you need more room.</p></div></div>' +
      bar('Billable users', billable, 5, 'Reports only and time tracking only users don\'t count toward this limit.') +
      bar('Chart of accounts', coa, 250, 'Active accounts. Inactive accounts don\'t count.') +
      bar('Classes and locations', cl, 40, 'Classes and locations combined.') +
      '<div class="qbm-set-foot"><button type="button" class="qb-link" data-act="go:billing">Upgrade to QuickBooks Online Advanced</button></div></section>';
  }
  QB.view('settings', function (p, el) {
    var tab = (p.tab || 'company').toLowerCase(), t = TABS.filter(function (x) { return x[0] === tab; })[0] || TABS[0];
    tab = t[0];
    var logo = S.company.logo ? '<img src="' + U.esc(S.company.logo) + '" alt="Company logo">' : ic('store');
    el.innerHTML = '<div class="qbm-set">' +
      '<header class="qbm-set-head"><h1>Settings</h1><span class="qb-grow"></span>' + UI.feedbackLink() +
      '<button type="button" class="qb-icon-btn" data-act="shell:help" aria-label="Help">' + ic('help') + '</button><button type="button" class="qb-icon-btn qbm-set-ai" data-act="shell:chat" aria-label="Assistant">' + ic('sparkle') + '</button>' +
      '<button type="button" class="qb-icon-btn" data-act="qbm:setclose" aria-label="Close">' + ic('close') + '</button></header>' +
      '<div class="qbm-set-body"><nav class="qbm-set-tabs">' + TABS.map(function (x) { return '<button type="button" class="' + (x[0] === tab ? 'on' : '') + '" data-act="go:settings?tab=' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</nav>' +
      '<div class="qbm-set-main">' +
      (tab === 'company' ? '<div class="qbm-logo"><div class="qbm-logo-box">' + logo + '<label class="qbm-logo-pen" title="Change logo">' + ic('pencil') + '<input type="file" accept="image/*" hidden data-logo></label></div>' + (S.company.logo ? '<button type="button" class="qb-link qbm-small" data-act="qbm:logodel">Remove logo</button>' : '') + '</div>' : '') +
      (tab === 'usage' ? usageHtml() : t[2].map(function (id) { return secHtml(id, tab); }).join('')) +
      '</div></div></div>';
    var f = el.querySelector('[data-logo]');
    if (f) f.addEventListener('change', function () {
      var file = f.files[0]; if (!file) return;
      if (file.size > 10 * 1024 * 1024) return UI.toast('Logo must be smaller than 10 MB.', 'err');
      var rd = new FileReader();
      rd.onload = function () { S.company.logo = rd.result; UI.toast('Logo updated.'); changed('settings'); };
      rd.readAsDataURL(file);
    });
  });
  ACT.setedit = function (a) {
    if (V.setEdit && V.setEdit !== a.join(':')) UI.toast('Save or cancel your other changes first.', 'err');
    else V.setEdit = a.join(':');
    QB.render();
    var c = U.$('.qbm-set-card.is-edit'); if (c) { c.scrollIntoView({ block: 'nearest' }); var i = c.querySelector('input:not([type=checkbox]),select'); if (i) i.focus(); }
  };
  ACT.setcancel = function () { V.setEdit = null; QB.render(); };
  ACT.setclose = function () { V.setEdit = null; QB.go('home'); };
  ACT.logodel = function () { delete S.company.logo; changed('settings'); };
  ACT.affirm = function () { UI.modal('Customer financing', '<p>When financing is on, customers see a pay-over-time option on invoices and estimates. You get paid in full upfront, and the financing partner collects from the customer.</p><p class="qb-muted">Not available in the test drive.</p>', { buttons: [['Got it', 'primary']] }); };
  ACT.setsave = function (a) {
    var id = a[0], s = SEC[id], c = U.$('.qbm-set-card.is-edit'); if (!c) return;
    var bad = false;
    s.rows.forEach(function (r) {
      if (r.type === 'note') return;
      var n = 'f_' + r.k, inp = c.querySelector('[name="' + n + '"]');
      if (r.req && inp && !err(inp, !inp.value.trim())) bad = true;
      if (r.type === 'email' && inp && inp.value.trim() && !err(inp, !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inp.value.trim()))) bad = true;
    });
    if (bad) return UI.toast('Check the highlighted fields.', 'err');
    var nameChanged = false;
    s.rows.forEach(function (r) {
      if (r.type === 'note') return;
      var o = tgt(r), n = 'f_' + r.k;
      if (r.type === 'addr') {
        ['street', 'city', 'state', 'zip'].forEach(function (part) { var i = c.querySelector('[name="' + n + '_' + part + '"]'); o[r.k + part.charAt(0).toUpperCase() + part.slice(1)] = i ? i.value.trim() : ''; });
        if (r.k === 'addr' && o.addrStreet) { S.company.street = o.addrStreet; S.company.city = o.addrCity; S.company.state = o.addrState; S.company.zip = o.addrZip; }
        return;
      }
      var inp = c.querySelector('[name="' + n + '"]'); if (!inp) return;
      var v = r.type === 'toggle' ? inp.checked : inp.value.trim();
      if (r.k === 'name' && r.src === 'c' && v !== S.company.name) nameChanged = true;
      o[r.k] = v;
    });
    V.setEdit = null;
    UI.toast(nameChanged ? 'Company name updated to ' + S.company.name + '.' : 'Your changes were saved.');
    changed('settings');
  };

  /* ═════════ Manage users ═════════ */
  var ROLES = [
    ['Standard all access', 'Can see and do everything except manage users and company settings.'],
    ['Standard limited', 'Can work with customers, vendors, or both. You choose which.'],
    ['Company admin', 'Can see and do everything, including managing users, settings, and subscriptions.'],
    ['Reports only', 'Can see all reports except payroll and contact info. Doesn\'t count toward your user limit.'],
    ['Time tracking only', 'Can only enter their own time. Doesn\'t count toward your user limit.']
  ];
  QB.view('usermngt', function (p, el) {
    el.innerHTML = head('Manage users', UI.feedbackLink() + (V.umTab === 'users' ? UI.btn('Add user', { kind: 'primary', act: 'qbm:user:new' }) : UI.btn('Invite', { kind: 'primary', act: 'qbm:firm' }))) +
      '<div class="qb-tabs"><button type="button" class="' + (V.umTab === 'users' ? 'on' : '') + '" data-act="qbm:umtab:users">Users</button><button type="button" class="' + (V.umTab === 'firms' ? 'on' : '') + '" data-act="qbm:umtab:firms">Accounting firms</button></div><div class="qbm-tbl"></div>';
    var box = el.querySelector('.qbm-tbl');
    if (V.umTab === 'users') {
      var billable = S.users.filter(function (u) { return ['Reports only', 'Time tracking only'].indexOf(u.role) < 0; }).length;
      box.insertAdjacentHTML('beforebegin', '<p class="qb-muted">' + billable + ' of 5 billable users</p>');
      UI.table(box, [
        { key: 'name', label: 'Name', render: function (u) { return '<b>' + U.esc(u.name) + '</b>'; } },
        { key: 'email', label: 'Email' }, { key: 'role', label: 'User type' },
        { key: 'status', label: 'Status', render: function (u) { return '<span class="qbm-tag qbm-tag-' + (u.status === 'Active' ? 'ok' : u.status === 'Invited' ? 'info' : 'warn') + '">' + U.esc(u.status) + '</span>'; } },
        { key: 'act', label: 'Action', sort: false, align: 'right', render: function (u) { return u.role === 'Primary admin' ? '<span class="qb-muted qbm-small">Primary admin</span>' : '<span class="qb-act"><button type="button" class="qb-link" data-act="qbm:user:edit:' + u.id + '">Edit</button><button type="button" class="qb-act-caret" data-act="qbm:user:menu:' + u.id + '" aria-label="More">' + ic('caretDown') + '</button></span>'; } }
      ], S.users.map(function (u, i) { if (!u.id) u.id = 'u' + i + '_' + Date.now().toString(36); return u; }), {});
    } else {
      box.innerHTML = V.firms.length ? '' : empty({ art: QB.art('docs'), title: 'Invite your accountant', text: 'Give your accountant access to your books. They\'ll sign in with QuickBooks Online Accountant and won\'t count toward your user limit.', actions: UI.btn('Invite', { kind: 'primary', act: 'qbm:firm' }) });
      if (V.firms.length) UI.table(box, [{ key: 'email', label: 'Email' }, { key: 'firm', label: 'Firm' }, { key: 'status', label: 'Status' }, { key: 'date', label: 'Invited', render: function (f) { return U.fmtDate(f.date); } }], V.firms, {});
    }
  });
  ACT.umtab = function (a) { V.umTab = a[0]; QB.render(); };
  ACT.firm = function () {
    UI.modal('Invite your accountant', '<div class="qbm-form">' + UI.field('Email *', UI.input('email', '', ' type="email"')) + UI.field('First name', UI.input('first', '')) + UI.field('Last name', UI.input('last', '')) + '</div>', {
      buttons: [['Cancel', 'secondary'], ['Invite', 'primary', function (m) {
        var e = val(m, 'email'); if (!err(m.querySelector('[name=email]'), !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))) return false;
        V.firms.push({ id: U.uid('firm'), email: e, firm: (val(m, 'first') + ' ' + val(m, 'last')).trim() || '—', status: 'Invited', date: U.today() });
        UI.toast('Invite saved for ' + e + '. The test drive doesn\'t send email.'); QB.render();
      }]]
    });
  };
  ACT.user = function (a, el) {
    var u = a[1] ? S.users.filter(function (x) { return x.id === a[1]; })[0] : null;
    if (a[0] === 'menu') return UI.menu(el, (u.status === 'Invited' ? [['Resend invite', 'qbm:user:resend:' + u.id]] : []).concat([[u.status === 'Inactive' ? 'Make active' : 'Make inactive', 'qbm:user:toggle:' + u.id], ['Delete', 'qbm:user:del:' + u.id]]));
    if (a[0] === 'resend') return UI.toast('Invite resent to ' + u.email + ' (practice only).');
    if (a[0] === 'toggle') { u.status = u.status === 'Inactive' ? (u.wasInvited ? 'Invited' : 'Active') : 'Inactive'; return changed('users'); }
    if (a[0] === 'del') return UI.confirm('Delete user?', 'Delete ' + u.name + '? They will lose access to this company.', 'Delete', function () { S.users.splice(S.users.indexOf(u), 1); UI.toast('User deleted.'); changed('users'); });
    var role = u ? u.role : 'Standard all access';
    var d = UI.drawer(u ? 'Edit user' : 'Add a new user', '<div class="qbm-form">' +
      '<div class="qbm-row2">' + UI.field('First name *', UI.input('first', u ? u.first || u.name.split(' ')[0] : '')) + UI.field('Last name', UI.input('last', u ? u.last || u.name.split(' ').slice(1).join(' ') : '')) + '</div>' +
      UI.field('Email *', UI.input('email', u ? u.email : '', ' type="email"')) +
      '<h4 class="qbm-sub">User type</h4>' + ROLES.map(function (r) {
        return '<label class="qbm-role"><input type="radio" name="role" value="' + r[0] + '"' + (r[0] === role ? ' checked' : '') + '><span><b>' + r[0] + '</b><em>' + r[1] + '</em></span></label>';
      }).join('') +
      '<div class="qbm-limited"' + (role === 'Standard limited' ? '' : ' hidden') + '><span class="qb-label">Access to</span><label class="qbm-chk"><input type="checkbox" name="accCust"' + (!u || u.accCust !== false ? ' checked' : '') + '> Customers</label><label class="qbm-chk"><input type="checkbox" name="accVend"' + (u && u.accVend ? ' checked' : '') + '> Vendors</label></div>' +
      '<p class="qb-muted qbm-small">We\'ll save an invite. In the test drive no email is sent.</p></div>', {
      saveLabel: u ? 'Save' : 'Send invite',
      onSave: function (dr) {
        var f = val(dr, 'first'), e = val(dr, 'email'), r = dr.querySelector('[name=role]:checked').value;
        var ok = err(dr.querySelector('[name=first]'), !f) & err(dr.querySelector('[name=email]'), !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
        if (!ok) return false;
        if (S.users.some(function (x) { return x !== u && x.email.toLowerCase() === e.toLowerCase(); })) { UI.toast('A user with that email already exists.', 'err'); return false; }
        var countable = ['Reports only', 'Time tracking only'].indexOf(r) < 0;
        var used = S.users.filter(function (x) { return x !== u && ['Reports only', 'Time tracking only'].indexOf(x.role) < 0; }).length;
        if (countable && used >= 5) { UI.toast('You\'ve reached the 5 billable users on your plan.', 'err'); return false; }
        var o = u || { id: U.uid('usr'), status: 'Invited', wasInvited: true };
        o.first = f; o.last = val(dr, 'last'); o.name = (f + ' ' + o.last).trim(); o.email = e; o.role = r;
        o.accCust = val(dr, 'accCust'); o.accVend = val(dr, 'accVend');
        if (!u) S.users.push(o);
        UI.toast(u ? 'User updated.' : 'Invite saved for ' + o.name + '.');
        changed('users');
      }
    });
    d.addEventListener('change', function (e) { if (e.target.name === 'role') d.querySelector('.qbm-limited').hidden = e.target.value !== 'Standard limited'; });
  };

  /* ═════════ Custom form styles ═════════ */
  var TEMPLATES = [['airy', 'Airy new'], ['classic', 'Airy classic'], ['modern', 'Modern'], ['fresh', 'Fresh'], ['bold', 'Bold'], ['friendly', 'Friendly']];
  var SWATCHES = ['#2ca01c', '#0077c5', '#00a6a4', '#6b4fbb', '#d52b1e', '#ff8000', '#e2187a', '#393a3d', '#8d6e63', '#0d3b54'];
  var FONTS = ['Helvetica', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Trebuchet MS', 'Verdana'];
  QB.view('customformstyles', function (p, el) {
    if (V.designer) return designer(el);
    el.innerHTML = head('Custom form styles', UI.feedbackLink() + '<button type="button" class="qb-btn qb-btn-primary" data-act="qbm:newstyle"><span>New style</span>' + ic('caretDown') + '</button>') +
      '<p class="qb-muted">Make your invoices, estimates, and sales receipts look the way you want, then choose a default.</p><div class="qbm-tbl"></div>';
    UI.table(el.querySelector('.qbm-tbl'), [
      { key: 'name', label: 'Name', render: function (s) { return '<span class="qbm-swatch-dot" style="background:' + s.color + '"></span><b>' + U.esc(s.name) + '</b>'; } },
      { key: 'forms', label: 'Form type' },
      { key: 'template', label: 'Template', render: function (s) { return TEMPLATES.filter(function (t) { return t[0] === s.template; })[0][1]; } },
      { key: 'isDefault', label: 'Default', render: function (s) { return s.isDefault ? '<span class="qbm-default">' + ic('check') + 'Default</span>' : ''; } },
      { key: 'act', label: 'Action', sort: false, align: 'right', render: function (s) { return '<span class="qb-act"><button type="button" class="qb-link" data-act="qbm:style:edit:' + s.id + '">Edit</button><button type="button" class="qb-act-caret" data-act="qbm:style:menu:' + s.id + '" aria-label="More">' + ic('caretDown') + '</button></span>'; } }
    ], V.styles, {});
  });
  ACT.newstyle = function (a, el) { UI.menu(el, [['Invoice', 'qbm:style:new:Invoices'], ['Estimate', 'qbm:style:new:Estimates'], ['Sales receipt', 'qbm:style:new:Sales receipts']]); };
  ACT.style = function (a, el) {
    var s = a[1] ? V.styles.filter(function (x) { return x.id === a[1]; })[0] : null;
    if (a[0] === 'new') { V.designer = { id: null, name: 'New style ' + V.styles.length, forms: a[1], template: 'airy', color: '#2ca01c', font: 'Helvetica', size: '10', logo: true, logoPos: 'left', isDefault: false }; return QB.render(); }
    if (a[0] === 'edit') { V.designer = Object.assign({}, s); return QB.render(); }
    if (a[0] === 'menu') return UI.menu(el, [['Make default', 'qbm:style:default:' + s.id], ['Duplicate', 'qbm:style:dup:' + s.id], { label: 'Delete', act: 'qbm:style:del:' + s.id, disabled: s.isDefault }]);
    if (a[0] === 'default') { V.styles.forEach(function (x) { x.isDefault = x === s; }); S.settings.formStyle = Object.assign({}, s); UI.toast(s.name + ' is now your default style.'); return changed('settings'); }
    if (a[0] === 'dup') { var c = Object.assign({}, s, { id: U.uid('st'), name: s.name + ' (copy)', isDefault: false }); V.styles.push(c); return QB.render(); }
    if (a[0] === 'del') { V.styles.splice(V.styles.indexOf(s), 1); UI.toast('Style deleted.'); return QB.render(); }
  };
  function preview(d) {
    var cust = S.cust.c_amy, inv = S.txns.filter(function (t) { return t.type === 'Invoice' && t.no === '1021'; })[0];
    var lines = inv ? inv.lines : [], total = inv ? inv.total : 0;
    var title = d.forms === 'Estimates' ? 'ESTIMATE' : d.forms === 'Sales receipts' ? 'SALES RECEIPT' : 'INVOICE';
    var addr = [S.company.street, [S.company.city, S.company.state].filter(Boolean).join(', ') + ' ' + (S.company.zip || '')].filter(function (x) { return x && x.trim(); });
    var logo = d.logo ? '<div class="qbm-pv-logo qbm-pv-logo-' + d.logoPos + '">' + (S.company.logo ? '<img src="' + U.esc(S.company.logo) + '" alt="">' : ic('store')) + '</div>' : '';
    return '<div class="qbm-pv qbm-tpl-' + d.template + '" style="--pv:' + d.color + ';font-family:' + d.font + ',sans-serif;font-size:' + (+d.size + 2) + 'px">' +
      '<div class="qbm-pv-band"></div><div class="qbm-pv-top">' + (d.logoPos !== 'right' ? logo : '') + '<div class="qbm-pv-co"><b>' + U.esc(S.company.name) + '</b>' + addr.map(function (x) { return '<div>' + U.esc(x) + '</div>'; }).join('') + '<div>' + U.esc(S.company.email || '') + '</div></div><span class="qb-grow"></span>' + (d.logoPos === 'right' ? logo : '') + '</div>' +
      '<h2 class="qbm-pv-title">' + title + '</h2>' +
      '<div class="qbm-pv-meta"><div><span>BILL TO</span><b>' + U.esc(cust ? cust.first + ' ' + cust.last : '') + '</b><div>' + U.esc(cust ? cust.name : '') + '</div><div>' + U.esc(cust ? cust.street : '') + '</div><div>' + U.esc(cust ? cust.city + ', ' + cust.state + ' ' + cust.zip : '') + '</div></div>' +
      '<div class="qbm-pv-nums"><div><span>' + (title === 'INVOICE' ? 'INVOICE #' : 'NO.') + '</span><b>1021</b></div><div><span>DATE</span><b>' + U.fmtDate(inv ? inv.date : U.today()) + '</b></div>' + (title === 'INVOICE' ? '<div><span>DUE DATE</span><b>' + U.fmtDate(inv ? inv.due : U.today()) + '</b></div><div><span>TERMS</span><b>Net 30</b></div>' : '') + '</div></div>' +
      '<table class="qbm-pv-lines"><thead><tr><th>DATE</th><th>ACTIVITY</th><th class="ta-r">QTY</th><th class="ta-r">RATE</th><th class="ta-r">AMOUNT</th></tr></thead><tbody>' +
      lines.map(function (l) { var it = S.item[l.item]; return '<tr><td></td><td><b>' + U.esc(it ? it.name : '') + '</b><div>' + U.esc(l.desc || '') + '</div></td><td class="ta-r">' + l.qty + '</td><td class="ta-r">' + U.num(l.rate) + '</td><td class="ta-r">' + U.num(l.amount) + '</td></tr>'; }).join('') +
      '</tbody></table><div class="qbm-pv-tot"><span>' + (title === 'INVOICE' ? 'BALANCE DUE' : 'TOTAL') + '</span><b>' + money(total) + '</b></div>' +
      '<div class="qbm-pv-foot">Thank you for your business and have a great day!</div></div>';
  }
  function designer(el) {
    var d = V.designer;
    el.innerHTML = '<div class="qbm-des"><div class="qbm-des-head"><button type="button" class="qb-link" data-act="qbm:descancel">' + ic('caretLeft') + ' Custom form styles</button><span class="qb-grow"></span>' + UI.btn('Cancel', { kind: 'secondary', act: 'qbm:descancel' }) + UI.btn('Done', { kind: 'primary', act: 'qbm:dessave' }) + '</div>' +
      '<div class="qbm-des-body"><aside class="qbm-des-panel">' +
      UI.field('Style name', UI.input('name', d.name)) +
      '<h4 class="qbm-sub">Choose a template</h4><div class="qbm-tpls">' + TEMPLATES.map(function (t) { return '<button type="button" class="qbm-tpl' + (d.template === t[0] ? ' on' : '') + '" data-tpl="' + t[0] + '"><span class="qbm-tpl-thumb qbm-tpl-' + t[0] + '"><i></i><i></i><i></i></span>' + t[1] + '</button>'; }).join('') + '</div>' +
      '<h4 class="qbm-sub">Make logo edits</h4><label class="qbm-chk qbm-chk-row">' + UI.toggle('logo', d.logo) + ' Show logo</label>' +
      UI.field('Logo placement', UI.select('logoPos', [['left', 'Left'], ['center', 'Center'], ['right', 'Right']], d.logoPos)) +
      '<h4 class="qbm-sub">Splash on some color</h4><div class="qbm-swatches">' + SWATCHES.map(function (c) { return '<button type="button" class="qbm-sw' + (d.color === c ? ' on' : '') + '" data-color="' + c + '" style="background:' + c + '" aria-label="Color ' + c + '"></button>'; }).join('') +
      '<label class="qbm-sw qbm-sw-custom" title="Custom color"><input type="color" name="color" value="' + d.color + '"></label></div>' +
      '<h4 class="qbm-sub">Get choosy with your font</h4><div class="qbm-row2">' + UI.field('Font', UI.select('font', FONTS, d.font)) + UI.field('Size', UI.select('size', ['8', '9', '10', '11', '12'], d.size)) + '</div>' +
      '</aside><div class="qbm-des-preview"><div class="qbm-des-pvlbl">Preview: ' + U.esc(d.forms.replace(/s$/, '')) + '</div><div class="qbm-pv-host">' + preview(d) + '</div></div></div></div>';
    var panel = el.querySelector('.qbm-des-panel'), host = el.querySelector('.qbm-pv-host');
    function upd() {
      d.name = val(panel, 'name'); d.logo = panel.querySelector('[name=logo]').checked; d.logoPos = val(panel, 'logoPos'); d.font = val(panel, 'font'); d.size = val(panel, 'size');
      host.innerHTML = preview(d);
    }
    panel.addEventListener('input', function (e) { if (e.target.name === 'color') { d.color = e.target.value; U.$$('.qbm-sw', panel).forEach(function (b) { b.classList.remove('on'); }); } upd(); });
    panel.addEventListener('change', upd);
    panel.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tpl]'), c = e.target.closest('[data-color]');
      if (t) { d.template = t.dataset.tpl; U.$$('.qbm-tpl', panel).forEach(function (b) { b.classList.toggle('on', b === t); }); upd(); }
      if (c) { d.color = c.dataset.color; U.$$('.qbm-sw', panel).forEach(function (b) { b.classList.toggle('on', b === c); }); panel.querySelector('[name=color]').value = d.color; upd(); }
    });
  }
  ACT.descancel = function () { V.designer = null; QB.render(); };
  ACT.dessave = function () {
    var d = V.designer, n = U.$('.qbm-des-panel [name=name]');
    if (n && !err(n, !n.value.trim())) return UI.toast('Give your style a name.', 'err');
    if (d.id) { var s = V.styles.filter(function (x) { return x.id === d.id; })[0]; Object.assign(s, d); if (s.isDefault) S.settings.formStyle = Object.assign({}, s); }
    else { d.id = U.uid('st'); V.styles.push(d); }
    V.designer = null; UI.toast('Style saved.'); changed('settings');
  };

  /* ═════════ Workers' comp ═════════ */
  QB.view('workerscomp', function (p, el) {
    el.innerHTML = head("Workers' comp", UI.feedbackLink()) + UI.hero({
      title: "Protect your team with pay-as-you-go workers' comp",
      lead: 'Premiums are based on your actual payroll, so you pay for what you use instead of a big upfront estimate.',
      body: '<ul class="qbm-bul"><li>' + ic('check') + 'No large down payment</li><li>' + ic('check') + 'Payments sync with each payroll you run</li><li>' + ic('check') + 'Fewer surprises at audit time</li></ul>',
      actions: UI.btn('Get a quote', { kind: 'primary', act: 'qbm:wcquote' }) + UI.btn('Learn about Payroll', { kind: 'secondary', act: 'go:payroll-signup' }), art: QB.art('sitting')
    });
  });
  ACT.wcquote = function () { UI.modal("Workers' comp quotes", "<p>Workers' comp quotes need an active QuickBooks Payroll subscription, which isn't part of the test drive.</p>", { buttons: [['Close', 'secondary'], ['See Payroll plans', 'primary', function () { QB.go('payroll-signup'); }]] }); };

  /* ═════════ All lists ═════════ */
  QB.view('lists', function (p, el) {
    var L2 = [
      ['Chart of Accounts', 'Displays your accounts. Balance sheet accounts track assets and liabilities, and income and expense accounts categorize your transactions.', 'go:chartofaccounts'],
      ['Recurring Transactions', 'Displays transactions saved for reuse. Schedule them to happen automatically, send reminders, or keep them as templates.', 'go:recurring'],
      ['Products and Services', 'Displays the products and services you sell. Edit descriptions, prices, and quantities on hand.', 'go:items'],
      ['Product Categories', 'Group products and services into categories so they are easy to find and summarize on reports.', 'qbm:listm:cats'],
      ['Payment Methods', 'Displays Cash, Check, and other ways customers pay you, so you can group deposits.', 'qbm:listm:methods'],
      ['Terms', 'Displays the terms that set due dates for payments from customers and to vendors.', 'qbm:listm:terms'],
      ['Attachments', 'Displays all the files you have uploaded.', 'go:attachments'],
      ['Tags', 'Displays your tags and tag groups. Tags let you track transactions however you want.', 'qbm:listm:tags'],
      ['Custom fields', 'Add fields of your own to sales forms, purchase forms, customers, and vendors.', 'go:customfields'],
      ['Rules', 'Rules categorize bank transactions automatically so you review less.', 'go:olbrules']
    ];
    el.innerHTML = head('All lists', UI.feedbackLink()) + '<div class="qbm-lists">' + L2.map(function (x) {
      return '<div class="qbm-list-tile"><button type="button" class="qb-link qbm-list-name" data-act="' + x[2] + '">' + x[0] + '</button><p>' + x[1] + '</p></div>';
    }).join('') + '</div>';
  });
  ACT.listm = function (a) {
    var kind = a[0], titles = { cats: 'Product categories', methods: 'Payment methods', terms: 'Terms', tags: 'Tags' };
    function items() {
      if (kind === 'cats') { var seen = {}; S.items.forEach(function (i) { if (i.category) i.category.split(':').reduce(function (acc, part) { var k = acc ? acc + ':' + part : part; seen[k] = 1; return k; }, ''); }); (V.extraCats || []).forEach(function (c) { seen[c] = 1; }); return Object.keys(seen).sort(); }
      if (kind === 'methods') return U.METHODS;
      if (kind === 'terms') return U.TERMS;
      return S.tags.map(function (t) { return typeof t === 'string' ? t : t.name; });
    }
    var m = UI.modal(titles[kind], '<div class="qbm-listm"></div><div class="qbm-listm-add">' + UI.input('newItem', '', ' placeholder="Add a new ' + titles[kind].toLowerCase().replace(/s$/, '').replace(/ie$/, 'y') + '"') + UI.btn('Add', { kind: 'secondary', attrs: ' data-add' }) + '</div>', { buttons: [['Done', 'primary']] });
    function draw() {
      var list = items();
      m.querySelector('.qbm-listm').innerHTML = list.length ? list.map(function (x) {
        var c = kind === 'cats' ? S.items.filter(function (i) { return i.category === x; }).length : kind === 'terms' ? U.termsDays(x) + ' days' : '';
        return '<div class="qbm-listm-row" style="padding-left:' + (kind === 'cats' ? 8 + (x.split(':').length - 1) * 18 : 8) + 'px"><span>' + U.esc(kind === 'cats' ? x.split(':').pop() : x) + '</span><span class="qb-grow"></span><span class="qb-muted qbm-small">' + (kind === 'cats' ? c + ' item' + (c === 1 ? '' : 's') : c) + '</span></div>';
      }).join('') : '<p class="qb-muted">Nothing here yet.</p>';
    }
    m.addEventListener('click', function (e) {
      if (!e.target.closest('[data-add]')) return;
      var inp = m.querySelector('[name=newItem]'), v = inp.value.trim(); if (!v) return;
      if (items().some(function (x) { return x.toLowerCase() === v.toLowerCase(); })) return UI.toast('That name is already on the list.', 'err');
      if (kind === 'cats') (V.extraCats = V.extraCats || []).push(v);
      else if (kind === 'methods') U.METHODS.push(v);
      else if (kind === 'terms') U.TERMS.push(v);
      else S.tags.push({ id: U.uid('tag'), name: v, group: '' });
      inp.value = ''; draw(); UI.toast(v + ' added.');
    });
    draw();
  };

  /* ═════════ Attachments ═════════ */
  function fmtSize(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  QB.view('attachments', function (p, el) {
    el.innerHTML = head('Attachments', UI.feedbackLink() + '<label class="qb-btn qb-btn-primary">' + ic('upload') + '<span>Add attachment</span><input type="file" multiple hidden data-files></label>') +
      '<div class="qbm-drop" data-drop>' + ic('attach') + '<div><b>Drag and drop files here</b> or <label class="qb-link">select files<input type="file" multiple hidden data-files></label></div><div class="qb-muted qbm-small">Max file size: 20 MB</div></div>' +
      (V.files.length ? '<div class="qbm-tbl"></div>' : empty({ title: 'No attachments yet', text: 'Add receipts, contracts, and other files here, then link them to transactions and contacts.' }));
    if (V.files.length) UI.table(el.querySelector('.qbm-tbl'), [
      { key: 'ext', label: 'Type', render: function (f) { return '<span class="qbm-ext">' + U.esc(f.ext) + '</span>'; } },
      { key: 'name', label: 'Name', render: function (f) { return '<b>' + U.esc(f.name) + '</b>'; } },
      { key: 'size', label: 'Size', align: 'right', render: function (f) { return fmtSize(f.size); } },
      { key: 'date', label: 'Uploaded', render: function (f) { return U.fmtDate(f.date); } },
      { key: 'links', label: 'Links', render: function () { return '<span class="qb-muted">Unlinked</span>'; } },
      { key: 'note', label: 'Note', render: function (f) { return '<button type="button" class="qb-link" data-act="qbm:attnote:' + f.id + '">' + (f.note ? U.esc(f.note) : 'Add note') + '</button>'; } },
      { key: 'act', label: 'Action', sort: false, align: 'right', render: function (f) { return '<span class="qb-act"><button type="button" class="qb-link" data-act="qbm:attview:' + f.id + '">View</button><span class="qb-sep">|</span><button type="button" class="qb-link" data-act="qbm:attdel:' + f.id + '">Delete</button></span>'; } }
    ], V.files, { sortKey: 'date', sortDir: 'desc' });
    function add(list) {
      var n = 0;
      [].slice.call(list || []).forEach(function (f) {
        if (f.size > 20 * 1024 * 1024) return UI.toast(f.name + ' is larger than 20 MB.', 'err');
        V.files.push({ id: U.uid('att'), name: f.name, size: f.size, ext: (f.name.split('.').pop() || '').toUpperCase().slice(0, 4), date: U.today(), file: f, note: '' }); n++;
      });
      if (n) { UI.toast(n + ' file' + (n === 1 ? '' : 's') + ' added.'); QB.render(); }
    }
    U.$$('[data-files]', el).forEach(function (i) { i.addEventListener('change', function () { add(i.files); }); });
    var dz = el.querySelector('[data-drop]');
    dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('is-over'); });
    dz.addEventListener('dragleave', function () { dz.classList.remove('is-over'); });
    dz.addEventListener('drop', function (e) { e.preventDefault(); dz.classList.remove('is-over'); add(e.dataTransfer.files); });
  });
  function att(id) { return V.files.filter(function (f) { return f.id === id; })[0]; }
  ACT.attview = function (a) { var f = att(a[0]); if (!f || !f.file) return; var url = URL.createObjectURL(f.file); window.open(url, '_blank'); setTimeout(function () { URL.revokeObjectURL(url); }, 60000); };
  ACT.attdel = function (a) { var f = att(a[0]); UI.confirm('Delete attachment?', 'Delete ' + f.name + '?', 'Delete', function () { V.files.splice(V.files.indexOf(f), 1); QB.render(); }); };
  ACT.attnote = function (a) { var f = att(a[0]); UI.modal('Note', UI.field('Note', UI.input('note', f.note)), { buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (m) { f.note = val(m, 'note'); QB.render(); }]] }); };

  /* ═════════ Custom fields ═════════ */
  var CF_FORMS = ['Customers', 'Vendors', 'Invoices', 'Estimates', 'Sales receipts', 'Purchase orders', 'Bills', 'Expenses'];
  QB.view('customfields', function (p, el) {
    var list = S.settings.customFields = S.settings.customFields || [];
    el.innerHTML = head('Custom fields', UI.feedbackLink() + UI.btn('Add field', { kind: 'primary', act: 'qbm:cf:new' })) +
      '<p class="qb-muted">Track the details that matter to your business. Custom fields show up on the forms and records you choose.</p>' +
      (list.length ? '<div class="qbm-tbl"></div>' : empty({ art: QB.art('docs'), title: 'Add your first custom field', text: 'For example, a PO number on invoices or a crew lead on estimates.', actions: UI.btn('Add field', { kind: 'primary', act: 'qbm:cf:new' }) }));
    if (list.length) UI.table(el.querySelector('.qbm-tbl'), [
      { key: 'name', label: 'Name', render: function (f) { return '<b>' + U.esc(f.name) + '</b>'; } },
      { key: 'type', label: 'Data type' }, { key: 'forms', label: 'Added to', render: function (f) { return U.esc(f.forms.join(', ')); } },
      { key: 'print', label: 'Print on form', render: function (f) { return f.print ? 'Yes' : 'No'; } },
      { key: 'status', label: 'Status', render: function (f) { return f.active === false ? 'Inactive' : 'Active'; } },
      { key: 'act', label: 'Action', sort: false, align: 'right', render: function (f) { return '<span class="qb-act"><button type="button" class="qb-link" data-act="qbm:cf:edit:' + f.id + '">Edit</button><span class="qb-sep">|</span><button type="button" class="qb-link" data-act="qbm:cf:del:' + f.id + '">Delete</button></span>'; } }
    ], list, {});
  });
  ACT.cf = function (a) {
    var list = S.settings.customFields = S.settings.customFields || [];
    var f = a[1] ? list.filter(function (x) { return x.id === a[1]; })[0] : null;
    if (a[0] === 'del') return UI.confirm('Delete custom field?', 'Delete ' + f.name + '? It will be removed from all forms.', 'Delete', function () { list.splice(list.indexOf(f), 1); changed('settings'); });
    var d = UI.drawer(f ? 'Edit custom field' : 'Add custom field', '<div class="qbm-form">' + UI.field('Field name *', UI.input('name', f ? f.name : '', ' maxlength="31"')) +
      UI.field('Data type', UI.select('type', ['Text and number', 'Number', 'Date', 'Dropdown list'], f ? f.type : 'Text and number')) +
      '<div class="qbm-cf-opts"' + (f && f.type === 'Dropdown list' ? '' : ' hidden') + '>' + UI.field('Dropdown options (one per line)', '<textarea class="qb-input" name="opts" rows="4">' + U.esc(f && f.opts ? f.opts.join('\n') : '') + '</textarea>') + '</div>' +
      '<h4 class="qbm-sub">Add this field to</h4><div class="qbm-chkgrid">' + CF_FORMS.map(function (x) { return '<label class="qbm-chk"><input type="checkbox" name="form_' + x + '"' + (f ? (f.forms.indexOf(x) >= 0 ? ' checked' : '') : (x === 'Invoices' ? ' checked' : '')) + '> ' + x + '</label>'; }).join('') + '</div>' +
      '<label class="qbm-chk qbm-chk-row">' + UI.toggle('print', f ? f.print : true) + ' Print on form</label></div>', {
      onSave: function (dr) {
        var n = val(dr, 'name'); if (!err(dr.querySelector('[name=name]'), !n)) return false;
        if (list.some(function (x) { return x !== f && x.name.toLowerCase() === n.toLowerCase(); })) { UI.toast('A custom field with that name already exists.', 'err'); return false; }
        var forms = CF_FORMS.filter(function (x) { return val(dr, 'form_' + x); });
        if (!forms.length) { UI.toast('Choose at least one form or record.', 'err'); return false; }
        var o = f || { id: U.uid('cf'), active: true };
        o.name = n; o.type = val(dr, 'type'); o.forms = forms; o.print = val(dr, 'print');
        o.opts = o.type === 'Dropdown list' ? val(dr, 'opts').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean) : null;
        if (!f) list.push(o);
        UI.toast(f ? 'Custom field saved.' : n + ' was added.'); changed('settings');
      }
    });
    d.addEventListener('change', function (e) { if (e.target.name === 'type') d.querySelector('.qbm-cf-opts').hidden = e.target.value !== 'Dropdown list'; });
  };

  /* ═════════ Reclassify transactions ═════════ */
  var PL_TYPES = ['Income', 'Other Income', 'Cost of Goods Sold', 'Expenses', 'Other Expense'];
  function rcAccounts() { return S.ordered().filter(function (a) { return a.active !== false && (V.rcType === 'pl' ? PL_TYPES.indexOf(a.type) >= 0 : PL_TYPES.indexOf(a.type) < 0); }); }
  function rcLines(acct, r) {
    var out = [];
    S.find(function (t) { return !t.system && t.date >= r[0] && t.date <= r[1]; }).forEach(function (t) {
      (t.lines || []).forEach(function (l, i) {
        if (l.acct !== acct) return;
        var amt = l.amount != null ? l.amount : (l.debit || 0) - (l.credit || 0);
        out.push({ id: t.id + '~' + i, t: t, i: i, date: t.date, type: t.type, no: t.no || '', name: S.payeeName(t) || S.custName(l.cust), memo: l.desc || t.memo || '', amount: amt });
      });
    });
    return out;
  }
  QB.view('reclassify', function (p, el) {
    var r = U.range(V.rcRange), accts = rcAccounts();
    if (!V.rcAcct || !accts.some(function (a) { return a.id === V.rcAcct; })) {
      var first = accts.filter(function (a) { return rcLines(a.id, r).length; })[0] || accts[0]; V.rcAcct = first ? first.id : null;
    }
    var lines = V.rcAcct ? rcLines(V.rcAcct, r) : [];
    var targets = rcAccounts().filter(function (a) { return a.id !== V.rcAcct; }).map(function (a) { return [a.id, S.fullName(a.id)]; });
    el.innerHTML = head('Reclassify transactions', UI.feedbackLink()) +
      '<div class="qb-filters">' + UI.field('Basis', UI.select('rcBasis', ['Accrual', 'Cash'], V.rcBasis || 'Accrual')) + UI.field('Dates', UI.select('rcRange', U.RANGES, V.rcRange)) +
      UI.field('Account types', UI.select('rcType', [['pl', 'Profit and loss'], ['bs', 'Balance sheet']], V.rcType)) + '</div>' +
      '<div class="qbm-rc"><aside class="qbm-rc-accts"><div class="qbm-rc-h"><span>Account</span><span>Balance</span></div>' + accts.map(function (a) {
        var b = L.balance(a.id, { from: r[0], to: r[1], children: false, cash: V.rcBasis === 'Cash' });
        return '<button type="button" class="qbm-rc-acct' + (a.id === V.rcAcct ? ' on' : '') + '" data-act="qbm:rcacct:' + a.id + '" style="padding-left:' + (10 + S.depth(a.id) * 14) + 'px"><span>' + U.esc(a.name) + '</span><b>' + U.num(b) + '</b></button>';
      }).join('') + '</aside>' +
      '<div class="qbm-rc-main"><div class="qbm-rc-top"><h3>' + U.esc(V.rcAcct ? S.fullName(V.rcAcct) : '') + '</h3><span class="qb-muted qbm-small">' + lines.length + ' line' + (lines.length === 1 ? '' : 's') + ' · ' + U.fmtDate(r[0], 'mon') + ' – ' + U.fmtDate(r[1], 'mon') + '</span></div>' +
      '<div class="qbm-rc-mod"><b>Modify selected</b>' + UI.field('Change account to', UI.select('rcTo', [['', 'Select an account']].concat(targets), '')) + UI.btn('Reclassify', { kind: 'primary', act: 'qbm:rcgo', disabled: true, id: 'qbmRcGo' }) + '</div>' +
      '<div class="qbm-tbl"></div></div></div>';
    ['rcBasis', 'rcRange', 'rcType'].forEach(function (n) { el.querySelector('[name=' + n + ']').onchange = function () { V[n] = this.value; if (n === 'rcType') V.rcAcct = null; QB.render(); }; });
    var btn = el.querySelector('#qbmRcGo'), to = el.querySelector('[name=rcTo]');
    var tb = UI.table(el.querySelector('.qbm-tbl'), [
      { key: 'date', label: 'Date', render: function (x) { return U.fmtDate(x.date); } }, { key: 'type', label: 'Type' }, { key: 'no', label: 'No.' },
      { key: 'name', label: 'Name' }, { key: 'memo', label: 'Memo' },
      { key: 'acct', label: 'Account', sort: false, render: function () { return U.esc(S.fullName(V.rcAcct)); } },
      { key: 'amount', label: 'Amount', align: 'right', render: function (x) { return U.num(x.amount); } }
    ], lines, { check: true, sortKey: 'date', sortDir: 'desc', empty: 'No transactions use this account in these dates.', onCheck: sync });
    function sync() { btn.disabled = !(tb.checked().length && to.value); }
    to.onchange = sync;
    K.rc = { table: tb, lines: lines };
  });
  ACT.rcacct = function (a) { V.rcAcct = a[0]; QB.render(); };
  ACT.rcgo = function () {
    var to = U.$('.qbm-rc-mod [name=rcTo]').value, sel = K.rc.table.checked(); if (!to || !sel.length) return;
    var touched = [];
    sel.forEach(function (rid) {
      var x = K.rc.lines.filter(function (l) { return l.id === rid; })[0]; if (!x) return;
      x.t.lines[x.i].acct = to; if (touched.indexOf(x.t) < 0) touched.push(x.t);
    });
    touched.forEach(function (t) { S.log('Edited', t); });
    UI.toast(sel.length + ' line' + (sel.length === 1 ? '' : 's') + ' moved to ' + S.fullName(to) + '.');
    changed('update');
  };

  /* ═════════ Import data ═════════ */
  var IMPORTS = {
    bank: { label: 'Bank data', icon: 'bank', fields: [['date', 'Date', 1], ['desc', 'Description', 1], ['amount', 'Amount', 1]] },
    customers: { label: 'Customers', icon: 'users', fields: [['name', 'Name', 1], ['company', 'Company'], ['email', 'Email'], ['phone', 'Phone'], ['street', 'Street'], ['city', 'City'], ['state', 'State'], ['zip', 'ZIP code']] },
    vendors: { label: 'Vendors', icon: 'store', fields: [['name', 'Name', 1], ['company', 'Company'], ['email', 'Email'], ['phone', 'Phone'], ['street', 'Street'], ['city', 'City'], ['state', 'State'], ['zip', 'ZIP code']] },
    coa: { label: 'Chart of accounts', icon: 'reports', fields: [['name', 'Account name', 1], ['type', 'Type', 1], ['detail', 'Detail type'], ['desc', 'Description']] },
    items: { label: 'Products and services', icon: 'tag', fields: [['name', 'Name', 1], ['sku', 'SKU'], ['type', 'Type'], ['desc', 'Sales description'], ['price', 'Sales price/rate'], ['cost', 'Purchase cost'], ['qty', 'Quantity on hand'], ['category', 'Category']] },
    invoices: { label: 'Invoices', icon: 'doc', fields: [['no', 'Invoice no.', 1], ['cust', 'Customer', 1], ['date', 'Invoice date'], ['due', 'Due date'], ['item', 'Product/Service'], ['amount', 'Amount', 1]] },
    bills: { label: 'Bills', icon: 'doc', fields: [['no', 'Bill no.'], ['vendor', 'Vendor', 1], ['date', 'Bill date'], ['due', 'Due date'], ['acct', 'Account'], ['amount', 'Amount', 1]] },
    je: { label: 'Journal entries', icon: 'copy', fields: [['no', 'Journal no.', 1], ['date', 'Date'], ['acct', 'Account', 1], ['debit', 'Debits'], ['credit', 'Credits'], ['desc', 'Description']] }
  };
  var SAMPLES = {
    bank: 'Date,Description,Amount\n11/01/2026,Coffee shop,-12.50\n11/02/2026,Customer deposit,450.00',
    customers: 'Name,Company,Email,Phone,Street,City,State,ZIP code\nRiver Rock Cafe,River Rock Cafe,hello@riverrock.example,(650) 555-0101,12 Creek Rd.,Bayshore,CA,94326\nMaria Lopez,,maria@example.com,(650) 555-0102,8 Elm St.,Middlefield,CA,94303',
    vendors: 'Name,Company,Email,Phone,Street,City,State,ZIP code\nGreen Thumb Supply,Green Thumb Supply,orders@greenthumb.example,(650) 555-0201,90 Farm Rd.,San Jose,CA,95021',
    coa: 'Account name,Type,Detail type,Description\nSmall Tools,Expenses,Supplies & Materials,Hand tools under $200',
    items: 'Name,SKU,Type,Sales description,Sales price/rate,Purchase cost,Quantity on hand,Category\nMulch,M100-01,Inventory,Bark mulch (2 cu ft),8.50,4.25,40,Landscaping\nHedge Trimming,,Service,Hedge trimming per hour,45,,,Landscaping',
    invoices: 'Invoice no.,Customer,Invoice date,Due date,Product/Service,Amount\n2001,Cool Cars,11/01/2026,12/01/2026,Gardening,120.00',
    bills: 'Bill no.,Vendor,Bill date,Due date,Account,Amount\nB-77,PG&E,11/01/2026,12/01/2026,Utilities,95.40',
    je: 'Journal no.,Date,Account,Debits,Credits,Description\nJE-9,11/01/2026,Rent or Lease,500,,Monthly rent\nJE-9,11/01/2026,Checking,,500,Monthly rent'
  };
  function parseCSV(text) {
    var rows = [], row = [], cur = '', q = false, i, c;
    text = String(text || '').replace(/^﻿/, '');
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); }).map(function (r) { return r.map(function (x) { return String(x).trim(); }); });
  }
  K.parseCSV = parseCSV; K.doImport = function (k, r, a) { return doImport(k, r, a); }; K.exportTable = function (n, r) { return exportTable(n, r); };
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  K.download = download;
  QB.view('importdata', function (p, el) {
    el.innerHTML = head('Import data', UI.feedbackLink()) + '<p class="qb-muted">Choose what to bring in. Use a CSV file; download a sample to see the format.</p><div class="qbm-imp-tiles">' + Object.keys(IMPORTS).map(function (k) {
      return '<button type="button" class="qbm-imp-tile" data-act="qbm:imp:' + k + '"><span>' + ic(IMPORTS[k].icon) + '</span><b>' + IMPORTS[k].label + '</b></button>';
    }).join('') + '</div><p class="qb-muted qbm-small">Moving from QuickBooks Desktop? <button type="button" class="qb-link" data-act="info:importdesktop">Import desktop data</button></p>';
  });
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  ACT.imp = function (a) {
    var kind = a[0], def = IMPORTS[kind], st = { step: 1, headers: [], rows: [], map: {}, file: '', acct: 'a_chk', done: null };
    var m = UI.modal('Import ' + def.label.toLowerCase(), '<div class="qbm-imp"></div>', { wide: true, sticky: true });
    var box = m.querySelector('.qbm-imp');
    function stepper() { return '<ol class="qbm-stepper">' + ['Upload', 'Map data', 'Import'].map(function (s, i) { return '<li class="' + (st.step === i + 1 ? 'on' : st.step > i + 1 ? 'done' : '') + '"><span>' + (st.step > i + 1 ? ic('check') : i + 1) + '</span>' + s + '</li>'; }).join('') + '</ol>'; }
    function mapped(r) { var o = {}; def.fields.forEach(function (f) { var j = st.map[f[0]]; o[f[0]] = j === '' || j == null ? '' : (r[+j] || ''); }); return o; }
    function draw() {
      var h = stepper();
      if (st.step === 1) {
        h += '<div class="qbm-imp-up"><div class="qbm-drop" data-drop>' + ic('upload') + '<div><b>' + (st.file ? U.esc(st.file) : 'Drag and drop a CSV file') + '</b>' + (st.file ? '<div class="qb-muted qbm-small">' + st.rows.length + ' row' + (st.rows.length === 1 ? '' : 's') + ' found</div>' : '') + '</div><label class="qb-btn qb-btn-secondary qb-btn-sm">Browse<input type="file" accept=".csv,text/csv" hidden data-file></label></div>' +
          (kind === 'bank' ? UI.field('Bank account', UI.select('acct', QB.lists.payFrom().map(function (o) { return [o.value, o.label]; }), st.acct)) : '') +
          '<p class="qb-muted qbm-small">Don\'t have a file? <button type="button" class="qb-link" data-sample>Download a sample file</button>. The first row must have column names.</p></div>';
      } else if (st.step === 2) {
        h += '<p>Match your columns to QuickBooks fields. Fields with * are required.</p><table class="qbm-maptable"><thead><tr><th>QuickBooks Online field</th><th>Your field</th><th>Example</th></tr></thead><tbody>' + def.fields.map(function (f) {
          return '<tr><td>' + f[1] + (f[2] ? ' *' : '') + '</td><td>' + UI.select('map_' + f[0], [['', 'No match']].concat(st.headers.map(function (hh, i) { return [String(i), hh]; })), st.map[f[0]] == null ? '' : st.map[f[0]]) + '</td><td class="qb-muted">' + U.esc(st.rows[0] && st.map[f[0]] !== '' && st.map[f[0]] != null ? st.rows[0][+st.map[f[0]]] || '' : '') + '</td></tr>';
        }).join('') + '</tbody></table>';
      } else if (st.done) {
        h += '<div class="qbm-imp-done">' + ic('checkCircle') + '<h3>' + U.esc(st.done) + '</h3></div>';
      } else {
        var prev = st.rows.slice(0, 50).map(mapped), bad = prev.filter(function (o) { return def.fields.some(function (f) { return f[2] && !o[f[0]]; }); }).length;
        h += '<p><b>' + st.rows.length + '</b> row' + (st.rows.length === 1 ? '' : 's') + ' ready to import' + (bad ? ', <span class="qbm-bad">' + bad + ' missing required info will be skipped</span>' : '') + '.</p><div class="qbm-imp-prev"><table class="qbm-mini"><thead><tr>' + def.fields.map(function (f) { return '<th>' + f[1] + '</th>'; }).join('') + '</tr></thead><tbody>' +
          prev.slice(0, 10).map(function (o) { return '<tr>' + def.fields.map(function (f) { return '<td' + (f[2] && !o[f[0]] ? ' class="qbm-bad"' : '') + '>' + U.esc(o[f[0]] || '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      }
      h += '<div class="qbm-imp-foot">' + (st.done ? '<span class="qb-grow"></span>' + UI.btn('Done', { kind: 'primary', attrs: ' data-close' }) :
        UI.btn(st.step === 1 ? 'Cancel' : 'Back', { kind: 'secondary', attrs: st.step === 1 ? ' data-close' : ' data-back' }) + '<span class="qb-grow"></span>' +
        UI.btn(st.step === 3 ? 'Import' : 'Next', { kind: 'primary', attrs: ' data-next', disabled: st.step === 1 && !st.rows.length })) + '</div>';
      box.innerHTML = h;
      var fi = box.querySelector('[data-file]'), dz = box.querySelector('[data-drop]');
      if (fi) fi.addEventListener('change', function () { read(fi.files[0]); });
      if (dz) { dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('is-over'); }); dz.addEventListener('dragleave', function () { dz.classList.remove('is-over'); }); dz.addEventListener('drop', function (e) { e.preventDefault(); read(e.dataTransfer.files[0]); }); }
    }
    function read(file) {
      if (!file) return;
      var rd = new FileReader();
      rd.onload = function () {
        var rows = parseCSV(rd.result);
        if (rows.length < 2) { UI.toast('That file has no data rows. Check the format and try again.', 'err'); return; }
        st.file = file.name; st.headers = rows[0]; st.rows = rows.slice(1); st.map = {};
        def.fields.forEach(function (f) { var j = st.headers.map(norm).indexOf(norm(f[1])); if (j < 0) j = st.headers.map(norm).indexOf(norm(f[0])); if (j < 0) j = st.headers.map(norm).findIndex(function (hh) { return hh && (hh.indexOf(norm(f[1])) >= 0 || norm(f[1]).indexOf(hh) >= 0); }); st.map[f[0]] = j >= 0 ? String(j) : ''; });
        draw();
      };
      rd.readAsText(file);
    }
    box.addEventListener('click', function (e) {
      if (e.target.closest('[data-sample]')) return download('sample-' + kind + '.csv', SAMPLES[kind]);
      if (e.target.closest('[data-back]')) { st.step--; return draw(); }
      if (e.target.closest('[data-next]')) {
        if (st.step === 1) { var ac = box.querySelector('[name=acct]'); if (ac) st.acct = ac.value; st.step = 2; return draw(); }
        if (st.step === 2) {
          def.fields.forEach(function (f) { st.map[f[0]] = box.querySelector('[name=map_' + f[0] + ']').value; });
          var miss = def.fields.filter(function (f) { return f[2] && st.map[f[0]] === ''; });
          if (miss.length) return UI.toast('Match the required fields: ' + miss.map(function (f) { return f[1]; }).join(', ') + '.', 'err');
          st.step = 3; return draw();
        }
        st.done = doImport(kind, st.rows.map(mapped), st.acct);
        UI.toast(st.done);
        draw();
        S.changed('import');
      }
    });
    box.addEventListener('change', function (e) { if (e.target.name && e.target.name.indexOf('map_') === 0) { st.map[e.target.name.slice(4)] = e.target.value; draw(); } });
    draw();
  };
  function doImport(kind, rows, acct) {
    var def = IMPORTS[kind], added = 0, skipped = 0;
    rows.forEach(function (o) {
      def.fields.forEach(function (f) { o[f[0]] = o[f[0]] == null ? '' : String(o[f[0]]).trim(); });
      if (def.fields.some(function (f) { return f[2] && !o[f[0]]; })) { skipped++; return; }
      if (kind === 'customers' || kind === 'vendors') {
        var list = kind === 'customers' ? S.customers : S.vendors;
        if (list.some(function (x) { return x.name.toLowerCase() === o.name.toLowerCase(); })) { skipped++; return; }
        var parts = o.name.split(' ');
        var base = { id: U.uid(kind === 'customers' ? 'c' : 'v'), name: o.name, company: o.company, phone: o.phone, email: o.email, street: o.street, city: o.city, state: o.state, zip: o.zip, active: true, terms: 'Net 30', notes: '' };
        if (kind === 'customers') { Object.assign(base, { parent: null, first: o.company ? '' : parts[0], last: o.company ? '' : parts.slice(1).join(' '), taxable: true, type: '' }); S.customers.push(base); S.cust[base.id] = base; }
        else { base.track1099 = false; S.vendors.push(base); S.vend[base.id] = base; }
        added++;
      } else if (kind === 'items') {
        if (S.items.some(function (x) { return x.name.toLowerCase() === o.name.toLowerCase(); })) { skipped++; return; }
        var ty = /inv/i.test(o.type) ? 'Inventory' : /non/i.test(o.type) ? 'Non-inventory' : 'Service';
        var it = { id: U.uid('i'), name: o.name, desc: o.desc, category: o.category, sku: o.sku, type: ty, price: U.parseMoney(o.price), cost: U.parseMoney(o.cost), qty: ty === 'Inventory' ? U.parseMoney(o.qty) : null, incomeAcct: ty === 'Service' ? 'a_serv' : 'a_sop', expenseAcct: ty === 'Inventory' ? 'a_cogs' : null, taxable: ty !== 'Service', active: true, reorder: null, purchDesc: '' };
        S.items.push(it); S.item[it.id] = it; added++;
      } else if (kind === 'coa') {
        if (S.accounts.some(function (x) { return x.name.toLowerCase() === o.name.toLowerCase() && !x.parent; })) { skipped++; return; }
        var type = QB.ACCOUNT_TYPES.filter(function (t) { return norm(t) === norm(o.type) || norm(t).indexOf(norm(o.type)) === 0; })[0] || 'Expenses';
        var ac = { id: U.uid('a'), name: o.name, parent: null, type: type, detail: o.detail || type, target: null, active: true, desc: o.desc || '' };
        S.accounts.push(ac); S.acct[ac.id] = ac; added++;
      } else if (kind === 'bank') {
        var d = U.parseDate(o.date), amt = U.parseMoney(o.amount); if (!d || !amt) { skipped++; return; }
        (S.bankFeed[acct] = S.bankFeed[acct] || []).push({ id: U.uid('bf'), account: acct, date: d, desc: o.desc, spent: amt < 0 ? -amt : 0, received: amt > 0 ? amt : 0, kind: 'cat', hint: null, side: amt < 0 ? 'vendor' : 'customer', warn: false, state: 'pending', payee: '', category: '', memo: '' });
        added++;
      } else added++;
    });
    var noun = { customers: 'customer', vendors: 'vendor', items: 'product or service', coa: 'account', bank: 'bank transaction', invoices: 'invoice row', bills: 'bill row', je: 'journal line' }[kind];
    var msg = added + ' ' + noun + (added === 1 ? '' : 's') + ' imported' + (skipped ? ', ' + skipped + ' skipped (duplicate or missing info)' : '') + '.';
    if (['invoices', 'bills', 'je'].indexOf(kind) >= 0) msg = added + ' ' + noun + (added === 1 ? '' : 's') + ' checked. In the practice copy, create these transactions with the + Create menu.';
    return msg;
  }

  /* ═════════ Export data ═════════ */
  var EX_REPORTS = ['Profit and Loss', 'Balance Sheet', 'Trial Balance', 'General Ledger', 'Journal', 'Customer Balance Summary', 'Vendor Balance Summary', 'Transaction List by Date'];
  var EX_LISTS = ['Customers', 'Vendors', 'Employees', 'Products and services', 'Chart of accounts', 'Terms', 'Payment methods', 'Contractors'];
  V.exSel = {}; EX_REPORTS.concat(EX_LISTS).forEach(function (n) { V.exSel[n] = true; });
  function csvRow(a) { return a.map(function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }
  function exportTable(name, r) {
    var rows = [], f = r[0], t = r[1];
    if (name === 'Profit and Loss') {
      rows.push(['Account', 'Type', 'Total']);
      S.ordered().forEach(function (a) { if (PL_TYPES.indexOf(a.type) < 0) return; var b = L.balance(a.id, { from: f, to: t, children: false }); if (Math.abs(b) > 0.004) rows.push([S.fullName(a.id), a.type, U.r2(b).toFixed(2)]); });
      rows.push(['Net Income', '', K.plTotals(f, t).net.toFixed(2)]);
    } else if (name === 'Balance Sheet') {
      rows.push(['Account', 'Type', 'Total']);
      S.ordered().forEach(function (a) { if (PL_TYPES.indexOf(a.type) >= 0) return; var b = L.balance(a.id, { to: t, children: false }); if (Math.abs(b) > 0.004) rows.push([S.fullName(a.id), a.type, U.r2(b).toFixed(2)]); });
      rows.push(['Net Income', 'Equity', K.plTotals(t.slice(0, 4) + '-01-01', t).net.toFixed(2)]);
    } else if (name === 'Trial Balance') {
      rows.push(['Account', 'Debit', 'Credit']);
      S.ordered().forEach(function (a) { var b = L.balance(a.id, { to: t, children: false }); if (Math.abs(b) < 0.005) return; var dr = S.isDebit(a) ? b : -b; rows.push([S.fullName(a.id), dr > 0 ? dr.toFixed(2) : '', dr < 0 ? (-dr).toFixed(2) : '']); });
    } else if (name === 'General Ledger' || name === 'Journal') {
      rows.push(['Date', 'Transaction type', 'No.', 'Name', 'Memo', 'Account', 'Debit', 'Credit']);
      var ents = L.entries(function (p, tx) { return tx.date >= f && tx.date <= t; });
      if (name === 'General Ledger') ents.sort(function (x, y) { return S.fullName(x.p.acct) < S.fullName(y.p.acct) ? -1 : S.fullName(x.p.acct) > S.fullName(y.p.acct) ? 1 : 0; });
      ents.forEach(function (e) { rows.push([U.fmtDate(e.t.date), e.t.type, e.t.no || '', S.payeeName(e.t), e.p.desc || e.t.memo || '', S.fullName(e.p.acct), e.p.amt > 0 ? e.p.amt.toFixed(2) : '', e.p.amt < 0 ? (-e.p.amt).toFixed(2) : '']); });
    } else if (name === 'Customer Balance Summary') {
      rows.push(['Customer', 'Balance']); S.customers.forEach(function (c) { var b = L.custBalance(c.id, false); if (Math.abs(b) > 0.004) rows.push([S.custName(c.id), b.toFixed(2)]); });
    } else if (name === 'Vendor Balance Summary') {
      rows.push(['Vendor', 'Balance']); S.vendors.forEach(function (v) { var b = L.vendBalance(v.id); if (Math.abs(b) > 0.004) rows.push([v.name, b.toFixed(2)]); });
    } else if (name === 'Transaction List by Date') {
      rows.push(['Date', 'Transaction type', 'No.', 'Name', 'Memo', 'Amount']);
      S.find(function (tx) { return tx.date >= f && tx.date <= t; }).sort(function (x, y) { return x.date < y.date ? -1 : 1; }).forEach(function (tx) { rows.push([U.fmtDate(tx.date), tx.type, tx.no || '', S.payeeName(tx), tx.memo || '', (tx.total || 0).toFixed(2)]); });
    } else if (name === 'Customers') {
      rows.push(['Name', 'Company', 'Email', 'Phone', 'Street', 'City', 'State', 'ZIP', 'Open balance']);
      S.customers.forEach(function (c) { rows.push([S.custName(c.id), c.company, c.email, c.phone, c.street, c.city, c.state, c.zip, L.custBalance(c.id, false).toFixed(2)]); });
    } else if (name === 'Vendors') {
      rows.push(['Name', 'Company', 'Email', 'Phone', 'Street', 'City', 'State', 'ZIP', 'Track 1099', 'Open balance']);
      S.vendors.forEach(function (v) { rows.push([v.name, v.company, v.email, v.phone, v.street, v.city, v.state, v.zip, v.track1099 ? 'Yes' : 'No', L.vendBalance(v.id).toFixed(2)]); });
    } else if (name === 'Employees') {
      rows.push(['Name', 'Email', 'Phone', 'Pay type', 'Rate', 'Status']); S.employees.forEach(function (e) { rows.push([e.name, e.email, e.phone, e.payType, e.rate, e.status]); });
    } else if (name === 'Products and services') {
      rows.push(['Name', 'SKU', 'Type', 'Sales description', 'Category', 'Price', 'Cost', 'Qty on hand']);
      S.items.forEach(function (i) { rows.push([i.name, i.sku, i.type, i.desc, i.category, i.price, i.cost, i.qty == null ? '' : i.qty]); });
    } else if (name === 'Chart of accounts') {
      rows.push(['Account', 'Type', 'Detail type', 'QuickBooks balance']); S.ordered().forEach(function (a) { rows.push([S.fullName(a.id), a.type, a.detail, L.balance(a.id).toFixed(2)]); });
    } else if (name === 'Terms') { rows.push(['Terms', 'Days']); U.TERMS.forEach(function (x) { rows.push([x, U.termsDays(x)]); }); }
    else if (name === 'Payment methods') { rows.push(['Payment method']); U.METHODS.forEach(function (x) { rows.push([x]); }); }
    else if (name === 'Contractors') { rows.push(['Name', 'Email', 'W-9 info', 'Paid this year']); S.contractors.forEach(function (c) { rows.push([c.name, c.email, c.w9, c.paid]); }); }
    return rows;
  }
  QB.view('exportdata', function (p, el) {
    var list = V.exTab === 'reports' ? EX_REPORTS : EX_LISTS;
    el.innerHTML = head('Export data', UI.feedbackLink()) +
      '<p class="qb-muted">Download your reports and lists. QuickBooks puts them in one file you can open in Excel.</p>' +
      '<div class="qb-tabs"><button type="button" class="' + (V.exTab === 'reports' ? 'on' : '') + '" data-act="qbm:extab:reports">Reports</button><button type="button" class="' + (V.exTab === 'lists' ? 'on' : '') + '" data-act="qbm:extab:lists">Lists</button></div>' +
      (V.exTab === 'reports' ? '<div class="qb-filters">' + UI.field('Report period', UI.select('exRange', U.RANGES, V.exRange)) + '</div>' : '') +
      '<div class="qbm-ex"><label class="qbm-chk qbm-ex-all"><input type="checkbox" data-all' + (list.every(function (n) { return V.exSel[n]; }) ? ' checked' : '') + '> <b>Select all</b></label>' + list.map(function (n) {
        return '<label class="qbm-chk"><input type="checkbox" data-ex="' + U.esc(n) + '"' + (V.exSel[n] ? ' checked' : '') + '> ' + n + '</label>';
      }).join('') + '</div><div class="qbm-acts">' + UI.btn('Export to Excel', { kind: 'primary', act: 'qbm:exgo', icon: 'export' }) + '</div>';
    var rs = el.querySelector('[name=exRange]'); if (rs) rs.onchange = function () { V.exRange = this.value; };
    el.querySelector('.qbm-ex').addEventListener('change', function (e) {
      if (e.target.dataset.all != null) { list.forEach(function (n) { V.exSel[n] = e.target.checked; }); U.$$('[data-ex]', el).forEach(function (c) { c.checked = e.target.checked; }); }
      else if (e.target.dataset.ex) { V.exSel[e.target.dataset.ex] = e.target.checked; el.querySelector('[data-all]').checked = list.every(function (n) { return V.exSel[n]; }); }
    });
  });
  ACT.extab = function (a) { V.exTab = a[0]; QB.render(); };
  ACT.exgo = function () {
    var list = (V.exTab === 'reports' ? EX_REPORTS : EX_LISTS).filter(function (n) { return V.exSel[n]; });
    if (!list.length) return UI.toast('Select at least one ' + (V.exTab === 'reports' ? 'report' : 'list') + '.', 'err');
    var r = U.range(V.exRange), out = [];
    list.forEach(function (n) {
      out.push(csvRow([S.company.name])); out.push(csvRow([n + (V.exTab === 'reports' ? ' (' + U.fmtDate(r[0]) + ' - ' + U.fmtDate(r[1]) + ')' : '')]));
      exportTable(n, r).forEach(function (row) { out.push(csvRow(row)); });
      out.push('');
    });
    download('QuickBooks_' + (V.exTab === 'reports' ? 'Reports' : 'Lists') + '_' + U.today() + '.csv', '﻿' + out.join('\r\n'));
    UI.toast(list.length + ' ' + (V.exTab === 'reports' ? 'report' : 'list') + (list.length === 1 ? '' : 's') + ' exported.');
  };

  /* ═════════ Audit log ═════════ */
  function seedAudit() {
    if (V.auditSeed) return V.auditSeed;
    var out = [], days = {};
    S.txns.filter(function (t) { return !t.hidden && !t.system; }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).slice(0, 70).forEach(function (t, i) {
      var d = U.toDate(t.date); d.setHours(8 + (i * 7) % 9, (i * 13) % 60, (i * 29) % 60);
      out.push({ when: d, user: 'Craig Carlson', event: 'Added ' + t.type + (t.no ? ' ' + t.no : ''), name: S.payeeName(t), date: t.date, amount: t.total, txn: t.id, kind: 'txn' });
      days[t.date] = d;
    });
    Object.keys(days).forEach(function (iso) { var d = U.toDate(iso); d.setHours(7, 55, 2); out.push({ when: d, user: 'Craig Carlson', event: 'Signed in', name: '', date: '', amount: null, kind: 'login' }); });
    var d1 = U.toDate(U.addDays(U.today(), -40)); d1.setHours(10, 4, 0);
    out.push({ when: d1, user: 'Craig Carlson', event: 'Edited Company settings', name: '', date: '', amount: null, kind: 'settings' });
    var d2 = U.toDate(U.addDays(U.today(), -38)); d2.setHours(11, 30, 0);
    out.push({ when: d2, user: 'Craig Carlson', event: 'Added Customer Amy\'s Bird Sanctuary', name: "Amy's Bird Sanctuary", date: '', amount: null, kind: 'list' });
    V.auditSeed = out;
    return out;
  }
  function fmtWhen(d) { var h = d.getHours(), m = d.getMinutes(), s = d.getSeconds(); return U.MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' ' + ((h + 11) % 12 + 1) + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ' ' + (h < 12 ? 'am' : 'pm'); }
  QB.view('auditlog', function (p, el) {
    var all = S.audit.map(function (e) { return Object.assign({ kind: /Signed/.test(e.event) ? 'login' : 'txn', live: true }, e); }).concat(seedAudit());
    var users = {}; all.forEach(function (e) { users[e.user] = 1; });
    var since = V.auRange === 'all' ? null : U.addDays(U.today(), V.auRange === 'today' ? 0 : V.auRange === '7' ? -7 : -30);
    var rows = all.filter(function (e) {
      if (V.auUser && e.user !== V.auUser) return false;
      if (since && U.iso(e.when) < since) return false;
      if (V.auEvent && e.kind !== V.auEvent) return false;
      return true;
    }).sort(function (a, b) { return b.when - a.when; }).map(function (e, i) { e.id = 'au' + i; return e; });
    V.auRows = rows;
    el.innerHTML = head('Audit log', UI.feedbackLink() + UI.btn('Audit Log report', { kind: 'secondary', act: 'report:Audit Log' })) +
      '<div class="qb-filters">' + UI.field('User', UI.select('auUser', [['', 'All users']].concat(Object.keys(users)), V.auUser)) +
      UI.field('Date changed', UI.select('auRange', [['all', 'All dates'], ['today', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days']], V.auRange)) +
      UI.field('Events', UI.select('auEvent', [['', 'All events'], ['txn', 'Transactions'], ['list', 'Lists'], ['login', 'Sign in/Sign out'], ['settings', 'Settings']], V.auEvent)) + '</div><div class="qbm-tbl"></div>';
    ['auUser', 'auRange', 'auEvent'].forEach(function (n) { el.querySelector('[name=' + n + ']').onchange = function () { V[n] = this.value; QB.render(); }; });
    UI.table(el.querySelector('.qbm-tbl'), [
      { key: 'when', label: 'Date changed', render: function (e) { return fmtWhen(e.when); } },
      { key: 'user', label: 'User' }, { key: 'event', label: 'Event' }, { key: 'name', label: 'Name' },
      { key: 'date', label: 'Date', render: function (e) { return e.date ? U.fmtDate(e.date) : ''; } },
      { key: 'amount', label: 'Amount', align: 'right', render: function (e) { return e.amount == null ? '' : U.money(e.amount); } },
      { key: 'hist', label: 'History', sort: false, render: function (e) { return e.kind === 'login' ? '' : '<button type="button" class="qb-link" data-act="qbm:auhist:' + e.id + '">View</button>'; } }
    ], rows, { pageSize: 25, empty: 'No events match these filters.' });
  });
  ACT.auhist = function (a) {
    var e = V.auRows.filter(function (x) { return x.id === a[0]; })[0]; if (!e) return;
    var t = e.txn && S.txn[e.txn];
    UI.modal('Audit history', '<table class="qbm-rtable"><tbody><tr><td>Event</td><td>' + U.esc(e.event) + '</td></tr><tr><td>Date changed</td><td>' + fmtWhen(e.when) + '</td></tr><tr><td>User</td><td>' + U.esc(e.user) + '</td></tr>' +
      (e.name ? '<tr><td>Name</td><td>' + U.esc(e.name) + '</td></tr>' : '') + (e.date ? '<tr><td>Transaction date</td><td>' + U.fmtDate(e.date) + '</td></tr>' : '') +
      (e.amount != null ? '<tr><td>Amount</td><td>' + U.money(e.amount) + '</td></tr>' : '') + '</tbody></table>', {
      buttons: t ? [['Close', 'secondary'], ['Open transaction', 'primary', function () { QB.openTxn(t.id); }]] : [['Close', 'primary']]
    });
  };

  /* ═════════ Resolution center ═════════ */
  QB.view('resolution', function (p, el) {
    el.innerHTML = head('Resolution center', UI.feedbackLink()) + empty({
      art: '<svg viewBox="0 0 160 120"><circle cx="80" cy="60" r="42" fill="#e7f6e5"/><path d="m60 60 14 14 28-30" stroke="#108000" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      title: 'Nothing to resolve', text: 'You\'re all caught up. When QuickBooks finds something in your books that needs attention, like a transaction that doesn\'t balance, it shows up here.',
      actions: UI.btn('Back to home', { kind: 'secondary', act: 'go:home' })
    });
  });

  /* ═════════ Subscriptions and billing ═════════ */
  QB.view('billing', function (p, el) {
    var billable = S.users.filter(function (u) { return ['Reports only', 'Time tracking only'].indexOf(u.role) < 0; }).length;
    el.innerHTML = head('Subscriptions and billing', UI.feedbackLink()) +
      '<div class="qb-banner">' + ic('info') + '<span><b>Test drive account.</b> This sample company has no subscription, and nothing is ever billed.</span></div>' +
      '<div class="qbm-grid2">' +
      card('', '<div class="qbm-plan-cur"><span class="qbm-kicker">Your plan</span><h2>QuickBooks Online Plus</h2><span class="qbm-tag qbm-tag-ok">Active · Test drive</span></div>' +
        '<div class="qbm-kvrow"><span>Billable users</span><b>' + billable + ' of 5</b></div><div class="qbm-kvrow"><span>Chart of accounts</span><b>' + S.accounts.filter(function (a) { return a.active !== false; }).length + ' of 250</b></div>' +
        '<div class="qbm-kvrow"><span>Billing</span><b>Not billed</b></div><div class="qbm-kvrow"><span>Company ID</span><b>Test drive</b></div>' +
        '<div class="qbm-acts">' + UI.btn('Change plan', { kind: 'secondary', act: 'qbm:plans' }) + '</div>') +
      card('ADD-ONS', [['Payroll', 'Not subscribed', 'go:payroll-signup', 'Learn more'], ['Payments', 'Not set up', 'qbh:getpaid', 'Learn more'], ['QuickBooks Time', 'Included with Payroll Premium and Elite', 'go:time', 'View'], ['Live Bookkeeping', 'Not subscribed', 'shell:experts', 'Learn more']].map(function (x) {
        return '<div class="qbm-addon"><div><b>' + x[0] + '</b><span>' + x[1] + '</span></div><button type="button" class="qb-link" data-act="' + x[2] + '">' + x[3] + '</button></div>';
      }).join('')) + '</div>' +
      card('BILLING DETAILS', '<div class="qbm-kvrow"><span>Payment method</span><b>None listed</b></div><div class="qbm-kvrow"><span>Billing address</span><b>' + U.esc([S.company.street, S.company.city, S.company.state, S.company.zip].filter(Boolean).join(', ') || 'None listed') + '</b></div><div class="qbm-kvrow"><span>Billing email</span><b>' + U.esc(S.company.email || '') + '</b></div>' +
        '<h4 class="qbm-sub">Billing history</h4><p class="qb-muted">No invoices yet.</p>');
  });
  ACT.plans = function () {
    var plans = [['Simple Start', '1 user', 'Track income and expenses, send invoices, run basic reports'], ['Essentials', '3 users', 'Adds bill management and time tracking'], ['Plus', '5 users', 'Adds inventory, projects, and classes and locations'], ['Advanced', '25 users', 'Adds custom roles, batch actions, and workflow automation']];
    UI.modal('Change plan', '<div class="qbm-plan-pick">' + plans.map(function (x) { return '<div class="qbm-pp' + (x[0] === 'Plus' ? ' on' : '') + '"><b>' + x[0] + '</b><span>' + x[1] + '</span><p>' + x[2] + '</p>' + (x[0] === 'Plus' ? '<span class="qbm-tag qbm-tag-ok">Current plan</span>' : '') + '</div>'; }).join('') + '</div><p class="qb-muted qbm-small">Plan changes aren\'t available in the test drive.</p>', { wide: true, buttons: [['Close', 'primary']] });
  };
})();
