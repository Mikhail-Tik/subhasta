#!/usr/bin/env python3
"""Write src/data_russia.js (v35): Russia in depth, bilingual — the rulers and their places and journeys, the school canon of literature
with the authors' lives and the characters' prototypes, the guided stories, the primary sources, the cities with their old photographs,
and the founding of the United States as the second model region.

    python3 -I tools/gen_russia.py

Reads data/research/v35/{rulers_*,literature,stories_*,sources_*,cities,us}.json (CONTRACT.md there; the archive desk adds files such as stories_c.json).
Every place `ll` arrives as [lat, lon] and leaves as [lon, lat] (the app's order); routes likewise. Human-readable fields are {en, ru}
(a plain string is taken as English). Sources keep only https links; pictures only Wikimedia Commons files under Public Domain, CC0,
CC BY or CC BY-SA (the rest are dropped and listed). Writes `const RUSSIA = {...}` and prints what it kept and what it held back."""
import json, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
V = root / 'data' / 'research' / 'v35'
held = []
LIC_OK = re.compile(r'public domain|\bpd\b|pd-|cc0|cc[- ]by(?![- ]?nc)(?![- ]?nd)|creative commons attribution(?! non)|no known restrictions', re.I)
LIC_BAD = re.compile(r'\bnc\b|non-?commercial|\bnd\b|no-?deriv|fair use|all rights reserved', re.I)

def load(name):
    f = V / name
    if not f.exists(): return None
    try: return json.load(open(f, encoding='utf-8'))
    except Exception as e:
        held.append((name, f'not valid JSON: {e}')); return None

def ok_url(u): return isinstance(u, str) and u.startswith('https://') and ' ' not in u.strip()
def clean(t): return re.sub(r'\s+', ' ', str(t)).strip() if t is not None else ''
def bi(v):
    if v is None: return None
    if isinstance(v, str): return {'en': clean(v)} if clean(v) else None
    if isinstance(v, dict):
        o = {k: clean(v[k]) for k in ('en', 'ru') if isinstance(v.get(k), str) and clean(v.get(k))}
        return o or None
    return None
def latlon(p):
    if isinstance(p, (list, tuple)) and len(p) >= 2 and all(isinstance(x, (int, float)) for x in p[:2]):
        lat, lon = float(p[0]), float(p[1])
        if -90 <= lat <= 90 and -180 <= lon <= 180: return [round(lon, 4), round(lat, 4)]
    return None
def pic(p, where):
    if not isinstance(p, dict) or not p.get('file'): return None
    page = p.get('page') or ''
    lic = clean(p.get('lic'))
    if not ok_url(page) or 'commons.wikimedia.org' not in page or not LIC_OK.search(lic) or LIC_BAD.search(lic):
        held.append((where, f"picture {p.get('file')} ({lic or 'no licence'})")); return None
    f = re.sub(r'^(File|Image):', '', clean(p['file']))
    o = {'file': f, 'page': page, 'author': clean(p.get('author')), 'lic': lic}
    if isinstance(p.get('year'), (int, float)): o['year'] = int(p['year'])
    c = bi(p.get('cap'))
    if c: o['cap'] = c
    return o
BI_KEYS = {'n', 't', 'title', 'place', 'what', 'h', 'lede', 'about', 'cap', 'role', 'kind_t', 'genre', 'note', 'who_t', 'arch', 'state_t', 'status'}
def norm(o, where=''):
    """recursive: places to [lon, lat], bilingual fields to {en, ru}, sources to https only, pictures checked"""
    if isinstance(o, list): return [x for x in (norm(v, where) for v in o) if x is not None]
    if not isinstance(o, dict): return o
    out = {}
    for k, v in o.items():
        if k == 'll':
            p = latlon(v)
            if p: out['ll'] = p
        elif k == 'route':
            r = [latlon(x) for x in (v or [])]
            r = [x for x in r if x]
            if len(r) >= 2: out['route'] = r
        elif k == 'src':
            s = [[clean(x[0]), x[1].strip()] for x in (v or []) if isinstance(x, (list, tuple)) and len(x) >= 2 and ok_url(x[1])]
            if s: out['src'] = s[:10]
        elif k in ('pic',):
            p = pic(v, where or str(o.get('id', '')))
            if p: out['pic'] = p
        elif k in ('photos', 'pics'):
            ps = [pic(x, where or str(o.get('id', ''))) for x in (v or [])]
            ps = [x for x in ps if x]
            if ps: out[k] = ps
        elif k == 'wiki':
            if isinstance(v, dict):
                w = {lg: clean(v[lg]) for lg in ('en', 'ru') if isinstance(v.get(lg), str) and clean(v.get(lg)) and len(v[lg]) < 160}
                if w: out['wiki'] = w
            elif isinstance(v, str) and clean(v): out['wiki'] = {'en': clean(v)}
        elif k in BI_KEYS and (isinstance(v, str) or (isinstance(v, dict) and ('en' in v or 'ru' in v))):
            b = bi(v)
            if b: out[k] = b
        elif k in ('excerpt', 'quote') and isinstance(v, dict):
            q = {kk: (clean(vv) if isinstance(vv, str) else norm(vv, where)) for kk, vv in v.items() if vv not in (None, '')}
            if q: out[k] = q
        else:
            out[k] = norm(v, where) if isinstance(v, (dict, list)) else v
    return out

