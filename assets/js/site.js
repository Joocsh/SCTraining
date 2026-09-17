/* shared nav toggle + tiny helpers */
function toggleMenu(){document.querySelector('.nav .menu').classList.toggle('open');}
document.addEventListener('click',e=>{
  if(e.target.closest('.nav')) return;
  const m=document.querySelector('.nav .menu.open'); if(m) m.classList.remove('open');
});
/* mark active nav link by filename */
window.addEventListener('DOMContentLoaded',()=>{
  const here=location.pathname.split('/').pop()||'index.html';
  document.querySelectorAll('.nav a.navlink').forEach(a=>{
    const t=a.getAttribute('href').split('/').pop();
    if(t===here) a.classList.add('active');
  });
});
/* Introduction first: hide the nudge once it is finished, and send anyone who
   has not finished it to the Introduction instead of into a simulation */
function introDone(){ return !!(window.SCApp && SCApp.isIntroDone()); }
window.addEventListener('DOMContentLoaded',()=>{
  if(introDone()){
    document.querySelectorAll('.fund-nudge').forEach(el=>el.style.display='none');
  }
  document.querySelectorAll('.sim-locked-note').forEach(el=>{ el.hidden = introDone(); });
  document.body.classList.toggle('intro-done', introDone());
});
document.addEventListener('click',e=>{
  const btn=e.target.closest('.role-gate-btn, a[href^="roles/"], a[href^="../roles/"]');
  if(!btn) return;
  if(window.SCApp && !SCApp.currentUser()){
    e.preventDefault();
    window.location.href=SCApp.loginUrl('index.html#simulations');
    return;
  }
  if(!introDone() && /roles\//.test(btn.getAttribute('href')||'')){
    e.preventDefault();
    window.location.href=(location.pathname.indexOf('/roles/')>-1?'../':'')+'ai.html?locked=simulations';
  }
});
