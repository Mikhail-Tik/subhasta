/* ---------- THE CIRCLE: the offer, the invitation, the value points and the Brief ----------
   Pasted into app.js after the other engines. The copy lives in CIRCLE (data_circle.js); every count in it is a {token} filled
   here from the data constants, so nothing in the Circle can drift from the terminal. The Brief is rendered from HERO, DISPATCHES,
   VITALS, SYMPTOMS, CALENDAR, FAIRS and PULSE_SRC and can be printed alone (body.print-brief), copied as text or saved as Markdown
   through the downloads capability (dlRef, requested by initCaps). The invitation reaches the owner through the host's comment
   composer (claude.use('comments'), resolved on the click, never at load); without the host a prepared request is copied instead. */
const CI_MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
let ciTier='';
const ciLongDate=iso=>{if(!iso)return '';const [y,m,d]=iso.split('-').map(Number);return `${d} ${CI_MONTHS[m-1]} ${y}`;};
const ciFlagWord=v=>v==='V'?'verified':v==='S'?'secondary':'unverified';
/* the tokens the copy may use; words() spells counts below 100 as the terminal's prose does */
function ciTokens(){const reps=REPORTS.map((r,i)=>({r,i,o:(r.m-(+NOW.slice(5,7))+12)%12})).sort((a,b)=>a.o-b.o||a.i-b.i);const next=reps.length?reps[0].r:null;const months=REPORTS.map(r=>r.m);
  const globe=(typeof GLOBE_DOTS!=='undefined'&&Array.isArray(GLOBE_DOTS)&&GLOBE_DOTS.length)?'the world map and the globe':'the world map';
  return {rooms:words(Object.keys(VENUES).length),under:words(ATLAS.length),checks:words(CHECKS.length),stations:words(STATIONS.length),flags:words(CLINIC_FLAGS.length),regimes:words(REGIMES.length),navRules:typeof NAV_RULES==="object"?words(Object.keys(NAV_RULES).length):"",players:typeof NET_PLAYERS==="object"?String(NET_PLAYERS.length):"",netCities:typeof NET_PLAYERS==="object"&&typeof wdCityKey==="function"?words(new Set(NET_PLAYERS.map(p=>wdCityKey(p.hq&&p.hq.city)).filter(Boolean)).size):"",flows:typeof NET_FLOWS==="object"?words(NET_FLOWS.length):"",nga:words(NGA.length),ngaArtists:words(NGA_ARTISTS.length),dealers:words(DEALERS.length),vitals:words(VITALS.length),symptoms:words(SYMPTOMS.length),hubs:words(HUBS.length),segments:words(SEGMENTS.length),institutions:words(INSTITUTIONS.length),reports:words(REPORTS.length),lots:words(RESULTS.length),houses:words(HOUSES.length),orgs:words(ALL.length),people:words(PEOPLE.length),stories:words(STORIES.length),verified:MARKET.verified,labPeriods:typeof labPairs==='function'?words(labPairs().length):'',provThrough:typeof labpRead==='function'?words(labpRead().thru.length):'',provOpen:typeof labpRead==='function'?words(labpRead().open.length):'',provFull:typeof labpRead==='function'?words(labpRead().covered.length):'',provFullOpen:typeof labpRead==='function'?words(labpRead().copen.length):'',flagged:typeof labFlags==='function'?labFlags().T.n.toLocaleString('en-GB'):'',limits:typeof LIMITS!=='undefined'?words(LIMITS.length):'',holdings:typeof labhRead==='function'?labhRead().H.length.toLocaleString('en-GB'):'',ownMedian:typeof labhRead==='function'&&labhRead().ownMed!=null?words(Math.round(labhRead().ownMed)):'',nextReport:next?`${next.n}, ${next.next}`:'',firstMonth:months.length?CI_MONTHS[Math.min(...months)-1]:'',lastMonth:months.length?CI_MONTHS[Math.max(...months)-1]:'',globe,tier:ciTier||CIRCLE.invite.anyTier,month:`${CI_MONTHS[+TODAY.slice(5,7)-1]} ${TODAY.slice(0,4)}`};}
