/* ---------- LAB · provenance: how the published histories account for the years 1933 to 1945 ----------
   labProvenance(el) fills #lab-provenance (a placeholder rendered by renderLab in lab.js) from the Ledger's NGA records
   (data/nga_subset.json, injected as NGA; tools/nga_subset.py never cuts the main text, only the notes). The reading
   follows the Gallery's own conventions for writing a history:
   · the main text is everything before the notes, which start at the last "[1]" after the main text's closing full stop;
   · entries are separated by semicolons (a direct transfer) or by a full stop between sentences (a break: the link is
     not known); a semicolon inside parentheses and a full stop after an abbreviation or an initial separate nothing;
   · in a bracketed lifespan ("[1881-1959]", "[d. 1938]") the year of death is kept and the year of birth dropped; any
     other bracketed text is an annotation and is set aside;
   · a change of hands is dated by the entry's own year; or, straight after a dated sale, by the sale; or, for an
     inheritance straight after an owner who died, by the death; or, after an owner who held it "until" a year, by that
     year. "By 1927", "in 1908" after a name, "as of 1933" and "until at least 1935" only bound it. The Gallery's own
     entry is dated by the accession number when it gives no year.
   A history is IN SCOPE when the work was made before 1946 and reached the Gallery after 1932 (the American Alliance of
   Museums' scope for this research; `n.y` is the year made), unless an institution held it from before 1933 until the
   Gallery took it (continuous custody, a hospital or a church included). The chain is walked forward from the owner of
   1933 (the last entry acquired, or known to be held, before 1933; failing that the first holder named, for a work the
   text does not date earlier or made in the period): it is ACCOUNTED FOR when it stays unbroken up to the first change
   of hands after 1945, or to the Gallery, and every change in between is dated or passes within a family (an
   inheritance, a gift to a relative, "Mrs. <the owner's name>", the heir at the end of a descent); with no change at
   all, one owner held it throughout. A passage to the owner's own foundation or estate is not a change of hands; an
   owner documented only "until at least" (or "probably until") a year leaves what follows open. A footnote marker with
   no delimiter before a new owner ("Paris)[1] Senator …") is read as a break. Otherwise the history is PARTLY ACCOUNTED
   FOR when its main text names any year from 1933 to 1945, and QUIET when it names none. Where the work starts the
   period is the place named for the owner of 1933 (or the first owner), or for up to three entries before it that lead
   to it directly. Research-term families are counted over the whole text, notes included. The reading is
   for triage: an open stretch is where research would start, not a finding. Top-level names are prefixed labp/LABP_. */
const LABP_FROM=1933,LABP_TO=1945;
const LABP_TERMS=[
  ['Confiscation, seizure',/confiscat|\bseized\b|\bseizure\b/i],
  ['Restitution',/restitut|returned to (?:the )?(?:heirs|owner|family)/i],
  ['Forced sale, duress',/forced sale|under duress/i],
  ['Allied collecting point',/collecting point/i],
  ['ERR (Einsatzstab)',/Einsatzstab|\(ERR\)/i]
];
/* a full stop after one of these (or after a single capital, an initial) does not end a sentence */
const LABP_ABBR=new Set('Mme Mmes Mlle Mlles MM Mr Mrs Ms Messrs Dr Drs St Ste Sts Mt Ft Fr Rev Revd Msgr Mgr Hon Capt Col Gen Maj Lt Adm Sgt Gov Sen Pres Prof Esq Bt bt Bart Jr Sr Inc Ltd Co Cie Corp Bros Thos Wm Chas Geo Jas Jos Robt Edw Benj Saml Cte Vte no nos vol pp fig cat inv ed eds op ca c ibid cf viz Ave Rd Pl Sq'.split(' '));
/* where the owner of 1933 was based: the first of these named after a comma in that owner's entry (outside a dealer's
   parentheses when the entry names a place of its own) */
