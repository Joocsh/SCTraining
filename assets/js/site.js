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
/* Fundamentals-first nudge: mark done on ai.html, hide the nudge banner once seen */
const FUND_KEY='scc_fundamentals_done';
if(document.body.dataset.page==='fundamentals'){
  localStorage.setItem(FUND_KEY,'1');
}
window.addEventListener('DOMContentLoaded',()=>{
  if(localStorage.getItem(FUND_KEY)==='1'){
    document.querySelectorAll('.fund-nudge').forEach(el=>el.style.display='none');
  }
});
/* Gate "Choose Your Role" buttons: require login, then Fundamentals, before role access */
document.addEventListener('click',e=>{
  const btn=e.target.closest('.role-gate-btn');
  if(!btn) return;
  if(window.SCApp && !SCApp.currentUser()){
    e.preventDefault();
    window.location.href=SCApp.loginUrl('index.html'+(btn.getAttribute('href')||''));
    return;
  }
  if(localStorage.getItem(FUND_KEY)!=='1'){
    e.preventDefault();
    window.location.href='ai.html';
  }
});
