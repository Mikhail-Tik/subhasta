/* ---------- THE LAB: six instruments that measure the trade ----------
   Pasted into app.js at its LAB placeholder, after the other engines, so every helper and data constant is in scope (parseUSD, parseYear,
   houseName, lotByTitle, SCHED, flowModel, FLOW, fmtUSD, spark, hbars, chartDataDetails, rowsCSV, offerFile, vflag, BENCH…).
   Each instrument is a <div class="sect c12" id="lab-<name>"> that the router scrolls to (#lab-<name>):
     returns     the same work sold twice with both prices known (CHAINS, read exactly as pricePath reads them, then JOURNEYS), against the
                 S&P 500 total return and gold over the same calendar years (BENCH, annual averages; tools/benchmarks.py)
     roundtrip   buy, hold, sell: Follow the money’s buyer total (flowModel, same inputs) plus a yearly carry, then the exit; net IRR and
                 the break-even growth (bisection on the yearly cash flows)
     structure   concentration: the big houses among themselves, the countries, the price bands, the terminal’s own lots
     provenance  written by src/lab_prov.js into its placeholder (labProvenance), when that engine is in the build
     hands       written by src/lab_hands.js (labHands): how long owners held, how they let go, who sold to the Gallery’s founders
     confidence  every V/S/U flag in the data, counted by section; the distinct source addresses; the dates
   Nothing here is typed data: every figure is computed at render from the constants. Top-level names carry the lab/LAB_ prefix. */
const LAB_INSTR=[['returns','What trophies earned'],['roundtrip','The round trip'],['structure','How concentrated the market is'],['provenance','Provenance, 1933 to 1945'],['hands','How long owners held'],['confidence','How much is verified']];
const LAB_MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const labPc=(x,d=1)=>x==null||!isFinite(x)?'—':`${x<0?'−':''}${Math.abs(x*100).toFixed(d)}%`;
const labPts=(x,d=1)=>x==null||!isFinite(x)?'—':`${x>0?'+':x<0?'−':'±'}${Math.abs(x*100).toFixed(d)} pts`;
const labInt=n=>Math.round(n).toLocaleString('en-US');
const labClamp=(v,lo,hi,d)=>typeof v==='number'&&isFinite(v)?Math.min(hi,Math.max(lo,v)):d;
const labMedian=a=>{const s=a.filter(x=>x!=null&&isFinite(x)).sort((x,y)=>x-y),n=s.length;return !n?null:n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;};
const labCagr=(a,b,n)=>a>0&&b>0&&n>0?Math.pow(b/a,1/n)-1:null;
const labYears=n=>n===1?'one year':`${words(n)} years`;
const labCap=s=>s.charAt(0).toUpperCase()+s.slice(1);
/* the surname a label shows: the last word, keeping a particle (da Vinci, van Gogh) and dropping a parenthesis */
const labSurname=a=>dispName(a);   /* the shared display name (app.js): van Gogh, Leonardo, Rembrandt, Qi Baishi */
/* a house's possessive: Sotheby’s premium, Phillips’ premium, Heritage’s premium */
const labPoss=n=>/[’']s$/.test(n)?n:/s$/.test(n)?n+'’':n+'’s';
/* "a", "a and b", "a, b and c" */
const labList=xs=>xs.length<2?xs.join(''):`${xs.slice(0,-1).join(', ')} and ${xs[xs.length-1]}`;
/* whole percentages that add up to a given total: each share rounded down, the points left over to the largest remainders */
const labRound=(xs,total)=>{const fl=xs.map(x=>Math.floor(x));let left=total-fl.reduce((a,b)=>a+b,0);xs.map((x,i)=>[x-Math.floor(x),i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).forEach(([,i])=>{if(left>0){fl[i]++;left--;}});return fl;};
/* a chart's width in CSS pixels: measured once the view is visible; before that (first render, jsdom) estimated from the main column */
function labWidth(el,frac){let w=el?el.getBoundingClientRect().width:0;if(!w){const m=$('main');w=m&&m.clientWidth?(m.clientWidth-(window.innerWidth<=900?32:48))*(frac||1):0;}return Math.round(Math.max(280,Math.min(1300,w||720)));}

/* ---------- benchmarks (BENCH, data_bench.js): annual averages aligned on BENCH.years ---------- */
const labHasBench=()=>typeof BENCH==='object'&&BENCH!==null&&Array.isArray(BENCH.years)&&BENCH.years.length>1;
/* the value for a year; a year after the series (the current, partial year or later) takes the latest value */
function labB(k,y){if(!labHasBench()||!Array.isArray(BENCH[k]))return null;const Y=BENCH.years,y0=Y[0],yN=Y[Y.length-1];if(!(y>=y0))return null;const v=BENCH[k][Math.min(y,yN)-y0];return typeof v==='number'&&v>0?v:null;}
const labBLast=()=>labHasBench()?BENCH.years[BENCH.years.length-1]:null;
/* "2026 to September" when the last year is partial */
function labBPartial(){const T=labHasBench()&&BENCH.meta&&BENCH.meta.through,yN=labBLast();if(!T||!T.sp||+T.sp.slice(0,4)!==yN)return '';const m=+T.sp.slice(5,7);return m<12?`${yN} to ${LAB_MONTHS[m-1]}`:'';}
const labBSrc=()=>labHasBench()&&BENCH.src?['sp','gold','cpi'].map(k=>BENCH.src[k]).filter(s=>Array.isArray(s)&&s[1]):[];

/* ---------- 1. what trophies earned: repeat sales ---------- */
let labP=[];                                   /* the holding periods, computed at render */
const labRet=Object.assign({sort:'cagr',dir:'desc'},(s=>s&&typeof s.sort==='string'?{sort:s.sort,dir:s.dir==='asc'?'asc':'desc'}:{})(store.get('lab.ret',null)));
const LAB_RET_COLS=[['artist','Artist',0],['title','Work',0],['y0','Bought',1],['p0','Paid',1],['y1','Sold',1],['p1','Sold for',1],['n','Years',1],['cagr','A year',1],['real','Real',1],['sp','S&P 500',1],['gold','Gold',1],['ex','± S&P',1]];
/* a dated price path → its holding periods: consecutive priced points at least a year apart, equal prices dropped */
function labPairs(){const out=[],seen=new Set();
  const periods=(pts,meta)=>{pts.sort((a,b)=>a.y-b.y);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],n=b.y-a.y;if(n<1||a.v===b.v)continue;out.push(Object.assign({y0:a.y,p0:a.v,w0:a.l,y1:b.y,p1:b.v,w1:b.l,n},meta));}};
  /* the published result closes the path unless the chain already has that sale (same year, within 2%), as on the lot page */
  const close=(r,pts)=>{const last={y:+r.date.slice(0,4),v:r.price*1e6,l:`${houseName(r.house)}, ${r.city}`};if(!pts.some(p=>p.y===last.y&&Math.abs(p.v-last.v)/last.v<0.02))pts.push(last);};
  RESULTS.forEach(r=>{const ch=CHAINS[r.title];if(!Array.isArray(ch)||seen.has(r.title))return;seen.add(r.title);const pts=[];
    ch.forEach(c=>{if(GROUP_PRICE.test(`${c[1]} ${c[2]}`))return;const v2=parseUSD(c[2]);const v=v2||parseUSD(c[1]);const y=v2?(parseYear(c[0])||parseYear(c[1])):(parseYear(c[1])||parseYear(c[0]));if(y&&v)pts.push({y,v,l:c[1]});});
    close(r,pts);periods(pts,{artist:r.artist,title:r.title,lot:r,from:'chain'});});
  (typeof JOURNEYS!=='undefined'?JOURNEYS:[]).forEach(j=>{const t=j.lot||j.t;if(seen.has(t))return;seen.add(t);const r=j.lot?lotByTitle(j.lot):null;const pts=[];
    (j.steps||[]).forEach(s=>{const y=parseYear(String(s.y==null?'':s.y));if(y&&typeof s.usd==='number'&&s.usd>0)pts.push({y,v:s.usd,l:[s.who,s.place].filter(Boolean).join(', ')});});
    if(r)close(r,pts);periods(pts,{artist:r?r.artist:String(j.a||'').split(',')[0].trim(),title:r?r.title:j.t,lot:r,journey:j,from:'journey'});});
  out.forEach(p=>{const c0=labB('cpi',p.y0),c1=labB('cpi',p.y1);p.cagr=labCagr(p.p0,p.p1,p.n);p.real=c0&&c1?labCagr(p.p0,p.p1*c0/c1,p.n):null;
    p.sp=labCagr(labB('sp',p.y0),labB('sp',p.y1),p.n);p.gold=labCagr(labB('gold',p.y0),labB('gold',p.y1),p.n);p.ex=p.cagr!=null&&p.sp!=null?p.cagr-p.sp:null;});
  return out;}
/* how far the median could move with another sample of the same size: 2,000 resamples with a fixed seed (mulberry32), so every load and
   every reader sees the same interval; the 5th and 95th percentiles of the resampled medians make a 90% interval */
function labBootMedian(xs,reps,seed){const v=xs.filter(x=>x!=null&&isFinite(x));if(v.length<4)return null;let a=seed>>>0;const rnd=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  const meds=[];for(let r=0;r<(reps||2000);r++){const smp=[];for(let i=0;i<v.length;i++)smp.push(v[Math.floor(rnd()*v.length)]);meds.push(labMedian(smp));}meds.sort((x,y)=>x-y);const q=f=>meds[Math.min(meds.length-1,Math.max(0,Math.round(f*(meds.length-1))))];return {lo:q(0.05),hi:q(0.95)};}
function labRetStats(P){const cmp=P.filter(p=>p.ex!=null),beat=cmp.filter(p=>p.ex>0);const ys=P.flatMap(p=>[p.y0,p.y1]);
  return {ci:labBootMedian(P.map(p=>p.cagr),2000,1933),n:P.length,works:new Set(P.map(p=>p.title)).size,med:labMedian(P.map(p=>p.cagr)),real:labMedian(P.map(p=>p.real)),sp:labMedian(P.map(p=>p.sp)),ex:labMedian(P.map(p=>p.ex)),beat:beat.length,cmp:cmp.length,share:cmp.length?beat.length/cmp.length:null,
    from:ys.length?Math.min(...ys):null,to:ys.length?Math.max(...ys):null,yrs:labMedian(P.map(p=>p.n)),losers:P.filter(p=>p.cagr!=null&&p.cagr<0).sort((a,b)=>a.cagr-b.cagr)};}