/* fill {tokens}; a string that opens with a token starts a sentence, so its first letter is capitalised */
const ciFill=(s,T)=>{const src=String(s==null?'':s);const out=src.replace(/\{(\w+)\}/g,(m,k)=>k in T?String(T[k]):m);return /^\{/.test(src)?out.charAt(0).toUpperCase()+out.slice(1):out;};
/* a link into the terminal: ['go',view,label] · ['under',id,label?] · ['symptom',id,label?] · ['hub',id,label?] · ['lab',instrument,label?]; a target that does not exist renders nothing */
function ciLink(l){const [k,v,label]=l;
  if(k==='lab'){const i=(typeof LAB_INSTR!=='undefined'?LAB_INSTR:[]).find(x=>x[0]===v);return i?`<button class="btn sm" data-ci-hash="lab-${esc(i[0])}">${esc(label||i[1])}</button>`:'';}
  if(k==='go')return VIEWS.includes(v)?`<button class="btn sm" data-go="${esc(v)}">${esc(label||v)}</button>`:'';
  if(k==='under'){const a=ATL(v);return a?`<button class="btn sm" data-under="${esc(a.id)}">${esc(label||a.t)}</button>`:'';}
  if(k==='symptom'){const s=SYMPTOMS.find(x=>x.id===v);return s?`<button class="btn sm" data-symptom="${esc(s.id)}">${esc(label||s.t)}</button>`:'';}
  if(k==='hub'){const h=HUB(v);return h?`<button class="btn sm" data-hub="${esc(h.id)}">${esc(label||(h.n+' on the Atlas'))}</button>`:'';}
  return '';}
function ciTierAct(t){const a=t.act||[];if(a[0]==='go'&&VIEWS.includes(a[1]))return `<button class="btn sm" data-go="${esc(a[1])}">${esc(a[2]||a[1])}</button>`;if(a[0]==='invite')return `<button class="btn sm" data-ci-tier="${esc(t.n)}">${esc(a[1]||CIRCLE.invite.button)}</button>`;return '';}

/* ---------- the Brief: one model, three renderings ---------- */
function briefModel(){const T=ciTokens();const disp=[...DISPATCHES].filter(d=>d&&d.d).sort((a,b)=>b.d.localeCompare(a.d));
  const lead=[HERO.h,...disp.slice(0,3).map(d=>d.h)];
  const seenV=new Set();const vitals=[...FLOOR.vitals,...VITALS.map(v=>v.id)].filter(id=>{if(seenV.has(id))return false;seenV.add(id);return true;}).map(id=>VITALS.find(v=>v.id===id)).filter(Boolean).slice(0,6);
  const sym=SYMPTOMS.slice(0,3);
  const cal=[...CALENDAR.map(c=>({d:c.d,e:c.e,n:c.n,city:c.city})),...FAIRS.map(f=>({d:f.d,e:f.e,n:f.n,city:f.city}))].filter(x=>(x.e||x.d)>=NOW).sort((a,b)=>a.d.localeCompare(b.d));const seenN=new Set();const ahead=cal.filter(x=>{if(seenN.has(x.n))return false;seenN.add(x.n);return true;}).slice(0,8);
  const keys=[...new Set([...vitals.flatMap(v=>v.src||[]),...sym.flatMap(s=>s.src||[])])];const sources=keys.map(k=>PS(k)).filter(s=>Array.isArray(s)&&s[0]&&s[1]);
  return {T,month:T.month,issued:ciLongDate(TODAY),lead,vitals,sym,ahead,dispatches:disp.slice(0,6),sources,foot:ciFill(CIRCLE.brief.foot,T)};}
function briefHTML(B){const C=CIRCLE.brief;
  return `<article class="brief" id="ci-brief" tabindex="-1" aria-labelledby="ci-brief-title">
    <header class="bh"><div class="bm" id="ci-brief-title">${esc(C.n)}</div><div class="bd"><span>${esc(B.month)}</span><span>${esc(C.issued)} ${esc(B.issued)}</span></div></header>
    <section class="bs lead" aria-label="${esc(C.lead)}"><p class="l1">${esc(B.lead[0])}</p>${B.lead.slice(1).map(l=>`<p class="ln">${esc(l)}</p>`).join('')}</section>
    <section class="bs"><h3>${esc(C.vitals)}</h3><div class="bv">${B.vitals.map(v=>`<button class="bvt" data-vital="${esc(v.id)}"><span class="l">${esc(v.l)}</span><span class="v">${esc(v.v)}</span><span class="d"><b class="${esc(v.dir)}">${esc(v.d)}</b> · ${esc(v.read)}</span><span class="f">${vflag(v.vf)}</span></button>`).join('')}</div></section>
    <section class="bs"><h3>${esc(C.diag)}</h3>${B.sym.map(s=>`<p class="bdx"><button class="lnk" data-symptom="${esc(s.id)}">${esc(s.t)}</button> ${esc(firstSentence(s.read))}</p>`).join('')}</section>
    <section class="bs"><h3>${esc(C.ahead)}</h3>${B.ahead.map(x=>`<div class="bcal"><span class="d">${esc(fspan(x.d,x.e))}</span><span class="n">${esc(x.n)}</span><span class="c">${esc(x.city)}</span></div>`).join('')}</section>
    <section class="bs"><h3>${esc(C.disp)}</h3>${B.dispatches.map(d=>`<div class="bdp"><span class="d">${esc(fdate(d.d))}</span><div><a href="${esc(d.u)}" target="_blank" rel="noopener">${esc(d.h)}</a> <span class="f">${esc(d.f)}</span> ${vflag(d.vf)}<span class="r">${esc(d.r)}</span></div></div>`).join('')}</section>
    <section class="bs"><h3>${esc(C.src)}</h3><ol class="bsrc">${B.sources.map(s=>`<li><a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a></li>`).join('')}</ol></section>
    <footer class="bf">${esc(B.foot)}</footer>
  </article>`;}
function briefText(B){const C=CIRCLE.brief;const L=[`${C.n.toUpperCase()} · ${B.month}`,`${C.issued} ${B.issued}`,'',B.lead[0]];B.lead.slice(1).forEach(l=>L.push('· '+l));
  L.push('',C.vitals.toUpperCase());B.vitals.forEach(v=>L.push(`${v.l} — ${v.v} (${v.d}) — ${v.read} [${ciFlagWord(v.vf)}]`));
  L.push('',C.diag.toUpperCase());B.sym.forEach(s=>L.push(`${s.t}. ${firstSentence(s.read)}`));
  L.push('',C.ahead.toUpperCase());B.ahead.forEach(x=>L.push(`${fspan(x.d,x.e)} — ${x.n} — ${x.city}`));
  L.push('',C.disp.toUpperCase());B.dispatches.forEach(d=>L.push(`${fdate(d.d)} — ${d.r} — ${d.h} (${d.f}) [${ciFlagWord(d.vf)}] ${d.u}`));
  L.push('',C.src.toUpperCase());B.sources.forEach(s=>L.push(`${s[0]} — ${s[1]}`));
  L.push('',B.foot);return L.join('\n');}
function briefMarkdown(B){const C=CIRCLE.brief;const L=[`# ${C.n} · ${B.month}`,'',`*${C.issued} ${B.issued}*`,'',`**${B.lead[0]}**`,''];B.lead.slice(1).forEach(l=>L.push('- '+l));
  L.push('',`## ${C.vitals}`,'','| Reading | Value | Change | Read | Flag |','|---|---|---|---|---|');B.vitals.forEach(v=>L.push(`| ${v.l} | ${v.v} | ${v.d} | ${v.read} | ${ciFlagWord(v.vf)} |`));
  L.push('',`## ${C.diag}`,'');B.sym.forEach(s=>L.push(`- **${s.t}.** ${firstSentence(s.read)}`));
  L.push('',`## ${C.ahead}`,'');B.ahead.forEach(x=>L.push(`- ${fspan(x.d,x.e)} — ${x.n} — ${x.city}`));
  L.push('',`## ${C.disp}`,'');B.dispatches.forEach(d=>L.push(`- ${fdate(d.d)} · ${d.r} — [${d.h}](${d.u}) — ${d.f} · ${ciFlagWord(d.vf)}`));
  L.push('',`## ${C.src}`,'');B.sources.forEach((s,i)=>L.push(`${i+1}. [${s[0]}](${s[1]})`));
  L.push('','---','',B.foot,'');return L.join('\n');}
/* print only the sheet: body.print-brief gates the @media print rules in circle.css; the class comes off after the dialog closes */
function printBrief(){const b=document.body;b.classList.add('print-brief');let mq=null;const done=()=>{b.classList.remove('print-brief');window.removeEventListener('afterprint',done);if(mq)try{mq.removeEventListener('change',onMq);}catch(e){}};
  const onMq=e=>{if(!e.matches)done();};window.addEventListener('afterprint',done);try{mq=window.matchMedia('print');mq.addEventListener('change',onMq);}catch(e){mq=null;}
  try{window.print();}catch(e){done();}}
async function saveBrief(B){await offerFile(`subhasta-brief-${TODAY}.md`,briefMarkdown(B),'Markdown');}

/* ---------- the invitation ---------- */
function ciNote(html){const n=$('#ciNote');if(!n)return;n.innerHTML=html;n.hidden=!html;}
async function requestInvitation(btn){const I=CIRCLE.invite;const sect=$('#ci-invite');const label=btn.textContent;const request=I.request.map(l=>ciFill(l,{tier:ciTier||I.anyTier})).join('\n');
  let c=null;if(window.claude&&typeof window.claude.use==='function'){btn.disabled=true;btn.textContent='Opening…';try{c=await Promise.resolve(window.claude.use('comments'));}catch(e){c=null;}btn.disabled=false;btn.textContent=label;}
  if(c&&typeof c.openComposer==='function'){try{const r=await c.openComposer({element:sect});ciNote(`<p>${esc(r&&r.opened?I.opened:I.notOpened)}</p>`);return;}catch(e){/* unavailable, rate_limited or invalid: fall through to the prepared request */}}
  copyText(request);ciNote(`<p>${esc(I.off)} ${esc(I.copied)}</p><div class="req">${esc(request)}</div>`);}
function ciPickTier(name){ciTier=name||'';const s=$('#ci-invite');const b=$('#ciAsk');if(s){const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;try{s.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});}catch(e){s.scrollIntoView();}}if(b){const t=$('#ciTier');if(t)t.textContent=ciTier?`${ciTier} tier`:'';focusEl(b);}}

