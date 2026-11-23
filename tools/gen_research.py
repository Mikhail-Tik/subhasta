#!/usr/bin/env python3
"""Generate the v24 data files from the research bundle.

    python3 tools/gen_research.py [--bundle PATH]

Reads data/research/bundle.json: key v24 (law_europe, law_world, finance, events, horizon: the five research briefs of v24)
and key v25 (money_sales, players, law_more, transformation, audit_engine: the briefs of v25), each written by a research agent
under scratchpad/v2x/BRIEF_COMMON.md (every fact with a URL opened in the session, every entry flagged V/S/U), and writes:
  src/data_nav.js      NAV_RULES (one entry per jurisdiction: REGIMES ids plus nl, es, ru, qa, the v25 ten, and za and nz from the v29 research), NAV_EU,
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
        o = re.sub(r'\bUSD\s?(?=\d)', '$', o)   # "USD 2m" → "$2m"
        o = re.sub(r'\$(\d+(?:\.\d+)?) (million|billion)\b', lambda m: '$' + m.group(1) + ('m' if m.group(2) == 'million' else 'bn'), o)   # "$27 million" → "$27m"
        o = re.sub(r'\$(\d[\d.,]*)([MBK])\b', lambda m: '$' + m.group(1) + {'M': 'm', 'B': 'bn', 'K': 'k'}[m.group(2)], o)   # $40M → $40m, the page's unit style
        # the researcher's "from memory" (its own background knowledge, flagged U) reads on the page as "unconfirmed": the flag says what it is
        o = re.sub(r'\b[Ff]rom memory of (?:the )?', 'unconfirmed, from ', o)
        o = re.sub(r'\b[Cc]arried from memory\b', 'carried unconfirmed', o)
        o = re.sub(r'\b(?:are|is) from memory\b', lambda m: m.group(0).split(' ')[0] + ' unconfirmed', o)
        return re.sub(r'\b[Ff]rom memory\b', 'unconfirmed', o)
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
    # v29: the jurisdictions research (the audit's finding 10) — a researched cell replaces the fields it states and keeps the engine's
    # rows (needs, none, dead) where the research gives none; a jurisdiction with an export and an import cell joins the Navigator
    # whole (za, nz); one with only an apostille cell (tw, th, ge, kz, tr, il, sa, qa) waits in the bundle rather than compose half a plan
    JR = (BUNDLE.get('v29') or {}).get('juris') or {}
    j_merged, j_new, j_waiting = [], [], []
    for jk, jv in (JR.get('rules') or {}).items():
        cells = {c: jv[c] for c in ('exp', 'imp', 'aml', 'apost', 'cites', 'capital', 'sanctions') if isinstance(jv.get(c), dict)}
        if jk in rules:
            for c, cell in cells.items():
                cur = rules[jk].get(c) or {}
                keep = {k: cur[k] for k in ('needs', 'none', 'dead', 'ages', 'bars') if k in cur and k not in cell}
                merged = dict(cur); merged.update(cell); merged.update(keep)
                if c == 'imp' and merged.get('vat_rate') is not None and merged['vat_rate'] > 1: merged['vat_rate'] = merged['vat_rate'] / 100
                if c == 'imp' and merged.get('duty_rate') is not None and merged['duty_rate'] > 1: merged['duty_rate'] = merged['duty_rate'] / 100
                rules[jk][c] = merged
            if jv.get('note'): rules[jk]['note'] = jv['note']
            j_merged.append(jk)
        elif 'exp' in cells and 'imp' in cells:
            e = {'n': jv.get('n') or jk}; e.update(cells)
            if e['imp'].get('vat_rate') is not None and e['imp']['vat_rate'] > 1: e['imp']['vat_rate'] = e['imp']['vat_rate'] / 100
            if e['imp'].get('duty_rate') is not None and e['imp']['duty_rate'] > 1: e['imp']['duty_rate'] = e['imp']['duty_rate'] / 100
            if not e['exp'].get('needs'): e['exp']['none'] = bool(e['exp'].get('none', True))
            e['src'] = jv.get('src') or []; e['vf'] = jv.get('vf') or 'S'; rules[jk] = e; j_new.append(jk)
        else: j_waiting.append(jk)
    if JR: print(f"  + v29 jurisdictions: {len(j_merged)} merged ({', '.join(j_merged)}), {len(j_new)} new ({', '.join(j_new)}), {len(j_waiting)} waiting with an apostille cell only ({', '.join(j_waiting)})")
    out = head + js('NAV_RULES', rules) + js('NAV_EU', NAV_EU) + js('NAV_FEES', NAV_FEES) + js('NAV_MOSCOW', NAV_MOSCOW)
    (root / 'src' / 'data_nav.js').write_text(out, encoding='utf-8')
    print(f"  + {len(more)} further jurisdictions in NAV_RULES ({', '.join(more)}); {len(rules)} in all")

# the money behind the lots: LOT_FIN keyed by lot id (joined to RESULTS at boot) and NET_FLOWS for the globe.
# The research ids came from the export in B25['lots'] (a Python slug that strips accents); the page's ids are app.js's slug
# (lower-case, the marks ’'".,:() dropped, every other run of non-alphanumerics a hyphen, accents included), computed at boot from
# the artist's last word and the title. app_slug() repeats it here so that every id written matches the page's.
def unmem(x):   # "From memory: A, B" → "A, B"; "From memory, before the cuts: A" → "before the cuts: A" (the flag already says U);
    # inline "(from memory, U)" → "(unconfirmed, U)", "from memory of trade practice" → "unconfirmed, from trade practice": the page
    # says what the flag means, not where the researcher got it
    if not isinstance(x, str): return x
    x = re.sub(r'^\s*[Ff]rom memory\s*(?:[:;]\s*|,\s*)', '', x)
    x = re.sub(r'\b[Ff]rom memory of (?:the )?', 'unconfirmed, from ', x)
    x = re.sub(r'\b[Ff]rom memory\b', 'unconfirmed', x)
    x = re.sub(r'\b[Cc]arried from memory\b', 'carried unconfirmed', x)
    return x
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
    row = {k: p.get(k) for k in ('id', 'n', 'kind', 'extends', 'hq', 'offices', 'people', 'represents', 'owner', 'scale', 'edge', 'src', 'vf', 'note') if p.get(k) not in (None, '', [], {})}
    for k in ('owner', 'scale', 'edge', 'note'):   # "Privately held (from memory)" → "Privately held (unconfirmed)": the flag says where it came from
        if isinstance(row.get(k), str): row[k] = unmem(row[k])
    for x in row.get('people') or []:
        if isinstance(x, dict):
            for k in ('note', 'role'):
                if isinstance(x.get(k), str): x[k] = unmem(x[k])
    if isinstance(row.get('offices'), list): row['offices'] = [unmem(o) if isinstance(o, str) else o for o in row['offices']]
    if isinstance(row.get('represents'), list): row['represents'] = [unmem(o) if isinstance(o, str) else o for o in row['represents']]
    players.append(row)
markets = [{k: (unmem(m.get(k)) if k == 'role' else m.get(k)) for k in ('city', 'role', 'src', 'vf') if m.get(k) not in (None, '')} for m in PL.get('markets', [])]

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
    if isinstance(row.get('offices'), list): row['offices'] = [unmem(o) if isinstance(o, str) else (o.get('city') or '') for o in row['offices'] if o]   # the East wrote some offices as {city, country}
    for k in ('edge', 'scale', 'owner', 'note'):   # the East wrote |word| for emphasis; the page has no such markup
        if isinstance(row.get(k), str): row[k] = unmem(re.sub(r'\|([^|]{1,40})\|', r'\1', row[k]))
    for x in row.get('people') or []:
        if isinstance(x, dict) and isinstance(x.get('note'), str): x['note'] = unmem(re.sub(r'\|([^|]{1,40})\|', r'\1', x['note']))
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
for pl in players:
    if isinstance(pl.get('represents'), list): pl['represents'] = [unmem(x) for x in pl['represents']]
have_m = {m['city'] for m in markets}
for m in EA.get('markets', []):
    if m.get('city') and m['city'] not in have_m:
        markets.append({k: (unmem(m.get(k)) if k == 'role' else m.get(k)) for k in ('city', 'role', 'src', 'vf') if m.get(k) not in (None, '')}); have_m.add(m['city'])
wire = sorted([{k: w.get(k) for k in ('d', 'city', 't', 'src', 'vf') if w.get(k) not in (None, '')} for w in EA.get('wire', []) if w.get('d') and w.get('t')], key=lambda w: w['d'], reverse=True)
russia = {k: EA['russia'].get(k) for k in ('state', 'law', 'src', 'vf') if EA.get('russia') and EA['russia'].get(k) not in (None, '')} if EA.get('russia') else {}
# ======================= v30 (23 Nov 2026): the South joins the Net; the official customs corridors (HS 97) =======================
V30 = root / 'data' / 'research' / 'v30'
SO = json.load(open(V30 / 'south.json', encoding='utf-8')) if (V30 / 'south.json').exists() else {}
TD = json.load(open(V30 / 'trade.json', encoding='utf-8')) if (V30 / 'trade.json').exists() else {}
n_south_new = 0
for p in SO.get('players', []):
    if not p.get('id') or not p.get('n'): continue
    row = {k: p.get(k) for k in ('id', 'n', 'kind', 'extends', 'hq', 'offices', 'people', 'represents', 'owner', 'scale', 'edge', 'src', 'vf', 'note') if p.get(k) not in (None, '', [], {})}
    if isinstance(row.get('offices'), list): row['offices'] = [o if isinstance(o, str) else (o.get('city') or '') for o in row['offices'] if o]
    for k in ('edge', 'scale', 'owner', 'note'):
        if isinstance(row.get(k), str): row[k] = unmem(row[k])
    row['south'] = True
    if p['id'] in have:
        cur = have[p['id']]
        for k, v in row.items():
            if k in ('offices', 'people', 'represents', 'src') and isinstance(v, list): cur[k] = (cur.get(k) or []) + [x for x in v if x not in (cur.get(k) or [])]
            elif k not in cur or cur.get(k) in (None, '', [], {}): cur[k] = v
    else:
        players.append(row); have[p['id']] = row; n_south_new += 1
for m in SO.get('markets', []):
    if m.get('city') and m['city'] not in have_m:
        markets.append({k: (unmem(m.get(k)) if k == 'role' else m.get(k)) for k in ('city', 'role', 'src', 'vf') if m.get(k) not in (None, '')}); have_m.add(m['city'])
wire = sorted(wire + [{k: w.get(k) for k in ('d', 'city', 't', 'src', 'vf') if w.get(k) not in (None, '')} for w in SO.get('wire', []) if w.get('d') and w.get('t')], key=lambda w: w['d'], reverse=True)
# the customs corridors: each economy at its trade city, so the globe can draw the arc and name the place
TRADE_LL = {'US': ['New York', 40.71, -74.01], 'GB': ['London', 51.51, -0.13], 'CH': ['Geneva', 46.2, 6.14], 'HK': ['Hong Kong', 22.3, 114.17], 'FR': ['Paris', 48.86, 2.35],
            'CN': ['Shanghai', 31.23, 121.47], 'DE': ['Berlin', 52.52, 13.41], 'JP': ['Tokyo', 35.68, 139.69], 'KR': ['Seoul', 37.57, 126.98], 'SG': ['Singapore', 1.29, 103.85],
            'AE': ['Dubai', 25.2, 55.27], 'IT': ['Milan', 45.46, 9.19], 'NL': ['Amsterdam', 52.37, 4.9], 'BE': ['Brussels', 50.85, 4.35], 'CA': ['Toronto', 43.65, -79.38],
            'IN': ['Mumbai', 19.08, 72.88], 'BR': ['São Paulo', -23.55, -46.63], 'MX': ['Mexico City', 19.43, -99.13], 'ZA': ['Cape Town', -33.92, 18.42], 'NG': ['Lagos', 6.52, 3.38],
            'AU': ['Sydney', -33.87, 151.21], 'KE': ['Nairobi', -1.29, 36.82], 'MA': ['Marrakech', 31.63, -8.0], 'EG': ['Cairo', 30.04, 31.24], 'TW': ['Taipei', 25.03, 121.57],
            'ID': ['Jakarta', -6.21, 106.85], 'TH': ['Bangkok', 13.76, 100.5], 'PH': ['Manila', 14.6, 120.98], 'VN': ['Ho Chi Minh City', 10.82, 106.63], 'AR': ['Buenos Aires', -34.6, -58.38],
            'CO': ['Bogotá', 4.71, -74.07], 'ES': ['Madrid', 40.42, -3.7], 'AT': ['Vienna', 48.21, 16.37], 'SE': ['Stockholm', 59.33, 18.07], 'DK': ['Copenhagen', 55.68, 12.57],
            'PT': ['Lisbon', 38.72, -9.14], 'IE': ['Dublin', 53.35, -6.26], 'PL': ['Warsaw', 52.23, 21.01], 'CZ': ['Prague', 50.08, 14.44], 'TR': ['Istanbul', 41.01, 28.98],
            'IL': ['Tel Aviv', 32.08, 34.78], 'SA': ['Riyadh', 24.71, 46.68], 'QA': ['Doha', 25.29, 51.53], 'NZ': ['Auckland', -36.85, 174.76], 'RU': ['Moscow', 55.76, 37.62],
            'MC': ['Monaco', 43.74, 7.42], 'LU': ['Luxembourg', 49.61, 6.13], 'OM': ['Muscat', 23.59, 58.41], 'KW': ['Kuwait City', 29.38, 47.99], 'BH': ['Manama', 26.23, 50.59],
            'LB': ['Beirut', 33.89, 35.5], 'GR': ['Athens', 37.98, 23.73], 'HU': ['Budapest', 47.5, 19.04], 'NO': ['Oslo', 59.91, 10.75], 'FI': ['Helsinki', 60.17, 24.94],
            'MY': ['Kuala Lumpur', 3.14, 101.69], 'PK': ['Karachi', 24.86, 67.01], 'BD': ['Dhaka', 23.81, 90.41], 'LK': ['Colombo', 6.93, 79.85], 'CL': ['Santiago', -33.45, -70.67],
            'PE': ['Lima', -12.05, -77.04], 'GH': ['Accra', 5.6, -0.19], 'ET': ['Addis Ababa', 9.02, 38.75], 'TZ': ['Dar es Salaam', -6.79, 39.28], 'UG': ['Kampala', 0.35, 32.58],
            'MO': ['Macau', 22.2, 113.55], 'LI': ['Vaduz', 47.14, 9.52], 'PA': ['Panama City', 8.98, -79.52], 'UY': ['Montevideo', -34.9, -56.16], 'JE': ['Jersey', 49.21, -2.13]}
trade = {}
if TD:
    tflows, held = [], 0
    for f in TD.get('flows', []):
        a, b = TRADE_LL.get(f.get('from')), TRADE_LL.get(f.get('to'))
        if not a or not b or not f.get('v') or not f.get('src'): held += 1; continue
        tflows.append({'from': f['from'], 'to': f['to'], 'a': [a[0], a[1], a[2]], 'b': [b[0], b[1], b[2]], 'hs': f.get('hs', '97'), 'year': f.get('year'), 'v': f['v'], 'src': f['src'], 'vf': f.get('vf', 'S'), 'note': f.get('note', '')})
    totals = [{'c': t['c'], 'name': t.get('name') or (TRADE_LL.get(t['c']) or [t['c']])[0], 'city': (TRADE_LL.get(t['c']) or [''])[0], 'exp': t.get('exp'), 'imp': t.get('imp'), 'hs': t.get('hs', '97'), 'year': t.get('year'), 'src': t.get('src') or [], 'vf': t.get('vf', 'S'), 'note': t.get('note', '')} for t in TD.get('totals', []) if t.get('c') and t.get('src')]
    trade = {'asof': TD.get('asof'), 'year': TD.get('year'), 'unit': TD.get('unit', 'US$ m'), 'hs': TD.get('hs', '97'), 'note': TD.get('note', ''), 'flows': sorted(tflows, key=lambda f: -f['v']), 'totals': totals, 'caveats': TD.get('caveats', []), 'unconfirmed': TD.get('unconfirmed', [])}
    if held: HELD_BACK.append((f'{held} trade corridors', 'no coordinates for the economy, or no value or source'))
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
# Christie's schedule: the research read 27% to $1.5m / £1m, 22% to $8m / £6m, 15% above, from September 2025 (The Art Newspaper,
# 17 Feb 2026; Grossman LLP, 14 May 2026); v26.1 appended a 'superseded in September 2026 (28% to $2m)' note citing a page no research
# run opened, and v29 removed it (the v29 audit, finding 4): SCHED and FEES carry 27/22/15 and the Deal Room's lines stand as researched
for t in deal.get('terms') or []:
    if t.get('id') == 'buyers-premium' and 'Superseded in September 2026' in (t.get('what') or ''):
        t['what'] = t['what'].split(' Superseded in September 2026')[0]; t['src'] = [x for x in (t.get('src') or []) if 'myartbroker.com/market/articles/the-premium-problem' not in (x[1] if isinstance(x, list) and len(x) > 1 else '')]
for l in (deal.get('economics') or {}).get('lines') or []:
    if 'Superseded in September 2026' in (l.get('basis') or ''):
        l['basis'] = l['basis'].split(' Superseded in September 2026')[0]; l['src'] = [x for x in (l.get('src') or []) if 'the-premium-problem' not in (x[1] if isinstance(x, list) and len(x) > 1 else '')]
# the trade's day-to-day and what it pays for: the pitch
pitch = {k: WF.get(k) for k in ('asof', 'roles', 'tools', 'functions', 'pricing') if WF.get(k) not in (None, '', [])}
# the feeds a page can reach itself, and the datasets for the desk
feeds = {'asof': AP.get('asof', ''), 'apis': [{k: a.get(k) for k in ('id', 'n', 'owner', 'what', 'endpoint', 'auth', 'cors', 'rate', 'licence', 'use', 'src', 'vf') if a.get(k) not in (None, '')} for a in AP.get('apis', [])],
         'datasets': [{k: d.get(k) for k in ('id', 'n', 'what', 'url', 'format', 'licence', 'size', 'use', 'src', 'vf') if d.get(k) not in (None, '')} for d in AP.get('datasets', [])],
         'closed': AP.get('closed', [])}
# ======================= v27: the ocean — the tides, the collectors, the currents and the stones, the whispers, the playbooks =======================
B27 = BUNDLE.get('v27', {})
TI = B27.get('tides') or {}
CO = B27.get('collectors') or {}
CU = B27.get('currents') or {}
WH = B27.get('whispers') or {}
PB = B27.get('playbooks') or {}
def clean_people_line(x):   # the people rules of the v27 brief: nothing is added here, but stray markup goes
    return re.sub(r'\|([^|]{1,40})\|', r'\1', x) if isinstance(x, str) else x
# the collectors join the Net as kind 'collector' (a collector the Net already has is extended)
n_coll_new = 0
LINKS_HELD = []   # (collector, kind, what): the unsourced links held back from the page
HELD_BACK = []    # (what, why): records held back from the page for want of a source (the people rules)
# the cities the globe knows (src/data_places.js CITY_LL), so a collector whose base names no city can sit where the record says the collection is
_pl = (root / 'src' / 'data_places.js').read_text(encoding='utf-8')
_m = re.search(r'const CITY_LL=(\{.*?\});', _pl, re.S)
CITY_KEYS = sorted(json.loads(_m.group(1)).keys(), key=len, reverse=True) if _m else []
def city_in(text):
    t = text or ''
    for c in CITY_KEYS:
        if len(c) >= 4 and re.search(r'(^|[^A-Za-zÀ-ÿ])' + re.escape(c) + r'(?=$|[^A-Za-zÀ-ÿ])', t): return c
    return None
COLL_KEYS = ('wealth', 'source_of_wealth', 'holds', 'named_works', 'where', 'vehicle', 'deals', 'advisers', 'links', 'rumour')
for c in CO.get('collectors', []):
    if not c.get('id') or not c.get('n'): continue
    cid = c.get('extends') if c.get('extends') in have else c['id']
    row = {'id': cid, 'n': c['n'], 'kind': 'collector', 'hq': {'city': c.get('base') or '', 'country': c.get('country') or ''}, 'src': c.get('src') or [], 'vf': c.get('vf') or 'U', 'note': c.get('note') or ''}
    for k in COLL_KEYS:
        if c.get(k) not in (None, '', [], {}): row[k] = c[k]
    if isinstance(row.get('links'), list):
        # the people rules (BRIEF_COMMON v27): a link to politics, finance or the law is shown only as a reputable source states it. A link
        # the research carried from background knowledge (vf U, or no source of its own and the record's flag U) is held back from the page
        # and listed for the next research run; the bundle keeps it
        kept, held = [], []
        for l in row['links']:
            if not isinstance(l, dict): continue
            lvf = (l.get('vf') or row.get('vf') or 'U').upper()
            (held if lvf == 'U' or not (l.get('src') or row.get('src')) else kept).append(l)
        row['links'] = [{kk: (unmem(clean_people_line(l.get(kk))) if kk == 'what' else l.get(kk)) for kk in ('kind', 'what', 'src', 'vf') if l.get(kk) not in (None, '')} for l in kept]
        for l in held: LINKS_HELD.append((c['n'], l.get('kind') or '', (l.get('what') or '')[:120]))
    for k in ('holds', 'where', 'vehicle', 'source_of_wealth', 'wealth', 'rumour', 'note', 'edge', 'scale', 'owner'):
        if isinstance(row.get(k), str): row[k] = unmem(clean_people_line(row[k]))
    for k in ('named_works', 'deals', 'advisers'):
        if isinstance(row.get(k), list): row[k] = [unmem(clean_people_line(x)) if isinstance(x, str) else x for x in row[k]]
    row['edge'] = unmem(clean_people_line((c.get('holds') or '').split('. ')[0]))[:220]
    if isinstance(row.get('hq'), dict) and isinstance(row['hq'].get('city'), str): row['hq']['city'] = unmem(row['hq']['city'])
    if cid in have:
        cur = have[cid]
        for k, v in row.items():
            if k in ('src', 'named_works', 'deals', 'advisers', 'links') and isinstance(v, list): cur[k] = (cur.get(k) or []) + [x for x in v if x not in (cur.get(k) or [])]
            elif k not in cur or cur.get(k) in (None, '', [], {}): cur[k] = v
        cur['collector'] = True
    else:
        row['collector'] = True
        if CITY_KEYS and not city_in(row['hq']['city']):   # "California; Illinois" → the city the record names for the collection, else the collector stays off the Net
            alt = city_in(c.get('where') or '') or city_in(c.get('holds') or '')
            if alt: row['hq']['city'] = alt
            else: HELD_BACK.append((c['n'], f"no city in base ‘{row['hq']['city']}’ or where")); continue
        if not row['hq']['city']: continue
        players.append(row); have[cid] = row; n_coll_new += 1
vehicles = [v for v in CO.get('houses_of_capital', []) if v.get('n')]
tides = {k: TI.get(k) for k in ('asof', 'tides', 'temperatures', 'reports') if TI.get(k) not in (None, '', [])}
for t in tides.get('tides') or []:
    t['strength'] = max(1, min(5, int(t.get('strength') or 1)))
currents = {k: CU.get(k) for k in ('asof', 'cases', 'freeports', 'patterns') if CU.get(k) not in (None, '', [])}
# a case names people: it is shown only with a source (the people rules); a case the research carried from background knowledge waits for one
for c in [x for x in currents.get('cases') or [] if not x.get('src')]:
    HELD_BACK.append((c.get('n') or c.get('id'), 'case without a source')); currents['cases'].remove(c)
for pt in currents.get('patterns') or []:
    if isinstance(pt.get('cases'), list): pt['cases'] = [i for i in pt['cases'] if any(x.get('id') == i for x in currents.get('cases') or [])]
for c in currents.get('cases') or []:
    for pp in c.get('people') or []:
        if isinstance(pp, dict):
            for kk in ('n', 'role', 'status'): pp[kk] = clean_people_line(pp.get(kk))
whispers = {k: WH.get(k) for k in ('asof', 'whispers', 'forecasters', 'next') if WH.get(k) not in (None, '', [])}
if whispers.get('whispers'): whispers['whispers'] = sorted([w for w in whispers['whispers'] if w.get('t')], key=lambda w: w.get('d') or '', reverse=True)
playbooks = {k: PB.get(k) for k in ('asof', 'playbooks') if PB.get(k) not in (None, '', [])}

# ---------- v28: the desk that solves — the worked cases, the walls, the sources, the week's whispers, the value and the tech ----------
B28 = BUNDLE.get('v28', {})
HO = B28.get('house') or {}
CL = B28.get('collector') or {}
WA = B28.get('walls') or {}
SO = B28.get('sources') or {}
VA = B28.get('value') or {}
TE = B28.get('tech') or {}
def slug_of(t):
    import unicodedata
    t = unicodedata.normalize('NFKD', str(t or '')).encode('ascii', 'ignore').decode('ascii').lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')
def clean_case(c):
    """A worked case on the common brief's schema: the people rules (no unsourced legal line), the house style, the ids."""
    if not isinstance(c, dict) or not c.get('task'): return None
    c = dict(c)
    c['id'] = c.get('id') or slug_of(c['task'])[:48]
    for k in ('task', 'reading', 'money', 'people', 'calendar', 'whispers', 'value_left', 'note', 'sum', 'persona', 'where'):
        if isinstance(c.get(k), str): c[k] = unmem(clean_people_line(c[k]))
    for k in ('risks', 'next'):
        if isinstance(c.get(k), list): c[k] = [unmem(clean_people_line(x)) for x in c[k] if isinstance(x, str) and x.strip()]
    if isinstance(c.get('road'), list): c['road'] = [{kk: unmem(st.get(kk)) if isinstance(st.get(kk), str) else st.get(kk) for kk in ('n', 'who', 'doc', 'time', 'fee', 'src', 'vf') if st.get(kk) not in (None, '')} for st in c['road'] if isinstance(st, dict) and st.get('n')]
    if isinstance(c.get('walls'), list):
        kept = []
        for w in c['walls']:
            if not isinstance(w, dict) or not w.get('n'): continue
            if w.get('case') and (w.get('vf') or c.get('vf') or 'U').upper() == 'U' and not (w.get('src') or c.get('src')):
                HELD_BACK.append((f"{c['id']}: wall ‘{w['n']}’", 'a case line without a source')); w = dict(w); w.pop('case', None)
            kept.append({kk: unmem(clean_people_line(w.get(kk))) if isinstance(w.get(kk), str) else w.get(kk) for kk in ('n', 'cite', 'authority', 'threshold', 'date', 'what_it_does', 'case', 'src', 'vf') if w.get(kk) not in (None, '')})
        c['walls'] = kept
    return c
