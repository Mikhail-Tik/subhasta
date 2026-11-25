/* SUBHASTA — Movements: art history as the market reads it. build.py pastes this file into app.js at its MOVE placeholder.

   MOVEMENTS (data_movements.js) holds each movement: dates, place, what it was, why it happened, how to look, the artists and
   works, and its market today (state, note, record), with sources and a V/S/U flag. The view draws them on one timeline —
   a piecewise scale, so the five centuries before 1800 and the crowded twentieth century both read — packed into lanes so no
   label overlaps, coloured by the market's state; below it, cards filtered by era, state and words. Each movement opens a
   dossier (#movement-<id>): the account, pictures where the terminal holds a public-domain one, the lots, private sales and
   sales to come by its artists, the movements before and after, and questions for the analyst. */
const mvFrom=m=>+m.from;
const mvTo=m=>(m.to==null||m.to==='now'||m.to==='')?+NOW.slice(0,4):+m.to;
const mvYear=y=>y<0?`${-y} BC`:String(y);
const mvSpan=m=>`${mvYear(mvFrom(m))}–${m.to==null||m.to==='now'||m.to===''?'now':mvYear(mvTo(m))}`;
/* the market's state, from whatever word the dataset uses */
function mvState(m){const s=norm((m.market&&m.market.state)||'');return /heat|hot|ris|strong|up|boom/.test(s)?'heat':/cool|fall|soft|weak|down|declin/.test(s)?'cool':/rare|museum|scarce|thin|illiquid|no market|institution/.test(s)?'rare':'steady';}
const MV_STATES={heat:'heating',steady:'steady',cool:'cooling',rare:'rarely offered'};
const MV_ERAS=[['all','All eras',-1e4,1e4],['old','Before 1800',-1e4,1800],['c19','1800–1900',1800,1900],['modern','1900–1945',1900,1945],['postwar','1945–1980',1945,1980],['now','1980 to now',1980,1e4]];
let mvs={era:'all',state:'all',q:''};
/* the movement's artists, lots and pictures */
const mvNames=m=>new Set(moveArtists(m).flatMap(a=>[norm(a),norm(surname(a))]));
function mvLots(m){const n=mvNames(m);return RESULTS.filter(r=>n.has(norm(r.artist))).sort((a,b)=>b.price-a.price);}
function mvPrivate(m){const n=mvNames(m);return PRIVATE_TREATY.map((p,i)=>({p,i})).filter(x=>n.has(norm(privArtist(x.p))));}
function mvUpcoming(m){const n=mvNames(m);return UPCOMING.map((u,i)=>({u,i})).filter(x=>n.has(norm(x.u.artist)));}
function mvPics(m,k){const n=mvNames(m);const want=new Set((m.img||[]).filter(id=>IMG[id]));const ids=[...want,...Object.keys(IMG).filter(id=>!want.has(id)&&n.has(norm(IMG[id].a.replace(/\s*\((after|attributed)\)\s*$/,''))))];
  /* one picture per artist first, so a dossier shows the movement rather than one painter */
  const seen=new Set(),first=[],rest=[];ids.forEach(id=>{const a=IMG[id].a;(seen.has(a)?rest:first).push(id);seen.add(a);});return [...first,...rest].slice(0,k||4);}
/* v34: every pool a movement page can draw on, so the pictures come first — the v34 pictures chosen for the movement (HIST_PICS: icons,
   altarpieces, cave art, the ancient art), then the Library, then the Eye's open works whose painter belongs to the movement (the Standard
   Ebooks covers on their atlas sheets; the open collections' own pictures only outside the artifact) */
function mvPicsAll(m,k){k=k||4;const out=[];const P=typeof HIST_PICS==='object'&&HIST_PICS?Object.values(HIST_PICS).filter(p=>p.for&&p.for.movement===m.id):[];P.forEach(p=>out.push({kind:'pic',p}));
  mvPics(m,k).forEach(id=>{if(out.length<k+2)out.push({kind:'lib',id});});
  if(out.length<k&&typeof eyeOpen==='function'){const n=mvNames(m);const seen=new Set(out.filter(o=>o.kind==='lib').map(o=>norm(IMG[o.id].a)));const hosted=typeof eyeHosted==='function'&&eyeHosted();
    for(const w of eyeOpen()){if(out.length>=k)break;if(!w.img||(hosted&&typeof eyeExternal==='function'&&eyeExternal(w)))continue;const a=norm(String(w.artist||'').replace(/\s*\((after|attributed|workshop)[^)]*\)\s*$/i,''));if(!a||!(n.has(a)||n.has(norm(surname(w.artist||''))))||seen.has(a))continue;seen.add(a);out.push({kind:'eye',w});}}
  return out.slice(0,k);}
