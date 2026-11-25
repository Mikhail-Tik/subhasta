#!/usr/bin/env python3
"""Write src/data_history.js from data/research/v33/history.json (the centuries, the events, the wonders, the people), the v34 research
in data/research/v34/ (events.json: the century's events with tiers and paced routes; peoples.json: migrations, epidemics, the population
series and the UN projection; centuries.json: the life of each century, the thinkers' works, more thinkers, the cities through history;
today.json: the conflicts and events of the month, the collections that hold each movement's key works and the world then; pictures.json:
public-domain pictures, copied to docs/img/v34/) and data/wonders.json (the wonders' line art), and copy the border snapshots
data/hist/*.json to docs/hist/ for the website. A row without a source or a place is held back and listed. Years BC are negative.
Coordinates are [lat, lon] in the research and are written as [lon, lat] for the globe. CONTRACT.md in data/research/v34/ is the shape."""
import json, pathlib, re, shutil, sys
root = pathlib.Path(__file__).resolve().parent.parent
R = root / 'data' / 'research' / 'v33' / ('HISTORY_SAMPLE.json' if '--sample' in sys.argv else 'history.json')   # --sample: the schema sample, for testing the page
H = json.load(open(R, encoding='utf-8')) if R.exists() else {}
W = json.load(open(root / 'data' / 'wonders.json', encoding='utf-8')) if (root / 'data' / 'wonders.json').exists() else {'items': []}
V34 = root / 'data' / 'research' / 'v34'
def load34(name):
    f = V34 / name
    if not f.exists(): return {}
    try: return json.load(open(f, encoding='utf-8'))
    except Exception as e:
        print(f'  v34: {name} is not valid JSON ({e}); skipped'); return {}
EV34, PE34, CE34, TD34 = load34('events.json'), load34('peoples.json'), load34('centuries.json'), load34('today.json')
PIC34 = load34('pictures.json')
if isinstance(PIC34, dict): PIC34 = PIC34.get('pictures') or PIC34.get('rows') or []
KINDS = {'battle', 'siege', 'war', 'campaign', 'conquest', 'founding', 'fall', 'treaty', 'revolution', 'invention', 'science', 'religion', 'plague', 'migration', 'voyage', 'journey', 'disaster', 'trade', 'art', 'event'}
ROUTED = {'campaign', 'conquest', 'voyage', 'journey', 'migration', 'plague'}
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

