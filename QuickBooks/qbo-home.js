/* ══════════════════════════════════════════════════════════
   QuickBooks Online test drive: Home and Feed.
   Every number on these pages is computed live from the store
   and the ledger, so posting a transaction anywhere moves them.

   Bank total: QuickBooks' "Total bank balance" adds the bank-side
   balance of Bank-type accounts only (Checking -3,621.93 + Savings
   200.00 = -3,421.93, shown rounded as -$3,422). Credit card rows
   are listed in the card but are not part of that total.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var QB = window.QB, U = QB.util, S = QB.store, L = QB.ledger, UI = QB.ui;

  /* View state that survives the automatic re-render after store changes. */
  var H = {
    privacy: false,
    order: ['bank', 'funnel', 'pl', 'expenses', 'cashflow'],
    hidden: {},
    hiddenAccts: {},
    funnelRange: 'last-30', plRange: 'last-month', expRange: 'last-30', cashMode: 'balance',
    feedDismissed: {}
  };
  var WIDGETS = { bank: 'Bank accounts', funnel: 'Sales & Get Paid funnel', pl: 'Profit & Loss', expenses: 'Expenses', cashflow: 'Cash flow' };
  var ic = UI.icon;

  /* Money wrapped so Privacy can blur it. */
  function M(n, cents) { return '<span class="qbh-m">' + (cents ? U.money(n) : U.money0(n)) + '</span>'; }
  /* The funnel card in the real product prints amounts as $3756,02. */
  function funnelFmt(n) { n = U.r2(n); return '<span class="qbh-m">' + (n < 0 ? '-' : '') + '$' + Math.abs(n).toFixed(2).replace('.', ',') + '</span>'; }
  function pct(a, b) { if (!b) return a ? 100 : 0; return Math.round((a - b) / Math.abs(b) * 100); }

  /* ───────── data helpers ───────── */
  function bankAccounts() {
    return S.accounts.filter(function (a) { return (a.type === 'Bank' || a.type === 'Credit Card') && a.active !== false && a.bankBalance != null; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }
  function totalBank() {
    return U.r2(S.accounts.reduce(function (s, a) { return s + (a.type === 'Bank' && a.active !== false && a.bankBalance != null ? a.bankBalance : 0); }, 0));
  }
  function pendingFeed(acc, from, to) {
    var out = [];
    Object.keys(S.bankFeed || {}).forEach(function (k) {
      if (acc && k !== acc) return;
      (S.bankFeed[k] || []).forEach(function (f) {
        if (f.state !== 'pending') return;
        if (from && f.date < from) return;
        if (to && f.date > to) return;
        out.push(f);
      });
    });
    return out;
  }
  function inRange(t, r) { return t.date >= r[0] && t.date <= r[1]; }
  function pl(from, to) {
    var inc = 0, exp = 0, cats = {};
    S.accounts.forEach(function (a) {
      if (a.parent) return;
      if (['Income', 'Other Income'].indexOf(a.type) >= 0) inc += L.balance(a.id, { from: from, to: to });
      else if (['Cost of Goods Sold', 'Expenses', 'Other Expense'].indexOf(a.type) >= 0) {
        var b = L.balance(a.id, { from: from, to: to });
        exp += b; if (Math.abs(b) > 0.004) cats[a.id] = b;
      }
    });
    return { inc: U.r2(inc), exp: U.r2(exp), net: U.r2(inc - exp), cats: cats };
  }
  function prevRange(r) {
    var f = r[0], t = r[1], fd = U.toDate(f), td = U.toDate(t);
    if (fd.getDate() === 1 && U.addDays(t, 1).slice(8) === '01') {
      var months = (td.getFullYear() - fd.getFullYear()) * 12 + td.getMonth() - fd.getMonth() + 1;
      return [U.addMonths(f, -months), U.addDays(f, -1)];
    }
    var n = U.diffDays(t, f) + 1;
    return [U.addDays(f, -n), U.addDays(f, -1)];
  }
  function periodName(key, r) {
    var d = U.toDate(r[0]);
    if (key === 'last-month' || key === 'this-month') return U.MONTHS[d.getMonth()];
    if (key === 'this-quarter' || key === 'last-quarter') return 'Q' + (Math.floor(d.getMonth() / 3) + 1) + ' ' + d.getFullYear();
    if (key === 'last-30') return 'last 30 days';
    return String(d.getFullYear());
  }
  function priorName(key, r) {
    var p = prevRange(r), d = U.toDate(p[0]);
    if (key === 'last-month' || key === 'this-month') return U.MONTHS[d.getMonth()];
    if (key === 'last-30') return 'prior 30 days';
    if (key === 'this-quarter' || key === 'last-quarter') return 'Q' + (Math.floor(d.getMonth() / 3) + 1) + ' ' + d.getFullYear();
    return 'prior period';
  }
  function shortDate(iso, yr) { var d = U.toDate(iso); return d.getDate() + ' ' + U.MON[d.getMonth()] + (yr ? " '" + String(d.getFullYear()).slice(2) : ''); }

  /* ───────── widgets ───────── */
  function cardHead(title, right) {
    return '<div class="qbh-card-head"><h3>' + title + '</h3><span class="qb-grow"></span>' + (right || '') + '</div>';
  }
  function rangeSel(name, val, opts) {
    return '<span class="qbh-rsel">' + UI.select(name, opts, val, ' data-qbh="' + name + '"') + '</span>';
  }

  function wBank() {
    var accts = bankAccounts().filter(function (a) { return !H.hiddenAccts[a.id]; });
    var rows = accts.map(function (a) {
      var n = pendingFeed(a.id).length;
      var bb = a.type === 'Credit Card' ? -a.bankBalance : a.bankBalance;
      return '<div class="qbh-bank-row">' +
        '<div class="qbh-bank-name"><span class="qbh-bank-ic">' + ic(a.type === 'Credit Card' ? 'card' : 'bank') + '</span><div><b>' + U.esc(a.name) + '</b>' +
        (n ? '<button type="button" class="qb-link qbh-review" data-act="go:banking?acct=' + a.id + '">' + n + ' to review</button>' : '<span class="qbh-uptodate">' + ic('checkCircle') + 'Up to date</span>') + '</div></div>' +
        '<div class="qbh-bank-nums"><div><span>Bank balance</span><b>' + M(bb, true) + '</b></div>' +
        '<div><span>In QuickBooks</span><b>' + M(L.balance(a.id), true) + '</b></div>' +
        '<div class="qbh-updated">Updated moments ago</div></div></div>';
    }).join('');
    return '<section class="qbh-card qbh-w-bank">' +
      cardHead('BANK ACCOUNTS', '<button type="button" class="qb-icon-btn" data-act="qbh:editaccts" aria-label="Edit accounts">' + ic('pencil') + '</button><button type="button" class="qb-icon-btn" data-act="qbh:kebab:bank" aria-label="More">' + ic('kebab') + '</button>') +
      '<div class="qbh-sub">As of today <span class="qbh-dotsep"></span> Just updated</div>' +
      '<div class="qbh-big">' + M(totalBank()) + '</div><div class="qbh-big-lbl">Total bank balance</div>' +
      '<div class="qbh-bank-list">' + (rows || '<p class="qb-muted">No accounts shown. Use the pencil to choose accounts.</p>') + '</div>' +
      '<div class="qbh-card-foot"><button type="button" class="qb-link qbh-caret-link" data-act="qbh:registers">Go to registers ' + ic('caretDown') + '</button></div></section>';
  }

  function funnelData(r) {
    var notPaid = 0, nUnpaid = 0, paid = 0, nPaid = 0, dep = 0, nDep = 0;
    S.find(function (t) { return inRange(t, r); }).forEach(function (t) {
      if (t.type === 'Invoice') { var o = L.openBalance(t); if (o > 0.004) { notPaid += o; nUnpaid++; } }
      else if (t.type === 'Payment' && t.total > 0) { paid += t.total; nPaid++; }
      else if (t.type === 'Sales Receipt') { paid += t.total; nPaid++; }
      else if (t.type === 'Deposit') { dep += t.total; nDep++; }
    });
    return { notPaid: U.r2(notPaid), nUnpaid: nUnpaid, paid: U.r2(paid), nPaid: nPaid, dep: U.r2(dep), nDep: nDep };
  }
  function wFunnel() {
    var r = U.range(H.funnelRange), f = funnelData(r);
    var chev = '<span class="qbh-fchev">' + ic('caretRight') + '</span>';
    function stage(label, amt, sub, act, tone) {
      return '<button type="button" class="qbh-fstage qbh-f-' + tone + '" data-act="' + act + '"><i></i><div class="qbh-famt">' + funnelFmt(amt) + '</div><div class="qbh-flbl">' + label + '</div>' + (sub ? '<div class="qbh-fsub">' + sub + '</div>' : '') + '</button>';
    }
    return '<section class="qbh-card qbh-w-funnel">' +
      cardHead('SALES &amp; GET PAID FUNNEL', rangeSel('funnelRange', H.funnelRange, [['last-30', 'Last 30 days'], ['this-month', 'This month'], ['this-quarter', 'This quarter'], ['last-3-months', 'Last 3 months'], ['this-year-to-date', 'This year to date']]) + '<button type="button" class="qb-icon-btn" data-act="qbh:kebab:funnel" aria-label="More">' + ic('kebab') + '</button>') +
      '<div class="qbh-funnel">' +
      '<div class="qbh-fstart"><div class="qbh-fstart-ic">' + ic('mail') + '</div><b>Create a new payment request</b><p>Send invoices, payment links, and more</p>' +
      UI.split('Request payment', [['Invoice', 'form:Invoice'], ['Payment link', 'qbh:paylink'], ['Recurring payment', 'form:Recurring payment'], ['Sales receipt', 'form:Sales Receipt']], { kind: 'secondary', act: 'form:Invoice' }) + '</div>' + chev +
      stage('Not Paid', f.notPaid, f.nUnpaid + ' unpaid', 'go:invoices?status=unpaid', 'np') + chev +
      stage('Paid', f.paid, f.nPaid + ' paid', 'go:sales', 'pd') + chev +
      stage('Deposited', f.dep, f.nDep + ' deposited', 'go:paymentsdeposits', 'dp') +
      '</div></section>';
  }

  function wPL() {
    var key = H.plRange, r = U.range(key), cur = pl(r[0], r[1]), pr = prevRange(r), prev = pl(pr[0], pr[1]);
    var ch = pct(cur.net, prev.net), up = cur.net >= prev.net;
    var margin = cur.inc ? Math.round(cur.net / cur.inc * 100) : 0;
    var revIn = pendingFeed(null, r[0], r[1]).filter(function (f) { return f.received > 0; });
    var revOut = pendingFeed(null, r[0], r[1]).filter(function (f) { return f.spent > 0; });
    var revInAmt = revIn.reduce(function (s, f) { return s + f.received; }, 0), revOutAmt = revOut.reduce(function (s, f) { return s + f.spent; }, 0);
    var scale = Math.max(1, Math.max(0, cur.inc) + revInAmt, Math.max(0, cur.exp) + revOutAmt);
    function bar(label, amt, rev, nrev, cls) {
      var w = Math.max(0, amt) / scale * 100, hw = rev / scale * 100;
      return '<div class="qbh-plrow"><div class="qbh-plrow-top"><b>' + M(amt) + '</b><span>' + label + '</span><span class="qb-grow"></span>' +
        (nrev ? '<button type="button" class="qb-link" data-act="go:banking">' + nrev + ' to review</button>' : '') + '</div>' +
        '<div class="qbh-plbar"><i class="' + cls + '" style="width:' + w.toFixed(2) + '%"></i><i class="qbh-hatch ' + cls + '-h" style="width:' + hw.toFixed(2) + '%"></i></div></div>';
    }
    return '<section class="qbh-card qbh-w-pl">' +
      cardHead('PROFIT &amp; LOSS', rangeSel('plRange', key, [['last-month', 'Last month'], ['this-month', 'This month'], ['this-quarter', 'This quarter'], ['last-quarter', 'Last quarter'], ['this-year-to-date', 'This year to date'], ['last-year', 'Last year']]) + '<button type="button" class="qb-icon-btn" data-act="qbh:kebab:pl" aria-label="More">' + ic('kebab') + '</button>') +
      '<div class="qbh-sub">Net profit for ' + periodName(key, r) + '</div>' +
      '<div class="qbh-bigrow"><span class="qbh-big">' + M(cur.net) + '</span><span class="qbh-badge" title="Profit margin">' + margin + '%</span></div>' +
      '<div class="qbh-trend ' + (up ? 'is-up' : 'is-down') + '">' + ic(up ? 'arrowUp' : 'arrowDown') + (up ? 'Up ' : 'Down ') + Math.abs(ch) + '% from ' + priorName(key, r) + '</div>' +
      bar('Income', cur.inc, revInAmt, revIn.length, 'qbh-c-inc') + bar('Expenses', cur.exp, revOutAmt, revOut.length, 'qbh-c-exp') +
      '<div class="qbh-card-foot"><button type="button" class="qb-link" data-act="report:Profit and Loss">Analyze my profit &amp; loss</button></div></section>';
  }

  var DONUT = ['#0d8a3f', '#21abf6', '#7457c8', '#00a6a4'];
  function donut(segs, size) {
    var r = 15.915, C = 100, total = segs.reduce(function (s, x) { return s + Math.max(0, x.value); }, 0) || 1, off = 25;
    var h = '<svg class="qbh-donut" viewBox="0 0 42 42" width="' + size + '" height="' + size + '"><defs><pattern id="qbhHatchD" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="2" fill="#eceef1"/><rect width="1" height="2" fill="#b8bec6"/></pattern></defs>' +
      '<circle cx="21" cy="21" r="' + r + '" fill="none" stroke="#eceef1" stroke-width="6"/>';
    segs.forEach(function (s) {
      var len = Math.max(0, s.value) / total * C; if (len <= 0) return;
      h += '<circle cx="21" cy="21" r="' + r + '" fill="none" stroke="' + s.color + '" stroke-width="6" stroke-dasharray="' + len.toFixed(3) + ' ' + (C - len).toFixed(3) + '" stroke-dashoffset="' + off.toFixed(3) + '"><title>' + U.esc(s.label) + ': ' + U.money(s.value) + '</title></circle>';
      off -= len;
    });
    return h + '</svg>';
  }
  function wExpenses() {
    var key = H.expRange, r = U.range(key), cur = pl(r[0], r[1]), pr = prevRange(r), prev = pl(pr[0], pr[1]);
    var ids = Object.keys(cur.cats).filter(function (id) { return cur.cats[id] > 0; }).sort(function (a, b) { return cur.cats[b] - cur.cats[a]; });
    var segs = ids.slice(0, 3).map(function (id, i) { return { label: S.acct[id].name, value: cur.cats[id], prev: prev.cats[id] || 0, color: DONUT[i] }; });
    var rest = ids.slice(3);
    if (rest.length) segs.push({ label: 'Other', value: rest.reduce(function (s, id) { return s + cur.cats[id]; }, 0), prev: rest.reduce(function (s, id) { return s + (prev.cats[id] || 0); }, 0), color: DONUT[3] });
    var rev = pendingFeed(null, r[0], r[1]).filter(function (f) { return f.spent > 0; });
    var revAmt = U.r2(rev.reduce(function (s, f) { return s + f.spent; }, 0));
    var spend = segs.reduce(function (s, x) { return s + x.value; }, 0);
    var ch = pct(cur.exp, prev.exp), up = cur.exp >= prev.exp;
    var all = segs.concat(rev.length ? [{ label: rev.length + ' to review', value: revAmt, color: 'url(#qbhHatchD)', review: true }] : []);
    var share = spend + revAmt ? Math.round(spend / (spend + revAmt) * 100) : 0;
    return '<section class="qbh-card qbh-w-exp">' +
      cardHead('EXPENSES', rangeSel('expRange', key, [['last-30', 'Last 30 days'], ['this-month', 'This month'], ['last-month', 'Last month'], ['this-quarter', 'This quarter'], ['this-year-to-date', 'This year to date']]) + '<button type="button" class="qb-icon-btn" data-act="qbh:kebab:expenses" aria-label="More">' + ic('kebab') + '</button>') +
      '<div class="qbh-sub">Spending for ' + periodName(key, r) + '</div>' +
      '<div class="qbh-bigrow"><span class="qbh-big">' + M(cur.exp) + '</span><span class="qbh-badge" title="Categorized share">' + share + '%</span></div>' +
      '<div class="qbh-trend ' + (up ? 'is-bad' : 'is-good') + '">' + ic(up ? 'arrowUp' : 'arrowDown') + (up ? 'Up ' : 'Down ') + Math.abs(ch) + '% from ' + priorName(key, r) + '</div>' +
      '<div class="qbh-exp-body">' + donut(all, 132) + '<div class="qbh-legend">' + all.map(function (s) {
        var c = s.review ? '' : pct(s.value, s.prev), u = s.value >= (s.prev || 0);
        return '<div class="qbh-leg-row"><i style="background:' + (s.review ? 'repeating-linear-gradient(45deg,#b8bec6 0 2px,#eceef1 2px 4px)' : s.color) + '"></i><span class="qbh-leg-name" title="' + U.esc(s.label) + '">' + U.esc(s.label) + '</span><b>' + M(s.value, true) + '</b>' +
          (s.review ? '<span class="qbh-leg-ch"></span>' : '<span class="qbh-leg-ch ' + (u ? 'is-up' : 'is-down') + '">' + ic(u ? 'arrowUp' : 'arrowDown') + Math.abs(c) + '%</span>') + '</div>';
      }).join('') + (all.length ? '' : '<p class="qb-muted">No spending in this period.</p>') + '</div></div>' +
      '<div class="qbh-card-foot">' + (rev.length ? '<button type="button" class="qb-link" data-act="go:banking">Categorize ' + rev.length + ' transaction' + (rev.length === 1 ? '' : 's') + '</button>' : '<button type="button" class="qb-link" data-act="go:expenses">View expense transactions</button>') + '</div></section>';
  }

  /* Cash flow: weekly bank-side balance of the Bank accounts (ledger movement
     shifted so today equals the Total bank balance), then a projection from
     open invoices and bills for the next weeks (hatched). Overdue items are
     projected for tomorrow. */
  function cashSeries() {
    var today = U.today(), bankIds = S.accounts.filter(function (a) { return a.type === 'Bank'; }).map(function (a) { return a.id; });
    var ents = L.entries(function (p) { return bankIds.indexOf(p.acct) >= 0; });
    function qbCash(to) { return ents.reduce(function (s, e) { return e.t.date <= to ? s + e.p.amt : s; }, 0); }
    var offset = totalBank() - qbCash(today);
    /* Same window the real card showed: 143 days back (22 Jun) to 24 days ahead (6 Dec). */
    var start = U.addDays(today, -143), pts = [], d, prevD = U.addDays(start, -7);
    function point(dd, from) {
      var inn = 0, out = 0;
      ents.forEach(function (e) { if (e.t.date > from && e.t.date <= dd) { if (e.p.amt > 0) inn += e.p.amt; else out -= e.p.amt; } });
      return { date: dd, bal: U.r2(qbCash(dd) + offset), inn: U.r2(inn), out: U.r2(out) };
    }
    for (d = start; d <= today; d = U.addDays(d, 7)) { pts.push(point(d, prevD)); prevD = d; }
    if (pts[pts.length - 1].date !== today) pts.push(point(today, prevD));
    var bal = totalBank(), proj = [], end = U.addDays(today, 24), stops = [];
    for (d = U.addDays(today, 7); d < end; d = U.addDays(d, 7)) stops.push(d);
    stops.push(end);
    var openInv = S.find(function (t) { return t.type === 'Invoice' && L.openBalance(t) > 0.004; });
    var openBill = S.find(function (t) { return t.type === 'Bill' && L.openBalance(t) > 0.004; });
    for (var w = 0; w < stops.length; w++) {
      var f = U.addDays(w ? stops[w - 1] : today, 1), to = stops[w], pin = 0, pout = 0;
      openInv.forEach(function (t) { var due = t.due < today ? U.addDays(today, 1) : t.due; if (due >= f && due <= to) pin += L.openBalance(t); });
      openBill.forEach(function (t) { var due = t.due < today ? U.addDays(today, 1) : t.due; if (due >= f && due <= to) pout += L.openBalance(t); });
      bal = U.r2(bal + pin - pout);
      proj.push({ date: to, bal: bal, inn: U.r2(pin), out: U.r2(pout), proj: true });
    }
    return { pts: pts, proj: proj };
  }
  function cashChart(series, mode) {
    var all = series.pts.concat(series.proj), W = 640, Hh = 190, padL = 52, padR = 10, padT = 12, padB = 26;
    var n = all.length, x = function (i) { return padL + i * (W - padL - padR) / (n - 1); };
    var vals, lo, hi, y;
    var h = '<svg class="qbh-cash-svg" viewBox="0 0 ' + W + ' ' + Hh + '"><defs>' +
      '<pattern id="qbhHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#e6f4f1"/><rect width="2" height="6" fill="#9fd6cb"/></pattern>' +
      '<linearGradient id="qbhArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00a6a4" stop-opacity=".35"/><stop offset="1" stop-color="#00a6a4" stop-opacity=".04"/></linearGradient></defs>';
    if (mode === 'balance') vals = all.map(function (p) { return p.bal; });
    else vals = all.map(function (p) { return p.inn; }).concat(all.map(function (p) { return -p.out; }));
    lo = Math.min.apply(null, vals.concat([0])); hi = Math.max.apply(null, vals.concat([0]));
    if (hi - lo < 1) hi = lo + 1;
    var span = hi - lo; lo -= span * 0.08; hi += span * 0.08;
    y = function (v) { return padT + (hi - v) / (hi - lo) * (Hh - padT - padB); };
    /* grid + y labels */
    for (var g = 0; g <= 4; g++) {
      var gv = lo + (hi - lo) * g / 4, gy = y(gv);
      h += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy.toFixed(1) + '" y2="' + gy.toFixed(1) + '" class="qbh-gl"/><text x="' + (padL - 6) + '" y="' + (gy + 4).toFixed(1) + '" class="qbh-ylbl qbh-m-svg" text-anchor="end">' + U.esc(kfmt(gv)) + '</text>';
    }
    h += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '" class="qbh-zero"/>';
    /* month labels */
    var lastM = -1;
    all.forEach(function (p, i) { var m = U.toDate(p.date).getMonth(); if (m !== lastM) { lastM = m; h += '<text x="' + x(i).toFixed(1) + '" y="' + (Hh - 7) + '" class="qbh-xlbl">' + U.MON[m] + '</text>'; } });
    var k = series.pts.length - 1;
    if (mode === 'balance') {
      var line = series.pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.bal).toFixed(1); }).join(' ');
      h += '<path d="' + line + ' L' + x(k).toFixed(1) + ' ' + y(lo).toFixed(1) + ' L' + x(0).toFixed(1) + ' ' + y(lo).toFixed(1) + 'Z" fill="url(#qbhArea)"/>';
      h += '<path d="' + line + '" class="qbh-line"/>';
      var pl2 = 'M' + x(k).toFixed(1) + ' ' + y(series.pts[k].bal).toFixed(1) + ' ' + series.proj.map(function (p, i) { return 'L' + x(k + 1 + i).toFixed(1) + ' ' + y(p.bal).toFixed(1); }).join(' ');
      h += '<path d="' + pl2 + ' L' + x(n - 1).toFixed(1) + ' ' + y(lo).toFixed(1) + ' L' + x(k).toFixed(1) + ' ' + y(lo).toFixed(1) + 'Z" fill="url(#qbhHatch)"/>';
      h += '<path d="' + pl2 + '" class="qbh-line is-proj"/>';
      all.forEach(function (p, i) { h += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.bal).toFixed(1) + '" r="' + (i === k ? 4 : 2.2) + '" class="qbh-pt' + (i === k ? ' is-today' : '') + '"><title>' + (p.proj ? 'Projected ' : 'Week ending ') + U.fmtDate(p.date, 'mon') + ': ' + U.money(p.bal) + '</title></circle>'; });
    } else {
      var bw = Math.max(3, (W - padL - padR) / n * 0.32);
      all.forEach(function (p, i) {
        var cx = x(i);
        h += '<rect x="' + (cx - bw - 1).toFixed(1) + '" y="' + y(p.inn).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, y(0) - y(p.inn)).toFixed(1) + '" class="qbh-bin' + (p.proj ? ' is-proj' : '') + '"><title>Money in ' + U.fmtDate(p.date, 'mon') + ': ' + U.money(p.inn) + '</title></rect>';
        h += '<rect x="' + (cx + 1).toFixed(1) + '" y="' + y(0).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, y(-p.out) - y(0)).toFixed(1) + '" class="qbh-bout' + (p.proj ? ' is-proj' : '') + '"><title>Money out ' + U.fmtDate(p.date, 'mon') + ': ' + U.money(p.out) + '</title></rect>';
      });
    }
    h += '<line x1="' + x(k).toFixed(1) + '" x2="' + x(k).toFixed(1) + '" y1="' + padT + '" y2="' + (Hh - padB) + '" class="qbh-today"/><text x="' + (x(k) + 4).toFixed(1) + '" y="' + (padT + 10) + '" class="qbh-xlbl">Today</text>';
    return h + '</svg>';
  }
  function kfmt(v) { var a = Math.abs(v), s = a >= 1000 ? (a / 1000).toFixed(a >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(Math.round(a)); return (v < -0.5 ? '-$' : '$') + s; }
  function wCash() {
    var s = cashSeries(), first = s.pts[0].date, last = s.proj[s.proj.length - 1].date;
    var inTot = s.pts.reduce(function (a, p) { return a + p.inn; }, 0), outTot = s.pts.reduce(function (a, p) { return a + p.out; }, 0);
    return '<section class="qbh-card qbh-w-cash">' +
      cardHead('CASH FLOW', '<span class="qbh-range-lbl">' + shortDate(first) + '-' + shortDate(last, true) + '</span><button type="button" class="qb-icon-btn" data-act="qbh:kebab:cashflow" aria-label="More">' + ic('kebab') + '</button>') +
      '<div class="qbh-cash-top"><div><div class="qbh-big">' + M(totalBank()) + '</div><div class="qbh-big-lbl">Today\'s cash balance</div></div><span class="qb-grow"></span>' +
      '<div class="qb-seg qbh-seg"><button type="button" class="' + (H.cashMode === 'balance' ? 'on' : '') + '" data-act="qbh:cash:balance">Cash balance</button><button type="button" class="' + (H.cashMode === 'inout' ? 'on' : '') + '" data-act="qbh:cash:inout">Money in/out</button></div></div>' +
      (H.cashMode === 'inout' ? '<div class="qbh-inout-tot"><span><i class="qbh-key-in"></i>Money in ' + M(inTot) + '</span><span><i class="qbh-key-out"></i>Money out ' + M(outTot) + '</span></div>' : '') +
      '<div class="qbh-cash-chart">' + cashChart(s, H.cashMode) + '</div>' +
      '<div class="qbh-cash-key"><span><i class="qbh-key-act"></i>Actual</span><span><i class="qbh-key-proj"></i>Projected</span></div>' +
      '<div class="qbh-card-foot"><button type="button" class="qb-link" data-act="go:cashflow">What\'s driving this?</button></div></section>';
  }

  var RENDER = { bank: wBank, funnel: wFunnel, pl: wPL, expenses: wExpenses, cashflow: wCash };

  /* ───────── Home ───────── */
  QB.view('home', function (params, el) {
    var apps = QB.APPS.map(function (a) {
      return '<button type="button" class="qbh-app" data-act="shell:app:' + a.key + '">' + QB.appIcon(a.key, 40) + '<span>' + U.esc(a.homeLabel || a.label) + (a.premium ? ic('diamond', 'qbh-prem') : '') + '</span></button>';
    }).join('');
    var create = [['Get paid online', 'qbh:getpaid'], ['Create invoice', 'form:Invoice'], ['Record expense', 'form:Expense'], ['Add bank deposit', 'form:Deposit'], ['Create check', 'form:Check']];
    var widgets = H.order.filter(function (k) { return !H.hidden[k]; }).map(function (k) { return RENDER[k](); }).join('');
    el.innerHTML = '<div class="qbh' + (H.privacy ? ' qbh-priv' : '') + '">' +
      '<div class="qbh-top"><span></span><h1 class="qbh-greet">' + U.esc(U.greeting()) + '</h1><div class="qbh-top-r">' +
      '<button type="button" class="qbh-tool" data-act="qbh:customize">' + ic('customize') + '<span>Customize</span></button>' +
      '<button type="button" class="qbh-tool' + (H.privacy ? ' on' : '') + '" data-act="qbh:privacy" aria-pressed="' + H.privacy + '">' + ic('eyeOff') + '<span>Privacy</span></button></div></div>' +
      '<div class="qbh-apps"><button type="button" class="qbh-scroll qbh-scroll-l" data-act="qbh:scroll:-1" aria-label="Scroll left">' + ic('caretLeft') + '</button><div class="qbh-apps-track">' + apps + '</div>' +
      '<button type="button" class="qbh-scroll qbh-scroll-r" data-act="qbh:scroll:1" aria-label="Scroll right">' + ic('caretRight') + '</button></div>' +
      '<div class="qbh-create"><h2>Create actions</h2><div class="qbh-pills">' + create.map(function (c) { return '<button type="button" class="qbh-pill" data-act="' + c[1] + '">' + c[0] + '</button>'; }).join('') +
      '<button type="button" class="qbh-pill qbh-pill-all" data-act="shell:create">Show all</button></div></div>' +
      '<div class="qbh-glance-head"><h2>Business at a glance</h2></div>' +
      '<div class="qbh-grid">' + (widgets || '<div class="qbh-none">All widgets are hidden. <button type="button" class="qb-link" data-act="qbh:customize">Customize</button> to bring them back.</div>') + '</div>' +
      '<div class="qbh-activity"><button type="button" class="qb-btn qb-btn-tertiary" data-act="go:auditlog">See all activity</button></div>' +
      '<footer class="qbh-foot">© ' + U.today().slice(0, 4) + ' Intuit Inc. All rights reserved. <span>Privacy</span> | <span>Security</span> | <span>Terms of Service</span></footer>' +
      '</div>';
    U.$$('select[data-qbh]', el).forEach(function (s) {
      s.addEventListener('change', function () { H[s.dataset.qbh] = s.value; QB.render(); });
    });
    var track = U.$('.qbh-apps-track', el);
    function arrows() {
      var l = U.$('.qbh-scroll-l', el), r = U.$('.qbh-scroll-r', el);
      if (!l || !r) return;
      l.hidden = track.scrollLeft < 4;
      r.hidden = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    }
    track.addEventListener('scroll', arrows);
    setTimeout(arrows, 0);
  });

  /* ───────── home actions ───────── */
  QB.on('qbh', function (arg, el) {
    var p = arg.split(':');
    if (p[0] === 'privacy') { H.privacy = !H.privacy; var root = U.$('.qbh'); if (root) root.classList.toggle('qbh-priv', H.privacy); if (el) { el.classList.toggle('on', H.privacy); el.setAttribute('aria-pressed', H.privacy); } return; }
    if (p[0] === 'scroll') { var tr = el.closest('.qbh-apps').querySelector('.qbh-apps-track'); tr.scrollBy({ left: (+p[1]) * Math.max(240, tr.clientWidth * 0.7), behavior: 'smooth' }); return; }
    if (p[0] === 'cash') { H.cashMode = p[1]; return QB.render(); }
    if (p[0] === 'customize') return customizeDrawer();
    if (p[0] === 'editaccts') return editAccounts();
    if (p[0] === 'registers') {
      return UI.menu(el, bankAccounts().map(function (a) { return [a.name, 'qbh:register:' + a.id]; }), { alignLeft: true });
    }
    if (p[0] === 'register') return QB.go('register', { id: p[1], acct: p[1] });
    if (p[0] === 'hide') { H.hidden[p[1]] = true; UI.toast(WIDGETS[p[1]] + ' was hidden. Use Customize to show it again.'); return QB.render(); }
    if (p[0] === 'kebab') {
      var items = [];
      if (p[1] === 'bank') items.push(['Connect an account', 'go:banking'], ['Go to bank transactions', 'go:banking']);
      if (p[1] === 'funnel') items.push(['View invoices', 'go:invoices'], ['View sales transactions', 'go:sales']);
      if (p[1] === 'pl') items.push(['Run Profit and Loss report', 'report:Profit and Loss']);
      if (p[1] === 'expenses') items.push(['View expense transactions', 'go:expenses'], ['Run Profit and Loss report', 'report:Profit and Loss']);
      if (p[1] === 'cashflow') items.push(['Open cash flow planner', 'go:cashflow']);
      items.push({ sep: true }, ['Hide widget', 'qbh:hide:' + p[1]]);
      return UI.menu(el, items);
    }
    if (p[0] === 'paylink') return UI.modal('Create payment link', '<p>Share a link so customers can pay you by card or bank transfer without an invoice.</p><p class="qb-muted">Online payments need QuickBooks Payments, which the test drive does not include. You can still create an invoice and record the payment.</p>', { buttons: [['Close', 'secondary'], ['Create invoice', 'primary', function () { QB.openForm('Invoice'); }]] });
    if (p[0] === 'getpaid') return UI.modal('Get paid online', '<p>Let customers pay invoices by credit card, Apple Pay, or bank transfer (ACH). Payments land in your books automatically.</p><p class="qb-muted">QuickBooks Payments is not part of the test drive. Create an invoice to practice the rest of the flow.</p>', { buttons: [['Not now', 'secondary'], ['Create invoice', 'primary', function () { QB.openForm('Invoice'); }]] });
    if (p[0] === 'feed') {
      if (p[1] === 'dismiss') { H.feedDismissed[p.slice(2).join(':')] = true; return QB.render(); }
      if (p[1] === 'restore') { H.feedDismissed = {}; return QB.render(); }
    }
  });

  function customizeDrawer() {
    function rows(order) {
      return order.map(function (k, i) {
        return '<div class="qbh-cz-row" data-k="' + k + '"><span class="qbh-cz-drag">' + ic('drag') + '</span><span class="qbh-cz-name">' + WIDGETS[k] + '</span><span class="qb-grow"></span>' +
          '<button type="button" class="qb-icon-btn" data-mv="-1"' + (i ? '' : ' disabled') + ' aria-label="Move up">' + ic('caretUp') + '</button>' +
          '<button type="button" class="qb-icon-btn" data-mv="1"' + (i < order.length - 1 ? '' : ' disabled') + ' aria-label="Move down">' + ic('caretDown') + '</button>' +
          UI.toggle('show_' + k, !H.hidden[k]) + '</div>';
      }).join('');
    }
    var d = UI.drawer('Customize home', '<p class="qb-muted">Choose the widgets you want on your home page and drag or use the arrows to put them in order.</p><div class="qbh-cz">' + rows(H.order) + '</div>', {
      onSave: function (dr) {
        H.order = U.$$('.qbh-cz-row', dr).map(function (r) { return r.dataset.k; });
        U.$$('.qbh-cz-row', dr).forEach(function (r) { H.hidden[r.dataset.k] = !r.querySelector('input').checked; });
        UI.toast('Your home page was updated.');
        QB.render();
      }
    });
    var list = d.querySelector('.qbh-cz');
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mv]'); if (!b) return;
      var row = b.closest('.qbh-cz-row');
      if (+b.dataset.mv < 0) { if (row.previousElementSibling) row.previousElementSibling.before(row); }
      else if (row.nextElementSibling) row.nextElementSibling.after(row);
      fixArrows();
    });
    function fixArrows() {
      var rs = U.$$('.qbh-cz-row', list);
      rs.forEach(function (r, i) { r.querySelector('[data-mv="-1"]').disabled = i === 0; r.querySelector('[data-mv="1"]').disabled = i === rs.length - 1; });
    }
    /* Native drag and drop to reorder. */
    var dragK = null;
    list.addEventListener('mousedown', function (e) { var r = e.target.closest('.qbh-cz-drag'); U.$$('.qbh-cz-row', list).forEach(function (x) { x.draggable = false; }); if (r) r.closest('.qbh-cz-row').draggable = true; });
    list.addEventListener('dragstart', function (e) { var r = e.target.closest('.qbh-cz-row'); if (!r) return; dragK = r.dataset.k; r.classList.add('is-drag'); try { e.dataTransfer.setData('text/plain', dragK); } catch (x) {} });
    list.addEventListener('dragover', function (e) {
      e.preventDefault();
      var over = e.target.closest('.qbh-cz-row'), src = list.querySelector('.is-drag');
      if (!over || !src || over === src) return;
      var rect = over.getBoundingClientRect();
      if (e.clientY > rect.top + rect.height / 2) over.after(src); else over.before(src);
    });
    list.addEventListener('dragend', function () { var s = list.querySelector('.is-drag'); if (s) { s.classList.remove('is-drag'); s.draggable = false; } fixArrows(); });
  }

  function editAccounts() {
    UI.drawer('Edit bank accounts', '<p class="qb-muted">Choose which accounts show on your home page.</p>' + bankAccounts().map(function (a) {
      return '<label class="qb-cust-row"><span class="qbh-bank-ic">' + ic(a.type === 'Credit Card' ? 'card' : 'bank') + '</span><span>' + U.esc(a.name) + '</span><span class="qb-grow"></span><input type="checkbox" data-acc="' + a.id + '"' + (H.hiddenAccts[a.id] ? '' : ' checked') + '></label>';
    }).join(''), {
      onSave: function (d) {
        U.$$('[data-acc]', d).forEach(function (c) { H.hiddenAccts[c.dataset.acc] = !c.checked; });
        UI.toast('Bank accounts updated.');
        QB.render();
      }
    });
  }

  /* ───────── Feed ───────── */
  function feedCards() {
    var today = U.today(), cards = [];
    var od = S.find(function (t) { return t.type === 'Invoice' && L.status(t, today).tone === 'overdue'; });
    if (od.length) cards.push({ key: 'od-inv', tone: 'warn', icon: 'alert', kicker: 'Invoices', title: od.length + ' invoice' + (od.length === 1 ? ' is' : 's are') + ' overdue', text: 'Customers owe you ' + U.money(od.reduce(function (s, t) { return s + L.openBalance(t); }, 0)) + ' on overdue invoices. The oldest is from ' + S.payeeName(od.slice().sort(function (a, b) { return a.due < b.due ? -1 : 1; })[0]) + '.', btn: ['Send reminders', 'go:invoices?status=overdue'], btn2: ['View invoices', 'go:invoices'] });
    var pend = pendingFeed(null);
    if (pend.length) cards.push({ key: 'bank-review', tone: 'info', icon: 'bank', kicker: 'Banking', title: pend.length + ' bank transaction' + (pend.length === 1 ? '' : 's') + ' to review', text: 'Categorize or match them so your books and reports stay accurate.', btn: ['Review transactions', 'go:banking'] });
    S.find(function (t) { return t.type === 'Bill' && L.status(t, today).tone === 'overdue'; })
      .sort(function (a, b) { return a.due < b.due ? -1 : 1; }).forEach(function (t) {
        cards.push({ key: 'bill-' + t.id, tone: 'warn', icon: 'doc', kicker: 'Bills', title: 'Bill from ' + S.payeeName(t) + ' is overdue', text: U.money(L.openBalance(t)) + ' was due ' + U.fmtDate(t.due, 'mon') + ' (' + U.diffDays(today, t.due) + ' days ago).', btn: ['Pay bill', 'form:Pay Bills'], btn2: ['View bill', 'txn:' + t.id] });
      });
    var soon = S.find(function (t) { return t.type === 'Bill' && L.status(t, today).tone === 'due'; });
    if (soon.length) cards.push({ key: 'bills-soon', tone: 'info', icon: 'clock', kicker: 'Bills', title: soon.length + ' bill' + (soon.length === 1 ? ' is' : 's are') + ' due soon', text: U.money(soon.reduce(function (s, t) { return s + L.openBalance(t); }, 0)) + ' is due in the next 7 days.', btn: ['Schedule payments', 'go:bills'] });
    S.find(function (t) { return (t.type === 'Payment' && t.total > 0) || t.type === 'Sales Receipt'; })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.created - a.created; }).slice(0, 3).forEach(function (t) {
        cards.push({ key: 'pay-' + t.id, tone: 'ok', icon: 'checkCircle', kicker: 'Payments', title: 'You received ' + U.money(t.total) + ' from ' + S.payeeName(t), text: (t.type === 'Sales Receipt' ? 'Sales receipt ' + (t.no || '') : 'Payment') + ' on ' + U.fmtDate(t.date, 'mon') + (t.account === 'a_undep' && !t.deposited ? '. It is waiting in Undeposited Funds.' : '.'), btn: t.account === 'a_undep' && !t.deposited ? ['Record deposit', 'form:Deposit'] : ['View payment', 'txn:' + t.id], btn2: t.account === 'a_undep' && !t.deposited ? ['View', 'txn:' + t.id] : null });
      });
    var unb = S.find(function (t) { return ['Time Charge', 'Charge', 'Billable Expense Charge'].indexOf(t.type) >= 0 && t.status === 'Open'; });
    if (unb.length) cards.push({ key: 'unbilled', tone: 'info', icon: 'clock', kicker: 'Sales', title: U.money(unb.reduce(function (s, t) { return s + t.total; }, 0)) + ' in unbilled activity', text: unb.length + ' time and billable charges are ready to go on an invoice.', btn: ['Create invoice', 'form:Invoice'] });
    var po = S.find(function (t) { return t.type === 'Purchase Order' && (t.status || 'Open') === 'Open'; });
    if (po.length) cards.push({ key: 'po-open', tone: 'info', icon: 'box', kicker: 'Inventory', title: po.length + ' open purchase order' + (po.length === 1 ? '' : 's'), text: U.money(po.reduce(function (s, t) { return s + t.total; }, 0)) + ' on order with ' + po.map(function (t) { return S.payeeName(t); }).join(', ') + '.', btn: ['View purchase orders', 'go:purchase-orders'] });
    S.items.filter(function (i) { return i.type === 'Inventory' && i.active && i.qty != null && (i.qty <= 0 || (i.reorder != null && i.qty <= i.reorder)); }).forEach(function (i) {
      cards.push({ key: 'stock-' + i.id, tone: 'warn', icon: 'box', kicker: 'Inventory', title: i.name + (i.qty <= 0 ? ' is out of stock' : ' is low on stock'), text: i.qty + ' on hand' + (i.reorder != null ? ', reorder point ' + i.reorder : '') + '.', btn: ['Create purchase order', 'form:Purchase Order'] });
    });
    var est = S.find(function (t) { return t.type === 'Estimate' && (t.status || 'Pending') === 'Pending'; });
    if (est.length) cards.push({ key: 'est', tone: 'info', icon: 'doc', kicker: 'Customers', title: est.length + ' estimate' + (est.length === 1 ? '' : 's') + ' waiting on customers', text: 'Follow up so you can turn them into invoices.', btn: ['View estimates', 'go:estimates'] });
    cards.push({ key: 'tip-rules', tone: 'tip', icon: 'sparkle', kicker: 'Tip', title: 'Let rules categorize for you', text: 'Bank rules sort repeat transactions automatically, like fuel at Chevron or car washes at Squeaky Kleen.', btn: ['Set up rules', 'go:olbrules'] });
    cards.push({ key: 'tip-styles', tone: 'tip', icon: 'sparkle', kicker: 'Tip', title: 'Make your invoices look like you', text: 'Add your logo, colors, and fonts to every invoice, estimate, and sales receipt.', btn: ['Customize forms', 'go:customformstyles'] });
    cards.push({ key: 'tip-reports', tone: 'tip', icon: 'sparkle', kicker: 'Tip', title: 'See how you did last month', text: 'The Profit and Loss report shows income, expenses, and net income for any period.', btn: ['Run report', 'report:Profit and Loss'] });
    return cards;
  }
  QB.view('business-feed', function (params, el) {
    var all = feedCards(), cards = all.filter(function (c) { return !H.feedDismissed[c.key]; });
    var nd = all.length - cards.length;
    el.innerHTML = '<div class="qbh-feed' + (H.privacy ? ' qbh-priv' : '') + '">' +
      '<div class="qbh-feed-head"><h1>Feed</h1><span class="qb-grow"></span>' + UI.feedbackLink() + '</div>' +
      '<p class="qb-muted qbh-feed-lead">The latest from your business, updated as things happen. ' + cards.length + ' item' + (cards.length === 1 ? '' : 's') + '.' +
      (nd ? ' <button type="button" class="qb-link" data-act="qbh:feed:restore">Show ' + nd + ' dismissed</button>' : '') + '</p>' +
      '<div class="qbh-stream">' + (cards.length ? cards.map(function (c) {
        return '<article class="qbh-fcard qbh-fc-' + c.tone + '"><div class="qbh-fc-ic">' + ic(c.icon) + '</div><div class="qbh-fc-body">' +
          '<div class="qbh-fc-kick">' + U.esc(c.kicker) + '</div><h3>' + U.esc(c.title) + '</h3><p>' + U.esc(c.text) + '</p>' +
          '<div class="qbh-fc-acts">' + UI.btn(c.btn[0], { kind: 'primary', act: c.btn[1], cls: 'qb-btn-sm' }) + (c.btn2 ? UI.btn(c.btn2[0], { kind: 'secondary', act: c.btn2[1], cls: 'qb-btn-sm' }) : '') + '</div></div>' +
          '<button type="button" class="qb-x qbh-fc-x" data-act="qbh:feed:dismiss:' + c.key + '" aria-label="Dismiss">' + ic('close') + '</button></article>';
      }).join('') : '<div class="qbh-feed-empty">' + QB.art('empty') + '<h3>You\'re all caught up</h3><p class="qb-muted">New items will show up here as your business changes.</p></div>') + '</div></div>';
  });
})();
