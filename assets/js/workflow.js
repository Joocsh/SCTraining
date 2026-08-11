/* ============================================================
   SHARED WORKFLOW / CASE SIMULATOR ENGINE
   Any role page defines its own content, this file supplies
   the mechanics. A page must define, before this script loads
   (or attach to window before calling simInit):
     window.SIM_DATA:   array of scenario/workflow objects,
                         OR an object keyed by state code if
                         window.SIM_STATES is also provided.
     window.SIM_STATES: optional, [{key,label}, ...] for
                         roles with more than one state/market.
     window.WF_LABELS:  array of step labels for the workflow
                         (e.g. ['Client Email', 'Data Form', ...])
     window.WF_STEPS:   array of functions, each returning an
                         HTML string for that workflow step.
   A scenario object is either:
     { tag, title, desc, steps:[{q,choices:[{t,ok}],fb}] }   (decision scenario)
     { type:'workflow', tag, title, desc, stepCount }         (points into WF_STEPS)
   ============================================================ */

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ── Panel open/close (generic; a page can register onOpen hooks) ── */
window.PANEL_ON_OPEN = window.PANEL_ON_OPEN || {};

function openPanel(id) {
  document.querySelectorAll('.lc-panel').forEach(p => p.classList.remove('open'));
  const panel = document.getElementById('panel-' + id);
  if (panel) {
    panel.classList.add('open');
    panel.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    if (window.PANEL_ON_OPEN[id]) window.PANEL_ON_OPEN[id]();
  }
}
function closePanel(id) {
  const panel = document.getElementById('panel-' + id);
  if (panel) panel.classList.remove('open');
  document.body.style.overflow = '';
}

/* ═══════════════════════════════════════════════════════════
   CASE SIMULATOR (decision scenarios + workflow picker)
   ═══════════════════════════════════════════════════════════ */
let simState = null, simScenario = null, simIdx = 0, simRight = 0, simAnswered = false;

function simDataForState() {
  if (window.SIM_STATES && window.SIM_STATES.length) {
    return (window.SIM_DATA && window.SIM_DATA[simState]) || [];
  }
  return window.SIM_DATA || [];
}

function simInit() {
  const bar = document.getElementById('sim-state-bar');
  const citiesView = document.getElementById('sim-view-cities');
  const pick = document.getElementById('sim-pick');
  if (window.SIM_STATES && window.SIM_STATES.length) {
    if (!simState) simState = window.SIM_STATES[0].key;
    bar.innerHTML = '';
    window.SIM_STATES.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'mls-state-card st-' + s.key;
      btn.innerHTML = '<span class="mls-state-abbr">' + esc(s.key.toUpperCase()) + '</span><span class="mls-state-name">' + esc(s.label) + '</span>';
      btn.onclick = () => simGoToCity(s.key);
      bar.appendChild(btn);
    });
    if (citiesView) citiesView.style.display = 'block';
    if (pick) pick.style.display = 'none';
  } else {
    if (bar) bar.style.display = 'none';
    simRenderCards();
  }
}

/* A "city" is its own page-like view: pick the city, then pick the case
   that belongs to it, then the case starts the actual simulation. */
function simGoToCity(key) {
  simState = key;
  const citiesView = document.getElementById('sim-view-cities');
  if (citiesView) citiesView.style.display = 'none';
  document.getElementById('sim-pick').style.display = 'block';
  simRenderCards();
}

function simBackToCities() {
  document.getElementById('sim-pick').style.display = 'none';
  const citiesView = document.getElementById('sim-view-cities');
  if (citiesView) citiesView.style.display = 'block';
}

/* Header "Back" button for the Case Simulator panel: step back one level
   at a time (case -> case list -> cities -> exit) instead of always
   exiting straight to the role dashboard. */
