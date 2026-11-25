/* ---- v35: English and Russian. The reader picks a language in the header (EN / RU, remembered in this browser). Russian comes as one
   pack (i18n/ru.json on the website; an asset in the artifacts, I18N_ASSETS, filled by build.py) made by tools/gen_i18n.py from the
   translators' files in data/i18n/ru/:
     data  {"ev.<id>.n": "…", "cent.<year>.life": "…", …} — the historical layer's own fields, set in place on HISTORY, WORLD_NOW, HIST_PICS,
           MOVE_TODAY, OBJECTS and MOVEMENTS while Russian is on (the English is kept and put back when the reader returns to English);
     pol   {"<English name of a state or people>": "…"} — the names on the historical map, read by the globe as it draws;
     ui    {"<English text, numbers written #>": "…"} — the interface: each text node and each placeholder, title and aria-label the page
           draws is matched as a whole (its numbers written #) and replaced; what is not in the pack stays English.
   The Russia layer (src/russia.js) is bilingual in its own data and reads L10N.lang directly. Wikipedia pictures and summaries come from
   the Russian Wikipedia when Russian is on (the English title resolved through the article's language links). Names: l10n/L10N. */
const I18N_ASSETS={};
const L10N={lang:'en',pack:null,busy:false,failed:false,en:new Map(),obs:null,queued:new Set(),raf:0,
  pol(n){const p=this.pack&&this.pack.pol;return (p&&p[n])||n;},
  name(n){if(this.lang!=='ru')return n;const p=this.pack&&this.pack.names;return (p&&p[n])||n;},   /* v36: a painter's name in the reader's language */
  t(s){if(this.lang!=='ru')return s;const r=l10nText(s);return r==null?s:r;}};
function l10nUrl(){if(I18N_ASSETS.ru)return I18N_ASSETS.ru;if(typeof inArtifact==='function'&&inArtifact())return null;if(!/^https?:$/.test(location.protocol))return null;return 'i18n/ru.json';}
/* the field a data key names: [object, field] or null */
function l10nSlot(key){const i=key.indexOf('.');if(i<0)return null;const kind=key.slice(0,i),rest=key.slice(i+1);const H=typeof HISTORY==='object'&&HISTORY?HISTORY:{};
  const last=rest.lastIndexOf('.');if(last<0)return null;const head=rest.slice(0,last),f=rest.slice(last+1);
  const byId=(arr,id)=>(arr||[]).find(x=>String(x.id)===id);
  const sub=(h,re)=>{const m=h.match(re);return m;};
  switch(kind){
    case 'ev':{const o=byId(H.events,head);return o?[o,f]:null;}
    case 'won':{const o=byId(H.wonders,head);return o?[o,f]:null;}
    case 'cent':{let m=sub(head,/^(-?\d+)\.powers\.(\d+)$/);if(m){const c=(H.centuries||[]).find(x=>String(x.y)===m[1]);const p=c&&c.powers&&c.powers[+m[2]];return p?[p,f]:null;}const c=(H.centuries||[]).find(x=>String(x.y)===head);return c?[c,f]:null;}
    case 'ppl':{let m=sub(head,/^(.+)\.works\.(\d+)$/);if(m){const p=byId(H.people,m[1]);const w=p&&p.works&&p.works[+m[2]];return w?[w,f]:null;}const p=byId(H.people,head);return p?[p,f]:null;}
    case 'cty':{let m=sub(head,/^(.+)\.m\.(\d+)$/);if(m){const c=byId(H.cities,m[1]);const x=c&&c.moments&&c.moments[+m[2]];return x?[x,f]:null;}const c=byId(H.cities,head);return c?[c,f]:null;}
    case 'con':{const W=typeof WORLD_NOW==='object'&&WORLD_NOW?WORLD_NOW:{};const o=byId(W.conflicts,head);return o?[o,f]:null;}
    case 'wev':{const W=typeof WORLD_NOW==='object'&&WORLD_NOW?WORLD_NOW:{};const o=byId(W.events,head);return o?[o,f]:null;}
    case 'pic':{const P=typeof HIST_PICS==='object'&&HIST_PICS?HIST_PICS:{};const o=P[head];return o?[o,f]:null;}
    case 'mvt':{const M=typeof MOVE_TODAY==='object'&&MOVE_TODAY?MOVE_TODAY:{};let m=sub(head,/^(.+)\.o\.(\d+)$/);if(m){const x=M[m[1]]&&M[m[1]].owners&&M[m[1]].owners[+m[2]];return x?[x,f]:null;}
      if(f==='sync'&&M[head])return [M[head],'sync'];m=sub(head,/^(.+)\.sync$/);if(m&&M[m[1]]&&M[m[1]].sync&&typeof M[m[1]].sync==='object')return [M[m[1]].sync,f];return null;}
    case 'obc':{const O=typeof OBJECTS==='object'&&OBJECTS?OBJECTS:{};const o=byId(O.categories,head);return o?[o,f]:null;}
    case 'obj':{const O=typeof OBJECTS==='object'&&OBJECTS?OBJECTS:{};const o=byId(O.objects,head);return o?[o,f]:null;}
    case 'mov':{const M=typeof MOVEMENTS==='object'&&Array.isArray(MOVEMENTS)?MOVEMENTS:[];const o=byId(M,head);return o?[o,f]:null;}
  }return null;}
