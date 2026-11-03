// SUBHASTA — the flows layer: cross-border trade in art (HS 97), attention, reference rates. Filled by the flows research pass; see REFRESH.md.
// Schema (every figure carries a source key into FLOW_SRC and a flag V/S/U):
//   TRADE = {year, unit, note, rows:[{iso, c, imp, exp, src, vf}]}            imports/exports of works of art, collectors' pieces and antiques (HS chapter 97), US$ millions
//   CORRIDORS = [{from, to, v, year, src, vf}]                                 the largest reporter→partner flows, US$ millions (ISO2 codes)
//   COUNTRY_LL = {ISO2: [lon, lat]}                                            the point the globe uses for a country (its art-market city)
//   ATTENTION = {months:['YYYY-MM',…], series:[{n, page, kind, v:[…], src, vf}]}  monthly Wikipedia page views (English), one series per artist/house/fair
//   RATES = {asof, base:'USD', rates:{GBP, EUR, CHF, HKD}, src, vf}            reference FX used to read the FX constant in data_under.js
//   FXSERIES = {months:['YYYY-MM',…], dates:[…], per:{GBP:[…],EUR:[…],CHF:[…],HKD:[…]}, src, vf}   month-end ECB rates, units per US dollar
//   PLACE_LL = {place:[lon, lat]}                                               the places named in JOURNEYS (data_under.js), for the globe’s Journeys mode
//   FLOW_SRC = {key:[label, url]}
// Pass of 2026-10-08.
//   RATES: ECB reference rates of 2026-10-08 via Frankfurter (the .app URL redirects to api.frankfurter.dev/v1); every rate reproduces from the EUR-based fix of the same day (USD 1.1186, GBP 0.84698, CHF 0.9326, HKD 8.7783).
//   TRADE and CORRIDORS are empty: the UN Comtrade public preview endpoint answered HTTP 403 to every data request (multi-reporter, single-reporter, 2024 and 2023). Its getDA endpoint did answer (US 2024 HS data released 2025-02-08), so the figures exist; only the route was refused.
//   ATTENTION is empty: the Wikimedia REST API could not be reached (wikimedia.org and en.wikipedia.org are cache-only for the fetch tool; the shell proxy refuses wikimedia.org).
//   COUNTRY_LL already holds the art-market city of each of the 18 TRADE countries, so the globe can draw arcs as soon as trade figures land.
const TRADE={year:null,unit:'US$ m',note:'',rows:[]};
const CORRIDORS=[];
const COUNTRY_LL={US:[-74.01,40.71],GB:[-0.13,51.51],CH:[6.14,46.20],HK:[114.17,22.32],FR:[2.35,48.86],CN:[116.40,39.90],DE:[13.40,52.52],JP:[139.69,35.68],KR:[126.98,37.57],SG:[103.82,1.35],AE:[55.27,25.20],IN:[72.88,19.08],BR:[-46.63,-23.55],MX:[-99.13,19.43],AU:[151.21,-33.87],IT:[9.19,45.46],ES:[-3.70,40.42],NL:[4.90,52.37]};
const ATTENTION={months:[],series:[]};
const RATES={asof:'2026-10-08',base:'USD',rates:{GBP:0.75718,EUR:0.89397,CHF:0.83372,HKD:7.8476},src:'ecb',vf:'V'};
// Month-end ECB reference rates (the last fixing of each month; October is 8 Oct), read from the Frankfurter time-series endpoint on 8 Oct 2026.
const FXSERIES={months:['2025-09','2025-10','2025-11','2025-12','2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10'],
 dates:['2025-09-30','2025-10-31','2025-11-28','2025-12-31','2026-01-30','2026-02-27','2026-03-31','2026-04-30','2026-05-29','2026-06-30','2026-07-31','2026-08-31','2026-09-30','2026-10-08'],
 per:{GBP:[0.74389,0.76303,0.7567,0.74264,0.72674,0.74231,0.7552,0.74026,0.74479,0.75635,0.74508,0.7386,0.75265,0.75718],
  EUR:[0.85172,0.8655,0.8646,0.85106,0.839,0.8471,0.86972,0.85455,0.85881,0.87765,0.8707,0.86237,0.88067,0.89397],
  CHF:[0.79755,0.80379,0.80564,0.79268,0.76827,0.7712,0.79962,0.78534,0.78246,0.80955,0.8101,0.80855,0.8347,0.83372],
  HKD:[7.7812,7.7711,7.7832,7.7842,7.8083,7.8237,7.8393,7.833,7.8356,7.8418,7.8432,7.8379,7.8463,7.8476]},
 src:'ecbts',vf:'V'};
// The places named in JOURNEYS (data_under.js) → [lon, lat]. A step whose place is blank, 'private' or 'unknown' is not drawn;
// 'Geneva / Monaco' is drawn at Geneva (the freeport); 'Vienna → Los Angeles' at its destination.
const PLACE_LL={'London':[-0.13,51.51],'New York':[-74.01,40.71],'New Orleans':[-90.07,29.95],'Geneva':[6.14,46.20],'Monaco':[7.42,43.74],'Tahiti':[-149.57,-17.53],'Vienna':[16.37,48.21],'Los Angeles':[-118.24,34.05],'Giverny':[1.53,49.08],'Potsdam':[13.06,52.40],'Paris':[2.35,48.86],'Auvers-sur-Oise':[2.17,49.07],'Frankfurt':[8.68,50.11],'Berlin':[13.40,52.52]};
const FLOW_SRC={ecb:['ECB reference rates via Frankfurter, 8 Oct 2026','https://api.frankfurter.dev/v1/latest?from=USD&to=GBP,EUR,CHF,HKD'],ecbts:['ECB reference rates via Frankfurter: month-end series, Sep 2025 – Oct 2026','https://api.frankfurter.dev/v1/2025-09-01..2026-10-08?from=USD&to=GBP,EUR,CHF,HKD']};
