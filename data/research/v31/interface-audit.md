# Subhasta — interface audit, v31

Date: 23 November 2026. Brief: does the terminal read as the private-client interface of a Geneva bank or an Hermès limited catalogue? Method: ten screenshots (six desktop views, one dark, three phone) read against `src/style.css`, `src/world.css`, `src/nav.css`, `src/ask.css` and the markup in `src/page.html`, `eye.js`, `school.js`, `today.js`, `nav.js`, `app.js`. Every fix below names the selector it changes and quotes the rule as it stands. Line numbers are those of the files on 23 Nov. Nothing else in the repository was touched.

---

## 1. Verdict

The globe is the one object on the site that already belongs to the register the owner wants: engraved hatching, a gilt meridian ring with its tick marks, bone city labels, and in the dark theme a night-blue ground that makes the whole thing look like an instrument rather than a widget. The inner pages that use the catalogue head (Hammer, Navigator, Today: a small-caps eyebrow, a 46px Caslon title, a 66-character Caslon dek, then a 2px ink rule over each section head) are also right, and the palette underneath them is sound (cream and night blue, bone ink, one dark gilt that clears AA, a wine claret). What holds the page back is not taste but discipline: red is used as the primary action colour and as an eyebrow, so the landing carries four reds and every "Ask" or "Guess" shouts; a consumer-software vocabulary of pills, chips, segmented controls, glowing dots and native selects sits on top of the catalogue typography; and two whole views (the Eye, the School) were built outside the system, with a browser-default bold sans title and an unstyled 190-character lead. Behind that stands a zoo: 35 font sizes, 16 line-heights, 12 corner radii, 7 shadow recipes, 13 neutral tokens plus a dozen hard-coded greys, and some thirty button styles. The motion is the last tell: views cut hard, menus pop, hovers snap; a private bank's screen never does anything suddenly.

---

## 2. The irritants

Ranked by impact. "Now" quotes the rule as it stands; "Fix" is the replacement. A fix is CSS-only unless it says otherwise.

### 1. The Eye and the School titles fall to the browser default
Where: the page title, eye-desktop.png, school-desktop.png, eye-phone.png.
What: "The Eye" and "The School" render in bold Instrument Sans at 29px (2em of the 14.5px body) while every other page title is Caslon Display at 46px, weight 400.
Why: two sections look like a different product; bold sans is the one thing a Caslon catalogue never does.
Now (eye.js:168, school.js:24): `<h1 id="h-eye">The Eye</h1>` sits outside `.head`, so `.head h1{font-family:var(--display);font-weight:400;font-size:46px;line-height:1.02;…}` (style.css:97) never reaches it.
Fix (style.css, after line 98):
```css
.view>h1{font-family:var(--display);font-weight:400;font-size:46px;line-height:1.02;letter-spacing:-.005em;margin:6px 0 10px;text-wrap:balance}
@media (max-width:900px){.view>h1{font-size:34px}}
```

### 2. The lead paragraph has no rule at all
Where: the paragraph under the title, eye-desktop.png, school-desktop.png, eye-phone.png.
What: `p.lead` inherits the body (14.5px sans, line-height 1.5, colour ink) and runs the full 1,272px shell: about 190 characters a line on desktop, eleven lines on a phone.
Why: a measure beyond 75 characters is unreadable and looks like terms and conditions; the same text in Caslon at 66ch is the dek the other pages already use.
Now: no `.lead` rule exists in any stylesheet (grep confirms only `.brief .lead .l1` in circle.css).
Fix (style.css, after line 98):
```css
.view>.lead{font-family:var(--read);font-size:16px;line-height:1.55;color:var(--ink2);max-width:66ch;margin:0 0 26px;text-wrap:pretty}
```