function mvFigure(o){if(o.kind==='lib')return figure(o.id,'');
  if(o.kind==='pic'){const p=o.p;return `<figure class="figure pic" style="margin:0"><a href="${esc(p.evidence||p.u||'#')}" target="_blank" rel="noopener"><img src="${esc(p.src)}" alt="${esc(p.t||'')}" loading="lazy" decoding="async"></a><figcaption class="cap"><b>${esc(p.t||'')}${p.y?`, ${esc(String(p.y))}`:''}.</b>${p.c?` ${esc(p.c)}.`:''} ${esc(p.lic_short||'Public domain')}.</figcaption></figure>`;}
  const w=o.w,alt=`${w.artist||'Unknown maker'}, ${w.title||''}`;return `<figure class="figure eye-pic" style="margin:0"><a href="${esc(w.url||'#')}" target="_blank" rel="noopener">${typeof eyePicHtml==='function'?eyePicHtml(w,alt):''}</a><figcaption class="cap"><b>${esc(w.artist||'Unknown maker')}, ${esc(w.title||'')}, ${typeof eyeYearText==='function'?eyeYearText(w.y0,w.y1):''}.</b> ${esc(w.museum||'')}. Public domain.</figcaption></figure>`;}
/* the timeline's scale: piecewise, with more room where more happened */
function mvScale(){const ys=MOVEMENTS.map(mvFrom);const lo=Math.min(...ys,1300);const end=+NOW.slice(0,4)+1;const stops=lo<0?[[lo,0],[0,.07],[1300,.15],[1800,.33],[1900,.53],[1945,.7],[end,1]]:lo<1300?[[lo,0],[1300,.12],[1800,.31],[1900,.52],[1945,.69],[end,1]]:[[lo,0],[1800,.3],[1900,.52],[1945,.69],[end,1]];
  return y=>{y=Math.max(stops[0][0],Math.min(end,y));for(let i=1;i<stops.length;i++){const [y0,f0]=stops[i-1],[y1,f1]=stops[i];if(y<=y1)return f0+(f1-f0)*(y-y0)/(y1-y0||1);}return 1;};}