cases = [x for x in [clean_case(c) for c in (HO.get('cases') or []) + (CL.get('cases') or [])] if x]
seen_ids = set()
for c in cases:
    while c['id'] in seen_ids: c['id'] += '-2'
    seen_ids.add(c['id'])
worked = {'asof': HO.get('asof') or CL.get('asof') or asof, 'cases': cases, 'desk': HO.get('desk') or {}}
def clean_file(f):
    """A compliance file: the walls, the cases as the record states them (a case without a source is held back), the lawful course."""
    if not isinstance(f, dict): return None
    f = dict(f)
    for k in ('summary', 'n'):
        if isinstance(f.get(k), str): f[k] = unmem(clean_people_line(f[k]))
    walls_kept = []
    for w in f.get('walls') or []:
        if not isinstance(w, dict) or not w.get('n'): continue
        if not w.get('src'): HELD_BACK.append((f"walls/{f.get('id') or 'kandinsky'}: wall ‘{w['n'][:60]}’", 'a law stated without a source opened')); continue
        walls_kept.append({kk: unmem(clean_people_line(w.get(kk))) if isinstance(w.get(kk), str) else w.get(kk) for kk in ('n', 'cite', 'authority', 'threshold', 'date', 'what_it_does', 'case', 'src', 'vf') if w.get(kk) not in (None, '')})
    f['walls'] = walls_kept
    kept = []
    for cs in f.get('cases') or []:
        if not isinstance(cs, dict) or not cs.get('n'): continue
        if not cs.get('src'): HELD_BACK.append((f"walls/{f.get('id') or 'kandinsky'}: case ‘{cs['n']}’", 'a case without a source')); continue
        kept.append({kk: unmem(clean_people_line(cs.get(kk))) if isinstance(cs.get(kk), str) else cs.get(kk) for kk in ('n', 'what', 'src', 'vf') if cs.get(kk) not in (None, '')})
    f['cases'] = kept
    f['lawful'] = [{kk: unmem(clean_people_line(l.get(kk))) if isinstance(l.get(kk), str) else l.get(kk) for kk in ('who', 'course', 'src', 'vf') if l.get(kk) not in (None, '')} for l in (f.get('lawful') or []) if isinstance(l, dict) and l.get('course')]
    if f.get('russia_side'): f['russia_side'] = [{kk: unmem(clean_people_line(r.get(kk))) if isinstance(r.get(kk), str) else r.get(kk) for kk in ('n', 'what', 'src', 'vf') if r.get(kk) not in (None, '')} for r in f['russia_side'] if isinstance(r, dict) and r.get('n')]
    return f
