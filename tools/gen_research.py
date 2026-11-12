#!/usr/bin/env python3
"""Generate the v24 data files from the research bundle.

    python3 tools/gen_research.py [--bundle PATH]

Reads data/research/bundle.json: key v24 (law_europe, law_world, finance, events, horizon: the five research briefs of v24)
and key v25 (money_sales, players, law_more, transformation, audit_engine: the briefs of v25), each written by a research agent
under scratchpad/v2x/BRIEF_COMMON.md (every fact with a URL opened in the session, every entry flagged V/S/U), and writes:
  src/data_nav.js      NAV_RULES (one entry per jurisdiction: REGIMES ids plus nl, es, ru, qa; Peru from memory, U), NAV_EU,
                       NAV_FEES (the research's shipping figures, the rest flagged U), NAV_MOSCOW (the worked case)
  src/data_season.js   EVENTS, EVENTS_ASOF (the Season); THESES, HORIZON_SIGNALS, HORIZON_ASOF (the Horizon)
  src/data_net.js      NET_PLAYERS, NET_MARKETS (the players), NET_FLOWS and LOT_FIN (the money behind the major sales), TRANSFORM
                       (the stages of money through art) — from the v25 briefs; the ten further jurisdictions of law_more join
                       NAV_RULES
House style is applied to every string: typographic quotes, $ not US$. Edit the research and regenerate, not these files.
The finance brief feeds the Atlas, the Pulse and the Signals by hand (ARCHITECTURE §15); it is in the bundle for the record."""
import json, re, sys, pathlib
from urllib.parse import urlparse

root = pathlib.Path(__file__).resolve().parent.parent
args = sys.argv[1:]
bundle_path = pathlib.Path(args[args.index('--bundle') + 1]) if '--bundle' in args else root / 'data' / 'research' / 'bundle.json'
BUNDLE = json.load(open(bundle_path, encoding='utf-8'))
B = BUNDLE['v24']            # the v24 briefs: law_europe, law_world, finance, events, horizon
B25 = BUNDLE.get('v25', {})  # the v25 briefs: money_sales, players, law_more, transformation, audit_engine
europe, world, EV, HZ = B['law_europe'], B['law_world'], B['events'], B['horizon']

def typo(o):
    """House style: typographic quotes. 'any other article' -> ‘any other article’; a remaining apostrophe -> ’; US$ -> $."""
    if isinstance(o, str):
        o = re.sub(r"(?<![\w])'([^']+?)'(?![\w])", '‘\\1’', o)
        o = o.replace("'", '’').replace('US$', '$')
        return re.sub(r'\$(\d[\d.,]*)([MBK])\b', lambda m: '$' + m.group(1) + {'M': 'm', 'B': 'bn', 'K': 'k'}[m.group(2)], o)   # $40M → $40m, the page's unit style
    if isinstance(o, list): return [typo(x) for x in o]
    if isinstance(o, dict): return {k: typo(v) for k, v in o.items()}
    return o

