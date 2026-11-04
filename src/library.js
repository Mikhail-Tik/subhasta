/* ---------- LIBRARY: every picture the terminal holds, and the viewer that looks closely (v23) ----------
   renderLibrary(el) fills #v-library: the lead, the filters (a search, the eras, a movement, a place, the order), a century
   rail with counts, and the wall (CSS columns of thumbnails, in the order the pictures were painted). Clicking a picture opens
   the viewer, which is the page's lightbox grown up: openLightbox(id, list) now draws the picture in a stage that zooms (wheel,
   pinch, double-click, + and −) and pans (drag, arrow keys while zoomed), with the credit, the painter's dossier, the movement,
   the original file at its source, "the world that year" (the World's Then mode at the year it was painted, flown to the
   collection's city or the painter's birthplace) and prev/next through the list it was opened from.
   libYear(m) reads a year out of the registry's free-text dates; libCity(m) the collection's city; libMoves(m) the movements.
   Test hooks: window.__LIB = {year, city, moves, filter, state, open}. Names here are prefixed lib/LIB_. */
const LIB_ERAS=[['all','Every era',-99999,99999],['early','To 1400',-99999,1399],['ren','1400–1600',1400,1599],['bar','1600–1800',1600,1799],['c19','1800–1900',1800,1899],['mod','1900 on',1900,99999]];
const libIds=()=>Object.keys(IMG);
/* a year out of "c. 1440–45", "1907–08", "5th–8th century", "1308–11", "1520–23": the first year named; a century → its middle */
function libYear(m){const y=String((m&&m.y)||'');const c=y.match(/(\d{1,2})(?:st|nd|rd|th)(?:[–-](\d{1,2})(?:st|nd|rd|th))?\s+century/i);if(c)return (+c[1]-1)*100+(c[2]?50:50);const bc=/\bBC\b/i.test(y);const n=y.match(/\d{3,4}/);if(!n)return null;return bc?-+n[0]:+n[0];}
/* the city a collection string names: the last part after a comma that is a known place, else a known place anywhere in it */
const LIB_PLACE_ALIAS={'Vatican':'Rome','Vatican City':'Rome','Washington, D.C.':'Washington','New Haven':'New Haven','Edo':'Tokyo','Petersburg':'St Petersburg'};
function libCity(m){const c=String((m&&m.c)||'').replace(/\(.*?\)/g,'');if(!c||/^private/i.test(c))return null;const parts=c.split(/[,;]/).map(s=>s.trim()).filter(Boolean).reverse();
  for(const p of parts){const k=LIB_PLACE_ALIAS[p]||p;if(typeof CITY_LL==='object'&&CITY_LL[k])return k;}
  for(const k of Object.keys(typeof CITY_LL==='object'?CITY_LL:{}))if(k.length>3&&new RegExp('(^|[^A-Za-zÀ-ÿ])'+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=$|[^A-Za-zÀ-ÿ])').test(c))return k;return null;}
const libMoves=m=>m&&m.a?movesOf(m.a):[];
/* one record per picture, built once */
let LIB=null;
function libAll(){if(LIB)return LIB;LIB=libIds().map(id=>{const m=IMG[id];const y=libYear(m);return {id,m,y:y==null?99999:y,city:libCity(m),mv:libMoves(m).map(x=>x.id),s:norm(`${m.a} ${m.t} ${m.y} ${m.c} ${libMoves(m).map(x=>x.n).join(' ')}`)};}).sort((a,b)=>a.y-b.y||a.m.a.localeCompare(b.m.a));return LIB;}
const libs={q:'',era:'all',mv:'all',city:'all',sort:'year'};
function libFilter(){const all=libAll();const era=LIB_ERAS.find(e=>e[0]===libs.era)||LIB_ERAS[0];const ql=norm(libs.q);
  let L=all.filter(r=>(r.y>=era[2]&&r.y<=era[3]||(libs.era==='all'))&&(libs.mv==='all'||r.mv.includes(libs.mv))&&(libs.city==='all'||r.city===libs.city)&&(!ql||r.s.includes(ql)));
  if(libs.sort==='artist')L=L.slice().sort((a,b)=>surname(a.m.a).localeCompare(surname(b.m.a))||a.y-b.y);else if(libs.sort==='place')L=L.slice().sort((a,b)=>String(a.city||'~').localeCompare(String(b.city||'~'))||a.y-b.y);
  return L;}
function renderLibrary(){const el=$('#v-library');if(!el)return;const all=libAll();const n=all.length;const ys=all.filter(r=>r.y<99999).map(r=>r.y);const first=Math.min(...ys),last=Math.max(...ys);const artists=new Set(all.map(r=>r.m.a)).size;
  const mvOpts=MOVEMENTS.filter(m=>all.some(r=>r.mv.includes(m.id))).map(m=>({id:m.id,n:m.n,c:all.filter(r=>r.mv.includes(m.id)).length}));
  const cities=[...new Set(all.map(r=>r.city).filter(Boolean))].sort().map(c=>({c,n:all.filter(r=>r.city===c).length})).filter(x=>x.n>=2);
  el.innerHTML=`<div class="head"><div><span class="eyebrow">The Library</span><h1>${n} paintings, ${esc(wdYear(first))} to ${esc(wdYear(last))}.</h1><p class="dek">Every picture the terminal holds in the public domain, in the order they were painted: ${artists} painters, from the Gothic altarpiece to the avant-garde. Click any to look closely; from the picture, step into the world of its year.</p></div><div class="status"><span class="chip">${n} pictures</span><span class="chip">${mvOpts.length} movements</span></div></div>
  <div class="libctl" role="group" aria-label="Filter the library"><label class="sr" for="libq">Search the pictures</label><input id="libq" type="search" placeholder="Search: Vermeer, Venus, Tretyakov…" value="${esc(libs.q)}">
    <div class="seg" role="group" aria-label="Era">${LIB_ERAS.map(e=>`<button class="tag${libs.era===e[0]?' on':''}" data-era="${e[0]}" aria-pressed="${libs.era===e[0]}">${esc(e[1])}</button>`).join('')}</div>
    <label class="libsel"><span class="sr">Movement</span><select id="libmv"><option value="all">Any movement</option>${mvOpts.map(o=>`<option value="${esc(o.id)}"${libs.mv===o.id?' selected':''}>${esc(o.n)} (${o.c})</option>`).join('')}</select></label>
    <label class="libsel"><span class="sr">Where it hangs</span><select id="libcity"><option value="all">Anywhere</option>${cities.map(o=>`<option value="${esc(o.c)}"${libs.city===o.c?' selected':''}>${esc(o.c)} (${o.n})</option>`).join('')}</select></label>
    <label class="libsel"><span class="sr">Order</span><select id="libsort"><option value="year"${libs.sort==='year'?' selected':''}>By year</option><option value="artist"${libs.sort==='artist'?' selected':''}>By painter</option><option value="place"${libs.sort==='place'?' selected':''}>By place</option></select></label></div>
  <div class="librail" id="librail" aria-label="Centuries"></div>
  <div class="libwall" id="libwall"></div>
  <p class="libfoot faint">Each picture is a photograph of a two-dimensional work in the public domain: the painter died more than seventy years ago, or the work was published before 1930. The credit under each names the collection and the file’s source. The library grows with the terminal; a movement whose painters are still in copyright has none here.</p>`;
  $('#libq',el).addEventListener('input',e=>{libs.q=e.target.value;libDraw();});
  $$('[data-era]',el).forEach(b=>b.addEventListener('click',()=>{libs.era=b.dataset.era;$$('[data-era]',el).forEach(x=>{const on=x.dataset.era===libs.era;x.classList.toggle('on',on);x.setAttribute('aria-pressed',String(on));});libDraw();}));
  $('#libmv',el).addEventListener('change',e=>{libs.mv=e.target.value;libDraw();});$('#libcity',el).addEventListener('change',e=>{libs.city=e.target.value;libDraw();});$('#libsort',el).addEventListener('change',e=>{libs.sort=e.target.value;libDraw();});
  libDraw();}
function libDraw(){const el=$('#v-library');if(!el)return;const L=libFilter();const all=libAll();
  /* the rail: one bar per century over the whole library, the filtered share lit */
  const cents=new Map();all.forEach(r=>{if(r.y>=99999)return;const c=Math.floor(r.y/100)*100;cents.set(c,(cents.get(c)||0)+1);});const lit=new Map();L.forEach(r=>{if(r.y>=99999)return;const c=Math.floor(r.y/100)*100;lit.set(c,(lit.get(c)||0)+1);});
  const cs=[...cents.keys()].sort((a,b)=>a-b);const max=Math.max(1,...cents.values());
  $('#librail',el).innerHTML=cs.map(c=>`<button class="lc${lit.get(c)?' on':''}" data-cent="${c}" title="${lit.get(c)||0} of ${cents.get(c)} pictures from the ${esc(wdYear(c))}s" aria-label="${c<1000?esc(wdYear(c)):String(c)}: ${lit.get(c)||0} shown of ${cents.get(c)}" aria-pressed="${libCent===c}"><i style="height:${Math.round(100*(cents.get(c)/max))}%"><b style="height:${Math.round(100*((lit.get(c)||0)/cents.get(c)))}%"></b></i><span>${c<1000?esc(wdYear(c)):String(c)}</span></button>`).join('');
  $$('#librail .lc',el).forEach(b=>b.addEventListener('click',()=>{const c=+b.dataset.cent;libs.q=`${c}`;const q=$('#libq',el);if(q)q.value='';libs.q='';libs.era='all';$$('[data-era]',el).forEach(x=>{const on=x.dataset.era==='all';x.classList.toggle('on',on);x.setAttribute('aria-pressed',String(on));});libCent=libCent===c?null:c;libDraw();}));
  const show=libCent==null?L:L.filter(r=>Math.floor(r.y/100)*100===libCent);
  $('#libwall',el).innerHTML=show.length?show.map(r=>`<a href="#" class="lw" data-lb="${esc(r.id)}" data-list="wall" style="--avg:${esc(r.m.avg||'#222')}"><img src="img/t/${esc(r.id)}.jpg" alt="${esc(r.m.a+', '+r.m.t)}" loading="lazy" decoding="async" width="${r.m.w}" height="${r.m.h}"><span class="lw-cap"><b>${esc(r.m.a)}</b><em>${esc(r.m.t)}</em><small>${esc(r.m.y)}${r.city?` · ${esc(r.city)}`:''}</small></span></a>`).join(''):'<div class="libempty">Nothing matches. Widen the era, or clear the search.</div>';
  const st=$('#v-library .status');if(st)st.innerHTML=`<span class="chip">${show.length} of ${all.length}</span>${libCent!=null?`<button class="chip" id="libclear">${esc(wdYear(libCent))}s × </button>`:''}`;const cl=$('#libclear',el);if(cl)cl.addEventListener('click',()=>{libCent=null;libDraw();});
  LIB_LIST=show.map(r=>r.id);bindLightbox($('#libwall',el));libLayout();}
let libCent=null,LIB_LIST=[],libRO=null;
/* justified rows: each row of pictures is scaled to one height so the row fills the wall; the last row keeps the target height */
function libLayout(){const wall=$('#libwall');if(!wall)return;if(libRO!==wall.__ro){if(libRO){try{libRO.disconnect();}catch(e){}}libRO=null;}
  if(!libRO&&typeof ResizeObserver==='function'){let t=0;libRO=new ResizeObserver(()=>{clearTimeout(t);t=setTimeout(libLayout,60);});libRO.observe(wall);wall.__ro=libRO;}   /* the wall is laid out when it gets a width (the view may render hidden) and again when it changes */
  const W=wall.clientWidth;if(!W)return;const gap=W<640?8:12;const target=W<640?150:W<1100?200:240;const items=$$('.lw',wall);let row=[],sum=0;
  const flush=(last)=>{if(!row.length)return;const n=row.length;const avail=W-gap*(n-1);let h=avail/sum;if(last&&h>target*1.15)h=target*1.15;if(h>target*1.6)h=target*1.6;row.forEach(([el,r])=>{const w=Math.floor(r*h);el.style.width=w+'px';el.style.height=Math.round(h)+'px';});row=[];sum=0;};
  for(const el of items){const m=IMG[el.dataset.lb];const r=m&&m.w&&m.h?m.w/m.h:1;row.push([el,r]);sum+=r;if(sum*target+gap*(row.length-1)>=W)flush(false);}
  flush(true);wall.classList.add('laid');}
/* ---- the viewer: the lightbox, grown up ---- */
let lvList=null,lvId=null,lvZ=1,lvX=0,lvY=0,lvDrag=null,lvPinch=null;
function libCredit(m){return `${m.a}, ${m.t}, ${m.y}. ${m.c}. Public domain.`;}
function openLightbox(id,list){const m=IMG[id];if(!m)return;const lb=$('#lightbox');const was=lb.classList.contains('on');if(!was)lbOpener=rememberOpener(lb);
  lvList=Array.isArray(list)&&list.length>1&&list.includes(id)?list:null;lvId=id;lvZ=1;lvX=0;lvY=0;
  const i=lvList?lvList.indexOf(id):-1;const y=libYear(m);const city=libCity(m);const born=typeof ARTIST_BORN==='object'&&ARTIST_BORN[m.a];const mv=libMoves(m);const artist=ARTISTS.includes(m.a)?m.a:null;const lots=RESULTS.filter(r=>r.artist===m.a).sort((a,b)=>b.price-a.price);
  const place=(born&&y!=null&&y>=born[1]&&(born[2]==null||y<=born[2]))?born[0]:(city||(born&&born[0])||null);const worldBtn=y!=null&&y>-43000?`<button class="lv-b" data-world="${y}" data-city="${esc(place||'')}">The world in ${esc(wdYear(y))}</button>`:'';
  lb.innerHTML=`<div class="lv" role="document"><div class="lv-stage" id="lvStage"><img class="lv-img" id="lvImg" src="img/${esc(id)}.jpg" alt="${esc(m.a+', '+m.t)}" draggable="false" style="background:${esc(m.avg||'#111')}"></div>
    <div class="lv-bar"><div class="lv-cap"><b>${esc(m.a)}</b>, <i>${esc(m.t)}</i>, ${esc(m.y)}. <span class="lv-c">${esc(m.c)}.</span> <span class="lv-pd">Public domain${m.ow?` · original ${m.ow}×${m.oh}`:''}${m.u&&/^https:\/\/raw\.githubusercontent\.com\//.test(m.u)?` · <a href="${esc(m.u)}" target="_blank" rel="noopener" title="The source file, at full resolution">source file ↗</a>`:''}</span></div>
      <div class="lv-tools">${lvList?`<button class="lv-b lv-prev" aria-label="Previous picture">‹</button><span class="lv-n num">${i+1} / ${lvList.length}</span><button class="lv-b lv-next" aria-label="Next picture">›</button>`:''}<button class="lv-b lv-zoom" aria-pressed="false" title="Zoom (or scroll, pinch, double-click)">Look closer</button>${artist?`<button class="lv-b" data-artist="${esc(artist)}">${esc(surname(artist))}’s dossier${lots.length?` · ${lots.length} ${lots.length===1?'lot':'lots'}`:''}</button>`:''}${mv.length?`<button class="lv-b" data-move="${esc(mv[0].id)}">${esc(mv[0].n)}</button>`:''}${worldBtn}<button class="lv-b lv-x" aria-label="Close">×</button></div></div></div>`;
  lb.classList.add('on');lb.tabIndex=-1;lvBind(lb);if(!was)focusEl(lb);
  libLog(id);}
function lvBind(lb){const stage=$('#lvStage',lb),img=$('#lvImg',lb);const stop=e=>e.stopPropagation();
  $('.lv-bar',lb).addEventListener('click',stop);
  const x=$('.lv-x',lb);if(x)x.addEventListener('click',e=>{stop(e);closeLightbox();});
  const prev=$('.lv-prev',lb),next=$('.lv-next',lb);if(prev)prev.addEventListener('click',e=>{stop(e);lvStep(-1);});if(next)next.addEventListener('click',e=>{stop(e);lvStep(1);});
  const z=$('.lv-zoom',lb);if(z)z.addEventListener('click',e=>{stop(e);lvSet(lvZ>1?1:2.5,null,null,true);});
  $$('[data-artist]',lb).forEach(b=>b.addEventListener('click',e=>{stop(e);closeLightbox();openArtist(b.dataset.artist);}));
  $$('[data-move]',lb).forEach(b=>b.addEventListener('click',e=>{stop(e);closeLightbox();openMovement(b.dataset.move);}));
  $$('[data-world]',lb).forEach(b=>b.addEventListener('click',e=>{stop(e);closeLightbox();worldJump({mode:'then',year:+b.dataset.world,city:b.dataset.city||null});}));
  /* the stage: a click on the backdrop closes (the lightbox's own handler), a click on the picture does not; wheel zooms at the pointer; drag pans when zoomed; two pointers pinch */
  img.addEventListener('click',stop);
  stage.addEventListener('wheel',e=>{e.preventDefault();const r=stage.getBoundingClientRect();lvSet(Math.max(1,Math.min(6,lvZ*(e.deltaY<0?1.15:1/1.15))),e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2);},{passive:false});
  img.addEventListener('dblclick',e=>{e.preventDefault();const r=stage.getBoundingClientRect();lvSet(lvZ>1?1:2.5,e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,true);});
  const pts=new Map();
  stage.addEventListener('pointerdown',e=>{if(e.target!==img)return;e.preventDefault();pts.set(e.pointerId,[e.clientX,e.clientY]);try{stage.setPointerCapture(e.pointerId);}catch(x){}
    if(pts.size===2){const [a,b]=[...pts.values()];lvPinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),z:lvZ};lvDrag=null;}else if(lvZ>1)lvDrag={x:e.clientX,y:e.clientY,ox:lvX,oy:lvY,moved:false};});
  stage.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,[e.clientX,e.clientY]);
    if(lvPinch&&pts.size===2){const [a,b]=[...pts.values()];const d=Math.hypot(a[0]-b[0],a[1]-b[1]);const r=stage.getBoundingClientRect();lvSet(Math.max(1,Math.min(6,lvPinch.z*d/lvPinch.d)),(a[0]+b[0])/2-r.left-r.width/2,(a[1]+b[1])/2-r.top-r.height/2);return;}
    if(lvDrag){const dx=e.clientX-lvDrag.x,dy=e.clientY-lvDrag.y;if(Math.abs(dx)+Math.abs(dy)>3)lvDrag.moved=true;lvX=lvDrag.ox+dx;lvY=lvDrag.oy+dy;lvApply();}});
  const up=e=>{pts.delete(e.pointerId);if(pts.size<2)lvPinch=null;if(lvDrag&&lvDrag.moved){lvDrag=null;const swallow=ev=>{ev.stopPropagation();img.removeEventListener('click',swallow,true);};img.addEventListener('click',swallow,true);setTimeout(()=>img.removeEventListener('click',swallow,true),0);}lvDrag=null;};
  stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
  lb.onkeydown=e=>{if(e.key==='ArrowLeft'&&lvZ<=1){e.preventDefault();lvStep(-1);}else if(e.key==='ArrowRight'&&lvZ<=1){e.preventDefault();lvStep(1);}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();const s=40;if(e.key==='ArrowLeft')lvX+=s;if(e.key==='ArrowRight')lvX-=s;if(e.key==='ArrowUp')lvY+=s;if(e.key==='ArrowDown')lvY-=s;lvApply();}
    else if(e.key==='+'||e.key==='='){e.preventDefault();lvSet(Math.min(6,lvZ*1.25),0,0,true);}else if(e.key==='-'){e.preventDefault();lvSet(Math.max(1,lvZ/1.25),0,0,true);}else if(e.key==='0'){e.preventDefault();lvSet(1,0,0,true);}};
  lvApply();}