function mvTimeline(list){const W=1240,pl=8,pr=8,lh=22,top=26;const x=mvScale();const X=y=>pl+(W-pl-pr)*x(y);const end=+NOW.slice(0,4);
  /* lanes: each item occupies its bar and its label, inside the bar when it fits, after it when there is room, before it near the
     right edge; items are packed by where that extent starts, so no label touches a bar or another label */
  const tw=t=>t.length*6.6+4;
  const items=[...list].map(m=>{const x0=X(mvFrom(m)),x1=Math.max(X(mvTo(m)),x0+6);const w=tw(m.n);let lx,anchor,inside=false,s0,e0;
    if(x1-x0>=w+12){inside=true;lx=x0+6;anchor='start';s0=x0;e0=x1;}
    else if(x1+5+w<=W-pr){lx=x1+5;anchor='start';s0=x0;e0=x1+5+w;}
    else{lx=x0-5;anchor='end';s0=x0-5-w;e0=x1;}
    return {m,x0,x1,lx,anchor,inside,s0,e0};}).sort((a,b)=>a.s0-b.s0||a.x0-b.x0);
  const lanes=[];items.forEach(it=>{let L=lanes.findIndex(e=>e<=it.s0-8);if(L<0){L=lanes.length;lanes.push(0);}lanes[L]=it.e0;it.L=L;});
  const H=top+lanes.length*lh+8;const ticks=[-2000,-1000,0,500,1000,1200,1400,1500,1600,1700,1800,1850,1900,1920,1945,1960,1980,2000,end].filter(t=>t>=Math.min(...list.map(mvFrom),1800)&&t<=end);
  let lastX=-1e9;const shown=ticks.filter(t=>{const p=X(t);if(p-lastX<44)return false;lastX=p;return true;});
  return `<svg class="mvtl" viewBox="0 0 ${W} ${H}" role="group" aria-label="Timeline of ${list.length} movements, ${mvYear(Math.min(...list.map(mvFrom)))} to now"><g class="ax">${shown.map(t=>`<line x1="${X(t).toFixed(1)}" x2="${X(t).toFixed(1)}" y1="${top-8}" y2="${H}"/><text x="${X(t).toFixed(1)}" y="12" text-anchor="${t===end?'end':'middle'}">${t===end?'now':mvYear(t)}</text>`).join('')}</g>${items.map(it=>{const y=top+it.L*lh;const st=mvState(it.m);return `<g class="mv ${st}" data-move="${esc(it.m.id)}" tabindex="0" role="link" aria-label="${esc(it.m.n)}, ${esc(mvSpan(it.m))}, market ${MV_STATES[st]}"><title>${esc(it.m.n)} · ${esc(mvSpan(it.m))} · ${esc(it.m.place||'')}</title><rect x="${it.x0.toFixed(1)}" y="${y}" width="${(it.x1-it.x0).toFixed(1)}" height="${lh-6}" rx="2"/><text x="${it.lx.toFixed(1)}" y="${y+lh-11}" text-anchor="${it.anchor}" class="${it.inside?'in':'out'}">${esc(it.m.n)}</text></g>`;}).join('')}</svg>`;}
function mvList(){const E=MV_ERAS.find(e=>e[0]===mvs.era)||MV_ERAS[0];const q=norm(mvs.q.trim());
  return MOVEMENTS.filter(m=>mvTo(m)>E[2]&&mvFrom(m)<E[3]&&(mvs.state==='all'||mvState(m)===mvs.state)&&(!q||norm(`${m.n} ${(m.aka||[]).join(' ')} ${m.place} ${moveArtists(m).join(' ')} ${m.what}`).includes(q)));}
function renderMovements(){const el=$('#v-movements');const n=MOVEMENTS.length;const lots=new Set(MOVEMENTS.flatMap(m=>mvLots(m).map(r=>r.id))).size;
  el.innerHTML=`<div class="head"><div><h1>Movements</h1><p class="dek">Art history as the market reads it: ${n} movements from ${esc(mvYear(Math.min(...MOVEMENTS.map(mvFrom))))} to now. What each was, why it happened, how to look at it, and what it sells for today, with ${lots} of the terminal’s lots tied to the artists who made them.</p></div><div class="status"><span class="chip">${n} movements</span><span class="chip">${MOVEMENTS.filter(m=>mvState(m)==='heat').length} heating</span></div></div>
  <div class="mvfilters" role="group" aria-label="Filter the movements"><div class="seg">${MV_ERAS.map(e=>`<button class="tag${mvs.era===e[0]?' on':''}" data-era="${e[0]}" aria-pressed="${mvs.era===e[0]}">${esc(e[1])}</button>`).join('')}</div><div class="seg">${['all','heat','steady','cool','rare'].map(s=>`<button class="tag ${s==='heat'?'heat':s==='cool'?'cool':''}${mvs.state===s?' on':''}" data-st="${s}" aria-pressed="${mvs.state===s}">${s==='all'?'Any market':esc(MV_STATES[s])}</button>`).join('')}</div><label class="sr" for="mvq">Search the movements</label><input id="mvq" type="search" placeholder="Search: Fluxus, Monet, Vienna…" value="${esc(mvs.q)}"></div>
  <div class="mvtlwrap" id="mvtl"></div>
  <div class="mvkey"><span class="heat"><i></i>market heating</span><span class="steady"><i></i>steady</span><span class="cool"><i></i>cooling</span><span class="rare"><i></i>rarely offered</span><span class="faint">bars run from first to last date; a movement still active runs to now</span></div>
  <div class="mvcards" id="mvcards"></div>`;
  /* a filter redraws the view: the pressed button keeps the focus */
  $$('[data-era]',el).forEach(b=>b.addEventListener('click',()=>{mvs.era=b.dataset.era;renderMovements();focusEl($(`#v-movements [data-era="${mvs.era}"]`));}));
  $$('[data-st]',el).forEach(b=>b.addEventListener('click',()=>{mvs.state=b.dataset.st;renderMovements();focusEl($(`#v-movements [data-st="${mvs.state}"]`));}));
  const q=$('#mvq');q.addEventListener('input',()=>{mvs.q=q.value;mvDraw();});mvDraw();}