function l10nApplyData(on){const D=L10N.pack&&L10N.pack.data;if(!D)return 0;let n=0;
  for(const k of Object.keys(D)){const s=l10nSlot(k);if(!s)continue;const [o,f]=s;if(typeof o[f]!=='string'&&o[f]!=null)continue;
    if(on){if(!L10N.en.has(k))L10N.en.set(k,o[f]);o[f]=D[k];n++;}else if(L10N.en.has(k)){o[f]=L10N.en.get(k);n++;}}
  return n;}
/* the interface: a text matched whole, its numbers written # */
const L10N_NUM=/\d+(?:[.,]\d+)*/g;
function l10nText(s){const U=L10N.pack&&L10N.pack.ui;if(!U)return null;const t=s.replace(/\s+/g,' ').trim();if(!t||t.length>260)return null;let r=U[t];
  if(r==null){const nums=t.match(L10N_NUM);if(!nums)return null;const k=t.replace(L10N_NUM,'#');r=U[k];if(r==null)return null;let i=0;r=r.replace(/#/g,()=>i<nums.length?nums[i++]:'#');}
  const lead=s.match(/^\s*/)[0],tail=s.match(/\s*$/)[0];return lead+r+tail;}
function l10nNode(root){if(L10N.lang!=='ru'||!root)return;
  if(root.nodeType===3){const p=root.parentElement;if(!p||p.closest('script,style,textarea,[translate="no"],[data-l10n="no"],code,kbd'))return;const r=l10nText(root.nodeValue);if(r!=null&&r!==root.nodeValue)root.nodeValue=r;return;}
  if(root.nodeType!==1||root.closest&&root.closest('script,style,[translate="no"],[data-l10n="no"]'))return;
  for(const a of ['placeholder','title','aria-label','aria-valuetext']){if(root.hasAttribute&&root.hasAttribute(a)){const r=l10nText(root.getAttribute(a));if(r!=null)root.setAttribute(a,r);}}
  if(root.querySelectorAll)root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el=>{if(el.closest('[translate="no"],[data-l10n="no"]'))return;for(const a of ['placeholder','title','aria-label']){const v=el.getAttribute(a);if(v){const r=l10nText(v);if(r!=null)el.setAttribute(a,r);}}});
  const w=document.createTreeWalker(root,4,null);let n;const list=[];while((n=w.nextNode()))list.push(n);for(const x of list)l10nNode(x);}
function l10nObserve(on){if(typeof MutationObserver!=='function')return;if(on&&!L10N.obs){L10N.obs=new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData')L10N.queued.add(m.target);else for(const x of m.addedNodes)L10N.queued.add(x);if(m.type==='attributes')L10N.queued.add(m.target);}
      if(!L10N.raf)L10N.raf=(window.requestAnimationFrame||setTimeout)(()=>{L10N.raf=0;const q=[...L10N.queued];L10N.queued.clear();L10N.obs.disconnect();try{for(const x of q)l10nNode(x);}finally{L10N.obs.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});}});});
    L10N.obs.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});}
  else if(!on&&L10N.obs){L10N.obs.disconnect();L10N.obs=null;}}
