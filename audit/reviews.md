# Subhasta — the October 2026 reviews

Three reviews kept for the record, in one file since v24 (the artifact holds at most 511 files): the architecture review, the data-integrity audit and the runtime audit. Each kept its own headings.

---

<!-- formerly audit/architecture_review.md -->
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


---

<!-- formerly audit/data_integrity.md -->
# Subhasta — data-layer integrity audit

Date: 5 October 2026. Scope: the nine data files `src/data_*.js` as consumed by `src/app.js`, `reel.js`, `under.js`, `pulse.js`, `atlas.js`, `clinic.js`, plus the image registry `data/images_meta.json` and the files in `build/img` and `build/img/t`. Tool: `tools/lint_data.js` (new; Node core modules only; ~0.2 s).

Result: **3 ERRORs found, 3 fixed** (two data items changed, in two files). **33 WARN** and **71 INFO** findings are reported for later, with reasoning below. `node tools/lint_data.js` exits 0; `python3 build.py && node test.js` ends with `errors: none`.

| | before | after |
|---|---|---|
| ERROR | 3 | 0 |
| WARN | 33 | 33 |
| INFO | 70 | 71 (the Rembrandt freed by the duplicate-key fix is now an orphan image) |

---

## 1. What the lint checks

How it loads: the nine files are evaluated in build order in a `vm` sandbox with no `window`/`document`, with `/*__IMGMETA__*/{}` replaced by `data/images_meta.json` exactly as `build.py` does. Engine constants the data must agree with (VIEWS, PGROUPS, TYPE_ORDER, THEMES, the Reel kinds, SCHED, TODAY, the orgName fallbacks, the flow-model FX map, the flowForHub maps, REGION_BOX, DEALER_KEYS) are read out of the engine sources by regex, so the lint follows the engines when they change. One line per rule:

**ERROR**
- `purity` — a data file that throws (SyntaxError, ReferenceError such as `document`), or declares a top-level name a second time across files.
- `unique ids` — duplicate `id` in HOUSES, PLAYERS, COLLECTORS, ATLAS, STATIONS, JOURNEYS, VITALS, SYMPTOMS, HUBS, SEGMENTS, INSTITUTIONS; an id shared by a house and a player (app.js merges both into ALL); a story id repeated across STORIES/STORIES_MORE; a REGIMES `j` repeated; a lot title repeated across RESULTS/RESULTS_MORE (titles key LOTIMG, CHAINS, the Reel, lotByTitle); two lots producing the same generated `#lot-…` id; an UPCOMING title, a SIGNALS title or a private-treaty `work` repeated; a duplicate key inside any object literal, found by scanning the source text (JavaScript silently keeps the last value, so evaluation cannot see it) — this is what caught STORYIMG.
- `images` — every image id in LOTIMG, UPIMG, STORYIMG, HOUSEIMG, SIGIMG, REEL, STATIONS, ATLAS, JOURNEYS, VITALS, SYMPTOMS, LONGVIEW, HUBS, SEGMENTS and every `data-lb`/`img/…jpg` literal in the engines must exist in IMG and as `build/img/<id>.jpg` and `build/img/t/<id>.jpg`; every IMG entry needs `a, t, y, c, fp, avg`; an IMG entry whose file is missing is an ERROR when referenced (WARN when not).
- `REEL[].ref` — by kind: lot/path → lot title; up → UPCOMING title; story → story id; signal → SIGNALS title; treaty → PRIVATE_TREATY/PRIVATE_MORE work; kpi → EVIDENCE key (the Reel reads `R.EVIDENCE[ref]`, not MARKET — MARKET.global mirrors it); under → ATLAS id; journey → JOURNEYS id; symptom → SYMPTOMS id; hub → HUBS id; segment → SEGMENTS id; a kind not in reel.js `DUR`; a ref-bearing kind without a ref.
- `LOTIMG keys → lot titles`, `UPIMG keys → UPCOMING titles`, `STORYIMG keys → story ids`, `HOUSEIMG keys → HOUSES ids`, `SIGIMG keys → SIGNALS titles`.
- `RESULTS[].house`, `RESULTS_MORE[].house`, `UPCOMING[].house → HOUSES ids`; `RESULTS[].cat → CATS`; `HOUSES/PLAYERS[].type → TYPES`.
- `PEOPLE[].org → HOUSES/PLAYERS ids` (or one of the three orgName fallbacks app.js defines: sfs, ppw, npap); `PEOPLE[].g → PGROUPS`; `ROUTES[].org → HOUSES ids`; `TIMELINES keys → HOUSES ids`.
- `CHAINS keys → lot titles`; `STORIES[].players → HOUSES/PLAYERS/COLLECTORS ids`; `JOURNEYS[].lot → lot titles`; `JOURNEYS` station references (`st` on a journey or a step) → STATIONS ids (none in the data today; future-proof).
- `ATLAS[].st → STATIONS ids` (or a THEMES key: tax, logistics, data); `ATLAS[].story → story ids`; `CHECKS[][1] → ATLAS ids`.
- `VITALS[].src`, `SYMPTOMS[].src → PULSE_SRC keys`; `VITALS[].s → SERIES keys`; `SYMPTOMS[].link` → `[kind, id]` with kind go→VIEWS, under→ATLAS, story→STORIES, hub→HUBS, segment→SEGMENTS.
- `HUBS[].r → REGIONS`; `SEGMENTS[].g → SEGGROUPS`; `FAIRS[].hub`, `INSTITUTIONS[].hub → HUBS ids`; `LENS_REGIONS[].hubs/segs/reg` → HUBS/SEGMENTS/REGIMES.j; LENS_REGIONS keys ↔ REGIONS keys both ways; `COUNTRY_SHARE names → WORLD[].n`.
- flow model: VENUES keys ⊆ the FX map in `flowModel`; the FX keys it reads exist in FX; every venue/dest/house key hard-coded in FLOW, PRESETS, flowForHub, flowForLot and the Reel money card exists; `VENUES.arrCap` numeric where `arr` is true; `DESTS.nyc.useTax` numeric.
- engine → data: every `data-under`, `data-symptom`, `data-story`, `data-hub`, `data-segment`, `data-ev`, `data-vital`, `data-go` literal, the clinic's CLINIC_FLAGS and note ids, its REGIMES jurisdiction sets and segment ids, the drawFlow ledger's atlas ids, the Floor's vital/atlas teaser lists, the default station and lens, and SCHED's house keys must resolve; `DEALERS.length === DEALER_KEYS.length`.
- `schema` — per collection, the fields an engine dereferences unguarded (type-checked: string / number / array / non-empty array / object), plus deeper shapes: `[year, value]` series, `[name, title]` leadership, `[when, who, price?]` chain steps, `[label, url]` pairs where srcList/SIGNALS/JOURNEYS print them, HUBS regime fields and on-map x/y, ATLAS case years, REPORTS months, MARKET/SERIES chart rows, SERIES.shares summing ≤ 100, `vf`-style enums, fixed-width rows for RECORDS, RECORDS2, GLOSSARY, ANATOMY, FEEDS, APIS, CHECKS, DEALERS, INST_FACTS.
- `verification flags` — `vf` (VITALS, SYMPTOMS, LONGVIEW, HUBS, SEGMENTS, INSTITUTIONS, REGIMES, DISPATCHES), `v` (ATLAS, JOURNEYS), RECORDS2[5] and the SERIES point flags must be V, S or U.
- `dates` — `date` (RESULTS, RESULTS_MORE, UPCOMING), `d` (DISPATCHES), `d`/`e` (CALENDAR, FAIRS) must be real ISO calendar dates; an end before its start is an ERROR.
- `source URLs` — every URL field (HOUSES web/links/sources, PLAYERS web/src, COLLECTORS, STORIES, ATLAS, JOURNEYS, HUBS, SEGMENTS, INSTITUTIONS, UPCOMING, SIGNALS, EVIDENCE, NEWS, CALENDAR, DISPATCHES, REPORTS, FEEDS, APIS, INST_FACTS, PULSE_SRC, MARKET.sources, PEOPLE.url, ROUTES http items) must be an `http(s)://` URL with a real host; any string anywhere that looks like a mistyped URL.
- `string debris` — `undefined`, `NaN`, `[object Object]`, `TODO`, `XXX`, `??`, a textual `null`, or a stray `${…}` other than the build-time count tokens, inside any data string.

