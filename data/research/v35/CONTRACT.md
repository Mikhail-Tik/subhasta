# v35 research contract — Russia in depth, bilingual (EN/RU)

Subhasta's historical globe ("Then") becomes an educational atlas. v35 builds Russia in depth as the model region: its rulers, their
places and journeys, the school canon of literature (grades 8–11) tied to the authors' lives and the real people behind the
characters, guided stories (presentations on the globe), primary sources, cities and their old photographs. Every row is bilingual.

## Rules (all files)
- **Bilingual.** Every human-readable field is an object `{"en": "...", "ru": "..."}`. English: British spelling, short declarative
  sentences, typographic ’ and “ ”. Russian: literary Russian, «ёлочки», ё where standard. Translate names the way the English and
  Russian Wikipedias do (Ivan the Terrible / Иван IV Грозный).
- **Facts only as reputable sources state them.** Each row carries `src: [["label", "url"], ...]` — only URLs you actually opened or
  saw in a search result. **Never invent or edit a URL.** `vf`: "V" (checked in a source you opened), "S" (a reputable secondary
  source you opened, not re-checked), "U" (an estimate or a disputed figure; say so in the text). Numbers always carry a source.
- **Dates.** `y` integer year (negative = BC). Where a day is known: `date` "YYYY-MM-DD" in the Gregorian calendar (new style); for
  Russia before 14 Feb 1918 add `date_os` (Julian, old style) when the source gives it. Ranges as `[from, to]`.
- **Places.** `ll: [lat, lon]` decimal degrees (a point you can defend: the city centre, the monastery, the battlefield); `place:
  {"en","ru"}`. Use historical and modern names together where they differ: "Kyiv (Kiev)", "Киев".
- **Wikipedia.** `wiki: {"en": "Exact title", "ru": "Точное название"}` — the title exactly as in the article's URL, decoded (spaces,
  not underscores). The page shows the article's lead picture and its summary in the reader's language, so a right title matters
  more than anything else. Give `en` whenever an English article exists; `ru` when you saw it (it can be resolved at view time).
- **Pictures.** Only Wikimedia Commons files under Public Domain, CC0, CC BY or CC BY-SA, checked on the file page:
  `pic: {"file": "Exact file name.jpg", "page": "https://commons.wikimedia.org/wiki/File:...", "author": "...", "lic": "Public domain
  | CC BY-SA 4.0 | ...", "year": 1890, "cap": {"en","ru"}}`. No auction-house or press photographs. No work whose maker died after
  1955 unless the file page shows a free licence. Paintings of events (Vereshchagin, Roubaud, Surikov, Repin, Vasnetsov, Kivshenko,
  David, Gros, Adam …), engravings, Prokudin-Gorsky, Karl Bulla and other photographs before 1917 are the core.
- **Searches.** The whole team shares 200 web searches this turn. Keep to your cap (in your brief). Prefer opening a page you found
  and following its links: a Wikipedia list or article, a Commons category page (it lists file names), a Wikisource index, a
  curriculum PDF page. A category page of Commons can give fifty file names in one fetch.
- **Files.** Write JSON with `"asof": "2026-11-25"`, the rows, and `"notes"` (what is thin or open). Validate it
  (`python3 -m json.tool file > /dev/null`). UTF-8, no comments. Do not edit other files in the repository.

## Shapes

### rulers.json — `{asof, dynasties:[...], rulers:[...], notes}`
- dynasty: `{id, n, from, to}` (e.g. rurikids, godunov, shuisky, romanov, holstein-gottorp-romanov, provisional, soviet, federation)
- ruler: `{id, n, title, dyn, born:{y,date?,date_os?,place,ll}, died:{...}, buried:{place,ll}?, reign:[{from, to, title, date_from?,
  date_to?}], capitals:[{place, ll, from, to}], places:[{y, place, ll, what}] (residences, monasteries, exile, campaigns, the
  places that tell the reign: 3–10), journeys:[{id, n, from, to, pts:[{ll, y, date?, place, what?}], src}] (dated points in order:
  a campaign, an embassy, a pilgrimage, an exile; 0–4), events:[{y, date?, date_os?, n, t, ll?, src?}] (4–10, with places), wiki,
  pic?, t (≤ 400 chars: who they were and what the reign changed), src, vf}`

### literature.json — `{asof, curriculum:{src, grades:{"8":[...],"9":[...],"10":[...],"11":[...]}, hist:{"8":[...],...}},
  authors:[...], works:[...], notes}`
- author: `{id, n, born:{y,date?,place,ll}, died:{...}, buried?, wiki, life:[{y, place, ll, what}] (8–20 dated steps: birth,
  school, service, exile, estate, travels, the places where the works were written, death), pic?, t, src, vf}`
- work: `{id, author, n, written:[from,to], published, grades:[...], kind, setting:[{place, ll, what}], characters:[{n, role,
  prototype?:{n, wiki?, note}}], real:[{n, wiki?, note}] (historical people who appear), quote?:{ru, en, where, src} (public-domain
  text only: the Russian original and a public-domain English translation, ≤ 300 chars), wiki, t, src, vf}`

### stories.json — `{asof, stories:[...], notes}` — guided stories, played on the globe step by step
- story: `{id, n, years:[from,to], lede, grades?:[...], steps:[{y, date?, date_os?, ll, z (zoom 1–6: 1 the world, 3 a country,
  5 a city), h (heading), t (≤ 600 chars), pic? or wiki? (a Wikipedia article whose lead picture fits), route?:[[lat,lon],...],
  people?:[ruler or author ids], quote?:{ru, en, who, when, src}, src}], synchrony?:[{y, place, ll?, t, src}] (what happened
  elsewhere the same years), src}`

### sources.json — `{asof, sources:[...], notes}` — primary sources
- source: `{id, n, kind (chronicle|law|letter|memoir|diary|decree|manifesto|treaty|telegram|speech|declaration|travel|poem|
  petition), who, y, date?, place?, ll?, lang, text_url (a full text you opened: Wikisource, a library), excerpt?:{ru?, en?}
  (public domain only, ≤ 500 chars), about (≤ 300 chars), tags:[story ids, ruler ids], src}`

### cities.json — `{asof, cities:[...], pastvu?:{pattern, checked_url}, notes}`
- city: `{id, n, ll, founded:{y, what}, pop:[[year, thousands, "source label", "url"], ...], landmarks:[{n, ll, built:[from,to],
  arch?, wiki, pic?}], photos:[pic objects with "year" and "cap"], wiki, t, src}`

### us.json — `{asof, declaration:{...}, signers:[{n, state, born, died, wiki}], places:[...], synchrony:[...], notes}`
