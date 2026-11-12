/* ══════════════════════════════════════════════════════════
   QuickBooks Online test drive: Expenses & Bills app.
   Routes: expense-overview, expenses, vendors, vendordetail, bills,
           bill-payments, mileage, contractors, 1099FilingDetails
   Everything is computed live from S.txns through the ledger;
   the core re-renders the page on every S.changed().
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var QB = window.QB, U = QB.util, S = QB.store, L = QB.ledger, UI = QB.ui;
  var esc = U.esc;

  /* View state that survives the core's full re-render after S.changed(). */
  var st = {
    exp: { type: 'all', date: 'last-12-months', from: '', to: '', status: '', delivery: '', payee: '', cat: '' },
    expPop: false, expGear: false, expCols: { no: true, payee: true, cat: true, memo: false },
    vseg: '', vq: '', vInactive: false,
    vdType: 'all', vdDate: 'all', vdq: '',
    bill: { vendor: '', date: 'this-year', status: '', due: 'all' }, billPop: false, billCust: false, billCols: { no: false, date: false, cat: false },
    bpDate: 'all', bpAcct: '',
    review: [], vendDocs: {}, trips: [], spendRange: 'this-month', hideCards: {}, glanceHidden: false,
    cq: '', p1099: null, box: {}, taxIds: {}
  };

  var SPEND = ['Expense', 'Check', 'Cash Expense', 'Credit Card Expense', 'Bill'];
  var PAIDT = ['Expense', 'Check', 'Cash Expense', 'Credit Card Expense', 'Bill Payment', 'Bill Payment (Check)', 'Bill Payment (Credit Card)'];
  var LIST_TYPES = L.EXPENSE.concat(['Credit Card Payment']);
  var CAT_EDIT = ['Expense', 'Check', 'Cash Expense', 'Credit Card Expense', 'Credit Card Credit', 'Bill', 'Vendor Credit'];
  var MILE_RATE = 0.70;
  var COLORS = ['#00a6a4', '#0077c5', '#2ca01c', '#ffbf00', '#8d9096'];

  /* ───────────── helpers ───────────── */
  function ic(n, c) { return UI.icon(n, c); }
  function isBP(t) { return /^Bill Payment/.test(t.type); }
  function inR(d, r) { return d >= r[0] && d <= r[1]; }
  function sum(a, f) { return U.r2(a.reduce(function (s, x) { return s + (f ? f(x) : x); }, 0)); }
  function vname(id) { return S.vend[id] ? S.vend[id].name : ''; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function rangeLabel(key) { var r = U.RANGES.filter(function (x) { return x[0] === key; })[0]; return r ? r[1] : key; }
  function isCC(acct) { var a = S.acct[acct]; return a && a.type === 'Credit Card'; }
  /* The core render() scrolls the page to the top after every store change;
     in-place edits (recategorize a row, mark a bill paid) keep the position. */
  function keep(fn) {
    var m = document.getElementById('qbMain'), y = m ? m.scrollTop : 0, r = fn();
    if (m && y && m.scrollTop !== y) m.scrollTop = y;
    return r;
  }
  function kept(fn) { return function (a, b) { var self = this; return keep(function () { return fn.call(self, a, b); }); }; }
  function rerender() { keep(function () { QB.render(); }); }
  function confirmK(title, text, ok, fn) { return UI.confirm(title, text, ok, kept(fn)); }
  function modalK(title, body, opts) {
    if (opts && opts.buttons) opts.buttons = opts.buttons.map(function (b) { return b[2] ? [b[0], b[1], kept(b[2])] : b; });
    return UI.modal(title, body, opts);
  }
  /* UI.table keeps sort, page and checks on the host element, which the core
     throws away on every re-render; keep that state per table here instead. */
  st.ts = {};
  function tbl(host, key, cols, rows, opts) {
    if (st.ts[key]) host._qbt = st.ts[key];
    var t = UI.table(host, cols, rows, opts);
    st.ts[key] = t.state;
    return t;
  }
  /* Amount as the expense list shows it: credits and bill payments negative. */
  function signed(t) { return (t.type === 'Credit Card Credit' || t.type === 'Vendor Credit' || isBP(t)) ? -t.total : t.total; }
  function catText(t) {
    if (isBP(t) || t.type === 'Sales Tax Payment') return '';
    if (t.type === 'Credit Card Payment') return S.fullName(t.toAccount || 'a_mc');
    var ls = t.lines || [];
    if (!ls.length) return '';
    return ls.length > 1 ? '--Split--' : S.fullName(ls[0].acct || 'a_uncE');
  }
  function catEditable(t) { return CAT_EDIT.indexOf(t.type) >= 0 && (t.lines || []).length === 1 && !t.voided; }
  function lastPayDate(bill) {
    var d = '';
    S.txns.forEach(function (p) { if (isBP(p)) (p.applied || []).forEach(function (a) { if (a.id === bill.id && p.date > d) d = p.date; }); });
    return d;
  }
  function isOverdue(t) { return t.type === 'Bill' && L.status(t).tone === 'overdue'; }
  function openBills(vid) { return S.find(function (t) { return t.type === 'Bill' && (!vid || t.payee === vid) && L.openBalance(t) > 0.004; }); }
  function pct(cur, prev) {
    if (Math.abs(prev) < 0.005) return cur > 0.004 ? 100 : 0;
    return Math.round((cur - prev) / Math.abs(prev) * 100);
  }
  function trend(cur, prev, tail) {
    var p = pct(cur, prev);
    return '<span class="qbe-trend ' + (p >= 0 ? 'is-up' : 'is-down') + '">' + ic(p >= 0 ? 'arrowUp' : 'arrowDown') + (p >= 0 ? 'Up ' : 'Down ') + Math.abs(p) + '%</span> ' + esc(tail);
  }
  function kfmt(n) {
    n = Math.round(n);
    if (Math.abs(n) >= 1000) { var k = n / 1000; return '$' + (k % 1 ? k.toFixed(1) : k) + 'K'; }
    return '$' + n;
  }
  /* Link + caret menu for table ACTION columns. items: [[label, act]] */
  function actLinks(label, act, items) {
    return '<span class="qb-act"><button type="button" class="qb-link" data-act="' + esc(act) + '">' + esc(label) + '</button>' +
      (items && items.length ? '<button type="button" class="qb-act-caret" data-menu=\'' + esc(JSON.stringify(items)) + '\' aria-label="More actions">' + ic('caretDown') + '</button>' : '') + '</span>';
  }
  function iconBtn(name, act, label) { return '<button type="button" class="qb-icon-btn" data-act="' + act + '" aria-label="' + label + '" title="' + label + '">' + ic(name) + '</button>'; }
  function selectOpts(list, value) {
    return list.map(function (o) {
      if (typeof o === 'string') o = [o, o];
      return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('');
  }
  function download(name, text) {
    try {
      var b = new Blob([text], { type: 'text/csv' }), a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      UI.toast('Exported ' + name + '.');
    } catch (e) { UI.toast('Export is not available in this browser.', 'err'); }
  }
  function csv(rows) {
    return rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n');
  }
  function payeeOptions() {
    return [['', 'All']].concat(S.vendors.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (v) { return [v.id, v.name]; }));
  }
  function catOptionsList() { return QB.lists.categories().map(function (c) { return [c.value, c.label]; }); }
  function vendorIdByName(name) {
    var n = String(name || '').toLowerCase();
    var v = S.vendors.filter(function (x) { return x.name.toLowerCase() === n || (x.company || '').toLowerCase() === n; })[0];
    return v ? v.id : '';
  }

  /* Spending used by the overview charts: money-out documents, signed. */
  function spendTxns(r) { return S.find(function (t) { return SPEND.indexOf(t.type) >= 0 && !t.voided && inR(t.date, r); }); }
  /* Paid to a vendor this year, accrual (bills count when entered). */
  function paidAccrual(vid, r) {
    r = r || U.range('this-year');
    return sum(S.find(function (t) { return t.payee === vid && SPEND.indexOf(t.type) >= 0 && inR(t.date, r); }), function (t) { return t.total; });
  }
  /* 1099 payments: cash, check and bank payments only. Card payments are
     reported by the card processor (1099-K), so QuickBooks leaves them out. */
  function lines1099(vid, r) {
    r = r || U.range('this-year');
    var out = [];
    S.find(function (t) { return t.payee === vid && inR(t.date, r) && !t.voided; }).forEach(function (t) {
      if (['Expense', 'Check', 'Cash Expense'].indexOf(t.type) >= 0 && !isCC(t.account)) {
        t.lines.forEach(function (l) { out.push({ acct: l.acct || 'a_uncE', amount: l.amount }); });
      } else if ((t.type === 'Bill Payment' || t.type === 'Bill Payment (Check)') && !isCC(t.account)) {
        (t.applied || []).forEach(function (a) {
          var b = S.txn[a.id]; if (!b || !b.total) return;
          b.lines.forEach(function (l) { out.push({ acct: l.acct || 'a_uncE', amount: U.r2(a.amount * l.amount / b.total) }); });
        });
      }
    });
    return out;
  }
  function amount1099(vid) {
    return sum(lines1099(vid).filter(function (l) { return (st.box[l.acct] || 'nec') !== 'none'; }), function (l) { return l.amount; });
  }

  /* ───────────── transaction actions ───────────── */
  function txnMenu(t) {
    var id = t.id, open = t.type === 'Bill' && L.openBalance(t) > 0.004;
    if (t.type === 'Bill') {
      if (open) return actLinks('Schedule payment', 'qbe:paybill:' + id, [['Make payment', 'qbe:paybill:' + id], ['Mark as paid', 'qbe:markpaid:' + id], ['View/Edit', 'txn:' + id], ['Copy', 'qbe:copy:' + id], ['Delete', 'qbe:del:' + id], ['Void', 'qbe:void:' + id]]);
      return actLinks('View/Edit', 'txn:' + id, [['Copy', 'qbe:copy:' + id], ['Delete', 'qbe:del:' + id], ['Void', 'qbe:void:' + id]]);
    }
    if (t.type === 'Purchase Order') {
      if ((t.status || 'Open') !== 'Closed') return actLinks('Send', 'qbe:sendpo:' + id, [['Print', 'qbe:print:' + id], ['Copy to bill', 'qbe:po2bill:' + id], ['Close purchase order', 'qbe:closepo:' + id], ['View/Edit', 'txn:' + id], ['Copy', 'qbe:copy:' + id], ['Delete', 'qbe:del:' + id]]);
      return actLinks('Print', 'qbe:print:' + id, [['Send', 'qbe:sendpo:' + id], ['View/Edit', 'txn:' + id], ['Copy', 'qbe:copy:' + id], ['Delete', 'qbe:del:' + id]]);
    }
    if (isBP(t)) return actLinks('View/Edit', 'txn:' + id, [['Print', 'qbe:print:' + id], ['Delete', 'qbe:del:' + id], ['Void', 'qbe:void:' + id]]);
    if (t.type === 'Vendor Credit' || t.type === 'Sales Tax Payment' || t.type === 'Credit Card Payment') return actLinks('View/Edit', 'txn:' + id, [['Copy', 'qbe:copy:' + id], ['Delete', 'qbe:del:' + id]]);
    var items = [['Copy', 'qbe:copy:' + id], ['Delete', 'qbe:del:' + id], ['Void', 'qbe:void:' + id]];
    if (t.type === 'Check') items.unshift(['Print check', 'form:Print Checks']);
    return actLinks('View/Edit', 'txn:' + id, items);
  }

  function copyTxn(id) {
    var t = S.txn[id]; if (!t) return;
    var c = JSON.parse(JSON.stringify(t));
    delete c.id; delete c.created; delete c.voided; delete c.sent;
    c.no = ''; c.date = U.today(); c.applied = [];
    if (c.type === 'Bill') c.due = U.addDays(c.date, U.termsDays(c.terms));
    if (c.type === 'Purchase Order') c.status = 'Open';
    S.add(c);
    UI.toast(t.type + ' copied. You are now editing the copy.');
    QB.openTxn(c.id);
  }
  function deleteTxn(id) {
    var t = S.txn[id]; if (!t) return;
    confirmK('Delete ' + t.type.toLowerCase() + '?', 'Are you sure you want to delete this?', 'Yes', function () {
      S.remove(id); UI.toast(t.type + ' deleted.');
    });
  }
  function voidTxn(id) {
    var t = S.txn[id]; if (!t) return;
    if (t.type === 'Bill' && L.applied(t.id) > 0.004) { UI.toast('This bill has payments applied. Void or delete the payments first.', 'err'); return; }
    confirmK('Void ' + t.type.toLowerCase() + '?', 'Are you sure you want to void this? The amount will be set to zero and the transaction kept for your records.', 'Yes', function () {
      (t.lines || []).forEach(function (l) { l.amount = 0; if (l.rate != null) l.rate = 0; });
      t.total = 0; t.applied = []; t.voided = true;
      t.memo = 'Voided' + (t.memo ? ': ' + t.memo : '');
      S.update(t); UI.toast(t.type + ' voided.');
    });
  }
  function markPaid(id) {
    var b = S.txn[id]; if (!b) return;
    var open = L.openBalance(b);
    if (open <= 0.004) { UI.toast('This bill is already paid.'); return; }
    S.add({ type: 'Bill Payment', no: S.nextNo('Bill Payment'), date: U.today(), payee: b.payee, account: 'a_chk', total: open, method: 'Check', memo: '', lines: [], applied: [{ id: b.id, amount: open }] });
    UI.toast('Bill marked as paid. A bill payment of ' + U.money(open) + ' was recorded from Checking.');
  }
  function payBill(id) { QB.openForm('Pay Bills', { bill: id }); }
  function poToBill(id) {
    var po = S.txn[id]; if (!po) return;
    var b = { type: 'Bill', no: '', date: U.today(), terms: 'Net 30', due: U.addDays(U.today(), 30), payee: po.payee, memo: 'Created from purchase order ' + (po.no || ''), fromPO: po.id,
      lines: po.lines.map(function (l) { return { acct: l.acct, amount: l.amount, desc: l.desc || '', cust: l.cust || '', billable: !!l.billable }; }) };
    b.total = sum(b.lines, function (l) { return l.amount; });
    po.status = 'Closed';
    S.add(b);
    UI.toast('Bill created from purchase order ' + (po.no || '') + '.');
    QB.openTxn(b.id);
  }
  function sendPO(id) {
    var t = S.txn[id]; if (!t) return;
    var v = S.vend[t.payee] || {};
    modalK('Send purchase order', '<div class="qbe-mform">' +
      UI.field('To', UI.input('to', (v.email || '').split(',')[0])) +
      UI.field('Subject', UI.input('subject', 'Purchase Order ' + (t.no || '') + ' from ' + S.company.name)) +
      UI.field('Message', '<textarea class="qb-input" name="msg" rows="6">Dear ' + esc(v.name || '') + ',\n\nPlease find our purchase order attached to this email.\n\nThank you.\n' + esc(S.company.name) + '</textarea>') +
      '</div>', { buttons: [['Cancel', 'secondary'], ['Send', 'primary', function (m) {
        var to = m.querySelector('[name=to]').value.trim();
        if (!to) { UI.toast('Enter an email address for the vendor.', 'err'); return false; }
        t.sent = true; t.emailStatus = 'Sent'; S.update(t);
        UI.toast('Purchase order ' + (t.no || '') + ' was sent to ' + to + '.');
      }]] });
  }
  /* A plain print preview of one or more documents. */
  function printTxns(ids) {
    var docs = ids.map(function (id) { return S.txn[id]; }).filter(Boolean);
    if (!docs.length) { UI.toast('Select at least one transaction to print.', 'err'); return; }
    var h = docs.map(function (t) {
      var v = S.vend[t.payee] || {};
      return '<div class="qbe-doc"><div class="qbe-doc-head"><div><b>' + esc(S.company.name) + '</b><br>' + esc(S.company.street) + '<br>' + esc(S.company.city + ', ' + S.company.state + ' ' + S.company.zip) + '</div>' +
        '<div class="ta-r"><div class="qbe-doc-type">' + esc(t.type.toUpperCase()) + '</div>' + (t.no ? 'No. ' + esc(t.no) + '<br>' : '') + U.fmtDate(t.date) + '</div></div>' +
        '<div class="qbe-doc-to"><span class="qb-muted">' + (t.type === 'Purchase Order' ? 'VENDOR' : 'PAYEE') + '</span><br>' + esc(S.payeeName(t) || '—') + (v.street ? '<br>' + esc(v.street) + '<br>' + esc(v.city + ', ' + v.state + ' ' + v.zip) : '') + '</div>' +
        '<table class="qbe-doc-lines"><thead><tr><th>#</th><th>Category</th><th>Description</th><th class="ta-r">Amount</th></tr></thead><tbody>' +
        (t.lines || []).map(function (l, i) { return '<tr><td>' + (i + 1) + '</td><td>' + esc(S.fullName(l.acct)) + '</td><td>' + esc(l.desc || '') + '</td><td class="ta-r">' + U.num(l.amount) + '</td></tr>'; }).join('') +
        '</tbody></table><div class="qbe-doc-total">Total <b>' + U.money(t.total) + '</b></div></div>';
    }).join('');
    modalK('Print preview', h, { wide: true, buttons: [['Close', 'secondary'], ['Print', 'primary', function () { try { window.print(); } catch (e) {} return false; }]] });
  }
  function categorizeBatch(ids) {
    var list = ids.map(function (id) { return S.txn[id]; }).filter(Boolean);
    if (!list.length) { UI.toast('Select at least one transaction to categorize.', 'err'); return; }
    modalK('Categorize selected', '<p>Choose a category for the ' + plural(list.length, 'selected transaction') + '. Transactions with split lines, payments and purchase orders keep their categories.</p>' +
      UI.field('Category', UI.select('qbeBatchCat', catOptionsList(), 'a_uncE')), { buttons: [['Cancel', 'secondary'], ['Apply', 'primary', function (m) {
        var acct = m.querySelector('[name=qbeBatchCat]').value, n = 0;
        list.forEach(function (t) { if (catEditable(t)) { t.lines[0].acct = acct; n++; } });
        if (!n) { UI.toast('None of the selected transactions can be recategorized here.', 'err'); return; }
        if (curTable) curTable.state.checked = {};
        S.update(list[0]);
        UI.toast(plural(n, 'transaction') + ' categorized as ' + S.fullName(acct) + '.');
      }]] });
  }

  /* ───────────── action verbs ───────────── */
  var MENUS = {
    newtxn: [['Time activity', 'form:Single time activity'], ['Bill', 'form:Bill'], ['Expense', 'form:Expense'], ['Check', 'form:Check'], ['Purchase order', 'form:Purchase Order'], ['Vendor credit', 'form:Vendor Credit'], ['Credit card credit', 'form:Credit Card Credit'], ['Pay down credit card', 'form:Credit Card Payment']],
    showall: [['Check', 'form:Check'], ['Purchase order', 'form:Purchase Order'], ['Vendor credit', 'form:Vendor Credit'], ['Credit card credit', 'form:Credit Card Credit'], ['Print checks', 'form:Print Checks'], ['Pay down credit card', 'form:Credit Card Payment'], ['Add vendor', 'new:vendor']],
    batch: [['Categorize selected', 'qbe:batchcat'], ['Print transactions', 'qbe:batchprint']],
    vbatch: [['Email', 'qbe:vbatchmail'], ['Make inactive', 'qbe:vbatchinact']]
  };
  function vendMenu(id) {
    var v = S.vend[id];
    return [['Create bill', 'qbe:vform:Bill:' + id], ['Create expense', 'qbe:vform:Expense:' + id], ['Write check', 'qbe:vform:Check:' + id], ['Create purchase order', 'qbe:vform:Purchase Order:' + id], [v && v.active === false ? 'Make active' : 'Make inactive', 'qbe:vinact:' + id]];
  }
  var curTable = null; /* the checkable table on the current page */

  QB.on('qbe', kept(function (arg, el) {
    var p = arg.split(':'), cmd = p[0], id = p[1];
    switch (cmd) {
      case 'menu': return UI.menu(el, MENUS[id]);
      case 'paybill': return payBill(id);
      case 'markpaid': return markPaid(id);
      case 'copy': return copyTxn(id);
      case 'del': return deleteTxn(id);
      case 'void': return voidTxn(id);
      case 'print': return printTxns([id]);
      case 'sendpo': return sendPO(id);
      case 'po2bill': return poToBill(id);
      case 'closepo': { var po = S.txn[id]; if (po) { po.status = 'Closed'; S.update(po); UI.toast('Purchase order ' + (po.no || '') + ' closed.'); } return; }
      case 'batchcat': return categorizeBatch(curTable ? curTable.checked() : []);
      case 'batchprint': return printTxns(curTable ? curTable.checked() : []);
      case 'purchnotif': return purchaseNotifications();
      /* expense transactions filters */
      case 'exfilter': st.expPop = !st.expPop; st.expGear = false; return rerender();
      case 'exfclose': st.expPop = false; return rerender();
      case 'exfreset': st.exp = { type: st.exp.type, date: 'last-12-months', from: '', to: '', status: '', delivery: '', payee: '', cat: '' }; st.expPop = false; return rerender();
      case 'exfapply': return applyExpFilter(el.closest('.qbe-pop'));
      case 'exchip': if (id === 'date') st.exp.date = 'all'; else st.exp[id] = ''; return rerender();
      case 'exgear': st.expGear = !st.expGear; st.expPop = false; return rerender();
      case 'exexport': return exportExpenses();
      case 'printpage': try { window.print(); } catch (e) {} return;
      /* vendors */
      case 'vseg': st.vseg = st.vseg === id ? '' : id; return rerender();
      case 'vform': { var form = p[1], vid = p[2]; return QB.openForm(form, { vendor: vid, payee: vid }); }
      case 'vbill': return QB.openForm('Bill', { vendor: id, payee: id });
      case 'paybal': { var ob = openBills(id).sort(function (a, b) { return a.due < b.due ? -1 : 1; })[0]; return QB.openForm('Pay Bills', { bill: ob ? ob.id : '', vendor: id }); }
      case 'vinact': return toggleVendor(id);
      case 'ach': return achModal(id);
      case 'vmail': { var v = S.vend[id]; return v && v.email ? emailVendor(v) : UI.toast('Add an email address for this vendor first.', 'err'); }
      case 'vphone': { var vp = S.vend[id]; return UI.toast(vp && vp.phone ? 'Phone: ' + vp.phone : 'No phone number on file for this vendor.', vp && vp.phone ? 'ok' : 'err'); }
      case 'vbatchmail': {
        var sel = curTable ? curTable.checked() : [];
        var withMail = sel.filter(function (x) { return S.vend[x] && S.vend[x].email; });
        if (!sel.length) return UI.toast('Select at least one vendor.', 'err');
        return UI.toast(withMail.length ? 'Email ready for ' + plural(withMail.length, 'vendor') + '. In the real product your mail app opens here.' : 'None of the selected vendors has an email address.', withMail.length ? 'ok' : 'err');
      }
      case 'vbatchinact': {
        var sel2 = curTable ? curTable.checked() : [];
        if (!sel2.length) return UI.toast('Select at least one vendor.', 'err');
        return confirmK('Make inactive?', 'Make ' + plural(sel2.length, 'vendor') + ' inactive? You can make them active again any time.', 'Yes', function () {
          sel2.forEach(function (x) { if (S.vend[x]) S.vend[x].active = false; }); S.changed('vendor'); UI.toast(plural(sel2.length, 'vendor') + ' made inactive.');
        });
      }
      case 'vinactive': st.vInactive = !st.vInactive; return rerender();
      case 'vedit': return QB.openForm('Vendor', { vendor: id });
      case 'vnew': return UI.menu(el, [['Bill', 'qbe:vform:Bill:' + id], ['Expense', 'qbe:vform:Expense:' + id], ['Check', 'qbe:vform:Check:' + id], ['Purchase order', 'qbe:vform:Purchase Order:' + id], ['Vendor credit', 'qbe:vform:Vendor Credit:' + id], ['Bill payment', 'qbe:paybal:' + id]]);
      case 'howbills1099': return about1099();
      case 'vexport': return exportVendors();
      case 'vnotes': return QB.go('vendordetail', { id: id, tab: 'notes' });
      case 'vsavenotes': {
        var vn = S.vend[id], ta = document.querySelector('.qbe-notes-ta');
        if (vn && ta) { vn.notes = ta.value; S.changed('vendor'); UI.toast('Notes saved.'); }
        return;
      }
      case 'vdupload': return pickFiles(function (files) {
        var list = st.vendDocs[id] = st.vendDocs[id] || [];
        files.forEach(function (f) { list.push({ name: f.name, size: f.size, date: U.today() }); });
        UI.toast(plural(files.length, 'file') + ' attached.'); rerender();
      });
      case 'vddoc': { var dl = st.vendDocs[p[1]] || []; dl.splice(+p[2], 1); return rerender(); }
      /* bills */
      case 'billfilter': st.billPop = !st.billPop; st.billCust = false; return rerender();
      case 'billfapply': {
        var pop = el.closest('.qbe-pop');
        st.bill.status = pop.querySelector('[name=qbeBStatus]').value;
        st.bill.due = pop.querySelector('[name=qbeBDue]').value;
        st.billPop = false; return rerender();
      }
      case 'billfreset': st.bill.status = ''; st.bill.due = 'all'; st.billPop = false; return rerender();
      case 'billcust': st.billCust = !st.billCust; st.billPop = false; return rerender();
      case 'billchip': if (id === 'date') st.bill.date = 'all'; else if (id === 'due') st.bill.due = 'all'; else st.bill[id] = ''; return rerender();
      case 'emailset': return emailSettings();
      case 'howbills': return howBills();
      case 'copyaddr': {
        var addr = autofillAddress();
        try { navigator.clipboard.writeText(addr); } catch (e) {}
        return UI.toast('Email address copied.');
      }
      case 'upload': return pickFiles(function (files) {
        files.forEach(function (f) { st.review.push({ id: U.uid('rv'), name: f.name, size: f.size, date: U.today() }); });
        UI.toast(plural(files.length, 'file') + ' uploaded. ' + (files.length === 1 ? 'It is' : 'They are') + ' waiting in For review.');
        if (QB.route.name === 'bills' && QB.route.params.tab === 'review') rerender(); else QB.go('bills', { tab: 'review' });
      });
      case 'review': { var rv = st.review.filter(function (r) { return r.id === id; })[0]; if (!rv) return; st.review.splice(st.review.indexOf(rv), 1); rerender(); return QB.openForm('Bill', { memo: rv.name, attachment: rv.name }); }
      case 'reviewdel': st.review = st.review.filter(function (r) { return r.id !== id; }); return rerender();
      case 'recuse': return useRecurring(+id);
      case 'recskip': {
        var rc = st.recBills()[+id]; if (!rc) return;
        rc.prev = rc.next || U.today();
        rc.next = /Week/.test(rc.interval) ? U.addDays(rc.prev, 7) : /Year/.test(rc.interval) ? U.addMonths(rc.prev, 12) : U.addMonths(rc.prev, 1);
        S.changed('recurring'); return UI.toast('Skipped. Next date is ' + U.fmtDate(rc.next) + '.');
      }
      case 'recdel': {
        var rd = st.recBills()[+id]; if (!rd) return;
        return confirmK('Delete template?', 'Are you sure you want to delete the template "' + rd.name + '"?', 'Yes', function () { S.recurring.splice(S.recurring.indexOf(rd), 1); S.changed('recurring'); UI.toast('Template deleted.'); });
      }
      case 'approval': return modalK(id === 'pay' ? 'Set up payment approval' : 'Set up bill approval', '<p>' + (id === 'pay' ? 'Choose who approves bill payments before they go out.' : 'Send bills to an approver before they can be paid.') + ' Approval workflows are part of QuickBooks Online Advanced and are not available in this practice copy.</p>', { buttons: [['Got it', 'primary']] });
      /* overview */
      case 'card': st.hideCards[id] = !st.hideCards[id]; return rerender();
      case 'cards': return UI.menu(el, [['Bills funnel', 'funnel'], ['Spend over time', 'sot'], ['Spend insights', 'insights']].map(function (c) { return [(st.hideCards[c[1]] ? 'Show ' : 'Hide ') + c[0], 'qbe:card:' + c[1]]; }), { alignLeft: true });
      case 'glance': st.glanceHidden = !st.glanceHidden; return rerender();
      /* mileage */
      case 'addtrip': return tripModal();
      case 'deltrip': st.trips = st.trips.filter(function (t) { return t.id !== id; }); UI.toast('Trip deleted.'); return rerender();
      case 'tripkind': { var tr = st.trips.filter(function (t) { return t.id === id; })[0]; if (tr) tr.purpose = tr.purpose === 'Business' ? 'Personal' : 'Business'; return rerender(); }
      case 'mileexport': return download('Mileage.csv', csv([['Date', 'Start', 'End', 'Miles', 'Purpose', 'Deduction']].concat(st.trips.map(function (t) { return [U.fmtDate(t.date), t.start, t.end, t.miles, t.purpose, U.num(tripDeduction(t))]; }))));
      /* contractors */
      case 'addcontr': return QB.openForm('Contractor', {});
      case 'w9': return requestW9(+id);
      case 'cform': { var c = S.contractors[+p[2]]; var cv = c ? vendorIdByName(c.name) : ''; return QB.openForm(p[1], { vendor: cv, payee: cv }); }
      /* 1099s */
      case 'prep1099': return prepare1099(1);
    }
  }));
  st.recBills = function () { return S.recurring.filter(function (r) { return r.type === 'Bill'; }); };

  function pickFiles(fn) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true; inp.accept = '.pdf,.png,.jpg,.jpeg,.heic';
    inp.style.display = 'none';
    inp.addEventListener('change', function () { var f = [].slice.call(inp.files || []); inp.remove(); if (f.length) fn(f); });
    document.body.appendChild(inp);
    inp.click();
  }
  function purchaseNotifications() {
    modalK('Purchase notifications', '<p>Get notified when purchase receipts and bills arrive in your business email, so you can review and record them in QuickBooks.</p>' +
      '<label class="qbe-toggle-row">' + UI.toggle('qbePn', !!st.purchNotif) + '<span>Notify me about new purchases</span></label>', { buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (m) {
        st.purchNotif = m.querySelector('[name=qbePn]').checked;
        UI.toast(st.purchNotif ? 'Purchase notifications are on.' : 'Purchase notifications are off.');
      }]] });
  }
  function emailVendor(v) {
    modalK('Email ' + v.name, '<div class="qbe-mform">' + UI.field('To', UI.input('to', v.email)) + UI.field('Subject', UI.input('subject', 'Message from ' + S.company.name)) + UI.field('Message', '<textarea class="qb-input" name="msg" rows="5"></textarea>') + '</div>', {
      buttons: [['Cancel', 'secondary'], ['Send', 'primary', function () { UI.toast('Email sent to ' + v.name + '.'); }]]
    });
  }
  function toggleVendor(id) {
    var v = S.vend[id]; if (!v) return;
    if (v.active === false) { v.active = true; S.changed('vendor'); UI.toast(v.name + ' is active again.'); return; }
    var bal = L.vendBalance(id);
    confirmK('Make ' + v.name + ' inactive?', bal ? 'This vendor has an open balance of ' + U.money(bal) + '. Making the vendor inactive creates no adjustment; the balance stays on your books.' : 'Are you sure you want to make ' + v.name + ' inactive?', 'Yes, make inactive', function () {
      v.active = false; S.changed('vendor'); UI.toast(v.name + ' is now inactive.');
    });
  }
  function achModal(id) {
    var v = S.vend[id]; if (!v) return;
    modalK('Add payment info', '<p>Add ' + esc(v.name) + '\'s bank details so you can pay bills online by ACH bank transfer.</p><div class="qbe-mform">' +
      UI.field('Routing number', UI.input('routing', '', ' inputmode="numeric" autocomplete="off" placeholder="9 digits"')) +
      UI.field('Account number', UI.input('account', '', ' inputmode="numeric" autocomplete="off"')) +
      UI.field('Account type', UI.select('atype', ['Checking', 'Savings'], 'Checking')) +
      '<p class="qb-muted qbe-small">Practice copy: the numbers are not stored, only that payment info was added.</p></div>', {
        buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (m) {
          var r = m.querySelector('[name=routing]').value.trim(), a = m.querySelector('[name=account]').value.trim();
          if (!r || !a) { UI.toast('Enter the routing number and account number.', 'err'); return false; }
          v.achInfo = 'Added'; S.changed('vendor'); UI.toast('Payment info added for ' + v.name + '.');
        }]]
      });
  }

  /* ═════════════ Overview ═════════════ */
  QB.view('expense-overview', function (params, el) {
    var today = U.today();
    var pills = [['upload', 'Upload multiple bills', 'qbe:upload'], ['doc', 'Create bill', 'form:Bill'], ['calendar', 'Schedule online payment', 'form:Pay Bills'], ['bank', 'Pay bills', 'form:Pay Bills'], ['card', 'Record expense', 'form:Expense']];
    var h = UI.pageHead('Expenses &amp; Pay Bills', { actions: UI.feedbackLink() });
    h += '<div class="qbe-create"><span class="qbe-create-lbl">Create actions</span>' + pills.map(function (p) {
      return '<button type="button" class="qbe-pill" data-act="' + p[2] + '">' + ic(p[0]) + '<span>' + p[1] + '</span></button>';
    }).join('') + '<button type="button" class="qbe-pill qbe-pill-more" data-act="qbe:menu:showall"><span>Show all</span>' + ic('caretDown') + '</button></div>';
    h += '<div class="qbe-glance-head"><h2>Expenses at a glance</h2>' + iconBtn('customize', 'qbe:cards', 'Customize') + iconBtn('eyeOff', 'qbe:glance', st.glanceHidden ? 'Show' : 'Hide') + '</div>';
    if (st.glanceHidden) {
      h += '<div class="qbe-hidden-note">Expenses at a glance is hidden. <button type="button" class="qb-link" data-act="qbe:glance">Show</button></div>';
      el.innerHTML = h; return;
    }
    /* BILLS FUNNEL (last 30 days) */
    if (!st.hideCards.funnel) {
      var since = U.addDays(today, -30);
      var unpaid = S.find(function (t) { return t.type === 'Bill' && L.openBalance(t) > 0.004 && t.due >= since; });
      var over = unpaid.filter(isOverdue).length;
      var paid = S.find(function (t) { return t.type === 'Bill' && t.total > 0 && L.openBalance(t) <= 0.004 && lastPayDate(t) >= since; });
      var step = function (color, title, body, act) {
        return '<div class="qbe-fstep' + (act ? ' is-click' : '') + '"' + (act ? ' data-act="' + act + '"' : '') + '><div class="qbe-fbar" style="background:' + color + '"></div><div class="qbe-ftitle">' + title + '</div>' + body + '</div>';
      };
      var chev = '<div class="qbe-fchev">' + ic('caretRight') + '</div>';
      h += '<section class="qbe-card"><div class="qbe-card-head"><span class="qb-card-title">Bills funnel</span><span class="qbe-card-sub">Last 30 days</span><span class="qb-grow"></span>' + iconBtn('eyeOff', 'qbe:card:funnel', 'Hide') + '</div>' +
        '<div class="qbe-funnel">' +
        step('#babec5', 'Auto-create bills', '<p class="qbe-fp">Create bills by uploading vendor invoices.</p><button type="button" class="qb-btn qb-btn-secondary qb-btn-sm" data-act="qbe:upload">Upload</button>') + chev +
        step('#0077c5', 'For review', '<div class="qbe-famt">$0.00</div><div class="qbe-fsub">' + plural(st.review.length, 'bill') + '</div>', 'go:bills?tab=review') + chev +
        step('#d4d7dc', 'Set up bill approval', '<div class="qbe-famt">--</div><button type="button" class="qb-link qbe-fsub" data-act="qbe:approval:bill">Set up</button>') + chev +
        step('#ff8000', 'Unpaid', '<div class="qbe-famt">' + U.money(sum(unpaid, L.openBalance)) + '</div>' + (over ? '<span class="qbe-ochip">' + over + ' overdue</span>' : '<div class="qbe-fsub">' + plural(unpaid.length, 'bill') + '</div>'), 'go:bills?tab=unpaid') + chev +
        step('#d4d7dc', 'Set up payment approval', '<div class="qbe-famt">--</div><button type="button" class="qb-link qbe-fsub" data-act="qbe:approval:pay">Set up</button>') + chev +
        step('#2ca01c', 'Paid', '<div class="qbe-famt">' + U.money(sum(paid, function (t) { return t.total; })) + '</div><div class="qbe-fsub">' + plural(paid.length, 'bill') + '</div>', 'go:bills?tab=paid') +
        '</div></section>';
    }
    h += '<div class="qbe-cards2">';
    /* SPEND OVER TIME (this quarter, by month, this year vs last year) */
    if (!st.hideCards.sot) {
      var q = U.range('this-quarter', today), y = +today.slice(0, 4);
      var qn = Math.floor((+today.slice(5, 7) - 1) / 3) + 1;
      var months = [0, 1, 2].map(function (i) { return U.addMonths(q[0], i); });
      var mval = function (iso, yy) {
        var s = yy + iso.slice(4, 8) + '01', e = U.iso(new Date(yy, +iso.slice(5, 7), 0));
        return sum(spendTxns([s, e]), function (t) { return t.total; });
      };
      var cur = months.map(function (m) { return mval(m, y); }), prev = months.map(function (m) { return mval(m, y - 1); });
      var qTotal = sum(spendTxns(q), function (t) { return t.total; });
      var elapsed = U.diffDays(today, q[0]);
      var lq0 = U.addMonths(q[0], -3);
      var cmpNow = sum(spendTxns([q[0], today]), function (t) { return t.total; });
      var cmpPrev = sum(spendTxns([lq0, U.addDays(lq0, elapsed)]), function (t) { return t.total; });
      h += '<section class="qbe-card"><div class="qbe-card-head"><span class="qb-card-title">Spend over time</span><span class="qbe-card-sub">This quarter</span><span class="qb-grow"></span>' + iconBtn('eyeOff', 'qbe:card:sot', 'Hide') + '</div>' +
        '<div class="qbe-kpi-lbl">Spending for Q' + qn + ' ' + y + '</div><div class="qbe-kpi">' + U.money(qTotal) + '</div>' +
        '<div class="qbe-kpi-sub">' + trend(cmpNow, cmpPrev, 'from this time last quarter') + '</div>' +
        barChart(months.map(function (m) { return U.MON[+m.slice(5, 7) - 1]; }), [prev, cur], ['#2ca01c', '#00a6a4'], [String(y - 1), String(y)]) +
        '<div class="qbe-legend"><span><i style="background:#2ca01c"></i>' + (y - 1) + '</span><span><i style="background:#00a6a4"></i>' + y + '</span></div>' +
        '<div class="qbe-card-foot"><a href="#/expenses">View expense transactions</a></div></section>';
    }
    /* SPEND INSIGHTS (donut by payee + top expenses) */
    if (!st.hideCards.insights) {
      var rk = st.spendRange, rr = U.range(rk, today);
      var mName = U.MONTHS[+rr[0].slice(5, 7) - 1];
      var title = rk === 'this-month' || rk === 'last-month' ? 'Spending for ' + mName : rk === 'this-quarter' ? 'Spending for this quarter' : 'Spending for the last 30 days';
      var txs = spendTxns(rr);
      var total = sum(txs, function (t) { return Math.abs(t.total); });
      var p0 = U.addDays(rr[0], -30), p1 = U.addDays(rr[0], -1);
      var prevTotal = sum(spendTxns([p0, p1]), function (t) { return Math.abs(t.total); });
      var by = {};
      txs.forEach(function (t) { var k = S.payeeName(t) || 'No payee'; by[k] = U.r2((by[k] || 0) + Math.abs(t.total)); });
      var slices = Object.keys(by).map(function (k) { return { label: k, value: by[k] }; }).sort(function (a, b) { return b.value - a.value; });
      if (slices.length > 5) {
        var rest = slices.slice(4);
        slices = slices.slice(0, 4).concat([{ label: 'Other', value: sum(rest, function (s) { return s.value; }) }]);
      }
      var top = txs.slice().sort(function (a, b) { return Math.abs(b.total) - Math.abs(a.total); }).slice(0, 5);
      h += '<section class="qbe-card"><div class="qbe-card-head"><span class="qb-card-title">Spend insights</span><span class="qb-grow"></span>' +
        '<span class="qbe-mini-sel">' + UI.select('qbeSpendRange', [['this-month', 'This month'], ['last-month', 'Last month'], ['last-30', 'Last 30 days'], ['this-quarter', 'This quarter']], rk, ' data-qbe="spend"') + '</span>' + iconBtn('eyeOff', 'qbe:card:insights', 'Hide') + '</div>' +
        '<div class="qbe-kpi-lbl">' + esc(title) + '</div><div class="qbe-kpi">' + U.money(total) + '</div>' +
        '<div class="qbe-kpi-sub">' + trend(total, prevTotal, 'from last 30 days') + '</div>' +
        '<div class="qbe-donut-row">' + donut(slices) + '<ul class="qbe-dlegend">' + (slices.length ? slices.map(function (s, i) {
          return '<li><i style="background:' + COLORS[i % COLORS.length] + '"></i><span class="qbe-dl-name">' + esc(s.label) + '</span><b>' + U.money(s.value) + '</b></li>';
        }).join('') : '<li class="qb-muted">No spending in this period.</li>') + '</ul></div>' +
        '<div class="qbe-top"><div class="qbe-top-head"><span>Top expenses</span><span>Amount</span></div>' + (top.length ? top.map(function (t) {
          return '<button type="button" class="qbe-top-row" data-act="txn:' + t.id + '"><span>' + esc(S.payeeName(t) || 'No payee') + '<em>' + esc(t.type) + ' · ' + U.fmtDate(t.date) + '</em></span><b>' + U.num(t.total) + '</b></button>';
        }).join('') : '<div class="qb-muted qbe-top-none">Nothing to show yet.</div>') + '</div></section>';
    }
    h += '</div>';
    el.innerHTML = h;
    el.addEventListener('change', function (e) {
      if (e.target.matches('[data-qbe="spend"]')) { st.spendRange = e.target.value; rerender(); }
    });
  });

  function niceStep(v) {
    if (v <= 0) return 250;
    var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function barChart(labels, series, colors, names) {
    var W = 440, H = 220, pl = 52, pr = 8, pt = 12, pb = 28, ch = H - pt - pb;
    var max = 0; series.forEach(function (s) { s.forEach(function (v) { if (v > max) max = v; }); });
    var step = niceStep(max / 4), topV = step * 4;
    var svg = '<svg class="qbe-bars" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Spending by month">';
    for (var i = 0; i <= 4; i++) {
      var y = pt + ch * (1 - i / 4);
      svg += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" stroke="#e3e5e8"/><text x="' + (pl - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + kfmt(step * i) + '</text>';
    }
    var gw = (W - pl - pr) / labels.length, ns = series.length, bw = Math.min(34, gw / (ns + 1.6)), gap = 6;
    labels.forEach(function (lab, li) {
      var x0 = pl + gw * li + (gw - (bw * ns + gap * (ns - 1))) / 2;
      series.forEach(function (s, si) {
        var v = Math.max(0, s[li]), hh = topV ? v / topV * ch : 0, x = x0 + si * (bw + gap);
        svg += '<rect x="' + x.toFixed(1) + '" y="' + (pt + ch - hh).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(hh, v ? 1 : 0).toFixed(1) + '" rx="2" fill="' + colors[si] + '"><title>' + esc(lab + ' ' + names[si] + ': ' + U.money(s[li])) + '</title></rect>';
      });
      svg += '<text x="' + (pl + gw * li + gw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(lab) + '</text>';
    });
    return svg + '</svg>';
  }
  function donut(slices) {
    var R = 58, C = 2 * Math.PI * R, total = sum(slices, function (s) { return s.value; }), off = 0;
    var svg = '<svg class="qbe-donut" viewBox="0 0 160 160" role="img" aria-label="Spending by payee"><circle cx="80" cy="80" r="' + R + '" fill="none" stroke="#eceef1" stroke-width="24"/>';
    if (total > 0) slices.forEach(function (s, i) {
      var len = s.value / total * C;
      svg += '<circle cx="80" cy="80" r="' + R + '" fill="none" stroke="' + COLORS[i % COLORS.length] + '" stroke-width="24" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 80 80)"><title>' + esc(s.label + ': ' + U.money(s.value)) + '</title></circle>';
      off += len;
    });
    return svg + '</svg>';
  }

  /* ═════════════ Expense transactions ═════════════ */
  var EXP_TYPES = [['all', 'All transactions'], ['expenses', 'Expenses'], ['bills', 'Bills'], ['openbills', 'Open bills'], ['overdue', 'Overdue bills'], ['billpay', 'Bill payments'],
    ['checks', 'Checks'], ['po', 'Purchase orders'], ['recent', 'Recently paid'], ['vcredit', 'Vendor credits'], ['cccredit', 'Credit card credits'], ['ccpay', 'Credit card payments'], ['tax', 'Sales tax payments']];
  function typeMatch(t, k) {
    switch (k) {
      case 'expenses': return ['Expense', 'Cash Expense', 'Credit Card Expense'].indexOf(t.type) >= 0;
      case 'bills': return t.type === 'Bill';
      case 'openbills': return t.type === 'Bill' && L.openBalance(t) > 0.004;
      case 'overdue': return isOverdue(t);
      case 'billpay': return isBP(t);
      case 'checks': return t.type === 'Check';
      case 'po': return t.type === 'Purchase Order';
      case 'recent': return (PAIDT.indexOf(t.type) >= 0 || (t.type === 'Bill' && t.total > 0 && L.openBalance(t) <= 0.004)) && t.date >= U.addDays(U.today(), -30);
      case 'vcredit': return t.type === 'Vendor Credit';
      case 'cccredit': return t.type === 'Credit Card Credit';
      case 'ccpay': return t.type === 'Credit Card Payment';
      case 'tax': return t.type === 'Sales Tax Payment';
      default: return true;
    }
  }
  function statusMatch(t, s) {
    if (!s) return true;
    var bill = t.type === 'Bill', po = t.type === 'Purchase Order';
    if (s === 'open') return (bill && L.openBalance(t) > 0.004) || (po && (t.status || 'Open') !== 'Closed');
    if (s === 'overdue') return isOverdue(t);
    if (s === 'paid') return (bill && L.openBalance(t) <= 0.004) || PAIDT.indexOf(t.type) >= 0;
    if (s === 'closed') return po && t.status === 'Closed';
    return true;
  }
  function expDateRange() {
    var f = st.exp;
    if (f.date === 'custom') return [f.from || '1900-01-01', f.to || '2999-12-31'];
    return U.range(f.date);
  }
  function expRows() {
    var f = st.exp, r = expDateRange();
    return S.find(function (t) {
      if (LIST_TYPES.indexOf(t.type) < 0) return false;
      if (!inR(t.date, r)) return false;
      if (!typeMatch(t, f.type) || !statusMatch(t, f.status)) return false;
      if (f.payee && t.payee !== f.payee) return false;
      if (f.cat && !(t.lines || []).some(function (l) { return l.acct === f.cat; })) return false;
      if (f.delivery === 'print' && !t.printLater) return false;
      if (f.delivery === 'send' && !t.sendLater) return false;
      return true;
    }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.created - a.created; }).map(function (t) {
      return { id: t.id, date: t.date, type: t.type, no: t.no || '', payee: S.payeeName(t), cat: catText(t), total: signed(t), memo: t.memo || '', t: t };
    });
  }
  function applyExpFilter(pop) {
    if (!pop) return;
    var g = function (n) { var x = pop.querySelector('[name=' + n + ']'); return x ? x.value : ''; };
    st.exp.status = g('qbeFStatus'); st.exp.delivery = g('qbeFDel'); st.exp.payee = g('qbeFPayee'); st.exp.cat = g('qbeFCat');
    st.exp.date = g('qbeFDate') || 'all';
    if (st.exp.date === 'custom') {
      st.exp.from = U.parseDate(g('qbeFFrom')); st.exp.to = U.parseDate(g('qbeFTo'));
      if (!st.exp.from && !st.exp.to) st.exp.date = 'all';
    }
    st.expPop = false; rerender();
  }
  function exportExpenses() {
    var rows = expRows();
    download('ExpenseTransactions.csv', csv([['Date', 'Type', 'No.', 'Payee', 'Category', 'Memo', 'Total']].concat(rows.map(function (r) { return [U.fmtDate(r.date), r.type, r.no, r.payee, r.cat, r.memo, U.r2(r.total).toFixed(2)]; }))));
  }

  QB.view('expenses', function (params, el) {
    var f = st.exp;
    if (params.type && EXP_TYPES.some(function (x) { return x[0] === params.type; }) && st._lastTypeParam !== params.type) { f.type = params.type; st._lastTypeParam = params.type; }
    var rows = expRows();
    var actions = UI.btn('Purchase notifications', { kind: 'tertiary', act: 'qbe:purchnotif' }) +
      UI.split('Print Checks', [['Print checks', 'form:Print Checks'], ['Order checks', 'info:checks']], { kind: 'secondary', act: 'form:Print Checks' }) +
      UI.split('New transaction', MENUS.newtxn, { kind: 'primary', act: 'qbe:menu:newtxn' });
    var h = UI.pageHead('Expense transactions', { actions: actions });
    /* chips */
    var chips = [];
    if (f.date !== 'all') chips.push(UI.chip('Dates: ' + (f.date === 'custom' ? (U.fmtDate(f.from) || '...') + ' - ' + (U.fmtDate(f.to) || '...') : rangeLabel(f.date)), 'qbe:exchip:date'));
    if (f.status) chips.push(UI.chip('Status: ' + { open: 'Open', overdue: 'Overdue', paid: 'Paid', closed: 'Closed' }[f.status], 'qbe:exchip:status'));
    if (f.delivery) chips.push(UI.chip('Delivery method: ' + (f.delivery === 'print' ? 'Print later' : 'Send later'), 'qbe:exchip:delivery'));
    if (f.payee) chips.push(UI.chip('Payee: ' + (S.vend[f.payee] ? S.vend[f.payee].name : ''), 'qbe:exchip:payee'));
    if (f.cat) chips.push(UI.chip('Category: ' + S.fullName(f.cat), 'qbe:exchip:cat'));
    h += '<div class="qbe-bar">' +
      '<button type="button" class="qb-btn qb-btn-tertiary qbe-batch" data-act="qbe:menu:batch"><span>Batch actions</span>' + ic('caretDown') + '</button>' +
      '<span class="qbe-type">' + UI.select('qbeType', EXP_TYPES, f.type, ' data-qbe="type" aria-label="Type"') + '</span>' +
      '<span class="qbe-pop-wrap"><button type="button" class="qbe-filter-btn' + (st.expPop ? ' on' : '') + '" data-act="qbe:exfilter">' + ic('filter') + '<span>Filter</span></button>' + (st.expPop ? expFilterPop() : '') + '</span>' +
      chips.join('') + '<span class="qb-grow"></span>' +
      iconBtn('export', 'qbe:exexport', 'Export to Excel') + iconBtn('print', 'qbe:printpage', 'Print list') +
      '<span class="qbe-pop-wrap">' + iconBtn('gear', 'qbe:exgear', 'Settings') + (st.expGear ? expGearPop() : '') + '</span></div>';
    h += '<div class="qbe-tbl"></div>';
    el.innerHTML = h;

    /* Inline category select per row; the options string is built once. */
    var catOpts = selectOpts(catOptionsList(), null);
    function catCell(r) {
      if (!catEditable(r.t)) return esc(r.cat);
      var a = r.t.lines[0].acct || 'a_uncE';
      var o = catOpts.indexOf('value="' + a + '"') >= 0 ? catOpts.replace('value="' + a + '"', 'value="' + a + '" selected') : '<option value="' + esc(a) + '" selected>' + esc(S.fullName(a)) + '</option>' + catOpts;
      return '<span class="qb-select qb-cat-sel"><select data-qbe-cat="' + r.id + '" aria-label="Category">' + o + '</select>' + ic('caretDown', 'qb-select-caret') + '</span>';
    }
    var c = st.expCols;
    var cols = [
      { key: 'date', label: 'Date', render: function (r) { return U.fmtDate(r.date); } },
      { key: 'type', label: 'Type' }
    ];
    if (c.no) cols.push({ key: 'no', label: 'No.' });
    if (c.payee) cols.push({ key: 'payee', label: 'Payee' });
    if (c.cat) cols.push({ key: 'cat', label: 'Category', render: catCell, cls: 'qbe-col-cat' });
    if (c.memo) cols.push({ key: 'memo', label: 'Memo', cls: 'qbe-col-memo' });
    cols.push({ key: 'total', label: 'Total', align: 'right', render: function (r) { return U.num(r.total); } });
    cols.push({ key: 'act', label: 'Action', align: 'right', sort: false, render: function (r) { return txnMenu(r.t); } });
    curTable = tbl(el.querySelector('.qbe-tbl'), 'expenses', cols, rows, { check: true, rowAct: function (r) { return 'txn:' + r.id; }, sortKey: 'date', sortDir: 'desc', pageSize: st.expPage || 50, pager: true, empty: 'No transactions match these filters.' });

    el.addEventListener('change', function (e) {
      var t = e.target;
      if (t.matches('[data-qbe="type"]')) { st.exp.type = t.value; return rerender(); }
      if (t.matches('[data-qbe-cat]')) {
        var tx = S.txn[t.dataset.qbeCat]; if (!tx || !tx.lines[0]) return;
        tx.lines[0].acct = t.value;
        keep(function () { S.update(tx); });
        UI.toast('Category updated to ' + S.fullName(t.value) + '.');
        return;
      }
      if (t.matches('[name=qbeFDate]')) { U.$$('.qbe-pop [name=qbeFFrom], .qbe-pop [name=qbeFTo]', el).forEach(function (i) { i.disabled = t.value !== 'custom'; }); return; }
      if (t.matches('[data-qbe-col]')) { st.expCols[t.dataset.qbeCol] = t.checked; return rerender(); }
      if (t.matches('[data-qbe="page"]')) { st.expPage = +t.value; return rerender(); }
    });
  });
  function expFilterPop() {
    var f = st.exp;
    var dates = [['all', 'All dates']].concat(U.RANGES.filter(function (r) { return r[0] !== 'all'; })).concat([['custom', 'Custom dates']]);
    return '<div class="qbe-pop" role="dialog" aria-label="Filter"><div class="qbe-pop-head"><b>Filter</b><button type="button" class="qb-x" data-act="qbe:exfclose" aria-label="Close">' + ic('close') + '</button></div><div class="qbe-pop-grid">' +
      UI.field('Status', UI.select('qbeFStatus', [['', 'All statuses'], ['open', 'Open'], ['overdue', 'Overdue'], ['paid', 'Paid'], ['closed', 'Closed']], f.status)) +
      UI.field('Delivery method', UI.select('qbeFDel', [['', 'Any'], ['print', 'Print later'], ['send', 'Send later']], f.delivery)) +
      UI.field('Payee', UI.select('qbeFPayee', payeeOptions(), f.payee)) +
      UI.field('Category', UI.select('qbeFCat', [['', 'All']].concat(catOptionsList()), f.cat)) +
      UI.field('Date', UI.select('qbeFDate', dates, f.date)) +
      '<div class="qbe-pop-dates">' + UI.field('From', UI.dateInput('qbeFFrom', f.from, f.date === 'custom' ? '' : ' disabled')) + UI.field('To', UI.dateInput('qbeFTo', f.to, f.date === 'custom' ? '' : ' disabled')) + '</div>' +
      '</div><div class="qbe-pop-foot"><button type="button" class="qb-btn qb-btn-tertiary" data-act="qbe:exfreset">Reset</button><button type="button" class="qb-btn qb-btn-primary" data-act="qbe:exfapply">Apply</button></div></div>';
  }
  function expGearPop() {
    var c = st.expCols;
    var box = function (k, label) { return '<label class="qbe-chk"><input type="checkbox" data-qbe-col="' + k + '"' + (c[k] ? ' checked' : '') + '><span>' + label + '</span></label>'; };
    return '<div class="qbe-pop qbe-pop-r qbe-pop-sm"><div class="qbe-pop-head"><b>Columns</b><button type="button" class="qb-x" data-act="qbe:exgear" aria-label="Close">' + ic('close') + '</button></div>' +
      box('no', 'No.') + box('payee', 'Payee') + box('cat', 'Category') + box('memo', 'Memo') +
      '<div class="qbe-pop-sub">Rows</div>' + UI.select('qbeRows', [['50', '50'], ['75', '75'], ['100', '100'], ['300', '300']], String(st.expPage || 50), ' data-qbe="page"') + '</div>';
  }

  /* ═════════════ Vendors ═════════════ */
  function vendorStats() {
    var since365 = U.addDays(U.today(), -365), since30 = U.addDays(U.today(), -30);
    var pos = S.find(function (t) { return t.type === 'Purchase Order' && (t.status || 'Open') !== 'Closed' && t.date >= since365; });
    var bills = S.find(function (t) { return t.type === 'Bill' && L.openBalance(t) > 0.004 && t.date >= since365; });
    var over = bills.filter(isOverdue);
    var paid = S.find(function (t) { return PAIDT.indexOf(t.type) >= 0 && t.payee && t.date >= since30 && !t.voided; });
    return { pos: pos, bills: bills, over: over, paid: paid };
  }
  QB.view('vendors', function (params, el) {
    var s = vendorStats();
    var actions = UI.feedbackLink() +
      UI.split('Pay vendors', [['Pay bills', 'form:Pay Bills'], ['Write checks', 'form:Check'], ['Schedule online payments', 'form:Pay Bills'], ['Pay down credit card', 'form:Credit Card Payment']], { kind: 'secondary', act: 'form:Pay Bills' }) +
      UI.split('New vendor', [['Import vendors', 'toast:Import vendors from a CSV or Excel file in the real product.'], ['Add contractor', 'new:contractor']], { kind: 'primary', act: 'new:vendor' });
    var h = UI.pageHead('Vendors', { actions: actions });
    var poAmt = sum(s.pos, function (t) { return t.total; }), billAmt = sum(s.bills, L.openBalance), overAmt = sum(s.over, L.openBalance), paidAmt = sum(s.paid, function (t) { return Math.abs(t.total); });
    h += '<div class="qbe-vbar">' + UI.moneyBar([
      { title: 'Unbilled Last 365 Days', flex: 1, segs: [{ amount: U.money(poAmt), label: plural(s.pos.length, 'purchase order'), color: '#0077c5', act: 'qbe:vseg:po' }] },
      { title: 'Unpaid Last 365 Days', flex: 2, segs: [{ amount: U.money(overAmt), label: s.over.length + ' overdue', color: '#ff8000', act: 'qbe:vseg:overdue' }, { amount: U.money(billAmt), label: plural(s.bills.length, 'open bill'), color: '#8d9096', act: 'qbe:vseg:open' }] },
      { title: 'Paid', flex: 1, segs: [{ amount: U.money(paidAmt), label: s.paid.length + ' paid last 30 days', color: '#2ca01c', act: 'qbe:vseg:paid' }] }
    ], 'is-filled') + '</div>';
    var segName = { po: 'Purchase orders', overdue: 'Overdue', open: 'Open bills', paid: 'Paid last 30 days' }[st.vseg];
    h += '<div class="qbe-bar">' +
      '<button type="button" class="qb-btn qb-btn-tertiary qbe-batch" data-act="qbe:menu:vbatch"><span>Batch actions</span>' + ic('caretDown') + '</button>' +
      '<span class="qb-search-box qbe-search">' + '<input class="qb-input" data-qbe="vq" placeholder="Search" value="' + esc(st.vq) + '" aria-label="Search vendors">' + ic('search') + '</span>' +
      (segName ? UI.chip('Showing: ' + segName, 'qbe:vseg:' + st.vseg) : '') +
      '<span class="qb-grow"></span>' + iconBtn('print', 'qbe:printpage', 'Print list') + iconBtn('export', 'qbe:vexport', 'Export to Excel') +
      '<button type="button" class="qb-icon-btn" data-menu=\'' + esc(JSON.stringify([[st.vInactive ? 'Hide inactive vendors' : 'Include inactive vendors', 'qbe:vinactive']])) + '\' aria-label="Settings" title="Settings">' + ic('gear') + '</button></div>';
    h += '<div class="qbe-tbl"></div>';
    el.innerHTML = h;
    /* Mark the active money bar segment. */
    if (st.vseg) U.$$('.qbe-vbar .qb-mbar-seg', el).forEach(function (seg) { seg.classList.toggle('qbe-seg-on', seg.dataset.act === 'qbe:vseg:' + st.vseg); seg.classList.toggle('qbe-seg-off', seg.dataset.act !== 'qbe:vseg:' + st.vseg); });

    var segSet = null;
    if (st.vseg) {
      segSet = {};
      var src = st.vseg === 'po' ? s.pos : st.vseg === 'overdue' ? s.over : st.vseg === 'open' ? s.bills : s.paid;
      src.forEach(function (t) { segSet[t.payee] = true; });
    }
    var host = el.querySelector('.qbe-tbl');
    var cols = [
      { key: 'name', label: 'Vendor', render: function (r) { return '<a class="qb-name-link" href="#/vendordetail?id=' + r.id + '">' + esc(r.name) + '</a>' + (r.v.active === false ? ' <span class="qb-muted">(deleted)</span>' : ''); } },
      { key: 'company', label: 'Company name' },
      { key: 'phone', label: 'Phone', render: function (r) { return esc(r.phone); } },
      { key: 'email', label: 'Email', render: function (r) { return r.email ? '<span class="qbe-mail"><button type="button" class="qbe-mail-ic" data-act="qbe:vmail:' + r.id + '" aria-label="Send email">' + ic('mail') + '</button><span>' + esc(r.email) + '</span></span>' : ''; } },
      { key: 'track', label: '1099 tracking', align: 'center', render: function (r) { return r.v.track1099 ? '<span class="qbe-1099">' + ic('check') + '</span>' : ''; } },
      { key: 'bal', label: 'Open balance', align: 'right', render: function (r) { return U.num(r.bal); } },
      { key: 'ach', label: 'Bill Pay ACH info', render: function (r) { return r.v.achInfo ? '<span class="qbe-ach-ok">' + ic('checkCircle') + 'Added</span>' : '<span class="qbe-ach"><span class="qbe-missing">Missing</span><button type="button" class="qb-link" data-act="qbe:ach:' + r.id + '">Add payment info</button></span>'; } },
      { key: 'act', label: 'Action', align: 'right', sort: false, render: function (r) { return r.bal > 0.004 ? actLinks('Pay balance', 'qbe:paybal:' + r.id, vendMenu(r.id)) : actLinks('Create bill', 'qbe:vbill:' + r.id, vendMenu(r.id)); } }
    ];
    function draw() {
      var q = st.vq.trim().toLowerCase();
      var rows = S.vendors.filter(function (v) {
        if (v.active === false && !st.vInactive) return false;
        if (segSet && !segSet[v.id]) return false;
        if (q && (v.name + ' ' + (v.company || '') + ' ' + (v.phone || '') + ' ' + (v.email || '')).toLowerCase().indexOf(q) < 0) return false;
        return true;
      }).map(function (v) { return { id: v.id, name: v.name, company: v.company || '', phone: v.phone || '', email: v.email || '', track: v.track1099 ? 1 : 0, bal: L.vendBalance(v.id), ach: v.achInfo ? 1 : 0, v: v }; });
      curTable = tbl(host, 'vendors', cols, rows, { check: true, sortKey: 'name', sortDir: 'asc', pageSize: 50, pager: true, empty: 'No vendors match.' });
    }
    draw();
    var inp = el.querySelector('[data-qbe="vq"]');
    inp.addEventListener('input', function () { st.vq = inp.value; if (st.ts.vendors) st.ts.vendors.page = 0; draw(); });
  });
  function exportVendors() {
    download('Vendors.csv', csv([['Vendor', 'Company name', 'Phone', 'Email', '1099 tracking', 'Open balance']].concat(S.vendors.filter(function (v) { return v.active !== false; }).map(function (v) {
      return [v.name, v.company, v.phone, v.email, v.track1099 ? 'Yes' : 'No', L.vendBalance(v.id).toFixed(2)];
    }))));
  }

  /* ═════════════ Vendor detail ═════════════ */
  var VD_TYPES = [['all', 'All transactions'], ['bills', 'Bills'], ['openbills', 'Open bills'], ['billpay', 'Bill payments'], ['expenses', 'Expenses'], ['checks', 'Checks'], ['po', 'Purchase orders'], ['vcredit', 'Vendor credits']];
  function vdStatus(t) {
    if (t.voided) return { text: 'Voided', tone: 'closed' };
    if (t.type === 'Bill') return L.status(t);
    if (isBP(t)) return L.openBalance(t) < -0.004 ? { text: 'Partially applied', tone: 'open' } : { text: 'Closed', tone: 'closed' };
    if (t.type === 'Purchase Order') return L.status(t);
    if (t.type === 'Vendor Credit') return L.openBalance(t) < -0.004 ? { text: 'Unapplied', tone: 'open' } : { text: 'Applied', tone: 'closed' };
    return { text: 'Paid', tone: 'paid' };
  }
  function vdAction(t) {
    if (t.type === 'Bill' && L.openBalance(t) > 0.004) return actLinks('Make payment', 'qbe:paybill:' + t.id, [['Mark as paid', 'qbe:markpaid:' + t.id], ['View/Edit', 'txn:' + t.id], ['Copy', 'qbe:copy:' + t.id], ['Delete', 'qbe:del:' + t.id]]);
    if (t.type === 'Purchase Order' && (t.status || 'Open') !== 'Closed') return actLinks('Copy to bill', 'qbe:po2bill:' + t.id, [['Send', 'qbe:sendpo:' + t.id], ['Print', 'qbe:print:' + t.id], ['Close purchase order', 'qbe:closepo:' + t.id], ['View/Edit', 'txn:' + t.id]]);
    return txnMenu(t);
  }
  QB.view('vendordetail', function (params, el) {
    var v = S.vend[params.id];
    if (!v) { el.innerHTML = '<a class="qbe-back" href="#/vendors">' + ic('caretLeft') + 'Vendors</a><div class="qb-empty-page"><h1>Vendor not found</h1><p>This vendor may have been removed.</p></div>'; return; }
    var tab = params.tab || 'list', id = v.id;
    var bal = L.vendBalance(id), overdue = sum(openBills(id).filter(isOverdue), L.openBalance);
    var addr = [v.street, [v.city, [v.state, v.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(', ');
    /* left list */
    var list = S.vendors.filter(function (x) { return x.active !== false || x.id === id; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var h = '<div class="qbe-vd"><aside class="qbe-vd-list"><div class="qbe-vd-lhead"><button type="button" class="qb-icon-btn" data-act="new:vendor" aria-label="New vendor" title="New vendor">' + ic('plus') + '</button><span class="qb-grow"></span><span class="qb-muted qbe-small">' + list.length + ' vendors</span></div>' +
      '<div class="qb-search-box qbe-vd-search"><input class="qb-input" data-qbe="vdq" placeholder="Search by name or details" value="' + esc(st.vdq) + '">' + ic('search') + '</div>' +
      '<div class="qbe-vd-items">' + list.map(function (x) {
        return '<a class="qbe-vd-item' + (x.id === id ? ' on' : '') + '" href="#/vendordetail?id=' + x.id + '" data-hay="' + esc((x.name + ' ' + (x.company || '') + ' ' + (x.email || '') + ' ' + (x.phone || '')).toLowerCase()) + '"><span>' + esc(x.name) + '</span><b>' + U.money(L.vendBalance(x.id)) + '</b></a>';
      }).join('') + '</div></aside><div class="qbe-vd-main">';
    h += '<a class="qbe-back" href="#/vendors">' + ic('caretLeft') + 'Vendors</a>';
    h += '<div class="qbe-vd-titlerow"><h1>' + esc(v.name) + '</h1>' +
      '<button type="button" class="qb-icon-btn" data-act="qbe:vmail:' + id + '" aria-label="Email" title="' + esc(v.email || 'No email') + '">' + ic('mail') + '</button>' +
      '<button type="button" class="qb-icon-btn" data-act="qbe:vphone:' + id + '" aria-label="Phone" title="' + esc(v.phone || 'No phone') + '">' + ic('phone') + '</button>' +
      (v.active === false ? '<span class="qbe-tag">Inactive</span>' : '') + '<span class="qb-grow"></span>' + UI.feedbackLink() +
      UI.split('Edit', [[v.active === false ? 'Make active' : 'Make inactive', 'qbe:vinact:' + id], ['Add payment info', 'qbe:ach:' + id]], { kind: 'secondary', act: 'qbe:vedit:' + id }) +
      UI.split('New transaction', [['Bill', 'qbe:vform:Bill:' + id], ['Expense', 'qbe:vform:Expense:' + id], ['Check', 'qbe:vform:Check:' + id], ['Purchase order', 'qbe:vform:Purchase Order:' + id], ['Vendor credit', 'qbe:vform:Vendor Credit:' + id], ['Bill payment', 'qbe:paybal:' + id]], { kind: 'primary', act: 'qbe:vnew:' + id }) + '</div>';
    h += '<div class="qbe-vd-cards"><div class="qbe-card qbe-vd-info">' +
      '<div class="qbe-kv"><span>Company</span><b>' + esc(v.company || '') + '</b></div>' +
      '<div class="qbe-kv"><span>Billing address</span><b>' + esc(addr) + '</b></div>' +
      '<div class="qbe-kv"><span>Email</span><b>' + (v.email ? '<a href="#" data-act="qbe:vmail:' + id + '">' + esc(v.email) + '</a>' : '') + '</b></div>' +
      '<div class="qbe-kv"><span>Phone</span><b>' + esc(v.phone || '') + '</b></div>' +
      '<div class="qbe-kv"><span>Notes</span><b>' + (v.notes ? esc(v.notes) + ' <button type="button" class="qb-link" data-act="qbe:vnotes:' + id + '">Edit</button>' : '<button type="button" class="qb-link" data-act="qbe:vnotes:' + id + '">Add notes</button>') + '</b></div>' +
      '</div><div class="qbe-card qbe-vd-sum"><div class="qb-card-title">Summary</div>' +
      '<div class="qbe-sum-row"><i style="background:#ffc400"></i><div><div class="qbe-sum-amt">' + U.money(bal) + '</div><div class="qbe-sum-lbl">Open balance</div></div></div>' +
      '<div class="qbe-sum-row"><i style="background:#d52b1e"></i><div><div class="qbe-sum-amt">' + U.money(overdue) + '</div><div class="qbe-sum-lbl">Overdue payment</div></div></div></div></div>';
    var tabs = [['list', 'Transaction List'], ['details', 'Vendor Details'], ['notes', 'Notes'], ['docs', 'Documents']];
    h += '<div class="qb-tabs">' + tabs.map(function (t) { return '<button type="button" class="' + (tab === t[0] ? 'on' : '') + '" data-act="go:vendordetail?id=' + id + '&tab=' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="qbe-vd-body"></div></div></div>';
    el.innerHTML = h;
    var body = el.querySelector('.qbe-vd-body');

    if (tab === 'list') {
      var dates = [['all', 'All dates']].concat(U.RANGES.filter(function (r) { return r[0] !== 'all'; }));
      body.innerHTML = '<div class="qbe-bar">' +
        '<button type="button" class="qb-btn qb-btn-tertiary qbe-batch" data-act="qbe:menu:batch"><span>Batch actions</span>' + ic('caretDown') + '</button>' +
        UI.field('Type', UI.select('qbeVdType', VD_TYPES, st.vdType, ' data-qbe="vdtype"')) + UI.field('Date', UI.select('qbeVdDate', dates, st.vdDate, ' data-qbe="vddate"')) +
        '<span class="qb-grow"></span>' + iconBtn('print', 'qbe:printpage', 'Print') + '</div><div class="qbe-tbl"></div>';
      var r = U.range(st.vdDate);
      var rows = S.find(function (t) { return t.payee === id && LIST_TYPES.indexOf(t.type) >= 0 && inR(t.date, r) && typeMatch(t, st.vdType); })
        .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.created - a.created; })
        .map(function (t) { return { id: t.id, date: t.date, type: t.type, no: t.no || '', payee: S.payeeName(t), cat: catText(t), total: signed(t), status: vdStatus(t).text, t: t }; });
      curTable = tbl(body.querySelector('.qbe-tbl'), 'vd-' + id, [
        { key: 'date', label: 'Date', render: function (x) { return U.fmtDate(x.date); } },
        { key: 'type', label: 'Type' }, { key: 'no', label: 'No.' }, { key: 'payee', label: 'Payee' },
        { key: 'cat', label: 'Category' },
        { key: 'total', label: 'Total', align: 'right', render: function (x) { return U.num(x.total); } },
        { key: 'status', label: 'Status', render: function (x) { return UI.statusHtml(vdStatus(x.t)); } },
        { key: 'act', label: 'Action', align: 'right', sort: false, render: function (x) { return vdAction(x.t); } }
      ], rows, { check: true, rowAct: function (x) { return 'txn:' + x.id; }, sortKey: 'date', sortDir: 'desc', pageSize: 50, pager: true, empty: 'There are no transactions for this vendor in this view.' });
    } else if (tab === 'details') {
      var kv = [['Vendor', v.name], ['Company', v.company], ['Display name', v.name], ['Email', v.email], ['Phone', v.phone], ['Billing address', addr], ['Terms', v.terms || 'Net 30'],
        ['Track payments for 1099', v.track1099 ? 'Yes' : 'No'], ['Business ID No.', st.taxIds[id] ? 'On file' : ''], ['Bill Pay ACH info', v.achInfo || 'Missing'], ['Notes', v.notes]];
      body.innerHTML = '<div class="qbe-card qbe-details"><div class="qbe-details-head"><b>Vendor details</b><button type="button" class="qb-btn qb-btn-tertiary qb-btn-sm" data-act="qbe:vedit:' + id + '">' + ic('pencil') + '<span>Edit</span></button></div>' +
        '<div class="qbe-details-grid">' + kv.map(function (k) { return '<div class="qbe-dt">' + k[0] + '</div><div class="qbe-dd">' + (k[1] ? esc(k[1]) : '<span class="qb-muted">—</span>') + '</div>'; }).join('') + '</div></div>';
    } else if (tab === 'notes') {
      body.innerHTML = '<div class="qbe-card qbe-notes"><label class="qb-label" for="qbeNotes">Notes</label><textarea id="qbeNotes" class="qb-input qbe-notes-ta" rows="8" placeholder="Add notes about this vendor">' + esc(v.notes || '') + '</textarea>' +
        '<div class="qbe-notes-foot"><button type="button" class="qb-btn qb-btn-primary" data-act="qbe:vsavenotes:' + id + '">Save</button></div></div>';
    } else {
      var docs = st.vendDocs[id] || [];
      body.innerHTML = '<div class="qbe-drop" data-act="qbe:vdupload:' + id + '">' + ic('upload') + '<div><b>Drag and drop files here or select files</b><div class="qb-muted qbe-small">Supported formats: PDF, PNG, JPEG, HEIC.</div></div><span class="qb-btn qb-btn-secondary qb-btn-sm">Upload</span></div>' +
        (docs.length ? '<table class="qb-table qbe-docs"><thead><tr><th>File name</th><th>Size</th><th>Uploaded</th><th></th></tr></thead><tbody>' + docs.map(function (d, i) {
          return '<tr><td>' + ic('doc') + ' ' + esc(d.name) + '</td><td>' + Math.max(1, Math.round(d.size / 1024)) + ' KB</td><td>' + U.fmtDate(d.date) + '</td><td class="ta-r"><button type="button" class="qb-link" data-act="qbe:vddoc:' + id + ':' + i + '">Remove</button></td></tr>';
        }).join('') + '</tbody></table>' : '<p class="qb-muted">No documents yet. Attach W-9s, contracts and invoices from this vendor.</p>');
    }
    el.addEventListener('change', function (e) {
      if (e.target.matches('[data-qbe="vdtype"]')) { st.vdType = e.target.value; rerender(); }
      if (e.target.matches('[data-qbe="vddate"]')) { st.vdDate = e.target.value; rerender(); }
    });
    var sq = el.querySelector('[data-qbe="vdq"]');
    function filt() { var q = sq.value.trim().toLowerCase(); st.vdq = sq.value; U.$$('.qbe-vd-item', el).forEach(function (a) { a.style.display = !q || a.dataset.hay.indexOf(q) >= 0 ? '' : 'none'; }); }
    sq.addEventListener('input', filt); if (st.vdq) filt();
  });
  /* ═════════════ Bills ═════════════ */
  function autofillAddress() { return 'sample-company-4620+expenses@assist.intuit.com'; }
  function emailSettings() {
    modalK('Manage email settings', '<p>Anyone with this address can forward bills and receipts to QuickBooks. We read each file and create a bill or expense for you to review.</p>' +
      UI.field('Forwarding address', '<input class="qb-input" readonly value="' + esc(autofillAddress()) + '">') +
      '<label class="qbe-toggle-row">' + UI.toggle('qbeAutoBills', st.autoBills !== false) + '<span>Create bills automatically from forwarded files</span></label>', {
        buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (m) { st.autoBills = m.querySelector('[name=qbeAutoBills]').checked; UI.toast('Email settings saved.'); }]]
      });
  }
  function howBills() {
    modalK('How to manage bills', '<ol class="qbe-steps-list"><li><b>Add bills</b> as they arrive: upload a file, forward it by email, or enter it with Add bill.</li><li><b>Review</b> bills QuickBooks created for you in For review.</li><li><b>Track</b> what is due in Unpaid. Overdue bills show an orange flag.</li><li><b>Pay</b> with Schedule payment, Pay bills, or Mark as paid if you paid outside QuickBooks.</li><li><b>Automate</b> repeat bills with a recurring template.</li></ol>', { buttons: [['Got it', 'primary']] });
  }
  function useRecurring(i) {
    var r = st.recBills()[i]; if (!r) return;
    var vid = vendorIdByName(r.payee);
    QB.openForm('Bill', { vendor: vid, payee: vid, amount: r.amount, memo: r.name, template: r });
  }
  QB.view('bills', function (params, el) {
    var tab = params.tab || 'unpaid', f = st.bill;
    var actions = '<button type="button" class="qb-link qbe-hlink" data-act="qbe:emailset">Manage email settings</button>' +
      UI.split('Pay bills', [['Pay bills', 'form:Pay Bills'], ['Schedule online payments', 'form:Pay Bills'], ['Write checks', 'form:Check']], { kind: 'secondary', act: 'form:Pay Bills' }) +
      UI.split('Add bill', [['Create bill', 'form:Bill'], ['Upload from computer', 'qbe:upload'], ['Create recurring bill', 'go:recurring']], { kind: 'dark', act: 'form:Bill' });
    var h = UI.pageHead('Bills', { actions: actions });
    h += '<div class="qbe-info">' + ic('info') + '<span>Anyone can autofill multiple receipts or create bills and expenses by sending files to: <b>' + esc(autofillAddress()) + '</b> <button type="button" class="qb-link" data-act="qbe:copyaddr">Copy</button></span><span class="qb-grow"></span><button type="button" class="qb-link qbe-howto" data-act="qbe:howbills">How to manage bills' + ic('caretRight') + '</button></div>';
    var tabs = [['review', 'For review'], ['unpaid', 'Unpaid'], ['paid', 'Paid'], ['recurring', 'Recurring']];
    h += '<div class="qb-tabs">' + tabs.map(function (t) { return '<button type="button" class="' + (tab === t[0] ? 'on' : '') + '" data-act="go:bills?tab=' + t[0] + '">' + t[1] + (t[0] === 'recurring' ? ' <span class="qb-badge">NEW</span>' : '') + (t[0] === 'review' && st.review.length ? ' (' + st.review.length + ')' : '') + '</button>'; }).join('') + '</div>';

    if (tab === 'review') {
      if (!st.review.length) {
        h += '<div class="qbe-empty">' + QB.art('docs') + '<h3>No bills to review</h3><p>Upload bills and receipts, or forward them to your QuickBooks email address. We pull out the details and create bills for you to review.</p><button type="button" class="qb-btn qb-btn-primary" data-act="qbe:upload">' + ic('upload') + '<span>Upload</span></button></div>';
      } else {
        h += '<div class="qbe-bar"><span class="qb-muted">' + plural(st.review.length, 'file') + ' waiting for review</span><span class="qb-grow"></span><button type="button" class="qb-btn qb-btn-secondary" data-act="qbe:upload">' + ic('upload') + '<span>Upload</span></button></div>' +
          '<div class="qb-table-wrap"><table class="qb-table"><thead><tr><th>File</th><th>Uploaded</th><th>Vendor</th><th class="ta-r">Amount</th><th class="ta-r">Action</th></tr></thead><tbody>' + st.review.map(function (r) {
            return '<tr><td>' + ic('doc') + ' ' + esc(r.name) + '</td><td>' + U.fmtDate(r.date) + '</td><td class="qb-muted">Needs review</td><td class="ta-r">$0.00</td><td class="ta-r">' + actLinks('Review', 'qbe:review:' + r.id, [['Delete', 'qbe:reviewdel:' + r.id]]) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      el.innerHTML = h; return;
    }
    if (tab === 'recurring') {
      var recs = st.recBills();
      h += '<div class="qbe-bar"><span class="qb-muted">Recurring bill templates create bills on a schedule or remind you when they are due.</span><span class="qb-grow"></span><button type="button" class="qb-btn qb-btn-secondary" data-act="go:recurring">Manage templates</button></div>' +
        '<div class="qb-table-wrap"><table class="qb-table"><thead><tr><th>Template name</th><th>Vendor</th><th>Type</th><th>Interval</th><th>Previous date</th><th>Next date</th><th class="ta-r">Amount</th><th class="ta-r">Action</th></tr></thead><tbody>' +
        (recs.length ? recs.map(function (r, i) {
          return '<tr><td>' + esc(r.name) + '</td><td>' + esc(r.payee) + '</td><td>' + esc(r.txnType) + '</td><td>' + esc(r.interval || '') + '</td><td>' + U.fmtDate(r.prev) + '</td><td>' + U.fmtDate(r.next) + '</td><td class="ta-r">' + U.num(r.amount) + '</td><td class="ta-r">' +
            actLinks('Use', 'qbe:recuse:' + i, [['Edit', 'go:recurring'], ['Skip next date', 'qbe:recskip:' + i], ['Delete', 'qbe:recdel:' + i]]) + '</td></tr>';
        }).join('') : '<tr class="qb-empty-row"><td colspan="8">No recurring bills yet.</td></tr>') + '</tbody></table></div>';
      el.innerHTML = h; return;
    }

    /* Unpaid / Paid */
    var dr = U.range(f.date), dueR = U.range(f.due);
    var vendOpts = [['', 'All']].concat(S.vendors.filter(function (v) { return S.txns.some(function (t) { return t.type === 'Bill' && t.payee === v.id; }); }).sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (v) { return [v.id, v.name]; }));
    var dateOpts = [['all', 'All dates'], ['this-month', 'This Month'], ['last-month', 'Last Month'], ['this-quarter', 'This Quarter'], ['last-quarter', 'Last Quarter'], ['this-year', 'This Year'], ['last-year', 'Last Year'], ['last-12-months', 'Last 12 Months']];
    var chips = [];
    if (f.date !== 'all') chips.push(UI.chip('Bill Date: ' + U.fmtDate(dr[0]) + '-' + U.fmtDate(dr[1]), 'qbe:billchip:date'));
    if (f.vendor) chips.push(UI.chip('Vendor: ' + vname(f.vendor), 'qbe:billchip:vendor'));
    if (f.status) chips.push(UI.chip('Status: ' + { overdue: 'Overdue', soon: 'Due soon', later: 'Due later' }[f.status], 'qbe:billchip:status'));
    if (f.due !== 'all') chips.push(UI.chip('Due date: ' + rangeLabel(f.due), 'qbe:billchip:due'));
    h += '<div class="qbe-bar qbe-bar-fields">' +
      UI.field('Vendor', UI.select('qbeBVendor', vendOpts, f.vendor, ' data-qbe="bvendor"')) +
      UI.field('Bill Date', UI.select('qbeBDate', dateOpts, f.date, ' data-qbe="bdate"')) +
      '<span class="qbe-pop-wrap"><button type="button" class="qbe-filter-btn' + (st.billPop ? ' on' : '') + '" data-act="qbe:billfilter">' + ic('filter') + '<span>Filters</span></button>' + (st.billPop && tab === 'unpaid' ? billFilterPop() : '') + '</span>' +
      '<span class="qbe-pop-wrap"><button type="button" class="qbe-filter-btn' + (st.billCust ? ' on' : '') + '" data-act="qbe:billcust">' + ic('customize') + '<span>Customize</span></button>' + (st.billCust ? billCustPop() : '') + '</span>' +
      '<span class="qb-grow"></span>' + iconBtn('print', 'qbe:printpage', 'Print') + '</div>';
    if (chips.length) h += '<div class="qbe-chips">' + chips.join('') + '</div>';
    h += '<div class="qbe-tbl"></div>';
    el.innerHTML = h;

    var paidTab = tab === 'paid';
    var bills = S.find(function (t) {
      if (t.type !== 'Bill' || !inR(t.date, dr)) return false;
      if (f.vendor && t.payee !== f.vendor) return false;
      var open = L.openBalance(t) > 0.004;
      if (paidTab ? open : !open) return false;
      if (!paidTab) {
        if (!inR(t.due || t.date, dueR)) return false;
        var tone = L.status(t);
        if (f.status === 'overdue' && tone.tone !== 'overdue') return false;
        if (f.status === 'soon' && tone.text !== 'Due soon') return false;
        if (f.status === 'later' && tone.text !== 'Due later') return false;
      }
      return true;
    });
    var rows = bills.map(function (t) {
      var pd = paidTab ? lastPayDate(t) : '';
      return { id: t.id, vendor: S.payeeName(t), due: t.due || t.date, date: t.date, no: t.no || '', cat: catText(t), amount: t.total, open: L.openBalance(t), paidOn: pd, t: t };
    });
    var bc = st.billCols, cols = [{ key: 'vendor', label: 'Vendor', render: function (r) { return '<a class="qb-name-link" href="#/vendordetail?id=' + r.t.payee + '">' + esc(r.vendor) + '</a>'; } }];
    if (bc.no) cols.push({ key: 'no', label: 'Bill no.' });
    if (bc.date || paidTab) cols.push({ key: 'date', label: 'Bill date', render: function (r) { return U.fmtDate(r.date); } });
    if (bc.cat) cols.push({ key: 'cat', label: 'Category' });
    if (paidTab) {
      cols.push({ key: 'paidOn', label: 'Payment date', render: function (r) { return U.fmtDate(r.paidOn); } });
      cols.push({ key: 'amount', label: 'Bill amount', align: 'right', render: function (r) { return U.num(r.amount); } });
      cols.push({ key: 'status', label: 'Status', sort: false, render: function () { return UI.statusHtml({ text: 'Paid', tone: 'paid' }); } });
      cols.push({ key: 'act', label: 'Action', align: 'right', sort: false, render: function (r) { return actLinks('View/Edit', 'txn:' + r.id, [['Copy', 'qbe:copy:' + r.id], ['Delete', 'qbe:del:' + r.id]]); } });
    } else {
      cols.push({ key: 'due', label: 'Due date', render: function (r) { return U.fmtDate(r.due); } });
      cols.push({ key: 'amount', label: 'Bill amount', align: 'right', render: function (r) { return U.num(r.amount); } });
      cols.push({ key: 'open', label: 'Open balance', align: 'right', render: function (r) { return U.num(r.open); } });
      cols.push({ key: 'status', label: 'Status', sort: function (r) { return r.due; }, render: function (r) { return UI.statusHtml(L.status(r.t)); } });
      cols.push({ key: 'act', label: 'Action', align: 'right', sort: false, render: function (r) { return actLinks('Schedule payment', 'qbe:paybill:' + r.id, [['Mark as paid', 'qbe:markpaid:' + r.id], ['Pay now', 'qbe:paybill:' + r.id], ['Edit', 'txn:' + r.id], ['Delete', 'qbe:del:' + r.id]]); } });
    }
    var lead = cols.length - (paidTab ? 3 : 4) + 1; /* columns before the first money column, plus the check column */
    var foot = '<tr><td colspan="' + lead + '">Total</td><td class="ta-r">' + U.num(sum(rows, function (r) { return r.amount; })) + '</td>' +
      (paidTab ? '<td></td><td></td>' : '<td class="ta-r">' + U.num(sum(rows, function (r) { return r.open; })) + '</td><td></td><td></td>') + '</tr>';
    var host = el.querySelector('.qbe-tbl');
    curTable = tbl(host, 'bills-' + tab, cols, rows, { check: true, rowAct: function (r) { return 'txn:' + r.id; }, sortKey: paidTab ? 'paidOn' : 'due', sortDir: paidTab ? 'desc' : 'asc', footer: rows.length ? foot : '', empty: paidTab ? 'No paid bills in this period.' : 'No unpaid bills. Nice work!' });
    host.insertAdjacentHTML('beforeend', '<div class="qbe-items">' + (rows.length ? '1 - ' + rows.length + ' of ' + rows.length + ' items' : '0 items') + '</div>');
    el.addEventListener('change', function (e) {
      if (e.target.matches('[data-qbe="bvendor"]')) { st.bill.vendor = e.target.value; rerender(); }
      if (e.target.matches('[data-qbe="bdate"]')) { st.bill.date = e.target.value; rerender(); }
      if (e.target.matches('[data-qbe-bcol]')) { st.billCols[e.target.dataset.qbeBcol] = e.target.checked; rerender(); }
    });
  });
  function billFilterPop() {
    var f = st.bill;
    return '<div class="qbe-pop" role="dialog" aria-label="Filters"><div class="qbe-pop-head"><b>Filters</b><button type="button" class="qb-x" data-act="qbe:billfilter" aria-label="Close">' + ic('close') + '</button></div><div class="qbe-pop-grid">' +
      UI.field('Status', UI.select('qbeBStatus', [['', 'All'], ['overdue', 'Overdue'], ['soon', 'Due soon'], ['later', 'Due later']], f.status)) +
      UI.field('Due date', UI.select('qbeBDue', [['all', 'All dates']].concat(U.RANGES.filter(function (r) { return r[0] !== 'all'; })), f.due)) +
      '</div><div class="qbe-pop-foot"><button type="button" class="qb-btn qb-btn-tertiary" data-act="qbe:billfreset">Reset</button><button type="button" class="qb-btn qb-btn-primary" data-act="qbe:billfapply">Apply</button></div></div>';
  }
  function billCustPop() {
    var c = st.billCols;
    var box = function (k, label) { return '<label class="qbe-chk"><input type="checkbox" data-qbe-bcol="' + k + '"' + (c[k] ? ' checked' : '') + '><span>' + label + '</span></label>'; };
    return '<div class="qbe-pop qbe-pop-sm"><div class="qbe-pop-head"><b>Columns</b><button type="button" class="qb-x" data-act="qbe:billcust" aria-label="Close">' + ic('close') + '</button></div>' +
      '<label class="qbe-chk is-off"><input type="checkbox" checked disabled><span>Vendor</span></label>' + box('no', 'Bill no.') + box('date', 'Bill date') + box('cat', 'Category') +
      '<label class="qbe-chk is-off"><input type="checkbox" checked disabled><span>Due date, amounts, status</span></label></div>';
  }

  /* ═════════════ Bill payments ═════════════ */
  QB.view('bill-payments', function (params, el) {
    var r = U.range(st.bpDate);
    var acctOpts = [['', 'All payment accounts']].concat(QB.lists.payFrom().map(function (a) { return [a.value, a.label]; }));
    var rows = S.find(function (t) { return isBP(t) && inR(t.date, r) && (!st.bpAcct || t.account === st.bpAcct); })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.created - a.created; })
      .map(function (t) { return { id: t.id, date: t.date, no: t.no || '', payee: S.payeeName(t), acct: S.fullName(t.account || 'a_chk'), amount: t.total, bills: (t.applied || []).length, t: t }; });
    var h = UI.pageHead('Bill payments', { actions: UI.feedbackLink() + UI.btn('Pay bills', { kind: 'primary', act: 'form:Pay Bills' }) });
    h += '<div class="qbe-bar qbe-bar-fields">' + UI.field('Date', UI.select('qbeBpDate', [['all', 'All dates']].concat(U.RANGES.filter(function (x) { return x[0] !== 'all'; })), st.bpDate, ' data-qbe="bpdate"')) +
      UI.field('Payment account', UI.select('qbeBpAcct', acctOpts, st.bpAcct, ' data-qbe="bpacct"')) + '<span class="qb-grow"></span>' + iconBtn('print', 'qbe:printpage', 'Print') + '</div><div class="qbe-tbl"></div>';
    el.innerHTML = h;
    UI.table(el.querySelector('.qbe-tbl'), [
      { key: 'date', label: 'Date', render: function (x) { return U.fmtDate(x.date); } },
      { key: 'no', label: 'No.' }, { key: 'payee', label: 'Payee' }, { key: 'acct', label: 'Payment account' },
      { key: 'amount', label: 'Amount', align: 'right', render: function (x) { return U.num(x.amount); } },
      { key: 'bills', label: 'Bills paid', render: function (x) {
        var ap = x.t.applied || [];
        if (!ap.length) return '<span class="qb-muted">Unapplied</span>';
        return ap.slice(0, 2).map(function (a) { var b = S.txn[a.id]; return '<div class="qbe-bp-bill">Bill ' + (b && b.no ? '#' + esc(b.no) + ' ' : '') + (b ? U.fmtDate(b.date) : '') + ' · ' + U.money(a.amount) + '</div>'; }).join('') + (ap.length > 2 ? '<div class="qb-muted">+' + (ap.length - 2) + ' more</div>' : '');
      } }
    ], rows, { rowAct: function (x) { return 'txn:' + x.id; }, sortKey: 'date', sortDir: 'desc', pageSize: 50, pager: true, empty: 'No bill payments in this period.',
      footer: rows.length ? '<tr><td colspan="4">Total</td><td class="ta-r">' + U.num(sum(rows, function (x) { return x.amount; })) + '</td><td></td></tr>' : '' });
    el.addEventListener('change', function (e) {
      if (e.target.matches('[data-qbe="bpdate"]')) { st.bpDate = e.target.value; rerender(); }
      if (e.target.matches('[data-qbe="bpacct"]')) { st.bpAcct = e.target.value; rerender(); }
    });
  });

  /* ═════════════ Mileage ═════════════ */
  function tripDeduction(t) { return t.purpose === 'Business' ? U.r2(t.miles * MILE_RATE) : 0; }
  function carArt() {
    return '<svg viewBox="0 0 240 170"><path d="M10 150h220" stroke="#d4d7dc" stroke-width="4" stroke-linecap="round"/><path d="M30 150c0-8 0-20 6-28l18-26c4-6 10-10 18-10h70c8 0 14 3 19 9l22 27h24c10 0 18 8 18 18v10z" fill="#2ca01c"/>' +
      '<path d="M62 100l12-16c2-3 5-4 8-4h26v20zM118 80h24c4 0 7 2 9 4l13 16h-46z" fill="#d9f2d4"/><circle cx="70" cy="150" r="17" fill="#393a3d"/><circle cx="70" cy="150" r="7" fill="#d4d7dc"/><circle cx="176" cy="150" r="17" fill="#393a3d"/><circle cx="176" cy="150" r="7" fill="#d4d7dc"/>' +
      '<path d="M150 30c0-11 9-20 20-20s20 9 20 20c0 15-20 34-20 34s-20-19-20-34z" fill="#0077c5"/><circle cx="170" cy="30" r="7" fill="#fff"/><path d="M40 40h60M40 54h40" stroke="#eceef1" stroke-width="6" stroke-linecap="round"/></svg>';
  }
  function tripModal() {
    modalK('Add trip', '<div class="qbe-mform qbe-mgrid">' +
      UI.field('Trip date', UI.dateInput('tdate', U.today())) +
      UI.field('Miles', UI.input('miles', '', ' inputmode="decimal" placeholder="0.0"')) +
      UI.field('Start location', UI.input('start', '', ' placeholder="Address or place"')) +
      UI.field('End location', UI.input('end', '', ' placeholder="Address or place"')) +
      UI.field('Trip purpose', UI.select('purpose', ['Business', 'Personal'], 'Business')) +
      UI.field('Vehicle', UI.select('vehicle', ['Truck', 'Add a vehicle later'], 'Truck')) +
      '<label class="qb-field qbe-span2"><span class="qb-label">Notes</span><textarea class="qb-input" name="notes" rows="2" placeholder="Client visit, supply run..."></textarea></label>' +
      '<p class="qb-muted qbe-small qbe-span2">Business trips are deducted at ' + (MILE_RATE * 100) + '¢ per mile.</p></div>', {
        buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (m) {
          var g = function (n) { return m.querySelector('[name=' + n + ']').value.trim(); };
          var d = U.parseDate(g('tdate')), mi = U.parseMoney(g('miles'));
          if (!d) { UI.toast('Enter the trip date as mm/dd/yyyy.', 'err'); return false; }
          if (!(mi > 0)) { UI.toast('Enter the miles for this trip.', 'err'); return false; }
          st.trips.push({ id: U.uid('trip'), date: d, miles: U.r2(mi), start: g('start'), end: g('end'), purpose: g('purpose'), vehicle: g('vehicle'), notes: g('notes') });
          st.trips.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
          UI.toast('Trip added.'); rerender();
        }]]
      });
  }
  QB.view('mileage', function (params, el) {
    var trips = st.trips;
    var h = UI.pageHead('Mileage', { actions: UI.feedbackLink() + (trips.length ? iconBtn('export', 'qbe:mileexport', 'Export') : '') + UI.btn('Add trip', { kind: 'primary', act: 'qbe:addtrip', icon: 'plus' }) });
    if (!trips.length) {
      h += UI.hero({ grey: true, title: 'Track your mileage', lead: 'Every business mile you drive could lower your tax bill.',
        body: '<ul class="qbe-ticks"><li>' + ic('check') + 'Add trips by hand, or turn on automatic tracking in the QuickBooks mobile app.</li><li>' + ic('check') + 'Sort trips into business and personal with a tap.</li><li>' + ic('check') + 'We work out your deduction at the standard rate of ' + (MILE_RATE * 100) + '¢ per mile.</li></ul>',
        actions: UI.btn('Add trip', { kind: 'primary', act: 'qbe:addtrip' }) + UI.btn('Get the mobile app', { kind: 'tertiary', act: 'info:mobile' }), art: carArt() });
      el.innerHTML = h; return;
    }
    var biz = trips.filter(function (t) { return t.purpose === 'Business'; });
    var miles = sum(trips, function (t) { return t.miles; }), bmiles = sum(biz, function (t) { return t.miles; }), ded = sum(trips, tripDeduction);
    h += '<div class="qbe-stats">' +
      '<div class="qbe-stat"><span>Business miles</span><b>' + U.num(bmiles) + '</b></div>' +
      '<div class="qbe-stat"><span>Total miles</span><b>' + U.num(miles) + '</b></div>' +
      '<div class="qbe-stat is-green"><span>Potential deduction</span><b>' + U.money(ded) + '</b></div>' +
      '<div class="qbe-stat"><span>Trips</span><b>' + trips.length + '</b></div></div>';
    h += '<div class="qbe-tbl"></div>';
    el.innerHTML = h;
    UI.table(el.querySelector('.qbe-tbl'), [
      { key: 'date', label: 'Date', render: function (t) { return U.fmtDate(t.date); } },
      { key: 'route', label: 'Trip', sort: false, render: function (t) { return esc(t.start || 'Start') + ' ' + ic('caretRight', 'qbe-tiny') + ' ' + esc(t.end || 'End') + (t.notes ? '<div class="qb-muted qbe-small">' + esc(t.notes) + '</div>' : ''); } },
      { key: 'purpose', label: 'Purpose', render: function (t) { return '<button type="button" class="qbe-tag ' + (t.purpose === 'Business' ? 'is-green' : '') + '" data-act="qbe:tripkind:' + t.id + '" title="Switch purpose">' + esc(t.purpose) + '</button>'; } },
      { key: 'miles', label: 'Miles', align: 'right', render: function (t) { return U.num(t.miles); } },
      { key: 'ded', label: 'Deduction', align: 'right', sort: function (t) { return tripDeduction(t); }, render: function (t) { return U.money(tripDeduction(t)); } },
      { key: 'act', label: 'Action', align: 'right', sort: false, render: function (t) { return '<button type="button" class="qb-link" data-act="qbe:deltrip:' + t.id + '">Delete</button>'; } }
    ], trips, { sortKey: 'date', sortDir: 'desc', footer: '<tr><td colspan="3">Total</td><td class="ta-r">' + U.num(miles) + '</td><td class="ta-r">' + U.money(ded) + '</td><td></td></tr>' });
  });

  /* ═════════════ Contractors ═════════════ */
  function contractorPaid(c) {
    var vid = vendorIdByName(c.name);
    return vid ? paidAccrual(vid) : (+c.paid || 0);
  }
  function requestW9(i) {
    var c = S.contractors[i]; if (!c) return;
    if (!c.email) {
      modalK('Request W-9', '<p>Add an email address for ' + esc(c.name) + ' so we can send the W-9 request.</p>' + UI.field('Email', UI.input('email', '', ' type="email"')), {
        buttons: [['Cancel', 'secondary'], ['Send request', 'primary', function (m) {
          var e = m.querySelector('[name=email]').value.trim();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { UI.toast('Enter a valid email address.', 'err'); return false; }
          c.email = e; c.w9 = 'Requested'; S.changed('contractors'); UI.toast('W-9 request sent to ' + e + '.');
        }]]
      });
      return;
    }
    c.w9 = 'Requested'; S.changed('contractors');
    UI.toast('W-9 request sent to ' + c.email + '.');
  }
  QB.view('contractors', function (params, el) {
    var h = UI.pageHead('Contractors', { actions: UI.feedbackLink() + UI.btn('Prepare 1099s', { kind: 'secondary', act: 'go:1099FilingDetails' }) + UI.btn('Add a contractor', { kind: 'primary', act: 'qbe:addcontr' }) });
    var need = S.contractors.filter(function (c) { return c.w9 !== 'Received'; }).length;
    if (need) h += '<div class="qb-banner">' + ic('info') + '<span>' + plural(need, 'contractor') + ' still ' + (need === 1 ? 'needs' : 'need') + ' to send a W-9. Request W-9 info now so you are ready to file 1099s in January.</span></div>';
    h += '<div class="qbe-bar"><span class="qb-search-box qbe-search"><input class="qb-input" data-qbe="cq" placeholder="Find a contractor" value="' + esc(st.cq) + '">' + ic('search') + '</span><span class="qb-grow"></span>' + iconBtn('print', 'qbe:printpage', 'Print') + '</div><div class="qbe-tbl"></div>';
    el.innerHTML = h;
    var host = el.querySelector('.qbe-tbl');
    var cols = [
      { key: 'name', label: 'Name', render: function (r) { var vid = vendorIdByName(r.name); return vid ? '<a class="qb-name-link" href="#/vendordetail?id=' + vid + '">' + esc(r.name) + '</a>' : '<b>' + esc(r.name) + '</b>'; } },
      { key: 'email', label: 'Email', render: function (r) { return r.email ? esc(r.email) : '<span class="qb-muted">Missing</span>'; } },
      { key: 'w9', label: 'W-9 status', render: function (r) { return '<span class="qbe-w9 is-' + r.w9.replace(/\s+/g, '-').toLowerCase() + '">' + esc(r.w9) + '</span>'; } },
      { key: 'paid', label: 'Paid this year', align: 'right', render: function (r) { return U.money(r.paid); } },
      { key: 'act', label: 'Action', align: 'right', sort: false, render: function (r) {
        var menu = [['Write check', 'qbe:cform:Check:' + r.i], ['Create expense', 'qbe:cform:Expense:' + r.i], ['Create bill', 'qbe:cform:Bill:' + r.i]];
        return r.w9 === 'Received' ? actLinks('Write check', 'qbe:cform:Check:' + r.i, [['Request W-9 again', 'qbe:w9:' + r.i], ['Create expense', 'qbe:cform:Expense:' + r.i], ['Create bill', 'qbe:cform:Bill:' + r.i]]) : actLinks(r.w9 === 'Requested' ? 'Resend W-9 request' : 'Request W-9', 'qbe:w9:' + r.i, menu);
      } }
    ];
    function draw() {
      var q = st.cq.trim().toLowerCase();
      var rows = S.contractors.map(function (c, i) { return { id: 'ct' + i, i: i, name: c.name || '', email: c.email || '', w9: c.w9 || 'Not requested', paid: contractorPaid(c) }; })
        .filter(function (r) { return !q || (r.name + ' ' + r.email).toLowerCase().indexOf(q) >= 0; });
      host._qbt = null;
      UI.table(host, cols, rows, { sortKey: 'name', sortDir: 'asc', empty: 'No contractors yet. Add one to start tracking 1099 payments.' });
    }
    draw();
    var inp = el.querySelector('[data-qbe="cq"]');
    inp.addEventListener('input', function () { st.cq = inp.value; draw(); });
  });

  /* ═════════════ 1099s ═════════════ */
  var THRESHOLD = 600;
  function vendors1099() { return S.vendors.filter(function (v) { return v.track1099 && v.active !== false; }).sort(function (a, b) { return a.name.localeCompare(b.name); }); }
  QB.view('1099FilingDetails', function (params, el) {
    var y = +U.today().slice(0, 4);
    var vs = vendors1099();
    var h = UI.pageHead('1099s', { actions: UI.feedbackLink() + '<span class="qbe-year">' + UI.select('qbeYear', [[String(y), String(y)]], String(y)) + '</span>' + UI.btn('Prepare 1099s', { kind: 'primary', act: 'qbe:prep1099' }) });
    var steps = [['Review your company info', 'Check your business name, address and tax ID.'], ['Choose the accounts you used to pay contractors', 'Map payments to 1099-NEC box 1 or leave them out.'], ['Check your contractors\' info', 'Make sure every contractor has an address and tax ID.'], ['Review and e-file', 'Send forms to the IRS and email copies to contractors.']];
    if (!st.p1099) {
      h += UI.hero({ grey: true, title: 'Prepare your 1099s', lead: 'File ' + (y) + ' 1099-NEC forms for the contractors you paid ' + U.money(THRESHOLD) + ' or more.',
        body: '<ol class="qbe-steps">' + steps.map(function (s, i) { return '<li><span class="qbe-stepno">' + (i + 1) + '</span><div><b>' + s[0] + '</b><div class="qb-muted">' + s[1] + '</div></div></li>'; }).join('') + '</ol>',
        actions: UI.btn('Prepare 1099s', { kind: 'primary', act: 'qbe:prep1099' }) + UI.btn('Learn more', { kind: 'tertiary', act: 'qbe:howbills1099' }), art: QB.art('docs') });
    } else {
      h += '<div class="qb-banner">' + ic('checkCircle') + '<span>Your ' + y + ' 1099s were prepared on ' + U.fmtDate(st.p1099.date) + '. ' + plural(st.p1099.count, 'form') + ' ready to e-file. <button type="button" class="qb-link" data-act="qbe:prep1099">Review again</button></span></div>';
    }
    var rows = vs.map(function (v) {
      var amt = amount1099(v.id);
      var addr = [v.street, v.city].filter(Boolean).join(', ');
      return { id: v.id, name: v.name, email: v.email || '', addr: addr, tin: st.taxIds[v.id] ? 'On file' : '', amount: amt, over: amt >= THRESHOLD, v: v };
    });
    var total = sum(rows, function (r) { return r.amount; }), needing = rows.filter(function (r) { return r.over; }).length;
    h += '<div class="qbe-stats"><div class="qbe-stat"><span>1099 contractors</span><b>' + rows.length + '</b></div><div class="qbe-stat"><span>Need a 1099-NEC</span><b>' + needing + '</b></div><div class="qbe-stat"><span>Total paid in ' + y + ' (1099 eligible)</span><b>' + U.money(total) + '</b></div></div>';
    h += '<h2 class="qbe-h2">Contractors you track for 1099s</h2><p class="qb-muted qbe-small">Payments by cash, check and bank transfer are included. Credit card and payment app payments are reported by the processor, so they are left out.</p><div class="qbe-tbl"></div>';
    el.innerHTML = h;
    UI.table(el.querySelector('.qbe-tbl'), [
      { key: 'name', label: 'Contractor', render: function (r) { return '<a class="qb-name-link" href="#/vendordetail?id=' + r.id + '">' + esc(r.name) + '</a>'; } },
      { key: 'email', label: 'Email', render: function (r) { return r.email ? esc(r.email) : '<span class="qb-muted">Missing</span>'; } },
      { key: 'addr', label: 'Address', render: function (r) { return r.addr ? esc(r.addr) : '<span class="qbe-missing">Missing</span>'; } },
      { key: 'tin', label: 'Tax ID', render: function (r) { return r.tin ? esc(r.tin) : '<span class="qbe-missing">Missing</span>'; } },
      { key: 'amount', label: 'Box 1 NEC', align: 'right', render: function (r) { return U.money(r.amount); } },
      { key: 'over', label: 'Status', render: function (r) { return r.over ? UI.statusHtml({ text: st.p1099 ? 'Ready to file' : 'Needs a 1099', tone: st.p1099 ? 'paid' : 'due' }) : '<span class="qb-muted">Below ' + U.money0(THRESHOLD) + ' threshold</span>'; } }
    ], rows, { sortKey: 'name', sortDir: 'asc', empty: 'No vendors are set up to track 1099 payments. Turn on "Track payments for 1099" in a vendor profile.',
      footer: rows.length ? '<tr><td colspan="4">Total</td><td class="ta-r">' + U.money(total) + '</td><td></td></tr>' : '' });
  });
  function about1099() {
    modalK('About 1099s', '<p>Businesses send a 1099-NEC to each independent contractor they paid ' + U.money(THRESHOLD) + ' or more during the year, and file a copy with the IRS by January 31.</p><p>QuickBooks totals what you paid each vendor marked "Track payments for 1099", leaves out card payments, and fills in the forms for you.</p>', { buttons: [['Got it', 'primary']] });
  }
  function prepare1099(step) {
    var y = +U.today().slice(0, 4), vs = vendors1099();
    var m = modalK('Prepare ' + y + ' 1099s', '<div class="qbe-wiz"></div>', { wide: true, sticky: true });
    var co = { name: S.company.legalName || S.company.name, street: S.company.street, city: S.company.city, state: S.company.state, zip: S.company.zip, ein: st.ein || '' };
    var box = m.querySelector('.qbe-wiz');
    function accts() {
      var set = {};
      vs.forEach(function (v) { lines1099(v.id).forEach(function (l) { set[l.acct] = U.r2((set[l.acct] || 0) + l.amount); }); });
      return Object.keys(set).map(function (a) { return { acct: a, amount: set[a] }; }).sort(function (a, b) { return S.fullName(a.acct).localeCompare(S.fullName(b.acct)); });
    }
    function draw(n) {
      var bar = '<div class="qbe-wiz-steps">' + ['Company info', 'Accounts', 'Contractors'].map(function (s, i) { return '<span class="' + (i + 1 === n ? 'on' : i + 1 < n ? 'done' : '') + '"><i>' + (i + 1 < n ? ic('check') : i + 1) + '</i>' + s + '</span>'; }).join('') + '</div>';
      var b = '';
      if (n === 1) {
        b = '<h3>Review your company info</h3><p class="qb-muted">This appears on every 1099 you file.</p><div class="qbe-mform qbe-mgrid">' +
          UI.field('Legal business name', UI.input('name', co.name)) + UI.field('Tax ID (EIN or SSN)', UI.input('ein', co.ein, ' placeholder="XX-XXXXXXX" autocomplete="off"')) +
          UI.field('Street address', UI.input('street', co.street)) + UI.field('City', UI.input('city', co.city)) + UI.field('State', UI.input('state', co.state)) + UI.field('ZIP code', UI.input('zip', co.zip)) + '</div>';
      } else if (n === 2) {
        var list = accts();
        b = '<h3>Choose the accounts you used to pay contractors</h3><p class="qb-muted">Map each account to a 1099 box. Most contractor payments go in Box 1: Nonemployee compensation.</p>' +
          '<table class="qb-table"><thead><tr><th>Account</th><th class="ta-r">Paid in ' + y + '</th><th>1099 box</th></tr></thead><tbody>' + (list.length ? list.map(function (a) {
            return '<tr><td>' + esc(S.fullName(a.acct)) + '</td><td class="ta-r">' + U.money(a.amount) + '</td><td>' + UI.select('box_' + a.acct, [['nec', 'Box 1: Nonemployee compensation (1099-NEC)'], ['rents', 'Box 1: Rents (1099-MISC)'], ['none', 'Not included']], st.box[a.acct] || 'nec', ' data-acct="' + a.acct + '"') + '</td></tr>';
          }).join('') : '<tr class="qb-empty-row"><td colspan="3">No eligible payments this year.</td></tr>') + '</tbody></table>';
      } else {
        var rows = vs.map(function (v) { return { v: v, amt: amount1099(v.id) }; });
        b = '<h3>Check your contractors\' info</h3><p class="qb-muted">Contractors paid ' + U.money(THRESHOLD) + ' or more get a 1099-NEC.</p>' +
          '<table class="qb-table"><thead><tr><th>Contractor</th><th>Address</th><th>Email</th><th class="ta-r">Box 1 total</th><th>1099</th></tr></thead><tbody>' + rows.map(function (r) {
            var addr = [r.v.street, r.v.city].filter(Boolean).join(', ');
            return '<tr><td>' + esc(r.v.name) + '</td><td>' + (addr ? esc(addr) : '<span class="qbe-missing">Missing</span>') + '</td><td>' + (r.v.email ? esc(r.v.email) : '<span class="qb-muted">—</span>') + '</td><td class="ta-r">' + U.money(r.amt) + '</td><td>' + (r.amt >= THRESHOLD ? '<span class="qbe-1099">' + ic('check') + '</span> Yes' : '<span class="qb-muted">Below threshold</span>') + '</td></tr>';
          }).join('') + '</tbody></table>';
      }
      box.innerHTML = bar + '<div class="qbe-wiz-body">' + b + '</div><div class="qbe-wiz-foot">' +
        '<button type="button" class="qb-btn qb-btn-tertiary" data-wiz="cancel">Cancel</button><span class="qb-grow"></span>' +
        (n > 1 ? '<button type="button" class="qb-btn qb-btn-secondary" data-wiz="back">Back</button>' : '') +
        '<button type="button" class="qb-btn qb-btn-primary" data-wiz="next">' + (n === 3 ? 'Finish preparing 1099s' : 'Next') + '</button></div>';
      box.dataset.step = n;
    }
    function save(n) {
      var g = function (nm) { var x = box.querySelector('[name=' + nm + ']'); return x ? x.value.trim() : ''; };
      if (n === 1) {
        co.name = g('name') || co.name; co.ein = g('ein'); co.street = g('street'); co.city = g('city'); co.state = g('state'); co.zip = g('zip');
        if (!co.street || !co.city || !co.zip) { UI.toast('Enter your full business address.', 'err'); return false; }
        st.ein = co.ein;
      }
      if (n === 2) U.$$('select[data-acct]', box).forEach(function (s) { st.box[s.dataset.acct] = s.value; });
      return true;
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-wiz]'); if (!b) return;
      var n = +box.dataset.step;
      if (b.dataset.wiz === 'cancel') return m.close();
      if (b.dataset.wiz === 'back') return draw(n - 1);
      if (!save(n)) return;
      if (n < 3) return draw(n + 1);
      var count = vs.filter(function (v) { return amount1099(v.id) >= THRESHOLD; }).length;
      st.p1099 = { date: U.today(), count: count };
      m.close();
      UI.toast(plural(count, '1099-NEC form') + ' prepared. In the real product you would review and e-file them next.');
      if (QB.route.name === '1099FilingDetails') rerender(); else QB.go('1099FilingDetails');
    });
    draw(step || 1);
  }
})();
