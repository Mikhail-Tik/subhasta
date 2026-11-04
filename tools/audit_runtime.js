#!/usr/bin/env node
/* Subhasta — runtime audit (re-runnable)
   Runs from the project root:  node tools/audit_runtime.js  [--seed N] [--verbose]
   Needs: build/preview.html (python3 build.py), playwright (resolves from the global tools), node_modules/axe-core (npm i -D axe-core),
   Chromium at /opt/google/chrome/chrome (override with CHROME=...).
   Checks (each row of the table is pass/fail; the process exits 1 if any row fails):
     errors        no pageerror / console.error / unhandled rejection on every view, 2 viewports x 2 themes, plus drawers, details and the Reel
     deep-links    every hash kind: all ids for collections under 80 items, a seeded random sample of 40 for larger ones;
                   each must keep its hash and show a non-empty title in the drawer, the detail view, the station brief or the Reel; a cold load per kind
     fallback      #nonsense and unknown ids fall back to the World without errors
     history       a landed Reel closes without a new entry; Back closes a Reel onto the page it covered; a linked Reel returns to its page;
                   a dossier keeps its history-aware back button and the Lab its scroll when the Reel closes over them
     keyboard      Tab reaches the nav and the view; Enter/Space on rows and map hubs; Escape closes drawer/palette/lightbox/Reel;
                   focus moves into the drawer and returns to its opener; focus is trapped while open; 1-9 switch sections (not in inputs); Ctrl-K focuses the palette
     axe           axe-core critical + serious violations = 0 on every view in both themes, inside an open drawer, on detail pages and in the open Reel (desktop), plus a phone sample
     motion        prefers-reduced-motion: the Reel does not auto-advance, the ECG dash and the split-flap board are still
     storage       localStorage that throws: the page renders, the guide and lens degrade silently
   Typical run time: about two minutes. */
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const FILE = 'file://' + path.join(ROOT, 'build/preview.html');
const AXE = path.join(ROOT, 'node_modules/axe-core/axe.min.js');
const CHROME = process.env.CHROME || '/opt/google/chrome/chrome';
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose') || args.includes('-v');
const seedArg = args.indexOf('--seed'); const SEED = seedArg >= 0 ? +args[seedArg + 1] : 20261005;
/* the view list is read from the app itself, so a new view is audited without editing this file */
const VIEWS = (() => { const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'app.js'), 'utf8'); const m = src.match(/const VIEWS=\[([^\]]+)\]/); if (!m) throw new Error('VIEWS not found in src/app.js'); return m[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')); })();
/* the Lab's instruments, read from src/lab.js (LAB_INSTR lives inside the app's scope, out of reach of page.evaluate) */
const LAB_IDS = (() => { const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'lab.js'), 'utf8'); const m = src.match(/const LAB_INSTR=\[(.*?)\];/); if (!m) throw new Error('LAB_INSTR not found in src/lab.js'); return [...m[1].matchAll(/\['([a-z]+)',/g)].map(x => x[1]); })();
const NOISE = /ERR_FILE|net::|ERR_TUNNEL|Failed to load resource|font/i;

if (!fs.existsSync(path.join(ROOT, 'build/preview.html'))) { console.error('build/preview.html is missing: run python3 build.py first'); process.exit(2); }
if (!fs.existsSync(AXE)) { console.error('node_modules/axe-core/axe.min.js is missing: run npm i -D axe-core'); process.exit(2); }
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('playwright is not resolvable from this directory'); process.exit(2); }

