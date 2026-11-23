#!/usr/bin/env python3
"""The Eye's atlases: the harvested public-domain paintings packed into a few JPEG sheets, because the artifact may hold at most 511
files and shows no image from another host.

    python3 tools/eye_atlas.py <harvest_dir>        (the Standard Ebooks harvest: se_pool.json, places.json, licence.json, img/<repo>.jpg)

Reads the harvest, keeps the rows the terminal's image rule allows (the painter dead more than seventy years, or the work made before
1930), drops rows without a year or a place, orders them by a fixed seeded shuffle, and writes:
  build/img/eye/aNNN.jpg  sheets of 20 cells (2 columns x 10 rows, each cell 640 x 800, the painting fitted inside on the paper colour)
  data/eye_atlas.json   {asof, cell:[w,h], cols, rows, sheets:[{file,n}], works:[{id,src,repo,title,artist,y0,y1,year,place,geo,
                         crop,book,book_author,colophon,wiki,sheet,cell,x,y,w,h,pd}], places:{artist:{...}}}
tools/gen_research.py reads data/eye_atlas.json and writes EYE_POOL rows (src 'se') with the sheet and the cell, and EYE_DAYS.
Deterministic: the same harvest gives the same sheets. Pillow only."""
import sys, json, re, pathlib, random
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent
harvest = pathlib.Path(sys.argv[1]).resolve()
pool = json.load(open(harvest / 'out' / 'se_pool.json', encoding='utf-8'))
places = json.load(open(harvest / 'places.json', encoding='utf-8')) if (harvest / 'places.json').exists() else {}
licence = json.load(open(harvest / 'licence.json', encoding='utf-8')) if (harvest / 'licence.json').exists() else {}
fixes = json.load(open(harvest / 'fixes.json', encoding='utf-8')) if (harvest / 'fixes.json').exists() else []
CELL_W, CELL_H, COLS, ROWS = 640, 800, 2, 10
PER = COLS * ROWS
out_img = root / 'build' / 'img' / 'eye'; out_img.mkdir(parents=True, exist_ok=True)   # beside the Library's pictures, which the artifact publishes from build/img
for old in out_img.glob('a*.jpg'): old.unlink()
rows = []
seen_title = set()
for r in pool + fixes:
    if 'error' in r or not r.get('artist') or r.get('y0') is None: continue
    key = (r['artist'].lower(), re.sub(r'\W+', '', r['title'].lower()))
    if key in seen_title: continue   # the same painting on two books
    pl = places.get(r['artist']) or {}
    died = pl.get('died')
    pd = licence.get(r['slug']) or ('both' if (died and died <= 1955) or r['y0'] < 1930 else 'unknown')
    if pd == 'unknown' and not ((died and died <= 1955) or r['y0'] < 1930): continue
    if not (pl.get('country') or pl.get('city')): continue
    img = harvest / 'out' / 'img' / (r['repo'] + '.jpg')
    if not img.exists(): continue
    seen_title.add(key)
    SMALL = {'a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'by', 'from', 'with', 'de', 'la', 'le', 'du', 'des', 'von', 'van'}
    def words(seg): return ' '.join(w if (i and w in SMALL) else w.capitalize() for i, w in enumerate(seg.split('-')))
    parts = r['repo'].split('_'); book_author, book = words(parts[0]), words(parts[1]) if len(parts) > 1 else ''
    rows.append({'id': 'se:' + r['repo'], 'src': 'se', 'repo': r['repo'], 'title': r['title'], 'artist': r['artist'], 'y0': r['y0'], 'y1': r['y1'] if r.get('y1') is not None else r['y0'], 'year': r.get('year', ''),
                 'kind': r.get('kind', 'painting'), 'crop': bool(r.get('crop')), 'book': book, 'book_author': book_author, 'colophon': r.get('colophon_url', ''), 'img_url': r.get('img_url', ''), 'wiki': r.get('wiki', ''),
                 'city': pl.get('city') or '', 'country': pl.get('country') or '', 'nationality': pl.get('nationality') or '', 'place_src': pl.get('src') or '', 'place_vf': pl.get('vf') or 'U', 'pd': pd, '_file': img})
rows.sort(key=lambda r: r['id'])
rnd = random.Random(29); rnd.shuffle(rows)
sheets = []
for i in range(0, len(rows), PER):
    chunk = rows[i:i + PER]; n = len(sheets)
    sheet = Image.new('RGB', (CELL_W * COLS, CELL_H * ((len(chunk) + COLS - 1) // COLS)), (246, 242, 234))
    for k, r in enumerate(chunk):
        im = Image.open(r['_file']); im.load()
        if im.mode != 'RGB': im = im.convert('RGB')
        w, h = im.size; f = min(CELL_W / w, CELL_H / h); im = im.resize((max(1, round(w * f)), max(1, round(h * f))), Image.LANCZOS)
        cx, cy = (k % COLS) * CELL_W, (k // COLS) * CELL_H
        ox, oy = cx + (CELL_W - im.size[0]) // 2, cy + (CELL_H - im.size[1]) // 2
        sheet.paste(im, (ox, oy))
        r.update({'sheet': n, 'cell': k, 'x': ox, 'y': oy, 'w': im.size[0], 'h': im.size[1]})
    name = f'a{n:03d}.jpg'; sheet.save(out_img / name, 'JPEG', quality=76, optimize=True, progressive=True)
    sheets.append({'file': f'img/eye/{name}', 'n': len(chunk), 'bytes': (out_img / name).stat().st_size})
for r in rows: r.pop('_file', None)
meta = {'asof': '2026-11-16', 'cell': [CELL_W, CELL_H], 'cols': COLS, 'rows': ROWS, 'per': PER, 'sheets': sheets, 'works': rows,
        'note': 'Standard Ebooks cover paintings, public domain, harvested from the ebooks’ GitHub repositories (images/cover.source.jpg, or the cover crop where the source was over 3 MB); the painting, year and artist as each colophon states them; the place is the painter’s country or city of work from the NGA constituents file or carried unconfirmed.'}
json.dump(meta, open(root / 'data' / 'eye_atlas.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
tot = sum(s['bytes'] for s in sheets)
print(f'{len(rows)} works on {len(sheets)} sheets, {tot / 1e6:.1f} MB; {sum(1 for r in rows if r["crop"])} cover crops; places: {sum(1 for r in rows if r["place_vf"] == "V")} V, {sum(1 for r in rows if r["place_vf"] == "S")} S, {sum(1 for r in rows if r["place_vf"] == "U")} U; {len(pool) - len(rows)} rows of the harvest left out')
