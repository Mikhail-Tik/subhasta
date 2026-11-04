/* ---------- WORLD: the globe the page opens on (v23) ----------
   renderWorld(el) fills #v-world with a full-bleed Canvas globe and a thin overlay (the lead, the modes, the time rail,
   the ask bar, the legend) and a card that opens on a click. Land is GLOBE_DOTS (1° since v23); the sphere is lit from
   the top left with a halo at the limb, turns once in WD_TURN seconds, stops while the pointer is on it, is dragged
   with inertia, and opens on the viewer's own longitude (from the browser's clock, as GitHub's globe does).
   Four modes:
     now     every sale with a place in the last WD_BACK days and the next WD_AHEAD (RESULTS, the sale room, UPCOMING),
             the fairs ahead (FAIRS) and the wire's news (liveWire(), placed by the city its headline names), stacked by
             city; a city's pin is sized by what sold there; a click lists the city's events, each opening its dossier
     then    a year, from 43000 BC to now, set on the rail or played: the movements alive that year glow at their centres
             (MOVEMENT_LL), the painters at work sit at their birthplaces (ARTIST_BORN), the card shows the movements and
             the pictures of the painters alive; Play walks the rail and flies the globe to where the art was
     shifts  where the trade’s centre of gravity sat, era by era (CENTRES), as a lifted path; the dots tinted by each
             country’s share of sales today (shareTier) and the rising hubs pulsing (HUBS.momentum)
     notes   readers’ own pins (db collection pins/<viewer>: a title, a note, a link, a kind, a place), validated on
             read; a signed-in reader who may write adds one by clicking the globe; the owner can remove any
   Test hooks: window.__WORLD = {mode, year, state, project, pinAt, events, rebuild}. Without a 2D canvas (jsdom) the
   overlay renders, the card works from the list, and the globe is omitted. Names here are prefixed wd/WD_. */
