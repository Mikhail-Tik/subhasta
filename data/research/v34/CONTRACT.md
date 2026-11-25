# v34 research contract — the living globe, ten times denser

Every agent writing into `data/research/v34/` follows this file. The engine (`src/world.js`) and the generator
(`tools/gen_history.py`) read these shapes; a row that breaks them is dropped by the generator, so keep to them.

## House rules (verbatim from the project)
- British spelling. Short declarative sentences. Typographic apostrophe (’). No exclamation marks.
- Every figure is sourced and flagged: `vf` is `V` (read in a primary source: the treaty text, the archive, the museum’s own page,
  the UN table), `S` (a reputable secondary source: Wikipedia with its own citations, Britannica, a university page, a major
  newspaper), `U` (unconfirmed — say why in `unconfirmed`).
- **Never fabricate a URL.** Every URL in `src` was fetched in this session and the page says what the row says. If a page could not
  be fetched, use a URL you did fetch or mark the row `U` with the reason. A Wikipedia URL is fine as a secondary source.
- People: facts about a living or recently dead person only as a reputable source states them, with role and date; allegations
  attributed; nothing private.
- Public-domain images only (the image hunt has its own section).
- Not investment, legal or tax advice. No route around any control.
- Coordinates are `[lat, lon]` in decimal degrees, two decimals. Years are integers, negative for BC (`-323` = 323 BC); `-43000` is the
  earliest the rail shows, `2026` the latest.
- Text fields (`t`, `life`, …) are plain text, no markdown, no HTML, 1–3 sentences unless the field says otherwise.
- Write the file early and update it as you go (the generator reads whatever is there); never leave invalid JSON on disk — write to a
  temporary file and rename.

## 1. `events.json` — the century’s events (agent A)
```
{"asof":"2026-11-24","status":"…","events":[ … ],"unconfirmed":[{"id":"…","why":"…"}]}
```
One event:
```
{"id":"armada-1588","n":"The Spanish Armada","from":1588,"to":1588,"kind":"battle","tier":1,
 "ll":[50.1,-1.4],"route":[[43.36,-8.4],[49.4,-4.5],[50.9,1.1],[58.5,-6.0],[53.0,-10.5]],"when":[1588,1588,1588,1588,1588],
 "fig":"130 ships, about 30,000 men","t":"Philip II’s fleet of about 130 ships sails from Lisbon and A Coruña to carry an army from Flanders to England; fireships at Calais, the battle of Gravelines and the storms of the Atlantic return fewer than 70 ships home.",
 "src":[["Wikipedia, Spanish Armada","https://en.wikipedia.org/wiki/Spanish_Armada"],["Royal Museums Greenwich, The Spanish Armada","https://www.rmg.co.uk/stories/topics/spanish-armada"]],"vf":"S",
 "c":1500}
```
- `kind` is one of: `battle`, `siege`, `war`, `campaign`, `conquest`, `founding`, `fall`, `treaty`, `revolution`, `invention`,
  `science`, `religion`, `plague`, `migration`, `voyage`, `journey`, `disaster`, `trade`, `art`, `event`.
  (`voyage` = a ship’s route; `journey` = a person’s travels on land or sea, e.g. Marco Polo, Peter the Great’s Grand Embassy,
  Casanova, Goethe in Italy, Darwin on the Beagle; `campaign` = an army on the move; `migration` = a people on the move;
  `plague` = an epidemic spreading.)
- `tier` is 1, 2 or 3: tier 1 = the three or four events of the century everyone should see at a glance (the globe shows them at
  every zoom); tier 2 = the next six (shown from 1.6×); tier 3 = the rest (shown from 2.4×). Each century from 3000 BC to AD 2000
  gets about 10 events in all (3–4 of tier 1, ~6 of tier 2, the rest tier 3); centuries before 3000 BC get 1–3 events each for the
  first settlements, the domestications and the first cities (Göbekli Tepe, Jericho, Çatalhöyük, Monte Verde, Norte Chico…).