### 3. Red is the action colour
Where: the Ask disc in the globe foot (world-desktop.png, world-dark.png, world-phone.png), the Ask disc on the Today hero (today-desktop.png, today-phone.png), the Guess button (inferred: `.btn.primary`), the landing eyebrow "The art world, 23 Nov 2026" (world-desktop.png).
What: `--live` (#c8321a light, #ff4d2e dark) fills every primary button and colours the landing eyebrow; on the dark theme it is a hot orange at full saturation; the landing shows it four times (eyebrow, legend dot, Ask button, slider thumb).
Why: a private bank's primary is ink; red on a landing page reads as an alert, and the eyebrow is gilt on every other page, so the landing contradicts the system in its first line.
Now: `.btn.primary{background:var(--live);color:var(--onlive);border-color:var(--live);font-weight:500}` (style.css:216); `.wd-go{border-radius:999px;background:var(--live);color:var(--onlive);padding:8px 16px;font-weight:600;font-size:13px;flex:none}` (world.css:39); `.tdaskbar .btn{padding:0 24px;font-size:15px;background:var(--live);border-color:var(--live);color:var(--onlive);border-radius:999px;font-weight:600}` (ask.css:54); `.wd-eye{color:var(--live)}` (world.css:15); `--live:#ff4d2e` (style.css:12).
Fix:
```css
.btn.primary{background:var(--ink);color:var(--ground);border-color:var(--ink);font-weight:500}
.btn.primary:hover{background:color-mix(in srgb,var(--ink) 88%,var(--ground));color:var(--ground);filter:none}
.wd-go{background:var(--ink);color:var(--ground);font-weight:500}
.tdaskbar .btn{background:var(--ink);color:var(--ground);border-color:var(--ink);font-weight:500}   /* with the hero tokens of item 25 this becomes bone on the picture */
.wd-eye{color:var(--gilt)}
:root{--live:#e05a3f}   /* dark, interim: 5.3:1 on the ground; §3 then aliases --live to --claret, and the red keeps only the dot, the slider thumb and the "this week" marks */
```

### 4. Every verification flag in the Hammer is red
Where: the small boxed letter after each price, hammer-desktop.png.
What: V (read on the house's own page), S (trade press) and U (unconfirmed) all render in claret with a claret border, so the verified Salvator Mundi row carries the same warning box as an unconfirmed one.
Why: a colour that means nothing is noise; a red box in every row makes the table look flagged.
Now (app.js:451): `<span class="tag flag lotvf" …>${esc(r.vf||'U')}</span>`; `.tag.flag{color:var(--claret);border-color:color-mix(in srgb,var(--claret) 50%,transparent);…}` (nav.css:161). The semantic style already exists: `.vf.v{color:var(--verd);…}.vf.s{color:var(--gilt);…}.vf.u{color:var(--claret);…}` (style.css:613).
Fix (one markup line, app.js:451): `<span class="vf ${(r.vf||'U').toLowerCase()} lotvf" …>`; then in style.css: `.lotvf{margin-left:8px;font-size:9.5px;vertical-align:2px}`.

### 5. The level row is flung across the page
Where: "Level … Easy … Standard … Expert", eye-desktop.png, eye-phone.png.
What: the three pills sit at 445px, 850px and 1,280px on a 1,400px screen, with "Level" at the far left.
Why: it is a bug, and it reads as one: the eye cannot group the control.
Now: `.eye-tiers{gap:6px 10px;…;justify-content:flex-start;margin-bottom:6px}` (nav.css:408) is overridden by `.eye-bar{display:flex;…;justify-content:space-between;…}` (nav.css:432), which comes later at equal specificity, and the markup is `class="eye-bar eye-tiers"` (eye.js:170).
Fix (nav.css, after line 432):
```css
.eye-bar.eye-tiers{justify-content:flex-start;gap:6px 8px;margin-bottom:4px}
```

### 6. The fourth game card is an orphan
Where: the mode cards, eye-desktop.png.
What: four cards in a three-column grid; "The forger" sits alone on a second row at one-third width.
Why: an orphan card looks unfinished; the row of four is the natural shape.
Now: `.eye-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 18px}` (nav.css:371).
Fix: `.eye-modes{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}` (four when the forger is shown, three when hosted; see item 44 for the phone).

### 7. The landing's left gutter is 24px off the rest of the site
Where: the eyebrow and headline of the globe panel, world-desktop.png; the zoom buttons, same.
What: the lead starts at x = 40 while the masthead wordmark and every inner page start at x = 64; the zoom column sits at right:16px while the masthead's tools end at 1,336.
Why: a catalogue's margins are one line, top to bottom; two left edges 24px apart look like a mistake in the first second.
Now: `.wd{--wdx:max(24px,calc(50vw - 660px));…}` (world.css:6); `.wd-zoomctl{position:absolute;right:16px;bottom:28px;…}` (world.css:187); `.wd-zb{…;box-shadow:0 1px 4px rgba(0,0,0,.08);…;font-family:var(--sans)}` (world.css:188; `--sans` is not defined anywhere).
Fix:
```css
.wd{--wdx:max(24px,calc(50vw - 660px + 24px))}
.wd-zoomctl{right:var(--wdx)}
.wd-zb{box-shadow:none;font-family:var(--ui)}
```

### 8. Three gilt entries in the masthead menu
Where: "The Eye", "The School", "Ask", every desktop screenshot.
What: three of nine menu items are gilt; the active item is ink with a gilt underline; the rest are grey.
Why: a menu with three highlighted items has no order; the plan itself says gilt is for money, never decoration.
Now: `.nav button.headline{color:var(--gilt)}` (ask.css:279); `.nav .asknav{color:var(--gilt)}` and `.nav .asknav.on{color:var(--gilt);border-bottom-color:var(--gilt)}` (ask.css:7–8).
Fix: delete those three rules.

### 9. The masthead mixes four typefaces and two shapes
Where: "Ask or search ⌘K" and "Theme" pills, every desktop screenshot.
What: the wordmark is Caslon Display, the menu Caslon small caps at 14.5px, the chips Instrument Sans at 12.5px in 999px pills, the shortcut IBM Plex Mono at 11px; the pills are the only rounded objects in the bar.
Why: a Geneva masthead is one face and one line; the pills are the SaaS tell.
Now: `.chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--rule);border-radius:999px;padding:5px 11px;font-size:12.5px;color:var(--ink2);white-space:nowrap;background:var(--paper)}` (style.css:86); `.chip kbd{font-family:var(--mono);font-size:11px;color:var(--ink3)}` (style.css:88); `.askchip{border-color:color-mix(in srgb,var(--gilt) 55%,var(--rule))}` (ask.css:20).
Fix:
```css
.tools{border-left:1px solid var(--rule);padding-left:8px;margin-left:4px}
.tools .chip,.askchip{position:relative;border:0;background:none;border-radius:0;padding:0 10px;font-family:var(--read);text-transform:uppercase;font-size:11.5px;letter-spacing:.14em;color:var(--ink2);gap:8px}
.tools .chip:hover{color:var(--ink)}
.chip kbd{font-family:inherit;font-size:10px;letter-spacing:.08em;color:var(--ink3)}
#themeBtn .tx{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}#themeBtn .ic{display:inline;font-size:15px}   /* a glyph; the word "Theme" is a settings label, not a masthead item */
```
Also: the spear ornament shows only between 901 and 1,100px (`@media (min-width:1101px){.brand .spear{display:none}…}` style.css:80 and `@media (max-width:900px){… .brand .spear … display:none}` style.css:438). Keep it everywhere or nowhere; delete it from the ≥1101 rule.

### 10. The active underline floats above the bar's own rule
Where: the underline under "Today", "The Eye", etc., every desktop screenshot.
What: a 1px gilt line 6px below the text, 17px above the masthead's 1px bottom rule: two parallel hairlines.
Why: the Hermès and FT convention is one rule that the active item's mark meets.
Now: `.nav button{font-family:var(--read);font-variant:small-caps;letter-spacing:.06em;font-size:14.5px;color:var(--ink2);padding:6px 7px;border-bottom:1px solid transparent;white-space:nowrap}` (style.css:81); `.nav button.on{color:var(--ink);border-bottom-color:var(--gilt)}` (style.css:83); `.nav{display:flex;gap:2px;margin-left:auto;align-items:center;min-width:0}` (style.css:78).
Fix:
```css
@media (min-width:1101px){
  body:not(.navtight) .nav{align-self:stretch;gap:0}
  body:not(.navtight) .nav button,body:not(.navtight) .nav .morebtn{height:var(--top);padding:0 10px;border-bottom:2px solid transparent}
  body:not(.navtight) .nav button.on,body:not(.navtight) .nav .morebtn.on{border-bottom-color:var(--ink)}
}
```

### 11. The small caps are synthesised
Where: the masthead menu, the eyebrows, the artist names in the Hammer, every screenshot.
What: thirteen rules use `font-variant:small-caps` on Libre Caslon Text, which ships no small-caps set; the browser scales capitals, so in "THE EYE" the initial T is visibly heavier than the HE. Five trackings are used for them (.04, .05, .06, .08, .1em).
Why: faked small caps are the first thing a typographer sees; true capitals, tracked, are what the banks set.
Now: `.nav button` (style.css:81), `.nav .morebtn` (ask.css:9), `.eyebrow{…font-variant:small-caps;letter-spacing:.08em;font-size:14px;…}` (ask.css:3), `.label.cap` (style.css:65), `.tbl td.t .k{…font-variant:small-caps;letter-spacing:.05em;font-size:14px;…}` (style.css:999), `.tdask .k` (ask.css:48), `.srcol h3` (ask.css:89), `.askempty .k` (ask.css:125), `.turn .who` (ask.css:128), plus `.ci-k`, `.lab-k`, `.lab-ret td.k`, `.lab-h3`.
Fix: in each, replace `font-variant:small-caps;letter-spacing:…;font-size:Npx` with `font-variant:normal;text-transform:uppercase;letter-spacing:.14em;font-size:11.5px` (the eyebrow and the artist names at 11.5px; the menu as in item 10).

### 12. Three pill systems in one column
Where: the mode control, the readings, the ask bar, world-desktop.png, world-dark.png.
What: a segmented control with an ink-filled active pill, five value chips, a pill search field with a pill button, and two circle buttons, all within 400px.
Why: this is an iOS settings screen; a catalogue uses text tabs and figures in a line.
Now: `.wd-modes{display:inline-flex;gap:2px;padding:3px;border-radius:999px;background:color-mix(in srgb,var(--paper2) 70%,transparent);border:1px solid var(--rule)}` (world.css:20); `.wd-mode{font-family:var(--ui);font-size:13px;font-weight:500;letter-spacing:.02em;padding:6px 14px;border-radius:999px;color:var(--ink2)}` (21); `.wd-mode.on{color:var(--ground);background:var(--ink)}` (23); `.wd-rd{font-size:12px;padding:4px 10px;border:1px solid var(--rule2);border-radius:999px;color:var(--ink);background:color-mix(in srgb,var(--paper2) 70%,transparent);cursor:pointer;font-variant-numeric:tabular-nums}` (136).
Fix:
```css
.wd-modes{display:flex;gap:18px;padding:0;border-radius:0;background:none;border:0;border-bottom:1px solid var(--rule)}
.wd-mode{font-family:var(--read);font-size:11.5px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;padding:8px 0 9px;border-radius:0;margin-bottom:-1px;border-bottom:1px solid transparent;color:var(--ink2)}
.wd-mode.on{color:var(--ink);background:none;border-bottom-color:var(--ink)}
.wd-readings{gap:4px 16px}
.wd-rd{font-family:var(--read);font-size:14px;padding:0;border:0;border-radius:0;background:none;color:var(--ink);text-decoration:underline;text-decoration-color:var(--rule2);text-underline-offset:4px}
.wd-rd:hover{color:var(--ink);text-decoration-color:var(--ink)}
```

### 13. The ask bar is a pill with a disc in it
Where: the globe foot, world-desktop.png, world-dark.png, world-phone.png.
What: a 999px field with a blurred 82% paper fill, a 1px `--rule2` border and a red 600-weight button.
Why: the private-client search field is a line, not a capsule.
Now: `.wd-ask{display:flex;align-items:center;border:1px solid var(--rule2);border-radius:999px;background:color-mix(in srgb,var(--paper) 82%,transparent);padding:4px 4px 4px 16px;backdrop-filter:blur(8px);…}` (world.css:35); `.wd-ask:focus-within{border-color:var(--ink2)}` (36).
Fix:
```css
.wd-ask{border:0;border-bottom:1px solid var(--rule2);border-radius:0;background:none;padding:0;backdrop-filter:none;-webkit-backdrop-filter:none}
.wd-ask:focus-within{border-bottom-color:var(--ink)}
.wd-q{padding:10px 0}
.wd-go{border-radius:0;background:none;color:var(--ink);padding:8px 0 8px 12px;font-family:var(--read);font-weight:400;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase}
.wd-go::after{content:" →"}
```

### 14. The legend glows, wraps and repeats the prose
Where: "5 cities with sales ○ 2 with sales to come ◇ 52 fairs and shows / 26 news", world-desktop.png.
What: the gilt and red dots carry an 8px glow; the fair diamond is an 8px square rotated 45° (11px tall) and its label sits 3px lower than the others; "26 news" wraps alone onto a second row; the lead paragraph above explains the same key in prose ("gold where something sold this season, red where …").
Why: glow is neon; a misaligned glyph and an orphan row look careless; saying the legend twice patronises.
Now: `.wd-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink3)}` (world.css:27); `.wd-legend i.sold{background:var(--gilt);box-shadow:0 0 8px color-mix(in srgb,var(--gilt) 70%,transparent)}` (29); `.wd-legend i.fresh,…{background:var(--live);box-shadow:0 0 8px …}` (30); `.wd-legend i.fair{background:transparent;border:1.5px solid var(--gilt);transform:rotate(45deg);border-radius:1px}` (32).
Fix:
```css
.wd-legend{gap:6px 16px;color:var(--ink2);align-items:baseline}
.wd-legend span{white-space:nowrap}
.wd-legend i.sold,.wd-legend i.fresh,.wd-legend i.mv,.wd-legend i.ce,.wd-legend i.note{box-shadow:none}
.wd-legend i.fair{width:7px;height:7px;vertical-align:0}
```
And cut the "a dot is a city: gold where … Click it." sentence from `lead()` in world.js (content, not CSS).

### 15. Zebra stripes in the Hammer
Where: the results table, hammer-desktop.png (rows 1, 3 and 5 shaded).
What: every even row is tinted.
Why: a catalogue of results is ruled with hairlines; stripes are a spreadsheet.
Now: `.tbl tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--paper) 60%,transparent)}` (style.css:200), also `.tbl tbody tr:nth-child(even) th` (1053) and `.tbl.sens tbody tr:nth-child(even) th,.dtab .tbl tbody tr:nth-child(even) th` (1037).
Fix: delete the three rules; keep `.tbl tr.clk:hover td{background:var(--paper2)}` (202). The Category column also wraps ("Post-War & / Contemporary") and gives uneven row heights: `#rtbl td:nth-child(5){white-space:nowrap}`.

### 16. A boxed tag in every row, and sort arrows on every heading
Where: "All-time auction record", "provenance", "Modern-art record"; the ↕ after each column head; hammer-desktop.png.
What: up to two bordered 11.5px boxes per row (ten visible at once); an 11px ↕ at 50% opacity on four headings, "↓" on the fifth.
Why: boxes in a table are badges; a catalogue sets a record in italic and shows the sort only where it acts.
Now: `.tag{display:inline-block;font-size:11.5px;padding:2px 7px;border:1px solid var(--rule2);color:var(--ink2);border-radius:2px;white-space:nowrap;margin-right:4px;vertical-align:1px}` (style.css:190); `.tbl th .sortb .ar{font-family:var(--ui);font-style:normal;font-size:11px;opacity:.5}` (996).
Fix (the chip of §3, as a catalogue sets "PROPERTY FROM A DISTINGUISHED COLLECTION"):
```css
.tbl .tag{border:0;padding:0;margin:0 0 0 8px;border-radius:0;background:none;font-family:var(--read);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);vertical-align:1px}
.tbl .tag.rec{color:var(--gilt)}
.tbl .tag+.tag::before{content:"· ";color:var(--rule2);letter-spacing:0}
.tbl th .sortb .ar{opacity:0;transition:opacity var(--t-fast) var(--ease)}
.tbl th .sortb:hover .ar{opacity:.5}
.tbl th .sortb.on .ar{opacity:1}
```

### 17. The toolbar is six native boxes
Where: the search field and five selects, hammer-desktop.png; the Navigator's form, navigator-desktop.png; the "Replay a day" select, eye-desktop.png.
What: every field is a `--paper2` box with a 1px rule, a 2px radius and the operating system's chevron.
Why: boxed fields with OS chevrons are a database front end; the bank's form is an underlined field with a fine chevron.
Now: `input,select,textarea{font-family:var(--ui);font-size:14px;color:var(--ink);background:var(--paper2);border:1px solid var(--rule);border-radius:2px;padding:8px 10px;width:100%;min-width:0}` (style.css:53).
Fix (system-wide; `--chev` is defined in §3):
```css
input,select,textarea{background:transparent;border:0;border-bottom:1px solid var(--rule2);border-radius:0;padding:8px 0}
select{appearance:none;-webkit-appearance:none;padding-right:22px;background:var(--chev) no-repeat right 4px center}
textarea,.askbar textarea{border:1px solid var(--rule2)}   /* a box stays where the text has more than one line */
.toolbar{gap:0 28px}
```

### 18. The summary line is a ransom note
Where: "667 of 667 lots · total $12.05bn, … median $1.54m · top Leonardo da Vinci, Salvator Mundi $450.3m" with "Copy the line" and "Download CSV", hammer-desktop.png.
What: gilt Caslon at 16px is set inside 13.5px sans, so the baseline jumps five times in one sentence; two small boxed buttons sit at the right.
Why: one line should be one voice; the boxes are a toolbar inside a sentence.
Now: `.hsum p .money{font-size:16px}` (style.css:1006) on top of `.money{font-family:var(--display);color:var(--gilt);…}` (60); `.btn.sm{padding:4px 9px;font-size:12px}` (218).
Fix:
```css
.hsum p .money{font-family:inherit;font-size:inherit;color:var(--ink);font-weight:500}
.hsum .acts .btn{border:0;background:none;padding:0;font-size:12.5px;color:var(--gilt)}
.hsum .acts .btn+.btn::before{content:"· ";color:var(--rule2)}
```

### 19. The Navigator's fieldsets stretch to the tallest
Where: "The Route" and "The Money", navigator-desktop.png.
What: the three boxes are the same 460px height; the second and third are 60% empty bordered space.
Why: empty boxes look like missing content.
Now: `.navform{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 18px;margin:4px 0 22px}` (nav.css:2), which stretches by default.
Fix: `.navform{align-items:start}`.

### 20. The fieldsets are notched boxes with sans legends
Where: "THE WORK", "THE ROUTE", "THE MONEY", navigator-desktop.png.
What: 12px uppercase sans legends at .04em break a 2px-radius border; fields sit 9px apart with 4px between label and control, so labels float between the fields they name.
Why: the notched fieldset is HTML 4; the bank's form is a ruled section with a tracked caption.
Now: `.navform fieldset{border:1px solid var(--rule);border-radius:2px;padding:12px 14px 14px;margin:0;min-width:0;display:flex;flex-direction:column;gap:9px}` (nav.css:3); `.navform legend{font-family:var(--ui);font-size:12px;color:var(--ink3);letter-spacing:.04em;text-transform:uppercase;padding:0 6px}` (4); `.navform label{…gap:4px;…}` (5).
Fix:
```css
.navform fieldset{border:0;border-top:1px solid var(--rule2);border-radius:0;padding:14px 0 0;gap:14px}
.navform legend{font-family:var(--read);font-size:11.5px;letter-spacing:.14em;color:var(--gilt);padding:0 10px 0 0;margin:0}   /* the rule starts where the caption ends */
.navform label{gap:5px}
.navform label>span{font-size:11.5px;letter-spacing:.02em}
```
The value field shows "2500000"; format it on blur (`e.target.value=Number(v).toLocaleString('en-GB')`, one line in nav.js) or at least `.navform input[type=number]{font-variant-numeric:tabular-nums}`.

### 21. The audience strip sits on every page
Where: "COLLECTOR / ADVISOR AND DEALER / BANKER AND LENDER", hammer-desktop.png, navigator-desktop.png, today-desktop.png, today-phone.png.
What: 70px of 12.5px text in three columns with 10.5px bold uppercase gilt captions, before the content of every view; on a phone it is 170px of stacked text.
Why: it is a marketing strip; a client who has chosen the Hammer does not need to be told who the Hammer is for, three times.
Now: `.forwhom{…font-size:12.5px;color:var(--ink2);…}` (style.css:1143); `.forwhom b{display:block;font-family:var(--ui);font-weight:600;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--gilt);margin-bottom:1px}` (1145).
Fix: one italic line, dismissible as now.
```css
.forwhom{font-family:var(--read);font-style:italic;font-size:13.5px;color:var(--ink3);gap:4px 28px;padding:10px 24px 10px 0;margin:-6px 0 26px}
.forwhom span{flex:1 1 300px}
.forwhom b{display:inline;font:inherit;font-style:normal;letter-spacing:0;text-transform:none;color:var(--ink2);margin:0 6px 0 0}
```
Stronger: default `store.get('forwhom','on')` to `'off'` after the first visit (app.js:169, one line).

### 22. Today's status pills advertise staleness
Where: "● Desk · 2 Nov 2026" and "Figures verified 2 Nov 2026", today-desktop.png, today-phone.png.
What: two masthead-style pills in the page head, one with a grey dot (a pulsing green one when live), dated three weeks before the page's own date.
Why: pills with status dots are a dashboard; a pulse is a notification; a date line belongs in small italic under the dek.
Now: `.chip.live i{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--ink3);margin-right:2px}` (ask.css:38); `.chip.live.on i{…animation:livepulse 2.4s ease-in-out infinite}` (40); `.status{font-size:12.5px;color:var(--ink3)}` (style.css:347).
Fix:
```css
.head .status{display:flex;gap:0 14px;font-family:var(--read);font-style:italic;font-size:13.5px;color:var(--ink3);align-self:flex-end}
.head .status .chip{border:0;background:none;padding:0;border-radius:0;font:inherit;color:inherit;gap:6px}
.chip.live i{width:6px;height:6px}
.chip.live.on i{animation:none;box-shadow:none}
```
The same rule quiets "34 jurisdictions" and "181 sources" on the Navigator (nav.js:154 uses the same `.status .chip`).

### 23. The hero carries its own palette, a second gold and a 52px headline
Where: the Ask hero, today-desktop.png, today-phone.png.
What: six hard-coded colours (#f1ebdd, #d9d2c2, #e9e2d2, #f6f1e6, #0c0f14, rgba(246,241,230,…)); a gold #e2c47e that is not `--gilt`; a 6px radius on a page whose plates have none; an h2 at 52px that outranks the 46px page title; four Caslon question pills with gilt borders; a red disc for Ask.
Why: a second gold and a second ink are two brands on one page; rounded corners and chips are the app vocabulary; the headline hierarchy is inverted.
Now: `.tdask{…background:#0c0f14;isolation:isolate;border-radius:6px}` (ask.css:43); `.tdask .k{…color:#e2c47e}` (48); `.tdask h2{…font-size:52px;…;color:#f6f1e6}` (49); `.tdask p{…color:#d9d2c2;…}` (50); `.tdask .askq{background:rgba(8,10,14,.55);color:#e9e2d2;border-color:rgba(226,196,126,.45)}` (56); `.askq{…;border-radius:14px;…}` (59).
Fix: scope the tokens, so every child uses the system's names.
```css
.tdask{--ink:#f1ebdd;--ink2:#d9d2c2;--ink3:#a8a195;--gilt:#d4b36a;--ground:#0c0f14;--rule:rgba(241,235,221,.28);border-radius:0}
.tdask .k{color:var(--gilt)}.tdask h2{color:var(--ink);font-size:46px}.tdask p{color:var(--ink2)}
.tdaskbar input{border-radius:2px}
.tdask .askq{border:0;background:none;border-radius:0;padding:0;color:var(--ink2);text-decoration:underline;text-decoration-color:var(--rule);text-underline-offset:4px}
.tdask .askq:hover{color:var(--ink);text-decoration-color:var(--ink);border:0}
.tdex{gap:6px 20px}
```
With item 3, `.tdaskbar .btn` becomes bone on the picture by itself. The stronger move is to stop darkening the Van Gogh: build the block on the existing `.hero` pattern (style.css:575, picture right and clean, text on paper left, no scrim).

### 24. The Eye's picture sits in a grey mat with rounded corners
Where: the picture frame and the globe box, eye-desktop.png.
What: a `--paper2` mat, 10px wide, 4px radius, round a picture whose own background is `--ground`; the globe box has the same radius.
Why: museums hang on a hairline; a grey rounded mat is a photo album.
Now: `.eye-pic{margin:0;border:1px solid var(--rule);border-radius:4px;background:var(--paper2);padding:10px;position:relative;min-width:0}` (nav.css:377); `.eye-pic img,.eye-pic canvas{…;background:var(--ground)}` (378); `.eye-globe-host{…;border-radius:4px;background:var(--paper2);…}` (384); `.eye-frame{…;border-radius:2px}` (406).
Fix:
```css
.eye-pic{border-radius:0;background:var(--paper);padding:0}
.eye-pic img,.eye-pic canvas{background:var(--paper)}
.eye-pic figcaption{margin:0;padding:8px 10px 10px;border-top:1px solid var(--rule)}
.eye-globe-host,.eye-frame{border-radius:0}
```

### 25. Four thin rows before the game
Where: level row, its note, "Today, 23 Nov 2026 / Replay a day", "1 of 5 / 0 pts", eye-desktop.png, eye-phone.png.
What: four rows of 12–13px text with 4–16px margins, in four treatments (grey label, pills, grey note, bold gilt count); "Replay a day" breaks into two lines beside its select.
Why: the preamble is taller than the picture's caption; a wrapped three-word label is a flaw.
Now: `.eye-arch{display:inline-flex;gap:8px;align-items:center;…}` (nav.css:432); `.eye-tiernote{flex-basis:100%;font-size:12px}` (408); `.eye-head{…;margin:0 0 10px;…}.eye-pts{color:var(--gilt);font-weight:600}` (375).
Fix:
```css
.eye-arch{white-space:nowrap}
.eye-tiernote{display:none}   /* each tier button already carries the sentence in its title */
.eye-pts{color:var(--ink);font-weight:500;font-family:var(--read)}
```
And one JS move: return the day label from `eyeHead()` (eye.js:179) as the first span of `.eye-head`, and drop the separate `.eye-bar` at eye.js:171 to the select alone; three rows become one.

### 26. Instructions under every picture
Where: "pinch, double-tap or the wheel zooms the picture; drag to move about it" and "drag to turn · tap to pin · pinch, double-tap, the wheel or ＋ to zoom in to a city · arrows and Enter on the keyboard", eye-desktop.png (inferred from eye.js:184).
What: two 90-character hints in 12px grey on every round.
Why: a client is told once; a manual on every page is the sign of a product that does not trust itself.
Now (markup, eye.js:184): the `.eye-hint` span and the `.faint` span inside `.eye-gz`.
Fix: move both sentences into `title` attributes on "Look closer" and on the globe host (markup), then `.eye-hint,.eye-gz>.faint{display:none}`.

### 27. Two sliders, two sets of zoom glyphs
Where: the year dial and the globe zoom in the Eye (inferred from nav.css:386–388 and eye.js:184–185) against the landing's rail and zoom column.
What: the Eye's dial is the native range with `accent-color`; the landing's rail is a custom 2px track with a 16px thumb; the Eye's zoom buttons use the full-width glyphs ＋ (U+FF0B) and － (U+FF0D), drawn from a fallback font, in 3px-radius boxes, while the landing uses ASCII + and − in circles.
Why: the same control in two dresses says two authors.
Now: `.eye-year input[type=range]{width:100%;accent-color:var(--gilt)}` (nav.css:388); `.eye-gz .lk{font-size:16px;line-height:1;padding:2px 8px;border:1px solid var(--rule);border-radius:3px}` (386).
Fix: add `class="wd-range"` to `#eyeYear` (eye.js:185) and set the glyphs to `+` and `−` (U+2212) in eye.js:184; then
```css
.wd-range::-webkit-slider-thumb{background:var(--ink);box-shadow:none}
.wd-range::-moz-range-thumb{background:var(--ink);box-shadow:none}
.eye-gz .lk{width:30px;height:30px;padding:0;border-radius:50%;border-color:var(--rule2);display:inline-flex;align-items:center;justify-content:center;font-family:var(--ui);font-size:17px}
```

### 28. The result block scores in gilt and shouts the verdict
Where: the result after a guess and the day's summary (inferred from nav.css:393–399 and eye.js:191, 206).
What: a 30px gilt Caslon score at a fake weight 500, a bold 600 sans verdict in gilt, then a 22px row of ◆◈◇· glyphs letter-spaced 4px.
Why: gilt is money; a bold sans verdict is a sports score; the glyph row is Wordle.
Now: `.eye-score b{font-family:var(--display);font-size:30px;color:var(--gilt);font-weight:500;margin-right:6px}` (nav.css:393); `.eye-verdict{font-family:var(--ui);font-weight:600;color:var(--gilt);margin-left:4px}` (407); `.eye-big{font-family:var(--display);font-size:44px;line-height:1;color:var(--gilt);font-weight:500}` (398); `.eye-glyphs{font-size:22px;letter-spacing:4px;color:var(--ink2)}` (399).
Fix:
```css
.eye-score b{color:var(--ink);font-weight:400;font-size:28px}
.eye-verdict{font-family:var(--read);font-style:italic;font-weight:400;color:var(--ink2)}
.eye-big{color:var(--ink);font-weight:400}
.eye-glyphs{font-size:13px;letter-spacing:5px;color:var(--ink3)}
```

### 29. The chosen game card wears a double gilt border
Where: "Where & when", eye-desktop.png, eye-phone.png.
What: a gilt border plus a 1px inset gilt shadow: a 2px gold frame on a grey card.
Why: a gold frame is decoration; ink is enough to say "this one".
Now: `.eye-mode.on{border-color:var(--gilt);box-shadow:inset 0 0 0 1px var(--gilt)}` (nav.css:374).
Fix: `.eye-mode.on{border-color:var(--ink);box-shadow:none;background:var(--paper)}`.

### 30. The School's section links are dotted, and nothing is sticky
Where: "The paths  The drills  The ground …", school-desktop.png.
What: eight 12.5px links with 1px dotted underlines in a row; the list below is fifty lessons long, and the row scrolls away with it.
Why: dotted underlines are a 1990s footer; a long syllabus needs its contents line to stay.
Now: `.sc-nav{display:flex;flex-wrap:wrap;gap:4px 14px;font-family:var(--ui);font-size:12.5px;margin:0 0 22px;border-bottom:1px solid var(--rule);padding-bottom:10px}.sc-nav a{color:var(--ink2);text-decoration:none;border-bottom:1px dotted var(--rule2)}` (nav.css:418).
Fix:
```css
.sc-nav{position:sticky;top:calc(var(--top) + env(safe-area-inset-top,0px));z-index:3;background:var(--ground);gap:4px 22px;padding:12px 0 10px;font-family:var(--read);font-size:11.5px;letter-spacing:.14em;text-transform:uppercase}
.sc-nav a{border-bottom:1px solid transparent;padding-bottom:2px}
.sc-nav a:hover,.sc-nav a.on{color:var(--ink);border-bottom-color:var(--ink)}
```
(`a.on` wants a six-line scroll-spy in school.js; optional.)

### 31. The paths are a grey box and each lesson speaks in four voices
Where: "The specialist" card and lessons 1–4, school-desktop.png.
What: a `--paper2` box with a 4px radius, 2,000px tall when open; inside, each lesson is a bold sans title, a grey aim, an 11px uppercase label with the exercise, and a gilt "The answer"; the checkbox is the OS's own.
Why: a grey box that long is a slab; four treatments per item is three too many for a list of fifty.
Now: `.sc-path{border:1px solid var(--rule);border-radius:4px;background:var(--paper2);padding:10px 14px}` (nav.css:420); `.sc-ex .l,.sc-a .l{font-family:var(--ui);font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink2);margin-right:6px}` (423); `.sc-ans summary{cursor:pointer;color:var(--gilt)}` (424).
Fix:
```css
.sc-path{border:0;border-top:1px solid var(--ink);border-radius:0;background:none;padding:12px 0 4px}
.sc-path summary{font-family:var(--display);font-size:20px}
.sc-path summary b{font-weight:400}
.sc-path summary .faint{font-family:var(--read);font-style:italic;font-size:14px}
.sc-lh b{font-family:var(--display);font-weight:400;font-size:17px}
.sc-ex .l,.sc-a .l{font-family:var(--read);font-size:11px;letter-spacing:.14em;color:var(--ink3)}
.sc-ans summary{font-size:13px;color:var(--ink2);text-decoration:underline;text-decoration-color:var(--rule2);text-underline-offset:3px}
```

### 32. Checkboxes turn the operating system's blue
Where: the School's done boxes, the Navigator's "ivory, tortoiseshell, rosewood, coral", school-desktop.png, navigator-desktop.png.
What: `.sc-done input` and `.navform .navcheck input` set no accent colour, so a ticked box is Chrome blue on cream; `.chk input`, `.fctl .f3 input` and `.clflags input` set gilt, so two components disagree.
Why: a stray blue is the one colour the palette forbids.
Now: `.sc-done input{width:15px;height:15px;min-width:15px;margin:0}` (nav.css:422); `.navform .navcheck input{width:auto;margin:0}` (nav.css:10).
Fix (style.css, once): `input[type=checkbox],input[type=radio],input[type=range]{accent-color:var(--ink)}` and delete the per-component `accent-color` lines.

### 33. Views cut hard
Where: every navigation (inferred).
What: `.view{display:none}.view.on{display:block}` swaps the whole page with no transition; the most frequent motion on the site is the only one that has none.
Why: the hard cut is what makes a page feel like a tool rather than a place.
Now: `.view{display:none}.view.on{display:block}` (style.css:95).
Fix:
```css
.view.on{animation:viewin var(--t-base) var(--ease) both}
@keyframes viewin{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
```
(The reduced-motion block at style.css:964 already collapses it.)

### 34. Hovers snap
Where: the menu, the chips, the buttons, the tags, the mode cards, the tiles, the lot titles, the table rows (inferred: no `transition` on any of them).
What: twenty transitions exist in the sheets, with eight durations (.15, .2, .25, .3, .36, .45, .5, .6s) and four curves, and none of them is on the controls a reader touches most.
Why: a colour that changes in 120ms is felt, not seen; one that jumps is seen.
Now: `.nav button:hover{color:var(--ink)}` (style.css:82), `.chip:hover{…}` (87), `.btn:hover{…}` (215), `.lot:hover .t{color:var(--gilt)}` (183), `.tbl tr.clk:hover td{…}` (202), `.wd-mode:hover` (world.css:22), `.eye-mode` (nav.css:372), `.td-game:hover` (433), `.gotile:hover` (ask.css:120): no transition on any.
Fix (style.css, after line 52; tokens in §3):
```css
a,button,.btn,.chip,.tag,.nav button,.wd-mode,.wd-rd,.wd-zb,.eye-mode,.eye-tier,.td-game,.gotile,.upl,.lot .t,.tbl tr.clk td,.sc-nav a{transition:color var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease),background-color var(--t-fast) var(--ease),text-decoration-color var(--t-fast) var(--ease),opacity var(--t-fast) var(--ease)}
```
Then replace the eight durations with `--t-fast`, `--t-base`, `--t-slow` and the four curves with `--ease` / `--ease-exit`.

### 35. The menus pop
Where: the More panel, the search palette, the folded phone menu (inferred).
What: `display:none → flex` with no fade; the More panel lands with a 50px-blur shadow at 35% black.
Why: a panel that appears from nowhere startles; the shadow is a floating window from another operating system.
Now: `.navmore{display:none;position:absolute;right:0;top:calc(100% + 10px);…;box-shadow:0 18px 50px rgba(0,0,0,.35);…}` (ask.css:14); `.navmore.on{display:flex}` (15); `.pal{…;display:none;…}` (style.css:397); `.pal.on{display:flex}` (398).
Fix:
```css
@media (min-width:1101px){
  body:not(.navtight) .navmore{display:flex;opacity:0;visibility:hidden;transform:translateY(-4px);pointer-events:none;box-shadow:var(--shadow-2);transition:opacity var(--t-base) var(--ease),transform var(--t-base) var(--ease),visibility 0s linear var(--t-base)}
  body:not(.navtight) .navmore.on{opacity:1;visibility:visible;transform:none;pointer-events:auto;transition-delay:0s}
}
.pal{display:flex;opacity:0;visibility:hidden;transition:opacity var(--t-fast) var(--ease),visibility 0s linear var(--t-fast)}
.pal.on{opacity:1;visibility:visible;transition-delay:0s}
```
Also in the panel, `.navgrp>b{font-family:var(--ui);font-weight:600;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--gilt);…}` (ask.css:277): set it in the eyebrow style of item 11 (Caslon, 11.5px, .14em), not bold sans.

### 36. Loops and a hover zoom
Where: the live dot, the mini-world ring, the ECG beat, the station ring's dashes, the journey pictures (inferred).
What: four looping animations (`livepulse` 2.4s, `ringpulse` 2.4s, `ecgbeat` 1.8s, `ringturn` 60s) and a 1.03 scale on hover.
Why: a pulsing dot is a notification; a picture that grows under the cursor is a shop.
Now: `.chip.live.on i{…animation:livepulse…}` (ask.css:40); `.miniworld .ring{…animation:ringpulse 2.4s ease-out infinite;…}` (style.css:889); `.ecg .beat{…animation:ecgbeat 1.8s ease-out 3s infinite}` (901); `.journey:hover .jpic img{transform:scale(1.03)}` (640).
Fix: `animation:none` on the first three; delete the scale. Keep the 60-second `ringturn` on the station ring and the globe's own turn; those two are slow enough to be furniture rather than signals.

### 37. Focus rings on click, and a red one round the globe
Where: any field clicked with a mouse; the globe when tabbed to (inferred).
What: inputs use `:focus`, not `:focus-visible`, so a click into the Hammer search draws a 2px gold box; the canvas gets a 2px red outline; the Eye's globe uses an inset box-shadow instead; four ring recipes in all.
Why: a ring belongs to the keyboard; a mouse click should darken the field's rule and nothing else.
Now: `input:focus,select:focus,textarea:focus,button:focus-visible,a:focus-visible,[tabindex]:focus-visible{outline:2px solid var(--gilt);outline-offset:2px}` (style.css:54); `.wd-cv:focus-visible{outline:2px solid var(--live)}` (world.css:10); `.eye-globe:focus-visible{box-shadow:inset 0 0 0 2px var(--gilt)}` (nav.css:385); `.ring:focus-visible{outline:2px solid var(--gilt)}` (style.css:676).
Fix:
```css
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--ink)}
input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible,a:focus-visible,[tabindex]:focus-visible,.wd-cv:focus-visible,.ring:focus-visible{outline:var(--ring);outline-offset:var(--ring-off);box-shadow:none}
.eye-globe:focus-visible{box-shadow:none;outline:var(--ring);outline-offset:-2px}
```

### 38. Thirty-five font sizes, sixteen line-heights, seventeen trackings
Where: all four sheets.
What: sizes from 9px to 96px in 35 steps, with half-pixel values (10.5, 11.5, 12.5, 13.5, 14.5, 15.5, 16.5); line-heights from 1 to 1.7 in 16 steps; trackings from −.02em to .2em in 17 steps; and Caslon Display asked for weight 500 in seven rules when the face loads at 400 only (`.eye-mode b`, `.eye-score b`, `.eye-big`, `.sc-sec h2`, `.sc-sec h3`, `.eye-league h3`, `.td-game b`).
Why: the eye reads a scale as calm even when it cannot name it; it reads a drift as noise.
Now (examples): `.kpi .l{font-size:13px}` / `.kpi .d{font-size:12.5px}` / `.kpi .src{font-size:11px}` (style.css:139–144): three sizes inside one tile; `.wire .h{font-size:14.5px}` / `.wire .s{font-size:13px}` / `.wire .o{font-size:12px}` / `.wire .d{font-size:12.5px}` (288–293): four in one row.
Fix: the six-step scale in §3; `font-weight:400` wherever the display face is used.

### 39. Measures and orphans
Where: Today's dek ("… for everything / else."), today-desktop.png; the Hammer dek's link, hammer-desktop.png; the currency reading and the analyst's answers (inferred).
What: the Today dek ends on a one-word line; the Hammer dek sets its link at 12px inside 16px text; `.fx-read` runs 980px at 19px (≈90 characters); `.md` has no measure at all (≈100 characters in the Ask column).
Why: an orphan and a wrong-sized link are the two things a proofreader marks first.
Now: `.head .dek{…max-width:66ch;…}` (style.css:98, no `text-wrap`); `.lnk{font-size:12px;color:var(--gilt);text-decoration:underline dotted;…}` (614); `.fx-read{…font-size:19px;…;max-width:980px;…}` (981); `.md{font-family:var(--read);font-size:15.5px;line-height:1.65;…}` (ask.css:138).
Fix:
```css
.head .dek,.wd-read,.view>.lead,.sig p,.story p,.md p{text-wrap:pretty}
.dek .lnk{font-size:inherit;white-space:normal}
.fx-read{max-width:66ch}
.md{max-width:68ch}
```

### 40. Thirteen neutral tokens, a dozen hard-coded greys, and two temperatures of grey
Where: `:root` and the sheets.
What: `--ground --ground2 --paper --paper2 --rule --rule2 --ink --ink2 --ink3 --flap --grid --shade --cx`, plus #f1ebdd, #d9d2c2, #e9e2d2, #f6f1e6, #6d6a61, #16201b, #0e1714, #0b1512, #0c0f14, #0d1015 and six `rgba(241,235,221,…)` written inline; in the light theme `--ink2:#5a5e66` has a blue cast while `--ink3:#6d6a61` and the paper are warm.
Why: two greys of different temperature on one line look dirty; the eye cannot say why.
Now: `--ink:#15181d; --ink2:#5a5e66; --ink3:#6d6a61` (style.css:26 and 38).
Fix: three greys of one temperature (§3): `--grey-1:#575750` (6.4:1 on the page), `--grey-2:#6d6a61` (4.8:1, keep), `--grey-3:#dcd6c9` (hairline); the inline values replaced by tokens.

### 41. Four golds, two reds, an undefined green, a hyperlink blue
Where: the sheets.
What: `--gilt`, `--gilt2`, `--c1` (#B58522/#9A6E10), the hero's #e2c47e and the Reel's #e3c97f are five gilts; `--live` and `--claret` are two reds fifteen degrees apart on the same panel (the landing eyebrow in one, the currents in the other); `var(--ok,#2f7d4f)` is used three times (nav.css:233, 256, 280) for a token that does not exist, so a fourth green sits beside `--verd`; `--lapis:#2f5fc4` is the blue of an unvisited link.
Why: colour discipline is the whole difference between a bank and a brochure.
Now: `--c1:#B58522; --c2:#CC5A74; --c3:#5B8FEA` (style.css:14); `.oc-dir.rising{color:var(--ok,#2f7d4f);…}` (nav.css:233).
Fix: one gilt, one claret (with `--live` aliased to it), `var(--verd)` in the three rules, `--lapis:#35589f` light / `#96b0e4` dark (§3).

### 42. Gilt as decoration
Where: the wordmark's "HASTA", the plate corners, the text selection, the counters "0/10" and "0 pts", the lesson progress, the sort arrow, the group captions of the More panel (world-desktop.png, school-desktop.png, hammer-desktop.png).
What: the design plan says "gilt stays for money, as a figure colour, never a decoration"; the sheets use it for the brand, for 9px corner ticks on every plate, for selected text, for counts that are not money, for captions.
Why: a colour used everywhere means nothing where it matters: the prices.
Now: `.brand .word b{font-weight:400;color:var(--gilt)}` (style.css:73); `.plate::before,.plate::after{…border-color:var(--gilt);…opacity:.7}` (107); `::selection{background:var(--gilt);color:var(--ongilt)}` (56); `.sc-cnt{…color:var(--gilt)}` (nav.css:420); `.sc-prog b{color:var(--gilt)}` (417).
Fix:
```css
.plate::before,.plate::after{display:none}
::selection{background:color-mix(in srgb,var(--ink) 14%,transparent);color:inherit}
.sc-cnt,.sc-prog b{color:var(--ink2)}
```
The two-tone wordmark is a brand decision; my view is one colour: `.brand .word b{color:inherit}`.

### 43. Twelve radii, seven shadows
Where: the sheets.
What: radii of 1, 2, 3, 4, 6, 7, 8, 10, 12, 14, 20 and 999px on rectangles; shadows of `0 1px 4px`, `0 10px 30px` (twice), `0 18px 50px`, `0 20px 60px` (twice), `0 30px 80px`, and glows.
Why: a catalogue has one corner and one shadow, or none.
Now (examples): `.wd-card{…border-radius:8px;…box-shadow:0 20px 60px rgba(0,0,0,.35)}` (world.css:63); `.oc-tide,.oc-coll,.oc-case{…border-radius:10px;…}` (nav.css:226); `.dealcase{…border-radius:10px;…}` (205); `.livefx{…border-radius:8px;…}` (style.css:1156); `.rep.next{…border-radius:8px;…}` (958); `.pal .box{…box-shadow:0 30px 80px rgba(0,0,0,.5);…}` (399).
Fix: `--r:2px` for fields and buttons, 0 for plates and cards, 50% only for round controls; `--shadow-1` and `--shadow-2` (§3); every `border-radius:[4–20]px` on a rectangle becomes `var(--r)` or 0.

### 44. Five ways to underline a link
Where: the sheets.
What: `a:hover` solid; `.lnk`, `.ref`, `.dtab summary`, `.kpi .src`, `.dprint`, `.oc-foot .lk` dotted; `.sc-nav a` dotted border; `.navsrc a` a transparent border that turns gilt; `.wd-cityk` a `--rule2` underline; `.colophon .credit a` a 40% border; `.br-memo .src a` a 45% underline.
Why: one link style is a rule of the house.
Now: `a{color:var(--gilt);text-decoration:none}a:hover{text-decoration:underline;text-underline-offset:3px}` (style.css:50–51).
Fix:
```css
a,.lnk,.ref,.wd-cityk,.navsrc a,.colophon .credit a,.br-memo .src a,.br-src .src a,.br-desk .src a,.br-wall .src a{color:var(--gilt);text-decoration:underline;text-decoration-thickness:1px;text-decoration-color:color-mix(in srgb,currentColor 35%,transparent);text-underline-offset:3px;border-bottom:0}
a:hover,.lnk:hover,.ref:hover,.wd-cityk:hover{text-decoration-color:currentColor}
```

### 45. Thirty button styles
Where: the sheets.
What: `.btn`, `.btn.primary`, `.btn.sm`, `.chip`, `.wd-mode`, `.wd-rd`, `.wd-go`, `.wd-list`, `.wd-play`, `.wd-lens`, `.wd-zb`, `.wd-strip button`, `.wd-vaults`, `.lk` (bare), `.eye-gz .lk` (boxed), `.eye-tier`, `.eye-mode`, `.td-game`, `.gotile`, `.readon button`, `.tag` as filter (three variants: 2px, 12px, ink-filled), `.askq`, `.tdaskbar .btn`, `.rbtn`, `.copy`, `.linkrow a`, `.sortb`, `.trmore summary`, `.dtab summary`: about thirty.
Why: a reader learns two shapes; after that each new shape is a question.
Now: `.btn{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--rule2);border-radius:2px;padding:7px 13px;font-size:13px;color:var(--ink);background:var(--paper2);white-space:nowrap}` (style.css:214).
Fix: keep two (§3): the quiet button (transparent, hairline, ink) and the solid button (ink on paper). Everything else becomes a text link (item 44) or a tab (item 12). The card-buttons (`.eye-mode`, `.td-game`, `.gotile`, `.upl`, `.readon button`) share one card rule (§3).

### 46. Phone: targets under 40px
Where: the ⌕ and ◐ circles and "Menu" (28px tall), the level pills (26px), the readings (24px), the mode tabs; world-phone.png, eye-phone.png, today-phone.png.
What: `.chip{padding:5px 9px}` gives a 28px hit; `.eye-tier{padding:3px 10px}` 26px; `.wd-rd{padding:4px 10px}` 24px.
Why: a control that misses under the thumb is the cheapest feeling a page can give.
Now: `@media (max-width:900px){… .chip{padding:5px 9px;position:relative} …}` (style.css:440); `.eye-tier{font-family:var(--ui);font-size:13px;padding:3px 10px;…}` (nav.css:408).
Fix:
```css
@media (max-width:900px){
  .tools .chip{min-width:40px;min-height:40px;justify-content:center;padding:0 8px}
  .eye-tier,.wd-rd,.wd-mode,button.tag,.btn.sm{min-height:36px;display:inline-flex;align-items:center}
}
```

### 47. Phone: the mode tabs wrap, the zoom buttons sit on the globe
Where: "The / Eye" broken over two lines inside the control; + and − over the globe's lower rim, world-phone.png.
What: six tabs do not fit 358px, so one tab is two lines tall; the zoom pair is pulled 52px up over the map.
Why: a control that wraps inside itself is broken; buttons on top of the artwork are an afterthought.
Now: `.wd-modes{display:inline-flex;…}` (world.css:20, no nowrap); `@media (max-width:760px){.wd-zoomctl{position:static;order:0;flex-direction:row;justify-content:flex-end;gap:8px;padding:0 14px;margin:-52px 0 12px;position:relative;z-index:3}…}` (190).
Fix:
```css
@media (max-width:760px){
  .wd-modes{max-width:100%;overflow-x:auto;scrollbar-width:none;gap:16px}   /* .wd-lead already pads 16px */
  .wd-mode{white-space:nowrap;flex:none}
  .wd-zoomctl{margin:6px 0 4px;padding:0 16px}
}
```

### 48. Phone: the Eye opens with 300px of cards and eleven lines of lead
Where: eye-phone.png.
What: four stacked 70px cards after an 11-line paragraph; the picture is below the fold by two screens.
Why: the game is the point; on a phone it should be the first thing after the title.
Now: `@media (max-width:860px){…;.eye-modes{grid-template-columns:1fr};…}` (nav.css:404).
Fix:
```css
@media (max-width:860px){
  .view>.lead{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .eye-modes{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .eye-mode{padding:10px 12px}.eye-mode small{display:none}
}
```

### 49. Phone: the masthead and the page disagree by 8px
Where: "SUBHASTA" at x = 24, "The art market" at x = 16, today-phone.png, eye-phone.png, world-phone.png.
What: `.mast .in` keeps `padding-inline:24px` while `main` drops to 16px under 900px; the three masthead chips are two circles and one pill.
Why: see item 7; and three shapes for three buttons is the same disorder in miniature.
Now: `.mast .in{…;padding-inline:24px;…}` (style.css:70); `@media (max-width:900px){… main{padding:20px 16px 60px} …}` (441).
Fix: `@media (max-width:900px){.mast .in{padding-inline:16px}.tools .chip{border:0;background:none;border-radius:0}}`.

### 50. Dark theme: the readings and the chips lose their edge
Where: world-dark.png.
What: `.wd-rd` draws a `--rule2` (#343c49) border on a 70% `--paper2` fill, so the chips are barely bounded; the hot `--live` (item 3) burns in the eyebrow and the Ask disc; the masthead chips are `--paper` (#12151b) on an 88% ground, nearly the same tone.
Why: dark is where the register is easiest to win (the globe proves it) and where loud accents hurt most.
Now: `--rule:#242a34; --rule2:#343c49` (style.css:9); `.chip{…background:var(--paper)}` (86).
Fix: items 3, 9 and 12 resolve it (text tabs, underlined readings, no pills); if any chip remains, `:root{--rule2:#3d4553}` gives it an edge at 1.9:1 against the plate.

---

## 3. A system

Ready to paste at the top of `style.css`. The dark values stay the default, as the page already has it; the light block follows. The current token names are kept as aliases, so nothing breaks while the sheets are moved over. Note: `--paper` keeps its present meaning (the plate), which is why the page tone is `--paper-0`.

```css
:root{
  /* type: six sizes, six leadings. Caslon Display for 4–5, Caslon Text for 3, Instrument Sans for 0–2. */
  --t-0:11px;   --lh-0:1.45;   /* labels, eyebrows and captions, uppercase, tracked */
  --t-1:13px;   --lh-1:1.5;    /* secondary interface: meta, table small, notes, flags */
  --t-2:14.5px; --lh-2:1.5;    /* interface body: table cells, forms, menus, chips */
  --t-3:16px;   --lh-3:1.6;    /* reading: deks, leads, answers, captions in prose */
  --t-4:20px;   --lh-4:1.2;    /* section heads, card titles, prices */
  --t-5:46px;   --lh-5:1.04;   /* page titles; the landing alone may clamp(34px,4.1vw,60px) */
  --track-caps:.14em;          /* every uppercase run at --t-0 */
  --track-display:-.005em;     /* every display line at --t-5 */
  --display:"Libre Caslon Display","Libre Caslon Text",Georgia,"Times New Roman",serif;
  --read:"Libre Caslon Text",Georgia,"Times New Roman",serif;
  --ui:"Instrument Sans","Helvetica Neue",Arial,sans-serif;
  --mono:"IBM Plex Mono",Menlo,Consolas,monospace;

  /* space: eight steps; margins and paddings take one of these and nothing else */
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:24px; --s-6:32px; --s-7:48px; --s-8:72px;

  /* colour, dark (the default) */
  --paper-0:#0b0d11;  /* the page */
  --paper-1:#12151b;  /* a plate */
  --paper-2:#181c24;  /* a field, a hover */
  --ink:#ece7dc;
  --grey-1:#aaa49a;   /* secondary text */
  --grey-2:#948f85;   /* tertiary text, captions; 5.3:1 on a plate */
  --grey-3:#242a34;   /* the hairline */
  --gilt:#d4b36a;  --on-gilt:#1d1808;
  --claret:#d46d7b; /* the one red: sold, this week, closed, down */
  --lapis:#96b0e4;  /* the one blue: out-flows, cool, vaults */
  --verd:#8fcab0;   /* kept for open / up; not in the brief, but the gates need it */
  --chev:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23948f85' stroke-width='1.2'/%3E%3C/svg%3E");

  /* shape */
  --r:2px;            /* fields and buttons; plates and cards take 0; round controls take 50% */
  --hair:1px solid var(--grey-3);
  --shadow-1:0 1px 2px rgba(0,0,0,.25);
  --shadow-2:0 12px 32px rgba(0,0,0,.5);
  --ring:1px solid var(--gilt); --ring-off:2px;

  /* motion */
  --t-fast:120ms;  /* colour, border, opacity on a control */
  --t-base:220ms;  /* a panel, a view, a card */
  --t-slow:420ms;  /* a drawer, a picture */
  --ease:cubic-bezier(.2,.6,.2,1);
  --ease-exit:cubic-bezier(.4,0,1,1);

  /* aliases: the names the sheets use today */
  --ground:var(--paper-0); --ground2:color-mix(in srgb,var(--paper-0) 92%,var(--ink)); --paper:var(--paper-1); --paper2:var(--paper-2);
  --ink2:var(--grey-1); --ink3:var(--grey-2); --rule:var(--grey-3); --rule2:color-mix(in srgb,var(--grey-3) 70%,var(--ink));
  --gilt2:var(--gilt); --ongilt:var(--on-gilt); --live:var(--claret); --live2:var(--claret); --onlive:var(--paper-0);
  --c1:var(--gilt); --c2:var(--claret); --c3:var(--lapis); --cx:var(--grey-2);
  --grid:color-mix(in srgb,var(--ink) 8%,transparent); --shade:rgba(4,6,10,.6); --flap:var(--paper-1);
  --top:64px; --max:1320px; color-scheme:dark;
}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){
  --paper-0:#f4f1ea; --paper-1:#fbf9f4; --paper-2:#f2eee6;
  --ink:#15181d; --grey-1:#575750; --grey-2:#6d6a61; --grey-3:#dcd6c9;
  --gilt:#876513; --on-gilt:#fff7dc; --claret:#a33349; --lapis:#35589f; --verd:#2c7666;
  --chev:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%236d6a61' stroke-width='1.2'/%3E%3C/svg%3E");
  --shadow-1:0 1px 2px rgba(0,0,0,.06); --shadow-2:0 12px 32px rgba(0,0,0,.16);
  --shade:rgba(40,50,40,.3); --onlive:#fff; color-scheme:light;
}}
:root[data-theme="light"]{ /* the same block, verbatim */ }
```

The components, in the same vocabulary:

```css
/* type roles */
.caps{font-family:var(--read);font-size:var(--t-0);letter-spacing:var(--track-caps);text-transform:uppercase;font-variant:normal}   /* eyebrows, menu, legends, table captions, flags */
.eyebrow{display:block;font-family:var(--read);font-size:var(--t-0);letter-spacing:var(--track-caps);text-transform:uppercase;font-variant:normal;color:var(--gilt);margin-bottom:var(--s-1)}   /* replaces the small-caps rule at ask.css:3 */

/* two buttons */
.btn{display:inline-flex;align-items:center;gap:var(--s-2);border:1px solid var(--rule2);border-radius:var(--r);padding:8px 14px;font-family:var(--ui);font-size:var(--t-1);font-weight:500;color:var(--ink);background:transparent;white-space:nowrap;transition:color var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease),background-color var(--t-fast) var(--ease)}
.btn:hover{border-color:var(--ink);color:var(--ink);text-decoration:none}
.btn.primary{background:var(--ink);color:var(--ground);border-color:var(--ink)}
.btn.primary:hover{background:color-mix(in srgb,var(--ink) 88%,var(--ground));color:var(--ground)}
.btn[disabled]{opacity:.45;cursor:not-allowed}

/* one card (plates, mode cards, tiles, journeys) */
.card{border:var(--hair);background:var(--paper);border-radius:0;padding:var(--s-4) var(--s-5);box-shadow:none;transition:border-color var(--t-fast) var(--ease)}
.card:hover,.card.on{border-color:var(--ink)}

/* one table */
.tbl{font-size:var(--t-1)}
.tbl th{font-family:var(--read);font-style:italic;font-weight:400;font-size:var(--t-1);color:var(--ink3);border-bottom:1px solid var(--ink);padding:var(--s-2) var(--s-3)}
.tbl td{padding:var(--s-3);border-bottom:var(--hair);vertical-align:top}
.tbl tr.clk:hover td{background:var(--paper2)}
.tbl td.money{font-family:var(--display);font-size:var(--t-3);color:var(--gilt);text-align:right;font-variant-numeric:lining-nums tabular-nums}

/* one chip: a word with a hairline under it when it is on */
.tag{display:inline-block;font-family:var(--read);font-size:var(--t-0);letter-spacing:var(--track-caps);text-transform:uppercase;color:var(--ink3);border:0;border-bottom:1px solid transparent;border-radius:0;padding:2px 0;margin-right:var(--s-3);background:none;transition:color var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease)}
.tag.on,.tag:hover{color:var(--ink);border-bottom-color:var(--ink)}
.tag.rec{color:var(--gilt)}.tag.heat{color:var(--claret)}.tag.cool{color:var(--lapis)}

/* one ring */
:focus-visible{outline:var(--ring);outline-offset:var(--ring-off)}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--ink)}

/* one field */
input,select,textarea{font-family:var(--ui);font-size:var(--t-2);color:var(--ink);background:transparent;border:0;border-bottom:1px solid var(--rule2);border-radius:0;padding:8px 0;width:100%}
select{appearance:none;-webkit-appearance:none;padding-right:22px;background:var(--chev) no-repeat right 4px center}
textarea{border:1px solid var(--rule2);padding:var(--s-3)}
input[type=checkbox],input[type=radio],input[type=range]{accent-color:var(--ink)}
```

---

## 4. Ten first moves

1. Give the Eye and the School the page head: `.view>h1` and `.view>.lead` (items 1–2, CSS, two rules).
2. Retire red as an action colour: `.btn.primary`, `.wd-go`, `.tdaskbar .btn` in ink; `.wd-eye` in gilt; `--live` aliased to `--claret` (item 3, CSS).
3. Set the masthead in true capitals at 11.5px/.14em, one colour, a 2px ink mark that meets the bar's rule, the tools as text behind a hairline (items 8–11, CSS).
4. Turn the landing's pills into lines: text tabs for the modes, underlined figures for the readings, an underlined ask field; move the gutter to 64px (items 7, 12–14, CSS).
5. Quiet the Hammer: no stripes, italic records instead of boxes, sort arrows only where they act, text actions in the summary, semantic flags (items 15–18 and 4, CSS plus one markup line).
6. Fix the three layout faults: the level row, the orphan card, the stretched fieldsets (items 5, 6, 19, CSS, three declarations).
7. One corner, one hairline, two shadows, no gilt ornament: `--r`, `--hair`, `--shadow-1/2`; delete the plate corners, the glows, the gilt selection (items 42–43, CSS).
8. Let it move: a 220ms fade on every view change, 120ms colour transitions on every control, a fade for the More panel and the palette (items 33–35, CSS).
9. One focus ring, on the keyboard only; a darkened rule on click (item 37, CSS).
10. The phone: 40px targets, tabs that scroll instead of wrap, zoom buttons under the globe, a 16px masthead gutter, two-up game cards (items 46–49, CSS).

---

Irritants listed: 50 (several fold two or three faults into one entry).
CSS-only: 47 of the 50.
Need one line of markup or JS beside the CSS: 3 (items 4, 26, 27); five more carry an optional JS refinement beyond their CSS (items 14, 20, 21, 25, 30).
Not judged from the screenshots: hover and focus states as rendered, the open More panel and the palette, the globe's side card, the drawer, the result and summary blocks after a guess, the Hammer at phone width, the Reel, font loading (FOUT), the feel of the motion, and whether Libre Caslon Text's small caps are in fact synthesised (inferred from the weight difference visible in the masthead).
