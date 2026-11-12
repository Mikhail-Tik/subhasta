# Subhasta — monetisation, parts two to four (November 2026)

*A working note for the owner. Part one (the Circle: Reader, Private, Desk; the Brief; the invitation flow) is in the page itself. This note is about what v24 added and how it earns.*

## What the terminal now does that a reader would pay for

| Corner | What it does | Who needs it | Why they would pay |
|---|---|---|---|
| **The Navigator** | Takes a work, a route and the money, and returns the gates (sanctions, AML, export licence, import, wildlife, papers, tax at home), the steps with their papers and times, and a landed-cost ledger with every line sourced and flagged. 22 jurisdictions, 115 primary and secondary sources, one worked case. | A collector moving between homes; a private-sales advisor pricing a deal across borders; a family office deciding where a work should sit; a lawyer or shipper checking the other side’s rules | The alternative is three professionals’ time (a shipper, a customs broker, a lawyer) for a first answer that the Navigator gives in a minute, with the law cited. The precise quote still comes from them; the Navigator tells the buyer what to ask and roughly what it costs. |
| **The Season** | Eighty fairs, sales, biennales, shows and openings to June 2027, with the organiser’s own ticket page where there is one, the published price, and why the desk lists it. Members mark where they are going; the room sees who will be there. | Anyone building a year in the market; a gallery planning fairs; a collector choosing two weeks of travel | A calendar is free; a curated one with the reasons and the room’s presence is the thing the trade press sells subscriptions on. |
| **The Horizon** | Eighteen theses on the next ten to thirty years, each with its evidence lines, its risks and the record it rests on, linked to the terminal’s movements, artists and places. | A collector with a long horizon; an advisor writing a client letter; a student (the owner) with a thesis to defend | Research notes of this shape are what the private banks’ art-advisory desks circulate to clients; here they are sourced line by line and open to the reader’s own test. |
| **The money’s stories** | Nine new Atlas entries: the Sotheby’s securitisation, ADQ, OFSI, the Art Market Integrity Act, FATF, the 2027 EU rulebook, Coromandel, Masterworks, the Louvre’s uninsured jewels; two vital signs ($34–40bn of loans; $2.56tn of art wealth); a sculpture signal. | Anyone whose question is “how does money move through art” | It is the finance reading of the market, which the market itself rarely writes down. |

## The tiers, restated

**Reader (free).** Everything on the page, including the Navigator, the Season and the Horizon, because the sources are public and the value of the terminal is that it is read. Free is the funnel: the page is on the owner’s résumé and in the hands of the people he writes to.

**Private (on request; the number to test is $40–60 a month, or $400 a year).** One reader, one desk. Adds: the Brief by e-mail after each refresh; the Navigator with the reader’s own cases saved and a printed plan; the Season with the room’s “going” list and the opt-in contact lines; the Horizon’s theses as a quarterly letter; priority corrections. The buyer is a collector, a junior at a house or a gallery, a student of the field.

**Desk (on request; the number to test is $2,500–5,000 a year a seat, or a flat $15,000 for a house).** Adds: the data as CSV and JSON after each refresh (lots, houses, hubs, regimes, segments, the calendar, the events, the Navigator’s rules); custom lenses; an analyst’s hour each month; a Navigator route checked by a named specialist (shipper or lawyer) under a referral agreement; early access. The buyer is an advisory firm, a family office, a house’s private-sales desk, a logistics firm that wants its clients to arrive informed.

## Three further lines, in order of effort

1. **The Navigator as a referral desk.** Every plotted route ends in a professional’s quote: a shipper, a broker, an insurer, a lawyer. A referral fee on the introduction (the shippers and insurers pay these routinely) turns the free tool into income without charging the reader. Needs: two or three named firms per corridor, a disclosure line on the page, and a form that sends the plan (never the reader’s identity without consent).
2. **The Season as a ticket and travel partner.** The organiser’s ticket page is linked already; affiliate links where fairs offer them, and a “two weeks in the market” itinerary service for Desk members (the owner’s own planning, sold as a service).
3. **The data as an API.** The Desk tier’s CSV and JSON, served as a versioned endpoint with a key, for the firms that want to put the sale room, the regimes and the Navigator’s rules into their own systems. Price by seat and by call volume; the live desk already refreshes the files on a schedule.