function mvDraw(){const L=mvList();const tl=$('#mvtl'),cards=$('#mvcards');if(!tl||!cards)return;
  tl.innerHTML=L.length?mvTimeline(L):'<p class="empty">No movement matches. Clear the search or choose another era.</p>';
  cards.innerHTML=L.map(m=>{const st=mvState(m);const mk=m.market||{};const pic=mvPics(m,1)[0];return `<button class="mvc ${st}" data-move="${esc(m.id)}">${pic?`<img src="img/t/${esc(pic)}.jpg" alt="" loading="lazy" style="object-position:${esc(IMG[pic].fp||'50% 50%')}">`:'<span class="sw" aria-hidden="true"></span>'}<span class="tx"><span class="k">${esc(mvSpan(m))} · ${esc(m.place||'')}</span><b>${esc(m.n)}</b><small>${esc(cut(m.what,150))}</small><span class="mk"><span class="tag ${st==='heat'?'heat':st==='cool'?'cool':st==='rare'?'ex':''}">${esc(MV_STATES[st])}</span>${mk.record?`<span class="rec">${esc(cut(mk.record,70))}</span>`:''}</span></span></button>`;}).join('');
  $$('[data-move]',tl).concat($$('[data-move]',cards)).forEach(b=>{if(b.__m)return;b.__m=1;b.addEventListener('click',()=>openMovement(b.dataset.move));if(b.tagName==='g')b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openMovement(b.dataset.move);}});});
  markScrollables($('#v-movements'));}
