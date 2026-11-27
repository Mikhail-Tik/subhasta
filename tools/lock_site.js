#!/usr/bin/env node
/* tools/lock_site.js (v37) — the website behind a password.

     SITE_PASSWORD=… node tools/lock_site.js docs

   Run by .github/workflows/pages.yml on the copy of docs/ it deploys (the repository keeps the plain page). It gzips docs/index.html,
   encrypts it with AES-256-GCM under a key derived from the password (PBKDF2-SHA-256, 600,000 rounds, a fresh 16-byte salt and 12-byte
   IV each deploy), writes the result to docs/site.bin and replaces docs/index.html with a small gate: the reader types the password, the
   browser derives the same key, fetches site.bin, decrypts and unpacks it (WebCrypto, DecompressionStream) and writes the page in place.
   "Remember me" keeps the derived key (not the password) in this browser for that deploy's salt; a new deploy asks again only if the
   password changed. Without SITE_PASSWORD the site is closed: the gate says so and site.bin is not written (fails closed).
   What stays public: the other files beside the page (pictures, i18n/ru.json, live/*.json, kb/index.json, hist/*.json) and the
   repository itself (github.com/Mikhail-Tik/subhasta is public, docs/index.html included). */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { webcrypto } = require('crypto');
const dir = process.argv[2] || 'docs';
const indexF = path.join(dir, 'index.html'), binF = path.join(dir, 'site.bin');
const ROUNDS = 600000;
const pw = process.env.SITE_PASSWORD || '';