**WARN**
- `apostrophes` — a straight apostrophe escaped as `\'`, or a double-quoted string carrying a straight `'` (the `wiki` field is exempt: Wikipedia titles need it).
- `verification flags` — an item with no flag while most siblings have one.
- `coverage` — no `src`/`u` while most siblings have one; a hub (within its region), segment (within its group) or symptom with no image while at least half its neighbours have one; institutions are skipped because the engine renders no institution image.
- `images` — an empty image id (a dead entry); an IMG entry whose file is missing but which nothing references.
- `captions` — a LOTIMG/UPIMG entry marked `x` whose caption does not say "itself", or not marked `x` whose caption does not begin "Related:"/"Illustration:".
- `dates` — a result dated after TODAY, an upcoming lot dated before it, a range whose end equals its start (renders "22–22 Oct").
- `schema` — soft slips: a house with neither y25 nor y24, an unknown `dir`/access word, a treaty price with no digit, an unknown presence key.
- `money formatting` — the styles in use are counted; the minority forms (word units, long-form sums, spaces before units, capital units, USD prefixes, tildes) are listed with examples. Reported, never fixed.
- `whitespace`, `order` — leading/trailing/double spaces; LONGVIEW out of chronological order.

**INFO**
- `orphans` — IMG ids referenced by no data and no engine (they remain reachable through an artist page's gallery, `imgsFor`); collections no engine or other data file reads; MARKET keys never read; PULSE_SRC keys cited by no vital or symptom; SERIES keys plotted nowhere; EVIDENCE keys no KPI/bar/Reel card opens; stations with no ATLAS entry; symptoms with neither link nor Reel card; PROV_CASES whose title matches no lot or whose chain is shadowed by CHAINS; houses with no TIMELINES entry; hubs missing from flowForHub's map; files in build/img without an IMG entry.

Adding a rule: append an object to `REFS` (name, severity, an `items` getter returning `{v, where}`, a `target` Set, a target label) — see the header comment of `tools/lint_data.js`. New image fields go in `IMAGE_SITES`; new engine-read fields in `SCHEMA`.

---

## 2. ERRORs found and how they were fixed

### E1–E2 · `COUNTRY_SHARE` names that are not on the map — `src/data_atlas.js`

`atlas.js` shades each `WORLD` polygon by `COUNTRY_SHARE[c.n]`. The map is Natural Earth 110m (176 polygons) and has no polygon for Singapore or Monaco, so these two keys could never shade anything.

| item | before | after |
|---|---|---|
| `COUNTRY_SHARE['Singapore']` | `'Singapore':0.4` | key removed |
| `COUNTRY_SHARE['Monaco']` | `'Monaco':0.2` | key removed |

The figures are preserved in the comment above the object ("Microstates with no polygon on that map are left out… Singapore ≈0.4 and Monaco ≈0.2 — restore them if the map gains markers for them"). No other figure, name or date changed; the comment also states the rule (keys must match a `WORLD` name) for the next editor. The Singapore hub still carries its own text and dot.

### E3 · duplicate key `guarantees` in `STORYIMG` — `src/data_reel.js` line 41

The object literal declared `guarantees` twice: `guarantees:'modi-nu-gauche'` early in the object and `guarantees:'rem-storm'` at the end. JavaScript keeps the last one, so the Salon showed Rembrandt's *The Storm on the Sea of Galilee* (stolen from the Gardner in 1990) on "Guarantees: the house's own bet" — a picture with no relation to the story. The Modigliani *Nu couché (sur le côté gauche)* is the canonical guarantee case (guaranteed, sold to its guarantor on one bid in 2018) and is the image the Reel already uses for the `guaranteed78` undercurrent.

| item | before | after |
|---|---|---|
| `STORYIMG.guarantees` | `…,duel:'delacroix-liberty',guarantees:'rem-storm'}` (duplicate; `rem-storm` won) | `…,duel:'delacroix-liberty'}` — the earlier `guarantees:'modi-nu-gauche'` stands |

The story's figure caption is generated from IMG (credit line) and no LOTIMG-style caption is involved, so nothing editorial changed. `rem-storm` is now an unreferenced image (INFO).

### Not errors after all (lint false positives fixed in the tool, not in data)
The first draft of the lint flagged `house:'all'` (hammer filter state) and `?r.house:'other'` (treemap colour class) as house ids; the engine-literal scan is now restricted to flow-model object literals in under.js, pulse.js and reel.js.

---

## 3. WARN findings (33) and whether to act

**images (2)** — `LOTIMG['Untitled']` has `i:''`; `STORYIMG.knoedler` is `''`. Both are harmless dead entries (every consumer checks `m.i && IMG[m.i]`). Worth acting on later: either delete the two entries or give the Knoedler story an image that honestly fits (no public-domain picture of the forged Rothkos exists; the Knoedler building or a period dealer portrait would need to be added to the registry).

**apostrophes (3)** — `HOUSES.name` for Sotheby's, Christie's and Freeman's uses a straight `'` inside double quotes, while the rest of the data (FEES, GLOSSARY, captions) writes Sotheby’s with ’. Visible wherever `houseName()` prints (board, tables, Reel meta). Low risk to change, but note the directory search (`JSON.stringify(x).includes(q)`) is literal: a user typing `sotheby's` would stop matching the name if it became ’ (it would still match other fields). Decide once, globally. The `wiki` fields correctly keep the straight apostrophe.

**schema (4)** — Dorotheum, Koller, Doyle, Swann publish no annual sales; the directory shows "n/d" by design. No action; the WARN exists so a *new* house without figures is noticed.

**dates (2)** — `FAIRS[3]` Sotheby's Paris Monet Iris (`d`=`e`=2026-10-22) and `FAIRS[15]` Sotheby's London Turner (`d`=`e`=2026-12-09) render as "22–22 Oct" / "9–9 Dec" in the Atlas year-ahead and the lens strip. Worth fixing later by dropping `e` on single-day entries (the engine reads `f.e||f.d`); left alone because the dates themselves are correct and the fix is cosmetic.

**coverage (20)**
- 9 hubs with an empty `src` (shanghai, tokyo, singapore, taipei, dubai, doha, miami, madrid, maastricht): the drawer simply omits the Sources block. The colophon promises that "every dossier… links its sources", so these are worth filling — editorial work, not structural.
- 3 CALENDAR entries without `u`: the three "expected, not announced" sale weeks. Correct as is (nothing to link yet); the `exp` flag already labels them.
- images: Milan is the only EU hub without a picture (5/6 have one); PWC and Ultra-contemporary are the only fine-art segments without one (3/5); five symptoms of sixteen (luxury, online, wealth, rates, india) have none. Informational: pictures must be public-domain works that honestly illustrate the item, and a luxury/online/rates symptom has no obvious candidate. India could take a public-domain Indian painting if one is added to the registry.

**money formatting (2)** — 1,074 figures use the house style (`$1.3m`, `$59.6bn`, `$150k`); 180 are £/€ in the same style. Minority forms: four exact court sums written long-form in ATLAS case texts (`$86,672,790` Philbrick; `$9,147,789` and `$6,408,538` Schiff; `$3,097,160` Boone) and one `$30 million` in ATLAS[kandinsky]. The long-form sums are deliberate (indictment and judgment figures quoted to the dollar) and should stay; `$30 million` could become `$30m` for consistency. Reported only.

---

## 4. INFO findings (71) and whether to act

**Orphan images (51 of 117 IMG entries)** — vg-crows, vg-roulin, vg-starry, vg-self, vg-sunflowers, vg-bedroom, vg-reaper, monet-parasol, cez-madame, seurat-bathers, gauguin-arearea, gauguin-siesta, pic-stein, pic-lavie, pic-guitarist, degas-class, caillebotte-floor, manet-bar, morisot-bougival, lautrec-rouge, leo-ermine, rem-storm, rem-tulp, bott-venus, bott-venusmars, bott-primavera, raph-athens, ver-delft, ver-milkmaid, car-emmaus, car-narcissus, car-medusa, car-david, goya-saturn, goya-may, bruegel-icarus, gericault-raft, repin-haulers, kramskoi-unknown, constable-haywain, elgreco-toledo, millais-ophelia, matisse-hat, leger-contrast, hokusai-cranes, monet-stacks, vg-sansbarbe, schiele-maiden, schiele-family, schiele-stadt, canaletto-rialto. None is dead weight: `openArtist()` shows every registry image by that artist in the "In the public domain" gallery, which is why `test.js` finds a Klimt gallery. They are a pool for future cards (e.g. `schiele-*` for a Vienna 1900 card, `canaletto-rialto` for the Bucintoro lot, `monet-stacks` for Meules à Giverny, `vg-sansbarbe` for the Van Gogh self-portrait record). Keep; pick from here before adding new files.

**Unused collections/keys (6)** — `HUBS_OLD` (data_market.js) is superseded by `HUBS` in data_atlas.js and read by nothing: a candidate for deletion once confirmed; `PROJ` (data_world.js) holds the Robinson projection constants used when the map was generated — keep as provenance of the geometry; `MARKET.verified`, `.segments`, `.christiesCats`, `.sources` are not rendered. `MARKET.sources` is the kind of thing the Floor should link (the KPIs link EVIDENCE instead); `christiesCats` is a ready-made chart nobody draws.

**PULSE_SRC keys cited nowhere (10)** — tan25, artnet, midyear, kf, abhk, museums, apollo, women, wiki, frieze. Harmless (PS() is only called for cited keys). `museums` ought to be cited by the museum-visitors chart note and `women` by the "Women Surrealists" symptom if sourcing is tightened later.

**SERIES plotted nowhere (2)** — `dealer`, `nft`. Candidates for a vital sign or deletion.

**Coverage note (1)** — INSTITUTIONS carry no `img` and the engine renders none; nothing to check.

**Money styles (1)** — the tally behind the two WARNs above.

---

## 5. Editorial questions (not touched)

1. `LOTIMG['Verger avec cyprès']` caption says "the same Saint-Rémy cypresses", but the lot itself is dated 1888 (Arles); Van Gogh reached Saint-Rémy in May 1889. Should the caption say "the cypresses he painted again at Saint-Rémy the next year"?
2. `LOTIMG['Petite danseuse de quatorze ans']` caption calls *L'Étoile* "the dancer Degas painted while modelling the Little Dancer". The Little Dancer's model was Marie van Goethem; *L'Étoile*'s star is not usually identified as her. Confirm or soften to "Degas's dancers of the same years".
3. `HOUSEIMG.dorotheum`: "Klimt's The Kiss hangs a kilometre away at the Belvedere" — Dorotheergasse to the Belvedere is nearer two kilometres.
4. `UPCOMING` title `'Keep Ou T'` (Phillips London, 15 Oct 2026, the Banksy rat): is the spacing the work's actual title, or a typo for "Keep Out"?
5. `COUNTRY_SHARE`: Singapore (≈0.4%) and Monaco (≈0.2%) now live only in a comment. If the map should show them, the engine needs point markers for microstates (an engine change); otherwise the comment can be dropped.
6. `STORYIMG.knoedler` is empty and `rem-storm` (Rembrandt, *Storm on the Sea of Galilee*, stolen 1990) is now unused. Was the Rembrandt meant for a theft/restitution story that does not exist yet?
7. Three "expected, not announced" CALENDAR entries have no link by design; confirm that the `exp` label is enough.

---

## 6. Final command outputs

```
$ node tools/lint_data.js --quiet ; echo exit=$?
Summary: ERROR 0 · WARN 33 · INFO 71 · 197 ms
exit=0

$ node -e "new Function(require('fs').readFileSync('src/data_atlas.js','utf8'))" && echo ok
ok
$ node -e "new Function(require('fs').readFileSync('src/data_reel.js','utf8'))" && echo ok
ok

$ python3 build.py && node test.js | tail -1
built 1572 KB; orgs 67 lots 96
errors: none
```

Mutation check of the lint (on a scratch copy, not the project): nine injected defects — a DOM access in a data file, an unknown station in `ATLAS[].st`, a Reel `lot` ref to a non-existent title, a HOUSEIMG id not in IMG, a duplicate HUBS id (with its cascade into FAIRS, INSTITUTIONS and LENS_REGIONS), `vf:'X'`, the date 2026-02-30, a fair ending before it starts, and the word `undefined` in a note — produced 16 ERRORs and exit 1.

Files written: `tools/lint_data.js`, `audit/data_integrity.md`. Files edited: `src/data_atlas.js` (COUNTRY_SHARE and its comment), `src/data_reel.js` (STORYIMG). Nothing under `build/` was touched other than reading it; `build.py`, `test.js`, the engines, `style.css`, `page.html` and `images_meta.json` are unchanged.


---

<!-- formerly audit/runtime_audit.md -->
# Subhasta — runtime audit, 5 October 2026

Scope: the built page (`build/preview.html`, 1.58 MB, data inline) in headless Chromium via Playwright, at 1400×900 and 390×844, dark and light. Engines audited and changed: `src/app.js`, `src/reel.js`, `src/under.js`, `src/pulse.js`, `src/atlas.js`, `src/style.css`. Data files, `page.html`, `build.py` and `test.js` were not touched; proposed patches for them are in §9.

Re-run everything with `node tools/audit_runtime.js` (≈ 2 min, exits 1 on any failure). `node test.js` → `errors: none` throughout.

## 1. Errors

| Context | Before | After |
|---|---|---|
| desktop / dark — 12 views, 14 deep links, Reel, theme toggle | clean | clean |
| desktop / light | clean | clean |
| phone / dark | clean | clean |
| phone / light | clean | clean |

No `pageerror`, no `console.error`, no unhandled rejection in any context (file:// resource noise ignored). There was, however, no global `error` / `unhandledrejection` handler and no isolation between views — see §5e.

## 2. Deep links

Every id was enumerated from the page's own data with the router's slug rules and visited cold (`about:blank` → `file#hash`): 679 links.

| Kind | Ids | Broken |
|---|---|---|
| view | 12 | 0 |
| reel-N | 40 | 0 |
| house- (HOUSES + PLAYERS) | 67 | 0 |
| lot- (`slug(surname-title)`) | 96 | 0 |
| artist- (NGA ∪ RESULTS artists) | 150 | 0 |
| collector- | 24 | 0 |
| story- | 18 | 0 |
| person- (`p<i>-slug`) | 96 | 0 |
| under- (ATLAS) | 60 | 0 |
| station- | 16 | 0 |
| symptom- | 16 | 0 |
| hub- | 31 | 0 |
| segment- | 24 | 0 |
| inst- | 29 | 0 |

No slug collisions (lots, artists, people, orgs, atlas), no dangling image or story-player references. `#nonsense`, `#house-nope`, `#lot-nope`, `#under-nope`, `#station-nope` all fall back to the Floor with `#floor` and no error. Edge case worth knowing: `#reel-0` and `#reel-999` wrap round (to cards 40 and 39) rather than clamping; harmless.

The tool re-checks all ids for collections under 80 and a seeded sample of 40 for lots, artists and people (`--seed N` to change it).

## 3. Keyboard and focus — before → after

| Check | Before | After |
|---|---|---|
| Tab reaches the nav and the first view's controls | yes | yes |
| Enter / Space on nav buttons, map hubs (`#world .hub[tabindex]`), ring stations | yes | yes |
| Enter on `.person` rows (had `tabindex=0`, no key handler) | **nothing happened** | opens the person |
| Treemap tiles (`tabindex=0`, no key handler) | **nothing happened** | open the lot |
| Results/artists table rows, `.lot` rows, stories, collectors, board lines, provenance rows on lot/artist pages | **not focusable at all** | `tabindex=0`, `role=button`, Enter/Space (`keyable()`), visible focus ring |
| Escape closes drawer / palette / lightbox / Reel | yes | yes; with the palette open, Escape now closes only the palette |
| Focus moves into the drawer on open | yes (`#dClose`, after 50 ms) | yes, immediately |
| Focus returns to the opener on close | **no — stayed on the hidden close button** | returns to the opener (hub `<g>`, row, chip…); if the opener is gone, settles on the view's `h1` |
| Focus trapped inside the drawer | **no — escaped to the page after 8 Tabs** | held: page behind is `inert`, plus a Tab trap for browsers without `inert` |
| Palette: Ctrl-K / ⌘K opens with input focused | yes | yes; focus now returns to the opener on close |
| Lightbox focus | stayed on the thumbnail | lightbox takes focus (`tabindex=-1`), returns it on close |
| Reel close returns focus | **no (body)** | returns to the opener (e.g. the Reel nav button); page behind the Reel is `inert` |
| 1–9 switch sections, not while typing | yes | yes (and not with a modifier held) |
| Links inside a drawer that open a page or another view | **drawer stayed open over the new page** (e.g. "Sotheby's dossier" in the upcoming-lot drawer, "Follow the money" in a hub drawer) | `show()` and `detail()` close the drawer first |
| First-visit guide | focusable but not a dialog; no Escape | `role=dialog`, initial focus, Escape, Tab trap, page behind inert |

## 4. Accessibility (axe-core 4.14, `resultTypes:['violations']`)

Contexts: 12 views × 2 themes, three open drawers (hub, symptom, undercurrent), six dossiers, the open Reel (two cards), plus a phone sample (Floor, Atlas, Undertow, hub drawer, Reel).

| Rule | Impact | Before (nodes / contexts) | After |
|---|---|---|---|
| color-contrast | serious | 1,080 / 42 | 0 |
| nested-interactive | serious | 162 / 4 (`.world` svg `role=img` with focusable hubs; ledger rows containing an artist button) | 0 |
| label-content-name-mismatch | serious | 72 / 36 (`#palBtn`, `#themeBtn`), then tiles and the board line during fixing | 0 |
| html-has-lang | serious | 46 / 46 | 0 |
| aria-hidden-focus | serious | 36 / 36 (closed drawer `aria-hidden` with a focusable close button) | 0 |
| aria-command-name | serious | 24 / 2 (unlabeled small treemap tiles) | 0 |
| scrollable-region-focusable | serious | 3 / 2 at phone width (regimes table, Sankey plate) — found by the tool's phone sample | 0 |
| heading-order | moderate | 10 / 6 (h4 after h2) | 0 |
| empty-table-header | minor | 8 / 8 | 0 |
| aria-allowed-role | minor | 6 / 6 (`<aside role="dialog">`) | 0 |

**Contrast.** Every failure was `--ink3` (faint text at 10.5–14 px) and, in the light theme, `--gilt` and `--verd` at small sizes. Minimum nudges, hue and saturation unchanged (HSL lightness only):

| Token | Before | After | Worst common ground | Ratio before → after |
|---|---|---|---|---|
| dark `--ink3` | #857f72 | #979286 (+7.4 % L) | `--paper` #1b2e27 | 3.60 → 4.62 |
| light `--ink3` | #8a877b | #6d6a61 (−10.9 % L) | `--ground` #f2ede2 | 3.08 → 4.63 |
| light `--gilt` | #8e6a14 | #876513 (−1.5 % L) | `--ground` | 4.26 → 4.61 |
| light `--verd` | #2d7a69 | #2c7666 (−1.0 % L) | `--ground` | 4.39 → 4.62 |

Three places sit on darker-than-ground surfaces where even the nudged ink3 falls short, and got a one-step promotion to `--ink2` instead of pushing the token further: the split-flap board's title count and footer (`--flap`), the "Copy link" buttons in drawers (`.btn.copy` on `--paper2`), and the Desk draft placeholder (`--paper2`). Dark `--gilt`, `--claret`, `--lapis`, `--verd`, both `--ink2`s and the Reel's own tokens all already pass.

**Reduced motion.** Already gated before: the Reel's auto-advance (`tick()` checks `matchMedia`), count-ups, the price-path draw, the Ken Burns drift, the split-flap flip, ring turn, ring pulse, ECG dash. Added: the split-flap board no longer auto-advances; a global `@media (prefers-reduced-motion: reduce)` block collapses every remaining transition (Reel card slide/scale, drawer, toast, guide, hover zooms) to an instant change, and `scrollToEl` uses `behavior:'auto'`. Verified in Chromium with `reducedMotion:'reduce'`: Reel card unchanged after 9.5 s, ECG `animation:none` / `stroke-dashoffset:0`, board static.

**Images.** Decorative thumbnails (`.ut`, `.sym`, `.hubc`, `.segc`, `.sst`, `.story .th`, signal floats) already had `alt=""`; figures, gallery, hero, Reel pictures and lightbox carry "artist, title". The world map svg is now `role="group"` with a label and the 176 land paths sit in one `<g aria-hidden="true">`; the ring's picture medal is a labelled button. The Reel's progress segments are `aria-hidden` (prev/next and the counter carry the information).

## 5. Robustness

| Scenario | Before | After |
|---|---|---|
| (a) `localStorage` getter throws | page rendered, guide shown and dismissable, theme toggled; **Undertow checklist ticks did not stick** (re-read from storage on every change) | `store` keeps a memory copy: ticks, lens, pipeline and "seen" hold for the session |
| (b) `window.claude` absent (file://) | calm messages already present: "The board needs the page's store…", "Sign in to post.", "Store: this browser only", CSV falls back to the clipboard | unchanged (verified) |
| (c) images aborted (`**/img/**`) | text stayed readable, but broken-image icons in cards, an empty box in the hero, "Pictured:" credit under a missing picture | capture-phase `error` handler: card thumbnails become the "§" placeholder the cards already use, hero/figure/Reel pictures hide behind their caption or average colour, the Reel credit is hidden |
| (d) very long drawer title | not tested before; a long unbroken word would overflow the sticky header | `overflow-wrap:anywhere` + `text-wrap:balance` on `.dh h2/p`; a 170-character title with a 60-letter word wraps to 4 lines, no overflow, close button in place |
| (e) a view's render throws | **no global handler; `renderView` unprotected** — the exception escaped `route()`/`go()` | `renderView` wraps each render; a failing view shows a one-paragraph notice, the other views render normally; `window.error` + `unhandledrejection` log and show a one-time toast ("Something went wrong — reload the page"). Verified by injecting a throw into `renderSignals`: Signals shows the notice, Hammer (96 rows) and Atlas (31 hubs) fine, second error → no second toast |

The Reel also builds each card in isolation now (`safeCard`): a card whose reference is missing becomes a short placeholder instead of being dropped, which previously would have shifted every later `#reel-N` link by one.

## 6. Performance (desktop 1400×900, dark, median of 3 cold runs)

Boot: `responseEnd` 4 ms → `domInteractive` 372 ms → first paint / first contentful paint 364 ms → DOMContentLoaded 435 ms → load 479 ms. Parsing 1.58 MB of inline HTML+data and evaluating the script dominates; the Floor's own render is 4.7 ms.

First render of each view, measured inside the page (`__S.perf`, synchronous `RENDER[v]()`), and wall time from hash change to the second animation frame (render + style + layout + paint):

| View | render ms | to painted ms |
|---|---|---|
| floor | 4.7 | 82 |
| pulse | 11.9 | 81 |
| atlas | 8.5 (world map 2.8) | 51 |
| houses | 3.9 | 35 |
| people | 2.7 | 31 |
| hammer | 12.3 | 40 |
| signals | 3.0 | 29 |
| ledger | 4.6 | 41 |
| salon | 1.2 | 24 |
| undertow | 15.4 | 70 |
| desk | 2.1 | 28 |
| lexicon | 1.7 | 30 |
| Reel (40 cards) | build 7.5, first card 37 | 87 |

Dossiers: house 17 ms, lot 21 ms, story 8 ms, hub drawer 9 ms. After visiting every view and the Reel: 7–10 MB used JS heap, 12,076 DOM nodes, 2.6 MB serialised DOM.

Nothing approaches the 300 ms threshold, so no optimisation was made. The only real cost is the initial parse of the inline data; if that ever matters, the lever is `data_world.js` (118 KB of path strings) and `NGA` (771 records), not the engines.

## 7. `fspan`

`fspan(d,e)` rendered a single-day sale as "22–22 Oct 2026". It now returns one date when `e === d` (or the days coincide). Two real entries benefit: Sotheby's Paris, Monet's *Iris* (22 Oct 2026) and Sotheby's London, Turner (9 Dec 2026). Ranges are unchanged: "20–22 Oct 2026", "30 Oct – 2 Nov 2026".

## 8. Changes made

`src/app.js`
- `store` — memory-backed fallback when localStorage is absent or throws.
- `toast` — guards a missing `#toast`.
- image `error` listener (capture phase, registered before the first render) — placeholder/removal of failed thumbnails.
- `fspan` — single-day rendering.
- `bindLightbox` / `openLightbox` / `closeLightbox` — opener memory, focus into and out of the lightbox, keyboard activation of non-anchor triggers (ring medal).
- new focus helpers: `isVisible`, `focusEl`, `rememberOpener`, `returnFocus`, `settleFocus`, `trapTab`, `setInert`, `markScrollables`, `keyable`.
- `show` — closes the drawer, syncs `aria-expanded`, marks scrollable regions, settles focus after navigation (not on first load).
- `renderView` — try/catch per view with a readable notice; timing into `__S.perf`.
- `reportError` + `window` `error`/`unhandledrejection` listeners — one-time toast, console log.
- `initNav` — `closeLightbox`, `aria-expanded`/`aria-controls` on the menu button, Tab traps on drawer/palette/lightbox, Escape order (lightbox → Reel → palette → drawer), digits ignored with modifiers.
- `detail` — closes the drawer, syncs menu state, marks scrollables, settles focus.
- `bindLinks` — `keyable()` on every bound element; per-selector bind guard (no double handlers).
- `openDrawer` / `closeDrawer` — opener memory, immediate focus on close button, `inert` on the page behind, `inert` on the closed drawer, focus return.
- `treemap` — `role=button` and `aria-label` (unlabeled tiles) / `aria-description` (labelled tiles).
- `boardBuild` / `boardShow` / `boardInit` — first line is a keyboard-operable button named by a hidden span announcing the current lot; cells `aria-hidden`; no auto-advance under reduced motion or when the tab is hidden.
- `drawLedger` — row title is a real `<button>`; artist button no longer nested in a button role; `#ldeal .dealer` rows: `keyable`, `aria-pressed`.
- `openLot` / `openArtist` — provenance rows keyboard-operable.
- `drawPipeline` — hidden "Remove" header label.
- `renderLexicon`, `renderSalon` — h4 → h3 (heading order).
- `openPalette` / `closePalette` — opener memory and focus return; `palSearch` marks the result list scrollable.
- `firstVisit` — dialog semantics, focus, Escape, trap, inert behind.
- `fixShell` (new, called first in `start`) — `lang="en"` if missing; `#palBtn`/`#themeBtn` named by their visible text (aria-label → title, glyph/kbd hidden); `<aside role="dialog">` swapped for a `<div>`; closed drawer inert.
- `start` — `booted` flag after the first route.

`src/reel.js` — `safeCard` (per-card isolation and placeholder), bar segments `aria-hidden`, `openReel`/`closeReel` opener memory, focus return, `inert` behind, close guard; `perf` on `window.__REEL`; links out of a card do not return focus to the opener so the destination's heading takes it.

`src/under.js` — `scrollToEl` respects reduced motion; ring medal is a labelled button; hidden "Source" header in the money ledger.

`src/pulse.js` — hidden "Verification" header; after applying a lens, focus moves to the re-rendered lens chip.

`src/atlas.js` — world svg `role=group`, land paths in an `aria-hidden` group; `worldmap` timing; month heading h4 → h3; hidden "Verification" header.

`src/style.css` — token nudges (§4); `.board .foot`/`.ttl .n`, `.btn.copy`, `.draft .faint` on ink2; drawer `visibility` toggle with the slide; `.dh h2/p` wrapping; phone chip label visually hidden rather than `display:none`; `.prov .t` as a button; `.line[tabindex]` focus ring; h4 → h3 selectors; reduced-motion safety net; broken-image rules; no outline on focused headings.

`tools/audit_runtime.js` — the re-runnable audit. `package.json` — `axe-core` added as a devDependency by `npm i -D axe-core` as instructed.

## 9. Proposed patches for files not owned here

`src/page.html`
```html
<!-- role=dialog is not permitted on <aside>; the engine swaps the tag at runtime, the template should not need it -->
- <aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="dTitle">
+ <div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="dTitle">
  …
- </aside>
+ </div>
<!-- accessible names must contain the visible text; the engine removes these labels at runtime -->
- <button class="chip" id="palBtn" aria-label="Search everything"><span class="tx">Search</span><span class="ic">⌕</span> <kbd>⌘K</kbd></button>
- <button class="chip" id="themeBtn" aria-label="Switch between light and dark"><span class="tx">Theme</span><span class="ic">◐</span></button>
+ <button class="chip" id="palBtn" title="Search everything (⌘K or Ctrl-K)"><span class="tx">Search</span><span class="ic" aria-hidden="true">⌕</span> <kbd aria-hidden="true">⌘K</kbd></button>
+ <button class="chip" id="themeBtn" title="Switch between light and dark"><span class="tx">Theme</span><span class="ic" aria-hidden="true">◐</span></button>
- <button class="chip menu" id="menuBtn" aria-label="Sections menu">Menu</button>
+ <button class="chip menu" id="menuBtn" aria-label="Sections menu" aria-controls="nav" aria-expanded="false">Menu</button>
```

`build.py` (the preview wrapper; the published artifact's skeleton is the host's)
```python
- '<!doctype html><html><head><meta charset="utf-8">…
+ '<!doctype html><html lang="en"><head><meta charset="utf-8">…
```

`REFRESH.md`, §1 "Build / Test": add `node tools/audit_runtime.js` (needs `npm i -D axe-core` once) after `node test.js`.

`test.js`: no change required; it passes unchanged. Optional: assert `d.documentElement.lang==='en'` and `q('#drawer').tagName==='DIV'` after boot.

## 10. Remaining issues, ranked

1. Chart marks (`rect`/`circle` with `tabindex=0` and `data-tip`) are focusable but have no accessible name; the surrounding svg has `role=img` + label, so axe is silent, but a screen-reader user tabbing through a chart hears nothing per point. Fix: mirror the tooltip text into `aria-label` on each mark (groupedBars, lineArea, stackedShares, pricePath, sankey bands). Moderate effort, no visual change.
2. `#reel-0` / `#reel-999` wrap instead of clamping; clamping in `route()` (`Math.min(Math.max(n,1),REEL.length)`) would be more predictable for shared links.
3. The accessible name of a treemap tile with a visible label is "Klimt $236.4m" with the artist/title/house in `aria-description` (Chromium, Firefox, Safari 16.4+); older assistive tech will hear only the short form.
4. The first paint waits for the whole 1.58 MB document to parse (~360 ms on this machine, longer on phones). Not a render-time problem; only worth attacking by trimming `data_world.js` path precision or deferring `NGA`.
5. Light-theme `--ink2` (#59605a) and the nudged `--ink3` (#6d6a61) are now close in lightness; the hierarchy survives through size and italics, but a designer may want to pull `--ink2` slightly darker (e.g. #50574f, 6.0:1) to restore the step.
6. `.pal .ri` result rows are mouse-only; arrow keys and Enter already drive the palette, so this is a polish item (`role=listbox/option`, `aria-activedescendant`).
7. Table rows show the gilt outline on focus; on the light theme this is strong but legible. A designer may prefer the row-background highlight alone (`.tbl tr.clk:focus-visible td{background:var(--paper2)}`).


---

<!-- the v25 engine audit, 9 November 2026 -->
# Subhasta — the Navigator's engine, audited (9 November 2026)

A fresh agent that had not seen the engine written re-derived every figure `navPlan`, `navExport` and the ledger compute, against the sources the terminal cites and the primary pages it could open (a read-only harness, `scratchpad/v25/harness.js`, drove the arithmetic). Its JSON is `data/research/bundle.json` → `v25.audit_engine`. The working copy changed under it (the preliminary findings were applied as they arrived), so each finding carries a status: **applied** (confirmed in the live files by the harness) or **open** (applied by the owner afterwards, 12 November, where marked in REFRESH step 23 and ARCHITECTURE §16; the rest wait for a refresh that opens the page).

| Severity | Status at the audit | Where | Finding |
|---|---|---|---|
| high | applied | src/nav.js navPlan, the ledger (else-branch): line('impvat') and line('duty'); gate 4 | Any route whose two ends differed charged the destination’s import VAT on the price, including routes between two EU members (fr→de showed ‘Import VAT in German |
| high | applied | src/data_nav.js NAV_RULES.in.exp.needs (and nav.js navHit) | India’s only row was {cat:'any', age:100, value:0, bar:true}; the declared art treasures sat in exp.artists but no row carried artists:true, so a 1935 Amrita Sh |
| high | applied (residual simplification noted) | src/data_nav.js NAV_RULES.kr.imp (was vat_rate 0.10, ‘10% VAT on import (U)’) | The Navigator charged 10% import VAT on a painting entering South Korea; the terminal’s own REGIMES row for Korea (src/data_atlas.js) says the opposite. |
| medium | applied except China | src/data_nav.js NAV_RULES.*.imp.duty_rate (was 0 for all 22 jurisdictions) and nav.js ledger | duty_rate was 0 everywhere while the duty text said 5% (ae, qa, sa), 10% plus surcharge (in), ‘up to 6%’ (cn) and 4% (br); the ledger never showed a duty line a |
| medium | open | src/data_nav.js NAV_RULES.cn.imp (duty ‘reported at up to 6%… a cut to 1% could not be confirmed’; duty_rate 0 | The two tables disagree on China’s duty, and the Navigator charges none. |
| medium | open | src/data_nav.js NAV_RULES.in.imp.vat_rate 0.12 (‘IGST on import: 12% on paintings and sculpture (U)’) versus R | The Navigator charges 12% IGST on a painting entering India. |
| medium | applied | src/nav.js navPlan gate 4 and the ledger, from==='freeport' && navKey(to)==='ch' | A work leaving the Geneva freeport into Switzerland showed ‘The work does not cross a border’ and no VAT line, although the freeport gate said the 8.1% falls du |
| medium | applied | src/nav.js navPlan gate 1, the fundsRu branch (was ‘closed’ for every sanctioning sale-room country) | Money in a Russian bank closed the route with one text for all rooms: the CBR cap ‘on a resident’, Russian banks off SWIFT, ‘EU banks may not hold more than €10 |
| low | applied | src/nav.js navPlan gate 1, the buyerRu branch for navKey(from)==='ch' | A Russia-resident buyer in a Swiss room was told ‘EU Regulation 833/2014, Article 3h, bars…’. |
| low | applied | src/data_nav.js NAV_RULES.it.exp (rows bite on 70 years and €50,000 alone) and nav.js navExport | A 1949 painting by a living artist was told ‘A licence: paintings over 70 years old and €50,000’. |
| low | applied | src/nav.js navPlan: const icg (was age>=200 && V>=€18,000 for any work entering the EU from outside) | The EU importer statement was required for any work over 200 years old and €18,000 entering the EU. |
| medium | applied | src/nav.js navPlan ledger, mode 'consign' | Sending one’s own work abroad to sell charged the destination’s import VAT on the value to the consignor ($50,000 on $1m consigned from New York to London). |
| low | applied | src/nav.js NAV_SANCTIONING (had 'kr') versus NAV_RULES.kr.sanctions (‘art not covered’) | A route from South Korea to Russia was closed with the luxury-goods-ban text while the Korean row said Korea’s measures are export controls on strategic goods. |
| low | applied | src/nav.js navPlan ledger, the model branch (flowModel was always called with imported:false) | An auction purchase in London or Paris was always a non-imported lot. |
| medium | open | src/data_nav.js NAV_MOSCOW.gates[3] (‘Luxury-goods bans’): ‘it is prohibited to export works of art worth £250 | The UK luxury-goods ban on works of art has a £250 threshold (sourced to a Women Art Dealers blog). |
| low | open | src/nav.js navPlan gate 1 (fundsRu text: ‘the central bank caps a resident’s transfers abroad at $1m a month’) | The CBR’s $1m-a-month cap is stated as a current rule without a date; the research dates its last confirmed extension to 1 Oct 2025–31 Mar 2026. |
| low | open | src/app.js SCHED (christies [[2e6,.28],[8e6,.22],[Infinity,.15]] ‘from 1 Sept 2026’; phillips 29/22/15 ‘from 1 | Christie’s and Sotheby’s share the 28/22/15 schedule; Phillips 29/22/15; Bonhams 30/28/25/21/14. |
| low | open (date to add) | src/nav.js gate 7 and the usetax ledger line (‘Washington DC 6%’); DESTS/VENUES unaffected | The District of Columbia use tax is 6%. |
| low | open | src/nav.js navPlan ledger: const vat=(price+duty)*vatRate | Import VAT is charged on the price (plus duty) alone. |
| low | open | src/nav.js navExport (E.tax) and the exptax ledger line for routes from Spain to another EU member | Spain’s export tax is charged on a definitive export to any other country, including France (es→fr, 1880 painting, $1.5m → 30% band, $450,000). |
| low | open | src/nav.js navPlan gate 2: obliged && V>=10000 | The money-laundering gate turns ‘conditional’ at $10,000. |
| low | open | src/data_nav.js NAV_RULES.fr.exp.needs ‘paper’ row (€20,000, prints) used for ‘A drawing or print’ | A drawing from France is tested against the prints threshold (€20,000). |

**Confirmed against sources:** 18 figures (the Sotheby's 28/22/15 schedule; UK Schedule 3A para 21 with no threshold; the UK OGEL thresholds; France's 2021 thresholds; Germany's § 24 KGSG; Italy's €50,000; Spain's bands; EU 2019/880; the apostille status table of 30 June 2026; the CBR limits to 31 March 2026; DC 6% to September 2027; Korea's exemption; China 1% + 13%; India 5%; Phillips 29/22/15; the flowModel arithmetic).

**Still unconfirmed after the audit (13):**
- Christie’s 28% to $2m / 22% / 15% ‘from 1 Sept 2026’ and Bonhams’ five tiers ‘from 1 Oct 2026’ (the trade press confirms changes in September 2026, not the figures); the houses’ own pages were not reachable within the allow-list.
- Whether the Bank of Russia renewed the $1m-a-month cap for April–September 2026 and October 2026–March 2027 (last confirmed to 31 Mar 2026).
- Switzerland’s CHF 300 luxury-goods threshold and the SECO page; the Swiss AMLA CHF 100,000 cash rule (art. 8a) and the KGTG CHF 5,000 due-diligence line (carried from the terminal, not opened).
- The GCC 5% duty on works of art for the UAE, Qatar and Saudi Arabia, Saudi’s 15% VAT, Brazil’s 4% II and 18% ICMS, Mexico’s 16% IVA and 0% duty, Australia’s 10% GST, Japan’s 10% consumption tax, Singapore’s 9% GST, Hong Kong’s zero (all plausible and consistent with memory; not re-opened this sessio
- The EU VAT rates the Navigator carries (France 5.5%, Germany 7%, Italy 5% since 1 Jul 2025 — the brief’s ‘Italy 10%’ is the pre-July-2025 rate —, Netherlands 9%, Spain 10%) and the UK’s effective 5% import VAT and 20% on the premium: carried from the terminal’s own primary citations (BOFiP, BMF, Ass
- The UK Artist’s Resale Right in sterling since 1 Apr 2024 (£1,000 threshold, £12,500 cap, bands at £50,000/£200,000/£350,000/£500,000) and France’s €750 threshold and €12,500 cap: the arithmetic matches Directive 2001/84 and the gov.uk guidance the terminal cites, but gov.uk was not opened this sess
- US EAR Supplement No. 5 to Part 746 ($300 per unit for chapter 97) and EU Regulation 833/2014 Art. 3h (€300) and Art. 5b (€100,000): read by the research on a mirror and on K&L Gates / gesetze.legal; not re-opened.
- New York’s non-resident purchase exemption (Tax Law §1118(2), TSB-A-08(7)S) and the credit for sales tax paid elsewhere; the DC credit rule.
- Mexico’s list of artists declared artistic monuments (the data’s eleven names) and India’s nine declared art treasures beyond the five named in the row.
- Whether Spain levies the export tax on definitive exits to other EU member states in practice (the statute’s text has no EU exemption).
- The Phillips French and Geneva VAT guides behind VENUES.paris (5.5% on hammer plus premium for imported lots) and VENUES.geneva (8.1% on hammer plus premium): cited by the terminal with dates, not re-opened; Christie’s and Sotheby’s Geneva practice may differ (margin-scheme lots taxed on the premium
- The ICG system’s name (EU CSW-CERTEX) and the 90-day licence decision period.
- NAV_FEES (condition report, crate, freight, insurance 0.15–0.45%, broker, installation, legalisation): indicative trade figures from one shipper’s playbook; not re-checked.

Applied on 12 November 2026 from the open list: China's duty at 1% with 13% VAT on the duty-paid value; India's IGST at 5%; the Moscow case's gate 4 without the £250 threshold (and `ATLAS.luxuryban` likewise, with the legislation.gov.uk text in force as the first source); the CBR cap dated; DC's 7% from 1 October 2027 noted; the VAT base noted on the ledger line; Spain's export tax noted as unverified for a move within the Union; the money-laundering gate compared in euros; Korea's note on editions. Christie's and Bonhams's 2026 tiers stay flagged in the Lexicon until read on the houses' own pages; France's paper row keeps the lowest threshold and says so in the gate text's source.