def century_of(y): return (y // 100) * 100
def event_row(e, default_tier, source):
    f, t = yr(e.get('from')), yr(e.get('to'))
    if f is None or not e.get('n') or not ok_src(e.get('src')): held.append((source, e.get('n') or e.get('id'), 'no year, name or opened source')); return None
    if t is None: t = f
    kind = clean(e.get('kind') or 'event').lower()
    if kind not in KINDS: kind = 'event'
    tier = e.get('tier')
    tier = int(tier) if tier in (1, 2, 3, '1', '2', '3') else default_tier
    row = {'id': e.get('id') or re.sub(r'[^a-z0-9]+', '-', clean(e['n']).lower())[:40], 'n': clean(e['n']), 'from': f, 'to': max(f, t), 'kind': kind, 'tier': tier, 'c': century_of(f), 't': clean(e.get('t')), 'src': e['src'], 'vf': e.get('vf', 'S')}
    if isinstance(e.get('route'), list) and len(e['route']) >= 2 and all(ll_ok(p) for p in e['route']):
        row['route'] = [swap(p) for p in e['route']]
        wh = e.get('when')
        if isinstance(wh, list) and len(wh) == len(e['route']) and all(yr(w) is not None for w in wh):
            ws = [yr(w) for w in wh]
            if all(ws[i] <= ws[i + 1] for i in range(len(ws) - 1)): row['when'] = ws
        if ll_ok(e.get('ll')): row['ll'] = swap(e['ll'])
    elif ll_ok(e.get('ll')): row['ll'] = swap(e['ll'])
    else: held.append((source, row['n'], 'no place')); return None
    for k in ('fig', 'who', 'genes', 'n_people', 'dead', 'agent'):
        if e.get(k): row[k] = clean(e[k])
    if e.get('img'): row['img'] = clean(e['img'])
    return row
events, seen_ev = [], set()
retier = {str(r.get('id')): int(r['tier']) for r in (EV34.get('retier') or []) if isinstance(r, dict) and r.get('tier') in (1, 2, 3)}
for e in H.get('events') or []:
    row = event_row(e, 1, 'event')
    if not row: continue
    if row['id'] in retier: row['tier'] = retier[row['id']]
    events.append(row); seen_ev.add(row['id'])
replaced = {str(r.get('replaces')) for lst in (PE34.get('migrations') or [], PE34.get('epidemics') or []) for r in lst if isinstance(r, dict) and r.get('replaces')}
events = [e for e in events if e['id'] not in replaced]
for lst, src_name, kind in ((EV34.get('events') or [], 'v34 event', None), (PE34.get('migrations') or [], 'migration', 'migration'), (PE34.get('epidemics') or [], 'epidemic', 'plague')):
    for e in lst:
        if not isinstance(e, dict): continue
        if kind: e = {**e, 'kind': kind}
        row = event_row(e, 2, src_name)
        if not row: continue
        if row['id'] in seen_ev:
            # the same id twice: the v34 row supersedes the v33 one
            events = [x for x in events if x['id'] != row['id']]
        events.append(row); seen_ev.add(row['id'])
# at most five of the first tier a century at a glance: the surplus (v33 rows without an explicit tier) steps down
by_c = {}
for e in events: by_c.setdefault(e['c'], []).append(e)
for c, lst in by_c.items():
    t1 = [e for e in lst if e['tier'] == 1]
    if len(t1) > 5:
        for e in sorted(t1, key=lambda e: (not (e['id'] in retier or any(x.get('id') == e['id'] for x in (EV34.get('events') or []))), e['from']))[5:]: e['tier'] = 2   # an explicit tier is kept; the surplus of untiered rows steps down
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
STOP = {'the', 'of', 'at', 'de', 'la', 'le', 'a', 'and', 'in', 'el', 'al'}
def words_of(t): return {w for w in norm(t).split() if w not in STOP and len(w) > 1}
# the city landmarks (data/landmarks.json) can stand for a wonder too (the Eiffel Tower, the Empire State Building, St Basil's …)
LMK = json.load(open(root / 'data' / 'landmarks.json', encoding='utf-8')) if (root / 'data' / 'landmarks.json').exists() else {'items': []}
for it in LMK.get('items') or []:
    nm = it.get('n') or it.get('name') or ''
    k = 'city-' + re.sub(r'[^a-z0-9]+', '-', nm.lower()).strip('-')[:40]
    paths = []
    for p in it.get('paths', []):
        flat = []
        for pt in p:
            if isinstance(pt, (list, tuple)) and len(pt) == 2: flat += [round(float(pt[0]), 1), round(float(pt[1]), 1)]
        if len(flat) >= 4: paths.append(flat)
    if nm and paths and k not in art: art[k] = {'n': nm, 'w': float(it.get('w') or 1), 'p': paths, 'city': it.get('city')}
def art_for(wid, name):
    # the research names a wonder in its own words; a drawing matches when its id is the same, or when the words of one name are all in the other's
    if wid in art: return wid
    nw = words_of(name) | words_of(wid.replace('-', ' '))
    best, bs = None, 0
    for k, a in art.items():
        aw = words_of(a['n']) | words_of(k.replace('city-', '').replace('-', ' '))
        if not aw or not nw: continue
        inter = nw & aw
        if inter and (aw <= nw or nw <= aw) and len(inter) > bs: best, bs = k, len(inter)
    return best
wonders = []
for w in H.get('wonders') or []:
    b = yr(w.get('built'))
    if b is None or not w.get('n') or not ll_ok(w.get('ll')) or not ok_src(w.get('src')): held.append(('wonder', w.get('n') or w.get('id'), 'no year, place or opened source')); continue
    g = yr(w.get('gone')) if w.get('gone') not in (None, '', 'null') else None
    wid = w.get('id') or re.sub(r'[^a-z0-9]+', '-', clean(w['n']).lower())[:40]
    ll = swap(w['ll']); a = art_for(wid, w['n'])
    wonders.append({'id': wid, 'n': clean(w['n']), 'll': ll, 'built': b, 'gone': g, 't': clean(w.get('t')), 'src': w['src'], 'vf': w.get('vf', 'S'), 'art': a})
# a wonder drawn in data/wonders.json but not in the research still stands on the globe if it carries a place and years there
for wid, a in art.items():
    if not wid.startswith('city-') and not any(x['art'] == wid for x in wonders): held.append(('wonder art without a research row', wid, 'drawn but undated: not shown'))
used = {x['art'] for x in wonders if x['art']}
art = {k: v for k, v in art.items() if k in used or not k.startswith('city-')}   # the city drawings travel only when a wonder uses them
wonders.sort(key=lambda w: w['built'])

people = []
for p in H.get('people') or []:
    b, d = yr(p.get('born')), yr(p.get('died'))
    if b is None or not p.get('n') or not ll_ok(p.get('ll')) or not ok_src(p.get('src')): held.append(('person', p.get('n') or p.get('id'), 'no years, place or opened source')); continue
    people.append({'id': p.get('id') or re.sub(r'[^a-z0-9]+', '-', clean(p['n']).lower())[:40], 'n': clean(p['n']), 'b': b, 'd': d, 'll': swap(p['ll']), 'city': clean(p.get('city')), 'role': clean(p.get('role')), 't': clean(p.get('t')), 'src': p['src'], 'vf': p.get('vf', 'S')})
# v34: more thinkers (centuries.json → people), and their works
seen_pp = {p['id'] for p in people}
for p in CE34.get('people') or []:
    if not isinstance(p, dict): continue
    b, d = yr(p.get('born')), yr(p.get('died'))
    if b is None or not p.get('n') or not ll_ok(p.get('ll')) or not ok_src(p.get('src')): held.append(('person (v34)', p.get('n') or p.get('id'), 'no years, place or opened source')); continue
    pid = p.get('id') or re.sub(r'[^a-z0-9]+', '-', clean(p['n']).lower())[:40]
    if pid in seen_pp: continue
    people.append({'id': pid, 'n': clean(p['n']), 'b': b, 'd': d, 'll': swap(p['ll']), 'city': clean(p.get('city')), 'role': clean(p.get('role')), 't': clean(p.get('t')), 'src': p['src'], 'vf': p.get('vf', 'S')}); seen_pp.add(pid)
works = {}
for w in CE34.get('works') or []:
    if not isinstance(w, dict) or not w.get('id'): continue
    ws = [{'t': clean(x.get('t')), 'y': yr(x.get('y'))} for x in (w.get('works') or []) if isinstance(x, dict) and x.get('t')]
    if ws: works[str(w['id'])] = ws
for p in CE34.get('people') or []:
    if isinstance(p, dict) and p.get('id') and isinstance(p.get('works'), list):
        ws = [{'t': clean(x.get('t')), 'y': yr(x.get('y'))} for x in p['works'] if isinstance(x, dict) and x.get('t')]
        if ws: works.setdefault(str(p['id']), ws)
n_works = 0
for p in people:
    if p['id'] in works: p['works'] = works[p['id']][:6]; n_works += 1
people.sort(key=lambda p: p['b'])
# v34: the life of each century
life = {yr(c.get('y')): c for c in (CE34.get('centuries') or []) if isinstance(c, dict) and yr(c.get('y')) is not None}
n_life = 0
for c in centuries:
    L = life.get(c['y'])
    if not L: continue
    for k in ('life', 'food', 'smell', 'trouble'):
        if L.get(k): c[k] = clean(L[k])
    if any(c.get(k) for k in ('life', 'food', 'smell', 'trouble')):
        n_life += 1
        if ok_src(L.get('src')): c['life_src'] = L['src']; c['life_vf'] = L.get('vf', 'S')
# v34: the cities through history
cities = []
for cy in CE34.get('cities') or []:
    if not isinstance(cy, dict) or not cy.get('n') or not ll_ok(cy.get('ll')): continue
    moments = []
    for m in cy.get('moments') or []:
        y = yr(m.get('y')) if isinstance(m, dict) else None
        if y is None or not m.get('n'): continue
        moments.append({'y': y, 'n': clean(m['n']), 't': clean(m.get('t')), 'src': m.get('src') if ok_src(m.get('src')) else [], 'vf': m.get('vf', 'S')})
    if not moments: continue
    moments.sort(key=lambda m: m['y'])
    cities.append({'id': cy.get('id') or re.sub(r'[^a-z0-9]+', '-', clean(cy['n']).lower())[:30], 'n': clean(cy['n']), 'll': swap(cy['ll']), 'from': moments[0]['y'], 'moments': moments})
# v34: the population series and the UN projection
pop = {}
P = PE34.get('population') or {}
if isinstance(P.get('world'), list):
    ws = [[yr(x[0]), float(x[1])] for x in P['world'] if isinstance(x, list) and len(x) >= 2 and yr(x[0]) is not None and isinstance(x[1], (int, float))]
    if ws: pop['world'] = sorted(ws); pop['world_src'] = P.get('world_src') or P.get('src') or []
pr = P.get('projection') or {}
if isinstance(pr.get('years'), list) and isinstance(pr.get('world'), list) and len(pr['years']) == len(pr['world']):
    pop['proj'] = {'years': [yr(y) for y in pr['years']], 'world': [float(v) for v in pr['world']], 'regions': {k: [float(v) for v in vs] for k, vs in (pr.get('regions') or {}).items() if isinstance(vs, list) and len(vs) == len(pr['years'])}, 'peak': pr.get('peak') or None, 'src': pr.get('src') or []}
    ra = pr.get('regions_at')
    if not pop['proj']['regions'] and isinstance(ra, dict) and isinstance(ra.get('years'), list):
        # the regions at their own years (e.g. 2025, 2050, 2100), with the world of the same table as the denominator
        ry = [yr(y) for y in ra['years']]
        regs = {k: [float(v) for v in vs] for k, vs in ra.items() if k not in ('years', 'src', 'unit') and isinstance(vs, list) and len(vs) == len(ry) and all(isinstance(v, (int, float)) for v in vs)}
        if regs: pop['proj']['ry'] = ry; pop['proj']['regions'] = regs
# v34: today — the conflicts and the month's events; the movements' owners and the world then
today = {'asof': TD34.get('asof') or '', 'conflicts': [], 'events': []}
for c in TD34.get('conflicts') or []:
    if not isinstance(c, dict) or not c.get('n') or not ll_ok(c.get('ll')) or not ok_src(c.get('src')): held.append(('conflict', (c or {}).get('n'), 'no place or opened source')); continue
    today['conflicts'].append({'id': c.get('id') or re.sub(r'[^a-z0-9]+', '-', clean(c['n']).lower())[:40], 'n': clean(c['n']), 'll': swap(c['ll']), 'since': yr(c.get('since')), 'parties': clean(c.get('parties')), 'status': clean(c.get('status') or 'conflict').lower(), 't': clean(c.get('t')), 'fig': clean(c.get('fig')), 'src': c['src'], 'vf': c.get('vf', 'S')})
for e in TD34.get('events') or []:
    if not isinstance(e, dict) or not e.get('n') or not ll_ok(e.get('ll')) or not ok_src(e.get('src')): continue
    today['events'].append({'id': e.get('id') or re.sub(r'[^a-z0-9]+', '-', clean(e['n']).lower())[:40], 'n': clean(e['n']), 'date': clean(e.get('date')), 'll': swap(e['ll']), 't': clean(e.get('t')), 'src': e['src'], 'vf': e.get('vf', 'S')})
move_today = {}
for mid, m in (TD34.get('movements') or {}).items():
    if not isinstance(m, dict): continue
    owners = [{'n': clean(o.get('n')), 'what': clean(o.get('what')), 'src': o.get('src')} for o in (m.get('owners') or []) if isinstance(o, dict) and o.get('n')]
    if owners or m.get('sync'): move_today[mid] = {'owners': owners[:6], 'sync': clean(m.get('sync')), 'src': m.get('src') or [], 'vf': m.get('vf', 'S')}
# v34: the pictures — copied to docs/img/v34/ (the website); assets in the artifacts (data/pic_assets.json, applied by build.py)
pics = {}
pic_dir, pic_out = V34 / 'pictures', root / 'docs' / 'img' / 'v34'
for r in PIC34 if isinstance(PIC34, list) else []:
    if not isinstance(r, dict) or not r.get('key') or not isinstance(r.get('for'), dict): continue
    key = re.sub(r'[^a-z0-9-]+', '-', str(r['key']).lower()).strip('-')
    f = None
    for ext in ('jpg', 'jpeg', 'png'):
        if (pic_dir / f'{key}.{ext}').exists(): f = pic_dir / f'{key}.{ext}'; break
    if not f or not r.get('lic') or not r.get('evidence'): held.append(('picture', key, 'no file, licence or evidence')); continue
    pic_out.mkdir(parents=True, exist_ok=True)
    out_f = pic_out / f.name
    if not out_f.exists() or out_f.stat().st_size != f.stat().st_size: shutil.copy(f, out_f)
    lic = clean(r['lic'])
    pics[key] = {'for': {k: str(v) for k, v in r['for'].items()}, 't': clean(r.get('t')), 'a': clean(r.get('a')), 'y': clean(r.get('y')), 'c': clean(r.get('c')), 'w': r.get('w'), 'h': r.get('h'),
                 'lic': lic, 'lic_short': 'Public domain' if re.search(r'public domain|cc0', lic, re.I) else lic[:60], 'evidence': r['evidence'], 'u': r.get('u') or '', 'src': f'img/v34/{f.name}', 'vf': r.get('vf', 'S')}

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
# v34: the close set (data/hist/fine/<year>.json, 0.1°) in four chunks by era — hist/fine-<k>.json on the website, assets in the artifacts;
# the engine's HIST_FINE table names the same spans
FINE = [('a', -3000, 700), ('b', 800, 1492), ('c', 1500, 1815), ('d', 1880, 2010)]
fine = hist / 'fine'
if fine.exists():
    fyears = sorted(int(f.stem) for f in fine.glob('*.json') if f.stem not in ('index',) and not f.stem.startswith('fine-'))
    for k, a, b in FINE:
        ys = [y for y in fyears if a <= y <= b]
        chunk = {'years': ys, 'tol': 0.1, 'src': 'https://github.com/aourednik/historical-basemaps', 'licence': bundle['licence'] if years else '', 'snaps': {str(y): json.load(open(fine / f'{y}.json', encoding='utf-8')) for y in ys}}
        txt = json.dumps(chunk, ensure_ascii=False, separators=(',', ':'))
        (fine / f'fine-{k}.json').write_text(txt, encoding='utf-8')
        (out / f'fine-{k}.json').write_text(txt, encoding='utf-8')
head = ("/* data_history.js — generated by tools/gen_history.py (v33) from data/research/v33/history.json and data/wonders.json.\n"
        "   HISTORY: {centuries, events, wonders, people, years} — the Then mode's historical layer; coordinates [lon, lat]; years BC negative.\n"
        "   HIST_YEARS lists the border snapshots (data/hist/<year>.json → docs/hist/ on the website; assets in the artifact). WONDER_ART: line art. */\n")
js = head + 'const HISTORY=' + json.dumps({'asof': H.get('asof', ''), 'asof34': EV34.get('asof') or CE34.get('asof') or '', 'centuries': centuries, 'events': events, 'wonders': wonders, 'people': people, 'cities': cities, 'pop': pop, 'years': years, 'licence': (json.load(open(hist / 'index.json', encoding='utf-8')).get('licence', '') if (hist / 'index.json').exists() else '')}, ensure_ascii=False, separators=(',', ':')) + ';\n'
js += 'const WORLD_NOW=' + json.dumps(today, ensure_ascii=False, separators=(',', ':')) + ';\n'
js += 'const MOVE_TODAY=' + json.dumps(move_today, ensure_ascii=False, separators=(',', ':')) + ';\n'
js += 'const HIST_PICS=' + json.dumps(pics, ensure_ascii=False, separators=(',', ':')) + ';\n'
js += 'const WONDER_ART=' + json.dumps({k: {'n': v['n'], 'w': v['w'], 'p': v['p']} for k, v in art.items()}, ensure_ascii=False, separators=(',', ':')) + ';\n'
js += 'const HIST_ASSETS={};\n'
(root / 'src' / 'data_history.js').write_text(js, encoding='utf-8')
print(f"wrote src/data_history.js: {len(centuries)} centuries ({n_life} with their life), {len(events)} events ({sum(1 for e in events if e.get('route'))} with routes, {sum(1 for e in events if e.get('when'))} paced; tiers {sum(1 for e in events if e['tier']==1)}/{sum(1 for e in events if e['tier']==2)}/{sum(1 for e in events if e['tier']==3)}), {len(wonders)} wonders ({sum(1 for w in wonders if w['art'])} drawn), {len(people)} people ({n_works} with works), {len(cities)} cities, population {len(pop.get('world') or [])} points{' + projection' if pop.get('proj') else ''}, today {len(today['conflicts'])} conflicts and {len(today['events'])} events, {len(move_today)} movements' owners, {len(pics)} pictures, {len(years)} border years; {len(js)//1024} KB")
for h in held[:40]: print('  held back:', h)
if len(held) > 40: print(f'  … and {len(held) - 40} more held back')
