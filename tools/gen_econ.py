#!/usr/bin/env python3
"""Write src/data_econ.js (v36): the economy of Russia and the lands around it on the historical globe — the works, mines, armouries,
shipyards, mills, plants, hydro stations and dams (sites), the canals, tracts and railways (waterways), and the trade routes between
Russia and other countries (trade), each with the year it began, bilingual {en, ru}, sourced and flagged V/S/U.

    python3 -I tools/gen_econ.py

Reads data/research/v36/economy.json (CONTRACT.md there). Every `ll` arrives as [lat, lon] and leaves as [lon, lat]; routes likewise.
Sources keep only https links; pictures only Wikimedia Commons files under PD, CC0, CC BY or CC BY-SA. Nothing after 2022 is kept."""
import json, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
f = root / 'data' / 'research' / 'v36' / 'economy.json'
CUT = 2022
held = []
LIC_OK = re.compile(r'public domain|\bpd\b|pd-|cc0|cc[- ]by(?![- ]?nc)(?![- ]?nd)|creative commons attribution(?! non)', re.I)
LIC_BAD = re.compile(r'\bnc\b|non-?commercial|\bnd\b|no-?deriv|fair use|all rights reserved', re.I)
def clean(t): return re.sub(r'\s+', ' ', str(t)).strip() if t is not None else ''
def ok_url(u): return isinstance(u, str) and u.startswith('https://') and ' ' not in u.strip()
def bi(v):
    if isinstance(v, str): return {'en': clean(v)} if clean(v) else None
    if isinstance(v, dict):
        o = {k: clean(v[k]) for k in ('en', 'ru') if isinstance(v.get(k), str) and clean(v.get(k))}
        return o or None
    return None
def ll(p):
    if isinstance(p, (list, tuple)) and len(p) >= 2 and all(isinstance(x, (int, float)) for x in p[:2]):
        lat, lon = float(p[0]), float(p[1])
        if -90 <= lat <= 90 and -180 <= lon <= 180: return [round(lon, 4), round(lat, 4)]
    return None
def year(o):
    if isinstance(o, dict) and isinstance(o.get('y'), (int, float)): return int(o['y'])
    if isinstance(o, (int, float)): return int(o)
    return None
def src(v): return [[clean(x[0]), x[1].strip()] for x in (v or []) if isinstance(x, (list, tuple)) and len(x) >= 2 and ok_url(x[1])][:8]
def wiki(v):
    if isinstance(v, dict):
        w = {k: clean(v[k]) for k in ('en', 'ru') if isinstance(v.get(k), str) and clean(v.get(k))}
        return w or None
    if isinstance(v, str) and clean(v): return {'en': clean(v)}
    return None
def pic(p, where):
    if not isinstance(p, dict) or not p.get('file'): return None
    lic = clean(p.get('lic')); page = p.get('page') or ''
    if not ok_url(page) or 'commons.wikimedia.org' not in page or not LIC_OK.search(lic) or LIC_BAD.search(lic):
        held.append((where, f"picture {p.get('file')} ({lic or 'no licence'})")); return None
    o = {'file': re.sub(r'^(File|Image):', '', clean(p['file'])), 'page': page, 'author': clean(p.get('author')), 'lic': lic}
    if isinstance(p.get('year'), (int, float)): o['year'] = int(p['year'])
    return o
D = json.load(open(f, encoding='utf-8')) if f.exists() else {}
E = {'asof': D.get('asof', ''), 'sites': [], 'waterways': [], 'trade': []}
seen = set()
for x in D.get('sites') or []:
    if not isinstance(x, dict) or not x.get('id') or x['id'] in seen: continue
    p = ll(x.get('ll')); y = year(x.get('founded')); n = bi(x.get('n'))
    if not p or y is None or not n: held.append(('site', f"{x.get('id')}: no place, year or name")); continue
    if y > CUT: continue
    seen.add(x['id'])
    o = {'id': x['id'], 'n': n, 'k': clean(x.get('kind')) or 'plant', 'y': y, 'll': p}
    c = year(x.get('closed'))
    if c is not None: o['to'] = c
    by = (x.get('founded') or {}).get('by') if isinstance(x.get('founded'), dict) else None
    if bi(by): o['by'] = bi(by)
    for k in ('place', 'what'):
        if bi(x.get(k)): o[k] = bi(x.get(k))
    if wiki(x.get('wiki')): o['wiki'] = wiki(x.get('wiki'))
    if x.get('llq') in ('map', 'rough'): o['llq'] = x['llq']   # the point is read from a map (rough: within about 10 km), not from a source
    pc = pic(x.get('pic'), x['id'])
    if pc: o['pic'] = pc
    o['src'] = src(x.get('src')); o['vf'] = clean(x.get('vf')) or 'S'
    if not o['src']: held.append(('site', f"{x['id']}: no https source")); continue
    E['sites'].append(o)
for key, out in (('waterways', 'waterways'), ('trade', 'trade')):
    for x in D.get(key) or []:
        if not isinstance(x, dict) or not x.get('id'): continue
        r = [q for q in (ll(p) for p in (x.get('route') or [])) if q]
        n = bi(x.get('n'))
        if len(r) < 2 or not n: held.append((key, f"{x.get('id')}: no route or name")); continue
        o = {'id': x['id'], 'n': n, 'route': r}
        if key == 'waterways':
            o['k'] = clean(x.get('kind')) or 'canal'; o['y'] = year(x.get('opened'))
            if o['y'] is None or o['y'] > CUT: held.append((key, f"{x['id']}: no year")); continue
        else:
            o['from'] = year(x.get('from')); o['to'] = year(x.get('to'))
            if o['from'] is None: held.append((key, f"{x['id']}: no start")); continue
            if bi(x.get('partner')): o['partner'] = bi(x.get('partner'))
            if bi(x.get('goods')): o['goods'] = bi(x.get('goods'))
        if bi(x.get('what')): o['what'] = bi(x.get('what'))
        if wiki(x.get('wiki')): o['wiki'] = wiki(x.get('wiki'))
        o['src'] = src(x.get('src')); o['vf'] = clean(x.get('vf')) or 'S'
        if not o['src']: held.append((key, f"{x['id']}: no https source")); continue
        E[out].append(o)
E['sites'].sort(key=lambda o: o['y'])
js = ('/* GENERATED by tools/gen_econ.py from data/research/v36/economy.json — do not edit by hand. ECON: the economy layer of the historical\n'
      '   globe (v36): sites {id, n{en,ru}, k (kind), y (founded), to?, ll [lon, lat], place, what, wiki, pic?, src, vf}, waterways {route, y},\n'
      '   trade routes {route, from, to, partner, goods}. */\n'
      'const ECON=' + json.dumps(E, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + ';\n')
(root / 'src' / 'data_econ.js').write_text(js, encoding='utf-8')
for h in held[:20]: print('  held back:', h)
if len(held) > 20: print(f'  … and {len(held) - 20} more')
print(f"wrote src/data_econ.js: {len(E['sites'])} sites, {len(E['waterways'])} waterways, {len(E['trade'])} trade routes; {len(js) // 1024} KB")