## What stays free, and why

The sources, the flags and the worked cases stay free because they are the proof. A Navigator that hid its law behind a paywall would be a worse product and a weaker résumé line. What is sold is the reader’s own state (saved routes, the Brief, the room), the data in bulk, and the owner’s time.

## The next numbers to collect

- How many readers plot a route, and which corridors (the Navigator stores the last route in the browser only; a count needs the page’s store, opt-in).
- How many mark an event as “going” (the members’ cards carry it; the count is a query on `members`).
- Which theses are opened most (the trail records it in the browser; a count needs the store).

*Every figure in the page carries its source and flag; the prices above are the owner’s to test, not the desk’s findings.*

---

# Part three: the Net, the Transformation, and what a bank would pay for (v25)

*The owner’s brief for v25: more value behind every piece of information, only what matters; the finance direction behind every major sale since the pandemic; every big player on every significant market, where they sit, who fronts them, whom they represent; the art trade’s net on the globe with regional zoom; and a mapper that walks a sum from cash in Dhaka through a work in a sale room and a Geneva freeport to a bank account in Toronto, as a compliance reading. This part says what that adds and who pays for it.*

## What v25 added

| Corner | What it does | The number behind it |
|---|---|---|
| **The Net** (the globe’s fifth mode) | 124 players (31 houses, 49 dealers, 9 advisors, 12 lenders, 4 free ports, 7 storage firms, 7 insurers, 5 shippers) at their seats, their offices as a web, who fronts them and whom they represent; 18 markets in a paragraph each; the money behind 71 major sales since 2020 as arcs from the consignor’s city to the room and from the room to the buyer, replayable year by year; five lenses that zoom the globe into a region. | 124 players · 36 cities · 71 flows, $5.1bn · 254 office arcs · every player sourced and flagged (5 V, 26 S, 93 U) |
| **The money behind a lot** | Every one of the 71 lots in the Hammer carries who consigned it, who stood behind it (house, third party, irrevocable bid), who bought it and from where, and where the money went. Fifteen major sales the terminal lacked were added. | 71 lots with their money · 15 new lots |
| **The Transformation** | A sum, where it starts and in what form; a room; where the work is kept; the way back (sale, loan, gift, keep); where the proceeds go. Six stages the regulators watch, each open, conditional or closed, with the rule, the cost, the red flags and the sources; the ledger of what the sum buys, what the way in costs (27–38%), what the work must earn to come back whole, and what arrives; what the receiving bank sees; the typologies and the public cases; the framework the gates rest on. Five worked cases. | 8 stage rules from the research · 32 capital regimes · 7 typologies · 8 cases |
| **The ten further jurisdictions** | Bangladesh, Canada, Argentina, Egypt, Nigeria, Pakistan, Turkey, Indonesia, Vietnam and Israel join the Navigator with their export, import, AML, sanctions, apostille, wildlife and, new, capital-control rules; the Navigator gains a gate for the buyer’s money (“the money’s road”). | 32 jurisdictions · 117 source links |
| **The audit** | A fresh agent re-derived every figure the Navigator’s engine computes against its sources: 22 findings, 18 figures confirmed, 12 fixes applied (intra-EU no import VAT, India’s art treasures, Korea’s exemption, the freeport’s release at 8.1%, temporary admission for consignments, the Gulf duty, China 1% + 13%, India 5%, the UK ban with no price threshold, the dated CBR cap, the euro AML threshold, the VAT base note). | 22 findings · 13 items still unconfirmed, listed in the research bundle |
| **The value strips** | Under every section head: what the section is worth to a collector, to an advisor or dealer, and to a banker or lender. | 23 sections × 3 audiences |

## What a private bank, a broker or a house would pay for

