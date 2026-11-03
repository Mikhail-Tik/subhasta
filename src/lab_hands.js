/* ---------- LAB · hands: how long owners held, how they let go, and who sold to the Gallery’s founders ----------
   labHands(el) fills #lab-hands (a placeholder rendered by renderLab in lab.js) from the entries the provenance reading keeps on every
   history (labpRead().rows[i].E, src/lab_prov.js), so the two instruments read the same text the same way:
   · the holder of an entry is the party after its last "to", "by", "for" or "with" outside parentheses (a date, a price or "by
     inheritance" after the word does not count; "with" after a joint account names the partner, not the holder), or else the entry's
     own subject. By the Gallery's convention a name in parentheses is a dealer; an auction (an entry with a sale, or an auction house
     in parentheses) is a sale, not a holder; a museum, a library, a church or a hospital is an institution; a consignment, an approval
     or a deposit is an agent: the owner keeps the work through it;
   · a holding runs from the holder's dated acquisition to the next dated change of hands, through links that are all known (no full
     stop between the entries), past an agent and past a continuation: an estate, or the holder's own trust or foundation, dated or
     not (the artist's estate counts as the artist's). A holding "by descent" with no year of its own spans generations and is set
     apart as a family's. A holding ended in a sale (to a dealer, at auction, or "sold", "bought", "exchanged"), with heirs (an
     inheritance or a gift within the family), with the Gallery, with another museum, or otherwise;
   · hands before the Gallery: the holders a history names before the Gallery's own entry, sales, agents and continuations left out;
   · who sold to the founders: walking back from the Gallery past continuations, agents and heirs to the donor's entry, every link
     known: the dealer named in that entry ("through", "from", "by … for"), else the dealer or agent straight before it, else none
     (a sale, an institution or another owner before the donor). The firm is the last one a joint entry names. The collection is the
     credit line's.
   A census of the Ledger's histories, chosen for market-defining artists: it describes how these works travelled, not the whole
   market. Top-level names carry the labh/LABH_ prefix. */
