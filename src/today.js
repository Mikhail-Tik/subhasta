/* SUBHASTA — Today: the front page, and the live layer under it. build.py pastes this file into app.js at its TODAY placeholder.

   The live layer. data_live.js bakes the research desk's latest copy into the page: LIVE (status, read, sales, wire) and KB.
   When the page is opened signed in, the db's live/ documents and kb/ collection are read over them. A live document replaces
   its baked copy only when it is at least as recent (asof), so a stale document never hides a fresher build; a malformed one is
   ignored, and every string is escaped where it is drawn. The research desk — a scheduled agent, twice a week — writes them;
   the db rules let no one else (live/ and kb/ are written by the owner alone).

   Today. One page that says what moved, what it means and what to watch: the Ask bar over the week's picture; the desk's Read
   (a thesis, the tells behind it, what would change it); the sale room (the season's evening sales, estimates against results);
   the board of the latest hammers; four numbers; three signals and the wire; what the analyst has learned; the next dates. */

/* ---------- the live layer ---------- */
const LIVEDB={status:null,read:null,sales:null,wire:null,kb:[]};
const lvStr=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=(n||4000);
const lvISO=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const lvNum=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<1e6;
const lvOpt=(v,n)=>v==null||v===''||lvStr(v,n);
const LV_VERDICT=['above','within','below'];
/* a sale room entry: an estimate of one or two dollar figures, a result whose verdict is one of three words, lots that are records with names */
const lvSale=s=>s&&typeof s==='object'&&lvStr(s.id,80)&&/^[a-z0-9-]+$/.test(s.id)&&lvStr(s.n,200)&&lvISO(s.d)&&lvStr(s.house,40)&&lvOpt(s.hn,60)&&lvOpt(s.city,60)&&lvOpt(s.g,300)&&lvOpt(s.estNote,200)&&lvOpt(s.note,1600)&&lvOpt(s.vf,2)
  &&(s.est==null||(Array.isArray(s.est)&&s.est.length>=1&&s.est.length<=2&&s.est.every(lvNum)))
  &&(s.res==null||(typeof s.res==='object'&&(s.res.total==null||lvNum(s.res.total))&&(s.res.hammer==null||lvNum(s.res.hammer))&&lvOpt(s.res.sold,40)&&(s.res.v==null||s.res.v===''||LV_VERDICT.includes(s.res.v))&&lvOpt(s.res.vNote,300)&&lvOpt(s.res.note,1600)))
  &&(s.lots==null||(Array.isArray(s.lots)&&s.lots.length<=30&&s.lots.every(l=>l&&typeof l==='object'&&lvStr(l.a,200)&&lvStr(l.t,300)&&lvOpt(l.est,120)&&lvOpt(l.res,120)&&lvOpt(l.y,40)&&lvOpt(l.note,600))))&&lvSrc(s.src);
