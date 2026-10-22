/* ══════════════════════════════════════════════════════════
   Staff panels: coach.html (supervisor) and admin.html.
   Everything comes from Supabase; row level security decides what each
   person sees (a coach: the associates assigned to them; an admin: all).
     Progress       general progress of each associate, item by item
     Emails         the inbox to grade (coaches grade their associates)
     Assign         admin and coach: trainings and simulations per associate
     People         admin: roles and the main simulation
     Permissions    admin: coach teams (which associates each coach supervises)
     Simulations    admin: which simulations are open to everyone
     Announcements  admin: send a notification to the team
   SCStaff.init({ mode: 'coach' | 'admin' })
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function day(iso) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; }
  function bar(p) { return '<div class="st-bar"><i style="width:' + (p || 0) + '%"></i></div>'; }
  var LABEL = { introduction: 'Introduction', training: 'Trainings', simulation: 'Simulations' };
  var sb, me, mode;

  function toast(t, bad, undo) {
    var el = $('#stToast'); el.textContent = t; el.className = 'st-toast show' + (bad ? ' bad' : '') + (undo ? ' act' : '');
    if (undo) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Undo';
      b.onclick = function () { el.className = 'st-toast'; undo(); };
      el.appendChild(b);
    }
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.className = 'st-toast'; }, undo ? 6000 : 2600);
  }
  function check(r) { if (r && r.error) throw r.error; return r ? r.data : null; }

  /* ─────────── Progress ─────────── */
  function renderProgress() {
    var box = $('#tabProgress');
    box.innerHTML = '<p class="st-muted">Loading…</p>';
    return Promise.all([
      sb.from('profiles').select('id,full_name,app_role').eq('app_role', 'associate').order('full_name'),
      sb.from('progress_summary').select('user_id,category,items,completed_items,percent,last_activity_at')
    ]).then(function (r) {
      var people = check(r[0]), sum = check(r[1]);
      if (mode === 'coach') people = people.filter(function (p) { return p.id !== me.id; });
      if (!people.length) { box.innerHTML = '<p class="st-empty">' + (mode === 'coach' ? 'No associates are assigned to you yet. Your admin assigns them.' : 'No associates yet.') + '</p>'; return; }
      function cell(uid, cat) {
        var x = sum.filter(function (s) { return s.user_id === uid && s.category === cat; })[0];
        return x ? '<div class="st-cell">' + bar(x.percent) + '<span>' + x.completed_items + '/' + x.items + '</span></div>' : '<span class="st-muted">None</span>';
      }
      box.innerHTML = '<table class="st-table"><thead><tr><th>Associate</th><th>Overall</th><th>Introduction</th><th>Trainings</th><th>Simulations</th><th>Last activity</th></tr></thead><tbody>' +
        people.map(function (p) {
          var all = sum.filter(function (s) { return s.user_id === p.id && !s.category; })[0] || { percent: 0 };
          return '<tr class="st-row" data-uid="' + p.id + '"><td class="nm">' + esc(p.full_name) + '</td><td><b class="st-pct">' + all.percent + '%</b></td>' +
            '<td>' + cell(p.id, 'introduction') + '</td><td>' + cell(p.id, 'training') + '</td><td>' + cell(p.id, 'simulation') + '</td>' +
            '<td>' + (all.last_activity_at ? day(all.last_activity_at) : '<span class="st-muted">No activity</span>') + '</td></tr>' +
            '<tr class="st-detail" data-for="' + p.id + '" hidden><td colspan="6"></td></tr>';
        }).join('') + '</tbody></table>';
      $$('.st-row', box).forEach(function (row) {
        row.onclick = function () {
          var d = $('.st-detail[data-for="' + row.dataset.uid + '"]', box), open = d.hidden;
          $$('.st-detail', box).forEach(function (x) { x.hidden = true; });
          if (!open) return;
          d.hidden = false; d.firstChild.innerHTML = '<p class="st-muted">Loading…</p>';
          sb.from('progress_items').select('category,title,percent,completed,last_activity_at').eq('user_id', row.dataset.uid).then(function (res) {
            var items = check(res);
            d.firstChild.innerHTML = items.length ? '<div class="st-items">' + items.map(function (i) {
              return '<div><em>' + LABEL[i.category] + '</em><span>' + esc(i.title) + '</span>' + bar(i.percent) + '<b>' + (i.completed ? '&#10003;' : i.percent + '%') + '</b></div>';
            }).join('') + '</div>' : '<p class="st-muted">Nothing assigned yet.</p>';
          });
        };
      });
    }).catch(function (e) { box.innerHTML = '<p class="st-empty">Could not load: ' + esc(e.message) + '</p>'; });
  }

  /* ─────────── Emails ─────────── */
  var emailFilter = 'pending';
  function renderEmails() {
    var box = $('#tabEmails');
    box.innerHTML = '<div class="st-seg"><button data-f="pending">To grade</button><button data-f="graded">Graded</button></div><div id="stInbox"><p class="st-muted">Loading…</p></div>';
    $$('.st-seg button', box).forEach(function (b) { b.classList.toggle('on', b.dataset.f === emailFilter); b.onclick = function () { emailFilter = b.dataset.f; renderEmails(); }; });
    return sb.from('email_submissions')
      .select('id,user_id,body,submitted_at,author:profiles!user_id(full_name),scenario:email_scenarios(prompt,max_score,role:sim_roles(title)),grade:email_grades(score,feedback,graded_at,grader:profiles!grader_id(full_name))')
      .order('submitted_at', { ascending: false })
      .then(function (r) {
        var subs = check(r).map(function (s) { s.g = Array.isArray(s.grade) ? s.grade[0] : s.grade; return s; })
          .filter(function (s) { return s.user_id !== me.id && (emailFilter === 'graded' ? !!s.g : !s.g); });
        var el = $('#stInbox');
        if (!subs.length) { el.innerHTML = '<p class="st-empty">' + (emailFilter === 'pending' ? 'Nothing to grade right now.' : 'No graded emails yet.') + '</p>'; return; }
        el.innerHTML = subs.map(function (s) {
          var max = s.scenario.max_score, head = '<div class="st-meta"><b>' + esc(s.author ? s.author.full_name : 'Associate') + '</b><span>' + esc(s.scenario.role.title) + '</span><span>' + day(s.submitted_at) + '</span>' +
            (s.g ? '<span class="st-tag">Graded ' + s.g.score + '/' + max + (s.g.grader ? ' by ' + esc(s.g.grader.full_name) : '') + '</span>' : '') + '</div>';
          var body = '<p class="st-scn">' + esc(s.scenario.prompt) + '</p><div class="st-email">' + esc(s.body) + '</div>';
          if (s.g) return '<div class="st-card">' + head + body + (s.g.feedback ? '<div class="st-fb"><b>Feedback</b><p>' + esc(s.g.feedback) + '</p></div>' : '') + '</div>';
          var stars = ''; for (var n = 1; n <= max; n++) stars += '<button type="button" class="st-star" data-n="' + n + '" aria-label="' + n + ' of ' + max + '">&#9733;</button>';
          return '<div class="st-card" data-id="' + s.id + '">' + head + body + '<div class="st-stars" data-score="0">' + stars + '</div>' +
            '<textarea class="st-input" rows="3" placeholder="Feedback: what worked, what to improve"></textarea><button class="st-btn" disabled>Submit grade</button></div>';
        }).join('');
        $$('.st-card[data-id]', el).forEach(function (card) {
          var row = $('.st-stars', card), btn = $('.st-btn', card);
          $$('.st-star', row).forEach(function (st) {
            st.onclick = function () { row.dataset.score = st.dataset.n; $$('.st-star', row).forEach(function (x) { x.classList.toggle('on', +x.dataset.n <= +st.dataset.n); }); btn.disabled = false; };
          });
          btn.onclick = function () {
            var fb = $('textarea', card).value.trim();
            if (!fb) { $('textarea', card).focus(); toast('Add a short feedback before grading.', true); return; }
            btn.disabled = true;
            sb.from('email_grades').insert({ submission_id: +card.dataset.id, grader_id: me.id, score: +row.dataset.score, feedback: fb }).then(function (res) {
              if (res.error) { btn.disabled = false; toast(res.error.message, true); return; }
              toast('Grade saved. The associate was notified.'); renderEmails();
            });
          };
        });
      }).catch(function (e) { $('#stInbox').innerHTML = '<p class="st-empty">Could not load: ' + esc(e.message) + '</p>'; });
  }

  /* ─────────── People (admin): roles ─────────── */
  function renderPeople() {
    var box = $('#tabPeople');
    box.innerHTML = '<p class="st-muted">Loading…</p>';
    return Promise.all([
      sb.rpc('admin_people'),
      sb.from('sim_roles').select('id,slug,title').eq('is_active', true).order('position')
    ]).then(function (r) {
      var people = check(r[0]), roles = check(r[1]);
      box.innerHTML = '<p class="st-muted" style="margin-bottom:12px">' + people.length + ' people. Change a role or the main simulation here; coaches go in Permissions, trainings and simulations in Assign. New accounts are created from the sign in page.</p>' +
        '<div class="st-people">' + people.map(function (p) {
          return '<div class="st-person st-flat" data-id="' + p.id + '"><div class="st-ph"><span class="st-av">' + esc((p.full_name || '?').charAt(0)) + '</span>' +
            '<span class="st-who"><b>' + esc(p.full_name) + '</b><small>' + esc(p.email) + (p.last_sign_in_at ? ' · last sign in ' + day(p.last_sign_in_at) : '') + '</small></span>' +
            '<select data-k="role" aria-label="Role">' + ['associate', 'coach', 'admin'].map(function (x) { return '<option' + (x === p.app_role ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
            '<select data-k="assigned" aria-label="Main simulation"><option value="">No main simulation</option>' + roles.map(function (x) { return '<option value="' + x.id + '"' + (x.slug === p.assigned_role ? ' selected' : '') + '>' + esc(x.title) + '</option>'; }).join('') + '</select></div></div>';
        }).join('') + '</div>';
      $$('.st-person', box).forEach(function (el) {
        var id = el.dataset.id;
        function save() {
          var role = $('[data-k="role"]', el).value, assigned = $('[data-k="assigned"]', el).value;
          if (id === me.id && role !== 'admin') { toast('You cannot remove your own admin role.', true); $('[data-k="role"]', el).value = 'admin'; return; }
          sb.rpc('set_profile_access', { target: id, new_role: role, new_assigned_role: assigned ? +assigned : null }).then(function (res) {
            if (res.error) { toast(res.error.message, true); return; }
            toast('Saved.');
          });
        }
        $('[data-k="role"]', el).onchange = save;
        $('[data-k="assigned"]', el).onchange = save;
      });
    }).catch(function (e) { box.innerHTML = '<p class="st-empty">Could not load: ' + esc(e.message) + '</p>'; });
  }

  /* ─────────── Permissions (admin): coach teams ───────────
     Master and detail: coaches on the left, the selected coach's team on
     the right. "Without a coach" lists the associates nobody supervises. */
  var team = { pick: null, adding: false, q: '', onlyFree: false, sel: {} };
  function initials(n) { var w = String(n || '?').trim().split(/\s+/); return esc(((w[0] || '?').charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : '')).toUpperCase()); }
  function hue(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return h; }
  function avatar(p, cls) { return '<span class="tm-av' + (cls ? ' ' + cls : '') + '" style="--h:' + hue(p.id) + '" aria-hidden="true">' + initials(p.full_name) + '</span>'; }
  function coachesOf(id) { return team.links.filter(function (l) { return l.associate_id === id; }).map(function (l) { return l.coach_id; }); }
  function teamOf(id) { return team.links.filter(function (l) { return l.coach_id === id; }).map(function (l) { return l.associate_id; }); }
  function noCoach() { return team.assoc.filter(function (x) { return !coachesOf(x.id).length; }); }
  function byName(x, y) { return String(x.full_name).localeCompare(String(y.full_name)); }
  function first(p) { return esc(String(p.full_name || '').split(' ')[0]); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function pct(id) { var v = team.pct[id] || 0; return '<span class="tm-pct" title="General progress">' + bar(v) + '<b>' + v + '%</b></span>'; }
  function who(p) { return '<span class="tm-who"><b>' + esc(p.full_name) + '</b><small>' + esc(p.email || '') + '</small></span>'; }

  function renderPermissions() {
    var box = $('#tabPerms');
    box.innerHTML = '<p class="st-muted">Loading…</p>';
    return Promise.all([
      sb.rpc('admin_people'),
      sb.from('coach_assignments').select('coach_id,associate_id'),
      sb.from('progress_summary').select('user_id,percent').is('category', null)
    ]).then(function (r) {
      var people = check(r[0]);
      team.links = check(r[1]);
      team.pct = {}; check(r[2]).forEach(function (x) { team.pct[x.user_id] = x.percent || 0; });
      team.coaches = people.filter(function (x) { return x.app_role === 'coach'; }).sort(byName);
      team.assoc = people.filter(function (x) { return x.app_role === 'associate'; }).sort(byName);
      team.byId = {}; people.forEach(function (x) { team.byId[x.id] = x; });
      if (!team.pick || (team.pick !== 'none' && !team.byId[team.pick])) team.pick = team.coaches.length ? team.coaches[0].id : 'none';
      drawTeams();
    }).catch(function (e) { box.innerHTML = '<p class="st-empty">Could not load: ' + esc(e.message) + '</p>'; });
  }

  function drawTeams() {
    var box = $('#tabPerms'), free = noCoach();
    var kpis = '<div class="tm-kpis">' +
      '<div class="tm-kpi"><b>' + team.coaches.length + '</b><span>Coaches</span></div>' +
      '<div class="tm-kpi"><b>' + team.assoc.length + '</b><span>Associates</span></div>' +
      '<button type="button" class="tm-kpi' + (free.length ? ' warn' : ' ok') + '" data-pick="none"><b>' + free.length + '</b><span>Without a coach</span></button></div>';
    var side = '<aside class="tm-side" aria-label="Coaches">' +
      '<div class="tm-sideh">Coaches <span>' + team.coaches.length + '</span></div>' +
      (team.coaches.length > 5 ? '<input class="tm-search" id="tmCoachQ" type="search" placeholder="Find a coach" aria-label="Find a coach">' : '') +
      '<nav class="tm-nav">' + (team.coaches.length ? team.coaches.map(function (c) {
        var n = teamOf(c.id).length;
        return '<button type="button" class="tm-item' + (team.pick === c.id ? ' on' : '') + '" data-pick="' + c.id + '" data-name="' + esc(String(c.full_name + ' ' + c.email).toLowerCase()) + '"' + (team.pick === c.id ? ' aria-current="true"' : '') + '>' +
          avatar(c) + '<span class="tm-who"><b>' + esc(c.full_name) + '</b><small>' + plural(n, 'associate') + '</small></span></button>';
      }).join('') : '<p class="tm-none">No coaches yet.</p>') + '</nav>' +
      '<div class="tm-sideh">Needs attention</div>' +
      '<button type="button" class="tm-item' + (team.pick === 'none' ? ' on' : '') + '" data-pick="none">' +
        '<span class="tm-av ' + (free.length ? 'warn' : 'ok') + '" aria-hidden="true">' + (free.length ? '!' : '&#10003;') + '</span>' +
        '<span class="tm-who"><b>Without a coach</b><small>' + plural(free.length, 'associate') + '</small></span></button></aside>';
    var matrix = '<details class="tm-roles"><summary>What each role can do</summary><table class="st-table st-ptable"><thead><tr><th>Can…</th><th>Associate</th><th>Coach</th><th>Admin</th></tr></thead><tbody>' +
      [['Take the Introduction, assigned trainings and simulations', 1, 1, 1],
       ['See their own progress, certificates and grades', 1, 1, 1],
       ['See the progress of associates', 0, 'Own team', 'Everyone'],
       ['Grade emails', 0, 'Own team', 'Everyone'],
       ['Assign trainings (paths) and simulations', 0, 'Own team', 'Everyone'],
       ['Build coach teams', 0, 0, 1],
       ['Change roles, open or close simulations, send announcements', 0, 0, 1]].map(function (row) {
        return '<tr><td>' + row[0] + '</td>' + row.slice(1).map(function (v) { return '<td>' + (v === 1 ? '<b class="st-yes">&#10003;</b>' : v === 0 ? '<span class="st-no">&#8212;</span>' : '<b class="st-yes">' + v + '</b>') + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></details>';
    box.innerHTML = '<div class="tm-top"><div><h2 class="tm-title">Coach teams</h2><p class="st-muted">Choose which associates each coach supervises. A coach sees their team\'s progress, grades their emails and assigns them trainings and simulations. An associate can have more than one coach.</p></div></div>' +
      kpis + '<div class="tm">' + side + '<section class="tm-main" aria-live="polite">' + drawMain() + '</section></div>' + matrix;
    bindTeams(box);
  }

  function drawMain() {
    if (!team.coaches.length) {
      return '<div class="tm-empty"><span class="tm-av big" style="--h:190" aria-hidden="true">+</span><h3>Make your first coach</h3>' +
        '<p>Coaches are people with the coach role. Give someone that role in People, then build their team here.</p><button type="button" class="st-btn" data-act="people">Go to People</button></div>';
    }
    if (team.pick === 'none') {
      var free = noCoach();
      return '<header class="tm-head"><span class="tm-av big ' + (free.length ? 'warn' : 'ok') + '" aria-hidden="true">' + (free.length ? '!' : '&#10003;') + '</span><div class="tm-hd"><h3>Without a coach</h3>' +
        '<p>' + (free.length ? 'Nobody follows the progress of these associates or grades their emails yet. Pick a coach for each one.' : 'Every associate has a coach.') + '</p></div></header>' +
        (free.length ? '<ul class="tm-list">' + free.map(function (x) {
          return '<li class="tm-row">' + avatar(x) + who(x) + pct(x.id) +
            '<select class="tm-sel" data-assign="' + x.id + '" aria-label="Assign ' + esc(x.full_name) + ' to a coach"><option value="">Assign to a coach…</option>' +
            team.coaches.map(function (c) { return '<option value="' + c.id + '">' + esc(c.full_name) + '</option>'; }).join('') + '</select></li>';
        }).join('') + '</ul>' : '');
    }
    var c = team.byId[team.pick];
    var members = teamOf(c.id).map(function (id) { return team.byId[id]; }).filter(Boolean).sort(byName);
    var avg = members.length ? Math.round(members.reduce(function (t, x) { return t + (team.pct[x.id] || 0); }, 0) / members.length) : null;
    var html = '<header class="tm-head">' + avatar(c, 'big') + '<div class="tm-hd"><h3>' + esc(c.full_name) + '</h3><p>' + esc(c.email) + '</p>' +
      '<div class="tm-stats"><span><b>' + members.length + '</b> on the team</span>' + (avg == null ? '' : '<span><b>' + avg + '%</b> average progress</span>') + '</div></div>' +
      (team.adding ? '' : '<button type="button" class="st-btn tm-addbtn" data-act="add">+ Add associates</button>') + '</header>';
    if (team.adding) html += drawAdd(c);
    html += '<div class="tm-sech"><h4>Team</h4><span>' + members.length + '</span></div>';
    if (!members.length) {
      html += '<div class="tm-empty sm"><p>No associates on ' + first(c) + '\'s team yet.</p>' + (team.adding ? '' : '<button type="button" class="tm-link" data-act="add">Add associates</button>') + '</div>';
    } else {
      html += '<ul class="tm-list">' + members.map(function (x) {
        var others = coachesOf(x.id).filter(function (id) { return id !== c.id && team.byId[id]; });
        return '<li class="tm-row">' + avatar(x) + who(x) +
          '<span class="tm-chips">' + others.map(function (id) { return '<span class="tm-chip">Also with ' + first(team.byId[id]) + '</span>'; }).join('') + '</span>' +
          pct(x.id) + '<button type="button" class="tm-x" data-rm="' + x.id + '" aria-label="Remove ' + esc(x.full_name) + ' from this team">Remove</button></li>';
      }).join('') + '</ul>';
    }
    return html;
  }

  function drawAdd(c) {
    var n = Object.keys(team.sel).length;
    return '<div class="tm-add" role="group" aria-label="Add associates"><div class="tm-addh"><b>Add associates to ' + first(c) + '\'s team</b><button type="button" class="tm-close" data-act="close" aria-label="Close">&times;</button></div>' +
      '<div class="tm-tools"><input class="tm-search" id="tmAddQ" type="search" placeholder="Search by name or email" aria-label="Search associates" value="' + esc(team.q) + '">' +
      '<label class="tm-toggle"><input type="checkbox" id="tmFree"' + (team.onlyFree ? ' checked' : '') + '> Only without a coach</label></div>' +
      '<ul class="tm-list tm-pick" id="tmPick">' + drawPick(c) + '</ul>' +
      '<div class="tm-addf"><button type="button" class="tm-link" data-act="allfree">Select everyone without a coach</button><span class="tm-count" id="tmSel">' + n + ' selected</span>' +
      '<button type="button" class="tm-ghost" data-act="close">Cancel</button><button type="button" class="st-btn" data-act="save"' + (n ? '' : ' disabled') + '>Add to team</button></div></div>';
  }

  function candidates(c) {
    var mine = teamOf(c.id), q = team.q.toLowerCase();
    return team.assoc.filter(function (x) {
      if (mine.indexOf(x.id) > -1) return false;
      if (team.onlyFree && coachesOf(x.id).length) return false;
      return !q || (x.full_name + ' ' + x.email).toLowerCase().indexOf(q) > -1;
    });
  }
  function drawPick(c) {
    var list = candidates(c);
    if (!list.length) return '<li class="tm-none">' + (team.q || team.onlyFree ? 'Nobody matches.' : 'Every associate is already on this team.') + '</li>';
    return list.map(function (x) {
      var cs = coachesOf(x.id).filter(function (id) { return team.byId[id]; });
      return '<li><label class="tm-row tm-pickrow"><input type="checkbox" data-pick-id="' + x.id + '"' + (team.sel[x.id] ? ' checked' : '') + '>' + avatar(x) + who(x) +
        '<span class="tm-chips">' + (cs.length ? '<span class="tm-chip">With ' + cs.map(function (id) { return first(team.byId[id]); }).join(', ') + '</span>' : '<span class="tm-chip warn">No coach</span>') + '</span>' +
        pct(x.id) + '</label></li>';
    }).join('');
  }

  function bindTeams(box) {
    function pick(id) { team.pick = id; team.adding = false; team.sel = {}; team.q = ''; drawTeams(); }
    $$('[data-pick]', box).forEach(function (el) { el.onclick = function () { pick(el.dataset.pick); }; });
    var cq = $('#tmCoachQ', box);
    if (cq) cq.oninput = function () {
      var q = cq.value.toLowerCase();
      $$('.tm-nav .tm-item', box).forEach(function (el) { el.hidden = el.dataset.name.indexOf(q) < 0; });
    };
    var main = $('.tm-main', box), c = team.byId[team.pick];
    function syncSel() {
      var n = Object.keys(team.sel).length;
      $('#tmSel', box).textContent = n + ' selected';
      $('[data-act="save"]', box).disabled = !n;
    }
    function bindPick() {
      $$('[data-pick-id]', box).forEach(function (cb) {
        cb.onchange = function () { if (cb.checked) team.sel[cb.dataset.pickId] = 1; else delete team.sel[cb.dataset.pickId]; syncSel(); };
      });
    }
    bindPick();
    var aq = $('#tmAddQ', box);
    if (aq) {
      aq.oninput = function () { team.q = aq.value; $('#tmPick', box).innerHTML = drawPick(c); bindPick(); };
      $('#tmFree', box).onchange = function () { team.onlyFree = this.checked; $('#tmPick', box).innerHTML = drawPick(c); bindPick(); };
      aq.focus();
    }
    main.onclick = function (e) {
      var t = e.target.closest('[data-act],[data-rm]');
      if (!t) return;
      var act = t.dataset.act;
      if (act === 'people') { show('people'); return; }
      if (act === 'add') { team.adding = true; drawTeams(); return; }
      if (act === 'close') { team.adding = false; team.sel = {}; team.q = ''; drawTeams(); return; }
      if (act === 'allfree') {
        candidates(c).forEach(function (x) { if (!coachesOf(x.id).length) team.sel[x.id] = 1; });
        $('#tmPick', box).innerHTML = drawPick(c); bindPick(); syncSel(); return;
      }
      if (act === 'save') {
        var ids = Object.keys(team.sel);
        t.disabled = true; t.textContent = 'Adding…';
        Promise.all(ids.map(function (id) { return sb.rpc('assign_coach', { coach: c.id, associate: id }).then(function (res) { if (res.error) throw res.error; return id; }); }))
          .then(function () {
            ids.forEach(function (id) { team.links.push({ coach_id: c.id, associate_id: id }); });
            team.adding = false; team.sel = {}; team.q = '';
            drawTeams();
            toast(plural(ids.length, 'associate') + ' added to ' + team.byId[c.id].full_name.split(' ')[0] + '\'s team. Everyone was notified.');
          })
          .catch(function (err) { toast(err.message, true); renderPermissions(); });
        return;
      }
      if (t.dataset.rm) {
        var aid = t.dataset.rm, x = team.byId[aid];
        t.disabled = true;
        sb.from('coach_assignments').delete().eq('coach_id', c.id).eq('associate_id', aid).then(function (res) {
          if (res.error) { t.disabled = false; toast(res.error.message, true); return; }
          team.links = team.links.filter(function (l) { return !(l.coach_id === c.id && l.associate_id === aid); });
          drawTeams();
          toast(x.full_name + ' was removed from the team.', false, function () {
            sb.rpc('assign_coach', { coach: c.id, associate: aid }).then(function (r2) {
              if (r2.error) { toast(r2.error.message, true); return; }
              team.links.push({ coach_id: c.id, associate_id: aid });
              drawTeams(); toast('Undone.');
            });
          });
        });
      }
    };
    $$('[data-assign]', box).forEach(function (sel) {
      sel.onchange = function () {
        var coach = sel.value, aid = sel.dataset.assign;
        if (!coach) return;
        sel.disabled = true;
        sb.rpc('assign_coach', { coach: coach, associate: aid }).then(function (res) {
          if (res.error) { sel.disabled = false; sel.value = ''; toast(res.error.message, true); return; }
          team.links.push({ coach_id: coach, associate_id: aid });
          drawTeams();
          toast(team.byId[aid].full_name + ' is now on ' + team.byId[coach].full_name.split(' ')[0] + '\'s team.');
        });
      };
    });
  }

  /* ─────────── Assign (admin and coach): trainings and simulations ─────────── */
  function renderAssign() {
    var box = $('#tabAssign');
    box.innerHTML = '<p class="st-muted">Loading…</p>';
    var peopleQ = mode === 'admin'
      ? sb.rpc('admin_people').then(function (r) { return check(r).filter(function (p) { return p.app_role === 'associate'; }); })
      : sb.from('coach_assignments').select('associate:profiles!associate_id(id,full_name)').eq('coach_id', me.id)
          .then(function (r) { return check(r).map(function (x) { return x.associate; }).filter(Boolean); });
    return Promise.all([
      peopleQ,
      sb.from('courses').select('id,title,is_open,department:departments(name)').order('id'),
      sb.from('sim_roles').select('id,title,is_open').eq('is_active', true).order('position'),
      sb.from('course_assignments').select('associate_id,course_id'),
      sb.from('simulation_assignments').select('associate_id,role_id')
    ]).then(function (r) {
      var people = r[0], courses = check(r[1]).filter(function (c) { return !c.is_open; }), sims = check(r[2]), ca = check(r[3]), sa = check(r[4]);
      var closed = sims.filter(function (x) { return !x.is_open; }), open = sims.filter(function (x) { return x.is_open; });
      if (!people.length) { box.innerHTML = '<p class="st-empty">' + (mode === 'coach' ? 'No associates are assigned to you yet. Your admin assigns them in Permissions.' : 'No associates yet.') + '</p>'; return; }
      box.innerHTML = '<p class="st-muted" style="margin-bottom:12px">' + (mode === 'coach' ? 'Your associates. ' : '') + 'Open an associate to give them trainings (paths) and simulations. They get a notification, and their progress counts what they have. The Introduction comes first for everyone.</p>' +
        '<div class="st-people">' + people.map(function (p) {
          var myC = ca.filter(function (x) { return x.associate_id === p.id; }).map(function (x) { return x.course_id; });
          var myS = sa.filter(function (x) { return x.associate_id === p.id; }).map(function (x) { return x.role_id; });
          return '<div class="st-person" data-id="' + p.id + '"><button class="st-ph" type="button"><span class="st-av">' + esc((p.full_name || '?').charAt(0)) + '</span><span class="st-who"><b>' + esc(p.full_name) + '</b>' + (p.email ? '<small>' + esc(p.email) + '</small>' : '') + '</span>' +
            '<span class="st-sub" data-count>' + myC.length + ' training' + (myC.length === 1 ? '' : 's') + '</span><span class="st-chev"></span></button>' +
            '<div class="st-pb" hidden><h4>Trainings (paths)</h4><div class="st-checks">' + courses.map(function (c) {
              return '<label><input type="checkbox" data-course="' + c.id + '"' + (myC.indexOf(c.id) > -1 ? ' checked' : '') + '> ' + esc(c.title) + ' <small>' + esc(c.department.name) + '</small></label>';
            }).join('') + '</div>' +
            '<h4>Simulations</h4>' + (closed.length ? '<div class="st-checks">' + closed.map(function (x) {
              return '<label><input type="checkbox" data-sim="' + x.id + '"' + (myS.indexOf(x.id) > -1 ? ' checked' : '') + '> ' + esc(x.title) + '</label>';
            }).join('') + '</div>' : '') +
            (open.length ? '<p class="st-muted">Open to everyone: ' + open.map(function (x) { return esc(x.title); }).join(', ') + '.' + (mode === 'admin' ? ' Close one in the Simulations tab to assign it per person.' : '') + '</p>' : '') +
            '</div></div>';
        }).join('') + '</div>';
      $$('.st-person[data-id]', box).forEach(function (el) {
        var id = el.dataset.id;
        $('.st-ph', el).onclick = function () { $('.st-pb', el).hidden = !$('.st-pb', el).hidden; el.classList.toggle('open'); };
        $$('[data-course]', el).forEach(function (cb) {
          cb.onchange = function () {
            var q = cb.checked ? sb.rpc('assign_course', { associate: id, course: +cb.dataset.course, due: null })
              : sb.rpc('unassign_course', { associate: id, course: +cb.dataset.course });
            q.then(function (res) {
              if (res.error) { cb.checked = !cb.checked; toast(res.error.message, true); return; }
              var n = $$('[data-course]:checked', el).length;
              $('[data-count]', el).textContent = n + ' training' + (n === 1 ? '' : 's');
              toast(cb.checked ? 'Training assigned. A notification was sent.' : 'Training removed.');
            });
          };
        });
        $$('[data-sim]', el).forEach(function (cb) {
          cb.onchange = function () {
            var q = cb.checked ? sb.rpc('assign_simulation', { associate: id, role: +cb.dataset.sim })
              : sb.rpc('unassign_simulation', { associate: id, role: +cb.dataset.sim });
            q.then(function (res) { if (res.error) { cb.checked = !cb.checked; toast(res.error.message, true); } else toast(cb.checked ? 'Simulation assigned. A notification was sent.' : 'Simulation removed.'); });
          };
        });
      });
    }).catch(function (e) { box.innerHTML = '<p class="st-empty">Could not load: ' + esc(e.message) + '</p>'; });
  }

  /* ─────────── Simulations (admin) ─────────── */
  function renderSims() {
    var box = $('#tabSims');
    box.innerHTML = '<p class="st-muted">Loading…</p>';
    return sb.from('sim_roles').select('id,title,is_open,is_active').eq('is_active', true).order('position').then(function (r) {
      var roles = check(r);
      box.innerHTML = '<p class="st-muted" style="margin-bottom:12px">Open simulations are available to everyone. Close one to give it only to the associates you assign in People.</p>' +
        '<div class="st-people">' + roles.map(function (x) {
          return '<label class="st-sim"><span><b>' + esc(x.title) + '</b><small>' + (x.is_open ? 'Open to everyone' : 'Only assigned associates') + '</small></span>' +
            '<input type="checkbox" class="st-switch" data-id="' + x.id + '"' + (x.is_open ? ' checked' : '') + ' aria-label="Open to everyone"></label>';
        }).join('') + '</div>';
      $$('.st-switch', box).forEach(function (cb) {
        cb.onchange = function () {
          sb.from('sim_roles').update({ is_open: cb.checked }).eq('id', +cb.dataset.id).then(function (res) {
            if (res.error) { cb.checked = !cb.checked; toast(res.error.message, true); return; }
            toast(cb.checked ? 'Open to everyone.' : 'Closed: assign it per person.'); renderSims();
          });
        };
      });
    });
  }

  /* ─────────── Announcements (admin) ─────────── */
  function renderAnnounce() {
    var box = $('#tabAnnounce');
    box.innerHTML = '<div class="st-card"><label class="st-lbl">Message<textarea class="st-input" id="stMsg" rows="4" maxlength="500" placeholder="For example: New Asana training is live. Check your Paths."></textarea></label>' +
      '<label class="st-lbl">Send to<select id="stTo" class="st-input"><option value="associate">All associates</option><option value="all">Everyone (associates, coaches and admins)</option></select></label>' +
      '<button class="st-btn" id="stSend">Send announcement</button></div>';
    $('#stSend').onclick = function () {
      var msg = $('#stMsg').value.trim(), to = $('#stTo').value;
      if (!msg) { toast('Write the message first.', true); return; }
      $('#stSend').disabled = true;
      sb.rpc('admin_people').then(function (r) {
        var rows = check(r).filter(function (p) { return to === 'all' || p.app_role === 'associate'; })
          .map(function (p) { return { recipient_id: p.id, type: 'announcement', message: msg }; });
        if (!rows.length) throw new Error('Nobody to send it to yet.');
        return sb.from('notifications').insert(rows).then(function (res) { if (res.error) throw res.error; return rows.length; });
      }).then(function (n) { toast('Sent to ' + n + (n === 1 ? ' person.' : ' people.')); $('#stMsg').value = ''; })
        .catch(function (e) { toast(e.message, true); })
        .then(function () { $('#stSend').disabled = false; });
    };
  }

  var TABS = { progress: renderProgress, emails: renderEmails, assign: renderAssign, people: renderPeople, perms: renderPermissions, sims: renderSims, announce: renderAnnounce };
  function show(t) {
    $$('.st-tabs button').forEach(function (b) { var on = b.dataset.tab === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $$('.st-panel').forEach(function (p) { p.hidden = p.dataset.tab !== t; });
    TABS[t]();
    try { history.replaceState(null, '', '#' + t); } catch (e) {}
  }

  function init(opts) {
    mode = opts.mode;
    me = SCApp.requireAuth(mode === 'admin' ? { adminOnly: true } : { staffOnly: true });
    if (!me) return;
    SCDB.ready.then(function (p) {
      if (!p) { location.href = SCApp.loginUrl(location.pathname.split('/').pop()); return; }
      me = p; sb = SCDB.client;
      if (mode === 'admin' && p.role !== 'admin') { location.href = p.role === 'coach' ? 'coach.html' : 'account.html'; return; }
      if (mode === 'coach' && p.role === 'associate') { location.href = 'account.html'; return; }
      $('#stHello').textContent = (mode === 'admin' ? 'Admin' : 'Coach') + ' · ' + p.name;
      $$('.st-tabs button').forEach(function (b) { b.onclick = function () { show(b.dataset.tab); }; });
      var start = location.hash.slice(1);
      show(TABS[start] && $('.st-tabs [data-tab="' + start + '"]') ? start : 'progress');
    });
  }
  window.SCStaff = { init: init };
})();