- `c` is the century key: `from` rounded down to the century (`1588` → `1500`, `-323` → `-400`).
- `route` (optional) is a polyline of `[lat, lon]`, 3–12 points, for kinds `campaign`, `conquest`, `voyage`, `journey`, `migration`,
  `plague`; `when` (optional, same length as `route`) gives the year each point is reached so the engine can travel the road at the
  real pace (the Black Death: Kaffa 1347 → Messina 1347 → Marseille 1348 → Paris 1348 → London 1348 → Bergen 1349 → Moscow 1352).
- `fig` (optional) is the one figure worth remembering, with its unit (ships, dead, km, tonnes of silver).
- `ll` is where the event is (a battle’s field, a city, a treaty’s town); for a route, the point the label stands on (usually the end).
- Balance the globe: every century must carry the Americas, Africa, East and South Asia, the steppe and Oceania where the record
  has them, not only Europe and the Near East. Pre-Columbian America in particular: Monte Verde, Clovis, maize and potato
  domestication, Caral/Norte Chico, Olmec, Chavín, Teotihuacan, the Maya classic cities and their collapse, Tiwanaku, Wari, Cahokia,
  Chaco Canyon, the Toltecs, Chichén Itzá, the Mississippian towns, Tenochtitlan (1325), the Inca expansion (1438–1533),
  the Chimú sacrifice at Huanchaco (c. 1450, about 140 children — the National Geographic / Nature reports), Maya dental inlays of
  jade and pyrite, coca in the Andes, the first contact and the epidemics.
- The specific asks that must be in: the Spanish Armada with its numbers; Vasco da Gama to India (1497–99, route); the East India
  Company (1600 charter; Plassey 1757; Company rule to 1858); Gutenberg’s press (c. 1450) and the Bible (1455); the first church in
  Rome and the papacy’s milestones (Peter’s traditional death c. 64–68, Edict of Milan 313, Nicaea 325, the Great Schism 1054,
  Luther 1517); Hadrian’s Wall (122); the Peace of Westphalia (1648); the Napoleonic wars with the main battles and the Russian
  campaign route (Niemen June 1812 → Smolensk → Borodino 7 Sept → Moscow 14 Sept → Berezina Nov); Peter the Great’s Grand Embassy
  1697–98 (route Moscow → Riga → Königsberg → Amsterdam/Zaandam → London → Vienna); Russia reaching the sea (Azov 1696, St Petersburg
  1703, Nystad 1721, Kuchuk-Kainarji 1774, Crimea and the Black Sea Fleet 1783); Casanova’s travels (Venice, Paris, London,
  St Petersburg 1765 …); Marco Polo; Ibn Battuta; Magellan–Elcano; Cook; Humboldt; Darwin; Goethe’s Italian journey; Lomonosov’s walk
  to Moscow (1730); the great battles of every age (Kadesh, Marathon, Gaugamela, Cannae, Actium, Teutoburg, Adrianople, Tours,
  Talas, Hastings, Manzikert, Hattin, Ain Jalut, Kulikovo, Agincourt, Constantinople 1453, Lepanto, Sekigahara, Vienna 1683,
  Poltava, Plassey, Saratoga, Trafalgar, Austerlitz, Waterloo, Gettysburg, Sedan, Tsushima, the Marne, Verdun, the Somme,
  Stalingrad, Midway, Normandy, Dien Bien Phu …); the inventions and sciences (the wheel, bronze, iron, the alphabet, coinage,
  paper, the compass, gunpowder, printing, the telescope, the steam engine, vaccination, the railway, the telegraph, anaesthesia,
  the telephone, electric light, the motor car, flight, radio, penicillin, the transistor, the pill, the moon landing, the web, the
  smartphone, mRNA vaccines); religion (the Buddha, Confucius, Zoroaster, the Temple, Christ, Muhammad and the hijra, the Reformation,
  the Council of Trent, the Sikh Khalsa, the Mormons…).