walls = {'asof': WA.get('asof') or asof}
if WA.get('kandinsky'): walls['kandinsky'] = clean_file(WA['kandinsky'])
walls['files'] = [x for x in [clean_file(f) for f in (WA.get('files') or [])] if x and x.get('id')]
sources = {'asof': SO.get('asof') or asof, 'sources': [{kk: unmem(s.get(kk)) if isinstance(s.get(kk), str) else s.get(kk) for kk in ('id', 'n', 'kind', 'who', 'cadence', 'good_for', 'price', 'record', 'how_to_read', 'url', 'src', 'vf') if s.get(kk) not in (None, '')} for s in (SO.get('sources') or []) if isinstance(s, dict) and s.get('n')], 'next': [n for n in (SO.get('next') or []) if isinstance(n, dict) and n.get('what')]}
for s_ in sources['sources']:
    if not s_.get('id'): s_['id'] = slug_of(s_['n'])[:40]
# the week's whispers join the v27 whispers (newest first, no duplicate line)
wk = [w for w in (SO.get('whispers') or []) if isinstance(w, dict) and w.get('t') and w.get('d')]
if wk:
    have_t = {typo(w.get('t', '')).strip().lower() for w in whispers.get('whispers') or []}
    added = 0
    for w in wk:
        if typo(w['t']).strip().lower() in have_t: continue
        w = {kk: (unmem(clean_people_line(typo(w.get(kk)))) if isinstance(w.get(kk), str) else w.get(kk)) for kk in ('id', 'd', 'kind', 'about', 't', 'detail', 'who', 'subjects', 'outcome', 'src', 'vf') if w.get(kk) not in (None, '')}
        if not w.get('src'): HELD_BACK.append((f"whisper ‘{w['t'][:60]}’", 'no source')); continue
        whispers.setdefault('whispers', []).append(w); added += 1
    whispers['whispers'] = sorted(whispers['whispers'], key=lambda w: w.get('d') or '', reverse=True)
    if sources['next'] and not whispers.get('next'): whispers['next'] = [{'when': n.get('when', ''), 'what': n.get('what', ''), 'src': n.get('src') or []} for n in sources['next']]
    print(f'  v28: {added} of the week’s whispers added ({len(wk) - added} duplicates or unsourced)')
