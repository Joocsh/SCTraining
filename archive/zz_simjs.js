document.querySelectorAll('.tab[data-mode]').forEach(t=>{
  t.onclick=()=>{
    document.querySelectorAll('.tab[data-mode]').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    document.getElementById(t.dataset.mode).classList.add('active');
  };
});
const esc=s=>String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
let scCat='deals', scItem=null, scIdx=0, scRight=0, scAnswered=false;
document.querySelectorAll('.cat[data-cat]').forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll('.cat[data-cat]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); scCat=b.dataset.cat; scCards();
  };
});
function scCards(){
  const c=document.getElementById('sc-cards'); c.innerHTML='';
  if(scCat==='deals'){
    Object.keys(DEALS).forEach(k=>{
      const d=DEALS[k];
      const el=document.createElement('div'); el.className='card link'; el.style.cursor='pointer';
      el.onclick=()=>scStart(d,'deal');
      el.innerHTML='<span class="code-badge">'+d.code+'</span><h3 style="margin:12px 0 4px">'+esc(d.state)+'</h3>'+
        '<p class="small muted">'+esc(d.address)+'</p>'+
        '<p class="small"><b>Buyers:</b> '+esc(d.buyers)+'<br><b>Price:</b> '+d.price+'</p>'+
        '<span class="badge state">'+d.steps.length+' decisions</span>';
      c.appendChild(el);
    });
  } else {
    SCENARIOS.forEach(s=>{
      const el=document.createElement('div'); el.className='card link'; el.style.cursor='pointer';
      el.onclick=()=>scStart(s,'scn');
      el.innerHTML='<span class="scn-tag">'+esc(s.cat)+'</span>'+
        '<h3 style="margin:10px 0 4px">'+esc(s.title)+'</h3>'+
        '<p class="small muted">'+esc(s.role)+'</p>'+
        '<span class="badge state">'+s.steps.length+' decisions</span>';
      c.appendChild(el);
    });
  }
}
function scStart(item,type){
  scItem=item; scIdx=0; scRight=0;
  document.getElementById('sc-pick').style.display='none';
  document.getElementById('sc-play').style.display='block';
  let head;
  if(type==='deal'){
    head='<h2>'+esc(item.state)+' — '+esc(item.address)+'</h2>'+
      '<div class="callout info" style="margin-top:6px"><b>The file:</b> '+esc(item.buyers)+' (buyers) · '+esc(item.seller)+' (seller) · '+item.price+
      '<br><span class="small muted">'+esc(item.form)+' · '+esc(item.facts)+'</span></div>';
  } else {
    head='<span class="scn-tag">'+esc(item.cat)+'</span>'+
      '<h2 style="margin-top:8px">'+esc(item.title)+'</h2>'+
      '<div class="callout info"><b>Scenario:</b> '+esc(item.context)+'</div>';
  }
  document.getElementById('sc-head').innerHTML=head;
  scRender();
}
function scRender(){
  const step=scItem.steps[scIdx]; scAnswered=false;
  document.getElementById('sc-step').textContent='Step '+(scIdx+1)+' of '+scItem.steps.length;
  document.getElementById('sc-score').textContent='Correct: '+scRight+'/'+scItem.steps.length;
  document.getElementById('sc-bar').style.width=(scIdx/scItem.steps.length*100)+'%';
  let h='<h3>'+esc(step.q)+'</h3>';
  step.choices.forEach((ch,i)=>h+='<button class="choice" onclick="scPick('+i+')">'+esc(ch.t)+'</button>');
  h+='<div class="fb" id="sc-fb"></div><div id="sc-next"></div>';
  document.getElementById('sc-body').innerHTML=h;
}
function scPick(i){
  if(scAnswered)return; scAnswered=true;
  const step=scItem.steps[scIdx];
  const btns=document.querySelectorAll('#sc-body .choice');
  btns.forEach((b,j)=>{b.disabled=true; if(step.choices[j].ok)b.classList.add('correct'); if(j===i&&!step.choices[j].ok)b.classList.add('wrong');});
  const ok=step.choices[i].ok; if(ok)scRight++;
  const fb=document.getElementById('sc-fb'); fb.className='fb show '+(ok?'good':'bad');
  fb.innerHTML='<b>'+(ok?'Right call.':'Not the best call.')+'</b> '+esc(step.fb);
  document.getElementById('sc-score').textContent='Correct: '+scRight+'/'+scItem.steps.length;
  const nx=document.getElementById('sc-next');
  if(scIdx<scItem.steps.length-1) nx.innerHTML='<button class="btn" style="margin-top:14px" onclick="scAdvance()">Next decision &rarr;</button>';
  else nx.innerHTML='<button class="btn gold" style="margin-top:14px" onclick="scFinish()">See results &rarr;</button>';
}
function scAdvance(){scIdx++; scRender();}
function scFinish(){
  const pct=Math.round(scRight/scItem.steps.length*100);
  document.getElementById('sc-bar').style.width='100%';
  let msg = pct>=80?'Excellent — you handled this like a seasoned pro.':pct>=50?'Solid. Review the feedback on the ones you missed.':'Keep practicing — revisit the playbook and try again.';
  document.getElementById('sc-body').innerHTML=
    '<div class="result"><div class="big">'+pct+'%</div>'+
    '<p><b>'+scRight+' of '+scItem.steps.length+'</b> right calls.</p>'+
    '<p class="muted">'+msg+'</p>'+
    '<button class="btn" onclick="scStart(scItem,scItem.address?\'deal\':\'scn\')">Replay</button>'+
    '<button class="btn outline" onclick="scReset()">Back to scenarios</button></div>';
}
function scReset(){
  document.getElementById('sc-play').style.display='none';
  document.getElementById('sc-pick').style.display='block';
}
let sbIdx=0, sbScore=0;
function sbRender(){
  const p=PROMPTS[sbIdx];
  document.getElementById('sb-count').textContent='Scenario '+(sbIdx+1)+' of '+PROMPTS.length;
  document.getElementById('sb-body').innerHTML=
    '<span class="badge">'+esc(p.role)+'</span>'+
    '<h3 style="margin-top:8px">'+esc(p.task)+'</h3>'+
    '<label class="small muted">Write your prompt:</label>'+
    '<textarea class="answer" id="sb-input" placeholder="You are a... Draft/Write/Summarize..."></textarea>'+
    '<button class="btn sm" style="margin-top:10px" onclick="sbReveal()">Reveal model answer</button>'+
    '<div class="reveal" id="sb-reveal"></div>';
}
function sbReveal(){
  const p=PROMPTS[sbIdx];
  document.getElementById('sb-reveal').innerHTML=
    '<div class="prompt"><span class="lbl">WEAK PROMPT</span>'+esc(p.weak)+'</div>'+
    '<div class="prompt"><span class="lbl">STRONG PROMPT</span>'+esc(p.strong)+'</div>'+
    '<div class="callout"><b>Why it works:</b> '+esc(p.why)+'</div>'+
    '<p class="small muted">How did your prompt compare?</p>'+
    '<button class="btn sm gold" onclick="sbRate(1)">Mine was just as strong (+1)</button> '+
    '<button class="btn sm outline" onclick="sbRate(0)">I will tighten mine</button>';
}
function sbRate(n){sbScore+=n; document.getElementById('sb-score').textContent='Self-score: '+sbScore; sbNext();}
function sbNext(){sbIdx=(sbIdx+1)%PROMPTS.length; sbRender();}
function sbPrev(){sbIdx=(sbIdx-1+PROMPTS.length)%PROMPTS.length; sbRender();}
let qzIdx=0, qzScore=0, qzT=null, qzSec=0;
function qzStart(){
  qzIdx=0; qzScore=0; qzSec=0;
  document.getElementById('qz-intro').style.display='none';
  document.getElementById('qz-done').style.display='none';
  document.getElementById('qz-play').style.display='block';
  clearInterval(qzT);
  qzT=setInterval(function(){qzSec++; var m=Math.floor(qzSec/60),s=String(qzSec%60).padStart(2,'0'); document.getElementById('qz-time').textContent=m+':'+s;},1000);
  qzRender();
}
function qzRender(){
  const item=QUIZ[qzIdx];
  document.getElementById('qz-num').textContent='Q '+(qzIdx+1)+' / '+QUIZ.length;
  document.getElementById('qz-score').textContent='Score: '+qzScore;
  document.getElementById('qz-bar').style.width=(qzIdx/QUIZ.length*100)+'%';
  let h='<h3>'+esc(item.q)+'</h3>';
  item.a.forEach((opt,i)=>h+='<button class="choice" onclick="qzPick('+i+')">'+esc(opt)+'</button>');
  h+='<div class="fb" id="qz-fb"></div><div id="qz-next"></div>';
  document.getElementById('qz-body').innerHTML=h;
}
function qzPick(i){
  const item=QUIZ[qzIdx];
  const btns=document.querySelectorAll('#qz-body .choice');
  if(btns[0].disabled)return;
  btns.forEach((b,j)=>{b.disabled=true; if(j===item.c)b.classList.add('correct'); if(j===i&&i!==item.c)b.classList.add('wrong');});
  const ok=i===item.c; if(ok)qzScore++;
  const fb=document.getElementById('qz-fb'); fb.className='fb show '+(ok?'good':'bad');
  fb.innerHTML=ok?'<b>Correct.</b>':'<b>Correct answer:</b> '+esc(item.a[item.c]);
  document.getElementById('qz-score').textContent='Score: '+qzScore;
  document.getElementById('qz-next').innerHTML=
    qzIdx<QUIZ.length-1?'<button class="btn" style="margin-top:14px" onclick="qzAdvance()">Next &rarr;</button>'
    :'<button class="btn gold" style="margin-top:14px" onclick="qzFinish()">Finish &rarr;</button>';
}
function qzAdvance(){qzIdx++; qzRender();}
function qzFinish(){
  clearInterval(qzT);
  const pct=Math.round(qzScore/QUIZ.length*100);
  const m=Math.floor(qzSec/60),s=String(qzSec%60).padStart(2,'0');
  document.getElementById('qz-play').style.display='none';
  const dn=document.getElementById('qz-done'); dn.style.display='block';
  let band=pct>=87?'VOOV Claude Pro':pct>=67?'Solid Associate':'Keep Studying';
  dn.innerHTML='<div class="scenario"><div class="result">'+
    '<div class="big">'+pct+'%</div>'+
    '<p><b>'+qzScore+' / '+QUIZ.length+'</b> correct in <b>'+m+':'+s+'</b></p>'+
    '<p class="chip">'+band+'</p>'+
    '<div style="margin-top:16px"><button class="btn" onclick="qzStart()">Retake quiz</button></div>'+
    '</div></div>';
}
function addCal(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function addBiz(d,n){const x=new Date(d);let added=0;while(added<n){x.setDate(x.getDate()+1);const dow=x.getDay();if(dow!==0&&dow!==6)added++;}return x;}
function subBiz(d,n){const x=new Date(d);let r=0;while(r<n){x.setDate(x.getDate()-1);const dow=x.getDay();if(dow!==0&&dow!==6)r++;}return x;}
function iso(d){return d.toISOString().slice(0,10);}
function pretty(d){return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});}
function expected(row,startISO){
  const start=new Date(startISO+'T00:00:00');
  if(row.mode==='cal')return addCal(start,row.n);
  if(row.mode==='biz')return addBiz(start,row.n);
  if(row.mode==='bizBefore')return subBiz(new Date(row.ref+'T00:00:00'),row.n);
  return start;
}
let drKey='tx';
function drPickInit(){
  const p=document.getElementById('dr-pick'); p.innerHTML='';
  Object.keys(DRILLS).forEach(k=>{
    const d=DRILLS[k];
    const b=document.createElement('button'); b.className='cat'+(k===drKey?' active':'');
    b.textContent=d.state; b.onclick=()=>{drKey=k; drPickInit(); drRender();};
    p.appendChild(b);
  });
}
function drRender(){
  const d=DRILLS[drKey];
  let h='<h3><span class="code-badge">'+d.code+'</span> &nbsp;'+esc(d.deal)+'</h3>'+
    '<div class="callout info">'+esc(d.startLabel)+'</div>'+
    '<table class="tbl"><tr><th>Milestone</th><th>Rule</th><th>Your deadline</th></tr>';
  d.rows.forEach(r=>{
    h+='<tr><td>'+esc(r.label)+'</td><td class="small muted">'+esc(r.rule)+'</td>'+
      '<td><input type="date" id="dr-'+r.id+'" style="padding:7px;border:1px solid #c9d4df;border-radius:8px">'+
      '<div class="small" id="drfb-'+r.id+'"></div></td></tr>';
  });
  h+='</table><button class="btn" onclick="drCheck()">Check my deadlines</button> '+
     '<button class="btn outline" onclick="drShow()">Show answers</button>'+
     '<div id="dr-result" style="margin-top:12px"></div>';
  document.getElementById('dr-body').innerHTML=h;
}
function drCheck(){
  const d=DRILLS[drKey]; let right=0;
  d.rows.forEach(r=>{
    const inp=document.getElementById('dr-'+r.id), fb=document.getElementById('drfb-'+r.id);
    const exp=expected(r,d.start);
    if(inp.value && inp.value===iso(exp)){right++; fb.innerHTML='<span style="color:var(--good)">Correct</span>'; inp.style.borderColor='var(--good)';}
    else{fb.innerHTML='<span style="color:var(--bad)">Try again</span>'; inp.style.borderColor='var(--bad)';}
  });
  document.getElementById('dr-result').innerHTML=
    '<div class="callout '+(right===d.rows.length?'':'warn')+'"><b>'+right+' / '+d.rows.length+' correct.</b> '+(right===d.rows.length?'Perfect deadline table.':'Use Show answers to learn the ones you missed.')+'</div>';
}
function drShow(){
  const d=DRILLS[drKey];
  d.rows.forEach(r=>{
    const exp=expected(r,d.start);
    document.getElementById('dr-'+r.id).value=iso(exp);
    document.getElementById('drfb-'+r.id).innerHTML='<span class="muted">'+pretty(exp)+'</span>';
    document.getElementById('dr-'+r.id).style.borderColor='var(--teal)';
  });
  document.getElementById('dr-result').innerHTML='<div class="callout"><b>Answers filled in.</b> Each date follows the '+d.state+' rule shown in the middle column.</div>';
}
scCards(); sbRender(); drPickInit(); drRender();
