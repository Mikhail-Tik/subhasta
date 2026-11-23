# Common rules for the Subhasta v29 research briefs

You are researching for "Subhasta", an art-market terminal (a single-page web app) that cites every figure. Your output is a JSON file; a human-readable summary comes back in your final message.

Rules that are not negotiable:
1. Every fact carries a source you actually opened in this session: `src` = [["label", "https://..."], ...]. Never invent, guess or reconstruct a URL. If you could not open a page, do not cite it. Prefer primary sources (the law itself on an official site, the authority's own guidance page, the house's or fair's own site, the regulator's publication, a company's own filing), then the trade press (The Art Newspaper, Artnet News, ARTnews, Artsy, Apollo), then the general press (FT, Bloomberg, Reuters, NYT).
2. Flag every entry `vf`: "V" when read on a primary source, "S" when from a secondary source, "U" when you could not confirm it and are carrying it from memory or a weak page. Say in `note` what is uncertain. "From memory" means your own background knowledge; never the user's memory store, which you must not read.
3. Record the state of things as of today (16 November 2026). Where a rule or a price changed recently, say when. Where you cannot establish the current rule, say so rather than guessing.
4. Figures carry their unit and their date (e.g. "9% GST on import (Singapore, 2024)"). Money in the original currency with a US$ conversion where the source gives one; do not convert yourself.
5. British spelling, short declarative sentences. Typographic apostrophes (’) inside strings are fine; keep JSON valid (escape double quotes). No markdown inside strings.
6. Budget: at most 25 web searches and 40 page fetches; write the JSON file EARLY (after the first batch) and overwrite it after every further batch, so a stop never loses the work. Spend them on primary sources first. Use WebSearch (mode "standard"; "extended" only when a standard search comes back thin) and WebFetch. If a site refuses, note it and move on; do not retry the same site more than once. Artnet's site refuses fetches: carry its items only as other outlets relay them, flagged so.
7. Write the JSON to the output path given in your brief with the Write tool, then verify it parses (`python3 -I -c "import json;json.load(open('...'))"`). The final message: the path, how many entries, what you could not confirm, and the three most important things you found.
8. Do not edit anything in /home/claude/rostrum. Do not send e-mail or messages. Do not create artifacts. Do not read the user's memory store.

## People, allegations and rumours (the people rules)

The page will be shown to investors and to people in the trade, and it names real people. So: a fact about a person is stated only as a reputable source states it, with the source's own words for anything contested; a sanctions designation, a charge, a conviction, a settlement, an acquittal or a dismissal is stated with its date and authority, and a case that ended in acquittal or dismissal says so in the same line; an allegation is attributed ("the Panama Papers reported…", "the SDNY alleged…", "the FT reported, citing…") and never upgraded to fact; a rumour goes in a `rumour` field, attributed to who printed it and when, never as a finding; wealth figures are the publisher's (Forbes, Bloomberg Billionaires) with the date; nothing about health, family members who are not public figures, home addresses or anything private. Where a person's link to a matter is only a family relationship (a spouse, an ex-spouse, a child), say exactly that and nothing more.

## The law and the controls (the compliance rule)

The terminal is a compliance reading, never a route around a control. Where a task runs into a law (sanctions, an export licence, anti-money-laundering checks, CITES, a cultural-property claim, tax), state the law with its authority, citation, threshold and date; the control that enforces it; the case where it caught someone; and what the lawful course is (a licence, a declaration, a refusal). Never describe a structure, a jurisdiction or a sequence as a way to avoid a control. If a source describes an evasion, state it as the case the control caught, with the outcome.

## The worked case (the schema the terminal renders)

A worked case is a real task a real kind of person has, solved on the record: who (a persona, not a named private individual), where, what they want; then the sections the terminal shows as a memo. Every figure in it carries its source in the section's `src`. The persona's own words may open the case (one line). The sections:

{"id": "slug", "persona": "a Sotheby's specialist in London | a collector in Singapore | ...", "where": "city", "task": "one line, the task in the persona's words", "kind": "buy | sell | move | lend | borrow | insure | give | value | check | open | claim | settle | report", "artist": "when the case names one", "category": "the Hammer's category where one applies", "sum": "the sum or band, with its source",
 "reading": "the market for it now: the figures, the comparables, what the trade says — 3–8 sentences, every figure sourced",
 "money": "what it costs end to end, line by line with the rate, the authority and the date: premium, commission, VAT/GST/duty, shipping, insurance, storage, licences, legal, tax on the gain",
 "road": [ {"n": "the step", "who": "the office, the house, the shipper, the lawyer", "doc": "the form or document", "time": "the time the authority states", "fee": "", "src": [...], "vf": ""} ],
 "walls": [ {"n": "the law or control", "cite": "the citation", "authority": "", "threshold": "", "date": "", "what_it_does": "", "case": "the case where it caught someone, as the record states it", "src": [...], "vf": ""} ],
 "people": "whom to call: the kinds of specialist, shipper, lawyer, insurer, bank, in the cities on the road (name firms only as reputable sources name them for this kind of work; no private individuals)",
 "calendar": "the dates that matter: the next sales for the category, the licence lead times, the tax year, the fair",
 "whispers": "what the trade printed about this artist, category or route in the last twelve months, attributed and dated",
 "risks": ["the things that go wrong, each with the case or figure behind it"],
 "value_left": "where the houses and the trade leave value on the table in this task — what they do not do, what they charge for it, what the persona cannot get from them today (sourced where a figure is given)",
 "next": ["the first five things the persona should do, as a checklist"],
 "src": [["label","https://..."]], "vf": "", "note": ""}
