# Translating Subhasta into Russian — rules for every translator

Input: data/i18n/src/<file>.json — {"key": "English"}. Output: data/i18n/ru/<same file name> — {"key": "Русский"} with exactly the
same keys. Work in batches of about 150 keys: write data/i18n/ru/<file>.part<k>.json for each batch, then merge them with python
into the final file, check that every key is there (`set(src) == set(ru)`), validate the JSON and delete the parts.

Style: natural, literary, precise Russian as a good Russian museum or encyclopedia would write it; short sentences stay short. «ёлочки»
for quotation marks („лапки“ inside), a spaced em dash —, ё where standard. Names of people, places and states in the forms of the
Russian Wikipedia and Russian historiography (Kievan Rus’ → Киевская Русь, Golden Horde → Золотая Орда, Charlemagne → Карл Великий,
Hurrian kingdoms → хурритские царства, Bantu → банту, Minoan → минойская цивилизация, Ur → Ур). Titles of artworks in their usual
Russian titles when they have one, otherwise translated, with the original in brackets only when it helps.
Dates: "3000 BC" → «3000 г. до н. э.», "AD 1" → «1 г. н. э.», "about 1185" → «около 1185 г.», "the 18th century" → «XVIII век»,
"1790s" → «1790-е». Numbers: decimal comma (1,5), thin space or plain space for thousands (10 000), "million" → млн, "billion" →
млрд, "$190.4m" → «190,4 млн $», "£1.2m" → «1,2 млн £», "%" stays. Measures stay as they are.
Placeholders: "#" stands for a number or a value the page fills in. Keep every "#" — the same count, in a sensible order for Russian
grammar is not possible to change, so keep them in the same order. Never translate HTML entities, code, CSS classes, identifiers,
selectors or URLs: if a key is code ("btn primary", "#eyeReviewList", ",fromType:f.fromType||"), return it unchanged.
Proper names of firms and brands stay as they are: Subhasta, Christie’s, Sotheby’s, Phillips, Bonhams, Artnet, Wikimedia Commons.

Glossary of the product (use these exactly):
The Eye → «Глаз» · The Hammer → «Молоток» · Then → «Тогда» · Now → «Сейчас» · Net → «Сеть» · Shifts → «Сдвиги» · Notes →
«Заметки» · Today → «Сегодня» · The School → «Школа» · Ask → «Спросить» · Navigator → «Навигатор» · Walls → «Стены» · Tides →
«Приливы» · Library → «Библиотека» · Movements → «Течения» · Menu → «Меню» · More → «Ещё» · Play → «Пуск» · Pause → «Пауза» ·
round → раунд · level → уровень · Novice / Easy / Standard / Expert → «Новичок» / «Лёгкий» / «Стандарт» / «Эксперт» ·
lot → лот · hammer price → цена молотка · buyer’s premium → премия покупателя · estimate → эстимейт · low / high estimate →
нижний / верхний эстимейт · private sale / private treaty → частная продажа · provenance → провенанс · consignment →
консигнация · the trade → арт-рынок · sale room → торговый зал · white glove → «белые перчатки» (всё продано) · bought in →
снят с торгов · withdrawn → отозван · V / S / U (verified / secondary / unverified) → оставить буквы, пояснения «проверено» /
«вторичный источник» / «не проверено» · a source → источник · the year card → карточка года · the rail → шкала времени.