const LABH_ERAS=[[0,1900,'Before 1900','before 1900'],[1900,1933,'1900 to 1932','between 1900 and 1932'],[1933,1946,'1933 to 1945','between 1933 and 1945'],[1946,1980,'1946 to 1979','between 1946 and 1979'],[1980,1e4,'1980 on','from 1980 on']];
const LABH_MADE=[[0,1800,'Before 1800','made before 1800'],[1800,1900,'1800 to 1899','made in the 1800s'],[1900,1946,'1900 to 1945','made 1900 to 1945'],[1946,1e4,'After 1945','made after 1945']];
const LABH_INST=/\b(?:Museum|Museen|Musée|Museo|Museu|Hermitage|Gallery of Art|Galleria|Pinacoteca|Kunsthalle|Kunstmuseum|Institute|Institution|Society|Academy|Athenaeum|University|College|Library|Hospital|Church|Cathedral|Abbey|Convent|Monastery)\b/;
const LABH_AUCTION=/^\(\s*(?:his |her |their |the )?(?:Sotheby|Christie|Parke[- ]Bernet|American Art Association|Anderson Galleries|Hôtel Drouot|Drouot|Bonhams|Phillips|Lempertz|Dorotheum|Freeman)/i;
const LABH_AGENT=/\b(?:consig\w*|on approval|on deposit|deposited|on loan)\b/i;
/* a word after "to", "by", "for" or "with" that makes it a date, a manner or a price, not a party */
const LABH_NOTPARTY=/^(?:\d|c\.|ca\.|about|circa|early|late|mid|the (?:early|late|mid|end|summer|spring|autumn|winter|\d)|at least|then|whom|which|sale\b|inheritance|descent|exchange|a (?:total|sum|price)\b|January|February|March|April|May|June|July|August|September|October|November|December|spring|summer|autumn|fall|winter)/i;
const LABH_FOUNDERS=[['Corcoran Collection',/^Corcoran Collection/],['Chester Dale',/Chester Dale Collection/],['Paul Mellon',/\bPaul Mellon\b/],['Andrew W. Mellon',/Andrew W\. Mellon Collection/],['Samuel H. Kress',/Samuel H\. Kress/],['Ailsa Mellon Bruce',/Ailsa Mellon Bruce Collection/],['Widener',/\bWidener\b/],['Gallery purchase funds',/\bFund\b/]];
/* firms the Gallery spells more than one way, outside the Ledger's own lineage (DEALERS carries its alternatives itself) */
const LABH_ALIAS=[[/kraushaar/i,'Kraushaar Galleries'],[/carstairs/i,'Carroll Carstairs Gallery'],[/\bthaw\b/i,'E. V. Thaw & Co.'],[/boussod|valadon/i,'Boussod, Valadon & Cie'],[/sedelmeyer/i,'Sedelmeyer Gallery'],[/\bvose\b/i,'Vose Galleries'],[/\bnathan\b/i,'Galerie Nathan'],[/bignou/i,'Étienne Bignou'],[/\bsam salz\b/i,'Sam Salz'],[/de hauke/i,'César de Hauke']];
let labhCache=null;
function labhHolder(e){if(e.nga||e.virtual)return {kind:'gallery',who:''};if(e.sale)return {kind:'sale',who:''};
  const t=String(e.t||'').replace(/^\s*(?:probably|possibly|presumably|perhaps)\s+/i,'').trim();
  if(LABH_AGENT.test(t))return {kind:'agent',who:(t.match(/\([^()]*\)/)||[''])[0]};
  let d=0,who=null;
  for(let i=0;i<t.length;i++){const c=t[i];if(c==='(')d++;else if(c===')'&&d>0)d--;
    else if(d===0&&(i===0||/[^\wÀ-ÿ]/.test(t[i-1]))){const m=t.slice(i,i+80).match(/^(to|by|for|with)\s+(\S[\s\S]*)$/);
      if(m&&!LABH_NOTPARTY.test(m[2])&&!(m[1]==='with'&&/joint(?:ly| account| ownership)|partnership|in shares?\b/i.test(t.slice(Math.max(0,i-40),i))))who=t.slice(i).replace(/^(?:to|by|for|with)\s+/,'');}}
  if(who==null)who=t;who=who.trim();
  if(who[0]==='(')return {kind:LABH_AUCTION.test(who)?'sale':'dealer',who};
  return {kind:LABH_INST.test(who.split(/,\s/)[0])?'institution':'owner',who};}
const labhFounder=cl=>{const c=String(cl||'');const f=LABH_FOUNDERS.find(([,re])=>re.test(c));return f?f[0]:'Other gifts';};
/* a dealer's name: the last firm a joint entry names; the Ledger's own lineage when the matcher knows it, an alias, else the name the
   parentheses open with */
function labhDealer(who){const inner=(String(who).match(/\(([^()]*)\)/)||[,String(who)])[1];const firm=inner.split(';').map(x=>x.replace(/^\s*(?:and|&)\s+/,'').trim()).filter(Boolean).pop()||inner;
  const L=typeof DEALERS!=='undefined'&&Array.isArray(DEALERS)?DEALERS:[];const d=L.find(x=>dealerMatch(x)(firm));if(d)return d[0];
  const a=LABH_ALIAS.find(([re])=>re.test(firm));if(a)return a[1];return (firm.split(',')[0]||firm).replace(/\s+/g,' ').trim();}
/* a dealer named inside an owner's own entry: "through (X)", "from (X)", "by (X) for", "via (X)" */
function labhVia(t){let d=0,start=-1;const s=String(t||'');for(let i=0;i<s.length;i++){const c=s[i];if(c==='('){if(d===0)start=i;d++;}else if(c===')'&&d>0){d--;
  if(d===0&&start>=0){const grp=s.slice(start,i+1),pre=s.slice(Math.max(0,start-12),start);if(/\b(?:through|via|from|by)\s*$/i.test(pre)&&!/\bsales?\b|\bauction\b/i.test(grp)&&!LABH_AUCTION.test(grp))return grp;}}}return null;}
/* one key for the spellings of one firm: accents, "Galerie", "Inc.", "& Co." off */
const labhKey=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/^(?:galerie|galeries|galleria|the)\s+/,'').replace(/[,.]?\s+(?:inc|ltd|co|corp|gmbh|& co|and co|& cie|et cie)\.?$/,'').replace(/\s+(?:gallery|galleries|galerie|fine arts?)$/,'').replace(/[^a-z0-9]+/g,' ').trim();
const labhQ=(xs,p)=>{const s=xs.filter(x=>x!=null&&isFinite(x)).sort((a,b)=>a-b);if(!s.length)return null;const i=(s.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return s[lo]+(s[hi]-s[lo])*(i-lo);};
function labhRead(){if(labhCache)return labhCache;const R=labpRead();const H=[],hands=[],supply=[];
  R.rows.forEach(r=>{const E=r.E||[];if(!E.length)return;const ks=E.map(labhHolder);const ni=E.findIndex(e=>e.nga);
    /* a continuation keeps the holding: an estate, or the holder's own trust or foundation, dated or not; the artist's estate is the artist's */
    const cont=E.map((e,j)=>!!e.cont||(j>0&&!e.gap&&(labpOwnFoundation(E[j-1].t+(/\bartist\b/i.test(E[j-1].t)?' '+r.n.a:''),e.t)||(ks[j-1].kind==='agent'&&/\b(?:back to|returned to|returned)\b/i.test(e.t)))));   /* a consignment that came back continues the consignor's holding */
    const pass=j=>cont[j]||ks[j].kind==='agent';
    hands.push({r,k:ks.filter((x,j)=>(ni<0||j<ni)&&x.kind!=='sale'&&x.kind!=='gallery'&&!pass(j)).length,made:parseInt(String(r.n.y||''),10)});
    E.forEach((a,j)=>{const ka=ks[j];if(ka.kind==='sale'||ka.kind==='gallery'||pass(j)||!a.acq||!a.acq.x)return;
      let k=j+1;while(k<E.length&&pass(k)&&!E[k].gap)k++;if(k>=E.length)return;for(let i=j+1;i<=k;i++)if(E[i].gap)return;
      const b=E[k];if(!b.acq||!b.acq.x)return;const yrs=b.acq.y-a.acq.y;if(yrs<0)return;const kb=ks[k];
      const kind=ka.kind==='owner'&&a.descent&&!a.years.length?'family':ka.kind;   /* "by descent in the family" spans generations: set apart */
      const end=kb.kind==='gallery'?'gallery':kb.kind==='institution'?'museum':b.kin||(/\bheirs?\b/i.test(b.t)&&!/\bsold\b|\bsale\b/i.test(b.t))?'heirs':kb.kind==='sale'||kb.kind==='dealer'||/\b(?:sold|purchased|bought|acquired|exchanged?)\b/i.test(b.t)?'sold':'other';
      H.push({r,kind,y:a.acq.y,yrs,end,a:a.raw,b:b.raw});});
    /* who sold to the donor: back from the Gallery past continuations, agents and heirs, every link known */
    if(ni>0){let k=ni-1;while(k>0&&!E[k+1].gap&&(pass(k)||E[k].kin))k--;
      if(!E[k+1].gap){const kk=ks[k];let who=null;
        if(kk.kind==='dealer')who=kk.who;
        else if(kk.kind==='owner'){who=labhVia(E[k].t);if(!who&&k>0&&!E[k].gap&&(ks[k-1].kind==='dealer'||(ks[k-1].kind==='agent'&&ks[k-1].who&&/\b(?:sold|purchased|bought|acquired)\b/i.test(E[k].t))))who=ks[k-1].who;}   /* an agent counts only when the donor bought through it */
        if(who)supply.push({r,d:labhDealer(who),f:labhFounder(r.n.cl)});}}});
  /* one name per firm: the lineage's name when known, else the commonest spelling */
  const L=typeof DEALERS!=='undefined'&&Array.isArray(DEALERS)?DEALERS:[];
  const sp={};supply.forEach(x=>{const k=labhKey(x.d);const o=sp[k]||(sp[k]={});o[x.d]=(o[x.d]||0)+1;});
  const nameOf={};Object.entries(sp).forEach(([k,o])=>{const known=Object.keys(o).find(n=>L.some(d=>d[0]===n)||LABH_ALIAS.some(a=>a[1]===n));nameOf[k]=known||Object.entries(o).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0];});
  supply.forEach(x=>{x.d=nameOf[labhKey(x.d)]||x.d;});
  const own=H.filter(h=>h.kind==='owner'),dea=H.filter(h=>h.kind==='dealer');const yrs=a=>a.map(h=>h.yrs);
  const ends=['sold','heirs','gallery','museum','other'].map(e=>[e,own.filter(h=>h.end===e).length]);
  const eras=LABH_ERAS.map(([a,b,l,ph])=>{const o=own.filter(h=>h.y>=a&&h.y<b),d=dea.filter(h=>h.y>=a&&h.y<b);
    return {l,ph,a,b,n:o.length,med:labMedian(yrs(o)),q1:labhQ(yrs(o),.25),q3:labhQ(yrs(o),.75),sold:o.filter(h=>h.end==='sold').length,heirs:o.filter(h=>h.end==='heirs').length,gallery:o.filter(h=>h.end==='gallery').length,dn:d.length,dmed:labMedian(yrs(d))};});
  const made=LABH_MADE.map(([a,b,l,ph])=>{const x=hands.filter(h=>isFinite(h.made)&&h.made>=a&&h.made<b);return {l,ph,n:x.length,med:labMedian(x.map(h=>h.k))};}).filter(m=>m.n>0);
  const fl={};supply.forEach(x=>{const k=x.d+'\u0000'+x.f;fl[k]=(fl[k]||0)+1;});
  const flows=Object.entries(fl).map(([k,n])=>{const [d,f]=k.split('\u0000');return {d,f,n};}).sort((a,b)=>b.n-a.n||a.d.localeCompare(b.d)||a.f.localeCompare(b.f));
  labhCache={H,own,dea,inst:H.filter(h=>h.kind==='institution').length,family:H.filter(h=>h.kind==='family').length,ends,eras,made,hands,supply,flows,
    ownMed:labMedian(yrs(own)),ownQ1:labhQ(yrs(own),.25),ownQ3:labhQ(yrs(own),.75),deaMed:labMedian(yrs(dea)),deaQ1:labhQ(yrs(dea),.25),deaQ3:labhQ(yrs(dea),.75),
    handsMed:labMedian(hands.map(h=>h.k)),rows:R.rows.length,artists:new Set(R.rows.map(x=>x.n.a)).size};
  return labhCache;}