## 2. `peoples.json` — migrations, epidemics, population (agent B)
```
{"asof":…,"migrations":[…],"epidemics":[…],"population":{…},"unconfirmed":[…]}
```
- `migrations`: events in the shape of §1 with `kind:"migration"`, plus `"who":"Yamnaya herders"`, `"genes":"about half the ancestry of
  Bronze Age northern Europeans is steppe-derived (Haak et al. 2015)"` (one sentence on what ancient DNA says, with its source in
  `src`), `"n_people":"…"` (a stated scale where sources give one: the Atlantic slave trade 12.5 million embarked). Cover: out of
  Africa, the peopling of the Americas, Austronesians, Anatolian farmers into Europe (with the Hadrian’s Wall remark — the genetic
  frontier the Wall never was), Yamnaya/Indo-Europeans, Bantu, Sea Peoples, Greek colonisation, Celts, Germanic migrations, Slavs,
  Vikings, Magyars, Turks, Mongols, Polynesians to Aotearoa, the Atlantic slave trade, Irish famine emigration, the Great Migration,
  Russians after 1917, Partition 1947, Palestinians 1948, the Vietnamese boat people, Syrians 2015, Ukrainians 2022.
- `epidemics`: events with `kind:"plague"`, `route` + `when` as the disease spread, `"dead":"…"` (the toll as stated, with its source),
  `"agent":"Yersinia pestis"`. Cover: the Plague of Athens, the Antonine Plague, the Plague of Cyprian, the Plague of Justinian, the
  Black Death (route by year), later plagues (London 1665, Marseille 1720, Moscow 1771), smallpox in the Americas (1520 Tenochtitlan),
  the cholera pandemics (1817–1923, routes), the Russian flu 1889, the 1918 influenza (route and toll), polio, HIV/AIDS, SARS, Ebola
  2014, COVID-19 (route from Wuhan, the WHO toll and the excess-death estimate).
- `population`: `{"world":[[year,millions],…]}` from 10000 BC to 2024 (a cleaned series: HYDE / McEvedy & Jones / UN WPP 2024, each
  point with its source key), `"projection":{"src":[…],"years":[2030,2040,…,2100],"world":[…],"regions":{"Africa":[…],"Asia":[…],
  "Europe":[…],"Latin America and the Caribbean":[…],"Northern America":[…],"Oceania":[…]},"peak":{"year":2084,"millions":10290,
  "src":…}}` from the UN World Population Prospects 2024 (medium variant), so the rail can run to 2080 and show Africa’s share.

## 3. `centuries.json` — the life of each century, the thinkers and their works, the cities (agent C)
```
{"asof":…,"centuries":[{"y":1700,"life":"…","smell":"…","food":"…","trouble":"…","src":[…],"vf":"S"}],
 "works":[{"id":"aristotle","n":"Aristotle","works":[{"t":"Metaphysics","y":-340},{"t":"Nicomachean Ethics","y":-340}],"src":[…]}],
 "cities":[{"id":"london","n":"London","ll":[51.51,-0.13],"moments":[{"y":43,"n":"Londinium founded","t":"…","src":[…],"vf":"S"}]}]}
```
- `life`: 60–90 words on what the century felt like for most people (work, the house, the town, what they feared); `food`: one
  sentence on what people ate; `smell`: one sentence on what a city smelled of (woodsmoke, tanneries, horses, coal, diesel);
  `trouble`: one sentence on the century’s political and social problems (the questions people fought over). From 3000 BC to 2000
  (51 centuries); shorter for the millennia before.
