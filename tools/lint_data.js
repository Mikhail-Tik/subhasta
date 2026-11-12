#!/usr/bin/env node
/*
 * tools/lint_data.js — the data-layer lint for Subhasta.
 *
 * WHAT IT DOES
 *   Loads the nine data files exactly as build.py and the browser do (same order, the
 *   /*__IMGMETA__*\/{} placeholder replaced by data/images_meta.json), inside a bare
 *   Node vm sandbox that has no `window` and no `document`. It then validates the data
 *   and prints a report grouped by severity:
 *
 *     ERROR  something the engines will render wrongly or crash on: duplicate ids, a
 *            reference that does not resolve (image, lot title, story, hub, station…),
 *            a bad verification flag, a malformed date, a source that is not a URL,
 *            a data file that needs the DOM, debris such as "undefined" in a string.
 *     WARN   convention slips worth a look, never fixed by the lint: straight
 *            apostrophes, missing vf/src where siblings have them, uneven image
 *            coverage, inconsistent money formatting, unexpected enum values.
 *     INFO   orphans: images, sources, series or items nothing reaches.
 *
 *   Exit code 1 when there is at least one ERROR, else 0.
 *
 * USAGE
 *   node tools/lint_data.js            full report
 *   node tools/lint_data.js --no-info  hide INFO lines
 *   node tools/lint_data.js --json     machine-readable findings
 *   node tools/lint_data.js --help
 *
 * HOW THE RULES ARE ORGANISED (read this before adding one)
 *   1. `loadData()` evaluates the files twice: once verbatim (so a redeclared const,
 *      a syntax error or a `window` access fails exactly as it would in the page) and
 *      once with top-level `const` turned into `var`, so every collection becomes a
 *      property of the sandbox `D` (D.HOUSES, D.RESULTS, …). `declaredIn[NAME]` says
 *      which file declared NAME, so findings can name the file to edit.
 *   2. `ENGINE` holds constants read out of the engine sources with regexes (VIEWS,
 *      PGROUPS, THEMES, DUR, SCHED, TODAY, the flow-model FX map, the EVIDENCE keys the
 *      Floor draws as tiles…). Data is validated against what the engines really accept,
 *      and the lint stays in sync when the engines change. Each extractor has a fallback
 *      and a NOTE is printed if the regex stopped matching. Facts that used to live in
 *      the engines and now live in the data (ORG_ALIASES, DEALERS[].key, HUBS[].room,
 *      VENUES[].cities/homeDest, ARTIST_DIED, REGIMES[].strictExport/dealerAml, HERO,
 *      FLOOR) are checked as data: shape in SCHEMA/checkSchema, references in REFS.
 *   3. `REFS` is the declarative table of cross-references. One entry = one rule:
 *        { name:  'FAIRS[].hub → HUBS.id',            // printed as the rule name
 *          sev:   'ERROR',                            // or 'WARN'
 *          items: D => D.FAIRS.map((f,i) => ({ v: f.hub, where: `FAIRS[${i}] “${f.n}”` })),
 *          target: D => ids(D.HUBS),                  // a Set of acceptable values
 *          targetName: 'HUBS.id' }                  // a string, or a function returning one
 *      `v` may be a string or an array of strings; null/undefined/'' count as "no
 *      reference" and are skipped (other rules decide whether that is allowed).
 *      TO ADD A NEW REFERENCE RULE: append one object to REFS. Nothing else changes.
 *   4. `IMAGE_SITES` lists every place an image id can appear; add a line when a new
 *      collection gets an `img` field. Image ids are checked against IMG and against
 *      the files in build/img and build/img/t, and feed the orphan-image INFO.
 *   5. `SCHEMA` lists, per collection, the fields the engines dereference without a
 *      guard (missing → "undefined" on screen or a crash). Add a field when an engine
 *      starts reading it.
 *   6. Everything else lives in small named check functions near the bottom
 *      (`checkDates`, `checkUrls`, `checkFlags`, `checkStrings`, `checkMoney`,
 *      `checkOrphans`…), each registered in `CHECKS`. A check receives (D, F) where F
 *      is the finding sink: F.error(rule, where, msg), F.warn(...), F.info(...).
 *
 * The lint never edits anything. It uses only Node core modules and runs in well
 * under five seconds.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DATA_FILES = ['data_houses.js', 'data_market.js', 'data_more.js', 'data_people.js', 'data_reel.js', 'data_under.js', 'data_pulse.js', 'data_atlas.js', 'data_world.js', 'data_flows.js', 'data_globe.js', 'data_circle.js', 'data_bench.js', 'data_movements.js', 'data_live.js', 'data_places.js', 'data_nav.js', 'data_season.js', 'data_net.js'];
const ENGINE_FILES = ['app.js', 'reel.js', 'under.js', 'pulse.js', 'atlas.js', 'clinic.js', 'globe.js', 'circle.js', 'lab.js', 'lab_prov.js', 'lab_hands.js', 'today.js', 'move.js', 'ask.js', 'world.js', 'library.js', 'compare.js', 'nav.js', 'season.js'];
const IMG_META = path.join(ROOT, 'data', 'images_meta.json');
const IMG_DIR = path.join(ROOT, 'build', 'img');
const THUMB_DIR = path.join(ROOT, 'build', 'img', 't');
const IMGMETA_PLACEHOLDER = '/*__IMGMETA__*/{}';

const HELP = `Subhasta data lint

  node tools/lint_data.js [--no-info] [--json] [--quiet]

Loads src/data_*.js in build order into a DOM-less sandbox and validates ids,
cross-references, image ids against IMG and build/img, verification flags,
dates, source URLs and string debris. Prints ERROR / WARN / INFO groups and
exits 1 when any ERROR is present.

  --no-info   omit the INFO (orphans) section
  --json      print the findings as JSON instead of text
  --quiet     print only the summary line (and the JSON, if asked)
  --help      this text

The header comment of the script explains how to add a rule.`;

/* ------------------------------------------------------------------ CLI */
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(HELP); process.exit(0); }
const OPTS = { json: argv.includes('--json'), noInfo: argv.includes('--no-info'), quiet: argv.includes('--quiet') };
const t0 = Date.now();

/* ------------------------------------------------------------- findings */
const findings = [];
const notes = [];
const F = {
  add(sev, rule, where, msg) { findings.push({ sev, rule, where, msg }); },
  error(rule, where, msg) { F.add('ERROR', rule, where, msg); },
  warn(rule, where, msg) { F.add('WARN', rule, where, msg); },
  info(rule, where, msg) { F.add('INFO', rule, where, msg); },
  note(msg) { notes.push(msg); }
};

/* ---------------------------------------------------------------- utils */
const read = f => fs.readFileSync(f, 'utf8');
const ids = (arr, key = 'id') => new Set((arr || []).map(x => x && x[key]).filter(v => v != null));
const keys = obj => new Set(Object.keys(obj || {}));
const isStr = v => typeof v === 'string';
const q = s => `“${s}”`;
const slug = s => String(s).toLowerCase().replace(/[’'".,:()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lotId = r => slug(r.artist.split(' ').pop() + '-' + r.title); // same as app.js
const dup = arr => { const seen = new Map(), out = []; arr.forEach((v, i) => { if (seen.has(v)) out.push([v, seen.get(v), i]); else seen.set(v, i); }); return out; };
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

/* ------------------------------------------------------------ loading */
const sources = {};      // data file -> source text as the browser sees it (IMG JSON injected)
const raw = {};          // data file -> source text as it sits in src/ (for line-accurate scans)
const engines = {};      // engine file -> source text
const declaredIn = {};   // collection name -> file
let D = null;            // the data namespace

function loadData() {
  const imgMeta = fs.existsSync(IMG_META) ? read(IMG_META) : null;
  if (!imgMeta) F.error('files', 'data/images_meta.json', 'image registry missing; build.py needs it too');
  for (const f of DATA_FILES) {
    const p = path.join(SRC, f);
    if (!fs.existsSync(p)) { F.error('files', `src/${f}`, 'data file missing'); continue; }
    let code = read(p);
    raw[f] = code;
    if (f === 'data_reel.js') {
      if (!code.includes(IMGMETA_PLACEHOLDER)) F.error('files', `src/${f}`, `placeholder ${IMGMETA_PLACEHOLDER} not found; build.py cannot inject the image registry`);
      else if (imgMeta) code = code.replace(IMGMETA_PLACEHOLDER, imgMeta);
    } else if (code.includes('__IMGMETA__')) F.warn('files', `src/${f}`, 'contains an __IMGMETA__ placeholder; only data_reel.js is substituted by build.py');
    sources[f] = code;
    const re = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/mg; let m;
    while ((m = re.exec(code))) { if (declaredIn[m[1]] && declaredIn[m[1]] !== f) F.error('purity', `src/${f}`, `${m[1]} is declared again (first in ${declaredIn[m[1]]}); the page would throw a SyntaxError`); declaredIn[m[1]] = declaredIn[m[1]] || f; }
    // comma-separated declarators on the same line (const A=1,B=2;)
    const re2 = /^(?:const|let|var)\s+[^\n]*?,\s*([A-Z_][A-Z0-9_]*)\s*=/mg;
    while ((m = re2.exec(code))) { declaredIn[m[1]] = declaredIn[m[1]] || f; }
  }
  for (const f of ENGINE_FILES) { const p = path.join(SRC, f); engines[f] = fs.existsSync(p) ? read(p) : ''; if (!engines[f]) F.warn('files', `src/${f}`, 'engine file missing; engine-side checks for it are skipped'); }

  // Pass 1: verbatim, in a sandbox with no window/document. A ReferenceError here means impure data.
  const bare = vm.createContext({});
  for (const f of DATA_FILES) {
    if (!sources[f]) continue;
    try { vm.runInContext(sources[f], bare, { filename: f, timeout: 4000 }); }
    catch (e) { F.error('purity', `src/${f}`, `${e.name}: ${e.message}` + (/window|document|navigator|location/.test(e.message) ? ' — data files must not touch the DOM' : '')); }
  }
  // Pass 2: const → var so the collections become inspectable properties of the sandbox.
  const ctx = vm.createContext({});
  for (const f of DATA_FILES) {
    if (!sources[f]) continue;
    try { vm.runInContext(sources[f].replace(/^const /mg, 'var '), ctx, { filename: f, timeout: 4000 }); } catch (e) { /* already reported */ }
  }
  D = ctx;
  for (const k of Object.keys(ctx)) if (!declaredIn[k]) declaredIn[k] = '?';
}

const fileOf = name => declaredIn[name] && declaredIn[name] !== '?' ? `src/${declaredIn[name]}` : '';
const at = (name, where) => (fileOf(name) ? `${fileOf(name)} ` : '') + where;
const article = s => /^(a|an|the) /i.test(s) ? s : (/^[aeiou]/i.test(s) ? 'an ' : 'a ') + s;

/* ------------------------------------------ engine constants (kept in sync) */
const ENGINE = {};
function pick(file, re, fallback, label, parse) {
  const src = engines[file] || '';
  const m = src.match(re);
  if (!m) { F.note(`could not read ${label} from src/${file}; using the built-in fallback — update the regex in tools/lint_data.js`); return fallback; }
  try { return parse(m); } catch (e) { F.note(`could not parse ${label} from src/${file} (${e.message}); using the fallback`); return fallback; }
}
const listOfQuoted = s => Array.from(s.matchAll(/'([^']*)'/g)).map(m => m[1]);
const keysOfLiteral = s => Array.from(s.matchAll(/(?:^|[{,])\s*'?([A-Za-z_$][\w$]*)'?\s*:/g)).map(m => m[1]);
function readEngineConstants() {
  ENGINE.VIEWS = pick('app.js', /const VIEWS=\[([^\]]*)\]/, ['floor', 'pulse', 'atlas', 'houses', 'people', 'hammer', 'signals', 'ledger', 'salon', 'undertow', 'desk', 'lexicon'], 'VIEWS', m => listOfQuoted(m[1]));
  ENGINE.PGROUPS = pick('app.js', /const PGROUPS=\{([^}]*)\}/, ['house', 'advisory', 'finance', 'gallery', 'fair', 'data'], 'PGROUPS', m => keysOfLiteral(m[1]));
  ENGINE.TYPE_ORDER = pick('app.js', /const TYPE_ORDER=\[([^\]]*)\]/, ['auction', 'gallery', 'advisory', 'finance', 'insurance', 'fair', 'data', 'logistics', 'freeport'], 'TYPE_ORDER', m => listOfQuoted(m[1]));
  // orgName() falls back to ORG_ALIASES (data_people.js); the lint reads the data and only checks that app.js still consults it
  ENGINE.ORG_FALLBACK = Object.keys((D && D.ORG_ALIASES) || {});
  if (!/ORG_ALIASES\[id\]/.test(engines['app.js'] || '')) F.note('app.js orgName() no longer reads ORG_ALIASES[id]; the PEOPLE[].org rule may be out of date');
  ENGINE.SCHED = pick('app.js', /const SCHED=\{(.*?)\};\n/, ['sothebys', 'christies', 'phillips', 'bonhams', 'heritage'], 'SCHED', m => keysOfLiteral(m[1].replace(/\[[^\]]*\]/g, '0')));
  ENGINE.TODAY = pick('app.js', /const TODAY='(\d{4}-\d{2}-\d{2})'/, '2026-10-05', 'TODAY', m => m[1]);
  ENGINE.THEMES = pick('under.js', /const THEMES=\{([^}]*)\}/, ['tax', 'logistics', 'data'], 'THEMES', m => keysOfLiteral(m[1]));
  ENGINE.REEL_KINDS = pick('reel.js', /const DUR=\{([^}]*)\}/, ['lot', 'up', 'story', 'signal', 'path', 'treaty', 'fees', 'kpi', 'cal', 'cta', 'under', 'journey', 'money', 'symptom', 'hub', 'segment'], 'DUR (Reel kinds)', m => keysOfLiteral(m[1]));
  ENGINE.FX_VENUES = pick('under.js', /const fxv=\{([^}]*)\}/, ['london', 'paris', 'geneva', 'hk', 'ny'], 'flowModel FX map', m => keysOfLiteral(m[1]));
  ENGINE.FX_KEYS = pick('under.js', /const fxv=\{([^}]*)\}/, ['gbp', 'eur', 'chf', 'hkd'], 'flowModel FX keys', m => Array.from(m[1].matchAll(/FX\.(\w+)/g)).map(x => x[1]));
  ENGINE.REGION_BOX = pick('atlas.js', /const REGION_BOX=\{([^}]*)\}/, null, 'REGION_BOX', m => keysOfLiteral(m[1].replace(/\[[^\]]*\]/g, '0')));
  // the Floor tiles drawn from EVIDENCE (evTile('key') in app.js): those entries need d, chg and by as well as l and v
  ENGINE.EV_TILES = Array.from((engines['app.js'] || '').matchAll(/evTile\('([a-z0-9_]+)'\)/g)).map(m => m[1]);
  if (!ENGINE.EV_TILES.length) F.note('no evTile(\'…\') call found in app.js; the EVIDENCE tile-field rule is skipped');
  ENGINE.STATION_DEFAULT = pick('under.js', /let stationSel='(\w+)'/, 'auction', 'default station', m => m[1]);
  ENGINE.LAB_INSTR = pick('lab.js', /const LAB_INSTR=\[(.*?)\];\n/, ['returns', 'roundtrip', 'structure', 'provenance', 'hands', 'confidence'], 'LAB_INSTR', m => Array.from(m[1].matchAll(/\['(\w+)'/g)).map(x => x[1]));
  ENGINE.LENS_DEFAULT = pick('pulse.js', /\{role:'(\w+)',region:'(\w+)'\}/, ['collector', 'na'], 'LENS default', m => [m[1], m[2]]);
  ENGINE.FLOW_DEFAULT = pick('under.js', /const FLOW=\{([^}]*)\}/, { house: 'sothebys', venue: 'ny', dest: 'nyc' }, 'FLOW default', m => Object.fromEntries(Array.from(m[1].matchAll(/(house|venue|dest):'(\w+)'/g)).map(x => [x[1], x[2]])));
}