**1. The Net as an onboarding and coverage file (Desk tier, and the first API product).** A private bank’s art-advisory desk and a lender’s credit team keep, by hand, exactly what the Net holds: who the counterparties are, where they sit, who fronts them, whom they represent, who owns them, and the sourced line behind each. Sold as a quarterly file (JSON and CSV) with the sources and flags, it is a coverage map a junior would take a month to build and could not keep current. The research desk refreshes it on a schedule. Price to test: inside the Desk seat ($2,500–5,000 a year) and, as a file alone, $1,500 a year a desk.

**2. The money behind the sales as a signal.** The consignor-to-room-to-buyer arcs, with the guarantees, are the finance reading of the sale room that the houses do not publish in one place. For a lender it is the demand map (who is buying at the top, from where); for a house’s private-sales desk it is the list of underbidders and guarantors worth a call. Sold with the Desk tier; the seven-years card is the free teaser.

**3. The Transformation as a pre-read for compliance.** A bank’s AML officer, a house’s compliance desk and a broker’s onboarding team each answer the same question — where does this money come from, where does it go, which control catches it — before a professional opinion is sought. The Transformation gives the first answer in a minute, with the instrument named at each gate and the lawful version when a gate closes. It is a reading, not advice: the page says so, names the controls, and never draws a way around them; that is what makes it sellable to the regulated side rather than the other side. Price to test: inside the Private tier for an individual ($40–60 a month), inside Desk for a firm; the worked cases stay free as the proof.

**4. The Navigator with the money’s road.** The Navigator now closes a route when the buyer’s money cannot lawfully leave its country, and names the lawful version. For a shipper or a lawyer who wants a client to arrive informed, that is the referral desk of part two with one more gate.

## The legal position, stated plainly

The terminal describes the law as the sources state it, flags what it could not confirm, and gives no advice. Every gate links its instrument; the Transformation and the Navigator refuse to plot around a closed gate and say why; the typologies and cases are the regulators’ own. The three lines to keep on the page: “a compliance reading, not advice”; “every figure sourced and flagged”; “the precise answer comes from a named professional”. Under that framing the product sits with the regulated side (banks, houses, brokers, shippers, lawyers), which is the buyer with a budget. A version that hid its sources or promised an outcome would be both a worse product and a liability.

## The next numbers to collect (added to part two’s)

- Which Transformation routes readers walk, and which close (the store, opt-in; the trail records the last route in the browser only).
- Which players and markets are opened most on the Net (the same).
- Whether a Desk reader exports the Net file more than once a quarter (the proof that the coverage map is used as a file, which is what the API would charge for).

## What is still unconfirmed, and so not yet sold

The research bundle lists them: Christie’s and Bonhams’s 2026 fee tiers (read in the trade press, not on the houses’ pages); the CBR cap after March 2026; Turkey’s and Israel’s capital rules (from memory, flagged U); most dealer rosters, insurers and shippers (U); the tax rates in the market paragraphs (from memory). A Desk sale should wait for a refresh that opens those pages; the live desk already has them on its list.

*Every figure in the page carries its source and flag; the prices above are the owner’s to test.*

---

# Part four: Bloomberg for the art world (v26, 12 November 2026)

*The owner’s brief: a globe no one else has; the vaults of a city with who runs them and whom to call; Moscow and east; insights a desk would pay for; what goes on behind a $50m Monet and where the money is made; the day-to-day tasks a terminal can take off the trade; something to pitch to an auction house. This part answers the questions in order and says what v26 built for each.*

## 1. What can we monetise?

Five things, in the order a buyer would recognise them.

