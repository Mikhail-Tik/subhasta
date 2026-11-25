#!/usr/bin/env python3
"""Write src/data_objects.js (v34): the objects of value on the globe and the pictures of the sold lots.

    python3 -I tools/gen_objects.py

Reads data/research/v34/objects.json (the legendary objects: wine, watches, cars, jewels, coins, stamps, books, fossils, Fabergé …,
each with where, who, when, how many, the record and a Wikimedia Commons picture; CONTRACT in the agent's brief) and
data/research/v34/lot_pictures.json (a Commons file of the very work, or of a related object, for the lots of RESULTS, RESULTS_MORE and
the private sales). Writes:
  OBJECTS   {asof, categories:[{id,n}], objects:[{id,cat,n,maker,made,ll:[lon,lat],place,count,record,now,t,pic,src,vf}]}
  LOT_PICS  {"<artist|title key>": {file, page, what, caption, author, lic}}
Pictures are hotlinked on the website through https://commons.wikimedia.org/wiki/Special:FilePath/<file>; the artifact's frame
refuses outside pictures, so there the page links to the file page instead. Only Public Domain, CC0, CC BY and CC BY-SA files are kept,
with their author and licence (the page credits them). A row without a source, a place or a licence is held back and listed."""
import json, pathlib, re, unicodedata
root = pathlib.Path(__file__).resolve().parent.parent
V34 = root / 'data' / 'research' / 'v34'
held = []

def load(name, default):
    f = V34 / name
    if not f.exists(): return default
    try: return json.load(open(f, encoding='utf-8'))
    except Exception as e:
        print(f'  {name}: not valid JSON ({e}); skipped'); return default

def clean(t): return re.sub(r'\s+', ' ', str(t or '')).strip()
def ok_url(u): return isinstance(u, str) and u.startswith('https://')
def ok_src(src): return isinstance(src, list) and any(isinstance(x, list) and len(x) >= 2 and ok_url(x[1]) for x in src)
def ll_ok(p): return isinstance(p, list) and len(p) == 2 and all(isinstance(v, (int, float)) for v in p) and -90 <= p[0] <= 90 and -180 <= p[1] <= 180
LIC_OK = re.compile(r'public domain|pd-|cc0|cc[- ]by(?!-nc)(?!-nd)|cc[- ]by[- ]sa|creative commons attribution(?! non)(?!-noncommercial)', re.I)
LIC_BAD = re.compile(r'\bnc\b|non-?commercial|\bnd\b|no-?deriv|fair use|all rights reserved|copyright(ed)? (by|©)', re.I)
def pic_ok(p):
    if not isinstance(p, dict) or not p.get('file') or not ok_url(p.get('page', '')) or 'commons.wikimedia.org' not in p.get('page', ''): return False
    lic = str(p.get('lic') or '')
    return bool(LIC_OK.search(lic)) and not LIC_BAD.search(lic)
def pic_row(p):
    f = clean(p['file'])
    f = re.sub(r'^(File|Image):', '', f)
    return {'file': f, 'page': p['page'], 'author': clean(p.get('author')), 'lic': clean(p.get('lic')), 'caption': clean(p.get('caption')), 'what': 'related' if p.get('what') == 'related' else 'work'}

def key(artist, title):
    s = f'{artist or ""}|{title or ""}'
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9|]+', ' ', s).strip()