/* --------------------------------------------------- literal refs in engines */
// Every id an engine hard-codes must exist in the data; these regexes collect them.
function engineLiterals() {
  const all = ENGINE_FILES.map(f => engines[f] || '').join('\n');
  const grab = re => Array.from(all.matchAll(re)).map(m => m[1]).filter(v => !/\$\{/.test(v));
  const L = {
    under: grab(/data-under="([a-z0-9_-]+)"/g),
    symptom: grab(/data-symptom="([a-z0-9_-]+)"/g),
    story: grab(/data-story="([a-z0-9_-]+)"/g),
    hub: grab(/data-hub="([a-z0-9_-]+)"/g),
    segment: grab(/data-segment="([a-z0-9_-]+)"/g),
    ev: grab(/data-ev="([a-z0-9_-]+)"/g),
    lb: grab(/data-lb="([a-z0-9_-]+)"/g),
    vital: grab(/data-vital="([a-z0-9_-]+)"/g),
    go: grab(/data-go="([a-z0-9_-]+)"/g),
    img: grab(/img\/(?:t\/)?([a-z0-9-]+)\.jpg/g),
    venue: [], dest: [], house: [], regimes: [], segs: [], stations: []
  };
  // renderFloor: ['top','bottom','guar','imp'].map(id=>VITALS.find(…)) and the ATLAS teaser list
  for (const m of all.matchAll(/\[((?:'[a-z0-9_-]+',?)+)\]\.map\(id=>\{?(?:const \w+=)?(VITALS|ATLAS)\.find/g)) { const list = listOfQuoted(m[1]); (m[2] === 'VITALS' ? L.vital : L.under).push(...list); }
  // under.js drawFlow ledger rows: the last element of each row is an ATLAS id ('rule' and 'fees' are special), a literal or a ternary of
  // literals (cond?'exportvat':'euvat'), so every one-word literal that ends a row or stands in such a ternary is read
  const rows = (engines['under.js'] || '').match(/const rows=\[\[(.*?)\]\];/s);
  if (rows) for (const m of rows[1].matchAll(/[,?:]'([a-z0-9]+)'(?=\]|:|$)/g)) if (!['rule', 'fees'].includes(m[1])) L.under.push(m[1]);
  // clinic.js: CLINIC_FLAGS third column and the notes pushed with an atlas id
  const cl = engines['clinic.js'] || '';
  const flags = cl.match(/const CLINIC_FLAGS=\[(.*?)\];/s);
  if (flags) for (const m of flags[1].matchAll(/\['[a-z]+','[^']*','([a-z0-9]+)'\]/g)) L.under.push(m[1]);
  for (const m of cl.matchAll(/\.push\(\[(?:'[^']*'|`[^`]*`),'([a-z0-9]+)'\]\)/g)) L.under.push(m[1]);
  for (const m of cl.matchAll(/return '([a-z0-9]+)'/g)) L.segs.push(m[1]);
  for (const m of cl.matchAll(/seg\.id==='([a-z0-9]+)'/g)) L.segs.push(m[1]);
  for (const m of cl.matchAll(/new Set\(\[([^\]]*)\]\)/g)) L.regimes.push(...listOfQuoted(m[1]));
  // flow presets (under.js), the flowForHub/flowForLot fallbacks (pulse.js, under.js) and the Reel money card: house/venue/dest keys in object literals
  const flowText = ['under.js', 'pulse.js', 'reel.js'].map(f => engines[f] || '').join('\n');
  for (const m of flowText.matchAll(/[{,](house|venue|dest):'(\w+)'/g)) L[m[1]].push(m[2]);
  for (const m of flowText.matchAll(/(?:\?h\.room:|includes\(city\)\)\|\|)'(\w+)'/g)) L.venue.push(m[1]); // the room assumed when a hub or a city maps to none (flowForHub, venueForCity)
  L.ev.push(...(ENGINE.EV_TILES || []));
  L.stations.push(ENGINE.STATION_DEFAULT);
  for (const k of Object.keys(L)) L[k] = [...new Set(L[k])];
  return L;
}

/* ---------------------------------------------------------- source scan */
// A tiny tokenizer: finds duplicate keys inside object literals (JS silently keeps the
// last one, so evaluation cannot see them), straight apostrophes in strings and the
// enclosing key of each string. Good enough for data files; not a JS parser.
function scanSource(code, fileLabel, out) {
  let i = 0, line = 1; const n = code.length;
  const stack = [];                 // [{ch:'{'|'[', keys:Map, name:string|null, lastKey:null}]
  let topName = null;               // name of the top-level const being scanned
  const keyAt = () => { for (let k = stack.length - 1; k >= 0; k--) if (stack[k].lastKey) return stack[k].lastKey; return null; };
  while (i < n) {
    const c = code[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && code[i + 1] === '/') { while (i < n && code[i] !== '\n') i++; continue; }
    if (c === '/' && code[i + 1] === '*') { const j = code.indexOf('*/', i + 2); const seg = code.slice(i, j < 0 ? n : j + 2); line += (seg.match(/\n/g) || []).length; i = j < 0 ? n : j + 2; continue; }
    if (c === '\'' || c === '"' || c === '`') {
      const quote = c; let j = i + 1, text = '', escaped = false, straight = false;
      while (j < n) { const d = code[j]; if (d === '\\') { if (code[j + 1] === '\'' && quote === '\'') { escaped = true; } text += code[j + 1] || ''; j += 2; continue; } if (d === quote) break; if (d === '\n') line++; if (d === '\'' && quote === '"') straight = true; text += d; j++; }
      const key = keyAt();
      if (escaped) out.escapedApos.push({ file: fileLabel, line, key, text, top: topName });
      if (straight) out.doubleQuotedApos.push({ file: fileLabel, line, key, text, top: topName });
      // is this string a key?  look ahead for ':'
      let k = j + 1; while (k < n && /\s/.test(code[k])) k++;
      if (code[k] === ':' && stack.length && stack[stack.length - 1].ch === '{') registerKey(text, line);
      i = j + 1; continue;
    }
    if (c === '{' || c === '[') { stack.push({ ch: c, keys: new Map(), lastKey: null, name: topName, depth: stack.length }); i++; continue; }
    if (c === '}' || c === ']') { stack.pop(); if (!stack.length) topName = null; i++; continue; }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i; while (j < n && /[\w$]/.test(code[j])) j++; const word = code.slice(i, j);
      if (!stack.length && (word === 'const' || word === 'let' || word === 'var')) { const m = code.slice(j).match(/^\s+([A-Za-z_$][\w$]*)/); topName = m ? m[1] : null; }
      let k = j; while (k < n && /[ \t]/.test(code[k])) k++;
      if (code[k] === ':' && stack.length && stack[stack.length - 1].ch === '{') registerKey(word, line);
      i = j; continue;
    }
    i++;
  }
  function registerKey(key, ln) {
    const top = stack[stack.length - 1]; top.lastKey = key;
    if (top.keys.has(key)) out.dupKeys.push({ file: fileLabel, line: ln, firstLine: top.keys.get(key), key, top: top.name, depth: top.depth });
    else top.keys.set(key, ln);
  }
}

/* -------------------------------------------------------- image sites */
// Every place an image id can appear in the data. v = image id, where = label.
const IMAGE_SITES = [
  { name: 'LOTIMG[].i', items: D => Object.entries(D.LOTIMG || {}).map(([k, v]) => ({ v: v && v.i, where: `LOTIMG[${q(k)}]`, caption: v && v.n, exact: v && v.x })) },
  { name: 'UPIMG[].i', items: D => Object.entries(D.UPIMG || {}).map(([k, v]) => ({ v: v && v.i, where: `UPIMG[${q(k)}]`, caption: v && v.n, exact: v && v.x })) },
  { name: 'STORYIMG', items: D => Object.entries(D.STORYIMG || {}).map(([k, v]) => ({ v, where: `STORYIMG[${k}]` })) },
  { name: 'HOUSEIMG[].i', items: D => Object.entries(D.HOUSEIMG || {}).map(([k, v]) => ({ v: v && v.i, where: `HOUSEIMG[${k}]`, caption: v && v.n })) },
  { name: 'SIGIMG', items: D => Object.entries(D.SIGIMG || {}).map(([k, v]) => ({ v, where: `SIGIMG[${q(k)}]` })) },
  { name: 'REEL[].i', items: D => (D.REEL || []).map((c, i) => ({ v: c.i, where: `REEL[${i}] ${c.k}${c.ref ? ' ' + q(c.ref) : ''}` })) },
  { name: 'STATIONS[].img', items: D => (D.STATIONS || []).map(s => ({ v: s.img, where: `STATIONS[${s.id}]`, caption: s.cap, exact: s.x })) },
  { name: 'ATLAS[].img', items: D => (D.ATLAS || []).map(a => ({ v: a.img, where: `ATLAS[${a.id}]`, exact: a.x })) },
  { name: 'JOURNEYS[].img', items: D => (D.JOURNEYS || []).map(j => ({ v: j.img, where: `JOURNEYS[${j.id}]`, required: true })) },
  { name: 'VITALS[].img', items: D => (D.VITALS || []).map(v => ({ v: v.img, where: `VITALS[${v.id}]` })) },
  { name: 'SYMPTOMS[].img', items: D => (D.SYMPTOMS || []).map(s => ({ v: s.img, where: `SYMPTOMS[${s.id}]` })) },
  { name: 'LONGVIEW[].img', items: D => (D.LONGVIEW || []).map((e, i) => ({ v: e.img, where: `LONGVIEW[${i}] ${e.y}`, exact: e.x })) },
  { name: 'HUBS[].img', items: D => (D.HUBS || []).map(h => ({ v: h.img, where: `HUBS[${h.id}]` })) },
  { name: 'SEGMENTS[].img', items: D => (D.SEGMENTS || []).map(s => ({ v: s.img, where: `SEGMENTS[${s.id}]` })) },
  { name: 'HERO.img', items: D => D.HERO ? [{ v: D.HERO.img, where: 'HERO.img', required: true }] : [] }
];

/* ------------------------------------------------- cross-reference table */
const lotTitles = D => new Set([...(D.RESULTS || []), ...(D.RESULTS_MORE || [])].map(r => r.title));
const storyIds = D => ids([...(D.STORIES || []), ...(D.STORIES_MORE || [])]);
const orgIds = D => new Set([...ids(D.HOUSES), ...ids(D.PLAYERS)]);
const atlasStations = D => new Set([...ids(D.STATIONS), ...(ENGINE.THEMES || [])]);
const REEL_TARGET = { lot: lotTitles, path: lotTitles, up: D => ids(D.UPCOMING, 'title'), story: storyIds, signal: D => ids(D.SIGNALS, 't'), treaty: D => ids([...(D.PRIVATE_TREATY || []), ...(D.PRIVATE_MORE || [])], 'work'), kpi: D => keys(D.EVIDENCE), under: D => ids(D.ATLAS), journey: D => ids(D.JOURNEYS), symptom: D => ids(D.SYMPTOMS), hub: D => ids(D.HUBS), segment: D => ids(D.SEGMENTS) };
const REEL_TARGET_NAME = { lot: 'a lot title in RESULTS/RESULTS_MORE', path: 'a lot title in RESULTS/RESULTS_MORE', up: 'UPCOMING.title', story: 'STORIES/STORIES_MORE.id', signal: 'SIGNALS.t', treaty: 'PRIVATE_TREATY/PRIVATE_MORE.work', kpi: 'EVIDENCE key (the Reel reads R.EVIDENCE[ref]; MARKET.global mirrors it)', under: 'ATLAS.id', journey: 'JOURNEYS.id', symptom: 'SYMPTOMS.id', hub: 'HUBS.id', segment: 'SEGMENTS.id' };

const REFS = [
  // --- images maps keyed by something else
  { name: 'LOTIMG keys → lot titles', sev: 'ERROR', items: D => Object.keys(D.LOTIMG || {}).map(k => ({ v: k, where: `LOTIMG[${q(k)}]` })), target: lotTitles, targetName: 'RESULTS/RESULTS_MORE.title' },
  { name: 'UPIMG keys → UPCOMING titles', sev: 'ERROR', items: D => Object.keys(D.UPIMG || {}).map(k => ({ v: k, where: `UPIMG[${q(k)}]` })), target: D => ids(D.UPCOMING, 'title'), targetName: 'UPCOMING.title' },
  { name: 'STORYIMG keys → story ids', sev: 'ERROR', items: D => Object.keys(D.STORYIMG || {}).map(k => ({ v: k, where: `STORYIMG[${k}]` })), target: storyIds, targetName: 'STORIES/STORIES_MORE.id' },
  { name: 'HOUSEIMG keys → HOUSES ids', sev: 'ERROR', items: D => Object.keys(D.HOUSEIMG || {}).map(k => ({ v: k, where: `HOUSEIMG[${k}]` })), target: D => ids(D.HOUSES), targetName: 'HOUSES.id' },
  { name: 'SIGIMG keys → SIGNALS titles', sev: 'ERROR', items: D => Object.keys(D.SIGIMG || {}).map(k => ({ v: k, where: `SIGIMG[${q(k)}]` })), target: D => ids(D.SIGNALS, 't'), targetName: 'SIGNALS.t' },
  // --- the Reel
  { name: 'REEL[].k → Reel kinds (DUR in reel.js)', sev: 'ERROR', items: D => (D.REEL || []).map((c, i) => ({ v: c.k, where: `REEL[${i}]` })), target: () => new Set(ENGINE.REEL_KINDS), targetName: 'a kind the Reel renders' },
  // --- houses, people, lots
  { name: 'RESULTS[].house → HOUSES ids', sev: 'ERROR', items: D => (D.RESULTS || []).map((r, i) => ({ v: r.house, where: `RESULTS[${i}] ${q(r.title)}` })), target: D => ids(D.HOUSES), targetName: 'HOUSES.id' },
  { name: 'RESULTS_MORE[].house → HOUSES ids', sev: 'ERROR', items: D => (D.RESULTS_MORE || []).map((r, i) => ({ v: r.house, where: `RESULTS_MORE[${i}] ${q(r.title)}` })), target: D => ids(D.HOUSES), targetName: 'HOUSES.id' },
  { name: 'UPCOMING[].house → HOUSES ids', sev: 'ERROR', items: D => (D.UPCOMING || []).map((r, i) => ({ v: r.house, where: `UPCOMING[${i}] ${q(r.title)}` })), target: D => ids(D.HOUSES), targetName: 'HOUSES.id' },
  { name: 'RESULTS[].cat → CATS', sev: 'ERROR', items: D => [...(D.RESULTS || []), ...(D.RESULTS_MORE || [])].map(r => ({ v: r.cat, where: `lot ${q(r.title)}` })), target: D => new Set(D.CATS || []), targetName: 'CATS' },
  { name: 'HOUSES[].type → TYPES', sev: 'ERROR', items: D => (D.HOUSES || []).map(h => ({ v: h.type, where: `HOUSES[${h.id}]` })), target: D => keys(D.TYPES), targetName: 'TYPES key' },
  { name: 'PLAYERS[].type → TYPES', sev: 'ERROR', items: D => (D.PLAYERS || []).map(h => ({ v: h.type, where: `PLAYERS[${h.id}]` })), target: D => keys(D.TYPES), targetName: 'TYPES key' },
  { name: 'PEOPLE[].org → HOUSES/PLAYERS ids (or an ORG_ALIASES key)', sev: 'ERROR', items: D => (D.PEOPLE || []).map((p, i) => ({ v: p.org, where: `PEOPLE[${i}] ${p.n}` })), target: D => new Set([...orgIds(D), ...(ENGINE.ORG_FALLBACK || [])]), targetName: () => 'HOUSES.id ∪ PLAYERS.id ∪ ORG_ALIASES {' + (ENGINE.ORG_FALLBACK || []).join(',') + '}' },
  { name: 'ORG_ALIASES keys ∉ HOUSES/PLAYERS ids (byId would win and the alias would be dead)', sev: 'ERROR', items: D => Object.keys(D.ORG_ALIASES || {}).map(k => ({ v: k, where: `ORG_ALIASES[${k}]` })), target: D => new Set(Object.keys(D.ORG_ALIASES || {}).filter(k => !orgIds(D).has(k))), targetName: 'key free of HOUSES.id and PLAYERS.id' },
  { name: 'PEOPLE[].g → PGROUPS (app.js)', sev: 'ERROR', items: D => (D.PEOPLE || []).map((p, i) => ({ v: p.g, where: `PEOPLE[${i}] ${p.n}` })), target: () => new Set(ENGINE.PGROUPS), targetName: 'PGROUPS key' },
  { name: 'ROUTES[].org → HOUSES ids', sev: 'ERROR', items: D => (D.ROUTES || []).map((r, i) => ({ v: r.org, where: `ROUTES[${i}]` })), target: D => ids(D.HOUSES), targetName: 'HOUSES.id' },
  { name: 'TIMELINES keys → HOUSES ids', sev: 'ERROR', items: D => Object.keys(D.TIMELINES || {}).map(k => ({ v: k, where: `TIMELINES[${k}]` })), target: D => ids(D.HOUSES), targetName: 'HOUSES.id' },
  { name: 'CHAINS keys → lot titles', sev: 'ERROR', items: D => Object.keys(D.CHAINS || {}).map(k => ({ v: k, where: `CHAINS[${q(k)}]` })), target: lotTitles, targetName: 'RESULTS/RESULTS_MORE.title' },
  { name: 'lot artists → ARTIST_DIED keys (the resale-right rule in Follow the money)', sev: 'ERROR', items: D => [...(D.RESULTS || []).map((r, i) => ({ v: r.artist, where: `RESULTS[${i}] ${q(r.title)}` })), ...(D.RESULTS_MORE || []).map((r, i) => ({ v: r.artist, where: `RESULTS_MORE[${i}] ${q(r.title)}` })), ...(D.UPCOMING || []).map((r, i) => ({ v: r.artist, where: `UPCOMING[${i}] ${q(r.title)}` }))], target: D => keys(D.ARTIST_DIED), targetName: 'ARTIST_DIED key (year of death, null = living, false = not an artist’s work)' },
  { name: 'in-term lot artists → ARTIST_NATION keys (the resale right’s nationality test)', sev: 'ERROR', items: D => [...(D.RESULTS || []), ...(D.RESULTS_MORE || []), ...(D.UPCOMING || [])].filter(r => { const v = (D.ARTIST_DIED || {})[r.artist]; return v === null || (Number.isInteger(v) && +ENGINE.TODAY.slice(0, 4) - v <= 70); }).map(r => ({ v: r.artist, where: `lot ${q(r.title)}` })), target: D => new Set(Object.keys(D.ARTIST_NATION || {})), targetName: 'ARTIST_NATION key' },
  // --- the Floor's front page
  { name: 'FLOOR.vitals → VITALS ids', sev: 'ERROR', items: D => ((D.FLOOR || {}).vitals || []).map((v, i) => ({ v, where: `FLOOR.vitals[${i}]` })), target: D => ids(D.VITALS), targetName: 'VITALS.id' },
  { name: 'FLOOR.under → ATLAS ids', sev: 'ERROR', items: D => ((D.FLOOR || {}).under || []).map((v, i) => ({ v, where: `FLOOR.under[${i}]` })), target: D => ids(D.ATLAS), targetName: 'ATLAS.id' },
  { name: 'HERO.acts[].story → story ids', sev: 'ERROR', items: D => ((D.HERO || {}).acts || []).map((a, i) => ({ v: a.story, where: `HERO.acts[${i}]` })), target: storyIds, targetName: 'STORIES/STORIES_MORE.id' },
  { name: 'STORIES[].players → HOUSES/PLAYERS/COLLECTORS ids', sev: 'ERROR', items: D => [...(D.STORIES || []), ...(D.STORIES_MORE || [])].map(s => ({ v: s.players, where: `story ${s.id}` })), target: D => new Set([...orgIds(D), ...ids(D.COLLECTORS)]), targetName: 'HOUSES.id ∪ PLAYERS.id ∪ COLLECTORS.id' },
  { name: 'JOURNEYS[].lot → lot titles', sev: 'ERROR', items: D => (D.JOURNEYS || []).map(j => ({ v: j.lot, where: `JOURNEYS[${j.id}]` })), target: lotTitles, targetName: 'RESULTS/RESULTS_MORE.title' },
  { name: 'JOURNEYS station references (st on the journey or on a step) → STATIONS ids', sev: 'ERROR', items: D => (D.JOURNEYS || []).flatMap(j => [{ v: j.st, where: `JOURNEYS[${j.id}].st` }, ...(j.steps || []).map((s, i) => ({ v: s.st, where: `JOURNEYS[${j.id}].steps[${i}].st` }))]), target: D => ids(D.STATIONS), targetName: 'STATIONS.id' },
  // --- atlas of undercurrents
  { name: 'ATLAS[].st → STATIONS ids (or a THEMES key in under.js)', sev: 'ERROR', items: D => (D.ATLAS || []).map(a => ({ v: a.st, where: `ATLAS[${a.id}]` })), target: atlasStations, targetName: () => 'STATIONS.id ∪ {' + (ENGINE.THEMES || []).join(',') + '}' },
  { name: 'ATLAS[].story → story ids', sev: 'ERROR', items: D => (D.ATLAS || []).map(a => ({ v: a.story, where: `ATLAS[${a.id}]` })), target: storyIds, targetName: 'STORIES/STORIES_MORE.id' },
  { name: 'CHECKS[][1] → ATLAS ids', sev: 'ERROR', items: D => (D.CHECKS || []).map((c, i) => ({ v: c[1], where: `CHECKS[${i}]` })), target: D => ids(D.ATLAS), targetName: 'ATLAS.id' },
  // --- pulse
  { name: 'VITALS[].src → PULSE_SRC keys', sev: 'ERROR', items: D => (D.VITALS || []).map(v => ({ v: v.src, where: `VITALS[${v.id}]` })), target: D => keys(D.PULSE_SRC), targetName: 'PULSE_SRC key' },
  { name: 'SYMPTOMS[].src → PULSE_SRC keys', sev: 'ERROR', items: D => (D.SYMPTOMS || []).map(s => ({ v: s.src, where: `SYMPTOMS[${s.id}]` })), target: D => keys(D.PULSE_SRC), targetName: 'PULSE_SRC key' },
  { name: 'VITALS[].s → SERIES keys', sev: 'ERROR', items: D => (D.VITALS || []).map(v => ({ v: v.s, where: `VITALS[${v.id}]` })), target: D => keys(D.SERIES), targetName: 'SERIES key' },
  // --- atlas (hubs, segments, fairs, institutions, lens)
  { name: 'HUBS[].r → REGIONS keys', sev: 'ERROR', items: D => (D.HUBS || []).map(h => ({ v: h.r, where: `HUBS[${h.id}]` })), target: D => keys(D.REGIONS), targetName: 'REGIONS key' },
  { name: 'SEGMENTS[].g → SEGGROUPS keys', sev: 'ERROR', items: D => (D.SEGMENTS || []).map(s => ({ v: s.g, where: `SEGMENTS[${s.id}]` })), target: D => keys(D.SEGGROUPS), targetName: 'SEGGROUPS key' },
  { name: 'FAIRS[].hub → HUBS ids', sev: 'ERROR', items: D => (D.FAIRS || []).map((f, i) => ({ v: f.hub, where: `FAIRS[${i}] ${q(f.n)}` })), target: D => ids(D.HUBS), targetName: 'HUBS.id' },
  { name: 'INSTITUTIONS[].hub → HUBS ids', sev: 'ERROR', items: D => (D.INSTITUTIONS || []).map(x => ({ v: x.hub, where: `INSTITUTIONS[${x.id}]` })), target: D => ids(D.HUBS), targetName: 'HUBS.id' },
  { name: 'LENS_REGIONS[].hubs → HUBS ids', sev: 'ERROR', items: D => Object.entries(D.LENS_REGIONS || {}).map(([k, r]) => ({ v: r.hubs, where: `LENS_REGIONS[${k}]` })), target: D => ids(D.HUBS), targetName: 'HUBS.id' },
  { name: 'LENS_REGIONS[].segs → SEGMENTS ids', sev: 'ERROR', items: D => Object.entries(D.LENS_REGIONS || {}).map(([k, r]) => ({ v: r.segs, where: `LENS_REGIONS[${k}]` })), target: D => ids(D.SEGMENTS), targetName: 'SEGMENTS.id' },
  { name: 'LENS_REGIONS[].reg → REGIMES.j', sev: 'ERROR', items: D => Object.entries(D.LENS_REGIONS || {}).map(([k, r]) => ({ v: r.reg, where: `LENS_REGIONS[${k}]` })), target: D => ids(D.REGIMES, 'j'), targetName: 'REGIMES.j' },
  { name: 'LENS_REGIONS keys → REGIONS keys', sev: 'ERROR', items: D => Object.keys(D.LENS_REGIONS || {}).map(k => ({ v: k, where: `LENS_REGIONS[${k}]` })), target: D => keys(D.REGIONS), targetName: 'REGIONS key' },
  { name: 'REGIONS keys → LENS_REGIONS keys (the lens needs every region)', sev: 'ERROR', items: D => Object.keys(D.REGIONS || {}).map(k => ({ v: k, where: `REGIONS[${k}]` })), target: D => keys(D.LENS_REGIONS), targetName: 'LENS_REGIONS key' },
  { name: 'COUNTRY_SHARE names → WORLD[].n', sev: 'ERROR', items: D => Object.keys(D.COUNTRY_SHARE || {}).map(k => ({ v: k, where: `COUNTRY_SHARE[${q(k)}]` })), target: D => ids(D.WORLD, 'n'), targetName: 'a country name in WORLD (the map polygons)' },
  // --- flow model
  { name: 'VENUES keys → flow-model FX map (under.js)', sev: 'ERROR', items: D => Object.keys(D.VENUES || {}).map(k => ({ v: k, where: `VENUES[${k}]` })), target: () => new Set(ENGINE.FX_VENUES), targetName: 'a venue flowModel knows an exchange rate for' },
  { name: 'flow-model FX keys → FX', sev: 'ERROR', items: () => (ENGINE.FX_KEYS || []).map(k => ({ v: k, where: `under.js FX.${k}` })), target: D => keys(D.FX), targetName: 'FX key' },
  { name: 'HUBS[].room → VENUES keys (the sale room Follow the money opens for a hub)', sev: 'ERROR', items: D => (D.HUBS || []).map(h => ({ v: h.room, where: `HUBS[${h.id}]` })), target: D => keys(D.VENUES), targetName: 'VENUES key' },
  { name: 'VENUES[].homeDest → DESTS keys', sev: 'ERROR', items: D => Object.entries(D.VENUES || {}).map(([k, v]) => ({ v: v.homeDest, where: `VENUES[${k}]` })), target: D => keys(D.DESTS), targetName: 'DESTS key' },
  { name: 'RESULTS[].city → VENUES[].cities', sev: 'INFO', items: D => [...new Set([...(D.RESULTS || []), ...(D.RESULTS_MORE || [])].map(r => r.city))].map(c => ({ v: c, where: `city ${q(c)}` })), target: D => new Set(Object.values(D.VENUES || {}).flatMap(v => v.cities || [])), targetName: 'city of one of the five sale rooms (Follow the money assumes New York for it)' },
  { name: 'REGIONS keys → REGION_BOX (atlas.js)', sev: 'WARN', items: D => Object.keys(D.REGIONS || {}).map(k => ({ v: k, where: `REGIONS[${k}]` })), target: () => new Set(ENGINE.REGION_BOX || []), targetName: 'REGION_BOX (the map cannot zoom to this region)' },
  { name: 'TYPES keys → TYPE_ORDER (app.js)', sev: 'WARN', items: D => Object.keys(D.TYPES || {}).map(k => ({ v: k, where: `TYPES[${k}]` })), target: () => new Set(ENGINE.TYPE_ORDER), targetName: 'TYPE_ORDER (no filter chip for this type)' },
  // --- engine → data: ids the engines hard-code
  { name: 'SCHED keys (app.js) → HOUSES ids', sev: 'ERROR', items: () => (ENGINE.SCHED || []).map(k => ({ v: k, where: `app.js SCHED.${k}` })), target: D => ids(D.HOUSES), targetName: 'HOUSES.id' }
];

/* ------------------------------------------------------------- schema */
// Fields an engine dereferences without a guard. type: s string, n number, a array, o object, b boolean, any
const SCHEMA = {
  HOUSES: { id: 's', name: 's', type: 's', founded: 'n', founder: 's', hq: 's', hqAddress: 's', rooms: 's', ownership: 's', leadership: 'a+', employees: 's', sales: 'o', series: 'a', spec: 's', web: 's', contacts: 'a', links: 'a', fees: 's', facts: 'a+', approach: 's', wiki: 's', sources: 'a+' },
  PLAYERS: { id: 's', name: 's', type: 's', founded: 'any', founder: 's', hq: 's', lead: 's', known: 's', web: 's', facts: 'a+', src: 'a+' },
  RESULTS: { artist: 's', title: 's', price: 'n', house: 's', city: 's', date: 's', cat: 's', rec: 'a', note: 's' },
  RESULTS_MORE: { artist: 's', title: 's', price: 'n', house: 's', city: 's', date: 's', cat: 's', rec: 'a', note: 's' },
  PRIVATE_TREATY: { work: 's', price: 's', year: 'n', who: 's', note: 's' },
  PRIVATE_MORE: { work: 's', price: 's', year: 'n', who: 's', note: 's' },
  SIGNALS: { t: 's', dir: 's', p: 's', s: 'a+' },
  NEWS: { d: 's', dt: 's', o: 's', h: 's', s: 's', u: 's' }, // dt (ISO) gives the wire its date range; d is the display form
  CALENDAR: { d: 's', n: 's', c: 's', city: 's' },
  FEES: { h: 's', eff: 's', t: 'a+' },
  CAREERS: { r: 's', w: 's', p: 's' },
  PROV_CASES: { t: 's', a: 's', lesson: 's', chain: 'a+' },
  COLLECTORS: { id: 's', name: 's', who: 's', buys: 'a', note: 's', src: 'a' },
  STORIES: { id: 's', t: 's', dek: 's', body: 'a+', players: 'a', src: 'a' },
  STORIES_MORE: { id: 's', t: 's', dek: 's', body: 'a+', players: 'a', src: 'a' },
  PEOPLE: { n: 's', org: 's', t: 's', city: 's', remit: 's', url: 's', note: 's', g: 's' },
  ROUTES: { org: 's', items: 'a+' },
  UPCOMING: { artist: 's', title: 's', est: 's', house: 's', city: 's', date: 's', note: 's', src: 's' },
  REEL: { k: 's', kick: 's' },
  STATIONS: { id: 's', n: 's', k: 's', brief: 's', money: 's', check: 's' },
  ATLAS: { id: 's', kind: 's', st: 'a+', t: 's', b: 's', c: 's', v: 's', src: 'a' },
  JOURNEYS: { id: 's', img: 's', t: 's', a: 's', v: 's', steps: 'a+', src: 'a' },
  VITALS: { id: 's', l: 's', v: 's', d: 's', dir: 's', read: 's', sub: 's', src: 'a+', vf: 's' },
  SYMPTOMS: { id: 's', t: 's', read: 's', ev: 'a+', prog: 's', src: 'a+', vf: 's' },
  LONGVIEW: { y: 'n', t: 's', vf: 's' },
  DISPATCHES: { d: 's', r: 's', h: 's', f: 's', u: 's', vf: 's' },
  HUBS: { id: 's', n: 's', c: 's', r: 's', room: 's', tier: 'n', x: 'n', y: 'n', role: 's', presence: 'o', local: 'a', fairs: 'a', regime: 'o', galleries: 'a', vf: 's', src: 'a' },
  REGIMES: { j: 's', n: 's', imp: 's', sales: 's', arr: 's', aml: 's', exp: 's', strictExport: 'b', dealerAml: 'b', vf: 's' }, // the Clinic builds its STRICT_EXPORT / NO_AML sets from the two booleans
  SEGMENTS: { id: 's', g: 's', n: 's', size: 's', trend: 's', dir: 's', record: 's', moving: 'a', where: 's', pitfall: 's', vf: 's', src: 'a' },
  FAIRS: { d: 's', n: 's', city: 's', hub: 's' }, // e (end date) is optional: the engine reads f.e||f.d
  INSTITUTIONS: { id: 's', n: 's', city: 's', c: 's', hub: 's', who: 's', opened: 'n', visitors: 's', buys: 'a', fund: 's', vf: 's', src: 'a' },
  REPORTS: { m: 'n', n: 's', by: 's', what: 's', last: 's', next: 's', u: 's' }
};
const typeOk = (v, t) => t === 'any' ? v !== undefined : t === 's' ? isStr(v) : t === 'n' ? typeof v === 'number' && !Number.isNaN(v) : t === 'b' ? typeof v === 'boolean' : t === 'a' ? Array.isArray(v) : t === 'a+' ? Array.isArray(v) && v.length > 0 : t === 'o' ? v && typeof v === 'object' && !Array.isArray(v) : true;
const label = (name, x, i) => x && (x.id != null ? x.id : x.title != null ? q(x.title) : x.n != null ? x.n : x.t != null ? q(String(x.t).slice(0, 50)) : x.name != null ? x.name : x.work != null ? q(x.work) : x.j != null ? x.j : x.y != null ? x.y : i);

/* --------------------------------------------------------- string walk */
// Visits every string in the data with a path such as HOUSES[sothebys].facts[2]; skips the map geometry.
const SKIP_WALK = new Set(['WORLD', 'PROJ', 'WORLD_W', 'WORLD_H', 'PS', 'CREDIT', 'LINKS']);
function* walkStrings(root, pathStr, depth = 0) {
  if (depth > 8 || root == null) return;
  if (isStr(root)) { yield [pathStr, root]; return; }
  if (Array.isArray(root)) { for (let i = 0; i < root.length; i++) yield* walkStrings(root[i], `${pathStr}[${i}]`, depth + 1); return; }
  if (typeof root === 'object') { for (const k of Object.keys(root)) yield* walkStrings(root[k], `${pathStr}.${k}`, depth + 1); }
}
function* allStrings(D) {
  for (const name of Object.keys(D)) {
    if (SKIP_WALK.has(name)) continue;
    const v = D[name]; if (typeof v === 'function') continue;
    if (Array.isArray(v)) { v.forEach((x, i) => { }); for (let i = 0; i < v.length; i++) yield* walkStrings(v[i], `${name}[${label(name, v[i], i)}]`, 1); }
    else if (v && typeof v === 'object') { for (const k of Object.keys(v)) yield* walkStrings(v[k], `${name}[${k}]`, 1); }
  }
}

/* -------------------------------------------------------------- checks */
function checkIds(D) {
  const R = 'unique ids';
  const idColls = ['HOUSES', 'PLAYERS', 'COLLECTORS', 'ATLAS', 'STATIONS', 'JOURNEYS', 'VITALS', 'SYMPTOMS', 'HUBS', 'SEGMENTS', 'INSTITUTIONS'];
  for (const c of idColls) for (const [v, a, b] of dup((D[c] || []).map(x => x.id))) F.error(R, at(c, `${c}[${v}]`), `id ${q(v)} used twice (items ${a} and ${b})`);
  for (const [v, a, b] of dup([...(D.HOUSES || []).map(x => 'HOUSES:' + x.id), ...(D.PLAYERS || []).map(x => 'PLAYERS:' + x.id)].map(s => s.split(':')[1]))) F.error(R, at('HOUSES', `id ${v}`), 'the same id is used by a house and a player; app.js merges both into one directory (ALL)');
  for (const [v] of dup([...(D.STORIES || []), ...(D.STORIES_MORE || [])].map(s => s.id))) F.error(R, at('STORIES', `story ${v}`), 'story id used twice across STORIES and STORIES_MORE (they are merged)');
  for (const [v] of dup((D.REGIMES || []).map(r => r.j))) F.error(R, at('REGIMES', `REGIMES[${v}]`), 'jurisdiction code used twice');
  const lots = [...(D.RESULTS || []), ...(D.RESULTS_MORE || [])];
  for (const [v, a, b] of dup(lots.map(r => r.title))) F.error(R, at('RESULTS', `lot ${q(v)}`), `lot title used twice (lots ${a} and ${b}); titles are keys for LOTIMG, CHAINS, the Reel and lotByTitle`);
  for (const [v, a, b] of dup(lots.map(lotId))) F.error(R, at('RESULTS', `lot id ${v}`), `two lots produce the same generated id (lots ${a} and ${b}); deep links #lot-${v} would be ambiguous`);
  { const ids = new Set(lots.map(lotId)); (D.COLLECTORS || []).forEach(c => (Array.isArray(c.lots) ? c.lots : []).forEach(id => { if (!ids.has(id)) F.error(R, at('COLLECTORS', `COLLECTORS[${c.id}].lots`), `${q(id)} is not a generated lot id (slug of the artist's surname and the title)`); })); }
  for (const [v] of dup((D.UPCOMING || []).map(u => u.title))) F.error(R, at('UPCOMING', `upcoming ${q(v)}`), 'upcoming title used twice (UPIMG and the Reel key by title)');
  for (const [v] of dup((D.SIGNALS || []).map(s => s.t))) F.error(R, at('SIGNALS', `signal ${q(v)}`), 'signal title used twice (SIGIMG and the Reel key by title)');
  for (const [v] of dup([...(D.PRIVATE_TREATY || []), ...(D.PRIVATE_MORE || [])].map(p => p.work))) F.error(R, at('PRIVATE_TREATY', `treaty ${q(v)}`), 'private-treaty work used twice (the Reel keys by it)');
  for (const [v, a, b] of dup((D.PEOPLE || []).map(p => p.n))) F.warn(R, at('PEOPLE', `PEOPLE[${a}]/[${b}] ${v}`), 'two people share a name; house leadership links match people by name and would open the first');
  for (const [v] of dup((D.WORLD || []).map(w => w.n))) F.warn(R, at('WORLD', `WORLD ${q(v)}`), 'country name appears twice in the map data');
  for (const [v] of dup((D.FAIRS || []).map(f => f.n + '|' + f.d))) F.warn(R, at('FAIRS', `FAIRS ${q(v.split('|')[0])}`), 'fair listed twice on the same start date');
}

function checkSourceScan(D) {
  const out = { dupKeys: [], escapedApos: [], doubleQuotedApos: [] };
  for (const f of DATA_FILES) if (raw[f]) scanSource(raw[f], `src/${f}`, out);
  // the image registry itself (JSON): duplicate keys would be silently dropped by JSON.parse too
  if (fs.existsSync(IMG_META)) scanSource('const IMG=' + read(IMG_META) + ';', 'data/images_meta.json', out);
  for (const d of out.dupKeys) F.error('unique ids', `${d.file}:${d.line} ${d.top || ''}`, `duplicate key ${q(d.key)} in an object literal (first at line ${d.firstLine}); JavaScript keeps only the last value`);
  for (const a of out.escapedApos) F.warn('apostrophes', `${a.file}:${a.line} ${a.top || ''}${a.key ? '.' + a.key : ''}`, `straight apostrophe escaped as \\' — house style is the typographic ’ (${q(a.text.slice(0, 50))})`);
  for (const a of out.doubleQuotedApos) { if (a.key === 'wiki') continue; /* Wikipedia titles must keep the straight apostrophe */ F.warn('apostrophes', `${a.file}:${a.line} ${a.top || ''}${a.key ? '.' + a.key : ''}`, `straight apostrophe in a double-quoted string ${q(a.text.slice(0, 50))} — elsewhere the data uses ’ (e.g. FEES, GLOSSARY); search by name is case-sensitive to this`); }
}

function checkRefs(D) {
  for (const r of REFS) {
    let items, target;
    try { items = r.items(D) || []; target = r.target(D); } catch (e) { F.error(r.name, 'lint', `rule could not run: ${e.message}`); continue; }
    const coll = r.name.split(/[\[\s→.]/)[0];
    for (const it of items) {
      const vals = Array.isArray(it.v) ? it.v : [it.v];
      for (const v of vals) {
        if (v == null || v === '') continue;
        if (!target.has(v)) F.add(r.sev, r.name, at(coll, it.where), `${q(v)} is not ${article(typeof r.targetName === 'function' ? r.targetName() : r.targetName)}`);
      }
    }
  }
  // the Reel's refs by kind
  for (const [i, c] of (D.REEL || []).entries()) {
    const where = at('REEL', `REEL[${i}] ${c.k}`);
    const tf = REEL_TARGET[c.k];
    if (!tf) { if (c.ref != null) F.warn('REEL[].ref', where, `kind ${q(c.k)} does not use a ref; ${q(c.ref)} is ignored`); continue; }
    if (c.ref == null || c.ref === '') { F.error('REEL[].ref', where, `kind ${q(c.k)} needs a ref (${REEL_TARGET_NAME[c.k]}); the card would render blank`); continue; }
    if (!tf(D).has(c.ref)) F.error('REEL[].ref', where, `${q(c.ref)} is not ${REEL_TARGET_NAME[c.k]}; the card would render blank`);
  }
  // SYMPTOMS[].link by kind
  const LINK_TARGET = { go: () => new Set(ENGINE.VIEWS), under: D => ids(D.ATLAS), story: storyIds, hub: D => ids(D.HUBS), segment: D => ids(D.SEGMENTS) };
  for (const s of D.SYMPTOMS || []) {
    if (s.link == null) continue;
    const where = at('SYMPTOMS', `SYMPTOMS[${s.id}].link`);
    if (!Array.isArray(s.link) || s.link.length !== 2) { F.error('SYMPTOMS[].link', where, 'link must be [kind, id]'); continue; }
    const [k, v] = s.link; const tf = LINK_TARGET[k];
    if (!tf) { F.error('SYMPTOMS[].link', where, `unknown link kind ${q(k)} (go, under, story, hub, segment)`); continue; }
    if (!tf(D).has(v)) F.error('SYMPTOMS[].link', where, `${q(v)} is not a valid ${k} target`);
  }
  // SYMPTOMS[].link 'go' targets that the engine labels
  // engine literals → data
  const L = engineLiterals();
  const chk = (list, set, rule, tname) => { for (const v of list) if (!set.has(v)) F.error(rule, 'engine source', `${q(v)} is hard-coded in an engine but is not a ${tname}`); };
  chk(L.under, ids(D.ATLAS), 'engine → ATLAS.id', 'ATLAS id');
  chk(L.symptom, ids(D.SYMPTOMS), 'engine → SYMPTOMS.id', 'SYMPTOMS id');
  chk(L.story, storyIds(D), 'engine → story id', 'story id');
  chk(L.hub, ids(D.HUBS), 'engine → HUBS.id', 'HUBS id');
  chk(L.segment.concat(L.segs), ids(D.SEGMENTS), 'engine → SEGMENTS.id', 'SEGMENTS id');
  chk(L.ev, keys(D.EVIDENCE), 'engine → EVIDENCE key', 'EVIDENCE key');
  chk(L.vital, ids(D.VITALS), 'engine → VITALS.id', 'VITALS id');
  chk(L.go, new Set(ENGINE.VIEWS), 'engine data-go → VIEWS', 'view');
  chk(L.venue, keys(D.VENUES), 'engine → VENUES key', 'VENUES key');
  chk(L.dest, keys(D.DESTS), 'engine → DESTS key', 'DESTS key');
  chk(L.house, ids(D.HOUSES), 'engine → HOUSES.id', 'HOUSES id');
  chk(L.regimes, ids(D.REGIMES, 'j'), 'engine (clinic) → REGIMES.j', 'REGIMES jurisdiction');
  chk(L.stations, ids(D.STATIONS), 'engine → STATIONS.id', 'STATIONS id');
  if (ENGINE.LENS_DEFAULT) { if (!(D.LENS_ROLES || {})[ENGINE.LENS_DEFAULT[0]]) F.error('engine → LENS_ROLES', 'pulse.js', `default lens role ${q(ENGINE.LENS_DEFAULT[0])} is not a LENS_ROLES key`); if (!(D.LENS_REGIONS || {})[ENGINE.LENS_DEFAULT[1]]) F.error('engine → LENS_REGIONS', 'pulse.js', `default lens region ${q(ENGINE.LENS_DEFAULT[1])} is not a LENS_REGIONS key`); }
  if (ENGINE.FLOW_DEFAULT) { if (!(D.VENUES || {})[ENGINE.FLOW_DEFAULT.venue]) F.error('engine → VENUES key', 'under.js', `FLOW default venue ${q(ENGINE.FLOW_DEFAULT.venue)} missing`); if (!(D.DESTS || {})[ENGINE.FLOW_DEFAULT.dest]) F.error('engine → DESTS key', 'under.js', `FLOW default destination ${q(ENGINE.FLOW_DEFAULT.dest)} missing`); }
  return L;
}

function checkImages(D, L) {
  const IMG = D.IMG || {};
  const files = fs.existsSync(IMG_DIR) ? new Set(fs.readdirSync(IMG_DIR).filter(f => f.endsWith('.jpg')).map(f => f.slice(0, -4))) : null;
  const thumbs = fs.existsSync(THUMB_DIR) ? new Set(fs.readdirSync(THUMB_DIR).filter(f => f.endsWith('.jpg')).map(f => f.slice(0, -4))) : null;
  if (!files) F.warn('images', 'build/img', 'folder missing; file checks skipped (run build / fetch_images first)');
  if (!thumbs) F.warn('images', 'build/img/t', 'folder missing; thumbnail checks skipped');
  const used = new Map(); // id -> [where...]
  for (const site of IMAGE_SITES) {
    const coll = site.name.split(/\[|\s/)[0];
    for (const it of site.items(D)) {
      const where = at(coll, it.where);
      if (it.v == null) { if (it.required) F.error('images', where, 'image id missing (the engine reads it unguarded)'); continue; }
      if (it.v === '') { F.warn('images', where, 'empty image id: a dead entry; remove it or point it at an image'); continue; }
      if (!isStr(it.v)) { F.error('images', where, 'image id must be a string'); continue; }
      (used.get(it.v) || used.set(it.v, []).get(it.v)).push(where);
      if (!IMG[it.v]) F.error('images', where, `image ${q(it.v)} is not in IMG (data/images_meta.json)`);
      if (files && !files.has(it.v)) F.error('images', where, `build/img/${it.v}.jpg does not exist`);
      if (thumbs && !thumbs.has(it.v)) F.error('images', where, `build/img/t/${it.v}.jpg does not exist`);
      // caption honesty: an image flagged x (the lot itself) should say so; a non-x caption should say Related/Illustration
      if (isStr(it.caption) && it.caption) {
        const cap = it.caption;
        if (/^(LOTIMG|UPIMG)/.test(site.name)) {
          if (it.exact && !/itself|the picture itself|the lot itself/i.test(cap)) F.warn('captions', where, `marked x (the lot itself) but the caption does not say so: ${q(cap.slice(0, 60))}`);
          if (!it.exact && !/^(Related|Illustration)/.test(cap)) F.warn('captions', where, `not marked x, so the caption should begin “Related:” or “Illustration:” — ${q(cap.slice(0, 60))}`);
        }
      }
    }
  }
  // engine-side literals
  for (const id of [...L.lb, ...L.img]) { (used.get(id) || used.set(id, []).get(id)).push('engine'); if (!IMG[id]) F.error('images', 'engine source', `image ${q(id)} is hard-coded in an engine but is not in IMG`); else { if (files && !files.has(id)) F.error('images', 'engine source', `build/img/${id}.jpg does not exist`); } }
  // registry vs files
  for (const id of Object.keys(IMG)) {
    const m = IMG[id];
    for (const k of ['a', 't', 'y', 'c', 'fp', 'avg']) if (!isStr(m[k])) F.error('images', `data/images_meta.json ${id}`, `registry entry lacks ${k} (the credit line and the crop read it)`);
    if (files && !files.has(id)) F.add(used.has(id) ? 'ERROR' : 'WARN', 'images', `data/images_meta.json ${id}`, `in IMG but build/img/${id}.jpg is missing${used.has(id) ? '' : ' (unreferenced, so nothing breaks yet)'}`);
    if (thumbs && !thumbs.has(id)) F.add(used.has(id) ? 'ERROR' : 'WARN', 'images', `data/images_meta.json ${id}`, `in IMG but build/img/t/${id}.jpg is missing`);
  }
  if (files) for (const id of files) if (!IMG[id]) F.info('orphans', `build/img/${id}.jpg`, 'file has no IMG entry; nothing can reference it');
  // orphan images
  const engineText = ENGINE_FILES.map(f => engines[f] || '').join('\n');
  for (const id of Object.keys(IMG)) if (!used.has(id) && !engineText.includes(`'${id}'`) && !engineText.includes(`"${id}"`)) F.info('orphans', `IMG ${id}`, `${IMG[id].a}, ${IMG[id].t}: never referenced by data or engine (only reachable through an artist page gallery, imgsFor)`);
  return used;
}

function checkSchema(D) {
  for (const [coll, fields] of Object.entries(SCHEMA)) {
    const arr = D[coll]; if (!Array.isArray(arr)) { if (D[coll] === undefined) F.error('schema', at(coll, coll), 'collection missing'); continue; }
    arr.forEach((x, i) => {
      if (!x || typeof x !== 'object') { F.error('schema', at(coll, `${coll}[${i}]`), 'item is not an object'); return; }
      for (const [f, t] of Object.entries(fields)) if (!typeOk(x[f], t)) F.error('schema', at(coll, `${coll}[${label(coll, x, i)}].${f}`), x[f] === undefined ? `required field missing (${t === 'a+' ? 'non-empty array' : t === 'a' ? 'array' : t === 'o' ? 'object' : t === 'n' ? 'number' : 'string'})` : `wrong type: expected ${t}, got ${Array.isArray(x[f]) ? 'array' : typeof x[f]}${t === 'a+' ? ' (or empty array)' : ''}`);
    });
  }
  // deeper shapes the engines rely on
  for (const h of D.HOUSES || []) {
    const w = f => at('HOUSES', `HOUSES[${h.id}].${f}`);
    if (h.sales && !isStr(h.sales.label)) F.error('schema', w('sales.label'), 'missing');
    if (h.sales && h.sales.y25 == null && h.sales.y24 == null) F.warn('schema', w('sales'), 'neither y25 nor y24: the directory shows “n/d”');
    if (h.sales && h.sales.cur != null && !['$', '€', '£'].includes(h.sales.cur)) F.warn('schema', w('sales.cur'), `unexpected currency ${q(h.sales.cur)}; salesVal converts only €`);
    (h.series || []).forEach((p, i) => { if (!Array.isArray(p) || typeof p[0] !== 'number' || typeof p[1] !== 'number') F.error('schema', w(`series[${i}]`), 'must be [year, value]'); });
    (h.leadership || []).forEach((p, i) => { if (!Array.isArray(p) || !isStr(p[0]) || !isStr(p[1])) F.error('schema', w(`leadership[${i}]`), 'must be [name, title]'); });
    (h.contacts || []).forEach((p, i) => { if (!Array.isArray(p) || p.length !== 2) F.error('schema', w(`contacts[${i}]`), 'must be [label, value]'); });
    (h.links || []).forEach((p, i) => { if (!Array.isArray(p) || p.length !== 2) F.error('schema', w(`links[${i}]`), 'must be [label, url]'); });
  }
  for (const c of [...(D.RESULTS || []), ...(D.RESULTS_MORE || [])]) if (typeof c.price === 'number' && c.price <= 0) F.error('schema', at('RESULTS', `lot ${q(c.title)}.price`), 'price must be positive (USD millions)');
  for (const [t, ch] of Object.entries(D.CHAINS || {})) { if (!Array.isArray(ch)) { F.error('schema', at('CHAINS', `CHAINS[${q(t)}]`), 'must be an array of [when, who, price]'); continue; } ch.forEach((s, i) => { if (!Array.isArray(s) || s.length < 2 || s.length > 3 || !s.every(isStr)) F.error('schema', at('CHAINS', `CHAINS[${q(t)}][${i}]`), 'each step is [when, who, price?] of strings'); }); }
  for (const u of D.UPCOMING || []) if (u.chain) u.chain.forEach((s, i) => { if (!Array.isArray(s) || s.length < 2 || !s.every(isStr)) F.error('schema', at('UPCOMING', `UPCOMING ${q(u.title)}.chain[${i}]`), 'each step is [when, who, price?] of strings'); });
  for (const p of D.PROV_CASES || []) (p.chain || []).forEach((s, i) => { if (!Array.isArray(s) || s.length < 2 || !s.every(isStr)) F.error('schema', at('PROV_CASES', `PROV_CASES ${q(p.t)}.chain[${i}]`), 'each step is [when, who, price?] of strings'); });
  for (const j of D.JOURNEYS || []) (j.steps || []).forEach((s, i) => { for (const f of ['y', 'place', 'who', 'p']) if (!isStr(s[f])) F.error('schema', at('JOURNEYS', `JOURNEYS[${j.id}].steps[${i}].${f}`), 'missing string'); if (s.usd != null && (typeof s.usd !== 'number' || s.usd <= 0)) F.error('schema', at('JOURNEYS', `JOURNEYS[${j.id}].steps[${i}].usd`), 'usd must be a positive number or null (log scale)'); });
  for (const s of D.SYMPTOMS || []) (s.ev || []).forEach((e, i) => { if (!Array.isArray(e) || e.length !== 2) F.error('schema', at('SYMPTOMS', `SYMPTOMS[${s.id}].ev[${i}]`), 'must be [label, value]'); });
  for (const h of D.HUBS || []) {
    const w = f => at('HUBS', `HUBS[${h.id}].${f}`);
    for (const k of ['imp', 'sales', 'arr', 'aml', 'exp']) if (!h.regime || !isStr(h.regime[k])) F.error('schema', w(`regime.${k}`), 'missing (the hub drawer prints every rule)');
    if (h.presence) for (const k of Object.keys(h.presence)) if (!['s', 'c', 'p', 'b'].includes(k)) F.warn('schema', w(`presence.${k}`), 'unknown house key; the engine knows s, c, p, b');
    if (typeof h.x === 'number' && typeof h.y === 'number' && D.WORLD_W && D.WORLD_H && (h.x < 0 || h.x > D.WORLD_W || h.y < 0 || h.y > D.WORLD_H)) F.error('schema', w('x/y'), `off the map (${h.x}, ${h.y}); the canvas is ${D.WORLD_W}×${D.WORLD_H}`);
    if (typeof h.tier === 'number' && (h.tier < 1 || h.tier > 4)) F.warn('schema', w('tier'), `tier ${h.tier}; the map sizes tiers 1–4`);
  }
  for (const a of D.ATLAS || []) { if (a.kind === 'case' && typeof a.year !== 'number') F.error('schema', at('ATLAS', `ATLAS[${a.id}].year`), 'a case needs a numeric year (casebook sorts by it)'); if (a.kind !== 'case' && a.kind !== 'rule') F.error('schema', at('ATLAS', `ATLAS[${a.id}].kind`), `unknown kind ${q(a.kind)} (rule | case)`); }
  for (const r of D.REPORTS || []) if (typeof r.m === 'number' && (r.m < 1 || r.m > 12)) F.error('schema', at('REPORTS', `REPORTS ${q(r.n)}.m`), 'month must be 1–12');
  const M = D.MARKET || {};
  for (const k of ['y25', 'growth', 'peak', 'auction', 'auctionGrowth', 'dealers', 'dealersGrowth']) if (!M.global || M.global[k] == null) F.error('schema', at('MARKET', `MARKET.global.${k}`), 'missing; the Floor KPIs read it');
  for (const k of ['countries', 'christiesRegions', 'h1_2026', 'bigThreeYears', 'bigThree']) if (!Array.isArray(M[k])) F.error('schema', at('MARKET', `MARKET.${k}`), 'missing array; the Floor charts read it');
  if (Array.isArray(M.bigThree) && Array.isArray(M.bigThreeYears)) M.bigThree.forEach((s, i) => { if (!Array.isArray(s) || !isStr(s[0]) || !Array.isArray(s[1]) || s[1].length !== M.bigThreeYears.length) F.error('schema', at('MARKET', `MARKET.bigThree[${i}]`), `must be [name, values] with ${M.bigThreeYears.length} values`); });
  (M.countries || []).forEach((r, i) => { if (!Array.isArray(r) || r.length < 3 || typeof r[1] !== 'number') F.error('schema', at('MARKET', `MARKET.countries[${i}]`), 'must be [name, USD bn, %]'); });
  const S = D.SERIES || {};
  for (const k of ['global', 'online', 'shares', 'bands2025', 'cats2025', 'museums']) if (!Array.isArray(S[k]) || !S[k].length) F.error('schema', at('SERIES', `SERIES.${k}`), 'missing; the Pulse charts read it');
  for (const k of ['global', 'online', 'auction', 'dealer', 'us', 'nft']) (S[k] || []).forEach((p, i) => { if (!Array.isArray(p) || typeof p[0] !== 'number' || typeof p[1] !== 'number') F.error('schema', at('SERIES', `SERIES.${k}[${i}]`), 'must be [year, value, flag?]'); });
  (S.shares || []).forEach((r, i) => { const sh = r[1] || {}; for (const k of ['us', 'uk', 'cn', 'fr']) if (typeof sh[k] !== 'number') F.error('schema', at('SERIES', `SERIES.shares[${i}].${k}`), 'missing share'); const sum = (sh.us || 0) + (sh.uk || 0) + (sh.cn || 0) + (sh.fr || 0); if (sum > 100) F.error('schema', at('SERIES', `SERIES.shares[${i}]`), `shares sum to ${sum}% > 100 (rest of world would be negative)`); });
  for (const [k, v] of Object.entries(D.EVIDENCE || {})) for (const f of ['l', 'v', 'n', 's']) if (v[f] == null) F.error('schema', at('EVIDENCE', `EVIDENCE[${k}].${f}`), 'missing');
  for (const k of ENGINE.EV_TILES || []) { const e = (D.EVIDENCE || {})[k]; if (!e) continue; /* reported by the engine → EVIDENCE rule */ for (const f of ['d', 'chg', 'by']) if (!isStr(e[f])) F.error('schema', at('EVIDENCE', `EVIDENCE[${k}].${f}`), 'missing string; the Floor tile prints d, chg and by'); if (!/^\$?[\d.,]+/.test(String(e.v))) F.error('schema', at('EVIDENCE', `EVIDENCE[${k}].v`), `${q(e.v)} does not start with a figure; the Floor tile splits v into number and unit`); }
  if (!isStr(M.verified)) F.error('schema', at('MARKET', 'MARKET.verified'), 'missing string; the Floor chip and every V-flag tooltip read it');
  // the Floor's front page
  const H = D.HERO;
  if (!H || typeof H !== 'object') F.error('schema', at('HERO', 'HERO'), 'missing object; renderFloor builds the hero from it');
  else { for (const f of ['img', 'alt', 'fp', 'cap', 'k', 'h', 'p']) if (!isStr(H[f])) F.error('schema', at('HERO', `HERO.${f}`), 'missing string'); if (!Array.isArray(H.acts) || !H.acts.length) F.error('schema', at('HERO', 'HERO.acts'), 'must be a non-empty array of {reel|up|story, t}'); else H.acts.forEach((a, i) => { const w = at('HERO', `HERO.acts[${i}]`); const kinds = ['reel', 'up', 'story'].filter(k => a[k] != null); if (kinds.length !== 1) F.error('schema', w, 'exactly one of reel (card index), up (UPCOMING index) or story (id)'); if (!isStr(a.t)) F.error('schema', w, 'missing button text t'); if (a.reel != null && !(Number.isInteger(a.reel) && a.reel >= 0 && a.reel < (D.REEL || []).length)) F.error('schema', w, `reel ${q(a.reel)} is not a REEL index (0–${(D.REEL || []).length - 1})`); if (a.up != null && !(Number.isInteger(a.up) && a.up >= 0 && a.up < (D.UPCOMING || []).length)) F.error('schema', w, `up ${q(a.up)} is not an UPCOMING index (0–${(D.UPCOMING || []).length - 1})`); }); }
  const FL = D.FLOOR;
  if (!FL || !Array.isArray(FL.vitals) || !FL.vitals.length || !Array.isArray(FL.under) || !FL.under.length) F.error('schema', at('FLOOR', 'FLOOR'), 'needs non-empty arrays vitals (VITALS ids) and under (ATLAS ids); the Floor strips read them');
  // the resale-right table
  for (const [k, v] of Object.entries(D.ARTIST_DIED || {})) if (!(v === null || v === false || (Number.isInteger(v) && v > 1000 && v <= +ENGINE.TODAY.slice(0, 4)))) F.error('schema', at('ARTIST_DIED', `ARTIST_DIED[${q(k)}]`), `${q(v)} must be a year of death, null (living) or false (not an artist’s work)`);
  (D.VITALS || []).forEach(v => { if (v.unit != null && !isStr(v.unit)) F.error('schema', at('VITALS', `VITALS[${v.id}].unit`), 'must be a string (the drawer chart prints it after each value)'); });
  // source lists rendered by srcList(): each entry is a URL string or a [label, url] pair; SIGNALS and JOURNEYS print pairs only
  const pairOk = x => Array.isArray(x) && x.length === 2 && isStr(x[0]) && isStr(x[1]);
  const srcShape = (coll, where, list, pairsOnly) => (list || []).forEach((x, i) => { if (pairsOnly ? !pairOk(x) : !(isStr(x) || pairOk(x))) F.error('schema', at(coll, `${where}[${i}]`), pairsOnly ? 'must be [label, url]' : 'must be a URL string or [label, url]'); });
  (D.SIGNALS || []).forEach(s => srcShape('SIGNALS', `signal ${q(s.t)}.s`, s.s, true));
  (D.JOURNEYS || []).forEach(j => srcShape('JOURNEYS', `JOURNEYS[${j.id}].src`, j.src, true));
  for (const [k, e] of Object.entries(D.EVIDENCE || {})) srcShape('EVIDENCE', `EVIDENCE[${k}].s`, e.s, false);
  (D.ATLAS || []).forEach(a => srcShape('ATLAS', `ATLAS[${a.id}].src`, a.src, false));
  // the resale right's nationality test: two-letter codes
  for (const [k, v] of Object.entries(D.ARTIST_NATION || {})) if (!/^[A-Z]{2}$/.test(String(v))) F.error('schema', at('ARTIST_NATION', `ARTIST_NATION[${q(k)}]`), `${q(v)} must be a two-letter country code`);
  (D.ARR_NATIONS || []).forEach((c, i) => { if (!/^[A-Z]{2}$/.test(String(c))) F.error('schema', at('ARR_NATIONS', `ARR_NATIONS[${i}]`), `${q(c)} must be a two-letter country code`); });
  // the limits register (data_circle.js): unique ids, a known area, words, a place it qualifies that exists, a source as [label, url]
  { const LA = new Set(Object.keys(D.LIMIT_AREAS || {})), seenL = new Set(), atlasIds = new Set((D.ATLAS || []).map(a => a.id));
    (D.LIMITS || []).forEach((l, i) => { const w = `LIMITS[${(l && l.id) || i}]`; if (!l || !isStr(l.id) || seenL.has(l.id)) F.error('schema', at('LIMITS', w), 'needs a unique id'); else seenL.add(l.id);
      if (!LA.has(l.area)) F.error('schema', at('LIMITS', w + '.area'), `${q(l.area)} is not a LIMIT_AREAS key`);
      for (const f of ['t', 'b']) if (!isStr(l[f])) F.error('schema', at('LIMITS', `${w}.${f}`), 'missing string');
      if (l.at != null) { const [k, v] = Array.isArray(l.at) ? l.at : []; const ok = k === 'go' ? ENGINE.VIEWS.includes(v) : k === 'lab' ? ENGINE.LAB_INSTR.includes(v) : k === 'under' ? atlasIds.has(v) : false; if (!ok) F.error('schema', at('LIMITS', w + '.at'), `${q(String(l.at))} names no view, Lab instrument or atlas entry`); }
      if (l.src != null && !pairOk(l.src)) F.error('schema', at('LIMITS', w + '.src'), 'must be [label, url]'); }); }
  (D.HUBS || []).forEach(h => srcShape('HUBS', `HUBS[${h.id}].src`, h.src, false));
  (D.SEGMENTS || []).forEach(s => srcShape('SEGMENTS', `SEGMENTS[${s.id}].src`, s.src, false));
  (D.INSTITUTIONS || []).forEach(s => srcShape('INSTITUTIONS', `INSTITUTIONS[${s.id}].src`, s.src, false));
  (D.REGIMES || []).forEach(r => { if (r.src != null) srcShape('REGIMES', `REGIMES[${r.j}].src`, r.src, true); if (r.vf === 'V' && !(Array.isArray(r.src) && r.src.length)) F.warn('flags', at('REGIMES', `REGIMES[${r.j}]`), 'flagged V without a src list; the regimes table can only footnote rows that carry one'); });
  [...(D.STORIES || []), ...(D.STORIES_MORE || [])].forEach(s => srcShape('STORIES', `story ${s.id}.src`, s.src, false));
  (D.COLLECTORS || []).forEach(c => srcShape('COLLECTORS', `COLLECTORS[${c.id}].src`, c.src, false));
  (D.PLAYERS || []).forEach(p => srcShape('PLAYERS', `PLAYERS[${p.id}].src`, p.src, false));
  (D.HOUSES || []).forEach(h => srcShape('HOUSES', `HOUSES[${h.id}].sources`, h.sources, false));
  // the globe: hub coordinates and momentum (globe.js), the dot mask (data_globe.js, generated by tools/globe_dots.py)
  (D.HUBS || []).forEach(h => { const w = `HUBS[${h.id}]`;
    if (typeof h.lon !== 'number' || h.lon < -180 || h.lon > 180 || typeof h.lat !== 'number' || h.lat < -90 || h.lat > 90) F.error('schema', at('HUBS', `${w}.lon/lat`), 'needs numeric lon −180…180 and lat −90…90; the globe places the beacon there');
    if (!Number.isInteger(h.momentum) || h.momentum < -2 || h.momentum > 2) F.error('schema', at('HUBS', `${w}.momentum`), 'must be an integer −2…+2 (the globe’s Momentum mode)');
    if (!isStr(h.why)) F.error('schema', at('HUBS', `${w}.why`), 'missing one-line reason for the momentum'); });
  if (D.GLOBE_DOTS !== undefined) { const n = (D.GLOBE_COUNTRIES || []).length; if (!Array.isArray(D.GLOBE_DOTS) || D.GLOBE_DOTS.length < 1000) F.error('schema', at('GLOBE_DOTS', 'GLOBE_DOTS'), 'fewer than 1,000 dots: regenerate with python3 tools/globe_dots.py');
    else { let bad = 0; for (const d of D.GLOBE_DOTS) if (!Array.isArray(d) || d.length !== 3 || Math.abs(d[0]) > 180 || Math.abs(d[1]) > 90 || !Number.isInteger(d[2]) || d[2] < 0 || d[2] >= n) bad++; if (bad) F.error('schema', at('GLOBE_DOTS', 'GLOBE_DOTS'), `${bad} dots are not [lon, lat, country index]`); }
    const share = Object.keys(D.COUNTRY_SHARE || {}).filter(k => !(D.GLOBE_COUNTRIES || []).includes(k)); if (share.length) F.warn('schema', at('COUNTRY_SHARE', 'COUNTRY_SHARE'), `${share.length} names have no dots on the globe: ${share.slice(0, 5).map(q).join(', ')}`); }
  // the flows layer (data_flows.js): sources, flags, the FX series, the FX constant against the ECB rates, the journeys' places
  { const FS = D.FLOW_SRC || {}, flag = x => ['V', 'S', 'U'].includes(x);
    for (const [k, v] of Object.entries(FS)) if (!pairOk(v)) F.error('schema', at('FLOW_SRC', `FLOW_SRC[${k}]`), 'must be [label, url]');
    const cite = (coll, where, x) => { if (!FS[x.src]) F.error('refs', at(coll, where), `src ${q(x.src)} is not a FLOW_SRC key`); if (!flag(x.vf)) F.error('flags', at(coll, where), `vf ${q(x.vf)} must be V, S or U`); };
    ((D.TRADE || {}).rows || []).forEach(r => cite('TRADE', `TRADE.rows[${r.iso}]`, r));
    (D.CORRIDORS || []).forEach((c, i) => { cite('CORRIDORS', `CORRIDORS[${i}]`, c); for (const e of ['from', 'to']) if (!(D.COUNTRY_LL || {})[c[e]]) F.error('refs', at('CORRIDORS', `CORRIDORS[${i}].${e}`), `${q(c[e])} has no COUNTRY_LL point; the globe cannot draw the arc`); if (!(c.v > 0)) F.error('schema', at('CORRIDORS', `CORRIDORS[${i}].v`), 'must be a positive US$ m value'); });
    const A = D.ATTENTION || {}; (A.series || []).forEach(s => { cite('ATTENTION', `ATTENTION[${s.page}]`, s); if (!Array.isArray(s.v) || s.v.length !== (A.months || []).length) F.error('schema', at('ATTENTION', `ATTENTION[${s.page}].v`), 'needs one value per month'); });
    const R = D.RATES; if (R && Object.keys(R.rates || {}).length) { cite('RATES', 'RATES', R); for (const [cur, k] of [['GBP', 'gbp'], ['EUR', 'eur'], ['CHF', 'chf'], ['HKD', 'hkd']]) { const r = R.rates[cur], fx = (D.FX || {})[k]; if (typeof r !== 'number' || typeof fx !== 'number') continue; const gap = fx * r - 1; if (Math.abs(gap) > .015) F.error('schema', at('FX', `FX.${k}`), `${fx} US$ per ${cur} is ${(gap * 100).toFixed(1)}% off the ECB rate of ${R.asof} (${(1 / r).toFixed(4)}); Follow the money converts at FX — update it`); } }
    const X = D.FXSERIES; if (X) { cite('FXSERIES', 'FXSERIES', X); const n = (X.months || []).length; if ((X.dates || []).length !== n) F.error('schema', at('FXSERIES', 'FXSERIES.dates'), 'needs one date per month'); for (const [cur, v] of Object.entries(X.per || {})) if (!Array.isArray(v) || v.length !== n || v.some(x => typeof x !== 'number' || !(x > 0))) F.error('schema', at('FXSERIES', `FXSERIES.per.${cur}`), `needs ${n} positive rates, one per month`);
      (X.months || []).forEach((m, i) => { if (!/^\d{4}-\d{2}$/.test(m)) F.error('dates', at('FXSERIES', `FXSERIES.months[${i}]`), `${q(m)} is not YYYY-MM`); else if (i && m <= X.months[i - 1]) F.error('dates', at('FXSERIES', `FXSERIES.months[${i}]`), 'months must ascend'); });
      if (R && R.asof && X.dates && X.dates[n - 1] !== R.asof) F.warn('dates', at('FXSERIES', 'FXSERIES.dates'), `the series ends ${X.dates[n - 1]} but RATES is of ${R.asof}; extend the series in the same refresh`); }
    const PL = D.PLACE_LL || {}; for (const [k, v] of Object.entries(PL)) if (!Array.isArray(v) || v.length !== 2 || Math.abs(v[0]) > 180 || Math.abs(v[1]) > 90) F.error('schema', at('PLACE_LL', `PLACE_LL[${q(k)}]`), 'must be [lon, lat]');
    const NOPLACE = /^(|private|unknown)$/i;
    (D.JOURNEYS || []).forEach(j => (j.steps || []).forEach((s, i) => { const raw = String(s.place == null ? '' : s.place).trim(); if (NOPLACE.test(raw)) return; const last = raw.split('→').pop().trim(), first = last.split('/')[0].trim(); if (!PL[last] && !PL[first]) F.error('refs', at('JOURNEYS', `JOURNEYS[${j.id}].steps[${i}].place`), `${q(raw)} is not in PLACE_LL; the globe’s Journeys mode skips the stop (add it, or write 'private' / 'unknown')`); })); }
  // the Lab's benchmarks (data_bench.js, generated by tools/benchmarks.py): annual arrays aligned on contiguous years, positive values, [label, url] sources, how far each input runs
  if (D.BENCH !== undefined) { const B = D.BENCH || {}, Y = B.years, w = f => at('BENCH', `BENCH.${f}`), regen = 'regenerate with python3 tools/benchmarks.py';
    if (!Array.isArray(Y) || Y.length < 2) F.error('schema', w('years'), `needs an array of years; ${regen}`);
    else { const brk = Y.findIndex((y, i) => !Number.isInteger(y) || (i > 0 && y !== Y[i - 1] + 1)); if (brk >= 0) F.error('schema', w(`years[${brk}]`), `${q(Y[brk])} breaks the run of years (contiguous and ascending, one per year); ${regen}`);
      for (const k of ['sp', 'spx', 'gold', 'cpi']) { const a = B[k]; if (!Array.isArray(a) || a.length !== Y.length) { F.error('schema', w(k), `needs ${Y.length} values, one per year (got ${Array.isArray(a) ? a.length : typeof a})`); continue; } const bad = a.findIndex(v => typeof v !== 'number' || !isFinite(v) || !(v > 0)); if (bad >= 0) F.error('schema', w(`${k}[${bad}]`), `${q(a[bad])} for ${Y[bad]} is not a positive number; the Lab divides by it`); }
      const lastY = Y[Y.length - 1], need = +ENGINE.TODAY.slice(0, 4) - 1; if (lastY < need) F.error('dates', w('years'), `the series end in ${lastY}; the Lab needs ${need} or later (TODAY is ${ENGINE.TODAY}): ${regen}`); }
    for (const k of ['sp', 'gold', 'cpi']) { const s = (B.src || {})[k]; if (!pairOk(s) || !/^https?:\/\/[^\s]+\.[^\s]+/.test(s[1])) F.error('schema', w(`src.${k}`), 'must be [label, http(s) url]; the Lab cites it under every comparison'); }
    const M2 = B.meta || {}, T = M2.through; if (!T || typeof T !== 'object') F.error('schema', w('meta.through'), 'missing; the Lab states how far each input runs');
    else { for (const k of ['sp', 'gold', 'cpi', 'div']) if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(T[k] || '')) F.error('schema', w(`meta.through.${k}`), `${q(T[k])} is not YYYY-MM`); if (Array.isArray(Y) && /^\d{4}-/.test(T.sp || '') && +T.sp.slice(0, 4) !== Y[Y.length - 1]) F.warn('dates', w('meta.through.sp'), `ends in ${T.sp} but the last year is ${Y[Y.length - 1]}`); }
    if (!isStr(M2.note) || !M2.note.trim()) F.error('schema', w('meta.note'), 'missing; the Lab prints how the series were made');
    if (!['V', 'S', 'U'].includes(M2.vf)) F.error('flags', w('meta.vf'), `${q(M2.vf)} must be V, S or U; the Lab flags the benchmarks with it`); }
  // the Circle (data_circle.js): the offer is data; an empty tier list would render an empty page
  if (D.CIRCLE !== undefined) { const C = D.CIRCLE || {}; if (!Array.isArray(C.tiers) || !C.tiers.length) F.error('schema', at('CIRCLE', 'CIRCLE.tiers'), 'missing tiers; the Circle renders the offer from them');
    else C.tiers.forEach((tr, i) => { if (!isStr(tr.n)) F.error('schema', at('CIRCLE', `CIRCLE.tiers[${i}].n`), 'missing name'); const items = tr.items || tr.inc || tr.includes; if (!Array.isArray(items) || !items.length) F.error('schema', at('CIRCLE', `CIRCLE.tiers[${i}]`), 'lists nothing it includes'); });
    /* every value-point link names a kind ciLink renders and a target that exists (a missing one would silently render nothing) */
    const LABI = ((engines['lab.js'] || '').match(/const LAB_INSTR=\[(.*?)\];/) || [, ''])[1].match(/\['([a-z]+)',/g) || [];
    const labIds = new Set(LABI.map(x => x.slice(2, -2))), views = new Set(ENGINE.VIEWS || []);
    (C.why || []).forEach((w, i) => (w.links || []).forEach((l, j) => { const [k, v] = l || [], where = at('CIRCLE', `CIRCLE.why[${i}].links[${j}]`);
      const ok = k === 'go' ? (!views.size || views.has(v)) : k === 'under' ? (D.ATLAS || []).some(a => a.id === v) : k === 'symptom' ? (D.SYMPTOMS || []).some(s => s.id === v) : k === 'hub' ? (D.HUBS || []).some(h => h.id === v) : k === 'lab' ? (!labIds.size || labIds.has(v)) : null;
      if (ok === null) F.error('links', where, `unknown link kind “${k}” (go, under, symptom, hub, lab)`); else if (!ok) F.error('links', where, `${k} target “${v}” does not exist`); })); }
  // the flow model
  for (const r of D.REGIMES || []) { if (r.expAge != null && !(Number.isInteger(r.expAge) && r.expAge > 0 && r.expAge <= 200)) F.error('schema', at('REGIMES', `REGIMES[${r.j}].expAge`), 'must be a whole number of years, 1–200'); if (r.expBefore != null && !(Number.isInteger(r.expBefore) && r.expBefore >= 1000 && r.expBefore <= 2100)) F.error('schema', at('REGIMES', `REGIMES[${r.j}].expBefore`), 'must be a year'); if (r.expAge != null && r.expBefore != null) F.error('schema', at('REGIMES', `REGIMES[${r.j}]`), 'set expAge or expBefore, not both'); if (!r.strictExport && (r.expAge != null || r.expBefore != null)) F.warn('schema', at('REGIMES', `REGIMES[${r.j}]`), 'an export threshold on a regime that is not strictExport is never read'); }
  for (const [k, v] of Object.entries(D.VENUES || {})) { if (v.arr && typeof v.arrCap !== 'number') F.error('schema', at('VENUES', `VENUES[${k}].arrCap`), 'a venue with a resale right needs a numeric cap (the ledger prints it)'); for (const f of ['vatPrem', 'impVat', 'salesTax']) if (v[f] != null && typeof v[f] !== 'number') F.error('schema', at('VENUES', `VENUES[${k}].${f}`), 'must be a number (rate)'); if (v.vatOn != null && !['premium', 'total'].includes(v.vatOn)) F.error('schema', at('VENUES', `VENUES[${k}].vatOn`), 'must be "premium" or "total" (the base of the room’s VAT)'); if (v.vatPrem && !isStr(v.exp)) F.error('schema', at('VENUES', `VENUES[${k}].exp`), 'a room that charges VAT needs exp, the phrase the ledger prints for what export does to it'); if (v.impVatOn != null && !['hammer', 'total'].includes(v.impVatOn)) F.error('schema', at('VENUES', `VENUES[${k}].impVatOn`), 'must be "hammer" or "total" (the base flowModel charges import VAT on)'); if (v.impVatOn === 'total' && !v.impVat) F.error('schema', at('VENUES', `VENUES[${k}].impVatOn`), 'set without an impVat rate'); }
  if (D.DESTS && D.DESTS.nyc && typeof D.DESTS.nyc.useTax !== 'number') F.error('schema', at('DESTS', 'DESTS[nyc].useTax'), 'flowModel multiplies by it for a New York home');
  for (const [k, v] of Object.entries(D.DESTS || {})) if (v.storage != null && typeof v.storage !== 'number') F.error('schema', at('DESTS', `DESTS[${k}].storage`), 'must be a number (USD a year)');
  for (const k of ENGINE.FX_KEYS || []) if (D.FX && typeof D.FX[k] !== 'number') F.error('schema', at('FX', `FX.${k}`), 'must be a number');
  // palette and cards read these without a guard
  (D.HUBS || []).forEach(h => { if (!isStr(h.share)) F.error('schema', at('HUBS', `HUBS[${h.id}].share`), 'must be a string (may be empty); the palette splits it'); });
  (D.PRIVATE_TREATY || []).concat(D.PRIVATE_MORE || []).forEach(p => { if (isStr(p.price) && !/\d/.test(p.price)) F.warn('schema', at('PRIVATE_TREATY', `treaty ${q(p.work)}.price`), 'no digit in the price; the list sorts by the number in it'); });
  for (const [k, tl] of Object.entries(D.TIMELINES || {})) { if (!Array.isArray(tl)) { F.error('schema', at('TIMELINES', `TIMELINES[${k}]`), 'must be an array of [year, event]'); continue; } tl.forEach((t, i) => { if (!Array.isArray(t) || t.length !== 2 || !isStr(t[0]) || !isStr(t[1])) F.error('schema', at('TIMELINES', `TIMELINES[${k}][${i}]`), 'must be [year, event] of strings'); }); }
  (D.DEALERS || []).forEach((d, i) => { if (Array.isArray(d) && typeof d[1] !== 'number') F.error('schema', at('DEALERS', `DEALERS[${i}] ${q(d[0])}`), 'count must be a number (toLocaleString)'); });
  (M.h1_2026 || []).forEach((r, i) => { if (!Array.isArray(r) || r.length !== 3 || !r.every(isStr)) F.error('schema', at('MARKET', `MARKET.h1_2026[${i}]`), 'must be [measure, value, source] of strings'); });
  (M.christiesRegions || []).forEach((r, i) => { if (!Array.isArray(r) || !isStr(r[0]) || typeof r[1] !== 'number') F.error('schema', at('MARKET', `MARKET.christiesRegions[${i}]`), 'must be [region, USD m]'); });
  for (const k of ['bands2025', 'cats2025']) (S[k] || []).forEach((r, i) => { if (!Array.isArray(r) || !isStr(r[0]) || typeof r[1] !== 'number' || !isStr(r[2])) F.error('schema', at('SERIES', `SERIES.${k}[${i}]`), 'must be [band, USD bn, note]'); });
  (S.museums || []).forEach((r, i) => { if (!Array.isArray(r) || !isStr(r[0]) || typeof r[1] !== 'number') F.error('schema', at('SERIES', `SERIES.museums[${i}]`), 'must be [museum, visitors m]'); });
  for (const [k, v] of Object.entries(D.PULSE_SRC || {})) if (!Array.isArray(v) || v.length !== 2 || !isStr(v[0]) || !isStr(v[1])) F.error('schema', at('PULSE_SRC', `PULSE_SRC[${k}]`), 'must be [label, url]');
  for (const [k, v] of Object.entries(D.VENUES || {})) { for (const f of ['n', 'cur', 'note', 'country', 'homeDest']) if (!isStr(v[f])) F.error('schema', at('VENUES', `VENUES[${k}].${f}`), 'missing string'); if (!Array.isArray(v.cities) || !v.cities.length || !v.cities.every(isStr)) F.error('schema', at('VENUES', `VENUES[${k}].cities`), 'must be a non-empty array of RESULTS.city values (flowForLot maps a lot’s city to its room through it)'); }
  for (const [k, v] of Object.entries(D.DESTS || {})) { for (const f of ['n', 'note', 'country', 's', 'act']) if (!isStr(v[f])) F.error('schema', at('DESTS', `DESTS[${k}].${f}`), f === 's' ? 'missing string (the short name a comparison column shows)' : f === 'act' ? 'missing string (the phrase a reading uses: “hanging it in London”)' : 'missing string'); if (v.impVat != null && typeof v.impVat !== 'number') F.error('schema', at('DESTS', `DESTS[${k}].impVat`), 'must be a number (rate on the price when the work enters the country)');
    for (const f of ['bonded', 'insured', 'defer']) if (v[f] != null && typeof v[f] !== 'boolean') F.error('schema', at('DESTS', `DESTS[${k}].${f}`), 'must be true or false (bonded: the room’s VAT suspended as on an export; insured: no insurance line; defer: shown but not ranked)'); }
  if (D.DESTS && !Object.values(D.DESTS).some(v => !v.defer)) F.error('schema', at('DESTS', 'DESTS'), 'every destination is marked defer: the comparisons would have nothing to rank');
  { const cs = new Set(Object.values(D.VENUES || {}).map(v => v.country).concat(Object.values(D.DESTS || {}).map(d => d.country))); for (const c of cs) if (isStr(c) && !/^[A-Z]{2,3}$/.test(c)) F.warn('schema', at('VENUES', `country ${q(c)}`), 'country codes on VENUES and DESTS are compared for equality (destination import VAT is waived in the sale room’s own country); use the same short code on both'); }
  const rowLen = (coll, len, desc) => (D[coll] || []).forEach((r, i) => { if (!Array.isArray(r) || r.length !== len) F.error('schema', at(coll, `${coll}[${i}]`), `must be ${desc}`); });
  rowLen('RECORDS', 4, '[category, work, price, where/when]'); rowLen('RECORDS2', 6, '[artist, record, work, where/when, 2025–26, vf]'); rowLen('GLOSSARY', 3, '[term, Russian, definition]'); rowLen('ANATOMY', 2, '[step, text]'); rowLen('FEEDS', 3, '[name, url, status]'); rowLen('APIS', 4, '[name, note, access, url]'); rowLen('CHECKS', 2, '[text, atlas id]'); (D.DEALERS || []).forEach((r, i) => { if (!Array.isArray(r) || (r.length !== 4 && r.length !== 5)) { F.error('schema', at('DEALERS', `DEALERS[${i}]`), 'must be [name, count, note, key] or [name, count, note, key, {alt, not}]'); return; } if (r.length !== 5) return;
    const x = r[4], ok = x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).every(k => k === 'alt' || k === 'not') && ['alt', 'not'].every(k => x[k] == null || (Array.isArray(x[k]) && x[k].length && x[k].every(isStr)));
    if (!ok) { F.error('schema', at('DEALERS', `DEALERS[${i}] ${q(r[0])}`), 'column 5 must be {alt?: [names], not?: [names]}, each a non-empty list of strings (dealerMatch reads it)'); return; }
    const names = [r[3]].concat(x.alt || []).map(n => String(n).toLowerCase());
    for (const n of x.not || []) if (!names.some(k => n.toLowerCase().includes(k))) F.warn('schema', at('DEALERS', `DEALERS[${i}] ${q(r[0])}`), `not-name ${q(n)} contains neither the key nor an alt: it strikes out nothing the matcher would find`); }); rowLen('INST_FACTS', 3, '[label, value, url]');
  (D.DEALERS || []).forEach((d, i) => { if (Array.isArray(d) && !(isStr(d[3]) && d[3].trim())) F.error('schema', at('DEALERS', `DEALERS[${i}] ${q(d[0])}`), 'key (column 4) must be a non-empty string; the Ledger searches provenance texts by it'); });
  for (const f of D.FEES || []) (f.t || []).forEach((t, i) => { if (!Array.isArray(t) || t.length !== 2) F.error('schema', at('FEES', `FEES ${q(f.h)}.t[${i}]`), 'must be [band, rate]'); });
  for (const r of D.ROUTES || []) (r.items || []).forEach((it, i) => { if (!Array.isArray(it) || it.length !== 2 || !isStr(it[1])) F.error('schema', at('ROUTES', `ROUTES ${r.org}.items[${i}]`), 'must be [label, url or contact]'); });
  for (const [k, v] of Object.entries(D.LENS_REGIONS || {})) for (const f of ['n', 'hubs', 'reg', 'segs', 'cities']) if (v[f] == null) F.error('schema', at('LENS_REGIONS', `LENS_REGIONS[${k}].${f}`), 'missing');
  // enum-ish values
  const enumWarn = (coll, f, allowed, items) => items.forEach((x, i) => { if (x[f] != null && !allowed.includes(x[f])) F.warn('enums', at(coll, `${coll}[${label(coll, x, i)}].${f}`), `${q(x[f])} is not one of ${allowed.join(' | ')}; the engine will style it as the default`); });
  enumWarn('SIGNALS', 'dir', ['heat', 'cool', 'steady'], D.SIGNALS || []); enumWarn('VITALS', 'dir', ['up', 'down', 'flat'], D.VITALS || []); enumWarn('SEGMENTS', 'dir', ['up', 'down', 'flat'], D.SEGMENTS || []);
  enumWarn('APIS', '2', ['free', 'key', 'paid'], (D.APIS || []).map(r => ({ 2: r[2], n: r[0] }))); // the data room colours the access tag by this word
  // FEEDS[2] and CALENDAR.c are free text by design (the engine prints the first word / the string), so they are not enum-checked.
}

function checkFlags(D) {
  const R = 'verification flags';
  const OK = new Set(['V', 'S', 'U']);
  const sites = [
    ['VITALS', D.VITALS, 'vf'], ['SYMPTOMS', D.SYMPTOMS, 'vf'], ['LONGVIEW', D.LONGVIEW, 'vf'], ['HUBS', D.HUBS, 'vf'], ['SEGMENTS', D.SEGMENTS, 'vf'], ['INSTITUTIONS', D.INSTITUTIONS, 'vf'], ['REGIMES', D.REGIMES, 'vf'], ['DISPATCHES', D.DISPATCHES, 'vf'],
    ['ATLAS', D.ATLAS, 'v'], ['JOURNEYS', D.JOURNEYS, 'v']
  ];
  for (const [coll, arr, f] of sites) {
    if (!Array.isArray(arr)) continue;
    const have = arr.filter(x => x[f] !== undefined).length;
    arr.forEach((x, i) => {
      if (x[f] === undefined) { if (have > arr.length / 2) F.warn(R, at(coll, `${coll}[${label(coll, x, i)}].${f}`), `no verification flag while ${have}/${arr.length} siblings have one (the badge renders “unverified”)`); return; }
      if (!OK.has(x[f])) F.error(R, at(coll, `${coll}[${label(coll, x, i)}].${f}`), `${q(x[f])} is not V, S or U`);
    });
  }
  (D.RECORDS2 || []).forEach((r, i) => { if (!OK.has(r[5])) F.error(R, at('RECORDS2', `RECORDS2[${i}] ${r[0]}`), `flag ${q(r[5])} is not V, S or U`); });
  for (const k of ['global', 'online', 'auction', 'dealer', 'us', 'nft']) ((D.SERIES || {})[k] || []).forEach((p, i) => { if (p[2] !== undefined && !OK.has(p[2])) F.error(R, at('SERIES', `SERIES.${k}[${i}]`), `flag ${q(p[2])} is not V, S or U`); });
  ((D.SERIES || {}).shares || []).forEach((r, i) => { if (r[2] !== undefined && !OK.has(r[2])) F.error(R, at('SERIES', `SERIES.shares[${i}]`), `flag ${q(r[2])} is not V, S or U`); });
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
function realDate(s) { if (!ISO.test(s)) return false; const [y, m, d] = s.split('-').map(Number); if (m < 1 || m > 12 || d < 1) return false; const dim = new Date(Date.UTC(y, m, 0)).getUTCDate(); return d <= dim; }
function checkDates(D) {
  const R = 'dates';
  const one = (coll, where, s, f) => { if (s == null) return false; if (!isStr(s) || !realDate(s)) { F.error(R, at(coll, `${where}.${f}`), `${q(s)} is not a real ISO date (YYYY-MM-DD)`); return false; } return true; };
  for (const [coll, arr] of [['RESULTS', D.RESULTS], ['RESULTS_MORE', D.RESULTS_MORE]]) (arr || []).forEach(r => { if (one(coll, `lot ${q(r.title)}`, r.date, 'date') && r.date > ENGINE.TODAY) F.warn(R, at(coll, `lot ${q(r.title)}.date`), `${r.date} is after TODAY (${ENGINE.TODAY}) — a result in the future`); });
  (D.UPCOMING || []).forEach(u => { if (one('UPCOMING', `upcoming ${q(u.title)}`, u.date, 'date') && u.date < ENGINE.TODAY) F.warn(R, at('UPCOMING', `upcoming ${q(u.title)}.date`), `${u.date} is before TODAY (${ENGINE.TODAY}); still listed as coming to the block`); });
  (D.DISPATCHES || []).forEach((d, i) => one('DISPATCHES', `DISPATCHES[${i}]`, d.d, 'd'));
  (D.NEWS || []).forEach((n, i) => { if (one('NEWS', `NEWS[${i}] ${q((n.h || '').slice(0, 40))}`, n.dt, 'dt') && n.dt > ENGINE.TODAY) F.warn(R, at('NEWS', `NEWS[${i}].dt`), `${n.dt} is after TODAY (${ENGINE.TODAY})`); });
  /* a link that names a different sale city or house than its entry (a copied URL): the 2026-10 audit found a Hong Kong sale linked to a London page */
  { const CITY = ['london', 'new york', 'hong kong', 'paris', 'geneva', 'basel', 'miami', 'shanghai', 'seoul', 'tokyo', 'los angeles', 'doha', 'abu dhabi', 'singapore', 'dubai'], HOUSE = ['christie', 'sotheby', 'phillips', 'bonhams'];
    const inUrl = (u, x) => u.includes(x.replace(' ', '-')) || u.includes(x.replace(' ', ''));
    (D.CALENDAR || []).forEach((c, i) => { const u = String(c.u || '').toLowerCase(), n = String(c.n || '').toLowerCase(), city = String(c.city || '').toLowerCase(); if (!u) return;
      const nc = CITY.filter(x => n.includes(x) || city === x), uc = CITY.filter(x => inUrl(u, x)), nh = HOUSE.filter(h => n.includes(h)), uh = HOUSE.filter(h => u.includes(h));
      if (uc.length && nc.length && !uc.some(x => nc.includes(x))) F.error('links', at('CALENDAR', `CALENDAR[${i}] ${q(c.n)}.u`), `the link names ${uc.join('/')} but the entry is in ${nc.join('/')}`);
      if (uh.length && nh.length && !uh.some(h => nh.includes(h))) F.error('links', at('CALENDAR', `CALENDAR[${i}] ${q(c.n)}.u`), `the link is ${uh.join('/')}’s but the entry is ${nh.join('/')}’s`); }); }
  for (const [coll, arr] of [['CALENDAR', D.CALENDAR], ['FAIRS', D.FAIRS]]) (arr || []).forEach((c, i) => { const w = `${coll}[${i}] ${q(c.n)}`; const a = one(coll, w, c.d, 'd'), b = one(coll, w, c.e, 'e'); if (a && b && c.e < c.d) F.error(R, at(coll, w), `ends ${c.e} before it starts ${c.d}`); if (a && b && c.e === c.d) F.warn(R, at(coll, w), `end equals start; fspan renders it as “${c.d.slice(8)}–${c.d.slice(8)} …” (drop e for a single-day entry; the engine reads e||d)`); });
}

const URL_FIELDS = [
  ['HOUSES', D => (D.HOUSES || []).flatMap(h => [[`HOUSES[${h.id}].web`, h.web], ...(h.sources || []).map((s, i) => [`HOUSES[${h.id}].sources[${i}]`, s]), ...(h.links || []).map((l, i) => [`HOUSES[${h.id}].links[${i}]`, l && l[1]])])],
  ['PLAYERS', D => (D.PLAYERS || []).flatMap(h => [[`PLAYERS[${h.id}].web`, h.web], ...(h.src || []).map((s, i) => [`PLAYERS[${h.id}].src[${i}]`, s])])],
  ['COLLECTORS', D => (D.COLLECTORS || []).flatMap(c => (c.src || []).map((s, i) => [`COLLECTORS[${c.id}].src[${i}]`, s]))],
  ['STORIES', D => [...(D.STORIES || []), ...(D.STORIES_MORE || [])].flatMap(s => (s.src || []).map((x, i) => [`story ${s.id}.src[${i}]`, Array.isArray(x) ? x[1] : x]))],
  ['ATLAS', D => (D.ATLAS || []).flatMap(a => (a.src || []).map((x, i) => [`ATLAS[${a.id}].src[${i}]`, Array.isArray(x) ? x[1] : x]))],
  ['JOURNEYS', D => (D.JOURNEYS || []).flatMap(j => (j.src || []).map((x, i) => [`JOURNEYS[${j.id}].src[${i}]`, Array.isArray(x) ? x[1] : x]))],
  ['HUBS', D => (D.HUBS || []).flatMap(h => (h.src || []).map((x, i) => [`HUBS[${h.id}].src[${i}]`, Array.isArray(x) ? x[1] : x]))],
  ['SEGMENTS', D => (D.SEGMENTS || []).flatMap(s => (s.src || []).map((x, i) => [`SEGMENTS[${s.id}].src[${i}]`, Array.isArray(x) ? x[1] : x]))],
  ['INSTITUTIONS', D => (D.INSTITUTIONS || []).flatMap(s => (s.src || []).map((x, i) => [`INSTITUTIONS[${s.id}].src[${i}]`, Array.isArray(x) ? x[1] : x]))],
  ['UPCOMING', D => (D.UPCOMING || []).map(u => [`upcoming ${q(u.title)}.src`, u.src])],
  ['SIGNALS', D => (D.SIGNALS || []).flatMap(s => (s.s || []).map((x, i) => [`signal ${q(s.t)}.s[${i}]`, Array.isArray(x) ? x[1] : x]))],
  ['EVIDENCE', D => Object.entries(D.EVIDENCE || {}).flatMap(([k, e]) => (e.s || []).map((x, i) => [`EVIDENCE[${k}].s[${i}]`, Array.isArray(x) ? x[1] : x]))],
  ['NEWS', D => (D.NEWS || []).map((n, i) => [`NEWS[${i}] ${q(n.h.slice(0, 40))}.u`, n.u])],
  ['CALENDAR', D => (D.CALENDAR || []).map((c, i) => [`CALENDAR[${i}] ${q(c.n)}.u`, c.u])],
  ['DISPATCHES', D => (D.DISPATCHES || []).map((d, i) => [`DISPATCHES[${i}].u`, d.u])],
  ['REPORTS', D => (D.REPORTS || []).map(r => [`REPORTS ${q(r.n)}.u`, r.u])],
  ['FEEDS', D => (D.FEEDS || []).map(r => [`FEEDS ${q(r[0])}[1]`, r[1]])],
  ['APIS', D => (D.APIS || []).map(r => [`APIS ${q(r[0])}[3]`, r[3]])],
  ['INST_FACTS', D => (D.INST_FACTS || []).map((r, i) => [`INST_FACTS[${i}][2]`, r[2]])],
  ['PULSE_SRC', D => Object.entries(D.PULSE_SRC || {}).map(([k, v]) => [`PULSE_SRC[${k}]`, Array.isArray(v) ? v[1] : v])],
  ['MARKET', D => ((D.MARKET || {}).sources || []).map((x, i) => [`MARKET.sources[${i}]`, Array.isArray(x) ? x[1] : x])],
  ['PEOPLE', D => (D.PEOPLE || []).map((p, i) => [`PEOPLE[${i}] ${p.n}.url`, p.url])],
  ['ROUTES', D => (D.ROUTES || []).flatMap(r => (r.items || []).filter(it => isStr(it[1]) && /^(https?:|www\.)/i.test(it[1])).map((it, i) => [`ROUTES ${r.org}.items ${q(it[0])}`, it[1]]))]
];
function checkUrls(D) {
  const R = 'source URLs';
  for (const [coll, get] of URL_FIELDS) for (const [where, u] of get(D)) {
    if (u == null) continue;
    if (!isStr(u)) { F.error(R, at(coll, where), 'source must be a URL string'); continue; }
    if (!/^https?:\/\//.test(u)) { F.error(R, at(coll, where), `${q(u.slice(0, 70))} is not an http(s) URL`); continue; }
    try { const url = new URL(u); if (!url.hostname.includes('.')) F.error(R, at(coll, where), `${q(u)} has no real host`); if (/\s/.test(u)) F.error(R, at(coll, where), 'URL contains whitespace'); } catch (e) { F.error(R, at(coll, where), `${q(u.slice(0, 70))} does not parse as a URL`); }
  }
  // any string anywhere that looks like a URL but is malformed (htp://, missing slash…)
  for (const [p, s] of allStrings(D)) if (/^(htp|ttp|http:\/[^\/]|https:\/[^\/]|https?;)/i.test(s)) F.error(R, p, `${q(s.slice(0, 60))} looks like a mistyped URL`);
}

const DEBRIS = [[/\bundefined\b/, 'undefined'], [/\bNaN\b/, 'NaN'], [/\[object Object\]/, '[object Object]'], [/\bTODO\b/, 'TODO'], [/\bXXX\b/, 'XXX'], [/\?\?/, '??'], [/\bnull\b/, 'null (as text)'], [/\$\{(?!HUBCOUNT|SEGCOUNT|INSTCOUNT|ALLCOUNT|PEOPLECOUNT|LOTCOUNT|NGACOUNT|UNDERCOUNT|MOVECOUNT)/, '${…} template left in a string']];
function checkStrings(D) {
  const R = 'string debris';
  for (const [p, s] of allStrings(D)) {
    for (const [re, what] of DEBRIS) if (re.test(s)) { F.error(R, p, `contains ${q(what)}: ${q(s.slice(0, 80))}`); break; }
    if (/^\s|\s$/.test(s) && s.trim()) F.warn('whitespace', p, `leading/trailing whitespace: ${q(s.slice(0, 40))}`);
    /* the research desk’s answers (KB[].a) and the analyst’s Markdown keep their line breaks: only runs of spaces count there */
    if ((/^KB\[[^\]]*\]\.a$/.test(p) ? / {2,}/ : /\s{2,}/).test(s)) F.warn('whitespace', p, `double space inside: ${q(s.replace(/\s{2,}/g, '␣␣').slice(0, 60))}`);
  }
}

function checkCoverage(D) {
  const R = 'coverage';
  // missing src where most items have one
  const srcColls = [['HUBS', D.HUBS, 'src'], ['SEGMENTS', D.SEGMENTS, 'src'], ['INSTITUTIONS', D.INSTITUTIONS, 'src'], ['COLLECTORS', D.COLLECTORS, 'src'], ['STORIES', [...(D.STORIES || []), ...(D.STORIES_MORE || [])], 'src'], ['PLAYERS', D.PLAYERS, 'src'], ['HOUSES', D.HOUSES, 'sources'], ['ATLAS', D.ATLAS, 'src'], ['JOURNEYS', D.JOURNEYS, 'src'], ['CALENDAR', D.CALENDAR, 'u'], ['UPCOMING', D.UPCOMING, 'src']];
  for (const [coll, arr, f] of srcColls) {
    if (!Array.isArray(arr)) continue;
    const has = x => Array.isArray(x[f]) ? x[f].length > 0 : !!x[f];
    const n = arr.filter(has).length;
    if (n > arr.length / 2) arr.forEach((x, i) => { if (!has(x)) F.warn(R, at(coll, `${coll}[${label(coll, x, i)}].${f}`), `no source while ${n}/${arr.length} siblings have one`); });
  }
  // images among neighbours: flagged only when at least half of the group carries one
  const byGroup = (coll, arr, groupOf, groupName) => { const groups = {}; (arr || []).forEach(x => (groups[groupOf(x)] = groups[groupOf(x)] || []).push(x)); for (const [g, xs] of Object.entries(groups)) { const withImg = xs.filter(x => x.img); if (withImg.length * 2 >= xs.length && withImg.length < xs.length) xs.filter(x => !x.img).forEach(x => F.warn(R, at(coll, `${coll}[${x.id}]`), `no image while ${withImg.length}/${xs.length} in ${groupName} ${q(g)} have one (informational)`)); } };
  byGroup('HUBS', D.HUBS, h => h.r, 'region'); byGroup('SEGMENTS', D.SEGMENTS, s => s.g, 'group'); byGroup('SYMPTOMS', D.SYMPTOMS, () => 'all', 'the symptoms');
  if ((D.INSTITUTIONS || []).some(i => i.img)) byGroup('INSTITUTIONS', D.INSTITUTIONS, i => i.hub, 'hub'); else F.info(R, at('INSTITUTIONS', 'INSTITUTIONS'), 'no institution carries an image and the engine does not render one; nothing to check');
}

// Money formatting: report the styles in use and the minority forms. Never fixed by the lint.
const MONEY_STYLES = [
  ['$1.3m / $59.6bn / $150k (house style)', /(?:US|HK|A|C|S)?\$\d[\d,]*(?:\.\d+)?(?:bn|m|k)\b/g, true],
  ['word units: “$1.3 million”, “$2 billion”', /[$£€]\s?\d[\d,.]*\s?(?:million|billion|thousand|mn|bn\b)/g, s => /million|billion|thousand|mn/.test(s)],
  ['space before the unit: “$1.3 m”', /[$£€]\d[\d,.]*\s(?:bn|m|k)\b/g, true],
  ['capital unit: “$1.3M”, “$2B”, “$150K”', /[$£€]\d[\d,.]*(?:M|B|K)\b/g, true],
  ['“USD 1.3m” / “US$”', /\b(?:USD|US\$)\s?\d/g, true],
  ['tilde approx “~$”', /~\s?[$£€]/g, true],
  ['long form “$1,300,000” for a sum ≥ $1m', /[$£€]\d{1,3}(?:,\d{3}){2,}\b/g, true],
  ['“€” and “£” figures (fine; counted for the record)', /[£€]\d[\d,]*(?:\.\d+)?(?:bn|m|k)\b/g, true]
];
function checkMoney(D) {
  const counts = {}, examples = {};
  for (const [p, s] of allStrings(D)) for (const [name, re, keep] of MONEY_STYLES) { const ms = s.match(re) || []; for (const m of ms) { if (keep !== true && !keep(m)) continue; counts[name] = (counts[name] || 0) + 1; (examples[name] = examples[name] || []); if (examples[name].length < 4) examples[name].push(`${p}: ${q(m)}`); } }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const summary = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v}× ${k}`).join('; ');
  F.info('money formatting', 'all data', `styles seen (${total} figures): ${summary || 'none'}`);
  for (const [name, n] of Object.entries(counts)) if (!/house style|fine;/.test(name) && n) F.warn('money formatting', 'all data', `${n}× ${name} — e.g. ${examples[name].join(' · ')}`);
}

function checkOrphans(D, used) {
  const R = 'orphans';
  // collections no engine reads
  const engineText = ENGINE_FILES.map(f => engines[f] || '').join('\n');
  const dataText = DATA_FILES.map(f => sources[f] || '').join('\n');
  for (const name of Object.keys(D)) { if (typeof D[name] === 'function') continue; const re = new RegExp(`\\b${name}\\b`); const inEngine = re.test(engineText); const inData = (dataText.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length > 1; if (!inEngine && !inData) F.info(R, at(name, name), `collection is declared but no engine or other data file reads it`); }
  // MARKET sub-keys
  for (const k of Object.keys(D.MARKET || {})) if (!new RegExp(`\\b(?:M|MARKET)\\.${k}\\b`).test(engineText)) F.info(R, at('MARKET', `MARKET.${k}`), 'key is never read by an engine');
  // PULSE_SRC keys nobody cites
  const cited = new Set([...(D.VITALS || []).flatMap(v => v.src || []), ...(D.SYMPTOMS || []).flatMap(s => s.src || [])]);
  for (const k of Object.keys(D.PULSE_SRC || {})) if (!cited.has(k) && !engineText.includes(`PS('${k}')`)) F.info(R, at('PULSE_SRC', `PULSE_SRC[${k}]`), `source ${q((D.PULSE_SRC[k] || [])[0])} is cited by no vital sign or symptom`);
  // SERIES keys nobody plots
  const plotted = new Set((D.VITALS || []).map(v => v.s).filter(Boolean));
  for (const k of Object.keys(D.SERIES || {})) if (!plotted.has(k) && !engineText.includes(`SERIES.${k}`)) F.info(R, at('SERIES', `SERIES.${k}`), 'series is plotted by no vital sign and no chart');
  // EVIDENCE keys nobody opens
  const evUsed = new Set([...Array.from(engineText.matchAll(/data-ev="([a-z0-9_]+)"/g)).map(m => m[1]), ...(ENGINE.EV_TILES || []), ...Array.from(engineText.matchAll(/hbars\([^;]*?,'([a-z0-9_]+)'\)/g)).map(m => m[1]), ...(D.REEL || []).filter(c => c.k === 'kpi').map(c => c.ref)]);
  for (const k of Object.keys(D.EVIDENCE || {})) if (!evUsed.has(k)) F.info(R, at('EVIDENCE', `EVIDENCE[${k}]`), 'evidence drawer is opened by no KPI, bar or Reel card');
  // stations with no atlas entry
  for (const st of D.STATIONS || []) if (!(D.ATLAS || []).some(a => (a.st || []).includes(st.id))) F.info(R, at('STATIONS', `STATIONS[${st.id}]`), 'no ATLAS entry mentions this station; its brief shows no chips');
  // symptoms with no link and no Reel card
  for (const s of D.SYMPTOMS || []) if (!s.link && !(D.REEL || []).some(c => c.k === 'symptom' && c.ref === s.id)) F.info(R, at('SYMPTOMS', `SYMPTOMS[${s.id}]`), 'diagnosis has no link and no Reel card; reachable only from the Pulse grid');
  // provenance cases that match no lot (their chain would be a fallback)
  const titles = lotTitles(D);
  for (const c of D.PROV_CASES || []) if (!titles.has(c.t)) F.info(R, at('PROV_CASES', `PROV_CASES ${q(c.t)}`), 'title matches no lot, so the chain is shown only in the Ledger case files');
  // houses without a timeline or a Reel/HOUSEIMG picture
  for (const h of D.HOUSES || []) if (!(D.TIMELINES || {})[h.id]) F.info(R, at('HOUSES', `HOUSES[${h.id}]`), 'no TIMELINES entry; the dossier says “No timeline for this house yet”');
  // signals the Reel never shows (purely informational)
  // lots with a chain in CHAINS and also a PROV_CASES chain: CHAINS wins
  for (const c of D.PROV_CASES || []) if ((D.CHAINS || {})[c.t]) F.info(R, at('PROV_CASES', `PROV_CASES ${q(c.t)}`), 'lot also has a CHAINS entry; the lot page shows CHAINS and ignores this chain');
  // LONGVIEW order
  const lv = D.LONGVIEW || []; for (let i = 1; i < lv.length; i++) if (lv[i].y < lv[i - 1].y) { F.warn('order', at('LONGVIEW', `LONGVIEW[${i}] ${lv[i].y}`), `out of chronological order after ${lv[i - 1].y} (the long view renders in array order)`); }
}

/* ---------------------------------------------------------- places (v23) */
// The World view draws by src/data_places.js: every coordinate in range, every movement with a centre, every birthplace
// and centre a known city, every city a record names resolvable to a place (the globe can only show what it can place).
function checkPlaces(D) {
  const R = 'places'; const C = D.CITY_LL || {}, M = D.MOVEMENT_LL || {}, B = D.ARTIST_BORN || {}, CE = D.CENTRES || [];
  for (const [c, ll] of Object.entries(C)) if (!Array.isArray(ll) || ll.length !== 2 || !(ll[0] >= -180 && ll[0] <= 180) || !(ll[1] >= -90 && ll[1] <= 90)) F.error(R, at('CITY_LL', `CITY_LL ${q(c)}`), `coordinates must be [lon, lat] in range, got ${JSON.stringify(ll)}`);
  const mvIds = new Set((D.MOVEMENTS || []).map(m => m.id));
  for (const id of mvIds) if (!Array.isArray(M[id]) || !M[id].length) F.error(R, at('MOVEMENT_LL', `MOVEMENT_LL ${q(id)}`), 'movement has no centre; the World cannot place it');
  for (const [id, cities] of Object.entries(M)) { if (!mvIds.has(id)) F.error(R, at('MOVEMENT_LL', `MOVEMENT_LL ${q(id)}`), 'no such movement'); for (const c of cities || []) if (!C[c]) F.error(R, at('MOVEMENT_LL', `MOVEMENT_LL ${q(id)}`), `centre ${q(c)} is not in CITY_LL`); }
  const names = new Set([...(D.RESULTS || []).map(r => r.artist), ...(D.RESULTS_MORE || []).map(r => r.artist)]); (D.MOVEMENTS || []).forEach(m => (m.artists || []).forEach(a => names.add(typeof a === 'string' ? a : a && a.n)));
  try { Object.values(JSON.parse(fs.readFileSync(IMG_META, 'utf8'))).forEach(m => names.add(m.a)); } catch (e) {}   /* a painter with a picture in the library belongs on the globe too */
  for (const [a, v] of Object.entries(B)) {
    if (!Array.isArray(v) || !C[v[0]]) F.error(R, at('ARTIST_BORN', `ARTIST_BORN ${q(a)}`), `birthplace ${q(v && v[0])} is not in CITY_LL`);
    else if (!Number.isFinite(v[1]) || (v[2] != null && (!Number.isFinite(v[2]) || v[2] < v[1]))) F.error(R, at('ARTIST_BORN', `ARTIST_BORN ${q(a)}`), `years must be [born, died|null], got ${JSON.stringify(v.slice(1))}`);
    if (!names.has(a)) F.warn(R, at('ARTIST_BORN', `ARTIST_BORN ${q(a)}`), 'artist is in no lot, movement or picture');
  }
  let missing = 0; for (const a of names) if (a && !B[a] && !/\(|workshops|painters|artists|Codex|ware|Roman|United States|Hermès|Patek|Mercedes|Diamond|Dinosaur|Jordan|Larva|XCOPY|Beeple|Banksy/.test(a)) missing++;
  if (missing) F.info(R, at('ARTIST_BORN', 'ARTIST_BORN'), `${missing} named artists have no birthplace yet (they stay off the Then layer)`);
  CE.forEach((c, i) => { if (!Array.isArray(c) || c.length < 6) { F.error(R, at('CENTRES', `CENTRES[${i}]`), 'expected [from, to, city, title, why, reading]'); return; } if (!C[c[2]]) F.error(R, at('CENTRES', `CENTRES[${i}]`), `city ${q(c[2])} is not in CITY_LL`); if (!(c[0] < c[1])) F.error(R, at('CENTRES', `CENTRES[${i}]`), 'from must precede to'); if (i && c[0] < CE[i - 1][0]) F.warn(R, at('CENTRES', `CENTRES[${i}]`), 'out of chronological order'); });
  // every city a dated record names must resolve the way world.js resolves it
  const key = s => { s = String(s || '').trim(); if (!s || s === '—' || /^online$/i.test(s)) return 'skip'; if (C[s]) return s; const parts = s.split(/,|\band\b|\//).map(x => x.trim()).filter(Boolean); const order = /,/.test(s) ? parts.slice().reverse() : parts; for (const p of order) if (C[p]) return p; return null; };
  const seen = new Set();
  const want = [...(D.RESULTS || []).map(r => ['RESULTS', r.city]), ...(D.RESULTS_MORE || []).map(r => ['RESULTS_MORE', r.city]), ...(D.UPCOMING || []).map(u => ['UPCOMING', u.city]), ...((D.LIVE && D.LIVE.sales) || []).map(s2 => ['LIVE.sales', s2.city]), ...(D.FAIRS || []).map(f => ['FAIRS', f.city]), ...(D.CALENDAR || []).map(c => ['CALENDAR', c.city])];
  for (const [col, city] of want) { if (city == null) continue; const k = key(city); if (k === null && !seen.has(city)) { seen.add(city); F.warn(R, at(col, `${col} city ${q(city)}`), 'no CITY_LL entry resolves this place; the World leaves it off the globe'); } }
}

const CHECKS = [checkIds, checkSourceScan, checkSchema, checkFlags, checkDates, checkUrls, checkStrings, checkCoverage, checkMoney, checkPlaces];

/* ---------------------------------------------------------------- main */
loadData();
if (D) {
  readEngineConstants();
  let L = null, used = null;
  try { L = checkRefs(D); } catch (e) { F.error('lint', 'checkRefs', e.stack); }
  try { used = checkImages(D, L || { lb: [], img: [] }); } catch (e) { F.error('lint', 'checkImages', e.stack); }
  for (const c of CHECKS) { try { c(D); } catch (e) { F.error('lint', c.name, `check crashed: ${e.stack.split('\n').slice(0, 2).join(' ')}`); } }
  try { checkOrphans(D, used || new Map()); } catch (e) { F.error('lint', 'checkOrphans', e.stack); }
}

const bySev = { ERROR: [], WARN: [], INFO: [] };
for (const f of findings) (bySev[f.sev] = bySev[f.sev] || []).push(f);
const counts = { ERROR: bySev.ERROR.length, WARN: bySev.WARN.length, INFO: bySev.INFO.length };
const collections = D ? Object.keys(D).filter(k => typeof D[k] !== 'function').length : 0;
if (OPTS.json) {
  console.log(JSON.stringify({ counts, notes, findings: OPTS.noInfo ? findings.filter(f => f.sev !== 'INFO') : findings }, null, 1));
} else {
  if (!OPTS.quiet) {
    console.log(`Subhasta data lint — ${DATA_FILES.length} data files, ${collections} collections, images ${D && D.IMG ? Object.keys(D.IMG).length : 0}, engines ${ENGINE_FILES.filter(f => engines[f]).length}/${ENGINE_FILES.length}`);
    for (const n of notes) console.log(`NOTE  ${n}`);
    for (const sev of ['ERROR', 'WARN', 'INFO']) {
      if (sev === 'INFO' && OPTS.noInfo) continue;
      const list = bySev[sev];
      console.log(`\n${sev} (${list.length})`);
      const groups = {}; for (const f of list) (groups[f.rule] = groups[f.rule] || []).push(f);
      for (const [rule, fs2] of Object.entries(groups)) { console.log(`  [${rule}]`); for (const f of fs2) console.log(`    ${f.where} — ${f.msg}`); }
    }
    console.log('');
  }
  console.log(`Summary: ERROR ${counts.ERROR} · WARN ${counts.WARN} · INFO ${counts.INFO} · ${Date.now() - t0} ms`);
}
process.exit(counts.ERROR ? 1 : 0);