/* zoom to z, keeping the point (px, py: offset from the stage's centre) under the pointer; the picture never leaves the stage */
function lvSet(z,px,py,smooth){const img=$('#lvImg');if(!img)return;px=px||0;py=py||0;const k=z/lvZ;lvX=px-(px-lvX)*k;lvY=py-(py-lvY)*k;lvZ=z;if(z<=1){lvX=0;lvY=0;}lvApply(smooth);const b=$('.lv-zoom');if(b){b.setAttribute('aria-pressed',String(z>1));b.textContent=z>1?`${z.toFixed(1)}× · reset`:'Look closer';}}
function lvApply(smooth){const img=$('#lvImg'),stage=$('#lvStage');if(!img||!stage)return;const r=stage.getBoundingClientRect(),w=img.clientWidth*lvZ,h=img.clientHeight*lvZ;const mx=Math.max(0,(w-r.width)/2),my=Math.max(0,(h-r.height)/2);lvX=Math.max(-mx,Math.min(mx,lvX));lvY=Math.max(-my,Math.min(my,lvY));
  img.style.transition=smooth?'transform .25s ease':'none';img.style.transform=`translate(${lvX.toFixed(1)}px,${lvY.toFixed(1)}px) scale(${lvZ.toFixed(3)})`;stage.classList.toggle('zoomed',lvZ>1);}