value = {k: VA.get(k) for k in ('asof', 'houses', 'gaps', 'rivals', 'model') if VA.get(k) not in (None, '', [], {})}
tech = {k: TE.get(k) for k in ('asof', 'houses', 'attempts', 'edge', 'risks', 'plan') if TE.get(k) not in (None, '', [], {})}
head_n += """   v28 adds: CASES (the worked cases on the common brief's memo: persona, where, task, reading, money, road, walls, people,
   calendar, whispers, risks, value_left, next, sources; and the specialist's desk), WALLS (the compliance files: the Kandinsky-to-
   Moscow file with its walls, cases, lawful courses and the other side of the border; the PEP, the unknown principal, the provenance
   gap, the protected material, the tax wall, the national treasure), SOURCES (where information lives: what each costs, what it is
   good for, its record; the week ahead), HOUSE_VALUE (the houses' economics, the gaps, the rivals, the model's benchmarks) and TECH_EDGE (what
   the houses run, the attempts at a Bloomberg of art, the edge, the risks, the plan). The week's whispers join WHISPERS.
"""
head_n += """   v27 adds: the collectors as players of kind 'collector' (holds, named_works, where, vehicle, deals, advisers, links with their
   status as the record states it, rumour attributed), HOLD_VEHICLES, TIDES (where each category, region, band and channel is moving,
   with evidence, drivers, risks, predictions and labelled rumours; the cities' temperatures; the reports), CURRENTS (the documented
   routes of money through art as cases with their routes, people, works, controls and outcomes; the free ports' flows; the patterns),
   WHISPERS (rumours, reports and predictions, dated and attributed, with outcomes; the forecasters' records; what the trade expects
   next) and PLAYBOOKS (what a task takes: the steps with forms, authorities, times, fees and documents).
"""
head_n += """   v26 adds: NET_WIRE (what happened in the East, 2025–26, by date), NET_RUSSIA (the Russian market and its law), VAULTS and
   VAULT_CITIES (free ports, bonded stores and fine-art storage by city: operator, owner, size, value as published, people, the
   organisation's published contact lines, rules, cases), DEAL (the Deal Room's research: terms, the economics of a $50m hammer,
   cases, people, guarantors), PITCH (the trade's roles and their days, the tools they pay for and their prices, the functions a
   terminal should offer, the pricing benchmarks) and OPEN_FEEDS (the open APIs and datasets, with auth, CORS and licence as read).
   The East's players carry east: true. v30 adds the South (Latin America, Africa, the Asian gaps; players carry south: true) and
   NET_TRADE: the official customs corridors of works of art (HS 97) — flows from economy to economy with the trade city of each,
   the totals by economy, the caveats, as read on mirrors of UN Comtrade and in the Art Basel & UBS report (flag S). */
"""
(root / 'src' / 'data_net.js').write_text(head_n + f"const NET_ASOF='{asof}';\n" + js('NET_PLAYERS', players) + js('NET_MARKETS', markets) + js('LOT_FIN', lot_fin) + js('NET_FLOWS', flows) + js('NET_YEARS', years) + js('NET_NEW_LOTS', new_lots) + js('TRANSFORM', transform) + js('NET_WIRE', wire) + js('NET_RUSSIA', russia) + js('VAULTS', vaults) + js('VAULT_CITIES', vault_cities) + js('DEAL', deal) + js('NET_TRADE', trade) + js('PITCH', pitch) + js('OPEN_FEEDS', feeds) + js('HOLD_VEHICLES', vehicles) + js('TIDES', tides) + js('CURRENTS', currents) + js('WHISPERS', whispers) + js('PLAYBOOKS', playbooks) + js('CASES', worked) + js('WALLS', walls) + js('SOURCES', sources) + js('HOUSE_VALUE', value) + js('TECH_EDGE', tech), encoding='utf-8')
print(f"wrote src/data_net.js: {len(players)} players ({n_east_new} from the East, {n_south_new} from the South; {len(trade.get('flows', []))} customs corridors), {len(markets)} markets, {len(lot_fin)} lots with their money ({len(new_lots)} new), {len(flows)} flows, {len(transform.get('stages', []))} transformation stages; {len(wire)} wire lines; {len(vaults)} vaults in {len(vault_cities)} cities; deal: {len(deal.get('terms', []))} terms, {len(deal.get('cases', []))} cases, {len(deal.get('people', []))} people; pitch: {len(pitch.get('roles', []))} roles, {len(pitch.get('tools', []))} tools, {len(pitch.get('functions', []))} functions; feeds: {len(feeds['apis'])} APIs, {len(feeds['datasets'])} datasets; v27: {n_coll_new} collectors new, {len(tides.get('tides', []))} tides, {len(tides.get('temperatures', []))} temperatures, {len(currents.get('cases', []))} cases, {len(whispers.get('whispers', []))} whispers, {len(playbooks.get('playbooks', []))} playbooks; v28: {len(cases)} worked cases, {len(walls.get('files', []))} files beside the Kandinsky ({'present' if walls.get('kandinsky') else 'absent'}), {len(sources['sources'])} sources, {len(value.get('gaps', []))} gaps, {len(tech.get('attempts', []))} attempts")
for what, why in HELD_BACK: print(f'  held back from the page: {what} — {why}')
if LINKS_HELD:
    import collections as _c
    print(f"  held back from the page, for the next research run to source: {len(LINKS_HELD)} unsourced links on {len({x[0] for x in LINKS_HELD})} collectors "
          f"({dict(_c.Counter(x[1] for x in LINKS_HELD))}); they stay in data/research/bundle.json")

