# Subhasta — monetisation, part two (November 2026)

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