R = {'asof': '2026-11-25', 'dynasties': [], 'rulers': [], 'authors': [], 'works': [], 'curriculum': {}, 'stories': [], 'sources': [], 'cities': [], 'us': {}, 'pastvu': None}
seen_dyn = set()
for f in sorted(x.name for x in V.glob('rulers_*.json')):
    d = load(f) or {}
    for x in d.get('dynasties') or []:
        if isinstance(x, dict) and x.get('id') and x['id'] not in seen_dyn:
            seen_dyn.add(x['id']); R['dynasties'].append(norm(x, f))
    for x in d.get('rulers') or []:
        if not isinstance(x, dict) or not x.get('id') or not x.get('n') or not x.get('reign'):
            held.append((f, f"ruler without id, name or reign: {x.get('id') if isinstance(x, dict) else x}")); continue
        R['rulers'].append(norm(x, f'{f}:{x["id"]}'))
def first_reign(r):
    try: return min(float(g.get('from')) for g in r['reign'] if isinstance(g, dict) and isinstance(g.get('from'), (int, float)))
    except ValueError: return 9999
R['rulers'].sort(key=first_reign)
L = load('literature.json') or {}
R['curriculum'] = norm(L.get('curriculum') or {}, 'curriculum')
R['authors'] = [norm(x, 'author:' + str(x.get('id'))) for x in (L.get('authors') or []) if isinstance(x, dict) and x.get('id') and x.get('n')]
R['works'] = [norm(x, 'work:' + str(x.get('id'))) for x in (L.get('works') or []) if isinstance(x, dict) and x.get('id') and x.get('n')]
for f in sorted(x.name for x in V.glob('stories_*.json')):
    d = load(f) or {}
    for x in d.get('stories') or []:
        if isinstance(x, dict) and x.get('id') and x.get('steps'):
            st = norm(x, f'{f}:{x["id"]}')
            st['steps'] = [s for s in st.get('steps', []) if isinstance(s, dict) and s.get('ll') and (s.get('h') or s.get('t'))]
            if st['steps']: R['stories'].append(st)
            else: held.append((f, f'story {x["id"]}: no step with a place'))
for f in sorted(x.name for x in V.glob('sources_*.json')):
    d = load(f) or {}
    for x in d.get('sources') or []:
        if isinstance(x, dict) and x.get('id') and x.get('n'): R['sources'].append(norm(x, f'{f}:{x["id"]}'))
C = load('cities.json') or {}
R['cities'] = [norm(x, 'city:' + str(x.get('id'))) for x in (C.get('cities') or []) if isinstance(x, dict) and x.get('id') and x.get('ll')]
pv = C.get('pastvu')
if isinstance(pv, dict) and isinstance(pv.get('pattern'), str) and ok_url(pv.get('checked_url') or ''): R['pastvu'] = {'pattern': pv['pattern'], 'checked': pv['checked_url']}
U = load('us.json') or {}
R['us'] = norm({k: U[k] for k in ('declaration', 'signers', 'places', 'story', 'synchrony') if k in U}, 'us')
if isinstance(R['us'].get('story'), dict) and R['us']['story'].get('steps'):
    st = R['us']['story']; st.setdefault('id', 'us-founding'); R['stories'].append(st)
# the synchrony of the us file is shared by the stories (by year)
R['synchrony'] = R['us'].get('synchrony') or []
js = ('/* GENERATED by tools/gen_russia.py from data/research/v35 — do not edit by hand. RUSSIA: the Russia layer of the historical globe,\n'
      '   bilingual ({en, ru} fields); every ll is [lon, lat]; pictures are Wikimedia Commons files under free licences, credited. */\n'
      'const RUSSIA=' + json.dumps(R, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + ';\n')
(root / 'src' / 'data_russia.js').write_text(js, encoding='utf-8')
for h in held[:25]: print('  held back:', h)
if len(held) > 25: print(f'  … and {len(held) - 25} more')
jn = sum(len(r.get('journeys') or []) for r in R['rulers'])
print(f"wrote src/data_russia.js: {len(R['rulers'])} rulers ({jn} journeys), {len(R['authors'])} authors, {len(R['works'])} works, {len(R['stories'])} stories "
      f"({sum(len(s['steps']) for s in R['stories'])} steps), {len(R['sources'])} sources, {len(R['cities'])} cities "
      f"({sum(len(c.get('photos') or []) for c in R['cities'])} photographs), {len(R['us'].get('signers') or [])} signers; {len(js)//1024} KB")