def js(name, obj):
    return f'const {name}=' + json.dumps(typo(obj), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + ';\n'

# ======================= the Navigator =======================
CUR = {'£': 'gbp', '€': 'eur', 'CHF': 'chf', 'HK$': 'hkd', 'S$': 'sgd', 'A$': 'aud', 'C$': 'cad', 'US$': 'usd', 'R$': 'brl', 'AED': 'aed'}
def money(s):
    """'€30,000 / €50,000' -> (30000, 'eur', '€30,000 / €50,000'); 'any' -> (0, None); 'none' -> (None, None)."""
    if s is None: return None, None
    s = str(s).strip()
    if s.lower() in ('any', 'any value', '0'): return 0, None
    if s.lower() in ('none', 'n/a', ''): return None, None
    vals = []
    cur = None
    for m in re.finditer(r'(£|€|CHF|HK\$|S\$|A\$|C\$|US\$|R\$|AED)\s?([\d,\.]+)', s):
        cur = CUR.get(m.group(1), cur)
        vals.append(float(m.group(2).replace(',', '')))
    if not vals: return None, None
    return min(vals), cur

CATS = {'paintings': 'painting', 'sculpture': 'sculpture', 'drawings/watercolours': 'paper', 'prints': 'paper', 'photographs': 'photo', 'any other': 'design'}

def needs_from(rows):
    """The research's six category rows -> the engine's five kinds; 'paper' takes the lower of drawings and prints."""
    out = {}
    for r in rows or []:
        cat = CATS.get(r.get('cat'), None)
        if not cat: continue
        v, cur = money(r.get('value'))
        age = r.get('age')
        if v is None and (age in (None, 0)):   # 'none': no licence for this category
            continue
        row = {'cat': cat, 'age': age or 0, 'value': v or 0, 'cur': cur, 'note': (r.get('note') or '').strip()}
        if cat in out:   # paper twice (drawings, watercolours, prints): keep the lowest threshold, join the notes and say so
            if row['value'] < out[cat]['value']: out[cat]['value'], out[cat]['cur'] = row['value'], row['cur']
            out[cat]['note'] = (out[cat]['note'] + ' ' + row['note']).strip()
            out[cat]['lowest'] = True
        else:
            out[cat] = row
    return list(out.values())

def pick(d, *keys):
    o = {}
    for k in keys:
        if k in d and d[k] not in (None, ''): o[k] = d[k]
    return o

def exp_entry(e, j):
    """The export rule: none (no licence at all), the law, the categories, the authority, the time, the fee, the temporary rule, the treasure rule."""
    o = pick(e, 'law', 'authority', 'fee', 'time', 'temporary', 'treasure', 'eu_licence', 'vf', 'note', 'src')
    needs = e.get('needs')
    rows = needs_from(needs) if isinstance(needs, list) else []
    none_flag = isinstance(needs, list) and all(money(r.get('value'))[0] is None for r in needs) if isinstance(needs, list) else True
    o['none'] = bool(none_flag) and not rows
    if isinstance(needs, str): o['needsText'] = needs; o['none'] = False   # a rule in prose: the engine shows it as a conditional gate
    o['needs'] = rows
    o['src'] = e.get('src') or []
    return o

def imp_entry(e):
    o = pick(e, 'duty', 'vat', 'icg', 'special', 'state_tax', 'overlays', 'overlays_note', 'cpia', 'vf', 'note')
    r = e.get('vat_rate')
    if isinstance(r, (int, float)):
        o['vat_rate'] = r / 100 if r > 1 else r
    o['duty_rate'] = 0
    o['src'] = e.get('src') or []
    return o

def simple(e, *keys):
    o = pick(e, *keys)
    o['src'] = e.get('src') or []
    return o

def entry(x):
    o = {'n': x['n']}
    if 'export' in x: o['exp'] = exp_entry(x['export'], x['j'])
    if 'import' in x: o['imp'] = imp_entry(x['import'])
    if 'aml' in x: o['aml'] = simple(x['aml'], 'rule', 'threshold', 'asks', 'vf', 'note')
    if 'sanctions' in x: o['sanctions'] = simple(x['sanctions'], 'rule', 'detail', 'vf', 'note')
    if 'apostille' in x:
        a = x['apostille']; o['apost'] = simple(a, 'hague', 'docs', 'authority', 'fee', 'time', 'vf', 'note')
    if 'cites' in x: o['cites'] = simple(x['cites'], 'rule', 'vf', 'note')
    if 'freeport' in x: o['freeport'] = simple(x['freeport'], 'rule', 'vf', 'note')
    return o

rules = {}
for x in europe['jurisdictions'] + world['jurisdictions']:
    rules[x['j']] = entry(x)

# ---- the categories the research gives in prose: the rule rows the engine reads (age, year, artists, bars) ----
# cn: relics before 1949 and the NCHA list; kr: before 1946; in: antiquities over 100 years barred, the declared artists barred;
# br: before 1890 barred; mx: declared artists barred from permanent export; ru: pre-1917 special value only temporarily,
# cultural valuables need a conclusion; es: 100 years any value, plus the export tax; au: thresholds in the Regulations (U)
rules['cn']['exp']['needs'] = [{'cat': 'any', 'before': 1949, 'note': 'any work made before 1949 (a cultural relic: examination, seal and permit), and works by the artists on the NCHA list of 5 May 2023 whatever the date'}]
rules['cn']['exp']['artists'] = []
rules['cn']['exp']['none'] = False
rules['kr']['exp']['needs'] = [{'cat': 'any', 'before': 1946, 'note': 'any work made before 1946 (general movable cultural heritage: appraisal and permit from the Korea Heritage Service); later works leave freely'}]
rules['kr']['exp']['none'] = False
rules['in']['exp']['needs'] = [{'cat': 'any', 'artists': True, 'bar': True, 'note': 'the declared art treasures (Tagore, Sher-Gil, Jamini Roy, Ravi Varma, Nandalal Bose and others) may not leave at any age'}, {'cat': 'any', 'age': 100, 'value': 0, 'bar': True, 'note': 'any object over 100 years old is an antiquity and may not be exported except by the government'}]
rules['in']['exp']['artists'] = ['Rabindranath Tagore', 'Amrita Sher-Gil', 'Jamini Roy', 'Raja Ravi Varma', 'Nandalal Bose']
rules['in']['exp']['none'] = False
rules['br']['exp']['needs'] = [{'cat': 'any', 'before': 1890, 'bar': True, 'note': 'works produced in Brazil up to 1889 and listed (tombado) works may not leave; IPHAN allows temporary exits for exhibitions'}]
rules['br']['exp']['none'] = False
rules['mx']['exp']['needs'] = [{'cat': 'any', 'artists': True, 'bar': True, 'note': 'the complete works of the artists declared artistic monuments (Velasco, Orozco, Rivera, Dr Atl, Siqueiros, Kahlo, Herrán, Varo, Izquierdo; Vlady provisionally) need INBAL’s permit, refused for permanent export; archaeological objects are national property'}]
rules['mx']['exp']['artists'] = ['José María Velasco', 'José Clemente Orozco', 'Diego Rivera', 'Gerardo Murillo', 'Dr Atl', 'David Alfaro Siqueiros', 'Frida Kahlo', 'Saturnino Herrán', 'Remedios Varo', 'María Izquierdo', 'Vlady']
rules['mx']['exp']['none'] = False
rules['ru']['exp']['needs'] = [{'cat': 'any', 'before': 1917, 'temporaryOnly': True, 'note': 'pre-1917 works of special value may leave only under an obligation to return'}, {'cat': 'any', 'age': 50, 'value': 0, 'note': 'a cultural valuable on the EAEU list 2.20 leaves on a Ministry of Culture conclusion (a private owner, or a temporary export) or a Minpromtorg licence (a permanent export by a company); the 50-year line is unconfirmed'}]
rules['ru']['exp']['none'] = False
rules['es']['exp']['needs'] = [{'cat': 'any', 'age': 100, 'value': 0, 'note': 'any work over 100 years old, or in the General Inventory, whatever the value; a definitive export pays the export tax (5% to 30% of the value by band); works by living authors are exempt from the tax; goods imported within the last 10 years leave without pre-emption'}]
rules['es']['exp']['tax'] = 'export tax on definitive exports: 5% up to about €6,010, 10% to about €60,101, 20% to about €601,012, 30% above (the peseta bands of 1985, converted)'
rules['es']['exp']['none'] = False
rules['au']['exp']['needs'] = [{'cat': 'any', 'age': 30, 'value': 250000, 'cur': 'aud', 'note': 'Australian works on the National Cultural Heritage Control List: the age and value tests (30 years and A$250,000 for fine art, A$100,000 for Indigenous works) are in the Regulations, not opened; foreign works held under 50 years are outside the list'}]
rules['au']['exp']['none'] = False
rules['au']['exp']['vf'] = 'S'
rules['nl']['exp']['needs'] = []
rules['nl']['exp']['none'] = True
rules['nl']['exp']['listed'] = 'Objects in the register of protected cultural goods need the minister’s permission for any destination.'
rules['hk']['exp']['none'] = True
rules['sg']['exp']['none'] = True
rules['ae']['exp']['none'] = True
rules['qa']['exp']['none'] = True
rules['sa']['exp']['none'] = True
rules['jp']['exp']['none'] = True
rules['jp']['exp']['listed'] = 'A National Treasure or an Important Cultural Property may not leave; an antique leaves with the Agency for Cultural Affairs’ certificate that it is not designated.'
rules['us']['exp']['none'] = True
rules['ch']['exp']['none'] = True
rules['ch']['exp']['listed'] = 'Objects in the federal register may not leave permanently; every cultural good is declared at export with its type, origin, date and size.'

# ---- the duty where the research states a rate (the Gulf’s 5% GCC tariff, India’s 10% plus the surcharge, Brazil’s 4%), and Korea’s VAT
#      exemption for original works (editions and photographs pay 10%): the auditor’s findings of 9 Nov 2026 ----
for j, d in (('ae', .05), ('qa', .05), ('sa', .05), ('in', .11), ('br', .04)):
    rules[j]['imp']['duty_rate'] = d
rules['in']['imp']['duty'] = '10% basic customs duty on chapter 97 plus the 10% social welfare surcharge on the duty: about 11% of the value (U); IGST is charged on the duty-paid value.'
rules['kr']['imp']['vat_rate'] = 0
rules['kr']['imp']['vat_kinds'] = {'photo': .10, 'paper': .10}
rules['kr']['imp']['vat'] = 'Original works of art (paintings, sculpture, a hand-made drawing) are exempt from VAT on import and on sale (VAT Act art. 27(15), Enforcement Decree art. 56(17)); the 10% is charged on editions, prints and photographs, and the form’s ‘drawing or print’ is taxed as the edition it most often is.'
rules['kr']['imp']['vf'] = 'S'
# China: 1% MFN duty on original paintings (9701.91) and 13% import VAT on the duty-paid value, the auditor’s reading of the tariff (S); the
# terminal’s own REGIMES row said the same. India: IGST on chapter 97 cut from 12% to 5% on 22 Sep 2025 (S), charged on the duty-paid value.
rules['cn']['imp']['duty_rate'] = .01
rules['cn']['imp']['duty'] = '1% MFN duty on original paintings (tariff line 9701.91; the general rate is 50%, and the 2025 tariff overlay on US-origin goods is added on top), charged on the customs value.'
rules['cn']['imp']['vat'] = '13% import VAT on the duty-paid value; no reduced rate for art.'
rules['cn']['imp']['vf'] = 'S'
rules['cn']['imp']['src'] = (rules['cn']['imp'].get('src') or []) + [['China tariff, 9701.91.19 (mirror, read 9 Nov 2026)', 'https://treayo.com/en/hs/china/97019119']]
rules['in']['imp']['vat_rate'] = .05
rules['in']['imp']['vat'] = 'IGST 5% on import (cut from 12% on 22 Sep 2025, when chapter 97 moved to the 5% slab), charged on the value plus the 11% duty.'
rules['in']['imp']['src'] = (rules['in']['imp'].get('src') or []) + [['GST on HSN chapter 97 (secondary, read 9 Nov 2026)', 'https://disytax.com/hsn-97-works-of-art-gst-rate/']]
rules['it']['exp']['dead'] = True   # art. 65(3)(a): the author no longer living
# ---- Peru: not in the research; carried from memory, flagged U ----
rules['pe'] = {'n': 'Peru',
  'exp': {'none': False, 'law': 'The General Law of the Cultural Heritage of the Nation (Law 28296): pre-Hispanic, colonial and republican objects of cultural value may not be exported; a contemporary work needs the Ministry of Culture’s certificate that it is not cultural heritage before it leaves.', 'authority': 'the Ministry of Culture', 'needs': [{'cat': 'any', 'before': 1900, 'bar': True, 'note': 'heritage (pre-Hispanic, colonial, republican) may leave only for exhibition, by supreme resolution'}, {'cat': 'any', 'age': 0, 'value': 0, 'note': 'every other work needs the Ministry’s certificate before export'}], 'time': '1 to 3 weeks for the certificate', 'fee': 'a small fee', 'src': [], 'vf': 'U'},
  'imp': {'duty': 'No duty on works of art.', 'duty_rate': 0, 'vat': 'IGV at 18% on import.', 'vat_rate': 0.18, 'src': [], 'vf': 'U'},
  'aml': {'rule': 'The Financial Intelligence Unit lists dealers in works of art and antiques among obliged persons; transactions are registered and reported above thresholds.', 'threshold': 'US$10,000 (registry)', 'asks': 'identity and the record of the transaction', 'src': [], 'vf': 'U'},
  'sanctions': {'rule': 'Peru applies United Nations sanctions only.', 'src': [], 'vf': 'U'},
  'apost': {'hague': True, 'authority': 'the Ministry of Foreign Affairs', 'fee': 'about S/ 30 a document', 'docs': 'notarised affidavit; power of attorney', 'src': [], 'vf': 'U'},
  'cites': {'rule': 'SERFOR issues CITES permits.', 'src': [], 'vf': 'U'}}

# ---- the EU block ----
eu = europe['eu']
NAV_EU = {'n': eu['n'], 'members': ['fr', 'de', 'it', 'nl', 'es'],
  'exp': dict(exp_entry(eu['export'], 'eu'), none=False),
  'imp': imp_entry(eu['import']),
  'aml': simple(eu['aml'], 'rule', 'threshold', 'asks', 'vf'),
  'sanctions': simple(eu['sanctions'], 'rule', 'vf'),
  'cites': simple(eu['cites'], 'rule', 'vf'),
  'freeport': simple(eu['freeport'], 'rule', 'vf')}

# ---- the fees: the research's shipping figures (FairArt, S) and the rest from memory (U) ----
ship = {it['what']: it for it in europe['shipping']['items']}
fair = [["FairArt, shipping fine art: export crates, insurance (playbook)", "https://fairart.com/editorial/insights/shipping-fine-art-export-crates-insurance-playbook/242"]]
NAV_FEES = {
  'condition': {'n': 'Condition report', 'lo': 400, 'hi': 1500, 'vf': 'U', 'src': [], 'note': 'a conservator’s written report with photographs; more for a large or fragile work'},
  'authentication': {'n': 'Authentication', 'lo': 0, 'hi': 5000, 'vf': 'U', 'src': [], 'note': 'foundations and catalogue raisonné committees charge from nothing to several thousand dollars; some have closed (Warhol, Basquiat, Pollock-Krasner)'},
  'crate': {'n': 'Museum-grade crate', 'lo': 700, 'hi': 2400, 'vf': 'S', 'src': fair, 'note': 'single-wall $700–1,400 (works on paper, mid-size), double-wall $1,200–2,400 (canvases); climate lining and a data logger add $150–450'},
  'freight_inter': {'n': 'Freight, intercontinental', 'lo': 1800, 'hi': 4500, 'vf': 'S', 'src': fair, 'note': 'white-glove door to door with brokerage $1,800–4,500; airport to airport $900–2,200; a courier adds a fare and a day rate; a very large work or a sculpture costs more'},
  'freight_intra': {'n': 'Freight, within the continent', 'lo': 600, 'hi': 1500, 'vf': 'U', 'src': fair, 'note': 'the playbook’s domestic door-to-door figure ($600–1,500); no intra-Europe figure was published'},
  'insurance': {'n': 'Transit insurance', 'lo': 0.0015, 'hi': 0.0045, 'vf': 'S', 'src': fair, 'note': 'all-risk, nail to nail, 0.15% to 0.45% of declared value per leg, minimum $150–300'},
  'broker': {'n': 'Customs broker', 'lo': 120, 'hi': 450, 'vf': 'S', 'src': fair, 'note': 'entry and clearance per shipment; temporary import bonds 0.5% to 1.5% of value pro rata'},
  'install': {'n': 'Installation', 'lo': 250, 'hi': 900, 'vf': 'S', 'src': fair, 'note': 'a two-person crew with hardware'},
  'apostille': {'n': 'Apostille', 'lo': 20, 'hi': 60, 'vf': 'V', 'src': [["gov.uk, Get your document legalised (£45 standard, £35 e-Apostille)", "https://www.gov.uk/get-document-legalised"], ["US Department of State, Office of Authentications ($20 a document)", "https://adoption.state.gov/en/replace-certify/authenticate-documents/request-services.html"]], 'note': 'per document: $20 at the US State Department, £45 at the FCDO, €10 at a French notary; plus the notary'},
  'legalisation': {'n': 'Consular legalisation', 'lo': 300, 'hi': 1500, 'vf': 'U', 'src': [], 'note': 'three stamps per document (notary, foreign ministry, embassy) and an agent; the UAE ministry’s attestation about AED 150'},
  'cites': {'n': 'CITES permits', 'lo': 100, 'hi': 600, 'vf': 'U', 'src': [["gov.uk, Declare ivory you intend to sell (pre-1918 certificate £250)", "https://www.gov.uk/guidance/declare-ivory-you-intend-to-sell-or-hire-out"]], 'note': 'export and import permits; a UK pre-1918 ivory exemption certificate is £250 and takes about three months'},
  'carnet': {'n': 'ATA carnet', 'lo': 300, 'hi': 1200, 'vf': 'U', 'src': [["Singapore Customs, ATA carnet", "https://customs.gov.sg/businesses/importing-goods/temporary-import-scheme/ata-carnet"]], 'note': 'the chamber of commerce’s fee plus a bond or premium on the value'},
  'storage': {'n': 'Fine-art storage', 'lo': 5, 'hi': 15, 'vf': 'S', 'src': [["Artwork Archive, the cost of shipping and storing art", "https://www.artworkarchive.com/blog/cost-of-your-art-collection-shipping-and-storage"]], 'note': 'climate-controlled storage about $5–15 per square foot a month (undated)'}}

# ---- the worked case ----
mc = world['moscow_case']
NAV_MOSCOW = {
  'q': 'I have $3 million in Moscow. Can it become a painting on a wall in Washington, and could the value go up on the way?',
  'scenario': mc['scenario'],
  'gates': [{'n': g['gate'], 'status': g['status'], 'rule': g['rule'], 'src': g.get('src') or [], 'vf': g.get('vf', ''), 'note': g.get('note', '')} for g in mc['gates']],
  'alternative': mc['lawful_alternative'],
  'flags': mc['red_flags'],
  'src': mc['src']}
# the auditor’s reading of Schedule 3A (legislation.gov.uk, 9 Nov 2026): paragraph 21 (works of art, collectors’ pieces and antiques,
# chapter 97) carries no sales-price threshold; the £250 floor belongs to other entries
for g in NAV_MOSCOW['gates']:
    if 'worth £250 or more' in g['rule']:
        g['rule'] = g['rule'].replace('works of art worth £250 or more', 'works of art of any value (Schedule 3A, paragraph 21, carries no price threshold)')
        g['src'] = [['Russia (Sanctions) (EU Exit) Regulations 2019, Schedule 3A, para 21', 'https://www.legislation.gov.uk/uksi/2019/855/schedule/3A']] + [x for x in g['src'] if 'womenartdealers' not in x[1]]
        g['vf'] = 'V'

head = """/* ---------- NAVIGATOR DATA (v24): the rules the route planner reads ----------
   Generated by tools/gen_research.py from the v24 research bundle (data/research/v24.json); edit the research
   and regenerate, not this file. NAV_RULES: one entry per jurisdiction (REGIMES ids plus nl, es, ru, qa), each field with
   its sources (src: [[label, url]]) and its flag (vf: V read on a primary source; S secondary; U unconfirmed). The fields:
     exp   none (true: no export licence for works of art), law, authority, needs [{cat painting|sculpture|paper|photo|design|
           any, age (years), value (local currency, cur), before (a year: works made before it), bar (may not leave), artists
           (the named artists may not leave), note}], time, fee, temporary, treasure, eu_licence, listed, tax, needsText
     imp   duty, duty_rate, vat, vat_rate, icg, special, state_tax, overlays, cpia
     aml   rule, threshold, asks;  sanctions  rule, detail;  apost  hague, authority, fee, time, docs;  cites  rule;  freeport  rule
   NAV_EU: the EU export licence (Regulation 116/2009) and the common import rules for fr, de, it, nl, es.
   NAV_FEES: indicative costs, US$ (insurance as a share of value per leg; storage per square foot a month).
   NAV_MOSCOW: the worked case the owner asked for, gate by gate, with the lawful alternative and the red flags. */
"""
out = head + js('NAV_RULES', rules) + js('NAV_EU', NAV_EU) + js('NAV_FEES', NAV_FEES) + js('NAV_MOSCOW', NAV_MOSCOW)
(root / 'src' / 'data_nav.js').write_text(out, encoding='utf-8')
n_src = sum(len(f.get('src', [])) for r in rules.values() for f in r.values() if isinstance(f, dict))
print(f'wrote src/data_nav.js: {len(rules)} jurisdictions, {n_src} source links, {len(NAV_FEES)} fee lines, {len(NAV_MOSCOW["gates"])} Moscow gates')

# ======================= the Season and the Horizon =======================
TICKET_HINT = re.compile(r'ticket|vivaticket|eventbrite|box-office|boxoffice|/tickets|buy-tickets|MCH_shop|/admission', re.I)
OFFICIAL = ('frieze.com', 'artbasel.com', 'sothebys.com', 'phillips.com', 'christies.com', 'metmuseum.org', 'rijksmuseum.nl', 'documenta.de',
            'skulptur-projekte.de', 'biennial.com', 'newartdealers.org', 'artbrussels.com', 'tefaf.com', 'centrepompidou.fr', 'labiennale.org',
            'thesalonny.com', 'mediaoffice.abudhabi', 'deloitte.com', 'miamibeachconvention.com', 'bunka.go.jp', 'tate.org.uk', 'moma.org',
            'louvre.fr', 'nga.gov', 'si.edu', 'fondationlouisvuitton.fr', 'fondationbeyeler.ch', 'ngv.vic.gov.au', 'sharjahart.org')
def link_kind(u):
    if not u: return None
    h = urlparse(u).netloc.lower().replace('www.', '')
    if TICKET_HINT.search(u): return 'tickets'
    if any(h == d or h.endswith('.' + d) for d in OFFICIAL): return 'official'
    return 'details'

events = []
for e in EV['events']:
    tix = e.get('tix') or ''
    events.append({k: e.get(k) for k in ('id', 'kind', 'n', 'd', 'e', 'city', 'country', 'venue', 'who', 'price', 'why', 'note', 'vf') if e.get(k) not in (None, '')}
                  | {'tix': tix, 'tk': link_kind(tix), 'src': e.get('src') or []})
events.sort(key=lambda x: (x['d'], x.get('e') or x['d']))

theses = []
for t in HZ['theses']:
    rec = t.get('record') or {}
    theses.append({'id': t['id'], 't': t['t'], 'thesis': t['thesis'], 'horizon': t.get('horizon', ''), 'dir': t.get('dir', 'steady'),
                   'evidence': [{'f': x['f'], 'src': x.get('src') or [], 'vf': x.get('vf', 'U')} for x in t.get('evidence', [])],
                   'risks': t.get('risks') or [],
                   'record': {k: rec.get(k) for k in ('artist', 'work', 'price', 'house', 'date', 'src', 'vf', 'note') if rec.get(k) not in (None, '')} if rec else None,
                   'movements': t.get('movements') or [], 'artists': t.get('artists') or [], 'places': t.get('places') or []})

KEEP = ('India sets its records at home', 'Korea: auctions up, galleries down', 'Scarcity pays: a Yuan scroll and a Rembrandt')
signals = [{'t': s['t'], 'dir': s['dir'], 'p': s['p'], 's': s.get('src') or [], 'vf': s.get('vf', 'S')} for s in HZ['signals'] if s['t'] in KEEP]

def js(name, obj):
    return f'const {name}=' + json.dumps(typo(obj), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + ';\n'

head_e = """/* ---------- THE SEASON (v24): the next months of fairs, sales, biennales, shows and openings, with the links ----------
   Generated by tools/gen_research.py from data/research/v24.json; edit the research and regenerate. Each entry: id, kind (fair |
   sale | biennale | exhibition | opening | conference), n, d, e (last day), city, country, venue, who, tix (the page the research
   opened), tk (tickets | official | details), price (prose, as published), why (why the desk lists it), note, src, vf (V/S/U).
   EVENTS_ASOF is the research date; the Season view hides what has ended and the live desk refreshes the file. */
"""
head_h = """/* ---------- THE HORIZON (v24): where the money goes next, as theses with their evidence ----------
   Generated by tools/gen_research.py from data/research/v24.json; edit the research and regenerate. THESES: id, t (the claim in
   a line), thesis (the argument), horizon (years), dir (heat | steady | cool), evidence [{f, src, vf}], risks [], record {artist,
   work, price, house, date, src, vf, note}, movements (MOVEMENTS ids), artists, places. HORIZON_SIGNALS: three signals from the
   same research that the Signals view did not already carry; the Signals view appends them. */
"""
(root / 'src' / 'data_season.js').write_text(head_e + f"const EVENTS_ASOF='{EV['asof']}';\n" + js('EVENTS', events) + head_h + f"const HORIZON_ASOF='{HZ['asof']}';\n" + js('THESES', theses) + js('HORIZON_SIGNALS', signals), encoding='utf-8')
for stale in ('data_events.js', 'data_horizon.js'):
    p = root / 'src' / stale
    if p.exists(): p.unlink()
kinds = {}
for e in events: kinds[e['kind']] = kinds.get(e['kind'], 0) + 1
tk = {}
for e in events: tk[e['tk']] = tk.get(e['tk'], 0) + 1
print(f"wrote src/data_season.js: {len(events)} events {kinds}, links {tk}; {len(theses)} theses, {sum(len(t['evidence']) for t in theses)} evidence lines, {len(signals)} signals")

# ======================= v25: the Net, the money behind the sales, the further jurisdictions, the Transformation =======================
MS = B25.get('money_sales') or {}
PL = B25.get('players') or {}
LM = B25.get('law_more') or {}
TR = B25.get('transformation') or {}

# the ten further jurisdictions join NAV_RULES (same schema, plus the capital-controls field) and are written again
if LM.get('jurisdictions'):
    more = {}
    for x in LM['jurisdictions']:
        e = entry(x)
        if 'capital' in x: e['capital'] = simple(x['capital'], 'rule', 'limits', 'routes', 'vf', 'note')
        if e.get('exp') is not None and not e['exp'].get('needs'):
            e['exp']['none'] = bool(e['exp'].get('none', True))
        more[x['j']] = e
    # Canada: the Cultural Property Export and Import Act bites on works 50 years old by an artist no longer living, above the Group V
    # thresholds; a work made outside Canada with no Canadian connection: paintings and sculpture C$30,000, drawings, prints and
    # photographs C$15,000 (the Canadian-made thresholds are lower; the research has them in needsText). Read on the Act (V).
    if 'ca' in more and more['ca'].get('exp') is not None:
        ce = more['ca']['exp']
        ce['needs'] = [{'cat': 'painting', 'age': 50, 'value': 30000, 'cur': 'cad', 'note': 'a painting 50 years old by an artist no longer living, over C$30,000 (C$15,000 if the artist lived in Canada; C$20,000 for a Canadian subject): a permit from Canadian Heritage, which may be refused and referred to the Review Board for up to six months'},
                       {'cat': 'sculpture', 'age': 50, 'value': 30000, 'cur': 'cad', 'note': 'a sculpture 50 years old by an artist no longer living, over C$30,000 (C$15,000 if the artist lived in Canada): a permit from Canadian Heritage'},
                       {'cat': 'paper', 'age': 50, 'value': 15000, 'cur': 'cad', 'note': 'a drawing or print 50 years old by an artist no longer living, over C$15,000 (C$5,000 if the artist lived in Canada): a permit from Canadian Heritage'},
                       {'cat': 'photo', 'age': 50, 'value': 15000, 'cur': 'cad', 'note': 'a photograph 50 years old by an artist no longer living, over the Group VII threshold (taken here as C$15,000, U): a permit from Canadian Heritage'}]
        ce['none'] = False; ce['dead'] = True
    rules.update(more)
    out = head + js('NAV_RULES', rules) + js('NAV_EU', NAV_EU) + js('NAV_FEES', NAV_FEES) + js('NAV_MOSCOW', NAV_MOSCOW)
    (root / 'src' / 'data_nav.js').write_text(out, encoding='utf-8')
    print(f"  + {len(more)} further jurisdictions in NAV_RULES ({', '.join(more)}); {len(rules)} in all")

# the money behind the lots: LOT_FIN keyed by lot id (joined to RESULTS at boot) and NET_FLOWS for the globe.
# The research ids came from the export in B25['lots'] (a Python slug that strips accents); the page's ids are app.js's slug
# (lower-case, the marks ’'".,:() dropped, every other run of non-alphanumerics a hyphen, accents included), computed at boot from
# the artist's last word and the title. app_slug() repeats it here so that every id written matches the page's.
def app_slug(artist, title):
    s = (str(artist).split(' ')[-1] + '-' + str(title)).lower()
    s = re.sub(r"[’'\".,:()]", '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')
LOT_AT = {l['id']: (l.get('artist'), l.get('title')) for l in (B25.get('lots') or []) if l.get('id')}
def page_id(l):
    a, t = l.get('artist'), l.get('title')
    if not (a and t): a, t = LOT_AT.get(l['id'], (None, None))
    return app_slug(a, t) if (a and t) else l['id']
FIN_KEYS = ('con', 'conType', 'conCity', 'conCountry', 'guar', 'guarBy', 'buyer', 'buyerType', 'buyerCity', 'buyerRegion', 'bidders', 'dir', 'fees', 'src', 'vf', 'note')
lot_fin, new_lots = {}, []
for l in MS.get('lots', []):
    l['id'] = page_id(l)
    lot_fin[l['id']] = {k: l.get(k) for k in FIN_KEYS if l.get(k) not in (None, '')}
    if l.get('new'):
        CAT = {'Pablo Picasso': 'Impressionist & Modern', 'Claude Monet': 'Impressionist & Modern', 'Édouard Manet': 'Impressionist & Modern', 'René Magritte': 'Impressionist & Modern'}
        nl = {k: l.get(k) for k in ('id', 'artist', 'title', 'house', 'city', 'date') if l.get(k) not in (None, '')}
        nl['price'] = l.get('price_musd'); nl['cat'] = CAT.get(l.get('artist'), 'Post-War & Contemporary'); nl['year'] = ''; nl['rec'] = []
        nl['note'] = (l.get('dir') or l.get('note') or '')[:240]
        new_lots.append(nl)
REGION_LL = {'Asia': ['Hong Kong'], 'Europe': ['London'], 'North America': ['New York'], 'Middle East': ['Abu Dhabi'], 'Latin America': ['São Paulo'], 'Africa': ['Lagos']}
flows = []
for l in MS.get('lots', []):
    flows.append({'id': l['id'], 'from': l.get('conCity') or '', 'fromWho': l.get('con') or '', 'fromType': l.get('conType') or '', 'to': l.get('buyerCity') or '', 'toRegion': l.get('buyerRegion') or '', 'toWho': l.get('buyer') or '', 'toType': l.get('buyerType') or '', 'guar': l.get('guar') or 'unknown', 'guarBy': l.get('guarBy') or '', 'vf': l.get('vf', 'U')})
years = [{k: y.get(k) for k in ('y', 'guaranteed_share', 'asia_share', 'note', 'src', 'vf') if y.get(k) not in (None, '')} for y in MS.get('years', [])]

# the players
players = []
for p in PL.get('players', []):
    players.append({k: p.get(k) for k in ('id', 'n', 'kind', 'extends', 'hq', 'offices', 'people', 'represents', 'owner', 'scale', 'edge', 'src', 'vf', 'note') if p.get(k) not in (None, '', [], {})})
markets = [{k: m.get(k) for k in ('city', 'role', 'src', 'vf') if m.get(k) not in (None, '')} for m in PL.get('markets', [])]

# the Transformation
transform = {k: TR.get(k) for k in ('asof', 'stages', 'typologies', 'roundtrip', 'cases') if TR.get(k) not in (None, '', [])}
if LM.get('dhaka_toronto_case'): transform['dhaka'] = LM['dhaka_toronto_case']   # the research's own reading of the owner's worked route, gate by gate

head_n = """/* ---------- THE NET (v25): the players, the money behind the major sales, the Transformation ----------
   Generated by tools/gen_research.py from data/research/bundle.json (key v25); edit the research and regenerate.
   NET_PLAYERS: the trade's organisations with where they are (hq, offices), who fronts them (people), whom they represent, who owns
   them, their scale and edge, with sources and flags. NET_MARKETS: the significant markets in a paragraph each. LOT_FIN: the money
   behind each major lot since 2020, keyed by lot id (consignor, guarantee, buyer, direction, fees); RESULTS gain it at boot as r.fin.
   NET_FLOWS: the same as arcs for the globe (from the consignor's city to the room, from the room to the buyer's city or region).
   NET_YEARS: the finance of each year since 2020. NET_NEW_LOTS: major sales the terminal lacked, added to the Hammer at boot.
   TRANSFORM: the stages of money through art, the typologies and the controls that catch them, the round trip, the public cases.
"""
asof = MS.get('asof') or PL.get('asof') or TR.get('asof') or ''

# ======================= v26: the East joins the Net; the vaults; the Deal Room; the trade's workflows (the pitch); the live feeds =======================
B26 = BUNDLE.get('v26', {})
EA = B26.get('east') or {}
VA = B26.get('vaults') or {}
DL = B26.get('deal') or {}
WF = B26.get('workflows') or {}
AP = B26.get('apis') or {}
# the East's players and markets merge into the Net (a player the Net already has is extended, not duplicated)
have = {p['id']: p for p in players}
n_east_new = 0
for p in EA.get('players', []):
    if not p.get('id') or not p.get('n'): continue
    row = {k: p.get(k) for k in ('id', 'n', 'kind', 'extends', 'hq', 'offices', 'people', 'represents', 'owner', 'scale', 'edge', 'src', 'vf', 'note') if p.get(k) not in (None, '', [], {})}
    if isinstance(row.get('offices'), list): row['offices'] = [o if isinstance(o, str) else (o.get('city') or '') for o in row['offices'] if o]   # the East wrote some offices as {city, country}
    for k in ('edge', 'scale', 'owner', 'note'):   # the East wrote |word| for emphasis; the page has no such markup
        if isinstance(row.get(k), str): row[k] = re.sub(r'\|([^|]{1,40})\|', r'\1', row[k])
    for x in row.get('people') or []:
        if isinstance(x, dict) and isinstance(x.get('note'), str): x['note'] = re.sub(r'\|([^|]{1,40})\|', r'\1', x['note'])
    if isinstance(row.get('represents'), list): row['represents'] = [re.sub(r'^\s*(?:from memory|From memory)\s*[:;,]\s*', '', x) for x in row['represents'] if isinstance(x, str)]   # the flag says it; the list need not
    if p['id'] in have and isinstance(have[p['id']].get('represents'), list): have[p['id']]['represents'] = [re.sub(r'^\s*(?:from memory|From memory)\s*[:;,]\s*', '', x) for x in have[p['id']]['represents'] if isinstance(x, str)]
    row['east'] = True
    if p['id'] in have:
        cur = have[p['id']]
        for k, v in row.items():
            if k in ('offices', 'people', 'represents', 'src') and isinstance(v, list): cur[k] = (cur.get(k) or []) + [x for x in v if x not in (cur.get(k) or [])]
            elif k not in cur or cur.get(k) in (None, '', [], {}): cur[k] = v
    else:
        players.append(row); have[p['id']] = row; n_east_new += 1
def unmem(x):   # "From memory: A, B" → "A, B"; "From memory, before the cuts: A" → "before the cuts: A" (the flag already says U)
    return re.sub(r'^\s*[Ff]rom memory\s*(?:[:;]\s*|,\s*)', '', x) if isinstance(x, str) else x
for pl in players:
    if isinstance(pl.get('represents'), list): pl['represents'] = [unmem(x) for x in pl['represents']]
have_m = {m['city'] for m in markets}
for m in EA.get('markets', []):
    if m.get('city') and m['city'] not in have_m:
        markets.append({k: m.get(k) for k in ('city', 'role', 'src', 'vf') if m.get(k) not in (None, '')}); have_m.add(m['city'])
wire = sorted([{k: w.get(k) for k in ('d', 'city', 't', 'src', 'vf') if w.get(k) not in (None, '')} for w in EA.get('wire', []) if w.get('d') and w.get('t')], key=lambda w: w['d'], reverse=True)
russia = {k: EA['russia'].get(k) for k in ('state', 'law', 'src', 'vf') if EA.get('russia') and EA['russia'].get(k) not in (None, '')} if EA.get('russia') else {}
# the vaults: free ports, bonded stores and storage, with their people and their published contact lines
vaults = []
for v in VA.get('vaults', []):
    if not v.get('id') or not v.get('n'): continue
    row = {k: (v.get(k).strip() if isinstance(v.get(k), str) else v.get(k)) for k in ('id', 'n', 'city', 'country', 'kind', 'operator', 'owner', 'opened', 'size', 'value', 'capital', 'tenants', 'people', 'contact', 'rules', 'fees', 'cases', 'src', 'vf', 'note') if v.get(k) not in (None, '', [], {})}
    if isinstance(row.get('contact'), dict): row['contact'] = {k: x for k, x in row['contact'].items() if x not in (None, '')}
    vaults.append(row)
vault_ids = {v['id'] for v in vaults}
def strip_ids(t):   # the research wrote vault ids in parentheses inside its prose; the page names the vaults beneath, so the ids go
    return re.sub(r'\s*\(((?:[a-z0-9_]+)(?:,\s*[a-z0-9_]+)*)\)', lambda m: '' if all(x.strip() in vault_ids for x in m.group(1).split(',')) else m.group(0), t)
vault_cities = [{k: (strip_ids(c.get(k)) if k == 'summary' else c.get(k)) for k in ('city', 'summary', 'src', 'vf') if c.get(k) not in (None, '')} for c in VA.get('cities', []) if c.get('city')]
# the Deal Room's research
deal = {k: DL.get(k) for k in ('asof', 'terms', 'economics', 'cases', 'people', 'guarantors') if DL.get(k) not in (None, '', [])}
# the research read Christie's schedule as 27/22/15 from September 2025; Christie's moved to 28% on the first $2m in September 2026
# (MyArtBroker, 28 Sep 2026, S; the terminal's FEES table and SCHED carry it), so the lines that cite 27% say so
CHR_NOTE = ' Superseded in September 2026: Christie’s now charges 28% on the first $2m, 22% to $8m and 15% above, the structure Sotheby’s adopted in February (MyArtBroker, 28 Sep 2026); the terminal’s schedules carry the 2026 tiers.'
CHR_SRC = ['MyArtBroker, 28 Sep 2026: the premium problem', 'https://www.myartbroker.com/market/articles/the-premium-problem-what-rising-auction-fees-mean-for-sellers']
for t in deal.get('terms') or []:
    if t.get('id') == 'buyers-premium' and '27%' in (t.get('what') or '') and 'Superseded' not in t['what']:
        t['what'] = t['what'].rstrip() + CHR_NOTE; t['src'] = (t.get('src') or []) + [CHR_SRC]
for l in (deal.get('economics') or {}).get('lines') or []:
    if 'Christie' in (l.get('party') or '') and '27%' in (l.get('basis') or '') and 'Superseded' not in l['basis']:
        l['basis'] = l['basis'].rstrip() + CHR_NOTE; l['src'] = (l.get('src') or []) + [CHR_SRC]
# the trade's day-to-day and what it pays for: the pitch
pitch = {k: WF.get(k) for k in ('asof', 'roles', 'tools', 'functions', 'pricing') if WF.get(k) not in (None, '', [])}
# the feeds a page can reach itself, and the datasets for the desk
feeds = {'asof': AP.get('asof', ''), 'apis': [{k: a.get(k) for k in ('id', 'n', 'owner', 'what', 'endpoint', 'auth', 'cors', 'rate', 'licence', 'use', 'src', 'vf') if a.get(k) not in (None, '')} for a in AP.get('apis', [])],
         'datasets': [{k: d.get(k) for k in ('id', 'n', 'what', 'url', 'format', 'licence', 'size', 'use', 'src', 'vf') if d.get(k) not in (None, '')} for d in AP.get('datasets', [])],
         'closed': AP.get('closed', [])}
head_n += """   v26 adds: NET_WIRE (what happened in the East, 2025–26, by date), NET_RUSSIA (the Russian market and its law), VAULTS and
   VAULT_CITIES (free ports, bonded stores and fine-art storage by city: operator, owner, size, value as published, people, the
   organisation's published contact lines, rules, cases), DEAL (the Deal Room's research: terms, the economics of a $50m hammer,
   cases, people, guarantors), PITCH (the trade's roles and their days, the tools they pay for and their prices, the functions a
   terminal should offer, the pricing benchmarks) and OPEN_FEEDS (the open APIs and datasets, with auth, CORS and licence as read).
   The East's players carry east: true. */
"""
(root / 'src' / 'data_net.js').write_text(head_n + f"const NET_ASOF='{asof}';\n" + js('NET_PLAYERS', players) + js('NET_MARKETS', markets) + js('LOT_FIN', lot_fin) + js('NET_FLOWS', flows) + js('NET_YEARS', years) + js('NET_NEW_LOTS', new_lots) + js('TRANSFORM', transform) + js('NET_WIRE', wire) + js('NET_RUSSIA', russia) + js('VAULTS', vaults) + js('VAULT_CITIES', vault_cities) + js('DEAL', deal) + js('PITCH', pitch) + js('OPEN_FEEDS', feeds), encoding='utf-8')
print(f"wrote src/data_net.js: {len(players)} players ({n_east_new} from the East), {len(markets)} markets, {len(lot_fin)} lots with their money ({len(new_lots)} new), {len(flows)} flows, {len(transform.get('stages', []))} transformation stages; {len(wire)} wire lines; {len(vaults)} vaults in {len(vault_cities)} cities; deal: {len(deal.get('terms', []))} terms, {len(deal.get('cases', []))} cases, {len(deal.get('people', []))} people; pitch: {len(pitch.get('roles', []))} roles, {len(pitch.get('tools', []))} tools, {len(pitch.get('functions', []))} functions; feeds: {len(feeds['apis'])} APIs, {len(feeds['datasets'])} datasets")
