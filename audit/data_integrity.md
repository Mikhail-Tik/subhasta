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