/* the flow from the dealer to the donor's collection: two columns of thin bars, bands between them; the eight busiest dealers, each
   collection placed at the weighted mean rank of its dealers so fewer bands cross. Text wears the ink tokens; a band lifts on hover and
   its tooltip names both ends; the table under the chart holds every flow */
function labhFlowSVG(X,W){const top=8,maxD=8;const byD={};X.flows.forEach(f=>{byD[f.d]=(byD[f.d]||0)+f.n;});
  const left=Object.entries(byD).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,maxD);const keep=new Set(left.map(d=>d[0]));
  const L={},byF={};X.flows.forEach(f=>{if(!keep.has(f.d))return;L[f.d+'\u0000'+f.f]=f.n;byF[f.f]=(byF[f.f]||0)+f.n;});
  const rank=Object.fromEntries(left.map((d,i)=>[d[0],i]));const bary=f=>{let s=0,n=0;left.forEach(([d])=>{const v=L[d+'\u0000'+f]||0;s+=v*rank[d];n+=v;});return n?s/n:1e9;};
  const right=Object.entries(byF).sort((a,b)=>(a[0]==='Other gifts')-(b[0]==='Other gifts')||bary(a[0])-bary(b[0])||b[1]-a[1]);
  const N=left.reduce((s,d)=>s+d[1],0);if(!N)return '';
  /* each label column is as wide as its longest name; below 640 px the chart keeps 640 and its frame scrolls sideways */
  const wide=W>=640,Wc=Math.max(W,640),cw=12.5*0.56,lab=col=>Math.max(...col.map(([n,v])=>(n.length+String(v).length+1)*cw))+16;
  const LW=Math.min(Math.round(Wc*0.34),Math.ceil(lab(left))),RW=Math.min(Math.round(Wc*0.34),Math.ceil(lab(right))),NW=10,gap=wide?8:6,rowMin=wide?22:20;const x0=LW,x1=Wc-RW;
  const rows=Math.max(left.length,right.length),avail=Math.max(300,rows*rowMin*1.7);const k=(avail-gap*(rows-1))/N;const hgt=v=>Math.max(2,v*k);
  const place=col=>{const pos={};let y=top;col.forEach(([n,v])=>{const h=hgt(v);pos[n]={y,h,v,used:0};y+=Math.max(h,rowMin)+gap;});return {pos,end:y};};
  const A=place(left),B=place(right);const H=Math.max(A.end,B.end)+top;
  const band=(xa,ya,xb,yb,w)=>{const xm=(xa+xb)/2;return `M${xa},${ya.toFixed(1)} C${xm},${ya.toFixed(1)} ${xm},${yb.toFixed(1)} ${xb},${yb.toFixed(1)} L${xb},${(yb+w).toFixed(1)} C${xm},${(yb+w).toFixed(1)} ${xm},${(ya+w).toFixed(1)} ${xa},${(ya+w).toFixed(1)} Z`;};
  let links='';left.forEach(([d])=>right.forEach(([f])=>{const n=L[d+'\u0000'+f];if(!n)return;const a=A.pos[d],b=B.pos[f],w=hgt(n);
    const tip=`${d} to ${f}: ${n} ${n===1?'work':'works'}`;links+=`<path class="hl" d="${band(x0+NW,a.y+a.used,x1,b.y+b.used,w)}" role="graphics-symbol" aria-label="${esc(tip)}" data-tip="${esc(tip)}"/>`;a.used+=w;b.used+=w;}));
  const node=(x,p,label,anchor,tx)=>`<rect class="hn" x="${x}" y="${p.y.toFixed(1)}" width="${NW}" height="${p.h.toFixed(1)}" rx="1"/><text class="ht" x="${tx}" y="${(p.y+Math.min(p.h,rowMin)/2+4).toFixed(1)}" text-anchor="${anchor}">${esc(label)} <tspan class="hv">${p.v}</tspan></text>`;
  let nodes='';left.forEach(([d])=>{nodes+=node(x0,A.pos[d],d,'end',x0-8);});right.forEach(([f])=>{nodes+=node(x1,B.pos[f],f,'start',x1+NW+8);});
  return `<svg viewBox="0 0 ${Wc} ${H.toFixed(0)}" width="${Wc}" height="${H.toFixed(0)}" class="labh-flow" role="group" aria-label="${esc(`The ${left.length} busiest dealers who sold to the Gallery’s donors, and the collections their ${N} works came with`)}">${links}${nodes}</svg>`;}