const LABP_PLACES=[['New York','United States'],['Boston','United States'],['Philadelphia','United States'],['Chicago','United States'],['Washington','United States'],['Baltimore','United States'],['Pittsburgh','United States'],['Detroit','United States'],['Cleveland','United States'],['St. Louis','United States'],['Saint Louis','United States'],['St. Paul','United States'],['San Francisco','United States'],['Los Angeles','United States'],['Cincinnati','United States'],['Minneapolis','United States'],['Providence','United States'],['Hartford','United States'],['Buffalo','United States'],['Newport','United States'],['Long Island','United States'],['Elkins Park','United States'],['Jenkintown','United States'],['Upperville','United States'],['Santa Barbara','United States'],['Pasadena','United States'],['Beverly Hills','United States'],['Kansas City','United States'],['Fort Worth','United States'],
  ['Massachusetts','United States'],['Pennsylvania','United States'],['Virginia','United States'],['Connecticut','United States'],['New Jersey','United States'],['Rhode Island','United States'],['Maryland','United States'],['Delaware','United States'],['Ohio','United States'],['Michigan','United States'],['Illinois','United States'],['Minnesota','United States'],['Missouri','United States'],['California','United States'],['Texas','United States'],['Florida','United States'],['Maine','United States'],['New Hampshire','United States'],['Vermont','United States'],['Wisconsin','United States'],['Kentucky','United States'],['D.C.','United States'],
  ['Montreal','Canada'],['Toronto','Canada'],['Ontario','Canada'],['Quebec','Canada'],
  ['Paris','France'],['Lyon','France'],['Marseille','France'],['Nice','France'],['Bordeaux','France'],['Le Havre','France'],['Rouen','France'],['Lille','France'],['Reims','France'],['Nantes','France'],['Toulouse','France'],
  ['London','United Kingdom'],['Glasgow','United Kingdom'],['Edinburgh','United Kingdom'],['Manchester','United Kingdom'],['Liverpool','United Kingdom'],['England','United Kingdom'],['Scotland','United Kingdom'],['Wales','United Kingdom'],
  ['Berlin','Germany'],['Munich','Germany'],['Frankfurt am Main','Germany'],['Frankfurt','Germany'],['Hamburg','Germany'],['Dresden','Germany'],['Cologne','Germany'],['Düsseldorf','Germany'],['Leipzig','Germany'],['Stuttgart','Germany'],['Breslau','Germany'],['Mannheim','Germany'],['Wiesbaden','Germany'],['Bremen','Germany'],['Weimar','Germany'],['Hanover','Germany'],['Bochum','Germany'],['Essen','Germany'],['Elberfeld','Germany'],['Krefeld','Germany'],['Hagen','Germany'],['Kassel','Germany'],['Darmstadt','Germany'],['Karlsruhe','Germany'],['Nuremberg','Germany'],['Augsburg','Germany'],['Königsberg','Germany'],['Potsdam','Germany'],['Aachen','Germany'],['Brieg','Germany'],['Altenburg','Germany'],['Germany','Germany'],
  ['Vienna','Austria'],['Graz','Austria'],['Salzburg','Austria'],['Linz','Austria'],['Innsbruck','Austria'],['Austria','Austria'],
  ['Amsterdam','Netherlands'],['The Hague','Netherlands'],['Rotterdam','Netherlands'],['Haarlem','Netherlands'],['Utrecht','Netherlands'],['Laren','Netherlands'],['Delft','Netherlands'],['Netherlands','Netherlands'],['Holland','Netherlands'],
  ['Brussels','Belgium'],['Antwerp','Belgium'],['Ghent','Belgium'],['Liège','Belgium'],['Bruges','Belgium'],['Belgium','Belgium'],['Prague','Czechoslovakia'],['Brno','Czechoslovakia'],['Czechoslovakia','Czechoslovakia'],['Budapest','Hungary'],['Hungary','Hungary'],['Warsaw','Poland'],['Kraków','Poland'],['Cracow','Poland'],['Poland','Poland'],
  ['Rome','Italy'],['Florence','Italy'],['Milan','Italy'],['Venice','Italy'],['Naples','Italy'],['Genoa','Italy'],['Turin','Italy'],['Italy','Italy'],
  ['Zurich','Switzerland'],['Zürich','Switzerland'],['Basel','Switzerland'],['Geneva','Switzerland'],['Lucerne','Switzerland'],['Lugano','Switzerland'],['Bern','Switzerland'],['Lausanne','Switzerland'],['Winterthur','Switzerland'],['Switzerland','Switzerland'],
  ['Madrid','Spain'],['Barcelona','Spain'],['Spain','Spain'],['Lisbon','Portugal'],['Portugal','Portugal'],['Stockholm','Sweden'],['Gothenburg','Sweden'],['Sweden','Sweden'],['Copenhagen','Denmark'],['Denmark','Denmark'],['Oslo','Norway'],['Norway','Norway'],
  ['Saint Petersburg','Soviet Union'],['St. Petersburg','Soviet Union'],['Leningrad','Soviet Union'],['Moscow','Soviet Union'],['Buenos Aires','Argentina'],['Argentina','Argentina'],['Tokyo','Japan'],['Japan','Japan']]
  .map(([c,k])=>[c,k,new RegExp(',\\s*(?:later\\s+|near\\s+)?'+c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=\\s*(?:[,;.)\\]\\-(]|$|and\\b|or\\b|later\\b))')]);
const LABP_EUROPE=new Set(['France','Germany','Austria','Netherlands','Belgium','Czechoslovakia','Hungary','Poland','Italy','Switzerland','Spain','Portugal','Sweden','Denmark','Norway','Soviet Union']);
let labpCache=null;
/* the main text: everything before the notes (the last "[1]", spaces allowed inside, after the closing full stop) */
function labpMain(p){const all=[...p.matchAll(/\[\s*1\s*\]/g)];const i=all.length?all[all.length-1].index:-1;
  const main=i>0&&/\.$/.test(p.slice(0,i).replace(/(?:\s*\[\s*\d+\s*\])+\s*$/,'').trimEnd())?p.slice(0,i):p;return main.replace(/\s*…\s*$/,'').trim();}
/* entries: split at semicolons and at full stops between sentences, both outside parentheses and brackets */
function labpEntries(main){const out=[];let d=0,s=0,gap=false;
  const cut=(i,brk)=>{const raw=main.slice(s,i).trim();s=i+1;if(raw.replace(/\[\s*\d+\s*\]/g,'').trim()){out.push({raw,gap});gap=brk;}else gap=gap||brk;};
  for(let i=0;i<main.length;i++){const c=main[i];
    if(c==='['&&d===0&&/[)\w]$/.test(main.slice(Math.max(0,i-1),i))&&/^\[\s*\d+\s*\]\s+[A-ZÀ-ÖØ-Þ(]/.test(main.slice(i,i+12))){const r=main.slice(i).match(/^\[\s*\d+\s*\]/)[0];cut(i,true);i+=r.length-1;s=i+1;continue;}   /* "Paris)[1] Senator …": the source lost a delimiter; read it as a break */
    if(c==='('||c==='[')d++;else if((c===')'||c===']')&&d>0)d--;
    else if(d===0&&c===';')cut(i,false);
    else if(d===0&&c==='.'&&/^(?:\s*\[\s*\d+\s*\])*\s+(?:[A-ZÀ-ÖØ-Þ(_"]|private\b)/.test(main.slice(i+1,i+18))){const w=(main.slice(Math.max(0,i-14),i).match(/([A-Za-zÀ-ÿ]+)$/)||[])[1]||'';
      if(!(LABP_ABBR.has(w)||(w.length===1&&w===w.toUpperCase())))cut(i,true);}}
  cut(main.length,false);return out;}
/* one entry: its dates by kind, its deaths, and what kind of entry it is. Bracketed text is an annotation: a lifespan
   that opens or closes the brackets ("[1881-1959]", "[c. 1894-1981]", "[d. 1938]", "[née …, 1863-1958]") gives a year of death;
   everything else in brackets (a marriage, a spouse's dates, "[with 1865.64.28]") is set aside. */
function labpParse(e){const deaths=[];
  const t=e.raw.replace(/\[([^\[\]]*)\]/g,(m,x)=>{let d=x.match(/^\s*(?:c\.\s*)?(\d{3,4})\s*[-–]\s*(?:c\.\s*)?(\d{2,4})\b/)||x.match(/,\s*(?:c\.\s*)?(\d{4})\s*[-–]\s*(?:c\.\s*)?(\d{2,4})\s*$/);
      if(d){const a=d[1],b=d[2];deaths.push(b.length===4?+b:+(a.slice(0,a.length-b.length)+b));}
      else if((d=x.match(/^\s*(?:d\.|died)\s*(?:c\.\s*)?(\d{4})/i)))deaths.push(+d[1]);
      return ' ';});
  const years=[],by=[],until=[],least=[],hedge=[];const RE=/\b(1[5-9]\d\d|20[0-2]\d)\b/g;let m;
  while((m=RE.exec(t))){const y=+m[1],pre=t.slice(Math.max(0,m.index-44),m.index),post=t.slice(m.index+4,m.index+16);
    const rg=post.match(/^\s*[-–]\s*(1[5-9]\d\d|20[0-2]\d)\b/);
    if(rg&&/(?:^|[,)]\s*|\bfrom\s+)$/.test(pre)&&!/\b(?:sold|purchased|acquired|bought|bequeathed|given|gift|exchanged|consigned|inherited)\b[^,;]{0,14}$/i.test(pre)){by.push(y);until.push(+rg[1]);RE.lastIndex=m.index+4+rg[0].length;continue;}   /* "…, 1940-1949": held from 1940 (a bound) until 1949 */
    if(/\b(?:no|nos|inv|lot|cat|fig|pp?)\.?\s*$/i.test(pre)||/^\.\d/.test(post)||/^\s*(?:francs|guilders|marks|pounds|dollars|lire|livres|florins|guineas|gns|Reichsmarks|RM)\b/i.test(post))continue;   /* a lot number, an accession number or a price, not a year */
    if(/\b(?:death|died)\s+(?:in\s+)?(?:c\.\s*)?(?:\d{1,2}\s+)?(?:[A-Z][a-z]+\s+)?$/.test(pre)){deaths.push(y);if(/\buntil\b[^;]*$/.test(pre))until.push(y);continue;}
    /* "by 1927" bounds a change of hands; so do "in 1908" and "as of 1933" after a name, which record possession, not a transfer */
    if(/\b(?:by|before)\s+(?:(?:c\.|ca\.|about|circa|early|late|mid-?|spring|summer|autumn|fall|winter|the end of)\s*)?(?:\d{1,2}\s+)?(?:[A-Z][a-z]+\s+)?$/.test(pre)
      ||(/\b(?:in(?: at least)?|as of)\s+(?:(?:c\.|about|early|late|mid-?|spring|summer|autumn|fall|winter)\s*)?(?:\d{1,2}\s+)?(?:[A-Z][a-z]+\s+)?$/.test(pre)&&!/\b(?:sold|purchased|acquired|bought|bequeathed|given|gift|exchanged|consigned|inherited|transferred|passed|commissioned|painted)\b[^,;]{0,14}\bin\s+(?:\S+\s+){0,2}$/i.test(pre))){by.push(y);continue;}
    const um=pre.match(/\b((?:probably|possibly|presumably|perhaps)\s+)?(?:until|till|to)\s+((?:(?:c\.|about|at least|at|probably|possibly|presumably|perhaps|early|late|mid-?|spring|summer|autumn|fall|winter)\s*){0,2})(?:\d{1,2}\s+)?(?:[A-Z][a-z]+\s+)?$/);
    if(um){(/at least/.test(um[2])?least:(um[1]||/probably|possibly|presumably|perhaps/.test(um[2])||/\b(?:probably|possibly|presumably|perhaps)\b[^,;]*$/.test(t.slice(0,m.index)))?hedge:until).push(y);continue;}   /* "until 1946" ends a holding; "until at least 1935" only shows it lasted that long; "probably until 1946" is a hedge, not an end */
    years.push(y);}
  const lead=t.trim().replace(/^(?:probably|possibly|presumably)\s+/i,'');
  return {raw:e.raw,t,gap:e.gap,years,by,until,least,hedge,deaths,
    nga:/\bNGA\b|National Gallery of Art/.test(t),
    sale:/\bsales?\b|\bauction\b/i.test(t)&&!/\bfor sale\b/i.test(t),
    inherit:/^(?:by (?:gift or )?(?:inherit[ae]nce|descent)|inherit[ae]nce from|by (?:whom )?bequest|(?:by whom )?bequeathed|bequest to\b|inherited|(?:to |passed to )?(?:his|her|their|the (?:artist|sitter|collector)['’]s) (?:(?:first|second|third|fourth|fifth|elder|eldest|younger|youngest|only|late|surviving)\s+)?(?:(?:step-?|great-?)*(?:son|daughter|mother|father|children|grandson|granddaughter|grandchildren|nephew|niece|grand-?nephew|grand-?niece)|widow|wife|husband|brother|sister|heirs?|cousin|family|descendants?))\b/i.test(lead),
    family:/^(?:(?:by )?gift\b[^;]{0,24}?\bto|in trust (?:to|for)) (?:his|her|their|the (?:artist|sitter)['’]s) (?:(?:first|second|third|fourth|fifth|elder|eldest|younger|youngest|only|late|surviving)\s+)?(?:(?:step-?|great-?)*(?:son|daughter|mother|father|children|grandson|granddaughter|grandchildren|nephew|niece|grand-?nephew|grand-?niece)|widow|wife|husband|brother|sister|heirs?|cousin|family|descendants?)\b/i.test(lead),
    descent:/\bby (?:inheritance|descent) (?:through|in) (?:the|his|her|their)\b[^;]*\bfamily\b|\bby descent\b|\bin the family\b/i.test(t),
    estate:/^(?:(?:the )?estate of\b|(?:his|her|their) estate\b)/i.test(lead),
    same:/\bthe same (?:year|day|month)\b/i.test(t),
    ev:[...years,...by,...until,...least,...hedge,...deaths].filter(y=>y>=1500&&y<=2026)};}
/* a foundation or trust that carries a surname of the owner before it */
function labpOwnFoundation(prev,t){if(!/\b(?:Foundation|Trust)\b/.test(t))return false;const stop=/^(?:Foundation|Trust|Collection|Gallery|Galleries|Museum|Society|Institute|Fund|National|American|Association|Company|Brothers|Sons|Estate|Family|Fine|Arts?|The|New|York|Paris|London|Boston|Washington|Baron|Baroness|Count|Countess|Duke|Duchess|Earl|Lord|Lady|Madame|Monsieur|Mrs|Miss|Sir|Inc|Ltd|Dame|Hon)$/;
  const names=s=>new Set((s.match(/\b[A-Z][a-zà-ÿ]{2,}\b/g)||[]).filter(w=>!stop.test(w)));const a=names(prev),b=names(t);return [...b].some(w=>a.has(w));}
/* "Mrs. Philip Hill" straight after "Philip Hill": the owner's wife, a passage within the family */
function labpSpouse(prev,t){const m=String(t).trim().match(/^(?:his widow,?\s*)?Mrs\.?\s+((?:[A-Z][\w.'’-]*\s*){2,5})/);if(!m)return false;const nm=m[1].replace(/\s+/g,' ').trim();return nm.split(' ').length>=2&&String(prev).includes(nm);}
function labpPlace(t){if(!t)return null;const look=s=>{let best=null;LABP_PLACES.forEach(([c,k,re])=>{const m=s.match(re);if(m&&(!best||m.index<best.i))best={i:m.index,c,k};});return best;};
  const p=look(t.replace(/\([^()]*\)/g,' '))||look(t);return p?{city:p.c,country:p.k}:null;}
/* the place for entry k: its own, or (when it names none) that of up to three entries it follows directly, none older than 1870 */
function labpPlaceAt(E,k){for(let j=k;j>=0&&j>=k-3;j--){if(j<k&&E[j].acq&&E[j].acq.y<1870)break;const p=labpPlace(E[j].t);if(p)return p;if(E[j].gap)break;}return null;}
function labpRead(){if(labpCache)return labpCache;
  const INST=/(Gallery of Art|Museum|Institute|Institution|Society|Academy|Athenaeum|University|College|Library|Foundation|Collection of the City|Hospital|Church|Cathedral|Abbey|Convent|Monastery|Seminary|Asylum|Orphanage)\b/;
  const rows=(typeof NGA!=='undefined'&&Array.isArray(NGA)?NGA:[]).map(n=>{const p=String(n.p||'');const acc=parseInt(String(n.acc||''),10)||null;
    const E=labpEntries(labpMain(p)).map(labpParse);
    /* no entry names the Gallery: the Widener formula ("… by gift through power of appointment of Joseph E. Widener") is its entry; otherwise the passage to it is not in the text */
    const lastE=E[E.length-1];if(lastE&&!E.some(e=>e.nga)&&/power of appointment|^(?:by )?(?:gift|bequest)\b|\bby gift\b/i.test(lastE.t.trim()))lastE.nga=true;
    if(!E.some(e=>e.nga))E.push({raw:'',t:'',gap:true,years:[],by:[],until:[],least:[],hedge:[],deaths:[],nga:true,sale:false,inherit:false,family:false,descent:false,estate:false,same:false,ev:[],virtual:true});
    /* when each entry's change of hands happened: x = dated, otherwise only bounded */
    E.forEach((e,j)=>{const q=E[j-1],linked=!!q&&!e.gap;let a=null;
      if(e.nga&&!e.years.length&&acc)a={y:acc,x:true};
      else if(e.years.length)a={y:Math.min(...e.years),x:true};
      else if(linked&&e.same&&q.acq)a={y:q.acq.y,x:q.acq.x};
      else if(linked&&q.sale&&q.years.length)a={y:Math.max(...q.years),x:true};
      else if(linked&&(e.inherit||e.estate)&&q.deaths.length)a={y:Math.max(...q.deaths),x:true};
      else if(linked&&q.until.length)a={y:Math.max(...q.until),x:true};
      else{const b=[...e.by,...e.until,...e.least,...e.hedge,...e.deaths];if(b.length)a={y:Math.min(...b),x:false};}   /* held by then: "by 1927", "until at least 1929", or an owner's death */
      e.acq=a;e.cont=!!q&&!e.years.length&&(e.estate||labpOwnFoundation(q.t,e.t));
      e.kin=linked&&(e.inherit||e.family||labpSpouse(q.t,e.t)||(q.descent&&!e.years.length));});   /* a passage within a family: an inheritance, a gift to a relative, the heir at the end of a descent */
    const ev=E.flatMap(e=>e.ev);const first=ev.length?Math.min(...ev):null;const after=ev.filter(y=>y>LABP_TO);
    /* continuous custody: the last holder before the Gallery is an institution that had the work before the period */
    const ni=E.findIndex(e=>e.nga);const prev=ni>0?E[ni-1]:null;
    const custody=!!prev&&!E[ni].gap&&INST.test(prev.t)&&!!prev.acq&&prev.acq.y<LABP_FROM&&!prev.years.some(y=>y>=LABP_FROM);
    /* the owner of 1933: the last entry acquired, or known to be held, before 1933; then walk forward */
    let k=-1;E.forEach((e,j)=>{if(e.acq&&e.acq.y<LABP_FROM)k=j;});
    const made=parseInt(String(n.y||''),10),madeY=isFinite(made)?made:first;
    if(k<0&&madeY!=null&&madeY<=LABP_TO)k=0;   /* no entry dated before 1933: the first holder named (often the artist) holds it when the period opens, or from the work's making */
    /* a holder documented only "until at least" a year inside the period leaves the rest of it open */
    /* an undated passage within a family keeps the chain whole but is counted apart ("family") */
    let state='open',changes=0,fam=0,openAt=null;const past=h=>h.until.some(y=>y>LABP_TO)||h.least.some(y=>y>LABP_TO);
    const short=(h,y)=>!past(h)&&(h.least.length>0||h.hedge.length>0)&&y>Math.max(...h.least,...h.hedge);   /* documented only "until at least" (or "probably until") a year before this change */
    const done=()=>fam?'family':changes?'dated':'held';
    if(k>=0){if(past(E[k])||E[k].nga)state='held';
      else{let h=E[k];for(let j=k+1;j<E.length;j++){const e=E[j];if(e.cont&&!e.gap)continue;
        if(e.kin&&!(e.acq&&e.acq.x)){fam++;h=e;if(past(h)){state=done();break;}continue;}
        if(e.gap||!e.acq||!e.acq.x||short(h,e.acq.y)){openAt=e;break;}
        if(e.acq.y>LABP_TO||e.nga){state=done();break;}
        changes++;h=e;if(past(h)){state=done();break;}}}}
    const inPeriod=ev.some(y=>y>=LABP_FROM&&y<=LABP_TO);
    const through=madeY!=null&&madeY<=LABP_TO&&acc!=null&&acc>=LABP_FROM&&!custody;   /* the scope museums research: made before 1946, acquired after 1932 */
    const status=state!=='open'?'accounted':inPeriod?'partly':'quiet';
    const owner=k>=0?E[k]:null;const place=owner?labpPlaceAt(E,k):null;
    /* the American Alliance of Museums' full scope adds two tests to the dates: a change of hands between 1932 and 1946 (or one the text
       cannot rule out: an open history), and continental Europe (or a place the text does not name). One owner throughout fails the first */
    const covered=through&&state!=='held'&&(!place||LABP_EUROPE.has(place.country));
    const pre=ev.filter(y=>y<LABP_FROM);
    return {n,E,acc,first,custody,through,covered,status,state,changes,place,main:E.map(e=>e.raw).join('; '),owner:owner?owner.raw:'',openAt:openAt&&!openAt.virtual?openAt.raw:'',
      last:owner&&owner.acq?owner.acq.y:(pre.length?Math.max(...pre):null),next:after.length?Math.min(...after):null,
      terms:LABP_TERMS.map(([,re])=>re.test(p))};});
  const thru=rows.filter(r=>r.through);const by=s=>thru.filter(r=>r.status===s);const cov=thru.filter(r=>r.covered),cby=s=>cov.filter(r=>r.status===s);
  const acc=by('accounted'),partly=by('partly'),quiet=by('quiet'),open=thru.filter(r=>r.status!=='accounted');
  const byArtist={};open.forEach(r=>{byArtist[r.n.a]=(byArtist[r.n.a]||0)+1;});
  const byCountry={};thru.forEach(r=>{const c=r.place?r.place.country:'Not stated';const o=byCountry[c]||(byCountry[c]={c,n:0,accounted:0,partly:0,quiet:0});o.n++;o[r.status]++;});
  /* the Ledger's dealer lineage (DEALERS: name, mentions, note, key, {alt, not}) matched in each history in scope by the matcher the Ledger
     and the artist pages use (dealerMatch in app.js: whole words, other spellings, look-alike names struck out); k is the DEALERS index */
  const dealers=(typeof DEALERS!=='undefined'&&Array.isArray(DEALERS)?DEALERS:[]).map((d,k)=>{if(!String(d[3]||''))return null;const has=dealerMatch(d);const hit=thru.filter(r=>has(r.main));
    return {name:d[0],key:d[3],k,has,n:hit.length,open:hit.filter(r=>r.status!=='accounted').length,quiet:hit.filter(r=>r.status==='quiet').length};}).filter(x=>x&&x.n>=5).sort((a,b)=>b.n-a.n||a.name.localeCompare(b.name));
  labpCache={rows,thru,accounted:acc,partly,quiet,open,dealers,custody:rows.filter(r=>r.custody).length,
    covered:cov,caccounted:cby('accounted'),cpartly:cby('partly'),cquiet:cby('quiet'),copen:cov.filter(r=>r.status!=='accounted'),
    us:thru.filter(r=>r.place&&r.place.country==='United States').length,
    /* why a history in the date criteria falls outside the full scope, as two groups that do not overlap: one owner throughout, then (of the rest) a start outside continental Europe */
    xheld:thru.filter(r=>r.state==='held').length,xout:(()=>{const o={};thru.filter(r=>r.state!=='held'&&r.place&&!LABP_EUROPE.has(r.place.country)).forEach(r=>{o[r.place.country]=(o[r.place.country]||0)+1;});return Object.entries(o).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));})(),
    held:acc.filter(r=>r.state==='held').length,dated:acc.filter(r=>r.state==='dated').length,family:acc.filter(r=>r.state==='family').length,
    europe:open.filter(r=>r.place&&LABP_EUROPE.has(r.place.country)).length,
    countries:Object.values(byCountry).sort((a,b)=>b.n-a.n||a.c.localeCompare(b.c)),
    terms:LABP_TERMS.map(([l],i)=>[l,thru.filter(r=>r.terms[i]).length]),termRecs:thru.filter(r=>r.terms.some(Boolean)).length,
    artists:Object.entries(byArtist).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))};
  return labpCache;}
const LABP_STATUS={accounted:'Accounted for',partly:'Partly accounted for',quiet:'Quiet'};
/* one record's standing, for the Ledger's filter and chips: accounted | partly | quiet | custody | outside (not in scope: made after 1945) */
let labpIdx=null;
function labpIndex(){return labpIdx||(labpIdx=new Map(labpRead().rows.map(r=>[String(r.n.id),r])));}
function labpStatus(id){const r=labpIndex().get(String(id));return !r?'outside':r.custody?'custody':r.through?r.status:'outside';}
/* the reading of one history in a sentence or three, for the provenance drawer; empty when the work is not in scope */
function labpNote(id){const r=labpIndex().get(String(id));if(!r)return '';
  if(r.custody)return `An institution held this work from before ${LABP_FROM} until the Gallery took it, so the reading sets it aside.`;
  if(!r.through)return '';
  const where=r.place?` It starts the period in ${r.place.city}, the nearest place the text names for that owner.`:'';
  if(r.status==='accounted')return `Accounted for: ${r.state==='held'?'one owner held it throughout':r.state==='family'?'it passed within one family':'every change of hands in the period is dated'}.${where}`;
  const at=labpClean(r.openAt),cut=at.length>150?at.slice(0,148).replace(/\s+\S*$/,'')+' …':at;
  return `${r.status==='partly'?'Partly accounted for: the main text dates something in the period but leaves a change of hands undated':`Quiet: the main text names no date between ${LABP_FROM} and ${LABP_TO}`}.${cut?` The chain opens at “${cut}”.`:''}${where}`;}
const labpClean=t=>String(t||'').replace(/\[\s*\d+\s*\]/g,'').replace(/\s+/g,' ').trim();
function labpCSV(){const R=labpRead();const head=['Status','NGA id','Artist','Title','Starts the period in','Country','Owner of 1933, or first owner (entry)','Last date before 1933','Where the chain opens (entry)','First date after 1945','Dealers and houses named','Accessioned','Credit line','NGA page'];
  return rowsCSV([head,...R.open.slice().sort((a,b)=>a.status.localeCompare(b.status)||(b.acc||0)-(a.acc||0)).map(r=>[LABP_STATUS[r.status],r.n.id,r.n.a,r.n.t,r.place?r.place.city:'',r.place?r.place.country:'',labpClean(r.owner),r.last||'',labpClean(r.openAt),r.next||'',(typeof DEALERS!=='undefined'&&Array.isArray(DEALERS)?DEALERS:[]).filter(d=>d[3]&&dealerMatch(d)(r.main)).map(d=>d[0]).join('; '),r.acc,r.n.cl||'',`https://www.nga.gov/collection/art-object-page.${r.n.id}.html`])]);}
function labProvenance(el){if(!el)return;const R=labpRead();const N=R.rows.length;
  if(!N){el.innerHTML=`<div class="rh"><h2 tabindex="-1">How the histories account for 1933 to 1945</h2></div><p class="note">The Ledger’s records are not in this build.</p>`;return;}
  const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';const T=R.thru.length,A=R.accounted.length,P=R.partly.length,Q=R.quiet.length,O=R.open.length;
  const C=R.covered.length,CA=R.caccounted.length,CP=R.cpartly.length,CQ=R.cquiet.length,CO=R.copen.length;
  const fig=(l,v,d)=>`<div class="lab-fg"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
  /* the headline is the full scope the American Alliance of Museums sets; the wider date scope follows, with why its share is higher */
  const xoutN=R.xout.reduce((s,x)=>s+x[1],0),xNames={'United States':'the United States','United Kingdom':'Britain'},xTop=R.xout.slice(0,2),xRest=xoutN-xTop.reduce((s,x)=>s+x[1],0);
  const xoutBy=xoutN?` (${xTop.map(([c,n])=>`${n} in ${esc(xNames[c]||c)}`).join(', ')}${xRest?`, ${xRest} elsewhere`:''})`:'';
  const read=`Of the Ledger’s <b>${N.toLocaleString('en-GB')}</b> ownership histories, <b>${T}</b> meet the American Alliance of Museums’ date criteria for this research: made before 1946, at the National Gallery after 1932. Its full scope also asks for a change of hands between 1932 and 1946 and a place in continental Europe. As far as the text can tell, <b>${C}</b> meet it (no single owner throughout; a European place, or none named), and only <b>${pct(CA,C)}</b> of those account for ${LABP_FROM} to ${LABP_TO}: <b>${CP}</b> date something in the period but leave a change of hands open, and <b>${CQ}</b> are quiet. Across the date criteria the share is ${pct(A,T)}. It is higher because the full scope sets aside ${T-C} histories: ${R.xheld} stayed with one owner throughout, and ${xoutN} more started the period outside continental Europe${xoutBy}.`;
  const ctry=R.countries.filter(c=>c.n>=3&&c.c!=='Not stated');const rest=R.countries.filter(c=>!ctry.includes(c));
  const sum=k=>rest.reduce((s,c)=>s+c[k],0);const crow=(name,o,key)=>`<tr class="clk" data-labpc="${esc(key)}" tabindex="0" title="List the open histories that start the period here"><td>${esc(name)}</td><td class="n">${o.n}</td><td class="n">${o.accounted}</td><td class="n">${o.partly}</td><td class="n">${o.quiet}</td><td class="n">${pct(o.partly+o.quiet,o.n)}</td></tr>`;
  el.innerHTML=`<div class="lab-k">Instrument four · Provenance</div><div class="rh"><h2 tabindex="-1">How the histories account for ${LABP_FROM} to ${LABP_TO}</h2><span class="sub">the Ledger’s ownership histories read entry by entry, the way the Gallery writes them</span></div>
    <p class="lab-read">${read}</p>
    <div class="lab-figs lab-figs6">${fig('Histories read',N.toLocaleString('en-GB'),'National Gallery of Art open data, CC0')}${fig('Date criteria',T,`made before 1946, at the Gallery after 1932; ${R.custody} held by an institution throughout are set aside; ${pct(A,T)} accounted for`)}${fig('Full scope',C,'also a change of hands in the period and a place in continental Europe, or none named')}${fig('Accounted for',`<span id="labpCovPct" data-v="${C?(CA/C*100).toFixed(4):''}">${pct(CA,C)}</span>`,`${CA} of the ${C} in the full scope`)}${fig('Partly, or quiet',`${CP} · ${CQ}`,'a date in the period but a change undated · no date between '+LABP_FROM+' and '+LABP_TO)}${fig('Research terms',R.termRecs,'histories in the date criteria that use any of the five families, notes included')}</div>
    <div class="lab-two"><div class="lab-hb"><h3 class="lab-h3">Where each history starts the period<span>histories in the date criteria, by country</span></h3><div class="tblwrap"><table class="tbl labp-ct"><thead><tr><th>Country</th><th class="n">Date criteria</th><th class="n">Accounted</th><th class="n">Partly</th><th class="n">Quiet</th><th class="n">Open</th></tr></thead><tbody>${ctry.map(c=>crow(c.c,c,c.c)).join('')}${rest.length?crow('Elsewhere, or not stated',{n:sum('n'),accounted:sum('accounted'),partly:sum('partly'),quiet:sum('quiet')},'rest'):''}</tbody></table></div><p class="note labp-cn">Countries as they were in ${LABP_FROM}. The place is the one named for the owner of ${LABP_FROM} (for a work made later, its first owner), or for the entries that lead to that owner directly.</p></div>
      <div class="lab-hb"><h3 class="lab-h3">Names in the histories<span>the ${words(Math.min(12,R.dealers.length))} of the Ledger’s dealers and houses named most often in histories in the date criteria; the select below lists all ${R.dealers.length} named at least five times</span></h3><div class="tblwrap"><table class="tbl labp-ct labp-dt"><thead><tr><th>Dealer or house</th><th class="n">Date criteria</th><th class="n">Open</th><th class="n">Open share</th></tr></thead><tbody>${R.dealers.slice(0,12).map((d,i)=>`<tr class="clk" data-labpd="${i}" tabindex="0" title="List the open histories that name ${esc(d.name)}"><td>${esc(d.name)}</td><td class="n">${d.n}</td><td class="n">${d.open}</td><td class="n">${pct(d.open,d.n)}</td></tr>`).join('')}<tr class="labp-base"><td>Every history in the date criteria</td><td class="n">${T}</td><td class="n">${O}</td><td class="n">${pct(O,T)}</td></tr></tbody></table></div><p class="note labp-cn">A name counts once per history, wherever it stands in the chain. A dealer or saleroom busy in Paris or Berlin in these years appears in many open histories because the period is thinly documented there: a name here is where research would look, not a finding about the firm. The last row is the share across every history in scope, for comparison.</p></div></div>
    <div class="lab-two"><div class="lab-hb"><h3 class="lab-h3">Where the open histories cluster<span>artists with the most histories partly accounted for or quiet</span></h3>${R.artists.length?hbars(R.artists.slice(0,8),r=>`${r[1]}`):'<p class="note">None.</p>'}</div>
      <div class="lab-hb"><h3 class="lab-h3">Research terms in the histories<span>histories in the date criteria that use each family of terms; ERR is the Einsatzstab Reichsleiter Rosenberg, the wartime seizure agency</span></h3>${hbars(R.terms.filter(t=>t[1]>0),r=>`${r[1]}`)}</div></div>
    <h3 class="lab-h3 labp-lh" id="labpListH">Open in the period<span id="labpListSub"></span></h3>
    <div class="labp-bar"><div class="chips labp-f" role="group" aria-label="Which histories to list"><button class="tag on" data-labpf="quiet" aria-pressed="true">Quiet · <span data-labpn="quiet">${CQ}</span></button><button class="tag" data-labpf="partly" aria-pressed="false">Partly accounted for · <span data-labpn="partly">${CP}</span></button><button class="tag" data-labpf="open" aria-pressed="false">Both · <span data-labpn="all">${CO}</span></button></div>
      <div class="labp-sel"><select id="labpScope" aria-label="Which scope"><option value="full">Full scope · ${C}</option><option value="date">Date criteria · ${T}</option></select><select id="labpCountry" aria-label="Starts the period in"><option value="all">Every country</option>${ctry.map(c=>`<option value="${esc(c.c)}">${esc(c.c)}</option>`).join('')}${rest.length?'<option value="rest">Elsewhere, or not stated</option>':''}</select><select id="labpArtist" aria-label="Artist"></select><select id="labpDealer" aria-label="Dealer or house named"></select><button class="btn sm" id="labpCsv">CSV of all ${O} open in the date criteria</button></div></div>
    <div class="tblwrap"><table class="tbl labp-t"><thead><tr><th>Artist</th><th>Title, and where the chain opens</th><th>Starts the period in</th><th class="n">Last date before ${LABP_FROM}</th><th class="n">First date after ${LABP_TO}</th><th class="n">At the Gallery</th></tr></thead><tbody id="labpRows"></tbody></table></div>
    <ul class="lab-notes"><li><b>What this is.</b> A reading of the published text for triage. An open stretch is where research would start; it is not evidence that a work changed hands wrongly, and many histories pass through a dealer’s stock or a foundry’s without a dated entry. ${limLink('provenance','The limits of this reading')}</li><li><b>Who researches it.</b> The National Gallery of Art researches its collection under the 1998 Washington Conference Principles on Nazi-Confiscated Art and publishes the result on each object’s page, which every row opens. The scope is the one the American Alliance of Museums sets: works made before 1946 and acquired after 1932; the principles concern works in Europe in these years, which is why the place matters.</li><li><b>How it is read.</b> Semicolons in the Gallery’s text join owners who passed the work directly; a full stop between owners marks a link that is not known. A change of hands is dated when its entry gives a year, when the buyer follows a dated sale, when an heir follows an owner whose year of death is given, or when an owner held it “until” a year. “By 1927”, “in 1908” or “1940–1949” after a name, “until at least 1935” and “probably until 1946” only bound it. An inheritance, a gift to a relative or a wife who takes her husband’s name keeps the chain within a family. Only the main text is dated; the notes are set aside.</li><li><b>Where it fits.</b> The Clinic scores a title gap for a work you are considering; the Undertow’s restitution cases show how gaps are settled; the Ledger holds every history in full.</li></ul>`;
  let mode='quiet',scope='full',country='all',artist='all',dealer='all';const named=new Set(ctry.map(c=>c.c));
  const SC={full:{quiet:R.cquiet,partly:R.cpartly,all:R.copen},date:{quiet:R.quiet,partly:R.partly,all:R.open}};
  /* the artist and name selects count open histories in the scope on screen, so a choice lists exactly its count */
  const fillSel=()=>{const pool=SC[scope].all,as2=$('#labpArtist',el),ds2=$('#labpDealer',el);const byA={};pool.forEach(r=>{byA[r.n.a]=(byA[r.n.a]||0)+1;});
    if(as2){const keep=as2.value||artist;as2.innerHTML=`<option value="all">Every artist</option>${Object.entries(byA).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([a,n])=>`<option value="${esc(a)}">${esc(a)} · ${n}</option>`).join('')}`;as2.value=byA[keep]?keep:'all';artist=as2.value;}
    if(ds2){const keep=ds2.value||dealer;ds2.innerHTML=`<option value="all">Every name</option>${R.dealers.map((d,i)=>[d,i,pool.filter(r=>d.has(r.main)).length]).filter(x=>x[2]>0).map(([d,i,n])=>`<option value="${i}">${esc(d.name)} · ${n}</option>`).join('')}`;ds2.value=[...ds2.options].some(o=>o.value===String(keep))?String(keep):'all';dealer=ds2.value;}
    $$('[data-labpn]',el).forEach(x=>{x.textContent=SC[scope][x.dataset.labpn].length;});};
  fillSel();
  const inCountry=r=>{const c=r.place?r.place.country:'Not stated';return country==='all'||(country==='rest'?!named.has(c):c===country);};
  const draw=()=>{const all=(mode==='quiet'?SC[scope].quiet:mode==='partly'?SC[scope].partly:SC[scope].all).filter(r=>inCountry(r)&&(artist==='all'||r.n.a===artist)&&(dealer==='all'||R.dealers[+dealer].has(r.main))).sort((a,b)=>(b.acc||0)-(a.acc||0)||a.n.a.localeCompare(b.n.a));
    const narrowed=country!=='all'||artist!=='all'||dealer!=='all',cap=narrowed?60:20,list=all.slice(0,cap);
    const sub=$('#labpListSub',el);if(sub)sub.textContent=all.length>cap?`the ${cap} most recently accessioned of ${all.length}; each row opens the full history`:`${all.length===1?'one history':`all ${all.length}`}, the most recently accessioned first; each row opens the full history`;
    const tb=$('#labpRows',el);if(!tb)return;
    const at=r=>{const t=labpClean(r.openAt);return t?`<div class="labp-at">Opens at: ${esc(t.length>110?t.slice(0,108).replace(/\s+\S*$/,'')+' …':t)}</div>`:'';};
    tb.innerHTML=list.length?list.map(r=>`<tr class="clk" data-labp="${esc(r.n.id)}" tabindex="0"><td>${esc(r.n.a)}</td><td>${esc(r.n.t)}${at(r)}</td><td>${r.place?esc(r.place.city):'<span class="faint">not stated</span>'}</td><td class="n">${r.last||'—'}</td><td class="n">${r.next||'—'}</td><td class="n">${r.acc}</td></tr>`).join(''):`<tr><td colspan="6" class="faint">None.</td></tr>`;
    $$('[data-labp]',tb).forEach(tr=>{const go=()=>{const n=NGA.find(x=>String(x.id)===tr.dataset.labp);if(n)openProv(n,'');};tr.addEventListener('click',go);tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});});};
  $$('[data-labpf]',el).forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.labpf;$$('[data-labpf]',el).forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',String(on));});draw();}));
  const cs=$('#labpCountry',el),as=$('#labpArtist',el),ds=$('#labpDealer',el);
  /* the counts beside the artists and the names are open histories, both kinds, so choosing one lists both kinds and the list matches its count */
  const both=()=>{const b=$('[data-labpf="open"]',el);if(b)b.click();else draw();};
  const ss=$('#labpScope',el);if(ss)ss.addEventListener('change',()=>{scope=ss.value==='date'?'date':'full';fillSel();draw();});
  if(cs)cs.addEventListener('change',()=>{country=cs.value;both();});if(as)as.addEventListener('change',()=>{artist=as.value;both();});if(ds)ds.addEventListener('change',()=>{dealer=ds.value;both();});
  /* a row of either table lists exactly what it counts: its own filter, the other two cleared, both kinds, the list brought into view */
  /* the tables count the date criteria, so a row switches the list to that scope */
  const only=(c,a,d)=>{scope='date';if(ss)ss.value='date';fillSel();country=c;artist=a;dealer=d;if(cs)cs.value=c;if(as)as.value=a;if(ds)ds.value=d;both();const h=$('#labpListH',el);if(h)scrollToEl(h);};
  $$('[data-labpd]',el).forEach(tr=>{const pick=()=>only('all','all',tr.dataset.labpd);tr.addEventListener('click',pick);tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}});});
  $$('[data-labpc]',el).forEach(tr=>{const pick=()=>only(tr.dataset.labpc,'all','all');tr.addEventListener('click',pick);tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}});});
  draw();
  const b=$('#labpCsv',el);if(b)b.addEventListener('click',()=>offerFile(`subhasta-provenance-open-${TODAY}.csv`,labpCSV(),'the open histories'));}