| Product | What it is in the page | Who pays | The number to test |
|---|---|---|---|
| **The seat** | The palette’s functions (⌘K: COMP, EST, FEES, LAND, DEAL, TRX, VLT, NET, WHO, KYC, GUAR, CAL, FX, WIRE, PROV, HOLD, WATCH, PITCH), the watchlist with what changed since the last look, the Deal Room, the Navigator and the Transformation | A specialist, a business-getter, a private-sales desk, an adviser, a banker’s art desk | US$3,000–6,000 a seat a year — the research’s benchmark: the trade pays Artnet US$450–1,175 a year capped by search, MutualArt US$369–2,499, ArtTactic £195 a month, and US$95–325 a user a month for workflow tools, from three or four vendors at once; a Bloomberg seat is US$28–32k |
| **The coverage file** | The Net: 209 players in 59 cities with seats, offices, people, owners, scale; 42 market paragraphs; 55 vaults with operators, owners, people and published contact lines; the East’s wire | A bank’s onboarding desk, a lender’s credit team, a house’s client-development desk, a fair’s sales team | US$1,500 a year a desk as a quarterly JSON/CSV; inside the Desk seat otherwise |
| **The deal file** | The Deal Room’s research: the terms as the houses and the courts state them, 18 trophy sales with their reported terms, buyers, underbidders and people, 33 business-getters and advisers, the guarantors the press has named; the money behind 71 lots since 2020 | A consignor’s adviser, a guarantor, a lender, a journalist, a student | Inside Private and Desk; the cases stay free as the proof |
| **The compliance pre-read** | The Transformation and the Navigator’s money’s-road gate; the framework panel; KYC on the palette | A house’s compliance desk, a bank’s AML officer, a broker’s onboarding team | Inside Desk; a referral line to named counsel per corridor |
| **The house edition** | The same page under a house’s own lens (its rooms first, its schedule in the Deal Room, its sales on the globe), with the Desk file and an analyst’s hour | An auction house, a fair, a logistics firm | US$15,000–50,000 a year, the v24 flat Desk price scaled by seats |

## 2. How good is our finance movement tool?

Audited, with the audit published. A fresh agent re-derived every figure the Navigator computes against sources (22 findings; 18 figures confirmed; the 12 wrong ones fixed in v25); the Transformation’s capital table was reconciled with the ten further jurisdictions’ research; the Deal Room’s premium arithmetic reproduces two 2026 results to the dollar (Basquiat *Museum Security*, Pollock *Number 7A*). What it is not: a quote. Every route ends in a professional’s number, and the page says so on every ledger. The open items are listed in the research bundle (`v25.audit_engine`, `v26.*.unconfirmed`) and on the refresh checklist.

## 3. Do we operate within the international legal framework?

Yes, on four counts, each visible in the page. The engines are readings of published law with the instrument linked at every gate, and they refuse to plot around a closed gate. The data is sourced from public pages, flagged V/S/U, and names people only in their public roles (a vault’s chairman from its annual report; a house’s chairman from its press release); the contact lines are the organisations’ own published ones, never a private number. The live feeds use open collections under CC0 (the Art Institute of Chicago, the Cleveland Museum of Art) and a rate service free for commercial use (Frankfurter); the feeds the research found to be keyed, non-commercial or terms-restricted (OpenSanctions’ CC BY-NC data, Companies House’s ‘do not embed keys’, SEC EDGAR’s User-Agent rule, Comtrade’s caps) stay on the research desk and are listed with their terms in `OPEN_FEEDS`. And the page carries no sanctions list of its own: KYC on the palette opens the checks a house runs, not a verdict on a name.

## 4. The players, the markets, the East

209 players in 59 cities (124 from v25, 85 new from Moscow eastward, 15 houses extended), 42 market paragraphs, 43 wire lines for 2025–26, and a lens for Moscow & east on the globe. Moscow’s card carries the state of the Russian market (RUB 4.1bn of filed 2025 revenue across 260 companies, +5.4%; the houses up 23%, the galleries down 11%) and its law (export, the Western bans, the central bank’s limits, extended to March 2027). India’s record twice in a year, Korea’s correction, Tokyo Gendai’s move, the tariff overlay struck and replaced — all on the wire with sources.

## 5. The vaults

