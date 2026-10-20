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
/* The Introduction is optional: the simulations are open to every signed in
   associate, so the old "complete the Introduction first" notes stay hidden */
function introDone(){ return !!(window.SCApp && SCApp.isIntroDone()); }
window.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.fund-nudge').forEach(el=>el.style.display='none');
  document.querySelectorAll('.sim-locked-note').forEach(el=>{ el.hidden = true; });
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
});
