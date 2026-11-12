/* ══════════════════════════════════════════════════════════
   QuickBooks Online test drive: the Accounting app.
   Bank transactions, Integration transactions, Receipts,
   Reconcile (setup + workspace), Rules, Chart of accounts,
   account registers, Recurring transactions, My accountant.

   Every screen reads live from QB.store / QB.ledger. View state
   (open row, tab, filters, checks) lives in ST so it survives the
   full re-render that follows every store change.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var QB = window.QB;
  if (!QB || !QB.view) return;
  var U = QB.util, S = QB.store, L = QB.ledger, UI = QB.ui;

  /* ───────────── module state ───────────── */
  var ST = {
    bank: { acct: null, param: null, tab: 'pending', q: '', range: 'all', kind: 'all', open: null, mode: {}, mc: {}, checked: {}, page: 0, sort: 'date', dir: 'desc', hide: {}, updated: Date.now() },
    coa: { q: '', type: 'all', sort: 'type', dir: 'asc', page: 0, checked: {}, inactive: false, hide: {} },
    reg: { id: null, q: '', range: 'all', status: 'all', type: 'all', dir: 'asc' },
    rec: { landing: true, newExp: false, acct: null, param: null, banner: true, form: {}, sessions: {}, state: {}, err: '' },
    rules: { q: '', status: 'all', checked: {} },
    recur: { q: '', ttype: 'all', type: 'all' },
    receipts: { list: [], tab: 'review', pending: null, checked: {} },
    acctnt: { list: [] },
    cleared: {}
  };
  /* Shared with other modules: cleared status of a transaction ('C' cleared, 'R' reconciled). */
  QB.accounting = { state: ST, cleared: function (id) { return ST.cleared[id] || ''; } };

  /* ───────────── plumbing ───────────── */
  var ACT = {};
  QB.on('qba', function (arg, el) {
    var p = String(arg).split('|'), fn = ACT[p[0]];
    if (fn) return fn(p.slice(1), el);
    if (window.console) console.warn('qba: no action', arg);
  });
  var CUR = { el: null, draw: null };
  function mount(el, draw) { CUR.el = el; CUR.draw = draw; draw(); }
  function redraw() { if (CUR.el && CUR.el.isConnected !== false && CUR.draw) CUR.draw(); }
  function changed(why) { S.changed(why || 'accounting'); }
  function ic(n, c) { return UI.icon(n, c); }
  function esc(s) { return U.esc(s); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function uniq(a) { var o = [], seen = {}; (a || []).forEach(function (x) { if (!seen[x]) { seen[x] = 1; o.push(x); } }); return o; }
  function inRange(iso, key) { if (!key || key === 'all') return true; var r = U.range(key); return iso >= r[0] && iso <= r[1]; }
  function isCC(id) { var a = S.acct[id]; return !!a && a.type === 'Credit Card'; }
  function payeeLabel(id) { if (!id) return ''; if (S.vend[id]) return S.vend[id].name; if (S.cust[id]) return S.custName(id); return ''; }
  function acctByLabel(txt) {
    txt = String(txt || '').trim().toLowerCase(); if (!txt) return null;
    return S.accounts.filter(function (a) { return S.fullName(a.id).toLowerCase() === txt; })[0] ||
      S.accounts.filter(function (a) { return a.name.toLowerCase() === txt; })[0] || null;
  }
  function payeeByLabel(txt) {
    txt = String(txt || '').trim().toLowerCase(); if (!txt) return '';
    var v = S.vendors.filter(function (x) { return x.name.toLowerCase() === txt; })[0];
    if (v) return v.id;
    var c = S.customers.filter(function (x) { return S.custName(x.id).toLowerCase() === txt || x.name.toLowerCase() === txt; })[0];
    return c ? c.id : '';
  }
  function custByName(n) { n = String(n || '').toLowerCase(); return S.customers.filter(function (c) { return c.name.toLowerCase() === n || S.custName(c.id).toLowerCase() === n; })[0]; }
  function vendByName(n) { n = String(n || '').toLowerCase(); return S.vendors.filter(function (v) { return v.name.toLowerCase() === n; })[0]; }
  function refocus(root, sel) {
    var i = root.querySelector(sel); if (!i) return;
    i.focus(); var v = i.value || '';
    try { i.setSelectionRange(v.length, v.length); } catch (e) { /* not a text field */ }
  }
  function downloadCsv(name, rows) {
    var s = rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    try {
      var b = new Blob([s], { type: 'text/csv' }), a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      UI.toast('Your file was exported.');
    } catch (e) { UI.toast('Export is not available in this browser.', 'err'); }
  }
  function pickFiles(multiple, accept, fn) {
    var inp = document.createElement('input');
    inp.type = 'file'; if (multiple) inp.multiple = true; if (accept) inp.accept = accept;
    inp.style.display = 'none';
    inp.addEventListener('change', function () { var names = [].slice.call(inp.files || []); inp.remove(); if (names.length) fn(names); });
    document.body.appendChild(inp); inp.click();
  }
  function iconBtn(icon, act, label) { return '<button type="button" class="qb-icon-btn" data-act="qba:' + esc(act) + '" aria-label="' + esc(label) + '" title="' + esc(label) + '">' + ic(icon) + '</button>'; }
  function tick(on, label) { return (on ? '✓ ' : '  ') + label; }

  /* Postings for one account, chronological, each with a stable key and its
     signed effect in the account's natural direction (inc > 0 increases it). */
  function acctEntries(acct) {
    var out = [], debit = S.isDebit(acct);
    S.txns.forEach(function (t) {
      L.postings(t).forEach(function (p, i) {
        if (p.acct !== acct) return;
        out.push({ t: t, p: p, key: t.id + ':' + i, inc: U.r2(debit ? p.amt : -p.amt) });
      });
    });
    out.sort(function (a, b) { return a.t.date < b.t.date ? -1 : a.t.date > b.t.date ? 1 : (a.t.created || 0) - (b.t.created || 0); });
    return out;
  }
  /* The other side of a posting: one account name or -Split-. */
  function otherSide(t, acct) {
    var ids = uniq(L.postings(t).filter(function (p) { return p.acct !== acct; }).map(function (p) { return p.acct; }));
    return !ids.length ? '' : ids.length === 1 ? S.fullName(ids[0]) : '-Split-';
  }
  function amtIn(t, acct) { var s = 0; L.postings(t).forEach(function (p) { if (p.acct === acct) s += p.amt; }); return U.r2(s); }
  function removeTxnSilent(id) {
    var t = S.txn[id]; if (!t) return;
    S.txns.splice(S.txns.indexOf(t), 1); delete S.txn[id];
    S.txns.forEach(function (o) { o.applied = (o.applied || []).filter(function (a) { return a.id !== id; }); });
    S.log('Deleted', t);
  }

  /* Combobox lists. */
  var LISTS = {
    pout: function () { return QB.lists.vendors().concat(QB.lists.customers().map(function (c) { return { value: c.value, label: c.label, sub: 'Customer' }; })); },
    pin: function () { return QB.lists.customers().map(function (c) { return { value: c.value, label: c.label, sub: 'Customer' }; }).concat(QB.lists.vendors()); },
    cat: function () { return QB.lists.categories(); },
    cust: function () { return QB.lists.customers(); },
    vend: function () { return QB.lists.vendors(); }
  };
  function cbx(name, kind, ref, label, ph) {
    return UI.comboHtml(name, label || '', ph || '', ' data-cb="' + kind + '|' + esc(ref) + '" data-label="' + esc(label || '') + '"');
  }
  function bindCombos(root, onPick) {
    [].slice.call(root.querySelectorAll('input[data-cb]')).forEach(function (inp) {
      var kind = inp.getAttribute('data-cb').split('|')[0];
      UI.combo(inp, LISTS[kind] || LISTS.cat, {
        selectedLabel: function () { return inp.getAttribute('data-label') || ''; },
        addNew: '+ Add new',
        onNew: function (txt) {
          var form = kind === 'cat' ? 'Account' : (kind === 'pin' || kind === 'cust') ? 'Customer' : 'Vendor';
          QB.openForm(form, { name: txt });
        },
        onPick: function (v, o) { inp.setAttribute('data-label', o ? o.label : ''); onPick(inp, v, o); }
      });
    });
  }
  function lookupFor(kind, txt) {
    if (kind === 'cat') { var a = acctByLabel(txt); return a ? a.id : null; }
    var p = payeeByLabel(txt); return p || null;
  }

  /* ═════════════════ Rules engine ═════════════════ */
  function ruleNorm(r) {
    if (r._n) return r;
    r._n = true;
    r.id = r.id || U.uid('rule');
    r.status = r.status || 'Active';
    if (!r.conds) {
      var ap = String(r.applied || 'Money out');
      r.dir = /money in/i.test(ap) ? 'in' : 'out';
      var acc = String(r.accounts || '');
      if (!acc || /all/i.test(acc)) r.acctIds = 'all';
      else r.acctIds = acc.split(/\s*,\s*/).map(function (n) { var a = acctByLabel(n); return a ? a.id : null; }).filter(Boolean);
      r.match = / or /.test(r.conditions || '') ? 'any' : 'all';
      r.conds = [];
      var re = /(?:(Description|Bank text|Amount)\s+(contains|doesn't contain|is exactly|equals|is greater than|is less than)\s+)?"([^"]*)"/gi, m, lf = 'Description', lo = 'contains';
      while ((m = re.exec(r.conditions || ''))) { if (m[1]) { lf = m[1]; lo = m[2]; } r.conds.push({ field: lf, op: lo, value: m[3] }); }
      var set = String(r.settings || ''), cm = /Category:\s*([^;]+)/i.exec(set), pm = /Payee:\s*([^;]+)/i.exec(set), mm = /Memo:\s*([^;]+)/i.exec(set);
      var ca = cm ? acctByLabel(cm[1]) : null;
      r.assign = { type: r.dir === 'in' ? 'Deposit' : 'Expense', payee: pm ? payeeByLabel(pm[1]) : '', category: ca ? ca.id : '', transfer: '', memo: mm ? mm[1].trim() : '' };
    }
    r.assign = r.assign || { type: 'Expense', payee: '', category: '', transfer: '', memo: '' };
    return r;
  }
  function ruleTexts(r) {
    r.applied = r.dir === 'in' ? 'Money in' : 'Money out';
    r.accounts = (r.acctIds === 'all' || !r.acctIds || !r.acctIds.length) ? 'All bank accounts' : r.acctIds.map(function (id) { return S.acct[id] ? S.acct[id].name : ''; }).filter(Boolean).join(', ');
    r.conditions = r.conds.map(function (c) { return c.field + ' ' + c.op + ' "' + c.value + '"'; }).join(r.match === 'any' ? ' or ' : ' and ');
    var s = [];
    if (r.assign.type === 'Transfer') { if (r.assign.transfer) s.push('Transfer account: ' + S.fullName(r.assign.transfer)); }
    else {
      if (r.assign.type && r.assign.type !== 'Expense' && r.assign.type !== 'Deposit') s.push('Type: ' + r.assign.type);
      if (r.assign.payee) s.push('Payee: ' + payeeLabel(r.assign.payee));
      if (r.assign.category) s.push('Category: ' + S.fullName(r.assign.category));
    }
    if (r.assign.memo) s.push('Memo: ' + r.assign.memo);
    r.settings = s.join('; ');
    return r;
  }
  function condTest(c, f) {
    if (c.field === 'Amount') {
      var amt = f.spent || f.received, v = U.parseMoney(c.value);
      if (/greater/i.test(c.op)) return amt > v;
      if (/less/i.test(c.op)) return amt < v;
      return Math.abs(amt - v) < 0.005;
    }
    var hay = String(f.desc || '').toLowerCase(), q = String(c.value || '').toLowerCase();
    if (!q) return false;
    if (c.op === "doesn't contain") return hay.indexOf(q) < 0;
    if (c.op === 'is exactly') return hay === q;
    return hay.indexOf(q) >= 0;
  }
  function ruleMatches(r, f) {
    if (r.status !== 'Active' || !r.conds || !r.conds.length) return false;
    if ((r.dir === 'in') !== !!f.received) return false;
    if (r.acctIds !== 'all' && r.acctIds && r.acctIds.length && r.acctIds.indexOf(f.account) < 0) return false;
    var res = r.conds.map(function (c) { return condTest(c, f); });
    return r.match === 'any' ? res.some(Boolean) : res.every(Boolean);
  }
  function rulesSorted() { return S.rules.map(ruleNorm).slice().sort(function (a, b) { return (a.priority || 0) - (b.priority || 0); }); }
  function ruleFor(f) {
    if (f.kind !== 'cat') return null;
    var rs = rulesSorted();
    for (var i = 0; i < rs.length; i++) if (ruleMatches(rs[i], f)) return rs[i];
    return null;
  }

  /* ═════════════════ Bank feed logic ═════════════════ */
  function eachFeed(fn) { Object.keys(S.bankFeed).forEach(function (k) { (S.bankFeed[k] || []).forEach(fn); }); }
  function feedRow(id) { var hit = null; eachFeed(function (f) { if (f.id === id) hit = f; }); return hit; }
  function feedAccts() { return S.ordered().filter(function (a) { return S.bankFeed[a.id] && a.active !== false; }).map(function (a) { return a.id; }); }
  function pendingCount(id) { return (S.bankFeed[id] || []).filter(function (f) { return f.state === 'pending'; }).length; }
  function bankAmt(f) { return U.r2((f.received || 0) - (f.spent || 0)); }

  function guessPayee(f) {
    if (f.side === 'c_none') return '';
    var d = norm(f.desc); if (d.length < 3) return '';
    var pool = f.spent ? S.vendors : S.customers;
    var hit = pool.filter(function (x) {
      if (x.active === false) return false;
      var n = norm(x.name);
      return n === d || (d.length >= 4 && (n.indexOf(d) === 0 || d.indexOf(n) === 0));
    })[0];
    return hit ? hit.id : '';
  }
  function lastCategory(vendId) {
    var last = S.txns.filter(function (t) {
      return !t.hidden && t.payee === vendId && t.lines && t.lines.length && t.lines[0].acct &&
        ['Expense', 'Check', 'Bill', 'Cash Expense', 'Credit Card Expense'].indexOf(t.type) >= 0;
    }).sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
    return last ? last.lines[0].acct : '';
  }
  function guessCat(f, payee) {
    var d = String(f.desc || '');
    if (/interest/i.test(d)) return f.received ? 'a_int' : 'a_bank';
    if (/rent/i.test(d)) return f.spent ? 'a_rent' : 'a_uncI';
    if (f.spent && payee && S.vend[payee]) { var c = lastCategory(payee); if (c) return c; }
    return f.spent ? 'a_uncE' : 'a_uncI';
  }
  /* Effective payee/category for a pending row: user choice, then rule, then guess. */
  function eff(f) {
    var r = ruleFor(f);
    var payee = f.payeeSet ? f.payee : ((r && r.assign.payee) || f.payee || guessPayee(f));
    var cat = f.catSet ? f.category : ((r && r.assign.category) || f.category || guessCat(f, payee));
    return { payee: payee || '', cat: cat || '', rule: r && !f.catSet ? r : null };
  }
  function modeOf(f) {
    var m = ST.bank.mode[f.id];
    if (m) return m;
    if (f.kind === 'match') return 'match';
    var r = ruleFor(f);
    return r && r.assign.type === 'Transfer' ? 'transfer' : 'cat';
  }
  function usedIds(except) {
    var u = {};
    eachFeed(function (f) {
      if (f === except || f.state !== 'posted') return;
      (f.matchedIds || []).forEach(function (id) { u[id] = 1; });
      if (f.created) u[f.created] = 1;
    });
    return u;
  }
  /* Customer payments and sales receipts waiting in Undeposited Funds can match a
     bank deposit too; matching moves them into the bank account, like QBO does. */
  function undepOk(t) { return (t.type === 'Payment' || t.type === 'Sales Receipt') && t.account === 'a_undep'; }
  function candAmt(t, acct) { var a = amtIn(t, acct); if (!a && undepOk(t)) a = amtIn(t, 'a_undep'); return a; }
  function hintCands(f) {
    var used = usedIds(f), target = bankAmt(f);
    return uniq(f.matches).filter(function (id) { return S.txn[id] && !used[id] && Math.abs(candAmt(S.txn[id], f.account) - target) < 0.005; }).sort(function (a, b) {
      return Math.abs(U.diffDays(S.txn[a].date, f.date)) - Math.abs(U.diffDays(S.txn[b].date, f.date));
    });
  }
  function otherCands(f, q) {
    var used = usedIds(f), target = bankAmt(f);
    q = String(q || '').toLowerCase();
    var list = S.txns.filter(function (t) {
      if (t.hidden || used[t.id]) return false;
      var a = candAmt(t, f.account); if (!a) return false;
      if ((a > 0) !== (target > 0)) return false;
      if (Math.abs(U.diffDays(t.date, f.date)) > 180) return false;
      if (q && ((t.type + ' ' + (t.no || '') + ' ' + S.payeeName(t) + ' ' + U.num(Math.abs(a)) + ' ' + U.fmtDate(t.date)).toLowerCase().indexOf(q) < 0)) return false;
      return true;
    });
    list.sort(function (a, b) {
      var da = Math.abs(Math.abs(candAmt(a, f.account)) - Math.abs(target)), db = Math.abs(Math.abs(candAmt(b, f.account)) - Math.abs(target));
      return da - db || Math.abs(U.diffDays(a.date, f.date)) - Math.abs(U.diffDays(b.date, f.date));
    });
    return list.slice(0, 25).map(function (t) { return t.id; });
  }
  var TLBL = { 'Refund': 'Refund Receipt', 'Payment': 'Payment' };
  function matchText(t, acct) {
    var a = candAmt(t, acct), pay = S.payeeName(t);
    return (TLBL[t.type] || t.type) + (t.no ? ' ' + t.no : '') + ' - ' + U.fmtDate(t.date) + (pay ? ' ' + pay : '') + ' ' + U.money(a);
  }
  function mcState(f) { return ST.bank.mc[f.id] || (ST.bank.mc[f.id] = { sel: {}, touched: false, q: '', all: false }); }
  function selectedMatches(f) {
    var mc = ST.bank.mc[f.id];
    if (mc && mc.touched) return Object.keys(mc.sel).filter(function (k) { return mc.sel[k] && S.txn[k]; });
    var c = hintCands(f); return c.length ? [c[0]] : [];
  }

  function buildTxn(f, mode) {
    var acct = f.account, out = !!f.spent, amt = U.r2(f.spent || f.received), e = eff(f), memo = f.memo || '';
    if (mode === 'transfer') {
      var other = f.transfer || (e.rule && e.rule.assign.transfer) || '';
      if (!other || !S.acct[other]) return { err: 'Choose the account for this transfer.' };
      if (other === acct) return { err: "You can't transfer money to the same account." };
      return { t: { type: 'Transfer', no: '', date: f.date, account: out ? acct : other, toAccount: out ? other : acct, total: amt, memo: memo, lines: [] }, how: 'Transfer ' + (out ? 'to ' : 'from ') + S.fullName(other) };
    }
    var lines;
    if (f.split && f.split.length) {
      var ls = f.split.filter(function (l) { return l.acct || U.parseMoney(l.amount); });
      if (!ls.length || ls.some(function (l) { return !l.acct || !S.acct[l.acct]; })) return { err: 'Choose a category for every split line.' };
      var sum = U.r2(ls.reduce(function (s, l) { return s + U.parseMoney(l.amount); }, 0));
      if (Math.abs(sum - amt) > 0.004) return { err: 'The split lines add up to ' + U.money(sum) + '. They need to equal ' + U.money(amt) + '.' };
      lines = ls.map(function (l) { return { acct: l.acct, amount: U.r2(U.parseMoney(l.amount)), desc: l.desc || memo, cust: l.cust || '' }; });
    } else {
      if (!e.cat || !S.acct[e.cat]) return { err: 'Choose a category before you post.' };
      lines = [{ acct: e.cat, amount: amt, desc: memo, cust: out ? (f.cust || '') : (S.cust[e.payee] ? e.payee : '') }];
    }
    var payee = e.payee, t;
    if (out) t = { type: 'Expense', no: '', date: f.date, payee: payee, account: acct, total: amt, memo: memo, lines: lines, method: '' };
    else if (isCC(acct)) t = { type: 'Credit Card Credit', no: '', date: f.date, payee: payee, account: acct, total: amt, memo: memo, lines: lines };
    else t = { type: 'Deposit', no: '', date: f.date, account: acct, total: amt, memo: memo, lines: lines, cust: S.cust[payee] ? payee : '', payee: S.vend[payee] ? payee : '' };
    if (f.attach) t.attachments = [f.attach];
    return { t: t, how: lines.length > 1 ? '--Split--' : S.fullName(lines[0].acct) };
  }
  function matchRow(f, ids) {
    ids = uniq(ids).filter(function (id) { return S.txn[id]; });
    if (!ids.length) return 'Select a record to match, or categorize this transaction instead.';
    var sum = U.r2(ids.reduce(function (s, id) { return s + candAmt(S.txn[id], f.account); }, 0));
    if (Math.abs(sum - bankAmt(f)) > 0.004) return 'The selected records add up to ' + U.money(sum) + '. They need to match the bank amount of ' + U.money(bankAmt(f)) + '.';
    f.state = 'posted'; f.matched = ids[0]; f.matchedIds = ids; f.postedOn = U.today();
    ids.forEach(function (id) {
      var t = S.txn[id];
      if (!amtIn(t, f.account) && undepOk(t)) { t.account = f.account; (f.moved = f.moved || []).push(id); }
      if (ST.cleared[id] !== 'R') ST.cleared[id] = 'C';
    });
    return '';
  }
  /* Post one pending row. Returns an error message, or '' when it worked. Store change is up to the caller. */
  function postRow(f) {
    if (f.state !== 'pending') return '';
    var mode = modeOf(f);
    if (mode === 'match') return matchRow(f, selectedMatches(f));
    var b = buildTxn(f, mode); if (b.err) return b.err;
    var t = b.t; t.id = U.uid('t'); t.fromBank = f.id;
    S.add(t, true); S.log('Added', t);
    ST.cleared[t.id] = 'C';
    f.state = 'posted'; f.created = t.id; f.how = b.how; f.postedOn = U.today();
    return '';
  }
  function undoRow(f) {
    if (f.created && ST.cleared[f.created] === 'R') return 'This transaction is reconciled, so it can\'t be undone here.';
    if (f.matchedIds && f.matchedIds.some(function (id) { return ST.cleared[id] === 'R'; })) return 'The matched record is reconciled, so it can\'t be undone here.';
    var rm = f.created || null;
    (f.matchedIds || []).forEach(function (id) { if (ST.cleared[id] === 'C') delete ST.cleared[id]; });
    (f.moved || []).forEach(function (id) { if (S.txn[id]) S.txn[id].account = 'a_undep'; });
    f.state = 'pending'; delete f.created; delete f.matched; delete f.matchedIds; delete f.how; delete f.postedOn; delete f.moved; delete f.byRule;
    if (rm) { delete ST.cleared[rm]; removeTxnSilent(rm); }
    return '';
  }
  function autoAdd() {
    var n = 0;
    eachFeed(function (f) {
      if (f.state !== 'pending' || f.kind !== 'cat') return;
      var r = ruleFor(f);
      if (r && r.auto && !postRow(f)) { f.byRule = r.name; n++; }
    });
    return n;
  }

  /* ═════════════════ Bank transactions view ═════════════════ */
  var PAGE = 50;
  var KINDS = [['all', 'All transactions'], ['in', 'Money in'], ['out', 'Money out'], ['cat', 'Categorized'], ['match', 'Matched'], ['rule', 'Rule applied'], ['review', 'Needs review']];
  function kindOk(f, k) {
    switch (k) {
      case 'in': return !!f.received;
      case 'out': return !!f.spent;
      case 'cat': return f.state === 'pending' ? modeOf(f) !== 'match' : !!f.created;
      case 'match': return f.state === 'pending' ? modeOf(f) === 'match' : !!f.matchedIds;
      case 'rule': return !!ruleFor(f) || !!f.byRule;
      case 'review': return !!f.warn;
      default: return true;
    }
  }
  function searchOk(f, q) {
    if (!q) return true;
    var hay = [f.desc, U.fmtDate(f.date), f.spent ? U.num(f.spent) : '', f.received ? U.num(f.received) : '', String(f.spent || f.received || ''), f.memo, payeeLabel(eff(f).payee)].join(' ').toLowerCase();
    return hay.indexOf(q.toLowerCase()) >= 0;
  }
  function sortFeed(rows) {
    var B = ST.bank, k = B.sort, dir = B.dir === 'asc' ? 1 : -1;
    var idx = rows.map(function (f, i) { return { f: f, i: i }; });
    idx.sort(function (a, b) {
      var x, y;
      if (k === 'desc') { x = String(a.f.desc || '').toLowerCase(); y = String(b.f.desc || '').toLowerCase(); }
      else if (k === 'spent') { x = a.f.spent || 0; y = b.f.spent || 0; }
      else if (k === 'received') { x = a.f.received || 0; y = b.f.received || 0; }
      else { x = a.f.date; y = b.f.date; }
      return (x < y ? -1 : x > y ? 1 : 0) * dir || a.i - b.i;
    });
    return idx.map(function (o) { return o.f; });
  }
  function cardHtml(id) {
    var a = S.acct[id], B = ST.bank, n = pendingCount(id), cc = isCC(id);
    var bank = a.bankBalance == null ? null : (cc ? -a.bankBalance : a.bankBalance);
    var mins = Math.max(0, Math.floor((Date.now() - B.updated) / 60000));
    return '<div class="qba-card' + (id === B.acct ? ' on' : '') + '" data-act="qba:bank.acct|' + id + '" role="button" tabindex="0">' +
      '<div class="qba-card-top"><span class="qba-card-ic">' + ic(cc ? 'card' : 'bank') + '</span><span class="qba-card-name">' + esc(a.name) + '</span>' + (n ? '<span class="qba-count">' + n + '</span>' : '') + '</div>' +
      '<div class="qba-card-row"><span>Bank balance</span><b>' + (bank == null ? '--' : U.money(bank)) + '</b></div>' +
      '<div class="qba-card-row"><span>Posted</span><b>' + U.money(L.balance(id)) + '</b></div>' +
      '<div class="qba-card-foot"><button type="button" class="qba-refresh" data-act="qba:bank.refresh|' + id + '" title="Update" aria-label="Update">' + ic('refresh') + '</button><span>' + mins + 'm</span></div></div>';
  }
  function sortTh(key, label, cls) {
    var B = ST.bank, on = B.sort === key;
    return '<th class="is-sort ' + (cls || '') + '" data-act="qba:bank.sort|' + key + '"><span>' + label + '</span>' + (on ? ic(B.dir === 'asc' ? 'caretUp' : 'caretDown', 'qb-sort-ic') : '') + '</th>';
  }
  function mcCell(f, e, mode) {
    if (mode === 'match') {
      var c = hintCands(f), mc = ST.bank.mc[f.id], txt;
      var multi = f.hint && f.hint.multi && (f.matches || []).length > 1;
      if (mc && mc.touched) {
        var sel = selectedMatches(f);
        txt = !sel.length ? '<span class="qba-muted">Select a record</span>' : sel.length > 1 ? sel.length + ' records selected' : esc(matchText(S.txn[sel[0]], f.account));
      } else if (!c.length) txt = '<button type="button" class="qb-link" data-act="qba:bank.findmatch|' + f.id + '">No matches found. Find other match</button>';
      else if (multi || c.length > 1) txt = '<button type="button" class="qb-link" data-act="qba:bank.open|' + f.id + '">' + (multi ? f.matches.length : c.length) + ' matches found</button>';
      else txt = esc(matchText(S.txn[c[0]], f.account));
      return '<div class="qba-mcell"><span class="qba-badge-match">MATCH</span><span class="qba-mtext">' + txt + '</span></div>';
    }
    if (mode === 'transfer') {
      var other = f.transfer || (e.rule && e.rule.assign.transfer) || '';
      return '<div class="qba-mcell"><span class="qba-badge-xfer">TRANSFER</span><span class="qba-mtext">' + (other ? esc((f.spent ? 'To ' : 'From ') + S.fullName(other)) : '<span class="qba-muted">Select an account</span>') + '</span></div>';
    }
    if (f.split && f.split.length) return '<div class="qba-mcell"><span class="qba-split-tag">--Split--</span></div>';
    var warn = f.warn && !f.catSet ? '<span class="qba-warn" title="QuickBooks isn\'t sure about this category. Review it before you post.">!</span>' : '';
    var rule = e.rule ? '<span class="qba-rule-tag" title="Rule: ' + esc(e.rule.name) + '">' + ic('sparkle') + 'Rule</span>' : '';
    return '<div class="qba-catcell">' + warn + cbx('rc', 'cat', f.id + '|cat', S.fullName(e.cat), 'Select category') + rule + '</div>';
  }
  function actionSplit(f, mode) {
    var items = [['Exclude', 'qba:bank.exclude|' + f.id], ['Split', 'qba:bank.split|' + f.id], ['Find other match', 'qba:bank.findmatch|' + f.id], ['Create rule', 'qba:bank.rule|' + f.id]];
    return '<span class="qba-sm">' + UI.split(mode === 'match' ? 'Match' : 'Post', items, { act: 'qba:bank.post|' + f.id, kind: 'secondary' }) + '</span>';
  }
  function splitHtml(f) {
    var amt = U.r2(f.spent || f.received);
    var h = '<table class="qba-split"><thead><tr><th class="qba-w30">#</th><th>Category</th><th>Description</th>' + (f.spent ? '<th>Customer</th>' : '') + '<th class="ta-r qba-w120">Amount</th><th class="qba-w30"></th></tr></thead><tbody>';
    f.split.forEach(function (l, i) {
      h += '<tr><td class="ta-c qba-muted">' + (i + 1) + '</td><td>' + cbx('sa', 'cat', f.id + '|split|' + i, S.fullName(l.acct), 'Select category') + '</td>' +
        '<td><input class="qb-input" data-split="' + f.id + '|' + i + '|desc" value="' + esc(l.desc || '') + '"></td>' +
        (f.spent ? '<td>' + cbx('sc', 'cust', f.id + '|splitcust|' + i, payeeLabel(l.cust), 'Select customer') + '</td>' : '') +
        '<td><input class="qb-input ta-r" data-split="' + f.id + '|' + i + '|amount" value="' + esc(l.amount) + '" inputmode="decimal"></td>' +
        '<td class="ta-c"><button type="button" class="qb-icon-btn" data-act="qba:bank.delSplit|' + f.id + '|' + i + '" aria-label="Delete line">' + ic('trash') + '</button></td></tr>';
    });
    h += '</tbody></table><div class="qba-split-foot"><button type="button" class="qb-link" data-act="qba:bank.addSplit|' + f.id + '">' + ic('plus') + 'Add line</button><span class="qb-grow"></span><span data-sdiff="' + f.id + '">' + splitDiff(f) + '</span></div>';
    return h;
  }
  function splitDiff(f) {
    var amt = U.r2(f.spent || f.received), sum = U.r2((f.split || []).reduce(function (s, l) { return s + U.parseMoney(l.amount); }, 0)), d = U.r2(amt - sum);
    return 'Original amount <b>' + U.money(amt) + '</b><span class="qba-dot-sep"></span>Total <b>' + U.money(sum) + '</b><span class="qba-dot-sep"></span><span class="' + (Math.abs(d) > 0.004 ? 'qba-bad' : 'qba-good') + '">Difference <b>' + U.money(d) + '</b></span>';
  }
  function detailHtml(f) {
    var mode = modeOf(f), e = eff(f), out = !!f.spent, id = f.id;
    var radios = [['cat', 'Categorize'], ['match', 'Match'], ['transfer', 'Record as transfer']].map(function (m) {
      return '<label class="qba-radio"><input type="radio" name="bm_' + id + '" data-bmode="' + id + '" value="' + m[0] + '"' + (mode === m[0] ? ' checked' : '') + '><span>' + m[1] + '</span></label>';
    }).join('');
    var body = '', foot = '';
    var memo = UI.field('Memo', '<textarea class="qb-input" rows="2" data-dmemo="' + id + '" placeholder="Add a memo">' + esc(f.memo || '') + '</textarea>', 'qba-f-memo');
    var bankDet = '<div class="qba-det-bank"><span>BANK DETAIL</span>' + (f.desc ? esc(f.desc) : '<i class="qba-muted">No description from the bank</i>') + '</div>';
    var attach = '<button type="button" class="qb-link" data-act="qba:bank.attach|' + id + '">' + ic('attach') + (f.attach ? esc(f.attach) : 'Add attachment') + '</button>';
    if (mode === 'cat') {
      var payPh = out ? 'Select vendor' : f.side === 'c_none' ? 'Select payee' : 'Select customer';
      body = '<div class="qba-det-grid">' + UI.field(out ? 'Vendor' : 'Customer', cbx('dp', out ? 'pout' : 'pin', id + '|payee', payeeLabel(e.payee), payPh));
      if (!f.split) {
        body += UI.field('Category', cbx('dc', 'cat', id + '|cat', S.fullName(e.cat), 'Select category'));
        if (out) body += UI.field('Customer', cbx('dcu', 'cust', id + '|cust', payeeLabel(f.cust), 'Select customer'));
      }
      body += memo + '</div>';
      if (f.split) body += splitHtml(f);
      body += bankDet;
      foot = attach + (f.split ? '<button type="button" class="qb-link" data-act="qba:bank.unsplit|' + id + '">Revert split</button>' : '<button type="button" class="qb-link" data-act="qba:bank.split|' + id + '">' + ic('copy') + 'Split</button>') +
        '<button type="button" class="qb-link" data-act="qba:bank.rule|' + id + '">Create a rule</button><span class="qb-grow"></span>' + UI.btn('Post', { kind: 'primary', act: 'qba:bank.post|' + id });
    } else if (mode === 'match') {
      var mc = mcState(f), hints = hintCands(f), ids = mc.all ? otherCands(f, mc.q) : hints, sel = selectedMatches(f), selMap = {};
      sel.forEach(function (k) { selMap[k] = 1; if (ids.indexOf(k) < 0) ids.unshift(k); });
      body = '<div class="qba-mhead"><b>' + (mc.all ? 'Find other records' : 'Records found') + '</b>' +
        (mc.all ? '<div class="qb-search-box qba-msearch"><input class="qb-input" data-mq="' + id + '" placeholder="Search by payee, amount or ref no." value="' + esc(mc.q) + '">' + ic('search') + '</div>' : '') + '</div>';
      if (!ids.length) body += '<div class="qba-mnone">We didn\'t find a record that matches this bank transaction. Try <button type="button" class="qb-link" data-act="qba:bank.findmatch|' + id + '">Find other records</button>, or categorize it instead.</div>';
      else {
        body += '<table class="qba-mtable"><thead><tr><th class="qba-w30"></th><th>Date</th><th>Type</th><th>Ref no.</th><th>Payee</th><th class="ta-r">Amount</th></tr></thead><tbody>' + ids.map(function (tid) {
          var t = S.txn[tid];
          return '<tr><td><input type="checkbox" data-dm="' + id + '|' + tid + '"' + (selMap[tid] ? ' checked' : '') + '></td><td>' + U.fmtDate(t.date) + '</td><td>' + esc(TLBL[t.type] || t.type) + '</td><td>' + esc(t.no || '') + '</td><td>' + esc(S.payeeName(t)) + (undepOk(t) ? ' <span class="qba-sub">(Undeposited Funds)</span>' : '') + '</td><td class="ta-r">' + U.money(candAmt(t, f.account)) + '</td></tr>';
        }).join('') + '</tbody></table>';
      }
      var sum = U.r2(sel.reduce(function (s, k) { return s + candAmt(S.txn[k], f.account); }, 0)), dif = U.r2(bankAmt(f) - sum);
      body += '<div class="qba-msum">Bank amount <b>' + U.money(bankAmt(f)) + '</b><span class="qba-dot-sep"></span>Selected <b>' + U.money(sum) + '</b><span class="qba-dot-sep"></span><span class="' + (Math.abs(dif) > 0.004 ? 'qba-bad' : 'qba-good') + '">Difference <b>' + U.money(dif) + '</b></span></div>' + bankDet;
      foot = (mc.all ? '<button type="button" class="qb-link" data-act="qba:bank.hints|' + id + '">Show suggested matches</button>' : '<button type="button" class="qb-link" data-act="qba:bank.findmatch|' + id + '">Find other records</button>') +
        '<span class="qb-grow"></span>' + UI.btn('Match', { kind: 'primary', act: 'qba:bank.post|' + id, disabled: !sel.length || Math.abs(dif) > 0.004 });
    } else {
      var other = f.transfer || (e.rule && e.rule.assign.transfer) || '';
      var opts = [['', 'Select account']].concat(S.accountsBy(['Bank', 'Credit Card', 'Other Current Assets', 'Fixed Assets', 'Other Assets', 'Other Current Liabilities', 'Long Term Liabilities', 'Equity']).filter(function (a) { return a.id !== f.account; }).map(function (a) { return [a.id, S.fullName(a.id)]; }));
      body = '<div class="qba-det-grid">' + UI.field(out ? 'Transfer to' : 'Transfer from', UI.select('dx', opts, other, ' data-dx="' + id + '"')) + memo + '</div>' + bankDet;
      foot = attach + '<span class="qb-grow"></span>' + UI.btn('Post', { kind: 'primary', act: 'qba:bank.post|' + id });
    }
    return '<div class="qba-det"><div class="qba-det-modes">' + radios + '</div>' + body + '<div class="qba-det-foot">' + foot + '</div></div>';
  }
  function postedText(f) {
    if (f.created) {
      var t = S.txn[f.created];
      if (!t) return '<span class="qba-posted-k">Added</span> <span class="qba-muted">(record deleted)</span>';
      return '<span class="qba-posted-k">Added</span> ' + esc(t.type + ': ' + (f.how || '')) + (f.byRule ? ' <span class="qba-rule-tag">' + ic('sparkle') + 'Rule</span>' : '');
    }
    if (f.matchedIds) return '<span class="qba-posted-k">Matched</span> ' + f.matchedIds.map(function (id) { return S.txn[id] ? esc(matchText(S.txn[id], f.account)) : '<span class="qba-muted">Record deleted</span>'; }).join('<br>');
    return '';
  }
  function drawBank(el) {
    var B = ST.bank;
    var head = UI.pageHead('Bank transactions', {
      crumb: 'Accounting',
      actions: UI.btn('Update', { kind: 'tertiary', icon: 'refresh', act: 'qba:bank.update', cls: 'qba-update' }) +
        UI.split('Link account', [['Upload from file', 'qba:bank.upload'], ['Manage connections', 'qba:bank.manage']], { act: 'qba:bank.link' })
    });
    if (!B.acct) {
      el.innerHTML = head + '<div class="qba-empty">' + QB.art('phone') + '<h2>Connect your bank to get started</h2><p>Link an account and QuickBooks brings in your transactions so you can categorize them.</p>' + UI.btn('Link account', { kind: 'primary', act: 'qba:bank.link' }) + '</div>';
      return;
    }
    var a = S.acct[B.acct], feed = S.bankFeed[B.acct] || [], cnt = { pending: 0, posted: 0, excluded: 0 };
    feed.forEach(function (f) { cnt[f.state] = (cnt[f.state] || 0) + 1; });
    var tabRows = feed.filter(function (f) { return f.state === B.tab; });
    var rows = sortFeed(tabRows.filter(function (f) { return inRange(f.date, B.range) && kindOk(f, B.kind) && searchOk(f, B.q); }));
    var total = rows.length, pages = Math.max(1, Math.ceil(total / PAGE));
    if (B.page >= pages) B.page = pages - 1; if (B.page < 0) B.page = 0;
    var shown = rows.slice(B.page * PAGE, B.page * PAGE + PAGE);
    var from = total ? B.page * PAGE + 1 : 0, to = Math.min(total, (B.page + 1) * PAGE);
    var checked = Object.keys(B.checked).filter(function (k) { return B.checked[k] && tabRows.some(function (f) { return f.id === k; }); });

    var h = head + '<div class="qba-bk-top"><button type="button" class="qba-acct-dd" data-act="qba:bank.acctMenu">' + ic(isCC(B.acct) ? 'card' : 'bank') + '<span>' + esc(a.name) + '</span>' + ic('caretDown') + '</button></div>';
    h += '<div class="qba-cards">' + feedAccts().map(cardHtml).join('') + '</div>';
    h += '<div class="qba-tabrow"><div class="qb-tabs qba-tabs">' +
      '<button type="button" class="' + (B.tab === 'pending' ? 'on' : '') + '" data-act="qba:bank.tab|pending">Pending (' + cnt.pending + ')</button>' +
      '<button type="button" class="' + (B.tab === 'posted' ? 'on' : '') + '" data-act="qba:bank.tab|posted">Posted</button>' +
      '<button type="button" class="' + (B.tab === 'excluded' ? 'on' : '') + '" data-act="qba:bank.tab|excluded">Excluded</button></div><span class="qb-grow"></span>' +
      '<button type="button" class="qb-link" data-act="qba:bank.prev">Switch to previous version</button><span class="qba-vsep"></span><button type="button" class="qb-link" data-act="qba:bank.register">Go to bank register</button></div>';
    var kindOpts = KINDS.map(function (k) { return [k[0], k[1] + ' (' + tabRows.filter(function (f) { return kindOk(f, k[0]); }).length + ')']; });
    h += '<div class="qba-tools"><div class="qb-search-box qba-search"><input class="qb-input" data-bq placeholder="Search by description, check number, or amount" value="' + esc(B.q) + '">' + ic('search') + '</div>' +
      UI.select('bkrange', U.RANGES, B.range, ' data-bf="range" aria-label="Date"') + UI.select('bkkind', kindOpts, B.kind, ' data-bf="kind" aria-label="Filter"') +
      '<span class="qb-grow"></span><span class="qba-pg"><button type="button" class="qb-icon-btn" data-act="qba:bank.page|-1"' + (B.page ? '' : ' disabled') + ' aria-label="Previous page">' + ic('caretLeft') + '</button><span>' + from + '-' + to + ' of ' + total + '</span>' +
      '<button type="button" class="qb-icon-btn" data-act="qba:bank.page|1"' + (B.page < pages - 1 ? '' : ' disabled') + ' aria-label="Next page">' + ic('caretRight') + '</button><span class="qba-muted">Page ' + (B.page + 1) + ' of ' + pages + '</span></span>' +
      iconBtn('print', 'bank.print', 'Print') + iconBtn('export', 'bank.export', 'Export') + iconBtn('gear', 'bank.gear', 'Settings') + '</div>';
    if (checked.length) {
      h += '<div class="qba-batch"><b>' + checked.length + ' selected</b>';
      if (B.tab === 'pending') h += UI.btn('Post', { kind: 'primary', cls: 'qb-btn-sm', act: 'qba:bank.batch|post' }) + UI.btn('Categorize', { kind: 'tertiary', cls: 'qb-btn-sm', act: 'qba:bank.batch|categorize' }) + UI.btn('Exclude', { kind: 'tertiary', cls: 'qb-btn-sm', act: 'qba:bank.batch|exclude' });
      else if (B.tab === 'posted') h += UI.btn('Undo', { kind: 'primary', cls: 'qb-btn-sm', act: 'qba:bank.batch|undo' });
      else h += UI.btn('Restore', { kind: 'primary', cls: 'qb-btn-sm', act: 'qba:bank.batch|restore' }) + UI.btn('Delete', { kind: 'tertiary', cls: 'qb-btn-sm', act: 'qba:bank.batch|delete' });
      h += '<button type="button" class="qb-link" data-act="qba:bank.clearsel">Clear selection</button></div>';
    }
    var allOn = shown.length && shown.every(function (f) { return B.checked[f.id]; });
    var heads = ['<th class="qb-col-chk"><input type="checkbox" data-bchk="all"' + (allOn ? ' checked' : '') + ' aria-label="Select all"></th>', sortTh('date', 'Date'), sortTh('desc', 'Bank description'), sortTh('spent', 'Spent', 'ta-r'), sortTh('received', 'Received', 'ta-r')];
    if (B.tab === 'pending') {
      if (!B.hide.attach) heads.push('<th class="ta-c qba-w40" title="Attachments">' + ic('attach', 'qba-th-ic') + '</th>');
      if (!B.hide.memo) heads.push('<th class="ta-c qba-w40" title="Memo">' + ic('comment', 'qba-th-ic') + '</th>');
      if (!B.hide.payee) heads.push('<th>From/To</th>');
      heads.push('<th>Match/Categorize</th>', '<th class="ta-r">Action</th>');
    } else if (B.tab === 'posted') heads.push('<th>From/To</th>', '<th>Categorized or matched</th>', '<th class="ta-r">Action</th>');
    else heads.push('<th>Excluded on</th>', '<th class="ta-r">Action</th>');
    h += '<div class="qb-table-wrap"><table class="qb-table is-case qba-bk-table"><thead><tr>' + heads.join('') + '</tr></thead><tbody>';
    if (!shown.length) h += '<tr class="qb-empty-row"><td colspan="' + heads.length + '">' + (B.tab === 'pending' ? (tabRows.length ? 'No transactions match your filters.' : 'You\'re all caught up. There are no transactions to review.') : B.tab === 'posted' ? 'No posted transactions yet.' : 'No excluded transactions.') + '</td></tr>';
    shown.forEach(function (f) {
      var chk = '<td class="qb-col-chk"><input type="checkbox" data-bchk="' + f.id + '"' + (B.checked[f.id] ? ' checked' : '') + '></td>';
      var base = '<td class="qba-nowrap">' + U.fmtDate(f.date) + '</td><td class="qba-bk-desc">' + (f.desc ? esc(f.desc) : '<span class="qba-muted">&nbsp;</span>') + '</td><td class="ta-r">' + (f.spent ? U.num(f.spent) : '') + '</td><td class="ta-r">' + (f.received ? U.num(f.received) : '') + '</td>';
      if (B.tab === 'pending') {
        var e = eff(f), mode = modeOf(f), open = B.open === f.id, out = !!f.spent;
        h += '<tr class="qba-bk-row is-click' + (open ? ' is-open' : '') + (B.checked[f.id] ? ' is-chk' : '') + '" data-act="qba:bank.toggle|' + f.id + '">' + chk + base;
        if (!B.hide.attach) h += '<td class="ta-c"><button type="button" class="qba-plus' + (f.attach ? ' has' : '') + '" data-act="qba:bank.attach|' + f.id + '" title="' + esc(f.attach || 'Add attachment') + '" aria-label="Add attachment">' + ic(f.attach ? 'attach' : 'plus') + '</button></td>';
        if (!B.hide.memo) h += '<td class="ta-c"><button type="button" class="qba-plus' + (f.memo ? ' has' : '') + '" data-act="qba:bank.memo|' + f.id + '" title="' + esc(f.memo || 'Add memo') + '" aria-label="Add memo">' + ic(f.memo ? 'comment' : 'plus') + '</button></td>';
        if (!B.hide.payee) {
          var ft = '';
          if (mode === 'match') {
            var sm = selectedMatches(f), touched = (ST.bank.mc[f.id] || {}).touched, many = !touched && ((f.hint && f.hint.multi) || hintCands(f).length > 1);
            if (sm.length === 1 && !many) ft = '<span class="qba-bk-payee">' + esc(S.payeeName(S.txn[sm[0]])) + '</span>';
          }
          else if (mode === 'cat') ft = cbx('rp', out ? 'pout' : 'pin', f.id + '|payee', payeeLabel(e.payee), out ? 'Select vendor' : f.side === 'c_none' ? 'Select payee' : 'Select customer');
          h += '<td class="qba-bk-ft">' + ft + '</td>';
        }
        h += '<td class="qba-bk-mc">' + mcCell(f, e, mode) + '</td><td class="ta-r qba-bk-act">' + actionSplit(f, mode) + '</td></tr>';
        if (open) h += '<tr class="qba-bk-detrow"><td colspan="' + heads.length + '">' + detailHtml(f) + '</td></tr>';
      } else if (B.tab === 'posted') {
        var pt = f.created ? S.txn[f.created] : f.matched ? S.txn[f.matched] : null;
        h += '<tr' + (pt ? ' class="is-click" data-act="txn:' + pt.id + '"' : '') + '>' + chk + base + '<td>' + esc(pt ? S.payeeName(pt) : '') + '</td><td class="qba-posted">' + postedText(f) + '</td>' +
          '<td class="ta-r"><span class="qba-sm">' + UI.btn('Undo', { kind: 'secondary', act: 'qba:bank.undo|' + f.id }) + '</span></td></tr>';
      } else {
        h += '<tr>' + chk + base + '<td class="qba-muted">' + (f.excludedOn ? U.fmtDate(f.excludedOn) : '') + '</td><td class="ta-r">' +
          '<span class="qba-sm">' + UI.split('Restore', [['Delete', 'qba:bank.delete|' + f.id]], { act: 'qba:bank.restore|' + f.id, kind: 'secondary' }) + '</span></td></tr>';
      }
    });
    h += '</tbody></table></div>';
    if (total > PAGE) h += '<div class="qb-pager"><button type="button" data-act="qba:bank.page|-1"' + (B.page ? '' : ' disabled') + '>Previous</button><span>' + from + '-' + to + ' of ' + total + '</span><button type="button" data-act="qba:bank.page|1"' + (B.page < pages - 1 ? '' : ' disabled') + '>Next</button></div>';
    el.innerHTML = h;
    bindCombos(el, function (inp, v) {
      var p = inp.getAttribute('data-cb').split('|'), f = feedRow(p[1]);
      if (!f) return;
      setBankField(f, p[2], +p[3], v);
      redraw();
    });
    el.onchange = function (ev) {
      var t = ev.target, f;
      if (t.hasAttribute('data-bchk')) {
        var k = t.getAttribute('data-bchk');
        if (k === 'all') shown.forEach(function (r) { B.checked[r.id] = t.checked; }); else B.checked[k] = t.checked;
        return redraw();
      }
      if (t.hasAttribute('data-bf')) { B[t.getAttribute('data-bf')] = t.value; B.page = 0; return redraw(); }
      if (t.hasAttribute('data-bmode')) { B.mode[t.getAttribute('data-bmode')] = t.value; return redraw(); }
      if (t.hasAttribute('data-dm')) {
        var dp = t.getAttribute('data-dm').split('|'); f = feedRow(dp[0]); if (!f) return;
        var mc = mcState(f);
        if (!mc.touched) { mc.sel = {}; selectedMatches(f).forEach(function (x) { mc.sel[x] = true; }); mc.touched = true; }
        mc.sel[dp[1]] = t.checked;
        return redraw();
      }
      if (t.hasAttribute('data-dx')) { f = feedRow(t.getAttribute('data-dx')); if (f) { f.transfer = t.value; redraw(); } return; }
      if (t.hasAttribute('data-cb')) {
        var cp = t.getAttribute('data-cb').split('|'); f = feedRow(cp[1]); if (!f) return;
        var txt = t.value.trim();
        if (txt === (t.getAttribute('data-label') || '')) return;
        var id = txt ? lookupFor(cp[0], txt) : '';
        if (id === null) { UI.toast('We couldn\'t find "' + txt + '". Pick one from the list or add it.', 'err'); return redraw(); }
        setBankField(f, cp[2], +cp[3], id);
        redraw();
      }
    };
    el.oninput = function (ev) {
      var t = ev.target, f;
      if (t.hasAttribute('data-bq')) { B.q = t.value; B.page = 0; redraw(); refocus(el, '[data-bq]'); return; }
      if (t.hasAttribute('data-dmemo')) { f = feedRow(t.getAttribute('data-dmemo')); if (f) f.memo = t.value; return; }
      if (t.hasAttribute('data-mq')) { f = feedRow(t.getAttribute('data-mq')); if (f) { mcState(f).q = t.value; redraw(); refocus(el, '[data-mq="' + f.id + '"]'); } return; }
      if (t.hasAttribute('data-split')) {
        var sp = t.getAttribute('data-split').split('|'); f = feedRow(sp[0]); if (!f || !f.split || !f.split[+sp[1]]) return;
        f.split[+sp[1]][sp[2]] = t.value;
        var d = el.querySelector('[data-sdiff="' + f.id + '"]'); if (d) d.innerHTML = splitDiff(f);
      }
    };
  }
  function setBankField(f, field, i, v) {
    if (field === 'payee') { f.payee = v; f.payeeSet = true; }
    else if (field === 'cat') { f.category = v; f.catSet = true; }
    else if (field === 'cust') f.cust = v;
    else if (field === 'split' && f.split && f.split[i]) f.split[i].acct = v;
    else if (field === 'splitcust' && f.split && f.split[i]) f.split[i].cust = v;
  }

  QB.view('banking', function (params, el) {
    var B = ST.bank, accts = feedAccts();
    if (params.acct && params.acct !== B.param) { B.param = params.acct; if (S.bankFeed[params.acct]) { B.acct = params.acct; B.tab = 'pending'; B.open = null; } }
    if (!B.acct || !S.bankFeed[B.acct]) B.acct = accts[0] || null;
    mount(el, function () { drawBank(el); });
  });

  ACT['bank.acct'] = function (a) { var B = ST.bank; if (S.bankFeed[a[0]]) { B.acct = a[0]; B.open = null; B.checked = {}; B.page = 0; } redraw(); };
  ACT['bank.acctMenu'] = function (a, el) { UI.menu(el, feedAccts().map(function (id) { return [S.acct[id].name + ' (' + pendingCount(id) + ')', 'qba:bank.acct|' + id]; }), { alignLeft: true }); };
  ACT['bank.tab'] = function (a) { var B = ST.bank; B.tab = a[0]; B.checked = {}; B.open = null; B.page = 0; redraw(); };
  ACT['bank.toggle'] = function (a) { var B = ST.bank; B.open = B.open === a[0] ? null : a[0]; redraw(); };
  ACT['bank.open'] = function (a) { ST.bank.open = a[0]; redraw(); };
  ACT['bank.sort'] = function (a) { var B = ST.bank; if (B.sort === a[0]) B.dir = B.dir === 'asc' ? 'desc' : 'asc'; else { B.sort = a[0]; B.dir = a[0] === 'date' ? 'desc' : 'asc'; } redraw(); };
  ACT['bank.page'] = function (a) { ST.bank.page += +a[0]; ST.bank.open = null; redraw(); };
  ACT['bank.clearsel'] = function () { ST.bank.checked = {}; redraw(); };
  ACT['bank.post'] = function (a) {
    var f = feedRow(a[0]); if (!f) return;
    var err = postRow(f);
    if (err) { ST.bank.open = f.id; redraw(); return UI.toast(err, 'err'); }
    if (ST.bank.open === f.id) ST.bank.open = null;
    delete ST.bank.checked[f.id];
    changed('bankfeed');
  };
  ACT['bank.exclude'] = function (a) {
    var f = feedRow(a[0]); if (!f) return;
    f.state = 'excluded'; f.excludedOn = U.today();
    if (ST.bank.open === f.id) ST.bank.open = null;
    delete ST.bank.checked[f.id];
    changed('bankfeed');
  };
  ACT['bank.restore'] = function (a) { var f = feedRow(a[0]); if (!f) return; f.state = 'pending'; delete f.excludedOn; delete ST.bank.checked[f.id]; changed('bankfeed'); };
  ACT['bank.undo'] = function (a) {
    var f = feedRow(a[0]); if (!f) return;
    var err = undoRow(f); if (err) return UI.toast(err, 'err');
    delete ST.bank.checked[f.id];
    changed('bankfeed');
  };
  ACT['bank.delete'] = function (a) {
    var f = feedRow(a[0]); if (!f) return;
    UI.confirm('Delete this transaction?', 'It will be removed from the bank feed for good. You can\'t undo this.', 'Delete', function () {
      var list = S.bankFeed[f.account]; list.splice(list.indexOf(f), 1); changed('bankfeed');
    });
  };
  ACT['bank.split'] = function (a) {
    var f = feedRow(a[0]); if (!f) return;
    var e = eff(f), amt = U.r2(f.spent || f.received);
    ST.bank.mode[f.id] = 'cat'; ST.bank.open = f.id;
    if (!f.split) f.split = [{ acct: e.cat, amount: amt.toFixed(2), desc: '', cust: '' }, { acct: '', amount: '', desc: '', cust: '' }];
    redraw();
  };
  ACT['bank.unsplit'] = function (a) { var f = feedRow(a[0]); if (!f) return; delete f.split; redraw(); };
  ACT['bank.addSplit'] = function (a) { var f = feedRow(a[0]); if (!f || !f.split) return; f.split.push({ acct: '', amount: '', desc: '', cust: '' }); redraw(); };
  ACT['bank.delSplit'] = function (a) {
    var f = feedRow(a[0]); if (!f || !f.split) return;
    f.split.splice(+a[1], 1);
    if (!f.split.length) delete f.split;
    redraw();
  };
  ACT['bank.findmatch'] = function (a) {
    var f = feedRow(a[0]); if (!f) return;
    ST.bank.mode[f.id] = 'match'; ST.bank.open = f.id; mcState(f).all = true;
    redraw();
  };
  ACT['bank.hints'] = function (a) { var f = feedRow(a[0]); if (!f) return; var mc = mcState(f); mc.all = false; mc.q = ''; redraw(); };
  ACT['bank.rule'] = function (a) {
    var f = feedRow(a[0]); if (!f) return;
    var e = eff(f);
    openRule(null, { name: f.desc || '', dir: f.received ? 'in' : 'out', acct: f.account, conds: [{ field: 'Description', op: 'contains', value: f.desc || '' }], payee: e.payee, category: e.cat });
  };
  ACT['bank.attach'] = function (a) {
    var f = feedRow(a[0]); if (!f) return;
    pickFiles(false, 'image/*,.pdf', function (files) { f.attach = files[0].name; UI.toast('Attached ' + f.attach + '.'); redraw(); });
  };
  ACT['bank.memo'] = function (a) {
    var f = feedRow(a[0]); if (!f) return;
    UI.modal('Memo', '<p class="qba-muted">' + esc(U.fmtDate(f.date) + ' · ' + (f.desc || 'Bank transaction') + ' · ' + U.money(f.spent || f.received)) + '</p><textarea class="qb-input" rows="3" data-memo-in style="width:100%">' + esc(f.memo || '') + '</textarea>', {
      buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (m) { f.memo = m.querySelector('[data-memo-in]').value; redraw(); }]]
    });
  };
  ACT['bank.update'] = function (a, el) {
    var b = el && el.closest ? el.closest('button') : null;
    if (b) { b.classList.add('is-busy'); b.disabled = true; }
    setTimeout(function () {
      ST.bank.updated = Date.now();
      var n = autoAdd();
      UI.toast('Your accounts are up to date');
      if (n) UI.toast(n + ' transaction' + (n === 1 ? ' was' : 's were') + ' added by your rules.');
      changed('bankfeed');
    }, 1300);
  };
  ACT['bank.refresh'] = function (a, el) {
    if (el) el.classList.add('is-busy');
    setTimeout(function () { ST.bank.updated = Date.now(); UI.toast(S.acct[a[0]].name + ' is up to date'); redraw(); }, 900);
  };
  ACT['bank.prev'] = function () {
    UI.modal('Switch to the previous version?', '<p>The previous version of Bank transactions shows the classic For review, Categorized and Excluded tabs. This practice copy only has the current version, so you\'ll stay here.</p>', { buttons: [['Stay on this version', 'primary']] });
  };
  ACT['bank.register'] = function () { QB.go('register', { id: ST.bank.acct }); };
  ACT['bank.print'] = function () { window.print(); };
  ACT['bank.export'] = function () {
    var B = ST.bank, rows = [['Date', 'Bank description', 'Spent', 'Received', 'Status', 'Payee', 'Category or match']];
    (S.bankFeed[B.acct] || []).forEach(function (f) {
      var e = eff(f), t = f.created ? S.txn[f.created] : f.matched ? S.txn[f.matched] : null;
      rows.push([U.fmtDate(f.date), f.desc, f.spent ? U.num(f.spent) : '', f.received ? U.num(f.received) : '', f.state, t ? S.payeeName(t) : payeeLabel(e.payee), f.state === 'posted' ? postedText(f).replace(/<[^>]+>/g, '') : S.fullName(e.cat)]);
    });
    downloadCsv('Bank transactions - ' + S.acct[B.acct].name + '.csv', rows);
  };
  ACT['bank.gear'] = function (a, el) {
    var H = ST.bank.hide;
    UI.menu(el, [{ head: 'Columns' }, [tick(!H.attach, 'Attachments'), 'qba:bank.col|attach'], [tick(!H.memo, 'Memo'), 'qba:bank.col|memo'], [tick(!H.payee, 'From/To'), 'qba:bank.col|payee']]);
  };
  ACT['bank.col'] = function (a) { ST.bank.hide[a[0]] = !ST.bank.hide[a[0]]; redraw(); };
  ACT['bank.manage'] = function () {
    UI.modal('Manage connections', '<p>These accounts are linked to bank feeds in the sample company.</p>' + feedAccts().map(function (id) {
      return '<div class="qb-cust-row">' + ic(isCC(id) ? 'card' : 'bank') + '<span>' + esc(S.acct[id].name) + '</span><span class="qb-grow"></span><span class="qba-muted">Connected · Updated ' + Math.floor((Date.now() - ST.bank.updated) / 60000) + 'm ago</span></div>';
    }).join(''), { buttons: [['Done', 'primary']] });
  };
  ACT['bank.link'] = function () {
    var banks = ['Chase', 'Bank of America', 'Wells Fargo', 'Citi', 'Capital One', 'U.S. Bank', 'PNC Bank', 'American Express', 'PayPal', 'Discover', 'TD Bank', 'Truist'];
    var m = UI.modal('Connect your bank', '<p>Search for your bank, or pick it from the list.</p><div class="qb-search-box"><input class="qb-input" data-lbq placeholder="Enter your bank name or URL">' + ic('search') + '</div>' +
      '<div class="qba-banks">' + banks.map(function (b) { return '<button type="button" class="qba-bank-tile" data-bank="' + esc(b) + '"><span class="qba-bank-av">' + esc(b.charAt(0)) + '</span><span>' + esc(b) + '</span></button>'; }).join('') + '</div>' +
      '<p class="qba-muted">Bank connections aren\'t available in this practice copy. Use <b>Upload from file</b> to bring transactions in from a CSV file.</p>',
      { wide: true, buttons: [['Cancel', 'secondary'], ['Upload from file', 'primary', function () { setTimeout(function () { ACT['bank.upload']([]); }, 0); }]] });
    m.addEventListener('click', function (e) { var t = e.target.closest('[data-bank]'); if (t) UI.toast(t.getAttribute('data-bank') + ' can\'t be connected in the practice copy. Try Upload from file.', 'err'); });
    m.addEventListener('input', function (e) {
      var q = String(e.target.value || '').toLowerCase();
      [].slice.call(m.querySelectorAll('[data-bank]')).forEach(function (b) { b.style.display = b.getAttribute('data-bank').toLowerCase().indexOf(q) >= 0 ? '' : 'none'; });
    });
  };
  /* Upload from file: reads a simple bank CSV and adds the rows to Pending. */
  function parseCsv(text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); });
    function cells(line) {
      var out = [], cur = '', q = false;
      for (var i = 0; i < line.length; i++) {
        var c = line.charAt(i);
        if (q) { if (c === '"' && line.charAt(i + 1) === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
        else if (c === '"') q = true; else if (c === ',') { out.push(cur.trim()); cur = ''; } else cur += c;
      }
      out.push(cur.trim()); return out;
    }
    if (!lines.length) return [];
    var head = cells(lines[0]).map(function (s) { return s.toLowerCase(); }), hasHead = head.some(function (s) { return /date/.test(s); });
    function find(re) { for (var i = 0; i < head.length; i++) if (re.test(head[i])) return i; return -1; }
    var di = hasHead ? find(/date/) : 0, ni = hasHead ? find(/desc|payee|name|memo|detail/) : 1, ai = hasHead ? find(/^amount$|amount/) : 2;
    var oi = hasHead ? find(/debit|withdraw|spent|money out|payment/) : -1, ii = hasHead ? find(/credit|deposit|received|money in/) : -1;
    var out = [];
    lines.slice(hasHead ? 1 : 0).forEach(function (l) {
      var c = cells(l), d = c[di] || '', iso = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : U.parseDate(d);
      if (!iso) return;
      var amt;
      if (oi >= 0 || ii >= 0) amt = U.parseMoney(c[ii]) - Math.abs(U.parseMoney(c[oi]));
      else amt = U.parseMoney(c[ai]);
      if (!amt) return;
      out.push({ date: iso, desc: ni >= 0 ? c[ni] || '' : '', amount: U.r2(amt) });
    });
    return out;
  }
  ACT['bank.upload'] = function () {
    var text = '', fname = '';
    var m = UI.modal('Upload transactions', '<p>Upload a CSV file from your bank. It needs a date, a description, and an amount (or separate money in and money out columns).</p>' +
      UI.field('Bank account', UI.select('uacct', feedAccts().map(function (id) { return [id, S.acct[id].name]; }), ST.bank.acct)) +
      '<label class="qba-drop qba-drop-sm" data-udrop><input type="file" accept=".csv,.txt" hidden data-ufile>' + ic('upload') + '<b>Drag and drop or select files</b><span>CSV files</span></label><div class="qba-ufile" data-uname></div>',
      { buttons: [['Cancel', 'secondary'], ['Continue', 'primary', function (mm) {
        if (!text) { UI.toast('Select a CSV file first.', 'err'); return false; }
        var to = mm.querySelector('[name=uacct]').value, rows = parseCsv(text);
        if (!rows.length) { UI.toast('We couldn\'t find any transactions in ' + fname + '.', 'err'); return false; }
        var feed = S.bankFeed[to] = S.bankFeed[to] || [];
        rows.forEach(function (r) {
          var f = { id: U.uid('bf'), account: to, date: r.date, desc: r.desc, spent: r.amount < 0 ? -r.amount : 0, received: r.amount > 0 ? r.amount : 0, kind: 'cat', hint: null, side: r.amount < 0 ? 'vendor' : 'customer', warn: false, state: 'pending', payee: '', category: '', memo: '', matches: [] };
          var used = usedIds(null);
          var hit = S.txns.filter(function (t) { return !t.hidden && !used[t.id] && Math.abs(amtIn(t, to) - r.amount) < 0.005 && Math.abs(U.diffDays(t.date, r.date)) <= 5; })[0];
          if (hit) { f.kind = 'match'; f.matches = [hit.id]; }
          feed.unshift(f);
        });
        ST.bank.acct = to; ST.bank.tab = 'pending'; ST.bank.page = 0;
        UI.toast(rows.length + ' transaction' + (rows.length === 1 ? ' was' : 's were') + ' added to Pending.');
        changed('bankfeed');
      }]] });
    function take(file) {
      if (!file) return;
      fname = file.name; m.querySelector('[data-uname]').textContent = file.name;
      try { var r = new FileReader(); r.onload = function () { text = String(r.result || ''); }; r.readAsText(file); } catch (e) { text = ''; }
    }
    m.querySelector('[data-ufile]').addEventListener('change', function (e) { take(e.target.files[0]); });
    var dz = m.querySelector('[data-udrop]');
    dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('is-over'); });
    dz.addEventListener('dragleave', function () { dz.classList.remove('is-over'); });
    dz.addEventListener('drop', function (e) { e.preventDefault(); dz.classList.remove('is-over'); take(e.dataTransfer.files[0]); });
  };
  ACT['bank.batch'] = function (a) {
    var B = ST.bank, what = a[0];
    var rows = Object.keys(B.checked).filter(function (k) { return B.checked[k]; }).map(feedRow).filter(function (f) { return f && f.account === B.acct; });
    if (!rows.length) return;
    var n = 0, errs = [];
    if (what === 'post') {
      rows.forEach(function (f) { if (f.state !== 'pending') return; var e = postRow(f); if (e) errs.push(e); else n++; });
      B.checked = {}; B.open = null; changed('bankfeed');
      if (n) UI.toast(n + ' transaction' + (n === 1 ? '' : 's') + ' posted.');
      if (errs.length) UI.toast(errs.length + ' couldn\'t be posted. Open them to finish: ' + errs[0], 'err');
      return;
    }
    if (what === 'exclude') { rows.forEach(function (f) { if (f.state === 'pending') { f.state = 'excluded'; f.excludedOn = U.today(); n++; } }); B.checked = {}; changed('bankfeed'); return UI.toast(n + ' transaction' + (n === 1 ? '' : 's') + ' excluded.'); }
    if (what === 'restore') { rows.forEach(function (f) { if (f.state === 'excluded') { f.state = 'pending'; n++; } }); B.checked = {}; changed('bankfeed'); return UI.toast(n + ' transaction' + (n === 1 ? '' : 's') + ' restored to Pending.'); }
    if (what === 'undo') {
      rows.forEach(function (f) { if (f.state !== 'posted') return; var e = undoRow(f); if (e) errs.push(e); else n++; });
      B.checked = {}; changed('bankfeed');
      if (n) UI.toast(n + ' transaction' + (n === 1 ? '' : 's') + ' moved back to Pending.');
      if (errs.length) UI.toast(errs[0], 'err');
      return;
    }
    if (what === 'delete') {
      return UI.confirm('Delete ' + rows.length + ' transaction' + (rows.length === 1 ? '' : 's') + '?', 'They will be removed from the bank feed for good. You can\'t undo this.', 'Delete', function () {
        rows.forEach(function (f) { var list = S.bankFeed[f.account]; list.splice(list.indexOf(f), 1); });
        B.checked = {}; changed('bankfeed');
      });
    }
    if (what === 'categorize') {
      var out = rows.every(function (f) { return f.spent; }), inn = rows.every(function (f) { return f.received; });
      var pay = '', cat = '';
      var m = UI.modal('Categorize ' + rows.length + ' transaction' + (rows.length === 1 ? '' : 's'), '<p class="qba-muted">Pick a payee and category for the selected transactions. Then we\'ll post them.</p><div class="qba-det-grid qba-one">' +
        UI.field('Payee', cbx('bp', inn ? 'pin' : 'pout', 'batch|payee', '', 'Select payee')) + UI.field('Category', cbx('bc', 'cat', 'batch|cat', '', 'Select category')) + '</div>' + (out || inn ? '' : '<p class="qba-muted">Your selection has money in and money out.</p>'),
        { buttons: [['Cancel', 'secondary'], ['Post', 'primary', function () {
          if (!cat) { UI.toast('Choose a category.', 'err'); return false; }
          rows.forEach(function (f) {
            if (f.state !== 'pending') return;
            if (pay) { f.payee = pay; f.payeeSet = true; }
            f.category = cat; f.catSet = true; ST.bank.mode[f.id] = 'cat'; delete f.split;
            if (!postRow(f)) n++;
          });
          B.checked = {}; changed('bankfeed');
          UI.toast(n + ' transaction' + (n === 1 ? '' : 's') + ' posted.');
        }]] });
      bindCombos(m, function (inp, v) { if (inp.getAttribute('data-cb').indexOf('|payee') > 0) pay = v; else cat = v; });
    }
  };

  /* ═════════════════ Integration transactions ═════════════════ */
  QB.view('apptransactions', function (params, el) {
    mount(el, function () {
      var apps = [['Shopify', 'Sales, refunds and payouts from your online store'], ['PayPal', 'Payments, fees and transfers'], ['Amazon', 'Orders, fees and settlements'], ['Square', 'In-person sales and deposits'], ['Etsy', 'Orders and listing fees'], ['eBay', 'Orders, fees and payouts']];
      el.innerHTML = UI.pageHead('Integration transactions', { crumb: 'Accounting', actions: UI.btn('Connect an app', { kind: 'primary', act: 'qba:apps.connect|' }) }) +
        '<div class="qb-tabs qba-tabs"><button type="button" class="' + (ST.appsTab !== 'posted' ? 'on' : '') + '" data-act="qba:apps.tab|review">For review (0)</button><button type="button" class="' + (ST.appsTab === 'posted' ? 'on' : '') + '" data-act="qba:apps.tab|posted">Posted</button></div>' +
        '<div class="qba-empty qba-empty-left"><div class="qba-empty-art">' + QB.art('phone') + '</div><div><h2>No integration transactions yet</h2>' +
        '<p>When you connect apps like Shopify, PayPal, Amazon or Square, their sales, refunds, fees and payouts sync here. Review them in one place, then post them to your books.</p>' +
        '<div class="qb-hero-acts">' + UI.btn('Connect an app', { kind: 'primary', act: 'qba:apps.connect|' }) + UI.btn('Learn more', { kind: 'tertiary', act: 'qba:apps.learn' }) + '</div></div></div>' +
        '<h3 class="qba-h3">Popular apps</h3><div class="qba-apps">' + apps.map(function (p) {
          return '<div class="qba-app"><span class="qba-app-av">' + esc(p[0].charAt(0)) + '</span><div><b>' + esc(p[0]) + '</b><span>' + esc(p[1]) + '</span></div>' + UI.btn('Connect', { kind: 'secondary', cls: 'qb-btn-sm', act: 'qba:apps.connect|' + p[0] }) + '</div>';
        }).join('') + '</div>';
    });
  });
  ACT['apps.tab'] = function (a) { ST.appsTab = a[0]; redraw(); };
  ACT['apps.connect'] = function (a) {
    var n = a[0] || 'an app';
    UI.modal('Connect ' + n, '<p>In QuickBooks Online, connecting ' + esc(n) + ' opens the app\'s sign-in page so you can approve access. Once it\'s connected, its transactions show up on this page for review.</p><p class="qba-muted">App connections aren\'t part of this practice copy.</p>', { buttons: [['Got it', 'primary']] });
  };
  ACT['apps.learn'] = function () {
    UI.modal('Integration transactions', '<p>Apps you connect send their activity here instead of straight to your books. You can review each one, change its category, and then post it.</p><p>Posted transactions show on the Posted tab. You can undo them there.</p>', { buttons: [['Got it', 'primary']] });
  };

  /* ═════════════════ Receipts ═════════════════ */
  var FWD = 'craigs-design-landscaping-6832@qbodocs.com';
  function guessVendor(fname) {
    var base = String(fname || '').replace(/\.[^.]+$/, '').replace(/[_\-.+]+/g, ' ').replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim();
    var toks = base.toLowerCase().split(' ').filter(function (w) { return w.length >= 3 && ['receipt', 'scan', 'img', 'image', 'photo', 'invoice', 'bill', 'the', 'and', 'pdf'].indexOf(w) < 0; });
    var best = null, score = 0;
    S.vendors.forEach(function (v) {
      var n = v.name.toLowerCase(), s = 0;
      toks.forEach(function (w) { if (n.indexOf(w) >= 0) s++; });
      if (s > score) { score = s; best = v; }
    });
    if (best) return { id: best.id, name: best.name };
    var nm = toks.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
    return { id: '', name: nm };
  }
  function addReceipts(files) {
    files.forEach(function (file) {
      var g = guessVendor(file.name);
      ST.receipts.list.unshift({ id: U.uid('rcpt'), file: file.name, date: U.today(), vendor: g.id, vendorName: g.name, amount: 0, cat: g.id ? lastCategory(g.id) : '', state: 'review' });
    });
    ST.receipts.tab = 'review';
    UI.toast(files.length + ' receipt' + (files.length === 1 ? '' : 's') + ' uploaded. ' + (files.length === 1 ? 'It\'s' : 'They\'re') + ' ready for review.');
    redraw();
  }
  QB.view('receipts', function (params, el) {
    if (!document.querySelector('.qb-form-ov')) ST.receipts.pending = null;
    mount(el, function () { drawReceipts(el); });
  });
  function drawReceipts(el) {
    var R = ST.receipts, review = R.list.filter(function (r) { return r.state === 'review'; }), done = R.list.filter(function (r) { return r.state === 'reviewed'; });
    var rows = R.tab === 'review' ? review : done;
    var checked = rows.filter(function (r) { return R.checked[r.id]; });
    var h = UI.pageHead('Receipts', { crumb: 'Accounting', actions: UI.btn('Upload from computer', { kind: 'primary', icon: 'upload', act: 'qba:rc.upload' }) });
    h += '<div class="qba-rc-top"><label class="qba-drop" data-rdrop><input type="file" multiple accept="image/*,.pdf,.heic" hidden data-rfile>' + ic('upload', 'qba-drop-ic') +
      '<b>Drag and drop receipts here or <u>select files</u></b><span>Supported formats: PDF, PNG, JPEG, HEIC</span></label>' +
      '<div class="qba-rc-side"><div class="qba-rc-card">' + ic('mail') + '<div><b>Forward receipts to ' + esc(FWD) + '</b><span>Email receipts and bills from any address and they land here for review.</span>' +
      '<div class="qba-rc-links"><button type="button" class="qb-link" data-act="qba:rc.copy">Copy email</button><span class="qba-vsep"></span><button type="button" class="qb-link" data-act="qba:rc.manage">Manage email address</button></div></div></div>' +
      '<div class="qba-rc-card">' + ic('phoneDev') + '<div><b>Snap receipts on the go</b><span>Take a photo with the QuickBooks mobile app. We\'ll pull out the vendor, date and amount.</span>' +
      '<div class="qba-rc-links"><button type="button" class="qb-link" data-act="info:mobile">Get the mobile app</button></div></div></div></div></div>';
    h += '<div class="qb-tabs qba-tabs"><button type="button" class="' + (R.tab === 'review' ? 'on' : '') + '" data-act="qba:rc.tab|review">For review (' + review.length + ')</button><button type="button" class="' + (R.tab === 'reviewed' ? 'on' : '') + '" data-act="qba:rc.tab|reviewed">Reviewed (' + done.length + ')</button></div>';
    if (checked.length) h += '<div class="qba-batch"><b>' + checked.length + ' selected</b>' + UI.btn('Delete', { kind: 'tertiary', cls: 'qb-btn-sm', act: 'qba:rc.delsel' }) + '<button type="button" class="qb-link" data-act="qba:rc.clearsel">Clear selection</button></div>';
    h += '<div class="qb-table-wrap"><table class="qb-table qba-rc-table"><thead><tr><th class="qb-col-chk"><input type="checkbox" data-rchk="all"' + (rows.length && checked.length === rows.length ? ' checked' : '') + '></th><th>Receipt date</th><th>Description</th><th>Payee</th><th class="ta-r">Amount</th><th>' + (R.tab === 'review' ? 'Category' : 'Added as') + '</th><th class="ta-r">Action</th></tr></thead><tbody>';
    if (!rows.length) h += '<tr class="qb-empty-row"><td colspan="7">' + (R.tab === 'review' ? 'No receipts to review. Upload one above, or forward it by email.' : 'Receipts you review show up here.') + '</td></tr>';
    rows.forEach(function (r) {
      var t = r.txn ? S.txn[r.txn] : null;
      h += '<tr><td class="qb-col-chk"><input type="checkbox" data-rchk="' + r.id + '"' + (R.checked[r.id] ? ' checked' : '') + '></td><td>' + U.fmtDate(r.date) + '</td>' +
        '<td><span class="qba-file">' + ic('doc') + esc(r.file) + '</span></td><td>' + esc(r.vendorName || '') + (r.vendor ? '' : r.vendorName ? ' <span class="qba-new-tag">New</span>' : '') + '</td><td class="ta-r">' + U.num(t ? t.total : r.amount) + '</td>' +
        '<td>' + (R.tab === 'review' ? esc(r.cat ? S.fullName(r.cat) : 'Uncategorized Expense') : t ? esc(t.type + (t.no ? ' ' + t.no : '')) : '<span class="qba-muted">Record deleted</span>') + '</td><td class="ta-r">' +
        (R.tab === 'review' ? '<span class="qb-act"><button type="button" class="qb-link" data-act="qba:rc.review|' + r.id + '">Review</button><button type="button" class="qb-act-caret" data-act="qba:rc.menu|' + r.id + '" aria-label="More">' + ic('caretDown') + '</button></span>'
          : (t ? '<button type="button" class="qb-link" data-act="txn:' + t.id + '">View</button>' : '')) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    el.innerHTML = h;
    var dz = el.querySelector('[data-rdrop]');
    dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('is-over'); });
    dz.addEventListener('dragleave', function () { dz.classList.remove('is-over'); });
    dz.addEventListener('drop', function (e) { e.preventDefault(); dz.classList.remove('is-over'); var fs = [].slice.call(e.dataTransfer.files || []); if (fs.length) addReceipts(fs); });
    el.onchange = function (e) {
      var t = e.target;
      if (t.hasAttribute('data-rfile')) { var fs = [].slice.call(t.files || []); if (fs.length) addReceipts(fs); return; }
      if (t.hasAttribute('data-rchk')) { var k = t.getAttribute('data-rchk'); if (k === 'all') rows.forEach(function (r) { R.checked[r.id] = t.checked; }); else R.checked[k] = t.checked; redraw(); }
    };
  }
  ACT['rc.upload'] = function () { pickFiles(true, 'image/*,.pdf,.heic', addReceipts); };
  ACT['rc.tab'] = function (a) { ST.receipts.tab = a[0]; ST.receipts.checked = {}; redraw(); };
  ACT['rc.clearsel'] = function () { ST.receipts.checked = {}; redraw(); };
  ACT['rc.copy'] = function () {
    try { navigator.clipboard.writeText(FWD); } catch (e) { /* clipboard blocked */ }
    UI.toast('Email address copied.');
  };
  ACT['rc.manage'] = function () {
    UI.modal('Manage email address', '<p>Receipts and bills you forward to this address are added for review:</p><p><b>' + esc(FWD) + '</b></p><p class="qba-muted">You can change the first part of the address in QuickBooks Online. It stays the same in this practice copy.</p>', { buttons: [['Done', 'primary']] });
  };
  ACT['rc.menu'] = function (a, el) { UI.menu(el, [['Review', 'qba:rc.review|' + a[0]], ['Delete', 'qba:rc.del|' + a[0]]]); };
  ACT['rc.del'] = function (a) {
    UI.confirm('Delete this receipt?', 'The file is removed from Receipts. You can\'t undo this.', 'Delete', function () {
      ST.receipts.list = ST.receipts.list.filter(function (r) { return r.id !== a[0]; }); redraw();
    });
  };
  ACT['rc.delsel'] = function () {
    var R = ST.receipts, n = Object.keys(R.checked).filter(function (k) { return R.checked[k]; }).length;
    UI.confirm('Delete ' + n + ' receipt' + (n === 1 ? '' : 's') + '?', 'The files are removed from Receipts. You can\'t undo this.', 'Delete', function () {
      R.list = R.list.filter(function (r) { return !R.checked[r.id]; }); R.checked = {}; redraw();
    });
  };
  ACT['rc.review'] = function (a) {
    var r = ST.receipts.list.filter(function (x) { return x.id === a[0]; })[0]; if (!r) return;
    ST.receipts.pending = r.id;
    QB.openForm('Expense', { payee: r.vendor || '', payeeName: r.vendor ? '' : r.vendorName, date: r.date, amount: r.amount, account: 'a_chk', category: r.cat || '', memo: 'Receipt: ' + r.file, attachments: [r.file], receipt: r });
  };
  /* Link a receipt under review to the expense saved from it. */
  S.on(function (why) {
    var pid = ST.receipts.pending; if (why !== 'add' || !pid) return;
    var t = S.txns[S.txns.length - 1];
    if (!t || ['Expense', 'Check', 'Bill', 'Cash Expense', 'Credit Card Expense'].indexOf(t.type) < 0) return;
    ST.receipts.list.forEach(function (r) { if (r.id === pid) { r.state = 'reviewed'; r.txn = t.id; } });
    ST.receipts.pending = null;
  });

  /* ═════════════════ Reconcile ═════════════════ */
  function recAccts() { return S.accountsBy(['Bank', 'Credit Card']); }
  function recState(id) {
    return ST.rec.state[id] || (ST.rec.state[id] = { begin: id === 'a_chk' ? 5000 : 0, done: {}, history: [], lastDate: '' });
  }
  function recLabels(id) {
    return isCC(id)
      ? { inc: 'CHARGES', dec: 'PAYMENTS', incCol: 'CHARGE (USD)', decCol: 'PAYMENT (USD)', incTab: 'Charges', decTab: 'Payments', ccFirst: true, incRep: 'Charges and cash advances cleared', decRep: 'Payments and credits cleared' }
      : { inc: 'DEPOSITS', dec: 'PAYMENTS', incCol: 'DEPOSIT (USD)', decCol: 'PAYMENT (USD)', incTab: 'Deposits', decTab: 'Payments', ccFirst: false, incRep: 'Deposits and other credits cleared', decRep: 'Checks and payments cleared' };
  }
  QB.view('reconcile', function (params, el) {
    var R = ST.rec;
    if (params.acct && params.acct !== R.param) { R.param = params.acct; if (S.acct[params.acct]) { R.acct = params.acct; R.landing = false; } }
    if (!R.acct || !S.acct[R.acct]) R.acct = (recAccts()[0] || {}).id;
    mount(el, function () { if (R.landing) drawRecLanding(el); else drawRecSetup(el); });
  });
  function drawRecLanding(el) {
    el.innerHTML = UI.pageHead('Reconcile', { crumb: 'Accounting' }) +
      '<div class="qba-rec-hero"><div class="qba-rec-hero-copy"><h2>Match the books to the bank records</h2>' +
      '<p>Connected accounts are easier to reconcile. <button type="button" class="qb-link" data-act="qba:rec.connect">Connect now</button></p>' +
      '<p><button type="button" class="qb-link qba-video" data-act="info:videos">' + ic('play') + '<span>Video tutorials (7:48)</span></button></p>' +
      '<ul class="qba-rec-bullets"><li>' + ic('check') + '<span>Keep yourself on track</span></li><li>' + ic('check') + '<span>Find holes in your accounting</span></li><li>' + ic('check') + '<span>Get things tidy for tax time</span></li></ul>' +
      '<div class="qb-hero-acts">' + UI.btn('Get started', { kind: 'primary', act: 'qba:rec.start' }) + '</div></div><div class="qba-rec-hero-art">' + QB.art('box') + '</div></div>';
  }
  ACT['rec.connect'] = function () { QB.go('banking'); setTimeout(function () { ACT['bank.link']([]); }, 50); };
  ACT['rec.start'] = function () {
    var m = UI.modal('Try AI-powered reconciliation?', '<p>You can go back to the current experience after you try this out.</p><p><b>What\'s new:</b></p><ul class="qba-ul">' +
      '<li>Get AI-powered issue detection and explanations from the Accounting Agent</li><li>Collapse and expand your summary table</li><li>See your statement and QuickBooks transactions all in the same view</li></ul>', {
      cls: 'qba-ai-modal',
      buttons: [['No, use the existing experience', 'secondary', function () { ST.rec.landing = false; ST.rec.newExp = false; redraw(); }],
        ['Great, try the new experience', 'primary', function () { ST.rec.landing = false; ST.rec.newExp = true; redraw(); UI.toast('You\'re trying the new reconciliation experience.'); }]]
    });
    var h2 = m.querySelector('.qb-modal-head h2'); if (h2) h2.insertAdjacentHTML('beforeend', ' <span class="qb-beta">BETA</span>');
  };
  function drawRecSetup(el) {
    var R = ST.rec, id = R.acct;
    if (!id) { el.innerHTML = UI.pageHead('Reconcile', { crumb: 'Accounting' }) + '<p>Add a bank or credit card account to reconcile.</p>'; return; }
    var st = recState(id), sess = R.sessions[id], form = R.form[id] || (R.form[id] = { end: '', date: '' });
    var pend = pendingCount(id);
    var h = '<div class="qba-rec-toplinks">' + (R.newExp ? '<span class="qb-beta">BETA</span><button type="button" class="qb-link" data-act="qba:rec.exp|0">Switch to the current experience</button>' : '<button type="button" class="qb-link" data-act="qba:rec.exp|1">Try the new experience</button>') +
      '<span class="qba-vsep"></span><button type="button" class="qb-link" data-act="qba:rec.learn">Learn more</button></div>';
    h += '<div class="qb-crumb qba-rec-crumb"><a href="#/chartofaccounts">Chart of accounts</a><span>/</span><a href="#/register?id=' + id + '">Register</a></div>';
    h += '<div class="qb-ph-row qba-rec-title"><h1>Reconcile</h1><span class="qb-grow"></span>' + UI.btn('Summary', { kind: 'tertiary', act: 'qba:rec.summary' }) + UI.btn('History by account', { kind: 'tertiary', act: 'qba:rec.history' }) + '</div>';
    if (pend && R.banner) {
      h += '<div class="qba-warnbar"><span class="qba-warnbar-ic">!</span><div><b>Categorize transactions before you reconcile</b><div>You have some bank transactions that need to be sorted before you reconcile. <button type="button" class="qb-link" data-act="qba:rec.cat">Categorize now</button></div></div><button type="button" class="qb-x" data-act="qba:rec.banner" aria-label="Close">' + ic('close') + '</button></div>';
    }
    h += '<div class="qba-rec-setup"><h3>Which account do you want to reconcile?</h3>' +
      UI.field('Account', UI.select('racct', recAccts().map(function (x) { return [x.id, x.name]; }), id, ' data-racct'), 'qba-rec-acct');
    if (st.lastDate) h += '<p class="qba-muted qba-rec-last">Last statement ending date ' + U.fmtDate(st.lastDate) + '</p>';
    if (sess) {
      h += '<div class="qba-resume">' + ic('info') + '<div><b>You\'re partway through reconciling ' + esc(S.acct[id].name) + '.</b><div>Statement ending date ' + U.fmtDate(sess.date) + ' · Statement ending balance ' + U.money(sess.end) + '</div></div>' +
        UI.btn('Resume reconciling', { kind: 'primary', act: 'qba:rec.resume' }) + '</div>';
    }
    h += '<h3>Add the following information<span class="qba-req">*</span></h3><div class="qba-rec-fields">' +
      '<div class="qb-field"><span class="qb-label">Beginning balance</span><div class="qba-rec-begin">' + U.num(st.begin) + '</div></div>' +
      UI.field('Statement ending balance*', '<input class="qb-input' + (R.err === 'end' ? ' is-err' : '') + '" data-rend placeholder="0.00" inputmode="decimal" value="' + esc(form.end) + '">') +
      UI.field('Statement ending date*', UI.dateInput('rdate', '', ' data-rdate')) + '</div>';
    if (R.errMsg) h += '<p class="qba-err-msg">' + ic('alert') + esc(R.errMsg) + '</p>';
    h += '<div class="qba-rec-go">' + UI.btn(sess ? 'Start over' : 'Start reconciling', { kind: sess ? 'secondary' : 'primary', act: 'qba:rec.go' }) + '</div></div>';
    el.innerHTML = h;
    var di = el.querySelector('[data-rdate]');
    if (di) { di.value = form.date; if (R.err === 'date') di.classList.add('is-err'); }
    el.onchange = function (e) {
      if (e.target.hasAttribute('data-racct')) { R.acct = e.target.value; R.err = ''; R.errMsg = ''; R.banner = true; redraw(); }
    };
    el.oninput = function (e) {
      var t = e.target;
      if (t.hasAttribute('data-rend')) form.end = t.value;
      if (t.hasAttribute('data-rdate')) form.date = t.value;
    };
  }
  ACT['rec.exp'] = function (a) { ST.rec.newExp = a[0] === '1'; UI.toast(ST.rec.newExp ? 'You\'re trying the new reconciliation experience.' : 'You\'re back on the current experience.'); redraw(); };
  ACT['rec.learn'] = function () {
    UI.modal('Reconcile an account', '<p>Reconciling makes sure your QuickBooks records match your bank and credit card statements.</p><ol class="qba-ul"><li>Pick the account and enter the ending balance and date from your statement.</li><li>Select each transaction that appears on the statement.</li><li>When the difference is 0.00, select Finish now.</li></ol>', { buttons: [['Got it', 'primary']] });
  };
  ACT['rec.cat'] = function () { QB.go('banking', { acct: ST.rec.acct }); };
  ACT['rec.banner'] = function () { ST.rec.banner = false; redraw(); };
  ACT['rec.resume'] = function () { var id = ST.rec.acct, s = ST.rec.sessions[id]; if (s) QB.go('reconcileAccount', { id: id, end: s.end, date: s.date }); };
  ACT['rec.go'] = function () {
    var R = ST.rec, id = R.acct, form = R.form[id] || {}, st = recState(id);
    var endTxt = String(form.end || '').trim(), date = U.parseDate(String(form.date || '').trim());
    R.err = ''; R.errMsg = '';
    if (!endTxt || isNaN(parseFloat(endTxt.replace(/[$,\s]/g, '')))) { R.err = 'end'; R.errMsg = 'Enter the ending balance from your statement.'; return redraw(); }
    if (!date) { R.err = 'date'; R.errMsg = 'Enter the statement ending date (mm/dd/yyyy).'; return redraw(); }
    if (st.lastDate && date <= st.lastDate) { R.err = 'date'; R.errMsg = 'The statement ending date needs to be after your last reconciliation (' + U.fmtDate(st.lastDate) + ').'; return redraw(); }
    var go = function () {
      R.sessions[id] = newSession(U.parseMoney(endTxt), date);
      QB.go('reconcileAccount', { id: id, end: U.r2(U.parseMoney(endTxt)), date: date });
    };
    if (R.sessions[id]) return UI.confirm('Start over?', 'You\'ll lose the work you saved for this account.', 'Start over', go);
    go();
  };
  ACT['rec.summary'] = function () {
    var rows = recAccts().map(function (a) {
      var st = recState(a.id), last = st.history[0];
      return '<tr><td>' + esc(a.name) + '</td><td>' + (last ? U.fmtDate(last.date) : '<span class="qba-muted">Never reconciled</span>') + '</td><td class="ta-r">' + U.num(st.begin) + '</td><td class="ta-r">' + U.num(L.balance(a.id)) + '</td><td>' + (ST.rec.sessions[a.id] ? 'In progress' : '') + '</td></tr>';
    }).join('');
    UI.modal('Reconciliation summary', '<table class="qb-table is-case"><thead><tr><th>Account</th><th>Last reconciled</th><th class="ta-r">Reconciled balance</th><th class="ta-r">QuickBooks balance</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>', { wide: true, buttons: [['Close', 'primary']] });
  };
  ACT['rec.history'] = function () {
    var id = ST.rec.acct, st = recState(id);
    var m = UI.modal('History by account', UI.field('Account', UI.select('hacct', recAccts().map(function (x) { return [x.id, x.name]; }), id, ' data-hacct')) + '<div data-hlist></div>', { wide: true, buttons: [['Close', 'primary']] });
    function paint(aid) {
      var s = recState(aid);
      m.querySelector('[data-hlist]').innerHTML = '<table class="qb-table is-case qba-mt"><thead><tr><th>Statement ending date</th><th>Reconciled on</th><th class="ta-r">Ending balance</th><th class="ta-r">Changes</th><th class="ta-r">Auto adjustment</th><th class="ta-r">Action</th></tr></thead><tbody>' +
        (s.history.length ? s.history.map(function (r, i) {
          return '<tr><td>' + U.fmtDate(r.date) + '</td><td>' + U.fmtDate(r.on) + '</td><td class="ta-r">' + U.num(r.end) + '</td><td class="ta-r">' + U.num(r.end - r.begin) + '</td><td class="ta-r">' + (r.adj ? U.num(r.adj) : '0.00') + '</td><td class="ta-r"><button type="button" class="qb-link" data-hrep="' + aid + '|' + i + '">View report</button></td></tr>';
        }).join('') : '<tr class="qb-empty-row"><td colspan="6">You haven\'t reconciled this account yet.</td></tr>') + '</tbody></table>';
    }
    paint(id);
    m.addEventListener('change', function (e) { if (e.target.hasAttribute('data-hacct')) paint(e.target.value); });
    m.addEventListener('click', function (e) { var b = e.target.closest('[data-hrep]'); if (!b) return; var p = b.getAttribute('data-hrep').split('|'); reportModal(recState(p[0]).history[+p[1]]); });
    return st;
  };

  /* Workspace. */
  function newSession(end, date) { return { end: U.r2(end), date: date, ticked: {}, at: {}, tab: 'all', stmt: true, clr: 'all', dir: 'asc', hideMemo: false, hideClr: false }; }
  function recCalc(id, sess) {
    var st = recState(id), list = acctEntries(id).filter(function (e) { return !e.t.hidden && !st.done[e.key]; });
    var inc = 0, dec = 0, ni = 0, nd = 0;
    list.forEach(function (e) { if (!sess.ticked[e.key]) return; if (e.inc >= 0) { inc += e.inc; ni++; } else { dec -= e.inc; nd++; } });
    inc = U.r2(inc); dec = U.r2(dec);
    var cleared = U.r2(st.begin + inc - dec);
    return { st: st, list: list, inc: inc, dec: dec, ni: ni, nd: nd, cleared: cleared, diff: U.r2(sess.end - cleared) };
  }
  function recRows(id, sess, c) {
    return c.list.filter(function (e) {
      if (sess.stmt && e.t.date > sess.date) return false;
      if (sess.tab === 'inc' && e.inc < 0) return false;
      if (sess.tab === 'dec' && e.inc >= 0) return false;
      if (sess.clr === 'cleared' && !sess.ticked[e.key]) return false;
      if (sess.clr === 'uncleared' && sess.ticked[e.key]) return false;
      return true;
    }).sort(function (a, b) { var d = a.t.date < b.t.date ? -1 : a.t.date > b.t.date ? 1 : 0; return sess.dir === 'asc' ? d : -d; });
  }
  QB.view('reconcileAccount', function (params, el) {
    var id = params.id;
    if (!S.acct[id]) { el.innerHTML = '<div class="qb-empty-page"><h1>Reconcile</h1><p>Pick an account to reconcile first.</p>' + UI.btn('Go to Reconcile', { kind: 'primary', act: 'go:reconcile' }) + '</div>'; return; }
    if (!ST.rec.sessions[id]) ST.rec.sessions[id] = newSession(U.parseMoney(params.end), U.parseDate(params.date) || U.today());
    ST.rec.acct = id; ST.rec.landing = false;
    mount(el, function () { drawRecWork(el, id); });
  });
  function eqCell(amt, label, cls) { return '<div class="qba-eq-cell ' + (cls || '') + '"><b>' + U.money(amt) + '</b><small>' + label + '</small></div>'; }
  function drawRecWork(el, id) {
    var sess = ST.rec.sessions[id], a = S.acct[id], c = recCalc(id, sess), lb = recLabels(id), rows = recRows(id, sess, c);
    var ok = Math.abs(c.diff) < 0.005;
    var h = '<div class="qb-crumb"><a href="#/chartofaccounts">Chart of accounts</a> / <a href="#/register?id=' + id + '">Register</a> / <a href="#/reconcile">Reconcile</a></div>';
    h += '<div class="qba-rw-head"><div><h1>' + esc(a.name) + '</h1><div class="qba-muted">Statement ending date: ' + U.fmtDate(sess.date, 'long') + '</div></div><span class="qb-grow"></span>' +
      '<button type="button" class="qb-link" data-act="qba:rec.tour">Show me around</button>' + UI.btn('Edit info', { kind: 'tertiary', act: 'qba:rec.edit|' + id }) +
      UI.split('Save for later', [['Finish now', 'qba:rec.finish|' + id], ['Save for later', 'qba:rec.save|' + id], ['Close without saving', 'qba:rec.close|' + id]], { act: 'qba:rec.save|' + id }) + '</div>';
    var sub = lb.ccFirst
      ? eqCell(c.st.begin, 'BEGINNING BALANCE', 'sm') + '<span class="qba-eq-op">+</span>' + eqCell(c.inc, c.ni + ' ' + lb.inc, 'sm') + '<span class="qba-eq-op">-</span>' + eqCell(c.dec, c.nd + ' ' + lb.dec, 'sm')
      : eqCell(c.st.begin, 'BEGINNING BALANCE', 'sm') + '<span class="qba-eq-op">-</span>' + eqCell(c.dec, c.nd + ' ' + lb.dec, 'sm') + '<span class="qba-eq-op">+</span>' + eqCell(c.inc, c.ni + ' ' + lb.inc, 'sm');
    h += '<div class="qba-eq"><div class="qba-eq-l"><div class="qba-eq-top">' + eqCell(sess.end, 'STATEMENT ENDING BALANCE') + '<span class="qba-eq-op">-</span>' + eqCell(c.cleared, 'CLEARED BALANCE') + '</div>' +
      '<div class="qba-eq-sub">' + sub + '</div></div>' +
      '<div class="qba-eq-r"><span class="qba-diff-ic ' + (ok ? 'ok' : 'warn') + '">' + (ok ? ic('check') : '!') + '</span>' + eqCell(c.diff, 'DIFFERENCE', 'diff') + '</div></div>';
    var tabs = lb.ccFirst ? [['inc', lb.incTab], ['dec', lb.decTab], ['all', 'All']] : [['dec', lb.decTab], ['inc', lb.incTab], ['all', 'All']];
    h += '<div class="qb-tabs qba-tabs">' + tabs.map(function (t) { return '<button type="button" class="' + (sess.tab === t[0] ? 'on' : '') + '" data-act="qba:rec.tab|' + id + '|' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="qba-tools">' + iconBtn('filter', 'rec.filter|' + id, 'Filter') +
      (sess.stmt ? UI.chip('Statement ending date', 'qba:rec.stmt|' + id + '|0') : '') +
      (sess.clr !== 'all' ? UI.chip(sess.clr === 'cleared' ? 'Cleared' : 'Uncleared', 'qba:rec.clr|' + id + '|all') : '') +
      '<button type="button" class="qb-link" data-act="qba:rec.viewall|' + id + '">Clear filter / View all</button><span class="qb-grow"></span>' +
      iconBtn('print', 'rec.print', 'Print') + iconBtn('gear', 'rec.gear|' + id, 'Settings') + '</div>';
    var allOn = rows.length && rows.every(function (e) { return sess.ticked[e.key]; });
    var c1 = lb.ccFirst ? lb.incCol : lb.decCol, c2 = lb.ccFirst ? lb.decCol : lb.incCol;
    h += '<div class="qb-table-wrap"><table class="qb-table qba-rw-table"><thead><tr><th class="is-sort" data-act="qba:rec.sort|' + id + '"><span>DATE</span>' + ic(sess.dir === 'asc' ? 'caretUp' : 'caretDown', 'qb-sort-ic') + '</th>' +
      (sess.hideClr ? '' : '<th>CLEARED DATE</th>') + '<th>TYPE</th><th>REF NO.</th><th>ACCOUNT</th><th>PAYEE</th>' + (sess.hideMemo ? '' : '<th>MEMO</th>') +
      '<th class="ta-r">' + c1 + '</th><th class="ta-r">' + c2 + '</th><th class="ta-c qba-w40"><button type="button" class="qba-circ' + (allOn ? ' on' : '') + '" data-act="qba:rec.all|' + id + '" aria-label="Select all">' + ic('check') + '</button></th></tr></thead><tbody>';
    var ncol = 10 - (sess.hideClr ? 1 : 0) - (sess.hideMemo ? 1 : 0);
    if (!rows.length) h += '<tr class="qb-empty-row"><td colspan="' + ncol + '">No transactions match. ' + (sess.stmt ? 'Transactions after the statement ending date are hidden.' : '') + '</td></tr>';
    rows.forEach(function (e) {
      var t = e.t, on = !!sess.ticked[e.key], amt = Math.abs(e.inc);
      var v1 = lb.ccFirst ? (e.inc >= 0 ? U.num(amt) : '') : (e.inc < 0 ? U.num(amt) : '');
      var v2 = lb.ccFirst ? (e.inc < 0 ? U.num(amt) : '') : (e.inc >= 0 ? U.num(amt) : '');
      h += '<tr class="is-click' + (on ? ' is-tick' : '') + '" data-act="qba:rec.tick|' + id + '|' + e.key + '"><td>' + U.fmtDate(t.date) + '</td>' + (sess.hideClr ? '' : '<td>' + (on && sess.at[e.key] ? U.fmtDate(sess.at[e.key]) : '') + '</td>') +
        '<td>' + esc(t.type === 'Payment' ? 'Receive Payment' : t.type) + '</td><td>' + esc(t.no || '') + '</td><td class="qba-ellip">' + esc(otherSide(t, id)) + '</td><td>' + esc(S.payeeName(t)) + '</td>' +
        (sess.hideMemo ? '' : '<td class="qba-ellip">' + esc(t.memo || e.p.desc || '') + '</td>') + '<td class="ta-r">' + v1 + '</td><td class="ta-r">' + v2 + '</td>' +
        '<td class="ta-c"><span class="qba-circ' + (on ? ' on' : '') + '">' + ic('check') + '</span></td></tr>';
    });
    h += '</tbody></table></div>';
    el.innerHTML = h;
  }
  function sessOf(a) { return ST.rec.sessions[a[0]]; }
  ACT['rec.tab'] = function (a) { var s = sessOf(a); if (s) { s.tab = a[1]; redraw(); } };
  ACT['rec.stmt'] = function (a) { var s = sessOf(a); if (s) { s.stmt = a[1] === '1'; redraw(); } };
  ACT['rec.clr'] = function (a) { var s = sessOf(a); if (s) { s.clr = a[1]; redraw(); } };
  ACT['rec.viewall'] = function (a) { var s = sessOf(a); if (s) { s.stmt = false; s.clr = 'all'; s.tab = 'all'; redraw(); } };
  ACT['rec.sort'] = function (a) { var s = sessOf(a); if (s) { s.dir = s.dir === 'asc' ? 'desc' : 'asc'; redraw(); } };
  ACT['rec.print'] = function () { window.print(); };
  ACT['rec.filter'] = function (a, el) {
    var s = sessOf(a), id = a[0]; if (!s) return;
    UI.menu(el, [{ head: 'Cleared status' }, [tick(s.clr === 'all', 'All'), 'qba:rec.clr|' + id + '|all'], [tick(s.clr === 'cleared', 'Cleared'), 'qba:rec.clr|' + id + '|cleared'], [tick(s.clr === 'uncleared', 'Uncleared'), 'qba:rec.clr|' + id + '|uncleared'],
      { sep: true }, [tick(s.stmt, 'Up to the statement ending date'), 'qba:rec.stmt|' + id + '|' + (s.stmt ? '0' : '1')]], { alignLeft: true });
  };
  ACT['rec.gear'] = function (a, el) {
    var s = sessOf(a), id = a[0]; if (!s) return;
    UI.menu(el, [{ head: 'Columns' }, [tick(!s.hideClr, 'Cleared date'), 'qba:rec.col|' + id + '|hideClr'], [tick(!s.hideMemo, 'Memo'), 'qba:rec.col|' + id + '|hideMemo']]);
  };
  ACT['rec.col'] = function (a) { var s = sessOf(a); if (s) { s[a[1]] = !s[a[1]]; redraw(); } };
  ACT['rec.tick'] = function (a) {
    var s = sessOf(a); if (!s) return;
    var key = a.slice(1).join('|');
    s.ticked[key] = !s.ticked[key];
    if (s.ticked[key]) s.at[key] = U.today(); else delete s.at[key];
    redraw();
  };
  ACT['rec.all'] = function (a) {
    var id = a[0], s = sessOf(a); if (!s) return;
    var rows = recRows(id, s, recCalc(id, s)), all = rows.length && rows.every(function (e) { return s.ticked[e.key]; });
    rows.forEach(function (e) { if (all) { delete s.ticked[e.key]; delete s.at[e.key]; } else { s.ticked[e.key] = true; s.at[e.key] = s.at[e.key] || U.today(); } });
    redraw();
  };
  ACT['rec.edit'] = function (a) {
    var id = a[0], s = sessOf(a); if (!s) return;
    var st = recState(id);
    UI.modal('Edit the info from your statement', '<div class="qba-det-grid qba-one">' +
      '<div class="qb-field"><span class="qb-label">Beginning balance</span><div class="qba-rec-begin">' + U.num(st.begin) + '</div></div>' +
      UI.field('Ending balance*', '<input class="qb-input" data-e-end value="' + esc(U.num(s.end).replace(/,/g, '')) + '">') +
      UI.field('Ending date*', UI.dateInput('edate', s.date, ' data-e-date')) + '</div>', {
      buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (m) {
        var end = m.querySelector('[data-e-end]').value, d = U.parseDate(m.querySelector('[data-e-date]').value.trim());
        if (!String(end).trim()) { UI.toast('Enter the ending balance.', 'err'); return false; }
        if (!d) { UI.toast('Enter the ending date (mm/dd/yyyy).', 'err'); return false; }
        if (st.lastDate && d <= st.lastDate) { UI.toast('The ending date needs to be after ' + U.fmtDate(st.lastDate) + '.', 'err'); return false; }
        s.end = U.r2(U.parseMoney(end)); s.date = d; redraw();
      }]]
    });
  };
  ACT['rec.save'] = function (a) { ST.rec.acct = a[0]; ST.rec.landing = false; UI.toast('Your reconciliation was saved. Pick up where you left off any time.'); QB.go('reconcile'); };
  ACT['rec.close'] = function (a) {
    UI.confirm('Close without saving?', 'You\'ll lose the changes you made to this reconciliation.', 'Close without saving', function () {
      delete ST.rec.sessions[a[0]]; ST.rec.acct = a[0]; ST.rec.landing = false; QB.go('reconcile');
    });
  };
  ACT['rec.finish'] = function (a) {
    var id = a[0], s = sessOf(a); if (!s) return;
    var c = recCalc(id, s);
    if (Math.abs(c.diff) > 0.004) {
      return UI.modal('Hold on! Your difference isn\'t 0.00', '<div class="qba-hold"><span class="qba-diff-ic warn">!</span><div><p>Your difference is <b>' + U.money(c.diff) + '</b>. The cleared balance should match your statement ending balance before you finish.</p>' +
        '<p>Check that every transaction on your statement is selected, and that the ending balance and date are right. If you still can\'t find the problem, we can add an adjustment for the difference. It will be recorded to Reconciliation Discrepancies.</p></div></div>', {
        buttons: [['Back to reconciling', 'secondary'], ['Add adjustment and finish', 'primary', function () { addAdjustment(id, c.diff); }]]
      });
    }
    completeRec(id, 0);
  };
  function ensureDiscAcct() {
    var a = S.accounts.filter(function (x) { return x.name === 'Reconciliation Discrepancies'; })[0];
    if (a) { a.active = true; return a.id; }
    a = { id: 'a_recdisc', name: 'Reconciliation Discrepancies', parent: null, type: 'Expenses', detail: 'Other Miscellaneous Service Cost', target: null, bankBalance: null, active: true, desc: '' };
    S.accounts.push(a); S.acct[a.id] = a;
    return a.id;
  }
  function addAdjustment(id, diff) {
    var s = ST.rec.sessions[id], disc = ensureDiscAcct(), amt = U.r2(S.isDebit(id) ? diff : -diff);
    var je = { type: 'Journal Entry', no: '', date: s.date, memo: 'Reconciliation adjustment', total: Math.abs(amt), lines: [
      { acct: id, debit: amt > 0 ? amt : 0, credit: amt < 0 ? -amt : 0, desc: 'Reconciliation adjustment' },
      { acct: disc, debit: amt < 0 ? -amt : 0, credit: amt > 0 ? amt : 0, desc: 'Reconciliation adjustment' }] };
    S.add(je, true); S.log('Added', je);
    L.postings(je).forEach(function (p, i) { if (p.acct === id) { s.ticked[je.id + ':' + i] = true; s.at[je.id + ':' + i] = U.today(); } });
    completeRec(id, diff);
  }
  function completeRec(id, adj) {
    var s = ST.rec.sessions[id], c = recCalc(id, s), st = c.st;
    var picked = c.list.filter(function (e) { return s.ticked[e.key]; });
    var item = function (e) { return { txn: e.t.id, date: e.t.date, type: e.t.type === 'Payment' ? 'Receive Payment' : e.t.type, no: e.t.no || '', payee: S.payeeName(e.t), amt: e.inc }; };
    picked.forEach(function (e) { st.done[e.key] = true; ST.cleared[e.t.id] = 'R'; });
    var rep = {
      acct: id, date: s.date, on: U.today(), begin: st.begin, end: s.end, inc: c.inc, dec: c.dec, ni: c.ni, nd: c.nd, adj: adj || 0,
      items: picked.map(item), uncleared: c.list.filter(function (e) { return !s.ticked[e.key] && e.t.date <= s.date; }).map(item),
      register: L.balance(id, { to: s.date, children: false })
    };
    st.history.unshift(rep); st.begin = s.end; st.lastDate = s.date;
    delete ST.rec.sessions[id]; ST.rec.form[id] = { end: '', date: '' };
    ST.rec.acct = id; ST.rec.landing = false; ST.rec.err = ''; ST.rec.errMsg = '';
    QB.go('reconcile');
    var lb = recLabels(id);
    UI.modal('Success! You reconciled ' + S.acct[id].name, '<div class="qba-success"><span class="qba-diff-ic ok big">' + ic('check') + '</span><p>Your books match your statement through ' + U.fmtDate(rep.date, 'long') + '.</p>' + summaryTable(rep, lb) + '</div>', {
      buttons: [['View report', 'secondary', function () { setTimeout(function () { reportModal(rep); }, 0); }], ['Done', 'primary']]
    });
  }
  function summaryTable(rep, lb) {
    lb = lb || recLabels(rep.acct);
    var r = function (l, v, b) { return '<tr' + (b ? ' class="qba-tot"' : '') + '><td>' + l + '</td><td class="ta-r">' + U.num(v) + '</td></tr>'; };
    return '<table class="qba-sumtable"><tbody>' + r('Statement beginning balance', rep.begin) +
      (lb.ccFirst ? r(lb.incRep + ' (' + rep.ni + ')', rep.inc) + r(lb.decRep + ' (' + rep.nd + ')', -rep.dec) : r(lb.decRep + ' (' + rep.nd + ')', -rep.dec) + r(lb.incRep + ' (' + rep.ni + ')', rep.inc)) +
      (rep.adj ? r('Reconciliation adjustment', rep.adj) : '') + r('Statement ending balance', rep.end, true) + r('Uncleared transactions as of ' + U.fmtDate(rep.date) + ' (' + rep.uncleared.length + ')', U.r2(rep.register - rep.end)) +
      r('Register balance as of ' + U.fmtDate(rep.date), rep.register, true) + '</tbody></table>';
  }
  function reportModal(rep) {
    if (!rep) return;
    var lb = recLabels(rep.acct), a = S.acct[rep.acct];
    function list(title, items) {
      var tot = U.r2(items.reduce(function (s, i) { return s + i.amt; }, 0));
      return '<h4>' + title + ' (' + items.length + ')</h4><table class="qb-table is-case qba-reptable"><thead><tr><th>Date</th><th>Type</th><th>Ref no.</th><th>Payee</th><th class="ta-r">Amount (USD)</th></tr></thead><tbody>' +
        (items.length ? items.map(function (i) { return '<tr><td>' + U.fmtDate(i.date) + '</td><td>' + esc(i.type) + '</td><td>' + esc(i.no) + '</td><td>' + esc(i.payee) + '</td><td class="ta-r">' + U.num(i.amt) + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="qba-muted">None</td></tr>') +
        '</tbody><tfoot><tr><td colspan="4">Total</td><td class="ta-r">' + U.num(tot) + '</td></tr></tfoot></table>';
    }
    var inc = rep.items.filter(function (i) { return i.amt >= 0; }), dec = rep.items.filter(function (i) { return i.amt < 0; });
    UI.modal('Reconciliation report', '<div class="qba-report"><div class="qba-rep-head"><b>' + esc(S.company.name) + '</b><div>' + esc(a ? a.name : '') + ', Period Ending ' + U.fmtDate(rep.date) + '</div>' +
      '<div class="qba-muted">Reconciliation report · Reconciled on: ' + U.fmtDate(rep.on) + ' · Reconciled by: Craig Carlson</div>' +
      '<div class="qba-muted qba-small">Any changes made to transactions after this date aren\'t included in this report.</div></div>' +
      '<h4>Summary</h4>' + summaryTable(rep, lb) + '<h3 class="qba-h3">Details</h3>' +
      (lb.ccFirst ? list(lb.incRep, inc) + list(lb.decRep, dec) : list(lb.decRep, dec) + list(lb.incRep, inc)) +
      (rep.uncleared.length ? list('Uncleared transactions as of ' + U.fmtDate(rep.date), rep.uncleared) : '') + '</div>', {
      wide: true, buttons: [['Print', 'secondary', function () { window.print(); return false; }], ['Close', 'primary']]
    });
  }
  ACT['rec.tour'] = function () {
    var steps = [
      ['Check your numbers', 'Your statement ending balance and the cleared balance sit at the top. When they match, the difference turns into a green check.'],
      ['Tick what\'s on your statement', 'Go through your statement line by line. Select the circle next to each transaction that appears on it. Use the Payments and Deposits tabs to work through one side at a time.'],
      ['Finish up', 'When the difference is 0.00, open the Save for later menu and select Finish now. You can also save your work and come back later.']
    ], i = 0;
    var m = UI.modal('Show me around', '', { buttons: [['Back', 'secondary', function () { if (i > 0) { i--; paint(); } return false; }], ['Next', 'primary', function () { if (i < steps.length - 1) { i++; paint(); return false; } }]] });
    function paint() {
      m.querySelector('.qb-modal-body').innerHTML = '<div class="qba-tour"><span class="qba-tour-n">' + (i + 1) + ' of ' + steps.length + '</span><h3>' + esc(steps[i][0]) + '</h3><p>' + esc(steps[i][1]) + '</p></div>';
      var bs = m.querySelectorAll('[data-mb]');
      bs[0].disabled = i === 0;
      bs[1].textContent = i === steps.length - 1 ? 'Done' : 'Next';
    }
    paint();
  };

  /* ═════════════════ Rules ═════════════════ */
  QB.view('olbrules', function (params, el) { mount(el, function () { drawRules(el); }); });
  function drawRules(el) {
    var R = ST.rules, q = R.q.trim().toLowerCase();
    var all = rulesSorted();
    var rows = all.filter(function (r) {
      if (R.status !== 'all' && r.status !== R.status) return false;
      return !q || (r.name + ' ' + r.conditions + ' ' + r.settings + ' ' + r.accounts).toLowerCase().indexOf(q) >= 0;
    });
    var checked = rows.filter(function (r) { return R.checked[r.id]; });
    var h = UI.pageHead('Rules', { crumb: 'Accounting', actions: UI.split('New rule', [['Import rules', 'qba:rules.import'], ['Export rules', 'qba:rules.export']], { act: 'qba:rules.new' }) });
    h += '<p class="qba-lead">Rules save you time by automatically categorizing your bank transactions. Drag rules to change their priority.</p>';
    h += '<div class="qba-tools"><div class="qb-search-box qba-search"><input class="qb-input" data-rq placeholder="Search by name or conditions" value="' + esc(R.q) + '">' + ic('search') + '</div>' +
      UI.select('rstatus', [['all', 'All statuses'], ['Active', 'Active'], ['Inactive', 'Inactive']], R.status, ' data-rstatus') + '<span class="qb-grow"></span>' + iconBtn('print', 'rules.print', 'Print') + '</div>';
    if (checked.length) h += '<div class="qba-batch"><b>' + checked.length + ' selected</b>' + UI.btn('Disable', { kind: 'tertiary', cls: 'qb-btn-sm', act: 'qba:rules.batch|Inactive' }) + UI.btn('Enable', { kind: 'tertiary', cls: 'qb-btn-sm', act: 'qba:rules.batch|Active' }) + UI.btn('Delete', { kind: 'tertiary', cls: 'qb-btn-sm', act: 'qba:rules.batch|delete' }) + '<button type="button" class="qb-link" data-act="qba:rules.clearsel">Clear selection</button></div>';
    h += '<div class="qb-table-wrap"><table class="qb-table qba-rules-table"><thead><tr><th class="qb-col-chk"><input type="checkbox" data-rchk="all"' + (rows.length && checked.length === rows.length ? ' checked' : '') + '></th><th class="qba-w30"></th><th>Priority</th><th>Rule name</th><th>Applied to</th><th>Conditions</th><th>Settings</th><th class="ta-c">Auto-add</th><th>Status</th><th class="ta-r">Action</th></tr></thead><tbody>';
    if (!rows.length) h += '<tr class="qb-empty-row"><td colspan="10">' + (all.length ? 'No rules match your search.' : 'You don\'t have any rules yet. Select New rule to create one.') + '</td></tr>';
    rows.forEach(function (r) {
      h += '<tr draggable="true" data-rid="' + r.id + '" class="' + (r.status !== 'Active' ? 'is-off' : '') + '"><td class="qb-col-chk"><input type="checkbox" data-rchk="' + r.id + '"' + (R.checked[r.id] ? ' checked' : '') + '></td>' +
        '<td class="qba-drag" title="Drag to change priority">' + ic('drag') + '</td><td>' + (r.priority || '') + '</td><td><b>' + esc(r.name) + '</b></td>' +
        '<td>' + esc(r.applied) + '<div class="qba-sub">' + esc(r.accounts) + '</div></td><td class="qba-wrap">' + esc(r.conditions) + '</td><td class="qba-wrap">' + esc(r.settings) + '</td>' +
        '<td class="ta-c">' + (r.auto ? '<span class="qba-auto">' + ic('check') + '</span>' : '') + '</td><td><span class="qba-status ' + (r.status === 'Active' ? 'on' : '') + '">' + esc(r.status) + '</span></td>' +
        '<td class="ta-r"><span class="qb-act"><button type="button" class="qb-link" data-act="qba:rules.edit|' + r.id + '">Edit</button><button type="button" class="qb-act-caret" data-act="qba:rules.menu|' + r.id + '" aria-label="More actions">' + ic('caretDown') + '</button></span></td></tr>';
    });
    h += '</tbody></table></div>';
    el.innerHTML = h;
    el.oninput = function (e) { if (e.target.hasAttribute('data-rq')) { R.q = e.target.value; redraw(); refocus(el, '[data-rq]'); } };
    el.onchange = function (e) {
      var t = e.target;
      if (t.hasAttribute('data-rstatus')) { R.status = t.value; return redraw(); }
      if (t.hasAttribute('data-rchk')) { var k = t.getAttribute('data-rchk'); if (k === 'all') rows.forEach(function (r) { R.checked[r.id] = t.checked; }); else R.checked[k] = t.checked; redraw(); }
    };
    var drag = null;
    el.ondragstart = function (e) { var tr = e.target.closest && e.target.closest('tr[data-rid]'); if (!tr) return; drag = tr.getAttribute('data-rid'); tr.classList.add('is-drag'); try { e.dataTransfer.setData('text/plain', drag); e.dataTransfer.effectAllowed = 'move'; } catch (x) { /* old browsers */ } };
    el.ondragover = function (e) { var tr = e.target.closest && e.target.closest('tr[data-rid]'); if (!tr || !drag) return; e.preventDefault(); [].slice.call(el.querySelectorAll('tr.is-over')).forEach(function (x) { x.classList.remove('is-over'); }); tr.classList.add('is-over'); };
    el.ondragend = function () { drag = null; [].slice.call(el.querySelectorAll('tr.is-over,tr.is-drag')).forEach(function (x) { x.classList.remove('is-over'); x.classList.remove('is-drag'); }); };
    el.ondrop = function (e) {
      var tr = e.target.closest && e.target.closest('tr[data-rid]'); if (!tr || !drag) return;
      e.preventDefault();
      var target = tr.getAttribute('data-rid'); if (target === drag) return;
      var order = rulesSorted(), src = order.filter(function (r) { return r.id === drag; })[0];
      order.splice(order.indexOf(src), 1);
      var ti = order.map(function (r) { return r.id; }).indexOf(target);
      order.splice(ti, 0, src);
      order.forEach(function (r, i) { r.priority = i + 1; });
      drag = null;
      changed('rules');
      UI.toast('Rule priority updated.');
    };
  }
  function ruleById(id) { return S.rules.filter(function (r) { return ruleNorm(r).id === id; })[0]; }
  ACT['rules.new'] = function () { openRule(null, null); };
  ACT['rules.edit'] = function (a) { var r = ruleById(a[0]); if (r) openRule(r, null); };
  ACT['rules.clearsel'] = function () { ST.rules.checked = {}; redraw(); };
  ACT['rules.print'] = function () { window.print(); };
  ACT['rules.menu'] = function (a, el) {
    var r = ruleById(a[0]); if (!r) return;
    UI.menu(el, [['Copy', 'qba:rules.copy|' + r.id], ['Delete', 'qba:rules.del|' + r.id], [r.status === 'Active' ? 'Disable' : 'Enable', 'qba:rules.toggle|' + r.id]]);
  };
  ACT['rules.copy'] = function (a) {
    var r = ruleById(a[0]); if (!r) return;
    var c = JSON.parse(JSON.stringify(r));
    c.id = U.uid('rule'); c.name = 'Copy of ' + r.name; c.priority = S.rules.length + 1; c._n = true;
    S.rules.push(c); changed('rules');
    UI.toast('Rule copied.');
    openRule(c, null);
  };
  ACT['rules.del'] = function (a) {
    var r = ruleById(a[0]); if (!r) return;
    UI.confirm('Delete rule?', 'Are you sure you want to delete "' + r.name + '"? Transactions it already categorized won\'t change.', 'Delete', function () {
      S.rules.splice(S.rules.indexOf(r), 1); rulesSorted().forEach(function (x, i) { x.priority = i + 1; }); changed('rules'); UI.toast('Rule deleted.');
    });
  };
  ACT['rules.toggle'] = function (a) { var r = ruleById(a[0]); if (!r) return; r.status = r.status === 'Active' ? 'Inactive' : 'Active'; changed('rules'); UI.toast('Rule ' + (r.status === 'Active' ? 'enabled' : 'disabled') + '.'); };
  ACT['rules.batch'] = function (a) {
    var R = ST.rules, sel = S.rules.filter(function (r) { return R.checked[ruleNorm(r).id]; });
    if (!sel.length) return;
    if (a[0] === 'delete') {
      return UI.confirm('Delete ' + sel.length + ' rule' + (sel.length === 1 ? '' : 's') + '?', 'Transactions they already categorized won\'t change.', 'Delete', function () {
        S.rules = S.rules.filter(function (r) { return sel.indexOf(r) < 0; }); rulesSorted().forEach(function (x, i) { x.priority = i + 1; }); R.checked = {}; changed('rules');
      });
    }
    sel.forEach(function (r) { r.status = a[0]; }); R.checked = {}; changed('rules');
  };
  ACT['rules.import'] = function () {
    var m = UI.modal('Import rules', '<p>Import rules from another QuickBooks Online company. Upload the Excel file you exported from that company.</p><label class="qba-drop qba-drop-sm"><input type="file" accept=".xls,.xlsx,.csv" hidden data-imp>' + ic('upload') + '<b>Drag and drop or select files</b><span>Excel or CSV</span></label><div class="qba-ufile" data-impname></div>', {
      buttons: [['Cancel', 'secondary'], ['Next', 'primary', function (mm) {
        var n = mm.querySelector('[data-impname]').textContent;
        if (!n) { UI.toast('Select a file to import.', 'err'); return false; }
        UI.toast(n + ' was uploaded. It doesn\'t have any new rules for this company.');
      }]]
    });
    m.querySelector('[data-imp]').addEventListener('change', function (e) { var f = e.target.files[0]; if (f) m.querySelector('[data-impname]').textContent = f.name; });
  };
  ACT['rules.export'] = function () {
    var rows = [['Priority', 'Rule name', 'Applied to', 'Accounts', 'Conditions', 'Settings', 'Auto-add', 'Status']];
    rulesSorted().forEach(function (r) { rows.push([r.priority, r.name, r.applied, r.accounts, r.conditions, r.settings, r.auto ? 'Yes' : 'No', r.status]); });
    downloadCsv('Rules.csv', rows);
  };
  var TEXT_OPS = ['contains', "doesn't contain", 'is exactly'], AMT_OPS = ['equals', 'is greater than', 'is less than'];
  function openRule(rule, pre) {
    var r = rule ? ruleNorm(rule) : null;
    var m = {
      name: r ? r.name : (pre && pre.name) || '',
      dir: r ? r.dir : (pre && pre.dir) || 'out',
      acct: r ? (r.acctIds === 'all' || !r.acctIds || !r.acctIds.length ? 'all' : r.acctIds.length > 1 ? 'keep' : r.acctIds[0]) : (pre && pre.acct) || 'all',
      match: r ? r.match : 'all',
      conds: r ? r.conds.map(function (c) { return { field: c.field, op: c.op, value: c.value }; }) : (pre && pre.conds) || [{ field: 'Description', op: 'contains', value: '' }],
      type: r ? r.assign.type : (pre && pre.dir === 'in' ? 'Deposit' : 'Expense'),
      payee: r ? r.assign.payee || '' : (pre && pre.payee) || '',
      category: r ? r.assign.category || '' : (pre && pre.category) || '',
      transfer: r ? r.assign.transfer || '' : '',
      memo: r ? r.assign.memo || '' : '',
      auto: r ? !!r.auto : false
    };
    var keepIds = r && r.acctIds !== 'all' && r.acctIds && r.acctIds.length > 1 ? r.acctIds.slice() : null;
    var d = UI.drawer(rule ? 'Edit rule' : 'Create rule', '', { wide: true, saveLabel: 'Save', onSave: save });
    var body = d.querySelector('.qb-drawer-body');
    function temp() {
      return { status: 'Active', dir: m.dir, acctIds: m.acct === 'all' ? 'all' : m.acct === 'keep' ? keepIds : [m.acct], match: m.match, conds: m.conds.filter(function (c) { return String(c.value).trim(); }) };
    }
    function paint() {
      var accOpts = [['all', 'All bank accounts']];
      if (keepIds) accOpts.push(['keep', keepIds.map(function (id) { return S.acct[id] ? S.acct[id].name : ''; }).join(', ')]);
      accOpts = accOpts.concat(S.accountsBy(['Bank', 'Credit Card']).map(function (a) { return [a.id, a.name]; }));
      var types = m.dir === 'in' ? ['Deposit', 'Transfer'] : ['Expense', 'Check', 'Transfer'];
      if (types.indexOf(m.type) < 0) m.type = types[0];
      var h = '<div class="qba-rd">' + UI.field('Rule name*', '<input class="qb-input" data-rm="name" value="' + esc(m.name) + '" placeholder="Give your rule a name">') +
        '<div class="qba-rd-sec"><h3>Apply this to transactions that are</h3><div class="qba-rd-row">' + UI.select('rdir', [['out', 'Money out'], ['in', 'Money in']], m.dir, ' data-rm="dir"') + '<span>in</span>' + UI.select('racc', accOpts, m.acct, ' data-rm="acct"') + '</div></div>' +
        '<div class="qba-rd-sec"><h3>and include the following:</h3><div class="qba-rd-row">' + UI.select('rmatch', [['all', 'All'], ['any', 'Any']], m.match, ' data-rm="match"') + '<span>of these conditions</span></div><div class="qba-rd-conds">' +
        m.conds.map(function (c, i) {
          var ops = c.field === 'Amount' ? AMT_OPS : TEXT_OPS;
          if (ops.indexOf(c.op) < 0) c.op = ops[0];
          return '<div class="qba-rd-cond">' + UI.select('cf' + i, ['Description', 'Bank text', 'Amount'], c.field, ' data-rc="' + i + '|field"') + UI.select('co' + i, ops, c.op, ' data-rc="' + i + '|op"') +
            '<input class="qb-input" data-rc="' + i + '|value" value="' + esc(c.value) + '" placeholder="' + (c.field === 'Amount' ? '0.00' : 'Enter text') + '">' +
            '<button type="button" class="qb-icon-btn" data-rd="del|' + i + '" aria-label="Remove condition"' + (m.conds.length < 2 ? ' disabled' : '') + '>' + ic('trash') + '</button></div>';
        }).join('') + '</div><div class="qba-rd-row"><button type="button" class="qb-link" data-rd="add">' + ic('plus') + 'Add a condition</button><span class="qb-grow"></span>' +
        '<button type="button" class="qb-btn qb-btn-tertiary qb-btn-sm" data-rd="test">Test rule</button><span class="qba-rd-test" data-rtest></span></div></div>' +
        '<div class="qba-rd-sec"><h3>Then</h3><div class="qba-rd-row"><span class="qba-rd-lbl">Assign</span>' + UI.select('rtype', types.map(function (t) { return [t, 'Transaction type: ' + t]; }), m.type, ' data-rm="type"') + '</div>';
      if (m.type === 'Transfer') {
        h += UI.field('Transfer account', UI.select('rxfer', [['', 'Select account']].concat(S.accountsBy(['Bank', 'Credit Card', 'Other Current Assets', 'Other Current Liabilities', 'Long Term Liabilities', 'Equity']).map(function (a) { return [a.id, S.fullName(a.id)]; })), m.transfer, ' data-rm="transfer"'));
      } else {
        h += '<div class="qba-det-grid">' + UI.field('Payee', cbx('rpay', m.dir === 'in' ? 'pin' : 'pout', 'rule|payee', payeeLabel(m.payee), 'Select payee')) +
          UI.field('Category', cbx('rcat', 'cat', 'rule|category', S.fullName(m.category), 'Select category')) + '</div>';
      }
      h += UI.field('Memo', '<input class="qb-input" data-rm="memo" value="' + esc(m.memo) + '" placeholder="Add to memo">') + '</div>' +
        '<div class="qba-rd-sec qba-rd-auto"><label class="qb-toggle"><input type="checkbox" data-rm="auto"' + (m.auto ? ' checked' : '') + '><i></i></label><div><b>Automatically confirm transactions this rule applies to</b><p>Transactions that match go straight to the Posted tab when you select Update. You can undo them there.</p></div></div></div>';
      body.innerHTML = h;
      bindCombos(body, function (inp, v) { m[inp.getAttribute('data-cb').split('|')[2]] = v; });
    }
    function sync(t) {
      var k = t.getAttribute('data-rm');
      if (k) {
        if (k === 'auto') m.auto = t.checked; else m[k] = t.value;
        if (k === 'dir') { m.payee = ''; m.type = m.dir === 'in' ? 'Deposit' : 'Expense'; }
        return k === 'dir' || k === 'type';
      }
      var c = t.getAttribute('data-rc');
      if (c) { var p = c.split('|'); m.conds[+p[0]][p[1]] = t.value; return p[1] === 'field'; }
      if (t.hasAttribute('data-cb')) {
        var cp = t.getAttribute('data-cb').split('|'), txt = t.value.trim();
        if (txt === (t.getAttribute('data-label') || '')) return false;
        var id = txt ? lookupFor(cp[0], txt) : '';
        if (id !== null) m[cp[2]] = id;
      }
      return false;
    }
    body.addEventListener('input', function (e) { sync(e.target); });
    body.addEventListener('change', function (e) { if (sync(e.target)) paint(); });
    body.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rd]'); if (!b) return;
      var p = b.getAttribute('data-rd').split('|');
      if (p[0] === 'add') { m.conds.push({ field: 'Description', op: 'contains', value: '' }); paint(); }
      else if (p[0] === 'del') { m.conds.splice(+p[1], 1); paint(); }
      else if (p[0] === 'test') {
        var tr = temp(), n = 0;
        if (!tr.conds.length) { body.querySelector('[data-rtest]').textContent = 'Add a condition first.'; return; }
        eachFeed(function (f) { if (f.state === 'pending' && ruleMatches(tr, f)) n++; });
        body.querySelector('[data-rtest]').textContent = n + ' pending transaction' + (n === 1 ? '' : 's') + ' match' + (n === 1 ? 'es' : '') + ' this rule.';
      }
    });
    function save() {
      if (!String(m.name).trim()) { UI.toast('Give your rule a name.', 'err'); return false; }
      var tr = temp();
      if (!tr.conds.length) { UI.toast('Add at least one condition.', 'err'); return false; }
      if (m.type === 'Transfer' && !m.transfer) { UI.toast('Choose the transfer account.', 'err'); return false; }
      if (m.type !== 'Transfer' && !m.category && !m.payee) { UI.toast('Assign a payee or a category.', 'err'); return false; }
      var target = r || { id: U.uid('rule'), priority: S.rules.length + 1, status: 'Active', _n: true };
      target.name = String(m.name).trim(); target.dir = m.dir; target.acctIds = tr.acctIds; target.match = m.match; target.conds = tr.conds;
      target.assign = { type: m.type, payee: m.type === 'Transfer' ? '' : m.payee, category: m.type === 'Transfer' ? '' : m.category, transfer: m.type === 'Transfer' ? m.transfer : '', memo: m.memo };
      target.auto = m.auto;
      ruleTexts(target);
      if (!r) S.rules.push(target);
      changed('rules');
      UI.toast('Your rule was saved.');
    }
    paint();
    return d;
  }

  /* ═════════════════ Chart of accounts ═════════════════ */
  var COA_PAGE = 75;
  var SYS = { a_ar: 1, a_ap: 1, a_undep: 1, a_re: 1, a_obe: 1, a_uncA: 1, a_uncE: 1, a_uncI: 1, a_inv: 1 };
  QB.view('chartofaccounts', function (params, el) { mount(el, function () { drawCoa(el); }); });
  function coaRows() {
    var C = ST.coa, q = C.q.trim().toLowerCase(), order = QB.ACCOUNT_TYPES;
    var list = S.ordered().filter(function (a) {
      if (!C.inactive && a.active === false) return false;
      if (q && S.fullName(a.id).toLowerCase().indexOf(q) < 0 && String(a.number || '').toLowerCase().indexOf(q) < 0) return false;
      if (C.type === 'bs') return S.isBS(a);
      if (C.type === 'pl') return !S.isBS(a);
      if (C.type !== 'all') return a.type === C.type;
      return true;
    });
    var idx = list.map(function (a, i) { return { a: a, i: i }; });
    if (C.sort === 'name') idx.sort(function (x, y) { return S.fullName(x.a.id).toLowerCase().localeCompare(S.fullName(y.a.id).toLowerCase()) * (C.dir === 'asc' ? 1 : -1); });
    else if (C.sort === 'detail') idx.sort(function (x, y) { return String(x.a.detail || '').localeCompare(String(y.a.detail || '')) * (C.dir === 'asc' ? 1 : -1) || x.i - y.i; });
    else if (C.dir === 'desc') idx.sort(function (x, y) { return order.indexOf(y.a.type) - order.indexOf(x.a.type) || x.i - y.i; });
    return idx.map(function (o) { return o.a; });
  }
  function coaBal(a) {
    if (!S.isBS(a) || a.detail === 'Retained Earnings') return '';
    return U.num(a.parent ? L.balance(a.id, { children: false }) : L.balance(a.id));
  }
  function coaTh(key, label, cls) {
    var C = ST.coa, on = C.sort === key;
    return '<th class="is-sort ' + (cls || '') + '" data-act="qba:coa.sort|' + key + '"><span>' + label + '</span>' + (on ? ic(C.dir === 'asc' ? 'caretUp' : 'caretDown', 'qb-sort-ic') : '') + '</th>';
  }
  function drawCoa(el) {
    var C = ST.coa, rows = coaRows(), total = rows.length, pages = Math.max(1, Math.ceil(total / COA_PAGE));
    if (C.page >= pages) C.page = pages - 1; if (C.page < 0) C.page = 0;
    var shown = rows.slice(C.page * COA_PAGE, (C.page + 1) * COA_PAGE);
    var from = total ? C.page * COA_PAGE + 1 : 0, to = Math.min(total, (C.page + 1) * COA_PAGE);
    var nChecked = Object.keys(C.checked).filter(function (k) { return C.checked[k]; }).length;
    var typeOpts = [['all', 'All'], ['bs', 'Balance sheet'], ['pl', 'Profit and loss']].concat(QB.ACCOUNT_TYPES.map(function (t) { return [t, t]; }));
    var pager = '<span class="qba-pg"><button type="button" class="qb-link" data-act="qba:coa.page|-1"' + (C.page ? '' : ' disabled') + '>Previous</button><span>' + from + ' - ' + to + '</span><button type="button" class="qb-link" data-act="qba:coa.page|1"' + (C.page < pages - 1 ? '' : ' disabled') + '>Next</button></span>';
    var h = UI.pageHead('Chart of accounts', {
      crumb: 'Accounting',
      actions: '<button type="button" class="qb-btn qb-btn-secondary" data-act="qba:coa.cleanup"><span>Clean up</span>' + ic('caretDown') + '</button>' +
        UI.btn('Run report', { kind: 'secondary', act: 'qba:coa.runreport' }) + UI.split('New account', [['Import', 'go:importdata']], { act: 'qba:coa.new' })
    });
    h += '<div class="qba-tools"><div class="qb-search-box qba-search"><input class="qb-input" data-cq placeholder="Filter by name or number" value="' + esc(C.q) + '">' + ic('search') + '</div>' +
      UI.select('ctype', typeOpts, C.type, ' data-ctype aria-label="Account type"') + (nChecked ? '<span class="qba-muted">' + nChecked + ' selected</span><button type="button" class="qb-link" data-act="qba:coa.clearsel">Clear</button>' : '') +
      '<span class="qb-grow"></span>' + pager + iconBtn('export', 'coa.export', 'Export') + iconBtn('print', 'coa.print', 'Print') + iconBtn('gear', 'coa.gear', 'Settings') + '</div>';
    var allOn = shown.length && shown.every(function (a) { return C.checked[a.id]; });
    h += '<div class="qb-table-wrap"><table class="qb-table qba-coa-table"><thead><tr><th class="qb-col-chk"><input type="checkbox" data-cchk="all"' + (allOn ? ' checked' : '') + ' aria-label="Select all"></th>' +
      coaTh('name', 'Name') + coaTh('type', 'Account type') + (C.hide.detail ? '' : coaTh('detail', 'Detail type')) + '<th class="ta-r">QuickBooks balance</th>' + (C.hide.bank ? '' : '<th class="ta-r">Bank balance</th>') + '<th class="ta-r">Action</th></tr></thead><tbody>';
    if (!shown.length) h += '<tr class="qb-empty-row"><td colspan="7">No accounts match your filter.</td></tr>';
    shown.forEach(function (a) {
      var dep = S.depth(a.id), bs = S.isBS(a), icn = a.type === 'Bank' ? ic('bank', 'qba-type-ic') : a.type === 'Credit Card' ? ic('card', 'qba-type-ic') : '';
      h += '<tr class="' + (a.active === false ? 'is-inactive' : '') + '"><td class="qb-col-chk"><input type="checkbox" data-cchk="' + a.id + '"' + (C.checked[a.id] ? ' checked' : '') + '></td>' +
        '<td class="qba-coa-name"><span style="padding-left:' + (dep * 18) + 'px">' + (dep ? '<span class="qba-sub-arrow">↳</span>' : '') + esc(a.name) + (a.active === false ? ' <span class="qba-muted">(deleted)</span>' : '') + '</span>' + (a.desc ? '<div class="qba-sub" style="padding-left:' + (dep * 18) + 'px">' + esc(a.desc) + '</div>' : '') + '</td>' +
        '<td><span class="qba-type">' + icn + '<span>' + esc(a.type) + '</span><span class="qba-tag ' + (bs ? 'qba-tag-bal' : 'qba-tag-pl') + '">' + (bs ? 'BAL' : 'P&amp;L') + '</span></span></td>' +
        (C.hide.detail ? '' : '<td>' + esc(a.detail || '') + '</td>') + '<td class="ta-r">' + coaBal(a) + '</td>' + (C.hide.bank ? '' : '<td class="ta-r">' + (a.bankBalance != null ? U.num(a.bankBalance) : '') + '</td>') +
        '<td class="ta-r">' + coaAction(a) + '</td></tr>';
    });
    h += '</tbody></table></div><div class="qba-pager-b">' + pager + '</div>';
    el.innerHTML = h;
    el.oninput = function (e) { if (e.target.hasAttribute('data-cq')) { C.q = e.target.value; C.page = 0; redraw(); refocus(el, '[data-cq]'); } };
    el.onchange = function (e) {
      var t = e.target;
      if (t.hasAttribute('data-ctype')) { C.type = t.value; C.page = 0; return redraw(); }
      if (t.hasAttribute('data-cchk')) { var k = t.getAttribute('data-cchk'); if (k === 'all') shown.forEach(function (a) { C.checked[a.id] = t.checked; }); else C.checked[k] = t.checked; redraw(); }
    };
  }
  function coaAction(a) {
    if (a.active === false) return '<button type="button" class="qb-link" data-act="qba:coa.activate|' + a.id + '">Make active</button>';
    var bs = S.isBS(a);
    return '<span class="qb-act">' + (bs ? '<button type="button" class="qb-link" data-act="qba:coa.reg|' + a.id + '">View register</button>' : '<button type="button" class="qb-link" data-act="qba:coa.report|' + a.id + '">Run report</button>') +
      '<button type="button" class="qb-act-caret" data-act="qba:coa.menu|' + a.id + '" aria-label="More actions">' + ic('caretDown') + '</button></span>';
  }
  function setActive(id, on) {
    var a = S.acct[id]; if (!a) return;
    a.active = on;
    if (!on) S.accounts.forEach(function (c) { if (c.parent === id) setActive(c.id, false); });
    else if (a.parent && S.acct[a.parent] && S.acct[a.parent].active === false) setActive(a.parent, true);
  }
  function inactiveBlock(a) {
    if (!S.isBS(a)) return '';
    var bal = L.balance(a.id);
    return Math.abs(bal) > 0.004 ? bal : '';
  }
  ACT['coa.sort'] = function (a) { var C = ST.coa; if (C.sort === a[0]) C.dir = C.dir === 'asc' ? 'desc' : 'asc'; else { C.sort = a[0]; C.dir = 'asc'; } redraw(); };
  ACT['coa.page'] = function (a) { ST.coa.page += +a[0]; redraw(); };
  ACT['coa.clearsel'] = function () { ST.coa.checked = {}; redraw(); };
  ACT['coa.new'] = function () { QB.openForm('Account', {}); };
  ACT['coa.runreport'] = function () { QB.go('report', { name: 'Account List' }); };
  ACT['coa.reg'] = function (a) { QB.go('register', { id: a[0] }); };
  ACT['coa.report'] = function (a) { QB.go('report', { name: 'Account QuickReport', acct: a[0] }); };
  ACT['coa.edit'] = function (a) { var acc = S.acct[a[0]]; if (acc) QB.openForm('Account', { account: acc }); };
  ACT['coa.reconcile'] = function (a) { QB.go('reconcile', { acct: a[0] }); };
  ACT['coa.print'] = function () { window.print(); };
  ACT['coa.menu'] = function (a, el) {
    var acc = S.acct[a[0]]; if (!acc) return;
    var bs = S.isBS(acc), items = [['Edit', 'qba:coa.edit|' + acc.id], ['Make inactive (reduces usage)', 'qba:coa.inactive|' + acc.id]];
    if (bs) items.push(['Run report', 'qba:coa.report|' + acc.id]);
    if (acc.type === 'Bank' || acc.type === 'Credit Card') items.push(['Reconcile', 'qba:coa.reconcile|' + acc.id]);
    UI.menu(el, items);
  };
  ACT['coa.inactive'] = function (a) {
    var acc = S.acct[a[0]]; if (!acc) return;
    var bal = inactiveBlock(acc);
    if (bal !== '') {
      return UI.modal('You can\'t make this account inactive', '<p><b>' + esc(S.fullName(acc.id)) + '</b> has a balance of ' + U.money(bal) + '.</p><p>Move the balance to another account with a transfer or a journal entry first. Then you can make it inactive.</p>', { buttons: [['OK', 'primary']] });
    }
    if (SYS[acc.id]) return UI.modal('This account can\'t be made inactive', '<p>QuickBooks uses <b>' + esc(acc.name) + '</b> behind the scenes, so it has to stay active.</p>', { buttons: [['OK', 'primary']] });
    var kids = S.children(acc.id);
    UI.confirm('Make account inactive?', 'Are you sure you want to make ' + S.fullName(acc.id) + ' inactive?' + (kids.length ? ' Its sub-accounts will be made inactive too.' : '') + ' You can make it active again any time.', 'Yes, make inactive', function () {
      setActive(acc.id, false); changed('account'); UI.toast(acc.name + ' is now inactive.');
    });
  };
  ACT['coa.activate'] = function (a) { var acc = S.acct[a[0]]; if (!acc) return; setActive(acc.id, true); changed('account'); UI.toast(acc.name + ' is active again.'); };
  ACT['coa.cleanup'] = function (a, el) { UI.menu(el, [['Merge accounts', 'qba:coa.merge'], ['Make inactive', 'qba:coa.bulkinactive'], ['Reclassify transactions', 'go:reclassify']], { alignLeft: true }); };
  ACT['coa.bulkinactive'] = function () {
    var C = ST.coa, ids = Object.keys(C.checked).filter(function (k) { return C.checked[k] && S.acct[k] && S.acct[k].active !== false; });
    if (!ids.length) return UI.toast('Select the accounts you want to make inactive first.', 'err');
    var blocked = ids.filter(function (id) { return inactiveBlock(S.acct[id]) !== '' || SYS[id]; }), ok = ids.filter(function (id) { return blocked.indexOf(id) < 0; });
    var body = (ok.length ? '<p>These accounts will be made inactive:</p><ul class="qba-ul">' + ok.map(function (id) { return '<li>' + esc(S.fullName(id)) + '</li>'; }).join('') + '</ul>' : '') +
      (blocked.length ? '<p>These have a balance or are used by QuickBooks, so they\'ll stay active:</p><ul class="qba-ul">' + blocked.map(function (id) { var b = inactiveBlock(S.acct[id]); return '<li>' + esc(S.fullName(id)) + (b !== '' ? ' (' + U.money(b) + ')' : '') + '</li>'; }).join('') + '</ul>' : '');
    UI.modal('Make accounts inactive', body, { buttons: ok.length ? [['Cancel', 'secondary'], ['Make inactive', 'primary', function () { ok.forEach(function (id) { setActive(id, false); }); C.checked = {}; changed('account'); UI.toast(ok.length + ' account' + (ok.length === 1 ? ' is' : 's are') + ' now inactive.'); }]] : [['OK', 'primary']] });
  };
  function isUnder(id, anc) { var a = S.acct[id]; while (a && a.parent) { if (a.parent === anc) return true; a = S.acct[a.parent]; } return false; }
  ACT['coa.merge'] = function () {
    var all = S.ordered().filter(function (a) { return a.active !== false; });
    var fromOpts = [['', 'Select account']].concat(all.filter(function (a) { return !SYS[a.id] && !S.bankFeed[a.id]; }).map(function (a) { return [a.id, S.fullName(a.id) + ' (' + a.type + ')']; }));
    var toOpts = [['', 'Select account']].concat(all.map(function (a) { return [a.id, S.fullName(a.id) + ' (' + a.type + ')']; }));
    UI.modal('Merge accounts', '<p>Move every transaction from one account into another. The first account goes away after the merge. Both accounts need the same account type.</p><div class="qba-det-grid qba-one">' +
      UI.field('Merge this account', UI.select('mfrom', fromOpts, '')) + UI.field('Into this account', UI.select('mto', toOpts, '')) + '</div><p class="qba-muted">You can\'t undo a merge.</p>', {
      buttons: [['Cancel', 'secondary'], ['Merge', 'primary', function (m) {
        var from = m.querySelector('[name=mfrom]').value, to = m.querySelector('[name=mto]').value;
        if (!from || !to) { UI.toast('Choose both accounts.', 'err'); return false; }
        if (from === to) { UI.toast('Choose two different accounts.', 'err'); return false; }
        if (S.acct[from].type !== S.acct[to].type) { UI.toast('Both accounts need the same account type.', 'err'); return false; }
        if (isUnder(to, from)) { UI.toast('You can\'t merge an account into one of its own sub-accounts.', 'err'); return false; }
        S.txns.forEach(function (t) {
          if (t.account === from) t.account = to; if (t.toAccount === from) t.toAccount = to;
          (t.lines || []).forEach(function (l) { if (l.acct === from) l.acct = to; });
        });
        S.items.forEach(function (it) { if (it.incomeAcct === from) it.incomeAcct = to; if (it.expenseAcct === from) it.expenseAcct = to; });
        S.accounts.forEach(function (c) { if (c.parent === from) c.parent = to; });
        S.rules.forEach(function (r) { ruleNorm(r); if (r.assign.category === from) { r.assign.category = to; ruleTexts(r); } if (r.assign.transfer === from) { r.assign.transfer = to; ruleTexts(r); } });
        eachFeed(function (f) { if (f.category === from) f.category = to; if (f.transfer === from) f.transfer = to; });
        var name = S.fullName(from), into = S.fullName(to);
        S.accounts.splice(S.accounts.indexOf(S.acct[from]), 1); delete S.acct[from];
        delete ST.coa.checked[from];
        changed('account');
        UI.toast(name + ' was merged into ' + into + '.');
      }]]
    });
  };
  ACT['coa.export'] = function () {
    var rows = [['Name', 'Full name', 'Account type', 'Detail type', 'QuickBooks balance', 'Bank balance']];
    coaRows().forEach(function (a) { rows.push([a.name, S.fullName(a.id), a.type, a.detail || '', coaBal(a), a.bankBalance != null ? U.num(a.bankBalance) : '']); });
    downloadCsv('Chart of accounts.csv', rows);
  };
  ACT['coa.gear'] = function (a, el) {
    var C = ST.coa;
    UI.menu(el, [{ head: 'Columns' }, [tick(!C.hide.detail, 'Detail type'), 'qba:coa.col|detail'], [tick(!C.hide.bank, 'Bank balance'), 'qba:coa.col|bank'], { sep: true }, { head: 'Other' }, [tick(C.inactive, 'Include inactive'), 'qba:coa.col|inactive']]);
  };
  ACT['coa.col'] = function (a) { var C = ST.coa; if (a[0] === 'inactive') C.inactive = !C.inactive; else C.hide[a[0]] = !C.hide[a[0]]; redraw(); };

  /* ═════════════════ Register ═════════════════ */
  function regCols(a) {
    if (a.type === 'Bank') return { c1: 'PAYMENT', c2: 'DEPOSIT', c1inc: false };
    if (a.type === 'Credit Card') return { c1: 'CHARGE', c2: 'PAYMENT', c1inc: true };
    if (a.type === 'Accounts receivable (A/R)') return { c1: 'CHARGE', c2: 'PAYMENT', c1inc: true };
    if (a.type === 'Accounts payable (A/P)') return { c1: 'BILLED', c2: 'PAID', c1inc: true };
    return { c1: 'DECREASE', c2: 'INCREASE', c1inc: false };
  }
  function regKind(a) {
    return { 'Bank': 'Bank Register', 'Credit Card': 'Credit Card Register', 'Accounts receivable (A/R)': 'Accounts Receivable Register', 'Accounts payable (A/P)': 'Accounts Payable Register' }[a.type] || a.type + ' Register';
  }
  function regAddTypes(a) {
    if (a.type === 'Bank') return ['Check', 'Deposit', 'Sales Receipt', 'Receive Payment', 'Bill Payment', 'Refund', 'Expense', 'Transfer', 'Journal Entry'];
    if (a.type === 'Credit Card') return ['Expense', 'Credit Card Credit', 'Bill Payment', 'Transfer', 'Journal Entry'];
    if (a.type === 'Accounts receivable (A/R)') return ['Invoice', 'Receive Payment', 'Credit Memo', 'Journal Entry'];
    if (a.type === 'Accounts payable (A/P)') return ['Bill', 'Bill Payment', 'Vendor Credit', 'Journal Entry'];
    return ['Journal Entry', 'Transfer'];
  }
  QB.view('register', function (params, el) {
    var id = params.id || params.acct;
    if (!S.acct[id]) id = 'a_chk';
    if (ST.reg.id !== id) ST.reg = { id: id, q: '', range: 'all', status: 'all', type: 'all', dir: 'asc' };
    mount(el, function () { drawReg(el, id); });
  });
  function drawReg(el, id) {
    var G = ST.reg, a = S.acct[id], cols = regCols(a), all = acctEntries(id), open = 0, hasHidden = false, openDate = '';
    all.forEach(function (e) { if (e.t.hidden) { open = U.r2(open + e.inc); hasHidden = true; if (!openDate || e.t.date < openDate) openDate = e.t.date; } });
    var bal = open, vis = all.filter(function (e) { return !e.t.hidden; });
    vis.forEach(function (e) { bal = U.r2(bal + e.inc); e.bal = bal; });
    var q = G.q.trim().toLowerCase();
    var types = uniq(vis.map(function (e) { return e.t.type; })).sort();
    var rows = vis.filter(function (e) {
      if (!inRange(e.t.date, G.range)) return false;
      if (G.type !== 'all' && e.t.type !== G.type) return false;
      var c = ST.cleared[e.t.id] || '';
      if (G.status === 'cleared' && c !== 'C') return false;
      if (G.status === 'reconciled' && c !== 'R') return false;
      if (G.status === 'none' && c) return false;
      if (q && ([e.t.no, e.t.type, S.payeeName(e.t), otherSide(e.t, id), e.t.memo, e.p.desc, U.num(Math.abs(e.inc))].join(' ').toLowerCase().indexOf(q) < 0)) return false;
      return true;
    });
    var filtered = q || G.range !== 'all' || G.type !== 'all' || G.status !== 'all';
    if (G.dir === 'desc') rows = rows.slice().reverse();
    var addT = regAddTypes(a);
    var h = '<div class="qb-crumb"><a href="#/chartofaccounts">' + ic('caretLeft', 'qba-crumb-ic') + 'Back to Chart of accounts</a></div>';
    h += '<div class="qba-reg-head"><div><div class="qba-reg-kind">' + esc(regKind(a)) + '</div><button type="button" class="qba-acct-dd" data-act="qba:reg.acctMenu">' + (a.type === 'Bank' ? ic('bank') : a.type === 'Credit Card' ? ic('card') : '') + '<span>' + esc(S.fullName(id)) + '</span>' + ic('caretDown') + '</button></div><span class="qb-grow"></span>' +
      ((a.type === 'Bank' || a.type === 'Credit Card') ? UI.btn('Reconcile', { kind: 'tertiary', act: 'qba:coa.reconcile|' + id }) : '') +
      '<div class="qba-reg-end"><small>ENDING BALANCE</small><b>' + U.money(bal) + '</b></div></div>';
    h += '<div class="qba-tools"><span class="qba-sm">' + UI.split('Add ' + addT[0].toLowerCase(), addT.map(function (t) { return [t, 'qba:reg.add|' + t]; }), { act: 'qba:reg.add|' + addT[0], kind: 'secondary' }) + '</span>' +
      '<div class="qb-search-box qba-search"><input class="qb-input" data-gq placeholder="Find by memo, ref no., payee or amount" value="' + esc(G.q) + '">' + ic('search') + '</div>' +
      UI.select('grange', U.RANGES, G.range, ' data-gf="range" aria-label="Date"') +
      UI.select('gstatus', [['all', 'All statuses'], ['cleared', 'Cleared'], ['reconciled', 'Reconciled'], ['none', 'No status']], G.status, ' data-gf="status" aria-label="Reconcile status"') +
      UI.select('gtype', [['all', 'All transaction types']].concat(types.map(function (t) { return [t, t]; })), G.type, ' data-gf="type" aria-label="Transaction type"') +
      (filtered ? '<button type="button" class="qb-link" data-act="qba:reg.reset">Reset</button>' : '') + '<span class="qb-grow"></span>' +
      iconBtn('print', 'reg.print', 'Print') + iconBtn('export', 'reg.export|' + id, 'Export') + '</div>';
    h += '<div class="qb-table-wrap"><table class="qb-table qba-reg-table"><thead><tr><th class="is-sort" data-act="qba:reg.sort"><span>DATE</span>' + ic(G.dir === 'asc' ? 'caretUp' : 'caretDown', 'qb-sort-ic') + '</th>' +
      '<th>REF NO.<div class="qba-th2">TYPE</div></th><th>PAYEE<div class="qba-th2">ACCOUNT</div></th><th>MEMO</th><th class="ta-r">' + cols.c1 + '</th><th class="ta-r">' + cols.c2 + '</th><th class="ta-c qba-w40">✓</th><th class="ta-r">BALANCE</th></tr></thead><tbody>';
    h += '<tr class="qba-reg-add"><td colspan="8"><button type="button" class="qb-link" data-act="qba:reg.add|' + addT[0] + '">' + ic('plus') + 'Add ' + esc(addT[0].toLowerCase()) + '</button></td></tr>';
    function amtCells(inc) {
      var v = U.num(Math.abs(inc)), first = cols.c1inc ? inc > 0 : inc < 0;
      return '<td class="ta-r">' + (first ? v : '') + '</td><td class="ta-r">' + (first ? '' : v) + '</td>';
    }
    var openRow = hasHidden && !filtered ? '<tr class="qba-reg-open"><td>' + U.fmtDate(openDate) + '</td><td><div class="qba-sub">Journal Entry</div></td><td><div>Opening balance</div></td><td></td>' + amtCells(open) + '<td class="ta-c"><span class="qba-clr r">R</span></td><td class="ta-r">' + U.num(open) + '</td></tr>' : '';
    if (G.dir === 'asc') h += openRow;
    if (!rows.length && !openRow) h += '<tr class="qb-empty-row"><td colspan="8">No transactions match your filters.</td></tr>';
    rows.forEach(function (e) {
      var t = e.t, c = ST.cleared[t.id] || '';
      h += '<tr class="is-click" data-act="txn:' + t.id + '"><td class="qba-nowrap">' + U.fmtDate(t.date) + '</td><td><div>' + esc(t.no || '') + '</div><div class="qba-sub">' + esc(t.type) + '</div></td>' +
        '<td><div>' + esc(S.payeeName(t)) + '</div><div class="qba-sub qba-ellip">' + esc(otherSide(t, id)) + '</div></td><td class="qba-ellip">' + esc(t.memo || e.p.desc || '') + '</td>' + amtCells(e.inc) +
        '<td class="ta-c"><button type="button" class="qba-clr ' + c.toLowerCase() + '" data-act="qba:reg.clr|' + t.id + '" title="' + (c === 'R' ? 'Reconciled' : c === 'C' ? 'Cleared' : 'Not cleared') + '">' + (c || '&nbsp;') + '</button></td><td class="ta-r">' + U.num(e.bal) + '</td></tr>';
    });
    if (G.dir === 'desc') h += openRow;
    h += '</tbody></table></div><div class="qba-reg-foot qba-muted">' + rows.length + ' transaction' + (rows.length === 1 ? '' : 's') + (filtered ? ' match your filters' : '') + '</div>';
    el.innerHTML = h;
    el.oninput = function (ev) { if (ev.target.hasAttribute('data-gq')) { G.q = ev.target.value; redraw(); refocus(el, '[data-gq]'); } };
    el.onchange = function (ev) { var t = ev.target; if (t.hasAttribute('data-gf')) { G[t.getAttribute('data-gf')] = t.value; redraw(); } };
  }
  ACT['reg.sort'] = function () { ST.reg.dir = ST.reg.dir === 'asc' ? 'desc' : 'asc'; redraw(); };
  ACT['reg.reset'] = function () { var G = ST.reg; G.q = ''; G.range = 'all'; G.status = 'all'; G.type = 'all'; redraw(); };
  ACT['reg.print'] = function () { window.print(); };
  ACT['reg.acctMenu'] = function (a, el) {
    UI.menu(el, S.ordered().filter(function (x) { return S.isBS(x) && x.active !== false; }).map(function (x) { return [S.fullName(x.id), 'qba:reg.go|' + x.id]; }), { alignLeft: true });
  };
  ACT['reg.go'] = function (a) { QB.go('register', { id: a[0] }); };
  ACT['reg.add'] = function (a) { var id = ST.reg.id; QB.openForm(a[0], { account: id, acct: id }); };
  ACT['reg.clr'] = function (a) {
    var c = ST.cleared[a[0]];
    if (c === 'R') return UI.toast('This transaction is reconciled. Change it from the reconciliation instead.', 'err');
    if (c === 'C') delete ST.cleared[a[0]]; else ST.cleared[a[0]] = 'C';
    redraw();
  };
  ACT['reg.export'] = function (a) {
    var id = a[0], acc = S.acct[id], cols = regCols(acc), bal = 0, rows = [['Date', 'Ref no.', 'Type', 'Payee', 'Account', 'Memo', cols.c1, cols.c2, 'Status', 'Balance']];
    acctEntries(id).forEach(function (e) {
      bal = U.r2(bal + e.inc);
      if (e.t.hidden) return;
      var first = cols.c1inc ? e.inc > 0 : e.inc < 0, v = U.num(Math.abs(e.inc));
      rows.push([U.fmtDate(e.t.date), e.t.no || '', e.t.type, S.payeeName(e.t), otherSide(e.t, id), e.t.memo || '', first ? v : '', first ? '' : v, ST.cleared[e.t.id] || '', U.num(bal)]);
    });
    downloadCsv(acc.name + ' register.csv', rows);
  };

  /* ═════════════════ Recurring transactions ═════════════════ */
  var RC_TYPES = ['Bill', 'Check', 'Credit Card Credit', 'Deposit', 'Estimate', 'Expense', 'Invoice', 'Journal Entry', 'Purchase Order', 'Refund', 'Sales Receipt', 'Transfer', 'Vendor Credit'];
  var RC_CUST = ['Invoice', 'Estimate', 'Sales Receipt', 'Refund', 'Credit Memo'], RC_NONE = ['Transfer', 'Journal Entry'];
  function rcIds() { S.recurring.forEach(function (r) { if (!r.id) r.id = U.uid('rc'); }); }
  function rcById(id) { rcIds(); return S.recurring.filter(function (r) { return r.id === id; })[0]; }
  function advance(iso, interval) {
    var m = /Every\s*(\d+)?\s*(Day|Week|Month|Year)/i.exec(interval || '');
    if (!m || !iso) return iso;
    var n = +(m[1] || 1), u = m[2].toLowerCase();
    return u === 'day' ? U.addDays(iso, n) : u === 'week' ? U.addDays(iso, 7 * n) : u === 'month' ? U.addMonths(iso, n) : U.addMonths(iso, 12 * n);
  }
  QB.view('recurring', function (params, el) { rcIds(); mount(el, function () { drawRecur(el); }); });
  function drawRecur(el) {
    var R = ST.recur, q = R.q.trim().toLowerCase();
    var all = S.recurring.slice().sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
    var ttypes = uniq(all.map(function (r) { return r.type; })).sort();
    var rows = all.filter(function (r) {
      if (R.type !== 'all' && r.txnType !== R.type) return false;
      if (R.ttype !== 'all' && r.type !== R.ttype) return false;
      return !q || (r.name + ' ' + r.payee + ' ' + r.type).toLowerCase().indexOf(q) >= 0;
    });
    var h = UI.pageHead('Recurring transactions', { crumb: 'Accounting', actions: UI.btn('Reminder List', { kind: 'secondary', act: 'qba:rcr.reminders' }) + UI.split('New', [['Run report', 'report:Recurring Template List']], { act: 'qba:rcr.new' }) });
    h += '<div class="qba-tools">' + UI.field('Template type', UI.select('rtt', [['all', 'All'], ['Scheduled', 'Scheduled'], ['Reminder', 'Reminder'], ['Unscheduled', 'Unscheduled']], R.type, ' data-rf="type"')) +
      UI.field('Transaction type', UI.select('rtx', [['all', 'All']].concat(ttypes.map(function (t) { return [t, t]; })), R.ttype, ' data-rf="ttype"')) +
      '<div class="qb-search-box qba-search qba-self-end"><input class="qb-input" data-rcq placeholder="Filter by name" value="' + esc(R.q) + '">' + ic('search') + '</div><span class="qb-grow"></span>' + iconBtn('print', 'rcr.print', 'Print') + '</div>';
    h += '<div class="qb-table-wrap"><table class="qb-table qba-rcr-table"><thead><tr><th>Template name</th><th>Type</th><th>Txn type</th><th>Interval</th><th>Previous date</th><th>Next date</th><th>Customer/Vendor</th><th class="ta-r">Amount</th><th class="ta-r">Action</th></tr></thead><tbody>';
    if (!rows.length) h += '<tr class="qb-empty-row"><td colspan="9">' + (all.length ? 'No templates match your filters.' : 'You don\'t have any recurring templates yet.') + '</td></tr>';
    rows.forEach(function (r) {
      h += '<tr class="' + (r.paused ? 'is-off' : '') + '"><td><button type="button" class="qb-link" data-act="qba:rcr.edit|' + r.id + '">' + esc(r.name) + '</button>' + (r.paused ? ' <span class="qba-status">Paused</span>' : '') + '</td>' +
        '<td>' + esc(r.txnType) + '</td><td>' + esc(r.type) + '</td><td>' + esc(r.interval || '') + '</td><td>' + (r.prev ? U.fmtDate(r.prev) : '') + '</td><td>' + (r.next && !r.paused && r.txnType !== 'Unscheduled' ? U.fmtDate(r.next) : '') + '</td>' +
        '<td>' + esc(r.payee || '') + '</td><td class="ta-r">' + U.num(r.amount || 0) + '</td>' +
        '<td class="ta-r"><span class="qb-act"><button type="button" class="qb-link" data-act="qba:rcr.edit|' + r.id + '">Edit</button><button type="button" class="qb-act-caret" data-act="qba:rcr.menu|' + r.id + '" aria-label="More actions">' + ic('caretDown') + '</button></span></td></tr>';
    });
    h += '</tbody></table></div>';
    el.innerHTML = h;
    el.oninput = function (e) { if (e.target.hasAttribute('data-rcq')) { R.q = e.target.value; redraw(); refocus(el, '[data-rcq]'); } };
    el.onchange = function (e) { var t = e.target; if (t.hasAttribute('data-rf')) { R[t.getAttribute('data-rf')] = t.value; redraw(); } };
  }
  ACT['rcr.print'] = function () { window.print(); };
  ACT['rcr.menu'] = function (a, el) {
    var r = rcById(a[0]); if (!r) return;
    UI.menu(el, [['Use', 'qba:rcr.use|' + r.id], ['Duplicate', 'qba:rcr.dup|' + r.id], [r.paused ? 'Resume' : 'Pause', 'qba:rcr.pause|' + r.id], { label: 'Skip next date', act: 'qba:rcr.skip|' + r.id, disabled: r.txnType === 'Unscheduled' || r.paused }, ['Delete', 'qba:rcr.del|' + r.id]]);
  };
  ACT['rcr.use'] = function (a) {
    var r = rcById(a[0]); if (!r) return;
    var opts = { amount: r.amount, memo: r.memo || '', template: r }, c = custByName(r.payee), v = vendByName(r.payee);
    if (c) opts.cust = c.id;
    if (v) opts.payee = v.id;
    QB.openForm(r.type, opts);
  };
  ACT['rcr.dup'] = function (a) {
    var r = rcById(a[0]); if (!r) return;
    var c = JSON.parse(JSON.stringify(r)); c.id = U.uid('rc'); c.name = r.name + ' (copy)'; c.paused = false;
    S.recurring.push(c); changed('recurring'); UI.toast('Template duplicated.');
    rcEditor(c, false);
  };
  ACT['rcr.pause'] = function (a) {
    var r = rcById(a[0]); if (!r) return;
    r.paused = !r.paused; changed('recurring');
    UI.toast(r.paused ? r.name + ' is paused. It won\'t create transactions until you resume it.' : r.name + ' is running again.');
  };
  ACT['rcr.skip'] = function (a) {
    var r = rcById(a[0]); if (!r || !r.next) return;
    var was = r.next; r.next = advance(r.next, r.interval); changed('recurring');
    UI.toast('Skipped ' + U.fmtDate(was) + '. Next date is ' + U.fmtDate(r.next) + '.');
  };
  ACT['rcr.del'] = function (a) {
    var r = rcById(a[0]); if (!r) return;
    UI.confirm('Delete template?', 'Are you sure you want to delete "' + r.name + '"? Transactions it already created stay in your books.', 'Delete', function () {
      S.recurring.splice(S.recurring.indexOf(r), 1); changed('recurring'); UI.toast('Template deleted.');
    });
  };
  ACT['rcr.edit'] = function (a) { var r = rcById(a[0]); if (r) rcEditor(r, false); };
  ACT['rcr.new'] = function () {
    UI.modal('Select the template type', UI.field('Transaction type', UI.select('rcnew', RC_TYPES, 'Invoice', ' data-rcnew')), {
      buttons: [['Cancel', 'secondary'], ['OK', 'primary', function (m) {
        var t = m.querySelector('[data-rcnew]').value;
        setTimeout(function () { rcEditor({ name: '', type: t, txnType: 'Scheduled', interval: 'Every Month', prev: '', next: U.today(), payee: '', amount: 0, memo: '' }, true); }, 0);
      }]]
    });
  };
  ACT['rcr.reminders'] = function () {
    var list = S.recurring.filter(function (r) { return r.txnType === 'Reminder' && !r.paused; });
    UI.modal('Reminder List', list.length ? '<table class="qb-table is-case"><thead><tr><th>Template</th><th>Txn type</th><th>Due</th><th>Customer/Vendor</th><th class="ta-r">Amount</th><th></th></tr></thead><tbody>' + list.map(function (r) {
      return '<tr><td>' + esc(r.name) + '</td><td>' + esc(r.type) + '</td><td>' + (r.next ? U.fmtDate(r.next) : '') + '</td><td>' + esc(r.payee) + '</td><td class="ta-r">' + U.num(r.amount) + '</td><td class="ta-r"><button type="button" class="qb-link" data-ruse="' + r.id + '">Use</button></td></tr>';
    }).join('') + '</tbody></table>' : '<p>You don\'t have any reminders.</p>', { wide: true, buttons: [['Close', 'primary']] }).addEventListener('click', function (e) {
      var b = e.target.closest('[data-ruse]'); if (!b) return;
      var m = b.closest('.qb-modal'); if (m && m.close) m.close();
      ACT['rcr.use']([b.getAttribute('data-ruse')]);
    });
  };
  function rcEditor(r, isNew) {
    var m = JSON.parse(JSON.stringify(r)), im = /Every\s*(\d+)?\s*(Day|Week|Month|Year)/i.exec(m.interval || '') || [null, '1', 'Month'];
    m.every = +(im[1] || 1); m.unit = im[2].charAt(0).toUpperCase() + im[2].slice(1).toLowerCase();
    m.advance = m.advance == null ? 0 : m.advance; m.endKind = m.endKind || 'None'; m.endVal = m.endVal || '';
    var side = RC_CUST.indexOf(m.type) >= 0 ? 'cust' : RC_NONE.indexOf(m.type) >= 0 ? 'none' : 'vend';
    var d = UI.drawer('Recurring ' + m.type, '', { wide: true, saveLabel: 'Save template', onSave: save });
    var body = d.querySelector('.qb-drawer-body');
    function paint() {
      var h = '<div class="qba-rd"><div class="qba-det-grid">' + UI.field('Template name*', '<input class="qb-input" data-tm="name" value="' + esc(m.name) + '">') +
        UI.field('Type', UI.select('tt', ['Scheduled', 'Reminder', 'Unscheduled'], m.txnType, ' data-tm="txnType"'));
      if (m.txnType === 'Scheduled') h += UI.field('Create', '<span class="qba-inline"><input class="qb-input qba-w60" data-tm="advance" value="' + esc(m.advance) + '"><span>days in advance</span></span>');
      if (m.txnType === 'Reminder') h += UI.field('Remind', '<span class="qba-inline"><input class="qb-input qba-w60" data-tm="advance" value="' + esc(m.advance) + '"><span>days before the transaction date</span></span>');
      if (side !== 'none') {
        var lab = m.payee || '';
        h += UI.field(side === 'cust' ? 'Customer' : 'Payee', UI.comboHtml('tp', lab, side === 'cust' ? 'Choose a customer' : 'Choose a payee', ' data-cb="' + side + '|tpl|payee" data-label="' + esc(lab) + '"'));
      }
      h += '</div>';
      if (m.txnType !== 'Unscheduled') {
        h += '<div class="qba-rd-sec"><h3>Interval</h3><div class="qba-rd-row">' + UI.select('tu', [['Day', 'Daily'], ['Week', 'Weekly'], ['Month', 'Monthly'], ['Year', 'Yearly']], m.unit, ' data-tm="unit"') +
          '<span>every</span><input class="qb-input qba-w60" data-tm="every" value="' + esc(m.every) + '"><span>' + m.unit.toLowerCase() + '(s)</span></div>' +
          '<div class="qba-det-grid">' + UI.field('Start date', UI.dateInput('ts', U.parseDate(String(m.next || '').trim()) || U.today(), ' data-tm="next"')) +
          UI.field('End', UI.select('te', [['None', 'None'], ['By', 'By'], ['After', 'After']], m.endKind, ' data-tm="endKind"')) +
          (m.endKind === 'By' ? UI.field('End date', UI.dateInput('tev', U.parseDate(String(m.endVal || '').trim()), ' data-tm="endVal"')) : m.endKind === 'After' ? UI.field('Occurrences', '<input class="qb-input" data-tm="endVal" value="' + esc(m.endVal) + '">') : '') + '</div></div>';
      }
      h += '<div class="qba-rd-sec"><h3>Details</h3><div class="qba-det-grid">' + UI.field('Amount', '<input class="qb-input ta-r" data-tm="amount" value="' + esc(U.num(m.amount || 0).replace(/,/g, '')) + '" inputmode="decimal">') +
        UI.field('Memo', '<input class="qb-input" data-tm="memo" value="' + esc(m.memo || '') + '">') + '</div>' +
        '<p class="qba-muted">The full ' + esc(m.type.toLowerCase()) + ' (lines, terms, tax) opens when you select <b>Use</b> on the template.</p></div></div>';
      body.innerHTML = h;
      bindCombos(body, function (inp, v, o) { m.payee = o ? o.label : ''; });
    }
    body.addEventListener('input', function (e) { var k = e.target.getAttribute('data-tm'); if (k) m[k] = e.target.value; if (e.target.hasAttribute('data-cb')) m.payee = e.target.value.trim(); });
    body.addEventListener('change', function (e) { var k = e.target.getAttribute('data-tm'); if (!k) return; m[k] = e.target.value; if (k === 'txnType' || k === 'unit' || k === 'endKind') paint(); });
    function save() {
      if (!String(m.name).trim()) { UI.toast('Enter a template name.', 'err'); return false; }
      if (S.recurring.some(function (x) { return x !== r && x.name.toLowerCase() === String(m.name).trim().toLowerCase(); })) { UI.toast('Another template already uses that name.', 'err'); return false; }
      var n = Math.max(1, parseInt(m.every, 10) || 1), next = U.parseDate(String(m.next || '').trim()) || (m.txnType === 'Unscheduled' ? '' : U.today());
      r.name = String(m.name).trim(); r.txnType = m.txnType; r.payee = m.payee || ''; r.amount = U.r2(U.parseMoney(m.amount)); r.memo = m.memo || '';
      r.interval = m.txnType === 'Unscheduled' ? '' : 'Every ' + (n === 1 ? '' : n + ' ') + m.unit + (n === 1 ? '' : 's');
      r.next = m.txnType === 'Unscheduled' ? '' : next; r.advance = parseInt(m.advance, 10) || 0; r.endKind = m.endKind; r.endVal = m.endVal;
      if (isNew) { r.id = U.uid('rc'); r.prev = ''; S.recurring.push(r); }
      changed('recurring');
      UI.toast('Template saved.');
    }
    paint();
  }

  /* ═════════════════ My accountant ═════════════════ */
  QB.view('my-accountant', function (params, el) { mount(el, function () { drawAcctnt(el); }); });
  function drawAcctnt(el) {
    var list = ST.acctnt.list;
    var h = UI.pageHead('My accountant', { crumb: 'Accounting' });
    h += '<div class="qba-inv"><div class="qba-inv-copy"><h2>Invite your accountant</h2><p>Give your accountant access to your books. They can review your work, fix mistakes, and help you at tax time. Accountants don\'t count toward your user limit.</p>' +
      '<div class="qba-inv-form">' + UI.field('Accountant\'s email', '<input class="qb-input" type="email" data-ae placeholder="name@accountingfirm.com">') + UI.btn('Invite', { kind: 'primary', act: 'qba:acct.invite' }) + '</div>' +
      '<p class="qba-muted qba-small">We\'ll email them an invite. Once they accept, they\'ll show up in the list below.</p></div><div class="qba-inv-art">' + QB.art('docs') + '</div></div>';
    h += '<h3 class="qba-h3">Accounting firm users</h3><div class="qb-table-wrap"><table class="qb-table qba-acct-table"><thead><tr><th>Name</th><th>Email</th><th>Access</th><th>Status</th><th>Invited</th><th class="ta-r">Action</th></tr></thead><tbody>';
    if (!list.length) h += '<tr class="qb-empty-row"><td colspan="6">You haven\'t invited an accountant yet.</td></tr>';
    list.forEach(function (u, i) {
      h += '<tr><td>' + (u.name ? esc(u.name) : '<span class="qba-muted">--</span>') + '</td><td>' + esc(u.email) + '</td><td>Accountant</td><td><span class="qba-status' + (u.status === 'Active' ? ' on' : ' pend') + '">' + esc(u.status) + '</span></td><td>' + U.fmtDate(u.date) + '</td>' +
        '<td class="ta-r"><span class="qb-act">' + (u.status === 'Invited' ? '<button type="button" class="qb-link" data-act="qba:acct.resend|' + i + '">Resend invite</button>' : '<button type="button" class="qb-link" data-act="qba:acct.view|' + i + '">View</button>') +
        '<button type="button" class="qb-act-caret" data-act="qba:acct.menu|' + i + '" aria-label="More actions">' + ic('caretDown') + '</button></span></td></tr>';
    });
    h += '</tbody></table></div>';
    h += '<div class="qba-pro">' + ic('users') + '<div><b>Don\'t have an accountant?</b><span>Find a QuickBooks ProAdvisor who knows your industry.</span></div><button type="button" class="qb-link" data-act="qba:acct.find">Find an accountant</button></div>';
    el.innerHTML = h;
    var inp = el.querySelector('[data-ae]');
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ACT['acct.invite']([]); });
  }
  ACT['acct.invite'] = function () {
    var inp = CUR.el && CUR.el.querySelector('[data-ae]'), v = inp ? inp.value.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { if (inp) inp.classList.add('is-err'); return UI.toast('Enter a valid email address.', 'err'); }
    if (ST.acctnt.list.some(function (u) { return u.email.toLowerCase() === v.toLowerCase(); })) return UI.toast(v + ' was already invited.', 'err');
    ST.acctnt.list.push({ email: v, name: '', status: 'Invited', date: U.today() });
    UI.toast('Your invite was sent to ' + v + '.');
    redraw();
  };
  ACT['acct.resend'] = function (a) { var u = ST.acctnt.list[+a[0]]; if (u) { u.date = U.today(); UI.toast('We sent the invite to ' + u.email + ' again.'); redraw(); } };
  ACT['acct.view'] = function (a) {
    var u = ST.acctnt.list[+a[0]]; if (!u) return;
    UI.modal(u.name || u.email, '<p>' + esc(u.email) + '</p><p>Access: Accountant. They can see and change everything except billing and subscriptions.</p>', { buttons: [['Close', 'primary']] });
  };
  ACT['acct.menu'] = function (a, el) {
    var u = ST.acctnt.list[+a[0]]; if (!u) return;
    var items = [];
    if (u.status === 'Invited') items.push(['Mark as accepted (practice)', 'qba:acct.accept|' + a[0]]);
    items.push(['Delete', 'qba:acct.del|' + a[0]]);
    UI.menu(el, items);
  };
  ACT['acct.accept'] = function (a) {
    var u = ST.acctnt.list[+a[0]]; if (!u) return;
    u.status = 'Active'; u.name = u.email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    UI.toast(u.email + ' accepted your invite.'); redraw();
  };
  ACT['acct.del'] = function (a) {
    var u = ST.acctnt.list[+a[0]]; if (!u) return;
    UI.confirm('Remove accountant?', u.email + ' will lose access to your books.', 'Remove', function () { ST.acctnt.list.splice(+a[0], 1); redraw(); UI.toast('Accountant removed.'); });
  };
  ACT['acct.find'] = function () {
    UI.modal('Find a ProAdvisor', '<p>QuickBooks ProAdvisors are accountants and bookkeepers certified in QuickBooks. In QuickBooks Online this opens the ProAdvisor directory, where you can search by location and industry.</p>', { buttons: [['Got it', 'primary']] });
  };
})();