function openMovement(id){const m=MOVEMENTS.find(x=>x.id===id);if(!m)return;const st=mvState(m);const mk=m.market||{};const lots=mvLots(m),pv=mvPrivate(m),up=mvUpcoming(m),pics=mvPicsAll(m,4);const td=typeof MOVE_TODAY==='object'&&MOVE_TODAY?MOVE_TODAY[m.id]:null;   /* v34: the collections that hold the key works, and the world then (data/research/v34/today.json) */
  const near=MOVEMENTS.filter(x=>x!==m&&((m.links||[]).includes(x.id)||(x.links||[]).includes(m.id))).slice(0,6);
  const around=near.length?near:MOVEMENTS.filter(x=>x!==m&&Math.abs(mvFrom(x)-mvFrom(m))<=30).sort((a,b)=>Math.abs(mvFrom(a)-mvFrom(m))-Math.abs(mvFrom(b)-mvFrom(m))).slice(0,5);
  const artists=moveArtists(m);const works=(m.works||[]).map(w=>typeof w==='string'?w:`${w.a?w.a+', ':''}${w.t||''}${w.y?` (${w.y})`:''}${w.where?` — ${w.where}`:''}`);
  const qs=[`Explain ${m.n} to someone who has never looked at it`,`What does ${m.n} sell for now, and who is buying?`,`How do I tell a great ${m.n} work from an ordinary one?`];
  const html=`<div class="dossier mvd">${back('movements','Movements')}<div class="mvhead"><span class="k">${esc(mvSpan(m))} · ${esc(m.place||'')}</span><h1>${esc(m.n)}</h1>${(m.aka||[]).length?`<p class="aka">also ${esc(m.aka.join(', '))}</p>`:''}<p class="dek">${esc(m.what)}</p><div class="tags"><span class="tag ${st==='heat'?'heat':st==='cool'?'cool':st==='rare'?'ex':''}">market ${esc(MV_STATES[st])}</span>${m.vf?`<span class="tag" title="V: verified against a primary source; S: secondary source; U: unverified">${esc(m.vf)}</span>`:''}<button class="tag cmp" data-compare="movement" data-a="${esc(m.id)}">Compare with…</button></div></div>
  ${pics.length?`<div class="mvpics n${pics.length}">${pics.map(mvFigure).join('')}</div>`:''}
  <div class="grid"><div class="c8 sect"><div class="rh"><h2>Why it happened</h2></div><p class="prose">${esc(m.why)}</p>${m.look?`<div class="rh"><h2>How to look</h2></div><p class="prose">${esc(m.look)}</p>`:''}
    ${artists.length?`<div class="rh"><h2>The artists</h2></div><div class="mvart">${artists.map(a=>ARTISTS.includes(a)?`<button class="rlink" data-artist="${esc(a)}">${esc(a)}</button>`:`<span>${esc(a)}</span>`).join('')}</div>`:''}
    ${works.length?`<div class="rh"><h2>Works to know</h2></div><ul class="mvworks">${works.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`:''}
    ${td&&Array.isArray(td.owners)&&td.owners.length?`<div class="rh"><h2>Where the key works hang today</h2></div><ul class="mvworks">${td.owners.slice(0,6).map(o=>{const u=Array.isArray(o.src)?o.src[1]:o.src;return `<li><b>${esc(o.n||'')}</b>${o.what?` — ${esc(o.what)}`:''}${u?` <a class="rlink" href="${esc(u)}" target="_blank" rel="noopener">↗</a>`:''}</li>`;}).join('')}</ul>`:''}
    ${td&&td.sync?`<div class="rh"><h2>The world then</h2></div><p class="prose">${esc(td.sync)}${(td.src||[]).length?` <span class="faint">${td.src.slice(0,2).map(x=>`<a href="${esc(Array.isArray(x)?x[1]:x)}" target="_blank" rel="noopener">${esc(Array.isArray(x)?x[0]:'source')}</a>`).join(' · ')}${td.vf?` · ${esc(td.vf)}`:''}</span>`:''}</p>`:''}
    ${around.length?`<div class="rh"><h2>${near.length?'Before, after and beside it':'Around the same time'}</h2></div><div class="mvnear">${around.map(x=>`<button class="rlink" data-move="${esc(x.id)}">${esc(x.n)} <small>${esc(mvSpan(x))}</small></button>`).join('')}</div>`:''}</div>
  <aside class="c4 sect mvmk"><div class="rh"><h2>The market today</h2></div><p>${esc(mk.note||'The terminal holds no market note for this movement yet.')}</p>${mk.record?`<div class="facts"><span class="l">Record</span><span class="v">${esc(mk.record)}</span></div>`:''}
    ${lots.length?`<span class="label">In the terminal</span>${lots.slice(0,6).map(r=>`<button class="rlink" data-lot="${esc(r.id)}">${esc(r.artist)}, ${esc(r.title)} <small>${esc(mm(r.price))} · ${esc(r.date.slice(0,4))}</small></button>`).join('')}`:''}
    ${pv.length?`<span class="label">Private sales, reported</span>${pv.map(x=>`<button class="rlink" data-ref="private:${x.i}">${esc(x.p.work)} <small>${esc(x.p.price)} · ${esc(x.p.year)}</small></button>`).join('')}`:''}
    ${up.length?`<span class="label">To come</span>${up.map(x=>`<button class="rlink" data-up="${x.i}">${esc(x.u.artist)}, ${esc(x.u.title)} <small>${esc(x.u.est)} · ${esc(fdate(x.u.date))}</small></button>`).join('')}`:''}
    <span class="label">Ask the analyst</span>${qs.map(q=>`<button class="askq sm" data-ask="${esc(q)}">${esc(q)}</button>`).join('')}
    ${(m.sources||[]).length?`<span class="label">Sources</span>${m.sources.map(s=>`<a class="rlink" href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])} ↗</a>`).join('')}`:''}</aside></div></div>`;
  detail(html,'movement-'+m.id);const el=$('#v-detail');bindRefs(el);bindAskButtons(el);if(typeof eyeDrawSheets==='function')eyeDrawSheets(el);if(typeof eyeImgGuard==='function')eyeImgGuard(el);
  $$('[data-move]',el).forEach(b=>b.addEventListener('click',()=>openMovement(b.dataset.move)));}
