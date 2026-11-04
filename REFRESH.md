# Subhasta — refresh runbook

Subhasta is a single-file web app (the art trade's terminal) published as a Claude artifact at
https://claude.ai/artifact/N6Ev8cTukqjpYRNcaGE2EB. Its complete source tree lives inside the artifact as
published files under `src/`: the sources (`src/src/*`), the build and test scripts, the tools, the data
registries, the docs (`README.md`, `ARCHITECTURE.md`), the audits and this runbook. The 117 public-domain
pictures are also published files (`img/<id>.jpg`, `img/t/<id>.jpg`) and are kept across republishes, so a
refresh never needs to re-upload them. The same tree is a git repository on the maintainer's side; the
artifact copy is the one a fresh session can reach, so **every session that edits the tree must republish
the source map (section 4), even when the page itself did not change** — otherwise the next refresh builds
on a stale copy and overwrites the newer work.

## 1. Get the source (fresh session)

Use the Artifact tool, action `read`, with `url` = the artifact URL and `paths` =
```
["src/REFRESH.md","src/README.md","src/ARCHITECTURE.md","src/build.py","src/test.js","src/package.json",
 "src/images_manifest.py","src/fetch_images.py",
 "src/tools/lint_data.js","src/tools/audit_runtime.js","src/tools/globals.py","src/tools/nga_subset.py","src/tools/globe_dots.py","src/tools/benchmarks.py","src/tools/gen_research.py","src/STRATEGY.md",
 "src/audit/reviews.md",
 "src/src/page.html","src/src/style.css","src/src/globe.css","src/src/circle.css","src/src/lab.css","src/src/ask.css","src/src/world.css","src/src/library.css","src/src/app.js","src/src/reel.js","src/src/under.js","src/src/pulse.js","src/src/atlas.js","src/src/clinic.js","src/src/globe.js","src/src/circle.js","src/src/lab.js","src/src/lab_prov.js","src/src/lab_hands.js","src/src/today.js","src/src/move.js","src/src/ask.js","src/src/world.js","src/src/library.js","src/src/compare.js","src/src/nav.js","src/src/season.js","src/src/nav.css",
 "src/src/data_houses.js","src/src/data_market.js","src/src/data_more.js","src/src/data_people.js","src/src/data_reel.js","src/src/data_under.js","src/src/data_pulse.js","src/src/data_atlas.js","src/src/data_world.js","src/src/data_flows.js","src/src/data_globe.js","src/src/data_circle.js","src/src/data_bench.js","src/src/data_movements.js","src/src/data_live.js","src/src/data_places.js","src/src/data_nav.js","src/src/data_events.js","src/src/data_horizon.js",
 "src/data/images_meta.json","src/data/nga_subset.json","src/data/research/v24.json"]
```
The files land in a local folder (the read result says where). Recreate the layout:
```
rostrum/
  build.py  test.js  package.json  images_manifest.py  fetch_images.py  REFRESH.md  README.md  ARCHITECTURE.md
  src/    (page.html, style.css, *.js)
  data/   (images_meta.json, nga_subset.json, nga_ids.txt)
  tools/  (lint_data.js, audit_runtime.js, globals.py, nga_subset.py, shots.js, globe_dots.py, benchmarks.py)
  audit/  (the three audit reports)
  build/  (created by build.py; build/img holds the pictures — fetch them from the artifact only if a check needs them:
           read "img/<id>.jpg" and "img/t/<id>.jpg" for the ids in data/images_meta.json, or run fetch_images.py)
```
i.e. move `src/src/*` to `src/`, `src/data/*` to `data/`, `src/tools/*` to `tools/`, `src/audit/*` to `audit/`, and the
rest to the root.

Before editing anything, read the `## Versions` section at the end of this file: it records which artifact version
carries which source state. If the page's footer counts or the Floor's verification date do not match the latest
entry, the published source is behind the maintainer's tree — stop and report it instead of building on it.

Install and verify: `npm install` (jsdom, axe-core; Playwright resolves from the environment, Chromium is at
`/opt/google/chrome/chrome`), then `npm run check` = `python3 build.py` → `node test.js` (must end `errors: none`, exits
1 otherwise) → `node tools/lint_data.js --quiet` (must end `ERROR 0`) → `python3 tools/globals.py --no-tables` (0 fatal
collisions). Before publishing also run `npm run audit` (`node tools/audit_runtime.js`, ≈2 min, must end `all checks
passed`). Syntax-check any edited file with `node -e "new Function(require('fs').readFileSync('src/FILE.js','utf8'))"`.
`npm run shots` writes desktop and phone screenshots of the main views to `shots/` for a visual check.

## 2. Where the data lives

| What | File | Constant |
|---|---|---|
| Terminal date (filters the calendars) | `src/app.js` | `const TODAY='YYYY-MM-DD'` |
| Today's Read (thesis, tells, what to watch), the sale room (estimates; results with the verdict from the hammer or the house), the desk's status | `src/data_live.js` | `LIVE.read`, `LIVE.sales`, `LIVE.status` (and the db's `live/` documents, written by the live desk, §5) |
| What the research desk has learned (the analyst cites it) | `src/data_live.js` | `KB` (`id`, `q`, `a` in Markdown with `[[ref\|label]]`, `src`, `asof`, `tags`, `kind`; and the db's `kb/`) |
| Art movements | `src/data_movements.js` | `MOVEMENTS` (see ARCHITECTURE §12) |
| The World’s places: cities, the movements’ centres, the artists’ birthplaces, the centre of gravity by era | `src/data_places.js` | `CITY_LL`, `MOVEMENT_LL`, `ARTIST_BORN`, `CENTRES` (ARCHITECTURE §13). A new city in any record needs a `CITY_LL` entry or the lint warns and the World leaves it off the globe; a new movement needs a `MOVEMENT_LL` entry (the lint errors); a new artist with lots should get an `ARTIST_BORN` line |
| The Navigator’s rules (export thresholds, import tax, AML, sanctions, apostille, CITES, freeports; the fees; the Moscow case) | `data/research/v24.json` (keys `law_europe`, `law_world`) → `python3 tools/gen_research.py` → `src/data_nav.js` | `NAV_RULES`, `NAV_EU`, `NAV_FEES`, `NAV_MOSCOW` (ARCHITECTURE §15) |
| The Season’s events (fairs, sales, biennales, shows, openings; the organisers’ ticket pages) and the Horizon’s theses | `data/research/v24.json` (keys `events`, `horizon`; `finance` feeds the Atlas by hand) → `python3 tools/gen_research.py` → `src/data_events.js`, `src/data_horizon.js` | `EVENTS`, `EVENTS_ASOF`; `THESES`, `HORIZON_SIGNALS`, `HORIZON_ASOF` |
| The Library’s pictures: artist, title, year, collection, source file and focal point; the registry the page reads (size, average colour, original size) | `images_manifest.py` → `data/images_meta.json` | `IMAGES` → `IMG` (pasted at `/*__IMGMETA__*/`). To add a picture: append a row to `images_manifest.py` (a photograph of a two-dimensional public-domain work: the painter dead more than 70 years, or the work published before 1930; a raw.githubusercontent.com file), run `python3 fetch_images.py <id>` (1600 px page file, 480 px thumbnail, the registry record), add the painter to `ARTIST_BORN` in `data_places.js` if new (with the city in `CITY_LL`), and publish `img/<id>.jpg` and `img/t/<id>.jpg` with the page (§4). The artifact holds at most 511 files a version, so the library grows by about a hundred pictures at a time. |
| Verification date (the Floor chip and every V-flag tooltip read it) | `src/data_market.js` | `MARKET.verified` (`'D Mon YYYY'`) |
| The Floor's front page (picture, headline, paragraph, buttons) and teaser strips | `src/data_market.js` | `HERO`, `FLOOR` (`vitals` = VITALS ids, `under` = ATLAS ids) |
| KPI tiles 3–4 on the Floor | `src/data_more.js` | `EVIDENCE.bigthree` / `.private` fields `v`, `d`, `chg`, `by` |
| Artists' death years (resale-right rule in Follow the money; every lot artist must be listed) | `src/data_market.js` | `ARTIST_DIED` (year, `null` living, `false` not an artist) |
| Artists' nationality for the resale right (every lot artist whose right may still run: living or dead within 70 years) and the nationalities the right pays | `src/data_market.js` | `ARTIST_NATION` (two-letter code), `ARR_NATIONS` (the UK, the EEA, Australia, New Zealand) |
| Who pays a room's resale right and from what price | `src/data_under.js` | `VENUES[].arrPayer` (`'buyer'` in London and Paris), `VENUES[].arrMin` (£1,000; €750) |
| What the models leave out (the limits register in the Lab, linked from the notes) | `src/data_circle.js` | `LIMITS` (`id`, `area`, `t`, `b`, `at`), `LIMIT_AREAS` |
| Dealers of the Ledger (name, NGA mentions, note, key matched as a whole word in a history's main text, optional `{alt, not}`: other spellings, and longer names that contain the key but are someone else) | `src/data_market.js` | `DEALERS` |
| Names for PEOPLE[].org ids that are not organisations | `src/data_people.js` | `ORG_ALIASES` |
| Vital signs (16 tiles) | `src/data_pulse.js` | `VITALS` (fields l, v, d, dir, read, sub, s, src, vf) |
| Time series | `src/data_pulse.js` | `SERIES` (global, auction, dealer, online, shares, us, bands2025, cats2025, nft, museums) |
| Diagnoses (16 cards) | `src/data_pulse.js` | `SYMPTOMS` (t, read, ev, prog, src, vf, link, img) |
| Chronology | `src/data_pulse.js` | `LONGVIEW` |
| Artist records | `src/data_pulse.js` | `RECORDS2` |
| Dispatches (dated news, newest first) | `src/data_pulse.js` | `DISPATCHES` |
| Source registry for the Pulse | `src/data_pulse.js` | `PULSE_SRC` (key → [label, url]) |
| Hubs, regimes, segments, fairs, lenses, institutions, report calendar | `src/data_atlas.js` | `HUBS`, `REGIMES`, `SEGMENTS`, `FAIRS`, `LENS_REGIONS`, `INSTITUTIONS`, `INST_FACTS`, `REPORTS` |
| Market KPIs, results, records, calendar, news (display date `d` and ISO `dt`), signals, glossary | `src/data_market.js` | `MARKET`, `RESULTS`, `RECORDS`, `CALENDAR`, `NEWS`, `SIGNALS` … |
| More results, chains, collectors, stories, evidence drawers | `src/data_more.js` | `RESULTS_MORE`, `CHAINS`, `COLLECTORS`, `STORIES`, `STORIES_MORE`, `EVIDENCE` |
| People, routes, upcoming trophies | `src/data_people.js` | `PEOPLE`, `ROUTES`, `UPCOMING` |
| Houses and players | `src/data_houses.js` | `HOUSES`, `PLAYERS` |
| Undertow atlas, stations, journeys, flow rules | `src/data_under.js` | `ATLAS`, `STATIONS`, `JOURNEYS`, `VENUES` (`country`, `cities`, `homeDest`, tax fields), `DESTS` (`country`, `impVat`, `useTax`, `s`, `act`, and the flags `bonded`, `insured`, `defer`), `FX` |
| Which sale room a hub opens in Follow the money; the Clinic's regime booleans and export thresholds | `src/data_atlas.js` | `HUBS[].room` (a VENUES key), `REGIMES[].strictExport`, `REGIMES[].dealerAml`, `REGIMES[].expAge` or `.expBefore` (one or neither; default 50 years) |
| Where a room charges import VAT (hammer, or hammer plus premium in place of VAT on the premium), what its own VAT falls on, and what export does to it | `src/data_under.js` | `VENUES[].impVat`, `VENUES[].impVatOn` (`'total'` for Paris), `VENUES[].vatOn` (`'total'` for Geneva), `VENUES[].exp` (the house's export terms, as a phrase) |
| The Reel’s cards | `src/data_reel.js` | `REEL`, image maps `LOTIMG`, `UPIMG`, `STORYIMG`, `HOUSEIMG` |
| Hub city coordinates and momentum (the globe) | `src/data_atlas.js` | `HUBS[].lon`, `.lat`, `.momentum` (−2…+2), `.why` |
| Exchange rates: spot and month-end series; the flow model’s constant | `src/data_flows.js`, `src/data_under.js` | `RATES`, `FXSERIES`; `FX` (US$ per unit, within 1.5% of `1/RATES`) |
| The journeys’ places (the globe’s Journeys mode) | `src/data_flows.js` | `PLACE_LL` |
| Trade in art, corridors, attention (empty until a feed is reachable) | `src/data_flows.js` | `TRADE`, `CORRIDORS`, `COUNTRY_LL`, `ATTENTION`, `FLOW_SRC` |
| The Circle: offer, tiers, why, invitation copy, brief layout | `src/data_circle.js` | `CIRCLE` |
| The globe’s land mask (generated; do not edit) | `src/data_globe.js` | `GLOBE_DOTS`, `GLOBE_COUNTRIES`, `GLOBE_META` — `python3 tools/globe_dots.py` |
| The Lab’s benchmarks: S&P 500 total return and price index, gold, US CPI (generated; do not edit) | `src/data_bench.js` | `BENCH` — `python3 tools/benchmarks.py` |
| The Lab’s measures (returns, round trip, structure, provenance 1933–45, confidence) | computed from the constants above at render | nothing to edit; they move with the data |

Conventions: every figure carries a verification flag — `V` confirmed in a fetched primary/reputable page,
`S` secondary or as-first-published, `U` unconfirmed (shown to readers as such). Prices include buyer’s
premium unless stated. Dates ISO (`2026-11-18`). Apostrophes inside single-quoted JS strings must be the
typographic ’ (never '). Keep British spelling and the house style (short declarative sentences, no hype).

## 3. The monthly refresh (run on the 1st of each month, covering the previous month; first fold in the live desk’s `live/` and `kb/` documents, §5)

Always:
1. Set `TODAY` (app.js) to the run date and `MARKET.verified` (data_market.js) to the date the figures were last
   checked against their sources (the run date, if the run re-checked them).
1b. Re-read the dated prose that lives in the engines and is not derived from data (it does not change by itself):
   the KPI labels and chart subtitles on the Floor (app.js `renderFloor`: "Global art market, 2025", "2019–2025",
   "2025 sales by country"), the Hammer period filter (app.js `renderHammer`: 2026 / 2025 / 2020–2024 …), the fee
   schedule year (app.js: "2026 schedule", "all four major houses raised it in 2026"), the Signals view's framing
   lines (app.js `renderSignals`: "in 2026", "to June 2027", "tested 1 October 2026"), the Pulse chart notes
   (pulse.js: "Price bands, 2025", "Categories, 2025", "Museums, 2025", "The long view, 1744–2026", era chip
   "2008–2026", "Verified against the 2026 reports"), the Atlas ("2025 share of global sales"; the year-ahead line says 2027 dates are as
   announced, with unannounced fairs marked in their own entries), the Clinic year input `max="2026"`, the Reel's report-name card ("Global Art Market Report
   2026") and kpi watermark ("2025"). The Dispatches range, the wire's range, the ECG label, the fairs range and
   the colophon counts are derived from the data and need no edit.
2. `DISPATCHES`: replace with the 10–12 most important dated items of the previous month, by region
   (Asia, Europe, Americas, Middle East, Latin America, Africa), each with URL and flag.
3. `CALENDAR` (data_market.js) and `FAIRS` (data_atlas.js): drop past events, add announced sale weeks
   and fairs for the next 12 months with confirmed dates; `UPCOMING`: replace sold lots with the results
   (add them to `RESULTS_MORE` with price, house, city, date, note, chain if known) and add newly
   announced trophies.
4. `NEWS` (the wire) and `SIGNALS`: refresh the top items; keep sources.
5. Hong Kong (spring: March–April; autumn: September–October), New York (May, November), London
   (March, June–July, October), Paris (October): after each marquee week update the relevant `HUBS[].top`,
   `HUBS[].shift`, the matching `SYMPTOMS` evidence, and `MARKET`/`EVIDENCE` KPIs.
6. Re-check `RECORDS2` for new artist records; update `SEGMENTS[].top` and `[].moving`.
7. Add 1–2 `REEL` cards for the month’s biggest story (kinds: lot, up, story, signal, path, treaty,
   kpi, under, journey, money, symptom, hub, segment) and retire stale ones; keep the Reel at 36–42 cards.
8. `HERO` (data_market.js): when the front-page story is sold or superseded, replace the whole constant (picture
   from the registry, honest caption, headline, paragraph, buttons). `FLOOR`: re-pick the four vitals and four
   undercurrents of the week.
9. New lots or trophies with a new artist: add the artist to `ARTIST_DIED` and, if the right may still run (living or
   dead within 70 years), to `ARTIST_NATION` (the lint fails otherwise). New hub:
   give it `room`; new jurisdiction: give it `strictExport`/`dealerAml`; new NEWS item: give it `dt`.
10. Run `npm run check`; fix every lint ERROR; read the WARN list for anything the month's edits caused.
11. If the previous run already covered the month (see the Versions ledger), do an incremental pass — new dated
    items, re-verified S/U flags, `TODAY` moved — rather than rewriting the lists.
12. Currency weather and the flow model's FX: WebFetch `https://api.frankfurter.dev/v1/latest?from=USD&to=GBP,EUR,CHF,HKD`
    → `RATES` (asof = the fixing date); WebFetch `https://api.frankfurter.dev/v1/<first day of last month>..<run date>?from=USD&to=GBP,EUR,CHF,HKD`
    and append the last fixing of each new month to `FXSERIES` (the current month's point is the latest fixing; replace it
    next run), keeping 13–14 months (drop the oldest); set `FX` in data_under.js to `1/rate`, four decimals. The lint
    fails if `FX` drifts more than 1.5% from `RATES`.
13. `HUBS[].momentum` and `.why`: re-read for every hub the month touched (a marquee week, a fair, a closure); keep `why`
    to one line that a dossier source supports.
14. Feeds that were unreachable from the cloud session in October 2026 — UN Comtrade's free preview (403), the Wikimedia
    page-view API (blocked), the US Census trade API (key required): try each once (the URLs are in the header of
    `src/data_flows.js` and in ARCHITECTURE.md §9); if one answers, fill its collection to the documented schema with
    `src`/`vf` on every record. Never estimate a figure to fill a mode.
15. The Lab's benchmarks: `python3 tools/benchmarks.py` (downloads three CSVs from raw.githubusercontent.com and rewrites
    `src/data_bench.js`; `--dry-run` prints the summary first). The lint fails when the series end before the year
    before `TODAY`. The Lab's other measures are computed from the data at render and need no edit; after the run,
    open `#lab` and read the five reading lines for anything the month's edits made odd (a new chain with a group price
    should say "for fifteen works" or "for the series" after the amount, so price paths skip it).
16. If `data/nga_ids.txt` changes (a new Ledger record), rebuild with `python3 tools/nga_subset.py --write`: the rule keeps
    every main text whole, which the Lab's 1933–45 reading needs; `npm run ledger:check` confirms the shipped file.
17. Sales whose dates have passed show as "offered; the result comes with the refresh" (the page judges "upcoming" by the
    reader's date, `NOW`): move each to the results with its price, or drop it if it was withdrawn. Fair dates marked
    "not announced" in `FAIRS`/`CALENDAR`: replace them as the fairs announce, and keep the two lists and the hubs'
    `fairs` lines in agreement (they disagreed in four places before 9 October 2026).
18. The limits register (`LIMITS`): when a month's edit changes what a model does (a threshold, a payer, a scope, a new
    nationality), update or retire the matching entry; never turn a limit into an estimate of its effect.
19. The Season (v24): the `events` key of `data/research/v24.json` is the source. Drop nothing (the page hides what has ended); add the next quarter's fairs, sale weeks, biennales and major shows as they are announced, each with the organiser's own page in `tix` (a ticket or box-office page where one exists), the published price in `price`, one line of `why`, the sources opened and the flag; then `python3 tools/gen_research.py`. Dates the terminal carries elsewhere (`CALENDAR`, `FAIRS`, `LIVE.sales`) must agree with the Season's; when the organiser's page differs from the trade press, the organiser wins and the correction goes in both.
20. The Horizon (v24): the `horizon` key of `data/research/v24.json`. A thesis is kept until its evidence turns: when a month brings a record, a failed sale or a rule change that bears on one, add an evidence line (with the source and the flag) or a risk, and move `dir` only when three or more lines point the same way; then `python3 tools/gen_research.py`. Do not add theses by the month; the owner adds them by the quarter.
21. The Navigator (v24): the `law_europe` and `law_world` keys of `data/research/v24.json`. Re-check a jurisdiction's rules when the month reports a change (a threshold, a VAT rate, a sanctions amendment, an apostille accession), edit the research entry with the new source and flag, then `python3 tools/gen_research.py`; `NAV_FEES` in `tools/gen_research.py` carry the shipping figures and are refreshed when a published tariff is found. The Moscow case follows the central bank's six-month renewals of the transfer limits (last read: the September 2025 extension to 31 March 2026).

By month (the report calendar is in `REPORTS`):
- **April run (March drops):** Art Basel & UBS Global Art Market Report → `VITALS` global/auction/dealer/
  online/top/bottom/us, `SERIES.global/auction/dealer/online/shares/us` (append the new year), `MARKET.global`,
  `EVIDENCE` drawers; Artprice annual report → `VITALS.unsold`, Artprice-based lines in `SYMPTOMS`;
  Knight Frank Wealth Report → `VITALS.wealth`; The Art Newspaper visitor survey → `SERIES.museums`;
  Bank of America/ArtTactic → `VITALS.guar`.
- **May run:** ArtTactic confidence (April) → `VITALS.conf`; the New York May week → hubs, symptoms, lots.
- **July run:** Capgemini World Wealth Report → wealth tile detail; Art Basel (June) attendance → `HUBS.geneva`.
- **August run (July drops):** Christie’s and Sotheby’s half-year results → `VITALS.h1` (rename the label
  to the new half), `MARKET.h1_*`, `HOUSES[].sales.detail`, `SYMPTOMS.estates/guarantees`.
- **October run:** Altrata World Ultra Wealth Report (September) → `VITALS.wealth`; the Hong Kong autumn
  series → `HUBS.hk`, `SYMPTOMS.china`.
- **November run (October drops):** Art Basel & UBS Survey of Global Collecting → `VITALS.collect`,
  collector lines in `SYMPTOMS.women/wealth/online`; Frieze London and Art Basel Paris → `HUBS.london/paris`.
- **January run (December drops):** the houses’ year-end totals → `HOUSES[].sales` (y25→y26 etc.),
  `MARKET.bigThree`, `VITALS.luxury`, `SYMPTOMS.luxury/estates`; Artnet/Artsy year reviews → `RECORDS2`,
  `SERIES.bands`/`cats` for the new year; `LONGVIEW`: add the year’s line.
- **Every other November:** Deloitte Art & Finance (biennial; next November 2027) → lending figures in
  `ATLAS` entry `lending` (data_under.js) and `SYMPTOMS.guarantees`.

Research standard: fetch the primary page (the report’s own press release, the house’s results page,
the fair’s announcement) or two reputable outlets; never carry a number without a URL; if a number
cannot be confirmed, keep the old one and mark the tile or line `S`/`U` with a note, rather than guessing.

## 4. Publish

Rebuild, run `npm run check` and `npm run audit`, then publish with the Artifact tool: `file_path` =
`build/rostrum.html`, `url` = the artifact URL (keeps the address; images are kept), `root` = the project root
(`rostrum/`), and re-publish the whole source tree so the next run gets it: `files` = the map in section 1 with
the sources relative to `root` (`"src/src/app.js": "src/app.js"`, `"src/tools/lint_data.js": "tools/lint_data.js"`,
`"src/REFRESH.md": "REFRESH.md"`, `"src/data/nga_ids.txt": "data/nga_ids.txt"`, …). Files whose extension is not
served need an explicit type or the whole publish is refused: every `.py` script and the page template go as
`{"from": "build.py", "contentType": "text/plain"}` (likewise `images_manifest.py`, `fetch_images.py`,
`tools/globals.py`, `tools/nga_subset.py`, `tools/globe_dots.py`, `tools/benchmarks.py` and `"src/src/page.html": {"from": "src/page.html", "contentType":
"text/plain"}`); `.js`, `.css`, `.md`, `.json` and `.txt` are served by extension. A new picture is published
as `"img/<id>.jpg": "build/img/<id>.jpg"` and `"img/t/<id>.jpg": "build/img/t/<id>.jpg"` in the same call. If the tool answers that some
published files are "not what you last saw", read those paths from the artifact first (action `read`,
`paths` = the listed paths) and publish again. Do not pass `capabilities` (the previous declaration — db rules for the members' cards, the live layer, the analyst's gaps and the World's pins, user profile, sample,
downloads, and comments limited to the composer, which the Circle's invitation uses — is carried forward) and do not
create a new artifact. Finish with a short note of what changed and which
figures remain unverified.

The shareable copy: `python3 build.py --share` also writes `build/share.html` (the owner's Desk lines made neutral). Publish it to the share artifact's URL with `file_path` = `build/share.html` only (its pictures are already there; it carries no source files), again without `capabilities`.

## 5. The live desk (Monday and Thursday)

A scheduled task in a fresh session; it edits no files and publishes nothing. For each of the two artifacts (the main one and the share copy; each has its own database):
1. Read the open questions: `ArtifactData` list `gaps` (each document holds `items[]` of `{q, gap, ts}`). Read `live/status` and the `kb` collection to see what is already there.
2. Research the week (WebSearch, then WebFetch on the results): auction results of evening sales since the last report (the totals with premium, the hammer against the low estimate, sell-through, the top lots), reported private sales, the week's market news, and an answer to each open question the sources can settle.
3. Write, as the owner, with `ArtifactData` (one `batch`):
   - `kb/<id>` (`id` lower-case words joined by hyphens): `{q, a, src:[[label, https-url]…], asof:'YYYY-MM-DD', tags:[…], kind}`; `a` is Markdown of at most 9,000 characters that may link records as `[[kind:id|label]]` (lot ids are `slug(surname + '-' + title)`, see `lotById`); British spelling; every figure sourced; private prices said to be reported.
   - `live/sales`: `{asof, items:[…]}` — `LIVE.sales` with the week's results filled in, at most 30 items. Each item: `id` (`^[a-z0-9-]+$`, kept from the baked copy), `n` (the sale's name), `d` (`YYYY-MM-DD`), `house` (a house id such as `sothebys`, `christies`, `phillips`), optional `hn` (the house's display name), `city`, `g` (guarantees, in words), `est` (one or two **numbers**, US$ millions: `[low, high]`, or `[total]` for a reported total), `estNote` (the estimate's basis), `note`, `vf` (V, S or U), `lots` (at most 30 of `{a, t, est?, res?, y?, note?}`, all strings), `res` (`{total, hammer?, sold?, v?, vNote?, note?}`: `total` and `hammer` are numbers in US$ millions, `sold` a string such as "27 of 27", `v` exactly `above`, `within` or `below`) and `src`. `v` only from the hammer against the estimate or the house's own account.
   - `live/read`: `{asof, h, dek, body:[…], change, tells:[{l, v, d, dir, src:[label, url], vf}], watch:[…], src:[…]}` — rewrite the thesis when the week changed it.
   - `live/wire`: `{asof, items:[{dt, o, h, s, u, city?}]}` — the week's news, newest first, at most 40; `city` (optional, a `CITY_LL` name such as `New York`) places the item on the World's globe; without it the globe uses the first city the headline names.
   - `live/status`: `{asof, note}`.
   A document must pass `liveValid` / `kbValid` (`src/today.js`) or the page ignores it: dates are plain `YYYY-MM-DD` (never a timestamp), every URL is `https:`, `src` is at most 12 `[label, url]` pairs, and the length limits there hold (a headline 240 characters, a dek 900, a body paragraph 1,600, a kb answer 9,000, a wire summary 600). `asof` is the day of writing; a document replaces the baked copy only when its `asof` is at least as recent.
4. Never republish the page, change sharing, declare capabilities or create artifacts. The monthly refresh folds the desk's documents into `src/data_live.js` and the dated collections, so a rebuild never loses them.
5. Report in two or three sentences: what was written, which questions were answered and which remain open.

## Versions

| Date | Artifact version | Source state |
|---|---|---|
| 4 Nov 2026 | v24 | The Navigator (a work, a route and the money → the gates, the route, the landed-cost ledger and the law, from 22 jurisdictions’ rules with 115 sources; the Moscow worked case), the Season (80 events to June 2027 with ticket pages; Going on the member cards; the strip on Today; pins on the World), the Horizon (18 theses with 91 evidence lines), nine finance entries in the Atlas, two vitals, a sculpture signal; gold pins for sold, red for this week; the calendar corrected (Phillips 18 Nov, Art Basel Qatar 27–30 Jan). Research bundle `data/research/v24.json`, generator `tools/gen_research.py`. The artifact holds 510 of its 511 allowed files: the three October reviews are one file (`audit/reviews.md`), `tools/shots.js` is `audit_runtime.js --shots`, and `data/nga_ids.txt` stays in git (the ids are the subset’s own, in order; `nga_subset.py` reads them from the JSON when the list is absent). The next batch of pictures needs the thumbnails as one file. |
| 3 Nov 2026 | v23 | The page opens on the World: a full-bleed dotted globe with the season’s sales, the sale room, the lots to come, the fairs and the wire by city (Now); a rail from 43000 BC with the movements alive at their centres and the painters at their birthplaces (Then); the trade’s centre of gravity era by era (Shifts); readers’ own pins in the db (Notes, `pins/<viewer>`); six readings computed from the sale room (verdicts, sell-through, concentration, where, ahead, this week). The Library: 221 public-domain paintings (104 added, Gothic to the avant-garde; `images_manifest.py`, `data/images_meta.json` with the source file and its size) on a justified wall with a century rail and filters, and a viewer that zooms and pans, with the credit, the painter, the movement, the source file and the world of its year. Compare: two painters or two movements side by side (the same measures, the larger marked, sales by year, a reading), from the dossiers and from Ask (“compare Monet and Picasso”). The masthead folds to brand, search, Theme and Menu on the World; the Lab moves to More; the theme is night blue with the red dot as the one accent. `data_places.js` (369 cities, 58 movements’ centres, 413 birthplaces, 8 eras). The capability declaration adds `pins` (read view, write owner) and `pins/{self}` (write interact). |
| 2 Nov 2026 | v22 | Today, Ask Subhasta, Movements and the live layer. A lean front page (the ask bar, the Read with its tells, the sale room's verdict and test, the board, four tiles, signals, the wire, what the analyst learned, the next dates); the analyst (an index of about 1,900 records, Claude with four page tools, a data answer without Claude, gaps filed for the research desk); 58 movements on a timeline with dossiers; the masthead cut to eight sections and More; the live layer (`live/`, `kb/`, `gaps/` in the db; new capability declaration, contract 0.2.88); the October results (42 lots in London, Paris, New York, Abu Dhabi), 10 private sales, the November sale room (8 sales), 15 signals, 22 news items, records, calendar, fairs, dispatches, reports; MARKET.verified 2 Nov 2026; TODAY 2026-11-02. After an independent review: stricter live validators (no stored markup through a verdict, numbers for estimates, plain dates), an index that builds whole or not at all and knows month names, the tail lines read only at the end, questions queued while one streams, kept conversations checked on load, and a data answer that covers the sale room by month and house, single sales, records by artist, desk entries and terms. |
| 5 Oct 2026, 21:14 ET | refresh run (scheduled task fired by hand) | Incremental pass by the scheduled task from the v13 source: Koons’s ≈$100m Heroes and Lovers consignment (Christie’s, 17 Nov), the Weiss bankruptcy lots at Sotheby’s (18 Nov), Artnet’s per-house Hong Kong totals, the Mondrian estimate (£20–30m), the Rembrandt buyer (Leiden Collection), PAD London; TODAY 2026-10-06. Merged into the maintainer’s tree on 6 Oct. |
| 6 Oct 2026 | v14 | Foundation pass. Data contracts: HERO, FLOOR, ARTIST_DIED, ORG_ALIASES, DEALERS key, NEWS dt, VENUES/DESTS country·cities·homeDest, HUBS.room, REGIMES strictExport/dealerAml, MARKET.verified, VITALS.unit, EVIDENCE tile fields. Hardened build.py (Node counts, guards) and test.js (exit code, boot poll, new asserts); engines wired to the data; a11y/keyboard/robustness fixes from the runtime audit; apostrophe- and diacritic-insensitive search. tools/ (lint, runtime audit, globals map, NGA subset, shots), package.json scripts, README, ARCHITECTURE, three audits — all published with the source. Nine hubs sourced (Shanghai, Tokyo, Singapore, Taipei, Dubai, Doha, Miami, Madrid, Maastricht) with 2027 fair dates; Hockney (d. 11 Jun 2026) and Kusama (d. 14 Aug 2026) recorded. Figures verified 6 Oct 2026; TODAY 2026-10-06. Git: commits "Subhasta v14 baseline", "v14: foundation pass", "v14: merge the refresh run". |
| 8 Oct 2026 | v17 | The globe (dot-matrix earth, five modes: share, momentum, journeys, flows when data lands, calendar), currency weather (ECB month-end series) and the FX constant brought to the 8 Oct fix, the Circle (offer, why, invitation by comment, the Subhasta Brief), hub coordinates and momentum, the Salon board moved to one document per author (db rules: all read, each writes own), lint rules for every new collection, the runtime audit reading its view list from the app. TRADE, CORRIDORS and ATTENTION remain empty: their feeds refused the cloud session. |
| 8 Oct 2026 | v18 | The Lab: five instruments computed from the data (repeat-sales returns against the S&P 500 total return, gold and CPI from `data_bench.js`; the round trip on Follow the money's entry; concentration; provenance 1933–45; the confidence ledger). The provenance reading covers the museums' research scope (578 histories: 351 accounted for, 136 partly, 91 quiet, 20 custody), feeds the Ledger's filter and chips, the drawer, the Clinic's base rate and the Circle; it was checked by an independent second reader. `tools/nga_subset.py` keeps every main text whole (53 records). Data: the US tariff texts follow the verified regime row; Paris import VAT on hammer plus premium; export thresholds per regime in the Clinic; Salvator's 2005 step at $1,175; group prices skipped by price paths; the Hong Kong ceramics link; TODAY 2026-10-08, figures verified 8 Oct 2026. New lint rules: calendar link city/house, Circle links, `impVatOn`, `expAge`/`expBefore`. |
| 8 Oct 2026 | v19 | Measuring and the review's fixes. Follow the money: the room's VAT comes back when the work leaves the country or goes into bond (a new rule, `exportvat`, from Phillips' London, Paris and Geneva guides and the Swiss customs publication); Paris and Geneva homes as destinations (5.5% and 8.1% import VAT), so every room has a domestic case; the museum loan insures and is shown but not ranked; the same purchase in eight places with VAT in the room; the room-by-destination matrix with plain readings. The Lab: a 90% bootstrap interval for the median return; the break-even grid by lot size and years held, cached on every input including Follow the money's imported box and shipping, with separate size and time readings; concentration across named artists (ten lots with no artist left out; shares rounded to add up; Leonardo by his first name) and value by decade; the dealers and houses named in the 1933–45 histories, with lists that match their counts. One dealer matcher (whole names, other spellings, look-alike names struck out: Lansdell K. Christie, Arnold Seligmann, Karl Buchholz's Berlin gallery, Sotheby Parke Bernet) for the Ledger, the artist pages and the Lab; an artist page's dealer opens the Ledger on that dealer and artist. Sticky first columns on a phone. New lint rules: DEALERS' fifth column, DESTS `s`/`act`/flags, ledger-row atlas ids in ternaries. |
| 9 Oct 2026 | v20 | A sixth instrument and the reviews' fixes. The Lab's instrument five, Hands (`src/lab_hands.js`): every holding the Ledger's histories date at both ends (1,336), the collector's median hold (18 years, the middle half 8 to 32) against the dealer's (one), how collectors let go by era (a sale, heirs, the Gallery), hands before the Gallery by when the work was made, and the dealers who sold to the founders' collections drawn as a flow (Knoedler, Wildenstein and Étienne Bignou the busiest), with a CSV; a second reader's sample fixed the splits it found. The round trip at each repeat sale's own rate, like for like by price, drawn as a dot strip with the S&P 500 and the outliers at the edge. Two independent reviews of v19: Geneva charges its 8.1% on hammer and premium (Phillips' Geneva guide); each room's export terms are its own phrase (`VENUES.exp`); the export rule is reworded to its sources, adds the Swiss customs page that counts a delivery into a free warehouse as an export, and is flagged secondary; the ledger rows link the right entry; the Lab redraws on return; the slider no longer drifts; new scroll regions take keyboard focus; trillions print; the grid's clause follows the numbers; the bars show one decimal. `tools/globals.py` reads the paste order from `build.py`; the lint checks the last ledger row, `vatOn` and `exp`, and reads `lab_hands.js`. |
| 9 Oct 2026 | v21 | Limits and flaws. A limits register in the Lab (23 things the models leave out, in seven areas, linked from every note that relies on one). The money model's rules: the resale right by room, payer (the buyer in London and Paris), threshold (£1,000, €750), term and nationality (`ARTIST_NATION`, `ARR_NATIONS`: the UK, the EEA, Australia, New Zealand); the estate tax on the whole price; a guarantee fixed in dollars; presets in local money; a $100k–$2bn slider read only when moved; ties in the room comparison. The Clinic's surname, undated, export and resale-right fixes. Provenance leads with the AAM's full scope (184 histories, 11% accounted for), its reasons split without overlap. Like-for-like growth in real terms. History: Back and Forward walk views and dossiers; the Reel closes onto the page it covered. Fixes from an independent review (board authors from the document id only; the audit's overflow and masthead checks now load the page; the Reel opens playing and Space advances; composer roles and names; collector lots on whole words; upcoming judged by the reader's date) and from a data check (2027 fair dates as announced in all three lists; London's evening sales 14–15 Oct; Collectors' Week early December; the Hammer collection's twelve works over five sales; Christie's 2025 +6%; Phillips like for like; $992bn credited to Deloitte; BofA's +133% with its 2022 caveat; the anime debut $1.4m; Phillips' leadership; Te Fare's €54m, $25.2m and its losses in dollars, real terms and euros). Phone charts, print, the masthead fold. TODAY 2026-10-08; figures re-checked 9 Oct 2026. |