# the objects
O = load('objects.json', {})
cats = [{'id': clean(c.get('id')), 'n': clean(c.get('n'))} for c in (O.get('categories') or []) if isinstance(c, dict) and c.get('id')]
cat_ids = {c['id'] for c in cats}
objects, seen = [], set()
for o in O.get('objects') or []:
    if not isinstance(o, dict) or not o.get('n') or not ll_ok(o.get('ll')) or not ok_src(o.get('src')):
        held.append(('object', (o or {}).get('n') or (o or {}).get('id'), 'no name, place or opened source')); continue
    oid = re.sub(r'[^a-z0-9-]+', '-', str(o.get('id') or clean(o['n']).lower())).strip('-')[:60]
    if oid in seen: continue
    seen.add(oid)
    cat = clean(o.get('cat')) or 'other'
    if cat not in cat_ids:
        cats.append({'id': cat, 'n': cat.replace('-', ' ').capitalize()}); cat_ids.add(cat)
    row = {'id': oid, 'cat': cat, 'n': clean(o['n']), 'll': [o['ll'][1], o['ll'][0]], 'place': clean(o.get('place')), 'maker': clean(o.get('maker')), 'made': clean(o.get('made')),
           'count': clean(o.get('count')), 't': clean(o.get('t')), 'src': [x for x in o['src'] if isinstance(x, list) and len(x) >= 2 and ok_url(x[1])][:8], 'vf': o.get('vf', 'S') if o.get('vf') in ('V', 'S', 'U') else 'S'}
    r = o.get('record')
    if isinstance(r, dict) and isinstance(r.get('price'), (int, float)) and r['price'] > 0:
        row['record'] = {'price': float(r['price']), 'house': clean(r.get('house')), 'city': clean(r.get('city')), 'date': clean(r.get('date')), 'what': clean(r.get('what')), 'buyer': clean(r.get('buyer'))}
    nw = o.get('now')
    if isinstance(nw, dict) and nw.get('n'):
        row['now'] = {'n': clean(nw['n'])}
        if ll_ok(nw.get('ll')): row['now']['ll'] = [nw['ll'][1], nw['ll'][0]]
    if pic_ok(o.get('pic')): row['pic'] = pic_row(o['pic'])
    elif o.get('pic'): held.append(('object picture', row['n'], 'licence not shown as PD / CC0 / CC BY / CC BY-SA'))
    if isinstance(o.get('wiki'), str) and o['wiki'].strip() and len(o['wiki']) < 200: row['wiki'] = clean(o['wiki'])   # the page fetches the article's lead picture, Commons-hosted only
    objects.append(row)

# the lots' pictures
lot_pics = {}
for p in load('lot_pictures.json', []) or []:
    if not isinstance(p, dict): continue
    k = key(p.get('artist'), p.get('title')) if p.get('title') else key('', p.get('work'))
    wiki = clean(p.get('wiki')) if isinstance(p.get('wiki'), str) and len(p['wiki']) < 200 else ''
    if pic_ok(p):
        lot_pics[k] = pic_row(p)
        if wiki: lot_pics[k]['wiki'] = wiki
    elif wiki:
        lot_pics[k] = {'wiki': wiki, 'what': 'related' if p.get('what') == 'related' else 'work', 'caption': clean(p.get('caption'))}
    else: held.append(('lot picture', k, 'no Commons page or an unusable licence'))

head = ("/* GENERATED by tools/gen_objects.py from data/research/v34/objects.json and lot_pictures.json — do not edit by hand.\n"
        "   OBJECTS: the objects of value on the globe (ll is [lon, lat]); LOT_PICS: a Wikimedia Commons picture for a sold lot, keyed by\n"
        "   'artist|title' folded to ASCII lower case (a private sale by '|work'). Licences are Public Domain, CC0, CC BY or CC BY-SA, credited. */\n")
js = head + 'const OBJECTS=' + json.dumps({'asof': O.get('asof') or '', 'categories': cats, 'objects': objects}, ensure_ascii=False, separators=(',', ':')) + ';\n'
js += 'const LOT_PICS=' + json.dumps(lot_pics, ensure_ascii=False, separators=(',', ':')) + ';\n'
(root / 'src' / 'data_objects.js').write_text(js, encoding='utf-8')
for h in held[:30]: print('  held back:', h)
if len(held) > 30: print(f'  … and {len(held) - 30} more held back')
print(f"wrote src/data_objects.js: {len(objects)} objects in {len(cats)} categories ({sum(1 for o in objects if o.get('pic'))} with a verified picture, {sum(1 for o in objects if o.get('wiki') and not o.get('pic'))} by their article), {len(lot_pics)} lot pictures ({sum(1 for v in lot_pics.values() if v.get('file'))} files, {sum(1 for v in lot_pics.values() if not v.get('file'))} by article); {len(js)//1024} KB")