# ========================= v29: the School and the Eye =========================
# The v29 briefs (scratchpad/v29/BRIEF_*.md): pool (the open collections' works for the Eye, with the museum's own place strings),
# hammer (sold lots with estimates for the Hammer and the Eye's price round), school (courses, archives, skills, critique, reading,
# the learning paths with their exercises), game (the games studied and the design findings; in the bundle for the record).
# Writes src/data_school.js: EYE_POOL (every work placed through EYE_GEO of src/data_eye.js: the most specific key the museum's
# place string carries wins; a work no key places is held back), EYE_FORGERIES (records the museum itself catalogues as a modern
# forgery), HAMMER_NEW (sold lots joining RESULTS at boot, with est_lo/est_hi, status, guarantee, sale, lot and sources),
# HAMMER_HOUSES (names for houses the terminal's roster lacks), HAMMER_UNSOLD, SCHOOL.
V29 = BUNDLE.get('v29', {})
POOL, HAM, SCH, GAME = V29.get('pool', {}), V29.get('hammer', {}), V29.get('school', {}), V29.get('game', {})
_geo_src = (root / 'src' / 'data_eye.js').read_text(encoding='utf-8')
GEO = json.loads(re.search(r'const EYE_GEO=(\{.*?\});', _geo_src, re.S).group(1))
GEO_RE = {k: re.compile(r'(?<![a-zÀ-ɏḀ-ỿ])' + re.escape(k) + r'(?![a-zÀ-ɏḀ-ỿ])') for k in GEO}
def geo_norm(t):
    t = (t or '').lower().replace('.', ' ').replace('’', '’')
    return re.sub(r'\s+', ' ', t).strip()