const WD_MODES=[['now','Now'],['then','Then'],['shifts','Shifts'],['notes','Notes']];
const WD_TURN=120;                 /* seconds per revolution */
const WD_BACK=120,WD_AHEAD=120;    /* days of sales behind and ahead that Now shows */
const WD_NEWS=60;                  /* days of news */
const WD_KINDS={seen:'Worth seeing',sale:'A sale to watch',place:'A place',note:'A note'};
/* the rail: segments of [from, to, share of the rail]; later centuries get more room, as on the Movements timeline */
const WD_RAIL=[[-43000,-3000,.05],[-3000,1,.07],[1,1000,.07],[1000,1400,.07],[1400,1800,.17],[1800,1900,.18],[1900,2027,.39]];
const WD_TICKS=[-43000,-3000,1,1000,1400,1600,1800,1850,1900,1950,2000,2027];
const wdY2T=y=>{let acc=0;for(const [a,b,w] of WD_RAIL){if(y<=b)return acc+w*Math.max(0,(y-a))/(b-a);acc+=w;}return 1;};
const wdT2Y=t=>{t=Math.max(0,Math.min(1,t));let acc=0;for(const [a,b,w] of WD_RAIL){if(t<=acc+w+1e-9)return Math.round(a+(b-a)*(t-acc)/w);acc+=w;}return 2026;};
const wdYear=y=>y<0?`${-y} BC`:y<1000?`AD ${y}`:String(y);
const wdLL=c=>(typeof CITY_LL==='object'&&CITY_LL[c])||null;
/* a record's city string → a CITY_LL key: "Saadiyat Island, Abu Dhabi" → Abu Dhabi; "Milan and Venice" → Milan */
function wdCityKey(s){s=String(s||'').trim();if(!s||s==='—'||/^online$/i.test(s))return null;if(wdLL(s))return s;const parts=s.split(/,|\band\b|\//).map(x=>x.trim()).filter(Boolean);const order=/,/.test(s)?parts.slice().reverse():parts;for(const p of order)if(wdLL(p))return p;return null;}
/* the city a headline names: a hub city first, then any city of five letters or more, as a whole word */
let WD_CITY_RE=null;
function wdCityInText(t){if(!WD_CITY_RE){const hubs=HUBS.map(h=>h.n.split(',')[0].split(' &')[0]).filter(wdLL);const rest=Object.keys(CITY_LL).filter(c=>!hubs.includes(c)&&c.length>=5&&!/,/.test(c));const re=list=>new RegExp('(^|[^A-Za-zÀ-ÿ])('+list.map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).sort((a,b)=>b.length-a.length).join('|')+')(?=$|[^A-Za-zÀ-ÿ])');WD_CITY_RE=[re(hubs),re(rest)];}
  for(const re of WD_CITY_RE){const m=re.exec(String(t||''));if(m)return m[2];}return null;}
/* ---- the events Now shows, stacked by city ---- */
function wdEvents(){const E=[];const back=glbAddDays(NOW,-WD_BACK),ahead=glbAddDays(NOW,WD_AHEAD),newsBack=glbAddDays(NOW,-WD_NEWS);
  RESULTS.forEach(r=>{if(r.date>=back&&r.date<=NOW){const c=wdCityKey(r.city);if(c)E.push({k:'lot',ref:'lot:'+r.id,c,d:r.date,t:`${r.artist}, ${r.title}`,s:`${houseName(r.house)} · ${fdate(r.date)}`,v:+r.price||0,img:LOTIMG[r.title]?LOTIMG[r.title].i:null});}});
  liveSales().forEach(s=>{const c=wdCityKey(s.city);if(!c||s.d<back||s.d>ahead)return;const done=!!(s.res&&s.res.total!=null);const e=s.est||[];
    E.push({k:done?'sale':'coming',ref:'sale:'+s.id,c,d:s.d,t:`${s.hn||houseName(s.house)}, ${s.n}`,s:done?`made ${mm(+s.res.total)}${s.res.v?`, ${s.res.v} the estimate`:''} · ${fdate(s.d)}`:`${fdate(s.d)}${e.length?` · estimate ${e.length===2?mm(+e[0])+'–'+mm(+e[1]):'about '+mm(+e[0])}`:''}`,v:done?+s.res.total:(e.length?+e[e.length-1]:0)});});
  UPCOMING.forEach((u,i)=>{if(u.date>=NOW&&u.date<=ahead){const c=wdCityKey(u.city);if(c)E.push({k:'coming',ref:'upcoming:'+i,c,d:u.date,t:`${u.artist}, ${u.title}`,s:`${houseName(u.house)} · ${fdate(u.date)} · ${u.est}`,v:(parseUSD(u.est)||0)/1e6,img:UPIMG[u.title]?UPIMG[u.title].i:null});}});
  FAIRS.forEach(f=>{if((f.e||f.d)>=NOW&&f.d<=ahead){const h=HUB(f.hub);const c=wdCityKey(f.city)||(h?wdCityKey(h.n.split(',')[0]):null);if(c)E.push({k:'fair',ref:'hub:'+f.hub,c,d:f.d,t:f.n,s:fspan(f.d,f.e)+(f.note?` · ${f.note}`:''),v:0});}});
  EVENTS.forEach(ev=>{if((ev.e||ev.d)>=NOW&&ev.d<=ahead&&ev.kind!=='sale'&&ev.kind!=='conference'){const c=wdCityKey(ev.city);if(c)E.push({k:'fair',ref:'event:'+ev.id,c,d:ev.d,t:ev.n,s:`${ev.e&&ev.e!==ev.d?fspan(ev.d,ev.e):fdate(ev.d)} · ${SEASON_KINDS[ev.kind]||ev.kind}${ev.tk==='tickets'?' · tickets on sale':''}`,v:0});}});   /* v24: the Season's fairs, biennales, shows and openings */
  liveWire().forEach(n=>{if(n.dt>=newsBack){const c=(n.city&&wdCityKey(n.city))||wdCityInText(`${n.h} ${n.s||''}`);if(c)E.push({k:'news',ref:null,c,d:n.dt,t:n.h,s:`${n.o} · ${fdate(n.dt)}`,v:0,news:n});}});
  return E;}
function wdStack(E){const by=new Map();E.forEach(e=>{const ll=wdLL(e.c);if(!ll)return;if(!by.has(e.c))by.set(e.c,{c:e.c,ll,v:glbVec(ll[0],ll[1]),E:[],sold:0,coming:0,news:0,fairs:0,sx:0,sy:0,d:-1,r:0});const p=by.get(e.c);p.E.push(e);if(e.k==='lot'||e.k==='sale')p.sold+=e.v;else if(e.k==='coming')p.coming+=e.v;else if(e.k==='news')p.news++;else if(e.k==='fair')p.fairs++;});
  const fresh=glbAddDays(NOW,-7);const P=[...by.values()];P.forEach(p=>{p.E.sort((a,b)=>String(b.d).localeCompare(String(a.d)));p.n=p.E.length;p.kind=p.sold>0?'sold':p.coming>0||p.E.some(e=>e.k==='coming')?'coming':p.fairs?'fair':'news';p.fresh=p.E.some(e=>(e.k==='lot'||e.k==='sale')&&e.d>=fresh);});
  return P.sort((a,b)=>b.sold-a.sold||b.coming-a.coming||b.n-a.n);}
/* ---- the readings: what the season's figures say, computed from the sale room and the lots on the globe ---- */
function wdReadings(E){const R=[];const S=liveSales();const done=S.filter(s=>s.res&&s.res.total!=null);const withV=done.filter(s=>LV_VERDICT.includes(s.res.v));
  if(withV.length>=3){const above=withV.filter(s=>s.res.v==='above').length,below=withV.filter(s=>s.res.v==='below').length;const n=withV.length;
    R.push({id:'verdicts',pill:`${above} of ${n} above estimate`,h:`${words(above)[0].toUpperCase()+words(above).slice(1)} of ${words(n)} evening sales with a verdict landed above their estimates; ${words(below)} ${below===1?'fell':'fell'} below.`,why:above>=n*.6?'The hammer against the estimate is the market’s own thermometer. A season where most sales clear the specialists’ floor is a seller’s season: bidders, not reserves, set the prices.':above<=n*.3?'The hammer against the estimate is the market’s own thermometer. When most sales land within or below, the reserves and the guarantees did the work and the estimates were set at the top of the market.':'The hammer against the estimate is the market’s own thermometer. A split season says the estimates were set about right: no froth, no fire sale.',go:'floor',anchor:'#tdSales'});}
  const sold=done.map(s=>{const m=String(s.res.sold||'').match(/(\d+)\s*of\s*(\d+)/);return m?[+m[1],+m[2]]:null;}).filter(Boolean);
  if(sold.length>=3){const a=sold.reduce((t,x)=>t+x[0],0),b=sold.reduce((t,x)=>t+x[1],0);const pct=Math.round(100*a/b);R.push({id:'sellthrough',pill:`${pct}% of lots sold`,h:`${a} of ${b} lots found a buyer across the ${words(sold.length)} evening sales that published a count: ${pct}% sold.`,why:pct>=90?'Evening sales are pre-sold by guarantees and curated to the last lot, so a rate in the nineties is the norm; what to read is the exceptions, the lots that were withdrawn or passed.':'A rate under ninety at an evening sale is unusual: the houses curate these to the last lot and guarantee the biggest. The passes say what the room would not pay for.',go:'floor',anchor:'#tdSales'});}
  const lots=E.filter(e=>e.k==='lot').sort((a,b)=>b.v-a.v);if(lots.length>=12){const tot=lots.reduce((t,e)=>t+e.v,0);const top=lots.slice(0,10).reduce((t,e)=>t+e.v,0);const pct=Math.round(100*top/tot);
    R.push({id:'concentration',pill:`Top ten lots: ${pct}% of the money`,h:`The ten highest lots on the globe made ${mm(top)} of the ${mm(tot)} the season’s ${lots.length} lots sold: ${pct}%.`,why:'The market is a pyramid: a few works carry the totals the press reports, and a total can rise while the middle thins. Read the season by its median as well as its top.',open:'all'});}
  const byCity=new Map();lots.forEach(e=>byCity.set(e.c,(byCity.get(e.c)||0)+e.v));const cities=[...byCity.entries()].sort((a,b)=>b[1]-a[1]);
  if(cities.length>=2){const tot=cities.reduce((t,c)=>t+c[1],0);const [c1,v1]=cities[0],[c2,v2]=cities[1];R.push({id:'where',pill:`${c1} took ${Math.round(100*v1/tot)}%`,h:`${c1} took ${Math.round(100*v1/tot)}% of what the globe’s lots made since ${fdate(glbAddDays(NOW,-WD_BACK))}; ${c2} ${Math.round(100*v2/tot)}%.`,why:'Where the money lands follows the calendar: the autumn runs London, Paris, then New York. The share says which room the consignors trusted with the season’s best material.',city:c1});}
  const ahead=S.filter(s=>!(s.res&&s.res.total!=null)&&s.d>=NOW&&s.d<=glbAddDays(NOW,60));if(ahead.length){const lo=ahead.reduce((t,s)=>t+((s.est||[])[0]||0),0),hi=ahead.reduce((t,s)=>{const e=s.est||[];return t+(e[e.length-1]||0);},0);
    R.push({id:'ahead',pill:`${ahead.length} sales to come, ${mm(lo)}–${mm(hi)}`,h:`${words(ahead.length)[0].toUpperCase()+words(ahead.length).slice(1)} evening sales in the next sixty days carry estimates of ${mm(lo)} to ${mm(hi)} before premium.`,why:'The estimate is the test the season sets itself. Watch the hammer against the low estimate, sale by sale, as the results come in: the verdicts above will move.',go:'floor',anchor:'#tdSales'});}
  const fresh=lots.filter(e=>e.d>=glbAddDays(NOW,-7));if(fresh.length){const top=fresh[0];R.push({id:'fresh',pill:`${fresh.length} sold this week`,h:`${fresh.length} ${fresh.length===1?'lot':'lots'} sold in the last seven days; the highest, ${top.t}, made ${mm(top.v)}.`,why:'The newest results are the ones the market has not yet priced in: they set the comparables for the sales to come.',ref:top.ref});}
  return R;}
/* ---- community pins: validated on read ---- */
const wdPinOk=p=>p&&typeof p==='object'&&typeof p.id==='string'&&/^[a-z0-9]{4,24}$/.test(p.id)&&Number.isFinite(+p.lon)&&Number.isFinite(+p.lat)&&Math.abs(+p.lon)<=180&&Math.abs(+p.lat)<=90&&typeof p.t==='string'&&p.t.trim()&&p.t.length<=80&&(p.n==null||(typeof p.n==='string'&&p.n.length<=280))&&(p.u==null||p.u===''||(typeof p.u==='string'&&/^https:\/\/[^\s"'<>]{4,300}$/.test(p.u)))&&(p.k in WD_KINDS)&&Number.isFinite(+p.ts)&&(p.city==null||(typeof p.city==='string'&&p.city.length<=60));
let wdTeardown=null,wdState=null,wdPending=null;
function wdInvalidate(){if(wdState&&wdState.rebuild)wdState.rebuild();}
/* worldJump({mode, year, city}): open the World on a mode, a year and a place; applied when the globe is drawn */
function worldJump(j){wdPending=j||null;go('world');if(wdState&&wdState.jump)wdState.jump();}
function renderWorld(el){if(!el)return;if(wdTeardown){try{wdTeardown();}catch(e){}wdTeardown=null;}
  const TAU=Math.PI*2,clampLat=v=>Math.max(-70,Math.min(70,v)),wrapLon=v=>((v+540)%360)-180;
  const canCanvas=typeof window.CanvasRenderingContext2D==='function';
  const mqReduce=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null,mqLight=window.matchMedia?window.matchMedia('(prefers-color-scheme: light)'):null;
  const tzLon=(()=>{try{return Math.max(-180,Math.min(180,-new Date().getTimezoneOffset()/4));}catch(e){return -40;}})();   /* the viewer's own longitude, roughly: 15° an hour */
  const G={mode:'now',lon0:tzLon,lat0:22,auto:true,hover:null,hovering:false,focused:false,hidden:!!document.hidden,visible:true,reduced:!!(mqReduce&&mqReduce.matches),w:0,h:0,dpr:1,R:0,cx:0,cy:0,k:1,fly:null,vel:0,raf:0,last:0,phase:0,ctx:null,T:null,suppressClick:false,idleAt:0,
    year:1874,playing:false,playT:0,born:new Map(),t0:performance.now(),pins:[],events:[],notes:[],placing:false,place:null,era:null,sel:null};
  wdState=G;
  G.jump=()=>{const j=wdPending;if(!j)return;wdPending=null;const ll=j.city&&wdLL(j.city);if(j.mode==='then'&&Number.isFinite(+j.year)){G.year=Math.max(-43000,Math.min(2026,Math.round(+j.year)));setMode('then');if(ll)flyTo(ll[0],ll[1],1200,true);openYear(false);}else{setMode(j.mode||'now');if(ll)flyTo(ll[0],ll[1],1200,true);const p=j.city&&G.pins.find(x=>x.c===j.city);if(p)openPin(p);}};
  /* ---- the land, prepared once ---- */
  const DOTS=Array.isArray(GLOBE_DOTS)?GLOBE_DOTS:[],NAMES=Array.isArray(GLOBE_COUNTRIES)?GLOBE_COUNTRIES:[],N=DOTS.length;
  const DX=new Float32Array(N),DY=new Float32Array(N),DZ=new Float32Array(N),DT=new Uint8Array(N);
  for(let i=0;i<N;i++){const d=DOTS[i],v=glbVec(d[0],d[1]);DX[i]=v[0];DY[i]=v[1];DZ[i]=v[2];DT[i]=shareTier(NAMES[d[2]]||'');}
  /* ---- the time layer ---- */
  const MV=MOVEMENTS.map(m=>({m,from:m.from,to:m.to==null?2027:m.to,centres:((typeof MOVEMENT_LL==='object'&&MOVEMENT_LL[m.id])||[]).map(c=>({c,ll:wdLL(c)})).filter(x=>x.ll).map(x=>({c:x.c,ll:x.ll,v:glbVec(x.ll[0],x.ll[1]),sx:0,sy:0,d:-1}))})).filter(x=>x.centres.length);
  const AB=Object.entries(typeof ARTIST_BORN==='object'?ARTIST_BORN:{}).map(([a,[c,b,dd]])=>{const ll=wdLL(c);return ll?{a,c,b,dd:dd==null?2027:dd,ll,v:glbVec(ll[0],ll[1]),lot:ARTISTS.includes(a),pics:Object.keys(IMG).filter(id=>IMG[id].a===a),sx:0,sy:0,d:-1}:null;}).filter(Boolean);
  const alive=y=>AB.filter(x=>x.b+18<=y&&x.dd>=y);
  const activeMv=y=>MV.filter(x=>x.from<=y&&x.to>=y);
  const emerging=y=>MV.filter(x=>x.from<=y&&x.from>=y-12&&x.to>=y);
  /* ---- the shifts ---- */
  const CE=(Array.isArray(CENTRES)?CENTRES:[]).map((c,i)=>({i,from:c[0],to:c[1],c:c[2],ll:wdLL(c[2]),t:c[3],why:c[4],src:c[5]})).filter(c=>c.ll).map(c=>Object.assign(c,{v:glbVec(c.ll[0],c.ll[1]),sx:0,sy:0,d:-1}));
  const CEARCS=[];for(let i=1;i<CE.length;i++){if(CE[i].c===CE[i-1].c)continue;const pts=glbArcPts(CE[i-1].ll,CE[i].ll,.22);if(pts)CEARCS.push({i,pts});}
  const HB=HUBS.filter(h=>typeof h.lon==='number'&&typeof h.lat==='number').map(h=>({h,v:glbVec(h.lon,h.lat),sx:0,sy:0,d:-1}));
  /* ---- the events ---- */
  function rebuild(){try{G.events=wdEvents();G.pins=wdStack(G.events);}catch(err){reportError(err,'world events');G.events=[];G.pins=[];}const t=performance.now();G.pins.forEach((p,i)=>{if(!G.born.has(p.c))G.born.set(p.c,t+i*70);});
    if(!G.shown&&!G.framed){const S=G.pins.filter(p=>p.sold>0);if(S.length){let sx=0,sy=0,sz=0;S.forEach(p=>{const w=Math.log10(1+p.sold);sx+=p.v[0]*w;sy+=p.v[1]*w;sz+=p.v[2]*w;});G.lon0=wrapLon(Math.atan2(sy,sx)*180/Math.PI);G.lat0=clampLat(Math.atan2(sz,Math.hypot(sx,sy))*180/Math.PI);G.framed=true;}}   /* the first view frames where the money went */
    drawLead();drawLegend();drawReadings();redraw();}
  G.rebuild=rebuild;
  /* ---- the markup ---- */
  el.innerHTML=`<div class="wd" data-mode="now">
    <div class="wd-stage">${canCanvas?`<canvas class="wd-cv" tabindex="0" role="img" aria-label="The world, with the art market’s sales and news on it"></canvas>`:`<div class="wd-nocanvas" aria-hidden="true"></div>`}
      <div class="wd-lead"><span class="eyebrow wd-eye"></span><h1 class="wd-h1"></h1><p class="wd-read"></p>
        <div class="wd-modes" role="tablist" aria-label="What the globe shows">${WD_MODES.map(([k,n])=>`<button class="wd-mode" role="tab" data-wmode="${k}" aria-selected="false">${n}</button>`).join('')}</div>
        <div class="wd-readings" id="wdReadings"></div></div>
      <div class="wd-rail" hidden><button class="wd-play" aria-pressed="false" title="Walk through time">Play</button>
        <div class="wd-railin"><input type="range" class="wd-range" min="0" max="1000" value="${Math.round(wdY2T(G.year)*1000)}" aria-label="Year" aria-valuetext="${wdYear(G.year)}"><div class="wd-ticks" aria-hidden="true">${WD_TICKS.map(y=>`<span style="left:${(wdY2T(y)*100).toFixed(2)}%">${y===2027?'now':y<0?`${-y/1000}k BC`:y===1?'0':y}</span>`).join('')}</div></div>
        <span class="wd-yr serif"></span></div>
      <div class="wd-foot"><div class="wd-legend"></div>
        <form class="wd-ask" role="search"><input class="wd-q" type="search" placeholder="Ask about any movement, sale or price…" aria-label="Ask Subhasta" autocomplete="off"><button class="wd-go" type="submit">Ask</button></form></div>
      <aside class="wd-card" hidden><div class="wd-cardh"><div class="wd-ct"><span class="label wd-ck"></span><h2 class="wd-ch"></h2></div><button class="wd-x" aria-label="Close">×</button></div><div class="wd-cb"></div></aside></div>
    <div class="wd-strip"><button class="wd-list" type="button">Everything on the globe</button><span class="sep" aria-hidden="true"></span><span class="label">Go on</span><button data-v="floor">Today’s read</button><button data-v="movements">The movements</button><button data-v="hammer">The sale room</button><button data-v="ask">Ask the analyst</button><button data-v="reel">The Reel</button></div>
  </div>`;
  const wrap=$('.wd',el),stage=$('.wd-stage',el),cv=$('.wd-cv',el),card=$('.wd-card',el),cardB=$('.wd-cb',el),cardH=$('.wd-ch',el),cardK=$('.wd-ck',el),rail=$('.wd-rail',el),range=$('.wd-range',el),playBtn=$('.wd-play',el),yrEl=$('.wd-yr',el);
  const listeners=[];const on=(t,ev,f,o)=>{t.addEventListener(ev,f,o);listeners.push([t,ev,f,o]);};
  /* ---- the lead, per mode ---- */
  function lead(){const P=G.pins;
    if(G.mode==='now'){const sold=G.events.filter(e=>e.k==='lot'||e.k==='sale'),coming=G.events.filter(e=>e.k==='coming'),cities=new Set(sold.map(e=>e.c)),tot=sold.reduce((s,e)=>s+e.v,0);const top=sold.filter(e=>e.k==='lot').sort((a,b)=>b.v-a.v)[0]||sold.slice().sort((a,b)=>b.v-a.v)[0];const next=coming.slice().sort((a,b)=>String(a.d).localeCompare(String(b.d))||b.v-a.v)[0];const since=['January','February','March','April','May','June','July','August','September','October','November','December'][+glbAddDays(NOW,-WD_BACK).slice(5,7)-1];
      return {eye:`The art world, ${fdate(NOW)}`,h1:sold.length?`${mm(tot)} sold in ${words(cities.size)} ${cities.size===1?'city':'cities'} since ${since}.`:'The season’s sales, on the globe.',read:`${top?`Top lot: ${cut(top.t,70)}, ${mm(top.v)}.`:''} ${next?`Next on the block: ${cut(next.t,70)}, ${fdate(next.d)}.`:''} Turn the globe; a dot is a city: gold where something sold this season, red where it sold this week, a diamond where a fair or a show is coming. Click it.`};}
    if(G.mode==='then'){const y=G.year,am=activeMv(y).slice().sort((a,b)=>b.from-a.from),al=alive(y),em=emerging(y);const names=(em.length?em:am).slice(0,2).map(x=>x.m.n);
      return {eye:`Back in time · ${wdYear(y)}`,h1:am.length?`${names.map(n=>n.replace(/ \(.*\)$/,'').replace(/:.*$/,'')).join(', ')}${am.length>names.length?` and ${words(am.length-names.length)} more`:''}.`:'Before the first image.',read:`${am.length?`${words(am.length)[0].toUpperCase()+words(am.length).slice(1)} ${am.length===1?'movement':'movements'} alive, ${al.length} painters at work.`:''} ${em.length?`Emerging: ${em.map(x=>x.m.n).slice(0,3).join(', ')}.`:''} Drag the rail or press Play; the globe flies to where the art was.`};}
    if(G.mode==='shifts'){const first=CE[0],last=CE[CE.length-1];return {eye:'Where the centre moved',h1:`${CE.length?`From ${first.c} to ${last.c} in ${words(CE.length-1)} moves`:'The centre of gravity'}.`,read:'The trade’s centre of gravity, era by era, drawn over today’s shares: the brighter the land, the larger its share of sales. The pulsing hubs are rising now. Click an era.'};}
    const n=G.notes.length,mine=G.notes.filter(x=>x.uid===myId).length;return {eye:'Readers’ notes',h1:n?`${words(n)[0].toUpperCase()+words(n).slice(1)} ${n===1?'note':'notes'} pinned by readers.`:'Pin what you have seen.',read:`${dbRef?(askCanWrite===false?'Notes are read-only in your view.':`Click a place on the globe, then write what belongs there: a show, a sale, a room. ${mine?`${mine} of these are yours.`:''}`):'Open the page signed in to add a note.'}`};}
  function drawLead(){const L=lead();$('.wd-eye',el).textContent=L.eye;$('.wd-h1',el).textContent=L.h1;$('.wd-read',el).textContent=L.read.replace(/\s+/g,' ').trim();
    $$('.wd-mode',el).forEach(b=>{const onb=b.dataset.wmode===G.mode;b.classList.toggle('on',onb);b.setAttribute('aria-selected',String(onb));b.tabIndex=onb?0:-1;});wrap.dataset.mode=G.mode;rail.hidden=G.mode!=='then';
    if(cv)cv.setAttribute('aria-label',`The world. ${L.h1} ${L.read}`);}
  function drawReadings(){const el2=$('#wdReadings',el);if(!el2)return;if(G.mode!=='now'){el2.innerHTML='';return;}const R=wdReadings(G.events);el2.innerHTML=R.length?`<span class="label">Readings</span>${R.slice(0,3).map(r=>`<button class="wd-rd" data-rd="${esc(r.id)}">${esc(r.pill)}</button>`).join('')}${R.length>3?`<button class="wd-rd more" data-rd="all">+${R.length-3}</button>`:''}`:'';
    $$('.wd-rd',el2).forEach(b=>b.addEventListener('click',()=>openReadings(b.dataset.rd)));}
  function openReadings(which){const R=wdReadings(G.events);if(!R.length)return;const sel=which&&which!=='all'?R.filter(r=>r.id===which):R;
    openCard(`${R.length} readings`,'What the season says',`<div class="wd-sub">Computed from the sale room and the lots on the globe, each with the terminal’s reading and the evidence it rests on.</div>${sel.map(r=>`<div class="wd-sec wd-rdg"><b>${esc(r.h)}</b><p>${esc(r.why)}</p><button class="btn sm" data-rdgo="${esc(r.id)}">${r.ref?'Open the lot':r.city?`Open ${esc(r.city)}`:r.open?'Everything on the globe':'The sale room'}</button></div>`).join('')}${sel.length<R.length?`<div class="wd-sec"><button class="btn sm" data-rdgo="all">All ${R.length} readings</button></div>`:''}`);
    $$('[data-rdgo]',cardB).forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.rdgo;if(id==='all')return openReadings('all');const r=R.find(x=>x.id===id);if(!r)return;if(r.ref)return wdOpen(r.ref);if(r.city){const p=G.pins.find(x=>x.c===r.city);if(p)return openPin(p);}if(r.open==='all')return openAll();if(r.go){go(r.go);if(r.anchor)setTimeout(()=>{const t=$(r.anchor);if(t)scrollToEl(t);},120);}}));}
  function drawLegend(){const lg=$('.wd-legend',el);if(G.mode==='now'){const s=G.pins.filter(p=>p.kind==='sold').length,n=G.events.filter(e=>e.k==='news').length,f=G.events.filter(e=>e.k==='fair').length;const c2=G.pins.filter(p=>p.E.some(e=>e.k==='coming')).length;const fr=G.pins.filter(p=>p.fresh).length;lg.innerHTML=`<span><i class="sold"></i>${s} ${s===1?'city':'cities'} with sales</span>${fr?`<span><i class="fresh"></i>${fr} sold this week</span>`:''}<span><i class="coming"></i>${c2} with sales to come</span><span><i class="fair"></i>${f} fairs and shows</span><span><i class="news"></i>${n} news</span>`;}
    else if(G.mode==='then')lg.innerHTML=`<span><i class="mv"></i>a movement at its centre</span><span><i class="ar"></i>a painter, at their birthplace</span>`;
    else if(G.mode==='shifts')lg.innerHTML=`<span><i class="ce"></i>the centre, by era</span><span><i class="rise"></i>rising now</span>`;
    else lg.innerHTML=`<span><i class="note"></i>a reader’s note</span>`;}
  /* ---- the card ---- */
  let cardOpener=null;
  function openCard(kind,title,html,focus){cardK.textContent=kind;cardH.textContent=title;cardB.innerHTML=html;card.hidden=false;wrap.classList.add('has-card');bindRefs(cardB);bindAskButtons(cardB);bindLightbox(cardB);bindLinks(cardB);
    $$('[data-wopen]',cardB).forEach(b=>b.addEventListener('click',()=>wdOpen(b.dataset.wopen)));$$('[data-wnews]',cardB).forEach(b=>b.addEventListener('click',()=>{const n=G.events[+b.dataset.wnews];if(n&&n.news)openNewsItem(n.news);}));
    $$('[data-wera]',cardB).forEach(b=>b.addEventListener('click',()=>selectEra(+b.dataset.wera)));$$('[data-wmove]',cardB).forEach(b=>b.addEventListener('click',()=>openMovement(b.dataset.wmove)));
    $$('[data-wcity]',cardB).forEach(b=>b.addEventListener('click',()=>{const p=G.pins.find(x=>x.c===b.dataset.wcity);if(p)openPin(p);}));
    $$('[data-wyear]',cardB).forEach(b=>b.addEventListener('click',()=>setYear(+b.dataset.wyear,true)));
    $$('[data-wlib]',cardB).forEach(b=>b.addEventListener('click',()=>{const yy=+b.dataset.wlib;const e=LIB_ERAS.find(x=>x[0]!=='all'&&yy>=x[2]&&yy<=x[3]);libs.era=e?e[0]:'all';libs.mv='all';libs.city='all';libs.q='';libCent=null;if(rendered.library)renderLibrary();go('library');}));
    if(focus!==false){cardOpener=document.activeElement;const x=$('.wd-x',card);if(x)focusEl(x);}}
  function closeCard(){if(card.hidden)return;card.hidden=true;wrap.classList.remove('has-card');G.sel=null;G.placing=false;G.place=null;if(card.contains(document.activeElement)){if(cardOpener&&isVisible(cardOpener))focusEl(cardOpener);else if(cv)focusEl(cv);}redraw();}
  $('.wd-x',el).addEventListener('click',closeCard);
  function openNewsItem(n){openDrawer(esc(n.h),`${esc(n.o)} · ${esc(fdate(n.dt))}`,`<div class="sec quote">${esc(n.s||'')}</div>${n.u&&/^https:\/\//.test(n.u)?`<div class="sec"><a class="btn" href="${esc(n.u)}" target="_blank" rel="noopener">Read it at ${esc(n.o)} ↗</a></div>`:''}`);}
  function wdOpen(ref){const i=ref.indexOf(':');const k=ref.slice(0,i),id=ref.slice(i+1);if(k==='hub')return openHub(id);if(k==='sale')return openSale(id);if(k==='event')return openEvent(id);return openRef(ref);}
  const KN={lot:'Sold',sale:'Sale',coming:'To come',fair:'Fair',news:'News'};
  function eventRow(e,i){const idx=G.events.indexOf(e);const pic=e.img&&IMG[e.img]?`<img class="wd-th" src="img/t/${esc(e.img)}.jpg" alt="" loading="lazy">`:'';const btn=e.ref?`data-wopen="${esc(e.ref)}"`:`data-wnews="${idx}"`;
    return `<button class="wd-ev ${e.k}" ${btn}><span class="kk">${KN[e.k]||e.k}</span>${pic}<span class="tt"><b>${esc(e.t)}</b><small>${esc(e.s)}</small></span>${e.v?`<span class="vv money">${mm(e.v)}</span>`:''}</button>`;}
  function showPin(p){if(G.w<760)return;const off=G.w>=1100?34:22;flyTo(p.ll[0]+off,p.ll[1],900,true);}
  function openPin(p){G.sel=p.c;showPin(p);trailAdd({k:'city',id:p.c,t:p.c,sub:`${p.n} ${p.n===1?'event':'events'}`});const sold=p.E.filter(e=>e.k==='lot'||e.k==='sale').sort((a,b)=>b.v-a.v||String(b.d).localeCompare(String(a.d))),coming=p.E.filter(e=>e.k==='coming').sort((a,b)=>String(a.d).localeCompare(String(b.d))||b.v-a.v),fairs=p.E.filter(e=>e.k==='fair'),news=p.E.filter(e=>e.k==='news');
    const sec=(t,L)=>L.length?`<div class="wd-sec"><span class="label cap">${t}</span>${L.map(eventRow).join('')}</div>`:'';
    const hub=HUBS.find(h=>h.n.split(',')[0]===p.c);
    openCard(`${p.n} ${p.n===1?'event':'events'}${p.sold?` · ${mm(p.sold)} sold`:''}`,p.c,`${sec('Sold',sold)}${sec('To come',coming)}${sec('Fairs',fairs)}${sec('On the wire',news)}${hub?`<div class="wd-sec"><button class="btn sm" data-wopen="hub:${esc(hub.id)}">The ${esc(p.c)} dossier: houses, taxes, export rules</button></div>`:''}`);redraw();}
  function openAll(){const P=G.pins;if(G.mode==='now')openCard(`${G.events.length} events in ${P.length} cities`,'Everything on the globe',P.map(p=>`<button class="wd-ev city ${p.kind}" data-wcity="${esc(p.c)}"><span class="kk">${p.kind==='sold'?'Sold':p.kind==='coming'?'To come':p.kind==='fair'?'Fair':'News'}</span><span class="tt"><b>${esc(p.c)}</b><small>${p.n} ${p.n===1?'event':'events'}${p.sold?` · ${mm(p.sold)} sold`:''}${p.coming?` · ${mm(p.coming)} to come`:''}</small></span></button>`).join(''));
    else if(G.mode==='then')openYear();else if(G.mode==='shifts')openEras();else openNotes();}
  /* ---- then: the year ---- */
  function setYear(y,fly){y=Math.max(-43000,Math.min(2026,Math.round(y)));if(y===G.year&&!fly)return;G.year=y;range.value=String(Math.round(wdY2T(y)*1000));range.setAttribute('aria-valuetext',wdYear(y));yrEl.textContent=wdYear(y);drawLead();if(!card.hidden&&G.mode==='then')openYear(false);
    if(fly!==false){const am=activeMv(y);if(am.length){let sx=0,sy=0,sz=0;am.forEach(x=>x.centres.forEach(c=>{sx+=c.v[0];sy+=c.v[1];sz+=c.v[2];}));const lon=Math.atan2(sy,sx)*180/Math.PI,lat=Math.atan2(sz,Math.hypot(sx,sy))*180/Math.PI;if(Math.abs(wrapLon(lon-G.lon0))>18||Math.abs(lat-G.lat0)>12)flyTo(lon,lat,fly===true?900:1600,true);}}
    redraw();}
  function openYear(focus){const y=G.year,am=activeMv(y).sort((a,b)=>b.from-a.from),al=alive(y);const pics=[];const painters=al.filter(x=>x.pics.length).sort((a,b)=>(b.lot?1:0)-(a.lot?1:0)||b.b-a.b);for(let round=0;pics.length<8&&painters.some(x=>x.pics.length>round);round++)painters.forEach(x=>{const id=x.pics[round];if(id&&pics.length<8&&!pics.includes(id))pics.push(id);});   /* one picture per painter first */
    const lots=RESULTS.filter(r=>{const b=ARTIST_BORN[r.artist];return b&&b[1]+18<=y&&(b[2]==null?2027:b[2])>=y;}).sort((a,b)=>b.price-a.price).slice(0,3);
    openCard(`${am.length} ${am.length===1?'movement':'movements'} · ${al.length} painters`,wdYear(y),`${pics.length?`<div class="wd-pics">${pics.map(id=>`<a href="#" data-lb="${esc(id)}" class="wd-pic" title="${esc(IMG[id].a+', '+IMG[id].t+', '+IMG[id].y)}"><img src="img/t/${esc(id)}.jpg" alt="${esc(IMG[id].a+', '+IMG[id].t)}" loading="lazy"></a>`).join('')}</div><div class="wd-sub">Painted by artists alive in ${esc(wdYear(y))}; click for the full picture and its credit.</div>`:''}
      ${am.length?`<div class="wd-sec"><span class="label cap">Alive this year</span>${am.map(x=>`<button class="wd-ev mv" data-wmove="${esc(x.m.id)}"><span class="kk">${x.from>=y-12?'New':''}</span><span class="tt"><b>${esc(x.m.n)}</b><small>${esc(x.m.place)} · ${esc(wdYear(x.from))}–${x.m.to==null?'now':esc(wdYear(x.to))}</small></span></button>`).join('')}</div>`:'<div class="wd-sub">No movement in the terminal’s list is alive this year; the painters below were.</div>'}
      ${al.length?`<div class="wd-sec"><span class="label cap">At work</span><p class="wd-names">${al.sort((a,b)=>(b.lot?1:0)-(a.lot?1:0)||a.b-b.b).slice(0,24).map(x=>x.lot?`<button class="ref" data-ref="artist:${esc(x.a)}">${esc(x.a)}</button>`:esc(x.a)).join(', ')}${al.length>24?` and ${al.length-24} more`:''}.</p></div>`:''}
      ${lots.length?`<div class="wd-sec"><span class="label cap">What their work makes now</span>${lots.map(r=>`<button class="wd-ev lot" data-wopen="lot:${esc(r.id)}"><span class="kk">Sold</span><span class="tt"><b>${esc(r.artist)}, ${esc(r.title)}</b><small>${esc(houseName(r.house))} · ${esc(fdate(r.date))}</small></span><span class="vv money">${mm(r.price)}</span></button>`).join('')}</div>`:''}
      ${pics.length?`<div class="wd-sec"><button class="btn sm" data-wlib="${y}">Open the Library around ${esc(wdYear(y))}</button></div>`:''}
      <div class="wd-sec wd-jump"><span class="label cap">Jump</span>${[[-15000,'the caves'],[-450,'Athens'],[1300,'Giotto'],[1480,'Florence'],[1640,'Amsterdam'],[1874,'Paris, 1874'],[1912,'the avant-garde'],[1955,'New York'],[2026,'now']].map(([yy,l])=>`<button class="tag${yy===y?' on':''}" data-wyear="${yy}">${esc(l)}</button>`).join('')}</div>`,focus);}
  function play(onp){G.playing=onp==null?!G.playing:!!onp;playBtn.classList.toggle('on',G.playing);playBtn.setAttribute('aria-pressed',String(G.playing));playBtn.textContent=G.playing?'Pause':'Play';if(G.playing){G.playT=wdY2T(G.year);if(G.playT>=.999)G.playT=0;}kick();}
  on(range,'input',()=>{play(false);setYear(wdT2Y(+range.value/1000),true);});
  on(playBtn,'click',()=>play());
  /* ---- shifts: the eras ---- */
  function selectEra(i){G.era=i;const c=CE[i];if(!c)return;trailAdd({k:'era',id:String(i),t:c.t,sub:`${wdYear(c.from)}–${c.to>=2027?'now':wdYear(c.to)}`});flyTo(c.ll[0],c.ll[1],1000,true);openEras(false);redraw();}
  function openEras(focus){openCard(`${CE.length} eras`,'Where the centre sat',`${CE.map(c=>`<button class="wd-ev era${G.era===c.i?' on':''}" data-wera="${c.i}"><span class="kk">${c.i+1}</span><span class="tt"><b>${esc(c.t)}</b><small>${esc(wdYear(c.from))}–${c.to>=2027?'now':esc(wdYear(c.to))} · ${esc(c.c)}</small>${G.era===c.i?`<span class="why">${esc(c.why)}</span><span class="src">${esc(c.src)}</span>`:''}</span></button>`).join('')}
    <div class="wd-sec"><span class="label cap">Rising now</span><p class="wd-names">${HUBS.filter(h=>(h.momentum||0)>0).sort((a,b)=>b.momentum-a.momentum||a.tier-b.tier).map(h=>`<button class="ref" data-wopen="hub:${esc(h.id)}">${esc(h.n.split(',')[0])}</button>`).join(', ')}.</p></div>
    ${SIGNALS.some(x=>x.dir==='heat')?`<div class="wd-sec"><span class="label cap">Heating</span>${SIGNALS.map((x,i)=>[x,i]).filter(([x])=>x.dir==='heat').slice(0,6).map(([x,i])=>`<button class="wd-ev" data-wopen="signal:${i}"><span class="kk">Signal</span><span class="tt"><b>${esc(x.t)}</b><small>${esc(cut(x.p,120))}</small></span></button>`).join('')}</div>`:''}
    <div class="wd-sec"><div class="wd-sub">Momentum is the terminal’s reading of each hub’s last twelve months; the land is tinted by each country’s share of 2025 sales (Arts Economics for Art Basel &amp; UBS); the signals are the terminal’s, from the Pulse. The eras are a reading, not a measurement; each names the book it rests on.</div></div>`,focus);}
  /* ---- notes ---- */
  let notesUnsub=null;
  function subscribeNotes(){if(!dbRef||notesUnsub)return;try{const h=dbRef.collection('pins').onSnapshot(snap=>{const all=[];(snap&&snap.docs||[]).forEach(d=>{const x=d.exists===false?null:(typeof d.data==='function'?d.data():d.data);if(x&&Array.isArray(x.items))x.items.filter(wdPinOk).slice(0,20).forEach(p=>all.push({uid:d.id,id:p.id,lon:+p.lon,lat:+p.lat,city:p.city||'',t:p.t,n:p.n||'',u:p.u||'',k:p.k,ts:+p.ts,v:glbVec(+p.lon,+p.lat),sx:0,sy:0,d:-1}));});
      G.notes=all.sort((a,b)=>b.ts-a.ts);if(G.mode==='notes'){drawLead();if(!card.hidden)openNotes(false);}redraw();},()=>{});notesUnsub=typeof h==='function'?h:null;}catch(e){}}
  const nearCity=(lon,lat)=>{let best=null,bd=1e9;for(const [c,ll] of Object.entries(CITY_LL)){const d=Math.hypot((ll[0]-lon)*Math.cos(lat*Math.PI/180),ll[1]-lat);if(d<bd){bd=d;best=c;}}return bd<4?best:'';};
  function noteRow(p){const mine=p.uid===myId;return `<div class="wd-note"><span class="kk">${esc(WD_KINDS[p.k]||'Note')}</span><div class="tt"><b>${esc(p.t)}</b>${p.n?`<p>${esc(p.n)}</p>`:''}<small>${esc(p.city||`${p.lat.toFixed(1)}°, ${p.lon.toFixed(1)}°`)} · ${esc(fdate(new Date(p.ts).toISOString().slice(0,10)))}${p.u?` · <a href="${esc(p.u)}" target="_blank" rel="noopener">link ↗</a>`:''}</small>${(mine||askOwner)&&dbRef?`<button class="btn sm wd-rm" data-rm="${esc(p.uid)}:${esc(p.id)}">Remove</button>`:''}</div></div>`;}
  const TRAIL_K={picture:'Picture',city:'City',movement:'Movement',lot:'Lot',artist:'Artist',era:'Era'};
  function trailHTML(){const T=trailAll();if(!T.length)return '';return `<div class="wd-sec"><span class="label cap">Your trail</span><div class="wd-sub">What you opened here, kept in this browser only.</div>${T.slice(0,8).map((x,i)=>`<button class="wd-ev trail" data-trail="${i}"><span class="kk">${esc(TRAIL_K[x.k]||x.k)}</span><span class="tt"><b>${esc(x.t)}</b>${x.sub?`<small>${esc(x.sub)}</small>`:''}</span></button>`).join('')}</div>`;}
  function trailOpen(x){if(!x)return;if(x.k==='picture'&&IMG[x.id])return openLightbox(x.id,Object.keys(IMG));if(x.k==='city'){const p=G.pins.find(q=>q.c===x.id);if(p){setMode('now');openPin(p);}return;}if(x.k==='movement')return openMovement(x.id);if(x.k==='era'){setMode('shifts');selectEra(+x.id);return;}if(x.k==='lot'&&lotById(x.id))return openLot(lotById(x.id));if(x.k==='artist')return openArtist(x.id);}
  function openNotes(focus,sel){const L=sel?G.notes.filter(p=>sel.includes(p)):G.notes;const can=!!(dbRef&&myId&&askCanWrite!==false);
    openCard(`${L.length} ${L.length===1?'note':'notes'}`,sel?(L[0]&&L[0].city||'Here'):'Readers’ notes',`${L.length?L.map(noteRow).join(''):'<div class="wd-sub">Nothing pinned yet.</div>'}${can?`<div class="wd-sec"><button class="btn primary wd-add">${G.placing?'Click the globe where it belongs…':'Pin a note'}</button><div class="wd-sub">Your note is yours to remove; the page’s owner can remove any. Keep it to what you saw, no prices you cannot source.</div></div>`:(dbRef?'':'<div class="wd-sub">Sign in to the page to add a note.</div>')}${sel?'':trailHTML()}`,focus);
    $$('[data-trail]',cardB).forEach(b=>b.addEventListener('click',()=>trailOpen(trailAll()[+b.dataset.trail])));
    const add=$('.wd-add',cardB);if(add)add.addEventListener('click',()=>{G.placing=!G.placing;add.textContent=G.placing?'Click the globe where it belongs…':'Pin a note';if(G.placing)toast('Now click the globe');});
    $$('.wd-rm',cardB).forEach(b=>b.addEventListener('click',()=>removeNote(b.dataset.rm)));}
  function noteForm(lon,lat){const city=nearCity(lon,lat);openCard('A new note',city||`${lat.toFixed(1)}°, ${lon.toFixed(1)}°`,`<form class="wd-nf"><label>Kind<select name="k">${Object.entries(WD_KINDS).map(([k,n])=>`<option value="${k}">${n}</option>`).join('')}</select></label><label>Title<input name="t" maxlength="80" required placeholder="The show, the sale, the room"></label><label>Note<textarea name="n" maxlength="280" placeholder="What you saw, in a sentence or two"></textarea></label><label>Link (https, optional)<input name="u" type="url" maxlength="300" placeholder="https://"></label><div class="chips"><button class="btn primary" type="submit">Pin it</button><button class="btn wd-cancel" type="button">Cancel</button></div></form>`);
    const f=$('.wd-nf',cardB);$('.wd-cancel',cardB).addEventListener('click',()=>{G.place=null;openNotes();});f.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(f);const u=String(fd.get('u')||'').trim();if(u&&!/^https:\/\/[^\s"'<>]{4,300}$/.test(u)){toast('The link must start with https://');return;}
      const p={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),lon:+lon.toFixed(2),lat:+lat.toFixed(2),city,t:String(fd.get('t')||'').trim().slice(0,80),n:String(fd.get('n')||'').trim().slice(0,280),u,k:String(fd.get('k')||'note'),ts:Date.now()};if(!wdPinOk(p)){toast('A title is needed');return;}saveNotes(myId,[p,...G.notes.filter(x=>x.uid===myId).map(strip)].slice(0,20)).then(()=>{G.place=null;toast('Pinned');}).catch(()=>toast('The page refused the note'));});
    const t=$('[name=t]',f);if(t)focusEl(t);}
  const strip=p=>({id:p.id,lon:p.lon,lat:p.lat,city:p.city,t:p.t,n:p.n,u:p.u,k:p.k,ts:p.ts});
  function saveNotes(uid,items){if(!dbRef||!uid)return Promise.reject(new Error('no db'));return dbRef.collection('pins').doc(uid).set({items,updated:Date.now()});}
  function removeNote(key){const i=key.indexOf(':');const uid=key.slice(0,i),id=key.slice(i+1);if(!(uid===myId||askOwner))return;const rest=G.notes.filter(x=>x.uid===uid&&x.id!==id).map(strip);saveNotes(uid,rest).then(()=>toast('Removed')).catch(()=>toast('The page refused the change'));}
  /* ---- modes ---- */
  function setMode(m){if(!WD_MODES.some(([k])=>k===m))m='now';G.mode=m;G.placing=false;G.place=null;closeCard();drawLead();drawLegend();drawReadings();if(m==='then'){yrEl.textContent=wdYear(G.year);setYear(G.year,true);}else play(false);if(m==='notes')subscribeNotes();if(m==='shifts'&&G.era==null&&CE.length)flyTo(CE[CE.length-1].ll[0],CE[CE.length-1].ll[1],1200,true);redraw();kick();}
  $$('.wd-mode',el).forEach(b=>{b.addEventListener('click',()=>setMode(b.dataset.wmode));b.addEventListener('keydown',e=>{const all=$$('.wd-mode',el),i=all.indexOf(b);if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const n=all[(i+(e.key==='ArrowRight'?1:all.length-1))%all.length];setMode(n.dataset.wmode);focusEl(n);}});});
  $('.wd-list',el).addEventListener('click',openAll);
  $('.wd-ask',el).addEventListener('submit',e=>{e.preventDefault();const q=$('.wd-q',el).value.trim();askOpen(q||undefined);});
  $$('.wd-strip [data-v]',el).forEach(b=>b.addEventListener('click',()=>{if(b.dataset.v==='reel')openReelHere(0);else go(b.dataset.v);}));
  /* ---- the canvas ---- */
  function tokens(){const cs=getComputedStyle(document.documentElement),g=k=>cs.getPropertyValue(k).trim();const light=document.documentElement.getAttribute('data-theme')==='light'||(document.documentElement.getAttribute('data-theme')!=='dark'&&!!(mqLight&&mqLight.matches));
    const T={light,ink:glbRgb(g('--ink')),ink2:glbRgb(g('--ink2')),ink3:glbRgb(g('--ink3')),gilt:glbRgb(g('--gilt')),live:glbRgb(g('--live')||'#ff4d2e'),live2:glbRgb(g('--live2')||'#ff8a70'),paper:glbRgb(g('--paper')),paper2:glbRgb(g('--paper2')),ground:glbRgb(g('--ground')),rule:glbRgb(g('--rule2')),verd:glbRgb(g('--verd')),ui:g('--ui')||'sans-serif',display:g('--display')||'serif'};
    T.land=light?glbMix(T.ink2,T.ink3,.3):glbMix(T.ink3,T.ink2,.25);T.tier=[0,.12,.26,.42,.62,.85].map(m=>glbMix(T.land,T.gilt,m));G.T=T;return T;}
  function fit(){if(!cv)return false;const r=stage.getBoundingClientRect();const w=Math.floor(r.width);if(w<40)return false;const phone=w<760;const top=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top'))||64;const h=Math.floor(Math.max(360,Math.min(window.innerHeight-top,1100)));const dpr=Math.min(2.5,window.devicePixelRatio||1);const H=phone?Math.round(Math.min(h,w*1.02)):h;
    if(w===G.w&&H===G.h&&dpr===G.dpr)return true;G.w=w;G.h=H;G.dpr=dpr;cv.width=Math.round(w*dpr);cv.height=Math.round(H*dpr);cv.style.width=w+'px';cv.style.height=H+'px';stage.style.height=H+'px';
    G.R=phone?Math.min(w*.45,H*.43):Math.min(H*.41,w*.29);G.cx=phone?w/2:w*.645;G.cy=phone?H*.5:H*.49;G.k=Math.max(.7,Math.min(1.25,G.R/360));return true;}
  let cl=1,sl=0,cp=1,sp=0;function setRot(){const lam=G.lon0*Math.PI/180,phi=G.lat0*Math.PI/180;cl=Math.cos(lam);sl=Math.sin(lam);cp=Math.cos(phi);sp=Math.sin(phi);}
  function proj(v){const x1=v[0]*cl+v[1]*sl,y1=-v[0]*sl+v[1]*cl,d=x1*cp+v[2]*sp,up=-x1*sp+v[2]*cp;return [G.cx+G.R*y1,G.cy-G.R*up,d,y1*y1+up*up];}
  function polyline(c,pts,test){let open=false;for(let i=0;i<pts.length;i++){const p=proj(pts[i]);if(test(p)){if(open)c.lineTo(p[0],p[1]);else{c.moveTo(p[0],p[1]);open=true;}}else open=false;}}
  const onSphere=p=>p[2]>0,lifted=p=>p[2]>0||p[3]>1;
  const boxes=[];function placeLabel(c,txt,x,y,gap,hh,prefer){const w=c.measureText(txt).width;const cands=prefer==='above'?[[x-w/2,y-gap-hh/2],[x+gap,y],[x-gap-w,y],[x-w/2,y+gap+hh/2]]:[[x+gap,y],[x-gap-w,y],[x-w/2,y-gap-hh/2],[x-w/2,y+gap+hh/2]];for(const [lx,ly] of cands){const bx=[lx-3,ly-hh/2,w+6,hh];if(bx[0]<2||bx[0]+bx[2]>G.w-2||bx[1]<2||bx[1]+bx[3]>G.h-2)continue;if(boxes.some(o=>bx[0]<o[0]+o[2]&&bx[0]+bx[2]>o[0]&&bx[1]<o[1]+o[3]&&bx[1]+bx[3]>o[1]))continue;boxes.push(bx);return [lx,ly];}return null;}
  function text(c,txt,x,y,col,a){c.lineWidth=3;c.strokeStyle=glbCss(G.T.ground,.85);c.strokeText(txt,x,y);c.fillStyle=glbCss(col,a==null?1:a);c.fillText(txt,x,y);}
  const pinR=p=>(p.kind==='sold'?3.6+2.6*Math.log10(1+p.sold):p.kind==='coming'?3.4+1.6*Math.log10(1+p.coming):2.6)*G.k;
  function draw(){const c=G.ctx;if(!c||!G.w)return;const T=G.T||tokens();const {w,h,dpr,R,cx,cy,k}=G;const now=performance.now();setRot();c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);boxes.length=0;
    /* the halo and the sphere */
    const halo=c.createRadialGradient(cx,cy,R*.96,cx,cy,R*1.18);halo.addColorStop(0,glbCss(T.light?T.ink3:T.ink2,T.light?.14:.16));halo.addColorStop(.35,glbCss(T.ink2,T.light?.05:.06));halo.addColorStop(1,glbCss(T.ink2,0));c.beginPath();c.arc(cx,cy,R*1.18,0,TAU);c.fillStyle=halo;c.fill();
    const grd=c.createRadialGradient(cx-R*.36,cy-R*.42,R*.04,cx,cy,R);grd.addColorStop(0,glbCss(T.paper2));grd.addColorStop(.65,glbCss(T.paper));grd.addColorStop(1,glbCss(glbMix(T.paper,T.ground,T.light?.25:.55)));c.beginPath();c.arc(cx,cy,R,0,TAU);c.fillStyle=grd;c.fill();c.lineWidth=1;c.strokeStyle=glbCss(T.ink2,T.light?.35:.28);c.stroke();
    /* a faint graticule */
    c.beginPath();for(let lat=-60;lat<=60;lat+=30){const pts=[];for(let lon=-180;lon<=180;lon+=3)pts.push(glbVec(lon,lat));polyline(c,pts,onSphere);}for(let lon=-180;lon<180;lon+=30){const pts=[];for(let lat=-90;lat<=90;lat+=3)pts.push(glbVec(lon,lat));polyline(c,pts,onSphere);}c.strokeStyle=glbCss(T.ink,T.light?.06:.05);c.stroke();
    /* the land: dots bucketed by tier (Shifts) and depth, each bucket one fill */
    const tint=G.mode==='shifts';const base=Math.max(1.1,R*.0062);const B=[];for(let i=0;i<24;i++)B.push([]);
    for(let i=0;i<N;i++){const x1=DX[i]*cl+DY[i]*sl,y1=-DX[i]*sl+DY[i]*cl,d=x1*cp+DZ[i]*sp;if(d<=0)continue;const up=-x1*sp+DZ[i]*cp;const band=d>.78?3:d>.52?2:d>.26?1:0;B[(tint?DT[i]:0)*4+band].push(cx+R*y1,cy-R*up,base*(.55+.45*d));}
    const bandA=[.38,.62,.82,1],tierA=[.55,.6,.68,.78,.9,1];
    for(let t=0;t<6;t++)for(let b=0;b<4;b++){const arr=B[t*4+b];if(!arr.length)continue;c.fillStyle=glbCss(tint?T.tier[t]:T.land,(tint?tierA[t]:(T.light?.75:.62))*bandA[b]);c.beginPath();for(let i=0;i<arr.length;i+=3){c.moveTo(arr[i]+arr[i+2],arr[i+1]);c.arc(arr[i],arr[i+1],arr[i+2],0,TAU);}c.fill();}
    c.textBaseline='middle';c.textAlign='left';c.lineJoin='round';
    if(G.mode==='now')drawNow(c,T,now);else if(G.mode==='then')drawThen(c,T,now);else if(G.mode==='shifts')drawShifts(c,T,now);else drawNotes(c,T,now);
    if(G.placing&&G.mode==='notes'){c.font=`500 ${Math.max(12,13*k)}px ${T.ui}`;text(c,'Click where the note belongs',cx-c.measureText('Click where the note belongs').width/2,cy+R+18*k,T.live,1);}}
  function drawNow(c,T,now){const P=G.pins;P.forEach(p=>{const q=proj(p.v);p.sx=q[0];p.sy=q[1];p.d=q[2];p.r=pinR(p)*(.75+.25*Math.max(0,q[2]));});
    const vis=P.filter(p=>p.d>0).sort((a,b)=>a.d-b.d);
    for(const p of vis){const hot=G.hover===p.c||G.sel===p.c;const col=p.kind==='sold'?(p.fresh?T.live:T.gilt):p.kind==='coming'?T.ink:p.kind==='fair'?T.gilt:T.ink2;   /* v24: gold for a city that sold this season, red only for one that sold this week */const a=.55+.45*p.d;
      const born=G.born.get(p.c)||0;const age=now-born;if(!G.reduced&&age>=0&&age<1100){const u=age/1100,e=1-Math.pow(1-u,3);c.beginPath();c.arc(p.sx,p.sy,p.r+e*18*G.k,0,TAU);c.lineWidth=1.2;c.strokeStyle=glbCss(col,(1-u)*.8*a);c.stroke();}
      if(p.kind==='coming'&&!G.reduced){const ph=.5+.5*Math.sin(G.phase*TAU/2.4+p.sx*.03);c.beginPath();c.arc(p.sx,p.sy,p.r+(2+4*ph)*G.k,0,TAU);c.lineWidth=1;c.strokeStyle=glbCss(col,(1-ph)*.5*a);c.stroke();}
      if(p.fresh&&!G.reduced){const ph=(G.phase/2.2+p.sx*.01)%1;c.beginPath();c.arc(p.sx,p.sy,p.r+(3+16*ph)*G.k,0,TAU);c.lineWidth=1.2;c.strokeStyle=glbCss(T.live,(1-ph)*.7*a);c.stroke();}   /* a sale in the last week keeps ringing */
      if(p.kind==='sold'){const hotCol=p.fresh?T.live:T.gilt;c.shadowColor=glbCss(hotCol,.75*a);c.shadowBlur=(hot?22:12)*G.k*G.dpr;c.beginPath();c.arc(p.sx,p.sy,p.r,0,TAU);c.fillStyle=glbCss(hotCol,a);c.fill();c.shadowBlur=0;c.lineWidth=1;c.strokeStyle=glbCss(p.fresh?T.live2:T.paper,.9*a);c.stroke();}
      else if(p.kind==='coming'){c.beginPath();c.arc(p.sx,p.sy,p.r,0,TAU);c.fillStyle=glbCss(T.ground,.9);c.fill();c.lineWidth=1.4;c.strokeStyle=glbCss(T.ink,a);c.stroke();}
      else if(p.kind==='fair'){c.beginPath();c.moveTo(p.sx,p.sy-p.r*1.3);c.lineTo(p.sx+p.r*1.3,p.sy);c.lineTo(p.sx,p.sy+p.r*1.3);c.lineTo(p.sx-p.r*1.3,p.sy);c.closePath();c.fillStyle=glbCss(T.ground,.9);c.fill();c.lineWidth=1.4;c.strokeStyle=glbCss(T.gilt,a);c.stroke();}   /* a hollow gold diamond: a fair, a biennale, a show to come */
      else{c.beginPath();c.arc(p.sx,p.sy,p.r,0,TAU);c.fillStyle=glbCss(T.ink2,.85*a);c.fill();}
      if(hot){c.beginPath();c.arc(p.sx,p.sy,p.r+6*G.k,0,TAU);c.lineWidth=1;c.strokeStyle=glbCss(col,.7);c.stroke();}}
    /* labels: the hovered city, then cities with sales, then the rest while there is room */
    const want=vis.filter(p=>p.d>.22).sort((a,b)=>((G.hover===b.c||G.sel===b.c)?1:0)-((G.hover===a.c||G.sel===a.c)?1:0)||b.sold-a.sold||b.coming-a.coming||b.n-a.n);
    for(const p of want){const hot=G.hover===p.c||G.sel===p.c;const big=p.kind==='sold'&&p.sold>=20;const fs=big?Math.max(12.5,14*G.k):Math.max(11,12*G.k);c.font=`${big?'':'500 '}${fs}px ${big?T.display:T.ui}`;const txt=big?`${p.c} ${mm(p.sold)}`:p.c;const put=placeLabel(c,txt,p.sx,p.sy,p.r+5*G.k,fs+4);if(!put)continue;text(c,txt,put[0],put[1],hot?T.gilt:p.kind==='sold'?T.ink:T.ink2,hot?1:big?1:.9);}}
  function drawThen(c,T,now){const y=G.year,am=activeMv(y),al=alive(y);
    al.forEach(x=>{const q=proj(x.v);x.sx=q[0];x.sy=q[1];x.d=q[2];});
    const av=al.filter(x=>x.d>0);c.fillStyle=glbCss(T.ink,T.light?.8:.85);for(const x of av){c.beginPath();c.arc(x.sx,x.sy,(x.lot?2.3:1.7)*G.k*(.6+.4*x.d),0,TAU);c.fillStyle=glbCss(x.lot?T.ink:T.ink2,(.45+.55*x.d)*(x.lot?1:.8));c.fill();}
    am.forEach(x=>x.centres.forEach(cc=>{const q=proj(cc.v);cc.sx=q[0];cc.sy=q[1];cc.d=q[2];}));
    const em=new Set(emerging(y));
    am.forEach(x=>{const isNew=em.has(x);x.centres.forEach((cc,i)=>{if(cc.d<=0)return;const a=.5+.5*cc.d;const rr=(isNew?9:6.5)*G.k*(i?.75:1);const ph=G.reduced?.5:.5+.5*Math.sin(G.phase*TAU/3+cc.sx*.02);
      const grd=c.createRadialGradient(cc.sx,cc.sy,0,cc.sx,cc.sy,rr*3);grd.addColorStop(0,glbCss(T.live,.55*a));grd.addColorStop(1,glbCss(T.live,0));c.beginPath();c.arc(cc.sx,cc.sy,rr*3,0,TAU);c.fillStyle=grd;c.fill();
      c.beginPath();c.arc(cc.sx,cc.sy,rr*(.9+.1*ph),0,TAU);c.fillStyle=glbCss(T.live,a);c.fill();c.lineWidth=1;c.strokeStyle=glbCss(T.live2,.9*a);c.stroke();});});
    const want=am.map(x=>({x,cc:x.centres.find(cc=>cc.d>.15)})).filter(o=>o.cc).sort((a,b)=>(em.has(b.x)?1:0)-(em.has(a.x)?1:0)||b.x.from-a.x.from);
    for(const o of want){const isNew=em.has(o.x);const fs=isNew?Math.max(13,14.5*G.k):Math.max(11.5,12.5*G.k);c.font=`${isNew?'':'500 '}${fs}px ${isNew?T.display:T.ui}`;const txt=o.x.m.n.replace(/ \(.*\)$/,'').replace(/:.*$/,'');const put=placeLabel(c,txt,o.cc.sx,o.cc.sy,10*G.k,fs+4,'above');if(!put)continue;text(c,txt,put[0],put[1],isNew?T.live2:T.ink,1);}
    const named=av.filter(x=>x.lot||x.pics.length).sort((a,b)=>(b.pics.length?1:0)-(a.pics.length?1:0)||b.d-a.d).slice(0,14);c.font=`${Math.max(10.5,11.5*G.k)}px ${T.ui}`;
    for(const x of named){const put=placeLabel(c,x.a,x.sx,x.sy,5*G.k,15);if(!put)continue;text(c,x.a,put[0],put[1],T.ink2,.95);}
  }
  function drawShifts(c,T,now){CE.forEach(e=>{const q=proj(e.v);e.sx=q[0];e.sy=q[1];e.d=q[2];});
    c.lineCap='round';CEARCS.forEach(a=>{const lit=G.era==null||G.era===a.i||G.era===a.i-1;c.beginPath();polyline(c,a.pts,lifted);c.setLineDash([]);c.lineWidth=(lit?1.8:1.1)*G.k;c.strokeStyle=glbCss(T.live,lit?.55:.18);c.stroke();if(lit&&!G.reduced){c.setLineDash([5*G.k,11*G.k]);c.lineDashOffset=-G.phase*24*G.k;c.strokeStyle=glbCss(T.live2,.9);c.stroke();c.setLineDash([]);}});c.lineCap='butt';
    HB.forEach(b=>{const q=proj(b.v);b.sx=q[0];b.sy=q[1];b.d=q[2];if(q[2]<=0||!(b.h.momentum>0))return;const ph=G.reduced?.5:.5+.5*Math.sin(G.phase*TAU/2+b.sx*.04);c.beginPath();c.arc(b.sx,b.sy,(3+6*ph)*G.k,0,TAU);c.lineWidth=1;c.strokeStyle=glbCss(T.gilt,(1-ph)*.8*(.5+.5*q[2]));c.stroke();c.beginPath();c.arc(b.sx,b.sy,2.2*G.k,0,TAU);c.fillStyle=glbCss(T.gilt,.5+.5*q[2]);c.fill();});
    const seen={};CE.forEach(e=>{if(e.d<=0||seen[e.c])return;seen[e.c]=e;const es=CE.filter(x=>x.c===e.c);const hot=es.some(x=>G.era===x.i||G.hover==='era:'+x.i);const rr=(hot?8.5:6.5)*G.k;c.shadowColor=glbCss(T.live,.7);c.shadowBlur=(hot?18:10)*G.k*G.dpr;c.beginPath();c.arc(e.sx,e.sy,rr,0,TAU);c.fillStyle=glbCss(T.live,.5+.5*e.d);c.fill();c.shadowBlur=0;c.lineWidth=1;c.strokeStyle=glbCss(T.live2,.9);c.stroke();
      c.font=`600 ${Math.max(9,9.5*G.k)}px ${T.ui}`;const n=String(es[0].i+1);const w=c.measureText(n).width;c.fillStyle=glbCss(T.ground,1);c.fillText(n,e.sx-w/2,e.sy+.5);});
    const cities=[...new Set(CE.filter(e=>e.d>.15).map(e=>e.c))];for(const city of cities){const es=CE.filter(e=>e.c===city);const e=es[0];const hot=es.some(x=>G.era===x.i);const fs=Math.max(12,13*G.k);c.font=`${fs}px ${T.display}`;const txt=`${city} · ${es.map(x=>x.from>=1400?x.from:wdYear(x.from)).join(', ')}`;const put=placeLabel(c,txt,e.sx,e.sy,11*G.k,fs+4);if(!put)continue;text(c,txt,put[0],put[1],hot?T.live2:T.ink,1);}}
  function drawNotes(c,T,now){G.notes.forEach(p=>{const q=proj(p.v);p.sx=q[0];p.sy=q[1];p.d=q[2];});const vis=G.notes.filter(p=>p.d>0);
    for(const p of vis){const hot=G.hover===p.id;const a=.5+.5*p.d;c.beginPath();c.moveTo(p.sx,p.sy);c.lineTo(p.sx,p.sy-12*G.k);c.lineWidth=1.2;c.strokeStyle=glbCss(T.ink,a);c.stroke();c.beginPath();c.arc(p.sx,p.sy-14*G.k,(hot?5:3.8)*G.k,0,TAU);c.fillStyle=glbCss(T.live,a);c.fill();c.lineWidth=1;c.strokeStyle=glbCss(T.live2,.9*a);c.stroke();}
    c.font=`500 ${Math.max(11,12*G.k)}px ${T.ui}`;for(const p of vis.filter(p=>p.d>.2).slice(0,30)){const put=placeLabel(c,p.t,p.sx,p.sy-14*G.k,7*G.k,16);if(!put)continue;text(c,p.t,put[0],put[1],G.hover===p.id?T.live2:T.ink2,.95);}
    if(G.place){const q=proj(glbVec(G.place[0],G.place[1]));if(q[2]>0){c.beginPath();c.arc(q[0],q[1],7*G.k,0,TAU);c.lineWidth=1.5;c.strokeStyle=glbCss(T.live,1);c.stroke();}}}
  /* ---- the frame loop: runs only while something moves ---- */
  let drag=null;
  const motion=()=>!G.hidden&&G.visible&&!G.reduced;
  const spinning=()=>motion()&&G.auto&&!G.hovering&&!G.focused&&!drag&&!G.fly&&!G.vel&&performance.now()>G.idleAt;
  const young=()=>{const t=performance.now();for(const b of G.born.values())if(t-b<1200&&t>=b)return true;return false;};
  const animating=()=>!!(G.fly||G.vel||spinning()||G.playing||(motion()&&(G.mode==='then'||G.mode==='shifts'||(G.mode==='now'&&(young()||G.pins.some(p=>p.kind==='coming'||p.fresh))))));
  function frame(t){G.raf=0;if(!G.ctx)return;const dt=G.last?Math.min(120,t-G.last):16;if(dt<14&&animating()){G.raf=requestAnimationFrame(frame);return;}G.last=t;
    if(G.fly){const f=G.fly,u=Math.min(1,(t-f.t0)/f.dur),e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;G.lon0=wrapLon(f.lon+f.dlon*e);G.lat0=f.lat+f.dlat*e;if(u>=1){G.fly=null;if(f.resume)G.idleAt=t+4000;}}
    else if(G.vel){G.lon0=wrapLon(G.lon0+G.vel*dt/1000);G.vel*=Math.pow(.08,dt/1000);if(Math.abs(G.vel)<1)G.vel=0;}
    else if(spinning())G.lon0=wrapLon(G.lon0-360/WD_TURN*dt/1000);
    if(G.playing){G.playT=Math.min(1,G.playT+dt/60000);const y=wdT2Y(G.playT);if(y!==G.year)setYear(y,true);if(G.playT>=1)play(false);}
    if(motion())G.phase+=dt/1000;
    draw();if(animating())G.raf=requestAnimationFrame(frame);else G.last=0;}
  function kick(){if(!G.raf&&G.ctx&&G.w)G.raf=requestAnimationFrame(frame);}
  function redraw(){if(!G.ctx)return;if(!G.w&&!fit())return;if(animating())kick();else draw();}
  function flyTo(lon,lat,dur,resume){lat=clampLat(lat==null?G.lat0:lat);G.vel=0;if(!resume){G.auto=false;}if(G.reduced||!G.ctx){G.lon0=wrapLon(lon);G.lat0=lat;redraw();return;}const dlon=wrapLon(lon-G.lon0);G.fly={lon:G.lon0,lat:G.lat0,dlon,dlat:lat-G.lat0,t0:performance.now(),dur:dur||Math.min(1500,500+Math.abs(dlon)*4),resume:!!resume};kick();}
  /* ---- pointer, keyboard, observers ---- */
  function hitAt(x,y){let best=null,bd=1e9;const test=(sx,sy,d,reach,ref)=>{if(d<=0)return;const dd=Math.hypot(sx-x,sy-y);if(dd<reach&&dd<bd){bd=dd;best=ref;}};
    if(G.mode==='now')G.pins.forEach(p=>test(p.sx,p.sy,p.d,Math.max(12,p.r+6),{t:'pin',p}));
    else if(G.mode==='then')activeMv(G.year).forEach(x=>x.centres.forEach(cc=>test(cc.sx,cc.sy,cc.d,12*G.k,{t:'mv',x,cc})));
    else if(G.mode==='shifts')CE.forEach(e=>test(e.sx,e.sy,e.d,14*G.k,{t:'era',e}));
    else G.notes.forEach(p=>test(p.sx,p.sy-14*G.k,p.d,12*G.k,{t:'note',p}));
    return best;}
  function localXY(e){const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
  function lonlatAt(x,y){const X=(x-G.cx)/G.R,Y=-(y-G.cy)/G.R;const r2=X*X+Y*Y;if(r2>1)return null;const Z=Math.sqrt(1-r2);const lam=G.lon0*Math.PI/180,phi=G.lat0*Math.PI/180;const cp2=Math.cos(phi),sp2=Math.sin(phi);const x1=Z*cp2-Y*sp2,up=Z*sp2+Y*cp2,y1=X;const vx=x1*Math.cos(lam)-y1*Math.sin(lam),vy=x1*Math.sin(lam)+y1*Math.cos(lam),vz=up;return [Math.atan2(vy,vx)*180/Math.PI,Math.atan2(vz,Math.hypot(vx,vy))*180/Math.PI];}
  const hitKey=h=>h?(h.t==='pin'?h.p.c:h.t==='mv'?'mv:'+h.x.m.id:h.t==='era'?'era:'+h.e.i:h.p.id):null;
  function tipFor(h){if(h.t==='pin'){const p=h.p;const top=p.E.filter(e=>e.k==='lot'||e.k==='sale').sort((a,b)=>b.v-a.v)[0]||p.E[0];return `<div class=k>${esc(p.c)}</div><div class=v>${p.n} ${p.n===1?'event':'events'}${p.sold?` · ${esc(mm(p.sold))} sold`:''}${p.coming?` · ${esc(mm(p.coming))} to come`:''}</div><div class="gl-tipw">${esc(top.t)}${top.v?` · ${esc(mm(top.v))}`:''}</div>`;}
    if(h.t==='mv')return `<div class=k>${esc(h.x.m.n)}</div><div class=v>${esc(h.cc.c)} · ${esc(wdYear(h.x.from))}–${h.x.m.to==null?'now':esc(wdYear(h.x.to))}</div>`;
    if(h.t==='era')return `<div class=k>${esc(h.e.t)}</div><div class=v>${esc(wdYear(h.e.from))}–${h.e.to>=2027?'now':esc(wdYear(h.e.to))}</div><div class="gl-tipw">${esc(h.e.why)}</div>`;
    return `<div class=k>${esc(h.p.t)}</div><div class=v>${esc(WD_KINDS[h.p.k]||'')}${h.p.city?` · ${esc(h.p.city)}`:''}</div>${h.p.n?`<div class="gl-tipw">${esc(h.p.n)}</div>`:''}`;}
  function clickHit(h){if(!h)return;hideTip();if(h.t==='pin'){openPin(h.p);}else if(h.t==='mv'){trailAdd({k:'movement',id:h.x.m.id,t:h.x.m.n,sub:wdYear(h.x.from)});openMovement(h.x.m.id);}else if(h.t==='era'){selectEra(h.e.i);}else{openNotes(true,[h.p]);}}
  if(cv&&canCanvas){G.ctx=cv.getContext('2d');tokens();
    on(cv,'pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;try{cv.setPointerCapture(e.pointerId);}catch(x){}const [x,y]=localXY(e);drag={x,y,lon:G.lon0,lat:G.lat0,moved:false,touch:e.pointerType==='touch',vx:0,lx:x,lt:performance.now()};G.vel=0;G.fly=null;hideTip();kick();});
    on(cv,'pointermove',e=>{const [x,y]=localXY(e);if(drag){const dx=x-drag.x,dy=y-drag.y;if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;if(!drag.moved)return;const deg=(180/Math.PI)/G.R;G.lon0=wrapLon(drag.lon-dx*deg);G.lat0=clampLat(drag.lat+dy*deg);const nowT=performance.now(),dt=nowT-drag.lt;if(dt>0){drag.vx=.6*drag.vx+.4*(-(x-drag.lx)*deg*1000/dt);drag.lx=x;drag.lt=nowT;}G.idleAt=nowT+6000;cv.style.cursor='grabbing';draw();return;}
      if(e.pointerType==='touch')return;const h=hitAt(x,y);const key=hitKey(h);if(key!==G.hover){G.hover=key;cv.style.cursor=key?'pointer':(G.placing?'crosshair':'grab');if(h)showTip(e,tipFor(h));else hideTip();redraw();}else if(h)moveTip(e);});
    const endDrag=e=>{if(!drag)return;const d=drag;drag=null;cv.style.cursor=G.placing?'crosshair':'grab';if(d.moved){G.suppressClick=true;setTimeout(()=>{G.suppressClick=false;},0);if(!G.reduced&&Math.abs(d.vx)>20&&performance.now()-d.lt<80)G.vel=Math.max(-240,Math.min(240,d.vx));}G.idleAt=performance.now()+6000;kick();};
    on(cv,'pointerup',endDrag);on(cv,'pointercancel',endDrag);
    on(cv,'pointerenter',e=>{if(e.pointerType!=='touch'){G.hovering=true;kick();}});
    on(cv,'pointerleave',()=>{G.hovering=false;if(G.hover){G.hover=null;hideTip();}cv.style.cursor='grab';if(!drag)redraw();G.idleAt=performance.now()+2500;kick();});
    on(cv,'click',e=>{if(G.suppressClick){G.suppressClick=false;return;}const [x,y]=localXY(e);if(G.placing&&G.mode==='notes'){const ll=lonlatAt(x,y);if(!ll)return;G.placing=false;G.place=ll;noteForm(ll[0],ll[1]);redraw();return;}const h=hitAt(x,y);if(h)clickHit(h);});
    on(cv,'focus',()=>{let kb=true;try{kb=cv.matches(':focus-visible');}catch(e){}G.focused=kb;kick();});on(cv,'blur',()=>{G.focused=false;kick();});
    on(cv,'keydown',e=>{let used=true;if(e.key==='ArrowLeft')G.lon0=wrapLon(G.lon0-12);else if(e.key==='ArrowRight')G.lon0=wrapLon(G.lon0+12);else if(e.key==='ArrowUp')G.lat0=clampLat(G.lat0+8);else if(e.key==='ArrowDown')G.lat0=clampLat(G.lat0-8);else if(e.key==='Enter'||e.key===' '){openAll();}else used=false;if(!used)return;e.preventDefault();G.fly=null;G.vel=0;redraw();});
    on(document,'visibilitychange',()=>{G.hidden=!!document.hidden;kick();});
    if(typeof IntersectionObserver==='function'){const io=new IntersectionObserver(es=>{G.visible=es.some(x=>x.isIntersecting);if(G.visible){if(!G.shown){G.shown=true;const t=performance.now()+200;G.born.clear();G.pins.forEach((p,i)=>G.born.set(p.c,t+i*70));}if(fit())redraw();kick();}});io.observe(cv);listeners.push([io]);}
    if(typeof ResizeObserver==='function'){const ro=new ResizeObserver(()=>{if(fit())redraw();});ro.observe(wrap);listeners.push([ro]);}
    on(window,'resize',()=>{if(fit())redraw();});
    if(typeof MutationObserver==='function'){const mo=new MutationObserver(()=>{tokens();redraw();});mo.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});listeners.push([mo]);}
    if(mqLight&&mqLight.addEventListener)on(mqLight,'change',()=>{tokens();redraw();});
    if(mqReduce&&mqReduce.addEventListener)on(mqReduce,'change',e=>{G.reduced=!!e.matches;G.vel=0;G.fly=null;kick();redraw();});
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>redraw()).catch(()=>{});
    const t0=performance.now();if(fit())draw();if(perf.world==null)perf.world=performance.now()-t0;
    if(!G.w){let tries=0;const poll=()=>{if(G.w||tries++>120)return;if(fit()){redraw();kick();}else setTimeout(poll,100);};setTimeout(poll,100);}}
  rebuild();drawLead();drawLegend();kick();if(wdPending)G.jump();
  wdTeardown=()=>{if(G.raf)cancelAnimationFrame(G.raf);G.ctx=null;if(notesUnsub){try{notesUnsub();}catch(e){}notesUnsub=null;}listeners.forEach(l=>{if(l.length===1){try{l[0].disconnect();}catch(e){}}else{try{l[0].removeEventListener(l[1],l[2],l[3]);}catch(e){}}});if(wdState===G)wdState=null;};
  window.__WORLD={readings:()=>wdReadings(G.events),openReadings,mode:setMode,pinOk:wdPinOk,cityKey:wdCityKey,cityInText:wdCityInText,t2y:wdT2Y,y2t:wdY2T,year:y=>setYear(+y,false),play,era:selectEra,open:openAll,pinAt:(x,y)=>{const h=hitAt(+x,+y);return h?hitKey(h):null;},project:(lon,lat)=>{if(!G.w)return null;setRot();const p=proj(glbVec(+lon,+lat));return {x:p[0],y:p[1],visible:p[2]>0};},events:()=>G.events.slice(),pins:()=>G.pins.map(p=>({c:p.c,n:p.n,sold:p.sold,kind:p.kind})),rebuild,state:()=>({mode:G.mode,year:G.year,lon:G.lon0,lat:G.lat0,auto:G.auto,spinning:spinning(),w:G.w,h:G.h,R:G.R,dots:N,pins:G.pins.length,events:G.events.length,movements:MV.length,artists:AB.length,eras:CE.length,notes:G.notes.length,reduced:G.reduced,playing:G.playing,card:!card.hidden})};}