function simPanelBack() {
  const wfEl = document.getElementById('sim-workflow');
  const playEl = document.getElementById('sim-play');
  const pickEl = document.getElementById('sim-pick');
  const citiesEl = document.getElementById('sim-view-cities');
  if (wfEl && getComputedStyle(wfEl).display !== 'none') { wfReset(); return; }
  if (playEl && getComputedStyle(playEl).display !== 'none') { simReset(); return; }
  if (pickEl && getComputedStyle(pickEl).display !== 'none' && citiesEl) { simBackToCities(); return; }
  closePanel('sim');
}

function simRenderCards() {
  const grid = document.getElementById('sim-cards');
  const scenarios = simDataForState();
  grid.innerHTML = '';
  scenarios.forEach(sc => {
    const card = document.createElement('div');
    const isWF = sc.type === 'workflow';
    card.className = 'lc-sc-card' + (isWF ? ' lc-sc-card-wf st-' + simState : '');
    const badge = isWF
      ? `<span class="lc-sc-steps-badge wf-badge">${sc.stepCount} steps &rarr; end-to-end</span>`
      : `<span class="lc-sc-steps-badge">${sc.steps.length} decisions</span>`;
    card.innerHTML = `<div class="lc-sc-tag">${esc(sc.tag)}</div>
      <h4>${esc(sc.title)}</h4>
      <p>${esc(sc.desc)}</p>
      ${badge}
      ${isWF ? '<span class="wf-cta">Start the simulation &rarr;</span>' : ''}`;
    card.onclick = () => simStart(sc);
    grid.appendChild(card);
  });
}

/* .sim-pick-center reserves min-height for the picker screens; it must be
   hidden (not just its children) once a scenario/workflow takes over, or it
   leaves a large empty gap above the play area. */
