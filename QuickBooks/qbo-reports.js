/* ══════════════════════════════════════════════════════════
   QuickBooks Online test drive: reports.
   - Standard reports list, Custom reports, Management reports,
     KPIs, Cash flow planner, Budgets
   - The report viewer (#/report?name=...) and a generic engine:
       QB.report(name, fn(opts) -> { title, columns, rows })
     rows: { label, depth, values, header, section, total, bold,
             grey, acct, txn, sys, gid, path, collapsedValues }
   Everything is computed live from the ledger in qbo-core.js.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var QB = window.QB, U = QB.util, S = QB.store, L = QB.ledger, UI = QB.ui;
  var D = window.QBO_DATA;
  var R = QB.rep = {};

  function ext(a, b) { if (b) for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) a[k] = b[k]; return a; }
  function r2(n) { return U.r2(n); }

  R.fixSummary = function () { return false; }; /* core now levels every P&L account itself */

  /* ───────────── ledger access ─────────────
     Accrual uses the core postings. Cash basis drops invoices and bills
     and books their lines when (and in the share that) they are paid. */
  var CASH_SKIP = ['Invoice', 'Bill', 'Credit Memo', 'Vendor Credit'];
  function cashPostings(t) {
    if (CASH_SKIP.indexOf(t.type) >= 0) return [];
    var P = L.postings(t);
    if (t.type === 'Payment' || /^Bill Payment/.test(t.type)) {
      (t.applied || []).forEach(function (a) {
        var doc = S.txn[a.id]; if (!doc || !doc.total) return;
        var ratio = a.amount / doc.total;
        L.postings(doc).forEach(function (p) { P.push(ext(ext({}, p), { amt: r2(p.amt * ratio), via: doc.id })); });
      });
    }
    return P;
  }
  function inRange(t, o) { return !(o.from && t.date < o.from) && !(o.to && t.date > o.to); }
  /* Entries {t, p, acct, amt} (amt > 0 debit). keep(e) filters. */
  function posts(o, keep) {
    o = o || {};
    var out = [], cash = o.method === 'cash';
    S.txns.forEach(function (t) {
      if (!inRange(t, o)) return;
      var ps;
      try { ps = cash ? cashPostings(t) : L.postings(t); } catch (err) { ps = []; }
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i]; if (!p.acct) continue;
        var e = { t: t, p: p, acct: p.acct, amt: p.amt, date: t.date };
        if (!keep || keep(e)) out.push(e);
      }
    });
    return out;
  }
  function byDate(a, b) {
    var x = a.date || a.t.date, y = b.date || b.t.date;
    return x < y ? -1 : x > y ? 1 : ((a.t.created || 0) - (b.t.created || 0));
  }
  function sortE(arr) { arr.sort(byDate); return arr; }
  function nat(acct, amt) { return S.isDebit(acct) ? amt : -amt; }
  function sums(o, keep) {
    var m = {};
    posts(o, keep).forEach(function (e) { m[e.acct] = (m[e.acct] || 0) + nat(e.acct, e.amt); });
    return m;
  }
  /* Chart cache (S.ordered walks the whole chart on every call). */
  var AC = null;
  function acache() {
    if (!AC || AC.ref !== S.accounts || AC.n !== S.accounts.length) {
      var ord = S.ordered(), k = {};
      ord.forEach(function (a) { if (a.parent) (k[a.parent] = k[a.parent] || []).push(a); });
      AC = { ref: S.accounts, n: S.accounts.length, ord: ord, kids: k };
    }
    return AC;
  }
  S.on(function () { AC = null; });
  function kids(id) { return acache().kids[id] || []; }
  function roll(id, m) { var v = m[id] || 0; kids(id).forEach(function (k) { v += roll(k.id, m); }); return r2(v); }
  function rootsOf(types) { return acache().ord.filter(function (a) { return !a.parent && types.indexOf(a.type) >= 0; }); }
  function typeSum(types, m) { var v = 0; rootsOf(types).forEach(function (a) { v += roll(a.id, m); }); return r2(v); }
  var T = { inc: ['Income'], cogs: ['Cost of Goods Sold'], exp: ['Expenses'], oi: ['Other Income'], oe: ['Other Expense'] };
  var PL_TYPES = ['Income', 'Cost of Goods Sold', 'Expenses', 'Other Income', 'Other Expense'];
  function netIncome(m) { return r2(typeSum(T.inc, m) - typeSum(T.cogs, m) - typeSum(T.exp, m) + typeSum(T.oi, m) - typeSum(T.oe, m)); }
  function fyStart(iso) {
    var m = Math.max(0, U.MONTHS.indexOf(S.settings && S.settings.fiscalMonth || 'January'));
    var d = U.toDate(iso), y = d.getMonth() >= m ? d.getFullYear() : d.getFullYear() - 1;
    return U.iso(new Date(y, m, 1));
  }
  function reAcct() { var a = S.accounts.filter(function (x) { return x.detail === 'Retained Earnings'; })[0]; return a ? a.id : 'a_re'; }
  /* Balance sheet map as of a date: BS accounts cumulative, Retained Earnings
     carries prior years' profit, plus net income for the fiscal year. */
  function bsMap(to, method) {
    var m = sums({ to: to, method: method }), fy = fyStart(to), re = reAcct();
    var ni = netIncome(sums({ from: fy, to: to, method: method }));
    var prior = netIncome(sums({ to: U.addDays(fy, -1), method: method }));
    var out = ext({}, m); out[re] = r2((m[re] || 0) + prior);
    return { map: out, ni: ni };
  }
  function earliest() { var d = U.today(); S.txns.forEach(function (t) { if (t.date && t.date < d) d = t.date; }); return d; }
  R.posts = posts; R.sums = sums; R.roll = roll; R.netIncome = netIncome; R.bsMap = bsMap; R.typeSum = typeSum;

  /* Name helpers. */
  function vendName(id) { return id && S.vend[id] ? S.vend[id].name : ''; }
  function typeName(t) { return t.type === 'Bill Payment' ? 'Bill Payment (Check)' : t.type === 'Cash Expense' ? 'Expense' : t.type; }
  function sysLabel(t) { return t.no === 'OB-1' || /opening/i.test(t.memo || '') ? 'Opening balance' : 'Summarized activity'; }
  function mainAcct(t) {
    var ty = t.type;
    if (ty === 'Invoice' || ty === 'Credit Memo') return 'a_ar';
    if (ty === 'Bill' || ty === 'Vendor Credit') return 'a_ap';
    if (ty === 'Payment' || ty === 'Sales Receipt') return t.account || 'a_undep';
    if (ty === 'Journal Entry' || L.NONPOSTING.indexOf(ty) >= 0) return '';
    if (ty === 'Credit Card Credit' || ty === 'Bill Payment (Credit Card)') return t.account || 'a_mc';
    return t.account || 'a_chk';
  }
  function acctName(id) { return id ? S.fullName(id) : ''; }
  function splitOf(e) {
    var others = {}, n = 0;
    var ps = e.t.hidden ? [] : (e.p && e.p.via ? L.postings(S.txn[e.p.via] || e.t) : L.postings(e.t));
    ps.forEach(function (p) { if (p.acct !== e.acct && !others[p.acct]) { others[p.acct] = 1; n++; } });
    if (!n) return '';
    if (n > 1) return '-Split-';
    return acctName(Object.keys(others)[0]);
  }
  function itemName(id) { return id && S.item[id] ? S.item[id].name : ''; }
  function arAmt(t) { return t.type === 'Credit Memo' || t.type === 'Payment' ? -t.total : t.total; }
  function apAmt(t) { return t.type === 'Vendor Credit' || /^Bill Payment/.test(t.type) ? -t.total : t.total; }
  function isPosting(t) { return L.NONPOSTING.indexOf(t.type) < 0; }
  function hrs(h) { h = +h || 0; var m = Math.round(h * 60); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); }
  function byName(a, b) { return String(a).localeCompare(String(b)); }

  /* ───────────── row builder ───────────── */
  function Builder() { this.rows = []; this.stack = []; this.heads = {}; this.seen = {}; }
  Builder.prototype.row = function (label, values, x) {
    var r = ext({ label: label == null ? '' : label, depth: this.stack.length, values: values || [], path: this.stack.slice() }, x);
    this.rows.push(r); return r;
  };
  Builder.prototype.open = function (label, values, x) {
    var base = (this.stack[this.stack.length - 1] || '') + '>' + label, gid = base, n = 1;
    while (this.seen[gid]) gid = base + '#' + (++n);
    this.seen[gid] = 1;
    var r = this.row(label, values, ext({ header: true, gid: gid }, x));
    this.stack.push(gid); this.heads[gid] = r;
    return r;
  };
  Builder.prototype.close = function (label, values, x) {
    var gid = this.stack[this.stack.length - 1];
    var r = this.row(label, values, ext({ total: true, bold: true }, x));
    r.depth = this.stack.length - 1;
    this.stack.pop();
    if (this.heads[gid]) this.heads[gid].collapsedValues = values;
    return r;
  };
  Builder.prototype.net = function (label, values, x) { return this.row(label, values, ext({ grey: true, bold: true, net: true }, x)); };
  R.Builder = Builder;

  function zeroArr(a) { return !a || a.every(function (v) { return v == null || typeof v !== 'number' || Math.abs(v) < 0.005; }); }
  function vsub(a, b) { return a.map(function (v, i) { return v == null || b[i] == null ? null : r2(v - b[i]); }); }
  function vadd() { var args = [].slice.call(arguments); return args[0].map(function (v, i) { var s = 0; for (var k = 0; k < args.length; k++) { if (args[k][i] == null) return null; s += args[k][i]; } return r2(s); }); }
  function pctOf(v, base) { return base && Math.abs(base) > 0.004 && v != null ? r2(v / base * 100) : null; }
  function pctChange(a, b) { return b && Math.abs(b) > 0.004 && a != null ? r2((a - b) / Math.abs(b) * 100) : null; }

  /* ───────────── dates & labels ───────────── */
  function longD(iso) { return U.fmtDate(iso, 'long'); }
  function rangeText(from, to, asof) {
    if (asof) return 'As of ' + longD(to || U.today());
    if (!from && !to) return 'All Dates';
    if (!from) return 'Through ' + longD(to);
    if (!to) return 'Since ' + longD(from);
    var a = U.toDate(from), b = U.toDate(to);
    if (a.getFullYear() === b.getFullYear()) {
      if (a.getMonth() === b.getMonth()) return from === to ? longD(from) : U.MONTHS[a.getMonth()] + ' ' + a.getDate() + '-' + b.getDate() + ', ' + b.getFullYear();
      return U.MONTHS[a.getMonth()] + ' ' + a.getDate() + '-' + U.MONTHS[b.getMonth()] + ' ' + b.getDate() + ', ' + b.getFullYear();
    }
    return longD(from) + '-' + longD(to);
  }
  function shortRange(from, to) {
    if (!from) return 'Through ' + U.fmtDate(to, 'mon');
    var a = U.toDate(from), b = U.toDate(to);
    if (a.getFullYear() === b.getFullYear()) return U.MON[a.getMonth()] + ' ' + a.getDate() + '-' + U.MON[b.getMonth()] + ' ' + b.getDate() + ', ' + b.getFullYear();
    return U.fmtDate(from, 'mon') + '-' + U.fmtDate(to, 'mon');
  }
  function periodSpecs(from, to, kind) {
    from = from || earliest(); to = to || U.today();
    var out = [], cur = from;
    while (cur <= to && out.length < 120) {
      var d = U.toDate(cur), y = d.getFullYear(), m = d.getMonth(), end, label;
      if (kind === 'quarters') { var q = Math.floor(m / 3); end = U.iso(new Date(y, q * 3 + 3, 0)); label = 'Q' + (q + 1) + ' ' + y; }
      else if (kind === 'years') { end = y + '-12-31'; label = String(y); }
      else { end = U.iso(new Date(y, m + 1, 0)); label = U.MON[m] + ' ' + y; }
      if (end > to) end = to;
      out.push({ label: label, from: cur, to: end });
      cur = U.addDays(end, 1);
    }
    return out;
  }
  function prevRange(from, to, kind) {
    from = from || fyStart(to);
    if (kind === 'py') return [U.addMonths(from, -12), U.addMonths(to, -12)];
    var len = U.diffDays(to, from) + 1;
    return [U.addDays(from, -len), U.addDays(from, -1)];
  }
  R.rangeText = rangeText;

  /* ───────────── normalized options ───────────── */
  function N(opts, def) {
    var o = ext({}, opts || {});
    o.method = o.method === 'cash' ? 'cash' : 'accrual';
    if (o.from === undefined && o.to === undefined) { var r = U.range(def || 'this-year-to-date'); o.from = r[0]; o.to = r[1]; }
    if (!o.from || o.from <= '1900-01-01') o.from = '';
    if (!o.to || o.to >= '2999-12-31') o.to = '';
    o.today = U.today();
    o.asof = o.to || o.today;
    return o;
  }
  function res(title, columns, rows, x) { return ext({ title: title, columns: columns, rows: rows }, x); }
  function colsFrom(specs, first) {
    return [{ label: first || '', type: 'label' }].concat(specs.map(function (s) {
      return { label: s.label, type: s.type || 'money', from: s.from, to: s.to, cust: s.cust, vend: s.vend, item: s.item, calc: !!s.calc, asofCol: s.asofCol };
    }));
  }

  /* ───────────── P&L engine ───────────── */
  function dimSpecs(o, kind) {
    var seen = {}, list = [], none = false;
    function key(e) {
      if (kind === 'customers') return e.p.cust || (e.t.cust && SALES_ALL.indexOf(e.t.type) >= 0 ? e.t.cust : '');
      if (kind === 'vendors') return e.p.vend || (e.t.payee && S.vend[e.t.payee] ? e.t.payee : '');
      return e.p.item || '';
    }
    posts(o, function (e) { return PL_TYPES.indexOf((S.acct[e.acct] || {}).type) >= 0; }).forEach(function (e) {
      var k = key(e); if (!k) { none = true; return; }
      if (!seen[k]) { seen[k] = 1; list.push(k); }
    });
    var nm = kind === 'customers' ? S.custName : kind === 'vendors' ? vendName : itemName;
    list.sort(function (a, b) { return byName(nm(a), nm(b)); });
    var specs = list.map(function (k) {
      var s = { label: nm(k), from: o.from, to: o.to, filter: function (e) { return key(e) === k; } };
      s[kind === 'customers' ? 'cust' : kind === 'vendors' ? 'vend' : 'item'] = k;
      return s;
    });
    if (none || !specs.length) specs.push({ label: 'Not Specified', from: o.from, to: o.to, filter: function (e) { return !key(e); } });
    return specs;
  }
  var SALES_ALL = ['Invoice', 'Sales Receipt', 'Credit Memo', 'Refund', 'Payment'];
  function plSpecs(o) {
    var cols = o.cols || 'total', specs = [];
    var to = o.to || o.today;
    if (cols === 'months' || cols === 'quarters' || cols === 'years') {
      specs = periodSpecs(o.from, to, cols);
      specs.push({ label: 'Total', from: o.from, to: o.to });
    } else if (cols === 'customers' || cols === 'vendors' || cols === 'products') {
      specs = dimSpecs(o, cols);
      specs.push({ label: 'Total', from: o.from, to: o.to });
    } else {
      specs.push({ label: 'Total', from: o.from, to: o.to });
    }
    if (o.compare && cols === 'total') {
      var pr = prevRange(o.from, to, o.compare);
      specs[0].label = shortRange(o.from || fyStart(to), to);
      specs.push({ label: shortRange(pr[0], pr[1]) + (o.compare === 'py' ? ' (PY)' : ' (PP)'), from: pr[0], to: pr[1] });
      specs.push({ label: 'Change', calc: function (b) { return b[0] == null || b[1] == null ? null : r2(b[0] - b[1]); } });
      specs.push({ label: '% Change', type: 'pct', calc: function (b) { return pctChange(b[0], b[1]); } });
    }
    return specs;
  }
  function computeMaps(specs, o) {
    specs.forEach(function (s) { if (!s.calc && !s.map) s.map = sums({ from: s.from, to: s.to, method: o.method }, s.filter); });
  }
  function mkBase(specs) { return function (getNum) { return specs.map(function (s) { return s.calc ? null : r2(getNum(s.bmap || s.map, s)); }); }; }
  function mkFin(specs) { return function (bv) { return specs.map(function (s, i) { return s.calc ? s.calc(bv, s) : bv[i]; }); }; }

  function acctNode(b, a, base, fin, o) {
    var rolled = base(function (m) { return roll(a.id, m); });
    if (!o.allRows && zeroArr(rolled)) return;
    var ks = kids(a.id).filter(function (k) { return o.allRows || !zeroArr(base(function (m) { return roll(k.id, m); })); });
    if (!ks.length) { b.row(a.name, fin(rolled), { acct: a.id }); return; }
    var own = base(function (m) { return m[a.id] || 0; });
    b.open(a.name, zeroArr(own) ? null : fin(own), { acct: a.id, own: true });
    ks.forEach(function (k) { acctNode(b, k, base, fin, o); });
    b.close('Total for ' + a.name, fin(rolled), { acct: a.id });
  }
  function buildPL(o, specs) {
    computeMaps(specs, o);
    var b = new Builder(), base = mkBase(specs), fin = mkFin(specs);
    var ctx = { inc: base(function (m) { return typeSum(T.inc, m); }) };
    specs.forEach(function (s) { s.ctx = ctx; });
    function section(label, types, tlabel) {
      var tot = base(function (m) { return typeSum(types, m); });
      var roots = rootsOf(types);
      var any = roots.some(function (a) { return o.allRows || !zeroArr(base(function (m) { return roll(a.id, m); })); });
      if (!any) return { tot: tot, shown: false };
      b.open(label, null, { section: true });
      roots.forEach(function (a) { acctNode(b, a, base, fin, o); });
      b.close(tlabel, fin(tot), { types: types });
      return { tot: tot, shown: true };
    }
    var inc = section('Income', T.inc, 'Total Income');
    var cogs = section('Cost of Goods Sold', T.cogs, 'Total Cost of Goods Sold');
    var gp = vsub(inc.tot, cogs.tot);
    b.net('Gross Profit', fin(gp));
    var ex = section('Expenses', T.exp, 'Total Expenses');
    var noi = vsub(gp, ex.tot);
    b.net('Net Operating Income', fin(noi));
    var oi = section('Other Income', T.oi, 'Total Other Income');
    var oe = section('Other Expenses', T.oe, 'Total Other Expenses');
    var noth = vsub(oi.tot, oe.tot);
    if (oi.shown || oe.shown) b.net('Net Other Income', fin(noth));
    b.net('Net Income', fin(vadd(noi, noth)), { final: true });
    return b.rows;
  }
  R.buildPL = buildPL; R.plSpecs = plSpecs;

  /* ───────────── Balance sheet engine ───────────── */
  function bsSpecs(o) {
    var to = o.to || o.today, cols = o.cols || 'total', specs = [];
    if (cols === 'months' || cols === 'quarters' || cols === 'years') {
      periodSpecs(o.from || fyStart(to), to, cols).forEach(function (p) { specs.push({ label: p.label, from: '', to: p.to, asofCol: true }); });
    } else {
      specs.push({ label: 'Total', from: '', to: to, asofCol: true });
      if (o.compare) {
        var pt = o.compare === 'py' ? U.addMonths(to, -12) : U.addDays(o.from || fyStart(to), -1);
        specs[0].label = 'As of ' + U.fmtDate(to, 'mon');
        specs.push({ label: 'As of ' + U.fmtDate(pt, 'mon') + (o.compare === 'py' ? ' (PY)' : ' (PP)'), from: '', to: pt, asofCol: true });
        specs.push({ label: 'Change', calc: function (b) { return b[0] == null || b[1] == null ? null : r2(b[0] - b[1]); } });
        specs.push({ label: '% Change', type: 'pct', calc: function (b) { return pctChange(b[0], b[1]); } });
      }
    }
    return specs;
  }
  function buildBS(o, specs, summary) {
    specs.forEach(function (s) { if (s.calc) return; var x = bsMap(s.to, o.method); s.bmap = x.map; s.ni = x.ni; });
    var b = new Builder(), base = mkBase(specs), fin = mkFin(specs);
    function grp(label, types, tlabel) {
      var tot = base(function (m) { return typeSum(types, m); });
      var roots = rootsOf(types);
      var any = roots.some(function (a) { return o.allRows || !zeroArr(base(function (m) { return roll(a.id, m); })); });
      if (!any) return tot;
      if (summary) { b.row(label, fin(tot), { types: types }); return tot; }
      b.open(label, null, {});
      roots.forEach(function (a) { acctNode(b, a, base, fin, o); });
      b.close(tlabel, fin(tot), { types: types });
      return tot;
    }
    b.open('Assets', null, { section: true });
    b.open('Current Assets', null, {});
    var ca = vadd(grp('Bank Accounts', ['Bank'], 'Total Bank Accounts'),
      grp('Accounts Receivable', ['Accounts receivable (A/R)'], 'Total Accounts Receivable'),
      grp('Other Current Assets', ['Other Current Assets'], 'Total Other Current Assets'));
    b.close('Total Current Assets', fin(ca));
    var ta = vadd(ca, grp('Fixed Assets', ['Fixed Assets'], 'Total Fixed Assets'), grp('Other Assets', ['Other Assets'], 'Total Other Assets'));
    b.close('Total Assets', fin(ta), { grandA: true });
    b.open('Liabilities and Equity', null, { section: true });
    b.open('Liabilities', null, {});
    b.open('Current Liabilities', null, {});
    var cl = vadd(grp('Accounts Payable', ['Accounts payable (A/P)'], 'Total Accounts Payable'),
      grp('Credit Cards', ['Credit Card'], 'Total Credit Cards'),
      grp('Other Current Liabilities', ['Other Current Liabilities'], 'Total Other Current Liabilities'));
    b.close('Total Current Liabilities', fin(cl));
    var tl = vadd(cl, grp('Long-Term Liabilities', ['Long Term Liabilities'], 'Total Long-Term Liabilities'));
    b.close('Total Liabilities', fin(tl));
    var ni = base(function (m, s) { return s.ni; });
    var eqA = base(function (m) { return typeSum(['Equity'], m); });
    var te = vadd(eqA, ni);
    if (summary) b.row('Equity', fin(te), { types: ['Equity'] });
    else {
      b.open('Equity', null, {});
      var re = reAcct();
      rootsOf(['Equity']).forEach(function (a) {
        if (a.id === re) {
          var v = base(function (m) { return roll(a.id, m); });
          if (o.allRows || !zeroArr(v)) b.row(a.name, fin(v), {});
        } else acctNode(b, a, base, fin, o);
      });
      b.row('Net Income', fin(ni), { link: 'Profit and Loss' });
      b.close('Total Equity', fin(te));
    }
    b.close('Total Liabilities and Equity', fin(vadd(tl, te)), { grandLE: true });
    return b.rows;
  }
  R.buildBS = buildBS; R.bsSpecs = bsSpecs;

  /* ───────────── detail columns ───────────── */
  var CD = {
    date: ['Date', 'date', function (e) { return U.fmtDate(e.date || e.t.date); }],
    type: ['Transaction type', 'text', function (e) { return typeName(e.t); }],
    num: ['Num', 'text', function (e) { return e.t.no || ''; }],
    name: ['Name', 'text', function (e) { return e.name != null ? e.name : S.payeeName(e.t); }],
    cust: ['Customer', 'text', function (e) { return S.custName(e.cust || (e.l && e.l.cust) || (e.p && e.p.cust) || e.t.cust); }],
    vend: ['Vendor', 'text', function (e) { return vendName(e.t.payee); }],
    memo: ['Memo/Description', 'text', function (e) { return (e.p && e.p.desc) || (e.l && e.l.desc) || e.memo || e.t.memo || ''; }],
    due: ['Due date', 'date', function (e) { return U.fmtDate(e.t.due); }],
    terms: ['Terms', 'text', function (e) { return e.t.terms || ''; }],
    amount: ['Amount', 'money', function (e) { return e.amt != null ? e.amt : e.t.total; }, true],
    open: ['Open balance', 'money', function (e) { return e.open != null ? e.open : L.openBalance(e.t); }, true],
    account: ['Account', 'text', function (e) { return e.acct ? acctName(e.acct) : acctName(mainAcct(e.t)); }],
    split: ['Split', 'text', function (e) { return e.acct ? splitOf(e) : ''; }],
    posting: ['Posting', 'text', function (e) { return isPosting(e.t) ? 'Yes' : 'No'; }],
    item: ['Product/Service', 'text', function (e) { return e.l ? itemName(e.l.item) : ''; }],
    qty: ['Qty', 'num', function (e) { return e.qty != null ? e.qty : e.l && e.l.qty != null ? e.l.qty : ''; }, true],
    rate: ['Sales price', 'money', function (e) { return e.l && e.l.rate != null ? e.l.rate : ''; }],
    debit: ['Debit', 'money', function (e) { return e.amt > 0.0001 ? e.amt : ''; }, true],
    credit: ['Credit', 'money', function (e) { return e.amt < -0.0001 ? -e.amt : ''; }, true],
    balance: ['Balance', 'money', function () { return ''; }],
    past: ['Past due', 'num', function (e) { return e.past != null ? e.past : ''; }],
    status: ['Status', 'text', function (e) { return e.status != null ? e.status : L.status(e.t).text || e.t.status || ''; }]
  };
  var SYS_BLANK = ['num', 'name', 'cust', 'vend', 'memo', 'split', 'due', 'terms', 'item', 'posting', 'status', 'open'];
  /* dc(['date','type',...]) or dc([['amount', 'Total amount'], ...]) or custom {key,label,type,get,sum}. */
  function dc(list) {
    return list.map(function (k) {
      if (typeof k === 'object' && !Array.isArray(k)) return k;
      var key = Array.isArray(k) ? k[0] : k, d = CD[key];
      return { key: key, label: Array.isArray(k) && k[1] != null ? k[1] : d[0], type: d[1], get: d[2], sum: Array.isArray(k) && k[2] != null ? k[2] : !!d[3] };
    });
  }
  function colsOf(cols) { return cols.map(function (c, i) { return { label: c.label, type: i === 0 ? 'label' : c.type, key: c.key }; }); }
  function cellVals(cols, e) {
    return cols.map(function (c) {
      if (e.t && e.t.hidden) {
        if (c.key === 'type') return sysLabel(e.t);
        if (SYS_BLANK.indexOf(c.key) >= 0) return '';
      }
      var v = c.get(e);
      return v == null ? '' : v;
    });
  }
  function rowX(e) {
    var x = {};
    if (e.t) { if (e.t.hidden) x.sys = true; else x.txn = e.t.id; }
    if (e.acct) x.eacct = e.acct;
    return x;
  }
  function blankVals(cols) { return cols.slice(1).map(function () { return ''; }); }
  function totalsVals(cols, sums2, extra) {
    return cols.slice(1).map(function (c, i) { var k = i + 1; if (extra && extra[c.key] != null) return extra[c.key]; return c.sum ? r2(sums2[k] || 0) : ''; });
  }
  /* Generic grouped detail table. groups: [{label, items, begin}] (label null = no header).
     x: { grand: 'TOTAL'|false, keep: bool } */
  function detail(cols, groups, x, b) {
    x = x || {};
    b = b || new Builder();
    var grand = {}, anyItems = 0, balIdx = -1, amtIdx = -1;
    cols.forEach(function (c, i) { if (c.key === 'balance') balIdx = i; if (c.key === 'amount' || c.key === 'open') { if (amtIdx < 0) amtIdx = i; } });
    if (x.balanceOf) cols.forEach(function (c, i) { if (c.key === x.balanceOf) amtIdx = i; });
    groups.forEach(function (g) {
      if (!g.items.length && !x.keep && g.begin == null) return;
      if (g.label != null) b.open(g.label, null, ext({ section: !!x.sections }, g.x));
      var tot = {}, run = g.begin || 0;
      if (g.begin != null && balIdx >= 0) {
        var bv = blankVals(cols); bv[balIdx - 1] = r2(run);
        b.row('Beginning Balance', bv, {});
      }
      g.items.forEach(function (e) {
        var v = cellVals(cols, e);
        cols.forEach(function (c, i) { if (c.sum && typeof v[i] === 'number' && !e.nosum) { tot[i] = (tot[i] || 0) + v[i]; grand[i] = (grand[i] || 0) + v[i]; } });
        if (balIdx >= 0 && amtIdx >= 0) { run = r2(run + (+v[amtIdx] || 0)); v[balIdx] = run; }
        b.row(v[0], v.slice(1), ext(rowX(e), e.rx));
        anyItems++;
      });
      if (g.label != null) {
        var tv = totalsVals(cols, tot);
        if (balIdx >= 0 && g.begin != null) tv[balIdx - 1] = r2(run);
        b.close('Total for ' + g.label, tv, {});
      }
    });
    if (x.grand !== false && anyItems && cols.some(function (c) { return c.sum; })) b.row(x.grand || 'TOTAL', totalsVals(cols, grand), { bold: true, total: true, grand: true });
    return b.rows;
  }
  function flat(cols, items, x) { return detail(cols, [{ label: null, items: items }], x); }
  function groupBy(items, keyFn, labelFn, sortFn) {
    var m = {}, order = [];
    items.forEach(function (e) { var k = keyFn(e); if (k == null) k = ''; if (!m[k]) { m[k] = []; order.push(k); } m[k].push(e); });
    var gs = order.map(function (k) { return { key: k, label: labelFn ? labelFn(k) : k, items: m[k] }; });
    gs.sort(sortFn || function (a, b) { return byName(a.label, b.label); });
    return gs;
  }
  R.detail = detail; R.dc = dc;

  /* Account-tree detail: entries grouped under accounts, nested like the chart.
     by: { acctId: [entries] }; begin: { acctId: number } (optional) */
  function acctTree(b, roots, by, cols, o, begin) {
    var amtIdx = -1, balIdx = -1;
    cols.forEach(function (c, i) { if (c.key === 'amount') amtIdx = i; if (c.key === 'balance') balIdx = i; });
    function has(a) {
      if ((by[a.id] || []).length || (begin && Math.abs(begin[a.id] || 0) > 0.004)) return true;
      return kids(a.id).some(has);
    }
    function node(a) {
      if (!has(a)) return 0;
      var own = by[a.id] || [], ks = kids(a.id).filter(has), bg = begin ? r2(begin[a.id] || 0) : null;
      var simple = !ks.length && !own.length && bg != null;
      b.open(a.name, null, { acct: a.id });
      var run = bg || 0, t = 0;
      if (bg != null && (Math.abs(bg) > 0.004 || simple) && balIdx >= 0) { var bv = blankVals(cols); bv[balIdx - 1] = bg; b.row('Beginning Balance', bv, {}); }
      own.forEach(function (e) {
        var amt = r2(nat(e.acct, e.amt)), v = cellVals(cols, ext(ext({}, e), { amt: amt }));
        if (amtIdx >= 0) v[amtIdx] = amt;
        run = r2(run + amt); t += amt;
        if (balIdx >= 0) v[balIdx] = run;
        b.row(v[0], v.slice(1), rowX(e));
      });
      ks.forEach(function (k) { t += node(k); });
      t = r2(t);
      var tv = blankVals(cols);
      if (amtIdx >= 0) tv[amtIdx - 1] = t;
      if (balIdx >= 0 && bg != null) tv[balIdx - 1] = r2((bg || 0) + t + subBegins(a));
      b.close('Total for ' + a.name, tv, { acct: a.id });
      return t;
    }
    function subBegins(a) { var s = 0; kids(a.id).forEach(function (k) { s += (begin[k.id] || 0) + subBegins(k); }); return s; }
    var total = 0;
    roots.forEach(function (a) { total += node(a); });
    return r2(total);
  }
  /* Hidden system entries (opening balances, summarized activity) show as one row per account. */
  function entriesBy(o, keep) {
    var by = {}, sys = {};
    sortE(posts(o, keep)).forEach(function (e) {
      if (e.t.hidden) {
        var k = e.t.id + '|' + e.acct;
        if (sys[k]) { sys[k].amt = r2(sys[k].amt + e.amt); return; }
        e = sys[k] = ext({}, e);
      }
      (by[e.acct] = by[e.acct] || []).push(e);
    });
    return by;
  }
  function amountVals(cols, v) { var tv = blankVals(cols); cols.forEach(function (c, i) { if (c.key === 'amount') tv[i - 1] = v; }); return tv; }
  R.acctTree = acctTree;

  /* Name trees (customers with sub-customers). vals: { id: [..] } */
  function custTree(b, vals, x) {
    x = x || {};
    var ids = Object.keys(vals);
    var top = {};
    ids.forEach(function (id) { var c = S.cust[id], p = c && c.parent ? c.parent : id; (top[p] = top[p] || []).push(id); });
    var keys = Object.keys(top).sort(function (a, b) { return byName(S.cust[a] ? S.cust[a].name : a, S.cust[b] ? S.cust[b].name : b); });
    var width = vals[ids[0]] ? vals[ids[0]].length : 0, grand = [];
    for (var i = 0; i < width; i++) grand.push(0);
    keys.forEach(function (p) {
      var subs = top[p].filter(function (id) { return id !== p; });
      var nm = S.cust[p] ? S.cust[p].name : (p || 'Not Specified');
      if (!subs.length) { b.row(nm, vals[p], { go: S.cust[p] ? ['customerdetail', { id: p }] : null }); vals[p].forEach(function (v, i) { grand[i] += +v || 0; }); return; }
      b.open(nm, vals[p] || null, { go: S.cust[p] ? ['customerdetail', { id: p }] : null });
      var tot = (vals[p] || grand.map(function () { return 0; })).slice();
      subs.sort(function (a, c) { return byName(S.cust[a].name, S.cust[c].name); }).forEach(function (id) {
        b.row(S.cust[id].name, vals[id], { go: ['customerdetail', { id: id }] });
        vals[id].forEach(function (v, i) { tot[i] = (+tot[i] || 0) + (+v || 0); });
      });
      tot = tot.map(r2);
      b.close('Total for ' + nm, tot, {});
      tot.forEach(function (v, i) { grand[i] += v; });
    });
    if (x.grand !== false && keys.length) b.row('TOTAL', grand.map(r2), { bold: true, total: true, grand: true });
    return b.rows;
  }
  function vendRows(b, vals, x) {
    x = x || {};
    var keys = Object.keys(vals).sort(function (a, c) { return byName(vendName(a) || a, vendName(c) || c); });
    var grand = null;
    keys.forEach(function (k) {
      b.row(vendName(k) || (k || 'Not Specified'), vals[k], { go: S.vend[k] ? ['vendordetail', { id: k }] : null });
      if (!grand) grand = vals[k].map(function () { return 0; });
      vals[k].forEach(function (v, i) { grand[i] += +v || 0; });
    });
    if (x.grand !== false && grand) b.row('TOTAL', grand.map(r2), { bold: true, total: true, grand: true });
    return b.rows;
  }

  /* ══════════════════ reports ══════════════════ */
  var META = R.META = {};
  function M(a, b) { return ext(ext({}, a), b); }
  function reg(name, meta, fn) {
    META[name] = meta || {};
    QB.report(name, function (opts) { var o = N(opts, META[name].period); o.name = name; return fn(o, name); });
  }
  var PLM = { period: 'this-year-to-date', cols: ['total', 'months', 'quarters', 'years', 'customers', 'vendors', 'products'], compare: true, method: true };
  var BSM = { period: 'this-year-to-date', asof: true, cols: ['total', 'months', 'quarters', 'years'], compare: true, method: true };
  var TXM = { period: 'this-year-to-date' };
  var ASOF = { period: 'today', asof: true };
  var LIST = { period: 'none' };
  var PERIODIC = ['total', 'months', 'quarters', 'years'];

  function totalSpecs(o) {
    if (o.cols === 'months' || o.cols === 'quarters' || o.cols === 'years') return periodSpecs(o.from, o.to || o.today, o.cols).concat([{ label: 'Total', from: o.from, to: o.to }]);
    return [{ label: 'Total', from: o.from, to: o.to }];
  }
  function inSpec(t, s) { return !(s.from && t.date < s.from) && !(s.to && t.date > s.to); }
  /* Simple list report: cols [[label, type]], items [{ v:[...], x }] */
  function listRes(title, cols, items, x) {
    var b = new Builder();
    items.forEach(function (it) { b.row(it.v[0], it.v.slice(1), it.x); });
    return res(title, cols.map(function (c, i) { return { label: c[0], type: i ? c[1] || 'text' : 'label' }; }), b.rows, x);
  }

  /* ───── Profit and Loss family ───── */
  function plRes(title, o, specs) { return res(title, colsFrom(specs), buildPL(o, specs), { basis: true }); }
  reg('Profit and Loss', PLM, function (o) { return plRes('Profit and Loss', o, plSpecs(o)); });
  reg('Profit and Loss by Month', M(PLM, { defCols: 'months' }), function (o) { o.cols = o.cols || 'months'; return plRes('Profit and Loss by Month', o, plSpecs(o)); });
  reg('Profit and Loss by Customer', M(PLM, { defCols: 'customers' }), function (o) { o.cols = o.cols || 'customers'; return plRes('Profit and Loss by Customer', o, plSpecs(o)); });
  reg('Quarterly Profit and Loss Summary', M(PLM, { defCols: 'quarters' }), function (o) { o.cols = o.cols || 'quarters'; return plRes('Quarterly Profit and Loss Summary', o, plSpecs(o)); });
  reg('Profit and Loss by Tag Group', PLM, function (o) {
    var specs = o.cols && o.cols !== 'total' || o.compare ? plSpecs(o) : [{ label: 'Not tagged', from: o.from, to: o.to }, { label: 'Total', from: o.from, to: o.to }];
    return plRes('Profit and Loss by Tag Group', o, specs);
  });
  reg('Profit and Loss Comparison', M(PLM, { defCompare: 'py' }), function (o) { if (o.compare == null) o.compare = 'py'; o.cols = 'total'; return plRes('Profit and Loss Comparison', o, plSpecs(o)); });
  reg('Profit and Loss as % of total income', PLM, function (o) {
    var specs = plSpecs(o);
    if (specs.length === 1) specs.push({ label: '% of Income', type: 'pct', calc: function (b, s) { return pctOf(b[0], s.ctx.inc[0]); } });
    return plRes('Profit and Loss as % of total income', o, specs);
  });
  reg('Profit and Loss year-to-date comparison', M(PLM, { period: 'this-month', cols: null, compare: false }), function (o) {
    var to = o.to || o.today, from = o.from || fyStart(to), fy = fyStart(to);
    return plRes('Profit and Loss year-to-date comparison', o, [{ label: shortRange(from, to), from: from, to: to }, { label: shortRange(fy, to), from: fy, to: to }]);
  });
  function hasE(a, by) { return (by[a.id] || []).length > 0 || kids(a.id).some(function (k) { return hasE(k, by); }); }
  var DET = ['date', 'type', 'num', 'name', 'memo', 'split', 'amount', 'balance'];
  reg('Profit and Loss Detail', M(TXM, { method: true }), function (o) {
    var cols = dc(DET), b = new Builder();
    var by = entriesBy(o, function (e) { var a = S.acct[e.acct]; return a && PL_TYPES.indexOf(a.type) >= 0; });
    function sec(label, types, tl) {
      var roots = rootsOf(types);
      if (!roots.some(function (a) { return hasE(a, by); })) return 0;
      b.open(label, null, { section: true });
      var t = acctTree(b, roots, by, cols, o);
      b.close(tl, amountVals(cols, t));
      return t;
    }
    var inc = sec('Income', T.inc, 'Total Income'), cogs = sec('Cost of Goods Sold', T.cogs, 'Total Cost of Goods Sold');
    var gp = r2(inc - cogs);
    b.net('Gross Profit', amountVals(cols, gp));
    var ex = sec('Expenses', T.exp, 'Total Expenses'), noi = r2(gp - ex);
    b.net('Net Operating Income', amountVals(cols, noi));
    var oi = sec('Other Income', T.oi, 'Total Other Income'), oe = sec('Other Expenses', T.oe, 'Total Other Expenses');
    if (oi || oe) b.net('Net Other Income', amountVals(cols, r2(oi - oe)));
    b.net('Net Income', amountVals(cols, r2(noi + oi - oe)), { final: true });
    return res('Profit and Loss Detail', colsOf(cols), b.rows, { basis: true });
  });

  /* ───── Balance sheet family ───── */
  reg('Balance Sheet', BSM, function (o) { var s = bsSpecs(o); return res('Balance Sheet', colsFrom(s), buildBS(o, s), { asof: true, basis: true }); });
  reg('Balance Sheet Summary', BSM, function (o) { var s = bsSpecs(o); return res('Balance Sheet Summary', colsFrom(s), buildBS(o, s, true), { asof: true, basis: true }); });
  reg('Balance Sheet Comparison', M(BSM, { defCompare: 'py' }), function (o) {
    if (o.compare == null) o.compare = 'py'; o.cols = 'total';
    var s = bsSpecs(o); return res('Balance Sheet Comparison', colsFrom(s), buildBS(o, s), { asof: true, basis: true });
  });
  var ASSET_T = ['Bank', 'Accounts receivable (A/R)', 'Other Current Assets', 'Fixed Assets', 'Other Assets'];
  var LE_T = ['Accounts payable (A/P)', 'Credit Card', 'Other Current Liabilities', 'Long Term Liabilities', 'Equity'];
  reg('Balance Sheet Detail', M(TXM, { method: true }), function (o) {
    var cols = dc(DET), b = new Builder();
    var bm = o.from ? sums({ to: U.addDays(o.from, -1), method: o.method }) : {};
    var by = entriesBy(o, function (e) { return S.isBS(e.acct); });
    [['Assets', ASSET_T, 'Total Assets'], ['Liabilities and Equity', LE_T, 'Total Liabilities and Equity']].forEach(function (sec) {
      var roots = rootsOf(sec[1]);
      b.open(sec[0], null, { section: true });
      var t = acctTree(b, roots, by, cols, o, bm), bt = 0;
      roots.forEach(function (a) { bt += roll(a.id, bm); });
      var tv = amountVals(cols, t); tv[tv.length - 1] = r2(bt + t);
      b.close(sec[2], tv);
    });
    return res('Balance Sheet Detail', colsOf(cols), b.rows, { basis: true });
  });

  /* ───── Statement of Cash Flows (indirect) ───── */
  function cashEffect(a, v) { return S.isDebit(a) ? -v : v; }
  reg('Statement of Cash Flows', M(PLM, { cols: PERIODIC, compare: false }), function (o) {
    var to = o.to || o.today, from = o.from || earliest();
    var specs = (o.cols && o.cols !== 'total') ? periodSpecs(from, to, o.cols).concat([{ label: 'Total', from: from, to: to }]) : [{ label: 'Total', from: from, to: to }];
    specs.forEach(function (s) {
      s.map = sums({ from: s.from, to: s.to, method: o.method });
      s.cash0 = typeSum(['Bank'], sums({ to: U.addDays(s.from, -1), method: o.method }));
    });
    var base = mkBase(specs), fin = mkFin(specs), b = new Builder();
    function lines(types) {
      var tot = specs.map(function () { return 0; });
      acache().ord.forEach(function (a) {
        if (types.indexOf(a.type) < 0) return;
        var v = base(function (m) { return cashEffect(a, m[a.id] || 0); });
        if (!o.allRows && zeroArr(v)) return;
        b.row(S.fullName(a.id), fin(v), { acct: a.id, own: true });
        tot = vadd(tot, v);
      });
      return tot;
    }
    function any(types) { return acache().ord.some(function (a) { return types.indexOf(a.type) >= 0 && specs.some(function (s) { return Math.abs(s.map[a.id] || 0) > 0.004; }); }); }
    var ni = base(function (m) { return netIncome(m); });
    b.open('Operating Activities', null, { section: true });
    b.row('Net Income', fin(ni), { link: 'Profit and Loss' });
    var opT = ['Accounts receivable (A/R)', 'Other Current Assets', 'Accounts payable (A/P)', 'Credit Card', 'Other Current Liabilities'];
    var adj = specs.map(function () { return 0; });
    if (any(opT) || o.allRows) {
      b.open('Adjustments to reconcile Net Income to Net Cash provided by operations:', null, {});
      adj = lines(opT);
      b.close('Total Adjustments to reconcile Net Income to Net Cash provided by operations:', fin(adj));
    }
    var op = vadd(ni, adj);
    b.close('Net cash provided by operating activities', fin(op));
    var inv = specs.map(function () { return 0; }), fnc = specs.map(function () { return 0; });
    if (any(['Fixed Assets', 'Other Assets'])) { b.open('Investing Activities', null, { section: true }); inv = lines(['Fixed Assets', 'Other Assets']); b.close('Net cash provided by investing activities', fin(inv)); }
    if (any(['Long Term Liabilities', 'Equity'])) { b.open('Financing Activities', null, { section: true }); fnc = lines(['Long Term Liabilities', 'Equity']); b.close('Net cash provided by financing activities', fin(fnc)); }
    var net = vadd(op, inv, fnc), beg = base(function (m, s) { return s.cash0; });
    b.net('Net cash increase for period', fin(net));
    b.row('Cash at beginning of period', fin(beg), {});
    b.net('Cash at end of period', fin(vadd(net, beg)), { final: true });
    return res('Statement of Cash Flows', colsFrom(specs), b.rows, { basis: true });
  });

  /* ───── Business Snapshot ───── */
  reg('Business Snapshot', M(TXM, { method: true }), function (o) {
    var m = sums(o), b = new Builder();
    var inc = typeSum(T.inc, m) + typeSum(T.oi, m), exp = typeSum(T.cogs, m) + typeSum(T.exp, m) + typeSum(T.oe, m);
    b.row('Income', [r2(inc)], {}); b.row('Expenses', [r2(exp)], {}); b.net('Net Income', [r2(inc - exp)], {});
    var expList = rootsOf(T.cogs.concat(T.exp, T.oe)).map(function (a) { return { label: a.name, value: roll(a.id, m), acct: a.id }; }).filter(function (x) { return x.value > 0.004; }).sort(function (a, c) { return c.value - a.value; });
    var custM = {};
    posts(o, function (e) { var a = S.acct[e.acct]; return a && (a.type === 'Income' || a.type === 'Other Income'); }).forEach(function (e) {
      var c = e.p.cust || e.t.cust || ''; custM[c] = (custM[c] || 0) - e.amt;
    });
    var custList = Object.keys(custM).map(function (k) { return { label: k ? S.custName(k) : 'Not Specified', value: r2(custM[k]) }; }).filter(function (x) { return x.value > 0.004; }).sort(function (a, c) { return c.value - a.value; });
    b.open('Top customers by income', null, { section: true });
    custList.slice(0, 5).forEach(function (x) { b.row(x.label, [x.value], {}); });
    b.close('Total', [r2(custList.slice(0, 5).reduce(function (s, x) { return s + x.value; }, 0))]);
    b.open('Top expenses', null, { section: true });
    expList.slice(0, 5).forEach(function (x) { b.row(x.label, [x.value], { acct: x.acct }); });
    b.close('Total', [r2(expList.slice(0, 5).reduce(function (s, x) { return s + x.value; }, 0))]);
    var to = o.to || o.today, months = periodSpecs(U.iso(new Date(+to.slice(0, 4), 0, 1)), to, 'months');
    var series = months.map(function (p) {
      var mm = sums({ from: p.from, to: p.to, method: o.method });
      var py = sums({ from: U.addMonths(p.from, -12), to: U.addMonths(p.to, -12), method: o.method });
      return { label: p.label.slice(0, 3), inc: typeSum(T.inc, mm) + typeSum(T.oi, mm), exp: typeSum(T.cogs, mm) + typeSum(T.exp, mm) + typeSum(T.oe, mm), pinc: typeSum(T.inc, py) + typeSum(T.oi, py), pexp: typeSum(T.cogs, py) + typeSum(T.exp, py) + typeSum(T.oe, py) };
    });
    var top = expList.slice(0, 5), other = expList.slice(5).reduce(function (s, x) { return s + x.value; }, 0);
    if (other > 0.004) top = top.concat([{ label: 'Other', value: r2(other) }]);
    return res('Business Snapshot', [{ label: '', type: 'label' }, { label: 'Total', type: 'money', from: o.from, to: o.to }], b.rows, {
      basis: true,
      charts: [
        { title: 'Income and expenses', kind: 'bars', series: series, keys: [['inc', 'Income'], ['exp', 'Expenses']] },
        { title: 'Expenses', kind: 'donut', data: top },
        { title: 'Previous year income comparison', kind: 'bars', series: series, keys: [['inc', 'This year'], ['pinc', 'Last year']] },
        { title: 'Previous year expenses comparison', kind: 'bars', series: series, keys: [['exp', 'This year'], ['pexp', 'Last year']] }
      ]
    });
  });

  /* ───── Audit Log ───── */
  function stamp(d) {
    var h = d.getHours(), m = d.getMinutes();
    return U.fmtDate(U.iso(d), 'mon') + ' ' + ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h < 12 ? 'am' : 'pm');
  }
  function auditSeed() {
    var out = [], now = new Date(), t0 = new Date(now.getTime() - 3 * 60000);
    out.push({ when: t0, user: 'Craig Carlson', event: 'Signed in', name: '', date: '', amount: null });
    S.txns.filter(function (t) { return !t.hidden; }).slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).slice(0, 14).forEach(function (t, i) {
      var d = U.toDate(t.date); d.setHours(9 + (i % 8), (i * 17) % 60);
      out.push({ when: d, user: 'Craig Carlson', event: 'Added ' + t.type + (t.no ? ' ' + t.no : ''), name: S.payeeName(t), date: t.date, amount: t.total });
    });
    return out;
  }
  reg('Audit Log', LIST, function (o) {
    var list = (S.audit || []).concat(auditSeed()).filter(function (a) { return a && a.when; });
    list.sort(function (a, b) { return b.when - a.when; });
    if (o.from || o.to) list = list.filter(function (a) { var d = U.iso(new Date(a.when)); return (!o.from || d >= o.from) && (!o.to || d <= o.to); });
    return listRes('Audit Log', [['Date changed'], ['User'], ['Event'], ['Name'], ['Date', 'date'], ['Amount', 'money']], list.map(function (a) {
      return { v: [stamp(new Date(a.when)), a.user || '', a.event || '', a.name || '', a.date ? U.fmtDate(a.date) : '', a.amount == null ? '' : a.amount] };
    }));
  });

  /* ───── Who owes you ───── */
  function arOpen(asof) {
    return S.txns.filter(function (t) { return !t.hidden && t.date <= asof && ['Invoice', 'Credit Memo', 'Payment'].indexOf(t.type) >= 0 && Math.abs(L.openBalance(t)) > 0.004; });
  }
  function apOpen(asof) {
    return S.txns.filter(function (t) { return !t.hidden && t.date <= asof && (t.type === 'Bill' || t.type === 'Vendor Credit' || /^Bill Payment/.test(t.type)) && Math.abs(L.openBalance(t)) > 0.004; });
  }
  function bucket(t, asof) { var d = U.diffDays(asof, t.due || t.date); return d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4; }
  function pastDue(t, asof) { return Math.max(0, U.diffDays(asof, t.due || t.date)); }
  var AGE = ['Current', '1-30', '31-60', '61-90', '91 and over', 'Total'];
  var AGE_D = ['Current', '1 - 30 days past due', '31 - 60 days past due', '61 - 90 days past due', '91 or more days past due'];
  function agingVals(docs, keyOf, asof) {
    var vals = {};
    docs.forEach(function (t) { var k = keyOf(t) || ''; var v = vals[k] = vals[k] || [0, 0, 0, 0, 0, 0]; var ob = L.openBalance(t); v[bucket(t, asof)] += ob; v[5] += ob; });
    Object.keys(vals).forEach(function (k) { vals[k] = vals[k].map(r2); });
    return vals;
  }
  function ageCols() { return [{ label: '', type: 'label' }].concat(AGE.map(function (l) { return { label: l, type: 'money' }; })); }
  reg('Accounts receivable aging summary', M(ASOF, { aging: true }), function (o) {
    return res('A/R Aging Summary', ageCols(), custTree(new Builder(), agingVals(arOpen(o.asof), function (t) { return t.cust; }, o.asof)), { asof: true, reportName: 'Accounts receivable aging summary' });
  });
  reg('Accounts receivable aging detail', M(ASOF, { aging: true }), function (o) {
    var cols = dc(['date', 'type', 'num', 'cust', 'due', 'amount', 'open']), docs = sortE(arOpen(o.asof).map(function (t) { return { t: t, amt: arAmt(t) }; }));
    var groups = AGE_D.map(function (l, i) { return { label: l, items: docs.filter(function (e) { return bucket(e.t, o.asof) === i; }) }; });
    return res('A/R Aging Detail', colsOf(cols), detail(cols, groups), { asof: true });
  });
  reg('Collections Report', ASOF, function (o) {
    var cols = dc(['date', 'type', 'num', 'due', 'past', 'amount', 'open']);
    var docs = sortE(arOpen(o.asof).filter(function (t) { return t.type === 'Invoice' && pastDue(t, o.asof) > 0; }).map(function (t) { return { t: t, past: pastDue(t, o.asof) }; }));
    var groups = groupBy(docs, function (e) { return e.t.cust; }, function (k) { var c = S.cust[k]; return S.custName(k) + (c && c.phone ? '  ' + c.phone : ''); });
    return res('Collections Report', colsOf(cols), detail(cols, groups), { asof: true });
  });
  reg('Customer Balance Summary', ASOF, function (o) {
    var vals = {};
    arOpen(o.asof).forEach(function (t) { vals[t.cust] = [r2((vals[t.cust] ? vals[t.cust][0] : 0) + L.openBalance(t))]; });
    return res('Customer Balance Summary', [{ label: '', type: 'label' }, { label: 'Total', type: 'money' }], custTree(new Builder(), vals), { asof: true });
  });
  reg('Customer Balance Detail', ASOF, function (o) {
    var cols = dc(['date', 'type', 'num', 'due', 'amount', 'open', 'balance']);
    var docs = sortE(arOpen(o.asof).map(function (t) { return { t: t, amt: arAmt(t) }; }));
    return res('Customer Balance Detail', colsOf(cols), detail(cols, groupBy(docs, function (e) { return e.t.cust; }, S.custName), { balanceOf: 'open' }), { asof: true });
  });
  function txIn(o, types) { return sortE(S.txns.filter(function (t) { return !t.hidden && types.indexOf(t.type) >= 0 && inRange(t, o); }).map(function (t) { return { t: t }; })); }
  reg('Invoice List', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'name', 'memo', 'due', 'amount', 'open']);
    return res('Invoice List', colsOf(cols), flat(cols, txIn(o, ['Invoice'])));
  });
  function appliedTo(docId) {
    var out = [];
    S.txns.forEach(function (p) { (p.applied || []).forEach(function (a) { if (a.id === docId && a.amount) out.push({ t: p, amt: -a.amount, rx: { indent: 1 } }); }); });
    return sortE(out);
  }
  reg('Invoices and Received Payments', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'memo', 'amount', 'open']);
    var items = [];
    txIn(o, ['Invoice']).forEach(function (e) { items.push(ext(e, { amt: e.t.total })); appliedTo(e.t.id).forEach(function (p) { items.push(ext(p, { open: '' })); }); });
    return res('Invoices and Received Payments', colsOf(cols), detail(cols, groupBy(items, function (e) { return e.t.cust; }, S.custName, function (a, b) { return byName(a.label, b.label); })));
  });
  reg('Open Invoices', ASOF, function (o) {
    var cols = dc(['date', 'type', 'num', 'terms', 'due', 'amount', 'open']);
    var docs = sortE(arOpen(o.asof).filter(function (t) { return t.type === 'Invoice'; }).map(function (t) { return { t: t }; }));
    return res('Open Invoices', colsOf(cols), detail(cols, groupBy(docs, function (e) { return e.t.cust; }, S.custName)), { asof: true });
  });
  reg('Statement List', TXM, function (o) {
    var cols = dc([['date', 'Statement date'], ['type', 'Statement type'], ['name', 'Customer'], ['amount', 'Balance']]);
    return res('Statement List', colsOf(cols), flat(cols, txIn(o, ['Statement'])));
  });
  reg('Terms List', LIST, function () {
    return listRes('Terms List', [['Terms'], ['Due in fixed number of days', 'num']], U.TERMS.map(function (t) { return { v: [t, U.termsDays(t)] }; }));
  });
  var CHARGE_T = ['Charge', 'Time Charge', 'Billable Expense Charge'];
  reg('Unbilled charges', ASOF, function (o) {
    var cols = dc(['date', 'type', 'num', 'memo', 'amount', 'open']);
    var items = sortE(S.txns.filter(function (t) { return CHARGE_T.indexOf(t.type) >= 0 && t.status === 'Open' && t.date <= o.asof; }).map(function (t) { return { t: t, open: t.total }; }));
    S.txns.forEach(function (t) {
      if (t.hidden || t.date > o.asof || ['Bill', 'Expense', 'Check', 'Credit Card Expense'].indexOf(t.type) < 0) return;
      (t.lines || []).forEach(function (l) { if (l.billable && l.cust && !l.billed && !l.invoiced) items.push({ t: t, l: l, amt: l.amount, open: l.amount, cust: l.cust, name: S.custName(l.cust) }); });
    });
    return res('Unbilled charges', colsOf(cols), detail(cols, groupBy(sortE(items), function (e) { return e.cust || e.t.cust; }, S.custName)), { asof: true });
  });
  function timeItems(o) {
    return sortE(S.txns.filter(function (t) { return (t.type === 'Time Charge' || t.type === 'Time Activity') && inRange(t, o); }).map(function (t) {
      var l = (t.lines || [])[0] || {}, emp = t.employeeName || (t.employee && S.employees && S.employees.filter(function (x) { return x.id === t.employee; })[0] || {}).name || t.employee || 'Not specified';
      var h = t.hours != null ? +t.hours : (t.lines || []).reduce(function (s, x) { return s + (+x.qty || 0); }, 0);
      return { t: t, l: l, emp: String(emp), hours: h, amt: t.total, billable: t.status === 'Open' || t.billable ? 'Yes' : 'No' };
    }));
  }
  var TC = {
    adate: { key: 'date', label: 'Activity date', type: 'date', get: function (e) { return U.fmtDate(e.t.date); } },
    emp: { key: 'emp', label: 'Employee', type: 'text', get: function (e) { return e.emp; } },
    dur: { key: 'dur', label: 'Duration', type: 'hrs', get: function (e) { return e.hours; }, sum: true },
    bill: { key: 'bill', label: 'Billable', type: 'text', get: function (e) { return e.billable; } },
    rate: { key: 'rate', label: 'Rates', type: 'money', get: function (e) { return e.l && e.l.rate != null ? e.l.rate : ''; } }
  };
  reg('Unbilled time', ASOF, function (o) {
    var cols = dc([TC.adate, ['item'], 'memo', TC.dur, TC.rate, 'amount']);
    var items = timeItems({ to: o.asof }).filter(function (e) { return e.t.status === 'Open'; });
    return res('Unbilled time', colsOf(cols), detail(cols, groupBy(items, function (e) { return e.t.cust; }, S.custName)), { asof: true });
  });

  /* ───── What you owe ───── */
  reg('Accounts payable aging summary', M(ASOF, { aging: true }), function (o) {
    return res('A/P Aging Summary', ageCols(), vendRows(new Builder(), agingVals(apOpen(o.asof), function (t) { return t.payee; }, o.asof)), { asof: true });
  });
  reg('Accounts payable aging detail', M(ASOF, { aging: true }), function (o) {
    var cols = dc(['date', 'type', 'num', 'vend', 'due', 'amount', 'open']), docs = sortE(apOpen(o.asof).map(function (t) { return { t: t, amt: apAmt(t) }; }));
    var groups = AGE_D.map(function (l, i) { return { label: l, items: docs.filter(function (e) { return bucket(e.t, o.asof) === i; }) }; });
    return res('A/P Aging Detail', colsOf(cols), detail(cols, groups), { asof: true });
  });
  reg('Bills and Applied Payments', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'memo', 'amount']), items = [];
    txIn(o, ['Bill']).forEach(function (e) { items.push(e); appliedTo(e.t.id).forEach(function (p) { items.push(p); }); });
    return res('Bills and Applied Payments', colsOf(cols), detail(cols, groupBy(items, function (e) { return e.t.type === 'Bill' ? e.t.payee : e.t.payee; }, vendName)));
  });
  var BP_T = ['Bill Payment', 'Bill Payment (Check)', 'Bill Payment (Credit Card)'];
  reg('Bill Payment List', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'vend', 'amount']);
    return res('Bill Payment List', colsOf(cols), detail(cols, groupBy(txIn(o, BP_T), function (e) { return e.t.account || 'a_chk'; }, acctName)));
  });
  reg('Unpaid Bills', ASOF, function (o) {
    var cols = dc(['date', 'type', 'num', 'due', 'past', 'amount', 'open']);
    var docs = sortE(apOpen(o.asof).map(function (t) { return { t: t, amt: apAmt(t), past: t.type === 'Bill' ? pastDue(t, o.asof) : '' }; }));
    return res('Unpaid Bills', colsOf(cols), detail(cols, groupBy(docs, function (e) { return e.t.payee; }, vendName)), { asof: true });
  });
  reg('Vendor Balance Summary', ASOF, function (o) {
    var vals = {};
    apOpen(o.asof).forEach(function (t) { vals[t.payee] = [r2((vals[t.payee] ? vals[t.payee][0] : 0) + L.openBalance(t))]; });
    return res('Vendor Balance Summary', [{ label: '', type: 'label' }, { label: 'Total', type: 'money' }], vendRows(new Builder(), vals), { asof: true });
  });
  reg('Vendor Balance Detail', ASOF, function (o) {
    var cols = dc(['date', 'type', 'num', 'due', 'amount', 'open', 'balance']);
    var docs = sortE(apOpen(o.asof).map(function (t) { return { t: t, amt: apAmt(t) }; }));
    return res('Vendor Balance Detail', colsOf(cols), detail(cols, groupBy(docs, function (e) { return e.t.payee; }, vendName), { balanceOf: 'open' }), { asof: true });
  });
  var PAY_OUT = ['Expense', 'Check', 'Cash Expense', 'Credit Card Expense', 'Bill Payment', 'Bill Payment (Check)', 'Bill Payment (Credit Card)'];
  function contractorPays(o) {
    return txIn(o, PAY_OUT).filter(function (e) { var v = S.vend[e.t.payee]; return v && v.track1099; });
  }
  reg('1099 Contractor Balance Summary', TXM, function (o) {
    var vals = {};
    S.vendors.forEach(function (v) { if (v.track1099) vals[v.id] = [0]; });
    contractorPays(o).forEach(function (e) { vals[e.t.payee][0] = r2(vals[e.t.payee][0] + e.t.total); });
    return res('1099 Contractor Balance Summary', [{ label: '', type: 'label' }, { label: 'Total', type: 'money' }], vendRows(new Builder(), vals));
  });
  reg('1099 Contractor Balance Detail', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'memo', 'account', 'amount']);
    return res('1099 Contractor Balance Detail', colsOf(cols), detail(cols, groupBy(contractorPays(o), function (e) { return e.t.payee; }, vendName)));
  });
  var EXP_T = ['Cost of Goods Sold', 'Expenses', 'Other Expense'];
  function vendKey(e) { return e.p.vend || (e.t.payee && S.vend[e.t.payee] ? e.t.payee : ''); }
  reg('Expenses by Vendor Summary', M(TXM, { cols: PERIODIC, method: true }), function (o) {
    var specs = totalSpecs(o), vals = {};
    posts(o, function (e) { var a = S.acct[e.acct]; return a && EXP_T.indexOf(a.type) >= 0; }).forEach(function (e) {
      var k = vendKey(e); vals[k] = vals[k] || specs.map(function () { return 0; });
      specs.forEach(function (s, i) { if (inSpec(e.t, s)) vals[k][i] = r2(vals[k][i] + e.amt); });
    });
    return res('Expenses by Vendor Summary', colsFrom(specs), vendRows(new Builder(), vals), { basis: true });
  });
  var PURCH_T = ['Bill', 'Expense', 'Check', 'Cash Expense', 'Credit Card Expense', 'Vendor Credit', 'Credit Card Credit'];
  function purchLines(o) {
    var out = [];
    S.txns.forEach(function (t) {
      if (t.hidden || PURCH_T.indexOf(t.type) < 0 || !inRange(t, o)) return;
      var sg = t.type === 'Vendor Credit' || t.type === 'Credit Card Credit' ? -1 : 1;
      (t.lines || []).forEach(function (l) { out.push({ t: t, l: l, acct: l.acct, amt: r2(sg * (l.amount || 0)), memo: l.desc }); });
    });
    return sortE(out);
  }
  reg('Purchases by Vendor Detail', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'memo', ['account', 'Account'], 'amount', 'balance']);
    cols[4].get = function (e) { return acctName(e.l.acct); };
    var items = purchLines(o).filter(function (e) { return e.t.payee && S.vend[e.t.payee]; }).map(function (e) { var x = ext({}, e); delete x.acct; return x; });
    return res('Purchases by Vendor Detail', colsOf(cols), detail(cols, groupBy(items, function (e) { return e.t.payee; }, vendName)));
  });

  /* ───── Sales and customers ───── */
  var SALE_T = ['Invoice', 'Sales Receipt', 'Credit Memo', 'Refund'];
  function saleLines(o) {
    var out = [];
    S.txns.forEach(function (t) {
      if (t.hidden || SALE_T.indexOf(t.type) < 0 || !inRange(t, o)) return;
      var sg = t.type === 'Credit Memo' || t.type === 'Refund' ? -1 : 1;
      (t.lines || []).forEach(function (l) { out.push({ t: t, l: l, amt: r2(sg * (l.amount || 0)), qty: sg * (+l.qty || 0), cust: t.cust, item: l.item || '' }); });
      if (t.discount) out.push({ t: t, l: { desc: 'Discount', amount: -t.discount }, amt: r2(-sg * t.discount), qty: '', cust: t.cust, item: '', disc: true });
    });
    return sortE(out);
  }
  function custSpecVals(o, items, specs, valOf) {
    var vals = {};
    items.forEach(function (e) {
      var k = e.cust || ''; vals[k] = vals[k] || specs.map(function () { return 0; });
      specs.forEach(function (s, i) { if (inSpec(e.t, s)) vals[k][i] = r2(vals[k][i] + (valOf ? valOf(e) : e.amt)); });
    });
    return vals;
  }
  reg('Sales by Customer Summary', M(TXM, { cols: PERIODIC }), function (o) {
    var specs = totalSpecs(o);
    return res('Sales by Customer Summary', colsFrom(specs), custTree(new Builder(), custSpecVals(o, saleLines(o), specs)), { basis: true });
  });
  var SDET = ['date', 'type', 'num', 'item', 'memo', 'qty', 'rate', 'amount', 'balance'];
  reg('Sales by Customer Detail', TXM, function (o) {
    var cols = dc(SDET);
    return res('Sales by Customer Detail', colsOf(cols), detail(cols, groupBy(saleLines(o), function (e) { return e.cust; }, S.custName)), { basis: true });
  });
  reg('Sales by Customer Type Detail', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'cust', 'item', 'memo', 'qty', 'rate', 'amount', 'balance']);
    return res('Sales by Customer Type Detail', colsOf(cols), detail(cols, groupBy(saleLines(o), function (e) { var c = S.cust[e.cust]; return c && c.type || 'Not Specified'; })), { basis: true });
  });
  reg('Sales by Product/Service Summary', TXM, function (o) {
    var by = {}, total = 0;
    saleLines(o).forEach(function (e) {
      var k = e.item || ''; var v = by[k] = by[k] || { qty: 0, amt: 0, cogs: 0 };
      v.qty += +e.qty || 0; v.amt += e.amt; total += e.amt;
      var it = S.item[k]; if (it && it.type === 'Inventory') v.cogs += (it.cost || 0) * (+e.qty || 0);
    });
    var keys = Object.keys(by).sort(function (a, c) { return byName(itemName(a) || 'zzz', itemName(c) || 'zzz'); });
    var b = new Builder(), tq = 0, tc = 0;
    keys.forEach(function (k) {
      var v = by[k], gm = r2(v.amt - v.cogs); tq += v.qty; tc += v.cogs;
      b.row(itemName(k) || 'Not Specified', [r2(v.qty), r2(v.amt), pctOf(v.amt, total), v.qty ? r2(v.amt / v.qty) : null, r2(v.cogs), gm, pctOf(gm, v.amt)], {});
    });
    if (keys.length) b.row('TOTAL', [r2(tq), r2(total), total ? 100 : null, null, r2(tc), r2(total - tc), pctOf(total - tc, total)], { bold: true, total: true, grand: true });
    return res('Sales by Product/Service Summary', [{ label: '', type: 'label' }, { label: 'Quantity', type: 'num' }, { label: 'Amount', type: 'money' }, { label: '% of Sales', type: 'pct' }, { label: 'Avg Price', type: 'money' }, { label: 'COGS', type: 'money' }, { label: 'Gross Margin', type: 'money' }, { label: 'Gross Margin %', type: 'pct' }], b.rows, { basis: true });
  });
  reg('Sales by Product/Service Detail', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', ['name', 'Customer'], 'memo', 'qty', 'rate', 'amount', 'balance']);
    return res('Sales by Product/Service Detail', colsOf(cols), detail(cols, groupBy(saleLines(o), function (e) { return e.item; }, function (k) { return itemName(k) || 'Not Specified'; })), { basis: true });
  });
  reg('Income by Customer Summary', M(TXM, { method: true }), function (o) {
    var vals = {};
    posts(o, function (e) { var a = S.acct[e.acct]; return a && PL_TYPES.indexOf(a.type) >= 0 && (e.p.cust || (e.t.cust && SALES_ALL.indexOf(e.t.type) >= 0)); }).forEach(function (e) {
      var k = e.p.cust || e.t.cust, a = S.acct[e.acct], v = vals[k] = vals[k] || [0, 0, 0];
      if (a.type === 'Income' || a.type === 'Other Income') v[0] = r2(v[0] - e.amt); else v[1] = r2(v[1] + e.amt);
      v[2] = r2(v[0] - v[1]);
    });
    return res('Income by Customer Summary', [{ label: '', type: 'label' }, { label: 'Income', type: 'money' }, { label: 'Expenses', type: 'money' }, { label: 'Net Income', type: 'money' }], custTree(new Builder(), vals), { basis: true });
  });
  function addr(c) { return [c.street, c.city, [c.state, c.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '); }
  function custsSorted() { return S.customers.filter(function (c) { return c.active !== false; }).sort(function (a, b) { return byName(S.custName(a.id), S.custName(b.id)); }); }
  reg('Customer Contact List', LIST, function () {
    return listRes('Customer Contact List', [['Customer'], ['Phone Numbers'], ['Email'], ['Full Name'], ['Billing Address'], ['Shipping Address']], custsSorted().map(function (c) {
      return { v: [S.custName(c.id), c.phone ? 'Phone: ' + c.phone : '', c.email || '', [c.first, c.last].filter(Boolean).join(' '), addr(c), addr(c)], x: { go: ['customerdetail', { id: c.id }] } };
    }));
  });
  reg('Customer Phone List', LIST, function () {
    return listRes('Customer Phone List', [['Customer'], ['Phone Numbers']], custsSorted().map(function (c) { return { v: [S.custName(c.id), c.phone ? 'Phone: ' + c.phone : ''], x: { go: ['customerdetail', { id: c.id }] } }; }));
  });
  reg('Vendor Contact List', LIST, function () {
    return listRes('Vendor Contact List', [['Vendor'], ['Phone Numbers'], ['Email'], ['Full Name'], ['Address'], ['Account #']], S.vendors.filter(function (v) { return v.active !== false; }).sort(function (a, b) { return byName(a.name, b.name); }).map(function (v) {
      return { v: [v.name, v.phone ? 'Phone: ' + v.phone : '', v.email || '', v.company && v.company !== v.name ? v.company : '', addr(v), v.acctNo || ''], x: { go: ['vendordetail', { id: v.id }] } };
    }));
  });
  reg('Product/Service List', LIST, function () {
    return listRes('Product/Service List', [['Product/Service'], ['Type'], ['Description'], ['Price', 'money'], ['Cost', 'money'], ['Qty On Hand', 'num']], S.items.filter(function (i) { return i.active !== false; }).sort(function (a, b) { return byName(a.name, b.name); }).map(function (i) {
      return { v: [i.name, i.type, i.desc || '', i.price || 0, i.cost || 0, i.type === 'Inventory' ? (i.qty || 0) : ''] };
    }));
  });
  reg('Payment Method List', LIST, function () {
    return listRes('Payment Method List', [['Payment Method'], ['Credit Card']], U.METHODS.map(function (m) { return { v: [m, /Credit Card/.test(m) ? 'Yes' : 'No'] }; }));
  });
  reg('Deposit Detail', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'cust', 'vend', 'memo', 'amount']), items = [];
    S.txns.forEach(function (t) {
      if (t.hidden || !inRange(t, o)) return;
      var bank = t.account && S.acct[t.account] && S.acct[t.account].type === 'Bank';
      if (t.type === 'Deposit') {
        items.push({ t: t, amt: t.total, bank: t.account || 'a_chk' });
        (t.lines || []).forEach(function (l) { items.push({ t: t, l: l, amt: l.amount, memo: l.desc, bank: t.account || 'a_chk', cust: l.cust, rx: { indent: 1 }, nosum: true }); });
      } else if ((t.type === 'Payment' || t.type === 'Sales Receipt') && bank) items.push({ t: t, amt: t.total, bank: t.account });
    });
    return res('Deposit Detail', colsOf(cols), detail(cols, groupBy(sortE(items), function (e) { return e.bank; }, acctName)));
  });
  reg('Estimates by Customer', TXM, function (o) {
    var cols = dc(['date', 'num', ['status', 'Estimate status'], 'memo', 'amount']);
    return res('Estimates by Customer', colsOf(cols), detail(cols, groupBy(txIn(o, ['Estimate']), function (e) { return e.t.cust; }, S.custName)));
  });
  reg('Estimates & Progress Invoicing Summary by Customer', TXM, function (o) {
    var vals = {};
    txIn(o, ['Estimate']).forEach(function (e) {
      var t = e.t, v = vals[t.cust] = vals[t.cust] || [0, 0, 0], inv = /Closed|Converted/.test(t.status || '') ? t.total : 0;
      v[0] = r2(v[0] + t.total); v[1] = r2(v[1] + inv); v[2] = r2(v[0] - v[1]);
    });
    return res('Estimates & Progress Invoicing Summary by Customer', [{ label: '', type: 'label' }, { label: 'Estimate Total', type: 'money' }, { label: 'Invoiced Amount', type: 'money' }, { label: 'Open Balance', type: 'money' }], custTree(new Builder(), vals));
  });
  var TLC = ['date', 'type', 'num', 'posting', 'memo', 'account', 'amount'];
  reg('Transaction List by Customer', TXM, function (o) {
    var cols = dc(TLC);
    var items = sortE(S.txns.filter(function (t) { return !t.hidden && t.cust && inRange(t, o); }).map(function (t) { return { t: t }; }));
    return res('Transaction List by Customer', colsOf(cols), detail(cols, groupBy(items, function (e) { return e.t.cust; }, S.custName), { grand: false }));
  });
  reg('Transaction List by Vendor', TXM, function (o) {
    var cols = dc(TLC);
    var items = sortE(S.txns.filter(function (t) { return !t.hidden && t.payee && S.vend[t.payee] && inRange(t, o); }).map(function (t) { return { t: t }; }));
    return res('Transaction List by Vendor', colsOf(cols), detail(cols, groupBy(items, function (e) { return e.t.payee; }, vendName), { grand: false }));
  });
  reg('Transaction List by Tag Group', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'name', 'memo', 'account', 'amount']);
    var items = sortE(S.txns.filter(function (t) { return !t.hidden && isPosting(t) && inRange(t, o); }).map(function (t) { return { t: t }; }));
    return res('Transaction List by Tag Group', colsOf(cols), detail(cols, [{ label: 'Not tagged', items: items }], { grand: false }));
  });
  reg('Cashflow Payment Transactions', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'name', 'memo', 'account', 'amount']);
    return res('Cashflow Payment Transactions', colsOf(cols), flat(cols, txIn(o, ['Payment', 'Sales Receipt'])));
  });
  reg('Time Activities by Customer Detail', TXM, function (o) {
    var cols = dc([TC.adate, TC.emp, ['item'], 'memo', TC.rate, TC.dur, TC.bill, 'amount']);
    return res('Time Activities by Customer Detail', colsOf(cols), detail(cols, groupBy(timeItems(o), function (e) { return e.t.cust; }, function (k) { return S.custName(k) || 'Not Specified'; })));
  });

  /* ───── Inventory ───── */
  function invItems() { return S.items.filter(function (i) { return i.type === 'Inventory'; }).sort(function (a, b) { return byName(a.name, b.name); }); }
  function soldSince(id, from) {
    var q = 0;
    saleLines({ from: from }).forEach(function (e) { if (e.item === id) q += +e.qty || 0; });
    return q;
  }
  reg('Inventory Valuation Summary', ASOF, function (o) {
    var b = new Builder(), tq = 0, tv = 0;
    invItems().forEach(function (i) {
      var q = r2((i.qty || 0) + soldSince(i.id, U.addDays(o.asof, 1))), v = r2(q * (i.cost || 0));
      tq += q; tv += v;
      b.row(i.name, [i.sku || '', q, v, q ? r2(v / q) : null], {});
    });
    b.row('TOTAL', ['', r2(tq), r2(tv), null], { bold: true, total: true, grand: true });
    return res('Inventory Valuation Summary', [{ label: '', type: 'label' }, { label: 'SKU', type: 'text' }, { label: 'Qty', type: 'num' }, { label: 'Asset Value', type: 'money' }, { label: 'Calc. Avg', type: 'money' }], b.rows, { asof: true });
  });
  reg('Inventory Valuation Detail', TXM, function (o) {
    var cols = [{ label: 'Date', type: 'label' }, { label: 'Transaction type', type: 'text' }, { label: 'Num', type: 'text' }, { label: 'Name', type: 'text' }, { label: 'Qty', type: 'num' }, { label: 'Rate', type: 'money' }, { label: 'FIFO Cost', type: 'money' }, { label: 'Qty On Hand', type: 'num' }, { label: 'Asset Value', type: 'money' }];
    var b = new Builder();
    invItems().forEach(function (i) {
      var lines = saleLines(o).filter(function (e) { return e.item === i.id; });
      var q = r2((i.qty || 0) + soldSince(i.id, o.from || '1900-01-01')), cost = i.cost || 0;
      b.open(i.name, null, {});
      b.row('Beginning Balance', ['', '', '', '', '', '', q, r2(q * cost)], {});
      var tq = 0, tc = 0;
      lines.forEach(function (e) {
        q = r2(q - (+e.qty || 0)); tq -= +e.qty || 0; tc -= cost * (+e.qty || 0);
        b.row(U.fmtDate(e.t.date), [typeName(e.t), e.t.no || '', S.custName(e.cust), r2(-(+e.qty || 0)), cost, r2(-cost * (+e.qty || 0)), q, r2(q * cost)], { txn: e.t.id });
      });
      b.close('Total for ' + i.name, ['', '', '', r2(tq), '', r2(tc), q, r2(q * cost)], {});
    });
    return res('Inventory Valuation Detail', cols, b.rows);
  });
  function onPO(id) { var q = 0; S.txns.forEach(function (t) { if (t.type === 'Purchase Order' && t.status !== 'Closed') (t.lines || []).forEach(function (l) { if (l.item === id) q += +l.qty || 0; }); }); return q; }
  reg('Physical Inventory Worksheet', LIST, function () {
    return listRes('Physical Inventory Worksheet', [['Product/Service'], ['Description'], ['Qty On Hand', 'num'], ['Reorder Point', 'num'], ['Qty On PO', 'num'], ['Physical Count']], invItems().map(function (i) {
      return { v: [i.name, i.desc || '', i.qty || 0, i.reorder == null ? '' : i.reorder, onPO(i.id), '__________'] };
    }));
  });
  reg('Inventory Status', LIST, function () {
    return listRes('Inventory Status', [['Product/Service'], ['SKU'], ['Qty On Hand', 'num'], ['Reorder Point', 'num'], ['Qty On PO', 'num'], ['Qty On Sales Order', 'num'], ['Available', 'num'], ['Status']], invItems().map(function (i) {
      var q = i.qty || 0, low = i.reorder != null && q <= i.reorder;
      return { v: [i.name, i.sku || '', q, i.reorder == null ? '' : i.reorder, onPO(i.id), 0, q, q <= 0 ? 'Out of stock' : low ? 'Low stock' : 'In stock'] };
    }));
  });
  function openPOs(o) { return txIn(o, ['Purchase Order']).filter(function (e) { return e.t.status !== 'Closed'; }); }
  reg('Open Purchase Order List', TXM, function (o) {
    var cols = dc(['date', 'num', 'memo', 'amount', 'open']);
    cols[4].get = function (e) { return e.t.total; };
    return res('Open Purchase Order List', colsOf(cols), detail(cols, groupBy(openPOs(o), function (e) { return e.t.payee; }, vendName)));
  });
  reg('Open Purchase Order Detail', TXM, function (o) {
    var cols = dc(['date', 'num', 'memo', ['account', 'Account'], 'amount', 'open']), items = [];
    cols[3].get = function (e) { return acctName(e.l.acct); };
    cols[5].get = function (e) { return e.l.amount; };
    openPOs(o).forEach(function (e) { (e.t.lines || []).forEach(function (l) { items.push({ t: e.t, l: l, amt: l.amount }); }); });
    return res('Open Purchase Order Detail', colsOf(cols), detail(cols, groupBy(items, function (e) { return e.t.payee; }, vendName)));
  });

  /* ───── Sales tax ───── */
  function taxDocs(o) { return S.txns.filter(function (t) { return !t.hidden && SALE_T.indexOf(t.type) >= 0 && inRange(t, o); }); }
  reg('Sales Tax Liability Report', TXM, function (o) {
    var g = 0, tx = 0, tax = 0;
    taxDocs(o).forEach(function (t) { var sg = t.type === 'Credit Memo' || t.type === 'Refund' ? -1 : 1; g += sg * (t.subtotal - (t.discount || 0)); tx += sg * (t.taxableSubtotal || 0); tax += sg * (t.tax || 0); });
    var b = new Builder(), rate = (S.company.taxRates || [])[0] || { name: 'California (8%)' };
    b.open('Board of Equalization', null, {});
    b.row(rate.name, [r2(g), r2(g - tx), r2(tx), r2(tax)], {});
    b.close('Total for Board of Equalization', [r2(g), r2(g - tx), r2(tx), r2(tax)], {});
    b.row('TOTAL', [r2(g), r2(g - tx), r2(tx), r2(tax)], { bold: true, total: true, grand: true });
    return res('Sales Tax Liability Report', [{ label: '', type: 'label' }, { label: 'Gross Total Sales', type: 'money' }, { label: 'Non-Taxable Sales', type: 'money' }, { label: 'Taxable Sales', type: 'money' }, { label: 'Tax Amount', type: 'money' }], b.rows);
  });
  reg('Taxable Sales Summary', TXM, function (o) {
    var by = {};
    saleLines(o).forEach(function (e) { if (e.l.taxable) by[e.item] = r2((by[e.item] || 0) + e.amt); });
    var b = new Builder(), tot = 0;
    Object.keys(by).sort(function (a, c) { return byName(itemName(a), itemName(c)); }).forEach(function (k) { b.row(itemName(k) || 'Not Specified', [by[k]], {}); tot += by[k]; });
    b.row('TOTAL', [r2(tot)], { bold: true, total: true, grand: true });
    return res('Taxable Sales Summary', [{ label: '', type: 'label' }, { label: 'Taxable Amount', type: 'money' }], b.rows);
  });
  reg('Taxable Sales Detail', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'cust', 'item', 'memo', 'qty', 'rate', 'amount', 'balance']);
    return res('Taxable Sales Detail', colsOf(cols), flat(cols, saleLines(o).filter(function (e) { return e.l.taxable; })));
  });

  /* ───── Employees & time ───── */
  reg('Employee Contact List', LIST, function () {
    return listRes('Employee Contact List', [['Employee'], ['Phone Numbers'], ['Email'], ['Full Name'], ['Address']], (S.employees || []).map(function (e) {
      return { v: [e.name || [e.first, e.last].join(' '), e.phone || '', e.email || '', [e.first, e.last].filter(Boolean).join(' ') || e.name || '', e.address || addr(e)] };
    }));
  });
  reg('Recent/Edited Time Activities', TXM, function (o) {
    var cols = dc([TC.adate, TC.emp, 'cust', ['item'], 'memo', TC.dur, TC.bill, 'amount']);
    var items = timeItems(o).sort(function (a, b) { return (b.t.created || 0) - (a.t.created || 0) || (a.t.date < b.t.date ? 1 : -1); });
    return res('Recent/Edited Time Activities', colsOf(cols), flat(cols, items));
  });
  reg('Time Activities by Employee Detail', TXM, function (o) {
    var cols = dc([TC.adate, 'cust', ['item'], 'memo', TC.rate, TC.dur, TC.bill, 'amount']);
    return res('Time Activities by Employee Detail', colsOf(cols), detail(cols, groupBy(timeItems(o), function (e) { return e.emp; })));
  });
  reg('Timesheet Detail by Employee', TXM, function (o) {
    var cols = dc([TC.adate, 'cust', ['item', 'Service'], 'memo', TC.dur]);
    return res('Timesheet Detail by Employee', colsOf(cols), detail(cols, groupBy(timeItems(o), function (e) { return e.emp; })));
  });
  reg('Time Summary by Pay Type', TXM, function (o) {
    var by = {};
    timeItems(o).forEach(function (e) { var v = by[e.emp] = by[e.emp] || [0, 0]; v[0] += e.hours; v[1] += e.hours; });
    var b = new Builder(), tot = [0, 0];
    Object.keys(by).sort(byName).forEach(function (k) { b.row(k, by[k], {}); tot[0] += by[k][0]; tot[1] += by[k][1]; });
    b.row('TOTAL', tot, { bold: true, total: true, grand: true });
    return res('Time Summary by Pay Type', [{ label: '', type: 'label' }, { label: 'Regular Pay', type: 'hrs' }, { label: 'Total', type: 'hrs' }], b.rows);
  });

  /* ───── For my accountant ───── */
  reg('Account List', LIST, function () {
    return listRes('Account List', [['Account'], ['Type'], ['Detail type'], ['Description'], ['Balance', 'money']], acache().ord.filter(function (a) { return a.active !== false; }).map(function (a) {
      return { v: [S.fullName(a.id), a.type, a.detail || '', a.desc || '', S.isBS(a) ? L.balance(a.id, { children: false }) : ''], x: { acct: a.id, own: true, quick: true } };
    }));
  });
  reg('Recent Automatic Transactions', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'name', 'memo', 'amount']);
    return res('Recent Automatic Transactions', colsOf(cols), flat(cols, sortE(S.txns.filter(function (t) { return !t.hidden && (t.auto || t.recurring || t.fromRecurring || t.fromRule) && inRange(t, o); }).map(function (t) { return { t: t }; }))));
  });
  reg('Invalid Journal Transactions', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'name', 'memo', 'debit', 'credit']);
    var bad = S.txns.filter(function (t) {
      if (t.type !== 'Journal Entry' || !inRange(t, o)) return false;
      var d = 0, c = 0; (t.lines || []).forEach(function (l) { d += +l.debit || 0; c += +l.credit || 0; });
      return Math.abs(d - c) > 0.004;
    }).map(function (t) { var d = 0, c = 0; t.lines.forEach(function (l) { d += +l.debit || 0; c += +l.credit || 0; }); return { t: t, dr: r2(d), cr: r2(c) }; });
    return res('Invalid Journal Transactions', colsOf(cols), flat(cols, bad));
  });
  CD.debit[2] = function (e) { return e.dr != null ? e.dr : e.amt > 0.0001 ? e.amt : ''; };
  CD.credit[2] = function (e) { return e.cr != null ? e.cr : e.amt < -0.0001 ? -e.amt : ''; };
  function beginMap(o) {
    if (!o.from) return {};
    var before = U.addDays(o.from, -1), bm = sums({ to: before, method: o.method }), fy = fyStart(o.from);
    var pl = sums({ from: fy, to: before, method: o.method }), out = {};
    S.accounts.forEach(function (a) { out[a.id] = S.isBS(a) ? (bm[a.id] || 0) : (pl[a.id] || 0); });
    var re = reAcct(); out[re] = r2((out[re] || 0) + netIncome(sums({ to: U.addDays(fy, -1), method: o.method })));
    return out;
  }
  reg('General Ledger', M(TXM, { method: true }), function (o) {
    var cols = dc(DET), b = new Builder();
    acctTree(b, acache().ord.filter(function (a) { return !a.parent; }), entriesBy(o), cols, o, beginMap(o));
    return res('General Ledger', colsOf(cols), b.rows, { basis: true });
  });
  function collapsedPosts(o, keep) {
    var out = [], seen = {};
    sortE(posts(o, keep)).forEach(function (e) {
      if (!e.t.hidden) { out.push(e); return; }
      var s = seen[e.t.id];
      if (!s) { s = seen[e.t.id] = { t: e.t, dr: 0, cr: 0, date: e.t.date }; out.push(s); }
      if (e.amt > 0) s.dr = r2(s.dr + e.amt); else s.cr = r2(s.cr - e.amt);
    });
    return out;
  }
  reg('General Ledger List', M(TXM, { method: true }), function (o) {
    var cols = dc(['date', 'type', 'num', 'name', 'account', 'memo', 'debit', 'credit']);
    return res('General Ledger List', colsOf(cols), flat(cols, collapsedPosts(o)), { basis: true });
  });
  reg('Journal', M(TXM, { method: true }), function (o) {
    var cols = dc(['date', 'type', 'num', 'name', 'memo', 'account', 'debit', 'credit']), b = new Builder(), gd = 0, gc = 0;
    var list = collapsedPosts(o), byT = [], cur = null;
    list.forEach(function (e) { if (!cur || cur.t !== e.t) { cur = { t: e.t, es: [] }; byT.push(cur); } cur.es.push(e); });
    byT.forEach(function (g) {
      var d = 0, c = 0;
      g.es.forEach(function (e, i) {
        var v = cellVals(cols, e);
        if (i > 0) { v[0] = ''; v[1] = ''; v[2] = ''; v[3] = ''; }
        if (typeof v[6] === 'number') d += v[6]; if (typeof v[7] === 'number') c += v[7];
        b.row(v[0], v.slice(1), rowX(e));
      });
      gd += d; gc += c;
      b.row('', ['', '', '', '', '', r2(d), r2(c)], { total: true, sub: true });
    });
    if (byT.length) b.row('TOTAL', ['', '', '', '', '', r2(gd), r2(gc)], { bold: true, total: true, grand: true });
    return res('Journal', colsOf(cols), b.rows, { basis: true });
  });
  reg('Recurring Template List', LIST, function () {
    var cols = [{ key: 'n', label: 'Template Name', type: 'text', get: function (e) { return e.r.name; } }, { key: 'ty', label: 'Type', type: 'text', get: function (e) { return e.r.type; } },
      { key: 'iv', label: 'Interval', type: 'text', get: function (e) { return e.r.interval || ''; } }, { key: 'pd', label: 'Previous Date', type: 'date', get: function (e) { return U.fmtDate(e.r.prev); } },
      { key: 'nd', label: 'Next Date', type: 'date', get: function (e) { return U.fmtDate(e.r.next); } }, { key: 'nm', label: 'Customer/Vendor', type: 'text', get: function (e) { return e.r.payee || ''; } },
      { key: 'am', label: 'Amount', type: 'money', get: function (e) { return e.r.amount || 0; }, sum: true }];
    var items = (S.recurring || []).map(function (r) { return { r: r }; });
    var groups = groupBy(items, function (e) { return e.r.txnType || 'Scheduled'; });
    return res('Recurring Template List', colsOf(cols), detail(cols, groups));
  });
  reg('Recent Transactions', M(TXM, { period: 'last-30' }), function (o) {
    var cols = dc(['date', 'num', 'posting', 'name', 'memo', 'account', 'split', 'amount']);
    var items = S.txns.filter(function (t) { return !t.hidden && inRange(t, o); }).map(function (t) { return { t: t, acct: mainAcct(t) || null }; });
    items.sort(function (a, b) { return a.t.date < b.t.date ? 1 : a.t.date > b.t.date ? -1 : 0; });
    items.forEach(function (e) { if (!e.acct) delete e.acct; });
    return res('Recent Transactions', colsOf(cols), detail(cols, groupBy(items, function (e) { return typeName(e.t); }), { grand: false }));
  });
  reg('Reconciliation Reports', LIST, function () {
    var recs = S.reconciliations || S.reconciled || [];
    return listRes('Reconciliation Reports', [['Account'], ['Statement ending date', 'date'], ['Reconciled on', 'date'], ['Ending balance', 'money'], ['Status']], S.accountsBy(['Bank', 'Credit Card']).map(function (a) {
      var r = (Array.isArray(recs) ? recs : []).filter(function (x) { return x && (x.acct === a.id || x.account === a.id); }).slice(-1)[0];
      return { v: [S.fullName(a.id), r ? U.fmtDate(r.endDate || r.statementDate || r.date) : '', r ? U.fmtDate(r.date || r.reconciledOn) : '', r ? (r.ending != null ? r.ending : r.endingBalance) : L.balance(a.id), r ? 'Reconciled' : 'Never reconciled'], x: { acct: a.id, quick: true } };
    }));
  });
  function tbMap(o) {
    var to = o.to || o.today, from = o.from || fyStart(to);
    var bs = sums({ to: to, method: o.method }), pl = sums({ from: from, to: to, method: o.method }), re = reAcct();
    var out = {};
    S.accounts.forEach(function (a) { out[a.id] = S.isBS(a) ? (bs[a.id] || 0) : (pl[a.id] || 0); });
    out[re] = r2((out[re] || 0) + netIncome(sums({ to: U.addDays(from, -1), method: o.method })));
    return out;
  }
  function drcr(a, natv) { var raw = S.isDebit(a) ? natv : -natv; raw = r2(raw); return raw > 0 ? [raw, ''] : raw < 0 ? ['', -raw] : ['', '']; }
  reg('Trial Balance', M(TXM, { method: true }), function (o) {
    var m = tbMap(o), b = new Builder(), td = 0, tc = 0;
    acache().ord.forEach(function (a) {
      var v = drcr(a, m[a.id] || 0); if (v[0] === '' && v[1] === '' && !o.allRows) return;
      td += +v[0] || 0; tc += +v[1] || 0;
      b.row(S.fullName(a.id), v, { acct: a.id, own: true });
    });
    b.row('TOTAL', [r2(td), r2(tc)], { bold: true, total: true, grand: true });
    return res('Trial Balance', [{ label: '', type: 'label' }, { label: 'Debit', type: 'money' }, { label: 'Credit', type: 'money' }], b.rows, { basis: true });
  });
  reg('Adjusted Trial Balance', M(TXM, { method: true }), function (o) {
    var m = tbMap(o), adj = sums({ from: o.from, to: o.to, method: o.method }, function (e) { return !!e.t.adjusting; });
    var b = new Builder(), t = [0, 0, 0, 0, 0, 0];
    acache().ord.forEach(function (a) {
      var tot = m[a.id] || 0, ad = adj[a.id] || 0, un = drcr(a, tot - ad), aj = drcr(a, ad), fn = drcr(a, tot);
      var v = un.concat(aj, fn);
      if (v.every(function (x) { return x === ''; }) && !o.allRows) return;
      v.forEach(function (x, i) { t[i] += +x || 0; });
      b.row(S.fullName(a.id), v, { acct: a.id, own: true });
    });
    b.row('TOTAL', t.map(r2), { bold: true, total: true, grand: true });
    return res('Adjusted Trial Balance', [{ label: '', type: 'label' }, { label: 'Unadjusted Debit', type: 'money' }, { label: 'Unadjusted Credit', type: 'money' }, { label: 'Adjustments Debit', type: 'money' }, { label: 'Adjustments Credit', type: 'money' }, { label: 'Adjusted Debit', type: 'money' }, { label: 'Adjusted Credit', type: 'money' }], b.rows, { basis: true });
  });
  function acctSet(id, own) { var ids = {}; ids[id] = 1; if (!own) (function add(x) { kids(x).forEach(function (k) { ids[k.id] = 1; add(k.id); }); })(id); return ids; }
  reg('Transaction Detail by Account', M(TXM, { method: true }), function (o) {
    var cols = dc(DET), b = new Builder(), set = o.acct && S.acct[o.acct] ? acctSet(o.acct, o.own === true || o.own === '1') : null;
    var by = entriesBy(o, function (e) { return (!set || set[e.acct]) && (!o.cust || e.p.cust === o.cust || e.t.cust === o.cust) && (!o.vend || vendKey(e) === o.vend) && (!o.item || e.p.item === o.item); });
    var roots = set ? [S.acct[o.acct]] : acache().ord.filter(function (a) { return !a.parent; });
    var t = acctTree(b, roots, by, cols, o);
    if (!set && b.rows.length) b.row('TOTAL', amountVals(cols, t), { bold: true, total: true, grand: true });
    return res('Transaction Detail by Account', colsOf(cols), b.rows, { basis: true });
  });
  reg('Transaction List by Date', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'posting', 'name', 'memo', 'account', 'split', 'amount']);
    return res(o.title || 'Transaction List by Date', colsOf(cols), flat(cols, txnItems(o), { grand: false }));
  });
  function txnItems(o) {
    return sortE(S.txns.filter(function (t) { return inRange(t, o); }).map(function (t) {
      var a = mainAcct(t), e = { t: t };
      if (a) e.acct = a;
      if (t.hidden) { var d = 0; (t.lines || []).forEach(function (l) { d += +l.debit || 0; }); e.amt = r2(d); }
      return e;
    }));
  }
  reg('Transaction List with Splits', TXM, function (o) {
    var cols = dc(['date', 'type', 'num', 'name', 'memo', 'account', 'amount']), b = new Builder();
    txnItems(o).forEach(function (e) {
      var v = cellVals(cols, e);
      b.row(v[0], v.slice(1), ext(rowX(e), { bold: true }));
      if (e.t.hidden) return;
      var main = mainAcct(e.t);
      L.postings(e.t).forEach(function (p) {
        if (p.acct === main) return;
        b.row('', ['', '', '', p.desc || '', acctName(p.acct), r2(p.amt)], { indent: 1, txn: e.t.id });
      });
    });
    return res('Transaction List with Splits', colsOf(cols), b.rows);
  });
  reg('Account QuickReport', M(TXM, { method: true, period: 'last-3-months', quick: true }), function (o) {
    var id = o.acct && S.acct[o.acct] ? o.acct : 'a_chk', a = S.acct[id];
    var cols = dc(DET), b = new Builder(), set = acctSet(id, o.own === true || o.own === '1');
    var bm = beginMap(o);
    var begin = {}; Object.keys(set).forEach(function (k) { begin[k] = bm[k] || 0; });
    acctTree(b, [a], entriesBy(o, function (e) { return !!set[e.acct]; }), cols, o, begin);
    return res('Account QuickReport', colsOf(cols), b.rows, { basis: true, subtitle: S.fullName(id) });
  });

  /* ───── Budgets ───── */
  R.budgets = [];
  function budgetMap(bud, from, to) {
    var m = {};
    if (!bud) return m;
    Object.keys(bud.data || {}).forEach(function (id) {
      var arr = bud.data[id] || [];
      for (var i = 0; i < 12; i++) {
        var ms = U.iso(new Date(bud.year, i, 1)), me = U.iso(new Date(bud.year, i + 1, 0));
        if (from && me < from) continue; if (to && ms > to) continue;
        m[id] = r2((m[id] || 0) + (+arr[i] || 0));
      }
    });
    return m;
  }
  R.budgetMap = budgetMap;
  reg('Budget vs. Actuals', M(PLM, { cols: null, compare: false }), function (o) {
    var bud = R.budgets.filter(function (x) { return x.id === o.budget; })[0] || R.budgets[0];
    var specs = [{ label: 'Actual', from: o.from, to: o.to }, { label: 'Budget', map: budgetMap(bud, o.from, o.to), nodrill: true },
      { label: 'over Budget', calc: function (b) { return b[0] == null || b[1] == null ? null : r2(b[0] - b[1]); } },
      { label: '% of Budget', type: 'pct', calc: function (b) { return pctOf(b[0], b[1]); } }];
    var cols = colsFrom(specs); cols[2].calc = true;
    return res('Budget vs. Actuals', cols, buildPL(o, specs), { basis: true, subtitle: bud ? bud.name : 'No budget' });
  });

  /* Anything the list names that is not built above opens as a transaction listing. */
  R.generic = function (name, opts) {
    var o = N(opts, 'this-year-to-date'); o.title = name;
    var r = QB.reports['Transaction List by Date'](o);
    r.title = name; r.generic = true;
    return r;
  };
  R.run = function (name, opts) {
    var fn = QB.reports[name];
    try { return fn ? fn(opts) : R.generic(name, opts); }
    catch (err) { if (typeof console !== 'undefined') console.error(err); var g = R.generic(name, opts); g.error = err.message; return g; }
  };

  /* ══════════════════ formatting & charts ══════════════════ */
  function czDefaults() { return { neg: '-100', red: false, k: false, nocents: false, rows: 'active', company: true, title: true, period: true, date: true, time: true, basis: true }; }
  function fmtVal(v, type, cz, sign) {
    if (v == null || v === '') return '';
    if (typeof v !== 'number') return U.esc(v);
    if (type === 'pct') return (Math.round(v * 100) / 100).toFixed(2) + '%';
    if (type === 'hrs') return hrs(v);
    if (type === 'num') { var nn = Math.round(v * 100) / 100; return String(nn).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    cz = cz || czDefaults();
    var n = cz.k ? v / 1000 : v, dec = cz.nocents ? 0 : 2;
    var neg = n < 0 && Math.abs(n) >= (dec ? 0.005 : 0.5);
    var s = Math.abs(n).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (cz.k ? 'K' : '');
    if (sign) s = '$' + s;
    if (neg) s = cz.neg === '(100)' ? '(' + s + ')' : cz.neg === '100-' ? s + '-' : '-' + s;
    return neg && cz.red ? '<span class="qbr-neg">' + s + '</span>' : s;
  }
  function stampNow() {
    var d = new Date(), h = d.getHours(), off = -d.getTimezoneOffset(), ao = Math.abs(off);
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      date: days[d.getDay()] + ', ' + U.MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(),
      time: ((h % 12) || 12) + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM') + ' GMT' + (off < 0 ? '-' : '+') + String(Math.floor(ao / 60)).padStart(2, '0') + ':' + String(ao % 60).padStart(2, '0')
    };
  }
  var PALETTE = ['#2ca01c', '#0077c5', '#00a6a4', '#ff8000', '#8d63c9', '#d52b1e', '#8d9096'];
  function niceMax(v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  function barsSvg(series, keys) {
    var W = 320, H = 150, pl = 40, pb = 20, pt = 8, max = 0;
    series.forEach(function (s) { keys.forEach(function (k) { max = Math.max(max, Math.abs(s[k[0]] || 0)); }); });
    max = niceMax(max);
    var bw = (W - pl - 6) / Math.max(1, series.length), g = '';
    for (var i = 0; i <= 2; i++) { var y = pt + (H - pt - pb) * i / 2; g += '<line x1="' + pl + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="#e3e5e8"/><text x="' + (pl - 4) + '" y="' + (y + 3) + '" text-anchor="end">' + U.money0(max * (1 - i / 2)) + '</text>'; }
    series.forEach(function (s, i) {
      var x0 = pl + i * bw + bw * 0.15, w = bw * 0.7 / keys.length;
      keys.forEach(function (k, j) {
        var v = Math.max(0, s[k[0]] || 0), h = (H - pt - pb) * v / max;
        g += '<rect x="' + (x0 + j * w).toFixed(1) + '" y="' + (H - pb - h).toFixed(1) + '" width="' + Math.max(1, w - 1).toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + PALETTE[j] + '"><title>' + U.esc(k[1] + ' ' + s.label + ': ' + U.money(s[k[0]] || 0)) + '</title></rect>';
      });
      g += '<text x="' + (pl + i * bw + bw / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + U.esc(s.label) + '</text>';
    });
    return '<svg class="qbr-chart" viewBox="0 0 ' + W + ' ' + H + '">' + g + '</svg><div class="qbr-legend">' + keys.map(function (k, j) { return '<span><i style="background:' + PALETTE[j] + '"></i>' + U.esc(k[1]) + '</span>'; }).join('') + '</div>';
  }
  function donutSvg(data) {
    var tot = data.reduce(function (s, x) { return s + Math.max(0, x.value); }, 0), a0 = -Math.PI / 2, g = '';
    if (tot <= 0) return '<div class="qbr-nochart">No expenses for this period</div>';
    data.forEach(function (x, i) {
      var a1 = a0 + 2 * Math.PI * Math.max(0, x.value) / tot, large = a1 - a0 > Math.PI ? 1 : 0;
      if (a1 - a0 >= 2 * Math.PI - 0.0001) a1 = a0 + 2 * Math.PI - 0.0001;
      var p = function (a, r) { return (60 + r * Math.cos(a)).toFixed(2) + ' ' + (60 + r * Math.sin(a)).toFixed(2); };
      g += '<path d="M' + p(a0, 52) + ' A52 52 0 ' + large + ' 1 ' + p(a1, 52) + ' L' + p(a1, 32) + ' A32 32 0 ' + large + ' 0 ' + p(a0, 32) + 'Z" fill="' + PALETTE[i % PALETTE.length] + '"><title>' + U.esc(x.label + ': ' + U.money(x.value)) + '</title></path>';
      a0 = a1;
    });
    return '<div class="qbr-donut"><svg viewBox="0 0 120 120">' + g + '<text x="60" y="58" text-anchor="middle" class="qbr-d-t">' + U.money0(tot) + '</text><text x="60" y="72" text-anchor="middle" class="qbr-d-s">Total</text></svg><ul>' +
      data.map(function (x, i) { return '<li><i style="background:' + PALETTE[i % PALETTE.length] + '"></i><span>' + U.esc(x.label) + '</span><b>' + U.money(x.value) + '</b></li>'; }).join('') + '</ul></div>';
  }
  function sparkSvg(vals) {
    var n = vals.length; if (n < 2) return '';
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), sp = hi - lo || 1;
    var pts = vals.map(function (v, i) { return (i * 100 / (n - 1)).toFixed(1) + ',' + (28 - (v - lo) / sp * 24).toFixed(1); }).join(' ');
    return '<svg class="qbr-spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="' + pts + '" fill="none" stroke="#2ca01c" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';
  }

  /* ══════════════════ report viewer ══════════════════ */
  var VS = {};
  function vstate(key) { return VS[key] = VS[key] || { collapsed: {}, sort: null, compact: false, zoom: 100, cz: czDefaults(), note: '', noteOpen: false, insights: false, bar: true }; }
  R.custom = [];
  var PERIODS = [['custom', 'Custom']].concat(U.RANGES);
  var COLS_L = { total: 'Total', days: 'Days', months: 'Months', quarters: 'Quarters', years: 'Years', customers: 'Customers', vendors: 'Vendors', products: 'Products/Services' };
  function viewOpts(p, st) {
    var meta = META[p.name] || {};
    var period = meta.period === 'none' && !p.period ? 'none' : p.period || (p.from || p.to ? 'custom' : meta.period || 'this-year-to-date');
    var from = '', to = '';
    if (period === 'custom') { from = p.from || ''; to = p.to || ''; }
    else if (period !== 'none' && period !== 'all') { var r = U.range(period); from = r[0]; to = r[1]; }
    if (meta.aging || from <= '1900-01-01') from = '';
    if (to >= '2999-12-31') to = '';
    return {
      name: p.name, period: period, from: from, to: to,
      method: p.method || String(S.settings && S.settings.method || 'Accrual').toLowerCase(),
      cols: p.cols || meta.defCols || 'total',
      compare: p.compare === 'none' ? '' : p.compare || meta.defCompare || '',
      acct: p.acct, own: p.own, cust: p.cust, vend: p.vend, item: p.item, budget: p.budget,
      allRows: st.cz.rows === 'all'
    };
  }
  function setHash(params) { try { history.replaceState(null, '', '#/report' + U.qs(params)); } catch (e) { /* file:// or sandboxed */ } }

  /* Rows that are hidden under collapsed groups are skipped; data rows sort within their group. */
  function sortedRows(rows, st) {
    if (!st.sort) return rows;
    var out = [], run = [], key = null, j = st.sort.col, dir = st.sort.dir === 'desc' ? -1 : 1;
    function flush() {
      run.sort(function (a, b) {
        var x = a.values[j], y = b.values[j];
        if (typeof x === 'number' || typeof y === 'number') return ((+x || 0) - (+y || 0)) * dir;
        if (j < 0) { x = a.label; y = b.label; }
        return String(x == null ? '' : x).localeCompare(String(y == null ? '' : y)) * dir;
      });
      out = out.concat(run); run = [];
    }
    rows.forEach(function (r) {
      var plain = !r.header && !r.total && !r.net && !r.sys && r.label !== 'Beginning Balance';
      var k = r.path.join('|');
      if (plain && (key === null || k === key)) { run.push(r); key = k; return; }
      flush(); key = null;
      if (plain) { run.push(r); key = k; } else out.push(r);
    });
    flush();
    return out;
  }
  function rowsHtml(res2, st, o) {
    var cols = res2.columns, rows = sortedRows(res2.rows, st), h = '', multi = cols.length > 2;
    rows.forEach(function (r) {
      for (var q = 0; q < r.path.length; q++) if (st.collapsed[r.path[q]]) return;
      var i = res2.rows.indexOf(r);
      var closed = r.header && st.collapsed[r.gid];
      var vals = closed && r.collapsedValues ? r.collapsedValues : (r.values || []);
      var rich = r.header || r.total || r.net;
      var cls = ['qbr-r'];
      if (r.header) cls.push('is-head'); if (r.section) cls.push('is-sec'); if (r.total) cls.push('is-total');
      if (r.net) cls.push('is-net'); if (r.bold) cls.push('is-bold'); if (r.grand) cls.push('is-grand'); if (r.final) cls.push('is-final');
      if (r.sub) cls.push('is-sub'); if (r.sys) cls.push('is-sys'); if (r.txn) cls.push('is-txn'); if (closed) cls.push('is-closed');
      var span = 1;
      if ((rich || !vals.length) && r.label) {
        while (span <= cols.length - 1 && (vals[span - 1] == null || vals[span - 1] === '') && cols[span].type !== 'money') span++;
        if (span > cols.length) span = cols.length;
      }
      var pad = 10 + ((r.depth || 0) + (r.indent || 0)) * 16 + (!r.header && (r.path.length || r.total) ? 20 : 0);
      var lab = U.esc(r.label);
      if (r.go) lab = '<a href="#/' + r.go[0] + U.qs(r.go[1]) + '" class="qbr-lnk">' + lab + '</a>';
      else if (r.link) lab = '<button type="button" class="qbr-lnk" data-r-link="' + i + '">' + lab + '</button>';
      var chev = r.header ? '<button type="button" class="qbr-chev" data-r-tog="' + U.esc(r.gid) + '" aria-label="' + (closed ? 'Expand' : 'Collapse') + '">' + UI.icon(closed ? 'caretRight' : 'caretDown') + '</button>' : '';
      h += '<tr class="' + cls.join(' ') + '"' + (r.txn ? ' data-r-txn="' + U.esc(r.txn) + '"' : '') + '><td class="qbr-c0" colspan="' + span + '" style="padding-left:' + pad + 'px">' + chev + '<span class="qbr-lab">' + lab + '</span></td>';
      for (var j = span; j < cols.length; j++) {
        var c = cols[j], v = vals[j - 1], t = c.type;
        var txt = (multi && !rich && typeof v === 'number' && Math.abs(v) < 0.005 && t === 'money' && !r.sys) ? '' : fmtVal(v, t, st.cz, rich && t === 'money');
        var right = t === 'money' || t === 'num' || t === 'pct' || t === 'hrs';
        if (txt && t === 'money' && typeof v === 'number' && (r.acct || r.quick) && !c.calc && !c.nodrill && !c.noLink) txt = '<button type="button" class="qbr-amt" data-r-drill="' + i + ':' + j + '">' + txt + '</button>';
        h += '<td class="' + (right ? 'ta-r' : '') + '">' + txt + '</td>';
      }
      h += '</tr>';
    });
    if (!h) h = '<tr class="qbr-r qbr-none"><td colspan="' + cols.length + '">No data to display for the selected report period.</td></tr>';
    return h;
  }
  function headText(res2, o, meta) {
    if (meta.period === 'none' && o.period === 'none') return '';
    if (res2.asof || meta.asof) return rangeText('', o.to || U.today(), true);
    return rangeText(o.from, o.to);
  }
  function paperHtml(res2, o, st, meta, title) {
    var cz = st.cz, cols = res2.columns, ts = stampNow();
    var width = Math.max(660, Math.min(1400, 280 + (cols.length - 1) * (cols.length > 6 ? 120 : 140)));
    var sortIc = function (j) {
      var on = st.sort && st.sort.col === j - 1;
      return '<button type="button" class="qbr-sort' + (on ? ' on' : '') + '" data-r-sort="' + (j - 1) + '" aria-label="Sort">' + UI.icon(on ? (st.sort.dir === 'asc' ? 'arrowUp' : 'arrowDown') : 'arrowDown') + '</button>';
    };
    var head = '<tr>' + cols.map(function (c, j) {
      var right = c.type === 'money' || c.type === 'num' || c.type === 'pct' || c.type === 'hrs';
      return '<th class="' + (j ? (right ? 'ta-r' : '') : 'qbr-c0') + '">' + (j && right ? sortIc(j) : '') + '<span>' + U.esc(c.label) + '</span>' + (j && !right ? sortIc(j) : '') + '</th>';
    }).join('') + '</tr>';
    var charts = res2.charts ? '<div class="qbr-charts">' + res2.charts.map(function (c) {
      return '<div class="qbr-chartbox"><h4>' + U.esc(c.title) + '</h4>' + (c.kind === 'donut' ? donutSvg(c.data) : barsSvg(c.series, c.keys)) + '</div>';
    }).join('') + '</div>' : '';
    var basis = res2.basis && cz.basis ? (o.method === 'cash' ? 'Cash basis' : 'Accrual basis') : '';
    var foot = [st.note ? '' : '<button type="button" class="qbr-lnk" data-r-note>Add note</button>', basis, (cz.date ? ts.date : '') + (cz.time ? ' ' + ts.time : '')].filter(Boolean).join(' <span class="qbr-sep">|</span> ');
    var ins = st.insights ? insightsHtml(o) : '';
    return '<div class="qbr-pbar">' +
      '<div class="qbr-zoom"><button type="button" class="qbr-compact' + (st.compact ? ' on' : '') + '" data-r-compact>Compact</button><span class="qbr-sep">|</span>' +
      '<span class="qbr-zsel"><select data-r-zoom aria-label="Zoom">' + [50, 75, 90, 100, 110, 125, 150].map(function (z) { return '<option value="' + z + '"' + (z === st.zoom ? ' selected' : '') + '>' + z + '%</option>'; }).join('') + '</select>' + UI.icon('caretDown') + '</span></div>' +
      '<span class="qb-grow"></span>' +
      '<button type="button" class="qbr-ib" data-r-tool="refresh" title="Refresh">' + UI.icon('refresh') + '</button>' +
      '<button type="button" class="qbr-ib" data-r-tool="email" title="Email">' + UI.icon('mail') + '</button>' +
      '<button type="button" class="qbr-ib" data-r-tool="print" title="Print">' + UI.icon('print') + '</button>' +
      '<button type="button" class="qbr-ib" data-r-tool="export" title="Export">' + UI.icon('export') + '</button>' +
      '<button type="button" class="qbr-ib" data-r-tool="more" title="More">' + UI.icon('kebab') + '</button></div>' +
      '<div class="qbr-pbar2"><button type="button" class="qbr-insbtn' + (st.insights ? ' on' : '') + '" data-r-ins>' + UI.icon('sparkle') + '<span>3 Insights</span></button>' +
      '<button type="button" class="qbr-ask qbr-ask-sm" data-r-ask>' + UI.icon('sparkle') + '<span>Ask a question</span><em>BETA</em></button></div>' + ins +
      '<div class="qbr-doc' + (st.compact ? ' is-compact' : '') + '" style="zoom:' + (st.zoom / 100) + '">' +
      '<div class="qbr-hdr">' + (cz.company ? '<div class="qbr-co">' + U.esc(S.company.name) + '</div>' : '') +
      (cz.title ? '<div class="qbr-ti">' + U.esc(title) + '</div>' : '') + (res2.subtitle ? '<div class="qbr-sub">' + U.esc(res2.subtitle) + '</div>' : '') +
      (cz.period ? '<div class="qbr-dr">' + U.esc(headText(res2, o, META[o.name] || {})) + '</div>' : '') + '</div>' + charts +
      '<div class="qbr-tblwrap"><table class="qbr-tbl" style="min-width:' + Math.min(width, 1400) + 'px"><thead>' + head + '</thead><tbody>' + rowsHtml(res2, st, o) + '</tbody></table></div>' +
      (st.note || st.noteOpen ? '<div class="qbr-note">' + (st.noteOpen ? '<textarea class="qb-input" data-r-notetext rows="2" placeholder="Add a note to this report">' + U.esc(st.note) + '</textarea>' : '<div class="qbr-note-t" data-r-note>' + U.esc(st.note) + '</div>') + '</div>' : '') +
      '<div class="qbr-foot">' + foot + '</div></div>';
  }

  /* Three computed insights for the period. */
  function insights(o) {
    var to = o.to || U.today(), from = o.from || fyStart(to), out = [];
    var cur = sums({ from: from, to: to, method: o.method }), pr = prevRange(from, to, 'pp'), prev = sums({ from: pr[0], to: pr[1], method: o.method });
    var inc = typeSum(T.inc, cur) + typeSum(T.oi, cur), ni = netIncome(cur), niP = netIncome(prev);
    if (/receivable|Collections|Open Invoices|Customer Balance/i.test(o.name)) {
      var od = arOpen(to).filter(function (t) { return t.type === 'Invoice' && pastDue(t, to) > 0; });
      out.push({ t: 'Overdue invoices', x: od.length + ' invoice' + (od.length === 1 ? ' is' : 's are') + ' past due, totaling ' + U.money(od.reduce(function (s, t) { return s + L.openBalance(t); }, 0)) + '.' });
    }
    if (/payable|Unpaid Bills|Vendor Balance/i.test(o.name)) {
      var ob = apOpen(to).filter(function (t) { return t.type === 'Bill' && pastDue(t, to) > 0; });
      out.push({ t: 'Overdue bills', x: ob.length + ' bill' + (ob.length === 1 ? ' is' : 's are') + ' past due, totaling ' + U.money(ob.reduce(function (s, t) { return s + L.openBalance(t); }, 0)) + '.' });
    }
    out.push({ t: 'Net income', x: 'Net income for ' + rangeText(from, to) + ' is ' + U.money(ni) + (inc ? ', ' + Math.round(ni / inc * 100) + '% of total income' : '') + '. ' + (Math.abs(niP) > 0.004 ? (ni >= niP ? 'Up ' : 'Down ') + Math.abs(Math.round((ni - niP) / Math.abs(niP) * 100)) + '% from the previous period.' : 'There was no net income in the previous period to compare.') });
    var leaf = acache().ord.filter(function (a) { return EXP_T.indexOf(a.type) >= 0; }).map(function (a) { return { a: a, v: r2(cur[a.id] || 0) }; }).sort(function (a, b) { return b.v - a.v; })[0];
    var texp = typeSum(T.cogs, cur) + typeSum(T.exp, cur) + typeSum(T.oe, cur);
    if (leaf && leaf.v > 0) out.push({ t: 'Top expense', x: 'Your biggest expense was ' + S.fullName(leaf.a.id) + ' at ' + U.money(leaf.v) + (texp ? ', ' + Math.round(leaf.v / texp * 100) + '% of total expenses.' : '.') });
    var cm = {};
    posts({ from: from, to: to, method: o.method }, function (e) { var a = S.acct[e.acct]; return a && a.type === 'Income'; }).forEach(function (e) { var c = e.p.cust || e.t.cust; if (c) cm[c] = (cm[c] || 0) - e.amt; });
    var topC = Object.keys(cm).sort(function (a, b) { return cm[b] - cm[a]; })[0];
    if (topC) out.push({ t: 'Top customer', x: S.custName(topC) + ' brought in the most income: ' + U.money(cm[topC]) + '.' });
    return out.slice(0, 3);
  }
  function insightsHtml(o) {
    return '<div class="qbr-ins">' + insights(o).map(function (x) { return '<div class="qbr-ins-card">' + UI.icon('sparkle') + '<div><b>' + U.esc(x.t) + '</b><p>' + U.esc(x.x) + '</p></div></div>'; }).join('') + '</div>';
  }
  R.insights = insights;

  function csvOf(res2, o, title) {
    function q(s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
    var lines = [[S.company.name], [title], [headText(res2, o, META[o.name] || {})], []];
    lines.push(res2.columns.map(function (c) { return c.label; }));
    res2.rows.forEach(function (r) {
      var line = [new Array(((r.depth || 0) + (r.indent || 0)) * 3 + 1).join(' ') + r.label];
      res2.columns.slice(1).forEach(function (c, j) {
        var v = (r.values || [])[j];
        line.push(typeof v === 'number' ? (c.type === 'hrs' ? hrs(v) : c.type === 'pct' ? v.toFixed(2) + '%' : v.toFixed(c.type === 'num' ? (Math.round(v) === v ? 0 : 2) : 2)) : v == null ? '' : v);
      });
      lines.push(line);
    });
    var ts = stampNow(); lines.push([]); lines.push([(res2.basis ? (o.method === 'cash' ? 'Cash basis ' : 'Accrual basis ') : '') + ts.date + ' ' + ts.time]);
    return lines.map(function (l) { return l.map(q).join(','); }).join('\r\n');
  }
  R.csvOf = csvOf;
  function download(name, text) {
    var blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name.replace(/[\\/:*?"<>|]+/g, '-') + '.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function seg(name, opts, val) {
    return '<div class="qb-seg qbr-seg" data-r-seg="' + name + '">' + opts.map(function (x) { return '<button type="button" data-v="' + x[0] + '"' + (x[0] === val ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>';
  }

  QB.view('report', function (p, el) {
    var params = ext({}, p); params.name = params.name || 'Profit and Loss';
    var name = params.name, meta = META[name] || {};
    var cr = params.cr ? R.custom.filter(function (x) { return x.id === params.cr; })[0] : null;
    var st = vstate(name + (cr ? '#' + cr.id : ''));
    var title = cr ? cr.name : name;
    var last = null;
    el.classList.add('qbr-vpage');
    function O() { return viewOpts(params, st); }
    var o0 = O();
    var periodVis = !(meta.period === 'none' && o0.period === 'none');
    var colsOpts = (meta.cols || []).map(function (c) { return [c, COLS_L[c]]; });
    el.innerHTML =
      '<div class="qbr-vhead"><a class="qbr-back" href="#/standardreports">' + UI.icon('caretLeft') + '<span>Back to standard reports</span></a><span class="qb-grow"></span>' +
      '<span class="qbr-toplinks"><button type="button" class="qbr-lnk" data-r-top="updates">New updates</button><span class="qbr-sep">|</span><button type="button" class="qbr-lnk" data-r-top="learn">Learn more</button><span class="qbr-sep">|</span><button type="button" class="qbr-lnk" data-act="shell:feedback">Give feedback</button></span></div>' +
      '<div class="qbr-titlebar"><h1>' + U.esc(title) + '</h1><button type="button" class="qbr-star' + (S.favorites[name] ? ' on' : '') + '" data-r-fav title="Favorite">' + UI.icon('star') + '</button></div>' +
      '<div class="qbr-toolbar' + (st.bar ? '' : ' is-collapsed') + '"><div class="qbr-tb">' +
      (periodVis ? '<label class="qbr-f"><span>' + (meta.aging ? 'As of' : 'Report period') + '</span>' + UI.select('period', PERIODS, o0.period, ' data-r-in="period"') + '</label>' +
        (meta.aging ? '' : '<label class="qbr-f qbr-f-d"><span>From</span>' + UI.dateInput('from', o0.from, ' data-r-in="from"') + '</label>') +
        '<label class="qbr-f qbr-f-d"><span>' + (meta.aging ? 'Date' : 'To') + '</span>' + UI.dateInput('to', o0.to || (meta.asof ? U.today() : ''), ' data-r-in="to"') + '</label>' : '') +
      (meta.quick ? '<label class="qbr-f qbr-f-acct"><span>Account</span>' + UI.select('acct', QB.lists.accounts().map(function (a) { return [a.value, a.label]; }), params.acct || 'a_chk', ' data-r-in="acct"') + '</label>' : '') +
      (meta.method ? '<div class="qbr-f"><span>Accounting method</span>' + seg('method', [['cash', 'Cash'], ['accrual', 'Accrual']], o0.method) + '</div>' : '') +
      (colsOpts.length ? '<label class="qbr-f"><span>Display columns by</span>' + UI.select('cols', colsOpts, o0.cols, ' data-r-in="cols"') + '</label>' : '') +
      (meta.compare ? '<label class="qbr-f"><span>Compare to</span>' + UI.select('compare', [['none', 'Select period'], ['pp', 'Previous period (PP)'], ['py', 'Previous year (PY)']], o0.compare || 'none', ' data-r-in="compare"') + '</label>' : '') +
      '<span class="qb-grow"></span><div class="qbr-tb-acts">' +
      '<button type="button" class="qb-btn qb-btn-secondary qbr-cz-btn" data-r-cz>Customize<i class="qbr-dotg"></i></button>' +
      '<button type="button" class="qb-btn qb-btn-primary" data-r-save>Save As</button>' +
      '<button type="button" class="qbr-ib qbr-collapse" data-r-bar aria-label="Collapse">' + UI.icon(st.bar ? 'caretUp' : 'caretDown') + '</button></div></div></div>' +
      '<div class="qbr-stage"><div class="qbr-paper"></div></div>';
    var paper = el.querySelector('.qbr-paper');
    function sync() { setHash(params); }
    function draw() {
      var o = O();
      last = R.run(name, o);
      paper.innerHTML = paperHtml(last, o, st, meta, title);
      if (last.error) paper.insertAdjacentHTML('afterbegin', '<div class="qb-banner qb-banner-warn">' + UI.icon('alert') + '<span>This report could not be built for these settings, so a transaction list is shown instead.</span></div>');
    }
    function refreshInputs() {
      var o = O();
      var f = el.querySelector('[data-r-in="from"]'), t = el.querySelector('[data-r-in="to"]'), ps = el.querySelector('[data-r-in="period"]');
      if (f) f.value = o.from ? U.fmtDate(o.from) : '';
      if (t) t.value = o.to ? U.fmtDate(o.to) : (meta.asof ? U.fmtDate(U.today()) : '');
      if (ps) ps.value = o.period === 'none' ? 'all' : o.period;
    }
    draw();

    el.addEventListener('change', function (e) {
      var inp = e.target.closest('[data-r-in]');
      if (inp) {
        var k = inp.dataset.rIn;
        if (k === 'period') {
          params.period = inp.value;
          if (inp.value === 'custom') { var cur = O(); params.from = cur.from; params.to = cur.to; params.period = 'custom'; }
          else { delete params.from; delete params.to; }
          refreshInputs();
        } else if (k === 'from' || k === 'to') {
          var iso = U.parseDate(inp.value.trim());
          if (inp.value.trim() && !iso) { inp.classList.add('is-err'); return; }
          inp.classList.remove('is-err');
          var c2 = O(); params.from = c2.from; params.to = c2.to; params[k] = iso; params.period = 'custom';
          if (params.from && params.to && params.from > params.to) { if (k === 'from') params.to = params.from; else params.from = params.to; }
          refreshInputs();
        } else params[k] = inp.value;
        sync(); draw(); return;
      }
      if (e.target.matches('[data-r-zoom]')) { st.zoom = +e.target.value; draw(); return; }
    });
    el.addEventListener('focusout', function (e) {
      if (e.target.matches('[data-r-notetext]')) { st.note = e.target.value.trim(); st.noteOpen = false; draw(); }
    });
    el.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-r-seg] button'))) { params.method = b.dataset.v; U.$$('button', b.parentNode).forEach(function (x) { x.classList.toggle('on', x === b); }); sync(); draw(); return; }
      if ((b = e.target.closest('[data-r-tog]'))) { var g = b.dataset.rTog; st.collapsed[g] = !st.collapsed[g]; draw(); return; }
      if ((b = e.target.closest('[data-r-sort]'))) {
        var col = +b.dataset.rSort;
        st.sort = !st.sort || st.sort.col !== col ? { col: col, dir: 'desc' } : st.sort.dir === 'desc' ? { col: col, dir: 'asc' } : null;
        draw(); return;
      }
      if ((b = e.target.closest('[data-r-drill]'))) { drill(b.dataset.rDrill); return; }
      if ((b = e.target.closest('[data-r-link]'))) {
        var o = O(), lr = last.rows[+b.dataset.rLink], to = o.to || U.today();
        var lp = { name: lr.link, period: 'custom', from: (last.asof ? fyStart(to) : o.from), to: to, method: o.method };
        QB.go('report', lp); return;
      }
      if (e.target.closest('[data-r-compact]')) { st.compact = !st.compact; draw(); return; }
      if (e.target.closest('[data-r-ins]')) { st.insights = !st.insights; draw(); return; }
      if (e.target.closest('[data-r-ask]')) { QB.assistant(); return; }
      if (e.target.closest('[data-r-note]')) { st.noteOpen = true; draw(); var ta = paper.querySelector('[data-r-notetext]'); if (ta) ta.focus(); return; }
      if (e.target.closest('[data-r-bar]')) { st.bar = !st.bar; el.querySelector('.qbr-toolbar').classList.toggle('is-collapsed', !st.bar); el.querySelector('[data-r-bar]').innerHTML = UI.icon(st.bar ? 'caretUp' : 'caretDown'); return; }
      if ((b = e.target.closest('[data-r-fav]'))) { if (S.favorites[name]) delete S.favorites[name]; else S.favorites[name] = true; b.classList.toggle('on', !!S.favorites[name]); UI.toast(S.favorites[name] ? name + ' was added to Favorites.' : name + ' was removed from Favorites.'); return; }
      if (e.target.closest('[data-r-cz]')) { customize(); return; }
      if (e.target.closest('[data-r-save]')) { saveAs(); return; }
      if ((b = e.target.closest('[data-r-top]'))) {
        e.stopPropagation();
        if (b.dataset.rTop === 'updates') UI.modal('New updates', '<p>Reports now open in the modern view: change the period, accounting method and columns right above the report and it updates as you go.</p><p>Use Customize for rows, number formats and the header and footer, and Save As to keep your version under Custom reports.</p>', { buttons: [['Got it', 'primary']] });
        else UI.modal('Learn more', '<p>Select any amount to see the transactions behind it. Select a section name to collapse or expand it, and use Export to download the rows you see.</p>', { buttons: [['Close', 'secondary']] });
        return;
      }
      if ((b = e.target.closest('[data-r-tool]'))) { e.stopPropagation(); tool(b.dataset.rTool, b); return; }
      var tr = e.target.closest('tr[data-r-txn]');
      if (tr && !e.target.closest('a,button,input,select,textarea')) { QB.openTxn(tr.dataset.rTxn); }
    });
    function drill(spec) {
      var ij = spec.split(':'), r = last.rows[+ij[0]], c = last.columns[+ij[1]], o = O();
      if (!r) return;
      var id = r.acct;
      if (r.quick) { QB.go('report', { name: 'Account QuickReport', acct: id, own: r.own ? '1' : '' }); return; }
      var dp = { name: 'Transaction Detail by Account', acct: id, own: r.own ? '1' : '', period: 'custom', method: o.method };
      if (c.asofCol) { dp.from = ''; dp.to = c.to || o.to || U.today(); }
      else { dp.from = c.from != null ? c.from : o.from; dp.to = c.to != null ? c.to : o.to; }
      if (!dp.from) dp.from = '1900-01-01';
      if (!dp.to) dp.to = U.today();
      if (c.cust) dp.cust = c.cust; if (c.vend) dp.vend = c.vend; if (c.item) dp.item = c.item;
      QB.go('report', dp);
    }
    function tool(k, anchor) {
      var o = O();
      if (k === 'refresh') { draw(); UI.toast('Report refreshed.'); return; }
      if (k === 'print') { window.print(); return; }
      if (k === 'export') {
        UI.menu(anchor, [['Export to CSV', 'csv'], ['Export to PDF', 'pdf']], { onPick: function (a) {
          if (a === 'csv') { download(title, csvOf(last, o, title)); UI.toast('Your report was exported.'); }
          else window.print();
        } });
        return;
      }
      if (k === 'email') {
        UI.modal('Email report', UI.field('To', '<input class="qb-input" name="to" placeholder="Separate multiple emails with commas">') + '<div style="height:10px"></div>' +
          UI.field('Subject', '<input class="qb-input" name="subj" value="' + U.esc(title + ' report from ' + S.company.name) + '">') + '<div style="height:10px"></div>' +
          UI.field('Message', '<textarea class="qb-input" rows="4" name="msg">Hello,\n\nAttached is the ' + U.esc(title) + ' report for ' + U.esc(S.company.name) + '.\n\nRegards,\nCraig Carlson</textarea>') +
          '<p class="qb-muted" style="margin-top:10px">In the practice copy, nothing leaves your browser.</p>', {
          buttons: [['Cancel', 'secondary'], ['Send', 'primary', function (m) {
            var to = m.querySelector('[name=to]');
            if (!/\S+@\S+\.\S+/.test(to.value)) { to.classList.add('is-err'); return false; }
            UI.toast('Your report was emailed.');
          }]]
        });
        return;
      }
      if (k === 'more') {
        UI.menu(anchor, [['Expand all', 'expand'], ['Collapse all', 'collapse'], { sep: true }, ['Copy link', 'link'], ['Reset to default', 'reset']], { onPick: function (a) {
          if (a === 'expand') st.collapsed = {};
          if (a === 'collapse') last.rows.forEach(function (r) { if (r.header) st.collapsed[r.gid] = true; });
          if (a === 'link') copyLink(location.href);
          if (a === 'reset') { st.cz = czDefaults(); st.collapsed = {}; st.sort = null; st.zoom = 100; st.compact = false; }
          draw();
        } });
      }
    }
    function customize() {
      var cz = st.cz, o = O();
      function chk(k, lbl) { return '<label class="qbr-ck"><input type="checkbox" name="' + k + '"' + (cz[k] ? ' checked' : '') + '><span>' + lbl + '</span></label>'; }
      function sw(k, lbl) { return '<label class="qbr-sw"><span>' + lbl + '</span>' + UI.toggle(k, cz[k]) + '</label>'; }
      var d = UI.drawer('Customize report',
        '<div class="qbr-cz">' +
        '<details open><summary>General</summary>' +
        UI.field('Negative numbers', UI.select('neg', [['-100', '-100'], ['(100)', '(100)'], ['100-', '100-']], cz.neg)) + chk('red', 'Show in red') +
        '<div class="qbr-cz-h">Number format</div>' + chk('k', 'Divide by 1000') + chk('nocents', 'Without cents') + '</details>' +
        '<details open><summary>Rows/Columns</summary>' +
        UI.field('Show non-zero or active only', UI.select('rows', [['active', 'Active rows only'], ['nonzero', 'Non-zero rows only'], ['all', 'All rows']], cz.rows)) +
        (meta.cols ? '<div style="height:10px"></div>' + UI.field('Columns', UI.select('cols', colsOpts, o.cols)) : '') + '</details>' +
        '<details open><summary>Header/Footer</summary>' +
        '<div class="qbr-cz-h">Header</div>' + sw('company', 'Company name') + sw('title', 'Report title') + sw('period', 'Report period') +
        '<div class="qbr-cz-h">Footer</div>' + sw('date', 'Date prepared') + sw('time', 'Time prepared') + sw('basis', 'Report basis (cash vs. accrual)') + '</details></div>',
        {
          saveLabel: 'Apply', onSave: function (dr) {
            var g = function (n) { return dr.querySelector('[name="' + n + '"]'); };
            cz.neg = g('neg').value; cz.rows = g('rows').value;
            ['red', 'k', 'nocents', 'company', 'title', 'period', 'date', 'time', 'basis'].forEach(function (k) { cz[k] = g(k).checked; });
            if (g('cols')) { params.cols = g('cols').value; var cs = el.querySelector('[data-r-in="cols"]'); if (cs) cs.value = params.cols; sync(); }
            el.querySelector('.qbr-cz-btn').classList.add('is-on');
            draw();
          }
        });
      return d;
    }
    function saveAs() {
      UI.modal('Save report', UI.field('Custom report name', '<input class="qb-input" name="nm" value="' + U.esc(title) + '">') + '<div style="height:12px"></div>' +
        UI.field('Add this report to a group', UI.select('grp', [['', 'None']], '')) + '<div style="height:12px"></div>' +
        UI.field('Share with', UI.select('share', [['me', 'Only me'], ['all', 'All']], 'me')), {
        buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (m) {
          var nm = m.querySelector('[name=nm]');
          if (!nm.value.trim()) { nm.classList.add('is-err'); return false; }
          var pr = ext({}, params); delete pr.cr; delete pr.customize;
          var o = O();
          var x = { id: U.uid('cr'), name: nm.value.trim(), base: name, params: pr, cz: ext({}, st.cz), created: U.today(), user: 'Craig Carlson', period: (PERIODS.filter(function (q) { return q[0] === o.period; })[0] || ['', 'Custom'])[1], share: m.querySelector('[name=share]').value };
          R.custom.push(x);
          VS[name + '#' + x.id] = ext(ext({}, st), { cz: ext({}, st.cz), collapsed: ext({}, st.collapsed) });
          UI.toast('Report saved. You can find it under Custom reports.');
        }]]
      });
    }
    if (params.customize === '1') { delete params.customize; sync(); setTimeout(customize, 0); }
  });
  function copyLink(href) {
    try { navigator.clipboard.writeText(href).then(function () { UI.toast('Link copied.'); }, function () { UI.toast('Link copied.'); }); }
    catch (e) { UI.toast('Link copied.'); }
  }

  /* ══════════════════ Standard reports ══════════════════ */
  var CATS = [
    ['Favorites', null],
    ['Business overview', ['Audit Log', 'Balance Sheet', 'Balance Sheet Comparison', 'Balance Sheet Detail', 'Balance Sheet Summary', 'Statement of Cash Flows', 'Business Snapshot', 'Profit and Loss', 'Profit and Loss by Customer', 'Profit and Loss by Month', 'Profit and Loss by Tag Group', 'Profit and Loss Comparison', 'Profit and Loss Detail', 'Profit and Loss as % of total income', 'Profit and Loss year-to-date comparison', 'Quarterly Profit and Loss Summary']],
    ['Who owes you', ['Accounts receivable aging summary', 'Accounts receivable aging detail', 'Collections Report', 'Customer Balance Summary', 'Customer Balance Detail', 'Invoice List', 'Invoices and Received Payments', 'Open Invoices', 'Statement List', 'Terms List', 'Unbilled charges', 'Unbilled time']],
    ['Inventory', ['Inventory Valuation Detail', 'Inventory Valuation Summary', 'Open Purchase Order Detail', 'Open Purchase Order List', 'Physical Inventory Worksheet', 'Inventory Status']],
    ['Sales and customers', ['Cashflow Payment Transactions', 'Sales by Customer Type Detail', 'Estimates & Progress Invoicing Summary by Customer', 'Customer Contact List', 'Income by Customer Summary', 'Customer Phone List', 'Sales by Customer Summary', 'Sales by Customer Detail', 'Deposit Detail', 'Estimates by Customer', 'Product/Service List', 'Sales by Product/Service Summary', 'Sales by Product/Service Detail', 'Payment Method List', 'Time Activities by Customer Detail', 'Transaction List by Customer', 'Transaction List by Tag Group']],
    ['What you owe', ['Accounts payable aging summary', 'Accounts payable aging detail', 'Bills and Applied Payments', 'Bill Payment List', '1099 Contractor Balance Detail', '1099 Contractor Balance Summary', 'Unpaid Bills', 'Vendor Balance Summary', 'Vendor Balance Detail']],
    ['Sales tax', ['Sales Tax Liability Report', 'Taxable Sales Summary', 'Taxable Sales Detail']],
    ['Employees', ['Employee Contact List', 'Recent/Edited Time Activities', 'Time Activities by Employee Detail']],
    ['For my accountant', ['Account List', 'Recent Automatic Transactions', 'Balance Sheet', 'Balance Sheet Comparison', 'Balance Sheet Detail', 'Balance Sheet Summary', 'Statement of Cash Flows', 'Invalid Journal Transactions', 'General Ledger', 'General Ledger List', 'Journal', 'Recurring Template List', 'Profit and Loss', 'Profit and Loss by Tag Group', 'Profit and Loss Comparison', 'Recent Transactions', 'Reconciliation Reports', 'Trial Balance', 'Adjusted Trial Balance', 'Transaction Detail by Account', 'Transaction List by Date', 'Transaction List with Splits']],
    ['Payroll', ['Employee Contact List', 'Recent/Edited Time Activities', 'Time Activities by Employee Detail'], 'premium'],
    ['Time', ['Timesheet Detail by Employee', 'Time Summary by Pay Type'], 'new']
  ];
  R.CATS = CATS;
  var stdUI = { closed: {}, banner: true, q: '' };
  function allNames() { var s = {}, out = []; CATS.forEach(function (c) { (c[1] || []).forEach(function (n) { if (!s[n]) { s[n] = 1; out.push(n); } }); }); return out; }
  QB.view('standardreports', function (p, el) {
    el.classList.add('qbr-stdpage');
    el.innerHTML = '<div class="qbr-std">' +
      '<div class="qbr-std-top"><div class="qbr-find">' + UI.comboHtml('qbrFind', stdUI.q, 'Type report name here', ' aria-label="Find a report"') + '</div>' +
      '<button type="button" class="qbr-ask" data-r-ask>' + UI.icon('sparkle') + '<span>Ask a question</span><em>BETA</em></button></div>' +
      (stdUI.banner ? '<div class="qbr-banner">' + UI.icon('reports') + '<span>See projected financial performance based on your recent business activity.</span><a href="#/cashflow">View forecast</a><button type="button" class="qb-x" data-r-banner aria-label="Close">' + UI.icon('close') + '</button></div>' : '') +
      '<div class="qbr-cards"></div></div>';
    var input = el.querySelector('[name=qbrFind]'), cards = el.querySelector('.qbr-cards');
    UI.combo(input, function () { return allNames().sort(byName).map(function (n) { return { value: n, label: n }; }); }, { onPick: function (v) { stdUI.q = ''; QB.go('report', { name: v }); } });
    input.addEventListener('input', function () { stdUI.q = input.value; draw(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.defaultPrevented) { var f = cards.querySelector('.qbr-rep-name'); if (f && stdUI.q) location.hash = f.getAttribute('href'); } });
    function li(n) {
      var fav = !!S.favorites[n];
      return '<li class="qbr-rep"><a class="qbr-rep-name" href="#/report' + U.qs({ name: n }) + '">' + U.esc(n) + '</a>' +
        '<button type="button" class="qbr-star' + (fav ? ' on' : '') + '" data-r-star="' + U.esc(n) + '" aria-label="' + (fav ? 'Remove from favorites' : 'Add to favorites') + '">' + UI.icon('star') + '</button>' +
        '<button type="button" class="qbr-keb" data-r-keb="' + U.esc(n) + '" aria-label="More">' + UI.icon('kebab') + '</button></li>';
    }
    function draw() {
      var q = stdUI.q.trim().toLowerCase();
      cards.innerHTML = CATS.map(function (c, i) {
        var list = c[1] || Object.keys(S.favorites).filter(function (n) { return S.favorites[n]; }).sort(byName);
        var shown = q ? list.filter(function (n) { return n.toLowerCase().indexOf(q) >= 0; }) : list;
        if (q && !shown.length) return '';
        var closed = !q && stdUI.closed[c[0]];
        var extra = c[2] === 'premium' ? UI.icon('diamond', 'qbr-prem') + '<a class="qbr-learn" href="#/payroll-signup">Learn more about QuickBooks Payroll</a>' : c[2] === 'new' ? '<span class="qbr-new">NEW</span>' : '';
        return '<section class="qbr-card' + (closed ? ' is-closed' : '') + '"><div class="qbr-card-h"><button type="button" class="qbr-card-t" data-r-card="' + U.esc(c[0]) + '">' + UI.icon(closed ? 'caretRight' : 'caretDown') + '<h2>' + U.esc(c[0]) + '</h2></button>' + extra + '</div>' +
          (closed ? '' : '<div class="qbr-card-b">' + (shown.length ? '<ul class="qbr-grid">' + shown.map(li).join('') + '</ul>' : '<p class="qbr-empty">Add a report to Favorites by selecting the star next to its name.</p>') + '</div>') + '</section>';
      }).join('') || '<div class="qbr-nores">No reports match “' + U.esc(stdUI.q) + '”.</div>';
    }
    draw();
    el.addEventListener('click', function (e) {
      var b;
      if (e.target.closest('[data-r-ask]')) { QB.assistant(); return; }
      if (e.target.closest('[data-r-banner]')) { stdUI.banner = false; var bn = el.querySelector('.qbr-banner'); if (bn) bn.remove(); return; }
      if ((b = e.target.closest('[data-r-card]'))) { var k = b.dataset.rCard; stdUI.closed[k] = !stdUI.closed[k]; draw(); return; }
      if ((b = e.target.closest('[data-r-star]'))) { var n = b.dataset.rStar; if (S.favorites[n]) delete S.favorites[n]; else S.favorites[n] = true; draw(); return; }
      if ((b = e.target.closest('[data-r-keb]'))) {
        e.stopPropagation();
        var nm = b.dataset.rKeb, items = [['Customize', 'cz'], ['Copy link', 'link']];
        if (S.favorites[nm]) items.push(['Remove from favorites', 'unfav']); else items.push(['Add to favorites', 'fav']);
        UI.menu(b, items, { onPick: function (a) {
          if (a === 'cz') QB.go('report', { name: nm, customize: '1' });
          if (a === 'link') copyLink(location.href.split('#')[0] + '#/report' + U.qs({ name: nm }));
          if (a === 'unfav') { delete S.favorites[nm]; draw(); UI.toast(nm + ' was removed from Favorites.'); }
          if (a === 'fav') { S.favorites[nm] = true; draw(); UI.toast(nm + ' was added to Favorites.'); }
        } });
      }
    });
  });

  /* ══════════════════ Custom reports ══════════════════ */
  QB.view('customreports', function (p, el) {
    el.classList.add('qbr-listpage');
    function draw() {
      if (!R.custom.length) {
        el.innerHTML = UI.pageHead('Custom reports') + '<div class="qbr-emptystate">' + QB.art('docs') + '<h2>Save your customized reports here</h2><p>Open any report, change it the way you need it, then select <b>Save As</b>. It shows up in this list so you can run it again any time.</p>' + UI.btn('Go to standard reports', { kind: 'primary', act: 'go:standardreports' }) + '</div>';
        return;
      }
      el.innerHTML = UI.pageHead('Custom reports') + '<div class="qbr-tblhost"></div>';
      UI.table(el.querySelector('.qbr-tblhost'), [
        { key: 'name', label: 'NAME', render: function (r) { return '<a href="#/report' + U.qs(ext(ext({}, r.params), { cr: r.id })) + '" class="qbr-lnk">' + U.esc(r.name) + '</a>'; } },
        { key: 'user', label: 'CREATED BY' },
        { key: 'created', label: 'DATE CREATED', render: function (r) { return U.fmtDate(r.created); } },
        { key: 'period', label: 'REPORT PERIOD' },
        { key: 'base', label: 'REPORT TYPE' },
        { key: 'act', label: 'ACTION', sort: false, align: 'right', render: function (r) { return '<span class="qbr-act"><button type="button" class="qbr-lnk" data-r-cedit="' + r.id + '">Edit</button><button type="button" class="qbr-caret" data-r-cmenu="' + r.id + '" aria-label="More">' + UI.icon('caretDown') + '</button></span>'; } }
      ], R.custom.map(function (x) { return x; }), {});
    }
    draw();
    el.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-r-cedit]'))) { var x = find(b.dataset.rCedit); QB.go('report', ext(ext({}, x.params), { cr: x.id, customize: '1' })); return; }
      if ((b = e.target.closest('[data-r-cmenu]'))) {
        e.stopPropagation();
        var cr = find(b.dataset.rCmenu);
        UI.menu(b, [['Run report', 'run'], ['Export as CSV', 'csv'], ['Delete', 'del']], { onPick: function (a) {
          if (a === 'run') QB.go('report', ext(ext({}, cr.params), { cr: cr.id }));
          if (a === 'csv') { var st = vstate(cr.base + '#' + cr.id), o = viewOpts(ext(ext({}, cr.params), { name: cr.base }), st); download(cr.name, csvOf(R.run(cr.base, o), o, cr.name)); }
          if (a === 'del') UI.confirm('Delete report', 'Delete "' + cr.name + '"? You can\'t undo this.', 'Delete', function () { R.custom.splice(R.custom.indexOf(cr), 1); draw(); UI.toast('Report deleted.'); });
        } });
      }
    });
    function find(id) { return R.custom.filter(function (x) { return x.id === id; })[0]; }
  });

  /* ══════════════════ Management reports ══════════════════ */
  R.mgmt = [
    { id: 'm1', name: 'Company Overview', by: 'QuickBooks', modified: '', period: 'this-year-to-date', reports: ['Profit and Loss', 'Balance Sheet'] },
    { id: 'm2', name: 'Sales Performance', by: 'QuickBooks', modified: '', period: 'this-year-to-date', reports: ['Profit and Loss', 'Accounts receivable aging summary', 'Sales by Customer Summary'] },
    { id: 'm3', name: 'Expenses Performance', by: 'QuickBooks', modified: '', period: 'this-year-to-date', reports: ['Profit and Loss', 'Accounts payable aging summary', 'Expenses by Vendor Summary'] }
  ];
  function rangeLabel(k) { return (U.RANGES.filter(function (r) { return r[0] === k; })[0] || ['', 'Custom'])[1]; }
  function staticReport(name, o) {
    var r = R.run(name, o), st = { collapsed: {}, cz: czDefaults() };
    return '<div class="qbr-doc qbr-mg-rep"><div class="qbr-hdr"><div class="qbr-co">' + U.esc(S.company.name) + '</div><div class="qbr-ti">' + U.esc(name) + '</div><div class="qbr-dr">' + U.esc(headText(r, o, META[name] || {})) + '</div></div>' +
      '<table class="qbr-tbl"><thead><tr>' + r.columns.map(function (c, j) { return '<th class="' + (j ? 'ta-r' : 'qbr-c0') + '">' + U.esc(c.label) + '</th>'; }).join('') + '</tr></thead><tbody>' + rowsHtml(r, st, o).replace(/<button type="button" class="qbr-(chev|amt|lnk)"[^>]*>/g, '<span class="qbr-$1">').replace(/<\/button>/g, '</span>') + '</tbody></table></div>';
  }
  QB.view('managementreports', function (p, el) {
    el.classList.add('qbr-listpage');
    function draw() {
      el.innerHTML = UI.pageHead('Management reports') + '<div class="qbr-tblhost"></div>';
      UI.table(el.querySelector('.qbr-tblhost'), [
        { key: 'name', label: 'NAME', render: function (r) { return '<button type="button" class="qbr-lnk" data-r-mview="' + r.id + '">' + U.esc(r.name) + '</button>'; } },
        { key: 'by', label: 'CREATED BY' },
        { key: 'modified', label: 'LAST MODIFIED', render: function (r) { return r.modified ? U.fmtDate(r.modified) : ''; } },
        { key: 'period', label: 'REPORT PERIOD', render: function (r) { return U.esc(rangeLabel(r.period)); } },
        { key: 'act', label: 'ACTION', sort: false, align: 'right', render: function (r) { return '<span class="qbr-act"><button type="button" class="qbr-lnk" data-r-mview="' + r.id + '">View</button><button type="button" class="qbr-caret" data-r-mmenu="' + r.id + '" aria-label="More">' + UI.icon('caretDown') + '</button></span>'; } }
      ], R.mgmt.slice(), {});
    }
    draw();
    function find(id) { return R.mgmt.filter(function (x) { return x.id === id; })[0]; }
    function view(m) {
      var rg = U.range(m.period), o = { from: rg[0], to: rg[1], method: 'accrual' };
      var body = '<div class="qbr-mg"><div class="qbr-mg-cover"><div class="qbr-mg-co">' + U.esc(S.company.name) + '</div><h2>' + U.esc(m.name) + '</h2><div>' + U.esc(rangeText(o.from, o.to)) + '</div></div>' +
        '<div class="qbr-mg-toc"><h3>Table of contents</h3><ol>' + m.reports.map(function (n) { return '<li>' + U.esc(n) + '</li>'; }).join('') + '</ol></div>' +
        m.reports.map(function (n) { return staticReport(n, ext({ name: n }, o)); }).join('') + '</div>';
      UI.modal(m.name, body, { wide: true, cls: 'qbr-mg-modal', buttons: [['Close', 'secondary'], ['Print', 'primary', function () {
        document.body.classList.add('qbr-print-mg');
        setTimeout(function () { window.print(); document.body.classList.remove('qbr-print-mg'); }, 30);
        return false;
      }]] });
    }
    function edit(m) {
      UI.modal('Edit report', UI.field('Report name', '<input class="qb-input" name="nm" value="' + U.esc(m.name) + '">') + '<div style="height:12px"></div>' +
        UI.field('Report period', UI.select('per', U.RANGES.filter(function (r) { return r[0] !== 'all'; }), m.period)) +
        '<p class="qb-muted" style="margin-top:12px">Included reports: ' + U.esc(m.reports.join(', ')) + '</p>', {
        buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (d) {
          var nm = d.querySelector('[name=nm]'); if (!nm.value.trim()) { nm.classList.add('is-err'); return false; }
          m.name = nm.value.trim(); m.period = d.querySelector('[name=per]').value; m.modified = U.today(); m.by = m.by === 'QuickBooks' ? 'Craig Carlson' : m.by;
          draw(); UI.toast('Report saved.');
        }]]
      });
    }
    el.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-r-mview]'))) { view(find(b.dataset.rMview)); return; }
      if ((b = e.target.closest('[data-r-mmenu]'))) {
        e.stopPropagation();
        var m = find(b.dataset.rMmenu), items = [['Edit', 'edit'], ['Copy', 'copy']];
        if (m.copy) items.push(['Delete', 'del']);
        UI.menu(b, items, { onPick: function (a) {
          if (a === 'edit') edit(m);
          if (a === 'copy') { var c = ext(ext({}, m), { id: U.uid('m'), name: m.name + ' - Copy', by: 'Craig Carlson', modified: U.today(), copy: true, reports: m.reports.slice() }); R.mgmt.push(c); draw(); UI.toast('Report copied.'); }
          if (a === 'del') UI.confirm('Delete report', 'Delete "' + m.name + '"? You can\'t undo this.', 'Delete', function () { R.mgmt.splice(R.mgmt.indexOf(m), 1); draw(); });
        } });
      }
    });
  });

  /* ══════════════════ KPIs ══════════════════ */
  var CA_T = ['Bank', 'Accounts receivable (A/R)', 'Other Current Assets'], CL_T = ['Accounts payable (A/P)', 'Credit Card', 'Other Current Liabilities'];
  function kpis(from, to) {
    to = to || U.today(); from = from || fyStart(to);
    var m = sums({ from: from, to: to }), bs = bsMap(to).map;
    var inc = typeSum(T.inc, m), cogs = typeSum(T.cogs, m), ni = netIncome(m), days = U.diffDays(to, from) + 1;
    var ar = typeSum(['Accounts receivable (A/R)'], bs), ca = typeSum(CA_T, bs), cl = typeSum(CL_T, bs);
    return {
      gpm: inc ? (inc - cogs) / inc * 100 : null, npm: inc ? ni / inc * 100 : null, cr: cl ? ca / cl : null,
      dso: inc > 0 ? ar / (inc / days) : null, ar: ar, ap: typeSum(['Accounts payable (A/P)'], bs), cash: typeSum(['Bank'], bs)
    };
  }
  R.kpis = kpis;
  var KPI_DEF = [
    ['gpm', 'Gross profit margin', 'pct', '(Income - Cost of goods sold) / Income'],
    ['npm', 'Net profit margin', 'pct', 'Net income / Income'],
    ['cr', 'Current ratio', 'ratio', 'Current assets / Current liabilities'],
    ['dso', 'Days sales outstanding', 'days', 'Accounts receivable / Average daily income'],
    ['ar', 'Accounts receivable (A/R)', 'money', 'What customers owe you, as of the end of the period'],
    ['ap', 'Accounts payable (A/P)', 'money', 'What you owe vendors, as of the end of the period'],
    ['cash', 'Cash', 'money', 'Balance of your bank accounts in QuickBooks']
  ];
  var kpiUI = { period: 'this-year-to-date' };
  function kfmt(v, t) {
    if (v == null || isNaN(v)) return '--';
    if (t === 'pct') return (Math.round(v * 10) / 10).toFixed(1) + '%';
    if (t === 'ratio') return (Math.round(v * 100) / 100).toFixed(2);
    if (t === 'days') return Math.round(v) + ' days';
    return U.money(v);
  }
  QB.view('kpis', function (p, el) {
    el.classList.add('qbr-listpage');
    function draw() {
      var rg = U.range(kpiUI.period), cur = kpis(rg[0], rg[1]), pr = prevRange(rg[0], rg[1], 'pp'), prev = kpis(pr[0], pr[1]);
      var months = periodSpecs(U.addMonths(U.iso(new Date(U.toDate(U.today()).getFullYear(), U.toDate(U.today()).getMonth(), 1)), -5), U.today(), 'months').map(function (s) { return kpis(s.from, s.to); });
      el.innerHTML = UI.pageHead('KPIs', { actions: UI.feedbackLink() }) +
        '<div class="qbr-kpi-bar"><label class="qbr-f"><span>Report period</span>' + UI.select('kper', U.RANGES.filter(function (r) { return r[0] !== 'all'; }), kpiUI.period, ' data-r-kper') + '</label><span class="qb-muted">' + U.esc(rangeText(rg[0], rg[1])) + ' compared with ' + U.esc(rangeText(pr[0], pr[1])) + '</span></div>' +
        '<div class="qbr-kpis">' + KPI_DEF.map(function (k) {
          var v = cur[k[0]], pv = prev[k[0]], d = v != null && pv != null ? v - pv : null;
          var trend = months.map(function (x) { return x[k[0]] == null ? 0 : x[k[0]]; });
          return '<div class="qbr-kpi"><div class="qbr-kpi-t">' + U.esc(k[1]) + '</div><div class="qbr-kpi-v">' + kfmt(v, k[2]) + '</div>' +
            (d != null && Math.abs(d) > 0.0001 ? '<div class="qbr-kpi-d ' + (d > 0 ? 'up' : 'down') + '">' + UI.icon(d > 0 ? 'arrowUp' : 'arrowDown') + '<span>' + kfmt(Math.abs(d), k[2] === 'money' ? 'money' : k[2]) + ' vs. previous period</span></div>' : '<div class="qbr-kpi-d">No change vs. previous period</div>') +
            sparkSvg(trend) + '<div class="qbr-kpi-f">' + U.esc(k[3]) + '</div></div>';
        }).join('') + '</div>';
    }
    draw();
    el.addEventListener('change', function (e) { if (e.target.matches('[data-r-kper]')) { kpiUI.period = e.target.value; draw(); } });
  });

  /* ══════════════════ Cash flow planner ══════════════════ */
  R.planned = [];
  var cfUI = { mode: 'balance' };
  function cashItems(days) {
    var today = U.today(), end = U.addDays(today, days), out = [];
    S.txns.forEach(function (t) {
      if (t.hidden) return;
      if (t.type === 'Invoice') { var ob = L.openBalance(t); if (ob > 0.004) { var d = t.due && t.due > today ? t.due : today; if (d <= end) out.push({ date: d, kind: 'in', name: S.custName(t.cust), what: 'Invoice ' + (t.no || ''), amount: ob, txn: t.id, overdue: t.due < today }); } }
      if (t.type === 'Bill') { var ob2 = L.openBalance(t); if (ob2 > 0.004) { var d2 = t.due && t.due > today ? t.due : today; if (d2 <= end) out.push({ date: d2, kind: 'out', name: vendName(t.payee), what: 'Bill' + (t.no ? ' ' + t.no : ''), amount: ob2, txn: t.id, overdue: t.due < today }); } }
    });
    (S.recurring || []).forEach(function (r) {
      if (r.txnType !== 'Scheduled' || !r.next) return;
      var d = r.next, step = /Week/.test(r.interval) ? 7 : 0, n = 0;
      while (d && d <= end && n++ < 30) {
        if (d >= today) out.push({ date: d, kind: r.type === 'Invoice' ? 'in' : 'out', name: r.payee, what: 'Recurring ' + r.type.toLowerCase() + ': ' + r.name, amount: r.amount });
        d = step ? U.addDays(d, step) : U.addMonths(d, 1);
      }
    });
    R.planned.forEach(function (x) { if (x.date >= today && x.date <= end) out.push(ext(ext({}, x), { planned: true })); });
    out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    return out;
  }
  R.cashItems = cashItems;
  function cashChart(start, items, days, mode) {
    var W = 900, H = 260, pl = 64, pr = 16, pt = 16, pb = 30, today = U.today();
    var inner = W - pl - pr, ih = H - pt - pb, g = '';
    if (mode === 'inout') {
      var weeks = [], wk = Math.ceil(days / 7);
      for (var w = 0; w < wk; w++) weeks.push({ from: U.addDays(today, w * 7), to: U.addDays(today, w * 7 + 6), inn: 0, out: 0 });
      items.forEach(function (x) { var i = Math.min(wk - 1, Math.floor(U.diffDays(x.date, today) / 7)); if (x.kind === 'in') weeks[i].inn += x.amount; else weeks[i].out += x.amount; });
      var mx = niceMax(Math.max.apply(null, weeks.map(function (x) { return Math.max(x.inn, x.out); }).concat([1])));
      var mid = pt + ih / 2, bw = inner / wk;
      [-1, -0.5, 0, 0.5, 1].forEach(function (f) { var y = mid - f * ih / 2; g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" stroke="' + (f ? '#e3e5e8' : '#8d9096') + '"/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + U.money0(f * mx) + '</text>'; });
      weeks.forEach(function (x, i) {
        var x0 = pl + i * bw + bw * 0.2, bwid = bw * 0.6, hi = x.inn / mx * ih / 2, ho = x.out / mx * ih / 2;
        g += '<rect x="' + x0.toFixed(1) + '" y="' + (mid - hi).toFixed(1) + '" width="' + bwid.toFixed(1) + '" height="' + hi.toFixed(1) + '" fill="#2ca01c"><title>Money in ' + U.fmtDate(x.from, 'mon') + ': ' + U.money(x.inn) + '</title></rect>';
        g += '<rect x="' + x0.toFixed(1) + '" y="' + mid.toFixed(1) + '" width="' + bwid.toFixed(1) + '" height="' + ho.toFixed(1) + '" fill="#0077c5"><title>Money out ' + U.fmtDate(x.from, 'mon') + ': ' + U.money(x.out) + '</title></rect>';
        if (i % 2 === 0) g += '<text x="' + (pl + i * bw + bw / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + U.MON[U.toDate(x.from).getMonth()] + ' ' + U.toDate(x.from).getDate() + '</text>';
      });
      return '<svg class="qbr-cf-svg" viewBox="0 0 ' + W + ' ' + H + '">' + g + '</svg>';
    }
    var bal = [], b = start, idx = 0;
    for (var d = 0; d <= days; d++) {
      var day = U.addDays(today, d);
      while (idx < items.length && items[idx].date <= day) { b += items[idx].kind === 'in' ? items[idx].amount : -items[idx].amount; idx++; }
      bal.push(r2(b));
    }
    var lo = Math.min(0, Math.min.apply(null, bal)), hi2 = Math.max(0, Math.max.apply(null, bal));
    var top = niceMax(Math.max(Math.abs(lo), Math.abs(hi2))), bot = lo < 0 ? -top : 0;
    if (hi2 <= 0) top = 0, bot = -niceMax(-lo);
    var sy = function (v) { return pt + (top - v) / ((top - bot) || 1) * ih; }, sx = function (i) { return pl + i / days * inner; };
    for (var k = 0; k <= 4; k++) { var v = top - (top - bot) * k / 4, y = sy(v); g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + (Math.abs(v) < 0.01 ? '#8d9096' : '#e3e5e8') + '"/><text x="' + (pl - 6) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + U.money0(v) + '</text>'; }
    var line = bal.map(function (v, i) { return (i ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v).toFixed(1); }).join(' ');
    g += '<path d="' + line + ' L' + sx(days).toFixed(1) + ' ' + sy(Math.max(bot, Math.min(top, 0))).toFixed(1) + ' L' + sx(0).toFixed(1) + ' ' + sy(Math.max(bot, Math.min(top, 0))).toFixed(1) + 'Z" fill="url(#qbrHatch)" opacity=".9"/>';
    g += '<path d="' + line + '" fill="none" stroke="#2ca01c" stroke-width="2.5"/>';
    for (var mth = 0; mth <= days; mth++) { var dd = U.addDays(today, mth); if (mth === 0 || dd.slice(8) === '01') g += '<text x="' + sx(mth).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + (mth ? 'middle' : 'start') + '">' + (mth ? U.MON[U.toDate(dd).getMonth()] + ' 1' : 'Today') + '</text>'; }
    g += '<circle cx="' + sx(0) + '" cy="' + sy(bal[0]).toFixed(1) + '" r="4.5" fill="#2ca01c"/>';
    var minI = bal.indexOf(Math.min.apply(null, bal));
    if (bal[minI] < 0) g += '<circle cx="' + sx(minI).toFixed(1) + '" cy="' + sy(bal[minI]).toFixed(1) + '" r="4" fill="#d52b1e"><title>Lowest balance ' + U.money(bal[minI]) + '</title></circle>';
    return '<svg class="qbr-cf-svg" viewBox="0 0 ' + W + ' ' + H + '"><defs><pattern id="qbrHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#e7f6e5"/><line x1="0" y1="0" x2="0" y2="6" stroke="#bfe5b9" stroke-width="2"/></pattern></defs>' + g + '</svg>';
  }
  QB.view('cashflow', function (p, el) {
    el.classList.add('qbr-listpage');
    var days = 90;
    function draw() {
      var start = typeSum(['Bank'], bsMap(U.today()).map), items = cashItems(days);
      var tin = 0, tout = 0; items.forEach(function (x) { if (x.kind === 'in') tin += x.amount; else tout += x.amount; });
      var end = r2(start + tin - tout);
      el.innerHTML = UI.pageHead('Cash flow planner', { actions: UI.feedbackLink() + UI.btn('Add item', { kind: 'primary', attrs: ' data-r-cfadd' }) }) +
        '<div class="qbr-cf"><div class="qbr-cf-top"><div><div class="qbr-cf-big">' + U.money(start) + '</div><div class="qb-muted">Today\'s cash balance</div></div>' +
        '<div><div class="qbr-cf-mid">' + U.money(end) + '</div><div class="qb-muted">Projected in ' + days + ' days</div></div>' +
        '<div><div class="qbr-cf-mid qbr-in">' + U.money(tin) + '</div><div class="qb-muted">Money in</div></div>' +
        '<div><div class="qbr-cf-mid qbr-out">' + U.money(tout) + '</div><div class="qb-muted">Money out</div></div><span class="qb-grow"></span>' +
        '<div class="qb-seg" data-r-cfmode><button type="button" data-v="balance"' + (cfUI.mode === 'balance' ? ' class="on"' : '') + '>Cash balance</button><button type="button" data-v="inout"' + (cfUI.mode === 'inout' ? ' class="on"' : '') + '>Money in/out</button></div></div>' +
        '<div class="qbr-cf-chart">' + cashChart(start, items, days, cfUI.mode) + '</div>' +
        '<div class="qbr-legend">' + (cfUI.mode === 'balance' ? '<span><i style="background:#2ca01c"></i>Projected cash balance</span>' : '<span><i style="background:#2ca01c"></i>Money in</span><span><i style="background:#0077c5"></i>Money out</span>') + '<span class="qb-muted">Based on open invoices, unpaid bills, scheduled recurring transactions and items you add.</span></div></div>' +
        '<h2 class="qbr-h2">Upcoming money in and out</h2><div class="qbr-tblhost"></div>';
      UI.table(el.querySelector('.qbr-tblhost'), [
        { key: 'date', label: 'DATE', render: function (x) { return U.fmtDate(x.date) + (x.overdue ? ' <span class="qbr-tag">Overdue</span>' : ''); } },
        { key: 'kind', label: 'TYPE', render: function (x) { return x.kind === 'in' ? 'Money in' : 'Money out'; } },
        { key: 'name', label: 'NAME', render: function (x) { return U.esc(x.name || ''); } },
        { key: 'what', label: 'DETAILS', render: function (x) { return x.txn ? '<button type="button" class="qbr-lnk" data-r-cftx="' + x.txn + '">' + U.esc(x.what) + '</button>' : U.esc(x.what) + (x.planned ? ' <button type="button" class="qbr-lnk" data-r-cfdel="' + x.id + '">Delete</button>' : ''); } },
        { key: 'amount', label: 'AMOUNT', align: 'right', render: function (x) { return '<span class="' + (x.kind === 'in' ? 'qbr-in' : 'qbr-out') + '">' + (x.kind === 'in' ? '' : '-') + U.money(x.amount) + '</span>'; } }
      ], items, { empty: 'Nothing is due in the next ' + days + ' days.', pageSize: 25 });
    }
    draw();
    el.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-r-cfmode] button'))) { cfUI.mode = b.dataset.v; draw(); return; }
      if ((b = e.target.closest('[data-r-cftx]'))) { QB.openTxn(b.dataset.rCftx); return; }
      if ((b = e.target.closest('[data-r-cfdel]'))) { var id = b.dataset.rCfdel; R.planned = R.planned.filter(function (x) { return x.id !== id; }); draw(); return; }
      if (e.target.closest('[data-r-cfadd]')) {
        UI.modal('Add item', UI.field('Description', '<input class="qb-input" name="what" placeholder="For example: Equipment loan payment">') + '<div style="height:10px"></div>' +
          '<div class="qbr-2col">' + UI.field('Type', UI.select('kind', [['in', 'Money in'], ['out', 'Money out']], 'out')) + UI.field('Date', UI.dateInput('date', U.addDays(U.today(), 7))) + '</div><div style="height:10px"></div>' +
          UI.field('Amount', '<input class="qb-input" name="amt" placeholder="0.00">') + '<div style="height:10px"></div>' + UI.field('Name', '<input class="qb-input" name="nm">'), {
          buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (m) {
            var amt = U.parseMoney(m.querySelector('[name=amt]').value), d = U.parseDate(m.querySelector('[name=date]').value.trim()), w = m.querySelector('[name=what]').value.trim();
            if (!amt || amt < 0) { m.querySelector('[name=amt]').classList.add('is-err'); return false; }
            if (!d) { m.querySelector('[name=date]').classList.add('is-err'); return false; }
            R.planned.push({ id: U.uid('pl'), date: d, kind: m.querySelector('[name=kind]').value, amount: r2(amt), what: w || 'Planned item', name: m.querySelector('[name=nm]').value.trim() });
            draw(); UI.toast('Item added to your cash flow.');
          }]]
        });
      }
    });
  });

  /* ══════════════════ Budgets ══════════════════ */
  function budgetAccts() { return acache().ord.filter(function (a) { return PL_TYPES.indexOf(a.type) >= 0 && a.active !== false; }); }
  function prefill(bud, year) {
    budgetAccts().forEach(function (a) {
      var arr = [];
      for (var i = 0; i < 12; i++) { var m = sums({ from: U.iso(new Date(year, i, 1)), to: U.iso(new Date(year, i + 1, 0)) }); arr.push(r2(m[a.id] || 0)); }
      if (arr.some(function (v) { return Math.abs(v) > 0.004; })) bud.data[a.id] = arr;
    });
  }
  R.prefill = prefill;
  QB.view('budgets', function (p, el) {
    el.classList.add('qbr-listpage');
    var bud = p.id ? R.budgets.filter(function (x) { return x.id === p.id; })[0] : null;
    if (bud) return editor(bud);
    function list() {
      if (!R.budgets.length) {
        el.innerHTML = UI.pageHead('Budgets') + UI.hero({ grey: true, title: 'Plan ahead with a budget', lead: 'Set targets for income and expenses, then see how you\'re doing.', body: '<p>Create a monthly budget for your Profit and Loss accounts. Start from scratch or prefill it with last year\'s actuals, then run Budgets vs. Actuals to see where you are over or under.</p>', actions: UI.btn('Add budget', { kind: 'primary', attrs: ' data-r-badd' }), art: QB.art('docs') });
        return;
      }
      el.innerHTML = UI.pageHead('Budgets', { actions: UI.btn('Add budget', { kind: 'primary', attrs: ' data-r-badd' }) }) + '<div class="qbr-tblhost"></div>';
      UI.table(el.querySelector('.qbr-tblhost'), [
        { key: 'name', label: 'NAME', render: function (x) { return '<a class="qbr-lnk" href="#/budgets?id=' + x.id + '">' + U.esc(x.name) + '</a>'; } },
        { key: 'type', label: 'TYPE', render: function () { return 'Profit and Loss'; } },
        { key: 'year', label: 'FINANCIAL YEAR', render: function (x) { return 'FY' + x.year + ' (Jan ' + x.year + ' - Dec ' + x.year + ')'; } },
        { key: 'interval', label: 'INTERVAL' },
        { key: 'act', label: 'ACTION', sort: false, align: 'right', render: function (x) { return '<span class="qbr-act"><a class="qbr-lnk" href="#/budgets?id=' + x.id + '">Edit</a><button type="button" class="qbr-caret" data-r-bmenu="' + x.id + '" aria-label="More">' + UI.icon('caretDown') + '</button></span>'; } }
      ], R.budgets.slice(), {});
    }
    list();
    el.addEventListener('click', function (e) {
      var b;
      if (e.target.closest('[data-r-badd]')) { addBudget(); return; }
      if ((b = e.target.closest('[data-r-bmenu]'))) {
        e.stopPropagation();
        var x = R.budgets.filter(function (y) { return y.id === b.dataset.rBmenu; })[0];
        UI.menu(b, [['Run Budgets vs. Actuals report', 'run'], ['Copy', 'copy'], ['Delete', 'del']], { onPick: function (a) {
          if (a === 'run') runBva(x);
          if (a === 'copy') { var c = { id: U.uid('bud'), name: x.name + ' - Copy', year: x.year, interval: x.interval, data: JSON.parse(JSON.stringify(x.data)) }; R.budgets.push(c); list(); UI.toast('Budget copied.'); }
          if (a === 'del') UI.confirm('Delete budget', 'Delete "' + x.name + '"? You can\'t undo this.', 'Delete', function () { R.budgets.splice(R.budgets.indexOf(x), 1); list(); UI.toast('Budget deleted.'); });
        } });
      }
    });
    function addBudget() {
      var y = U.toDate(U.today()).getFullYear();
      UI.modal('Add budget', UI.field('Name', '<input class="qb-input" name="nm" value="Budget_FY' + String(y).slice(2) + '_P&amp;L">') + '<div style="height:10px"></div>' +
        '<div class="qbr-2col">' + UI.field('Financial year', UI.select('yr', [y - 1, y, y + 1].map(function (v) { return [String(v), 'FY' + v + ' (Jan ' + v + ' - Dec ' + v + ')']; }), String(y))) +
        UI.field('Interval', UI.select('iv', [['Monthly', 'Monthly'], ['Quarterly', 'Quarterly'], ['Yearly', 'Yearly']], 'Monthly')) + '</div><div style="height:10px"></div>' +
        UI.field('Pre-fill data?', UI.select('pf', [['', 'No pre-fill'], [String(y - 1), 'Actual data - ' + (y - 1)], [String(y), 'Actual data - ' + y]], '')) + '<div style="height:10px"></div>' +
        UI.field('Subdivide by', UI.select('sd', [['', "Don't subdivide"]], '')), {
        buttons: [['Cancel', 'secondary'], ['Create budget', 'primary', function (m) {
          var nm = m.querySelector('[name=nm]'); if (!nm.value.trim()) { nm.classList.add('is-err'); return false; }
          var x = { id: U.uid('bud'), name: nm.value.trim(), year: +m.querySelector('[name=yr]').value, interval: m.querySelector('[name=iv]').value, data: {} };
          var pf = m.querySelector('[name=pf]').value; if (pf) prefill(x, +pf);
          R.budgets.push(x);
          setTimeout(function () { QB.go('budgets', { id: x.id }); }, 0);
        }]]
      });
    }
    function runBva(x) { QB.go('report', { name: 'Budget vs. Actuals', budget: x.id, period: 'custom', from: x.year + '-01-01', to: x.year === U.toDate(U.today()).getFullYear() ? U.today() : x.year + '-12-31' }); }
    function editor(x) {
      var accts = budgetAccts(), groups = [['Income', T.inc], ['Cost of Goods Sold', T.cogs], ['Expenses', T.exp], ['Other Income', T.oi], ['Other Expenses', T.oe]];
      function rowTot(id) { return r2((x.data[id] || []).reduce(function (s, v) { return s + (+v || 0); }, 0)); }
      var body = '<table class="qbr-bgrid"><thead><tr><th class="qbr-c0">Accounts</th>' + U.MON.map(function (m) { return '<th>' + m + ' ' + x.year + '</th>'; }).join('') + '<th>Total</th></tr></thead><tbody>';
      groups.forEach(function (g) {
        var list = accts.filter(function (a) { return g[1].indexOf(a.type) >= 0; });
        if (!list.length) return;
        body += '<tr class="qbr-bsec"><td class="qbr-c0" colspan="14">' + g[0] + '</td></tr>';
        list.forEach(function (a) {
          body += '<tr><td class="qbr-c0" style="padding-left:' + (12 + S.depth(a.id) * 14) + 'px">' + U.esc(a.name) + '</td>' + U.MON.map(function (m, i) {
            var v = (x.data[a.id] || [])[i];
            return '<td><input class="qbr-bin" data-a="' + a.id + '" data-m="' + i + '" value="' + (v ? U.num(v) : '') + '" inputmode="decimal" aria-label="' + U.esc(a.name + ' ' + m) + '"></td>';
          }).join('') + '<td class="ta-r qbr-btot" data-tot="' + a.id + '">' + U.num(rowTot(a.id)) + '</td></tr>';
        });
      });
      body += '</tbody></table>';
      el.innerHTML = '<div class="qbr-vhead"><a class="qbr-back" href="#/budgets">' + UI.icon('caretLeft') + '<span>Back to budgets</span></a></div>' +
        UI.pageHead(U.esc(x.name), { actions: UI.btn('Run Budgets vs. Actuals report', { kind: 'secondary', attrs: ' data-r-brun' }) + UI.btn('Save', { kind: 'secondary', attrs: ' data-r-bsave' }) + UI.btn('Save and close', { kind: 'primary', attrs: ' data-r-bclose' }) }) +
        '<p class="qb-muted">FY' + x.year + ' · ' + U.esc(x.interval) + ' · Profit and Loss accounts. Type an amount in any month; totals update as you go.</p>' +
        '<div class="qbr-bwrap">' + body + '</div>';
      el.addEventListener('change', function (e) {
        var inp = e.target.closest('.qbr-bin'); if (!inp) return;
        var id = inp.dataset.a, i = +inp.dataset.m, v = U.parseMoney(inp.value);
        x.data[id] = x.data[id] || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        x.data[id][i] = r2(v); inp.value = v ? U.num(v) : '';
        var td = el.querySelector('[data-tot="' + id + '"]'); if (td) td.textContent = U.num(rowTot(id));
      });
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-r-bsave]')) { UI.toast('Budget saved.'); return; }
        if (e.target.closest('[data-r-bclose]')) { UI.toast('Budget saved.'); QB.go('budgets'); return; }
        if (e.target.closest('[data-r-brun]')) runBva(x);
      });
    }
  });
})();
