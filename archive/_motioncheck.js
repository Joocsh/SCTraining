(function(){
  var nav=document.getElementById('nav');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var px=[].slice.call(document.querySelectorAll('[data-parallax]'));
  var drift=[].slice.call(document.querySelectorAll('[data-driftx]'));
  var hero=document.getElementById('hero');
  function onScroll(){
    var y=window.pageYOffset||document.documentElement.scrollTop;
    if(y>30) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
    if(reduce) return;
    var hb=hero.getBoundingClientRect();
    if(hb.bottom>0){
      px.forEach(function(el){
        var s=parseFloat(el.getAttribute('data-parallax'))||0;
        el.style.transform='translate3d(0,'+(y*s)+'px,0)'+(el.classList.contains('c3')||el.classList.contains('building')?' translateX(-50%)':'');
        if(el.getAttribute('data-fade')){
          var o=1-Math.min(1,y/(window.innerHeight*0.7));
          el.style.opacity=o.toFixed(3);
        }
      });
    }
    drift.forEach(function(el){
      var r=el.getBoundingClientRect();
      var prog=(window.innerHeight-r.top)/(window.innerHeight+r.height);
      prog=Math.max(0,Math.min(1,prog));
      var d=parseFloat(el.getAttribute('data-driftx'))||0;
      el.style.transform='translate3d('+((prog-0.5)*d)+'px,0,0)';
    });
  }
  function fixCenter(){ document.querySelectorAll('.building,.c3').forEach(function(el){el.style.left='50%';}); }
  fixCenter();
  var ro=document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && !reduce){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
    },{threshold:0.15});
    ro.forEach(function(el){io.observe(el);});
  } else { ro.forEach(function(el){el.classList.add('in');}); }
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll);
  onScroll();
})();
