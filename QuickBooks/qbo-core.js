/* ══════════════════════════════════════════════════════════
   QuickBooks Online test drive: core.
   - QB.util     money, dates, escaping
   - QB.store    the company file in memory (customers, vendors,
                 items, accounts, transactions). Nothing persists:
                 like the real test drive, a reload starts fresh.
   - QB.ledger   double-entry postings, balances, open balances
   - QB.ui       shared widgets (buttons, tables, menus, modals,
                 drawers, toasts, comboboxes, money bars)
   - QB router   hash routes  #/invoices  #/customerdetail?id=c_amy
   - shell       left rail, top bar, All apps panel, Create menu,
                 gear menu, search, bookmarks

   Views register with   QB.view('invoices', fn(params, el))
   Forms register with   QB.form('Invoice', fn(opts)) and open with
                         QB.openForm('Invoice', { cust: 'c_amy' })
   Reports register with QB.report('Profit and Loss', fn(opts))
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var QB = window.QB = window.QB || {};
  var D = window.QBO_DATA;

  /* ───────────── util ───────────── */
  var U = QB.util = {};
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  U.r2 = function (n) { return Math.round((+n || 0) * 100 + (n >= 0 ? 1e-9 : -1e-9)) / 100; };
  /* 1234.5 -> "1,234.50"; money(x, true) -> "$1,234.50"; negatives "-$1,234.50" */
  U.num = function (n) {
    n = U.r2(n);
    var neg = n < 0, s = Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + s;
  };
  U.money = function (n, sign) {
    n = U.r2(n);
    var s = Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (n < 0 ? '-' : '') + '$' + s;
  };
  U.money0 = function (n) {
    n = Math.round(+n || 0);
    return (n < 0 ? '-' : '') + '$' + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  U.parseMoney = function (s) { var v = parseFloat(String(s == null ? '' : s).replace(/[$,\s]/g, '')); return isNaN(v) ? 0 : v; };

  /* Dates are ISO strings "YYYY-MM-DD" everywhere inside the store. */
  U.today = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  U.toDate = function (iso) { var p = String(iso).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  U.iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  U.addDays = function (iso, n) { var d = U.toDate(iso); d.setDate(d.getDate() + n); return U.iso(d); };
  U.addMonths = function (iso, n) { var d = U.toDate(iso); d.setMonth(d.getMonth() + n); return U.iso(d); };
  U.diffDays = function (a, b) { return Math.round((U.toDate(a) - U.toDate(b)) / 864e5); };
  /* 2026-10-03 -> 10/03/2026 ; short -> 10/3/26 */
  U.fmtDate = function (iso, style) {
    if (!iso) return '';
    var p = iso.split('-');
    if (style === 'short') return (+p[1]) + '/' + (+p[2]) + '/' + p[0].slice(2);
    if (style === 'long') return U.MONTHS[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0];
    if (style === 'mon') return U.MON[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0];
    return p[1] + '/' + p[2] + '/' + p[0];
  };
  U.parseDate = function (s) {
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return '';
    var y = +m[3]; if (y < 100) y += 2000;
    return y + '-' + String(+m[1]).padStart(2, '0') + '-' + String(+m[2]).padStart(2, '0');
  };
  U.MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  U.MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  U.uid = (function () { var n = 1000; return function (p) { return (p || 'x') + '_' + (++n); }; })();
  U.greeting = function () { var h = new Date().getHours(); return h < 12 ? 'Good morning!' : h < 18 ? 'Good afternoon!' : 'Good evening!'; };
  U.qs = function (obj) {
    var a = []; for (var k in obj) if (obj[k] != null && obj[k] !== '') a.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]));
    return a.length ? '?' + a.join('&') : '';
  };
  U.termsDays = function (t) {
    return { 'Due on receipt': 0, 'Net 10': 10, 'Net 15': 15, 'Net 30': 30, 'Net 60': 60 }[t] != null
      ? { 'Due on receipt': 0, 'Net 10': 10, 'Net 15': 15, 'Net 30': 30, 'Net 60': 60 }[t] : 30;
  };
  U.TERMS = ['Due on receipt', 'Net 10', 'Net 15', 'Net 30', 'Net 60'];
  U.METHODS = ['Cash', 'Check', 'Credit Card', 'Debit Card', 'Direct Debit', 'Venmo', 'PayPal'];
  U.h = function (html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  U.$ = function (s, r) { return (r || document).querySelector(s); };
  U.$$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* Range presets used by list filters and reports. Returns [from, to] ISO. */
  U.range = function (key, today) {
    today = today || U.today();
    var t = U.toDate(today), y = t.getFullYear(), m = t.getMonth();
    var q = Math.floor(m / 3);
    function d(yy, mm, dd) { return U.iso(new Date(yy, mm, dd)); }
    switch (key) {
      case 'today': return [today, today];
      case 'this-week': { var s = U.addDays(today, -t.getDay()); return [s, U.addDays(s, 6)]; }
      case 'this-month': return [d(y, m, 1), d(y, m + 1, 0)];
      case 'this-month-to-date': return [d(y, m, 1), today];
      case 'last-month': return [d(y, m - 1, 1), d(y, m, 0)];
      case 'this-quarter': return [d(y, q * 3, 1), d(y, q * 3 + 3, 0)];
      case 'this-quarter-to-date': return [d(y, q * 3, 1), today];
      case 'last-quarter': return [d(y, q * 3 - 3, 1), d(y, q * 3, 0)];
      case 'this-year': return [d(y, 0, 1), d(y, 11, 31)];
      case 'this-year-to-date': return [d(y, 0, 1), today];
      case 'last-year': return [d(y - 1, 0, 1), d(y - 1, 11, 31)];
      case 'last-30': return [U.addDays(today, -30), today];
      case 'last-90': case 'last-3-months': return [U.addDays(today, -90), today];
      case 'last-6-months': return [U.addMonths(today, -6), today];
      case 'last-12-months': case 'last-365': return [U.addDays(today, -365), today];
      default: return ['1900-01-01', '2999-12-31'];
    }
  };
  U.RANGES = [
    ['all', 'All dates'], ['today', 'Today'], ['this-week', 'This week'], ['this-month', 'This month'],
    ['last-month', 'Last month'], ['this-quarter', 'This quarter'], ['last-quarter', 'Last quarter'],
    ['last-30', 'Last 30 days'], ['last-3-months', 'Last 3 months'], ['last-6-months', 'Last 6 months'],
    ['last-12-months', 'Last 12 months'], ['this-year', 'This year'], ['this-year-to-date', 'This year to date'],
    ['last-year', 'Last year']
  ];

  /* ───────────── store ───────────── */
  var S = QB.store = {
    company: null, accounts: [], acct: {}, customers: [], cust: {}, vendors: [], vend: {},
    items: [], item: {}, txns: [], txn: {}, bankFeed: {}, rules: [], recurring: [], tasks: [],
    employees: [], contractors: [], bookmarks: [], audit: [], users: [], tags: [], favorites: {},
    settings: {}, listeners: []
  };
  var SHIFT = 0;
  function sh(iso) { return iso ? U.addDays(iso, SHIFT) : iso; }

  /* Account helpers. */
  var BS_TYPES = ['Bank', 'Accounts receivable (A/R)', 'Other Current Assets', 'Fixed Assets', 'Other Assets',
    'Accounts payable (A/P)', 'Credit Card', 'Other Current Liabilities', 'Long Term Liabilities', 'Equity'];
  var DEBIT_TYPES = ['Bank', 'Accounts receivable (A/R)', 'Other Current Assets', 'Fixed Assets', 'Other Assets',
    'Cost of Goods Sold', 'Expenses', 'Other Expense'];
  QB.ACCOUNT_TYPES = BS_TYPES.concat(['Income', 'Other Income', 'Cost of Goods Sold', 'Expenses', 'Other Expense']);
  S.isBS = function (a) { a = typeof a === 'string' ? S.acct[a] : a; return a && BS_TYPES.indexOf(a.type) >= 0; };
  S.isDebit = function (a) { a = typeof a === 'string' ? S.acct[a] : a; return a && DEBIT_TYPES.indexOf(a.type) >= 0; };
  /* "Job Expenses:Job Materials:Decks and Patios" */
  S.fullName = function (id) {
    var a = S.acct[id]; if (!a) return '';
    return a.parent ? S.fullName(a.parent) + ':' + a.name : a.name;
  };
  S.depth = function (id) { var a = S.acct[id], n = 0; while (a && a.parent) { n++; a = S.acct[a.parent]; } return n; };
  S.children = function (id) { return S.accounts.filter(function (a) { return a.parent === id && a.active !== false; }); };
  S.custName = function (id) {
    var c = S.cust[id]; if (!c) return '';
    return c.parent ? S.custName(c.parent) + ':' + c.name : c.name;
  };
  S.payeeName = function (t) {
    if (!t) return '';
    if (t.cust) return S.custName(t.cust);
    if (t.payee && S.vend[t.payee]) return S.vend[t.payee].name;
    if (t.payee && S.cust[t.payee]) return S.custName(t.payee);
    return t.payeeName || '';
  };
  S.accountsBy = function (types) {
    return S.ordered().filter(function (a) { return types.indexOf(a.type) >= 0 && a.active !== false; });
  };
  /* Accounts in chart order: by type order, then name, children right under the parent. */
  S.ordered = function () {
    var order = QB.ACCOUNT_TYPES, out = [];
    function walk(list) {
      list.forEach(function (a) { out.push(a); walk(S.accounts.filter(function (c) { return c.parent === a.id; })); });
    }
    var roots = S.accounts.filter(function (a) { return !a.parent; });
    roots.sort(function (a, b) {
      var d = order.indexOf(a.type) - order.indexOf(b.type);
      return d || 0;
    });
    walk(roots);
    return out;
  };

  /* Listeners: views re-render when the store changes. */
  S.on = function (fn) { S.listeners.push(fn); };
  S.changed = function (why) { S.listeners.forEach(function (fn) { try { fn(why); } catch (e) { console.error(e); } }); };

  /* ───────────── transactions ─────────────
     Normalized transaction:
     { id, type, no, date, due, terms, cust, payee, account (bank/cc paid from or deposited to),
       lines: [{ item, acct, desc, qty, rate, amount, taxable, cust, billable }],
       subtotal, discount, taxRate, tax, total, memo, status, applied: [{ id, amount }],
       method, ref, hidden, created }                                                      */
  function lineFromSale(l) {
    var it = S.item[l[0]];
    return { item: l[0], acct: it ? it.incomeAcct : 'a_serv', desc: l[4] != null ? l[4] : (it ? it.desc : ''), qty: l[1], rate: l[2], amount: U.r2(l[1] * l[2]), taxable: !!l[3] };
  }
  /* Settles a document onto its observed total: tax first, then any gap
     lands on the last untaxed line, the way the original sample data does. */
  function settle(t, target) {
    QB.ledger.totals(t);
    if (target == null) return;
    var gap = U.r2(target - t.total);
    if (Math.abs(gap) < 0.005) return;
    var ln = null;
    for (var i = t.lines.length - 1; i >= 0; i--) if (!t.lines[i].taxable) { ln = t.lines[i]; break; }
    if (!ln) ln = t.lines[t.lines.length - 1];
    if (ln.taxable && t.taxRate) gap = U.r2(gap / (1 + t.taxRate));
    ln.amount = U.r2(ln.amount + gap);
    ln.rate = ln.qty ? U.r2(ln.amount / ln.qty) : ln.amount;
    QB.ledger.totals(t);
    if (Math.abs(target - t.total) >= 0.005) { t.tax = U.r2(t.tax + (target - t.total)); t.total = target; }
  }
  S.add = function (t, silent) {
    t.id = t.id || U.uid('t');
    t.created = t.created || Date.now();
    t.lines = t.lines || [];
    t.applied = t.applied || [];
    S.txns.push(t); S.txn[t.id] = t;
    if (!silent) {
      var sign = { 'Invoice': -1, 'Sales Receipt': -1, 'Credit Memo': 1, 'Refund': 1 }[t.type];
      if (sign) t.lines.forEach(function (l) { var it = S.item[l.item]; if (it && it.type === 'Inventory' && it.qty != null) it.qty = U.r2(it.qty + sign * (l.qty || 0)); });
      S.log('Added', t); S.changed('add');
    }
    return t;
  };
  S.update = function (t) { S.log('Edited', t); S.changed('update'); return t; };
  S.remove = function (id) {
    var t = S.txn[id]; if (!t) return;
    S.txns.splice(S.txns.indexOf(t), 1); delete S.txn[id];
    S.txns.forEach(function (o) { o.applied = (o.applied || []).filter(function (a) { return a.id !== id; }); });
    S.log('Deleted', t); S.changed('remove');
  };
  S.log = function (what, t) {
    S.audit.unshift({ when: new Date(), user: 'Craig Carlson', event: what + ' ' + t.type + (t.no ? ' ' + t.no : ''), name: S.payeeName(t), date: t.date, amount: t.total });
  };
  S.find = function (pred) { return S.txns.filter(function (t) { return !t.hidden && pred(t); }); };
  S.byNo = function (type, no, cust) {
    return S.txns.filter(function (t) { return t.type === type && t.no === no && (!cust || t.cust === cust); })[0];
  };
  S.nextNo = function (type) {
    var nums = S.txns.filter(function (t) { return t.type === type && /^\d+$/.test(t.no || ''); }).map(function (t) { return +t.no; });
    return String(nums.length ? Math.max.apply(null, nums) + 1 : 1001);
  };

  /* ───────────── ledger ───────────── */
  var L = QB.ledger = {};
  L.SALES = ['Invoice', 'Sales Receipt', 'Credit Memo', 'Refund', 'Estimate', 'Payment', 'Charge', 'Credit', 'Time Charge', 'Billable Expense Charge', 'Statement', 'Sales Order'];
  L.EXPENSE = ['Expense', 'Check', 'Cash Expense', 'Credit Card Expense', 'Credit Card Credit', 'Bill', 'Bill Payment', 'Bill Payment (Check)', 'Bill Payment (Credit Card)', 'Vendor Credit', 'Purchase Order', 'Sales Tax Payment'];
  L.NONPOSTING = ['Delayed Charge', 'Delayed Credit', 'Estimate', 'Purchase Order', 'Charge', 'Credit', 'Time Charge', 'Billable Expense Charge', 'Statement', 'Sales Order', 'Time Activity'];

  L.totals = function (t) {
    var sub = 0, taxable = 0;
    (t.lines || []).forEach(function (l) {
      l.amount = U.r2(l.amount != null ? l.amount : (l.qty || 0) * (l.rate || 0));
      sub += l.amount; if (l.taxable) taxable += l.amount;
    });
    sub = U.r2(sub);
    var disc = 0;
    if (t.discountPct) disc = U.r2(sub * t.discountPct / 100);
    else if (t.discountAmt) disc = U.r2(t.discountAmt);
    var taxBase = sub ? U.r2(taxable - (sub ? disc * taxable / sub : 0)) : 0;
    var rate = t.taxRate != null ? t.taxRate : 0;
    t.subtotal = sub; t.discount = disc; t.taxableSubtotal = U.r2(taxable);
    t.tax = t.taxOverride != null ? t.taxOverride : U.r2(taxBase * rate);
    t.total = U.r2(sub - disc + t.tax + (t.shipping || 0) - (t.depositAmt || 0) * 0);
    return t;
  };

  /* Postings: [{ acct, amt, cust, vend, desc }] with amt > 0 a debit. */
  L.postings = function (t) {
    var P = [], ty = t.type;
    function dr(acct, amt, extra) { if (Math.abs(amt) > 0.0001) P.push(Object.assign({ acct: acct, amt: U.r2(amt) }, extra || {})); }
    function cr(acct, amt, extra) { dr(acct, -amt, extra); }
    if (L.NONPOSTING.indexOf(ty) >= 0) return P;
    var name = { cust: t.cust, vend: t.payee };
    if (ty === 'Invoice' || ty === 'Sales Receipt' || ty === 'Credit Memo' || ty === 'Refund') {
      var sign = (ty === 'Credit Memo' || ty === 'Refund') ? -1 : 1;
      var target = ty === 'Invoice' ? 'a_ar' : ty === 'Credit Memo' ? 'a_ar' : ty === 'Refund' ? (t.account || 'a_chk') : (t.account || 'a_undep');
      dr(target, sign * t.total, name);
      t.lines.forEach(function (l) { cr(l.acct || 'a_serv', sign * l.amount, { cust: t.cust, desc: l.desc, item: l.item }); });
      if (t.discount) dr('a_disc', sign * t.discount, name);
      if (t.tax) cr('a_boe', sign * t.tax, name);
      /* Inventory: relieve the asset into COGS at cost. */
      t.lines.forEach(function (l) {
        var it = S.item[l.item];
        if (it && it.type === 'Inventory' && it.cost) { dr('a_cogs', sign * it.cost * l.qty); cr('a_inv', sign * it.cost * l.qty); }
      });
      return P;
    }
    if (ty === 'Payment') {
      dr(t.account || 'a_undep', t.total, name);
      cr('a_ar', t.total, name);
      return P;
    }
    if (ty === 'Deposit') {
      dr(t.account || 'a_chk', t.total);
      t.lines.forEach(function (l) { cr(l.acct || 'a_undep', l.amount, { cust: l.cust, desc: l.desc }); });
      return P;
    }
    if (ty === 'Expense' || ty === 'Check' || ty === 'Cash Expense' || ty === 'Credit Card Expense') {
      cr(t.account || 'a_chk', t.total, name);
      t.lines.forEach(function (l) { dr(l.acct || 'a_uncE', l.amount, { cust: l.cust, vend: t.payee, desc: l.desc }); });
      return P;
    }
    if (ty === 'Credit Card Credit') {
      dr(t.account || 'a_mc', t.total, name);
      t.lines.forEach(function (l) { cr(l.acct || 'a_uncE', l.amount, { desc: l.desc }); });
      return P;
    }
    if (ty === 'Bill') {
      cr('a_ap', t.total, name);
      t.lines.forEach(function (l) { dr(l.acct || 'a_uncE', l.amount, { cust: l.cust, vend: t.payee, desc: l.desc }); });
      return P;
    }
    if (ty === 'Vendor Credit') {
      dr('a_ap', t.total, name);
      t.lines.forEach(function (l) { cr(l.acct || 'a_uncE', l.amount, { vend: t.payee, desc: l.desc }); });
      return P;
    }
    if (/^Bill Payment/.test(ty)) {
      dr('a_ap', t.total, name);
      cr(t.account || 'a_chk', t.total, name);
      return P;
    }
    if (ty === 'Sales Tax Payment') {
      dr('a_boe', t.total); cr(t.account || 'a_chk', t.total);
      return P;
    }
    if (ty === 'Transfer') {
      dr(t.toAccount, t.total); cr(t.account, t.total);
      return P;
    }
    if (ty === 'Journal Entry' || ty === 'Inventory Qty Adjust') {
      t.lines.forEach(function (l) { if (l.debit) dr(l.acct, l.debit, { cust: l.cust, vend: l.vend, desc: l.desc }); if (l.credit) cr(l.acct, l.credit, { cust: l.cust, vend: l.vend, desc: l.desc }); });
      return P;
    }
    if (ty === 'Credit Card Payment') {
      dr(t.toAccount || 'a_mc', t.total); cr(t.account || 'a_chk', t.total);
      return P;
    }
    return P;
  };

  /* Balance of an account in its natural sign (assets/expenses debit-positive,
     liabilities/equity/income credit-positive). opts: {from, to, cust, vend, children} */
  L.balance = function (acctId, opts) {
    opts = opts || {};
    var ids = [acctId];
    if (opts.children !== false) (function add(id) { S.accounts.forEach(function (a) { if (a.parent === id) { ids.push(a.id); add(a.id); } }); })(acctId);
    var sum = 0;
    S.txns.forEach(function (t) {
      if (opts.from && t.date < opts.from) return;
      if (opts.to && t.date > opts.to) return;
      if (opts.cash && !L.cashBasisIncluded(t)) return;
      L.postings(t).forEach(function (p) {
        if (ids.indexOf(p.acct) < 0) return;
        if (opts.cust && p.cust !== opts.cust) return;
        sum += p.amt;
      });
    });
    return U.r2(S.isDebit(acctId) ? sum : -sum);
  };
  L.cashBasisIncluded = function (t) { return ['Invoice', 'Bill', 'Credit Memo', 'Vendor Credit'].indexOf(t.type) < 0; };
  /* All postings with their transaction, for registers and detail reports. */
  L.entries = function (filter) {
    var out = [];
    S.txns.forEach(function (t) {
      L.postings(t).forEach(function (p) { if (!filter || filter(p, t)) out.push({ t: t, p: p }); });
    });
    out.sort(function (a, b) { return a.t.date < b.t.date ? -1 : a.t.date > b.t.date ? 1 : a.t.created - b.t.created; });
    return out;
  };

  /* Open balance of a receivable/payable document after payments and credits. */
  L.applied = function (docId) {
    var sum = 0;
    S.txns.forEach(function (t) { (t.applied || []).forEach(function (a) { if (a.id === docId) sum += a.amount; }); });
    return U.r2(sum);
  };
  L.openBalance = function (t) {
    if (['Invoice', 'Bill'].indexOf(t.type) >= 0) return U.r2(t.total - L.applied(t.id));
    if (['Credit Memo', 'Vendor Credit'].indexOf(t.type) >= 0) return U.r2(-(t.total - L.applied(t.id)));
    if (t.type === 'Payment' || /^Bill Payment/.test(t.type)) {
      var used = (t.applied || []).reduce(function (s, a) { return s + (a.credit ? -a.amount : a.amount); }, 0);
      return U.r2(-(t.total - used));
    }
    return 0;
  };
  L.custBalance = function (custId, withSubs) {
    var ids = [custId];
    if (withSubs !== false) S.customers.forEach(function (c) { if (c.parent === custId) ids.push(c.id); });
    var sum = 0;
    S.txns.forEach(function (t) {
      if (ids.indexOf(t.cust) < 0 || t.hidden) return;
      if (['Invoice', 'Credit Memo', 'Payment'].indexOf(t.type) >= 0) sum += L.openBalance(t);
    });
    return U.r2(sum);
  };
  L.vendBalance = function (vendId) {
    var sum = 0;
    S.txns.forEach(function (t) {
      if (t.payee !== vendId || t.hidden) return;
      if (['Bill', 'Vendor Credit'].indexOf(t.type) >= 0) sum += L.openBalance(t);
    });
    return U.r2(sum);
  };

  /* Status text the lists show. Returns { text, sub, tone: 'overdue'|'due'|'paid'|'closed'|'open'|'deposited'|'applied' } */
  L.status = function (t, today) {
    today = today || U.today();
    var ty = t.type;
    if (ty === 'Invoice') {
      var open = L.openBalance(t);
      if (open <= 0.004) {
        var deposited = L.isDeposited(t);
        return deposited ? { text: 'Deposited', tone: 'deposited' } : { text: 'Paid', tone: 'paid' };
      }
      var dd = U.diffDays(t.due, today), partial = open < t.total - 0.004;
      var sub = partial ? 'Partially paid, ' + U.money(open) + ' due' : '';
      if (dd < 0) return { text: 'Overdue ' + (-dd) + ' day' + (dd === -1 ? '' : 's'), sub: sub, tone: 'overdue' };
      if (dd === 0) return { text: 'Due today', sub: sub, tone: 'due' };
      if (dd === 1) return { text: 'Due tomorrow', sub: sub, tone: 'due' };
      return { text: 'Due in ' + dd + ' days', sub: sub, tone: 'due' };
    }
    if (ty === 'Bill') {
      var ob = L.openBalance(t);
      if (ob <= 0.004) return { text: 'Paid', tone: 'paid' };
      var d2 = U.diffDays(t.due, today);
      if (d2 < 0) return { text: 'Overdue', sub: (-d2) + ' days ago', tone: 'overdue' };
      if (d2 <= 7) return { text: 'Due soon', sub: d2 === 0 ? 'Due today' : 'Due in ' + d2 + ' day' + (d2 === 1 ? '' : 's'), tone: 'due' };
      return { text: 'Due later', sub: 'Due in ' + d2 + ' days', tone: 'open' };
    }
    if (ty === 'Payment') return { text: 'Closed', tone: 'closed' };
    if (ty === 'Sales Receipt' || ty === 'Refund') return { text: 'Paid', tone: 'paid' };
    if (ty === 'Credit Memo') return L.openBalance(t) < -0.004 ? { text: 'Unapplied', tone: 'open' } : { text: 'Applied', tone: 'closed' };
    if (ty === 'Estimate') return { text: t.status || 'Pending', tone: t.status === 'Closed' || t.status === 'Converted' || t.status === 'Rejected' ? 'closed' : 'open' };
    if (ty === 'Purchase Order') return { text: t.status || 'Open', tone: t.status === 'Closed' ? 'closed' : 'open' };
    if (['Time Charge', 'Charge', 'Credit', 'Billable Expense Charge'].indexOf(ty) >= 0) return { text: t.status || 'Open', tone: t.status === 'Open' ? 'open' : 'closed' };
    return { text: '', tone: '' };
  };
  /* A payment counts as deposited once it no longer sits in Undeposited Funds. */
  L.isDeposited = function (inv) {
    var pays = S.txns.filter(function (t) { return t.type === 'Payment' && (t.applied || []).some(function (a) { return a.id === inv.id && a.amount > 0; }); });
    if (!pays.length) return false;
    return pays.every(function (p) { return p.account !== 'a_undep' || p.deposited; });
  };

  /* ───────────── load the sample company ───────────── */
  function load() {
    SHIFT = U.diffDays(U.today(), D.BASE_DATE);
    S.company = Object.assign({}, D.company);
    S.accounts = []; S.acct = {};
    D.accounts.forEach(function (r) {
      var a = { id: r[0], name: r[1], parent: r[2], type: r[3], detail: r[4], target: r[5], bankBalance: r[6], active: true, desc: '' };
      S.accounts.push(a); S.acct[a.id] = a;
    });
    S.customers = []; S.cust = {};
    D.customers.forEach(function (r) {
      var c = { id: r[0], name: r[1], company: r[2], parent: r[3], phone: r[4], email: r[5], street: r[6], city: r[7], state: { c_pye: 'NJ', c_sushi: 'NJ', c_dukes: 'AZ', c_video: 'AZ' }[r[0]] || (r[6] ? 'CA' : ''), zip: r[8], first: r[9], last: r[10], active: true, notes: '', terms: 'Net 30', taxable: true, type: '' };
      S.customers.push(c); S.cust[c.id] = c;
    });
    S.vendors = []; S.vend = {};
    D.vendors.forEach(function (r) {
      var v = { id: r[0], name: r[1], company: r[2], phone: r[3], email: r[4], street: r[5], city: r[6], state: r[5] ? 'CA' : '', zip: r[7], track1099: r[8], active: true, terms: 'Net 30', notes: '' };
      S.vendors.push(v); S.vend[v.id] = v;
    });
    S.items = []; S.item = {};
    D.items.forEach(function (r) {
      var it = { id: r[0], name: r[1], desc: r[2], category: r[3], sku: r[4], type: r[5], price: r[6], cost: r[7], qty: r[8], incomeAcct: r[9], expenseAcct: r[10], taxable: r[11], active: true, reorder: null, purchDesc: '' };
      S.items.push(it); S.item[it.id] = it;
    });
    S.txns = []; S.txn = {};
    var tax = D.company.taxRates[0].rate;
    var invByKey = {};

    D.sales.forEach(function (s) {
      var t = { type: s.type, no: s.no, date: sh(s.date), cust: s.cust, memo: s.memo || '', status: s.status, terms: s.terms, lines: s.lines.map(lineFromSale), taxRate: tax, account: s.depositTo || s.payFrom, hours: s.hours };
      if (t.type === 'Refund') t.account = s.payFrom;
      if (t.terms) t.due = U.addDays(t.date, U.termsDays(t.terms));
      if (t.type === 'Estimate') t.expires = U.addDays(t.date, 30);
      settle(t, s.total);
      S.add(t, true);
      if (t.type === 'Invoice' || t.type === 'Credit Memo') invByKey[t.type + t.no] = t;
    });
    D.payments.forEach(function (p) {
      var t = { type: 'Payment', no: p.no, date: sh(p.date), cust: p.cust, total: p.amount, account: p.depositTo, memo: p.memo || '', method: p.no ? 'Check' : '', lines: [], applied: [] };
      p.apply.forEach(function (a) {
        var doc = invByKey['Invoice' + a[0]] || invByKey['Credit Memo' + a[0]];
        if (doc) t.applied.push(a[1] < 0 ? { id: doc.id, amount: Math.abs(a[1]), credit: true } : { id: doc.id, amount: a[1] });
      });
      S.add(t, true);
    });
    /* Mark payments that sit in deposits as deposited, by amount. */
    D.deposits.forEach(function (d) {
      var t = { type: 'Deposit', no: '', date: sh(d.date), account: d.account, total: d.total, memo: d.memo, lines: d.lines.map(function (l) { return { acct: l[0], amount: l[1], desc: l[2] }; }) };
      S.add(t, true);
    });
    S.txns.forEach(function (t) {
      if ((t.type === 'Payment' || t.type === 'Sales Receipt') && t.account === 'a_undep' && U.diffDays(U.today(), t.date) > 26) t.deposited = true;
    });
    D.expenses.forEach(function (e) {
      var t = { type: e.type, no: e.no, date: sh(e.date), payee: e.payee, account: e.payFrom, memo: e.memo || '', lines: e.lines.map(function (l) { return { acct: l[0], amount: l[1], desc: l[2] || '', cust: l[3] || '' }; }), method: e.type === 'Check' ? 'Check' : '' };
      t.total = U.r2(t.lines.reduce(function (s, l) { return s + l.amount; }, 0));
      if (e.type === 'Credit Card Credit') t.lines = [{ acct: 'a_chk', amount: e.total, desc: 'Payment' }];
      S.add(t, true);
    });
    var billsByVend = {};
    D.bills.forEach(function (b) {
      var t = { type: 'Bill', no: b.no, date: sh(b.date), due: sh(b.dueDate), terms: b.terms, payee: b.payee, memo: '', lines: b.lines.map(function (l) { return { acct: l[0], amount: l[1], desc: l[2] || '', cust: l[3] || '', billable: !!l[3] }; }) };
      t.total = b.total;
      S.add(t, true);
      (billsByVend[b.payee] = billsByVend[b.payee] || []).push(t);
    });
    D.billPayments.forEach(function (p) {
      var t = { type: p.cc ? 'Bill Payment (Credit Card)' : 'Bill Payment', no: p.no, date: sh(p.date), payee: p.payee, account: p.payFrom, total: p.amount, lines: [], applied: [] };
      p.apply.forEach(function (a) {
        var bill = (billsByVend[a[0]] || []).filter(function (b) { return Math.abs(b.total - a[1]) < 0.005 && L.applied(b.id) < 0.005; })[0];
        if (bill) t.applied.push({ id: bill.id, amount: a[1] });
      });
      S.add(t, true);
    });
    D.purchaseOrders.forEach(function (p) {
      S.add({ type: 'Purchase Order', no: p.no, date: sh(p.date), payee: p.payee, total: p.total, status: p.status, lines: p.lines.map(function (l) { return { acct: l[0], amount: l[1], desc: l[2] || '' }; }) }, true);
    });
    D.taxPayments.forEach(function (p) {
      S.add({ type: 'Sales Tax Payment', no: '', date: sh(p.date), account: p.payFrom, total: p.total, memo: p.memo, lines: [] }, true);
    });

    /* Month-level calibration (hidden), so the Home P&L card opens on the observed month. */
    (D.calTargets || []).forEach(function (c, ci) {
      var from = sh(c.from), to = sh(c.to);
      var mj = { type: 'Journal Entry', no: 'CAL-' + (ci + 1), date: from, memo: 'Period calibration', hidden: true, system: true, lines: [] };
      var types = c.group === 'income' ? ['Income', 'Other Income'] : ['Expenses', 'Cost of Goods Sold', 'Other Expense'];
      var accs = S.accounts.filter(function (a) { return types.indexOf(a.type) >= 0; });
      var vals = accs.map(function (a) { return L.balance(a.id, { from: from, to: to, children: false }); });
      var cur = U.r2(vals.reduce(function (x, y) { return x + y; }, 0));
      if (Math.abs(cur) < 0.01) return;
      var k = c.target / cur, off = 0, sum = 0;
      function post(a, gap) {
        if (Math.abs(gap) < 0.005) return;
        sum += gap;
        if (S.isDebit(a)) { mj.lines.push({ acct: a.id, debit: gap > 0 ? gap : 0, credit: gap < 0 ? -gap : 0 }); off -= gap; }
        else { mj.lines.push({ acct: a.id, credit: gap > 0 ? gap : 0, debit: gap < 0 ? -gap : 0 }); off += gap; }
      }
      accs.forEach(function (a, i) { post(a, U.r2(vals[i] * k - vals[i])); });
      var big = accs[vals.indexOf(Math.max.apply(null, vals))];
      post(big, U.r2(c.target - (cur + sum)));
      off = U.r2(off);
      if (Math.abs(off) > 0.004) mj.lines.push(off > 0 ? { acct: 'a_chk', debit: off, credit: 0 } : { acct: 'a_chk', debit: 0, credit: -off });
      if (mj.lines.length) S.add(mj, true);
    });

    /* Summarized January to June activity so YTD P&L opens on the observed numbers. */
    var yStart = U.toDate(U.today()).getFullYear() + '-01-01';
    var sumDate = U.toDate(U.today()).getFullYear() + '-06-30';
    var je = { type: 'Journal Entry', no: 'SUM-1', date: sumDate, memo: 'Summarized activity, January to June', hidden: true, lines: [], system: true };
    var plOffset = 0;
    S.accounts.filter(function (a) { return !S.isBS(a); }).forEach(function (a) {
      var id = a.id;
      var now = L.balance(id, { from: yStart, children: false });
      var gap = U.r2((D.ytdTargets[id] || 0) - now);
      if (Math.abs(gap) < 0.005) return;
      if (S.isDebit(id)) { je.lines.push({ acct: id, debit: gap > 0 ? gap : 0, credit: gap < 0 ? -gap : 0 }); plOffset -= gap; }
      else { je.lines.push({ acct: id, credit: gap > 0 ? gap : 0, debit: gap < 0 ? -gap : 0 }); plOffset += gap; }
    });
    plOffset = U.r2(plOffset);
    if (Math.abs(plOffset) > 0.004) je.lines.push(plOffset > 0 ? { acct: 'a_chk', debit: plOffset, credit: 0 } : { acct: 'a_chk', debit: 0, credit: -plOffset });
    S.add(je, true);

    /* Opening balances so every balance sheet account lands on the observed number. */
    var ob = { type: 'Journal Entry', no: 'OB-1', date: (U.toDate(U.today()).getFullYear() - 1) + '-12-31', memo: 'Opening balances', hidden: true, lines: [], system: true };
    var off = 0;
    S.accounts.forEach(function (a) {
      if (a.target == null || !S.isBS(a)) return;
      var now = L.balance(a.id, { children: false });
      var gap = U.r2(a.target - now);
      if (Math.abs(gap) < 0.005) return;
      if (S.isDebit(a)) { ob.lines.push({ acct: a.id, debit: gap > 0 ? gap : 0, credit: gap < 0 ? -gap : 0 }); off -= gap; }
      else { ob.lines.push({ acct: a.id, credit: gap > 0 ? gap : 0, debit: gap < 0 ? -gap : 0 }); off += gap; }
    });
    off = U.r2(off);
    if (Math.abs(off) > 0.004) ob.lines.push(off > 0 ? { acct: 'a_re', debit: off, credit: 0 } : { acct: 'a_re', debit: 0, credit: -off });
    S.add(ob, true);

    /* Bank feed. */
    S.bankFeed = {};
    Object.keys(D.bankFeed).forEach(function (acc) {
      S.bankFeed[acc] = D.bankFeed[acc].map(function (r, i) {
        var f = { id: 'bf_' + acc + i, account: acc, date: sh(r[0]), desc: r[1], spent: r[2], received: r[3], kind: r[4], hint: r[5], side: r[6] || (r[2] ? 'vendor' : 'customer'), warn: r[7] === 'warn', state: 'pending', payee: '', category: '', memo: '' };
        if (f.hint) {
          var h = f.hint;
          var cands = S.txns.filter(function (t) {
            if (t.hidden || t.type !== h.type) return false;
            if (Math.abs(t.total - h.amount) > 0.005) return false;
            if (h.no && t.no !== h.no) return false;
            return true;
          });
          f.matches = cands.map(function (t) { return t.id; });
          if (h.multi && f.matches.length < h.multi) f.matches = f.matches.concat(f.matches);
        }
        return f;
      });
    });
    S.rules = JSON.parse(JSON.stringify(D.rules));
    S.recurring = D.recurring.map(function (r) { return Object.assign({}, r, { prev: sh(r.prev), next: sh(r.next) }); });
    S.contractors = JSON.parse(JSON.stringify(D.contractors));
    S.employees = [];
    S.tasks = [];
    S.bookmarks = [
      { label: 'Invoices', route: 'invoices' }, { label: 'Expense transactions', route: 'expenses' },
      { label: 'Bank transactions', route: 'banking' }, { label: 'Reports', route: 'standardreports' }
    ];
    S.users = [{ name: 'Craig Carlson', email: 'craig@craigsdesign.example', role: 'Primary admin', status: 'Active' }];
    S.favorites = { 'Accounts receivable aging summary': true, 'Balance Sheet': true, 'Profit and Loss': true };
    S.settings = {
      preferredTerms: 'Net 30', deliveryMethod: 'Print later', shipping: false, customTxnNumbers: false, serviceDate: false,
      discount: true, deposit: false, tips: false, tags: true, showProductColumn: true, showSku: false, priceRules: false,
      trackQty: true, trackInventory: true, lateFees: false, itemsOnExpense: true, tagsOnExpense: true, trackByCustomer: true,
      billable: true, usePO: true, fiscalMonth: 'January', taxYear: 'Same as fiscal year', method: 'Accrual', closeBooks: false,
      acctNumbers: false, classes: false, locations: false, prefill: true, autoCredits: true, autoInvoiceUnbilled: false,
      autoBillPayments: true, projects: false, currency: 'United States Dollar', multicurrency: false, network: true,
      dateFormat: 'mm/dd/yyyy', numberFormat: '123,456.00', customerLabel: 'Customers', warnDuplicateCheck: true,
      warnDuplicateBill: false, signOutAfter: '3 hours'
    };
    S.audit = [];
  }

  /* ───────────── ui ───────────── */
  var UI = QB.ui = {};
  UI.icon = function (name, cls) {
    var p = ICONS[name] || ICONS.dot;
    return '<svg class="qb-ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  };
  var ICONS = {
    dot: '<circle cx="12" cy="12" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    plusCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    bookmark: '<path d="M7 4h10v16l-5-3.5L7 20z"/>',
    home: '<path d="M4 11.5 12 5l8 6.5V20H4z"/><path d="M10 20v-5h4v5"/>',
    feed: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>',
    reports: '<path d="M4 20V4M4 20h16"/><path d="m7 15 4-5 3 3 5-6"/>',
    apps: '<circle cx="6" cy="6" r="1.3"/><circle cx="12" cy="6" r="1.3"/><circle cx="18" cy="6" r="1.3"/><circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/><circle cx="6" cy="18" r="1.3"/><circle cx="12" cy="18" r="1.3"/><circle cx="18" cy="18" r="1.3"/>',
    customize: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    caretDown: '<path d="m6 9 6 6 6-6"/>',
    caretUp: '<path d="m6 15 6-6 6 6"/>',
    caretRight: '<path d="m9 6 6 6-6 6"/>',
    caretLeft: '<path d="m15 6-6 6 6 6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="16.5" r=".6" fill="currentColor"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r=".6" fill="currentColor"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M7 14h10v7H7z"/>',
    export: '<path d="M14 3h7v7"/><path d="M21 3 11 13"/><path d="M19 14v6H4V5h6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
    filter: '<path d="M4 5h16l-6 7v6l-4 2v-8z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    kebab: '<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3"/><path d="M5 3v5h5M19 21v-5h-5"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    attach: '<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
    comment: '<path d="M4 5h16v11H8l-4 4z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="M12 8l1.2 2.8L16 12l-2.8 1.2L12 16l-1.2-2.8L8 12l2.8-1.2z"/>',
    bank: '<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
    card: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    store: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v2a3 3 0 0 1-5.3 1.9A3 3 0 0 1 12 14a3 3 0 0 1-2.7-1.1A3 3 0 0 1 4 11z"/><path d="M5 13v7h14v-7"/><path d="M10 20v-4h4v4"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a15 15 0 0 1-3.2 3.7M6.6 6.6A15 15 0 0 0 3 12s4 6 9 6a9 9 0 0 0 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    drag: '<circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
    phoneDev: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 4 6"/>',
    doc: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z" fill="currentColor"/>',
    diamond: '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 16 3-16"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    collapse: '<path d="M4 6h16M4 12h10M4 18h16"/><path d="m20 10-3 2 3 2"/>',
    chat: '<path d="M5 5h14v10H9l-4 4z"/><path d="M9 10h6"/>',
    truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
    box: '<path d="M3 8 12 3l9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'
  };
  QB.ICONS = ICONS;

  /* Buttons. kind: primary | secondary | tertiary | link */
  UI.btn = function (label, opts) {
    opts = opts || {};
    var cls = 'qb-btn qb-btn-' + (opts.kind || 'secondary') + (opts.cls ? ' ' + opts.cls : '');
    return '<button type="button" class="' + cls + '"' + (opts.id ? ' id="' + opts.id + '"' : '') + (opts.act ? ' data-act="' + opts.act + '"' : '') + (opts.disabled ? ' disabled' : '') + (opts.attrs || '') + '>' + (opts.icon ? UI.icon(opts.icon) : '') + '<span>' + U.esc(label) + '</span></button>';
  };
  /* Split button: [ Label | v ]  menu items: [[label, act]] */
  UI.split = function (label, items, opts) {
    opts = opts || {};
    var id = U.uid('sp');
    return '<span class="qb-split qb-split-' + (opts.kind || 'primary') + '" id="' + id + '">' +
      '<button type="button" class="qb-btn qb-btn-' + (opts.kind || 'primary') + '" data-act="' + (opts.act || '') + '">' + U.esc(label) + '</button>' +
      '<button type="button" class="qb-btn qb-btn-' + (opts.kind || 'primary') + ' qb-split-caret" data-menu=\'' + U.esc(JSON.stringify(items || [])) + '\' aria-label="More options">' + UI.icon('caretDown') + '</button></span>';
  };
  /* Dropdown-looking select. opts: [[value,label]] */
  UI.select = function (name, options, value, attrs) {
    return '<span class="qb-select"><select name="' + name + '"' + (attrs || '') + '>' + options.map(function (o) {
      if (typeof o === 'string') o = [o, o];
      return '<option value="' + U.esc(o[0]) + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + U.esc(o[1]) + '</option>';
    }).join('') + '</select>' + UI.icon('caretDown', 'qb-select-caret') + '</span>';
  };
  UI.field = function (label, inner, cls) {
    return '<label class="qb-field ' + (cls || '') + '"><span class="qb-label">' + U.esc(label) + '</span>' + inner + '</label>';
  };
  UI.input = function (name, value, attrs) {
    return '<input class="qb-input" name="' + name + '" value="' + U.esc(value == null ? '' : value) + '"' + (attrs || '') + '>';
  };
  UI.dateInput = function (name, iso, attrs) {
    return '<span class="qb-date"><input class="qb-input" name="' + name + '" value="' + U.esc(iso ? U.fmtDate(iso) : '') + '" placeholder="mm/dd/yyyy"' + (attrs || '') + '>' + UI.icon('calendar') + '</span>';
  };
  UI.toggle = function (name, on) {
    return '<label class="qb-toggle"><input type="checkbox" name="' + name + '"' + (on ? ' checked' : '') + '><i></i></label>';
  };
  UI.chip = function (label, act) { return '<span class="qb-chip">' + U.esc(label) + (act ? '<button type="button" data-act="' + act + '" aria-label="Remove">' + UI.icon('close') + '</button>' : '') + '</span>'; };
  UI.statusHtml = function (s) {
    if (!s || !s.text) return '';
    var ic = s.tone === 'overdue' ? '<span class="qb-st-ic qb-st-over">!</span>' :
      s.tone === 'paid' || s.tone === 'closed' || s.tone === 'deposited' ? '<span class="qb-st-ic qb-st-ok">' + UI.icon('check') + '</span>' :
      s.tone === 'due' && /soon/i.test(s.text) ? '<span class="qb-st-ic qb-st-clock">' + UI.icon('clock') + '</span>' : '';
    return '<div class="qb-status qb-status-' + s.tone + '">' + ic + '<div><div>' + U.esc(s.text) + '</div>' + (s.sub ? '<div class="qb-status-sub">' + U.esc(s.sub) + '</div>' : '') + '</div></div>';
  };

  /* Money bar: segments [{ label, amount, count, color, flex }] grouped in blocks
     [{ title, segs }] — the strip on Invoices, Customers, Vendors. */
  UI.moneyBar = function (blocks, variant) {
    return '<div class="qb-mbar ' + (variant || '') + '">' + blocks.map(function (b) {
      return '<div class="qb-mbar-block" style="flex:' + (b.flex || 1) + '">' + (b.title ? '<div class="qb-mbar-title">' + b.title + '</div>' : '') +
        '<div class="qb-mbar-row">' + b.segs.map(function (s) {
          return '<div class="qb-mbar-seg' + (s.act ? ' is-click' : '') + '" style="flex:' + (s.flex || 1) + ';--seg:' + s.color + '"' + (s.act ? ' data-act="' + s.act + '"' : '') + '>' +
            '<div class="qb-mbar-amt">' + s.amount + '</div><div class="qb-mbar-lbl">' + s.label + '</div>' +
            '<div class="qb-mbar-bar" style="background:' + s.color + '"></div></div>';
        }).join('') + '</div></div>';
    }).join('') + '</div>';
  };

  /* Data table.
     cols: [{ key, label, align, width, sort: fn|key, render: fn(row) -> html, cls }]
     opts: { rows, check: true, rowAct: fn(row) -> act string, empty, sortKey, sortDir, footer: html, pageSize } */
  var TABLE_STATE = {};
  UI.table = function (el, cols, rows, opts) {
    opts = opts || {};
    var tkey = opts.key || ((QB.route && QB.route.name) + '|' + cols.map(function (c) { return c.key; }).join(','));
    var state = el._qbt || TABLE_STATE[tkey] || { sortKey: opts.sortKey, sortDir: opts.sortDir || 'asc', page: 0, checked: {} };
    el._qbt = state; TABLE_STATE[tkey] = state;
    function draw() {
      var data = rows.slice();
      if (state.sortKey) {
        var col = cols.filter(function (c) { return c.key === state.sortKey; })[0];
        if (col) {
          var get = typeof col.sort === 'function' ? col.sort : function (r) { var v = r[col.sort || col.key]; return v == null ? '' : v; };
          data.sort(function (a, b) {
            var x = get(a), y = get(b);
            if (typeof x === 'string') x = x.toLowerCase(); if (typeof y === 'string') y = y.toLowerCase();
            return (x < y ? -1 : x > y ? 1 : 0) * (state.sortDir === 'asc' ? 1 : -1);
          });
        }
      }
      var size = opts.pageSize || 0, total = data.length, pages = size ? Math.max(1, Math.ceil(total / size)) : 1;
      if (state.page >= pages) state.page = pages - 1;
      var shown = size ? data.slice(state.page * size, state.page * size + size) : data;
      var h = '<div class="qb-table-wrap"><table class="qb-table' + (opts.cls ? ' ' + opts.cls : '') + '"><thead><tr>' +
        (opts.check ? '<th class="qb-col-chk"><input type="checkbox" data-chk="all" aria-label="Select all"></th>' : '') +
        cols.map(function (c) {
          var sorted = state.sortKey === c.key;
          return '<th class="' + (c.align === 'right' ? 'ta-r ' : c.align === 'center' ? 'ta-c ' : '') + (c.sort !== false && c.label ? 'is-sort ' : '') + (c.cls || '') + '"' + (c.width ? ' style="width:' + c.width + '"' : '') + (c.sort !== false && c.label ? ' data-sort="' + c.key + '"' : '') + '>' +
            '<span>' + c.label + '</span>' + (sorted ? UI.icon(state.sortDir === 'asc' ? 'arrowUp' : 'arrowDown', 'qb-sort-ic') : '') + '</th>';
        }).join('') + '</tr></thead><tbody>';
      if (!shown.length) h += '<tr class="qb-empty-row"><td colspan="' + (cols.length + (opts.check ? 1 : 0)) + '">' + (opts.empty || 'No transactions found') + '</td></tr>';
      shown.forEach(function (r, i) {
        var rid = r.id || ('r' + i);
        h += '<tr data-rid="' + U.esc(rid) + '"' + ((opts.rowAct || r._cls) ? ' class="' + (opts.rowAct ? 'is-click ' : '') + (r._cls || '') + '"' : '') + (opts.rowAct ? ' data-act="' + U.esc(opts.rowAct(r)) + '"' : '') + '>' +
          (opts.check ? '<td class="qb-col-chk"><input type="checkbox" data-chk="' + U.esc(rid) + '"' + (state.checked[rid] ? ' checked' : '') + '></td>' : '') +
          cols.map(function (c) {
            var v = c.render ? c.render(r) : U.esc(r[c.key] == null ? '' : r[c.key]);
            return '<td class="' + (c.align === 'right' ? 'ta-r ' : c.align === 'center' ? 'ta-c ' : '') + (c.cls || '') + '">' + v + '</td>';
          }).join('') + '</tr>';
      });
      h += '</tbody>' + (opts.footer ? '<tfoot>' + opts.footer + '</tfoot>' : '') + '</table></div>';
      if (size && total > size || opts.pager) {
        var a = total ? state.page * size + 1 : 0, b = Math.min(total, (state.page + 1) * (size || total));
        h += '<div class="qb-pager"><button type="button" data-pg="first"' + (state.page ? '' : ' disabled') + '>First</button><button type="button" data-pg="prev"' + (state.page ? '' : ' disabled') + '>Previous</button><span>' + a + '-' + b + ' of ' + total + '</span><button type="button" data-pg="next"' + (state.page < pages - 1 ? '' : ' disabled') + '>Next</button><button type="button" data-pg="last"' + (state.page < pages - 1 ? '' : ' disabled') + '>Last</button></div>';
      }
      el.innerHTML = h;
      el.onclick = function (e) {
        var th = e.target.closest('th[data-sort]');
        if (th) { var k = th.dataset.sort; if (state.sortKey === k) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; else { state.sortKey = k; state.sortDir = 'asc'; } draw(); return; }
        var pg = e.target.closest('[data-pg]');
        if (pg) { var p = pg.dataset.pg; state.page = p === 'first' ? 0 : p === 'prev' ? state.page - 1 : p === 'next' ? state.page + 1 : pages - 1; draw(); return; }
        var chk = e.target.closest('[data-chk]');
        if (chk) {
          e.stopPropagation();
          if (chk.dataset.chk === 'all') { shown.forEach(function (r, i) { state.checked[r.id || ('r' + i)] = chk.checked; }); draw(); }
          else state.checked[chk.dataset.chk] = chk.checked;
          if (opts.onCheck) opts.onCheck(Object.keys(state.checked).filter(function (k) { return state.checked[k]; }));
          return;
        }
      };
    }
    draw();
    return { redraw: draw, state: state, checked: function () { return Object.keys(state.checked).filter(function (k) { return state.checked[k]; }); } };
  };

  /* Popover menu anchored to an element. items: [[label, act]] or [{label, act, sep, head, disabled}] */
  var openMenu = null;
  UI.closeMenus = function () { if (openMenu) { openMenu.remove(); openMenu = null; } };
  UI.menu = function (anchor, items, opts) {
    UI.closeMenus();
    opts = opts || {};
    var m = document.createElement('div');
    m.className = 'qb-menu' + (opts.cls ? ' ' + opts.cls : '');
    m.innerHTML = items.map(function (it) {
      if (Array.isArray(it)) it = { label: it[0], act: it[1] };
      if (it.sep) return '<div class="qb-menu-sep"></div>';
      if (it.head) return '<div class="qb-menu-head">' + U.esc(it.head) + '</div>';
      return '<button type="button" class="qb-menu-item"' + (it.disabled ? ' disabled' : '') + ' data-act="' + U.esc(it.act || '') + '">' + U.esc(it.label) + (it.badge ? ' <span class="qb-badge">' + it.badge + '</span>' : '') + '</button>';
    }).join('');
    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect();
    var w = m.offsetWidth, top = r.bottom + 4, left = opts.alignLeft ? r.left : r.right - w;
    if (left < 8) left = 8; if (left + w > innerWidth - 8) left = innerWidth - w - 8;
    if (top + m.offsetHeight > innerHeight - 8) top = Math.max(8, r.top - m.offsetHeight - 4);
    m.style.top = top + 'px'; m.style.left = left + 'px';
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      UI.closeMenus();
      if (opts.onPick) opts.onPick(b.dataset.act); else QB.act(b.dataset.act, b);
    });
    m._born = Date.now();
    openMenu = m;
    return m;
  };

  /* Toast at the top center, the way QuickBooks confirms a save. */
  UI.toast = function (msg, tone) {
    var host = document.getElementById('qbToasts');
    var t = document.createElement('div');
    t.className = 'qb-toast qb-toast-' + (tone || 'ok');
    t.innerHTML = (tone === 'err' ? UI.icon('alert') : UI.icon('checkCircle')) + '<span>' + U.esc(msg) + '</span><button type="button" aria-label="Close">' + UI.icon('close') + '</button>';
    host.appendChild(t);
    t.querySelector('button').onclick = function () { t.remove(); };
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }, 3800);
  };

  /* Centered dialog. Returns the dialog element; opts.buttons [[label, kind, fn]] */
  UI.modal = function (title, body, opts) {
    opts = opts || {};
    var ov = document.createElement('div');
    ov.className = 'qb-modal-ov';
    ov.innerHTML = '<div class="qb-modal' + (opts.wide ? ' is-wide' : '') + (opts.cls ? ' ' + opts.cls : '') + '" role="dialog" aria-modal="true">' +
      '<div class="qb-modal-head"><h2>' + U.esc(title) + '</h2><button type="button" class="qb-x" data-close aria-label="Close">' + UI.icon('close') + '</button></div>' +
      '<div class="qb-modal-body">' + body + '</div>' +
      (opts.buttons ? '<div class="qb-modal-foot">' + opts.buttons.map(function (b, i) { return '<button type="button" class="qb-btn qb-btn-' + (b[1] || 'secondary') + '" data-mb="' + i + '">' + U.esc(b[0]) + '</button>'; }).join('') + '</div>' : '') +
      '</div>';
    document.getElementById('qbLayer').appendChild(ov);
    function close() { ov.remove(); if (opts.onClose) opts.onClose(); }
    ov.addEventListener('click', function (e) {
      if (e.target === ov && !opts.sticky) return close();
      if (e.target.closest('[data-close]')) return close();
      var b = e.target.closest('[data-mb]');
      if (b) { var fn = opts.buttons[+b.dataset.mb][2]; if (!fn || fn(ov.querySelector('.qb-modal'), close) !== false) close(); }
    });
    var m = ov.querySelector('.qb-modal'); m.close = close;
    return m;
  };
  UI.confirm = function (title, text, okLabel, fn) {
    return UI.modal(title, '<p>' + U.esc(text) + '</p>', { buttons: [['Cancel', 'secondary'], [okLabel || 'Yes', 'primary', fn]] });
  };

  /* Right drawer (New customer, New vendor, Product/service, New account). */
  UI.drawer = function (title, body, opts) {
    opts = opts || {};
    var ov = document.createElement('div');
    ov.className = 'qb-drawer-ov';
    ov.innerHTML = '<aside class="qb-drawer' + (opts.wide ? ' is-wide' : '') + '"><div class="qb-drawer-head"><h2>' + U.esc(title) + '</h2><button type="button" class="qb-x" data-close aria-label="Close">' + UI.icon('close') + '</button></div><div class="qb-drawer-body">' + body + '</div>' +
      '<div class="qb-drawer-foot">' + UI.btn('Cancel', { kind: 'secondary', attrs: ' data-close' }) + (opts.save !== false ? UI.btn(opts.saveLabel || 'Save', { kind: 'primary', attrs: ' data-save' }) : '') + '</div></aside>';
    document.getElementById('qbLayer').appendChild(ov);
    var d = ov.querySelector('.qb-drawer');
    function close() { ov.classList.add('out'); setTimeout(function () { ov.remove(); }, 180); }
    d.close = close;
    ov.addEventListener('click', function (e) {
      if (e.target === ov || e.target.closest('[data-close]')) return close();
      if (e.target.closest('[data-save]')) { if (!opts.onSave || opts.onSave(d) !== false) close(); }
    });
    return d;
  };

  /* Full-screen form frame used by every transaction form.
     opts: { title, tabs:[label], right: html (header extras), body: html, footer: { left, center, right } }
     Returns the frame element; frame.close() asks before discarding changes. */
  UI.formFrame = function (opts) {
    var ov = document.createElement('div');
    ov.className = 'qb-form-ov';
    ov.innerHTML = '<div class="qb-form' + (opts.cls ? ' ' + opts.cls : '') + '">' +
      '<header class="qb-form-head"><span class="qb-form-hist" title="Recent transactions">' + UI.icon('history') + '</span><h1>' + U.esc(opts.title) + '</h1><span class="qb-grow"></span>' + (opts.right || '') +
      '<button type="button" class="qb-form-ic" data-fact="help" aria-label="Help">' + UI.icon('help') + '</button><button type="button" class="qb-form-ic qb-ai-btn" data-fact="ai" aria-label="Assistant">' + UI.icon('sparkle') + '</button>' +
      '<button type="button" class="qb-form-ic" data-fact="close" aria-label="Close">' + UI.icon('close') + '</button></header>' +
      (opts.tabs ? '<nav class="qb-form-tabs">' + opts.tabs.map(function (t, i) { return '<button type="button" class="' + (i ? '' : 'on') + '" data-ftab="' + i + '">' + U.esc(t) + '</button>'; }).join('') + '<span class="qb-grow"></span>' + (opts.tabsRight || '') + '</nav>' : '') +
      '<div class="qb-form-body">' + opts.body + '</div>' +
      '<footer class="qb-form-foot"><div class="qb-form-foot-l">' + (opts.footer && opts.footer.left || '') + '</div><div class="qb-form-foot-c">' + (opts.footer && opts.footer.center || '') + '</div><div class="qb-form-foot-r">' + (opts.footer && opts.footer.right || '') + '</div></footer>' +
      '</div>';
    document.getElementById('qbLayer').appendChild(ov);
    var f = ov.querySelector('.qb-form');
    f.dirty = false;
    f.addEventListener('input', function () { f.dirty = true; });
    f.addEventListener('change', function () { f.dirty = true; });
    f.close = function (force) {
      if (f.dirty && !force) {
        UI.modal('Do you want to leave without saving?', '<p>You have unsaved changes. If you leave now, they will be lost.</p>', {
          buttons: [['Stay', 'secondary'], ['Leave', 'primary', function () { ov.remove(); }]]
        });
        return;
      }
      ov.remove();
    };
    f.addEventListener('click', function (e) {
      var b = e.target.closest('[data-fact]'); if (!b) return;
      if (b.dataset.fact === 'close') f.close();
      else if (b.dataset.fact === 'help') QB.help();
      else if (b.dataset.fact === 'ai') QB.assistant();
    });
    return f;
  };

  /* Searchable combobox used for customers, vendors, items, accounts.
     list(): [{ value, label, sub, group }]; onPick(value) ; addNew: label */
  UI.combo = function (input, list, opts) {
    opts = opts || {};
    var panel = null, active = -1, items = [];
    function close() { if (panel) { panel.remove(); panel = null; } }
    function open() {
      close();
      var q = input.value.trim().toLowerCase();
      if (opts.selectedLabel && input.value === opts.selectedLabel()) q = '';
      items = list().filter(function (o) { return !q || o.label.toLowerCase().indexOf(q) >= 0; }).slice(0, 200);
      panel = document.createElement('div');
      panel.className = 'qb-combo-panel';
      var h = opts.addNew ? '<button type="button" class="qb-combo-add" data-new>' + UI.icon('plus') + '<span>' + U.esc(opts.addNew) + '</span></button>' : '';
      h += items.map(function (o, i) {
        return '<button type="button" class="qb-combo-item" data-i="' + i + '" style="padding-left:' + (12 + (o.depth || 0) * 14) + 'px"><span>' + U.esc(o.label) + '</span>' + (o.sub ? '<em>' + U.esc(o.sub) + '</em>' : '') + '</button>';
      }).join('');
      if (!items.length && !opts.addNew) h += '<div class="qb-combo-none">No results</div>';
      panel.innerHTML = h;
      document.body.appendChild(panel);
      var r = input.getBoundingClientRect();
      panel.style.left = r.left + 'px'; panel.style.top = (r.bottom + 2) + 'px';
      panel.style.minWidth = Math.max(r.width, opts.minWidth || 240) + 'px';
      if (r.bottom + 320 > innerHeight) { panel.style.top = ''; panel.style.bottom = (innerHeight - r.top + 2) + 'px'; }
      panel.addEventListener('mousedown', function (e) { e.preventDefault(); });
      panel.addEventListener('click', function (e) {
        if (e.target.closest('[data-new]')) { close(); if (opts.onNew) opts.onNew(input.value); return; }
        var b = e.target.closest('[data-i]'); if (!b) return;
        pick(items[+b.dataset.i]);
      });
    }
    function pick(o) { input.value = o.label; close(); if (opts.onPick) opts.onPick(o.value, o); input.dispatchEvent(new Event('change', { bubbles: true })); }
    input.setAttribute('autocomplete', 'off');
    input.addEventListener('focus', open);
    input.addEventListener('input', open);
    input.addEventListener('blur', function () { setTimeout(close, 120); });
    input.addEventListener('keydown', function (e) {
      if (!panel) return;
      var bs = panel.querySelectorAll('[data-i]');
      if (e.key === 'ArrowDown') { active = Math.min(bs.length - 1, active + 1); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); e.preventDefault(); }
      else if (e.key === 'Enter') { if (active >= 0 && items[active]) { pick(items[active]); e.preventDefault(); } return; }
      else if (e.key === 'Escape') { close(); return; }
      bs.forEach(function (b, i) { b.classList.toggle('on', i === active); });
      if (bs[active]) bs[active].scrollIntoView({ block: 'nearest' });
    });
    var btn = input.parentNode.querySelector('.qb-combo-caret');
    if (btn) btn.addEventListener('mousedown', function (e) { e.preventDefault(); if (panel) close(); else { input.focus(); open(); } });
    return { open: open, close: close };
  };
  /* Combobox markup: input + caret button. */
  UI.comboHtml = function (name, value, placeholder, attrs) {
    return '<span class="qb-combo"><input class="qb-input" name="' + name + '" value="' + U.esc(value || '') + '" placeholder="' + U.esc(placeholder || '') + '"' + (attrs || '') + '><button type="button" class="qb-combo-caret" tabindex="-1" aria-label="Open list">' + UI.icon('caretDown') + '</button></span>';
  };
  /* Ready-made lists for combos. */
  QB.lists = {
    customers: function () {
      var out = [];
      S.customers.filter(function (c) { return c.active && !c.parent; }).sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (c) {
        out.push({ value: c.id, label: c.name, sub: 'Customer' });
        S.customers.filter(function (s) { return s.parent === c.id && s.active; }).forEach(function (s) { out.push({ value: s.id, label: s.name, sub: 'Sub-customer of ' + c.name, depth: 1 }); });
      });
      return out;
    },
    vendors: function () { return S.vendors.filter(function (v) { return v.active; }).sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (v) { return { value: v.id, label: v.name, sub: 'Vendor' }; }); },
    payees: function () { return QB.lists.vendors().concat(QB.lists.customers().map(function (c) { return Object.assign({}, c, { sub: 'Customer', depth: 0 }); })); },
    items: function () { return S.items.filter(function (i) { return i.active; }).map(function (i) { return { value: i.id, label: i.name, sub: i.category || i.type }; }); },
    accounts: function (types) {
      return S.ordered().filter(function (a) { return a.active !== false && (!types || types.indexOf(a.type) >= 0); }).map(function (a) { return { value: a.id, label: S.fullName(a.id), sub: a.type, depth: 0 }; });
    },
    categories: function () { return QB.lists.accounts(['Expenses', 'Cost of Goods Sold', 'Other Expense', 'Other Current Assets', 'Fixed Assets', 'Other Current Liabilities', 'Income', 'Other Income', 'Equity', 'Long Term Liabilities', 'Bank', 'Credit Card']); },
    payFrom: function () { return QB.lists.accounts(['Bank', 'Credit Card']); }
  };

  /* ───────────── registries & router ───────────── */
  QB.views = {}; QB.forms = {}; QB.reports = {};
  QB.view = function (name, fn) { QB.views[name] = fn; };
  QB.form = function (name, fn) { QB.forms[name] = fn; };
  QB.report = function (name, fn) { QB.reports[name] = fn; };
  QB.openForm = function (type, opts) {
    UI.closeMenus(); closePanels();
    var fn = QB.forms[type];
    if (!fn) { UI.toast(type + ' is not part of this practice copy yet.', 'err'); return; }
    return fn(opts || {});
  };
  /* Open a transaction for viewing/editing by id. */
  QB.openTxn = function (id) {
    var t = S.txn[id]; if (!t) return;
    var map = { 'Payment': 'Receive Payment', 'Bill Payment (Credit Card)': 'Bill Payment', 'Bill Payment (Check)': 'Bill Payment', 'Cash Expense': 'Expense', 'Credit Card Expense': 'Expense', 'Charge': 'Delayed Charge', 'Credit': 'Delayed Credit', 'Time Charge': 'Single time activity', 'Billable Expense Charge': 'Delayed Charge' };
    QB.openForm(map[t.type] || t.type, { txn: t });
  };

  /* Route table: path -> { app, title, nav (sub item key) } */
  QB.APPS = [
    { key: 'accounting', label: 'Accounting', icon: 'acc', color: '#00c2b2', home: 'banking', items: [
      ['banking', 'Bank transactions'], ['apptransactions', 'Integration transactions'], ['receipts', 'Receipts'], ['reconcile', 'Reconcile'],
      ['olbrules', 'Rules'], ['chartofaccounts', 'Chart of accounts'], ['recurring', 'Recurring transactions'], ['my-accountant', 'My accountant']] },
    { key: 'expenses', label: 'Expenses & Bills', homeLabel: 'Expenses & Pay Bills', icon: 'exp', color: '#21d07a', home: 'expense-overview', items: [
      ['expense-overview', 'Overview'], ['expenses', 'Expense transactions'], ['vendors', 'Vendors'], ['bills', 'Bills'], ['bill-payments', 'Bill payments'],
      ['mileage', 'Mileage'], ['contractors', 'Contractors'], ['1099FilingDetails', '1099s']] },
    { key: 'sales', label: 'Sales & Get Paid', icon: 'sal', color: '#00d974', home: 'incomeoverview', items: [
      ['incomeoverview', 'Overview'], ['sales', 'Sales transactions'], ['invoices', 'Invoices'], ['recurringsales', 'Recurring payments'],
      ['salesorders', 'Sales orders'], ['commerce', 'Sales channels'], ['paymentsdeposits', 'QuickBooks payouts'], ['items', 'Products & services']] },
    { key: 'customers', label: 'Customer Hub', icon: 'cus', color: '#21e2c4', home: 'customers-overview', items: [
      ['customers-overview', 'Overview'], ['customers', 'Customers & leads'], ['estimates', 'Estimates'], ['appointments', 'Appointments'], ['reviews', 'Reviews']] },
    { key: 'payroll', label: 'Payroll', icon: 'pay', color: '#38b6ff', home: 'payroll-signup', premium: true, items: [] },
    { key: 'team', label: 'Team', icon: 'team', color: '#4bb4ff', home: 'employees', items: [['employees', 'Employees'], ['team-contractors', 'Contractors']] },
    { key: 'time', label: 'Time', icon: 'time', color: '#36c2ff', home: 'time', items: [['time', 'Time entries'], ['schedule', 'Schedule']] },
    { key: 'inventory', label: 'Inventory', icon: 'inv', color: '#4f7cff', home: 'inventory-overview', items: [
      ['inventory-overview', 'Overview'], ['inventory', 'Inventory'], ['purchase-orders', 'Purchase orders'], ['itemreceipts', 'Item receipts'],
      ['inv-salesorders', 'Sales orders'], ['shipping', 'Shipping labels']] },
    { key: 'salestax', label: 'Sales Tax', icon: 'tax', color: '#ff6c96', home: 'tax', items: [['tax', 'Overview']] },
    { key: 'businesstax', label: 'Business Tax', icon: 'btax', color: '#ff7a8a', home: 'business-tax', items: [['business-tax', 'Overview'], ['tax-se', 'Tax summary']] },
    { key: 'lending', label: 'Lending', icon: 'lend', color: '#19d38a', home: 'lending', items: [['lending', 'Overview']] },
    { key: 'marketing', label: 'Marketing', icon: 'mkt', color: '#ffbf00', home: 'marketing', premium: true, items: [] }
  ];
  /* route -> app key, for routes not listed as nav items. */
  var ROUTE_APP = {
    customerdetail: 'customers', vendordetail: 'expenses', register: 'accounting', reconcileAccount: 'accounting',
    'payroll-signup': 'payroll', marketing: 'marketing', 'customer-leads': 'customers', itemdetail: 'sales'
  };
  QB.appOf = function (route) {
    if (ROUTE_APP[route]) return ROUTE_APP[route];
    for (var i = 0; i < QB.APPS.length; i++) {
      if (QB.APPS[i].home === route) return QB.APPS[i].key;
      for (var j = 0; j < QB.APPS[i].items.length; j++) if (QB.APPS[i].items[j][0] === route) return QB.APPS[i].key;
    }
    return null;
  };
  QB.REPORT_ROUTES = ['standardreports', 'customreports', 'managementreports', 'kpis', 'cashflow', 'budgets', 'report'];
  /* Routes that show no secondary nav. */
  var BARE = ['home', 'business-feed', 'report', 'reconcileAccount', 'settings'];

  QB.route = { name: 'home', params: {} };
  QB.go = function (name, params) {
    var h = '#/' + name + U.qs(params || {});
    if (location.hash === h) render(); else location.hash = h;
  };
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('?'), params = {};
    (parts[1] || '').split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    return { name: parts[0] || 'home', params: params };
  }
  QB.render = render;
  function render() {
    UI.closeMenus(); closePanels();
    QB.route = parseHash();
    var name = QB.route.name;
    var main = document.getElementById('qbMain');
    var fn = QB.views[name];
    var isReports = QB.REPORT_ROUTES.indexOf(name) >= 0;
    var app = QB.appOf(name);
    state.app = app || (isReports ? 'reports' : name === 'home' ? 'home' : name === 'business-feed' ? 'feed' : state.app);
    var showNav = !(BARE.indexOf(name) >= 0) && (app || (isReports && name !== 'report'));
    state.navOpen = !!showNav && state.navPinned;
    if (app && app !== state.lastApp) { state.expanded = {}; state.lastApp = app; }
    drawRail(); drawNav(isReports ? 'reports' : app, name);
    document.getElementById('qbShell').classList.toggle('nav-open', !!(showNav && state.navPinned));
    var sameRoute = QB._lastHash === location.hash, keep = main.scrollTop;
    QB._lastHash = location.hash;
    main.innerHTML = '';
    var page = document.createElement('div');
    page.className = 'qb-page qb-page-' + name;
    main.appendChild(page);
    if (!fn) {
      page.innerHTML = '<div class="qb-empty-page"><h1>' + U.esc(routeTitle(name)) + '</h1><p>This page is not part of the practice copy.</p></div>';
    } else {
      try { fn(QB.route.params, page); } catch (e) { console.error(e); page.innerHTML = '<div class="qb-empty-page"><h1>Something went wrong</h1><p>' + U.esc(e.message) + '</p></div>'; }
    }
    main.scrollTop = sameRoute ? keep : 0;
    document.title = routeTitle(name) + ' · QuickBooks Test Drive · SkillCloud Academy';
    try { sessionStorage.setItem('qbo_last', location.hash); } catch (e) {}
  }
  function routeTitle(name) {
    for (var i = 0; i < QB.APPS.length; i++) for (var j = 0; j < QB.APPS[i].items.length; j++) if (QB.APPS[i].items[j][0] === name) return QB.APPS[i].items[j][1];
    var extra = { settings: 'Settings', usermngt: 'Manage users', customformstyles: 'Custom form styles', lists: 'All lists', auditlog: 'Audit log', importdata: 'Import data', exportdata: 'Export data', reclassify: 'Reclassify transactions', billing: 'Subscriptions and billing', 'payroll-signup': 'Payroll', marketing: 'Marketing', customreports: 'Custom reports', managementreports: 'Management reports', kpis: 'KPIs', cashflow: 'Cash flow', budgets: 'Budgets', reconcileAccount: 'Reconcile', attachments: 'Attachments', customfields: 'Custom fields', resolution: 'Resolution center', workerscomp: "Workers' comp" };
    if (extra[name]) return extra[name];
    return { home: 'Home', 'business-feed': 'Feed', standardreports: 'Standard reports', report: 'Report', customerdetail: 'Customer', vendordetail: 'Vendor', register: 'Register', settings: 'Settings' }[name] || 'QuickBooks';
  }

  /* ───────────── shell ───────────── */
  var state = QB.shell = { app: 'home', navOpen: false, navPinned: true, expanded: {} };
  QB.appIcon = function (key, size) {
    var app = QB.APPS.filter(function (a) { return a.key === key; })[0];
    var color = app ? app.color : '#2ca01c';
    var glyph = {
      acc: '<path d="M7 8l5 4-5 4zM17 8l-5 4 5 4z" fill="' + color + '"/>',
      exp: '<path d="M9 7l6 5-6 5" stroke="' + color + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
      sal: '<path d="M7 17V13M11 17V10M15 17V7" stroke="' + color + '" stroke-width="2.6" stroke-linecap="round"/>',
      cus: '<path d="M12 6c2 2.5 2 3.5 0 6-2-2.5-2-3.5 0-6zM12 12c2 2.5 2 3.5 0 6-2-2.5-2-3.5 0-6zM6 12c2.5-2 3.5-2 6 0-2.5 2-3.5 2-6 0zM12 12c2.5-2 3.5-2 6 0-2.5 2-3.5 2-6 0z" fill="' + color + '"/>',
      pay: '<path d="M8 6h4a6 6 0 0 1 0 12H8z" fill="' + color + '"/>',
      team: '<circle cx="12" cy="9" r="3" fill="' + color + '"/><circle cx="8" cy="15" r="3" fill="' + color + '"/><circle cx="16" cy="15" r="3" fill="' + color + '"/>',
      time: '<path d="M12 6a6 6 0 1 1-6 6h6z" fill="' + color + '"/>',
      inv: '<rect x="7" y="7" width="10" height="10" rx="2.5" fill="' + color + '"/>',
      tax: '<path d="M7 9l5-3 5 3v6l-5 3-5-3z" fill="' + color + '"/>',
      btax: '<path d="M7 9l5-3 5 3v6l-5 3-5-3z" fill="' + color + '"/>',
      lend: '<circle cx="12" cy="12" r="5" fill="' + color + '"/>',
      mkt: '<path d="M7 10h4l5-3v10l-5-3H7z" fill="' + color + '"/>'
    }[app ? app.icon : 'acc'] || '';
    return '<span class="qb-appic" style="width:' + (size || 22) + 'px;height:' + (size || 22) + 'px"><svg viewBox="0 0 24 24">' + glyph + '</svg></span>';
  };

  function drawRail() {
    var r = document.getElementById('qbRail');
    var a = state.app;
    function item(key, label, icon, act) {
      return '<button type="button" class="qb-rail-item' + (a === key ? ' on' : '') + '" data-act="' + act + '"><span class="qb-rail-ic">' + icon + '</span><span class="qb-rail-lbl">' + label + '</span></button>';
    }
    r.innerHTML =
      '<a class="qb-rail-logo" href="#/home" aria-label="QuickBooks home"><img src="img/qb-mark.svg" alt=""></a>' +
      item('create', 'Create', UI.icon('plusCircle'), 'shell:create') +
      item('bookmarks', 'Bookmarks', UI.icon('bookmark'), 'shell:bookmarks') +
      item('home', 'Home', UI.icon('home'), 'go:home') +
      item('feed', 'Feed', UI.icon('feed'), 'go:business-feed') +
      item('reports', 'Reports', UI.icon('reports'), 'go:standardreports') +
      item('allapps', 'All apps', UI.icon('apps'), 'shell:allapps') +
      '<div class="qb-rail-pinned">PINNED</div>' +
      item('accounting', 'Accounting', '<span class="qb-pin-ic">' + QB.appIcon('accounting', 16) + '</span>', 'shell:app:accounting') +
      item('expenses', 'Expenses', '<span class="qb-pin-ic">' + QB.appIcon('expenses', 16) + '</span>', 'shell:app:expenses') +
      item('sales', 'Sales', '<span class="qb-pin-ic">' + QB.appIcon('sales', 16) + '</span>', 'shell:app:sales') +
      '<span class="qb-grow"></span>' +
      item('customize', 'Customize', UI.icon('customize'), 'shell:customize');
  }

  function drawNav(app, route) {
    var n = document.getElementById('qbNav');
    if (app === 'reports') {
      var ri = [['standardreports', 'Standard reports'], ['customreports', 'Custom reports'], ['managementreports', 'Management reports'], ['kpis', 'KPIs']];
      n.innerHTML = '<div class="qb-nav-head"><span>REPORTS &amp; ANALYTICS</span><button type="button" class="qb-nav-collapse" data-act="shell:collapse" aria-label="Collapse">' + UI.icon('collapse') + '</button></div>' +
        ri.map(function (i) { return '<a class="qb-nav-sub qb-nav-flat' + (route === i[0] ? ' on' : '') + '" href="#/' + i[0] + '">' + i[1] + '</a>'; }).join('') +
        '<button type="button" class="qb-nav-app qb-nav-flat open" data-act="shell:toggleplan"><span>Financial planning</span>' + UI.icon('caretUp', 'qb-nav-caret') + '</button>' +
        '<a class="qb-nav-sub' + (route === 'cashflow' ? ' on' : '') + '" href="#/cashflow">Cash flow <i class="qb-dot"></i></a>' +
        '<a class="qb-nav-sub' + (route === 'budgets' ? ' on' : '') + '" href="#/budgets">Budgets</a>';
      return;
    }
    if (app) state.expanded[app] = true;
    n.innerHTML = '<div class="qb-nav-head"><span>ALL APPS</span><button type="button" class="qb-nav-collapse" data-act="shell:collapse" aria-label="Collapse">' + UI.icon('collapse') + '</button></div>' +
      QB.APPS.map(function (a) {
        var open = !!state.expanded[a.key] && a.items.length;
        return '<button type="button" class="qb-nav-app' + (open ? ' open' : '') + '" data-act="shell:expand:' + a.key + '">' + QB.appIcon(a.key, 20) + '<span>' + a.label + '</span>' +
          (a.premium ? UI.icon('diamond', 'qb-nav-prem') : UI.icon(open ? 'caretUp' : 'caretDown', 'qb-nav-caret')) + '</button>' +
          (open ? a.items.map(function (i) { return '<a class="qb-nav-sub' + (route === i[0] ? ' on' : '') + '" href="#/' + i[0] + '">' + i[1] + '</a>'; }).join('') : '');
      }).join('');
  }

  /* Flyouts: All apps, Create, Bookmarks, gear, Customize. */
  function closePanels() { U.$$('.qb-fly').forEach(function (p) { p.remove(); }); U.$$('.qb-rail-item.flying').forEach(function (b) { b.classList.remove('flying'); }); }
  QB.closePanels = closePanels;
  function fly(html, cls, anchor) {
    closePanels(); UI.closeMenus();
    var p = document.createElement('div');
    p.className = 'qb-fly ' + (cls || '');
    p.innerHTML = html;
    document.getElementById('qbShell').appendChild(p);
    if (anchor) anchor.classList.add('flying');
    p.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (b) { closePanels(); QB.act(b.dataset.act, b); }
      var l = e.target.closest('a[href^="#"]'); if (l) closePanels();
    });
    return p;
  }
  QB.CREATE = [
    ['Customers', [['Invoice', 'form:Invoice'], ['Receive payment', 'form:Receive Payment'], ['Statement', 'form:Statement'], ['Estimate', 'form:Estimate'], ['Credit memo', 'form:Credit Memo'], ['Sales receipt', 'form:Sales Receipt'], ['Recurring payment', 'form:Recurring payment'], ['Refund receipt', 'form:Refund'], ['Delayed credit', 'form:Delayed Credit'], ['Delayed charge', 'form:Delayed Charge'], ['Add customer', 'new:customer']]],
    ['Vendors', [['Expense', 'form:Expense'], ['Check', 'form:Check'], ['Bill', 'form:Bill'], ['Pay bills', 'form:Pay Bills'], ['Purchase order', 'form:Purchase Order'], ['Vendor credit', 'form:Vendor Credit'], ['Credit card credit', 'form:Credit Card Credit'], ['Print checks', 'form:Print Checks'], ['Add vendor', 'new:vendor']]],
    ['Team', [['Payroll', 'go:payroll-signup', true], ['Single time activity', 'form:Single time activity'], ['Weekly timesheet', 'form:Weekly timesheet'], ['Add contractor', 'new:contractor']]],
    ['Other', [['Task', 'form:Task'], ['Bank deposit', 'form:Deposit'], ['Transfer', 'form:Transfer'], ['Journal entry', 'form:Journal Entry'], ['Inventory adjustment', 'form:Inventory Qty Adjust'], ['Pay down credit card', 'form:Credit Card Payment'], ['Add product/service', 'new:item'], ['New chat', 'shell:chat', false, true]]]
  ];
  function createMenu(anchor) {
    fly('<div class="qb-create">' + QB.CREATE.map(function (col) {
      return '<div class="qb-create-col"><h3>' + col[0] + '</h3>' + col[1].map(function (i) {
        return '<button type="button" data-act="' + i[1] + '">' + i[0] + (i[2] ? UI.icon('diamond', 'qb-prem') : '') + (i[3] ? '<i class="qb-dot qb-dot-pink"></i>' : '') + '</button>';
      }).join('') + '</div>';
    }).join('') + '</div>', 'qb-fly-create', anchor);
  }
  function allApps(anchor) {
    fly('<div class="qb-allapps"><div class="qb-nav-head"><span>ALL APPS</span></div>' + QB.APPS.map(function (a) {
      return '<button type="button" class="qb-allapps-item' + (state.app === a.key ? ' on' : '') + '" data-act="shell:app:' + a.key + '">' + QB.appIcon(a.key, 20) + '<span>' + a.label + '</span>' + (a.premium ? UI.icon('diamond', 'qb-nav-prem') : UI.icon('caretRight', 'qb-nav-caret')) + '</button>';
    }).join('') + '</div>', 'qb-fly-apps', anchor);
  }
  function bookmarks(anchor) {
    fly('<div class="qb-bm"><div class="qb-bm-head"><h3>Bookmarks</h3><button type="button" class="qb-link" data-act="shell:bm-edit">Edit</button></div>' +
      S.bookmarks.map(function (b) { return '<a class="qb-bm-item" href="#/' + b.route + '">' + UI.icon('bookmark') + '<span>' + U.esc(b.label) + '</span></a>'; }).join('') +
      '<button type="button" class="qb-bm-add" data-act="shell:bm-add">' + UI.icon('plus') + '<span>Bookmark this page</span></button></div>', 'qb-fly-bm', anchor);
  }
  QB.GEAR = [
    ['YOUR COMPANY', [['Account and settings', 'go:settings?tab=company'], ['Manage users', 'go:usermngt'], ['Custom form styles', 'go:customformstyles'], ['Default report settings', 'go:settings?tab=reports'], ['Chart of accounts', 'go:chartofaccounts'], ['Payroll settings', 'go:payroll-signup'], ["Workers' comp", 'go:workerscomp'], ['Get the desktop app', 'info:desktop'], ['Get the mobile app', 'info:mobile'], ['Additional info', 'go:settings?tab=company', true]]],
    ['LISTS', [['All lists', 'go:lists'], ['Products and services', 'go:items'], ['Recurring transactions', 'go:recurring'], ['Attachments', 'go:attachments'], ['Custom fields', 'go:customfields'], ['Rules', 'go:olbrules']]],
    ['TOOLS', [['Reclassify transactions', 'go:reclassify'], ['Order checks', 'info:checks', false, true], ['Import data', 'go:importdata'], ['Import desktop data', 'info:importdesktop'], ['Export data', 'go:exportdata'], ['Reconcile', 'go:reconcile'], ['Budgeting', 'go:budgets'], ['Audit log', 'go:auditlog'], ['Share screen', 'info:share'], ['Resolution center', 'go:resolution']]],
    ['PROFILE', [['Subscriptions and billing', 'go:billing'], ['Feedback', 'shell:feedback'], ['Privacy', 'info:privacy'], ['Your Privacy Choices', 'info:privacy']]]
  ];
  function gearMenu(anchor) {
    fly('<div class="qb-gear"><div class="qb-gear-cols">' + QB.GEAR.map(function (col, i) {
      return '<div class="qb-gear-col' + (i === 3 ? ' is-last' : '') + '"><h3>' + col[0] + '</h3>' + col[1].map(function (it) {
        return '<button type="button" data-act="' + it[1] + '">' + it[0] + (it[2] ? '<i class="qb-dot qb-dot-pink"></i>' : '') + (it[3] ? UI.icon('export', 'qb-ext') : '') + '</button>';
      }).join('') + '</div>';
    }).join('') + '</div><div class="qb-gear-foot"><button type="button" class="qb-link" data-act="info:videos">' + UI.icon('play') + '<u>Video tutorials</u></button><span class="qb-grow"></span><button type="button" class="qb-link" data-act="shell:switchview">Switch <b>from Accountant view</b> to Business view</button>' + UI.icon('help', 'qb-gear-q') + '</div></div>', 'qb-fly-gear');
  }
  function customize() {
    UI.drawer('Customize navigation', '<p class="qb-muted">Pin the apps you use most to the left side of the screen.</p>' + QB.APPS.map(function (a) {
      var pinned = ['accounting', 'expenses', 'sales'].indexOf(a.key) >= 0;
      return '<label class="qb-cust-row">' + QB.appIcon(a.key, 20) + '<span>' + a.label + '</span><span class="qb-grow"></span><input type="checkbox"' + (pinned ? ' checked' : '') + '></label>';
    }).join(''), { onSave: function () { UI.toast('Your navigation was updated.'); } });
  }

  /* Global search in the top bar. */
  function searchPanel(input) {
    var q = input.value.trim().toLowerCase();
    var host = document.getElementById('qbSearchPanel');
    var res = [];
    if (q) {
      S.customers.forEach(function (c) { if (c.name.toLowerCase().indexOf(q) >= 0) res.push(['Customer', c.name, 'go:customerdetail?id=' + c.id]); });
      S.vendors.forEach(function (v) { if (v.name.toLowerCase().indexOf(q) >= 0) res.push(['Vendor', v.name, 'go:vendordetail?id=' + v.id]); });
      S.items.forEach(function (i) { if (i.name.toLowerCase().indexOf(q) >= 0) res.push(['Product/Service', i.name, 'go:items']); });
      S.txns.forEach(function (t) {
        if (t.hidden) return;
        var hay = (t.type + ' ' + (t.no || '') + ' ' + S.payeeName(t) + ' ' + U.num(t.total) + ' ' + (t.memo || '')).toLowerCase();
        if (hay.indexOf(q) >= 0) res.push([t.type, (t.no ? '#' + t.no + ' · ' : '') + S.payeeName(t) + ' · ' + U.money(t.total) + ' · ' + U.fmtDate(t.date), 'txn:' + t.id]);
      });
      Object.keys(QB.reports).forEach(function (r) { if (r.toLowerCase().indexOf(q) >= 0) res.push(['Report', r, 'report:' + r]); });
      QB.APPS.forEach(function (a) { a.items.forEach(function (i) { if (i[1].toLowerCase().indexOf(q) >= 0) res.push(['Navigate', a.label + ' › ' + i[1], 'go:' + i[0]]); }); });
    }
    if (!q) {
      host.innerHTML = '<div class="qb-sp-head">Recent transactions</div>' + S.txns.filter(function (t) { return !t.hidden; }).slice().sort(function (a, b) { return b.created - a.created || (a.date < b.date ? 1 : -1); }).slice(0, 8).map(function (t) {
        return '<button type="button" class="qb-sp-row" data-act="txn:' + t.id + '"><span class="qb-sp-type">' + t.type + (t.no ? ' ' + t.no : '') + '</span><span>' + U.esc(S.payeeName(t)) + '</span><span class="qb-grow"></span><span>' + U.money(t.total) + '</span><span class="qb-sp-date">' + U.fmtDate(t.date) + '</span></button>';
      }).join('');
    } else {
      host.innerHTML = res.length ? res.slice(0, 40).map(function (r) {
        return '<button type="button" class="qb-sp-row" data-act="' + U.esc(r[2]) + '"><span class="qb-sp-type">' + U.esc(r[0]) + '</span><span>' + U.esc(r[1]) + '</span></button>';
      }).join('') : '<div class="qb-sp-none">No results for “' + U.esc(input.value) + '”</div>';
    }
    host.hidden = false;
  }

  /* ───────────── actions ─────────────
     Every clickable thing carries data-act="verb:arg". Views can register
     their own verbs with QB.on('verb', fn(arg, el)). */
  var handlers = {};
  QB.on = function (verb, fn) { handlers[verb] = fn; };
  QB.act = function (act, el) {
    if (!act) return;
    var i = act.indexOf(':'), verb = i < 0 ? act : act.slice(0, i), arg = i < 0 ? '' : act.slice(i + 1);
    if (handlers[verb]) return handlers[verb](arg, el);
    console.warn('No handler for', act);
  };
  QB.on('go', function (arg) {
    var p = arg.split('?'), params = {};
    (p[1] || '').split('&').forEach(function (kv) { if (kv) { var x = kv.split('='); params[x[0]] = decodeURIComponent(x[1] || ''); } });
    QB.go(p[0], params);
  });
  QB.on('form', function (arg) { QB.openForm(arg); });
  QB.on('txn', function (arg) { QB.openTxn(arg); });
  QB.on('report', function (arg) { QB.go('report', { name: arg }); });
  QB.on('toast', function (arg) { UI.toast(arg); });
  QB.on('info', function (arg) {
    var msg = {
      desktop: ['Get the desktop app', 'The QuickBooks Online desktop app runs your company in its own window. In this practice copy, keep working in the browser.'],
      mobile: ['Get the mobile app', 'Snap receipts, send invoices and check your cash on the go with the QuickBooks mobile app for iOS and Android.'],
      checks: ['Order checks', 'In the real product this opens the Intuit checks and supplies store in a new tab.'],
      importdesktop: ['Import desktop data', 'Move your QuickBooks Desktop company file into QuickBooks Online. This is not available in the test drive.'],
      share: ['Share screen', 'Share your screen with a QuickBooks expert so they can see what you see.'],
      privacy: ['Privacy', 'Intuit privacy settings live in your Intuit account. The test drive does not keep any of your data.'],
      videos: ['Video tutorials', 'Short videos walk you through invoicing, expenses, banking and reports.']
    }[arg] || ['QuickBooks', 'This is not part of the practice copy.'];
    UI.modal(msg[0], '<p>' + msg[1] + '</p>', { buttons: [['Got it', 'primary']] });
  });
  QB.on('new', function (arg) {
    var f = { customer: 'Customer', vendor: 'Vendor', item: 'Product/Service', contractor: 'Contractor', account: 'Account' }[arg];
    QB.openForm(f, {});
  });
  QB.on('shell', function (arg, el) {
    var p = arg.split(':');
    if (p[0] === 'create') return toggleFly('qb-fly-create', function () { createMenu(el); });
    if (p[0] === 'allapps') return toggleFly('qb-fly-apps', function () { allApps(el); });
    if (p[0] === 'bookmarks') return toggleFly('qb-fly-bm', function () { bookmarks(el); });
    if (p[0] === 'gear') return toggleFly('qb-fly-gear', function () { gearMenu(el); });
    if (p[0] === 'customize') return customize();
    if (p[0] === 'app') {
      var a = QB.APPS.filter(function (x) { return x.key === p[1]; })[0];
      state.navPinned = true; state.expanded = {}; state.expanded[p[1]] = true;
      return QB.go(a.home);
    }
    if (p[0] === 'expand') { state.expanded[p[1]] = !state.expanded[p[1]]; if (!QB.APPS.filter(function (x) { return x.key === p[1]; })[0].items.length) { var ap = QB.APPS.filter(function (x) { return x.key === p[1]; })[0]; return QB.go(ap.home); } drawNav(QB.appOf(QB.route.name), QB.route.name); return; }
    if (p[0] === 'collapse') { state.navPinned = false; document.getElementById('qbShell').classList.remove('nav-open'); return; }
    if (p[0] === 'bm-add') {
      var r = QB.route.name;
      if (!S.bookmarks.some(function (b) { return b.route === r; })) S.bookmarks.push({ label: routeTitle(r), route: r });
      return UI.toast('Bookmarked ' + routeTitle(r) + '.');
    }
    if (p[0] === 'bm-edit') return UI.modal('Edit bookmarks', S.bookmarks.map(function (b, i) { return '<label class="qb-cust-row"><span>' + U.esc(b.label) + '</span><span class="qb-grow"></span><button type="button" class="qb-link" data-bmdel="' + i + '">Remove</button></label>'; }).join(''), { buttons: [['Done', 'primary']] }).addEventListener('click', function (e) {
      var b = e.target.closest('[data-bmdel]'); if (b) { S.bookmarks.splice(+b.dataset.bmdel, 1); b.closest('.qb-cust-row').remove(); }
    });
    if (p[0] === 'chat') return QB.assistant();
    if (p[0] === 'help') return QB.help();
    if (p[0] === 'feedback') return UI.modal('Give feedback', '<p>Tell us what you think about this page.</p><textarea class="qb-input" rows="4" style="width:100%"></textarea>', { buttons: [['Cancel', 'secondary'], ['Send', 'primary', function () { UI.toast('Thanks for your feedback.'); }]] });
    if (p[0] === 'switchview') return UI.toast('Switched to Business view. The menus are the same in this practice copy.');
    if (p[0] === 'toggleplan') return;
    if (p[0] === 'experts') return UI.modal('Contact experts', '<p>Get help from a QuickBooks expert. Live chat, scheduled calls and the QuickBooks Live bookkeeping service are offered in the real product.</p>', { buttons: [['Close', 'secondary']] });
    if (p[0] === 'avatar') return UI.menu(el, [{ head: 'Craig Carlson' }, ['Manage your Intuit Account', 'info:privacy'], ['Settings', 'go:settings?tab=company'], { sep: true }, ['Sign out', 'shell:signout']]);
    if (p[0] === 'signout') return UI.modal('Sign out', '<p>This is the practice copy. Reloading the page starts the sample company fresh.</p>', { buttons: [['Stay', 'secondary'], ['Reset sample company', 'primary', function () { location.hash = '#/home'; location.reload(); }]] });
    if (p[0] === 'appsgrid') return UI.menu(el, [{ head: 'Intuit apps' }, ['QuickBooks Online', 'go:home'], ['QuickBooks Payments', 'go:paymentsdeposits'], ['QuickBooks Time', 'go:time'], ['Mailchimp', 'go:marketing']]);
  });
  function toggleFly(cls, open) {
    if (document.querySelector('.' + cls)) closePanels(); else open();
  }
  QB.help = function () {
    UI.drawer('Help', '<div class="qb-help"><div class="qb-search-box">' + UI.icon('search') + '<input class="qb-input" placeholder="Search for help"></div><h3>Suggested topics</h3>' +
      ['Create and send invoices', 'Record an expense', 'Categorize bank transactions', 'Reconcile an account', 'Run a Profit and Loss report', 'Enter and pay bills', 'Set up products and services'].map(function (t) { return '<button type="button" class="qb-help-row">' + UI.icon('doc') + '<span>' + t + '</span></button>'; }).join('') +
      '<p class="qb-muted">Help articles open in the real product. This practice copy keeps you on the screen.</p></div>', { save: false });
  };
  QB.assistant = function () {
    var d = UI.drawer('Intuit Assist', '<div class="qb-assist"><div class="qb-assist-msg">Hi! I can help you find things and answer questions about your books. Try:</div>' +
      ['How much do customers owe me?', 'Which bills are overdue?', 'What were my top expenses this month?'].map(function (q) { return '<button type="button" class="qb-assist-q">' + q + '</button>'; }).join('') +
      '<div class="qb-assist-log"></div><div class="qb-assist-in"><input class="qb-input" placeholder="Ask a question"></div></div>', { save: false });
    d.addEventListener('click', function (e) {
      var b = e.target.closest('.qb-assist-q'); if (!b) return;
      var log = d.querySelector('.qb-assist-log'), q = b.textContent, a;
      if (/owe me/.test(q)) a = 'Customers owe you ' + U.money(QB.ledger.balance('a_ar')) + ' across ' + S.find(function (t) { return t.type === 'Invoice' && L.openBalance(t) > 0; }).length + ' open invoices.';
      else if (/overdue/.test(q)) { var od = S.find(function (t) { return t.type === 'Bill' && L.status(t).tone === 'overdue'; }); a = od.length + ' bills are overdue, totaling ' + U.money(od.reduce(function (s, t) { return s + L.openBalance(t); }, 0)) + '.'; }
      else a = 'Your largest expense in the last 30 days was Miscellaneous, mostly the Brosnahan Insurance Agency bill.';
      log.insertAdjacentHTML('beforeend', '<div class="qb-assist-you">' + U.esc(q) + '</div><div class="qb-assist-msg">' + U.esc(a) + '</div>');
    });
  };

  /* Shared page header: breadcrumb, title, actions. */
  UI.pageHead = function (title, opts) {
    opts = opts || {};
    return '<div class="qb-ph">' + (opts.crumb ? '<div class="qb-crumb">' + opts.crumb + '</div>' : '') +
      '<div class="qb-ph-row"><h1>' + title + '</h1><span class="qb-grow"></span>' + (opts.actions || '') + '</div>' +
      (opts.tools ? '<div class="qb-ph-tools">' + opts.tools + '</div>' : '') + '</div>';
  };
  UI.feedbackLink = function () { return '<button type="button" class="qb-feedback" data-act="shell:feedback">' + UI.icon('comment') + '<span>Give feedback</span></button>'; };
  /* Empty marketing-style state used by Payroll, Time, Employees, etc. */
  UI.hero = function (o) {
    return '<div class="qb-hero' + (o.grey ? ' is-grey' : '') + '"><div class="qb-hero-copy"><h2>' + o.title + '</h2>' + (o.lead ? '<p class="qb-hero-lead">' + o.lead + '</p>' : '') + (o.body || '') +
      '<div class="qb-hero-acts">' + (o.actions || '') + '</div></div><div class="qb-hero-art">' + (o.art || QB.art('laptop')) + '</div></div>';
  };
  /* Simple line illustrations, drawn here so nothing is copied from the product. */
  QB.art = function (kind) {
    var skin = '#f2b48c', hair = '#e1663b';
    var arts = {
      laptop: '<svg viewBox="0 0 220 170"><rect x="70" y="70" width="120" height="78" rx="6" fill="#b8c2cc" transform="rotate(-8 130 110)"/><circle cx="70" cy="58" r="26" fill="' + hair + '"/><circle cx="72" cy="66" r="18" fill="' + skin + '"/><path d="M40 160c4-40 20-60 34-60s34 14 40 60z" fill="#0d3b54"/><path d="M96 120l40-6" stroke="' + skin + '" stroke-width="9" stroke-linecap="round"/></svg>',
      box: '<svg viewBox="0 0 220 200"><rect x="40" y="40" width="90" height="110" rx="10" fill="#d7dbe0"/><rect x="40" y="40" width="90" height="22" rx="6" fill="#c3c8cf"/><rect x="92" y="26" width="26" height="30" rx="3" fill="#37d67a"/><circle cx="150" cy="44" r="16" fill="' + skin + '"/><path d="M150 26c22 0 30 18 18 30" stroke="#9c2b1d" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M120 190l20-80h30l20 80z" fill="#ff8a1f"/><path d="M132 190h16M170 190h16" stroke="#2d2d2d" stroke-width="9"/></svg>',
      sitting: '<svg viewBox="0 0 220 200"><rect x="40" y="60" width="80" height="54" rx="6" fill="#6e7378" transform="rotate(-14 80 87)"/><circle cx="150" cy="40" r="18" fill="' + skin + '"/><path d="M134 30c8-18 32-14 34 2" fill="' + hair + '"/><path d="M120 120c0-40 14-60 30-60s22 20 22 60z" fill="#3a3a3a"/><path d="M110 150c40-20 70-20 90 10l-20 20c-20-14-40-14-60-6z" fill="#2f7fc8"/><path d="M96 180l20-34" stroke="#2f7fc8" stroke-width="16" stroke-linecap="round"/></svg>',
      phone: '<svg viewBox="0 0 240 160"><rect x="10" y="20" width="150" height="100" rx="4" fill="#e6eaee"/><path d="M20 40h130M20 60h80" stroke="#c9ced4" stroke-width="6"/><circle cx="60" cy="80" r="7" fill="#2f7fc8"/><circle cx="100" cy="64" r="7" fill="#2f7fc8"/><rect x="150" y="10" width="44" height="90" rx="8" fill="#fff" stroke="#c9ced4" stroke-width="3"/><rect x="180" y="20" width="48" height="100" rx="8" fill="#fff" stroke="#c9ced4" stroke-width="3"/><circle cx="204" cy="56" r="14" fill="none" stroke="#37b24d" stroke-width="5"/></svg>',
      docs: '<svg viewBox="0 0 200 160"><rect x="40" y="30" width="90" height="110" rx="4" fill="#fff" stroke="#c9ced4" stroke-width="3" transform="rotate(-8 85 85)"/><rect x="70" y="24" width="90" height="110" rx="4" fill="#fff" stroke="#c9ced4" stroke-width="3" transform="rotate(6 115 79)"/><rect x="84" y="36" width="40" height="14" fill="#0d6d5a"/><path d="M84 70h56M84 84h56M84 98h40" stroke="#d7dbe0" stroke-width="5"/></svg>',
      empty: '<svg viewBox="0 0 160 120"><rect x="30" y="30" width="100" height="70" rx="8" fill="#eef1f4"/><path d="M50 55h60M50 70h40" stroke="#d1d6dc" stroke-width="6" stroke-linecap="round"/></svg>'
    };
    return arts[kind] || arts.empty;
  };

  /* ───────────── boot ───────────── */
  function boot() {
    load();
    var top = document.getElementById('qbTop');
    top.innerHTML =
      '<div class="qb-company">' + U.esc(S.company.shortName) + '</div>' +
      '<div class="qb-search">' + UI.icon('search') + '<input id="qbSearch" placeholder="Navigate. Find transactions, contacts, help, reports, and more." autocomplete="off"><div class="qb-search-panel" id="qbSearchPanel" hidden></div></div>' +
      '<span class="qb-grow"></span>' +
      '<button type="button" class="qb-top-experts" data-act="shell:experts"><span class="qb-expert-av"></span><span>Contact experts</span></button>' +
      '<button type="button" class="qb-top-ic qb-top-apps" data-act="shell:appsgrid" aria-label="Apps">' + UI.icon('copy') + '<i class="qb-dot qb-dot-pink"></i></button>' +
      '<button type="button" class="qb-top-ic" data-act="shell:help" aria-label="Help">' + UI.icon('help') + '</button>' +
      '<button type="button" class="qb-top-ic" data-act="shell:gear" aria-label="Settings">' + UI.icon('gear') + '</button>' +
      '<button type="button" class="qb-top-av" data-act="shell:avatar" aria-label="Account">C</button>' +
      '<button type="button" class="qb-top-ai" data-act="shell:chat" aria-label="Intuit Assist">' + UI.icon('sparkle') + '</button>';
    var search = document.getElementById('qbSearch');
    search.addEventListener('focus', function () { searchPanel(search); });
    search.addEventListener('input', function () { searchPanel(search); });
    search.addEventListener('blur', function () { setTimeout(function () { document.getElementById('qbSearchPanel').hidden = true; }, 150); });
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var f = document.querySelector('#qbSearchPanel .qb-sp-row'); if (f) { QB.act(f.dataset.act); search.blur(); } }
      if (e.key === 'Escape') search.blur();
    });
    document.getElementById('qbSearchPanel').addEventListener('mousedown', function (e) {
      var b = e.target.closest('[data-act]'); if (b) { e.preventDefault(); QB.act(b.dataset.act); search.value = ''; search.blur(); }
    });

    /* Global delegation for data-act and split-button menus. */
    document.addEventListener('click', function (e) {
      var caret = e.target.closest('[data-menu]');
      if (caret) { e.preventDefault(); UI.menu(caret, JSON.parse(caret.dataset.menu)); return; }
      if (!e.target.closest('.qb-menu') && !e.target.closest('[data-menu]') && !(openMenu && Date.now() - openMenu._born < 60)) UI.closeMenus();
      if (!e.target.closest('.qb-fly') && !e.target.closest('.qb-rail-item') && !e.target.closest('.qb-top-ic')) closePanels();
      var a = e.target.closest('[data-act]');
      if (a && !a.closest('.qb-menu') && !a.closest('.qb-fly') && !a.closest('.qb-search-panel') && !a.closest('[data-local]')) {
        if (a.tagName === 'TR' && e.target.closest('button,a,input,select')) return;
        QB.act(a.dataset.act, a);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { UI.closeMenus(); closePanels(); }
      /* QuickBooks keyboard shortcuts: Ctrl+Alt+I invoice, X expense, W check, R receipt. */
      if (e.ctrlKey && e.altKey) {
        var k = e.key.toLowerCase();
        var map = { i: 'Invoice', x: 'Expense', w: 'Check', r: 'Receive Payment', e: 'Estimate', c: 'Customer', v: 'Vendor', a: 'chartofaccounts', l: 'standardreports', h: 'home' };
        if (map[k]) { e.preventDefault(); if (/^[a-z]/.test(map[k]) && map[k] === map[k].toLowerCase()) QB.go(map[k]); else QB.openForm(map[k]); }
      }
    });
    window.addEventListener('hashchange', render);
    S.on(function () {
      /* Re-render the current page after any change, but not when a form is open on top. */
      if (!document.querySelector('.qb-form-ov')) render();
      else QB.pendingRender = true;
    });
    var mo = new MutationObserver(function () {
      if (QB.pendingRender && !document.querySelector('.qb-form-ov')) { QB.pendingRender = false; render(); }
    });
    mo.observe(document.getElementById('qbLayer'), { childList: true });
    if (!location.hash) location.hash = '#/home';
    render();
  }
  QB.boot = boot;
  QB.load = load;
})();
