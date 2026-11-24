#!/usr/bin/env python3
"""Write src/data_history.js (v33) from data/research/v33/history.json (the centuries, the events, the wonders, the people) and
data/wonders.json (the wonders' line art), and copy the border snapshots data/hist/*.json to docs/hist/ for the website.
A row without a source or a place is held back and listed. Years BC are negative. Coordinates are [lat, lon] in the research and
are written as [lon, lat] for the globe."""
import json, pathlib, re, shutil, sys
root = pathlib.Path(__file__).resolve().parent.parent
R = root / 'data' / 'research' / 'v33' / ('HISTORY_SAMPLE.json' if '--sample' in sys.argv else 'history.json')   # --sample: the schema sample, for testing the page
H = json.load(open(R, encoding='utf-8')) if R.exists() else {}
W = json.load(open(root / 'data' / 'wonders.json', encoding='utf-8')) if (root / 'data' / 'wonders.json').exists() else {'items': []}
held = []
def ok_src(s): return isinstance(s, list) and any(isinstance(x, list) and len(x) == 2 and str(x[1]).startswith('https://') for x in s)
def ll_ok(ll): return isinstance(ll, list) and len(ll) == 2 and all(isinstance(v, (int, float)) for v in ll) and -90 <= ll[0] <= 90 and -180 <= ll[1] <= 180
def swap(ll): return [round(float(ll[1]), 2), round(float(ll[0]), 2)]
def yr(v):
    try: return int(v)
    except Exception: return None
def clean(t): return re.sub(r'\s+', ' ', str(t or '')).strip()

centuries = []
for c in H.get('centuries') or []:
    y = yr(c.get('y'))
    if y is None: continue
    powers = []
    for p in c.get('powers') or []:
        if not p.get('n'): continue
        powers.append({'n': clean(p['n']), 'cap': clean(p.get('cap')), 'll': swap(p['ll']) if ll_ok(p.get('ll')) else None, 't': clean(p.get('note') or p.get('t'))})
    centuries.append({'y': y, 'n': clean(c.get('n') or f'The world in {abs(y)}{" BC" if y < 0 else ""}'), 'pop': c.get('pop'), 'pop_src': c.get('pop_src'), 'pop_vf': c.get('pop_vf', 'S'),
                      'powers': powers, 'moved': clean(c.get('moved')), 'art': clean(c.get('art')), 'people': [str(x) for x in (c.get('people') or [])], 'src': c.get('src') or [], 'vf': c.get('vf', 'S')})
centuries.sort(key=lambda c: c['y'])

events = []
for e in H.get('events') or []:
    f, t = yr(e.get('from')), yr(e.get('to'))
    if f is None or not e.get('n') or not ok_src(e.get('src')): held.append(('event', e.get('n') or e.get('id'), 'no year, name or opened source')); continue
    if t is None: t = f
    row = {'id': e.get('id') or re.sub(r'[^a-z0-9]+', '-', clean(e['n']).lower())[:40], 'n': clean(e['n']), 'from': f, 'to': max(f, t), 'kind': clean(e.get('kind') or 'event'), 't': clean(e.get('t')), 'src': e['src'], 'vf': e.get('vf', 'S')}
    if isinstance(e.get('route'), list) and len(e['route']) >= 2 and all(ll_ok(p) for p in e['route']): row['route'] = [swap(p) for p in e['route']]
    elif ll_ok(e.get('ll')): row['ll'] = swap(e['ll'])
    else: held.append(('event', row['n'], 'no place')); continue
    events.append(row)
events.sort(key=lambda e: e['from'])

art = {}
for it in W.get('items') or []:
    paths = []
    for p in it.get('paths', []):
        flat = []
        for pt in p:
            if isinstance(pt, (list, tuple)) and len(pt) == 2: flat += [round(float(pt[0]), 1), round(float(pt[1]), 1)]
        if len(flat) >= 4: paths.append(flat)
    if it.get('id') and paths: art[it['id']] = {'n': it.get('n') or '', 'w': float(it.get('w') or 1), 'p': paths, 'll': swap(it['ll']) if ll_ok(it.get('ll')) else None}

def norm(t): return re.sub(r'[^a-z0-9]+', ' ', str(t or '').lower()).strip()
STOP = {'the', 'of', 'at', 'de', 'la', 'le', 'a', 'and', 'great', 'basilica', 'cathedral', 'palace', 'temple', 'tower', 'wall', 'house', 'gate'}
def words_of(t): return {w for w in norm(t).split() if w not in STOP and len(w) > 2}
def art_for(wid, name, ll):
    # the research names a wonder in its own words; match it to a drawing by id, then by shared words, then by place (within 60 km)
    if wid in art: return wid
    nw = words_of(name)
    best, bs = None, 0
    for k, a in art.items():
        aw = words_of(a['n']) | words_of(k.replace('-', ' '))
        score = len(nw & aw)
        if score > bs: best, bs = k, score
    if best and bs >= 1: return best
    for k, a in art.items():
        if a.get('ll') and ll and abs(a['ll'][0] - ll[0]) < .6 and abs(a['ll'][1] - ll[1]) < .6: return k
    return None