- `works`: for every philosopher and thinker in `data/research/v33/history.json` (`role` philosopher, theologian, scientist,
  mathematician, physicist, writer where the works matter) the 2–4 main works with their years; use the existing `id`.
  Add thinkers the v33 list lacks (Zeno, Epicurus, Plotinus, Avicenna, Averroes, Maimonides, Aquinas, Ockham, Machiavelli, Bacon,
  Hobbes, Spinoza, Leibniz, Berkeley, Hume, Rousseau, Smith, Hegel, Schopenhauer, Mill, Kierkegaard, Nietzsche, Peirce, Husserl,
  Wittgenstein, Heidegger, Arendt, Sartre, de Beauvoir, Rawls…) as full people rows (`{"id","n","born","died","ll","city","role",
  "t","src","vf"}` as in v33) in a `people` list.
- `cities`: 24 cities, 10–16 dated moments each (founding, walls, the cathedral or the great mosque, the great fire, the plague, the
  bridge, the railway, the population passing 100,000 / a million, the architecture of each age — London from Londinium to the
  Victorian city and the Shard; New York from Lenape Manhattan and New Amsterdam 1624 to the grid, the skyscrapers and 9/11;
  Seoul from Hanyang 1394; Tokyo from Edo 1603; St Petersburg 1703; Moscow 1147; Rome; Constantinople/Istanbul; Paris; Venice;
  Florence; Vienna; Jerusalem; Athens; Alexandria; Baghdad; Cairo; Beijing; Kyoto; Delhi; Mexico City/Tenochtitlan; Cusco; Lima;
  Lagos). Each moment with its source.

## 4. `today.json` — the world now (agent D)
```
{"asof":"2026-11-24","conflicts":[{"id":"ukraine","n":"Russia’s war in Ukraine","ll":[48.5,37.5],"since":2022,"parties":"Russia; Ukraine",
  "status":"war","t":"…(what stands today, with the date of the last development)","src":[…],"vf":"S"}],
 "events":[{"id":"…","n":"…","date":"2026-11-..","ll":[…],"t":"…","src":[…],"vf":"S"}],
 "movements":{"byzantine":{"owners":[{"n":"Sinai, St Catherine’s Monastery","what":"the sixth-century Christ Pantocrator","src":[…]}],
  "sync":"…what the world was doing while this art was made, one paragraph…","src":[…],"vf":"S"}}}
```
- `conflicts`: every armed conflict active in November 2026 (search the Council on Foreign Relations Global Conflict Tracker, UCDP,
  ACLED, Crisis Group’s CrisisWatch and the Wikipedia list of ongoing armed conflicts — read what they say now, in November 2026, not
  what you remember); `status` is `war`, `conflict`, `ceasefire` or `frozen`; `t` says what the latest sourced development is, with
  its date. 25–40 rows. Nothing speculative; attribute every claim.
- `events`: the ten or so important things happening in the world this month (summits, elections, disasters, launches), each with a
  date and a source.
- `movements`: for each of the 58 movements in `src/data_movements.js` (ids there): the 3–5 collections that hold the key works
  today (the museum and the work), and `sync`: 60–90 words on what the world was doing when the movement was made (who ruled, what
  war, what invention, what people argued about) — the synchrony the reader can hold against the pictures.

## 5. The image hunt — `pictures/` and `pictures.json` (agent E)
Only public-domain images, and only bytes the session can reach: the shell reaches `raw.githubusercontent.com`,
`objects.githubusercontent.com`, `media.githubusercontent.com` and `api.github.com` (code search works) — nothing else (no
Wikimedia, no museums). Sources known to work:
- OpenStax textbooks (`github.com/openstax/osbooks-world-history`, `osbooks-us-history`, `osbooks-introduction-philosophy`,
  `osbooks-introduction-anthropology`, …): `modules/m*/index.cnxml` holds every figure with its caption and a credit line
  (`credit: “…” by …/Wikimedia Commons, Public Domain` or `CC0 1.0`); the file is `media/<name>`. Take only figures whose credit says
  Public Domain or CC0 and is not a modification by OpenStax of a non-PD work; keep the credit line verbatim.
