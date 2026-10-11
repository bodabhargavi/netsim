/* NetSim: discrete-time simulation of one router with a finite FIFO queue.
   Section 1 = simulation core (no DOM). Section 2 = user interface. */

/* ===== 1. SIMULATION CORE ===== */
const DT = 0.1; // simulated seconds per step

// Seeded random generator so scenario comparison is fair and repeatable.
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// Random number of arrivals in one step (Poisson distribution with the given mean).
function poisson(mean,rnd){const L=Math.exp(-mean);let k=0,p=1;do{k++;p*=rnd();}while(p>L);return k-1;}

class Sim{
  constructor(rnd){this.rnd=rnd||Math.random;this.reset();}
  reset(){this.tick=0;this.queue=[];this.gen=0;this.del=0;this.drop=0;this.delaySum=0;this.credit=0;this.qSum=0;}
  get time(){return this.tick*DT;}
  /* One step. Order: 1) generate  2) admit or drop  3) transmit  4) update metrics. */
  step(c){
    this.tick++; const now=this.time; let dropped=0,sent=0;
    // If the user shrank the queue, extra packets at the tail are dropped.
    while(this.queue.length>c.cap){this.queue.pop();this.drop++;dropped++;}
    const n=poisson(c.lambda*DT,this.rnd); this.gen+=n;               // 1) generate
    for(let i=0;i<n;i++){                                              // 2) admit / tail-drop
      if(this.queue.length<c.cap) this.queue.push(now); else {this.drop++;dropped++;}
    }
    this.credit+=c.mu*DT;                                              // 3) transmit (FIFO)
    while(this.credit>=1&&this.queue.length>0){
      const arrived=this.queue.shift(); this.delaySum+=now-arrived; this.del++; this.credit-=1; sent++;
    }
    if(this.queue.length===0) this.credit-=Math.floor(this.credit);    // idle link cannot bank capacity
    this.qSum+=this.queue.length;                                      // 4) metrics
    return {n,dropped,sent};
  }
  metrics(cap){
    const q=this.queue.length;
    return {gen:this.gen,del:this.del,drop:this.drop,q,
      loss:this.gen?this.drop/this.gen*100:0,
      delayMs:this.del?this.delaySum/this.del*1000:0,
      thru:this.time>0?this.del/this.time:0,
      util:cap?q/cap*100:0,
      avgQ:this.tick?this.qSum/this.tick:0};
  }
}
function congestionLevel(m){
  if(m.util>=80||m.loss>=5) return 'high';
  if(m.util>=40||m.drop>0) return 'moderate';
  return 'normal';
}
if(typeof module!=='undefined') module.exports={Sim,mulberry,congestionLevel,DT};