/* switch: load the pack if needed, set the data, redraw the view; the header button shows the other language */
function l10nSet(lang,opts){lang=lang==='ru'?'ru':'en';try{localStorage.setItem('subhasta.lang',lang);}catch(e){}
  if(lang==='ru'&&!L10N.pack){if(L10N.busy)return;const u=l10nUrl();if(!u||typeof fetch!=='function'){L10N.failed=true;l10nButton();return;}L10N.busy=true;l10nButton();
    fetch(u,{cache:'force-cache'}).then(r=>r.ok?r.json():null).then(j=>{L10N.busy=false;if(!j){L10N.failed=true;l10nButton();return;}L10N.pack=j;l10nSet('ru',{force:true});}).catch(()=>{L10N.busy=false;L10N.failed=true;l10nButton();});return;}
  const was=L10N.lang;L10N.lang=lang;document.documentElement.setAttribute('lang',lang);document.documentElement.dataset.lang=lang;
  if(was!==lang||(opts&&opts.force)){l10nApplyData(lang==='ru');l10nObserve(lang==='ru');if(typeof WIKI_PIC==='object'&&WIKI_PIC&&WIKI_PIC.clear)WIKI_PIC.clear();
    if(!(opts&&opts.quiet)){try{if(typeof rendered==='object'){for(const k of Object.keys(rendered))delete rendered[k];}if(typeof renderView==='function'&&typeof current==='string')renderView(current);}catch(e){}
      try{if(window.__WORLD&&typeof window.__WORLD.rebuild==='function')window.__WORLD.rebuild();}catch(e){}
      if(lang==='ru')l10nNode(document.body);}}
  l10nButton();}
function l10nButton(){const b=document.getElementById('langBtn');if(!b)return;const ru=L10N.lang==='ru';b.querySelector('.tx').textContent=ru?'EN':'RU';b.setAttribute('aria-label',ru?'Switch to English':'Переключить на русский');b.title=L10N.failed?'The Russian texts could not be loaded here':ru?'English':'Русский';b.classList.toggle('busy',!!L10N.busy);b.setAttribute('translate','no');}
function l10nInit(){const b=document.getElementById('langBtn');if(b)b.addEventListener('click',()=>l10nSet(L10N.lang==='ru'?'en':'ru'));let s=null;try{s=localStorage.getItem('subhasta.lang');}catch(e){}if(s==='ru')l10nSet('ru');else l10nButton();}
/* Wikipedia in the reader's language: the Russian title of an English article, through its language links (cached) */
const L10N_WT=new Map();
function l10nWikiTitle(enTitle){if(L10N.lang!=='ru')return Promise.resolve({lang:'en',title:enTitle});if(L10N_WT.has(enTitle))return L10N_WT.get(enTitle);
  const p=(typeof fetch==='function'?fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&lllang=ru&redirects=1&format=json&origin=*&titles=${encodeURIComponent(enTitle)}`).then(r=>r.ok?r.json():null).then(j=>{const pg=j&&j.query&&j.query.pages?Object.values(j.query.pages)[0]:null;const ll=pg&&pg.langlinks&&pg.langlinks[0];const t=ll&&(ll['*']||ll.title);return t?{lang:'ru',title:t}:{lang:'en',title:enTitle};}).catch(()=>({lang:'en',title:enTitle})):Promise.resolve({lang:'en',title:enTitle}));
  L10N_WT.set(enTitle,p);return p;}
window.__L10N={set:(l,o)=>l10nSet(l,o),load:j=>{L10N.pack=j;},pol:n=>L10N.pol(n),name:n=>L10N.name(n),get lang(){return L10N.lang;},text:s=>l10nText(s),slot:k=>l10nSlot(k)};