def geo_hits(text):
    t = geo_norm(text)
    if not t: return []
    hits = [k for k, rx in GEO_RE.items() if rx.search(t)]
    hits = [k for k in hits if not any(k != o and k in o for o in hits)]   # a key inside a longer hit ('edo' in 'edo period') gives way
    return sorted(hits, key=lambda k: (GEO[k][2], -len(k)))
REGION_KEY = {'Western Europe': 'europe', 'Byzantium & Eastern Europe': 'eastern europe', 'Greece & Rome': 'mediterranean', 'Ancient Egypt & Near East': 'ancient near east',
              'Islamic world / Middle East': 'islamic world', 'South Asia': 'south asia', 'Southeast Asia': 'southeast asia', 'East Asia': 'east asia', 'Africa': 'africa',
              'Oceania': 'oceania', 'North America': 'north america', 'Indigenous North America': 'native north american', 'Latin America': 'south america'}
def place_work(w):
    for field in ('place', 'country'):
        h = geo_hits(w.get(field))
        if h: return h[0]
    k = REGION_KEY.get(w.get('region') or '')
    return k if k in GEO else None
pool_rows, pool_held, geo_used = [], [], {}
for w in POOL.get('works', []):
    if not w.get('img') or w.get('y0') is None or w.get('y1') is None: pool_held.append((w.get('id'), 'no image or no date')); continue
    if (w.get('type') or '') in ('Coins', 'Spindle Whorl'): pool_held.append((w.get('id'), 'too small to read')); continue
    k = place_work(w)
    if not k: pool_held.append((w.get('id'), f"no place key in {w.get('place')!r} / {w.get('country')!r}")); continue
    lat, lon, tol = GEO[k]; geo_used[k] = geo_used.get(k, 0) + 1
    row = {'src': w['src'], 'id': str(w['id']), 'artist': w.get('artist') or '', 'title': (w.get('title') or '').strip()[:120], 'y0': int(w['y0']), 'y1': int(w['y1']),
           'place': (w.get('place') or w.get('country') or '').strip()[:110], 'lat': lat, 'lon': lon, 'tol': tol, 'geo': k, 'img': w['img'], 'url': w.get('url') or '',
           'credit': (w.get('credit') or '').strip()[:90], 'medium': (w.get('medium') or '').strip()[:90], 'type': w.get('type') or '', 'region': w.get('region') or ''}
    if w.get('dyk'): row['dyk'] = w['dyk'][:240]
    row['pvf'] = 'V'
    m = re.match(r'https://openaccess-cdn\.clevelandart\.org/([^/]+)/\1_web\.jpg$', row['img'])
    if w['src'] == 'cma' and m and row['url'] == f"https://clevelandart.org/art/{m.group(1)}": row['img'], row['url'] = m.group(1), ''   # the accession; eye.js rebuilds both URLs
    pool_rows.append(row)
pool_rows.sort(key=lambda r: (r['src'], int(r['id']) if r['id'].isdigit() else r['id']))
# the Standard Ebooks paintings on the atlases (tools/eye_atlas.py): placed by the painter's city, else country, else nationality
if not (root / 'data' / 'eye_atlas.json').exists():
    raise SystemExit('data/eye_atlas.json is missing: the Eye\'s atlas index lives in the git repository (not in the artifact, for the file cap); take it from there before regenerating, or leave src/data_school.js as it is')