const labPairName=p=>`${labSurname(p.artist)}, ${p.title}`;
/* the ranked chart: one row per holding period; the art’s yearly rate (gilt dot), the S&P 500 total return over the same years (ink tick), gold (faint dot) */
function labRankSVG(P,W){const rows=P.filter(p=>p.cagr!=null).sort((a,b)=>b.cagr-a.cagr);if(!rows.length)return '<div class="empty">No work in the data has two priced sales a year apart.</div>';
  const vals=rows.flatMap(p=>[p.cagr,p.sp,p.gold]).filter(v=>v!=null&&isFinite(v)).sort((a,b)=>a-b);
  /* the scale runs to the art rates’ 80th percentile, rounded up to 10 points (20 to 60): a sleeper’s hundredfold year pins to the edge with its value instead of flattening the rest */
  const arts=rows.map(p=>p.cagr).sort((a,b)=>a-b),q80=arts[Math.min(arts.length-1,Math.floor(arts.length*0.8))];
  const hi=Math.min(0.6,Math.max(0.2,Math.ceil(q80*10-1e-9)/10)),lo=Math.min(0,Math.floor(vals[0]*10)/10);
  const wide=W>=620,LW=wide?Math.min(340,Math.round(W*0.36)):0,RG=58,top=26,RH=wide?28:46;const x0=wide?LW+22:16,x1=W-RG;const X=v=>x0+(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*(x1-x0);const H=top+rows.length*RH+6;
  const step=hi-lo>0.45?0.1:0.05;let grid='';for(let k=0;lo+k*step<=hi+1e-9;k++){const v=lo+k*step,x=X(v),anchor=!wide&&k===0?'start':'middle';grid+=`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${top-6}" y2="${H-2}"${Math.abs(v)<1e-9?' class="zero"':''}/><text x="${(anchor==='start'?x-4:x).toFixed(1)}" y="${top-12}" text-anchor="${anchor}">${labPc(Math.round(v*100)/100,0)}</text>`;}
  const fit=(s,px)=>{const n=Math.max(6,Math.floor(px/6.3));return s.length>n?s.slice(0,n-1).trimEnd()+'…':s;};
  let body='';rows.forEach((p,i)=>{const yb=top+i*RH,ym=wide?yb+RH/2:yb+31,yrs=`${p.y0}–${p.y1}`;const xa=X(p.cagr),over=p.cagr>hi;
    const nm=fit(labPairName(p),(wide?LW-74:W-84)),cut=labSurname(p.artist).length;const name=`<tspan class="a">${esc(nm.slice(0,cut))}</tspan><tspan class="w">${esc(nm.slice(cut))}</tspan>`;
    body+=wide?`<text class="nm" x="0" y="${(ym+4).toFixed(1)}">${name}</text><text class="yr" x="${LW}" y="${(ym+4).toFixed(1)}" text-anchor="end">${yrs}</text>`:`<text class="nm" x="${x0}" y="${yb+15}">${name}</text><text class="yr" x="${W-2}" y="${yb+15}" text-anchor="end">${yrs}</text>`;
    body+=`<line class="rl" x1="${x0}" x2="${x1}" y1="${ym}" y2="${ym}"/>`;
    if(p.sp!=null)body+=`<line class="cn" x1="${X(p.sp).toFixed(1)}" x2="${Math.min(xa,x1).toFixed(1)}" y1="${ym}" y2="${ym}"/>`;
    if(p.gold!=null)body+=`<circle class="au" cx="${X(p.gold).toFixed(1)}" cy="${ym}" r="4"/>`;
    if(p.sp!=null)body+=`<line class="sp" x1="${X(p.sp).toFixed(1)}" x2="${X(p.sp).toFixed(1)}" y1="${ym-8}" y2="${ym+8}"/>`;
    body+=`<circle class="art" cx="${xa.toFixed(1)}" cy="${ym}" r="5.5"/>`;
    if(over)body+=`<path class="ov" d="M${x1+5},${ym-5} L${x1+10},${ym} L${x1+5},${ym+5}"/><text class="ovl" x="${x1+14}" y="${ym+4}">${labPc(p.cagr,0)}</text>`;
    const plain=`${p.artist}, ${p.title}, ${p.y0} to ${p.y1}: ${labPc(p.cagr)} a year; S&P 500 total return ${labPc(p.sp)}; gold ${labPc(p.gold)}; ${labPc(p.real)} after inflation`;
    const tip=`<div class=k>${esc(p.artist)}, ${esc(p.title)}</div><div class=v>${labPc(p.cagr)} a year</div><div>${p.y0} ${esc(fmtUSD(p.p0))} → ${p.y1} ${esc(fmtUSD(p.p1))}, ${labYears(p.n)}</div><div>S&amp;P 500 ${labPc(p.sp)} · gold ${labPc(p.gold)} · real ${labPc(p.real)}</div>`;
    body+=`<rect class="hit" x="0" y="${yb}" width="${W}" height="${RH}" tabindex="0" role="graphics-symbol" aria-label="${esc(plain)}" data-tip="${esc(tip)}"/>`;});
  const S=labRetStats(P);
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(`Yearly return of ${S.n} repeat sales, ranked, each against the S&P 500 total return and gold over the same years; median ${labPc(S.med)} a year`)}"><g class="grid">${grid}</g>${body}</svg>`;}
const LAB_KEY={art:'<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="var(--gilt)"/></svg>',sp:'<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><line x1="7" x2="7" y1="1" y2="13" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"/></svg>',au:'<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="4" fill="var(--ink3)"/></svg>'};
function labRetTable(){const P=[...labP];const k=labRet.sort,s=labRet.dir==='asc'?1:-1;const val=p=>k==='artist'?labSurname(p.artist):k==='title'?p.title:p[k];
  P.sort((a,b)=>{const x=val(a),y=val(b);if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (typeof x==='string'?s*x.localeCompare(y):s*(x-y))||(b.cagr-a.cagr);});
  const th=([key,label,num])=>{const on=k===key;return `<th scope="col"${num?' class="n"':''}${on?` aria-sort="${labRet.dir==='asc'?'ascending':'descending'}"`:''}><button class="sortb${on?' on':''}" data-labsort="${key}">${esc(label)}<span class="ar" aria-hidden="true">${on?(labRet.dir==='asc'?'↑':'↓'):'↕'}</span></button></th>`;};
  const sign=x=>x==null?'':x>0?' up':x<0?' down':'';
  return `<caption class="sr">Repeat sales: price paid and price received for the same work, the yearly rate, and the S&P 500 total return and gold over the same years; sorted by ${esc((LAB_RET_COLS.find(c=>c[0]===k)||['','return'])[1].toLowerCase())}</caption><thead><tr>${LAB_RET_COLS.map(th).join('')}</tr></thead><tbody>${P.map(p=>`<tr${p.lot?` class="clk" data-lot="${esc(p.lot.id)}"`:''}><td class="k">${esc(p.artist)}</td><td class="t">${esc(p.title)}${!p.lot&&p.journey?` <button class="lnk" data-labjourney="${esc(p.journey.id)}">journey</button>`:''}</td><td class="n">${p.y0}</td><td class="n">${esc(fmtUSD(p.p0))}</td><td class="n">${p.y1}</td><td class="n">${esc(fmtUSD(p.p1))}</td><td class="n">${p.n}</td><td class="n g">${labPc(p.cagr)}</td><td class="n">${labPc(p.real)}</td><td class="n">${labPc(p.sp)}</td><td class="n">${labPc(p.gold)}</td><td class="n${sign(p.ex)}">${labPts(p.ex)}</td></tr>`).join('')}</tbody>`;}
function labRetLine(){const S=labRetStats(labP);return `Lab, Subhasta (${fdate(TODAY)}): ${S.n} repeat sales of ${S.works} works, ${S.from}–${S.to}; median ${labPc(S.med)} a year${S.ci?` (90% bootstrap interval ${labPc(S.ci.lo)} to ${labPc(S.ci.hi)})`:''}, ${labPc(S.real)} after inflation${S.cmp?`; ${S.beat} of ${S.cmp} beat the S&P 500 total return over the same years (median margin ${labPts(S.ex)})`:''}. Prices include buyer’s premium; survivors only; holding costs and selling fees excluded.${labBSrc().length?` Benchmarks: ${labBSrc().map(s=>s[0]).join('; ')}.`:''}`;}
function labRetCSV(){const base=location.href.split('#')[0],pc=x=>x==null?'':(x*100).toFixed(2);
  const rows=[['Artist','Work','Bought (year)','Paid (US$)','Bought: where, from whom','Sold (year)','Sold for (US$)','Sold: where','Years','Nominal a year (%)','Real a year (%)','S&P 500 total return a year (%)','Gold a year (%)','Margin over the S&P 500 (points)','Pair from','Link']];
  labP.forEach(p=>rows.push([p.artist,p.title,p.y0,Math.round(p.p0),p.w0||'',p.y1,Math.round(p.p1),p.w1||'',p.n,pc(p.cagr),pc(p.real),pc(p.sp),pc(p.gold),pc(p.ex),p.from==='chain'?'ownership chain (CHAINS)':'journey (JOURNEYS)',p.lot?base+'#lot-'+p.lot.id:'']));
  rows.push([],['Notes'],['Prices as reported, with buyer’s premium where published; private prices are press reports, not audited. Trophies that came back to market are a survivor sample. Holding costs and selling fees are excluded.'],['Benchmarks: annual averages of monthly values over the same calendar years. '+(labHasBench()&&BENCH.meta?BENCH.meta.note:'')],...labBSrc().map(s=>[s[0],s[1]]),['As of',TODAY]);
  return rowsCSV(rows);}
function labDrawRank(){const el=$('#labRank');if(!el)return;const W=labWidth(el);if(el.__w===W&&el.innerHTML)return;el.__w=W;el.innerHTML=labRankSVG(labP,W);bindTips(el);}
function labDrawRet(){const t=$('#labRetTbl');if(!t)return;t.innerHTML=labRetTable();
  $$('[data-labsort]',t).forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const k=b.dataset.labsort;if(labRet.sort===k)labRet.dir=labRet.dir==='asc'?'desc':'asc';else{labRet.sort=k;labRet.dir=(LAB_RET_COLS.find(c=>c[0]===k)||[])[2]?'desc':'asc';}store.set('lab.ret',{sort:labRet.sort,dir:labRet.dir});labDrawRet();focusEl($(`#labRetTbl [data-labsort="${k}"]`));}));
  $$('[data-labjourney]',t).forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();go('undertow');const el=$('#journey-'+b.dataset.labjourney);if(el){scrollToEl(el);focusEl(el);}}));
  bindLinks(t);markScrollables($('#lab-returns'));}
