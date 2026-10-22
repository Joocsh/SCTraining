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
/* The Introduction is required: until it is finished, the "complete the
   Introduction first" notes show and simulation links lead to it */
function introDone(){ return !!(window.SCApp && SCApp.isIntroDone()); }
window.addEventListener('DOMContentLoaded',()=>{
  if(introDone()) document.querySelectorAll('.fund-nudge').forEach(el=>el.style.display='none');
  document.querySelectorAll('.sim-locked-note').forEach(el=>{ el.hidden = introDone(); });
  document.body.classList.toggle('intro-done', introDone());
  /* simulations an admin closed and did not assign to this person */
  if(window.SCApp && SCApp.currentUser() && SCApp.hasSimulation){
    const SLUG={tc:'tc',pm:'lc',listing:'listing',lead:'lm',cfo:'cfo'};
    document.querySelectorAll('.slide[data-role]').forEach(sl=>{
      const slug=SLUG[sl.dataset.role]; if(!slug||SCApp.hasSimulation(slug)) return;
      const a=sl.querySelector('a.hb'); if(!a) return;
      a.removeAttribute('href'); a.setAttribute('aria-disabled','true'); a.textContent='Not assigned yet'; a.style.opacity='.6'; a.style.cursor='default';
    });
    const blocked=new URLSearchParams(location.search).get('nosim');
    if(blocked){
      const n=document.createElement('div');
      n.setAttribute('role','status');
      n.textContent='That simulation is not assigned to you yet. Your admin can give you access, and you will get a notification.';
      n.style.cssText='position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:300;background:#0a2647;color:#fff;border-radius:12px;padding:12px 18px;font-weight:700;font-size:14px;max-width:92vw;box-shadow:0 12px 30px rgba(10,38,71,.25)';
      document.body.appendChild(n); setTimeout(()=>n.remove(),6000);
    }
  }
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
