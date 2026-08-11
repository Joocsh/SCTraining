/* ===== Skill Cloud Academy — app core =====
   Simulated auth, unified progress engine, and admin grading, all in localStorage.
   No server exists yet; this layer is written so a real backend can replace the
   storage functions below without touching any page that calls them. */
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
    general:'Practice Sandbox'
  };
  var ROLE_PAGES = {
    tc:'roles/transaction-coordinator.html', listing:'roles/listing-coordinator.html',
    lc:'roles/leasing-coordinator.html', lm:'roles/lead-manager.html',
    ops:'roles/operations-manager.html', cfo:'roles/cfo-bookkeeper.html',
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

  function readJSON(key, fallback){
    try{ var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch(e){ return fallback; }
  }
  function writeJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  function uid(prefix){ return prefix+'_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36); }
  function here(){ return (location.pathname.split('/').slice(-2).join('/')).replace(/^\//,''); }

  function seed(){
    if(localStorage.getItem(LS_SEEDED)) return;
    var users = [
      {id:'maria',  name:'Maria Gomez',   email:'maria@demo',  password:'demo123',  role:'user',  assignedRole:'tc',      avatar:'M'},
      {id:'jose',   name:'Jose Ramirez',  email:'jose@demo',   password:'demo123',  role:'user',  assignedRole:'listing', avatar:'J'},
      {id:'admin1', name:'Alex Rivera',   email:'admin@demo',  password:'admin123', role:'admin', assignedRole:null,      avatar:'A'}
    ];
    writeJSON(LS_USERS, users);

    var subs = [
      {
        id: uid('sub'), userId:'maria', role:'tc',
        scenarioId:'tc-va-seller-detail',
        scenarioPrompt:'Seller detail email, 4232 Maplehurst Road VA — the ratified contract has just come in and the seller needs settlement date, EMD amount, and which forms are attached for them to complete.',
        text:'Hi Jemal,\n\nGreat news, your home is officially under contract. Settlement is set for Feb 11, and the buyer has put down a $1,000 earnest money deposit.\n\nI have attached three forms for you to complete: the utility form, the walkthrough form, and the items-to-convey form. Please send these back at your earliest convenience so we can keep the file on track.\n\nLet me know if you have any questions.\n\nBest,\nMaria',
        status:'pending', score:null, maxScore:5, feedback:'', gradedBy:null, ts: Date.now()-86400000*2, gradedTs:null
      },
      {
        id: uid('sub'), userId:'jose', role:'listing',
        scenarioId:'listing-ca-agent-email',
        scenarioPrompt:'Data Input Form confirmation email to agent, 139 S Edinburgh Ave — confirm the REIN form is complete and note what is still needed.',
        text:'Hi Ben, the Data Input Form is done, listing looks good to go, let me know if you need anything else.',
        status:'pending', score:null, maxScore:5, feedback:'', gradedBy:null, ts: Date.now()-86400000, gradedTs:null
      }
    ];
    writeJSON(LS_SUBMISSIONS, subs);
    localStorage.setItem(LS_SEEDED, '1');
  }
  seed();

  // ---------- auth ----------
  function getUsers(){ return readJSON(LS_USERS, []); }
  function findUserByEmail(email){
    email = (email||'').trim().toLowerCase();
    return getUsers().filter(function(u){ return u.email.toLowerCase()===email; })[0] || null;
  }
  function findUserById(id){
    return getUsers().filter(function(u){ return u.id===id; })[0] || null;
  }
  function login(email, password){
    var u = findUserByEmail(email);
    if(!u || u.password !== password) return null;
    writeJSON(LS_SESSION, {userId:u.id});
    return u;
  }
  function logout(){
    localStorage.removeItem(LS_SESSION);
  }
  function currentUser(){
    var s = readJSON(LS_SESSION, null);
    if(!s) return null;
    return findUserById(s.userId);
  }

  function loginUrl(next){
    var depth = location.pathname.split('/').filter(Boolean);
    // crude depth check: if we're inside /roles/ or /guides/, login.html is one level up
    var inSub = /\/(roles|guides)\//.test(location.pathname);
    var base = inSub ? '../login.html' : 'login.html';
    return base + (next ? ('?next='+encodeURIComponent(next)) : '');
  }

  function requireAuth(opts){
    opts = opts || {};
    var u = currentUser();
    if(!u){
      window.location.href = loginUrl(here());
      return null;
    }
    if(opts.adminOnly && u.role !== 'admin'){
      window.location.href = (/\/(roles|guides)\//.test(location.pathname)?'../account.html':'account.html');
      return null;
    }
    setLastPage(u.id, here());
    return u;
  }

  // ---------- last page memory ----------
  function setLastPage(userId, path){
    localStorage.setItem(LS_LASTPAGE+userId, path);
  }
  function getLastPage(userId){
    return localStorage.getItem(LS_LASTPAGE+userId) || null;
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
  }
  function gradeSubmission(id, score, feedback, gradedByUserId){
    var subs = readJSON(LS_SUBMISSIONS, []);
    var sub = subs.filter(function(s){ return s.id===id; })[0];
    if(!sub) return null;
    var wasGraded = sub.status==='graded';
    var prevScore = wasGraded ? sub.score : 0;
    sub.status='graded'; sub.score=score; sub.feedback=feedback; sub.gradedBy=gradedByUserId; sub.gradedTs=Date.now();
    writeJSON(LS_SUBMISSIONS, subs);
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
        if(label) label.textContent = u.role==='admin' ? 'Admin' : u.name.split(' ')[0];
        chip.href = (/\/(roles|guides)\//.test(location.pathname)?'../':'') + (u.role==='admin'?'admin.html':'account.html');
      } else {
        if(av) av.textContent='?';
        if(label) label.textContent='Log In';
        chip.href = loginUrl(here());
      }
    });
    document.querySelectorAll('.logout-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        logout();
        window.location.href = (/\/(roles|guides)\//.test(location.pathname)?'../':'') + 'login.html';
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
    login: login, logout: logout, currentUser: currentUser, requireAuth: requireAuth, loginUrl: loginUrl,
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
