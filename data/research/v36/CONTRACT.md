# v36 research contract — 1812 in depth; the economy of Russia on the map

The rules of ../v35/CONTRACT.md hold unchanged (bilingual {en, ru} fields; facts only as reputable sources state them; `src` lists
only URLs you opened or saw in a search result — never invent or edit a URL; `vf` V/S/U; `ll: [lat, lon]`; Gregorian `date` plus
`date_os` for Russia before 1918; Wikipedia titles exact; pictures only Wikimedia Commons files under PD/CC0/CC BY/CC BY-SA, checked;
JSON with `asof`, rows, `notes`; validate with python3 -m json.tool). Apolitical: nothing after 2022; no present-day war.

## war1812.json — `{asof, battles, events, monographs, sources, wp, textbook, notes}`
- battle: `{id, n, date:[from,to] or "YYYY-MM-DD", date_os, ll, place, side_fr:{cmd, men, losses}, side_ru:{cmd, men, losses}
  (numbers as the cited source gives them; a range as a string "28,000–35,000"; vf U when historians disagree, and say so in t),
  outcome, wiki, pic?, t (≤ 500 chars), src, vf}` — every engagement a school atlas shows: Mir, Saltanovka, Ostrovno, Vitebsk,
  Klyastitsy, Kobrin, Smolensk, Valutino, Shevardino, Borodino, Tarutino, Maloyaroslavets, Vyazma, Krasnoi, Polotsk I–II, Chashniki,
  Berezina, and the partisan actions (Davydov, Figner, Seslavin, Vasilisa Kozhina, Gerasim Kurin).
- event: `{id, y, date, date_os, ll?, place?, n, t, kind (crossing|council|fire|manifesto|appointment|retreat|winter|diplomacy|
  partisans|home-front), wiki?, src, vf}` — the Niemen 24 June; Alexander's manifestos; Barclay to Kutuzov; Fili; the fire of
  Moscow; Napoleon's peace letters; Lauriston at Tarutino; the 29th Bulletin; the Smorgon departure; the Niemen again; also the
  home front (militia, Rostopchin's broadsheets, the evacuation of Moscow, prices, the Moscow lost: houses burnt, as sources state).
- monograph: `{id, who, n, y, lang, publisher?, about (≤ 300 chars: what it argues, why a teacher would use it), url (a catalogue,
  publisher, library or Wikipedia page you opened), vf}` — Tarle, Troitsky, Bezotosny, Lieven, Zamoyski, Mikaberidze, Popov,
  Sokolov, Clausewitz, Bogdanovich, Mikhailovsky-Danilevsky, Ségur and the rest a university reader is sent to; 15–25.
- source: the v35 source shape (`{id, n, kind, who, y, date?, place?, ll?, lang, text_url, excerpt?{ru?,en?} (public domain only,
  ≤ 500 chars), about, tags, src}`) — Alexander's manifestos (6 July, 18 July), Kutuzov's reports, Rostopchin's broadsheets (афишки),
  the bulletins of the Grande Armée (the 29th in full text), Ségur, Caulaincourt, Bourgogne, Labaume, Durova, Davydov's diary,
  Fyodor Glinka's Letters of a Russian officer, Wilson; 15–30, full texts on Wikisource, Runivers, Gallica, Gutenberg.
- wp (War and Peace): `{scenes:[{id, vol, part, ch, y, date?, place, ll, h, t (≤ 400 chars, what happens), who:[character ids],
  real:[real person ids or names], quote?:{ru, en (Garnett 1904 or Maude 1922–23, public domain), src}, battle?, src}] (30–50,
  1805–1812, with every 1812 scene: the ball at Vilna, Balashov, the Bald Hills, Smolensk, Bogucharovo, Borodino with Pierre on
  the Raevsky battery, Prince Andrei's wound, Fili, Moscow abandoned, the Rostovs' carts, Pierre in Moscow and the fire, Mytishchi,
  Platon Karataev, Tarutino, the partisans and Petya, Krasnoi, the death of Karataev, Pierre freed); characters:[{id, n, role,
  prototype:[{n, wiki?, note, src}], real?: bool}] (the main families and the real people in the novel: Kutuzov, Bagration,
  Napoleon, Alexander, Rostopchin, Barclay, Raevsky, Davydov (and Denisov)…)}`.
- textbook: `[{grade, title, authors, publisher, y, chapter, para, n (the paragraph's title), url, vf}]` — where 1812 sits in the
  current Russian school history course and its textbooks (the federal programme FOP; the grade-9 History of Russia books, and the
  new single textbooks if they reach 1812 — verify which grades they cover; do not guess paragraph numbers: give them only as seen).

## stories_1812.json — the v35 story shape, two stories
- "war-and-peace-1812": Tolstoy's 1812 told on the globe through the novel's people — each step a scene at its place and date,
  with the real event beside it (h, t ≤ 600, quote, people, wiki or pic), 16–24 steps.
- "home-front-1812": the people's war — militia, partisans, Moscow's fire and return, the burned towns, the soldiers' winter;
  12–18 steps.

## economy.json — `{asof, sites, waterways, trade, notes}` — Russia and the Eurasian lands around it, to 2022
- site: `{id, n, kind (ironworks|copper|silver|gold|salt|coal|oil|mine|armoury|shipyard|mint|mill|textile|factory|plant|hydro|dam|
  port|fair|timber|railway-works|nuclear|space), founded:{y, by?}, closed?:{y}, ll, place, what (≤ 250 chars), wiki, pic?, src, vf}`
  — 120–180 sites from Muscovy to 1991 (a few to 2022 where they matter: hydro, oil): the Tula armoury, the Demidov works (Nevyansk,
  Nizhny Tagil), Yekaterinburg, the Olonets works, Izhora, Sestroretsk, the Admiralty, Voronezh, Kolyvan and Nerchinsk silver, the
  Urals salt (Solikamsk, the Stroganovs), the Moscow and Ivanovo mills, Putilov, Obukhov, Sormovo, Baku oil and the Nobels, the
  Donbas coal and Yuzovka (as historical sites), Magnitogorsk, Kuznetsk, Norilsk, Dneproges, the Volga and Angara–Yenisei hydro
  stations (Volzhskaya, Bratsk, Krasnoyarsk, Sayano-Shushenskaya), Baikonur, Obninsk, the timber ports (Arkhangelsk, Igarka).
- waterway: `{id, n, kind (canal|waterway|railway|road|tract), opened:{y}, route:[[lat,lon],...] (8–30 points), what, wiki, src, vf}`
  — the Vyshny Volochyok system, Ladoga canal, Mariinsky, Tikhvin, Northern Dvina canal, the Moscow canal, White Sea–Baltic, Volga–Don,
  the Siberian Tract, the Trans-Siberian railway (opened in sections), the Nikolaev railway, BAM.
- trade: `{id, n, from, to, partner (country or people), route:[[lat,lon],...], goods:{en,ru}, what, wiki, src, vf}` — the route from
  the Varangians to the Greeks, the Volga route, Novgorod and the Hansa, Arkhangelsk and the Muscovy Company, Kyakhta and China, the
  Caspian and Persia, the Black Sea grain from Odessa, the Russian-American Company, the Baltic trade of St Petersburg; 12–20.
