/* ══════════════════════════════════════════════════════════
   QuickBooks Online test drive: transaction forms and drawers.
   Every Create-menu form registers here with QB.form(name, fn).
   - Transaction forms are full-screen frames (UI.formFrame).
   - Customer, Vendor, Product/Service, Contractor and Account
     open as right-side drawers (UI.drawer).
   Inside a frame, clicks use data-q="verb:arg" and are handled by
   that frame, so they never reach the shell's data-act router.
   Split buttons use data-act="qbf:verb"; the shell routes those to
   the topmost open frame.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var QB = window.QB;
  if (!QB || !QB.form) return;
  var U = QB.util, S = QB.store, L = QB.ledger, UI = QB.ui;
  var esc = U.esc, money = U.money, num = U.parseMoney, r2 = U.r2;

  /* ───────── small helpers ───────── */
  function ic(n, c) { return UI.icon(n, c); }
  function later(fn) { setTimeout(fn, 0); }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function q4(n) { return Math.round((+n || 0) * 10000) / 10000; }
  function fmtQty(q) { if (q === '' || q == null) return ''; var n = +q; return isNaN(n) ? '' : String(q4(n)); }
  function amt(v) { return v === '' || v == null ? '' : U.num(v); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function lc(s) { return String(s).charAt(0).toLowerCase() + String(s).slice(1); }
  var NAMES = {
    'Charge': 'Delayed charge', 'Credit': 'Delayed credit', 'Refund': 'Refund receipt', 'Inventory Qty Adjust': 'Inventory adjustment',
    'Credit Card Payment': 'Credit card payment', 'Time Charge': 'Time activity', 'Time Activity': 'Time activity', 'Deposit': 'Deposit'
  };
  function typeName(type) { return NAMES[type] || type; }
  function label(t) { return typeName(t.type) + (t.no && /^[\w-]+$/.test(t.no) ? ' ' + t.no : ''); }
  function custAddress(c) {
    if (!c) return '';
    var a = [], nm = [c.first, c.last].filter(Boolean).join(' ');
    if (nm) a.push(nm);
    if (c.company && c.company !== nm) a.push(c.company); else if (!nm) a.push(c.name);
    if (c.street) a.push(c.street);
    var cs = [c.city, [c.state, c.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    if (cs) a.push(cs);
    return a.join('\n');
  }
  function vendAddress(v) {
    if (!v) return '';
    var a = [v.company || v.name];
    if (v.street) a.push(v.street);
    var cs = [v.city, [v.state, v.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    if (cs) a.push(cs);
    return a.join('\n');
  }
  function payeeAddress(id) { return S.vend[id] ? vendAddress(S.vend[id]) : S.cust[id] ? custAddress(S.cust[id]) : ''; }
  function nameOf(id) { return S.vend[id] ? S.vend[id].name : S.cust[id] ? S.custName(id) : ''; }
  function taxRates() { return S.company.taxRates || []; }
  function taxById(id) { return taxRates().filter(function (r) { return r.id === id; })[0]; }
  function taxIdFor(t) {
    if (t && t.taxId && taxById(t.taxId)) return t.taxId;
    if (t && t.taxRate != null) {
      var m = taxRates().filter(function (r) { return Math.abs(r.rate - t.taxRate) < 1e-9; })[0];
      if (m) return m.id;
    }
    return S.company.defaultTax || (taxRates()[0] || {}).id;
  }
  /* Invoices, sales receipts, credit memos and refunds share one number sequence. */
  var SALES_SEQ = ['Invoice', 'Sales Receipt', 'Credit Memo', 'Refund'];
  function nextSalesNo() { return String(Math.max.apply(null, SALES_SEQ.map(function (ty) { return +S.nextNo(ty); }))); }
  function acctOpts(types, extra) {
    return S.ordered().filter(function (a) { return a.active !== false && (types.indexOf(a.type) >= 0 || (extra || []).indexOf(a.id) >= 0); })
      .map(function (a) { return [a.id, S.fullName(a.id)]; });
  }
  function balText(id) { return S.acct[id] ? 'Balance ' + money(L.balance(id)) : ''; }
  function isCC(id) { return S.acct[id] && S.acct[id].type === 'Credit Card'; }
  /* Inventory quantity on hand moves with sales and purchases. */
  var QTY_DIR = { 'Invoice': -1, 'Sales Receipt': -1, 'Credit Memo': 1, 'Refund': 1, 'Expense': 1, 'Check': 1, 'Cash Expense': 1, 'Credit Card Expense': 1, 'Bill': 1, 'Vendor Credit': -1, 'Credit Card Credit': -1 };
  function applyQty(type, lines, sign) {
    var d = QTY_DIR[type]; if (!d) return;
    (lines || []).forEach(function (l) {
      var it = S.item[l.item];
      if (it && it.type === 'Inventory') it.qty = q4((+it.qty || 0) + d * sign * (+l.qty || 0));
    });
  }
  function assign(target, src) { Object.keys(src).forEach(function (k) { target[k] = src[k]; }); return target; }
  function selOpts(list, value) {
    return list.map(function (o) {
      if (typeof o === 'string') o = [o, o];
      return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('');
  }
  function hoursText(h) { h = +h || 0; var hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (mm === 60) { hh++; mm = 0; } return hh + ' hrs ' + (mm < 10 ? '0' : '') + mm + ' mins'; }
  function parseHours(s) {
    s = String(s || '').trim(); if (!s) return 0;
    var m = s.match(/^(\d+):(\d{1,2})$/);
    if (m) return q4(+m[1] + (+m[2]) / 60);
    var v = parseFloat(s); return isNaN(v) ? 0 : q4(v);
  }
  function fmtHours(h) { h = +h || 0; if (!h) return ''; var hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (mm === 60) { hh++; mm = 0; } return hh + ':' + (mm < 10 ? '0' : '') + mm; }

  /* ───────── frames ───────── */
  var stack = [];
  function topCtx() {
    for (var i = stack.length - 1; i >= 0; i--) { if (stack[i].f.isConnected) return stack[i]; stack.splice(i, 1); }
    return null;
  }
  QB.on('qbf', function (arg) { var c = topCtx(); if (c) c.fire(arg); });

  function clearFieldErr(e) {
    var t = e.target; if (!t || !t.classList || !t.classList.contains('is-err')) return;
    t.classList.remove('is-err');
    var h = t.closest('.qb-field, .qbf-cell, td');
    var fe = h && h.querySelector('.qbf-ferr'); if (fe) fe.remove();
  }
  function frame(o) {
    var f = UI.formFrame({ title: o.title, tabs: o.tabs, tabsRight: o.tabsRight, right: o.right, body: o.body, footer: o.footer, cls: 'qbf ' + (o.cls || '') });
    var ctx = { f: f, h: {} };
    ctx.on = function (k, fn) { ctx.h[k] = fn; return ctx; };
    ctx.fire = function (k, el) {
      var i = k.indexOf(':'), n = i < 0 ? k : k.slice(0, i), a = i < 0 ? '' : k.slice(i + 1);
      if (ctx.h[n]) return ctx.h[n](a, el);
    };
    ctx.$ = function (s) { return f.querySelector(s); };
    ctx.$$ = function (s) { return U.$$(s, f); };
    ctx.el = function (n) { return f.querySelector('[name="' + n + '"]'); };
    ctx.v = function (n) { var e = ctx.el(n); if (!e) return ''; return e.type === 'checkbox' || e.type === 'radio' ? e.checked : e.value; };
    ctx.set = function (n, v) { var e = ctx.el(n); if (!e) return; if (e.type === 'checkbox') e.checked = !!v; else e.value = v == null ? '' : v; };
    ctx.date = function (n) { return U.parseDate(String(ctx.v(n)).trim()); };
    ctx.money = function (n) { return num(ctx.v(n)); };
    ctx.out = function (k, html) { U.$$('[data-o="' + k + '"]', f).forEach(function (e) { e.innerHTML = html; }); };
    ctx.close = function (force) { f.close(force); return !f.isConnected; };
    ctx.on('errclose', function () { var b = ctx.$('.qbf-errbar'); if (b) b.remove(); });
    f.addEventListener('click', function (e) {
      var tb = e.target.closest('[data-ftab]');
      if (tb && f.contains(tb)) {
        U.$$('[data-ftab]', f).forEach(function (b) { b.classList.toggle('on', b === tb); });
        ctx.fire('tab:' + tb.getAttribute('data-ftab'));
        return;
      }
      var b = e.target.closest('[data-q]');
      if (b && f.contains(b)) ctx.fire(b.getAttribute('data-q'), b);
    });
    f.addEventListener('input', clearFieldErr);
    f.addEventListener('change', clearFieldErr);
    f.addEventListener('focusout', function (e) {
      var t = e.target;
      if (t.classList && t.classList.contains('qbf-money') && String(t.value).trim() !== '') t.value = U.num(num(t.value));
    });
    datePickers(f);
    var hist = f.querySelector('.qb-form-hist');
    if (hist) {
      hist.setAttribute('role', 'button'); hist.tabIndex = 0;
      hist.addEventListener('click', function () { later(function () { recentMenu(ctx, hist, o.hist || []); }); });
    }
    stack.push(ctx);
    return ctx;
  }
  function recentMenu(ctx, anchor, types) {
    var list = S.txns.filter(function (t) { return !t.hidden && (!types.length || types.indexOf(t.type) >= 0); })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.created - a.created; }).slice(0, 10);
    var items = [{ head: 'Recent ' + (types.length === 1 ? lc(typeName(types[0])) + 's' : 'transactions') }];
    list.forEach(function (t) { items.push({ label: label(t) + '   ' + (S.payeeName(t) || '') + '   ' + money(t.total) + '   ' + U.fmtDate(t.date), act: t.id }); });
    if (!list.length) items.push({ label: 'No recent transactions', act: '', disabled: true });
    UI.menu(anchor, items, { alignLeft: true, cls: 'qbf-recent', onPick: function (id) { if (!id) return; if (ctx.close()) QB.openTxn(id); } });
  }
  function menuAt(anchor, items, onPick, alignLeft) {
    later(function () { UI.menu(anchor, items, { alignLeft: alignLeft !== false, onPick: onPick }); });
  }

  /* Searchable combobox bound to a list. Keeps the picked id; reverts
     free text that matches nothing, the way QuickBooks does on blur. */
  function combo(input, listFn, o) {
    o = o || {};
    var cur = { value: '', label: '' };
    function labelOf(v) { var m = listFn().filter(function (x) { return x.value === v; })[0]; return m ? m.label : ''; }
    function set(v, silent) {
      cur.value = v || ''; cur.label = v ? labelOf(v) : '';
      input.value = cur.label;
      if (!silent && o.onPick) o.onPick(cur.value, null);
    }
    var c = UI.combo(input, listFn, {
      addNew: o.addNew === false ? null : (o.addNew || 'Add new'),
      minWidth: o.minWidth || 260,
      selectedLabel: function () { return cur.label; },
      onPick: function (v, item) { cur.value = v; cur.label = item.label; if (o.onPick) o.onPick(v, item); },
      onNew: function (text) {
        if (!o.onNew) return;
        o.onNew(text === cur.label ? '' : text, function (v) { set(v); input.dispatchEvent(new Event('change', { bubbles: true })); });
      }
    });
    input.addEventListener('blur', function () {
      setTimeout(function () {
        if (!input.isConnected || input.value === cur.label) return;
        var txt = input.value.trim();
        if (!txt) { if (cur.value) { cur.value = ''; cur.label = ''; if (o.onPick) o.onPick('', null); } return; }
        var m = listFn().filter(function (x) { return x.label.toLowerCase() === txt.toLowerCase(); })[0];
        if (m) { cur.value = m.value; cur.label = m.label; input.value = m.label; if (o.onPick) o.onPick(m.value, m); }
        else input.value = cur.label;
      }, 160);
    });
    if (o.value) { cur.value = o.value; cur.label = labelOf(o.value) || o.text || ''; input.value = cur.label; }
    return { get: function () { return cur.value; }, set: set, input: input, open: c.open };
  }
  /* "+ Add new" handlers that open the matching drawer and hand back the new id. */
  function newCustomer(text, done) { QB.openForm('Customer', { name: text, onSaved: function (c) { done(c.id); } }); }
  function newVendor(text, done) { QB.openForm('Vendor', { name: text, onSaved: function (v) { done(v.id); } }); }
  function newItem(text, done) { QB.openForm('Product/Service', { name: text, onSaved: function (it) { done(it.id); } }); }
  function newAccount(text, done) { QB.openForm('Account', { name: text, onSaved: function (a) { done(a.id); } }); }
  function newPayee(text, done) {
    var m = UI.modal('New name', '<p class="qb-muted">Who are you adding?</p>' + UI.field('Name', UI.input('pn', text)) +
      '<div class="qbf-radios"><label><input type="radio" name="pt" value="v" checked> Vendor</label><label><input type="radio" name="pt" value="c"> Customer</label></div>', {
      buttons: [['Cancel', 'secondary'], ['Details', 'secondary', function (el) {
        var nm = el.querySelector('[name=pn]').value.trim(), isC = el.querySelector('[name=pt]:checked').value === 'c';
        later(function () { (isC ? newCustomer : newVendor)(nm, done); });
      }], ['Save', 'primary', function (el) {
        var nm = el.querySelector('[name=pn]').value.trim();
        if (!nm) { el.querySelector('[name=pn]').classList.add('is-err'); return false; }
        var isC = el.querySelector('[name=pt]:checked').value === 'c';
        var rec = isC ? addCustomer({ name: nm }) : addVendor({ name: nm });
        if (!rec) return false;
        UI.toast(nm + ' saved');
        done(rec.id);
      }]]
    });
    return m;
  }

  /* ───────── date picker ───────── */
  var dp = null;
  function closeDp() { if (dp) { dp.remove(); dp = null; } }
  function datePickers(root) {
    root.addEventListener('focusin', function (e) {
      var inp = e.target;
      if (inp.tagName === 'INPUT' && inp.closest('.qb-date') && !inp.readOnly) openDp(inp);
    });
    root.addEventListener('focusout', function (e) {
      var inp = e.target;
      if (inp.tagName === 'INPUT' && inp.closest('.qb-date')) {
        var p = U.parseDate(inp.value.trim());
        if (p && U.fmtDate(p) !== inp.value) { inp.value = U.fmtDate(p); inp.dispatchEvent(new Event('change', { bubbles: true })); }
      }
      if (dp && dp._inp === inp) setTimeout(function () { if (dp && document.activeElement !== dp._inp) closeDp(); }, 150);
    });
  }
  function openDp(inp) {
    closeDp();
    var cur = U.parseDate(inp.value.trim()) || U.today(), d = U.toDate(cur);
    var view = new Date(d.getFullYear(), d.getMonth(), 1);
    var el = document.createElement('div');
    el.className = 'qbf-dp'; el._inp = inp; dp = el;
    function draw() {
      var y = view.getFullYear(), m = view.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
      var sel = U.parseDate(inp.value.trim()), td = U.today();
      var h = '<div class="qbf-dp-head"><button type="button" data-dp="-1" aria-label="Previous month">' + ic('caretLeft') + '</button><b>' + U.MONTHS[m] + ' ' + y + '</b><button type="button" data-dp="1" aria-label="Next month">' + ic('caretRight') + '</button></div><div class="qbf-dp-grid">' +
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (x) { return '<i>' + x + '</i>'; }).join('');
      for (var i = 0; i < first; i++) h += '<span></span>';
      for (var dd = 1; dd <= days; dd++) {
        var iso = U.iso(new Date(y, m, dd));
        h += '<button type="button" data-day="' + iso + '" class="' + (iso === sel ? 'on ' : '') + (iso === td ? 'td' : '') + '">' + dd + '</button>';
      }
      el.innerHTML = h + '</div><div class="qbf-dp-foot"><button type="button" data-day="' + td + '">Today</button></div>';
    }
    draw();
    document.body.appendChild(el);
    var r = inp.getBoundingClientRect(), top = r.bottom + 4;
    if (top + 300 > innerHeight) top = Math.max(8, r.top - 304);
    el.style.left = Math.min(r.left, innerWidth - 270) + 'px'; el.style.top = top + 'px';
    el.addEventListener('mousedown', function (e) { e.preventDefault(); });
    el.addEventListener('click', function (e) {
      var n = e.target.closest('[data-dp]');
      if (n) { view.setMonth(view.getMonth() + (+n.getAttribute('data-dp'))); draw(); return; }
      var b = e.target.closest('[data-day]');
      if (b) {
        inp.value = U.fmtDate(b.getAttribute('data-day'));
        closeDp();
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  /* ───────── validation ───────── */
  function clearErrors(root) {
    U.$$('.qbf-ferr', root).forEach(function (e) { e.remove(); });
    U.$$('.is-err', root).forEach(function (e) { e.classList.remove('is-err'); });
    var b = root.querySelector('.qbf-errbar'); if (b) b.remove();
  }
  /* errs: [{ el, msg }]. Shows the red banner plus inline messages. Returns true when there are errors. */
  function showErrors(ctx, errs) {
    var root = ctx.f; clearErrors(root);
    if (!errs.length) return false;
    errs.forEach(function (er) {
      if (!er.el) return;
      er.el.classList.add('is-err');
      var host = er.el.closest('.qb-field, .qbf-cell, td') || er.el.parentNode;
      if (!host.querySelector('.qbf-ferr')) host.insertAdjacentHTML('beforeend', '<div class="qbf-ferr">' + ic('alert') + '<span>' + esc(er.msg) + '</span></div>');
    });
    var body = root.querySelector('.qb-form-body');
    body.insertAdjacentHTML('afterbegin', '<div class="qbf-errbar" role="alert">' + ic('alert') + '<div><b>Something\'s not quite right</b><ul>' +
      errs.map(function (e) { return '<li>' + esc(e.msg) + '</li>'; }).join('') + '</ul></div><button type="button" class="qb-x" data-q="errclose" aria-label="Close">' + ic('close') + '</button></div>');
    body.scrollTop = 0;
    return true;
  }

  /* ───────── shared blocks ───────── */
  function attachHtml() {
    return '<div class="qbf-attach"><div class="qbf-attach-h">Attachments</div><label class="qbf-drop"><input type="file" multiple hidden data-attach>' +
      '<span class="qb-link">Add attachment</span><span class="qbf-muted">Max file size: 20 MB</span></label><div class="qbf-attach-list"></div>' +
      '<button type="button" class="qb-link qbf-showex" data-q="showexisting">Show existing</button></div>';
  }
  function bindAttach(ctx, list) {
    var box = ctx.$('.qbf-attach'); if (!box) return;
    var inp = box.querySelector('[data-attach]'), out = box.querySelector('.qbf-attach-list'), drop = box.querySelector('.qbf-drop');
    function draw() {
      out.innerHTML = list.map(function (a, i) {
        return '<div class="qbf-att">' + ic('attach') + '<span>' + esc(a.name) + '</span><em>' + fmtSize(a.size || 0) + '</em><button type="button" class="qb-x" data-q="rmattach:' + i + '" aria-label="Remove">' + ic('close') + '</button></div>';
      }).join('');
    }
    function addFiles(files) {
      [].slice.call(files || []).forEach(function (f) {
        if (f.size > 20 * 1024 * 1024) UI.toast(f.name + ' is larger than 20 MB.', 'err');
        else list.push({ name: f.name, size: f.size, type: f.type });
      });
      ctx.f.dirty = true; draw();
    }
    inp.addEventListener('change', function () { addFiles(inp.files); inp.value = ''; });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('is-over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('is-over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('is-over'); addFiles(e.dataTransfer && e.dataTransfer.files); });
    ctx.on('rmattach', function (i) { list.splice(+i, 1); ctx.f.dirty = true; draw(); });
    ctx.on('showexisting', function () {
      var all = [];
      S.txns.forEach(function (t) { (t.attachments || []).forEach(function (a) { all.push({ a: a, t: t }); }); });
      UI.modal('Attachments', all.length ? '<table class="qb-table is-case"><thead><tr><th>File</th><th>Linked to</th><th class="ta-r">Size</th></tr></thead><tbody>' + all.map(function (x) {
        return '<tr><td>' + esc(x.a.name) + '</td><td>' + esc(label(x.t)) + '</td><td class="ta-r">' + fmtSize(x.a.size || 0) + '</td></tr>';
      }).join('') + '</tbody></table>' : '<p>There are no unlinked attachments yet. Files you attach to transactions show up here.</p>', { buttons: [['Close', 'primary']] });
    });
    draw();
  }
  function privacyLink() { return '<button type="button" class="qb-link qbf-privacy" data-q="privacy">Privacy</button>'; }
  function stdPrivacy(ctx) { ctx.on('privacy', function () { QB.act('info:privacy'); }); }

  /* Transaction journal and audit history, shared by every More menu. */
  function journalModal(t) {
    var P = L.postings(t), dr = 0, crd = 0;
    var rows = P.map(function (p) {
      if (p.amt > 0) dr += p.amt; else crd -= p.amt;
      var nm = p.cust ? S.custName(p.cust) : (p.vend && S.vend[p.vend] ? S.vend[p.vend].name : '');
      return '<tr><td>' + esc(S.fullName(p.acct)) + '</td><td class="ta-r">' + (p.amt > 0 ? U.num(p.amt) : '') + '</td><td class="ta-r">' + (p.amt < 0 ? U.num(-p.amt) : '') + '</td><td>' + esc(nm) + '</td><td>' + esc(p.desc || '') + '</td></tr>';
    }).join('');
    UI.modal('Transaction journal', '<p class="qb-muted">' + esc(label(t)) + ' · ' + esc(S.payeeName(t)) + ' · ' + U.fmtDate(t.date) + '</p><div class="qb-table-wrap"><table class="qb-table is-case"><thead><tr><th>Account</th><th class="ta-r">Debit</th><th class="ta-r">Credit</th><th>Name</th><th>Memo/Description</th></tr></thead><tbody>' +
      (rows || '<tr class="qb-empty-row"><td colspan="5">This transaction doesn\'t post to any accounts.</td></tr>') + '</tbody>' +
      (rows ? '<tfoot><tr><td>Total</td><td class="ta-r">' + money(dr) + '</td><td class="ta-r">' + money(crd) + '</td><td></td><td></td></tr></tfoot>' : '') + '</table></div>', { wide: true, buttons: [['Close', 'primary']] });
  }
  function auditModal(t) {
    var key = t.type + (t.no ? ' ' + t.no : '');
    var ev = S.audit.filter(function (a) { return a.event.slice(a.event.indexOf(' ') + 1) === key && a.date === t.date; });
    var rows = ev.map(function (a) {
      return '<tr><td>' + esc(a.when.toLocaleString()) + '</td><td>' + esc(a.user) + '</td><td>' + esc(a.event.split(' ')[0]) + '</td><td class="ta-r">' + money(a.amount || 0) + '</td></tr>';
    }).join('');
    rows += '<tr><td>' + esc(U.fmtDate(t.date)) + '</td><td>Craig Carlson</td><td>Added (sample company)</td><td class="ta-r">' + money(t.total || 0) + '</td></tr>';
    UI.modal('Audit history', '<p class="qb-muted">' + esc(label(t)) + '</p><table class="qb-table is-case"><thead><tr><th>Date changed</th><th>Changed by</th><th>Event</th><th class="ta-r">Amount</th></tr></thead><tbody>' + rows + '</tbody></table>', { wide: true, buttons: [['Close', 'primary']] });
  }
  function printPreview(title, html) {
    var m = UI.modal(title, '<div class="qbf-print">' + html + '</div>', {
      wide: true, cls: 'qbf-print-modal',
      buttons: [['Close', 'secondary'], ['Download', 'secondary', function () { doPrint(); UI.toast('Choose "Save as PDF" in the print dialog to download.'); return false; }], ['Print', 'primary', function () { doPrint(); return false; }]]
    });
    function doPrint() {
      document.body.classList.add('qbf-printing');
      m.parentNode.classList.add('qbf-print-ov');
      try { window.print(); } catch (e) {}
      setTimeout(function () { document.body.classList.remove('qbf-printing'); }, 500);
    }
    return m;
  }
  /* "Make recurring": saves a recurring template for the current form. */
  function makeRecurring(type, payee, amount) {
    var body = '<div class="qbf-grid2">' +
      UI.field('Template name', UI.input('rname', payee ? payee + ' - ' + type : type)) +
      UI.field('Type', UI.select('rtype', ['Scheduled', 'Reminder', 'Unscheduled'], 'Scheduled')) +
      UI.field('Interval', UI.select('rint', ['Daily', 'Weekly', 'Monthly', 'Yearly'], 'Monthly')) +
      UI.field('Every', '<span class="qbf-inline">' + UI.input('revery', '1', ' style="width:80px"') + '<span class="qbf-muted">period(s)</span></span>') +
      UI.field('Start date', UI.dateInput('rstart', U.addMonths(U.today(), 1))) +
      UI.field('End', UI.select('rend', ['None', 'By', 'After'], 'None')) +
      UI.field('Create', '<span class="qbf-inline">' + UI.input('rdays', '0', ' style="width:80px"') + '<span class="qbf-muted">days in advance</span></span>') +
      UI.field('Payee', UI.input('rpayee', payee || '', ' readonly')) + '</div>';
    var m = UI.modal('Recurring ' + lc(typeName(type)), body, {
      wide: true, buttons: [['Cancel', 'secondary'], ['Save template', 'primary', function (el) {
        var nm = el.querySelector('[name=rname]'), every = Math.max(1, parseInt(el.querySelector('[name=revery]').value, 10) || 1);
        if (!nm.value.trim()) { nm.classList.add('is-err'); return false; }
        var unit = { Daily: 'Day', Weekly: 'Week', Monthly: 'Month', Yearly: 'Year' }[el.querySelector('[name=rint]').value];
        var kind = el.querySelector('[name=rtype]').value;
        S.recurring.push({ name: nm.value.trim(), type: type, txnType: kind, interval: kind === 'Unscheduled' ? '' : 'Every ' + (every > 1 ? every + ' ' + unit + 's' : unit), prev: '', next: kind === 'Unscheduled' ? '' : (U.parseDate(el.querySelector('[name=rstart]').value) || ''), payee: payee || '', amount: amount || 0 });
        S.changed('recurring');
        UI.toast('Recurring template saved');
      }]]
    });
    datePickers(m);
    return m;
  }
  /* More menu actions shared by most forms. hooks: { onDelete(t), onVoid(t) } */
  function stdMore(ctx, t, hooks) {
    hooks = hooks || {};
    ctx.on('journal', function () { journalModal(t); });
    ctx.on('audit', function () { auditModal(t); });
    ctx.on('delete', function () {
      UI.confirm('Delete ' + lc(typeName(t.type)) + '?', 'Are you sure you want to delete this?', 'Yes', function () {
        if (hooks.onDelete) hooks.onDelete(t);
        var lbl = label(t);
        S.remove(t.id);
        UI.toast(lbl + ' deleted');
        ctx.close(true);
      });
    });
    ctx.on('void', function () {
      UI.confirm('Void ' + lc(typeName(t.type)) + '?', 'Are you sure you want to void this?', 'Yes', function () {
        if (hooks.onVoid) hooks.onVoid(t);
        (t.lines || []).forEach(function (l) {
          l.amount = 0; if (l.rate != null) l.rate = 0;
          if (l.debit != null) l.debit = 0; if (l.credit != null) l.credit = 0;
        });
        t.discountAmt = 0; t.discountPct = 0; t.taxOverride = null; t.depositAmt = 0;
        if (t.type === 'Payment' || /^Bill Payment/.test(t.type)) t.applied = [];
        if (['Invoice', 'Sales Receipt', 'Credit Memo', 'Refund', 'Estimate', 'Sales Order', 'Charge', 'Credit'].indexOf(t.type) >= 0) L.totals(t);
        else t.total = 0;
        t.memo = 'Voided'; t.voided = true;
        S.update(t);
        UI.toast(label(t) + ' voided');
        ctx.close(true);
      });
    });
  }
  /* o: { copy, void, extra: [[label, verb]] } */
  function moreItems(o) {
    o = o || {};
    var items = (o.extra || []).slice();
    if (o.copy) items.push(['Copy', 'copy']);
    if (o['void']) items.push(['Void', 'void']);
    items.push(['Delete', 'delete'], { sep: true }, ['Transaction journal', 'journal'], ['Audit history', 'audit']);
    return items;
  }
  function moreBtn() { return '<button type="button" class="qb-btn qb-btn-tertiary qbf-more" data-q="more">More ' + ic('caretDown') + '</button>'; }
  function bindMore(ctx, items) {
    ctx.on('more', function (a, el) { menuAt(el, items, function (k) { ctx.fire(k); }); });
  }
  function headRight(extra) {
    return (extra || '') + '<button type="button" class="qbf-hlink" data-q="feedback">' + ic('comment') + '<span>Give feedback</span></button>';
  }
  function stdHead(ctx) {
    ctx.on('feedback', function () { QB.act('shell:feedback'); });
    ctx.on('settings', function (a, el) {
      menuAt(el, [{ head: 'Form settings' }, ['Account and settings', 'acctsettings'], ['Customize form style', 'formstyle']], function (k) {
        if (k === 'acctsettings') { if (ctx.close()) QB.go('settings', { tab: 'sales' }); }
        else UI.toast('Custom form styles open in Settings in the real product.');
      }, false);
    });
  }
  function bigAmount(lbl, k, sub) {
    return '<div class="qbf-big"><small>' + esc(lbl) + '</small><b data-o="' + k + '">$0.00</b>' + (sub || '') + '</div>';
  }

  /* ───────── document previews (Email, Payor and PDF views; print) ───────── */
  function docHtml(t, o) {
    o = o || {};
    var co = S.company, c = S.cust[t.cust];
    var to = esc(t.billTo != null && t.billTo !== '' ? t.billTo : custAddress(c)).replace(/\n/g, '<br>');
    var lines = (t.lines || []).filter(function (l) { return l.item || l.desc || l.amount; });
    var meta = [[o.noLbl || 'NO.', t.no], ['DATE', U.fmtDate(t.date)]];
    if (t.due && o.due !== false) meta.push(['DUE DATE', U.fmtDate(t.due)]);
    if (t.terms) meta.push(['TERMS', t.terms]);
    if (t.expires) meta.push(['EXPIRATION DATE', U.fmtDate(t.expires)]);
    if (t.method) meta.push(['PAYMENT METHOD', t.method]);
    var rows = lines.map(function (l) {
      var it = S.item[l.item];
      return '<tr><td>' + esc(it ? it.name : '') + '</td><td>' + esc(l.desc || '') + '</td><td class="ta-r">' + fmtQty(l.qty) + '</td><td class="ta-r">' + (l.item || l.rate ? U.num(l.rate) : '') + '</td><td class="ta-r">' + U.num(l.amount) + '</td></tr>';
    }).join('');
    var tot = [['SUBTOTAL', money(t.subtotal || 0)]];
    if (t.discount) tot.push(['DISCOUNT', '-' + money(t.discount)]);
    if (t.tax || t.taxableSubtotal) tot.push(['TAX', money(t.tax || 0)]);
    tot.push(['TOTAL', money(t.total || 0)]);
    if (t.depositAmt) tot.push(['DEPOSIT', '-' + money(t.depositAmt)]);
    var big = o.bigLbl ? '<div class="qbf-doc-bigrow"><span>' + esc(o.bigLbl) + '</span><b>' + money(o.big != null ? o.big : t.total || 0) + '</b></div>' : '';
    return '<div class="qbf-doc">' +
      '<div class="qbf-doc-top"><div><div class="qbf-doc-co">' + esc(co.name) + '</div><div class="qbf-doc-addr">' + esc(co.street) + '<br>' + esc(co.city + ', ' + co.state + ' ' + co.zip) + '<br>' + esc(co.email) + '</div></div>' +
      (co.logo ? '<img class="qbf-doc-logo" src="' + esc(co.logo) + '" alt="">' : '') + '</div>' +
      '<div class="qbf-doc-title">' + esc(o.head || String(t.type).toUpperCase()) + '</div>' +
      '<div class="qbf-doc-meta"><div><div class="qbf-doc-lbl">' + esc(o.toLbl || 'BILL TO') + '</div><div>' + (to || '&nbsp;') + '</div></div><div class="qbf-doc-kv">' +
      meta.map(function (m) { return '<div><span>' + esc(m[0]) + '</span><b>' + esc(m[1] || '') + '</b></div>'; }).join('') + '</div></div>' +
      (o.table !== false ? '<table class="qbf-doc-lines"><thead><tr><th>PRODUCT/SERVICE</th><th>DESCRIPTION</th><th class="ta-r">QTY</th><th class="ta-r">RATE</th><th class="ta-r">AMOUNT</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5" class="qbf-muted">No line items</td></tr>') + '</tbody></table>' : (o.custom || '')) +
      '<div class="qbf-doc-foot"><div class="qbf-doc-note">' + esc(t.note || '').replace(/\n/g, '<br>') + '</div><div class="qbf-doc-tot">' +
      tot.map(function (x) { return '<div><span>' + x[0] + '</span><b>' + x[1] + '</b></div>'; }).join('') + big + '</div></div></div>';
  }
  function emailHtml(t, o) {
    var co = S.company, c = S.cust[t.cust];
    return '<div class="qbf-mail"><div class="qbf-mail-hdr"><div><span>From</span>' + esc(co.name) + ' &lt;' + esc(co.email) + '&gt;</div><div><span>To</span>' + esc(t.email || (c && c.email) || '') + '</div><div><span>Subject</span>' + esc(o.typeLabel + ' ' + t.no + ' from ' + co.name) + '</div></div>' +
      '<div class="qbf-mail-card"><div class="qbf-mail-co">' + esc(co.name) + '</div>' + (o.dueText ? '<div class="qbf-mail-due">' + esc(o.dueText) + '</div>' : '') + '<div class="qbf-mail-amt">' + money(o.big != null ? o.big : t.total || 0) + '</div>' +
      (o.payBtn ? '<button type="button" class="qb-btn qb-btn-primary" disabled>Review and pay</button>' : '<button type="button" class="qb-btn qb-btn-primary" disabled>View ' + esc(lc(o.typeLabel)) + '</button>') + '</div>' +
      '<div class="qbf-mail-body">Dear ' + esc(c ? c.name : 'customer') + ',<br><br>We appreciate your business. Please find your ' + esc(lc(o.typeLabel)) + ' details here. Feel free to contact us if you have any questions.<br><br>Have a great day!<br>' + esc(co.name) + '</div>' +
      '<div class="qbf-mail-doc">' + docHtml(t, o) + '</div></div>';
  }
  function payorHtml(t, o) {
    var co = S.company;
    return '<div class="qbf-payor"><div class="qbf-payor-bar">' + esc(co.name) + '</div><div class="qbf-payor-wrap"><div class="qbf-payor-pay">' +
      '<div class="qbf-payor-lbl">' + esc(o.typeLabel) + ' ' + esc(t.no) + '</div><div class="qbf-payor-amt">' + money(o.big != null ? o.big : t.total || 0) + '</div>' +
      (o.dueText ? '<div class="qbf-muted">' + esc(o.dueText) + '</div>' : '') +
      '<div class="qbf-payor-opts"><label><input type="radio" disabled checked> Bank transfer (ACH)</label><label><input type="radio" disabled> Card</label></div>' +
      '<button type="button" class="qb-btn qb-btn-primary" disabled>Pay ' + money(o.big != null ? o.big : t.total || 0) + '</button>' +
      '<p class="qbf-muted">Online payments are turned off for this practice company. This is what your customer sees when they open the link.</p>' +
      '<div class="qbf-payor-links"><span>' + ic('print') + 'Print</span><span>' + ic('upload') + 'Download</span></div></div>' +
      '<div class="qbf-payor-doc">' + docHtml(t, o) + '</div></div></div>';
  }

  /* Review and send: To / Cc / Bcc / Subject / Body, then Send. */
  function sendDialog(t, typeLabel, onSend) {
    var c = S.cust[t.cust] || S.vend[t.payee], co = S.company;
    var subject = typeLabel + ' ' + t.no + ' from ' + co.name;
    var body = 'Dear ' + (c ? c.name : 'customer') + ',\n\nWe appreciate your business. Please find your ' + lc(typeLabel) + ' details here. Feel free to contact us if you have any questions.\n\nHave a great day!\n' + co.name;
    var html = '<div class="qbf-send"><div class="qbf-send-form">' +
      UI.field('From', UI.input('sfrom', co.email, ' readonly')) +
      UI.field('To', UI.input('sto', t.email || (c && c.email) || '')) +
      '<div class="qbf-grid2">' + UI.field('Cc', UI.input('scc', t.cc || '')) + UI.field('Bcc', UI.input('sbcc', t.bcc || '')) + '</div>' +
      UI.field('Subject', UI.input('ssub', subject)) +
      UI.field('Body', '<textarea class="qb-input" name="sbody" rows="8">' + esc(body) + '</textarea>') +
      '<label class="qbf-check"><input type="checkbox" name="scopy"> Send me a copy</label>' +
      '<label class="qbf-check"><input type="checkbox" name="spdf" checked> Attach ' + esc(lc(typeLabel)) + ' as PDF</label>' +
      '</div><div class="qbf-send-prev">' + docHtml(t, { head: typeLabel.toUpperCase() }) + '</div></div>';
    UI.modal('Send ' + lc(typeLabel), html, {
      wide: true, cls: 'qbf-send-modal', buttons: [['Cancel', 'secondary'], ['Send', 'primary', function (el) {
        var to = el.querySelector('[name=sto]');
        var ok = to.value.split(/[,;]\s*/).filter(Boolean).every(function (x) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.trim()); });
        if (!to.value.trim() || !ok) {
          to.classList.add('is-err');
          if (!el.querySelector('.qbf-ferr')) to.insertAdjacentHTML('afterend', '<div class="qbf-ferr">' + ic('alert') + '<span>Enter a valid email address</span></div>');
          return false;
        }
        onSend({ to: to.value.trim(), cc: el.querySelector('[name=scc]').value.trim(), bcc: el.querySelector('[name=sbcc]').value.trim(), subject: el.querySelector('[name=ssub]').value, body: el.querySelector('[name=sbody]').value });
      }]]
    });
  }

  /* ───────── opts normalizer ─────────
     Other modules pass ids or objects; every form receives the same shape:
     txn/from/copy -> transaction objects; cust/payee/vendor/item/invoice/bill -> ids;
     customer/account -> objects; template (recurring) -> payee/cust + amount + memo. */
  function idOf(v) { return v && typeof v === 'object' ? v.id : v; }
  function byName(name) {
    if (!name) return null;
    var n = String(name).toLowerCase();
    var v = S.vendors.filter(function (x) { return x.name.toLowerCase() === n; })[0];
    if (v) return { vend: v.id };
    var c = S.customers.filter(function (x) { return x.name.toLowerCase() === n || S.custName(x.id).toLowerCase() === n; })[0];
    return c ? { cust: c.id } : null;
  }
  function norm(o) {
    o = assign({}, o || {});
    ['txn', 'from', 'copy'].forEach(function (k) { if (typeof o[k] === 'string') o[k] = S.txn[o[k]] || null; });
    ['cust', 'payee', 'vendor', 'item', 'invoice', 'bill'].forEach(function (k) { if (o[k] && typeof o[k] === 'object') o[k] = idOf(o[k]); });
    if (typeof o.customer === 'string') o.customer = S.cust[o.customer] || null;
    if (typeof o.account === 'string') o.account = S.acct[o.account] || null;
    if (typeof o.task === 'string') o.task = S.tasks.filter(function (t) { return t.id === o.task; })[0] || null;
    if (o.template && typeof o.template === 'object') {
      var tp = o.template, hit = byName(tp.payee);
      if (hit && hit.cust && !o.cust) o.cust = hit.cust;
      if (hit && hit.vend && !o.payee && !o.vendor) o.vendor = hit.vend;
      if (o.amount == null && tp.amount) o.amount = tp.amount;
      if (!o.memo && tp.name) o.memo = tp.name;
    }
    if (o.cust && !S.cust[o.cust]) { var h1 = byName(o.cust); o.cust = h1 && h1.cust ? h1.cust : ''; }
    if (o.amount != null) o.amount = num(o.amount);
    return o;
  }
  function reg(name, fn) { QB.form(name, function (o) { return fn(norm(o)); }); }

  /* Field wrappers. fld() is a <div> so it can hold checkboxes and buttons;
     UI.field() is a <label> for a single control. */
  function fld(lbl, inner, cls) { return '<div class="qb-field ' + (cls || '') + '"><span class="qb-label">' + lbl + '</span>' + inner + '</div>'; }
  function inp(name, v, cls, attrs) { return '<input class="qb-input' + (cls ? ' ' + cls : '') + '" name="' + name + '" value="' + esc(v == null ? '' : v) + '"' + (attrs || '') + '>'; }
  function area(name, v, rows, ph) { return '<textarea class="qb-input" name="' + name + '" rows="' + (rows || 3) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>' + esc(v || '') + '</textarea>'; }
  function check(name, on, lbl, attrs) { return '<label class="qbf-check"><input type="checkbox" name="' + name + '"' + (on ? ' checked' : '') + (attrs || '') + '><span>' + lbl + '</span></label>'; }

  /* ───────── editable line grid ─────────
     o: { lines, blank(), cols: [{ key, label, kind: combo|text|num|money|check|static, list, onNew, addNew,
          pick(line, value), calc(line, key), render(line), width, hours, dis(line) }],
          min, onChange(), foot(), cls, copy, drag } */
  function grid(host, o) {
    var api = { lines: o.lines };
    function colOf(k) { return o.cols.filter(function (c) { return c.key === k; })[0]; }
    function cell(c, l) {
      var v = l[c.key];
      if (c.kind === 'combo') return '<td class="qbf-cell qbf-c-' + c.key + '">' + UI.comboHtml('g_' + c.key, '', c.ph || '') + '</td>';
      if (c.kind === 'check') return '<td class="c qbf-c-' + c.key + '"><input type="checkbox" data-f="' + c.key + '"' + (v ? ' checked' : '') + (c.dis && c.dis(l) ? ' disabled' : '') + ' aria-label="' + esc(c.label) + '"></td>';
      if (c.kind === 'static') return '<td class="qbf-static' + (c.align === 'right' ? ' ta-r' : '') + '" data-s="' + c.key + '">' + (c.render ? c.render(l) : esc(v == null ? '' : v)) + '</td>';
      var val = c.kind === 'money' ? amt(v) : c.kind === 'num' ? (c.hours ? fmtHours(v) : fmtQty(v)) : (v == null ? '' : v);
      return '<td class="qbf-cell' + (c.kind === 'money' || c.kind === 'num' ? ' num' : '') + ' qbf-c-' + c.key + '"><input data-f="' + c.key + '" value="' + esc(val) + '"' + (c.kind !== 'text' ? ' inputmode="decimal"' : '') + (c.ph ? ' placeholder="' + esc(c.ph) + '"' : '') + ' aria-label="' + esc(c.label) + '"></td>';
    }
    function row(l, i) {
      return '<tr data-i="' + i + '"' + (l.src ? ' class="is-linked" title="Added from a linked transaction"' : '') + '>' +
        (o.drag !== false ? '<td class="qb-ln-drag" data-drag title="Drag to reorder">' + ic('drag') + '</td>' : '') +
        '<td class="qb-ln-no">' + (i + 1) + '</td>' + o.cols.map(function (c) { return cell(c, l); }).join('') +
        '<td class="qb-ln-del">' + (o.copy ? '<button type="button" data-g="copy" aria-label="Copy line">' + ic('copy') + '</button>' : '') +
        '<button type="button" data-g="del" aria-label="Delete line">' + ic('trash') + '</button></td></tr>';
    }
    function bindRow(tr) {
      tr._cb = {};
      o.cols.forEach(function (c) {
        if (c.kind !== 'combo') return;
        var input = tr.querySelector('[name="g_' + c.key + '"]');
        input.setAttribute('data-f', c.key);
        input.setAttribute('aria-label', c.label);
        var i0 = +tr.getAttribute('data-i');
        tr._cb[c.key] = combo(input, c.list, {
          value: o.lines[i0][c.key], minWidth: c.minWidth || 280, addNew: c.addNew, onNew: c.onNew,
          onPick: function (v, item) {
            var idx = +tr.getAttribute('data-i'), l = o.lines[idx]; if (!l) return;
            if ((l[c.key] || '') === (v || '') && item) { sync(tr, l); return; }
            l[c.key] = v || '';
            if (c.pick) c.pick(l, v, item);
            sync(tr, l);
            if (v && idx === o.lines.length - 1 && o.autoAdd !== false) add();
            changed();
          }
        });
      });
    }
    function sync(tr, l) {
      o.cols.forEach(function (c) {
        if (c.kind === 'combo') { var cb = tr._cb && tr._cb[c.key]; if (cb && cb.get() !== (l[c.key] || '')) cb.set(l[c.key], true); return; }
        if (c.kind === 'static') { var s = tr.querySelector('[data-s="' + c.key + '"]'); if (s) s.innerHTML = c.render ? c.render(l) : esc(l[c.key] == null ? '' : l[c.key]); return; }
        var e = tr.querySelector('[data-f="' + c.key + '"]'); if (!e || e === document.activeElement) return;
        if (c.kind === 'check') { e.checked = !!l[c.key]; if (c.dis) e.disabled = !!c.dis(l); }
        else e.value = c.kind === 'money' ? amt(l[c.key]) : c.kind === 'num' ? (c.hours ? fmtHours(l[c.key]) : fmtQty(l[c.key])) : (l[c.key] == null ? '' : l[c.key]);
      });
    }
    function changed() { if (o.onChange) o.onChange(); api.refreshFoot(); }
    function render() {
      host.innerHTML = '<table class="qb-lines qbf-lines' + (o.cls ? ' ' + o.cls : '') + '"><thead><tr>' + (o.drag !== false ? '<th class="qb-ln-drag"></th>' : '') + '<th class="qb-ln-no">#</th>' +
        o.cols.map(function (c) {
          return '<th class="' + (c.kind === 'money' || c.kind === 'num' || c.align === 'right' ? 'ta-r' : c.kind === 'check' ? 'ta-c' : '') + '"' + (c.width ? ' style="width:' + c.width + '"' : '') + '>' + esc(c.label) + '</th>';
        }).join('') + '<th class="qb-ln-del"></th></tr></thead><tbody>' + o.lines.map(row).join('') + '</tbody>' + (o.foot ? '<tfoot>' + o.foot() + '</tfoot>' : '') + '</table>';
      U.$$('tbody tr', host).forEach(bindRow);
    }
    function add(l) {
      o.lines.push(l || o.blank());
      var tb = host.querySelector('tbody'), i = o.lines.length - 1;
      tb.insertAdjacentHTML('beforeend', row(o.lines[i], i));
      bindRow(tb.lastElementChild);
    }
    host.addEventListener('input', function (e) {
      var tr = e.target.closest('tr[data-i]'), f = e.target.getAttribute('data-f'); if (!tr || !f) return;
      var c = colOf(f); if (!c || c.kind === 'combo' || c.kind === 'check') return;
      var l = o.lines[+tr.getAttribute('data-i')], raw = e.target.value;
      l[f] = c.kind === 'text' ? raw : (raw.trim() === '' ? '' : (c.hours ? parseHours(raw) : num(raw)));
      if (c.calc) c.calc(l, f);
      sync(tr, l); changed();
    });
    host.addEventListener('change', function (e) {
      var tr = e.target.closest('tr[data-i]'), f = e.target.getAttribute('data-f'); if (!tr || !f) return;
      var c = colOf(f); if (!c || c.kind !== 'check') return;
      var l = o.lines[+tr.getAttribute('data-i')];
      l[f] = e.target.checked;
      if (c.calc) c.calc(l, f);
      sync(tr, l); changed();
    });
    host.addEventListener('focusout', function (e) {
      var tr = e.target.closest('tr[data-i]'), f = e.target.getAttribute('data-f'); if (!tr || !f) return;
      var c = colOf(f); if (!c) return;
      var l = o.lines[+tr.getAttribute('data-i')]; if (!l) return;
      if (c.kind === 'money') e.target.value = amt(l[f]);
      if (c.kind === 'num' && c.hours) e.target.value = fmtHours(l[f]);
    });
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-g]'); if (!b) return;
      var i = +b.closest('tr').getAttribute('data-i');
      if (b.getAttribute('data-g') === 'del') {
        o.lines.splice(i, 1);
        while (o.lines.length < (o.min || 1)) o.lines.push(o.blank());
      } else {
        var cp = clone(o.lines[i]); delete cp.src; o.lines.splice(i + 1, 0, cp);
      }
      render(); changed();
    });
    var dragFrom = -1;
    host.addEventListener('mousedown', function (e) { var h = e.target.closest('[data-drag]'); if (h) h.parentNode.draggable = true; });
    host.addEventListener('dragstart', function (e) {
      var tr = e.target.closest && e.target.closest('tr[data-i]'); if (!tr) return;
      dragFrom = +tr.getAttribute('data-i'); tr.classList.add('is-drag');
      try { e.dataTransfer.setData('text/plain', String(dragFrom)); e.dataTransfer.effectAllowed = 'move'; } catch (x) {}
    });
    host.addEventListener('dragover', function (e) {
      if (dragFrom < 0) return;
      var tr = e.target.closest('tr[data-i]'); if (!tr) return;
      e.preventDefault();
      U.$$('tr.is-over', host).forEach(function (x) { x.classList.remove('is-over'); });
      tr.classList.add('is-over');
    });
    host.addEventListener('drop', function (e) {
      var tr = e.target.closest('tr[data-i]'); if (!tr || dragFrom < 0) return;
      e.preventDefault();
      var to = +tr.getAttribute('data-i'), mv = o.lines.splice(dragFrom, 1)[0];
      o.lines.splice(to, 0, mv); dragFrom = -1;
      render(); changed();
    });
    host.addEventListener('dragend', function () {
      dragFrom = -1;
      U.$$('tr', host).forEach(function (tr) { tr.draggable = false; tr.classList.remove('is-drag', 'is-over'); });
    });
    api.render = render;
    api.add = function (l) { add(l); changed(); };
    api.clear = function () { o.lines.length = 0; for (var k = 0; k < (o.min || 2); k++) o.lines.push(o.blank()); render(); changed(); };
    api.refreshFoot = function () { var tf = host.querySelector('tfoot'); if (tf && o.foot) tf.innerHTML = o.foot(); };
    api.rowEl = function (i) { return host.querySelector('tr[data-i="' + i + '"]'); };
    api.field = function (i, key) { var tr = api.rowEl(i); return tr && tr.querySelector('[data-f="' + key + '"]'); };
    api.syncAll = function () { U.$$('tbody tr', host).forEach(function (tr) { var l = o.lines[+tr.getAttribute('data-i')]; if (l) sync(tr, l); }); api.refreshFoot(); };
    render();
    return api;
  }

  /* ───────── sales forms ───────── */
  var CHARGES = ['Time Charge', 'Charge', 'Billable Expense Charge', 'Credit'];
  var SALES = {
    'Invoice': { type: 'Invoice', head: 'INVOICE', dateLbl: 'Invoice date', noLbl: 'Invoice no.', totalLbl: 'Invoice total', terms: 1, email: 1, payOpts: 1, balance: 1, deposit: 1, suggest: 1, send: 1, tabs: 1, seq: 'sales' },
    'Estimate': { type: 'Estimate', head: 'ESTIMATE', dateLbl: 'Estimate date', noLbl: 'Estimate no.', totalLbl: 'Estimate total', expires: 1, email: 1, send: 1, tabs: 1, statuses: ['Pending', 'Accepted', 'Closed', 'Rejected'], convert: 1, seq: 'Estimate' },
    'Sales Receipt': { type: 'Sales Receipt', head: 'SALES RECEIPT', dateLbl: 'Sales receipt date', noLbl: 'Sales receipt no.', totalLbl: 'Total', paidLbl: 'Amount received', method: 1, depositTo: 1, email: 1, send: 1, tabs: 1, seq: 'sales' },
    'Credit Memo': { type: 'Credit Memo', head: 'CREDIT MEMO', dateLbl: 'Credit memo date', noLbl: 'Credit memo no.', totalLbl: 'Total credit', email: 1, send: 1, tabs: 1, seq: 'sales' },
    'Refund': { type: 'Refund', title: 'Refund Receipt', head: 'REFUND RECEIPT', dateLbl: 'Refund receipt date', noLbl: 'Refund receipt no.', totalLbl: 'Total', paidLbl: 'Amount refunded', method: 1, refundFrom: 1, email: 1, send: 1, tabs: 1, seq: 'sales' },
    'Delayed Charge': { type: 'Charge', title: 'Delayed Charge', head: 'DELAYED CHARGE', dateLbl: 'Delayed charge date', noLbl: 'Delayed charge no.', totalLbl: 'Total', noTax: 1, open: 1, seq: 'Charge' },
    'Delayed Credit': { type: 'Credit', title: 'Delayed Credit', head: 'DELAYED CREDIT', dateLbl: 'Delayed credit date', noLbl: 'Delayed credit no.', totalLbl: 'Total', noTax: 1, open: 1, seq: 'Credit' },
    'Sales Order': { type: 'Sales Order', head: 'SALES ORDER', dateLbl: 'Sales order date', noLbl: 'Sales order no.', totalLbl: 'Total', email: 1, ship: 1, send: 1, tabs: 1, statuses: ['Open', 'Closed'], convert: 1, seq: 'Sales Order' }
  };
  function payLogos(small) {
    function card(inner, bg) { return '<svg class="qbf-card-logo" viewBox="0 0 46 28" aria-hidden="true"><rect x=".5" y=".5" width="45" height="27" rx="4" fill="' + bg + '" stroke="#d4d7dc"/>' + inner + '</svg>'; }
    function txt(s, fill, size) { return '<text x="23" y="18" text-anchor="middle" font-size="' + (size || 9) + '" font-weight="700" font-family="Arial,Helvetica,sans-serif" fill="' + fill + '">' + s + '</text>'; }
    return '<div class="qbf-paylogos' + (small ? ' is-small' : '') + '">' +
      card('<circle cx="15" cy="14" r="4" fill="#fff"/>' + '<text x="29" y="18" text-anchor="middle" font-size="9" font-weight="700" font-family="Arial,sans-serif" fill="#fff">Pay</text>', '#111') +
      card(txt('VISA', '#1a1f71', 10), '#fff') +
      card('<circle cx="19" cy="14" r="7" fill="#eb001b"/><circle cx="27" cy="14" r="7" fill="#f79e1b" fill-opacity=".85"/>', '#fff') +
      card(txt('DISCOVER', '#e55c00', 7), '#fff') +
      card(txt('AMEX', '#fff', 9), '#2e77bc') +
      card(txt('BANK', '#393a3d', 8), '#fff') + '</div>';
  }
  function blankLine() { return { item: '', acct: '', desc: '', qty: '', rate: '', amount: '', taxable: false, src: '' }; }
  function lineCopy(l, src, sign) {
    sign = sign || 1;
    return {
      item: l.item || '', acct: l.acct || '', desc: l.desc || '',
      qty: l.qty != null && l.qty !== '' ? l.qty : '', rate: l.rate != null && l.rate !== '' ? q4(sign * l.rate) : '',
      amount: l.amount != null && l.amount !== '' ? r2(sign * l.amount) : '', taxable: !!l.taxable, src: src || ''
    };
  }
  function chargeLines(ch) {
    var sign = ch.type === 'Credit' ? -1 : 1;
    return (ch.lines || []).map(function (l) {
      var x = lineCopy(l, ch.id, sign);
      if (!x.desc) x.desc = ch.memo || '';
      if (ch.type === 'Billable Expense Charge' && !x.item) x.acct = x.acct || 'a_bexp';
      return x;
    });
  }
  function srcIds(t) { var o = {}; ((t && t.lines) || []).forEach(function (l) { if (l.src) o[l.src] = 1; }); return Object.keys(o); }
  function linkSources(t, oldIds) {
    var now = srcIds(t);
    (oldIds || []).forEach(function (id) { if (now.indexOf(id) < 0 && S.txn[id]) { S.txn[id].status = 'Open'; delete S.txn[id].invoiceId; } });
    now.forEach(function (id) { if (S.txn[id]) { S.txn[id].status = 'Converted'; S.txn[id].invoiceId = t.id; } });
  }
  function custIds(id) { return [id].concat(S.customers.filter(function (c) { return c.parent === id; }).map(function (c) { return c.id; })); }
  function sumApplied(p, docId) { return r2((p.applied || []).filter(function (a) { return a.id === docId; }).reduce(function (s, a) { return s + a.amount; }, 0)); }
  /* "Automatically apply credits": a new credit memo pays the oldest open invoices. */
  function autoApplyCredit(cm) {
    var rem = cm.total, applied = [];
    S.txns.filter(function (t) { return t.type === 'Invoice' && t.cust === cm.cust && !t.hidden && L.openBalance(t) > 0.004; })
      .sort(function (a, b) { return (a.due || a.date) < (b.due || b.date) ? -1 : 1; })
      .forEach(function (inv) {
        if (rem <= 0.004) return;
        var a = r2(Math.min(rem, L.openBalance(inv)));
        applied.push({ id: inv.id, amount: a }); rem = r2(rem - a);
      });
    if (!applied.length) return;
    S.add({ type: 'Payment', no: '', date: cm.date, cust: cm.cust, total: 0, account: 'a_undep', method: '', memo: 'Created by QB Online to link credits to charges.', lines: [], applied: applied.concat([{ id: cm.id, amount: r2(cm.total - rem), credit: true }]) }, true);
  }
  function statusStrip(t) {
    if (['Invoice', 'Estimate', 'Sales Receipt', 'Credit Memo', 'Refund', 'Charge', 'Credit', 'Billable Expense Charge', 'Sales Order'].indexOf(t.type) < 0) return '';
    var s = L.status(t), extra = '';
    if (t.type === 'Invoice') {
      S.txns.filter(function (p) { return p.type === 'Payment' && (p.applied || []).some(function (a) { return a.id === t.id && a.amount > 0; }); }).forEach(function (p) {
        extra += '<button type="button" class="qb-link" data-q="openpay:' + p.id + '">' + money(sumApplied(p, t.id)) + ' payment received on ' + U.fmtDate(p.date) + '</button>';
      });
    }
    if (t.emailStatus === 'Sent') extra += '<span class="qbf-muted">' + ic('mail') + ' Sent to ' + esc(t.sentTo || t.email || '') + '</span>';
    if (t.voided) extra += '<span class="qbf-void">VOIDED</span>';
    if (!s.text && !extra) return '';
    return '<div class="qbf-strip">' + UI.statusHtml(s) + extra + '</div>';
  }

  function salesForm(key, opts) {
    var cfg = SALES[key], t0 = opts.txn || null, from = opts.from || null;
    var fromCharge = from && CHARGES.indexOf(from.type) >= 0;
    var src = t0 || opts.copy || (from && !fromCharge ? from : null);
    var type = t0 ? t0.type : cfg.type;
    var co = S.company, set = S.settings;
    var title = t0 && t0.type === 'Billable Expense Charge' ? 'Billable Expense Charge' : (cfg.title || key);
    var st = {
      cust: (src && src.cust) || (from && from.cust) || opts.cust || '',
      lines: [], tags: src && src.tags ? src.tags.slice() : [],
      attachments: t0 && t0.attachments ? clone(t0.attachments) : [],
      discMode: src && src.discountAmt && !src.discountPct ? '$' : '%',
      editTotals: !!(t0 && t0.taxOverride != null),
      showDeposit: !!(t0 && t0.depositAmt),
      oldLines: t0 ? clone(t0.lines) : [], oldSrc: srcIds(t0), sgHidden: false, sgFilter: ''
    };
    if (src) src.lines.forEach(function (l) { st.lines.push(lineCopy(l, t0 ? l.src : '')); });
    if (fromCharge) chargeLines(from).forEach(function (l) { st.lines.push(l); });
    st.lines.push(blankLine());
    while (st.lines.length < 2) st.lines.push(blankLine());
    if (!src && !fromCharge && opts.amount) assign(st.lines[0], { qty: 1, rate: r2(opts.amount), amount: r2(opts.amount), desc: opts.memo || (opts.template && opts.template.name) || '' });
    var c0 = S.cust[st.cust];
    var date0 = t0 ? t0.date : U.today();
    var terms0 = t0 && t0.terms ? t0.terms : ((c0 && c0.terms) || set.preferredTerms || 'Net 30');
    var due0 = t0 && t0.due ? t0.due : U.addDays(date0, U.termsDays(terms0));
    var no0 = t0 ? (t0.no || '') : (cfg.seq === 'sales' ? nextSalesNo() : S.nextNo(cfg.seq));
    var taxId0 = taxIdFor(src);
    var showTax = !cfg.noTax, showDisc = !cfg.noTax && set.discount !== false;
    var discVal = src ? (src.discountPct || src.discountAmt || '') : '';

    /* paper: heading + company */
    var sheetTop = '<div class="qbf-sheet-top"><div class="qbf-co"><div class="qbf-doc-head">' + cfg.head + '</div>' +
      '<div class="qbf-co-name" data-o="coname">' + esc(co.name) + '</div><div class="qbf-co-lines" data-o="colines">' + esc(co.email) + '<br>' + esc(co.street) + '<br>' + esc(co.city + ' ' + co.state + ' ' + co.zip) + '</div>' +
      '<button type="button" class="qb-link" data-q="editco">Edit company</button></div>' +
      '<div class="qbf-co-right"><button type="button" class="qbf-logo" data-q="logo" aria-label="Add your logo"><span data-o="logo">' + (co.logo ? '<img src="' + esc(co.logo) + '" alt="">' : ic('store') + '<span class="qbf-logo-pen">' + ic('pencil') + '</span>') + '</span></button>' +
      '<input type="file" accept="image/*" hidden data-logo>' +
      (cfg.balance ? '<div class="qbf-baldue">' + ic('eyeOff') + '<span>Balance due (hidden): <b data-o="baldue">$0.00</b></span></div>' : '') + '</div></div>';

    /* blue band: customer and dates */
    var bandL = fld('Customer', UI.comboHtml('cust', '', 'Add customer'), 'qbf-f-cust');
    if (cfg.email) {
      bandL += '<div class="qbf-custonly"><div class="qbf-emailrow">' + fld('Customer email', inp('email', t0 ? t0.email : (c0 && c0.email) || '', '', ' type="email"')) +
        '<button type="button" class="qb-link qbf-ccbcc" data-q="ccbcc">Cc/Bcc</button></div>' +
        '<div class="qbf-ccrow"' + (t0 && (t0.cc || t0.bcc) ? '' : ' hidden') + '>' + fld('Cc', inp('cc', t0 ? t0.cc : '')) + fld('Bcc', inp('bcc', t0 ? t0.bcc : '')) + '</div></div>';
    }
    bandL += '<div class="qbf-custonly qbf-addr">' + fld('Bill to', area('billto', t0 && t0.billTo != null ? t0.billTo : custAddress(c0), 4)) +
      (cfg.ship ? fld('Ship to', area('shipto', t0 && t0.shipTo != null ? t0.shipTo : custAddress(c0), 4)) : '') + '</div>' +
      '<div class="qbf-custonly"><button type="button" class="qb-link" data-q="editcust">Edit Customer</button></div>';
    var bandR = '';
    if (cfg.terms) bandR += fld('Terms', UI.select('terms', U.TERMS, terms0));
    bandR += fld(cfg.dateLbl, UI.dateInput('date', date0));
    if (cfg.terms) bandR += fld('Due date', UI.dateInput('due', due0));
    if (cfg.expires) bandR += fld('Expiration date', UI.dateInput('expires', t0 && t0.expires ? t0.expires : U.addDays(date0, 30)));
    if (cfg.ship) bandR += fld('Ship date', UI.dateInput('shipdate', t0 ? t0.shipDate : '')) + fld('Ship via', inp('shipvia', t0 ? t0.shipVia : ''));
    if (cfg.method) bandR += fld('Payment method', UI.select('method', [['', 'Choose payment method']].concat(U.METHODS), t0 ? t0.method : '')) + fld('Reference no.', inp('ref', t0 ? t0.ref : ''));
    if (cfg.depositTo) bandR += fld('Deposit to', UI.select('account', acctOpts(['Bank'], ['a_undep']), t0 ? t0.account : 'a_undep'));
    if (cfg.refundFrom) bandR += fld('Refund from', UI.select('account', [['', 'Choose an account']].concat(acctOpts(['Bank', 'Credit Card'])), t0 ? t0.account : 'a_chk') + '<span class="qbf-bal" data-o="acctbal"></span>') +
      fld('Check no.', '<span class="qbf-inline">' + inp('checkno', t0 ? t0.checkNo || '' : '') + check('printlater', t0 && t0.printLater, 'Print later') + '</span>');
    if (cfg.statuses) bandR += fld('Status', UI.select('status', cfg.statuses, t0 && t0.status ? t0.status : cfg.statuses[0]));
    bandR += fld(cfg.noLbl, inp('no', no0));

    var tagsHtml = set.tags !== false ? '<div class="qbf-tags">' + fld('Tags (hidden) <button type="button" class="qb-link qbf-tagman" data-q="tagman">Manage tags</button>',
      '<div class="qbf-tagbox"><span class="qbf-tagchips"></span><input name="tagin" placeholder="Start typing to add a tag" autocomplete="off"></div>') + '</div>' : '';
    var linesHtml = '<section class="qbf-sec qbf-sec-lines"><div class="qbf-sec-h"><h3>Product or service</h3><button type="button" class="qb-link qbf-sgshow" data-q="sgshow" hidden></button></div><div class="qbf-lines-host"></div>' +
      '<div class="qb-lines-acts"><span class="qbf-addsplit"><button type="button" class="qb-btn" data-q="addline">Add product or service</button><button type="button" class="qb-btn qbf-addcaret" data-q="addmenu" aria-label="More ways to add">' + ic('caretDown') + '</button></span>' +
      '<button type="button" class="qb-btn" data-q="clearlines">Clear all lines</button></div></section>';

    var noteDefault = 'Thank you for your business and have a great day!';
    var left = '';
    if (cfg.payOpts) left += '<div class="qbf-payopts"><div class="qbf-row-between"><b>Customer payment options</b><button type="button" class="qb-link" data-q="payopts">Edit</button></div>' + payLogos() +
      '<p class="qbf-muted">Activate online card or bank transfer payments for your customers.</p><button type="button" class="qb-link" data-q="activate">Activate payments</button>' +
      area('paynote', t0 ? t0.payNote : '', 2, 'Tell your customer how you want to get paid.') + '</div>';
    if (!cfg.open) left += fld('Note to customer', area('note', src && src.note != null ? src.note : noteDefault, 3));
    left += fld('Internal customer notes (hidden)', area('internal', c0 ? c0.notes : '', 2, 'Add notes about this customer. This is only visible to you.'));
    left += fld(cfg.open ? 'Memo' : 'Memo on statement (hidden)', area('memo', t0 ? t0.memo : (src && !src.no ? '' : ''), 2, cfg.open ? '' : 'This memo will not show up on your ' + lc(typeName(type)) + ', but will appear on the statement.'));
    left += attachHtml();

    var right = '<div class="qbf-tot">' +
      '<div class="qbf-tr"><span>Subtotal</span><b data-o="sub">$0.00</b></div>' +
      (showDisc ? '<div class="qbf-tr qbf-tr-disc"><span>Discount</span><span class="qbf-disc-in">' + inp('disc', discVal, 'qbf-disc', ' inputmode="decimal" aria-label="Discount"') +
        '<span class="qbf-seg"><button type="button" data-q="discmode:%" class="' + (st.discMode === '%' ? 'on' : '') + '">%</button><button type="button" data-q="discmode:$" class="' + (st.discMode === '$' ? 'on' : '') + '">$</button></span></span><b data-o="disc">$0.00</b></div>' : '') +
      (showTax ? '<div class="qbf-tr"><span>Taxable subtotal</span><b data-o="taxable">$0.00</b></div>' +
        '<div class="qbf-tr"><span>Select sales tax rate</span>' + UI.select('taxid', taxRates().map(function (r) { return [r.id, r.name]; }), taxId0) + '</div>' +
        '<div class="qbf-tr"><span>Sales tax <span class="qbf-q" title="Sales tax is calculated on the taxable subtotal after discounts.">' + ic('help') + '</span></span><span class="qbf-taxcell"><b data-o="tax">$0.00</b>' +
        inp('taxamt', t0 && t0.taxOverride != null ? U.num(t0.taxOverride) : '', 'qbf-money qbf-taxamt', (st.editTotals ? '' : ' hidden') + ' aria-label="Sales tax amount"') + '</span></div>' +
        '<div class="qbf-tr qbf-tr-link"><button type="button" class="qb-link" data-q="math">See the math</button></div>' : '') +
      '<div class="qbf-tr qbf-tr-total"><span>' + esc(cfg.totalLbl) + '</span><b data-o="total">$0.00</b></div>' +
      (cfg.deposit ? '<div class="qbf-tr qbf-tr-dep"' + (st.showDeposit ? '' : ' hidden') + '><span>Deposit</span>' + inp('deposit', t0 && t0.depositAmt ? U.num(t0.depositAmt) : '', 'qbf-money qbf-depin', ' inputmode="decimal" aria-label="Deposit"') + '</div>' : '') +
      (cfg.balance ? '<div class="qbf-tr qbf-tr-bal"><span>Balance due</span><b data-o="bal">$0.00</b></div>' : '') +
      (cfg.paidLbl ? '<div class="qbf-tr qbf-tr-bal"><span>' + esc(cfg.paidLbl) + '</span><b data-o="paid">$0.00</b></div>' : '') +
      '<div class="qbf-tot-links">' + (cfg.deposit ? '<button type="button" class="qb-link" data-q="adddep"' + (st.showDeposit ? ' hidden' : '') + '>+ Charge a deposit</button>' : '') +
      (showTax ? '<button type="button" class="qb-link" data-q="edittot">' + (st.editTotals ? 'Done editing' : 'Edit totals') + '</button>' : '') + '</div></div>';

    var body = '<div class="qbf-sales' + (st.cust ? ' has-cust' : '') + '"><div class="qbf-sales-main">' + (t0 ? statusStrip(t0) : '') +
      '<div class="qb-paper qbf-sheet">' + sheetTop +
      '<div class="qbf-band"><div class="qbf-band-l">' + bandL + '</div><div class="qbf-band-r">' + bandR + '</div><button type="button" class="qbf-band-toggle" data-q="collapse" aria-label="Collapse customer details">' + ic('caretUp') + '</button></div>' +
      tagsHtml + linesHtml + '<div class="qbf-sheet-bottom"><div class="qbf-sb-l">' + left + '</div><div class="qbf-sb-r">' + right + '</div></div></div></div>' +
      (cfg.suggest ? '<aside class="qbf-suggest" hidden></aside>' : '') + '</div>' + (cfg.tabs ? '<div class="qbf-preview" hidden></div>' : '');

    var footer = { left: t0 ? moreBtn() : '', center: '<button type="button" class="qb-link" data-q="print">Print or download</button>' + (cfg.open ? '' : '<button type="button" class="qb-link" data-q="recurring">Make recurring</button>'), right: '' };
    if (t0 && type === 'Invoice' && L.openBalance(t0) > 0.004) footer.right += UI.btn('Receive payment', { kind: 'tertiary', attrs: ' data-q="receive"' });
    if (t0 && cfg.convert && t0.status !== 'Closed') footer.right += UI.btn('Convert to invoice', { kind: 'tertiary', attrs: ' data-q="convert"' });
    if (t0 && (type === 'Charge' || type === 'Credit' || type === 'Billable Expense Charge') && t0.status === 'Open') footer.right += UI.btn('Create invoice', { kind: 'tertiary', attrs: ' data-q="convert"' });
    if (cfg.send) {
      footer.right += UI.split('Save', [['Save and new', 'qbf:savenew'], ['Save and close', 'qbf:saveclose']], { kind: 'secondary', act: 'qbf:save' }) +
        UI.split('Review and send', [['Save and send', 'qbf:send'], ['Save and new', 'qbf:savenew'], ['Save and close', 'qbf:saveclose']], { kind: 'primary', act: 'qbf:send' });
    } else {
      footer.right += UI.btn('Save', { kind: 'secondary', attrs: ' data-q="save"' }) + UI.split('Save and close', [['Save and new', 'qbf:savenew']], { kind: 'primary', act: 'qbf:saveclose' });
    }
    var ctx = frame({
      title: title, body: body, footer: footer, cls: 'qbf-salesform qbf-' + slug(key), hist: [type],
      tabs: cfg.tabs ? ['Edit', 'Email view', 'Payor view', 'PDF view'] : null,
      tabsRight: cfg.tabs ? '<button type="button" class="qb-ftab-tool" data-q="manage">' + ic('gear') + '<span>Manage</span></button><button type="button" class="qb-ftab-tool" data-q="tour">Take tour</button><button type="button" class="qb-ftab-tool" data-q="feedback">' + ic('comment') + '<span>Feedback</span></button>' : '',
      right: cfg.tabs ? '' : headRight()
    });
    stdHead(ctx); stdPrivacy(ctx);
    var root = ctx.$('.qbf-sales');

    /* customer */
    var custC = combo(ctx.el('cust'), QB.lists.customers, { value: st.cust, minWidth: 320, onNew: newCustomer, onPick: onCust });
    function onCust(id) {
      var prev = st.cust; st.cust = id || '';
      var c = S.cust[st.cust];
      root.classList.toggle('has-cust', !!c);
      if (c && st.cust !== prev) {
        ctx.set('email', c.email || ''); ctx.set('billto', custAddress(c)); ctx.set('shipto', custAddress(c));
        ctx.set('internal', c.notes || '');
        if (cfg.terms) { ctx.set('terms', c.terms || set.preferredTerms || 'Net 30'); recalcDue(); }
      }
      if (prev && prev !== st.cust) {
        var had = false;
        for (var i = st.lines.length - 1; i >= 0; i--) if (st.lines[i].src) { st.lines.splice(i, 1); had = true; }
        if (had) { while (st.lines.length < 2) st.lines.push(blankLine()); g.render(); }
      }
      st.sgHidden = false;
      renderSuggest(); refresh();
    }
    function recalcDue() {
      if (!cfg.terms) return;
      var d = ctx.date('date'); if (d) ctx.set('due', U.fmtDate(U.addDays(d, U.termsDays(ctx.v('terms')))));
    }
    ctx.el('terms') && ctx.el('terms').addEventListener('change', function () { recalcDue(); refresh(); });
    ctx.el('date').addEventListener('change', function () { recalcDue(); });
    ctx.on('ccbcc', function () { var r = ctx.$('.qbf-ccrow'); r.hidden = !r.hidden; });
    ctx.on('editcust', function () {
      var c = S.cust[st.cust]; if (!c) return;
      QB.openForm('Customer', { customer: c, onSaved: function (cc) { custC.set(cc.id, true); ctx.set('email', cc.email || ''); ctx.set('billto', custAddress(cc)); } });
    });
    ctx.on('collapse', function (a, el) { var b = ctx.$('.qbf-band'); b.classList.toggle('is-collapsed'); el.innerHTML = ic(b.classList.contains('is-collapsed') ? 'caretDown' : 'caretUp'); });

    /* company block and logo */
    ctx.on('editco', function () {
      var m = UI.modal('Edit company', '<div class="qbf-grid2">' + UI.field('Company name', UI.input('cn', co.name)) + UI.field('Email', UI.input('ce', co.email)) + UI.field('Street address', UI.input('cs', co.street)) + UI.field('City', UI.input('cc', co.city)) + UI.field('State', UI.input('cst', co.state)) + UI.field('ZIP code', UI.input('cz', co.zip)) + '</div>', {
        buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (el) {
          var v = function (n) { return el.querySelector('[name=' + n + ']').value.trim(); };
          if (!v('cn')) { el.querySelector('[name=cn]').classList.add('is-err'); return false; }
          co.name = v('cn'); co.email = v('ce'); co.street = v('cs'); co.city = v('cc'); co.state = v('cst'); co.zip = v('cz');
          ctx.out('coname', esc(co.name)); ctx.out('colines', esc(co.email) + '<br>' + esc(co.street) + '<br>' + esc(co.city + ' ' + co.state + ' ' + co.zip));
          UI.toast('Company info saved');
        }]]
      });
      return m;
    });
    var logoIn = ctx.$('[data-logo]');
    ctx.on('logo', function () { logoIn.click(); });
    logoIn.addEventListener('change', function () {
      var f = logoIn.files && logoIn.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { co.logo = rd.result; ctx.out('logo', '<img src="' + esc(co.logo) + '" alt="">'); UI.toast('Logo added'); };
      rd.readAsDataURL(f);
    });
    ctx.on('payopts', function () { paymentsInfo(); });
    ctx.on('activate', function () { paymentsInfo(); });
    function paymentsInfo() {
      UI.modal('Customer payment options', '<p>Let customers pay you online by card, Apple Pay or bank transfer (ACH) right from the ' + esc(lc(typeName(type))) + '.</p>' + payLogos() + '<p class="qb-muted">QuickBooks Payments is not active in this practice company, so the options stay off.</p>', { buttons: [['Got it', 'primary']] });
    }

    /* tags */
    function drawTags() {
      var h = ctx.$('.qbf-tagchips'); if (!h) return;
      h.innerHTML = st.tags.map(function (t, i) { return '<span class="qb-chip">' + esc(t) + '<button type="button" data-q="rmtag:' + i + '" aria-label="Remove tag">' + ic('close') + '</button></span>'; }).join('');
    }
    var tagIn = ctx.el('tagin');
    if (tagIn) {
      tagIn.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ',') && tagIn.value.trim()) {
          e.preventDefault();
          var v = tagIn.value.trim().replace(/,$/, '');
          if (st.tags.indexOf(v) < 0) st.tags.push(v);
          if (S.tags.indexOf(v) < 0) S.tags.push(v);
          tagIn.value = ''; drawTags(); ctx.f.dirty = true;
        } else if (e.key === 'Backspace' && !tagIn.value && st.tags.length) { st.tags.pop(); drawTags(); }
      });
      drawTags();
    }
    ctx.on('rmtag', function (i) { st.tags.splice(+i, 1); drawTags(); ctx.f.dirty = true; });
    ctx.on('tagman', function () {
      UI.modal('Tags', S.tags.length ? '<div class="qbf-taglist">' + S.tags.map(function (t) { return '<span class="qb-chip">' + esc(t) + '</span>'; }).join('') + '</div>' : '<p>No tags yet. Type a tag on any transaction and press Enter to create it.</p>', { buttons: [['Close', 'primary']] });
    });

    /* lines */
    var g = grid(ctx.$('.qbf-lines-host'), {
      lines: st.lines, blank: blankLine, min: 2, cls: 'is-case',
      onChange: function () { ctx.f.dirty = true; refresh(); },
      cols: [
        { key: 'item', label: 'Product/service', kind: 'combo', list: QB.lists.items, onNew: newItem, width: '22%', minWidth: 320,
          pick: function (l, v) {
            var it = S.item[v];
            if (!it) { l.acct = ''; return; }
            l.desc = it.desc || ''; l.rate = it.price || 0;
            if (l.qty === '' || l.qty == null) l.qty = 1;
            l.amount = r2(num(l.qty) * num(l.rate)); l.taxable = showTax && !!it.taxable; l.acct = it.incomeAcct || 'a_serv';
          } },
        { key: 'desc', label: 'Description', kind: 'text' },
        { key: 'qty', label: 'Qty', kind: 'num', width: '80px', calc: lineCalc },
        { key: 'rate', label: 'Rate', kind: 'num', width: '100px', calc: lineCalc },
        { key: 'amount', label: 'Amount', kind: 'money', width: '120px', calc: lineCalc }
      ].concat(showTax ? [
        { key: 'taxrate', label: 'Tax rate', kind: 'static', width: '120px', render: function (l) { var r = taxById(ctx.v('taxid')); return l.taxable && r ? esc(r.name) : ''; } },
        { key: 'taxable', label: 'Tax', kind: 'check', width: '50px' }
      ] : [])
    });
    function lineCalc(l, k) {
      if (k === 'qty' || k === 'rate') {
        if (l.rate !== '' || l.qty !== '') l.amount = r2((l.qty === '' ? 1 : num(l.qty)) * num(l.rate));
      } else if (k === 'amount' && l.amount !== '') {
        var qq = l.qty === '' || !num(l.qty) ? 1 : num(l.qty);
        l.rate = q4(l.amount / qq);
      }
    }
    ctx.on('addline', function () { g.add(); var f = g.field(st.lines.length - 1, 'item'); if (f) f.focus(); });
    ctx.on('addmenu', function (a, el) {
      menuAt(el, [['Add product or service', 'addline'], ['Add text line', 'addtext'], ['Add lines from estimates', 'addest']], function (k) {
        if (k === 'addline') ctx.fire('addline');
        else if (k === 'addtext') { g.add(); var f = g.field(st.lines.length - 1, 'desc'); if (f) f.focus(); }
        else addFromEstimate();
      });
    });
    function addFromEstimate() {
      var ests = S.txns.filter(function (x) { return x.type === 'Estimate' && x.cust === st.cust && x.status !== 'Closed' && x.status !== 'Rejected'; });
      if (!st.cust) return UI.toast('Select a customer first.', 'err');
      if (!ests.length) return UI.toast('This customer has no open estimates.', 'err');
      menuAt(ctx.$('.qbf-addcaret'), ests.map(function (x) { return ['Estimate ' + x.no + ' · ' + money(x.total), x.id]; }), function (id) {
        var e = S.txn[id];
        trimBlank();
        e.lines.forEach(function (l) { st.lines.push(lineCopy(l)); });
        st.lines.push(blankLine()); g.render(); refresh();
      });
    }
    function trimBlank() {
      for (var i = st.lines.length - 1; i >= 0; i--) { var l = st.lines[i]; if (!l.item && !l.desc && !num(l.amount)) st.lines.splice(i, 1); else break; }
    }
    ctx.on('clearlines', function () { g.clear(); });
    ctx.el('taxid') && ctx.el('taxid').addEventListener('change', function () { g.syncAll(); refresh(); });
    ctx.el('disc') && ctx.el('disc').addEventListener('input', refresh);
    ctx.on('discmode', function (m) { st.discMode = m; U.$$('.qbf-seg button', ctx.f).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-q') === 'discmode:' + m); }); refresh(); });
    ctx.on('edittot', function (a, el) {
      st.editTotals = !st.editTotals;
      var ti = ctx.el('taxamt');
      if (st.editTotals) { ti.value = U.num(collect().tax); ti.hidden = false; ctx.$('[data-o="tax"]').hidden = true; ti.focus(); el.textContent = 'Done editing'; }
      else { ti.hidden = true; ctx.$('[data-o="tax"]').hidden = false; el.textContent = 'Edit totals'; }
      refresh();
    });
    if (st.editTotals && ctx.$('[data-o="tax"]')) ctx.$('[data-o="tax"]').hidden = true;
    ctx.el('taxamt') && ctx.el('taxamt').addEventListener('input', refresh);
    ctx.on('adddep', function (a, el) { st.showDeposit = true; el.hidden = true; ctx.$('.qbf-tr-dep').hidden = false; ctx.el('deposit').focus(); });
    ctx.el('deposit') && ctx.el('deposit').addEventListener('input', refresh);
    ctx.on('math', function () {
      var t = collect(), r = taxById(ctx.v('taxid'));
      var base = t.subtotal ? r2(t.taxableSubtotal - t.discount * t.taxableSubtotal / t.subtotal) : 0;
      UI.modal('See the math', '<table class="qb-table is-case"><thead><tr><th>Tax rate</th><th class="ta-r">Taxable amount</th><th class="ta-r">Rate</th><th class="ta-r">Sales tax</th></tr></thead><tbody>' +
        '<tr><td>' + esc(r ? r.name : '') + '</td><td class="ta-r">' + money(base) + '</td><td class="ta-r">' + (r ? q4(r.rate * 100) : 0) + '%</td><td class="ta-r">' + money(t.tax) + '</td></tr></tbody>' +
        '<tfoot><tr><td>Total sales tax</td><td></td><td></td><td class="ta-r">' + money(t.tax) + '</td></tr></tfoot></table>' +
        '<p class="qb-muted">Taxable subtotal ' + money(t.taxableSubtotal) + (t.discount ? ' minus its share of the discount' : '') + ', multiplied by the rate.' + (t.taxOverride != null ? ' The sales tax was edited by hand.' : '') + '</p>', { buttons: [['Close', 'primary']] });
    });

    /* suggested transactions (open time, charges, billable expenses, credits) */
    var SGL = { 'Time Charge': 'Billable time', 'Charge': 'Charge', 'Billable Expense Charge': 'Billable expense', 'Credit': 'Credit' };
    function suggestions() {
      if (!cfg.suggest || !st.cust) return [];
      var used = srcIds({ lines: st.lines }), ids = [st.cust];
      return S.txns.filter(function (x) {
        return !x.hidden && ids.indexOf(x.cust) >= 0 && CHARGES.indexOf(x.type) >= 0 && x.status === 'Open' && used.indexOf(x.id) < 0 && (!st.sgFilter || x.type === st.sgFilter);
      }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    }
    function renderSuggest() {
      var el = ctx.$('.qbf-suggest'); if (!el) return;
      var list = suggestions(), any = st.sgFilter ? true : list.length > 0;
      var showBtn = ctx.$('.qbf-sgshow');
      el.hidden = !any || st.sgHidden;
      root.classList.toggle('has-suggest', !el.hidden);
      if (showBtn) { showBtn.hidden = !(any && st.sgHidden); showBtn.textContent = 'Show suggested transactions'; }
      if (!any) { el.innerHTML = ''; return; }
      el.innerHTML = '<div class="qbf-sg-head"><h3>Suggested transactions</h3><button type="button" class="qb-x" data-q="sgclose" aria-label="Close">' + ic('close') + '</button></div>' +
        '<p>We\'ve found transactions associated with ' + esc(S.custName(st.cust)) + '. Select the ones you\'d like to add to the invoice.</p>' +
        '<div class="qbf-sg-tools"><span class="qb-select qbf-sg-filter"><select name="sgfilter" aria-label="Filter">' + selOpts([['', 'Filter: All'], ['Time Charge', 'Billable time'], ['Charge', 'Charges'], ['Billable Expense Charge', 'Billable expenses'], ['Credit', 'Credits']], st.sgFilter) + '</select>' + ic('caretDown', 'qb-select-caret') + '</span>' +
        (list.length ? '<button type="button" class="qb-link" data-q="sgall">Add all</button>' : '') + '</div>' +
        (list.length ? list.map(function (x) {
          var sign = x.type === 'Credit' ? -1 : 1, note = x.memo || (x.lines[0] && x.lines[0].desc) || '';
          return '<div class="qbf-sg-card"><div class="qbf-sg-type">' + esc(SGL[x.type]) + '</div><dl>' +
            '<dt>Date</dt><dd>' + U.fmtDate(x.date, 'mon') + '</dd><dt>Total</dt><dd>' + money(sign * x.total) + '</dd>' +
            (x.type === 'Time Charge' ? '<dt>Duration</dt><dd>' + hoursText(x.hours || (x.lines[0] && x.lines[0].qty) || 0) + '</dd>' : '') +
            (note ? '<dt>Notes</dt><dd>' + esc(note) + '</dd>' : '') + '</dl>' +
            '<button type="button" class="qb-btn qb-btn-secondary qb-btn-sm" data-q="sgadd:' + x.id + '">Add</button></div>';
        }).join('') : '<p class="qbf-muted">Nothing matches this filter.</p>');
      var fs = el.querySelector('[name=sgfilter]');
      fs.addEventListener('change', function () { st.sgFilter = fs.value; renderSuggest(); });
    }
    function addCharge(id) {
      var x = S.txn[id]; if (!x) return;
      trimBlank();
      chargeLines(x).forEach(function (l) { st.lines.push(l); });
      st.lines.push(blankLine());
      g.render(); ctx.f.dirty = true; renderSuggest(); refresh();
    }
    ctx.on('sgadd', addCharge);
    ctx.on('sgall', function () { suggestions().forEach(function (x) { addCharge(x.id); }); });
    ctx.on('sgclose', function () { st.sgHidden = true; renderSuggest(); });
    ctx.on('sgshow', function () { st.sgHidden = false; renderSuggest(); });

    /* collect, totals, validation, save */
    function collect() {
      var lines = st.lines.filter(function (l) { return l.item || (l.desc && String(l.desc).trim()) || num(l.amount); }).map(function (l) {
        var it = S.item[l.item], a = r2(num(l.amount));
        var x = { item: l.item || '', acct: l.acct || (it ? it.incomeAcct : (l.src ? 'a_bexp' : 'a_serv')), desc: l.desc || '', qty: l.qty === '' ? (it || a ? 1 : 0) : num(l.qty), rate: num(l.rate), amount: a, taxable: showTax && !!l.taxable };
        if (l.src) x.src = l.src;
        return x;
      });
      var t = { type: type, no: String(ctx.v('no')).trim(), date: ctx.date('date') || U.today(), cust: custC.get(), lines: lines, tags: st.tags.slice(), attachments: st.attachments.slice(), memo: ctx.v('memo') };
      if (showTax) { t.taxId = ctx.v('taxid'); var r = taxById(t.taxId); t.taxRate = r ? r.rate : 0; } else t.taxRate = 0;
      var d = showDisc ? num(ctx.v('disc')) : 0;
      if (st.discMode === '%') { t.discountPct = d; t.discountAmt = 0; } else { t.discountAmt = d; t.discountPct = 0; }
      t.taxOverride = st.editTotals && String(ctx.v('taxamt')).trim() !== '' ? num(ctx.v('taxamt')) : null;
      if (!cfg.open) t.note = ctx.v('note');
      if (cfg.terms) { t.terms = ctx.v('terms'); t.due = ctx.date('due') || U.addDays(t.date, U.termsDays(t.terms)); }
      if (cfg.email) { t.email = String(ctx.v('email')).trim(); t.cc = String(ctx.v('cc')).trim(); t.bcc = String(ctx.v('bcc')).trim(); }
      t.billTo = ctx.v('billto');
      if (cfg.ship) { t.shipTo = ctx.v('shipto'); t.shipDate = ctx.date('shipdate'); t.shipVia = ctx.v('shipvia'); }
      if (cfg.expires) t.expires = ctx.date('expires');
      if (cfg.statuses) t.status = ctx.v('status');
      if (cfg.open) t.status = t0 ? t0.status : 'Open';
      if (cfg.method) { t.method = ctx.v('method'); t.ref = String(ctx.v('ref')).trim(); }
      if (cfg.depositTo || cfg.refundFrom) t.account = ctx.v('account');
      if (cfg.refundFrom) { t.checkNo = String(ctx.v('checkno')).trim(); t.printLater = !!ctx.v('printlater'); }
      if (cfg.deposit) t.depositAmt = st.showDeposit ? r2(num(ctx.v('deposit'))) : 0;
      if (cfg.payOpts) t.payNote = ctx.v('paynote');
      if (t0 && t0.type === 'Billable Expense Charge') t.status = t0.status;
      L.totals(t);
      return t;
    }
    function balanceDue(t) {
      var applied = 0;
      if (t0 && type === 'Invoice') {
        applied = L.applied(t0.id);
        var dpp = t0.depositPayId && S.txn[t0.depositPayId];
        if (dpp) applied -= sumApplied(dpp, t0.id);
      }
      return r2(t.total - (t.depositAmt || 0) - applied);
    }
    function refresh() {
      var t = collect(), bal = balanceDue(t);
      ctx.out('sub', money(t.subtotal));
      ctx.out('disc', t.discount ? '-' + money(t.discount) : money(0));
      ctx.out('taxable', money(t.taxableSubtotal));
      ctx.out('tax', money(t.tax));
      ctx.out('total', money(t.total));
      ctx.out('bal', money(bal)); ctx.out('baldue', money(bal)); ctx.out('paid', money(t.total));
      if (cfg.refundFrom) ctx.out('acctbal', esc(balText(ctx.v('account'))));
      return t;
    }
    ctx.el('account') && ctx.el('account').addEventListener('change', refresh);
    function validate(t) {
      var errs = [];
      if (!t.cust) errs.push({ el: ctx.el('cust'), msg: 'Select a customer' });
      if (!ctx.date('date')) errs.push({ el: ctx.el('date'), msg: 'Enter a valid ' + lc(cfg.dateLbl) + ' (mm/dd/yyyy)' });
      if (cfg.terms && String(ctx.v('due')).trim() && !ctx.date('due')) errs.push({ el: ctx.el('due'), msg: 'Enter a valid due date (mm/dd/yyyy)' });
      else if (cfg.terms && t.due < t.date) errs.push({ el: ctx.el('due'), msg: 'The due date can\'t be before the ' + lc(cfg.dateLbl) });
      if (cfg.expires && t.expires && t.expires < t.date) errs.push({ el: ctx.el('expires'), msg: 'The expiration date can\'t be before the estimate date' });
      if (!t.lines.some(function (l) { return Math.abs(l.amount) > 0.004; })) errs.push({ el: g.field(0, 'item'), msg: 'Add at least one product or service with an amount' });
      if (t.total < -0.004) errs.push({ el: null, msg: 'The total can\'t be less than zero' });
      if ((cfg.depositTo || cfg.refundFrom) && !t.account) errs.push({ el: ctx.el('account'), msg: cfg.refundFrom ? 'Select the account you refunded from' : 'Select an account to deposit to' });
      if (cfg.deposit && t.depositAmt > t.total + 0.004) errs.push({ el: ctx.el('deposit'), msg: 'The deposit can\'t be more than the invoice total' });
      if (cfg.deposit && t.depositAmt < 0) errs.push({ el: ctx.el('deposit'), msg: 'The deposit can\'t be negative' });
      if (t.no.length > 21) errs.push({ el: ctx.el('no'), msg: cfg.noLbl + ' can\'t be longer than 21 characters' });
      if (t.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t.email.split(/[,;]/)[0].trim())) errs.push({ el: ctx.el('email'), msg: 'Enter a valid email address' });
      return !showErrors(ctx, errs);
    }
    function syncDeposit(t) {
      var dep = r2(t.depositAmt || 0), p = t.depositPayId && S.txn[t.depositPayId];
      if (dep > 0.004) {
        if (p) { p.total = dep; p.date = t.date; p.cust = t.cust; p.applied = [{ id: t.id, amount: dep }]; }
        else {
          p = S.add({ id: U.uid('t'), type: 'Payment', no: '', date: t.date, cust: t.cust, total: dep, account: 'a_undep', method: '', memo: 'Deposit on invoice ' + t.no, lines: [], applied: [{ id: t.id, amount: dep }], isDeposit: true }, true);
          t.depositPayId = p.id;
        }
      } else if (p) { S.remove(p.id); delete t.depositPayId; }
    }
    function undo(t) {
      applyQty(t.type, t.lines, -1);
      linkSources({ id: t.id, lines: [] }, srcIds(t));
      if (t.depositPayId && S.txn[t.depositPayId]) S.remove(t.depositPayId);
      var f = t.fromId && S.txn[t.fromId];
      if (f && (f.type === 'Estimate' || f.type === 'Sales Order')) f.status = f.type === 'Estimate' ? 'Pending' : 'Open';
    }
    function save(quiet) {
      var t = collect();
      if (!validate(t)) return null;
      var isNew = !t0, target;
      if (t0) { applyQty(t0.type, st.oldLines, -1); target = assign(t0, t); }
      else { t.id = U.uid('t'); target = t; if (from && !fromCharge) t.fromId = from.id; }
      /* Core moves inventory for a newly added sale; edits only need the difference. */
      if (!isNew) applyQty(target.type, target.lines, 1);
      linkSources(target, st.oldSrc);
      if (isNew && from && (from.type === 'Estimate' || from.type === 'Sales Order')) { from.status = 'Closed'; from.convertedTo = target.id; }
      var c = S.cust[target.cust];
      if (c && ctx.el('internal')) c.notes = ctx.v('internal');
      if (cfg.deposit) syncDeposit(target);
      if (isNew) S.add(target); else S.update(target);
      if (isNew && type === 'Credit Memo' && set.autoCredits) autoApplyCredit(target);
      st.oldLines = clone(target.lines); st.oldSrc = srcIds(target);
      if (!quiet) UI.toast(label(target) + ' saved');
      if (opts.onSaved) opts.onSaved(target);
      return target;
    }
    ctx.on('save', function () { var t = save(); if (t && ctx.close(true)) QB.openForm(key, { txn: t }); });
    ctx.on('saveclose', function () { if (save()) ctx.close(true); });
    ctx.on('savenew', function () { if (save()) { ctx.close(true); QB.openForm(key, {}); } });
    ctx.on('send', function () {
      var t = collect(); if (!validate(t)) return;
      sendDialog(t, typeName(type), function (m) {
        var saved = save(true); if (!saved) return;
        saved.emailStatus = 'Sent'; saved.sentTo = m.to; saved.sentAt = Date.now(); saved.email = m.to; saved.cc = m.cc; saved.bcc = m.bcc;
        UI.toast(label(saved) + ' sent');
        ctx.close(true);
      });
    });
    function docOpts(t) {
      var bal = balanceDue(t);
      return { head: cfg.head, noLbl: cfg.head + ' NO.', typeLabel: typeName(type), dueText: t.due ? 'Due ' + U.fmtDate(t.due) : '', payBtn: type === 'Invoice',
        bigLbl: cfg.balance ? 'BALANCE DUE' : (cfg.paidLbl || 'TOTAL').toUpperCase(), big: cfg.balance ? bal : t.total, toLbl: type === 'Refund' || type === 'Sales Receipt' ? 'SOLD TO' : 'BILL TO' };
    }
    ctx.on('print', function () { var t = collect(); printPreview('Print preview', docHtml(t, docOpts(t))); });
    ctx.on('recurring', function () { var t = collect(); makeRecurring(type, S.custName(t.cust), t.total); });
    ctx.on('tab', function (i) {
      i = +i;
      var main = root, pv = ctx.$('.qbf-preview');
      if (!i) { main.hidden = false; pv.hidden = true; return; }
      var t = collect(), o = docOpts(t);
      pv.innerHTML = '<div class="qbf-pv-wrap">' + (i === 1 ? emailHtml(t, o) : i === 2 ? payorHtml(t, o) : '<div class="qbf-pdf">' + docHtml(t, o) + '</div>') + '</div>';
      main.hidden = true; pv.hidden = false;
    });
    ctx.on('manage', function () {
      var m = UI.modal('Manage ' + lc(typeName(type)) + ' form', '<p class="qb-muted">Choose what shows on this form. These match the Sales form content settings.</p>' +
        '<label class="qb-cust-row"><span>Discount</span><span class="qb-grow"></span>' + UI.toggle('m_disc', set.discount !== false) + '</label>' +
        '<label class="qb-cust-row"><span>Tags</span><span class="qb-grow"></span>' + UI.toggle('m_tags', set.tags !== false) + '</label>' +
        '<label class="qb-cust-row"><span>Customer payment options</span><span class="qb-grow"></span>' + UI.toggle('m_pay', !root.classList.contains('no-payopts')) + '</label>', {
        buttons: [['Cancel', 'secondary'], ['Save', 'primary', function (el) {
          set.discount = el.querySelector('[name=m_disc]').checked; set.tags = el.querySelector('[name=m_tags]').checked;
          root.classList.toggle('no-disc', !set.discount); root.classList.toggle('no-tags', !set.tags);
          root.classList.toggle('no-payopts', !el.querySelector('[name=m_pay]').checked);
          if (!set.discount && ctx.el('disc')) { ctx.set('disc', ''); refresh(); }
          UI.toast('Form settings saved');
        }]]
      });
      return m;
    });
    ctx.on('tour', function () {
      UI.modal('Take a tour', '<ol class="qbf-tour"><li><b>Add a customer.</b> Pick one from the list or add a new one. Their email and billing address fill in.</li><li><b>Set the terms and dates.</b> The due date follows the terms.</li><li><b>Add products and services.</b> Picking an item fills the description, rate and tax.</li><li><b>Check the totals.</b> Add a discount, choose the sales tax rate and see the math.</li><li><b>Review and send.</b> Preview the Email, Payor and PDF views, then send.</li></ol>', { buttons: [['Got it', 'primary']] });
    });

    /* existing documents */
    if (t0) {
      var extra = [];
      if (type === 'Invoice' && L.openBalance(t0) > 0.004) extra.push(['Receive payment', 'receive']);
      if (cfg.send) extra.push(['Send', 'send']);
      bindMore(ctx, moreItems({ copy: true, void: !cfg.open && type !== 'Estimate' && type !== 'Sales Order', extra: extra }));
      stdMore(ctx, t0, { onDelete: undo, onVoid: function (t) { undo(t); } });
      ctx.on('copy', function () { if (ctx.close()) QB.openForm(key, { copy: t0 }); });
      ctx.on('receive', function () { if (ctx.close()) QB.openForm('Receive Payment', { cust: t0.cust, invoice: t0.id }); });
      ctx.on('convert', function () { if (ctx.close()) QB.openForm('Invoice', { from: t0 }); });
      ctx.on('openpay', function (id) { if (ctx.close()) QB.openTxn(id); });
    }
    bindAttach(ctx, st.attachments);
    renderSuggest();
    refresh();
    if (!st.cust) later(function () { var ci = ctx.el('cust'); if (ci && document.activeElement === document.body) ci.focus(); });
    return ctx;
  }
  Object.keys(SALES).forEach(function (k) { reg(k, function (opts) { return salesForm(k, opts); }); });
  reg('Charge', function (opts) { return salesForm('Delayed Charge', opts); });
  reg('Credit', function (opts) { return salesForm('Delayed Credit', opts); });
  reg('Billable Expense Charge', function (opts) { return salesForm('Delayed Charge', opts); });

  /* ───────── Receive Payment (ar) and Bill Payment (ap) ───────── */
  function applyForm(kind, opts) {
    var ar = kind === 'ar', t0 = opts.txn || null, payId = t0 ? t0.id : null;
    var docType = ar ? 'Invoice' : 'Bill', crType = ar ? 'Credit Memo' : 'Vendor Credit';
    var pre = ar ? opts.invoice : opts.bill;
    var party0 = t0 ? (ar ? t0.cust : t0.payee) : ar ? (opts.cust || (pre && S.txn[pre] ? S.txn[pre].cust : '')) : (opts.vendor || opts.payee || (pre && S.txn[pre] ? S.txn[pre].payee : ''));
    var st = { party: party0, rows: [], credits: [], amount: t0 ? t0.total : (opts.amount || 0), attachments: t0 && t0.attachments ? clone(t0.attachments) : [] };
    var acct0 = t0 ? t0.account : (ar ? 'a_undep' : 'a_chk');
    var acctList = ar ? acctOpts(['Bank'], ['a_undep']) : acctOpts(['Bank', 'Credit Card']);
    var nextCheck = String(Math.max(+S.nextNo('Check'), +S.nextNo('Bill Payment')));
    var title = ar ? 'Receive Payment' : 'Bill Payment';
    var top = '<div class="qbf-toprow"><div class="qbf-toprow-l">' +
      (ar ? '<div class="qbf-inline qbf-custline">' + fld('Customer', UI.comboHtml('party', '', 'Choose a customer'), 'qbf-w300') +
        '<button type="button" class="qb-btn qb-btn-tertiary qbf-findbtn" data-q="find">Find by invoice no.</button></div>' +
        '<div class="qbf-find" hidden>' + inp('findno', '', '', ' placeholder="Invoice no." aria-label="Invoice no."') + '<button type="button" class="qb-btn qb-btn-secondary qb-btn-sm" data-q="dofind">Find</button><button type="button" class="qb-link" data-q="find">Cancel</button></div>'
        : '<div class="qbf-grid-top">' + fld('Payee', UI.comboHtml('party', '', 'Choose a payee'), 'qbf-w300') +
        fld('Payment account', UI.select('account', acctList, acct0) + '<span class="qbf-bal" data-o="acctbal"></span>') + '</div>' +
        '<div class="qbf-grid-top">' + fld('Mailing address', area('mail', t0 ? (t0.mailTo != null ? t0.mailTo : payeeAddress(t0.payee)) : payeeAddress(party0), 4)) + '</div>') +
      '</div>' + bigAmount(ar ? 'AMOUNT RECEIVED' : 'AMOUNT PAID', 'big', ar ? '<div class="qbf-big-sub">Customer balance <b data-o="pbal">$0.00</b></div>' : '<div class="qbf-big-sub">Vendor balance <b data-o="pbal">$0.00</b></div>') + '</div>';
    var details = ar
      ? '<div class="qbf-cards"><section class="qbf-card qbf-card-main"><h3>Record or charge</h3><div class="qbf-radio-cards">' +
        '<label class="qbf-rcard"><input type="radio" name="mode" value="record" checked><span><b>Record payment</b><em>Received via check, cash, other</em></span></label>' +
        '<label class="qbf-rcard"><input type="radio" name="mode" value="charge"><span><b>Charge new payment <span class="qbf-q" title="Standard payouts typically process in 1-5 business days and post to your books automatically">' + ic('help') + '</span></b><em>Process a card or ACH bank transfer</em>' + payLogos(true) + '</span></label></div>' +
        '<div class="qbf-note qbf-charge-note" hidden>' + ic('info') + '<span>Standard payouts typically process in 1-5 business days and post to your books automatically. Card and bank transfer payments are turned off in this practice company, so record the payment instead.</span></div>' +
        '<div class="qbf-grid4">' + fld('Payment date', UI.dateInput('date', t0 ? t0.date : U.today())) +
        fld('Payment method', UI.select('method', [['', 'Choose payment method']].concat(U.METHODS), t0 ? t0.method : '')) +
        fld('Reference no.', inp('ref', t0 ? t0.no : '')) +
        fld('Deposit to', UI.select('account', acctList, acct0)) + '</div></section>' +
        '<section class="qbf-card qbf-card-amt"><h3>Amount</h3>' + fld('Amount received', inp('amount', st.amount ? U.num(st.amount) : '', 'qbf-money', ' inputmode="decimal"')) + '</section></div>'
      : '<div class="qbf-grid4">' + fld('Payment date', UI.dateInput('date', t0 ? t0.date : U.today())) +
        fld('Ref no.', '<span class="qbf-inline">' + inp('ref', t0 ? (t0.printLater ? 'To print' : t0.no) : nextCheck, '', t0 && t0.printLater ? ' readonly' : '') + '<span class="qbf-pl">' + check('printlater', t0 && t0.printLater, 'Print later') + '</span></span>') +
        fld('Amount', inp('amount', st.amount ? U.num(st.amount) : '', 'qbf-money', ' inputmode="decimal"')) + '</div>';
    var body = '<div class="qbf-applyform"><div class="qb-paper qbf-pad">' + top + details +
      '<div class="qbf-apply-host"></div>' +
      '<div class="qbf-apply"><div><span>Amount to Apply</span><b data-o="apply">$0.00</b></div><div><span>Amount to Credit</span><b data-o="credit">$0.00</b></div></div>' +
      '<div class="qbf-bottom2">' + fld('Memo', area('memo', t0 ? t0.memo : '', 3, ar ? 'Note' : '')) + attachHtml() + '</div>' + privacyLink() + '</div></div>';
    var footer = {
      left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }) + (t0 ? moreBtn() : ''),
      center: '<button type="button" class="qb-link" data-q="print">Print</button>',
      right: ar ? UI.btn('Record', { kind: 'secondary', attrs: ' data-q="save"' }) + UI.split('Record and close', [['Record and new', 'qbf:savenew']], { kind: 'primary', act: 'qbf:saveclose' })
        : UI.btn('Save', { kind: 'secondary', attrs: ' data-q="save"' }) + UI.split('Save and close', [['Save and new', 'qbf:savenew']], { kind: 'primary', act: 'qbf:saveclose' })
    };
    var ctx = frame({ title: title, body: body, footer: footer, right: headRight(), cls: 'qbf-' + kind, hist: ar ? ['Payment'] : ['Bill Payment', 'Bill Payment (Credit Card)'] });
    stdHead(ctx); stdPrivacy(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    var partyC = combo(ctx.el('party'), ar ? QB.lists.customers : QB.lists.vendors, { value: party0, minWidth: 320, onNew: ar ? newCustomer : newVendor, onPick: function (v) { load(v, false); } });
    var host = ctx.$('.qbf-apply-host');

    function sumPays() { return r2(st.rows.reduce(function (s, r) { return s + (r.pay || 0); }, 0)); }
    function sumCredits() { return r2(st.credits.reduce(function (s, r) { return s + (r.pay || 0); }, 0)); }
    function load(party, initial) {
      st.party = party || '';
      st.rows = []; st.credits = [];
      if (!ar && !initial) ctx.set('mail', payeeAddress(party));
      if (st.party) {
        var ids = ar ? custIds(st.party) : [st.party], key = ar ? 'cust' : 'payee';
        S.txns.forEach(function (t) {
          if (t.hidden || ids.indexOf(t[key]) < 0) return;
          var mine = t0 ? sumApplied(t0, t.id) : 0;
          if (t.type === docType) { var open = r2(L.openBalance(t) + mine); if (open > 0.004) st.rows.push({ t: t, open: open, pay: mine }); }
          else if (t.type === crType) { var o2 = r2(-L.openBalance(t) + mine); if (o2 > 0.004) st.credits.push({ t: t, open: o2, pay: mine }); }
        });
        var by = function (a, b) { var x = a.t.due || a.t.date, y = b.t.due || b.t.date; return x < y ? -1 : x > y ? 1 : 0; };
        st.rows.sort(by); st.credits.sort(by);
      }
      if (!t0) {
        var hit = pre && st.rows.filter(function (r) { return r.t.id === pre; })[0];
        if (initial && hit) {
          if (opts.amount) { st.amount = opts.amount; autoApply(true); }
          else { hit.pay = hit.open; st.amount = hit.open; ctx.set('amount', U.num(st.amount)); }
        } else if (st.amount > 0) autoApply(true);
      }
      render(); totals();
    }
    function rowHtml(r, i, cr) {
      var desc = (cr ? typeName(r.t.type) : typeName(r.t.type)) + ' # ' + (r.t.no || '') + ' (' + U.fmtDate(r.t.date) + ')';
      if (!r.t.no) desc = typeName(r.t.type) + ' (' + U.fmtDate(r.t.date) + ')';
      var sub = ar && r.t.cust !== st.party ? ' <span class="qbf-muted">' + esc(S.custName(r.t.cust)) + '</span>' : '';
      var p = cr ? 'c' : 'r';
      return '<tr><td class="qb-col-chk"><input type="checkbox" data-' + p + 'c="' + i + '"' + (r.pay > 0 ? ' checked' : '') + ' aria-label="Select"></td><td>' + esc(desc) + sub + '</td>' +
        (cr ? '' : '<td>' + U.fmtDate(r.t.due) + '</td>') + '<td class="ta-r">' + U.num(r.t.total) + '</td><td class="ta-r">' + U.num(r.open) + '</td>' +
        '<td class="ta-r qbf-paycell"><input class="qb-input qbf-money" data-' + p + 'p="' + i + '" value="' + (r.pay ? U.num(r.pay) : '') + '" inputmode="decimal" aria-label="Payment"></td></tr>';
    }
    function render() {
      if (!st.party) { host.innerHTML = ''; return; }
      var h = '<section class="qbf-ot"><div class="qbf-ot-head"><h3>Outstanding Transactions</h3><span class="qb-grow"></span>' +
        (st.rows.length > 4 ? inp('otfind', '', 'qbf-ot-filter', ' placeholder="Find ' + (ar ? 'invoice' : 'bill') + ' no." aria-label="Filter"') : '') + '</div>' +
        '<table class="qb-table is-case qbf-ot-table"><thead><tr><th class="qb-col-chk"><input type="checkbox" data-all="r" aria-label="Select all"' + (st.rows.length && st.rows.every(function (r) { return r.pay > 0; }) ? ' checked' : '') + '></th><th>Description</th><th>Due Date</th><th class="ta-r">Original Amount</th><th class="ta-r">Open Balance</th><th class="ta-r">Payment</th></tr></thead><tbody>' +
        (st.rows.length ? st.rows.map(function (r, i) { return rowHtml(r, i, false); }).join('') : '<tr class="qb-empty-row"><td colspan="6">There are no outstanding transactions.</td></tr>') +
        '</tbody><tfoot><tr><td></td><td colspan="3"></td><td class="ta-r">' + U.num(st.rows.reduce(function (s, r) { return s + r.open; }, 0)) + '</td><td class="ta-r" data-o="sumpay">' + U.num(sumPays()) + '</td></tr></tfoot></table></section>';
      if (st.credits.length) {
        h += '<section class="qbf-ot"><div class="qbf-ot-head"><h3>Credits</h3></div><table class="qb-table is-case qbf-ot-table"><thead><tr><th class="qb-col-chk"><input type="checkbox" data-all="c" aria-label="Select all credits"></th><th>Description</th><th class="ta-r">Original Amount</th><th class="ta-r">Open Balance</th><th class="ta-r">Payment</th></tr></thead><tbody>' +
          st.credits.map(function (r, i) { return rowHtml(r, i, true); }).join('') + '</tbody><tfoot><tr><td></td><td colspan="2"></td><td></td><td class="ta-r" data-o="sumcr">' + U.num(sumCredits()) + '</td></tr></tfoot></table></section>';
      }
      host.innerHTML = h;
      var ff = ctx.el('otfind');
      if (ff) ff.addEventListener('input', function () {
        var q = ff.value.trim().toLowerCase();
        U.$$('.qbf-ot-table tbody tr', host).forEach(function (tr, i) { var r = st.rows[i]; if (r) tr.hidden = q && String(r.t.no || '').toLowerCase().indexOf(q) < 0; });
      });
    }
    function syncInputs() {
      st.rows.forEach(function (r, i) {
        var e = host.querySelector('[data-rp="' + i + '"]'), c = host.querySelector('[data-rc="' + i + '"]');
        if (e && e !== document.activeElement) e.value = r.pay ? U.num(r.pay) : '';
        if (c) c.checked = r.pay > 0;
      });
      st.credits.forEach(function (r, i) {
        var e = host.querySelector('[data-cp="' + i + '"]'), c = host.querySelector('[data-cc="' + i + '"]');
        if (e && e !== document.activeElement) e.value = r.pay ? U.num(r.pay) : '';
        if (c) c.checked = r.pay > 0;
      });
      var a = ctx.el('amount'); if (a && a !== document.activeElement) a.value = st.amount ? U.num(st.amount) : '';
    }
    function autoApply(noSync) {
      var rem = r2(st.amount + sumCredits());
      st.rows.forEach(function (r) { var x = r2(Math.max(0, Math.min(r.open, rem))); r.pay = x; rem = r2(rem - x); });
      if (!noSync) { syncInputs(); totals(); }
    }
    function fromRows() { st.amount = r2(Math.max(0, sumPays() - sumCredits())); syncInputs(); totals(); }
    function totals() {
      var pays = sumPays(), crs = sumCredits();
      ctx.out('big', money(st.amount));
      ctx.out('apply', money(pays));
      ctx.out('credit', money(Math.max(0, r2(st.amount - (pays - crs)))));
      ctx.out('sumpay', U.num(pays)); ctx.out('sumcr', U.num(crs));
      ctx.out('pbal', money(st.party ? (ar ? L.custBalance(st.party) : L.vendBalance(st.party)) : 0));
      if (!ar) ctx.out('acctbal', esc(balText(ctx.v('account'))));
    }
    host.addEventListener('change', function (e) {
      var t = e.target, k;
      if ((k = t.getAttribute('data-rc')) != null) { var r = st.rows[+k]; r.pay = t.checked ? r2(r.open) : 0; fromRows(); }
      else if ((k = t.getAttribute('data-cc')) != null) { var c = st.credits[+k]; c.pay = t.checked ? r2(c.open) : 0; fromRows(); }
      else if ((k = t.getAttribute('data-all')) != null) {
        (k === 'r' ? st.rows : st.credits).forEach(function (x) { x.pay = t.checked ? r2(x.open) : 0; });
        fromRows();
      }
    });
    host.addEventListener('input', function (e) {
      var t = e.target, k;
      if ((k = t.getAttribute('data-rp')) != null) { st.rows[+k].pay = r2(num(t.value)); fromRows(); }
      else if ((k = t.getAttribute('data-cp')) != null) { st.credits[+k].pay = r2(num(t.value)); fromRows(); }
    });
    ctx.el('amount').addEventListener('input', function () { st.amount = r2(num(ctx.v('amount'))); autoApply(); });
    ctx.el('account').addEventListener('change', totals);
    if (ar) {
      U.$$('[name=mode]', ctx.f).forEach(function (r) { r.addEventListener('change', function () { ctx.$('.qbf-charge-note').hidden = ctx.$('[name=mode]:checked').value !== 'charge'; }); });
      ctx.on('find', function () { var f = ctx.$('.qbf-find'); f.hidden = !f.hidden; if (!f.hidden) ctx.el('findno').focus(); });
      ctx.el('findno').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ctx.fire('dofind'); } });
      ctx.on('dofind', function () {
        var no = String(ctx.v('findno')).trim(), el = ctx.el('findno');
        var inv = S.txns.filter(function (t) { return t.type === 'Invoice' && !t.hidden && t.no === no; })[0];
        if (!inv) { showErrors(ctx, [{ el: el, msg: no ? 'We couldn\'t find invoice no. ' + no : 'Enter an invoice no.' }]); return; }
        clearErrors(ctx.f);
        partyC.set(inv.cust, true); pre = inv.id; st.amount = 0; ctx.set('amount', '');
        load(inv.cust, true);
        ctx.$('.qbf-find').hidden = true;
      });
    } else {
      var pl = ctx.el('printlater');
      pl.addEventListener('change', function () { var r = ctx.el('ref'); if (pl.checked) { r.value = 'To print'; r.readOnly = true; } else { r.readOnly = false; r.value = t0 && t0.no ? t0.no : nextCheck; } });
      ctx.el('account').addEventListener('change', function () { var cc = isCC(ctx.v('account')); ctx.$('.qbf-pl').hidden = cc; if (cc && pl.checked) { pl.checked = false; pl.dispatchEvent(new Event('change')); } });
      ctx.$('.qbf-pl').hidden = isCC(acct0);
    }
    function collect() {
      var t = {
        no: ar ? String(ctx.v('ref')).trim() : (ctx.v('printlater') ? '' : String(ctx.v('ref')).trim()), date: ctx.date('date'), account: ctx.v('account'), memo: ctx.v('memo'),
        total: r2(st.amount), lines: [], attachments: st.attachments.slice(),
        applied: st.rows.filter(function (r) { return r.pay > 0; }).map(function (r) { return { id: r.t.id, amount: r2(r.pay) }; })
          .concat(st.credits.filter(function (r) { return r.pay > 0; }).map(function (r) { return { id: r.t.id, amount: r2(r.pay), credit: true }; }))
      };
      if (ar) { t.type = 'Payment'; t.cust = st.party; t.method = ctx.v('method'); }
      else { t.type = isCC(t.account) ? 'Bill Payment (Credit Card)' : (t0 && t0.type === 'Bill Payment (Check)' ? t0.type : 'Bill Payment'); t.payee = st.party; t.printLater = !isCC(t.account) && !!ctx.v('printlater'); t.mailTo = ctx.v('mail'); t.method = isCC(t.account) ? 'Credit Card' : 'Check'; }
      return t;
    }
    function validate(t) {
      var errs = [], pays = sumPays(), crs = sumCredits();
      if (!st.party) errs.push({ el: ctx.el('party'), msg: ar ? 'Select a customer' : 'Select a payee' });
      if (!t.date) errs.push({ el: ctx.el('date'), msg: 'Enter a valid payment date (mm/dd/yyyy)' });
      if (!t.account) errs.push({ el: ctx.el('account'), msg: ar ? 'Select an account to deposit to' : 'Select a payment account' });
      if (ar && ctx.$('[name=mode]:checked').value === 'charge') errs.push({ el: null, msg: 'Card and bank transfer payments are turned off in this practice company. Choose Record payment.' });
      if (t.total <= 0 && pays <= 0) errs.push({ el: ctx.el('amount'), msg: ar ? 'Enter the amount received or select at least one invoice' : 'Enter an amount or select at least one bill' });
      if (r2(pays - crs) > t.total + 0.004) errs.push({ el: ctx.el('amount'), msg: 'The amount to apply is more than the amount ' + (ar ? 'received' : 'paid') + '. Increase the amount or reduce the payments.' });
      if (crs > pays + 0.004) errs.push({ el: null, msg: 'The credits you selected are more than the payments you applied' });
      st.rows.concat(st.credits).forEach(function (r) { if (r.pay > r.open + 0.004) errs.push({ el: null, msg: 'The payment for ' + typeName(r.t.type).toLowerCase() + ' ' + (r.t.no || U.fmtDate(r.t.date)) + ' can\'t be more than its open balance of ' + money(r.open) }); });
      if (!ar && !isCC(t.account) && !t.printLater && t.no && !/^[\w-]+$/.test(t.no)) errs.push({ el: ctx.el('ref'), msg: 'Use letters and numbers only for the ref no.' });
      return !showErrors(ctx, errs);
    }
    function save() {
      var t = collect(); if (!validate(t)) return null;
      var target;
      if (t0) { if (t0.account !== t.account) t0.deposited = false; target = assign(t0, t); S.update(t0); }
      else { target = S.add(t); }
      UI.toast((ar ? 'Payment' : 'Bill payment') + (target.no && /^[\w-]+$/.test(target.no) ? ' ' + target.no : '') + ' saved');
      if (opts.onSaved) opts.onSaved(target);
      return target;
    }
    ctx.on('save', function () { var t = save(); if (t && ctx.close(true)) QB.openForm(ar ? 'Receive Payment' : 'Bill Payment', { txn: t }); });
    ctx.on('saveclose', function () { if (save()) ctx.close(true); });
    ctx.on('savenew', function () { if (save()) { ctx.close(true); QB.openForm(ar ? 'Receive Payment' : 'Pay Bills', {}); } });
    ctx.on('print', function () {
      var t = collect();
      if (!ar && !isCC(t.account)) return printPreview('Print check', checkHtml({ no: t.no || 'To print', date: t.date, payee: nameOf(st.party), amount: t.total, memo: t.memo, address: t.mailTo, account: t.account }));
      printPreview('Print preview', receiptHtml(t, ar));
    });
    if (t0) {
      bindMore(ctx, moreItems({ 'void': true }));
      stdMore(ctx, t0, { onDelete: function () {} });
    }
    bindAttach(ctx, st.attachments);
    load(party0, true);
    totals();
    return ctx;
  }
  function receiptHtml(t, ar) {
    var co = S.company, rows = (t.applied || []).map(function (a) {
      var d = S.txn[a.id]; if (!d) return '';
      return '<tr><td>' + esc(label(d)) + '</td><td>' + U.fmtDate(d.date) + '</td><td class="ta-r">' + U.num(d.total) + '</td><td class="ta-r">' + (a.credit ? '-' : '') + U.num(a.amount) + '</td></tr>';
    }).join('');
    return '<div class="qbf-doc"><div class="qbf-doc-top"><div><div class="qbf-doc-co">' + esc(co.name) + '</div><div class="qbf-doc-addr">' + esc(co.street) + '<br>' + esc(co.city + ', ' + co.state + ' ' + co.zip) + '</div></div></div>' +
      '<div class="qbf-doc-title">' + (ar ? 'PAYMENT' : 'BILL PAYMENT') + '</div><div class="qbf-doc-meta"><div><div class="qbf-doc-lbl">' + (ar ? 'RECEIVED FROM' : 'PAID TO') + '</div>' + esc(ar ? S.custName(t.cust) : nameOf(t.payee)) + '</div>' +
      '<div class="qbf-doc-kv"><div><span>DATE</span><b>' + U.fmtDate(t.date) + '</b></div><div><span>REF NO.</span><b>' + esc(t.no || '') + '</b></div><div><span>METHOD</span><b>' + esc(t.method || '') + '</b></div></div></div>' +
      '<table class="qbf-doc-lines"><thead><tr><th>APPLIED TO</th><th>DATE</th><th class="ta-r">ORIGINAL AMOUNT</th><th class="ta-r">PAYMENT</th></tr></thead><tbody>' + (rows || '<tr><td colspan="4" class="qbf-muted">Not applied</td></tr>') + '</tbody></table>' +
      '<div class="qbf-doc-foot"><div class="qbf-doc-note">' + esc(t.memo || '') + '</div><div class="qbf-doc-tot"><div class="qbf-doc-bigrow"><span>TOTAL</span><b>' + money(t.total) + '</b></div></div></div></div>';
  }
  reg('Receive Payment', function (opts) { return applyForm('ar', opts); });
  reg('Payment', function (opts) { return applyForm('ar', opts); });
  reg('Bill Payment', function (opts) { return applyForm('ap', opts); });

  /* ───────── expenses, checks, bills, vendor credits, CC credits, POs ───────── */
  var PURCH = {
    'Expense': { type: 'Expense', payees: 'payees', payeeLbl: 'Payee', payeePh: 'Who did you pay?', acctLbl: 'Payment account', acctTypes: ['Bank', 'Credit Card'], acct0: 'a_chk', dateLbl: 'Payment date', method: 1, refLbl: 'Ref no.', bigLbl: 'AMOUNT', autofill: 'expense', billable: 1 },
    'Check': { type: 'Check', payees: 'payees', payeeLbl: 'Payee', payeePh: 'Choose a payee', acctLbl: 'Bank account', acctTypes: ['Bank'], acct0: 'a_chk', dateLbl: 'Payment date', mail: 1, checkNo: 1, bigLbl: 'AMOUNT', billable: 1 },
    'Credit Card Credit': { type: 'Credit Card Credit', payees: 'payees', payeeLbl: 'Payee', payeePh: 'Choose a payee', acctLbl: 'Bank/Credit account', acctTypes: ['Credit Card'], acct0: 'a_mc', dateLbl: 'Payment date', refLbl: 'Ref no.', bigLbl: 'AMOUNT' },
    'Bill': { type: 'Bill', payees: 'vendors', payeeLbl: 'Vendor', payeePh: 'Choose a vendor', mail: 1, terms: 1, dateLbl: 'Bill date', due: 1, refLbl: 'Bill no.', bigLbl: 'BALANCE DUE', autofill: 'bill', billable: 1, needPayee: 1 },
    'Vendor Credit': { type: 'Vendor Credit', payees: 'vendors', payeeLbl: 'Vendor', payeePh: 'Choose a vendor', mail: 1, dateLbl: 'Payment date', refLbl: 'Ref no.', bigLbl: 'CREDIT AMOUNT', needPayee: 1 },
    'Purchase Order': { type: 'Purchase Order', payees: 'vendors', payeeLbl: 'Vendor', payeePh: 'Choose a vendor', email: 1, mail: 1, shipTo: 1, dateLbl: 'Purchase order date', refLbl: 'P.O. no.', bigLbl: 'AMOUNT', po: 1, needPayee: 1, custCol: 1 }
  };
  function catBlank() { return { acct: '', desc: '', amount: '', billable: false, taxable: false, cust: '' }; }
  function itemBlank() { return { item: '', desc: '', qty: '', rate: '', amount: '', billable: false, taxable: false, cust: '' }; }
  /* Billable lines create unbilled "Billable Expense Charge" records for the customer. */
  function syncBillables(t) {
    var done = {};
    S.txns.filter(function (x) { return x.type === 'Billable Expense Charge' && x.srcId === t.id; }).forEach(function (x) {
      if (x.status === 'Open') S.remove(x.id); else done[x.srcLine] = 1;
    });
    if (['Expense', 'Check', 'Bill', 'Cash Expense', 'Credit Card Expense'].indexOf(t.type) < 0 || t.voided) return;
    t.lines.forEach(function (l, i) {
      if (!l.billable || !l.cust || !l.amount || done[i]) return;
      var what = l.desc || (l.item && S.item[l.item] ? S.item[l.item].name : S.fullName(l.acct));
      var ch = { type: 'Billable Expense Charge', no: '', date: t.date, cust: l.cust, status: 'Open', memo: what, srcId: t.id, srcLine: i, taxRate: 0,
        lines: [{ item: '', acct: 'a_bexp', desc: what, qty: 1, rate: l.amount, amount: l.amount, taxable: false }] };
      L.totals(ch);
      S.add(ch, true);
    });
  }
  function lastCategory(payee) {
    var t = S.txns.filter(function (x) { return x.payee === payee && !x.hidden && ['Expense', 'Check', 'Bill', 'Credit Card Expense', 'Cash Expense'].indexOf(x.type) >= 0 && x.lines.length; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
    return t && t.lines[0] && t.lines[0].acct && !t.lines[0].item ? t.lines[0].acct : '';
  }
  function autofillHtml(kind) {
    var art = '<svg viewBox="0 0 160 90" aria-hidden="true"><rect x="18" y="10" width="62" height="74" rx="4" fill="#fff" stroke="#c9ced4" stroke-width="2" transform="rotate(-6 49 47)"/><rect x="62" y="8" width="62" height="74" rx="4" fill="#fff" stroke="#c9ced4" stroke-width="2"/><rect x="72" y="18" width="26" height="8" rx="2" fill="#2ca01c"/><path d="M72 36h42M72 46h42M72 56h30" stroke="#dfe2e6" stroke-width="4" stroke-linecap="round"/><circle cx="128" cy="66" r="14" fill="#e7f1fb"/><path d="M128 58v4M128 70v4M120 66h4M132 66h4" stroke="#3a7bd5" stroke-width="2.4" stroke-linecap="round"/></svg>';
    return '<aside class="qbf-af"><div class="qbf-af-head">' + ic('sparkle') + '<b>Autofill this ' + kind + '</b><button type="button" class="qb-x" data-q="afclose" aria-label="Collapse panel">' + ic('caretLeft') + '</button></div>' +
      '<div class="qbf-af-drop"><p>Drag and drop documents anywhere in the dotted lines, or select one of the options to autofill from file</p><p class="qbf-muted">Supported formats: PDF, PNG, JPEG, HEIC.</p>' +
      '<div class="qbf-af-tiles"><label class="qbf-af-tile"><input type="file" hidden multiple accept=".pdf,.png,.jpg,.jpeg,.heic,application/pdf,image/*" data-af>' + ic('upload') + '<span>Select files</span></label>' +
      '<label class="qbf-af-tile"><input type="file" hidden accept="image/*" capture="environment" data-af>' + ic('camera') + '<span>Snap photos</span></label></div></div>' +
      '<div class="qbf-af-try"><b>Try with bills or invoices</b>' + art + '<p>Review before you save.</p></div></aside>' +
      '<button type="button" class="qbf-af-tab" data-q="afopen">' + ic('sparkle') + '<span>Autofill</span></button>';
  }

  function purchaseForm(key, opts) {
    var cfg = PURCH[key], t0 = opts.txn || null, from = opts.from || null;
    var src = t0 || opts.copy || from || null;
    var type = t0 ? t0.type : cfg.type, set = S.settings;
    var payee0 = src ? (src.payee || '') : (opts.payee || opts.vendor || '');
    var st = { cat: [], items: [], attachments: t0 && t0.attachments ? clone(t0.attachments) : [], oldLines: t0 ? clone(t0.lines) : [] };
    if (src) src.lines.forEach(function (l) {
      if (l.item) st.items.push({ item: l.item, desc: l.desc || '', qty: l.qty != null ? l.qty : '', rate: l.rate != null ? l.rate : '', amount: l.amount, billable: !!l.billable, taxable: !!l.taxable, cust: l.cust || '' });
      else st.cat.push({ acct: l.acct || '', desc: l.desc || '', amount: l.amount, billable: !!l.billable, taxable: !!l.taxable, cust: l.cust || '' });
    });
    if (!src && opts.amount) st.cat.push({ acct: payee0 ? lastCategory(payee0) : '', desc: opts.memo || '', amount: r2(opts.amount), billable: false, taxable: false, cust: '' });
    while (st.cat.length < 2) st.cat.push(catBlank());
    while (st.items.length < 2) st.items.push(itemBlank());
    var hasItems = st.items.some(function (l) { return l.item; });
    var v0 = S.vend[payee0];
    var acct0 = t0 ? t0.account : (src && src.account) || cfg.acct0;
    var date0 = t0 ? t0.date : U.today();
    var terms0 = t0 && t0.terms ? t0.terms : (v0 && v0.terms) || 'Net 30';
    var nextCheck = String(Math.max(+S.nextNo('Check'), +S.nextNo('Bill Payment')));
    var no0 = t0 ? (t0.no || '') : cfg.checkNo ? nextCheck : cfg.po ? S.nextNo('Purchase Order') : '';
    var billable = cfg.billable && set.billable !== false, custCol = billable || cfg.custCol;
    var listFn = cfg.payees === 'vendors' ? QB.lists.vendors : QB.lists.payees;

    var topL = '<div class="qbf-grid-top">' + fld(cfg.payeeLbl, UI.comboHtml('payee', '', cfg.payeePh), 'qbf-w300') +
      (cfg.acctTypes ? fld(cfg.acctLbl, UI.comboHtml('acct', '', 'Choose an account') + '<span class="qbf-bal" data-o="acctbal"></span>', 'qbf-w300') : '') +
      (cfg.email ? '<div class="qbf-emailrow">' + fld('Email', inp('email', t0 ? t0.email : (v0 && v0.email) || '', '', ' type="email"')) + '<button type="button" class="qb-link qbf-ccbcc" data-q="ccbcc">Cc/Bcc</button></div>' : '') +
      (cfg.po ? fld('Purchase Order status', UI.select('status', ['Open', 'Closed'], t0 ? t0.status || 'Open' : 'Open')) : '') + '</div>' +
      (cfg.email ? '<div class="qbf-ccrow" hidden>' + fld('Cc', inp('cc', t0 ? t0.cc : '')) + fld('Bcc', inp('bcc', t0 ? t0.bcc : '')) + '</div>' : '');
    var mid = '';
    if (cfg.mail) mid += fld('Mailing address', area('mail', t0 && t0.mailTo != null ? t0.mailTo : payeeAddress(payee0), 4));
    if (cfg.shipTo) mid += fld('Ship to', UI.comboHtml('shipto', '', 'Select customer for address')) + fld('Shipping address', area('shipaddr', t0 ? t0.shipAddr : vendAddress({ name: S.company.name, street: S.company.street, city: S.company.city, state: S.company.state, zip: S.company.zip }), 4));
    if (cfg.terms) mid += fld('Terms', UI.select('terms', U.TERMS, terms0));
    mid += fld(cfg.dateLbl, UI.dateInput('date', date0));
    if (cfg.due) mid += fld('Due date', UI.dateInput('due', t0 && t0.due ? t0.due : U.addDays(date0, U.termsDays(terms0))));
    if (cfg.po) mid += fld('Ship via', inp('shipvia', t0 ? t0.shipVia : ''));
    if (cfg.method) mid += fld('Payment method', UI.select('method', [['', 'Choose payment method']].concat(U.METHODS), t0 ? t0.method : ''));
    if (cfg.checkNo) mid += fld('Check no.', '<span class="qbf-inline">' + inp('no', t0 && t0.printLater ? 'To print' : no0, '', t0 && t0.printLater ? ' readonly' : '') + check('printlater', t0 && t0.printLater, 'Print later') + '</span>');
    else mid += fld(cfg.refLbl, inp('no', no0));
    if (cfg.terms) mid += fld('Permit no.', inp('permit', t0 ? t0.permit : ''));

    var sec = function (k, title, open, hostCls, addLbl) {
      return '<section class="qbf-sec qbf-coll' + (open ? ' is-open' : '') + '" data-sec="' + k + '"><button type="button" class="qbf-coll-h" data-q="sec:' + k + '">' + ic('caretDown', 'qbf-coll-caret') + '<h3>' + title + '</h3></button>' +
        '<div class="qbf-coll-b"><div class="' + hostCls + '"></div><div class="qb-lines-acts"><button type="button" class="qb-btn" data-q="add:' + k + '">' + addLbl + '</button><button type="button" class="qb-btn" data-q="clear:' + k + '">Clear all lines</button></div></div></section>';
    };
    var body = '<div class="qbf-pur' + (cfg.autofill && !t0 ? ' has-af' : '') + '">' + (cfg.autofill && !t0 ? autofillHtml(cfg.autofill) : '') +
      '<div class="qbf-pur-main">' + (t0 && t0.voided ? '<div class="qbf-strip"><span class="qbf-void">VOIDED</span></div>' : '') + (t0 && type === 'Bill' ? '<div class="qbf-strip">' + UI.statusHtml(L.status(t0)) + '</div>' : '') +
      '<div class="qb-paper qbf-pad"><div class="qbf-toprow"><div class="qbf-toprow-l">' + topL + '</div>' + bigAmount(cfg.bigLbl, 'big') + '</div>' +
      '<div class="qbf-grid-mid">' + mid + '</div>' +
      sec('cat', 'Category details', true, 'qbf-cat-host', 'Add lines') +
      (set.itemsOnExpense !== false ? sec('item', 'Item details', hasItems, 'qbf-item-host', 'Add lines') : '') +
      '<div class="qbf-pur-total"><span>Total</span><b data-o="total">$0.00</b></div>' +
      '<div class="qbf-bottom2">' + fld(cfg.po ? 'Your message to vendor' : 'Memo', area('memo', t0 ? t0.memo : (opts.memo && !src ? opts.memo : ''), 3)) + attachHtml() + '</div>' + privacyLink() + '</div></div></div>';
    var footer = {
      left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }) + (t0 ? moreBtn() : ''),
      center: '<button type="button" class="qb-link" data-q="recurring">Make recurring</button>' + (cfg.checkNo ? '<button type="button" class="qb-link" data-q="printcheck">Print check</button><button type="button" class="qb-link" data-q="orderchecks">Order checks</button>' : '') + (cfg.po ? '<button type="button" class="qb-link" data-q="printpo">Print</button>' : ''),
      right: (t0 && type === 'Bill' && L.openBalance(t0) > 0.004 ? UI.btn('Make payment', { kind: 'tertiary', attrs: ' data-q="paybill"' }) : '') +
        (t0 && cfg.po && t0.status !== 'Closed' ? UI.btn('Copy to bill', { kind: 'tertiary', attrs: ' data-q="tobill"' }) : '') +
        UI.btn('Save', { kind: 'secondary', attrs: ' data-q="save"' }) + UI.split('Save and close', [['Save and new', 'qbf:savenew']].concat(cfg.po ? [['Save and send', 'qbf:send']] : []), { kind: 'primary', act: 'qbf:saveclose' })
    };
    var title = t0 && type !== cfg.type ? typeName(type) : key;
    var ctx = frame({ title: title, body: body, footer: footer, right: headRight('<button type="button" class="qb-form-ic" data-q="settings" aria-label="Settings">' + ic('gear') + '</button>'), cls: 'qbf-purchase qbf-' + slug(key), hist: [type] });
    stdHead(ctx); stdPrivacy(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    var root = ctx.$('.qbf-pur');

    var payeeC = combo(ctx.el('payee'), listFn, { value: payee0, minWidth: 320, onNew: cfg.payees === 'vendors' ? newVendor : newPayee, onPick: onPayee });
    var acctC = cfg.acctTypes ? combo(ctx.el('acct'), function () { return QB.lists.accounts(cfg.acctTypes); }, { value: acct0, onNew: newAccount, onPick: function () { refresh(); } }) : null;
    var shipC = cfg.shipTo ? combo(ctx.el('shipto'), QB.lists.customers, { value: t0 ? t0.shipTo : '', onNew: newCustomer, onPick: function (v) { if (S.cust[v]) ctx.set('shipaddr', custAddress(S.cust[v])); } }) : null;
    function onPayee(v) {
      if (cfg.mail) ctx.set('mail', payeeAddress(v));
      var vd = S.vend[v];
      if (cfg.terms && vd) { ctx.set('terms', vd.terms || 'Net 30'); recalcDue(); }
      if (cfg.email && vd) ctx.set('email', vd.email || '');
      if (v && set.prefill !== false && !t0) {
        var a = lastCategory(v), l = st.cat[0];
        if (a && l && !l.acct && !num(l.amount)) { l.acct = a; catG.syncAll(); }
      }
    }
    function recalcDue() { if (!cfg.due) return; var d = ctx.date('date'); if (d) ctx.set('due', U.fmtDate(U.addDays(d, U.termsDays(ctx.v('terms'))))); }
    if (cfg.terms) ctx.el('terms').addEventListener('change', recalcDue);
    ctx.el('date').addEventListener('change', recalcDue);
    ctx.on('ccbcc', function () { var r = ctx.$('.qbf-ccrow'); if (r) r.hidden = !r.hidden; });
    if (cfg.checkNo) {
      var pl = ctx.el('printlater');
      pl.addEventListener('change', function () { var n = ctx.el('no'); if (pl.checked) { n.value = 'To print'; n.readOnly = true; } else { n.readOnly = false; n.value = t0 && t0.no ? t0.no : nextCheck; } });
    }
    ctx.on('sec', function (k) { var s = ctx.$('[data-sec="' + k + '"]'); s.classList.toggle('is-open'); });

    var custColDef = { key: 'cust', label: 'Customer', kind: 'combo', list: QB.lists.customers, onNew: newCustomer, width: '18%',
      pick: function (l, v) { if (billable) l.billable = !!v; } };
    var tailCols = (billable ? [{ key: 'billable', label: 'Billable', kind: 'check', width: '64px' }] : []).concat(cfg.po ? [] : [{ key: 'taxable', label: 'Tax', kind: 'check', width: '48px' }]).concat(custCol ? [custColDef] : []);
    var catG = grid(ctx.$('.qbf-cat-host'), {
      lines: st.cat, blank: catBlank, min: 2, copy: true,
      onChange: function () { ctx.f.dirty = true; refresh(); },
      cols: [
        { key: 'acct', label: 'Category', kind: 'combo', list: QB.lists.categories, onNew: newAccount, width: '26%', minWidth: 340 },
        { key: 'desc', label: 'Description', kind: 'text' },
        { key: 'amount', label: 'Amount', kind: 'money', width: '130px' }
      ].concat(tailCols)
    });
    var itemG = ctx.$('.qbf-item-host') ? grid(ctx.$('.qbf-item-host'), {
      lines: st.items, blank: itemBlank, min: 2, copy: true,
      onChange: function () { ctx.f.dirty = true; refresh(); },
      cols: [
        { key: 'item', label: 'Product/service', kind: 'combo', list: QB.lists.items, onNew: newItem, width: '22%', minWidth: 320,
          pick: function (l, v) { var it = S.item[v]; if (!it) return; l.desc = it.purchDesc || it.desc || ''; l.rate = it.cost || 0; if (l.qty === '') l.qty = 1; l.amount = r2(num(l.qty) * num(l.rate)); } },
        { key: 'desc', label: 'Description', kind: 'text' },
        { key: 'qty', label: 'Qty', kind: 'num', width: '70px', calc: pcalc },
        { key: 'rate', label: 'Rate', kind: 'num', width: '90px', calc: pcalc },
        { key: 'amount', label: 'Amount', kind: 'money', width: '120px', calc: pcalc }
      ].concat(tailCols)
    }) : null;
    function pcalc(l, k) {
      if (k === 'qty' || k === 'rate') { if (l.rate !== '' || l.qty !== '') l.amount = r2((l.qty === '' ? 1 : num(l.qty)) * num(l.rate)); }
      else if (k === 'amount' && l.amount !== '') l.rate = q4(l.amount / (l.qty === '' || !num(l.qty) ? 1 : num(l.qty)));
    }
    ctx.on('add', function (k) { (k === 'cat' ? catG : itemG).add(); });
    ctx.on('clear', function (k) { (k === 'cat' ? catG : itemG).clear(); });

    /* autofill panel */
    ctx.on('afclose', function () { root.classList.add('af-closed'); });
    ctx.on('afopen', function () { root.classList.remove('af-closed'); });
    function autofill(files) {
      files = [].slice.call(files || []); if (!files.length) return;
      files.forEach(function (f) { st.attachments.push({ name: f.name, size: f.size, type: f.type }); });
      bindAttachRedraw();
      UI.toast('Autofill is simulated in this practice copy. ' + files[0].name + ' was attached; enter the details yourself.');
    }
    U.$$('[data-af]', ctx.f).forEach(function (i) { i.addEventListener('change', function () { autofill(i.files); i.value = ''; }); });
    var drop = ctx.$('.qbf-af-drop');
    if (drop) {
      drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('is-over'); });
      drop.addEventListener('dragleave', function () { drop.classList.remove('is-over'); });
      drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('is-over'); autofill(e.dataTransfer && e.dataTransfer.files); });
    }
    function bindAttachRedraw() { var host = ctx.$('.qbf-attach'); if (host) { host.outerHTML = attachHtml(); bindAttach(ctx, st.attachments); } }

    function collect() {
      var lines = [];
      st.cat.forEach(function (l) {
        if (!l.acct && !num(l.amount) && !String(l.desc || '').trim()) return;
        lines.push({ acct: l.acct || '', desc: l.desc || '', amount: r2(num(l.amount)), billable: billable && !!l.billable, taxable: !!l.taxable, cust: l.cust || '' });
      });
      st.items.forEach(function (l) {
        if (!l.item && !num(l.amount) && !String(l.desc || '').trim()) return;
        var it = S.item[l.item];
        lines.push({ item: l.item || '', acct: it ? (it.type === 'Inventory' ? 'a_inv' : (it.expenseAcct || 'a_cogs')) : '', desc: l.desc || '', qty: l.qty === '' ? 1 : num(l.qty), rate: num(l.rate), amount: r2(num(l.amount)), billable: billable && !!l.billable, taxable: !!l.taxable, cust: l.cust || '' });
      });
      var t = { type: type, payee: payeeC.get(), date: ctx.date('date'), lines: lines, memo: ctx.v('memo'), attachments: st.attachments.slice(), no: String(ctx.v('no')).trim() };
      t.total = r2(lines.reduce(function (s, l) { return s + l.amount; }, 0));
      if (acctC) t.account = acctC.get();
      if (cfg.method) t.method = ctx.v('method');
      if (cfg.checkNo) { t.method = 'Check'; t.printLater = !!ctx.v('printlater'); if (t.printLater) t.no = ''; }
      if (cfg.mail) t.mailTo = ctx.v('mail');
      if (cfg.terms) { t.terms = ctx.v('terms'); t.due = ctx.date('due') || U.addDays(t.date || U.today(), U.termsDays(t.terms)); t.permit = ctx.v('permit'); }
      if (cfg.po) { t.status = ctx.v('status'); t.email = String(ctx.v('email')).trim(); t.cc = ctx.v('cc'); t.bcc = ctx.v('bcc'); t.shipTo = shipC ? shipC.get() : ''; t.shipAddr = ctx.v('shipaddr'); t.shipVia = ctx.v('shipvia'); t.billTo = t.mailTo; t.cust = ''; }
      return t;
    }
    function refresh() {
      var t = collect();
      ctx.out('total', money(t.total)); ctx.out('big', money(t.total));
      if (acctC) ctx.out('acctbal', esc(balText(acctC.get())));
      return t;
    }
    function validate(t) {
      var errs = [];
      if (cfg.needPayee && !t.payee) errs.push({ el: ctx.el('payee'), msg: 'Select a vendor' });
      if (acctC && !t.account) errs.push({ el: ctx.el('acct'), msg: 'Select a ' + lc(cfg.acctLbl) });
      if (!t.date) errs.push({ el: ctx.el('date'), msg: 'Enter a valid ' + lc(cfg.dateLbl) + ' (mm/dd/yyyy)' });
      if (cfg.due && t.date && t.due < t.date) errs.push({ el: ctx.el('due'), msg: 'The due date can\'t be before the bill date' });
      if (!t.lines.some(function (l) { return Math.abs(l.amount) > 0.004; })) errs.push({ el: catG.field(0, 'acct'), msg: 'Add at least one line with an amount' });
      st.cat.forEach(function (l, i) {
        if (num(l.amount) && !l.acct) errs.push({ el: catG.field(i, 'acct'), msg: 'Select a category for line ' + (i + 1) });
        if (billable && l.billable && !l.cust) errs.push({ el: catG.field(i, 'cust'), msg: 'Select a customer for billable line ' + (i + 1) });
      });
      st.items.forEach(function (l, i) {
        if (num(l.amount) && !l.item) errs.push({ el: itemG.field(i, 'item'), msg: 'Select a product or service for item line ' + (i + 1) });
        if (billable && l.billable && !l.cust) errs.push({ el: itemG.field(i, 'cust'), msg: 'Select a customer for billable item line ' + (i + 1) });
      });
      if (!t0 && t.total < -0.004) errs.push({ el: null, msg: 'The total can\'t be less than zero' });
      return !showErrors(ctx, errs);
    }
    function undo(t) {
      applyQty(t.type, t.lines, -1);
      S.txns.filter(function (x) { return x.type === 'Billable Expense Charge' && x.srcId === t.id && x.status === 'Open'; }).forEach(function (x) { S.remove(x.id); });
      var f = t.fromId && S.txn[t.fromId]; if (f && f.type === 'Purchase Order') f.status = 'Open';
    }
    function commit(t) {
      var isNew = !t0, target;
      if (t0) { applyQty(t0.type, st.oldLines, -1); target = assign(t0, t); }
      else { t.id = U.uid('t'); target = t; if (from && from.type === 'Purchase Order') { t.fromId = from.id; from.status = 'Closed'; } }
      applyQty(target.type, target.lines, 1);
      if (cfg.billable) syncBillables(target);
      if (isNew) S.add(target); else S.update(target);
      st.oldLines = clone(target.lines);
      return target;
    }
    /* then(t) runs after a successful save; a duplicate check number asks first. */
    function save(then, quiet) {
      var t = collect(); if (!validate(t)) return;
      var go = function () {
        var target = commit(t);
        if (!quiet) UI.toast(label(target) + ' saved');
        if (opts.onSaved) opts.onSaved(target);
        if (then) then(target);
      };
      var dup = cfg.checkNo && t.no && set.warnDuplicateCheck !== false && S.txns.some(function (x) { return x !== t0 && x.type === 'Check' && x.no === t.no && x.account === t.account; });
      var dupBill = cfg.terms && t.no && set.warnDuplicateBill && S.txns.some(function (x) { return x !== t0 && x.type === 'Bill' && x.no === t.no && x.payee === t.payee; });
      if (dup || dupBill) UI.confirm(dup ? 'Duplicate check number' : 'Duplicate bill number', (dup ? 'Check number ' : 'Bill number ') + t.no + ' has already been used. Do you want to use it again?', 'Yes', go);
      else go();
    }
    ctx.on('save', function () { save(function (t) { if (ctx.close(true)) QB.openForm(key, { txn: t }); }); });
    ctx.on('saveclose', function () { save(function () { ctx.close(true); }); });
    ctx.on('savenew', function () { save(function () { ctx.close(true); QB.openForm(key, {}); }); });
    ctx.on('send', function () {
      var t = collect(); if (!validate(t)) return;
      sendDialog(assign({}, t, { cust: '' }), 'Purchase Order', function (m) {
        save(function (saved) { saved.emailStatus = 'Sent'; saved.sentTo = m.to; UI.toast(label(saved) + ' sent'); ctx.close(true); }, true);
      });
    });
    ctx.on('recurring', function () { var t = collect(); makeRecurring(type, nameOf(t.payee), t.total); });
    ctx.on('printcheck', function () { var t = collect(); printPreview('Print check', checkHtml({ no: t.no || 'To print', date: t.date, payee: nameOf(t.payee), amount: t.total, memo: t.memo, address: t.mailTo, account: t.account })); });
    ctx.on('orderchecks', function () { QB.act('info:checks'); });
    ctx.on('printpo', function () { var t = collect(); L.totals({ lines: [] }); printPreview('Print preview', docHtml(assign({ subtotal: t.total }, t), { head: 'PURCHASE ORDER', noLbl: 'P.O. NO.', toLbl: 'VENDOR', due: false, bigLbl: 'TOTAL' })); });
    if (t0) {
      bindMore(ctx, moreItems({ copy: true, 'void': ['Check', 'Expense', 'Credit Card Expense', 'Cash Expense', 'Bill'].indexOf(type) >= 0 }));
      stdMore(ctx, t0, { onDelete: undo, onVoid: undo });
      ctx.on('copy', function () { if (ctx.close()) QB.openForm(key, { copy: t0 }); });
      ctx.on('paybill', function () { if (ctx.close()) QB.openForm('Pay Bills', { bill: t0.id }); });
      ctx.on('tobill', function () { if (ctx.close()) QB.openForm('Bill', { from: t0 }); });
    }
    bindAttach(ctx, st.attachments);
    refresh();
    return ctx;
  }
  Object.keys(PURCH).forEach(function (k) { reg(k, function (opts) { return purchaseForm(k, opts); }); });
  reg('Credit Card Expense', function (opts) { return purchaseForm('Expense', opts); });
  reg('Cash Expense', function (opts) { return purchaseForm('Expense', opts); });

  /* ───────── checks ───────── */
  var ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  var TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function words3(n) {
    var s = '';
    if (n >= 100) { s += ONES[Math.floor(n / 100)] + ' Hundred'; n %= 100; if (n) s += ' '; }
    if (n >= 20) { s += TENS[Math.floor(n / 10)]; if (n % 10) s += '-' + ONES[n % 10]; }
    else if (n) s += ONES[n];
    return s;
  }
  function amountWords(a) {
    a = Math.abs(r2(a));
    var d = Math.floor(a), c = Math.round((a - d) * 100), parts = [], units = ['', ' Thousand', ' Million', ' Billion'], i = 0;
    if (!d) parts.push('Zero');
    while (d > 0) { var ch = d % 1000; if (ch) parts.unshift(words3(ch) + units[i]); d = Math.floor(d / 1000); i++; }
    return parts.join(' ') + ' and ' + (c < 10 ? '0' : '') + c + '/100';
  }
  function checkHtml(o) {
    var co = S.company;
    return '<div class="qbf-checkdoc"><div class="qbf-chk-top"><div><b>' + esc(co.name) + '</b><br>' + esc(co.street) + '<br>' + esc(co.city + ', ' + co.state + ' ' + co.zip) + '</div><div class="qbf-chk-no">' + esc(o.no || '') + '</div></div>' +
      '<div class="qbf-chk-date"><span>DATE</span><b>' + U.fmtDate(o.date || U.today()) + '</b></div>' +
      '<div class="qbf-chk-pay"><span>PAY TO THE<br>ORDER OF</span><b>' + esc(o.payee || '') + '</b><em>$**' + U.num(o.amount || 0) + '</em></div>' +
      '<div class="qbf-chk-words">' + esc(amountWords(o.amount || 0)) + '<i></i>DOLLARS</div>' +
      '<div class="qbf-chk-addr">' + esc(o.address || '').replace(/\n/g, '<br>') + '</div>' +
      '<div class="qbf-chk-bottom"><div class="qbf-chk-memo"><span>MEMO</span>' + esc(o.memo || '') + '</div><div class="qbf-chk-sig">AUTHORIZED SIGNATURE</div></div>' +
      '<div class="qbf-chk-micr">C' + esc(String(o.no || '').replace(/\D/g, '') || '0000') + 'C  A000000000A  0000000000C</div></div>';
  }

  /* ───────── Pay Bills ───────── */
  reg('Pay Bills', function (opts) {
    var pre = opts.bill, st = { range: pre ? 'all' : 'last-365', vendor: opts.vendor || '', rows: [] };
    var nextCheck = String(Math.max(+S.nextNo('Check'), +S.nextNo('Bill Payment')));
    function credAvail(v) { return r2(S.txns.filter(function (x) { return x.type === 'Vendor Credit' && x.payee === v && !x.hidden; }).reduce(function (s, x) { return s - L.openBalance(x); }, 0)); }
    function load() {
      var keep = {}; st.rows.forEach(function (r) { keep[r.b.id] = r; });
      var rg = U.range(st.range);
      st.rows = S.txns.filter(function (b) {
        if (b.type !== 'Bill' || b.hidden || L.openBalance(b) <= 0.004) return false;
        if (st.vendor && b.payee !== st.vendor) return false;
        var d = b.due || b.date;
        if (st.range !== 'all' && d < rg[0]) return false;
        if (st.range === 'this-month' && d > rg[1]) return false;
        if (st.range === 'overdue' && d >= U.today()) return false;
        return true;
      }).sort(function (a, b) { return (a.due || a.date) < (b.due || b.date) ? -1 : 1; }).map(function (b) {
        if (keep[b.id]) return keep[b.id];
        var o = L.openBalance(b), on = b.id === pre;
        return { b: b, open: o, pay: on ? o : 0, credit: 0 };
      });
    }
    var vendorsOpen = S.vendors.filter(function (v) { return S.txns.some(function (b) { return b.type === 'Bill' && b.payee === v.id && L.openBalance(b) > 0.004; }); });
    var body = '<div class="qbf-paybills"><div class="qb-paper qbf-pad"><div class="qbf-toprow"><div class="qbf-toprow-l"><div class="qbf-grid4">' +
      fld('Payment account', UI.select('account', acctOpts(['Bank', 'Credit Card']), 'a_chk') + '<span class="qbf-bal" data-o="acctbal"></span>') +
      fld('Payment date', UI.dateInput('date', U.today())) +
      fld('Starting check no.', inp('startno', nextCheck), 'qbf-startno') +
      '<div class="qb-field qbf-startno qbf-pl-field"><span class="qb-label">&nbsp;</span>' + check('printlater', false, 'Print later') + '</div></div></div>' +
      bigAmount('TOTAL PAYMENT AMOUNT', 'big') + '</div>' +
      '<div class="qbf-pb-filters"><span class="qb-select"><select name="range" aria-label="Due date filter">' + selOpts([['last-365', 'Last 365 days'], ['last-30', 'Last 30 days'], ['this-month', 'This month'], ['overdue', 'Overdue'], ['all', 'All dates']], st.range) + '</select>' + ic('caretDown', 'qb-select-caret') + '</span>' +
      '<span class="qb-select"><select name="vendor" aria-label="Payee filter">' + selOpts([['', 'All payees']].concat(vendorsOpen.map(function (v) { return [v.id, v.name]; })), st.vendor) + '</select>' + ic('caretDown', 'qb-select-caret') + '</span>' +
      '<span class="qbf-muted" data-o="count"></span></div>' +
      '<div class="qbf-pb-host"></div></div></div>';
    var footer = {
      left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }),
      center: '<button type="button" class="qb-link" data-q="clearpay">Clear payments</button>',
      right: UI.btn('Save', { kind: 'secondary', attrs: ' data-q="save"' }) + UI.split('Save and close', [['Save and print', 'qbf:saveprint']], { kind: 'primary', act: 'qbf:saveclose' })
    };
    var ctx = frame({ title: 'Pay Bills', body: body, footer: footer, right: headRight(), cls: 'qbf-pb-form', hist: ['Bill Payment', 'Bill Payment (Credit Card)'] });
    stdHead(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    var host = ctx.$('.qbf-pb-host');
    function render() {
      var tot = { open: 0, credit: 0, pay: 0 };
      var h = '<table class="qb-table qbf-pb-table"><thead><tr><th class="qb-col-chk"><input type="checkbox" data-pa aria-label="Select all"' + (st.rows.length && st.rows.every(function (r) { return r.pay > 0 || r.credit > 0; }) ? ' checked' : '') + '></th><th>Payee</th><th>Ref no.</th><th>Due date</th><th class="ta-r">Open balance</th><th class="ta-r">Credit applied</th><th class="ta-r">Payment</th><th class="ta-r">Total amount</th></tr></thead><tbody>';
      h += st.rows.length ? st.rows.map(function (r, i) {
        var avail = credAvail(r.b.payee), over = (r.b.due || r.b.date) < U.today();
        tot.open += r.open; tot.credit += r.credit; tot.pay += r.pay;
        return '<tr><td class="qb-col-chk"><input type="checkbox" data-pc="' + i + '"' + (r.pay > 0 || r.credit > 0 ? ' checked' : '') + ' aria-label="Select bill"></td><td>' + esc(nameOf(r.b.payee)) + '</td><td>' + esc(r.b.no || '') + '</td>' +
          '<td class="' + (over ? 'qbf-overdue' : '') + '">' + (over ? ic('alert') : '') + U.fmtDate(r.b.due || r.b.date) + '</td><td class="ta-r">' + U.num(r.open) + '</td>' +
          '<td class="ta-r qbf-paycell">' + (avail > 0.004 ? '<input class="qb-input qbf-money" data-pk="' + i + '" value="' + (r.credit ? U.num(r.credit) : '') + '" aria-label="Credit applied"><div class="qbf-avail">' + money(avail) + ' available</div>' : '<span class="qbf-muted">Not available</span>') + '</td>' +
          '<td class="ta-r qbf-paycell"><input class="qb-input qbf-money" data-pp="' + i + '" value="' + (r.pay ? U.num(r.pay) : '') + '" aria-label="Payment"></td><td class="ta-r" data-pt="' + i + '">' + U.num(r.pay + r.credit) + '</td></tr>';
      }).join('') : '<tr class="qb-empty-row"><td colspan="8">There are no open bills for this filter.</td></tr>';
      h += '</tbody><tfoot><tr><td></td><td colspan="3">Total</td><td class="ta-r">' + U.num(tot.open) + '</td><td class="ta-r" data-o="tcred">' + U.num(tot.credit) + '</td><td class="ta-r" data-o="tpay">' + U.num(tot.pay) + '</td><td class="ta-r" data-o="tall">' + U.num(tot.pay + tot.credit) + '</td></tr></tfoot></table>';
      host.innerHTML = h;
      ctx.out('count', plural(st.rows.length, 'open bill'));
      totals();
    }
    function totals() {
      var pay = 0, cr = 0;
      st.rows.forEach(function (r, i) {
        pay += r.pay; cr += r.credit;
        var c = host.querySelector('[data-pc="' + i + '"]'); if (c) c.checked = r.pay > 0 || r.credit > 0;
        var p = host.querySelector('[data-pp="' + i + '"]'); if (p && p !== document.activeElement) p.value = r.pay ? U.num(r.pay) : '';
        var k = host.querySelector('[data-pk="' + i + '"]'); if (k && k !== document.activeElement) k.value = r.credit ? U.num(r.credit) : '';
        var t = host.querySelector('[data-pt="' + i + '"]'); if (t) t.textContent = U.num(r.pay + r.credit);
      });
      ctx.out('tpay', U.num(pay)); ctx.out('tcred', U.num(cr)); ctx.out('tall', U.num(pay + cr));
      ctx.out('big', money(pay));
      ctx.out('acctbal', esc(balText(ctx.v('account'))));
      var cc = isCC(ctx.v('account'));
      ctx.$$('.qbf-startno').forEach(function (e) { e.hidden = cc; });
    }
    host.addEventListener('change', function (e) {
      var t = e.target, k;
      if (t.hasAttribute('data-pa')) { st.rows.forEach(function (r) { r.pay = t.checked ? r2(r.open - r.credit) : 0; if (!t.checked) r.credit = 0; }); totals(); return; }
      if ((k = t.getAttribute('data-pc')) != null) { var r = st.rows[+k]; if (t.checked) r.pay = r2(r.open - r.credit); else { r.pay = 0; r.credit = 0; } totals(); }
    });
    host.addEventListener('input', function (e) {
      var t = e.target, k;
      if ((k = t.getAttribute('data-pp')) != null) { st.rows[+k].pay = r2(num(t.value)); totals(); }
      else if ((k = t.getAttribute('data-pk')) != null) {
        var r = st.rows[+k]; r.credit = r2(num(t.value));
        if (r.pay + r.credit > r.open) r.pay = r2(Math.max(0, r.open - r.credit));
        totals();
      }
    });
    ctx.el('account').addEventListener('change', totals);
    ctx.el('range').addEventListener('change', function () { st.range = ctx.v('range'); load(); render(); });
    ctx.el('vendor').addEventListener('change', function () { st.vendor = ctx.v('vendor'); load(); render(); });
    ctx.on('clearpay', function () { st.rows.forEach(function (r) { r.pay = 0; r.credit = 0; }); totals(); });
    function save() {
      var sel = st.rows.filter(function (r) { return r.pay > 0 || r.credit > 0; }), errs = [];
      var acct = ctx.v('account'), date = ctx.date('date'), cc = isCC(acct);
      if (!sel.length) errs.push({ el: null, msg: 'Select at least one bill to pay' });
      if (!acct) errs.push({ el: ctx.el('account'), msg: 'Select a payment account' });
      if (!date) errs.push({ el: ctx.el('date'), msg: 'Enter a valid payment date (mm/dd/yyyy)' });
      var byV = {};
      sel.forEach(function (r) {
        if (r.pay + r.credit > r.open + 0.004) errs.push({ el: null, msg: 'The payment for ' + nameOf(r.b.payee) + ' (' + U.fmtDate(r.b.due) + ') is more than its open balance of ' + money(r.open) });
        byV[r.b.payee] = r2((byV[r.b.payee] || 0) + r.credit);
      });
      Object.keys(byV).forEach(function (v) { if (byV[v] > credAvail(v) + 0.004) errs.push({ el: null, msg: 'Credits applied for ' + nameOf(v) + ' are more than the ' + money(credAvail(v)) + ' available' }); });
      if (!cc && !ctx.v('printlater') && !/^\d+$/.test(String(ctx.v('startno')).trim())) errs.push({ el: ctx.el('startno'), msg: 'Enter a starting check number' });
      if (showErrors(ctx, errs)) return null;
      var no = parseInt(ctx.v('startno'), 10) || 1, printLater = !cc && !!ctx.v('printlater'), groups = {}, order = [], made = [];
      sel.forEach(function (r) { if (!groups[r.b.payee]) { groups[r.b.payee] = []; order.push(r.b.payee); } groups[r.b.payee].push(r); });
      order.forEach(function (v) {
        var applied = [], total = 0, cred = 0;
        groups[v].forEach(function (r) { applied.push({ id: r.b.id, amount: r2(r.pay + r.credit) }); total += r.pay; cred += r.credit; });
        var rem = r2(cred);
        S.txns.filter(function (x) { return x.type === 'Vendor Credit' && x.payee === v && -L.openBalance(x) > 0.004; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (vc) {
          if (rem <= 0.004) return;
          var a = r2(Math.min(rem, -L.openBalance(vc))); applied.push({ id: vc.id, amount: a, credit: true }); rem = r2(rem - a);
        });
        var p = { type: cc ? 'Bill Payment (Credit Card)' : 'Bill Payment', no: cc || printLater ? '' : String(no++), date: date, payee: v, account: acct, total: r2(total), applied: applied, lines: [], method: cc ? 'Credit Card' : 'Check', printLater: printLater, mailTo: vendAddress(S.vend[v]), memo: '' };
        S.add(p, true); S.log('Added', p); made.push(p);
      });
      S.changed('add');
      UI.toast(made.length === 1 ? 'Bill payment saved' : made.length + ' bill payments saved');
      return made;
    }
    ctx.on('save', function () { if (save() && ctx.close(true)) QB.openForm('Pay Bills', {}); });
    ctx.on('saveclose', function () { if (save()) ctx.close(true); });
    ctx.on('saveprint', function () {
      var made = save(); if (!made) return;
      ctx.close(true);
      var bank = made.filter(function (p) { return !isCC(p.account); });
      if (bank.length) printPreview('Print checks', bank.map(function (p) { return checkHtml({ no: p.no || 'To print', date: p.date, payee: nameOf(p.payee), amount: p.total, address: p.mailTo, memo: '' }); }).join(''));
    });
    load(); render();
    return ctx;
  });

  /* ───────── Print Checks ───────── */
  reg('Print Checks', function () {
    var st = { checked: {} };
    var body = '<div class="qbf-printchecks"><div class="qb-paper qbf-pad"><div class="qbf-toprow"><div class="qbf-toprow-l"><div class="qbf-grid4">' +
      fld('Bank account', UI.select('account', acctOpts(['Bank']), 'a_chk') + '<span class="qbf-bal" data-o="acctbal"></span>') +
      fld('Starting check no.', inp('startno', String(Math.max(+S.nextNo('Check'), +S.nextNo('Bill Payment'))))) +
      fld('Check type', UI.select('ctype', ['Voucher', 'Standard', 'Wallet'], 'Voucher')) +
      fld('On first page print', UI.select('first', ['1 check', '2 checks', '3 checks'], '1 check')) + '</div></div>' +
      '<div class="qbf-big"><small>CHECKS SELECTED</small><b data-o="big">0</b><div class="qbf-big-sub" data-o="selamt">$0.00</div></div></div>' +
      '<div class="qbf-pc-host"></div><p class="qbf-muted">Checks and bill payments saved with <b>Print later</b> wait here until you print them.</p></div></div>';
    var footer = {
      left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }) + UI.btn('Add check', { kind: 'tertiary', attrs: ' data-q="addcheck"' }),
      center: '<button type="button" class="qb-link" data-q="remove">Remove from list</button>',
      right: UI.btn('Preview and print', { kind: 'primary', attrs: ' data-q="printnow"' })
    };
    var ctx = frame({ title: 'Print checks', body: body, footer: footer, right: headRight(), cls: 'qbf-pc-form', hist: ['Check'] });
    stdHead(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    ctx.on('addcheck', function () { if (ctx.close()) QB.openForm('Check', {}); });
    var host = ctx.$('.qbf-pc-host');
    function list() {
      var a = ctx.v('account');
      return S.txns.filter(function (t) { return !t.hidden && t.printLater && t.account === a && (t.type === 'Check' || /^Bill Payment/.test(t.type)); }).sort(function (x, y) { return x.date < y.date ? -1 : 1; });
    }
    function render() {
      var rows = list();
      host.innerHTML = '<table class="qb-table qbf-pc-table"><thead><tr><th class="qb-col-chk"><input type="checkbox" data-ca aria-label="Select all"></th><th>Date</th><th>Type</th><th>Payee</th><th class="ta-r">Amount</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (t) {
          return '<tr><td class="qb-col-chk"><input type="checkbox" data-cid="' + t.id + '"' + (st.checked[t.id] ? ' checked' : '') + ' aria-label="Select"></td><td>' + U.fmtDate(t.date) + '</td><td>' + esc(t.type) + '</td><td>' + esc(nameOf(t.payee)) + '</td><td class="ta-r">' + U.num(t.total) + '</td></tr>';
        }).join('') : '<tr class="qb-empty-row"><td colspan="5">No checks are waiting to be printed from this account.</td></tr>') + '</tbody></table>';
      totals();
    }
    function sel() { return list().filter(function (t) { return st.checked[t.id]; }); }
    function totals() {
      var s = sel();
      ctx.out('big', String(s.length));
      ctx.out('selamt', money(s.reduce(function (a, t) { return a + t.total; }, 0)));
      ctx.out('acctbal', esc(balText(ctx.v('account'))));
    }
    host.addEventListener('change', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-ca')) { list().forEach(function (x) { st.checked[x.id] = t.checked; }); render(); return; }
      var id = t.getAttribute('data-cid'); if (id) { st.checked[id] = t.checked; totals(); }
    });
    ctx.el('account').addEventListener('change', function () { st.checked = {}; render(); });
    ctx.on('remove', function () {
      var s = sel(); if (!s.length) return UI.toast('Select the checks to remove from the list.', 'err');
      s.forEach(function (t) { t.printLater = false; delete st.checked[t.id]; });
      S.changed('update'); render();
      UI.toast(plural(s.length, 'check') + ' removed from the print list');
    });
    ctx.on('printnow', function () {
      var s = sel();
      if (!s.length) return showErrors(ctx, [{ el: null, msg: 'Select at least one check to print' }]);
      var no = parseInt(ctx.v('startno'), 10);
      if (!no) return showErrors(ctx, [{ el: ctx.el('startno'), msg: 'Enter a starting check number' }]);
      clearErrors(ctx.f);
      var html = s.map(function (t) {
        t.no = String(no++); t.printLater = false;
        return checkHtml({ no: t.no, date: t.date, payee: nameOf(t.payee), amount: t.total, memo: t.memo, address: t.mailTo || payeeAddress(t.payee) });
      }).join('');
      s.forEach(function (t) { S.log('Edited', t); });
      S.changed('update');
      ctx.close(true);
      printPreview('Print checks', html);
      UI.toast(plural(s.length, 'check') + ' printed');
    });
    render();
    return ctx;
  });

  /* ───────── Bank Deposit ───────── */
  reg('Deposit', function (opts) {
    var t0 = opts.txn || null, mine = t0 ? (t0.depositOf || []) : [];
    var st = { other: [], attachments: t0 && t0.attachments ? clone(t0.attachments) : [] };
    var pend = S.txns.filter(function (x) {
      return (x.type === 'Payment' || x.type === 'Sales Receipt') && !x.hidden && x.account === 'a_undep' && x.total > 0.004 && (!x.deposited || mine.indexOf(x.id) >= 0);
    }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (x) { return { t: x, chk: mine.indexOf(x.id) >= 0 }; });
    var cb = { acct: '', memo: '', amount: 0 };
    if (t0) t0.lines.forEach(function (l) {
      if (l.srcPay) return;
      if (l.cashback) { cb = { acct: l.acct, memo: l.desc, amount: -l.amount }; return; }
      st.other.push({ payee: l.cust || l.vend || '', acct: l.acct || '', desc: l.desc || '', method: l.method || '', ref: l.ref || '', amount: l.amount });
    });
    var oBlank = function () { return { payee: '', acct: '', desc: '', method: '', ref: '', amount: '' }; };
    while (st.other.length < 2) st.other.push(oBlank());
    var body = '<div class="qbf-deposit"><div class="qb-paper qbf-pad"><div class="qbf-toprow"><div class="qbf-toprow-l"><div class="qbf-grid4">' +
      fld('Account', UI.select('account', acctOpts(['Bank']), t0 ? t0.account : 'a_chk') + '<span class="qbf-bal" data-o="acctbal"></span>') +
      fld('Date', UI.dateInput('date', t0 ? t0.date : U.today())) + '</div></div>' + bigAmount('AMOUNT', 'big') + '</div>' +
      '<section class="qbf-sec"><div class="qbf-sec-h"><h3>Select the payments included in this deposit</h3></div><div class="qbf-dp-host"></div>' +
      '<div class="qb-lines-acts"><button type="button" class="qb-btn" data-q="selall">Select all</button><button type="button" class="qb-btn" data-q="clrall">Clear all</button></div></section>' +
      '<section class="qbf-sec"><div class="qbf-sec-h"><h3>Add funds to this deposit</h3></div><div class="qbf-other-host"></div>' +
      '<div class="qb-lines-acts"><button type="button" class="qb-btn" data-q="addo">Add lines</button><button type="button" class="qb-btn" data-q="clro">Clear all lines</button></div>' +
      '<div class="qbf-pur-total"><span>Other funds total</span><b data-o="othertot">$0.00</b></div></section>' +
      '<div class="qbf-grid4 qbf-cashback">' + fld('Cash back goes to', UI.select('cbacct', [['', 'Choose an account']].concat(acctOpts(['Bank', 'Other Current Assets', 'Credit Card'])), cb.acct)) +
      fld('Cash back memo', inp('cbmemo', cb.memo)) + fld('Cash back amount', inp('cbamt', cb.amount ? U.num(cb.amount) : '', 'qbf-money', ' inputmode="decimal"')) + '</div>' +
      '<div class="qbf-pur-total"><span>Total</span><b data-o="total">$0.00</b></div>' +
      '<div class="qbf-bottom2">' + fld('Memo', area('memo', t0 ? t0.memo : '', 3)) + attachHtml() + '</div>' + privacyLink() + '</div></div>';
    var footer = {
      left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }) + (t0 ? moreBtn() : ''),
      center: '<button type="button" class="qb-link" data-q="print">Print</button><button type="button" class="qb-link" data-q="recurring">Make recurring</button>',
      right: UI.btn('Save', { kind: 'secondary', attrs: ' data-q="save"' }) + UI.split('Save and close', [['Save and new', 'qbf:savenew']], { kind: 'primary', act: 'qbf:saveclose' })
    };
    var ctx = frame({ title: 'Bank Deposit', body: body, footer: footer, right: headRight(), cls: 'qbf-dep-form', hist: ['Deposit'] });
    stdHead(ctx); stdPrivacy(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    var host = ctx.$('.qbf-dp-host');
    function renderPend() {
      host.innerHTML = '<table class="qb-table is-case qbf-dp-table"><thead><tr><th class="qb-col-chk"></th><th>Received from</th><th>Date</th><th>Type</th><th>Payment method</th><th>Memo</th><th>Ref no.</th><th class="ta-r">Amount</th></tr></thead><tbody>' +
        (pend.length ? pend.map(function (p, i) {
          return '<tr><td class="qb-col-chk"><input type="checkbox" data-dc="' + i + '"' + (p.chk ? ' checked' : '') + ' aria-label="Select payment"></td><td>' + esc(S.custName(p.t.cust)) + '</td><td>' + U.fmtDate(p.t.date) + '</td><td>' + esc(p.t.type) + '</td><td>' + esc(p.t.method || '') + '</td><td>' + esc(p.t.memo || '') + '</td><td>' + esc(p.t.no || p.t.ref || '') + '</td><td class="ta-r">' + U.num(p.t.total) + '</td></tr>';
        }).join('') : '<tr class="qb-empty-row"><td colspan="8">There are no payments waiting in Undeposited Funds.</td></tr>') +
        '</tbody><tfoot><tr><td></td><td colspan="6">Selected payments total</td><td class="ta-r" data-o="seltot">0.00</td></tr></tfoot></table>';
      totals();
    }
    host.addEventListener('change', function (e) { var k = e.target.getAttribute('data-dc'); if (k != null) { pend[+k].chk = e.target.checked; totals(); } });
    ctx.on('selall', function () { pend.forEach(function (p) { p.chk = true; }); renderPend(); });
    ctx.on('clrall', function () { pend.forEach(function (p) { p.chk = false; }); renderPend(); });
    var og = grid(ctx.$('.qbf-other-host'), {
      lines: st.other, blank: oBlank, min: 2,
      onChange: function () { ctx.f.dirty = true; totals(); },
      cols: [
        { key: 'payee', label: 'Received from', kind: 'combo', list: QB.lists.payees, onNew: newPayee, width: '18%' },
        { key: 'acct', label: 'Account', kind: 'combo', list: function () { return QB.lists.accounts(); }, onNew: newAccount, width: '22%', minWidth: 320 },
        { key: 'desc', label: 'Description', kind: 'text' },
        { key: 'method', label: 'Payment method', kind: 'combo', list: function () { return U.METHODS.map(function (m) { return { value: m, label: m }; }); }, addNew: false, width: '14%', minWidth: 200 },
        { key: 'ref', label: 'Ref no.', kind: 'text', width: '90px' },
        { key: 'amount', label: 'Amount', kind: 'money', width: '120px' }
      ]
    });
    ctx.on('addo', function () { og.add(); });
    ctx.on('clro', function () { og.clear(); });
    ['cbamt', 'account'].forEach(function (n) { ctx.el(n).addEventListener(n === 'account' ? 'change' : 'input', totals); });
    function calc() {
      var sel = r2(pend.filter(function (p) { return p.chk; }).reduce(function (s, p) { return s + p.t.total; }, 0));
      var oth = r2(st.other.reduce(function (s, l) { return s + num(l.amount); }, 0));
      var cba = r2(num(ctx.v('cbamt')));
      return { sel: sel, oth: oth, cb: cba, total: r2(sel + oth - cba) };
    }
    function totals() {
      var c = calc();
      ctx.out('seltot', U.num(c.sel)); ctx.out('othertot', money(c.oth)); ctx.out('total', money(c.total)); ctx.out('big', money(c.total));
      ctx.out('acctbal', esc(balText(ctx.v('account'))));
    }
    function collect() {
      var lines = [];
      pend.forEach(function (p) { if (p.chk) lines.push({ acct: 'a_undep', amount: p.t.total, cust: p.t.cust, desc: typeName(p.t.type) + (p.t.no ? ' ' + p.t.no : ''), srcPay: p.t.id, method: p.t.method || '' }); });
      st.other.forEach(function (l) {
        if (!l.acct && !num(l.amount) && !l.desc) return;
        var x = { acct: l.acct, amount: r2(num(l.amount)), desc: l.desc || '', method: l.method || '', ref: l.ref || '' };
        if (S.cust[l.payee]) x.cust = l.payee; else if (S.vend[l.payee]) x.vend = l.payee;
        lines.push(x);
      });
      var cba = r2(num(ctx.v('cbamt')));
      if (cba) lines.push({ acct: ctx.v('cbacct'), amount: -cba, desc: ctx.v('cbmemo') || 'Cash back', cashback: true });
      return { type: 'Deposit', no: '', date: ctx.date('date'), account: ctx.v('account'), memo: ctx.v('memo'), lines: lines, attachments: st.attachments.slice(),
        total: r2(lines.reduce(function (s, l) { return s + l.amount; }, 0)), depositOf: pend.filter(function (p) { return p.chk; }).map(function (p) { return p.t.id; }) };
    }
    function validate(t) {
      var errs = [], c = calc();
      if (!t.account) errs.push({ el: ctx.el('account'), msg: 'Select the account to deposit to' });
      if (!t.date) errs.push({ el: ctx.el('date'), msg: 'Enter a valid date (mm/dd/yyyy)' });
      if (!t.lines.length || c.sel + c.oth <= 0.004) errs.push({ el: null, msg: 'Select a payment or add funds to this deposit' });
      st.other.forEach(function (l, i) { if (num(l.amount) && !l.acct) errs.push({ el: og.field(i, 'acct'), msg: 'Select an account for line ' + (i + 1) }); });
      if (c.cb && !ctx.v('cbacct')) errs.push({ el: ctx.el('cbacct'), msg: 'Choose where the cash back goes' });
      if (c.cb > c.sel + c.oth + 0.004) errs.push({ el: ctx.el('cbamt'), msg: 'Cash back can\'t be more than the deposit' });
      return !showErrors(ctx, errs);
    }
    function save() {
      var t = collect(); if (!validate(t)) return null;
      mine.forEach(function (id) { if (t.depositOf.indexOf(id) < 0 && S.txn[id]) S.txn[id].deposited = false; });
      t.depositOf.forEach(function (id) { if (S.txn[id]) S.txn[id].deposited = true; });
      var target = t0 ? assign(t0, t) : t;
      if (t0) S.update(t0); else S.add(t);
      mine = target.depositOf.slice();
      UI.toast('Deposit saved');
      if (opts.onSaved) opts.onSaved(target);
      return target;
    }
    ctx.on('save', function () { var t = save(); if (t && ctx.close(true)) QB.openForm('Deposit', { txn: t }); });
    ctx.on('saveclose', function () { if (save()) ctx.close(true); });
    ctx.on('savenew', function () { if (save()) { ctx.close(true); QB.openForm('Deposit', {}); } });
    ctx.on('recurring', function () { makeRecurring('Deposit', '', calc().total); });
    ctx.on('print', function () {
      var t = collect();
      printPreview('Deposit slip', '<div class="qbf-doc"><div class="qbf-doc-co">' + esc(S.company.name) + '</div><div class="qbf-doc-title">DEPOSIT SLIP</div><div class="qbf-doc-kv"><div><span>ACCOUNT</span><b>' + esc(S.fullName(t.account)) + '</b></div><div><span>DATE</span><b>' + U.fmtDate(t.date) + '</b></div></div>' +
        '<table class="qbf-doc-lines"><thead><tr><th>RECEIVED FROM</th><th>DESCRIPTION</th><th>METHOD</th><th class="ta-r">AMOUNT</th></tr></thead><tbody>' + t.lines.map(function (l) { return '<tr><td>' + esc(l.cust ? S.custName(l.cust) : l.vend ? nameOf(l.vend) : '') + '</td><td>' + esc(l.desc) + '</td><td>' + esc(l.method || '') + '</td><td class="ta-r">' + U.num(l.amount) + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<div class="qbf-doc-foot"><div></div><div class="qbf-doc-tot"><div class="qbf-doc-bigrow"><span>DEPOSIT TOTAL</span><b>' + money(t.total) + '</b></div></div></div></div>');
    });
    if (t0) {
      bindMore(ctx, moreItems({ 'void': true }));
      stdMore(ctx, t0, { onDelete: function (t) { (t.depositOf || []).forEach(function (id) { if (S.txn[id]) S.txn[id].deposited = false; }); }, onVoid: function (t) { (t.depositOf || []).forEach(function (id) { if (S.txn[id]) S.txn[id].deposited = false; }); t.depositOf = []; } });
    }
    bindAttach(ctx, st.attachments);
    renderPend();
    return ctx;
  });

  /* ───────── Transfer ───────── */
  var XFER_TYPES = ['Bank', 'Credit Card', 'Other Current Assets', 'Other Current Liabilities', 'Fixed Assets', 'Other Assets', 'Long Term Liabilities', 'Equity'];
  reg('Transfer', function (opts) {
    var t0 = opts.txn || null, st = { attachments: t0 && t0.attachments ? clone(t0.attachments) : [] };
    var list = acctOpts(XFER_TYPES);
    var body = '<div class="qbf-xfer"><div class="qb-paper qbf-pad"><div class="qbf-toprow"><div class="qbf-toprow-l"><div class="qbf-xfer-grid">' +
      fld('Transfer Funds From', UI.select('from', [['', 'Choose an account']].concat(list), t0 ? t0.account : 'a_chk') + '<span class="qbf-bal" data-o="frombal"></span>') +
      fld('Transfer Funds To', UI.select('to', [['', 'Choose an account']].concat(list), t0 ? t0.toAccount : 'a_sav') + '<span class="qbf-bal" data-o="tobal"></span>') +
      fld('Transfer Amount', inp('amount', t0 ? U.num(t0.total) : (opts.amount ? U.num(opts.amount) : ''), 'qbf-money', ' inputmode="decimal"')) +
      fld('Date', UI.dateInput('date', t0 ? t0.date : U.today())) + '</div></div>' + bigAmount('AMOUNT', 'big') + '</div>' +
      '<div class="qbf-bottom2">' + fld('Memo', area('memo', t0 ? t0.memo : (opts.memo || ''), 3)) + attachHtml() + '</div>' + privacyLink() + '</div></div>';
    var footer = {
      left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }) + (t0 ? moreBtn() : ''),
      center: '<button type="button" class="qb-link" data-q="recurring">Make recurring</button>',
      right: UI.btn('Save', { kind: 'secondary', attrs: ' data-q="save"' }) + UI.split('Save and close', [['Save and new', 'qbf:savenew']], { kind: 'primary', act: 'qbf:saveclose' })
    };
    var ctx = frame({ title: 'Transfer', body: body, footer: footer, right: headRight(), cls: 'qbf-xfer-form', hist: ['Transfer'] });
    stdHead(ctx); stdPrivacy(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    function totals() {
      ctx.out('frombal', esc(balText(ctx.v('from')))); ctx.out('tobal', esc(balText(ctx.v('to'))));
      ctx.out('big', money(num(ctx.v('amount'))));
    }
    ['from', 'to'].forEach(function (n) { ctx.el(n).addEventListener('change', totals); });
    ctx.el('amount').addEventListener('input', totals);
    function save() {
      var t = { type: 'Transfer', no: '', date: ctx.date('date'), account: ctx.v('from'), toAccount: ctx.v('to'), total: r2(num(ctx.v('amount'))), memo: ctx.v('memo'), lines: [], attachments: st.attachments.slice() };
      var errs = [];
      if (!t.account) errs.push({ el: ctx.el('from'), msg: 'Choose the account to transfer funds from' });
      if (!t.toAccount) errs.push({ el: ctx.el('to'), msg: 'Choose the account to transfer funds to' });
      if (t.account && t.account === t.toAccount) errs.push({ el: ctx.el('to'), msg: 'The from and to accounts must be different' });
      if (t.total <= 0) errs.push({ el: ctx.el('amount'), msg: 'Enter a transfer amount greater than zero' });
      if (!t.date) errs.push({ el: ctx.el('date'), msg: 'Enter a valid date (mm/dd/yyyy)' });
      if (showErrors(ctx, errs)) return null;
      var target = t0 ? assign(t0, t) : t;
      if (t0) S.update(t0); else S.add(t);
      UI.toast('Transfer saved');
      if (opts.onSaved) opts.onSaved(target);
      return target;
    }
    ctx.on('save', function () { var t = save(); if (t && ctx.close(true)) QB.openForm('Transfer', { txn: t }); });
    ctx.on('saveclose', function () { if (save()) ctx.close(true); });
    ctx.on('savenew', function () { if (save()) { ctx.close(true); QB.openForm('Transfer', {}); } });
    ctx.on('recurring', function () { makeRecurring('Transfer', '', num(ctx.v('amount'))); });
    if (t0) { bindMore(ctx, moreItems({ copy: true, 'void': true })); stdMore(ctx, t0); ctx.on('copy', function () { if (ctx.close()) QB.openForm('Transfer', { amount: t0.total, memo: t0.memo }); }); }
    bindAttach(ctx, st.attachments);
    totals();
    return ctx;
  });

  /* ───────── Journal Entry ───────── */
  reg('Journal Entry', function (opts) {
    var t0 = opts.txn || null, src = t0 || opts.copy || null;
    var jeBlank = function () { return { acct: '', debit: '', credit: '', desc: '', name: '' }; };
    var st = { lines: [], attachments: t0 && t0.attachments ? clone(t0.attachments) : [] };
    if (src) src.lines.forEach(function (l) {
      var d = l.debit || '', c = l.credit || '';
      if (opts.reverse) { var x = d; d = c; c = x; }
      st.lines.push({ acct: l.acct || '', debit: d, credit: c, desc: l.desc || '', name: l.cust || l.vend || '' });
    });
    while (st.lines.length < 8) st.lines.push(jeBlank());
    var hasNum = S.txns.some(function (t) { return t.type === 'Journal Entry' && /^\d+$/.test(t.no || ''); });
    var no0 = t0 ? t0.no : (hasNum ? S.nextNo('Journal Entry') : '1');
    var date0 = t0 ? t0.date : opts.reverse && src ? U.iso(new Date(U.toDate(src.date).getFullYear(), U.toDate(src.date).getMonth() + 1, 1)) : U.today();
    var body = '<div class="qbf-je"><div class="qb-paper qbf-pad"><div class="qbf-grid4">' +
      fld('Journal date', UI.dateInput('date', date0)) + fld('Journal no.', inp('no', no0)) +
      '<div class="qb-field"><span class="qb-label">&nbsp;</span>' + check('adjusting', t0 && t0.adjusting, 'Is Adjusting Journal Entry?') + '</div></div>' +
      '<div class="qbf-je-host"></div>' +
      '<div class="qb-lines-acts"><button type="button" class="qb-btn" data-q="addl">Add lines</button><button type="button" class="qb-btn" data-q="clrl">Clear all lines</button></div>' +
      '<div class="qbf-bottom2">' + fld('Memo', area('memo', t0 ? t0.memo : (opts.reverse && src ? 'Reverse of journal entry ' + (src.no || '') : ''), 3)) + attachHtml() + '</div>' + privacyLink() + '</div></div>';
    var footer = {
      left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }) + (t0 ? moreBtn() : ''),
      center: '<button type="button" class="qb-link" data-q="recurring">Make recurring</button>',
      right: UI.btn('Save', { kind: 'secondary', attrs: ' data-q="save"' }) + UI.split('Save and close', [['Save and new', 'qbf:savenew']], { kind: 'primary', act: 'qbf:saveclose' })
    };
    var ctx = frame({ title: 'Journal Entry' + (t0 && t0.no ? ' #' + t0.no : ''), body: body, footer: footer, right: headRight(), cls: 'qbf-je-form', hist: ['Journal Entry'] });
    stdHead(ctx); stdPrivacy(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    function sums() {
      var d = 0, c = 0; st.lines.forEach(function (l) { d += num(l.debit); c += num(l.credit); });
      return { d: r2(d), c: r2(c) };
    }
    var g = grid(ctx.$('.qbf-je-host'), {
      lines: st.lines, blank: jeBlank, min: 2,
      onChange: function () { ctx.f.dirty = true; },
      foot: function () {
        var s = sums(), off = Math.abs(s.d - s.c) > 0.004;
        return '<tr class="qbf-je-tot' + (off ? ' is-off' : '') + '"><td colspan="3" class="ta-r">Total</td><td class="ta-r">' + U.num(s.d) + '</td><td class="ta-r">' + U.num(s.c) + '</td><td colspan="3">' + (off ? '<span class="qbf-je-off">' + ic('alert') + 'Out of balance by ' + money(Math.abs(s.d - s.c)) + '</span>' : '') + '</td></tr>';
      },
      cols: [
        { key: 'acct', label: 'Account', kind: 'combo', list: function () { return QB.lists.accounts(); }, onNew: newAccount, width: '26%', minWidth: 340,
          pick: function (l, v) {
            if (!v || num(l.debit) || num(l.credit)) return;
            var s = sums(), diff = r2(s.d - s.c);
            if (diff > 0) l.credit = diff; else if (diff < 0) l.debit = -diff;
          } },
        { key: 'debit', label: 'Debits', kind: 'money', width: '130px', calc: function (l) { if (l.debit !== '' && num(l.debit)) l.credit = ''; } },
        { key: 'credit', label: 'Credits', kind: 'money', width: '130px', calc: function (l) { if (l.credit !== '' && num(l.credit)) l.debit = ''; } },
        { key: 'desc', label: 'Description', kind: 'text' },
        { key: 'name', label: 'Name', kind: 'combo', list: QB.lists.payees, onNew: newPayee, width: '18%' }
      ]
    });
    ctx.on('addl', function () { for (var i = 0; i < 4; i++) g.add(); });
    ctx.on('clrl', function () { g.clear(); });
    function collect() {
      var lines = st.lines.filter(function (l) { return l.acct || num(l.debit) || num(l.credit) || l.desc; }).map(function (l) {
        var x = { acct: l.acct, debit: r2(num(l.debit)), credit: r2(num(l.credit)), desc: l.desc || '' };
        if (S.cust[l.name]) x.cust = l.name; else if (S.vend[l.name]) x.vend = l.name;
        return x;
      });
      var s = sums();
      return { type: 'Journal Entry', no: String(ctx.v('no')).trim(), date: ctx.date('date'), memo: ctx.v('memo'), lines: lines, total: s.d, adjusting: !!ctx.v('adjusting'), attachments: st.attachments.slice() };
    }
    function save() {
      var t = collect(), s = sums(), errs = [];
      if (!t.date) errs.push({ el: ctx.el('date'), msg: 'Enter a valid journal date (mm/dd/yyyy)' });
      var used = t.lines.filter(function (l) { return l.debit || l.credit; });
      if (used.length < 2) errs.push({ el: null, msg: 'You must fill out at least two detail lines.' });
      st.lines.forEach(function (l, i) {
        if ((num(l.debit) || num(l.credit)) && !l.acct) errs.push({ el: g.field(i, 'acct'), msg: 'Choose an account for line ' + (i + 1) });
        var a = S.acct[l.acct];
        if (a && a.type === 'Accounts receivable (A/R)' && !S.cust[l.name]) errs.push({ el: g.field(i, 'name'), msg: 'When you use Accounts Receivable, you must choose a customer in the Name field.' });
        if (a && a.type === 'Accounts payable (A/P)' && !S.vend[l.name]) errs.push({ el: g.field(i, 'name'), msg: 'When you use Accounts Payable, you must choose a vendor in the Name field.' });
      });
      if (Math.abs(s.d - s.c) > 0.004) errs.push({ el: null, msg: 'Please balance debits and credits.' });
      if (showErrors(ctx, errs)) return null;
      var target = t0 ? assign(t0, t) : t;
      if (t0) S.update(t0); else S.add(t);
      UI.toast('Journal entry' + (target.no ? ' ' + target.no : '') + ' saved');
      if (opts.onSaved) opts.onSaved(target);
      return target;
    }
    ctx.on('save', function () { var t = save(); if (t && ctx.close(true)) QB.openForm('Journal Entry', { txn: t }); });
    ctx.on('saveclose', function () { if (save()) ctx.close(true); });
    ctx.on('savenew', function () { if (save()) { ctx.close(true); QB.openForm('Journal Entry', {}); } });
    ctx.on('recurring', function () { makeRecurring('Journal Entry', '', sums().d); });
    if (t0) {
      bindMore(ctx, moreItems({ copy: !t0.system, 'void': false, extra: t0.system ? [] : [['Reverse', 'reverse']] }));
      stdMore(ctx, t0);
      ctx.on('copy', function () { if (ctx.close()) QB.openForm('Journal Entry', { copy: t0 }); });
      ctx.on('reverse', function () { if (ctx.close()) QB.openForm('Journal Entry', { copy: t0, reverse: true }); });
    }
    bindAttach(ctx, st.attachments);
    return ctx;
  });

  /* ───────── Inventory Quantity Adjustment ───────── */
  reg('Inventory Qty Adjust', function (opts) {
    var t0 = opts.txn || null, st = { lines: [], attachments: t0 && t0.attachments ? clone(t0.attachments) : [] };
    var invList = function () { return S.items.filter(function (i) { return i.active && i.type === 'Inventory'; }).map(function (i) { return { value: i.id, label: i.name, sub: i.sku || 'Inventory' }; }); };
    function mineDiff(id) { return t0 ? (t0.adjust || []).filter(function (a) { return a.item === id; }).reduce(function (s, a) { return s + a.diff; }, 0) : 0; }
    function onHand(id) { var it = S.item[id]; return it ? q4((+it.qty || 0) - mineDiff(id)) : ''; }
    var aBlank = function () { return { item: '', desc: '', onhand: '', newqty: '', change: '' }; };
    if (t0) (t0.adjust || []).forEach(function (a) { var oh = onHand(a.item); st.lines.push({ item: a.item, desc: a.desc || (S.item[a.item] ? S.item[a.item].desc : ''), onhand: oh, newqty: q4(oh + a.diff), change: a.diff }); });
    else if (opts.item && S.item[opts.item]) { var it0 = S.item[opts.item]; st.lines.push({ item: it0.id, desc: it0.desc, onhand: +it0.qty || 0, newqty: '', change: '' }); }
    while (st.lines.length < 2) st.lines.push(aBlank());
    var adjList = acctOpts(['Cost of Goods Sold', 'Expenses', 'Other Expense', 'Other Current Assets', 'Equity', 'Income', 'Other Income']);
    var body = '<div class="qbf-invadj"><div class="qb-paper qbf-pad"><div class="qbf-grid4">' +
      fld('Adjustment date', UI.dateInput('date', t0 ? t0.date : U.today())) +
      fld('Inventory adjustment account', UI.select('adjacct', adjList, t0 ? t0.adjAcct || 'a_cogs' : 'a_cogs')) +
      fld('Reference no.', inp('no', t0 ? t0.no : S.nextNo('Inventory Qty Adjust'))) + '</div>' +
      '<div class="qbf-ia-host"></div>' +
      '<div class="qb-lines-acts"><button type="button" class="qb-btn" data-q="addl">Add lines</button><button type="button" class="qb-btn" data-q="clrl">Clear all lines</button></div>' +
      '<div class="qbf-bottom2">' + fld('Memo', area('memo', t0 ? t0.memo : '', 3)) + attachHtml() + '</div>' + privacyLink() + '</div></div>';
    var footer = {
      left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }) + (t0 ? moreBtn() : ''),
      center: '',
      right: UI.btn('Save', { kind: 'secondary', attrs: ' data-q="save"' }) + UI.split('Save and close', [['Save and new', 'qbf:savenew']], { kind: 'primary', act: 'qbf:saveclose' })
    };
    var ctx = frame({ title: 'Inventory Quantity Adjustment', body: body, footer: footer, right: headRight(), cls: 'qbf-ia-form', hist: ['Inventory Qty Adjust'] });
    stdHead(ctx); stdPrivacy(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    var g = grid(ctx.$('.qbf-ia-host'), {
      lines: st.lines, blank: aBlank, min: 2,
      onChange: function () { ctx.f.dirty = true; },
      cols: [
        { key: 'item', label: 'Product', kind: 'combo', list: invList, onNew: function (text, done) { QB.openForm('Product/Service', { name: text, type: 'Inventory', onSaved: function (it) { done(it.id); } }); }, width: '24%',
          pick: function (l, v) { var it = S.item[v]; l.desc = it ? it.desc || '' : ''; l.onhand = it ? onHand(v) : ''; l.newqty = ''; l.change = ''; } },
        { key: 'desc', label: 'Description', kind: 'static' },
        { key: 'onhand', label: 'Qty on hand', kind: 'static', align: 'right', render: function (l) { return l.item ? fmtQty(l.onhand) : ''; } },
        { key: 'newqty', label: 'New qty', kind: 'num', width: '110px', calc: function (l) { l.change = l.newqty === '' ? '' : q4(num(l.newqty) - num(l.onhand)); } },
        { key: 'change', label: 'Change in qty', kind: 'num', width: '120px', calc: function (l) { l.newqty = l.change === '' ? '' : q4(num(l.onhand) + num(l.change)); } }
      ]
    });
    ctx.on('addl', function () { g.add(); });
    ctx.on('clrl', function () { g.clear(); });
    function undoAdj(t) { (t.adjust || []).forEach(function (a) { var it = S.item[a.item]; if (it) it.qty = q4((+it.qty || 0) - a.diff); }); }
    function save() {
      var errs = [], adj = st.lines.filter(function (l) { return l.item && num(l.change); }), acct = ctx.v('adjacct'), date = ctx.date('date');
      if (!date) errs.push({ el: ctx.el('date'), msg: 'Enter a valid adjustment date (mm/dd/yyyy)' });
      if (!acct) errs.push({ el: ctx.el('adjacct'), msg: 'Choose an inventory adjustment account' });
      if (!adj.length) errs.push({ el: g.field(0, 'item'), msg: 'Enter a new quantity or a change in quantity for at least one product' });
      st.lines.forEach(function (l, i) { if (l.item && l.newqty !== '' && num(l.newqty) < 0) errs.push({ el: g.field(i, 'newqty'), msg: 'The new quantity can\'t be negative' }); });
      if (showErrors(ctx, errs)) return null;
      if (t0) undoAdj(t0);
      var lines = [], total = 0;
      var adjust = adj.map(function (l) {
        var it = S.item[l.item], diff = q4(num(l.change)), val = r2(diff * (it.cost || 0));
        if (val > 0) { lines.push({ acct: 'a_inv', debit: val, credit: 0, desc: it.name, item: it.id }); lines.push({ acct: acct, debit: 0, credit: val, desc: it.name }); }
        else if (val < 0) { lines.push({ acct: acct, debit: -val, credit: 0, desc: it.name }); lines.push({ acct: 'a_inv', debit: 0, credit: -val, desc: it.name, item: it.id }); }
        total += val;
        var prev = +it.qty || 0; it.qty = q4(prev + diff);
        return { item: it.id, desc: l.desc, prev: prev, qty: it.qty, diff: diff };
      });
      var t = { type: 'Inventory Qty Adjust', no: String(ctx.v('no')).trim(), date: date, adjAcct: acct, memo: ctx.v('memo'), lines: lines, adjust: adjust, total: r2(total), attachments: st.attachments.slice() };
      var target = t0 ? assign(t0, t) : t;
      if (t0) S.update(t0); else S.add(t);
      UI.toast('Inventory adjustment saved');
      if (opts.onSaved) opts.onSaved(target);
      return target;
    }
    ctx.on('save', function () { var t = save(); if (t && ctx.close(true)) QB.openForm('Inventory Qty Adjust', { txn: t }); });
    ctx.on('saveclose', function () { if (save()) ctx.close(true); });
    ctx.on('savenew', function () { if (save()) { ctx.close(true); QB.openForm('Inventory Qty Adjust', {}); } });
    if (t0) { bindMore(ctx, moreItems({})); stdMore(ctx, t0, { onDelete: undoAdj }); }
    bindAttach(ctx, st.attachments);
    return ctx;
  });

  /* ───────── Pay down credit card ───────── */
  reg('Credit Card Payment', function (opts) {
    var t0 = opts.txn || null, st = { attachments: t0 && t0.attachments ? clone(t0.attachments) : [] };
    var body = '<div class="qbf-ccpay"><div class="qb-paper qbf-pad qbf-narrow">' +
      '<p class="qbf-lead">Record a payment you made to your credit card balance.</p>' +
      fld('Which credit card did you pay?', UI.select('cc', [['', 'Select credit card']].concat(acctOpts(['Credit Card'])), t0 ? t0.toAccount : (opts.account && opts.account.id) || 'a_mc') + '<span class="qbf-bal" data-o="ccbal"></span>') +
      fld('Payee (optional)', UI.comboHtml('payee', '', 'Select payee'), 'qbf-w300') +
      '<div class="qbf-grid2">' + fld('How much did you pay?', inp('amount', t0 ? U.num(t0.total) : (opts.amount ? U.num(opts.amount) : ''), 'qbf-money', ' inputmode="decimal" placeholder="Enter the amount"')) +
      fld('Date of payment', UI.dateInput('date', t0 ? t0.date : U.today())) + '</div>' +
      fld('What did you use to make this payment?', UI.select('bank', [['', 'Select bank account']].concat(acctOpts(['Bank'])), t0 ? t0.account : 'a_chk') + '<span class="qbf-bal" data-o="bankbal"></span>') +
      '<details class="qbf-more-det"' + (t0 && t0.memo ? ' open' : '') + '><summary>Memo and attachments</summary>' + fld('Memo', area('memo', t0 ? t0.memo : '', 2)) + attachHtml() + '</details>' + privacyLink() + '</div></div>';
    var footer = {
      left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }) + (t0 ? moreBtn() : ''), center: '',
      right: UI.btn('Save', { kind: 'secondary', attrs: ' data-q="save"' }) + UI.split('Save and close', [['Save and new', 'qbf:savenew']], { kind: 'primary', act: 'qbf:saveclose' })
    };
    var ctx = frame({ title: 'Pay down credit card', body: body, footer: footer, right: headRight(), cls: 'qbf-ccpay-form', hist: ['Credit Card Payment'] });
    stdHead(ctx); stdPrivacy(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    var payeeC = combo(ctx.el('payee'), QB.lists.vendors, { value: t0 ? t0.payee : '', onNew: newVendor });
    function totals() { ctx.out('ccbal', esc(balText(ctx.v('cc')))); ctx.out('bankbal', esc(balText(ctx.v('bank')))); }
    ctx.el('cc').addEventListener('change', totals); ctx.el('bank').addEventListener('change', totals);
    function save() {
      var t = { type: 'Credit Card Payment', no: '', date: ctx.date('date'), toAccount: ctx.v('cc'), account: ctx.v('bank'), payee: payeeC.get(), total: r2(num(ctx.v('amount'))), memo: ctx.v('memo'), lines: [], attachments: st.attachments.slice() };
      var errs = [];
      if (!t.toAccount) errs.push({ el: ctx.el('cc'), msg: 'Select the credit card you paid' });
      if (t.total <= 0) errs.push({ el: ctx.el('amount'), msg: 'Enter the amount you paid' });
      if (!t.date) errs.push({ el: ctx.el('date'), msg: 'Enter a valid date (mm/dd/yyyy)' });
      if (!t.account) errs.push({ el: ctx.el('bank'), msg: 'Select the bank account you used' });
      if (showErrors(ctx, errs)) return null;
      var target = t0 ? assign(t0, t) : t;
      if (t0) S.update(t0); else S.add(t);
      UI.toast('Credit card payment saved');
      if (opts.onSaved) opts.onSaved(target);
      return target;
    }
    ctx.on('save', function () { var t = save(); if (t && ctx.close(true)) QB.openForm('Credit Card Payment', { txn: t }); });
    ctx.on('saveclose', function () { if (save()) ctx.close(true); });
    ctx.on('savenew', function () { if (save()) { ctx.close(true); QB.openForm('Credit Card Payment', {}); } });
    if (t0) { bindMore(ctx, moreItems({ 'void': true })); stdMore(ctx, t0); }
    bindAttach(ctx, st.attachments);
    totals();
    return ctx;
  });

  /* ───────── Sales tax payment ───────── */
  var AGENCIES = [['a_boe', 'California Department of Tax and Fee Administration'], ['a_azrev', 'Arizona Department of Revenue']];
  reg('Sales Tax Payment', function (opts) {
    var t0 = opts.txn || null, st = { attachments: t0 && t0.attachments ? clone(t0.attachments) : [] };
    var ag0 = t0 && t0.agency ? t0.agency : 'a_boe';
    var due = function (a) { return L.balance(a); };
    var y = U.toDate(U.today()).getFullYear(), q = Math.floor(U.toDate(U.today()).getMonth() / 3);
    var periods = [];
    for (var i = 0; i < 6; i++) { var qq = q - 1 - i, yy = y; while (qq < 0) { qq += 4; yy--; } var end = U.iso(new Date(yy, qq * 3 + 3, 0)); periods.push([end, 'Quarter ending ' + U.fmtDate(end, 'mon')]); }
    var body = '<div class="qbf-stp"><div class="qb-paper qbf-pad qbf-narrow">' +
      '<div class="qbf-row-between"><div>' + fld('Tax agency', UI.select('agency', AGENCIES, ag0)) + '</div>' + bigAmount('SALES TAX DUE', 'due') + '</div>' +
      fld('Tax period', UI.select('period', periods, t0 ? t0.period : periods[0][0])) +
      '<div class="qbf-grid2">' + fld('Payment date', UI.dateInput('date', t0 ? t0.date : U.today())) +
      fld('Payment amount', inp('amount', t0 ? U.num(t0.total) : U.num(opts.amount != null ? opts.amount : Math.max(0, due(ag0))), 'qbf-money', ' inputmode="decimal"')) + '</div>' +
      fld('Bank account', UI.select('account', acctOpts(['Bank']), t0 ? t0.account : 'a_chk') + '<span class="qbf-bal" data-o="acctbal"></span>') +
      fld('Memo', area('memo', t0 ? t0.memo : '', 2)) + attachHtml() + privacyLink() + '</div></div>';
    var footer = { left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }) + (t0 ? moreBtn() : ''), center: '', right: UI.btn('Record payment', { kind: 'primary', attrs: ' data-q="saveclose"' }) };
    var ctx = frame({ title: 'Sales Tax Payment', body: body, footer: footer, right: headRight(), cls: 'qbf-stp-form', hist: ['Sales Tax Payment'] });
    stdHead(ctx); stdPrivacy(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    function totals() { ctx.out('due', money(due(ctx.v('agency')))); ctx.out('acctbal', esc(balText(ctx.v('account')))); }
    ctx.el('agency').addEventListener('change', function () { if (!t0) ctx.set('amount', U.num(Math.max(0, due(ctx.v('agency'))))); totals(); });
    ctx.el('account').addEventListener('change', totals);
    ctx.on('saveclose', function () {
      var t = { type: 'Sales Tax Payment', no: '', date: ctx.date('date'), account: ctx.v('account'), total: r2(num(ctx.v('amount'))), memo: ctx.v('memo'), agency: ctx.v('agency'), period: ctx.v('period'), lines: [], attachments: st.attachments.slice() };
      var errs = [];
      if (!t.date) errs.push({ el: ctx.el('date'), msg: 'Enter a valid payment date (mm/dd/yyyy)' });
      if (t.total <= 0) errs.push({ el: ctx.el('amount'), msg: 'Enter a payment amount greater than zero' });
      if (!t.account) errs.push({ el: ctx.el('account'), msg: 'Select a bank account' });
      if (showErrors(ctx, errs)) return;
      if (t0) { assign(t0, t); S.update(t0); } else S.add(t);
      UI.toast('Sales tax payment saved');
      if (opts.onSaved) opts.onSaved(t0 || t);
      ctx.close(true);
    });
    if (t0) { bindMore(ctx, moreItems({})); stdMore(ctx, t0); }
    bindAttach(ctx, st.attachments);
    totals();
    return ctx;
  });

  /* ───────── time ───────── */
  function workerList() {
    var out = [];
    (S.employees || []).forEach(function (e) { out.push({ value: 'e:' + (e.id || e.name), label: e.name, sub: 'Employee' }); });
    (S.users || []).forEach(function (u) { if (!out.some(function (o) { return o.label === u.name; })) out.push({ value: 'u:' + u.name, label: u.name, sub: 'Employee' }); });
    return out.concat(QB.lists.vendors());
  }
  function workerName(v) { var m = workerList().filter(function (o) { return o.value === v; })[0]; return m ? m.label : ''; }
  function serviceList() { return S.items.filter(function (i) { return i.active && i.type !== 'Inventory' && i.type !== 'Bundle'; }).map(function (i) { return { value: i.id, label: i.name, sub: i.category || i.type }; }); }
  function timeTxn(o) {
    /* o: { worker, cust, item, date, hours, billable, rate, taxable, desc, start, end, brk } */
    var it = S.item[o.item], bill = !!(o.billable && o.cust);
    var t = { type: bill ? 'Time Charge' : 'Time Activity', no: '', date: o.date, cust: o.cust || '', worker: o.worker, workerName: workerName(o.worker), hours: q4(o.hours), billable: bill,
      memo: o.desc || (it ? it.desc || it.name : ''), start: o.start || '', end: o.end || '', brk: o.brk || '', taxRate: 0,
      lines: [{ item: o.item || '', acct: it ? it.incomeAcct || 'a_serv' : 'a_serv', desc: o.desc || (it ? it.desc || it.name : ''), qty: q4(o.hours), rate: bill ? r2(o.rate) : 0, amount: bill ? r2(o.hours * o.rate) : 0, taxable: bill && !!o.taxable }] };
    L.totals(t);
    return t;
  }
  function parseClock(s) {
    var m = String(s || '').trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?$/);
    if (!m) return null;
    var h = +m[1], mi = +(m[2] || 0);
    if (m[3]) { if (h === 12) h = 0; if (m[3].charAt(0) === 'p') h += 12; }
    return h > 23 || mi > 59 ? null : h + mi / 60;
  }
  reg('Single time activity', function (opts) {
    var t0 = opts.txn || null, l0 = t0 && t0.lines[0] ? t0.lines[0] : {};
    var it0 = S.item[l0.item];
    var body = '<div class="qbf-time"><div class="qb-paper qbf-pad">' + (t0 && t0.status === 'Converted' ? '<div class="qbf-strip">' + UI.statusHtml({ text: 'Converted', tone: 'closed' }) + (t0.invoiceId && S.txn[t0.invoiceId] ? '<button type="button" class="qb-link" data-q="openinv">Added to invoice ' + esc(S.txn[t0.invoiceId].no) + '</button>' : '') + '</div>' : '') +
      '<div class="qbf-time-grid"><div class="qbf-time-l">' +
      fld('Date', UI.dateInput('date', t0 ? t0.date : U.today())) +
      fld('Name', UI.comboHtml('worker', '', 'Choose an employee or vendor')) +
      fld('Customer/project', UI.comboHtml('cust', '', 'Choose a customer')) +
      fld('Service', UI.comboHtml('item', '', 'Choose a service')) +
      '<div class="qbf-billrow">' + check('billable', t0 ? !!t0.billable : true, 'Billable (/hr)') + inp('rate', t0 ? U.num(l0.rate || 0) : (it0 ? U.num(it0.price) : ''), 'qbf-money qbf-rate', ' inputmode="decimal" aria-label="Rate per hour"') + check('taxable', !!l0.taxable, 'Taxable') + '</div>' +
      '</div><div class="qbf-time-r">' +
      check('times', t0 && t0.start, 'Enter Start and End Times') +
      '<div class="qbf-times"' + (t0 && t0.start ? '' : ' hidden') + '><div class="qbf-grid3">' + fld('Start time', inp('start', t0 ? t0.start : '', '', ' placeholder="9:00 am"')) + fld('End time', inp('end', t0 ? t0.end : '', '', ' placeholder="5:00 pm"')) + fld('Break', inp('brk', t0 ? t0.brk : '', '', ' placeholder="0:30"')) + '</div></div>' +
      fld('Time', inp('hours', t0 ? fmtHours(t0.hours) : '', 'qbf-hours', ' placeholder="hh:mm" inputmode="decimal"')) +
      fld('Description', area('desc', t0 ? t0.memo : '', 4)) +
      '<div class="qbf-summary"><b>Summary</b><span data-o="summary"></span></div></div></div>' + privacyLink() + '</div></div>';
    var footer = { left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }) + (t0 ? moreBtn() : ''), center: '',
      right: UI.btn('Save', { kind: 'secondary', attrs: ' data-q="save"' }) + UI.split('Save and close', [['Save and new', 'qbf:savenew']], { kind: 'primary', act: 'qbf:saveclose' }) };
    var ctx = frame({ title: 'Single time activity', body: body, footer: footer, right: headRight(), cls: 'qbf-time-form', hist: ['Time Charge', 'Time Activity'] });
    stdHead(ctx); stdPrivacy(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    var wC = combo(ctx.el('worker'), workerList, { value: t0 ? t0.worker : (opts.worker || ''), onNew: newVendor, onPick: summary });
    var cC = combo(ctx.el('cust'), QB.lists.customers, { value: t0 ? t0.cust : (opts.cust || ''), onNew: newCustomer, onPick: summary });
    var iC = combo(ctx.el('item'), serviceList, { value: l0.item || '', onNew: newItem, onPick: function (v) { var it = S.item[v]; if (it) { ctx.set('rate', U.num(it.price || 0)); ctx.set('taxable', !!it.taxable); } summary(); } });
    function hours() {
      if (ctx.v('times')) {
        var a = parseClock(ctx.v('start')), b = parseClock(ctx.v('end')), br = parseHours(ctx.v('brk'));
        if (a == null || b == null) return 0;
        var h = b - a; if (h < 0) h += 24;
        return q4(Math.max(0, h - br));
      }
      return parseHours(ctx.v('hours'));
    }
    function summary() {
      var h = hours(), rate = num(ctx.v('rate')), bill = ctx.v('billable');
      ctx.$('.qbf-rate').disabled = !bill;
      if (ctx.v('times')) ctx.set('hours', fmtHours(h));
      ctx.out('summary', h ? esc(fmtHours(h) + ' hours' + (bill ? ' at ' + money(rate) + ' per hour = ' + money(r2(h * rate)) : '')) : 'Enter the time worked');
    }
    ['rate', 'hours', 'start', 'end', 'brk'].forEach(function (n) { ctx.el(n).addEventListener('input', summary); });
    ['billable', 'taxable'].forEach(function (n) { ctx.el(n).addEventListener('change', summary); });
    ctx.el('times').addEventListener('change', function () { ctx.$('.qbf-times').hidden = !ctx.v('times'); ctx.el('hours').readOnly = !!ctx.v('times'); summary(); });
    ctx.el('hours').readOnly = !!(t0 && t0.start);
    ctx.on('openinv', function () { if (ctx.close()) QB.openTxn(t0.invoiceId); });
    function save() {
      var o = { worker: wC.get(), cust: cC.get(), item: iC.get(), date: ctx.date('date'), hours: hours(), billable: !!ctx.v('billable'), rate: num(ctx.v('rate')), taxable: !!ctx.v('taxable'), desc: ctx.v('desc'),
        start: ctx.v('times') ? ctx.v('start') : '', end: ctx.v('times') ? ctx.v('end') : '', brk: ctx.v('times') ? ctx.v('brk') : '' };
      var errs = [];
      if (!o.worker) errs.push({ el: ctx.el('worker'), msg: 'Select a name' });
      if (!o.date) errs.push({ el: ctx.el('date'), msg: 'Enter a valid date (mm/dd/yyyy)' });
      if (ctx.v('times') && (parseClock(o.start) == null || parseClock(o.end) == null)) errs.push({ el: ctx.el('start'), msg: 'Enter start and end times like 9:00 am' });
      if (o.hours <= 0) errs.push({ el: ctx.el('hours'), msg: 'Enter the time worked' });
      if (o.billable && !o.cust) errs.push({ el: ctx.el('cust'), msg: 'Select a customer for billable time' });
      if (showErrors(ctx, errs)) return null;
      var t = timeTxn(o), target;
      if (t0) { t.status = t.type === 'Time Charge' ? (t0.type === 'Time Charge' ? t0.status || 'Open' : 'Open') : undefined; target = assign(t0, t); if (!t.status) delete t0.status; S.update(t0); }
      else { if (t.type === 'Time Charge') t.status = 'Open'; target = S.add(t); }
      UI.toast('Time activity saved');
      if (opts.onSaved) opts.onSaved(target);
      return target;
    }
    ctx.on('save', function () { var t = save(); if (t && ctx.close(true)) QB.openForm('Single time activity', { txn: t }); });
    ctx.on('saveclose', function () { if (save()) ctx.close(true); });
    ctx.on('savenew', function () { var t = save(); if (t) { ctx.close(true); QB.openForm('Single time activity', { worker: t.worker }); } });
    if (t0) {
      bindMore(ctx, moreItems({ copy: true }));
      stdMore(ctx, t0);
      ctx.on('copy', function () { if (ctx.close()) QB.openForm('Single time activity', { worker: t0.worker, cust: t0.cust }); });
    }
    summary();
    return ctx;
  });
  reg('Time Activity', function (opts) { return QB.forms['Single time activity'](opts); });
  reg('Time Charge', function (opts) { return QB.forms['Single time activity'](opts); });

  reg('Weekly timesheet', function (opts) {
    var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var today = U.today(), sun0 = U.addDays(today, -U.toDate(today).getDay());
    var weeks = [];
    for (var w = -4; w <= 1; w++) { var s = U.addDays(sun0, w * 7), e = U.addDays(s, 6); weeks.push([s, U.fmtDate(s, 'mon').replace(/, \d{4}$/, '') + ' to ' + U.fmtDate(e, 'mon')]); }
    var st = { week: sun0, lines: [] };
    var blank = function () { return { cust: '', item: '', billable: false, rate: '', desc: '', d0: '', d1: '', d2: '', d3: '', d4: '', d5: '', d6: '' }; };
    st.lines.push(blank(), blank(), blank());
    var body = '<div class="qbf-ts"><div class="qb-paper qbf-pad"><div class="qbf-toprow"><div class="qbf-toprow-l"><div class="qbf-grid3">' +
      fld('Name', UI.comboHtml('worker', '', 'Choose an employee or vendor')) +
      fld('Week of', UI.select('week', weeks, sun0)) + '</div></div>' +
      '<div class="qbf-big"><small>TOTAL HOURS</small><b data-o="big">0:00</b></div></div>' +
      '<div class="qbf-ts-host"></div><div class="qb-lines-acts"><button type="button" class="qb-btn" data-q="addl">Add lines</button><button type="button" class="qb-btn" data-q="clrl">Clear all lines</button><button type="button" class="qb-btn" data-q="copylast">Copy last timesheet</button></div>' + privacyLink() + '</div></div>';
    var footer = { left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }), center: '',
      right: UI.btn('Save', { kind: 'secondary', attrs: ' data-q="save"' }) + UI.split('Save and close', [['Save and new', 'qbf:savenew']], { kind: 'primary', act: 'qbf:saveclose' }) };
    var ctx = frame({ title: 'Weekly Timesheet', body: body, footer: footer, right: headRight(), cls: 'qbf-ts-form', hist: ['Time Charge', 'Time Activity'] });
    stdHead(ctx); stdPrivacy(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    var wC = combo(ctx.el('worker'), workerList, { value: opts.worker || '', onNew: newVendor });
    function rowHours(l) { var h = 0; for (var d = 0; d < 7; d++) h += num(l['d' + d]); return q4(h); }
    var dayCols = DAYS.map(function (d, i) { return { key: 'd' + i, label: d, kind: 'num', hours: true, width: '64px' }; });
    function labelDays() { dayCols.forEach(function (c, i) { c.label = DAYS[i] + ' ' + U.toDate(U.addDays(st.week, i)).getDate(); }); }
    labelDays();
    var g = grid(ctx.$('.qbf-ts-host'), {
      lines: st.lines, blank: blank, min: 3, drag: false, cls: 'qbf-ts-lines',
      onChange: function () { ctx.f.dirty = true; totals(); },
      foot: function () {
        var cells = '', all = 0;
        for (var d = 0; d < 7; d++) { var h = st.lines.reduce(function (s, l) { return s + num(l['d' + d]); }, 0); all += h; cells += '<td class="ta-r">' + (fmtHours(h) || '0:00') + '</td>'; }
        return '<tr><td></td><td colspan="5" class="ta-r">Total</td>' + cells + '<td class="ta-r">' + (fmtHours(all) || '0:00') + '</td><td></td></tr>';
      },
      cols: [
        { key: 'cust', label: 'Customer/project', kind: 'combo', list: QB.lists.customers, onNew: newCustomer, width: '16%', pick: function (l, v) { if (v) l.billable = true; } },
        { key: 'item', label: 'Service', kind: 'combo', list: serviceList, onNew: newItem, width: '13%', pick: function (l, v) { var it = S.item[v]; if (it) { l.rate = it.price || 0; if (!l.desc) l.desc = it.desc || ''; } } },
        { key: 'billable', label: 'Billable', kind: 'check', width: '56px' },
        { key: 'rate', label: 'Rate', kind: 'money', width: '80px' },
        { key: 'desc', label: 'Description', kind: 'text' }
      ].concat(dayCols).concat([{ key: 'tot', label: 'Total', kind: 'static', align: 'right', width: '64px', render: function (l) { return fmtHours(rowHours(l)) || ''; } }])
    });
    function totals() { var all = st.lines.reduce(function (s, l) { return s + rowHours(l); }, 0); ctx.out('big', fmtHours(all) || '0:00'); g.syncAll(); }
    ctx.el('week').addEventListener('change', function () { st.week = ctx.v('week'); labelDays(); g.render(); totals(); });
    ctx.on('addl', function () { g.add(); });
    ctx.on('clrl', function () { g.clear(); });
    ctx.on('copylast', function () {
      var w = wC.get(); if (!w) return showErrors(ctx, [{ el: ctx.el('worker'), msg: 'Select a name first' }]);
      var prevStart = U.addDays(st.week, -7), prevEnd = U.addDays(st.week, -1);
      var acts = S.txns.filter(function (t) { return (t.type === 'Time Charge' || t.type === 'Time Activity') && t.worker === w && t.date >= prevStart && t.date <= prevEnd; });
      if (!acts.length) return UI.toast('There is no timesheet for the week before.', 'err');
      st.lines.length = 0;
      acts.forEach(function (t) {
        var l0 = t.lines[0] || {}, key = (t.cust || '') + '|' + (l0.item || '') + '|' + (t.billable ? 1 : 0);
        var row = st.lines.filter(function (x) { return x._k === key; })[0];
        if (!row) { row = blank(); row._k = key; row.cust = t.cust || ''; row.item = l0.item || ''; row.billable = !!t.billable; row.rate = l0.rate || ''; row.desc = t.memo || ''; st.lines.push(row); }
        var d = U.diffDays(t.date, prevStart); row['d' + d] = q4(num(row['d' + d]) + t.hours);
      });
      while (st.lines.length < 3) st.lines.push(blank());
      g.render(); totals();
    });
    function save() {
      var w = wC.get(), errs = [], made = [];
      if (!w) errs.push({ el: ctx.el('worker'), msg: 'Select a name' });
      var any = st.lines.some(function (l) { return rowHours(l) > 0; });
      if (!any) errs.push({ el: null, msg: 'Enter hours for at least one day' });
      st.lines.forEach(function (l, i) { if (rowHours(l) > 0 && l.billable && !l.cust) errs.push({ el: g.field(i, 'cust'), msg: 'Select a customer for billable line ' + (i + 1) }); });
      if (showErrors(ctx, errs)) return null;
      st.lines.forEach(function (l) {
        for (var d = 0; d < 7; d++) {
          var h = num(l['d' + d]); if (!h) continue;
          var t = timeTxn({ worker: w, cust: l.cust, item: l.item, date: U.addDays(st.week, d), hours: h, billable: l.billable, rate: num(l.rate), desc: l.desc });
          if (t.type === 'Time Charge') t.status = 'Open';
          S.add(t, true); S.log('Added', t); made.push(t);
        }
      });
      S.changed('add');
      UI.toast('Timesheet saved (' + plural(made.length, 'time activity').replace('activitys', 'activities') + ')');
      return made;
    }
    ctx.on('save', function () { if (save()) { var w = wC.get(); if (ctx.close(true)) QB.openForm('Weekly timesheet', { worker: w }); } });
    ctx.on('saveclose', function () { if (save()) ctx.close(true); });
    ctx.on('savenew', function () { if (save()) { ctx.close(true); QB.openForm('Weekly timesheet', {}); } });
    totals();
    return ctx;
  });

  /* ───────── Task ───────── */
  reg('Task', function (opts) {
    var k0 = opts.task || null;
    var users = (S.users || []).map(function (u) { return [u.name, u.name]; });
    if (!users.length) users = [['Craig Carlson', 'Craig Carlson']];
    var body = '<div class="qbf-task"><div class="qb-paper qbf-pad qbf-narrow">' +
      fld('Task name', inp('title', k0 ? k0.title : (opts.title || ''), '', ' placeholder="What needs to be done?" maxlength="120"')) +
      '<div class="qbf-grid2">' + fld('Due date', UI.dateInput('due', k0 ? k0.due : U.addDays(U.today(), 7))) + fld('Assign to', UI.select('assignee', users, k0 ? k0.assignee : users[0][0])) + '</div>' +
      '<div class="qbf-grid2">' + fld('Customer', UI.comboHtml('cust', '', 'Choose a customer (optional)')) + fld('Status', UI.select('status', ['Open', 'Done'], k0 && k0.done ? 'Done' : 'Open')) + '</div>' +
      fld('Notes', area('notes', k0 ? k0.notes : '', 5, 'Add details for this task')) + '</div></div>';
    var footer = { left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }) + (k0 ? UI.btn('Delete', { kind: 'tertiary', attrs: ' data-q="del"' }) : ''), center: '',
      right: UI.btn('Save', { kind: 'secondary', attrs: ' data-q="savenew"' }) + UI.btn('Save and close', { kind: 'primary', attrs: ' data-q="saveclose"' }) };
    var ctx = frame({ title: k0 ? 'Edit task' : 'Task', body: body, footer: footer, right: headRight(), cls: 'qbf-task-form' });
    stdHead(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    var cC = combo(ctx.el('cust'), QB.lists.customers, { value: k0 ? k0.cust : (opts.cust || ''), onNew: newCustomer });
    function save() {
      var t = { title: String(ctx.v('title')).trim(), due: ctx.date('due'), assignee: ctx.v('assignee'), cust: cC.get(), notes: ctx.v('notes'), done: ctx.v('status') === 'Done' };
      var errs = [];
      if (!t.title) errs.push({ el: ctx.el('title'), msg: 'Enter a task name' });
      if (String(ctx.v('due')).trim() && !t.due) errs.push({ el: ctx.el('due'), msg: 'Enter a valid due date (mm/dd/yyyy)' });
      if (showErrors(ctx, errs)) return null;
      var target;
      if (k0) target = assign(k0, t);
      else { target = assign({ id: U.uid('task'), created: Date.now() }, t); S.tasks.push(target); }
      S.changed('task');
      UI.toast(k0 ? 'Task updated' : 'Task created');
      if (opts.onSaved) opts.onSaved(target);
      return target;
    }
    ctx.on('saveclose', function () { if (save()) ctx.close(true); });
    ctx.on('savenew', function () { if (save()) { ctx.close(true); QB.openForm('Task', {}); } });
    ctx.on('del', function () {
      UI.confirm('Delete task?', 'Are you sure you want to delete this task?', 'Yes', function () {
        S.tasks.splice(S.tasks.indexOf(k0), 1); S.changed('task'); UI.toast('Task deleted'); ctx.close(true);
      });
    });
    later(function () { var e = ctx.el('title'); if (e) e.focus(); });
    return ctx;
  });

  /* ───────── Statements ───────── */
  function arRows(custId, from, to) {
    var ids = custIds(custId);
    return S.txns.filter(function (t) { return !t.hidden && ids.indexOf(t.cust) >= 0 && ['Invoice', 'Payment', 'Credit Memo'].indexOf(t.type) >= 0 && (!from || t.date >= from) && (!to || t.date <= to); })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.created - b.created; });
  }
  function arAmt(t) { return t.type === 'Invoice' ? t.total : -t.total; }
  function aging(custId, asOf) {
    var b = [0, 0, 0, 0, 0];
    S.txns.forEach(function (t) {
      if (t.hidden || custIds(custId).indexOf(t.cust) < 0 || t.date > asOf) return;
      var ob = ['Invoice', 'Credit Memo', 'Payment'].indexOf(t.type) >= 0 ? L.openBalance(t) : 0;
      if (Math.abs(ob) < 0.005) return;
      var late = U.diffDays(asOf, t.due || t.date);
      b[late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : late <= 90 ? 3 : 4] += ob;
    });
    return b.map(r2);
  }
  function statementHtml(custId, o) {
    var c = S.cust[custId], co = S.company, rows = '', bal = 0;
    if (o.type === 'Open Item') {
      S.txns.filter(function (t) { return !t.hidden && custIds(custId).indexOf(t.cust) >= 0 && ['Invoice', 'Credit Memo'].indexOf(t.type) >= 0 && Math.abs(L.openBalance(t)) > 0.004 && t.date <= o.date; })
        .sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (t) {
          var ob = L.openBalance(t); bal += ob;
          rows += '<tr><td>' + U.fmtDate(t.date) + '</td><td>' + esc(label(t)) + (t.due ? ': Due ' + U.fmtDate(t.due) : '') + '</td><td class="ta-r">' + U.num(arAmt(t)) + '</td><td class="ta-r">' + U.num(ob) + '</td></tr>';
        });
    } else {
      var fwd = o.type === 'Balance Forward' ? arRows(custId, null, U.addDays(o.from, -1)).reduce(function (s, t) { return s + arAmt(t); }, 0) : 0;
      bal = r2(fwd);
      if (o.type === 'Balance Forward') rows += '<tr><td>' + U.fmtDate(o.from) + '</td><td>Balance Forward</td><td class="ta-r"></td><td class="ta-r">' + U.num(bal) + '</td></tr>';
      arRows(custId, o.from, o.to).forEach(function (t) {
        bal = r2(bal + arAmt(t));
        rows += '<tr><td>' + U.fmtDate(t.date) + '</td><td>' + esc(label(t)) + (t.type === 'Invoice' && t.due ? ': Due ' + U.fmtDate(t.due) : '') + '</td><td class="ta-r">' + U.num(arAmt(t)) + '</td><td class="ta-r">' + U.num(bal) + '</td></tr>';
      });
    }
    var ag = aging(custId, o.date), due = o.type === 'Transaction Statement' ? bal : L.custBalance(custId);
    return '<div class="qbf-doc qbf-stmt"><div class="qbf-doc-top"><div><div class="qbf-doc-co">' + esc(co.name) + '</div><div class="qbf-doc-addr">' + esc(co.street) + '<br>' + esc(co.city + ', ' + co.state + ' ' + co.zip) + '<br>' + esc(co.email) + '</div></div></div>' +
      '<div class="qbf-doc-title">STATEMENT</div><div class="qbf-doc-meta"><div><div class="qbf-doc-lbl">TO</div>' + esc(custAddress(c)).replace(/\n/g, '<br>') + '</div><div class="qbf-doc-kv">' +
      '<div><span>STATEMENT NO.</span><b>' + esc(o.no) + '</b></div><div><span>DATE</span><b>' + U.fmtDate(o.date) + '</b></div><div><span>TOTAL DUE</span><b>' + money(due) + '</b></div><div><span>ENCLOSED</span><b></b></div></div></div>' +
      '<table class="qbf-doc-lines"><thead><tr><th>DATE</th><th>DESCRIPTION</th><th class="ta-r">AMOUNT</th><th class="ta-r">' + (o.type === 'Open Item' ? 'OPEN AMOUNT' : 'BALANCE') + '</th></tr></thead><tbody>' + (rows || '<tr><td colspan="4" class="qbf-muted">No activity for this period</td></tr>') + '</tbody></table>' +
      '<table class="qbf-doc-aging"><thead><tr><th>CURRENT DUE</th><th>1-30 DAYS PAST DUE</th><th>31-60 DAYS PAST DUE</th><th>61-90 DAYS PAST DUE</th><th>90+ DAYS PAST DUE</th><th>AMOUNT DUE</th></tr></thead><tbody><tr>' +
      ag.map(function (x) { return '<td>' + money(x) + '</td>'; }).join('') + '<td><b>' + money(due) + '</b></td></tr></tbody></table></div>';
  }
  reg('Statement', function (opts) {
    var st = { checked: {}, rows: [] };
    if (opts.cust) st.checked[opts.cust] = true;
    var r365 = U.range('last-365');
    var body = '<div class="qbf-stmtform"><div class="qb-paper qbf-pad"><div class="qbf-grid4">' +
      fld('Statement Type', UI.select('stype', [['Balance Forward', 'Balance Forward'], ['Open Item', 'Open Item (last 365 days)'], ['Transaction Statement', 'Transaction Statement']], 'Balance Forward')) +
      fld('Statement Date', UI.dateInput('sdate', U.today())) +
      fld('Customer Balance Status', UI.select('status', ['Open', 'Overdue', 'All'], opts.cust ? 'All' : 'Open')) + '</div>' +
      '<div class="qbf-grid4 qbf-period">' + fld('Statement Period From', UI.dateInput('from', U.addDays(U.today(), -30))) + fld('To', UI.dateInput('to', U.today())) +
      '<div class="qb-field"><span class="qb-label">&nbsp;</span>' + UI.btn('Apply', { kind: 'secondary', attrs: ' data-q="apply"' }) + '</div></div>' +
      '<div class="qbf-stmt-sum" data-o="sum"></div><div class="qbf-st-host"></div></div></div>';
    var footer = { left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }), center: '<button type="button" class="qb-link" data-q="preview">Print or Preview</button>',
      right: UI.btn('Save', { kind: 'secondary', attrs: ' data-q="save"' }) + UI.split('Save and send', [['Save and close', 'qbf:saveclose']], { kind: 'primary', act: 'qbf:send' }) };
    var ctx = frame({ title: 'Create Statements', body: body, footer: footer, right: headRight(), cls: 'qbf-stmt-form', hist: ['Statement'] });
    stdHead(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    var host = ctx.$('.qbf-st-host');
    function load() {
      var s = ctx.v('status'), d = ctx.date('sdate') || U.today();
      st.rows = S.customers.filter(function (c) { return c.active; }).map(function (c) {
        var ag = aging(c.id, d);
        return { c: c, bal: L.custBalance(c.id, false), over: r2(ag[1] + ag[2] + ag[3] + ag[4]) };
      }).filter(function (r) { return s === 'All' || (s === 'Open' ? Math.abs(r.bal) > 0.004 : r.over > 0.004) || st.checked[r.c.id]; })
        .sort(function (a, b) { return S.custName(a.c.id).localeCompare(S.custName(b.c.id)); });
      if (!Object.keys(st.checked).length && s !== 'All') st.rows.forEach(function (r) { st.checked[r.c.id] = true; });
    }
    function render() {
      host.innerHTML = '<table class="qb-table qbf-st-table"><thead><tr><th class="qb-col-chk"><input type="checkbox" data-sa aria-label="Select all"></th><th>Recipients</th><th>Email address</th><th class="ta-r">Balance</th></tr></thead><tbody>' +
        (st.rows.length ? st.rows.map(function (r) {
          return '<tr><td class="qb-col-chk"><input type="checkbox" data-sc="' + r.c.id + '"' + (st.checked[r.c.id] ? ' checked' : '') + ' aria-label="Select"></td><td>' + esc(S.custName(r.c.id)) + '</td><td>' + esc(r.c.email || '') + (r.c.email ? '' : '<span class="qbf-muted">Missing email</span>') + '</td><td class="ta-r">' + U.num(r.bal) + '</td></tr>';
        }).join('') : '<tr class="qb-empty-row"><td colspan="4">No customers match this balance status.</td></tr>') + '</tbody></table>';
      sum();
    }
    function sel() { return st.rows.filter(function (r) { return st.checked[r.c.id]; }); }
    function sum() { var s = sel(); ctx.out('sum', '<b>' + plural(s.length, 'customer statement') + ' selected</b><span>Total balance ' + money(s.reduce(function (a, r) { return a + r.bal; }, 0)) + '</span>'); }
    host.addEventListener('change', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-sa')) { st.rows.forEach(function (r) { st.checked[r.c.id] = t.checked; }); render(); return; }
      var id = t.getAttribute('data-sc'); if (id) { st.checked[id] = t.checked; sum(); }
    });
    function periodVis() { ctx.$('.qbf-period').hidden = ctx.v('stype') === 'Open Item'; }
    ctx.el('stype').addEventListener('change', periodVis);
    ctx.el('status').addEventListener('change', function () { load(); render(); });
    ctx.on('apply', function () { load(); render(); });
    function sopts() {
      var ty = ctx.v('stype');
      return { type: ty, date: ctx.date('sdate') || U.today(), from: ty === 'Open Item' ? r365[0] : ctx.date('from'), to: ty === 'Open Item' ? r365[1] : ctx.date('to'), no: S.nextNo('Statement') };
    }
    function check2(needEmail) {
      var s = sel(), errs = [];
      if (!s.length) errs.push({ el: null, msg: 'Select at least one customer' });
      if (!ctx.date('sdate')) errs.push({ el: ctx.el('sdate'), msg: 'Enter a valid statement date (mm/dd/yyyy)' });
      var o = sopts();
      if (o.type !== 'Open Item' && (!o.from || !o.to || o.from > o.to)) errs.push({ el: ctx.el('from'), msg: 'Enter a valid statement period' });
      if (needEmail) s.forEach(function (r) { if (!r.c.email) errs.push({ el: null, msg: S.custName(r.c.id) + ' doesn\'t have an email address' }); });
      return showErrors(ctx, errs) ? null : s;
    }
    function save(sent) {
      var s = check2(sent); if (!s) return null;
      var o = sopts(), no = +o.no;
      s.forEach(function (r) {
        var t = { type: 'Statement', no: String(no++), date: o.date, cust: r.c.id, total: r.bal, stmtType: o.type, from: o.from, to: o.to, lines: [], memo: o.type };
        if (sent) { t.emailStatus = 'Sent'; t.sentTo = r.c.email; }
        S.add(t, true); S.log('Added', t);
      });
      S.changed('add');
      UI.toast(plural(s.length, 'statement') + (sent ? ' sent' : ' saved'));
      return s;
    }
    ctx.on('preview', function () {
      var s = check2(false); if (!s) return;
      var o = sopts(), no = +o.no;
      printPreview('Statement preview', s.slice(0, 12).map(function (r) { return statementHtml(r.c.id, assign({}, o, { no: String(no++) })); }).join('<div class="qbf-pagebreak"></div>') + (s.length > 12 ? '<p class="qbf-muted">Showing the first 12 statements.</p>' : ''));
    });
    ctx.on('save', function () { if (save(false)) { load(); render(); } });
    ctx.on('saveclose', function () { if (save(false)) ctx.close(true); });
    ctx.on('send', function () { if (save(true)) ctx.close(true); });
    periodVis(); load(); render();
    return ctx;
  });

  /* ───────── Recurring payment (template) ───────── */
  reg('Recurring payment', function (opts) {
    var tp = opts.template || null, st = { lines: [] };
    var blank = function () { return { item: '', desc: '', qty: '', rate: '', amount: '' }; };
    if (tp && tp.tpl && tp.tpl.lines) tp.tpl.lines.forEach(function (l) { st.lines.push(assign(blank(), l)); });
    else if (opts.amount) st.lines.push({ item: '', desc: opts.memo || '', qty: 1, rate: opts.amount, amount: opts.amount });
    while (st.lines.length < 2) st.lines.push(blank());
    var body = '<div class="qbf-recur"><div class="qb-paper qbf-pad">' +
      '<div class="qbf-grid4">' + fld('Template name', inp('name', tp ? tp.name : '')) + fld('Type', UI.select('kind', ['Scheduled', 'Reminder', 'Unscheduled'], tp ? tp.txnType : 'Scheduled')) +
      fld('Customer', UI.comboHtml('cust', '', 'Choose a customer')) + fld('Transaction type', UI.select('ttype', ['Invoice', 'Sales Receipt'], tp && tp.type === 'Sales Receipt' ? 'Sales Receipt' : 'Invoice')) + '</div>' +
      '<div class="qbf-grid4 qbf-sched">' + fld('Interval', UI.select('interval', ['Daily', 'Weekly', 'Monthly', 'Yearly'], 'Monthly')) +
      fld('Every', '<span class="qbf-inline">' + inp('every', '1', '', ' style="width:70px" inputmode="numeric"') + '<span class="qbf-muted" data-o="unit">month(s)</span></span>') +
      fld('Start date', UI.dateInput('start', tp && tp.next ? tp.next : U.addDays(U.today(), 1))) +
      fld('End', '<span class="qbf-inline">' + UI.select('end', ['None', 'By', 'After'], 'None') + inp('endval', '', '', ' style="width:120px" hidden aria-label="End value"') + '</span>') + '</div>' +
      '<div class="qbf-note">' + ic('info') + '<span>Recurring payments charge your customer automatically on schedule once online payments are on. In this practice company the template saves to Recurring transactions.</span></div>' +
      '<div class="qbf-grid2">' + fld('Customer email', inp('email', '')) + '<div class="qb-field"><span class="qb-label">&nbsp;</span>' + check('autosend', true, 'Automatically send emails') + '</div></div>' +
      '<section class="qbf-sec"><div class="qbf-sec-h"><h3>Product or service</h3></div><div class="qbf-rc-host"></div><div class="qb-lines-acts"><button type="button" class="qb-btn" data-q="addl">Add lines</button><button type="button" class="qb-btn" data-q="clrl">Clear all lines</button></div></section>' +
      '<div class="qbf-pur-total"><span>Total</span><b data-o="total">$0.00</b></div>' + fld('Memo', area('memo', tp ? tp.memo : '', 2)) + '</div></div>';
    var footer = { left: UI.btn('Cancel', { kind: 'secondary', attrs: ' data-q="cancel"' }), center: '', right: UI.btn('Save template', { kind: 'primary', attrs: ' data-q="save"' }) };
    var ctx = frame({ title: 'Recurring payment', body: body, footer: footer, right: headRight(), cls: 'qbf-recur-form' });
    stdHead(ctx);
    ctx.on('cancel', function () { ctx.close(); });
    var hit = tp ? byName(tp.payee) : null;
    var cC = combo(ctx.el('cust'), QB.lists.customers, { value: opts.cust || (hit && hit.cust) || '', onNew: newCustomer, onPick: function (v) { var c = S.cust[v]; ctx.set('email', c ? c.email || '' : ''); if (c && !String(ctx.v('name')).trim()) ctx.set('name', c.name + ' - recurring payment'); } });
    if (S.cust[cC.get()]) ctx.set('email', S.cust[cC.get()].email || '');
    var g = grid(ctx.$('.qbf-rc-host'), {
      lines: st.lines, blank: blank, min: 2, cls: 'is-case',
      onChange: function () { ctx.f.dirty = true; totals(); },
      cols: [
        { key: 'item', label: 'Product/service', kind: 'combo', list: QB.lists.items, onNew: newItem, width: '24%', pick: function (l, v) { var it = S.item[v]; if (it) { l.desc = it.desc || ''; l.rate = it.price || 0; if (l.qty === '') l.qty = 1; l.amount = r2(num(l.qty) * num(l.rate)); } } },
        { key: 'desc', label: 'Description', kind: 'text' },
        { key: 'qty', label: 'Qty', kind: 'num', width: '80px', calc: function (l) { l.amount = r2((l.qty === '' ? 1 : num(l.qty)) * num(l.rate)); } },
        { key: 'rate', label: 'Rate', kind: 'num', width: '100px', calc: function (l) { l.amount = r2((l.qty === '' ? 1 : num(l.qty)) * num(l.rate)); } },
        { key: 'amount', label: 'Amount', kind: 'money', width: '120px', calc: function (l) { l.rate = q4(num(l.amount) / (l.qty === '' || !num(l.qty) ? 1 : num(l.qty))); } }
      ]
    });
    ctx.on('addl', function () { g.add(); });
    ctx.on('clrl', function () { g.clear(); });
    function total() { return r2(st.lines.reduce(function (s, l) { return s + num(l.amount); }, 0)); }
    function totals() { ctx.out('total', money(total())); }
    function sched() {
      var k = ctx.v('kind'); ctx.$('.qbf-sched').hidden = k === 'Unscheduled';
      ctx.out('unit', { Daily: 'day(s)', Weekly: 'week(s)', Monthly: 'month(s)', Yearly: 'year(s)' }[ctx.v('interval')]);
      ctx.el('endval').hidden = ctx.v('end') === 'None';
      ctx.el('endval').placeholder = ctx.v('end') === 'By' ? 'mm/dd/yyyy' : 'occurrences';
    }
    ['kind', 'interval', 'end'].forEach(function (n) { ctx.el(n).addEventListener('change', sched); });
    ctx.on('save', function () {
      var errs = [], name = String(ctx.v('name')).trim(), cust = cC.get(), kind = ctx.v('kind');
      if (!name) errs.push({ el: ctx.el('name'), msg: 'Enter a template name' });
      if (!cust) errs.push({ el: ctx.el('cust'), msg: 'Select a customer' });
      if (total() <= 0) errs.push({ el: g.field(0, 'item'), msg: 'Add at least one product or service with an amount' });
      if (kind !== 'Unscheduled' && !ctx.date('start')) errs.push({ el: ctx.el('start'), msg: 'Enter a valid start date (mm/dd/yyyy)' });
      if (S.recurring.some(function (r) { return r !== tp && r.name.toLowerCase() === name.toLowerCase(); })) errs.push({ el: ctx.el('name'), msg: 'Another template already uses this name' });
      if (showErrors(ctx, errs)) return;
      var every = Math.max(1, parseInt(ctx.v('every'), 10) || 1), unit = { Daily: 'Day', Weekly: 'Week', Monthly: 'Month', Yearly: 'Year' }[ctx.v('interval')];
      var rec = { name: name, type: ctx.v('ttype'), txnType: kind, interval: kind === 'Unscheduled' ? '' : 'Every ' + (every > 1 ? every + ' ' + unit + 's' : unit), prev: tp ? tp.prev : '', next: kind === 'Unscheduled' ? '' : ctx.date('start'),
        payee: S.custName(cust), cust: cust, amount: total(), memo: ctx.v('memo'), recurringPayment: true, autoSend: !!ctx.v('autosend'), email: ctx.v('email'),
        end: ctx.v('end'), endVal: ctx.v('endval'), tpl: { lines: clone(st.lines.filter(function (l) { return l.item || num(l.amount); })) } };
      if (tp) assign(tp, rec); else S.recurring.push(rec);
      S.changed('recurring');
      UI.toast('Recurring payment template saved');
      if (opts.onSaved) opts.onSaved(tp || rec);
      ctx.close(true);
    });
    sched(); totals();
    return ctx;
  });

  /* ───────── drawers ───────── */
  function dv(d, n) { var e = d.querySelector('[name="' + n + '"]'); if (!e) return ''; return e.type === 'checkbox' ? e.checked : String(e.value).trim(); }
  function dset(d, n, v) { var e = d.querySelector('[name="' + n + '"]'); if (e) { if (e.type === 'checkbox') e.checked = !!v; else e.value = v == null ? '' : v; } }
  function drawerErrs(d, errs) {
    U.$$('.qbf-ferr', d).forEach(function (e) { e.remove(); });
    U.$$('.is-err', d).forEach(function (e) { e.classList.remove('is-err'); });
    var bar = d.querySelector('.qbf-errbar'); if (bar) bar.remove();
    if (!errs.length) return false;
    errs.forEach(function (er) {
      var el = d.querySelector('[name="' + er.name + '"]');
      if (!el) return;
      el.classList.add('is-err');
      var host = el.closest('.qb-field') || el.parentNode;
      host.insertAdjacentHTML('beforeend', '<div class="qbf-ferr">' + ic('alert') + '<span>' + esc(er.msg) + '</span></div>');
    });
    var body = d.querySelector('.qb-drawer-body');
    body.insertAdjacentHTML('afterbegin', '<div class="qbf-errbar" role="alert">' + ic('alert') + '<div><b>Something\'s not quite right</b><ul>' + errs.map(function (e) { return '<li>' + esc(e.msg) + '</li>'; }).join('') + '</ul></div></div>');
    body.scrollTop = 0;
    var first = d.querySelector('[name="' + errs[0].name + '"]'); if (first) first.focus();
    return true;
  }
  function drawerCommon(d) {
    datePickers(d);
    d.addEventListener('input', function (e) { clearFieldErr(e); });
    d.addEventListener('focusout', function (e) { var t = e.target; if (t.classList && t.classList.contains('qbf-money') && String(t.value).trim() !== '') t.value = U.num(num(t.value)); });
  }
  function sect(title, inner, open) { return '<details class="qbf-dsec"' + (open !== false ? ' open' : '') + '><summary>' + ic('caretDown', 'qbf-dsec-caret') + '<span>' + title + '</span></summary><div class="qbf-dsec-b">' + inner + '</div></details>'; }
  function fi(lbl, name, v, attrs, cls) { return fld(lbl, inp(name, v, cls || '', attrs), ''); }
  function nameTaken(name, exceptId) {
    var n = String(name).trim().toLowerCase();
    return S.customers.some(function (c) { return c.id !== exceptId && c.name.toLowerCase() === n && !c.parent; }) ||
      S.vendors.some(function (v) { return v.id !== exceptId && v.name.toLowerCase() === n; }) ||
      (S.employees || []).some(function (e) { return e.id !== exceptId && String(e.name).toLowerCase() === n; });
  }
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  function emailsOk(s) { return !s || s.split(/[,;]\s*/).filter(Boolean).every(function (x) { return EMAIL_RE.test(x.trim()); }); }
  function addCustomer(o) {
    var name = String(o.name || '').trim(); if (!name) return null;
    if (nameTaken(name)) { UI.toast('Another customer, vendor or employee is already using this name.', 'err'); return null; }
    var c = assign({ id: U.uid('c'), name: name, company: '', parent: null, phone: '', email: '', street: '', city: '', state: '', zip: '', first: '', last: '', active: true, notes: '', terms: S.settings.preferredTerms || 'Net 30', taxable: true, type: '' }, o);
    c.name = name;
    S.customers.push(c); S.cust[c.id] = c; S.changed('customer');
    return c;
  }
  function addVendor(o) {
    var name = String(o.name || '').trim(); if (!name) return null;
    if (nameTaken(name)) { UI.toast('Another customer, vendor or employee is already using this name.', 'err'); return null; }
    var v = assign({ id: U.uid('v'), name: name, company: '', phone: '', email: '', street: '', city: '', state: '', zip: '', track1099: false, active: true, terms: 'Net 30', notes: '' }, o);
    v.name = name;
    S.vendors.push(v); S.vend[v.id] = v; S.changed('vendor');
    return v;
  }
  function nameBlock(o, kind) {
    return '<div class="qbf-dgrid5">' + fi('Title', 'title', o.title) + fi('First name', 'first', o.first) + fi('Middle name', 'middle', o.middle) + fi('Last name', 'last', o.last) + fi('Suffix', 'suffix', o.suffix) + '</div>' +
      '<div class="qbf-dgrid2">' + fi('Company name', 'company', o.company) + fi(kind + ' display name *', 'display', o.name) + '</div>' +
      '<div class="qbf-dgrid2">' + fi('Email', 'email', o.email, ' type="email"') + fi('Phone number', 'phone', o.phone, ' type="tel"') +
      fi('Cc', 'cc', o.cc) + fi('Bcc', 'bcc', o.bcc) + fi('Mobile number', 'mobile', o.mobile, ' type="tel"') + fi('Fax', 'fax', o.fax) +
      fi('Other', 'other', o.other) + fi('Website', 'website', o.website) + '</div>' + fi('Name to print on checks', 'printname', o.printName || o.name);
  }
  function addrBlock(o, prefix, lbl) {
    return '<div class="qbf-daddr"><b>' + lbl + '</b>' + fi('Street address 1', prefix + 'street', o.street) + fi('Street address 2', prefix + 'street2', o.street2) +
      '<div class="qbf-dgrid2">' + fi('City', prefix + 'city', o.city) + fi('State', prefix + 'state', o.state) + fi('ZIP code', prefix + 'zip', o.zip) + fi('Country', prefix + 'country', o.country || 'United States') + '</div></div>';
  }
  /* Display name follows the name fields until you type one yourself. */
  function autoDisplay(d, c0) {
    var touched = !!c0;
    var disp = d.querySelector('[name=display]');
    disp.addEventListener('input', function () { touched = true; });
    ['title', 'first', 'middle', 'last', 'suffix', 'company'].forEach(function (n) {
      d.querySelector('[name=' + n + ']').addEventListener('input', function () {
        if (touched) return;
        var full = [dv(d, 'title'), dv(d, 'first'), dv(d, 'middle'), dv(d, 'last'), dv(d, 'suffix')].filter(Boolean).join(' ');
        disp.value = full || dv(d, 'company');
        var pn = d.querySelector('[name=printname]'); if (pn) pn.value = disp.value;
      });
    });
  }

  reg('Customer', function (opts) {
    var c0 = opts.customer || null, o = c0 || { name: opts.name || '' };
    var types = [];
    S.customers.forEach(function (c) { if (c.type && types.indexOf(c.type) < 0) types.push(c.type); });
    var parents = S.customers.filter(function (c) { return c.active && !c.parent && (!c0 || c.id !== c0.id); }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var body = '<div class="qbf-drawer-form">' +
      sect('Name and contact', nameBlock(o, 'Customer') +
        '<div class="qbf-subcust">' + check('issub', !!o.parent, 'Is a sub-customer') +
        '<div class="qbf-subrow"' + (o.parent ? '' : ' hidden') + '>' + fld('Sub-customer of', UI.select('parent', [['', 'Select parent customer']].concat(parents.map(function (p) { return [p.id, p.name]; })), o.parent || '')) +
        '<div class="qbf-radios"><label><input type="radio" name="billwith" value="parent"' + (o.billParent ? ' checked' : '') + '> Bill parent customer</label><label><input type="radio" name="billwith" value="self"' + (o.billParent ? '' : ' checked') + '> Bill this customer</label></div></div></div>') +
      sect('Addresses', addrBlock(o, 'b', 'Billing address') + check('same', o.shipSame !== false, 'Same as billing address') + '<div class="qbf-ship"' + (o.shipSame !== false ? ' hidden' : '') + '>' + addrBlock(o.ship || {}, 's', 'Shipping address') + '</div>') +
      sect('Notes and attachments', fld('Notes', area('notes', o.notes, 3)) + '<label class="qbf-drop qbf-drop-d"><input type="file" hidden multiple data-dattach><span class="qb-link">Add attachment</span><span class="qbf-muted">Max file size: 20 MB</span></label><div class="qbf-dattach-list"></div>') +
      sect('Payments', '<div class="qbf-dgrid2">' + fld('Primary payment method', UI.select('paymethod', [['', 'Select a payment method']].concat(U.METHODS), o.payMethod || '')) +
        fld('Terms', UI.select('terms', U.TERMS, o.terms || S.settings.preferredTerms || 'Net 30')) +
        fld('Sales form delivery options', UI.select('delivery', ['Use company default', 'Print later', 'Send later', 'None'], o.delivery || 'Use company default')) +
        fld('Language to use when you send invoices', UI.select('lang', ['English', 'Spanish', 'French', 'Italian', 'Chinese (traditional)', 'Portuguese (Brazil)'], o.lang || 'English')) + '</div>', !!c0) +
      sect('Additional info', '<div class="qbf-dgrid2">' + fld('Customer type', UI.select('ctype', [['', 'Select customer type']].concat(types), o.type || '')) +
        '<div class="qb-field"><span class="qb-label">Sales tax</span>' + check('exempt', o.taxable === false, 'This customer is tax exempt') + '</div>' +
        (c0 ? '' : fi('Opening balance', 'opening', '', ' inputmode="decimal"', 'qbf-money') + fld('As of', UI.dateInput('asof', U.today()))) + '</div>', !!c0) + '</div>';
    var d = UI.drawer(c0 ? 'Edit customer' : 'New customer', body, { wide: true, onSave: function (dd) { return save(dd); } });
    d.classList.add('qbf-drawer');
    drawerCommon(d);
    autoDisplay(d, c0);
    var att = c0 && c0.attachments ? c0.attachments.slice() : [];
    function drawAtt() { d.querySelector('.qbf-dattach-list').innerHTML = att.map(function (a) { return '<div class="qbf-att">' + ic('attach') + '<span>' + esc(a.name) + '</span><em>' + fmtSize(a.size || 0) + '</em></div>'; }).join(''); }
    d.querySelector('[data-dattach]').addEventListener('change', function (e) { [].slice.call(e.target.files).forEach(function (x) { att.push({ name: x.name, size: x.size }); }); drawAtt(); });
    drawAtt();
    d.querySelector('[name=issub]').addEventListener('change', function () { d.querySelector('.qbf-subrow').hidden = !dv(d, 'issub'); });
    d.querySelector('[name=same]').addEventListener('change', function () { d.querySelector('.qbf-ship').hidden = dv(d, 'same'); });
    d.querySelector('[name=parent]').addEventListener('change', function () {
      var p = S.cust[dv(d, 'parent')]; if (!p || dv(d, 'bstreet')) return;
      dset(d, 'bstreet', p.street); dset(d, 'bcity', p.city); dset(d, 'bstate', p.state); dset(d, 'bzip', p.zip); if (!dv(d, 'company')) dset(d, 'company', p.company || p.name);
    });
    function save(dd) {
      var name = dv(dd, 'display'), errs = [], parent = dv(dd, 'issub') ? dv(dd, 'parent') : null;
      if (!name) errs.push({ name: 'display', msg: 'Enter a customer display name' });
      else if (parent ? S.customers.some(function (c) { return c.parent === parent && c.name.toLowerCase() === name.toLowerCase() && (!c0 || c.id !== c0.id); }) : nameTaken(name, c0 && c0.id)) errs.push({ name: 'display', msg: 'Another customer, vendor or employee is already using this name. Please use a different name.' });
      if (dv(dd, 'issub') && !parent) errs.push({ name: 'parent', msg: 'Select a parent customer' });
      ['email', 'cc', 'bcc'].forEach(function (n) { if (!emailsOk(dv(dd, n))) errs.push({ name: n, msg: 'Enter a valid email address' }); });
      if (!c0 && dv(dd, 'opening') && !U.parseDate(dv(dd, 'asof'))) errs.push({ name: 'asof', msg: 'Enter a valid date (mm/dd/yyyy)' });
      if (drawerErrs(dd, errs)) return false;
      var rec = {
        name: name, company: dv(dd, 'company'), parent: parent || null, billParent: !!parent && (dd.querySelector('[name=billwith]:checked') || {}).value === 'parent',
        title: dv(dd, 'title'), first: dv(dd, 'first'), middle: dv(dd, 'middle'), last: dv(dd, 'last'), suffix: dv(dd, 'suffix'),
        email: dv(dd, 'email'), phone: dv(dd, 'phone'), cc: dv(dd, 'cc'), bcc: dv(dd, 'bcc'), mobile: dv(dd, 'mobile'), fax: dv(dd, 'fax'), other: dv(dd, 'other'), website: dv(dd, 'website'), printName: dv(dd, 'printname'),
        street: dv(dd, 'bstreet'), street2: dv(dd, 'bstreet2'), city: dv(dd, 'bcity'), state: dv(dd, 'bstate'), zip: dv(dd, 'bzip'), country: dv(dd, 'bcountry'),
        shipSame: !!dv(dd, 'same'), ship: dv(dd, 'same') ? null : { street: dv(dd, 'sstreet'), street2: dv(dd, 'sstreet2'), city: dv(dd, 'scity'), state: dv(dd, 'sstate'), zip: dv(dd, 'szip'), country: dv(dd, 'scountry') },
        notes: dv(dd, 'notes'), payMethod: dv(dd, 'paymethod'), terms: dv(dd, 'terms'), delivery: dv(dd, 'delivery'), lang: dv(dd, 'lang'), type: dv(dd, 'ctype'), taxable: !dv(dd, 'exempt'), attachments: att
      };
      var c;
      if (c0) { c = assign(c0, rec); S.changed('customer'); }
      else {
        c = assign({ id: U.uid('c'), active: true }, rec);
        S.customers.push(c); S.cust[c.id] = c;
        var ob = r2(num(dv(dd, 'opening')));
        if (ob) S.add({ type: 'Invoice', no: '', date: U.parseDate(dv(dd, 'asof')), due: U.parseDate(dv(dd, 'asof')), terms: 'Due on receipt', cust: c.id, memo: 'Opening Balance', taxRate: 0, lines: [{ item: '', acct: 'a_obe', desc: 'Opening Balance', qty: 1, rate: ob, amount: ob, taxable: false }], subtotal: ob, total: ob, tax: 0, discount: 0 }, true);
        S.changed('customer');
      }
      UI.toast(c.name + (c0 ? ' updated' : ' saved'));
      if (opts.onSaved) later(function () { opts.onSaved(c); });
      return true;
    }
    later(function () { var e = d.querySelector(c0 ? '[name=display]' : '[name=first]'); if (e) e.focus(); });
    return d;
  });

  reg('Vendor', function (opts) {
    var v0 = (opts.vendor && S.vend[opts.vendor]) || null, o = v0 || { name: opts.name || '' };
    var body = '<div class="qbf-drawer-form">' +
      sect('Name and contact', nameBlock(o, 'Vendor')) +
      sect('Address', addrBlock(o, 'b', 'Address')) +
      sect('Notes and attachments', fld('Notes', area('notes', o.notes, 3))) +
      sect('Additional info', '<div class="qbf-dgrid2">' + fi('Business ID No. / Social Security No.', 'taxid', o.taxId) +
        '<div class="qb-field"><span class="qb-label">1099 tracking</span>' + check('t1099', o.track1099, 'Track payments for 1099') + '</div>' +
        fi('Billing rate (/hr)', 'rate', o.billRate ? U.num(o.billRate) : '', ' inputmode="decimal"', 'qbf-money') +
        fld('Terms', UI.select('terms', U.TERMS, o.terms || 'Net 30')) + fi('Account no.', 'acctno', o.acctNo) +
        fld('Default expense category', UI.select('defcat', [['', 'Choose a category']].concat(acctOpts(['Expenses', 'Cost of Goods Sold', 'Other Expense'])), o.defCat || '')) +
        (v0 ? '' : fi('Opening balance', 'opening', '', ' inputmode="decimal"', 'qbf-money') + fld('As of', UI.dateInput('asof', U.today()))) + '</div>') + '</div>';
    var d = UI.drawer(v0 ? 'Edit vendor' : 'New vendor', body, { wide: true, onSave: function (dd) { return save(dd); } });
    d.classList.add('qbf-drawer');
    drawerCommon(d);
    autoDisplay(d, v0);
    function save(dd) {
      var name = dv(dd, 'display'), errs = [];
      if (!name) errs.push({ name: 'display', msg: 'Enter a vendor display name' });
      else if (nameTaken(name, v0 && v0.id)) errs.push({ name: 'display', msg: 'Another customer, vendor or employee is already using this name. Please use a different name.' });
      ['email', 'cc', 'bcc'].forEach(function (n) { if (!emailsOk(dv(dd, n))) errs.push({ name: n, msg: 'Enter a valid email address' }); });
      if (!v0 && dv(dd, 'opening') && !U.parseDate(dv(dd, 'asof'))) errs.push({ name: 'asof', msg: 'Enter a valid date (mm/dd/yyyy)' });
      if (drawerErrs(dd, errs)) return false;
      var rec = {
        name: name, company: dv(dd, 'company'), title: dv(dd, 'title'), first: dv(dd, 'first'), middle: dv(dd, 'middle'), last: dv(dd, 'last'), suffix: dv(dd, 'suffix'),
        email: dv(dd, 'email'), phone: dv(dd, 'phone'), cc: dv(dd, 'cc'), bcc: dv(dd, 'bcc'), mobile: dv(dd, 'mobile'), fax: dv(dd, 'fax'), other: dv(dd, 'other'), website: dv(dd, 'website'), printName: dv(dd, 'printname'),
        street: dv(dd, 'bstreet'), street2: dv(dd, 'bstreet2'), city: dv(dd, 'bcity'), state: dv(dd, 'bstate'), zip: dv(dd, 'bzip'), country: dv(dd, 'bcountry'),
        notes: dv(dd, 'notes'), taxId: dv(dd, 'taxid'), track1099: !!dv(dd, 't1099'), billRate: num(dv(dd, 'rate')), terms: dv(dd, 'terms'), acctNo: dv(dd, 'acctno'), defCat: dv(dd, 'defcat')
      };
      var v;
      if (v0) { v = assign(v0, rec); S.changed('vendor'); }
      else {
        v = assign({ id: U.uid('v'), active: true }, rec);
        S.vendors.push(v); S.vend[v.id] = v;
        var ob = r2(num(dv(dd, 'opening')));
        if (ob) { var dt = U.parseDate(dv(dd, 'asof')); S.add({ type: 'Bill', no: '', date: dt, due: dt, terms: 'Due on receipt', payee: v.id, memo: 'Opening Balance', total: ob, lines: [{ acct: 'a_obe', amount: ob, desc: 'Opening Balance' }] }, true); }
        S.changed('vendor');
      }
      UI.toast(v.name + (v0 ? ' updated' : ' saved'));
      if (opts.onSaved) later(function () { opts.onSaved(v); });
      return true;
    }
    later(function () { var e = d.querySelector(v0 ? '[name=display]' : '[name=first]'); if (e) e.focus(); });
    return d;
  });

  reg('Contractor', function (opts) {
    var body = '<div class="qbf-drawer-form"><p class="qb-muted">Add a contractor to track payments for 1099s. They show up on your vendor list too.</p>' +
      '<div class="qbf-radios"><label><input type="radio" name="ctype" value="ind" checked> Individual</label><label><input type="radio" name="ctype" value="biz"> Business</label></div>' +
      fi('Contractor\'s name *', 'cname', opts.name || '') + fi('Email', 'cemail', '', ' type="email"') +
      check('w9', true, 'Invite this contractor to fill out their W-9 and enter their info') +
      '<p class="qbf-muted">We\'ll email them a secure link. In this practice company no email is sent.</p></div>';
    var d = UI.drawer('Add a contractor', body, { onSave: function (dd) {
      var name = dv(dd, 'cname'), email = dv(dd, 'cemail'), errs = [];
      if (!name) errs.push({ name: 'cname', msg: 'Enter the contractor\'s name' });
      else if (nameTaken(name)) errs.push({ name: 'cname', msg: 'Another customer, vendor or employee is already using this name. Please use a different name.' });
      if (!emailsOk(email)) errs.push({ name: 'cemail', msg: 'Enter a valid email address' });
      if (dv(dd, 'w9') && !email) errs.push({ name: 'cemail', msg: 'Enter an email address to send the W-9 invite' });
      if (drawerErrs(dd, errs)) return false;
      var biz = (dd.querySelector('[name=ctype]:checked') || {}).value === 'biz';
      var v = { id: U.uid('v'), name: name, company: biz ? name : '', email: email, phone: '', street: '', city: '', state: '', zip: '', track1099: true, active: true, terms: 'Net 30', notes: '', contractor: true };
      S.vendors.push(v); S.vend[v.id] = v;
      S.contractors.push({ name: name, email: email, w9: dv(dd, 'w9') ? 'Requested' : 'Not requested', paid: 0, vendor: v.id });
      S.changed('contractor');
      UI.toast(dv(dd, 'w9') ? 'Contractor added. W-9 invite ready to send.' : 'Contractor added');
      if (opts.onSaved) later(function () { opts.onSaved(v); });
      return true;
    } });
    d.classList.add('qbf-drawer');
    drawerCommon(d);
    return d;
  });

  /* Product/Service: choose a type, then fill in the details. */
  var ITEM_TYPES = [
    ['Inventory', 'Products you buy and/or sell and that you track quantities of.', 'box'],
    ['Non-inventory', 'Products you buy and/or sell but don\'t need to (or can\'t) track quantities of, for example, nuts and bolts used in an installation.', 'tag'],
    ['Service', 'Services that you provide to customers, for example, landscaping or tax preparation services.', 'users'],
    ['Bundle', 'A collection of products and/or services that you sell together, for example, a gift basket of fruit, cheese, and wine.', 'copy']
  ];
  reg('Product/Service', function (opts) {
    var it0 = (opts.item && S.item[opts.item]) || null, st = { type: it0 ? it0.type : opts.type || '', bundle: [] };
    var d = UI.drawer(it0 ? 'Product/Service information' : 'Product/Service information', '', { wide: true, saveLabel: 'Save and close', onSave: function (dd) { return save(dd); } });
    d.classList.add('qbf-drawer', 'qbf-item-drawer');
    drawerCommon(d);
    var bodyEl = d.querySelector('.qb-drawer-body'), saveBtn = d.querySelector('[data-save]');
    function picker() {
      saveBtn.hidden = true;
      bodyEl.innerHTML = '<div class="qbf-itypes">' + ITEM_TYPES.map(function (t) {
        return '<button type="button" class="qbf-itype" data-itype="' + t[0] + '"><span class="qbf-itype-ic">' + ic(t[2]) + '</span><span><b>' + t[0] + '</b><em>' + esc(t[1]) + '</em></span>' + ic('caretRight', 'qbf-itype-go') + '</button>';
      }).join('') + '</div>';
    }
    var cats = [];
    S.items.forEach(function (i) { if (i.category && cats.indexOf(i.category) < 0) cats.push(i.category); });
    cats.sort();
    function form() {
      saveBtn.hidden = false;
      var o = it0 || { name: opts.name || '', taxable: true }, ty = st.type, inv = ty === 'Inventory', bun = ty === 'Bundle';
      var incomeDef = inv ? 'a_sop' : 'a_serv', expDef = inv ? 'a_cogs' : 'a_purch';
      var head = '<div class="qbf-ihead"><span class="qbf-itype-ic">' + ic((ITEM_TYPES.filter(function (t) { return t[0] === ty; })[0] || [])[2] || 'tag') + '</span><b>' + esc(ty) + '</b>' + (it0 ? '' : '<button type="button" class="qb-link" data-ichange>Change type</button>') + '</div>';
      var top = '<div class="qbf-dgrid-img"><div>' + fi('Name *', 'iname', o.name) + fi('SKU', 'isku', o.sku) +
        fld('Category', UI.select('icat', [['', 'Choose a category']].concat(cats).concat([['__new', '+ Add new']]), o.category || '')) + '</div>' +
        '<label class="qbf-iimg"><input type="file" accept="image/*" hidden data-iimg><span data-iimgv>' + (o.img ? '<img src="' + esc(o.img) + '" alt="">' : ic('camera') + '<em>Add image</em>') + '</span></label></div>';
      var h = head + top;
      if (inv) {
        h += '<div class="qbf-dgrid2">' + (it0 ? fld('Quantity on hand', '<span class="qbf-inline">' + inp('iqty', fmtQty(o.qty), '', ' readonly') + '<button type="button" class="qb-link" data-iadj>Adjust quantity</button></span>') : fi('Initial quantity on hand *', 'iqty', '', ' inputmode="decimal"') + fld('As of date *', UI.dateInput('iasof', U.today()))) +
          fi('Reorder point', 'ireorder', o.reorder != null ? o.reorder : '', ' inputmode="decimal"') +
          fld('Inventory asset account', UI.select('iinvacct', acctOpts(['Other Current Assets']), o.invAcct || 'a_inv')) + '</div>';
      }
      if (bun) {
        h += fld('Description', area('idesc', o.desc, 3)) + check('ishowcomp', o.showComponents, 'Display bundle components when printing or sending transactions') +
          '<h4 class="qbf-dsub">Products/services included in the bundle</h4><div class="qbf-bundle-host"></div><div class="qb-lines-acts"><button type="button" class="qb-btn" data-ibadd>Add lines</button></div>';
      } else {
        var sells = it0 ? o.sells !== false : true, buys = inv || (it0 ? !!(o.cost || o.expenseAcct) : false);
        h += '<h4 class="qbf-dsub">Sales information</h4>' + (inv ? '' : check('isells', sells, 'I sell this ' + (ty === 'Service' ? 'service' : 'product') + ' to my customers.')) +
          '<div class="qbf-isales"' + (sells ? '' : ' hidden') + '>' + fld('Description', area('idesc', o.desc, 3, 'Description on sales forms')) +
          '<div class="qbf-dgrid2">' + fi('Sales price/rate', 'iprice', o.price ? U.num(o.price) : '', ' inputmode="decimal"', 'qbf-money') +
          fld('Income account', UI.select('iincome', acctOpts(['Income', 'Other Income']), o.incomeAcct || incomeDef)) + '</div>' +
          check('itax', o.taxable !== false, 'Taxable. Charge sales tax on this ' + (ty === 'Service' ? 'service' : 'product')) + '</div>' +
          '<h4 class="qbf-dsub">Purchasing information</h4>' + (inv ? '' : check('ibuys', buys, 'I purchase this ' + (ty === 'Service' ? 'service' : 'product') + ' from a vendor.')) +
          '<div class="qbf-ibuy"' + (buys ? '' : ' hidden') + '>' + fld('Description on purchase forms', area('ipdesc', o.purchDesc, 2)) +
          '<div class="qbf-dgrid2">' + fi('Cost', 'icost', o.cost ? U.num(o.cost) : '', ' inputmode="decimal"', 'qbf-money') +
          fld('Expense account', UI.select('iexp', acctOpts(['Cost of Goods Sold', 'Expenses', 'Other Expense']), o.expenseAcct || expDef)) +
          fld('Preferred vendor', UI.select('ivendor', [['', 'Select a preferred vendor']].concat(S.vendors.filter(function (v) { return v.active; }).map(function (v) { return [v.id, v.name]; })), o.vendor || '')) + '</div></div>';
      }
      bodyEl.innerHTML = '<div class="qbf-drawer-form">' + h + '</div>';
      var sc = bodyEl.querySelector('[name=isells]'); if (sc) sc.addEventListener('change', function () { bodyEl.querySelector('.qbf-isales').hidden = !sc.checked; });
      var bc = bodyEl.querySelector('[name=ibuys]'); if (bc) bc.addEventListener('change', function () { bodyEl.querySelector('.qbf-ibuy').hidden = !bc.checked; });
      var cs = bodyEl.querySelector('[name=icat]');
      cs.addEventListener('change', function () {
        if (cs.value !== '__new') return;
        var n = (window.prompt ? window.prompt('Name of the new category') : '') || '';
        n = n.trim();
        if (n) { cats.push(n); var op = document.createElement('option'); op.value = n; op.textContent = n; cs.insertBefore(op, cs.lastElementChild); cs.value = n; } else cs.value = '';
      });
      var img = bodyEl.querySelector('[data-iimg]');
      img.addEventListener('change', function () {
        var file = img.files && img.files[0]; if (!file) return;
        var rd = new FileReader(); rd.onload = function () { st.img = rd.result; bodyEl.querySelector('[data-iimgv]').innerHTML = '<img src="' + esc(rd.result) + '" alt="">'; }; rd.readAsDataURL(file);
      });
      var nm = bodyEl.querySelector('[name=iname]');
      later(function () { nm.focus(); });
      if (bun) {
        st.bundle = it0 && it0.bundle ? clone(it0.bundle) : [];
        while (st.bundle.length < 2) st.bundle.push({ item: '', qty: '' });
        st.bg = grid(bodyEl.querySelector('.qbf-bundle-host'), {
          lines: st.bundle, blank: function () { return { item: '', qty: '' }; }, min: 2, drag: false, cls: 'is-case',
          cols: [{ key: 'item', label: 'Product/service', kind: 'combo', addNew: false, list: function () { return QB.lists.items().filter(function (x) { return S.item[x.value].type !== 'Bundle' && (!it0 || x.value !== it0.id); }); }, pick: function (l) { if (l.qty === '') l.qty = 1; } },
            { key: 'qty', label: 'Qty', kind: 'num', width: '90px' }]
        });
        bodyEl.querySelector('[data-ibadd]').addEventListener('click', function () { st.bg.add(); });
      }
    }
    bodyEl.addEventListener('click', function (e) {
      var t = e.target.closest('[data-itype]');
      if (t) { st.type = t.getAttribute('data-itype'); form(); return; }
      if (e.target.closest('[data-ichange]')) { picker(); return; }
      if (e.target.closest('[data-iadj]')) { d.close(); later(function () { QB.openForm('Inventory Qty Adjust', { item: it0.id }); }); }
    });
    function save(dd) {
      if (!st.type) return false;
      var ty = st.type, inv = ty === 'Inventory', bun = ty === 'Bundle', errs = [], name = dv(dd, 'iname');
      if (!name) errs.push({ name: 'iname', msg: 'Enter a name' });
      else if (S.items.some(function (i) { return i.name.toLowerCase() === name.toLowerCase() && (!it0 || i.id !== it0.id); })) errs.push({ name: 'iname', msg: 'Another product or service is already using this name. Please use a different name.' });
      if (inv && !it0) {
        if (dv(dd, 'iqty') === '' || isNaN(parseFloat(dv(dd, 'iqty')))) errs.push({ name: 'iqty', msg: 'Enter the quantity on hand' });
        if (!U.parseDate(dv(dd, 'iasof'))) errs.push({ name: 'iasof', msg: 'Enter a valid as of date (mm/dd/yyyy)' });
      }
      if (bun && !st.bundle.some(function (b) { return b.item; })) errs.push({ name: 'iname', msg: 'Add at least one product or service to the bundle' });
      if (drawerErrs(dd, errs)) return false;
      var sc = dd.querySelector('[name=isells]'), sells = bun ? false : (sc ? sc.checked : true);
      var buys = inv || !!dv(dd, 'ibuys');
      var rec = { name: name, sku: dv(dd, 'isku'), category: dv(dd, 'icat') === '__new' ? '' : dv(dd, 'icat'), type: ty, desc: dv(dd, 'idesc'), img: st.img || (it0 && it0.img) || '' };
      if (bun) assign(rec, { price: 0, cost: 0, qty: null, incomeAcct: null, expenseAcct: null, taxable: false, showComponents: !!dv(dd, 'ishowcomp'), bundle: st.bundle.filter(function (b) { return b.item; }).map(function (b) { return { item: b.item, qty: num(b.qty) || 1 }; }) });
      else assign(rec, {
        sells: !!sells, price: sells ? num(dv(dd, 'iprice')) : 0, incomeAcct: sells ? dv(dd, 'iincome') : (inv ? 'a_sop' : 'a_serv'), taxable: sells ? !!dv(dd, 'itax') : false,
        purchDesc: buys ? dv(dd, 'ipdesc') : '', cost: buys ? num(dv(dd, 'icost')) : 0, expenseAcct: buys ? dv(dd, 'iexp') : null, vendor: buys ? dv(dd, 'ivendor') : ''
      });
      if (inv) { rec.reorder = dv(dd, 'ireorder') === '' ? null : num(dv(dd, 'ireorder')); rec.invAcct = dv(dd, 'iinvacct') || 'a_inv'; }
      var it;
      if (it0) { it = assign(it0, rec); if (!inv) it.qty = null; }
      else {
        it = assign({ id: U.uid('i'), active: true, qty: null, reorder: null, purchDesc: '' }, rec);
        S.items.push(it); S.item[it.id] = it;
        if (inv) {
          var q = q4(num(dv(dd, 'iqty'))), asof = U.parseDate(dv(dd, 'iasof'));
          it.qty = q;
          var val = r2(q * (it.cost || 0));
          if (q) S.add({ type: 'Inventory Qty Adjust', no: 'START', date: asof, memo: 'Inventory starting value for ' + it.name, adjAcct: 'a_obe', total: val,
            adjust: [{ item: it.id, desc: it.desc, prev: 0, qty: q, diff: q }],
            lines: val ? [{ acct: it.invAcct || 'a_inv', debit: val, credit: 0, desc: it.name, item: it.id }, { acct: 'a_obe', debit: 0, credit: val, desc: it.name }] : [] }, true);
        }
      }
      S.changed('item');
      UI.toast(it.name + (it0 ? ' updated' : ' saved'));
      if (opts.onSaved) later(function () { opts.onSaved(it); });
      return true;
    }
    if (st.type) form(); else picker();
    return d;
  });

  /* Account: type, detail type, name, number, description, sub-account, opening balance. */
  var DETAIL = {
    'Bank': ['Cash on hand', 'Checking', 'Money Market', 'Rents Held in Trust', 'Savings', 'Trust account'],
    'Accounts receivable (A/R)': ['Accounts Receivable (A/R)'],
    'Other Current Assets': ['Allowance for Bad Debts', 'Development Costs', 'Employee Cash Advances', 'Inventory', 'Investment - Mortgage/Real Estate Loans', 'Investment - Tax-Exempt Securities', 'Investment - U.S. Government Obligations', 'Investments - Other', 'Loans To Officers', 'Loans to Others', 'Loans to Stockholders', 'Other Current Assets', 'Prepaid Expenses', 'Retainage', 'Undeposited Funds'],
    'Fixed Assets': ['Accumulated Amortization', 'Accumulated Depletion', 'Accumulated Depreciation', 'Buildings', 'Depletable Assets', 'Furniture & Fixtures', 'Intangible Assets', 'Land', 'Leasehold Improvements', 'Machinery & Equipment', 'Other fixed assets', 'Vehicles'],
    'Other Assets': ['Accumulated Amortization of Other Assets', 'Goodwill', 'Lease Buyout', 'Licenses', 'Organizational Costs', 'Other Long-term Assets', 'Security Deposits'],
    'Accounts payable (A/P)': ['Accounts Payable (A/P)'],
    'Credit Card': ['Credit Card'],
    'Other Current Liabilities': ['Federal Income Tax Payable', 'Global Tax Payable', 'Insurance Payable', 'Line of Credit', 'Loan Payable', 'Other Current Liabilities', 'Payroll Clearing', 'Payroll Tax Payable', 'Prepaid Expenses Payable', 'Rents in trust - Liability', 'Sales Tax Payable', 'State/Local Income Tax Payable', 'Trust Accounts - Liabilities'],
    'Long Term Liabilities': ['Notes Payable', 'Other Long Term Liabilities', 'Shareholder Notes Payable'],
    'Equity': ['Accumulated Adjustment', 'Common Stock', 'Estimated Taxes', 'Healthcare', 'Opening Balance Equity', 'Owner\'s Equity', 'Paid-In Capital or Surplus', 'Partner Contributions', 'Partner Distributions', 'Partner\'s Equity', 'Personal Expense', 'Personal Income', 'Preferred Stock', 'Retained Earnings', 'Treasury Stock'],
    'Income': ['Discounts/Refunds Given', 'Non-Profit Income', 'Other Primary Income', 'Sales of Product Income', 'Service/Fee Income', 'Unapplied Cash Payment Income'],
    'Other Income': ['Dividend Income', 'Interest Earned', 'Other Investment Income', 'Other Miscellaneous Income', 'Tax-Exempt Interest'],
    'Cost of Goods Sold': ['Cost of labor - COS', 'Equipment Rental - COS', 'Other Costs of Services - COS', 'Shipping, Freight & Delivery - COS', 'Supplies & Materials - COGS'],
    'Expenses': ['Advertising/Promotional', 'Auto', 'Bad Debts', 'Bank Charges', 'Charitable Contributions', 'Communication', 'Cost of Labor', 'Dues & subscriptions', 'Entertainment', 'Entertainment Meals', 'Equipment Rental', 'Finance costs', 'Insurance', 'Interest Paid', 'Legal & Professional Fees', 'Office/General Administrative Expenses', 'Other Business Expenses', 'Other Miscellaneous Service Cost', 'Payroll Expenses', 'Promotional Meals', 'Rent or Lease of Buildings', 'Repair & Maintenance', 'Shipping, Freight & Delivery', 'Supplies & Materials', 'Taxes Paid', 'Travel', 'Travel Meals', 'Unapplied Cash Bill Payment Expense', 'Utilities'],
    'Other Expense': ['Amortization', 'Depreciation', 'Exchange Gain or Loss', 'Other Miscellaneous Expense', 'Penalties & Settlements']
  };
  var TYPE_HELP = {
    'Bank': 'Use Bank accounts to track the money in your checking, savings and other bank accounts.',
    'Credit Card': 'Credit card accounts track the balance due on your business credit cards.',
    'Income': 'Income accounts track money coming in from the sale of products and services.',
    'Expenses': 'Expense accounts track money going out for running the business.',
    'Cost of Goods Sold': 'Cost of Goods Sold accounts track the direct cost of the products and services you sell.',
    'Equity': 'Equity accounts track what the owners put in and take out of the business.'
  };
  reg('Account', function (opts) {
    var a0 = opts.account || null, o = a0 || { name: opts.name || '', type: opts.type && DETAIL[opts.type] ? opts.type : 'Expenses' };
    var body = '<div class="qbf-drawer-form">' + fi('Account name *', 'aname', o.name) + fi('Account number', 'anum', o.number || '') +
      fld('Account type *', UI.select('atype', QB.ACCOUNT_TYPES, o.type)) + fld('Detail type *', UI.select('adetail', DETAIL[o.type].map(function (x) { return [x, x]; }), o.detail || DETAIL[o.type][0])) +
      '<p class="qbf-muted qbf-typehelp" data-help></p>' +
      fld('Description', area('adesc', o.desc, 2)) +
      check('asub', !!o.parent, 'Make this a subaccount') +
      '<div class="qbf-asub"' + (o.parent ? '' : ' hidden') + '>' + fld('Parent account', '<span class="qb-select"><select name="aparent"></select>' + ic('caretDown', 'qb-select-caret') + '</span>') + '</div>' +
      (a0 ? '' : '<div class="qbf-aob"><div class="qbf-dgrid2">' + fi('Opening balance', 'aob', '', ' inputmode="decimal"', 'qbf-money') + fld('As of', UI.dateInput('aasof', U.today())) + '</div><p class="qbf-muted">Enter the balance from your statement on the as of date. It posts against Opening Balance Equity.</p></div>') + '</div>';
    var d = UI.drawer(a0 ? 'Edit account' : 'New account', body, { onSave: function (dd) { return save(dd); } });
    d.classList.add('qbf-drawer');
    drawerCommon(d);
    var ts = d.querySelector('[name=atype]'), ds = d.querySelector('[name=adetail]'), ps = d.querySelector('[name=aparent]');
    function fillParents() {
      var ty = ts.value, cur = ps.value || o.parent || '';
      ps.innerHTML = selOpts([['', 'Select parent account']].concat(S.ordered().filter(function (a) { return a.type === ty && a.active !== false && (!a0 || a.id !== a0.id); }).map(function (a) { return [a.id, S.fullName(a.id)]; })), cur);
    }
    function onType() {
      var ty = ts.value;
      ds.innerHTML = selOpts(DETAIL[ty].map(function (x) { return [x, x]; }), DETAIL[ty].indexOf(ds.value) >= 0 ? ds.value : DETAIL[ty][0]);
      d.querySelector('[data-help]').textContent = TYPE_HELP[ty] || 'Detail types help QuickBooks place the account in the right spot on your reports.';
      var ob = d.querySelector('.qbf-aob'); if (ob) ob.hidden = !S.isBS({ type: ty });
      fillParents();
    }
    ts.addEventListener('change', onType);
    d.querySelector('[name=asub]').addEventListener('change', function () { d.querySelector('.qbf-asub').hidden = !dv(d, 'asub'); });
    onType();
    if (a0) ds.value = a0.detail;
    function save(dd) {
      var name = dv(dd, 'aname'), ty = dv(dd, 'atype'), parent = dv(dd, 'asub') ? dv(dd, 'aparent') : null, errs = [];
      if (!name) errs.push({ name: 'aname', msg: 'Enter an account name' });
      else if (name.indexOf(':') >= 0) errs.push({ name: 'aname', msg: 'Account names can\'t include a colon (:)' });
      else if (S.accounts.some(function (a) { return a.name.toLowerCase() === name.toLowerCase() && (a.parent || null) === (parent || null) && (!a0 || a.id !== a0.id); })) errs.push({ name: 'aname', msg: 'Another account is already using this name. Please use a different name.' });
      if (dv(dd, 'asub') && !parent) errs.push({ name: 'aparent', msg: 'Select a parent account' });
      if (dv(dd, 'anum') && S.accounts.some(function (a) { return a.number === dv(dd, 'anum') && (!a0 || a.id !== a0.id); })) errs.push({ name: 'anum', msg: 'Another account is already using this number' });
      var ob = a0 ? 0 : r2(num(dv(dd, 'aob')));
      if (ob && !U.parseDate(dv(dd, 'aasof'))) errs.push({ name: 'aasof', msg: 'Enter a valid date (mm/dd/yyyy)' });
      if (drawerErrs(dd, errs)) return false;
      var rec = { name: name, type: ty, detail: dv(dd, 'adetail'), desc: dv(dd, 'adesc'), number: dv(dd, 'anum'), parent: parent || null };
      var a;
      if (a0) a = assign(a0, rec);
      else {
        a = assign({ id: U.uid('a'), target: null, active: true }, rec);
        S.accounts.push(a); S.acct[a.id] = a;
        if (ob && S.isBS(a)) {
          var debit = S.isDebit(a), amt = Math.abs(ob), pos = ob > 0;
          var dr = debit === pos;
          S.add({ type: 'Journal Entry', no: '', date: U.parseDate(dv(dd, 'aasof')), memo: 'Opening Balance', total: amt,
            lines: [{ acct: a.id, debit: dr ? amt : 0, credit: dr ? 0 : amt, desc: 'Opening Balance' }, { acct: 'a_obe', debit: dr ? 0 : amt, credit: dr ? amt : 0, desc: 'Opening Balance' }] }, true);
        }
      }
      S.changed('account');
      UI.toast(S.fullName(a.id) + (a0 ? ' updated' : ' saved'));
      if (opts.onSaved) later(function () { opts.onSaved(a); });
      return true;
    }
    later(function () { var e = d.querySelector('[name=aname]'); if (e) e.focus(); });
    return d;
  });
})();