ATLAS = json.load(open(root / 'data' / 'eye_atlas.json', encoding='utf-8'))
se_rows, se_held = [], []
for w in ATLAS.get('works', []):
    k = None
    for field in ('city', 'country', 'nationality'):
        h = geo_hits(w.get(field))
        if h: k = h[0]; break
    if not k: se_held.append((w['id'], f"no place key in {w.get('city')!r} / {w.get('country')!r} / {w.get('nationality')!r}")); continue
    lat, lon, tol = GEO[k]; geo_used[k] = geo_used.get(k, 0) + 1
    place = (w.get('city') + ', ' if w.get('city') else '') + (w.get('country') or w.get('nationality') or '')
    # the colophon's URL and the credit's wording are rebuilt by eye.js from the id (se:<repo>) and the book's title; pvf flags the place
    se_rows.append({'src': 'se', 'id': w['id'], 'artist': w['artist'], 'title': w['title'][:120], 'y0': int(w['y0']), 'y1': int(w['y1']), 'place': place[:80],
                    'lat': lat, 'lon': lon, 'tol': max(tol, 60 if w.get('city') else 250), 'geo': k, 'img': f"{w['sheet']}:{w['x']},{w['y']},{w['w']},{w['h']}", 'url': '', 'credit': (w.get('book') or '')[:60],
                    'medium': w.get('kind') or 'painting', 'type': 'Painting', 'region': '', 'dyk': ('crop' if w.get('crop') else ''), 'pvf': w.get('place_vf') or 'U'})
pool_rows += se_rows
# the days: five works a day for everyone, the Standard Ebooks paintings and the Library's pictures shuffled once with a fixed seed
import random as _rnd, datetime as _dt
_made = json.loads(re.search(r'const EYE_MADE=(\{.*?\});', _geo_src, re.S).group(1))
_imgmeta = json.load(open(root / 'data' / 'images_meta.json', encoding='utf-8'))
day_ids = [r['id'] for r in se_rows] + ['lib:' + k for k in _made if k in _imgmeta and re.search(r'\d{3,4}|centur', str(_imgmeta[k].get('y') or ''))]
_r = _rnd.Random(2029); _r.shuffle(day_ids)
EYE_DAYS = [day_ids[i:i + 5] for i in range(0, len(day_ids) - len(day_ids) % 5, 5)]
EYE_EPOCH = (_dt.date(2026, 11, 16) - _dt.date(1970, 1, 1)).days
POOL_KEYS = ['src', 'id', 'artist', 'title', 'y0', 'y1', 'place', 'lat', 'lon', 'tol', 'geo', 'img', 'url', 'credit', 'medium', 'type', 'region', 'dyk', 'pvf']
pool_compact = [[r.get(k, '') for k in POOL_KEYS] for r in pool_rows]
forg = []
for w in POOL.get('forgeries', []):
    if not w.get('img'): continue
    k = place_work(w) or 'egypt'
    lat, lon, tol = GEO[k]
    forg.append({'src': w['src'], 'id': str(w['id']), 'title': (w.get('title') or '').strip()[:120], 'y0': w.get('y0'), 'y1': w.get('y1'), 'place': (w.get('place') or '')[:110], 'lat': lat, 'lon': lon, 'tol': tol,
                 'img': w['img'], 'url': w.get('url') or '', 'credit': (w.get('credit') or '')[:90], 'medium': (w.get('medium') or '')[:90], 'type': w.get('type') or '', 'verdict': w.get('verdict') or 'modern forgery',
                 'dyk': (w.get('dyk') or '')[:260], 'tomb': (w.get('tomb') or '')[:220]})
# the Hammer's new lots
HOUSE_IDS = set(re.findall(r"\{id:'([a-z0-9-]+)'", (root / 'src' / 'data_houses.js').read_text(encoding='utf-8')))
HOUSE_MAP = {'other: ketterer kunst': 'ketterer', 'ketterer kunst': 'ketterer', 'other: grisebach': 'grisebach', 'other: strauss & co': 'strauss', 'strauss & co': 'strauss',
             'other: k auction': 'k-auction', 'k auction': 'k-auction', 'other: seoul auction': 'seoul-auction', 'seoul auction': 'seoul-auction', 'saffronart': 'saffronart'}
HOUSE_NAMES = {'strauss': 'Strauss & Co', 'k-auction': 'K Auction', 'seoul-auction': 'Seoul Auction', 'saffronart': 'Saffronart'}
CAT_MAP = {'sculpture': 'Sculpture', 'asian art': 'Asian Art', 'digital': 'Digital', 'luxury': 'Luxury', 'collectibles': 'Collectibles', 'old masters': 'Old Masters',
           'impressionist & modern': 'Impressionist & Modern', 'post-war & contemporary': 'Post-War & Contemporary'}
# reference rates, $ per unit: 2026 from the page's ECB fix of 8 Oct 2026 (RATES in data_flows.js: EUR 0.89397, GBP 0.75718 per $) and the HKD peg;
# earlier years annual averages carried unconfirmed (U), stated on every converted lot
FX_REF = {'EUR': {'2020': 1.142, '2021': 1.183, '2022': 1.053, '2023': 1.081, '2024': 1.082, '2025': 1.13, '2026': round(1 / 0.89397, 4)},
          'GBP': {'2020': 1.284, '2021': 1.375, '2022': 1.237, '2023': 1.244, '2024': 1.278, '2025': 1.33, '2026': round(1 / 0.75718, 4)},
          'HKD': {y: 0.1282 for y in ('2020', '2021', '2022', '2023', '2024', '2025', '2026')},
          'KRW': {'2020': 1 / 1180, '2021': 1 / 1144, '2022': 1 / 1292, '2023': 1 / 1306, '2024': 1 / 1364, '2025': 1 / 1420, '2026': 1 / 1400},
          'INR': {'2024': 1 / 83.7, '2025': 1 / 85.5, '2026': 1 / 86.0}, 'ZAR': {'2024': 1 / 18.3, '2025': 1 / 18.0, '2026': 1 / 17.5}, 'CHF': {'2024': 1.136, '2025': 1.2, '2026': round(1 / 0.83372, 4)}}
def house_id(h):
    h = (h or '').strip(); hl = h.lower()
    if hl in HOUSE_IDS: return hl
    if hl in HOUSE_MAP: return HOUSE_MAP[hl]
    s = re.sub(r'^other:\s*', '', hl); s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s or 'unknown'
def cat_name(c):
    c = (c or '').strip()
    if not c: return ''
    return CAT_MAP.get(c.lower(), c[0].upper() + c[1:])
existing_lots = set()
for f in ('data_market.js', 'data_net.js'):
    t = (root / 'src' / f).read_text(encoding='utf-8')
    for m in re.finditer(r'"artist":"([^"]*)","title":"([^"]*)"', t): existing_lots.add((typo(m.group(1)), typo(m.group(2))))
