const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const doc=fs.readFileSync(require('path').join(__dirname,'build/preview.html'),'utf8');
const vc=new VirtualConsole();const errors=[];vc.on('jsdomError',e=>{const m=String(e.message||e);if(!/Could not parse CSS|color-mix/i.test(m))errors.push('jsdomError: '+m.slice(0,200));});vc.on('error',m=>errors.push('console.error: '+m));
const dom=new JSDOM(doc,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'https://example.org/'});
const w=dom.window;w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},removeEventListener(){}}));w.scrollTo=()=>{};
w.addEventListener('error',e=>errors.push('window.error: '+e.message));
/* wait for the page to boot (the app has set window.__S and the first view is drawn), polling every 100 ms for up to 10 s, then walk it */
const booted=()=>{try{const v=w.document.querySelector('.view.on');return !!(w.__S&&w.__REEL&&v&&v.innerHTML.trim());}catch(e){return false;}};
const t0=Date.now();const wait=()=>{if(booted())return run();if(Date.now()-t0>10000){errors.push('BOOT TIMEOUT: the page did not render a view within 10 s');console.log('errors:',errors.join('\n'));process.exit(1);}setTimeout(wait,100);};
const assert=(cond,msg)=>{if(!cond)errors.push('ASSERT: '+msg);};
function run(){try{const d=w.document;const q=s=>d.querySelector(s),qa=s=>Array.from(d.querySelectorAll(s));const log=[];
  log.push(`booted in ${Date.now()-t0} ms`);
  assert(d.documentElement.lang==='en','document language is en');
  assert(q('#drawer').tagName==='DIV','#drawer is a <div>');
  const G=expr=>w.eval(expr); /* the data files are script-level consts: not window properties, but visible to an indirect eval */
  assert(qa('#v-floor .status .chip').some(c=>c.textContent.includes(G('MARKET.verified'))),'Today’s chips carry MARKET.verified');
  assert(q('#v-floor .srlead h3').textContent===G('HERO.h'),'the sale room’s lead is HERO.h');
  const views=['floor','ask','movements','pulse','atlas','houses','people','hammer','ledger','salon','undertow','desk','lexicon'];
  for(const v of views){q(`#nav button[data-v="${v}"]`).click();const el=q('#v-'+v);log.push(`${v}: on=${el.classList.contains('on')} ${(el.innerHTML.length/1024).toFixed(0)}KB`);}
  w.location.hash='#signals';w.dispatchEvent(new w.Event('hashchange'));log.push('signals via hash: on='+q('#v-signals').classList.contains('on'));
  log.push('guide: '+!!q('.guide')+' buttons='+qa('.guide [data-g]').length);const gb=q('.guide [data-g="close"]');if(gb)gb.click();log.push('guide closed: '+(w.localStorage.getItem('subhasta.seen')));
  log.push('board cells: '+qa('#board .fl').length+' first line: '+qa('#board .line')[0].textContent.trim().slice(0,40));
  log.push('tiles: '+qa('#treemap .tile').length);
  q('#nav button[data-v="houses"]').click();log.push('orgs: '+qa('#hdir .org').length);qa('#hdir .org')[0].click();log.push('detail: '+q('#v-detail').classList.contains('on')+' h1='+q('#v-detail h1').textContent+' timeline='+qa('#v-detail .tl').length+' lots='+qa('#v-detail .lot').length+' hash='+w.location.hash);
  qa('#v-detail .lot')[0].click();log.push('lot: '+q('#v-detail h1').textContent+' chain='+qa('#v-detail .ch').length+' hash='+w.location.hash);
  w.location.hash='#lot-basquiat-untitled';w.dispatchEvent(new w.Event('hashchange'));log.push('basquiat price path svg: '+qa('#v-detail .chart svg').length+' '+(q('#v-detail .chart')?q('#v-detail .chart').previousElementSibling.textContent.trim().slice(0,80):''));
  q('#nav button[data-v="people"]').click();log.push('people: '+qa('#plist .person').length);qa('#plist .person')[0].click();log.push('person: '+q('#v-detail h1').textContent+' hash='+w.location.hash+' peers='+qa('#v-detail .person').length);
  q('#nav button[data-v="floor"]').click();q('#v-floor .srlead [data-up]').click();log.push('upcoming drawer: '+q('#dTitle').textContent+' chain='+qa('#dBody .ch').length);q('#dClose').click();
  w.location.hash='#lot-pollock-number-7a';w.dispatchEvent(new w.Event('hashchange'));qa('#v-detail [data-artist]')[0].click();log.push('artist: '+q('#v-detail h1').textContent+' provs='+qa('#v-detail .prov').length+' hash='+w.location.hash);
  q('#nav button[data-v="hammer"]').click();log.push('rows: '+qa('#rtbl tbody tr').length+' artists index rows: '+qa('#v-hammer table')[1].querySelectorAll('tbody tr').length);const sel=q('#rera');sel.value='2026';sel.dispatchEvent(new w.Event('change'));log.push('2026 rows: '+qa('#rtbl tbody tr').length);
  q('#nav button[data-v="ledger"]').click();log.push('ledger: '+qa('#lres .prov').length);const lq=q('#lq');lq.value='Duveen';lq.dispatchEvent(new w.Event('input'));log.push(q('#lres h2').textContent);qa('#lres .prov')[0].click();log.push('drawer: '+q('#drawer').classList.contains('on')+' '+q('#dTitle').textContent);q('#dClose').click();
  q('#nav button[data-v="salon"]').click();log.push('stories: '+qa('#v-salon .story').length+' collectors: '+qa('#v-salon .coll').length);qa('#v-salon .story')[0].click();log.push('story: '+q('#v-detail h1').textContent);q('#nav button[data-v="salon"]').click();qa('#v-salon .coll')[0].click();log.push('collector: '+q('#v-detail h1').textContent+' lots='+qa('#v-detail .lot').length);
  q('#nav button[data-v="desk"]').click();q('#cGen').click();log.push('draft: '+q('#cDraft').textContent.slice(0,90).replace(/\n/g,' | '));q('#cAddPipe').click();log.push('pipeline rows: '+qa('#pipe tbody tr[data-id]').length);
  q('#nav button[data-v="lexicon"]').click();log.push('glossary: '+qa('#glist .gl').length+' calc rows: '+qa('#calcOut .row').length+' '+qa('#calcOut .tot')[0].textContent);
  qa('.kpi')[0].click();log.push('evidence drawer: '+q('#dTitle').textContent);q('#dClose').click();
  q('#palBtn').click();const pq=q('#palq');pq.value='Griffin';pq.dispatchEvent(new w.Event('input'));log.push('palette Griffin: '+qa('#palres .ri[data-i]').length);
  w.location.hash='#house-phillips';w.dispatchEvent(new w.Event('hashchange'));log.push('deep link: '+q('#v-detail h1').textContent);
  w.location.hash='#reel-3';w.dispatchEvent(new w.Event('hashchange'));log.push('reel open: '+q('#reel').classList.contains('on')+' cards='+qa('#reelStage .rc').length+' on='+(q('#reelStage .rc.on')||{}).dataset?.i+' imgs='+qa('#reelStage img').length+' count='+q('#reelCount').textContent+' segs='+qa('#reelBar .seg').length);
  q('#reelNext').click();log.push('reel next: '+(q('#reelStage .rc.on')||{}).dataset?.i+' big='+(q('#reelStage .rc.on .rnum')||{textContent:''}).textContent);
  q('#reelClose').click();log.push('reel closed: '+!q('#reel').classList.contains('on')+' floor on='+q('#v-floor').classList.contains('on'));
  log.push('ask hero img: '+!!q('#v-floor .tdask img')+' tiles with img: '+qa('#treemap .tile.img').length);
  w.location.hash='#lot-klimt-dame-mit-f-cher';w.dispatchEvent(new w.Event('hashchange'));log.push('lot figure: '+qa('#v-detail .figure').length+' '+q('#v-detail h1').textContent);
  w.location.hash='#artist-gustav-klimt';w.dispatchEvent(new w.Event('hashchange'));log.push('artist gallery: '+qa('#v-detail .gallery a').length);
  w.location.hash='#house-sothebys';w.dispatchEvent(new w.Event('hashchange'));log.push('house figure: '+qa('#v-detail .figure').length);
  qa('#v-detail [data-lb]')[0].click();log.push('lightbox: '+q('#lightbox').classList.contains('on'));
  q('#nav button[data-v="undertow"]').click();log.push('undertow: sankey paths='+qa('#fsank .sankey .sk').length+' kpis='+qa('#fkpi .kpi').length+' ledger rows='+qa('#fledger tbody tr').length+' journeys='+qa('.journey').length+' stations='+qa('#ring .stn').length+' strip='+qa('#sstrip .sst').length+' atlas='+qa('#atlist .atl').length+' cases='+qa('.cases .case').length+' checks='+qa('#checks .chk').length);
  log.push('kpi1: '+qa('#fkpi .kpi .v').map(x=>x.textContent).join(' | '));
  const hs=q('#fhammer');hs.value=1000;hs.dispatchEvent(new w.Event('input'));log.push('hammer max: '+q('#fhv').textContent+' buyer='+qa('#fkpi .kpi .v')[0].textContent+' ledger lines='+qa('#fledger tbody tr:not(.faint)').length);
  q('#fvenue').value='london';q('#fvenue').dispatchEvent(new w.Event('input'));log.push('london: '+qa('#fledger tbody tr:not(.faint) td:first-child').map(x=>x.textContent).join(', '));
  qa('#fctl [data-preset]')[3].click();log.push('preset paris: '+q('#fhv').textContent+' '+qa('#fledger tbody tr:not(.faint) td:first-child').map(x=>x.textContent).join(', '));
  qa('#ring .stn')[4].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));log.push('station: '+q('#sbrief h3').textContent+' on='+qa('#ring .stn.on').length+' chips='+qa('#sbrief .chips .tag').length);
  qa('#atfilters .tag')[5].click();log.push('filter: '+q('#atcount').textContent+' '+qa('#atfilters .tag.on')[0].textContent);
  const aq=q('#atq');aq.value='Panama';aq.dispatchEvent(new w.Event('input'));log.push('atlas search Panama: '+qa('#atlist .atl').length);aq.value='';aq.dispatchEvent(new w.Event('input'));
  qa('#atlist .atl')[0].click();log.push('atlas drawer: '+q('#dTitle').textContent+' hash='+w.location.hash+' src='+qa('#dBody .src a').length);q('#dClose').click();
  qa('#checks input')[0].click();log.push('checks: '+q('#chkprog').textContent);qa('#checks input')[0].click();
  w.location.hash='#under-nahmad';w.dispatchEvent(new w.Event('hashchange'));log.push('deep link under: '+q('#dTitle').textContent+' view on='+q('#v-undertow').classList.contains('on'));q('#dClose').click();
  w.location.hash='#station-freeport';w.dispatchEvent(new w.Event('hashchange'));log.push('deep link station: '+q('#sbrief h3').textContent);
  w.location.hash='#reel-9';w.dispatchEvent(new w.Event('hashchange'));log.push('reel 9: '+(q('#reelStage .rc.on')||{}).className+' title='+(q('#reelStage .rc.on .rt')||{textContent:''}).textContent+' chain='+qa('#reelStage .rc.on .rch').length);
  log.push('reel kinds: '+[...new Set(qa('#reelStage .rc').map(x=>x.className.match(/k-(\w+)/)[1]))].join(','));
  const money=q('#reelStage .rc.k-money');log.push('money card rows: '+(money?money.querySelectorAll('.rf').length:0)+' '+(money?money.querySelector('.rf b').textContent:''));
  w.location.hash='#lot-klimt-dame-mit-f-cher';w.dispatchEvent(new w.Event('hashchange'));q('#v-detail [data-flowlot]').click();log.push('flow for lot: '+q('#fhv').textContent+' venue='+q('#fvenue').value+' on='+q('#v-undertow').classList.contains('on')+' buyer='+qa('#fkpi .kpi .v')[0].textContent);
  q('#nav button[data-v="floor"]').click();log.push('learned: '+qa('#v-floor .learn').length);qa('#v-floor .learn')[0].click();log.push('learned drawer: '+q('#dTitle').textContent);q('#dClose').click();
  q('#reelClose').click();
  q('#nav button[data-v="pulse"]').click();log.push('pulse: vitals='+qa('#v-pulse .vt').length+' charts='+qa('#v-pulse .chart svg').length+' symptoms='+qa('#v-pulse .sym').length+' longview='+qa('#longview .lv').length+' records='+qa('#v-pulse table tbody tr').length+' dispatches='+qa('#v-pulse .wire').length+' foryou cols='+qa('#v-pulse .fyc').length);
  qa('#v-pulse .vt')[0].click();log.push('vital drawer: '+q('#dTitle').textContent+' svg='+qa('#dBody svg').length);q('#dClose').click();
  qa('#v-pulse .sym')[0].click();log.push('symptom drawer: '+q('#dTitle').textContent+' hash='+w.location.hash+' ev='+qa('#dBody .ev').length);q('#dClose').click();
  qa('#eras .tag')[2].click();log.push('era bubble: '+qa('#longview .lv').length);
  qa('.lens [data-lens-open]')[0].click();log.push('lens drawer: '+q('#dTitle').textContent);q('#lensRole').value='banker';q('#lensRegion').value='hkcn';q('#lensSave').click();log.push('lens set: '+q('.lens .lensbtn').textContent.trim()+' | room='+qa('#v-pulse .fyl')[0].textContent.slice(0,30));
  q('#nav button[data-v="atlas"]').click();log.push('atlas: lands='+qa('#world .land').length+' hubs on map='+qa('#world .hub').length+' hub cards='+qa('#hubs .hubc').length+' regimes='+qa('.regimes tbody tr').length+' segments='+qa('#segs .segc').length+' months='+qa('.months .month').length);
  qa('#regionchips .tag')[2].click();log.push('region latam: cards='+qa('#hubs .hubc').length+' on-map on='+qa('#world .hub.on').length);qa('#regionchips .tag')[0].click();
  qa('#world .hub')[0].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));log.push('hub drawer: '+q('#dTitle').textContent+' hash='+w.location.hash);q('#dClose').click();
  qa('#segs .segc')[0].click();log.push('segment drawer: '+q('#dTitle').textContent+' hash='+w.location.hash);q('#dClose').click();
  w.location.hash='#hub-lima';w.dispatchEvent(new w.Event('hashchange'));log.push('deep hub: '+q('#dTitle').textContent);q('#dClose').click();
  w.location.hash='#segment-latam';w.dispatchEvent(new w.Event('hashchange'));log.push('deep segment: '+q('#dTitle').textContent);q('#dClose').click();
  w.location.hash='#symptom-china';w.dispatchEvent(new w.Event('hashchange'));log.push('deep symptom: '+q('#dTitle').textContent+' pulse on='+q('#v-pulse').classList.contains('on'));q('#dClose').click();
  q('#nav button[data-v="desk"]').click();q('#clArtist').value='Amedeo Modigliani';q('#clYear').value='1917';q('#clPrice').value='25000000';qa('#v-desk [data-flag]')[0].click();qa('#v-desk [data-flag]')[7].click();q('#clRun').click();log.push('clinic: '+q('#clOut .clv h3').textContent+' risks='+qa('#clOut .clr').length+' comps='+qa('#clOut .lot').length+' scores='+qa('#clOut .clr .h b').map(x=>x.textContent).join('/'));
  assert(/Base rate: of the National Gallery’s \d+ histor(?:y|ies) of Amedeo Modigliani in the 1933–45 research dates/.test(q('#clOut').textContent),'Clinic: a provenance base rate for the named artist');
  /* the Clinic reads a surname, a blank year, the sale room's resale right and an export only when the work leaves */
  {const setv=(id,v)=>{const e=q(id);e.value=v;};setv('#clArtist','Modigliani');setv('#clYear','');setv('#clJur','uk');setv('#clDest','uk');q('#clRun').click();const t=q('#clOut').textContent;
   assert(/Amedeo Modigliani \(read from “Modigliani”\)/.test(t)&&/undated/.test(t)&&!/No public record/.test(t),'Clinic: a surname reads as the artist, a blank year as undated');
   setv('#clArtist','Francis Bacon');setv('#clYear','1976');q('#clRun').click();const t2=q('#clOut').textContent;assert(/Resale right on this sale in the United Kingdom/.test(t2)&&!/Export from the United Kingdom/.test(t2),'Clinic: Bacon sold in London carries the resale right; nothing is exported within the UK');
   setv('#clArtist','Andy Warhol');q('#clRun').click();assert(!/Resale right on this sale/.test(q('#clOut').textContent),'Clinic: no resale right for an American artist');
   setv('#clArtist','Simone Martini');setv('#clYear','1330');q('#clRun').click();assert(!/Post-war/.test((q('#clOut .meta')||{textContent:''}).textContent),'Clinic: Simone Martini does not read as post-war');
   setv('#clArtist','Zhang Daqian');setv('#clYear','1960');setv('#clJur','hk');setv('#clDest','hk');q('#clRun').click();assert(/Chinese 20th century/.test((q('#clOut .meta')||{textContent:''}).textContent)&&/Forged Zhang Daqian/.test(q('#clOut').textContent),'Clinic: Zhang Daqian reads as Chinese 20th century, with its authenticity note');
   setv('#clArtist','Amedeo Modigliani');setv('#clYear','1917');setv('#clJur','us');setv('#clDest','us');}
  /* the Clinic's export test follows each regime's own threshold: Korea frees post-1946 work, Italy counts seventy years */
  const clExp=(jur,yr)=>{q('#nav button[data-v="desk"]').click();q('#clJur').value=jur;q('#clDest').value='us';q('#clYear').value=String(yr);q('#clRun').click();return /Export from/.test(q('#clOut').textContent);};
  assert(!clExp('kr',1960)&&clExp('kr',1940)&&!clExp('it',1960)&&clExp('it',1950)&&clExp('uk',1970)&&!clExp('uk',1980),'Clinic: export licences bite by each regime’s threshold (Korea before 1946, Italy 70 years, UK 50)');
  q('#clJur').value='us';q('#clYear').value='1917';
  log.push('institutions: '+qa('#v-atlas .instc').length+' facts='+qa('#v-atlas .if').length);qa('#v-atlas .instc')[0].click();log.push('inst drawer: '+q('#dTitle').textContent+' hash='+w.location.hash);q('#dClose').click();
  w.location.hash='#inst-malba';w.dispatchEvent(new w.Event('hashchange'));log.push('deep inst: '+q('#dTitle').textContent);q('#dClose').click();
  q('#nav button[data-v="pulse"]').click();log.push('reports: '+qa('#v-pulse .rep').length+' csv btn='+!!q('#csvPulse'));
  q('#palBtn').click();pq.value='Lima';pq.dispatchEvent(new w.Event('input'));log.push('palette Lima: '+qa('#palres .ri[data-i]').length+' '+qa('#palres .ri[data-i] .k').map(x=>x.textContent).join(','));q('#pal').click();
  w.location.hash='#reel-2';w.dispatchEvent(new w.Event('hashchange'));log.push('reel 2: '+(q('#reelStage .rc.on')||{}).className+' chain='+qa('#reelStage .rc.on .rch').length+' total cards='+qa('#reelStage .rc').length+' maps='+qa('#reelStage .miniworld').length);q('#reelClose').click();
  /* #reel-N clamps: 0 opens the first card, an overshoot the last; the Reel rewrites the hash to the card it shows */
  const N=G('REEL.length');w.location.hash='#reel-0';w.dispatchEvent(new w.Event('hashchange'));assert((q('#reelStage .rc.on')||{}).dataset.i==='0'&&w.location.hash==='#reel-1',`#reel-0 clamps to the first card (got ${(q('#reelStage .rc.on')||{}).dataset.i}, ${w.location.hash})`);
  w.location.hash='#reel-999';w.dispatchEvent(new w.Event('hashchange'));assert((q('#reelStage .rc.on')||{}).dataset.i===String(N-1)&&w.location.hash==='#reel-'+N,`#reel-999 clamps to the last card (got ${(q('#reelStage .rc.on')||{}).dataset.i}, ${w.location.hash})`);q('#reelClose').click();
  log.push('reel clamp: #reel-0 → card 1, #reel-999 → card '+N);
  /* closing a deep-linkable drawer gives the hash back to the view beneath it, or to the dossier beneath it */
  q('#nav button[data-v="undertow"]').click();qa('#v-undertow [data-under]')[0].click();assert(/^#under-/.test(w.location.hash),'undercurrent drawer sets its hash');q('#dClose').click();assert(w.location.hash==='#undertow',`closing the drawer restores #undertow (got ${w.location.hash})`);
  w.location.hash='#lot-basquiat-untitled';w.dispatchEvent(new w.Event('hashchange'));w.__S.openAtlas('nahmad');assert(w.location.hash==='#under-nahmad'&&q('#drawer').classList.contains('on'),'drawer over a dossier sets its hash');q('#dClose').click();assert(w.location.hash==='#lot-basquiat-untitled'&&q('#v-detail').classList.contains('on'),`closing the drawer over a dossier restores the dossier hash (got ${w.location.hash})`);
  log.push('drawer close restores: view hash and dossier hash');
  /* searches are apostrophe- and diacritic-insensitive */
  q('#nav button[data-v="houses"]').click();const hq=q('#hq');hq.value="sotheby's";hq.dispatchEvent(new w.Event('input'));assert(qa('#hdir .org').some(o=>o.textContent.includes('Sotheby’s')),'directory search matches Sotheby’s typed with a straight apostrophe');hq.value='cezanne';hq.dispatchEvent(new w.Event('input'));log.push('directory cezanne: '+qa('#hdir .org').length);hq.value='';hq.dispatchEvent(new w.Event('input'));
  q('#nav button[data-v="hammer"]').click();const rq=q('#rq');rq.value='cezanne';rq.dispatchEvent(new w.Event('input'));assert(qa('#rtbl tbody tr.clk').length>0,'results search matches Cézanne typed without the accent');log.push('hammer cezanne rows: '+qa('#rtbl tbody tr.clk').length);rq.value='';rq.dispatchEvent(new w.Event('input'));
  q('#palBtn').click();pq.value="christie's";pq.dispatchEvent(new w.Event('input'));assert(qa('#palres .ri[data-i]').length>0&&q('#palres').getAttribute('role')==='listbox'&&q('#palq').getAttribute('aria-activedescendant')===qa('#palres .ri[data-i]')[0].id,'palette matches Christie’s with a straight apostrophe and marks the active option');q('#pal').click();
  /* the globe (jsdom has no canvas: the panel renders, the sphere is omitted) — modes, the journeys list, the momentum list */
  q('#nav button[data-v="atlas"]').click();const gm=qa('#globe-sect .gl-modes .tag').map(b=>b.dataset.gmode);assert(gm.includes('share')&&gm.includes('momentum')&&gm.includes('journeys')&&gm.includes('calendar'),'globe modes: share, momentum, journeys, calendar (got '+gm.join(',')+')');
  assert(/\d+%/.test((q('#globe-sect .gl-read')||{}).textContent||''),'globe share reading carries a percentage');
  q('#globe-sect .gl-modes [data-gmode="journeys"]').click();const jr=qa('#globe-sect .gl-jr');assert(jr.length===G('JOURNEYS.length'),`journeys list has one row per journey (${jr.length})`);assert(/Salvator Mundi/.test(q('#globe-sect .gl-read').textContent)&&/Geneva/.test(q('#globe-sect .gl-read').textContent),'journeys reading names Salvator Mundi and Geneva');
  q('#globe-sect .gl-modes [data-gmode="momentum"]').click();assert(qa('#globe-sect .gl-content [data-hub]').length>0,'momentum lists rising and cooling hubs');
  log.push('globe: modes '+gm.join(',')+'; journeys '+jr.length+'; '+q('#globe-sect .gl-read').textContent.slice(0,60));
  /* currency weather on the Pulse */
  q('#nav button[data-v="pulse"]').click();const fxc=qa('#fxweather .vt.fx');assert(fxc.length===4,'currency weather has four cards (got '+fxc.length+')');assert(/Geneva buyer/.test((q('#fxweather .fx-read')||{}).textContent||''),'currency weather prices a New York lot for a Geneva buyer');
  log.push('fx: '+fxc.map(c=>c.querySelector('.v').textContent).join(' '));
  /* the Circle: offer, tiers, invitation, brief */
  q('#nav button[data-v="circle"]').click();assert(q('#v-circle').classList.contains('on'),'Circle view shows');const tiers=qa('#v-circle .ci-tier');assert(tiers.length===G('CIRCLE.tiers.length'),'one card per tier ('+tiers.length+')');
  assert(!!q('#ci-invite')&&!!q('#ci-brief'),'Circle has the invitation and the brief');assert(!/\{[A-Za-z]+\}/.test(q('#v-circle').textContent),'no unreplaced {token} in the Circle');assert(!/undefined|NaN/.test(q('#ci-brief').textContent),'the brief has no undefined or NaN');
  log.push('circle: tiers '+tiers.length+'; brief '+(q('#ci-brief-title')||{}).textContent);
  /* the Reel's closing card links the Circle */
  w.location.hash='#reel-'+G('REEL.length');w.dispatchEvent(new w.Event('hashchange'));assert(!!q('#reelStage .rc.on [data-go="circle"]'),'the closing card links the Circle');
  /* ---- gap audit, October 2026: analysis and measurement ---- */
  /* the clipboard is stubbed so the copy and CSV fallbacks can be read back (jsdom has no clipboard; without the downloads capability every file offer is a copy) */
  Object.defineProperty(w.navigator,'clipboard',{value:{writeText:t=>{w.__clip=t;return Promise.resolve();}},configurable:true});
  /* Hammer: sortable headings kept in store, a city filter, a summary line for the current filter, CSV with deep links */
  q('#nav button[data-v="hammer"]').click();assert(qa('#rtbl thead [data-sort]').length===5,'results table: five sortable headings');
  q('#rtbl [data-sort="artist"]').click();assert((q('#rtbl th[aria-sort]')||{getAttribute:()=>''}).getAttribute('aria-sort')==='ascending'&&JSON.parse(w.localStorage.getItem('subhasta.hammer.sort')||'{}').k==='artist','sorting by artist sets aria-sort and is kept in store');
  const rer=q('#rera');rer.value='all';rer.dispatchEvent(new w.Event('change')); /* an earlier step left the period at 2026 */
  const rcy=q('#rcity');rcy.value='London';rcy.dispatchEvent(new w.Event('change'));const lon=G("RESULTS.filter(r=>r.city==='London').map(r=>r.price).sort((a,b)=>a-b)");const lonMed=lon.length%2?lon[(lon.length-1)/2]:(lon[lon.length/2-1]+lon[lon.length/2])/2;
  assert(qa('#rtbl tbody tr.clk').length===lon.length,`city filter selects every London lot (${qa('#rtbl tbody tr.clk').length} of ${lon.length})`);
  assert(q('#rsum').textContent.startsWith(`${lon.length} of ${G('RESULTS.length')} lots`)&&q('#rsum').textContent.includes('median '+w.__S.mm(lonMed)),'summary line: the count and the median of the filter');
  w.__clip='';q('#rCsv').click();assert(w.__clip.split('\r\n').length===lon.length+1&&w.__clip.split('\r\n').slice(1).every(l=>/#lot-[a-z0-9-]+"$/.test(l)),'hammer CSV: a header and one row per lot, each with its deep link');
  w.__clip='';q('#rCopy').click();assert(/^Hammer, Subhasta/.test(w.__clip)&&w.__clip.includes('London'),'copy the line names the filter');
  rcy.value='all';rcy.dispatchEvent(new w.Event('change'));q('#rsort').value='price';q('#rsort').dispatchEvent(new w.Event('change'));
  /* Houses: two to four side by side, the big three's shares, the directory as CSV, an empty state */
  q('#nav button[data-v="houses"]').click();q('#hcmpBtn').click();assert(!q('#hcmp').hidden&&q('#hcmpBtn').getAttribute('aria-expanded')==='true','Compare houses opens the panel');
  assert(qa('#hcmp .hctbl thead th').length===4&&qa('#hcmp [data-hc][aria-pressed="true"]').length===3,'the big three side by side by default');
  const b3=(qa('#hcmp .hctbl tr.sum')[1].textContent.match(/[\d.]+%/g)||[]).map(parseFloat);assert(b3.length===3&&Math.abs(b3.reduce((a,b)=>a+b,0)-100)<0.3,'the big three’s shares add up to 100% ('+b3.join(', ')+')');
  q('#hcmp [data-hc="bonhams"]').click();assert(qa('#hcmp .hctbl thead th').length===5&&qa('#hcmp [data-hc][disabled]').length===qa('#hcmp [data-hc]').length-4,'a fourth house joins; four at most');
  w.__clip='';q('#hcsv').click();assert(w.__clip.split('\r\n').length===G('HOUSES.length+PLAYERS.length')+1&&/"Sales 2025 \(bn\)"/.test(w.__clip),'directory CSV: one row per organisation with every year of sales');
  const hq3=q('#hq');hq3.value='zzqqxx';hq3.dispatchEvent(new w.Event('input'));assert(!!q('#hdir .empty'),'directory: an empty state when nothing matches');hq3.value='';hq3.dispatchEvent(new w.Event('input'));q('#hcmpBtn').click();
  /* Atlas: hubs side by side, a hub's drawer adds itself, regime sources when the data has them */
  q('#nav button[data-v="atlas"]').click();assert(qa('#hctab thead .hcl').length>=2&&qa('#hctab tbody tr').length===13,'hubs side by side: at least two hubs, thirteen lines');
  w.location.hash='#hub-dubai';w.dispatchEvent(new w.Event('hashchange'));q('#hubCmpAdd').click();assert(!q('#drawer').classList.contains('on')&&qa('#hctab thead .hcl').some(b=>b.dataset.hub==='dubai'),'a hub’s drawer adds it to the comparison');
  const regN=G('REGIMES.filter(r=>Array.isArray(r.src)&&r.src.length).length');assert(qa('.regimes thead th').some(t=>t.textContent==='Sources')===(regN>0)&&qa('.regimes details.fn').length===regN,'regimes: a sources footnote for every row that carries REGIMES[].src');
  /* the palette: the Lab's five instruments, the journeys, the Brief */
  const palK=s=>{q('#palBtn').click();pq.value=s;pq.dispatchEvent(new w.Event('input'));const k=qa('#palres .ri[data-i] .k').map(x=>x.textContent);return k;};
  assert(['What trophies earned','The round trip','How concentrated the market is','Provenance, 1933 to 1945','How long owners held','How much is verified'].every(s=>palK(s).includes('Instrument')),'palette: the six Lab instruments');
  assert(palK(G('JOURNEYS[0].t')).includes('Journey')&&palK('brief').includes('Brief'),'palette: the journeys and the Brief');
  palK(G('JOURNEYS[1].t'));const ji=qa('#palres .ri[data-i] .k').findIndex(x=>x.textContent==='Journey');qa('#palres .ri[data-i]')[ji].click();assert(q('#v-undertow').classList.contains('on')&&d.activeElement.id==='journey-'+G('JOURNEYS[1].id'),'a journey picked in the palette opens the Undertow at its card');
  /* Pulse: the figure with its source, the data behind the charts, a source on every tile */
  q('#nav button[data-v="pulse"]').click();assert(qa('#v-pulse details.dtab').length>=6&&q('#v-pulse details.dtab').querySelectorAll('tbody tr').length===G('SERIES.global.length'),'Pulse: a data table behind each chart; global sales has one row per year');
  assert(qa('#v-pulse .vt .vsrc').length===G('VITALS.filter(v=>v.src&&v.src.length).length'),'every vital tile shows its source');
  qa('#v-pulse .vt')[0].click();const vc0=q('#dBody .btn.copy');assert(vc0&&vc0.dataset.v.includes(G('MARKET.verified'))&&/https?:\/\//.test(vc0.dataset.v)&&vc0.dataset.v.startsWith(G('VITALS[0].l')),'vital drawer: copy the figure with its source address and the verification date');q('#dClose').click();
  /* Floor: as-of dates on the tiles and the board; the evidence drawer's copy */
  q('#nav button[data-v="floor"]').click();assert(qa('#v-floor .kpis .kpi .src').length===4&&qa('#v-floor .kpis .kpi .src').every(s=>s.textContent.includes('as of '+G('MARKET.verified'))),'every KPI tile carries its source and an as-of date');
  assert((q('#board .ttl .asof')||{textContent:''}).textContent.includes(w.__S.fdate(G('[...RESULTS].sort((a,b)=>b.date.localeCompare(a.date))[0].date'))),'the hammer board is dated by its newest result');
  q('#v-floor .kpis .kpi').click();assert((q('#dBody .btn.copy')||{dataset:{v:''}}).dataset.v.startsWith(G('EVIDENCE.global.l')+': '+G('EVIDENCE.global.v')),'evidence drawer: copy the figure with its source');q('#dClose').click();
  /* Undertow: the hammer sensitivity strip, the destinations, the ledger as text and CSV, local money */
  q('#nav button[data-v="undertow"]').click();const sensN=qa('#fsens tbody tr').length,sensThird=w.__S.FLOW.structure==='third';assert(qa('#fsens thead th').length===6&&sensN===(sensThird?5:4)&&(!sensThird||/Guarantor/.test(qa('#fsens tbody tr')[4].textContent)),'sensitivity strip: five hammers, four lines (five with a third-party guarantee)');
  /* the money model's rules (v21): a guarantee fixed in dollars, the resale right by payer, nationality and threshold, the estate tax, the London preset in pounds */
  {const S=w.__S,FM=S.flowModel,FB=S.FLOW,base=Object.assign({},FB,{hammer:10e6,house:'sothebys',structure:'third',guar:.9,feeShare:.2,seller:'5',dest:'freeport',loan:'none',ship:0,artist:null});
   const G0=.9*base.hammer;Object.assign(FB,base);S.initFlow();
   const sensH=qa('#fsens tbody tr')[0].querySelectorAll('td');assert(+String(sensH[0].textContent).replace(/[^0-9.]/g,'')*1e6>=G0-1e3,'sensitivity: below the guarantee the hammer stays at the irrevocable bid');
   const par=FM(Object.assign({},base,{venue:'paris',living:true})),lon=FM(Object.assign({},base,{venue:'london',living:true}));assert(par.arr>0&&par.arrSeller===0&&par.arrBuyer===par.arr&&lon.arrBuyer===lon.arr,'resale royalty: charged to the buyer in Paris and London');
   const war=FM(Object.assign({},base,{venue:'london',artist:'Andy Warhol'})),hoc=FM(Object.assign({},base,{venue:'london',artist:'David Hockney'})),pic=FM(Object.assign({},base,{venue:'paris',artist:'Pablo Picasso'})),klm=FM(Object.assign({},base,{venue:'london',artist:'Gustav Klimt'}));
   assert(war.arr===0&&hoc.arr>0&&pic.arr>0&&klm.arr===0,'resale royalty: none for an American artist or one dead 70 years; due for Hockney in London and Picasso in Paris');
   assert(S.arrApplies('Yayoi Kusama',2026,'london')===false&&S.arrApplies('Zao Wou-Ki',2026,'paris')===true&&S.arrApplies('Gerhard Richter',2026,'ny')===false,'arrApplies: nationality, term and room');
   const tiny=FM(Object.assign({},base,{venue:'paris',living:true,hammer:500}));assert(tiny.arr===0,'resale royalty: nothing below the room’s threshold');
   assert(Math.abs(FM(base).estate-0.4*FM(base).price)<1,'estate tax: 40% of the whole price');
   q('#fctl [data-preset="1"]').click();assert(Math.abs(S.FLOW.hammer-74e6*G('FX.gbp'))<2000,'the London Klimt preset is a £74m hammer in dollars');
   q('#fctl [data-preset="0"]').click();q('#fdest').value='nyc';q('#fdest').dispatchEvent(new w.Event('input'));assert(S.FLOW.hammer===205e6,'a preset’s hammer keeps its value when another control moves');
   /* a hammer below the slider's $100k floor (a Lab round trip sent here) survives a change to another control */
   Object.assign(S.FLOW,{hammer:5e4});S.initFlow();q('#fdest').value='londonhome';q('#fdest').dispatchEvent(new w.Event('input'));assert(S.FLOW.hammer===5e4&&/50,000|50k/.test(q('#fhv').textContent),'a hammer below the slider keeps its value when another control moves');
   assert(qa('#fhouse option').length===Object.keys(S.SCHED).length,'house select: every schedule');
   /* ties: an American artist bought for New York costs the same in every room (use tax on arrival, VAT refunded on export); bought for a London home, London is cheapest alone */
   Object.assign(S.FLOW,{venue:'ny',dest:'nyc',artist:'Andy Warhol',living:false,hammer:3e6});S.initFlow();const tags=qa('#fcompare .tag.rec').map(t=>t.textContent);
   Object.assign(S.FLOW,{dest:'londonhome'});S.initFlow();const tags2=qa('#fcompare .tag.rec');
   assert(tags.length===Object.keys(G('VENUES')).length&&tags.every(t=>t==='tied cheapest')&&tags2.length===1&&tags2[0].textContent==='cheapest for the buyer'&&/London/.test(tags2[0].closest('tr').textContent),'compare the rooms: ties are tagged as ties, a single cheapest room alone');
   Object.assign(S.FLOW,base,{venue:'ny',dest:'nyc'});S.initFlow();}
  assert(qa('#fsens tbody tr')[1].querySelectorAll('td')[2].textContent===qa('#fkpi .kpi .v')[0].textContent,'the strip’s middle column is the deal as set');
  assert(qa('#fdests tbody tr').length===G('Object.keys(DESTS).length'),'destinations: one row per place to keep the work');
  w.__clip='';q('#fCopy').click();assert(/^Follow the money, Subhasta/.test(w.__clip)&&w.__clip.includes('Buyer’s premium: '),'copy the ledger');
  w.__clip='';q('#fCsv').click();assert(w.__clip.startsWith('"Line","Amount (US$)","Rule","Atlas entry","Link"')&&/#under-/.test(w.__clip),'ledger CSV with atlas deep links');
  q('#fvenue').value='london';q('#fvenue').dispatchEvent(new w.Event('input'));assert(/£/.test(q('#ffx').textContent),'local money in sterling for the London room');
  /* print: a button and a paper line on every dossier and drawer; the print rules print an open drawer alone */
  w.location.hash='#house-sothebys';w.dispatchEvent(new w.Event('hashchange'));assert(!!q('#v-detail .dprint')&&(q('#v-detail .ponly')||{textContent:''}).textContent.includes('#house-sothebys'),'dossier: a print button and a paper line with its address');
  w.location.hash='#hub-geneva';w.dispatchEvent(new w.Event('hashchange'));assert(!!q('#drawer .dh #dPrint')&&!!q('#dBody .ponly'),'drawer: a print button and a paper line');q('#dClose').click();
  assert(/body:has\(#drawer\.on\) \.drawer\{display:block!important/.test(qa('style').map(s=>s.textContent).join('')),'print rules print an open drawer alone');
  /* the artist dossier measures the artist's lots; a ResizeObserver notice is not an error */
  w.location.hash='#artist-gustav-klimt';w.dispatchEvent(new w.Event('hashchange'));assert(/in all, median \$/.test(q('#v-detail .dek').textContent),'artist dossier: total and median of the lots');
  const ne=errors.length;w.dispatchEvent(new w.ErrorEvent('error',{message:'ResizeObserver loop completed with undelivered notifications.'}));const nAdded=errors.splice(ne);assert(!nAdded.some(e=>/^console\.error/.test(e)),'the ResizeObserver loop notice is not reported as an error');
  /* where to buy, where to keep: every room against every destination */
  q('#nav button[data-v="undertow"]').click();const fmxR=qa('#fmx tbody tr'),fmxV=fmxR.map(tr=>[...tr.querySelectorAll('td')].map(td=>+td.dataset.v));
  assert(fmxR.length===G('Object.keys(VENUES).length')&&fmxV.every(r=>r.length===G('Object.keys(DESTS).length')&&r.every(isFinite)),'Follow the money: a room-by-destination matrix');
  const fmxMin=Math.min(...qa('#fmx tbody td:not(.defer)').map(td=>+td.dataset.v));assert(qa('#fmx td.best').length>=1&&qa('#fmx td.best').every(td=>+td.dataset.v-fmxMin<=1&&!td.classList.contains('defer'))&&+q('#fmx').dataset.min===fmxMin&&!!q('#fmx td.cur'),'Follow the money: the cheapest routes are marked, and the route on screen');
  const dfr=G('Object.keys(DESTS).filter(k=>DESTS[k].defer)');assert(dfr.length>=1&&qa('#fmx thead th.defer').length===dfr.length&&qa('#fmx tbody td.defer').length===dfr.length*G('Object.keys(VENUES).length')&&!/cheapest/.test([...qa('#fdests tbody tr')].filter(tr=>/deferred/.test(tr.textContent)).map(tr=>tr.textContent).join('')),'Follow the money: a deferred tax is shown but not ranked (the museum loan)');
  const FM=w.__S.flowModel,FB=w.__S.FLOW,ex=(v,dd,o)=>FM(Object.assign({},FB,{venue:v,dest:dd},o||{}));
  assert(ex('london','londonhome').vatPrem>0&&ex('london','hkhome').vatPrem===0&&ex('london','londonhome',{imported:true}).impVat>0&&ex('london','hkhome',{imported:true}).impVat===0&&ex('geneva','genevahome').vatPrem>0&&ex('geneva','freeport').vatPrem===0&&ex('paris','parishome').vatPrem>0&&ex('paris','nyc').vatPrem===0,'Follow the money: the room’s VAT comes back on export or into bond, and stays when the work stays');
  assert(ex('london','parishome').destVat>0&&ex('paris','parishome').destVat===0&&ex('london','genevahome').destVat>0&&ex('ny','museum').ins===0&&ex('ny','nyc').ins>0,'Follow the money: import VAT on arrival from another country, none from the same; the museum insures a loan');
  log.push('matrix: '+q('.fmx-read').textContent.slice(0,160));
  log.push('gap audit: hammer, houses, atlas, palette, pulse, floor, undertow, print checked');
  /* ---------- v22: Today, the analyst, the movements, the live layer, the masthead ---------- */
  {q('#nav button[data-v="floor"]').click();const L=G('LIVE');
   assert(qa('#v-floor .srrow').length===L.sales.length,`the sale room draws every sale (${qa('#v-floor .srrow').length} of ${L.sales.length})`);
   assert(qa('#v-floor .srcol').length===2,'the sale room has a verdict column and a test column');
   assert(qa('#v-floor .tell').length===L.read.tells.length,'one tell per LIVE.read.tells entry');
   assert(q('#v-floor .readin h3').textContent===L.read.h,'the Read’s headline is LIVE.read.h');
   assert(qa('#v-floor .gotile').length===8,'eight ways deeper');
   assert(!!q('#tdAskForm')&&!!q('#tdAskIn'),'Today carries the ask bar');
   qa('#v-floor .srrow')[0].click();assert(q('#drawer').classList.contains('on')&&/Sotheby|Christie|Phillips|Fair Warning/.test(q('#dTitle').textContent),'a sale room row opens its sale');q('#dClose').click();
   const below=L.sales.filter(x=>x.res&&x.res.v==='below').length;assert(qa('#v-floor .srrow .res.below').length===below,'every sale below its estimate is marked below');}
  {const S=w.__S;
   const md=S.mdRender('<img src=x onerror=alert(1)> **bold** [[lot:monet-iris|Iris]] [[lot:nope|Ghost]] [x](javascript:alert(1)) [ok](https://example.org/a)\n| A | B |\n|---|---|\n| one | $2.5m |\n- item');
   assert(!/<img/.test(md)&&/&lt;img/.test(md),'mdRender escapes markup');assert(/<b>bold<\/b>/.test(md),'mdRender: bold');
   assert(/<button class="ref" data-ref="lot:monet-iris"/.test(md),'mdRender: a known ref becomes a link');assert(/<span class="ref dead">Ghost<\/span>/.test(md),'mdRender: an unknown ref stays text');
   assert(!/href="javascript/.test(md)&&/href="https:\/\/example.org\/a"/.test(md),'mdRender: only http(s) links');assert(/<table class="tbl">/.test(md)&&/<td class="n">\$2.5m<\/td>/.test(md),'mdRender: tables, numbers right-aligned');assert(/<ul><li>item<\/li><\/ul>/.test(md),'mdRender: lists');
   const sp=S.askSplit('Hello.\nNEXT: One? | Two? | Three?\nGAP: the 2019 price');assert(sp.body==='Hello.'&&sp.next.length===3&&sp.gap==='the 2019 price','askSplit takes off NEXT and GAP');
   assert(S.askSplit('Answer\nNEX').body==='Answer','askSplit holds back a half-written NEXT');
   const k1=S.kxSearch('Klimt Lederer',5);assert(k1.length&&k1.some(h=>h.ref==='lot:klimt-portrait-of-elisabeth-lederer'),'the index finds the Lederer portrait');
   const k2=S.kxSearch('impressionists',5);assert(k2[0]&&k2[0].ref==='movement:impressionism',`stems: impressionists → the Impressionism movement (got ${k2[0]&&k2[0].ref})`);
   const k3=S.kxSearch('private sale de Kooning Interchange',5);assert(k3.some(h=>h.kind==='private'),'private sales are searchable');
   assert(S.kxCount()>1500,`the index holds the page (${S.kxCount()} records)`);
   const c=S.dataAnswer('What does a $20m hammer cost in all, bought in London and kept in a Geneva freeport?');assert(/\| \*\*Total\*\* \|/.test(c)&&/London/.test(c)&&/freeport/i.test(c),'the data answer prices a hammer all in');
   const pv=S.dataAnswer('What are the biggest private sales on record?');assert(/\[\[private:\d+\|/.test(pv),'the data answer lists private sales');
   const mv=S.dataAnswer('Explain the Vienna Secession');assert(/### Vienna Secession/.test(mv)&&/\[\[movement:viennasecession\|/.test(mv),'the data answer explains a movement');
   const f=S.allInCost({hammer_usd:20e6,house:'christies',room:'london',destination:'freeport'});assert(f.total_to_buyer_usd>f.price_with_premium_usd&&f.price_with_premium_usd>20e6,'all_in_cost adds premium and costs');
   const st=S.salesStats({artist:'Monet',include_private:true});assert(st.count>=3&&st.top[0].price_usd_m>=st.median_usd_m,'sales_stats over an artist');
   assert(S.askRecordFull('artist:Claude Monet').lots.length>=3&&S.askRecordFull('movement:impressionism').lots_in_terminal.length>=1,'get_record: an artist and a movement');
   assert(S.liveValid('read',{asof:'2026-11-05',h:'A headline',dek:'A thesis.',src:[['TAN','https://www.theartnewspaper.com/x']]})===true,'liveValid accepts a well-formed read');
   assert(S.liveValid('read',{asof:'2026-11-05',h:'A headline',dek:'A thesis.',src:[['TAN','javascript:alert(1)']]})===false,'liveValid refuses a non-https source');
   assert(S.liveValid('sales',{asof:'2026-11-05',items:[{id:'bad id',n:'x',d:'2026-11-18',house:'sothebys'}]})===false,'liveValid refuses a malformed sale id');
   assert(S.liveValid('sales',{asof:'2026-11-05',items:[{id:'x-1',n:'A sale',d:'2026-11-18',house:'sothebys',res:{total:10,v:'<img src=x>'},src:[['TAN','https://example.org/a']]}]})===false,'liveValid refuses a verdict that is not one of three words');
   assert(S.liveValid('sales',{asof:'2026-11-05',items:[{id:'x-1',n:'A sale',d:'2026-11-18',house:'sothebys',est:['40','60'],src:[['TAN','https://example.org/a']]}]})===false,'liveValid refuses an estimate that is not numbers');
   assert(S.liveValid('sales',{asof:'2026-11-05',items:[{id:'x-1',n:'A sale',d:'2026-11-18',house:'sothebys',est:[40,60],res:{total:52.5,sold:'30 of 32',v:'within'},lots:[{a:'An artist',t:'A work',est:'$5m–7m'}],src:[['TAN','https://example.org/a']]}]})===true,'liveValid accepts a well-formed sale with its result');
   assert(S.liveValid('read',{asof:'2026-11-05T09:00:00Z',h:'A headline',dek:'A thesis.',src:[['TAN','https://example.org/a']]})===false,'liveValid refuses a timestamp for a date');
   assert(S.askSplit('Next: read the catalogue.\nThe end.').body==='Next: read the catalogue.\nThe end.','askSplit leaves a line that only begins “Next:”');
   assert(S.askSplit('Body\n**NEXT:** “One question” | Two questions').next.join('|')==='One question|Two questions','askSplit reads a bolded NEXT and strips quotes');
   assert(S.askSplit('Answer\nGAP').body==='Answer','askSplit holds back a half-written GAP');
   const rc=S.dataAnswer('Klimt record',S.kxSearch('Klimt record',14));assert(/the auction record/.test(rc)&&/\$236\.4m/.test(rc)&&/not an auction record/.test(rc),'the data answer gives an artist’s record, apart from private sales');
   const nv=S.dataAnswer('November 2026 evening sales',S.kxSearch('November 2026 evening sales',14));assert(/### The sale room, November 2026/.test(nv)&&/\[\[sale:[a-z0-9-]+\|/.test(nv),'the data answer gives the sale room for a month');
   const bp=S.dataAnswer('Break down recent sales, both public and private',S.kxSearch('Break down recent sales, both public and private',14));assert(/### The sale room/.test(bp)&&/### Private sales/.test(bp),'public and private sales together');
   const sl=S.dataAnswer('What sold at the Schlumberger sale?',S.kxSearch('What sold at the Schlumberger sale?',14));assert(/### Sotheby’s, The Schlumberger collection/.test(sl)&&/\[\[sale:sothebys-schlumberger\|/.test(sl),'the data answer opens one sale');
   assert(S.kxSearch('November 2026',8).some(h=>h.kind==='sale'),'dates are searchable by month');}
  {q('#nav button[data-v="ask"]').click();assert(q('#v-ask').classList.contains('on')&&qa('#v-ask .askq').length>=8,'Ask opens with example questions');
   const i=q('#askIn');i.value='Explain the Vienna Secession';q('#askForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
   const turn=qa('#askThread .turn').pop();assert(turn&&/Vienna Secession/.test(turn.querySelector('.q').textContent),'a question becomes a turn');
   assert(turn&&turn.querySelector('.md h4')&&/Vienna Secession/.test(turn.querySelector('.md h4').textContent),'without Claude, the data answer is drawn');
   assert(turn&&turn.querySelectorAll('.md .ref').length>=2&&turn.querySelectorAll('.arefs .rchip').length>=3,'the answer links its records');
   turn.querySelector('.md .ref[data-ref^="movement:"]').click();assert(q('#v-detail').classList.contains('on')&&/^#movement-viennasecession$/.test(w.location.hash),'a movement ref opens its dossier');
   assert(qa('#v-detail .mvpics .figure').length>=1&&qa('#v-detail .mvmk [data-lot]').length>=1,'the dossier shows pictures and its lots');
   const saved=JSON.parse(w.localStorage.getItem('subhasta.ask.thread')||'{}');assert(saved.turns&&saved.turns.length>=1,'the conversation is kept in this browser');}
  {q('#nav button[data-v="movements"]').click();const n=G('MOVEMENTS.length');assert(qa('#mvtl .mv').length===n&&qa('#mvcards .mvc').length===n,`the timeline and the cards draw all ${n} movements`);
   q('#v-movements [data-era="postwar"]').click();const k=qa('#mvcards .mvc').length;assert(k>0&&k<n,'an era filters the movements');q('#v-movements [data-era="all"]').click();
   const lab=qa('#mvtl .mv text').map(t=>+t.getAttribute('x'));assert(lab.every(x=>x>=0&&x<=1240),'every timeline label sits inside the timeline');
   w.location.hash='#movement-impressionism';w.dispatchEvent(new w.Event('hashchange'));assert(q('#v-detail h1').textContent==='Impressionism','#movement-<id> opens the dossier');}
  {q('#palBtn').click();const pq=q('#palq');pq.value='Why did Monet’s Iris make €50m?';pq.dispatchEvent(new w.Event('input'));assert(q('#palres .ri').classList.contains('ask'),'a question puts the analyst first in the palette');
   pq.value='Sotheby';pq.dispatchEvent(new w.Event('input'));const rows=qa('#palres .ri');assert(!rows[0].classList.contains('ask')&&rows[rows.length-1].classList.contains('ask'),'a name puts the matches first and the analyst last');
   pq.value='Explain Cubism';pq.dispatchEvent(new w.Event('input'));pq.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert(q('#v-ask').classList.contains('on')&&!q('#pal').classList.contains('on'),'Enter on the analyst row opens Ask');}
  {const mb=q('#moreBtn');mb.click();assert(q('#navMore').classList.contains('on')&&mb.getAttribute('aria-expanded')==='true','More opens the rest of the sections');q('#navMore button[data-v="atlas"]').click();assert(q('#v-atlas').classList.contains('on')&&!q('#navMore').classList.contains('on')&&mb.classList.contains('on'),'a More section opens and marks More');
   assert(q('#nav button[data-v="desk"]').classList.contains('owner-only'),'the Desk is the owner’s');
   assert(/linkedin\.com\/in\/mikhailtikhomirov/.test(q('.colophon .credit a').href),'the colophon credits the builder');
   q('#nav button[data-v="hammer"]').click();assert((q('#v-hammer .eyebrow')||{}).textContent==='Sales','the Hammer wears its masthead name');}
  /* the Lab: five instruments; repeat sales against the benchmarks; the round trip on Follow the money's entry; the verification count adds up */
  q('#nav button[data-v="lab"]').click();assert(q('#v-lab').classList.contains('on'),'the Lab opens from the masthead');
  assert(['returns','roundtrip','structure','provenance','hands','confidence'].every(k=>!!q('#lab-'+k)),'the Lab carries its six instruments');
  const lrows=qa('#labRetTbl tbody tr'),lmed=parseFloat((q('#labRetMed')||{dataset:{}}).dataset.v);
  assert(lrows.length>=10,'Lab returns: at least ten holding periods ('+lrows.length+')');assert(isFinite(lmed),'Lab returns: a numeric median');
  assert(qa('#labRank .hit').length===lrows.length,'Lab returns: one chart row per holding period');
  const lci=q('#labRetCI');assert(!!lci&&+lci.dataset.lo<lmed&&lmed<+lci.dataset.hi,'Lab returns: a 90% bootstrap interval around the median ('+(lci?lci.dataset.lo+'–'+lci.dataset.hi:'none')+')');
  assert(lrows.every(r=>/\d%$/.test(r.cells[9].textContent.trim())),'Lab returns: every holding period has the S&P 500 over the same years (BENCH covers them)');
  q('#labRetTbl [data-labsort="p0"]').click();assert(/Paid/.test((q('#labRetTbl th[aria-sort]')||{textContent:''}).textContent),'Lab returns: the table sorts by the price paid');
  w.__clip='';q('#labRetCsv').click();assert(w.__clip.startsWith('"Artist","Work","Bought (year)"')&&w.__clip.split('\r\n').filter(l=>/#lot-[a-z0-9-]+"$/.test(l)).length>=10,'Lab returns: CSV with a deep link per lot');
  qa('#labRetTbl tbody tr[data-lot]')[0].click();assert(q('#v-detail').classList.contains('on')&&/^#lot-/.test(w.location.hash),'Lab returns: a row opens its lot');q('#nav button[data-v="lab"]').click();
  const lset=(id,v)=>{const e=q('#'+id);e.value=v;e.dispatchEvent(new w.Event('input',{bubbles:true}));};lset('labRtH','10');lset('labRtHouse','sothebys');lset('labRtVenue','ny');lset('labRtT','10');
  const lbe=parseFloat(q('#labRtBE').dataset.g);assert(isFinite(lbe)&&lbe>0&&lbe<1,'Lab round trip: a finite break-even for a $10m hammer at Sotheby’s, New York, held ten years ('+lbe+')');
  const lfm=w.__S.flowModel(Object.assign({},w.__S.FLOW,{hammer:10e6,house:'sothebys',venue:'ny',dest:q('#labRtDest').value,living:q('#labRtLiving').checked})).buyer;
  assert(Math.abs(+q('#labRtEntry').dataset.v-lfm)<=1,'Lab round trip: the entry equals Follow the money’s buyer total for the same inputs');assert(/before you are whole/.test(q('#labRtRead').textContent),'Lab round trip: the break-even in one sentence');
  const lgr=qa('#labRtGrid tbody tr').map(tr=>[...tr.querySelectorAll('td')].map(td=>parseFloat(td.textContent.replace('−','-'))));
  assert(lgr.length===6&&lgr.every(r=>r.length===6&&r.every(isFinite)),'Lab round trip: a six-by-six break-even grid');
  assert(lgr.every(r=>r.every((v,j)=>j===0||v<=r[j-1]+1e-9))&&lgr.every((r,i)=>i===0||r.every((v,j)=>v<=lgr[i-1][j]+1e-9)),'Lab round trip: the break-even falls with a larger lot and a longer hold');
  assert(!!q('#labRtGrid td.cur'),'Lab round trip: the grid marks the case on screen ($10m, ten years)');
  const scr=q('#labRtScRead'),liked=qa('#labRtSc circle.sd:not(.unlike)').length;assert(!!scr&&qa('#labRtSc circle.sd').length===+scr.dataset.all&&+scr.dataset.all===lrows.length&&(liked===+scr.dataset.n||(liked<3&&+scr.dataset.n===+scr.dataset.all))&&qa('#labRtSc circle.sd.loss').length===+scr.dataset.loss&&(scr.dataset.beat===''||qa('#labRtSc circle.sd.beat').length===+scr.dataset.beat)&&/The middle outcome is/.test(scr.textContent),'Lab round trip: the same round trip at each period’s rate, a dot per period, the like-for-like ones counted as read ('+(scr?scr.dataset.n+' like for like, '+scr.dataset.loss+' lose, '+scr.dataset.beat+' beat':'none')+')');
  log.push(`lab grid (Sotheby’s New York): $1m two years ${lgr[1][1]}%, $10m ten years ${lgr[4][3]}%, $100m twenty years ${lgr[5][5]}%`);
  const lst=q('#lab-structure').textContent;assert(/The top five artists’ share/.test(lst)&&/Value by artist, the eight largest of \d+ named artists/.test(lst)&&/Value by decade of sale/.test(lst)&&/with no named artist/.test(lst)&&!/da Vinci \d/.test(lst),'Lab structure: concentration across named artists and value by decade');
  const t5c=qa('#lab-structure .lab-card').find(c=>/top five artists/.test(c.textContent));const t5v=t5c?parseInt(t5c.querySelector('.v').textContent,10):NaN,t5s=t5c?[...t5c.querySelector('.d').textContent.matchAll(/(\d+)%/g)].reduce((a,m)=>a+ +m[1],0):NaN;
  assert(isFinite(t5v)&&t5s===t5v,'Lab structure: the five listed shares add up to the headline ('+t5s+' of '+t5v+')');
  const lsec=qa('#labCf tbody tr.sec'),lsub=qa('#labCf tbody tr.sub'),ltot=q('#labCf tfoot tr'),lsum=(rows,k)=>rows.reduce((a,r)=>a+ +r.dataset[k],0);
  assert(lsec.length>0&&!!ltot&&['n','v','s','u'].every(k=>lsum(lsec,k)===+ltot.dataset[k]&&lsum(lsub,k)===+ltot.dataset[k]),'Lab confidence: the totals equal the sum of the sections and of the collections');
  assert(+ltot.dataset.n===+ltot.dataset.v + +ltot.dataset.s + +ltot.dataset.u&&+ltot.dataset.n>=G('VITALS.length+SYMPTOMS.length+LONGVIEW.length+HUBS.length+SEGMENTS.length+INSTITUTIONS.length+REGIMES.length+DISPATCHES.length+ATLAS.length+JOURNEYS.length+RECORDS2.length'),'Lab confidence: every flag is V, S or U and every flagged list is counted');
  w.__clip='';q('#lab-confidence .lab-cfacts .copy').click();assert(/flagged figures/.test(w.__clip),'Lab confidence: copy the count');
  /* the provenance instrument: the arithmetic adds up, the table and its two lists work, and the reading of chosen histories holds */
  const LP=w.__S.labpRead(),lpN=G('NGA.length');
  assert(LP.rows.length===lpN&&qa('#lab-provenance .lab-fg').length===6&&(q('#lab-provenance .lab-fg .v')||{}).textContent===lpN.toLocaleString('en-GB'),'Lab provenance: six figures, every Ledger record read ('+lpN+')');
  assert(LP.accounted.length+LP.partly.length+LP.quiet.length===LP.thru.length&&LP.held+LP.dated+LP.family===LP.accounted.length&&LP.open.length===LP.partly.length+LP.quiet.length,'Lab provenance: accounted + partly + quiet = through the period, and the accounted split adds up');
  assert(LP.countries.reduce((s,c)=>s+c.n,0)===LP.thru.length&&LP.countries.every(c=>c.n===c.accounted+c.partly+c.quiet),'Lab provenance: the country table covers every history through the period');
  const lpS=id=>{const r=LP.rows.find(x=>x.n.id===id);return r?(r.custody?'custody':r.through?r.status:'outside'):'missing';};
  [['45872','accounted','a buyer at a dated sale held it throughout (Havemeyer sale 1930, Chester Dale)'],['46524','accounted','every change in the period dated (Sutton sale 1933, Cummings, Dale 1935)'],['34047','accounted','a family descent with dated deaths (Dexter)'],['231563','accounted','an owner who held it "to 1967" (Cürlis)'],
   ['46090','partly','a break after 1929 (Rothschild, then Rosenberg by 1934)'],['52178','partly','an owner documented "until at least 1933" (Bernheim de Villers)'],['53128','partly','a museum until 1937, then a dealer (Folkwang, Buchholz)'],
   ['45886','quiet','no date in the period (Lederer, then the Lederer family)'],['52199','quiet','a full stop between owners (Van Riel. Bruno Stahl)'],['166428','custody','held by the Corcoran throughout'],
   ['52453','custody','a hospital from 1908 to 1971 (Bethesda Hospital)'],['41606','partly','a dealer’s bare range “1940-1949” after an owner who died in 1939'],['47179','accounted','“Mrs. Philip Hill” after Philip Hill: a passage within the family'],
   ['1229','accounted','the Widener formula: inheritance from the estate, gift 1942'],['61375','quiet','“probably … until c. 1948” is a hedge, then a break'],['72012','accounted','“by whom bequeathed” after Joyant’s death in 1930'],['70179','accounted','made 1930, kept by the artist until an exchange in 1955'],['175338','accounted','from one of the artist’s sisters to the other']]
    .forEach(([id,want,why])=>assert(lpS(id)===want,`Lab provenance: #${id} reads as ${want}: ${why} (got ${lpS(id)})`));
  const lpRows=()=>qa('#labpRows tr[data-labp]');assert(lpRows().length===Math.min(20,LP.quiet.length),'Lab provenance: the quiet list shows twenty');
  q('#lab-provenance [data-labpf="partly"]').click();assert(lpRows().length===Math.min(20,LP.partly.length)&&q('#lab-provenance [data-labpf="partly"]').getAttribute('aria-pressed')==='true','Lab provenance: the partly list replaces it');
  const frN=LP.open.filter(r=>r.place&&r.place.country==='France').length;q('#lab-provenance [data-labpc="France"]').click();
  assert(lpRows().length===Math.min(60,frN)&&q('#lab-provenance [data-labpf="open"]').getAttribute('aria-pressed')==='true'&&q('#labpCountry').value==='France','Lab provenance: a country row lists that country’s open histories ('+frN+' in France)');
  const degN=LP.open.filter(r=>r.n.a==='Edgar Degas'&&r.place&&r.place.country==='France').length;const asel=q('#labpArtist');asel.value='Edgar Degas';asel.dispatchEvent(new w.Event('change'));assert(lpRows().length===degN,'Lab provenance: the artist filter narrows within the country');
  asel.value='all';asel.dispatchEvent(new w.Event('change'));const csel=q('#labpCountry');csel.value='all';csel.dispatchEvent(new w.Event('change'));
  assert(LP.dealers.length>=8&&LP.dealers.every(d=>d.open<=d.n&&d.n<=LP.thru.length),'Lab provenance: the dealers and houses table counts within the scope');
  const dIdx=LP.dealers.findIndex(d=>/Wildenstein/.test(d.name)),dW=LP.dealers[dIdx];q(`#lab-provenance [data-labpd="${dIdx}"]`).click();
  assert(q('#labpDealer').value===String(dIdx)&&lpRows().length===Math.min(60,dW.open)&&lpRows().every(tr=>dW.has(LP.rows.find(r=>r.n.id===tr.dataset.labp).main)),'Lab provenance: a name row lists the open histories that name it ('+dW.open+')');
  const dsel=q('#labpDealer');dsel.value='all';dsel.dispatchEvent(new w.Event('change'));q('#lab-provenance [data-labpf="quiet"]').click();
  const a0=LP.artists[0];asel.value=a0[0];asel.dispatchEvent(new w.Event('change'));
  assert(q('#lab-provenance [data-labpf="open"]').getAttribute('aria-pressed')==='true'&&lpRows().length===Math.min(60,a0[1]),'Lab provenance: choosing an artist lists both kinds, as many as its option counts ('+a0[0]+' · '+a0[1]+')');
  q(`#lab-provenance [data-labpd="${dIdx}"]`).click();assert(q('#labpArtist').value==='all'&&q('#labpCountry').value==='all'&&lpRows().length===Math.min(60,dW.open),'Lab provenance: a name row clears the other filters, so the list is the row’s count');
  dsel.value='all';dsel.dispatchEvent(new w.Event('change'));q('#lab-provenance [data-labpf="quiet"]').click();
  w.__clip='';q('#labpCsv').click();assert(/"Dealers and houses named"/.test(w.__clip.split('\r\n')[0])&&w.__clip.startsWith('"Status","NGA id","Artist"')&&w.__clip.trim().split('\r\n').length===LP.open.length+1,'Lab provenance: CSV of every open history');
  lpRows()[0].click();assert(q('#drawer').classList.contains('on')&&/nga\.gov/.test(q('#dBody').innerHTML),'Lab provenance: a row opens the full history');q('#dClose').click();
  /* the reading reaches the Ledger: a filter whose counts match the Lab, a chip per record, and a note in the drawer that leads back */
  q('#nav button[data-v="ledger"]').click();q('#lclear').click();const lpv=(v)=>{const s2=q('#lprov');s2.value=v;s2.dispatchEvent(new w.Event('change'));return parseInt(q('#lres h2').textContent,10);};
  assert(lpv('open')===LP.open.length&&lpv('quiet')===LP.quiet.length&&lpv('accounted')===LP.accounted.length&&lpv('outside')===LP.rows.length-LP.thru.length,'Ledger: the 1933–45 filter counts match the Lab');
  lpv('quiet');assert(qa('#lres .prov').every(r=>!!r.querySelector('.tag.lp-quiet')),'Ledger: every quiet record carries its chip');lpv('all');q('#lclear').click();
  /* one dealer matcher for the Ledger, the artist pages and the Lab: whole words, other spellings, look-alike names struck out */
  const DM=w.__S.dealerMatch,DL=G('DEALERS'),dOf=re=>DL.find(d=>re.test(d[0]));
  assert(!DM(dOf(/^Christie/))('acquired 1960 by Mrs. and Mrs. Lansdell K. Christie for the Corcoran')&&DM(dOf(/^Christie/))('(sale, Christie, Manson & Woods, London, 1913)'),'dealers: Christie’s, not the collector Lansdell K. Christie');
  assert(!DM(dOf(/Seligmann/))('(Arnold Seligmann & Co., Paris)')&&DM(dOf(/Seligmann/))('sold 1937 to (Jacques Seligmann and Co., Paris and New York)'),'dealers: Jacques Seligmann, not Arnold Seligmann');
  assert(DM(dOf(/Petit/))('(Chapuis sale, Galerie George Petit, Paris)')&&DM(dOf(/Rosenberg/))('sold 1937 to (P. Rosenberg, Paris)')&&DM(dOf(/Bernheim/))('(Paul Guillaume and Bernheim Jeune, Paris)'),'dealers: other spellings of Petit, Rosenberg and Bernheim-Jeune');
  assert(!DM(dOf(/Valentin/))('(Valentine Gallery, New York)')&&DM(dOf(/Valentin/))('(Buchholz Gallery, New York [later Curt Valentin Gallery])')&&!DM(dOf(/Valentin/))('(Buchholz Gallery, Berlin)')&&!DM(dOf(/^Parke/))('(her sale, Sotheby Parke Bernet Inc., New York)')&&!DM(dOf(/Hirschl/))('provided by Eric Hirschler, Assistant Curator'),'dealers: whole words; Curt Valentin’s Buchholz Gallery in New York, not Karl Buchholz’s in Berlin; Sotheby Parke Bernet is Sotheby’s');
  q('#lclear').click();q(`#ldeal .dealer[data-k="${dW.k}"]`).click();const dAll=parseInt(q('#lres h2').textContent,10);
  assert(dAll>=dW.n&&lpv('open')===dW.open&&/naming /.test(q('#lres h2').textContent),'Ledger: a dealer with the open filter lists what the Lab counts for it ('+dW.name+': '+dW.open+' open of '+dW.n+' in scope)');lpv('all');q('#lclear').click();
  /* the hands instrument: the holdings add up, the holder is read the way the Gallery writes it, the flows add up */
  const LH=w.__S.labhRead(),HB=w.__S.labhHolder,ent=t=>({t,raw:t,sale:/\bsales?\b/i.test(t),nga:/\bNGA\b/.test(t)});
  assert(LH.H.length>1000&&LH.own.length+LH.dea.length+LH.inst+LH.family===LH.H.length&&LH.ends.reduce((s2,e)=>s2+e[1],0)===LH.own.length&&LH.eras.reduce((s2,e)=>s2+e.n,0)===LH.own.length,'Lab hands: collectors, dealers, institutions and families add up to the holdings, and the endings and the eras to the collectors ('+LH.H.length+')');
  assert(LH.flows.reduce((s2,f)=>s2+f.n,0)===LH.supply.length&&LH.ownMed>LH.deaMed&&+q('#labhOwn').dataset.v===LH.ownMed&&qa('#labhEra tbody tr').length===5&&qa('#labhFlow path.hl').length>=8,'Lab hands: the flows add up, a collector holds longer than a dealer, five eras, the flow drawn');
  [['purchased by (Hector Brame, Paris) for Mr. Paul Mellon, Upperville, Virginia','owner'],['(Galérie St. Etienne, New York), possibly by 1959','dealer'],['sold 1937 to (Jacques Seligmann and Co., Paris and New York)','dealer'],['sold 21 May 1929 through (Etienne Bignou, Paris) to Chester Dale, New York','owner'],['from 1931 with (Paul Rosenberg & Co., London, New York and Paris)','dealer'],['sold 1821 to the Königliche Museen (later Kaiser-Friedrich Museum), Berlin','institution'],['by inheritance to his son, Joachim Ernst, Duke of Anhalt','owner'],['(his sales, Christie’s, London, 17 July 1819, no. 58)','sale'],['gift 1992 to NGA.','gallery']]
    .forEach(([t,k])=>{const got=HB(ent(t)).kind;assert(got===k,`Lab hands: “${t.slice(0,48)}…” is read as ${k} (got ${got})`);});
  w.__clip='';q('#labhCsv').click();assert(w.__clip.startsWith('"Holder","Acquired (year)","Years held"')&&w.__clip.trim().split('\r\n').length===LH.H.length+1,'Lab hands: CSV of every holding');
  w.location.hash='#artist-claude-monet';w.dispatchEvent(new w.Event('hashchange'));const adl=q('#v-detail [data-ldealer]');
  if(adl){const want=+adl.querySelector('.c').textContent;adl.click();assert(q('#v-ledger').classList.contains('on')&&parseInt(q('#lres h2').textContent,10)===want&&q('#lartist').value==='Claude Monet'&&q('#lprov').value==='all','artist page: a dealer opens the Ledger on that dealer and the artist, at the same count ('+want+')');q('#lclear').click();}
  else assert(false,'artist page: Claude Monet’s histories name dealers');
  const lqi=q('#lq');lqi.value='Morning Haze';lqi.dispatchEvent(new w.Event('input'));q('#lres .prov[data-id="45872"] [data-open]').click();
  assert(/Accounted for: one owner held it throughout/.test(q('#dBody').textContent),'drawer: the reading of Morning Haze (bought at the 1930 Havemeyer sale, held to 1958)');
  q('#dBody [data-labhash]').click();w.dispatchEvent(new w.Event('hashchange'));assert(!q('#drawer').classList.contains('on')&&q('#v-lab').classList.contains('on'),'drawer: “How it is read” closes the drawer and opens the Lab');
  q('#labRtFlow').click();assert(q('#v-undertow').classList.contains('on')&&(qa('#fkpi .kpi .v')[0]||{}).textContent===(q('#labRtEntry .v')||{}).textContent,'Lab round trip: the entry opens in Follow the money at the same buyer total');
  /* the round trip reads Follow the money's shipping and imported box: changed there, the Lab shows it on return */
  const fs2=q('#fship');fs2.value='400000';fs2.dispatchEvent(new w.Event('input'));const fi=q('#fimported');fi.checked=true;fi.dispatchEvent(new w.Event('input'));const hm=w.__S.FLOW.hammer;
  q('#nav button[data-v="lab"]').click();const want=w.__S.flowModel(Object.assign({},w.__S.FLOW,{hammer:+q('#labRtH').value*1e6,house:q('#labRtHouse').value,venue:q('#labRtVenue').value,dest:q('#labRtDest').value,living:q('#labRtLiving').checked})).buyer;
  assert(Math.abs(+q('#labRtEntry').dataset.v-want)<=1&&/\$400,000/.test(q('#labRtNote').textContent)&&/ticked/.test(q('#labRtNote').textContent),'Lab round trip: Follow the money’s shipping and imported box reach the Lab on return');
  assert(hm===w.__S.FLOW.hammer,'Follow the money: changing another control leaves the hammer as it was');
  fs2.value='30000';fs2.dispatchEvent(new w.Event('input'));fi.checked=false;fi.dispatchEvent(new w.Event('input'));
  w.location.hash='#lab-roundtrip';w.dispatchEvent(new w.Event('hashchange'));assert(q('#v-lab').classList.contains('on'),'#lab-roundtrip opens the Lab');
  log.push(`lab: ${lrows.length} holding periods, median ${lmed.toFixed(1)}% a year (90% interval ${(+lci.dataset.lo).toFixed(1)}–${(+lci.dataset.hi).toFixed(1)}%); break-even ${(lbe*100).toFixed(2)}% a year ($10m, Sotheby’s New York, ten years); ${ltot.dataset.n} flags, ${ltot.dataset.v} verified; provenance ${LP.thru.length} in scope for 1933–45: ${LP.accounted.length} accounted, ${LP.partly.length} partly, ${LP.quiet.length} quiet`);
  /* v21: the limits register, its links and its address */
  {q('#nav button[data-v="lab"]').click();const L=G('LIMITS'),A=G('Object.keys(LIMIT_AREAS)');assert(!!q('#lab-limits')&&qa('#lab-limits li').length===L.length&&qa('#lab-limits .lab-lima').length===A.filter(a=>L.some(l=>l.area===a)).length,'the limits register lists every limit, grouped by area');
   assert(qa('#lab-limits [data-go],#lab-limits [data-under],#lab-limits [data-labjump]').length>=L.filter(l=>l.at).length,'each limit links the place it qualifies');
   q('#nav button[data-v="undertow"]').click();assert(!!q('#fledger a.limlink[href="#lab-limits-money"]'),'Follow the money links its limits');
   w.location.hash='#lab-limits-money';w.dispatchEvent(new w.Event('hashchange'));assert(q('#v-lab').classList.contains('on')&&w.location.hash==='#lab-limits-money','#lab-limits-<area> opens the Lab and keeps its address');}
  /* v21: search marks the raw text, accents folded; no entity is broken */
  {q('#nav button[data-v="ledger"]').click();const lq=q('#lq');lq.value='a';lq.dispatchEvent(new w.Event('input'));assert(!/&amp;|&quot;|&#39;/.test(q('#lres').textContent),'ledger search: no entity shows as text');
   lq.value='cezanne';lq.dispatchEvent(new w.Event('input'));assert(qa('#lres mark').some(m=>/Cézanne/i.test(m.textContent)),'ledger search: “cezanne” marks Cézanne');lq.value='';lq.dispatchEvent(new w.Event('input'));}
  /* v21: the composer greets a person or [name], never the first word of a description */
  {q('#nav button[data-v="desk"]').click();const sel=q('#cOrg');const bad=[];for(const o of [...sel.options]){sel.value=o.value;sel.dispatchEvent(new w.Event('change'));q('#cGen').click();const sal=(q('#cDraft').dataset.text.match(/\nDear ([^\n]*),/)||[])[1]||'';const txt=q('#cDraft').dataset.text,asWork=(txt.match(/what your work as ([^\n]*?) involves/)||[])[1]||'';if(/^(Privately|Owned|Family|Partners|Presidents|Sold|Taken|MCH)\b/.test(sal)||/[()]/.test(asWork)||/\(since/.test(txt)||/the news that it (?:built|pioneered)/.test(txt))bad.push(o.textContent+': '+sal+' / '+asWork);}
   assert(!bad.length,'composer: every salutation is a name or [name], every role without its brackets, no history called news'+(bad.length?' — '+bad.slice(0,3).join('; '):''));
   q('#cPerson').value='Hans-Kristian Hoejsgaard';q('#cGen').click();assert(/\nDear Hans-Kristian,/.test(q('#cDraft').dataset.text),'composer: a hyphenated first name is a name');}
  /* v21: display names, collectors, the reader's date */
  {const S=w.__S;assert(S.dispName('Vincent van Gogh')==='van Gogh'&&S.dispName('Rembrandt van Rijn')==='Rembrandt'&&S.dispName('Qi Baishi')==='Qi Baishi'&&S.dispName('Patek Philippe')==='Patek Philippe'&&S.dispName('Leonardo da Vinci')==='Leonardo'&&S.dispName('Beeple (Mike Winkelmann)')==='Beeple','display names: van Gogh, Rembrandt, Qi Baishi, an object whole');
   w.location.hash='#collector-lauder';w.dispatchEvent(new w.Event('hashchange'));const ll=qa('#v-detail .lots .lot').length;w.location.hash='#collector-rlauder';w.dispatchEvent(new w.Event('hashchange'));const rl=qa('#v-detail .lots .lot').length;assert(ll>=3&&rl===0,'collectors: Leonard Lauder’s lots are his, not Ronald’s');
   const lotsOf=id=>{w.location.hash='#collector-'+id;w.dispatchEvent(new w.Event('hashchange'));return qa('#v-detail .lots .lot .t').map(e=>e.textContent);};
   const liu=lotsOf('liu'),sun=lotsOf('sun');assert(!liu.some(t=>/Yellow Stripe|La Lecture/.test(t))&&!sun.some(t=>/Everydays/.test(t)),'collectors: whole words only (Wei is not Weis, Sun not Sundaresan)');
   {const t=new w.Date(),loc=new w.Date(t.getTime()-t.getTimezoneOffset()*6e4).toISOString().slice(0,10);assert(/^\d{4}-\d\d-\d\d$/.test(S.NOW)&&S.NOW===(loc>S.TODAY?loc:S.TODAY),'upcoming is judged from the reader’s local date, never before the terminal’s');}
   w.location.hash='#lot-rothko-no-15-two-greens-and-red-stripe';w.dispatchEvent(new w.Event('hashchange'));assert(/No\. 15/.test((q('#v-detail h1')||{textContent:''}).textContent),'the Rothko record is in the hammer list');}
  /* no source comment leaks into the page: a comment written inside a template literal renders as text */
  {const leaks=[];for(const b of qa('#nav button[data-v]')){if(b.dataset.v==='reel')continue;b.click();const v=q('#v-'+b.dataset.v);const t=v?v.textContent:'';const m=t.match(/\/\*|\*\//);if(m)leaks.push(b.dataset.v+': …'+t.slice(Math.max(0,m.index-40),m.index+40)+'…');}
   w.__REEL.open(0);const rt=q('#reelStage').textContent;w.__REEL.close();if(/\/\*|\*\//.test(rt))leaks.push('reel');
   assert(!leaks.length,'no code comment shows as text in any view or the Reel'+(leaks.length?' — '+leaks.slice(0,2).join(' | '):''));}
  /* v21: the provenance headline reads the AAM's full scope */
  {q('#nav button[data-v="lab"]').click();const R=w.__S.labpRead();const pc=q('#labpCovPct');assert(R.covered.length>0&&R.covered.every(r=>r.through&&r.state!=='held')&&pc&&Math.abs(+pc.dataset.v-R.caccounted.length/R.covered.length*100)<1e-3,'provenance: the headline share is the full scope’s');
   const sc=q('#labpScope');sc.value='date';sc.dispatchEvent(new w.Event('change'));assert(+q('[data-labpn="all"]').textContent===R.open.length,'provenance: the scope select switches the counts');sc.value='full';sc.dispatchEvent(new w.Event('change'));}
  console.log(log.join('\n'));}catch(e){errors.push('TEST EXCEPTION: '+e.stack);}console.log('errors:',errors.length?errors.join('\n'):'none');process.exit(errors.length?1:0);}
wait();