/* ===== 2. USER INTERFACE ===== */
if(typeof document!=='undefined') window.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id);
  const cfg=()=>({lambda:+$('arrival').value,mu:+$('service').value,cap:+$('queue').value});
  const sim=new Sim();
  let state='idle',timer=null,particles=[],flash=0;
  const LABELS={high:'High Congestion',moderate:'Moderate Congestion',normal:'Normal'};

  // ---- Charts ----
  const hasChart=typeof Chart!=='undefined';
  if(!hasChart) alert('Chart.js did not load. Check your internet connection and reload the page. The rest of the simulator still works.');
  function mkChart(id,color,step){
    if(!hasChart) return null;
    return new Chart($(id),{type:'line',data:{labels:[],datasets:[{data:[],borderColor:color,backgroundColor:color+'22',fill:true,pointRadius:0,borderWidth:2,stepped:step}]},
      options:{animation:false,plugins:{legend:{display:false}},scales:{x:{title:{display:true,text:'Time (s)'},ticks:{maxTicksLimit:8}},y:{beginAtZero:true}}}});
  }
  const charts={q:mkChart('cQueue','#0f766e'),l:mkChart('cLatency','#7c3aed'),t:mkChart('cThru','#2563eb'),d:mkChart('cDrops','#b91c1c',true)};
  function addPoint(ch,x,y){if(!ch)return;ch.data.labels.push(x);ch.data.datasets[0].data.push(y);ch.update('none');}
  function clearCharts(){Object.values(charts).forEach(ch=>{if(!ch)return;ch.data.labels=[];ch.data.datasets[0].data=[];ch.update('none');});}

  // ---- Display updates ----
  function render(){
    const c=cfg(),m=sim.metrics(c.cap),lvl=congestionLevel(m);
    $('mGen').textContent=m.gen;$('mDel').textContent=m.del;$('mDrop').textContent=m.drop;
    $('mLoss').textContent=m.loss.toFixed(1)+'%';$('mDelay').textContent=m.delayMs.toFixed(0)+' ms';
    $('mThru').textContent=m.thru.toFixed(1)+' pkt/s';$('mQlen').textContent=m.q+' / '+c.cap;$('mUtil').textContent=m.util.toFixed(1)+'%';
    const b=$('statusBadge');b.className='badge '+lvl;b.textContent=LABELS[lvl];
    $('statusWhy').textContent=`Utilization ${m.util.toFixed(1)}%, loss ${m.loss.toFixed(1)}%, drops ${m.drop} -> ${LABELS[lvl]}.`;
    $('check').textContent=`Check: generated ${m.gen} = delivered ${m.del} + dropped ${m.drop} + in queue ${m.q} -> ${m.gen===m.del+m.drop+m.q?'OK':'MISMATCH'}`;
    analyse(c,m);
  }
  function analyse(c,m){
    const rho=c.lambda/c.mu,li=[];
    if(rho>1) li.push(`Why: the arrival rate (${c.lambda} pkt/s) exceeds the transmission rate (${c.mu} pkt/s), so the queue grows until full and then drops packets.`);
    else if(rho>=0.7) li.push(`Why: load is ${(rho*100).toFixed(0)}% of capacity. Random bursts can briefly exceed what the router sends, causing queueing and delay.`);
    else li.push(`Load is only ${(rho*100).toFixed(0)}% of capacity, so the queue normally drains as fast as it fills.`);
    if(m.drop>0) li.push(`${m.drop} packets were dropped because the queue was full.`);
    if(rho>=0.9||m.drop>0){
      li.push(`Increase the transmission rate (about ${Math.ceil(c.lambda/0.8)} pkt/s keeps load near 80%).`);
      li.push(`Reduce traffic, for example by lowering the arrival rate or limiting sources.`);
      li.push(`Use traffic shaping or rate limiting so sources send smoothly instead of in bursts.`);
      li.push(`A bigger queue reduces loss but increases waiting time, so it is only a partial fix.`);
    } else li.push('No action needed at this load.');
    $('analysisBox').innerHTML='<ul>'+li.map(s=>`<li>${s}</li>`).join('')+'</ul>';
  }
  function sample(){
    const m=sim.metrics(cfg().cap),t=+sim.time.toFixed(1);
    addPoint(charts.q,t,m.q);addPoint(charts.l,t,+m.delayMs.toFixed(1));
    addPoint(charts.t,t,+m.thru.toFixed(2));addPoint(charts.d,t,m.drop);
  }

  // ---- Simulation loop ----
  function tickOnce(){
    const r=sim.step(cfg());
    for(let i=0;i<Math.min(r.n,4);i++) particles.push({x0:100,y0:[60,140,220][Math.floor(Math.random()*3)],x1:200,y1:140,p:0,col:'#2563eb'});
    for(let i=0;i<Math.min(r.sent,3);i++) particles.push({x0:520,y0:140,x1:770,y1:140,p:0,col:'#0f766e'});
    if(r.dropped>0){flash=8;particles.push({x0:260,y0:120,x1:260,y1:40,p:0,col:'#b91c1c'});}
    if(sim.tick%5===0) sample();
    render();
  }
  function runInterval(){const k=+$('speed').value;for(let i=0;i<k;i++) tickOnce();}
  function setButtons(){
    $('btnStart').disabled=state!=='idle';$('btnPause').disabled=state!=='running';
    $('btnResume').disabled=state!=='paused';$('btnReset').disabled=state==='idle'&&sim.tick===0;
  }
  $('btnStart').onclick=()=>{state='running';timer=setInterval(runInterval,100);setButtons();};
  $('btnPause').onclick=()=>{state='paused';clearInterval(timer);setButtons();};
  $('btnResume').onclick=()=>{state='running';timer=setInterval(runInterval,100);setButtons();};
  $('btnReset').onclick=()=>{clearInterval(timer);state='idle';sim.reset();particles=[];clearCharts();render();setButtons();};

  // ---- Settings and presets ----
  [['arrival','arrivalVal'],['service','serviceVal'],['queue','queueVal']].forEach(([i,o])=>{
    $(i).addEventListener('input',()=>{$(o).textContent=$(i).value;
      document.querySelectorAll('.preset').forEach(b=>b.classList.toggle('active',i==='arrival'&&b.dataset.preset===$(i).value));render();});
  });
  document.querySelectorAll('.preset').forEach(b=>b.onclick=()=>{
    $('arrival').value=b.dataset.preset;$('arrival').dispatchEvent(new Event('input'));});

  // ---- Topology drawing (runs every animation frame) ----
  const cv=$('topo'),g=cv.getContext('2d');
  function draw(){
    const c=cfg(),m=sim.metrics(c.cap),lvl=congestionLevel(m);
    g.clearRect(0,0,900,280);g.font='14px Segoe UI, sans-serif';g.lineWidth=2;
    [60,140,220].forEach((y,i)=>{g.strokeStyle='#8aa';g.beginPath();g.moveTo(100,y);g.lineTo(200,140);g.stroke();
      g.fillStyle='#e3f3f0';g.strokeStyle='#0f766e';g.fillRect(20,y-22,80,44);g.strokeRect(20,y-22,80,44);g.fillStyle='#14272b';g.fillText('Source '+(i+1),30,y+5);});
    // queue: slots filled in proportion to utilization
    const N=Math.min(c.cap,40),filled=Math.round(m.util/100*N),w=190/N;
    g.strokeStyle='#14272b';g.strokeRect(200,120,190,40);
    g.fillStyle=lvl==='high'?'#b91c1c':lvl==='moderate'?'#d97706':'#0f766e';
    for(let i=0;i<filled;i++) g.fillRect(390-(i+1)*w+1,122,Math.max(w-2,1),36);
    g.fillStyle='#14272b';g.fillText(`FIFO queue ${m.q}/${c.cap}`,205,180);g.fillText('(front of queue at right)',205,198);
    g.fillStyle='#14272b';g.fillRect(420,100,100,80);g.fillStyle='#fff';g.fillText('Router',447,145);
    g.strokeStyle='#14272b';g.beginPath();g.moveTo(520,140);g.lineTo(770,140);g.stroke();
    g.fillStyle='#14272b';g.fillText(`Link: ${c.mu} pkt/s`,590,128);
    g.fillStyle='#e3f3f0';g.strokeStyle='#0f766e';g.fillRect(770,115,110,50);g.strokeRect(770,115,110,50);g.fillStyle='#14272b';g.fillText('Destination',785,145);
    if(flash>0){g.fillStyle='#b91c1c';g.fillText('PACKET DROPPED (queue full)',215,30);flash--;}
    if(lvl!=='normal'){g.fillStyle=lvl==='high'?'#b91c1c':'#d97706';g.fillText('Congestion point: queue',215,230);}
    particles=particles.filter(p=>p.p<1);
    particles.forEach(p=>{p.p+=0.07;g.fillStyle=p.col;g.beginPath();g.arc(p.x0+(p.x1-p.x0)*p.p,p.y0+(p.y1-p.y0)*p.p,5,0,7);g.fill();});
    requestAnimationFrame(draw);
  }

  // ---- Scenario comparison (headless runs, 60 simulated s, same seed) ----
  let cmpChart=null;
  $('btnCompare').onclick=()=>{
    const c=cfg(),names=['Low','Medium','High'],rates=[20,45,90],rows=[];
    rates.forEach((lambda,i)=>{
      const s=new Sim(mulberry(42));for(let t=0;t<600;t++) s.step({lambda,mu:c.mu,cap:c.cap});
      rows.push({name:names[i],lambda,...s.metrics(c.cap)});
    });
    $('cmpTable').querySelector('tbody').innerHTML=rows.map(r=>`<tr><td>${r.name}</td><td>${r.lambda}</td><td>${r.delayMs.toFixed(1)}</td><td>${r.thru.toFixed(1)}</td><td>${r.avgQ.toFixed(1)}</td><td>${r.loss.toFixed(1)}</td></tr>`).join('');
    if(!hasChart) return;
    if(cmpChart) cmpChart.destroy();
    cmpChart=new Chart($('cCompare'),{type:'bar',data:{labels:names,datasets:[
      {label:'Avg delay (ms)',data:rows.map(r=>+r.delayMs.toFixed(1)),backgroundColor:'#7c3aed'},
      {label:'Throughput (pkt/s)',data:rows.map(r=>+r.thru.toFixed(1)),backgroundColor:'#2563eb'},
      {label:'Avg queue length',data:rows.map(r=>+r.avgQ.toFixed(1)),backgroundColor:'#0f766e'},
      {label:'Packet loss (%)',data:rows.map(r=>+r.loss.toFixed(1)),backgroundColor:'#b91c1c'}]},options:{scales:{y:{beginAtZero:true}}}});
  };

  render();setButtons();draw();
});