const lvURL=v=>typeof v==='string'&&/^https:\/\/[^\s"'<>]{4,600}$/.test(v);
const lvSrc=a=>!a||(Array.isArray(a)&&a.length<=12&&a.every(s=>Array.isArray(s)&&lvStr(s[0],200)&&lvURL(s[1])));
function liveValid(k,d){if(!d||typeof d!=='object'||!lvISO(d.asof))return false;
  if(k==='status')return !d.note||lvStr(d.note,400);
  if(k==='read')return lvStr(d.h,240)&&lvStr(d.dek,900)&&(!d.body||(Array.isArray(d.body)&&d.body.length<=6&&d.body.every(p=>lvStr(p,1600))))&&(!d.tells||(Array.isArray(d.tells)&&d.tells.length<=6&&d.tells.every(t=>t&&lvStr(t.l,120)&&lvStr(t.v,60)&&lvSrc(t.src?[t.src]:null))))&&(!d.watch||(Array.isArray(d.watch)&&d.watch.every(w=>lvStr(w,300))))&&(!d.change||lvStr(d.change,600))&&lvSrc(d.src);
  if(k==='sales')return Array.isArray(d.items)&&d.items.length<=30&&d.items.every(lvSale);
  if(k==='wire')return Array.isArray(d.items)&&d.items.length<=40&&d.items.every(n=>n&&lvStr(n.h,300)&&lvISO(n.dt)&&lvStr(n.o,80)&&lvOpt(n.s,600)&&lvOpt(n.city,60)&&(!n.u||lvURL(n.u)));
  return false;}
const kbValid=d=>d&&lvStr(d.q,300)&&lvStr(d.a,9000)&&lvISO(d.asof)&&lvSrc(d.src)&&(!d.tags||(Array.isArray(d.tags)&&d.tags.length<=12&&d.tags.every(t=>lvStr(t,60))))&&lvOpt(d.kind,20);
const lvNewer=(d,baked)=>!!d&&String(d.asof)>=String(baked);
function liveStatus(){return lvNewer(LIVEDB.status,LIVE.status.asof)?LIVEDB.status:LIVE.status;}
function liveRead(){return lvNewer(LIVEDB.read,LIVE.read.asof)?LIVEDB.read:LIVE.read;}
function liveSales(){return lvNewer(LIVEDB.sales,LIVE.asof)?LIVEDB.sales.items:LIVE.sales;}
function liveWire(){const base=NEWS.map(n=>({d:n.d,dt:n.dt,o:n.o,h:n.h,s:n.s,u:n.u,city:n.city}));const L=lvNewer(LIVEDB.wire,LIVE.asof)?LIVEDB.wire.items:[];const seen=new Set();return [...L,...base].filter(n=>{const k=norm(n.h).slice(0,60);if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>String(b.dt).localeCompare(String(a.dt)));}
function kbAll(){const m=new Map();KB.forEach(k=>m.set(k.id,k));LIVEDB.kb.forEach(k=>{const b=m.get(k.id);if(!b||String(k.asof)>=String(b.asof))m.set(k.id,k);});return [...m.values()];}
/* the db's live/ documents and kb/ collection, subscribed once each */
function liveInit(){if(!dbRef)return;const val=d=>d.exists===false?null:(typeof d.data==='function'?d.data():d.data);
  try{dbRef.collection('live').onSnapshot(snap=>{const ch=new Set();(snap&&snap.docs||[]).forEach(d=>{const id=d.id;if(!['status','read','sales','wire'].includes(id))return;const x=val(d);if(liveValid(id,x)){LIVEDB[id]=x;ch.add(id);}});if(ch.size)liveApply(ch);},()=>{});}catch(e){}
  try{dbRef.collection('kb').onSnapshot(snap=>{const L=[];(snap&&snap.docs||[]).forEach(d=>{if(!/^[a-z0-9-]{1,80}$/.test(d.id))return;const x=val(d);if(kbValid(x))L.push(Object.assign({},x,{id:d.id}));});LIVEDB.kb=L.slice(0,500);liveApply(new Set(['kb']));},()=>{});}catch(e){}}
/* a live document arrived: the index learns it and the blocks that show it are drawn again */
function liveApply(ch){kxInvalidate();if(typeof wdInvalidate==='function')wdInvalidate();const on=id=>{const el=$(id);return el&&$('#v-floor').contains(el)?el:null;};
  const step=(what,f)=>{try{f();}catch(err){reportError(err,'live '+what);}};
  if(ch.has('read'))step('read',()=>{const a=on('#tdRead'),b=on('#tdTells');if(a)a.innerHTML=tdReadHTML();if(b)b.innerHTML=tdTellsHTML();});
  if(ch.has('sales'))step('sales',()=>{const a=on('#tdSales');if(a){a.innerHTML=tdSalesHTML();tdBind(a);}});
  if(ch.has('wire'))step('wire',()=>{const a=on('#tdWire');if(a)a.innerHTML=tdWireHTML();});
  if(ch.has('kb'))step('kb',()=>{const a=on('#tdLearned');if(a){a.innerHTML=tdLearnedHTML();bindRefs(a);}askDrawSide();});
  step('status',()=>{const s=on('#tdStatus');if(s)s.innerHTML=tdStatusHTML();askStatus();});
  ['#tdRead','#tdTells','#tdWire'].forEach(id=>step('bind',()=>{const e=on(id);if(e){bindRefs(e);bindAskButtons(e);bindLinks(e);}}));}

/* ---------- Today ---------- */
/* when the reader was last here (this browser): what is new since is counted on the page */
const LAST_VISIT=(()=>{const v=store.get('lastVisit',null);store.set('lastVisit',NOW);return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v<NOW?v:null;})();
function tdStatusHTML(){const S=liveStatus();const live=lvNewer(LIVEDB.status,LIVE.status.asof);
  return `<span class="chip live${live?' on':''}" title="${live?'The research desk’s latest report, read from the page’s store':'The copy built into the page; the research desk’s reports arrive when the page is opened signed in'}"><i aria-hidden="true"></i>${live?'Live':'Desk'} · ${esc(fdate(S.asof))}</span><span class="chip">Figures verified ${esc(MARKET.verified)}</span>`;}
function tdSince(){if(!LAST_VISIT)return '';const n=RESULTS.filter(r=>r.date>LAST_VISIT).length,w=liveWire().filter(x=>x.dt>LAST_VISIT).length,k=kbAll().filter(x=>x.asof>LAST_VISIT).length;const parts=[n?`${n} new ${n===1?'result':'results'}`:'',w?`${w} on the wire`:'',k?`${k} learned`:''].filter(Boolean);
  return parts.length?`<p class="since">Since your last visit on ${esc(fdate(LAST_VISIT))}: ${parts.join(' · ')}.</p>`:'';}
const TD_EX=['Explain the Vienna Secession, and what it sells for now','Break down the Klimt Lederer sale','What will the November evening sales tell us?','What are the biggest private sales on record?','What does a $20m hammer cost in all, bought in London and kept in a Geneva freeport?'];
function tdReadHTML(){const R=liveRead();return `<div class="rh"><h2>The Read</h2><span class="sub">the desk’s view, ${esc(fdate(R.asof))}</span></div><div class="readin"><h3>${esc(R.h)}</h3><p class="thesis">${esc(R.dek)}</p>${(R.body||[]).map(p=>`<p>${mdInline(esc(p))}</p>`).join('')}${R.change?`<div class="change"><span class="label cap">What would change the view</span><p>${mdInline(esc(R.change))}</p></div>`:''}${(R.src||[]).length?`<div class="srcs">${R.src.map(s=>`<a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join('')}</div>`:''}<div class="acts"><button class="btn" data-ask="${esc('Argue against the desk’s read: '+R.h+'. What is the strongest case the other way?')}">Argue the other side</button><button class="btn" data-ask="${esc('What does the desk’s read ('+R.h+') mean for a collector selling this season?')}">What it means for a seller</button></div></div>`;}
function tdTellsHTML(){const R=liveRead();const T=R.tells||[];return `<div class="rh"><h2>The tells</h2><span class="sub">what the read stands on</span></div>${T.map(t=>`<div class="tell ${t.dir==='up'?'up':t.dir==='down'?'down':''}"><span class="l">${esc(t.l)}</span><span class="v money">${esc(t.v)}</span>${t.d?`<span class="d">${esc(t.d)}</span>`:''}${t.src?`<a class="s" href="${esc(t.src[1])}" target="_blank" rel="noopener">${esc(t.src[0])}${t.vf?` · ${esc(t.vf)}`:''}</a>`:''}</div>`).join('')}${(R.watch||[]).length?`<div class="watch"><span class="label cap">To watch</span><ul>${R.watch.map(w=>`<li>${mdInline(esc(w))}</li>`).join('')}</ul></div>`:''}`;}
/* the sale room, in two columns on their own dollar axes: what has sold (the result against the estimate, with the verdict the hammer or
   the source gives — never one guessed from a total with premium against an estimate without it) and what is to come (the estimate as a
   band, or a diamond where only a reported total exists) */
const saleName=s=>s.hn||houseName(s.house);
function tdSaleRow(s,max){const X=v=>Math.max(0,Math.min(100,v/max*100)).toFixed(2);const e=s.est||[];const r=s.res&&s.res.total!=null?+s.res.total:null;const v=s.res&&LV_VERDICT.includes(s.res.v)?s.res.v:'';
  const band=e.length===2?`<i class="band" style="left:${X(+e[0])}%;width:${Math.max(.8,X(+e[1]-+e[0]))}%"></i>`:e.length===1?`<i class="pt" style="left:${X(+e[0])}%"></i>`:'';
  const est=e.length===2?`${mm(+e[0])}–${mm(+e[1])}`:e.length===1?`about ${mm(+e[0])}`:'';
  const tip=`${saleName(s)}, ${s.n}, ${fdate(s.d)}${est?`. Estimate ${est}`:''}${s.estNote?` (${s.estNote})`:''}${r!=null?`. Made ${mm(r)} with premium`:''}${s.res&&s.res.vNote?`; ${s.res.vNote}`:''}`;
  return `<button class="srrow" data-sale="${esc(s.id)}" title="${esc(tip)}"><span class="d">${esc(fdate(s.d).replace(/ \d{4}$/,''))}</span><span class="n"><b>${esc(saleName(s))}</b> ${esc(s.n)}<small>${esc(s.city)}${s.g&&s.g!=='none'?` · ${esc(cut(s.g,70))}`:''}</small></span><span class="bar" aria-hidden="true">${band}${r!=null?`<i class="res ${v}" style="left:${X(r)}%"></i>`:''}</span><span class="v">${r!=null?`<b class="money">${esc(mm(r))}</b><small class="${v}">${v==='above'?'above the estimate':v==='within'?'within the estimate':v==='below'?'below the estimate':(s.res.sold?esc(s.res.sold)+' sold':'result')}</small>`:est?`<b class="money">${esc(est)}</b><small>${esc(cut(s.estNote||'estimate',40))}</small>`:'<small>estimate to come</small>'}${r==null&&s.d<NOW?'<small>result due with the desk’s next report</small>':''}</span></button>`;}
function tdSalesHTML(){const S=[...liveSales()].sort((a,b)=>a.d.localeCompare(b.d));if(!S.length)return '';
  const done=S.filter(s=>s.res&&s.res.total!=null),next=S.filter(s=>!(s.res&&s.res.total!=null));
  const top=L=>Math.max(1,...L.map(s=>Math.max(...(s.est||[0]).map(Number),s.res&&s.res.total!=null?+s.res.total:0)))*1.08;
  const tot=done.reduce((t,s)=>t+(+s.res.total||0),0);const verdicts=LV_VERDICT.map(k=>[k,done.filter(s=>s.res.v===k).length]).filter(x=>x[1]);
  const head=`<div class="rh"><h2>The sale room</h2><span class="sub">${done.length?`${done.length} evening ${done.length===1?'sale':'sales'} since ${esc(fdate(done[0].d).replace(/ \d{4}$/,''))}, ${mm(tot)} with premium${verdicts.length?`: ${verdicts.map(([k,n])=>`${n} ${k}`).join(', ')} the estimate`:''}`:''}${next.length?`${done.length?'; ':''}${next.length} to come, ${esc(fspan(next[0].d,next[next.length-1].d))}`:''}</span></div>`;
  const lead=HERO&&HERO.img?`<div class="srlead"><a href="#" class="pic" data-lb="${esc(HERO.img)}"><img src="img/t/${esc(HERO.img)}.jpg" alt="${esc(HERO.alt)}" loading="lazy" style="object-position:${esc(HERO.fp)}"></a><div><span class="k">${esc(HERO.k)}</span><h3>${esc(HERO.h)}</h3><p>${esc(HERO.p)}</p><div class="acts">${HERO.acts.map((a,i)=>`<button class="btn sm${i===0?' primary':''}" ${a.reel!=null?`data-reel="${+a.reel}"`:a.up!=null?`data-up="${+a.up}"`:`data-story="${esc(a.story)}"`}>${esc(a.t)}</button>`).join('')}</div></div></div>`:'';
  const col=(L,h,sub)=>{if(!L.length)return '';const mx=top(L);return `<div class="srcol"><h3>${h}<small>${sub} · axis to ${esc(mm(mx))}</small></h3><div>${L.map(s=>tdSaleRow(s,mx)).join('')}</div></div>`;};
  return `${head}${lead}<div class="srcols">${col(done,'The verdict','results with premium against the estimate')}${col(next,'The test','the houses’ estimates')}</div><div class="srkey"><span><i class="band"></i>estimate, low to high (without premium)</span><span><i class="res"></i>result above the estimate</span><span><i class="res below"></i>below it</span><span class="faint">a result’s verdict comes from the hammer or the house’s own account; results include premium</span></div>`;}
function openSale(id){const s=liveSales().find(x=>x.id===id);if(!s)return;const e=s.est||[];const r=s.res||null;
  openDrawer(`${esc(saleName(s))}, ${esc(s.n)}`,`${esc(s.city||'')} · ${esc(fdate(s.d))}`,`<div class="facts">${e.length?`<span class="l">Estimate</span><span class="v money" style="font-size:20px">${e.length===2?`${esc(mm(+e[0]))}–${esc(mm(+e[1]))}`:`about ${esc(mm(+e[0]))}`}</span>`:''}${s.estNote?`<span class="l">Basis</span><span class="v">${esc(s.estNote)}</span>`:''}${s.g?`<span class="l">Guarantees</span><span class="v">${esc(s.g)}</span>`:''}${r&&r.total!=null?`<span class="l">Result, with premium</span><span class="v money" style="font-size:20px">${esc(mm(+r.total))}</span>${r.vNote?`<span class="l">Against the estimate</span><span class="v">${esc(r.vNote)}</span>`:''}${r.sold?`<span class="l">Sold</span><span class="v">${esc(r.sold)}</span>`:''}`:''}</div>${s.note?`<div class="sec quote">${esc(s.note)}</div>`:''}${r&&r.note?`<div class="sec"><span class="label">How it went</span><p>${esc(r.note)}</p></div>`:''}${(s.lots||[]).length?`<div class="sec"><span class="label">The lots to watch</span><div class="tblwrap"><table class="tbl"><thead><tr><th>Work</th><th>Estimate</th><th>Result</th></tr></thead><tbody>${s.lots.map(l=>`<tr><td>${esc(l.a)}, <i>${esc(l.t)}</i>${l.y?` (${esc(l.y)})`:''}${l.note?`<small class="faint" style="display:block">${esc(l.note)}</small>`:''}</td><td class="n">${esc(l.est||'—')}</td><td class="n">${esc(l.res||'—')}</td></tr>`).join('')}</tbody></table></div></div>`:''}${(s.src||[]).length?`<div class="sec"><span class="label">Sources</span>${s.src.map(x=>`<a class="rlink" href="${esc(x[1])}" target="_blank" rel="noopener">${esc(x[0])} ↗</a>`).join('')}</div>`:''}<div class="sec"><button class="btn" data-ask="${esc(`Break down ${saleName(s)}’s ${s.n} on ${fdate(s.d)}: the estimate, the guarantees, the lots to watch${r&&r.total!=null?' and the result':''}. What does it tell us?`)}">Ask Subhasta about this sale</button></div>`);
  const d=$('#dBody');bindAskButtons(d);markScrollables(d);}
function tdWireHTML(){return `<div class="rh"><h2>The wire</h2><span class="sub"><button data-go="signals">all news and dates</button></span></div>${liveWire().slice(0,6).map(n=>`<div class="wire"><span class="d">${esc(fdate(n.dt).replace(/ \d{4}$/,''))}</span><div><div class="h">${n.u?`<a href="${esc(n.u)}" target="_blank" rel="noopener">${esc(n.h)}</a>`:esc(n.h)}</div><div class="o">${esc(n.o)}</div></div></div>`).join('')}`;}
function tdLearnedHTML(){const K=kbAll().slice().sort((a,b)=>String(b.asof).localeCompare(String(a.asof)));const wk=K.filter(k=>k.asof>=new Date(Date.parse(NOW)-7*864e5).toISOString().slice(0,10)).length;
  return `<div class="rh"><h2>What it has learned</h2><span class="sub">${K.length} entries${wk?`, ${wk} this week`:''}; <button data-go="ask">ask it</button></span></div>${K.slice(0,4).map(k=>`<button class="learn" data-ref="kb:${esc(k.id)}"><span class="d">${esc(fdate(k.asof))}</span><b>${esc(k.q)}</b><small>${esc(kbGist(k.a))}</small></button>`).join('')||'<p class="empty">The research desk adds what it learns here.</p>'}`;}
/* an answer's first paragraph as plain text: the links' labels kept, the marks, tables and lists dropped */
const kbGist=a=>cut(String(a||'').split(/\n\s*\n/)[0].replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g,'$1').replace(/\[\[[^\]]+\]\]/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[#*_`>|]/g,'').replace(/\s+/g,' ').trim(),150);
const TD_TILES=[['navigator','Navigator','Move a work from A to B, lawfully: the gates, the papers, the landed cost'],['season','Season','Where to be next: fairs, sales, biennales and shows, with the tickets'],['horizon','Horizon','Where the money goes next: eighteen theses, each with its evidence'],['transform','Transformation','How a sum becomes a work and becomes money again: the six stages, the gates, the cost'],['deal','Deal Room','What goes on behind a $50m painting: the terms, who earns what, the cases, the people'],['tides','Tides','Where the market is moving, before it is obvious: the evidence, the predictions, the whispers'],['collectors','Collectors','Who holds what, where, and how the money connects'],['currents','Currents','Where money has moved through art, and what caught it'],['whispers','Whispers','What the trade is saying before it happens, labelled and attributed'],['playbooks','Playbooks','What a task actually takes: the forms, the offices, the times, the fees'],['movements','Movements','Art history as the market reads it: every movement, its ideas and its prices today'],['hammer','Sales','Every result in the terminal, sortable, with the trophy board'],['pulse','Market','Eighteen vital signs, the diagnosis and the long view'],['undertow','Money','Follow a dollar from hammer to wall: premium, tax, freeport, resale right'],['ledger','Provenance','771 ownership histories from the National Gallery of Art'],['lab','Lab','Returns against the S&P, the round trip, concentration, confidence'],['atlas','Atlas','The globe: hubs, rules, fairs and where the money sits'],['reel','The Reel','The week in full-screen pictures and prices']];
function renderFloor(){const el=$('#v-floor');const N=kxCount();const M=MARKET,g=M.global;const next=CALENDAR.filter(c=>(c.e||c.d)>=NOW).sort((a,b)=>a.d.localeCompare(b.d)).slice(0,6);
  el.innerHTML=`<div class="head"><div><h1>The art market, ${esc(fdate(NOW))}</h1><p class="dek">What moved, what it means and what to watch, with an analyst for everything else. Every figure opens its source.</p>${tdSince()}</div><div class="status" id="tdStatus">${tdStatusHTML()}</div></div>
  <section class="tdask" aria-labelledby="tdAskH"><div class="bg" aria-hidden="true"><img src="img/${esc(HERO.img)}.jpg" alt="" decoding="async" style="object-position:${esc(HERO.fp)}"></div>
    <div class="in"><span class="k">Ask Subhasta</span><h2 id="tdAskH">Ask the art market anything.</h2><p>Any movement in history, any sale public or private, any house, price or rule. The analyst reads ${N.toLocaleString('en-US')} records, cites them, and says what it does not know.</p>
      <form class="tdaskbar" id="tdAskForm" autocomplete="off"><label class="sr" for="tdAskIn">Your question</label><input id="tdAskIn" type="text" maxlength="1200" placeholder="${esc(TD_EX[0])}"><button class="btn primary" type="submit">Ask</button></form>
      <div class="tdex">${TD_EX.slice(1).map(q=>`<button class="askq" data-ask="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>
    <div class="cap">${esc(HERO.alt)}. Public domain.</div></section>
  <div class="grid">
    <section class="sect c8 read" id="tdRead">${tdReadHTML()}</section>
    <section class="sect c4 tells" id="tdTells">${tdTellsHTML()}</section>
    <section class="sect c12 saleroom" id="tdSales">${tdSalesHTML()}</section>
    <section class="sect c12"><div class="rh"><h2>The latest hammer</h2><span class="sub">the last twelve results in the terminal; <button data-go="hammer">every sale</button></span></div>${boardBuild()}</section>
    <section class="sect c12"><div class="kpis">
      <button class="kpi" data-ev="global"><div class="l">Global art market, 2025</div><div class="v">$${g.y25}<small>bn</small></div><div class="d"><b class="up">${g.growth}</b> after two down years; peak ${esc(g.peak)}</div><div class="src">Art Basel &amp; UBS 2026 · as of ${esc(MARKET.verified)}</div></button>
      <button class="kpi" data-ev="auction"><div class="l">Public auction sales, 2025</div><div class="v">$${g.auction}<small>bn</small></div><div class="d"><b class="up">${g.auctionGrowth}</b>; dealers $${g.dealers}bn (${g.dealersGrowth})</div><div class="src">Arts Economics · as of ${esc(MARKET.verified)}</div></button>
      ${evTile('bigthree')}${evTile('private')}</div></section>
    <section class="sect c6"><div class="rh"><h2>Signals</h2><span class="sub"><button data-go="signals">all ${words(SIGNALS.length)}</button></span></div>${SIGNALS.slice(0,3).map(s=>`<div class="sig"><div><h3>${esc(s.t)}</h3><p>${esc(s.p.split('. ')[0])}.</p></div><span class="tag ${s.dir==='heat'?'heat':s.dir==='cool'?'cool':''}">${s.dir==='heat'?'heating':s.dir==='cool'?'cooling':'steady'}</span></div>`).join('')}</section>
    <section class="sect c6" id="tdWire">${tdWireHTML()}</section>
    <section class="sect c6" id="tdLearned">${tdLearnedHTML()}</section>
    <section class="sect c6"><div class="rh"><h2>Next on the calendar</h2><span class="sub"><button data-go="signals">all dates</button></span></div>${next.map(c=>`<div class="cal"><span class="d">${esc(fspan(c.d,c.e))}</span><span class="n">${esc(c.n)}${c.sub?`<small>${esc(c.sub)}</small>`:''}</span><span class="c">${esc(c.city)}</span></div>`).join('')}</section>
    <section class="sect c12 tdseason">${seasonStrip(6,120)}</section>
    <section class="sect c12" id="tdWatchSec" hidden><div class="rh"><h2>Watching</h2><span class="sub" id="tdWatchH">your watchlist</span></div><div id="tdWatch" class="lots"></div></section>
    <section class="sect c12"><div class="rh"><h2>Go deeper</h2></div><div class="gotiles">${TD_TILES.map(([v,n,d])=>`<button class="gotile" ${v==='reel'?'data-reel="0"':`data-go="${v}"`}><b>${esc(n)}</b><span>${esc(d)}</span></button>`).join('')}</div></section>
  </div>`;
  tdBind(el);bindSeason(el);boardInit();if(typeof drawWatching==='function')drawWatching();}
function tdBind(root){bindTips(root);bindLinks(root);bindLightbox(root);bindRefs(root);bindAskButtons(root);
  $$('[data-reel]',root).forEach(b=>{if(b.__rl)return;b.__rl=1;b.addEventListener('click',()=>openReelHere(+b.dataset.reel));});
  $$('[data-sale]',root).forEach(b=>{if(b.__s)return;b.__s=1;b.addEventListener('click',()=>openSale(b.dataset.sale));});
  const f=$('#tdAskForm',root);if(f&&!f.__f){f.__f=1;f.addEventListener('submit',e=>{e.preventDefault();const i=$('#tdAskIn');const q=(i.value||'').trim()||i.placeholder;i.value='';askOpen(q);});}}