const rows = []; let failed = false;
const row = (check, ok, detail) => { rows.push([check, ok ? 'pass' : 'FAIL', detail]); if (!ok) failed = true; };
const rng = (() => { let a = SEED >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
const sample = (arr, n) => { if (arr.length <= n) return arr; const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n).sort(); };
const seen = () => () => { try { localStorage.setItem('subhasta.seen', 'true'); } catch (e) {} };

async function context(browser, opts = {}, { markSeen = true, init } = {}) {
  /* 1600 wide by default: the full nav shows from 1101 px (below it collapses into the menu), and the keyboard check walks it */
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, colorScheme: 'dark', ...opts });
  if (markSeen) await ctx.addInitScript(seen());
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) errs.push('console: ' + m.text().slice(0, 160)); });
  return { ctx, page, errs };
}
/* in-page navigation: set the hash, wait for the router, then two frames so layout has happened */
const nav = (page, hash) => page.evaluate(h => new Promise(res => { if (location.hash === h) return requestAnimationFrame(() => requestAnimationFrame(res)); window.addEventListener('hashchange', () => requestAnimationFrame(() => requestAnimationFrame(res)), { once: true }); location.hash = h; }), hash);
/* load the built page and wait for the app: a check that measures about:blank passes whatever the page does */
const load = async (page, hash = '#floor') => { await page.goto(FILE + hash, { waitUntil: 'load' }); try { await page.waitForFunction(() => window.__S && document.querySelector('.view.on'), null, { timeout: 15000 }); return true; } catch (e) { return false; } };
const cold = async (page, hash) => { await page.goto('about:blank'); await page.goto(FILE + hash, { waitUntil: 'load' }); await page.waitForTimeout(250); };
const state = (page, kind) => page.evaluate(kind => {
  const q = s => document.querySelector(s);
  const drawerOn = q('#drawer').classList.contains('on'), detailOn = q('#v-detail').classList.contains('on'), reelOn = q('#reel').classList.contains('on');
  let title = '';
  if (kind === 'view') { const v = q('.view.on'); title = v ? ((v.querySelector('h1') || {}).textContent || v.id) : ''; }
  else if (kind === 'lab') { const v = q('.view.on'); title = v && v.id === 'v-lab' && document.getElementById(location.hash.slice(1)) ? ((v.querySelector('h1') || {}).textContent || v.id) : ''; }
  else if (kind === 'reel') title = reelOn ? ((q('#reelStage .rc.on .rt') || {}).textContent || '') : '';
  else if (kind === 'station') title = (q('#sbrief h3') || {}).textContent || '';
  else if (drawerOn) title = q('#dTitle').textContent;
  else if (detailOn) title = (q('#v-detail h1') || {}).textContent || '';
  return { hash: location.hash, title: (title || '').trim(), view: (q('.view.on') || {}).id, drawerOn, detailOn, reelOn };
}, kind);
const active = () => page => page.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, id: a.id, cls: a.className && String(a.className), text: (a.textContent || '').trim().slice(0, 24), inDrawer: !!a.closest('#drawer'), inReel: !!a.closest('#reel'), inMain: !!a.closest('main'), inNav: !!a.closest('#nav') }; });

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const ONLY = (() => { const i = args.indexOf('--only'); return i >= 0 ? args[i + 1].split(',') : null; })();   /* --only world,keyboard runs a few sections while working on them */
  const section = async (name, fn) => { if (ONLY && !ONLY.includes(name)) return; try { await fn(); } catch (e) { row(name, false, 'exception: ' + (e.stack || e.message).split('\n').slice(0, 2).join(' ').slice(0, 200)); } };
  try {
    /* ---------- 1. errors: every view, 2 viewports x 2 themes ---------- */
    await section('errors', async () => { for (const [w, h, vp] of [[1400, 900, 'desktop'], [390, 844, 'phone']]) for (const scheme of ['dark', 'light']) {
      const { ctx, page, errs } = await context(browser, { viewport: { width: w, height: h }, colorScheme: scheme });
      await page.goto(FILE + '#floor', { waitUntil: 'load' });
      await page.evaluate(() => { window.__rej = []; window.addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason))); });
      const notShown = [];
      for (const v of VIEWS) { await nav(page, '#' + v); if (!await page.evaluate(v => document.getElementById('v-' + v).classList.contains('on'), v)) notShown.push(v); }
      for (const hh of ['#hub-ny', '#symptom-china', '#under-geneva', '#house-sothebys', '#lot-basquiat-untitled', '#artist-gustav-klimt', '#person-p0-charles-f-stewart', '#story-chestnuts', '#collector-griffin', '#inst-malba', '#segment-pwc', '#station-freeport', '#reel-1', '#reel-7']) await nav(page, hh);
      await nav(page, '#floor'); await page.click('#themeBtn'); await page.waitForTimeout(400);
      const rej = await page.evaluate(() => window.__rej);
      const all = [...errs, ...rej.map(r => 'rejection: ' + r), ...notShown.map(v => 'view not shown: ' + v)];
      row(`errors ${vp}/${scheme}`, all.length === 0, all.length ? all.slice(0, 3).join(' | ') : `${VIEWS.length} views, 14 deep links, theme toggle: clean`);
      await ctx.close();
    } });

    /* ---------- 1b. layout: no horizontal overflow at phone or desktop width ---------- */
    await section('overflow', async () => { const bad = [];
      for (const [w, h, vp] of [[320, 640, 'phone-320'], [390, 844, 'phone'], [1400, 900, 'desktop']]) {
        const { ctx, page } = await context(browser, { viewport: { width: w, height: h }, colorScheme: 'dark' });
        if (!(await load(page))) { bad.push(`${vp}: the page did not load`); await ctx.close(); continue; }
        for (const v of VIEWS) { await nav(page, '#' + v); const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })); if (o.sw > o.cw + 1) bad.push(`${vp} #${v} ${o.sw}>${o.cw}`); }
        for (const hh of ['#hub-ny', '#symptom-china', '#under-geneva', '#inst-malba']) { await nav(page, hh); const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })); if (o.sw > o.cw + 1) bad.push(`${vp} ${hh} ${o.sw}>${o.cw}`); }
        await ctx.close();
      }
      /* the masthead is fixed, so it never widens the page: its tools must fit the window and clear the nav at every laptop width */
      for (const w of [1280, 1366, 1440, 1481, 1600, 1920]) { const { ctx, page } = await context(browser, { viewport: { width: w, height: 800 } }); if (!(await load(page))) { bad.push(`masthead ${w}px: the page did not load`); await ctx.close(); continue; }
        const m = await page.evaluate(() => { const r = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; }; const t = r('#themeBtn'), tl = r('.tools'), n = document.querySelector('#nav'); const inline = n && getComputedStyle(n).display !== 'none' && getComputedStyle(n).position !== 'fixed'; const last = inline ? [...n.querySelectorAll('button')].pop() : null; return { ok: !!(t && tl && n), tr: t ? t.right : 0, tl: tl ? tl.left : 0, nr: last ? last.getBoundingClientRect().right : null, vw: innerWidth }; });
        if (!m.ok) bad.push(`masthead ${w}px: the Theme button, the tools or the nav is missing`); if (m.tr > m.vw + 0.5) bad.push(`masthead ${w}px: the Theme button ends at ${Math.round(m.tr)}`); if (m.nr != null && m.nr > m.tl + 0.5) bad.push(`masthead ${w}px: the last nav button (${Math.round(m.nr)}) runs under the tools (${Math.round(m.tl)})`); await ctx.close(); }
      row('overflow', bad.length === 0, bad.length ? bad.slice(0, 4).join(' | ') : `${VIEWS.length} views + 4 drawers at 320, 390 and 1400 px: no horizontal overflow; the masthead fits at 1280–1920 px`);
    });

    /* ---------- 2. deep links ---------- */
    await section('deep-links', async () => {
      const { ctx, page, errs } = await context(browser);
      await page.goto(FILE + '#floor', { waitUntil: 'load' });
      const ids = await page.evaluate(([VIEWS, LAB_IDS]) => {
        const slug = s => s.toLowerCase().replace(/[’'".,:()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const ARTISTS = [...new Set([...NGA.map(n => n.a), ...RESULTS.map(r => r.artist)])].sort();
        return { view: VIEWS, lab: [...LAB_IDS, ...Object.keys(LIMIT_AREAS).map(a => 'limits-' + a)], reel: REEL.map((_, i) => String(i + 1)),
          house: [...HOUSES.map(h => h.id), ...PLAYERS.map(p => p.id)], lot: RESULTS.map(r => r.id), artist: ARTISTS.map(slug), collector: COLLECTORS.map(c => c.id), story: STORIES.map(s => s.id),
          person: PEOPLE.map(p => p.id), under: ATLAS.map(a => a.id), station: STATIONS.map(s => s.id), symptom: SYMPTOMS.map(s => s.id), hub: HUBS.map(h => h.id), segment: SEGMENTS.map(s => s.id), inst: INSTITUTIONS.map(i => i.id) };
      }, [VIEWS, LAB_IDS]);
      const broken = []; let total = 0; const perKind = [];
      for (const [kind, list] of Object.entries(ids)) {
        const pick = list.length < 80 ? list : sample(list, 40);
        let ok = 0;
        for (let i = 0; i < pick.length; i++) {
          const id = pick[i]; const hash = kind === 'view' ? '#' + id : `#${kind}-${id}`; const before = errs.length;
          if (i === 0) await cold(page, hash); else await nav(page, hash);
          const s = await state(page, kind);
          const good = s.hash === hash && s.title.length > 0 && errs.length === before;
          if (good) ok++; else broken.push(`${hash} -> hash=${s.hash} title="${s.title.slice(0, 30)}" view=${s.view}${errs.length > before ? ' ' + errs[before] : ''}`);
          total++;
        }
        perKind.push(`${kind} ${ok}/${pick.length}${list.length > pick.length ? ` of ${list.length}` : ''}`);
      }
      row('deep-links', broken.length === 0, broken.length ? `${broken.length} broken: ` + broken.slice(0, 4).join(' ; ') : `${total} links ok (${perKind.join(', ')})`);
      /* fallback */
      const fb = [];
      for (const hh of ['#nonsense', '#house-nope', '#lot-nope', '#under-nope', '#station-nope']) { const before = errs.length; await cold(page, hh); const s = await state(page, 'view'); if (!(s.view === 'v-world' && s.hash === '#world' && !s.reelOn && errs.length === before)) fb.push(`${hh} -> ${s.hash} ${s.view}${errs.length > before ? ' ' + errs[before] : ''}`); }
      row('fallback', fb.length === 0, fb.length ? fb.join(' ; ') : '#nonsense and 4 unknown ids fall back to the World');
      await ctx.close();
    });

    /* ---------- 3. keyboard and focus ---------- */
    await section('keyboard', async () => {
      const { ctx, page, errs } = await context(browser);
      const act = active();
      const problems = [];
      await cold(page, '#floor');
      const stops = []; for (let i = 0; i < 24; i++) { await page.keyboard.press('Tab'); stops.push(await act(page)); }
      if (!stops.some(s => s.inNav)) problems.push('Tab never reaches the nav');
      if (!stops.some(s => s.inMain)) problems.push('Tab never reaches the view');
      await page.click('#moreBtn'); await page.waitForTimeout(100); await page.focus('#navMore button[data-v="people"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
      if ((await state(page, 'view')).view !== 'v-people') problems.push('Enter on a nav button does not switch');
      await page.focus('#plist .person'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
      if (!(await state(page, 'person')).detailOn) problems.push('Enter on a person row does not open it');
      await nav(page, '#hammer'); await page.focus('#rtbl tr.clk'); await page.keyboard.press('Space'); await page.waitForTimeout(150);
      if (!(await state(page, 'lot')).detailOn) problems.push('Space on a results row does not open it');
      await nav(page, '#atlas'); await page.waitForTimeout(150);
      await page.focus('#world .hub[tabindex]'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
      let a = await act(page); let s = await state(page, 'hub');
      if (!s.drawerOn) problems.push('Enter on a map hub does not open the drawer');
      if (!a.inDrawer) problems.push('focus did not move into the drawer');
      const tabs = []; for (let i = 0; i < 30; i++) { await page.keyboard.press('Tab'); tabs.push(await act(page)); }
      if (tabs.some(x => !x.inDrawer)) problems.push('focus escapes the open drawer');
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      s = await state(page, 'hub'); a = await act(page);
      if (s.drawerOn) problems.push('Escape does not close the drawer');
      if (!(a.tag === 'g' && a.text.length)) problems.push(`focus did not return to the hub that opened the drawer (on ${a.tag}#${a.id})`);
      await page.focus('#world .hub[tabindex]'); await page.keyboard.press('Space'); await page.waitForTimeout(200);
      if (!(await state(page, 'hub')).drawerOn) problems.push('Space on a map hub does not open the drawer');
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      await page.keyboard.press('7'); await page.waitForTimeout(150); if ((await state(page, 'view')).view !== 'v-pulse') problems.push('key 7 does not switch to the Pulse');
      await page.keyboard.press('6'); await page.waitForTimeout(150); if ((await state(page, 'view')).view !== 'v-hammer') problems.push('key 6 does not switch to the Hammer');
      await page.focus('#rq'); await page.keyboard.press('3'); await page.waitForTimeout(150);
      if ((await state(page, 'view')).view !== 'v-hammer') problems.push('digit typed in an input switched the section');
      await page.keyboard.press('Control+k'); await page.waitForTimeout(150); a = await act(page);
      if (!(await page.evaluate(() => document.getElementById('pal').classList.contains('on')) && a.id === 'palq')) problems.push('Ctrl-K does not open the palette with the input focused');
      await page.keyboard.press('Escape'); await page.waitForTimeout(150); a = await act(page);
      if (await page.evaluate(() => document.getElementById('pal').classList.contains('on'))) problems.push('Escape does not close the palette');
      if (a.id !== 'rq') problems.push(`palette did not return focus to its opener (on ${a.tag}#${a.id})`);
      await cold(page, '#house-sothebys'); await page.focus('#v-detail [data-lb]'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
      if (!await page.evaluate(() => document.getElementById('lightbox').classList.contains('on'))) problems.push('Enter on a figure does not open the lightbox');
      await page.keyboard.press('Escape'); await page.waitForTimeout(150); a = await act(page);
      if (await page.evaluate(() => document.getElementById('lightbox').classList.contains('on'))) problems.push('Escape does not close the lightbox');
      if (a.tag !== 'A') problems.push('lightbox did not return focus to the figure');
      await cold(page, '#floor'); await page.click('#moreBtn'); await page.waitForTimeout(100); await page.focus('#navMore button[data-v="reel"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(400); a = await act(page);
      if (!(await page.evaluate(() => document.getElementById('reel').classList.contains('on')))) problems.push('Enter on Reel does not open it');
      if (!a.inReel) problems.push('focus did not move into the Reel');
      await page.keyboard.press('Escape'); await page.waitForTimeout(300); a = await act(page);
      if (await page.evaluate(() => document.getElementById('reel').classList.contains('on'))) problems.push('Escape does not close the Reel');
      if (!(a.inNav && (a.text === 'The Reel' || /^More/.test(a.text)))) problems.push(`Reel did not return focus to its opener or the More menu that holds it (on ${a.tag} "${a.text}")`);
      /* a link inside a drawer must close the drawer when it navigates */
      await cold(page, '#floor'); await page.click('#v-floor .srlead [data-up]'); await page.waitForTimeout(150); await page.click('#dBody [data-org]'); await page.waitForTimeout(200);
      s = await state(page, 'house'); if (s.drawerOn || !s.detailOn) problems.push('a dossier opened from a drawer left the drawer open');
      problems.push(...errs);
      row('keyboard', problems.length === 0, problems.length ? problems.slice(0, 4).join(' ; ') : 'tab order, Enter/Space, Escape, focus in/return/trap, 1-9, Ctrl-K, drawer links');
      await ctx.close();
    });

    /* ---------- 4. axe ---------- */
    /* ---------- 3a. the World: the globe draws, pins open, the rail moves time, the card returns focus ---------- */
    await section('world', async () => {
      const { ctx, page, errs } = await context(browser);
      const act = active(); const problems = [];
      await cold(page, '#world'); await page.waitForTimeout(900);
      const st = await page.evaluate(() => window.__WORLD && window.__WORLD.state());
      if (!st || !st.w || st.pins < 5) problems.push(`the globe did not draw (${JSON.stringify(st).slice(0, 120)})`);
      if (st && !st.spinning) problems.push('the globe is not turning on load');
      const pin = await page.evaluate(() => { const P = window.__WORLD.pins().filter(p => p.kind === 'sold'); const cv = document.querySelector('.wd-cv').getBoundingClientRect(); for (const p of P) { const c = window.__WORLD.project(...(CITY_LL[p.c])); if (c && c.visible && c.x > 60 && c.x < cv.width - 60 && c.y > 60 && c.y < cv.height - 60) return { c: p.c, x: cv.left + c.x, y: cv.top + c.y }; } return null; });
      if (!pin) problems.push('no sold city is visible on the first view');
      else {
        await page.mouse.move(pin.x, pin.y); await page.waitForTimeout(250);
        const tip = await page.evaluate(() => { const t = document.getElementById('tip'); return t && t.style.display !== 'none' ? t.textContent : ''; });
        if (!tip.includes(pin.c)) problems.push(`hovering ${pin.c} shows no tip (${tip.slice(0, 40)})`);
        await page.mouse.click(pin.x, pin.y); await page.waitForTimeout(500);
        const card = await page.evaluate(() => { const c = document.querySelector('.wd-card'); return { open: c && !c.hidden, title: c ? c.querySelector('.wd-ch').textContent : '', rows: c ? c.querySelectorAll('.wd-ev').length : 0 }; });
        if (!(card.open && card.title === pin.c && card.rows >= 1)) problems.push(`clicking ${pin.c} did not open its card (${JSON.stringify(card)})`);
        let a = await act(page); if (!/wd-x/.test(a.cls || '')) problems.push(`focus did not move into the card (on ${a.tag}.${a.cls})`);
        await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
        const opened = await state(page, 'view'); if (!(opened.view === 'v-detail' || opened.drawerOn)) problems.push('Enter on a card row did not open the record');
        if (opened.view === 'v-detail') { await page.goBack(); await page.waitForTimeout(400); const vw = await state(page, 'view'); if (vw.view !== 'v-world') problems.push(`Back after a record did not return to the World (${vw.view})`); }
        else if (opened.drawerOn) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); const vw = await state(page, 'view'); if (vw.drawerOn || vw.view !== 'v-world') problems.push('Escape did not close the record over the World'); }
      }
      await page.click('.wd-mode[data-wmode="then"]'); await page.waitForTimeout(300);
      const rail = await page.evaluate(() => !document.querySelector('.wd-rail').hidden); if (!rail) problems.push('Then does not show the rail');
      await page.focus('.wd-range'); await page.keyboard.press('Home'); await page.waitForTimeout(200);
      const yr0 = await page.evaluate(() => document.querySelector('.wd-yr').textContent); if (!/43000 BC/.test(yr0)) problems.push(`Home on the rail did not reach the start (${yr0})`);
      await page.keyboard.press('End'); await page.waitForTimeout(200);
      const yr1 = await page.evaluate(() => window.__WORLD.state().year); if (yr1 < 2026) problems.push(`End on the rail did not reach now (${yr1})`);
      await page.evaluate(() => window.__WORLD.year(1874)); await page.waitForTimeout(1900);
      const lead = await page.evaluate(() => document.querySelector('.wd-h1').textContent); if (!/Impressionism/.test(lead)) problems.push(`1874 does not name Impressionism (${lead})`);
      await page.click('.wd-play'); await page.waitForTimeout(1200); const playing = await page.evaluate(() => window.__WORLD.state().playing && window.__WORLD.state().year !== 1874); if (!playing) problems.push('Play does not move the year');
      await page.click('.wd-play');
      await page.click('.wd-mode[data-wmode="shifts"]'); await page.waitForTimeout(300); await page.evaluate(() => window.__WORLD.era(5)); await page.waitForTimeout(300);
      const era = await page.evaluate(() => { const c = document.querySelector('.wd-card'); return c && !c.hidden && /New York/.test(c.textContent); }); if (!era) problems.push('an era does not open its card');
      await page.keyboard.press('Escape'); await page.focus('.wd-x'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
      const closed = await page.evaluate(() => document.querySelector('.wd-card').hidden); if (!closed) problems.push('the card does not close from its button');
      await page.click('.wd-mode[data-wmode="now"]'); await page.focus('.wd-cv'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      const all = await page.evaluate(() => { const c = document.querySelector('.wd-card'); return c && !c.hidden && c.querySelectorAll('[data-wcity]').length; }); if (!all) problems.push('Enter on the globe does not list everything');
      await page.fill('.wd-q', 'Explain Dada'); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
      const asked = await state(page, 'view'); if (asked.view !== 'v-ask') problems.push(`the ask bar did not open the analyst (${asked.view})`);
      if (errs.length) problems.push('errors: ' + errs.slice(0, 2).join(' | '));
      row('world', problems.length === 0, problems.length ? problems.slice(0, 4).join(' ; ') : 'the globe turns, a sold city hovers and opens its card, Back returns, the rail and Play move time, an era opens, Enter lists everything, the ask bar asks');
      await ctx.close();
    });

    /* ---------- 3b. history: Back, Close and links around the Reel and the dossiers ---------- */
    await section('history', async () => {
      const { ctx, page, errs } = await context(browser);
      const S = () => page.evaluate(() => ({ hash: location.href.startsWith('about') ? 'about:blank' : location.hash, reel: document.getElementById('reel').classList.contains('on'), view: (document.querySelector('.view.on') || {}).id, len: history.length, y: Math.round(scrollY) }));
      const problems = [];
      await page.goto('about:blank'); await page.goto(FILE + '#reel-5', { waitUntil: 'load' }); await page.waitForTimeout(500);
      await page.click('#reelClose'); await page.waitForTimeout(300); let s = await S(); if (s.hash !== '#world' || s.len !== 2) problems.push(`closing a landed Reel: ${s.hash}, ${s.len} entries`);
      await page.evaluate(() => document.querySelector('#nav button[data-v="hammer"]').click()); await page.waitForTimeout(200); await page.evaluate(() => document.querySelector('#nav button[data-v="reel"]').click());   /* on the World the masthead is folded (v23): the section is reached through the menu, so the click is scripted */ await page.waitForTimeout(300); await page.goBack(); await page.waitForTimeout(400);
      s = await S(); if (s.hash !== '#hammer' || s.reel || s.view !== 'v-hammer') problems.push(`Back over the Reel: ${s.hash}, reel ${s.reel}, ${s.view}`);
      await page.click('#rtbl tbody tr[data-lot]'); await page.waitForTimeout(300); await page.evaluate(() => document.querySelector('#nav button[data-v="reel"]').click()); await page.waitForTimeout(300); await page.click('#reelClose'); await page.waitForTimeout(400);
      const bk = await page.evaluate(() => { const b = document.querySelector('#v-detail.on .dtools .back'); return b ? { t: b.textContent, go: b.dataset.go || null } : null; });
      if (!bk || bk.go) problems.push('a dossier lost its history-aware back button under the Reel');
      await page.evaluate(() => { location.hash = 'houses'; }); await page.waitForTimeout(300); await page.evaluate(() => { location.hash = 'reel-3'; }); await page.waitForTimeout(400); await page.click('#reelClose'); await page.waitForTimeout(400);
      s = await S(); if (s.hash !== '#houses' || s.view !== 'v-houses') problems.push(`a linked Reel closed onto ${s.hash}`);
      await page.evaluate(() => { location.hash = 'lab-provenance'; }); await page.waitForTimeout(900); await page.evaluate(() => scrollBy(0, 1200)); await page.waitForTimeout(150); const y0 = (await S()).y;
      await page.evaluate(() => document.querySelector('#nav button[data-v="reel"]').click()); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(500); s = await S(); if (Math.abs(s.y - y0) > 2) problems.push(`the Lab scrolled from ${y0} to ${s.y} when the Reel closed`);
      row('history', problems.length === 0 && errs.length === 0, problems.length ? problems.join(' | ') : (errs.length ? errs.slice(0, 2).join(' | ') : 'Back closes the Reel onto its page; a landed Reel closes without a new entry; a linked Reel returns; a dossier keeps its back button; the Lab keeps its place'));
      await ctx.close();
    });

    await section('axe', async () => {
      const agg = {}; let nctx = 0; const add = (where, res) => { nctx++; for (const v of res.violations) { const k = v.id; agg[k] = agg[k] || { impact: v.impact, count: 0, where: new Set(), ex: [] }; agg[k].count += v.nodes.length; agg[k].where.add(where); if (agg[k].ex.length < 3) agg[k].ex.push(where + ': ' + v.nodes[0].target.join(' ').slice(0, 60)); } };
      const run = page => page.evaluate(() => axe.run(document, { resultTypes: ['violations'] }));
      for (const scheme of ['dark', 'light']) {
        const { ctx, page } = await context(browser, { colorScheme: scheme });
        await page.goto(FILE + '#floor', { waitUntil: 'load' }); await page.addScriptTag({ path: AXE });
        for (const v of VIEWS) { await nav(page, '#' + v); if (v === 'floor') await page.waitForTimeout(300); add(`${scheme}/${v}`, await run(page)); }
        for (const hh of ['#hub-ny', '#symptom-china', '#under-geneva', '#house-sothebys', '#lot-klimt-dame-mit-f-cher']) { await nav(page, hh); add(`${scheme}${hh}`, await run(page)); }
        await nav(page, '#reel-1'); await page.waitForTimeout(300); add(`${scheme}/reel`, await run(page));
        await ctx.close();
      }
      { const { ctx, page } = await context(browser, { viewport: { width: 390, height: 844 } }); await page.goto(FILE + '#floor', { waitUntil: 'load' }); await page.addScriptTag({ path: AXE });
        for (const hh of ['#floor', '#atlas', '#undertow', '#hub-ny', '#reel-2']) { await nav(page, hh); add('phone' + hh, await run(page)); } await ctx.close(); }
      const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
      const list = Object.entries(agg).sort((a, b) => order[a[1].impact] - order[b[1].impact] || b[1].count - a[1].count);
      const bad = list.filter(([, v]) => v.impact === 'critical' || v.impact === 'serious');
      const summary = list.map(([k, v]) => `${k}(${v.impact},${v.count})`).join(' ');
      row('axe critical+serious', bad.length === 0, bad.length ? bad.map(([k, v]) => `${k} ${v.impact} x${v.count} e.g. ${v.ex[0]}`).join(' ; ') : (list.length ? 'none; other: ' + summary : `no violations at all (${nctx} contexts)`));
      if (VERBOSE && list.length) for (const [k, v] of list) console.log(`   ${k} ${v.impact} x${v.count} in ${v.where.size} contexts: ${v.ex.join(' | ')}`);
    });

    /* ---------- 5. reduced motion ---------- */
    await section('reduced-motion', async () => {
      const { ctx, page, errs } = await context(browser, { reducedMotion: 'reduce' });
      const idx = await (async () => { await page.goto(FILE + '#floor', { waitUntil: 'load' }); return page.evaluate(() => { const i = REEL.findIndex(c => ['lot', 'signal', 'kpi'].includes(c.k)); return i < 0 ? 0 : i; }); })();
      await nav(page, '#reel-' + (idx + 1)); await page.waitForTimeout(300);
      const i0 = await page.evaluate(() => document.querySelector('#reelStage .rc.on').dataset.i);
      await page.waitForTimeout(8700);
      const r = await page.evaluate(() => ({ i: document.querySelector('#reelStage .rc.on').dataset.i, ken: getComputedStyle(document.querySelector('#reelStage .rc.on .rbg img') || document.body).animationName }));
      await nav(page, '#pulse'); await page.waitForTimeout(150);
      const ecg = await page.evaluate(() => { const cs = getComputedStyle(document.querySelector('.ecg .line')); return { anim: cs.animationName, dash: cs.strokeDashoffset }; });
      await nav(page, '#floor'); const b0 = await page.evaluate(() => document.getElementById('bN').textContent); await page.waitForTimeout(7400); const b1 = await page.evaluate(() => document.getElementById('bN').textContent);
      const probs = [];
      if (i0 !== r.i) probs.push(`Reel auto-advanced ${i0} -> ${r.i}`); if (r.ken !== 'none') probs.push('Ken Burns still animates');
      if (ecg.anim !== 'none' || ecg.dash !== '0px') probs.push(`ECG ${ecg.anim} ${ecg.dash}`); if (b0 !== b1) probs.push('board still advances'); probs.push(...errs);
      row('reduced-motion', probs.length === 0, probs.length ? probs.join(' ; ') : 'Reel manual, ECG and board still');
      await ctx.close();
    });

    /* ---------- 6. localStorage throws ---------- */
    await section('localStorage-throws', async () => {
      const { ctx, page, errs } = await context(browser, {}, { markSeen: false, init: () => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } }); } });
      await page.goto(FILE + '#floor', { waitUntil: 'load' }); await page.waitForTimeout(400);
      const st = await page.evaluate(() => ({ floor: document.getElementById('v-floor').classList.contains('on') && document.getElementById('v-floor').innerHTML.length > 5000, guide: !!document.querySelector('.guide'), ask: !!document.querySelector('#tdAskForm') }));
      if (st.guide) { await page.click('.guide [data-g="close"]'); await page.waitForTimeout(400); }
      await page.click('#themeBtn'); await nav(page, '#undertow'); await page.click('#checks input'); await page.waitForTimeout(100);
      const st2 = await page.evaluate(() => ({ guideGone: !document.querySelector('.guide'), themed: !!document.documentElement.getAttribute('data-theme'), chk: document.getElementById('chkprog').textContent }));
      const probs = []; if (!st.floor) probs.push('floor did not render'); if (!st.ask) probs.push('ask bar missing'); if (!st2.guideGone) probs.push('guide did not dismiss'); if (!st2.themed) probs.push('theme toggle failed'); if (st2.chk !== '1 of 10') probs.push('checks do not tick without storage: ' + st2.chk); probs.push(...errs);
      row('localStorage-throws', probs.length === 0, probs.length ? probs.join(' ; ') : 'renders; guide, theme, lens and checks degrade silently');
      await ctx.close();
    });

    /* ---------- 7. performance (informational) ---------- */
    await section('performance', async () => {
      const { ctx, page } = await context(browser);
      await page.goto(FILE + '#floor', { waitUntil: 'load' }); await page.waitForTimeout(300);
      for (const v of VIEWS) await nav(page, '#' + v); await nav(page, '#reel-1'); await page.waitForTimeout(200);
      const p = await page.evaluate(() => { const nav = performance.getEntriesByType('navigation')[0]; const fcp = (performance.getEntriesByType('paint').find(x => x.name === 'first-contentful-paint') || {}).startTime; return { fcp: Math.round(fcp || 0), dcl: Math.round(nav.domContentLoadedEventEnd), views: window.__S.perf, reel: window.__REEL.perf, mem: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }; });
      const worst = Object.entries(p.views).filter(([k]) => k !== 'worldmap').sort((a, b) => b[1] - a[1])[0];
      rows.push(['performance', worst[1] > 300 ? 'WARN' : 'info', `first-contentful-paint ${p.fcp} ms, DOMContentLoaded ${p.dcl} ms; slowest first render ${worst[0]} ${worst[1].toFixed(1)} ms; world map ${(p.views.worldmap || 0).toFixed(1)} ms; Reel first card ${(p.reel.firstCard || 0).toFixed(1)} ms${p.mem != null ? `; heap ${p.mem} MB` : ''}`]);
      await ctx.close();
    });
  } catch (e) { row('runner', false, 'exception: ' + (e.stack || e.message).split('\n').slice(0, 2).join(' ')); }
  finally { await browser.close(); }

  const w0 = Math.max(...rows.map(r => r[0].length)), w1 = 4;
  console.log('\nSubhasta runtime audit — ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ` — seed ${SEED}`);
  console.log('-'.repeat(w0 + w1 + 6));
  for (const [c, s, d] of rows) console.log(`${c.padEnd(w0)}  ${s.padEnd(w1)}  ${d}`);
  console.log('-'.repeat(w0 + w1 + 6));
  console.log(`${failed ? 'FAILED' : 'all checks passed'} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  process.exit(failed ? 1 : 0);
})();