function simPickCenterToggle(show) {
  const el = document.getElementById('sim-pick-center') || document.querySelector('.sim-pick-center');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function simStart(sc) {
  if (sc.type === 'workflow') { wfStart(sc); return; }
  simScenario = sc; simIdx = 0; simRight = 0; simAnswered = false;
  simPickCenterToggle(false);
  document.getElementById('sim-pick').style.display = 'none';
  document.getElementById('sim-play').style.display = 'block';
  document.getElementById('sim-head').innerHTML =
    `<div class="lc-callout-info" style="margin-bottom:20px">
      <strong>${esc(sc.tag)}:</strong> ${esc(sc.desc)}
    </div>`;
  simRender();
}

function simRender() {
  const step = simScenario.steps[simIdx];
  simAnswered = false;
  document.getElementById('sim-step-chip').textContent = 'Step ' + (simIdx + 1) + ' of ' + simScenario.steps.length;
  document.getElementById('sim-score-chip').textContent = 'Correct: ' + simRight + '/' + simScenario.steps.length;
  document.getElementById('sim-prog').style.width = (simIdx / simScenario.steps.length * 100) + '%';
  let h = `<h3>${esc(step.q)}</h3>`;
  step.choices.forEach((ch, i) => {
    h += `<button class="lc-choice" onclick="simPick(${i})">${esc(ch.t)}</button>`;
  });
  h += `<div class="lc-fb" id="sim-fb"></div><div id="sim-nxt"></div>`;
  document.getElementById('sim-body').innerHTML = h;
}

function simPick(i) {
  if (simAnswered) return; simAnswered = true;
  const step = simScenario.steps[simIdx];
  document.querySelectorAll('#sim-body .lc-choice').forEach((b, j) => {
    b.disabled = true;
    if (step.choices[j].ok) b.classList.add('correct');
    if (j === i && !step.choices[j].ok) b.classList.add('wrong');
  });
  const ok = step.choices[i].ok;
  if (ok) simRight++;
  const fb = document.getElementById('sim-fb');
  fb.className = 'lc-fb show ' + (ok ? 'good' : 'bad');
  fb.innerHTML = '<strong>' + (ok ? 'Right call.' : 'Not the best call.') + '</strong> ' + esc(step.fb);
  document.getElementById('sim-score-chip').textContent = 'Correct: ' + simRight + '/' + simScenario.steps.length;
  const nxt = document.getElementById('sim-nxt');
  if (simIdx < simScenario.steps.length - 1) {
    nxt.innerHTML = '<button class="lc-next-btn" onclick="simAdvance()">Next decision &rarr;</button>';
  } else {
    nxt.innerHTML = '<button class="lc-next-btn gold" onclick="simFinish()">See results &rarr;</button>';
  }
}

function simAdvance() { simIdx++; simRender(); }

function simFinish() {
  const pct = Math.round(simRight / simScenario.steps.length * 100);
  document.getElementById('sim-prog').style.width = '100%';
  const msg = pct >= 80 ? 'Excellent, you handled this like a seasoned professional.' :
    pct >= 50 ? 'Solid. Review the feedback on the ones you missed.' :
      'Keep practicing. Revisit the playbook and try again.';
  document.getElementById('sim-body').innerHTML = `
    <div class="lc-result">
      <div class="lc-result-pct">${pct}%</div>
      <p><strong>${simRight} of ${simScenario.steps.length}</strong> right calls.</p>
      <p>${msg}</p>
      <div class="lc-result-actions">
        <button class="lc-result-btn primary" onclick="simStart(simScenario)">Replay</button>
        <button class="lc-result-btn outline" onclick="simReset()">Back to scenarios</button>
      </div>
    </div>`;
}

function simReset() {
  document.getElementById('sim-play').style.display = 'none';
  const wfEl = document.getElementById('sim-workflow');
  if (wfEl) wfEl.style.display = 'none';
  simPickCenterToggle(true);
  document.getElementById('sim-pick').style.display = 'block';
  simRenderCards();
}

/* ═══════════════════════════════════════════════════════════
   FULL WORKFLOW SIMULATOR (narrative, multi-step)
   ═══════════════════════════════════════════════════════════ */
let wfStep = 0;

/* Active workflow content. A workflow-type scenario can carry its own
   .wfLabels / .wfSteps (so multiple state workflows can coexist); if it
   doesn't, we fall back to the page-level window.WF_LABELS/WF_STEPS for
   backward compatibility with a single-workflow page. */
let wfActiveLabels = null, wfActiveSteps = null, wfActiveScenario = null;

function wfStart(sc) {
  wfStep = 0;
  wfActiveScenario = sc || null;
  wfActiveLabels = (sc && sc.wfLabels) || window.WF_LABELS;
  wfActiveSteps = (sc && sc.wfSteps) || window.WF_STEPS;
  if (wfActiveScenario) wfActiveScenario._decisions = [];
  simPickCenterToggle(false);
  document.getElementById('sim-pick').style.display = 'none';
  const playEl = document.getElementById('sim-play');
  if (playEl) playEl.style.display = 'none';
  document.getElementById('sim-workflow').style.display = 'block';
  wfRender();
}

function wfRestart() {
  wfStart(wfActiveScenario);
}

function wfReset() {
  document.getElementById('sim-workflow').style.display = 'none';
  simPickCenterToggle(true);
  document.getElementById('sim-pick').style.display = 'block';
  simRenderCards();
}

function wfNext() {
  if (wfStep < wfActiveLabels.length - 1) { wfStep++; wfRender(); }
}
function wfPrev() {
  if (wfStep > 0) { wfStep--; wfRender(); }
}

function wfRender() {
  const total = wfActiveLabels.length;
  document.getElementById('wf-step-chip').textContent = 'Step ' + (wfStep + 1) + ' of ' + total;
  document.getElementById('wf-label-chip').textContent = wfActiveLabels[wfStep];
  document.getElementById('wf-prog').style.width = ((wfStep + 1) / total * 100) + '%';
  document.getElementById('wf-body').innerHTML = wfActiveSteps[wfStep]();
  /* Restore any previously submitted/graded email step (see app-core.js submitEmailStep):
     any textarea tagged with data-scenario is a real case email the associate drafts and
     sends to their supervisor for grading, so re-show its status instead of a blank box. */
  if (window.SCApp) {
    document.querySelectorAll('#wf-body textarea[data-scenario]').forEach(function (ta) {
      SCApp.renderEmailStepStatus({
        textareaId: ta.id, statusElId: ta.id + '-status', btnId: ta.id + '-btn',
        role: ta.dataset.role, scenarioId: ta.dataset.scenario
      });
    });
  }
  /* Some steps need a small bit of JS to run after their HTML is inserted
     (e.g. wiring an embedded decision point via wfDecision). innerHTML never
     executes <script> tags, so a page registers that logic here instead.
     Checked per-scenario first (sc.wfAfterRender), so multiple state
     workflows on one page don't collide on the same step index, then
     falls back to the page-level window.WF_AFTER_RENDER for a single-workflow page. */
  const afterRender = (wfActiveScenario && wfActiveScenario.wfAfterRender) || window.WF_AFTER_RENDER;
  if (afterRender && afterRender[wfStep]) {
    afterRender[wfStep]();
  }
}

function wfNav(showPrev) {
  return `<div class="wf-nav">
    ${showPrev ? '<button class="wf-nav-btn outline" onclick="wfPrev()">&larr; Previous</button>' : ''}
    <button class="wf-nav-btn primary" onclick="wfNext()">Continue &rarr;</button>
  </div>`;
}

function wfNavFinish(label) {
  return `<div class="wf-nav">
    <button class="wf-nav-btn outline" onclick="wfPrev()">&larr; Previous</button>
    <button class="wf-nav-btn primary" onclick="${label || 'wfReset()'}">Finish &amp; Back to Scenarios</button>
  </div>`;
}

function wfField(id, label, type, placeholder, val, readonly) {
  const ro = readonly ? ' readonly' : '';
  const v = val ? ` value="${val}"` : '';
  return `<div class="wf-field">
    <label for="${id}">${label}</label>
    <input type="${type || 'text'}" id="${id}" placeholder="${placeholder || ''}"${v}${ro}>
  </div>`;
}

function wfSelect(id, label, opts) {
  const options = opts.map(o => `<option>${o}</option>`).join('');
  return `<div class="wf-field">
    <label for="${id}">${label}</label>
    <select id="${id}"><option value="">-- Select --</option>${options}</select>
  </div>`;
}

function wfTextarea(id, label, placeholder, rows) {
  return `<div class="wf-field wf-form-row cols1">
    <label for="${id}">${label}</label>
    <textarea id="${id}" rows="${rows || 3}" placeholder="${placeholder || ''}"></textarea>
  </div>`;
}

/* ── Real-document viewer: preview the actual file in-page, with a download option ── */
function wfDocBtn(url, label) {
  const jsSafeLabel = String(label).replace(/'/g, "\\'");
  return `<button type="button" class="wf-doc-btn" onclick="wfOpenDoc('${url}', '${jsSafeLabel}')">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    ${esc(label)}
  </button>`;
}

function wfEnsureDocModal() {
  if (document.getElementById('wf-doc-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'wf-doc-modal';
  modal.className = 'wf-doc-modal';
  modal.innerHTML = `
    <div class="wf-doc-modal-inner">
      <div class="wf-doc-modal-header">
        <span class="wf-doc-modal-title" id="wf-doc-modal-title"></span>
        <div class="wf-doc-modal-actions">
          <a id="wf-doc-modal-download" class="wf-doc-dl-btn" download target="_blank" rel="noopener">Download</a>
          <button class="wf-doc-modal-close" onclick="wfCloseDoc()" aria-label="Close">&times;</button>
        </div>
      </div>
      <iframe id="wf-doc-modal-frame" class="wf-doc-modal-frame" title="Document preview"></iframe>
    </div>`;
  modal.addEventListener('click', (e) => { if (e.target === modal) wfCloseDoc(); });
  document.body.appendChild(modal);
}

function wfOpenDoc(url, title) {
  wfEnsureDocModal();
  document.getElementById('wf-doc-modal-title').textContent = title || 'Document';
  document.getElementById('wf-doc-modal-frame').src = url;
  document.getElementById('wf-doc-modal-download').href = url;
  document.getElementById('wf-doc-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function wfCloseDoc() {
  const modal = document.getElementById('wf-doc-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  const frame = document.getElementById('wf-doc-modal-frame');
  if (frame) frame.src = '';
}

/* ═══════════════════════════════════════════════════════════
   DEADLINE QUIZ (shared engine; page supplies window.QUIZ_DATA
   as [{q, a:[...], c:correctIndex}, ...] and window.SC_ROLE as
   its progress-tracking role id, e.g. 'tc', 'listing')
   ═══════════════════════════════════════════════════════════ */
let quizIdx = 0, quizScore = 0, quizTimer = null, quizSec = 0, quizActive = false;

function quizStop() {
  clearInterval(quizTimer);
  quizActive = false;
}

function quizReset() {
  quizStop();
  document.getElementById('quiz-intro').style.display = 'block';
  document.getElementById('quiz-play').style.display = 'none';
  document.getElementById('quiz-done').style.display = 'none';
  var mc = document.getElementById('quiz-meta-count');
  if (mc && window.QUIZ_DATA) mc.textContent = QUIZ_DATA.length + ' Questions';
}

function quizStart() {
  quizIdx = 0; quizScore = 0; quizSec = 0; quizActive = true;
  document.getElementById('quiz-intro').style.display = 'none';
  document.getElementById('quiz-done').style.display = 'none';
  document.getElementById('quiz-play').style.display = 'block';
  clearInterval(quizTimer);
  quizTimer = setInterval(() => {
    if (!quizActive) return;
    quizSec++;
    const m = Math.floor(quizSec / 60), s = String(quizSec % 60).padStart(2, '0');
    document.getElementById('quiz-time-chip').textContent = m + ':' + s;
  }, 1000);
  quizRender();
}

function quizRender() {
  const data = window.QUIZ_DATA || [];
  const item = data[quizIdx];
  document.getElementById('quiz-num-chip').textContent = 'Q ' + (quizIdx + 1) + ' / ' + data.length;
  document.getElementById('quiz-score-chip').textContent = 'Score: ' + quizScore;
  document.getElementById('quiz-prog').style.width = (quizIdx / data.length * 100) + '%';
  let h = `<h3>${esc(item.q)}</h3>`;
  item.a.forEach((opt, i) => { h += `<button class="lc-choice" onclick="quizPick(${i})">${esc(opt)}</button>`; });
  h += `<div class="lc-fb" id="quiz-fb"></div><div id="quiz-nxt"></div>`;
  document.getElementById('quiz-body').innerHTML = h;
}

function quizPick(i) {
  const data = window.QUIZ_DATA || [];
  const item = data[quizIdx];
  const btns = document.querySelectorAll('#quiz-body .lc-choice');
  if (btns[0].disabled) return;
  btns.forEach((b, j) => {
    b.disabled = true;
    if (j === item.c) b.classList.add('correct');
    if (j === i && i !== item.c) b.classList.add('wrong');
  });
  const ok = i === item.c;
  if (ok) quizScore++;
  const fb = document.getElementById('quiz-fb');
  fb.className = 'lc-fb show ' + (ok ? 'good' : 'bad');
  fb.innerHTML = ok ? '<strong>Correct.</strong>' : '<strong>Correct answer:</strong> ' + esc(item.a[item.c]);
  document.getElementById('quiz-score-chip').textContent = 'Score: ' + quizScore;
  const nxt = document.getElementById('quiz-nxt');
  if (quizIdx < data.length - 1) {
    nxt.innerHTML = '<button class="lc-next-btn" onclick="quizAdvance()">Next &rarr;</button>';
  } else {
    nxt.innerHTML = '<button class="lc-next-btn gold" onclick="quizFinish()">See results &rarr;</button>';
  }
}

function quizAdvance() { quizIdx++; quizRender(); }

function quizFinish() {
  quizStop();
  const data = window.QUIZ_DATA || [];
  const pct = Math.round(quizScore / data.length * 100);
  const m = Math.floor(quizSec / 60), s = String(quizSec % 60).padStart(2, '0');
  document.getElementById('quiz-play').style.display = 'none';
  const band = pct >= 87 ? 'Pro-level knowledge.' : pct >= 67 ? 'Solid associate.' : 'Keep studying.';
  scProgress(window.SC_ROLE, 'quiz', quizScore);
  const dn = document.getElementById('quiz-done');
  dn.style.display = 'block';
  dn.innerHTML = `
    <div class="lc-result">
      <div class="lc-result-pct">${pct}%</div>
      <p><strong>${quizScore} / ${data.length}</strong> correct in <strong>${m}:${s}</strong></p>
      <p style="font-size:13px;color:var(--v-muted)">${esc(band)}</p>
      <div class="lc-result-actions">
        <button class="lc-result-btn primary" onclick="quizStart()">Retake quiz</button>
        <button class="lc-result-btn outline" onclick="closePanel('quiz')">Back to dashboard</button>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   PROMPT PRACTICE (shared engine; page supplies
   window.PROMPT_TEMPLATES as [{title,badge,category,desc,tip,
   template,vars:[{id,label,type,default}]}, ...] and
   window.SC_ROLE for progress tracking)
   ═══════════════════════════════════════════════════════════ */
let activePromptIdx = 0;

function initPromptPlayground() {
  promptRenderSidebar();
  selectPrompt(0);
}

function promptRenderSidebar() {
  const list = document.getElementById('prompt-list-scroll');
  if (!list) return;
  const templates = window.PROMPT_TEMPLATES || [];
  let lastCat = null, h = '';
  templates.forEach((p, i) => {
    if (p.category !== lastCat) {
      h += `<div class="prompt-category-label">${esc(p.category)}</div>`;
      lastCat = p.category;
    }
    const searchStr = (p.title + ' ' + p.desc + ' ' + p.badge).toLowerCase();
    h += `<button class="prompt-item-card${i === 0 ? ' active' : ''}" onclick="selectPrompt(${i})" data-index="${i}" data-cat="${esc(p.category)}" data-title="${esc(searchStr)}">
      <div class="prompt-card-top"><span class="prompt-card-badge">${esc(p.badge)}</span><span class="prompt-card-num">#${i + 1}</span></div>
      <h4 class="prompt-card-title">${esc(p.title)}</h4>
    </button>`;
  });
  list.innerHTML = h;
}

function selectPrompt(idx) {
  activePromptIdx = idx;
  document.querySelectorAll('.prompt-item-card').forEach((c, i) => c.classList.toggle('active', i === idx));

  const prompt = (window.PROMPT_TEMPLATES || [])[idx];
  const container = document.getElementById('prompt-detail-view');
  if (!container || !prompt) return;

  let varsHTML = '';
  prompt.vars.forEach(v => {
    if (v.type === 'textarea') {
      varsHTML += `<div class="prompt-var-field full-width"><label for="var-${v.id}">${esc(v.label)}</label><textarea id="var-${v.id}" rows="3" oninput="updatePromptPreview()">${esc(v.default)}</textarea></div>`;
    } else {
      varsHTML += `<div class="prompt-var-field"><label for="var-${v.id}">${esc(v.label)}</label><input type="text" id="var-${v.id}" value="${esc(v.default)}" oninput="updatePromptPreview()"></div>`;
    }
  });

  container.innerHTML = `
    <div class="prompt-detail-header">
      <span class="prompt-detail-badge">${esc(prompt.badge)}</span>
      <h3 class="prompt-detail-title">${esc(prompt.title)}</h3>
      <p class="prompt-detail-desc">${esc(prompt.desc)}</p>
    </div>
    <div>
      <h4 class="prompt-section-title">1. Customize Parameters</h4>
      <div class="prompt-vars-grid ${prompt.vars.length === 1 ? 'single-col' : ''}">${varsHTML}</div>
    </div>
    <div>
      <h4 class="prompt-section-title">2. Live Prompt Preview</h4>
      <div class="prompt-preview-container">
        <div class="prompt-preview-header"><span class="prompt-preview-title">Template Output</span></div>
        <textarea id="prompt-preview-text" class="prompt-preview-text" readonly></textarea>
      </div>
    </div>
    <div class="prompt-playground-actions">
      <button class="prompt-btn-copy" id="prompt-btn-copy" onclick="copyPromptToClipboard()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy Prompt
      </button>
    </div>
    <div class="prompt-tip-box">
      <div class="prompt-tip-icon">&#128161;</div>
      <div class="prompt-tip-content"><h5>Why this works</h5><p>${esc(prompt.tip)}</p></div>
    </div>`;

  updatePromptPreview();

  const role = window.SC_ROLE;
  const key = 'sc_' + role + '_prompt_viewed';
  let viewed = [];
  try { viewed = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { viewed = []; }
  if (!viewed.includes(idx)) {
    viewed.push(idx);
    localStorage.setItem(key, JSON.stringify(viewed));
    scProgress(role, 'prompt', Math.min(viewed.length, (window.PROMPT_TEMPLATES || []).length));
  }
}

function updatePromptPreview() {
  const prompt = (window.PROMPT_TEMPLATES || [])[activePromptIdx];
  if (!prompt) return;
  let text = prompt.template;
  prompt.vars.forEach(v => {
    const input = document.getElementById('var-' + v.id);
    const val = input ? input.value : v.default;
    text = text.split('[' + v.id + ']').join(val);
  });
  const textarea = document.getElementById('prompt-preview-text');
  if (textarea) textarea.value = text;
}

function copyPromptToClipboard() {
  const textarea = document.getElementById('prompt-preview-text');
  if (!textarea) return;
  textarea.select();
  try { document.execCommand('copy'); } catch (e) {}
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textarea.value).catch(() => {});
  }
  const btn = document.getElementById('prompt-btn-copy');
  if (btn) {
    const original = btn.innerHTML;
    btn.classList.add('copied');
    btn.innerHTML = 'Copied!';
    setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = original; }, 1500);
  }
}

function filterPrompts() {
  const searchEl = document.getElementById('prompt-search');
  const query = (searchEl ? searchEl.value : '').toLowerCase();
  document.querySelectorAll('.prompt-item-card').forEach(card => {
    const title = card.getAttribute('data-title') || '';
    card.style.display = title.includes(query) ? 'block' : 'none';
  });
  const cats = [...new Set(Array.from(document.querySelectorAll('.prompt-item-card')).map(c => c.getAttribute('data-cat')))];
  document.querySelectorAll('.prompt-category-label').forEach(lbl => {
    const cat = cats.find(c => c === lbl.textContent);
    if (!cat) return;
    const anyVisible = Array.from(document.querySelectorAll(`.prompt-item-card[data-cat="${cat}"]`)).some(c => c.style.display !== 'none');
    lbl.style.display = anyVisible ? '' : 'none';
  });
}

/* ── Embedded light decision point inside a narrative step ── */
function wfDecision(containerId, q, choices, fb, onDone) {
  const el = document.getElementById(containerId);
  if (!el) return;
  let h = `<div class="lc-scenario-box"><h3>${esc(q)}</h3>`;
  choices.forEach((ch, i) => { h += `<button class="lc-choice" onclick="wfDecisionPick('${containerId}',${i})">${esc(ch.t)}</button>`; });
  h += `<div class="lc-fb" id="${containerId}-fb"></div></div>`;
  el.innerHTML = h;
  el.dataset.choices = JSON.stringify(choices);
  el.dataset.fb = fb;
}
function wfDecisionPick(containerId, i) {
  const el = document.getElementById(containerId);
  const choices = JSON.parse(el.dataset.choices);
  if (el.dataset.answered) return;
  el.dataset.answered = '1';
  el.querySelectorAll('.lc-choice').forEach((b, j) => {
    b.disabled = true;
    if (choices[j].ok) b.classList.add('correct');
    if (j === i && !choices[j].ok) b.classList.add('wrong');
  });
  const fb = document.getElementById(containerId + '-fb');
  const ok = choices[i].ok;
  fb.className = 'lc-fb show ' + (ok ? 'good' : 'bad');
  fb.innerHTML = '<strong>' + (ok ? 'Right call.' : 'Worth reconsidering.') + '</strong> ' + esc(el.dataset.fb);
  if (wfActiveScenario) {
    wfActiveScenario._decisions = wfActiveScenario._decisions || [];
    wfActiveScenario._decisions.push({ correct: ok });
  }
}

/* ═══════════════════════════════════════════════════════════
   EVALUATION / PROGRESS SYSTEM (shared across every role page)
   ═══════════════════════════════════════════════════════════ */

/* Writes the best score seen for a given role+mode. Never regresses
   a user's progress — only overwrites if the new value is higher. */
function scProgress(role, modeId, value) {
  const key = 'sc_' + role + '_' + modeId;
  const current = parseInt(localStorage.getItem(key) || '0', 10);
  if (value > current) localStorage.setItem(key, String(value));
  return Math.max(value, current);
}

/* Marks one state/case as completed for the 'sim' mode without double
   counting repeat runs. stateKey is any string ('va', 'general', etc). */
function scMarkSimDone(role, stateKey, totalStates) {
  const key = 'sc_' + role + '_sim_states';
  let done = [];
  try { done = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { done = []; }
  if (!done.includes(stateKey)) done.push(stateKey);
  localStorage.setItem(key, JSON.stringify(done));
  scProgress(role, 'sim', Math.min(done.length, totalStates));
}

/* Reads back the decisions recorded during the current workflow run
   and returns a {correct, total, pct} summary. */
function wfScoreSummary() {
  const decisions = (wfActiveScenario && wfActiveScenario._decisions) || [];
  const total = decisions.length;
  const correct = decisions.filter(d => d.correct).length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 100;
  return { correct, total, pct };
}

/* Renders the real decision-accuracy score into a container and writes
   sim-mode progress. Call this from a workflow's final step, once,
   inside that step's wfAfterRender hook (same pattern as wfDecision). */
function wfRenderFinalScore(containerId, role, stateKey, totalStates) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const { correct, total, pct } = wfScoreSummary();
  scMarkSimDone(role, stateKey, totalStates);
  const band = total === 0 ? 'No graded decision points in this run.'
    : pct >= 80 ? 'Excellent decision-making on this file.'
      : pct >= 50 ? 'Solid work. Review the feedback on any decisions you missed.'
        : 'Worth revisiting the decision points before your next file.';
  el.innerHTML = total > 0
    ? `<div class="wf-eval-badge">
        <div class="wf-eval-pct">${pct}%</div>
        <div class="wf-eval-detail"><strong>${correct} of ${total}</strong> decision points correct<br>${esc(band)}</div>
      </div>`
    : `<div class="wf-eval-badge wf-eval-badge-neutral">
        <div class="wf-eval-detail">${esc(band)}</div>
      </div>`;
}