function lvStep(d){if(!lvList)return;const i=lvList.indexOf(lvId);if(i<0)return;const n=lvList[(i+d+lvList.length)%lvList.length];openLightbox(n,lvList);const lb=$('#lightbox');if(lb)focusEl(lb);}
/* the wall's thumbnails open the viewer with the wall as the list; a figure elsewhere opens it alone (bindLightbox in app.js calls openLightbox(id)) */
const libListFor=a=>a&&a.dataset.list==='wall'?LIB_LIST:null;
/* ---- the reader's trail: what this browser opened, for the Notes card on the World ---- */
function libLog(id){const m=IMG[id];if(!m)return;trailAdd({k:'picture',id,t:`${m.a}, ${m.t}`,y:libYear(m)});}
function trailAdd(e){try{const T=(store.get('trail',[])||[]).filter(x=>x&&typeof x==='object'&&typeof x.t==='string'&&!(x.k===e.k&&x.id===e.id));T.unshift(Object.assign({ts:Date.now()},e));store.set('trail',T.slice(0,30));}catch(err){}}
const trailAll=()=>{try{return (store.get('trail',[])||[]).filter(x=>x&&typeof x==='object'&&typeof x.t==='string'&&['picture','city','movement','lot','artist','era'].includes(x.k)).slice(0,30);}catch(e){return [];}};
window.__LIB={year:libYear,city:m=>libCity(m),moves:m=>libMoves(m).map(x=>x.id),filter:()=>libFilter().map(r=>r.id),state:()=>Object.assign({},libs,{cent:libCent,list:LIB_LIST.length}),set:(k,v)=>{libs[k]=v;libDraw();},open:(id,list)=>openLightbox(id,list),zoom:()=>lvZ,trail:trailAll};