wonders = []
for w in H.get('wonders') or []:
    b = yr(w.get('built'))
    if b is None or not w.get('n') or not ll_ok(w.get('ll')) or not ok_src(w.get('src')): held.append(('wonder', w.get('n') or w.get('id'), 'no year, place or opened source')); continue
    g = yr(w.get('gone')) if w.get('gone') not in (None, '', 'null') else None
    wid = w.get('id') or re.sub(r'[^a-z0-9]+', '-', clean(w['n']).lower())[:40]
    ll = swap(w['ll']); a = art_for(wid, w['n'], ll)
    wonders.append({'id': wid, 'n': clean(w['n']), 'll': ll, 'built': b, 'gone': g, 't': clean(w.get('t')), 'src': w['src'], 'vf': w.get('vf', 'S'), 'art': a})
# a wonder drawn in data/wonders.json but not in the research still stands on the globe if it carries a place and years there
for wid, a in art.items():
    if not any(x['art'] == wid for x in wonders): held.append(('wonder art without a research row', wid, 'drawn but undated: not shown'))
wonders.sort(key=lambda w: w['built'])

people = []
for p in H.get('people') or []:
    b, d = yr(p.get('born')), yr(p.get('died'))
    if b is None or not p.get('n') or not ll_ok(p.get('ll')) or not ok_src(p.get('src')): held.append(('person', p.get('n') or p.get('id'), 'no years, place or opened source')); continue
    people.append({'id': p.get('id') or re.sub(r'[^a-z0-9]+', '-', clean(p['n']).lower())[:40], 'n': clean(p['n']), 'b': b, 'd': d, 'll': swap(p['ll']), 'city': clean(p.get('city')), 'role': clean(p.get('role')), 't': clean(p.get('t')), 'src': p['src'], 'vf': p.get('vf', 'S')})
people.sort(key=lambda p: p['b'])

# the border snapshots to the website
hist = root / 'data' / 'hist'; out = root / 'docs' / 'hist'; years = []
if hist.exists():
    out.mkdir(parents=True, exist_ok=True)
    for f in sorted(hist.glob('*.json')):
        shutil.copy(f, out / f.name)
        if f.stem != 'index':
            try: years.append(int(f.stem))
            except ValueError: pass
years.sort()
# one bundle of every snapshot for the page's single fetch (the website's docs/hist/all.json; an asset in the artifacts)
if years:
    bundle = {'years': years, 'src': 'https://github.com/aourednik/historical-basemaps', 'licence': (json.load(open(hist / 'index.json', encoding='utf-8')).get('licence', '') if (hist / 'index.json').exists() else ''), 'snaps': {}}
    for y in years:
        bundle['snaps'][str(y)] = json.load(open(hist / f'{y}.json', encoding='utf-8'))
    (hist / 'all.json').write_text(json.dumps(bundle, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    shutil.copy(hist / 'all.json', out / 'all.json')
head = ("/* data_history.js — generated by tools/gen_history.py (v33) from data/research/v33/history.json and data/wonders.json.\n"
        "   HISTORY: {centuries, events, wonders, people, years} — the Then mode's historical layer; coordinates [lon, lat]; years BC negative.\n"
        "   HIST_YEARS lists the border snapshots (data/hist/<year>.json → docs/hist/ on the website; assets in the artifact). WONDER_ART: line art. */\n")
js = head + 'const HISTORY=' + json.dumps({'asof': H.get('asof', ''), 'centuries': centuries, 'events': events, 'wonders': wonders, 'people': people, 'years': years, 'licence': (json.load(open(hist / 'index.json', encoding='utf-8')).get('licence', '') if (hist / 'index.json').exists() else '')}, ensure_ascii=False, separators=(',', ':')) + ';\n'
js += 'const WONDER_ART=' + json.dumps({k: {'n': v['n'], 'w': v['w'], 'p': v['p']} for k, v in art.items()}, ensure_ascii=False, separators=(',', ':')) + ';\n'
js += 'const HIST_ASSETS={};\n'
(root / 'src' / 'data_history.js').write_text(js, encoding='utf-8')
print(f"wrote src/data_history.js: {len(centuries)} centuries, {len(events)} events ({sum(1 for e in events if 'route' in e)} with routes), {len(wonders)} wonders ({sum(1 for w in wonders if w['art'])} drawn), {len(people)} people, {len(years)} border years; {len(js)//1024} KB")
for h in held[:40]: print('  held back:', h)
if len(held) > 40: print(f'  … and {len(held) - 40} more held back')