function gate(opts) {
  const closed = !!opts.closed;
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Subhasta</title><meta name="robots" content="noindex,nofollow">
<style>
:root{--bg:#f4f0e6;--fg:#1c1a17;--mute:#6b645a;--rule:#d9d1c1;--gilt:#8a6a24;--err:#9b2c22;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#121110;--fg:#ece6da;--mute:#a59d8f;--rule:#34302a;--gilt:#c9a45a;--err:#e0857a;color-scheme:dark}}
*{box-sizing:border-box}html,body{height:100%}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 "Instrument Sans",system-ui,-apple-system,Segoe UI,sans-serif;display:grid;place-items:center;padding:24px max(16px,env(safe-area-inset-left,0px))}
main{width:min(380px,100%)}
.w{font:400 30px/1 "Libre Caslon Display",Georgia,serif;letter-spacing:.32em;margin:0 0 6px}.w b{font-weight:400;color:var(--gilt)}
.m{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin:0 0 28px}
label{display:block;font-size:13px;color:var(--mute);margin:0 0 6px}
input[type=password]{width:100%;font:inherit;font-size:16px;padding:11px 12px;border:1px solid var(--rule);border-radius:6px;background:transparent;color:var(--fg)}
input[type=password]:focus{outline:2px solid var(--gilt);outline-offset:1px}
.r{display:flex;align-items:center;gap:8px;margin:12px 0 18px;font-size:13px;color:var(--mute)}
button{font-family:inherit;font-weight:600;font-size:13px;line-height:1;letter-spacing:.12em;text-transform:uppercase;padding:12px 18px;border-radius:6px;border:1px solid var(--gilt);background:var(--gilt);color:var(--bg);cursor:pointer;width:100%}
button:disabled{opacity:.6;cursor:progress}
.e{min-height:1.5em;margin:12px 0 0;font-size:13px;color:var(--err)}.n{margin-top:26px;font-size:12px;color:var(--mute)}
</style></head><body><main>
<p class="w">SUB<b>HASTA</b></p><p class="m" id="m">${closed ? 'Closed for now · Сайт закрыт' : 'A private atlas · Закрытый атлас'}</p>
${closed ? '<p>The site is closed until its owner sets a password.</p><p>Сайт закрыт, пока владелец не задаст пароль.</p>' : `<form id="f" autocomplete="on">
<label for="p">Password · Пароль</label><input id="p" type="password" name="password" autocomplete="current-password" required autofocus>
<div class="r"><input id="k" type="checkbox"><label for="k" style="margin:0">Remember on this device · Запомнить на этом устройстве</label></div>
<button id="b" type="submit">Enter · Войти</button><p class="e" id="e" role="alert"></p></form>
<p class="n">The page is encrypted (AES-256). It opens in your browser only with the password. · Страница зашифрована (AES-256) и открывается в браузере только с паролем.</p>
<script>
(function(){var BIN='site.bin?v=${opts.ver}',SALT='${opts.salt}',ROUNDS=${ROUNDS},KEY='subhasta.sitekey';
var $=function(i){return document.getElementById(i);};var te=new TextEncoder();
function hex(h){var a=new Uint8Array(h.length/2);for(var i=0;i<a.length;i++)a[i]=parseInt(h.substr(i*2,2),16);return a;}
function b64(u){var s='';for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s);}function unb64(s){var t=atob(s),a=new Uint8Array(t.length);for(var i=0;i<t.length;i++)a[i]=t.charCodeAt(i);return a;}
function derive(pw){return crypto.subtle.importKey('raw',te.encode(pw),'PBKDF2',false,['deriveBits']).then(function(k){return crypto.subtle.deriveBits({name:'PBKDF2',salt:hex(SALT),iterations:ROUNDS,hash:'SHA-256'},k,256);}).then(function(bits){return new Uint8Array(bits);});}
function open(raw,ok){return Promise.all([crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']),fetch(BIN,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('fetch');return r.arrayBuffer();})]).then(function(x){var buf=new Uint8Array(x[1]);if(String.fromCharCode(buf[0],buf[1],buf[2],buf[3])!=='SBH1')throw new Error('format');var iv=buf.subarray(20,32),ct=buf.subarray(32);
  return crypto.subtle.decrypt({name:'AES-GCM',iv:iv},x[0],ct);}).then(function(plain){var s=new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));return new Response(s).text();}).then(function(html){if(ok)ok();document.open();document.write(html);document.close();});}
function save(raw,keep){try{if(keep)localStorage.setItem(KEY,JSON.stringify({s:SALT,k:b64(raw)}));}catch(e){}}
function fail(msg){$('b').disabled=false;$('b').textContent='Enter · Войти';$('e').textContent=msg;}
if(!(window.crypto&&crypto.subtle&&window.DecompressionStream)){$('e').textContent='This browser cannot open the page (it needs WebCrypto and DecompressionStream over HTTPS). · Этот браузер не может открыть страницу.';$('b').disabled=true;return;}
try{var st=JSON.parse(localStorage.getItem(KEY)||'null');if(st&&st.s===SALT&&st.k){$('m').textContent='Opening… · Открываем…';open(unb64(st.k)).catch(function(){try{localStorage.removeItem(KEY);}catch(e){}$('m').textContent='A private atlas · Закрытый атлас';});}}catch(e){}
$('f').addEventListener('submit',function(ev){ev.preventDefault();var pw=$('p').value;if(!pw)return;$('b').disabled=true;$('b').textContent='Opening… · Открываем…';$('e').textContent='';
  var keep=!!($('k')&&$('k').checked);derive(pw).then(function(raw){return open(raw,function(){save(raw,keep);});}).catch(function(err){fail(err&&err.name==='OperationError'?'Wrong password. · Неверный пароль.':'The page could not be opened; try again. · Не удалось открыть страницу, попробуйте ещё раз.');});});})();
</script>`}
</main></body></html>`;
}

(async () => {
  if (!fs.existsSync(indexF)) { console.error(`no ${indexF}`); process.exit(1); }
  if (!pw) {
    fs.writeFileSync(indexF, gate({ closed: true }));
    if (fs.existsSync(binF)) fs.unlinkSync(binF);
    console.log('SITE_PASSWORD is not set: the site is closed (the gate says so). Set the repository secret SITE_PASSWORD and run the workflow again.');
    return;
  }
  const subtle = webcrypto.subtle;
  const html = fs.readFileSync(indexF);
  const gz = zlib.gzipSync(html, { level: 9 });
  const salt = webcrypto.getRandomValues(new Uint8Array(16)), iv = webcrypto.getRandomValues(new Uint8Array(12));
  const base = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const raw = new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ROUNDS, hash: 'SHA-256' }, base, 256));
  const key = await subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, gz));
  const out = Buffer.concat([Buffer.from('SBH1'), Buffer.from(salt), Buffer.from(iv), Buffer.from(ct)]);
  fs.writeFileSync(binF, out);
  const hexs = Buffer.from(salt).toString('hex');
  fs.writeFileSync(indexF, gate({ salt: hexs, ver: hexs.slice(0, 10) }));
  if (pw.length < 10) console.log('note: the password is short (under 10 characters); a longer one resists guessing far better');
  console.log(`locked: ${html.length >> 10} KB page → ${out.length >> 10} KB encrypted (${ROUNDS} PBKDF2 rounds)`);
})().catch(e => { console.error(e); process.exit(1); });