function labReturnsHTML(){const S=labRetStats(labP);const yN=labBLast(),part=labBPartial();const lose=S.losers[0];
  const read=S.n?`${labCap(words(S.n))} holding periods from ${words(S.works)} works, ${S.from} to ${S.to}. The median trophy gained ${labPc(S.med)} a year${S.real!=null?`, ${labPc(S.real)} after inflation`:''}${S.ci?`; resampling the ${words(S.n)} gives the median a 90% interval of ${labPc(S.ci.lo)} to ${labPc(S.ci.hi)} (sampling noise only; it does not undo the survivor bias below)`:''}${S.cmp?`; ${words(S.beat)} of ${words(S.cmp)} beat the S&amp;P 500 held over the same years, and the median margin over it is ${labPts(S.ex)}`:'; the benchmark series are missing, so no comparison is drawn'}.${lose?` ${S.losers.length===1?'One':labCap(words(S.losers.length))} lost money: ${esc(lose.title)}, bought for ${esc(fmtUSD(lose.p0))} in ${lose.y0} and sold for ${esc(fmtUSD(lose.p1))} in ${lose.y1}.`:''}`:'No work in the data has two priced sales a year apart.';
  const fig=(l,v,d,id)=>`<div class="lab-fg"${id?` id="${id}"`:''}><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
  return `<div class="lab-k">Instrument one · Returns</div><div class="rh"><h2 tabindex="-1">What trophies earned</h2><span class="sub">every work in the terminal sold twice with both prices known, against the S&amp;P 500 and gold over the same years</span></div>
  <p class="lab-read">${read}</p>
  <div class="lab-figs">${fig('Holding periods',S.n,`${S.works} works, median ${S.yrs==null?'—':labInt(S.yrs)} years held`)}${fig('Median a year',`<span id="labRetMed" data-v="${S.med==null?'':(S.med*100).toFixed(4)}">${labPc(S.med)}</span>`,`nominal, buyer’s premium in${S.ci?`; 90% interval <span id="labRetCI" data-lo="${(S.ci.lo*100).toFixed(4)}" data-hi="${(S.ci.hi*100).toFixed(4)}">${labPc(S.ci.lo)}–${labPc(S.ci.hi)}</span>`:''}`)}${fig('After inflation',labPc(S.real),'deflated by US CPI')}${fig('Beat the S&amp;P 500',S.share==null?'—':`${Math.round(S.share*100)}%`,`${S.beat} of ${S.cmp}, same years, dividends in`)}${fig('Median margin',labPts(S.ex),`over the S&amp;P 500’s ${labPc(S.sp)} a year`)}</div>
  <div class="lab-chartwrap"><div class="chart lab-rankc" id="labRank"></div><div class="legend lab-legend"><span>${LAB_KEY.art}The work, a year</span><span>${LAB_KEY.sp}S&amp;P 500 total return, same years</span><span>${LAB_KEY.au}Gold, same years</span><span class="faint">a rate beyond the scale sits at its edge, value shown</span></div></div>
  <div class="hsum lab-sum"><p>Sort by any column; a row with a lot opens it. Years are calendar years between the two sales; the benchmarks are annual averages${part?` (${esc(part)})`:''}.</p><div class="acts"><button class="btn sm" id="labRetCopy">Copy the line</button><button class="btn sm" id="labRetCsv">Download CSV</button></div></div>
  <div class="tblwrap"><table class="tbl lab-ret" id="labRetTbl"></table></div>
  <ul class="lab-notes">
    <li><b>A survivor sample.</b> Only trophies that came back to market, with both prices on record, can be measured; works that fell from favour rarely make the press, so the median flatters the trade. ${limLink('returns','The limits of these returns')}</li>
    <li><b>Prices include buyer’s premium</b> where it was published, so the second price is more than the seller received: the house keeps the premium and any commission. Private prices are press reports, not audited.</li>
    <li><b>Holding costs and selling fees are excluded</b>: insurance, storage, the seller’s commission and any resale royalty. <a href="#lab-roundtrip" data-labjump="roundtrip">The round trip</a> adds them back.</li>
    <li><b>Benchmarks</b> run over the same calendar years: the S&amp;P 500 with dividends reinvested, gold in dollars an ounce, and US CPI for the real rate${yN?`, ${labHasBench()?BENCH.years[0]:''}–${yN}`:''}. ${labBSrc().map(s=>`<a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(' · ')}${labHasBench()&&BENCH.meta&&BENCH.meta.vf?` ${vflag(BENCH.meta.vf)}`:''}</li></ul>
  ${labHasBench()&&BENCH.meta&&BENCH.meta.note?`<details class="dtab lab-method"><summary>how the benchmarks are made</summary><p class="note">${esc(BENCH.meta.note)} Generated ${esc(fdate(BENCH.meta.generated||''))} by tools/benchmarks.py.</p></details>`:''}`;}

/* ---------- 2. the round trip: buy, hold, sell ---------- */
const LAB_RT0={hammer:10,house:'sothebys',venue:'ny',dest:'nyc',years:10,ins:0.15,stor:null,comm:3,living:false,g:null};
let labRtS=null;
function labRtLoad(){const s=Object.assign({},LAB_RT0,store.get('lab.rt',null)||{});if(!SCHED[s.house])s.house=LAB_RT0.house;if(!VENUES[s.venue])s.venue=LAB_RT0.venue;if(!DESTS[s.dest])s.dest=VENUES[s.venue].homeDest&&DESTS[VENUES[s.venue].homeDest]?VENUES[s.venue].homeDest:Object.keys(DESTS)[0];
  s.hammer=labClamp(+s.hammer,0.01,2000,LAB_RT0.hammer);s.years=Math.round(labClamp(+s.years,1,30,LAB_RT0.years));s.ins=labClamp(+s.ins,0,5,LAB_RT0.ins);s.comm=labClamp(+s.comm,0,30,LAB_RT0.comm);
  s.stor=s.stor==null||s.stor===''?null:labClamp(+s.stor,0,1e8,null);s.g=s.g==null||s.g===''?null:labClamp(+s.g,-30,60,null);s.living=!!s.living;return s;}
/* a period's starting price in today's dollars (US CPI, the benchmarks' last year), for the like-for-like test: a 1990 price of $10m
   is about $25m now. A year before the CPI series starts keeps its nominal price */
const labReal0=p=>{const yN=labBLast(),a=yN==null?null:labB('cpi',p.y0),b=yN==null?null:labB('cpi',yN);return a&&b?p.p0*b/a:p.p0;};
const labLike=(p,H)=>{const r=labReal0(p);return r>=H/LAB_LIKE&&r<=H*LAB_LIKE;};
/* the default growth for a hammer: the median nominal rate of the repeat sales that began within a factor of ten of it in today's money
   (a sleeper bought for $1,175 grows at rates a $10m lot does not repeat); all the periods when fewer than three qualify */
function labRtGInfo(H){const all=labP.filter(p=>p.cagr!=null&&isFinite(p.cagr)),like=H?all.filter(p=>labLike(p,H)):[],use=like.length>=3?like:all;const m=labMedian(use.map(p=>p.cagr));return {g:m==null?0.05:m,n:use.length,all:all.length,like:use===like};}
const labRtGDefault=H=>labRtGInfo(H).g;
const labRtStorage=s=>s.stor==null?(DESTS[s.dest].storage||0):s.stor;
function labBisect(f,lo,hi){let a=f(lo),b=f(hi);if(!isFinite(a)||!isFinite(b)||a*b>0)return null;for(let i=0;i<200;i++){const mid=(lo+hi)/2,v=f(mid);if(v===0)return mid;if(v*a>0){lo=mid;a=v;}else hi=mid;}return (lo+hi)/2;}
/* the rate that sets the cash flows’ present value to zero (cf[t] at the end of year t; cf[0] today) */
const labIrr=cf=>labBisect(r=>cf.reduce((a,c,t)=>a+c/Math.pow(1+r,t),0),-0.9999,10);
/* entry = Follow the money’s buyer total for the same inputs; carry each year = insurance × the replacement value then (the price with premium,
   grown at the expected rate) + storage, paid at the start of the year; exit hammer = hammer × (1 + g)^T; proceeds = exit hammer less the
   seller’s commission and the resale royalty when the room deducts it from the seller (flowModel’s arrPayer: London and Paris charge the next buyer) */
function labRtModel(s){const p=Object.assign({},FLOW,{hammer:s.hammer*1e6,house:s.house,venue:s.venue,dest:s.dest,living:!!s.living,artist:null});const m=flowModel(p);
  const T=s.years,ins=m.D.insured?0:s.ins/100,comm=s.comm/100,stor=labRtStorage(s),g=s.g==null?labRtGDefault(s.hammer*1e6):s.g/100;   /* a destination that insures (the museum loan) carries no insurance */
  const run=gr=>{const carry=[];let insT=0;for(let t=0;t<T;t++){const i=ins*m.price*Math.pow(1+gr,t);insT+=i;carry.push(i+stor);}const Hx=m.H*Math.pow(1+gr,T);const x=flowModel(Object.assign({},p,{hammer:Hx}));
    const com=Hx*comm,roy=x.arrSeller,carryT=carry.reduce((a,b)=>a+b,0),proceeds=Hx-com-roy;return {carry,carryT,insT,storT:stor*T,Hx,com,roy,royBuyer:x.arrBuyer,proceeds,profit:proceeds-m.buyer-carryT};};
  const r=run(g);const cf=[-(m.buyer+r.carry[0])];for(let t=1;t<T;t++)cf.push(-r.carry[t]);cf.push(r.proceeds);
  const gs=labBisect(x=>run(x).profit,-0.99,10);const be=gs==null?null:run(gs);
  const yN=labBLast(),y0=yN==null?null:yN-T;const bm=k=>yN==null?null:labCagr(labB(k,y0),labB(k,yN),T);
  return {s,p,m,T,ins,comm,stor,g,r,cf,run,irr:labIrr(cf),gs,be,yN,y0,spT:bm('sp'),goldT:bm('gold'),cpiT:bm('cpi')};}
/* the same round trip at each repeat sale’s own rate (instrument one): how far the outcomes ran apart. Not odds: each rate belongs to its own
   years. A period is like for like when it began within a factor of ten of this hammer: a sleeper bought for $1,175 grows at a rate no
   $10m lot can repeat. Every period is drawn; only the like-for-like ones are counted in the reading */
const LAB_LIKE=10;
function labRtScen(R){const H=R.m.H;return labP.filter(p=>p.cagr!=null&&isFinite(p.cagr)).map(p=>{const r=R.run(p.cagr);const cf=[-(R.m.buyer+r.carry[0])];for(let t=1;t<R.T;t++)cf.push(-r.carry[t]);cf.push(r.proceeds);
  return {p,g:p.cagr,irr:labIrr(cf),profit:r.profit,real0:labReal0(p),like:labLike(p,H)};});}
/* a dot per period on one axis of net return a year: below nothing (a loss), between nothing and the S&P 500’s rate over the same number
   of years, above it; a hollow ring for a period that is not like for like. Dots stack upward where they would touch; each carries its
   tooltip; the table below holds every value. The axis stops at twice the upper quartile or 25% (it always shows nothing and the S&P 500);
   a dot beyond it sits past the edge with its value */
function labRtScenSVG(S,R,W){const pts=S.filter(x=>x.irr!=null&&isFinite(x.irr));if(!pts.length)return '';const sp=R.spT!=null&&isFinite(R.spT)?R.spT:null;
  const vs=pts.map(x=>x.irr).sort((p,q)=>p-q),q3=vs[Math.floor((vs.length-1)*0.75)];
  const cap=Math.max(0.25,2*Math.max(0,q3),sp==null?0:sp*1.2);const lo=Math.min(-0.02,vs[0],sp==null?0:sp),hi=Math.min(Math.max(0.02,vs[vs.length-1],sp==null?0:sp),cap);
  const span=hi-lo,pad=span*0.05;const a=lo-pad,b=hi+pad;const out=x=>x.irr>hi;const anyOut=pts.some(out);
  const x0=14,x1=W-(anyOut?58:14),X=v=>x0+(Math.min(v,b)-a)/(b-a)*(x1-x0);const r=5,gap=3,step=2*r+gap;const lanes=[];
  const P=pts.slice().sort((p,q)=>p.irr-q.irr).map(x=>{const cx=out(x)?x1+16:X(x.irr);let L=0;while(lanes[L]!=null&&cx-lanes[L]<step)L++;lanes[L]=cx;return {x,cx,L};});
  const nl=Math.max(1,lanes.length),top=30,base=top+nl*step+4,H=base+24;
  /* ticks inside the axis only, none within 12 px of either end of it */
  const tickStep=[0.01,0.02,0.05,0.1,0.2,0.5,1].find(t=>span/t<=7)||2;let ticks='';for(let t=Math.ceil(a/tickStep)*tickStep;t<=hi+1e-9;t+=tickStep){const tx=X(t);if(tx<x0+12||tx>x1-12)continue;ticks+=`<line class="sg" x1="${tx.toFixed(1)}" x2="${tx.toFixed(1)}" y1="${top-6}" y2="${base}"/><text class="st" x="${tx.toFixed(1)}" y="${base+16}" text-anchor="middle">${labPc(Math.round(t*1000)/1000,0)}</text>`;}
  /* a reference label runs away from the other one and never past the chart's edges */
  const ref=(v,label,cls,dir)=>{const rx=X(v),w=label.length*6.4;let anchor=dir;if(anchor==='start'&&rx+5+w>W-2)anchor='end';if(anchor==='end'&&rx-5-w<2)anchor='start';
    return `<line class="rl ${cls}" x1="${rx.toFixed(1)}" x2="${rx.toFixed(1)}" y1="${top-14}" y2="${base}"/><text class="rlt" x="${(rx+(anchor==='end'?-5:5)).toFixed(1)}" y="${top-16}" text-anchor="${anchor}">${esc(label)}</text>`;};
  const spLeft=sp!=null&&X(sp)<X(0);const refs=ref(0,'Break-even','z',spLeft?'start':'end')+(sp!=null?ref(sp,`S&P 500, ${labPc(sp)} a year`,'b',spLeft?'end':'start'):'');
  const edge=anyOut?`<line class="sa" x1="${x1+16}" x2="${x1+16}" y1="${top-6}" y2="${base}"/><text class="st" x="${x1+16}" y="${base+16}" text-anchor="middle">beyond</text>`:'';
  const dots=P.map(({x,cx,L})=>{const cy=base-6-r-L*step;const cls=!x.like?'unlike':x.irr<0?'loss':sp!=null&&x.irr>=0&&x.irr>sp?'beat':'mid';
    const tip=`${labSurname(x.p.artist)}, ${x.p.title}, ${x.p.y0}–${x.p.y1}${x.like?'':`, bought for ${fmtUSD(x.p.p0)}`}: ${labPc(x.g)} a year; this round trip ${labPc(x.irr)} a year net${x.like?'':' (not like for like)'}`;
    return `<circle class="sd ${cls}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}"/>${out(x)?`<text class="so" x="${(cx+r+4).toFixed(1)}" y="${(cy+4).toFixed(1)}">${labPc(x.irr,0)}</text>`:''}<circle class="sh" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="12" role="graphics-symbol" aria-label="${esc(tip)}" data-tip="${esc(tip)}"/>`;}).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="lab-scs" role="group" aria-label="${esc(`This round trip at the rate of each of ${pts.length} holding periods, net a year`)}"><line class="sa" x1="${x0}" x2="${x1}" y1="${base}" y2="${base}"/>${ticks}${refs}${edge}${dots}</svg>`;}
function labRtControls(s){const o=(v,l,sel)=>`<option value="${esc(v)}"${sel?' selected':''}>${esc(l)}</option>`;const gd=labRtGDefault(s.hammer*1e6);
  return `<div class="lab-f lab-wide lab-big"><label for="labRtH">Hammer, US$ m</label><input id="labRtH" type="number" min="0.05" max="2000" step="0.5" value="${s.hammer}" inputmode="decimal"></div>
  <div class="lab-f"><label for="labRtHouse">House</label><select id="labRtHouse">${Object.keys(SCHED).map(k=>o(k,houseName(k),s.house===k)).join('')}</select></div>
  <div class="lab-f"><label for="labRtVenue">Sale room, both ways</label><select id="labRtVenue">${Object.keys(VENUES).map(k=>o(k,VENUES[k].n,s.venue===k)).join('')}</select></div>
  <div class="lab-f lab-wide"><label for="labRtDest">Kept in</label><select id="labRtDest">${Object.keys(DESTS).map(k=>o(k,DESTS[k].n,s.dest===k)).join('')}</select></div>
  <div class="lab-f lab-wide"><label for="labRtT">Years held <b id="labRtTv">${s.years}</b></label><input id="labRtT" type="range" min="1" max="30" step="1" value="${s.years}"></div>
  <div class="lab-f"><label for="labRtIns">Insurance, % a year</label><input id="labRtIns" type="number" min="0" max="5" step="0.05" value="${s.ins}"></div>
  <div class="lab-f"><label for="labRtStor">Storage, US$ a year</label><input id="labRtStor" type="number" min="0" step="500" value="${labRtStorage(s)}"></div>
  <div class="lab-f"><label for="labRtComm">Commission at exit, %</label><input id="labRtComm" type="number" min="0" max="30" step="0.5" value="${s.comm}"></div>
  <div class="lab-f"><label for="labRtG">Growth, % a year</label><input id="labRtG" type="number" min="-30" max="60" step="0.1" value="${(s.g==null?gd*100:s.g).toFixed(1)}"></div>
  <label class="lab-chk lab-wide"><input id="labRtLiving" type="checkbox"${s.living?' checked':''}> Resale right applies: the artist is alive or died within 70 years, and is a UK, EEA or reciprocal national</label>
  <p class="lab-hint lab-wide" id="labRtHint"></p>
  <div class="lab-acts lab-wide"><button class="btn sm" id="labRtReset" type="button">Reset to the defaults</button><button class="btn sm" id="labRtFlow" type="button">Open the entry in Follow the money →</button></div>`;}
/* the waterfall: what goes in, what the years cost, what comes out */
function labWfSVG(R,W){const m=R.m,r=R.r,T=R.T;const L=[];let run=0;
  const up=(label,amt,kind)=>{if(!(amt>0.5))return;L.push({label,a:run,b:run+amt,kind,amt,sign:'+'});run+=amt;};
  const tot=(label,kind)=>L.push({label,a:0,b:run,kind,amt:run,total:true});
  L.push({label:'Hammer',a:0,b:m.H,kind:'base',amt:m.H,total:true});run=m.H;
  up('Buyer’s premium',m.prem,'cost');up('Taxes on the purchase',m.taxes,'cost');up('Resale royalty, buyer',m.arrBuyer,'cost');up('Shipping and transit insurance',m.ship,'cost');tot('Buyer’s all-in','sum');
  up(`Insurance and storage, ${labYears(T)}`,r.carryT,'cost');tot('Cost of ownership','sum');const cost=run;
  L.push({label:`Exit hammer, year ${T}`,a:0,b:r.Hx,kind:'gain',amt:r.Hx,total:true,gap:true});run=r.Hx;
  const down=(label,amt)=>{if(!(amt>0.5))return;L.push({label,a:run-amt,b:run,kind:'cost',amt,sign:'−'});run-=amt;};
  down(`Seller’s commission, ${labPc(R.comm,1)}`,r.com);down('Resale royalty, seller',r.roy);L.push({label:'Proceeds',a:0,b:run,kind:'gain',amt:run,total:true});
  const pr=r.proceeds-cost;L.push({label:pr>=0?'Profit before tax':'Loss before tax',a:Math.min(cost,r.proceeds),b:Math.max(cost,r.proceeds),kind:pr>=0?'pos':'neg',amt:Math.abs(pr),sign:pr>=0?'+':'−'});
  const wide=W>=560,LW=wide?Math.min(250,Math.round(W*0.3)):0,VR=92,RH=wide?27:42,top=6,bh=13;const x0=wide?LW+14:2,x1=W-VR;const mx=Math.max(...L.map(l=>l.b))||1;const X=v=>x0+v/mx*(x1-x0);
  let y=top,out='',prevB=null,costY=null;L.forEach(l=>{if(l.gap)y+=10;const yb=wide?y+7:y+21,xa=X(l.a),xb=X(l.b),w=Math.max(1.5,xb-xa);
    out+=wide?`<text class="wl${l.total?' t':''}" x="${LW}" y="${yb+10}" text-anchor="end">${esc(l.label)}</text>`:`<text class="wl${l.total?' t':''}" x="${x0}" y="${y+13}">${esc(l.label)}</text>`;
    /* a step hangs from the running total: a hairline from the bar above at the point where this one starts */
    /* on a narrow screen each label sits above its bar, so the hairlines would cross the words: they are drawn only when the labels stand in their own column */
    if(wide&&l.sign&&prevB!=null&&l.kind!=='pos'&&l.kind!=='neg'){const xc=l.sign==='−'?xb:xa;out+=`<line class="wc" x1="${xc.toFixed(1)}" x2="${xc.toFixed(1)}" y1="${prevB}" y2="${yb}"/>`;}
    if(wide&&(l.kind==='pos'||l.kind==='neg')){const xc=X(cost).toFixed(1);out+=`<line class="wg" x1="${xc}" x2="${xc}" y1="${costY}" y2="${yb+bh}"/>`;}
    out+=`<rect class="wb ${l.kind}" x="${xa.toFixed(1)}" y="${yb}" width="${w.toFixed(1)}" height="${bh}" rx="2"/><text class="wv${l.total?' t':''}" x="${W-2}" y="${yb+10}" text-anchor="end">${l.sign||''}${esc(fmtUSD(l.amt))}</text>`;
    if(l.label==='Cost of ownership')costY=yb+bh;prevB=yb+bh;y+=RH;});
  const H=y+4;const lab=`From entry to exit over ${labYears(T)}: buyer’s all-in ${fmtUSD(m.buyer)}, cost of ownership ${fmtUSD(cost)}, exit hammer ${fmtUSD(r.Hx)}, proceeds ${fmtUSD(r.proceeds)}, ${pr>=0?'profit':'loss'} ${fmtUSD(Math.abs(pr))} before tax`;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(lab)}">${out}</svg>`;}
/* the round trip’s yearly rate beside the benchmarks over the last T years */
function labCmpSVG(R,W){const rows=[['This round trip, net a year',R.irr,'irr'],['S&P 500 with dividends',R.spT,'b'],['Gold',R.goldT,'b'],['US inflation, CPI',R.cpiT,'c']];const vals=rows.map(r=>r[1]).filter(v=>v!=null&&isFinite(v));if(!vals.length)return '';
  const lo=Math.min(0,...vals),hi=Math.max(0.02,...vals);const wide=W>=520,LW=wide?Math.min(230,Math.round(W*0.34)):0,VR=64,RH=wide?26:40;const x0=wide?LW+14:2,x1=W-VR;const X=v=>x0+(v-lo)/(hi-lo)*(x1-x0);const H=rows.length*RH+6;
  let out=`<line class="z" x1="${X(0).toFixed(1)}" x2="${X(0).toFixed(1)}" y1="0" y2="${H-2}"/>`;rows.forEach((r,i)=>{const y=i*RH,yb=wide?y+7:y+21,v=r[1];
    out+=wide?`<text class="cl${r[2]==='irr'?' t':''}" x="${LW}" y="${yb+10}" text-anchor="end">${esc(r[0])}</text>`:`<text class="cl${r[2]==='irr'?' t':''}" x="${x0}" y="${y+13}">${esc(r[0])}</text>`;
    if(v!=null&&isFinite(v)){const xa=X(Math.min(0,v)),xb=X(Math.max(0,v));out+=`<rect class="cb ${r[2]}" x="${xa.toFixed(1)}" y="${yb}" width="${Math.max(1.5,xb-xa).toFixed(1)}" height="12" rx="2"/>`;}
    out+=`<text class="cv${r[2]==='irr'?' t':''}" x="${W-2}" y="${yb+10}" text-anchor="end">${labPc(v)}</text>`;});
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(`A year: this round trip ${labPc(R.irr)} net; over ${R.y0}–${R.yN}, the S&P 500 with dividends ${labPc(R.spT)}, gold ${labPc(R.goldT)}, US inflation ${labPc(R.cpiT)}`)}">${out}</svg>`;}
/* what size and time do to the break-even: the same house, room, destination, insurance, storage, commission and resale-right setting,
   across hammers and holding periods. The break-even does not depend on the growth typed in, so the grid is cached on everything else,
   including the two settings it takes from Follow the money: the imported-lot box and the shipping figure. */
const LAB_GRID_H=[0.5,1,5,10,25,100],LAB_GRID_T=[1,2,3,5,10,20];
let labGridKey='',labGridVal=null;
function labRtGrid(s){const key=[s.house,s.venue,s.dest,s.ins,s.comm,s.stor,!!s.living,!!FLOW.imported,FLOW.ship].join('|');if(key===labGridKey&&labGridVal)return labGridVal;
  labGridVal=LAB_GRID_T.map(T=>LAB_GRID_H.map(h=>labRtModel(Object.assign({},s,{hammer:h,years:T,g:null})).gs));labGridKey=key;return labGridVal;}
function labRtGridHTML(s){const G=labRtGrid(s);const vals=G.flat().filter(v=>v!=null&&isFinite(v));if(!vals.length)return '';const max=Math.max(...vals);
  const cur=(h,T)=>Math.abs(h-s.hammer)<1e-9&&T===s.years;const hl=h=>h<1?`$${h*1000}k`:`$${h}m`;const at=(h,T)=>G[LAB_GRID_T.indexOf(T)][LAB_GRID_H.indexOf(h)];
  const cell=(v,h,T)=>`<td class="n${cur(h,T)?' cur':''}" style="--w:${v==null?0:Math.max(0,Math.min(1,v/max)).toFixed(3)}">${labPc(v)}</td>`;
  /* one comparison along each axis: two sizes held as long as the case on screen (or five years), two holds at its hammer (or $10m) */
  const Tr=LAB_GRID_T.includes(s.years)?s.years:5,Hr=LAB_GRID_H.find(h=>Math.abs(h-s.hammer)<1e-9)||10;
  const tiers=SCHED[s.house]||[],r0=tiers.length?tiers[0][1]:null,r1=tiers.length?tiers[tiers.length-1][1]:null,falls=r0!=null&&r1<r0;
  /* the clause follows the numbers: size may change nothing (one premium rate, no fixed sums), and a capped resale royalty also favours a larger lot */
  const d1=at(1,Tr),d25=at(25,Tr),moves=d1!=null&&d25!=null&&Math.abs(d1-d25)>=0.0005,poss=esc(labPoss(houseName(s.house))),roy=!!(s.living&&VENUES[s.venue].arr);
  const why=!moves?`Size changes nothing here: ${poss} premium is ${r0==null?'one rate':`${Math.round(r0*100)}%`} at every size and no fixed sum is set`:falls?`Size helps because ${poss} premium falls from ${Math.round(r0*100)}% to ${Math.round(r1*100)}% of the hammer as lots grow${roy?', the resale royalty is capped':''} and shipping and storage are fixed sums`:`Size helps only because ${roy?'the resale royalty is capped and ':''}shipping and storage are fixed sums: ${poss} premium is ${r0==null?'one rate':`${Math.round(r0*100)}%`} at every size`;
  return `<div class="lab-h3">What size and time do to the break-even <span>${esc(houseName(s.house))}, ${esc(VENUES[s.venue].n)}, the same costs; the growth a year the market needs</span></div>
    <p class="lab-gridread">Size: held ${labYears(Tr)}, a $1m lot needs <b>${labPc(at(1,Tr))}</b> a year before you are whole and a $25m lot <b>${labPc(at(25,Tr))}</b>. Time: a ${hl(Hr)} lot needs <b>${labPc(at(Hr,2))}</b> a year if sold after two years and <b>${labPc(at(Hr,20))}</b> after twenty. ${why}; time helps because the cost of getting in is spread over more years.</p>
    <div class="tblwrap"><table class="tbl lab-grid" id="labRtGrid"><caption class="sr">Break-even growth a year, by years held (rows) and hammer (columns)</caption><thead><tr><th scope="col" class="hxy" aria-label="Years held, hammer"><span class="hx">Years held ↓</span><span class="hs"> · </span><span class="hx">hammer →</span></th>${LAB_GRID_H.map(h=>`<th scope="col" class="n">${hl(h)}</th>`).join('')}</tr></thead><tbody>${LAB_GRID_T.map((T,i)=>`<tr><th scope="row">${T}</th>${LAB_GRID_H.map((h,j)=>cell(G[i][j],h,T)).join('')}</tr>`).join('')}</tbody></table></div>`;}
function labRtDraw(){const s=labRtS;if(!s||!$('#labRtOut'))return;const R=labRtModel(s),m=R.m,r=R.r,T=R.T,GI=labRtGInfo(s.hammer*1e6),gd=GI.g;const yr=+TODAY.slice(0,4);
  const whose=GI.like?`the median of the ${words(GI.n)} repeat sales above that began within a factor of ten of this hammer in today’s money`:`the median of all ${words(GI.n)} repeat sales above (fewer than three began near this hammer)`;
  $('#labRtTv').textContent=T;$('#labRtHint').innerHTML=s.g==null?`Growth defaults to <b>${labPc(gd)}</b> a year, ${whose}; type your own. Works that came back to market flatter the trade: a selection-corrected study put repeat-sale returns at 6.5% a year, against 10% before correction.`:`Your growth, ${labPc(s.g/100)} a year; ${whose} is ${labPc(gd)}. <button class="lnk" id="labRtGBack" type="button">use the median</button>`;
  if(s.g==null){const gi=$('#labRtG');if(gi&&document.activeElement!==gi)gi.value=(gd*100).toFixed(1);}
  const back=$('#labRtGBack');if(back)back.addEventListener('click',()=>{s.g=null;$('#labRtG').value=(gd*100).toFixed(1);labRtSave();labRtDraw();});
  const part=labBPartial(),period=R.yN==null?'':`${R.y0}–${R.yN}${part&&+part.slice(0,4)===R.yN?`, ${R.yN} to ${part.split(' to ')[1]}`:''}`;
  const be=R.be,gs=R.gs;
  const rise=T===1?`The market must rise <b>${labPc(gs)}</b> in one year`:`The market must rise <b>${labPc(Math.pow(1+gs,T)-1,0)}</b> over ${labYears(T)}, <b>${labPc(gs)} a year</b>,`;
  const net=R.irr==null?'':R.irr>=0?`earns ${labPc(R.irr)} a year net`:`loses ${labPc(-R.irr)} a year net`;
  $('#labRtRead').innerHTML=gs==null?'For these inputs the break-even cannot be found.':`${rise} before you are whole: a hammer of ${esc(fmtUSD(be.Hx))} in ${yr+T} against ${esc(fmtUSD(m.H))} now.${R.irr!=null?` At ${labPc(R.g)} a year${s.g==null?(GI.like?', the like-for-like median of the repeat sales,':', the median of all the repeat sales,'):''} the round trip ${net}${R.spT!=null?(T===1?`; over the last year the S&amp;P 500 with dividends returned ${labPc(R.spT)}, gold ${labPc(R.goldT)}, and prices rose ${labPc(R.cpiT)}`:`; over the last ${labYears(T)} the S&amp;P 500 with dividends returned ${labPc(R.spT)} a year, gold ${labPc(R.goldT)}, and prices rose ${labPc(R.cpiT)} a year`):''}.`:''}`;
  const fig=(l,v,d,attrs)=>`<div class="lab-fg"${attrs||''}><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
  $('#labRtFigs').innerHTML=fig('Entry, buyer’s all-in',esc(fmtUSD(m.buyer)),`${(m.buyer/m.H*100-100).toFixed(1)}% above the hammer`,` id="labRtEntry" data-v="${Math.round(m.buyer)}"`)+fig(`Carry, ${labYears(T)}`,esc(fmtUSD(r.carryT)),`insurance ${esc(fmtUSD(r.insT))}, storage ${esc(fmtUSD(r.storT))}`)+fig(`Proceeds, year ${T}`,esc(fmtUSD(r.proceeds)),`exit hammer ${esc(fmtUSD(r.Hx))} at ${labPc(R.g)} a year`)+fig(r.profit>=0?'Profit before tax':'Loss before tax',esc(fmtUSD(Math.abs(r.profit))),`${(r.profit/(m.buyer+r.carryT)*100).toFixed(0)}% on the money put in`)+fig('Net IRR',labPc(R.irr),'a year, after every cost modelled')+fig('Break-even',`<span id="labRtBE" data-g="${gs==null?'':gs.toFixed(6)}">${labPc(gs)}</span>`,gs==null?'—':`a year; exit hammer ${esc(fmtUSD(be.Hx))}`);
  const wf=$('#labRtWf');wf.innerHTML=labWfSVG(R,labWidth(wf,0.66));
  const cm=$('#labRtCmp');cm.innerHTML=R.yN==null?'':`<div class="lab-h3">The same years in the markets <span>${esc(period)}</span></div>${labCmpSVG(R,labWidth(cm,0.66))}<p class="lab-cmpsrc">Annual averages: the S&amp;P 500 with dividends reinvested (Shiller, then FRED), gold in dollars an ounce (World Bank), US CPI (BLS); the round trip’s rate is net of every cost above. ${BENCH.meta&&BENCH.meta.vf?vflag(BENCH.meta.vf):''}</p>`;
  const sc=$('#labRtSc');if(sc){const all=labRtScen(R).filter(x=>x.irr!=null&&isFinite(x.irr));const like=all.filter(x=>x.like);const S=like.length>=3?like:all;
    const loss=S.filter(x=>x.irr<0).length,beat=R.spT!=null?S.filter(x=>x.irr>=0&&x.irr>R.spT).length:null,med=labMedian(S.map(x=>x.irr));
    const last=T===1?'the last year':`the last ${labYears(T)}`,next=T===1?'the next year':`the next ${labYears(T)}`;
    /* the clauses that have something in them, joined; a count of none is said once at the end */
    const mid=S.length-loss-(beat||0),spTxt=`the S&amp;P 500’s ${labPc(R.spT)} a year over ${last}`,cl=[];if(loss)cl.push(`loses money in ${words(loss)}`);
    if(beat!=null){if(mid)cl.push(`earns less than ${spTxt} in ${words(mid)}`);if(beat)cl.push(mid?`beats it in ${words(beat)}`:`beats ${spTxt} in ${words(beat)}`);}else if(S.length-loss)cl.push(`makes money in ${words(S.length-loss)}`);
    const said=(cl.length>1?cl.slice(0,-1).join(', ')+' and '+cl[cl.length-1]:cl[0]||'')+(beat===0?(mid?'; none beats it':`; none beats ${spTxt}`):'');
    const bound=v=>v>=1e9?`$${+(v/1e9).toPrecision(3)}bn`:v>=1e6?`$${+(v/1e6).toPrecision(3)}m`:`$${Math.round(v).toLocaleString('en-US')}`;
    const which=S===like&&like.length<all.length?`Of the ${words(all.length)} holding periods, ${words(like.length)} began between ${bound(m.H/LAB_LIKE)} and ${bound(m.H*LAB_LIKE)} in today’s money (US CPI), within a factor of ten of this hammer. At their rates`:`At the rate each of the ${words(all.length)} holding periods earned`;
    sc.innerHTML=all.length?`<div class="lab-h3">The same round trip at each period’s rate <span>the repeat sales of instrument one; net a year, after every cost above</span></div>
      <p class="lab-gridread" id="labRtScRead" data-n="${S.length}" data-all="${all.length}" data-loss="${loss}" data-beat="${beat==null?'':beat}">${which}, this round trip ${said}. The middle outcome is <b>${labPc(med)}</b> a year net.${S===like&&like.length<all.length?' The hollow rings are the others: a sleeper or a first sale grows at rates a lot of this size does not repeat.':''} Each rate belongs to its own years, so the spread shows how far outcomes ran apart, not the odds for ${next}; and every period is a survivor.</p>
      <div class="chart lab-sc">${labRtScenSVG(all,R,labWidth(sc,0.66))}</div>${chartDataDetails('The round trip at each period’s rate',['Work','Years','Bought for','In today’s money','Its rate a year','This round trip, net a year','Profit or loss','Like for like'],all.slice().sort((x,y)=>y.irr-x.irr).map(x=>[`${labSurname(x.p.artist)}, ${x.p.title}`,`${x.p.y0}–${x.p.y1}`,fmtUSD(x.p.p0),fmtUSD(x.real0),labPc(x.g),labPc(x.irr),`${x.profit<0?'−':''}${fmtUSD(Math.abs(x.profit))}`,x.like?'yes':'no']))}`:'';
    bindTips(sc);bindDataTables(sc);bindCopies(sc);}
  const gw=$('#labRtGridW');if(gw)gw.innerHTML=labRtGridHTML(s);
  const lines=[['Hammer',fmtUSD(m.H)],['Buyer’s premium',fmtUSD(m.prem)],['Taxes on the purchase',fmtUSD(m.taxes)],['Resale royalty paid by the buyer',fmtUSD(m.arrBuyer)],['Shipping and transit insurance',fmtUSD(m.ship)],['Buyer’s all-in (Follow the money)',fmtUSD(m.buyer)],[`Insurance, ${labYears(T)}`,fmtUSD(r.insT)],[`Storage, ${labYears(T)}`,fmtUSD(r.storT)],[`Exit hammer at ${labPc(R.g)} a year`,fmtUSD(r.Hx)],['Seller’s commission',fmtUSD(r.com)],['Resale royalty deducted from the seller',fmtUSD(r.roy)],['Proceeds',fmtUSD(r.proceeds)],[r.profit>=0?'Profit before tax':'Loss before tax',fmtUSD(Math.abs(r.profit))],['Net IRR, a year',labPc(R.irr)],['Break-even growth, a year',labPc(gs)],['Exit hammer at break-even',be?fmtUSD(be.Hx):'—']];
  $('#labRtLines').innerHTML=chartDataDetails('The round trip, line by line',['Line','US$'],lines);
  const V=VENUES[s.venue],roomRoy=V.arr?(V.arrPayer==='seller'?`deducted from the seller in ${esc(V.n)}`:`charged to the next buyer in ${esc(V.n)}, so it does not reduce your proceeds`):`none: ${esc(V.n)} has no resale right`;
  $('#labRtNote').innerHTML=`Entry is Follow the money’s buyer total for the same hammer, house, room, destination and resale-right setting, with its shipping assumption of ${esc(fmtUSD(m.ship))} and its imported-lot box ${m.imported?'ticked: the lot was imported into the room':'unticked'}; both are set in Follow the money.${m.D.insured?' On a museum loan the museum insures, so the insurance line is nil, and the use tax is deferred, not removed.':''} Carry: insurance on the replacement value (the price with premium, grown at the expected rate) plus storage, paid at the start of each year. Resale royalty at exit: ${s.living?roomRoy:'not applied (the box is unticked)'}. Not modelled: financing, capital-gains tax (it depends on residence) and currency moves; the London, Paris, Geneva and Hong Kong rooms convert at today’s rates. ${limLink('returns','The limits of this reading')}`;
  bindTips($('#labRtOut'));bindCopies($('#labRtLines'));bindDataTables($('#labRtLines'));markScrollables($('#labRtOut'));}
function labRtSave(){store.set('lab.rt',labRtS);}
function labRtBind(){const ctl=$('#labRtCtl');if(!ctl)return;
  const num=(id,d)=>{const v=parseFloat($('#'+id).value);return isFinite(v)?v:d;};
  ctl.addEventListener('input',e=>{const s=labRtS,id=e.target&&e.target.id;s.hammer=labClamp(num('labRtH',s.hammer),0.01,2000,s.hammer);s.house=$('#labRtHouse').value;s.venue=$('#labRtVenue').value;s.dest=$('#labRtDest').value;
    s.years=Math.round(labClamp(num('labRtT',s.years),1,30,s.years));s.ins=labClamp(num('labRtIns',s.ins),0,5,s.ins);s.comm=labClamp(num('labRtComm',s.comm),0,30,s.comm);s.living=$('#labRtLiving').checked;
    if(id==='labRtStor')s.stor=labClamp(num('labRtStor',0),0,1e8,0);if(id==='labRtDest'&&s.stor==null)$('#labRtStor').value=labRtStorage(s);
    if(id==='labRtG'){const g=parseFloat($('#labRtG').value);s.g=isFinite(g)?labClamp(g,-30,60,null):null;}
    labRtSave();labRtDraw();});
  ctl.addEventListener('change',e=>{if(e.target&&e.target.type==='checkbox'&&labRtS.living!==e.target.checked){labRtS.living=e.target.checked;labRtSave();labRtDraw();}});
  labRtBindButtons();}
function labRtBindButtons(){const r=$('#labRtReset');if(r&&!r.__l){r.__l=1;r.addEventListener('click',()=>{labRtS=Object.assign({},LAB_RT0);labRtSave();$('#labRtCtl').innerHTML=labRtControls(labRtS);labRtBindButtons();labRtDraw();toast('Round trip reset to the defaults');});}
  const f=$('#labRtFlow');if(f&&!f.__l){f.__l=1;f.addEventListener('click',()=>{const s=labRtS;Object.assign(FLOW,{hammer:Math.round(s.hammer*1e6/1000)*1000,house:s.house,venue:s.venue,dest:s.dest,living:!!s.living,artist:null,touched:true});go('undertow');initFlow();window.scrollTo({top:0});toast(`Follow the money: ${fmtUSD(FLOW.hammer)} at ${houseName(s.house)}, ${VENUES[s.venue].n}`);});}}
function labRoundtripHTML(){return `<div class="lab-k">Instrument two · Holding</div><div class="rh"><h2 tabindex="-1">The round trip: buy, hold, sell</h2><span class="sub">what a trophy costs to own, and what the market must do before you are whole</span></div>
  <div class="lab-rt"><div class="lab-rtc" id="labRtCtl">${labRtControls(labRtS)}</div>
  <div class="lab-rto" id="labRtOut"><p class="lab-read" id="labRtRead" aria-live="polite"></p><div class="lab-figs lab-figs3" id="labRtFigs"></div><div class="chart lab-wf" id="labRtWf"></div><div class="lab-cmp chart" id="labRtCmp"></div><div id="labRtSc"></div><div id="labRtGridW"></div><div id="labRtLines"></div><p class="note lab-rtnote" id="labRtNote"></p></div></div>`;}

/* ---------- 3. how concentrated the market is ---------- */
const labHHI=shares=>shares.reduce((a,s)=>a+Math.pow(100*s,2),0);
function labStructure(){const M=MARKET;const yrs=Array.isArray(MARKET.bigThreeYears)?MARKET.bigThreeYears:[],H=Array.isArray(MARKET.bigThree)?MARKET.bigThree:[];
  const big=yrs.map((y,i)=>{const v=H.map(h=>Array.isArray(h[1])?h[1][i]:null);if(!v.length||v.some(x=>typeof x!=='number'||!(x>0)))return null;const t=v.reduce((a,b)=>a+b,0);const sh=v.map(x=>x/t);return {y,t,sh,hhi:labHHI(sh)};}).filter(Boolean);
  const cs=Object.entries(COUNTRY_SHARE||{}).filter(e=>typeof e[1]==='number'&&e[1]>0).sort((a,b)=>b[1]-a[1]);const ctot=cs.reduce((a,c)=>a+c[1],0);
  const ser=(SERIES.shares||[]).filter(r=>Array.isArray(r)&&r[1]);const s0=ser[0],s1=ser[ser.length-1];
  const seg=(M.segments||[]).find(s=>Array.isArray(s)&&/\$1m\s*\+/.test(s[0]));const segLots=seg?(String(seg[1]).match(/([<>≈~]?)\s*(\d+(?:\.\d+)?)%\s*of\s+lots/i)||null):null,segVal=seg?(String(seg[1]).match(/(\d+(?:\.\d+)?)%\s*of\s+(?:auction\s+)?value/i)||null):null;
  const low=l=>{if(/^under/i.test(l))return 0;const m=String(l).match(/\$(\d+(?:\.\d+)?)\s*(k|m|bn)?/i);if(!m)return null;return +m[1]*({k:1e3,m:1e6,bn:1e9}[(m[2]||'').toLowerCase()]||1);};
  const bands=(SERIES.bands2025||[]).filter(b=>Array.isArray(b)&&typeof b[1]==='number');const btot=bands.reduce((a,b)=>a+b[1],0),bTop=bands.filter(b=>low(b[0])>=1e6).reduce((a,b)=>a+b[1],0);
  const ps=RESULTS.map(r=>r.price).filter(v=>v>0).sort((a,b)=>a-b),n=ps.length,ptot=ps.reduce((a,b)=>a+b,0);const gini=n&&ptot?(2*ps.reduce((a,v,i)=>a+(i+1)*v,0))/(n*ptot)-(n+1)/n:null;
  const desc=[...ps].reverse();const top10=desc.slice(0,10).reduce((a,b)=>a+b,0)/ptot;let half=0,acc=0;for(const v of desc){acc+=v;half++;if(acc>=ptot/2)break;}
  const topLot=RESULTS.reduce((m,r)=>!m||r.price>m.price?r:m,null);
  const group=f=>Object.entries(RESULTS.reduce((o,r)=>{const k=f(r);o[k]=(o[k]||0)+r.price;return o;},{})).sort((a,b)=>b[1]-a[1]);
  /* concentration across artists counts named artists only: a lot with no artist (ARTIST_DIED false: a watch, a car, a dinosaur) is left out */
  const noArt=RESULTS.filter(r=>typeof ARTIST_DIED!=='undefined'&&ARTIST_DIED[r.artist]===false),art=RESULTS.filter(r=>!noArt.includes(r));const atot=art.reduce((a,r)=>a+r.price,0);
  const byArtist=Object.entries(art.reduce((o,r)=>{o[r.artist]=(o[r.artist]||0)+r.price;return o;},{})).sort((a,b)=>b[1]-a[1]),artHHI=atot?labHHI(byArtist.map(a=>a[1]/atot)):null,top5=atot?byArtist.slice(0,5).reduce((a,b)=>a+b[1],0)/atot:null;
  const byDecade=Object.entries(RESULTS.reduce((o,r)=>{const d=String(r.date||'').slice(0,3);if(/^\d{3}$/.test(d)){const k=d+'0s';o[k]=(o[k]||0)+r.price;}return o;},{})).sort((a,b)=>a[0].localeCompare(b[0]));
  return {big,H,cs,ctot,s0,s1,seg,segLots,segVal,bands,btot,bTop,n,ptot,gini,top10,half,topLot,byHouse:group(r=>houseName(r.house)),byCat:group(r=>r.cat),byArtist,atot,noArt,artHHI,top5,byDecade};}
const LAB_SHARE_NAMES={us:'the United States',uk:'the United Kingdom',cn:'China',fr:'France'};
const labCountry=c=>c.replace(/^United States of America$/,'United States');
const labThe=c=>/^(United|Netherlands|Czech Republic|Philippines)\b/.test(c)?'the '+c:c;
function labStructureHTML(){const X=labStructure();const card=(l,v,sp,d,s,src,flag)=>`<div class="vt lab-card"><div class="l">${l}</div><div class="row"><div class="v">${v}</div>${sp?`<div class="sp">${sp}</div>`:''}</div><div class="d">${d}</div><div class="s">${s}</div><div class="lab-src">${src}${flag||''}</div></div>`;
  const cards=[];const floor3=X.H.length?Math.round(1e4/X.H.length):null;
  if(X.big.length&&X.H.length>=2){const a=X.big[0],b=X.big[X.big.length-1],hi=X.big.reduce((m,x)=>x.hhi>m.hhi?x:m,a),lo=X.big.reduce((m,x)=>x.hhi<m.hhi?x:m,a);const two=[...b.sh].sort((p,q)=>q-p);const lead=X.H.map((h,i)=>[h[0],b.sh[i]]).sort((p,q)=>q[1]-p[1]);
    cards.push(card(`The ${words(X.H.length)} big houses among themselves, ${b.y}`,labInt(b.hhi),spark(X.big.map(x=>[x.y,x.hhi]),110,34),`${labInt(a.hhi)} in ${a.y}; range ${labInt(lo.hhi)}–${labInt(hi.hhi)}`,`${esc(lead[0][0])} and ${esc(lead[1][0])} take ${Math.round((two[0]+two[1])*100)}% of the ${words(X.H.length)} houses’ sales; with ${words(X.H.length)} firms the index cannot fall below ${labInt(floor3)}.`,'HHI of the houses’ reported sales (MARKET.bigThree)'));}
  if(X.cs.length>=4){const t4=X.cs.slice(0,4),s4=t4.reduce((a,c)=>a+c[1],0)/X.ctot,hc=labHHI(X.cs.map(c=>c[1]/X.ctot));
    const verdict=hc>2500?'highly concentrated by either line':hc>1800?'highly concentrated by the 2023 line, not by the 2010 one':hc>1500?'moderately concentrated by the 2010 line':'below both lines';
    cards.push(card('Top four countries’ share of sales',labPc(s4,0),'',t4.map(c=>`${esc(labCountry(c[0]))} ${Math.round(c[1]/X.ctot*100)}%`).join(' · '),`Across ${X.cs.length} countries the index is ${labInt(hc)}: ${verdict}. ${esc(labCap(labThe(labCountry(X.cs[0][0]))))} alone contributes ${labInt(Math.pow(100*X.cs[0][1]/X.ctot,2))} of it.`,'HHI of the 2025 shares on the Atlas (COUNTRY_SHARE)'));}
  if(X.s0&&X.s1&&X.s0!==X.s1){const ks=['us','uk','cn'].filter(k=>typeof X.s0[1][k]==='number'&&typeof X.s1[1][k]==='number');const ch=ks.map(k=>[k,X.s1[1][k]-X.s0[1][k]]).sort((p,q)=>Math.abs(q[1])-Math.abs(p[1]));const top=ch[0];
    const clause=([k,d])=>d<0?`${LAB_SHARE_NAMES[k]} gave up ${Math.abs(d)} ${Math.abs(d)===1?'point':'points'}`:d>0?`${LAB_SHARE_NAMES[k]} gained ${d} ${d===1?'point':'points'}`:`${LAB_SHARE_NAMES[k]} held ${X.s1[1][k]}%`;
    cards.push(card(`The US, the UK and China, ${X.s0[0]}–${X.s1[0]}`,`${top[1]>0?'+':top[1]<0?'−':'±'}${Math.abs(top[1])} pts`,'',ks.map(k=>`${({us:'US',uk:'UK',cn:'China'})[k]} ${X.s0[1][k]}% → ${X.s1[1][k]}%`).join(' · '),`${labCap(ch.map(clause).join('; '))}.`,`shares of global sales (SERIES.shares), ${X.s0[0]} and ${X.s1[0]}:`,` ${vflag(X.s0[2])}${vflag(X.s1[2])}`));}
  if(X.segVal){const lots=X.segLots?`${X.segLots[1]==='<'?'under ':X.segLots[1]?X.segLots[1]:''}${X.segLots[2]}%`:'';const bs=X.btot&&X.bTop?X.bTop/X.btot:null;
    const few=X.segLots&&X.segLots[1]==='<'&&+X.segLots[2]<=1&&+X.segVal[1]>50?'Fewer than one lot in a hundred carries more than half the money. ':'';
    cards.push(card('Works above $1m: value against lots',`${X.segVal[1]}%`,'',`of auction value${lots?`, from ${esc(lots)} of lots`:''}, 2025`,`${few}${bs!=null?`Artnet’s price bands give ${labPc(bs,0)}: ${bn(X.bTop)} of ${bn(X.btot)} in fine-art auctions changed hands above $1m.`:''}`,'MARKET.segments (Art Basel &amp; UBS report) and SERIES.bands2025 (Artnet)'));}
  if(X.gini!=null)cards.push(card(`Inequality of the ${X.n} prices in this terminal`,X.gini.toFixed(2),'',`Gini coefficient; ${X.n} lots, ${esc(mm(X.ptot))} in all`,`0 would be equal prices, 1 one lot taking everything. ${X.n>=10?`The ten dearest take ${labPc(X.top10,0)} and half`:'Half'} the value sits in the ${words(X.half)} dearest lots${X.topLot?`; ${esc(X.topLot.title)} alone is ${labPc(X.topLot.price/X.ptot)}`:''}. Every lot here is a marquee lot, so the whole market is more top-heavy than this sample shows.`,'computed from RESULTS, prices with premium'));
  if(X.byArtist.length>=5){const ha=X.artHHI,line=ha>2500?'highly concentrated by either line':ha>1800?'highly concentrated by the 2023 line, not by the 2010 one':ha>1500?'moderately concentrated by the 2010 line':'below both lines';
    const t5=Math.round(X.top5*100),pts=labRound(X.byArtist.slice(0,5).map(a=>a[1]/X.atot*100),t5);const cats=[...new Set(X.noArt.map(r=>r.cat))];
    const left=X.noArt.length?` The ${words(X.noArt.length)} ${X.noArt.length===1?'lot':'lots'} with no named artist${cats.length?`, in ${esc(labList(cats))},`:''} ${X.noArt.length===1?'is':'are'} left out.`:'';
    cards.push(card('The top five artists’ share',`${t5}%`,'',X.byArtist.slice(0,5).map((a,i)=>`${esc(labSurname(a[0]))} ${pts[i]}%`).join(' · '),`Of ${esc(mm(X.atot))} paid for the work of ${X.byArtist.length} named artists.${left} The index across artists is ${labInt(ha)}, ${line}: ${ha<=1500?`no single name dominates, though five carry ${t5}% of the money`:'a few names carry the trophy market'}.`,'computed from RESULTS, prices with premium'));}
  const hb=(rows,label,tot,dp)=>`<div class="lab-hb"><div class="lab-h3">${esc(label)}</div>${hbars(rows.map(r=>[r[0],r[1]]),r=>`${mm(r[1])} <small>${(r[1]/(tot||X.ptot)*100).toFixed(dp||0)}%</small>`,'')}</div>`;
  const yearsTbl=X.big.length?chartDataDetails('HHI of the big houses’ sales by year, with each house’s share',['Year','HHI',...X.H.map(h=>h[0]+', %')],X.big.map(b=>[b.y,labInt(b.hhi),...b.sh.map(s=>(s*100).toFixed(1))])):'';
  return `<div class="lab-k">Instrument three · Structure</div><div class="rh"><h2 tabindex="-1">How concentrated the market is</h2><span class="sub">the houses, the countries, the price bands and the terminal’s own ${words(X.n)} lots</span></div>
  <p class="lab-read">The Herfindahl–Hirschman index adds up the squares of the market shares in per cent: 10,000 is a monopoly and a crowd of small firms scores near zero. Above 2,500 counts as highly concentrated under the <a href="https://www.justice.gov/atr/horizontal-merger-guidelines-08192010" target="_blank" rel="noopener">2010 US Horizontal Merger Guidelines</a>; the <a href="https://www.justice.gov/atr/2023-merger-guidelines" target="_blank" rel="noopener">2023 Merger Guidelines</a> lowered that line to 1,800.</p>
  <div class="vitals lab-cards">${cards.join('')}</div>${yearsTbl}
  <div class="lab-two">${hb(X.byHouse,`Value by house, the ${X.n} lots`)}${hb(X.byCat,`Value by category, the ${X.n} lots`)}</div>
  <div class="lab-two">${hb(X.byArtist.slice(0,8),`Value by artist, the eight largest of ${X.byArtist.length} named artists`,X.atot,1)}${hb(X.byDecade,`Value by decade of sale, the ${X.n} lots`)}</div>
  <p class="note lab-snote">The big-house index measures the houses against each other, not their share of the whole market, which the data does not give house by house; their reported totals include private sales. Country shares are of global sales by value. Prices include buyer’s premium. Sources: ${(MARKET.sources||[]).filter(s=>Array.isArray(s)&&/Art Basel|results/i.test(s[0])).map(s=>`<a href="${esc(s[1])}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(' · ')}; the price bands as on the Pulse (Artnet).</p>`;}

/* ---------- 5. how much of this terminal is verified ---------- */
/* the data constants, read lazily (a missing one is skipped): the flags and the source addresses are counted across all of them */
const LAB_DATA=()=>[['HOUSES',()=>HOUSES],['PLAYERS',()=>PLAYERS],['RESULTS',()=>RESULTS],['PRIVATE_TREATY',()=>PRIVATE_TREATY],['RECORDS',()=>RECORDS],['MARKET',()=>MARKET],['HERO',()=>HERO],['SIGNALS',()=>SIGNALS],['NEWS',()=>NEWS],['CALENDAR',()=>CALENDAR],['FEEDS',()=>FEEDS],['FEES',()=>FEES],['PROV_CASES',()=>PROV_CASES],['DEALERS',()=>DEALERS],['APIS',()=>APIS],['CAREERS',()=>CAREERS],['GLOSSARY',()=>GLOSSARY],['TIMELINES',()=>TIMELINES],['CHAINS',()=>CHAINS],['COLLECTORS',()=>COLLECTORS],['STORIES',()=>STORIES],['EVIDENCE',()=>EVIDENCE],['PEOPLE',()=>PEOPLE],['ROUTES',()=>ROUTES],['UPCOMING',()=>UPCOMING],['REEL',()=>REEL],['STATIONS',()=>STATIONS],['ATLAS',()=>ATLAS],['CHECKS',()=>CHECKS],['JOURNEYS',()=>JOURNEYS],['VENUES',()=>VENUES],['DESTS',()=>DESTS],['PULSE_SRC',()=>PULSE_SRC],['VITALS',()=>VITALS],['SERIES',()=>SERIES],['SYMPTOMS',()=>SYMPTOMS],['LONGVIEW',()=>LONGVIEW],['RECORDS2',()=>RECORDS2],['DISPATCHES',()=>DISPATCHES],['HUBS',()=>HUBS],['REGIMES',()=>REGIMES],['SEGMENTS',()=>SEGMENTS],['FAIRS',()=>FAIRS],['LENS_REGIONS',()=>LENS_REGIONS],['INSTITUTIONS',()=>INSTITUTIONS],['INST_FACTS',()=>INST_FACTS],['REPORTS',()=>REPORTS],['TRADE',()=>TRADE],['CORRIDORS',()=>CORRIDORS],['ATTENTION',()=>ATTENTION],['RATES',()=>RATES],['FXSERIES',()=>FXSERIES],['FLOW_SRC',()=>FLOW_SRC],['CIRCLE',()=>CIRCLE],['BENCH',()=>BENCH],['NAV_RULES',()=>NAV_RULES],['NAV_EU',()=>NAV_EU],['NAV_FEES',()=>NAV_FEES],['NAV_MOSCOW',()=>NAV_MOSCOW],['EVENTS',()=>EVENTS],['THESES',()=>THESES],['HORIZON_SIGNALS',()=>HORIZON_SIGNALS],['NET_PLAYERS',()=>NET_PLAYERS],['NET_MARKETS',()=>NET_MARKETS],['LOT_FIN',()=>LOT_FIN],['NET_FLOWS',()=>NET_FLOWS],['NET_YEARS',()=>NET_YEARS],['TRANSFORM',()=>TRANSFORM],['NET_WIRE',()=>NET_WIRE],['NET_RUSSIA',()=>NET_RUSSIA],['VAULTS',()=>VAULTS],['VAULT_CITIES',()=>VAULT_CITIES],['DEAL',()=>DEAL],['PITCH',()=>PITCH],['OPEN_FEEDS',()=>OPEN_FEEDS],['HOLD_VEHICLES',()=>HOLD_VEHICLES],['TIDES',()=>TIDES],['CURRENTS',()=>CURRENTS],['WHISPERS',()=>WHISPERS],['PLAYBOOKS',()=>PLAYBOOKS],['CASES',()=>CASES],['WALLS',()=>WALLS],['SOURCES',()=>SOURCES],['HOUSE_VALUE',()=>HOUSE_VALUE],['TECH_EDGE',()=>TECH_EDGE],['HAMMER_UNSOLD',()=>HAMMER_UNSOLD],['SCHOOL',()=>SCHOOL]];
const labGet=g=>{try{return g();}catch(e){return null;}};
const HAMMER_NEW_ROWS=()=>typeof HAMMER_NEW==='object'&&Array.isArray(HAMMER_NEW)&&typeof HAMMER_NEW_KEYS==='object'?HAMMER_NEW.map(r=>Array.isArray(r)?Object.fromEntries(HAMMER_NEW_KEYS.map((k,i)=>[k,r[i]])):r):[];
/* where each flagged collection shows, and its name there; a collection that gains flags later is counted under Elsewhere by its constant’s name */
const LAB_CF_WHERE={VITALS:['pulse','Vital signs'],SYMPTOMS:['pulse','Diagnoses'],LONGVIEW:['pulse','The long view'],RECORDS2:['pulse','Artist records'],DISPATCHES:['pulse','Dispatches'],SERIES:['pulse','Chart points'],RATES:['pulse','ECB reference rates'],FXSERIES:['pulse','Month-end currency series'],HUBS:['atlas','Hubs'],SEGMENTS:['atlas','Segments'],INSTITUTIONS:['atlas','Institutions'],REGIMES:['atlas','Regimes'],ATLAS:['undertow','Undercurrents'],JOURNEYS:['undertow','Journeys'],RESULTS:['hammer','Lots (the first collections)'],BENCH:['lab','Benchmark series'],NAV_RULES:['navigator','Rules by jurisdiction'],NAV_EU:['navigator','EU rules'],NAV_FEES:['navigator','Fees'],NAV_MOSCOW:['navigator','The Moscow case'],EVENTS:['season','Events'],THESES:['horizon','Theses'],HORIZON_SIGNALS:['horizon','Signals'],NET_PLAYERS:['net','Players'],NET_MARKETS:['net','Markets'],LOT_FIN:['net','The money behind the sales'],NET_FLOWS:['net','Flows'],NET_YEARS:['net','Years'],TRANSFORM:['transform','Stages'],NET_WIRE:['net','Wire'],NET_RUSSIA:['net','Russia'],VAULTS:['collectors','Vaults'],VAULT_CITIES:['collectors','Vault cities'],DEAL:['deal','Terms, cases, people'],PITCH:['circle','The pitch'],OPEN_FEEDS:['sources','Open feeds'],HOLD_VEHICLES:['transform','Holding vehicles'],TIDES:['tides','Tides'],CURRENTS:['currents','Currents'],WHISPERS:['whispers','Whispers'],PLAYBOOKS:['playbooks','Playbooks'],CASES:['cases','Cases'],WALLS:['walls','Walls'],SOURCES:['sources','Sources'],HOUSE_VALUE:['circle','Where the value is'],TECH_EDGE:['circle','The tech edge'],HAMMER_UNSOLD:['hammer','Unsold lots'],SCHOOL:['school','The School']};
const LAB_CF_SECT=[['pulse','Pulse'],['atlas','Atlas'],['undertow','Undertow'],['lab','Lab'],['hammer','Hammer'],['navigator','Navigator'],['season','Season'],['horizon','Horizon'],['net','Net'],['transform','Transformation'],['collectors','Collectors'],['deal','Deal Room'],['tides','Tides'],['currents','Currents'],['whispers','Whispers'],['playbooks','Playbooks'],['cases','Cases'],['walls','Walls'],['sources','Sources'],['circle','Circle'],['school','School'],['other','Elsewhere']];
function labFlags(){const F={},OK=v=>v==='V'||v==='S'||v==='U';const add=(name,f)=>{if(!OK(f))return;const r=F[name]||(F[name]={V:0,S:0,U:0});r[f]++;};
  /* vf on any record, at any depth, in any constant */
  LAB_DATA().forEach(([name,g])=>{const seen=new Set();const walk=x=>{if(!x||typeof x!=='object'||seen.has(x))return;seen.add(x);if(Array.isArray(x)){x.forEach(walk);return;}if(typeof x.vf==='string')add(name,x.vf);for(const k in x)if(k!=='vf')walk(x[k]);};walk(labGet(g));});
  /* the flags that are not called vf: v on the undercurrents and the journeys, the sixth column of the artist records, the third element of a chart point */
  (labGet(()=>ATLAS)||[]).forEach(a=>add('ATLAS',a.v));(labGet(()=>JOURNEYS)||[]).forEach(j=>add('JOURNEYS',j.v));(labGet(()=>RECORDS2)||[]).forEach(r=>add('RECORDS2',r[5]));
  Object.values(labGet(()=>SERIES)||{}).forEach(a=>{if(Array.isArray(a))a.forEach(p=>{if(Array.isArray(p))add('SERIES',p[2]);});});
  /* the 139 lots of the first collections carry no flag: they count as unconfirmed under the Hammer (the v29 audit, finding 1) */
  (labGet(()=>RESULTS)||[]).forEach(r=>{if(!OK(r.vf))add('RESULTS',r.vf||'U');});
  const rows=Object.entries(F).map(([name,c])=>{const w=LAB_CF_WHERE[name]||['other',name.charAt(0)+name.slice(1).toLowerCase().replace(/_/g,' ')];return {name,sect:w[0],label:w[1],V:c.V,S:c.S,U:c.U,n:c.V+c.S+c.U};});
  /* records in a flagged list that carry no flag (the lint warns on them; the badge would read unverified) */
  const bare=[['VITALS','vf'],['SYMPTOMS','vf'],['LONGVIEW','vf'],['HUBS','vf'],['SEGMENTS','vf'],['INSTITUTIONS','vf'],['REGIMES','vf'],['DISPATCHES','vf'],['ATLAS','v'],['JOURNEYS','v']].reduce((a,[n,f])=>{const arr=labGet((LAB_DATA().find(d=>d[0]===n)||[])[1]||(()=>null));return a+(Array.isArray(arr)?arr.filter(x=>x&&!['V','S','U'].includes(x[f])).length:0);},0)+(labGet(()=>RECORDS2)||[]).filter(r=>!['V','S','U'].includes(r[5])).length;
  const sects=LAB_CF_SECT.map(([k,label])=>{const rs=rows.filter(r=>r.sect===k).sort((a,b)=>b.n-a.n);return {k,label,rows:rs,V:rs.reduce((a,r)=>a+r.V,0),S:rs.reduce((a,r)=>a+r.S,0),U:rs.reduce((a,r)=>a+r.U,0)};}).filter(s=>s.rows.length).map(s=>Object.assign(s,{n:s.V+s.S+s.U}));
  const T={V:sects.reduce((a,s)=>a+s.V,0),S:sects.reduce((a,s)=>a+s.S,0),U:sects.reduce((a,s)=>a+s.U,0)};T.n=T.V+T.S+T.U;return {sects,T,rows,bare};}
/* every distinct http(s) address in the data: whole-string URLs as they stand, addresses inside prose up to the first space */
function labUrls(){const set=new Set(),hosts=new Set(),re=/https?:\/\/[^\s"'<>]+/g;const one=u=>{set.add(u);try{hosts.add(new URL(u).hostname.replace(/^www\./,''));}catch(e){}};
  LAB_DATA().forEach(([n,g])=>{const seen=new Set();const walk=x=>{if(x==null)return;if(typeof x==='string'){const t=x.trim();if(/^https?:\/\/\S+$/.test(t))one(t);else (t.match(re)||[]).forEach(u=>one(u.replace(/[.,;:!?’”)\]]+$/,'')));return;}if(typeof x!=='object'||seen.has(x))return;seen.add(x);if(Array.isArray(x))x.forEach(walk);else for(const k in x)walk(x[k]);};walk(labGet(g));});
  return {n:set.size,hosts:hosts.size};}
function labDated(){const items=[];const add=(d,what)=>{if(typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d))items.push([d,what]);};
  (labGet(()=>NEWS)||[]).forEach(n=>add(n.dt,`wire: ${n.h}`));(labGet(()=>DISPATCHES)||[]).forEach(x=>add(x.d,`dispatch: ${x.h}`));RESULTS.forEach(r=>add(r.date,`result: ${r.artist}, ${r.title}`));
  const R=labGet(()=>RATES);if(R)add(R.asof,'the ECB reference rates');const FS=labGet(()=>FXSERIES);if(FS&&Array.isArray(FS.dates))add(FS.dates[FS.dates.length-1],'the month-end currency series');
  items.sort((a,b)=>a[0].localeCompare(b[0]));const lv=(labGet(()=>LONGVIEW)||[]).filter(l=>typeof l.y==='number').sort((a,b)=>a.y-b.y)[0];
  /* items sharing the newest date are named together */
  const top=items.length?items[items.length-1][0]:null,same=items.filter(i=>i[0]===top).map(i=>i[1]);
  return {newest:top?[top,same.length>2?`${same.slice(0,2).join(', ')} and ${same.length-2} more`:same.join(' and ')]:null,oldest:items[0],lv};}
const labLc=s=>/^[A-Z][a-z]/.test(s)?s.charAt(0).toLowerCase()+s.slice(1):s;
const labStack=(c,h,label)=>{const n=c.V+c.S+c.U;if(!n)return '';let x=0;const gap=n>1?0.6:0;const seg=(k,cls)=>{const w=c[k]/n*100;if(!w)return '';const r=`<rect class="${cls}" x="${x.toFixed(2)}" y="0" width="${Math.max(0.4,w-gap).toFixed(2)}" height="${h}"/>`;x+=w;return r;};
  return `<svg class="lab-stack" viewBox="0 0 100 ${h}" preserveAspectRatio="none" height="${h}" role="img" aria-label="${esc(`${label}: ${c.V} verified, ${c.S} secondary, ${c.U} unverified`)}">${seg('V','v')}${seg('S','s')}${seg('U','u')}</svg>`;};
function labConfidenceHTML(){const C=labFlags(),T=C.T,U=labUrls(),D=labDated();const pct=k=>T.n?T[k]/T.n:0;
  const daysAfter=d=>Math.round((Date.parse(d)-Date.parse(TODAY))/864e5);
  const read=T.n?`Of ${labInt(T.n)} flagged figures, ${labPc(pct('V'),0)} are verified against a primary or reputable source, ${labPc(pct('S'),0)} rest on a reputable secondary source and ${labPc(pct('U'),0)} could not be confirmed and say so. ${C.bare?`${labCap(words(C.bare))} ${C.bare===1?'record':'records'} in the flagged lists ${C.bare===1?'carries':'carry'} no flag and ${C.bare===1?'reads':'read'} as unverified.`:'Every record in the flagged lists carries its flag.'}`:'No flagged figure was found in the data.';
  const fig=(l,v,d,attrs)=>`<div class="lab-fg"${attrs||''}><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
  /* a section row names its view (a link when the view exists), a collection row sits under it, the total closes the table */
  const row=(r,kind)=>{const cell=kind==='sub'?'td':'th',name=kind==='sec'&&VIEWS.includes(r.k)&&r.k!=='lab'?`<button class="lnk lab-go" data-go="${esc(r.k)}">${esc(r.label)}</button>`:`<span>${esc(r.label)}</span>`;
    return `<tr class="${kind}" data-n="${r.n}" data-v="${r.V}" data-s="${r.S}" data-u="${r.U}"><${cell}${cell==='th'?' scope="row"':''} class="nm">${name}${labStack(r,kind==='sub'?6:9,r.label)}</${cell}><td class="n">${labInt(r.n)}</td><td class="n">${labInt(r.V)}</td><td class="n">${labInt(r.S)}</td><td class="n">${labInt(r.U)}</td><td class="n">${r.n?labPc(r.V/r.n,0):'—'}</td></tr>`;};
  const counted=C.sects.flatMap(s=>s.rows.map(r=>`${labLc(r.label)} (${r.name}, ${r.n})`));
  const line=`Subhasta (${fdate(TODAY)}): ${T.n} flagged figures, ${labPc(pct('V'),0)} verified, ${labPc(pct('S'),0)} secondary, ${labPc(pct('U'),0)} unverified; ${labInt(U.n)} distinct source addresses on ${labInt(U.hosts)} sites; figures verified ${MARKET.verified}.`;
  const nd=D.newest?daysAfter(D.newest[0]):0;
  return `<div class="lab-k">Instrument six · Confidence</div><div class="rh"><h2 tabindex="-1">How much of this terminal is verified</h2><span class="sub">every flagged figure in the data, counted where it shows</span></div>
  <p class="lab-read">${read}</p>
  <div class="lab-figs">${fig('Flagged figures',labInt(T.n),`in ${C.rows.length} collections`,` id="labCfTotal" data-n="${T.n}"`)}${fig('Verified',labPc(pct('V'),0),`${labInt(T.V)} figures ${vflag('V')}`)}${fig('Secondary',labPc(pct('S'),0),`${labInt(T.S)} figures ${vflag('S')}`)}${fig('Unverified',labPc(pct('U'),0),`${labInt(T.U)} figures ${vflag('U')}`)}${fig('Source addresses',labInt(U.n),`distinct http(s) links on ${labInt(U.hosts)} sites`)}</div>
  <div class="lab-cfgrid"><div class="tblwrap"><table class="tbl lab-cf" id="labCf"><caption class="sr">Verification flags by section and collection: count, verified, secondary, unverified, share verified</caption><thead><tr><th scope="col">Section, collection</th><th scope="col" class="n">Figures</th><th scope="col" class="n">V</th><th scope="col" class="n">S</th><th scope="col" class="n">U</th><th scope="col" class="n">Verified</th></tr></thead>
  <tbody>${C.sects.map(s=>row(s,'sec')+s.rows.map(r=>row(r,'sub')).join('')).join('')}</tbody><tfoot>${row(Object.assign({label:'All sections',k:''},T),'tot')}</tfoot></table></div>
  <div class="lab-cfside"><dl class="lab-dates"><div><dt>Figures verified</dt><dd>${esc(MARKET.verified)}</dd></div><div><dt>Terminal date</dt><dd>${esc(fdate(TODAY))}</dd></div>${D.newest?`<div><dt>Newest dated item</dt><dd>${esc(fdate(D.newest[0]))}<small>${esc(D.newest[1])}${nd>0?`, ${words(nd)} ${nd===1?'day':'days'} after the terminal’s date`:''}</small></dd></div>`:''}${D.lv?`<div><dt>Oldest dated item</dt><dd>${D.lv.y}<small>the long view: ${esc(firstSentence(D.lv.t))}</small></dd></div>`:D.oldest?`<div><dt>Oldest dated item</dt><dd>${esc(fdate(D.oldest[0]))}<small>${esc(D.oldest[1])}</small></dd></div>`:''}</dl>
  <div class="lab-cfacts"><button class="btn sm copy" data-v="${esc(line)}">Copy the count</button></div>
  <p class="note lab-cfnote">Counted: ${esc(counted.join(', '))}. A flag is <b>vf</b> on a record (any collection, at any depth), <b>v</b> on an undercurrent or a journey, the sixth column of an artist record and the third element of a chart point; ${esc(MARKET.verified)} is the one verification date every V flag carries. Source addresses are every distinct http(s) link in the data files, the benchmarks’ included.</p></div></div>${labLimitsHTML()}`;}

/* what the terminal cannot tell you: the limits register (LIMITS in data_circle.js), grouped by area (#lab-limits-<area>), each limit with
   the place it qualifies; the sections it qualifies link here */
function labLimitsHTML(){const L=typeof LIMITS!=='undefined'&&Array.isArray(LIMITS)?LIMITS:[];if(!L.length)return '';const T=typeof ciTokens==='function'?ciTokens():{};
  const navName=v=>{const b=$(`#nav button[data-v="${v}"]`);return b?b.textContent.trim():v.charAt(0).toUpperCase()+v.slice(1);};
  const at=a=>{if(!Array.isArray(a))return '';const [k,v]=a;if(k==='go'&&VIEWS.includes(v))return `<button class="lnk" data-go="${esc(v)}">${esc(navName(v))}</button>`;if(k==='lab'){const i=LAB_INSTR.find(x=>x[0]===v);return i?`<a class="lnk" href="#lab-${esc(v)}" data-labjump="${esc(v)}">${esc(i[1])}</a>`:'';}if(k==='under'&&ATL(v))return `<button class="lnk" data-under="${esc(v)}">${esc(ATL(v).t)}</button>`;return '';};
  const areas=Object.keys(LIMIT_AREAS).filter(a=>L.some(l=>l.area===a));
  return `<div class="lab-lim" id="lab-limits"><h3 class="lab-h3" tabindex="-1">What the terminal cannot tell you<span>${words(L.length)} limits of its models and data, each linked to the place it qualifies</span></h3>
   <div class="lab-limg">${areas.map(a=>`<section class="lab-lima" id="lab-limits-${esc(a)}" aria-labelledby="lab-limh-${esc(a)}"><h4 id="lab-limh-${esc(a)}">${esc(LIMIT_AREAS[a])}</h4><ul>${L.filter(l=>l.area===a).map(l=>`<li id="lim-${esc(l.id)}"><b>${esc(ciFill(l.t,T))}.</b> ${esc(ciFill(l.b,T))}${l.at?` <span class="lab-limat">${at(l.at)}</span>`:''}${l.src?` <a class="lab-limsrc" href="${esc(l.src[1])}" target="_blank" rel="noopener">${esc(l.src[0])}</a>`:''}</li>`).join('')}</ul></section>`).join('')}</div></div>`;}
/* a link from a section to the limits that qualify it */
const limLink=(area,label)=>`<a class="limlink" href="#lab-limits-${esc(area)}">${esc(label||'What this cannot tell you')}</a>`;

/* ---------- the page ---------- */
function labJump(id){const t=document.getElementById('lab-'+id);if(!t)return;setHash('lab-'+id);scrollToEl(t);   /* the address follows the instrument, so a copied link or a reload returns to it */const h=$('h2',t);if(h){if(!h.hasAttribute('tabindex'))h.tabIndex=-1;focusEl(h);}}
function labRedraw(){labDrawRank();if(labRtS)labRtDraw();if(typeof labhDraw==='function')labhDraw();}
let labResizeT=null;
function renderLab(){const el=$('#v-lab');if(!el)return;labP=labPairs();labRtS=labRtLoad();
  el.innerHTML=`<div class="head"><div><h1>Lab</h1><p class="dek">Six instruments that measure the trade: what trophies earned, what owning one costs, how concentrated the market is, how the ownership histories account for 1933 to 1945, how long owners held and who sold to the Gallery’s founders, and how much of this terminal is verified.</p></div></div>
  <nav class="lab-chips" aria-label="The six instruments">${LAB_INSTR.map(([id,n],i)=>`<a class="chip" href="#lab-${id}" data-labjump="${id}"><span class="n">${i+1}</span>${esc(n)}</a>`).join('')}</nav>
  <div class="grid lab">
  <div class="sect c12 lab-sect" id="lab-returns">${labReturnsHTML()}</div>
  <div class="sect c12 lab-sect" id="lab-roundtrip">${labRoundtripHTML()}</div>
  <div class="sect c12 lab-sect" id="lab-structure">${labStructureHTML()}</div>
  <div class="sect c12 lab-sect" id="lab-provenance"></div>
  <div class="sect c12 lab-sect" id="lab-hands"></div>
  <div class="sect c12 lab-sect" id="lab-confidence">${labConfidenceHTML()}</div>
  </div>`;
  labDrawRank();labDrawRet();labRtBind();labRtDraw();
  $$('[data-labjump]',el).forEach(a=>a.addEventListener('click',e=>{e.preventDefault();labJump(a.dataset.labjump);}));
  $('#labRetCopy').addEventListener('click',()=>copyText(labRetLine(),$('#labRetCopy')));$('#labRetCsv').addEventListener('click',()=>offerFile(`subhasta-lab-returns-${TODAY}.csv`,labRetCSV(),'CSV'));
  bindLinks(el);bindTips(el);bindCopies($('#lab-confidence'));bindCopies($('#lab-structure'));bindDataTables(el);
  if(typeof labProvenance==='function'){try{labProvenance($('#lab-provenance'));}catch(err){reportError(err,'lab provenance');}}
  if(typeof labHands==='function'){try{labHands($('#lab-hands'));}catch(err){reportError(err,'lab hands');}}
  /* the charts are drawn at the column’s width: again once the view is visible, and after a resize */
  const later=()=>{if($('#v-lab').classList.contains('on'))labRedraw();};if(window.requestAnimationFrame)requestAnimationFrame(later);else setTimeout(later,0);   /* one deferred redraw */
  window.addEventListener('resize',()=>{clearTimeout(labResizeT);labResizeT=setTimeout(later,180);});}