/* ---------- the page ---------- */
function renderCircle(){const el=$('#v-circle');if(!el)return;const C=CIRCLE,T=ciTokens(),B=briefModel();
  const tiers=C.tiers.map(t=>`<div class="ci-tier${t.mark?' mark':''}"><div class="ci-tn">${esc(t.n)}</div><div class="ci-who">${esc(t.who)}</div><ul class="ci-items">${t.items.map(i=>`<li>${esc(ciFill(i,T))}</li>`).join('')}</ul><div class="ci-foot"><span class="ci-price">${esc(t.price)}</span>${ciTierAct(t)}</div></div>`).join('');
  const why=C.why.map(w=>`<div class="ci-pt"><b>${esc(w.t)}</b><p>${esc(ciFill(w.e,T))}</p><div class="chips">${(w.links||[]).map(ciLink).join('')}</div></div>`).join('');
  const [latin,rest]=C.close.motto.split(' — ');
  el.innerHTML=`<div class="head"><div><div class="ci-k">${esc(C.offer.k)}</div><h1>The Circle</h1><p class="dek">${esc(ciFill(C.offer.p,T))}</p></div></div>
  <div class="grid">
    <div class="sect c12"><div class="rh"><h2>The offer</h2><span class="sub">${words(C.tiers.length)} ways in; no card is taken on this page</span></div><div class="ci-tiers">${tiers}</div><p class="ci-personal">${esc(C.personal)}</p></div>
    <div class="sect c12 ci-invite" id="ci-invite"><div class="rh"><h2>${esc(C.invite.h)}</h2><span class="sub" id="ciTier"></span></div><p class="ci-p">${esc(C.invite.p)}</p><div class="chips"><button class="btn primary" id="ciAsk">${esc(C.invite.button)}</button><button class="btn" data-go="salon">${esc(C.invite.salon)}</button></div><div class="ci-note" id="ciNote" role="status" aria-live="polite" hidden></div></div>
    <div class="sect c12"><div class="rh"><h2>Why Subhasta</h2><span class="sub">${words(C.why.length)} claims, each with its evidence in the terminal</span></div><div class="ci-why">${why}</div></div>
    <div class="sect c12 ci-briefsect"><div class="rh"><h2>The Brief</h2><span class="sub ci-acts">${esc(B.month)}, rendered from the terminal’s data · <button id="ciPrint">${esc(C.brief.print)}</button> · <button id="ciCopy">${esc(C.brief.copy)}</button> · <button id="ciSave">${esc(C.brief.save)}</button></span></div>${briefHTML(B)}<p class="ci-personal">${esc(C.brief.sub)}.</p></div>
    <div class="sect c12 ci-close"><div class="motto"><i>${esc(latin)}</i>${rest?` — ${esc(rest)}`:''}</div><p>${esc(C.close.p)}</p><button class="btn" data-go="floor">${esc(C.close.back)}</button></div>
  </div>`;
  bindLinks(el);bindTips(el);bindAtlasLinks(el);
  $('#ciAsk').addEventListener('click',()=>requestInvitation($('#ciAsk')));
  $$('[data-ci-tier]',el).forEach(b=>b.addEventListener('click',()=>ciPickTier(b.dataset.ciTier)));
  $$('[data-ci-hash]',el).forEach(b=>b.addEventListener('click',()=>openHashRoute(b.dataset.ciHash)));
  $('#ciPrint').addEventListener('click',printBrief);$('#ciCopy').addEventListener('click',()=>copyText(briefText(B),$('#ciCopy')));$('#ciSave').addEventListener('click',()=>saveBrief(B));}
