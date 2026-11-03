// SUBHASTA — the Circle: what Subhasta offers a professional, the three tiers, the value points, the invitation and the Brief's fixed lines.
// Rendered by renderCircle (src/circle.js). Counts are never typed here: a {token} in any string is filled from the data constants at render
// (rooms, under, checks, stations, flags, regimes, nga, ngaArtists, dealers, vitals, symptoms, hubs, segments, institutions, reports, lots, houses,
// orgs, people, stories, verified, nextReport, firstMonth, lastMonth, globe, labPeriods, provThrough, provOpen, holdings, ownMedian). Links: ['go',view,label] · ['under',atlasId] · ['symptom',id] · ['hub',id] · ['lab',instrument];
// an under/symptom/hub link may carry its own label; otherwise the label is read from the record it points at.
const CIRCLE={
 offer:{k:'For the desk',
  p:'Subhasta is a terminal for the art trade. It shows where the money is: which rooms, houses and segments take it. It shows what sits under a price: the premium, the tax at the border, the guarantee, the resale right, the chain of owners. And it shows what is shifting from one season to the next. Every figure is typed in by hand and opens its source; {flagged} carry a flag — verified, secondary or unverified — and the Lab lists {limits} things the terminal cannot tell you.'},
 tiers:[
  {id:'reader',n:'Reader',who:'Anyone who opens the page.',price:'Free',act:['go','floor','Open the Floor'],items:[
   'The Floor, the Pulse and the Atlas, every figure flagged and sourced',
   'The Hammer: {lots} marquee lots since 1990, their price paths and the fee check',
   'The Ledger: {nga} ownership histories from the National Gallery of Art’s open data',
   'Follow the money across {rooms} sale rooms, and the fee calculator',
   'The Lab: {labPeriods} holding periods against the S&P 500, gold and inflation, the round trip, {provThrough} histories read for 1933 to 1945 and {holdings} holdings dated',
   'The Salon board and a member card, signed in',
   'The Reel']},
  {id:'private',n:'Private',who:'One reader, one desk.',price:'On request',mark:true,act:['invite','Request an invitation'],items:[
   'Everything in Reader',
   'The Subhasta Brief by e-mail after each monthly refresh; the current issue is below',
   'The Clinic and Follow the money with your own numbers; nothing you type leaves your browser',
   'The Atlas’s {regimes} regimes side by side — import VAT, sales tax, resale right, AML, export control — as a sheet to print',
   'Priority corrections: a figure you dispute is re-checked at the next refresh']},
  {id:'desk',n:'Desk',who:'Advisors, family offices and houses.',price:'On request',act:['invite','Request an invitation'],items:[
   'Everything in Private',
   'The data behind the terminal as CSV and JSON after each refresh: lots, houses, hubs, regimes, segments, the calendar',
   'Custom lenses: a room, a regime and a set of segments cut for your desk',
   'A named analyst’s hour each month',
   'Early access to new corners of the terminal before they reach the page']}
 ],
 personal:'Invitations are personal; the owner opens them.',
 invite:{h:'Request an invitation',
  p:'Say who you are, where your desk is and which tier you want. The request reaches the owner of this page as a comment on this section.',
  button:'Request an invitation',salon:'Add your card to the Salon',
  request:['I would like an invitation to the Subhasta Circle, {tier}.','Name and desk: … · City: … · What I would open first: …'],
  anyTier:'Private or Desk',
  opened:'The composer is open. Say who you are, where your desk is and which tier you want; the owner reads it as a comment on this page.',
  notOpened:'The composer did not open. Try the button again, or use the Share menu’s comment to ask.',
  off:'Invitations are opened by the owner of this page; use the Share menu’s comment to ask.',
  copied:'A two-line request is on your clipboard:'},
 why:[
  {t:'Follow the money, room by room.',e:'Under a chosen hammer the Undertow splits a buyer’s dollar into premium, VAT, sales or use tax, resale right, guarantee fee and the seller’s deal, line by line, and sets the {rooms} sale rooms side by side.',links:[['go','undertow','Follow the money'],['under','guaranteed78','The guaranteed 78%'],['under','ukarr','ARR and import VAT']]},
  {t:'A second opinion before any payment.',e:'The Clinic reads a deal against {flags} flags and {regimes} jurisdictions and scores its risks — title and provenance, authenticity, price and liquidity, tax and border, counterparty and payment, condition — naming the check that lowers each.',links:[['go','desk','Open the Clinic'],['under','schiff','The Schiff case']]},
  {t:'Provenance from the museum’s own record.',e:'The Ledger holds {nga} ownership histories of works by {ngaArtists} artists from the National Gallery of Art’s open data, footnotes intact, with a lineage of {dealers} dealers; each record opens the full text and its nga.gov page.',links:[['go','ledger','Open the Ledger'],['under','washington','The 1933–45 gap']]},
  {t:'The market as a patient, every figure flagged.',e:'The Pulse takes {vitals} vital signs and makes {symptoms} diagnoses, each with its evidence and a prognosis; every figure carries a flag — verified, secondary or unverified — and opens its source. Figures last verified {verified}.',links:[['go','pulse','Open the Pulse'],['symptom','topheavy'],['symptom','guarantees']]},
  {t:'Every room on one map.',e:'The Atlas sets {hubs} hubs on {globe} with the buyer’s rules in each — import VAT, sales tax, resale right, AML, export — then {regimes} regimes side by side, {segments} collecting segments and {institutions} institutions with what they buy.',links:[['go','atlas','Open the Atlas'],['hub','ny'],['hub','hk']]},
  {t:'Measured, not asserted.',e:'The Lab sets {labPeriods} holding periods of marquee works against the S&P 500, gold and inflation over the same years, prices a round trip to its break-even and measures how concentrated the trade is. It reads {provThrough} ownership histories entry by entry for the years 1933 to 1945; of the {provFull} in the American Alliance of Museums’ full scope, {provFullOpen} stay open, each listed with the entry where its chain breaks. It dates {holdings} holdings: a collector kept a work a median of {ownMedian} years, and the dealers who sold to the Gallery’s founders are counted by name.',links:[['go','lab','Open the Lab'],['lab','roundtrip'],['lab','provenance'],['lab','hands']]},
  {t:'Rebuilt after every report.',e:'{reports} reports move the readings through the year, the first in {firstMonth} and the last in {lastMonth}; the terminal is refreshed after each drop and the Brief follows. Next: {nextReport}.',links:[['go','pulse','The report calendar'],['go','signals','Signals and the wire']]}
 ],
 brief:{n:'The Subhasta Brief',sub:'A short reading of the art trade, issued after each refresh of the terminal',
  issued:'Issued',lead:'The lead',vitals:'Vital signs',diag:'The diagnosis',ahead:'The month ahead',disp:'Dispatches',src:'Sources',
  foot:'Figures verified {verified}; prices include buyer’s premium unless stated; every figure opens its source in the terminal.',
  print:'Print the brief',copy:'Copy as text',save:'Save as .md'},
 close:{motto:'sub hasta — sold under the spear',p:'In Rome the spear stood where the goods were sold. Here it stands over the figures.',back:'Back to the Floor'}
};

