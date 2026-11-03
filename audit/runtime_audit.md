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
