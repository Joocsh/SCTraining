/* ══════════════════════════════════════════════════════════
   QuickBooks Online test drive: Sales & Get Paid + Customer Hub.
   Views: incomeoverview, sales, invoices, recurringsales, salesorders,
   commerce, paymentsdeposits, items, customers-overview, customers,
   customerdetail, estimates, appointments, reviews.
   Everything is computed from QB.store through QB.ledger, so a saved
   form re-renders these pages with fresh numbers.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var QB = window.QB, U = QB.util, S = QB.store, L = QB.ledger, UI = QB.ui;
  if (!QB || !QB.view) return;

  /* ───────────── helpers ───────────── */
  var ST = {};
  function state(k, def) { if (!ST[k]) ST[k] = def; return ST[k]; }
  function esc(s) { return U.esc(s); }
  function money(n) { return U.money(n); }
  function sd(iso) { return iso ? U.fmtDate(iso, 'short') : ''; }
  function today() { return U.today(); }
  function ic(n, c) { return UI.icon(n, c); }
  function inRange(iso, key) { if (!key || key === 'all') return true; var r = U.range(key); return iso >= r[0] && iso <= r[1]; }
  function visible(pred) { return S.txns.filter(function (t) { return !t.hidden && (!pred || pred(t)); }); }
  function byName(a, b) { return String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase()); }
  function byDateDesc(a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.created || 0) - (a.created || 0); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function num(v) { v = +v || 0; return String(U.r2(v)); }

  var LIST_TYPES = ['Invoice', 'Payment', 'Sales Receipt', 'Credit Memo', 'Refund', 'Estimate', 'Charge', 'Credit', 'Time Charge', 'Time Activity', 'Billable Expense Charge', 'Statement', 'Sales Order', 'Delayed Charge', 'Delayed Credit'];
  var UNBILLED = ['Time Charge', 'Time Activity', 'Charge', 'Billable Expense Charge', 'Delayed Charge'];
  var NEG = ['Credit Memo', 'Refund', 'Credit', 'Delayed Credit'];
  var FORM_OF = { 'Payment': 'Receive Payment', 'Charge': 'Delayed Charge', 'Credit': 'Delayed Credit', 'Time Charge': 'Single time activity', 'Time Activity': 'Single time activity', 'Billable Expense Charge': 'Delayed Charge' };
  var RECUR_SALES = ['Invoice', 'Sales Receipt', 'Estimate', 'Credit Memo', 'Refund', 'Delayed Charge', 'Delayed Credit', 'Charge', 'Credit'];

  /* Amount as the lists show it, and as their total adds it up
     (payments show positive but reduce the total, credits are negative). */
  function shown(t) { return NEG.indexOf(t.type) >= 0 ? -Math.abs(t.total || 0) : (t.total || 0); }
  function counted(t) { return t.type === 'Payment' ? -(t.total || 0) : shown(t); }
  function stat(t) {
    if (t.voided) return { text: 'Voided', tone: 'closed' };
    var s = L.status(t);
    if (s && s.text) return s;
    if (t.type === 'Sales Order') return { text: t.status || 'Open', tone: t.status === 'Closed' ? 'closed' : 'open' };
    if (t.type === 'Time Activity' || t.type === 'Delayed Charge' || t.type === 'Delayed Credit') return { text: t.status || 'Open', tone: (t.status || 'Open') === 'Open' ? 'open' : 'closed' };
    return { text: '', tone: '' };
  }
  function statusCell(t) { return UI.statusHtml(stat(t)); }
  function openBal(t) { return t.voided ? 0 : L.openBalance(t); }
  function isOpenInv(t) { return t.type === 'Invoice' && openBal(t) > 0.004; }
  function isOverdue(t) { return isOpenInv(t) && !!t.due && t.due < today(); }
  function isUnbilled(t) { return UNBILLED.indexOf(t.type) >= 0 && !t.voided && (t.status || 'Open') === 'Open' && t.billable !== false; }
  function estStatus(t) { return t.status || 'Pending'; }
  function isOpenEst(t) { return t.type === 'Estimate' && !t.voided && (estStatus(t) === 'Pending' || estStatus(t) === 'Accepted'); }
  function isOpenCredit(t) { return (t.type === 'Credit Memo' || t.type === 'Payment') && !t.voided && L.openBalance(t) < -0.004; }
  function invPayments(inv) {
    return S.txns.filter(function (p) { return p.type === 'Payment' && (p.applied || []).some(function (a) { return a.id === inv.id && a.amount > 0 && !a.credit; }); });
  }
  function lastPaid(inv) { var ds = invPayments(inv).map(function (p) { return p.date; }).sort(); return ds[ds.length - 1] || ''; }
  function isPaidInv(t) { return t.type === 'Invoice' && !t.voided && t.total > 0 && openBal(t) <= 0.004; }
  function isRecentlyPaid(t) {
    if (t.voided) return false;
    if (t.type === 'Sales Receipt') return inRange(t.date, 'last-30');
    if (isPaidInv(t)) { var lp = lastPaid(t); return !!lp && inRange(lp, 'last-30'); }
    return false;
  }
  function payDeposited(p) { return p.account !== 'a_undep' || !!p.deposited; }
  function custIds(id) {
    var ids = [id];
    (function add(pid) { S.customers.forEach(function (c) { if (c.parent === pid) { ids.push(c.id); add(c.id); } }); })(id);
    return ids;
  }
  function custBal(c) { return c.parent && !S.customers.some(function (x) { return x.parent === c.id; }) ? L.custBalance(c.id, false) : L.custBalance(c.id, true); }
  function addr(c) {
    if (!c) return '';
    var l2 = [c.city, [c.state, c.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return [c.street, l2].filter(Boolean).join(', ');
  }
  function custOptions(all) {
    var out = [['', all || 'All customers']];
    QB.lists.customers().forEach(function (o) { out.push([o.value, (o.depth ? '   ' : '') + o.label]); });
    return out;
  }
  /* Apply route params only when the hash changed, so a re-render after a
     save does not undo filters the user picked by hand. */
  function takeParams(s, params, keys) {
    var sig = JSON.stringify(params || {});
    if (s._sig === sig) return false;
    s._sig = sig;
    keys.forEach(function (k) { if (params[k] != null && params[k] !== '') s[k] = params[k]; });
    return true;
  }
  function seedTable(box, s, def) {
    box._qbt = s.tbl || { sortKey: def.sortKey, sortDir: def.sortDir || 'asc', page: 0, checked: {} };
    s.tbl = box._qbt;
  }

  /* ───────────── commands ─────────────
     Elements inside our pages carry data-qbs="cmd:arg:arg". Views pass a
     local command map; global ones live in CMD and are also reachable
     from menus through QB.act('qbs:cmd:arg'). */
  var CMD = {};
  function run(str, anchor, local) {
    var p = String(str || '').split(':'), c = p.shift();
    if (local && local[c]) return local[c](p, anchor);
    if (CMD[c]) return CMD[c](p, anchor);
    if (window.console) console.warn('qbs: no command', str);
  }
  QB.on('qbs', function (arg, el) { run(arg, el, null); });
  function wire(el, local) {
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-qbs]');
      if (!b || !el.contains(b)) return;
      if (b.tagName === 'INPUT' || b.tagName === 'SELECT' || b.tagName === 'LABEL') return;
      e.preventDefault();
      run(b.getAttribute('data-qbs'), b, local);
    });
  }
  /* Popover menu. items: [label, cmdString | fn, disabled] | {sep} | {head}.
     Opened on the next tick so the shell's outside-click closer does not
     swallow it. */
  function popMenu(anchor, items, opts) {
    var list = [];
    items.forEach(function (it, i) {
      if (!it) return;
      if (it.sep || it.head) list.push(it); else list.push({ label: it[0], act: 'm' + i, disabled: !!it[2] });
    });
    setTimeout(function () {
      UI.menu(anchor, list, {
        alignLeft: opts && opts.left, cls: opts && opts.cls,
        onPick: function (k) { var it = items[+k.slice(1)]; if (!it) return; if (typeof it[1] === 'function') it[1](); else run(it[1], anchor); }
      });
    }, 0);
  }
  function split(label, mainCmd, caretCmd, kind) {
    kind = kind || 'primary';
    return '<span class="qb-split qb-split-' + kind + '"><button type="button" class="qb-btn qb-btn-' + kind + '" data-qbs="' + esc(mainCmd) + '">' + esc(label) + '</button>' +
      '<button type="button" class="qb-btn qb-btn-' + kind + ' qb-split-caret" data-qbs="' + esc(caretCmd) + '" aria-label="More options">' + ic('caretDown') + '</button></span>';
  }
  function btn(label, cmd, kind, cls, icon) {
    return '<button type="button" class="qb-btn qb-btn-' + (kind || 'secondary') + (cls ? ' ' + cls : '') + '" data-qbs="' + esc(cmd) + '">' + (icon ? ic(icon) : '') + '<span>' + esc(label) + '</span></button>';
  }
  function ddBtn(label, cmd, kind) {
    return '<button type="button" class="qb-btn qb-btn-' + (kind || 'tertiary') + ' qbs-dd" data-qbs="' + esc(cmd) + '"><span>' + esc(label) + '</span>' + ic('caretDown') + '</button>';
  }
  function lnk(label, cmd, cls) { return '<button type="button" class="qb-link' + (cls ? ' ' + cls : '') + '" data-qbs="' + esc(cmd) + '">' + esc(label) + '</button>'; }
  function iconBtn(icon, cmd, label) { return '<button type="button" class="qb-icon-btn" data-qbs="' + esc(cmd) + '" aria-label="' + esc(label) + '" title="' + esc(label) + '">' + ic(icon) + '</button>'; }
  function sel(name, options, value, label) {
    var h = UI.select(name, options, value, ' data-f="' + name + '"');
    return label ? '<label class="qb-field qbs-fld"><span class="qb-label">' + esc(label) + '</span>' + h + '</label>' : h;
  }
  function feedback() { return UI.feedbackLink ? UI.feedbackLink() : ''; }

  CMD.open = function (a) { QB.openTxn(a[0]); };
  CMD.form = function (a) { var o = {}; if (a[1]) o.cust = a[1]; QB.openForm(a[0], o); };
  CMD.nav = function (a) {
    var p = {};
    for (var i = 1; i < a.length; i++) { var kv = a[i].split('='); if (kv[0]) p[kv[0]] = kv[1] || ''; }
    QB.go(a[0], p);
  };
  CMD.cust = function (a) { QB.go('customerdetail', { id: a[0] }); };
  CMD.recv = function (a) { var t = S.txn[a[0]]; if (t) QB.openForm('Receive Payment', { cust: t.cust, invoice: t.id }); };
  CMD.recvc = function (a) { QB.openForm('Receive Payment', { cust: a[0] }); };
  CMD.toinv = function (a) { toInvoice(S.txn[a[0]]); };
  CMD.txnmenu = function (a, el) { txnMenu(S.txn[a[0]], el); };
  CMD.custmenu = function (a, el) { custMenu(S.cust[a[0]], el); };
  CMD.print = function (a) { printTxns([a[0]]); };
  CMD.send = function (a) { sendTxns([a[0]]); };
  CMD.copy = function (a) { copyTxn(S.txn[a[0]]); };
  CMD.void = function (a) { voidTxn(S.txn[a[0]]); };
  CMD.del = function (a) { deleteTxn(S.txn[a[0]]); };
  CMD.custedit = function (a) { QB.openForm('Customer', { customer: S.cust[a[0]] }); };
  CMD.newcust = function () { QB.openForm('Customer', {}); };
  CMD.importcust = function () { importModal('customers'); };
  CMD.itemedit = function (a) { QB.openForm('Product/Service', { item: S.item[a[0]] }); };
  CMD.itemmenu = function (a, el) { itemMenu(S.item[a[0]], el); };
  CMD.newitem = function (a) { QB.openForm('Product/Service', a[0] ? { type: a[0] } : {}); };
  CMD.estmenu = function (a, el) { estMenu(S.txn[a[0]], el); };
  CMD.paylink = function () { paymentLinkModal(); };
  CMD.recurnew = function () { newRecurring(); };
  CMD.toast = function (a) { UI.toast(a.join(':')); };

  /* Estimate / charge -> invoice. The Invoice form owns opts.from; as a
     safety net we close the source once an invoice for that customer lands. */
  var pending = null, watching = false;
  function toInvoice(t) {
    if (!t) return;
    var ids = custIds(t.cust);
    pending = { src: t.id, ids: ids, before: S.txns.filter(function (x) { return x.type === 'Invoice' && ids.indexOf(x.cust) >= 0; }).length, status: t.type === 'Estimate' || t.type === 'Sales Order' ? 'Closed' : 'Converted' };
    watchForms();
    QB.openForm('Invoice', { from: t, cust: t.cust });
    if (typeof document !== 'undefined' && document.querySelector && !document.querySelector('.qb-form-ov')) pending = null;
  }
  S.on(function () {
    if (!pending) return;
    var p = pending;
    var n = S.txns.filter(function (x) { return x.type === 'Invoice' && p.ids.indexOf(x.cust) >= 0; }).length;
    if (n > p.before) {
      var src = S.txn[p.src];
      if (src && (src.type === 'Estimate' ? isOpenEst(src) : (src.status || 'Open') === 'Open' && !src.voided)) src.status = p.status;
      pending = null;
    }
  });
  function watchForms() {
    if (watching || typeof MutationObserver === 'undefined') return;
    var layer = document.getElementById('qbLayer'); if (!layer) return;
    watching = true;
    new MutationObserver(function () {
      if (!pending || document.querySelector('.qb-form-ov')) return;
      setTimeout(function () { if (!document.querySelector('.qb-form-ov')) pending = null; }, 120);
    }).observe(layer, { childList: true });
  }

  function formName(t) { return FORM_OF[t.type] || t.type; }
  function copyTxn(t) {
    if (!t) return;
    QB.openForm(formName(t), { from: t, copy: true, cust: t.cust });
  }
  function voidTxn(t) {
    if (!t) return;
    UI.confirm('Void ' + t.type.toLowerCase() + (t.no ? ' ' + t.no : ''), 'Are you sure you want to void this? The amount goes to zero and the transaction stays on your records marked Voided.', 'Yes, void it', function () {
      t.voided = true;
      t.memo = 'Voided' + (t.memo ? ': ' + t.memo : '');
      (t.lines || []).forEach(function (l) { l.qty = 0; l.amount = 0; });
      t.discountAmt = 0; t.discountPct = 0; t.shipping = 0; t.taxOverride = null;
      if (t.lines && t.lines.length) L.totals(t); else t.total = 0;
      t.total = 0; t.tax = 0;
      t.applied = [];
      S.txns.forEach(function (o) { if (o !== t && o.applied) o.applied = o.applied.filter(function (a) { return a.id !== t.id; }); });
      S.update(t);
      UI.toast(t.type + (t.no ? ' ' + t.no : '') + ' was voided.');
    });
  }
  function deleteTxn(t) {
    if (!t) return;
    UI.confirm('Delete ' + t.type.toLowerCase() + (t.no ? ' ' + t.no : ''), 'Are you sure you want to delete this transaction? You can’t undo this.', 'Yes, delete', function () {
      S.remove(t.id);
      UI.toast('Transaction deleted.');
    });
  }

  /* Row action cell for every sales-side transaction list. */
  function actionCell(t) {
    var id = t.id, v = lnk('View/Edit', 'open:' + id), sep = '<span class="qb-sep">|</span>';
    var caret = '<button type="button" class="qb-act-caret" data-qbs="txnmenu:' + id + '" aria-label="More actions">' + ic('caretDown') + '</button>';
    var ty = t.type, h;
    if (ty === 'Invoice') h = isOpenInv(t) ? v + sep + lnk('Receive payment', 'recv:' + id) + caret : v + sep + lnk('Print', 'print:' + id) + caret;
    else if (ty === 'Estimate') h = isOpenEst(t) ? lnk('Create invoice', 'toinv:' + id) + caret : v + sep + lnk('Print', 'print:' + id) + caret;
    else if ((ty === 'Time Charge' || ty === 'Time Activity') && isUnbilled(t)) h = v + sep + lnk('Convert to invoice', 'toinv:' + id);
    else if (UNBILLED.indexOf(ty) >= 0 && isUnbilled(t)) h = v + sep + lnk('Create invoice', 'toinv:' + id);
    else if (ty === 'Sales Receipt' || ty === 'Credit Memo' || ty === 'Refund') h = v + sep + lnk('Print', 'print:' + id) + caret;
    else if (ty === 'Payment') h = v + caret;
    else if (ty === 'Sales Order') h = v + sep + lnk('Create invoice', 'toinv:' + id);
    else h = v;
    return '<span class="qb-act">' + h + '</span>';
  }
  function txnMenu(t, a) {
    if (!t) return;
    var id = t.id, ty = t.type, items;
    if (ty === 'Invoice') {
      items = isOpenInv(t)
        ? [['Send', 'send:' + id], ['Print', 'print:' + id], ['Copy', 'copy:' + id], ['Void', 'void:' + id, t.voided], ['Delete', 'del:' + id]]
        : [['Send', 'send:' + id], ['Copy', 'copy:' + id], ['Void', 'void:' + id, t.voided], ['Delete', 'del:' + id]];
    } else if (ty === 'Estimate') return estMenu(t, a);
    else if (ty === 'Payment') items = [['Print', 'print:' + id], ['Void', 'void:' + id, t.voided], ['Delete', 'del:' + id]];
    else items = [['Send', 'send:' + id], ['Copy', 'copy:' + id], ['Void', 'void:' + id, t.voided], ['Delete', 'del:' + id]];
    popMenu(a, items);
  }
  function estMenu(t, a) {
    if (!t) return;
    var id = t.id;
    function setSt(v) { return function () { t.status = v; S.update(t); UI.toast('Estimate ' + (t.no || '') + ' marked ' + v.toLowerCase() + '.'); }; }
    popMenu(a, [['View/Edit', 'open:' + id], ['Print', 'print:' + id], ['Send', 'send:' + id], ['Copy', 'copy:' + id], { sep: true },
      ['Mark as accepted', setSt('Accepted'), estStatus(t) === 'Accepted' || !isOpenEst(t)], ['Mark as rejected', setSt('Rejected'), estStatus(t) === 'Rejected'], ['Mark as pending', setSt('Pending'), estStatus(t) === 'Pending'],
      { sep: true }, ['Delete', 'del:' + id]]);
  }
  function custMenu(c, a) {
    if (!c) return;
    var id = c.id, bal = custBal(c);
    var items = [];
    if (bal > 0.004) items.push(['Create invoice', 'form:Invoice:' + id]);
    items.push(['Create sales receipt', 'form:Sales Receipt:' + id], ['Create estimate', 'form:Estimate:' + id], ['Create charge', 'form:Delayed Charge:' + id], ['Create time activity', 'form:Single time activity:' + id]);
    items.push([c.active === false ? 'Make active' : 'Make inactive', function () { toggleCustActive(c); }]);
    popMenu(a, items);
  }
  function toggleCustActive(c) {
    if (c.active === false) { c.active = true; S.changed('customer'); UI.toast(c.name + ' is active again.'); return; }
    var bal = custBal(c);
    var msg = bal ? c.name + ' has an open balance of ' + money(bal) + '. Making the customer inactive will create a credit or adjustment in the real product. Do you want to continue?' : 'Are you sure you want to make ' + c.name + ' inactive?';
    UI.confirm('Make inactive', msg, 'Yes, make inactive', function () {
      custIds(c.id).forEach(function (id) { S.cust[id].active = false; });
      S.changed('customer');
      UI.toast(c.name + ' is now inactive.');
    });
  }

  /* ───────────── print, send, reminders ───────────── */
  var DOC_TITLE = { 'Invoice': 'INVOICE', 'Estimate': 'ESTIMATE', 'Sales Receipt': 'SALES RECEIPT', 'Credit Memo': 'CREDIT MEMO', 'Refund': 'REFUND RECEIPT', 'Payment': 'PAYMENT', 'Sales Order': 'SALES ORDER', 'Statement': 'STATEMENT' };
  function docHtml(t) {
    var c = S.cust[t.cust] || {}, co = S.company || {};
    var h = '<div class="qbs-doc"><div class="qbs-doc-top"><div><div class="qbs-doc-co">' + esc(co.name) + '</div><div class="qb-muted">' + esc(co.street) + '<br>' + esc(co.city + ', ' + co.state + ' ' + co.zip) + '<br>' + esc(co.email) + '</div></div>' +
      '<div class="qbs-doc-title">' + esc(DOC_TITLE[t.type] || t.type.toUpperCase()) + '</div></div>';
    h += '<div class="qbs-doc-meta"><div><div class="qbs-doc-k">BILL TO</div>' + esc(c.first || c.last ? (c.first + ' ' + (c.last || '')).trim() : '') + (c.first ? '<br>' : '') + esc(c.company || S.custName(t.cust)) + '<br>' + esc(c.street || '') + (c.street ? '<br>' : '') + esc([c.city, c.state].filter(Boolean).join(', ') + ' ' + (c.zip || '')) + '</div>' +
      '<div class="qbs-doc-kv">' + (t.no ? '<span>' + esc(t.type === 'Estimate' ? 'ESTIMATE #' : t.type === 'Invoice' ? 'INVOICE #' : 'NO.') + '</span><b>' + esc(t.no) + '</b>' : '') +
      '<span>DATE</span><b>' + U.fmtDate(t.date) + '</b>' + (t.due ? '<span>DUE DATE</span><b>' + U.fmtDate(t.due) + '</b>' : '') + (t.terms ? '<span>TERMS</span><b>' + esc(t.terms) + '</b>' : '') +
      (t.expires && t.type === 'Estimate' ? '<span>EXPIRATION DATE</span><b>' + U.fmtDate(t.expires) + '</b>' : '') + '</div></div>';
    if (t.type === 'Payment') {
      h += '<table class="qbs-doc-lines"><thead><tr><th>DESCRIPTION</th><th class="ta-r">AMOUNT</th></tr></thead><tbody>' + ((t.applied || []).map(function (ap) {
        var d = S.txn[ap.id]; return '<tr><td>' + esc(d ? d.type + ' #' + d.no : 'Transaction') + (ap.credit ? ' (credit)' : '') + '</td><td class="ta-r">' + U.num(ap.credit ? -ap.amount : ap.amount) + '</td></tr>';
      }).join('') || '<tr><td>Payment received</td><td class="ta-r">' + U.num(t.total) + '</td></tr>') + '</tbody></table>';
      h += '<div class="qbs-doc-tot"><span>TOTAL RECEIVED</span><b>' + money(t.total) + '</b></div>';
    } else {
      h += '<table class="qbs-doc-lines"><thead><tr><th>ACTIVITY</th><th>DESCRIPTION</th><th class="ta-r">QTY</th><th class="ta-r">RATE</th><th class="ta-r">AMOUNT</th></tr></thead><tbody>' +
        (t.lines || []).map(function (l) {
          var it = S.item[l.item];
          return '<tr><td>' + esc(it ? it.name : '') + '</td><td>' + esc(l.desc || '') + '</td><td class="ta-r">' + (l.qty != null ? num(l.qty) : '') + '</td><td class="ta-r">' + (l.rate != null ? U.num(l.rate) : '') + '</td><td class="ta-r">' + U.num(l.amount) + '</td></tr>';
        }).join('') + '</tbody></table>';
      h += '<div class="qbs-doc-sums"><span>SUBTOTAL</span><b>' + U.num(t.subtotal != null ? t.subtotal : t.total) + '</b>' + (t.discount ? '<span>DISCOUNT</span><b>-' + U.num(t.discount) + '</b>' : '') +
        (t.tax ? '<span>TAX</span><b>' + U.num(t.tax) + '</b>' : '') + '<span>TOTAL</span><b>' + U.num(t.total) + '</b>';
      if (t.type === 'Invoice') h += '<span>PAYMENT</span><b>' + U.num(t.total - openBal(t)) + '</b><span class="qbs-doc-due">BALANCE DUE</span><b class="qbs-doc-due">' + money(openBal(t)) + '</b>';
      h += '</div>';
    }
    if (t.memo) h += '<div class="qbs-doc-memo">' + esc(t.memo) + '</div>';
    if (t.voided) h += '<div class="qbs-doc-void">VOID</div>';
    return h + '</div>';
  }
  function printTxns(ids) {
    var ts = ids.map(function (id) { return S.txn[id]; }).filter(Boolean);
    if (!ts.length) return UI.toast('Select at least one transaction to print.', 'err');
    UI.modal(ts.length === 1 ? 'Print preview' : 'Print ' + ts.length + ' transactions', '<div class="qbs-print">' + ts.map(docHtml).join('') + '</div>', {
      wide: true, cls: 'qbs-print-modal',
      buttons: [['Close', 'secondary'], ['Print', 'primary', function () {
        ts.forEach(function (t) { t.printed = true; t.printLater = false; });
        document.body.classList.add('qbs-printing');
        try { window.print(); } catch (e) {}
        setTimeout(function () { document.body.classList.remove('qbs-printing'); }, 300);
        return false;
      }]]
    });
  }
  function sendTxns(ids) {
    var ts = ids.map(function (id) { return S.txn[id]; }).filter(Boolean);
    if (!ts.length) return UI.toast('Select at least one transaction to send.', 'err');
    var co = S.company || {};
    function mark() { ts.forEach(function (t) { t.sent = today(); t.delivery = 'Sent'; t.sendLater = false; }); S.changed('update'); }
    if (ts.length === 1) {
      var t = ts[0], c = S.cust[t.cust] || {};
      var subj = t.type + (t.no ? ' ' + t.no : '') + ' from ' + co.name;
      var body = 'Dear ' + (c.first ? c.first + ' ' + (c.last || '') : S.custName(t.cust)).trim() + ',\n\n' +
        (t.type === 'Invoice' ? 'Here’s your invoice! We appreciate your prompt payment.' : t.type === 'Estimate' ? 'Please review the estimate below. Feel free to contact us if you have any questions. We look forward to working with you.' : 'Thank you for your business.') +
        '\n\nThanks for your business!\n' + co.name;
      UI.modal('Send ' + t.type.toLowerCase(), '<div class="qbs-send">' +
        UI.field('To', UI.input('to', c.email || '', ' placeholder="Separate emails with a comma"')) +
        UI.field('Cc/Bcc', UI.input('cc', '')) +
        UI.field('Subject', UI.input('subj', subj)) +
        UI.field('Body', '<textarea class="qb-input" name="body" rows="7">' + esc(body) + '</textarea>') +
        '<p class="qb-muted qbs-small">This practice copy does not send email. The transaction is marked as sent.</p></div>', {
        buttons: [['Cancel', 'secondary'], ['Send', 'primary', function (m) {
          var to = m.querySelector('[name=to]');
          if (!/@/.test(to.value)) { to.classList.add('is-err'); return false; }
          mark(); UI.toast(t.type + (t.no ? ' ' + t.no : '') + ' was sent to ' + to.value + '.');
        }]]
      });
      return;
    }
    var noMail = ts.filter(function (t) { return !(S.cust[t.cust] || {}).email; }).length;
    UI.modal('Send transactions', '<p>Send ' + plural(ts.length, 'transaction') + ' to your customers by email?</p>' + (noMail ? '<p class="qb-muted">' + plural(noMail, 'customer has', 'customers have') + ' no email address and will be skipped.</p>' : ''), {
      buttons: [['Cancel', 'secondary'], ['Send', 'primary', function () {
        ts = ts.filter(function (t) { return (S.cust[t.cust] || {}).email; });
        mark(); UI.toast(plural(ts.length, 'transaction') + ' sent.');
      }]]
    });
  }
  function sendReminders(ids) {
    var ts = ids.map(function (id) { return S.txn[id]; }).filter(function (t) { return t && isOverdue(t); });
    if (!ts.length) return UI.toast('Select overdue invoices to send reminders.', 'err');
    UI.modal('Send reminders', '<p>Send a payment reminder for ' + plural(ts.length, 'overdue invoice') + ' totaling <b>' + money(ts.reduce(function (s, t) { return s + openBal(t); }, 0)) + '</b>?</p>' +
      UI.field('Message', '<textarea class="qb-input" rows="4">Just a reminder that your invoice is past due. Please pay at your earliest convenience. Thank you!</textarea>'), {
      buttons: [['Cancel', 'secondary'], ['Send reminders', 'primary', function () {
        ts.forEach(function (t) { t.reminded = today(); });
        S.changed('update');
        UI.toast('Reminders sent for ' + plural(ts.length, 'invoice') + '.');
      }]]
    });
  }

  /* ───────────── money bars ───────────── */
  function mbar(blocks, onKey) {
    return '<div class="qb-mbar qbs-mbar">' + blocks.map(function (b) {
      return '<div class="qb-mbar-block" style="flex:' + (b.flex || 1) + '">' + (b.title ? '<div class="qb-mbar-title">' + b.title + '</div>' : '') +
        '<div class="qb-mbar-row">' + b.segs.map(function (s) {
          return '<div class="qb-mbar-seg' + (s.cmd ? ' is-click' : '') + (onKey && s.key === onKey ? ' is-on' : '') + '" style="flex:' + (s.flex || 1) + '"' + (s.cmd ? ' data-qbs="' + esc(s.cmd) + '" role="button" tabindex="0"' : '') + '>' +
            '<div class="qb-mbar-amt">' + s.amount + '</div><div class="qb-mbar-lbl">' + s.label + '</div><div class="qb-mbar-bar" style="background:' + s.color + '"></div></div>';
        }).join('') + '</div></div>';
    }).join('') + '</div>';
  }
  function flexes(vals) {
    var tot = vals.reduce(function (s, v) { return s + Math.abs(v); }, 0) || 1;
    return vals.map(function (v) { return Math.max(0.18, Math.abs(v) / tot); });
  }
  /* The five-segment strip on Customers & leads and Sales transactions. */
  function custBarData(scope) {
    var r365 = U.range('last-365');
    var pick = function (t) { return !scope || scope.indexOf(t.cust) >= 0; };
    var est = visible(function (t) { return pick(t) && isOpenEst(t) && t.date >= r365[0]; });
    var unb = visible(function (t) { return pick(t) && isUnbilled(t) && t.date >= r365[0]; });
    var od = visible(function (t) { return pick(t) && isOverdue(t); });
    var open = visible(function (t) { return pick(t) && (isOpenInv(t) || isOpenCredit(t)); });
    var paid = visible(function (t) { return pick(t) && isRecentlyPaid(t); });
    function sum(list, f) { return U.r2(list.reduce(function (s, t) { return s + f(t); }, 0)); }
    return {
      est: { n: est.length, amt: sum(est, function (t) { return t.total; }) },
      unb: { n: unb.length, amt: sum(unb, function (t) { return t.total; }) },
      od: { n: od.length, amt: sum(od, openBal) },
      open: { n: open.length, amt: sum(open, openBal) },
      paid: { n: paid.length, amt: sum(paid, function (t) { return t.total; }) }
    };
  }
  function custBar(cmdPrefix, onKey) {
    var d = custBarData();
    var f1 = flexes([d.est.amt, d.unb.amt]), f2 = flexes([d.od.amt, d.open.amt]);
    return mbar([
      { title: '<b>Unbilled</b> <span class="qb-muted">Last 365 days</span>', flex: 2, segs: [
        { key: 'estimates', amount: money(d.est.amt), label: plural(d.est.n, 'estimate'), color: '#38a3e8', flex: f1[0], cmd: cmdPrefix + 'estimates' },
        { key: 'unbilled', amount: money(d.unb.amt), label: 'Unbilled income', color: '#8b5fc7', flex: f1[1], cmd: cmdPrefix + 'unbilled' }] },
      { title: '<b>Unpaid</b> <span class="qb-muted">Last 365 days</span>', flex: 2, segs: [
        { key: 'overdue', amount: money(d.od.amt), label: plural(d.od.n, 'overdue invoice'), color: '#ff8000', flex: f2[0], cmd: cmdPrefix + 'overdue' },
        { key: 'opencredits', amount: money(d.open.amt), label: d.open.n + ' open invoices and credits', color: '#babec5', flex: f2[1], cmd: cmdPrefix + 'opencredits' }] },
      { title: '<b>Paid</b>', flex: 1, segs: [
        { key: 'paid', amount: money(d.paid.amt), label: d.paid.n + ' recently paid', color: '#2ca01c', cmd: cmdPrefix + 'paid' }] }
    ], onKey);
  }
  /* Invoices strip: unpaid last 365 days and paid last 30 days. */
  function invBarData() {
    var r365 = U.range('last-365');
    var overdue = 0, notdue = 0, notDep = 0, dep = 0, nOver = 0, nDue = 0;
    visible(function (t) { return t.type === 'Invoice' && !t.voided && t.date >= r365[0]; }).forEach(function (t) {
      var ob = openBal(t); if (ob <= 0.004) return;
      if (isOverdue(t)) { overdue += ob; nOver++; } else { notdue += ob; nDue++; }
    });
    visible(function (p) { return p.type === 'Payment' && !p.voided && inRange(p.date, 'last-30'); }).forEach(function (p) {
      var amt = (p.applied || []).reduce(function (s, a) { var d = S.txn[a.id]; return s + (!a.credit && d && d.type === 'Invoice' ? a.amount : 0); }, 0);
      if (payDeposited(p)) dep += amt; else notDep += amt;
    });
    return { overdue: U.r2(overdue), notdue: U.r2(notdue), notDep: U.r2(notDep), dep: U.r2(dep), nOver: nOver, nDue: nDue };
  }

  /* Shared transaction-list columns (Sales transactions, customer page). */
  function txnRow(t) {
    return { id: t.id, t: t, date: t.date, type: t.type, no: t.no || '', cust: S.custName(t.cust), memo: t.memo || '', amount: shown(t), status: stat(t).text, created: t.created };
  }
  function txnCols() {
    return [
      { key: 'date', label: 'Date', render: function (r) { return sd(r.date); } },
      { key: 'type', label: 'Type' },
      { key: 'no', label: 'No.' },
      { key: 'cust', label: 'Customer', render: function (r) { return esc(r.cust); } },
      { key: 'memo', label: 'Memo', render: function (r) { return '<span class="qbs-memo">' + esc(r.memo) + '</span>'; } },
      { key: 'amount', label: 'Amount', align: 'right', render: function (r) { return U.num(r.amount); } },
      { key: 'status', label: 'Status', render: function (r) { return statusCell(r.t); } },
      { key: 'action', label: 'Action', sort: false, cls: 'qbs-col-act', render: function (r) { return actionCell(r.t); } }
    ];
  }
  function totalRow(rows, checkCol) {
    var tot = U.r2(rows.reduce(function (s, r) { return s + counted(r.t); }, 0));
    return '<tr>' + (checkCol ? '<td></td>' : '') + '<td colspan="5">Total</td><td class="ta-r">' + U.num(tot) + '</td><td colspan="2"></td></tr>';
  }
  var TYPE_FILTERS = [['all', 'All transactions'], ['invoices', 'All invoices'], ['open', 'Open invoices'], ['overdue', 'Overdue invoices'], ['estimates', 'Open estimates'],
    ['credit', 'Credit memos'], ['receipts', 'Sales receipts'], ['unbilled', 'Unbilled income'], ['paid', 'Recently paid'], ['money', 'Money received'], ['opencredits', 'Open invoices and credits'], ['statements', 'Statements']];
  function typePred(k) {
    return {
      invoices: function (t) { return t.type === 'Invoice'; }, open: isOpenInv, overdue: isOverdue, estimates: isOpenEst,
      credit: function (t) { return t.type === 'Credit Memo'; }, receipts: function (t) { return t.type === 'Sales Receipt'; },
      unbilled: isUnbilled, paid: isRecentlyPaid, money: function (t) { return t.type === 'Payment' || t.type === 'Sales Receipt'; },
      opencredits: function (t) { return isOpenInv(t) || isOpenCredit(t); }, statements: function (t) { return t.type === 'Statement'; }
    }[k] || function () { return true; };
  }
  var STATUS_FILTERS = [['all', 'All statuses'], ['open', 'Open'], ['overdue', 'Overdue'], ['paid', 'Paid'], ['deposited', 'Deposited'], ['Pending', 'Pending'], ['Accepted', 'Accepted'],
    ['Closed', 'Closed'], ['Converted', 'Converted'], ['Rejected', 'Rejected'], ['Applied', 'Applied'], ['Unapplied', 'Unapplied'], ['Voided', 'Voided']];
  function statusPred(k) {
    if (!k || k === 'all') return function () { return true; };
    return function (t) {
      var s = stat(t);
      if (k === 'open') return ['due', 'overdue', 'open'].indexOf(s.tone) >= 0 && s.text !== 'Rejected' && s.text !== 'Unapplied';
      if (k === 'overdue') return s.tone === 'overdue';
      if (k === 'paid') return s.tone === 'paid' || s.tone === 'deposited';
      if (k === 'deposited') return s.tone === 'deposited';
      return s.text === k;
    };
  }

  /* CSV helpers for Export / Import. */
  function downloadCsv(name, rows) {
    var csv = rows.map(function (r) {
      return r.map(function (v) { v = v == null ? '' : String(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',');
    }).join('\r\n');
    try {
      var blob = new Blob([csv], { type: 'text/csv' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      UI.toast(name + ' is ready.');
    } catch (e) { UI.toast('Export is not available in this browser.', 'err'); }
  }
  function parseCsv(text) {
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(function (c) { return c.trim(); })) rows.push(row); row = []; }
      else cur += ch;
    }
    row.push(cur); if (row.some(function (c) { return c.trim(); })) rows.push(row);
    return rows;
  }
  function importModal(kind) {
    var isItems = kind === 'items';
    var cols = isItems ? ['Name', 'Sales description', 'Type', 'Price', 'Cost', 'SKU', 'Category', 'Qty on hand'] : ['Name', 'Company', 'Email', 'Phone', 'Street', 'City', 'State', 'Zip'];
    var parsed = null;
    var m = UI.modal(isItems ? 'Import products and services' : 'Import customers',
      '<div class="qbs-import"><ol class="qbs-steps"><li class="on">Upload</li><li>Map data</li><li>Import</li></ol>' +
      '<p>Select a CSV file with a header row. These columns are read:</p><p class="qbs-cols">' + cols.map(esc).join(' · ') + '</p>' +
      '<label class="qbs-drop">' + ic('upload') + '<span>Drag and drop or <u>select a file</u></span><small class="qb-muted">CSV, up to 2 MB</small><input type="file" accept=".csv,text/csv" hidden></label>' +
      '<div class="qbs-import-msg qb-muted"></div></div>', {
        buttons: [['Cancel', 'secondary'], ['Import', 'primary', function () {
          if (!parsed || !parsed.length) { m.querySelector('.qbs-import-msg').textContent = 'Choose a CSV file first.'; return false; }
          var n = isItems ? importItems(parsed) : importCustomers(parsed);
          UI.toast(plural(n, isItems ? 'product or service' : 'customer', isItems ? 'products and services' : 'customers') + ' imported.');
        }]]
      });
    m.querySelector('input[type=file]').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var rows = parseCsv(String(rd.result || ''));
        var head = (rows.shift() || []).map(function (h) { return h.trim().toLowerCase(); });
        parsed = rows.map(function (r) { var o = {}; head.forEach(function (h, i) { o[h] = (r[i] || '').trim(); }); return o; }).filter(function (o) { return o.name; });
        m.querySelector('.qbs-import-msg').textContent = f.name + ': ' + plural(parsed.length, 'row') + ' ready to import.';
        var st = m.querySelectorAll('.qbs-steps li'); if (st[1]) st[1].classList.add('on');
      };
      rd.readAsText(f);
    });
  }
  function importCustomers(rows) {
    var n = 0;
    rows.forEach(function (o) {
      if (S.customers.some(function (c) { return c.name.toLowerCase() === o.name.toLowerCase(); })) return;
      var c = { id: U.uid('c'), name: o.name, company: o.company || '', parent: null, phone: o.phone || '', email: o.email || '', street: o.street || '', city: o.city || '', state: o.state || '', zip: o.zip || '', first: '', last: '', active: true, notes: '', terms: 'Net 30', taxable: true, type: '' };
      S.customers.push(c); S.cust[c.id] = c; n++;
    });
    if (n) S.changed('customer');
    return n;
  }
  function importItems(rows) {
    var n = 0;
    rows.forEach(function (o) {
      if (S.items.some(function (i) { return i.name.toLowerCase() === o.name.toLowerCase(); })) return;
      var ty = /inv/i.test(o.type) ? 'Inventory' : /non/i.test(o.type) ? 'Non-inventory' : /bundle/i.test(o.type) ? 'Bundle' : 'Service';
      var it = { id: U.uid('i'), name: o.name, desc: o['sales description'] || o.description || '', category: o.category || '', sku: o.sku || '', type: ty, price: U.parseMoney(o.price), cost: U.parseMoney(o.cost),
        qty: ty === 'Inventory' ? U.parseMoney(o['qty on hand']) : null, incomeAcct: ty === 'Inventory' ? 'a_sop' : 'a_serv', expenseAcct: ty === 'Inventory' ? 'a_cogs' : null, taxable: true, active: true, reorder: null, purchDesc: '' };
      S.items.push(it); S.item[it.id] = it; n++;
    });
    if (n) S.changed('item');
    return n;
  }

  /* Small modals reused by several pages. */
  function paymentLinkModal() {
    var m = UI.modal('Create payment link', '<div class="qbs-send">' + UI.field('Customer (optional)', UI.select('cust', custOptions('No customer'), '')) +
      UI.field('Amount', UI.input('amt', '', ' placeholder="$0.00" inputmode="decimal"')) + UI.field('What is this payment for?', UI.input('desc', '', ' placeholder="Description"')) +
      '<div class="qbs-link-out" hidden></div></div>', {
        buttons: [['Close', 'secondary'], ['Create link', 'primary', function (box) {
          var a = box.querySelector('[name=amt]'), v = U.parseMoney(a.value);
          if (!(v > 0)) { a.classList.add('is-err'); return false; }
          var code = Math.random().toString(36).slice(2, 10);
          var out = box.querySelector('.qbs-link-out');
          out.hidden = false;
          out.innerHTML = '<div class="qb-label">Payment link for ' + money(v) + '</div><div class="qbs-link-box"><input class="qb-input" readonly value="https://pay.practice.test/link/' + code + '"><button type="button" class="qb-btn qb-btn-secondary qb-btn-sm" data-copy>Copy link</button></div>';
          out.querySelector('[data-copy]').onclick = function () { var i = out.querySelector('input'); i.select(); try { document.execCommand('copy'); } catch (e) {} UI.toast('Link copied.'); };
          return false;
        }]]
      });
    return m;
  }
  function newRecurring(preset) {
    if (QB.forms['Recurring payment']) return QB.openForm('Recurring payment', preset || {});
    var m = UI.modal('Create recurring payment', '<div class="qbs-send">' +
      UI.field('Template name', UI.input('name', '')) +
      UI.field('Type', UI.select('type', ['Invoice', 'Sales Receipt', 'Estimate', 'Credit Memo', 'Delayed Charge'], 'Invoice')) +
      UI.field('Customer', UI.select('cust', custOptions('Choose a customer'), preset && preset.cust || '')) +
      UI.field('Schedule', UI.select('txnType', ['Scheduled', 'Reminder', 'Unscheduled'], 'Scheduled')) +
      UI.field('Interval', UI.select('interval', ['Every Week', 'Every 2 Weeks', 'Every Month', 'Every 3 Months', 'Every Year'], 'Every Month')) +
      UI.field('Start date', UI.dateInput('start', U.addDays(today(), 7))) +
      UI.field('Amount', UI.input('amt', '', ' placeholder="$0.00"')) + '</div>', {
        buttons: [['Cancel', 'secondary'], ['Save template', 'primary', function (box) {
          function v(n) { return box.querySelector('[name=' + n + ']').value; }
          var name = box.querySelector('[name=name]'), cust = v('cust');
          if (!name.value.trim()) { name.classList.add('is-err'); return false; }
          if (!cust) { box.querySelector('[name=cust]').classList.add('is-err'); return false; }
          var ty = v('txnType');
          S.recurring.push({ name: name.value.trim(), type: v('type'), txnType: ty, interval: ty === 'Unscheduled' ? '' : v('interval'), prev: '', next: ty === 'Unscheduled' ? '' : (U.parseDate(v('start')) || today()), payee: S.custName(cust), cust: cust, amount: U.parseMoney(v('amt')) });
          S.changed('recurring');
          UI.toast('Recurring template saved.');
        }]]
      });
    return m;
  }
  function stepInterval(iso, interval) {
    if (!iso) return iso;
    var map = { 'Every Day': ['d', 1], 'Every Week': ['d', 7], 'Every 2 Weeks': ['d', 14], 'Every Month': ['m', 1], 'Every 3 Months': ['m', 3], 'Every 6 Months': ['m', 6], 'Every Year': ['m', 12] };
    var s = map[interval] || ['m', 1];
    return s[0] === 'd' ? U.addDays(iso, s[1]) : U.addMonths(iso, s[1]);
  }
  function custByName(name) { return S.customers.filter(function (c) { return S.custName(c.id) === name || c.name === name; })[0]; }

  function createPills(list, expanded, toggleCmd) {
    return '<div class="qbs-create"><div class="qbs-create-h">Create actions</div><div class="qbs-pills">' + list.filter(function (p, i) { return expanded || !p[2]; }).map(function (p) {
      return '<button type="button" class="qbs-pill" data-qbs="' + esc(p[1]) + '">' + ic('plusCircle') + '<span>' + esc(p[0]) + '</span></button>';
    }).join('') + '<button type="button" class="qbs-pill qbs-pill-more" data-qbs="' + toggleCmd + '"><span>' + (expanded ? 'Show less' : 'Show all') + '</span>' + ic(expanded ? 'caretUp' : 'caretDown') + '</button></div></div>';
  }

  /* ════════════ Sales & Get Paid: Overview ════════════ */
  function incomeByDate() {
    var map = {};
    S.txns.forEach(function (t) {
      if (t.hidden) return;
      L.postings(t).forEach(function (p) { var a = S.acct[p.acct]; if (a && a.type === 'Income') map[t.date] = (map[t.date] || 0) - p.amt; });
    });
    return map;
  }
  function funnelHtml() {
    var r30 = U.range('last-30');
    var notPaid = 0, nNot = 0;
    visible(function (t) { return t.type === 'Invoice' && !t.voided && t.date >= r30[0] && t.date <= r30[1]; }).forEach(function (t) { var ob = openBal(t); if (ob > 0.004) { notPaid += ob; nNot++; } });
    var paidList = visible(function (t) { return !t.voided && (t.type === 'Payment' || t.type === 'Sales Receipt') && t.total > 0 && t.date >= r30[0] && t.date <= r30[1]; });
    var paid = paidList.reduce(function (s, t) { return s + t.total; }, 0);
    var depList = visible(function (t) { return t.type === 'Deposit' && t.date >= r30[0] && t.date <= r30[1]; });
    var dep = depList.reduce(function (s, t) { return s + t.total; }, 0);
    function stage(label, amt, sub, color, cmd) {
      return '<button type="button" class="qbs-fn-stage" data-qbs="' + cmd + '"><i style="background:' + color + '"></i><span class="qbs-fn-l">' + label + '</span><b>' + money(amt) + '</b><small>' + sub + '</small></button>';
    }
    var chev = '<span class="qbs-fn-chev">' + ic('caretRight') + '</span>';
    return '<div class="qb-card qbs-gl-card qbs-funnel-card"><div class="qbs-card-h"><span class="qb-card-title">Sales &amp; Get Paid funnel</span><span class="qb-muted qbs-small">Last 30 days</span></div><div class="qbs-funnel">' +
      '<div class="qbs-fn-start"><span class="qbs-fn-plus">' + ic('plus') + '</span><b>Create a new payment request</b><p class="qb-muted">Send invoices, payment links, and more</p>' + ddBtn('Request payment', 'reqpay', 'secondary') + '</div>' + chev +
      stage('Not Paid', notPaid, plural(nNot, 'unpaid invoice'), '#babec5', 'nav:invoices:status=unpaid:date=last-30') + chev +
      stage('Paid', paid, paidList.length + ' paid', '#7fd36e', 'nav:sales:type=money:date=last-30') + chev +
      stage('Deposited', dep, depList.length + ' deposited', '#2ca01c', 'nav:invoices:status=deposited') +
      '</div></div>';
  }
  var DUR = [['this-month', 'This month'], ['last-month', 'Last month'], ['this-quarter', 'This quarter'], ['last-quarter', 'Last quarter'], ['this-year', 'This year'], ['last-year', 'Last year']];
  function incomeChart(dur, cmp) {
    var r = U.range(dur), from = r[0], to = r[1], map = incomeByDate();
    var days = U.diffDays(to, from), step = days <= 31 ? 'day' : days <= 100 ? 'week' : 'month';
    var ends = [], cur = from;
    if (step === 'day') { while (cur <= to) { ends.push(cur); cur = U.addDays(cur, 1); } }
    else if (step === 'week') { cur = U.addDays(from, 6); while (cur < to) { ends.push(cur); cur = U.addDays(cur, 7); } ends.push(to); }
    else { var d0 = U.toDate(from); for (var mi = 0; mi < 12; mi++) { var e = U.iso(new Date(d0.getFullYear(), d0.getMonth() + mi + 1, 0)); if (e > to) break; ends.push(e); } }
    var keys = Object.keys(map);
    function cum(a, b) { var s = 0; keys.forEach(function (k) { if (k >= a && k <= b) s += map[k]; }); return U.r2(s); }
    var t = today();
    var cut = t < to ? t : to;
    var pts = ends.filter(function (e) { return e <= cut || e === ends[0]; }).map(function (e) { return { d: e, v: cum(from, e > cut ? cut : e) }; });
    var pFrom = U.addMonths(from, -12), pTo = U.addMonths(to, -12);
    var cpts = ends.map(function (e) { return { d: e, v: cum(pFrom, U.addMonths(e, -12)) }; });
    var total = cum(from, cut), prevTotal = cum(pFrom, U.addMonths(cut, -12) > pTo ? pTo : U.addMonths(cut, -12));
    var W = 640, H = 230, pl = 58, pr = 14, pt = 14, pb = 30, w = W - pl - pr, h = H - pt - pb;
    var max = Math.max.apply(null, pts.map(function (p) { return p.v; }).concat(cmp ? cpts.map(function (p) { return p.v; }) : []).concat([0]));
    var min = Math.min.apply(null, pts.map(function (p) { return p.v; }).concat(cmp ? cpts.map(function (p) { return p.v; }) : []).concat([0]));
    function nice(x) { if (x <= 0) return 100; var p = Math.pow(10, Math.floor(Math.log(x) / Math.LN10)), f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
    var top = nice(max), bot = min < 0 ? -nice(-min) : 0, span = top - bot || 1;
    function X(iso) { return pl + (days ? U.diffDays(iso, from) / days : 0) * w; }
    function Y(v) { return pt + h - (v - bot) / span * h; }
    var g = '';
    for (var i = 0; i <= 4; i++) {
      var v = bot + span * i / 4, y = Y(v);
      g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" class="qbs-ch-grid"/><text x="' + (pl - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" class="qbs-ch-lbl">' + U.money0(v) + '</text>';
    }
    var labs = step === 'month' ? ends.map(function (e) { return [e, U.MON[+e.slice(5, 7) - 1]]; }) : (function () {
      var out = [], n = step === 'day' ? 7 : 2;
      ends.forEach(function (e, k) { if (k % n === 0) out.push([e, U.MON[+e.slice(5, 7) - 1] + ' ' + (+e.slice(8))]); });
      return out;
    })();
    labs.forEach(function (l) { g += '<text x="' + X(l[0]).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" class="qbs-ch-lbl">' + l[1] + '</text>'; });
    function path(list) { return list.map(function (p, k) { return (k ? 'L' : 'M') + X(p.d).toFixed(1) + ' ' + Y(p.v).toFixed(1); }).join(''); }
    if (cmp) g += '<path d="' + path(cpts) + '" class="qbs-ch-cmp"/>';
    if (pts.length) {
      var area = path(pts) + 'L' + X(pts[pts.length - 1].d).toFixed(1) + ' ' + Y(Math.max(bot, 0)).toFixed(1) + 'L' + X(pts[0].d).toFixed(1) + ' ' + Y(Math.max(bot, 0)).toFixed(1) + 'Z';
      g += '<path d="' + area + '" class="qbs-ch-area"/><path d="' + path(pts) + '" class="qbs-ch-line"/>';
      var lp = pts[pts.length - 1];
      g += '<circle cx="' + X(lp.d).toFixed(1) + '" cy="' + Y(lp.v).toFixed(1) + '" r="4" class="qbs-ch-dot"><title>' + U.fmtDate(lp.d, 'mon') + ': ' + money(lp.v) + '</title></circle>';
    }
    var y0 = U.toDate(from).getFullYear() - 1, mo = U.toDate(from).getMonth();
    var prevLbl = dur.indexOf('month') >= 0 ? U.MON[mo] + ', ' + y0 : dur.indexOf('quarter') >= 0 ? 'Q' + (Math.floor(mo / 3) + 1) + ' ' + y0 : String(y0);
    var diff = U.r2(total - prevTotal), up = diff >= 0;
    var lbl = (DUR.filter(function (x) { return x[0] === dur; })[0] || [0, ''])[1];
    return {
      head: '<div class="qbs-io-amt">' + money(total) + '</div><div class="qb-muted">' + esc(lbl) + '</div>' +
        '<div class="qbs-io-cmp ' + (up ? 'is-up' : 'is-down') + '">' + ic(up ? 'arrowUp' : 'arrowDown') + '<span>' + money(Math.abs(diff)) + ' ' + (up ? 'more' : 'less') + ' than ' + esc(prevLbl) + '</span></div>',
      svg: '<svg class="qbs-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Income over time">' + g + '</svg>' +
        '<div class="qbs-ch-legend"><span><i class="qbs-lg-cur"></i>' + esc(lbl) + '</span>' + (cmp ? '<span><i class="qbs-lg-cmp"></i>' + esc(prevLbl) + '</span>' : '') + '</div>'
    };
  }
  QB.view('incomeoverview', function (params, el) {
    var s = state('incomeoverview', { dur: 'this-month', cmp: false, more: false });
    var PILLS = [['Get paid online', 'nav:paymentsdeposits'], ['Create invoice', 'form:Invoice'], ['Create payment link', 'paylink'], ['Create recurring payment', 'recurnew'],
      ['Create sales receipt', 'form:Sales Receipt'], ['Record payment', 'form:Receive Payment'], ['Create estimate', 'form:Estimate', 1], ['Create credit memo', 'form:Credit Memo', 1],
      ['Create refund receipt', 'form:Refund', 1], ['Create delayed charge', 'form:Delayed Charge', 1], ['Add customer', 'newcust', 1], ['Add product or service', 'newitem', 1]];
    function draw() {
      var ch = incomeChart(s.dur, s.cmp);
      el.innerHTML = '<div class="qbs qbs-overview">' + UI.pageHead('Sales &amp; Get Paid', { actions: feedback() }) +
        createPills(PILLS, s.more, 'more') +
        '<div class="qbs-gl-h"><h2>Sales &amp; Get Paid at a glance</h2></div>' +
        '<div class="qbs-gl">' + funnelHtml() +
        '<div class="qb-card qbs-gl-card qbs-io"><div class="qbs-card-h"><span class="qb-card-title">Income over time</span><span class="qbs-info" title="Income from invoices and sales receipts, before tax">' + ic('info') + '</span><span class="qb-grow"></span><span class="qb-muted qbs-small">Data updated a few seconds ago</span></div>' +
        '<div class="qbs-io-tools">' + sel('dur', DUR, s.dur, 'Duration') + '<label class="qbs-toggle-l">' + UI.toggle('cmp', s.cmp) + '<span>Compare to previous year</span></label></div>' +
        '<div class="qbs-io-head">' + ch.head + '</div>' + ch.svg +
        '<div class="qbs-card-foot">' + lnk('View sales transactions', 'nav:sales') + '</div></div>' +
        '</div></div>';
    }
    wire(el, {
      more: function () { s.more = !s.more; draw(); },
      reqpay: function (a, b) { popMenu(b, [['Invoice', 'form:Invoice'], ['Payment link', 'paylink'], ['Sales receipt', 'form:Sales Receipt'], ['Recurring payment', 'recurnew']]); }
    });
    el.addEventListener('change', function (e) {
      if (e.target.name === 'dur') { s.dur = e.target.value; draw(); }
      if (e.target.name === 'cmp') { s.cmp = e.target.checked; draw(); }
    });
    draw();
  });

  /* ════════════ Sales transactions ════════════ */
  QB.view('sales', function (params, el) {
    var s = state('sales', { type: 'all', date: 'last-3-months', cust: '', status: 'all', delivery: 'any', errors: 'any', tbl: null, size: 100 });
    takeParams(s, params, ['type', 'date', 'cust', 'status']);
    var handle;
    function rows() {
      var tp = typePred(s.type), sp = statusPred(s.status), ids = s.cust ? custIds(s.cust) : null;
      return visible(function (t) { return LIST_TYPES.indexOf(t.type) >= 0; }).filter(function (t) {
        if (!inRange(t.date, s.date)) return false;
        if (ids && ids.indexOf(t.cust) < 0) return false;
        if (!tp(t) || !sp(t)) return false;
        if (s.delivery === 'print' && !t.printLater) return false;
        if (s.delivery === 'send' && !t.sendLater) return false;
        if (s.errors === 'errors' && !t.deliveryError) return false;
        return true;
      }).sort(byDateDesc).map(txnRow);
    }
    function list() {
      var box = el.querySelector('.qbs-list');
      seedTable(box, s, { sortKey: 'date', sortDir: 'desc' });
      var data = rows();
      handle = UI.table(box, txnCols(), data, { check: true, cls: 'is-case', rowAct: function (r) { return 'txn:' + r.id; }, pageSize: s.size, pager: true, footer: totalRow(data, true), empty: 'No transactions match these filters.' });
    }
    function draw() {
      el.innerHTML = '<div class="qbs qbs-sales">' + UI.pageHead('Sales transactions', {
        actions: feedback() + btn('Create invoice', 'form:Invoice', 'secondary', 'qbs-ai-btn', 'sparkle') + '<span class="qb-beta qbs-beta">BETA</span>' + split('New transaction', 'newtxn', 'newtxn')
      }) + custBar('seg:', s.type) +
        '<div class="qbs-toolbar"><div class="qb-filters">' + ddBtn('Batch actions', 'batch') + sel('type', TYPE_FILTERS, s.type, 'Type') + sel('date', U.RANGES, s.date, 'Date') + sel('cust', custOptions(), s.cust, 'Customer') + '</div>' +
        '<div class="qb-filters qbs-sub">' + sel('status', STATUS_FILTERS, s.status) + sel('delivery', [['any', 'Delivery method'], ['print', 'Print later'], ['send', 'Send later']], s.delivery) + sel('errors', [['any', 'Errors'], ['errors', 'Delivery errors']], s.errors) +
        (s.type !== 'all' || s.status !== 'all' || s.cust || s.date !== 'last-3-months' || s.delivery !== 'any' || s.errors !== 'any' ? lnk('Clear filters', 'clear', 'qbs-clear') : '') +
        '<span class="qb-grow"></span>' + iconBtn('print', 'printlist', 'Print list') + iconBtn('export', 'export', 'Export to Excel') + iconBtn('gear', 'settings', 'Settings') + '</div></div>' +
        '<div class="qbs-list"></div></div>';
      list();
    }
    function checked() { return handle ? handle.checked().filter(function (id) { return S.txn[id]; }) : []; }
    wire(el, {
      seg: function (a) { s.type = s.type === a[0] ? 'all' : a[0]; if (s.type !== 'all') s.date = 'all'; s.tbl && (s.tbl.page = 0); draw(); },
      clear: function () { s.type = 'all'; s.date = 'last-3-months'; s.cust = ''; s.status = 'all'; s.delivery = 'any'; s.errors = 'any'; draw(); },
      newtxn: function (a, b) {
        popMenu(b, [['Invoice', 'form:Invoice'], ['Payment', 'form:Receive Payment'], ['Estimate', 'form:Estimate'], ['Payment link', 'paylink'], ['Sales receipt', 'form:Sales Receipt'],
          ['Credit memo', 'form:Credit Memo'], ['Delayed charge', 'form:Delayed Charge'], ['Time activity', 'form:Single time activity']]);
      },
      batch: function (a, b) {
        popMenu(b, [['Print transactions', function () { printTxns(checked()); }], ['Send transactions', function () { sendTxns(checked()); }], ['Send reminders', function () { sendReminders(checked()); }]], { left: true });
      },
      printlist: function () { window.print(); },
      export: function () {
        var data = rows();
        downloadCsv('SalesTransactions.csv', [['Date', 'Type', 'No.', 'Customer', 'Memo', 'Amount', 'Status']].concat(data.map(function (r) { return [U.fmtDate(r.date), r.type, r.no, r.cust, r.memo, U.r2(r.amount), r.status]; })));
      },
      settings: function (a, b) {
        popMenu(b, [{ head: 'Rows' }].concat([50, 100, 300].map(function (n) { return [(s.size === n ? '✓ ' : ' ') + n, function () { s.size = n; if (s.tbl) s.tbl.page = 0; draw(); }]; })));
      }
    });
    el.addEventListener('change', function (e) {
      var f = e.target.getAttribute('data-f'); if (!f) return;
      s[f] = e.target.value; if (s.tbl) s.tbl.page = 0; draw();
    });
    draw();
  });

  /* ════════════ Invoices ════════════ */
  var INV_STATUS = [['all', 'All'], ['attention', 'Needs attention'], ['unpaid', 'Unpaid'], ['overdue', 'Overdue'], ['notdue', 'Not due'], ['paid', 'Paid'], ['deposited', 'Deposited'], ['notdeposited', 'Not deposited']];
  function invPred(k) {
    return {
      attention: function (t) { return isOverdue(t) || !!t.deliveryError; }, unpaid: isOpenInv, overdue: isOverdue,
      notdue: function (t) { return isOpenInv(t) && !isOverdue(t); }, paid: isPaidInv,
      deposited: function (t) { return isPaidInv(t) && L.isDeposited(t); }, notdeposited: function (t) { return isPaidInv(t) && !L.isDeposited(t); }
    }[k] || function () { return true; };
  }
  function invRank(t) {
    var s = stat(t), rank = { overdue: 0, due: 1, paid: 2, deposited: 3 }[s.tone];
    if (rank == null) rank = 4;
    var partial = isOpenInv(t) && openBal(t) < t.total - 0.004 ? 1 : 0;
    return rank * 1e7 + partial * 1e6 + (t.due ? U.diffDays(t.due, '2000-01-01') : 0);
  }
  QB.view('invoices', function (params, el) {
    var s = state('invoices', { status: 'all', date: 'last-3-months', banner: true, tbl: null, showDue: false, showBal: false });
    if (takeParams(s, params, ['status', 'date']) && params.status && !params.date) s.date = 'all';
    var handle;
    function rows() {
      var p = invPred(s.status);
      return visible(function (t) { return t.type === 'Invoice' && inRange(t.date, s.date) && p(t); }).sort(byDateDesc).map(function (t) {
        return { id: t.id, t: t, date: t.date, no: t.no, cust: S.custName(t.cust), amount: t.total, due: t.due || '', bal: openBal(t), status: invRank(t) };
      });
    }
    function cols() {
      var c = [
        { key: 'date', label: 'Date', render: function (r) { return sd(r.date); } },
        { key: 'no', label: 'No.', sort: function (r) { return +r.no || 0; } },
        { key: 'cust', label: 'Customer', render: function (r) { return esc(r.cust); } }];
      if (s.showDue) c.push({ key: 'due', label: 'Due date', render: function (r) { return sd(r.due); } });
      c.push({ key: 'amount', label: 'Amount', align: 'right', render: function (r) { return money(r.amount); } });
      if (s.showBal) c.push({ key: 'bal', label: 'Balance', align: 'right', render: function (r) { return money(r.bal); } });
      c.push({ key: 'status', label: 'Status', render: function (r) { return statusCell(r.t); } },
        { key: 'action', label: 'Action <button type="button" class="qbs-th-gear" data-qbs="cols" aria-label="Table settings">' + ic('gear') + '</button>', sort: false, cls: 'qbs-col-act', render: function (r) { return actionCell(r.t); } });
      return c;
    }
    function list() {
      var box = el.querySelector('.qbs-list');
      seedTable(box, s, { sortKey: 'status', sortDir: 'asc' });
      handle = UI.table(box, cols(), rows(), { check: true, rowAct: function (r) { return 'txn:' + r.id; }, pageSize: 50, pager: true, empty: 'No invoices match these filters. Try a different status or date.' });
    }
    function draw() {
      var d = invBarData();
      var unpaid = U.r2(d.overdue + d.notdue), paid = U.r2(d.notDep + d.dep);
      var f1 = flexes([d.overdue, d.notdue]), f2 = flexes([d.notDep, d.dep]);
      var bar = mbar([
        { flex: 1.4, title: '<b>' + money(unpaid) + ' Unpaid</b> <span class="qb-muted">Last 365 days</span>', segs: [
          { key: 'overdue', amount: money(d.overdue), label: 'Overdue', color: '#ff8000', flex: f1[0], cmd: 'seg:overdue' },
          { key: 'notdue', amount: money(d.notdue), label: 'Not due yet', color: '#babec5', flex: f1[1], cmd: 'seg:notdue' }] },
        { flex: 1, title: '<b>' + money(paid) + ' Paid</b> <span class="qb-muted">Last 30 days</span>', segs: [
          { key: 'notdeposited', amount: money(d.notDep), label: 'Not deposited', color: '#8ed47f', flex: f2[0], cmd: 'seg:notdeposited' },
          { key: 'deposited', amount: money(d.dep), label: 'Deposited', color: '#2ca01c', flex: f2[1], cmd: 'seg:deposited' }] }
      ], s.status);
      el.innerHTML = '<div class="qbs qbs-invoices">' +
        (s.banner ? '<div class="qb-banner qbs-ai-banner">' + ic('sparkle') + '<span>Share a spreadsheet or files and I’ll create the invoices for you.</span>' + lnk('Add files', 'addfiles') + '<button type="button" class="qb-x" data-qbs="nobanner" aria-label="Close">' + ic('close') + '</button></div>' : '') +
        UI.pageHead('Invoices', { actions: feedback() + split('Create invoice', 'form:Invoice', 'createmenu') }) + bar +
        '<div class="qb-tabs qbs-tabs"><button type="button" class="on">All invoices</button></div>' +
        '<div class="qb-filters">' + ddBtn('Batch actions', 'batch') + sel('status', INV_STATUS, s.status, 'Status') + sel('date', U.RANGES, s.date, 'Date') +
        (s.status !== 'all' || s.date !== 'last-3-months' ? lnk('Clear filters', 'clear', 'qbs-clear') : '') + '</div>' +
        '<div class="qbs-list"></div></div>';
      list();
    }
    function checked() { return handle ? handle.checked().filter(function (id) { return S.txn[id]; }) : []; }
    wire(el, {
      seg: function (a) { s.status = s.status === a[0] ? 'all' : a[0]; s.date = s.status === 'all' ? 'last-3-months' : 'last-12-months'; if (s.tbl) s.tbl.page = 0; draw(); },
      clear: function () { s.status = 'all'; s.date = 'last-3-months'; draw(); },
      nobanner: function () { s.banner = false; draw(); },
      addfiles: function () {
        var m = UI.modal('Create invoices from files', '<p>Upload a spreadsheet, PDF or photo of your invoices. The assistant reads them and drafts invoices for you to review.</p><label class="qbs-drop">' + ic('upload') + '<span>Drag and drop or <u>select files</u></span><small class="qb-muted">PDF, CSV, XLSX, PNG or JPEG</small><input type="file" multiple hidden></label><div class="qbs-import-msg qb-muted"></div>', {
          buttons: [['Cancel', 'secondary'], ['Upload', 'primary', function (box) {
            var f = box.querySelector('input[type=file]').files;
            if (!f || !f.length) { box.querySelector('.qbs-import-msg').textContent = 'Choose at least one file.'; return false; }
            UI.toast('Got it. In the real product, draft invoices from ' + plural(f.length, 'file') + ' show up for review.');
          }]]
        });
        m.querySelector('input[type=file]').addEventListener('change', function (e) { m.querySelector('.qbs-import-msg').textContent = plural(e.target.files.length, 'file') + ' selected.'; });
      },
      createmenu: function (a, b) { popMenu(b, [['Import invoices', function () { importInvoicesInfo(); }], ['Create recurring invoice', 'recurnew']]); },
      batch: function (a, b) {
        popMenu(b, [['Print transactions', function () { printTxns(checked()); }], ['Send transactions', function () { sendTxns(checked()); }], ['Send reminders', function () { sendReminders(checked()); }]], { left: true });
      },
      cols: function (a, b) {
        popMenu(b, [{ head: 'Columns' }, [(s.showDue ? '✓ ' : ' ') + 'Due date', function () { s.showDue = !s.showDue; draw(); }], [(s.showBal ? '✓ ' : ' ') + 'Balance', function () { s.showBal = !s.showBal; draw(); }]]);
      }
    });
    el.addEventListener('change', function (e) {
      var f = e.target.getAttribute('data-f'); if (!f) return;
      s[f] = e.target.value; if (s.tbl) s.tbl.page = 0; draw();
    });
    draw();
  });
  function importInvoicesInfo() {
    UI.modal('Import invoices', '<p>Bring invoices in from a CSV file: invoice number, customer, invoice date, due date, product or service, quantity and rate.</p><p class="qb-muted">Importing invoices is not part of this practice copy. Create invoices with <b>Create invoice</b> instead.</p>', { buttons: [['Got it', 'primary']] });
  }

  /* ════════════ Recurring payments ════════════ */
  QB.view('recurringsales', function (params, el) {
    var s = state('recurringsales', { q: '' });
    function list() {
      var data = S.recurring.map(function (r, i) { return Object.assign({ id: 'r' + i, idx: i }, r); }).filter(function (r) {
        return RECUR_SALES.indexOf(r.type) >= 0 && (!s.q || (r.name + ' ' + r.payee).toLowerCase().indexOf(s.q.toLowerCase()) >= 0);
      });
      var box = el.querySelector('.qbs-list');
      seedTable(box, s, { sortKey: 'name', sortDir: 'asc' });
      UI.table(box, [
        { key: 'name', label: 'Template name', render: function (r) { return '<b>' + esc(r.name) + '</b>' + (r.paused ? ' <span class="qbs-tag">Paused</span>' : ''); } },
        { key: 'type', label: 'Type' },
        { key: 'txnType', label: 'Txn type' },
        { key: 'interval', label: 'Interval' },
        { key: 'prev', label: 'Previous date', render: function (r) { return U.fmtDate(r.prev); } },
        { key: 'next', label: 'Next date', render: function (r) { return r.paused ? '' : U.fmtDate(r.next); } },
        { key: 'payee', label: 'Customer', render: function (r) { return esc(r.payee); } },
        { key: 'amount', label: 'Amount', align: 'right', render: function (r) { return U.num(r.amount); } },
        { key: 'act', label: 'Action', sort: false, cls: 'qbs-col-act', render: function (r) { return '<span class="qb-act">' + lnk('Edit', 'redit:' + r.idx) + '<button type="button" class="qb-act-caret" data-qbs="rmenu:' + r.idx + '" aria-label="More">' + ic('caretDown') + '</button></span>'; } }
      ], data, { empty: 'No recurring payments yet.' });
    }
    function draw() {
      var any = S.recurring.some(function (r) { return RECUR_SALES.indexOf(r.type) >= 0; });
      el.innerHTML = '<div class="qbs qbs-recur">' + UI.pageHead('Recurring payments', { actions: feedback() + btn('Create recurring payment', 'recurnew', 'primary') }) +
        (any ? '' : '<div class="qbs-empty">' + QB.art('docs') + '<h2>Get paid on time, every time</h2><p>Set up recurring payments to send invoices or charge customers automatically on a schedule. No more reminders to yourself.</p>' + btn('Create recurring payment', 'recurnew', 'primary') + '</div>') +
        (any ? '<div class="qb-filters"><div class="qb-search-box qbs-search">' + '<input class="qb-input" data-q placeholder="Filter by name" value="' + esc(s.q) + '">' + ic('search') + '</div></div><div class="qbs-list"></div>' : '') + '</div>';
      if (any) list();
    }
    function rec(i) { return S.recurring[+i]; }
    wire(el, {
      redit: function (a) { var r = rec(a[0]); if (r) editRecurring(r); },
      rmenu: function (a, b) {
        var r = rec(a[0]); if (!r) return;
        popMenu(b, [
          ['Use', function () { var c = custByName(r.payee); QB.openForm(r.type === 'Delayed Charge' ? 'Delayed Charge' : r.type, c ? { cust: c.id } : {}); }],
          ['Duplicate', function () { S.recurring.push(Object.assign({}, r, { name: r.name + ' (copy)' })); S.changed('recurring'); UI.toast('Template duplicated.'); }],
          [r.paused ? 'Resume' : 'Pause', function () { r.paused = !r.paused; S.changed('recurring'); UI.toast(r.paused ? 'Template paused.' : 'Template resumed.'); }],
          ['Skip next date', function () { if (!r.next) return UI.toast('This template has no schedule.', 'err'); r.prev = r.next; r.next = stepInterval(r.next, r.interval); S.changed('recurring'); UI.toast('Next date moved to ' + U.fmtDate(r.next) + '.'); }, !r.next],
          { sep: true },
          ['Delete', function () { UI.confirm('Delete template', 'Are you sure you want to delete "' + r.name + '"?', 'Yes, delete', function () { S.recurring.splice(S.recurring.indexOf(r), 1); S.changed('recurring'); UI.toast('Template deleted.'); }); }]
        ]);
      }
    });
    el.addEventListener('input', function (e) { if (e.target.hasAttribute('data-q')) { s.q = e.target.value; list(); } });
    draw();
  });
  function editRecurring(r) {
    UI.modal('Edit recurring template', '<div class="qbs-send">' + UI.field('Template name', UI.input('name', r.name)) +
      UI.field('Schedule', UI.select('txnType', ['Scheduled', 'Reminder', 'Unscheduled'], r.txnType)) +
      UI.field('Interval', UI.select('interval', ['Every Week', 'Every 2 Weeks', 'Every Month', 'Every 3 Months', 'Every Year'], r.interval || 'Every Month')) +
      UI.field('Next date', UI.dateInput('next', r.next)) + UI.field('Amount', UI.input('amt', U.num(r.amount))) + '</div>', {
        buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (box) {
          function v(n) { return box.querySelector('[name=' + n + ']').value; }
          if (!v('name').trim()) return false;
          r.name = v('name').trim(); r.txnType = v('txnType'); r.interval = r.txnType === 'Unscheduled' ? '' : v('interval');
          r.next = r.txnType === 'Unscheduled' ? '' : (U.parseDate(v('next')) || r.next); r.amount = U.parseMoney(v('amt'));
          S.changed('recurring'); UI.toast('Template saved.');
        }]]
      });
  }

  /* ════════════ Sales orders ════════════ */
  QB.view('salesorders', function (params, el) {
    var s = state('salesorders', {});
    var list = visible(function (t) { return t.type === 'Sales Order'; }).sort(byDateDesc);
    el.innerHTML = '<div class="qbs qbs-so">' + UI.pageHead('Sales orders', { actions: feedback() + (list.length ? btn('Create sales order', 'form:Sales Order', 'primary') : '') }) +
      (list.length ? '<div class="qbs-list"></div>' :
        '<div class="qbs-empty">' + QB.art('box') + '<h2>Keep track of what customers order</h2><p>Create sales orders to record what your customers want before you invoice them. When the order ships, turn it into an invoice in one click.</p>' +
        btn('Create sales order', 'form:Sales Order', 'primary') + '</div>') + '</div>';
    wire(el, {});
    if (list.length) {
      var box = el.querySelector('.qbs-list'); seedTable(box, s, { sortKey: 'date', sortDir: 'desc' });
      UI.table(box, [
        { key: 'date', label: 'Date', render: function (r) { return sd(r.date); } }, { key: 'no', label: 'No.' },
        { key: 'cust', label: 'Customer', render: function (r) { return esc(r.cust); } }, { key: 'amount', label: 'Amount', align: 'right', render: function (r) { return money(r.amount); } },
        { key: 'status', label: 'Status', render: function (r) { return statusCell(r.t); } }, { key: 'action', label: 'Action', sort: false, cls: 'qbs-col-act', render: function (r) { return actionCell(r.t); } }
      ], list.map(txnRow), { check: true, rowAct: function (r) { return 'txn:' + r.id; } });
    }
  });

  /* ════════════ Sales channels ════════════ */
  var CHANNELS = [
    ['shopify', 'Shopify', 'Sync orders, payouts, fees and refunds from your Shopify store.', '<span class="qbs-logo-shopify">' + '<svg viewBox="0 0 20 22" aria-hidden="true"><path d="M3 6l7-3 7 3-1.5 14h-11z" fill="#95bf47"/><path d="M8 9c0-2 4-2 4 0 0 2-4 2-4 4s4 2 4 0" stroke="#fff" stroke-width="1.6" fill="none"/></svg>shopify</span>'],
    ['amazon', 'Amazon', 'Bring in Amazon sales, fees and settlements automatically.', '<span class="qbs-logo-amazon">amazon<svg viewBox="0 0 60 10" aria-hidden="true"><path d="M4 2c14 8 34 8 50 0" stroke="#ff9900" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M50 0l5 2-3 4" stroke="#ff9900" stroke-width="2" fill="none"/></svg></span>'],
    ['ebay', 'eBay', 'Record eBay orders and payouts without typing them in.', '<span class="qbs-logo-ebay"><i style="color:#e53238">e</i><i style="color:#0064d2">b</i><i style="color:#f5af02">a</i><i style="color:#86b817">y</i></span>'],
    ['square', 'Square', 'Import Square sales, tips, taxes and fees every day.', '<span class="qbs-logo-square"><i></i>Square</span>'],
    ['etsy', 'Etsy', 'Keep Etsy orders, shipping and fees in sync.', '<span class="qbs-logo-etsy">Etsy</span>'],
    ['woo', 'WooCommerce', 'Connect your WooCommerce shop to see sales in QuickBooks.', '<span class="qbs-logo-woo"><b>Woo</b>Commerce</span>']
  ];
  QB.view('commerce', function (params, el) {
    var s = state('commerce', { on: {} });
    function draw() {
      el.innerHTML = '<div class="qbs qbs-channels">' + UI.pageHead('Sales channels', { actions: feedback() }) +
        '<p class="qbs-lead">Connect the places you sell online. Orders, payouts and fees flow into QuickBooks automatically, so your books stay up to date without extra typing.</p>' +
        '<h2 class="qbs-h2">Connect a channel</h2><div class="qbs-chan-grid">' + CHANNELS.map(function (c) {
          var on = s.on[c[0]];
          return '<div class="qb-card qbs-chan"><div class="qbs-chan-logo">' + c[3] + '</div><p>' + esc(c[2]) + '</p>' +
            (on ? '<div class="qbs-chan-on">' + ic('checkCircle') + '<span>Connected ' + U.fmtDate(on, 'mon') + '</span></div>' + btn('Disconnect', 'off:' + c[0], 'tertiary') : btn('Connect', 'on:' + c[0], 'secondary')) + '</div>';
        }).join('') + '</div></div>';
    }
    wire(el, {
      on: function (a) {
        var c = CHANNELS.filter(function (x) { return x[0] === a[0]; })[0];
        UI.modal('Connect ' + c[1], '<div class="qbs-chan-logo qbs-chan-big">' + c[3] + '</div><p>QuickBooks will ask ' + esc(c[1]) + ' for permission to read your orders, payouts and fees. You choose which bank account deposits go to.</p>' +
          UI.field('Deposit payouts to', UI.select('acct', S.accountsBy(['Bank']).map(function (x) { return [x.id, x.name]; }), 'a_chk')) +
          '<p class="qb-muted qbs-small">This practice copy does not leave the page. Connecting here only simulates the link.</p>', {
            buttons: [['Cancel', 'secondary'], ['Continue', 'primary', function () { s.on[c[0]] = today(); draw(); UI.toast(c[1] + ' is connected.'); }]]
          });
      },
      off: function (a) {
        var c = CHANNELS.filter(function (x) { return x[0] === a[0]; })[0];
        UI.confirm('Disconnect ' + c[1], 'New ' + c[1] + ' sales will stop coming into QuickBooks. Transactions already imported stay.', 'Disconnect', function () { delete s.on[c[0]]; draw(); UI.toast(c[1] + ' was disconnected.'); });
      }
    });
    draw();
  });

  /* ════════════ QuickBooks payouts ════════════ */
  QB.view('paymentsdeposits', function (params, el) {
    var s = state('paymentsdeposits', { setup: false });
    function draw() {
      el.innerHTML = '<div class="qbs qbs-payouts">' + UI.pageHead('QuickBooks payouts', { actions: feedback() }) +
        (s.setup ? '<div class="qb-banner">' + ic('info') + '<span>Your QuickBooks Payments application is under review. Payouts appear here once customers start paying online.</span></div>' :
          UI.hero({ grey: true, title: 'Get paid up to 2x faster', lead: 'Set up QuickBooks Payments to accept cards, Apple Pay and bank transfers right from your invoices.',
            body: '<ul class="qbs-bullets"><li>Customers pay with one click from the invoice email</li><li>Payments match to invoices and post to your books</li><li>Standard payouts typically process in 1-5 business days</li></ul>',
            actions: btn('Set up payments', 'setup', 'primary') + btn('Learn more', 'learn', 'tertiary'), art: QB.art('phone') })) +
        '<div class="qbs-sec-h"><h2 class="qbs-h2">Payouts</h2><span class="qb-grow"></span>' + sel('pdate', U.RANGES, 'last-30') + '</div><div class="qbs-list"></div></div>';
      UI.table(el.querySelector('.qbs-list'), [
        { key: 'date', label: 'Date initiated' }, { key: 'exp', label: 'Expected deposit' }, { key: 'status', label: 'Status' }, { key: 'type', label: 'Type' },
        { key: 'acct', label: 'Deposit account' }, { key: 'fees', label: 'Fees', align: 'right' }, { key: 'amt', label: 'Payout amount', align: 'right' }
      ], [], { empty: '<div class="qbs-empty-row"><b>No payouts yet</b><br>Once customers pay you through QuickBooks Payments, each payout shows here with its fees and deposit date.</div>' });
    }
    wire(el, {
      setup: function () {
        UI.modal('Set up QuickBooks Payments', '<p>Tell us a bit about your business, verify your identity and pick the bank account for deposits. Approval usually takes a few minutes.</p><ol class="qbs-ol"><li>Business info</li><li>Owner info</li><li>Bank account for deposits</li></ol><p class="qb-muted qbs-small">This practice copy does not collect business or bank details.</p>', {
          buttons: [['Cancel', 'secondary'], ['Start application', 'primary', function () { s.setup = true; draw(); UI.toast('Payments application started.'); }]]
        });
      },
      learn: function () { UI.modal('QuickBooks Payments', '<p>Accept credit and debit cards, Apple Pay, PayPal and ACH bank transfers on invoices and payment links. Payments are deposited to your bank and recorded in QuickBooks automatically.</p>', { buttons: [['Got it', 'primary']] }); }
    });
    draw();
  });

  /* ════════════ Products & services ════════════ */
  var ITEM_TYPES = ['Inventory', 'Non-inventory', 'Service', 'Bundle'];
  function isLow(it) { return it.type === 'Inventory' && it.qty > 0 && it.reorder != null && it.qty <= it.reorder; }
  function isOut(it) { return it.type === 'Inventory' && (it.qty || 0) <= 0; }
  function priceTxt(v) { return v ? esc(num(v)) : ''; }
  function itemMenu(it, a) {
    if (!it) return;
    var inv = it.type === 'Inventory';
    popMenu(a, [
      [it.active === false ? 'Make active' : 'Make inactive', function () {
        if (it.active === false) { it.active = true; S.changed('item'); UI.toast(it.name + ' is active again.'); return; }
        UI.confirm('Make inactive', 'Are you sure you want to make ' + it.name + ' inactive?' + (inv && it.qty ? ' It still has ' + num(it.qty) + ' on hand.' : ''), 'Yes, make inactive', function () { it.active = false; S.changed('item'); UI.toast(it.name + ' is now inactive.'); });
      }],
      ['Run report', function () { QB.go('report', { name: inv ? 'Inventory Valuation Detail' : 'Sales by Product/Service Detail', item: it.id }); }],
      ['Duplicate', function () {
        var c = Object.assign({}, it, { id: U.uid('i'), name: it.name + ' (copy)', sku: '', qty: inv ? 0 : it.qty });
        S.items.push(c); S.item[c.id] = c; S.changed('item');
        QB.openForm('Product/Service', { item: c, type: c.type });
      }],
      ['Adjust quantity', function () { QB.openForm('Inventory Qty Adjust', { item: it }); }, !inv],
      ['Reorder', function () { QB.openForm('Purchase Order', { item: it }); }, !inv]
    ]);
  }
  QB.view('items', function (params, el) {
    var s = state('items', { q: '', type: 'all', stock: 'any', cat: '', active: 'active', tbl: null, compact: false, updated: Date.now(), hide: {} });
    takeParams(s, params, ['type', 'stock']);
    var handle;
    function rows() {
      var q = s.q.trim().toLowerCase();
      return S.items.filter(function (it) {
        if (s.active === 'active' && it.active === false) return false;
        if (s.active === 'inactive' && it.active !== false) return false;
        if (s.type !== 'all' && it.type !== s.type) return false;
        if (s.stock === 'low' && !isLow(it)) return false;
        if (s.stock === 'out' && !isOut(it)) return false;
        if (s.cat && (it.category || '').indexOf(s.cat) !== 0) return false;
        if (q && (it.name + ' ' + (it.sku || '') + ' ' + (it.category || '')).toLowerCase().indexOf(q) < 0) return false;
        return true;
      }).map(function (it) { return { id: it.id, it: it, name: it.name, desc: it.desc || '', qty: it.type === 'Inventory' ? +it.qty || 0 : -1e9, category: it.category || '', sku: it.sku || '', type: it.type, price: +it.price || 0, cost: +it.cost || 0 }; });
    }
    function cols() {
      var all = [
        { key: 'img', label: '', sort: false, cls: 'qbs-col-img', render: function () { return '<span class="qbs-img">' + ic('camera') + '</span>'; } },
        { key: 'name', label: 'Name', render: function (r) { return '<button type="button" class="qb-link qbs-iname" data-qbs="itemedit:' + r.id + '">' + esc(r.name) + '</button>' + (r.it.active === false ? ' <span class="qbs-tag">Inactive</span>' : ''); } },
        { key: 'desc', label: 'Sales description', render: function (r) { return '<span class="qbs-memo">' + esc(r.desc) + '</span>'; } },
        { key: 'qty', label: 'Qty on hand', align: 'right', render: function (r) { return r.it.type === 'Inventory' ? '<span class="' + (isOut(r.it) ? 'qbs-out' : isLow(r.it) ? 'qbs-low' : '') + '">' + num(r.it.qty) + '</span>' : ''; } },
        { key: 'category', label: 'Category' },
        { key: 'sku', label: 'SKU' },
        { key: 'type', label: 'Type' },
        { key: 'price', label: 'Price', align: 'right', render: function (r) { return priceTxt(r.price); } },
        { key: 'cost', label: 'Cost', align: 'right', render: function (r) { return priceTxt(r.cost); } },
        { key: 'act', label: 'Actions', sort: false, cls: 'qbs-col-act', render: function (r) { return '<span class="qb-act">' + lnk('Edit', 'itemedit:' + r.id) + '<button type="button" class="qb-act-caret" data-qbs="itemmenu:' + r.id + '" aria-label="More">' + ic('caretDown') + '</button></span>'; } }
      ];
      return all.filter(function (c) { return !s.hide[c.key]; });
    }
    function list() {
      var box = el.querySelector('.qbs-list');
      seedTable(box, s, { sortKey: 'name', sortDir: 'asc' });
      handle = UI.table(box, cols(), rows(), { check: true, cls: s.compact ? 'qbs-compact' : '', pageSize: 50, pager: true, empty: 'No products or services match. Try a different search or filter.' });
    }
    function draw() {
      var invs = S.items.filter(function (i) { return i.active !== false && i.type === 'Inventory'; });
      var low = invs.filter(isLow).length, out = invs.filter(isOut).length;
      var mins = Math.round((Date.now() - s.updated) / 60000);
      el.innerHTML = '<div class="qbs qbs-items">' + UI.pageHead('Products &amp; services', {
        actions: feedback() + ddBtn('More', 'more', 'secondary') + split('New product/service', 'newitem', 'newmenu')
      }) +
        '<div class="qbs-tiles"><button type="button" class="qbs-tile' + (s.stock === 'low' ? ' on' : '') + '" data-qbs="stock:low"><span class="qbs-tile-ic is-low">' + ic('box') + '</span><span><b>' + low + '</b><small>LOW STOCK</small></span></button>' +
        '<button type="button" class="qbs-tile' + (s.stock === 'out' ? ' on' : '') + '" data-qbs="stock:out"><span class="qbs-tile-ic is-out">' + ic('alert') + '</span><span><b>' + out + '</b><small>OUT OF STOCK</small></span></button></div>' +
        '<div class="qbs-updated qb-muted">Updated ' + (mins < 1 ? 'less than a minute ago' : plural(mins, 'minute') + ' ago') + '</div>' +
        '<div class="qbs-toolbar"><div class="qb-filters">' +
        '<label class="qb-field qbs-fld"><span class="qb-label">Search</span><span class="qb-search-box qbs-search"><input class="qb-input" data-q placeholder="Search by name, SKU or category" value="' + esc(s.q) + '">' + ic('search') + '</span></label>' +
        sel('type', [['all', 'All']].concat(ITEM_TYPES.map(function (t) { return [t, t]; })), s.type, 'Type') +
        sel('stock', [['any', 'Any'], ['low', 'Low stock'], ['out', 'Out of stock']], s.stock, 'Stock status') +
        '<button type="button" class="qb-btn qb-btn-tertiary qbs-filter-btn" data-qbs="filters">' + ic('filter') + '<span>Filters' + (s.cat || s.active !== 'active' ? ' (' + ((s.cat ? 1 : 0) + (s.active !== 'active' ? 1 : 0)) + ')' : '') + '</span></button>' +
        (s.q || s.type !== 'all' || s.stock !== 'any' || s.cat || s.active !== 'active' ? lnk('Clear filters', 'clear', 'qbs-clear') : '') + '</div>' +
        '<div class="qb-filters qbs-sub"><span class="qb-grow"></span>' + lnk('Customize', 'customize') + iconBtn('pencil', 'batch', 'Batch edit') + iconBtn('expand', 'compact', s.compact ? 'Comfortable rows' : 'Compact rows') +
        iconBtn('refresh', 'refresh', 'Refresh') + iconBtn('print', 'printlist', 'Print') + iconBtn('export', 'export', 'Export') + '</div></div>' +
        '<div class="qbs-list"></div></div>';
      list();
    }
    function checkedItems() { return handle ? handle.checked().map(function (id) { return S.item[id]; }).filter(Boolean) : []; }
    wire(el, {
      stock: function (a) { s.stock = s.stock === a[0] ? 'any' : a[0]; if (s.stock !== 'any') s.type = 'all'; draw(); },
      clear: function () { s.q = ''; s.type = 'all'; s.stock = 'any'; s.cat = ''; s.active = 'active'; draw(); },
      newmenu: function (a, b) { popMenu(b, ITEM_TYPES.map(function (t) { return [t, 'newitem:' + t]; })); },
      more: function (a, b) {
        popMenu(b, [['Run report', function () { QB.go('report', { name: 'Product/Service List' }); }], ['Manage categories', manageCategories], ['Import', function () { importModal('items'); }], ['Export', exportItems]]);
      },
      filters: function () {
        var cats = categories();
        UI.modal('Filters', '<div class="qbs-send">' + UI.field('Category', UI.select('cat', [['', 'All categories']].concat(cats.map(function (c) { return [c, c]; })), s.cat)) +
          UI.field('Status', UI.select('active', [['active', 'Active'], ['inactive', 'Inactive'], ['all', 'All']], s.active)) + '</div>', {
            buttons: [['Reset', 'secondary', function () { s.cat = ''; s.active = 'active'; draw(); }], ['Apply', 'primary', function (box) { s.cat = box.querySelector('[name=cat]').value; s.active = box.querySelector('[name=active]').value; draw(); }]]
          });
      },
      customize: function (a, b) {
        var names = { desc: 'Sales description', qty: 'Qty on hand', category: 'Category', sku: 'SKU', type: 'Type', price: 'Price', cost: 'Cost' };
        popMenu(b, [{ head: 'Columns' }].concat(Object.keys(names).map(function (k) { return [(s.hide[k] ? ' ' : '✓ ') + names[k], function () { s.hide[k] = !s.hide[k]; draw(); }]; })));
      },
      batch: function (a, b) {
        popMenu(b, [['Make inactive', function () {
          var list = checkedItems(); if (!list.length) return UI.toast('Select products or services first.', 'err');
          UI.confirm('Make inactive', 'Make ' + plural(list.length, 'item') + ' inactive?', 'Yes', function () { list.forEach(function (i) { i.active = false; }); s.tbl.checked = {}; S.changed('item'); UI.toast(plural(list.length, 'item') + ' made inactive.'); });
        }], ['Assign category', function () {
          var list = checkedItems(); if (!list.length) return UI.toast('Select products or services first.', 'err');
          UI.modal('Assign category', UI.field('Category', UI.select('cat', categories().map(function (c) { return [c, c]; }), categories()[0])), {
            buttons: [['Cancel', 'secondary'], ['Apply', 'primary', function (box) { var c = box.querySelector('[name=cat]').value; list.forEach(function (i) { i.category = c; }); s.tbl.checked = {}; S.changed('item'); UI.toast('Category updated.'); }]]
          });
        }]]);
      },
      compact: function () { s.compact = !s.compact; draw(); },
      refresh: function () { s.updated = Date.now(); draw(); UI.toast('Products and services are up to date.'); },
      printlist: function () { window.print(); },
      export: function () { exportItems(); }
    });
    function exportItems() {
      downloadCsv('ProductServiceList.csv', [['Product/Service Name', 'Sales Description', 'SKU', 'Type', 'Sales Price / Rate', 'Purchase Cost', 'Qty On Hand', 'Category']].concat(rows().map(function (r) {
        return [r.name, r.desc, r.sku, r.type, r.price || '', r.cost || '', r.it.type === 'Inventory' ? r.it.qty : '', r.category];
      })));
    }
    el.addEventListener('change', function (e) {
      var f = e.target.getAttribute('data-f'); if (!f) return;
      s[f] = e.target.value; if (s.tbl) s.tbl.page = 0; draw();
    });
    el.addEventListener('input', function (e) { if (e.target.hasAttribute('data-q')) { s.q = e.target.value; if (s.tbl) s.tbl.page = 0; list(); } });
    draw();
  });
  var extraCats = [];
  function categories() {
    var set = {};
    S.items.concat(extraCats.map(function (c) { return { category: c }; })).forEach(function (i) {
      var c = i.category || ''; if (!c) return;
      var parts = c.split(':');
      for (var k = 1; k <= parts.length; k++) set[parts.slice(0, k).join(':')] = true;
    });
    return Object.keys(set).sort();
  }
  function manageCategories() {
    function body() {
      return '<div class="qbs-cats">' + categories().map(function (c) {
        var n = S.items.filter(function (i) { return (i.category || '') === c || (i.category || '').indexOf(c + ':') === 0; }).length;
        var depth = c.split(':').length - 1;
        return '<div class="qbs-cat-row" style="padding-left:' + (depth * 18) + 'px"><span>' + esc(c.split(':').pop()) + '</span><span class="qb-muted">' + plural(n, 'item') + '</span></div>';
      }).join('') + '</div><div class="qbs-cat-new">' + UI.field('New category', UI.input('newcat', '', ' placeholder="Name, use : for a subcategory"')) + '</div>';
    }
    UI.modal('Manage categories', body(), {
      buttons: [['Close', 'secondary'], ['Add category', 'primary', function (m) {
        var i = m.querySelector('[name=newcat]'), v = i.value.trim();
        if (!v) { i.classList.add('is-err'); return false; }
        if (categories().indexOf(v) < 0) extraCats.push(v);
        m.querySelector('.qb-modal-body').innerHTML = body();
        UI.toast('Category ' + v + ' added.');
        return false;
      }]]
    });
  }

  /* ════════════ Customer Hub: Overview ════════════ */
  QB.view('customers-overview', function (params, el) {
    var od = visible(isOverdue).sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
    var odTotal = U.r2(od.reduce(function (s, t) { return s + openBal(t); }, 0));
    var est = visible(isOpenEst).sort(byDateDesc);
    var tasks = (S.tasks || []).filter(function (t) { return !(t.done || t.completed || t.status === 'Done' || t.status === 'Completed'); });
    function taskF(t, k) { return { title: t.title || t.name || t.subject || 'Task', who: t.assignee || t.assignedTo || 'Craig Carlson', due: t.due || t.dueDate || '' }[k]; }
    el.innerHTML = '<div class="qbs qbs-hub">' + UI.pageHead('Customer Hub', { actions: feedback() }) +
      '<div class="qbs-gl-h"><h2>Customers at a glance</h2></div><div class="qbs-hub-grid">' +
      '<div class="qb-card qbs-gl-card"><div class="qbs-card-h"><span class="qb-card-title">Overdue invoices</span><span class="qb-muted qbs-small">As of today</span></div>' +
      '<div class="qbs-big">' + money(odTotal) + '</div><div class="qb-muted qbs-small">Total of overdue invoices</div>' +
      (od.length ? '<table class="qbs-mini"><thead><tr><th>Client</th><th>Date</th><th class="ta-r">Amount</th></tr></thead><tbody>' + od.slice(0, 4).map(function (t) {
        var c = S.cust[t.cust] || {};
        return '<tr class="is-click" data-qbs="open:' + t.id + '"><td>' + esc(c.name) + '</td><td>' + sd(t.due) + '</td><td class="ta-r">' + U.num(openBal(t)) + '</td></tr>';
      }).join('') + '</tbody></table>' : '<p class="qb-muted">No overdue invoices. Nice work!</p>') +
      '<div class="qbs-card-foot">' + lnk('View invoices', 'nav:invoices:status=overdue') + '</div></div>' +
      '<div class="qb-card qbs-gl-card"><div class="qbs-card-h"><span class="qb-card-title">Open estimates</span></div>' +
      (est.length ? '<div class="qbs-big">' + money(est.reduce(function (s, t) { return s + t.total; }, 0)) + '</div><div class="qb-muted qbs-small">' + plural(est.length, 'open estimate') + '</div><table class="qbs-mini"><thead><tr><th>Client</th><th>Date</th><th class="ta-r">Amount</th></tr></thead><tbody>' + est.slice(0, 4).map(function (t) {
        return '<tr class="is-click" data-qbs="open:' + t.id + '"><td>' + esc((S.cust[t.cust] || {}).name) + '</td><td>' + sd(t.date) + '</td><td class="ta-r">' + U.num(t.total) + '</td></tr>';
      }).join('') + '</tbody></table><div class="qbs-card-foot">' + lnk('View estimates', 'nav:estimates') + '</div>'
        : '<div class="qbs-card-empty">' + QB.art('docs') + '<b>You have no open estimates.</b><p class="qb-muted">Create an estimate to win more jobs!</p>' + btn('Create an estimate', 'form:Estimate', 'secondary') + '</div>') + '</div>' +
      '<div class="qb-card qbs-gl-card qbs-hub-wide"><div class="qbs-card-h"><span class="qb-card-title">Needs attention</span><span class="qb-grow"></span>' + lnk('Create task', 'form:Task') + '</div>' +
      '<table class="qbs-mini"><thead><tr><th>Task</th><th>Assigned To</th><th>Due Date</th><th class="ta-r">Actions</th></tr></thead><tbody>' +
      (tasks.length ? tasks.map(function (t, i) {
        return '<tr><td>' + esc(taskF(t, 'title')) + '</td><td>' + esc(taskF(t, 'who')) + '</td><td>' + esc(sd(taskF(t, 'due'))) + '</td><td class="ta-r"><span class="qb-act">' + lnk('Mark complete', 'taskdone:' + i) + '</span></td></tr>';
      }).join('') : '<tr><td colspan="4" class="qbs-mini-empty">' + ic('checkCircle') + ' You’re all caught up. No tasks need your attention.</td></tr>') + '</tbody></table></div>' +
      '<div class="qb-card qbs-gl-card qbs-hub-wide"><div class="qbs-card-h"><span class="qb-card-title">Shortcuts</span></div><div class="qbs-shortcuts">' +
      [['New Customer', 'newcust', 'user'], ['Import Customers', 'importcust', 'upload'], ['Create Invoice', 'form:Invoice', 'doc'], ['Add estimate', 'form:Estimate', 'pencil']].map(function (x) {
        return '<button type="button" class="qbs-short" data-qbs="' + x[1] + '"><span class="qbs-short-ic">' + ic(x[2]) + '</span><span>' + x[0] + '</span></button>';
      }).join('') + '</div></div></div></div>';
    wire(el, {
      taskdone: function (a) { var t = tasks[+a[0]]; if (!t) return; t.done = true; t.status = 'Completed'; S.changed('task'); UI.toast('Task completed.'); }
    });
  });

  /* ════════════ Customers & leads ════════════ */
  var LEADS = [];
  var SEG_PRED = { estimates: isOpenEst, unbilled: isUnbilled, overdue: isOverdue, opencredits: function (t) { return isOpenInv(t) || isOpenCredit(t); }, paid: isRecentlyPaid };
  var SEG_LABEL = { estimates: 'Estimates', unbilled: 'Unbilled income', overdue: 'Overdue invoices', opencredits: 'Open invoices and credits', paid: 'Recently paid' };
  QB.view('customers', function (params, el) {
    var s = state('customers', { tab: 'customers', q: '', seg: '', tbl: null, cols: { company: true, phone: true, email: false, address: false, ctype: false }, inactive: false, rows: 50, collapsed: false });
    takeParams(s, params, ['tab', 'seg']);
    var handle;
    function matchSeg(c) {
      if (!s.seg) return true;
      var p = SEG_PRED[s.seg];
      return visible(function (t) { return t.cust === c.id && p(t); }).length > 0;
    }
    function rows() {
      var q = s.q.trim().toLowerCase(), out = [];
      function ok(c) {
        if (!s.inactive && c.active === false) return false;
        if (q && (c.name + ' ' + (c.company || '') + ' ' + (c.phone || '') + ' ' + (c.email || '') + ' ' + (c.first || '') + ' ' + (c.last || '')).toLowerCase().indexOf(q) < 0) return false;
        return matchSeg(c);
      }
      function walk(parent, depth) {
        S.customers.filter(function (c) { return (c.parent || null) === parent; }).sort(byName).forEach(function (c) {
          var kids = custIds(c.id).slice(1).map(function (id) { return S.cust[id]; });
          var self = ok(c), anyKid = kids.some(ok);
          if (self || anyKid) out.push({ id: c.id, c: c, depth: depth, name: S.custName(c.id).toLowerCase(), company: c.company || '', phone: c.phone || '', email: c.email || '', bal: custBal(c), dim: !self });
          walk(c.id, depth + 1);
        });
      }
      walk(null, 0);
      return out;
    }
    function cols() {
      var c = [{ key: 'name', label: 'Name', render: function (r) {
        return '<div class="qbs-cname" style="padding-left:' + (r.depth * 20) + 'px">' + (r.depth ? '<span class="qbs-sub-ic">↳</span>' : '') + '<button type="button" class="qb-link" data-qbs="cust:' + r.id + '">' + esc(r.c.name) + '</button>' + (r.c.active === false ? ' <span class="qbs-tag">Inactive</span>' : '') + '</div>';
      } }];
      if (s.cols.company) c.push({ key: 'company', label: 'Company name' });
      if (s.cols.phone) c.push({ key: 'phone', label: 'Phone' });
      if (s.cols.email) c.push({ key: 'email', label: 'Email' });
      if (s.cols.address) c.push({ key: 'addr', label: 'Billing address', sort: false, render: function (r) { return esc(addr(r.c)); } });
      if (s.cols.ctype) c.push({ key: 'ctype', label: 'Customer type', sort: false, render: function (r) { return esc(r.c.type || ''); } });
      c.push({ key: 'bal', label: 'Open balance', align: 'right', render: function (r) { return U.num(r.bal); } },
        { key: 'act', label: 'Action', sort: false, cls: 'qbs-col-act', render: function (r) {
          var main = r.bal > 0.004 ? lnk('Receive payment', 'recvc:' + r.id) : lnk('Create invoice', 'form:Invoice:' + r.id);
          return '<span class="qb-act">' + main + '<button type="button" class="qb-act-caret" data-qbs="custmenu:' + r.id + '" aria-label="More">' + ic('caretDown') + '</button></span>';
        } });
      return c;
    }
    function list() {
      var box = el.querySelector('.qbs-list'); if (!box) return;
      seedTable(box, s, { sortKey: 'name', sortDir: 'asc' });
      handle = UI.table(box, cols(), rows(), { check: true, rowAct: function (r) { return 'go:customerdetail?id=' + r.id; }, pageSize: s.rows, pager: true, empty: s.q || s.seg ? 'No customers match. Try a different search.' : 'No customers yet.' });
    }
    function leadsHtml() {
      return '<div class="qbs-sec-h"><span class="qb-grow"></span>' + btn('New lead', 'newlead', 'primary') + '</div>' + (LEADS.length ? '<div class="qbs-leads"></div>' :
        '<div class="qbs-empty">' + QB.art('sitting') + '<h2>Keep track of your leads</h2><p>Add people who might become customers. Follow up, then turn them into customers when they say yes.</p>' + btn('New lead', 'newlead', 'primary') + '</div>');
    }
    function drawLeads() {
      var box = el.querySelector('.qbs-leads'); if (!box) return;
      UI.table(box, [
        { key: 'name', label: 'Name', render: function (r) { return '<b>' + esc(r.name) + '</b>'; } }, { key: 'company', label: 'Company name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
        { key: 'source', label: 'Source' }, { key: 'status', label: 'Status' }, { key: 'created', label: 'Added', render: function (r) { return sd(r.created); } },
        { key: 'act', label: 'Action', sort: false, cls: 'qbs-col-act', render: function (r) { return r.status === 'Converted' ? '<span class="qb-muted">Converted</span>' : '<span class="qb-act">' + lnk('Convert to customer', 'convert:' + r.id) + '<span class="qb-sep">|</span>' + lnk('Delete', 'dellead:' + r.id) + '</span>'; } }
      ], LEADS.slice(), {});
    }
    function draw() {
      var tabs = '<div class="qb-tabs qbs-tabs"><button type="button" data-qbs="tab:customers" class="' + (s.tab === 'customers' ? 'on' : '') + '">Customers</button><button type="button" data-qbs="tab:leads" class="' + (s.tab === 'leads' ? 'on' : '') + '">Leads</button><span class="qb-grow"></span>' + lnk('Check out the new view with filters', 'newview', 'qbs-newview') + '</div>';
      var head = UI.pageHead('Customers &amp; leads', { actions: feedback() + btn('Customer types', 'ctypes', 'secondary') + split('New customer', 'newcust', 'newcustmenu') });
      if (s.tab === 'leads') { el.innerHTML = '<div class="qbs qbs-customers">' + head + tabs + leadsHtml() + '</div>'; drawLeads(); return; }
      el.innerHTML = '<div class="qbs qbs-customers">' + head + tabs +
        (s.collapsed ? '<div class="qbs-mbar-collapsed">' + lnk('Show money bar', 'collapse') + '</div>' : '<div class="qbs-mbar-wrap">' + custBar('seg:', s.seg) + '<button type="button" class="qbs-mbar-toggle" data-qbs="collapse" aria-label="Collapse">' + ic('caretUp') + '</button></div>') +
        (s.seg ? '<div class="qbs-chips">' + UI.chip('Filter: ' + SEG_LABEL[s.seg]) + lnk('Clear filter / View all', 'seg:' + s.seg) + '</div>' : '') +
        '<div class="qb-filters qbs-ctools"><span class="qb-search-box qbs-search"><input class="qb-input" data-q placeholder="Search" value="' + esc(s.q) + '">' + ic('search') + '</span><span class="qb-grow"></span>' +
        ddBtn('Batch actions', 'batch') + iconBtn('print', 'printlist', 'Print') + iconBtn('export', 'export', 'Export to Excel') + iconBtn('gear', 'settings', 'Settings') + '</div>' +
        '<div class="qbs-list"></div></div>';
      list();
    }
    function checkedCust() { return handle ? handle.checked().map(function (id) { return S.cust[id]; }).filter(Boolean) : []; }
    wire(el, {
      tab: function (a) { s.tab = a[0]; draw(); },
      seg: function (a) { s.seg = s.seg === a[0] ? '' : a[0]; if (s.tbl) s.tbl.page = 0; draw(); },
      collapse: function () { s.collapsed = !s.collapsed; draw(); },
      newview: function () { UI.toast('The new customer list view is not part of this practice copy.'); },
      newcustmenu: function (a, b) { popMenu(b, [['New customer', 'newcust'], ['Import customers', 'importcust']]); },
      ctypes: function () { customerTypes(); },
      newlead: function () { newLead(function () { draw(); }); },
      convert: function (a) {
        var ld = LEADS.filter(function (x) { return x.id === a[0]; })[0]; if (!ld) return;
        var c = { id: U.uid('c'), name: ld.name, company: ld.company, parent: null, phone: ld.phone, email: ld.email, street: '', city: '', state: '', zip: '', first: ld.first, last: ld.last, active: true, notes: ld.notes || '', terms: 'Net 30', taxable: true, type: '' };
        S.customers.push(c); S.cust[c.id] = c; ld.status = 'Converted';
        S.changed('customer');
        UI.toast(ld.name + ' is now a customer.');
      },
      dellead: function (a) { UI.confirm('Delete lead', 'Are you sure you want to delete this lead?', 'Yes, delete', function () { LEADS = LEADS.filter(function (x) { return x.id !== a[0]; }); draw(); }); },
      batch: function (a, b) {
        popMenu(b, [['Send statements', function () {
          var list = checkedCust(); if (!list.length) return UI.toast('Select customers first.', 'err');
          QB.openForm('Statement', { custs: list.map(function (c) { return c.id; }), cust: list[0].id });
        }], ['Email', function () {
          var list = checkedCust().filter(function (c) { return c.email; }); if (!list.length) return UI.toast('Select customers with an email address.', 'err');
          emailModal(list);
        }], ['Make inactive', function () {
          var list = checkedCust(); if (!list.length) return UI.toast('Select customers first.', 'err');
          UI.confirm('Make inactive', 'Make ' + plural(list.length, 'customer') + ' inactive?', 'Yes', function () { list.forEach(function (c) { c.active = false; }); s.tbl.checked = {}; S.changed('customer'); UI.toast(plural(list.length, 'customer') + ' made inactive.'); });
        }]], { left: true });
      },
      printlist: function () { window.print(); },
      export: function () {
        downloadCsv('Customers.csv', [['Name', 'Company name', 'Phone', 'Email', 'Billing address', 'Open balance']].concat(rows().map(function (r) { return [S.custName(r.id), r.company, r.phone, r.email, addr(r.c), r.bal]; })));
      },
      settings: function (a, b) {
        var names = { company: 'Company name', phone: 'Phone', email: 'Email', address: 'Billing address', ctype: 'Customer type' };
        var items = [{ head: 'Columns' }].concat(Object.keys(names).map(function (k) { return [(s.cols[k] ? '✓ ' : ' ') + names[k], function () { s.cols[k] = !s.cols[k]; draw(); }]; }));
        items.push({ sep: true }, { head: 'Other' }, [(s.inactive ? '✓ ' : ' ') + 'Include inactive', function () { s.inactive = !s.inactive; draw(); }], { sep: true }, { head: 'Rows' });
        [25, 50, 100, 300].forEach(function (n) { items.push([(s.rows === n ? '✓ ' : ' ') + n, function () { s.rows = n; s.tbl.page = 0; draw(); }]); });
        popMenu(b, items);
      }
    });
    el.addEventListener('input', function (e) { if (e.target.hasAttribute('data-q')) { s.q = e.target.value; if (s.tbl) s.tbl.page = 0; list(); } });
    draw();
  });
  var CUST_TYPES = [];
  function customerTypes() {
    function body() {
      return (CUST_TYPES.length ? '<div class="qbs-cats">' + CUST_TYPES.map(function (t) {
        var n = S.customers.filter(function (c) { return c.type === t; }).length;
        return '<div class="qbs-cat-row"><span>' + esc(t) + '</span><span class="qb-muted">' + plural(n, 'customer') + '</span></div>';
      }).join('') + '</div>' : '<p class="qb-muted">Group customers by type, such as Retail or Wholesale, so you can run reports by type.</p>') +
        UI.field('New customer type', UI.input('ctype', '', ' placeholder="Type name"'));
    }
    UI.modal('Customer types', body(), {
      buttons: [['Close', 'secondary'], ['Add type', 'primary', function (m) {
        var i = m.querySelector('[name=ctype]'), v = i.value.trim();
        if (!v) { i.classList.add('is-err'); return false; }
        if (CUST_TYPES.indexOf(v) < 0) CUST_TYPES.push(v);
        m.querySelector('.qb-modal-body').innerHTML = body();
        UI.toast('Customer type ' + v + ' added.');
        return false;
      }]]
    });
  }
  function newLead(done) {
    UI.drawer('New lead', '<div class="qbs-form2">' + UI.field('First name', UI.input('first', '')) + UI.field('Last name', UI.input('last', '')) + UI.field('Company name', UI.input('company', '')) +
      UI.field('Email', UI.input('email', '', ' type="email"')) + UI.field('Phone', UI.input('phone', '')) +
      UI.field('Source', UI.select('source', ['Referral', 'Website', 'Social media', 'Event', 'Other'], 'Referral')) +
      UI.field('Notes', '<textarea class="qb-input" name="notes" rows="3"></textarea>', 'qbs-span2') + '</div>', {
        onSave: function (d) {
          function v(n) { return d.querySelector('[name=' + n + ']').value.trim(); }
          var name = (v('first') + ' ' + v('last')).trim() || v('company');
          if (!name) { d.querySelector('[name=first]').classList.add('is-err'); return false; }
          LEADS.push({ id: U.uid('lead'), name: name, first: v('first'), last: v('last'), company: v('company'), email: v('email'), phone: v('phone'), source: v('source'), notes: v('notes'), status: 'New', created: today() });
          UI.toast('Lead added.');
          if (done) done();
        }
      });
  }
  function emailModal(list) {
    UI.modal('Email ' + (list.length === 1 ? list[0].name : plural(list.length, 'customer')), '<div class="qbs-send">' +
      UI.field('To', UI.input('to', list.map(function (c) { return c.email; }).join(', '))) + UI.field('Subject', UI.input('subj', 'A message from ' + S.company.name)) +
      UI.field('Message', '<textarea class="qb-input" name="body" rows="6"></textarea>') + '<p class="qb-muted qbs-small">This practice copy does not send email.</p></div>', {
        buttons: [['Cancel', 'secondary'], ['Send', 'primary', function () { UI.toast('Email sent to ' + plural(list.length, 'customer') + '.'); }]]
      });
  }

  /* ════════════ Customer detail ════════════ */
  var RECENT = [];
  var CD_TYPES = [['deposits', 'All plus deposits'], ['all', 'All transactions'], ['invoices', 'All invoices'], ['open', 'Open invoices'], ['overdue', 'Overdue invoices'], ['estimates', 'Open estimates'],
    ['credit', 'Credit memos'], ['unbilled', 'Unbilled income'], ['paid', 'Recently paid'], ['money', 'Money received'], ['statements', 'Statements']];
  QB.view('customerdetail', function (params, el) {
    var c = S.cust[params.id || params.nameId] || S.customers.filter(function (x) { return x.active !== false; }).sort(byName)[0];
    if (!c) { el.innerHTML = '<div class="qb-empty-page"><h1>Customer not found</h1></div>'; return; }
    RECENT = [c.id].concat(RECENT.filter(function (x) { return x !== c.id && S.cust[x]; })).slice(0, 12);
    var s = state('customerdetail', { tab: 'list', type: 'deposits', status: 'all', date: 'all', q: '', sort: 'recent', panel: true, editNotes: false, tbl: null, cid: null });
    if (s.cid !== c.id) { s.cid = c.id; s.tbl = null; s.editNotes = false; if (params.tab) s.tab = params.tab; }
    var ids = custIds(c.id);
    var handle;
    function txRows() {
      var tp = s.type === 'deposits' ? function () { return true; } : typePred(s.type), sp = statusPred(s.status);
      return visible(function (t) { return LIST_TYPES.indexOf(t.type) >= 0 && ids.indexOf(t.cust) >= 0 && inRange(t.date, s.date) && tp(t) && sp(t); }).sort(byDateDesc).map(txnRow);
    }
    function leftPanel() {
      if (!s.panel) return '<aside class="qbs-cd-left is-closed"><button type="button" class="qb-icon-btn" data-qbs="panel" aria-label="Show list">' + ic('caretRight') + '</button></aside>';
      var q = s.q.trim().toLowerCase(), list;
      if (q) list = S.customers.filter(function (x) { return x.active !== false && (S.custName(x.id) + ' ' + (x.company || '') + ' ' + (x.email || '') + ' ' + (x.phone || '')).toLowerCase().indexOf(q) >= 0; }).sort(function (a, b) { return S.custName(a.id).localeCompare(S.custName(b.id)); });
      else if (s.sort === 'recent') list = RECENT.map(function (id) { return S.cust[id]; });
      else list = S.customers.filter(function (x) { return x.active !== false; }).sort(function (a, b) { return S.custName(a.id).localeCompare(S.custName(b.id)); });
      return '<aside class="qbs-cd-left"><div class="qbs-cd-lh"><span class="qb-grow"></span>' + iconBtn('plus', 'newcust', 'New customer') + iconBtn('caretLeft', 'panel', 'Hide list') + '</div>' +
        '<span class="qb-search-box qbs-search"><input class="qb-input" data-q placeholder="Search by name or details" value="' + esc(s.q) + '">' + ic('search') + '</span>' +
        '<div class="qbs-cd-sort"><span class="qb-muted">Sort</span><div class="qb-seg"><button type="button" class="' + (s.sort === 'recent' ? 'on' : '') + '" data-qbs="sort:recent">Recent</button><button type="button" class="' + (s.sort === 'name' ? 'on' : '') + '" data-qbs="sort:name">Name</button></div></div>' +
        '<div class="qbs-cd-lt">' + (q ? 'Search results' : s.sort === 'recent' ? 'Recently viewed customers' : 'All customers') + '</div><div class="qbs-cd-list">' +
        (list.length ? list.map(function (x) {
          return '<button type="button" class="qbs-cd-item' + (x.id === c.id ? ' on' : '') + '" data-qbs="cust:' + x.id + '"><span>' + esc(x.parent && !q && s.sort === 'name' ? '↳ ' + x.name : S.custName(x.id)) + '</span><b>' + money(custBal(x)) + '</b></button>';
        }).join('') : '<div class="qb-muted qbs-small qbs-pad">No customers found.</div>') + '</div></aside>';
    }
    function header() {
      var bal = custBal(c);
      var od = U.r2(visible(function (t) { return ids.indexOf(t.cust) >= 0 && isOverdue(t); }).reduce(function (s2, t) { return s2 + openBal(t); }, 0));
      var notes = s.editNotes ? '<div class="qbs-notes-edit"><textarea class="qb-input" rows="3" data-notes>' + esc(c.notes || '') + '</textarea><div class="qbs-row">' + btn('Cancel', 'notescancel', 'tertiary', 'qb-btn-sm') + btn('Save', 'notessave', 'primary', 'qb-btn-sm') + '</div></div>'
        : (c.notes ? '<span class="qbs-notes-txt">' + esc(c.notes) + '</span> ' + lnk('Edit', 'notesedit') : lnk('Add notes', 'notesedit'));
      var cf = c.custom ? Object.keys(c.custom).filter(function (k) { return c.custom[k]; }) : [];
      return '<div class="qbs-cd-cards"><div class="qb-card qbs-cd-head"><div class="qbs-cd-name"><h2>' + esc(S.custName(c.id)) + '</h2>' +
        (c.active === false ? '<span class="qbs-tag">Inactive</span>' : '') +
        '<button type="button" class="qbs-round" data-qbs="mail" aria-label="Email" title="' + esc(c.email || 'No email') + '">' + ic('mail') + '</button><button type="button" class="qbs-round" data-qbs="phone" aria-label="Phone" title="' + esc(c.phone || 'No phone') + '">' + ic('phone') + '</button></div>' +
        '<div class="qbs-cd-info"><div><span class="qbs-k">Company</span><span>' + esc(c.company || '') + '</span></div><div><span class="qbs-k">Billing address</span><span>' + esc(addr(c)) + '</span></div>' +
        '<div class="qbs-cd-notes"><span class="qbs-k">Notes</span><span>' + notes + '</span></div>' +
        '<div><span class="qbs-k">Custom Fields</span><span>' + (cf.length ? cf.map(function (k) { return esc(k) + ': ' + esc(c.custom[k]); }).join(', ') + ' ' : '') + '<button type="button" class="qb-icon-btn qbs-pen" data-qbs="custom" aria-label="Edit custom fields">' + ic('pencil') + '</button></span></div></div></div>' +
        '<div class="qb-card qbs-cd-sum"><div class="qb-card-title">Summary</div>' +
        '<button type="button" class="qbs-sum-row" data-qbs="tf:open"><i style="background:#ffc400"></i><b>' + money(bal) + '</b><span>Open Balance</span></button>' +
        '<button type="button" class="qbs-sum-row" data-qbs="tf:overdue"><i style="background:#d52b1e"></i><b>' + money(od) + '</b><span>Overdue payment</span></button></div></div>';
    }
    var TABS = [['list', 'Transaction List'], ['feed', 'Activity Feed'], ['statements', 'Statements'], ['recurring', 'Recurring Transactions'], ['details', 'Customer Details'], ['late', 'Late Fees'], ['docs', 'Documents & Media']];
    function tabBody() {
      if (s.tab === 'list') return '<div class="qb-filters qbs-cd-filters">' + ddBtn('Batch actions', 'batch') + sel('type', CD_TYPES, s.type, 'Type') + sel('status', STATUS_FILTERS.map(function (o) { return o[0] === 'all' ? ['all', 'All'] : o; }), s.status, 'Status') + sel('date', U.RANGES, s.date, 'Date') +
        lnk('View Recurring Templates', 'tab:recurring', 'qbs-vrt') + '<span class="qb-grow"></span>' + iconBtn('print', 'printlist', 'Print') + iconBtn('export', 'export', 'Export') + '</div><div class="qbs-list"></div>';
      if (s.tab === 'feed') return feedHtml();
      if (s.tab === 'statements') {
        var st = visible(function (t) { return t.type === 'Statement' && ids.indexOf(t.cust) >= 0; }).sort(byDateDesc);
        return '<div class="qbs-sec-h"><span class="qb-grow"></span>' + btn('Create statement', 'form:Statement:' + c.id, 'secondary') + '</div>' +
          (st.length ? '<table class="qb-table is-case"><thead><tr><th>Date</th><th>No.</th><th>Customer</th><th class="ta-r">Balance</th><th>Action</th></tr></thead><tbody>' + st.map(function (t) {
            return '<tr class="is-click" data-qbs="open:' + t.id + '"><td>' + sd(t.date) + '</td><td>' + esc(t.no || '') + '</td><td>' + esc(S.custName(t.cust)) + '</td><td class="ta-r">' + U.num(t.total || 0) + '</td><td><span class="qb-act">' + lnk('View', 'open:' + t.id) + '</span></td></tr>';
          }).join('') + '</tbody></table>' : '<div class="qbs-empty qbs-empty-sm">' + QB.art('docs') + '<b>No statements yet</b><p class="qb-muted">Statements summarize invoices, payments and the balance for ' + esc(c.name) + '.</p></div>');
      }
      if (s.tab === 'recurring') {
        var rs = S.recurring.filter(function (r) { return r.cust ? ids.indexOf(r.cust) >= 0 : ids.some(function (id) { return S.custName(id) === r.payee || S.cust[id].name === r.payee; }); });
        return '<div class="qbs-sec-h"><span class="qb-grow"></span>' + btn('Create recurring payment', 'recur', 'secondary') + '</div>' +
          (rs.length ? '<table class="qb-table is-case"><thead><tr><th>Template name</th><th>Type</th><th>Txn type</th><th>Interval</th><th>Previous date</th><th>Next date</th><th class="ta-r">Amount</th><th>Action</th></tr></thead><tbody>' + rs.map(function (r) {
            var i = S.recurring.indexOf(r);
            return '<tr><td><b>' + esc(r.name) + '</b></td><td>' + esc(r.type) + '</td><td>' + esc(r.txnType) + '</td><td>' + esc(r.interval) + '</td><td>' + U.fmtDate(r.prev) + '</td><td>' + U.fmtDate(r.next) + '</td><td class="ta-r">' + U.num(r.amount) + '</td><td><span class="qb-act">' + lnk('Use', 'ruse:' + i) + '<span class="qb-sep">|</span>' + lnk('Edit', 'redit:' + i) + '</span></td></tr>';
          }).join('') + '</tbody></table>' : '<div class="qbs-empty qbs-empty-sm">' + QB.art('empty') + '<b>No recurring transactions</b><p class="qb-muted">Schedule invoices or sales receipts for ' + esc(c.name) + ' to go out automatically.</p></div>');
      }
      if (s.tab === 'details') {
        var parent = c.parent ? S.cust[c.parent] : null;
        var f = [['Customer', S.custName(c.id)], ['Title', c.title], ['First name', c.first], ['Middle name', c.middle], ['Last name', c.last], ['Suffix', c.suffix], ['Company', c.company],
          ['Email', c.email], ['Phone', c.phone], ['Mobile', c.mobile], ['Fax', c.fax], ['Other', c.other], ['Website', c.website],
          ['Billing address', addr(c)], ['Shipping address', c.shipStreet ? [c.shipStreet, c.shipCity, c.shipState, c.shipZip].filter(Boolean).join(', ') : addr(c)],
          ['Sub-customer of', parent ? parent.name : ''], ['Bill with parent', parent ? (c.billParent === false ? 'No' : 'Yes') : ''],
          ['Terms', c.terms], ['Payment method', c.payMethod], ['Preferred delivery method', c.delivery || (S.settings || {}).deliveryMethod], ['Customer type', c.type],
          ['Tax', c.taxable === false ? 'Tax exempt' : 'Taxable'], ['Resale no.', c.resale], ['Opening balance', c.openingBalance != null ? money(c.openingBalance) : ''], ['Language', c.language || 'English'],
          ['Notes', c.notes]];
        return '<div class="qbs-sec-h"><span class="qb-grow"></span>' + btn('Edit', 'custedit:' + c.id, 'secondary') + '</div><div class="qbs-details">' + f.map(function (x) {
          return '<div class="qbs-det"><span class="qbs-k">' + esc(x[0]) + '</span><span>' + (x[1] ? esc(x[1]) : '<span class="qb-muted"></span>') + '</span></div>';
        }).join('') + '</div>';
      }
      if (s.tab === 'late') {
        var on = c.lateFees != null ? c.lateFees : !!(S.settings || {}).lateFees;
        return '<div class="qb-card qbs-late"><div class="qbs-late-h"><div><b>Late fees</b><p class="qb-muted">Automatically add a late fee when an invoice for ' + esc(c.name) + ' becomes overdue.</p></div><label class="qbs-toggle-l">' + UI.toggle('late', on) + '<span>' + (on ? 'On' : 'Off') + '</span></label></div>' +
          '<p class="qb-muted qbs-small">Default fee amount and timing are set in ' + lnk('Settings', 'nav:settings:tab=sales') + ' under Late fees.</p>' +
          '<table class="qb-table is-case"><thead><tr><th>Date</th><th>Invoice</th><th class="ta-r">Late fee</th><th>Status</th></tr></thead><tbody><tr class="qb-empty-row"><td colspan="4">No late fees have been charged to this customer.</td></tr></tbody></table></div>';
      }
      if (s.tab === 'docs') {
        var files = c.attachments || [];
        return '<label class="qbs-drop qbs-drop-lg">' + ic('attach') + '<span><b>Drag and drop files here</b> or <u>select files</u> to upload</span><small class="qb-muted">Max file size: 20 MB</small><input type="file" multiple hidden data-attach></label>' +
          (files.length ? '<table class="qb-table is-case"><thead><tr><th>Name</th><th>Size</th><th>Uploaded</th><th>Action</th></tr></thead><tbody>' + files.map(function (f, i) {
            return '<tr><td>' + ic('doc') + ' ' + esc(f.name) + '</td><td>' + esc(f.size) + '</td><td>' + U.fmtDate(f.date) + '</td><td>' + lnk('Remove', 'rmfile:' + i) + '</td></tr>';
          }).join('') + '</tbody></table>' : '<p class="qb-muted qbs-center">No attachments yet. Files you add here are kept with ' + esc(c.name) + '.</p>');
      }
      return '';
    }
    function feedHtml() {
      var ev = [];
      visible(function (t) { return ids.indexOf(t.cust) >= 0 && LIST_TYPES.indexOf(t.type) >= 0; }).forEach(function (t) {
        var what = t.type === 'Payment' ? 'Payment received' : t.type === 'Estimate' ? 'Estimate ' + (t.no || '') + ' created' : t.type + (t.no ? ' ' + t.no : '') + ' created';
        ev.push({ date: t.date, created: t.created, t: t, icon: t.type === 'Payment' ? 'checkCircle' : t.type === 'Estimate' ? 'doc' : UNBILLED.indexOf(t.type) >= 0 ? 'clock' : 'doc', text: what, amt: shown(t) });
        if (t.sent) ev.push({ date: t.sent, created: (t.created || 0) + 1, t: t, icon: 'mail', text: t.type + (t.no ? ' ' + t.no : '') + ' sent to ' + ((S.cust[t.cust] || {}).email || 'customer') });
        if (t.reminded) ev.push({ date: t.reminded, created: (t.created || 0) + 2, t: t, icon: 'alert', text: 'Payment reminder sent for invoice ' + (t.no || '') });
        if (t.voided) ev.push({ date: today(), created: (t.created || 0) + 3, t: t, icon: 'close', text: t.type + (t.no ? ' ' + t.no : '') + ' voided' });
      });
      ev.sort(byDateDesc);
      if (!ev.length) return '<div class="qbs-empty qbs-empty-sm">' + QB.art('empty') + '<b>No activity yet</b></div>';
      var last = '';
      return '<div class="qbs-feed">' + ev.map(function (e) {
        var hd = e.date.slice(0, 7) !== last ? '<div class="qbs-feed-m">' + U.MONTHS[+e.date.slice(5, 7) - 1] + ' ' + e.date.slice(0, 4) + '</div>' : '';
        last = e.date.slice(0, 7);
        return hd + '<button type="button" class="qbs-feed-i" data-qbs="open:' + e.t.id + '"><span class="qbs-feed-ic">' + ic(e.icon) + '</span><span class="qbs-feed-t"><b>' + esc(e.text) + '</b><small class="qb-muted">' + U.fmtDate(e.date, 'mon') + (e.t.memo ? ' · ' + esc(e.t.memo) : '') + '</small></span>' + (e.amt != null ? '<span class="qbs-feed-a">' + money(e.amt) + '</span>' : '') + '</button>';
      }).join('') + '</div>';
    }
    function list() {
      var box = el.querySelector('.qbs-list'); if (!box) return;
      seedTable(box, s, { sortKey: 'date', sortDir: 'desc' });
      var data = txRows();
      handle = UI.table(box, txnCols(), data, { check: true, cls: 'is-case', rowAct: function (r) { return 'txn:' + r.id; }, footer: totalRow(data, true), pageSize: 50, empty: 'No transactions for this customer match these filters.' });
    }
    function draw() {
      el.innerHTML = '<div class="qbs qbs-cd">' + '<div class="qbs-crumb">' + '<button type="button" class="qb-link" data-qbs="nav:customers">' + ic('caretLeft') + '<span>Customers</span></button></div>' +
        '<div class="qbs-cd-wrap">' + leftPanel() + '<div class="qbs-cd-main"><div class="qbs-cd-top"><span class="qb-grow"></span>' + feedback() + split('Edit', 'custedit:' + c.id, 'editmenu', 'secondary') + split('New transaction', 'newtxn', 'newtxn') + '</div>' +
        header() + '<div class="qb-tabs qbs-tabs">' + TABS.map(function (t) { return '<button type="button" data-qbs="tab:' + t[0] + '" class="' + (s.tab === t[0] ? 'on' : '') + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>' +
        '<div class="qbs-cd-body">' + tabBody() + '</div>' +
        (c.email ? '<div class="qbs-cd-emails"><span class="qbs-k">Customer emails</span> ' + esc((c.first || '') + ' ' + (c.last || '')) + ' ' + lnk(c.email, 'mail') + '</div>' : '') +
        '</div></div></div>';
      if (s.tab === 'list') list();
    }
    function checked() { return handle ? handle.checked().filter(function (id) { return S.txn[id]; }) : []; }
    wire(el, {
      panel: function () { s.panel = !s.panel; draw(); },
      sort: function (a) { s.sort = a[0]; draw(); },
      tab: function (a) { s.tab = a[0]; draw(); },
      tf: function (a) { s.tab = 'list'; s.type = a[0]; s.status = 'all'; s.date = 'all'; draw(); },
      notesedit: function () { s.editNotes = true; draw(); var t = el.querySelector('[data-notes]'); if (t) t.focus(); },
      notescancel: function () { s.editNotes = false; draw(); },
      notessave: function () { var t = el.querySelector('[data-notes]'); c.notes = t ? t.value.trim() : c.notes; s.editNotes = false; S.changed('customer'); UI.toast('Notes saved.'); },
      custom: function () {
        var cur = c.custom || {};
        var keys = Object.keys(cur);
        UI.modal('Custom fields', '<p class="qb-muted">Add details you want to keep about ' + esc(c.name) + '. Manage the field list in Settings &gt; Custom fields.</p><div class="qbs-cf">' +
          keys.map(function (k) { return UI.field(k, UI.input('cf_' + k, cur[k])); }).join('') + '<div class="qbs-cf-new">' + UI.field('Field name', UI.input('cfname', '')) + UI.field('Value', UI.input('cfval', '')) + '</div></div>', {
            buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (m) {
              var o = {};
              keys.forEach(function (k) { o[k] = m.querySelector('[name="cf_' + k + '"]').value.trim(); });
              var nk = m.querySelector('[name=cfname]').value.trim(); if (nk) o[nk] = m.querySelector('[name=cfval]').value.trim();
              c.custom = o; S.changed('customer'); UI.toast('Custom fields saved.');
            }]]
          });
      },
      mail: function () { if (!c.email) return UI.toast('Add an email address for ' + c.name + ' first.', 'err'); emailModal([c]); },
      phone: function () { UI.modal(c.name, c.phone ? '<p class="qbs-phone">' + ic('phone') + ' <b>' + esc(c.phone) + '</b></p>' + (c.mobile ? '<p>Mobile: ' + esc(c.mobile) + '</p>' : '') : '<p class="qb-muted">No phone number on file.</p>', { buttons: [['Close', 'secondary'], ['Edit customer', 'primary', function () { QB.openForm('Customer', { customer: c }); }]] }); },
      editmenu: function (a, b) { popMenu(b, [['Edit', 'custedit:' + c.id], [c.active === false ? 'Make active' : 'Make inactive', function () { toggleCustActive(c); }]]); },
      newtxn: function (a, b) {
        popMenu(b, [['Invoice', 'form:Invoice:' + c.id], ['Payment', 'recvc:' + c.id], ['Estimate', 'form:Estimate:' + c.id], ['Sales receipt', 'form:Sales Receipt:' + c.id], ['Credit memo', 'form:Credit Memo:' + c.id],
          ['Statement', 'form:Statement:' + c.id], ['Charge', 'form:Delayed Charge:' + c.id], ['Time activity', 'form:Single time activity:' + c.id], ['Task', 'form:Task:' + c.id]]);
      },
      batch: function (a, b) { popMenu(b, [['Print transactions', function () { printTxns(checked()); }], ['Send transactions', function () { sendTxns(checked()); }], ['Send reminders', function () { sendReminders(checked()); }]], { left: true }); },
      printlist: function () { window.print(); },
      export: function () { downloadCsv(c.name.replace(/[^\w]+/g, '_') + '_Transactions.csv', [['Date', 'Type', 'No.', 'Customer', 'Memo', 'Amount', 'Status']].concat(txRows().map(function (r) { return [U.fmtDate(r.date), r.type, r.no, r.cust, r.memo, U.r2(r.amount), r.status]; }))); },
      recur: function () { newRecurring({ cust: c.id }); },
      ruse: function (a) { var r = S.recurring[+a[0]]; if (r) QB.openForm(r.type, { cust: c.id }); },
      redit: function (a) { var r = S.recurring[+a[0]]; if (r) editRecurring(r); },
      rmfile: function (a) { (c.attachments || []).splice(+a[0], 1); draw(); }
    });
    el.addEventListener('change', function (e) {
      var f = e.target.getAttribute('data-f');
      if (f) { s[f] = e.target.value; if (s.tbl) s.tbl.page = 0; draw(); return; }
      if (e.target.name === 'late') { c.lateFees = e.target.checked; draw(); UI.toast('Late fees turned ' + (c.lateFees ? 'on' : 'off') + ' for ' + c.name + '.'); return; }
      if (e.target.hasAttribute && e.target.hasAttribute('data-attach')) {
        c.attachments = c.attachments || [];
        [].slice.call(e.target.files || []).forEach(function (fl) {
          if (fl.size > 20 * 1024 * 1024) return UI.toast(fl.name + ' is larger than 20 MB.', 'err');
          c.attachments.push({ name: fl.name, size: fl.size > 1048576 ? (fl.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(fl.size / 1024)) + ' KB', date: today() });
        });
        draw(); UI.toast('Attachment added.');
      }
    });
    el.addEventListener('input', function (e) {
      if (e.target.hasAttribute('data-q')) {
        s.q = e.target.value;
        var pos = e.target.selectionStart;
        var left = el.querySelector('.qbs-cd-left');
        var tmp = document.createElement('div'); tmp.innerHTML = leftPanel();
        left.parentNode.replaceChild(tmp.firstChild, left);
        var inp = el.querySelector('.qbs-cd-left [data-q]'); if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (er) {} }
      }
    });
    draw();
  });

  /* ════════════ Estimates ════════════ */
  var EST_STATUS = [['all', 'All'], ['Pending', 'Pending'], ['Accepted', 'Accepted'], ['Closed', 'Closed'], ['Rejected', 'Rejected'], ['Converted', 'Converted']];
  QB.view('estimates', function (params, el) {
    var s = state('estimates', { status: 'all', date: 'last-12-months', q: '', tbl: null });
    takeParams(s, params, ['status', 'date']);
    var handle;
    function rows() {
      var q = s.q.trim().toLowerCase();
      return visible(function (t) {
        return t.type === 'Estimate' && inRange(t.date, s.date) && (s.status === 'all' || estStatus(t) === s.status) && (!q || (S.custName(t.cust) + ' ' + (t.no || '')).toLowerCase().indexOf(q) >= 0);
      }).sort(byDateDesc).map(function (t) { return { id: t.id, t: t, date: t.date, no: t.no, cust: S.custName(t.cust), exp: t.expires || '', amount: t.total, status: estStatus(t) }; });
    }
    function list() {
      var box = el.querySelector('.qbs-list');
      seedTable(box, s, { sortKey: 'date', sortDir: 'desc' });
      handle = UI.table(box, [
        { key: 'date', label: 'Date', render: function (r) { return sd(r.date); } },
        { key: 'no', label: 'No.' },
        { key: 'cust', label: 'Customer', render: function (r) { return esc(r.cust); } },
        { key: 'exp', label: 'Expiration date', render: function (r) { return sd(r.exp) + (isOpenEst(r.t) && r.exp && r.exp < today() ? ' <span class="qbs-tag is-warn">Expired</span>' : ''); } },
        { key: 'amount', label: 'Amount', align: 'right', render: function (r) { return money(r.amount); } },
        { key: 'status', label: 'Status', render: function (r) { return statusCell(r.t); } },
        { key: 'act', label: 'Action', sort: false, cls: 'qbs-col-act', render: function (r) { return actionCell(r.t); } }
      ], rows(), { check: true, rowAct: function (r) { return 'txn:' + r.id; }, pageSize: 50, pager: true, empty: 'No estimates match these filters.' });
    }
    function draw() {
      var all = visible(function (t) { return t.type === 'Estimate' && inRange(t.date, 'last-365'); });
      function seg(k) { var l = all.filter(function (t) { return estStatus(t) === k; }); return { n: l.length, amt: l.reduce(function (x, t) { return x + t.total; }, 0) }; }
      var p = seg('Pending'), a = seg('Accepted'), cl = seg('Closed'), cv = seg('Converted'), rj = seg('Rejected');
      var fl = flexes([p.amt, a.amt, cl.amt + cv.amt, rj.amt]);
      el.innerHTML = '<div class="qbs qbs-est">' + UI.pageHead('Estimates', { actions: feedback() + split('Create estimate', 'form:Estimate', 'newmenu') }) +
        mbar([{ title: '<b>Estimates</b> <span class="qb-muted">Last 365 days</span>', segs: [
          { key: 'Pending', amount: money(p.amt), label: plural(p.n, 'pending estimate'), color: '#38a3e8', flex: fl[0], cmd: 'seg:Pending' },
          { key: 'Accepted', amount: money(a.amt), label: a.n + ' accepted', color: '#2ca01c', flex: fl[1], cmd: 'seg:Accepted' },
          { key: 'Closed', amount: money(cl.amt + cv.amt), label: (cl.n + cv.n) + ' closed or converted', color: '#babec5', flex: fl[2], cmd: 'seg:Closed' },
          { key: 'Rejected', amount: money(rj.amt), label: rj.n + ' rejected', color: '#d52b1e', flex: fl[3], cmd: 'seg:Rejected' }] }], s.status) +
        '<div class="qb-filters">' + ddBtn('Batch actions', 'batch') + sel('status', EST_STATUS, s.status, 'Status') + sel('date', U.RANGES, s.date, 'Date') +
        '<label class="qb-field qbs-fld"><span class="qb-label">Search</span><span class="qb-search-box qbs-search"><input class="qb-input" data-q placeholder="Customer or number" value="' + esc(s.q) + '">' + ic('search') + '</span></label>' +
        (s.status !== 'all' || s.date !== 'last-12-months' || s.q ? lnk('Clear filters', 'clear', 'qbs-clear') : '') + '</div><div class="qbs-list"></div></div>';
      list();
    }
    function checked() { return handle ? handle.checked().filter(function (id) { return S.txn[id]; }) : []; }
    wire(el, {
      seg: function (a) { s.status = s.status === a[0] ? 'all' : a[0]; draw(); },
      clear: function () { s.status = 'all'; s.date = 'last-12-months'; s.q = ''; draw(); },
      newmenu: function (a, b) { popMenu(b, [['Create estimate', 'form:Estimate'], ['Import estimates', function () { UI.modal('Import estimates', '<p class="qb-muted">Importing estimates is not part of this practice copy. Use Create estimate instead.</p>', { buttons: [['Got it', 'primary']] }); }]]); },
      batch: function (a, b) {
        function setAll(v) { return function () { var l = checked().map(function (id) { return S.txn[id]; }).filter(isOpenEst); if (!l.length) return UI.toast('Select open estimates first.', 'err'); l.forEach(function (t) { t.status = v; }); s.tbl.checked = {}; S.changed('update'); UI.toast(plural(l.length, 'estimate') + ' marked ' + v.toLowerCase() + '.'); }; }
        popMenu(b, [['Print transactions', function () { printTxns(checked()); }], ['Send transactions', function () { sendTxns(checked()); }], ['Mark as accepted', setAll('Accepted')], ['Mark as rejected', setAll('Rejected')]], { left: true });
      }
    });
    el.addEventListener('change', function (e) { var f = e.target.getAttribute('data-f'); if (!f) return; s[f] = e.target.value; if (s.tbl) s.tbl.page = 0; draw(); });
    el.addEventListener('input', function (e) { if (e.target.hasAttribute('data-q')) { s.q = e.target.value; list(); } });
    draw();
  });

  /* ════════════ Appointments ════════════ */
  var APPTS = [];
  var HOURS = []; (function () { for (var hh = 7; hh <= 19; hh++) HOURS.push(hh); })();
  function hm(t) { var p = String(t || '0:0').split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function fmtTime(t) { var m = hm(t), h = Math.floor(m / 60), mm = m % 60; return ((h + 11) % 12 + 1) + ':' + String(mm).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM'); }
  var SLOTS = []; (function () { for (var x = 7 * 60; x <= 20 * 60; x += 30) SLOTS.push([String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'), '']); SLOTS.forEach(function (sl) { sl[1] = fmtTime(sl[0]); }); })();
  QB.view('appointments', function (params, el) {
    var s = state('appointments', { start: null, view: 'week', day: null });
    if (!s.start) { var t0 = U.toDate(today()); s.start = U.addDays(today(), -t0.getDay()); s.day = today(); }
    function days() { if (s.view === 'day') return [s.day]; var o = []; for (var i = 0; i < 7; i++) o.push(U.addDays(s.start, i)); return o; }
    function label() {
      var ds = days(), a = U.toDate(ds[0]), b = U.toDate(ds[ds.length - 1]);
      if (ds.length === 1) return U.fmtDate(ds[0], 'long');
      return U.MONTHS[a.getMonth()] + ' ' + a.getDate() + ' – ' + (a.getMonth() !== b.getMonth() ? U.MONTHS[b.getMonth()] + ' ' : '') + b.getDate() + ', ' + b.getFullYear();
    }
    function draw() {
      var ds = days(), t = today();
      var inView = APPTS.filter(function (a) { return ds.indexOf(a.date) >= 0; });
      var H = 52;
      var grid = '<div class="qbs-cal" style="--cols:' + ds.length + '"><div class="qbs-cal-head"><div class="qbs-cal-gut"></div>' + ds.map(function (d) {
        var dt = U.toDate(d);
        return '<div class="qbs-cal-dh' + (d === t ? ' is-today' : '') + '"><small>' + ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][dt.getDay()] + '</small><b>' + dt.getDate() + '</b></div>';
      }).join('') + '</div><div class="qbs-cal-body"><div class="qbs-cal-gut">' + HOURS.map(function (h) { return '<div class="qbs-cal-hr" style="height:' + H + 'px"><span>' + ((h + 11) % 12 + 1) + ' ' + (h < 12 ? 'AM' : 'PM') + '</span></div>'; }).join('') + '</div>' +
        ds.map(function (d) {
          var col = '<div class="qbs-cal-col' + (d === t ? ' is-today' : '') + '" data-day="' + d + '">' + HOURS.map(function () { return '<div class="qbs-cal-cell" style="height:' + H + 'px"></div>'; }).join('');
          APPTS.filter(function (a) { return a.date === d; }).forEach(function (a) {
            var top = (hm(a.start) - 7 * 60) / 60 * H, ht = Math.max(22, (hm(a.end) - hm(a.start)) / 60 * H - 2);
            col += '<button type="button" class="qbs-appt" style="top:' + top.toFixed(0) + 'px;height:' + ht.toFixed(0) + 'px" data-qbs="appt:' + a.id + '"><b>' + esc(a.title) + '</b><small>' + fmtTime(a.start) + ' – ' + fmtTime(a.end) + (a.cust ? ' · ' + esc(S.custName(a.cust)) : '') + '</small></button>';
          });
          return col + '</div>';
        }).join('') + '</div>' +
        (inView.length ? '' : '<div class="qbs-cal-empty"><div>' + ic('calendar') + '<b>No appointments ' + (s.view === 'day' ? 'today' : 'this week') + '</b><p class="qb-muted">Book time with your customers and keep your schedule in one place.</p>' + btn('New appointment', 'new', 'primary') + '</div></div>') + '</div>';
      el.innerHTML = '<div class="qbs qbs-appts">' + UI.pageHead('Appointments', { actions: feedback() + btn('New appointment', 'new', 'primary') }) +
        '<div class="qbs-cal-tools">' + btn('Today', 'today', 'tertiary', 'qb-btn-sm') + iconBtn('caretLeft', 'prev', 'Previous') + iconBtn('caretRight', 'next', 'Next') + '<h2 class="qbs-cal-lbl">' + esc(label()) + '</h2><span class="qb-grow"></span>' +
        '<div class="qb-seg"><button type="button" class="' + (s.view === 'day' ? 'on' : '') + '" data-qbs="view:day">Day</button><button type="button" class="' + (s.view === 'week' ? 'on' : '') + '" data-qbs="view:week">Week</button></div></div>' + grid +
        (APPTS.length ? '<div class="qbs-sec-h"><h2 class="qbs-h2">Upcoming</h2></div><div class="qbs-upcoming">' + APPTS.filter(function (a) { return a.date >= t; }).sort(function (a, b) { return (a.date + a.start) < (b.date + b.start) ? -1 : 1; }).slice(0, 8).map(function (a) {
          return '<button type="button" class="qbs-up" data-qbs="appt:' + a.id + '"><b>' + U.fmtDate(a.date, 'mon') + '</b><span>' + fmtTime(a.start) + '</span><span>' + esc(a.title) + '</span><span class="qb-muted">' + esc(S.custName(a.cust)) + '</span></button>';
        }).join('') + '</div>' : '') + '</div>';
    }
    function apptModal(a, preset) {
      var isNew = !a; a = a || { id: U.uid('ap'), date: preset && preset.date || s.day || today(), start: preset && preset.start || '09:00', end: preset && preset.end || '10:00', title: '', cust: '', who: 'Craig Carlson', notes: '', loc: '' };
      UI.modal(isNew ? 'New appointment' : 'Appointment', '<div class="qbs-form2">' +
        UI.field('Customer', UI.select('cust', custOptions('Choose a customer'), a.cust), 'qbs-span2') +
        UI.field('Service or title', UI.input('title', a.title, ' placeholder="What is the appointment for?"'), 'qbs-span2') +
        UI.field('Date', UI.dateInput('date', a.date)) + UI.field('Assigned to', UI.select('who', ['Craig Carlson'], a.who)) +
        UI.field('Start time', UI.select('start', SLOTS, a.start)) + UI.field('End time', UI.select('end', SLOTS, a.end)) +
        UI.field('Location', UI.input('loc', a.loc || '', ' placeholder="Address or link"'), 'qbs-span2') +
        UI.field('Notes', '<textarea class="qb-input" name="notes" rows="3">' + esc(a.notes) + '</textarea>', 'qbs-span2') + '<div class="qbs-err qbs-span2"></div></div>', {
          buttons: (isNew ? [] : [['Delete', 'tertiary', function () { APPTS = APPTS.filter(function (x) { return x.id !== a.id; }); draw(); UI.toast('Appointment deleted.'); }]]).concat([['Cancel', 'secondary'], ['Save', 'primary', function (m) {
            function v(n) { return m.querySelector('[name=' + n + ']').value; }
            var err = m.querySelector('.qbs-err'), date = U.parseDate(v('date').trim());
            if (!v('title').trim() && !v('cust')) { err.textContent = 'Add a customer or a title.'; return false; }
            if (!date) { err.textContent = 'Enter the date as mm/dd/yyyy.'; return false; }
            if (hm(v('end')) <= hm(v('start'))) { err.textContent = 'End time must be after the start time.'; return false; }
            a.cust = v('cust'); a.title = v('title').trim() || 'Appointment'; a.date = date; a.start = v('start'); a.end = v('end'); a.who = v('who'); a.loc = v('loc').trim(); a.notes = v('notes').trim();
            if (isNew) APPTS.push(a);
            var dt = U.toDate(date); s.start = U.addDays(date, -dt.getDay()); s.day = date;
            draw(); UI.toast(isNew ? 'Appointment booked for ' + U.fmtDate(date, 'mon') + '.' : 'Appointment updated.');
          }]])
        });
    }
    wire(el, {
      new: function () { apptModal(null); },
      today: function () { var t0 = U.toDate(today()); s.start = U.addDays(today(), -t0.getDay()); s.day = today(); draw(); },
      prev: function () { if (s.view === 'day') s.day = U.addDays(s.day, -1); else s.start = U.addDays(s.start, -7); draw(); },
      next: function () { if (s.view === 'day') s.day = U.addDays(s.day, 1); else s.start = U.addDays(s.start, 7); draw(); },
      view: function (a) { s.view = a[0]; if (a[0] === 'day' && (s.day < s.start || s.day > U.addDays(s.start, 6))) s.day = s.start; draw(); },
      appt: function (a) { var ap = APPTS.filter(function (x) { return x.id === a[0]; })[0]; if (ap) apptModal(ap); }
    });
    el.addEventListener('click', function (e) {
      var col = e.target.closest('.qbs-cal-col'); if (!col || e.target.closest('.qbs-appt')) return;
      var r = col.getBoundingClientRect(), mins = 7 * 60 + Math.floor((e.clientY - r.top) / 52 * 2) * 30;
      mins = Math.max(7 * 60, Math.min(19 * 60, mins));
      e.stopImmediatePropagation();
      var st0 = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0'), en = mins + 60;
      apptModal(null, { date: col.getAttribute('data-day'), start: st0, end: String(Math.floor(en / 60)).padStart(2, '0') + ':' + String(en % 60).padStart(2, '0') });
    }, true);
    draw();
  });

  /* ════════════ Reviews ════════════ */
  var REVIEW_REQ = [];
  QB.view('reviews', function (params, el) {
    function draw() {
      el.innerHTML = '<div class="qbs qbs-reviews">' + UI.pageHead('Reviews', { actions: feedback() + (REVIEW_REQ.length ? btn('Request reviews', 'req', 'primary') : '') }) +
        (REVIEW_REQ.length ? '<div class="qbs-rv-stats"><div class="qb-card"><div class="qbs-big">' + REVIEW_REQ.length + '</div><div class="qb-muted">Requests sent</div></div><div class="qb-card"><div class="qbs-big">0</div><div class="qb-muted">Reviews received</div></div><div class="qb-card"><div class="qbs-big">–</div><div class="qb-muted">Average rating</div></div></div>' +
          '<table class="qb-table is-case"><thead><tr><th>Customer</th><th>Email</th><th>Sent</th><th>Status</th></tr></thead><tbody>' + REVIEW_REQ.slice().reverse().map(function (r) {
            return '<tr><td>' + esc(S.custName(r.cust)) + '</td><td>' + esc(r.email) + '</td><td>' + U.fmtDate(r.date) + '</td><td>Requested</td></tr>';
          }).join('') + '</tbody></table>'
          : '<div class="qbs-empty">' + '<div class="qbs-stars">' + [1, 2, 3, 4, 5].map(function () { return ic('star'); }).join('') + '</div><h2>Get more 5-star reviews</h2><p>Happy customers are your best marketing. Ask them for a review in a couple of clicks and watch your reputation grow.</p>' + btn('Request reviews', 'req', 'primary') + '</div>') + '</div>';
    }
    wire(el, {
      req: function () {
        var list = S.customers.filter(function (c) { return c.active !== false && c.email; }).sort(byName);
        var m = UI.modal('Request reviews', '<p class="qb-muted">Choose who gets a review request by email.</p><label class="qbs-chk-all"><input type="checkbox" data-all> <b>Select all</b></label><div class="qbs-rv-list">' + list.map(function (c) {
          return '<label class="qbs-rv-row"><input type="checkbox" value="' + c.id + '"><span>' + esc(S.custName(c.id)) + '</span><span class="qb-muted">' + esc(c.email) + '</span></label>';
        }).join('') + '</div>', {
          buttons: [['Cancel', 'secondary'], ['Send requests', 'primary', function (box) {
            var picked = [].slice.call(box.querySelectorAll('.qbs-rv-list input:checked')).map(function (i) { return i.value; });
            if (!picked.length) { UI.toast('Select at least one customer.', 'err'); return false; }
            picked.forEach(function (id) { REVIEW_REQ.push({ cust: id, email: S.cust[id].email, date: today() }); });
            draw(); UI.toast('Review requests sent to ' + plural(picked.length, 'customer') + '.');
          }]]
        });
        m.querySelector('[data-all]').addEventListener('change', function (e) { [].slice.call(m.querySelectorAll('.qbs-rv-list input')).forEach(function (i) { i.checked = e.target.checked; }); });
      }
    });
    draw();
  });

  QB.sales = { state: ST, docHtml: docHtml, printTxns: printTxns, sendTxns: sendTxns };
})();