function labHands(el){if(!el)return;const X=labhRead();
  if(!X.H.length){el.innerHTML=`<div class="lab-k">Instrument five · Hands</div><div class="rh"><h2 tabindex="-1">How long owners held</h2></div><p class="note">The Ledger’s records are not in this build.</p>`;return;}
  const own=X.own.length,pc=n=>own?Math.round(n/own*100)+'%':'—',E=Object.fromEntries(X.ends);const yr=v=>v==null?'—':v===1?'one year':`${labInt(v)} years`;
  /* the last era is cut short by the present, so it is left out of the comparison */
  const valid=X.eras.filter(e=>e.n>=20&&e.med!=null&&e.b<1e4);const shortest=valid.reduce((m,e)=>!m||e.med<m.med?e:m,null),longest=valid.reduce((m,e)=>!m||e.med>m.med?e:m,null);
  const oldest=X.made[0];
  const read=`The Ledger’s ${labInt(X.rows)} histories date <b>${labInt(X.H.length)}</b> holdings at both ends. A collector kept a work a median of <b>${yr(X.ownMed)}</b>, half of them between ${labInt(X.ownQ1)} and ${labInt(X.ownQ3)}; a dealer, a median of <b>${yr(X.deaMed)}</b>. When a collector let go it was a sale ${pc(E.sold)} of the time and a passage to heirs ${pc(E.heirs)}; ${pc(E.gallery)} gave or sold to the Gallery itself, where every history here ends.${shortest&&longest&&shortest!==longest?` Collectors who acquired ${esc(shortest.ph)} held for the shortest time, a median of ${yr(shortest.med)}; those who acquired ${esc(longest.ph)}, the longest, ${yr(longest.med)}.`:''}${oldest&&oldest.med!=null?` A work ${esc(oldest.ph)} passed through a median of ${labInt(oldest.med)} hands before the Gallery.`:''}`;
  const fig=(l,v,d,attrs)=>`<div class="lab-fg"${attrs||''}><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
  const eraRow=e=>`<tr><th scope="row">${esc(e.l)}</th><td class="n">${e.n}</td><td class="n">${e.med==null?'—':labInt(e.med)}</td><td class="n">${e.q1==null?'—':`${labInt(e.q1)}–${labInt(e.q3)}`}</td><td class="n">${e.n?Math.round(e.sold/e.n*100)+'%':'—'}</td><td class="n">${e.n?Math.round(e.heirs/e.n*100)+'%':'—'}</td><td class="n">${e.n?Math.round(e.gallery/e.n*100)+'%':'—'}</td><td class="n">${e.dn}</td><td class="n">${e.dmed==null?'—':labInt(e.dmed)}</td></tr>`;
  const byD={};X.flows.forEach(f=>{(byD[f.d]||(byD[f.d]={n:0,to:{}})).n+=f.n;byD[f.d].to[f.f]=(byD[f.d].to[f.f]||0)+f.n;});const ds=Object.entries(byD).sort((a,b)=>b[1].n-a[1].n||a[0].localeCompare(b[0]));
  const top3=ds.slice(0,3).map(([d,o])=>{const to=Object.entries(o.to).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];return `${esc(d)} ${o.n} (${to[1]} to ${esc(to[0])})`;});
  const drawn=ds.slice(0,8).reduce((s,d)=>s+d[1].n,0),rest=ds.slice(8);
  el.innerHTML=`<div class="lab-k">Instrument five · Hands</div><div class="rh"><h2 tabindex="-1">How long owners held, and who sold to the Gallery’s founders</h2><span class="sub">every holding the Ledger’s histories date at both ends</span></div>
    <p class="lab-read">${read}</p>
    <div class="lab-figs lab-figs6">${fig('Holdings dated',labInt(X.H.length),`${labInt(own)} by collectors, ${labInt(X.dea.length)} by dealers, ${labInt(X.inst)} by institutions, ${labInt(X.family)} by a family across generations`)}${fig('A collector’s median hold',`<span id="labhOwn" data-v="${X.ownMed}">${X.ownMed==null?'—':labInt(X.ownMed)}</span>`,`years; half between ${labInt(X.ownQ1)} and ${labInt(X.ownQ3)}`)}${fig('A dealer’s median hold',X.deaMed==null?'—':labInt(X.deaMed),`${X.deaMed===1?'year':'years'}; half between ${labInt(X.deaQ1)} and ${labInt(X.deaQ3)}`)}${fig('Ended in a sale',pc(E.sold),`${labInt(E.sold)} collectors sold`)}${fig('Passed to heirs',pc(E.heirs),`${labInt(E.heirs)} inheritances and gifts in the family`)}${fig('Went to the Gallery',pc(E.gallery),`${labInt(E.gallery)} gifts, bequests and sales; ${labInt(E.museum)} to other museums`)}</div>
    <div class="lab-two"><div class="lab-hb"><h3 class="lab-h3">By the year the holder acquired it<span>collectors and dealers; years held</span></h3><div class="tblwrap"><table class="tbl labh-era" id="labhEra"><caption class="sr">Holdings by the period the holder acquired the work: collectors’ count, median and middle half of the years held, and how they let go (sold, to heirs, to the Gallery); dealers’ count and median</caption><thead><tr><th scope="col">Acquired</th><th scope="col" class="n">Collectors</th><th scope="col" class="n">Median</th><th scope="col" class="n">Middle half</th><th scope="col" class="n">Sold</th><th scope="col" class="n">Heirs</th><th scope="col" class="n">Gallery</th><th scope="col" class="n">Dealers</th><th scope="col" class="n">Median</th></tr></thead><tbody>${X.eras.map(eraRow).join('')}</tbody></table></div><p class="note labp-cn">Years from the holder’s dated acquisition to the next dated change of hands. A holding that began recently is cut short by the present: an owner who bought in 1990 can have held for at most ${labInt(+TODAY.slice(0,4)-1990)} years.</p></div>
      <div class="lab-hb"><h3 class="lab-h3">Hands before the Gallery<span>median holders a history names, by when the work was made</span></h3>${hbars(X.made.map(m=>[m.l,m.med]),r=>`${labInt(r[1])} <small>${X.made.find(m=>m.l===r[0]).n} works</small>`)}<p class="note labp-cn">Holders are the collectors, dealers and institutions a history names before the Gallery; a sale at auction, a consignment, the Gallery itself and an owner’s estate, trust or foundation are not counted again.</p></div></div>
    <h3 class="lab-h3 labh-fh">Who sold to the Gallery’s founders<span>the dealer who sold the work to its donor, or to the Gallery, every link known, and the collection it came with</span></h3>
    <p class="lab-gridread">${X.supply.length} histories name the dealer who sold the work to its donor or to the Gallery, with every link known; ${X.rows-X.supply.length} do not. The three busiest: ${labList(top3)}.</p>
    <p class="labh-hint">Scroll the chart sideways →</p><div class="labh-fw" id="labhFlow"></div>${rest.length?`<p class="note labp-cn">The chart draws the eight busiest dealers, ${drawn} of the ${X.supply.length} histories; the other ${X.supply.length-drawn} pass through ${rest.length} more dealers, each in the table below.</p>`:''}
    ${chartDataDetails('Every flow, dealer to collection',['Dealer who sold to the donor or the Gallery','Collection','Works'],X.flows.map(f=>[f.d,f.f,f.n]))}
    <ul class="lab-notes"><li><b>What counts.</b> A holding is dated at both ends when the holder’s acquisition and the next change of hands each have a year, read the way the provenance instrument reads them. Links broken by a full stop are skipped; an estate or the owner’s own trust or foundation continues the holding, and so does a consignment; a holding “by descent” with no year of its own spans generations and is set apart.</li><li><b>Dealers and collectors.</b> The Gallery writes a dealer’s name in parentheses, so a holder in parentheses is a dealer, unless it is an auction house. A party after “for” is the owner a dealer bought for. A museum, a library, a church or a hospital is an institution and is counted apart.</li><li><b>How a holding ended.</b> In a sale: the next holder is a dealer or an auction, or the entry says sold, bought or exchanged. With heirs: an inheritance, a gift to a relative or a widow. With the Gallery: its own gift, bequest or purchase, the last step of every history here. The rest went to another museum or by a passage the text leaves unclear.</li><li><b>What the sample is.</b> The Ledger holds ${labInt(X.rows)} of the Gallery’s ownership histories, chosen for ${labInt(X.artists)} market-defining artists. These are the works that reached a national museum, so the figures describe how they travelled, not the whole market; collections such as Chester Dale’s and the Mellons’ weigh heavily, and one deal can carry many works: the Degas waxes came to Paul Mellon through Knoedler in one sale.</li></ul>
    <div class="lab-acts"><button class="btn sm" id="labhCsv" type="button">CSV of the ${labInt(X.H.length)} holdings</button></div>`;
  const fw=$('#labhFlow',el);if(fw){fw.innerHTML=labhFlowSVG(X,labWidth(fw,1));bindTips(fw);}
  bindDataTables(el);bindCopies(el);markScrollables(el);
  const b=$('#labhCsv',el);if(b)b.addEventListener('click',()=>offerFile(`subhasta-lab-holdings-${TODAY}.csv`,labhCSV(),'the holdings'));}
function labhDraw(){const fw=$('#labhFlow');if(fw&&labhCache){fw.innerHTML=labhFlowSVG(labhCache,labWidth(fw,1));bindTips(fw);markScrollables($('#lab-hands'));}}
function labhCSV(){const X=labhRead();const END={sold:'Sale',heirs:'Heirs',gallery:'The Gallery',museum:'Another museum',other:'Other'},KIND={owner:'Collector',dealer:'Dealer',institution:'Institution',family:'Family, by descent'};
  return rowsCSV([['Holder','Acquired (year)','Years held','How it ended','Holder’s entry','Next entry','Artist','Title','NGA id','NGA page'],
    ...X.H.slice().sort((a,b)=>a.y-b.y||a.r.n.a.localeCompare(b.r.n.a)).map(h=>[KIND[h.kind]||h.kind,h.y,h.yrs,END[h.end]||h.end,labpClean(h.a),labpClean(h.b),h.r.n.a,h.r.n.t,h.r.n.id,`https://www.nga.gov/collection/art-object-page.${h.r.n.id}.html`])]);}
