# Subhasta — architecture review

Date: 5 October 2026. Scope: everything a reading of the sources, the build, the tools and the published artifact turned up that `audit/data_integrity.md` (data-layer lint) and `audit/runtime_audit.md` (browser behaviour, accessibility) do not already report. Where those two documents cover a point it is referenced, not repeated. Line numbers are those of the working tree on 5 October; names are the stable handles.

Nothing in this review was changed in the sources. The one tool fix made alongside it is in `tools/globals.py` (section E). Every other item is a proposed patch for its owner.

Ranking: **A** blocks or silently corrupts a refresh or a publish · **B** wrong or stale output for readers · **C** maintainability traps a new engineer will hit · **D** housekeeping.

---

## A. Process and tooling

### A1. The monthly refresh session cannot run the tools — `REFRESH.md` §1 (lines 12–18) and §4 (lines 103–110)

The scheduled refresh starts in a fresh session and gets its source from the artifact's published files. The published list (verified against the artifact's file listing on 5 October: 259 files) contains `src/REFRESH.md`, `src/build.py`, `src/test.js`, the two image scripts, the two data JSON files and `src/src/*`. It does **not** contain `tools/lint_data.js`, `tools/audit_runtime.js`, `tools/globals.py`, `tools/nga_subset.py`, `data/nga_ids.txt` (the Ledger's source of truth), `package.json`, the audits, or this documentation. The refresh therefore edits nine data files blind: no cross-reference lint, no runtime audit, no way to extend the Ledger reproducibly. The task brief's statement that "the whole source tree is published" is true of `src/` only.

Patch (REFRESH.md §1 list and §4 map; same paths on both sides):
```
 ["src/REFRESH.md","src/README.md","src/ARCHITECTURE.md","src/build.py","src/test.js","src/package.json",
  "src/images_manifest.py","src/fetch_images.py",
  "src/tools/lint_data.js","src/tools/audit_runtime.js","src/tools/globals.py","src/tools/nga_subset.py",
  "src/audit/data_integrity.md","src/audit/runtime_audit.md","src/audit/architecture_review.md",
  "src/src/page.html", … (unchanged) …,
  "src/data/images_meta.json","src/data/nga_subset.json","src/data/nga_ids.txt"]
```
and in §4: `.py` files keep `contentType: "text/plain"`; `tools/*.js`, `*.md`, `*.json` are served by extension. Add to §1 "Build / Test": `npm install` (replaces `npm i jsdom`: `package.json` now pins jsdom and axe-core), `node tools/lint_data.js` after the build and `node tools/audit_runtime.js` before publishing (the runtime audit's §9 already asks for the latter).

### A2. The published source lags the working tree — process gap, no single file

The artifact's `src/src/app.js` is 108,113 bytes; the local file is 116,520. Several data files differ in both directions. Because the refresh builds from the artifact, every local edit that is not republished is invisible to it, and the artifact's copy of the source will be *overwritten* by the refresh's own result (REFRESH.md §4 republishes the whole source map), leaving the local tree and the published tree permanently forked. Patch: add to REFRESH.md §4 (and to the engineers' routine) the rule "publish the source map after every session that edits `src/`, `tools/` or `data/`, even when the page itself did not change"; and add a check at the top of the refresh: read `src/src/app.js` from the artifact and compare its size with the local build inputs before editing.

### A3. `test.js` cannot fail — `test.js:72`

The smoke test prints `errors: none` or the list, then `process.exit(0)` in every case. Any script that runs it (the refresh, a future CI) must grep the output; REFRESH.md says "must end with `errors: none`" but nothing enforces it. Patch:
```js
- console.log('errors:',errors.length?errors.join('\n'):'none');process.exit(0);},900);
+ console.log('errors:',errors.length?errors.join('\n'):'none');process.exit(errors.length?1:0);},900);
```
The 900 ms fixed wait is a second weakness (a slow machine cuts the walk short and *reports success*); a `TEST EXCEPTION` from a half-rendered page would at least be caught by the exit code above.

### A4. Three different "verified" dates and no single source for them — `src/app.js:163`, `src/under.js:7`, `src/data_market.js:122`

- `MARKET.verified` is `'3 Oct 2026'` and is rendered nowhere (data audit §4 lists it as unused);
- the Floor chip says `Figures verified 4 Oct 2026` (app.js 163, named in REFRESH.md §3.1);
- every V-flag tooltip says `Confirmed against a primary or reputable source, 4 Oct 2026` (under.js 7, named nowhere in REFRESH.md);
- `TODAY` is `2026-10-05`.

A refresh that follows REFRESH.md updates two of the four. Patch: one constant, three readers.
```js
// app.js, next to TODAY
-const TODAY='2026-10-05';
+const TODAY='2026-10-05';const VERIFIED=MARKET.verified; // 'D Mon YYYY', set in data_market.js
// app.js renderFloor
-<span class="chip">Figures verified 4 Oct 2026</span>
+<span class="chip">Figures verified ${esc(VERIFIED)}</span>
// under.js vflag
-…reputable source, 4 Oct 2026">verified</span>
+…reputable source, ${esc(VERIFIED)}">verified</span>
```
and in REFRESH.md §3.1 replace "update the 'Figures verified' chip" with "set `MARKET.verified`".

### A5. `build.py`: fragile counting, a dead read, no guard against `</script` — `build.py:8, 15, 19–22, 25, 29–30`

- Line 8 reads `app.js` and line 15 reads it again with the engines pasted; the first read is dead.
- The eight footer counts are regexes over source text (`\n\{id:'`, `\n\{artist:'`, `\n\{n:'`, and `split('const HUBS=')[1].split('const COUNTRY_SHARE')[0]`). A record indented by one space, a record written with double quotes, or a constant moved past its anchor changes a count silently or raises `IndexError` at build time. Nothing compares the counts with the evaluated collections.
- Only the NGA JSON has `</` escaped. A data string containing `</script` would terminate the script element; the lint's string-debris rule does not look for it.
- The preview wrapper has no `lang="en"` (runtime audit §9).

Patch:
```python
-app = (src/'app.js').read_text(encoding='utf-8')          # line 8: remove
…
+def must(n, label):
+    if n <= 0: raise SystemExit(f'count for {label} is {n}: a record is not formatted as one line starting with {{id:\'')
+    return n
-hubs_n = len(re.findall(…))
+hubs_n = must(len(re.findall(…)), 'HUBCOUNT')      # likewise segs_n, insts_n, under, people, houses, lots
…
+for name, text in (('data_houses', dh), ('data_market', dm), ('data_more', dm2), ('data_people', dp), ('data_reel', dr), ('data_under', du), ('data_pulse', dpu), ('data_atlas', dat), ('data_world', dwo), ('app', app), ('reel', rj), ('css', css)):
+    if '</script' in text.lower(): raise SystemExit(f'{name} contains "</script": it would end the page\'s script element')
+for ph in ('/*__CSS__*/', '/*__DATA_HOUSES__*/', …, '/*__REEL__*/'):
+    if page.count(ph) != 1: raise SystemExit(f'placeholder {ph} occurs {page.count(ph)} times in page.html')
-(root/'build'/'preview.html').write_text('<!doctype html><html><head>…
+(root/'build'/'preview.html').write_text('<!doctype html><html lang="en"><head>…
```
A stronger check (counts against the evaluated collections) belongs in `tools/lint_data.js`, which already evaluates the data: compare `D.HOUSES.length + D.PLAYERS.length` etc. with the regex counts, or better, have `build.py` take the counts from a small `node -e` evaluation. Either closes the gap; the lint variant keeps the build dependency-free.

---

## B. Wrong or stale output

### B1. Counts in prose have drifted from the data — `src/app.js:181, 292`, `src/reel.js:16`, `src/pulse.js:55`

`SIGNALS` has 11 entries; the Floor says "all ten" (app.js 181), the Signals view says "Ten readings" (292) and the Reel's signal card says "All ten signals" (reel.js 16). `RECORDS2` has 36 rows; the Pulse says "thirty artists" (pulse.js 55). The other spelled-out counts ("sixteen" vitals, symptoms and stations; "twenty-four" segments, "six" case files and risks, "ten" checks, "five" rooms) still match today. Patch: derive them.
```js
// app.js 181
-<button data-go="signals">all ten</button>
+<button data-go="signals">all ${words(SIGNALS.length)}</button>
// app.js 292
-<p class="dek">Ten readings of where the money is moving in 2026, …
+<p class="dek">${esc(words(SIGNALS.length)[0].toUpperCase()+words(SIGNALS.length).slice(1))} readings of where the money is moving in 2026, …
// reel.js 16
-<button class="rbtn primary" data-go="signals">All ten signals</button>
+<button class="rbtn primary" data-go="signals">All ${R.SIGNALS.length} signals</button>
// pulse.js 55
-<span class="sub">thirty artists: the record, and what their work made in 2025–26</span>
+<span class="sub">${words(RECORDS2.length)} artists: the record, and what their work made in 2025–26</span>
```
`words()` (atlas.js 1) is in the shared app scope; it handles 0–99 only, which is enough here. A lint rule could catch the rest: search the engines for spelled-out numbers next to a collection noun and compare with the collection's length (cheap, approximate, worth it).

### B2. The lens drawer promises three things the lens does not do — `src/pulse.js:4–5`

The hint under the lens bar says "the strip below, the calendar and the fee model follow the lens" and the drawer's note says the lens changes "the 'For your desk' strip on the Floor and the Pulse, the default sale room in Follow the money, the calendar's first entries and the tone of the drafts". `LENS` is read only inside `pulse.js` (`lensLabel`, `openLens`, `forYou`). Follow the money reads `FLOW`, which the lens touches only when the collector's "Follow the money here" button is pressed; the Signals and Atlas calendars are not reordered (the strip's own "Your dates" column is); the Desk drafts never read `LENS`. Patch: either implement or correct the copy. Correcting the copy is one line each:
```js
// pulse.js 4
-<span class="hint">the strip below, the calendar and the fee model follow the lens</span>
+<span class="hint">the strip below follows the lens: your room, your rules, your corners, your dates</span>
// pulse.js 5
-…The lens changes the “For your desk” strip on the Floor and the Pulse, the default sale room in Follow the money, the calendar’s first entries and the tone of the drafts. Nothing is hidden; everything is reordered.
+…The lens changes the “For your desk” strip on the Floor and the Pulse: the hubs, the regime, the segments and the dates shown first. Nothing is hidden.
```
Implementing the sale-room default is also small: in `renderUndertow` before `initFlow()`, `if(!FLOW.touched){const h=(LENS_REGIONS[LENS.region]||{}).hubs||[];const v=flowVenueFor(h[0]);if(v)Object.assign(FLOW,{venue:v,dest:…});}` with the hub→room map lifted out of `flowForHub` (see C4) and `FLOW.touched=true` set in `readFlow`. The draft tone would need a role sentence per `INTENTS` entry in `buildDraft`.

### B3. Hard-coded figures on the Floor bypass the evidence they open — `src/app.js:164, 169–170`

KPI tiles 3 and 4 ("Big three, 2025 — $14.2bn — Christie's $6.2bn, Sotheby's $7.1bn, Phillips $927m; H1 2026 auctions +70%" and "Private sales, H1 2026 — $1.8bn+ — …") are literal text, while tiles 1 and 2 read `MARKET.global`. Both tiles open `EVIDENCE.bigthree` / `EVIDENCE.private`, which carry their own `v` strings; two places can disagree after a refresh and REFRESH.md names only `MARKET`/`EVIDENCE`. The hero (line 164: the Van Gogh, "18 November, New York", "$180m") is also literal and will be stale on 19 November; REFRESH.md does not mention it. Patch: read the tiles from `EVIDENCE` (`<div class="v">${esc(EVIDENCE.bigthree.v)}</div>` etc., with the sub-line moved into a new `EVIDENCE[].d` field) and move the hero into a `HERO = {k, h, p, img, cap, acts:[…]}` constant in `data_market.js` that `renderFloor` renders; add both to the REFRESH.md data map.

### B4. Other dated prose in the engines that REFRESH.md does not list

`app.js 294` "10 September – 1 October 2026" (the wire), `296` "tested 1 October 2026" (feeds), `292`/`295` "to June 2027", `300`/`303` "81,540" (NGA objects with provenance text), `pulse.js 40` "$59.6bn in 2025" (ECG label), `45–49` the chart notes with 2025 figures, `44` "2025 to October 2026", `56` "1 September – 4 October 2026" (dispatches), `atlas.js 58` "October 2026 to September 2027". Patch: derive the ranges from the data where a date exists (`DISPATCHES` first/last `d`, `CALENDAR`/`FAIRS` last `d`, `NEWS` has only free-text dates — add an ISO `d` to NEWS or drop the range), and add a short "engine prose to re-read at every refresh" list to REFRESH.md §3 for the rest. The ECG label can read `SERIES.global.at(-1)`.

### B5. `flowModel` ignores the destination's own import-VAT rate — `src/under.js:23` vs `src/data_under.js:171`

`DESTS.londonhome.impVat` is `0.05` in the data, but the model computes `destVat=(p.dest==='londonhome'&&p.venue!=='london')?price*0.05:0` and the ledger row text says "5% on the price as the work enters the UK" (under.js 56). Changing the data rate changes nothing; adding a second destination with import VAT does nothing. Patch:
```js
-const destVat=(p.dest==='londonhome'&&p.venue!=='london')?price*0.05:0;
+const destVat=(D.impVat&&!(p.dest==='londonhome'&&p.venue==='london'))?price*D.impVat:0; // a destination's import VAT applies unless the sale room is already in that country
…
-['Import VAT at destination',m.destVat,m.destVat?'5% on the price as the work enters the UK.':…
+['Import VAT at destination',m.destVat,m.destVat?`${(m.D.impVat*100).toFixed(0)}% on the price as the work enters ${m.D.n.replace(/^Hang it in /,'')}.`:…
```
(The "same country" test is a literal for London today; a `country` field on VENUES and DESTS would make it data.)

### B6. `flowForLot` decides the resale royalty by a regex of dead artists' names — `src/under.js:115`

`living = !/Monet|Klimt|…|Hooch/.test(r.artist)`. Any lot by a dead artist not in the list (the list stops at the names present in October 2026) is treated as alive and gets a resale royalty in London and Paris; a living artist whose surname matches a listed one would be treated as dead. Patch: put the fact in the data — `RESULTS[].arr:false` (or an `ARTIST_DIED = {name: year}` map in `data_market.js`) — and compute `living = r.arr!==false` (or `!died || died > year-70`). The lint can then require the field for every lot.

### B7. Deep-linkable drawers leave their hash behind — `src/app.js:109` (`closeDrawer`), and `openSymptom` from the Floor

`openAtlas`, `openSymptom`, `openHub`, `openSegment` and `openInstitution` set the hash when they open (so the link can be copied) but `closeDrawer` does not restore it, so after closing an undercurrent drawer on the Floor the URL still says `#under-kandinsky` and a reload opens the Undertow with the drawer. From the Floor's "For your desk" strip, `data-symptom` opens the diagnosis drawer over the Floor and writes `#symptom-estates`, which on reload opens the Pulse. Patch:
```js
-function closeDrawer(){const d=$('#drawer');if(!d.classList.contains('on'))return;d.classList.remove('on');…
+function closeDrawer(){const d=$('#drawer');if(!d.classList.contains('on'))return;d.classList.remove('on');if(/^#(under|symptom|hub|segment|inst)-/.test(location.hash)&&!$('#v-detail').classList.contains('on'))setHash(current);…
```
(restores the view's own hash; a drawer over a dossier is left alone because the dossier's hash is not kept anywhere — `detail()` could store it in a `detailHash` variable for the same treatment). Runtime audit §10.2 (`#reel-0` wrapping) is the same family.

### B8. The first-visit guide un-inerts the page while a drawer is open — `src/app.js:464`

`firstVisit()` runs inside `show()`. On a first visit through a deep link such as `#hub-ny`, `route()` → `go('atlas')` shows the guide and makes `.mast,.shell` inert; `openHub` then opens the drawer (inert again); closing the guide calls `setInert(false)`, so the page behind the still-open drawer becomes reachable by Tab until the drawer is closed and reopened. Patch in `done()`:
```js
-const done=()=>{store.set('seen',true);g.classList.remove('on');setInert(false);…
+const done=()=>{store.set('seen',true);g.classList.remove('on');setInert($('#drawer').classList.contains('on')||(window.__REEL&&window.__REEL.isOpen()));…
```

### B9. Hotkeys and the palette disagree with the masthead — `src/app.js:98, 431`, `src/page.html:17–28, 63`

Digits map to `VIEWS[n-1]`: 1 is the Floor, 7 is Signals, 9 is the Salon; the masthead shows the Reel first and has no Signals button, so "1" does not open the first button and "7" opens a section that is not on the bar. The palette lists every section with `v:String(i+1)` ("10", "11", "12" for Undertow, Desk, Lexicon), which read as hotkeys that do not exist, and its footer says "1–9 switch sections". Patch: `v: i<9?String(i+1):''` in `buildIndex`, and either add Signals to the masthead (one button in `page.html`; check the bar still fits at the 1180 px breakpoint with thirteen) or say in the palette footer "1–9 switch sections (Floor to Salon)".

### B10. Board posts are deletable by any contributor — artifact declaration, `src/app.js:340–341`

The stored `db` rules protect `members` (read `view`, write `owner`, `members/{self}` write `interact`). The `board` collection has no rule, so the platform default applies: contributors and up may overwrite or delete *any* document. The UI shows "remove" only on one's own posts (`p.uid===myId`), which is a courtesy, not a control. Patch options: (a) accept and say so in the Salon's board note; (b) key posts by author and declare rules — store each post at `board/<uid>/posts/<id>`... which the current flat `onSnapshot` on `board` would no longer see, so the reader would need `collectionGroup`-style access the runtime may not offer *(unverified)*; (c) keep the flat collection and declare `{"path":"board","read":"view","write":"admin"}` so only editors moderate, at the price of contributors not posting. (a) is the honest minimum.

---

## C. Maintainability traps

### C1. Duplicated helpers across the two IIFEs and the data — `src/reel.js:4–5, 7, 67–68`, `src/under.js:66`, `src/data_more.js:137`, `src/atlas.js:1`

- `reel.js` redefines `$`, `$$`, `esc` (identical to app.js 4–5), `reduce()` (the app inlines the same `matchMedia` test three times: app.js 155, 159, under.js 1), `visible` (= `isVisible`, app.js 56) and `inertBehind` (= `setInert`, app.js 66). `tools/globals.py` lists the first group as cross-IIFE collisions. The Reel cannot see the app's functions except through `window.__S`; the cheap fix is to expose `esc`, `isVisible`, `setInert` and a `reduceMotion()` on `__S` and delete the copies — or to accept the duplication and say so at the top of reel.js (it currently says nothing).
- `lotByT` (under.js 66) and `window.__S.lotByTitle` (app.js 463) are the same lookup written twice in the same scope. Patch: `const lotByTitle=t=>RESULTS.find(r=>r.title===t);` next to `lotById` (app.js 40), use it in under.js and in `__S`.
- `LINKS` (data_more.js 137) carries its own `slug` that does **not** strip `’'".,:()`, so it disagrees with `slug()` (app.js 11): "J.M.W. Turner" becomes `j-m-w-turner` for the Artnet URL and `jmw-turner` for the deep link. Patch: pass the app's slug in — `LINKS(artist, slug)` — or make `LINKS` a plain table of URL templates that the engine fills.
- `words()` (atlas.js 1) returns `undefined` for 100 and above; harmless today, surprising later. Patch: `return n<20?a[n]:n<100?…:String(n);`.

### C2. Dead and vestigial code

| Where | What | Patch |
|---|---|---|
| `src/data_market.js:134–152` | `HUBS_OLD` (16 records with lon/lat), superseded by `HUBS` in `data_atlas.js`; read by nothing (globals.py §3, data audit §4) | delete the block and its comment; the figures that are still true live in `HUBS[].top`/`.shift` |
| `src/app.js:336` | `let posts=[],postsUnsub=null,…`: `postsUnsub` is never assigned or read; no `onSnapshot` unsubscribe is kept anywhere | drop it, or keep the three unsubscribers returned by `onSnapshot` and call them on `pagehide` |
| `src/pulse.js:58` | `document.body.classList.add('printing')` before `window.print()`; no stylesheet rule mentions `.printing` (the `@media print` block does the work) | remove the class toggling or add the intended rules |
| `src/app.js:463` | `window.__S` exports `STATIONS`, `openOrg`, `RESULTS` that `reel.js` never reads (`perf` is read by `tools/audit_runtime.js`) | remove or keep deliberately; update the comment on `reel.js:6`, which lists `reduceMotion` (never exported) and omits sixteen members that are |
| `src/app.js:33` | `orgName` fallback `sfs`: `sfs` is a `PLAYERS` id (data_houses.js 43), so `byId` finds it first | drop the key; the lint's `ORG_FALLBACK` regex follows |
| `src/data_world.js:3` | `PROJ` — kept as provenance (data audit §4); the generator that produced `WORLD` is not in the repository | add a one-line comment naming the source (Natural Earth 110m via the D3 graph gallery, Robinson, `PROJ`) and, if it still exists, check the generator in as `tools/world_paths.py` |
| `data/contact.jpg`, `data/contact2.jpg`, `data/nga_subset_raw.json` (1.4 MB), `data/nga_dl.log` (0 bytes), `__pycache__/` | referenced by nothing | delete or move to the scratch area; add `__pycache__/` and `build/*.html` to a `.gitignore` if the tree is ever put under git |
| `build/files_map.json`, `build/files_new.json` | the `files` maps of two image publishes (178 + 54 paths); `rem-aristotle` is in neither although it is published on the artifact | keep one complete map (`build/files_images.json`, 234 paths) as the record and reference it from REFRESH.md §4 |

### C3. Naming inconsistencies across the data files

Titles are keys and deep links, so renaming fields is not proposed; a glossary comment at the top of each data file is. The traps:

| Concept | Spellings in use |
|---|---|
| verification flag | `vf` everywhere except `ATLAS` and `JOURNEYS` (`v`), `RECORDS2[5]`, and the third element of a `SERIES` row |
| picture | `img` on collections; `i` in `REEL`, `LOTIMG`, `UPIMG`, `HOUSEIMG`; a bare id in `STORYIMG`, `SIGIMG` |
| sources | `sources` (HOUSES, as URLs), `src` (PLAYERS, COLLECTORS as URLs; ATLAS, HUBS, SEGMENTS, INSTITUTIONS, STORIES, JOURNEYS as `[label,url]` pairs; VITALS, SYMPTOMS as `PULSE_SRC` keys; UPCOMING as one URL), `s` (SIGNALS, EVIDENCE as pairs), `u` (NEWS, CALENDAR, DISPATCHES, REPORTS), `url` (PEOPLE) |
| title | `title` (lots), `t` (ATLAS, STORIES, SYMPTOMS, JOURNEYS, PROV_CASES), `n` (HUBS, SEGMENTS, STATIONS, CALENDAR, FAIRS, INSTITUTIONS, REPORTS, PEOPLE), `name` (HOUSES, PLAYERS, COLLECTORS), `l` (VITALS, EVIDENCE), `h` (NEWS, DISPATCHES, FEES) |
| `c` | country (HUBS, INSTITUTIONS), category (CALENDAR), "what to check" (ATLAS), collection (IMG), classification (NGA), city (PEOPLE uses `city`) |
| dates | `date` (lots, UPCOMING), `d`/`e` (CALENDAR, FAIRS), `d` ISO (DISPATCHES) but `d` free text (NEWS: `'2 Oct'`), `y` year number (LONGVIEW, NGA string), `year` string (lots) or number (ATLAS) |
| id of a jurisdiction | `REGIMES.j`, referenced as `LENS_REGIONS.reg` and as `jur`/`dest` in the clinic |

`srcList()` (app.js 113) accepts both URL strings and `[label,url]` pairs, which is why the mix survives; a new engineer reading `VITALS.src` as URLs will crash `PS()`.

### C4. Engine literals that are really data

| Where | Literal | Proposed home |
|---|---|---|
| `src/pulse.js:17` | `flowForHub`'s hub → sale-room map (31 keys) and venue → destination map; a new hub silently falls back to New York (lint INFO) | `HUBS[].room` (a VENUES key) and `VENUES[].homeDest` |
| `src/under.js:115` | `flowForLot`'s city → venue map and the dead-artist regex (B6) | `VENUES[].cities`; `RESULTS[].arr` |
| `src/app.js:33` | `orgName` fallbacks | `ORG_ALIASES` in `data_people.js` |
| `src/app.js:173–174` | the Floor's vital teaser ids `['top','bottom','guar','imp']` and undercurrent teaser ids `['kandinsky','nahmad','guaranteed78','usaml']` | `FLOOR = {vitals:[…], under:[…]}` in `data_market.js`, next to the hero (B3) |
| `src/app.js:431` | the palette's section display names, parallel to `VIEWS` by index | a `VIEW_NAMES` map keyed by view id, or read each view's `aria-label` from `page.html` |
| `src/clinic.js:3, 13` | `STRICT_EXPORT`, `NO_AML` jurisdiction sets; `segmentGuess`'s artist regex | `REGIMES[].strictExport`, `REGIMES[].dealerAml` (booleans the lint can require); `SEGMENTS[].artists` |
| `src/atlas.js:6` | `LABEL_OFF` per hub | `HUBS[].lab:[dx,dy,anchor]` |
| `src/app.js:46`, `data_market.js:327` | `DEALER_KEYS` parallel to `DEALERS` by index | a third column on `DEALERS` |
| `src/pulse.js:27` | the drawer chart unit: `%` for `s==='us'`, `bn` otherwise | `SERIES` metadata `{unit}` or `VITALS[].unit` |

### C5. `initCaps` awaits the four capabilities in series — `src/app.js:399–403`

Each `claude.use()` resolves to `null` after 10 s when the viewer does not answer, so a host that serves none makes the Desk and the Salon wait up to 40 s with "Loading the board." Patch:
```js
-try{sampleRef=await window.claude.use('sample');…}catch(e){} try{dlRef=await window.claude.use('downloads');}catch(e){} try{dbRef=await window.claude.use('db');}catch(e){} try{userRef=await window.claude.use('user');if(userRef)myId=await userRef.id();}catch(e){}
+const use=n=>window.claude.use(n).catch(()=>null);[sampleRef,dlRef,dbRef,userRef]=await Promise.all(['sample','downloads','db','user'].map(use));try{if(userRef)myId=await userRef.id();}catch(e){}if(sampleRef&&$('#cRefine'))$('#cRefine').hidden=false;
```

### C6. Small redundancies

- `renderUndertow` (under.js 111) renders the ring and binds it, then `selectStation(stationSel)` renders and binds it again.
- `bindTips` has no per-element guard; `renderUndertow` calls `bindTips($('.cases',el))` (112) and then `bindTips(el)` (113), so every case row gets two tooltip handlers. Give `bindTips` the same `__t` guard the other binders have.
- `openProv` (app.js 321) binds `closeDrawer` on `[data-artist]` after `openDrawer` already bound `openArtist`, whose `detail()` closes the drawer itself.
- `card()` in reel.js mutates `REEL` entries (`c.i`, `c.pre`); `kpi` is the only kind without an `if(!x)return ''` guard (it relies on `safeCard`'s try/catch).
- `boardBuild` fixes the number of split-flap cells from `window.innerWidth` at render time; the board is not rebuilt on resize (the treemap is).
- `drawDir`'s search is `JSON.stringify(x).includes(q)`: typing "http" or "2025" matches almost every organisation through URLs and facts.

### C7. `REFRESH.md` is behind the tree in small ways — lines 29–31

"`npm i jsdom` once" predates `package.json` (jsdom + axe-core): `npm install`. The build/test paragraph does not name `tools/lint_data.js` or `tools/audit_runtime.js` (A1). `audit_runtime.js` needs Chromium at `/opt/google/chrome/chrome` (`CHROME=…`) and Playwright resolvable from Node; neither is in `package.json`, so a fresh session needs the note. The data map (§2) does not mention `REEL`'s `SIGIMG`, the `IMG` registry, `HERO`-like prose (B3) or the engine constants that behave like data (C4).

### C8. Forward references and load-order dependencies that nothing documents

None of these is a defect today; each is a trap for the next edit, and only loading the page reveals a slip (`tools/globals.py` shows the cross-file edges but cannot tell top-level use from use inside a function).

- **Top-level statements of the app IIFE that run at load** and reach across files: app.js 30–48 (data assembly) read `RESULTS`, `RESULTS_MORE`, `PRIVATE_TREATY`, `PRIVATE_MORE`, `STORIES`, `STORIES_MORE`, `PEOPLE`, `PROV_CASES`, `CHAINS`, `HOUSES`, `PLAYERS`, `NGA`, `IMG`; `const tip=$('#tip')` (app.js 114) needs the markup to exist, so the `<script>` must stay at the end of `<body>`; `const LENS=Object.assign(…, store.get('lens',{}))` (pulse.js 2) and `FLOW`, `PRESETS`, `REGION_BOX`, `LABEL_OFF`, `CLINIC_FLAGS` run where the engines are pasted (app.js 424–427), so they may use anything declared above line 424 (`store`, `$`, `esc`) and nothing below it; `const RENDER` (462) and `window.__S` (463) reference `renderPulse`, `renderAtlas`, `renderUndertow`, `flowModel`, `FLOW`, `fmtUSD`, `openAtlas`, `openSymptom`, `openHub`, `openSegment`, `miniWorld`, `SCHED`, `premium` — all declared earlier (function declarations hoist; the `const`s are above). Moving the four placeholders below line 462, or `SCHED` (286) below `window.__S`, throws a `ReferenceError` (temporal dead zone) at load and blanks the page.
- **Safe forward references inside functions** (fine, but surprising on first reading): `orgName` (33) uses `byId` declared at 37; `openLot` (265) uses `SCHED`/`premium` declared at 286–287; `journeyCard` (under.js 63) uses `lotByT` declared at 66; `renderFloor` uses `lensBar`, `forYou`, `vitalTile`, `stName` from engines pasted 250 lines later; the Reel's `card()` uses `R.*` members that exist because app.js has finished evaluating.
- **Across the page**: `reel.js` reads `window.__S` at its own top level (line 6), so the `/*__REEL__*/` placeholder must stay after `/*__APP__*/`; the data files must stay before both; `data_pulse.js`'s `PS` is the only data-file closure over another data constant (same file).

Patch: a comment block at app.js 424 ("engines are pasted here; anything they run at load may use only what is declared above this line; `RENDER` and `__S` below depend on them") and one at page.html 86–88 stating the order, or — better — a check in `tools/globals.py` that lists, per file, the names referenced at *top level* (depth = base) that are declared in a file evaluated later. The tokenizer already knows each token's depth, so this is a small addition.

### C9. `page.html` still carries the shell defects that `fixShell()` repairs at runtime — `src/page.html:31–33, 58–61`

The runtime audit's §9 patch (a `<div>` for the drawer, `title` instead of `aria-label` on the two chips, `aria-controls`/`aria-expanded` on the menu button) has not been applied; `fixShell()` papers over it on every load. Apply the patch and `fixShell()` can shrink to the `lang` attribute.

---

## D. Housekeeping and documentation

- `src/reel.js:6` — stale bridge comment (C2).
- `tools/audit_runtime.js:22` — the Chromium path and the Playwright resolution are environment facts; say so in REFRESH.md (C7).
- `images_manifest.py` — the URLs point at files in third parties' GitHub repositories (`raw.githubusercontent.com/<owner>/<repo>/…`); they are only needed to *add* pictures (the JPEGs are in `build/img` and published), but a dead URL will make `fetch_images.py` rewrite `images_meta.json` without that entry. Patch: make `fetch_images.py` merge into the existing JSON instead of rewriting it, and fail loudly when a previously present id goes missing.
- `data/images_meta.json` `src` records `owner/repo`, not the URL; the manifest is the only place the URL survives.
- `src/app.js:357, 380` — `DEFAULT_BIO` and the signature "Mikhail Tikhomirov / George Washington University" are the owner's; the bio is editable in the page (stored as `subhasta.bio`), the signature is not. Fine for a personal tool; a `SIGNATURE` next to `DEFAULT_BIO` would make it one edit.

---

## E. The one fix made here — `tools/globals.py`

`analyse()` computed the end-of-file brace depth as `toks[-1].depth + (1 if toks[-1].text == '}' else 0)` from a second scan of every file. The scanner stores the depth *before* a `{` token but *after* a `}` token (it decrements first, then emits), so a file whose last token is `}` was reported as unbalanced ("Scanner warning: brace depth did not return to zero") while a file missing its final `}` — last token `{` or an identifier at depth 0 before the gap — passed silently. The depth is now `count('{') − count('}')` over the emitted code tokens (template-literal `${…}` braces are masked and never emitted), computed once in the first pass; `balanced` and `end_depth` share it and the second scan is gone. Verified with three synthetic files (balanced ending in `}`: no warning; missing `}`: warning; braces inside a `${…}` expression: no warning); the project report is byte-identical to before the fix.

---

## Top five, if only five things get done

1. Publish `tools/`, `data/nga_ids.txt` and `package.json` with the source, and make the refresh run the lint (A1); publish the source after every editing session (A2).
2. `test.js` exits non-zero on errors (A3); `build.py` guards its counts, placeholders and `</script` (A5).
3. One `VERIFIED` date (A4) and data-derived counts and tiles (B1, B3); correct the lens copy (B2).
4. Move the resale-royalty and destination-VAT facts into the data (B5, B6) and the hub→room map onto `HUBS` (C4).
5. Restore the hash when a deep-linkable drawer closes (B7) and parallelise `initCaps` (C5).
