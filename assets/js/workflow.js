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

var WF_STATE_KEY = 'sc_wf_state';
function _wfSaveState() {
  try {
    var scenarios = simDataForState();
    var caseIdx = scenarios && wfActiveScenario ? scenarios.indexOf(wfActiveScenario) : -1;
    localStorage.setItem(WF_STATE_KEY, JSON.stringify({
      city: simState,
      caseIdx: caseIdx,
      step: wfStep,
      maxStep: _wfMaxStep
    }));
  } catch (e) {}
}
function _wfClearState() {
  try { localStorage.removeItem(WF_STATE_KEY); } catch (e) {}
}
function _wfLoadState() {
  try {
    var raw = localStorage.getItem(WF_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

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

    _wfClearState();
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
  const pickEl = document.getElementById('sim-pick');
  if (pickEl) pickEl.style.display = 'block';
  const stateObj = window.SIM_STATES && window.SIM_STATES.find(s => s.key === key);
  const stateLabel = stateObj ? stateObj.label : (key ? key.toUpperCase() : '');
  const chipText = document.getElementById('sim-location-chip-text');
  if (chipText) {
    chipText.textContent = key === 'ca' ? 'California · 4827 Rolando Blvd' : (stateLabel + ' Market Case');
  }
  const heroTitle = document.getElementById('sim-hero-title');
  if (heroTitle) {
    heroTitle.textContent = stateLabel + ' Real Estate Case File';
  }
  simRenderCards();
}

function simBackToCities() {
  _wfClearState();
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
    if (isWF) {
      const isCA = simState === 'ca' || (sc.title && sc.title.includes('Rolando'));
      const specs = sc.specs || (isCA ? [
        { label: 'List Price', value: '$889,000' },
        { label: 'Sellers', value: 'Daniel &amp; Carmen Herrera' },
        { label: 'Escrow Scope', value: '10 End-to-End Steps' },
        { label: 'Key TC Scope', value: 'NAR Split, Solar, Wire Defense' }
      ] : [
        { label: 'Workflow', value: (sc.stepCount || 8) + ' Steps End-to-End' },
        { label: 'Role', value: 'Transaction Coordinator' },
        { label: 'Milestone', value: 'Executed Contract &rarr; Close' },
        { label: 'Scope', value: 'Real Client Emails &amp; Forms' }
      ]);

      const specsHtml = specs.map(s => `
        <div class="wf-card-spec-item">
          <span class="wf-spec-label">${esc(s.label)}</span>
          <span class="wf-spec-value">${s.value}</span>
        </div>
      `).join('');

      card.innerHTML = `
        <div class="wf-card-topbar">
          <span class="lc-sc-tag">${isCA ? '🌴 ' : ''}${esc(sc.tag)}</span>
          <span class="wf-card-steps-pill">&#9889; ${sc.stepCount || 10} Progressive Phases</span>
        </div>
        <div class="wf-card-main-content">
          <div class="wf-card-property-header">
            <h3 class="wf-card-title">${esc(sc.title)}</h3>
            <div class="wf-card-subtitle">${isCA ? 'San Diego, CA 92115 &middot; Single-Family Residence' : 'Real-World Client File &middot; Active Escrow'}</div>
          </div>
          <p class="wf-card-desc">${esc(sc.desc)}</p>
          <div class="wf-card-specs-grid">
            ${specsHtml}
          </div>
          <div class="wf-card-footer">
            <button type="button" class="wf-card-cta-btn">
              <span>Start the simulation</span>
              <span class="wf-cta-arr">&rarr;</span>
            </button>
            <div class="wf-card-guarantee">
              <span class="wf-guarantee-icon">&#10004;</span>
              <span>Authentic client emails, Zipforms drafting &amp; escrow audit trail</span>
            </div>
          </div>
        </div>
      `;
    } else {
      const badge = `<span class="lc-sc-steps-badge">${sc.steps.length} decisions</span>`;
      card.innerHTML = `<div class="lc-sc-tag">${esc(sc.tag)}</div>
        <h4>${esc(sc.title)}</h4>
        <p>${esc(sc.desc)}</p>
        ${badge}`;
    }
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

function wfStart(sc, restoreStep) {
  wfStep = (typeof restoreStep === 'number' && restoreStep > 0) ? restoreStep : 0;
  wfActiveScenario = sc || null;
  wfActiveLabels = (sc && sc.wfLabels) || window.WF_LABELS;
  wfActiveSteps = (sc && sc.wfSteps) || window.WF_STEPS;
  if (wfActiveScenario) wfActiveScenario._decisions = [];
  if (!restoreStep) {
    if (sc && typeof sc.onReset === 'function') {
      try { sc.onReset(); } catch (e) {}
    }
    if (typeof window.caNewResetCase === 'function') {
      try { window.caNewResetCase(); } catch (e) {}
    }
  }
  simPickCenterToggle(false);
  document.getElementById('sim-pick').style.display = 'none';
  const playEl = document.getElementById('sim-play');
  if (playEl) playEl.style.display = 'none';
  document.getElementById('sim-workflow').style.display = 'block';

  /* Pipeline mode detection: show pipeline stepper or fallback scorebar */
  const isPipeline = wfActiveScenario && wfActiveScenario.usePipeline;
  const pipeEl = document.getElementById('wf-pipeline');
  const fallbackEl = document.getElementById('wf-scorebar-fallback');
  const scoreEl = document.getElementById('wf-score-float');
  if (pipeEl) pipeEl.style.display = isPipeline ? '' : 'none';
  if (fallbackEl) fallbackEl.style.display = isPipeline ? 'none' : '';
  if (scoreEl) scoreEl.style.display = 'none';

  if (typeof wfEnsureFloatingActions === 'function') {
    wfEnsureFloatingActions();
    var fabStack = document.getElementById('wf-fab-stack');
    if (fabStack) fabStack.style.display = 'flex';
  }

  wfRender();
}

function wfRestartCase() {
  if (!confirm('Are you sure you want to reset this case to the beginning? All your entered answers and progress will be cleared.')) {
    return;
  }
  wfStep = 0;
  _wfMaxStep = 0;
  _wfClearState();
  if (wfActiveScenario) {
    wfActiveScenario._decisions = [];
    wfActiveScenario._mh = {};
    wfActiveScenario._mhFor = null;
    if (typeof wfActiveScenario.onReset === 'function') {
      try { wfActiveScenario.onReset(); } catch (e) {}
    }
  }
  if (typeof window.caNewResetCase === 'function') {
    try { window.caNewResetCase(); } catch (e) {}
  }
  window._caNewSlide0 = 0;
  window._caNewCurSlide1 = 0;
  window._caNewDeckState1 = null;
  wfRender();
  if (typeof caNewGoSlide === 'function') {
    caNewGoSlide(0);
  }
  setTimeout(function () {
    var topEl = document.querySelector('.mh-top') || document.getElementById('sim-workflow');
    if (topEl) topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 60);
}

function wfRestart() {
  wfRestartCase();
}

function wfReset() {
  _wfClearState();
  if (wfActiveScenario && typeof wfActiveScenario.onReset === 'function') {
    try { wfActiveScenario.onReset(); } catch (e) {}
  }
  if (typeof window.caNewResetCase === 'function') {
    try { window.caNewResetCase(); } catch (e) {}
  }
  document.getElementById('sim-workflow').style.display = 'none';
  simPickCenterToggle(true);
  document.getElementById('sim-pick').style.display = 'block';
  simRenderCards();

  /* Clean up pipeline UI elements */
  var scoreEl = document.getElementById('wf-score-float');
  if (scoreEl) scoreEl.style.display = 'none';
  var notifEl = document.getElementById('wf-notif-container');
  if (notifEl) notifEl.innerHTML = '';
  var fabStack = document.getElementById('wf-fab-stack');
  if (fabStack) fabStack.style.display = 'none';
  var fab = document.getElementById('wf-hint-fab');
  if (fab) fab.style.display = 'none';
  _wfMaxStep = 0;
  wfCloseDocSidebar();
  wfCloseHintPanel();
}

function wfNext() {
  if (wfStep < wfActiveLabels.length - 1) { wfStep++; wfRender(); }
}
function wfPrev() {
  if (wfStep > 0) { wfStep--; wfRender(); }
}

function wfRender() {
  const total = wfActiveLabels.length;
  const isPipeline = wfActiveScenario && wfActiveScenario.usePipeline;
  
  const pipeEl = document.getElementById('wf-pipeline');
  const fallbackEl = document.getElementById('wf-scorebar-fallback');
  const stepChip = document.getElementById('wf-step-chip');
  const labelChip = document.getElementById('wf-label-chip');
  const progFill = document.getElementById('wf-prog');
  
  if (isPipeline) {
    if (pipeEl) pipeEl.style.display = '';
    if (fallbackEl) fallbackEl.style.display = 'none';
    wfRenderPipeline(wfStep, total, wfActiveLabels);
  } else {
    if (pipeEl) pipeEl.style.display = 'none';
    if (fallbackEl) fallbackEl.style.display = '';
    if (stepChip) stepChip.textContent = 'Step ' + (wfStep + 1) + ' of ' + total;
    if (labelChip) labelChip.textContent = wfActiveLabels[wfStep];
    if (progFill) progFill.style.width = ((wfStep + 1) / total * 100) + '%';
  }

  document.getElementById('wf-body').innerHTML = wfActiveSteps[wfStep]();
  wfUpdateScore();

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
  /* Some steps need a small bit of JS to run after their HTML is inserted */
  const afterRender = (wfActiveScenario && wfActiveScenario.wfAfterRender) || window.WF_AFTER_RENDER;
  if (afterRender && afterRender[wfStep]) {
    afterRender[wfStep]();
  }

  _wfSaveState();
}

/* ═══════════════════════════════════════════════════════════
   PIPELINE STEPPER, NOTIFICATIONS, SCORE TRACKER, DOC SIDEBAR & HINTS
   ═══════════════════════════════════════════════════════════ */

let _wfMaxStep = 0;

function wfGoToStep(idx) {
  if (idx >= 0 && idx < wfActiveLabels.length && idx <= Math.max(_wfMaxStep, wfStep)) {
    wfStep = idx;
    wfRender();
  }
}

function wfRenderPipeline(step, total, labels) {
  const pipeEl = document.getElementById('wf-pipeline');
  if (!pipeEl) return;
  _wfMaxStep = Math.max(_wfMaxStep, step);
  
  let html = '<div class="wf-pipeline-track">';
  labels.forEach(function (lbl, i) {
    const state = i < step ? 'done' : (i === step ? 'active' : 'upcoming');
    const isClickable = i <= _wfMaxStep;
    html += '<div class="wf-pipe-step ' + state + '" ' + (isClickable ? 'onclick="wfGoToStep(' + i + ')"' : 'style="cursor:not-allowed"') + ' title="Step ' + (i + 1) + ': ' + esc(lbl) + '">';
    html += '<div class="wf-pipe-node">';
    html += '<span class="wf-pipe-num">' + (i + 1) + '</span>';
    html += '<span class="wf-pipe-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></span>';
    html += '</div>';
    if (i < total - 1) {
      html += '<div class="wf-pipe-connector"></div>';
    }
    html += '<div class="wf-pipe-label">' + esc(lbl) + '</div>';
    html += '</div>';
  });
  html += '</div>';
  pipeEl.innerHTML = html;
  
  if (pipeEl.querySelector) {
    const activeNode = pipeEl.querySelector('.wf-pipe-step.active');
    if (activeNode && pipeEl.scrollWidth > pipeEl.clientWidth) {
      activeNode.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }
}

function wfNotify() {
  /* Notifications disabled per user request */
}

function wfUpdateScore() {
  /* Floating accuracy badge removed per user request */
  const scoreEl = document.getElementById('wf-score-float');
  if (scoreEl) scoreEl.style.display = 'none';
}

function wfOpenDocSidebar(url, title) {
  // Always open in centered modal popup per user request
  wfOpenDoc(url, title);
}

function wfCloseDocSidebar() {
  wfCloseDoc();
}

function wfToggleDocSidebar(url, title) {
  const modal = document.getElementById('wf-doc-modal');
  if (modal && modal.classList.contains('open')) {
    wfCloseDoc();
  } else {
    wfOpenDoc(url, title);
  }
}

/* Floating Actions Stack ("Ask Sofia", "Reset Case", "Salir a los escenarios") */
function wfEnsureFloatingActions() {
  let stack = document.getElementById('wf-fab-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'wf-fab-stack';
    stack.className = 'wf-fab-stack';

    // 1. Sofia Hint FAB
    const fabSofia = document.createElement('button');
    fabSofia.type = 'button';
    fabSofia.id = 'wf-hint-fab';
    fabSofia.className = 'wf-hint-fab';
    fabSofia.setAttribute('aria-label', 'Ask Sofia');
    fabSofia.setAttribute('title', 'Ask Sofia');
    fabSofia.onclick = wfToggleHintPanel;
    fabSofia.innerHTML = '<span>💡</span><span class="wf-hint-fab-label">Ask Sofia</span>';
    stack.appendChild(fabSofia);

    // 2. Notepad FAB
    const fabNotes = document.createElement('button');
    fabNotes.type = 'button';
    fabNotes.id = 'wf-notes-fab';
    fabNotes.className = 'wf-fab-btn wf-fab-notes';
    fabNotes.setAttribute('aria-label', 'Notepad');
    fabNotes.setAttribute('title', 'Notepad');
    fabNotes.onclick = wfToggleNotesPanel;
    fabNotes.innerHTML = '<span class="wf-fab-icon">&#128221;</span><span class="wf-hint-fab-label">Notepad</span>';
    stack.appendChild(fabNotes);

    // 3. Reset Case FAB
    const fabReset = document.createElement('button');
    fabReset.type = 'button';
    fabReset.id = 'wf-reset-fab';
    fabReset.className = 'wf-fab-btn wf-fab-reset';
    fabReset.setAttribute('aria-label', 'Reiniciar caso');
    fabReset.setAttribute('title', 'Reiniciar caso al inicio');
    fabReset.onclick = wfRestartCase;
    fabReset.innerHTML = '<span class="wf-fab-icon">&#8635;</span><span class="wf-hint-fab-label">Reiniciar caso</span>';
    stack.appendChild(fabReset);

    // 3. Salir a Escenarios FAB
    const fabExit = document.createElement('button');
    fabExit.type = 'button';
    fabExit.id = 'wf-exit-fab';
    fabExit.className = 'wf-fab-btn wf-fab-exit';
    fabExit.setAttribute('aria-label', 'Salir a los escenarios');
    fabExit.setAttribute('title', 'Salir a los escenarios');
    fabExit.onclick = wfReset;
    fabExit.innerHTML = '<span class="wf-fab-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></span><span class="wf-hint-fab-label">Salir a los escenarios</span>';
    stack.appendChild(fabExit);

    document.body.appendChild(stack);
  }
  return stack;
}

/* Hint System ("Ask Sofia") */
let wfCurrentHints = null;

function wfSetHints(hints) {
  wfCurrentHints = hints;
  const stack = wfEnsureFloatingActions();
  stack.style.display = 'flex';
  const fabSofia = document.getElementById('wf-hint-fab');
  if (fabSofia) {
    fabSofia.style.display = (hints && hints.length) ? 'flex' : 'none';
  }
  if (!hints || !hints.length) {
    wfCloseHintPanel();
    return;
  }
  wfRenderHintPanel();
}

function wfEnsureHintPanel() {
  let panel = document.getElementById('wf-hint-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'wf-hint-panel';
    panel.className = 'wf-hint-panel';
    document.body.appendChild(panel);
  }
  return panel;
}

function wfRenderHintPanel() {
  const panel = wfEnsureHintPanel();
  if (!wfCurrentHints || !wfCurrentHints.length) {
    panel.style.display = 'none';
    return;
  }
  const tierLabels = [
    { name: 'Nudge', cls: 'nudge', title: 'Quick Nudge' },
    { name: 'Guidance', cls: 'guidance', title: 'Detailed Guidance' },
    { name: 'Answer', cls: 'answer', title: 'Full Solution' }
  ];
  
  let html =
    '<div class="wf-hint-panel-header">' +
      '<div class="wf-hint-panel-avatar">SR</div>' +
      '<div>' +
        '<div class="wf-hint-panel-name">Sofia Reyes</div>' +
        '<div class="wf-hint-panel-role">Listing Agent &middot; Mentor</div>' +
      '</div>' +
      '<button type="button" class="wf-hint-panel-close" onclick="wfCloseHintPanel()" aria-label="Close">&times;</button>' +
    '</div>' +
    '<div id="wf-hint-tiers">';
  
  wfCurrentHints.forEach(function (hintText, idx) {
    const t = tierLabels[idx] || { name: 'Hint', cls: 'nudge', title: 'Hint ' + (idx + 1) };
    html +=
      '<div class="wf-hint-tier">' +
        '<button type="button" class="wf-hint-tier-btn" id="wf-hint-btn-' + idx + '" onclick="wfRevealHintTier(' + idx + ')">' +
          '<span class="wf-hint-tier-badge ' + t.cls + '">' + t.name + '</span>' +
          '<span>' + t.title + '</span>' +
        '</button>' +
        '<div class="wf-hint-content" id="wf-hint-content-' + idx + '">' + esc(hintText) + '</div>' +
      '</div>';
  });
  html += '</div>';
  panel.innerHTML = html;
}

function wfRevealHintTier(idx) {
  const content = document.getElementById('wf-hint-content-' + idx);
  const btn = document.getElementById('wf-hint-btn-' + idx);
  if (content) content.classList.toggle('show');
  if (btn) btn.classList.add('used');
}

function wfOpenHintPanel() {
  const panel = wfEnsureHintPanel();
  panel.classList.add('open');
}

function wfCloseHintPanel() {
  const panel = document.getElementById('wf-hint-panel');
  if (panel) panel.classList.remove('open');
}

function wfToggleHintPanel() {
  const panel = wfEnsureHintPanel();
  panel.classList.toggle('open');
}

/* Notepad System */
function wfEnsureNotesPanel() {
  let panel = document.getElementById('wf-notes-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'wf-notes-panel';
    panel.className = 'wf-notes-panel';
    panel.innerHTML =
      '<div class="wf-notes-panel-header">' +
        '<div class="wf-notes-panel-title">&#128221; My Notes</div>' +
        '<button type="button" class="wf-notes-panel-close" onclick="wfCloseNotesPanel()" aria-label="Close">&times;</button>' +
      '</div>' +
      '<textarea id="wf-notes-textarea" class="wf-notes-textarea" placeholder="Take notes here &mdash; you\'ll need these details in later steps..."></textarea>';
    document.body.appendChild(panel);

    const ta = panel.querySelector('#wf-notes-textarea');
    if (ta) {
      ta.addEventListener('input', function () {
        try { localStorage.setItem('sc_tc_ca_notepad', ta.value); } catch (e) {}
      });
    }
  }
  return panel;
}

function wfOpenNotesPanel() {
  const panel = wfEnsureNotesPanel();
  const ta = panel.querySelector('#wf-notes-textarea');
  if (ta) {
    try { ta.value = localStorage.getItem('sc_tc_ca_notepad') || ''; } catch (e) {}
  }
  panel.classList.add('open');
}

function wfCloseNotesPanel() {
  const panel = document.getElementById('wf-notes-panel');
  if (panel) panel.classList.remove('open');
}

function wfToggleNotesPanel() {
  const panel = wfEnsureNotesPanel();
  if (panel.classList.contains('open')) {
    wfCloseNotesPanel();
  } else {
    wfOpenNotesPanel();
  }
}

function wfConfetti() {
  const wrap = document.createElement('div');
  wrap.className = 'wf-confetti-wrap';
  const colors = ['#17c3d4', '#1f9e5a', '#e0a93b', '#7c3aed', '#0a2647', '#ff5964'];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'wf-confetti-piece';
    piece.style.left = (Math.random() * 100) + 'vw';
    piece.style.top = '-10px';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = (Math.random() * 0.8) + 's';
    piece.style.animationDuration = (1 + Math.random() * 0.8) + 's';
    piece.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
    wrap.appendChild(piece);
  }
  document.body.appendChild(wrap);
  setTimeout(function () { wrap.remove(); }, 2500);
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

let _wfDocState = { pdfUrl: '', htmlUrl: '', mode: 'pdf', title: '' };

function wfToggleDocMaximize() {
  const modal = document.getElementById('wf-doc-modal');
  if (!modal) return;
  modal.classList.toggle('wf-modal-maximized');
  const isMax = modal.classList.contains('wf-modal-maximized');
  const label = document.getElementById('wf-doc-max-label');
  const icon = document.getElementById('wf-doc-max-icon');
  if (label) label.textContent = isMax ? 'Restaurar' : 'Maximizar';
  if (icon) {
    icon.innerHTML = isMax
      ? '<path d="M4 14h6v6m10-10h-6V4m0 6 7-7M3 21l7-7"/>'
      : '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>';
  }
}

function wfSwitchDocMode(mode) {
  _wfDocState.mode = mode;
  const frame = document.getElementById('wf-doc-modal-frame');
  const tabPdf = document.getElementById('wf-doc-tab-pdf');
  const tabWeb = document.getElementById('wf-doc-tab-web');
  const badge = document.getElementById('wf-doc-modal-badge');
  const nt = document.getElementById('wf-doc-modal-newtab');
  const dl = document.getElementById('wf-doc-modal-download');
  const hint = document.getElementById('wf-doc-hint-pill');

  if (mode === 'web' && _wfDocState.htmlUrl) {
    if (tabPdf) tabPdf.classList.remove('active');
    if (tabWeb) tabWeb.classList.add('active');
    if (badge) { badge.textContent = 'WEB'; badge.className = 'wf-doc-badge-pdf web'; }
    if (frame) frame.src = _wfDocState.htmlUrl;
    if (nt) nt.href = _wfDocState.htmlUrl;
    if (dl) dl.href = _wfDocState.pdfUrl;
    if (hint) hint.style.display = 'none';
  } else {
    if (tabPdf) tabPdf.classList.add('active');
    if (tabWeb) tabWeb.classList.remove('active');
    if (badge) { badge.textContent = 'PDF'; badge.className = 'wf-doc-badge-pdf'; }
    let frameUrl = _wfDocState.pdfUrl;
    if (frameUrl && frameUrl.toLowerCase().includes('.pdf') && !frameUrl.includes('#')) {
      frameUrl += '#view=FitH';
    }
    if (frame) frame.src = frameUrl;
    if (nt) nt.href = _wfDocState.pdfUrl;
    if (dl) dl.href = _wfDocState.pdfUrl;
    if (hint) hint.style.display = '';
  }
}

function wfEnsureDocModal() {
  if (document.getElementById('wf-doc-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'wf-doc-modal';
  modal.className = 'wf-doc-modal';
  modal.innerHTML = `
    <div class="wf-doc-modal-inner">
      <div class="wf-doc-modal-header">
        <div class="wf-doc-modal-title-wrap">
          <span class="wf-doc-badge-pdf" id="wf-doc-modal-badge">PDF</span>
          <span class="wf-doc-modal-title" id="wf-doc-modal-title">Document</span>
          <span class="wf-doc-hint-pill" id="wf-doc-hint-pill" title="Tip: En la barra del visor de PDF, haz clic en el icono [↔] para ajustar al ancho completo">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            <span>Tip: Usa <b>↔</b> para ancho completo</span>
          </span>
        </div>
        <div class="wf-doc-modal-actions">
          <div class="wf-doc-toggle-group" id="wf-doc-toggle-group" style="display:none;">
            <button type="button" class="wf-doc-toggle-btn active" id="wf-doc-tab-pdf" onclick="wfSwitchDocMode('pdf')" title="Ver formato oficial PDF">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>PDF</span>
            </button>
            <button type="button" class="wf-doc-toggle-btn" id="wf-doc-tab-web" onclick="wfSwitchDocMode('web')" title="Ver texto limpio y nítido">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span>Vista Lectura</span>
            </button>
          </div>
          <button type="button" class="wf-doc-action-btn" id="wf-doc-modal-max" onclick="wfToggleDocMaximize()" title="Maximizar / Pantalla completa">
            <svg id="wf-doc-max-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            <span id="wf-doc-max-label">Maximizar</span>
          </button>
          <a id="wf-doc-modal-newtab" class="wf-doc-action-btn" target="_blank" rel="noopener" title="Open in new window">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            <span>New Tab</span>
          </a>
          <a id="wf-doc-modal-download" class="wf-doc-action-btn primary" download target="_blank" rel="noopener" title="Download PDF">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Download</span>
          </a>
          <button class="wf-doc-modal-close" onclick="wfCloseDoc()" aria-label="Close" title="Close (Esc)">&times;</button>
        </div>
      </div>
      <iframe id="wf-doc-modal-frame" class="wf-doc-modal-frame" title="Document preview"></iframe>
    </div>`;
  modal.addEventListener('click', (e) => { if (e.target === modal) wfCloseDoc(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const m = document.getElementById('wf-doc-modal');
      if (m && m.classList.contains('open')) wfCloseDoc();
    }
  });
  document.body.appendChild(modal);
}

function wfOpenDoc(url, title) {
  wfEnsureDocModal();
  const titleEl = document.getElementById('wf-doc-modal-title');
  if (titleEl) titleEl.textContent = title || 'Document';

  let htmlUrl = '';
  const isPdf = url && url.toLowerCase().includes('.pdf');
  if (isPdf && url.includes('/tc-ca-new/')) {
    htmlUrl = url.replace('/tc-ca-new/', '/tc-ca-new/html/').replace('.pdf', '.html');
  }

  _wfDocState = {
    pdfUrl: url,
    htmlUrl: htmlUrl,
    mode: 'pdf',
    title: title || 'Document'
  };

  const toggleGroup = document.getElementById('wf-doc-toggle-group');
  if (toggleGroup) {
    toggleGroup.style.display = htmlUrl ? 'inline-flex' : 'none';
  }

  wfSwitchDocMode('pdf');

  const modal = document.getElementById('wf-doc-modal');
  if (modal) modal.classList.add('open');
  document.body.classList.add('wf-modal-open');
}

function wfCloseDoc() {
  const modal = document.getElementById('wf-doc-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.classList.remove('wf-modal-maximized');
  }
  const label = document.getElementById('wf-doc-max-label');
  if (label) label.textContent = 'Maximizar';
  document.body.classList.remove('wf-modal-open');
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