- Standard Ebooks cover paintings (`raw.githubusercontent.com/standardebooks/<author>_<title>/master/images/cover.source.jpg`,
  colophon at `src/epub/text/colophon.xhtml` names the painting, year and painter) — all US public domain.
- The Wikipedia-for-Schools 2007 set in `github.com/epfl-ada/ada-2024-project-adaventure` (`data/wikispeedia_articles_html/wpcd/images/
  <n>/<id>.jpg` with `<id>.jpg.htm` beside it, which states the licence) — small (250–400 px), good for card thumbnails only.
- Project Gutenberg HTML editions mirrored by `github.com/GITenberg/<Title>_<id>` (`images/` folders, engravings from books
  published before 1930 — e.g. the Pharos after Fischer von Erlach or Thiersch, the Colossus, Babylon’s gardens).
- GitHub code search (`api.github.com/search/code?q=<name>+extension:md`) finds repositories that reference an image file by name;
  the image is then fetched from that repository’s raw path. Check the licence on the Commons description page (WebFetch
  `https://commons.wikimedia.org/wiki/File:<name>` reads the page text) before taking it.
Wanted, in this order: (1) the 47 wonders in `data/research/v33/history.json` → `wonders` (reconstructions and photographs: the
Pharos, the Colossus, the Hanging Gardens, the Temple of Artemis, the Mausoleum, the Statue of Zeus, Giza, Babylon’s Ishtar Gate,
Persepolis, the Parthenon, the Colosseum, the Pantheon, Hagia Sophia, Angkor, Chichén Itzá, Teotihuacan, Machu Picchu, the Great
Wall, Borobudur, Petra, the Taj Mahal, Notre-Dame, Chartres, Cologne, St Peter’s, the Kremlin, Himeji…); (2) prehistoric art
(Lascaux, Chauvet, Altamira, the Cederberg San paintings, Bhimbetka, Sulawesi) — photographs or Breuil’s copies; (3) icons and
altarpieces for the pre-1900 movements lacking pictures (`byzantine`: the Sinai Pantocrator, Rublev’s Trinity, the Deësis of Hagia
Sophia, the Vladimir Mother of God; `egypt`: the Narmer palette, Nefertiti, the Book of the Dead; `greekroman`: the Parthenon
frieze, the Alexander mosaic, Pompeii; `gothic`: Giotto’s Arena Chapel, Duccio’s Maestà, the Wilton Diptych; `chineseink`: Fan
Kuan, Guo Xi, Ma Yuan); (4) pictures for the events of §1 where a public-domain painting, engraving or photograph exists (the Armada,
Waterloo, the Beagle, the Black Death woodcut, the 1918 influenza wards, the moon landing — NASA images are public domain but NASA’s
site is unreachable; take them from a GitHub mirror if one is found).
For each image: save the bytes to `data/research/v34/pictures/<key>.<ext>` (≤ 1600 px on the long side, JPEG quality 82 — resize
with Pillow), and a row in `pictures.json`:
```
{"key":"pharos-heemskerck","for":{"wonder":"pharos"},"t":"The Pharos of Alexandria, hand-coloured engraving after Maarten van Heemskerck, 1572",
 "a":"Maarten van Heemskerck","y":"1572","c":"…where the original is…","w":1200,"h":880,"lic":"public domain (the artist died in 1574; the photograph of a two-dimensional work carries no copyright in the US — Bridgeman v. Corel)",
 "evidence":"https://commons.wikimedia.org/wiki/File:Pharos_of_Alexandria.jpg","u":"https://raw.githubusercontent.com/<repo>/<path>","src_repo":"<owner/repo>","vf":"S"}
```
`for` names what the picture illustrates: `{"wonder":"<id>"}`, `{"movement":"<id>"}`, `{"event":"<id>"}`, `{"city":"<id>"}`,
`{"person":"<id>"}`. A picture whose licence cannot be shown is not taken. Aim for the best resolution available; note `w`/`h`.