ham_new, ham_unsold, ham_houses, ham_dup, ham_held = [], [], {}, 0, []
for l in HAM.get('lots', []):
    if not l.get('artist') or not l.get('title') or not l.get('date') or not l.get('house'): ham_held.append((l.get('title'), 'incomplete')); continue
    if not l.get('src'): ham_held.append((l.get('title'), 'no source')); continue
    hid = house_id(l['house'])
    if hid not in HOUSE_IDS: ham_houses[hid] = HOUSE_NAMES.get(hid, re.sub(r'^other:\s*', '', l['house']).strip())
    key = (typo(l['artist']), typo(l['title']))
    price, note, local, fx = (round(float(l['price']), 3) if l.get('price') else 0), (l.get('note') or ''), '', ''
    if not price and l.get('local_price') and l.get('local_ccy') in FX_REF:
        yr = l['date'][:4]; rate = FX_REF[l['local_ccy']].get(yr) or FX_REF[l['local_ccy']]['2026']
        price = round(float(l['local_price']) * rate / 1e6, 3); local = l.get('cur') or f"{l['local_ccy']} {l['local_price']:,}"
        fx = f"{local} as the house states it; the dollar figure converts it at {rate:g} $ per {l['local_ccy']}, the {yr} reference rate ({'ECB fix, V' if yr == '2026' and l['local_ccy'] in ('EUR', 'GBP') else 'peg, V' if l['local_ccy'] == 'HKD' else 'annual average, unconfirmed'})"
    row = {'id': slug_of(f"{l['artist']} {l['title']} {l['date'][:4]}"), 'artist': l['artist'], 'title': l['title'], 'year': str(l.get('year') or ''), 'house': hid, 'city': l.get('city') or '',
           'date': l['date'], 'price': price, 'cat': cat_name(l.get('cat')), 'rec': [], 'note': note, 'medium': l.get('medium') or '', 'local': local, 'fx': fx,
           'est_lo': l.get('est_lo'), 'est_hi': l.get('est_hi'), 'hammer': l.get('hammer'), 'status': l.get('status') or 'sold', 'guarantee': l.get('guarantee') or 'unknown',
           'sale': l.get('sale') or '', 'lot': str(l.get('lot') or ''), 'src': l['src'], 'vf': l.get('vf') or 'U'}
    row['note'] = row['note'][:240]; row['src'] = [[a[:70], b] for a, b in row['src'][:2]]
    if row['status'] != 'sold' or not row['price'] > 0: ham_unsold.append(row); continue
    if key in existing_lots: ham_dup += 1; continue
    existing_lots.add(key); ham_new.append(row)
HAM_KEYS = ['id', 'artist', 'title', 'year', 'house', 'city', 'date', 'price', 'cat', 'note', 'medium', 'local', 'fx', 'est_lo', 'est_hi', 'hammer', 'status', 'guarantee', 'sale', 'lot', 'src', 'vf']
ham_compact = [[r.get(k, '') if r.get(k) is not None else '' for k in HAM_KEYS] for r in ham_new]
# the School
school = {k: SCH.get(k) for k in ('asof', 'courses', 'archives', 'skills', 'critique', 'reading', 'paths', 'unconfirmed') if SCH.get(k) not in (None, '', [], {})}
for c in school.get('courses', []):
    if not c.get('src') and not c.get('url'): c['vf'] = 'U'
head_s = """/* ---------- THE SCHOOL AND THE EYE (v29): generated by tools/gen_research.py from data/research/bundle.json (key v29) ----------
   EYE_POOL: works from the open collections (Cleveland Museum of Art, CC0; Art Institute of Chicago, public domain) for the Eye's
   Where & When round, as rows in the order of EYE_POOL_KEYS (eye.js expands them): src, id, artist, title, y0, y1 (the museum's
   earliest and latest year), place (the museum's own words), lat, lon, tol (km: the free radius, from the most specific key of
   EYE_GEO the place string carries; geo names the key), img (the museum's own image URL, or for Cleveland the accession number
   from which eye.js rebuilds the image and page URLs), url, credit, medium, type, region, dyk (the museum's did-you-know or
   first sentence).
   A row with src 'se' is a Standard Ebooks cover painting on an atlas sheet (tools/eye_atlas.py): img is 'sheet:x,y,w,h' into
   EYE_SHEETS[sheet]; its place is the painter's city or country (EYE_DAYS lists the five works of each day from EYE_EPOCH, the
   same for everyone; the Library's pictures are 'lib:<id>'). EYE_FORGERIES: records the museum itself catalogues as a modern
   forgery (definite wording only), for the Forger round (their images are the museum's own, shown where the host allows).
   HAMMER_NEW: sold lots the v29 research added, as rows in the order of HAMMER_NEW_KEYS (app.js expands them and pushes them into
   RESULTS at boot): est_lo, est_hi, hammer in $m where published; local (the house's own figure where it was not in dollars) and
   fx (how the dollar figure was converted); status; guarantee; sale; lot; src; vf. HAMMER_HOUSES: names for houses the roster lacks. HAMMER_UNSOLD: bought-in and withdrawn lots.
   SCHOOL: courses (priced where a primary page states it), archives, skills by role as the houses advertise them, critique,
   reading, paths (lessons with an exercise and its answer from an opened page), unconfirmed. Edit the research and regenerate. */
"""
(root / 'src' / 'data_school.js').write_text(head_s + f"const EYE_ASOF='{POOL.get('asof') or ''}';\nconst EYE_EPOCH={EYE_EPOCH};\n" + js('EYE_SHEETS', [s_['file'] for s_ in ATLAS.get('sheets', [])]) + js('EYE_DAYS', EYE_DAYS) + js('EYE_POOL_KEYS', POOL_KEYS) + js('EYE_POOL', pool_compact) + js('EYE_FORGERIES', forg) + js('HAMMER_NEW_KEYS', HAM_KEYS) + js('HAMMER_NEW', ham_compact) + js('HAMMER_HOUSES', ham_houses) + js('HAMMER_UNSOLD', ham_unsold) + js('SCHOOL', school), encoding='utf-8')
import collections as _cc
_srcs = _cc.Counter(r['src'] for r in pool_rows); _tight = sum(1 for r in pool_rows if r['tol'] <= 100)
print(f"wrote src/data_school.js: {len(pool_rows)} works in the Eye's pool ({dict(_srcs)}; {_tight} placed to a city or site, {len(geo_used)} place keys used; {len(pool_held)} + {len(se_held)} held back), {len(EYE_DAYS)} days of five on {len(ATLAS.get('sheets', []))} sheets, {len(forg)} forgeries; "
      f"{len(ham_new)} lots join the Hammer ({ham_dup} already there, {len(ham_unsold)} unsold kept aside, {len(ham_held)} held back; {len(ham_houses)} houses named: {', '.join(ham_houses.values())}); "
      f"school: {len(school.get('courses', []))} courses, {len(school.get('archives', []))} archives, {len(school.get('skills', []))} roles, {len(school.get('reading', []))} readings, {len(school.get('paths', []))} paths")
for i, why in pool_held[:12]: print(f'  pool held back: {i} — {why}')
if len(pool_held) > 12: print(f'  … and {len(pool_held) - 12} more')
for t, why in ham_held[:8]: print(f'  hammer held back: {t} — {why}')
