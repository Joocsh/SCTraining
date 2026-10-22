/* ===== Skill Cloud Academy — app core =====
   Auth, the unified progress engine and grading. Pages call these functions
   synchronously and read a local copy; assets/js/sc-db.js (loaded below) keeps
   that copy in step with Supabase: sign in, pull the person's activity, and
   push every change through an outbox. The function names did not change, so
   every page that called them keeps working. */
(function(window){
  'use strict';

  var LS_USERS       = 'scc_users';
  var LS_SESSION     = 'scc_session';
  var LS_LASTPAGE    = 'scc_last_page__';   // + userId
  var LS_PROGRESS    = 'scc_progress__';    // + userId
  var LS_SUBMISSIONS = 'scc_submissions';
  var LS_SEEDED      = 'scc_seeded_v2';

  // role keys match window.SC_ROLE / the literal localStorage prefixes already used by
  // workflow.js and each role page (confirmed by repo audit: tc, listing, lc, lm, ops, cfo)
  var ROLE_LABELS = {
    tc:'Transaction Coordinator', listing:'Listing Coordinator', lc:'Leasing Coordinator',
    lm:'Lead Manager', ops:'Operations Manager', cfo:'CFO & Bookkeeper', admin_social:'Admin & Social Media',
    general:'Practice Sandbox', qualia:'Qualia (Title/Escrow)'
  };
  var ROLE_PAGES = {
    tc:'roles/transaction-coordinator.html', listing:'roles/listing-coordinator.html',
    lc:'roles/property-manager.html', lm:'roles/lead-manager.html',
    ops:'va/operations-manager.html', cfo:'roles/cfo-bookkeeper.html',
    admin_social:'roles/admin-social.html'
  };
  // legacy per-role MODES config (from the existing, already-working workflow.js/role-page trackers)
  var LEGACY_MODES = {
    tc:      {sim:4, mls:10, prompt:10, quiz:8},
    listing: {sim:4, mls:10, prompt:6,  quiz:15},
    lc:      {sim:1, prompt:8, quiz:6},
    lm:      {sim:1, prompt:8, quiz:6},
    ops:     {sim:1, prompt:8, quiz:6},
    cfo:     {sim:1, prompt:8, quiz:6},
    admin_social: {sim:1, prompt:8, quiz:6}
  };

  // Absolute URL of the site root, derived from this script's own <script src>.
  // Every page loads assets/js/app-core.js, so stripping that suffix gives the root
  // regardless of how deep the page sits or what base path it is served under
  // (localhost root, GitHub Pages subfolder, etc.). Pages used to be located by
  // testing location.pathname against a hardcoded /(roles|guides)/ list, which
  // silently broke for every subfolder added later.
  var ROOT = (function(){
    var s = document.currentScript;
    if(!s){
      var all = document.getElementsByTagName('script');
      for(var i=0;i<all.length;i++){
        if(all[i].src && /assets\/js\/app-core\.js/.test(all[i].src)){ s = all[i]; break; }
      }
    }
    if(!s || !s.src) return '';
    return s.src.replace(/assets\/js\/app-core\.js.*$/, '');
  })();
  function rootUrl(page){ return ROOT + page; }

  // ---------- database layer ----------
  // supabase-js, then sc-db.js. Written with document.write while the page is
  // still parsing, so SCDB exists before the page's own scripts run.
  (function(){
    if(window.SCDB || window.__scdbLoading) return;
    window.__scdbLoading = true;
    var lib = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
    var db = ROOT + 'assets/js/sc-db.js?v=20261021c';
    if(document.readyState === 'loading'){
      document.write('<script src="'+lib+'"><\/script><script src="'+db+'"><\/script>');
    } else {
      var a = document.createElement('script'); a.src = lib;
      a.onload = function(){ var b = document.createElement('script'); b.src = db; document.head.appendChild(b); };
      document.head.appendChild(a);
    }
  })();
  function db(){ return window.SCDB || null; }

  function readJSON(key, fallback){
    try{ var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch(e){ return fallback; }
  }
  function writeJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  function uid(prefix){ return prefix+'_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36); }
  function here(){ return (location.pathname.split('/').slice(-2).join('/')).replace(/^\//,''); }

  // The demo accounts are gone: people sign in with real accounts (Supabase Auth).
  // Old demo data left in this browser is cleared once.
  if(localStorage.getItem(LS_SEEDED)){
    [LS_USERS, LS_SESSION, LS_SUBMISSIONS, LS_SEEDED].forEach(function(k){ localStorage.removeItem(k); });
  }

  // ---------- auth ----------
  var LS_TOKEN = 'sb-eagpqzqgzzfmmdbyeoau-auth-token';   // written by supabase-js
  // People this person may see: themselves, and for coaches and admins the
  // associates they supervise (filled by sc-db.js from the profiles table).
  function getUsers(){
    var me = currentUser(), list = readJSON('scc_people', []);
    if(me && !list.some(function(u){ return u.id===me.id; })) list = list.concat([me]);
    return list;
  }
  function findUserById(id){
    return getUsers().filter(function(u){ return u.id===id; })[0] || null;
  }
  // Signing in is asynchronous now: SCApp.signIn(email, password) returns a promise.
  function signIn(email, password){ return db().signIn(email, password); }
  function login(){ console.warn('SCApp.login is replaced by SCApp.signIn (Supabase).'); return null; }
  function logout(){
    localStorage.removeItem('scc_profile');
    return db() ? db().signOut() : Promise.resolve();
  }
  function currentUser(){
    var s = readJSON(LS_TOKEN, null);
    if(!s || !s.user) return null;
    var p = readJSON('scc_profile', null);
    if(p && p.id === s.user.id) return p;
    var meta = s.user.user_metadata || {};
    var name = meta.full_name || (s.user.email||'').split('@')[0];
    return {id:s.user.id, name:name, email:s.user.email, role:'user', appRole:'associate', assignedRole:null, avatar:name.charAt(0).toUpperCase()};
  }
  function isStaff(u){ u = u || currentUser(); return !!u && (u.role==='admin' || u.role==='coach'); }
  // Trainings and simulations this person has (open ones, plus what an admin assigned).
  function hasCourse(slug){
    var u = currentUser(); if(!u) return false;
    if(isStaff(u)) return true;
    var mine = readJSON('scc_my_courses__'+u.id, null);
    return mine ? mine.indexOf(slug) > -1 : true;
  }
  function hasSimulation(slug){
    var u = currentUser(); if(!u) return false;
    if(isStaff(u)) return true;
    var mine = readJSON('scc_my_sims__'+u.id, null);
    return mine ? mine.indexOf(slug) > -1 : true;
  }

  function loginUrl(next){
    return rootUrl('login.html') + (next ? ('?next='+encodeURIComponent(next)) : '');
  }

  function requireAuth(opts){
    opts = opts || {};
    var u = currentUser();
    if(!u){
      window.location.href = loginUrl(here());
      return null;
    }
    if(opts.adminOnly && u.role !== 'admin'){
      window.location.href = rootUrl(u.role==='coach' ? 'coach.html' : 'account.html');
      return null;
    }
    if(opts.staffOnly && !isStaff(u)){
      window.location.href = rootUrl('account.html');
      return null;
    }
    setLastPage(u.id, here());
    return u;
  }

  // ---------- Introduction gate ----------
  // The Introduction (ai.html) is required: the trainings and the simulations
  // open once it is finished (the database enforces the same rule).
  // Coaches and admins are not held by it.
  var LS_INTRO = 'scc_intro_done__';   // + userId
  function isIntroDone(u){
    u = u || currentUser();
    if(!u) return false;
    if(u.role === 'admin' || u.role === 'coach') return true;
    return localStorage.getItem(LS_INTRO + u.id) === '1';
  }
  function markIntroDone(){
    var u = currentUser();
    if(u) localStorage.setItem(LS_INTRO + u.id, '1');
  }
  /* Every role page calls this. It asks for a signed in associate and checks
     the person has this simulation (simulations are open unless an admin
     closed one and assigns it instead). */
  function requireIntro(){
    var u = requireAuth();
    if(!u) return null;
    if(!isIntroDone(u)){
      window.location.replace(rootUrl('ai.html') + '?locked=simulations');
      return null;
    }
    var here_ = location.pathname.replace(/^.*\/(roles\/[^/]+)$/, '$1');
    var slug = Object.keys(ROLE_PAGES).filter(function(k){ return ROLE_PAGES[k] === here_; })[0];
    if(slug && !hasSimulation(slug)){
      window.location.replace(rootUrl('index.html') + '?nosim=' + slug + '#simulations');
      return null;
    }
    return u;
  }

  // ---------- last page memory ----------
  function setLastPage(userId, path){
    localStorage.setItem(LS_LASTPAGE+userId, path);
    if(db() && userId === (currentUser()||{}).id) db().lastPath(path);
  }
  function getLastPage(userId){
    var p = findUserById(userId);
    return localStorage.getItem(LS_LASTPAGE+userId) || (p && p.lastPath) || null;
  }

  // ---------- unified progress engine ----------
  function getProgress(userId){
    return readJSON(LS_PROGRESS+userId, {modes:{}, history:[]});
  }
  function saveProgress(userId, p){
    writeJSON(LS_PROGRESS+userId, p);
  }
  function setModeScore(userId, role, mode, score, max){
    var p = getProgress(userId);
    var key = role+'.'+mode;
    p.modes[key] = {role:role, mode:mode, score:score, max:max, ts:Date.now()};
    p.history.unshift({role:role, mode:mode, score:score, max:max, ts:Date.now()});
    p.history = p.history.slice(0, 30);
    saveProgress(userId, p);
    if(db() && userId === (currentUser()||{}).id && mode !== 'email') db().modeScore(role, mode, score);
    return p;
  }
  function addModeScore(userId, role, mode, addScore, addMax, note){
    var p = getProgress(userId);
    var key = role+'.'+mode;
    var cur = p.modes[key] || {role:role, mode:mode, score:0, max:0};
    cur.score += addScore; cur.max += addMax; cur.ts = Date.now();
    p.modes[key] = cur;
    p.history.unshift({role:role, mode:mode, score:addScore, max:addMax, ts:Date.now(), note:note||''});
    p.history = p.history.slice(0, 30);
    saveProgress(userId, p);
    if(db() && userId === (currentUser()||{}).id && mode !== 'email') db().modeScore(role, mode, cur.score);
    return p;
  }
  function getOverallPercent(userId){
    var p = getProgress(userId);
    var s=0, m=0;
    Object.keys(p.modes).forEach(function(k){ s+=p.modes[k].score; m+=p.modes[k].max; });
    return m ? Math.round(s/m*100) : 0;
  }
  function getRoleBreakdown(userId){
    var p = getProgress(userId);
    var byRole = {};
    Object.keys(p.modes).forEach(function(k){
      var v = p.modes[k];
      byRole[v.role] = byRole[v.role] || {role:v.role, score:0, max:0, modes:{}};
      byRole[v.role].score += v.score;
      byRole[v.role].max += v.max;
      byRole[v.role].modes[v.mode] = v;
    });
    return byRole;
  }

  // pull in scores already computed by the existing per-role legacy trackers
  // (sc_<role>_sim, sc_<role>_mls, sc_<role>_prompt, sc_<role>_quiz — see workflow.js)
  function syncLegacyProgress(userId, role){
    var cfg = LEGACY_MODES[role];
    if(!cfg) return;
    Object.keys(cfg).forEach(function(mode){
      var raw = localStorage.getItem('sc_'+role+'_'+mode);
      var score = raw ? parseFloat(raw) : 0;
      if(isNaN(score)) score = 0;
      setModeScore(userId, role, mode, score, cfg[mode]);
    });
  }

  // ---------- email submissions / admin grading ----------
  function listSubmissions(filter){
    filter = filter || {};
    return readJSON(LS_SUBMISSIONS, []).filter(function(s){
      if(filter.status && s.status!==filter.status) return false;
      if(filter.userId && s.userId!==filter.userId) return false;
      if(filter.role && s.role!==filter.role) return false;
      return true;
    }).sort(function(a,b){ return b.ts-a.ts; });
  }
  function submitEmail(entry){
    var subs = readJSON(LS_SUBMISSIONS, []);
    subs.push({
      id: uid('sub'), userId: entry.userId, role: entry.role,
      scenarioId: entry.scenarioId, scenarioPrompt: entry.scenarioPrompt, text: entry.text,
      status:'pending', score:null, maxScore: entry.maxScore||5, feedback:'', gradedBy:null,
      ts: Date.now(), gradedTs:null
    });
    writeJSON(LS_SUBMISSIONS, subs);
    if(db()) db().submitEmail(entry.scenarioId, entry.text);
  }
  function gradeSubmission(id, score, feedback, gradedByUserId){
    var subs = readJSON(LS_SUBMISSIONS, []);
    var sub = subs.filter(function(s){ return s.id===id; })[0];
    if(!sub) return null;
    var wasGraded = sub.status==='graded';
    var prevScore = wasGraded ? sub.score : 0;
    sub.status='graded'; sub.score=score; sub.feedback=feedback; sub.gradedBy=gradedByUserId; sub.gradedTs=Date.now();
    writeJSON(LS_SUBMISSIONS, subs);
    if(db() && typeof sub.id === 'number') db().grade(sub.id, score, feedback);
    addModeScore(sub.userId, sub.role, 'email', score-prevScore, wasGraded?0:sub.maxScore, 'Email graded: '+feedback.slice(0,80));
    return sub;
  }

  // ---------- case-simulator email steps (the real emails users draft mid-scenario) ----------
  // These are the "Client Email" / compose steps already inside each role's Case Simulator
  // workflow. Wiring them here (instead of a separate practice module) means the associate
  // writes the email as part of the actual case, submits it, a supervisor grades it in
  // admin.html, and that grade rolls into the same role's score.
  function escHtml(s){
    return String(s==null?'':s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function emailStepStatus(role, scenarioId){
    var me = currentUser();
    if(!me) return null;
    var subs = listSubmissions({userId:me.id, role:role, scenarioId:scenarioId});
    return subs[0] || null; // listSubmissions already sorts newest first
  }
  function renderEmailStepStatus(opts){
    var sub = emailStepStatus(opts.role, opts.scenarioId);
    var ta = document.getElementById(opts.textareaId);
    var statusEl = document.getElementById(opts.statusElId);
    var btn = opts.btnId ? document.getElementById(opts.btnId) : null;
    if(!sub) return false;
    if(ta){ ta.value = sub.text; ta.setAttribute('readonly','readonly'); }
    if(btn) btn.style.display = 'none';
    if(statusEl){
      if(sub.status==='graded'){
        statusEl.innerHTML = '<span class="graded-tag">Graded '+sub.score+'/'+sub.maxScore+'</span>'+
          (sub.feedback ? '<p class="small" style="margin-top:6px">'+escHtml(sub.feedback)+'</p>' : '');
      } else {
        statusEl.innerHTML = '<span class="badge state">Submitted, waiting for your supervisor to grade</span>';
      }
    }
    return true;
  }
  function submitEmailStep(opts){
    // opts: {textareaId, statusElId, btnId, role, scenarioId, scenarioPrompt, maxScore, minLen}
    var me = currentUser();
    if(!me){ window.location.href = loginUrl(here()); return; }
    var ta = document.getElementById(opts.textareaId);
    if(!ta) return;
    var text = (ta.value||'').trim();
    var statusEl = document.getElementById(opts.statusElId);
    var minLen = opts.minLen || 25;
    if(text.length < minLen){
      if(statusEl) statusEl.innerHTML = '<span style="color:var(--bad);font-weight:700;font-size:13px">Write a more complete email before submitting.</span>';
      return;
    }
    submitEmail({userId:me.id, role:opts.role, scenarioId:opts.scenarioId, scenarioPrompt:opts.scenarioPrompt, text:text, maxScore:opts.maxScore||5});
    renderEmailStepStatus(opts);
  }
  function checkSimpleField(inputId, expected, statusElId){
    var el = document.getElementById(inputId);
    var val = (el && el.value || '').trim();
    var ok = (expected instanceof RegExp) ? expected.test(val) : val.toLowerCase() === String(expected).toLowerCase();
    var st = statusElId ? document.getElementById(statusElId) : null;
    if(st) st.innerHTML = ok
      ? '<span style="color:var(--good);font-weight:700;font-size:12.5px">Correct</span>'
      : '<span style="color:var(--bad);font-weight:700;font-size:12.5px">Not quite, check the details in the case file.</span>';
    if(el) el.style.borderColor = ok ? 'var(--good)' : 'var(--bad)';
    return ok;
  }

  // ---------- nav wiring ----------
  function wireNav(){
    var u = currentUser();
    document.querySelectorAll('.user-chip').forEach(function(chip){
      var av = chip.querySelector('.av');
      var label = chip.querySelector('.uc-label');
      if(u){
        if(av) av.textContent = (u.avatar||u.name.charAt(0)).toUpperCase();
        if(label) label.textContent = u.role==='admin' ? 'Admin' : u.role==='coach' ? 'Coach' : u.name.split(' ')[0];
        chip.href = rootUrl(u.role==='admin' ? 'admin.html' : u.role==='coach' ? 'coach.html' : 'account.html');
      } else {
        if(av) av.textContent='?';
        if(label) label.textContent='Log In';
        chip.href = loginUrl(here());
      }
    });
    document.querySelectorAll('.logout-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        logout().then(function(){ window.location.href = rootUrl('login.html'); }, function(){ window.location.href = rootUrl('login.html'); });
      });
    });
    if(u){
      document.querySelectorAll('.admin-only-link').forEach(function(el){
        el.style.display = u.role==='admin' ? '' : 'none';
      });
    }
  }
  window.addEventListener('DOMContentLoaded', wireNav);

  window.SCApp = {
    ROLE_LABELS: ROLE_LABELS, ROLE_PAGES: ROLE_PAGES, LEGACY_MODES: LEGACY_MODES,
    login: login, signIn: signIn, logout: logout, currentUser: currentUser, requireAuth: requireAuth, loginUrl: loginUrl,
    isStaff: isStaff, hasCourse: hasCourse, hasSimulation: hasSimulation, rootUrl: rootUrl,
    isIntroDone: isIntroDone, markIntroDone: markIntroDone, requireIntro: requireIntro,
    findUserById: findUserById, getUsers: getUsers,
    setLastPage: setLastPage, getLastPage: getLastPage,
    getProgress: getProgress, setModeScore: setModeScore, addModeScore: addModeScore,
    getOverallPercent: getOverallPercent, getRoleBreakdown: getRoleBreakdown, syncLegacyProgress: syncLegacyProgress,
    listSubmissions: listSubmissions, submitEmail: submitEmail, gradeSubmission: gradeSubmission,
    submitEmailStep: submitEmailStep, renderEmailStepStatus: renderEmailStepStatus, emailStepStatus: emailStepStatus,
    checkSimpleField: checkSimpleField,
    wireNav: wireNav
  };
})(window);