// What the terminal cannot tell you: the limits of its models and data, shown in the Lab's sixth instrument (#lab-limits, grouped by
// area: #lab-limits-<area>) and linked from the sections they qualify. Each: id; area (money, lots, returns, provenance, clinic, data,
// market); t, the limit in a few words; b, what it means, plain; at, the place it qualifies ([kind, target]: 'go' a view, 'lab' an
// instrument, 'under' an atlas entry); src (optional) [label, url]. {tokens} as in the Circle's copy.
const LIMITS=[
 {id:'regional',area:'money',t:'One set of premium tiers in every room',b:'Follow the money applies each house’s dollar tiers in all five rooms. The houses’ local thresholds (£1.5m, €1.75m, HK$15m) differ, by up to about $5,000 on a lot above $2m.',at:['go','undertow'],src:['Phillips: buyer’s premium, effective 12 April 2026','https://dist.phillips.com/content/web/docs/forms/BuyersPremium.pdf']},
 {id:'arrorder',area:'money',t:'The resale right by nationality, not by residence',b:'The royalty is charged only for nationals of the UK, the EEA, Australia and New Zealand. Other countries that pay in return are not listed, so an artist from one of them is treated as not qualifying. France also pays artists admitted by ministerial order after five years’ residence; the first orders came in 2024, and the model does not know them.',at:['under','frarr']},
 {id:'guarfee',area:'money',t:'Who pays the guarantor is private',b:'The guarantor’s fee is taken from the premium. In practice it may come from the seller’s share of the upside; the terms are not published.',at:['under','guarantor']},
 {id:'deferral',area:'money',t:'A deferred tax is ranked on the first year',b:'The freeport and Delaware defer tax until the work comes home, and a museum loan defers the use tax. The comparisons show the first year only; the museum loan is shown but not ranked.',at:['under','geneva']},
 {id:'impvat20',area:'money',t:'Every imported lot pays the art rate',b:'An imported lot pays 5% import VAT in London and 5.5% in Paris. Objects outside the art rules, charged at 20%, are not modelled.',at:['under','ukarr']},
 {id:'estate',area:'money',t:'The estate tax assumes a large US estate',b:'The line is 40% of the price, as if the estate were already above the $15m exemption. Smaller estates, foreign estates, trusts and gifts to museums change it.',at:['under','estatetax']},
 {id:'breakeven',area:'money',t:'Break-even counts the purchase only',b:'The resale figure covers the buyer’s all-in and a 5% commission. Insurance, storage and interest are in the Lab’s round trip.',at:['lab','roundtrip']},
 {id:'implied',area:'lots',t:'Implied hammers use today’s schedule',b:'A lot’s hammer is worked back from its price with premium using the 2026 schedules. The premium at the time was lower (about 10% in 1990), so the real hammer was higher.',at:['go','hammer']},
 {id:'marquee',area:'lots',t:'A list of {lots} marquee lots, not the market',b:'The lots were chosen for significance. Totals, medians and concentration describe this list; the market’s own figures are on the Pulse.',at:['go','hammer']},
 {id:'private',area:'lots',t:'Private prices are press reports',b:'Private-treaty prices are never confirmed by the parties. They are shown as reported, and a repeat-sale return that uses one inherits the doubt.',at:['go','hammer']},
 {id:'survivor',area:'returns',t:'Survivors only',b:'The repeat sales are works that came back to market and made the press. A study that corrects for this selection found 6.5% a year, against 10% before correction; the median here flatters the trade.',at:['lab','returns'],src:['Korteweg, Kräussl and Verwijmeren: Does it pay to invest in art? (Stanford GSB)','https://www.gsb.stanford.edu/faculty-research/working-papers/does-it-pay-invest-art-selection-corrected-returns-perspective']},
 {id:'decade',area:'returns',t:'The S&P 500’s last ten years were strong',b:'The round trip compares itself with the S&P 500 over the last ten years, about 15% a year with dividends: an unusually strong decade. Over each period’s own years the comparison in instrument one is fairer.',at:['lab','roundtrip']},
 {id:'partial',area:'returns',t:'This year’s benchmarks are partial',b:'The 2026 averages run to September (CPI to August). The ten-year S&P figure reads about 0.3 points low until the year closes.',at:['lab','returns']},
 {id:'flatcost',area:'returns',t:'Storage stays flat; tax, currency and financing are left out',b:'The round trip keeps storage at the same dollars for up to thirty years. Capital-gains tax depends on residence, and currency moves and financing are not modelled there.',at:['lab','roundtrip']},
 {id:'triage',area:'provenance',t:'A reading for triage, not a finding',b:'The provenance instrument reads the Gallery’s published text. An open stretch is where research would start; it is not evidence that a work changed hands wrongly.',at:['lab','provenance']},
 {id:'place',area:'provenance',t:'Many histories name no place',b:'The full scope needs a place in continental Europe. The text names one for some owners only, so a history that names none stays in the full scope. The place read is the owner’s at the start of 1933: a work that moved into continental Europe later in the period is left out.',at:['lab','provenance']},
 {id:'onemuseum',area:'provenance',t:'One museum’s histories',b:'The Ledger holds {nga} histories from the National Gallery of Art. Other museums’ histories, dealers’ archives and auction catalogues are not read.',at:['go','ledger']},
 {id:'points',area:'clinic',t:'Scores are weights, not probabilities',b:'Each answer adds fixed points to a risk, capped at 100. Stop at 70 in any risk; Pause at an average of 35 or any risk at 50. The asking price is not scored.',at:['go','desk']},
 {id:'thresholds',area:'clinic',t:'Export licences turn on value too',b:'The Clinic tests an export licence by the work’s age. Most regimes also set value thresholds, which it does not test.',at:['under','tariffs']},
 {id:'flags',area:'data',t:'The verification count covers flagged records',b:'The share counts records that carry a flag. Lot prices, house sales and the money model’s rates carry none, and a whole series counts once.',at:['lab','confidence']},
 {id:'refresh',area:'data',t:'Figures are checked monthly',b:'The data were verified on {verified}. Between refreshes the market moves: a sale on the calendar may already have happened.',at:['go','signals']},
 {id:'hhi',area:'data',t:'Rounded shares blur the concentration index',b:'With the US share rounded to a whole point, the country index could lie between 2,490 and 2,578, either side of the 2,500 line.',at:['lab','structure']},
 {id:'revised',area:'market',t:'The market series is revised each year',b:'Arts Economics revises its estimates. Its current series puts the peak in 2022 at $67.8bn; points before 2019 are shown as first published, so 2014’s $68.2bn is not comparable.',at:['go','pulse']}
];
const LIMIT_AREAS={money:'Follow the money',lots:'Lots and prices',returns:'Returns and the round trip',provenance:'Provenance',clinic:'The Clinic',data:'Data and flags',market:'Market figures'};