55 free ports, bonded stores and storage sites in 27 cities, each with operator, owner, size, what is published about the value inside (never the terminal’s own estimate), the people in charge, the organisation’s own contact lines, the regime, the cases. Geneva’s is primary (the operator’s 2025 report: CHF 23.8m, a new 14,500 m² building let for 15 years); the Gulf’s and East Asia’s are the growth front (Qatar’s bonded hub, Abu Dhabi’s duty waiver, Shanghai’s 68,300 m² bonded centre). A reader clicks Geneva and sees it; VLT Geneva on the palette does the same.

## 6. What goes on behind a $50m painting, and where is the money made?

The Deal Room answers it with the sources’ numbers and marks the unpublished ones as the user’s inputs. On a US$50m hammer in New York in 2026: the buyer pays US$58.18m with Sotheby’s fees (US$8.18m premium, reproduced to the dollar by the May 2026 results) and US$63.3m all in with the city’s 8.875%; the consignor takes the hammer with the commission waived (Sotheby’s withdrew its flat 10% in February 2025 because it ‘proved less attractive to potential sellers’) plus whatever enhanced hammer was negotiated, a number no source publishes; a third-party guarantor at US$45m takes 20–30% of the US$5m overage when outbid, or buys ‘essentially at a discount’ when not; the buyer’s adviser’s published baseline is 10% of the price, negotiated lower; the house keeps far less than its headline — Sotheby’s all-in commission margin was 14.3% of net auction sales in 2015 against a 12–25% top tier, eroded by ‘commission sharing arrangements and auction guarantees’ (the 10-K); the only court-documented look at the house’s own take is Rybolovlev v Sotheby’s (about US$19m on US$316m of private sales, with US$979,000 to the specialist). Where the money is made, then: in the premium the house keeps net of give-backs, in the guarantor’s overage share and fee, in the adviser’s percentage, in the lender’s interest on the consignor’s advance, and in the state’s tax — and the people who make it are the 33 business-getters, auctioneers and advisers the research names on these lots.

## 7. The day-to-day tasks the terminal takes on

The research read 21 roles’ days from the houses’ own postings and the trade’s bodies, and named 42 functions a terminal should offer. Thirteen are codes on the palette today (comparables, the estimate worksheet, the proposal through the Deal Room, the guarantee book, landed cost, the counterparty file and screening checks, the vaults, a city or a player on the net, the calendar, currency weather, the wire, provenance, the fee calculator); the rest are marked ‘next’ on the Circle’s pitch panel, in the order the roles name them: the condition-report ledger, the phone-bank roster, settlement and payment rails, the private-sales pipeline, object-to-client matching, inventory and consignment registers, catalogue production. That list is the roadmap, and it is on the page.

## 8. The pitch to an auction house, in a paragraph

Your associate specialists hand-build price comparisons and market analysis for every pitch; your KYC analysts review World-Check alerts by hand; your private-sales desk names no system at all; the data you need most — bought-in lots, guarantee amounts, fee splits, guarantor identities — is what no vendor sells (the Masterworks survey, 2026). Subhasta already carries the comparables with their sources, the deal anatomy of eighteen trophy sales, the guarantee economics, the landed cost of any route across 32 jurisdictions, the counterparties of 59 cities with the people who front them, the vaults of 27 cities, and a globe your clients will want to turn. It is one seat a specialist opens at eight in the morning, and it is sourced line by line. The price is a tenth of a Bloomberg seat; the first house edition is free for a season in exchange for the corrections.

## 9. Where the value is captured, and when

At the pitch (COMP, EST, DEAL: the specialist’s week saved); at the deal (GUAR, the Deal Room’s terms: the chairman’s negotiation informed); at the move (LAND, TRX: the shipper’s and the lawyer’s first answer); at the file (KYC, VLT, WHO: the compliance desk’s and the lender’s onboarding); at the refresh (the live desk’s twice-weekly writes and the monthly file: the subscription’s reason to renew). The free page captures none of it and all of the attention; the seat captures the day; the file captures the desk.

*Every figure in the page carries its source and flag; the prices above are the owner’s to test.*
