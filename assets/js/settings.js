/* ══════════════════════════════════════════════════════════
   Settings (settings.html): the technical side of an account, apart
   from learning (My profile) and from the Coach and Admin panels.
     Account       everyone: name, email, role, coach, member since
     Password      everyone: choose a new password
     Users         coaches: their team's accounts; admins: every account
     Coach teams   admins: which associates each coach supervises
   Users and Coach teams come from staff.js (SCStaff.settings).
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(t, bad) {
    var el = $('#stToast'); el.textContent = t; el.className = 'st-toast show' + (bad ? ' bad' : '');
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.className = 'st-toast'; }, 2600);
  }
  var ROLE = { associate: 'Associate', coach: 'Coach', admin: 'Admin' };

  var me = SCApp.requireAuth();
  if (!me) return;
  var sb;

  /* ─────────── Account ─────────── */
  function account() {
    var box = $('#secAccount');
    box.innerHTML = '<p class="st-muted">Loading…</p>';
    Promise.all([
      sb.from('profiles').select('full_name,app_role,created_at,assigned_role:sim_roles!profiles_assigned_role_id_fkey(title)').eq('id', me.id).single(),
      sb.from('coach_assignments').select('coach:profiles!coach_id(full_name)').eq('associate_id', me.id)
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      var p = r[0].data, coaches = (r[1].data || []).map(function (x) { return x.coach && x.coach.full_name; }).filter(Boolean);
      var since = new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      box.innerHTML = '<h2 class="tm-title">Account</h2>' +
        '<div class="set-card set-id"><span class="tm-av big" style="--h:195" aria-hidden="true">' + esc((p.full_name || '?').charAt(0).toUpperCase()) + '</span>' +
          '<div><b>' + esc(p.full_name) + '</b><small>' + esc(me.email) + '</small></div></div>' +
        '<dl class="set-card set-dl">' +
          '<dt>Role</dt><dd>' + ROLE[p.app_role] + '</dd>' +
          (p.app_role === 'associate' ? '<dt>Coach</dt><dd>' + (coaches.length ? esc(coaches.join(', ')) : '<span class="st-muted">No coach yet</span>') + '</dd>' : '') +
          (p.assigned_role ? '<dt>Main simulation</dt><dd>' + esc(p.assigned_role.title) + '</dd>' : '') +
          '<dt>Email</dt><dd>' + esc(me.email) + ' <small class="st-muted">To change it, ask your admin.</small></dd>' +
          '<dt>Member since</dt><dd>' + since + '</dd></dl>' +
        '<form class="set-card set-form" id="nameForm" novalidate><h3>Your name</h3><p class="st-muted">How it shows to your coach, in the panels and on your certificates.</p>' +
          '<label class="st-lbl">Full name<input class="st-input" id="setName" autocomplete="name" value="' + esc(p.full_name) + '"></label>' +
          '<button type="submit" class="st-btn" disabled>Save changes</button></form>';
      var input = $('#setName'), btn = $('#nameForm button');
      input.oninput = function () { btn.disabled = input.value.trim() === p.full_name || input.value.trim().length < 2; };
      $('#nameForm').onsubmit = function (e) {
        e.preventDefault();
        var name = input.value.trim().replace(/\s+/g, ' ');
        if (name.length < 2) return;
        btn.disabled = true; btn.textContent = 'Saving…';
        sb.from('profiles').update({ full_name: name }).eq('id', me.id).then(function (res) {
          btn.textContent = 'Save changes';
          if (res.error) { btn.disabled = false; toast(res.error.message, true); return; }
          return SCDB.refreshProfile().then(function () { toast('Your name was saved.'); SCApp.wireNav(); account(); });
        });
      };
    }).catch(function (e) { box.innerHTML = '<p class="st-empty">Could not load: ' + esc(e.message) + '</p>'; });
  }

  /* ─────────── Password ─────────── */
  function password() {
    var box = $('#secPassword');
    box.innerHTML = '<h2 class="tm-title">Password</h2>' +
      '<form class="set-card set-form" id="passForm" novalidate>' +
        '<p class="st-muted">If your admin or coach gave you a password, choose your own here. Use at least 8 characters; a short sentence is easy to remember and hard to guess.</p>' +
        '<label class="st-lbl">New password<input class="st-input" type="password" id="newPass" autocomplete="new-password" minlength="8"></label>' +
        '<label class="st-lbl">Type it again<input class="st-input" type="password" id="newPass2" autocomplete="new-password" minlength="8"></label>' +
        '<p class="cu-err" id="passErr" role="alert" hidden></p>' +
        '<button type="submit" class="st-btn">Save the new password</button></form>';
    $('#passForm').onsubmit = function (e) {
      e.preventDefault();
      var a = $('#newPass'), b = $('#newPass2'), err = $('#passErr'), btn = $('#passForm button');
      function bad(t) { err.textContent = t; err.hidden = false; }
      err.hidden = true;
      if (a.value.length < 8) return bad('Use at least 8 characters.');
      if (a.value !== b.value) return bad('The two passwords do not match.');
      btn.disabled = true; btn.textContent = 'Saving…';
      SCDB.changePassword(a.value).then(function () {
        a.value = b.value = ''; toast('Your password was changed. Use it the next time you sign in.');
      }, function (e2) { bad(e2.message || 'Could not change it. Try again.'); })
        .then(function () { btn.disabled = false; btn.textContent = 'Save the new password'; });
    };
  }

  /* ─────────── sections ─────────── */
  SCDB.ready.then(function (p) {
    if (!p) { location.href = SCApp.loginUrl('settings.html'); return; }
    me = p; sb = SCDB.client;
    var staff = p.role === 'admin' || p.role === 'coach';
    var S = staff ? SCStaff.settings(p.role, p) : null;
    var SECTIONS = { account: account, password: password };
    if (staff) SECTIONS.users = S.users;
    if (p.role === 'admin') SECTIONS.teams = S.teams;
    $$('[data-staff]').forEach(function (el) { el.hidden = !staff; });
    $$('.set-nav [data-sec]').forEach(function (a) { a.hidden = !SECTIONS[a.dataset.sec]; });
    if (p.role === 'coach') $('.set-nav [data-sec="users"]').textContent = 'My team';
    var current = null;
    function go(sec) {
      if (!SECTIONS[sec]) sec = 'account';
      if (sec === current) return;
      if (S && current && !S.leaveOk()) { history.replaceState(null, '', '#' + current); return; }
      current = sec;
      $$('.set-nav [data-sec]').forEach(function (a) { var on = a.dataset.sec === sec; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      $$('.set-panel').forEach(function (el) { el.hidden = el.dataset.sec !== sec; });
      SECTIONS[sec]();
      try { history.replaceState(null, '', '#' + sec); } catch (e) {}
    }
    window.addEventListener('hashchange', function () { go(location.hash.slice(1)); });
    $$('.set-nav [data-sec]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); go(a.dataset.sec); }; });
    go(location.hash.slice(1));
  });
})();
